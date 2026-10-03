import type { Municipality, Province, Street, StreetNumberEntry } from '../../domain/entities/catalog.js';
import type { DomainError } from '../../domain/errors/index.js';
import type { Result } from '../../domain/result.js';
import type { MunicipalityQuery, StreetNumberQuery, StreetQuery } from '../../domain/value-objects/queries.js';

export interface IListProvincesUseCase {
    execute(): Promise<Result<readonly Province[], DomainError>>;
}
export interface IListMunicipalitiesUseCase {
    execute(query: MunicipalityQuery): Promise<Result<readonly Municipality[], DomainError>>;
}
export interface IListStreetsUseCase {
    execute(query: StreetQuery): Promise<Result<readonly Street[], DomainError>>;
}
export interface IListStreetNumbersUseCase {
    execute(query: StreetNumberQuery): Promise<Result<readonly StreetNumberEntry[], DomainError>>;
}
