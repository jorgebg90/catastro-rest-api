import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';

import { CadastreProtocolError } from '../../domain/errors/index.js';
import { err, ok, type Result } from '../../domain/result.js';

const str = z.string().optional();

const dtSchema = z.object({
    loine: z.object({ cp: str, cm: str }).optional(),
    np: str,
    nm: str,
    locs: z
        .object({
            lous: z
                .object({
                    lourb: z
                        .object({
                            dir: z.object({ tv: str, nv: str, pnp: str }).optional(),
                            loint: z.object({ pt: str, pu: str }).optional(),
                            dp: str,
                        })
                        .optional(),
                })
                .optional(),
        })
        .optional(),
});

const rcSchema = z.object({ pc1: z.string(), pc2: z.string(), car: z.string(), cc1: str, cc2: str });

const consSchema = z.object({
    lcd: str,
    dt: z.object({ lourb: z.object({ loint: z.object({ pt: str, pu: str }).optional() }).optional() }).optional(),
    dfcons: z.object({ stl: str }).optional(),
});

const biSchema = z.object({
    idbi: z.object({ cn: str, rc: rcSchema }),
    dt: dtSchema.optional(),
    ldt: str,
    debi: z.object({ luso: str, sfc: str, cpt: str, ant: str }).optional(),
});

const rcdnpSchema = z.object({ rc: rcSchema, dt: dtSchema.optional() });

const responseSchema = z.object({
    Envelope: z.object({
        Body: z.object({
            Consulta_DNP: z.object({
                consulta_dnp: z.object({
                    control: z.object({ cuerr: str }).optional(),
                    lerr: z.object({ err: z.array(z.object({ cod: z.string(), des: str })) }).optional(),
                    bico: z.object({ bi: biSchema, lcons: z.object({ cons: z.array(consSchema) }).optional() }).optional(),
                    lrcdnp: z.object({ rcdnp: z.array(rcdnpSchema) }).optional(),
                }),
            }),
        }),
    }),
});

export type DtData = z.infer<typeof dtSchema>;
export type BiData = z.infer<typeof biSchema>;
export type ConsData = z.infer<typeof consSchema>;
export type RcdnpData = z.infer<typeof rcdnpSchema>;

export type SuccessData =
    | { readonly shape: 'property'; readonly bi: BiData; readonly cons: readonly ConsData[] }
    | { readonly shape: 'parcel'; readonly items: readonly RcdnpData[] };

export type ParsedCadastreResponse =
    | { readonly kind: 'success'; readonly data: SuccessData }
    | { readonly kind: 'error'; readonly errors: readonly { readonly code: string; readonly description: string }[] };

const REPEATING = new Set(['rcdnp', 'cons', 'err']);

const parser = new XMLParser({
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
    ignoreAttributes: true,
    trimValues: true,
    isArray: (name) => REPEATING.has(name),
});

export const parseCadastreXml = (xml: string): Result<ParsedCadastreResponse, CadastreProtocolError> => {
    let raw: unknown;
    try {
        raw = parser.parse(xml);
    } catch {
        return err(new CadastreProtocolError('Cadastre response is not valid XML'));
    }
    const validated = responseSchema.safeParse(raw);
    if (!validated.success) {
        return err(new CadastreProtocolError('Cadastre response has an unexpected structure'));
    }
    const dnp = validated.data.Envelope.Body.Consulta_DNP.consulta_dnp;
    if (dnp.lerr) {
        return ok({
            kind: 'error',
            errors: dnp.lerr.err.map((e) => ({ code: e.cod, description: e.des ?? '' })),
        });
    }
    if (dnp.bico) {
        return ok({ kind: 'success', data: { shape: 'property', bi: dnp.bico.bi, cons: dnp.bico.lcons?.cons ?? [] } });
    }
    if (dnp.lrcdnp) {
        return ok({ kind: 'success', data: { shape: 'parcel', items: dnp.lrcdnp.rcdnp } });
    }
    return err(new CadastreProtocolError('Cadastre response has neither data nor errors'));
};
