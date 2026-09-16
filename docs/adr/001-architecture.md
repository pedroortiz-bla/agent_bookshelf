# ADR-001: Application Architecture for Agent Bookshelf

**Date:** 2026-09-14  
**Status:** Proposed

## Context

We are building a Goodreads-lite application that serves as a teaching playground for an AI agents course. Students install it locally and use AI agents (Claude Code, etc.) to complete homework: writing prompts for features, generating tests, reviewing agent output. The codebase must be easy to install on Windows/Mac/Linux and structured with deliberate gaps for homework assignments.

## Decision

We will build a TypeScript Node.js application using Express, SQLite via sql.js (WebAssembly), EJS templates, and HTMX. It will ship as an npx-installable CLI that starts a local web server with both HTML views and a JSON API. Data will be pre-seeded on first run.

## Rationale

Express is universally known by AI agents, making it ideal for agent-assisted development. SQLite requires zero configuration — students just run `npx agent-bookshelf` and it works. TypeScript gives agents type information to produce correct code. HTMX provides interactivity without a build step or framework complexity. The dual HTML+API surface gives homework more area to target.

## Trade-offs

**Positive:**
- Zero-config install via npx + SQLite — no database setup, no env vars
- TypeScript + Express = agents produce higher-quality code
- Deliberate test/feature gaps make homework assignments concrete

**Negative:**
- TypeScript adds a compile step (mitigated by tsx for dev, tsc for build)
- HTMX is a dependency some students won't know (mitigated: it's small and agents understand it well)
- No SPA means less "modern frontend" homework surface (acceptable: this is about agents, not frontend frameworks)
