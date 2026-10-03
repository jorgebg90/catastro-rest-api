import { describe, expect, it } from 'vitest';

import { Construction, PropertyRecord } from '../../../src/domain/entities/property-record.js';

const base = {
    reference: '9872023VH5797S0001WX',
    propertyClass: 'URBAN' as const,
    provinceCode: '28',
    provinceName: 'MADRID',
    municipalityCode: '79',
    municipalityName: 'MADRID',
    address: 'CL SERRANO 30',
    postalCode: null,
    use: null,
    surfaceSquareMeters: null,
    participationPercent: null,
    constructionYear: null,
};

describe('PropertyRecord / Construction (SPEC-000 foundation)', () => {
    it('keeps optional fields as null and constructions empty', () => {
        const p = new PropertyRecord({ ...base, constructions: [] });
        expect(p.postalCode).toBeNull();
        expect(p.constructions).toEqual([]);
    });

    it('is immutable', () => {
        const c = new Construction({ use: 'VIVIENDA', floor: '01', door: 'A', surfaceSquareMeters: 10.5 });
        const p = new PropertyRecord({ ...base, constructions: [c] });
        expect(Object.isFrozen(p)).toBe(true);
        expect(Object.isFrozen(c)).toBe(true);
        expect(Object.isFrozen(p.constructions)).toBe(true);
        expect(p.constructions[0]?.surfaceSquareMeters).toBe(10.5);
    });

    it('does not share the constructions array with the caller', () => {
        const list: Construction[] = [];
        const p = new PropertyRecord({ ...base, constructions: list });
        list.push(new Construction({ use: null, floor: null, door: null, surfaceSquareMeters: null }));
        expect(p.constructions).toHaveLength(0);
    });
});
