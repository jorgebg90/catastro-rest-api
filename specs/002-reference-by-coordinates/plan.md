# Implementation Plan: Cadastral Reference by Coordinates (SPEC-002)

**Feature Directory**: `specs/002-reference-by-coordinates` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-reference-by-coordinates/spec.md`

**Note**: Planning only. No source code is written until `/speckit.implement`.

## Summary

Add `GET /coordinates/reference?longitude=&latitude=&srs=` returning the parcel reference containing a point. Design decisions (see [research.md](./research.md)):

- Upstream is `OVCCoordenadas.asmx/Consulta_RCCOOR` through the **HTTP GET binding** (verified live), a different `.asmx` from `OVCCallejero`, so the existing GET gateway's base URL is generalised rather than duplicated.
- One new outbound port (`ICoordinateGateway`) and one inbound port (`IFindReferenceByCoordinatesUseCase`), keeping interfaces segregated. Existing ports are untouched.
- Error mapping gains codes 16 (no parcel -> 404) and 75/77/79 (rejected input -> 400) in a new `coordinate` kind of `mapOperationErrors`; existing kinds behave as before.
- The route is added to the single route table; `.actor/openapi.json` is regenerated. **No new packages.**

## Technical Context

**Language/Version**: TypeScript 6 (strict), Node.js >= 22, ESM (`NodeNext`)
**Primary Dependencies**: unchanged (`apify`, `fast-xml-parser`, `zod`, `undici`). Dev: `vitest`, `msw`
**Storage**: N/A (stateless)
**Testing**: Vitest (unit, integration with MSW + real captured XML fixtures, acceptance in-process server)
**Target Platform**: Apify Standby Actor
**Project Type**: web-service
**Performance Goals**: p95 <= 3 s (upstream-bound); validation failures answered without any upstream call
**Constraints**: Same timeout/retry/proxy/error envelope as SPEC-000/001; existing endpoints unchanged (FR-011)
**Scale/Scope**: 1 new endpoint

## Constitution Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Hexagonal Architecture | PASS | `Coordinate`/`ReferenceMatch` and `ICoordinateGateway` in `domain`; use case in `application`; GET adapter and parser in `infrastructure`; parsing/validation/docs in `presentation` |
| II. OOP / DDD | PASS | Immutable `Coordinate` VO validates range and SRS on creation (`Coordinate.from()` -> `Result`); `ReferenceMatch` is an immutable value |
| III. SDD / SpecKit | PASS | Scenario IDs `002:US1-S1`..`002:US4-S2`; traceability test extended |
| IV. TypeScript standards | PASS | strict, no `any`, `Result<T,E>`, upstream errors mapped in the adapter |
| V. Testing strategy | PASS | Vitest + MSW; fixtures captured from the live service under `tests/fixtures/soap/` |
| VI. Apify runtime | PASS | Validation before the use case; proxy + backoff reused; readiness probe untouched |

Post-design re-check: PASS. No new dependencies, so no "ask first" gate.

## Project Structure

### Documentation (this feature)

```text
specs/002-reference-by-coordinates/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── rest-api.openapi.yaml   # Public REST contract
│   ├── ports.md                # New ports
│   └── cadastre-get.md         # Verified upstream contract
├── checklists/requirements.md
└── tasks.md             # Created by /speckit.tasks
```

### Source Code (additions)

```text
src/
├── domain/
│   ├── value-objects/   # + Coordinate (longitude, latitude, srs)
│   ├── entities/        # + ReferenceMatch
│   ├── errors/          # + ReferenceNotFoundError (404 COORDINATE_NOT_FOUND)
│   └── ports/           # + ICoordinateGateway
├── application/
│   ├── ports/           # + IFindReferenceByCoordinatesUseCase
│   └── use-cases/       # + FindReferenceByCoordinatesUseCase
├── infrastructure/
│   ├── soap/            # CatastroGetGateway: configurable per-service base path; implements ICoordinateGateway
│   └── mappers/         # + coordinate-xml-parser; error-mapper: kind 'coordinate', codes 16/75/77/79
└── presentation/
    ├── apify/           # request-parser for the new route; http-mapper status for ReferenceNotFoundError; composition root
    └── docs/            # routes.ts + openapi.ts entry; run `npm run generate:openapi`

tests/
├── unit/          # Coordinate VO, use case, request parser, error mapper, traceability (extended)
├── integration/   # gateway + parser with MSW
├── acceptance/    # endpoint through the in-process server
└── fixtures/soap/ # + coordinates-found, coordinates-not-found, coordinates-missing-srs, coordinates-invalid-x, coordinates-missing-y
```

**Structure Decision**: extend the existing layout; the route table remains the single source for router, OpenAPI and the Actor's published OpenAPI file.

## Traceability (Gherkin -> artifacts)

| Scenario | Component | Test level |
|----------|-----------|------------|
| US1-S1 reference of a point | use case, gateway, parser | unit + integration + acceptance |
| US1-S2 point outside any parcel | error mapper (16) -> 404 | integration + acceptance |
| US1-S3 default WGS84 | request parser | unit + acceptance |
| US1-S4 chain with `/properties/{reference}` | acceptance (two calls) | acceptance |
| US2-S1 `EPSG:4258` equals `EPSG:4326` | `Coordinate`, gateway | integration + acceptance |
| US2-S2 unsupported `srs` | `Coordinate` VO | unit + acceptance (no upstream call) |
| US3-S1 missing parameter | request parser | unit + acceptance |
| US3-S2 invalid / out-of-range | `Coordinate` VO | unit + acceptance |
| US3-S3 outage/timeout/unexpected error | shared retry + http-mapper | integration + acceptance |
| US4-S1 documented endpoint | route table, `openapi.ts` | unit + acceptance |
| US4-S2 stale published OpenAPI | `actor-openapi-sync` test | unit |

## Implementation Phases (for `/speckit.tasks`)

1. Capture real fixtures (success, no parcel, missing SRS, invalid X, missing Y, `EPSG:4258`).
2. Domain: `Coordinate`, `ReferenceMatch`, `ReferenceNotFoundError`, port (tests first).
3. Application: use case with a fake gateway.
4. Infrastructure: per-service base URL, parser, gateway method, error mapping (MSW first).
5. Presentation: request parser, route, http-mapper, composition root.
6. Docs: route table/OpenAPI, `npm run generate:openapi`, README, local-debugging, traceability test for SPEC-002.
7. Polish: lint/typecheck/coverage, live `npx apify-cli run` check.
