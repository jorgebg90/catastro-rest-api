import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const SPEC001_SCENARIO = /\b001:(US\d-S\d)\b/g;
const SPEC002_SCENARIO = /\b002:(US\d-S\d)\b/g;

const listTests = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) return e.name === 'fixtures' || e.name === 'mocks' ? [] : listTests(p);
        return e.name.endsWith('.test.ts') ? [p] : [];
    });

const listSources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) return listSources(p);
        return e.name.endsWith('.ts') ? [p] : [];
    });

describe('SPEC-000 traceability (FR-009)', () => {
    const ownScenario = /(?<!001:)\b(US\d-S\d)\b/g;
    const spec = readFileSync(join(root, 'specs/000-property-by-cadastral-ref/spec.md'), 'utf8');
    const ids = new Set([...spec.matchAll(/\[(US\d-S\d)\]/g)].map((m) => m[1] as string));
    const files = listTests(join(root, 'tests'));
    const referenced = new Set<string>();
    const unreferenced: string[] = [];
    for (const f of files) {
        const found = [...readFileSync(f, 'utf8').matchAll(ownScenario)].map((m) => m[1] as string);
        found.forEach((id) => referenced.add(id));
        if (found.length === 0 && !f.includes('foundation')) unreferenced.push(f);
    }

    it('every scenario in spec.md is referenced by a test', () => {
        expect(ids.size).toBeGreaterThan(0);
        expect([...ids].filter((id) => !referenced.has(id))).toEqual([]);
    });

    it('every test file references a scenario (or is a foundation test)', () => {
        const allowed = ['result.test.ts', 'errors.test.ts', 'property-record.test.ts', 'traceability.test.ts'];
        const spec001Only = unreferenced.filter((f) => readFileSync(f, 'utf8').includes('001:US'));
        expect(unreferenced.filter((f) => !allowed.some((a) => f.endsWith(a)) && !spec001Only.includes(f))).toEqual([]);
    });
});

describe('SPEC-001 traceability (FR-010)', () => {
    const spec = readFileSync(join(root, 'specs/001-catastro-full-api-openapi-docs/spec.md'), 'utf8');
    const ids = new Set([...spec.matchAll(/\[(US\d-S\d)\]/g)].map((m) => m[1] as string));
    const referenced = new Set<string>();
    const sources = [...listTests(join(root, 'tests')), ...listSources(join(root, 'src'))];
    for (const f of sources) {
        for (const m of readFileSync(f, 'utf8').matchAll(SPEC001_SCENARIO)) referenced.add(m[1] as string);
    }

    it('every SPEC-001 scenario is referenced by a test as [001:USx-Sy]', () => {
        expect(ids.size).toBe(17);
        expect([...ids].filter((id) => !referenced.has(id))).toEqual([]);
    });

    it('every SPEC-001 use case cites the spec', () => {
        const useCases = listSources(join(root, 'src/application/use-cases')).filter(
            (f) => f.endsWith('catalog.use-cases.ts') || f.endsWith('search-properties.use-cases.ts'),
        );
        expect(useCases).toHaveLength(2);
        for (const f of useCases) expect(readFileSync(f, 'utf8')).toContain('SPEC-001');
    });
});

describe('SPEC-002 traceability (FR-010)', () => {
    const spec = readFileSync(join(root, 'specs/002-reference-by-coordinates/spec.md'), 'utf8');
    const ids = new Set([...spec.matchAll(/\[(US\d-S\d)\]/g)].map((m) => m[1] as string));
    const referenced = new Set<string>();
    const sources = [...listTests(join(root, 'tests')), ...listSources(join(root, 'src'))];
    for (const f of sources) {
        for (const m of readFileSync(f, 'utf8').matchAll(SPEC002_SCENARIO)) referenced.add(m[1] as string);
    }

    it('every SPEC-002 scenario is referenced by a test as [002:USx-Sy]', () => {
        expect(ids.size).toBeGreaterThan(0);
        expect([...ids].filter((id) => !referenced.has(id))).toEqual([]);
    });
});
