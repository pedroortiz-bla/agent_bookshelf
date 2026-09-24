---
name: verify
description: Run the full local verification suite for Agent Bookshelf — typecheck, Vitest, build, and a working-tree check. Use before opening a PR, before marking any task complete, and any time you need to know whether the repo is green.
---

# /verify

Single source of truth for "is this change safe to ship?". Run every step, in order, and do
not stop at the first failure — collect them all, then report.

## Steps

Run each from the repo root.

### 1. Typecheck

```bash
npx tsc --noEmit
```

Must exit 0 with no output. `npm run build` also typechecks, but this step is fast and
isolates type errors from asset-copy errors.

### 2. Tests

```bash
npm run test:run
```

**Never `npm test`** — that is `vitest` with no subcommand, which enters watch mode, prints
`Waiting for file changes...`, and never exits. In a non-interactive agent session it hangs
the turn until it is killed. `test:run` is the same suite with `vitest run`.

Expect `Test Files 3 passed (3)` on an unmodified checkout. If you added tests, the counts go
up; if a count went *down*, a file failed to collect — that is a failure even when nothing is
reported red.

### 3. Build

```bash
npm run build
```

This is `tsc` followed by `copy-assets`. It catches the failure mode typecheck cannot: a new
non-`.ts` runtime file (a `.sql` file, a view, a stylesheet) that nobody added to the
`copy-assets` script, so it is missing from `dist/` and only breaks at runtime.

After a build, confirm anything you added under `src/` that is not TypeScript actually landed:

```bash
ls dist/views dist/db
```

### 4. Working tree

```bash
git status --porcelain
```

Expect this to be empty. `dist/` and `*.db` are ignored, so neither a build nor a local run of
the app should leave anything here — if something shows up, look at it before staging rather
than reaching for `git add -A`. (`bookshelf.db-shm` and `bookshelf.db-wal` are tracked despite
the `*.db` rule, but nothing writes them any more; see `[GOTCHA:wal-artifacts-tracked]`.)

## Reporting

Report one line per step with its real outcome:

```
/verify
  typecheck   PASS
  tests       PASS  (14 tests, 3 files)
  build       PASS
  tree        PASS  (clean)
```

If a step fails, paste the actual failing output — never summarize a failure as "some tests
failed". Fix the cause and re-run the whole suite; a partial re-run is not a verification.

## Rules

- Do not declare a task complete until `/verify` is green.
- Do not work around a failure with `git commit --no-verify`. The `guard-commands` hook blocks
  it, and the block is correct.
- If `/verify` is green but you know the change is untested, say so explicitly rather than
  letting a green suite imply coverage that does not exist.
