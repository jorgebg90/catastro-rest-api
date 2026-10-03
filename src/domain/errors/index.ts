import { DomainError } from './domain-error.js';

export { DomainError };

export class InvalidCadastralReferenceError extends DomainError {
    public readonly code = 'INVALID_CADASTRAL_REFERENCE';

    public constructor(message: string) {
        super(message);
    }
}

export class PropertyNotFoundError extends DomainError {
    public readonly code = 'PROPERTY_NOT_FOUND';

    public constructor(
        message: string,
        public readonly upstreamCode: string | null = null,
        public readonly upstreamDescription: string | null = null,
    ) {
        super(message);
    }
}

export class ReferenceNotFoundError extends DomainError {
    public readonly code = 'COORDINATE_NOT_FOUND';

    public constructor(
        message: string,
        public readonly upstreamCode: string | null = null,
        public readonly upstreamDescription: string | null = null,
    ) {
        super(message);
    }
}

export class CadastreTimeoutError extends DomainError {
    public readonly code = 'CADASTRE_TIMEOUT';

    public constructor(message: string) {
        super(message);
    }
}

export class CadastreUnavailableError extends DomainError {
    public readonly code = 'CADASTRE_UNAVAILABLE';

    public constructor(message: string) {
        super(message);
    }
}

export class CadastreProtocolError extends DomainError {
    public readonly code = 'CADASTRE_PROTOCOL_ERROR';

    public constructor(message: string) {
        super(message);
    }
}

export type InvalidQueryCode = 'MISSING_PARAMETER' | 'INVALID_PARAMETER' | 'AMBIGUOUS_QUERY';

/** Rejected input for the catalogue and search operations (SPEC-001 FR-002). */
export class InvalidQueryError extends DomainError {
    public readonly code: InvalidQueryCode;

    public constructor(code: InvalidQueryCode, message: string) {
        super(message);
        this.code = code;
    }
}

/** Empty or unknown catalogue result (SPEC-001 US1-S6). */
export class CatalogEntryNotFoundError extends DomainError {
    public readonly code = 'CATALOG_ENTRY_NOT_FOUND';

    public constructor(
        message: string,
        public readonly upstreamCode: string | null = null,
        public readonly upstreamDescription: string | null = null,
    ) {
        super(message);
    }
}
