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
 * Protocol: reads the PreToolUse payload on stdin, writes a PreToolUse
 * hookSpecificOutput decision on stdout. Silence (exit 0, no output) = allow.
 * Every evaluation is appended to .claude/hooks/guard.log.
 */

import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const LOG = join(projectDir, '.claude', 'hooks', 'guard.log');

/** @type {{name: string, test: (cmd: string) => boolean, reason: string}[]} */
const RULES = [
  {
    name: 'npm-test-watch',
    // `npm test` / `npm t` / bare `vitest`, but not `test:run` or `vitest run`.
    test: (cmd) =>
      /(^|[;&|]\s*)(npm\s+(test|t)|yarn\s+test|pnpm\s+test)(?!\S)(?!.*(:run|--\s*run|\brun\b))/.test(cmd) ||
      /(^|[;&|]\s*)(npx\s+)?vitest(?!\S)(?!.*\brun\b)/.test(cmd),
    reason:
      'Blocked: `npm test` runs vitest in WATCH mode — it prints "Waiting for file changes..." ' +
      'and never exits, which hangs this turn until the command is killed.\n' +
      'Use `npm run test:run` (same suite, `vitest run`, exits with a real status code).',
  },
  {
    name: 'no-verify',
    test: (cmd) => /\bgit\b.*\bcommit\b.*(--no-verify|(^|\s)-n(\s|$))/.test(cmd),
    reason:
      'Blocked: `git commit --no-verify` skips the hooks instead of fixing what they caught.\n' +
      'Run `/verify` (typecheck, `npm run test:run`, build), fix the failure, then commit normally.',
  },
  {
    name: 'force-push-protected',
    test: (cmd) =>
      /\bgit\b.*\bpush\b.*(--force(?!-with-lease)|(^|\s)-f(\s|$))/.test(cmd) &&
      /\b(main|master)\b/.test(cmd),
    reason:
      'Blocked: force-push to main/master. Push to a feature branch and open a PR instead.',
  },
];

function log(verdict, rule, command) {
  const line = `${new Date().toISOString()}\t${verdict}\t${rule}\t${command.replace(/\s+/g, ' ').slice(0, 200)}\n`;
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

  for (const rule of RULES) {
    if (rule.test(command)) {
      log('DENY', rule.name, command);
      deny(rule.reason);
    }
  }

  log('ALLOW', '-', command);
  process.exit(0);
});
