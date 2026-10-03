import type { Server } from 'node:http';

import { GetPropertyByRefUseCase } from '../../application/use-cases/get-property-by-ref.use-case.js';
import { CatastroSoapGateway } from '../../infrastructure/soap/catastro-soap-gateway.js';
import { createProxiedFetch } from '../../infrastructure/soap/proxy.js';
import type { RetryOptions } from '../../infrastructure/soap/retry.js';
import { apifyLogger,type AppLogger } from './logger.js';
import { createHttpServer } from './server.js';

export interface AppConfig {
    readonly port: number;
    readonly endpoint: string;
    readonly timeoutMs: number;
    readonly retry?: RetryOptions;
    readonly proxyUrl?: string;
    readonly logger?: AppLogger;
}

const DEFAULT_ENDPOINT = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx';

const intFromEnv = (value: string | undefined, fallback: number): number => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : fallback;
};

/** Reads tunables from the environment. `CATASTRO_USE_PROXY=true` enables the Apify proxy. */
export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Omit<AppConfig, 'proxyUrl'> & { useProxy: boolean } => ({
    port: intFromEnv(env.ACTOR_STANDBY_PORT ?? env.ACTOR_WEB_SERVER_PORT, 3000),
    endpoint: env.CATASTRO_ENDPOINT ?? DEFAULT_ENDPOINT,
    timeoutMs: intFromEnv(env.CATASTRO_TIMEOUT_MS, 5000),
    retry: {
        maxAttempts: intFromEnv(env.CATASTRO_RETRY_ATTEMPTS, 3),
        baseDelayMs: intFromEnv(env.CATASTRO_RETRY_BASE_MS, 200),
        maxDelayMs: intFromEnv(env.CATASTRO_RETRY_MAX_MS, 1000),
        totalBudgetMs: intFromEnv(env.CATASTRO_RETRY_BUDGET_MS, 10_000),
    },
    useProxy: env.CATASTRO_USE_PROXY === 'true',
});

export const buildServer = (config: AppConfig): Server => {
    const gateway = new CatastroSoapGateway({
        endpoint: config.endpoint,
        timeoutMs: config.timeoutMs,
        ...(config.retry ? { retry: config.retry } : {}),
        ...(config.proxyUrl ? { fetchFn: createProxiedFetch(config.proxyUrl) } : {}),
    });
    return createHttpServer({ useCase: new GetPropertyByRefUseCase(gateway), logger: config.logger ?? apifyLogger });
};
