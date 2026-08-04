# Test Runbook — Integration Test Standing Rules

> **Purpose (AI-8):** Codifies the H-4 live-DB test landmines discovered in Epic 1 so every
> integration test author has a durable reference. Read this before opening any PR that adds
> or modifies integration tests. If a new class of problem surfaces, amend this runbook on the
> same PR that fixes it.
>
> **Authority:** Epic 1 retrospective H-4 + AI-8. See Decision 2026-06-20-056 in `.decision-log.md`.
> Related memory: `[[project_live_db_test_gotchas]]`.
>
> **Scope note:** Rules 1–5 are live-DB / integration landmines (AI-8). **Rule 6
> (assertion quality)** applies to **all** tests — unit and integration — and comes from
> Epic 2 (H-4 / AI-2-3). **Rule 7 (suite-level timeout)** is a live-DB landmine added
> 2026-07-11 during Story 6.8 code review.

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

**⚠ A SHARED FIXTURE TENANT IS NOT "THE TEST'S OWN DATA SCOPE" (added 2026-08-04).** The bullet
above is necessary but not sufficient, and four specs satisfied it while still breaking:
`multi-tenant/cross-pariwar-leak.spec.ts` (×2), `rls/policy-regression.spec.ts` and
`pool/active-contribution-read.spec.ts` all scoped to `PARIWAR_A` — a constant from `_helpers.ts`
that **every** suite shares. Scoping to it narrows nothing. `setupLiveDb()`'s per-test rollback does
not save you either: it rolls back *your* transaction, while own-committing suites elsewhere leave
`PARIWAR_A` rows committed forever.

Symptom: green on a fresh CI service container, red on any reused local DB — so `pnpm ci:local`
with `DATABASE_URL` set silently stops being trustworthy as rows accumulate.

For an RLS/isolation probe, the property is **isolation**, never cardinality. Assert:

```ts
expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);  // nothing foreign leaked
expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);  // the adversary row specifically
expect(rows.map((r) => r.streamId)).toContain(mySeededId);        // and the read wasn't vacuous
```

That third line matters — `every()` over an empty array is `true`, so without a presence check a
totally broken read passes (Rule 6). For an aggregate, assert the aggregate agrees with the
RLS-filtered `SELECT` rather than an absolute number: a `COUNT` that bypassed RLS would exceed it.

An absolute count is only safe when the row's scope key is **minted inside the test**
(`randomUUID()`), never when it comes from a shared fixture.

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

## Rule 6 — Assertions Must Be Falsifiable (No Vacuous / Tautological Tests)

> **Authority:** Epic 2 retrospective **H-4 / AI-2-3**. Applies to **all** tests (unit and
> integration), not only the live-DB rules above. Companion to the domain-accessor invariants
> (`docs/domain-accessor-invariants.md`, families b/c required-tests).

**Problem:** A test can be green while asserting nothing. Three forms recurred across Epic 2:

- **Vacuous-on-empty.** A positive assertion over a result set passes when the set is empty.
  `expect(rows.every(r => r.pariwarId === A)).toBe(true)` is **trivially true on `[]`** — if RLS
  broke and returned zero rows, the test would still pass. (2.6 P12, P17.)
- **Tautology / constant-vs-itself.** `expect(CATALOG.version).toBe(CATALOG_VERSION)` compares a
  value to the same imported constant — it can never catch a wrong literal. (2.6 P15.)
- **Untested guard.** A guard / branch added in the code with no test that fails when the guard
  is removed (empty-pins guard, double-revoke guard, RLS `WITH CHECK`). (2.6 P13/P14/P16; 2.1 P3.)

**Rule — every assertion must be able to fail:**

1. **Prove non-empty before asserting over a set.** Pair any `rows.every(...)` / `rows.some(...)`
   positive check with `expect(rows).not.toHaveLength(0)` (or assert the exact expected row). A
   negative test (`rows.some(A) === false`) is *also* satisfied by `[]` — add the symmetric
   positive (`rows.every(B) === true` **and** non-empty) so the test proves the data is there.
2. **Pin literals, not the constant under test.** Assert against the **expected literal value**
   (`expect(CATALOG_VERSION).toBe(2)`), not against the same constant the code imports.
