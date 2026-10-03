# Catastro REST API

Synchronous REST API over the Spanish Cadastre (Catastro) `Consulta_DNPRC` SOAP service, running as an Apify Standby Actor. Give it a cadastral reference and get normalized JSON back.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check (also answers the Apify readiness probe) |
| GET | `/docs` | Swagger UI (interactive docs, served locally from `swagger-ui-dist`; no third-party calls) |
| GET | `/openapi.json` | OpenAPI 3.0 document |
| GET | `/provinces` | List all provinces |
| GET | `/municipalities?province=&municipality=` | Municipalities of a province (name optional, prefix filter) |
| GET | `/streets?province=&municipality=&streetType=&streetName=` | Streets of a municipality |
| GET | `/street-numbers?province=&municipality=&streetType=&streetName=&number=` | Street numbers with their 14-char parcel reference |
| GET | `/properties?...` | Search by address (`streetType`, `streetName`, `number`, optional `block`, `staircase`, `floor`, `door`) or by `polygon` + `parcel`; not both |
| GET | `/properties/{reference}` | Property data for a 20-character reference, or the list of properties for a 14-character parcel reference |

```bash
curl https://<username>--catastro-rest-api.apify.actor/properties/9872023VH5797S0001WX
```

```json
{
  "reference": "9872023VH5797S0001WX",
  "properties": [
    {
      "reference": "9872023VH5797S0001WX",
      "propertyClass": "URBAN",
      "provinceName": "CIUDAD REAL",
      "municipalityName": "SANTA CRUZ DE MUDELA",
      "address": "CL GLORIA 51 13730 SANTA CRUZ DE MUDELA (CIUDAD REAL)",
      "use": "Residencial",
      "surfaceSquareMeters": 308,
      "constructionYear": 1980,
      "constructions": [{ "use": "VIVIENDA", "floor": "00", "door": "01", "surfaceSquareMeters": 109 }]
    }
  ]
}
```

Parcel (14-character) results list properties with location data only; `propertyClass` is `null` and `constructions` is empty. Full schema: `specs/000-property-by-cadastral-ref/contracts/rest-api.openapi.yaml`.

## Data source and disclaimer

Data comes from the Dirección General del Catastro free services (reused under Law 37/2007). This is an independent technical wrapper, not affiliated with the Catastro; it returns only non-protected data, is provided as is, and does not replace official cadastral certificates. See [docs/legal-disclaimer.md](docs/legal-disclaimer.md).

## Errors

| HTTP | `code` | Meaning |
|------|--------|---------|
| 400 | `INVALID_CADASTRAL_REFERENCE` | Malformed reference (rejected without calling the Cadastre) |
| 400 | `MISSING_PARAMETER` / `INVALID_PARAMETER` / `AMBIGUOUS_QUERY` | Bad query parameters on the catalogue/search endpoints |
| 404 | `CATALOG_ENTRY_NOT_FOUND` | Unknown province, municipality, street or number |
| 404 | `PROPERTY_NOT_FOUND` | Unknown reference; body includes `upstream.code` and `upstream.description` |
| 502 | `CADASTRE_UNAVAILABLE` / `CADASTRE_PROTOCOL_ERROR` | Cadastre failing or returning an unexpected payload |
| 504 | `CADASTRE_TIMEOUT` | Cadastre too slow |
| 500 | `INTERNAL_ERROR` | Unexpected error |

Transient upstream failures are retried with exponential backoff within a bounded time.

## Configuration (environment variables)

`ACTOR_STANDBY_PORT`, `CATASTRO_ENDPOINT`, `CATASTRO_TIMEOUT_MS` (5000), `CATASTRO_RETRY_ATTEMPTS` (3), `CATASTRO_RETRY_BASE_MS` (200), `CATASTRO_RETRY_MAX_MS` (1000), `CATASTRO_RETRY_BUDGET_MS` (10000), `CATASTRO_USE_PROXY` (`true` routes Cadastre calls through the Apify proxy; default off).

## Development

- [Local execution and debugging (with and without Docker)](docs/local-debugging.md)
- [Quick guide: deploying to Apify](docs/deployment.md)
- [Legal disclaimer and terms of use](docs/legal-disclaimer.md)

```bash
npm install
npm test
npm run build
apify run
```

Architecture: hexagonal (`src/domain`, `src/application`, `src/infrastructure`, `src/presentation`). Specification and plan: `specs/000-property-by-cadastral-ref/`.
