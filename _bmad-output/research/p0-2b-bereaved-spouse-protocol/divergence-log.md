# Divergence Log — P0-2b Bereaved-Spouse Conversation

**Authority:** Story 0.9 AC-1 + AC-2 divergence-log discipline · README.md §4 invariant 10 forbidden-suppression rule · assumption-inventory.md (gap-detection instrument) · pattern-4-evaluation-worksheet.md (Pattern 4 verdict instrument) · synthesis-schema.md §5 + §11 cross-link · [[feedback_gap_analysis_observational]] (observational gap-detection instrument)

**Scope:** Observational log of divergences between synthesis findings and PRD/UX assumptions + Pattern 4 sample-copy verdicts requiring revision. Append-only; supersession-schema applies for re-evaluation. Permitted pre-staging at author-commit per Story 0.8 review-patch precedent (objective criterion: `divergence_observation = "_AWAITING_CONVERSATION_CONDUCT_"`).

**Population lifecycle:**
- Author-commit (Task 5): scaffolded with schema header + empty rows + permitted-pre-staging objective criterion.
- Task 9 (synthesis-author-commit): rows appended from synthesis-divergence observations + Pattern 4 evaluation worksheet verdicts requiring revision.
- Task 11 (reconciliation): `reconciliation_status` updated per row + `cross-link_to_owning_change` populated.

---

## Schema header

Each divergence row carries the following columns:

| Column | Type | Purpose | Allowed values / notes |
|---|---|---|---|
| `divergence_id` | slug | Unique row identifier | E.g., `div-001`, `div-pattern4-bank-statement-001` |
| `assumption_id_or_pattern4_sample_id` | slug | Cross-reference to assumption-inventory row OR pattern-4-evaluation-worksheet row | E.g., `A-grief-fursat-cadence` OR `pattern4-bank-statement-format-unrecognized` |
| `divergence_observation` | text | Paraphrased divergence observation from synthesis + per-interview citations | Verbatim quotes only via re-consent rule per ethics-protocol §2-bis with `[quote-re-confirmed YYYY-MM-DD]` marker |
| `divergence_severity` | enum | Severity classification | `factual-contradiction` (assumption is wrong) / `nuance` (assumption is partially right with qualifications) / `extension` (assumption is right but lived data adds new dimension) / `pattern4-copy-revision-required` (UX spec §12 Pattern 4 sample copy requires revision) |
| `affected_epic_stories` | text | Which Epic stories the divergence affects | E.g., `Epic 6 Story 6.2`, `Epic 9 Story 9.1`, `Epic 11b Story 11b.5`, `cross-cutting`, `UX-DR55 sample-copy`, `architecture §1.5` |
| `reconciliation_status` | enum | Reconciliation lifecycle status | `pending-resolution` (at synthesis-commit) / `reconciled-via-spec-update` / `reconciled-via-design-adjustment` / `explicitly-deferred-with-rationale` (per [[feedback_closure_language_precision]]) |
| `reconciliation_action_plan` | text | What specifically must happen to reconcile | E.g., "UX spec §12 Pattern 4 Sample 5 copy revised to <proposed copy>"; "PRD §UJ-3 amended to acknowledge spouse-may-not-be-primary-spokesperson"; "Story 6.12 Human Shepherd Assignment design revised to surface shepherd identity earlier"; "Explicit deferral with rationale: Pattern 4 sample-copy validation deferred to future research surface per spouse non-engagement" |
| `reconciliation_owner` | text | Who closes the reconciliation | E.g., `Solo Builder`, `BigDev`, `Trustee Panel`, `UX authority + Solo Builder`, `Legal Counsel + Trustee Panel` |
| `reconciliation_date` | YYYY-MM-DD | When the reconciliation action closes | Populated at Task 11 closure |
| `cross-link_to_owning_change` | path or URL | The `.decision-log.md` entry, spec patch, or supersession entry that closes the divergence | E.g., `.decision-log.md Decision 2026-06-20-009-reconciliation-001` / `_bmad-output/planning-artifacts/ux-design-specification.md commit hash abcd1234` / `_bmad-output/implementation-artifacts/deferred-work.md row N` |

---

## Permitted pre-staging at author-commit (per Story 0.8 review-patch precedent)

