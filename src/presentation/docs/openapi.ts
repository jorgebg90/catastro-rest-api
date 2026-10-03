import { ROUTES } from './routes.js';

type Json = Readonly<Record<string, unknown>>;

const nullable = (type: string): Json => ({ type, nullable: true });

const SCHEMAS: Json = {
    Error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
            code: { type: 'string', example: 'MISSING_PARAMETER' },
            message: { type: 'string' },
            upstream: {
                type: 'object',
                description: 'Present on 404 responses: the Cadastre error code and description.',
                properties: { code: nullable('string'), description: nullable('string') },
            },
        },
    },
    Status: { type: 'object', properties: { status: { type: 'string', example: 'ok' }, docs: { type: 'string', example: '/docs' } } },
    Province: { type: 'object', required: ['code', 'name'], properties: { code: { type: 'string', example: '28' }, name: { type: 'string', example: 'MADRID' } } },
    ProvinceList: { type: 'object', properties: { provinces: { type: 'array', items: { $ref: '#/components/schemas/Province' } } } },
    Municipality: {
        type: 'object',
        required: ['name'],
        properties: {
            name: { type: 'string', example: 'ALCALA DE HENARES' },
            provinceCode: nullable('string'),
            ineCode: nullable('string'),
            cadastralCode: nullable('string'),
        },
    },
    MunicipalityList: { type: 'object', properties: { municipalities: { type: 'array', items: { $ref: '#/components/schemas/Municipality' } } } },
    Street: {
        type: 'object',
        required: ['name'],
        properties: { code: nullable('string'), type: nullable('string'), name: { type: 'string', example: 'SERRANO' } },
    },
    StreetList: { type: 'object', properties: { streets: { type: 'array', items: { $ref: '#/components/schemas/Street' } } } },
    StreetNumberEntry: {
        type: 'object',
        required: ['number', 'cadastralReference14'],
        properties: { number: { type: 'string', example: '30' }, suffix: nullable('string'), cadastralReference14: { type: 'string', example: '1853111VK4715D' } },
    },
    StreetNumberList: { type: 'object', properties: { numbers: { type: 'array', items: { $ref: '#/components/schemas/StreetNumberEntry' } } } },
    Construction: {
        type: 'object',
        properties: { use: nullable('string'), floor: nullable('string'), door: nullable('string'), surfaceSquareMeters: nullable('number') },
    },
    Property: {
        type: 'object',
        required: ['reference', 'address', 'constructions'],
        properties: {
            reference: { type: 'string', example: '9872023VH5797S0001WX' },
            propertyClass: { type: 'string', enum: ['URBAN', 'RUSTIC'], nullable: true },
            provinceCode: nullable('string'),
            provinceName: nullable('string'),
            municipalityCode: nullable('string'),
            municipalityName: nullable('string'),
            address: { type: 'string' },
            postalCode: nullable('string'),
            use: nullable('string'),
            surfaceSquareMeters: nullable('number'),
            participationPercent: nullable('number'),
            constructionYear: nullable('integer'),
            constructions: { type: 'array', items: { $ref: '#/components/schemas/Construction' } },
        },
    },
    PropertyList: { type: 'object', properties: { properties: { type: 'array', items: { $ref: '#/components/schemas/Property' } } } },
    PropertyByReference: {
        type: 'object',
        properties: { reference: { type: 'string' }, properties: { type: 'array', items: { $ref: '#/components/schemas/Property' } } },
    },
};

const ERROR_DESCRIPTIONS: Readonly<Record<number, string>> = {
    400: 'Invalid or missing parameters (code MISSING_PARAMETER, INVALID_PARAMETER, AMBIGUOUS_QUERY or INVALID_CADASTRAL_REFERENCE).',
    404: 'Nothing found for the given criteria.',
    502: 'The Cadastre is unavailable or returned an unexpected response.',
    504: 'The Cadastre did not answer in time.',
};

const errorResponse = (status: number): Json => ({
    description: ERROR_DESCRIPTIONS[status] ?? 'Error',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

export const buildOpenApiDocument = (): Json => {
    const paths: Record<string, Record<string, unknown>> = {};
    for (const route of ROUTES) {
        const ok: Json =
            'schema' in route.response
                ? { description: 'OK', content: { 'application/json': { schema: { $ref: `#/components/schemas/${route.response.schema}` } } } }
                : { description: 'OK', content: { [route.response.contentType]: { schema: { type: 'string' } } } };
        paths[route.path] = {
            ...paths[route.path],
            [route.method.toLowerCase()]: {
                summary: route.summary,
                description: route.description,
                operationId: route.handler,
                parameters: route.parameters.map((p) => ({
                    name: p.name,
                    in: p.in,
                    required: p.required,
                    description: p.description,
                    schema: { type: p.type },
                    example: p.type === 'integer' ? Number(p.example) : p.example,
                })),
                responses: { '200': ok, ...Object.fromEntries(route.errorStatuses.map((s) => [String(s), errorResponse(s)])) },
            },
        };
    }
    return {
        openapi: '3.0.3',
        info: {
            title: 'Catastro REST API',
            version: '1.1.0',
            description: 'Synchronous REST wrapper over the Spanish Cadastre (Catastro) OVCCallejero web service.',
        },
        servers: [{ url: '/' }],
        paths,
        components: { schemas: SCHEMAS },
    };
};
