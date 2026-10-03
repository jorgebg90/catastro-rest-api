import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import type {
    IListMunicipalitiesUseCase,
    IListProvincesUseCase,
    IListStreetNumbersUseCase,
    IListStreetsUseCase,
} from '../../application/ports/catalog-use-cases.js';
import type { IFindReferenceByCoordinatesUseCase } from '../../application/ports/find-reference-by-coordinates-use-case.js';
import type { IGetPropertyByRefUseCase } from '../../application/ports/get-property-by-ref-use-case.js';
import type { ISearchPropertiesByAddressUseCase, ISearchPropertiesByParcelUseCase } from '../../application/ports/search-use-cases.js';
import { err } from '../../domain/result.js';
import { buildOpenApiDocument } from '../docs/openapi.js';
import { type HandlerKey, matchRoute } from '../docs/routes.js';
import { getDocsAsset, SWAGGER_INDEX_HTML } from '../docs/swagger-ui.js';
import {
    type HtmlResponseData,
    type HttpResponseData,
    internalErrorResponse,
    notFoundRouteResponse,
    toErrorResponse,
    toHttpResponse,
    toMunicipalitiesResponse,
    toPropertiesResponse,
    toProvincesResponse,
    toReferenceResponse,
    toStreetNumbersResponse,
    toStreetsResponse,
} from './http-mapper.js';
import type { AppLogger } from './logger.js';
import {
    parseCoordinate,
    parseMunicipalityQuery,
    parsePropertySearch,
    parseReferenceInput,
    parseStreetNumberQuery,
    parseStreetQuery,
} from './request-parser.js';

export interface ServerDeps {
    readonly useCase: IGetPropertyByRefUseCase;
    readonly provinces: IListProvincesUseCase;
    readonly municipalities: IListMunicipalitiesUseCase;
    readonly streets: IListStreetsUseCase;
    readonly streetNumbers: IListStreetNumbersUseCase;
    readonly searchByAddress: ISearchPropertiesByAddressUseCase;
    readonly searchByParcel: ISearchPropertiesByParcelUseCase;
    readonly referenceByCoordinates: IFindReferenceByCoordinatesUseCase;
    readonly logger: AppLogger;
}

type RouteResponse = HttpResponseData | HtmlResponseData;

interface Ctx {
    readonly deps: ServerDeps;
    readonly params: URLSearchParams;
    readonly pathParams: Readonly<Record<string, string>>;
}

const send = (res: ServerResponse, response: RouteResponse): void => {
    if ('html' in response) {
        res.writeHead(response.status, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(response.html);
        return;
    }
    res.writeHead(response.status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(response.body));
};

const decodeSegment = (segment: string): string | null => {
    try {
        return decodeURIComponent(segment);
    } catch {
        return null;
    }
};

const lookup = async (rawSegment: string, deps: ServerDeps): Promise<HttpResponseData> => {
    const decoded = decodeSegment(rawSegment);
    const parsed = parseReferenceInput(decoded);
    if (!parsed.ok) return toHttpResponse(decoded ?? '', err(parsed.error));
    const result = await deps.useCase.execute(parsed.value);
    const response = toHttpResponse(parsed.value.value, result);
    deps.logger.info('Property lookup', { reference: parsed.value.value, status: response.status });
    return response;
};

const search = async ({ deps, params }: Ctx): Promise<HttpResponseData> => {
    const parsed = parsePropertySearch(params);
    if (!parsed.ok) return toErrorResponse(parsed.error);
    const result =
        parsed.value.kind === 'address'
            ? await deps.searchByAddress.execute(parsed.value.query)
            : await deps.searchByParcel.execute(parsed.value.query);
    const response = toPropertiesResponse(result);
    deps.logger.info('Property search', { kind: parsed.value.kind, status: response.status });
    return response;
};

const openApi = buildOpenApiDocument();

const HANDLERS: Readonly<Record<HandlerKey, (ctx: Ctx) => Promise<RouteResponse>>> = {
    status: async () => ({ status: 200, body: { status: 'ok', docs: '/docs' } }),
    docs: async () => ({ status: 200, html: SWAGGER_INDEX_HTML }),
    openapi: async () => ({ status: 200, body: openApi as Readonly<Record<string, unknown>> }),
    provinces: async ({ deps }) => toProvincesResponse(await deps.provinces.execute()),
    municipalities: async ({ deps, params }) => {
        const q = parseMunicipalityQuery(params);
        return q.ok ? toMunicipalitiesResponse(await deps.municipalities.execute(q.value)) : toErrorResponse(q.error);
    },
    streets: async ({ deps, params }) => {
        const q = parseStreetQuery(params);
        return q.ok ? toStreetsResponse(await deps.streets.execute(q.value)) : toErrorResponse(q.error);
    },
    streetNumbers: async ({ deps, params }) => {
        const q = parseStreetNumberQuery(params);
        return q.ok ? toStreetNumbersResponse(await deps.streetNumbers.execute(q.value)) : toErrorResponse(q.error);
    },
    properties: search,
    referenceByCoordinates: async ({ deps, params }) => {
        const c = parseCoordinate(params);
        if (!c.ok) return toErrorResponse(c.error);
        const response = toReferenceResponse(await deps.referenceByCoordinates.find(c.value));
        deps.logger.info('Reference by coordinates', { status: response.status });
        return response;
    },
    propertyByReference: async ({ deps, pathParams }) => lookup(pathParams.reference ?? '', deps),
};

const handle = async (req: IncomingMessage, res: ServerResponse, deps: ServerDeps): Promise<void> => {
    if (req.headers['x-apify-container-server-readiness-probe']) {
        res.writeHead(200);
        res.end('ok');
        return;
    }
    const url = new URL(req.url ?? '/', 'http://localhost');
    const asset = req.method === 'GET' ? getDocsAsset(url.pathname) : null;
    if (asset) {
        res.writeHead(200, { 'Content-Type': asset.contentType, 'Cache-Control': 'public, max-age=3600' });
        res.end(asset.body);
        return;
    }
    const match = matchRoute(req.method ?? 'GET', url.pathname);
    if (!match) {
        send(res, notFoundRouteResponse());
        return;
    }
    send(res, await HANDLERS[match.route.handler]({ deps, params: url.searchParams, pathParams: match.pathParams }));
};

export const createHttpServer = (deps: ServerDeps): Server =>
    createServer((req, res) => {
        handle(req, res, deps).catch((error: unknown) => {
            deps.logger.error('Unhandled error', { error: error instanceof Error ? error.message : 'unknown' });
            if (!res.headersSent) send(res, internalErrorResponse());
            else res.end();
        });
    });
