# Spec-to-Cadence Reconciliation Framework

**Status:** Author-committed 2026-06-01 per Decision 2026-06-01-012. The framework scaffolding (methodology + worksheet schema + per-loop-node + per-Tier-N entries + reconciliation-decision-framework + backfill-log) is complete. Substantive engineer-month estimates per loop node + per Tier-N surface are **Task 7 territory — _AWAITING EXTERNAL ACTION_ (Solo Builder)**. Mismatch-ratio computation + reconciliation-decision proposal are **Task 8**. ≥2-trustee ratification is **Task 9**. Epic List + sprint plan updates are **Task 10**. Step 4 final validation against reconciled scope is **Task 11**.

**Authority:** UX §Phase-0 P0-3 (UX spec line 107) + AR-49 P0-3 Launch Gate Risks row (architecture line 4779) + architecture §P0-3 reconciliation note (architecture lines 4793-4800) + architecture §Confidence Level (architecture line 5021) + epics line 564 Phase-0 prereq gates + PRD §9.0 + §9.1.1 "patience as discipline" + PRD §7 SM-1 6-9 month target (PRD line 1329)

---

## §1 Why a top-level surface

`docs/spec-to-cadence-reconciliation/` is a new top-level surface under `docs/`, parallel to `docs/runbooks/`, `docs/escrow/`, `docs/degradation-policy/`, `docs/knowledge-transfer/`, `docs/adr/`, `docs/backup-engineer/`, and `docs/fallback-handler-ledger/`.

The spec-to-cadence reconciliation framework earns its own top-level directory because:

1. **It discharges a distinct launch gate.** UX §Phase-0 P0-3 + AR-49 P0-3 + architecture §P0-3 reconciliation note are governance commitments that do not fit within any existing directory's scope (runbooks cover operational procedures; escrow covers continuity; KT pack covers backup-engineer onboarding; fallback-handler-ledger covers loop-node operational responsiveness). The reconciliation surfaces a scope-vs-cadence-funding question that gates *all* engineering per epics line 564.

2. **It governs the full lifecycle of engineer-month estimation + reconciliation-decision.** The methodology + worksheet + per-loop-node + per-Tier-N entries + reconciliation-decision-framework + backfill-log constitute a coherent governance instrument that spans Solo Builder authoring → mismatch-ratio computation → Trustee Panel ratification → Epic List + sprint plan propagation → Step 4 validation. No existing directory provides this lifecycle.

3. **It is the routing surface for cross-Story funding-tradeoff conversations.** Stories 0.6 (backup engineer A-13 sizing), 0.7 (Operations Lead salary; per-loop-node fallback-handler funding-status posture × 8), 0.13 (legal counsel engagement budget), and 0.14 (prototype device-procurement budget) all park funding-tradeoff cross-references here rather than re-litigating each per-Story. The unified surface prevents ad-hoc per-Story funding decisions that are individually coherent but collectively unreconciled.

4. **It mirrors the Stories 0.2–0.7 framework-as-top-level-surface pattern.** Each prior Phase-0 portfolio established its own directory: Stories 0.2–0.3 → `docs/escrow/`; Story 0.4 → `docs/degradation-policy/`; Story 0.5 → `docs/knowledge-transfer/`; Story 0.6 → `docs/backup-engineer/`; Story 0.7 → `docs/fallback-handler-ledger/`. Story 0.12 → `docs/spec-to-cadence-reconciliation/` extends this pattern as the fourth distinct Phase-0 portfolio.

## §2 Framework lifecycle

```
Author-commit (Tasks 1-6)
  → Solo Builder substantive estimate authoring per loop node + per Tier-N surface (Task 7)
    → Solo Builder mismatch-ratio computation + reconciliation-decision proposal (Task 8)
      → Trustee Panel review + ≥2-trustee ratification (Task 9) → .decision-log.md supersession entry
        → Epic List + sprint plan substantive updates (Task 10; Solo Builder + ≥1-trustee co-sign)
          → Step 4 final validation via bmad-check-implementation-readiness against reconciled scope (Task 11)
            → AR-49 P0-3 row discharge + Epic 1 substrate-work unblock
              ↓
              Annual re-attestation OR per-major-architecture-amendment re-attestation
```

