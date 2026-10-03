# Local execution and debugging

Requirements: Node.js ≥ 22 and `npm install`. The Apify CLI is optional (`npm i -g apify-cli` or `npx apify-cli …`). Docker is only needed for option 3.

## Environment variables

| Variable | Default | Description |
|----------|-------------|-------------|
| `ACTOR_STANDBY_PORT` | `3000` | HTTP port |
| `CATASTRO_ENDPOINT` | official endpoint | Useful to point to a mock |
| `CATASTRO_COORDINATES_ENDPOINT` | official endpoint | Coordinates service (`OVCCoordenadas.asmx`); useful to point to a mock |
| `CATASTRO_TIMEOUT_MS` | `5000` | Timeout per attempt |
| `CATASTRO_RETRY_ATTEMPTS` / `_BASE_MS` / `_MAX_MS` / `_BUDGET_MS` | `3` / `200` / `1000` / `10000` | Retries with backoff |
| `CATASTRO_USE_PROXY` | `false` | `true` uses the Apify proxy (requires an `apify login` session) |

## 1. Without Docker (recommended for debugging)

```bash
npm install
ACTOR_STANDBY_PORT=3000 npm start
# or, with the simulated Apify environment:
ACTOR_STANDBY_PORT=3000 apify run
```

Try it (expected results are listed below the commands so they can be pasted into zsh):

```bash
curl -i -H 'x-apify-container-server-readiness-probe: 1' localhost:3000/
curl localhost:3000/properties/9872023VH5797S0001WX
curl localhost:3000/properties/1853111VK4715D
curl -i localhost:3000/properties/9872023VH5797T
curl -i localhost:3000/properties/ABC
curl localhost:3000/provinces
curl "localhost:3000/municipalities?province=MADRID&municipality=alcala"
curl "localhost:3000/streets?province=MADRID&municipality=MADRID&streetType=CL&streetName=SERRANO"
curl "localhost:3000/street-numbers?province=MADRID&municipality=MADRID&streetType=CL&streetName=SERRANO&number=30"
curl "localhost:3000/properties?province=MADRID&municipality=MADRID&streetType=CL&streetName=SERRANO&number=30"
curl "localhost:3000/properties?province=CIUDAD%20REAL&municipality=SANTA%20CRUZ%20DE%20MUDELA&polygon=1&parcel=1"
curl "localhost:3000/coordinates/reference?longitude=-3.70720&latitude=40.41446"
curl "localhost:3000/coordinates/reference?longitude=-3.70720&latitude=40.41446&srs=EPSG:4258"
curl -i "localhost:3000/coordinates/reference?longitude=40.4&latitude=-3.7"
curl localhost:3000/openapi.json
```

The first five commands return: 200 (health), 200 (property), 200 (parcel with 11 properties), 404 `PROPERTY_NOT_FOUND` and 400 `INVALID_CADASTRAL_REFERENCE`.

The coordinate commands return: 200 `0142208VK4704A`, 200 (same reference with `EPSG:4258`) and 404 `COORDINATE_NOT_FOUND` (longitude and latitude swapped). Longitude comes first, latitude second, both in decimal degrees with a dot. A point in the middle of a street belongs to no parcel and also returns 404; use a point inside a building or plot. Pass the returned `reference` to `/properties/{reference}`.

Street names must match the Cadastre's own, which uses abbreviations and its own street types. Example: "Doutor Carlos Colmeiro Laforet" in Vigo is registered as `RU` + `DR CARLOS COLMEIRO LAFORE`. To find the exact name, search first by a fragment and without a street type:

```bash
curl "localhost:3000/streets?province=PONTEVEDRA&municipality=VIGO&streetName=COLMEIRO"
curl "localhost:3000/properties?province=PONTEVEDRA&municipality=VIGO&streetType=RU&streetName=DR%20CARLOS%20COLMEIRO%20LAFORE&number=12"
```

### Interactive documentation (Swagger UI)

With the server running, open in the browser:

```bash
open http://localhost:3000/docs
```

- It lists every endpoint with its parameters, examples and errors; the **Try it out** button sends real requests to `localhost:3000` (and therefore to the Cadastre).
- The raw OpenAPI document is at `http://localhost:3000/openapi.json`; import it into Postman, Insomnia, etc.
- It works offline: assets come from the `swagger-ui-dist` package (no CDN).
- After changing routes, run `npm run generate:openapi` to refresh `.actor/openapi.json` (used by the Apify Console **Endpoints** tab); a test fails if it is stale.
- The OpenAPI document is hand-written from the route table `src/presentation/docs/routes.ts`, which also drives the router. If you change routes or parameters, edit that table and the docs stay in sync.

### Debugger (VS Code)

Add this configuration to `.vscode/launch.json` and set breakpoints in `src/**`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Actor (tsx)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx", "src/main.ts"],
      "env": { "ACTOR_STANDBY_PORT": "3000" },
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

Command-line alternative: `node --inspect --import tsx src/main.ts` and attach Chrome DevTools (`chrome://inspect`) or VS Code.

### Debugging with tests (no network)

```bash
npm test
npx vitest run tests/acceptance
npx vitest
npx vitest run -t "US2-S2"
npm run test:coverage
```

Tests never call the real Cadastre: MSW intercepts requests and answers with the XML files in `tests/fixtures/soap/`. To see the real XML, use `curl` against the SOAP endpoint described in `specs/000-property-by-cadastral-ref/contracts/cadastre-soap.md` (cadastral reference) or the GET binding in `specs/001-catastro-full-api-openapi-docs/contracts/cadastre-get.md` (all other operations).

### Pre-flight checks

```bash
npm run lint && npm run typecheck && npm run build
```

## 2. Compiled (as in production)

```bash
npm run build
ACTOR_STANDBY_PORT=3000 npm run start:prod
```

## 3. With Docker

Official Apify image, multi-stage, runs `node dist/main.js`:

```bash
docker build -t catastro-rest-api .
docker run --rm -p 3000:3000 -e ACTOR_STANDBY_PORT=3000 catastro-rest-api
```

With the Node inspector port exposed:

```bash
docker run --rm -p 3000:3000 -p 9229:9229 -e ACTOR_STANDBY_PORT=3000 \
  -e NODE_OPTIONS="--inspect=0.0.0.0:9229" catastro-rest-api
```

Attach the debugger to `localhost:9229` (in VS Code: an `attach` configuration with `"port": 9229`; compiled sources are in `dist/` with source maps).

> The image could not be built or tested in the environment where this guide was written (Docker was not running); if it fails, open an issue with the `docker build` output.

## Troubleshooting

- **`EADDRINUSE`**: change `ACTOR_STANDBY_PORT` or stop the process holding the port (`lsof -nP -iTCP:3000 -sTCP:LISTEN`).
- **504 `CADASTRE_TIMEOUT`**: raise `CATASTRO_TIMEOUT_MS`; the Cadastre is sometimes slow.
- **CLI telemetry**: `export APIFY_CLI_DISABLE_TELEMETRY=1`.
- **404 on a street search**: check the exact Cadastre street type and name (see above).
