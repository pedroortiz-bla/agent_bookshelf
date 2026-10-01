#!/usr/bin/env bash
# Read-only Jira JQL search that prints a compact table instead of raw API JSON.
# Usage: tools/jira-search.sh "<JQL>" [max_results=20]
# Credentials: JIRA_SITE, JIRA_EMAIL, JIRA_API_TOKEN from the environment,
# or from ~/.config/jira-search.env (never commit this file).
set -euo pipefail

ENV_FILE="${JIRA_ENV_FILE:-$HOME/.config/jira-search.env}"
# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

: "${JIRA_SITE:?set JIRA_SITE (e.g. cortexintel.atlassian.net)}"
: "${JIRA_EMAIL:?set JIRA_EMAIL}"
: "${JIRA_API_TOKEN:?set JIRA_API_TOKEN}"

JQL="${1:?usage: jira-search.sh \"<JQL>\" [max_results]}"
MAX="${2:-20}"

RESP="$(curl -sS -w '\n%{http_code}' -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -X POST "https://$JIRA_SITE/rest/api/3/search/jql" \
  -d "$(jq -n --arg jql "$JQL" --argjson max "$MAX" \
        '{jql:$jql, maxResults:$max, fields:["summary","status","assignee","issuetype"]}')")"
CODE="${RESP##*$'\n'}"
BODY="${RESP%$'\n'*}"

if [ "$CODE" != "200" ]; then
  echo "Jira returned HTTP $CODE: $(printf '%s' "$BODY" | head -c 400)" >&2
  exit 1
fi

printf '%s' "$BODY" |
  jq -r '.issues[] | [.key, .fields.status.name, (.fields.assignee.displayName // "Unassigned"), .fields.summary] | @tsv'
