# Session 5: MCP audit, shell wrapper, skill

## MCP servers and most-called tools
Counted from Claude Code session transcripts for this workspace.

| Server | Top tools (calls) |
|---|---|
| claude-in-chrome | computer (124), navigate (73), javascript_tool (34) |
| Atlassian | searchJiraIssuesUsingJql (45), createJiraIssue (39), getJiraIssue (26) |
| Claude Docs | update (19), guide (19), batch (19) |
| Slack | slack_send_message (14) |
| Figma | get_screenshot (6) |
| Context7 | resolve-library-id (3) |
| Google Calendar / Drive / Gmail | connected, no calls recorded |
| Amplitude, Asana, Box, Canva, Fathom, Fireflies, Granola, HubSpot, Intercom, Linear, monday.com, Notion, Rocketlane, Salesforce, ZoomInfo, Stripe | not authenticated |

## Read-heavy candidate
Atlassian `searchJiraIssuesUsingJql` (read-only, most called).

- Wrapper: `tools/jira-search.sh "<JQL>" [max]` (curl + jq, reads `~/.config/jira-search.env`, never committed)
- Skill: `.claude/skills/jira-search/SKILL.md`

## Evidence
`tools/jira-search.sh "project = PE AND text ~ security ORDER BY updated DESC" 5`

```
PE-4454	Done	Gustavo Silva	Per-device session hardening: Secure cookie on staging, ...
PE-4443	Backlog	Pedro Ortiz Cattebeke	Audit and rotate credentials in tracked env files; untrack them
PE-4387	Done	Pedro Ortiz Cattebeke	Penetration Test Vulnerabilities: Deprecation
PE-4384	Done	Gustavo Silva	Penetration Test Vulnerabilities: Timeout
PE-4390	Done	Pedro Ortiz Cattebeke	SOC2 Tickets: Network Security control
```

Same query, 5 issues:

| Output | Bytes |
|---|---|
| Raw REST response (`fields=*all`, what the MCP returns by default) | 79,169 |
| Wrapper output | 493 |

About 160x smaller, roughly 20k tokens against about 150 tokens (at ~4 bytes/token).
Per-session context measurement (before/after `/context`) is still to be done in the next session.
