import type { PropertyRecord } from '../../domain/entities/property-record.js';
import type { DomainError } from '../../domain/errors/index.js';
import type { ICadastreGateway } from '../../domain/ports/cadastre-gateway.js';
import type { Result } from '../../domain/result.js';
import type { CadastralReference } from '../../domain/value-objects/cadastral-reference.js';
import type { IGetPropertyByRefUseCase } from '../ports/get-property-by-ref-use-case.js';

/** Implements SPEC-000 scenarios US1-S1 and US1-S2 (specs/000-property-by-cadastral-ref/spec.md). */
export class GetPropertyByRefUseCase implements IGetPropertyByRefUseCase {
    public constructor(private readonly gateway: ICadastreGateway) {}

    public async execute(reference: CadastralReference): Promise<Result<readonly PropertyRecord[], DomainError>> {
        return this.gateway.queryByReference(reference);
    }
}
