# Architectural Launch-Gate Inventory

**Authority cites:** architecture §Launch Gate Risks (architecture lines 4768-4791: 12-row table + disposition vocabulary line 4773 `closed` / `accepted risk` / `deferred per named criteria` / `reframed`; Owner / Support columns; "binary closure is not required"); architecture §Gap Analysis conditional-escalation observations (architecture lines 4802-4815 Composed Account State + lines 4817-4828 Feature-flag tool selection P1 + lines 4830-4840 FR-20 pool-spawn capacity envelope); architecture §Architecture Readiness Assessment line 5033 ("Owner / Support assignments on Launch Gate Risks eliminate single-threaded ambiguity"); architecture §Control-Demonstration-Schedule lines 4942-4959 (first-exercise + review-cadence pattern); architecture §Implementation Handoff §Decision Freeze lines 5101-5111; AR-49 (epics line 331 verbatim: "PRD §12 Phase 0 inherits architecture's gate inventory by reference. All entries in architecture §Launch Gate Risks must reach closure or explicit disposition before Phase 1 transition. Includes P0-1 through P0-5 validation experiments + Cloudflare/DPDPA gate + FR-20 capacity gate. Substrate-conditional implementation commitments not frozen until P0-5 closes; exploration/prototyping/validation may proceed."); epics line 689 Epic 0 Deliverable ("Architectural launch-gate inventory — all entries in architecture §Launch Gate Risks scheduled with named owner + closure criteria (per Sprint Change Proposal Item 17 + AR-49)"); epics line 691 Epic 0 FRs-covered list (Story 0.15 discharges AR-49); epics line 564 cross-cutting Phase-0 prereq gates; PRD §12 Phase 0 line 1467 verbatim ("Architectural launch-blocker gates — all entries in architecture §Launch Gate Risks must reach closure or explicit disposition before Phase 1 transition. The list includes the P0-x validation experiments and decision / validation gates surfaced via architecture's Gap Analysis. **Substrate-conditional implementation commitments must not be frozen until P0-5 closes; exploration, prototyping, and validation work may proceed.** Architecture remains the source of truth for gate definitions and closure criteria; PRD references the gate inventory but does not duplicate it"); Sprint Change Proposal Item 17 (sprint-change-proposal-2026-05-27.md lines 1198-1236: EDIT 17A PRD §12 Phase 0 bullet + EDIT 17B explicit disposition language); Decision 2026-06-03-015.

## §1 — Why a top-level surface

Architecture commits the gate inventory + per-row Owner + Support assignments + disposition vocabulary at lines 4768-4791. PRD §12 Phase 0 line 1467 commits the policy that every entry must reach closure-or-disposition before Phase 1 transition. AR-49 commits the inheritance contract. Sprint Change Proposal Item 17 commits the substantive PRD-side bullet + the architecture-side explicit disposition language. None of these surfaces commits the trustee-side **operational governance**: per-row named owner-with-target-date, objective testable closure-criteria, ≥2-trustee inventory ratification, monthly review cadence, escalation protocol for missed targets, annual re-attestation. That governance surface is broader than any single existing framework directory's scope — it crosses runbooks, escrow, degradation policy, KT pack, backup engineer, fallback-handler ledger, spec-to-cadence reconciliation, legal-counsel engagement, and native-stack validation. The unified directory `docs/launch-gate-inventory/` discharges the AR-49 + epics line 689 + PRD §12 Phase 0 line 1467 + Sprint Change Proposal Item 17 + architecture §Launch Gate Risks operationalization commitment as a single trustee-accessible surface.

This directory is parallel to the ten existing framework directories (`docs/runbooks/`, `docs/escrow/`, `docs/degradation-policy/`, `docs/knowledge-transfer/`, `docs/adr/`, `docs/backup-engineer/`, `docs/fallback-handler-ledger/`, `docs/spec-to-cadence-reconciliation/`, `docs/legal-counsel-engagement/`, `docs/native-stack-validation/`) per the Story 0.2-0.7 + 0.12 + 0.13 + 0.14 framework-as-top-level-surface pattern.

## §2 — Framework lifecycle

