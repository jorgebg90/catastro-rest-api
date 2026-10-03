# Implementation Plan: Full Catastro API and HTML API Documentation (SPEC-001)

**Feature Directory**: `specs/001-catastro-full-api-openapi-docs` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-catastro-full-api-openapi-docs/spec.md`

**Note**: Planning only. No source code is written until `/speckit.implement`.

## Summary

Expose the six remaining OVCCallejero operations (`ConsultaProvincia`, `ConsultaMunicipio`, `ConsultaVia`, `ConsultaNumero`, `Consulta_DNPLOC`, `Consulta_DNPPP`) as REST endpoints, and serve an OpenAPI 3 document plus a self-contained HTML documentation page from the same Standby server. Design decisions (see [research.md](./research.md)):

- New operations use the upstream **HTTP GET binding** (verified live; no SOAP envelope needed). `Consulta_DNPRC` keeps its SOAP POST adapter. Timeout, retry/backoff, proxy and error mapping are shared.
- Two new outbound ports (`ICatalogGateway`, `IPropertySearchGateway`) keep interfaces segregated; `ICadastreGateway` (SPEC-000) is untouched. One inbound port per use case.
- A single **route table** in the presentation layer drives routing; the OpenAPI document is a typed object in `presentation/docs`; a test compares both (FR-009).
- HTML docs are rendered by a small dependency-free function from the OpenAPI object (FR-011). **No new packages.**

## Technical Context

**Language/Version**: TypeScript 6 (strict), Node.js >= 22, ESM (`NodeNext`)
**Primary Dependencies**: unchanged (`apify`, `fast-xml-parser`, `zod`, `undici`). Dev: `vitest`, `msw`
**Storage**: N/A (stateless)
**Testing**: Vitest (unit, integration with MSW + real captured XML fixtures, acceptance in-process server)
**Target Platform**: Apify Standby Actor
**Project Type**: web-service
**Performance Goals**: p95 <= 3 s for catalogue/search calls (upstream-bound); docs routes served from memory, no upstream call
**Constraints**: Same timeout/retry/proxy as SPEC-000; docs without third-party requests; readiness probe unaffected
**Scale/Scope**: 6 new endpoints + 2 docs routes (`/docs`, `/openapi.json`)

## Constitution Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Hexagonal Architecture | PASS | New entities/VOs/ports in `domain`; use cases in `application`; GET-binding adapter and parsers in `infrastructure`; routing, validation and docs in `presentation`. Domain stays dependency-free |
| II. OOP / DDD | PASS | Immutable VOs (`ProvinceName`, `MunicipalityName`, `StreetType`, `StreetName`, `StreetNumber`, `ParcelLocation`, `AddressQuery`) validate on creation; entities `Province`, `Municipality`, `Street`, `StreetNumberEntry` |
| III. SDD / SpecKit | PASS | Scenario IDs `US1-S1`..`US4-S4`; traceability test extended to this spec |
| IV. TypeScript standards | PASS | strict, no `any`, Zod over `unknown`, `Result<T,E>`, errors mapped in adapters |
| V. Testing strategy | PASS | Vitest + MSW; fixtures under `tests/fixtures/soap/` captured from the live service |
| VI. Apify runtime | PASS | Validation in presentation before use cases; proxy + backoff reused; Standby readiness preserved |

Post-design re-check: PASS (no new violations; no new dependencies, so no "ask first" gate).

## Project Structure

### Documentation (this feature)

```text
specs/001-catastro-full-api-openapi-docs/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── rest-api.openapi.yaml    # Public REST contract (design reference)
│   ├── ports.md                 # New ports
│   └── cadastre-get.md          # Verified upstream GET contract
├── checklists/requirements.md
└── tasks.md             # Created by /speckit.tasks
```

### Source Code (additions)

```text
src/
├── domain/
│   ├── entities/        # + Province, Municipality, Street, StreetNumberEntry
│   ├── value-objects/   # + ProvinceName, MunicipalityName, StreetType, StreetName,
│   │                    #   StreetNumber, ParcelLocation, AddressQuery (names TBD in tasks)
│   ├── errors/          # + InvalidQueryError (reuses validation mapping)
│   └── ports/           # + ICatalogGateway, IPropertySearchGateway
├── application/
│   ├── ports/           # + IListProvincesUseCase, IListMunicipalitiesUseCase, IListStreetsUseCase,
│   │                    #   IListStreetNumbersUseCase, ISearchPropertiesByAddressUseCase,
│   │                    #   ISearchPropertiesByParcelUseCase
│   └── use-cases/       # + implementations (thin, delegate to gateways)
├── infrastructure/
│   ├── soap/            # + CatastroGetGateway (implements both new ports; shares retry/proxy/timeout)
│   └── mappers/         # + catalog-xml-parser, catalog-mapper (reuse error-mapper, property-mapper)
└── presentation/
    ├── apify/           # server delegates to router; request parsers per endpoint; composition root wiring
    └── docs/            # openapi.ts (typed document), html-renderer.ts, routes.ts (route table)

