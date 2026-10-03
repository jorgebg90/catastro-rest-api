# Tasks: Property Lookup by Cadastral Reference (SPEC-000)

**Input**: Design documents from `/specs/000-property-by-cadastral-ref/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED. The constitution (Principles III and V) requires spec-aligned Vitest/MSW tests; tests are written first and must fail before the implementation.

**Organization**: Grouped by user story. Each test title and use case docstring MUST reference its Gherkin scenario ID in `spec.md` (`US1-S1` ... `US3-S2`, FR-009).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, US3 (maps to spec.md user stories)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tooling and skeleton required by every story. Installing packages requires user confirmation (AGENTS.md "Ask first").

- [X] T001 Install dependencies `fast-xml-parser`, `zod`, `undici` (runtime) and `msw`, `@vitest/coverage-v8` (dev) in `package.json`
- [X] T002 Enable `strict`, `noImplicitAny`, `strictNullChecks` and include `tests/**` in `tsconfig.json` (type checking only); create `tsconfig.build.json` with `rootDir: ./src` and set the `build` script in `package.json` to `tsc -p tsconfig.build.json` so output stays `dist/main.js`
- [X] T003 [P] Create `vitest.config.ts` with unit, integration and acceptance projects, and `tests/mocks/setup.ts` as shared setup
- [X] T004 [P] Migrate the template test `test/main.test.ts` to `tests/` and remove the `test/` folder
- [X] T005 [P] Create the layer skeleton directories from plan.md (`src/domain/{errors,value-objects,entities,ports}`, `src/application/{ports,use-cases}`, `src/infrastructure/{soap,mappers}`, `src/presentation/apify`, `tests/{unit,integration,acceptance,fixtures/soap,mocks}`)
- [X] T006 [P] Add an ESLint rule in `eslint.config.mjs` forbidding `any` and forbidding imports from `apify`, `fast-xml-parser`, `zod`, `undici`, `msw` inside `src/domain/**`
- [X] T007 Capture real Cadastre fixtures into `tests/fixtures/soap/`: `property-found.xml` (20 chars, `9872023VH5797S0001WX`), `parcel-found.xml` (14 chars), `not-found.xml` (well-formed but nonexistent), `malformed-ref.xml` (error 4); record the not-found error code in `specs/000-property-by-cadastral-ref/contracts/cadastre-soap.md` and revise `data-model.md` if the parcel response shape differs

**Checkpoint**: Build, lint and `vitest run` execute (even with zero tests).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure domain building blocks shared by all stories. Domain has zero external dependencies. T013 depends on T007 (fixture shapes).

### Tests (write first, must fail)

- [X] T008 [P] Unit tests for `Result`, `ok`, `err` in `tests/unit/domain/result.test.ts`
- [X] T009 [P] Unit tests for `DomainError` subclasses (codes, names) in `tests/unit/domain/errors.test.ts`
- [X] T010 [P] Unit tests for `PropertyRecord` and `Construction` (immutability, optional fields, empty constructions) in `tests/unit/domain/property-record.test.ts`

### Implementation

- [X] T011 [P] Implement `Result<T, E>`, `ok`, `err` in `src/domain/result.ts`
- [X] T012 [P] Implement `DomainError` base and `InvalidCadastralReferenceError`, `PropertyNotFoundError` (carries upstream code/description), `CadastreTimeoutError`, `CadastreUnavailableError`, `CadastreProtocolError` in `src/domain/errors/`
- [X] T013 [P] Implement `PropertyRecord` and `Construction` immutable entities per data-model.md in `src/domain/entities/property-record.ts`
- [X] T014 Define outbound port `ICadastreGateway` in `src/domain/ports/cadastre-gateway.ts` per `contracts/ports.md`
- [X] T015 Define inbound port `IGetPropertyByRefUseCase` (receives `CadastralReference`) in `src/application/ports/get-property-by-ref-use-case.ts` per `contracts/ports.md`

**Checkpoint**: Domain compiles in strict mode with no external imports; T008-T010 pass.

---

## Phase 3: User Story 1 - Retrieve a property by its cadastral reference (Priority: P1) 🎯 MVP

**Goal**: A valid reference returns the normalized property data (property and parcel level).

**Independent Test**: With the Cadastre mocked by MSW fixtures, the use case and the gateway return the expected `PropertyRecord`(s).

### Tests for User Story 1 (write first, must fail)

- [X] T016 [P] [US1] Unit tests for `CadastralReference` valid cases (normalization, kind PARCEL/PROPERTY, `equals`) in `tests/unit/domain/cadastral-reference.test.ts` (US1-S1, US1-S2)
- [X] T017 [P] [US1] Unit tests for `GetPropertyByRefUseCase` happy path with a fake `ICadastreGateway` in `tests/unit/application/get-property-by-ref.use-case.test.ts` (US1-S1, US1-S2)
- [X] T018 [P] [US1] Unit tests for the XML mapper using `property-found.xml` and `parcel-found.xml` (single vs. multiple items, decimal comma, optional blocks) in `tests/unit/infrastructure/property-mapper.test.ts` (US1-S1, US1-S2)
- [X] T019 [US1] Integration test for `CatastroSoapGateway` success paths with MSW (asserts SOAP envelope, `SOAPAction` header, parsed result) in `tests/integration/catastro-soap-gateway.success.test.ts` and handlers in `tests/mocks/handlers.ts` (US1-S1, US1-S2)

### Implementation for User Story 1

- [X] T020 [P] [US1] Implement `CadastralReference` value object (normalization, 14/20 `[A-Z0-9]`, `Result` creation) in `src/domain/value-objects/cadastral-reference.ts`
- [X] T021 [P] [US1] Implement SOAP envelope builder per `contracts/cadastre-soap.md` in `src/infrastructure/soap/envelope.ts`
- [X] T022 [US1] Implement XML parsing (`fast-xml-parser` config, Zod schema over `unknown`) in `src/infrastructure/mappers/cadastre-xml-parser.ts`
- [X] T023 [US1] Implement XML-to-`PropertyRecord` mapper in `src/infrastructure/mappers/property-mapper.ts` (depends on T022)
- [X] T024 [US1] Implement `CatastroSoapGateway` (success path, native `fetch`, timeout via `AbortSignal`) in `src/infrastructure/soap/catastro-soap-gateway.ts` (depends on T021, T023)
- [X] T025 [US1] Implement `GetPropertyByRefUseCase` delegating to the gateway, with scenario-ID docstring, in `src/application/use-cases/get-property-by-ref.use-case.ts`

**Checkpoint**: US1 tests pass; a valid reference resolves end to end against MSW.

---

## Phase 4: User Story 2 - Clear errors for invalid or unknown references (Priority: P2)

**Goal**: Validation, not-found and upstream failures are distinct, typed and never throw across layers; malformed input never reaches the use case or the Cadastre.

**Independent Test**: Malformed, unknown and failing-upstream cases yield the correct `DomainError`; no use case or upstream call for malformed input.

### Tests for User Story 2 (write first, must fail)

- [X] T026 [P] [US2] Unit tests for `CadastralReference` rejections (empty, length 18, invalid chars) in `tests/unit/domain/cadastral-reference.invalid.test.ts` (US2-S1)
- [X] T027 [P] [US2] Unit tests for the request parser: invalid input returns `InvalidCadastralReferenceError` and the use case spy (`vi.fn()`) is never called, valid input yields a `CadastralReference` in `tests/unit/presentation/request-parser.test.ts` (US2-S1)
- [X] T028 [P] [US2] Unit tests for error mapping from `not-found.xml` and `malformed-ref.xml` (`cuerr`/`lerr`) in `tests/unit/infrastructure/error-mapper.test.ts` (US2-S2)
- [X] T029 [P] [US2] Unit tests for retry policy (exponential backoff with jitter, only on network/timeout/5xx, bounded budget; fake timers) in `tests/unit/infrastructure/retry.test.ts` (US2-S3)
- [X] T030 [US2] Integration tests with MSW for not found (HTTP 200 + error payload), HTTP 500 then success, persistent 500, timeout, and malformed XML in `tests/integration/catastro-soap-gateway.errors.test.ts` (US2-S2, US2-S3)

### Implementation for User Story 2

- [X] T031 [P] [US2] Implement request parser in `src/presentation/apify/request-parser.ts` that builds `CadastralReference` before the use case is invoked (FR-010)
- [X] T032 [P] [US2] Implement Cadastre business-error mapping to `PropertyNotFoundError` in `src/infrastructure/mappers/error-mapper.ts`
- [X] T033 [P] [US2] Implement retry with exponential backoff and jitter in `src/infrastructure/soap/retry.ts` (configurable attempts, delays and total budget)
- [X] T034 [US2] Extend `CatastroSoapGateway` with retry, timeout to `CadastreTimeoutError`, network/5xx to `CadastreUnavailableError` and unparseable payload to `CadastreProtocolError` in `src/infrastructure/soap/catastro-soap-gateway.ts` (depends on T032, T033)

**Checkpoint**: US1 and US2 pass independently; all failures are `Result.err`, no uncaught exceptions.

---

## Phase 5: User Story 3 - Operational readiness on the Apify platform (Priority: P3)

**Goal**: Standby Actor serving the lookup over HTTP, answering the readiness probe, routing upstream calls via the Apify proxy in production.

**Independent Test**: In-process server on an ephemeral port answers the probe and returns the US1/US2 results over HTTP.

### Tests for User Story 3 (write first, must fail)

- [X] T035 [P] [US3] Acceptance tests for readiness probe and `GET /` in `tests/acceptance/readiness.test.ts` (US3-S1)
- [X] T036 [P] [US3] Acceptance tests for `GET /properties/{reference}` covering 200, 400, 404, 500, 502, 504 with MSW upstream in `tests/acceptance/lookup.test.ts` (US3-S2, US2-S1, US2-S2, US2-S3)
- [X] T037 [P] [US3] Unit tests for error-to-HTTP mapping (validation 400, not found 404, timeout 504, unavailable/protocol 502, unexpected 500) and response serialization against `contracts/rest-api.openapi.yaml` in `tests/unit/presentation/http-mapper.test.ts` (US3-S2)

### Implementation for User Story 3

- [X] T038 [P] [US3] Implement HTTP error mapping and JSON serializers in `src/presentation/apify/http-mapper.ts`
- [X] T039 [P] [US3] Implement Standby HTTP server and router (readiness probe, `GET /properties/{reference}`, 404 for unknown routes, catch-all to 500 `INTERNAL_ERROR`) in `src/presentation/apify/server.ts`
- [X] T040 [P] [US3] Implement optional Apify proxy wiring (`undici` `ProxyAgent`, disabled by environment flag for local runs) in `src/infrastructure/soap/proxy.ts`, with a unit test in `tests/unit/infrastructure/proxy.test.ts` (FR-008). Proxy configuration needs user approval (AGENTS.md)
- [X] T041 [P] [US3] Implement structured logging through `log` from `apify` (no `console.log`; never log tokens or proxy URLs) in `src/presentation/apify/logger.ts`
- [X] T042 [US3] Implement composition root and typed runtime configuration (port from environment, timeouts, retry, proxy flag) in `src/presentation/apify/composition-root.ts`
- [X] T043 [US3] Rewrite `src/main.ts`: `Actor.init()`, composition root, `Actor.on('aborting', ...)` persisting state then `await Actor.exit()`; fix the `standbyPort` read that fails strict type check (research R6)

**Checkpoint**: All three stories pass; the Actor serves requests locally.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T044 [P] Update `.actor/actor.json`, `.actor/input_schema.json`, `.actor/dataset_schema.json`, `.actor/output_schema.json` for the Standby API and run `apify validate-schema`
- [X] T045 [P] Write `README.md` (usage, endpoints, error codes and HTTP mapping, examples) per Apify Store guidance
- [X] T046 [P] Add a traceability check: every test file references at least one scenario ID from `spec.md` and every ID in `spec.md` is referenced by a test (script in `tests/`)
- [X] T047 Run `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test` with coverage and fix findings
- [X] T048 Run `quickstart.md` validation with `apify run` against the real Cadastre, check the p95 latency target (SC-002) informally, and update docs if behavior differs
- [X] T049 Review the Dockerfile (base image Node 24 vs `engines` >=22, `dist/main.js` entry) and the build output; Dockerfile changes require user approval (AGENTS.md)

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: no dependencies. T001 precedes T003/T021/T022/T040; T002 precedes T003; T007 precedes T013, T018, T028, T030.
- **Foundational (Phase 2)**: depends on Phase 1; BLOCKS all stories.
- **US1 (P1)**: depends on Phase 2. MVP.
- **US2 (P2)**: depends on Phase 2; T034 extends the gateway created in T024, so run after US1 implementation. T031 depends on T020.
- **US3 (P3)**: depends on Phase 2; full acceptance behavior needs US1 and US2 complete (uses T031 request parser).
- **Polish**: after the desired stories are complete.
- Within each story: tests first (must fail) → value objects/entities → mappers → gateway → use case → presentation.

### Parallel Opportunities

- Phase 1: T003, T004, T005, T006 together.
- Phase 2: T008/T009/T010 together, then T011/T012/T013 together.
- US1: T016, T017, T018 together; T020 and T021 together.
- US2: T026-T029 together; T031, T032, T033 together.
- US3: T035-T037 together; T038-T041 together.

### Parallel Example: User Story 1

```text
Task: T016 CadastralReference valid-case tests   (tests/unit/domain/cadastral-reference.test.ts)
Task: T017 Use case happy-path tests            (tests/unit/application/get-property-by-ref.use-case.test.ts)
Task: T018 Mapper tests with fixtures           (tests/unit/infrastructure/property-mapper.test.ts)
```

## Implementation Strategy

1. **MVP first**: Phase 1 → Phase 2 → Phase 3 (US1); validate with MSW before proceeding.
2. **Incremental delivery**: add US2 (reliable errors), then US3 (deployable Standby Actor); each stage is independently testable.
3. **Approvals required during implement**: package installation (T001), proxy usage (T040), Dockerfile changes (T049); `apify push` is not planned.
4. **Known deviations from the constitution** (need a separate amendment): `specs/` instead of `.spec/`, `.actor/actor.json` instead of root `actor.json`, E2E via in-process server plus manual `apify run`.
