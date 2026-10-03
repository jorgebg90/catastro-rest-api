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
curl localhost:3000/provinces
curl "localhost:3000/municipalities?province=MADRID&municipality=alcala"
curl "localhost:3000/streets?province=MADRID&municipality=MADRID&streetType=CL&streetName=SERRANO"
curl "localhost:3000/street-numbers?province=MADRID&municipality=MADRID&streetType=CL&streetName=SERRANO&number=30"
curl "localhost:3000/properties?province=MADRID&municipality=MADRID&streetType=CL&streetName=SERRANO&number=30"
curl "localhost:3000/properties?province=CIUDAD%20REAL&municipality=SANTA%20CRUZ%20DE%20MUDELA&polygon=1&parcel=1"
curl localhost:3000/openapi.json
```

Respuestas: 200, 200 (inmueble), 200 (parcela con 11 inmuebles), 404 `PROPERTY_NOT_FOUND` y 400 `INVALID_CADASTRAL_REFERENCE`.

### Documentación interactiva (Swagger UI)

Con el servidor arrancado, abre en el navegador:

```bash
open http://localhost:3000/docs
```

- Lista todos los endpoints con sus parámetros, ejemplos y errores; el botón **Try it out** lanza peticiones reales contra `localhost:3000` (y por tanto contra el Catastro).
- El documento OpenAPI en bruto está en `http://localhost:3000/openapi.json`; sirve para importarlo en Postman, Insomnia, etc.
- Funciona sin internet: los assets salen del paquete `swagger-ui-dist` (sin CDN).
- Si modificas rutas o parámetros, edita la tabla `src/presentation/docs/routes.ts`: de ella salen tanto el router como el OpenAPI, así que la documentación no se desincroniza.

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

Los tests no llaman al Catastro real: MSW intercepta las peticiones con los XML de `tests/fixtures/soap/`. Para ver el XML real: `curl` al endpoint SOAP descrito en `specs/000-property-by-cadastral-ref/contracts/cadastre-soap.md` (referencia catastral) o al binding GET de `specs/001-catastro-full-api-openapi-docs/contracts/cadastre-get.md` (resto de operaciones).

La documentación interactiva (Swagger UI, con "Try it out") está en `http://localhost:3000/docs`; lee el OpenAPI de `/openapi.json`, que se genera a mano desde la tabla de rutas `src/presentation/docs/routes.ts`. Los assets de Swagger UI salen del paquete `swagger-ui-dist`, sin CDN.

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
