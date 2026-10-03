import type { Municipality, Province, Street, StreetNumberEntry } from '../../domain/entities/catalog.js';
import type { DomainError } from '../../domain/errors/index.js';
import type { ICatalogGateway } from '../../domain/ports/catalog-gateway.js';
import type { Result } from '../../domain/result.js';
import type { MunicipalityQuery, StreetNumberQuery, StreetQuery } from '../../domain/value-objects/queries.js';
import type {
    IListMunicipalitiesUseCase,
    IListProvincesUseCase,
    IListStreetNumbersUseCase,
    IListStreetsUseCase,
} from '../ports/catalog-use-cases.js';

/** Implements SPEC-001 scenario US1-S1 (specs/001-catastro-full-api-openapi-docs/spec.md). */
export class ListProvincesUseCase implements IListProvincesUseCase {
    public constructor(private readonly gateway: ICatalogGateway) {}

    public async execute(): Promise<Result<readonly Province[], DomainError>> {
        return this.gateway.listProvinces();
    }
}

/** Implements SPEC-001 scenario US1-S2. */
export class ListMunicipalitiesUseCase implements IListMunicipalitiesUseCase {
    public constructor(private readonly gateway: ICatalogGateway) {}

    public async execute(query: MunicipalityQuery): Promise<Result<readonly Municipality[], DomainError>> {
        return this.gateway.listMunicipalities(query);
    }
}

/** Implements SPEC-001 scenario US1-S3. */
export class ListStreetsUseCase implements IListStreetsUseCase {
    public constructor(private readonly gateway: ICatalogGateway) {}

    public async execute(query: StreetQuery): Promise<Result<readonly Street[], DomainError>> {
        return this.gateway.listStreets(query);
    }
}

/** Implements SPEC-001 scenario US1-S4. */
export class ListStreetNumbersUseCase implements IListStreetNumbersUseCase {
    public constructor(private readonly gateway: ICatalogGateway) {}

    public async execute(query: StreetNumberQuery): Promise<Result<readonly StreetNumberEntry[], DomainError>> {
        return this.gateway.listStreetNumbers(query);
    }
}
