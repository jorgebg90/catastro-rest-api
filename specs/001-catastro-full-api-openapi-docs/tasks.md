# Tasks: Full Catastro API and HTML API Documentation (SPEC-001)

**Input**: `/specs/001-catastro-full-api-openapi-docs/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Tests**: INCLUDED (constitution III and V). Write tests first; they must fail before the implementation. Each test title and use case docstring cites its scenario ID (`US1-S1` ... `US4-S4`).
**No new packages are required** (plan R4).

## Format: `[ID] [P?] [Story] Description`
- **[P]**: parallelizable (different files, no incomplete dependencies)

## Phase 1: Setup and fixtures

- [X] T001 Capture real Cadastre GET responses into `tests/fixtures/soap/`: `provinces.xml`, `municipalities.xml`, `streets.xml`, `street-numbers.xml`, `dnploc-list.xml`, `dnploc-single.xml`, `dnppp-list.xml`, plus error fixtures (`catalog-not-found.xml`, `dnploc-not-found.xml`, `mandatory-field.xml`); update `contracts/cadastre-get.md` with the exact shapes and error codes; verify and record: street-number suffix existence (data-model), whether `ConsultaVia` accepts an empty street name, case/accent insensitivity, and whether single (`bico`) and list (`rcdnp`) results fit `PropertyRecord`
- [X] T002 [P] Extend `tests/mocks/handlers.ts` with GET handlers per operation (query-param matching) and helpers to simulate timeout/5xx
- [X] T003 [P] Create directories `src/presentation/docs/`, `tests/unit/docs/`
- [X] T037 Extend `tests/unit/traceability.test.ts` to also validate SPEC-001 scenario IDs referenced by tests (FR-010)

**Checkpoint**: fixtures reviewed; `npm test` still green.

## Phase 2: Foundational (blocks all stories)

- [X] T004 [P] Tests for `InvalidQueryError` codes (`MISSING_PARAMETER`, `INVALID_PARAMETER`, `AMBIGUOUS_QUERY`) and `CatalogEntryNotFoundError` in `tests/unit/domain/errors.test.ts`
- [X] T005 Implement the errors in `src/domain/errors/` and export them from `index.ts` (depends on T004)
- [X] T006 [P] Tests for input VOs (`ProvinceName`, `MunicipalityName`, `StreetType`, `StreetName`, `StreetNumber`, `UnitLocator`, `AddressQuery`, `ParcelQuery`, `MunicipalityQuery`, `StreetQuery`, `StreetNumberQuery`) in `tests/unit/domain/queries.test.ts` [US1-S5, US2-S4], including accented/lowercase names (`alcalá`, `madrid`)
- [X] T007 Implement VOs in `src/domain/value-objects/` (depends on T006)
- [X] T008 [P] Tests for entities `Province`, `Municipality`, `Street`, `StreetNumberEntry` (immutability) in `tests/unit/domain/catalog-entities.test.ts`
- [X] T009 Implement entities in `src/domain/entities/` (depends on T008)
- [X] T010 Define ports `ICatalogGateway`, `IPropertySearchGateway` in `src/domain/ports/`
- [X] T011 Generalize the HTTP call in `src/infrastructure/soap/` into a shared helper (timeout, status check, error mapping to `CadastreTimeoutError`/`CadastreUnavailableError`) reused by `CatastroSoapGateway`; SPEC-000 tests must stay green [US3-S1]
- [X] T012 Extend `error-mapper.ts` for catalogue not-found and codes 4/17 (400), 5/43 (404) and unmapped codes (502) with tests in `tests/integration/error-mapping.test.ts` [US1-S6, US2-S5]
- [X] T013 Create the GET-binding XML parser (no `soap:Body` root, `isArray` for repeated nodes, Zod over `unknown`) in `src/infrastructure/mappers/catalog-xml-parser.ts`, tested against fixtures in `tests/integration/catalog-xml-parser.test.ts`
- [X] T032 Create `src/presentation/docs/routes.ts` (single route table: method, path, handler key) and refactor `server.ts` to route from it (foundation for all endpoints; docs routes added in T035)

**Checkpoint**: domain + parser green; SPEC-000 tests unaffected.

## Phase 3: User Story 1 - Catalogue (P1)

- [X] T014 [P] [US1] Use case tests with fake gateway (four use cases) in `tests/unit/application/catalog-use-cases.test.ts` [US1-S1..S4]
- [X] T015 [P] [US1] MSW integration tests for `CatastroGetGateway` catalogue methods in `tests/integration/catastro-get-gateway-catalog.test.ts` [US1-S1..S4, S6]
- [X] T016 [P] [US1] Acceptance tests for `/provinces`, `/municipalities`, `/streets`, `/street-numbers` (200, 400, 404, accented/lowercase input) in `tests/acceptance/catalog-endpoints.test.ts` [US1-S1..S6]
- [X] T017 [US1] Inbound ports and use cases in `src/application/ports/` and `src/application/use-cases/` (docstrings cite scenario IDs)
- [X] T018 [US1] Catalogue mapper (`catalog-mapper.ts`) and `CatastroGetGateway` catalogue methods in `src/infrastructure/soap/catastro-get-gateway.ts`
- [X] T019 [US1] Request parsers for the four endpoints in `src/presentation/apify/request-parser.ts` (validation before use case)

**Checkpoint**: US1 verifiable independently through the use case and gateway.

## Phase 4: User Story 2 - Property search (P2)

- [X] T020 [P] [US2] Use case tests (address, parcel) in `tests/unit/application/search-use-cases.test.ts` [US2-S1..S5]
- [X] T021 [P] [US2] MSW integration tests for `searchByAddress` (list and single `bico`) and `searchByParcel` in `tests/integration/catastro-get-gateway-search.test.ts` [US2-S1..S3, S5]
- [X] T022 [P] [US2] Acceptance tests for `GET /properties` (address, unit, parcel, ambiguous/incomplete -> 400, no match -> 404) in `tests/acceptance/property-search.test.ts`; confirm `GET /properties/{reference}` still works
- [X] T023 [US2] Use cases and ports for address and parcel search
- [X] T024 [US2] Reuse/adapt `property-mapper.ts` for `lrcdnp`/`bico` responses; implement `searchByAddress`/`searchByParcel` in `CatastroGetGateway`
- [X] T025 [US2] Request parser discriminating address vs parcel (`AMBIGUOUS_QUERY` on mixing or neither) [US2-S4]

## Phase 5: User Story 3 - Errors and resilience (P2)

- [X] T026 [P] [US3] Integration tests: timeout, 5xx, retry then success, on one catalogue and one search endpoint, in `tests/integration/get-gateway-resilience.test.ts` [US3-S1, S2]
- [X] T027 [P] [US3] Acceptance test asserting identical status/code for the same failure type across all endpoints (SC-005) in `tests/acceptance/error-consistency.test.ts` [US3-S1]
- [X] T028 [US3] Ensure `CatastroGetGateway` uses `withRetry` and proxy-capable `fetchFn`; map new error classes in `http-mapper.ts`

## Phase 6: User Story 4 - Documentation (P1)

- [X] T029 [P] [US4] Tests for the route table and OpenAPI document (every route has a documented path, parameters match) in `tests/unit/docs/routes-openapi.test.ts` [US4-S2, S3]
- [X] T030 [P] [US4] Tests for `renderHtml` (lists every endpoint and parameter, no `http(s)://` external asset/script references, escapes content) in `tests/unit/docs/html-renderer.test.ts` [US4-S1]
- [X] T031 [P] [US4] Acceptance tests for `/docs` (text/html) and `/openapi.json` (valid JSON, 3.0.x), readiness probe unaffected, and no env values or proxy URLs present in either response body, in `tests/acceptance/docs-endpoints.test.ts` [US4-S1, S2, S4]
- [X] T033 [US4] Create `src/presentation/docs/openapi.ts` (typed OpenAPI 3.0.3 object covering all endpoints, schemas, error bodies, examples; aligned with `contracts/rest-api.openapi.yaml`)
- [X] T034 [US4] Create `src/presentation/docs/html-renderer.ts` (self-contained HTML + inline CSS, no external requests, HTML-escaped)
- [X] T035 [US4] Wire `/docs` and `/openapi.json` in the server; keep the readiness probe unchanged and add `docs: "/docs"` to the `GET /` JSON body (FR-007)

## Phase 7: Polish

- [X] T036 Wire gateway, use cases and new env var (if any) in `composition-root.ts`; update `src/main.ts` only if needed
- [X] T038 Update `README.md`, `docs/local-debugging.md` and `docs/deployment.md` with the new endpoints and `/docs` URL (no inline `#` comments in bash blocks)
- [X] T039 Run `npm run lint`, `typecheck`, `build`, `test` with coverage (>= 90% lines)
- [X] T040 Real run: `npx apify-cli run`, exercise each endpoint with curl against the live Cadastre and open `/docs`; fix drift in fixtures/contracts; manually verify SC-002 (p95 < 3 s over ~20 calls per endpoint) and SC-003 (one call per endpoint using only `/docs`)
- [X] T041 Update `.github/copilot-instructions.md` and mark all tasks `[X]`

## Dependencies

- Phase 1 -> Phase 2 (includes the router refactor T032) -> Phases 3, 4, 5, 6 (largely independent afterwards).
- Within a story: tests -> implementation.
- Recommended order: Phase 1, 2, US1, US2, US3, US4, Polish.
- MVP: Phases 1-2 + US1 + US4.
