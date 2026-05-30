# Engineer Roster — Backup Engineer

> **Status:** drafted (template row at `pending-trustee-selection` — no named engineer yet; populated at Story 0.6 Task 10 contract-signature event)
> **Owner role:** Trustee Panel (selection + ratification per Story 0.6 Task 8 + Task 10); Solo Builder (technical-fit assessment per Launch Gate Risks row); Backup Engineer (subject; engineer does NOT self-modify per scope-of-work §5 exclusion 8)
> **Architectural authority:** PRD §9.1.1 paragraph 6 + A-13; architecture §5.10; architecture §3078-3082 (Secondary IAM-admin role to ≥3 principals supports multi-engineer property); AR-67; Story 0.6 epics.md (lines 785-801)

## Schema discipline + forbidden-removal rule

This roster is **append-only**. Rows are never deleted; termination flips the `status` column to `terminated` + supersession-marker entry recorded in `backup-engineer-ledger.md`. The forbidden-removal rule inherits from Story 0.2 + 0.3 + 0.5 patterns + `README.md` §4 invariant 5.

**Identity-field need-to-know discipline:** the `name`, `firm_affiliation`, `contact_primary`, `contact_secondary` columns are sensitive per legal counsel's NDA guidance per `contract-template.md` §6. The repo (including Story 0.3 mirror) is trustee-accessible but NOT public. Public-mirror context (if ever provisioned) would redact identity fields per operations-policy (`README.md` §8 deferred-ADR slot 8). At v1 the mirror destination is trustee-controlled (not public); identity-field redaction is not yet operationally required but the property is committed for future-proofing.

**Multi-engineer support:** the architecture (§3078-3082) permits ≥3-principal IAM grant (Solo Builder + backup engineer + one trustee with engineering capability — and additional backup engineers are supported by the same property). At v1, the trust contracts one per A-13; the roster schema supports appended rows for additional engineers at v2+. Concurrent-access conflict resolution is deferred per `README.md` §8 deferred-ADR slot 6.

## Roster

| engineer_id | name | firm_affiliation | contact_primary | contact_secondary | nda_signature_status | contract_signature_status | iam_grant_status | onboarding_status | last_quarterly_review_date | last_surge_engagement_date | last_activation_event_date | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `be-1` (template) | `<engineer name — populated at Task 10>` | `<independent contractor | firm | consultancy — populated at Task 10>` | `<primary contact channel — populated at Task 10>` | `<secondary contact channel — populated at Task 10>` | `unsigned` (flips to `signed` + signature date + legal-counsel-files reference at Task 10) | `unsigned` (flips to `signed` + signature date + contract git SHA at Task 10) | `not-provisioned` (flips to `provisioned` + grant date + GCP project list per `access-grant-procedure.md` §2 at Task 10) | `not-started` (flips to `in-progress` at Task 11 session start; `completed` + completion date + comprehension-score at Task 11 closure) | `<YYYY-MM-DD>` (populated post-first-quarterly-review per `README.md` §6) | `<YYYY-MM-DD>` (populated post-first-surge-event per `activation-procedure.md` §2.2) | `<YYYY-MM-DD>` (populated post-first-activation-event per `activation-procedure.md` §2.3 / §2.4 / §2.5) | `pending-trustee-selection` |

## Status value lifecycle

| Status | When | Transition to |
|---|---|---|
| `pending-trustee-selection` | Initial template state | `contracted-not-onboarded` (post-Task 10 contract signature) |
| `contracted-not-onboarded` | Post-contract-signature, pre-onboarding | `active` (post-Task 11 onboarding completion + comprehension threshold met) |
| `active` | Post-onboarding; daily-ops engagement mode | `surge-engaged` (during surge events) / `bus-factor-activated` (during bus-factor) / `terminated` |
| `surge-engaged` | During surge engagement per `activation-procedure.md` §2.2 | `active` (post-surge closure) |
| `bus-factor-activated` | During bus-factor activation per `activation-procedure.md` §2.3 | `active` (post-deactivation per trustee chair entry in `.decision-log.md`) |
| `terminated` | Post-termination per contract §10 trigger | _(terminal state; row never deleted; supersession-marker entry recorded in ledger)_ |

