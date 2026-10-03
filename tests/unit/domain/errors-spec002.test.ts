import { describe, expect, it } from 'vitest';

import { ReferenceNotFoundError } from '../../../src/domain/errors/index.js';

describe('ReferenceNotFoundError (SPEC-002 foundation)', () => {
    it('has code COORDINATE_NOT_FOUND', () => {
        const error = new ReferenceNotFoundError('No reference at coordinates', '16', 'PARA ESAS COORDENADAS NO HAY REFERENCIA DISPONIBLE');
        expect(error.code).toBe('COORDINATE_NOT_FOUND');
        expect(error.message).toBe('No reference at coordinates');
    });

    it('carries upstream code and description', () => {
        const error = new ReferenceNotFoundError('Not found', '16', 'PARA ESAS COORDENADAS NO HAY REFERENCIA DISPONIBLE');
        expect(error.upstreamCode).toBe('16');
        expect(error.upstreamDescription).toBe('PARA ESAS COORDENADAS NO HAY REFERENCIA DISPONIBLE');
    });
});
