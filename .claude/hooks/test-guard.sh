#!/bin/bash
# Reproducible test harness for guard-commands.mjs. Run from the repo root:
#   bash .claude/hooks/test-guard.sh

run() {
  printf '%-46s ' "$1"
  out=$(printf '{"tool_name":"Bash","tool_input":{"command":%s}}' "$(node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1")" \
    | node .claude/hooks/guard-commands.mjs)
  if [ -z "$out" ]; then echo "ALLOW"; else echo "DENY"; fi
}
echo "--- should DENY ---"
run 'npm test'
run 'npm t'
run 'npx vitest'
run 'cd /x && npm test'
run 'git commit -m "wip" --no-verify'
run 'git commit -n -m "wip"'
run 'git push --force origin main'
echo "--- should ALLOW ---"
run 'npm run test:run'
run 'npx vitest run'
run 'npm run build'
run 'git commit -m "real commit"'
run 'git push --force-with-lease origin pedro/my-branch'
run 'git push origin pedro/my-branch'
run 'npm install'
