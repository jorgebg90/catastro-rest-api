import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { CadastralReference } from '../../src/domain/value-objects/cadastral-reference.js';
import { CatastroSoapGateway } from '../../src/infrastructure/soap/catastro-soap-gateway.js';
import { CATASTRO_URL, loadFixture, soapResponse } from '../mocks/handlers.js';
import { server } from '../mocks/server.js';

const ref = (raw: string) => {
    const r = CadastralReference.from(raw);
    if (!r.ok) throw r.error;
    return r.value;
};
const gateway = () => new CatastroSoapGateway({ endpoint: CATASTRO_URL, timeoutMs: 2000 });

describe('CatastroSoapGateway success paths', () => {
    it('US1-S1: sends the contract envelope and parses a property', async () => {
        let body = '';
        let action: string | null = null;
        server.use(
            http.post(CATASTRO_URL, async ({ request }) => {
                body = await request.text();
                action = request.headers.get('SOAPAction');
                return new HttpResponse(loadFixture('property-found.xml'), { headers: { 'Content-Type': 'text/xml' } });
            }),
        );
        const result = await gateway().queryByReference(ref('9872023VH5797S0001WX'));
        expect(action).toBe('"http://tempuri.org/OVCServWeb/OVCCallejero/Consulta_DNPRC"');
        expect(body).toContain('<RefCat xmlns="http://www.catastro.meh.es/">9872023VH5797S0001WX</RefCat>');
        expect(result.ok && result.value).toHaveLength(1);
        expect(result.ok && result.value[0]?.address).toContain('GLORIA 51');
    });

    it('US1-S2: parses a parcel with several properties', async () => {
        server.use(soapResponse('parcel-found.xml'));
        const result = await gateway().queryByReference(ref('1853111VK4715D'));
        expect(result.ok && result.value).toHaveLength(11);
    });
});