1. **Author-commit** (Story 0.15 Tasks 1-7, dated 2026-06-03) — seven framework files + ~13 cross-reference edits + Decision 2026-06-03-015 entry in `.decision-log.md`.
2. **Trustee Panel inventory ratification** (Story 0.15 Task 8, `_AWAITING EXTERNAL ACTION_`) — ≥2-trustee review + ratification of per-row owner + per-row closure-criteria + per-row target-date. Recorded as `.decision-log.md` `[VALIDATION]` supersession entry on Decision 015. Engagement-ledger §3 row appended.
3. **First monthly review** (Story 0.15 Task 9, `_AWAITING EXTERNAL ACTION_`) — within 4 weeks of inventory ratification. Agenda per `monthly-review-cadence-protocol.md` §2. Meeting-minutes written at `meeting-minutes/YYYY-MM-DD.md`.
4. **Ongoing monthly cadence** (Story 0.15 Task 9 ongoing) — monthly until all entries close-or-defer-with-ADR per AC-1. Emergency reviews triggered per `monthly-review-cadence-protocol.md` §6.
5. **Per-row closure events** (Story 0.15 Task 10 ongoing) — as prior Phase-0 portfolio Stories' Tasks 7-11 substantively close (Story 0.6 + 0.7 + 0.8-0.11 + 0.12 + 0.13 + 0.14), as Legal Counsel returns land (Story 0.13), as Trust formation activities discharge (Trustee Panel direct ownership), the corresponding `inventory-roster.md` row `current_status` flips with `closure_evidence_link` populated. Per-row closure ratified by ≥2-trustee at the next monthly review.
6. **All-rows-closed-or-deferred final sign-off** (Story 0.15 Task 11, `_AWAITING EXTERNAL ACTION_`) — every row at one of the architecture-allowed dispositions per architecture line 4773. Recorded as Decision 015 supersession entry "Phase 1 launch readiness signal armed" with ≥2-trustee ratification.
7. **Annual re-attestation** (Story 0.15 Task 11 ongoing) — Trustee Panel walks the inventory annually to confirm closed-row evidence still holds + accepted-risk rows still valid + deferred-per-named-criteria predicates still operative + reframed dispositions still consistent.

## §3 — Four-way property / control / policy / gap-analysis discipline

Per [[feedback_architecture_vs_adr_boundary]] + [[feedback_architecture_vs_prd_boundary]] + [[feedback_gap_analysis_observational]] + [[feedback_closure_language_precision]]:

| Discipline | Substance | Cite |
|---|---|---|
| **Property** (architecture-committed) | 12-row gate inventory + per-row Owner + Support + disposition vocabulary + Gap Analysis conditional-escalation observations; Phase 1 transition requires closure-or-disposition | architecture lines 4768-4791 + 4773 + 4802-4815 + 4817-4840 + 5033 + AR-49 line 331 |
| **Control** (this framework) | inventory-roster.md + closure-criteria-rubric.md + target-date-rationale-template.md + monthly-review-cadence-protocol.md + escalation-protocol.md + engagement-ledger.md + Decision 2026-06-03-015 + per-row closure events as they occur | `docs/launch-gate-inventory/` (this directory) |
| **Policy** (operations) | ≥2-trustee inventory ratification (Task 8) + ≥2-trustee per-row closure (Task 10) + monthly review cadence (Task 9) + escalation per missed-target (Task 9 ongoing) + annual re-attestation (Task 11 ongoing) + closure-status-aggregation discipline (rows flip on Decision supersession + Tasks 7-11 substantive closure, NOT framework-author-commit `done`) | AC-1 + AC-2 + monthly-review-cadence-protocol.md + escalation-protocol.md |
| **Gap-analysis** (observational) | Three conditional-escalation candidates from architecture §Gap Analysis tracked as Rows 12-14 with verbatim predicates; architecture-vs-UX/epics P0-4 divergence documented in Row 6 + engagement-ledger §9 | architecture lines 4802-4815 + 4817-4840 + Stories 0.13/0.14 Notes |

## §4 — Structural invariants

