# Estimation Worksheet

**Status:** Author-committed 2026-06-01 per Decision 2026-06-01-012. Schema is complete. Every row carries `status = pending-substantive-author-commit` and `engineer_month_floor = <TO-BE-AUTHORED-BY-SOLO-BUILDER>` / `engineer_month_ceiling = <TO-BE-AUTHORED-BY-SOLO-BUILDER>` placeholders. Substantive estimates land at Task 7 (Solo Builder authoring). Mismatch-ratio computation + reconciliation-decision lands at Task 8.

**Append-only rule:** column schema is append-only. Forbidden-removal rule applies (inherited from Story 0.3/0.4/0.5/0.6/0.7). Supersession is the only allowed lifecycle exit for a row that becomes invalid. See `README.md §4` Structural Invariant 14.

---

## §1 Header + authority

| Field | Value |
|---|---|
| Status | Author-committed (Task 6); substantive estimates pending Task 7 |
| SM-1 floor (months) | 6 |
| SM-1 ceiling (months) | 9 |
| Reconciliation trigger | `max(floor_ratio, ceiling_ratio) > 1.5×` |
| Methodology authority | `estimation-methodology.md` |
| Decision authority | `.decision-log.md` Decision 2026-06-01-012 |
| Last updated | 2026-06-01 (author-commit) |

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
| `loop-node-claim-filing` | `loop-node` | Epic 6 (Stories 6.1–6.16) + Epic 4 (Rules Engine for claim validity) + Epic 3 (member identity substrate) | See entry file §2 | `multi-party-state-machine; external-integration; safety-critical-with-property-test-coverage; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `pending-Task-7` | A-substrate-readiness; A-legal-counsel-return-latency; A-trustee-ratification-latency | `backfill-log` BFL-007 (`loop-nodes/claim-filing.md §5` funding-status); BFL-015 (`loop-nodes/claim-filing.md §5` claim-shepherd salary) — note: claim-filing's `ledger.md §3` funding-status row has no explicit Story 0.12 text and is therefore NOT a backfill-log row at author-commit | `per-loop-node-estimates/claim-filing.md` | `pending-substantive-author-commit` |
| `loop-node-peer-mesh` | `loop-node` | Epic 6 (Stories 6.6 peer-mesh selection + 6.14 R9 voting) + Epic 7 (Pool Engine substrate for peer selection geometry) | See entry file §2 | `multi-party-state-machine; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `pending-Task-7` | A-substrate-readiness | `backfill-log` BFL-010 (`loop-nodes/peer-mesh.md §5` funding-status) — note: peer-mesh's `ledger.md §3` row has no explicit Story 0.12 text at author-commit grep | `per-loop-node-estimates/peer-mesh.md` | `pending-substantive-author-commit` |
| `loop-node-ground-inspection` | `loop-node` | Epic 6 (Story 6.7 ground-inspection scheduling) + Epic 13 (field-worker dispatch) | See entry file §2 | `external-integration; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `pending-Task-7` | A-substrate-readiness; PRD-§9.3-cash-flow-constraint | `backfill-log` BFL-011 (`loop-nodes/ground-inspection.md §5` funding-status); BFL-013 (`ledger.md §3` ground-inspection funding-status row — the only ledger.md row carrying explicit Story 0.12 text at author-commit grep) | `per-loop-node-estimates/ground-inspection.md` | `pending-substantive-author-commit` |
| `loop-node-reconciliation` | `loop-node` | Epic 9 (Stories 9.1–9.12 reconciliation engine) + Epic 6 (claim state machine substrate) | See entry file §2 | `multi-party-state-machine; external-integration; safety-critical-with-property-test-coverage; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `pending-Task-7` | A-substrate-readiness; A-bank-parser-allowlist-scope | `backfill-log` (none — `loop-nodes/reconciliation.md §5` has no direct Story 0.12 cross-reference; funding-tradeoff is less direct than claim-filing) | `per-loop-node-estimates/reconciliation.md` | `pending-substantive-author-commit` |
| `loop-node-helpdesk` | `loop-node` | Epic 10 (Stories 10.1–10.4 helpdesk subsystem + operator surface) + Epic 5 (channel dispatcher for helpdesk alerts) | See entry file §2 | `external-integration; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `pending-Task-7` | A-substrate-readiness; P0-2d-operator-shadowing-synthesis | `backfill-log` BFL-012 (`loop-nodes/helpdesk.md §5` staffing) — note: helpdesk's `ledger.md §3` row has no explicit Story 0.12 text at author-commit grep | `per-loop-node-estimates/helpdesk.md` | `pending-substantive-author-commit` |
| `loop-node-denial-appeal` | `loop-node` | Epic 6 (Story 6.16 3-stage denial-appeal flow) + Epic 4 (Rules Engine for R9 special-case voting) | See entry file §2 | `multi-party-state-machine; safety-critical-with-property-test-coverage; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `pending-Task-7` | A-substrate-readiness; A-legal-counsel-return-latency | `backfill-log` (none — denial-appeal.md §5 has no direct Story 0.12 cross-reference at author-commit grep) | `per-loop-node-estimates/denial-appeal.md` | `pending-substantive-author-commit` |
| `loop-node-kyc-fallback` | `loop-node` | Epic 3 (Story 3.3b DigiLocker KYC flow + manual fallback) + Epic 6 (claim filing KYC gate) | See entry file §2 | `external-integration; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `pending-Task-7` | A-substrate-readiness; A-digilocker-integration-readiness | `backfill-log` (none — kyc-fallback.md §5 has no direct Story 0.12 cross-reference at author-commit grep) | `per-loop-node-estimates/kyc-fallback.md` | `pending-substantive-author-commit` |
| `loop-node-upi-failure-coach` | `loop-node` | Epic 8 (Story 8.5 UPI failure coach) + Epic 7 (Pool Engine payment binding substrate) | See entry file §2 | `external-integration; multi-tenant-RLS` | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `pending-Task-7` | A-substrate-readiness; A-upi-integration-readiness | `backfill-log` (none — upi-failure-coach.md §5 has no direct Story 0.12 cross-reference at author-commit grep) | `per-loop-node-estimates/upi-failure-coach.md` | `pending-substantive-author-commit` |

## §4 Tier-1 member-primary rows

1 aggregated row covering all Tier-1 member-primary flows per UX §1 + UX §8:

| row_id | row_type | owning_epic_and_stories | surface_count | complexity_profile | cross_cutting_ci_participation | engineer_month_floor | engineer_month_ceiling | confidence_band | assumption_dependencies | funding_tradeoff_xref | entry_file | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tier-1-member-primary` | `tier-1-member-primary` | Epics 3, 6, 7, 8, 9, 11a, 11b — member-facing surfaces: Yogdaan Bahi + My Pool card + Shradhanjali Sahyog Vivran + Panchayat Noticeboard + signup + claim-filing Ravi-mode + nominee-console Sunita-mode + member-directory + DPDPA data-export | See entry file §2 | `multi-party-state-machine; external-integration; safety-critical-with-property-test-coverage; multi-tenant-RLS` (aggregated across Tier-1 flows) | FR-74 / FR-100 / UX-DR3 (most load-bearing for Tier-1) / Story-1.10-audit-line | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `pending-Task-7` | A-substrate-readiness; A-digilocker-integration-readiness; A-upi-integration-readiness; P0-2a/b/c-synthesis-readiness | none | `per-tier-surface-estimates/tier-1-member-primary.md` | `pending-substantive-author-commit` |

