# Data Model: SPEC-000

## Domain

### Result<T, E>
`Ok<T> { ok: true, value }` | `Err<E> { ok: false, error }` with `ok()` / `err()` helpers.

### CadastralReference (Value Object)
- Private constructor; created only via `CadastralReference.from(raw): Result<CadastralReference, InvalidCadastralReferenceError>`.
- Canonical form: uppercase, no whitespace; length 14 (parcel) or 20 (property), `[A-Z0-9]` only.
- Methods: `value`, `kind` (`PARCEL` | `PROPERTY`), `equals`, `toString`. Created by the presentation layer, never by the use case.

### PropertyRecord (Entity, immutable)
| Field | Type | Source (XML) | Notes |
|-------|------|--------------|-------|
| reference | string | `idbi.rc` (pc1+pc2+car+cc1+cc2) | 20-char reference |
| propertyClass | `URBAN` / `RUSTIC` or null | `idbi.cn` (`UR`/`RU`) | Null in parcel list items |
| provinceCode / provinceName | string | `dt.loine.cp` / `dt.np` | |
| municipalityCode / municipalityName | string | `dt.loine.cm` / `dt.nm` | |
| address | string | `ldt`, else composed from `dt` (`tv nv pnp`, `pt`/`pu`, `dp`, `nm` (`np`)) | Parcel list items have no `ldt` |
| postalCode | string or null | `dt.locs.lous.lourb.dp` | |
| use | string or null | `debi.luso` | |
| surfaceSquareMeters | number or null | `debi.sfc` | |
| participationPercent | number or null | `debi.cpt` | Decimal comma converted |
| constructionYear | number or null | `debi.ant` | |
| constructions | Construction[] | `lcons.cons[]` | Empty when absent (always empty for parcel list items) |

### Construction
`use` (`lcd`), `floor` (`dt.lourb.loint.pt`), `door` (`pu`), `surfaceSquareMeters` (`dfcons.stl`).

### Errors (all extend `DomainError`, each with stable `code`)
| Class | Code | Origin |
|-------|------|--------|
| InvalidCadastralReferenceError | INVALID_CADASTRAL_REFERENCE | VO validation |
| PropertyNotFoundError | PROPERTY_NOT_FOUND | Cadastre `lerr` (carries upstream code and description) |
| CadastreTimeoutError | CADASTRE_TIMEOUT | timeout after retries (HTTP 504) |
| CadastreUnavailableError | CADASTRE_UNAVAILABLE | network / 5xx after retries (HTTP 502) |
| CadastreProtocolError | CADASTRE_PROTOCOL_ERROR | unparseable or unexpected payload (HTTP 502) |

Unexpected exceptions are caught at the presentation boundary and reported as HTTP 500 `INTERNAL_ERROR` (not a domain error).

## Ports
- `ICadastreGateway.queryByReference(ref: CadastralReference): Promise<Result<ReadonlyArray<PropertyRecord>, DomainError>>` (array: one item for property references, several for parcel references).
- `IGetPropertyByRefUseCase.execute(reference: CadastralReference): Promise<Result<ReadonlyArray<PropertyRecord>, DomainError>>` (receives an already validated VO and delegates to the gateway).
