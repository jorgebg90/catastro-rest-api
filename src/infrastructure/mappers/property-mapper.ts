import { Construction, PropertyRecord } from '../../domain/entities/property-record.js';
import type { ConsData, DtData, SuccessData } from './cadastre-xml-parser.js';

const text = (v: string | undefined): string | null => (v === undefined || v === '' ? null : v);

const num = (v: string | undefined): number | null => {
    const t = text(v);
    if (t === null) return null;
    const n = Number(t.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};

const referenceOf = (rc: { pc1: string; pc2: string; car: string; cc1?: string | undefined; cc2?: string | undefined }) =>
    `${rc.pc1}${rc.pc2}${rc.car}${rc.cc1 ?? ''}${rc.cc2 ?? ''}`;

const composeAddress = (dt: DtData | undefined): string => {
    const urb = dt?.locs?.lous?.lourb;
    const rus = dt?.locs?.lors?.lorus;
    const parts = [
        rus?.npa,
        rus?.cpp?.cpo ? `Pol:${rus.cpp.cpo}` : undefined,
        rus?.cpp?.cpa ? `Parc:${rus.cpp.cpa}` : undefined,
        urb?.dir?.tv,
        urb?.dir?.nv,
        urb?.dir?.pnp,
        urb?.loint?.pt ? `Pl:${urb.loint.pt}` : undefined,
        urb?.loint?.pu ? `Pt:${urb.loint.pu}` : undefined,
        urb?.dp,
        dt?.nm,
        dt?.np ? `(${dt.np})` : undefined,
    ];
    return parts.filter((p): p is string => p !== undefined && p !== '').join(' ');
};

const location = (dt: DtData | undefined) => ({
    provinceCode: text(dt?.loine?.cp),
    provinceName: text(dt?.np),
    municipalityCode: text(dt?.loine?.cm),
    municipalityName: text(dt?.nm),
    postalCode: text(dt?.locs?.lous?.lourb?.dp),
});

const mapConstruction = (c: ConsData): Construction =>
    new Construction({
        use: text(c.lcd),
        floor: text(c.dt?.lourb?.loint?.pt),
        door: text(c.dt?.lourb?.loint?.pu),
        surfaceSquareMeters: num(c.dfcons?.stl),
    });

const mapClass = (cn: string | undefined): 'URBAN' | 'RUSTIC' | null => {
    if (cn === 'UR') return 'URBAN';
    if (cn === 'RU') return 'RUSTIC';
    return null;
};

export const mapToPropertyRecords = (data: SuccessData): readonly PropertyRecord[] => {
    if (data.shape === 'property') {
        const { bi } = data;
        return [
            new PropertyRecord({
                reference: referenceOf(bi.idbi.rc),
                propertyClass: mapClass(bi.idbi.cn),
                ...location(bi.dt),
                address: text(bi.ldt) ?? composeAddress(bi.dt),
                use: text(bi.debi?.luso),
                surfaceSquareMeters: num(bi.debi?.sfc),
                participationPercent: num(bi.debi?.cpt),
                constructionYear: num(bi.debi?.ant),
                constructions: data.cons.map(mapConstruction),
            }),
        ];
    }
    return data.items.map(
        (item) =>
            new PropertyRecord({
                reference: referenceOf(item.rc),
                propertyClass: null,
                ...location(item.dt),
                address: composeAddress(item.dt),
                use: null,
                surfaceSquareMeters: null,
                participationPercent: null,
                constructionYear: null,
                constructions: [],
            }),
    );
};
