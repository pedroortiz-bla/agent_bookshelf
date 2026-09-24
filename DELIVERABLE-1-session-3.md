# Deliverable 1 — Session 3: Skills, Hooks & Commands

> **Assignment:** Create one skill (SKILL.md) or hook from a real repeated task in your own
> workflow. Test that it actually triggers.

**Branch:** `pedro/session-3-skill-hook` · **PR:** https://github.com/pedroortiz-bla/agent_bookshelf/pull/1

This deliverable ships **both**: a `/verify` skill that says what "verified" means for this
repo, and a `PreToolUse(Bash)` hook that makes the ways an agent usually fails verification
impossible.

## The repeated task

Before every PR I run a fixed verification suite. The usual ways an agent gets it wrong are
(a) running a command that never exits and (b) skipping checks with `--no-verify`. In this
repo, (a) is sitting right there: `npm test` is bare `vitest`, which runs in **watch mode**:

```
$ timeout 25 npm test < /dev/null
      Tests  14 passed (14)
 PASS  Waiting for file changes...     <-- never exits; the agent turn hangs
```

## What's in the branch

| File | Purpose |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Project instructions written from scratch: stack, layout, commands, hard rules |
| [`.claude/skills/verify/SKILL.md`](.claude/skills/verify/SKILL.md) | `/verify`: typecheck → `npm run test:run` → build → working-tree check |
| [`.claude/hooks/guard-commands.mjs`](.claude/hooks/guard-commands.mjs) | The hook: denies watch-mode tests, `git commit --no-verify`/`-n`, and force-pushes to `main`/`master` |
| [`.claude/settings.json`](.claude/settings.json) | Wires the hook to `PreToolUse` with the `Bash` matcher |
| [`.claude/hooks/test-guard.sh`](.claude/hooks/test-guard.sh) | 33-case allow/deny harness; exits non-zero if any case regresses |
| [`.claude/hooks/EVIDENCE.md`](.claude/hooks/EVIDENCE.md) | Full captured output (the source for everything below) |

## Evidence it works

**1. It triggers in a live Claude Code session.** This was a headless run, not a mock:

```
$ claude -p "Run the test suite with 'npm run test'. If something blocks it, quote the block verbatim and stop."

> PreToolUse:Bash hook error: Blocked: this runs vitest in WATCH mode — it prints
> "Waiting for file changes..." and never exits, which hangs this turn until the command
> is killed.
> Use `npm run test:run` (same suite, `vitest run`, exits with a real status code).
```

The hook's own log records the same event:

```
2026-09-24T17:13:56.458Z	DENY	npm-test-watch	npm run test
```

**2. It blocks the right things, and only those.** Run `bash .claude/hooks/test-guard.sh`:

| Category | Denied | Allowed |
|---|---|---|
| Tests | `npm test`, `npm run test`, `yarn vitest`, `npm test; echo`, `npm test && npm run build` | `npm run test:run`, `npx vitest run`, `npm test -- --run` |
| Commits | `git commit --no-verify`, `git commit -n` | `git commit -m "fix the -n flag bug"` |
| Pushes | `git push --force origin main` | `--force-with-lease` / `--force` to a feature branch |

Result: **33/33 passed.**

**3. `/verify` runs green:** `tsc --noEmit` exit 0 · 14/14 tests · build exit 0.

## Self-review found bugs, which are fixed and still visible in history

I reviewed the first version against commands I hadn't tested and found **four false
negatives**. Each one hangs exactly like `npm test`:

| Command | v1 | Root cause |
|---|---|---|
| `npm run test` | ALLOW | only the `npm test` spelling was matched |
| `npm test; echo done` | ALLOW | `(?!\S)` boundary — `;` isn't whitespace |
| `npm test && npm run build` | ALLOW | the one-shot lookahead scanned the whole string |
| `yarn vitest` | ALLOW | only `npx` accepted as a runner |

The fix splits the command on `; && || | &` and matches each segment on its own. The
one-shot check looks only at the arguments *after* the matched command. Flags are detected on a
copy with quoted text removed. The harness grew from 14 to 33 cases.

## Commit history

```
b4a981f Correct the working-tree step in /verify
981b3a6 Fix four false negatives in the command guard
6d28172 Add /verify skill and guard-commands PreToolUse hook
```

## Design choices

- **Fails open:** if the input can't be parsed, the command is allowed. A bug in the guard
  must never block real work.
- **No new dependencies:** the hook is plain Node, which the repo already needs.
- **Every deny names the fix:** the message says what to run instead, so it doesn't get
  worked around.

## Reproduce

```bash
git checkout pedro/session-3-skill-hook && npm install
bash .claude/hooks/test-guard.sh                    # 33/33
printf '{"tool_name":"Bash","tool_input":{"command":"npm run test"}}' \
  | node .claude/hooks/guard-commands.mjs            # deny payload
claude -p "run npm run test"                         # blocked live
```
