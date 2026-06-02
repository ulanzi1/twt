# Divergence Log — P0-2c VI/Low-Vision Member Accessibility Validation

> **Append-only.** Captures any divergence between synthesis findings and pre-stated PRD/UX/architecture accessibility assumptions per `assumption-inventory.md` + any UX-DR clause verdict requiring revision per `ux-dr-clause-evaluation-worksheet.md`.
>
> Per [[feedback_gap_analysis_observational]]: this log is **observational** — it captures incompleteness/risk and proposes conditional escalation paths via `reconciliation_action_plan`. It does NOT directly prescribe sprint planning or override architecture. **One hard prescriptive boundary:** findings classified `wcag-aa-defect-must-fix` per NFR-20 CANNOT be classified as `deferred-to-nfr-22-phase-2-audit` — they MUST reconcile via spec-update or design-adjustment.

## Schema columns

| Column | Type / Allowed Values |
|---|---|
| `divergence_id` | slug (e.g., `D-001`, `D-002`, …) |
| `assumption_id_or_ux_dr_clause_id` | row from `assumption-inventory.md` (e.g., `A-ux-dr66-same-product`) OR clause row from `ux-dr-clause-evaluation-worksheet.md` (e.g., `ux-dr67-color-independence-my-pool`) |
| `divergence_observation` | paraphrased from synthesis + per-session citations; verbatim only if re-consent-confirmed per ethics-protocol §2-bis |
| `divergence_severity` | enum — see severity enum below |
| `accessibility_debt_classification` | enum per `ux-dr-clause-evaluation-worksheet.md` §1 taxonomy |
| `affected_epic_stories` | list of Epic/Story tags (e.g., `Epic-3-Story-3.2`, `Epic-8-Story-8.4`, `Story-7.10`, `cross-cutting`, `UX-DR67-specific`) |
| `reconciliation_status_epic3` | per-Epic reconciliation status (per Story 0.9 P-22 precedent) |
| `reconciliation_status_epic8` | per-Epic reconciliation status |
| `reconciliation_status_story_7_10` | per-Story reconciliation status |
| `reconciliation_status` | aggregate; terminal when all per-Epic fields terminal |
| `reconciliation_action_plan` | what specifically must happen — UX-DR66/67/68 epics update / UX spec §13 amendment / architecture amendment / Story design re-scope / explicit deferral / NFR-22 Phase-2 audit deferral |
| `reconciliation_owner` | Solo Builder / BigDev / Trustee Panel / UX authority / named other |
| `reconciliation_date` | when the action closes |
| `cross-link_to_owning_change` | `.decision-log.md` entry or spec patch link that closes the divergence |

## Severity enum

| Value | Meaning |
|---|---|
| `factual-contradiction` | Assumption is wrong; design must adjust |
| `nuance` | Assumption is partially right with qualifications |
| `extension` | Assumption is right but lived data adds new dimension |
| `ux-dr-clause-revision-required` | UX-DR66/67/68 acceptance criteria require revision per the AC's load-bearing reconciliation path |
| `nfr-20-wcag-aa-defect-launch-blocker` | Finding is a WCAG AA defect on member-app primary flow per NFR-20 — gates Epic 3 + Epic 8 substrate work absolutely; CANNOT defer |
| `accessibility-debt-tracked-and-fix` | Finding is UX-DR68 debt; must close before NFR-22 Phase-2 audit; does NOT gate Epic 3 + Epic 8 substrate work absolutely |

## Per-Epic reconciliation status enum (per Story 0.9 P-22 precedent)

| Value | Meaning |
|---|---|
| `pending-resolution` | Divergence open; affected-Epic design freeze cannot proceed |
| `reconciled-via-spec-update` | UX-DR / PRD / UX-spec patch applied; design freeze unblocked for this Epic |
| `reconciled-via-design-adjustment` | Story-level design adjustment captured in affected Story's Dev Notes |
| `explicitly-deferred-with-rationale` | Deferred with rationale in `_bmad-output/implementation-artifacts/deferred-work.md`; time-bounded re-evaluation trigger stated |
| `deferred-to-nfr-22-phase-2-audit` | Per Story 0.9 P-08 precedent — ONLY permitted for `accessibility-debt-tracked-and-fix` or `participant-class-extension-needed-for-coverage`; NEVER for `wcag-aa-defect-must-fix` |
| `not-applicable-to-this-epic` | Divergence does not affect this Epic |

