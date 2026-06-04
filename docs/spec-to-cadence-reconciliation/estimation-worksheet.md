# Estimation Worksheet

**Status:** Solo-builder-author-committed (Tasks 7+8, 2026-06-04). Substantive estimates authored at AI-assisted 80 hr/week cadence. §8 mismatch-ratio computed. Task 9 trustee ratification pending.

**Append-only rule:** column schema is append-only. Forbidden-removal rule applies (inherited from Story 0.3/0.4/0.5/0.6/0.7). Supersession is the only allowed lifecycle exit for a row that becomes invalid. See `README.md §4` Structural Invariant 14.

---

## §1 Header + authority

| Field | Value |
|---|---|
| Status | Solo-builder-author-committed (Tasks 7+8); Task 9 trustee ratification pending |
| SM-1 floor (months) | 6 |
| SM-1 ceiling (months) | 9 |
| Reconciliation trigger | `max(floor_ratio, ceiling_ratio) > 1.5×` |
| Methodology authority | `estimation-methodology.md` |
| Decision authority | `.decision-log.md` Decision 2026-06-01-012 |
| Last updated | 2026-06-04 (Task 7+8 Solo Builder substantive estimate authoring; AI-assisted 80 hr/week cadence) |

## §2 Worksheet schema

Column definitions (append-only):

| Column | Description | Allowed values |
|---|---|---|
| `row_id` | Canonical kebab-case slug | e.g., `loop-node-claim-filing`, `tier-1-member-primary`, `epic-agg-epic-6` |
| `row_type` | Classification of what this row estimates | `loop-node` \| `tier-1-member-primary` \| `tier-2-staff-primary` \| `tier-3-admin-audit` \| `epic-aggregation` |
| `owning_epic_and_stories` | Epic(s) + Story IDs this row's implementation scope maps to | e.g., `Epic 6 (Stories 6.1–6.16)` |
| `surface_count` | Brief summary of implementation surface count | May be `TBD-pending-X-substrate-decision`; full detail in entry file |
| `complexity_profile` | Dominant complexity profile(s) per `estimation-methodology.md §4(b)` | e.g., `multi-party-state-machine; external-integration; multi-tenant-RLS` |
| `cross_cutting_ci_participation` | CI gate participation | `FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line` (all four in most rows) |
| `engineer_month_floor` | Lower bound of estimate in single-engineer-months at Solo Builder cadence | Number or `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` |
| `engineer_month_ceiling` | Upper bound of estimate | Number or `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` |
| `confidence_band` | Cone-of-Uncertainty tier | `high` (±20%) \| `medium` (±50%) \| `low` (±100%) \| `pending-Task-7` (interim sentinel; required for rows whose substantive estimate has not yet been authored; retired when Task 7 lands a value from the high/medium/low set) |
| `assumption_dependencies` | Cross-links to `estimation-methodology.md §5` assumptions that gate this row | e.g., `A-substrate-readiness; A-digilocker-integration-readiness` |
| `funding_tradeoff_xref` | Upstream framework cross-reference parked at this row (if any) | Source file + `backfill-log.md` row ID(s) |
| `entry_file` | Path to the per-loop-node or per-tier-surface entry file with full §4 input itemization | e.g., `per-loop-node-estimates/claim-filing.md` |
| `status` | Lifecycle state of this row's estimate | `pending-substantive-author-commit` \| `solo-builder-author-committed` \| `trustee-ratified` \| `superseded-by-reconciliation` |

**Forbidden statuses:** `silent-estimate` (estimate with no §4 itemization); `single-point` (no floor + ceiling); `removed` (removal is forbidden; use `superseded-by-reconciliation`).

## §3 Loop-node rows

Eight rows — one per Story 0.7 loop node per `docs/fallback-handler-ledger/ledger.md §3`:

