import { describe, expect, it } from 'vitest';

import { CatalogEntryNotFoundError, DomainError, InvalidQueryError } from '../../../src/domain/errors/index.js';

describe('SPEC-001 errors', () => {
    it.each(['MISSING_PARAMETER', 'INVALID_PARAMETER', 'AMBIGUOUS_QUERY'] as const)('[001:US1-S5] InvalidQueryError carries %s', (code) => {
        const e = new InvalidQueryError(code, 'bad');
        expect(e).toBeInstanceOf(DomainError);
        expect(e.code).toBe(code);
        expect(e.name).toBe('InvalidQueryError');
    });

    it('[001:US1-S6] CatalogEntryNotFoundError carries upstream details', () => {
        const e = new CatalogEntryNotFoundError('none', '12', 'LA PROVINCIA NO EXISTE');
        expect(e.code).toBe('CATALOG_ENTRY_NOT_FOUND');
        expect([e.upstreamCode, e.upstreamDescription]).toEqual(['12', 'LA PROVINCIA NO EXISTE']);
    });
});
