# Quickstart: SPEC-000

> Describes the target behavior once `/speckit.implement` has run.

```bash
npm install
npm test                    # unit + integration (MSW) + acceptance
apify run                   # local Standby Actor
```

```bash
# readiness probe
curl -i -H 'x-apify-container-server-readiness-probe: 1' http://localhost:$ACTOR_STANDBY_PORT/

# lookup
curl http://localhost:$ACTOR_STANDBY_PORT/properties/9872023VH5797S0001WX

# malformed -> 400
curl -i http://localhost:$ACTOR_STANDBY_PORT/properties/ABC
```

Expected: success returns JSON per `contracts/rest-api.openapi.yaml`; malformed returns a 400 error body with `code: INVALID_CADASTRAL_REFERENCE` and no upstream call.