## §5 Tier-2 staff-primary rows

1 aggregated row covering all Tier-2 staff-primary flows per UX §1 + UX §8:

| row_id | row_type | owning_epic_and_stories | surface_count | complexity_profile | cross_cutting_ci_participation | engineer_month_floor | engineer_month_ceiling | confidence_band | assumption_dependencies | funding_tradeoff_xref | entry_file | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tier-2-staff-primary` | `tier-2-staff-primary` | Epics 4, 6, 10, 13 — staff-facing surfaces: Helpline Operator console + Anita's Verifier Console + Vikram field-worker dispatch + helpdesk admin console + trustee tooling + R9 voting workflow + State-Trustee approval surface | See entry file §2 | `multi-party-state-machine; external-integration; multi-tenant-RLS` (aggregated across Tier-2 flows) | FR-74 / FR-100 / UX-DR3 / Story-1.10-audit-line | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `pending-Task-7` | A-substrate-readiness; P0-2d-operator-shadowing-synthesis; P0-2a-teacher-synthesis | `backfill-log` BFL-008 (Operations Lead salary — operations lead manages staff-facing surfaces); BFL-009 (README §8 slot 3) | `per-tier-surface-estimates/tier-2-staff-primary.md` | `pending-substantive-author-commit` |

## §6 Tier-3 admin-audit rows

1 aggregated row covering all Tier-3 admin-audit flows per UX §8:

| row_id | row_type | owning_epic_and_stories | surface_count | complexity_profile | cross_cutting_ci_participation | engineer_month_floor | engineer_month_ceiling | confidence_band | assumption_dependencies | funding_tradeoff_xref | entry_file | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tier-3-admin-audit` | `tier-3-admin-audit` | Epics 10, 14 — admin-audit surfaces: bulk ops + feature flags + member moderation + news/blog + reports/exports + banners + audit-log integrity-verification UI + DPO breach reporting | See entry file §2 | `multi-tenant-RLS; external-integration` (aggregated across Tier-3 flows; lower complexity per surface than Tier-1/2) | FR-74 / FR-100 / UX-DR3 (less load-bearing for Tier-3) / Story-1.10-audit-line | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` | `pending-Task-7` | A-substrate-readiness | none | `per-tier-surface-estimates/tier-3-admin-audit.md` | `pending-substantive-author-commit` |

## §7 Epic-aggregation rows

15 rows — one per Epic 0 through Epic 14 with Epic 11a + 11b split. Each Epic-aggregation row sums the loop-node + Tier-N rows that map to it. **Revised 2026-06-01 per review D-03 + P-14:** §7 is the **deterministic source-of-truth** for the §8 totaling (NOT the sum of §3-§6 independently). §3-§6 are diagnostic views that expose scope distribution within each Epic-aggregation row.

At Task 6 author-commit: all Epic-aggregation floor + ceiling values are `<DERIVED-AT-TASK-7>` — Solo Builder populates after substantive estimates in §3-§6 are committed, then uses §7 row totals as the §8 input.

| row_id | row_type | owning_loop_nodes_and_tiers | engineer_month_floor | engineer_month_ceiling | excluded_from_total | notes |
|---|---|---|---|---|---|---|
| `epic-agg-epic-0` | `epic-aggregation` | Epic 0 framework authoring (Stories 0.1–0.15) | `0` | `0` | `true` | Epic 0 is governance + framework + non-engineering effort (trustee coordination, fieldwork, ratification cycles). Per the methodology §2 definition of "engineer-month at solo cadence" (design-to-merge engineering effort), Epic 0 work does not contribute to SM-1 cadence load. Excluded from §8 total estimate. Rationale: SM-1 is "first end-to-end claim closes without manual heroics" — Epic 0 closure is a precondition for SM-1, not part of SM-1's clock. |
| `epic-agg-epic-1` | `epic-aggregation` | Epic 1 platform foundation + multi-tenancy + RBAC + audit (Stories 1.1–1.17) | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | Substrate story; all downstream Epics depend on Epic 1 closure |
| `epic-agg-epic-2` | `epic-aggregation` | Epic 2 Niyamavali publishing + public trust identity (Stories 2.1–2.7) | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | |
| `epic-agg-epic-3` | `epic-aggregation` | Epic 3 member identity + lifecycle (Stories 3.1–3.12); includes `loop-node-kyc-fallback` component | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | Tier-1 signup + member-directory surfaces included in tier-1-member-primary row |
| `epic-agg-epic-4` | `epic-aggregation` | Epic 4 Rules Engine + member validity service (Stories 4.1–4.8); gates `loop-node-claim-filing` + `loop-node-denial-appeal` | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | Unbuilt substrate — `low` confidence band expected |
| `epic-agg-epic-5` | `epic-aggregation` | Epic 5 three-tier communication channels (Stories 5.1–5.9) | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | |
| `epic-agg-epic-6` | `epic-aggregation` | Epic 6 claim filing + peer verification + ground inspection + internal appeal (Stories 6.1–6.16); includes `loop-node-claim-filing` + `loop-node-peer-mesh` + `loop-node-ground-inspection` + `loop-node-denial-appeal` | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | Most loop nodes live here; cross-Epic integration cost load-bearing |
| `epic-agg-epic-7` | `epic-aggregation` | Epic 7 Pool Engine + cycle spawn (Stories 7.1–7.10); gates `loop-node-peer-mesh` + `loop-node-upi-failure-coach` | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | `safety-critical-with-property-test-coverage` dominates; `low` confidence band expected |
| `epic-agg-epic-8` | `epic-aggregation` | Epic 8 Sushil's contribution loop (Stories 8.1–8.12); includes `loop-node-upi-failure-coach` + Tier-1 Yogdaan Bahi + My Pool card | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | |
| `epic-agg-epic-9` | `epic-aggregation` | Epic 9 reconciliation engine (Stories 9.1–9.12); includes `loop-node-reconciliation`; includes Tier-1 nominee-console Sunita-mode | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | External-integration (bank-parser) complexity; `low` confidence band for bank-parser rows |
| `epic-agg-epic-10` | `epic-aggregation` | Epic 10 admin operations console (Stories 10.1–10.15); includes `loop-node-helpdesk` + Tier-2 operator console + Tier-3 admin surfaces | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | |
| `epic-agg-epic-11a` | `epic-aggregation` | Epic 11a public trust identity shell (Stories 11a.1–11a.6); Tier-1 member-directory + Tier-1 Panchayat Noticeboard | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | |
| `epic-agg-epic-11b` | `epic-aggregation` | Epic 11b memorial + Sahyog Drive (Stories 11b.1–11b.8); Tier-1 Shradhanjali Sahyog Vivran | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | Novel cultural domain; `low` confidence band expected |
| `epic-agg-epic-12` | `epic-aggregation` | Epic 12 module marketplace (Stories 12.1–12.6) | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | External forum dependency (FR-43A); `TBD-pending-external-forum-platform-decision` expected |
| `epic-agg-epic-13` | `epic-aggregation` | Epic 13 growth — field-worker attribution + member invite loop (Stories 13.1–13.8); gates `loop-node-ground-inspection` | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | |
| `epic-agg-epic-14` | `epic-aggregation` | Epic 14 disaster handling + DPO readiness + future-benefit hooks (Stories 14.1–14.7); Tier-3 admin-audit surfaces | `<DERIVED-AT-TASK-7>` | `<DERIVED-AT-TASK-7>` | `false` | |

## §8 Total estimate + SM-1 reconciliation

_This section is empty at Task 6 author-commit. Solo Builder populates at Task 8 (post-Task 7 substantive estimate authoring)._

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
| `total_estimate_floor` | `<TO-BE-POPULATED-AT-TASK-8>` |
| `total_estimate_ceiling` | `<TO-BE-POPULATED-AT-TASK-8>` |
| `floor_ratio` | `<TO-BE-POPULATED-AT-TASK-8>` |
| `ceiling_ratio` | `<TO-BE-POPULATED-AT-TASK-8>` |
| `reconciliation_trigger` | `<TO-BE-POPULATED-AT-TASK-8>` |
| `reconciliation_decision_proposal` | See `reconciliation-decision-framework.md` §2; proposal authored at Task 8 |

## §9 Mismatch-ratio history

_Accrues over time per re-attestation events. Empty at author-commit._

| Re-attestation date | total_estimate_floor | total_estimate_ceiling | floor_ratio | ceiling_ratio | trigger_fired | reconciliation_outcome | Notes |
|---|---|---|---|---|---|---|---|
| _(first reconciliation — Task 8)_ | | | | | | | |

---

**References:**
- [Source: `estimation-methodology.md`] — per-row estimation discipline
- [Source: `reconciliation-decision-framework.md §1`] — deterministic mismatch-ratio formula
- [Source: `docs/fallback-handler-ledger/ledger.md §3`] — eight Phase-1 loop nodes
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` §1 + §8] — Tier-N surface tiering
- [Source: `.decision-log.md` Decision 2026-06-01-012] — author-commit decision record
