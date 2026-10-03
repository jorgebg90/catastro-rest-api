import { describe, expect, it } from 'vitest';

import { parseCoordinateXml } from '../../src/infrastructure/mappers/coordinate-xml-parser.js';
import { loadFixture } from '../mocks/handlers.js';

describe('coordinate-xml-parser [002:US1-S1]', () => {
    it('parses a successful response', () => {
        const xml = loadFixture('coordinates-found.xml');
        const result = parseCoordinateXml(xml);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.kind).toBe('success');
            if (result.value.kind === 'success') {
                expect(result.value.parcel).toBe('0142208');
                expect(result.value.sheet).toBe('VK4704A');
                expect(result.value.address).toBe('CL IMPERIAL 14 MADRID (MADRID)');
                expect(result.value.longitude).toBe(-3.7072);
                expect(result.value.latitude).toBe(40.41446);
                expect(result.value.srs).toBe('EPSG:4326');
            }
        }
    });

    it('parses a not-found error [002:US1-S2]', () => {
        const xml = loadFixture('coordinates-not-found.xml');
        const result = parseCoordinateXml(xml);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.kind).toBe('error');
            if (result.value.kind === 'error') {
                expect(result.value.errors).toHaveLength(1);
                expect(result.value.errors[0]?.code).toBe('16');
            }
        }
    });

    it('parses missing SRS error', () => {
        const xml = loadFixture('coordinates-missing-srs.xml');
        const result = parseCoordinateXml(xml);
        expect(result.ok).toBe(true);
        if (result.ok && result.value.kind === 'error') {
            expect(result.value.errors[0]?.code).toBe('75');
        }
    });

    it('parses invalid X error', () => {
        const xml = loadFixture('coordinates-invalid-x.xml');
        const result = parseCoordinateXml(xml);
        expect(result.ok).toBe(true);
        if (result.ok && result.value.kind === 'error') {
            expect(result.value.errors[0]?.code).toBe('77');
        }
    });

    it('parses missing Y error', () => {
        const xml = loadFixture('coordinates-missing-y.xml');
        const result = parseCoordinateXml(xml);
        expect(result.ok).toBe(true);
        if (result.ok && result.value.kind === 'error') {
            expect(result.value.errors[0]?.code).toBe('79');
        }
    });

    it('parses EPSG:4258 response', () => {
        const xml = loadFixture('coordinates-found-4258.xml');
        const result = parseCoordinateXml(xml);
        expect(result.ok).toBe(true);
        if (result.ok && result.value.kind === 'success') {
            expect(result.value.srs).toBe('EPSG:4258');
        }
    });

    it('returns protocol error for malformed XML', () => {
        const result = parseCoordinateXml('<html>not xml</html>');
        expect(result.ok).toBe(false);
    });
});
