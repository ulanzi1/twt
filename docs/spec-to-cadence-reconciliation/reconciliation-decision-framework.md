# Reconciliation Decision Framework

**Status:** Author-committed 2026-06-01. §1–§9 are governance-procedure documents — they commit the decision procedure, not the decision outcome. The substantive reconciliation outcome is Tasks 8–9 of Story 0.12 territory.

**Authority:** UX §Phase-0 P0-3 (line 107) + AR-49 P0-3 Launch Gate Risks (architecture line 4779) + PRD §7 SM-1 + PRD §9.1.1 "patience as discipline" + Decision 2026-06-01-012 body items 5–9.

---

## §1 Mismatch-ratio computation

The mismatch-ratio computation is deterministic. It uses the floor and ceiling from `estimation-worksheet.md §8` total estimate row after Solo Builder substantive authoring (Task 7 + Task 8).

### Formula

```
floor_ratio    = total_estimate_floor    ÷ SM_1_floor
ceiling_ratio  = total_estimate_ceiling  ÷ SM_1_ceiling
mismatch_ratio = max(floor_ratio, ceiling_ratio)
```

Where:
- `SM_1_floor = 6` (months) — per PRD §7 SM-1 lower bound
- `SM_1_ceiling = 9` (months) — per PRD §7 SM-1 upper bound
- `total_estimate_floor` and `total_estimate_ceiling` are in engineer-months (single-engineer-month at solo cadence per `estimation-methodology.md §2`)

### Reconciliation-decision trigger

The reconciliation-decision trigger fires if:

```
mismatch_ratio > 1.5
```

**More-protective-governs rule:** Both ratios are computed independently. If `floor_ratio = 1.3` and `ceiling_ratio = 1.7`, the `max` is 1.7 — the trigger fires. Rounding the ceiling-ratio down to match the floor-ratio, or averaging the two, to escape the 1.5× threshold is **FORBIDDEN**. Closure-language precision per the project feedback discipline applies: the more-protective-governs rule is a structural invariant, not a style preference.

### No-trigger outcome

If `mismatch_ratio ≤ 1.5`, the reconciliation-decision step is optional but the framework still produces a sign-off record. A no-trigger outcome is recorded as a `.decision-log.md` entry confirming the ratio computed + the no-trigger finding. This record is the AR-49 P0-3 discharge evidence even in the no-trigger case.

### Worksheet record

The computed ratios are recorded in `estimation-worksheet.md §9 Mismatch-ratio history` at Task 8, including the raw floor/ceiling totals and the SM-1 floor/ceiling used in the computation. The history table is append-only; prior rows are not edited.

---

## §2 Three decision-paths taxonomy

The three decision-paths are:

| Path | Short name | Summary |
|---|---|---|
| (a) | Cut scope | Proposed Stories deferred to v2 / Phase-2 / future-amendment |
| (b) | Move SM-1 | New SM-1 target months committed + PRD §7 amendment |
| (c) | Contract help | Specific scope outsourced to external contractors |
| (d) | Hybrid | Any combination of (a) + (b) + (c); each component follows its own per-path procedure |

**Hybrid is the expected outcome.** UX §Phase-0 P0-3 uses an inclusive "or": "via cut scope, moved SM-1 target, or changed build model." The rough back-of-envelope in UX §Phase-0 P0-3 suggests a 3-4× mismatch (~22-34 engineer-months ÷ 6-9 month SM-1 target = 2.4× to 5.7×). A single-path reconciliation is unlikely to close a gap of that magnitude — hybrid is the probable outcome. The framework handles all combinations; each component is enumerated and ratified separately before being bundled into a single `.decision-log.md` entry.

