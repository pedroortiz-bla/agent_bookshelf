# Deliverable 2 — Session 4: Memory & Self-Improvement

> **Assignment:** Set up a basic `memory-bank/` structure for a project you're working in, OR
> trigger the self-improvement loop and get at least one rule approved.

**Branch:** `pedro/session-4-memory-bank` (branched from `main`, independent of Session 3) ·
**PR:** https://github.com/pedroortiz-bla/agent_bookshelf/pull/2

This deliverable does **both**. It adds a `memory-bank/` seeded only with findings that were
reproduced before being written down. It also adds a `/remember` skill that runs the capture
loop. That loop was run for real, and it caught and corrected one of its own entries.

## What's in the branch

```
memory-bank/
├── README.md            what goes in / stays out, entry format, maintenance loop
├── gotchas.md           7 verified tripwires, each with a repro or file:line
├── architecture.md      request flow + the sql.js in-memory state model
├── patterns.md          model / route / test / import conventions
├── decisions.md         6 locked choices with rationale
├── open-questions.md    1 [BLOCKER], 2 [OPEN]
└── EVIDENCE.md          full captured output (the source for everything below)
.claude/skills/remember/SKILL.md   the loop: decide → verify → file → write → enforce → commit
CLAUDE.md                          project instructions; loads the bank at session start
```

`CLAUDE.md` tells every session to read `memory-bank/gotchas.md` first. That is how the bank
gets loaded without anyone asking for it.

## What the bank knows (all reproduced)

| Entry | Finding | Proof |
|---|---|---|
| `writes-lost-without-closedb` | Writes live in WASM memory; nothing calls `saveDb()`, so they vanish on exit | Two-process repro: **0** rows after restart vs **1** with `closeDb()` |
| `initdb-is-async` | `initDb()` is async; both in-repo examples omit `await` | `Error: Database not initialized` at `src/db/index.ts:48` |
| `setup-ts-never-runs` | `tests/setup.ts` is dead code, because `vitest.config.ts` has no `setupFiles` | The suite is green despite the broken setup |
| `tests-not-typechecked` | `tsconfig.json` excludes `tests/`, so `tsc --noEmit` and the build never see them | `tsconfig.json` `include`/`exclude` |
| `npm-test-watch` | `npm test` is vitest watch mode and never exits | Also **enforced** as a hook rule (Session 3 branch, PR #1) |
| `wal-artifacts-tracked` | `-shm`/`-wal` files slip past the `*.db` ignore and are tracked, but sql.js never touches them | `git ls-files`, plus mtimes (see below) |
| `dist-comment-is-wrong` | `.gitignore` says `dist/` is committed, but it isn't; `postinstall` builds it | `git ls-files \| grep -c '^dist/'` → `0` |

The persistence finding was escalated to `open-questions.md` as `[BLOCKER] Q1`. The fix is a
design choice for the repo owner, not something an agent should quietly decide.

## Evidence it works

**1. It changes what a fresh agent does.** A clean headless session with no prior context:

```
$ claude -p "I'm about to add a 'create shelf' POST route. Does anything in this repo's
   memory bank affect how I should write the write path, and is there an open question
   I should surface first? Cite the entries."

**Surface this first: [BLOCKER] Q1, "Should the write path persist, and where?"**
(memory-bank/open-questions.md:8)
1. [GOTCHA:writes-lost-without-closedb] ... I checked the current code: the only calls are
   inside src/db/index.ts (lines 42 and 63). Your test should closeDb(), re-run initDb()
   on the same file, and then look for the row.
5. Copy tests/models/book.test.ts, not tests/setup.ts ... both leave out the await.
Then run /verify before you ship.
```

(This run was captured while the branch was still stacked on Session 3, which is why it
mentions `/verify`. The memory-bank entries it cites are unchanged on this branch.)

The session raised the blocker before writing any code. It also re-checked the `saveDb` call
sites itself instead of taking the entry on trust.

**2. The self-improvement loop corrected the bank.** The "verified or labelled" rule was
tested for real. The original `wal-artifacts-tracked` entry claimed that local runs dirty the
tracked WAL files. The *tracking* had been verified, but the *consequence* was inferred from
the filenames. A test showed it was false, because sql.js writes a plain file and never opens a
WAL:

```
2026-09-24 14:12:02  bookshelf.db        <-- rewritten by saveDb
2026-09-24 13:48:15  bookshelf.db-shm    <-- untouched
2026-09-24 13:48:15  bookshelf.db-wal    <-- untouched
$ git status --porcelain
(empty)
```

The entry was **rewritten in place** with the proof attached, not patched underneath. The same
wrong claim was also fixed where it had spread into `/verify` (commit `b4a981f`, on the Session 3 branch). The headless
session above had already repeated the wrong version as fact, with a citation attached. That
shows why the rule exists.

## Commit history

```
7d75214 Make Session 4 standalone: own CLAUDE.md, cross-branch refs to the Session 3 hook
eabfbd4 Correct the WAL gotcha: verified false, rewritten in place
12e8240 Set up memory-bank/ and the /remember capture loop
```

## Design choices

- **Verified or labelled:** every claim carries a repro or a `file:line`, and anything else is
  prefixed `Unverified:`.
- **Small on purpose:** step 1 of `/remember` is deciding *not* to write. A bank full of the
  obvious stops getting read.
- **Enforce, don't just file:** if a hook can prevent a finding, it goes in the hook too, as
  `npm-test-watch` did.
- **Corrections replace entries:** two entries that disagree would both read as current.

## Reproduce

```bash
git checkout pedro/session-4-memory-bank && npm install
cat memory-bank/gotchas.md
claude -p "Before adding a POST route, what in the memory bank should I know?"
```
