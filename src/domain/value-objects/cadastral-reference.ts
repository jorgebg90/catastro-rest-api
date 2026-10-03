import { InvalidCadastralReferenceError } from '../errors/index.js';
import { err, ok, type Result } from '../result.js';

export type CadastralReferenceKind = 'PARCEL' | 'PROPERTY';

const PATTERN = /^[A-Z0-9]+$/;

export class CadastralReference {
    private constructor(
        public readonly value: string,
        public readonly kind: CadastralReferenceKind,
    ) {
        Object.freeze(this);
    }

    public static from(raw: string): Result<CadastralReference, InvalidCadastralReferenceError> {
        const value = raw.replace(/^\s+|\s+$/g, '').toUpperCase();
        if (value.length !== 14 && value.length !== 20) {
            return err(new InvalidCadastralReferenceError('Cadastral reference must have 14 or 20 characters'));
        }
        if (!PATTERN.test(value)) {
            return err(new InvalidCadastralReferenceError('Cadastral reference must contain only letters A-Z and digits'));
        }
        return ok(new CadastralReference(value, value.length === 14 ? 'PARCEL' : 'PROPERTY'));
    }

    public equals(other: CadastralReference): boolean {
        return this.value === other.value;
    }

    public toString(): string {
        return this.value;
    }
}
