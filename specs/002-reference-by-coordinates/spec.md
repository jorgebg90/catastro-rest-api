# Feature Specification: Cadastral reference by coordinates

**Feature Branch**: `002-reference-by-coordinates`
**Created**: 2026-10-03
**Status**: Draft
**Input**: User description: "Given the coordinates of a property, return its cadastral reference."

## Context

SPEC-000 and SPEC-001 look properties up by cadastral reference, address or polygon/parcel. Consumers with a map pin, a GPS point or a geocoded address have only coordinates. This feature lets them resolve a coordinate to the cadastral parcel that contains it, and then continue with the existing endpoints (`GET /properties/{reference}`).

The Cadastre exposes this in a separate service (`OVCCoordenadas`, operation `Consulta_RCCOOR`), served from the same host as the services already used. Verified live:

- A point inside a parcel returns the 14-character parcel reference (`pc1` + `pc2`) and a textual address (`ldt`), for WGS84 and other reference systems.
- A point that does not fall inside any parcel (for example a street) returns business error 16, "no reference available for those coordinates", with HTTP 200.
- Invalid or missing values return business errors (for example 77 for a non-numeric X, 75 for a missing reference system), also with HTTP 200.

The nearest-parcels search (`Consulta_RCCOOR_Distancia`) is **out of scope**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find the cadastral reference of a point (Priority: P1)

A consumer sends a longitude and latitude and receives the cadastral reference of the parcel that contains the point, with its textual address.

**Why this priority**: It is the whole feature; it unlocks lookups for anyone who only has coordinates.

**Independent Test**: Request the reference for a known coordinate (e.g. a point inside "CL IMPERIAL 14, Madrid") and verify the reference and address returned.

**Acceptance Scenarios**:

1. **[US1-S1]** **Given** a longitude and latitude inside a parcel, **When** the consumer requests the reference, **Then** the response is 200 with the 14-character parcel reference and the address text.
2. **[US1-S2]** **Given** a point outside any parcel (for example in the middle of a street), **When** the consumer requests the reference, **Then** the response is 404 with the same error body shape as other endpoints, including the upstream code and description.
3. **[US1-S3]** **Given** a longitude and latitude and no reference system, **When** the request is sent, **Then** WGS84 is assumed.
4. **[US1-S4]** **Given** a point returns a reference, **When** the consumer passes that reference to `GET /properties/{reference}`, **Then** it resolves to the properties of that parcel (the two endpoints are chainable).

---

### User Story 2 - Use other coordinate reference systems (Priority: P2)

A consumer holding projected coordinates (for example UTM zone 30N, common in Spanish GIS data) can state the reference system and get the same result.

**Why this priority**: Official Spanish geodata is frequently in ETRS89/UTM; WGS84 alone covers most pin/GPS use cases but not all.

**Independent Test**: Request the same parcel once in WGS84 and once in `EPSG:25830` and verify both return the same reference.

**Acceptance Scenarios**:

1. **[US2-S1]** **Given** a supported reference system code and matching coordinates, **When** the consumer sends them, **Then** the same parcel reference as the equivalent WGS84 point is returned.
2. **[US2-S2]** **Given** an unsupported or malformed reference system code, **When** the consumer sends it, **Then** the response is 400 and lists the supported systems, without a call to the Cadastre.

---

### User Story 3 - Clear errors for bad input and failures (Priority: P1)

A consumer sending missing, non-numeric or out-of-range coordinates, or hitting a Cadastre outage, gets the same predictable errors as the other endpoints.

**Why this priority**: Consistency with the existing error model is a project requirement and avoids useless upstream calls.

**Independent Test**: Send missing, non-numeric and out-of-range values and simulate a Cadastre outage and timeout; verify statuses and error codes.

**Acceptance Scenarios**:

1. **[US3-S1]** **Given** longitude or latitude is missing, **When** the request is sent, **Then** the response is 400 `MISSING_PARAMETER` without calling the Cadastre.
2. **[US3-S2]** **Given** a value is not a finite number or is outside the valid range of the chosen system, **When** the request is sent, **Then** the response is 400 `INVALID_PARAMETER` without calling the Cadastre.
3. **[US3-S3]** **Given** the Cadastre is unavailable, slow or answers with an unexpected business error, **When** the request is sent, **Then** the response is 502, 504 or 502 respectively, with the same error codes as the existing endpoints.

---

### User Story 4 - Discover the endpoint in the documentation (Priority: P2)

The new endpoint appears in `/docs`, `/openapi.json` and the Apify Endpoints tab with parameters, examples and errors.

**Why this priority**: SPEC-001 requires every endpoint to be documented from a single source.

**Independent Test**: Open `/docs` and `/openapi.json` and verify the new endpoint, its parameters and its error statuses are present.

**Acceptance Scenarios**:

