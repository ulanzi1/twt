# Escalation Protocol

**Authority:** Story 0.15 AC-2 wording "any entry that misses its target date triggers an escalation review at the next trustee meeting" + [[feedback_closure_language_precision]] three-state closure vocabulary + architecture line 4773 disposition vocabulary.

## §1 — Escalation triggers

A row is escalated for review at the next monthly meeting (or emergency meeting per `monthly-review-cadence-protocol.md` §6) when any of the following triggers fires:

### Trigger 1 — Target-date miss

The row's `target_date_or_trigger` per `target-date-rationale-template.md` passes without `current_status` transitioning to one of the architecture-allowed dispositions per architecture line 4773. The miss is detected at the monthly review per `monthly-review-cadence-protocol.md` §2 agenda item 2.

Slippage tolerance is per-row per `target-date-rationale-template.md` §2 `slippage_tolerance` field (typically 1-3 trustee-meeting-cycles depending on gate-class — Open ADR slot per `README.md` §7 item 1). When tolerance is exhausted, the row escalates.

### Trigger 2 — Closure-evidence retraction

A previously-closed row's `closure_evidence_link` is no longer valid. Detection patterns:

- Link resolves to 404 or out-of-scope artifact.
- Linked Decision-log entry is superseded by an inconsistent supersession entry (e.g., a Decision that closed Row 1 is later marked `withdrawn` or `superseded-with-different-disposition`).
- Linked ADR is reverted to `slot-reserved-pre-write` or `withdrawn`.
- Linked runbook is retracted or substantively rewritten in a way that invalidates the original closure-evidence.
- Linked contract is terminated, expired without renewal, or breach event recorded.

The retraction triggers immediate escalation; the row's `current_status` field is updated to `open` with a supersession marker preserving the prior status: `<superseded YYYY-MM-DD (trigger-2-evidence-retraction): prior_status → open; prior closure_evidence_link retracted; escalation record in engagement-ledger.md §6>`. Emergency review per `monthly-review-cadence-protocol.md` §6 trigger 2.

### Trigger 3 — Conditional-escalation predicate materializing

A `current_status = conditional-escalation-pending-predicate` row (Rows 12-14, or post-author-commit elevations) has its predicate materialize per the verbatim predicate text in the row's `closure_criteria`. Examples:

- **Row 12** — DigiLocker-mandatory migration begins OR first FR-58C-gated rollout starts AND tool not selected.
- **Row 13** — Push fan-out load test executes AND envelope fails.
- **Row 14** — Epic 1+ Story proposes new Account State name AND consumer-contract not fully enumerated.

Detection occurs at monthly review per `monthly-review-cadence-protocol.md` §2 agenda item 3 (newly-elevated conditional rows) OR at emergency review per `monthly-review-cadence-protocol.md` §6 trigger 3. Outcome: row flips to `open` + Trustee Panel ratification + substantive closure-criteria authoring.

### Trigger 4 — Cross-Story discharge-path Story status retreat

A `done` Story whose closure discharges a row gets re-opened due to a downstream supersession event. Examples:

- Story 0.6 sprint-status reverts from `done` to `in-progress` after a backup-engineer-candidate withdraws → Row 1 supersedes back to `open`.
- Story 0.14 sprint-status reverts after a Tasks 7-11 substantive ratify-decision retraction → Row 7 supersedes back to `open`.

Detection occurs at monthly review or emergency review. Outcome: row supersedes back to `open` with prior-`closed`-status preserved in supersession-marker; Trustee Panel decides remediation path (re-Story-discharge OR alternative closure-evidence).

### Trigger 5 — Weak-closure-criteria detected at monthly review

Per `closure-criteria-rubric.md` §4 rejection examples, if a row's `closure_criteria` is detected to be weak-closure (Solo Builder belief, "in progress" without milestone, messaging-app discussion, per-Story `done` status alone, aspirational closure, silent-evidence, conjunction-elision), the row escalates for `closure_criteria` revision per `escalation-protocol.md` §3 outcome `revise-target-with-rationale` (target-side revision) OR closure-criteria substantive amendment.

