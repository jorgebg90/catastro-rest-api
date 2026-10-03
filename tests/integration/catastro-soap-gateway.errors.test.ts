import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
    CadastreProtocolError,
    CadastreTimeoutError,
    CadastreUnavailableError,
    InvalidCadastralReferenceError,
    PropertyNotFoundError,
} from '../../src/domain/errors/index.js';
import { CadastralReference } from '../../src/domain/value-objects/cadastral-reference.js';
import { CatastroSoapGateway } from '../../src/infrastructure/soap/catastro-soap-gateway.js';
import { CATASTRO_URL, loadFixture, soapResponse } from '../mocks/handlers.js';
import { server } from '../mocks/server.js';

const ref = (raw: string) => {
    const r = CadastralReference.from(raw);
    if (!r.ok) throw r.error;
    return r.value;
};
const gateway = (timeoutMs = 500) =>
    new CatastroSoapGateway({
        endpoint: CATASTRO_URL,
        timeoutMs,
        retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5, totalBudgetMs: 5000 },
    });
const R = '9872023VH5797T';

describe('CatastroSoapGateway error paths', () => {
    it('US2-S2: HTTP 200 + code 5 is PropertyNotFoundError', async () => {
        server.use(soapResponse('not-found.xml'));
        const r = await gateway().queryByReference(ref(R));
        expect(!r.ok && r.error).toBeInstanceOf(PropertyNotFoundError);
    });

    it('US2-S1: upstream code 4 is InvalidCadastralReferenceError', async () => {
        server.use(soapResponse('malformed-ref.xml'));
        const r = await gateway().queryByReference(ref('0000000AA0000A0001AA'));
        expect(!r.ok && r.error).toBeInstanceOf(InvalidCadastralReferenceError);
    });

    it('US2-S3: HTTP 500 then success is retried transparently', async () => {
        let calls = 0;
        server.use(
            http.post(CATASTRO_URL, () => {
                calls += 1;
                return calls === 1
                    ? new HttpResponse('boom', { status: 500 })
                    : new HttpResponse(loadFixture('property-found.xml'));
            }),
        );
        const r = await gateway().queryByReference(ref('9872023VH5797S0001WX'));
        expect(r.ok).toBe(true);
        expect(calls).toBe(2);
    });

    it('US2-S3: persistent HTTP 500 is CadastreUnavailableError after 3 attempts', async () => {
        let calls = 0;
        server.use(
            http.post(CATASTRO_URL, () => {
                calls += 1;
                return new HttpResponse('boom', { status: 500 });
            }),
        );
        const r = await gateway().queryByReference(ref(R));
        expect(!r.ok && r.error).toBeInstanceOf(CadastreUnavailableError);
        expect(calls).toBe(3);
    });

    it('US2-S3: slow upstream is CadastreTimeoutError', async () => {
        server.use(
            http.post(CATASTRO_URL, async () => {
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, 300);
                });
                return new HttpResponse(loadFixture('property-found.xml'));
            }),
        );
        const r = await gateway(50).queryByReference(ref(R));
        expect(!r.ok && r.error).toBeInstanceOf(CadastreTimeoutError);
    });

    it('US2-S3: network failure is CadastreUnavailableError', async () => {
        server.use(http.post(CATASTRO_URL, () => HttpResponse.error()));
        const r = await gateway().queryByReference(ref(R));
        expect(!r.ok && r.error).toBeInstanceOf(CadastreUnavailableError);
    });

    it('malformed XML is CadastreProtocolError and not retried', async () => {
        let calls = 0;
        server.use(
            http.post(CATASTRO_URL, () => {
                calls += 1;
                return new HttpResponse('<html>not soap');
            }),
        );
        const r = await gateway().queryByReference(ref(R));
        expect(!r.ok && r.error).toBeInstanceOf(CadastreProtocolError);
        expect(calls).toBe(1);
    });
});
