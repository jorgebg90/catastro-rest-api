import type { Municipality, Province, Street, StreetNumberEntry } from '../entities/catalog.js';
import type { DomainError } from '../errors/index.js';
import type { Result } from '../result.js';
import type { MunicipalityQuery, StreetNumberQuery, StreetQuery } from '../value-objects/queries.js';

export interface ICatalogGateway {
    listProvinces(): Promise<Result<readonly Province[], DomainError>>;
    listMunicipalities(query: MunicipalityQuery): Promise<Result<readonly Municipality[], DomainError>>;
    listStreets(query: StreetQuery): Promise<Result<readonly Street[], DomainError>>;
    listStreetNumbers(query: StreetNumberQuery): Promise<Result<readonly StreetNumberEntry[], DomainError>>;
}
