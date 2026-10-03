# Legal disclaimer and terms of use

> Informational document for the Actor publisher on Apify. It is not legal advice; have a professional review it before publishing on the Apify Store.

## 1. Nature of the service

Catastro REST API is a **technical gateway (wrapper)** that exposes the *Free Services* of the Spanish Cadastre electronic office (`OVCSWLocalizacionRC`: `Consulta_DNPRC`, `ConsultaProvincia`, `ConsultaMunicipio`, `ConsultaVia`, `ConsultaNumero`, `Consulta_DNPLOC`, `Consulta_DNPPP`) as JSON/REST.

- It is not an official service and is not affiliated with, endorsed or sponsored by the Dirección General del Catastro or the Spanish Ministry of Finance.
- It does not store or alter the data: it only converts XML into JSON.
- What is offered is the **technical service** (JSON format, availability, latency, OpenAPI documentation and Apify hosting), **not ownership of the cadastral data**.

## 2. Data source and reuse

- **Source:** Dirección General del Catastro (https://www.catastro.hacienda.gob.es). Any use or redistribution of the data must cite it.
- **Legal framework:** Law 37/2007 of 16 November on the reuse of public sector information, and the derived European directives. Non-protected information (cadastral reference, location, surface, use, age) is public and reusable, including for commercial purposes.
- **Protected data:** under article 51 of the Consolidated Text of the Cadastre Law (Texto Refundido de la Ley del Catastro Inmobiliario), cadastral ownership (owner name, tax ID, address) and individual cadastral or reference values may not be exposed or marketed through free services.
- This Actor only consumes the Free Services, which already return non-protected data only. It never requests, processes or stores owner information. Users must not try to use the Actor to obtain protected data.
- Each user is responsible for how they process the data obtained, including any data protection rules that apply to them.

## 3. Disclaimer of liability

The service is provided "as is" and "as available", without warranties of any kind.

- Uninterrupted availability of the Cadastre electronic office is not guaranteed. If the Cadastre fails or is slow, the API answers 502 or 504 (`CADASTRE_UNAVAILABLE`, `CADASTRE_PROTOCOL_ERROR`, `CADASTRE_TIMEOUT`).
- The accuracy, completeness and timeliness of the information, which is what the Cadastre publishes, are not guaranteed. The data has no legal value and does not replace the official cadastral certificate.
- No liability is accepted for damages arising from the use of the information (sale, financial, tax or any other decisions).
- Street names must match the Cadastre's own (for example `RU` + `DR CARLOS COLMEIRO LAFORE`); a search with no results does not mean the property does not exist.

## 4. Fair use and technical limits

The Cadastre infrastructure does not tolerate abuse. Its electronic office may temporarily or permanently block IPs that perform denial-of-service attacks or mass scraping.

- Do not use the Actor for mass scraping or to sweep the whole street directory (`/streets` without `streetName` returns very large lists).
- Limit concurrency and reuse results on your side whenever possible.
- The Actor applies timeouts and bounded retries with exponential backoff so as not to overload the Cadastre, but it does not itself limit the number of requests per client.
- The publisher may suspend access for anyone making abusive use.

Current status and recommended improvements if volume grows (not implemented in this version):

- **Caching** of already queried responses (memory, Redis or the Apify Key-Value Store), since cadastral data changes rarely.
- **Apify Proxy** to distribute outgoing requests. It is a paid feature and must be configured explicitly.
- **Per-client rate limiting**.

## 5. Suggested text for the Actor listing (Apify Store README)

> **Data source:** Dirección General del Catastro (Spanish Ministry of Finance), reused under Law 37/2007. This Actor is an independent technical gateway and is not affiliated with or endorsed by the Cadastre. It only accesses the Free Services and non-protected data; it does not return ownership or cadastral values. It is provided "as is", with no guarantee of availability or data accuracy. The data does not replace the official cadastral certificate. Please use the service responsibly.

## 6. What the fee covers

If the Actor is monetized on Apify, the price pays exclusively for the technical transformation, JSON format, availability, latency and documentation of the service. Cadastral information remains public and its source is the Cadastre.

## 7. Open items (publisher's decision)

- Add an attribution field to responses (for example `source`). Today attribution only appears in the documentation.
- Have a lawyer review the final Terms of Service and the Apify Store terms that apply to monetization.
