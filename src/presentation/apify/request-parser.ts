import { InvalidCadastralReferenceError } from '../../domain/errors/index.js';
import { err, type Result } from '../../domain/result.js';
import { CadastralReference } from '../../domain/value-objects/cadastral-reference.js';

/** Validates untrusted input (FR-010) and builds the value object before any use case is invoked. */
export const parseReferenceInput = (raw: unknown): Result<CadastralReference, InvalidCadastralReferenceError> => {
    if (typeof raw !== 'string') {
        return err(new InvalidCadastralReferenceError('Cadastral reference is required'));
    }
    return CadastralReference.from(raw);
};