1. **Every row carries named owner + objective testable closure-criteria + target date** per AC-1 wording. Empty owner / placeholder closure-criteria / "TBD" target-date are rejected.
2. **≥2-trustee inventory ratification** per AC-1 wording "inventory is signed off by ≥2 trustees". Task 8 cannot close with fewer than two ratifying trustees.
3. **Monthly review cadence until close-or-defer-with-ADR** per AC-1 wording. Revert to quarterly under Tier C only when all P0-N rows close + only stable open-gates remain.
4. **Closure-evidence-link required** per AC-2 wording "evidence of closure is linked — the ADR, the test result, the signed-off runbook, etc." Silent closure (status flip without evidence-link) is forbidden.
5. **Missed-target rows escalate** per AC-2 wording "any entry that misses its target date triggers an escalation review at the next trustee meeting".
6. **Closure-language precision** per [[feedback_closure_language_precision]] — each row is **Closed by [edit]** (concrete closure-evidence-link populated; status = `closed` / `accepted-risk` / `deferred-per-named-criteria` / `reframed` with rationale), **Resolved via explicit deferral** (status = `deferred-per-named-criteria` with predicate per architecture line 4773), or **Not addressed** (status remains `open` past target-date — triggers escalation). Never silent.
7. **Architecture remains source-of-truth for gate-definitions** per PRD §12 Phase 0 line 1467 verbatim + [[feedback_architecture_vs_prd_boundary]]. The inventory cites architecture row labels VERBATIM (architecture lines 4778-4788); the inventory does NOT amend architecture row labels. The architecture-vs-UX/epics P0-4 divergence is documented not silently corrected.
8. **Gap Analysis observations elevate to Launch Gate Risks ONLY when predicate materializes** per [[feedback_gap_analysis_observational]]. `conditional-escalation-pending-predicate` is a legitimate row status; pre-emptive elevation is forbidden.
9. **Relative-to-fact triggers preferred over calendar offsets** per [[feedback_architecture_vs_adr_boundary]] worked-example "use `valid_through + 1 day`, not 'Day +366'". Target-dates are anchored to verifiable events ("Story 0.13 Task 7 trustee scope ratification + 2 weeks for first-artifact submission") rather than bare calendar dates.
10. **Append-only inventory-roster + forbidden-removal + supersession-only lifecycle** — row-status changes are supersession entries with prior-status preserved in supersession-marker. Inherited from Stories 0.3/0.4/0.5/0.6/0.7/0.12/0.13/0.14.
11. **Weak-closure-criteria rejected** per `closure-criteria-rubric.md` §4 — Solo Builder belief without artifact; "the work is in progress" without milestone artifact; messaging-app discussion without `.decision-log.md` entry; "discussed at last trustee meeting" without meeting-minutes evidence-link; per-Story `done` status alone insufficient (must cite Decision-log entry).
12. **Annual re-attestation walk-through cadence** per [[feedback_architecture_vs_adr_boundary]] Enforcement Tier C — Trustee Panel walks the inventory annually to confirm closed-row evidence still holds + accepted-risk rows still valid + deferred-per-named-criteria predicates still operative + reframed dispositions still consistent.
13. **Trustee-quorum threshold = ≥2 uniform** across inventory-ratification (Task 8) + per-row closure (Task 10) + final all-rows-closed-or-deferred sign-off (Task 11). Distinct from Story 0.14's ≥1-trustee BigDev-decision-authority pattern (substrate-binding-for-v1 under BigDev authority). Re-litigation post-Epic-1 launch of a closed gate requires the same ≥2-trustee threshold; per-row closure cannot land under single-trustee fallback even for low-stakes rows.
14. **Closure-status-aggregation discipline** — rows flip to `closed` ONLY on substantive Decision supersession entry + Tasks 7-11 external action closure + ratifying trustees ≥2, NOT per-Story framework-author-commit `done` status. The more-protective-governs disposition per [[feedback_closure_language_precision]] forbids aspirational closure. At Story 0.15 author-commit, Row 1 (Story 0.6 A-13) and Row 2 (Story 0.12 P0-3) are `in-progress`: framework-leg discharge via prior Story Decision supersession entries is substantive, but ≥2-trustee ratification under this inventory's governance framework is pending until Task 9 first monthly review. Rows 3-11 remain `open`; Rows 12-14 remain `conditional-escalation-pending-predicate`.

