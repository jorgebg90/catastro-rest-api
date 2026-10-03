import type { AddressInfo } from 'node:net';

import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../src/presentation/apify/composition-root.js';
import { buildOpenApiDocument } from '../../src/presentation/docs/openapi.js';
import { ROUTES } from '../../src/presentation/docs/routes.js';
import { CATASTRO_URL, getResponse } from '../mocks/handlers.js';
import { server as mswServer } from '../mocks/server.js';

let close: (() => Promise<void>) | undefined;
afterEach(async () => close?.());

const start = async (timeoutMs = 500) => {
    const server = buildServer({
        port: 0,
        endpoint: CATASTRO_URL,
        timeoutMs,
        retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 2, totalBudgetMs: 2000 },
    });
    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });
    close = async () =>
        new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
};

const getJson = async (base: string, path: string) => {
    const res = await fetch(`${base}${path}`);
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};

const LOC = 'province=MADRID&municipality=MADRID';
const STREET = `${LOC}&streetType=CL&streetName=SERRANO`;

describe('catalogue endpoints', () => {
    it('[001:US1-S1] GET /provinces', async () => {
        mswServer.use(getResponse('ConsultaProvincia', 'provinces.xml'));
        const r = await getJson(await start(), '/provinces');
        expect(r.status).toBe(200);
        expect((r.body.provinces as unknown[]).length).toBeGreaterThan(40);
    });

    it('[001:US1-S2] GET /municipalities accepts accented lowercase input', async () => {
        mswServer.use(getResponse('ConsultaMunicipio', 'municipalities.xml'));
        const r = await getJson(await start(), `/municipalities?province=madrid&municipality=${encodeURIComponent('alcalá')}`);
        expect(r.status).toBe(200);
        expect(r.body.municipalities).toHaveLength(2);
    });

    it('[001:US1-S3] GET /streets', async () => {
        mswServer.use(getResponse('ConsultaVia', 'streets.xml'));
        const r = await getJson(await start(), `/streets?${STREET}`);
        expect(r).toMatchObject({ status: 200, body: { streets: [{ code: '5757', type: 'CL', name: 'SERRANO' }] } });
    });

    it('[001:US1-S4] GET /street-numbers', async () => {
        mswServer.use(getResponse('ConsultaNumero', 'street-numbers.xml'));
        const r = await getJson(await start(), `/street-numbers?${STREET}&number=30`);
        expect(r).toMatchObject({ status: 200, body: { numbers: [{ number: '30', cadastralReference14: '1853111VK4715D' }] } });
    });

    it('[001:US1-S5] missing or invalid parameters give 400 without contacting the Cadastre', async () => {
        let calls = 0;
        mswServer.use(
            http.get(`${CATASTRO_URL}/:op`, () => {
                calls += 1;
                return new HttpResponse('');
            }),
        );
        const base = await start();
        const cases = ['/municipalities', '/streets?province=MADRID', `/street-numbers?${STREET}`, `/street-numbers?${STREET}&number=abc`];
        for (const path of cases) {
            const r = await getJson(base, path);
            expect(r.status, path).toBe(400);
            expect(['MISSING_PARAMETER', 'INVALID_PARAMETER']).toContain(r.body.code);
        }
        expect(calls).toBe(0);
    });

    it('[001:US1-S6] unknown province gives 404 with upstream details', async () => {
        mswServer.use(getResponse('ConsultaMunicipio', 'catalog-not-found.xml'));
        const r = await getJson(await start(), '/municipalities?province=ZZZZ');
        expect(r.status).toBe(404);
        expect(r.body).toMatchObject({ code: 'CATALOG_ENTRY_NOT_FOUND', upstream: { code: '12' } });
    });
});

describe('GET /properties', () => {
    it('[001:US2-S1] address search', async () => {
        mswServer.use(getResponse('Consulta_DNPLOC', 'dnploc-list.xml'));
        const r = await getJson(await start(), `/properties?${STREET}&number=30`);
        expect(r.status).toBe(200);
        expect(r.body.properties).toHaveLength(11);
    });

    it('[001:US2-S2] address narrowed to a unit', async () => {
        mswServer.use(getResponse('Consulta_DNPLOC', 'dnploc-single.xml'));
        const r = await getJson(await start(), `/properties?${STREET}&number=51&floor=00&door=01`);
        expect(r.status).toBe(200);
        expect(r.body.properties).toMatchObject([{ reference: '9872023VH5797S0001WX', propertyClass: 'URBAN' }]);
    });

    it('[001:US2-S3] polygon and parcel search', async () => {
        mswServer.use(getResponse('Consulta_DNPPP', 'dnppp-list.xml'));
        const r = await getJson(await start(), `/properties?${LOC}&polygon=1&parcel=1`);
        expect(r.status).toBe(200);
        expect(r.body.properties).toHaveLength(4);
    });

    it('[001:US2-S4] incomplete, mixed or empty criteria give 400', async () => {
        const base = await start();
        const cases: [string, string][] = [
            [`/properties?${LOC}&streetType=CL&streetName=SERRANO`, 'MISSING_PARAMETER'],
            [`/properties?${LOC}&polygon=1`, 'MISSING_PARAMETER'],
            [`/properties?${LOC}&streetType=CL&streetName=SERRANO&number=1&polygon=1&parcel=1`, 'AMBIGUOUS_QUERY'],
            ['/properties', 'MISSING_PARAMETER'],
            [`/properties?${LOC}`, 'MISSING_PARAMETER'],
        ];
        for (const [path, code] of cases) {
            const r = await getJson(base, path);
            expect([path, r.status, r.body.code]).toEqual([path, 400, code]);
        }
    });

    it('[001:US2-S5] no match gives 404 PROPERTY_NOT_FOUND', async () => {
        mswServer.use(getResponse('Consulta_DNPLOC', 'dnploc-not-found.xml'));
        const r = await getJson(await start(), `/properties?${STREET}&number=1`);
        expect(r.status).toBe(404);
        expect(r.body).toMatchObject({ code: 'PROPERTY_NOT_FOUND', upstream: { code: '33' } });
    });
});

