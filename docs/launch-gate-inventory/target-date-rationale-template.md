# Target-Date Rationale Template

**Authority:** Story 0.15 AC-1 wording "target date" + [[feedback_architecture_vs_adr_boundary]] worked-example "use relative-to-fact triggers (e.g., `valid_through + 1 day`), not calendar offsets (e.g., 'Day +366')".

This template commits the per-row `target_date` rationale schema authored at Task 8 ratification. Per AC-1, the inventory is "signed off by ≥2 trustees" — the ratification event populates `reviewed_by` on each row with ≥2-trustee names + ratification date.

## §0 — Framework-lifecycle deadline (Task 8 ratification)

The per-row target-dates authored at Task 8 are the primary escalation surface of this template. However, Task 8 itself — the Trustee Panel inventory ratification event — has no row-level escalation path: the monthly review cadence does not start until after Task 8 closes, and all per-row `target_date` fields are `<TO-BE-AUTHORED-AT-TASK-8>` placeholders until that event occurs.

To surface a Task 8 slip, this template records a single framework-lifecycle deadline:

| Field | Value |
|---|---|
| `lifecycle_event` | Task 8 — Trustee Panel inventory ratification |
| `target_date_or_trigger` | Story 0.15 Task 7 author-commit (2026-06-03) + 4 weeks = on or before **2026-07-01** |
| `rationale` | `monthly-review-cadence-protocol.md` §4 specifies "first monthly review held within 4 weeks of ratification"; Task 8 ratification must precede the first monthly review; 4-week window from author-commit provides sufficient scheduling lead time. |
| `slip_action` | If Task 8 has not occurred by 2026-07-01, BigDev surfaces the slip to the Trustee Panel as an emergency agenda item per `monthly-review-cadence-protocol.md` §6; the slip is recorded in `engagement-ledger.md` §3 with the date detected + reason. |

This entry is authored at Story 0.15 Task 7 author-commit (2026-06-03) and does not require per-row rationale authoring at Task 8.

## §1 — Authority cites

- **AC-1 wording:** "target date" — every `inventory-roster.md` row carries a substantive `target_date` field.
- **[[feedback_architecture_vs_adr_boundary]] worked-example:** "use relative-to-fact triggers (e.g., `valid_through + 1 day`), not calendar offsets (e.g., 'Day +366')". Relative-to-fact triggers anchor target-dates to verifiable events; calendar offsets drift without context.
- **Story 0.15 README §4 invariant 9:** Relative-to-fact triggers preferred over calendar offsets.

## §2 — Per-row rationale schema

Each row of `inventory-roster.md` is paired with a corresponding rationale row authored under this template at Task 8 ratification. The schema:

| Field | Substance |
|---|---|
| `gate_id` | matches `inventory-roster.md` row `gate_id` (verbatim slug) |
| `target_date_or_trigger` | per §3 conventions below — relative-to-fact trigger preferred; calendar offsets forbidden |
| `rationale` | why this date / trigger; what dependency-cone is anchored on this date; what slips if missed |
| `dependency_predecessors` | which gates must close before this gate's closure-criteria can fire |
| `dependency_successors` | which Epic-1+ work is blocked until this gate closes |
| `slippage_tolerance` | how many trustee-meeting-cycles can be missed before escalation per AC-1 wording "missed target date triggers escalation review" |
| `reviewed_by` | ≥2-trustee names + ratification date — populated at Task 8 inventory ratification |

## §3 — Date format conventions

### Preferred — relative-to-fact triggers

A relative-to-fact trigger anchors the target-date to a verifiable upstream event + a known lag. Format: "`<trigger-event>` + `<lag-duration>`". Examples:

- "Story 0.13 Task 7 trustee scope ratification + 2 weeks for first-artifact submission"
- "Story 0.6 Task 11 closure + 2 weeks for contract signature + onboarding"
- "Decision 2026-06-02-014 supersession entry + 1 month for ADR substantive write"

The trigger-event MUST be a verifiable event (Decision-log entry, sprint-status row state flip, contract signature event, runbook sign-off, etc.). "Soon", "shortly", "imminent" are not triggers.

### Forbidden — calendar offsets without trigger context

The following formats are rejected at every monthly review per the [[feedback_architecture_vs_adr_boundary]] worked-example:

- Bare calendar date (e.g., "2026-12-31") without trigger-event context. The date drifts without anchoring; revisions become opaque.
- Day-offset from author-commit (e.g., "Day +90") without trigger-event context. The offset drifts as author-commit drifts.
- "Quarterly" / "monthly" / "annually" without trigger-event context. These are cadences not target-dates.

A bare calendar date is permitted ONLY when paired with the trigger-event it instantiates (e.g., "Phase 1 launch = 2026-12-15 per epics line 564 Phase-1-launch-date").

### Time-stable gates — "before Phase 1 launch" + milestone-decomposition

