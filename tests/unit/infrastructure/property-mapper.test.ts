import { describe, expect, it } from 'vitest';

import { parseCadastreXml } from '../../../src/infrastructure/mappers/cadastre-xml-parser.js';
import { mapToPropertyRecords } from '../../../src/infrastructure/mappers/property-mapper.js';
import { loadFixture } from '../../mocks/handlers.js';

const records = (fixture: string) => {
    const parsed = parseCadastreXml(loadFixture(fixture));
    if (!parsed.ok || parsed.value.kind !== 'success') throw new Error('expected success');
    return mapToPropertyRecords(parsed.value.data);
};

describe('property mapper', () => {
    it('US1-S1: maps a single property with decimal comma and constructions', () => {
        const [p, ...rest] = records('property-found.xml');
        expect(rest).toHaveLength(0);
        expect(p).toMatchObject({
            reference: '9872023VH5797S0001WX',
            propertyClass: 'URBAN',
            provinceCode: '13',
            provinceName: 'CIUDAD REAL',
            municipalityCode: '77',
            municipalityName: 'SANTA CRUZ DE MUDELA',
            address: 'CL GLORIA 51 13730 SANTA CRUZ DE MUDELA (CIUDAD REAL)',
            postalCode: '13730',
            use: 'Residencial',
            surfaceSquareMeters: 308,
            participationPercent: 100,
            constructionYear: 1980,
        });
        expect(p?.constructions).toHaveLength(3);
        expect(p?.constructions[0]).toMatchObject({ use: 'VIVIENDA', floor: '00', door: '01', surfaceSquareMeters: 109 });
    });

    it('US1-S2: maps every item of a parcel with optional blocks absent', () => {
        const list = records('parcel-found.xml');
        expect(list).toHaveLength(11);
        expect(list[0]).toMatchObject({
            reference: '1853111VK4715D0001OY',
            propertyClass: null,
            provinceCode: '28',
            municipalityName: 'MADRID',
            postalCode: '28001',
            use: null,
            surfaceSquareMeters: null,
            constructions: [],
        });
        expect(list[0]?.address).toContain('CL SERRANO 30');
    });
});
