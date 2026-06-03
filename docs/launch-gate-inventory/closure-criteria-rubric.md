# Closure-Criteria Rubric

**Authority:** Story 0.15 AC-1 wording "closure criteria (objective, testable)" + AC-2 wording "evidence of closure is linked — the ADR, the test result, the signed-off runbook, etc." + architecture line 4773 disposition vocabulary (`closed` / `accepted risk` / `deferred per named criteria` / `reframed` — "binary closure is not required") + [[feedback_closure_language_precision]] three-state closure vocabulary (Closed by [edit] / Resolved via explicit deferral / Not addressed).

This rubric is consulted at every monthly review per `monthly-review-cadence-protocol.md` §2 agenda template — specifically the "open-row triage" item (assess whether `current_status = open` rows are closing toward objective evidence) and the "closure-event ratifications" item (verify per-row closure-evidence-link integrity for rows that flipped status since the previous review).

## §1 — Authority cites

- **AC-1 wording:** "closure criteria (objective, testable)" — every `inventory-roster.md` row carries a substantive `closure_criteria` field that satisfies this rubric.
- **AC-2 wording:** "An entry closes with linked closure evidence (the ADR, the test result, the signed-off runbook, etc.)" — every closure event populates `closure_evidence_link` per §2 vocabulary below.
- **Architecture line 4773 disposition vocabulary:** `closed` / `accepted risk` / `deferred per named criteria` / `reframed` — closure is non-binary; per-disposition closure-evidence requirements differ per §5 below.
- **[[feedback_closure_language_precision]]:** each row's closure is exactly one of three states — Closed by [edit] (concrete closure-evidence-link populated; status = `closed` / `accepted-risk` / `deferred-per-named-criteria` / `reframed` with rationale), Resolved via explicit deferral (status = `deferred-per-named-criteria` with predicate per architecture line 4773), or Not addressed (status remains `open` past target-date — triggers escalation per `escalation-protocol.md` §1).

## §2 — Objective evidence vocabulary

The following artifact types constitute **objective evidence** for `closure_evidence_link` population. An independent reviewer can verify each artifact's state without re-litigating the underlying analysis.

1. **`.decision-log.md` Decision entry** — `Decision YYYY-MM-DD-NNN` with substantive Decision body + author + date + ratifying trustees ≥2. Link format: `[Decision YYYY-MM-DD-NNN](../../.decision-log.md#decision-yyyy-mm-dd-nnn)` (path relative to `docs/launch-gate-inventory/`).
2. **ADR substantively populated at `docs/knowledge-transfer/adr-index.md`** — ADR-NNNN with `status = committed` + substantive ADR body (not `slot-reserved-pre-write`). Link format: `[ADR-NNNN](docs/knowledge-transfer/adr-index.md#adr-nnnn)`.
3. **Signed-off runbook in `docs/runbooks/`** — runbook with ≥2-trustee sign-off recorded in `.decision-log.md` per Story 0.1 sign-off pattern. Link format: `[<runbook-name>](docs/runbooks/<runbook-name>.md)` + cross-reference to sign-off Decision entry.
4. **Passing CI test result** — CI run with PR-link + test-name + commit-SHA + green-build outcome. Link format: GitHub Actions URL OR `<CI-system>/<run-id>` with PR + commit + test-name reference.
5. **Trustee-signed-off contract** — contract artifact (off-repo per Story 0.13 §14 storage discipline) with signature event recorded in `.decision-log.md` with signing date + signing trustees + signing counter-party. Link format: cross-reference to signature Decision entry; the contract artifact itself is off-repo.
6. **Ratified Decision supersession entry** — supersession marker on a prior Decision entry recording the substantive closure event (e.g., Decision 2026-05-30-006 framework-author-commit superseded by Decision 2026-05-30-006-amend-1 substantive engineer-onboarding event). Link format: cross-reference to both the original Decision and the supersession entry.
7. **Legal Counsel first-artifact return per Story 0.13 review-artifact-roster** — Legal Counsel return event with return-summary + return-substantive-changes-required + return-open-questions + return-next-review-cycle + integration-PR/commit-ref per Story 0.13 `per-artifact-return-roster.md` schema. Link format: `[<artifact-name>](docs/legal-counsel-engagement/per-artifact-return-roster.md#<artifact-id>)` + cross-reference to integration PR.
8. **Architecture row-flip via PR-2 architecture-edit** — architecture amendment PR with row label updated from `open` to `closed` + ADR cross-reference. Link format: PR-link + architecture line number + ADR cross-reference.
9. **`_bmad-output/research/<artifact>.md` substantively populated** — research artifact with substantive evidence body (not `<PENDING-EVIDENCE-CAPTURE>` placeholders). Per Stories 0.8-0.11 + Story 0.14 pattern. Link format: `[<artifact-name>](_bmad-output/research/<artifact>.md)` + cross-reference to discharging Decision.
10. **Operational-readiness-ledger entry with substantive closure** — `docs/runbooks/operational-readiness-ledger.md` section with substantive closure entry (not `<PENDING-TASK-N>` placeholder). Per Story 0.1 + 0.5 pattern. Link format: section anchor + cross-reference to discharging Decision.
11. **Off-repo artifact registry reference** — for artifacts that cannot be repo-committed (signed engagement letters; trust deed certificates; registration certificates) — `.decision-log.md` Decision entry with off-repo artifact registry path + custodian + retrieval procedure per Story 0.13 §14 + Story 0.2 escrow envelope cross-reference.