| row_id | row_type | owning_epic_and_stories | surface_count | complexity_profile | cross_cutting_ci_participation | engineer_month_floor | engineer_month_ceiling | confidence_band | assumption_dependencies | funding_tradeoff_xref | entry_file | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `loop-node-claim-filing` | `loop-node` | Epic 6 (Stories 6.1–6.16) + Epic 4 (Rules Engine for claim validity) + Epic 3 (member identity substrate) | See entry file §2 | `multi-party-state-machine; external-integration; safety-critical-with-property-test-coverage; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `0.68` | `2.72` | `low` | A-substrate-readiness; A-legal-counsel-return-latency; A-trustee-ratification-latency | `backfill-log` BFL-007 (`loop-nodes/claim-filing.md §5` funding-status); BFL-015 (`loop-nodes/claim-filing.md §5` claim-shepherd salary) — note: claim-filing's `ledger.md §3` funding-status row has no explicit Story 0.12 text and is therefore NOT a backfill-log row at author-commit | `per-loop-node-estimates/claim-filing.md` | `solo-builder-author-committed` |
| `loop-node-peer-mesh` | `loop-node` | Epic 6 (Stories 6.6 peer-mesh selection + 6.14 R9 voting) + Epic 7 (Pool Engine substrate for peer selection geometry) | See entry file §2 | `multi-party-state-machine; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `0.10` | `0.40` | `low` | A-substrate-readiness | `backfill-log` BFL-010 (`loop-nodes/peer-mesh.md §5` funding-status) — note: peer-mesh's `ledger.md §3` row has no explicit Story 0.12 text at author-commit grep | `per-loop-node-estimates/peer-mesh.md` | `solo-builder-author-committed` |
| `loop-node-ground-inspection` | `loop-node` | Epic 6 (Story 6.7 ground-inspection scheduling) + Epic 13 (field-worker dispatch) | See entry file §2 | `external-integration; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `0.08` | `0.18` | `medium` | A-substrate-readiness; PRD-§9.3-cash-flow-constraint | `backfill-log` BFL-011 (`loop-nodes/ground-inspection.md §5` funding-status); BFL-013 (`ledger.md §3` ground-inspection funding-status row — the only ledger.md row carrying explicit Story 0.12 text at author-commit grep) | `per-loop-node-estimates/ground-inspection.md` | `solo-builder-author-committed` |
| `loop-node-reconciliation` | `loop-node` | Epic 9 (Stories 9.1–9.12 reconciliation engine) + Epic 6 (claim state machine substrate) | See entry file §2 | `multi-party-state-machine; external-integration; safety-critical-with-property-test-coverage; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `0.47` | `1.88` | `low` | A-substrate-readiness; A-bank-parser-allowlist-scope | `backfill-log` (none — `loop-nodes/reconciliation.md §5` has no direct Story 0.12 cross-reference; funding-tradeoff is less direct than claim-filing) | `per-loop-node-estimates/reconciliation.md` | `solo-builder-author-committed` |
| `loop-node-helpdesk` | `loop-node` | Epic 10 (Stories 10.1–10.4 helpdesk subsystem + operator surface) + Epic 5 (channel dispatcher for helpdesk alerts) | See entry file §2 | `external-integration; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `0.12` | `0.27` | `medium` | A-substrate-readiness; P0-2d-operator-shadowing-synthesis | `backfill-log` BFL-012 (`loop-nodes/helpdesk.md §5` staffing) — note: helpdesk's `ledger.md §3` row has no explicit Story 0.12 text at author-commit grep | `per-loop-node-estimates/helpdesk.md` | `solo-builder-author-committed` |
| `loop-node-denial-appeal` | `loop-node` | Epic 6 (Story 6.16 3-stage denial-appeal flow) + Epic 4 (Rules Engine for R9 special-case voting) | See entry file §2 | `multi-party-state-machine; safety-critical-with-property-test-coverage; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `0.12` | `0.48` | `low` | A-substrate-readiness; A-legal-counsel-return-latency | `backfill-log` (none — denial-appeal.md §5 has no direct Story 0.12 cross-reference at author-commit grep) | `per-loop-node-estimates/denial-appeal.md` | `solo-builder-author-committed` |
| `loop-node-kyc-fallback` | `loop-node` | Epic 3 (Story 3.3b DigiLocker KYC flow + manual fallback) + Epic 6 (claim filing KYC gate) | See entry file §2 | `external-integration; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `0.08` | `0.18` | `medium` | A-substrate-readiness; A-digilocker-integration-readiness | `backfill-log` (none — kyc-fallback.md §5 has no direct Story 0.12 cross-reference at author-commit grep) | `per-loop-node-estimates/kyc-fallback.md` | `solo-builder-author-committed` |
| `loop-node-upi-failure-coach` | `loop-node` | Epic 8 (Story 8.5 UPI failure coach) + Epic 7 (Pool Engine payment binding substrate) | See entry file §2 | `external-integration; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `0.05` | `0.11` | `medium` | A-substrate-readiness; A-upi-integration-readiness | `backfill-log` (none — upi-failure-coach.md §5 has no direct Story 0.12 cross-reference at author-commit grep) | `per-loop-node-estimates/upi-failure-coach.md` | `solo-builder-author-committed` |

