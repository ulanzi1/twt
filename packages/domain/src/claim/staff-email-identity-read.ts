// The staff email's IDENTITY-DATA READS — Story 6.25 (Task 2.2 / 3.1; `2026-10-09-299` RE3, RE8 (ii); ADR-0040's amendment of
// ADR-0009 §5). ⭐ The ONLY two query sites outside `apps/api`'s auth repo that ADR-0040 admits for identity data:
//
//   · Q1 — `staffEmailRecipientsSql`: WHO is a recipient of claim C in Pariwar P (RE3) — ONE fragment, used by BOTH the sweep's
//          selector (cross-tenant, BYPASSRLS pool) and the child's locked re-check (a Pariwar-scoped `twt_app` transaction), so
//          the two can ⛔ never derive it twice. It reads `role_grants`, `users.status` and `EXISTS (… admin_credentials …)`, and
//          projects ⛔ identity column — only the `user_id` it already holds from `role_grants`.
//   · Q2 — `readAdminEmailCiphertext`: ONLY `email_ciphertext`, for ONE `user_id`. Called only by the staff-email child AFTER its
//          claiming transaction commits. ⛔ Nothing here decrypts (the child does, in `apps/jobs`).
//
// ⚠ Both are fenced by an exact-allowlist source test (`apps/jobs/tests/staff-email-identity-read-fence.test.ts`): a new
// `admin_credentials` reader, a second projected column, or a new `decryptAdminEmail` caller turns it red — and is a new ADR.
// ⛔ `listAdminsByRole` (`admin-directory.ts`) is ⛔ reused: it drops a Pariwar Admin with a blank display name and caps at 50 (F4).

import { type SQL, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { UserId } from '../ids/index.js';
import { suspicionChainStartedAtSql } from './suspicion-refusal.js';

/**
 * ⭐ Q1 — RE3. A `SELECT DISTINCT user_id` of the recipients of claim (`pariwarId`, `claimCaseId`), each a raw SQL expression
 * (a bound parameter, or an outer column). User U is a recipient iff:
 *   (a) a `role_grants` row in P with `role = 'pariwar_admin'`, `scope_dimension = 'pariwar'` and `scope_value = pariwar_id::text`
 *       — the case-sensitive TEXT compare RBAC binds on (`rbac/check.ts`); ⛔ a `scope_value::uuid` cast (looser than the guard,
 *       and a 22P02 on any non-uuid grant — Postgres does ⛔ not guarantee `AND` order);
 *   (b) THE FREEZE — that grant's `created_at <=` the start of C's CURRENT `-239` chain (`suspicionChainStartedAtSql`), compared
 *       in SQL (both µs `timestamptz`). ⛔ The live row's `decided_at`: every revision re-stamps it, a note-only one included. A
 *       claim whose live decision is ⛔ a `-239` refusal has a NULL chain start ⇒ `<= NULL` ⇒ ⛔ recipient;
 *   (c) `users.status = 'active'`;
 *   (d) an `admin_credentials` row exists (the ONLY place the address is held — ⛔ login ⇒ ⛔ recipient).
 * ⛔ No display-name conjunct. ⛔ `super_admin`, ⛔ `district_admin`, ⛔ a state- or district-scoped `pariwar_admin`. Duplicate
 * grants collapse (`DISTINCT`). Aliases `se_g` / `se_u` / `se_ac` are unique to this fragment.
 */
export function staffEmailRecipientsSql(pariwarId: SQL, claimCaseId: SQL): SQL {
  return sql`(
    SELECT DISTINCT se_g.user_id
      FROM role_grants se_g
      JOIN users se_u ON se_u.id = se_g.user_id
     WHERE se_g.pariwar_id = ${pariwarId}
       AND se_g.role = 'pariwar_admin'
       AND se_g.scope_dimension = 'pariwar'
       AND se_g.scope_value = se_g.pariwar_id::text
       AND se_g.created_at <= ${suspicionChainStartedAtSql(pariwarId, claimCaseId)}
       AND se_u.status = 'active'
       AND EXISTS (SELECT 1 FROM admin_credentials se_ac WHERE se_ac.user_id = se_g.user_id)
  )`;
}

/**
 * ⭐ Q2 — the stored address ciphertext of ONE admin, AS STORED (`enc:v1:…`), or `null` when the admin has ⛔ credentials row
 * (deleted after the claiming commit). Only `email_ciphertext` is projected.
 */
export async function readAdminEmailCiphertext(db: Db, userId: UserId): Promise<string | null> {
  const result = await db.execute<{ email_ciphertext: string }>(sql`
    SELECT se_q2.email_ciphertext FROM admin_credentials se_q2 WHERE se_q2.user_id = ${userId}
  `);
  return result.rows?.[0]?.email_ciphertext ?? null;
}
