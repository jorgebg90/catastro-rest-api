export interface ReferenceMatchProps {
    readonly parcel: string;
    readonly sheet: string;
    readonly address: string;
    readonly longitude: number;
    readonly latitude: number;
    readonly srs: string;
}

export class ReferenceMatch {
    public readonly reference: string;
    public readonly parcel: string;
    public readonly sheet: string;
    public readonly address: string;
    public readonly longitude: number;
    public readonly latitude: number;
    public readonly srs: string;

    public constructor(props: ReferenceMatchProps) {
        this.parcel = props.parcel;
        this.sheet = props.sheet;
        this.reference = props.parcel + props.sheet;
        this.address = props.address;
        this.longitude = props.longitude;
        this.latitude = props.latitude;
        this.srs = props.srs;
        Object.freeze(this);
    }
}
