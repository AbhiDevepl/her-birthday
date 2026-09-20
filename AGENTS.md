# AGENTS.md

Vintage birthday scrapbook (React + Vite frontend, Express/TS backend). Visitors sign a guest book behind geolocation before the scrapbook unlocks; `/admin` lists entries.

## Commands

- Install: `bun install` (ships `bun.lock`; no package-lock). `npm run dev` is `tsx server.ts` — the ONLY local dev path (Express on `:3000` embedding Vite middleware). Runtime deps also include `postgres` (used ONLY by the Vercel `api/*` functions).
- Lint/typecheck: `npm run lint` (`tsc --noEmit`). No test framework exists.
- Build: `npm run build` = `vite build` (→ `dist/`) + esbuild bundles `server.ts` → `dist/server.cjs`. Run prod build with `NODE_ENV=production npm start`: server.ts only serves `dist/` statically when `NODE_ENV=production` is set (server.ts:431); otherwise it falls into the Vite-middleware branch. `npm run preview` is `vite preview` (static, no API).

## Big gotcha: two diverged backends

Frontend calls the same `/api/*` paths against whichever backend serves them — `server.ts` locally, Vercel functions in production. They are NOT in sync; edit both in parallel:

- `server.ts` — full-featured Express app: HMAC-signed `admin_session` cookie, persists visitors. Routes: `/api/health`, `/api/reverse-geocode`, `POST /api/visitors`, `/api/admin/{login,logout,me,visitors}`. `POST /api/visitors` saves first, reverse-geocodes afterwards, and returns `{ ok, visitor }` (the persisted row incl. `id`).
- `api/*.ts` — Vercel serverless functions, kept roughly in sync via shared modules: `api/lib/auth.ts` (HMAC session, mirrors server.ts), `api/lib/db.ts` (persistent Postgres via `postgres` pkg), `api/lib/geocode.ts`, `api/lib/types.ts`. `api/admin/me.ts` exists. Shared behavior contract: `POST /api/visitors` → `201 {ok,visitor}`; `/api/admin/*` require the HMAC cookie; admin responses set `Cache-Control: no-store`.

Note: `AdminDashboard` authenticates via `/api/admin/me` and polls `/api/admin/visitors` every 5 s. Both backends must behave identically — if you change one, mirror the other.

## Storage

- `server.ts` persists to SQLite at repo root: `data.db` via `node:sqlite` `DatabaseSync` (requires Node ≥ 22.5). It is committed to git and NOT gitignored — expect `data.db` diffs from local testing. Only `server.ts` writes it.
- `data/visitors.json` is legacy test data: auto-migrated into `data.db` once, only if the table is empty (server.ts:62). `data.db` is the local source of truth.
- Local/VPS: `data.db`. Vercel: external Postgres only — `api/lib/db.ts` connects when `POSTGRES_URL` (Vercel Postgres/Neon) or `DATABASE_URL` is set. If neither is set, the Vercel API returns an explicit `503` "storage not configured" instead of faking persistence (no in-memory fallback). Vercel deployment needs that env var; `data.db` is NOT persistent serverless storage.
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