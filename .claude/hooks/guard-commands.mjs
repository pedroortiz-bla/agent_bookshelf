#!/usr/bin/env node
/**
 * PreToolUse(Bash) guard for Agent Bookshelf.
 *
 * Blocks the three commands that have actually cost time in this repo:
 *
 *   1. `npm test`      -> vitest watch mode; never exits, hangs the agent turn.
 *   2. `--no-verify`   -> skips hooks instead of fixing what they caught.
 *   3. force-push to main/master.
 *
 * Matching is per *segment*: the command is split on `;`, `&&`, `||`, `|` and `&`, and each
 * part is tested on its own. A whole-string match is not good enough — `npm test && npm run
 * build` has to be caught on its first segment, and a later `npm run ...` must not disarm the
 * rule. Flag detection runs on a quote-stripped copy so `git commit -m "fix -n bug"` is not
 * mistaken for `git commit -n`.
 *
 * Protocol: reads the PreToolUse payload on stdin, writes a PreToolUse hookSpecificOutput
 * decision on stdout. Silence (exit 0, no output) = allow.
 * Every evaluation is appended to .claude/hooks/guard.log.
 */

import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const LOG = join(projectDir, '.claude', 'hooks', 'guard.log');

/** Split a shell command into independently-executed parts. */
const segments = (command) =>
  command
    .split(/\n|;|&&|\|\||\||&/g)
    .map((s) => s.trim())
    .filter(Boolean);

/** Blank out quoted strings so their contents cannot look like flags. */
const stripQuoted = (s) => s.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'[^']*'/g, "''");

// `npm test`, `npm t`, `npm run test`, `yarn test`, `pnpm run test` — but NOT `test:run`,
// because the `:` is excluded by the trailing lookahead.
const PM_TEST = /^(?:npm|yarn|pnpm)\s+(?:run\s+)?(?:test|t)(?![\w:.-])/;
// `vitest`, `npx vitest`, `yarn vitest`, `pnpm exec vitest`, `pnpm dlx vitest`.
const VITEST = /^(?:(?:npx|yarn|pnpm)\s+(?:exec\s+|dlx\s+)?)?vitest(?![\w.-])/;
// Anything that turns vitest into a one-shot run. Only ever tested against the arguments
// that follow the command, never the whole segment.
const ONE_SHOT = /(?:^|\s)(?:run|--run|--watch[= ]false|--no-watch)(?:$|[\s=])/;

const GIT_COMMIT = /\bgit\b.*\bcommit\b/;
const GIT_PUSH = /\bgit\b.*\bpush\b/;
const NO_VERIFY = /(?:^|\s)(?:--no-verify|-n)(?:$|[\s=])/;
const FORCE = /(?:^|\s)(?:--force|-f)(?:$|[\s=])/; // --force-with-lease deliberately excluded
const PROTECTED_BRANCH = /\b(?:main|master)\b/;

/** @type {{name: string, test: (seg: string, bare: string) => boolean, reason: string}[]} */
const RULES = [
  {
    name: 'npm-test-watch',
    // Match the command, then look for a one-shot switch only in what FOLLOWS it — the `run`
    // in `npm run test` is part of the invocation, not vitest's `run` subcommand.
    test: (seg, bare) => {
      const m = PM_TEST.exec(bare) || VITEST.exec(bare);
      return m ? !ONE_SHOT.test(bare.slice(m[0].length)) : false;
    },
    reason:
      'Blocked: this runs vitest in WATCH mode — it prints "Waiting for file changes..." and ' +
      'never exits, which hangs this turn until the command is killed.\n' +
      'Use `npm run test:run` (same suite, `vitest run`, exits with a real status code).',
  },
  {
    name: 'no-verify',
    test: (seg, bare) => GIT_COMMIT.test(seg) && NO_VERIFY.test(bare),
    reason:
      'Blocked: `git commit --no-verify` skips the hooks instead of fixing what they caught.\n' +
      'Run `/verify` (typecheck, `npm run test:run`, build), fix the failure, then commit normally.',
  },
  {
    name: 'force-push-protected',
    test: (seg, bare) => GIT_PUSH.test(seg) && FORCE.test(bare) && PROTECTED_BRANCH.test(seg),
    reason:
      'Blocked: force-push to main/master. Push to a feature branch and open a PR instead.\n' +
      '(`--force-with-lease` to a feature branch is allowed.)',
  },
];

function log(verdict, rule, text) {
  const line = `${new Date().toISOString()}\t${verdict}\t${rule}\t${text.replace(/\s+/g, ' ').slice(0, 200)}\n`;
  try {
    appendFileSync(LOG, line);
  } catch {
    /* logging must never break the hook */
  }
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    process.exit(0); // unparseable input: fail open, never block real work on a guard bug
  }

  const command = payload?.tool_input?.command ?? '';
  if (!command) process.exit(0);

  for (const segment of segments(command)) {
    const bare = stripQuoted(segment);
    for (const rule of RULES) {
      if (rule.test(segment, bare)) {
        log('DENY', rule.name, segment);
        deny(rule.reason);
      }
    }
  }

  log('ALLOW', '-', command);
  process.exit(0);
});
