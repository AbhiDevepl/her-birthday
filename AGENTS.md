# AGENTS.md

Vintage birthday scrapbook (React + Vite frontend, Express/TS backend). Visitors sign a guest book behind geolocation before the scrapbook unlocks; `/admin` lists entries.

## Commands

- Install: `bun install` (ships `bun.lock`; no package-lock). `npm run dev` is `tsx server.ts` — the ONLY local dev path (Express on `:3000` embedding Vite middleware). No external DB runtime deps: storage is SQLite (`node:sqlite`).
- Lint/typecheck: `npm run lint` (`tsc --noEmit`). No test framework exists.
- Build: `npm run build` = `vite build` (→ `dist/`) + esbuild bundles `server.ts` → `dist/server.cjs`. Run prod build with `NODE_ENV=production npm start`: server.ts only serves `dist/` statically when `NODE_ENV=production` is set (server.ts:431); otherwise it falls into the Vite-middleware branch. `npm run preview` is `vite preview` (static, no API).

## Big gotcha: two diverged backends

Frontend calls the same `/api/*` paths against whichever backend serves them — `server.ts` locally, Vercel functions in production. They are NOT in sync; edit both in parallel:

- `server.ts` — full-featured Express app: HMAC-signed `admin_session` cookie, persists visitors. Routes: `/api/health`, `/api/reverse-geocode`, `POST /api/visitors`, `/api/admin/{login,logout,me,visitors}`. `POST /api/visitors` saves first, reverse-geocodes afterwards, and returns `{ ok, visitor }` (the persisted row incl. `id`).
- `api/*.ts` — Vercel serverless functions, kept roughly in sync via shared modules: `api/lib/auth.ts` (HMAC session, mirrors server.ts), `api/lib/db.ts` (SQLite via `node:sqlite`, seeded from the repo's `data.db`), `api/lib/geocode.ts`, `api/lib/types.ts`. `api/admin/me.ts` exists. Shared behavior contract: `POST /api/visitors` → `201 {ok,visitor}`; `/api/admin/*` require the HMAC cookie; admin responses set `Cache-Control: no-store`.

Note: `AdminDashboard` authenticates via `/api/admin/me` and polls `/api/admin/visitors` every 5 s. Both backends must behave identically — if you change one, mirror the other.

## Storage

- Both backends use the SAME SQLite schema, keyed off `data.db`:
  - Local/VPS: `server.ts` opens the repo's `data.db` directly (writable, durable).
  - Vercel: serverless filesystems are read-only, so `api/lib/db.ts` copies the committed `data.db` into a writable `/tmp/vercel-data.db` on each cold start and opens it with `node:sqlite`. Writes persist only for that function instance's lifetime; a fresh instance re-seeds from the committed `data.db` again. If `node:sqlite` is unavailable it falls back to in-memory storage — the API NEVER 503s. `vercel.json` pins `nodeVersion: 22.x` and bundles `data.db` + `data/visitors.json` via `functions.includeFiles`. No env vars are required to deploy.
- `data/visitors.json` is legacy test data: auto-migrated into the SQLite table once, only if the table is empty (server.ts:62, and mirrored in `api/lib/db.ts`).
- `server.ts` blocks direct HTTP requests to `*.db` / `*.sqlite` (server.ts:221).

## Deploy

- Vercel via `vercel.json`: runs `vite build` only (static output + api functions); `dist/server.cjs` is NOT used on Vercel.
- `README.md` is stale — it documents a dead Netlify setup (`netlify.toml`, `netlify/functions/`, `npx netlify dev`). Do not trust it.

## Env & security

- `ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET`. Both backends hardcode insecure defaults (`admin` / `om1234` / `change-me` in server.ts and `api/lib/auth.ts`).
- Authentication is backend-only: `AdminDashboard` checks `/api/admin/me` and `/api/admin/visitors`, both of which require the HMAC `admin_session` cookie (signed identically by server.ts and `api/lib/auth.ts`). There is NO client-side credential fallback and no offline/`localStorage` data is merged into the admin table.

## Frontend notes

- Tailwind v4 via `@tailwindcss/vite`; `@theme` tokens live in `src/index.css`, not a tailwind config file. App routing is pathname-based in `src/App.tsx` (`/admin` → AdminDashboard), no router lib.
- Guest sign-in needs geolocation (secure context: HTTPS or localhost; `useLocation` surfaces `INSECURE_CONTEXT`). Reverse geocoding is a backend `/api/reverse-geocode` proxy calling Nominatim OSM with a 3.5 s timeout and in-memory cache (server.ts; api/reverse-geocode.ts is cache-less).
- `VisitorGate` falls back to `localStorage['offlineVisitors']` only on a network error (fetch throws) — on a non-2xx response (e.g. 404) it shows the server error and blocks. Gate success is tracked in `sessionStorage` (`visitorCheckedIn`, `visitor_registered`).
- `AdminDashboard` polls `/api/admin/visitors` every 5 s (immediate first fetch, overlap-guarded, `AbortController` on unmount/logout, `cache: 'no-store'`) and shows a live status badge.