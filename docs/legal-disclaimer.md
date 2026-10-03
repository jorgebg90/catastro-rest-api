# Descargo de responsabilidad y términos de uso

> Documento informativo para el publicador del Actor en Apify. No constituye asesoramiento jurídico; conviene que lo revise un profesional antes de publicarlo en la Apify Store.

## 1. Naturaleza del servicio

Catastro REST API es una **pasarela técnica (wrapper)** que traduce a JSON/REST las consultas a los *Servicios Libres* de la Sede Electrónica del Catastro (`OVCSWLocalizacionRC`: `Consulta_DNPRC`, `ConsultaProvincia`, `ConsultaMunicipio`, `ConsultaVia`, `ConsultaNumero`, `Consulta_DNPLOC`, `Consulta_DNPPP`).

- No es un servicio oficial ni está afiliado, avalado ni patrocinado por la Dirección General del Catastro ni por el Ministerio de Hacienda.
- No almacena ni modifica los datos: los transforma de XML a JSON.
- Lo que se ofrece es el **servicio técnico** (formato JSON, disponibilidad, latencia, documentación OpenAPI y alojamiento en Apify), **no la propiedad de los datos catastrales**.

## 2. Origen de los datos y reutilización

- **Fuente:** Dirección General del Catastro (https://www.catastro.hacienda.gob.es). Cualquier uso o redistribución de los datos debe citarla.
- **Marco legal:** Ley 37/2007, de 16 de noviembre, sobre reutilización de la información del sector público, y sus directivas europeas derivadas. La información no protegida (referencia catastral, localización, superficie, uso, antigüedad) es de carácter público y reutilizable, también con fines comerciales.
- **Datos protegidos:** según el artículo 51 del Texto Refundido de la Ley del Catastro Inmobiliario, no pueden exponerse ni comercializarse por servicios libres la titularidad catastral (nombre, NIF, domicilio del titular) ni el valor catastral o los valores de referencia individualizados.
- Este Actor solo consume los Servicios Libres, que ya devuelven únicamente datos no protegidos. No se solicita, procesa ni almacena información de titulares. Los usuarios no deben usar el Actor para intentar obtener datos protegidos.
- Cada usuario es responsable del tratamiento que haga de los datos obtenidos (incluida la normativa de protección de datos que le sea aplicable).

## 3. Exención de responsabilidad

El servicio se presta «tal cual» y «según disponibilidad», sin garantías de ningún tipo.

- No se garantiza la disponibilidad ininterrumpida de la Sede Electrónica del Catastro. Si el Catastro falla o tarda, la API responde 502 o 504 (`CADASTRE_UNAVAILABLE`, `CADASTRE_PROTOCOL_ERROR`, `CADASTRE_TIMEOUT`).
- No se garantiza la exactitud, integridad ni actualidad de la información, que es la que publica el Catastro. Los datos no tienen valor jurídico ni sustituyen a la certificación catastral oficial.
- No se responde de los daños derivados del uso de la información (decisiones de compraventa, financieras, tributarias o de otro tipo).
- Los nombres de calle deben coincidir con los del Catastro (por ejemplo `RU` + `DR CARLOS COLMEIRO LAFORE`); una búsqueda sin resultados no implica que el inmueble no exista.

## 4. Uso razonable (fair use) y límites técnicos

La infraestructura del Catastro no admite abusos. Su Sede Electrónica puede bloquear de forma temporal o permanente las IP que realicen ataques de denegación de servicio o extracciones masivas.

- No uses el Actor para scraping masivo ni para barrer el callejero completo (`/streets` sin `streetName` devuelve listas muy grandes).
- Limita la concurrencia y reutiliza resultados en tu lado cuando sea posible.
- El Actor aplica *timeout* y reintentos acotados con *backoff* exponencial para no saturar al Catastro, pero no limita por sí mismo el número de peticiones de cada cliente.
- El publicador puede suspender el acceso de quien haga un uso abusivo.

Estado actual y mejoras recomendadas si el volumen crece (no implementadas en esta versión):

- **Caché** de las respuestas ya consultadas (memoria, Redis o Key-Value Store de Apify), ya que los datos catastrales cambian poco.
- **Apify Proxy** para distribuir las peticiones salientes. Es de pago y hay que configurarlo de forma explícita.
- **Limitación de tasa** por cliente.

## 5. Texto sugerido para la ficha del Actor (README de la Apify Store)

> **Fuente de los datos:** Dirección General del Catastro (Ministerio de Hacienda), reutilizados al amparo de la Ley 37/2007. Este Actor es una pasarela técnica independiente y no está afiliado ni respaldado por el Catastro. Solo accede a los Servicios Libres y a datos no protegidos; no devuelve titularidad ni valores catastrales. Se ofrece «tal cual», sin garantía de disponibilidad ni de exactitud de los datos. Los datos no sustituyen a la certificación catastral oficial. Haz un uso razonable del servicio.

## 6. Qué cubre el pago del servicio

Si el Actor se monetiza en Apify, el precio remunera exclusivamente la transformación técnica, el formato JSON, la disponibilidad, la latencia y la documentación del servicio. La información catastral sigue siendo pública y su fuente es el Catastro.

## 7. Pendiente (decisión del publicador)

- Incluir un campo de atribución en las respuestas (por ejemplo `source`). Hoy la atribución solo figura en la documentación.
- Revisar con asesoría legal los Términos de Servicio definitivos y los de Apify Store aplicables a la monetización.
