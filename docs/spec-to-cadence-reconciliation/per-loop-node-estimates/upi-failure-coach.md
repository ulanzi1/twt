# Per-Loop-Node Estimate: UPI Failure Coach

**Loop node ID:** `upi-failure-coach` (canonical slug per `docs/fallback-handler-ledger/ledger.md §3`)

**Status:** Author-committed 2026-06-01. §5 Engineer-month estimate carries `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` placeholders. Substantive estimate lands at Task 7.

---

## §1 Loop node identity

| Field | Value |
|---|---|
| Canonical slug | `upi-failure-coach` |
| Loop node description | Contextual in-app coaching when UPI payment intent fails or is declined; member-visible recovery paths including UTR self-attestation + retry + out-of-band contribution escalation |
| Owning Epic(s) | Epic 8 (Story 8.5 UPI failure coach); Epic 7 (Pool Engine payment binding substrate) |
| Implementing Stories | 8.5 UPI failure coach; 8.10 out-of-band contribution policy |
| Worksheet row | `estimation-worksheet.md §3` row `loop-node-upi-failure-coach` |

## §2 Implementation surface inventory

**UI screens (estimate):**
- UPI failure coach screen (Tier-1 member app): contextual error display + coaching steps (~2 screens)
- UTR self-attestation flow: reference number entry + confirmation (~2 screens)
- Out-of-band contribution escalation: escalation form + acknowledgment (~2 screens)

**API endpoints (estimate):**
- POST /contributions/:id/upi-failures (record failure + trigger coaching)
- POST /contributions/:id/utr-self-attestation
- GET /contributions/:id/recovery-options
- POST /contributions/:id/out-of-band-escalation
(~6-8 endpoints)

**Data-model migrations (estimate):**
- upi_failure_event table + utr_self_attestation table + out_of_band_escalation table (~3 migrations)

**Background-job handlers (estimate):**
- upi-retry-reminder + out-of-band-escalation-tracker (~2 handlers)

**Surface count summary:** ~6 UI screens + ~8 API endpoints + ~3 migrations + ~2 background-job handlers = **~19 surfaces** (subject to Task 7 refinement)

## §3 Complexity profile

| Dominant profile | Multiplier | Rationale |
|---|---|---|
| `external-integration` | +50% | UPI intent round-trip failure handling; per-bank UPI failure codes vary; real-time payment status polling |
| `multi-tenant-RLS-isolation` | +30% | Payment failure events scoped per Pariwar per member per pool cycle |

**Aggregate complexity multiplier:** +50% + 30% = **+80%** above baseline. The UPI failure coach is a relatively bounded surface: coaching UI + UTR self-attestation + out-of-band escalation. The external-integration complexity is in understanding and handling per-bank UPI failure codes.

## §4 Cross-cutting CI participation

- **FR-74 PII scrape gate** — UPI failure events may include bank reference numbers + payment amounts; PII classification discipline
- **FR-100 schema-diff + benefit_mechanism tag** — UTR self-attestation events and out-of-band escalation events emit benefit_mechanism-tagged audit lines (contribution lifecycle events)
- **UX-DR3 friction-budget gate** — UPI failure coach is Tier-1 member app; friction-budget discipline applies (coaching steps must be scannable under distress)
- **Story 1.10 audit-line emission gate** — UPI failure + UTR attestation + out-of-band escalation events emit tamper-evident audit-log entries

**Estimated cross-cutting overhead:** 25-30% of surface effort

## §5 Engineer-month estimate

**Cadence basis (§5 assumption override):** 80 hr/week NET + AI-assisted. 1 AI-cadence month = 346 hr.

**Derivation:** Story 8.5 (UPI failure coach UI + UTR self-attestation recovery path, medium, 2 pts) + per-bank failure-code taxonomy integration (~2 pts medium for failure-code mapping + fallback NEFT escalation) = 4 story-points × 4 hr/pt = 16 hr raw. External-integration + RLS (+80% per §3): 16 × 1.80 = 29 hr. CI/ADR overhead: 28% (coaching surfaces emit FR-100 + Story 1.10 audit-log on UTR-attestation + out-of-band escalation events; UX-DR3 friction-budget gate applies to coaching steps) → 29 × 1.28 = 37 hr ÷ 346 hr/month = 0.11 months midpoint. Adjusted to 0.07 months (failure coach is downstream of Epic 8 UPI intent substrate — once the primary flow is built, coaching layer adds bounded incremental work; per-bank failure-code taxonomy is AI-tractable via payment-gateway documentation). Medium-band: floor = 0.07÷1.5 = 0.05, ceiling = 0.07×1.5 = 0.11. Ratio: 0.11÷0.05 = 2.2 (≈2.25; minor rounding accepted per methodology §3 logged-discrepancy clause).

| Field | Value |
|---|---|
| `engineer_month_floor` | `0.05` |
| `engineer_month_ceiling` | `0.11` |
| `confidence_band` | `medium` — UPI failure handling well-documented; coaching UX bounded; per-bank failure-code taxonomy adds limited uncertainty. Medium-band ratio: 0.11 ÷ 0.05 = 2.2 (≈2.25; minor rounding logged per methodology §3) |
| `methodology_cite` | `estimation-methodology.md §4(a)-(e)` |

## §6 Assumption dependencies

- **A-substrate-readiness:** Epic 7 Pool Engine payment binding substrate + Epic 8 UPI intent flow substrate (Story 8.4) must precede Story 8.5 UPI failure coach. The failure coach is a secondary surface downstream of the primary UPI intent flow.
- **A-upi-integration-readiness:** UPI intent + status API access assumed; 1-week integration discovery for failure-code taxonomy per payment gateway.

## §7 Funding-tradeoff cross-reference

No direct Story 0.12 "reconciliation territory" cross-reference in the upstream `docs/fallback-handler-ledger/loop-nodes/upi-failure-coach.md §5` at author-commit grep. Funding-posture determination is Story 0.12 Task 9 territory.

## §8 Cross-references

- [Source: `estimation-worksheet.md §3`] — worksheet row `loop-node-upi-failure-coach`
- [Source: `docs/fallback-handler-ledger/loop-nodes/upi-failure-coach.md`] — fallback-handler operational entry
- [Source: `_bmad-output/planning-artifacts/epics.md` Stories 8.5 + 8.10] — implementing stories authority
- [Source: `estimation-methodology.md §4`] — estimation input discipline
