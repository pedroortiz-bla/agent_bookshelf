---
name: jira-search
description: Search Jira issues with JQL via a shell wrapper that returns a compact key/status/assignee/summary table. Use for read-only lookups instead of the Atlassian MCP search tool.
---

Run `tools/jira-search.sh "<JQL>" [max_results]` with Bash and report the rows.

- Output is tab-separated: `KEY  STATUS  ASSIGNEE  SUMMARY`.
- Read-only. For creating or editing issues, use the Atlassian MCP tools.
- Example: `tools/jira-search.sh "project = PE AND text ~ security ORDER BY updated DESC" 10`
- If it fails with a missing-variable error, tell the user to fill in `~/.config/jira-search.env` (JIRA_SITE, JIRA_EMAIL, JIRA_API_TOKEN).
