import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildOpenApiDocument } from '../../../src/presentation/docs/openapi.js';

const root = join(import.meta.dirname, '../../..');

describe('Actor web server schema', () => {
    it('[001:US4-S3] .actor/openapi.json matches the generated document (run npm run generate:openapi)', () => {
        const file = JSON.parse(readFileSync(join(root, '.actor/openapi.json'), 'utf8')) as unknown;
        expect(file).toEqual(JSON.parse(JSON.stringify(buildOpenApiDocument())));
    });

    it('[002:US4-S2] the published file includes the coordinates endpoint', () => {
        const file = JSON.parse(readFileSync(join(root, '.actor/openapi.json'), 'utf8')) as { paths: Record<string, unknown> };
        expect(file.paths).toHaveProperty(['/coordinates/reference']);
    });

    it('[001:US4-S3] actor.json references it', () => {
        const actor = JSON.parse(readFileSync(join(root, '.actor/actor.json'), 'utf8')) as { webServerSchema?: string };
        expect(actor.webServerSchema).toBe('./openapi.json');
    });
});
