import { describe, expect, it } from 'vitest';

import { buildOpenApiDocument } from '../../../src/presentation/docs/openapi.js';
import { matchRoute, ROUTES } from '../../../src/presentation/docs/routes.js';

interface Doc {
    openapi: string;
    paths: Record<string, Record<string, { parameters: { name: string; in: string }[]; responses: Record<string, unknown> }>>;
    components: { schemas: Record<string, unknown> };
}
const doc = buildOpenApiDocument() as unknown as Doc;

describe('route table and OpenAPI document', () => {
    it('[001:US4-S2] is an OpenAPI 3 document with schemas', () => {
        expect(doc.openapi).toMatch(/^3\.0\./);
        expect(Object.keys(doc.components.schemas)).toEqual(expect.arrayContaining(['Error', 'Property', 'ProvinceList']));
    });

    it('[001:US4-S3] documented operations equal the route table', () => {
        const documented = Object.entries(doc.paths).flatMap(([p, ops]) => Object.keys(ops).map((m) => `${m.toUpperCase()} ${p}`));
        expect(documented.sort()).toEqual(ROUTES.map((r) => `${r.method} ${r.path}`).sort());
    });

    it('[001:US4-S3] every documented parameter and error status is declared on its route', () => {
        for (const route of ROUTES) {
            const op = doc.paths[route.path]?.get;
            expect(op?.parameters.map((p) => p.name)).toEqual(route.parameters.map((p) => p.name));
            expect(Object.keys(op?.responses ?? {})).toEqual(['200', ...route.errorStatuses.map(String)]);
        }
    });

    it('[001:US4-S3] every $ref points to an existing schema', () => {
        const refs = [...JSON.stringify(doc).matchAll(/#\/components\/schemas\/(\w+)/g)].map((m) => m[1] as string);
        expect(refs.filter((r) => !(r in doc.components.schemas))).toEqual([]);
    });

    it('[001:US4-S3] matchRoute resolves templates and rejects unknown paths', () => {
        expect(matchRoute('GET', '/properties/ABC')?.pathParams).toEqual({ reference: 'ABC' });
        expect(matchRoute('GET', '/properties')?.route.handler).toBe('properties');
        expect(matchRoute('GET', '/nope')).toBeNull();
        expect(matchRoute('POST', '/provinces')).toBeNull();
    });
});
