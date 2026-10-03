import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const SCENARIO = /\b(US\d-S\d)\b/g;

const listTests = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) return e.name === 'fixtures' || e.name === 'mocks' ? [] : listTests(p);
        return e.name.endsWith('.test.ts') ? [p] : [];
    });

describe('SPEC-000 traceability (FR-009)', () => {
    const spec = readFileSync(join(root, 'specs/000-property-by-cadastral-ref/spec.md'), 'utf8');
    const ids = new Set([...spec.matchAll(/\[(US\d-S\d)\]/g)].map((m) => m[1] as string));
    const files = listTests(join(root, 'tests'));
    const referenced = new Set<string>();
    const unreferenced: string[] = [];
    for (const f of files) {
        const found = [...readFileSync(f, 'utf8').matchAll(SCENARIO)].map((m) => m[1] as string);
        found.forEach((id) => referenced.add(id));
        if (found.length === 0 && !f.includes('foundation')) unreferenced.push(f);
    }

    it('every scenario in spec.md is referenced by a test', () => {
        expect(ids.size).toBeGreaterThan(0);
        expect([...ids].filter((id) => !referenced.has(id))).toEqual([]);
    });

    it('every test file references a scenario (or is a foundation test)', () => {
        const allowed = ['result.test.ts', 'errors.test.ts', 'property-record.test.ts', 'traceability.test.ts'];
        expect(unreferenced.filter((f) => !allowed.some((a) => f.endsWith(a)))).toEqual([]);
    });
});
