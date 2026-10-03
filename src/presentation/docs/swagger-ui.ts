import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const ASSET_PREFIX = '/docs/assets/';

const CONTENT_TYPES: Readonly<Record<string, string>> = {
    'swagger-ui.css': 'text/css; charset=utf-8',
    'swagger-ui-bundle.js': 'application/javascript; charset=utf-8',
    'favicon-32x32.png': 'image/png',
};

export const SWAGGER_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Catastro REST API</title>
<link rel="stylesheet" href="${ASSET_PREFIX}swagger-ui.css">
<link rel="icon" href="${ASSET_PREFIX}favicon-32x32.png">
</head>
<body>
<div id="swagger-ui"></div>
<script src="${ASSET_PREFIX}swagger-ui-bundle.js"></script>
<script src="${ASSET_PREFIX}init.js"></script>
</body>
</html>
`;

const INIT_JS = `window.ui = SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', deepLinking: true });\n`;

export interface Asset {
    readonly contentType: string;
    readonly body: Buffer | string;
}

const cache = new Map<string, Asset>();

const distDir = (): string => dirname(createRequire(import.meta.url).resolve('swagger-ui-dist/package.json'));

/** Serves only an allowlisted set of Swagger UI files; any other name returns null. */
export const getDocsAsset = (pathname: string): Asset | null => {
    if (!pathname.startsWith(ASSET_PREFIX)) return null;
    const name = pathname.slice(ASSET_PREFIX.length);
    if (name === 'init.js') return { contentType: 'application/javascript; charset=utf-8', body: INIT_JS };
    const contentType = CONTENT_TYPES[name];
    if (!contentType) return null;
    const cached = cache.get(name);
    if (cached) return cached;
    const asset = { contentType, body: readFileSync(join(distDir(), name)) };
    cache.set(name, asset);
    return asset;
};