## §2 — Escalation review process

When a trigger fires, the next monthly review (or emergency review) executes the following:

1. Solo Builder presents the triggering event(s) + current row state + proposed remediation path.
2. Trustee Panel discusses + selects an outcome per §3 vocabulary.
3. Outcome recorded with rationale per §4 schema in `engagement-ledger.md` §6 per-row escalation log + `inventory-roster.md` row `missed_target_escalation_log` field.
4. If outcome involves status flip OR target-date revision OR closure-criteria amendment, the row's substantive fields are updated via supersession marker preserving prior values.
5. Next-review-date set per outcome (typically next monthly cycle; emergency-trigger may set earlier review).

## §3 — Escalation outcomes vocabulary

The Trustee Panel selects exactly one outcome per escalation event:

### `accept-slippage` with rationale

The delay is consciously accepted; Trustee Panel records a new `target_date` in the `missed_target_escalation_log` field of the row. The `target-date-rationale-template.md` row entry is **not** revised — the original rationale and assumptions remain operative. The row remains `open` (or `in-progress`); status does not change.

Use when: predecessor-dependency is structurally delayed but the row's closure-path and underlying assumptions are still correct; only the scheduling has shifted. Example: Row 11 trust-deed-filing slips by 1 month due to Sub-Registrar scheduling, but the filing-path assumptions are unchanged.

### `revise-target-with-rationale`

The `target_date_or_trigger` AND its rationale are revised. The `target-date-rationale-template.md` row entry is substantively amended to reflect changed assumptions; prior rationale is preserved via supersession marker. The row remains `open`; status does not change.

Use when: the original target-date was based on assumptions that have materially changed — not just scheduling drift but a changed dependency, scope expansion, or structural re-assessment. Example: Row 1 target was "Story 0.6 Task 11 + 2 weeks" but backup-engineer search is starting from scratch after candidate withdrawal; the original 2-week lag no longer reflects the new closure-path.

### `decompose-to-sub-gates`

The parent row decomposes into N sub-rows per `target-date-rationale-template.md` §5. Each sub-row gets independent `target_date` + `closure_criteria` + `rationale`. Parent row closure becomes the conjunction of all sub-row closures.

Use when: a complex multi-step gate is failing to close as a single unit but parts of it are closable independently. Canonical example: Row 11 `trust-formation-and-legal-registration` decomposing into trust-deed-filing + 12A/12AB-registration + GST-registration + DPDPA-Data-Fiduciary-registration sub-rows.

### `transfer-ownership`

Current owner relinquishes ownership to a contracted external party OR another internal owner. The row's `owner` and `support` fields are updated via supersession marker.

Use when: original owner lacks capacity OR external party (e.g., Story 0.6 backup engineer per A-13; Story 0.12 contract-help-path) takes over the substantive closure path.

### `reframe-disposition`

The row's `current_status` flips from `open` to one of `accepted-risk` / `deferred-per-named-criteria` / `reframed` per architecture line 4773 vocabulary. Each disposition has distinct closure-evidence requirements per `closure-criteria-rubric.md` §5.

Use when: the gate cannot realistically reach `closed` disposition in the available window AND another disposition is substantively appropriate. Applicable from `open` OR `conditional-escalation-pending-predicate` (e.g., a conditional row whose predicate is assessed as never materializing OR whose predicate is subsumed by another gate). Trustee Panel applies the more-protective-governs disposition per [[feedback_closure_language_precision]] — `accepted-risk` requires explicit mitigation-plan; `deferred-per-named-criteria` requires substantive predicate; `reframed` requires substantive supersession-target.

## §4 — Escalation log row schema

Each escalation event records an `engagement-ledger.md` §6 per-row escalation log row + an entry in `inventory-roster.md` row `missed_target_escalation_log` field:

