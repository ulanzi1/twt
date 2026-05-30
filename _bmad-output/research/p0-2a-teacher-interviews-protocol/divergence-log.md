# Divergence Log — P0-2a Teacher Empathy Interviews

**Authority:** Story 0.8 AC-1 Task 5 + AC-2 + README §3 four-way property/protocol/policy/gap-analysis discipline + [[feedback_gap_analysis_observational]] (gap analysis is observational, not prescriptive) + [[feedback_closure_language_precision]].

**Purpose:** Observational gap-detection log. One row per PRD/UX assumption (per `assumption-inventory.md`) that the synthesis refutes or nuances. Append-only; supersession-schema applies for re-evaluation.

**Reconciliation gating:** Per AC-2, every Epic-3-affecting or Epic-8-affecting divergence row MUST have terminal `reconciliation_status` ∈ {`reconciled-via-spec-update`, `reconciled-via-design-adjustment`, `explicitly-deferred-with-rationale`} before the affected Epic's design freeze proceeds.

**Status at author-commit (2026-05-30, Task 5):** Schema header committed. Empty rows — divergence rows are appended at Task 9 (synthesis-author-commit) based on synthesis findings.

---

## Schema columns

| Column | Description |
|---|---|
| `divergence_id` | Slug (e.g., `D-chanda-not-unprompted`) |
| `assumption_id` | Cross-reference to `assumption-inventory.md` (e.g., `A-mm-chanda`) |
| `divergence_observation` | Verbatim or paraphrased from synthesis + per-interview citations (`Shikshakamitra-N §dimension-X`) |
| `divergence_severity` | `factual-contradiction` (assumption is wrong) \| `nuance` (assumption is partially right with qualifications) \| `extension` (assumption is right but lived data adds new dimension) |
| `affected_epic_stories` | Epic 3 Story 3.X / Epic 8 Story 8.X / cross-cutting / architecture §X.Y / UX-DR-N (list multiple if applicable) |
| `reconciliation_status` | `pending-resolution` (at synthesis-commit) \| `reconciled-via-spec-update` \| `reconciled-via-design-adjustment` \| `explicitly-deferred-with-rationale` (per [[feedback_closure_language_precision]]) |
| `reconciliation_action_plan` | What specifically must happen to reconcile (PRD amendment, UX spec amendment, architecture §X.Y adjustment, Story design re-scope, Trustee Panel ratification, or explicit deferral with rationale + time-bound) |
| `reconciliation_owner` | Solo Builder, BigDev, Trustee Panel, UX authority, named other |
| `reconciliation_date` | When the reconciliation action closes (populated at Task 11 closure) |
| `cross-link_to_owning_change` | The `.decision-log.md` entry or the spec patch SHA that closes the divergence |
| `notes` | Free-text annotations (e.g., supersession context, related divergences, downstream Epic-design-freeze impact) |

---

## Allowed-value legends

### `divergence_severity`

- **`factual-contradiction`** — The assumption claims X; lived data shows ¬X across multiple participants. The PRD/UX surface that depends on this assumption is structurally invalid as written. Reconciliation requires PRD/UX amendment.
- **`nuance`** — The assumption claims X; lived data shows X holds under conditions Y₁ but not under conditions Y₂. The PRD/UX surface is partially right; reconciliation requires PRD/UX qualification or per-Story design adjustment to address the failure conditions.
- **`extension`** — The assumption claims X; lived data shows X plus additional dimension W not anticipated. The PRD/UX surface is right but incomplete; reconciliation requires PRD/UX extension or per-Story design addition to address dimension W.

### `reconciliation_status`

- **`pending-resolution`** — Divergence row appended at synthesis-commit; reconciliation action plan proposed but not executed. This is the state at Task 9; transitions to terminal state at Task 11.
- **`reconciled-via-spec-update`** — PRD / UX spec / architecture document patched to incorporate the divergence finding; the patch closes the divergence. Cross-link to the patch + the `.decision-log.md` entry recording the change.
- **`reconciled-via-design-adjustment`** — A specific Story's design is adjusted (captured in the affected Story's Dev Notes) to accommodate the divergence, without requiring a top-level PRD/UX/architecture amendment. Cross-link to the affected Story file.
- **`explicitly-deferred-with-rationale`** — Per [[feedback_closure_language_precision]]: the divergence is acknowledged but the reconciliation is intentionally deferred to a future Story / Phase / ADR, with rationale recorded. Time-bound + re-evaluation trigger required. Cross-link to `_bmad-output/implementation-artifacts/deferred-work.md` entry.

### Permitted pre-staging (framework-author-commit only)

At Task 5 framework-author-commit, rows for critical hypotheses MAY be pre-staged with the following constraints:
- `divergence_observation` MUST be set to `_AWAITING_INTERVIEW_CONDUCT_` (the exact sentinel value, not free text).
- `reconciliation_status` MUST be `pending-resolution`.
- The row is explicitly labeled as a pre-staged placeholder, not a finding.
- No other columns are populated with substantive values at pre-stage time.

This permits the executor to pre-stage the critical-hypothesis checklist structure without asserting divergence findings that do not yet exist. All other divergence rows are appended at Task 9 only.

### Forbidden states

- `reconciliation_status` flipped to a terminal state without `cross-link_to_owning_change` populated — invalid; the cross-link is the discharge evidence.
- `reconciliation_status = explicitly-deferred-with-rationale` without `reconciliation_action_plan` containing the time-bound + re-evaluation trigger — violates closure-language-precision discipline.
- Divergence row deletion — FORBIDDEN; supersession-schema is the only allowed lifecycle exit.
- Divergence row appended at any stage other than Task 9 (synthesis-author-commit), except as per "Permitted pre-staging" above — invalid; all divergence rows derive from synthesis findings.

---

## Rows

### At Task 5 author-commit: empty

```
(No divergence rows committed at framework-author-commit. Rows are appended at Task 9 synthesis-author-commit per the synthesis findings.)
```

---

## Supersession schema

If a divergence row is later determined to be mis-stated (e.g., the synthesis observation is corrected after re-reading per-interview notes, OR a participant withdrawal removes the substantive observation, OR a Trustee Panel review revises the divergence-severity classification), the row is NOT edited in place. Instead:

1. The original row's `reconciliation_status` is updated to `superseded-by-D-<new-id>`.
2. A new row is appended with the corrected divergence_observation + fresh reconciliation_status.
3. `.decision-log.md` `[CONTINUITY]` entry records the supersession with rationale.

---

## Joint-discharge anchor (per README §10)

The divergence-log is the gap-detection instrument *specifically* for the P0-2a leg of UX-DR5 + AR-49 P0-2 joint-discharge. The Stories 0.9 (P0-2b) + 0.10 (P0-2c) + 0.11 (P0-2d) each maintain their own divergence-log per their respective protocol frameworks. Full UX-DR5 + AR-49 P0-2 discharge requires all four P0-2 a/b/c/d divergence-logs to have terminal reconciliation_status for all rows affecting their respective Epic design freezes.
