import { describe, expect, it } from 'vitest';

import { PropertyRecord } from '../../../src/domain/entities/property-record.js';
import {
    CadastreProtocolError,
    CadastreTimeoutError,
    CadastreUnavailableError,
    InvalidCadastralReferenceError,
    PropertyNotFoundError,
} from '../../../src/domain/errors/index.js';
import { err, ok } from '../../../src/domain/result.js';
import { internalErrorResponse, toHttpResponse } from '../../../src/presentation/apify/http-mapper.js';

const record = new PropertyRecord({
    reference: '9872023VH5797S0001WX',
    propertyClass: 'URBAN',
    provinceCode: '13',
    provinceName: 'CIUDAD REAL',
    municipalityCode: '77',
    municipalityName: 'SANTA CRUZ DE MUDELA',
    address: 'CL GLORIA 51',
    postalCode: '13730',
    use: 'Residencial',
    surfaceSquareMeters: 308,
    participationPercent: 100,
    constructionYear: 1980,
    constructions: [],
});

describe('HTTP mapper (US3-S2)', () => {
    it('US3-S2: success is 200 with reference and properties', () => {
        const r = toHttpResponse('9872023VH5797S0001WX', ok([record]));
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ reference: '9872023VH5797S0001WX', properties: [{ address: 'CL GLORIA 51' }] });
    });

    it.each([
        [new InvalidCadastralReferenceError('x'), 400, 'INVALID_CADASTRAL_REFERENCE'],
        [new PropertyNotFoundError('x', '5', 'NO EXISTE'), 404, 'PROPERTY_NOT_FOUND'],
        [new CadastreTimeoutError('x'), 504, 'CADASTRE_TIMEOUT'],
        [new CadastreUnavailableError('x'), 502, 'CADASTRE_UNAVAILABLE'],
        [new CadastreProtocolError('x'), 502, 'CADASTRE_PROTOCOL_ERROR'],
    ])('maps %s to %i', (error, status, code) => {
        const r = toHttpResponse('R', err(error));
        expect(r.status).toBe(status);
        expect(r.body).toMatchObject({ code });
    });

    it('US2-S2: not found exposes upstream code and description', () => {
        const r = toHttpResponse('R', err(new PropertyNotFoundError('x', '5', 'NO EXISTE')));
        expect(r.body).toMatchObject({ upstream: { code: '5', description: 'NO EXISTE' } });
    });

    it('unexpected errors are 500 INTERNAL_ERROR without leaking details', () => {
        const r = internalErrorResponse();
        expect(r.status).toBe(500);
        expect(r.body).toEqual({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    });
});
