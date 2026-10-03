import { describe, expect, it } from 'vitest';

import { InvalidCadastralReferenceError } from '../../../src/domain/errors/index.js';
import { CadastralReference } from '../../../src/domain/value-objects/cadastral-reference.js';

describe('CadastralReference rejections (US2-S1)', () => {
    it.each([
        ['empty', ''],
        ['length 18', '123456789012345678'],
        ['invalid chars', '1853111VK4715-'],
        ['inner whitespace', '1853111 VK4715D'],
    ])('US2-S1: rejects %s', (_name, raw) => {
        const r = CadastralReference.from(raw);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error).toBeInstanceOf(InvalidCadastralReferenceError);
    });
});
