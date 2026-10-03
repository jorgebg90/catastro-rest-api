import type { ReferenceMatch } from '../../domain/entities/reference-match.js';
import type { DomainError } from '../../domain/errors/index.js';
import type { ICoordinateGateway } from '../../domain/ports/coordinate-gateway.js';
import type { Result } from '../../domain/result.js';
import type { Coordinate } from '../../domain/value-objects/coordinate.js';
import type { IFindReferenceByCoordinatesUseCase } from '../ports/find-reference-by-coordinates-use-case.js';

/** Implements SPEC-002 scenarios US1-S1 and US1-S2. */
export class FindReferenceByCoordinatesUseCase implements IFindReferenceByCoordinatesUseCase {
    public constructor(private readonly gateway: ICoordinateGateway) {}

    public async find(coordinate: Coordinate): Promise<Result<ReferenceMatch, DomainError>> {
        return this.gateway.findReference(coordinate);
    }
}
