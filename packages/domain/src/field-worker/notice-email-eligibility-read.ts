// The move-notice email's IDENTITY-DATA READ — Story 13.1g (Task 2.1; decision `2026-11-12-463` AD5; ADR-0045's amendment of ADR-0040's
// amendment of ADR-0009 §5). ⭐ Q4 — the ONLY query site ADR-0045 adds:
//
//   · Q4 — `fieldWorkerNoticeEmailEligibleSql`: may ONE `user_id` (already held — a notice's `recipient_user_id`) still be emailed about
//          that notice? `users.status = 'active'` AND an admin login exists (the ONLY place the address is held — ⛔ no login ⇒ ⛔ no email)
//          AND, in the notice's Pariwar, a `district_admin` grant scoped `district` to the notice's `from` or `to` district, or a
//          `pariwar_admin` grant scoped `pariwar` to that Pariwar — the case-sensitive TEXT compare RBAC binds on (`rbac/check.ts`). It
//          projects ⛔ identity column — it is a boolean over the id it was given. It REMOVES recipients, ⛔ never adds one: the recipient
//          is the notice row's (13.1d's writer, `-458` AD9), ⛔ re-derived here (TR2).
//          Narrowings, by construction: a `super_admin` opener is ⛔ emailed (⛔ `global` branch); a Pariwar Admin whose `pariwar` grant
//          names another Pariwar is ⛔ emailed (13.1d's in-app helper admits it — `notices.ts` `pariwarAdminsOf`).
//   · Q2 (ADR-0040) — `readAdminEmailCiphertext` (`../claim/staff-email-identity-read.ts`) is REUSED, ⛔ copied: ADR-0045 admits the
//          move-notice child as its THIRD caller.
//
// ⚠ Fenced by `apps/jobs/tests/staff-email-identity-read-fence.test.ts` (exact allow-lists + this module's own projection rules): a
// projected column, a second credentials read, a JOIN, or a new reader elsewhere turns it red — and is a new ADR.

import { type SQL, sql } from 'drizzle-orm';

/**
 * ⭐ Q4 — a boolean SQL expression. Each argument is a raw SQL expression (a bound parameter, or an outer column): the user, the notice's
 * Pariwar, and the notice's `from` / `to` districts. Aliases `fn_u` / `fn_ac` / `fn_g` are unique to this fragment.
 */
export function fieldWorkerNoticeEmailEligibleSql(userId: SQL, pariwarId: SQL, fromDistrict: SQL, toDistrict: SQL): SQL {
  return sql`EXISTS (
    SELECT 1 FROM users fn_u
     WHERE fn_u.id = ${userId}
       AND fn_u.status = 'active'
       AND EXISTS (SELECT 1 FROM admin_credentials fn_ac WHERE fn_ac.user_id = fn_u.id)
       AND EXISTS (
         SELECT 1 FROM role_grants fn_g
          WHERE fn_g.user_id = fn_u.id
            AND fn_g.pariwar_id = ${pariwarId}
            AND ((fn_g.role = 'district_admin' AND fn_g.scope_dimension = 'district' AND fn_g.scope_value IN (${fromDistrict}, ${toDistrict}))
              OR (fn_g.role = 'pariwar_admin' AND fn_g.scope_dimension = 'pariwar' AND fn_g.scope_value = fn_g.pariwar_id::text))
       )
  )`;
}
