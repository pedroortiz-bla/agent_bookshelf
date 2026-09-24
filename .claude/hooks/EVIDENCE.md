# Evidence — `/verify` skill + `guard-commands` hook

Deliverable 1 (Session 3: Skills, Hooks & Commands). Everything below is real captured output
from this repo on 2026-09-24, not an illustration.

## The repeated task this comes from

In my day job (a Rails/React monolith) I run a `/verify` skill before every PR, and the single
most common way a task goes wrong is an agent running a command that hangs or skipping
verification with `--no-verify`. Agent Bookshelf has the same trap in a different shape:

```bash
$ timeout 25 npm test < /dev/null
 ✓ tests/db.test.ts (4 tests) 130ms
 ✓ tests/models/book.test.ts (4 tests) 131ms
 ✓ tests/routes/api.test.ts (6 tests) 122ms

 Test Files  3 passed (3)
      Tests  14 passed (14)

 PASS  Waiting for file changes...          <-- never exits
       press h to show help, press q to quit
```

`npm test` is `vitest` with no subcommand: watch mode. It hangs a non-interactive agent turn
until something kills it. `npm run test:run` is the same suite that exits.

So the deliverable is a pair: a **skill** that defines what verification means
(`.claude/skills/verify/SKILL.md`), and a **hook** that makes the failure modes unreachable
(`.claude/hooks/guard-commands.mjs`).

## 1. The hook triggers in a live session

Run from the repo root, headless, against a real Claude Code session:

```bash
$ claude -p "Run the bookshelf test suite using the command 'npm test'. \
   If a hook blocks it, report exactly what the block said and stop."
```

Output:

```
A PreToolUse hook blocked the command, so I stopped there. This is exactly what it said:

> **PreToolUse:Bash hook error:** Blocked: `npm test` runs vitest in WATCH mode — it prints
> "Waiting for file changes..." and never exits, which hangs this turn until the command is
> killed.
> Use `npm run test:run` (same suite, `vitest run`, exits with a real status code).

The tests did not run. If you want results, I can run `npm run test:run` instead.
```

The agent was stopped before the hang, and was told what to run instead.

## 2. The hook's decision payload

```bash
$ printf '{"tool_name":"Bash","tool_input":{"command":"npm test"}}' \
    | node .claude/hooks/guard-commands.mjs
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Blocked: `npm test` runs vitest in WATCH mode ..."
  }
}
```

## 3. It blocks the right things and only the right things

A guard that over-blocks gets disabled within a day, so the near-misses are tested explicitly.
Reproduce with `bash .claude/hooks/test-guard.sh`:

```
--- should DENY ---
npm test                                       DENY
npm t                                          DENY
npx vitest                                     DENY
cd /x && npm test                              DENY
git commit -m "wip" --no-verify                DENY
git commit -n -m "wip"                         DENY
git push --force origin main                   DENY
--- should ALLOW ---
npm run test:run                               ALLOW
npx vitest run                                 ALLOW
npm run build                                  ALLOW
git commit -m "real commit"                    ALLOW
git push --force-with-lease origin pedro/my-branch ALLOW
git push origin pedro/my-branch                ALLOW
npm install                                    ALLOW
```

14/14 correct. Note `--force-with-lease` to a feature branch is allowed while `--force` to
`main` is not, and `test:run` survives while `npm t` does not.

Every evaluation is appended to `.claude/hooks/guard.log` (gitignored). Live tail from the run
above — the last line is the headless session in §1:

```
2026-09-24T16:51:34.039Z	DENY	npm-test-watch	npm test
2026-09-24T16:51:34.365Z	DENY	no-verify	git commit -m "wip" --no-verify
2026-09-24T16:51:34.526Z	DENY	force-push-protected	git push --force origin main
2026-09-24T16:51:34.607Z	ALLOW	-	npm run test:run
2026-09-24T16:52:00.589Z	DENY	npm-test-watch	npm test
```

## 4. The `/verify` skill runs green

```
$ npx tsc --noEmit
(exit 0)

$ npm run test:run
 ✓ tests/db.test.ts (4 tests) 66ms
 ✓ tests/models/book.test.ts (4 tests) 66ms
 ✓ tests/routes/api.test.ts (6 tests) 113ms
 Test Files  3 passed (3)
      Tests  14 passed (14)

$ npm run build
(exit 0)

$ git status --porcelain
?? .claude/
?? CLAUDE.md          # this deliverable, nothing else
```

## Design notes

- **Fails open.** Unparseable stdin or a missing command exits 0 and allows. A bug in the guard
  must never block real work.
- **No new dependencies.** Written in Node, which the repo already requires, so it runs for
  anyone who can run the app.
- **The block explains the fix.** A deny that only says "not allowed" gets worked around; each
  reason names the command to run instead.
