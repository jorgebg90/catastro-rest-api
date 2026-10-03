import { describe, expect, it } from 'vitest';

import {
    CadastreProtocolError,
    InvalidCadastralReferenceError,
    PropertyNotFoundError,
} from '../../../src/domain/errors/index.js';
import { parseCadastreXml } from '../../../src/infrastructure/mappers/cadastre-xml-parser.js';
import { mapCadastreErrors } from '../../../src/infrastructure/mappers/error-mapper.js';
import { loadFixture } from '../../mocks/handlers.js';

const errorsOf = (fixture: string) => {
    const parsed = parseCadastreXml(loadFixture(fixture));
    if (!parsed.ok || parsed.value.kind !== 'error') throw new Error('expected business error');
    return parsed.value.errors;
};

describe('Cadastre error mapper (US2-S2)', () => {
    it('US2-S2: code 5 becomes PropertyNotFoundError with upstream details', () => {
        const e = mapCadastreErrors(errorsOf('not-found.xml'));
        expect(e).toBeInstanceOf(PropertyNotFoundError);
        expect(e).toMatchObject({ upstreamCode: '5' });
        expect((e as PropertyNotFoundError).upstreamDescription).toContain('NO EXISTE');
    });

    it('US2-S1: code 4 becomes InvalidCadastralReferenceError', () => {
        expect(mapCadastreErrors(errorsOf('malformed-ref.xml'))).toBeInstanceOf(InvalidCadastralReferenceError);
    });

    it('unknown codes become CadastreProtocolError', () => {
        expect(mapCadastreErrors([{ code: '99', description: 'x' }])).toBeInstanceOf(CadastreProtocolError);
    });
});