**Open Question 5 resolution (author-commit decision, revised 2026-06-01 per review D-02):** §3(d) is retained as a **composition pattern guide** — it is NOT a fourth standalone path but a documentation layer that specifies how the §3(a) + §3(b) + §3(c) procedures compose when applied together. See §3(d) below for path-interaction rules (e.g., cut-scope-then-move-SM-1 ordering; contract-help enumeration before SM-1 to avoid double-counting capacity). Hybrid is recorded as a single `.decision-log.md` entry with sub-sections per active component, plus a §3(d)-driven composition rationale section.

---

## §3 Per-path procedure detail

### §3(a) Cut scope

**Cascade-dependency invariant (revised 2026-06-01 per review P-10):** Cut-scope deferral of any Story X requires accompanying deferral OR explicit non-blocking rationale for every Story in X's downstream dependency graph. Trustee Panel rejects cut-scope proposals with un-enumerated cascades. The cascade is enumerated in step 1 below; the rejection mechanism is in §4 ratification procedure.

1. **Identify deferred Stories.** Solo Builder enumerates each Story proposed for deferral with:
   - Story key + Epic
   - Deferral rationale (why this Story can move to v2 / Phase-2 without compromising v1 launch integrity)
   - Downstream-Epic impact (does deferral unblock or re-block other Stories / Epics?)
   - UX-DR impact (which UX-DR clauses are deferred with the Story? Are any NFR-20 or UX-DR66–68 Tier-1 clauses affected? If so, the deferral is a launch-blocker risk, not a v1 acceptable-gap)
   - Cross-Story dependency impact (does the deferred Story gate any other ready-for-dev Stories in sprint-status.yaml?)
   - **Downstream cascade enumeration (cascade-dependency invariant):** every Story Y such that Y has X in its dependency chain (direct or transitive) is listed with one of two dispositions: (a) Y is also deferred with rationale, or (b) Y is non-blocking because Y can proceed with X's pre-X surfaces or a documented workaround. Trustee Panel rejects ratification if the cascade is not fully enumerated.

2. **Log in `deferred-work.md`.** Append a new "## Story 0.12 reconciliation deferrals" section to `_bmad-output/implementation-artifacts/deferred-work.md`. Each deferred Story is a sub-entry with the fields enumerated above. This follows the Story 0.9 + 0.10 + 0.11 deferred-work precedent.

3. **Update sprint-status.yaml.** For each deferred Story: transition the `development_status` entry from `backlog` to `deferred-to-v2-per-decision-YYYY-MM-DD-012` (substitute the actual ratification date). Update the `last_updated` field and append a comment referencing Story 0.12 Task 10.

