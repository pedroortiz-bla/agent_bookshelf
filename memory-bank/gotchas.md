# Gotchas

Load this file at the start of every task. Each entry was reproduced on 2026-09-24 against
commit `0e6fb66`; the repro is included so you can re-check rather than trust.

---

- **[GOTCHA:npm-test-watch] `npm test` never exits.** The script is bare `vitest`, which is
  watch mode — it prints `PASS Waiting for file changes...` and holds the terminal. In a
  non-interactive agent session that hangs the turn until something kills it. Use
  `npm run test:run` (`vitest run`). Enforced: `.claude/hooks/guard-commands.mjs` denies the
  watch-mode forms at the PreToolUse boundary.

  ```
  $ timeout 25 npm test < /dev/null
   Test Files  3 passed (3)
   PASS  Waiting for file changes...    <-- still running when the timeout fires
  ```

---

- **[GOTCHA:writes-lost-without-closedb] Writes are held in WASM memory and are lost unless
  `closeDb()` or `saveDb()` runs — and the server calls neither.** sql.js is an in-memory
  SQLite; `src/db/index.ts` only touches the file in `saveDb()` (`index.ts:53`), which is
  called from `initDb` and `closeDb` and nowhere else. `run()` does **not** save
  (`index.ts:95`), no route or model calls `saveDb`, and `src/server.ts` installs no
  SIGINT/SIGTERM handler. So every review, shelf and book created through the running app
  survives only until the process exits, and Ctrl-C discards all of it.

  ```
  # write, exit without closeDb (what Ctrl-C does), then re-open:
  -> rows found after restart: 0
  # same write, with closeDb():
  -> rows found after restart: 1
  ```

  When adding a write path, call `saveDb()` after the mutation, or add a shutdown hook that
  calls `closeDb()`. Do not assume the insert landed because the row came back — the read is
  served from the same in-memory database.

---

- **[GOTCHA:initdb-is-async] `initDb()` is `async`; calling it without `await` throws
  "Database not initialized" from the first query, not from the call itself.** The error
  surfaces at `getDb()` (`src/db/index.ts:48`) inside whatever model function ran first, which
  points the reader at the model rather than at the missing `await`.

  **Both in-repo examples of the setup pattern get this wrong**: `tests/setup.ts:8` and the
  example in `tests/README.md:71` (`db = initDb('/tmp/test-user.db')` — assigns a Promise).
  Copying either into a new spec produces:

  ```
   FAIL  tests/_repro.test.ts > un-awaited initDb > can read seeded books
   Error: Database not initialized. Call initDb() first.
    ❯ getDb src/db/index.ts:48:11
    ❯ Module.getAllBooks src/models/book.ts:15:10
  ```

  Copy `tests/models/book.test.ts:6` instead — `beforeEach(async () => { await initDb(...) })`.

---

- **[GOTCHA:setup-ts-never-runs] `tests/setup.ts` is dead code — `vitest.config.ts` declares no
  `setupFiles`.** Nothing imports it either. This is why the suite is green even though that
  file contains the un-awaited `initDb` bug above: it never executes. Editing it to add global
  test setup will silently do nothing; each spec does its own `beforeEach`/`afterEach`. To make
  it live, add `setupFiles: ['tests/setup.ts']` to the vitest config *and* fix the missing
  `await` first.

---

- **[GOTCHA:tests-not-typechecked] `npx tsc --noEmit` does not check the tests.**
  `tsconfig.json` sets `"include": ["src/**/*"]` and `"exclude": [..., "tests"]`, so a type
  error in a spec is invisible to typecheck and to `npm run build`. It surfaces only when
  Vitest transpiles that file at run time — and esbuild strips types without checking them, so
  a wrong type in a test may never fail at all. Do not read a green typecheck as "the tests
  compile".

---

- **[GOTCHA:wal-artifacts-tracked] `bookshelf.db-shm` and `bookshelf.db-wal` are committed to
  git even though `.gitignore` ignores `*.db`.** The ignore pattern does not match the `-shm` /
  `-wal` suffixes, and both files are tracked (`git ls-files | grep bookshelf.db`). A local run
  that touches them shows up as an unrelated diff in your feature branch. Check
  `git status --porcelain` before staging, and never `git add -A` blind.

---

- **[GOTCHA:dist-comment-is-wrong] The `.gitignore` comment says "dist/ is committed to the
  repo so npx works without a build step" — it is not.** `dist` is ignored and
  `git ls-files | grep -c '^dist/'` returns `0`. What actually makes `npx agent-bookshelf` work
  is the `postinstall: npm run build` script. Consequence: `npm install` always runs a full
  `tsc`, and a broken build fails the *install*, not a later step.
