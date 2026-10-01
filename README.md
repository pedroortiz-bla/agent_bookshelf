# Session 5: MCP Audit & Shell Wrapper

Branch `pedro/session-5-mcp-wrapper` of agent_bookshelf. The original project README is on `main`.

## The task
Session 5 (Agent Orchestration, MCP & CLI Tools):
1. List every MCP server in the workspace configuration
2. For each, identify the three most frequently called tools
3. Pick one read-heavy candidate: write a shell wrapper and wrap it in a skill
4. Measure the context difference

## What's here
| Step | Where |
|---|---|
| 1-2. MCP servers and top 3 tools | [docs/session-5-mcp-audit.md](docs/session-5-mcp-audit.md) |
| 3. Shell wrapper (read-only Jira JQL search, curl + jq) | [tools/jira-search.sh](tools/jira-search.sh) |
| 3. Skill | [.claude/skills/jira-search/SKILL.md](.claude/skills/jira-search/SKILL.md) |
| 4. Context measurement | [docs/evidence/](docs/evidence/) |

## Evidence summary
Candidate: Atlassian `searchJiraIssuesUsingJql`, the most-called read tool (45 calls).

Same query, 50 issues (`project = PE AND text ~ security ORDER BY updated DESC`):

| Path | Output | Approx. tokens |
|---|---|---|
| Atlassian MCP | 272,846 bytes (rejected by the harness as too large for context) | ~68,000 |
| `jira-search.sh` via skill | 4,039 bytes | ~1,000 |

About 68x smaller. Measured as output size with a token estimate, not a `/context` reading.
