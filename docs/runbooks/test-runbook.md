# Test Runbook — Integration Test Standing Rules

> **Purpose (AI-8):** Codifies the H-4 live-DB test landmines discovered in Epic 1 so every
> integration test author has a durable reference. Read this before opening any PR that adds
> or modifies integration tests. If a new class of problem surfaces, amend this runbook on the
> same PR that fixes it.
>
> **Authority:** Epic 1 retrospective H-4 + AI-8. See Decision 2026-06-20-056 in `.decision-log.md`.
> Related memory: `[[project_live_db_test_gotchas]]`.

---

## Test Environment

| Item | Value |
|---|---|
| Test DB container | `twt-test-pg` Docker image, port **5433** |
| Connection string | `postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable` |
| Run integration suite | `DATABASE_URL=<above> pnpm turbo run test --filter=@twt/domain --filter=@twt/events --filter=@twt/jobs --filter=@twt/api --filter=@twt/queue` |
| CI filter | All five workspaces above must be in the `--filter` list (see §Rule 4) |
| Migrate before run | `pnpm db:migrate` against the test DB before running integration tests |

---

## Rule 1 — Never Regenerate an Applied Migration (42P07)

**Problem:** Drizzle tracks applied migrations by the `when` timestamp in the journal
(`packages/domain/migrations/meta/_journal.json`), not by SQL hash. If you run
`drizzle-kit generate` after a migration has already been applied to the test DB, Drizzle
may reuse the same `when` value and generate a migration the journal already considers applied.
The test DB then fails with `42P07: relation already exists` when `db:migrate` tries to apply it.

**Rule:**
- Never run `drizzle-kit generate` to fix a schema drift in a DB that has already had
  migrations applied to it. Instead, create a **new** migration.
- If you see `42P07` on `db:migrate`: check whether an existing migration was regenerated
  (compare `when` values in the journal vs. the SQL file timestamps). If so, delete the
  regenerated migration and create a proper new one.
- The correct flow: schema change → `drizzle-kit generate` (creates a new migration) →
  `pnpm db:migrate` (applies it). Never go backwards.

---

## Rule 2 — Never Reset via DROP SCHEMA (42P01)

**Problem:** `DROP SCHEMA public CASCADE` drops the `twt_app` role's `USAGE` grant on the
`public` schema. Subsequent `CREATE TABLE` / DML fails with `42P01: permission denied for
schema public` because `twt_app` can no longer see the schema.

**Rule:**
- Do not use `DROP SCHEMA public CASCADE` to reset the test DB between runs.
- The correct reset path: `pnpm db:migrate` (idempotent — Drizzle skips already-applied
  migrations). If you need a full reset, drop and recreate the database itself (not the
  schema), then re-grant roles. In practice the test suite is designed to be idempotent;
  a reset should not be necessary.
- If you see `42P01` after a schema drop: recreate the DB, re-run `db:migrate`, and ensure
  the `twt_app` role has `USAGE` on the `public` schema.

---

## Rule 3 — Assert Membership, Not Counts (Parallelism Flake)

**Problem:** Integration tests that commit rows (own-committing writers) accumulate rows in
the shared test DB across concurrent runs. A test that asserts `SELECT COUNT(*) = 1` will
fail when another parallel run has committed a row into the same table.

**Rule:**
- Assert **membership** (the specific row you created is present with the right values),
  not **counts** (total rows in the table = N).
- Scope every query with the test's own identifiers (e.g., `WHERE id = $testId`).
- If you must assert a count, scope it to the test's own data scope (e.g.,
  `WHERE pariwar_id = $testPariwayId`) — never assert on unbounded table counts.
- Prefer `UPSERT` + idempotency keys (the `@twt/queue` pattern) over raw inserts where
  the test needs to be re-runnable.

---

## Rule 4 — Every Integration Spec Must Be in the CI Filter

**Problem:** The `integration-tests` CI job uses an explicit `--filter` list. A new workspace
whose integration tests are not in the filter will run locally (when the developer runs
`pnpm turbo run test` without a filter) but be **invisible to CI**. The Story 1.11b `apps/api`
trustee-UI endpoint suite escaped CI detection this way during Epic 1.

**Rule:**
- Before merging a PR that adds integration tests to a workspace, verify that workspace is
  in the CI filter. The current filter is:

  ```
  --filter=@twt/domain --filter=@twt/events --filter=@twt/jobs --filter=@twt/api --filter=@twt/queue
  ```

  Found in: `.github/workflows/ci.yml` (integration-tests job) and `scripts/ci-local.sh`.

- If adding integration tests to a new workspace, amend **both** the ci.yml job and
  `ci-local.sh` on the same PR.
- Run `pnpm ci:local` with `DATABASE_URL` set to confirm the integration-tests job picks up
  the new suite before opening the PR.

---

## Rule 5 — `describe.skipIf(!hasDatabase)` Guard Pattern

All integration test suites use the `hasDatabase` guard to skip gracefully when no test DB
is available (i.e., in the unit-test-only `test` ci.yml job). The pattern:

```ts
import { hasDatabase } from '../helpers/db.js'; // or equivalent

describe.skipIf(!hasDatabase)('suite name', () => {
  // ...
});
```

This ensures the `test` job stays DB-free and the `integration-tests` job runs the full suite.
Do NOT add `if (process.env.DATABASE_URL)` guards inline — use `skipIf` at the describe level
so the suite structure is visible to the test runner even when skipped.

---

## References

- `packages/domain/migrations/meta/_journal.json` — Drizzle migration journal
- `.github/workflows/ci.yml` `integration-tests` job — the authoritative CI filter
- `scripts/ci-local.sh` — local mirror of the integration-tests job
- Memory `[[project_live_db_test_gotchas]]` — session-level live-DB gotchas
- Epic 1 retrospective H-4 — `_bmad-output/implementation-artifacts/epic-1-retro-2026-06-20.md`
- Decision 2026-06-20-056 — this runbook's authority entry
