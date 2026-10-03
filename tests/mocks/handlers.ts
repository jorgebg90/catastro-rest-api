import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { http, HttpResponse } from 'msw';

export const CATASTRO_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx';
export const CATASTRO_COORDINATES_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx';

export const loadFixture = (name: string): string =>
    readFileSync(join(import.meta.dirname, '..', 'fixtures', 'soap', name), 'utf8');

export const soapResponse = (fixture: string, status = 200) =>
    http.post(CATASTRO_URL, () =>
        new HttpResponse(loadFixture(fixture), { status, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }),
    );

/** MSW handler for the upstream HTTP GET binding of one operation. */
export const getResponse = (operation: string, fixture: string, status = 200) =>
    http.get(`${CATASTRO_URL}/${operation}`, () =>
        new HttpResponse(loadFixture(fixture), { status, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }),
    );

/** MSW handler for OVCCoordenadas.asmx/Consulta_RCCOOR with query-param matching (SRS, Coordenada_X, Coordenada_Y). */
export const coordinatesResponse = (
    matcher: { srs?: string; x?: string; y?: string },
    fixture: string,
    status = 200,
) =>
    http.get(CATASTRO_COORDINATES_URL, ({ request }) => {
        const url = new URL(request.url);
        const srs = url.searchParams.get('SRS');
        const x = url.searchParams.get('Coordenada_X');
        const y = url.searchParams.get('Coordenada_Y');

        const matches =
            (!matcher.srs || srs === matcher.srs) &&
            (!matcher.x || x === matcher.x) &&
            (!matcher.y || y === matcher.y);

        if (!matches) {
            return HttpResponse.json({ error: 'Parameter mismatch' }, { status: 400 });
        }

        return new HttpResponse(loadFixture(fixture), {
            status,
            headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        });
    });
