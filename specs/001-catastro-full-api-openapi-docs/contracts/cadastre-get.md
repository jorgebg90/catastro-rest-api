# Upstream GET contract (verified live)

Base: `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/<Op>` (override with `CATASTRO_ENDPOINT` base). Responses are plain XML (no SOAP body). Business errors: HTTP 200 with `lerr.err{cod,des}`.

| Op | Query params | Success root path |
|----|--------------|-------------------|
| `ConsultaProvincia` | none | `consulta_provinciero > provinciero > prov{cpine,np}` |
| `ConsultaMunicipio` | `Provincia`, `Municipio` (may be empty) | `consulta_municipiero > municipiero > muni{nm,locat{cd,cmc},loine{cp,cm}}` |
| `ConsultaVia` | `Provincia`, `Municipio`, `TipoVia`, `NombreVia` | `consulta_callejero > callejero > calle > dir{cv,tv,nv}` |
| `ConsultaNumero` | `Provincia`, `Municipio`, `TipoVia`, `NomVia`, `Numero` | `consulta_numerero > numerero > nump{pc{pc1,pc2},num{pnp}}` |
| `Consulta_DNPLOC` | `Provincia`, `Municipio`, `Sigla`, `Calle`, `Numero`, `Bloque`, `Escalera`, `Planta`, `Puerta` | `consulta_dnp` with `lrcdnp.rcdnp[]` (several) or `bico` (single) |
| `Consulta_DNPPP` | `Provincia`, `Municipio`, `Poligono`, `Parcela` | `consulta_dnp > lrcdnp.rcdnp[]` |

Error codes seen: 4 malformed, 5 not found, 17 mandatory field missing, 43 no match. Exact XML is fixed from captured fixtures during implementation.
