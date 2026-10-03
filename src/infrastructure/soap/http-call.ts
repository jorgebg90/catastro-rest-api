import { CadastreTimeoutError, CadastreUnavailableError, type DomainError } from '../../domain/errors/index.js';
import { err, ok, type Result } from '../../domain/result.js';

export interface HttpCallOptions {
    readonly timeoutMs: number;
    readonly fetchFn?: typeof fetch;
}

/** Performs one upstream request; transport failures become domain errors (shared by every gateway, SPEC-001 FR-004). */
export const fetchText = async (
    url: string,
    init: RequestInit,
    options: HttpCallOptions,
): Promise<Result<string, DomainError>> => {
    try {
        const response = await (options.fetchFn ?? fetch)(url, { ...init, signal: AbortSignal.timeout(options.timeoutMs) });
        if (!response.ok) {
            return err(new CadastreUnavailableError(`Cadastre responded with HTTP ${response.status}`));
        }
        return ok(await response.text());
    } catch (error) {
        if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
            return err(new CadastreTimeoutError('Cadastre request timed out'));
        }
        return err(new CadastreUnavailableError('Cadastre is unreachable'));
    }
};
