import { describe, expect, it } from 'vitest';

import { ReferenceNotFoundError } from '../../src/domain/errors/index.js';
import { Coordinate } from '../../src/domain/value-objects/coordinate.js';
import { CatastroGetGateway } from '../../src/infrastructure/soap/catastro-get-gateway.js';
import { CATASTRO_COORDINATES_URL, coordinatesResponse } from '../mocks/handlers.js';
import { server } from '../mocks/server.js';

const gateway = (timeoutMs = 500) =>
    new CatastroGetGateway({
        endpoint: CATASTRO_COORDINATES_URL,
        timeoutMs,
        retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5, totalBudgetMs: 5000 },
    });

describe('CatastroGetGateway.findReference integration with MSW [002:US1-S1, 002:US1-S2]', () => {
    it('returns a ReferenceMatch for a valid coordinate', async () => {
        server.use(
            coordinatesResponse(
                { srs: 'EPSG:4326', x: '-3.7072', y: '40.41446' },
                'coordinates-found.xml',
            ),
        );

        const coord = Coordinate.from({ longitude: -3.7072, latitude: 40.41446 });
        if (!coord.ok) throw coord.error;

        const result = await gateway().findReference(coord.value);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.reference).toBe('0142208VK4704A');
            expect(result.value.address).toBe('CL IMPERIAL 14 MADRID (MADRID)');
        }
    });

    it('returns ReferenceNotFoundError for a point outside any parcel', async () => {
        server.use(coordinatesResponse({ srs: 'EPSG:4326' }, 'coordinates-not-found.xml'));

        const coord = Coordinate.from({ longitude: 0, latitude: 0 });
        if (!coord.ok) throw coord.error;

        const result = await gateway().findReference(coord.value);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(ReferenceNotFoundError);
        }
    });

    it('works with EPSG:4258', async () => {
        server.use(
            coordinatesResponse(
                { srs: 'EPSG:4258', x: '-3.7072', y: '40.41446' },
                'coordinates-found-4258.xml',
            ),
        );

        const coord = Coordinate.from({ longitude: -3.7072, latitude: 40.41446, srs: 'EPSG:4258' });
        if (!coord.ok) throw coord.error;

        const result = await gateway().findReference(coord.value);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.srs).toBe('EPSG:4258');
        }
    });
});
