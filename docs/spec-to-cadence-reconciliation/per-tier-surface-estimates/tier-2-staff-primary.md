# Per-Tier-Surface Estimate: Tier-2 Staff-Primary

**Tier:** Tier-2 staff-primary flows (per UX §1 + UX §8 + PRD §8 NFR-20)

**Status:** Author-committed 2026-06-01. §5 Engineer-month estimate carries `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` placeholders. Substantive estimate lands at Task 7.

---

## §1 Tier identity + scope

| Field | Value |
|---|---|
| Tier | Tier-2 staff-primary |
| WCAG target | WCAG 2.1 AA — targeted, not a hard launch-blocker; acceptable v1 gap if specific staff surfaces ship below AA, but the gap must be named and tracked per UX §8 |
| Launch consequence | Staff-facing surfaces that fail WCAG 2.1 AA are **must-name-and-track** before v1 launch; acceptable-gap carve-out is available per UX §8 with tracking discipline |
| P0-2 gate | UX-DR5 + AR-49 P0-2 row discharge (architecture line 4782) via Story 0.11 P0-2d operator-shadowing synthesis; operator console design validated by shadowing real small-trust workflows per UX §1 principle 4. _Note (revised 2026-06-01 per review P-03): the AR-49 row this tier depends on is **P0-2**, not P0-3. Story 0.12 (this story) discharges the P0-3 row; Story 0.11 discharges the P0-2d component of the P0-2 row. The Tier-2 dependency is on Story 0.11's P0-2d synthesis, not on Story 0.12's P0-3 reconciliation._ |
| Owning Epics | Epics 4, 6, 10, 13 |
| Worksheet row | `estimation-worksheet.md §5` row `tier-2-staff-primary` |

**Authority:** UX §1 "Tier 2 (operator surfaces) — Helpline Operator intake console (Priya), Trustee-Lite signals panel, staff console, field-worker dispatch app, Trustee tooling." UX §8 "WCAG 2.1 AA also targeted for Tier-2 staff surfaces (Helpline operator console, Anita's Verifier Console, trustee tooling) — acceptable v1 gap if specific staff surfaces ship below AA, but the gap must be named and tracked."

## §2 Surface enumeration

Tier-2 surfaces per UX §1 + UX §8 + UX §8 Tier-2 inventory (line 1219):

| Surface | Owning Epic + Story | WCAG AA gate |
|---|---|---|
| Helpline Operator intake console (Priya) — member lookup + call notes + ticket creation + read-back card | Epic 10 (Story 10.3) | AA targeted; gap acceptable with tracking |
| Anita's Verifier Console — verification queue + 90s informed judgment + one-tap reason-code audit trail | Epic 6 (Story 6.3) | AA targeted; gap acceptable with tracking |
| Vikram field-worker dispatch app — assignment queue + GPS task dispatch + completion reporting | Epic 13 (Stories 13.3–13.5) | AA targeted; gap acceptable with tracking |
| Helpdesk admin console + SLA tracking (operator-side) | Epic 10 (Story 10.4) | AA targeted; gap acceptable with tracking |
| Trustee tooling — Niyamavali amendment workflow + diff view + fixed-amount setter + audit-of-Anita UI | Epic 4 (Stories 4.1–4.4) | AA targeted; gap acceptable with tracking |
| R9 voting workflow (Trustee Panel + peer-mesh special-case voting) | Epic 4 (Story 4.5) + Epic 6 (Story 6.14) | AA targeted; gap acceptable with tracking |
| State-Trustee approval surface (beneficiary payout authorization) | Epic 6 (Story 6.13) + Epic 9 (Story 9.8) | AA targeted; gap acceptable with tracking |
| HQ Finance disbursement-authorization screens | Epic 9 (Stories 9.9–9.11) | AA targeted; gap acceptable with tracking |
| FR-12A signals panel (Trustee-Lite pool health dashboard) | Epic 10 (Story 10.5) | AA targeted; gap acceptable with tracking |
| Staff claim intake queue + claim state machine admin surface | Epic 6 (Stories 6.1 + 6.4 + 6.9) | AA targeted; gap acceptable with tracking |

**UX-DR clause implications:**
- UX-DR66 (Accessibility — same product principle): targeted at Tier-2; acceptable v1 gap with tracking per UX §8 carve-out
- UX-DR67 (WCAG 2.1 AA compliance): targeted at operator surfaces; acceptable v1 gap with tracking per named-gap discipline
- Story 0.11 synthesis requirements: helpline operator console design must be validated by P0-2d operator-shadowing synthesis before design freeze (epics line 3306 explicit dependency)

## §3 Complexity profile

Aggregated across Tier-2 flows:

| Dominant profile | Multiplier | Rationale |
|---|---|---|
| `multi-party-state-machine` | +50% | R9 voting workflow + State-Trustee approval + Trustee tooling involve multi-party state transitions; claim state machine is the heaviest substrate |
| `external-integration` | +50% | Helpline telephony integration (Story 10.3); field-worker GPS + dispatch external APIs (Epic 13); FR-12A signals panel aggregation |
| `multi-tenant-RLS-isolation` | +30% | All staff data scoped per Pariwar; trustee tooling is per-Pariwar |

