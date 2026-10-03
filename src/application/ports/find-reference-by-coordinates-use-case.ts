import type { ReferenceMatch } from '../../domain/entities/reference-match.js';
import type { DomainError } from '../../domain/errors/index.js';
import type { Result } from '../../domain/result.js';
import type { Coordinate } from '../../domain/value-objects/coordinate.js';

export interface IFindReferenceByCoordinatesUseCase {
    find(coordinate: Coordinate): Promise<Result<ReferenceMatch, DomainError>>;
}
