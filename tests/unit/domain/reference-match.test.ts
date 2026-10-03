import { describe, expect, it } from 'vitest';

import { ReferenceMatch } from '../../../src/domain/entities/reference-match.js';

describe('ReferenceMatch (SPEC-002 foundation) [002:US1-S1]', () => {
    it('combines parcel and sheet into reference', () => {
        const match = new ReferenceMatch({
            parcel: '0142208',
            sheet: 'VK4704A',
            address: 'CL IMPERIAL 14 MADRID (MADRID)',
            longitude: -3.7072,
            latitude: 40.41446,
            srs: 'EPSG:4326',
        });
        expect(match.reference).toBe('0142208VK4704A');
        expect(match.parcel).toBe('0142208');
        expect(match.sheet).toBe('VK4704A');
    });

    it('is immutable', () => {
        const match = new ReferenceMatch({
            parcel: '0142208',
            sheet: 'VK4704A',
            address: 'CL IMPERIAL 14 MADRID (MADRID)',
            longitude: -3.7072,
            latitude: 40.41446,
            srs: 'EPSG:4326',
        });
        expect(Object.isFrozen(match)).toBe(true);
    });

    it('preserves coordinate data', () => {
        const match = new ReferenceMatch({
            parcel: '0142208',
            sheet: 'VK4704A',
            address: 'CL IMPERIAL 14 MADRID (MADRID)',
            longitude: -3.7072,
            latitude: 40.41446,
            srs: 'EPSG:4326',
        });
        expect(match.longitude).toBe(-3.7072);
        expect(match.latitude).toBe(40.41446);
        expect(match.srs).toBe('EPSG:4326');
        expect(match.address).toBe('CL IMPERIAL 14 MADRID (MADRID)');
    });
});