**Objective criterion** (inherited from Story 0.8 review patch — `divergence-log.md "Forbidden states"` review finding):

Framework-author-time may pre-stage rows for critical hypotheses identified as likely-to-trigger-divergence WITH the objective criterion:
- `divergence_observation = "_AWAITING_CONVERSATION_CONDUCT_"`
- `reconciliation_status = "pending-conversation"`

Pre-staging is permitted ONLY for rows that:
1. Have `assumption_id_or_pattern4_sample_id` populated with a real reference.
2. Have `divergence_observation` set to the literal string `"_AWAITING_CONVERSATION_CONDUCT_"` (objective criterion — not subjective "clearly signals").
3. Have all other fields empty pending Task 9 population.

The pre-staging is structural permission to commit row IDs that will receive substantive content at Task 9; it is NOT a commitment that the divergence will occur (validation may show the assumption is validated, in which case the pre-staged row is removed at Task 9 with a supersession entry).

---

## Forbidden states

- **Synthesis row that contradicts PRD/UX assumption but the divergence is silently absorbed into the synthesis without log entry.** Every refuted-or-nuanced assumption per assumption-inventory MUST produce a divergence-log row.
- **Pattern 4 sample-copy verdict requiring revision (`requires-revision-with-proposed-copy` OR `requires-deeper-redesign`) without divergence-log row.** Every such verdict MUST produce a divergence-log row with severity `pattern4-copy-revision-required`.
- **Divergence row appended at any stage other than Task 9** — Task 11 reconciliation only updates existing rows; new divergence rows after Task 11 require a synthesis revision cycle per ethics-protocol §5 + synthesis Pack-revision log.
- **Reconciliation row with `reconciliation_status = pending-resolution` past the affected Epic's design-freeze date** — gates the design freeze per AC-2; must be terminal (`reconciled-via-spec-update`, `reconciled-via-design-adjustment`, or `explicitly-deferred-with-rationale`).

**Exception (permitted pre-staging):** See above — pre-staged rows with `divergence_observation = "_AWAITING_CONVERSATION_CONDUCT_"` are permitted at Task 5 author-commit; these are NOT forbidden states.

---

## Supersession schema

If a divergence row is re-evaluated (e.g., spouse withdraws a quote that supported the divergence per ethics-protocol §2-bis granular-withdrawal; or assumption-inventory row is amended in a future research refresh; or Pattern 4 sample-copy is updated upstream invalidating the spouse's verdict context):

- The original divergence row is NOT modified in place.
- A new divergence row is appended with `divergence_id` incrementing + `cross-link_to_owning_change` pointing to the original row's supersession entry.
- The original row's `reconciliation_status` is updated to `superseded-by-div-NNN` with the supersession row reference.

---

## Joint-discharge anchor

Divergence-log closure (every Epic-6-affecting + Epic-9-affecting + Epic-11b-affecting + cross-cutting row has terminal reconciliation_status) is a *necessary but not sufficient* condition for AC-2 closure. AC-2 also requires:
- Every Pattern 4 verdict requiring revision integrated into UX spec §12 (per pattern-4-evaluation-worksheet.md §5 revision-integration handoff)
- Epic 6 + Epic 9 + Epic 11b design-freeze conversations closed with substrate-work-may-begin attestation

Per AC-2 full closure semantics (Story 0.9 file), AC-2 fully closes when (a)-(e) listed conditions are all met.

Joint-discharge per README §10: Story 0.9 closure contributes the P0-2b leg of the four-leg P0-2 discharge; full P0-2 launch-gate property (UX-DR5 + AR-49 P0-2 row) discharges only when all four legs close.

---

## Divergence rows (empty at author-commit; populated at Task 9)

(Empty table — schema documented above; rows are appended at Task 9 synthesis-author-commit per synthesis-divergence observations + Pattern 4 evaluation verdicts requiring revision.)

| divergence_id | assumption_id_or_pattern4_sample_id | divergence_observation | divergence_severity | affected_epic_stories | reconciliation_status | reconciliation_action_plan | reconciliation_owner | reconciliation_date | cross-link_to_owning_change |
|---|---|---|---|---|---|---|---|---|---|
| (none at author-commit) | | | | | | | | | |
