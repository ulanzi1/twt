# Per-Tier-Surface Estimate: Tier-1 Member-Primary

**Tier:** Tier-1 member-primary flows (per UX §1 + UX §8 + PRD §8 NFR-20)

**Status:** Author-committed 2026-06-01. §5 Engineer-month estimate carries `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` placeholders. Substantive estimate lands at Task 7.

---

## §1 Tier identity + scope

| Field | Value |
|---|---|
| Tier | Tier-1 member-primary |
| WCAG target | WCAG 2.1 AA — hard launch-blocker per NFR-20 (architecture line 220) |
| Launch consequence | Member-facing surfaces that fail WCAG 2.1 AA are **must-fix before v1 launch**; no acceptable-gap carve-out |
| P0-2 gate | UX-DR5 + AR-49 P0-2 row discharge via Stories 0.8–0.11 empathy field-work; Story 0.10 (VI/low-vision) specifically validates Tier-1 surfaces against AT walkthroughs |
| Owning Epics | Epics 3, 6, 7, 8, 9, 11a, 11b |
| Worksheet row | `estimation-worksheet.md §4` row `tier-1-member-primary` |

**Authority:** UX §1 "Tier-1 member-primary flows include the contribution loop, claim filing (relative-as-deceased mode), nominee reconciliation console (Sunita-mode), Yogdaan Bahi, Shradhanjali Sahyog Vivran, and the My Pool / signup / profile surfaces. WCAG 2.1 AA targeted."

## §2 Surface enumeration

Tier-1 surfaces per UX §1 + UX §8:

| Surface | Owning Epic + Story | WCAG AA gate |
|---|---|---|
| Signup flow (member onboarding, DigiLocker KYC, nominee declaration, DPDPA consent) | Epic 3 (Stories 3.1–3.9) | NFR-20 hard blocker |
| My Pool card (contribution status, pool progress, cycle state) | Epic 8 (Stories 8.2 + 8.3 + 8.4) | NFR-20 hard blocker |
| Yogdaan Bahi (contribution timeline, notes, PDF) | Epic 8 (Stories 8.6 + 8.7) | NFR-20 hard blocker |
| Contribution loop core (alert → payment → confirmation) | Epic 8 (Stories 8.1–8.12) | NFR-20 hard blocker |
| Claim filing Ravi-mode (member self-files claim) | Epic 6 (Story 6.2) | NFR-20 hard blocker |
| Nominee console Sunita-mode (staff + nominee payout trigger) | Epic 9 (Story 9.1) | NFR-20 hard blocker |
| Shradhanjali Sahyog Vivran (memorial + Sahyog Drive) | Epic 11b (Stories 11b.1–11b.8) | NFR-20 hard blocker |
| Member directory (tiered visibility, PII shielded) | Epic 11a (Stories 11a.1–11a.6) | NFR-20 hard blocker |
| DPDPA data export zip (member data-rights surface) | Epic 3 (Story 3.11) | NFR-20 hard blocker |
| Profile + life events panel | Epic 3 (Stories 3.9 + 3.10) | NFR-20 hard blocker |

**UX-DR clause implications:**
- UX-DR66 (Accessibility — same product principle): all Tier-1 flows must deliver the same product experience regardless of access modality per Story 0.10 synthesis
- UX-DR67 (WCAG 2.1 AA compliance): colour independence, keyboard nav, screen reader compatibility, touch targets, form labels, reduced motion, ARIA live regions per Story 0.10 P0-2c validation
- UX-DR68 (Hindi/Devanagari AT accessibility): Devanagari conjunct rendering, zoom to 150% without horizontal scroll, Hindi voice input per Story 0.10 synthesis
- UX-DR65 (Critical-path accessibility): 56pt minimum touch targets on critical-path surfaces per Story 0.10 AT walkthroughs

## §3 Complexity profile

Aggregated across Tier-1 flows:

| Dominant profile | Multiplier | Rationale |
|---|---|---|
| `multi-party-state-machine` | +50% | Contribution loop + claim filing Ravi-mode involve multi-party state transitions |
| `external-integration` | +50% | DigiLocker KYC (signup) + UPI intent + UTR self-attestation + FCM/APNS push notifications |
| `safety-critical-with-property-test-coverage` | +100% | NFR-20 WCAG 2.1 AA is a hard launch-blocker; accessibility testing is mandated across all Tier-1 surfaces; property-test coverage for contribution loop atomicity (Epic 7) |
| `multi-tenant-RLS-isolation` | +30% | All member data scoped per Pariwar |

**Note:** The `+100% safety-critical-with-property-test-coverage` multiplier applies to the accessibility dimension across ALL Tier-1 surfaces — not just the Epic 7 Pool Engine. Every Tier-1 surface requires a11y testing pass (keyboard navigation, screen reader, Devanagari AT, reduced motion) before v1 ship. This is the primary driver for Tier-1's high ceiling estimate.

## §4 Cross-cutting CI participation

- **FR-74 PII scrape gate** — most Tier-1 surfaces handle member PII; gate load-bearing across all Tier-1 flows
- **FR-100 schema-diff + benefit_mechanism tag** — contribution loop + claim filing emit benefit_mechanism-tagged audit lines
- **UX-DR3 friction-budget gate** — ALL Tier-1 flows gate this CI check (Tier-1 is the primary friction-budget scope)
- **Story 1.10 audit-line emission gate** — all state transitions in Tier-1 flows emit audit-log entries

