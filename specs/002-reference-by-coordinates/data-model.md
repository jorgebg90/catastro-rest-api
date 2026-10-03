# Data Model: Cadastral Reference by Coordinates (SPEC-002)

## Value object `Coordinate` (immutable)

| Field | Type | Rule |
|-------|------|------|
| `longitude` | number | finite, -180..180 |
| `latitude` | number | finite, -90..90 |
| `srs` | `'EPSG:4326' \| 'EPSG:4258'` | default `EPSG:4326`; trimmed, case-insensitive |

`Coordinate.from(raw)` returns `Result<Coordinate, InvalidQueryError>` (`MISSING_PARAMETER` / `INVALID_PARAMETER`).

## Entity `ReferenceMatch`

| Field | Type | Source |
|-------|------|--------|
| `reference` | string (14) | `pc1` + `pc2` |
| `parcel` / `sheet` | string (7) each | `pc1` / `pc2` |
| `address` | string | `ldt` |
| `longitude`, `latitude` | number | `xcen`, `ycen` |
| `srs` | string | `geo.srs` |

## Error

`ReferenceNotFoundError` -> HTTP 404, code `COORDINATE_NOT_FOUND`, carries upstream `code` and `description` (same body shape as other errors).

## Response (200)

```json
{
  "reference": "0142208VK4704A",
  "parcel": "0142208",
  "sheet": "VK4704A",
  "address": "CL IMPERIAL 14 MADRID (MADRID)",
  "coordinate": { "longitude": -3.7072, "latitude": 40.41446, "srs": "EPSG:4326" },
  "source": "Dirección General del Catastro"
}
```

(`source` follows the attribution convention already used by the other endpoints; the implementation reuses the existing helper.)
