# Architecture

## Shape

```
HTTP ─▶ src/routes/*.ts ─▶ src/models/*.ts ─▶ src/db/index.ts ─▶ sql.js (SQLite in WASM)
                │                                    │
                └─▶ src/views/*.ejs                  └─▶ bookshelf.db (written only on save)
```

- `src/routes/books.ts | shelves.ts | reviews.ts` render EJS; `src/routes/api.ts` returns JSON.
  HTMX drives partial updates from the same routes (`views/**/­*-list.ejs` are the fragments).
- `src/models/*.ts` own every SQL statement. Routes never build SQL.
- `src/db/index.ts` is the only module that touches sql.js. It exposes `get` / `all` / `run` /
  `query` over prepared statements, plus `initDb` / `saveDb` / `closeDb`.

## State model — the part that surprises people

sql.js is SQLite compiled to WebAssembly: **the database is a byte array in memory**. There is
no connection, no file handle, no WAL. `initDb()` reads the file into memory if it exists and
otherwise builds it from `schema.sql` + `seed.sql`; `saveDb()` serializes the whole database
back over the file.

Two consequences that drive most of the gotchas:

1. Nothing is durable until someone calls `saveDb()` — and the write path never does. See
   `[GOTCHA:writes-lost-without-closedb]`.
2. `initDb()` is async because the WASM module has to be instantiated. See
   `[GOTCHA:initdb-is-async]`.

`initDb` is also idempotent-ish but stateful: `SQL` (the WASM runtime) is cached module-wide,
while `db` and `dbPath` are replaced on each call. Module-level singletons mean tests share
process state — each spec re-inits and deletes its own tmp DB.

## Seeding

`initDb` runs `schema.sql` unconditionally (the DDL is `CREATE TABLE IF NOT EXISTS`-shaped),
then counts `users` and loads `seed.sql` only when the count is zero. A database with a user
but no books will therefore never be re-seeded — delete the file to get a clean one.

Seed size is fixed and several tests assert against it (`expect(books).toHaveLength(50)`).
Changing `seed.sql` breaks those specs by design; update them in the same commit.

## Build

`npm run build` = `tsc` (to `dist/`) + `copy-assets`. `copy-assets` is a hand-written `cpSync`
list covering `schema.sql`, `seed.sql`, `views/`, `public/`. **Any new non-TypeScript runtime
file under `src/` must be added to that list**, or it exists in `src/` and is missing from
`dist/` — the app works under `npm run dev` (tsx, reads `src/`) and breaks under `npm start`.

`postinstall` runs the build, so `npm install` compiles the project.
