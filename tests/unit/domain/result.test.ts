import { describe, expect, it } from 'vitest';

import { err, ok } from '../../../src/domain/result.js';

describe('Result (SPEC-000 foundation)', () => {
    it('ok wraps a value', () => {
        const r = ok(5);
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value).toBe(5);
    });

    it('err wraps an error', () => {
        const r = err('boom');
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error).toBe('boom');
    });
});
