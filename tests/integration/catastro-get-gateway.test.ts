import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
    CadastreProtocolError,
    CadastreTimeoutError,
    CadastreUnavailableError,
    CatalogEntryNotFoundError,
    InvalidQueryError,
    PropertyNotFoundError,
} from '../../src/domain/errors/index.js';
import { AddressQuery, MunicipalityQuery, ParcelQuery, StreetNumberQuery, StreetQuery } from '../../src/domain/value-objects/queries.js';
import { CatastroGetGateway } from '../../src/infrastructure/soap/catastro-get-gateway.js';
import { CATASTRO_URL, getResponse, loadFixture as getFixture } from '../mocks/handlers.js';
import { server } from '../mocks/server.js';

const gateway = (timeoutMs = 500) =>
    new CatastroGetGateway({
        endpoint: CATASTRO_URL,
        timeoutMs,
        retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5, totalBudgetMs: 5000 },
    });

const unwrap = <T, E>(r: { ok: true; value: T } | { ok: false; error: E }): T => {
    if (!r.ok) throw new Error('unexpected');
    return r.value;
};
const loc = { province: 'MADRID', municipality: 'MADRID' };
const street = { ...loc, streetType: 'CL', streetName: 'SERRANO' };

describe('CatastroGetGateway catalogue', () => {
    it('[001:US1-S1] lists provinces', async () => {
        server.use(getResponse('ConsultaProvincia', 'provinces.xml'));
        const r = unwrap(await gateway().listProvinces());
        expect(r.length).toBeGreaterThan(40);
        expect(r[0]).toMatchObject({ code: '15', name: 'A CORUÑA' });
    });

    it('[001:US1-S2] lists municipalities and sends the filter', async () => {
        let search = '';
        server.use(
            http.get(`${CATASTRO_URL}/ConsultaMunicipio`, ({ request }) => {
                search = new URL(request.url).search;
                return new HttpResponse(getFixture('municipalities.xml'), { headers: { 'Content-Type': 'text/xml' } });
            }),
        );
        const r = unwrap(await gateway().listMunicipalities(unwrap(MunicipalityQuery.from({ province: 'MADRID', municipality: 'alcalá' }))));
        expect(r).toHaveLength(2);
        expect(r[0]).toMatchObject({ name: 'ALCALA DE HENARES', provinceCode: '28', ineCode: '5', cadastralCode: '5' });
        expect(new URLSearchParams(search).get('Municipio')).toBe('alcalá');
    });

    it('[001:US1-S3] lists streets', async () => {
        server.use(getResponse('ConsultaVia', 'streets.xml'));
        const r = unwrap(await gateway().listStreets(unwrap(StreetQuery.from(street))));
        expect(r).toEqual([{ code: '5757', type: 'CL', name: 'SERRANO' }]);
    });

    it('[001:US1-S4] lists street numbers with the 14-character parcel reference', async () => {
        server.use(getResponse('ConsultaNumero', 'street-numbers.xml'));
        const r = unwrap(await gateway().listStreetNumbers(unwrap(StreetNumberQuery.from({ ...street, number: '30' }))));
        expect(r).toEqual([{ number: '30', suffix: null, cadastralReference14: '1853111VK4715D' }]);
    });

    it('[001:US1-S6] unknown province is CatalogEntryNotFoundError with upstream details', async () => {
        server.use(getResponse('ConsultaMunicipio', 'catalog-not-found.xml'));
        const r = await gateway().listMunicipalities(unwrap(MunicipalityQuery.from({ province: 'ZZZZ' })));
        expect(!r.ok && r.error).toBeInstanceOf(CatalogEntryNotFoundError);
        expect(!r.ok && r.error).toMatchObject({ upstreamCode: '12' });
    });
});

