import type { PropertyRecord } from '../entities/property-record.js';
import type { DomainError } from '../errors/index.js';
import type { Result } from '../result.js';
import type { CadastralReference } from '../value-objects/cadastral-reference.js';

export interface ICadastreGateway {
    queryByReference(reference: CadastralReference): Promise<Result<readonly PropertyRecord[], DomainError>>;
}
