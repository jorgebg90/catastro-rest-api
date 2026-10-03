# Feature Specification: Complete Catastro API and HTML API documentation

**Feature Branch**: `001-catastro-full-api-openapi-docs`
**Created**: 2026-10-03
**Status**: Draft
**Input**: User description: "Implement the rest of the calls of the Catastro WSDL (OVCCallejero) and an OpenAPI endpoint to publish the API documentation in HTML."

## Context

SPEC-000 delivered one REST endpoint (`GET /properties/{reference}`, upstream `Consulta_DNPRC`). The same upstream service (OVCCallejero) exposes six more operations. This feature exposes all of them as REST endpoints with the same error model, and publishes machine-readable (OpenAPI) and human-readable (HTML) documentation of the whole API from the running Actor.

Upstream operations covered (names as in the service contract):

| Upstream operation | Purpose | New REST resource |
|--------------------|---------|-------------------|
| `ConsultaProvincia` | List provinces | `GET /provinces` |
| `ConsultaMunicipio` | List municipalities of a province | `GET /municipalities` |
| `ConsultaVia` | List streets of a municipality | `GET /streets` |
| `ConsultaNumero` | List street numbers (with parcel reference) | `GET /street-numbers` |
| `Consulta_DNPLOC` | Properties by address | `GET /properties` (address query) |
| `Consulta_DNPPP` | Properties by polygon and parcel (rustic) | `GET /properties` (polygon/parcel query) |
| `Consulta_DNPRC` | Properties by cadastral reference | Already delivered in SPEC-000 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the territorial and street catalogue (Priority: P1)

A consumer needs to discover valid provinces, municipalities, streets and street numbers so it can build an address to look up.

**Why this priority**: These lookups are prerequisites for address-based searches and are independent, read-only and simple.

**Independent Test**: With the upstream mocked, each listing endpoint returns the normalized list for valid input and the standard errors otherwise.

**Acceptance Scenarios**:

```gherkin
Scenario: [US1-S1] List provinces
  When the consumer requests the provinces
  Then it receives every province with its code and name

Scenario: [US1-S2] List municipalities of a province
  Given a province name or code
  When the consumer requests its municipalities (optionally filtered by a name fragment)
  Then it receives the matching municipalities with province code, municipality code and name

Scenario: [US1-S3] List streets of a municipality
  Given a province, a municipality and a street name fragment
  When the consumer requests the streets
  Then it receives each street with its street-type abbreviation, name and street code

Scenario: [US1-S4] List numbers of a street
  Given a province, a municipality, a street type, a street name and a number
  When the consumer requests the street numbers
  Then it receives each number with the cadastral parcel reference it belongs to

Scenario: [US1-S5] Missing or invalid listing parameters
  Given a listing request without a mandatory parameter
  When it is received
  Then the consumer gets a validation error and the upstream service is not contacted

Scenario: [US1-S6] No results for a listing
  Given a listing whose filters match nothing
  When the upstream service reports no results
  Then the consumer gets a not-found error carrying the upstream code and description
```

### User Story 2 - Find properties by address or by rustic parcel (Priority: P2)

A consumer who does not know the cadastral reference finds properties from an address (street, number, optional block, staircase, floor, door) or from a rustic polygon and parcel.

**Why this priority**: Completes the property-search capability; builds on the catalogue lookups.

**Independent Test**: With the upstream mocked, valid address and polygon/parcel searches return property records in the same shape as SPEC-000; invalid or unknown input returns the standard errors.

**Acceptance Scenarios**:

```gherkin
Scenario: [US2-S1] Properties by address
  Given a province, municipality, street type, street name and number
  When the consumer searches properties by address
  Then it receives the matching properties, or the single property when exactly one matches

Scenario: [US2-S2] Properties by address narrowed to a unit
  Given an address plus block, staircase, floor and door
  When the consumer searches
  Then the results are restricted to that unit

Scenario: [US2-S3] Properties by polygon and parcel
  Given a province, municipality, polygon and parcel
  When the consumer searches properties by polygon and parcel
  Then it receives the matching properties

Scenario: [US2-S4] Incomplete search criteria
  Given a search that mixes or omits mandatory criteria (neither address nor polygon/parcel, or both)
  When it is received
  Then the consumer gets a validation error and the upstream service is not contacted

Scenario: [US2-S5] Search finds nothing
  Given well-formed criteria that match no property
  When the upstream service reports no results
  Then the consumer gets a not-found error with the upstream code and description
```

### User Story 3 - Consistent errors and resilience across all endpoints (Priority: P2)

Every new endpoint behaves like the existing one when the upstream service fails.

**Why this priority**: Consumers must handle one error model for the whole API.

**Independent Test**: For each new endpoint, simulate timeout, network failure, server error and malformed payload and verify the mapped error.

**Acceptance Scenarios**:

```gherkin
Scenario: [US3-S1] Upstream failure on any endpoint
  Given the upstream service times out, is unreachable, fails or returns an unexpected payload
  When the consumer calls any endpoint
  Then it receives the same stable error codes and HTTP statuses defined in SPEC-000 (504 / 502 / 502 / 502)

Scenario: [US3-S2] Transient failures are retried
  Given a transient upstream failure followed by a success
  When the consumer calls any endpoint
  Then it receives the successful result
```

