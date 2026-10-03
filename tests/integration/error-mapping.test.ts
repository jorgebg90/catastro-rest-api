import { describe, expect, it } from 'vitest';

import {
    CadastreProtocolError,
    InvalidQueryError,
    ReferenceNotFoundError,
} from '../../src/domain/errors/index.js';
import { mapOperationErrors } from '../../src/infrastructure/mappers/error-mapper.js';

describe('Error mapping: coordinate kind (SPEC-002 foundation) [002:US1-S2, 002:US3-S2]', () => {
    it('code 16 maps to ReferenceNotFoundError', () => {
        const error = mapOperationErrors(
            [{ code: '16', description: 'PARA ESAS COORDENADAS NO HAY REFERENCIA DISPONIBLE' }],
            'coordinate',
        );
        expect(error).toBeInstanceOf(ReferenceNotFoundError);
        expect((error as ReferenceNotFoundError).code).toBe('COORDINATE_NOT_FOUND');
    });

    it('codes 75/77/79 map to InvalidQueryError', () => {
        const tests = [
            ['75', 'EL CAMPO SRS ES OBLIGATORIO'],
            ['77', 'LA COORDENADA X DEBE SER UN VALOR NUMÉRICO'],
            ['79', 'LA COORDENADA Y OBLIGATORIA'],
        ];
        for (const [code, desc] of tests) {
            const error = mapOperationErrors([{ code, description: desc }], 'coordinate');
            expect(error).toBeInstanceOf(InvalidQueryError);
            expect((error as InvalidQueryError).code).toBe('INVALID_PARAMETER');
        }
    });

    it('other codes map to protocol error', () => {
        const error = mapOperationErrors([{ code: '999', description: 'Unknown error' }], 'coordinate');
        expect(error).toBeInstanceOf(CadastreProtocolError);
    });
});