## Per-engineer additions

When a new backup engineer is contracted (at v2+ multi-engineer support), Trustee Panel adds a new row with `engineer_id` sequentially (`be-2`, `be-3`, etc.). Each addition requires:

- ≥2-trustee ratification per `README.md` §5 sign-off lifecycle (parallel to A-13 retainer authorization per Story 0.6 Task 8; subsequent engineers may use the pack-as-a-unit OR per-component mode depending on whether their contract terms differ materially from the original);
- New `.decision-log.md` `[CONTINUITY]` entry referencing Decision 2026-05-30-006 (or supersession);
- IAM grant provisioning per `access-grant-procedure.md` §2;
- Onboarding session per `onboarding-checklist.md` (including comprehension administration per Story 0.5 Task 9 cycle);
- Activation-scenario test per `activation-procedure.md` §2.4 (discharges that engineer's Story 0.1 AC-4 path 1 equivalent if applicable).

## Per-engineer terminations

When an engineer's engagement terminates per contract §10:

1. Trustee Panel records termination authorization in `.decision-log.md` `[CONTINUITY]` entry citing: termination type (per contract §10 trigger taxonomy); effective date; access-scope-to-revoke; succession plan (alternate engineer? scope reduced to remaining engineers?).
2. `engineer-roster.md` row status flipped to `terminated`; columns `nda_signature_status` + `contract_signature_status` retain their historical values for audit purposes; `iam_grant_status` flipped to `revoked` with revocation date.
3. Supersession-marker entry recorded in `backup-engineer-ledger.md` "Contract-renewal log" + "Activation event log" citing the termination event.
4. IAM revocation executed per `access-grant-procedure.md` §3.
5. Row is **never deleted** per the forbidden-removal rule.

## Per-engineer renewal

Annual renewal per contract §5 + `backup-engineer-ledger.md` "Contract-renewal log":

- **Renewal proceeds:** no roster row change; renewal event logged in ledger.
- **Renewal re-negotiates retainer / scope:** roster row Notes column appended with renewal-event reference; specific retainer amount + scope-of-work amendments per the contract amendment process.
- **Renewal declines (engineer):** roster row status flipped to `terminated` at notice-period end per §3 above; alternate-engineer process per `README.md` §8 deferred-ADR slot 5 triggered.
- **Renewal declines (trust):** parallel to engineer-decline; 60-day notice; alternate-engineer process per `README.md` §8 deferred-ADR slot 5.

## Cross-references

- `README.md` §4 invariant 5 (forbidden-removal rule on roster rows)
- `README.md` §8 deferred-ADR slot 5 (alternate-engineer-on-contract-renewal-decline procedure)
- `README.md` §8 deferred-ADR slot 6 (multi-engineer concurrent-access conflict resolution)
- `README.md` §8 deferred-ADR slot 8 (engineer-identity-field redaction for public-mirror contexts)
- `contract-template.md` §1 Parties + §12 Signatures — informs identity-field populating at Task 10
- `scope-of-work.md` §5 exclusion 8 (Engineer does NOT self-modify own contract or IAM grants) — informs roster modification authority (trustee + Solo Builder, never the Engineer)
- `access-grant-procedure.md` §2 + §3 + §4 — informs `iam_grant_status` column transitions
- `onboarding-checklist.md` §4 verification checks — informs `onboarding_status` column transitions
- `activation-procedure.md` §2 — informs `last_*` date columns + status transitions
- `backup-engineer-ledger.md` "Trustee A-13 authorization log" + "Contract-signature log" + "Onboarding session log" + per-event logs + "Contract-renewal log" — primary records of events that update roster rows
- `../../.decision-log.md` — Decision 006 + per-event `[CONTINUITY]` entries per the supersession schema

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-30 | n/a (pre-git at author-commit) | Solo Builder (BigDev) via dev-story agent | initial author-commit (template row at `pending-trustee-selection`) | yes (≥2 trustees per Task 8) | `backup-engineer-ledger.md` Framework-commit record row |
