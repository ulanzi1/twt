// Central Postgres role-name constants for RLS policy declarations.
//
// Architecture §1.2 line 731-740 — the two-role model:
//   - `twt_app`     — the role normal request-handlers run as (or are members
//                     of). Every RLS policy binds `to appRole`; the policy
//                     `USING` clause keys on the `app.pariwar_id` session
//                     variable (see packages/domain/src/db.ts setPariwarScope).
//   - `twt_service` — the role batch jobs / cross-tenant tooling run as
//                     (substantively wired at Story 1.10 audit-integrity job +
//                     Story 7.x snapshot writer). Story 1.6 commits the named
//                     constant so downstream Stories import it without
//                     re-declaring; the CI import-rule lint that forbids
//                     constructing service-role connections outside the
//                     cross-tenant module lands at Story 1.16a (deferred D1-1.6).
//
// Both roles are declared `.existing()` so drizzle-kit treats them as
// externally-managed: the `CREATE ROLE` DDL is hand-supplemented (idempotently)
// in migration 0002_events-log-rls.sql, NOT emitted by `db:generate`. The
// application's actual Cloud SQL login role (`twt_dev_app` per Story 1.2
// Terraform) is GRANTed membership in both group roles by the same migration;
// a login role's effective privileges include those of any group role it is a
// member of, so RLS policies `TO twt_app` apply to `twt_dev_app` via membership.

import { pgRole } from 'drizzle-orm/pg-core';

/** Normal request-handler role. Every Pariwar-scoped RLS policy binds here. */
export const appRole = pgRole('twt_app').existing();

/**
 * Batch-job / cross-tenant-tooling role. Named here for downstream import;
 * substantively exercised at Story 1.10 + Story 7.x.
 */
export const serviceRole = pgRole('twt_service').existing();