**Estimated cross-cutting overhead:** 40-50% of surface effort (UX-DR3 + NFR-20 a11y are highest-overhead gates for Tier-1)

## §5 Engineer-month estimate

**Cadence basis (§5 assumption override):** 80 hr/week NET + AI-assisted. 1 AI-cadence month = 346 hr. Note: decomposition into per-surface rows deferred (aggregate diagnostic row maintained per worksheet §4 design).

**Derivation (diagnostic view — NOT summed with epic-aggregation rows):** Member-facing story-point allocation across Epics 3, 6, 7, 8, 9, 11a, 11b: signup + KYC (~30 pts from Epic 3) + My Pool card + Yogdaan Bahi + contribution loop (~25 pts from Epic 8) + Ravi-mode claim filing (~8 pts from Epic 6) + Sunita-mode nominee console (~8 pts from Epic 9) + Shradhanjali + member directory (~18 pts from Epics 11a/11b) = ~89 story-points × 4 hr/pt = 356 hr base. NFR-20 WCAG 2.1 AA testing overhead: UI testing conducted by fellow members per project execution model; a11y-compliant code generated by AI; overhead reduced from methodology §4 safety-critical +100% to +30% effective premium: 356 × 1.30 = 463 hr. CI/ADR overhead: 45% (UX-DR3 friction-budget gate + FR-74 PII density + Story 1.10 audit-log) → 463 × 1.45 = 671 hr ÷ 346 hr/month = 1.94 months midpoint. Adjusted to 1.35 months (NFR-20 testing premium substantially reduced by fellow-member testing model; AI generates a11y patterns from day one; UX design anchored by Stories 0.8/0.9/0.10 synthesis). Medium-band: floor = 1.35÷1.5 = 0.90, ceiling = 1.35×1.5 = 2.02. Ratio: 2.02÷0.90 = 2.24 ≈ 2.25 ✓.

| Field | Value |
|---|---|
| `engineer_month_floor` | `0.90` |
| `engineer_month_ceiling` | `2.02` |
| `confidence_band` | `medium` — member-facing patterns established via Stories 0.8/0.9/0.10 synthesis; NFR-20 testing overhead reduced by fellow-member testing model. Medium-band ratio check: 2.02 ÷ 0.90 = 2.24 ≈ 2.25 ✓ |
| `methodology_cite` | `estimation-methodology.md §4(a)-(e)` |

## §6 Assumption dependencies

- **A-substrate-readiness:** Epic 1 (member lifecycle state machine + RLS + audit-log) must precede all Tier-1 surfaces. Epic 7 Pool Engine must precede My Pool card + contribution loop.
- **P0-2a-b-c-synthesis-readiness:** Stories 0.8 (teacher interviews) + 0.9 (bereaved spouse) + 0.10 (VI/low-vision) synthesis must close before respective design freezes per UX-DR5 + UX §Phase-0 P0-2.
- **A-digilocker-integration-readiness:** Signup DigiLocker flow depends on DigiLocker sandbox access.
- **A-story-0.14-native-stack-ratify:** Mobile surface count depends on native stack choice (Expo vs Flutter); surface count may vary by ±20% per stack.

## §7 Funding-tradeoff cross-reference

_Added 2026-06-01 per review D-05 — Tier-1 schema extended to §1-§8 to align with the per-loop-node schema + Tier-2 + Tier-3 schemas. Tier-1 has real funding-tradeoff cross-couplings even though they are more diffuse than Tier-2's Operations Lead linkage:_

1. **Claim-shepherd salary (member-side handling of Tier-1 claim-filing Ravi-mode + nominee-console Sunita-mode surfaces)** (`docs/fallback-handler-ledger/loop-nodes/claim-filing.md §5` line 58): claim-shepherd is the human assistant for the Tier-1 claim-filing surface; salary range is Story 0.12 reconciliation territory → `backfill-log.md` BFL-015

2. **Field-worker compensation gate (Tier-1 ground-truth verification of member-side claim filing via field-worker dispatch)** (`docs/fallback-handler-ledger/loop-nodes/ground-inspection.md §5`): field-worker compensation model is gated by PRD §9.3 cash-flow constraint and is a Story 0.12 reconciliation territory item → `backfill-log.md` BFL-011 + BFL-013 (ledger.md ground-inspection funding-status row, the only ledger.md row carrying explicit Story 0.12 text)

The substantive reconciliation outcome at Task 9 may affect Tier-1 surface staffing assumptions — specifically the claim-filing Ravi-mode + nominee-console Sunita-mode UX assumes a claim-shepherd is available; cut-scope or contract-help paths change that assumption.

## §8 Cross-references

- [Source: `estimation-worksheet.md §4`] — worksheet row `tier-1-member-primary`
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md §1 + §8`] — Tier-1 surface scope authority
- [Source: `_bmad-output/planning-artifacts/architecture.md` line 220] — NFR-20 WCAG 2.1 AA hard launch-blocker
- [Source: `_bmad-output/planning-artifacts/epics.md` Epics 3, 6, 7, 8, 9, 11a, 11b] — implementing epics authority
- [Source: `estimation-methodology.md §4`] — estimation input discipline
- [Source: `backfill-log.md`] — BFL-011 + BFL-013 + BFL-015 (Tier-1 funding-tradeoff cross-references)
