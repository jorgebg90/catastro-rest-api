# Quickstart: Cadastral Reference by Coordinates (SPEC-002)

```bash
npm test                      # unit + integration + acceptance
npm run generate:openapi      # refresh .actor/openapi.json after route changes
npx apify-cli run             # live check (APIFY_CLI_DISABLE_TELEMETRY=1)
```

Manual checks (Standby on `http://localhost:3000`):

```bash
curl "http://localhost:3000/coordinates/reference?longitude=-3.70720&latitude=40.41446"
# 200 -> 0142208VK4704A

curl "http://localhost:3000/coordinates/reference?longitude=-3.70720&latitude=40.41446&srs=EPSG:4258"
# 200 -> same reference

curl "http://localhost:3000/coordinates/reference?longitude=40.4&latitude=-3.7"
# 404 COORDINATE_NOT_FOUND

curl "http://localhost:3000/coordinates/reference?longitude=abc&latitude=40"
# 400 INVALID_PARAMETER

curl "http://localhost:3000/coordinates/reference?longitude=-3.7&latitude=40.4&srs=EPSG:25830"
# 400 INVALID_PARAMETER (unsupported srs)
```

Chain: take `reference` from the response and call `GET /properties/{reference}`.
