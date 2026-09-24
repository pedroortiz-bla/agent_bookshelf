# Decisions

Choices already made. Do not quietly reverse one — if a task needs it changed, say so first.

1. **sql.js (SQLite in WebAssembly), not `better-sqlite3`.** Migrated deliberately
   (`2cef3d5`, `0e6fb66`) to remove the native build step, which was the main install failure
   for students on Windows. The cost is the in-memory model and its persistence trap
   (`[GOTCHA:writes-lost-without-closedb]`). Do not reintroduce a native SQLite driver.

2. **All SQL lives in `src/models/`.** Routes orchestrate. This keeps the homework gaps
   (untested models) testable without booting Express.

3. **Server-rendered EJS + HTMX, no client framework.** Partial updates come from routes
   returning HTML fragments. Do not add React/Vue to complete a UI task.

4. **Vitest, real database, no mocks.** Specs run against a real seeded SQLite in `/tmp`.
   Do not mock the db layer to make a test pass.

5. **`dist/` is built, not committed.** The `postinstall` build is what makes
   `npx agent-bookshelf` work. (The `.gitignore` comment claiming otherwise is stale —
   `[GOTCHA:dist-comment-is-wrong]`.)

6. **Homework gaps stay gaps unless the task is to fill one.** `/books/search`, and the missing
   tests for `user` / `review` / `shelf` models, are deliberate
   (`src/routes/books.ts:15`, `tests/README.md`). Do not "helpfully" implement them as a side
   effect of an unrelated change.