## Permitted pre-staging (per Story 0.8 + Story 0.9 review-patch precedent)

**Objective criterion:** rows with `divergence_observation = "_AWAITING_SESSION_CONDUCT_"` are permitted for critical hypotheses identified ahead of time as likely-to-trigger-divergence. At author-commit (Task 5), the file carries only the schema header + empty rows. Pre-staging is NOT applied at Task 5 author-commit.

## Forbidden states

1. **Synthesis row that contradicts a PRD/UX/architecture assumption but the divergence is silently absorbed into the synthesis without a log entry** is forbidden. Every refuted-or-nuanced assumption MUST have a corresponding divergence-log row.
2. **`wcag-aa-defect-must-fix` AND `reconciliation_status = deferred-to-nfr-22-phase-2-audit`** simultaneously is forbidden — NFR-20 is a hard launch-blocker; CANNOT defer.
3. **Synthesis Section §4 UX-DR clause-evaluation row with `verdict ∈ {requires-revision-with-proposed-clause, requires-deeper-redesign}` AND no corresponding divergence-log row** is forbidden — the AC's load-bearing reconciliation path requires the divergence-log row to route the revision to epics + UX spec §13 patches.

## Minimum-content requirements (P-17 review-patch)

- **`reconciliation_action_plan` for `requires-revision-with-proposed-clause`:** must contain the specific proposed clause text (Hindi + English paraphrase) + which UX-DR and Epic/Story the revision targets.
- **`reconciliation_action_plan` for `requires-deeper-redesign`:** must contain at minimum: (a) which Epic/Story is affected + what specifically must be re-thought (not merely "redesign needed"), (b) whether a participant-class extension (Story 0.10-bis or NFR-22 Phase-2) is required to validate the redesign, (c) proposed reconciliation owner.

## Cross-cutting design-freeze discharge rule (P-33 review-patch)

If a `wcag-aa-defect-must-fix` divergence has `affected_epic_stories` spanning both Epic 3 and Epic 8 (cross-cutting), reconciliation must reach terminal `reconciliation_status` for the affected Epic **before whichever Epic design freeze comes first**. Both per-Epic status fields must individually reach a terminal value — aggregate `reconciliation_status` cannot be marked terminal while any per-Epic field remains `pending-resolution`. Discharge timing: "before whichever design freeze comes first" per README §4 invariant 15.

## Carve-outs

### Task 5 author-commit carve-out (per Story 0.9 P-06)

At Task 5 author-commit, the file carries **only the schema header + empty rows** (the schema columns + severity enum + per-Epic reconciliation status enum + permitted-pre-staging objective criterion + forbidden states + this carve-out). NO divergence rows are pre-populated. Task 9 synthesis populates divergence rows from synthesis findings + UX-DR clause-evaluation worksheet verdicts.

### Post-Task-11 new-divergence-path carve-out (per Story 0.9 P-06)

After Task 11 reconciliation, new divergences may emerge if downstream Epic 3 / Epic 8 / Story 7.10 design-freeze conversations surface gaps not anticipated in this Story's synthesis. New divergences are appended to this log with `divergence_id = D-N` where N is incremental + the `divergence_observation` cites the downstream conversation date + cross-link.

---

## Divergence rows

*(Empty at Task 5 author-commit. Task 9 synthesis populates rows from synthesis findings + UX-DR clause-evaluation worksheet verdicts. Task 11 closes `reconciliation_status` per row.)*

| divergence_id | assumption_id_or_ux_dr_clause_id | divergence_observation | divergence_severity | accessibility_debt_classification | affected_epic_stories | reconciliation_status_epic3 | reconciliation_status_epic8 | reconciliation_status_story_7_10 | reconciliation_status | reconciliation_action_plan | reconciliation_owner | reconciliation_date | cross-link_to_owning_change |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| *(empty — pending Task 9)* | | | | | | | | | | | | | |
