#!/bin/bash
# Reproducible test harness for guard-commands.mjs. Run from the repo root:
#   bash .claude/hooks/test-guard.sh
# Exits non-zero if any case does not match its expected verdict.

fails=0

check() {
  expected="$1"; cmd="$2"
  out=$(printf '{"tool_name":"Bash","tool_input":{"command":%s}}' \
    "$(node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$cmd")" \
    | node "$(dirname "$0")/guard-commands.mjs")
  if [ -z "$out" ]; then actual="ALLOW"; else actual="DENY"; fi
  if [ "$actual" = "$expected" ]; then
    printf '  ok    %-6s %s\n' "$actual" "$cmd"
  else
    printf '  FAIL  got %-5s want %-5s  %s\n' "$actual" "$expected" "$cmd"
    fails=$((fails + 1))
  fi
}

echo "watch-mode test commands (hang the turn) -> DENY"
check DENY 'npm test'
check DENY 'npm t'
check DENY 'npm run test'
check DENY 'yarn test'
check DENY 'pnpm run test'
check DENY 'npx vitest'
check DENY 'yarn vitest'
check DENY 'vitest'
check DENY 'npm test; echo done'
check DENY 'npm test && npm run build'
check DENY 'cd /x && npm test'
check DENY 'npm test -- --reporter=verbose'

echo "one-shot test commands -> ALLOW"
check ALLOW 'npm run test:run'
check ALLOW 'npm run test:run -- --coverage'
check ALLOW 'npx vitest run'
check ALLOW 'vitest --run'
check ALLOW 'npm test -- --run'
check ALLOW 'npm run test:run | tail -5'

echo "commit hygiene"
check DENY  'git commit -m "wip" --no-verify'
check DENY  'git commit -n -m "wip"'
check ALLOW 'git commit -m "real commit"'
check ALLOW 'git commit -m "fix the -n flag bug"'
check ALLOW 'git commit -m "document --no-verify policy"'

echo "push safety"
check DENY  'git push --force origin main'
check DENY  'git push -f origin master'
check ALLOW 'git push --force-with-lease origin pedro/my-branch'
check ALLOW 'git push --force origin pedro/my-branch'
check ALLOW 'git push origin pedro/my-branch'

echo "unrelated commands -> ALLOW"
check ALLOW 'npm install'
check ALLOW 'npm run build'
check ALLOW 'git status --porcelain'

if [ "$fails" -eq 0 ]; then
  echo "all cases passed"
else
  echo "$fails case(s) failed"
  exit 1
fi