## §5 — Sign-off lifecycle

- **Task 8 inventory ratification** — ≥2-trustee quorum + Solo Builder presents + Legal Counsel attends if scope-relevant rows on agenda (Rows 3, 8, 9, 10). Recorded as `.decision-log.md` `[VALIDATION]` supersession entry on Decision 015 with ratifying trustees + date + ratified-inventory-version + per-row target-date + per-row closure-criteria.
- **Task 10 per-row closure** — ≥2-trustee quorum at the next monthly review per `monthly-review-cadence-protocol.md` §3. Per-row supersession entry on Decision 015 + engagement-ledger §5 row + `inventory-roster.md` row status flip + `closure_evidence_link` populated.
- **Task 11 final all-rows-closed-or-deferred sign-off** — ≥2-trustee quorum + Phase 1 launch readiness signal armed. Recorded as Decision 015 supersession entry "Architectural launch-gate inventory all rows closed-or-deferred-with-ADR; Phase 1 launch readiness signal armed".
- **Emergency single-trustee fallback** — time-bounded 30 days per Story 0.9 D-02 + Story 0.7 README §5 precedent; second trustee ratification within 30 days OR the closure is voided. Permitted only when documented unavailability of a second trustee prevents quorum; never used to expedite a routine closure.

## §6 — Re-attestation cadence

- **Monthly** — full inventory triage per `monthly-review-cadence-protocol.md` §2 agenda until all rows close-or-defer-with-ADR per AC-1.
- **Quarterly fallback** — Tier C cadence under `monthly-review-cadence-protocol.md` §4 when all Phase-0-discharging P0-N rows (Rows 2, 4, 5, 7) close + only stable open-gates remain (e.g., `trust-formation-and-legal-registration` sub-row decomposition stage). Row 6 excluded per D-02 resolution.
- **Annual full-inventory walk-through** — per `monthly-review-cadence-protocol.md` §7 + [[feedback_architecture_vs_adr_boundary]] Tier C — Trustee Panel walks the inventory annually to confirm closed-row evidence still holds + accepted-risk rows still valid + deferred-per-named-criteria predicates still operative + reframed dispositions still consistent.
- **Per-row periodic re-attestation triggers** — per `escalation-protocol.md` §1 trigger 2 (closure-evidence retraction) + trigger 3 (conditional-escalation predicate materialization).

## §7 — Open ADR slots

The following structural questions are surfaced during inventory authoring and deserve substantive ADR write at Tasks 8-11 (slot-reserved-pre-write at `docs/knowledge-transfer/adr-index.md` Section L per Story 0.15 author-commit):

1. **Slippage-tolerance per gate-class** — `target-date-rationale-template.md` §2 commits a `slippage_tolerance` field in trustee-meeting-cycles. ADR scope: per gate-class default values (P0-N gates = 1 cycle; legal-counsel-named rows = 2 cycles; trust-formation sub-rows = 3 cycles); per-row override discipline.
2. **Decomposition strategy for `trust-formation-and-legal-registration` sub-rows** — `escalation-protocol.md` §3 commits the `decompose-to-sub-gates` outcome. ADR scope: trust-deed-filing + 12A/12AB-registration + GST-registration + DPDPA-Data-Fiduciary-registration sub-row schema; per-sub-row owner + target-date + closure-criteria.
3. **Conditional-escalation predicate materialization criteria** for Rows 12-14 — `inventory-roster.md` Rows 12-14 + `escalation-protocol.md` §1 trigger 3. ADR scope: how Trustee Panel decides predicate has materialized; observation evidence required; cross-Story coupling discharge.
4. **Monthly-review meeting cadence integration with Trustee Panel standing meetings** — `monthly-review-cadence-protocol.md` §4. ADR scope: standalone meeting vs. agenda-item in standing Trustee Panel meeting; meeting-frequency floor; quorum-availability fallback.
5. **Emergency-review trigger threshold calibration** — `monthly-review-cadence-protocol.md` §6. ADR scope: "P0 gate slipping >1 month" calibration vs. claim-funnel pressure; per-gate-class threshold tuning.
6. **≥2-trustee quorum fallback under trustee-availability gaps** — Story 0.15 §5 sign-off lifecycle emergency single-trustee fallback. ADR scope: 30-day window calibration vs. closure stickiness; second-trustee retrospective ratification protocol.