**Aggregate complexity multiplier:** +50% + 50% + 30% = **+130%** above baseline. Tier-2 carries lower safety-critical overhead than Tier-1 (no NFR-20 hard blocker) but higher state-machine complexity than Tier-3 (trustee tooling + R9 voting are non-trivial governance surfaces). The operator shadowing synthesis (Story 0.11) is the primary surface-count uncertainty driver — routing-policy categories + SLA targets are empirically informed by Story 0.11 findings.

## §4 Cross-cutting CI participation

- **FR-74 PII scrape gate** — staff surfaces handle member PII at operator access level; PII classification discipline applies (Anita's Verifier Console sees highest-sensitivity member claim data)
- **FR-100 schema-diff + benefit_mechanism tag** — trustee approval events + disbursement-authorization events + State-Trustee approval events emit benefit_mechanism-tagged audit lines
- **UX-DR3 friction-budget gate** — operator console surfaces gate UX-DR3 friction-budget discipline (though at lower Tier-2 sensitivity than Tier-1)
- **Story 1.10 audit-line emission gate** — all Trustee tooling state transitions + claim state machine transitions + disbursement-authorization events emit tamper-evident audit-log entries

**Estimated cross-cutting overhead:** 30-40% of surface effort (lower than Tier-1 due to no NFR-20 hard blocker, but trustee tooling audit density is high)

## §5 Engineer-month estimate

_**`<TO-BE-AUTHORED-BY-SOLO-BUILDER>`** — Task 7. Note: Story 0.11 P0-2d operator-shadowing synthesis (Tasks 8-11 of Story 0.11) directly informs the helpline operator console + helpdesk routing-policy categories that gate Story 10.3; Solo Builder should wait for Story 0.11 synthesis before finalizing the operator console surface count within this row. Per UX §8 Tier-2 inventory: component enumeration for Tier-2 organisms is committed to §10 and is a surface-count input gating this row._

| Field | Value |
|---|---|
| `engineer_month_floor` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` |
| `engineer_month_ceiling` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` |
| `confidence_band` | `pending-Task-7` (expected: `medium` for Verifier Console + helpdesk admin; `low` for Trustee tooling + R9 voting pending §10 component enumeration; overall: `low-to-medium`) |
| `methodology_cite` | `estimation-methodology.md §4(a)-(e)` |

## §6 Assumption dependencies

- **A-substrate-readiness:** Epic 1 (member lifecycle state machine + RLS + audit-log) + Epic 4 (Rules Engine for R9) + Epic 6 (claim state machine) must precede all Tier-2 staff surfaces.
- **P0-2d-operator-shadowing-synthesis:** Story 0.11 synthesis must close before Epic 10 Story 10.3 helpline operator console design freeze; routing-policy categories + SLA targets are empirically informed by Story 0.11 shadowing findings.
- **P0-2a-teacher-synthesis:** Story 0.8 teacher synthesis informs the Anita Verifier Console design requirements (Anita is the informed-consent-aware verification actor whose workflow is validated by teacher-persona field work).
- **A-story-0.14-native-stack-ratify:** Story 0.14 P0-5 native-stack decision determines whether the field-worker dispatch app (Vikram) is implemented in Expo vs Flutter; surface count may vary by ±15%.
- **A-ux-section-10-component-enumeration:** UX §10 component enumeration for Tier-2 organisms must be committed before Tier-2 organism surface count is final; this is a known open item in UX §8 (line 1261).

## §7 Funding-tradeoff cross-reference

_Revised 2026-06-01 per review P-02 — BFL source citations corrected against backfill-log canonical assignments:_

1. **Operations Lead hire decision** (`docs/fallback-handler-ledger/operations-lead-commitment.md` line 48): Operations Lead manages Tier-2 staff-facing surfaces at runtime; the hire decision table at line 48 is a Story 0.12 reconciliation territory item → `backfill-log.md` BFL-008

2. **Operations Lead substitute-handler-bench fallback** (`docs/fallback-handler-ledger/operations-lead-commitment.md` line 52, §4): substitute-handler-bench fallback for staff surfaces when Operations Lead is unavailable; funding posture is Story 0.12 reconciliation territory → `backfill-log.md` BFL-009

The previous citations pointing at `loop-nodes/helpdesk.md §5` and `spec-to-cadence-reconciliation/README.md §8 slot 3` were incorrect (the latter would have been a self-reference). Both BFL-008 and BFL-009 canonically point at `operations-lead-commitment.md` per the backfill-log.

## §8 Cross-references

- [Source: `estimation-worksheet.md §5`] — worksheet row `tier-2-staff-primary`
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md §1 + §8 (line 1219)`] — Tier-2 surface scope authority + component inventory
- [Source: `_bmad-output/planning-artifacts/epics.md` Epics 4, 6, 10, 13] — implementing epics authority
- [Source: `estimation-methodology.md §4`] — estimation input discipline
- [Source: `backfill-log.md`] — BFL-008 (Operations Lead hire decision) + BFL-009 (substitute-handler-bench fallback)