### User Story 4 - Read the API documentation in the browser (Priority: P1)

An integrator opens the Actor's URL in a browser and reads interactive-quality, up-to-date HTML documentation of every endpoint, parameter, response and error, and can download the machine-readable OpenAPI document.

**Why this priority**: Without published documentation the larger API is not usable by third parties.

**Independent Test**: Request the documentation page and the OpenAPI document from the running server; verify that every public endpoint is described and that the document is valid.

**Acceptance Scenarios**:

```gherkin
Scenario: [US4-S1] HTML documentation page
  When a browser requests the documentation page
  Then it receives an HTML page that lists every endpoint with parameters, example responses and error codes

Scenario: [US4-S2] Machine-readable OpenAPI document
  When a client requests the OpenAPI document
  Then it receives a valid OpenAPI document that describes exactly the endpoints the server exposes

Scenario: [US4-S3] Documentation stays consistent with the API
  Given any public endpoint
  When the documentation is compared with the implemented routes
  Then no implemented endpoint is undocumented and no documented endpoint is missing

Scenario: [US4-S4] Documentation is reachable without extra setup
  Given the Actor is running in Standby mode
  When the documentation page is requested without any special header
  Then it is served normally (and the readiness probe still returns HTTP 200)
```

### Edge Cases

- Accented and lowercase input (`alcalá`, `madrid`) is accepted for names; codes are compared as given.
- Very large listings (all provinces, all streets of a big city) are returned complete; no pagination is introduced in this feature.
- Upstream business-error codes differ per operation; any unmapped code is reported as an upstream protocol error rather than hidden.
- Properties returned by address/parcel search follow the SPEC-000 distinction: a single match returns full detail, several matches return the list shape with location data only.
- The documentation endpoints must not expose internal details (environment values, proxy URLs).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a REST endpoint for each upstream operation listed in Context, returning normalized JSON (not upstream XML).
- **FR-002**: All input MUST be validated in the presentation layer before any use case or upstream call; invalid input MUST return HTTP 400 with a stable code and no upstream call.
- **FR-003**: The system MUST reuse the SPEC-000 error model and HTTP mapping (400 validation, 404 not found with upstream code/description, 504 timeout, 502 unavailable/protocol, 500 unexpected) for all new endpoints.
- **FR-004**: The system MUST apply the SPEC-000 timeout, retry/backoff and proxy behavior to all upstream calls.
- **FR-005**: Address and polygon/parcel searches MUST return property records in the same shape as `GET /properties/{reference}`.
- **FR-006**: The system MUST serve an OpenAPI document describing every public endpoint, including the SPEC-000 endpoint, parameters, response schemas and error bodies.
- **FR-007**: The system MUST serve a human-readable HTML documentation page generated from that OpenAPI document, reachable from the Actor's root URL context without authentication beyond what the platform requires.
- **FR-008**: The readiness probe MUST keep answering HTTP 200 and MUST NOT be affected by the documentation routes.
- **FR-009**: A test MUST fail when the set of implemented routes and the documented paths diverge.
- **FR-010**: Every use case and test MUST reference the scenario ID it verifies (traceability, as in SPEC-000).
- **FR-011**: The documentation page MUST work without runtime calls to third-party servers (self-contained), so it renders when the Actor has restricted outbound access.

### Key Entities

- **Province**: code, name.
- **Municipality**: province code, municipality code, name.
- **Street**: street-type abbreviation, name, street code.
- **StreetNumber**: number (and suffix), parcel reference (14 characters).
- **PropertyRecord** (existing): reused for address and polygon/parcel searches.
- **API Documentation**: OpenAPI document plus HTML rendering; single source of truth for the public contract.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of upstream operations in the service contract are reachable through a REST endpoint (7 of 7 including SPEC-000).
- **SC-002**: 95% of listing and search requests complete in under 3 seconds under normal upstream conditions.
- **SC-003**: An integrator can find and understand any endpoint from the HTML documentation alone, without reading source code (verified by a reviewer completing one call per endpoint from the documentation).
- **SC-004**: 100% of public endpoints are present in the OpenAPI document, enforced by an automated check.
- **SC-005**: Each new endpoint shows identical error codes and HTTP statuses to the SPEC-000 endpoint for the same failure type.

## Assumptions

- Endpoint naming and query-parameter names are decided in planning; the table in Context is the intended resource shape.
- The upstream operation names `ConsultaProvincia`, `ConsultaMunicipio`, `ConsultaVia`, `ConsultaNumero`, `Consulta_DNPLOC` and `Consulta_DNPPP` are taken from the live service (the WSDL lists them as `Obtener*` internally, but only these are accepted).
- The `/` root keeps answering the readiness probe; the HTML documentation lives on its own route.
- No pagination, caching or authentication is added; the platform handles access control.
- Coordinate-based services (`OVCCoordenadas`) are a different upstream service and are out of scope.
- The constitution (v1.1.0) applies: hexagonal layers, `Result` pattern, Vitest + MSW, scenario traceability.
