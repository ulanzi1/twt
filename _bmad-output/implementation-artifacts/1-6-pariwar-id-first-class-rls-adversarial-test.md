# Story 1.6: `pariwar_id` First-Class + RLS Adversarial Test

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As **any Pariwar admin (and as Solo Builder building the multi-tenant substrate)**,
I want **`pariwar_id` enforced as a database-layer guarantee — Drizzle `pgPolicy` declarative RLS policies declared at `packages/domain/src/policies/` for every Pariwar-scoped table that exists at Story 1.6 closure (today that is `events_log` only, landed by Story 1.3); `ALTER TABLE events_log ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` installed via hand-supplemented migration 0002; the `app.pariwar_id` Postgres session-variable convention codified at `packages/domain/src/db.ts` with a `setPariwarScope(client, pariwarId)` helper + a `assertPariwarScopeSet(client)` connection-level fail-closed guard; the named cross-tenant operations helper substantively authored at `packages/domain/src/cross-tenant/` exposing a single `runAsCrossTenant(client, reason, fn)` call-site that issues `SET LOCAL row_security = off` + emits an audit-marker event (Story 1.10 substantive audit-log integration deferred); a Postgres service-container CI job (`integration-tests`) added to `.github/workflows/ci.yml` that boots Postgres 16, runs `pnpm --filter @twt/domain db:migrate`, and executes the new live-DB integration tests; the architecture-committed integration test slots `tests/integration/rls/policy-regression.spec.ts` + `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` substantively authored under `packages/domain/tests/integration/` covering both positive (allowed query returns expected rows) and negative (forbidden query returns empty under every probed query shape) cases; the Story 1.3 `packages/events/tests/append-event.test.ts` concurrency test upgraded from single-connection-SAVEPOINT to true two-connection parallel `appendEvent` per W4 deferral; the Story 1.2 Terraform `google_sql_user.app` posture (non-superuser, no BYPASSRLS) asserted declaratively via a `db_flag` annotation + a migration-time `pg_has_role`/`pg_roles` self-test that fails the migrator if the application role somehow gained `BYPASSRLS`**,
So that **multi-tenant data isolation is a Postgres-layer typed constraint per architecture §1.2 line 717-725 (Cross-Cutting #1: "every query scoped by `pariwar_id`; typed constraint at the data layer") rather than an application-layer discipline that can be silently undone by a forgotten `WHERE` clause, a junior dev's join, an ORM-generated query, or a future feature flag; every downstream Story that adds a multi-tenant table inherits RLS by default through the documented `packages/domain/src/policies/` pattern; the cross-Pariwar adversarial CI gate ("any leak is P0" per epics line 1098) is structurally proven from the first moment a Pariwar-scoped table exists in the schema; the live-DB CI substrate that Story 1.3 deferred + that the entire downstream `tests/integration/` ladder depends on (Story 1.10 audit-log integrity-check, Story 7.x Pool Engine replay, Story 9.x reconciliation matcher, Story 1.16b public-pages scrape) lands once and serves all of them; and Story 1.9 (admin authentication + first substantive `apps/api/` routes) inherits a ready-to-wire `setPariwarScope` primitive that the URL-path-prefix scope-resolution middleware (architecture §2.5 line 1449-1461) calls at handler entry without re-inventing the session-variable contract**.

This is the **sixth Epic 1 engineering story** (`[PRIMITIVE]`). It commits the **substrate** for AR-3 (epics line 258: "Multi-tenant isolation via Postgres Row-Level Security keyed on `pariwar_id` (architecture §1.2); adversarial cross-Pariwar read CI test required") + FR-59 (epics line 119: "`pariwar_id` first-class on every multi-tenant table. DB-level non-nullable FK; every query filters by `pariwar_id`; every endpoint resolves from auth context. Adversarial cross-Pariwar read test in CI") + architecture §1.2 (multi-tenant isolation via `pgPolicy` declarative API) + Cross-Cutting #1 ("Multi-tenant isolation — every query scoped by `pariwar_id`; typed constraint at the data layer; adversarial cross-Pariwar read test in CI; any leak is P0"). Per architecture §Implementation Handoff lines 5079-5099, this lands within PR-2 territory (the substrate half of Epic 1) alongside Stories 1.2 / 1.3 / 1.4 / 1.5 / 1.7 / 1.10 / 1.12.

Story 1.6 closes deferred-work D6-1.2 (substantive RLS pgPolicy + pariwar_id discipline), D13-1.2 (live DB integration test slots), D2-1.3 (live-DB CI substrate / Postgres service container), D9-1.3 (RLS pgPolicy declaration on events_log table), D10-1.3 (per-Pariwar event stream isolation invariant CI test), W4 (true two-connection concurrency test in append-event.test.ts), and W1 (BYPASSRLS not asserted in Terraform, from Story 1.2 deferred). It does NOT include: the application-layer Fastify `scope-resolution` middleware at `apps/api/src/middleware/scope-resolution/` (Story 1.9 territory — the middleware *calls* the `setPariwarScope` helper Story 1.6 commits, but the middleware itself lives in `apps/api/` and lands when the first substantive routes exist); the substantive audit-log line emitted by `runAsCrossTenant` (Story 1.10 territory — Story 1.6 emits an `audit.cross_tenant_access` *event* via Story 1.3's `appendEvent` as a placeholder; Story 1.10 wires the real `audit_log_entries` row); the carve-out RLS policies for the Pariwar-Passport tables (Story 1.7 — Story 1.6 commits the *pattern*, Story 1.7 commits the cross-Pariwar-readable policies for `pariwar_passport_*` tables); the `ips/` branded `PariwarId` type (Story 1.7); the per-Pariwar query-key isolation in TanStack Query (Story 1.9+ apps territory); the Story 1.16a friction-budget ESLint rule that forbids constructing service-role connections outside the `cross-tenant/` module (Story 1.16a CI gate territory).

## Acceptance Criteria

**AC-1 — `packages/domain/src/policies/` substantively authored with `events_log` `pgPolicy` declaration via Drizzle declarative API; `ALTER TABLE events_log ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` installed via hand-supplemented migration 0002; the application role (`twt_dev_app` per Story 1.2 Terraform) is the policy's bind target; both `SELECT` and `INSERT`/`UPDATE`/`DELETE` paths gate on `pariwar_id = current_setting('app.pariwar_id')::uuid`**

**Given** architecture §1.2 line 715-770 (RLS as the typed-constraint enforcement of Cross-Cutting #1; Drizzle's `pgPolicy` declarative API defines policies inside the schema; per-request session variable scopes every query) + AR-3 (epics line 258) + FR-59 (epics line 119) + the Story 1.3 `events_log` Drizzle table with `pariwar_id UUID NOT NULL` (Story 1.3 commits the column structurally per the explicit "Story 1.3 does NOT install RLS — Story 1.6 territory" guardrail at `packages/domain/src/schema/events_log.ts` line 82-83) + the Story 1.2 `packages/domain/src/policies/` placeholder directory + landing-Story README citing Story 1.6 ownership + the Story 1.2 application Postgres role (`twt_dev_app`, non-superuser, no BYPASSRLS by Cloud SQL default per `infra/gcp/cloud-sql-dev.tf` line 95-99)

**When** the RLS policy declarations are authored

**Then** `packages/domain/src/policies/events-log-rls.ts` is created exporting two named `pgPolicy` declarations attached to the `events_log` table from `packages/domain/src/schema/events_log.ts`:
- `events_log_tenant_isolation_select` — `as: 'permissive'`, `for: 'select'`, `to: appRole` (where `appRole` is a `pgRole('twt_app')` constant exported from a new `packages/domain/src/policies/_roles.ts` module; the Postgres role name is parameterized so production/staging/dev share the same policy declaration), `using: sql\`pariwar_id = current_setting('app.pariwar_id', true)::uuid\``. The `, true` second argument to `current_setting` makes the lookup non-erroring (returns `''` rather than raising when the variable is unset) — combined with the explicit `::uuid` cast, an unset variable produces a parse failure that the RLS engine treats as "no rows match" (closed-failure semantics; defense-in-depth alongside the `assertPariwarScopeSet` connection-level guard from AC-3).
- `events_log_tenant_isolation_write` — `as: 'permissive'`, `for: 'all'` (covers `insert | update | delete`; the existing append-only triggers from Story 1.3 still reject UPDATE/DELETE — RLS is the second guard, the trigger is the structural guarantee), `to: appRole`, `using: sql\`pariwar_id = current_setting('app.pariwar_id', true)::uuid\``, `withCheck: sql\`pariwar_id = current_setting('app.pariwar_id', true)::uuid\``. The `withCheck` clause defends against writes that would create a row visible to a different tenant.

**And** the `pgPolicy` declarations are attached to the `events_log` table via Drizzle's declarative third-argument-to-`pgTable` pattern — the existing `packages/domain/src/schema/events_log.ts` file gains a new policy entry in the `(t) => [...]` index list; the policies live alongside the unique index and check constraint so the schema source remains a single declaration site per architecture §1.2 line 717-719.

**And** the `_roles.ts` module exports the `appRole = pgRole('twt_app')` constant + a `serviceRole = pgRole('twt_service')` placeholder (the latter substantively wired at Story 1.10 audit-integrity job + Story 7.x snapshot writer — Story 1.6 commits the named constant for downstream Stories to import without re-defining; both roles must already exist at the Postgres layer for the policy to attach, so migration 0002 (AC-2) creates them idempotently). The two roles align with architecture §1.2 line 731-740 (service-role connections set the session variable per job execution; CI import-rule lint forbids constructing service-role connections outside the cross-tenant module — the lint rule lands at Story 1.16a per deferred-work).

**And** `packages/domain/src/policies/index.ts` is created as a barrel re-exporting every policy module + the `_roles.ts` constants; consumed via `import { eventsLogTenantIsolationSelect, eventsLogTenantIsolationWrite, appRole } from '@twt/domain/policies'`. The barrel pattern matches the existing `packages/domain/src/schema/index.ts` convention from Story 1.3.

**AC-2 — Migration 0002 hand-supplemented to install `CREATE ROLE` (idempotent), `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `ALTER TABLE ... FORCE ROW LEVEL SECURITY`, and `ALTER ROLE twt_app NOBYPASSRLS` for both roles; the migration is rerun-safe and atomic; the per-migration-atomicity invariant from Story 1.2 README §4 is preserved**

**Given** the Story 1.3 migration-supplement pattern at `packages/domain/migrations/0001_events-log.sql` (drizzle-kit emits CREATE TABLE + indexes + constraints; trigger DDL is hand-appended in the same `.sql` file with `--> statement-breakpoint` separators; the file gets a `⚠ DO NOT REGENERATE` header) + architecture §1.8 line 1003-1005 (per-migration atomicity: drizzle-kit wraps each migration in BEGIN/COMMIT) + the Story 1.2 README §4 + Story 1.3 README §Hand-supplemented migration pattern documentation + Drizzle's RLS support per [the canonical docs](https://orm.drizzle.team/docs/rls)

**When** the substrate migration is authored

**Then** `pnpm --filter @twt/domain db:generate --name events-log-rls` is invoked, which produces `packages/domain/migrations/0002_events-log-rls.sql` containing the Drizzle-emitted DDL for the new `pgPolicy` declarations (Drizzle ^0.45 DOES emit `CREATE POLICY` DDL per the pgPolicy docs — verify at dev-time; if the pinned drizzle-kit version omits the emission, hand-append it). The emitted file is then **manually patched** to also include:
1. A header comment block marking `⚠ DO NOT REGENERATE` + a one-paragraph rationale citing architecture §1.2 line 717-770 + an enumeration of the hand-supplements below.
2. `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'twt_app') THEN CREATE ROLE twt_app NOLOGIN NOBYPASSRLS; END IF; END $$;` + the analogous block for `twt_service`. Both roles are created idempotently as NOLOGIN groups; the application's actual login role (`twt_dev_app` per Story 1.2 Terraform) is GRANTed membership in `twt_app` via the same migration: `GRANT twt_app TO twt_dev_app;`. The Postgres role-attribute model: a login role's effective privileges include those of any group role it is a member of; RLS policies key on `current_user` OR group membership (the `pg_has_role(current_user, 'twt_app', 'MEMBER')` semantic). Drizzle's `pgPolicy({ to: appRole })` produces `TO twt_app` in the DDL; that matches the GRANT.
3. `ALTER ROLE twt_app NOBYPASSRLS;` + `ALTER ROLE twt_service NOBYPASSRLS;` — explicit defensive declaration even though `CREATE ROLE` already sets `NOBYPASSRLS` (the default); the explicit ALTER closes Story 1.2 deferred W1 ("BYPASSRLS not asserted in Terraform — declarative enforcement deferred to Story 1.6 RLS wiring"). The migration is the authoritative declarative-enforcement surface; the Terraform `google_sql_user` cannot express NOBYPASSRLS at the role-attribute level without a `random_password`-bound `null_resource` `local-exec` SQL invocation — too brittle. The migration is the cleaner home.
4. `ALTER TABLE events_log ENABLE ROW LEVEL SECURITY;` — turns RLS on. Without this statement, the `CREATE POLICY` definitions exist but are inert.
5. `ALTER TABLE events_log FORCE ROW LEVEL SECURITY;` — FORCE applies RLS even to the table owner, defense-in-depth against a future migration that runs as the table owner and inadvertently reads cross-tenant rows. Per Postgres docs: without FORCE, the table owner bypasses RLS by default; with FORCE, no role escapes (except those marked BYPASSRLS, which we structurally forbid via point 3).
6. A migration-time self-test: `DO $$ BEGIN IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'twt_app') THEN RAISE EXCEPTION 'twt_app role has BYPASSRLS — closes Story 1.2 W1 deferral inverted'; END IF; END $$;`. The self-test makes a future operator's manual `ALTER ROLE twt_app BYPASSRLS` (e.g., for an ill-advised "let me debug" moment) fail the next `pnpm db:migrate` invocation. This is the cheapest possible RLS-posture regression detector at the schema layer.

**And** the migration's hand-supplemented sections are separated by Drizzle's `--> statement-breakpoint` separator so the migrator parses the multi-statement file correctly.

**And** `packages/domain/migrations/meta/0002_snapshot.json` + the `_journal.json` tick to `idx: 2` are produced by drizzle-kit `generate` (the snapshot tracks table-shape changes; the hand-supplements are not represented in the snapshot, matching Story 1.3's pattern at migration 0001).

**And** `pnpm db:migrate` is rerunnable: a second invocation against an already-migrated database is a no-op (`drizzle.__drizzle_migrations` skips applied migrations); the `CREATE ROLE`/`GRANT`/`ALTER ROLE`/`ALTER TABLE ... ENABLE`/`ALTER TABLE ... FORCE` statements are wrapped in `IF NOT EXISTS` guards (DO blocks for CREATE ROLE; idempotent semantics for the others — `ENABLE`/`FORCE` are no-ops when already enabled per Postgres semantics; `ALTER ROLE ... NOBYPASSRLS` is a no-op when already NOBYPASSRLS).

**And** the existing migration 0000 + 0001 SQL files + meta snapshots are NOT modified — Story 1.6 is purely additive at the migration layer (architecture §1.8 forward-only commitment per Story 1.2 README §3).

**AC-3 — `packages/domain/src/db.ts` extended with `setPariwarScope(client, pariwarId)` + `assertPariwarScopeSet(client)` + `withPariwarScope(db, pariwarId, fn)` helpers; the session-variable contract per architecture §1.2 line 753-756 (UUID re-parse + closed-failure) is codified at the helper boundary; consumed by Story 1.9's apps/api scope-resolution middleware without that middleware re-inventing the contract**

**Given** architecture §1.2 line 746-748 (Fastify request lifecycle sets the `pariwar_id` session variable at handler entry; absence raises a 500 with structured error) + line 749-751 (any database connection without a set `pariwar_id` raises at first query attempt, except for connections opened inside the named cross-tenant operations module) + line 753-756 (session-variable re-parse — middleware re-parses `pariwar_id` as a strict UUID at the middleware boundary, independent of auth output; fail-closed on parse error) + architecture §2.5 line 1460 ("Sets the Postgres session variable `app.pariwar_id` for the request lifetime") + the Story 1.2 `packages/domain/src/db.ts` `createDb` factory + `CreatedDb { db, pool }` return shape

**When** the session-variable helpers are authored

**Then** `packages/domain/src/db.ts` gains three new exported functions (the existing `createDb` + `resolveConnectionString` continue to work unchanged):

```typescript
// packages/domain/src/db.ts (additions)

/**
 * Sets `app.pariwar_id` session variable for RLS (architecture §1.2 line 753-756).
 * Re-parses `pariwarId` as a strict UUID; throws InvalidPariwarScopeError on failure.
 *
 * ⚠ MUST be called INSIDE an active transaction (`BEGIN` already issued). `SET LOCAL`
 * is transaction-scoped — outside a tx, `SET LOCAL` behaves identically to `SET` and
 * the value persists for the connection's lifetime, leaking pariwarId to the next request
 * that receives the same pooled client. Story 1.9's scope-resolution middleware MUST open
 * a transaction BEFORE calling this helper. `withPariwarScope` is safe (opens its own tx).
 *
 * Second UUID parse per architecture §1.2 line 754-755: two independent guards against
 * an auth bug that passes an attacker-controlled value.
 */
export async function setPariwarScope(
  client: pg.PoolClient,
  pariwarId: string,
): Promise<void> {
  if (!UUID_REGEX.test(pariwarId)) {
    throw new InvalidPariwarScopeError(pariwarId);
  }
  // UUID_REGEX structurally rejects SQL-injection chars; single-quote interpolation is safe.
  await client.query(`SET LOCAL app.pariwar_id = '${pariwarId}'`);
}

/**
 * Connection-level fail-closed guard (architecture §1.2 line 749-751). Reads back
 * `app.pariwar_id`; throws `PariwarScopeMissingError` when unset, `InvalidPariwarScopeError`
 * when not a valid UUID. Call as the FIRST DB query in any request handler to ensure
 * scope-resolution middleware ran; fails loudly before any policy-bypassing query executes.
 */
export async function assertPariwarScopeSet(client: pg.PoolClient): Promise<string> {
  const { rows } = await client.query<{ pariwar_id: string }>(
    `SELECT current_setting('app.pariwar_id', true) AS pariwar_id`,
  );
  const value = rows[0]?.pariwar_id ?? '';
  if (value === '') throw new PariwarScopeMissingError();
  if (!UUID_REGEX.test(value)) throw new InvalidPariwarScopeError(value);
  return value;
}

/**
 * Higher-order wrapper for scripts/jobs: opens a transaction, calls `setPariwarScope`,
 * runs callback against a transaction-bound Drizzle handle, commits (or rolls back on throw).
 *
 * ⚠ Commits its own transaction — CANNOT be nested inside `setupLiveDb` per-test rollback.
 * For integration tests requiring rollback isolation, use `ctx.client` from `setupLiveDb`
 * with raw `SET LOCAL` instead (see Dev Notes "Per-test isolation choice").
 */
export async function withPariwarScope<T>(
  pool: pg.Pool,
  pariwarId: string,
  fn: (db: Db, client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setPariwarScope(client, pariwarId);
    const tx = drizzle(client, { schema }) as unknown as Db;
    const result = await fn(tx, client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
```

**And** two typed error classes are exported from a sibling file `packages/domain/src/errors.ts` (creating a new module per the `[[feedback_architecture_vs_prd_boundary]]` discipline — `@twt/domain` owns the domain-level error types; transport-level mapping to HTTP 500 lives at `apps/api` per architecture §3.2 line 1819-1830 + Story 1.4's `_common/errors.ts` `ErrorResponse` envelope):

```typescript
// packages/domain/src/errors.ts (NEW)

/** Thrown when the application code reads a pariwar_id that is not a valid UUID. */
export class InvalidPariwarScopeError extends Error {
  public readonly name = 'InvalidPariwarScopeError';
  public constructor(public readonly received: string) {
    super(`Invalid pariwar_id scope value: ${JSON.stringify(received)}`);
  }
}

/** Thrown when assertPariwarScopeSet() finds the session variable unset. */
export class PariwarScopeMissingError extends Error {
  public readonly name = 'PariwarScopeMissingError';
  public constructor() {
    super(
      'app.pariwar_id session variable is unset — the scope-resolution middleware ' +
        'did not run, or this connection was opened outside the named ' +
        'cross-tenant operations module (packages/domain/src/cross-tenant/).',
    );
  }
}
```

**And** the existing `UUID_REGEX` is defined as a module-local const at `packages/domain/src/db.ts`: `const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;` — match the `_common/primitives.ts` `UuidString` semantics from Story 1.4 (`z.string().uuid()`); the regex is intentionally simple (RFC-compliant UUIDs only; no version-bit check, since `gen_random_uuid()` from Story 1.3 produces v4 UUIDs and downstream Stories may supply v7 or v8 UUIDs).

**And** the new helpers are exported from `packages/domain/src/index.ts` so consumers import them via `import { setPariwarScope, assertPariwarScopeSet, withPariwarScope, InvalidPariwarScopeError, PariwarScopeMissingError } from '@twt/domain'`.

**AC-4 — `packages/domain/src/cross-tenant/` substantively populated with `runAsCrossTenant(client, reason, fn)` helper exposing a single named call-site for legitimate cross-Pariwar reads; the helper emits an `audit.cross_tenant_access` event via Story 1.3's `appendEvent` as a placeholder until Story 1.10 wires the substantive `audit_log_entries` row; the helper SETs `LOCAL row_security = off` for the duration of the callback; CI import-rule lint (Story 1.16a territory) is documented as the future enforcement that limits cross-tenant invocations to this module**

**Given** architecture §1.2 line 736-740 (operations that legitimately span tenants are a named code surface `packages/domain/cross-tenant/`; every cross-tenant read writes an audit line capturing actor + reason + tenant set; CI import-rule lint forbids constructing service-role connections outside the named cross-tenant operations module) + line 764-770 (cross-tenant operations enforcement: the cross-tenant module's exports are limited to the helper and its variants; CI import-rule lint forbids raw service-role connection construction outside the cross-tenant operations module) + the Story 1.2 `packages/domain/src/cross-tenant/` placeholder + landing-Story README citing Story 1.6 ownership + Story 1.3's `@twt/events` `appendEvent` API surface (which is RLS-aware in v1 because the events_log table is the first Pariwar-scoped surface)

**When** the cross-tenant helper is authored

**Then** `packages/domain/src/cross-tenant/run-as-cross-tenant.ts` is created exporting a single function:

```typescript
// packages/domain/src/cross-tenant/run-as-cross-tenant.ts

import type pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Db } from '../db.js';
import * as schema from '../schema/index.js';

export interface CrossTenantContext {
  /**
   * Free-form reason emitted in the audit event. Examples: 'super-admin
   * audit dashboard query', 'matcher cron — multi-Pariwar batch', 'helpline
   * triage routing'. The reason becomes the audit-trail surface; future
   * auditors filter audit lines by reason to characterize cross-tenant access
   * patterns.
   */
  reason: string;
  /**
   * The actor performing the operation. NULL = system/SIE per architecture
   * §1.14 line 1262-1268 (Story 1.3 events_log column semantic).
   */
  actorId: string | null;
  /**
   * Optional explicit tenant set when known. When the helper is invoked from
   * a batch job processing N Pariwars, passing the full list makes the audit
   * line richer than the default 'cross_tenant' marker.
   */
  pariwarIds?: string[];
}

/**
 * Single named call-site for cross-tenant operations (architecture §1.2 line 736-740).
 * Sets `row_security = off` for the transaction lifetime, runs callback, emits an audit
 * event, commits.
 *
 * ⚠ `SET LOCAL row_security = off` requires superuser or BYPASSRLS privilege. In local
 * Docker and CI, `twt_dev_app = POSTGRES_USER = implicit superuser` so this works. Against
 * Cloud SQL production, a separate service-pool with BYPASSRLS credentials is required
 * (deferred D9-1.6). Do NOT invoke against Cloud SQL without service-pool separation.
 *
 * ⚠ Commits its own transaction — see Dev Notes for test isolation implications.
 */
export async function runAsCrossTenant<T>(
  pool: pg.Pool,
  ctx: CrossTenantContext,
  fn: (db: Db, client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // SET LOCAL row_security = off — bypasses every RLS policy for the
    // duration of the transaction. Combined with the application role's
    // NOBYPASSRLS attribute (migration 0002 self-test), this is the ONLY
    // path that can read cross-tenant rows. Note: row_security = off is a
    // per-transaction toggle; FORCE ROW LEVEL SECURITY on the events_log
    // table does NOT override row_security = off (the FORCE attribute makes
    // RLS apply even to the table owner; the row_security = off toggle is
    // a per-session escape hatch documented by Postgres for legitimate
    // cross-tenant tooling).
    await client.query('SET LOCAL row_security = off');
    const tx = drizzle(client, { schema }) as unknown as Db;
    const result = await fn(tx, client);

    // Emit the audit-trail event. Story 1.10 substitutes audit_log_entries.
    // Story 1.6 emits via @twt/events appendEvent; row_security = off (above)
    // allows INSERT with the all-zeros sentinel pariwarId.
    //
    // ⚠ Query MAX(event_version) FIRST to avoid ConcurrencyError on repeated calls.
    // appendEvent enforces a UNIQUE (stream_id, event_version) constraint; hardcoding
    // expectedVersion = 0 would throw ConcurrencyError on every call after the first
    // (when version 1 already exists at the all-zeros stream).
    const auditVersionResult = await client.query<{ max_v: string | null }>(
      `SELECT MAX(event_version) AS max_v FROM events_log WHERE stream_id = '00000000-0000-0000-0000-000000000000'`,
    );
    const auditExpectedVersion = Number(auditVersionResult.rows[0]?.max_v ?? 0);

    const { appendEvent } = await import('@twt/events');
    await appendEvent(tx, {
      streamId: '00000000-0000-0000-0000-000000000000', // audit stream — well-known sentinel UUID
      eventType: 'audit.cross_tenant_access',
      payload: {
        reason: ctx.reason,
        pariwar_ids: ctx.pariwarIds ?? ['<unbounded>'],
        emitted_by: 'packages/domain/src/cross-tenant/run-as-cross-tenant.ts',
        invocation_time_iso: new Date().toISOString(),
      },
      expectedVersion: auditExpectedVersion, // read MAX first — safe for repeated calls; Story 1.10 re-wires
      actorId: ctx.actorId,
      pariwarId: '00000000-0000-0000-0000-000000000000', // cross-tenant marker UUID — Story 1.10 may re-key
    });

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
```

**And** `packages/domain/src/cross-tenant/index.ts` exports `runAsCrossTenant` (the public API surface) but NOT the `pg.Pool` direct-construction primitives — consumers of `@twt/domain/cross-tenant` get the helper and nothing else; if a downstream Story needs a non-helper entry point, it lands a new named export here with the same audit-emission contract, per architecture §1.2 line 767 ("The cross-tenant module's exports are limited to the helper and its variants").

**And** the cross-tenant module is exported from the top-level `packages/domain/src/index.ts` as `export * as crossTenant from './cross-tenant/index.js'` — call-sites use `crossTenant.runAsCrossTenant(...)`; this naming makes the call-site visually distinct from a normal Drizzle query and aids code review per the architecture §1.2 line 765 "structural audit-line emission" commitment.

**And** the sentinel UUIDs (`00000000-0000-0000-0000-000000000000` for both the audit-stream and the cross-tenant pariwar_id marker) are documented in `packages/domain/src/cross-tenant/README.md` as the Story 1.6 placeholder convention; Story 1.10 may substantively re-key these to a dedicated audit-stream UUID once the `audit_log_entries` table lands; the placeholder is captured in Story 1.6's deferred-work entry D2-1.6 for explicit traceability.

**AC-5 — Live-DB CI substrate: `.github/workflows/ci.yml` gains a new `integration-tests` job that boots `postgres:16-alpine` as a service container, runs `pnpm db:migrate`, then runs the live-DB integration tests in `packages/domain/tests/integration/` + `packages/events/tests/{append-event,replay-state,append-only}.test.ts`; the existing `db-check` / `lint` / `typecheck` / `test` / `build` / `contracts-check` jobs are preserved unchanged; the live-DB tests SKIP-on-missing-DATABASE_URL contract from Story 1.3 is preserved (so local `pnpm test` continues to pass without Docker running)**

**Given** the Story 1.3 `packages/events/tests/integration-setup.ts` per-test transaction-rollback substrate that already skips when `DATABASE_URL` is unset (Story 1.3 Task 5.6) + deferred-work D2-1.3 ("Story 1.6 authors the Postgres service-container CI job — the same substrate also gates the cross-Pariwar RLS adversarial test, so it lands once and serves both Stories") + the existing `.github/workflows/ci.yml` job topology (`install` → `lint` + `typecheck` + `build` → `test` + `db-check` + `contracts-check`)

**When** the CI integration-test job is authored

**Then** `.github/workflows/ci.yml` gains a new `integration-tests` job after `contracts-check`:

```yaml
  integration-tests:
    name: integration-tests (RLS + multi-tenant + events_log)
    runs-on: ubuntu-latest
    needs: install
    # Live-DB integration tests: RLS policy regression + cross-Pariwar adversarial
    # leak test (Story 1.6) + events_log append/replay/append-only (Story 1.3).
    # Story 1.6 commits the Postgres 16 service-container substrate;
    # deferred-work D2-1.3 cross-reference.
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: twt_dev_app
          POSTGRES_PASSWORD: devpass
          POSTGRES_DB: twt_dev
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U twt_dev_app -d twt_dev"
          --health-interval=5s
          --health-timeout=3s
          --health-retries=20
    env:
      DATABASE_URL: postgresql://twt_dev_app:devpass@127.0.0.1:5432/twt_dev?sslmode=disable
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.30.3
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Apply migrations
        run: pnpm db:migrate
      - name: Run integration tests
        # Filter to the two workspaces with integration tests; downstream
        # Stories (1.10 audit-log, 7.x Pool Engine, 9.x reconciliation) extend
        # this filter list when their integration suites land.
        run: pnpm turbo run test --filter=@twt/domain --filter=@twt/events
```

**And** the `node-version-file: '.nvmrc'` pattern is used to avoid the Story 1.4 F13 review-finding (the existing `contracts-check` + other jobs were patched to use `.nvmrc` in the Story 1.4 code-review patches commit `873f435`; the new `integration-tests` job follows the same convention from day one). Verify `.nvmrc` exists at repository root; create if missing (it should exist from Story 1.4 patches; confirm at dev-time).

**And** the `packages/domain/vitest.config.ts` is updated to include the new `tests/integration/**/*.spec.ts` glob pattern (the existing `tests/**/*.test.ts` glob picks up `tests/db.test.ts` + `tests/smoke.test.ts`; the new `.spec.ts` extension differentiates integration tests from unit tests, matching the architecture-committed slot naming `tests/integration/rls/policy-regression.spec.ts` + `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` per Story 1.3 closure Decision 2026-06-09-039 §integration test slots). Per-test transaction-rollback isolation is REUSED from `packages/events/tests/integration-setup.ts` (re-exported via `@twt/events/test-utils` if needed; current Story 1.3 implementation has the setup as a local file — Story 1.6 may re-locate it to `packages/domain/src/test-utils/integration-setup.ts` to make it consumable across packages, OR duplicate the small utility per the per-package-test-isolation discipline; choose at dev-time and capture in Completion Notes).

**And** the integration-tests job is added to the `needs:` chain in NO downstream job (it runs in parallel with `test`, `db-check`, `contracts-check`); the `test` job continues to run the existing unit-test surface; the integration-test job adds the live-DB surface without coupling.

**And** the existing job timing remains within budget (the install + service-container boot + migrations + integration tests should complete within 3-4 minutes; if the integration job becomes the long-pole of CI, Story 1.16a friction-budget territory may split it into parallel sub-jobs per package).

**AC-6 — `packages/domain/tests/integration/rls/policy-regression.spec.ts` + `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` substantively authored; positive (allowed query returns expected rows) + negative (forbidden query returns empty / raises) cases for every RLS policy on events_log; cross-Pariwar adversarial test probes 5+ query shapes (basic select, join, aggregate, subquery, raw SQL) and asserts zero leakage in every shape**

**Given** architecture §1.2 line 743-745 (every RLS policy ships with positive — allowed query returns expected rows — and negative — forbidden query returns empty or raises — assertions) + epics line 1095-1098 (Story 1.6 adversarial test: Pariwar A admin attempts to read Pariwar B data → every cross-tenant read returns zero rows regardless of query shape; any leak fails CI as P0)

**When** the integration tests are authored

**Then** `packages/domain/tests/integration/rls/policy-regression.spec.ts` is created with the following test cases (vitest `describe.skipIf(!process.env.DATABASE_URL)` for local-skip convention):

```typescript
// Per-test setup uses withPariwarScope (AC-3) for the ergonomic scoped handle;
// the lower-level pool + setPariwarScope + transaction lifecycle is exercised
// inside the helper itself, so tests can stay focused on policy behavior.

describe.skipIf(!process.env.DATABASE_URL)('events_log RLS policy regression', () => {
  let pool: pg.Pool;
  const PARIWAR_A = '11111111-1111-1111-1111-111111111111';
  const PARIWAR_B = '22222222-2222-2222-2222-222222222222';

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  });
  afterAll(() => pool.end());

  it('positive: SELECT under setPariwarScope(A) returns A rows', async () => {
    // 1. Seed via runAsCrossTenant — bypass RLS for setup
    await runAsCrossTenant(pool, { reason: 'test-seed', actorId: null }, async (db) => {
      await appendEvent(db, { /* ... A's event ... */, pariwarId: PARIWAR_A });
      await appendEvent(db, { /* ... B's event ... */, pariwarId: PARIWAR_B });
    });
    // 2. Read under A's scope — expect A's row only
    const result = await withPariwarScope(pool, PARIWAR_A, (db) =>
      db.select().from(eventsLog),
    );
    expect(result).toHaveLength(1);
    expect(result[0].pariwarId).toBe(PARIWAR_A);
  });

  it('negative: SELECT under setPariwarScope(B) does NOT see A rows', async () => {
    // Same seed, then read under B
    const result = await withPariwarScope(pool, PARIWAR_B, (db) =>
      db.select().from(eventsLog),
    );
    expect(result.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
    expect(result.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('negative: INSERT with mismatched pariwarId is rejected by withCheck', async () => {
    // Under A's scope, attempt to INSERT a row with pariwarId = B
    await expect(
      withPariwarScope(pool, PARIWAR_A, (db) =>
        appendEvent(db, { /* ... */, pariwarId: PARIWAR_B, expectedVersion: 0 }),
      ),
    ).rejects.toThrow(/new row violates row-level security/i);
    // The error message exact text varies by Postgres version but always
    // includes 'row-level security' — the regex matches both 14+ and 16+.
  });

  it('connection-level fail-closed: query without setPariwarScope returns empty', async () => {
    // No setPariwarScope; the unset session variable causes the RLS USING
    // clause to compare pariwar_id = ''::uuid — the cast raises, but the
    // RLS engine treats the cast failure as "no rows match" → empty result.
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`SELECT * FROM events_log`);
      expect(rows).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  it('connection-level fail-closed: assertPariwarScopeSet throws when unset', async () => {
    const client = await pool.connect();
    try {
      await expect(assertPariwarScopeSet(client)).rejects.toThrow(PariwarScopeMissingError);
    } finally {
      client.release();
    }
  });

  it('FORCE RLS: table owner cannot escape policies', async () => {
    // Connect as the table owner role (the migration runs as twt_dev_app,
    // which owns the events_log table at Story 1.6 — Cloud SQL default).
    // Without FORCE RLS, the owner would bypass; with FORCE, even the owner
    // is policy-gated.
    const result = await withPariwarScope(pool, PARIWAR_A, (db) =>
      db.select().from(eventsLog),
    );
    expect(result.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
  });
});
```

**And** `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` is created with adversarial tests that probe MULTIPLE query shapes (per epics line 1097 "every cross-tenant read returns zero rows regardless of query shape"):

```typescript
describe.skipIf(!process.env.DATABASE_URL)('cross-Pariwar adversarial leak test', () => {
  // ... beforeAll/afterAll, seed Pariwar A + B events ...

  it('basic SELECT — A scope sees only A rows', async () => { /* ... */ });

  it('SELECT with WHERE pariwarId = "B" — A scope sees zero rows', async () => {
    // Adversary: explicit WHERE clause attempting to query B from A scope.
    // RLS still applies; the policy USING clause AND the explicit WHERE both
    // require pariwarId = current_setting; result is 0 rows.
    const result = await withPariwarScope(pool, PARIWAR_A, (db) =>
      db.select().from(eventsLog).where(eq(eventsLog.pariwarId, PARIWAR_B)),
    );
    expect(result).toHaveLength(0);
  });

  it('SELECT with raw SQL — A scope sees only A rows', async () => {
    const result = await withPariwarScope(pool, PARIWAR_A, async (db, client) => {
      const r = await client.query<{ pariwar_id: string }>(
        `SELECT pariwar_id FROM events_log WHERE pariwar_id = $1`,
        [PARIWAR_B],
      );
      return r.rows;
    });
    expect(result).toHaveLength(0);
  });

  it('SELECT with COUNT aggregate — A scope sees only A count', async () => {
    const result = await withPariwarScope(pool, PARIWAR_A, (db) =>
      db.select({ n: count() }).from(eventsLog),
    );
    // Adversary expectation: count includes B rows. Actual: count = A's row count only.
    expect(result[0].n).toBe(EXPECTED_A_ROW_COUNT);
  });

  it('SELECT with self-join — A scope joined-with-itself sees only A rows', async () => {
    // Adversary probe: try to leak via a JOIN. RLS applies to every relation
    // in the FROM clause independently; both sides of the join are RLS-filtered.
    const result = await withPariwarScope(pool, PARIWAR_A, async (db, client) => {
      const r = await client.query(
        `SELECT a.pariwar_id, b.pariwar_id AS other
         FROM events_log a JOIN events_log b ON a.pariwar_id != b.pariwar_id`,
      );
      return r.rows;
    });
    expect(result).toHaveLength(0); // No cross-Pariwar pairs visible
  });

  it('SELECT via subquery — adversary cannot use subquery to leak', async () => {
    const result = await withPariwarScope(pool, PARIWAR_A, async (db, client) => {
      const r = await client.query(
        `SELECT pariwar_id FROM events_log
         WHERE event_id IN (SELECT event_id FROM events_log WHERE pariwar_id = $1)`,
        [PARIWAR_B],
      );
      return r.rows;
    });
    expect(result).toHaveLength(0);
  });

  it('runAsCrossTenant — legitimate cross-tenant read sees A AND B rows', async () => {
    // The complementary positive case: the named helper IS the only path
    // that sees both tenants. The audit-event emission is verified separately.
    const result = await runAsCrossTenant(
      pool,
      { reason: 'test-cross-tenant-read', actorId: null },
      (db) => db.select().from(eventsLog),
    );
    const pariwarIds = new Set(result.map((r) => r.pariwarId));
    expect(pariwarIds.has(PARIWAR_A)).toBe(true);
    expect(pariwarIds.has(PARIWAR_B)).toBe(true);
  });

  it('runAsCrossTenant emits an audit.cross_tenant_access event', async () => {
    // After the previous test, an audit event should exist in the audit stream.
    const auditEvents = await runAsCrossTenant(
      pool,
      { reason: 'test-audit-verification', actorId: null },
      async (db) =>
        db.select().from(eventsLog).where(eq(eventsLog.eventType, 'audit.cross_tenant_access')),
    );
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
    expect(auditEvents[0].payload).toMatchObject({ reason: expect.any(String) });
  });
});
```

**And** the tests use `withPariwarScope` + `runAsCrossTenant` from AC-3 + AC-4 as the only paths — they DO NOT directly construct `pg.Pool` + manually `SET LOCAL` + raw query, except for the connection-level fail-closed test (which is specifically probing the absence of `setPariwarScope`).

**And** per-test isolation: each test inside a `describe` block runs against a clean DB by using `TRUNCATE events_log RESTART IDENTITY CASCADE` in `beforeEach` — but TRUNCATE is blocked by the Story 1.3 trigger (`events_log_no_truncate` fires `RAISE EXCEPTION`). The chosen pattern: use `runAsCrossTenant` + raw SQL `DELETE FROM events_log WHERE TRUE` in `beforeEach`? **No** — DELETE is also blocked by the Story 1.3 trigger (`events_log_no_delete`). The correct pattern: **use per-test transaction-rollback isolation** (the same pattern Story 1.3 chose at Task 5.6); each test opens a transaction, runs, and `ROLLBACK`s; the transaction never commits so no rows persist. The helper `withPariwarScope` already opens a transaction and commits on success — for tests, supply a wrapper variant that ROLLBACKs after the callback succeeds, OR adopt Story 1.3's `tests/integration-setup.ts` pattern wholesale. Decision: **re-use Story 1.3's `setupLiveDb` pattern** by moving it to `packages/domain/src/test-utils/integration-setup.ts` (so both `@twt/domain` and `@twt/events` consume the same per-test transaction lifecycle); the move is a refactor inside Story 1.6 + the existing `packages/events/tests/integration-setup.ts` re-exports the moved helper for backward compatibility. Capture the relocation in Completion Notes.

**AC-7 — Story 1.3 `packages/events/tests/append-event.test.ts` concurrency test upgraded from single-connection-SAVEPOINT to true two-connection parallel `appendEvent` per Story 1.3 deferred W4; the upgrade exercises optimistic-concurrency in its real production failure mode (two pooled clients race on the same stream); the existing 5+ assertion structure of `append-event.test.ts` is preserved**

**Given** Story 1.3 deferred W4 ("Concurrent-conflict test not truly parallel — the ConcurrencyError test uses a single connection with SAVEPOINT to simulate a unique-violation rather than two concurrent connections. The spec says 'two parallel appendEvent calls'. True two-connection concurrency testing deferred to Story 1.6 when the Postgres CI service-container substrate lands") + the existing `packages/events/tests/append-event.test.ts` structure

**When** the concurrency test is upgraded

**Then** `packages/events/tests/append-event.test.ts` is modified to add a new test case `it('true concurrency: two parallel appendEvent calls — one wins, one throws ConcurrencyError')` that:
- Opens two `pg.Pool.connect()` clients (two physical connections).
- Both clients open a transaction + call `setPariwarScope` with the SAME `pariwarId`.
- Both clients invoke `appendEvent(db, { streamId: STREAM_X, expectedVersion: 0, ... })` in parallel via `Promise.allSettled`.
- One promise resolves successfully (the row landed at eventVersion 1); the other rejects with `ConcurrencyError` (the unique-index violation on `(stream_id, event_version)` propagated through `extractPgError` per `packages/events/src/events-log.ts` line 100-113).
- Both clients commit (the loser's COMMIT is a no-op because the transaction was rolled back by the constraint violation).

**And** the existing SAVEPOINT-based test is REPLACED (not kept alongside), because it tested a strictly-weaker invariant; the deferred W4 entry in `deferred-work.md` is removed (resolved). Capture in Completion Notes.

**And** the test uses `withPariwarScope` (the AC-3 helper) for the simpler client lifecycle if it doesn't conflict with the two-connection requirement — note `withPariwarScope` opens its own transaction, so for the two-connection case, the test calls `pool.connect()` + manual `BEGIN` + manual `setPariwarScope` + manual `COMMIT`/`ROLLBACK`, NOT `withPariwarScope`. Document the choice inline so a future test author understands why.

**AC-8 — Terraform `infra/gcp/cloud-sql-dev.tf` annotation added asserting the application role's NOBYPASSRLS posture (the substantive enforcement lands at migration 0002 self-test per AC-2; the Terraform annotation is the discoverability surface for an operator reading the IaC); the `instance_name → BYPASSRLS` documentation header at line 11-15 is amended to cite Story 1.6 closure**

**Given** Story 1.2 deferred W1 (BYPASSRLS not asserted in Terraform; declarative enforcement deferred to Story 1.6 RLS wiring) + the `infra/gcp/cloud-sql-dev.tf` line 14-15 comment ("application Postgres role; non-superuser, no BYPASSRLS per architecture §1.2 line 717-725")

**When** the Terraform module is amended

**Then** `infra/gcp/cloud-sql-dev.tf` line 14-15 comment is expanded to:
```hcl
#   - google_sql_user.app — the application Postgres role; non-superuser, no
#     BYPASSRLS per architecture §1.2 line 717-725. The BYPASSRLS attribute
#     is the Postgres role-level attribute that defeats Row-Level Security
#     policies; Story 1.6 commits the substantive enforcement at the migration
#     layer (packages/domain/migrations/0002_events-log-rls.sql includes
#     `ALTER ROLE twt_app NOBYPASSRLS;` + a migration-time self-test that
#     fails if the role somehow gained BYPASSRLS). Cloud SQL's google_sql_user
#     resource does NOT expose the role-attribute flags directly, so the
#     declarative enforcement lives at the migration layer; this Terraform
#     comment is the discoverability surface for an operator reading the IaC.
```

**And** the `google_sql_user.app` resource gains a `lifecycle { precondition { ... } }` block that asserts the password matches expected complexity (defensive against W22 "random_password flipped to special = true would produce malformed DSN" — orthogonal hardening; capture in Completion Notes only if implemented cleanly without breaking the existing `random_password.app_password` configuration). If the precondition is hard to express cleanly, skip and capture in deferred-work.

**AC-9 — Documentation updates: `packages/domain/README.md` gains a §RLS substantive section + landing-Story map updated; `packages/domain/src/policies/README.md` flips from "Empty at Story 1.2" placeholder to substantive content describing the per-policy file convention; `packages/domain/src/cross-tenant/README.md` flips from placeholder to substantive content describing the helper invocation pattern + audit-emission contract; root `README.md` gains a one-line entry under "Live-DB CI substrate"**

**Given** Story 1.2 + Story 1.3 + Story 1.4 documentation pattern (README sections per substantive surface)

**When** the documentation is amended

**Then** `packages/domain/README.md` gains a new §RLS section AFTER the existing §Migration policy + §Hand-supplemented migration pattern sections, covering:
- The architecture-canonical commitment (§1.2 line 717-725 cite).
- The two-role model (`twt_app` for normal requests; `twt_service` for jobs; `twt_dev_app` is the Cloud SQL login role that membership-grants both).
- The session-variable convention (`app.pariwar_id` Postgres session variable; set via `setPariwarScope` helper at handler entry).
- The cross-tenant escape hatch (single named call-site `crossTenant.runAsCrossTenant(...)`; SET LOCAL row_security = off + audit-event emission; CI import-rule lint at Story 1.16a forbids cross-tenant outside this module).
- The per-test transaction-rollback pattern (re-uses the Story 1.3 `setupLiveDb` substrate, moved to `src/test-utils/`).
- The CI live-DB substrate (the new `integration-tests` job; Postgres 16 service container; SKIP-on-missing-DATABASE_URL preserves local-test ergonomics).

**And** `packages/domain/src/policies/README.md` is rewritten from the Story 1.2 placeholder to substantive content describing:
- The one-file-per-table-policy-set convention (`events-log-rls.ts` declares the events_log policies; a future `members-rls.ts` will declare the members-table policies at Story 3.1+; etc.).
- The `_roles.ts` central role-name constants (`appRole = pgRole('twt_app')` + `serviceRole = pgRole('twt_service')`).
- The barrel pattern (`index.ts` re-exports every policy module + the role constants).
- The migration discipline (every new pgPolicy adds a new migration with the corresponding `ALTER TABLE ENABLE/FORCE ROW LEVEL SECURITY` hand-supplement).
- The test discipline (every new policy ships with positive + negative test cases in `tests/integration/rls/<table>-policy-regression.spec.ts`).
- The Pariwar-Passport carve-out forward-pointer (Story 1.7 substantively authors `pariwar-passport-rls.ts` with cross-Pariwar-readable policies per architecture §1.2 line 726-729).

**And** `packages/domain/src/cross-tenant/README.md` is rewritten from the Story 1.2 placeholder to substantive content describing:
- The architecture-canonical commitment (§1.2 line 736-740 + line 764-770 cite).
- The `runAsCrossTenant` helper signature + CrossTenantContext shape.
- The audit-emission contract (Story 1.6 substrate emits via `@twt/events.appendEvent`; Story 1.10 substantively re-wires to `audit_log_entries`; sentinel UUIDs `00000000-…-000` for the audit stream + cross-tenant marker).
- The CI import-rule lint forward-pointer (Story 1.16a substantively wires the lint rule that forbids `pg.Pool.connect()` direct construction outside this module).
- The downstream-Story expected callers (Story 1.10 audit-integrity-job, Story 1.11a integrity-verification primitive, Story 7.x Pool Engine snapshot writer, Story 9.x reconciliation matcher).

**And** root `README.md` gains a one-line entry under the existing §Workspace layout or §CI surface (whichever section already documents `db-check` + `contracts-check`): "Live-DB CI substrate active at Story 1.6 — Postgres 16 service container in `.github/workflows/ci.yml` `integration-tests` job; SKIP-on-missing-DATABASE_URL preserves local-test ergonomics."

**AC-10 — `_bmad-output/implementation-artifacts/sprint-status.yaml` flipped `1-6-pariwar-id-first-class-rls-adversarial-test`: `ready-for-dev` → `in-progress` → `review`; `_bmad-output/implementation-artifacts/deferred-work.md` gains `## Story 1.6 deferred` section enumerating new Story 1.6 deferred-work entries (D1-1.6 et seq); `_bmad-output/implementation-artifacts/deferred-work.md` Story 1.2 W1 + Story 1.3 D2-1.3 + D9-1.3 + D10-1.3 + W4 + Story 1.2 D6-1.2 + D13-1.2 entries marked **RESOLVED 2026-06-XX per Story 1.6 closure**; `.decision-log.md` gains Decision 2026-06-XX-XXX (next sequential after 2026-06-09-040 + the 2026-06-10 Story 1.4 code-review-patches entry) at top of `## Decisions` section; this story file (`1-6-pariwar-id-first-class-rls-adversarial-test.md`) Status flipped to `review`**

**Given** the Story 1.2 + 1.3 + 1.4 closure pattern (sprint-status + deferred-work + decision-log + story-file all updated atomically with the substantive author-commit)

**When** Story 1.6 closes substantive author-commit

**Then** the four artifacts are updated per the prior-Story pattern; the Decision-log body captures: substrate author-commit summary, cross-Story discharge triggers (Story 1.7 Pariwar-Passport carve-out RLS policies; Story 1.9 apps/api scope-resolution middleware consumes `setPariwarScope`; Story 1.10 audit-log substantively wires `audit_log_entries` replacing the Story 1.6 events_log audit-event placeholder; Story 1.16a CI import-rule lint substantively forbids cross-tenant module bypass; Stories 3.1+/6.x/7.x/8.x/9.x/10.x/11a/11b inherit RLS-by-default on every new Pariwar-scoped table they add per the documented policy-authoring pattern), and explicit per-leg closure-language per `[[feedback_closure_language_precision]]`.

## Tasks / Subtasks

- [x] **Task 1: Pre-execution checks + branch creation + Story 1.4 + 1.5 inheritance reconciliation** (AC: foundational — no specific AC)
  - [x] 1.1 Run `git fetch origin && git checkout main && git pull --ff-only origin main` to bring local `main` to `origin/main` HEAD `7823fe4` (the Story 1.5 Group-A code-review-patches commit; Stories 1.1–1.5 all landed). Verify HEAD via `git log -1 --oneline`. (NOTE 2026-06-10e: an earlier copy of this story file referenced baseline `8aa8189` — the pre-Story-1.5 commit — because create-story ran on a stale local `main`; that has been reconciled. `8aa8189` is no longer on `origin/main`.)
  - [x] 1.2 Verify Story 1.5 status: read `_bmad-output/implementation-artifacts/sprint-status.yaml` for `1-5-cloud-kms-hsm-google-tink-envelope-encryption-pii-tiers`. As of 2026-06-10e it reads `review` — Story 1.5 substrate IS landed (encryption envelope wired at `packages/domain/src/encryption/`; PR #8 merged). Proceed from main with Story 1.5 + Story 1.6 stacked-but-independent: Story 1.6 does NOT depend on Story 1.5 at the substrate level — RLS at `packages/domain/src/policies/` is orthogonal to envelope encryption at `packages/domain/src/encryption/`. (Historical note: this task originally branched on whether `1-5` was `done` vs `backlog` to handle out-of-order landing; that ambiguity is now resolved — 1.5 landed first.)
  - [x] 1.3 Verify deferred-work entries that Story 1.6 closes: read `deferred-work.md` sections for Story 1.2 (W1, D6-1.2, D13-1.2), Story 1.3 (D2-1.3, D9-1.3, D10-1.3, W4). Note the precise line numbers + wording for the Task 6 closure pass.
  - [x] 1.4 Verify upstream substrate state at HEAD: `pnpm install --frozen-lockfile`, `pnpm turbo run lint typecheck test build` should be 56/56 green (Story 1.4 baseline); `pnpm turbo run db:check contracts:check-openapi-determinism` should both exit 0. Capture any anomalies in Completion Notes.
  - [x] 1.5 Create new branch from main: `git checkout -b story-1.6-rls-adversarial-test`. Confirm via `git status` clean + `git rev-parse HEAD` matches main.
  - [x] 1.6 Verify Drizzle ORM v0.45 pgPolicy support is present + matches the architecture-cited [Drizzle ORM RLS docs](https://orm.drizzle.team/docs/rls): run a 5-minute spike against the v0.45 source or release notes to confirm `pgPolicy({ for, to, using, withCheck, ... })` API shape + that the generator emits `CREATE POLICY` DDL. If the pinned v0.45 turns out to NOT emit policy DDL (some drizzle-kit minor versions in 2024 had partial support), choose between (a) bumping drizzle-kit one minor or (b) hand-appending the `CREATE POLICY` DDL in migration 0002. Capture choice + version-check result in Completion Notes.

- [x] **Task 2: Schema source — `packages/domain/src/policies/_roles.ts` + `events-log-rls.ts` + `index.ts` + amend `events_log.ts` with the policy entries** (AC: #1)
  - [x] 2.1 Author `packages/domain/src/policies/_roles.ts` exporting `appRole = pgRole('twt_app')` + `serviceRole = pgRole('twt_service')` (both Drizzle `pgRole` declarations; the actual `CREATE ROLE` DDL lands in migration 0002 hand-supplements per Task 3). Add a brief header comment citing architecture §1.2 line 731-740 + the two-role model rationale.
  - [x] 2.2 Author `packages/domain/src/policies/events-log-rls.ts` exporting two `pgPolicy` declarations:
    ```typescript
    import { sql } from 'drizzle-orm';
    import { pgPolicy } from 'drizzle-orm/pg-core';
    import { eventsLog } from '../schema/events_log.js';
    import { appRole } from './_roles.js';

    export const eventsLogTenantIsolationSelect = pgPolicy(
      'events_log_tenant_isolation_select',
      {
        as: 'permissive',
        for: 'select',
        to: appRole,
        using: sql`pariwar_id = current_setting('app.pariwar_id', true)::uuid`,
      },
    ).link(eventsLog);

    export const eventsLogTenantIsolationWrite = pgPolicy(
      'events_log_tenant_isolation_write',
      {
        as: 'permissive',
        for: 'all',
        to: appRole,
        using: sql`pariwar_id = current_setting('app.pariwar_id', true)::uuid`,
        withCheck: sql`pariwar_id = current_setting('app.pariwar_id', true)::uuid`,
      },
    ).link(eventsLog);
    ```
    **Verify at dev-time** that Drizzle v0.45's API for attaching a pgPolicy to an existing table is `.link(table)` OR the third-argument-to-pgTable callback pattern. The exact shape may have evolved across v0.31 → v0.45; consult [Drizzle RLS docs](https://orm.drizzle.team/docs/rls) and adapt. If the API is the third-arg-callback pattern, amend `events_log.ts` instead (Task 2.3).
  - [x] 2.3 Amend `packages/domain/src/schema/events_log.ts` IF the Drizzle pgPolicy API requires inline-with-table declaration (Task 2.2 alternative). The amended `(t) => [...]` callback gains two new policy entries; the existing uniqueIndex + check + index entries are preserved. **Prefer the standalone-file pattern (Task 2.2 with `.link(eventsLog)`) when supported** — keeps `schema/` focused on column shape and `policies/` focused on access policy, matching the README architectural separation.
  - [x] 2.4 Author `packages/domain/src/policies/index.ts` as a barrel:
    ```typescript
    export * from './_roles.js';
    export * from './events-log-rls.js';
    ```
  - [x] 2.5 Verify `pnpm --filter @twt/domain typecheck` passes after the schema additions; if Drizzle's pgPolicy types are missing or mismatched, debug at this point before proceeding to migration generation.

- [x] **Task 3: Migration 0002 generation + hand-supplementation** (AC: #2)
  - [x] 3.1 Run `pnpm --filter @twt/domain db:generate --name events-log-rls` to produce the drizzle-kit-emitted `packages/domain/migrations/0002_events-log-rls.sql` + `meta/0002_snapshot.json` + tick `meta/_journal.json` to `idx: 2`. Inspect the emitted SQL — drizzle-kit v0.31 may emit `CREATE POLICY` DDL OR may emit nothing (silent omission). If nothing: hand-write the CREATE POLICY statements per Task 3.3.
  - [x] 3.2 Add the `⚠ DO NOT REGENERATE` header comment block to `0002_events-log-rls.sql` (match the Story 1.3 migration 0001 header pattern verbatim), citing: (a) the hand-supplemented `CREATE ROLE` / `GRANT` / `ALTER ROLE` / `ALTER TABLE ENABLE` / `ALTER TABLE FORCE` statements; (b) architecture §1.2 line 717-770; (c) the migration-time self-test rationale (W1 closure).
  - [x] 3.3 Hand-append the role + RLS-toggle + self-test DDL with `--> statement-breakpoint` separators:
    ```sql
    -- Idempotent role creation
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'twt_app') THEN
        CREATE ROLE twt_app NOLOGIN NOBYPASSRLS;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'twt_service') THEN
        CREATE ROLE twt_service NOLOGIN NOBYPASSRLS;
      END IF;
    END $$;
    --> statement-breakpoint
    -- Explicit defensive NOBYPASSRLS (idempotent)
    ALTER ROLE twt_app NOBYPASSRLS;
    --> statement-breakpoint
    ALTER ROLE twt_service NOBYPASSRLS;
    --> statement-breakpoint
    -- Grant membership in twt_app to the Cloud SQL login role (idempotent — GRANT is a no-op if already granted)
    GRANT twt_app TO twt_dev_app;
    --> statement-breakpoint
    GRANT twt_service TO twt_dev_app;
    --> statement-breakpoint
    -- RLS enable + force on events_log
    ALTER TABLE events_log ENABLE ROW LEVEL SECURITY;
    --> statement-breakpoint
    ALTER TABLE events_log FORCE ROW LEVEL SECURITY;
    --> statement-breakpoint
    -- Migration-time self-test: fail loudly if a future operator inverts the role attribute
    DO $$ BEGIN
      IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'twt_app') THEN
        RAISE EXCEPTION 'twt_app role has BYPASSRLS — Story 1.2 W1 deferral inverted; revert the role-attribute change';
      END IF;
      IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'twt_service') THEN
        RAISE EXCEPTION 'twt_service role has BYPASSRLS — Story 1.2 W1 deferral inverted; revert the role-attribute change';
      END IF;
    END $$;
    ```
    **Verify at dev-time**: the `twt_dev_app` Postgres user (Story 1.2 Terraform) exists in the local Docker Postgres container? In local dev, the user is created by Postgres entrypoint env vars (`POSTGRES_USER=twt_dev_app` per `packages/events/tests/integration-setup.ts`). In CI, the service-container env vars (per Task 5) create the same user. The `GRANT twt_app TO twt_dev_app` succeeds because the login role exists.

    **Security note for `GRANT twt_service TO twt_dev_app`:** This allows `twt_dev_app` to `SET ROLE twt_service` and is correct for local Docker / CI (single-user environment where `runAsCrossTenant` runs as the same login role). In production, separate `google_sql_user` resources for the `twt_app` login role and a `twt_service` login role are required — `twt_dev_app` would NOT be granted `twt_service` membership in prod migrations (deferred D9-1.6). Add a comment in the migration header citing this. The GRANT as written is dev/CI–only; the production service-pool credential separation lands at Story 1.10.
  - [x] 3.4 Apply migration locally: `DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5432/twt_dev?sslmode=disable pnpm --filter @twt/domain db:migrate`. Verify exit 0 + the role + RLS state via `psql`:
    ```sql
    \dt events_log
    SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'events_log';
    SELECT polname, polcmd, polroles FROM pg_policy WHERE polrelid = 'events_log'::regclass;
    SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname IN ('twt_app', 'twt_service', 'twt_dev_app');
    ```
    Expected: `relrowsecurity = t`, `relforcerowsecurity = t`, two policies, both roles `rolbypassrls = f`.
  - [x] 3.5 Idempotency check: re-run `pnpm db:migrate` — should be a no-op (drizzle migrations table skips already-applied + the role/grant/enable/force statements are idempotent guards).
  - [x] 3.6 Negative test: manually `ALTER ROLE twt_app BYPASSRLS;` in psql, then re-run `pnpm db:migrate` — the migration-time self-test should `RAISE EXCEPTION`. Revert via `ALTER ROLE twt_app NOBYPASSRLS;`. Confirm + capture in Completion Notes.
  - [x] 3.7 Run `pnpm --filter @twt/domain db:check` — should exit 0 (the snapshot tracks table-shape, not RLS / role state; the hand-supplements are invisible to db:check, matching Story 1.3's migration 0001 pattern).

- [x] **Task 4: Session-variable helpers + cross-tenant helper** (AC: #3, #4)
  - [x] 4.1 Author `packages/domain/src/errors.ts` exporting `InvalidPariwarScopeError` + `PariwarScopeMissingError` (per AC-3 spec body).
  - [x] 4.2 Amend `packages/domain/src/db.ts` to add `UUID_REGEX` + `setPariwarScope` + `assertPariwarScopeSet` + `withPariwarScope` (per AC-3 spec body). Import `drizzle` from `drizzle-orm/node-postgres` at the top of the file (already present per Story 1.2). Import `schema` from `./schema/index.js`.
  - [x] 4.3 Author `packages/domain/src/cross-tenant/run-as-cross-tenant.ts` exporting `runAsCrossTenant` + `CrossTenantContext` (per AC-4 spec body). Note the dynamic import of `@twt/events` per AC-4 — avoid a top-level static import that would create a `@twt/domain` → `@twt/events` dep cycle (currently `@twt/events` depends on `@twt/domain`; the reverse would be a cycle). Dynamic import resolves at call-time. **Add `"@twt/events": "workspace:*"` to `packages/domain/package.json` `devDependencies`** so TypeScript resolves `appendEvent`'s types from the dynamic import. Without this entry, TypeScript may produce `any`-typed calls and silently accept wrong argument shapes. Verify `pnpm --filter @twt/domain typecheck` resolves `appendEvent`'s parameter types correctly after adding the devDep. If TypeScript still emits `any` via `await import(...)`, use a type-only top-level import as a companion: `import type { appendEvent as _AppendEvent } from '@twt/events'` (erased at emit — no runtime cycle) and cast the dynamic result to that type.
  - [x] 4.4 Author `packages/domain/src/cross-tenant/index.ts` re-exporting `runAsCrossTenant` + `CrossTenantContext`.
  - [x] 4.5 Amend `packages/domain/src/index.ts` to export the new helpers + errors + the cross-tenant namespace + the policies barrel:
    ```typescript
    export {
      createDb,
      setPariwarScope,
      assertPariwarScopeSet,
      withPariwarScope,
      type CreateDbOptions,
      type CreatedDb,
      type Db,
      type DbSchema,
    } from './db.js';
    export { resolveConnectionString } from './secrets.js';
    export { InvalidPariwarScopeError, PariwarScopeMissingError } from './errors.js';
    export * as schema from './schema/index.js';
    export * as policies from './policies/index.js';
    export * as crossTenant from './cross-tenant/index.js';
    ```
  - [x] 4.6 Verify `pnpm --filter @twt/domain build typecheck` passes after all additions.

- [x] **Task 5: Live-DB CI substrate — `.github/workflows/ci.yml` `integration-tests` job + vitest glob + per-test setup relocation** (AC: #5)
  - [x] 5.1 Read existing `.github/workflows/ci.yml` to confirm the post-Story-1.4 patched shape (node-version-file: '.nvmrc' on existing jobs per the Story 1.4 code-review patches commit `873f435`). Verify `.nvmrc` exists at repository root (`cat .nvmrc`); create if missing with `20.18.0` (the Story 1.1 baseline) + commit.
  - [x] 5.2 Add the `integration-tests` job to `.github/workflows/ci.yml` after `contracts-check` (per AC-5 spec body). Match indentation + style of existing jobs.
  - [x] 5.3 Relocate `packages/events/tests/integration-setup.ts` to `packages/domain/src/test-utils/integration-setup.ts` (moves the per-test transaction-rollback substrate to a workspace-shared location). The old path `packages/events/tests/integration-setup.ts` becomes a thin re-export: `export { setupLiveDb, getTx, type TxContext, hasDatabase, DATABASE_URL } from '@twt/domain/test-utils/integration-setup';` to preserve backward compatibility with the Story 1.3 `tests/{append-event,replay-state,append-only}.test.ts` imports. Verify `pnpm --filter @twt/events test` still SKIPs without `DATABASE_URL` + PASSes with it.
  - [x] 5.4 Amend `packages/domain/vitest.config.ts` to include `tests/integration/**/*.spec.ts` glob alongside the existing `tests/**/*.test.ts`. The new `.spec.ts` extension differentiates integration from unit tests; `tests/db.test.ts` (unit) continues to run via the `.test.ts` glob.
  - [x] 5.5 Amend `packages/domain/package.json` (if needed) to expose the `test-utils/integration-setup` subpath via `exports` map, OR export from the top-level `src/index.ts`: `export * as testUtils from './test-utils/index.js'`. The `test-utils/index.ts` barrel must export at minimum:
    ```typescript
    // packages/domain/src/test-utils/index.ts
    export { setupLiveDb, hasDatabase, DATABASE_URL } from './integration-setup.js';
    export type { LiveDbContext } from './integration-setup.js';
    ```
    And `packages/events/tests/integration-setup.ts` (thin re-export after relocation):
    ```typescript
    export { setupLiveDb, hasDatabase, DATABASE_URL } from '@twt/domain/src/test-utils/index.js';
    export type { LiveDbContext } from '@twt/domain/src/test-utils/index.js';
    ```
    Verify the type name `LiveDbContext` matches what Story 1.3's `integration-setup.ts` actually exports — rename if it differs. Capture the exact export surface in Completion Notes.
  - [x] 5.6 Verify locally: `DATABASE_URL=… pnpm --filter @twt/domain test` runs both the unit tests (existing) AND the new integration tests (per Task 6); without `DATABASE_URL`, the integration tests SKIP gracefully.

- [x] **Task 6: Integration tests — RLS policy regression + cross-Pariwar adversarial leak** (AC: #6)
  - [x] 6.1 Author `packages/domain/tests/integration/rls/policy-regression.spec.ts` with the test cases enumerated in AC-6 (positive SELECT, negative SELECT, INSERT withCheck rejection, connection-level fail-closed without setPariwarScope, assertPariwarScopeSet throws when unset, FORCE RLS table-owner cannot escape).
  - [x] 6.2 Author `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` with the adversarial cases enumerated in AC-6 (basic SELECT, explicit WHERE bypass attempt, raw SQL, COUNT aggregate, self-join, subquery, runAsCrossTenant positive cross-tenant read, audit-event emission verification).
  - [x] 6.3 **Per-test isolation — read this before writing any test.** `withPariwarScope(pool, …)` and `runAsCrossTenant(pool, …)` each `BEGIN` + `COMMIT` their own transactions; they CANNOT be rolled back by `setupLiveDb`'s `afterEach ROLLBACK`. For all policy-regression and adversarial-leak tests, use `ctx.client` (the raw `pg.PoolClient` from `setupLiveDb`) directly with inline `SET LOCAL` so every operation stays inside the managed transaction:
    ```typescript
    it('positive: SELECT under A scope returns only A rows', async () => {
      // ctx.client is inside the setupLiveDb BEGIN — all SET LOCAL scopes to this tx
      await ctx.client.query('SET LOCAL row_security = off'); // bypass RLS for seeding
      await appendEvent(ctx.tx, { ..., pariwarId: PARIWAR_A }); // inside tx
      await appendEvent(ctx.tx, { ..., pariwarId: PARIWAR_B });
      await ctx.client.query('RESET row_security');             // re-enable RLS
      await setPariwarScope(ctx.client, PARIWAR_A);             // SET LOCAL in active tx
      const result = await ctx.tx.select().from(eventsLog);
      expect(result.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
      // afterEach ROLLBACK reverts both seed rows and the session variable
    });
    ```
    Reserve the top-level `withPariwarScope(pool, …)` / `runAsCrossTenant(pool, …)` wrappers for the two dedicated helper-verification tests (`runAsCrossTenant positive cross-tenant read` + `audit-event emission verification`). Those tests accept row accumulation at the all-zeros sentinel stream (assert `auditEvents.length >= 1`, not `=== 1`) since committed rows cannot be rolled back via the append-only-trigger-blocked table.
  - [x] 6.4 Run locally: `DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5432/twt_dev?sslmode=disable pnpm --filter @twt/domain test` — all RLS + adversarial tests pass.
  - [x] 6.5 Run the events_log integration suite to verify no regression: `DATABASE_URL=… pnpm --filter @twt/events test` — all Story 1.3 tests still pass with the new RLS substrate active (the events_log inserts in those tests now require a set `app.pariwar_id`; the helper used is `setupLiveDb` which does NOT set the session variable — Story 1.3 tests pass `pariwarId` as a column value but rely on the absence of RLS to insert. **Story 1.6 will likely break these tests** unless Story 1.3's tests are updated to set the session variable via `setPariwarScope` OR `runAsCrossTenant`). Address by: (a) amending `packages/events/tests/integration-setup.ts` (now a re-export thin shim — substantively in `packages/domain/src/test-utils/integration-setup.ts`) to optionally accept a `pariwarId` in `beforeEach` that SETs `app.pariwar_id` from a test-fixture UUID, OR (b) updating each Story 1.3 test to wrap its operations in `withPariwarScope(...)` or `runAsCrossTenant(...)`. Choose (a) for minimal Story 1.3 test churn + capture in Completion Notes. The relocated `setupLiveDb` should accept an optional `defaultPariwarId` parameter; downstream tests pass it; Story 1.3 tests opt-in.
  - [x] 6.6 Run `pnpm turbo run lint typecheck test build` — all 56 (or more, given new tests) tasks green.

- [x] **Task 7: Upgrade Story 1.3 `append-event.test.ts` concurrency test to true two-connection parallel** (AC: #7)
  - [x] 7.1 Read existing `packages/events/tests/append-event.test.ts` to locate the SAVEPOINT-based concurrency test.
  - [x] 7.2 Replace the SAVEPOINT test with a true-two-connection test per AC-7 spec body. Use raw `pg.Pool.connect()` + manual `BEGIN` + manual `setPariwarScope` + parallel `appendEvent` calls + `Promise.allSettled` to capture both outcomes + assertions on the success/ConcurrencyError split.
  - [x] 7.3 Run `DATABASE_URL=… pnpm --filter @twt/events test` — the new true-concurrency test passes; the old SAVEPOINT test is gone; other tests unchanged.
  - [x] 7.4 Remove the W4 entry from `deferred-work.md` (resolved by Story 1.6 closure).

- [x] **Task 8: Terraform comment update + W1 closure note** (AC: #8)
  - [x] 8.1 Amend `infra/gcp/cloud-sql-dev.tf` line 14-15 comment per AC-8 spec body — expand the existing BYPASSRLS reference to cite Story 1.6 migration-layer enforcement + the discoverability rationale.
  - [x] 8.2 (Optional, capture in Completion Notes if skipped) Add a `lifecycle { precondition { ... } }` block to `google_sql_user.app` asserting the password's character set; skip if it requires non-trivial Terraform plumbing.
  - [x] 8.3 Remove the W1 entry from `deferred-work.md` (resolved by Story 1.6 closure — substantive enforcement at the migration layer).

- [x] **Task 9: Documentation — README updates** (AC: #9)
  - [x] 9.1 Amend `packages/domain/README.md` with new §RLS section per AC-9 spec body. Update the §10 "Placeholder sub-directory landing-Story map" to flip the `src/policies/` + `src/cross-tenant/` rows from "[Story 1.6] …" to "[Active at Story 1.6] …".
  - [x] 9.2 Rewrite `packages/domain/src/policies/README.md` substantively per AC-9 spec body.
  - [x] 9.3 Rewrite `packages/domain/src/cross-tenant/README.md` substantively per AC-9 spec body.
  - [x] 9.4 Amend root `README.md` with the one-line live-DB CI substrate entry per AC-9 spec body.
  - [x] 9.5 Amend `packages/domain/.env.example` (if needed) to document the per-developer DATABASE_URL convention + the local-Docker-Postgres-16 invocation pattern (cross-reference `packages/events/tests/integration-setup.ts` README inline comment). Likely no change required — Story 1.3 already documented this; verify + update if drift.

- [x] **Task 10: Closure — sprint-status + deferred-work + decision-log + story-file Status** (AC: #10)
  - [x] 10.1 Read existing `_bmad-output/implementation-artifacts/deferred-work.md` to confirm the precise lines to mark RESOLVED (Story 1.2 W1, D6-1.2, D13-1.2; Story 1.3 D2-1.3, D9-1.3, D10-1.3, W4). Annotate each with "**RESOLVED 2026-06-XX per Story 1.6 closure**" inline rather than deleting (preserves traceability — matches Story 1.2 deferred-work resolution pattern via the `[[feedback_closure_language_precision]]` discipline).
  - [x] 10.2 Append a new `## Story 1.6 deferred (substrate author-commit, 2026-06-XX per Decision 2026-06-XX-XXX)` section to `deferred-work.md` enumerating Story 1.6's new deferred items:
    - **D1-1.6: Story 1.16a CI import-rule lint forbidding `pg.Pool.connect()` direct construction outside `packages/domain/src/cross-tenant/`** — architecture §1.2 line 739-740 + line 768-769 commits the rule; Story 1.6 commits the helper + module structural posture; Story 1.16a substantively wires the ESLint rule. Trigger: Story 1.16a dev-story start.
    - **D2-1.6: Sentinel UUIDs in `runAsCrossTenant` audit event** (`00000000-0000-0000-0000-000000000000` for both audit-stream + cross-tenant pariwar_id marker) — Story 1.10 substantively re-keys to a dedicated audit-stream UUID once `audit_log_entries` lands. Trigger: Story 1.10 dev-story start.
    - **D3-1.6: Pariwar-Passport carve-out RLS policies** (cross-Pariwar-readable per architecture §1.2 line 726-729) — Story 1.7 substantively authors `pariwar-passport-rls.ts` with cross-readable policies + reviewed-together-with-scoped-policies discipline. Trigger: Story 1.7 dev-story start.
    - **D4-1.6: Apps/api scope-resolution middleware** (architecture §2.5 line 1449-1461; consumes `setPariwarScope` at handler entry) — Story 1.9 substantively authors `apps/api/src/middleware/scope-resolution/`. Trigger: Story 1.9 dev-story start.
    - **D5-1.6: Substantive audit_log_entries integration for `runAsCrossTenant` cross-tenant audit emission** — Story 1.6 emits via `@twt/events.appendEvent`; Story 1.10 wires the substantive `audit_log_entries` row with hash-chain + 6h off-site mirror. Trigger: Story 1.10 dev-story start.
    - **D6-1.6: Per-tenant TanStack Query key isolation** (architecture §4.2 line 2483-2491; query keys carry `pariwar_id` to prevent cross-tenant cache pollution) — apps/admin + apps/mobile Story territory (1.9+ for admin; 3.x for mobile). Trigger: per-app Story dev-story start.
    - **D7-1.6: `setPariwarScope` SQL-injection-surface hardening** — current implementation uses single-quote interpolation guarded by `UUID_REGEX` upstream-validation; a future hardening could use `client.query('SET LOCAL app.pariwar_id = $1', [pariwarId])` parameter binding (Postgres parameter-binding for SET LOCAL has edge cases — verify at hardening time). Captured for defense-in-depth even though current implementation is safe.
    - **D8-1.6: Postgres service-container CI job per-step caching** — the integration-tests job currently does NOT cache the Postgres data volume or the migrated schema state; each run boots fresh + re-applies migrations. Story 1.16a friction-budget territory if CI duration becomes a long-pole.
    - **D9-1.6: `runAsCrossTenant` service-pool credential separation for production** — `SET LOCAL row_security = off` requires superuser or `BYPASSRLS` privilege. In local Docker + CI, `twt_dev_app = POSTGRES_USER = implicit superuser` so this works. Against Cloud SQL production, a separate service-role connection pool (credentials for a `twt_service`-login role carrying `BYPASSRLS`, distinct from the application `twt_dev_app` pool) is required per architecture §1.2 line 739 ("CI import-rule lint forbids constructing service-role connections outside the named cross-tenant operations module"). The `runAsCrossTenant` helper signature changes to accept `servicePool: pg.Pool` instead of (or in addition to) `pool: pg.Pool`. Trigger: Story 1.10 + Story 1.16a, when `runAsCrossTenant` is first exercised against a real Cloud SQL instance.
  - [x] 10.3 Append Decision 2026-06-XX-XXX (sequential: read `.decision-log.md` for the highest decision number ratified after 2026-06-09-040; if Story 1.4 code-review patches landed as Decision 2026-06-10-041, use 2026-06-XX-042 — verify at dev-time) to the top of `## Decisions` section in `.decision-log.md` per the reverse-chronological schema:
    - Title: `### Decision 2026-06-XX-XXX: Story 1.6 substantive author-commit — pariwar_id first-class + RLS adversarial test substrate (pgPolicy declarations + migration 0002 enable/force RLS + session-variable helpers + cross-tenant named helper + Postgres CI service-container substrate + RLS policy-regression + cross-Pariwar adversarial integration tests + true two-connection concurrency upgrade + W1 + D2-1.3 + D6-1.2 + D9-1.3 + D10-1.3 + D13-1.2 + W4 closures)`.
    - Body: substrate author-commit summary, cross-Story discharge triggers (Story 1.7 Pariwar-Passport carve-out RLS; Story 1.9 apps/api scope-resolution middleware; Story 1.10 substantive audit-log integration replacing the Story 1.6 events_log audit-event placeholder; Story 1.16a CI import-rule lint; Stories 3.1+/6.x/7.x/8.x/9.x/10.x/11a/11b RLS-by-default inheritance), and explicit per-leg closure-language per `[[feedback_closure_language_precision]]`.
  - [x] 10.4 Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: flip `1-6-pariwar-id-first-class-rls-adversarial-test`: `ready-for-dev` → `in-progress` → `review`. Append a `last_updated:` line with the substantive author-commit summary (matches Story 1.4 pattern).
  - [x] 10.5 Update this story file's Status to `review`; fill in Dev Agent Record (Agent Model Used, Debug Log References, Completion Notes List, File List, Change Log).
  - [x] 10.6 Commit-tree planning: prefer multiple small commits per Conventional Commits convention (Story 1.4 pattern):
    - `feat(packages/domain): add pgPolicy declarations + _roles + policies barrel` (Tasks 2.1-2.5)
    - `feat(packages/domain): migration 0002 — events_log RLS enable/force + role NOBYPASSRLS + self-test` (Task 3)
    - `feat(packages/domain): setPariwarScope + assertPariwarScopeSet + withPariwarScope + InvalidPariwarScopeError + PariwarScopeMissingError` (Task 4.1-4.2, 4.5-4.6)
    - `feat(packages/domain): runAsCrossTenant named cross-tenant operations helper + audit-event emission placeholder` (Task 4.3-4.4)
    - `ci: add integration-tests job (Postgres 16 service container) + .nvmrc verify` (Task 5.1-5.2)
    - `test(packages/domain): relocate setupLiveDb + add integration test directory glob` (Task 5.3-5.6)
    - `test(packages/domain): RLS policy-regression integration tests` (Task 6.1, 6.3-6.6)
    - `test(packages/domain): cross-Pariwar adversarial leak integration tests` (Task 6.2)
    - `test(packages/events): upgrade concurrency test to true two-connection parallel (W4 closure)` (Task 7)
    - `chore(infra/gcp): Terraform W1 closure note — BYPASSRLS enforcement at migration layer` (Task 8)
    - `docs(packages/domain): substantive §RLS section + policies + cross-tenant READMEs` (Task 9)
    - `chore: Story 1.6 documentation + decision-log + sprint-status + deferred-work` (Task 10)

## Dev Notes

### What Story 1.6 substantively becomes

Story 1.6 is the **typed-constraint enforcement layer** for Cross-Cutting #1 (architecture §1.2). Before Story 1.6, `pariwar_id` is a column with a NOT NULL constraint and an index — that's it. After Story 1.6:
1. The DB engine itself refuses to return cross-Pariwar rows (Postgres RLS).
2. The application role lacks the BYPASSRLS attribute (Postgres role-attribute enforcement + migration-time self-test).
3. The session-variable contract (`app.pariwar_id`) is codified at the `@twt/domain` API boundary with `setPariwarScope`, `assertPariwarScopeSet`, `withPariwarScope`.
4. Cross-tenant operations have ONE named code path (`crossTenant.runAsCrossTenant`) with structural audit emission.
5. A live-DB CI job continuously verifies that every probed adversarial query shape returns zero leakage.

The architecture commits all five layers (§1.2 line 717-770). Story 1.6 lands them as the substrate; downstream Stories consume.

### Story 1.6 baseline state (reconciled HEAD `7823fe4`)

> **Reconciliation note (2026-06-10e):** This section originally recorded a baseline of HEAD `8aa8189` with "Story 1.5 status = `backlog`". That was an artifact of create-story running on a **stale local `main`** that never pulled after Story 1.5's PR #8 merged. The baseline below has been corrected to the true `origin/main` state. No Story 1.5 work was lost.

Reconciled baseline: `origin/main` HEAD `7823fe4 fix(*): Story 1.5 code-review patches — 24 findings resolved (Groups A–E)`. Stories 1.1 + 1.2 + 1.3 + 1.4 + **1.5** are all landed (Story 1.5 substrate via PR #8 merge `42fb645` + code-review patches `7823fe4`; sprint-status `1-5 = review`). Story 1.6 is stacked-but-independent on Story 1.5 per substrate-orthogonality — RLS at `packages/domain/src/policies/` is independent of envelope encryption at `packages/domain/src/encryption/`. The earlier (now-resolved) `8aa8189` baseline appears only in superseded notes; the live target is `7823fe4`.

Repository workspace state:
- `packages/domain/` exists with: `package.json` (zod-free; `drizzle-orm ^0.45`, `drizzle-kit ^0.31`, `pg ^8.13`, `@google-cloud/secret-manager ^6.1`, `dotenv ^16.4`, `tsx ^4.19`), `drizzle.config.ts`, `src/{db,secrets,index}.ts`, `src/schema/{events_log,_baseline,index}.ts`, 8 placeholder sub-dirs under `src/` (`policies/`, `ids/`, `encryption/`, `snapshot-fixtures/`, `snapshot-adapters/`, `cross-tenant/`, `bank-statement/`, `per-pariwar/bihar/`), `migrations/{0000_init-baseline.sql, 0001_events-log.sql, meta/}`, `scripts/migrate.ts`, `tests/{db,smoke}.test.ts`, `README.md`.
- `packages/events/` exists with: `package.json` (depends on `@twt/domain` workspace + `drizzle-orm ^0.45` + `zod ^3.23.0`), `src/{events-log,state-machine,canonical-json,registry,index}.ts`, `tests/{smoke,state-machine,canonical-json,append-event,replay-state,append-only}.test.ts`, `tests/integration-setup.ts` (per-test transaction-rollback substrate that Task 5.3 relocates).
- `packages/contracts/` exists with the Story 1.4 substantive substrate (16 sub-dirs + `_common/` + scripts + tests + ADR-0005). Orthogonal to Story 1.6.
- `infra/gcp/` exists with the Story 1.2 Terraform IaC (cloud-sql-dev.tf line 95-99 = `google_sql_user.app` non-superuser; W1 deferred to Story 1.6).
- `.github/workflows/ci.yml` exists with jobs: install, lint, typecheck, test, build, db-check, contracts-check. Story 1.6 adds `integration-tests`.
- Local Docker Postgres 16 invocation: `docker run --rm -d -p 5432:5432 -e POSTGRES_USER=twt_dev_app -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=twt_dev --name twt-test-pg postgres:16-alpine` per Story 1.3 `packages/events/tests/integration-setup.ts` documented invocation.

### Story 1.1 + 1.2 + 1.3 + 1.4 inheritances + the Story 1.6 substrate it provides

Inheritances:
- **Story 1.1**: monorepo workspace topology + root configs + CI workflow + `packages/{domain,events,contracts}/` placeholder workspaces + ADR-0001 + ADR-0002.
- **Story 1.2**: Cloud SQL Postgres Terraform IaC + `packages/domain/` Drizzle scaffolding + Secret Manager wiring + migration 0000 idempotent + root `pnpm db:*` scripts + `turbo db:check` task + `.github/workflows/ci.yml` `db-check` job + ADR-0003-datastore-engine drafted.
- **Story 1.3**: `events_log` Drizzle schema at `packages/domain/src/schema/events_log.ts` (with `pariwar_id UUID NOT NULL` structurally; "Story 1.3 does NOT install RLS — Story 1.6 territory" guardrail comment at line 82-83) + append-only Postgres triggers via hand-supplemented migration 0001 + `packages/events/` substantively populated (`appendEvent` / `loadEvents` / `replayState` API + `StateMachine<S, E>` framework + `canonicalJsonStringify` + `EVENT_TYPE_REGISTRY` shape) + ADR-0004-canonical-json drafted + `zod ^3.23.0` pinned in `packages/events/` + the `tests/integration-setup.ts` per-test transaction-rollback substrate that Story 1.6 relocates to `@twt/domain/test-utils/`.
- **Story 1.4**: `packages/contracts/` substantively populated (16 sub-dirs + `_common/` + OpenAPI 3.1 emission pipeline + `openapi/v1.yaml` + type-assignability + validation-parity test scaffolds) + ADR-0005-openapi-client-generation drafted + the `.nvmrc`-based CI Node-version pin (Story 1.4 code-review patch F13) that Story 1.6's new `integration-tests` job reuses.

Story 1.6 provides the substrate for:
- **Story 1.7** (Pariwar-Passport data model + branding bundle per FR-63): inherits the policy-authoring pattern from `packages/domain/src/policies/` + adds `pariwar-passport-rls.ts` declaring the carve-out cross-Pariwar-readable policies per architecture §1.2 line 726-729 + adds the `pariwar_id` first-class column to the new tables.
- **Story 1.8** (RBAC permission-keys + scope dimensions + 12 seeded roles): inherits the RBAC enforcement is the second guard after RLS commitment per architecture §2.6 line 1492-1493; substantively authors `packages/domain/permissions/`.
- **Story 1.9** (admin authentication + first substantive `apps/api/` routes): substantively authors `apps/api/src/middleware/scope-resolution/` consuming `setPariwarScope` at handler entry; the URL-path-prefix scope-resolution per architecture §2.5 line 1449-1461 (extracts pariwar_id from URL path → re-parses as UUID → verifies user membership → SETs Postgres session variable). Also consumes `assertPariwarScopeSet` as the connection-level fail-closed guard at request entry.
- **Story 1.10** (tamper-evident audit log + hash chain + 6h off-site mirror): substantively wires `audit_log_entries` Drizzle table + the substantive `runAsCrossTenant` audit-line emission (Story 1.6 emits via `@twt/events.appendEvent` as the placeholder; Story 1.10 replaces with `audit_log_entries` row insertion). Also adds its own `audit-log-rls.ts` policy file extending the Story 1.6 pattern.
- **Story 1.11a** (audit-log integrity verification primitive): consumes `runAsCrossTenant` for the cross-tenant integrity-scan job.
- **Story 1.12** (pg-boss job queue + idempotency keyed store): pg-boss installs the `__pgboss` schema; orthogonal to RLS at the table level (jobs are admin-tenant-spanning by design and use `runAsCrossTenant` for per-tenant job execution); the job-execution wrapper at `apps/jobs/` may use `setPariwarScope` when a job is logically tenant-scoped (matcher cron per Pariwar) or `runAsCrossTenant` when cross-tenant (audit-integrity scan).
- **Story 1.16a** (friction-budget PR CI gate): substantively authors the CI import-rule lint forbidding `pg.Pool.connect()` direct construction outside `packages/domain/src/cross-tenant/` per D1-1.6.
- **Stories 3.1+ / 6.x / 7.x / 8.x / 9.x / 10.x / 11a / 11b**: every new Pariwar-scoped table inherits RLS by default via the documented `packages/domain/src/policies/<table>-rls.ts` pattern; the cross-Pariwar adversarial test gets a new probe added per new table (per architecture §1.2 line 743-745 "every RLS policy in `packages/domain/` ships with positive and negative assertions").

### Architecture-vs-Epic-AC alignment check

The epic AC line 1081-1098 enumerates Story 1.6 ACs verbatim:
- `pariwar_id` is added as a first-class column to every Pariwar-scoped table — **at Story 1.6 closure, `events_log` is the only Pariwar-scoped table** (Story 1.3 added `pariwar_id` structurally; Story 1.6 confirms the column exists + authors the RLS policy). Future Pariwar-scoped tables inherit the discipline; Story 1.6 does NOT pre-populate empty tables for tables that don't yet exist.
- RLS policies enforce that every query reads/writes only rows matching the session's pariwar_id — **Story 1.6 commits** at `packages/domain/src/policies/events-log-rls.ts` + migration 0002 hand-supplements.
- `pariwar_id` is set from the authenticated session, not from request body — **Story 1.6 commits the helper** (`setPariwarScope` reads from a caller-supplied UUID — the caller is the apps/api middleware at Story 1.9 which derives from URL path / auth context, NOT from request body). Story 1.6 cannot fully prove this at the substrate-only stage because the request body never lands at the Story 1.6 boundary; the structural enforcement lives at Story 1.9's middleware.
- Drizzle migration patterns ensure new tables inherit RLS by default — **Story 1.6 commits the pattern** + documents it in `packages/domain/src/policies/README.md` + `packages/domain/README.md` §RLS. The default-inheritance is convention + code review + the eventual Story 1.16a CI lint; Story 1.6 does not commit a structural enforcement that any new table without an associated `<table>-rls.ts` file fails CI (that's Story 1.16a territory).
- Adversarial cross-Pariwar read test in CI — **Story 1.6 commits** at `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` + the new `.github/workflows/ci.yml` `integration-tests` job.
- Every cross-tenant read returns zero rows regardless of query shape — **Story 1.6 commits** by probing 5+ query shapes (basic SELECT, explicit WHERE bypass, raw SQL, COUNT, self-join, subquery).
- Any leak (even a single row) fails CI as a P0 — **Story 1.6 commits** via the integration-tests job's exit-code-on-test-failure (default vitest behavior).

**No substantive architecture-vs-epic-AC divergence at Story 1.6.** One micro-precision note: the epic AC says "RLS policies enforce that every query reads/writes only rows matching the session's pariwar_id" — at Story 1.6, the ONLY Pariwar-scoped table is `events_log`, so "every query" reduces to "every events_log query". The single-table-at-Story-1.6 reality is captured in Dev Notes here so the dev agent doesn't go looking for other Pariwar-scoped tables that don't exist yet.

### Drizzle ORM RLS API at v0.45 — what to expect at dev-time

Per the [Drizzle ORM RLS docs](https://orm.drizzle.team/docs/rls), Drizzle's `pgPolicy` declarative API supports declaring policies inline with table definitions OR as standalone policies linked to existing tables. Two API shapes have appeared in different minor versions:

1. **Inline (third-argument-to-pgTable callback):**
   ```typescript
   export const eventsLog = pgTable('events_log', { ... }, (t) => [
     uniqueIndex(...),
     pgPolicy('events_log_tenant_isolation', { for: 'all', to: appRole, using: sql`...` }),
   ]);
   ```

2. **Standalone with `.link(table)`:**
   ```typescript
   export const eventsLogPolicy = pgPolicy('events_log_tenant_isolation', { ... })
     .link(eventsLog);
   ```

Story 1.6 prefers the **standalone pattern (option 2)** because it keeps `schema/` focused on column shape and `policies/` focused on access policy — matching the architecture's `packages/domain/src/policies/` directory structure. If the pinned drizzle-orm v0.45 only supports the inline pattern, fall back to amending `schema/events_log.ts` and capture the API-shape decision in Completion Notes.

For drizzle-kit's `generate` emission: v0.31 added pgPolicy DDL emission per the upstream changelog; verify at dev-time that `db:generate` produces `CREATE POLICY ...` statements in `0002_events-log-rls.sql`. If it does not, hand-write them per Task 3.3.

### RLS subtlety — `current_setting('app.pariwar_id', true)` parse semantics

The RLS USING clause `pariwar_id = current_setting('app.pariwar_id', true)::uuid` has three failure modes:

1. **Variable unset, `, true` second arg → returns `''` (empty string)** → cast `'' ::uuid` RAISES `invalid input syntax for type uuid: ""` → the RLS engine catches the cast error per row and treats it as "row does not match" → query returns 0 rows (the closed-failure semantic). This is the "connection-level fail-closed" guard at the DB layer — a query that runs without `setPariwarScope` having been called returns 0 rows, NOT an error to the application. The application-layer guard `assertPariwarScopeSet` is the LOUD failure path that throws `PariwarScopeMissingError`; the DB-layer behavior is the QUIET fail-closed.

2. **Variable set to a non-UUID string** → cast `<string>::uuid` RAISES → same as above, returns 0 rows. The `setPariwarScope` helper rejects non-UUID inputs upstream via `UUID_REGEX`, so this failure mode is closed at the API boundary; the DB-layer behavior is defense-in-depth.

3. **Variable set to a valid UUID matching a row's pariwar_id** → match, row returned.

The `, true` second argument is load-bearing — without it, `current_setting('app.pariwar_id')` RAISES `unrecognized configuration parameter` when the variable is unset (Postgres treats it as a missing GUC rather than an empty value). With `, true`, Postgres returns empty string for missing GUCs. The empty-string + cast-failure path is what makes the RLS USING clause safe for unset-variable lookups.

This is documented at architecture §1.2 line 717-725 implicitly (the typed-constraint commitment); Story 1.6's policy spelling is the concrete realization.

### Per-test isolation choice — why per-test transaction rollback, NOT TRUNCATE

The Story 1.3 events_log triggers (`events_log_no_update`, `events_log_no_delete`, `events_log_no_truncate`) reject UPDATE / DELETE / TRUNCATE structurally — there's no cleanup mechanism that operates on a populated table. The Story 1.3 chose **per-test transaction rollback** (Task 5.6 choice (a)): each test opens a transaction, runs, and ROLLBACKs; the events_log inserts never commit, so no rows persist.

Story 1.6 adopts the same per-test rollback pattern. The `setupLiveDb` helper (relocated to `packages/domain/src/test-utils/` per Task 5.3) provides a `ctx.client` (`pg.PoolClient`) + `ctx.tx` (transaction-bound Drizzle handle); `afterEach` ROLLBACKs.

**⚠ Critical — `withPariwarScope` / `runAsCrossTenant` commit their own transactions.** These helpers manage their own `BEGIN → COMMIT` lifecycle. Passing `pool` to them opens a NEW connection that commits independently; `setupLiveDb`'s `afterEach ROLLBACK` cannot undo a committed transaction on a different connection. Tests that call `withPariwarScope(pool, …)` or `runAsCrossTenant(pool, …)` will leave rows permanently in the DB across test runs (the append-only trigger blocks TRUNCATE + DELETE, so there is no cleanup path).

**Correct pattern for isolation:** Use `ctx.client` (already inside a `BEGIN`) with raw `SET LOCAL` commands. `SET LOCAL` scopes all session-variable changes to the current transaction; `RESET row_security` restores the policy check before assertions. The `afterEach ROLLBACK` reverts everything:

```typescript
// Seed and assert — all inside the setupLiveDb transaction
await ctx.client.query('SET LOCAL row_security = off'); // bypass RLS to seed both tenants
await appendEvent(ctx.tx, { ..., pariwarId: PARIWAR_A });
await appendEvent(ctx.tx, { ..., pariwarId: PARIWAR_B });
await ctx.client.query('RESET row_security');             // re-enable RLS
await setPariwarScope(ctx.client, PARIWAR_A);             // SET LOCAL in active tx
const result = await ctx.tx.select().from(eventsLog);
// afterEach: ROLLBACK — seed rows + session variables gone, no accumulation
```

Reserve the top-level `withPariwarScope(pool)` / `runAsCrossTenant(pool)` wrappers for the two helper-verification tests (`runAsCrossTenant positive cross-tenant read` + `audit-event emission verification`). Those two tests commit and accumulate rows at the all-zeros sentinel stream; write their assertions as `length >= 1` to be accumulation-resilient.

The setupLiveDb helper relocation is captured in Completion Notes; the `packages/events/tests/integration-setup.ts` becomes a thin re-export to preserve Story 1.3's test imports unchanged.

### Cross-tenant operations module — the `_double_zeros_` sentinel UUID is a placeholder

The `runAsCrossTenant` audit emission uses `'00000000-0000-0000-0000-000000000000'` as BOTH the `streamId` (cross-tenant audit stream) AND the `pariwarId` (cross-tenant marker — "this event spans all tenants"). This is a Story 1.6 substrate convention that Story 1.10 may re-key.

Trade-off:
- **Using the all-zeros UUID for the audit stream** simplifies the substrate — no need to allocate a fresh stream UUID at Story 1.6.
- **Using the all-zeros UUID for the pariwar_id** is structurally correct because cross-tenant audit events truly span all tenants; pinning them to any one tenant's UUID would mislead a future auditor reading the events_log.
- **The catch**: the events_log RLS policy gates SELECT on `pariwar_id = current_setting('app.pariwar_id', true)::uuid` — a query SELECT-ing audit events at the all-zeros marker would only succeed under `runAsCrossTenant` (which bypasses RLS) or with `app.pariwar_id` set to the all-zeros marker (semantically: "I am the auditor; show me all tenants' events" — but that's exactly what `runAsCrossTenant` does, so the per-pariwar SELECT path is intentionally closed to audit events).

Story 1.10 may decide to: (a) keep this convention; (b) introduce a dedicated `audit_log_entries` table separate from `events_log` with its own RLS posture (architecture §1.5 commits the separate table per the 6h off-site mirror + hash-chain commitments); (c) introduce a `pariwar_id IS NULL` carve-out in the events_log RLS policy for audit-marker events (more complex; not preferred).

The substrate-only approach at Story 1.6 is: **emit audit events via `appendEvent` with the all-zeros marker; document the sentinel in `packages/domain/src/cross-tenant/README.md`; defer the substantive design to Story 1.10**. Captured in deferred-work D2-1.6 + D5-1.6.

### `SET LOCAL row_security = off` permission — CI/local vs Cloud SQL production

`runAsCrossTenant` calls `SET LOCAL row_security = off` to bypass RLS for the cross-tenant query. Per Postgres docs, this GUC can only be set by roles with the `BYPASSRLS` role attribute, `pg_row_security_bypass` membership (Postgres 15+), or superuser status.

The Story 1.6 migration explicitly sets `ALTER ROLE twt_app NOBYPASSRLS` and `ALTER ROLE twt_service NOBYPASSRLS`. This creates an apparent contradiction — neither application role has the privilege to call `SET LOCAL row_security = off`.

**Why tests pass in CI and local Docker:** The CI service container uses `POSTGRES_USER: twt_dev_app`, which makes `twt_dev_app` the Docker-created **implicit superuser**. Superusers bypass the `row_security` GUC permission check regardless of NOBYPASSRLS on group roles. Local Docker has the same behavior. The migration's `NOBYPASSRLS` is set on the `twt_app`/`twt_service` GROUP roles; `twt_dev_app` retains its Docker-superuser status.

**Production gap (deferred D9-1.6):** A real Cloud SQL `google_sql_user` resource is NOT a superuser. `twt_dev_app` would be a standard login role, and `SET LOCAL row_security = off` would fail with `ERROR: permission denied to set parameter "row_security"`. The `runAsCrossTenant` implementation as written will NOT work in production without a separate `twt_service`-credentials connection pool that either holds `BYPASSRLS` on the login role or grants `pg_row_security_bypass`. That service-pool separation is deferred to D9-1.6 / Story 1.10.

**For Story 1.6:** This is acceptable — Story 1.6 is a substrate story tested only against local Docker + CI Postgres. The structural pattern (module isolation, audit emission, single named call-site) is correct; the production credential wiring is explicit deferred work.

### Story 1.6 does NOT preempt Story 1.9's apps/api scope-resolution middleware

Architecture §2.5 line 1449-1461 commits the URL-path-prefix scope-resolution + the auth middleware contract at the apps/api boundary. Story 1.9 substantively authors this middleware at `apps/api/src/middleware/scope-resolution/`. Story 1.6 commits the `setPariwarScope` helper + `assertPariwarScopeSet` connection-level guard — the middleware *calls* these at handler entry.

The Story 1.6 / Story 1.9 split:
- **Story 1.6**: `@twt/domain` exports `setPariwarScope(client, pariwarId)` + `assertPariwarScopeSet(client)`. The contract: caller supplies a validated UUID + a checked-out pg.PoolClient inside a transaction. The contract is testable in isolation via `withPariwarScope` (Story 1.6's higher-order wrapper) + the integration tests.
- **Story 1.9**: `apps/api/src/middleware/scope-resolution/` extracts pariwar_id from the URL path (e.g., `/api/v1/p/<pariwar_id>/...`), re-parses as UUID at the middleware boundary (architecture §1.2 line 754-755 "Session-variable re-parse"), verifies the authenticated user has a membership record in that pariwar_id (the user-membership query is Story 1.7+ territory because Pariwar-Passport tables don't exist at Story 1.6), opens a request-scoped transaction via Fastify's onRequest hook, checks out a pg.PoolClient, calls `setPariwarScope(client, pariwarId)`. The middleware also installs an onResponse hook that releases the client + commits/rollbacks the transaction.

Story 1.6's contract is **callable from anywhere** — apps/api at Story 1.9, apps/jobs at Story 1.12, integration tests at Story 1.6. The naming `setPariwarScope` reflects this generality (NOT `setApiPariwarScope` or `setSessionPariwarScope` — those would imply Web/API specificity).

### Dev guardrails — what makes the dev agent's Story 1.6 implementation go smoothly

**⚠ Five non-obvious guardrails most likely to cause silent bugs — read first:**

1. **`withPariwarScope` / `runAsCrossTenant` commit — never nest inside `setupLiveDb` per-test rollback.** Use `ctx.client` + raw `SET LOCAL` inside the managed transaction for all policy/adversarial tests. See "Per-test isolation choice" dev note.
2. **`runAsCrossTenant` audit event version — always read MAX first.** Hardcoding `expectedVersion: 0` throws `ConcurrencyError` on the second call. The implementation queries `MAX(event_version)` before appending (see AC-4 spec body — already fixed).
3. **`SET LOCAL row_security = off` requires superuser** — works in CI/local Docker (`twt_dev_app` = Docker superuser). Will fail against Cloud SQL prod until D9-1.6 service-pool separation lands. Do NOT test `runAsCrossTenant` against a real Cloud SQL instance at Story 1.6.
4. **`db:generate` may silently omit `CREATE POLICY` DDL** — always inspect `0002_events-log-rls.sql` after running `db:generate`. If `CREATE POLICY` statements are absent, hand-append them per Task 3.3.
5. **`@twt/events` dynamic import needs a `devDependency` entry** in `packages/domain/package.json` for TypeScript to resolve `appendEvent`'s types. Without it, the import is untyped (`any`) and wrong arguments pass silently (see Task 4.3).

---

- **Don't reinvent Story 1.3's `events_log` table**: it exists with `pariwar_id UUID NOT NULL` structurally. Story 1.6 ADDS the pgPolicy + migration 0002; it does NOT recreate the table.
- **Don't reinvent Story 1.3's `integration-setup.ts`**: relocate (don't rewrite) per Task 5.3. The relocated helper accepts an optional `defaultPariwarId` parameter so downstream tests can opt-in to a pre-set session variable.
- **Don't preempt Story 1.7's Pariwar-Passport tables**: Story 1.6 commits the policy-authoring pattern; Story 1.7 commits the substantive `pariwar_passport_*` tables + their carve-out cross-Pariwar-readable policies. Story 1.6's `policies/` directory has only `events-log-rls.ts` (+ the `_roles.ts` shared constants + `index.ts` barrel).
- **Don't preempt Story 1.8's RBAC**: RLS is the FIRST guard (database-layer); RBAC is the SECOND guard (application-layer authorization on top of RLS). Story 1.6 commits RLS; Story 1.8 commits RBAC. The middleware ordering at Story 1.9: scope-resolution (Story 1.6 substrate) → RBAC check (Story 1.8 substrate) → handler.
- **Don't preempt Story 1.9's apps/api scope-resolution middleware**: substantively lives at apps/api/. Story 1.6 commits the `@twt/domain`-side helper; Story 1.9 calls it.
- **Don't preempt Story 1.10's audit_log_entries**: the audit emission in `runAsCrossTenant` uses `appendEvent` + the all-zeros sentinel as a placeholder. Story 1.10 substantively wires `audit_log_entries`; Story 1.6 documents the placeholder.
- **Don't preempt Story 1.16a's ESLint rule**: the CI import-rule lint forbidding `pg.Pool.connect()` direct construction outside `cross-tenant/` is Story 1.16a territory. Story 1.6 documents the rule in README + cross-tenant module structure makes the future lint easy.
- **Don't break Story 1.3's events_log integration tests**: they currently don't set `app.pariwar_id`; with Story 1.6 RLS active, their inserts will fail unless either (a) `setupLiveDb` is extended to optionally set the session variable per `defaultPariwarId`, OR (b) the tests are wrapped in `withPariwarScope` / `runAsCrossTenant`. Prefer (a) for minimal Story 1.3 test churn per Task 6.5.
- **Don't change migration 0000 or 0001**: forward-only per architecture §1.8 + Story 1.2 README §3. Migration 0002 is purely additive.
- **Don't add a new package**: Story 1.6 substantively populates existing sub-directories under `packages/domain/src/{policies,cross-tenant,test-utils}/`. No new workspace.
- **Don't install drizzle-zod**: explicitly forbidden by architecture §1.3 line 776-790 for transport-layer contracts; orthogonal to Story 1.6's domain-layer RLS.
- **Don't introduce a `@twt/domain` → `@twt/events` static dep cycle**: the `runAsCrossTenant` audit emission uses a DYNAMIC import of `@twt/events` (Task 4.3) — `@twt/events` already depends on `@twt/domain` (for the `Db` type + `schema` import), so a static reverse import would be a cycle. The dynamic import resolves at call-time after both modules are loaded.
- **Use `pnpm --filter @twt/domain`** for workspace-scoped script invocation.
- **Use Conventional Commits** per Story 1.1 commitlint config — example commits enumerated in Task 10.6.

### Project Structure Notes

**Workspace tree at Story 1.6 closure** (additions to the Story 1.4 baseline; preserves all Story 1.1 + 1.2 + 1.3 + 1.4 paths):

```
twt/
├── .decision-log.md                    [UPDATED] Task 10.3 — append Decision 2026-06-XX-XXX
├── README.md                           [UPDATED] Task 9.4 — live-DB CI substrate entry
├── .nvmrc                              [VERIFY/CREATE] Task 5.1 — 20.18.0 if missing
├── .github/workflows/ci.yml            [UPDATED] Task 5.2 — integration-tests job
├── infra/gcp/
│   └── cloud-sql-dev.tf                [UPDATED] Task 8.1 — BYPASSRLS migration-layer enforcement note
└── packages/
    ├── domain/                         (Story 1.2 baseline + Story 1.3 + Story 1.6 substantive additions)
    │   ├── README.md                   [UPDATED] Task 9.1 — §RLS section + landing-Story map flips
    │   ├── package.json                [UNCHANGED] — no new deps required (drizzle + pg + secret-manager already present)
    │   ├── vitest.config.ts            [UPDATED] Task 5.4 — tests/integration/**/*.spec.ts glob
    │   ├── migrations/
    │   │   ├── 0000_init-baseline.sql              (Story 1.2)
    │   │   ├── 0001_events-log.sql                 (Story 1.3)
    │   │   ├── 0002_events-log-rls.sql             [NEW] Task 3.1 + hand-supplement 3.3
    │   │   └── meta/
    │   │       ├── _journal.json       [UPDATED] Task 3.1 — idx 1 → 2
    │   │       ├── 0000_snapshot.json              (Story 1.2)
    │   │       ├── 0001_snapshot.json              (Story 1.3)
    │   │       └── 0002_snapshot.json              [NEW] Task 3.1
    │   ├── src/
    │   │   ├── index.ts                [UPDATED] Task 4.5 — re-export setPariwarScope + assertPariwarScopeSet + withPariwarScope + errors + policies + crossTenant
    │   │   ├── db.ts                   [UPDATED] Task 4.2 — UUID_REGEX + setPariwarScope + assertPariwarScopeSet + withPariwarScope
    │   │   ├── errors.ts                              [NEW] Task 4.1 — InvalidPariwarScopeError + PariwarScopeMissingError
    │   │   ├── schema/
    │   │   │   ├── events_log.ts       [MAYBE UPDATED] Task 2.3 — if standalone pgPolicy API requires inline declaration
    │   │   │   └── (other files unchanged)
    │   │   ├── policies/
    │   │   │   ├── README.md           [UPDATED] Task 9.2 — substantive content
    │   │   │   ├── _roles.ts                          [NEW] Task 2.1
    │   │   │   ├── events-log-rls.ts                  [NEW] Task 2.2
    │   │   │   └── index.ts                           [NEW] Task 2.4 — barrel
    │   │   ├── cross-tenant/
    │   │   │   ├── README.md           [UPDATED] Task 9.3 — substantive content
    │   │   │   ├── run-as-cross-tenant.ts             [NEW] Task 4.3
    │   │   │   └── index.ts                           [NEW] Task 4.4
    │   │   └── test-utils/
    │   │       ├── integration-setup.ts               [NEW — relocated from packages/events/tests/integration-setup.ts] Task 5.3
    │   │       └── index.ts                           [NEW] Task 5.5 — barrel
    │   └── tests/
    │       ├── smoke.test.ts                          (preserved Story 1.1)
    │       ├── db.test.ts                             (preserved Story 1.2)
    │       └── integration/
    │           ├── rls/
    │           │   └── policy-regression.spec.ts      [NEW] Task 6.1
    │           └── multi-tenant/
    │               └── cross-pariwar-leak.spec.ts     [NEW] Task 6.2
    └── events/                         (Story 1.3 baseline; minor Story 1.6 updates)
        ├── tests/
        │   ├── integration-setup.ts    [UPDATED] Task 5.3 — thin re-export from @twt/domain/test-utils/integration-setup
        │   └── append-event.test.ts    [UPDATED] Task 7.2 — true two-connection concurrency test (W4 closure)
        └── (other files unchanged)
└── _bmad-output/implementation-artifacts/
    ├── sprint-status.yaml              [UPDATED] Task 10.4 — 1-6 backlog→ready-for-dev→in-progress→review
    ├── 1-6-pariwar-id-first-class-rls-adversarial-test.md  [UPDATED] Task 10.5 — Dev Agent Record
    └── deferred-work.md                [UPDATED] Task 10.1 + 10.2 — RESOLVED markers + Story 1.6 deferred section
```

### Testing standards summary

**At Story 1.6** the test surface is:

- **`packages/domain/tests/smoke.test.ts`** (preserved Story 1.1).
- **`packages/domain/tests/db.test.ts`** (preserved Story 1.2 — createDb factory pool-config unit test).
- **`packages/domain/tests/integration/rls/policy-regression.spec.ts`** (NEW Task 6.1) — vitest integration test against live local Docker Postgres 16 OR CI Postgres 16 service container; 6+ assertions on policy behavior + connection-level fail-closed + FORCE RLS table-owner cannot escape.
- **`packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts`** (NEW Task 6.2) — vitest integration test; 7+ assertions probing multiple query shapes for cross-Pariwar leakage + the runAsCrossTenant positive cross-tenant read + audit-event emission verification.
- **`packages/events/tests/smoke.test.ts`** (preserved Story 1.1).
- **`packages/events/tests/state-machine.test.ts`** (preserved Story 1.3).
- **`packages/events/tests/canonical-json.test.ts`** (preserved Story 1.3).
- **`packages/events/tests/append-event.test.ts`** (UPDATED Task 7.2 — concurrency test upgraded to true two-connection parallel; W4 closure).
- **`packages/events/tests/replay-state.test.ts`** (preserved Story 1.3 — minor update if needed per Task 6.5 to accept defaultPariwarId).
- **`packages/events/tests/append-only.test.ts`** (preserved Story 1.3 — minor update if needed per Task 6.5).
- **`packages/contracts/tests/{smoke,type-assignability,validation-parity}.test.ts`** (preserved Story 1.4).

**Test runner**: `vitest` per Story 1.1 default. Integration tests gate on `process.env.DATABASE_URL` presence — when unset (local `pnpm test` without Docker), they SKIP via `describe.skipIf(!process.env.DATABASE_URL)`; when set (local Docker Postgres 16 OR CI Postgres 16 service container), they RUN. Per-test transaction-rollback isolation per `setupLiveDb` helper.

**Live-DB CI substrate**: NEW at Story 1.6 (`integration-tests` job in `.github/workflows/ci.yml`); Postgres 16 service container; applies migrations; runs integration tests under `@twt/domain` + `@twt/events` workspaces.

**Architecture-committed integration test slots** that Story 1.6 SUBSTANTIVELY POPULATES:
- `tests/integration/rls/policy-regression.spec.ts` ← Task 6.1 (located at `packages/domain/tests/integration/rls/`).
- `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` ← Task 6.2 (located at `packages/domain/tests/integration/multi-tenant/`).

**Architecture-committed integration test slots** that Story 1.6 does NOT populate (deferred per their landing Stories):
- `tests/integration/audit-log/integrity-check.spec.ts` (Story 1.10) — consumes `runAsCrossTenant` + the Story 1.10 audit-log integrity-check job.
- `tests/integration/pool-engine/replay.spec.ts` (Story 7.x) — consumes Story 1.3's `replayState` + `canonicalJsonStringify`.
- `tests/integration/snapshot-adapters/property.spec.ts` (Story 7.x).
- `tests/integration/public-pages/scrape-test.spec.ts` (Story 1.16b).

### References

- [Source: epics.md#Story-1.6] line 1081-1098 — story body + ACs (verbatim source).
- [Source: epics.md#AR-3] line 258 — Multi-tenant isolation via Postgres Row-Level Security keyed on pariwar_id; adversarial cross-Pariwar read CI test required.
- [Source: epics.md#FR-59] line 119 — pariwar_id first-class on every multi-tenant table; DB-level non-nullable FK; every query filters by pariwar_id; every endpoint resolves from auth context.
- [Source: epics.md#Epic-1] line 968-984 — Epic 1 context + cross-story dependencies + demoable closure ("Adversarial cross-Pariwar RLS read test passes (any leak is P0)").
- [Source: epics.md#Sprint-Change-Proposal-Item-3] line 519 — Event-derived state source-of-truth commitment (events_log RLS is the second guard).
- [Source: epics.md#Story-1.7] line 1100-1115 — Pariwar-Passport data model (carve-out RLS policies; cross-Pariwar-readable per architecture §1.2 line 726-729).
- [Source: epics.md#Story-1.9] line 1135-1153 — admin authentication (consumes setPariwarScope at scope-resolution middleware).
- [Source: epics.md#Story-1.10] line 1154-1172 — tamper-evident audit log (substantively wires audit_log_entries replacing Story 1.6 events_log audit-event placeholder).
- [Source: architecture.md#Cross-Cutting-#1] line 275-276 — Multi-tenant isolation — every query scoped by pariwar_id; typed constraint at the data layer; adversarial cross-Pariwar read test in CI; any leak is P0.
- [Source: architecture.md#1.1-Datastore] line 691-714 — Managed Postgres + PostgreSQL RLS first-class support is a hard requirement; Cloud SQL satisfies it.
- [Source: architecture.md#1.2-Multi-tenant-isolation] line 715-770 — RLS as the typed-constraint enforcement; Drizzle pgPolicy declarative API; session variable contract; service-role connections; RLS regression discipline; defense-in-depth on pariwar_id resolution; cross-tenant operations enforcement.
- [Source: architecture.md#1.8-Migration-tool] line 986-1017 — drizzle-kit forward-only migration policy; per-migration atomicity; online migrations for hot tables.
- [Source: architecture.md#2.5-Multi-Pariwar-active-scope] line 1449-1474 — URL path prefix; auth middleware extracts pariwar_id; re-parses as UUID at middleware boundary; sets Postgres session variable app.pariwar_id; rejects 404 on missing membership.
- [Source: architecture.md#2.6-RBAC-enforcement] line 1476-1497 — RBAC is the second guard after RLS — RLS prevents cross-tenant data leak; authorization prevents in-tenant action by an insufficiently-privileged user.
- [Source: architecture.md#Naming-patterns] line 3661-3699 — snake_case at DB layer; camelCase at TS layer; raw SQL string convention uses snake_case (session-variable invocation matches this).
- [Source: architecture.md#Complete-project-directory-structure] line 4341-4360 — packages/domain layout; src/policies/ for RLS via pgPolicy; src/cross-tenant/ for named cross-tenant operations helper; tests/integration/ slot conventions.
- [Source: architecture.md#Workspace-Layout] line 406-435 — packages/domain holds the system's identity; Drizzle schema, RLS policies, tenant rules, validators, shared domain types.
- [Source: architecture.md#Implementation-Handoff] line 5079-5099 — PR-2 substantive content authoring window includes Story 1.6.
- [Source: docs/adr/ADR-0003-datastore-engine.md] — Drizzle pgPolicy declarative API support cited as a rationale for Drizzle-over-Prisma + Cloud SQL choice; Story 1.6 substantively exercises the API.
- [Source: docs/adr/ADR-0004-canonical-json.md] — Story 1.3 canonical-JSON serializer; Story 1.6's runAsCrossTenant audit-event payload uses appendEvent which (downstream Story 1.10) will consume canonicalJsonStringify for audit-line hashing.
- [Source: docs/knowledge-transfer/adr-index.md] — no dedicated ADR slot for RLS — architecture §1.2 is canonical and exhaustive; Story 1.6 implements the architecturally-committed design without a new ADR.
- [Source: _bmad-output/implementation-artifacts/1-2-cloud-sql-postgres-drizzle-migration-tooling.md] — Story 1.2 Terraform IaC + Drizzle scaffolding + Secret Manager wiring + migration zero idempotent + W1 BYPASSRLS deferral to Story 1.6.
- [Source: _bmad-output/implementation-artifacts/1-3-packages-events-event-log-primitive.md] — Story 1.3 events_log Drizzle schema + append-only triggers + integration-setup.ts per-test transaction-rollback substrate; D2-1.3 + D9-1.3 + D10-1.3 + W4 closures.
- [Source: _bmad-output/implementation-artifacts/1-4-packages-contracts-zod-openapi-contract-scaffolding.md] — Story 1.4 packages/contracts substrate + .nvmrc CI Node-version pin pattern (Story 1.6's integration-tests job adopts the pattern from day one).
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — Story 1.2 W1 + D6-1.2 + D13-1.2; Story 1.3 D2-1.3 + D9-1.3 + D10-1.3 + W4; Story 1.4 D1-1.4 et seq. (orthogonal — no Story 1.6 dependency).
- [Source: packages/domain/README.md] — naming discipline + forward-only migration policy + hand-supplemented migration pattern; Story 1.6 extends with §RLS.
- [Source: packages/domain/src/schema/events_log.ts] — Story 1.3 events_log Drizzle schema; line 82-83 "Story 1.3 does NOT install RLS — Story 1.6 territory" guardrail comment.
- [Source: packages/domain/src/policies/README.md] — Story 1.2 placeholder; Story 1.6 rewrites substantively.
- [Source: packages/domain/src/cross-tenant/README.md] — Story 1.2 placeholder; Story 1.6 rewrites substantively.
- [Source: packages/events/tests/integration-setup.ts] — Story 1.3 per-test transaction-rollback substrate; Story 1.6 Task 5.3 relocates to @twt/domain/test-utils/.
- [Source: packages/events/tests/append-event.test.ts] — Story 1.3 SAVEPOINT concurrency test; Story 1.6 Task 7.2 upgrades to true two-connection parallel.
- [Source: infra/gcp/cloud-sql-dev.tf] line 14-15 — Story 1.2 "non-superuser, no BYPASSRLS" comment; Story 1.6 Task 8.1 expands to cite migration-layer enforcement.
- [Source: .github/workflows/ci.yml] — Story 1.2 db-check + Story 1.4 contracts-check job patterns; Story 1.6 Task 5.2 adds integration-tests job mirroring the same shape (service container + DATABASE_URL env + node-version-file pattern).
- [Source: .decision-log.md] Decision 2026-06-08-038 (Story 1.2) + 2026-06-09-039 (Story 1.3) + 2026-06-09-040 (Story 1.4) — append Decision 2026-06-XX-XXX for Story 1.6 at Task 10.3.
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] — Story 1.6 development_status entry at line 130 (`1-6-pariwar-id-first-class-rls-adversarial-test: backlog`); Task 10.4 flips to review.
- [Source: Drizzle ORM RLS docs (architecture line 681)] — pgPolicy declarative API + CREATE POLICY emission + .link() vs inline patterns; verify at dev-time per Task 1.6.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (claude-opus-4-8) — bmad-dev-story workflow, Solo Builder (BigDev).

### Debug Log References

Local verification environment: Docker `postgres:16-alpine` on host port **5433** (host already runs a Postgres on 5432); `DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable`. CI uses 5432 (no host conflict).

Empirical findings that shaped the implementation:

- **`twt_dev_app` is a Docker/CI superuser + BYPASSRLS** (`SELECT rolsuper, rolbypassrls` → `t, t`). Superusers bypass RLS regardless of FORCE, so the RLS-enforcement tests `SET LOCAL ROLE twt_app` to shed superuser. In production `twt_dev_app` is a non-superuser member of `twt_app`, so RLS applies directly.
- **Bare `''::uuid` cast in the USING clause RAISES** `invalid input syntax for type uuid: ""` and aborts the statement (probe at dev-time) — it does NOT silently return 0 rows as the AC-1/Dev-Note narrative claimed. Fixed with `nullif(current_setting('app.pariwar_id', true), '')::uuid` so unset scope → NULL → 0 rows. Verified probe: scoped(A)=1, unset=0, superuser=2.
- **drizzle-kit duplicate-policy warning** when both `events-log-rls.ts` and the `index.ts` barrel were in the schema glob → narrowed glob to `*-rls.ts`.
- **turbo task-graph cycle**: adding `@twt/events` to `@twt/domain` (for the AC-4 `appendEvent` import) made turbo abort with "Cyclic dependency detected" → switched `runAsCrossTenant` to a direct drizzle INSERT.
- **turbo env sandbox**: with `DATABASE_URL` set, `pnpm turbo run test` STILL skipped the integration suites because turbo 2.x doesn't pass undeclared env to tasks → added `"env": ["DATABASE_URL"]` to the `turbo.json` `test` task; confirmed the suites then run (domain 55 passed/1 skip; events 31 passed) and still skip cleanly when unset.
- **Migration self-test fires at fresh apply only** — drizzle skips already-applied migrations, so re-running `db:migrate` does not re-execute the BYPASSRLS self-test (demonstrated the DO-block RAISEs directly). Captured as D10-1.6.
- **Latent pre-existing bug surfaced** by the new live-DB CI: `append-event.test.ts` "rejects negative expectedVersion" matched `/expectedVersion must be >= 0/` but the code throws `"...must be a non-negative integer"` — fixed.

### Completion Notes List

- **AC-1..AC-10 satisfied.** `events_log` RLS is a Postgres-layer typed constraint; the only Pariwar-scoped table at closure.
- **Deviations from the story's literal spec (all recorded in Decision 2026-06-11-042 with rationale):** (1) policy expression uses `nullif(...)` for correct quiet fail-closed; (2) RLS tests `SET LOCAL ROLE twt_app` because the Docker login role is a superuser, and the "FORCE — owner cannot escape" case became a `pg_class` catalog assertion; (3) `runAsCrossTenant` emits the audit event via a direct `events_log` INSERT (not `@twt/events.appendEvent`) to avoid a layering inversion + turbo cycle; (4) migration 0002 adds `GRANT SELECT, INSERT` to the group roles (beyond the spec) so a `SET ROLE twt_app` session can read/write; (5) the CI `integration-tests` job uses hardcoded `node-version: 20.18.0` matching the seven existing jobs (the AC-5 `.nvmrc` premise was factually wrong for this repo); (6) `turbo.json` `test` gains `env:[DATABASE_URL]` — REQUIRED for the live-DB suites to run under turbo (the original AC-5 plan would have skipped silently in CI).
- **setupLiveDb relocation:** moved to `packages/domain/src/test-utils/integration-setup.ts` with a `test-utils/index.ts` barrel; `packages/events/tests/integration-setup.ts` is now a thin re-export from `@twt/domain/src/test-utils/integration-setup.js` (deep path; `@twt/domain` has no `exports` map so deep imports resolve, and test-utils is intentionally NOT re-exported from the package `index.ts` to keep `vitest` out of the production bundle). The exported type kept its Story 1.3 name `TxContext` (the AC referenced `LiveDbContext`; renamed to match reality).
- **AC-8 optional `lifecycle.precondition`** skipped per the AC's own guidance (`random_password` already uses `special = false`).
- **`.env.example`** unchanged — the Story 1.3 DATABASE_URL convention already covers it (no drift).
- **Resilience:** integration suites pass on a second run against the already-populated DB (the committing `runAsCrossTenant` tests use dedicated tenants X/Y so persistent rows don't pollute the A/B exact-count assertions) and skip cleanly with no `DATABASE_URL`.
- **W4 closed:** SAVEPOINT concurrency test replaced with a true two-connection parallel test (stable across 3 repeats).
- ✅ Resolved deferral W1 (BYPASSRLS migration-layer enforcement + self-test). ✅ Resolved D6-1.2, D2-1.3, D9-1.3, D10-1.3, W4. ◑ Partially resolved D13-1.2 (2 of 6 integration slots).

### File List

**New:**
- `packages/domain/src/policies/_roles.ts`
- `packages/domain/src/policies/events-log-rls.ts`
- `packages/domain/src/policies/index.ts`
- `packages/domain/migrations/0002_events-log-rls.sql`
- `packages/domain/migrations/meta/0002_snapshot.json`
- `packages/domain/src/errors.ts`
- `packages/domain/src/cross-tenant/run-as-cross-tenant.ts`
- `packages/domain/src/cross-tenant/index.ts`
- `packages/domain/src/test-utils/integration-setup.ts`
- `packages/domain/src/test-utils/index.ts`
- `packages/domain/tests/integration/_helpers.ts`
- `packages/domain/tests/integration/rls/policy-regression.spec.ts`
- `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts`

**Modified:**
- `packages/domain/drizzle.config.ts` (schema glob → `*-rls.ts`)
- `packages/domain/migrations/meta/_journal.json` (idx → 2)
- `packages/domain/src/db.ts` (UUID_REGEX + setPariwarScope + assertPariwarScopeSet + withPariwarScope)
- `packages/domain/src/index.ts` (re-exports + policies/crossTenant namespaces + errors)
- `packages/domain/vitest.config.ts` (integration `.spec.ts` glob)
- `packages/domain/README.md` (§12 RLS + landing-Story map flips)
- `packages/domain/src/policies/README.md` (substantive)
- `packages/domain/src/cross-tenant/README.md` (substantive)
- `packages/events/tests/append-event.test.ts` (true two-connection concurrency + regex fix)
- `packages/events/tests/integration-setup.ts` (thin re-export shim)
- `.github/workflows/ci.yml` (integration-tests job)
- `turbo.json` (test task `env:[DATABASE_URL]`)
- `infra/gcp/cloud-sql-dev.tf` (W1 closure note)
- `README.md` (live-DB CI substrate line)
- `.decision-log.md` (Decision 2026-06-11-042)
- `_bmad-output/implementation-artifacts/deferred-work.md` (RESOLVED markers + Story 1.6 deferred D1-1.6..D10-1.6)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (1-6 → review + last_updated)
- `_bmad-output/implementation-artifacts/1-6-pariwar-id-first-class-rls-adversarial-test.md` (this file — Status + Dev Agent Record + checkboxes)

### Review Findings

_Code review 2026-06-11 — 3 layers (Blind Hunter + Edge Case Hunter + Acceptance Auditor). 8 patch · 12 defer · ~15 dismissed._

**Patches:**

- [x] [Review][Patch] P1: Race condition in `runAsCrossTenant` audit version — two concurrent calls read the same `MAX(event_version)` for the sentinel stream; second INSERT fails unique-constraint `(stream_id, event_version)` and rolls back the entire cross-tenant operation. Fix: use `gen_random_uuid()` as `stream_id` per call (each audit event gets its own stream at version 1; eliminates the race and the hot-row accumulation W9). [`packages/domain/src/cross-tenant/run-as-cross-tenant.ts:92-96`]
- [x] [Review][Patch] P2: UUID not lowercased before `SET LOCAL` in `setPariwarScope` — `UUID_REGEX` accepts uppercase hex (`/i` flag); `assertPariwarScopeSet` returns the uppercase form; DB columns store lowercase; callers comparing the scope value against a stored ID will get a string mismatch. Fix: add `.toLowerCase()` before interpolating into `SET LOCAL app.pariwar_id`. [`packages/domain/src/db.ts`]
- [x] [Review][Patch] P3: vitest integration config missing `pool: 'forks'` — `integration-setup.ts` comment says "run with `--pool=forks`" (module-level `txContext` requires per-file process isolation) but the config does not enforce it; under a non-forking pool, `txContext.current` could be shared across test files. Fix: add `pool: 'forks'` to `packages/domain/vitest.config.ts` for the integration test glob. [`packages/domain/vitest.config.ts`]
- [x] [Review][Patch] P4: `activeClient` leaked if `BEGIN` throws in `setupLiveDb` `beforeEach` — `pool.connect()` succeeds and `activeClient` is assigned, but `activeClient.query('BEGIN')` throws with no `catch`/`finally` to release it, exhausting pool connections over repeated failures. Fix: wrap the `BEGIN` query in `try/catch` and call `activeClient.release()` on error. [`packages/domain/src/test-utils/integration-setup.ts`]
- [x] [Review][Patch] P5: Broken connection returned to pool on `ROLLBACK` failure in `afterEach` — if `ROLLBACK` throws (e.g., broken TCP), the `finally` block calls `activeClient.release()` without the destroy flag, putting a broken-transaction client back in the pool. Fix: call `activeClient.release(true)` (destroy=true) when `ROLLBACK` fails. [`packages/domain/src/test-utils/integration-setup.ts`]
- [x] [Review][Patch] P6: `not.toHaveProperty('currentVersion')` assertion dropped from two-connection concurrency test — the original W4 SAVEPOINT test asserted this per Decision 2026-06-09-039 §6 ("currentVersion intentionally absent from ConcurrencyError"); the replacement two-connection test does not carry it forward, breaking CI coverage of that behavioral commitment. Fix: add `expect(caught).not.toHaveProperty('currentVersion')` to the loser assertion block. [`packages/events/tests/append-event.test.ts`]
- [x] [Review][Patch] P7: Missing trailing newline in `_journal.json` — diff shows `\ No newline at end of file`. Fix: add trailing newline. [`packages/domain/migrations/meta/_journal.json`]
- [x] [Review][Patch] P8: `lifecycle.precondition` skip not captured in deferred-work — AC-8 prescribes "skip and capture in deferred-work"; no entry was added. Fix: add a one-line deferred-work entry for the Terraform `lifecycle.precondition` gap. [`_bmad-output/implementation-artifacts/deferred-work.md`]

**Deferred:**

- [x] [Review][Defer] W1-CR1.6: `fn()` throws after `SET LOCAL row_security = off` — no audit trail for partial cross-tenant reads [`packages/domain/src/cross-tenant/run-as-cross-tenant.ts:82-110`] — deferred, Story 1.10 audit hardening territory
- [x] [Review][Defer] W2-CR1.6: `twt_service` has INSERT grant but no matching permissive RLS policy (deny-all via FORCE RLS in practice) [`packages/domain/migrations/0002_events-log-rls.sql`] — deferred, intentional current posture per D9-1.6; Story 1.10 wires twt_service substantively
- [x] [Review][Defer] W3-CR1.6: Migration self-test fires at fresh-apply only (D10-1.6 already tracked) [`packages/domain/migrations/0002_events-log-rls.sql`] — deferred, pre-existing D10-1.6
- [x] [Review][Defer] W4-CR1.6: ENABLE RLS could commit without FORCE if drizzle-kit breakpoints run per-statement in autocommit [`packages/domain/migrations/0002_events-log-rls.sql`] — deferred, follows Story 1.3 breakpoint precedent; verify drizzle-kit transaction semantics at Story 1.15 live provisioning
- [x] [Review][Defer] W5-CR1.6: `withPariwarScope` tested in RLS-bypass mode — CI superuser bypasses FORCE RLS; the production API is never exercised with RLS actually active in this diff [`packages/domain/src/db.ts`] — deferred, D3-1.6 structural limitation
- [x] [Review][Defer] W6-CR1.6: turbo cache — integration test results could be served stale on re-runs [`turbo.json`, `.github/workflows/ci.yml`] — deferred, low risk with ephemeral service containers; revisit if remote turbo cache is configured
- [x] [Review][Defer] W7-CR1.6: Audit payload caller-controlled — `reason`/`pariwarIds`/`actorId` unconstrained free text/arrays [`packages/domain/src/cross-tenant/run-as-cross-tenant.ts`] — deferred, Story 1.10 audit hardening
- [x] [Review][Defer] W8-CR1.6: `GRANT USAGE ON SCHEMA public` missing for `twt_app` role [`packages/domain/migrations/0002_events-log-rls.sql`] — deferred, passes on Docker/CI default; production schema hardening at Story 1.15
- [x] [Review][Defer] W9-CR1.6: `CROSS_TENANT_SENTINEL_UUID` hot-row contention — single sentinel stream grows unboundedly; every call contends for `MAX(event_version)` on the same stream_id [`packages/domain/src/cross-tenant/run-as-cross-tenant.ts`] — deferred, resolved as side-effect of P1 (random-stream-per-call approach); otherwise Story 1.10+ production scale concern
- [x] [Review][Defer] W10-CR1.6: `setPariwarScope` lacks runtime transaction-active guard — `SET LOCAL` silently degrades to `SET` outside a transaction, leaking pariwarId to next pooled request [`packages/domain/src/db.ts`] — deferred, documented via comment; Story 1.9 scope-resolution wiring is natural validation gate; round-trip cost of guard deferred
- [x] [Review][Defer] W11-CR1.6: `@twt/domain/policies` subpath import not in exports map [`packages/domain/package.json`] — deferred, deep imports resolve currently; exports map is Story 1.16c territory
- [x] [Review][Defer] W12-CR1.6: `GRANT twt_service TO twt_dev_app` requires ADMIN OPTION in non-superuser production [`packages/domain/migrations/0002_events-log-rls.sql`] — deferred, production migration executor will be a privileged user; address at Story 1.15 live provisioning

### Change Log

| Date       | Change                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------ |
| 2026-06-11 | Story 1.6 substantive author-commit (Tasks 1-10) — RLS substrate, session-variable helpers, cross-tenant helper, live-DB CI substrate, RLS + adversarial integration tests, true two-connection concurrency upgrade. Status ready-for-dev → in-progress → review. |
| 2026-06-11 | Closed deferrals W1 + D6-1.2 + D2-1.3 + D9-1.3 + D10-1.3 + W4; D13-1.2 partial; added Story 1.6 deferred D1-1.6..D10-1.6 (Date: 2026-06-11). |
| 2026-06-11 | Code review (3-layer: Blind Hunter + Edge Case Hunter + Acceptance Auditor). 8 patch · 12 defer · ~15 dismissed. Status review → in-progress (patches outstanding). |
| 2026-06-11 | Applied all 8 review patches (P1-P8). Status in-progress → done. |
