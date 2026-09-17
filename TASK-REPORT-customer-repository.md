# Task Report — CustomerRepository (prompt-after.md)

**Branch:** `challenge/reinaldomendoza-new-prompt`
**Commits:** `225a0bc` → `374dd15` (6 commits, one per TDD cycle + tooling)
**Source prompt:** `prompt-after.md` — the engineered/specific version of the prompt
**Date:** 2026-09-17
**Model:** Claude Sonnet 5

---

## 1. Context

### Starting point

This branch starts clean at `fd0b9c5` (base challenge commit) — no repository layer,
no `IRepository`, no `*.repository.test.ts` files existed yet. Confirmed by grep
before writing anything, per the prompt's own "How" instructions.

`prompt-after.md` asks for a `CustomerRepository` (Repository Pattern, strict
red-green-refactor, one method at a time: `create`, `findById`, `findAll`, `update`,
`delete`) and gives a "Definition of done": tests written before implementation,
`npm test` green with nothing skipped, `npm run lint` and `npm run typecheck` clean,
and at least one edge case per method.

### Where the prompt's assumptions didn't match this repo

`prompt-after.md` is written as a stack-agnostic template and its example context
(TypeScript + TypeORM + PostgreSQL + Jest, an existing `order.repository.ts` /
`order.repository.test.ts`, `src/entities/customer.entity.ts`) does not describe
Agent Bookshelf. Per `CLAUDE.md`, the real stack is Express + TypeScript, SQLite via
`sql.js` (WebAssembly, no native deps), Vitest. Verified before starting:

```
grep -rn "implements IRepository" src tests   → no matches
find . -name "*.repository.test.ts"          → no matches
find . -iname "*order.repository*"           → no matches
find . -iname "*customer.entity*"            → no matches
```

So the repository was built against this repo's actual conventions — the `sql.js`
query helpers (`all` / `get` / `run` in `src/db/index.ts`) instead of a TypeORM/Jest
mock, a real temp-file SQLite database per test (matching `tests/db.test.ts` and
`tests/models/book.test.ts`) instead of a mocked DB layer — rather than the
placeholder stack the prompt's context line guesses at.

**One explicit instruction was overridden by repo convention, and it's called out
here rather than silently changed:** the prompt says to put the test file at
`src/repositories/customer.repository.test.ts` (co-located). This repo's
`vitest.config.ts` only picks up `tests/**/*.test.ts`, and every existing test file
lives under `tests/`. Co-locating the test would silently fail the prompt's own
"`npm test` passes with no skipped tests" requirement (`vitest` would never
discover it), so the test was placed at `tests/repositories/customer.repository.test.ts`
instead — the prompt's own "grep for conventions before writing new tests"
instruction points the same way.

### What was built

| File | Purpose |
|---|---|
| `src/repositories/repository.ts` | `IRepository<T, TCreate, TUpdate>` — did not exist before this task; now the contract `CustomerRepository` implements |
| `src/repositories/customer.repository.ts` | `create`, `findById`, `findAll`, `update`, `delete`, plus name/email normalization and a private `assertEmailIsFree` guard |
| `src/repositories/index.ts` | Barrel export, matching `src/models/index.ts` |
| `tests/repositories/customer.repository.test.ts` | 17 tests, every one written and run red before its implementation |
| `src/db/schema.sql` | Additive `customers` table + email index (seed data untouched) |
| `package.json` | Added `typecheck` script (`tsc --noEmit`) |

### TDD log — one method at a time, per the prompt's explicit process

| # | Method | Red (observed failure) | Green | Refactor |
|---|---|---|---|---|
| 1 | `create` | `Failed to load url .../customer.repository.js` → then `expected [Function] to throw` / raw `UNIQUE constraint failed: customers.e…` leaking | 5/5 | Extracted `normalizeName` / `normalizeEmail` |
| 2 | `findById` | Both tests fail against a `throw new Error('Not implemented yet')` stub | 7/7 | `create` now delegates to `findById` for its select-back |
| 3 | `findAll` | Same stub failure | 9/9 | None needed |
| 4 | `update` | All 5 tests (incl. 2 edge cases) fail against the stub | 14/14 | Pulled the duplicate-email check out of `create` into a shared `assertEmailIsFree(email, exceptId?)` so `update` can reuse it without flagging a customer's own email |
| 5 | `delete` | All 3 tests fail against the stub | 17/17 | None needed |

Each method was implemented behind a full `IRepository` implementation from the
start (the other four methods stubbed to `throw new Error('Not implemented yet')`),
so every red failure through the loop is a real assertion failure or the intended
stub error — never a compile error or a wrong-reason failure — and each method got
its own commit (`225a0bc`, `6375441`, `b1e4261`, `e609c44`, `db64868`).

