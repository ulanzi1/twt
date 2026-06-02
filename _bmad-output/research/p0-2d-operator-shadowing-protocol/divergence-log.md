# Divergence Log — P0-2d Operator Shadowing

> **Append-only log of synthesis findings that contradict, nuance, extend, or trigger revision of pre-stated PRD/UX/architecture assumptions OR operator-workflow-call-pattern observation worksheet patterns.**
>
> Per [[feedback_gap_analysis_observational]]: the divergence-log is **observational**. It captures incompleteness and proposes conditional escalation paths via `reconciliation_action_plan`. It does NOT directly prescribe sprint planning or override architecture — Task 11 reconciliation is the discharge mechanism.
>
> At Task 5 author-commit, this log carries the schema header + empty rows. Task 9 populates per divergence.

## Severity enum (10 values)

### P0-2d-distinct severity values (7)

| Value | Meaning |
|---|---|
| `routing-policy-revision-required` | Routing-policy category enumeration finding (Cat-1) requires Story 10.1 amendment |
| `sla-target-revision-required` | SLA-target enumeration finding (Cat-2) requires Story 10.1 amendment |
| `helpline-call-to-ticket-flow-revision-required` | Helpline call-to-ticket workflow finding (Cat-3) requires Story 10.3 amendment |
| `helpline-mediated-claim-filing-revision-required` | Member-lookup / read-back / operator-attribution / supervisor-escalation finding (Cat-4/5) requires Story 6.3 amendment |
| `verifier-console-context-from-helpline-revision-required` | Verifier-console-context flow finding (Cat-8) requires Story 6.10 amendment |
| `ux-dr55-operator-facing-register-revision-required` | UX-DR55 operator-facing register finding (Cat-6) requires UX-DR55 amendment |
| `intake-console-pattern-b-decision-strip-revision-required` | Intake-Console-pattern-(b) decision-strip finding (Cat-7) requires UX spec §10 amendment |

### Standard severity values (3)

| Value | Meaning |
|---|---|
| `factual-contradiction` | Synthesis row contradicts assumption text factually |
| `nuance` | Synthesis row qualifies assumption (partially right) |
| `extension` | Synthesis row extends assumption beyond pre-stated scope |

## Reconciliation-status enum

| Value | Meaning |
|---|---|
| `pending-resolution` | Divergence captured at Task 9; reconciliation pending at Task 11 |
| `reconciled-via-spec-update` | PRD / UX / architecture spec amended per divergence (Task 11) |
| `reconciled-via-design-adjustment` | Story-level design adjustment captured in Story Dev Notes (Task 11) |
| `explicitly-deferred-with-rationale` | Deferred to deferred-work.md with time-bound rationale (Task 11) |
| `cross-cutting-pending-multi-story-resolution` | Affects multiple downstream Stories; reconciliation pending coordinated resolution |

## Per-Epic reconciliation_status columns (Story 0.10 precedent)

Each divergence-log row carries per-Epic reconciliation_status columns to track multi-Epic affects:

- `epic_10_reconciliation_status`
- `story_6_3_reconciliation_status`
- `story_6_10_reconciliation_status`
- `ux_dr_amendment_status`

Each per-Epic column carries one of these values:

| Value | Meaning |
|---|---|
| `not-affected` | This Epic/Story is not affected by this divergence |
| `pending-resolution` | Divergence affects this Epic/Story; reconciliation pending at Task 11 |
| `reconciled` | This Epic/Story's reconciliation is closed |
| `explicitly-deferred-with-rationale` | Deferred to deferred-work.md per Task 11 |

For rows with top-level `reconciliation_status: cross-cutting-pending-multi-story-resolution`, each affected per-Epic column holds `pending-resolution` independently until that Epic's own reconciliation closes.

## Permitted pre-staging (Story 0.10 precedent)

At Task 5 author-commit, the divergence-log has only the schema header + empty rows. Task 9 populates per divergence. **Pre-staging individual divergence rows at Task 5 is permitted ONLY for divergence patterns the framework explicitly forecasts** (e.g., a permitted-pre-staging cover-page note describing "we expect divergence in category Cat-1 routing-policy if observed call distribution skews differently from the candidate enumeration"). The Task 5 framework author-commit does NOT pre-stage specific divergence rows — only the empty schema.

## Task-5 carve-out

At Task 5 author-commit, the only entries in this log are:
- Schema header (this file's structure)
- Severity enum
- Reconciliation-status enum
- Forbidden states list
- Empty rows table (no actual divergence rows)

## Post-Task-11 carve-out

After Task 11 reconciliation, divergence rows carry terminal `reconciliation_status`. The log remains append-only — supersession schema applies if a reconciled divergence is later re-opened (e.g., NFR-22 Phase-2 audit surfaces a new dimension to a previously-reconciled divergence).

## Forbidden states

1. **Synthesis row that contradicts a PRD/UX/architecture assumption but the divergence is silently absorbed into the synthesis without a log entry.**
2. **Worksheet verdict `requires-revision-with-proposed-change` or `requires-deeper-redesign` without a corresponding divergence-log row** (populate `divergence_log_row_id` in the worksheet verdict matrix immediately — `divergence_log_row_id` is a foreign-key reference to the `divergence_id` column in the Divergence rows table below).
3. **Divergence row with terminal `reconciliation_status` BUT affected Epic/Story design freeze has not actually closed the reconciliation** (rare; flagged in post-synthesis trustee review).

---

## Divergence rows (append-only; populated at Task 9)

| divergence_id | supersedes | assumption_id_or_pattern_id | divergence_observation | divergence_severity | affected_epic_stories | epic_10_reconciliation_status | story_6_3_reconciliation_status | story_6_10_reconciliation_status | ux_dr_amendment_status | reconciliation_status | reconciliation_action_plan | reconciliation_owner | reconciliation_date | cross_link_to_owning_change |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| _(no rows at Task 5 author-commit; Task 9 populates from lived shadowing)_ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |

## Supersession schema

If a previously-recorded divergence is later revised (e.g., re-consent-fallback-timeout removes a quote that grounded the divergence), the original row is preserved + a new row is appended with `supersedes: <original_divergence_id>` field. The supersession schema applies; rows are append-only.
