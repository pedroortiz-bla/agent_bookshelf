# Memory Bank

Durable project knowledge for Agent Bookshelf — the things that are true about this repo but
are not obvious from reading it, and that cost someone time to find out.

## What goes here

| File | Contents | Read it |
|---|---|---|
| [`gotchas.md`](gotchas.md) | Tripwires: things that look fine and are not | **Always** — load at the start of every task |
| [`architecture.md`](architecture.md) | How a request becomes a response; where state lives | Before any change crossing route ↔ model ↔ db |
| [`patterns.md`](patterns.md) | The established way to write a model, route, test | Before writing new code of that kind |
| [`decisions.md`](decisions.md) | Choices already made, with rationale | Before proposing something that conflicts |
| [`open-questions.md`](open-questions.md) | Unresolved items; `[BLOCKER]` gates scope | When scoping or estimating |

## What does *not* go here

- Anything the code already says plainly. "Books live in `src/models/book.ts`" is not knowledge.
- Anything git already records. Past fixes belong in commit messages.
- Task-local detail. If it stops being true when this branch merges, it is not durable.

The test: **would a competent person waste time rediscovering this?** If no, leave it out. A
memory bank that accumulates the obvious stops being read, and an unread memory bank is worse
than none, because people assume it is covering them.

## Entry format

Every gotcha entry carries a tag, a claim, and the evidence for the claim:

```markdown
- **[GOTCHA:short-tag] One-sentence claim in bold.** Why it happens, mechanically. Then the
  repro or the file:line that proves it, and what to do instead.
```

Two rules that keep this file trustworthy:

1. **Verified or labelled.** Anything not reproduced gets an explicit `Unverified:` prefix.
   Confident-sounding guesses are the failure mode that kills a memory bank.
2. **Cite the proof.** A `file.ts:48` reference or a pasted repro means the next reader can
   re-check it instead of trusting it. Claims rot; repros stay falsifiable.

## Maintenance loop

```
work → hit something surprising → verify it → /remember → commit
                                                   ↓
                              gotchas.md entry, and if it is mechanically
                              preventable, a hook rule in .claude/hooks/
```

Capturing with [`/remember`](../.claude/skills/remember/SKILL.md) is the last step of any
non-trivial task. Where a finding can be enforced rather than documented, enforce it — the
`npm test` watch-mode trap below is both an entry here *and* a deny rule in
`.claude/hooks/guard-commands.mjs`, because documentation only helps the agent that read it.

When an entry turns out to be wrong, delete it. Do not append a correction underneath.
