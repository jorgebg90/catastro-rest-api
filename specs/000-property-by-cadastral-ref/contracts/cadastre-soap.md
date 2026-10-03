# Upstream Contract: Catastro `Consulta_DNPRC` (verified 2026-10-03)

- Endpoint: `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx` (WSDL: same URL with `?WSDL`)
- Header: `Content-Type: text/xml; charset=utf-8`, `SOAPAction: "http://tempuri.org/OVCServWeb/OVCCallejero/Consulta_DNPRC"`

Request body (document style, no operation wrapper):

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Provincia xmlns="http://www.catastro.meh.es/"></Provincia>
    <Municipio xmlns="http://www.catastro.meh.es/"></Municipio>
    <RefCat xmlns="http://www.catastro.meh.es/">9872023VH5797S0001WX</RefCat>
  </soap:Body>
</soap:Envelope>
```

Response: `soap:Body > Consulta_DNP > consulta_dnp`.
- Success: `control.cudnp`, `bico.bi` (`idbi`, `dt`, `ldt`, `debi`), `bico.lcons.cons[]`.
- Business error (HTTP 200): `control.cuerr` + `lerr.err[].{cod, des}`. Observed: `4` not correctly formed; `17` reference mandatory.
- Decimal values use comma (`100,000000`).

Verified shapes (fixtures in `tests/fixtures/soap/`):
- `property-found.xml` (`9872023VH5797S0001WX`): `control.cudnp=1`, `bico.bi` + `bico.lcons.cons[]`.
- `parcel-found.xml` (`1853111VK4715D`, 11 properties): `control.cudnp=11`, `lrcdnp.rcdnp[]`, each with `rc` and `dt` only (no `idbi`, `ldt`, `debi`, constructions). A parcel with a single property returns the `bico` shape.
- `not-found.xml` (`9872023VH5797T`): `cuerr=1`, error `cod=5` "NO EXISTE NINGÚN INMUEBLE CON LOS PARÁMETROS INDICADOS".
- `malformed-ref.xml` (`0000000AA0000A0001AA`, bad check digits): error `cod=4`.
- Cadastre validates check digits; the API only validates format and length (research R5).
