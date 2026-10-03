import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { buildOpenApiDocument } from '../src/presentation/docs/openapi.js';

const target = fileURLToPath(new URL('../.actor/openapi.json', import.meta.url));
writeFileSync(target, `${JSON.stringify(buildOpenApiDocument(), null, 4)}\n`);