At any node, the closure state is one of three per [[feedback_closure_language_precision]]: **Closed by [edit]** (Tasks 1-6 framework scaffolding); **Resolved via explicit deferral** (Tasks 7-11 pending external action); **Not addressed** (should not occur — raises an Open Question if observed).

## §3 Four-way property / policy / control / gap-analysis discipline

This framework applies the four-way split established by Stories 0.4 + 0.5 + 0.6 + 0.7:

| Layer | What it commits | Where it lives |
|---|---|---|
| **Property** (architecture-equivalent) | Engineer-month estimates carry floor + ceiling + confidence band (never single-point); estimates forbid round-number-without-rationale; explicit unknowns permitted (`TBD-pending-X-substrate-decision`); mismatch-ratio computation is deterministic + uses `max(floor_ratio, ceiling_ratio) > 1.5×` more-protective-governs rule; reconciliation-decision is one or more of cut-scope / move-SM-1 / contract-help; silent acceptance of the gap is FORBIDDEN; PRD §9.1.1 "patience as discipline" governs the move-SM-1 path | `README.md` §4 Structural invariants; `estimation-methodology.md` §3 + §6 + §7; `reconciliation-decision-framework.md` §1 + §2 |
| **Policy** (PRD-equivalent) | How the trust commits to engineering-effort estimation discipline (per-row methodology with assumption catalogue); how the trust ratifies reconciliation decisions (≥2-trustee sign-off; emergency single-trustee fallback time-bounded 30 days); re-attestation cadence policy (annual + per-major-architecture-amendment + per-Epic-closure rough-check); Epic List + sprint plan substantive edits are governance-tracked (Solo Builder + ≥1-trustee co-sign per PRD-edit discipline); cut-scope-deferred Stories land in `deferred-work.md` | `README.md` §6 Re-attestation cadence fallback; `reconciliation-decision-framework.md` §3–§6 |
| **Control** (ADR territory) | Specific estimation tool (spreadsheet vs prose ledger); estimation-recall mechanism for re-attestation; cut-scope-vs-defer-vs-cancel taxonomy refinement; contracted-help vendor accountability mechanism; per-Pariwar localization (Epic 1 multi-Pariwar territory); per-Epic estimation drift threshold + re-baseline trigger; Operations Lead salary range substantive ADR (cross-reference to Story 0.7 Section I) | `README.md` §7 Open ADR slots; `docs/knowledge-transfer/adr-index.md` Section J entries |
| **Gap analysis** (observational) | Solo Builder estimate-authoring surfaces unknowns (`TBD-pending-X-substrate-decision` rows); mismatch-ratio computation surfaces over/under-estimation; trustee review surfaces reconciliation-decision-path-suitability; Step 4 final validation surfaces remaining critical-gap categorizations; per-Epic-closure rough-check surfaces estimation drift | `estimation-worksheet.md` §3 + §8 + §9; `reconciliation-decision-framework.md` §7; `implementation-readiness-report-post-reconciliation-YYYY-MM-DD.md` gap-list rows |

The gap-analysis layer does NOT prescribe sprint planning or override architecture — it observes incompleteness/risk and proposes conditional escalation paths per [[feedback_gap_analysis_observational]].

**Story 0.14 note (added 2026-06-02 per Decision 2026-06-02-014 cross-coupling):** Native-stack validation prototype device-procurement budget cross-coupling per Decision 2026-06-01-012 body item 9 + Decision 2026-06-02-014 body item 7. The substantive `cost_estimate_inr` authoring at `docs/native-stack-validation/device-procurement-roster.md` Rows 1-3 lands at Story 0.14 Task 7 budget-ratification event; the resolution is cross-referenced from `docs/spec-to-cadence-reconciliation/backfill-log.md` (new row tracking Story 0.12 ↔ Story 0.14 device-procurement budget cross-coupling at `citation-slot-committed` status pending Task 7 substantive authoring). Story 0.14 framework author-committed 2026-06-02 at `docs/native-stack-validation/` per Decision 2026-06-02-014.

