export type PropertyClass = 'URBAN' | 'RUSTIC';

export interface ConstructionProps {
    readonly use: string | null;
    readonly floor: string | null;
    readonly door: string | null;
    readonly surfaceSquareMeters: number | null;
}

export class Construction {
    public readonly use: string | null;
    public readonly floor: string | null;
    public readonly door: string | null;
    public readonly surfaceSquareMeters: number | null;

    public constructor(props: ConstructionProps) {
        this.use = props.use;
        this.floor = props.floor;
        this.door = props.door;
        this.surfaceSquareMeters = props.surfaceSquareMeters;
        Object.freeze(this);
    }
}

export interface PropertyRecordProps {
    readonly reference: string;
    readonly propertyClass: PropertyClass | null;
    readonly provinceCode: string | null;
    readonly provinceName: string | null;
    readonly municipalityCode: string | null;
    readonly municipalityName: string | null;
    readonly address: string;
    readonly postalCode: string | null;
    readonly use: string | null;
    readonly surfaceSquareMeters: number | null;
    readonly participationPercent: number | null;
    readonly constructionYear: number | null;
    readonly constructions: readonly Construction[];
}

export class PropertyRecord {
    public readonly reference: string;
    public readonly propertyClass: PropertyClass | null;
    public readonly provinceCode: string | null;
    public readonly provinceName: string | null;
    public readonly municipalityCode: string | null;
    public readonly municipalityName: string | null;
    public readonly address: string;
    public readonly postalCode: string | null;
    public readonly use: string | null;
    public readonly surfaceSquareMeters: number | null;
    public readonly participationPercent: number | null;
    public readonly constructionYear: number | null;
    public readonly constructions: readonly Construction[];

    public constructor(props: PropertyRecordProps) {
        this.reference = props.reference;
        this.propertyClass = props.propertyClass;
        this.provinceCode = props.provinceCode;
        this.provinceName = props.provinceName;
        this.municipalityCode = props.municipalityCode;
        this.municipalityName = props.municipalityName;
        this.address = props.address;
        this.postalCode = props.postalCode;
        this.use = props.use;
        this.surfaceSquareMeters = props.surfaceSquareMeters;
        this.participationPercent = props.participationPercent;
        this.constructionYear = props.constructionYear;
        this.constructions = Object.freeze([...props.constructions]);
        Object.freeze(this);
    }
}
