# Implementation Plan: Property Lookup by Cadastral Reference (SPEC-000)

**Feature Directory**: `specs/000-property-by-cadastral-ref` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/000-property-by-cadastral-ref/spec.md`

**Note**: Planning only. No source code is written until `/speckit.implement`.

## Summary

Expose the Catastro `Consulta_DNPRC` operation (query by cadastral reference) as a synchronous REST endpoint on an Apify Standby Actor. The design follows strict Hexagonal Architecture: a pure domain (`CadastralReference` value object, `Result<T, E>`, domain errors, `ICadastreGateway` outbound port), an application use case behind the `IGetPropertyByRefUseCase` inbound port, a SOAP/XML infrastructure adapter (`fast-xml-parser`), and a presentation layer hosting the Standby HTTP server. Every use case and integration test is traceable to a Gherkin scenario in the spec.

## Technical Context

**Language/Version**: TypeScript 6 (strict, `noImplicitAny`, `strictNullChecks`), Node.js >= 22, ESM (`NodeNext`)
**Primary Dependencies**: `apify` (presentation/infrastructure only), `fast-xml-parser` (XML to JSON), `zod` (runtime validation of unknown payloads), `undici` (`ProxyAgent`); native `fetch` for HTTP. Dev: `vitest`, `msw`, `@vitest/coverage-v8`
**Storage**: N/A (stateless; no persistence per request)
**Testing**: Vitest (unit, integration, acceptance), MSW (`msw/node`) intercepting outbound SOAP calls
**Target Platform**: Apify platform, Standby mode (Docker, Node 22)
**Project Type**: web-service (Apify Standby Actor)
**Performance Goals**: p95 <= 3 s for valid references (dominated by Cadastre latency); no extra overhead beyond parsing
**Constraints**: Bounded upstream timeout and retry budget; outbound via Apify Proxy in production; no personal data stored; readiness probe answered with HTTP 200
**Scale/Scope**: Single operation (`Consulta_DNPRC`); other Cadastre operations are future specs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Hexagonal Architecture | PASS | Four layers; domain has zero SDK/framework imports; Apify only in `presentation` and proxy wiring in `infrastructure` |
| II. OOP / DDD | PASS | `CadastralReference` and `PropertyRecord` as immutable VO/entity with validation on creation; ports owned by domain/application |
| III. SDD / SpecKit | PASS | Gherkin scenarios with IDs (`US1-S1`...) in spec.md; IDs referenced from use cases and tests (see traceability) |
| IV. TypeScript standards | PASS | strict config, no `any`, `unknown` + Zod at boundaries, `Result<T, E>`, `DomainError` hierarchy, adapter error mapping |
| V. Testing strategy | PASS | Vitest unit/integration/acceptance, MSW with fixtures in `tests/fixtures/soap/` |
| VI. Apify runtime | PASS | Standby, input validation in the presentation handler (builds `CadastralReference` before the use case), proxy + exponential backoff in adapter |

**Documented deviations (require a separate constitution amendment, not handled here)**: the constitution's directory standard lists `.spec/` and a root `actor.json`; this project uses `specs/` (SpecKit standard) and `.actor/actor.json` (Apify standard). E2E uses an in-process Standby server plus a manual `apify run` check rather than a container execution.

Post-design re-check: PASS (design in `data-model.md`, `contracts/` introduces no new violations).

## Project Structure

### Documentation (this feature)

```text
specs/000-property-by-cadastral-ref/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── rest-api.openapi.yaml    # Public REST contract
│   ├── ports.md                 # IGetPropertyByRefUseCase / ICadastreGateway
│   └── cadastre-soap.md         # Verified upstream SOAP contract
├── checklists/requirements.md
└── tasks.md             # Created by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── result.ts
│   ├── errors/                  # DomainError, InvalidCadastralReferenceError,
│   │                            # PropertyNotFoundError, CadastreUnavailableError
│   ├── value-objects/           # CadastralReference
│   ├── entities/                # PropertyRecord, Construction
│   └── ports/                   # ICadastreGateway
├── application/
│   ├── ports/                   # IGetPropertyByRefUseCase
│   └── use-cases/               # GetPropertyByRefUseCase
├── infrastructure/
│   ├── soap/                    # CatastroSoapGateway (implements ICadastreGateway), envelope builder, retry, proxy
│   └── mappers/                 # XML -> PropertyRecord / error mapping
├── presentation/
│   └── apify/                   # Standby HTTP server, router, request parsing/validation, HTTP error mapping, logging, composition root
└── main.ts                      # Actor.init + composition root bootstrap

tests/
├── unit/                        # domain + use case (fake gateway)
├── integration/                 # SOAP gateway + mapper with MSW
├── acceptance/                  # HTTP endpoint end-to-end (Standby server in-process)
├── fixtures/soap/               # Recorded Cadastre responses
└── mocks/                       # MSW handlers and server setup
```

**Structure Decision**: Single project with the constitution's directory standard. The existing `test/` folder from the Apify template is migrated to `tests/` during implementation. `tsconfig.json` (strict, includes `tests/`) is used for type checking; `tsconfig.build.json` (`rootDir: src`) is used by `npm run build` so the output stays `dist/main.js` as the Dockerfile expects.

## Traceability (Gherkin -> artifacts)

| Scenario (spec.md) | Use case / component | Test level |
|--------------------|----------------------|------------|
| US1-S1 valid property-level reference | `GetPropertyByRefUseCase`, `CatastroSoapGateway`, mapper | unit + integration + acceptance |
| US1-S2 valid parcel-level reference | mapper (multiple items) | integration |
| US2-S1 malformed reference | `CadastralReference.from`, request parser in presentation | unit + acceptance |
| US2-S2 unknown reference | mapper error branch -> `PropertyNotFoundError` | integration + acceptance |
| US2-S3 upstream unavailable | gateway retry/backoff -> `CadastreUnavailableError` | integration + acceptance |
| US3-S1 readiness probe | Standby server | acceptance |
| US3-S2 lookup through endpoint | Standby server + use case | acceptance |

## Implementation Phases (for `/speckit.tasks`)

1. Foundation: strict tsconfig, Vitest, MSW setup, dependencies, directory skeleton.
2. Domain: `Result`, errors, `CadastralReference`, entities, `ICadastreGateway` (tests first).
3. Application: `IGetPropertyByRefUseCase` and implementation (tests first with fake gateway).
4. Infrastructure: SOAP envelope, gateway, fast-xml-parser mapper, retry/backoff, proxy wiring (MSW integration tests first).
5. Presentation: Standby server, routing, request parsing/validation (builds `CadastralReference`), error-to-HTTP mapping (timeout 504; network/5xx/protocol 502; unexpected 500), logging via Apify `log`, readiness probe, `aborting` handler.
6. Apify metadata: input/dataset/output schemas as required by the repo rules, README, local `apify run` verification.