## §4 Structural invariants

The following invariants are non-negotiable properties of the estimation + reconciliation framework. Deviations trigger an Open Question entry.

1. **Floor + ceiling + confidence band — never single-point.** Every engineer-month estimate row carries `engineer_month_floor` + `engineer_month_ceiling` + `confidence_band`. Single-point estimates are forbidden per the Cone-of-Uncertainty discipline at Phase-0.

2. **Round-number-forbidden without per-input rationale.** No row may carry `engineer_month_floor = 2; engineer_month_ceiling = 4` without an itemized §4 rationale per `estimation-methodology.md §6`. "2-4 months because feels right" is rejected at peer review.

3. **Explicit unknowns permitted.** If a row's surface count is not yet enumerable from the Epic spec, the row carries `surface_count = TBD-pending-Epic-X-substrate-decision`. The row's estimate carries `low` confidence band (±100%). Fabricating a number without the substrate decision is a scope-discipline violation.

4. **Deterministic mismatch-ratio computation.** `floor_ratio = total_estimate_floor ÷ SM_1_floor` where `SM_1_floor = 6`; `ceiling_ratio = total_estimate_ceiling ÷ SM_1_ceiling` where `SM_1_ceiling = 9`; `reconciliation_trigger = max(floor_ratio, ceiling_ratio) > 1.5×`.

5. **More-protective-governs.** The reconciliation trigger uses `max(floor_ratio, ceiling_ratio)` — never the minimum. Rounding down a 1.7× ceiling-ratio to a 1.4× floor-ratio to escape the reconciliation requirement is forbidden per [[feedback_closure_language_precision]] more-protective-governs discipline.

6. **Reconciliation-decision is one or more of cut-scope / move-SM-1 / contract-help.** Hybrid is the expected outcome per the UX §Phase-0 P0-3 inclusive-or wording. A "fourth path" that is not a combination of these three is not permitted without a new governance decision.

7. **Silent acceptance of the gap is FORBIDDEN.** Per UX §Phase-0 P0-3 "Silent acceptance of the gap is not an option." The only legitimate closure state is a ratified reconciliation decision or an explicit on-the-record no-reconciliation-needed outcome with full rationale.

8. **PRD §9.1.1 "patience as discipline" governs the move-SM-1 path.** Moving SM-1 IS the sanctioned move under the patience discipline; runway/calendar does not dictate. The move-SM-1 decision is on-the-record, ratified, with rationale — NOT a silent slip.

9. **Epic List edits are governance-tracked.** Substantive edits to `_bmad-output/planning-artifacts/epics.md` require Solo Builder authoring + ≥1-trustee co-sign per [[feedback_architecture_vs_prd_boundary]] PRD-edit discipline. Cut-scope deletions are logged in `deferred-work.md`. SM-1 move is logged as PRD amendment.

10. **Sprint-status.yaml edits are coordinated.** Sprint-status.yaml `development_status` entries are amended per cut-scope decisions at Task 10; new entries are added for contracted-help scope-allocations. The sprint-status header `last_updated` field is updated; the comment trail records the Story 0.12 reconciliation cross-reference.

11. **Cut-scope-deferred Stories land in `deferred-work.md`.** The "## Story 0.12 reconciliation deferrals" section in `_bmad-output/implementation-artifacts/deferred-work.md` is the canonical destination for deferred-Story records.

12. **Substitute-trustee-quorum fallback is time-bounded 30 days.** Per Story 0.9 D-02 + Story 0.7 README §5 precedent, if the Trustee Panel quorum is unavailable, emergency single-trustee approval is valid time-bounded 30 days with second-trustee re-review required.

