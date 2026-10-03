# Upstream GET contract (verified live)

Base: `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/<Op>` (override with `CATASTRO_ENDPOINT` base). Responses are plain XML (no SOAP body). Business errors: HTTP 200 with `lerr.err{cod,des}`.

| Op | Query params | Success root path |
|----|--------------|-------------------|
| `ConsultaProvincia` | none | `consulta_provinciero > provinciero > prov{cpine,np}` |
| `ConsultaMunicipio` | `Provincia`, `Municipio` (may be empty) | `consulta_municipiero > municipiero > muni{nm,locat{cd,cmc},loine{cp,cm}}` |
| `ConsultaVia` | `Provincia`, `Municipio`, `TipoVia`, `NombreVia` | `consulta_callejero > callejero > calle > dir{cv,tv,nv}` |
| `ConsultaNumero` | `Provincia`, `Municipio`, `TipoVia`, `NomVia`, `Numero` | `consulta_numerero > numerero > nump{pc{pc1,pc2},num{pnp,plp}}` |
| `Consulta_DNPLOC` | `Provincia`, `Municipio`, `Sigla`, `Calle`, `Numero`, `Bloque`, `Escalera`, `Planta`, `Puerta` | `consulta_dnp` with `lrcdnp.rcdnp[]` (several) or `bico` (single) |
| `Consulta_DNPPP` | `Provincia`, `Municipio`, `Poligono`, `Parcela` | `consulta_dnp > lrcdnp.rcdnp[]` |

Notes (verified with captured fixtures in `tests/fixtures/soap/`):

- `Consulta_DNPLOC` needs every parameter present (empty allowed). A missing one yields plain text `Missing parameter: X.` with HTTP 200.
- `ConsultaVia` accepts an empty `NombreVia` but returns very large lists.
- `num.plp` is the street-number suffix (usually blank).
- Rustic properties come with `lors` (polygon/parcel) instead of an urban address.

Error codes seen: 4 malformed, 5 not found, 10 no street matches, 12 province does not exist, 17 mandatory field, 33 street does not exist, 41 number mandatory, 43 no match. Mapping: 5/10/12/33/43 or `NO EXISTE`/`NO HAY COINCIDENCIAS` -> 404; 4/17/41 or `OBLIGATORI` -> 400; other -> 502.
