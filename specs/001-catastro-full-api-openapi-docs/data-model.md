# Data Model: SPEC-001

All types are immutable; VOs validate on creation and return `Result`.

## Entities (output)
| Entity | Fields | Upstream source |
|--------|--------|-----------------|
| `Province` | `code` (INE, 2 digits), `name` | `prov.cpine`, `prov.np` |
| `Municipality` | `cadastralCode` (`locat.cmc`), `ineCode` (`loine.cm`), `provinceCode` (`loine.cp`), `name` (`nm`) | `muni` |
| `Street` | `code` (`cv`), `type` (`tv`), `name` (`nv`) | `calle.dir` |
| `StreetNumberEntry` | `number` (`pnp`), `suffix` (`plp`, null when blank), `cadastralReference14` (`pc1`+`pc2`) | `nump` |
| `PropertyRecord` | unchanged from SPEC-000 | `lrcdnp.rcdnp` or `bico` |

## Value objects (input)
| VO | Rules |
|----|-------|
| `ProvinceName` / `MunicipalityName` | trimmed, non-empty (required for streets, numbers, searches); municipality optional only for listing municipalities of a province |
| `StreetType` | trimmed, 1-5 letters (e.g. `CL`, `AV`) |
| `StreetName` | trimmed, max 100 chars; non-empty except for `/streets`, where an empty fragment is accepted by the upstream |
| `MunicipalityQuery` | province + optional municipality fragment |
| `StreetQuery` | province + municipality + optional streetType + streetName |
| `StreetNumberQuery` | province + municipality + streetType + streetName + number |
| `StreetNumber` | integer 0-9999 |
| `UnitLocator` | optional `block`, `staircase`, `floor`, `door` (trimmed, max 4 chars) |
| `AddressQuery` | province + municipality + streetType + streetName + number + optional `UnitLocator` |
| `ParcelQuery` | province + municipality + polygon (int >= 0) + parcel (int >= 0) |

## Errors (added)
`InvalidQueryError` (code per case: `MISSING_PARAMETER`, `INVALID_PARAMETER`, `AMBIGUOUS_QUERY`), mapped to HTTP 400. `PropertyNotFoundError` is reused for property searches; `CatalogEntryNotFoundError` (new) is used for empty catalogue results. Both map to HTTP 404.


Note: the implementation models inputs as immutable query objects (`MunicipalityQuery`, `StreetQuery`, `StreetNumberQuery`, `AddressQuery`, `ParcelQuery`) in `src/domain/value-objects/queries.ts`, each with a `from()` returning `Result`, instead of one class per field.
