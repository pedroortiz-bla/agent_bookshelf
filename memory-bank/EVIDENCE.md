# Evidence — memory bank + `/remember`

Deliverable 2 (Session 4: Memory & Self-Improvement). Captured 2026-09-24 against commit
`0e6fb66`. Every entry in `gotchas.md` was reproduced in the session that wrote it; the
transcripts below are real output.

## What was set up

```
memory-bank/
├── README.md            retrieval strategy, entry format, maintenance loop
├── gotchas.md           7 verified tripwires, each with a repro
├── architecture.md      request flow + the sql.js in-memory state model
├── patterns.md          model / route / test / import conventions
├── decisions.md         6 locked choices with rationale
└── open-questions.md    1 [BLOCKER], 2 [OPEN]
.claude/skills/remember/SKILL.md   the capture loop that maintains it
```

`CLAUDE.md` points at `memory-bank/gotchas.md` as a start-of-task read, which is what gets the
bank loaded without the user asking for it.

## The loop, run for real

The bank was not written from imagination — it was written from a working session on this repo,
and each finding went through verify → record → (where possible) enforce.

**Finding 1 — `npm test` never exits.** Discovered by running it:

```
$ timeout 25 npm test < /dev/null
 Test Files  3 passed (3)
 PASS  Waiting for file changes...      <-- still running when the timeout fired
```

→ recorded as `[GOTCHA:npm-test-watch]`, **and** enforced as a deny rule in
`.claude/hooks/guard-commands.mjs` (Deliverable 1, on the separate `pedro/session-3-skill-hook`
branch / PR #1). This is step 5 of `/remember`: where a
finding is mechanically preventable, a hook beats a paragraph.

**Finding 2 — writes are lost on exit.** Suspected from reading `src/db/index.ts` (`run()`
never calls `saveDb()`), then confirmed with a two-process repro:

```
### A: write, exit WITHOUT closeDb (what Ctrl-C does)
  -> rows found after restart: 0
### B: write, then closeDb()
  -> rows found after restart: 1
```

→ recorded as `[GOTCHA:writes-lost-without-closedb]`, and escalated to
`open-questions.md` as `[BLOCKER] Q1` because the fix is a design choice, not a bug fix.

**Finding 3 — the repo's own test-setup examples are broken.** `initDb` is `async`;
`tests/setup.ts:8` and `tests/README.md:71` both call it without `await`. Copying either:

```
 FAIL  tests/_repro.test.ts > un-awaited initDb > can read seeded books
 Error: Database not initialized. Call initDb() first.
  ❯ getDb src/db/index.ts:48:11
  ❯ Module.getAllBooks src/models/book.ts:15:10
```

The suite is green anyway — because `vitest.config.ts` declares no `setupFiles`, so
`tests/setup.ts` never runs at all. → two entries: `[GOTCHA:initdb-is-async]` and
`[GOTCHA:setup-ts-never-runs]`, plus `[OPEN] Q2`.

## It changes what a fresh agent does

The test of a memory bank is whether a session that did none of the above arrives at the same
place. A clean headless run, with no context beyond the repo:

```bash
$ claude -p "I'm about to add a 'create shelf' POST route. Before I start: does anything in
   this repo's memory bank affect how I should write the write path, and is there an open
   question I should surface first? Answer briefly and cite the entries."
```

Abridged output:

```
Yes on both. Something affects how you write it, and there's a blocker to raise first.

**Surface this first: [BLOCKER] Q1, "Should the write path persist, and where?"**
(memory-bank/open-questions.md:8)
- The entry lists "create shelf" as a task this question gates.
- The proposed default is to call saveDb() after every mutation ... The repo owner hasn't
  agreed to either, so pick a default and flag it rather than quietly choosing one.

**What affects how you write it:**
1. [GOTCHA:writes-lost-without-closedb] ... I checked the current code: the only calls are
   inside src/db/index.ts (lines 42 and 63). A read-back after the insert proves nothing,
   because it reads the same in-memory copy. Your test should closeDb(), re-run initDb() on
   the same file, and then look for the row.
2. Decision 1: don't fix the persistence problem by switching back to a native SQLite driver.
5. Test pattern ... Copy tests/models/book.test.ts, not tests/setup.ts or the
   tests/README.md example, because both leave out the await.
6. [GOTCHA:wal-artifacts-tracked] ... Check git status --porcelain before staging.

Then run /verify before you ship.
```

Without the bank, none of that is reachable without reading `src/db/index.ts`, `vitest.config.ts`
and `tests/setup.ts` first — and the blocker would not have been surfaced at all. The agent also
re-derived the `saveDb` call sites independently (`index.ts:42,63`), which is the bank working as
intended: claims cheap enough to re-check, not taken on faith.

## The rule that earned its place

`README.md` says entries are verified or explicitly labelled `Unverified:`, and `/remember`
makes verification a step. Reviewing this branch found an entry that broke its own rule, which
is the best argument for having it.

`[GOTCHA:wal-artifacts-tracked]` originally warned that a local run dirties the tracked
`bookshelf.db-shm` / `-wal` files, so you should check `git status` before staging. The
*tracking* was verified (`git ls-files`). The *consequence* was not — I had inferred it from
the filenames.

It is false. sql.js keeps the database in memory and persists with a plain `writeFileSync`
(`src/db/index.ts:53`); it never opens a WAL. Booting the server and letting `initDb`/`saveDb`
run:

```
2026-09-24 14:12:02  bookshelf.db        <-- rewritten by saveDb
2026-09-24 13:48:15  bookshelf.db-shm    <-- untouched
2026-09-24 13:48:15  bookshelf.db-wal    <-- untouched

$ git status --porcelain
(empty)
```

Those files are leftovers from the `better-sqlite3` era (Decision 1), not a live tripwire. The
entry was rewritten in place with the verification attached — not amended underneath, per the
README's rule that two entries disagreeing both read as current. The same wrong claim had
already propagated into the `/verify` skill's working-tree step (Deliverable 1 branch), which
was corrected in the same pass.

The cost of the unverified half was visible before it was caught: the headless session quoted
above repeated it back as fact ("running locally can change the tracked files"). That is what
an unverified entry buys you — not a gap, but a confident wrong answer with a citation on it.

## Design notes

- **Verified or labelled.** Every claim carries a repro or a `file:line`. The `/remember` skill
  makes this a step, because a confident wrong entry costs more than a missing one.
- **Small on purpose.** The skill's first step is deciding *not* to write. An index of the
  obvious stops being read, and an unread bank is worse than none — people assume it covers them.
- **Findings get enforced, not just filed**, when a hook can make them unreachable.
- **Corrections replace, never append.** Two entries disagreeing both read as current.
