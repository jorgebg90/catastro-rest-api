import { describe, expect, it } from 'vitest';

import {
    AddressQuery,
    MunicipalityQuery,
    ParcelQuery,
    StreetNumberQuery,
    StreetQuery,
} from '../../../src/domain/value-objects/queries.js';

const code = (r: { ok: boolean; error?: { code: string } }) => (r.ok ? 'OK' : r.error?.code);

describe('query value objects', () => {
    it('[001:US1-S2] MunicipalityQuery trims, keeps accents and allows an empty municipality', () => {
        const r = MunicipalityQuery.from({ province: ' madrid ', municipality: 'alcalá' });
        expect(r.ok && [r.value.province, r.value.municipality]).toEqual(['madrid', 'alcalá']);
        const empty = MunicipalityQuery.from({ province: 'MADRID' });
        expect(empty.ok && empty.value.municipality).toBe('');
    });

    it('[001:US1-S5] province is required', () => {
        expect(code(MunicipalityQuery.from({}))).toBe('MISSING_PARAMETER');
        expect(code(MunicipalityQuery.from({ province: '   ' }))).toBe('MISSING_PARAMETER');
    });

    it('[001:US1-S3] StreetQuery needs province and municipality; type and name are optional', () => {
        expect(code(StreetQuery.from({ province: 'MADRID', municipality: 'MADRID' }))).toBe('OK');
        expect(code(StreetQuery.from({ province: 'MADRID' }))).toBe('MISSING_PARAMETER');
        expect(code(StreetQuery.from({ province: 'MADRID', municipality: 'MADRID', streetType: 'CALLE1' }))).toBe('INVALID_PARAMETER');
    });

    it('[001:US1-S4] StreetNumberQuery validates the number', () => {
        const base = { province: 'MADRID', municipality: 'MADRID', streetType: 'CL', streetName: 'SERRANO' };
        expect(code(StreetNumberQuery.from({ ...base, number: '30' }))).toBe('OK');
        expect(code(StreetNumberQuery.from(base))).toBe('MISSING_PARAMETER');
        expect(code(StreetNumberQuery.from({ ...base, number: 'abc' }))).toBe('INVALID_PARAMETER');
        expect(code(StreetNumberQuery.from({ ...base, number: '-1' }))).toBe('INVALID_PARAMETER');
        expect(code(StreetNumberQuery.from({ ...base, number: '10000' }))).toBe('INVALID_PARAMETER');
        expect(code(StreetNumberQuery.from({ ...base, streetType: undefined, number: '1' }))).toBe('MISSING_PARAMETER');
    });

    it('[001:US2-S2] AddressQuery accepts optional unit locators and rejects control characters', () => {
        const base = { province: 'MADRID', municipality: 'MADRID', streetType: 'CL', streetName: 'SERRANO', number: '30' };
        const r = AddressQuery.from({ ...base, floor: '02', door: 'A' });
        expect(r.ok && [r.value.floor, r.value.door, r.value.block]).toEqual(['02', 'A', '']);
        expect(code(AddressQuery.from({ ...base, floor: 'TOOLONG' }))).toBe('INVALID_PARAMETER');
        expect(code(AddressQuery.from({ ...base, streetName: 'A\u0000B' }))).toBe('INVALID_PARAMETER');
    });

    it('[001:US2-S3] ParcelQuery requires integer polygon and parcel', () => {
        const base = { province: 'MADRID', municipality: 'MADRID' };
        expect(code(ParcelQuery.from({ ...base, polygon: '1', parcel: '1' }))).toBe('OK');
        expect(code(ParcelQuery.from({ ...base, polygon: '1' }))).toBe('MISSING_PARAMETER');
        expect(code(ParcelQuery.from({ ...base, polygon: 'x', parcel: '1' }))).toBe('INVALID_PARAMETER');
    });

    it('[001:US2-S4] queries are immutable', () => {
        const r = ParcelQuery.from({ province: 'M', municipality: 'M', polygon: '1', parcel: '1' });
        expect(r.ok && Object.isFrozen(r.value)).toBe(true);
    });
});