## §3 — Testable signal vocabulary

The following verifiable artifact-states are **testable signals** that an independent reviewer can check at any monthly review:

1. **File-existence + content-integrity** — e.g., `docs/native-stack-validation/measurement-template.md` §3 54-cell matrix has every cell populated (no `_PENDING-MEASUREMENT_` literal); `_bmad-output/research/p0-2c-vi-low-vision-accessibility.md` has substantive evidence body (no `<PENDING-EVIDENCE-CAPTURE>`). Verifiable via `grep` / file-read.
2. **CI-status** — passing/failing state of a named CI job for a named commit-SHA; verifiable via CI dashboard.
3. **State-field-value** — e.g., `inventory-roster.md` row `current_status = closed`; `docs/knowledge-transfer/adr-index.md` ADR-NNNN `status = committed`; verifiable via file-read.
4. **Signature-event-recorded** — per-row trustee acknowledgement in `.decision-log.md` with signing trustees + date + ratified-artifact-version; verifiable via Decision-log search.
5. **Cross-reference-integrity** — `closure_evidence_link` resolves to a real artifact at the documented location; the linked artifact is in its committed/ratified state per its own validation schema; verifiable via link-resolution + linked-artifact-state-check.

## §4 — Weak-closure-criteria rejection examples

The following closure-criteria formulations are **rejected** at every monthly review and any row carrying them is escalated per `escalation-protocol.md` §1:

1. **Solo Builder belief without artifact** — "I think the gate is closed" / "the work is substantially done" / "we're effectively closed on this" without cross-reference to one of §2 evidence types. Solo Builder belief is not evidence; evidence is an artifact.
2. **"The work is in progress" without milestone artifact** — `current_status = in-progress` is a transitional state, NOT a closure state. A row at `in-progress` is moving toward closure but has not closed; closure requires `current_status` flip to one of the architecture-allowed dispositions per architecture line 4773.
3. **Messaging-app discussion without `.decision-log.md` entry** — "discussed on Slack on 2026-MM-DD" / "agreed via WhatsApp" / "ratified by email thread" without persistent Decision-log entry. Messaging-app discussions are ephemeral; closure-evidence requires durable record.
4. **"Discussed at last trustee meeting" without meeting-minutes evidence-link** — meeting discussion without minutes at `docs/launch-gate-inventory/meeting-minutes/YYYY-MM-DD.md` per `monthly-review-cadence-protocol.md` §5 schema is not evidence; the minutes are the evidence.
5. **Per-Story `done` status alone** — `sprint-status.yaml` row showing `done` status is a framework-leg discharge signal, NOT a substantive Tasks 7-11 closure signal. Per closure-status-aggregation discipline (README §4 invariant 14), a row flips to `closed` ONLY on substantive Decision supersession entry + Tasks 7-11 external action closure + ratifying trustees ≥2. Story-level `done` alone is rejected; cite the discharging Decision-log entry.
6. **Aspirational closure** — "we plan to close this Q2" / "the team intends to close by 2026-MM-DD" without a substantive `target_date` per `target-date-rationale-template.md` schema + dependency_predecessors + dependency_successors + slippage_tolerance + reviewed_by populated. Aspirational language is not a target-date; structural commitment is.
7. **Silent-evidence** — `closure_evidence_link` populated with a URL that resolves to 404, OR linked artifact has been superseded by an inconsistent supersession entry, OR linked artifact is out-of-scope for the gate (e.g., a CI test result for a different feature). At every monthly review, Trustee Panel verifies closure-evidence-link integrity per §3 testable-signal-5; broken links trigger escalation per `escalation-protocol.md` §1 trigger 2.
8. **Conjunction-elision** — for multi-Story-discharged rows (Row 5 P0-2 = Stories 0.8/0.9/0.10/0.11), citing one Story's closure as the row's closure without populating all four `closure_evidence_link` entries per §6 multi-link discipline below.

## §5 — Per-disposition closure-evidence requirements

Per architecture line 4773, closure is one of four dispositions. Each disposition has distinct evidence requirements:

### `closed`

Substantive closure with concrete objective evidence per §2 vocabulary. Requires:

- `closure_evidence_link` populated with link to one of §2 evidence types (multi-link permitted per §6).
- `current_status = closed` flipped from a pre-closure state via supersession marker preserving prior status.
- Per-row closure event ratified by ≥2-trustee at the monthly review per `monthly-review-cadence-protocol.md` §3 quorum + recorded as `engagement-ledger.md` §5 entry.
- `.decision-log.md` Decision 2026-06-03-015 per-row supersession entry with `gate_id` + `closure_date` + `ratifying_trustees` ≥2.

### `accepted-risk`

Risk consciously accepted by Trustee Panel; mitigation plan in place. Requires:

