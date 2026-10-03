import type { Municipality, Province, Street, StreetNumberEntry } from '../../domain/entities/catalog.js';
import type { PropertyRecord } from '../../domain/entities/property-record.js';
import { ReferenceMatch } from '../../domain/entities/reference-match.js';
import { CatalogEntryNotFoundError, type DomainError } from '../../domain/errors/index.js';
import type { ICatalogGateway } from '../../domain/ports/catalog-gateway.js';
import type { ICoordinateGateway } from '../../domain/ports/coordinate-gateway.js';
import type { IPropertySearchGateway } from '../../domain/ports/property-search-gateway.js';
import { err, ok, type Result } from '../../domain/result.js';
import type { Coordinate } from '../../domain/value-objects/coordinate.js';
import type { AddressQuery, MunicipalityQuery, ParcelQuery, StreetNumberQuery, StreetQuery } from '../../domain/value-objects/queries.js';
import { parseDnpXml } from '../mappers/cadastre-xml-parser.js';
import {
    type ParsedCatalog,
    parseMunicipalitiesXml,
    parseProvincesXml,
    parseStreetNumbersXml,
    parseStreetsXml,
} from '../mappers/catalog-xml-parser.js';
import { parseCoordinateXml } from '../mappers/coordinate-xml-parser.js';
import { mapOperationErrors } from '../mappers/error-mapper.js';
import { mapToPropertyRecords } from '../mappers/property-mapper.js';
import { fetchText } from './http-call.js';
import { DEFAULT_RETRY, type RetryOptions, withRetry } from './retry.js';

export interface CatastroGetGatewayOptions {
    readonly endpoint: string;
    readonly timeoutMs: number;
    readonly retry?: RetryOptions;
    readonly fetchFn?: typeof fetch;
}

type Params = Readonly<Record<string, string | number>>;

/** Upstream HTTP GET binding of the OVCCallejero and OVCCoordenadas operations. */
export class CatastroGetGateway implements ICatalogGateway, IPropertySearchGateway, ICoordinateGateway {
    public constructor(private readonly options: CatastroGetGatewayOptions) {}

    public async listProvinces(): Promise<Result<readonly Province[], DomainError>> {
        return this.catalog('ConsultaProvincia', {}, parseProvincesXml);
    }

    public async listMunicipalities(q: MunicipalityQuery): Promise<Result<readonly Municipality[], DomainError>> {
        return this.catalog('ConsultaMunicipio', { Provincia: q.province, Municipio: q.municipality }, parseMunicipalitiesXml);
    }

    public async listStreets(q: StreetQuery): Promise<Result<readonly Street[], DomainError>> {
        const params = { Provincia: q.province, Municipio: q.municipality, TipoVia: q.streetType, NombreVia: q.streetName };
        return this.catalog('ConsultaVia', params, parseStreetsXml);
    }

    public async listStreetNumbers(q: StreetNumberQuery): Promise<Result<readonly StreetNumberEntry[], DomainError>> {
        const params = { Provincia: q.province, Municipio: q.municipality, TipoVia: q.streetType, NomVia: q.streetName, Numero: q.number };
        return this.catalog('ConsultaNumero', params, parseStreetNumbersXml);
    }

    public async searchByAddress(q: AddressQuery): Promise<Result<readonly PropertyRecord[], DomainError>> {
        return this.properties('Consulta_DNPLOC', {
            Provincia: q.province,
            Municipio: q.municipality,
            Sigla: q.streetType,
            Calle: q.streetName,
            Numero: q.number,
            Bloque: q.block,
            Escalera: q.staircase,
            Planta: q.floor,
            Puerta: q.door,
        });
    }

    public async searchByParcel(q: ParcelQuery): Promise<Result<readonly PropertyRecord[], DomainError>> {
        return this.properties('Consulta_DNPPP', {
            Provincia: q.province,
            Municipio: q.municipality,
            Poligono: q.polygon,
            Parcela: q.parcel,
        });
    }

    public async findReference(coordinate: Coordinate): Promise<Result<ReferenceMatch, DomainError>> {
        const response = await this.call('Consulta_RCCOOR', {
            SRS: coordinate.srs,
            Coordenada_X: coordinate.longitude,
            Coordenada_Y: coordinate.latitude,
        });
        if (!response.ok) return response;
        const parsed = parseCoordinateXml(response.value);
        if (!parsed.ok) return parsed;
        if (parsed.value.kind === 'error') return err(mapOperationErrors(parsed.value.errors, 'coordinate'));
        return ok(
            new ReferenceMatch({
                parcel: parsed.value.parcel,
                sheet: parsed.value.sheet,
                address: parsed.value.address,
                longitude: parsed.value.longitude,
                latitude: parsed.value.latitude,
                srs: parsed.value.srs,
            }),
        );
    }

    private async call(operation: string, params: Params): Promise<Result<string, DomainError>> {
        const query = new URLSearchParams(Object.entries(params).map(([k, v]): [string, string] => [k, String(v)]));
        const url = `${this.options.endpoint}/${operation}?${query.toString()}`;
        return withRetry(async () => fetchText(url, { method: 'GET' }, this.options), this.options.retry ?? DEFAULT_RETRY);
    }

    private async catalog<T>(
        operation: string,
        params: Params,
        parse: (xml: string) => Result<ParsedCatalog<T>, DomainError>,
    ): Promise<Result<readonly T[], DomainError>> {
        const response = await this.call(operation, params);
        if (!response.ok) return response;
        const parsed = parse(response.value);
        if (!parsed.ok) return parsed;
        if (parsed.value.kind === 'error') return err(mapOperationErrors(parsed.value.errors, 'catalog'));
        if (parsed.value.items.length === 0) return err(new CatalogEntryNotFoundError('No entries found for the given criteria'));
        return ok(parsed.value.items);
    }

    private async properties(operation: string, params: Params): Promise<Result<readonly PropertyRecord[], DomainError>> {
        const response = await this.call(operation, params);
        if (!response.ok) return response;
        const parsed = parseDnpXml(response.value);
        if (!parsed.ok) return parsed;
        if (parsed.value.kind === 'error') return err(mapOperationErrors(parsed.value.errors, 'property'));
        return ok(mapToPropertyRecords(parsed.value.data));
    }
}
