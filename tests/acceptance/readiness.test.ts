import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../src/presentation/apify/composition-root.js';

let close: (() => Promise<void>) | undefined;
afterEach(async () => close?.());

const start = async () => {
    const server = buildServer({ port: 0, endpoint: 'https://example.invalid', timeoutMs: 500 });
    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });
    close = async () =>
        new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
};

describe('Standby readiness (US3-S1)', () => {
    it('US3-S1: answers the readiness probe with 200', async () => {
        const base = await start();
        const res = await fetch(base, { headers: { 'x-apify-container-server-readiness-probe': '1' } });
        expect(res.status).toBe(200);
    });

    it('US3-S1: GET / answers 200', async () => {
        const base = await start();
        expect((await fetch(base)).status).toBe(200);
    });

    it('unknown routes answer 404 JSON', async () => {
        const base = await start();
        const res = await fetch(`${base}/nope`);
        expect(res.status).toBe(404);
    });
});