tests/
├── unit/          # VOs, use cases, openapi-vs-routes, html renderer, traceability (extended)
├── integration/   # CatastroGetGateway + parsers with MSW
├── acceptance/    # each endpoint + /docs + /openapi.json through the in-process server
└── fixtures/soap/ # + provinces, municipalities, streets, street-numbers, dnploc-list, dnploc-single, dnppp-list, errors
```

**Structure Decision**: extend the SPEC-000 layout; the route table in `presentation/docs/routes.ts` is the single source consumed by the router and by the consistency test.

## Traceability (Gherkin -> artifacts)

| Scenario | Component | Test level |
|----------|-----------|------------|
| US1-S1 list provinces | `ListProvincesUseCase`, `CatastroGetGateway`, catalog parser | unit + integration + acceptance |
| US1-S2 municipalities of a province | `ListMunicipalitiesUseCase`, parser | integration + acceptance |
| US1-S3 streets of a municipality | `ListStreetsUseCase`, parser | integration + acceptance |
| US1-S4 street numbers | `ListStreetNumbersUseCase`, parser | integration + acceptance |
| US1-S5 missing/invalid parameters | request parsers, VOs | unit + acceptance |
| US1-S6 catalogue not found | error mapper -> 404 | integration + acceptance |
| US2-S1..S2 search by address / unit | `SearchPropertiesByAddressUseCase`, property mapper | integration + acceptance |
| US2-S3 polygon/parcel | `SearchPropertiesByParcelUseCase` | integration + acceptance |
| US2-S4 incomplete criteria | request parser | unit + acceptance |
| US2-S5 no match | error mapper | integration + acceptance |
| US3-S1..S2 errors and retries | shared retry + http-mapper | integration + acceptance |
| US4-S1 HTML docs | `html-renderer`, `/docs` | unit + acceptance |
| US4-S2 OpenAPI JSON | `openapi.ts`, `/openapi.json` | unit + acceptance |
| US4-S3 docs/routes consistency | route table vs OpenAPI | unit |
| US4-S4 docs in Standby | server + readiness unaffected | acceptance |

## Implementation Phases (for `/speckit.tasks`)

1. Capture real fixtures (success and error cases) for each operation.
2. Domain: VOs, entities, errors, new ports (tests first).
3. Application: six use cases (fake gateways).
4. Infrastructure: generalize fetch/retry/error handling, `CatastroGetGateway`, parsers (MSW first).
5. Presentation: route table + router, request parsers, endpoints, composition root.
6. Docs: OpenAPI object, HTML renderer, `/docs` and `/openapi.json`, consistency test.
7. Polish: traceability test for SPEC-001, README/docs update, lint/typecheck/coverage, `apify run` against the live service.
