# Open Questions

Unresolved. `[BLOCKER]` items gate scope — surface them before starting work that depends on
the answer, propose a default, and say what changes if it resolves the other way.

---

### `[BLOCKER]` Q1 — Should the write path persist, and where?

`[GOTCHA:writes-lost-without-closedb]`: nothing written through the running app survives the
process. Three fixes, materially different:

1. `saveDb()` after every mutation in `src/db/index.ts:run()` — simplest, correct, writes the
   whole database to disk on every insert (fine at seed scale, quadratic as data grows).
2. A `SIGINT`/`SIGTERM` handler in `src/server.ts` calling `closeDb()` — cheap, still loses
   everything on `kill -9` or a crash.
3. Periodic flush — more code, no clear win at this size.

**Touches:** any task that adds a write path (create review, create shelf, add book to shelf).
**Proposed default:** (1), because a teaching repo that silently discards the user's data
teaches the wrong thing. Not yet agreed with the repo owner, so flag it rather than assume.

---

### `[OPEN]` Q2 — Is `tests/setup.ts` meant to be wired up?

It is not referenced by `vitest.config.ts` and never runs
(`[GOTCHA:setup-ts-never-runs]`). Either it is a leftover and should be deleted, or it is the
intended global setup and needs `setupFiles` plus the missing `await`. Both the file and the
`tests/README.md` example teach the broken pattern to anyone who copies them, so this is worth
resolving before a cohort writes tests against it.

---

### `[OPEN]` Q3 — Should `bookshelf.db-shm` / `-wal` be untracked?

They are committed but nothing writes them any more — sql.js never opens a WAL
(`[GOTCHA:wal-artifacts-tracked]`), so they are leftovers from the `better-sqlite3` era.
`git rm --cached` plus a `.gitignore` line is the whole fix, but it touches state other
students may have pulled, so it wants the repo owner's call rather than a drive-by fix.
