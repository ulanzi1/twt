# ADR-0043: The memorial take-down approver email — a second caller of ADR-0040's Q2 and one new identity read (Q3), amending ADR-0040's amendment of ADR-0009 §5

> **Status:** drafted
> **Date:** 2026-10-27 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** —
> **Supersedes:** — (⛔ not a whole-ADR supersession: this ADR AMENDS ADR-0040's amendment in its body — the ADR-0004 / ADR-0040 in-body form; ADR-0040 stays `ratified`)
> **Superseded by:** —

## Context

- **The ruling.** [`-392`](../../.decision-log.md#decision-2026-10-23-392) item 5 (Trustee-ratified, kept by
  [`-395`](../../.decision-log.md#decision-2026-10-23-395)): *"An email is sent to the approver — the person who approved the memorial
  (the decision's recorded actor)."* [`-411`](../../.decision-log.md#decision-2026-10-27-411) item 5 (PC3 A, Trustee-ratified): an
  approver who has left is ⛔ not emailed and ⛔ no one else is told in their place. Story 11b.4a builds it; its build decisions are
  [`-412`](../../.decision-log.md#decision-2026-10-27-412) — MP10 (b): every distinct approver of every approved version the take-down
  withdrew (our reading of the singular "the approver"); MP11: 6.25's `no_target` rule, ⛔ no substitute recipient.
- **The approver is a staff user.** `memorial_review_decisions.actor_id` holds a `users.id` (the reviewer, `memorial.review`). The address
  lives only in `admin_credentials.email_ciphertext` (Tier-1, ⛔ never plaintext).
- **ADR-0040 admits exactly two identity read paths** outside the apps/api auth repo — Q1 (`staffEmailRecipientsSql`, the Pariwar Admin
  recipients of a refused claim) and Q2 (`readAdminEmailCiphertext`, *"called only by the staff-email child"*) — and closes the set:
  *"⛔ No other new path is admitted; a third is a new ADR."* The take-down email needs (i) a second caller of Q2 and (ii) a different
  eligibility read — the approver is ⛔ not selected by a role grant (they are told of their own approval, whatever their role today),
  so Q1 does ⛔ not fit. ⇒ this ADR.
- **The fence.** `apps/jobs/tests/staff-email-identity-read-fence.test.ts` enforces ADR-0040 with exact allow-lists (readers of
  `admin_credentials`, callers of `decryptAdminEmail`, users of the admin email's envelope context) and projection rules applied to Q1/Q2's
  module only. ⚠ Putting a new `SELECT 1 FROM admin_credentials` in that module trips its `projection:q1-count`; putting it in a new module
  escapes the projection rules unless the fence names that module.
- **Deadline:** none for the build (the memorial switch stays off); this ADR's ratification is roster **Row 41 (l)** — a go-live gate,
  ⛔ not a merge fence (the ADR-0040 precedent).

## Decision

**The take-down approver email is sent by a 6.25-shaped sweep in `apps/jobs` through the existing staff-email port (ADR-0040's
providers, config and failure classes, unchanged), and ADR-0040's amendment is AMENDED to admit exactly one more caller and one more
query site.**

> **Amendment — ADR-0043 (Story 11b.4a, `-412`, 2026-10-27) of ADR-0040's amendment of ADR-0009 §5, effective when this ADR is
> ratified:**
> - **Q2 — a second caller.** `readAdminEmailCiphertext(db, userId)` (unchanged: ONLY `email_ciphertext`, ONE `user_id`) may also be
>   called by the memorial take-down approver-email child, `apps/jobs/src/scheduler/memorial-takedown-approver-emails.ts`, AFTER its
>   claiming transaction commits; the decrypt happens in that child (`decryptAdminEmail`) and the plaintext exists only in its memory
>   until the provider call.
> - **Q3 — the approver eligibility fragment.** In `packages/domain/src/memorial/takedown-approver-email-read.ts`: for ONE `user_id`
>   already held (a `memorial_review_decisions.actor_id`), `users.status = 'active'` AND `EXISTS (SELECT 1 FROM admin_credentials …
>   WHERE user_id = that id)`. It projects ⛔ no identity column — only the `user_id` it was given. ⛔ No role is required. It runs
>   cross-tenant on the jobs service pool (the sweep's selector) and on a Pariwar-scoped `twt_app` transaction (the child's claiming
>   re-check) — the same two placements as Q1.
> - **The fence widens in the same commit as each new site**, every new allow-list entry citing ADR-0043: the Q3 module joins the
>   `admin_credentials` reader allow-list and the projection rules (exactly one `SELECT 1 FROM admin_credentials`; aliases unique to
>   Q3); the child joins the `decryptAdminEmail` caller allow-list; and the fence gains an exact allow-list of
>   `readAdminEmailCiphertext` callers (the 6.25 child and this child).
> Everything else in ADR-0040 stands unchanged. ⛔ No other new path is admitted; a fourth is a new ADR.

Load-bearing details:

- **Recipients** (`-412` MP10 (b)): the distinct `actor_id`s of the `approved` / `approved_with_omissions` decisions on every version
  the take-down withdrew (`memorial_withdrawals.takedown_request_id` = the request). Each is told only of an approval they made.
- **The outbox** `memorial_takedown_approver_emails` mirrors `claim_suspicion_staff_emails` (`0152`) — its states, grants and CHECKs
  unchanged, keyed on the take-down request: at most one row per (request, approver) and one request-level `no_target` row (MP11). A
  request holding any outbox row is ⛔ never due again.
- **The text** (approved, `-412` §3.6): plain text; ⛔ no family name, ⛔ no deceased's name, ⛔ no words — *"A family memorial you
  approved was taken down"* / *"… has been taken down by the helpline at the nominee's request. You do not need to do anything. To see
  which, open Memorial reviews in the Trust console."*
- **The DB role**: as ADR-0040 (F17) — the selector on the service login, the re-check and Q2 under `SET LOCAL ROLE twt_app`.

## Alternatives considered

- **Reuse Q1** — rejected: Q1 selects Pariwar Admins of a claim by role grant and refusal-chain freeze; the approver is selected by an
  act they did, in any role.
- **Put Q3 in `staff-email-identity-read.ts`** — rejected: the module's projection rules count exactly one `SELECT 1` (Q1); a second
  would need the rule rewritten for both. A sibling module with its own named rules keeps each count exact.
- **Email a fallback recipient when the approver has left** — rejected by the Panel (`-411` item 5, PC3 A).
- **Email only the approver of the shown version** (MP10 (a)) — rejected by BigDev (`-412` item 10).

## Consequences

- **Security.** One more caller of an existing single-column read; one more existence test against `admin_credentials` for a known
  `user_id`. ⛔ No identity column is projected by Q3; the address is decrypted only in the child, with ⛔ no KMS audit line (as every
  jobs decrypt — ADR-0040).
- **Operational.** Rides ADR-0040's provisioning (roster Row 24). An approver who has left gets ⛔ no email (MP11, `-411` item 5).
- **Migration / pivot.** A fourth identity read path, or a move to `twt_auth`, is a new ADR.

## References

- [Source: `.decision-log.md`, Decisions 2026-10-23-392 item 5, 2026-10-23-395, 2026-10-27-411 item 5, 2026-10-27-412 MP10 / MP11]
- [Source: `docs/adr/ADR-0040-staff-email-transport.md`] — the amended amendment; Q1 / Q2
- [Source: `docs/adr/ADR-0009-admin-authentication.md` §5] — the original clause
- [Source: `_bmad-output/implementation-artifacts/11b-4a-family-memorial-public-render.md`] — owning Story (MP10, MP11, AC9)
- [Source: `docs/launch-gate-inventory/inventory-roster.md`, Row 41 (l)] — the go-live gate
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-10-27 | (initial draft) | BigDev (Solo Builder) | Authored under Story 11b.4a (Decision `2026-10-27-412`). |
