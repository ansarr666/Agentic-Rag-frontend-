# OrionSoft AI frontend

The React and TypeScript frontend serves the visitor chatbot. There is no admin dashboard.

- `index.html` is the primary page at `/`. It opens directly into the lead and chat flow.
- `widget.html` is the embeddable chatbot at `/widget`. It opens automatically inside the iframe created by `widget-loader.js`.
- Leads, conversations, and booking requests are sent to the separate Flask API. Set `DATABASE_URL` in the backend environment to a Supabase PostgreSQL connection string to see those records in Supabase; without it, the backend uses local SQLite.

Set the single `backendUrl` value in `public/config.js` to the backend origin (for example, `https://api.example.com`). The built pages load `config.js` at runtime, so you can update that deployed file without rebuilding. Ask the backend to allow this site's origin with `ALLOWED_ORIGINS`.

---

## Available scripts

From this repository root, you can run:

```bash
# 1. Install dependencies
npm install

# 2. Start local Vite development server
npm run dev

# 3. Type check & production build (compiles to dist/)
npm run build

# 4. Preview production build
npm run preview

# 5. Run Oxlint code quality linter
npx oxlint src
```

---

## Static assets

When `npm run build` is executed, the compiled bundles are output to `dist/`:
- `dist/index.html` → Visitor page at `/`.
- `dist/widget.html` → Embeddable page at `/widget`.
- `dist/demo.html` → Sample site at `/demo`.
- `dist/assets/` → Static CSS and JavaScript.

The frontend Dockerfile serves these files with Nginx. Its `config.js` can be replaced or mounted independently of the image.