## §4 Tier-1 member-primary rows

1 aggregated row covering all Tier-1 member-primary flows per UX §1 + UX §8:

| row_id | row_type | owning_epic_and_stories | surface_count | complexity_profile | cross_cutting_ci_participation | engineer_month_floor | engineer_month_ceiling | confidence_band | assumption_dependencies | funding_tradeoff_xref | entry_file | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tier-1-member-primary` | `tier-1-member-primary` | Epics 3, 6, 7, 8, 9, 11a, 11b — member-facing surfaces: Yogdaan Bahi + My Pool card + Shradhanjali Sahyog Vivran + Panchayat Noticeboard + signup + claim-filing Ravi-mode + nominee-console Sunita-mode + member-directory + DPDPA data-export | See entry file §2 | `multi-party-state-machine; external-integration; safety-critical-with-property-test-coverage; multi-tenant-RLS` (aggregated across Tier-1 flows) | FR-74 / FR-100 / UX-DR3 (most load-bearing for Tier-1) / Story-1.10-audit-line | `0.90` | `2.02` | `medium` | A-substrate-readiness; A-digilocker-integration-readiness; A-upi-integration-readiness; P0-2a/b/c-synthesis-readiness | none | `per-tier-surface-estimates/tier-1-member-primary.md` | `solo-builder-author-committed` |

## §5 Tier-2 staff-primary rows

1 aggregated row covering all Tier-2 staff-primary flows per UX §1 + UX §8:

| row_id | row_type | owning_epic_and_stories | surface_count | complexity_profile | cross_cutting_ci_participation | engineer_month_floor | engineer_month_ceiling | confidence_band | assumption_dependencies | funding_tradeoff_xref | entry_file | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tier-2-staff-primary` | `tier-2-staff-primary` | Epics 4, 6, 10, 13 — staff-facing surfaces: Helpline Operator console + Anita's Verifier Console + Vikram field-worker dispatch + helpdesk admin console + trustee tooling + R9 voting workflow + State-Trustee approval surface | See entry file §2 | `multi-party-state-machine; external-integration; multi-tenant-RLS` (aggregated across Tier-2 flows) | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `0.60` | `1.35` | `medium` | A-substrate-readiness; P0-2d-operator-shadowing-synthesis; P0-2a-teacher-synthesis | `backfill-log` BFL-008 (Operations Lead salary — operations lead manages staff-facing surfaces); BFL-009 (README §8 slot 3) | `per-tier-surface-estimates/tier-2-staff-primary.md` | `solo-builder-author-committed` |

## §6 Tier-3 admin-audit rows

1 aggregated row covering all Tier-3 admin-audit flows per UX §8:

