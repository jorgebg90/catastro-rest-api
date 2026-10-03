import { InvalidCadastralReferenceError, InvalidQueryError } from '../../domain/errors/index.js';
import { err, ok, type Result } from '../../domain/result.js';
import { CadastralReference } from '../../domain/value-objects/cadastral-reference.js';
import {
    AddressQuery,
    MunicipalityQuery,
    ParcelQuery,
    StreetNumberQuery,
    StreetQuery,
} from '../../domain/value-objects/queries.js';

/** Validates untrusted input (FR-010) and builds the value object before any use case is invoked. */
export const parseReferenceInput = (raw: unknown): Result<CadastralReference, InvalidCadastralReferenceError> => {
    if (typeof raw !== 'string') {
        return err(new InvalidCadastralReferenceError('Cadastral reference is required'));
    }
    return CadastralReference.from(raw);
};

type Params = URLSearchParams;
type Raw = Record<string, string | undefined>;

const raw = (params: Params): Raw => Object.fromEntries([...params.keys()].map((k) => [k, params.get(k) ?? undefined]));

export const parseMunicipalityQuery = (params: Params): Result<MunicipalityQuery, InvalidQueryError> => MunicipalityQuery.from(raw(params));
export const parseStreetQuery = (params: Params): Result<StreetQuery, InvalidQueryError> => StreetQuery.from(raw(params));
export const parseStreetNumberQuery = (params: Params): Result<StreetNumberQuery, InvalidQueryError> => StreetNumberQuery.from(raw(params));

export type PropertySearch =
    | { readonly kind: 'address'; readonly query: AddressQuery }
    | { readonly kind: 'parcel'; readonly query: ParcelQuery };

const ADDRESS_KEYS = ['streetType', 'streetName', 'number', 'block', 'staircase', 'floor', 'door'];
const PARCEL_KEYS = ['polygon', 'parcel'];

const hasAny = (values: Raw, keys: readonly string[]): boolean => keys.some((k) => (values[k] ?? '').trim() !== '');

/** US2-S4: exactly one of the address criteria or the polygon/parcel criteria must be given. */
export const parsePropertySearch = (params: Params): Result<PropertySearch, InvalidQueryError> => {
    const values = raw(params);
    const address = hasAny(values, ADDRESS_KEYS);
    const parcel = hasAny(values, PARCEL_KEYS);
    if (address && parcel) {
        return err(new InvalidQueryError('AMBIGUOUS_QUERY', 'Provide either address parameters or polygon and parcel, not both'));
    }
    if (!address && !parcel) {
        return err(new InvalidQueryError('MISSING_PARAMETER', 'Provide address parameters (streetType, streetName, number) or polygon and parcel'));
    }
    if (parcel) {
        const q = ParcelQuery.from(values);
        return q.ok ? ok({ kind: 'parcel', query: q.value }) : q;
    }
    const q = AddressQuery.from(values);
    return q.ok ? ok({ kind: 'address', query: q.value }) : q;
};