13. **Framework re-attestation cadence is annual + per-major-architecture-amendment.** Not monthly — reconciliation is not a routine review; it is an event. The re-attestation trigger is explicit (a year elapsed from first reconciliation, OR architecture acquires substantial new discipline surface area); it does not auto-trigger on calendar drift alone.

14. **Append-only schema for estimation-worksheet rows.** The estimation-worksheet's column schema is append-only: forbidden-removal rule inherited from Story 0.3/0.4/0.5/0.6/0.7. Supersession is the only allowed lifecycle exit for a row that becomes invalid.

15. **No vendor / contractor identities inlined in any framework artifact.** The contracted-help path may identify categories of work at Story/Epic granularity. Specific vendor identity is recorded in `.decision-log.md` `[OPS]` entry with appropriate confidentiality.

16. **No member-PII inlined in any framework artifact.** The framework concerns engineering-effort estimation + scope-vs-cadence reconciliation; no member identity is referenced.

## §5 Sign-off lifecycle

| Stage | Action | Record |
|---|---|---|
| Author-commit | Dev agent authors 16 framework files (Tasks 1-6) | Story 0.12 story file + Decision 2026-06-01-012 in `.decision-log.md` |
| Substantive estimate authoring | Solo Builder fills in engineer-month estimates per loop node + per Tier-N surface (Task 7) | Per-loop-node entry `status` column flips to `solo-builder-author-committed` |
| Mismatch-ratio + proposal | Solo Builder computes mismatch ratio + proposes reconciliation decision (Task 8) | `estimation-worksheet.md` §8 populated |
| Trustee ratification | ≥2-trustee sign-off (Task 9) | `.decision-log.md` supersession entry on Decision 2026-06-01-012 |
| Epic List + sprint plan update | Solo Builder + ≥1-trustee co-sign (Task 10) | Substantive Epic List + sprint-status.yaml edits; new `.decision-log.md` supersession entry |
| Step 4 validation | `bmad-check-implementation-readiness` against reconciled scope (Task 11) | Report at `implementation-readiness-report-post-reconciliation-YYYY-MM-DD.md`; new `.decision-log.md` supersession entry |

**Emergency single-trustee fallback:** if Trustee Panel quorum unavailable, emergency single-trustee approval valid time-bounded 30 days per Story 0.9 D-02 precedent. Second-trustee re-review required within 30 days. The emergency approval is recorded as a `.decision-log.md` `[OPS]` entry.

## §6 Re-attestation cadence fallback

**First reconciliation:** Tasks 7-11 above — one-time event that discharges AR-49 P0-3 + Epic 1 substrate-work unblock.

**Subsequent re-attestations:**
- **Annual** — anchored to first reconciliation date (12 months after Decision 2026-06-01-012 Task 9 ratification). Solo Builder spot-checks estimate accuracy against actual delivery and amends if drift exceeds the confidence band. Re-attestation follows the same lifecycle as §5 above.
- **Per-major-architecture-amendment** — if architecture acquires substantial new discipline surface area, Solo Builder re-baselines the estimation-worksheet for the affected rows. The re-baseline is triggered by the architecture amendment ADR. _"Major" threshold (revised 2026-06-01 per review P-15): an architecture amendment is "major" if it meets any of (a) ≥1 new structural invariant added to architecture's commitment surface; (b) ≥1 new Epic added or removed from the Epic List; (c) ≥10% delta in architecture.md line-count from the previous freeze baseline; (d) ≥1 NFR amendment touching cross-cutting CI gates (FR-74 / FR-100 / UX-DR3 / Story 1.10 audit-line). If "major" is contested, Solo Builder + ≥1-trustee co-sign adjudicates._
- **Per-Epic-closure rough-check** — when an Epic closes, Solo Builder spot-checks the estimate-vs-actual for that Epic's loop-node + Tier-N rows. If actual delivery time differs from the estimate by more than the confidence band (e.g., a `medium` ±50% row where actual deviated >50%), Solo Builder notes the drift and amends the estimation-methodology §5 assumption catalogue.
- **Mid-cycle drift escalation (added 2026-06-01 per review P-15):** if at any time between scheduled re-attestations the cumulative drift on any Epic-aggregation row exceeds 100% of its `ceiling` value (i.e., actual delivery is more than 2× the original ceiling), Solo Builder MUST raise a mid-cycle re-attestation event with Trustee Panel notification — even if the calendar-based annual cadence has not yet fired. The threshold is calibrated to catch substrate-decision regret cases (e.g., Epic 4 Rules Engine DSL choice underestimated by 2-3×) before they cascade into multiple Epic delays.

