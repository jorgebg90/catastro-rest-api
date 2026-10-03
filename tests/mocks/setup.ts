import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './server.js';

beforeAll(() => server.listen({
        onUnhandledRequest: (request, print) => {
            if (new URL(request.url).hostname === '127.0.0.1') return;
            print.error();
        },
    }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
