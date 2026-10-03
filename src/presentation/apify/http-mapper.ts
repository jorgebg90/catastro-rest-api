import type { Municipality, Province, Street, StreetNumberEntry } from '../../domain/entities/catalog.js';
import type { PropertyRecord } from '../../domain/entities/property-record.js';
import type { ReferenceMatch } from '../../domain/entities/reference-match.js';
import {
    CadastreTimeoutError,
    CatalogEntryNotFoundError,
    type DomainError,
    InvalidCadastralReferenceError,
    InvalidQueryError,
    PropertyNotFoundError,
    ReferenceNotFoundError,
} from '../../domain/errors/index.js';
import type { Result } from '../../domain/result.js';

export interface HttpResponseData {
    readonly status: number;
    readonly body: Readonly<Record<string, unknown>>;
}

export interface HtmlResponseData {
    readonly status: number;
    readonly html: string;
}

const serialize = (p: PropertyRecord) => ({
    reference: p.reference,
    propertyClass: p.propertyClass,
    provinceCode: p.provinceCode,
    provinceName: p.provinceName,
    municipalityCode: p.municipalityCode,
    municipalityName: p.municipalityName,
    address: p.address,
    postalCode: p.postalCode,
    use: p.use,
    surfaceSquareMeters: p.surfaceSquareMeters,
    participationPercent: p.participationPercent,
    constructionYear: p.constructionYear,
    constructions: p.constructions.map((c) => ({
        use: c.use,
        floor: c.floor,
        door: c.door,
        surfaceSquareMeters: c.surfaceSquareMeters,
    })),
});

const statusOf = (error: DomainError): number => {
    if (error instanceof InvalidCadastralReferenceError || error instanceof InvalidQueryError) return 400;
    if (error instanceof PropertyNotFoundError || error instanceof CatalogEntryNotFoundError || error instanceof ReferenceNotFoundError) return 404;
    if (error instanceof CadastreTimeoutError) return 504;
    return 502;
};

export const toErrorResponse = (error: DomainError): HttpResponseData => {
    const body: Record<string, unknown> = { code: error.code, message: error.message };
    if (error instanceof PropertyNotFoundError || error instanceof CatalogEntryNotFoundError || error instanceof ReferenceNotFoundError) {
        body.upstream = { code: error.upstreamCode, description: error.upstreamDescription };
    }
    return { status: statusOf(error), body };
};

export const toHttpResponse = (
    reference: string,
    result: Result<readonly PropertyRecord[], DomainError>,
): HttpResponseData => {
    if (result.ok) {
        return { status: 200, body: { reference, properties: result.value.map(serialize) } };
    }
    return toErrorResponse(result.error);
};

const listResponse = <T>(key: string, result: Result<readonly T[], DomainError>, map: (item: T) => unknown): HttpResponseData =>
    result.ok ? { status: 200, body: { [key]: result.value.map(map) } } : toErrorResponse(result.error);

export const toProvincesResponse = (r: Result<readonly Province[], DomainError>): HttpResponseData =>
    listResponse('provinces', r, (p) => ({ code: p.code, name: p.name }));

export const toMunicipalitiesResponse = (r: Result<readonly Municipality[], DomainError>): HttpResponseData =>
    listResponse('municipalities', r, (m) => ({
        name: m.name,
        provinceCode: m.provinceCode,
        ineCode: m.ineCode,
        cadastralCode: m.cadastralCode,
    }));

export const toStreetsResponse = (r: Result<readonly Street[], DomainError>): HttpResponseData =>
    listResponse('streets', r, (s) => ({ code: s.code, type: s.type, name: s.name }));

export const toStreetNumbersResponse = (r: Result<readonly StreetNumberEntry[], DomainError>): HttpResponseData =>
    listResponse('numbers', r, (n) => ({ number: n.number, suffix: n.suffix, cadastralReference14: n.cadastralReference14 }));

export const toPropertiesResponse = (r: Result<readonly PropertyRecord[], DomainError>): HttpResponseData =>
    listResponse('properties', r, serialize);

export const toReferenceResponse = (r: Result<ReferenceMatch, DomainError>): HttpResponseData =>
    r.ok
        ? {
              status: 200,
              body: {
                  reference: r.value.reference,
                  parcel: r.value.parcel,
                  sheet: r.value.sheet,
                  address: r.value.address,
                  coordinate: { longitude: r.value.longitude, latitude: r.value.latitude, srs: r.value.srs },
              },
          }
        : toErrorResponse(r.error);

export const internalErrorResponse = (): HttpResponseData => ({
    status: 500,
    body: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
});

export const notFoundRouteResponse = (): HttpResponseData => ({
    status: 404,
    body: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' },
});