4. **Record Epic-level impact.** If the deferred Story is the terminal Story in its Epic (i.e., deferral shifts the Epic's demoable-closure milestone), the Epic entry in `_bmad-output/planning-artifacts/epics.md` is annotated with the deferral reference per §5 Epic List update procedure below.

5. **Estimate delta.** Quantify the estimated engineer-month reduction from the deferral. The reduction is recorded in `estimation-worksheet.md §9` as a reconciliation adjustment row.

### §3(b) Move SM-1

**Governance precondition (revised 2026-06-01 per review D-07):** SM-1 is **in-scope of architecture §Decision Freeze**. PRD §7 SM-1 is a frozen governance commitment; net-new edits require an ADR per architecture §Implementation Handoff PR-2 ADR-transcription discipline. Move-SM-1 ratification therefore has three preconditions that must close in order: (i) §4 reconciliation ratification (≥2-trustee, distinct trustees per §4 anti-laundering rule); (ii) net-new ADR-NNNN-SM-1-amendment authored at `docs/adr/` documenting the SM-1 amendment rationale; (iii) PRD §7 SM-1 narrow Edit with `.decision-log.md` cross-reference + supersession-schema-marker pointing at ADR-NNNN. The ADR is a precondition for the PRD edit; without it, the PRD §7 SM-1 row remains frozen and the move-SM-1 path cannot close. The ADR-NNNN-SM-1-amendment slot is reserved in `README.md §7` Open ADR slots + `docs/knowledge-transfer/adr-index.md` Section J.

1. **Commit new SM-1 target.** Solo Builder proposes a new SM-1 range (e.g., 9–12 months instead of 6–9 months). The new target is specific (floor + ceiling), not open-ended.

2. **Trustee ratification per §4.** ≥2-trustee sign-off on the reconciliation decision including the move-SM-1 component. Per §4 anti-laundering rule: the ≥2 trustees must be **distinct** individuals — the ≥1-trustee PRD-edit co-signer (step 4 below) counts as one of the ≥2 reconciliation ratifiers; single-trustee laundering (one trustee signing both as ratifier and as PRD-edit co-signer to satisfy ≥2 with effectively only one person) is forbidden.

3. **Author net-new ADR-NNNN-SM-1-amendment.** The ADR documents: old SM-1 value; new SM-1 value; spec-vs-cadence facts driving the move (worksheet floor/ceiling totals + mismatch-ratio); cross-reference to the reconciliation decision-log entry; architecture-Decision-Freeze rationale (why SM-1 is in-scope of the freeze + why this amendment is permitted via ADR). The ADR is authored at `docs/adr/ADR-NNNN-SM-1-amendment.md` and indexed in `docs/knowledge-transfer/adr-index.md` Section J.

4. **PRD §7 narrow Edit.** With the ADR in place, Solo Builder authors a narrow Edit to PRD §7 SM-1 (line 1329) updating the target value. Per PRD-edit discipline, the edit requires ≥1-trustee co-sign recorded in the commit message + `.decision-log.md` supersession entry. The PRD edit's `.decision-log.md` entry cross-references the ADR ID. PRD §9.1.1 alignment commentary required: "Moving SM-1 is the sanctioned move under PRD §9.1.1 'patience as discipline.' Runway/calendar does not dictate. The move is on-the-record, ratified, ADR-documented, with rationale enumerated above — NOT a silent slip or calendar-driven concession."

5. **Re-compute mismatch ratio.** With the new SM-1 range, re-run the §1 formula. Record the updated ratio in `estimation-worksheet.md §9`. If `mismatch_ratio > 1.5` remains after the SM-1 move, additional cut-scope or contract-help components are required to close the gap.

### §3(c) Contract help

1. **Enumerate contracted scope.** Solo Builder specifies contracted scope at the Story/Epic granularity:
   - Each contracted Story or Epic is named explicitly
   - Rationale for outsourcing this scope (not other scope)
   - Estimated engineer-months to be sourced externally (reducing Solo Builder obligation)

2. **Open Question 6 resolution (author-commit decision):** Contracted-scope is enumerated at Story/Epic granularity in the `.decision-log.md` entry. Specific vendor identity is recorded in a separate `.decision-log.md` `[OPS]` entry with appropriate confidentiality markings — the vendor identity is not inlined into the public reconciliation decision body. The `[OPS]` entry cross-references the reconciliation decision by decision ID.

3. **Budget + scope-of-work.** The contract budget is expressed as a range (floor + ceiling) per Story/Epic row. The scope-of-work outline includes:
   - Deliverable per Story (merged code + passing CI + code-review sign-off by Solo Builder)
   - Solo Builder accountability: code-review responsibility for all contracted deliverables; external review option per Story 0.13 legal counsel pattern for compliance-adjacent scope
   - Handoff requirements: documentation, audit-log emission, AT testing, CI gate compliance

4. **PRD §9.3 cash-flow constraint reconciliation.** Contract budget is compared against the trust's operating cash-flow constraint per PRD §9.3. If the contracted budget exceeds runway capacity, the contract-help path is not viable without a parallel fundraise or grant decision — which is out-of-scope for Story 0.12 and must be parked as a separate Trustee Panel funding authority item.

5. **Contracted scope as `[OPS]` entry.** The contracted scope is logged in `_bmad-output/planning-artifacts/epics.md` with an `[OPS]` marker on the relevant Stories, cross-referencing the reconciliation decision (per §5 Epic List update procedure).

**Story 0.13 note (added 2026-06-02 per Decision 2026-06-02-013 cross-coupling):** Legal-counsel concurrent-review scope budget cross-coupling per Decision 2026-06-01-012 body item 9 + Decision 2026-06-02-013 body item 9. The substantive engagement-letter §5 retainer + per-artifact pricing + funding source resolution lands at Story 0.13 Task 9 engagement-signature event; the resolution is cross-referenced from `docs/spec-to-cadence-reconciliation/backfill-log.md` (Story 0.12 backfill row for the legal-counsel-budget territory flipped from `citation-slot-committed` to `substantive-backfill-applied` at Story 0.13 Task 9). Story 0.13 framework author-committed 2026-06-02 at `docs/legal-counsel-engagement/` per Decision 2026-06-02-013. If the contract-help path includes legal-counsel scope (compliance-adjacent contracted-engineering Stories), the external-review pattern explicitly references Story 0.13's concurrent-review engagement as the substantive review forum.

**Story 0.14 note (added 2026-06-02 per Decision 2026-06-02-014 cross-coupling):** Native-stack validation prototype device-procurement budget cross-coupling per Decision 2026-06-01-012 body item 9 + Decision 2026-06-02-014 body item 7. The substantive `cost_estimate_inr` for three test devices (mid-range Snapdragon 4-series Android with 3 GB RAM; older entry-level 2GB Android 11; iPhone iOS 16+ floor) + Apple Developer Program annual fee lands at Story 0.14 Task 7 budget-ratification event; the resolution is cross-referenced from `docs/spec-to-cadence-reconciliation/backfill-log.md` (new row tracking Story 0.12 ↔ Story 0.14 device-procurement budget cross-coupling at `citation-slot-committed` status pending Task 7 substantive authoring). Story 0.14 framework author-committed 2026-06-02 at `docs/native-stack-validation/` per Decision 2026-06-02-014. If the contract-help path includes external-native-stack-validation-engineering scope per Decision 2026-06-01-012 body item 9, the device-procurement budget is included in the contract-help cost envelope; if cut-scope OR move-SM-1 path ratifies instead, the device-procurement budget requires standalone Trustee Panel ratification at Story 0.14 Task 7 with no shared envelope.

### §3(d) Hybrid — composition pattern (not a standalone path)

§3(d) is a documentation layer specifying how §3(a) + §3(b) + §3(c) compose when more than one path is active. It is not a fourth standalone procedure — it is the integration guide that prevents double-counting and ordering errors when paths interact.

**Path-interaction rules:**

1. **Cut-scope ordering (apply FIRST).** Apply §3(a) cut-scope first. Compute the post-deferral total estimate (worksheet §7 Epic-aggregation sum minus deferred-Story rows). This becomes the new `total_estimate_floor` / `total_estimate_ceiling` baseline for any subsequent move-SM-1 or contract-help arithmetic. Rationale: deferring scope changes the denominator-of-relevance for the remaining paths.

2. **Contract-help enumeration (apply BEFORE move-SM-1).** Apply §3(c) contract-help next. Compute the post-contracting effective capacity: `effective_capacity_floor = SM_1_floor + contracted_engineer_months_floor` (contractor capacity is additive to Solo Builder capacity, with Solo Builder code-review overhead applied per §3(c) step 3). Rationale: contracted capacity changes what SM-1 means — moving SM-1 against the wrong capacity baseline produces a false-precise ratio.

3. **Move-SM-1 last (apply AFTER cut-scope + contract-help).** Apply §3(b) move-SM-1 only after (a) and (c) are settled. The new SM-1 is selected to bring `max(floor_ratio, ceiling_ratio) ≤ 1.5×` against the post-cut + post-contract baseline. Rationale: if SM-1 moves first, subsequent cut-scope and contract-help decisions create gratuitous slack — patience-as-discipline requires SM-1 to land at the tightest defensible value given the other paths' contributions.

4. **Composition rationale section.** The hybrid `.decision-log.md` supersession entry carries a §3(d) Composition Rationale sub-section enumerating: which paths are active; in what order they were applied; the post-each-step running mismatch_ratio; and the final mismatch_ratio after all paths applied. This is the audit-trail for the hybrid arithmetic.

**Recording:** The hybrid is a single `.decision-log.md` entry (Decision 2026-06-01-012 supersession) with: sub-sections per active component following §3(a)/(b)/(c); the §3(d) Composition Rationale sub-section above. The final mismatch-ratio must clear the 1.5× threshold before the reconciliation is marked resolved.

---

## §4 Trustee ratification procedure

### Standard quorum

- **Required:** ≥2-trustee sign-off by **distinct** individuals on the reconciliation decision. **Anti-laundering rule (revised 2026-06-01 per review P-17):** if move-SM-1 is in scope, the ≥1-trustee PRD-edit co-signer (§3(b) step 4) counts as one of the ≥2 reconciliation ratifiers; a single trustee may not satisfy both the ratifier-quorum and the PRD-edit co-sign by signing twice in different roles. Move-SM-1 ratification requires at least two distinct trustees.
- **Cascade-rejection rule (revised 2026-06-01 per review P-10):** if the reconciliation decision includes a cut-scope component, the Trustee Panel must reject ratification when the §3(a) downstream-cascade enumeration is incomplete or includes Stories Y with no documented disposition. Cascade-rejected proposals return to Solo Builder for enumeration completion before re-submission.
- **Record:** `.decision-log.md` entry superseding Decision 2026-06-01-012
- **Content of ratification entry:**
  - Decision date
  - Trustees signing (by name + role); distinct-individuals attestation
  - Path(s) ratified (a / b / c / d hybrid)
  - Per-path content (as enumerated in §3 above)
  - Mismatch-ratio computed (floor_ratio, ceiling_ratio, max) per §3(d) Composition Rationale if hybrid
  - **AR-49 P0-3 discharge wording (revised 2026-06-01 per review P-09):** "AR-49 P0-3 Launch Gate Risks row (architecture line 4779) discharge pending Task 11 Step 4 validation report at `_bmad-output/planning-artifacts/implementation-readiness-report-post-reconciliation-YYYY-MM-DD.md`. Full discharge is recorded as a second supersession entry on Decision 2026-06-01-012 at Task 11 closure (see §7 step 5)." The Task 9 ratification record does NOT itself claim AR-49 P0-3 as discharged — it claims the discharge path is committed and pending Task 11 evidence.
  - Supersession-schema-marker: supersedes Decision 2026-06-01-012 open-follow-ups items

### Emergency single-trustee fallback

Per Story 0.9 D-02 precedent + Story 0.7 README §5 precedent: if ≥2-trustee quorum cannot be convened within 30 calendar days of the Solo Builder reconciliation-decision proposal (Task 8 completion), a single-trustee emergency ratification is permitted for the time-bounded 30-day window. The emergency ratification record must:
- Name the second trustee by role with the reason for unavailability
- State the 30-day deadline for second-trustee co-sign
- Be superseded by the standard ≥2-trustee record when the second co-sign is obtained

The emergency fallback is not a permanent bypass. A reconciliation ratified under emergency single-trustee is in force but carries an open follow-up: second-trustee co-sign required within 30 days or the ratification is escalated to a full Trustee Panel emergency session.

### Day-30 reversal procedure (revised 2026-06-01 per review P-11)

If the second-trustee re-review at day 30 **reverses** the emergency single-trustee ratification (e.g., second trustee rejects the cut-scope cascade, the SM-1 ADR rationale, or the contract-help budget), the framework status reverts to pre-ratification:
1. The emergency ratification record is annotated with a reversal supersession entry citing the reversing trustee + rationale + reversal date.
2. Epic List + sprint plan edits made under the now-reversed decision must be rolled back via Solo Builder + ≥2-trustee rollback ratification + supersession entry on the relevant Decision (Decision 012 + any sub-decisions affected).
3. Stories whose `development_status` was flipped to `deferred-to-v2-per-decision-…-012` under the now-reversed cut-scope component are flipped back to their pre-deferral status.
4. PRD §7 SM-1 narrow Edit made under the now-reversed move-SM-1 component is itself reverted via a second PRD-edit narrow Edit + co-sign + supersession entry; the ADR-NNNN-SM-1-amendment is annotated as superseded/withdrawn.
5. AR-49 P0-3 row remains open until a fresh ≥2-trustee reconciliation ratification closes the gate; Epic 1 substrate work paused if it was unblocked under the reversed decision.

### Quorum-unavailable >30 days (revised 2026-06-01 per review P-12)

If Trustee Panel quorum remains unavailable past the 30-day single-trustee emergency window (no second-trustee re-review obtainable), the framework enters an `awaiting-ratification-indefinite` status:
1. AR-49 P0-3 row remains open indefinitely.
2. Solo Builder MAY NOT commit Epic 1 substrate work — Phase-0 prereq gates govern.
3. Framework status escalates to Story 0.6 backup-engineer continuity protocols: if a registered backup engineer with quorum standing exists per Story 0.6, they may convene the Trustee Panel session.
4. If no backup-path quorum exists, Solo Builder records the impasse as a `.decision-log.md` `[GOV]` entry and parks Story 0.12 closure pending Trustee Panel reconstitution.
5. Sprint planning continues for Phase-2+ work (which does not depend on Phase-0 prereq gates per epics line 564) but Phase-1 work is gated.

### Per-path ratification scope

If hybrid, each component is enumerated in the ratification record. The trustees do not ratify a vague "hybrid" — they ratify each specific deferred Story, each specific SM-1 value, each specific contracted scope block. Ambiguity in the ratification record is not acceptable.

---

## §5 Epic List update procedure

Substantive edits to `_bmad-output/planning-artifacts/epics.md` are governance-tracked per the PRD-edit discipline (Solo Builder authors + ≥1-trustee co-sign, following the architecture-vs-PRD boundary feedback discipline):

1. **Cut-scope deletions / deferrals:** Deferred Stories are annotated in `epics.md` with `[DEFERRED-TO-V2 per Decision 2026-06-01-012 supersession, YYYY-MM-DD]` markers. The deferred Story block is NOT deleted from `epics.md` — it is annotated and cross-referenced to `deferred-work.md` entry.

2. **SM-1 move:** No direct `epics.md` edit for SM-1 move alone; the SM-1 is in PRD §7 (separate amendment). If SM-1 move changes Epic demoable-closure target dates, the affected Epic headers are updated with the new target milestone.

3. **Contracted scope:** Contracted Stories are annotated with `[OPS-CONTRACTED per Decision 2026-06-01-012 supersession, YYYY-MM-DD — see decision-log.md OPS entry]`. The contracted scope is NOT removed from `epics.md`; it is flagged as the delivery responsibility of a contracted engineer with Solo Builder code-review accountability.

4. **Co-sign discipline:** Solo Builder prepares the `epics.md` edit; ≥1-trustee co-signs before the edit is committed to the main branch. The co-sign is recorded in the commit message referencing the reconciliation decision ID.

---

## §6 Sprint plan update procedure

Sprint-status.yaml updates are coordinated with the sprint-planning skill output format. At Task 10:

1. **Deferred Stories:** Transition `development_status` from `backlog` to `deferred-to-v2-per-decision-YYYY-MM-DD-012`. Update `last_updated` field. Append a comment: `# Story 0.12 Task 10 reconciliation deferral — see deferred-work.md §Story-0.12-reconciliation-deferrals`.

2. **Contracted Stories:** New `development_status` entries are added for contracted scope if new Stories are created (e.g., if a contracted Epic is split into sub-Stories for accountability). New entries use `ready-for-contract` status (or appropriate equivalent). Each entry carries a comment: `# Story 0.12 Task 10 contracted scope — see decision-log.md OPS entry`.

3. **Timing:** Sprint-status.yaml is updated after the Trustee Panel ratification (Task 9) and before Step 4 validation (Task 11). The `last_updated` field comment records: `Story 0.12 Task 10 reconciliation sprint-plan update YYYY-MM-DD; Decision 2026-06-01-012 supersession ratified YYYY-MM-DD`.

4. **Downstream sprint planning:** After Task 10 sprint-status updates, the next `create-story` or `sprint-planning` skill run will operate from the reconciled scope (cut stories no longer in backlog; contracted stories with updated status). Task 11 Step 4 validation confirms the reconciled scope is the input baseline.

---

## §7 Step 4 final validation procedure

Step 4 final validation runs `bmad-check-implementation-readiness` against the **reconciled scope** (the cut-scope-reduced Epic List + moved SM-1 target + contracted-scope allocations), NOT the original Epic List.

1. **Input baseline:** The reconciled scope is the Epic List as amended at Task 10. Any deferred Stories are excluded. Any contracted Stories carry their updated status.

2. **Validation run:** `bmad-check-implementation-readiness` produces an `implementation-readiness-report-post-reconciliation-YYYY-MM-DD.md` file at `_bmad-output/planning-artifacts/`. The report is versioned by date; prior validation reports at the same path are not overwritten (the date suffix ensures uniqueness).

3. **Gap-list output:** The post-reconciliation report's gap-list rows document any remaining critical-gap categorizations against the reconciled scope. These are not failures — they are the structured output of the validation pass. Any gaps that remain CRITICAL after reconciliation require a second reconciliation loop (rare; expected only if contracted help was committed but the contracted scope did not clear the critical gaps).

4. **AR-49 P0-3 discharge evidence:** The combination of:
   - Decision 2026-06-01-012 supersession record (Task 9 ratification)
   - `implementation-readiness-report-post-reconciliation-YYYY-MM-DD.md` (Task 11 report)
   constitutes the AR-49 P0-3 row discharge evidence per architecture line 4779 + UX §Phase-0 P0-3 launch-blocker.

5. **Decision-log record:** The Task 11 validation outcome is recorded as a second supersession marker on Decision 2026-06-01-012: "Task 11 Step 4 validation completed YYYY-MM-DD; post-reconciliation report at `_bmad-output/planning-artifacts/implementation-readiness-report-post-reconciliation-YYYY-MM-DD.md`; AR-49 P0-3 row discharged."

---

## §8 Reconciliation-vs-re-attestation distinction

The reconciliation and re-attestation share the same framework schema but differ in trigger, frequency, and outcome scope:

| Dimension | First reconciliation (Tasks 8–9) | Re-attestation (annual / per-major-architecture-amendment) |
|---|---|---|
| Trigger | `mismatch_ratio > 1.5` (or no-trigger finding) at Story 0.12 Task 8 | Annual cadence + per-major-architecture-amendment + per-Epic-closure rough-check if drift > confidence band |
| Frequency | One-time (AR-49 P0-3 discharge event) | Periodic (README §6 cadence) |
| Outcome scope | Decision on cut-scope / move-SM-1 / contract-help / hybrid; Epic List + sprint plan updates; Step 4 validation | Estimate accuracy check; drift detection; targeted re-baseline if drift exceeds confidence band |
| Authority | ≥2-trustee ratification (full governance event) | Solo Builder + spot-check trustee sign-off (lighter cadence per README §6) |
| Decision-log record | Decision 2026-06-01-012 supersession entry (full governance record) | New decision entry per re-attestation date (not a supersession of the original — it is a new attestation record) |
| AR-49 P0-3 relationship | Directly discharges the AR-49 P0-3 row | Maintains the discharged state; does not re-open the AR-49 P0-3 row unless a re-attestation surfaces a critical mismatch requiring re-reconciliation |

**The key distinction:** The first reconciliation is an event that closes a launch-gate row. Re-attestation is a cadence that keeps estimates honest as the build proceeds. They invoke the same formulas but serve different governance purposes. Conflating the two (e.g., treating a re-attestation finding as requiring a full ≥2-trustee emergency ratification) is operationally incorrect. Conversely, treating a trigger-level re-attestation finding as a routine spot-check without trustee escalation is also incorrect.

---

## §9 Cross-reference back to upstream framework artifacts

Every upstream "Story 0.12 reconciliation territory" cross-reference logged in `backfill-log.md` is updated at Task 9 closure with the substantive reconciliation outcome. The update procedure:

1. **At Task 9 ratification:** Solo Builder prepares a diff of every `backfill-log.md` row where `backfill_status = citation-slot-committed`. For each row: replace `citation-slot-committed` with `substantive-backfill-applied`; populate `backfill_date` with the Task 9 ratification date; update `notes` with a one-sentence summary of the outcome (e.g., "cut-scope: Story X.Y deferred to v2 per reconciliation decision YYYY-MM-DD-012").

2. **Source file edits with line-drift handling (revised 2026-06-01 per review P-18):** For each row in `backfill-log.md`, the corresponding `source_file` + `source_line` in the upstream artifact is updated to replace the `pre_existing_xref_text` ("Story 0.12 reconciliation territory" placeholder) with the resolved-outcome text. Procedure with explicit drift handling:
   - **Step a (verify):** Solo Builder reads `source_file` at the recorded `source_line`. If the `pre_existing_xref_text` is present at that line, proceed to step c (edit).
   - **Step b (drift recovery, if line moved):** If `pre_existing_xref_text` is NOT present at the recorded line, grep the file for the exact `pre_existing_xref_text` string. If found at a different line: update the `backfill-log.md` row's `source_line` via a supersession entry (forbidden-removal rule applies; the original row is annotated with a `superseded` marker pointing at the new row carrying the updated line). Then proceed to step c.
   - **Step c (narrow edit):** Apply the replacement text via narrow Edit; verify the change landed at the correct line + section; commit with a message referencing the reconciliation decision ID + backfill-log row ID.
   - **Step d (halt on miss):** If `pre_existing_xref_text` is not found anywhere in `source_file`, Task 9 halts. Solo Builder raises an Open Question in the story file + Trustee Panel session: the upstream artifact may have been substantively rewritten in a way that vacated the reconciliation territory, OR the backfill-log row was authored incorrectly at Task 6. Either resolution requires Trustee Panel adjudication before Task 9 can continue.

3. **Backfill-log supersession marker:** The `supersession-schema-marker` column in `backfill-log.md` is updated with the ratification decision ID and the `backfill_date` at Task 9.

4. **Row-count discipline (revised 2026-06-01 per review P-21):** The `backfill-log.md` row count is frozen at author-commit (19 rows). Post-author-commit row additions require Solo Builder + ≥1-trustee co-sign as a supersession entry + a corresponding Decision 012 follow-up entry naming the row added and the rationale. Specifically: a new row is permitted ONLY if (a) the grep at Task 6 demonstrably missed an upstream "Story 0.12 reconciliation territory" reference that existed at Task 6 commit time (verify via git history), OR (b) the Trustee Panel ratifies an inventory-predicate amendment (e.g., extending the predicate beyond explicit-text grep) as part of the Task 9 decision. Casual additions without governance review are forbidden.

### Cross-reference index

The complete list of upstream artifacts with "Story 0.12 reconciliation territory" cross-references is in `backfill-log.md`. The 19-row set at author-commit includes all rows found via grep of the project at 2026-06-01. Source files: primarily `docs/fallback-handler-ledger/loop-nodes/*.md §5`, `docs/fallback-handler-ledger/operations-lead-commitment.md`, and `docs/fallback-handler-ledger/README.md`.
