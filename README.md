# Agentic RAG frontend

React, TypeScript, and Vite UI for the visitor chat, embeddable widget, demo page, and existing admin workspace. It calls the separate Flask backend through HTTP APIs. No backend Python source or server credentials are bundled here.

## Run locally (Windows PowerShell)

```powershell
cd C:\Users\ANAM\Agentic-RAG-frontend
npm ci
Copy-Item .env.example .env.local
# Edit .env.local: VITE_API_BASE_URL=http://localhost:5000
npm run dev
```

Open `http://localhost:5173/` for visitor chat, `/widget` for the iframe, `/admin` for the admin workspace, and `/demo` for the sample integration. Start the backend separately on port 5000 with `ALLOWED_ORIGINS=http://localhost:5173`. The frontend needs only its backend URL; the backend owns all data and provider credentials.

## Backend URL

Set `VITE_API_BASE_URL` in `.env.local` for development or at build time. A deployed site can override the built value at runtime by serving `/config.js` with `window.__RAG_CONFIG__ = { backendUrl: 'https://your-backend-origin' };`. The checked-in `public/config.js` has an empty value and contains no deployment URL. Configure a full origin without a trailing `/api`; the API client appends paths such as `/api/public/conversation`.

The admin page prompts the human operator for the backend `RAG_API_KEY` and keeps it in that browser tab's session storage for subsequent requests. Never place that key in `VITE_*`, `config.js`, or a committed file. The existing Google Drive OAuth flow belongs to the backend; register its backend callback URL with Google. The browser API calls do not use cookies or WebSockets.

## Build and deploy

```powershell
npm run build
npm run preview
npm run lint
npm test
```

`dist/` contains `index.html`, `widget.html`, `admin.html`, `demo.html`, and assets. `Dockerfile` builds this repository alone and serves it with Nginx. Set the backend URL before building (`docker build --build-arg VITE_API_BASE_URL=https://your-backend-origin .`) or replace `config.js` at deployment. Set the backend `ALLOWED_ORIGINS` to the frontend origin.

To embed on another site, serve `widget-loader.js` from this frontend origin and include:

```html
<script src="https://your-frontend-origin/widget-loader.js"></script>
```

The loader creates an iframe to this frontend's `/widget`; the iframe calls the configured backend directly. Allow the frontend origin in backend CORS configuration. The existing admin workspace uses live APIs for chat, upload, Google Drive actions, evaluations, and trace queries; other preexisting dashboard views retain their local display state.
