// The memorial take-down approver email's IDENTITY-DATA READ — Story 11b.4a (Task 8.1; `2026-10-27-412` MP10 (b) / MP11;
// ADR-0043's amendment of ADR-0040's amendment of ADR-0009 §5). ⭐ Q3 — the ONLY query site ADR-0043 adds:
//
//   · Q3 — `memorialApproverEligibleSql`: is ONE `user_id` (already held — a `memorial_review_decisions.actor_id`) an approver who
//          can be emailed? `users.status = 'active'` AND an `admin_credentials` row exists (the ONLY place the address is held —
//          ⛔ no login ⇒ ⛔ no email). ⛔ No role is required: the approver is told only of an approval they made themselves. It
//          projects ⛔ no identity column — it is a boolean over the id it was given. ONE fragment, used by BOTH the sweep's
//          selector (cross-tenant, BYPASSRLS pool) and the child's re-check (a Pariwar-scoped `twt_app` transaction).
//   · Q2 (ADR-0040) — `readAdminEmailCiphertext` (`../claim/staff-email-identity-read.ts`) is REUSED, ⛔ not copied: ADR-0043 admits the
//          take-down child as its SECOND caller.
//
// ⚠ Fenced by `apps/jobs/tests/staff-email-identity-read-fence.test.ts` (exact allow-lists + this module's own projection rules):
// a second projected column, a second `admin_credentials` read or a new reader elsewhere turns it red — and is a new ADR.

import { type SQL, sql } from 'drizzle-orm';

/**
 * ⭐ Q3 — a boolean SQL expression: `userId` (a raw SQL expression — a bound parameter, or an outer column) names an `active`
 * user holding admin credentials. Aliases `mt_u` / `mt_ac` are unique to this fragment.
 */
export function memorialApproverEligibleSql(userId: SQL): SQL {
  return sql`EXISTS (
    SELECT 1 FROM users mt_u
     WHERE mt_u.id = ${userId}
       AND mt_u.status = 'active'
       AND EXISTS (SELECT 1 FROM admin_credentials mt_ac WHERE mt_ac.user_id = mt_u.id)
  )`;
}
