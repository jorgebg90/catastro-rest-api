import {
    CadastreProtocolError,
    type DomainError,
    InvalidCadastralReferenceError,
    PropertyNotFoundError,
} from '../../domain/errors/index.js';

export interface CadastreBusinessError {
    readonly code: string;
    readonly description: string;
}

const NOT_FOUND = '5';
const MALFORMED = new Set(['4', '17']);

export const mapCadastreErrors = (errors: readonly CadastreBusinessError[]): DomainError => {
    const first = errors[0];
    if (first === undefined) return new CadastreProtocolError('Cadastre reported an error without details');
    if (first.code === NOT_FOUND) {
        return new PropertyNotFoundError('No property found for the given reference', first.code, first.description);
    }
    if (MALFORMED.has(first.code)) {
        return new InvalidCadastralReferenceError(first.description || 'Cadastral reference rejected by the Cadastre');
    }
    return new CadastreProtocolError(`Cadastre error ${first.code}: ${first.description}`);
};