1. **[US4-S1]** **Given** the Actor is running, **When** a consumer opens the documentation, **Then** the coordinates endpoint is listed with its parameters, allowed reference systems, an example and the 200, 400, 404, 502 and 504 responses.
2. **[US4-S2]** **Given** the route table changes, **When** the Actor's published OpenAPI file is out of date, **Then** the automated checks fail.

---

### Edge Cases

- Coordinates swapped (latitude in the longitude field): a value outside the valid range is rejected with 400; a value in range but swapped most likely yields "no reference" (404).
- Decimal separator: only a dot is accepted; a comma gives 400.
- Extra precision (many decimals) and values in scientific notation: accepted if they are finite numbers.
- Coordinates inside Spain but in an area without cadastral coverage (sea, foreign territory): 404 "no reference".
- Cadastre territories with different coverage (for example the Basque Country and Navarre are managed by their own provincial authorities): treated as "no reference" if the Cadastre says so; no special handling.
- A very high number of requests for the same point: not cached in this version; consumers should reuse results.
- Reference-system code in lowercase or with spaces: normalized (trimmed, case-insensitive) before validation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose `GET /coordinates/reference` accepting `longitude` and `latitude` and returning the cadastral reference of the parcel containing the point.
- **FR-002**: The 200 response MUST contain the 14-character parcel reference, its two 7-character components, the address text, and the coordinates and reference system the Cadastre echoed.
- **FR-003**: The system MUST accept an optional `srs` parameter (default `EPSG:4326`) restricted to a documented list of supported reference systems, including at least `EPSG:4326`, `EPSG:4258` and the ETRS89/UTM zones used in Spain (`EPSG:25828`, `EPSG:25829`, `EPSG:25830`, `EPSG:25831`). When `srs` is not geographic, the same `longitude`/`latitude` parameters carry the easting (X) and northing (Y) values.
- **FR-004**: The system MUST validate input before calling the Cadastre: both coordinates present, finite numbers, within the valid range of the chosen system; `srs` in the supported list. Failures MUST return 400 with `MISSING_PARAMETER` or `INVALID_PARAMETER`.
- **FR-005**: A point with no parcel (Cadastre business error 16) MUST return 404 with a `COORDINATE_NOT_FOUND`-style error code and the upstream `code` and `description` in the body.
- **FR-006**: Cadastre business errors that indicate rejected input (for example 75 missing system, 77 non-numeric X, and the equivalent for Y) MUST map to 400; any other business error MUST map to 502 `CADASTRE_PROTOCOL_ERROR`.
- **FR-007**: Timeouts, upstream 5xx, network errors and retries MUST behave exactly as in the existing endpoints (504, 502, bounded exponential backoff, optional Apify proxy).
- **FR-008**: The endpoint MUST return only public, non-protected data (no ownership or cadastral values), as defined by the legal disclaimer.
- **FR-009**: The endpoint MUST be documented from the single route table that drives the router and the OpenAPI document, and the Actor's published OpenAPI file MUST be regenerated and verified by an automated check.
- **FR-010**: Every acceptance scenario above MUST be referenced by at least one automated test using the `[002:USx-Sy]` convention.
- **FR-011**: The feature MUST not change the behaviour or contracts of existing endpoints.

### Key Entities

- **Coordinate**: a pair of numbers (X/longitude, Y/latitude) plus a reference system code.
- **Parcel reference match**: the 14-character cadastral parcel reference containing the point, its address text, and the coordinate echoed by the Cadastre.
- **Supported reference system**: an allowed coordinate system code with its valid ranges.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A consumer with a coordinate inside a parcel gets the cadastral reference in a single request, with no prior knowledge of the address.
- **SC-002**: The same physical point expressed in two supported systems returns the same reference.
- **SC-003**: 100% of malformed or out-of-range requests are rejected with a clear 400 without any call to the Cadastre.
- **SC-004**: 100% of Cadastre failure modes tested (no parcel, rejected input, unavailable, slow) map to the documented status and error code.
- **SC-005**: The endpoint, with parameters and errors, appears in the interactive documentation and in the published OpenAPI file with no manual steps.
- **SC-006**: The reference returned for a known point can be used directly with the existing property lookup endpoint.

## Assumptions

- The Cadastre coordinate service stays free, public and on the same host as the services already used; the HTTP GET binding is used, as in SPEC-001.
- Pass-through of coordinate values: conversion between reference systems is done by the Cadastre, not by this API.
- The Cadastre returns a parcel (14-character) reference, not a property (20-character) reference; one point maps to at most one parcel.
- Only a single point is queried per request; batch conversion is out of scope.
- Nearest-parcels search, reverse geocoding of free text, and drawing of parcel geometry are out of scope.
- No caching in this version, consistent with the legal disclaimer's note on fair use.