Each slot inherits the Story 0.13 + 0.14 pre-staging discipline (`slot-reserved-pre-write` status; Story-trigger column).

## §8 — Related continuity + governance surfaces

| Surface | Story | Authority cite |
|---|---|---|
| Operational runbooks | Story 0.1 | epics line 700 |
| Credential escrow | Story 0.2 | epics line 700 |
| Code escrow | Story 0.3 | epics line 700 |
| Degradation policy | Story 0.4 | epics line 700 |
| Knowledge-transfer pack | Story 0.5 | epics line 700 |
| Backup engineer contract | Story 0.6 | epics line 700 + AR-13 |
| Fallback-handler ledger | Story 0.7 | epics line 700 + UX-DR4 + P0-1 |
| Spec-to-cadence reconciliation | Story 0.12 | epics line 689 + AR-49 + P0-3 |
| Legal-counsel engagement | Story 0.13 | epics line 687 + UX P0-4 |
| Native-stack validation | Story 0.14 | epics line 688 + UX P0-5 + AR-49 |
| **Architectural launch-gate inventory** (this directory) | **Story 0.15** | **architecture §Launch Gate Risks + AR-49 + epics line 689 + PRD §12 Phase 0 line 1467 + Sprint Change Proposal Item 17** |

## §9 — Disjoint anchor

Story 0.15 is **distinct** from the prior six Phase-0 portfolios. The seven portfolios discharge mutually disjoint properties:

- **Bus-factor-of-one mitigation portfolio (Stories 0.1-0.6)** — "the trust survives Solo Builder unavailability >7 days"
- **Loop-node operational-responsiveness portfolio (Story 0.7)** — "every Phase-1 loop node has a named, funded, on-rota fallback handler"
- **Empathy field-work portfolio (Stories 0.8-0.11)** — "downstream design decisions in Epics 3, 6, 8, 10 are grounded in lived experience"
- **Spec-to-cadence-funding-reconciliation portfolio (Story 0.12)** — "the engineer-month estimate vs SM-1 mismatch is resolved on the record"
- **Legal-counsel-concurrent-review portfolio (Story 0.13)** — "legal counsel onboarded before §1 Trust Loops engineering work begins"
- **Native-stack-validation portfolio (Story 0.14)** — "RN + Tamagui working assumption is empirically validated on three test devices before substrate-dependent engineering begins"
- **Architectural-launch-gate-inventory portfolio (Story 0.15 — THIS directory)** — "every architecture §Launch Gate Risks entry is scheduled with named owner + objective testable closure criteria + target date + monthly trustee-panel review until close-or-defer-with-ADR; Phase 1 launch readiness signal is armed when all rows close-or-defer"

Story 0.15 is unique among the seven portfolios in that it is an **aggregation surface** — it consumes the prior six portfolios' closures rather than discharging an independent property. Architecturally, Story 0.15 is the trustee-side dashboard for Phase 1 launch readiness; the per-portfolio Stories produce the substantive content that Story 0.15 indexes. Story 0.15 closure is the Epic 0 Deliverable per epics line 689 + AR-49 operationalization per epics line 331 + Sprint Change Proposal Item 17 + PRD §12 Phase 0 line 1467 substantive backing + Phase 1 launch readiness signal armed when all-rows-closed-or-deferred. Story 0.15 is the **SEVENTH Phase-0 portfolio** distinct from the six preceding.

## §10 — Domain glossary

