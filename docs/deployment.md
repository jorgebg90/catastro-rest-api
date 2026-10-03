# Quick guide: despliegue en Apify

El Actor corre en **Standby mode** (`usesStandbyMode: true` en `.actor/actor.json`): Apify mantiene el contenedor activo y reenvía las peticiones HTTP.

## 1. Preparación

```bash
npm install -g apify-cli
apify login
npm run lint && npm run typecheck && npm test && npm run build
apify validate-schema
```

## 2. Desplegar

```bash
apify push
```

Esto sube el código y construye la imagen con el `Dockerfile` (`apify/actor-node:24`, `npm run build`, `node dist/main.js`). El Actor queda en tu cuenta con el nombre `catastro-rest-api`.

## 3. Configurar en Apify Console

1. **Actor → Settings → Standby**: activa *Standby mode*. Ajusta *Max requests per run* / *Desired requests per run* y *Idle timeout* según tráfico (empieza con los valores por defecto).
2. **Actor → Settings → Environment variables**: añade
   - `CATASTRO_USE_PROXY=true` (evita el rate-limit por IP del Catastro; usa tu plan de proxy de Apify),
   - opcional: `CATASTRO_TIMEOUT_MS`, `CATASTRO_RETRY_*`.
   El puerto lo inyecta la plataforma (`ACTOR_STANDBY_PORT`).
3. Marca las variables sensibles como *secret*. No pongas tokens en el código ni en logs.

## 4. Probar

URL Standby: `https://<usuario>--catastro-rest-api.apify.actor`

```bash
curl -H "Authorization: Bearer $APIFY_TOKEN" \
  https://<usuario>--catastro-rest-api.apify.actor/properties/9872023VH5797S0001WX
```

Documentación HTML de la API desplegada: `https://<usuario>--catastro-rest-api.apify.actor/docs` (JSON OpenAPI en `/openapi.json`; usa el mismo token que arriba).

(O añade `?token=<TOKEN>`.) Comprueba también el 404 con `9872023VH5797T` y el 400 con `ABC`, y revisa los logs en la pestaña *Runs/Logs*.

## 5. Actualizaciones

Cada `apify push` genera un nuevo build (`latest`). Para versiones fijas, define `version` y `buildTag` en `.actor/actor.json`. Si cambia el contrato HTTP, actualiza antes `specs/` y `contracts/rest-api.openapi.yaml`.

## 6. Publicar en el Store (opcional)

Rellena la ficha en Console (descripción, categoría, imagen). El `README.md` se usa como landing page.

## Checklist

- [ ] `apify validate-schema` OK y tests en verde
- [ ] `apify push` terminado y build correcto
- [ ] Standby activado; `CATASTRO_USE_PROXY=true`
- [ ] Probados 200 / 404 / 400 contra la URL Standby
