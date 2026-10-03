# Quickstart: SPEC-001

```bash
npm install
npm start
```

In another terminal:

```bash
curl localhost:3000/provinces
curl "localhost:3000/municipalities?province=MADRID"
curl "localhost:3000/streets?province=MADRID&municipality=MADRID&streetName=SERRANO"
curl "localhost:3000/street-numbers?province=MADRID&municipality=MADRID&streetType=CL&streetName=SERRANO&number=30"
curl "localhost:3000/properties?province=MADRID&municipality=MADRID&streetType=CL&streetName=SERRANO&number=30"
curl "localhost:3000/properties?province=MADRID&municipality=MADRID&polygon=1&parcel=1"
curl localhost:3000/openapi.json
```

Open `http://localhost:3000/docs` in a browser for the HTML documentation.

Validation: `npm test`, `npm run lint`, `npm run typecheck`, then `npx apify-cli run`.
