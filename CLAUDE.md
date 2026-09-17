# CLAUDE.md — Agent Bookshelf

## Never-Ever
1. Never fill in the deliberate homework gaps (search backend in `src/routes/books.ts`, model tests, API validation, CSS redesign) unless explicitly asked — they exist on purpose for student assignments.
2. Never modify the pre-seeded data (`src/db/seed.sql` — 50 books, 3 users) without explicit request — students and instructors rely on it staying reproducible.
3. Never introduce native dependencies for the database layer — it must stay on `sql.js` (WebAssembly, zero native deps) so `npx agent-bookshelf` keeps working with zero configuration.

## Tech Stack
Express + TypeScript backend, SQLite via `sql.js`, EJS templates + HTMX frontend, Vitest for testing, Node.js 24 LTS.

## Scope
Maintain Agent Bookshelf as a teaching playground: a Goodreads-lite app (books, reviews, shelves) with a REST API, used by students to practice AI-agent-assisted homework assignments.

## Out of Scope
Production hardening or deployment infrastructure. This is explicitly a local, zero-config teaching sandbox (SQLite file, `npx`-based install) — not meant to be scaled, containerized, or deployed.
