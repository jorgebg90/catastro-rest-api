import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';

import { CadastreProtocolError } from '../../domain/errors/index.js';
import { err, ok, type Result } from '../../domain/result.js';

const str = z.string().optional();

const coordSchema = z.object({
    pc: z.object({ pc1: z.string(), pc2: z.string() }),
    geo: z.object({ xcen: z.string(), ycen: z.string(), srs: z.string() }),
    ldt: z.string(),
});

const rccoorSchema = z.object({
    control: z.object({ cucoor: str, cuerr: z.string() }),
    coordenadas: z.object({ coord: coordSchema }).optional(),
    lerr: z.object({ err: z.array(z.object({ cod: z.string(), des: str })) }).optional(),
});

const responseSchema = z.object({ consulta_coordenadas: rccoorSchema });

export type ParsedCoordinateResponse =
    | {
          readonly kind: 'success';
          readonly parcel: string;
          readonly sheet: string;
          readonly address: string;
          readonly longitude: number;
          readonly latitude: number;
          readonly srs: string;
      }
    | { readonly kind: 'error'; readonly errors: readonly { readonly code: string; readonly description: string }[] };

const REPEATING = new Set(['err']);

const parser = new XMLParser({
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
    ignoreAttributes: true,
    trimValues: true,
    isArray: (name) => REPEATING.has(name),
});

const interpret = (rccoor: z.infer<typeof rccoorSchema>): Result<ParsedCoordinateResponse, CadastreProtocolError> => {
    if (rccoor.lerr) {
        return ok({
            kind: 'error',
            errors: rccoor.lerr.err.map((e) => ({ code: e.cod, description: e.des ?? '' })),
        });
    }
    if (rccoor.coordenadas?.coord) {
        const {coord} = rccoor.coordenadas;
        return ok({
            kind: 'success',
            parcel: coord.pc.pc1,
            sheet: coord.pc.pc2,
            address: coord.ldt,
            longitude: Number(coord.geo.xcen),
            latitude: Number(coord.geo.ycen),
            srs: coord.geo.srs,
        });
    }
    return err(new CadastreProtocolError('Cadastre response has neither data nor errors'));
};

const parseRaw = (xml: string): Result<unknown, CadastreProtocolError> => {
    try {
        return ok(parser.parse(xml));
    } catch {
        return err(new CadastreProtocolError('Cadastre response is not valid XML'));
    }
};

const UNEXPECTED = 'Cadastre response has an unexpected structure';

/** Plain (GET binding) `Consulta_RCCOOR` response. */
export const parseCoordinateXml = (xml: string): Result<ParsedCoordinateResponse, CadastreProtocolError> => {
    const raw = parseRaw(xml);
    if (!raw.ok) return raw;
    const validated = responseSchema.safeParse(raw.value);
    if (!validated.success) return err(new CadastreProtocolError(UNEXPECTED));
    return interpret(validated.data.consulta_coordenadas);
};
