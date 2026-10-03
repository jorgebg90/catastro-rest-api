import type { PropertyRecord } from '../../domain/entities/property-record.js';
import type { DomainError } from '../../domain/errors/index.js';
import type { IPropertySearchGateway } from '../../domain/ports/property-search-gateway.js';
import type { Result } from '../../domain/result.js';
import type { AddressQuery, ParcelQuery } from '../../domain/value-objects/queries.js';
import type { ISearchPropertiesByAddressUseCase, ISearchPropertiesByParcelUseCase } from '../ports/search-use-cases.js';

/** Implements SPEC-001 scenarios US2-S1 and US2-S2 (specs/001-catastro-full-api-openapi-docs/spec.md). */
export class SearchPropertiesByAddressUseCase implements ISearchPropertiesByAddressUseCase {
    public constructor(private readonly gateway: IPropertySearchGateway) {}

    public async execute(query: AddressQuery): Promise<Result<readonly PropertyRecord[], DomainError>> {
        return this.gateway.searchByAddress(query);
    }
}

/** Implements SPEC-001 scenario US2-S3. */
export class SearchPropertiesByParcelUseCase implements ISearchPropertiesByParcelUseCase {
    public constructor(private readonly gateway: IPropertySearchGateway) {}

    public async execute(query: ParcelQuery): Promise<Result<readonly PropertyRecord[], DomainError>> {
        return this.gateway.searchByParcel(query);
    }
}
