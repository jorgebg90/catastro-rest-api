# Catastro REST API - Spanish Cadastre Property Data as JSON

Look up Spanish properties through the official **Dirección General del Catastro** free services and get clean, normalized JSON. Search by cadastral reference, by address, by polygon and parcel, or by **GPS coordinates**. Runs as an Apify Standby Actor with an interactive Swagger UI and an OpenAPI document.

### 🤖 What does Catastro REST API do?

The Spanish Cadastre publishes its public data through SOAP/XML web services that are slow to integrate and awkward to use. This Actor wraps them in a simple, synchronous REST API:

- **Property by cadastral reference**: location, use, surface, construction year and constructions for a 20-character reference, or every property of a 14-character parcel reference.
- **Reference by coordinates**: give it a longitude and latitude and get the cadastral reference of the parcel that contains the point.
- **Address and parcel search**: find properties by street address (with block, staircase, floor and door) or by rustic polygon and parcel.
- **Catalogues**: provinces, municipalities, streets and street numbers, so you can build an address autocomplete.
- **Documentation built in**: Swagger UI at `/docs` and the OpenAPI 3 document at `/openapi.json`.

### 💡 Why use it?

- **Real estate and proptech**: enrich listings with the official reference, surface and use.
- **Valuation, insurance and banking**: validate addresses and parcels against the official source.
- **GIS and mapping**: turn a map pin into a cadastral reference in one call.
- **Data teams and AI agents**: JSON over HTTP instead of XML over SOAP, with predictable error codes.

### 🚀 How to use it

1. Start the Actor in **Standby** mode from the Apify Console (or call its Standby URL; it starts on demand).
2. Open `https://<username>--catastro-rest-api.apify.actor/docs` and use **Try it out**.
3. Call the endpoints from your code, authenticating with your Apify API token.

```bash
curl "https://<username>--catastro-rest-api.apify.actor/properties/9872023VH5797S0001WX?token=<YOUR_APIFY_TOKEN>"
```

### ⚠️ Important

- **Coordinates order**: `longitude` comes first, `latitude` second, both in decimal degrees with a dot. Google Maps copies coordinates as `latitude, longitude`, so swap them. Example: Vigo is `longitude=-8.7194`, `latitude=42.2345`.
- **Coordinates must fall inside a parcel**: a point in the middle of a street belongs to no parcel and returns 404.
- **Street names are the Cadastre's own**: they use abbreviations and their own street types (for example `RU` + `DR CARLOS COLMEIRO LAFORE`). Search by a fragment first with `/streets?...&streetName=COLMEIRO`.
- **Only public data**: ownership and cadastral values are never returned (see the legal disclaimer at the end).

### 📝 Endpoints and input parameters

| Method | Path | Description |
|--------|------|-------------|
| GET | `/properties/{reference}` | Property data for a 20-character reference, or the properties of a 14-character parcel reference |
| GET | `/coordinates/reference` | Cadastral reference of the parcel containing a point |
| GET | `/properties` | Search by address or by `polygon` + `parcel` (not both) |
| GET | `/provinces` | List all provinces |
| GET | `/municipalities` | Municipalities of a province |
| GET | `/streets` | Streets of a municipality |
| GET | `/street-numbers` | Street numbers with their 14-character parcel reference |
| GET | `/docs` | Swagger UI (interactive documentation) |
| GET | `/openapi.json` | OpenAPI 3.0 document |
| GET | `/` | Health check |

| Endpoint | Parameters |
|----------|------------|
| `/coordinates/reference` | `longitude` (required), `latitude` (required), `srs` (optional: `EPSG:4326` default, or `EPSG:4258`) |
| `/municipalities` | `province` (required), `municipality` (optional name or fragment) |
| `/streets` | `province`, `municipality` (required); `streetType`, `streetName` (optional) |
| `/street-numbers` | `province`, `municipality`, `streetType`, `streetName`, `number` (all required) |
| `/properties` (address) | `province`, `municipality`, `streetType`, `streetName`, `number`; optional `block`, `staircase`, `floor`, `door` |
| `/properties` (parcel) | `province`, `municipality`, `polygon`, `parcel` |

Province, municipality and street names ignore case and accents.

### 📊 Output examples

**Reference by coordinates**

```bash
curl "https://<username>--catastro-rest-api.apify.actor/coordinates/reference?longitude=-3.70720&latitude=40.41446"
```

```json
{
  "reference": "0142208VK4704A",
  "parcel": "0142208",
  "sheet": "VK4704A",
  "address": "CL IMPERIAL 14 MADRID (MADRID)",
  "coordinate": { "longitude": -3.7072, "latitude": 40.41446, "srs": "EPSG:4326" }
}
```

