---
name: remember
description: Capture a verified learning, gotcha, decision, or pattern into memory-bank/. Use after any non-trivial task, and any time something in this repo behaved differently from how it reads.
---

# /remember

Turn something you just found out into something the next session does not have to rediscover.

Run this as the last step of any non-trivial task, and immediately whenever you hit a surprise —
a command that hung, an error whose message pointed at the wrong file, a file that turned out to
be dead code.

## 1. Decide whether it is worth writing

Write it down only if **a competent person would waste time rediscovering it**.

Skip it if:

- the code already says it plainly (`getAllBooks` is in `book.ts` — not knowledge),
- git already records it (a past fix belongs in its commit message),
- it stops being true when this branch merges (task-local detail),
- it is general knowledge about the language or framework, not about *this repo*.

Most findings fail this test. That is the point — an index of the obvious stops being read.

## 2. Verify before you write

**Do not record anything you have not reproduced.** A memory bank is trusted by default, so a
confident wrong entry costs more than the missing entry would have. Either:

- reproduce it and keep the output, or
- cite the `file.ts:line` that proves it, or
- write the entry with an explicit `Unverified:` prefix and say what would settle it.

If reproducing it is cheap, reproduce it. Most of `gotchas.md` was written from a repro that
took under a minute.

## 3. Pick the file

| Finding | Goes in |
|---|---|
| Behaves differently from how it reads; a trap | `memory-bank/gotchas.md` |
| How the system fits together; where state lives | `memory-bank/architecture.md` |
| The established way to write this kind of code | `memory-bank/patterns.md` |
| A choice made, with rationale, that should not be silently reversed | `memory-bank/decisions.md` |
| Unresolved, and it gates work | `memory-bank/open-questions.md` |

Check for an existing entry first and **update it in place** rather than appending a second,
near-duplicate one. If an entry turns out to be wrong, delete it — do not append a correction
underneath, because both halves then read as current.

## 4. Write it

Gotcha entries take this shape:

```markdown
- **[GOTCHA:short-kebab-tag] The claim, in one bold sentence.** Then the mechanism — *why* it
  happens, with the `file.ts:line` that shows it. Then the repro output. Then what to do
  instead.
```

Lead with the claim, not the story of how you found it. The reader is scanning for the one
entry that matches their symptom.

## 5. Enforce it if you can

Ask: **could a hook make this unreachable instead of merely documented?**

Documentation only helps the agent that read it; a `PreToolUse` deny helps every agent. If the
finding is a command that should never run, add a rule to `.claude/hooks/guard-commands.mjs`,
add a case to `.claude/hooks/test-guard.sh`, and run that harness. Cross-reference the entry
and the rule so neither is deleted alone. (The hook and its harness ship on the
`pedro/session-3-skill-hook` branch, PR #1; if they are not present, record the proposed rule
in `open-questions.md` instead.)

`[GOTCHA:npm-test-watch]` is the worked example: an entry in `gotchas.md` *and* a deny rule.

## 6. Commit it

Commit the memory-bank change with the work that produced it, or on its own if the task
produced no code. Say in the message what was learned, not just "update docs":

```
Record the sql.js persistence gap in the memory bank

Writes are held in WASM memory; the server never calls saveDb/closeDb, so
everything created through the app is lost on exit. Verified with a
two-process repro.
```
