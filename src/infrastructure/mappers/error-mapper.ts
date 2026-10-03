import {
    CadastreProtocolError,
    CatalogEntryNotFoundError,
    type DomainError,
    InvalidCadastralReferenceError,
    InvalidQueryError,
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

const NOT_FOUND_CODES = new Set(['5', '12', '33', '43']);
const INVALID_CODES = new Set(['4', '17', '41']);

const isNotFound = (e: CadastreBusinessError): boolean => NOT_FOUND_CODES.has(e.code) || /NO EXISTE/i.test(e.description);
const isInvalid = (e: CadastreBusinessError): boolean => INVALID_CODES.has(e.code) || /OBLIGATORI/i.test(e.description);

export type OperationKind = 'catalog' | 'property';

/** Maps business errors of the SPEC-001 operations: not found -> 404, rejected input -> 400, anything else -> protocol error (502). */
export const mapOperationErrors = (errors: readonly CadastreBusinessError[], kind: OperationKind): DomainError => {
    const first = errors[0];
    if (first === undefined) return new CadastreProtocolError('Cadastre reported an error without details');
    if (isNotFound(first)) {
        return kind === 'catalog'
            ? new CatalogEntryNotFoundError('No entries found for the given criteria', first.code, first.description)
            : new PropertyNotFoundError('No property found for the given criteria', first.code, first.description);
    }
    if (isInvalid(first)) return new InvalidQueryError('INVALID_PARAMETER', first.description || 'Query rejected by the Cadastre');
    return new CadastreProtocolError(`Cadastre error ${first.code}: ${first.description}`);
};
