import { InvalidQueryError } from '../errors/index.js';
import { err, ok, type Result } from '../result.js';

type Raw = string | undefined;
type QueryResult<T> = Result<T, InvalidQueryError>;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

const clean = (raw: Raw): string => (raw ?? '').trim();

const text = (name: string, raw: Raw, maxLength: number, required: boolean): QueryResult<string> => {
    const value = clean(raw);
    if (value === '') {
        return required ? err(new InvalidQueryError('MISSING_PARAMETER', `Parameter '${name}' is required`)) : ok('');
    }
    if (value.length > maxLength || CONTROL_CHARS.test(value)) {
        return err(new InvalidQueryError('INVALID_PARAMETER', `Parameter '${name}' is invalid`));
    }
    return ok(value);
};

const integer = (name: string, raw: Raw, max: number): QueryResult<number> => {
    const value = clean(raw);
    if (value === '') return err(new InvalidQueryError('MISSING_PARAMETER', `Parameter '${name}' is required`));
    if (!/^\d+$/.test(value) || Number(value) > max) {
        return err(new InvalidQueryError('INVALID_PARAMETER', `Parameter '${name}' must be an integer between 0 and ${max}`));
    }
    return ok(Number(value));
};

const parseStreetType = (raw: Raw, required: boolean): QueryResult<string> => {
    const value = clean(raw);
    if (value !== '' && !/^\p{L}{1,5}$/u.test(value)) {
        return err(new InvalidQueryError('INVALID_PARAMETER', "Parameter 'streetType' must be 1-5 letters"));
    }
    return value === '' && required
        ? err(new InvalidQueryError('MISSING_PARAMETER', "Parameter 'streetType' is required"))
        : ok(value);
};

/** Collects the first failure of several field validations. */
const collect = <T extends Record<string, unknown>>(fields: { [K in keyof T]: QueryResult<T[K]> }): QueryResult<T> => {
    const out: Record<string, unknown> = {};
    for (const [key, result] of Object.entries<QueryResult<unknown>>(fields)) {
        if (!result.ok) return result;
        out[key] = result.value;
    }
    return ok(out as T);
};

export interface LocationInput {
    readonly province?: Raw;
    readonly municipality?: Raw;
}

export class MunicipalityQuery {
    private constructor(
        public readonly province: string,
        public readonly municipality: string,
    ) {
        Object.freeze(this);
    }

    public static from(input: LocationInput): QueryResult<MunicipalityQuery> {
        const r = collect({ province: text('province', input.province, 60, true), municipality: text('municipality', input.municipality, 100, false) });
        return r.ok ? ok(new MunicipalityQuery(r.value.province, r.value.municipality)) : r;
    }
}

export interface StreetInput extends LocationInput {
    readonly streetType?: Raw;
    readonly streetName?: Raw;
}

export class StreetQuery {
    private constructor(
        public readonly province: string,
        public readonly municipality: string,
        public readonly streetType: string,
        public readonly streetName: string,
    ) {
        Object.freeze(this);
    }

    public static from(input: StreetInput): QueryResult<StreetQuery> {
        const r = collect({
            province: text('province', input.province, 60, true),
            municipality: text('municipality', input.municipality, 100, true),
            streetType: parseStreetType(input.streetType, false),
            streetName: text('streetName', input.streetName, 100, false),
        });
        return r.ok ? ok(new StreetQuery(r.value.province, r.value.municipality, r.value.streetType, r.value.streetName)) : r;
    }
}

export interface StreetNumberInput extends StreetInput {
    readonly number?: Raw;
}

export class StreetNumberQuery {
    private constructor(
        public readonly province: string,
        public readonly municipality: string,
        public readonly streetType: string,
        public readonly streetName: string,
        public readonly number: number,
    ) {
        Object.freeze(this);
    }

    public static from(input: StreetNumberInput): QueryResult<StreetNumberQuery> {
        const r = collect({
            province: text('province', input.province, 60, true),
            municipality: text('municipality', input.municipality, 100, true),
            streetType: parseStreetType(input.streetType, true),
            streetName: text('streetName', input.streetName, 100, true),
            number: integer('number', input.number, 9999),
        });
        return r.ok
            ? ok(new StreetNumberQuery(r.value.province, r.value.municipality, r.value.streetType, r.value.streetName, r.value.number))
            : r;
    }
}

export interface UnitInput {
    readonly block?: Raw;
    readonly staircase?: Raw;
    readonly floor?: Raw;
    readonly door?: Raw;
}

export interface AddressInput extends StreetNumberInput, UnitInput {}

export class AddressQuery {
    private constructor(
        public readonly province: string,
        public readonly municipality: string,
        public readonly streetType: string,
        public readonly streetName: string,
        public readonly number: number,
        public readonly block: string,
        public readonly staircase: string,
        public readonly floor: string,
        public readonly door: string,
    ) {
        Object.freeze(this);
    }

    public static from(input: AddressInput): QueryResult<AddressQuery> {
        const r = collect({
            province: text('province', input.province, 60, true),
            municipality: text('municipality', input.municipality, 100, true),
            streetType: parseStreetType(input.streetType, true),
            streetName: text('streetName', input.streetName, 100, true),
            number: integer('number', input.number, 9999),
            block: text('block', input.block, 4, false),
            staircase: text('staircase', input.staircase, 4, false),
            floor: text('floor', input.floor, 4, false),
            door: text('door', input.door, 4, false),
        });
        if (!r.ok) return r;
        const v = r.value;
        return ok(new AddressQuery(v.province, v.municipality, v.streetType, v.streetName, v.number, v.block, v.staircase, v.floor, v.door));
    }
}

export interface ParcelInput extends LocationInput {
    readonly polygon?: Raw;
    readonly parcel?: Raw;
}

export class ParcelQuery {
    private constructor(
        public readonly province: string,
        public readonly municipality: string,
        public readonly polygon: number,
        public readonly parcel: number,
    ) {
        Object.freeze(this);
    }

    public static from(input: ParcelInput): QueryResult<ParcelQuery> {
        const r = collect({
            province: text('province', input.province, 60, true),
            municipality: text('municipality', input.municipality, 100, true),
            polygon: integer('polygon', input.polygon, 9999),
            parcel: integer('parcel', input.parcel, 99_999),
        });
        return r.ok ? ok(new ParcelQuery(r.value.province, r.value.municipality, r.value.polygon, r.value.parcel)) : r;
    }
}