For gates whose closure is not date-anchored but launch-anchored (e.g., Row 11 `trust-formation-and-legal-registration`), the target-date is "before Phase 1 launch" with milestone-decomposition sub-rows per `escalation-protocol.md` §3 outcome `decompose-to-sub-gates`. Each sub-row carries an independent `target_date` per §3 conventions.

### Conditional candidates — "predicate-decision-point"

For `conditional-escalation-pending-predicate` rows (Rows 12-14 of `inventory-roster.md`), the target-date is "predicate-decision-point" with predicate verbatim from architecture §Gap Analysis. The predicate-decision-point is checked at every monthly review per `monthly-review-cadence-protocol.md` §2 agenda template's "newly-elevated conditional rows" item. Format: "predicate-decision-point — predicate verbatim: `<architecture verbatim text>`".

## §4 — Sequenced gates pattern

When gate-N depends on gate-M closure for its closure-criteria to fire, target = "Closure of gate-M + N-weeks-lag". Example:

- **Row 8 `dpdpa-grievance-officer-designation`** depends on Story 0.13 Legal Counsel return for DPDPA compatibility analysis. Target-date format: "Story 0.13 Task 11 first-Legal-Counsel-return for DPDPA scope + 4 weeks for Trustee Panel designation event in `.decision-log.md`".

The N-weeks-lag is a Trustee Panel estimate of substantive-action duration, not a bare calendar offset; it is dependent on Trustee Panel availability cadence.

## §5 — Decomposed gates pattern

When a gate decomposes into sub-rows per `escalation-protocol.md` §3 outcome `decompose-to-sub-gates`, each sub-row gets independent `target_date` + closure-criteria + rationale. The parent row's closure is the conjunction of all sub-row closures.

**Example — Row 11 `trust-formation-and-legal-registration` decomposition:**

| Sub-row | Sub-target-date format |
|---|---|
| `trust-deed-filing` | "Trustee Panel ratification of trust-deed draft + 6 weeks for state Trust Sub-Registrar filing event" |
| `12a-12ab-registration` | "trust-deed-filing closure + 8-12 weeks for 12A/12AB Income Tax registration certificate" |
| `gst-registration` | "trust-deed-filing closure + 4 weeks for GST registration application + 2-4 weeks for certificate" |
| `dpdpa-data-fiduciary-registration` | "Story 0.13 first-Legal-Counsel-return for DPDPA scope + 8 weeks for DPDPA Data Fiduciary registration confirmation" |

Parent row closure: conjunction of all four sub-row closures + Trustee Panel sign-off in `.decision-log.md`.

The decomposition is itself an Open ADR slot per `README.md` §7 item 2; the sub-row schema above is illustrative.

## §6 — Conditional candidates pattern

For `conditional-escalation-pending-predicate` rows (Rows 12-14 of `inventory-roster.md`):

- `target_date_or_trigger` = "predicate-decision-point" with predicate verbatim from architecture
- `rationale` = "predicate-materialization is the trigger for elevation to `open` + substantive closure-criteria authoring; non-materialization at Phase 1 launch triggers Trustee Panel disposition `accepted-risk` / `deferred-per-named-criteria`"
- `dependency_predecessors` = "architecture §Gap Analysis observation lines + cross-Story coupling (e.g., Row 13 depends on Epic 7 + §Control-Demonstration-Schedule Push-fan-out-load-test execution)"
- `dependency_successors` = "Phase 1 launch readiness signal arming per AC-2 (conditional rows must transition to one of architecture-allowed dispositions before launch readiness signal arms)"
- `slippage_tolerance` = "N/A — predicate-decision-point is event-anchored not time-anchored"
- `reviewed_by` = "≥2-trustee names + ratification date — populated at Task 8 inventory ratification"

The predicate-decision-point is checked at every monthly review per `monthly-review-cadence-protocol.md` §2 agenda template; the check itself is a Trustee Panel observation (has the predicate materialized?) rather than a target-date.

## §7 — Annual re-attestation pattern

For re-attestation cadence per [[feedback_architecture_vs_adr_boundary]] Tier C + `monthly-review-cadence-protocol.md` §7, the `target_date_or_trigger` format is "annual + N-days-grace". Example:

- "Inventory all-rows-closed-or-deferred final sign-off (Task 11 closure) + 12 months for first annual re-attestation walk-through; 30-day grace window for ≥2-trustee scheduling"
- "Last annual re-attestation walk-through + 12 months for next annual cycle; 30-day grace window"

Annual re-attestation is recorded in `engagement-ledger.md` §7 per-row annual re-attestation log.

## §8 — Worked examples

### Row 1 — `a-13-backup-engineer-retainer`

