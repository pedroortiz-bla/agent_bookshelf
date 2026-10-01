# Session 6: Test Generation

Branch `pedro/session-6-test-gen` of agent_bookshelf. The original project README is on `main`.

## The task
Session 6 (Designer & QA Workflows): pick a function, run the 5-step test generation workflow, and arrive with 3+ tests that have been read and understood.

## What's here
- **Function under test:** the `Book` model in [src/models/book.ts](src/models/book.ts): `updateBook`, `deleteBook`, `searchBooks`, plus `createBook` edge cases
- **Tests:** [tests/models/book.test.ts](tests/models/book.test.ts)

## Evidence summary
- Test count in `book.test.ts`: 4 -> 19 (15 new)
- Full suite: 29 passing (`npm run test:run`)
- New coverage: partial and empty updates, null fields, duplicate ISBN (update and create), missing title, delete success and miss, search by title and author, case-insensitivity, ordering, no match, empty query
- Commit history on this branch shows the change
