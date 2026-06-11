// RLS policy declarations for the `pariwar_passport` table — Story 1.7 (AC-4,
// D3-1.6). THE CROSS-PARIWAR-READABLE CARVE-OUT.
//
// Architecture §1.2 line 726-729: "Pariwar-Passport tables are the explicit
// exception. Their RLS policies allow cross-Pariwar reads under named conditions;
// the policies live in packages/domain/ alongside scoped-table policies and are
// reviewed together when the v2 cross-Pariwar UI lands." Step-2 Cross-Cutting #21
// (line 337-340) marks this [P0].
//
// READ-CROSS / WRITE-ISOLATED asymmetry — contrast with events_log (fully scoped):
//
//   | Operation            | events_log (scoped)        | pariwar_passport (carve-out)        |
//   |----------------------|----------------------------|-------------------------------------|
//   | SELECT               | pariwar_id = <session>     | TRUE — cross-readable (the carve-out) |
//   | INSERT/UPDATE/DELETE  | pariwar_id = <session>     | pariwar_id = <session> (unchanged)  |
//
// ⚠ The SELECT policy below being `USING (true)` is DELIBERATE, not a bug. It is
// the single place `twt_app` (the normal request role) legitimately reads
// cross-tenant rows WITHOUT the `runAsCrossTenant` / `row_security = off` escape
// hatch — because a Pariwar's public identity + branding is, by design, public
// across tenants. Every OTHER table must still fail-closed to 0 rows cross-tenant
// (the Story 1.6 leak invariant). The adversarial leak suite asserts this Passport
// as the *expected positive exception* and must keep every scoped table at 0 rows.
//
// The WRITE policy reuses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`:
// `current_setting(…, true)` returns '' (not RAISE) when scope is unset;
// `nullif(…, '')` maps that to NULL so `pariwar_id = NULL` is "no match" → the
// write is blocked rather than the statement erroring on a `''::uuid` cast. So a
// Pariwar A admin (scope = A) can read Pariwar B's passport but CANNOT
// create/alter it; an unset-scope session can read (carve-out) but cannot write.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { pariwarPassport } from '../schema/pariwar_passport.js';
import { appRole } from './_roles.js';

/**
 * THE CARVE-OUT. SELECT is cross-Pariwar readable: any `twt_app` session reads
 * any Passport row regardless of `app.pariwar_id` (even when scope is unset).
 * `USING (true)` is the named condition (architecture §1.2 line 726-729). The
 * Passport carries only public org identity + branding — see file header.
 */
export const pariwarPassportCrossReadableSelect = pgPolicy(
  'pariwar_passport_cross_readable_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`true`,
  },
).link(pariwarPassport);

/**
 * Write isolation (`for: 'all'` covers insert | update | delete). Mutation is
 * restricted to the session's own `pariwar_id` — a Pariwar A admin cannot
 * create/alter Pariwar B's passport. Unset scope → nullif → NULL → blocked
 * (the same fail-closed construct events_log proved in Story 1.6). Note: even
 * though `for: 'all'` admits DELETE at the policy layer, migration 0003 withholds
 * the DELETE table-privilege from `twt_app` (v1: a Passport is a singleton
 * identity doc and must not be deletable by the app role) — defense in depth.
 */
export const pariwarPassportTenantIsolationWrite = pgPolicy(
  'pariwar_passport_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(pariwarPassport);
