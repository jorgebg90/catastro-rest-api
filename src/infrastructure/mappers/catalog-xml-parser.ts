import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';

import { Municipality, Province, Street, StreetNumberEntry } from '../../domain/entities/catalog.js';
import { CadastreProtocolError } from '../../domain/errors/index.js';
import { err, ok, type Result } from '../../domain/result.js';
import type { CadastreBusinessError } from './error-mapper.js';

const str = z.string().optional();
const lerr = z.object({ err: z.array(z.object({ cod: z.string(), des: str })) }).optional();

const provincesSchema = z.object({
    consulta_provinciero: z.object({ lerr, provinciero: z.object({ prov: z.array(z.object({ cpine: z.string(), np: z.string() })) }).optional() }),
});
const municipalitiesSchema = z.object({
    consulta_municipiero: z.object({
        lerr,
        municipiero: z
            .object({
                muni: z.array(
                    z.object({
                        nm: z.string(),
                        locat: z.object({ cmc: str }).optional(),
                        loine: z.object({ cp: str, cm: str }).optional(),
                    }),
                ),
            })
            .optional(),
    }),
});
const streetsSchema = z.object({
    consulta_callejero: z.object({
        lerr,
        callejero: z.object({ calle: z.array(z.object({ dir: z.object({ cv: str, tv: str, nv: z.string() }) })) }).optional(),
    }),
});
const numbersSchema = z.object({
    consulta_numerero: z.object({
        lerr,
        numerero: z
            .object({
                nump: z.array(z.object({ pc: z.object({ pc1: z.string(), pc2: z.string() }), num: z.object({ pnp: z.string(), plp: str }) })),
            })
            .optional(),
    }),
});

const REPEATING = new Set(['prov', 'muni', 'calle', 'nump', 'err']);

const parser = new XMLParser({
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
    ignoreAttributes: true,
    trimValues: true,
    isArray: (name) => REPEATING.has(name),
});

export type ParsedCatalog<T> =
    | { readonly kind: 'success'; readonly items: readonly T[] }
    | { readonly kind: 'error'; readonly errors: readonly CadastreBusinessError[] };

type Parsed<T> = Result<ParsedCatalog<T>, CadastreProtocolError>;

const run = <S extends z.ZodType, T>(
    xml: string,
    schema: S,
    pick: (data: z.infer<S>) => { lerr: z.infer<typeof lerr>; items: readonly T[] | undefined },
): Parsed<T> => {
    let raw: unknown;
    try {
        raw = parser.parse(xml);
    } catch {
        return err(new CadastreProtocolError('Cadastre response is not valid XML'));
    }
    const validated = schema.safeParse(raw);
    if (!validated.success) return err(new CadastreProtocolError('Cadastre response has an unexpected structure'));
    const { lerr: errors, items } = pick(validated.data);
    if (errors) return ok({ kind: 'error', errors: errors.err.map((e) => ({ code: e.cod, description: e.des ?? '' })) });
    if (items === undefined) return err(new CadastreProtocolError('Cadastre response has neither data nor errors'));
    return ok({ kind: 'success', items });
};

const orNull = (v: string | undefined): string | null => (v === undefined || v === '' ? null : v);

export const parseProvincesXml = (xml: string): Parsed<Province> =>
    run(xml, provincesSchema, (d) => ({
        lerr: d.consulta_provinciero.lerr,
        items: d.consulta_provinciero.provinciero?.prov.map((p) => new Province(p.cpine, p.np)),
    }));

export const parseMunicipalitiesXml = (xml: string): Parsed<Municipality> =>
    run(xml, municipalitiesSchema, (d) => ({
        lerr: d.consulta_municipiero.lerr,
        items: d.consulta_municipiero.municipiero?.muni.map(
            (m) =>
                new Municipality({
                    cadastralCode: orNull(m.locat?.cmc),
                    ineCode: orNull(m.loine?.cm),
                    provinceCode: orNull(m.loine?.cp),
                    name: m.nm,
                }),
        ),
    }));

export const parseStreetsXml = (xml: string): Parsed<Street> =>
    run(xml, streetsSchema, (d) => ({
        lerr: d.consulta_callejero.lerr,
        items: d.consulta_callejero.callejero?.calle.map((c) => new Street(orNull(c.dir.cv), orNull(c.dir.tv), c.dir.nv)),
    }));

export const parseStreetNumbersXml = (xml: string): Parsed<StreetNumberEntry> =>
    run(xml, numbersSchema, (d) => ({
        lerr: d.consulta_numerero.lerr,
        items: d.consulta_numerero.numerero?.nump.map(
            (n) => new StreetNumberEntry(n.num.pnp, orNull(n.num.plp), `${n.pc.pc1}${n.pc.pc2}`),
        ),
    }));