describe('CatastroGetGateway property search', () => {
    const address = { ...street, number: '30' };

    it('[001:US2-S1] address search with several matches', async () => {
        server.use(getResponse('Consulta_DNPLOC', 'dnploc-list.xml'));
        const r = unwrap(await gateway().searchByAddress(unwrap(AddressQuery.from(address))));
        expect(r).toHaveLength(11);
        expect(r[0]?.reference).toMatch(/^1853111VK4715D0001/);
    });

    it('[001:US2-S2] address narrowed to one unit returns full detail and sends unit params', async () => {
        let search = new URLSearchParams();
        server.use(
            http.get(`${CATASTRO_URL}/Consulta_DNPLOC`, ({ request }) => {
                search = new URL(request.url).searchParams;
                return new HttpResponse(getFixture('dnploc-single.xml'), { headers: { 'Content-Type': 'text/xml' } });
            }),
        );
        const r = unwrap(await gateway().searchByAddress(unwrap(AddressQuery.from({ ...address, floor: '02', door: 'A' }))));
        expect(r).toHaveLength(1);
        expect(r[0]).toMatchObject({ reference: '9872023VH5797S0001WX', propertyClass: 'URBAN' });
        expect(r[0]?.constructions.length).toBeGreaterThan(0);
        expect([search.get('Planta'), search.get('Puerta'), search.get('Bloque'), search.get('Sigla'), search.get('Calle')]).toEqual([
            '02',
            'A',
            '',
            'CL',
            'SERRANO',
        ]);
    });

    it('[001:US2-S3] polygon and parcel search returns rustic locations', async () => {
        server.use(getResponse('Consulta_DNPPP', 'dnppp-list.xml'));
        const r = unwrap(await gateway().searchByParcel(unwrap(ParcelQuery.from({ ...loc, polygon: '1', parcel: '1' }))));
        expect(r).toHaveLength(4);
        expect(r[0]?.address).toContain('LA MANGADA');
        expect(r[0]?.address).toContain('Pol:1');
    });

    it('[001:US2-S5] no match is PropertyNotFoundError', async () => {
        server.use(getResponse('Consulta_DNPLOC', 'dnploc-not-found.xml'));
        const r = await gateway().searchByAddress(unwrap(AddressQuery.from(address)));
        expect(!r.ok && r.error).toBeInstanceOf(PropertyNotFoundError);
        expect(!r.ok && r.error).toMatchObject({ upstreamCode: '33' });
    });

    it('[001:US2-S4] a mandatory-field upstream error is InvalidQueryError', async () => {
        server.use(getResponse('Consulta_DNPLOC', 'mandatory-field.xml'));
        const r = await gateway().searchByAddress(unwrap(AddressQuery.from(address)));
        expect(!r.ok && r.error).toBeInstanceOf(InvalidQueryError);
    });
});

describe('CatastroGetGateway resilience', () => {
    it('[001:US3-S1] malformed XML is a protocol error', async () => {
        server.use(http.get(`${CATASTRO_URL}/ConsultaProvincia`, () => new HttpResponse('<oops', { status: 200 })));
        const r = await gateway().listProvinces();
        expect(!r.ok && r.error).toBeInstanceOf(CadastreProtocolError);
    });

    it('[001:US3-S1] unknown upstream error codes are protocol errors', async () => {
        server.use(
            http.get(
                `${CATASTRO_URL}/ConsultaProvincia`,
                () =>
                    new HttpResponse(
                        '<consulta_provinciero xmlns="http://www.catastro.meh.es/"><lerr><err><cod>999</cod><des>RARO</des></err></lerr></consulta_provinciero>',
                    ),
            ),
        );
        const r = await gateway().listProvinces();
        expect(!r.ok && r.error).toBeInstanceOf(CadastreProtocolError);
    });

    it('[001:US3-S2] 5xx is retried and then succeeds', async () => {
        let calls = 0;
        server.use(
            http.get(`${CATASTRO_URL}/ConsultaProvincia`, () => {
                calls += 1;
                return calls < 3
                    ? new HttpResponse('down', { status: 503 })
                    : new HttpResponse(getFixture('provinces.xml'), { headers: { 'Content-Type': 'text/xml' } });
            }),
        );
        const r = await gateway().listProvinces();
        expect(r.ok).toBe(true);
        expect(calls).toBe(3);
    });

    it('[001:US3-S1] persistent 5xx is CadastreUnavailableError after the retry budget', async () => {
        let calls = 0;
        server.use(
            http.get(`${CATASTRO_URL}/ConsultaProvincia`, () => {
                calls += 1;
                return new HttpResponse('down', { status: 500 });
            }),
        );
        const r = await gateway().listProvinces();
        expect(!r.ok && r.error).toBeInstanceOf(CadastreUnavailableError);
        expect(calls).toBe(3);
    });

    it('[001:US3-S1] slow upstream is CadastreTimeoutError', async () => {
        server.use(
            http.get(`${CATASTRO_URL}/ConsultaProvincia`, async () => {
                await new Promise((resolve) => {
                    setTimeout(resolve, 200);
                });
                return new HttpResponse('late');
            }),
        );
        const r = await gateway(20).listProvinces();
        expect(!r.ok && r.error).toBeInstanceOf(CadastreTimeoutError);
    });
});
