# Phase 0 Research: SPEC-000

All items verified against the live Cadastre service on 2026-10-03 unless noted.

## R1. Upstream contract
- **Decision**: Call the SOAP 1.1 endpoint `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx`, `SOAPAction: "http://tempuri.org/OVCServWeb/OVCCallejero/Consulta_DNPRC"`. The body is document-style with three top-level elements in namespace `http://www.catastro.meh.es/`: `Provincia`, `Municipio`, `RefCat` (empty province/municipality allowed).
- **Rationale**: Verified by request. A `Consulta_DNPRC` wrapper element in the tempuri namespace, or an `RC` element, returns error 17 ("reference is mandatory"). See `contracts/cadastre-soap.md`.
- **Alternatives**: The service also offers HTTP GET/POST bindings (`/Consulta_DNPRC?RC=`). Rejected: the requirement is SOAP; kept as a documented fallback.

## R2. Response and error shape
- **Decision**: Success: `Consulta_DNP > consulta_dnp` with `control.cudnp` (count) and `bico` (single property) or `lrcdnp` (list for parcel references). Business errors arrive as HTTP 200 with `control.cuerr` and `lerr.err[{cod, des}]` (for example code 4 "not correctly formed", 17 "mandatory").
- **Rationale**: Errors cannot be detected by HTTP status; the mapper must inspect `cuerr`/`lerr`.
- **Note**: The exact code(s) for "reference does not exist" and the parcel-level (14 char) list shape MUST be captured as fixtures at the start of implementation (fixture-capture task) rather than assumed.

## R3. XML parsing
- **Decision**: `fast-xml-parser` with `removeNSPrefix: true`, `ignoreAttributes: true`, `parseTagValue: false`, `isArray` forcing arrays for repeating nodes (`cons`, `err`, `bi`/`rcdnp`), output typed as `unknown` and validated with Zod before mapping to domain entities.
- **Rationale**: Single-element vs. repeated-element ambiguity is the main XML-to-JSON pitfall; numeric fields use Spanish decimal commas (`cpt` = `100,000000`) so automatic number parsing must be disabled and values converted explicitly.
- **Alternatives**: `xml2js` (older, callback-oriented); soap client libraries (heavy, hide the wire format and hamper MSW fixtures).

## R4. HTTP client, proxy and resilience
- **Decision**: Native `fetch` with an `AbortSignal.timeout`. In production inject an `undici` `ProxyAgent` built from the Apify `ProxyConfiguration` URL; locally proxy is disabled by an environment flag. Retries: exponential backoff with jitter on network errors, timeouts and HTTP 5xx; no retry for business errors or HTTP 4xx. Total budget bounded (target below the 3 s p95 goal plus one retry cycle; values configurable).
- **Rationale**: Native fetch is intercepted by MSW in Node; keeps dependencies minimal. Proxy is a paid feature, so enabling it is configuration the user must approve at implementation time.

## R5. Validation of the cadastral reference
- **Decision**: Normalize (trim, strip whitespace, uppercase); accept `^[A-Z0-9]{14}$` (parcel) or `^[A-Z0-9]{20}$` (property). Check-digit validation is out of scope for v1 (the Cadastre itself reports malformed references).
- **Rationale**: Domain validation is cheap and prevents upstream calls; the stricter checksum algorithm is a possible later enhancement.

## R6. Standby HTTP surface
- **Decision**: Node `http` server (no extra framework), `GET /` readiness (header `x-apify-container-server-readiness-probe` -> 200), `GET /properties/{reference}` for the lookup, listening on the Standby port provided by the Apify environment. Error mapping: validation 400, not found 404, upstream unavailable 502/504, unexpected 500.
- **Note**: The template's `Actor.config.get('standbyPort')` fails the strict type check in the installed SDK version; implementation must read the port from the supported environment variable (`ACTOR_STANDBY_PORT`) instead. Confirm during implementation.

## R7. Testing
- **Decision**: Vitest projects: unit (no network), integration (MSW `setupServer`, `onUnhandledRequest: 'error'`), acceptance (in-process Standby server on an ephemeral port + MSW for the upstream). Fixtures in `tests/fixtures/soap/`. Test titles carry the Gherkin scenario name.
