# Data Model: SPEC-001

All types are immutable; VOs validate on creation and return `Result`.

## Entities (output)
| Entity | Fields | Upstream source |
|--------|--------|-----------------|
| `Province` | `code` (INE, 2 digits), `name` | `prov.cpine`, `prov.np` |
| `Municipality` | `cadastralCode` (`locat.cmc`), `ineCode` (`loine.cm`), `provinceCode` (`loine.cp`), `name` (`nm`) | `muni` |
| `Street` | `code` (`cv`), `type` (`tv`), `name` (`nv`) | `calle.dir` |
| `StreetNumberEntry` | `number` (`pnp`), optional `suffix` (only if T001 fixtures show one), `cadastralReference14` (`pc1`+`pc2`) | `nump` |
| `PropertyRecord` | unchanged from SPEC-000 | `lrcdnp.rcdnp` or `bico` |

## Value objects (input)
| VO | Rules |
|----|-------|
| `ProvinceName` / `MunicipalityName` | trimmed, non-empty (required for streets, numbers, searches); municipality optional only for listing municipalities of a province |
| `StreetType` | trimmed, 1-5 letters (e.g. `CL`, `AV`) |
| `StreetName` | trimmed, max 100 chars; non-empty except for `/streets` where an empty fragment is allowed only if T001 confirms the upstream accepts it |
| `MunicipalityQuery` | province + optional municipality fragment |
| `StreetQuery` | province + municipality + optional streetType + streetName |
| `StreetNumberQuery` | province + municipality + streetType + streetName + number |
| `StreetNumber` | integer 0-9999 |
| `UnitLocator` | optional `block`, `staircase`, `floor`, `door` (trimmed, max 4 chars) |
| `AddressQuery` | province + municipality + streetType + streetName + number + optional `UnitLocator` |
| `ParcelQuery` | province + municipality + polygon (int >= 0) + parcel (int >= 0) |

## Errors (added)
`InvalidQueryError` (code per case: `MISSING_PARAMETER`, `INVALID_PARAMETER`, `AMBIGUOUS_QUERY`), mapped to HTTP 400. `PropertyNotFoundError` is reused for property searches; `CatalogEntryNotFoundError` (new) is used for empty catalogue results. Both map to HTTP 404.
