import type { PropertyRecord } from '../../domain/entities/property-record.js';
import { CadastreTimeoutError, CadastreUnavailableError, type DomainError } from '../../domain/errors/index.js';
import type { ICadastreGateway } from '../../domain/ports/cadastre-gateway.js';
import { err, ok, type Result } from '../../domain/result.js';
import type { CadastralReference } from '../../domain/value-objects/cadastral-reference.js';
import { parseCadastreXml } from '../mappers/cadastre-xml-parser.js';
import { mapCadastreErrors } from '../mappers/error-mapper.js';
import { mapToPropertyRecords } from '../mappers/property-mapper.js';
import { buildConsultaDnprcEnvelope, SOAP_ACTION } from './envelope.js';
import { type RetryOptions, withRetry } from './retry.js';

export interface CatastroSoapGatewayOptions {
    readonly endpoint: string;
    readonly timeoutMs: number;
    readonly retry?: RetryOptions;
    readonly fetchFn?: typeof fetch;
}

const DEFAULT_RETRY: RetryOptions = { maxAttempts: 3, baseDelayMs: 200, maxDelayMs: 1000, totalBudgetMs: 8000 };

export class CatastroSoapGateway implements ICadastreGateway {
    public constructor(private readonly options: CatastroSoapGatewayOptions) {}

    public async queryByReference(reference: CadastralReference): Promise<Result<readonly PropertyRecord[], DomainError>> {
        return withRetry(async () => this.attempt(reference), this.options.retry ?? DEFAULT_RETRY);
    }

    private async attempt(reference: CadastralReference): Promise<Result<readonly PropertyRecord[], DomainError>> {
        let xml: string;
        try {
            const response = await (this.options.fetchFn ?? fetch)(this.options.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: SOAP_ACTION },
                body: buildConsultaDnprcEnvelope(reference),
                signal: AbortSignal.timeout(this.options.timeoutMs),
            });
            if (!response.ok) {
                return err(new CadastreUnavailableError(`Cadastre responded with HTTP ${response.status}`));
            }
            xml = await response.text();
        } catch (error) {
            if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
                return err(new CadastreTimeoutError('Cadastre request timed out'));
            }
            return err(new CadastreUnavailableError('Cadastre is unreachable'));
        }

        const parsed = parseCadastreXml(xml);
        if (!parsed.ok) return parsed;
        if (parsed.value.kind === 'error') {
            return err(mapCadastreErrors(parsed.value.errors));
        }
        return ok(mapToPropertyRecords(parsed.value.data));
    }
}
