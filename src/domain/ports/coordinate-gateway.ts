import type { ReferenceMatch } from '../entities/reference-match.js';
import type { DomainError } from '../errors/index.js';
import type { Result } from '../result.js';
import type { Coordinate } from '../value-objects/coordinate.js';

export interface ICoordinateGateway {
    findReference(coordinate: Coordinate): Promise<Result<ReferenceMatch, DomainError>>;
}