describe('error consistency across endpoints', () => {
    const endpoints = [
        ['ConsultaProvincia', '/provinces'],
        ['ConsultaMunicipio', '/municipalities?province=MADRID'],
        ['ConsultaVia', `/streets?${LOC}`],
        ['ConsultaNumero', `/street-numbers?${STREET}&number=30`],
        ['Consulta_DNPLOC', `/properties?${STREET}&number=30`],
        ['Consulta_DNPPP', `/properties?${LOC}&polygon=1&parcel=1`],
    ] as const;

    it.each(endpoints)('[001:US3-S1] %s: upstream 5xx gives 502 CADASTRE_UNAVAILABLE', async (op, path) => {
        mswServer.use(http.get(`${CATASTRO_URL}/${op}`, () => new HttpResponse('down', { status: 503 })));
        const r = await getJson(await start(), path);
        expect([r.status, r.body.code]).toEqual([502, 'CADASTRE_UNAVAILABLE']);
    });

    it.each(endpoints)('[001:US3-S1] %s: slow upstream gives 504 CADASTRE_TIMEOUT', async (op, path) => {
        mswServer.use(
            http.get(`${CATASTRO_URL}/${op}`, async () => {
                await new Promise((resolve) => {
                    setTimeout(resolve, 200);
                });
                return new HttpResponse('late');
            }),
        );
        const r = await getJson(await start(20), path);
        expect([r.status, r.body.code]).toEqual([504, 'CADASTRE_TIMEOUT']);
    });
});

describe('documentation endpoints', () => {
    it('[001:US4-S1] GET /docs serves Swagger UI locally with its assets', async () => {
        const base = await start();
        const res = await fetch(`${base}/docs`);
        const body = await res.text();
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        expect(body).not.toMatch(/https?:\/\//);
        const css = await fetch(`${base}/docs/assets/swagger-ui.css`);
        expect([css.status, css.headers.get('content-type')]).toEqual([200, 'text/css; charset=utf-8']);
        const bundle = await fetch(`${base}/docs/assets/swagger-ui-bundle.js`);
        expect(bundle.status).toBe(200);
        expect(await (await fetch(`${base}/docs/assets/init.js`)).text()).toContain('/openapi.json');
    });

    it('[001:US4-S1] only allowlisted docs assets are served', async () => {
        const base = await start();
        for (const path of ['/docs/assets/package.json', '/docs/assets/..%2f..%2fpackage.json', '/docs/assets/swagger-ui-bundle.js.map']) {
            const res = await fetch(`${base}${path}`);
            expect(res.status, path).toBe(404);
        }
    });

    it('[001:US4-S2] GET /openapi.json serves OpenAPI 3', async () => {
        const r = await getJson(await start(), '/openapi.json');
        expect(r.status).toBe(200);
        expect(r.body.openapi).toMatch(/^3\.0\./);
        expect(Object.keys(r.body.paths as object)).toContain('/properties/{reference}');
    });

    it('[001:US4-S3] every documented path is served by the router', async () => {
        const base = await start();
        const doc = buildOpenApiDocument() as { paths: Record<string, unknown> };
        for (const path of Object.keys(doc.paths)) {
            const res = await fetch(`${base}${path.replace('{reference}', 'X')}`);
            const body = await res.text();
            expect(body.includes('ROUTE_NOT_FOUND'), path).toBe(false);
        }
        expect(Object.keys(doc.paths)).toHaveLength(new Set(ROUTES.map((r) => r.path)).size);
    });

    it('[001:US4-S4] readiness probe and root keep working and the root points to the docs', async () => {
        const base = await start();
        const probe = await fetch(`${base}/docs`, { headers: { 'x-apify-container-server-readiness-probe': '1' } });
        expect([probe.status, await probe.text()]).toEqual([200, 'ok']);
        const root = await getJson(base, '/');
        expect(root).toMatchObject({ status: 200, body: { status: 'ok', docs: '/docs' } });
    });

    it('[001:US4-S4] docs do not expose environment values or proxy URLs', async () => {
        process.env.CATASTRO_PROXY_SECRET = 'super-secret-proxy-value';
        const base = await start();
        const bodies = await Promise.all([fetch(`${base}/docs`), fetch(`${base}/openapi.json`)].map(async (p) => (await p).text()));
        delete process.env.CATASTRO_PROXY_SECRET;
        for (const body of bodies) {
            expect(body).not.toContain('super-secret-proxy-value');
            expect(body).not.toMatch(/proxy\.apify|password|127\.0\.0\.1/i);
        }
    });
});
