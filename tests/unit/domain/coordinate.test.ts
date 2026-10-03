import { describe, expect, it } from 'vitest';

import { InvalidQueryError } from '../../../src/domain/errors/index.js';
import { Coordinate } from '../../../src/domain/value-objects/coordinate.js';

describe('Coordinate value object [002:US1-S3]', () => {
    it('creates a valid coordinate with default EPSG:4326', () => {
        const result = Coordinate.from({ longitude: -3.7072, latitude: 40.41446 });
        expect(result.ok).toBe(true);
        if (result.ok) {
            const coord = result.value;
            expect(coord.longitude).toBe(-3.7072);
            expect(coord.latitude).toBe(40.41446);
            expect(coord.srs).toBe('EPSG:4326');
            expect(Object.isFrozen(coord)).toBe(true);
        }
    });

    it('accepts explicit EPSG:4326', () => {
        const result = Coordinate.from({ longitude: 0, latitude: 0, srs: 'EPSG:4326' });
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.srs).toBe('EPSG:4326');
    });

    it('accepts EPSG:4258', () => {
        const result = Coordinate.from({ longitude: 0, latitude: 0, srs: 'EPSG:4258' });
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.srs).toBe('EPSG:4258');
    });

    it('normalizes srs: trims and uppercases', () => {
        const result = Coordinate.from({ longitude: 0, latitude: 0, srs: '  epsg:4326  ' });
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.srs).toBe('EPSG:4326');
    });

    it('rejects unsupported srs without upstream call', () => {
        const result = Coordinate.from({ longitude: 0, latitude: 0, srs: 'EPSG:25830' });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(InvalidQueryError);
            expect((result.error as InvalidQueryError).code).toBe('INVALID_PARAMETER');
        }
    });

    it('rejects missing longitude', () => {
        const result = Coordinate.from({ longitude: undefined, latitude: 0 });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(InvalidQueryError);
            expect((result.error as InvalidQueryError).code).toBe('MISSING_PARAMETER');
        }
    });

    it('rejects missing latitude', () => {
        const result = Coordinate.from({ longitude: 0, latitude: undefined });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(InvalidQueryError);
            expect((result.error as InvalidQueryError).code).toBe('MISSING_PARAMETER');
        }
    });

    it('rejects non-numeric longitude', () => {
        const result = Coordinate.from({ longitude: Number.NaN, latitude: 0 });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect((result.error as InvalidQueryError).code).toBe('INVALID_PARAMETER');
        }
    });

    it('rejects non-numeric latitude', () => {
        const result = Coordinate.from({ longitude: 0, latitude: Number.NaN });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect((result.error as InvalidQueryError).code).toBe('INVALID_PARAMETER');
        }
    });

    it('rejects out-of-range longitude', () => {
        const result = Coordinate.from({ longitude: 180.1, latitude: 0 });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect((result.error as InvalidQueryError).code).toBe('INVALID_PARAMETER');
        }
    });

    it('rejects out-of-range latitude', () => {
        const result = Coordinate.from({ longitude: 0, latitude: 90.1 });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect((result.error as InvalidQueryError).code).toBe('INVALID_PARAMETER');
        }
    });

    it('rejects NaN', () => {
        const result = Coordinate.from({ longitude: NaN, latitude: 0 });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect((result.error as InvalidQueryError).code).toBe('INVALID_PARAMETER');
        }
    });

    it('rejects Infinity', () => {
        const result = Coordinate.from({ longitude: Infinity, latitude: 0 });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect((result.error as InvalidQueryError).code).toBe('INVALID_PARAMETER');
        }
    });

    it('accepts negative coordinates', () => {
        const result = Coordinate.from({ longitude: -3.7072, latitude: -30.5 });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.longitude).toBe(-3.7072);
            expect(result.value.latitude).toBe(-30.5);
        }
    });

    it('accepts boundary values', () => {
        const result = Coordinate.from({ longitude: -180, latitude: -90 });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.longitude).toBe(-180);
            expect(result.value.latitude).toBe(-90);
        }
    });
});
