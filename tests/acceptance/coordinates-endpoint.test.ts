import type { AddressInfo } from 'node:net';

import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../src/presentation/apify/composition-root.js';
import type { buildOpenApiDocument } from '../../src/presentation/docs/openapi.js';
import { CATASTRO_COORDINATES_URL, CATASTRO_URL, coordinatesResponse, loadFixture, soapResponse } from '../mocks/handlers.js';
import { server as mswServer } from '../mocks/server.js';

let close: (() => Promise<void>) | undefined;
afterEach(async () => close?.());

const start = async (timeoutMs = 500) => {
    const server = buildServer({
        port: 0,
        endpoint: CATASTRO_URL,
        coordinatesEndpoint: CATASTRO_COORDINATES_URL,
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

const PATH = '/coordinates/reference';
const FOUND = `${PATH}?longitude=-3.70720&latitude=40.41446`;

describe('GET /coordinates/reference - US1', () => {
    it('[002:US1-S1] returns the parcel reference and address', async () => {
        mswServer.use(coordinatesResponse({ srs: 'EPSG:4326', x: '-3.7072', y: '40.41446' }, 'coordinates-found.xml'));
        const r = await getJson(await start(), FOUND);
        expect(r.status).toBe(200);
        expect(r.body).toEqual({
            reference: '0142208VK4704A',
            parcel: '0142208',
            sheet: 'VK4704A',
            address: 'CL IMPERIAL 14 MADRID (MADRID)',
            coordinate: { longitude: -3.7072, latitude: 40.41446, srs: 'EPSG:4326' },
        });
    });

    it('[002:US1-S2] 404 COORDINATE_NOT_FOUND with upstream details when no parcel is at the point', async () => {
        mswServer.use(coordinatesResponse({}, 'coordinates-not-found.xml'));
        const r = await getJson(await start(), `${PATH}?longitude=40.4&latitude=-3.7`);
        expect(r.status).toBe(404);
        expect(r.body.code).toBe('COORDINATE_NOT_FOUND');
        expect(r.body.upstream).toMatchObject({ code: '16' });
    });

    it('[002:US1-S3] defaults the reference system to EPSG:4326', async () => {
        let received: string | null = null;
        mswServer.use(
            http.get(`${CATASTRO_COORDINATES_URL}/Consulta_RCCOOR`, ({ request }) => {
                received = new URL(request.url).searchParams.get('SRS');
                return new HttpResponse(loadFixture('coordinates-found.xml'), { headers: { 'Content-Type': 'text/xml' } });
            }),
        );
        await getJson(await start(), FOUND);
        expect(received).toBe('EPSG:4326');
    });

    it('[002:US1-S4] the returned reference can be used with GET /properties/{reference}', async () => {
        mswServer.use(coordinatesResponse({}, 'coordinates-found.xml'), soapResponse('parcel-found.xml'));
        const base = await start();
        const first = await getJson(base, FOUND);
        const second = await getJson(base, `/properties/${String(first.body.reference)}`);
        expect([first.status, second.status]).toEqual([200, 200]);
        expect(second.body.reference).toBe(first.body.reference);
    });
});

describe('GET /coordinates/reference - US2 reference system', () => {
    it('[002:US2-S1] EPSG:4258 returns the same reference as EPSG:4326', async () => {
        mswServer.use(coordinatesResponse({ srs: 'EPSG:4258' }, 'coordinates-found-4258.xml'));
        const r = await getJson(await start(), `${FOUND}&srs=epsg:4258`);
        expect(r.status).toBe(200);
        expect(r.body.reference).toBe('0142208VK4704A');
    });

    it.each(['EPSG:25830', 'EPSG:3857', 'EPSG:4230', 'garbage'])('[002:US2-S2] unsupported srs %s gives 400 without calling the Cadastre', async (srs) => {
        let calls = 0;
        mswServer.use(
            http.get(`${CATASTRO_COORDINATES_URL}/*`, () => {
                calls += 1;
                return new HttpResponse('unexpected', { status: 500 });
            }),
        );
        const r = await getJson(await start(), `${FOUND}&srs=${encodeURIComponent(srs)}`);
        expect([r.status, r.body.code]).toEqual([400, 'INVALID_PARAMETER']);
        expect(String(r.body.message)).toContain('EPSG:4326');
        expect(calls).toBe(0);
    });
});

describe('GET /coordinates/reference - US3 validation and failures', () => {
    it.each([
        ['both missing', PATH],
        ['longitude missing', `${PATH}?latitude=40.4`],
        ['latitude missing', `${PATH}?longitude=-3.7`],
        ['longitude empty', `${PATH}?longitude=&latitude=40.4`],
    ])('[002:US3-S1] %s gives 400 MISSING_PARAMETER', async (_name, path) => {
        const r = await getJson(await start(), path);
        expect([r.status, r.body.code]).toEqual([400, 'MISSING_PARAMETER']);
    });

    it.each([
        ['non-numeric', 'longitude=abc&latitude=40'],
        ['comma decimal', 'longitude=-3,7&latitude=40'],
        ['hex', 'longitude=0x10&latitude=40'],
        ['infinity', 'longitude=Infinity&latitude=40'],
        ['longitude too large', 'longitude=181&latitude=40'],
        ['longitude too small', 'longitude=-180.1&latitude=40'],
        ['latitude too large', 'longitude=-3&latitude=90.5'],
        ['latitude too small', 'longitude=-3&latitude=-91'],
    ])('[002:US3-S2] %s gives 400 INVALID_PARAMETER without calling the Cadastre', async (_name, query) => {
        let calls = 0;
        mswServer.use(
            http.get(`${CATASTRO_COORDINATES_URL}/*`, () => {
                calls += 1;
                return new HttpResponse('unexpected', { status: 500 });
            }),
        );
        const r = await getJson(await start(), `${PATH}?${query}`);
        expect([r.status, r.body.code]).toEqual([400, 'INVALID_PARAMETER']);
        expect(calls).toBe(0);
    });

    it('[002:US3-S2] scientific notation is accepted when finite and in range', async () => {
        mswServer.use(coordinatesResponse({}, 'coordinates-found.xml'));
        const r = await getJson(await start(), `${PATH}?longitude=-3.7072e0&latitude=4.041446E1`);
        expect(r.status).toBe(200);
    });

    it('[002:US3-S3] upstream 5xx gives 502 CADASTRE_UNAVAILABLE', async () => {
        mswServer.use(http.get(`${CATASTRO_COORDINATES_URL}/*`, () => new HttpResponse('down', { status: 503 })));
        const r = await getJson(await start(), FOUND);
        expect([r.status, r.body.code]).toEqual([502, 'CADASTRE_UNAVAILABLE']);
    });

    it('[002:US3-S3] slow upstream gives 504 CADASTRE_TIMEOUT', async () => {
        mswServer.use(
            http.get(`${CATASTRO_COORDINATES_URL}/*`, async () => {
                await new Promise((resolve) => {
                    setTimeout(resolve, 200);
                });
                return new HttpResponse('late');
            }),
        );
        const r = await getJson(await start(20), FOUND);
        expect([r.status, r.body.code]).toEqual([504, 'CADASTRE_TIMEOUT']);
    });

    it('[002:US3-S3] an unexpected business error gives 502 CADASTRE_PROTOCOL_ERROR', async () => {
        mswServer.use(
            http.get(
                `${CATASTRO_COORDINATES_URL}/*`,
                () =>
                    new HttpResponse(
                        loadFixture('coordinates-not-found.xml').replace('<cod>16</cod>', '<cod>999</cod>').replace('NO HAY REFERENCIA DISPONIBLE', 'ERROR INTERNO'),
                        { headers: { 'Content-Type': 'text/xml' } },
                    ),
            ),
        );
        const r = await getJson(await start(), FOUND);
        expect([r.status, r.body.code]).toEqual([502, 'CADASTRE_PROTOCOL_ERROR']);
    });
});

describe('GET /coordinates/reference - US4 documentation', () => {
    it('[002:US4-S1] /openapi.json documents the endpoint with parameters, srs enum and error statuses', async () => {
        const r = await getJson(await start(), '/openapi.json');
        const doc = r.body as unknown as ReturnType<typeof buildOpenApiDocument>;
        const paths = doc.paths as Record<string, { get: { parameters: { name: string; required: boolean; schema: { enum?: string[]; default?: string } }[]; responses: Record<string, unknown> } }>;
        const op = paths['/coordinates/reference']?.get;
        expect(op).toBeDefined();
        const byName = Object.fromEntries((op?.parameters ?? []).map((p) => [p.name, p]));
        expect(byName.longitude?.required).toBe(true);
        expect(byName.latitude?.required).toBe(true);
        expect(byName.srs?.schema).toMatchObject({ enum: ['EPSG:4326', 'EPSG:4258'], default: 'EPSG:4326' });
        expect(Object.keys(op?.responses ?? {}).sort()).toEqual(['200', '400', '404', '502', '504']);
    });
});