**Property by reference**

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

Parcel (14-character) results list properties with location data only; `propertyClass` is `null` and `constructions` is empty.

**Tip:** chain the two calls. Take the `reference` returned by `/coordinates/reference` and pass it to `/properties/{reference}`.

### ❌ Errors

| HTTP | `code` | Meaning |
|------|--------|---------|
| 400 | `INVALID_CADASTRAL_REFERENCE` | Malformed reference (rejected without calling the Cadastre) |
| 400 | `MISSING_PARAMETER` / `INVALID_PARAMETER` / `AMBIGUOUS_QUERY` | Missing, malformed or conflicting query parameters |
| 404 | `COORDINATE_NOT_FOUND` | No parcel at the given coordinates |
| 404 | `CATALOG_ENTRY_NOT_FOUND` | Unknown province, municipality, street or number |
| 404 | `PROPERTY_NOT_FOUND` | Unknown reference; the body includes `upstream.code` and `upstream.description` |
| 502 | `CADASTRE_UNAVAILABLE` / `CADASTRE_PROTOCOL_ERROR` | The Cadastre is failing or returned an unexpected payload |
| 504 | `CADASTRE_TIMEOUT` | The Cadastre was too slow |
| 500 | `INTERNAL_ERROR` | Unexpected error |

Transient upstream failures are retried with exponential backoff within a bounded time.

### ⚙️ Configuration (environment variables)

`ACTOR_STANDBY_PORT`, `CATASTRO_ENDPOINT`, `CATASTRO_COORDINATES_ENDPOINT`, `CATASTRO_TIMEOUT_MS` (5000), `CATASTRO_RETRY_ATTEMPTS` (3), `CATASTRO_RETRY_BASE_MS` (200), `CATASTRO_RETRY_MAX_MS` (1000), `CATASTRO_RETRY_BUDGET_MS` (10000), `CATASTRO_USE_PROXY` (`true` routes Cadastre calls through the Apify proxy; default off).

### 🛠️ Development

- [Local execution and debugging (with and without Docker)](docs/local-debugging.md)
- [Quick guide: deploying to Apify](docs/deployment.md)

```bash
npm install
npm test
npm run build
apify run
```

Architecture: hexagonal (`src/domain`, `src/application`, `src/infrastructure`, `src/presentation`). Specifications and plans: `specs/`.

### ⚖️ Legal disclaimer and terms of use

> Informational text for the Actor publisher. It is not legal advice; have a professional review it before monetizing the Actor. The full version is in [docs/legal-disclaimer.md](docs/legal-disclaimer.md).

**Nature of the service.** Catastro REST API is an independent **technical gateway (wrapper)** over the Free Services of the Spanish Cadastre electronic office. It is not an official service and is not affiliated with, endorsed or sponsored by the Dirección General del Catastro or the Spanish Ministry of Finance. It does not store or alter the data; it only converts XML into JSON. What is offered is the technical service (JSON format, availability, latency, documentation and hosting), **not ownership of the cadastral data**.

**Data source and reuse.** Data comes from the Dirección General del Catastro (https://www.catastro.hacienda.gob.es) and is reused under Law 37/2007 of 16 November on the reuse of public sector information. Any use or redistribution must cite the Cadastre as the source. Non-protected information (cadastral reference, location, surface, use, age) is public and reusable, including for commercial purposes. Under article 51 of the Consolidated Text of the Cadastre Law, ownership data (owner name, tax ID, address) and individual cadastral or reference values are protected; this Actor only uses the Free Services, which return non-protected data only, and never requests, processes or stores owner information. Do not try to use it to obtain protected data. You are responsible for how you process the data you obtain, including any data protection rules that apply to you.

**No warranty and limitation of liability.** The service is provided "as is" and "as available", without warranties of any kind. Uninterrupted availability of the Cadastre electronic office is not guaranteed. The accuracy, completeness and timeliness of the information, which is what the Cadastre publishes, are not guaranteed. The data has no legal value and does not replace the official cadastral certificate. No liability is accepted for damages arising from its use, including sale, financial or tax decisions. A search with no results does not mean the property does not exist.

**Fair use.** The Cadastre infrastructure does not tolerate abuse and may temporarily or permanently block IPs that perform denial-of-service attacks or mass scraping. Do not use the Actor for mass scraping or to sweep the whole street directory, limit your concurrency and reuse results on your side. The Actor applies timeouts and bounded retries with exponential backoff, but it does not limit requests per client. Access may be suspended for abusive use.

**What the fee covers.** If the Actor is monetized, the price pays only for the technical transformation, JSON format, availability, latency and documentation of the service. Cadastral information remains public and its source is the Cadastre.