| Field | Substance |
|---|---|
| `gate_id` | matches `inventory-roster.md` row `gate_id` |
| `escalation_date` | YYYY-MM-DD of escalation trigger detection |
| `trustee_meeting_date` | YYYY-MM-DD of the monthly review (or emergency review) at which the escalation was reviewed |
| `trigger` | one of §1 triggers 1-5 |
| `outcome` | one of §3 outcomes vocabulary |
| `rationale` | substantive rationale for the outcome (why this outcome; what changed; what dependency was discovered) |
| `next_review_date` | YYYY-MM-DD of next planned review of this row |

## §5 — Repeat-escalation root-cause inquiry trigger

Any row escalated >2 times in same calendar quarter triggers a Trustee Panel **root-cause inquiry**:

- **Solo Builder authors root-cause memo** — substantive written analysis of why the row keeps escalating; root-cause hypothesis; remediation options.
- **Trustee Panel reviews + decides** outcome from an expanded vocabulary:
  - `accept-as-is` — risk of repeated escalation accepted; rationale committed.
  - `reframe` — apply `reframe-disposition` per §3 with substantive disposition (typically `accepted-risk` or `deferred-per-named-criteria`).
  - `transfer-ownership` — apply `transfer-ownership` per §3.
  - `decompose-to-sub-gates` — apply `decompose-to-sub-gates` per §3.
- **Root-cause inquiry outcome** recorded in `engagement-ledger.md` §6 with `root_cause_inquiry = true` flag on the escalation log row.

The >2-escalations-per-quarter threshold is calibrated per gate-class — Open ADR slot per `README.md` §7 item 5.

## §6 — Phase 1 launch readiness signal

Phase 1 launch readiness is structurally signaled ONLY when:

1. Every **active** row of `inventory-roster.md` is at one of architecture-allowed dispositions per architecture line 4773 — `closed` / `accepted-risk` / `deferred-per-named-criteria` / `reframed`. `reserved` rows with all fields at placeholder values are excluded from this check per `closure-criteria-rubric.md` §5 `reserved` carve-out.
2. Every closure has objective evidence-link per `closure-criteria-rubric.md` §2 vocabulary.
3. No row remains `open` past its target date without an active escalation review entry.
4. All `conditional-escalation-pending-predicate` rows (Rows 12-14 + any post-author-commit elevations) have transitioned to one of the architecture-allowed dispositions per Trustee Panel decision.

The all-rows-closed-or-deferred final sign-off (Task 11) produces a `.decision-log.md` Decision 2026-06-03-015 supersession entry "Architectural launch-gate inventory all rows closed-or-deferred-with-ADR; Phase 1 launch readiness signal armed" with ≥2-trustee ratification.

Phase 1 launch readiness signal is one input to Phase 1 launch readiness; per PRD §12 Phase 0 line 1467 the inventory closure unblocks "Phase 1 transition" but Phase 1 launch itself depends on Epic 1-14 closure + cross-cutting CI gates + per-Pariwar provisioning + (per Story 0.13) Legal Counsel sign-off cycles.

## §7 — Cross-links

- **`inventory-roster.md`** — row `missed_target_escalation_log` field carries per-row escalation history.
- **`closure-criteria-rubric.md` §4** — weak-closure-criteria rejection examples are the basis for §1 trigger 5.
- **`monthly-review-cadence-protocol.md` §2** — agenda item 2 (missed-target escalation review) consumes this protocol.
- **`monthly-review-cadence-protocol.md` §6** — emergency review triggers are subset of §1 triggers (specifically triggers 1, 2, 3, 4, 5).
- **`target-date-rationale-template.md` §2** — `slippage_tolerance` field calibrates §1 trigger 1 threshold.
- **`engagement-ledger.md` §6** — per-row escalation log row appended per escalation event per §4 schema.
- **`engagement-ledger.md` §8** — conditional-row elevation log row appended per §1 trigger 3 materialization.
