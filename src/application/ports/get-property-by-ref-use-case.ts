import type { PropertyRecord } from '../../domain/entities/property-record.js';
import type { DomainError } from '../../domain/errors/index.js';
import type { Result } from '../../domain/result.js';
import type { CadastralReference } from '../../domain/value-objects/cadastral-reference.js';

export interface IGetPropertyByRefUseCase {
    execute(reference: CadastralReference): Promise<Result<readonly PropertyRecord[], DomainError>>;
}
