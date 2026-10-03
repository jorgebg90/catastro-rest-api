import { CadastreTimeoutError, CadastreUnavailableError, type DomainError } from '../../domain/errors/index.js';
import type { Result } from '../../domain/result.js';

export interface RetryOptions {
    readonly maxAttempts: number;
    readonly baseDelayMs: number;
    readonly maxDelayMs: number;
    readonly totalBudgetMs: number;
    readonly random?: () => number;
}

const isTransient = (error: DomainError): boolean =>
    error instanceof CadastreTimeoutError || error instanceof CadastreUnavailableError;

const sleep = async (ms: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

/** Exponential backoff with jitter (50-100% of the capped delay); retries only transient failures. */
export const withRetry = async <T>(
    fn: () => Promise<Result<T, DomainError>>,
    options: RetryOptions,
): Promise<Result<T, DomainError>> => {
    const random = options.random ?? Math.random;
    const startedAt = Date.now();
    let attempt = 1;
    for (;;) {
        const result = await fn();
        if (result.ok || !isTransient(result.error) || attempt >= options.maxAttempts) return result;
        const cap = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** (attempt - 1));
        const delay = Math.round(cap * (0.5 + random() / 2));
        if (Date.now() - startedAt + delay > options.totalBudgetMs) return result;
        await sleep(delay);
        attempt += 1;
    }
};

export const DEFAULT_RETRY: RetryOptions = { maxAttempts: 3, baseDelayMs: 200, maxDelayMs: 1000, totalBudgetMs: 8000 };