Re-attestation is distinct from the first reconciliation per `reconciliation-decision-framework.md §8`. The shared schema allows the same tooling; the invocation differs: first reconciliation fires the AR-49 P0-3 discharge event; re-attestation is a periodic calibration that does NOT re-open the AR-49 P0-3 row unless drift is large enough to change the reconciliation decision.

## §7 Open ADR slots

The following specific choices are **operations-policy ADR territory** — they are enumerated here as deferred slots; substantive content is authored at Task 9 closure or later. See `docs/knowledge-transfer/adr-index.md` Section J for the canonical slot registry.

1. **Specific estimation tool** — spreadsheet vs prose ledger vs a simple tabular format in Markdown. The framework uses Markdown tables; if a spreadsheet tool offers superior re-computation audibility, the migration is an ADR decision.
2. **Estimation-recall mechanism for re-attestation** — how Solo Builder retrieves the original §4 input itemization at re-attestation time (prose in per-loop-node entry files is the default; a structured YAML schema is a candidate).
3. **Cut-scope-vs-defer-vs-cancel taxonomy refinement** — the framework treats cut-scope as deferral to v2 / Phase-2 / future-amendment. If the trust needs a harder "cancelled" category (never revisit) vs a softer "deferred" category (revisit at Phase-2), the taxonomy is refined in an ADR.
4. **Contracted-help vendor accountability mechanism** — scope-of-work template for contracted engineers; review-and-merge accountability path; NDA and IP assignment; the framework describes the *what* (contracted scope enumeration at Story/Epic granularity); the *how* of vendor accountability is ADR territory.
5. **Per-Pariwar localization when multi-Pariwar provisioning lands per Epic 1** — the current estimation treats TWT as a single-Pariwar system (v1 launch posture). When multi-Pariwar provisioning lands per Epic 1, the estimation-worksheet may need per-Pariwar rows or a multiplier methodology; the localization ADR is triggered by Epic 1 multi-Pariwar substrate.
6. **Per-Epic estimation drift threshold + re-baseline trigger** — at what drift percentage does a per-Epic rough-check trigger a formal re-attestation vs a simple notes-append to the per-loop-node entry? The threshold is ADR territory once the first per-Epic-closure rough-check data accrues.
7. **ADR-NNNN-SM-1-amendment (slot reserved per review D-07)** — substantive ADR authored at Task 9 closure IF the move-SM-1 path is ratified. Documents the SM-1 amendment rationale per architecture §Decision Freeze + §Implementation Handoff PR-2 ADR-transcription discipline. PRD §7 SM-1 narrow Edit at `reconciliation-decision-framework.md §3(b)` step 4 is gated on this ADR's existence. If move-SM-1 is NOT ratified at Task 9, the slot remains reserved but unauthored.

_(ADR-NNNN-operations-lead-salary-range slot is in Section I of adr-index.md, cross-referenced from Story 0.7; NOT duplicated here.)_

## §8 Related continuity + governance surfaces

