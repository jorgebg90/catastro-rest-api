import type { PropertyRecord } from '../../domain/entities/property-record.js';
import {
    CadastreTimeoutError,
    type DomainError,
    InvalidCadastralReferenceError,
    PropertyNotFoundError,
} from '../../domain/errors/index.js';
import type { Result } from '../../domain/result.js';

export interface HttpResponseData {
    readonly status: number;
    readonly body: Readonly<Record<string, unknown>>;
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
    if (error instanceof InvalidCadastralReferenceError) return 400;
    if (error instanceof PropertyNotFoundError) return 404;
    if (error instanceof CadastreTimeoutError) return 504;
    return 502;
};

export const toHttpResponse = (
    reference: string,
    result: Result<readonly PropertyRecord[], DomainError>,
): HttpResponseData => {
    if (result.ok) {
        return { status: 200, body: { reference, properties: result.value.map(serialize) } };
    }
    const { error } = result;
    const body: Record<string, unknown> = { code: error.code, message: error.message };
    if (error instanceof PropertyNotFoundError) {
        body.upstream = { code: error.upstreamCode, description: error.upstreamDescription };
    }
    return { status: statusOf(error), body };
};

export const internalErrorResponse = (): HttpResponseData => ({
    status: 500,
    body: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
});

export const notFoundRouteResponse = (): HttpResponseData => ({
    status: 404,
    body: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' },
});
