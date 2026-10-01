# Session 5: MCP Audit & Shell Wrapper

Branch `pedro/session-5-mcp-wrapper` of agent_bookshelf. Original project README is on `main`.

- **MCP audit** (servers, top 3 tools each): [docs/session-5-mcp-audit.md](docs/session-5-mcp-audit.md)
- **Shell wrapper:** [tools/jira-search.sh](tools/jira-search.sh), a read-only Jira JQL search (curl + jq)
- **Skill:** [.claude/skills/jira-search/SKILL.md](.claude/skills/jira-search/SKILL.md)
- **Evidence:** [docs/evidence/](docs/evidence/): wrapper output and MCP vs wrapper size comparison (272,846 vs 4,039 bytes for the same 50-issue query, ~68x smaller)