| row_id | row_type | owning_epic_and_stories | surface_count | complexity_profile | cross_cutting_ci_participation | engineer_month_floor | engineer_month_ceiling | confidence_band | assumption_dependencies | funding_tradeoff_xref | entry_file | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tier-3-admin-audit` | `tier-3-admin-audit` | Epics 10, 14 — admin-audit surfaces: bulk ops + feature flags + member moderation + news/blog + reports/exports + banners + audit-log integrity-verification UI + DPO breach reporting | See entry file §2 | `multi-tenant-RLS; external-integration` (aggregated across Tier-3 flows; lower complexity per surface than Tier-1/2) | FR-74 / FR-100 / UX-DR3 (less load-bearing for Tier-3) / Story-1.10-audit-line | `0.25` | `0.56` | `medium` | A-substrate-readiness | none | `per-tier-surface-estimates/tier-3-admin-audit.md` | `solo-builder-author-committed` |

## §7 Epic-aggregation rows

15 rows — one per Epic 0 through Epic 14 with Epic 11a + 11b split. Each Epic-aggregation row sums the loop-node + Tier-N rows that map to it. **Revised 2026-06-01 per review D-03:** §7 is the **deterministic source-of-truth** for the §8 totaling (NOT the sum of §3-§6 independently). §3-§6 are diagnostic views that expose scope distribution within each Epic-aggregation row.

Cadence basis for all §7 rows: 80 hr/week NET + AI-assisted (BMad + Claude Code). Story-point model: 4 hr/pt at AI-cadence; 1 pt = simple surface, 2 pts = medium story, 4 pts = complex story, 7 pts = very complex story. CI/ADR overhead applied per-row (20–55% range). See entry files for §4 input itemization.

| row_id | row_type | owning_loop_nodes_and_tiers | engineer_month_floor | engineer_month_ceiling | excluded_from_total | notes |
|---|---|---|---|---|---|---|
| `epic-agg-epic-0` | `epic-aggregation` | Epic 0 framework authoring (Stories 0.1–0.15) | `0` | `0` | `true` | Epic 0 is governance + framework + non-engineering effort (trustee coordination, fieldwork, ratification cycles). Per the methodology §2 definition of "engineer-month at solo cadence" (design-to-merge engineering effort), Epic 0 work does not contribute to SM-1 cadence load. Excluded from §8 total estimate. Rationale: SM-1 is "first end-to-end claim closes without manual heroics" — Epic 0 closure is a precondition for SM-1, not part of SM-1's clock. |
| `epic-agg-epic-1` | `epic-aggregation` | Epic 1 platform foundation + multi-tenancy + RBAC + audit (Stories 1.1–1.17) | `0.47` | `1.06` | `false` | Substrate story; all downstream Epics depend on Epic 1 closure. Story mix: 4 simple + 8 medium + 4 complex + 1 very complex = 43 pts × 4 hr/pt × 1.42 CI/ADR overhead ÷ 346 hr/month = 0.71 midpoint. Medium band: floor 0.47, ceiling 1.06. |
| `epic-agg-epic-2` | `epic-aggregation` | Epic 2 Niyamavali publishing + public trust identity (Stories 2.1–2.7) | `0.11` | `0.24` | `false` | Content management + versioning; AI-tractable patterns. Story mix: 3 simple + 4 medium = 11 pts × 4 hr × 1.30 ÷ 346 = 0.16 midpoint. Medium band: floor 0.11, ceiling 0.24. |
| `epic-agg-epic-3` | `epic-aggregation` | Epic 3 member identity + lifecycle (Stories 3.1–3.12); includes `loop-node-kyc-fallback` component | `0.37` | `0.83` | `false` | Tier-1 signup + member-directory surfaces included in tier-1-member-primary row. Story mix: 2 simple + 5 medium + 4 complex + 1 very complex = 35 pts × 4 hr × 1.37 ÷ 346 = 0.55 midpoint. Medium band: floor 0.37, ceiling 0.83. |
| `epic-agg-epic-4` | `epic-aggregation` | Epic 4 Rules Engine + member validity service (Stories 4.1–4.8); gates `loop-node-claim-filing` + `loop-node-denial-appeal` | `0.28` | `0.63` | `false` | Rules Engine DSL is novel but AI-tractable — eligibility rules are fully specified in PRD §4.2 (FR-7 through FR-12A); DSL prototyping with AI is a 1-2 day exercise; confidence upgraded to `medium` at AI-cadence (AI's prior art on rule evaluation engines). Story mix: 1 simple + 3 medium + 3 complex + 1 very complex = 26 pts × 4 hr × 1.40 ÷ 346 = 0.42 midpoint. Medium band: floor 0.28, ceiling 0.63. |
| `epic-agg-epic-5` | `epic-aggregation` | Epic 5 three-tier communication channels (Stories 5.1–5.9) | `0.27` | `0.62` | `false` | FCM/APNS, WhatsApp Business API, channel router. Story mix: 1 simple + 5 medium + 2 complex + 1 very complex = 26 pts × 4 hr × 1.37 ÷ 346 = 0.41 midpoint. Medium band: floor 0.27, ceiling 0.62. |
| `epic-agg-epic-6` | `epic-aggregation` | Epic 6 claim filing + peer verification + ground inspection + internal appeal (Stories 6.1–6.16); includes `loop-node-claim-filing` + `loop-node-peer-mesh` + `loop-node-ground-inspection` + `loop-node-denial-appeal` | `0.68` | `2.72` | `false` | Most loop nodes live here; multi-party state machine dominates. Story mix: 0 simple + 3 medium + 7 complex + 6 very complex = 76 pts × 4 hr × 1.55 ÷ 346 = 1.36 midpoint. Low band: floor 0.68, ceiling 2.72. |
| `epic-agg-epic-7` | `epic-aggregation` | Epic 7 Pool Engine + cycle spawn (Stories 7.1–7.10); gates `loop-node-peer-mesh` + `loop-node-upi-failure-coach` | `0.48` | `1.90` | `false` | `safety-critical-with-property-test-coverage` dominates; Pool Engine atomicity requires property-test validation (FR-20 capacity envelope). Story mix: 0 simple + 1 medium + 4 complex + 5 very complex = 53 pts × 4 hr × 1.55 ÷ 346 = 0.95 midpoint. Low band: floor 0.48, ceiling 1.90. |
| `epic-agg-epic-8` | `epic-aggregation` | Epic 8 Sushil's contribution loop (Stories 8.1–8.12); includes `loop-node-upi-failure-coach` + Tier-1 Yogdaan Bahi + My Pool card | `0.35` | `0.78` | `false` | UPI integration + contribution tracking. Story mix: 2 simple + 6 medium + 3 complex + 1 very complex = 33 pts × 4 hr × 1.37 ÷ 346 = 0.52 midpoint. Medium band: floor 0.35, ceiling 0.78. |
| `epic-agg-epic-9` | `epic-aggregation` | Epic 9 reconciliation engine (Stories 9.1–9.12); includes `loop-node-reconciliation`; includes Tier-1 nominee-console Sunita-mode | `0.47` | `1.88` | `false` | Bank-parser allowlist (5 banks) + UTR matching; external-integration uncertainty. Story mix: 0 simple + 3 medium + 5 complex + 4 very complex = 54 pts × 4 hr × 1.50 ÷ 346 = 0.94 midpoint. Low band: floor 0.47, ceiling 1.88. |
| `epic-agg-epic-10` | `epic-aggregation` | Epic 10 admin operations console (Stories 10.1–10.15); includes `loop-node-helpdesk` + Tier-2 operator console + Tier-3 admin surfaces | `0.40` | `0.90` | `false` | Helpdesk + admin consoles; standard CRUD+SLA patterns. Story mix: 3 simple + 8 medium + 3 complex + 1 very complex = 38 pts × 4 hr × 1.37 ÷ 346 = 0.60 midpoint. Medium band: floor 0.40, ceiling 0.90. |
| `epic-agg-epic-11a` | `epic-aggregation` | Epic 11a public trust identity shell (Stories 11a.1–11a.6); Tier-1 member-directory + Tier-1 Panchayat Noticeboard | `0.12` | `0.27` | `false` | Simpler surfaces; primarily read-heavy public identity. Story mix: 2 simple + 3 medium + 1 complex = 12 pts × 4 hr × 1.30 ÷ 346 = 0.18 midpoint. Medium band: floor 0.12, ceiling 0.27. |
| `epic-agg-epic-11b` | `epic-aggregation` | Epic 11b memorial + Sahyog Drive (Stories 11b.1–11b.8); Tier-1 Shradhanjali Sahyog Vivran | `0.25` | `0.56` | `false` | Novel cultural domain; implementation patterns are standard UI + content (AI-tractable); UX iteration is the primary uncertainty (addressed by Stories 0.9 synthesis). Story mix: 1 simple + 4 medium + 2 complex + 1 very complex = 24 pts × 4 hr × 1.34 ÷ 346 = 0.37 midpoint. Medium band: floor 0.25, ceiling 0.56. |
| `epic-agg-epic-12` | `epic-aggregation` | Epic 12 module marketplace (Stories 12.1–12.6) | `0.12` | `0.27` | `false` | External forum platform TBD (FR-43A); estimate assumes basic forum integration; surface count may shift ±30% with platform decision. Story mix: 2 simple + 3 medium + 1 complex = 12 pts × 4 hr × 1.32 ÷ 346 = 0.18 midpoint. Medium band: floor 0.12, ceiling 0.27. TBD-pending-external-forum-platform-decision-FR-43A caveat noted. |
| `epic-agg-epic-13` | `epic-aggregation` | Epic 13 growth — field-worker attribution + member invite loop (Stories 13.1–13.8); gates `loop-node-ground-inspection` | `0.19` | `0.43` | `false` | Field-worker attribution + referral mechanics. Story mix: 1 simple + 5 medium + 2 complex = 19 pts × 4 hr × 1.34 ÷ 346 = 0.29 midpoint. Medium band: floor 0.19, ceiling 0.43. |
| `epic-agg-epic-14` | `epic-aggregation` | Epic 14 disaster handling + DPO readiness + future-benefit hooks (Stories 14.1–14.7); Tier-3 admin-audit surfaces | `0.17` | `0.38` | `false` | DPDPA compliance + disaster handling; scope bounded by Story 0.13 legal counsel guidance. Story mix: 1 simple + 4 medium + 2 complex = 17 pts × 4 hr × 1.34 ÷ 346 = 0.26 midpoint. Medium band: floor 0.17, ceiling 0.38. |

## §8 Total estimate + SM-1 reconciliation

**Formula (revised 2026-06-01 per review D-03 — Epic-aggregation as deterministic source-of-truth):**

```
total_estimate_floor   = sum(§7 Epic-aggregation rows[i].engineer_month_floor   for i where excluded_from_total = false)
total_estimate_ceiling = sum(§7 Epic-aggregation rows[i].engineer_month_ceiling for i where excluded_from_total = false)

