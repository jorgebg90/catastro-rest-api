# Feature Specification: Property Lookup by Cadastral Reference (SPEC-000)

**Feature Directory**: `specs/000-property-by-cadastral-ref`
**Created**: 2026-10-03
**Status**: Draft
**Input**: Synchronous REST API wrapper over the Spanish Cadastre (Catastro) `Consulta_DNPRC` operation (query by cadastral reference), served by an Apify Standby Actor.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retrieve a property by its cadastral reference (Priority: P1)

An API consumer sends a cadastral reference and receives, in a single synchronous response, a normalized JSON description of the property (location, address, use, surface, year of construction, constructions).

**Why this priority**: It is the core value of the API and the MVP; every other capability builds on it.

**Independent Test**: Request a known valid reference and verify the response contains the normalized property data, with the upstream Cadastre response replaced by a recorded fixture.

**Acceptance Scenarios**:

```gherkin
Scenario: [US1-S1] Valid property-level reference returns the property
  Given a well-formed 20-character cadastral reference known to the Cadastre
  When the consumer requests the property for that reference
  Then the response status is success
  And the body contains the reference, province, municipality, full address, use, surface and year of construction

Scenario: [US1-S2] Valid parcel-level reference returns the properties of the parcel
  Given a well-formed 14-character cadastral reference known to the Cadastre
  When the consumer requests the property for that reference
  Then the response status is success
  And the body contains the list of properties associated with the parcel
```

---

### User Story 2 - Clear errors for invalid or unknown references (Priority: P2)

The consumer gets a precise, consistent error when the reference is malformed, unknown, or the Cadastre cannot answer.

**Why this priority**: Predictable errors are required for the API to be usable in automated integrations.

**Independent Test**: Send malformed, unknown, and simulated-unavailable cases and verify distinct error categories.

**Acceptance Scenarios**:

```gherkin
Scenario: [US2-S1] Malformed reference is rejected before contacting the Cadastre
  Given a reference that is empty, has an invalid length or invalid characters
  When the consumer requests the property for that reference
  Then the response is a validation error
  And no call is made to the Cadastre

Scenario: [US2-S2] Well-formed but unknown reference
  Given a well-formed reference that the Cadastre reports as not existing
  When the consumer requests the property for that reference
  Then the response is a "not found" error carrying the Cadastre error code and description

Scenario: [US2-S3] Cadastre service unavailable
  Given the Cadastre does not respond or returns a transport failure
  When the consumer requests the property for that reference
  Then the response is an "upstream unavailable" error
  And transient failures are retried before giving up
```

---

### User Story 3 - Operational readiness on the Apify platform (Priority: P3)

The Actor runs in Standby mode, answers the platform readiness probe, and exposes the lookup as an HTTP endpoint.

**Why this priority**: Required for deployment, but depends on P1/P2 behavior.

**Independent Test**: Start the Actor locally in Standby mode, send the readiness probe and a lookup request.

**Acceptance Scenarios**:

```gherkin
Scenario: [US3-S1] Readiness probe
  Given the Actor is running in Standby mode
  When the platform sends the readiness probe request
  Then the Actor answers with HTTP 200

Scenario: [US3-S2] Lookup through the standby endpoint
  Given the Actor is running in Standby mode
  When a consumer calls the lookup endpoint with a valid reference
  Then the Actor returns the same result as User Story 1
```

### Edge Cases

- Reference with lowercase letters or surrounding/inner whitespace is normalized to canonical form before validation.
- Reference of 18 or any length other than 14 or 20 is rejected as malformed.
- Cadastre answers HTTP 200 with an error payload (error code + description) instead of an HTTP error; it must be treated as a business failure, not success.
- Property with a single construction vs. several constructions, and with/without optional blocks, must produce a stable response shape.
- Cadastre slow response must not hold the consumer indefinitely (bounded timeout).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept a cadastral reference as the sole mandatory input of the lookup.
- **FR-002**: The system MUST normalize (trim, remove whitespace, uppercase) and validate the reference (alphanumeric, 14 or 20 characters) before any outbound call.
- **FR-003**: The system MUST query the Cadastre `Consulta_DNPRC` operation for valid references.
- **FR-004**: The system MUST translate the Cadastre response into a normalized JSON property description independent of the upstream XML structure.
- **FR-005**: The system MUST distinguish validation errors (HTTP 400), not-found errors with upstream code and description (404), upstream timeout (504), upstream unavailable or invalid upstream payload (502), and unexpected internal errors (500), each with a stable machine-readable code.
- **FR-006**: The system MUST retry transient upstream failures with exponential backoff and a bounded total time.
- **FR-007**: The system MUST run in Apify Standby mode and answer the readiness probe with HTTP 200.
- **FR-008**: The system MUST route outbound Cadastre requests through the platform proxy when deployed in production and be configurable to bypass it locally.
- **FR-009**: Every use case and test MUST reference the Gherkin scenario ID (for example `US1-S1`) it verifies (traceability).
- **FR-010**: Input validation MUST happen in the presentation layer, which builds the validated cadastral reference before invoking the use case.

### Key Entities

- **Cadastral Reference**: Immutable, validated identifier of a parcel (14 chars) or property (20 chars), in canonical uppercase form.
- **Property Record**: Normalized description of a property: reference, province and municipality (codes and names), address, use, surface, participation share, construction year, and list of constructions.
- **Construction**: Part of a property with use description, floor/door location, and surface.
- **Cadastre Error**: Business failure reported by the Cadastre, with code and description.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A consumer obtains a valid property description with a single request and no additional steps.
- **SC-002**: 95% of lookups for valid references complete within 3 seconds (dominated by the Cadastre response time).
- **SC-003**: 100% of malformed references are rejected without any Cadastre call.
- **SC-004**: 100% of Cadastre business errors surface as the correct error category with the original code and description.
- **SC-005**: Every acceptance scenario above is covered by at least one automated test.

## Assumptions

- The Cadastre public web service is available without credentials and its published contract (WSDL) is stable.
- Only the `Consulta_DNPRC` operation is in scope; other Cadastre operations are future specs.
- The `Provincia` and `Municipio` optional inputs of the upstream operation are not exposed in v1.
- Responses are in JSON; consumers do not need the raw XML.
- Personal data is not stored; the Actor keeps no persistent state per request.
