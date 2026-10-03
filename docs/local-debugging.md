# Ejecución local y debugging

Requisitos: Node.js ≥ 22 y `npm install`. El CLI de Apify es opcional (`npm i -g apify-cli` o `npx apify-cli …`). Docker sólo hace falta para la opción 3.

## Variables de entorno

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `ACTOR_STANDBY_PORT` | `3000` | Puerto HTTP |
| `CATASTRO_ENDPOINT` | endpoint oficial | Útil para apuntar a un mock |
| `CATASTRO_TIMEOUT_MS` | `5000` | Timeout por intento |
| `CATASTRO_RETRY_ATTEMPTS` / `_BASE_MS` / `_MAX_MS` / `_BUDGET_MS` | `3` / `200` / `1000` / `10000` | Reintentos con backoff |
| `CATASTRO_USE_PROXY` | `false` | `true` usa el proxy de Apify (requiere sesión `apify login`) |

## 1. Sin Docker (recomendado para debugging)

```bash
npm install
ACTOR_STANDBY_PORT=3000 npm start
# o, con el entorno simulado de Apify:
ACTOR_STANDBY_PORT=3000 apify run
```

Probar (resultado esperado entre paréntesis, fuera de los comandos para que se puedan pegar en zsh):

```bash
curl -i -H 'x-apify-container-server-readiness-probe: 1' localhost:3000/
curl localhost:3000/properties/9872023VH5797S0001WX
curl localhost:3000/properties/1853111VK4715D
curl -i localhost:3000/properties/9872023VH5797T
curl -i localhost:3000/properties/ABC
```

Respuestas: 200, 200 (inmueble), 200 (parcela con 11 inmuebles), 404 `PROPERTY_NOT_FOUND` y 400 `INVALID_CADASTRAL_REFERENCE`.

### Debugger (VS Code)

Añade esta configuración a `.vscode/launch.json` y pon breakpoints en `src/**`:

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

Alternativa por línea de comandos: `node --inspect --import tsx src/main.ts` y adjunta Chrome DevTools (`chrome://inspect`) o VS Code.

### Debugging con tests (sin red)

```bash
npm test
npx vitest run tests/acceptance
npx vitest
npx vitest run -t "US2-S2"
npm run test:coverage
```

Los tests no llaman al Catastro real: MSW intercepta las peticiones con los XML de `tests/fixtures/soap/`. Para ver el XML real: `curl` al endpoint SOAP descrito en `specs/000-property-by-cadastral-ref/contracts/cadastre-soap.md`.

### Comprobaciones previas

```bash
npm run lint && npm run typecheck && npm run build
```

## 2. Compilado (como en producción)

```bash
npm run build
ACTOR_STANDBY_PORT=3000 npm run start:prod
```

## 3. Con Docker

Imagen oficial de Apify, multi-stage, ejecuta `node dist/main.js`:

```bash
docker build -t catastro-rest-api .
docker run --rm -p 3000:3000 -e ACTOR_STANDBY_PORT=3000 catastro-rest-api
```

Con logs de depuración de Node y puerto inspector:

```bash
docker run --rm -p 3000:3000 -p 9229:9229 -e ACTOR_STANDBY_PORT=3000 \
  -e NODE_OPTIONS="--inspect=0.0.0.0:9229" catastro-rest-api
```

Adjunta el debugger a `localhost:9229` (en VS Code: configuración `attach` con `"port": 9229`; las fuentes compiladas están en `dist/` con source maps).

> La imagen no se ha podido construir/probar en el entorno donde se escribió esta guía (Docker no estaba en marcha); si falla, abre una incidencia con la salida de `docker build`.

## Problemas frecuentes

- **`EADDRINUSE`**: cambia `ACTOR_STANDBY_PORT`.
- **504 `CADASTRE_TIMEOUT`**: sube `CATASTRO_TIMEOUT_MS`; el Catastro a veces es lento.
- **Telemetría del CLI**: `export APIFY_CLI_DISABLE_TELEMETRY=1`.
