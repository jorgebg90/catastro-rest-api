# Research: Cadastral Reference by Coordinates (SPEC-002)

## R1. Upstream operation

- **Decision**: `OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR` via HTTP GET (plain XML, no SOAP envelope).
- **Rationale**: Same approach as SPEC-001; verified live. It is a separate `.asmx`, so the gateway needs a per-service base path.
- **Alternatives**: `Consulta_RCCOOR_Distancia` (nearest parcels) - excluded by scope; SOAP POST - unnecessary.

## R2. Axis mapping

- **Decision**: `longitude` -> `Coordenada_X`, `latitude` -> `Coordenada_Y`, `srs` -> `SRS`.
- **Evidence**: lon -3.70720 / lat 40.41446 returns `0142208VK4704A`; swapping them returns error 16.

## R3. Supported reference systems

- **Decision**: Only `EPSG:4326` (default) and `EPSG:4258`; both verified to return the same reference.
- **Rationale** (user decision): only geographic coordinates will be used. Projected systems (25828-25831, 3857) and `EPSG:4230` (ED50) are accepted upstream but deliberately not exposed.
- **Note**: unknown codes are not rejected upstream with a distinct code (they return 16), so the API validates `srs` itself to give a clear 400.

## R4. Business errors (HTTP 200, `control.cuerr = 1`)

| Code | Description | Mapping |
|------|-------------|---------|
| 16 | PARA ESAS COORDENADAS NO HAY REFERENCIA DISPONIBLE | 404 `COORDINATE_NOT_FOUND` |
| 75 | EL CAMPO SRS ES OBLIGATORIO | 400 `INVALID_PARAMETER` |
| 77 | LA COORDENADA X DEBE SER UN VALOR NUMÉRICO | 400 `INVALID_PARAMETER` |
| 79 | LA COORDENADA Y OBLIGATORIA | 400 `INVALID_PARAMETER` |
| other | - | 502 `CADASTRE_PROTOCOL_ERROR` |

Since the API validates input first, 75/77/79 are a defensive mapping only. Code 16 must not be added to the generic not-found set, so it uses a dedicated `coordinate` kind.

## R5. Response shape

The 14-character parcel reference is `pc1` + `pc2` (7 + 7). Upstream also returns `ldt` (address text) and the echoed `xcen`/`ycen`/`srs`. A parcel reference differs from the 20-character property reference; `/properties/{reference}` accepts both (SPEC-000 already handles parcel references); the chain is covered by acceptance scenario US1-S4.

## R6. Validation

Longitude -180..180, latitude -90..90, finite numbers, dot decimal separator only. `srs` normalised (trim, upper-case) before comparison. Out-of-range values are rejected before any upstream call.

## R7. Dependencies

None added.
