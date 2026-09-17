# Prompt — After

Implement a `CustomerRepository` class following the Repository Pattern and TDD (red-green-refactor), in `src/repositories/customer.repository.ts` and `src/repositories/customer.repository.test.ts`.

**Context**: We're using [your stack — e.g. TypeScript + TypeORM + PostgreSQL + Jest]. Follow the same structure as `src/repositories/order.repository.ts` and its test file `order.repository.test.ts` — same mocking approach for the DB layer, same assertion style. The `Customer` entity is in `src/entities/customer.entity.ts`.

**Scope (this prompt only)**: cover these 5 methods — `create`, `findById`, `findAll`, `update`, `delete`. No controller, no DTOs — that's a separate step.

**Process — strict TDD, one method at a time**:
1. Write a failing test for the method (red). Run it and show me it fails for the right reason.
2. Write the minimum implementation to pass it (green).
3. Refactor if needed, keeping tests green.
4. Only then move to the next method.

**How**: grep the repo for `implements IRepository` to reuse the existing interface contract, and grep for existing `*.repository.test.ts` files to match the current mocking/test conventions before writing new tests.

**Definition of done**: every method has a test written *before* its implementation (don't let me skip ahead), `npm test` passes with no skipped tests, `npm run lint` and `npm run typecheck` are clean, and each method has at least one edge-case test (e.g., `findById` with a non-existent id, `create` with invalid data).

Write this as if briefing a capable but literal junior engineer who tends to write implementation before tests unless told explicitly — call out the red-green-refactor loop step by step, don't assume they'll default to it.