3. **Every guard gets a test that fails without it.** If you add a domain guard / branch / RLS
   policy, add a test that goes red when the guard is deleted (the family-b/c required-tests in
   `docs/domain-accessor-invariants.md`). "The guard exists" is not coverage; "removing the guard
   breaks a test" is.
4. **Sanity check before the PR:** for each new assertion ask *"what bug would make this fail?"*
   If the answer is "none," the assertion is decoration — strengthen or delete it.

---

## Rule 7 — Suite-Level Timeout for Live-DB Tests That Round-Trip the DB Several Times

**Problem:** vitest's default `testTimeout` is 5000ms. A live-DB integration test that makes
several *individually fast* sequential round-trips to the shared :5433 Postgres (setup writes +
multiple HTTP `inject()` legs each doing DB work + assertion queries) can comfortably finish in
under 1s when run in isolation, but blow past 5000ms under `pnpm ci:local`'s concurrent
`turbo run test` load, where many other packages are hitting the same DB container at once. This
is a **contention flake**, not a real hang — the fix is a longer timeout, not a faster test.

**Rule:**
- If a live-DB test times out under `ci:local` but passes in isolation
  (`pnpm --filter <pkg> test <path>`), do not chase it as a correctness bug. Confirm the
  isolation-pass first, then apply a **suite-level** timeout override — the 3rd argument to the
  outer `describe(...)` call, NOT a per-`it()` override:

  ```ts
  describe.skipIf(!hasDatabase)('My live-DB suite (:5433)', () => {
    // ...tests...
  }, { timeout: 20000 });
  ```

- 20000ms (20s) is the established value — generous enough to absorb contention, still low enough
  to catch a real hang.
- Scope the override to the specific `describe` block that owns the slow test(s), not the whole
  file, if the file has multiple independent `describe` blocks.
- Add a one-line comment above the closing `}, { timeout: 20000 });` explaining *why* (contention
  under concurrent `ci:local` load, fast standalone) so a future reader doesn't "fix" it away.

**Precedent fixes using this exact pattern:** `apps/jobs/tests/audit/integrity-check.test.ts`
(2026-06-29), `apps/api/tests/integration/niyamavali-workflow.spec.ts`,
`apps/api/tests/integration/device-token/device-token.spec.ts`,
`apps/jobs/tests/data-export.test.ts`, `apps/api/tests/integration/terms-and-conditions.spec.ts`,
and `apps/api/tests/integration/medical/medical-disclose.spec.ts` (all 2026-07-11) — see
`[[project_known_livedb_test_failures]]` for the full list and per-file detail.

**If this keeps recurring across new files (whack-a-mole), stop patching per-suite and bump the
package's global `testTimeout` instead.** Five ci:local re-runs in one session each surfaced a
*different, previously-clean* file timing out — the per-suite override doesn't converge because any
sufficiently round-trip-heavy live-DB spec is a candidate under enough concurrent load, not a fixed
list. `apps/api/vitest.config.ts` and `apps/jobs/vitest.config.ts` both carry a global
`testTimeout: 20000` (added 2026-07-11) for exactly this reason — the per-suite overrides on
individual files are now redundant but left in place as documentation of which suites are known-slow.
If a THIRD package starts showing this pattern, add the same global bump there rather than
per-file-patching it first.

---

## References

- `packages/domain/migrations/meta/_journal.json` — Drizzle migration journal
- `.github/workflows/ci.yml` `integration-tests` job — the authoritative CI filter
- `scripts/ci-local.sh` — local mirror of the integration-tests job
- Memory `[[project_live_db_test_gotchas]]` — session-level live-DB gotchas
- Epic 1 retrospective H-4 — `_bmad-output/implementation-artifacts/epic-1-retro-2026-06-20.md` (Rules 1–5)
- Epic 2 retrospective H-4 / AI-2-3 — `_bmad-output/implementation-artifacts/epic-2-retro-2026-06-24.md` (Rule 6)
- `docs/domain-accessor-invariants.md` — family-b/c required-tests (Rule 6 §3) + reviewer checklist
- Decision 2026-06-20-056 — this runbook's authority entry (AI-8)