| Surface | Story | Status | Directory |
|---|---|---|---|
| Operational runbooks | Story 0.1 | Done | `docs/runbooks/` |
| Credential escrow | Story 0.2 | In-progress | `docs/escrow/` |
| Code escrow auto-mirror | Story 0.3 | In-progress | `docs/escrow/code-escrow/` |
| Per-surface degradation policy | Story 0.4 | Done | `docs/degradation-policy/` |
| Knowledge-transfer pack | Story 0.5 | Done | `docs/knowledge-transfer/` |
| Backup engineer | Story 0.6 | Done | `docs/backup-engineer/` |
| Fallback-handler ledger (P0-1) | Story 0.7 | Done | `docs/fallback-handler-ledger/` |
| Spec-to-cadence reconciliation (P0-3) | Story 0.12 | Author-committed (Tasks 7-11 pending) | `docs/spec-to-cadence-reconciliation/` |
| Legal counsel concurrent review (P0-4) | Story 0.13 | Backlog | — |
| Native-stack ratify decision (P0-5) | Story 0.14 | Backlog | — |
| Architectural launch-gate inventory | Story 0.15 | Author-committed 2026-06-03 (Tasks 8-11 pending) | `docs/launch-gate-inventory/` (Row 2 of `inventory-roster.md` = `p0-3-spec-to-cadence-reality-check` at `current_status = closed` per closure-status-aggregation discipline — Decision 2026-06-01-012 + Decision 2026-06-01-012-amend-1 supersession entries cited as closure-evidence; substantive Story 0.12 Tasks 7-11 outcomes pending external action; per `docs/launch-gate-inventory/escalation-protocol.md` §1 trigger 4, Row 2 supersedes back to `open` if Trustee Panel substantively rejects the reconciliation outcome at a later monthly review) |

## §9 Disjoint anchor

Story 0.12 is **distinct from three preceding Phase-0 portfolios** and constitutes the fourth:

- **Bus-factor-of-one mitigation portfolio (Stories 0.1–0.6)** — discharges "the trust survives Solo Builder unavailability >7 days". Joint-discharge anchor: 30-day-takeover property per Story 0.3 Decision 003 + Story 0.4 Decision 004 + Story 0.5 Decision 005 + Story 0.6 Decision 006. Story 0.12 does NOT contribute to this portfolio's joint-discharge.
- **Loop-node operational-responsiveness portfolio (Story 0.7)** — discharges "every Phase-1 loop node has a named, funded, on-rota fallback handler reachable within SLA when automation fails". AR-49 P0-1 Launch Gate Risks row discharge anchor (architecture line 4781). Story 0.12 does NOT contribute to this portfolio's joint-discharge.
- **Empathy field-work portfolio (Stories 0.8–0.11)** — discharges "downstream design decisions in Epics 3, 6, 8, 10 are grounded in lived experience, not assumption". UX-DR5 + AR-49 P0-2 Launch Gate Risks row discharge anchor (architecture line 4782). Story 0.12 does NOT contribute to this portfolio's joint-discharge.
- **Spec-to-cadence-funding-reconciliation portfolio (Story 0.12)** — discharges "the engineer-month estimate vs SM-1 6-9 month target mismatch is resolved on-the-record via cut-scope / move-SM-1 / contract-help before Epic 1 substrate work commits". AR-49 P0-3 Launch Gate Risks row discharge anchor (architecture line 4779). Task 11 closure is the discharge event. Epic 1 substrate work (Story 1.1 Turborepo bootstrap onwards) is unblocked at Story 0.12 Task 11 closure per epics line 564.

All four portfolios are **required for Phase-1 launch readiness.** Story 0.12 closure unblocks the Epic 1 substrate work + downstream Stories 0.13 (P0-4 legal counsel) + 0.14 (P0-5 native-stack ratify) + 0.15 (architectural launch-gate inventory) by providing the reconciliation context within which the remaining Phase-0 stories close.

## §10 Domain glossary

