import type { PropertyRecord } from '../../domain/entities/property-record.js';
import type { DomainError } from '../../domain/errors/index.js';
import type { Result } from '../../domain/result.js';
import type { AddressQuery, ParcelQuery } from '../../domain/value-objects/queries.js';

export interface ISearchPropertiesByAddressUseCase {
    execute(query: AddressQuery): Promise<Result<readonly PropertyRecord[], DomainError>>;
}
export interface ISearchPropertiesByParcelUseCase {
    execute(query: ParcelQuery): Promise<Result<readonly PropertyRecord[], DomainError>>;
}
