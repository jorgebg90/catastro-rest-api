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
