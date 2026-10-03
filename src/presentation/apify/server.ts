import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import type { IGetPropertyByRefUseCase } from '../../application/ports/get-property-by-ref-use-case.js';
import { err } from '../../domain/result.js';
import { type HttpResponseData, internalErrorResponse, notFoundRouteResponse, toHttpResponse } from './http-mapper.js';
import type { AppLogger } from './logger.js';
import { parseReferenceInput } from './request-parser.js';

export interface ServerDeps {
    readonly useCase: IGetPropertyByRefUseCase;
    readonly logger: AppLogger;
}

const send = (res: ServerResponse, { status, body }: HttpResponseData): void => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
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

const handle = async (req: IncomingMessage, res: ServerResponse, deps: ServerDeps): Promise<void> => {
    if (req.headers['x-apify-container-server-readiness-probe']) {
        res.writeHead(200);
        res.end('ok');
        return;
    }
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (req.method === 'GET' && path === '/') {
        send(res, { status: 200, body: { status: 'ok' } });
        return;
    }
    const match = /^\/properties\/([^/]+)$/.exec(path);
    if (req.method === 'GET' && match?.[1] !== undefined) {
        send(res, await lookup(match[1], deps));
        return;
    }
    send(res, notFoundRouteResponse());
};

export const createHttpServer = (deps: ServerDeps): Server =>
    createServer((req, res) => {
        handle(req, res, deps).catch((error: unknown) => {
            deps.logger.error('Unhandled error', { error: error instanceof Error ? error.message : 'unknown' });
            if (!res.headersSent) send(res, internalErrorResponse());
            else res.end();
        });
    });

