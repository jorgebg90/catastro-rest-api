import type { PropertyRecord } from '../entities/property-record.js';
import type { DomainError } from '../errors/index.js';
import type { Result } from '../result.js';
import type { AddressQuery, ParcelQuery } from '../value-objects/queries.js';

export interface IPropertySearchGateway {
    searchByAddress(query: AddressQuery): Promise<Result<readonly PropertyRecord[], DomainError>>;
    searchByParcel(query: ParcelQuery): Promise<Result<readonly PropertyRecord[], DomainError>>;
}
