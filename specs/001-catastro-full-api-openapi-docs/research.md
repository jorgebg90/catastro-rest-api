# Research: SPEC-001

## R1. Upstream binding for new operations
- **Decision**: HTTP GET binding on `OVCCallejero.asmx/<Op>?param=...`.
- **Rationale**: verified live for all six operations; no envelope building; simpler MSW fixtures. SOAP names in the WSDL (`Obtener*`) are not valid at runtime; valid names are `Consulta*` / `Consulta_DNP*`.
- **Alternative**: SOAP POST for all. Rejected: more code, no benefit. `Consulta_DNPRC` stays on SOAP (SPEC-000, already tested).
- **Consequence**: GET responses are not wrapped in `soap:Body`; new parsers read the document root directly. Business errors still come with HTTP 200 as `lerr.err{cod,des}`; decimals use comma.

## R2. Ports and gateway
- **Decision**: `ICatalogGateway` (4 methods) and `IPropertySearchGateway` (2 methods); one `CatastroGetGateway` class implements both, reusing `withRetry`, timeout and `fetchFn` (proxy).
- **Rationale**: Interface Segregation; `ICadastreGateway` unchanged so SPEC-000 tests stay valid.

## R3. REST resources
- **Decision**: `GET /provinces`, `GET /municipalities`, `GET /streets`, `GET /street-numbers`, `GET /properties` (query), plus `GET /docs` and `GET /openapi.json`. Query params in English camelCase (`province`, `municipality`, `streetType`, `streetName`, `number`, `block`, `staircase`, `floor`, `door`, `polygon`, `parcel`).
- **`GET /properties` discrimination**: address search when `streetType`/`streetName` present; parcel search when `polygon` and `parcel` present; mixing both or neither -> 400 (US2-S4). `GET /properties/{reference}` (SPEC-000) is unchanged.
- **Rationale**: flat, discoverable, no path-nesting ambiguity with optional filters.

## R4. OpenAPI and HTML without new packages
- **Decision**: OpenAPI 3.0.3 as a typed TS object (`presentation/docs/openapi.ts`), plus a ~150-line HTML renderer (endpoints, parameters, example, response schemas) with inline CSS and no scripts from CDNs.
- **Rationale**: FR-011 and AGENTS.md "ask first" for packages. Swagger UI/Redoc would need a package or CDN.
- **Alternative**: `swagger-ui-dist` (adds ~10 MB, needs asset routes). Rejected for now; can be a later spec.
- **Consistency (FR-009)**: the router is built from `routes.ts`; a test asserts the set of `method path` pairs equals the OpenAPI `paths`, so adding a route without docs fails.

## R5. Errors
- Reuse SPEC-000 mapping. New validation codes (`MISSING_PARAMETER`, `INVALID_PARAMETER`, `AMBIGUOUS_QUERY`) return 400 without an upstream call. Upstream codes 4/17 -> 400; 5 and 43 -> 404 with `upstream{code,description}`. Any other upstream code -> 502 (protocol error), as required by the spec edge cases.

## R7. Name normalization
- Name inputs are trimmed and passed to the upstream as given; case and accents are accepted (the upstream is case-insensitive, verified in T001). Codes are compared as given. Normalization lives in the input VOs (trim only), never in the gateway.

## R6. Fixtures
- Capture real responses with curl (provinces, one municipality list, one street list, one number list, address list/single, parcel list, an error each) into `tests/fixtures/soap/` before writing parsers; strip nothing personal (Cadastre data is public, no owner data).