- `closure_evidence_link` populated with link to mitigation-plan artifact (e.g., `docs/<surface>/mitigation-plan.md` OR `_bmad-output/research/<topic>-mitigation.md`).
- `closure_evidence_link` ALSO populated with link to ratifying `.decision-log.md` Decision entry with ≥2-trustee acknowledgement + acceptance rationale.
- `current_status = accepted-risk` flipped from `open` via supersession marker.
- Per-monthly-review re-validation per `monthly-review-cadence-protocol.md` §7 annual re-attestation walk-through — mitigation plan still operative.

### `deferred-per-named-criteria`

Closure deferred per explicit named-criteria. Requires:

- `closure_evidence_link` populated with link to named-criteria specification (the criteria document or section that defines when closure can proceed).
- `closure_evidence_link` ALSO populated with link to ratifying `.decision-log.md` Decision entry with ≥2-trustee acknowledgement + deferral rationale.
- `closure_evidence_link` ALSO populated with reversion-trigger (what materializes to flip `deferred-per-named-criteria` back to `open` for substantive closure).
- `current_status = deferred-per-named-criteria` flipped from `open` (or `conditional-escalation-pending-predicate` for Rows 12-14) via supersession marker.

### `reframed`

Gate reframed as redirect to a different gate. Requires:

- `closure_evidence_link` populated with link to the supersession-target gate (the gate that subsumes or replaces this gate).
- `closure_evidence_link` ALSO populated with link to ratifying `.decision-log.md` Decision entry with ≥2-trustee acknowledgement + reframe rationale (why this gate redirects to another).
- `current_status = reframed` flipped from `open` OR `conditional-escalation-pending-predicate` via supersession marker.

### `conditional-escalation-pending-predicate`

Row is a conditional-escalation candidate whose predicate (verbatim from architecture §Gap Analysis) has not yet materialized. This is a **waiting state**, not a final disposition. Requires:

- Predicate stated verbatim in the row's `closure_criteria`.
- `target_date` = `predicate-decision-point` per `target-date-rationale-template.md` §6.
- Row checked at every monthly review per `monthly-review-cadence-protocol.md` §2 agenda item 3.
- `closure_evidence_link` is empty in this state; it populates when the predicate materializes and the row subsequently transitions to one of the architecture-allowed dispositions.
- **This status does not satisfy the Phase 1 readiness signal.** The row must eventually transition to one of the four architecture-allowed dispositions per architecture line 4773 (or remain explicitly under Trustee Panel disposition `accepted-risk` / `deferred-per-named-criteria`) before Phase 1 launch readiness signal arms.

### `reserved`

Placeholder row for future conditional-escalation elevation (Row 15 pattern). All fields are `<TO-BE-AUTHORED-ON-ELEVATION>` placeholders. **No evidence required in this state.**

**Phase 1 readiness signal carve-out:** a `reserved` row with all fields at placeholder values is excluded from the Phase 1 readiness signal check per `escalation-protocol.md` §6. It does not block launch readiness. If a `reserved` row is populated with substantive content (elevation occurs), its status supersedes to `open` and it becomes a tracked active row subject to normal closure-evidence requirements.

## §6 — Multi-link rows

A row may cite multiple closure-evidence-links. Multi-link rows are common for:

- **Multi-Story-discharged rows** — e.g., Row 5 P0-2 cites Decisions 008 + 009 + 010 + 011 (one per P0-2a/b/c/d sub-Story) + each Story Task 11 closure. Row closure is the **conjunction** of all linked artifacts being in their committed/ratified states.
- **Multi-artifact-discharged rows** — e.g., Row 3 Edge/WAF DPDPA-compatibility cites Decision-log entry + ADR + Legal Counsel return artifact. All three must be in committed/ratified states for row closure.
- **Multi-disposition-evidence rows** — e.g., `accepted-risk` rows cite both mitigation-plan link AND ratifying Decision entry; `reframed` rows cite both supersession-target gate AND ratifying Decision entry.

Multi-link discipline:

- Each link conforms to §2 vocabulary.
- Each link is independently verifiable per §3 testable signals.
- Row closure is the conjunction of all linked artifacts; if any one fails verification (e.g., link resolves to 404, linked artifact in inconsistent state), the entire row escalates per `escalation-protocol.md` §1 trigger 2.

## §7 — Cross-links

- **`monthly-review-cadence-protocol.md` §2 agenda template** — rubric consulted at every monthly review for open-row triage + closure-event ratifications.
- **`escalation-protocol.md` §1** — weak-closure-criteria detected by §4 rejection examples triggers escalation review per §1 trigger 1 (target-date miss is the canonical trigger; weak-closure-criteria detected is a corollary trigger).
- **`target-date-rationale-template.md` §2** — `closure_criteria` and `target_date` are paired fields on `inventory-roster.md`; together they commit "what closes the row + when".
- **`engagement-ledger.md` §5** — per-row closure log records each closure event with `gate_id` + `closure_date` + `closure_evidence_link` + `ratifying_trustees` ≥2 + cross-reference to Decision 2026-06-03-015 per-row supersession entry.
