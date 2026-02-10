# dhroxy-frontend-example

Example React frontend for [dhroxy](https://github.com/c3po-initiative/dhroxy) — a FHIR R4 proxy for sundhed.dk.

## Prerequisites

- [dhroxy](https://github.com/c3po-initiative/dhroxy) running on port 8080
- Node.js 18+

```bash
# Start dhroxy from the published container
docker run -p 8080:8080 ghcr.io/c3po-initiative/dhroxy:latest
```

## Quick start

```bash
npm install
npm start
```

Opens on http://localhost:3000. The dev proxy forwards `/fhir/*` requests to `localhost:8080`.

## Authentication

sundhed.dk requires session headers. The frontend cannot set `Cookie` directly via `fetch()`, so it uses `X-Sundhed-*` prefixed headers. The dev proxy (`setupProxy.js`) maps these to the raw names dhroxy expects:

| Frontend sends | Proxy maps to | dhroxy forwards to sundhed.dk |
|---|---|---|
| `X-Sundhed-Cookie` | `cookie` | `cookie` |
| `X-Sundhed-XSRF-Token` | `x-xsrf-token` | `x-xsrf-token` |
| `X-Sundhed-Conversation-UUID` | `conversation-uuid` | `conversation-uuid` |

To get these values: log in to sundhed.dk, open DevTools > Network, and copy from any request.

## How it works

The app fetches FHIR resources from dhroxy as individual parallel GET requests:

```
GET /fhir/Patient
GET /fhir/Observation?date=ge2015-01-01&_count=1000
GET /fhir/Condition
GET /fhir/MedicationStatement
GET /fhir/Immunization
GET /fhir/Appointment
```

Each request includes `Accept: application/json` (required — without it sundhed.dk returns HTML for some endpoints).

Results are assembled client-side into a bundle structure for the UI.

## Key files

| File | Purpose |
|---|---|
| `src/setupProxy.js` | Dev proxy: header mapping + forwarding to dhroxy (http-proxy-middleware v3) |
| `src/App.js` | Main app, `fetchPatientData()` fetches all FHIR resources |
| `src/components/HeaderConfig.js` | UI for entering sundhed.dk session headers |
| `src/services/sundhedDkService.js` | FHIR service client with per-resource methods |

## Notes

- **Port 8080** is the standard dhroxy port — all references use this.
- **Observation lookback**: dhroxy defaults to 6 months. The frontend requests `date=ge2015-01-01` for a wider window.
- **Partial failures**: if some endpoints fail (e.g. expired session for specific endpoints), the rest still load.
- **setupProxy.js** uses `http-proxy-middleware` v3 API (`on: { proxyReq }`, not `onProxyReq`). This file only applies during development.

## Production

For production, the frontend is built as static files and served by dhroxy's Spring Boot backend:

```bash
npm run build
# Output in build/ — copy to src/main/resources/static/ in the dhroxy project
```

See the [dhroxy Dockerfile](https://github.com/c3po-initiative/dhroxy/blob/main/Dockerfile) for the multi-stage build that does this automatically.
