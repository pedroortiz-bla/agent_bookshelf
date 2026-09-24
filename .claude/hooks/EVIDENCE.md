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
$ claude -p "Run the test suite with 'npm run test'. If something blocks it, quote the
   block verbatim and stop."
```

Output:

```
The tests didn't run. The project's PreToolUse:Bash hook blocked `npm run test` before it
started. The block, verbatim:

> PreToolUse:Bash hook error: Blocked: this runs vitest in WATCH mode — it prints
> "Waiting for file changes..." and never exits, which hangs this turn until the command
> is killed.
> Use `npm run test:run` (same suite, `vitest run`, exits with a real status code).

As you asked, I've stopped there. The hook suggests `npm run test:run` instead, which runs
the same tests once and exits.
```

The agent was stopped before the hang, and was told what to run instead.

## 2. The hook's decision payload

```bash
$ printf '{"tool_name":"Bash","tool_input":{"command":"npm run test"}}' \
    | node .claude/hooks/guard-commands.mjs
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Blocked: this runs vitest in WATCH mode ..."
  }
}
```

## 3. It blocks the right things and only the right things

A guard that over-blocks gets disabled within a day, and one that under-blocks is decoration.
Both directions are tested. Reproduce with `bash .claude/hooks/test-guard.sh` (exits non-zero
if any case regresses):

```
watch-mode test commands (hang the turn) -> DENY
  ok    DENY   npm test
  ok    DENY   npm t
  ok    DENY   npm run test
  ok    DENY   yarn test
  ok    DENY   pnpm run test
  ok    DENY   npx vitest
  ok    DENY   yarn vitest
  ok    DENY   vitest
  ok    DENY   npm test; echo done
  ok    DENY   npm test && npm run build
  ok    DENY   cd /x && npm test
  ok    DENY   npm test -- --reporter=verbose
one-shot test commands -> ALLOW
  ok    ALLOW  npm run test:run
  ok    ALLOW  npm run test:run -- --coverage
  ok    ALLOW  npx vitest run
  ok    ALLOW  vitest --run
  ok    ALLOW  npm test -- --run
  ok    ALLOW  npm run test:run | tail -5
commit hygiene
  ok    DENY   git commit -m "wip" --no-verify
  ok    DENY   git commit -n -m "wip"
  ok    ALLOW  git commit -m "real commit"
  ok    ALLOW  git commit -m "fix the -n flag bug"
  ok    ALLOW  git commit -m "document --no-verify policy"
push safety
  ok    DENY   git push --force origin main
  ok    DENY   git push -f origin master
  ok    ALLOW  git push --force-with-lease origin pedro/my-branch
  ok    ALLOW  git push --force origin pedro/my-branch
  ok    ALLOW  git push origin pedro/my-branch
unrelated commands -> ALLOW
  ok    ALLOW  npm install
  ok    ALLOW  npm run build
  ok    ALLOW  git status --porcelain
all cases passed
```

33/33. The ALLOW half is the half that matters for adoption: `npm run test:run`, `npx vitest
run` and `npm test -- --run` survive, `--force-with-lease` to a feature branch survives, and a
commit message that merely *mentions* `-n` or `--no-verify` is not mistaken for the flag.

### What the first version got wrong

The harness above is larger than the one I started with, because reviewing the guard against
commands I had not thought to test found four false negatives — every one of them a command
that hangs exactly like `npm test`:

| Command | First version | Cause |
|---|---|---|
| `npm run test` | ALLOW | matched only `npm test`, not the `npm run <script>` form |
| `npm test; echo done` | ALLOW | the boundary check was `(?!\S)`, and `;` is not whitespace |
| `npm test && npm run build` | ALLOW | the "is this one-shot?" lookahead scanned the *whole* command, so a later `npm run …` disarmed the rule |
| `yarn vitest` | ALLOW | only `npx` was accepted as a runner prefix |

The fix was to stop pattern-matching the command as one string: it is now split on `;`, `&&`,
`||`, `|` and `&`, each segment is matched on its own, and the one-shot check looks only at the
arguments *following* the matched command — otherwise the `run` in `npm run test` reads as
vitest's `run` subcommand and disarms the rule, which is exactly the bug that survived the
first fix. Flag detection runs on a quote-stripped copy, so `git commit -m "fix -n bug"` is no
longer read as `git commit -n`.

Every evaluation is appended to `.claude/hooks/guard.log` (gitignored). Live tail:

```
2026-09-24T17:13:39.899Z	ALLOW	-	npm install
2026-09-24T17:13:39.986Z	ALLOW	-	npm run build
2026-09-24T17:13:40.072Z	ALLOW	-	git status --porcelain
2026-09-24T17:13:56.458Z	DENY	npm-test-watch	npm run test
```

The last line is the live headless session from §1 — a real agent, stopped before the hang.

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