floor_ratio   = total_estimate_floor   ÷ 6
ceiling_ratio = total_estimate_ceiling ÷ 9

reconciliation_trigger = max(floor_ratio, ceiling_ratio) > 1.5×
```

**Deterministic source-of-truth at Task 8: §7 Epic-aggregation rows are the only inputs to the total.** Sections §3 (loop-node), §4-§6 (per-tier) are **diagnostic views** that expose scope distribution across loop-nodes + tiers — they MUST NOT be summed against §7 (overcounting risk: a loop-node row's scope overlaps with the Tier-N row it lives within, and both overlap with the owning Epic-aggregation row). The additive sum of §3 + §4-§6 is forbidden as a totaling input.

**TBD-pending rows behavior:** Epic-aggregation rows that are derived from any underlying row carrying `surface_count = TBD-pending-X-substrate-decision` carry `engineer_month_floor = TBD` / `engineer_month_ceiling = TBD`. TBD rows are tracked in a separate `unknown_rows_total_count` field; the mismatch-ratio is computed against `known_rows_total` (TBDs excluded). The §9 Mismatch-ratio history row records both the known-rows ratio and the TBD-count, flagging the substrate decisions that must land before a complete ratio can be computed.

**Excluded-from-total rows behavior:** an Epic-aggregation row may carry `excluded_from_total = true` (e.g., `epic-agg-epic-0` per §7 notes — Epic 0 is governance + framework + non-engineering effort that does not contribute to SM-1 cadence load). Excluded rows are visible in §7 for completeness but do not contribute to the total estimate. The exclusion + rationale must be enumerated in the row's `notes` column.

| Field | Value |
|---|---|
| `total_estimate_floor` | `4.73` (sum of §7 Epic 1–14 floors excl. Epic 0) |
| `total_estimate_ceiling` | `13.47` (sum of §7 Epic 1–14 ceilings excl. Epic 0) |
| `floor_ratio` | `0.79` (4.73 ÷ 6 = 0.788) |
| `ceiling_ratio` | `1.50` (13.47 ÷ 9 = 1.497) |
| `reconciliation_trigger` | **No** — max(0.79, 1.50) = 1.50; trigger requires strictly > 1.5; 1.497 < 1.5. No-trigger record per `reconciliation-decision-framework.md §1`. |
| `reconciliation_decision_proposal` | **No-trigger outcome.** Floor_ratio = 0.79: scope fits within SM-1 6-month floor with 21% capacity buffer. Ceiling_ratio = 1.50 (1.497): ceiling driven by low-confidence Epics 6 (claim state machine), 7 (Pool Engine), 9 (bank-parser reconciliation) — all genuinely novel substrates. Trigger does not fire: 1.497 < 1.5 threshold. Per `reconciliation-decision-framework.md §1`: "If mismatch_ratio ≤ 1.5, the reconciliation-decision step is optional but the framework still produces a sign-off record." Decision: SM-1 6-month target confirmed; 6-month floor is achievable at AI-assisted 80 hr/week cadence per §5 cadence override in all entry files. Ceiling uncertainty (13.47 months at pessimistic scenario) is acknowledged as a governance watch item; Month-3 re-attestation checkpoint established as the primary risk-management instrument. AR-49 P0-3 discharge path committed per `reconciliation-decision-framework.md §1` no-trigger record; full discharge at Task 11 Step 4 validation report. Trustee Task 9 ratification confirms this no-trigger finding. |

## §9 Mismatch-ratio history

_Accrues over time per re-attestation events._

| Re-attestation date | total_estimate_floor | total_estimate_ceiling | floor_ratio | ceiling_ratio | trigger_fired | reconciliation_outcome | Notes |
|---|---|---|---|---|---|---|---|
| 2026-06-04 (Task 7+8) | 4.73 | 13.47 | 0.79 | 1.50 | No (1.497 < 1.5 threshold) | No-trigger record — SM-1 6-month target confirmed | Cadence basis: 80 hr/week NET + AI-assisted (BMad + Claude Code). Floor comfortably within SM-1 floor (6-month target; 21% buffer). Ceiling driven by low-confidence Epics 6, 7, 9 (low-band ratio 4×); ceiling_ratio 1.497 is below trigger threshold by 0.003. No reconciliation decision required. Month-3 re-attestation checkpoint established. Epic 4 (Rules Engine) classified `medium` confidence at AI-cadence (methodology §2 cadence override rationale in entry files). 4 low-confidence epics (E6/E7/E9) and 10 medium-confidence epics (E1/E2/E3/E4/E5/E8/E10/E11a/E11b/E12/E13/E14). |

---

**References:**
- [Source: `estimation-methodology.md`] — per-row estimation discipline
- [Source: `reconciliation-decision-framework.md §1`] — deterministic mismatch-ratio formula
- [Source: `docs/fallback-handler-ledger/ledger.md §3`] — eight Phase-1 loop nodes
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` §1 + §8] — Tier-N surface tiering
- [Source: `.decision-log.md` Decision 2026-06-01-012] — author-commit decision record
