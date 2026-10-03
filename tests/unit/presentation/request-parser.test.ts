import { describe, expect, it, vi } from 'vitest';

import type { IGetPropertyByRefUseCase } from '../../../src/application/ports/get-property-by-ref-use-case.js';
import { InvalidCadastralReferenceError } from '../../../src/domain/errors/index.js';
import { parseReferenceInput } from '../../../src/presentation/apify/request-parser.js';

describe('request parser (US2-S1)', () => {
    it('US2-S1: invalid input yields InvalidCadastralReferenceError and the use case is not called', async () => {
        const useCase: IGetPropertyByRefUseCase = { execute: vi.fn() };
        for (const input of [undefined, null, 42, '', '123']) {
            const parsed = parseReferenceInput(input);
            expect(parsed.ok).toBe(false);
            if (!parsed.ok) expect(parsed.error).toBeInstanceOf(InvalidCadastralReferenceError);
            else await useCase.execute(parsed.value);
        }
        expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('US1-S1: valid input yields a CadastralReference', () => {
        const parsed = parseReferenceInput(' 9872023vh5797s0001wx ');
        expect(parsed.ok && parsed.value.value).toBe('9872023VH5797S0001WX');
    });
});
