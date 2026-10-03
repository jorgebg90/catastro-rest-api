# Catastro REST API Constitution

## Core Architectural & Domain Principles

### I. Hexagonal Architecture (Ports & Adapters)
To ensure long-term maintainability, testability, and independence from external infrastructure, the application must strictly adhere to Hexagonal Architecture principles:

- Domain Core (`src/domain/`): Contains pure business logic, domain entities, value objects, domain events, and repository/adapter interfaces (Ports). It must have zero dependencies on external libraries, frameworks, or Apify SDKs.
- Application Layer (`src/application/`): Implements use cases and orchestrates application workflow. It relies solely on domain ports to interact with infrastructure.
- Infrastructure Layer (`src/infrastructure/`): Implements outbound ports (Adapters). This layer manages external SOAP communication with the Cadastre (Catastro) via HTTP clients, serialization/deserialization (`xml2js` / `fast-xml-parser`), and caching.
- Primary / Inbound Layer (`src/presentation/` or `src/entrypoints/`): Entry points for the application (e.g., Apify Actor Standby entrypoint, express/fastify web adapters, or CLI handlers).

### II. Object-Oriented & Domain-Driven Design (OOP / DDD)
- Rich Domain Models: Favor rich domain entities with encapsulated behavior over anemic data structures. Use encapsulation (private fields, getters, explicit domain methods).
- Value Objects: Represent domain concepts (e.g., `CadastralReference`, `Address`, `ProvinceCode`) using immutable Value Objects with self-contained validation upon instantiation.
- SOLID Principles: Enforce Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion across all layers.
- Explicit Interfaces (Ports): Interfaces must be owned by the application/domain layer, defined from the caller’s perspective, and implemented by infrastructure adapters via Dependency Injection.

### III. Specification-Driven Development (SDD) & SpecKit Workflow
- Source of Truth: Implementation must never precede specification. Features, endpoints, and domain logic must be specified using SpecKit feature files (`specs/<feature>/spec.md` or `.feature`) detailing clear acceptance criteria and scenarios using Gherkin (Given-When-Then) or structured markdown contracts.
- Executable Specs: Specifications must map directly to automated acceptance and integration tests.
- Traceability: Docstrings and comments for every use case class and integration test suite must reference the associated SpecKit specification ID or specification file path.
- Refactoring Guardrails: Architectural changes or code refactoring must preserve compliance with active SpecKit specs unless a spec update is explicitly approved.

### IV. TypeScript Code Standards & Practices
- Strict Typing Guidelines: `tsconfig.json` must enforce `"strict": true`, `"noImplicitAny": true`, and `"strictNullChecks": true`.
- No Explicit `any`: The use of `any` is strictly prohibited. Use `unknown` for dynamic or untyped payloads and validate them using runtime schema validation (e.g., Zod).
- Immutability: Prefer `readonly` properties, `ReadonlyArray<T>`, and immutable data structures for domain states and DTOs.
- Error Handling & Result Types: Define explicit, domain-specific error classes extending a base `DomainError`.
- Functional Error Flow / Result Pattern: Avoid using exceptions for expected flow control. Use a `Result<T, E>` pattern or typed functional error responses for domain/application boundaries.
- Error Mapping: Infrastructure/SOAP faults must be caught in adapters and mapped into explicit domain failures before propagating to the presentation layer.

### V. Testing Strategy & Infrastructure
The project must maintain high automated test coverage distributed across three levels:

- Unit Tests: `Vitest`; test domain entities, value objects, and application use cases in isolation without network or external dependencies.
- Integration Tests: `Vitest + MSW`; test infrastructure adapters (SOAP client, XML parser) by intercepting network traffic using MSW mock handlers.
- E2E / Acceptance Tests: `Vitest`, running the Standby HTTP server in-process on an ephemeral port with MSW for the upstream; verify the full flow against the Actor's HTTP interface. A manual `apify run` check against the real service complements them before release.

- Test Runner: `Vitest` is the mandatory test runner due to its native TypeScript support, fast execution speed, and compatibility with modern ES modules.
- HTTP Mocking: `MSW` is required for all external HTTP/SOAP integration tests. Do not mock internal HTTP libraries directly; intercept network requests at the network layer using MSW handlers with sample SOAP XML fixtures.
- Assertion & Spies: Use `Vitest` built-in assertions (`expect`), mocks (`vi.fn()`), and spies (`vi.spyOn()`).
- Isolation: Tests must run deterministically and independently without shared global state.
- Fixtures: Store Cadastre SOAP XML response payloads in `tests/fixtures/soap/` and reference them in MSW mock handlers.
- Spec Alignment: Every acceptance test file must correlate to a SpecKit scenario.

