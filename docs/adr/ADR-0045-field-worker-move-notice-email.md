# ADR-0045: The field worker move notice email — a third caller of ADR-0040's Q2 and one new identity read (Q4), amending ADR-0040's amendment of ADR-0009 §5

> **Status:** drafted
> **Date:** 2026-11-12 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** —
> **Supersedes:** — (⛔ not a whole-ADR supersession: this ADR AMENDS ADR-0040's amendment in its body — the ADR-0004 / ADR-0040 / ADR-0043 in-body form; ADR-0040 stays `ratified`)
> **Superseded by:** —

## Context

- **The ruling.** [`-443`](../../.decision-log.md#decision-2026-11-03-443) Q1 A (Trustee-ratified): *"... Both District Admins are told by
  email and in the admin console, including when the Pariwar Admin moves a worker."* Story 13.1d built the console half
  ([`-458`](../../.decision-log.md#decision-2026-11-08-458)): one `field_worker_notices` row per notice and recipient, written in the
  deciding transaction, naming no one. [`-458`](../../.decision-log.md#decision-2026-11-08-458) AD1 sent the email to its own row,
  `13-1g`, *"its new ADR first"*. Story 13.1g builds it; its build decisions are
  [`-463`](../../.decision-log.md#decision-2026-11-12-463) (AD1-AD13).
- **The recipients are staff users.** `field_worker_notices.recipient_user_id` holds a `users.id` (a District Admin or a Pariwar Admin).
  The address lives only in `admin_credentials.email_ciphertext` (Tier-1, ⛔ never plaintext).
- **ADR-0040 and ADR-0043 close the set of identity read paths.** ADR-0040 admits Q1 (`staffEmailRecipientsSql`) and Q2
  (`readAdminEmailCiphertext`); ADR-0043 admits Q3 (`memorialApproverEligibleSql`) and a second Q2 caller, and closes: *"⛔ No other new
  path is admitted; a fourth is a new ADR."* The move-notice email needs (i) a THIRD caller of Q2 and (ii) a different eligibility read
  — the recipient is already named by the notice row, but 13.1d's in-app recipient helpers check no `admin_credentials` row and (for the
  Pariwar Admins) no `scope_value`, and a grant may be revoked between the act and the send. Neither Q1 (a claim's refusal chain) nor Q3
  (⛔ no role) fits. ⇒ this ADR.
- **The fence.** `apps/jobs/tests/staff-email-identity-read-fence.test.ts` enforces ADR-0040 / ADR-0043 with exact allow-lists and
  per-module projection rules. A new eligibility module escapes the projection rules unless the fence names it.
- **0205's RLS separates Pariwars, not officers.** Its header: every notice read must filter `recipient_user_id` in SQL — *"Re-examine when
  a SECOND notice reader appears"*. This email is that second reader (recorded below).
- **Deadline:** none for the build. This ADR's ratification is roster **Row 51 (e)** (authored by
  [`-463`](../../.decision-log.md#decision-2026-11-12-463), Q-4 A) — a go-live gate, ⛔ not a merge fence (the ADR-0040 / ADR-0043
  precedent).

## Decision

**The move-notice email is sent by a 6.25-shaped sweep in `apps/jobs` through the existing staff-email port (ADR-0040's providers,
config and failure classes, unchanged), and ADR-0040's amendment is AMENDED to admit exactly one more Q2 caller and one more query site.
The admission amends ADR-0040 directly and does ⛔ not depend on ADR-0043's ratification; ADR-0043's path is named because it is present
in code.**

> **Amendment — ADR-0045 (Story 13.1g, `-463`, 2026-11-12) of ADR-0040's amendment of ADR-0009 §5, effective when this ADR is
> ratified:**
> - **Q2 — a third caller.** `readAdminEmailCiphertext(db, userId)` (unchanged: ONLY `email_ciphertext`, ONE `user_id`) may also be
>   called by the field worker move-notice email child, `apps/jobs/src/scheduler/field-worker-notice-emails.ts`, AFTER its claiming
>   transaction commits; the decrypt happens in that child (`decryptAdminEmail`) and the plaintext exists only in its memory until the
>   provider call — ⛔ logged, ⛔ stored, ⛔ in a `detail` or an alarm.
> - **Q4 — the notice recipient eligibility fragment.** In `packages/domain/src/field-worker/notice-email-eligibility-read.ts`
>   (`fieldWorkerNoticeEmailEligibleSql`): for ONE `user_id` already held (a notice's `recipient_user_id`), `users.status = 'active'` AND
>   `EXISTS (SELECT 1 FROM admin_credentials … WHERE user_id = that id)` AND a `role_grants` row of that user in the notice's Pariwar that
>   is either a `district_admin` grant scoped `district` to the notice's `from` or `to` district, or a `pariwar_admin` grant scoped
>   `pariwar` to that Pariwar (a case-sensitive text compare, as RBAC binds). It projects ⛔ no identity column — only the `user_id` it
>   was given. It REMOVES recipients, never adds one: the recipient is the notice row's, ⛔ re-derived.
> - **The fence widens in the same commit as each new site**, every new allow-list entry citing ADR-0045: the Q4 module joins the
>   `admin_credentials` reader allow-list with projection rules of its own (exactly one `SELECT 1 FROM admin_credentials`, the table
>   named once, ⛔ joined, aliases unique to Q4); the child joins the `decryptAdminEmail` caller allow-list and the
>   `readAdminEmailCiphertext` caller allow-list. The envelope-context allow-list is ⛔ widened (the child does not name the context).
> Everything else in ADR-0040 and ADR-0043 stands unchanged. **The set is CLOSED:** beyond Q1-Q4 as named in ADR-0040, ADR-0043 and this
> ADR, and Q2's three named callers (6.25's child, 11b.4a's child, this child), a further path is a new ADR.

**The Q-2 rule — word for word ([`-463`](../../.decision-log.md#decision-2026-11-12-463)):**

> **Every eligible notice (Q4, AD5) is emailed, whether or not it was seen in the console and whether or not its request has moved on - EXCEPT a notice that expires under the held-backlog cutoff (3 IST days: `suspicionStaffEmailReclaimCutoff`, 00:00 IST of today - 2): (i) a notice with NO email row by the cutoff - the email system was held (the provider unconfigured or failing pre-flight) or the sweep did not run - is intentionally NEVER emailed; (ii) a send still `attempting` 3 IST days on (parked time not counted) is given up as `error` / `exhausted:attempting_three_days` (it may have gone). Either way the console still has the notice.**

Load-bearing details:

- **The send table** `field_worker_notice_emails` (migration 0206) mirrors `memorial_takedown_approver_emails` (0187) — its states,
  guard trigger and CHECKs — keyed on `notice_id` (the PRIMARY KEY, ⛔ a default: it IS the notice's id), so a notice is emailed at most
  once, ever. FK `(pariwar_id, notice_id)` → the notice. ⛔ `recipient_user_id` on the send row: the recipient is the notice's.
  `skipped:not_eligible` when Q4 fails at a first claim; `error:exhausted:recheck_not_eligible` when it fails on a re-claim (a prior attempt
  may have sent).
- **The sweep** (every 15 minutes IST, 6.25's / 11b.4a's constants): due = a notice with no send row created at or after the cutoff, plus
  every `attempting` send row. ⛔ `seen_at`, ⛔ the request's state. A held run writes no new row and parks in-flight rows.
- **The text** (approved, [`-463`](../../.decision-log.md#decision-2026-11-12-463) AD4): one bilingual plain-text template per notice
  kind (seven), Hindi then English, whose ONLY variable is the link `${ADMIN_APP_ORIGIN}/p/<pariwar id>/field-workers/requests`.
  ⛔ a name, a mobile, a code, a district, a reason, a cause, a date or time, a count, or a role the console notice does not name. That
  page is a legal sign-in return route, so the link survives a sign-in.
- **The second notice reader (0205's "re-examine").** The child reads ONE notice by `notice_id` AND `pariwar_id` and emails THAT row's
  `recipient_user_id` only — the officer filter holds by construction; the email carries none of the row's other columns.
- **The DB role — it differs from ADR-0040's F17 and ADR-0043's placement, stated so it is not inferred.** The child runs on the jobs pool
  inside `withPariwarScope`, which sets `app.pariwar_id` and ⛔ no role: on a BYPASSRLS login RLS does ⛔ not separate Pariwars there.
  The guard is an explicit `pariwar_id` predicate on EVERY child statement (the notice read, Q4's grant match, every send-row read and
  write). 0206 grants `twt_app` only (as 0152 / 0187 / 0205); **no production login holds the privileges the sweep needs today** — on
  the two field-worker tables (cross-Pariwar for the selector, park and give-up) and on `users`, `admin_credentials`, `role_grants` (Q2,
  Q4) — and this ADR grants none: Q2 / Q4 are identity reads inside this amendment's ratification (roster Row 24 (b)), and the posture is
  roster Row 26's (`jobs-db-role`). The code is written right under both postures Row 26 may choose (a BYPASSRLS login: the explicit
  predicate; `SET LOCAL ROLE twt_app`: 0206's column grants and policies). Every tick first checks it can read across Pariwars
  (`canReadAcrossPariwars`) — false ⇒ one `rls_bound_role` alarm, nothing done; a `42501` ⇒ one alarm carrying the code.

## Alternatives considered

- **Reuse 13.1d's in-app recipient helpers** — rejected: they would email officers appointed AFTER the act, and they check no login or
  Pariwar scope. The recipient is the row's; Q4 only removes.
- **Put Q4 in `staff-email-identity-read.ts` or Q3's module** — rejected: each module's projection rules count exactly one `SELECT 1`; a
  sibling module with its own named rules keeps each count exact.
- **Skip a notice already seen in the console, or whose request moved on** — rejected by BigDev (Q-2 B: *"what if office had a glanca
  only? I think option (b) is better"*).
- **A per-officer opt-out** (Q-3 B) — not built: it narrows a ruled channel and would be the Panel's.
- **Hold "no longer needed" emails to a daily send** (Q-5 B) — not taken; the arrival-time residual is recorded in `-463`.
- **Backfill every notice ever written on the day the provider is configured** — rejected: the cutoff bounds the backlog (the Q-2 rule's
  exception).

## Consequences

- **Security.** One more caller of an existing single-column read; one more existence test against `admin_credentials` and a grant match
  for a known `user_id`. ⛔ No identity column is projected by Q4; the address is decrypted only in the child, with ⛔ no KMS audit line
  (as every jobs decrypt — ADR-0040). The email names no one; the mail provider learns that a move-request event happened in a Pariwar (the
  Pariwar id is in the link), as 6.25's and 11b.4a's emails already disclose of theirs.
- **Operational.** Rides ADR-0040's provisioning (roster Row 24). An email outage, or a stopped sweep, of 3+ IST days loses those notices'
  emails by design; the held run's alarm is the signal; the console keeps every notice. Go-live (Row 51 (c), SENDING) also needs Row 26
  closed with this sweep's steps in its list and Row 24 (b) extended to Q4.
- **Migration / pivot.** A fifth identity read path, a fourth Q2 caller, or a move to `twt_auth`, is a new ADR.

## References

- [Source: `.decision-log.md`, Decisions 2026-11-03-443 Q1 A, 2026-11-08-458 AD1 / AD9, 2026-11-08-459 Q3 A, 2026-11-10-461, 2026-11-10-462, 2026-11-12-463, 2026-09-28-262 FQ3 A, 2026-10-18-358]
- [Source: `docs/adr/ADR-0040-staff-email-transport.md`] — the amended amendment; Q1 / Q2
- [Source: `docs/adr/ADR-0043-memorial-takedown-approver-email.md`] — Q3; the second Q2 caller; this ADR's form
- [Source: `docs/adr/ADR-0009-admin-authentication.md` §5] — the original clause
- [Source: `_bmad-output/implementation-artifacts/13-1g-field-worker-move-notices-by-email.md`] — owning Story (AD1-AD13)
- [Source: `docs/launch-gate-inventory/inventory-roster.md`, Rows 24, 26, 51 (e)] — the go-live gates
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-11-12 | (initial draft) | BigDev (Solo Builder) | Authored under Story 13.1g (Decision `2026-11-12-463`). |