### Edge cases covered (per the prompt's definition of done)

- `create`: blank name, invalid email format, duplicate email, phone defaulting to `null`
- `findById`: non-existent id
- `findAll`: empty table
- `update`: non-existent id, no fields supplied (no-op), duplicate email against
  *another* customer, invalid email, and confirming a customer updating to its
  own existing email is **not** flagged as a duplicate
- `delete`: non-existent id, confirms sibling rows are untouched

### Definition of done — verified against the prompt's checklist

| Requirement | Result |
|---|---|
| Every method has a test written before its implementation | Yes — verified red at each step above |
| `npm test` passes, no skipped tests | 31/31 passed (14 pre-existing + 17 new), 0 skipped |
| `npm run typecheck` clean | Added the script; clean. The new test file sits outside `tsconfig.json`'s `include` (as every test in this repo does, by the project's own design), so it was additionally typechecked standalone with matching strict compiler flags — also clean |
| `npm run lint` clean | **Not satisfiable as stated** — this repo has no ESLint (or any linter) installed, configured, or scripted, confirmed before starting. Installing one from scratch means choosing rules/plugins/config, a materially bigger decision than implementing a repository, so it was left out rather than added unilaterally. Flagged explicitly in the `374dd15` commit message rather than silently skipped |
| Edge case per method | Yes, see above |

### Constraints honoured (`CLAUDE.md`)

- **Homework gaps untouched** — no search backend, no model tests, no API validation, no CSS.
- **`seed.sql` untouched** — the schema change is `CREATE TABLE IF NOT EXISTS`, purely
  additive; the 50 books / 3 users seed stays byte-identical.
- **No native dependencies** — built entirely on the existing `sql.js` helpers.
- **In scope only** — no controller, no routes, no DTOs, no ESLint install (see above).

An incidental `package-lock.json` change from `npm install` (a `"peer": true`
metadata flag) was reverted before any commit, so the history contains only the
feature and tooling changes described here.

---

## 2. Token & context usage

Measured from this session's transcript, scoped to this task (from the
`prompt-after.md` request through the final commit), continuing the same
conversation as the earlier `prompt-before.md` task.

| Metric | Tokens |
|---|---:|
| Cache read (context replayed each turn) | 5,785,739 |
| Cache creation (new context written to cache) | 200,396 |
| Output (including reasoning) | 44,371 |
| Fresh input (uncached) | 138 |
| **Total processed** | **6,030,644** |

| Context / session | Value |
|---|---:|
| Peak context window used | 99,210 tokens |
| Context window available | 1,000,000 tokens (Sonnet 5) |
| Peak utilisation | ~9.9% |
| API calls (model turns) | 69 |
| Tool calls | 33 (all `Bash`) |
| Subagents / workflows spawned | 0 |

**Reading the numbers:** this task carried more accumulated conversation history
than the `prompt-before.md` task (it's a continuation of the same session, and this
task ran a more granular, per-method commit workflow — 6 commits instead of 2 — plus
an extra verification pass for `typecheck`), which is reflected in the larger cache-read
and cache-creation totals. ~96% of the total is cache read; the genuinely new work
is the ~200K written to cache plus 44K generated. Peak context reached under 10%
of the 1M window — comfortably within budget, and both this task and the earlier
`prompt-before.md` task ran with a 1M context window available (this session's
prior model was "Opus 5 (1M context)"; Sonnet 5 also carries a 1M window).

*Figures were captured immediately before this report was written, so they exclude
the report's own generation and commit.*

---

## 3. Comparing this run to `prompt-before.md`

| | `prompt-before.md` (vague) | `prompt-after.md` (engineered) |
|---|---|---|
| Prompt | One sentence, no stack/scope/process detail | Explicit files, stack context, scope boundary, step-by-step TDD process, grep instructions, definition of done |
| Ambiguity to resolve | Everything — stack, file locations, mocking approach, method list, edge cases | Only the stack-context placeholder and the test-file location (both caught by the prompt's own "grep for conventions" instruction) |
| Commit granularity | 1 feature commit + 1 report commit | 1 commit per TDD cycle (5) + 1 tooling commit + 1 report commit |
| Definition of done | Implicit (my own judgment) | Explicit checklist — including one requirement (`npm run lint`) this repo genuinely cannot satisfy, which the prompt's rigor surfaced as a visible gap instead of leaving it for me to just decide silently |

The engineered prompt didn't change the resulting code much (same five methods, same
edge cases, same `IRepository` design) — the previous session had already converged
on the same shape from the vague prompt. Its real effect was on *process*: it forced
a real per-method commit trail, made the lint gap an explicit, called-out decision
rather than an implicit one, and left less room for me to guess at file placement or
scope.
