import type { AddressInfo } from 'node:net';

import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../src/presentation/apify/composition-root.js';
import { createHttpServer } from '../../src/presentation/apify/server.js';
import { CATASTRO_URL, soapResponse } from '../mocks/handlers.js';
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

const get = async (base: string, ref: string) => {
    const res = await fetch(`${base}/properties/${ref}`);
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};

describe('GET /properties/{reference}', () => {
    it('US3-S2: 200 with the property', async () => {
        mswServer.use(soapResponse('property-found.xml'));
        const r = await get(await start(), '9872023vh5797s0001wx');
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ reference: '9872023VH5797S0001WX' });
        expect(r.body.properties).toHaveLength(1);
    });

    it('US2-S1: 400 for a malformed reference without calling the Cadastre', async () => {
        const r = await get(await start(), '123');
        expect(r.status).toBe(400);
        expect(r.body).toMatchObject({ code: 'INVALID_CADASTRAL_REFERENCE' });
    });

    it('US2-S1: 400 for an undecodable path', async () => {
        const r = await get(await start(), '%E0%A4%A');
        expect(r.status).toBe(400);
    });

    it('US2-S2: 404 with upstream details', async () => {
        mswServer.use(soapResponse('not-found.xml'));
        const r = await get(await start(), '9872023VH5797T');
        expect(r.status).toBe(404);
        expect(r.body).toMatchObject({ code: 'PROPERTY_NOT_FOUND', upstream: { code: '5' } });
    });

    it('US2-S3: 502 when the Cadastre keeps failing', async () => {
        mswServer.use(http.post(CATASTRO_URL, () => new HttpResponse('x', { status: 500 })));
        const r = await get(await start(), '9872023VH5797T');
        expect(r.status).toBe(502);
        expect(r.body).toMatchObject({ code: 'CADASTRE_UNAVAILABLE' });
    });

    it('US2-S3: 504 when the Cadastre is too slow', async () => {
        mswServer.use(
            http.post(CATASTRO_URL, async () => {
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, 300);
                });
                return new HttpResponse('x');
            }),
        );
        const r = await get(await start(30), '9872023VH5797T');
        expect(r.status).toBe(504);
    });

    it('502 for an unparseable payload', async () => {
        mswServer.use(http.post(CATASTRO_URL, () => new HttpResponse('<html>')));
        const r = await get(await start(), '9872023VH5797T');
        expect(r.status).toBe(502);
        expect(r.body).toMatchObject({ code: 'CADASTRE_PROTOCOL_ERROR' });
    });

    it('500 INTERNAL_ERROR when the use case throws unexpectedly', async () => {
        const unused = { execute: async () => Promise.reject(new Error('unused')) };
        const server = createHttpServer({
            useCase: { execute: async () => Promise.reject(new Error('boom')) },
            provinces: unused,
            municipalities: unused,
            streets: unused,
            streetNumbers: unused,
            searchByAddress: unused,
            searchByParcel: unused,
            logger: { info: () => undefined, error: () => undefined },
        });
        await new Promise<void>((resolve) => {
            server.listen(0, '127.0.0.1', resolve);
        });
        close = async () =>
            new Promise<void>((resolve) => {
                server.close(() => resolve());
            });
        const r = await get(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, '9872023VH5797T');
        expect(r.status).toBe(500);
        expect(r.body).toEqual({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    });
});
