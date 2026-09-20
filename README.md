# Birthday Surprise Scrapbook

A vintage scrapbook birthday page. Visitors sign a guest book (nickname +
location) before the scrapbook unlocks; `/admin` lists the entries.

## Run locally

```
npm install
npm run dev   # npx netlify dev — fetches the Netlify CLI on first run
```

`netlify dev` serves the Vite app and `netlify/functions/api.mts` together, so
`/api/*` works the same locally as in production.

## Deploy

Netlify, from `netlify.toml`. Set `ADMIN_USER`, `ADMIN_PASSWORD` and
`SESSION_SECRET` in Site settings → Environment variables — the function falls
back to insecure defaults without them.
# her-birthday
