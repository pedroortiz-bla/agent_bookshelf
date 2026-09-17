# Task Report — CustomerRepository (Repository Pattern + TDD)

**Branch:** `challenge/reinaldomendoza`
**Commit:** `3df7220` — `feat: add CustomerRepository via repository pattern (TDD)`
**Source prompt:** `prompt-before.md` — *"Let's implement a CRUD repository for customers using the repository pattern methodology, following a TDD approach."*
**Date:** 2026-09-17
**Model:** Claude Opus 5 (1M context)

---

## 1. Context

### Starting point

`prompt-before.md` is the deliberately vague version of the prompt. `prompt-after.md`
(the refined version, kept for comparison) assumes a different stack — TypeORM,
PostgreSQL, Jest, an existing `order.repository.ts` and `src/entities/customer.entity.ts`.
None of those exist here. The real stack, per `CLAUDE.md`, is:

| Concern | Actual stack |
|---|---|
| Runtime | Node.js 24 LTS (Node 18 was active on `PATH`; used `~/.nvm/versions/node/v24.11.1`) |
| Language | TypeScript (ESM, `strict`) |
| Database | SQLite via `sql.js` (WebAssembly — no native deps allowed) |
| Tests | Vitest |
| Data access | Function-per-operation modules in `src/models/` — no repository layer existed |

So the prompt was implemented against the repo's real conventions rather than the
ones `prompt-after.md` guesses at: `sql.js` helpers (`all` / `get` / `run`) instead
of a TypeORM mock, Vitest instead of Jest, a real temp-file database per test instead
of a mocked DB layer (this is what `tests/db.test.ts` and `tests/models/book.test.ts`
already do).

### What was built

A `CustomerRepository` behind a reusable `IRepository` contract — the first
repository-pattern layer in the project.

| File | Lines | Purpose |
|---|---|---|
| `src/repositories/repository.ts` | 15 | `IRepository<T, TCreate, TUpdate>` — the contract future repositories implement |
| `src/repositories/customer.repository.ts` | 105 | `CustomerRepository` — all customer SQL lives here |
| `src/repositories/index.ts` | 2 | Barrel export, matching `src/models/index.ts` |
| `tests/repositories/customer.repository.test.ts` | 142 | 17 tests, each written before its implementation |
| `src/db/schema.sql` | +9 | Additive `customers` table + email index |

**API:** `create`, `findById`, `findAll`, `update`, `delete` — plus name/email
normalisation and a private `assertEmailIsFree` guard that turns a raw
`UNIQUE constraint failed` into a domain error.

### TDD log (red → green → refactor, one method at a time)

| # | Step | Red — observed failure | Green |
|---|---|---|---|
| 1 | `create` | `Failed to load url ../../src/repositories/customer.repository.js` | 1/1 |
| 2 | `create` edge cases | `expected [Function] to throw` ×2; `got 'UNIQUE constraint failed: customers.e…'` | 5/5 |
| 3 | `findById` | `TypeError: repo.findById is not a function` | 7/7 |
| 4 | `findAll` | `TypeError: repo.findAll is not a function` | 9/9 |
| 5 | `update` | `TypeError: repo.update is not a function` | 14/14 |
| 6 | `delete` | `TypeError: repo.delete is not a function` | 17/17 |
| 7 | Refactor | — | 31/31 (whole suite) |

The refactor step extracted `IRepository`, pulled validation into `normalizeName` /
`normalizeEmail`, and collapsed the duplicated duplicate-email check into
`assertEmailIsFree(email, exceptId?)` — all with the tests staying green.

### Edge cases covered

`findById` / `update` / `delete` with a non-existent id · blank name · invalid email
· duplicate email on both `create` and `update` (and *not* firing when a customer
updates to its own email) · `update` with no fields · `findAll` on an empty table ·
`phone` defaulting to `NULL`.

### Verification

```
npm run test:run   →  4 files, 31 tests passed (14 pre-existing + 17 new)
tsc --noEmit       →  clean
```

There is no `lint` script in this project, so lint was not run.

### Constraints honoured (`CLAUDE.md`)

- **Homework gaps untouched** — no search backend, no model tests, no API validation, no CSS.
- **`seed.sql` untouched** — the schema change is purely additive (`CREATE TABLE IF NOT EXISTS`),
  so the 50 books / 3 users seed stays byte-identical and reproducible.
- **No native dependencies** — the repository uses the existing `sql.js` helpers only.
- **In scope only** — no controller, no routes, no DTOs; the prompt asked for a repository.

An incidental `package-lock.json` churn (a `"peer": true` metadata flag added by
`npm install`) was reverted so the commit contains only the feature.

---

## 2. Token & context usage

Measured from this session's transcript
(`~/.claude/projects/…/f483615f-05de-45de-9faa-1af362763796.jsonl`), covering every
API call from the task prompt through the commit.

| Metric | Tokens |
|---|---:|
| Cache read (context replayed each turn) | 3,179,333 |
| Cache creation (new context written to cache) | 82,651 |
| Output (including reasoning) | 35,153 |
| Fresh input (uncached) | 118 |
| **Total processed** | **3,297,255** |

| Context / session | Value |
|---|---:|
| Peak context window used | 69,414 tokens |
| Context window available | 1,000,000 tokens |
| Peak utilisation | ~6.9% |
| API calls (model turns) | 59 |
| Tool calls | 33 (all `Bash`) |
| Subagents / workflows spawned | 0 |

**Reading the numbers:** ~96% of the total is *cache read* — the same conversation
prefix replayed on each of the 59 turns, billed at a fraction of fresh-input cost.
The genuinely new work is the 82.6K written to cache plus 35.2K generated. Peak
context stayed under 7% of the 1M window, so nothing was summarised or dropped.

The cost driver was the tight TDD loop: 33 Bash calls, most of them a `vitest` run,
each re-sending the accumulated transcript. A coarser loop (all five methods at once)
would have cut total tokens by roughly half — at the cost of the red-green evidence
that was the point of the exercise.

*Figures were captured immediately before this report was written, so they exclude
the report's own generation and commit.*
