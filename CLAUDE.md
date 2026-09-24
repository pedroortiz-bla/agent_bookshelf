# Agent Bookshelf

Goodreads-lite teaching playground. Express 4 + EJS + HTMX on the server, sql.js (SQLite
compiled to WebAssembly) for storage, TypeScript throughout, Vitest for tests.

## At a glance

| | |
|---|---|
| **Stack** | Node 24 · TypeScript 5.7 (ESM) · Express 4 · EJS + HTMX · sql.js (WASM SQLite) |
| **Testing** | Vitest (`tests/**/*.test.ts`) |
| **Entry points** | `src/server.ts` (app) · `bin/agent-bookshelf.js` (CLI) |
| **Data** | `src/db/schema.sql` + `src/db/seed.sql`, loaded at init |

## Layout

```
src/db/       schema.sql, seed.sql, index.ts (initDb/closeDb)
src/models/   book.ts, review.ts, shelf.ts, user.ts — all DB access lives here
src/routes/   books.ts, shelves.ts, reviews.ts (HTML) + api.ts (JSON)
src/views/    EJS templates; partials/ for header/footer
tests/        Vitest specs, mirroring src/ layout
```

## Commands

```bash
npm install        # also runs the build (postinstall)
npm run build      # tsc + copy-assets (SQL, views, public/)
npm start          # serve dist/ on :3000
npm run dev        # tsx watch
npm run test:run   # tests, one shot  <-- use this
npm test           # tests in WATCH mode — hangs a non-interactive agent
```

**To verify a change, run `/verify`** — it is the single source of truth for the local
verification suite (typecheck, tests, build).

## Hard rules

- **Never `npm test` from an agent.** It is `vitest` in watch mode and never exits. Use
  `npm run test:run`.
- **Never ship without `/verify`.** Typecheck, tests, and build must all pass.
- **Never `git commit --no-verify`.** If a hook is failing, fix the cause.
- **DB access stays in `src/models/`.** Routes call models; they do not build SQL.
- **No raw string interpolation into SQL.** Use bound parameters (`db.prepare(...).bind([...])`).
- **Assets are copied, not bundled.** New runtime files under `src/` that are not `.ts` must be
  added to the `copy-assets` script or they will be missing from `dist/`.

## Skills

| Skill | Purpose |
|---|---|
| `/verify` | Full local verification suite — typecheck, tests, build |