| Term | Definition |
|---|---|
| **P0-3** | Phase-0 launch gate #3: spec-to-cadence reality check per UX §Phase-0 P0-3. Must close before Epic 1 substrate work begins. |
| **AR-49** | Architecture Risk row 49 at architecture line 4779: "P0-3 Spec-to-Cadence Reality Check — BigDev — Trustee Panel (scope decisions)". Discharged by Story 0.12 Task 11 closure. |
| **SM-1** | First end-to-end claim closes without manual heroics. Target: 6–9 months from v1 ship (PRD line 1329). SM-1 is the ship gate, not calendar per PRD §9.1.1 "patience as discipline". |
| **Loop node** | One of eight Phase-1 operational nodes inherited from Story 0.7 P0-1: claim-filing, peer-mesh, ground-inspection, reconciliation, helpdesk, denial-appeal, kyc-fallback, upi-failure-coach. |
| **Tier-N surface** | Tiering per UX §8 + UX §1: Tier-1 = member-primary flows (WCAG 2.1 AA launch-blocker); Tier-2 = staff-primary flows (target AA; acceptable v1 gap with named tracking); Tier-3 = admin-audit flows (AA aspiration). |
| **Engineer-month** | Single-engineer-month at solo cadence: ~25 focused hours/week at Solo Builder cadence per PRD §9.1.1 "solo build with A-13 backup". Matches SM-1 ship-target granularity. |
| **Floor + ceiling** | Lower bound (optimistic) + upper bound (pessimistic) of the engineer-month estimate. Together define the estimation range; mismatch-ratio computation uses both. |
| **Confidence band** | `high` = ±20% (rare at Phase-0); `medium` = ±50% (most common); `low` = ±100% (expected for unbuilt-substrate Epics). Per Cone-of-Uncertainty discipline. |
| **Mismatch ratio** | `floor_ratio = total_estimate_floor ÷ 6`; `ceiling_ratio = total_estimate_ceiling ÷ 9`. `reconciliation_trigger = max(floor_ratio, ceiling_ratio) > 1.5×`. |
| **Cut-scope** | Reconciliation path (a): specific stories deferred to v2 / Phase-2. |
| **Move-SM-1** | Reconciliation path (b): new SM-1 target months committed with trustee ratification + PRD §7 amendment. |
| **Contract-help** | Reconciliation path (c): specific scope outsourced to external contractors with budget + scope-of-work + accountability path. |
| **Hybrid** | Combination of cut-scope + move-SM-1 + contract-help. Expected outcome per UX §Phase-0 P0-3 inclusive-or wording. |
| **Reconciliation** | One-time Task 8-9 event: mismatch-ratio computation + reconciliation-decision proposal + trustee ratification. Discharges AR-49 P0-3. |
| **Reconciled scope** | Post-Task-10 Epic List + sprint plan + reconciled SM-1 target. What Step 4 final validation (Task 11) validates against per AC-2. |
| **Step 4 validation** | `bmad-check-implementation-readiness` re-run against reconciled scope. Report at `implementation-readiness-report-post-reconciliation-YYYY-MM-DD.md`. |
| **Funding-tradeoff cross-reference** | Reference in an upstream framework artifact (Story 0.6 + Story 0.7) that routes a funding decision to Story 0.12 reconciliation as the appropriate forum. Tracked in `backfill-log.md`. |
| **Backfill-log citation slot** | One row in `backfill-log.md` representing one upstream funding-tradeoff reference. At Task 6 author-commit status = `citation-slot-committed`; at Task 9 closure status = `substantive-backfill-applied`. |

## §11 File index

