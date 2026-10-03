import { describe, expect, it } from 'vitest';

import {
    CadastreProtocolError,
    CadastreTimeoutError,
    CadastreUnavailableError,
    DomainError,
    InvalidCadastralReferenceError,
    PropertyNotFoundError,
} from '../../../src/domain/errors/index.js';

describe('Domain errors (SPEC-000 foundation)', () => {
    it.each([
        [new InvalidCadastralReferenceError('bad'), 'INVALID_CADASTRAL_REFERENCE', 'InvalidCadastralReferenceError'],
        [new PropertyNotFoundError('nf', '5', 'NO EXISTE'), 'PROPERTY_NOT_FOUND', 'PropertyNotFoundError'],
        [new CadastreTimeoutError('t'), 'CADASTRE_TIMEOUT', 'CadastreTimeoutError'],
        [new CadastreUnavailableError('u'), 'CADASTRE_UNAVAILABLE', 'CadastreUnavailableError'],
        [new CadastreProtocolError('p'), 'CADASTRE_PROTOCOL_ERROR', 'CadastreProtocolError'],
    ])('%s has stable code and name', (error, code, name) => {
        expect(error).toBeInstanceOf(DomainError);
        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBe(code);
        expect(error.name).toBe(name);
    });

    it('PropertyNotFoundError carries upstream code and description', () => {
        const e = new PropertyNotFoundError('nf', '5', 'NO EXISTE');
        expect(e.upstreamCode).toBe('5');
        expect(e.upstreamDescription).toBe('NO EXISTE');
        expect(e.message).toBe('nf');
    });
});
