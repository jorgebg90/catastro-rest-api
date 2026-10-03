# Upstream contract: Consulta_RCCOOR (verified live)

`GET https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR?SRS=<srs>&Coordenada_X=<lon>&Coordenada_Y=<lat>`

Namespace `http://www.catastro.meh.es/`. HTTP 200 for success and business errors.

Success:

```xml
<consulta_coordenadas><control><cucoor>1</cucoor><cuerr>0</cuerr></control>
  <coordenadas><coord>
    <pc><pc1>0142208</pc1><pc2>VK4704A</pc2></pc>
    <geo><xcen>-3.70720</xcen><ycen>40.41446</ycen><srs>EPSG:4326</srs></geo>
    <ldt>CL IMPERIAL 14 MADRID (MADRID)</ldt>
  </coord></coordenadas></consulta_coordenadas>
```

Error: `control.cuerr = 1` and `lerr.err{cod,des}`; codes in [research.md](../research.md) R4.