- **Launch Gate Risk** — entry in architecture §Launch Gate Risks (architecture lines 4768-4791); must reach closure-or-disposition before Phase 1 transition per PRD §12 Phase 0 line 1467 + AR-49.
- **AR-49** — epics line 331 architectural requirement committing PRD §12 Phase 0 inheritance + substrate-conditional-not-frozen-until-P0-5.
- **Sprint Change Proposal Item 17** — sprint-change-proposal-2026-05-27.md lines 1198-1236; EDIT 17A PRD §12 Phase 0 bullet + EDIT 17B architecture §Launch Gate Risks explicit disposition language.
- **PRD §12 Phase 0** — PRD line 1467; commits the policy that all gates must reach closure-or-disposition before Phase 1 transition; architecture remains source-of-truth.
- **closure-criteria** — objective testable signal that flips a row from a pre-closure state to one of the architecture-allowed dispositions; consulted at every monthly review per `closure-criteria-rubric.md`.
- **target-date** — per-row date or trigger-event that anchors the closure expectation; relative-to-fact triggers preferred over calendar offsets per [[feedback_architecture_vs_adr_boundary]].
- **current-status** — per-row state per `inventory-roster.md`; one of `open` / `in-progress` / `closed` / `accepted-risk` / `deferred-per-named-criteria` / `reframed` (architecture-allowed dispositions) or `conditional-escalation-pending-predicate` (Story 0.15 Rows 12-14 only).
- **disposition vocabulary** — `closed` / `accepted-risk` / `deferred-per-named-criteria` / `reframed` per architecture line 4773 verbatim.
- **conditional-escalation-pending-predicate** — Story 0.15-introduced state for Rows 12-14; legitimate row status per [[feedback_gap_analysis_observational]]; row remains in this state until predicate materializes (→ `open`) or Phase 1 launch (→ `accepted-risk` / `deferred-per-named-criteria` per Trustee Panel disposition).
- **missed-target escalation** — escalation review at the next trustee meeting per `escalation-protocol.md` §1; outcomes per `escalation-protocol.md` §3 vocabulary.
- **monthly-review cadence** — `monthly-review-cadence-protocol.md` §4; monthly until all entries close-or-defer-with-ADR per AC-1.
- **≥2-trustee quorum** — uniform threshold across inventory-ratification (Task 8) + per-row-closure (Task 10) + final sign-off (Task 11); distinct from Story 0.14's ≥1-trustee BigDev-decision-authority pattern.
- **closure-evidence-link** — substantive link to objective evidence (Decision-log entry; ADR substantively populated; signed-off runbook; passing CI test; trustee-signed contract; ratified Decision supersession entry; Legal Counsel first-artifact return; `_bmad-output/research/<artifact>.md`); multi-link rows permitted per `closure-criteria-rubric.md` §6.
- **root-cause inquiry** — Trustee Panel inquiry triggered when any row escalates >2 times in same calendar quarter per `escalation-protocol.md` §5; Solo Builder authors root-cause memo + Trustee Panel decides outcome.
- **relative-to-fact trigger** — target-date format preferred per [[feedback_architecture_vs_adr_boundary]] worked-example; e.g., "Story 0.13 Task 7 trustee scope ratification + 2 weeks for first-artifact submission".
- **calendar offset** — forbidden target-date format per [[feedback_architecture_vs_adr_boundary]] worked-example; e.g., "Day +366" or "2026-12-31" without trigger-event context.
- **substantive backing** — the property that a downstream policy bullet (e.g., PRD §12 Phase 0 line 1467) is backed by an operational governance surface (e.g., this framework + Trustee Panel ratification + monthly review + per-row closure) rather than aspirational text.
- **aggregation surface** — Story 0.15's structural role; the framework consumes prior Phase-0 Story closures as closure-evidence rather than discharging an independent property.
- **trustee oversight** — the ≥2-trustee quorum review + ratification discipline applied at inventory-ratification + per-row-closure + final-sign-off + annual re-attestation events.
- **P0-N divergence** — the architecture-vs-UX/epics numbering divergence: architecture line 4783 names P0-4 = "Empty/Skeleton/Error Inventory" (UX deliverable); epics line 687 + UX spec line 109 name P0-4 = "legal counsel onboarding" (Story 0.13 discharge). Documented in `inventory-roster.md` Row 6 + engagement-ledger §9 per [[feedback_architecture_vs_prd_boundary]].
- **A-13 backup engineer retainer** — Row 1 of inventory-roster; discharged by Story 0.6.
- **P0-1 Lifecycle Operational-State Coverage** — Row 4 of inventory-roster; discharged by Story 0.7.
- **P0-2 Member-Class Validation** — Row 5 of inventory-roster; discharged by Stories 0.8 + 0.9 + 0.10 + 0.11 (P0-2a/b/c/d).
- **P0-3 Spec-to-Cadence Reality Check** — Row 2 of inventory-roster; discharged by Story 0.12.
- **P0-4 (architecture)** — Row 6 of inventory-roster; "Empty/Skeleton/Error Inventory" UX deliverable; not Story 0.13-discharged; likely downstream Epic 1 or Epic 11a deliverable.
- **P0-4 (UX/epics)** — discharged by Story 0.13 (legal counsel onboarding) + reflected via Rows 3, 8, 9, 10 (subsidiary legal-counsel-naming rows at architecture lines 4785-4788).
- **P0-5 Native-Stack Validation Experiment** — Row 7 of inventory-roster; discharged by Story 0.14.
- **Edge/WAF DPDPA-compatibility decision** — Row 3 of inventory-roster; Cloudflare-incompatible → self-hosted WAF pivot per architecture §5.8a; discharged via Story 0.13 Legal Counsel return.
- **DPDPA grievance officer designation** — Row 8 of inventory-roster; Trustee Panel designation discharged via Story 0.13 Legal Counsel return.
- **FR-43A external forum destination** — Row 9 of inventory-roster; district / state consumer commission, civil court selection; discharged via Story 0.13 Legal Counsel return.
- **Regulatory surface sign-off** — Row 10 of inventory-roster; trust + DPDPA + UPI 13-row regulatory surface; discharged via Story 0.13 Legal Counsel returns + per-row Trustee Panel sign-off.
- **Trust formation and legal registration** — Row 11 of inventory-roster; Trustee Panel direct ownership; decomposable into trust-deed-filing + 12A/12AB-registration + GST-registration + DPDPA-Data-Fiduciary-registration sub-rows.
- **Feature-flag tool selection (P1)** — Row 12 of inventory-roster; conditional-escalation-pending-predicate; architecture lines 4817-4828 verbatim predicate.
- **FR-20 pool-spawn capacity envelope** — Row 13 of inventory-roster; conditional-escalation-pending-predicate; architecture lines 4830-4840 verbatim predicate.
- **Composed Account State enumeration** — Row 14 of inventory-roster; conditional-escalation-pending-predicate; architecture lines 4802-4815 verbatim predicate.

