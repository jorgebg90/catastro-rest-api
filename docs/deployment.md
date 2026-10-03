# Quick guide: deploying to Apify

The Actor runs in **Standby mode** (`usesStandbyMode: true` in `.actor/actor.json`): Apify keeps the container alive and forwards HTTP requests to it.

## 1. Preparation

Install the Apify CLI globally (`apify: command not found` means it is not installed yet):

```bash
npm install -g apify-cli
```

Or skip the installation and prefix every command in this guide with `npx apify-cli` (for example `npx apify-cli validate-schema`).

```bash
apify login
npm run lint && npm run typecheck && npm test && npm run build
apify validate-schema
```

## 2. Deploy

```bash
apify push
```

This uploads the code and builds the image from the `Dockerfile` (`apify/actor-node:24`, `npm run build`, `node dist/main.js`). The Actor is created in your account as `catastro-rest-api`.

## 2b. Automatic deploy from GitHub Actions

[`.github/workflows/deploy.yaml`](../.github/workflows/deploy.yaml) runs `apify push` whenever a PR is merged into `main` (the production branch; `develop` is the default branch and is never deployed). It can also be started manually from the *Actions* tab. Before pushing it runs lint, typecheck, tests, build and `validate-schema`.

One-time setup:

1. In Apify Console go to *Settings → API & Integrations* and copy your API token.
2. In GitHub go to *Settings → Environments*, create an environment named `production` and add the secret `APIFY_TOKEN` there. Optionally require reviewers on that environment for manual approval before each deploy.
3. In *Settings → Branches*, protect `main` (require a PR and the `CI` checks) so that only reviewed code reaches production.

Deploys are serialized (`concurrency`) so two merges never push at the same time.

## 3. Configure in Apify Console

1. **Actor → Settings → Standby**: enable *Standby mode*. Tune *Max requests per run*, *Desired requests per run* and *Idle timeout* to your traffic (start with the defaults).
2. **Actor → Settings → Environment variables**: add
   - `CATASTRO_USE_PROXY=true` (avoids the Cadastre's per-IP rate limiting; uses your Apify proxy plan),
   - optional: `CATASTRO_TIMEOUT_MS`, `CATASTRO_RETRY_*`.

   The port is injected by the platform (`ACTOR_STANDBY_PORT`).
3. Mark sensitive variables as *secret*. Never put tokens in code or logs.

## 4. Test

Standby URL: `https://<username>--catastro-rest-api.apify.actor`

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  https://<username>--catastro-rest-api.apify.actor/properties/9872023VH5797S0001WX
```

Alternatively append `?token=<TOKEN>`. Also check a 404 with `9872023VH5797T` and a 400 with `ABC`, and review the logs in the *Runs/Logs* tab.

The interactive API documentation (Swagger UI) is served at `https://<username>--catastro-rest-api.apify.actor/docs` and the OpenAPI JSON at `/openapi.json`; both need the same token.

## 5. Updates

Each `apify push` creates a new build (`latest`). For pinned versions, set `version` and `buildTag` in `.actor/actor.json`. If the HTTP contract changes, update `specs/` and `contracts/rest-api.openapi.yaml` first.

## 6. Publishing to the Store (optional)

Fill in the listing in Console (description, category, image). `README.md` is used as the landing page. Before publishing, review [legal-disclaimer.md](legal-disclaimer.md).

## Checklist

- [ ] `apify validate-schema` OK and tests green
- [ ] `apify push` finished and build succeeded
- [ ] Standby enabled; `CATASTRO_USE_PROXY=true`
- [ ] 200 / 404 / 400 verified against the Standby URL