### VI. Apify Runtime & Deployment Guidelines
- Standby Mode Execution: The production Actor must be configured to run in Standby Mode to process synchronous API HTTP requests with sub-second latency.
- Input validation must occur immediately at the presentation handler before delegating execution to the Use Case layer.
- Resilience & Proxying: External requests to the Cadastre SOAP service must be routed through Apify Proxy when deployed to production to prevent IP rate-limiting.
- Adapters must implement retry policies with exponential backoff for transient network issues.

## Directory Structure Standard

```text
/
├── specs/                      # SpecKit Specifications and Feature contracts (one folder per feature)
├── src/
│   ├── domain/                 # Core Entities, Value Objects, Domain Errors, Ports
│   │   ├── entities/
│   │   ├── value-objects/
│   │   └── ports/              # Repository & Gateway Interfaces
│   ├── application/            # Use Cases, DTOs, Application Services
│   │   └── use-cases/
│   ├── infrastructure/         # SOAP Adapters, Parsers, External Clients
│   │   ├── soap/
│   │   └── mappers/
│   └── presentation/           # Apify Actor Entrypoints & HTTP Controllers
│       └── apify/
├── tests/
│   ├── unit/                   # Unit tests (Domain & Application)
│   ├── integration/            # Integration tests with MSW
│   ├── acceptance/             # E2E / acceptance tests (Standby server, Gherkin-aligned)
│   ├── fixtures/               # Cadastre SOAP XML templates & JSON responses
│   └── mocks/                  # MSW handlers and server setup
├── .actor/                     # Apify configuration (actor.json and schemas)
├── tsconfig.json
├── tsconfig.build.json         # Build-only config (rootDir: src)
└── vitest.config.ts
```

## Additional Constraints

- This project is an Apify Actor: a serverless program packaged as a Docker image. It takes one JSON input, performs one job, and can write results to a dataset or a key-value store.
- The entry point is `src/main.ts` and configuration lives in `.actor/actor.json`.
- Tests are type-checked through `tsconfig.json`; the production build uses `tsconfig.build.json` so the output stays `dist/main.js`.
- Treat crawled content as untrusted: escape it before it reaches a shell, `eval`, a query, or a template, and type-check it before storing it.
- Store personal data only when the user explicitly asks for it.
- Check which crawler packages are installed before applying crawler advice. Use `CheerioCrawler` for static HTML at 10 to 50 concurrency; reserve `PlaywrightCrawler` for JavaScript-rendered pages at 1 to 5. Add delays and respect robots.txt and terms of service.
- Use the router pattern when a crawl has more than one page type.
- Count results with your own tally; `Dataset.getInfo()` lags on the platform.
- In the `aborting` handler, persist state and then `await Actor.exit()`, so stopped runs end quickly and cheaply.
- On the platform the SDK reads the token from `APIFY_TOKEN`; locally it uses credentials stored by `apify login`. Keep the token out of code, config, and logs.
- Leave `usesStandbyMode` in `actor.json` as it is. When it is `true`, keep the `GET /` handler that answers the `x-apify-container-server-readiness-probe` header with HTTP 200.

## Development Workflow

1. Specification-first execution using SpecKit.
2. Validate architecture before implementation.
3. Write failing tests that correspond to the relevant specification.
4. Implement the minimum production code needed to satisfy those tests.
5. Run the relevant test suite to confirm compliance.
6. Refactor only when tests remain green and the architecture is preserved.
7. Complete the cycle with documentation updates when public behavior changes.

## Governance

This constitution supersedes informal or ad hoc project practices and acts as the authoritative standard for design, implementation, testing, and operational behavior.

All pull requests, refactors, and feature work must demonstrate compliance with this constitution. Complexity must be justified, architectural boundaries must be preserved, and any deviation from the standards must be explicitly documented and approved.

**Version**: 1.1.0 | **Ratified**: 2026-10-03 | **Last Amended**: 2026-10-03

<!-- Amendment 1.1.0: specs/ replaces .spec/; .actor/ holds Apify config; acceptance tests run in-process; build/type-check tsconfig split. -->