## §11 — File index

- `README.md` — this file. Framework lifecycle + ≥14 structural invariants + sign-off lifecycle + re-attestation cadence + open ADR slots + related continuity surfaces + disjoint anchor + domain glossary + file index.
- `inventory-roster.md` — 15 rows (11 architecture §Launch Gate Risks verbatim from lines 4778-4788 + 3 conditional-escalation candidates from §Gap Analysis lines 4802-4815 + 4817-4840 + 1 reserved). Append-only + supersession-only lifecycle.
- `closure-criteria-rubric.md` — objective evidence vocabulary + testable signal vocabulary + weak-closure-criteria rejection examples + per-disposition closure-evidence requirements + multi-link rows.
- `target-date-rationale-template.md` — per-row rationale schema + date format conventions (relative-to-fact triggers preferred) + sequenced gates pattern + decomposed gates pattern + conditional candidates pattern + annual re-attestation + worked examples.
- `monthly-review-cadence-protocol.md` — meeting agenda template + quorum + cadence + meeting-minutes schema + emergency review triggers + annual re-attestation walk-through.
- `escalation-protocol.md` — escalation triggers + outcomes vocabulary + escalation log row schema + repeat-escalation root-cause inquiry trigger + Phase 1 launch readiness signal.
- `engagement-ledger.md` — §1-§11 lifecycle log; §1 Header + §2 Lifecycle + §9 P0-N divergence reconciliation + §10 Pack-revision-log scaffold + §11 Cross-links substantively populated at Task 7 author-commit; §3-§8 carry `<PENDING-TASK-N>` placeholders for the lifecycle events that land at Tasks 8-11.
- `meeting-minutes/` (subdirectory) — created at first monthly review (Task 9); per-meeting file `YYYY-MM-DD.md` per `monthly-review-cadence-protocol.md` §5 schema.
