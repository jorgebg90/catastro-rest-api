import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { http, HttpResponse } from 'msw';

export const CATASTRO_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx';

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
