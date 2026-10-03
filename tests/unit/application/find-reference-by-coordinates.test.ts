import { describe, expect, it } from 'vitest';

import { FindReferenceByCoordinatesUseCase } from '../../../src/application/use-cases/find-reference-by-coordinates.use-case.js';
import { ReferenceMatch } from '../../../src/domain/entities/reference-match.js';
import { type DomainError, ReferenceNotFoundError } from '../../../src/domain/errors/index.js';
import type { ICoordinateGateway } from '../../../src/domain/ports/coordinate-gateway.js';
import { err, ok, type Result } from '../../../src/domain/result.js';
import { Coordinate } from '../../../src/domain/value-objects/coordinate.js';

class FakeCoordinateGateway implements ICoordinateGateway {
    public constructor(private readonly result: Result<ReferenceMatch, DomainError>) {}

    public async findReference() {
        return this.result;
    }
}

describe('FindReferenceByCoordinatesUseCase [002:US1-S1]', () => {
    it('returns a reference match when the gateway succeeds', async () => {
        const match = new ReferenceMatch({
            parcel: '0142208',
            sheet: 'VK4704A',
            address: 'CL IMPERIAL 14 MADRID (MADRID)',
            longitude: -3.7072,
            latitude: 40.41446,
            srs: 'EPSG:4326',
        });
        const gateway = new FakeCoordinateGateway(ok(match));
        const useCase = new FindReferenceByCoordinatesUseCase(gateway);

        const coord = Coordinate.from({ longitude: -3.7072, latitude: 40.41446 });
        expect(coord.ok).toBe(true);
        if (!coord.ok) return;

        const result = await useCase.find(coord.value);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.reference).toBe('0142208VK4704A');
            expect(result.value.address).toBe('CL IMPERIAL 14 MADRID (MADRID)');
        }
    });

    it('returns a not-found error when the gateway fails [002:US1-S2]', async () => {
        const error = new ReferenceNotFoundError('No reference', '16', 'PARA ESAS COORDENADAS NO HAY REFERENCIA DISPONIBLE');
        const gateway = new FakeCoordinateGateway(err(error));
        const useCase = new FindReferenceByCoordinatesUseCase(gateway);

        const coord = Coordinate.from({ longitude: 0, latitude: 0 });
        expect(coord.ok).toBe(true);
        if (!coord.ok) return;

        const result = await useCase.find(coord.value);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(ReferenceNotFoundError);
        }
    });
});
