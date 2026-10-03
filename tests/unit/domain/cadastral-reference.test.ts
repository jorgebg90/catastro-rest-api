import { describe, expect, it } from 'vitest';

import { CadastralReference } from '../../../src/domain/value-objects/cadastral-reference.js';

describe('CadastralReference (US1-S1, US1-S2, US2-S1)', () => {
    it('US1-S1: accepts a 20-char reference as PROPERTY, normalized', () => {
        const r = CadastralReference.from(' 9872023vh5797s0001wx ');
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.value.value).toBe('9872023VH5797S0001WX');
            expect(r.value.kind).toBe('PROPERTY');
            expect(r.value.toString()).toBe('9872023VH5797S0001WX');
        }
    });

    it('US1-S2: accepts a 14-char reference as PARCEL', () => {
        const r = CadastralReference.from('1853111VK4715D');
        expect(r.ok && r.value.kind).toBe('PARCEL');
    });

    it('equals compares by value', () => {
        const a = CadastralReference.from('1853111vk4715d');
        const b = CadastralReference.from('1853111VK4715D');
        expect(a.ok && b.ok && a.value.equals(b.value)).toBe(true);
    });

    it.each(['', '   ', '123', '1853111VK4715', '1853111VK4715DXX', '1853111VK4715!', 'ÁÉÍÓÚ4715D12345', '1853111VK4715D\n1'])(
        'US2-S1: rejects %j',
        (raw) => {
            const r = CadastralReference.from(raw);
            expect(r.ok).toBe(false);
            if (!r.ok) expect(r.error.code).toBe('INVALID_CADASTRAL_REFERENCE');
        },
    );
});
