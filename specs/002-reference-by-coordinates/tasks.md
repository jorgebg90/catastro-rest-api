# Tasks: Cadastral Reference by Coordinates (SPEC-002)

**Input**: `/specs/002-reference-by-coordinates/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Tests**: INCLUDED (constitution III and V). Write tests first; they must fail before the implementation. Each test title cites its scenario as `[002:US1-S1]` ... `[002:US4-S2]`.
**No new packages are required** (plan).

## Format: `[ID] [P?] [Story] Description`
- **[P]**: parallelizable (different files, no incomplete dependencies)

## Phase 1: Setup and fixtures

- [X] T001 Capture real Cadastre GET responses into `tests/fixtures/soap/`: `coordinates-found.xml` (EPSG:4326), `coordinates-found-4258.xml`, `coordinates-not-found.xml` (code 16), `coordinates-missing-srs.xml` (75), `coordinates-invalid-x.xml` (77), `coordinates-missing-y.xml` (79); finish `contracts/cadastre-get.md` with the exact shapes
- [X] T002 [P] Extend `tests/mocks/handlers.ts` with a handler for `OVCCoordenadas.asmx/Consulta_RCCOOR` (query-param matching on `SRS`, `Coordenada_X`, `Coordenada_Y`)
- [X] T003 Extend `tests/unit/traceability.test.ts` to validate `002:USx-Sy` IDs (FR-010) and make the SPEC-000 regex ignore `002:` as it does `001:`

**Checkpoint**: fixtures reviewed; `npm test` still green.

## Phase 2: Foundational (blocks all stories)

- [X] T004 [P] Tests for `ReferenceNotFoundError` (404, `COORDINATE_NOT_FOUND`, upstream code/description) in `tests/unit/domain/errors.test.ts`
- [X] T005 Implement `ReferenceNotFoundError` in `src/domain/errors/` and export it (depends on T004)
- [X] T006 [P] Tests for entity `ReferenceMatch` (immutability, parcel/sheet split) in `tests/unit/domain/reference-match.test.ts`
- [X] T007 Implement `ReferenceMatch` in `src/domain/entities/` (depends on T006)
- [X] T008 Define port `ICoordinateGateway` in `src/domain/ports/`
- [X] T009 [P] Tests for error mapping kind `coordinate` (16 -> not found, 75/77/79 -> `InvalidQueryError`, other -> protocol error) in `tests/integration/error-mapping.test.ts`; existing kinds unchanged
- [X] T010 Extend `src/infrastructure/mappers/error-mapper.ts` with the `coordinate` kind (depends on T005, T009)
- [X] T011 Make the base path of `CatastroGetGateway` configurable per service (existing `OVCCallejero` default) so a second `.asmx` can reuse timeout, retry and proxy; SPEC-001 tests must stay green

**Checkpoint**: domain + mapping green; SPEC-000/001 tests unaffected.

## Phase 3: User Story 1 - Reference of a point (P1)

- [X] T012 [P] [US1] Tests for `Coordinate` value object (valid point, default `EPSG:4326`, normalisation) in `tests/unit/domain/coordinate.test.ts` [002:US1-S3]
- [X] T013 [P] [US1] Use case tests with a fake gateway in `tests/unit/application/find-reference-by-coordinates.test.ts` [002:US1-S1]
- [X] T014 [P] [US1] Parser tests (found, not found) against fixtures in `tests/integration/coordinate-xml-parser.test.ts`
- [X] T015 [P] [US1] MSW integration tests for `CatastroGetGateway.findReference` in `tests/integration/catastro-get-gateway-coordinates.test.ts` [002:US1-S1, 002:US1-S2]
- [X] T016 [P] [US1] Acceptance tests for `GET /coordinates/reference` (200, 404, default srs, chain with `/properties/{reference}`) in `tests/acceptance/coordinates-endpoint.test.ts` [002:US1-S1..S4]
- [X] T017 [US1] Implement `Coordinate` VO in `src/domain/value-objects/` (`from()` -> `Result`)
- [X] T018 [US1] Implement inbound port and `FindReferenceByCoordinatesUseCase` in `src/application/`
- [X] T019 [US1] Implement `coordinate-xml-parser` (Zod over `unknown`) and `CatastroGetGateway.findReference` (depends on T010, T011)
- [X] T020 [US1] Request parser, route entry in `src/presentation/docs/routes.ts`, http-mapper status for `ReferenceNotFoundError`, composition root wiring

**Checkpoint**: US1 acceptance tests green.

## Phase 4: User Story 2 - Geographic datum (P2)

- [X] T021 [P] [US2] Tests for `srs` handling: `EPSG:4258` equals `EPSG:4326` result; unsupported values (`EPSG:25830`, `EPSG:3857`, garbage) rejected with no upstream call in `tests/unit/domain/coordinate.test.ts`, integration and acceptance files [002:US2-S1, 002:US2-S2]
- [X] T022 [US2] Restrict `Coordinate.srs` to `EPSG:4326 | EPSG:4258` with an error listing the supported systems (depends on T021)

## Phase 5: User Story 3 - Validation and failures (P1)

- [X] T023 [P] [US3] Tests for missing, non-numeric, comma-decimal and out-of-range longitude/latitude (400, no upstream call) in unit and acceptance files [002:US3-S1, 002:US3-S2]
- [X] T024 [P] [US3] Tests for upstream 5xx, timeout and unexpected business error (502/504/502) in `tests/integration/` and `tests/acceptance/` [002:US3-S3]
- [X] T025 [US3] Implement range/number validation in `Coordinate.from()` and the request parser (`MISSING_PARAMETER` / `INVALID_PARAMETER`) (depends on T023)

## Phase 6: User Story 4 - Documentation (P2)

- [X] T026 [P] [US4] Tests that `/docs` and `/openapi.json` list the endpoint with parameters, `srs` enum, example and 200/400/404/502/504 in `tests/unit/docs/` and `tests/acceptance/` [002:US4-S1]
- [X] T027 [US4] Add the OpenAPI entry in `src/presentation/docs/openapi.ts`; run `npm run generate:openapi`; confirm `tests/unit/docs/actor-openapi-sync.test.ts` passes [002:US4-S2]

## Phase 7: Polish

- [X] T028 Update `README.md`, `docs/local-debugging.md` (example URL and expected responses) and the legal disclaimer if needed (all in English)
- [X] T029 `npm run lint`, `npm run typecheck`, `npm run build`, full test run with coverage >= previous (98% lines)
- [X] T030 Live check with `APIFY_CLI_DISABLE_TELEMETRY=1 npx apify-cli run` against the real Cadastre (found, not found, `EPSG:4258`, invalid) and `npx apify-cli validate-schema`
- [X] T031 Mark tasks done; do not `apify push` or push workflow files (the user pushes)

## Dependencies

- Phase 1 -> Phase 2 -> Phases 3-6 (US2/US3 build on the `Coordinate` VO from T017, so do US1 first) -> Polish.
- Within a story: tests -> implementation.
- Recommended order: Phase 1, 2, US1, US3, US2, US4, Polish.
- MVP: Phases 1-2 + US1 + US3.
