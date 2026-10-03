import { describe, expect, it, vi } from 'vitest';

import { GetPropertyByRefUseCase } from '../../../src/application/use-cases/get-property-by-ref.use-case.js';
import { PropertyRecord } from '../../../src/domain/entities/property-record.js';
import { CadastreTimeoutError } from '../../../src/domain/errors/index.js';
import type { ICadastreGateway } from '../../../src/domain/ports/cadastre-gateway.js';
import { err, ok } from '../../../src/domain/result.js';
import { CadastralReference } from '../../../src/domain/value-objects/cadastral-reference.js';

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

const ref = (raw: string) => {
    const r = CadastralReference.from(raw);
    if (!r.ok) throw r.error;
    return r.value;
};

describe('GetPropertyByRefUseCase', () => {
    it('US1-S1: returns the property from the gateway', async () => {
        const gateway: ICadastreGateway = { queryByReference: vi.fn().mockResolvedValue(ok([record])) };
        const result = await new GetPropertyByRefUseCase(gateway).execute(ref('9872023VH5797S0001WX'));
        expect(result).toEqual(ok([record]));
        expect(gateway.queryByReference).toHaveBeenCalledOnce();
    });

    it('US1-S2: returns several properties for a parcel', async () => {
        const gateway: ICadastreGateway = { queryByReference: vi.fn().mockResolvedValue(ok([record, record])) };
        const result = await new GetPropertyByRefUseCase(gateway).execute(ref('1853111VK4715D'));
        expect(result.ok && result.value).toHaveLength(2);
    });

    it('propagates gateway failures without throwing', async () => {
        const failure = err(new CadastreTimeoutError('t'));
        const gateway: ICadastreGateway = { queryByReference: vi.fn().mockResolvedValue(failure) };
        expect(await new GetPropertyByRefUseCase(gateway).execute(ref('1853111VK4715D'))).toBe(failure);
    });
});