- `gate_id`: `a-13-backup-engineer-retainer`
- `target_date_or_trigger`: "Story 0.6 Task 11 closure + 2 weeks for contract signature + onboarding"
- `rationale`: A-13 is the bus-factor-of-one foundational mitigation; substantive engagement begins from Story 0.6 framework + contract template + scope-of-work closure; 2-week lag covers contract signature + onboarding event + first-trustee-review.
- `dependency_predecessors`: Story 0.6 author-commit closure (already at Decision 2026-05-30-006).
- `dependency_successors`: A-13 cascade — backup-engineer-availability unblocks runbook execution under Solo-Builder-unavailability scenarios per `docs/runbooks/operational-readiness-ledger.md`.
- `slippage_tolerance`: 2 trustee-meeting-cycles (≈2 months) before escalation.
- `reviewed_by`: Dhiraj Rahul + Kalpana Bharti, 2026-07-05 (Decision 2026-07-05-064)

### Row 7 — `p0-5-native-stack-validation-experiment`

- `gate_id`: `p0-5-native-stack-validation-experiment`
- `target_date_or_trigger`: "Story 0.14 Task 11 ratify-or-pivot decision + ADR-NNNN-native-mobile-stack-ratify substantively authored + architecture line 4784 row-flip via PR-2"
- `rationale`: P0-5 closure is the gate for substrate-conditional engineering commitments per AR-49 + UX spec line 854; Story 0.14 Task 11 ratify-or-pivot decision is the substantive event; ADR transcription is the architecture-side commitment.
- `dependency_predecessors`: Story 0.14 Tasks 7-11 substantive closure (Trustee Panel scope ratification + device procurement + prototype build + measurement + ratify-decision).
- `dependency_successors`: Epic 1 substrate-work unblock per Story 1.1 line 990 precondition; Story 0.10 P0-2c PRECONDITION-2 prototype-operability unblock; AR-49 substrate-conditional commitments unfrozen.
- `slippage_tolerance`: 1 trustee-meeting-cycle (≈1 month) — P0-5 is on the critical path for Epic 1.
- `reviewed_by`: Dhiraj Rahul + Kalpana Bharti, 2026-07-05 (Decision 2026-07-05-064)

### Row 11 — `trust-formation-and-legal-registration` (decomposed)

- `gate_id`: `trust-formation-and-legal-registration` (parent row + 4 sub-rows per §5)
- `target_date_or_trigger`: "before Phase 1 launch; sub-row decomposition per §5; parent closure = conjunction of all sub-row closures + Trustee Panel sign-off in `.decision-log.md`"
- `rationale`: Trust formation is the precondition for trust-as-legal-entity that holds the platform; all four sub-registrations are independent regulatory surfaces with their own filing cycles; decomposition strategy is an Open ADR slot per README §7 item 2.
- `dependency_predecessors`: Trustee Panel quorum availability for trust-deed drafting; Story 0.13 Legal Counsel return for DPDPA Data Fiduciary scope.
- `dependency_successors`: Phase 1 launch — trust as legal entity is the substrate for member-facing operations; all upstream regulatory commitments depend on trust-as-entity.
- `slippage_tolerance`: 3 trustee-meeting-cycles (≈3 months) per sub-row before escalation; parent row escalates if any sub-row escalates >2 times in same calendar quarter per `escalation-protocol.md` §5.
- `reviewed_by`: Dhiraj Rahul + Kalpana Bharti, 2026-07-05 (Decision 2026-07-05-064)

### Row 12 — `feature-flag-tool-selection-p1-conditional` (conditional candidate)

- `gate_id`: `feature-flag-tool-selection-p1-conditional`
- `target_date_or_trigger`: "predicate-decision-point — predicate verbatim: 'if tool selection lags the first FR-58C-gated rollout, DigiLocker-mandatory migration (PRD A-4) blocks or requires ad-hoc gating that violates Cross-Cutting #15 visibility and no-secret-flags properties'"
- `rationale`: Conditional-escalation candidate per [[feedback_gap_analysis_observational]]; predicate-materialization criteria are an Open ADR slot per README §7 item 3.
- `dependency_predecessors`: DigiLocker-mandatory migration begin event OR first FR-58C-gated rollout begin event (architecture §Gap Analysis observation lines 4823-4828).
- `dependency_successors`: Phase 1 launch readiness signal arming per AC-2 (conditional rows must transition before launch readiness signal arms); Cross-Cutting #15 visibility + no-secret-flags properties.
- `slippage_tolerance`: N/A — predicate-decision-point is event-anchored.
- `reviewed_by`: Dhiraj Rahul + Kalpana Bharti, 2026-07-05 (Decision 2026-07-05-064)

## §9 — Cross-links

- **`inventory-roster.md`** — `target_date` and `closure_criteria` are paired fields per row; this template authors the rationale for the `target_date` field.
- **`monthly-review-cadence-protocol.md` §2** — agenda template "open-row triage" item assesses target-date-miss risk; rationale schema informs assessment.
- **`escalation-protocol.md` §1 trigger 1** — target-date miss is the canonical escalation trigger; `slippage_tolerance` defines the threshold.
- **`closure-criteria-rubric.md` §4 rejection 6** — aspirational closure ("we plan to close by Q2") is rejected; substantive `target_date` per this template is required.
- **`engagement-ledger.md` §3 Trustee Panel inventory ratification log** — Task 8 ratification populates `reviewed_by` field on each row.
