import { describe, expect, it } from 'vitest';

import { renderHtml } from '../../../src/presentation/docs/html-renderer.js';
import { buildOpenApiDocument } from '../../../src/presentation/docs/openapi.js';
import { ROUTES } from '../../../src/presentation/docs/routes.js';

const html = renderHtml(buildOpenApiDocument());

describe('renderHtml', () => {
    it('[001:US4-S1] lists every endpoint and parameter', () => {
        for (const route of ROUTES) {
            expect(html).toContain(`<code>${route.path}</code>`);
            for (const p of route.parameters) expect(html).toContain(`<code>${p.name}</code>`);
        }
    });

    it('[001:US4-S1] documents error statuses', () => {
        expect(html).toContain('<code>400</code>');
        expect(html).toContain('<code>404</code>');
    });

    it('[001:US4-S4] is self-contained: no scripts, stylesheets or external URLs', () => {
        expect(html).not.toMatch(/<script|<link|@import|url\(|src=/i);
        expect(html).not.toMatch(/https?:\/\//i);
    });

    it('[001:US4-S1] escapes content', () => {
        const out = renderHtml({
            info: { title: '<b>x</b>', version: '1', description: '"q"' },
            paths: { '/x': { get: { summary: '<script>alert(1)</script>', description: '', parameters: [], responses: {} } } },
        });
        expect(out).not.toContain('<script>alert');
        expect(out).toContain('&lt;script&gt;');
    });
});
