# src/policies/

**Active at Story 1.6** — `pariwar_id` first-class + RLS adversarial test per
AR-3 + FR-59 + architecture §1.2 line 715-770.

Drizzle `pgPolicy` declarative Row-Level-Security policies live here. Story 1.6
authored the substantive multi-tenant isolation policies for the only
Pariwar-scoped table that exists today (`events_log`, landed by Story 1.3) plus
the cross-Pariwar adversarial CI test.

## Conventions

- **One file per table's policy set**: `events-log-rls.ts` declares the
  `events_log` policies; a future `members-rls.ts` declares the members-table
  policies at Story 3.1+; `pariwar-passport-rls.ts` lands the carve-out
  cross-Pariwar-readable policies at Story 1.7 (architecture §1.2 line 726-729).
  The drizzle-kit schema glob in `drizzle.config.ts` matches `*-rls.ts`, so a
  new policy file is discovered by `db:generate` automatically.
- **Central role constants** (`_roles.ts`): `appRole = pgRole('twt_app')` (the
  role normal request handlers run as / are members of) + `serviceRole =
  pgRole('twt_service')` (batch jobs; substantively exercised at Story 1.10 +
  7.x). Both are `.existing()` — drizzle-kit treats them as externally managed;
  the `CREATE ROLE` DDL is hand-supplemented in migration 0002, not emitted by
  `db:generate`.
- **Barrel** (`index.ts`): re-exports every policy module + the role constants.
  Consumed via the `policies.*` namespace re-export from `@twt/domain`.
- **Closed-failure USING clause**: every policy keys on
  `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`. The
  `nullif(…, '')` maps an unset session variable to NULL → no match → 0 rows
  (the quiet fail-closed), rather than a `''::uuid` cast error that would abort
  the statement. The session variable is set by `setPariwarScope` (see
  `../db.ts`); the loud complement is `assertPariwarScopeSet`.

## Migration discipline

Every new `pgPolicy` adds a new hand-supplemented migration that also runs
`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` and
grants the group roles the table privileges they need (so a production
`SET ROLE twt_app` session can read/write). See
`migrations/0002_events-log-rls.sql` and the §RLS section of the package README.

## Test discipline

Every policy ships with positive (allowed query returns expected rows) AND
negative (forbidden query returns empty / raises) assertions under
`tests/integration/rls/<table>-policy-regression.spec.ts`, plus a probe in the
cross-Pariwar adversarial suite at
`tests/integration/multi-tenant/cross-pariwar-leak.spec.ts`. Because the local /
CI login role (`twt_dev_app`) is a Docker/CI superuser that bypasses RLS, the
enforcement tests `SET LOCAL ROLE twt_app` to shed superuser before asserting
policy behaviour.

## Forward pointers

- **Story 1.7** authors `pariwar-passport-rls.ts` with cross-Pariwar-readable
  carve-out policies for the `pariwar_passport_*` tables.
- **Story 1.16a** wires the CI import-rule lint that forbids constructing
  service-role connections outside `../cross-tenant/` (deferred D1-1.6).