| File | Description | Schema | Status at author-commit |
|---|---|---|---|
| `README.md` | This file. Framework overview, structural invariants, sign-off lifecycle. | 11 sections | Complete |
| `estimation-methodology.md` | Per-row estimation discipline: granularity, confidence band, estimation inputs, assumption catalogue, round-number-forbidden rule, explicit unknowns | 8 sections | Complete |
| `estimation-worksheet.md` | Tabular index of all loop-node + Tier-N + Epic-aggregation estimate rows. Substantive values pending Task 7. | 9 sections | Schema complete; values pending Task 7 |
| `per-loop-node-estimates/claim-filing.md` | Claim-filing loop node estimate entry | §1-§8 schema | Schema complete; §5 estimate pending Task 7 |
| `per-loop-node-estimates/peer-mesh.md` | Peer-mesh loop node estimate entry | §1-§8 schema | Schema complete; §5 estimate pending Task 7 |
| `per-loop-node-estimates/ground-inspection.md` | Ground-inspection loop node estimate entry | §1-§8 schema | Schema complete; §5 estimate pending Task 7 |
| `per-loop-node-estimates/reconciliation.md` | Reconciliation loop node estimate entry | §1-§8 schema | Schema complete; §5 estimate pending Task 7 |
| `per-loop-node-estimates/helpdesk.md` | Helpdesk loop node estimate entry | §1-§8 schema | Schema complete; §5 estimate pending Task 7 |
| `per-loop-node-estimates/denial-appeal.md` | Denial-appeal loop node estimate entry | §1-§8 schema | Schema complete; §5 estimate pending Task 7 |
| `per-loop-node-estimates/kyc-fallback.md` | KYC-fallback loop node estimate entry | §1-§8 schema | Schema complete; §5 estimate pending Task 7 |
| `per-loop-node-estimates/upi-failure-coach.md` | UPI-failure-coach loop node estimate entry | §1-§8 schema | Schema complete; §5 estimate pending Task 7 |
| `per-tier-surface-estimates/tier-1-member-primary.md` | Tier-1 member-primary surface estimate entry | §1-§7 schema | Schema complete; §5 estimate pending Task 7 |
| `per-tier-surface-estimates/tier-2-staff-primary.md` | Tier-2 staff-primary surface estimate entry | §1-§7 schema | Schema complete; §5 estimate pending Task 7 |
| `per-tier-surface-estimates/tier-3-admin-audit.md` | Tier-3 admin-audit surface estimate entry | §1-§7 schema | Schema complete; §5 estimate pending Task 7 |
| `reconciliation-decision-framework.md` | Deterministic mismatch-ratio computation + three decision-paths taxonomy + per-path procedures + trustee ratification + Epic List + sprint plan update + Step 4 validation | 9 sections | Complete |
| `backfill-log.md` | Citation-slot commit for "Story 0.12 reconciliation territory" cross-references in upstream framework artifacts | Append-only schema | 19 rows committed (within the ~20-22 author-commit estimate per AC-1 ±2 variance allowance; predicate is grep-grounded — only artifacts with pre-existing explicit Story 0.12 cross-reference text qualify) |

---

**References:**
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` #Phase-0 Prerequisites P0-3 (line 107)] — UX launch-blocker authority
- [Source: `_bmad-output/planning-artifacts/architecture.md` #Launch Gate Risks AR-49 (line 4779)] — AR-49 P0-3 row
- [Source: `_bmad-output/planning-artifacts/architecture.md` #P0-3 reconciliation note (lines 4793-4800)] — architecture discipline accrual rationale
- [Source: `_bmad-output/planning-artifacts/architecture.md` #Confidence Level (line 5021)] — Moderate delivery predictability
- [Source: `_bmad-output/planning-artifacts/epics.md` #Cross-cutting Phase-0 prereq gates (line 564)] — gating commitment
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` #SM-1 (line 1329)] — 6-9 month target baseline
- [Source: `.decision-log.md` Decision 2026-06-01-012] — author-commit decision record
- Memory: [[feedback_architecture_vs_adr_boundary]] — ADRs commit cloud controls; framework commits properties
- Memory: [[feedback_architecture_vs_prd_boundary]] — PRD commits policy/eligibility/cadence; framework is governance
- Memory: [[feedback_gap_analysis_observational]] — gap analysis observes and proposes; it does not prescribe sprint planning
- Memory: [[feedback_closure_language_precision]] — Closed by [edit] vs Resolved via explicit deferral vs Not addressed
