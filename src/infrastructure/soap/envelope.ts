import type { CadastralReference } from '../../domain/value-objects/cadastral-reference.js';

export const SOAP_ACTION = '"http://tempuri.org/OVCServWeb/OVCCallejero/Consulta_DNPRC"';
const NS = 'http://www.catastro.meh.es/';

export const buildConsultaDnprcEnvelope = (reference: CadastralReference): string =>
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>` +
    `<Provincia xmlns="${NS}"></Provincia><Municipio xmlns="${NS}"></Municipio>` +
    `<RefCat xmlns="${NS}">${reference.value}</RefCat>` +
    `</soap:Body></soap:Envelope>`;
