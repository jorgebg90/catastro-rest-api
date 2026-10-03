export class Province {
    public constructor(
        public readonly code: string,
        public readonly name: string,
    ) {
        Object.freeze(this);
    }
}

export interface MunicipalityProps {
    readonly cadastralCode: string | null;
    readonly ineCode: string | null;
    readonly provinceCode: string | null;
    readonly name: string;
}

export class Municipality {
    public readonly cadastralCode: string | null;
    public readonly ineCode: string | null;
    public readonly provinceCode: string | null;
    public readonly name: string;

    public constructor(props: MunicipalityProps) {
        this.cadastralCode = props.cadastralCode;
        this.ineCode = props.ineCode;
        this.provinceCode = props.provinceCode;
        this.name = props.name;
        Object.freeze(this);
    }
}

export class Street {
    public constructor(
        public readonly code: string | null,
        public readonly type: string | null,
        public readonly name: string,
    ) {
        Object.freeze(this);
    }
}

export class StreetNumberEntry {
    public constructor(
        public readonly number: string,
        public readonly suffix: string | null,
        public readonly cadastralReference14: string,
    ) {
        Object.freeze(this);
    }
}
