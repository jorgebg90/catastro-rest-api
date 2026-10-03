export type HandlerKey =
    | 'status'
    | 'docs'
    | 'openapi'
    | 'provinces'
    | 'municipalities'
    | 'streets'
    | 'streetNumbers'
    | 'properties'
    | 'propertyByReference';

export interface ParamDoc {
    readonly name: string;
    readonly in: 'query' | 'path';
    readonly required: boolean;
    readonly type: 'string' | 'integer';
    readonly description: string;
    readonly example: string;
}

export interface RouteDef {
    readonly method: 'GET';
    /** OpenAPI path template, e.g. `/properties/{reference}`. */
    readonly path: string;
    readonly handler: HandlerKey;
    readonly summary: string;
    readonly description: string;
    readonly parameters: readonly ParamDoc[];
    /** Name of the response schema in `components.schemas`, or a media type for non-JSON routes. */
    readonly response: { readonly schema: string } | { readonly contentType: string };
    readonly errorStatuses: readonly number[];
    readonly exampleUrl: string;
}

const q = (name: string, required: boolean, description: string, example: string, type: 'string' | 'integer' = 'string'): ParamDoc => ({
    name,
    in: 'query',
    required,
    type,
    description,
    example,
});

const province = q('province', true, 'Province name (case and accents are ignored), e.g. MADRID.', 'MADRID');
const municipality = (required: boolean) =>
    q('municipality', required, 'Municipality name or fragment, e.g. MADRID.', 'MADRID');

/** Single source for routing and documentation (SPEC-001 FR-009). */
export const ROUTES: readonly RouteDef[] = [
    {
        method: 'GET',
        path: '/',
        handler: 'status',
        summary: 'Service status',
        description: 'Readiness and discovery endpoint. Returns the documentation location.',
        parameters: [],
        response: { schema: 'Status' },
        errorStatuses: [],
        exampleUrl: '/',
    },
    {
        method: 'GET',
        path: '/docs',
        handler: 'docs',
        summary: 'HTML documentation',
        description: 'This page, rendered from the OpenAPI document.',
        parameters: [],
        response: { contentType: 'text/html' },
        errorStatuses: [],
        exampleUrl: '/docs',
    },
    {
        method: 'GET',
        path: '/openapi.json',
        handler: 'openapi',
        summary: 'OpenAPI document',
        description: 'Machine-readable description of the whole API (OpenAPI 3.0).',
        parameters: [],
        response: { contentType: 'application/json' },
        errorStatuses: [],
        exampleUrl: '/openapi.json',
    },
    {
        method: 'GET',
        path: '/provinces',
        handler: 'provinces',
        summary: 'List provinces',
        description: 'Every province with its INE code and name (upstream ConsultaProvincia).',
        parameters: [],
        response: { schema: 'ProvinceList' },
        errorStatuses: [502, 504],
        exampleUrl: '/provinces',
    },
    {
        method: 'GET',
        path: '/municipalities',
        handler: 'municipalities',
        summary: 'List municipalities of a province',
        description: 'Municipalities of a province, optionally filtered by a name fragment (upstream ConsultaMunicipio).',
        parameters: [province, municipality(false)],
        response: { schema: 'MunicipalityList' },
        errorStatuses: [400, 404, 502, 504],
        exampleUrl: '/municipalities?province=MADRID&municipality=ALCALA',
    },
    {
        method: 'GET',
        path: '/streets',
        handler: 'streets',
        summary: 'List streets of a municipality',
        description:
            'Streets of a municipality, optionally filtered by street type and a name fragment (upstream ConsultaVia). Without a name filter large municipalities return very long lists.',
        parameters: [
            province,
            municipality(true),
            q('streetType', false, 'Street type abbreviation (1-5 letters), e.g. CL, AV.', 'CL'),
            q('streetName', false, 'Street name or fragment.', 'SERRANO'),
        ],
        response: { schema: 'StreetList' },
        errorStatuses: [400, 404, 502, 504],
        exampleUrl: '/streets?province=MADRID&municipality=MADRID&streetType=CL&streetName=SERRANO',
    },
    {
        method: 'GET',
        path: '/street-numbers',
        handler: 'streetNumbers',
        summary: 'List street numbers',
        description: 'Entries of a street number with the 14-character parcel reference they belong to (upstream ConsultaNumero).',
        parameters: [
            province,
            municipality(true),
            q('streetType', true, 'Street type abbreviation (1-5 letters).', 'CL'),
            q('streetName', true, 'Street name.', 'SERRANO'),
            q('number', true, 'Street number (0-9999).', '30', 'integer'),
        ],
        response: { schema: 'StreetNumberList' },
        errorStatuses: [400, 404, 502, 504],
        exampleUrl: '/street-numbers?province=MADRID&municipality=MADRID&streetType=CL&streetName=SERRANO&number=30',
    },
    {
        method: 'GET',
        path: '/properties',
        handler: 'properties',
        summary: 'Search properties by address or by polygon and parcel',
        description:
            'Provide either an address (streetType, streetName, number and optional block, staircase, floor, door; upstream Consulta_DNPLOC) or a rustic location (polygon and parcel; upstream Consulta_DNPPP). Mixing both or providing neither returns 400.',
        parameters: [
            province,
            municipality(true),
            q('streetType', false, 'Address search: street type abbreviation.', 'CL'),
            q('streetName', false, 'Address search: street name.', 'SERRANO'),
            q('number', false, 'Address search: street number.', '30', 'integer'),
            q('block', false, 'Address search: block (max 4 chars).', 'A'),
            q('staircase', false, 'Address search: staircase (max 4 chars).', '1'),
            q('floor', false, 'Address search: floor (max 4 chars).', '02'),
            q('door', false, 'Address search: door (max 4 chars).', 'A'),
            q('polygon', false, 'Parcel search: polygon number.', '1', 'integer'),
            q('parcel', false, 'Parcel search: parcel number.', '1', 'integer'),
        ],
        response: { schema: 'PropertyList' },
        errorStatuses: [400, 404, 502, 504],
        exampleUrl: '/properties?province=MADRID&municipality=MADRID&streetType=CL&streetName=SERRANO&number=30',
    },
    {
        method: 'GET',
        path: '/properties/{reference}',
        handler: 'propertyByReference',
        summary: 'Property by cadastral reference',
        description: 'Properties for a 14 (parcel) or 20 (property) character cadastral reference (upstream Consulta_DNPRC).',
        parameters: [
            {
                name: 'reference',
                in: 'path',
                required: true,
                type: 'string',
                description: 'Cadastral reference (14 or 20 letters and digits).',
                example: '9872023VH5797S0001WX',
            },
        ],
        response: { schema: 'PropertyByReference' },
        errorStatuses: [400, 404, 502, 504],
        exampleUrl: '/properties/9872023VH5797S0001WX',
    },
];

export interface RouteMatch {
    readonly route: RouteDef;
    readonly pathParams: Readonly<Record<string, string>>;
}

const toPattern = (path: string): RegExp => new RegExp(`^${path.replace(/\{[^}]+\}/g, '([^/]+)')}$`);

export const matchRoute = (method: string, pathname: string): RouteMatch | null => {
    for (const route of ROUTES) {
        if (route.method !== method) continue;
        const m = toPattern(route.path).exec(pathname);
        if (!m) continue;
        const names = [...route.path.matchAll(/\{([^}]+)\}/g)].map((x) => x[1] as string);
        return { route, pathParams: Object.fromEntries(names.map((n, i) => [n, m[i + 1] as string])) };
    }
    return null;
};
