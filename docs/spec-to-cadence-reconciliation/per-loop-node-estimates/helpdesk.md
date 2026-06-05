# Per-Loop-Node Estimate: Helpdesk

**Loop node ID:** `helpdesk` (canonical slug per `docs/fallback-handler-ledger/ledger.md §3`)

**Status:** Author-committed 2026-06-01. §5 Engineer-month estimate carries `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` placeholders. Substantive estimate lands at Task 7.

---

## §1 Loop node identity

| Field | Value |
|---|---|
| Canonical slug | `helpdesk` |
| Loop node description | Inbound member helpdesk tickets via member app or helpline operator surface; SLA-tracked resolution by admin; cross-channel ticket convergence at ICP |
| Owning Epic(s) | Epic 10 (Stories 10.1–10.4 helpdesk subsystem + operator surface); Epic 5 (channel dispatcher for helpdesk notifications) |
| Implementing Stories | 10.1 helpdesk subsystem data model + routing-policy registry; 10.2 member-facing helpdesk ticket filing; 10.3 helpline call-to-ticket operator surface (SM-1 demo beat C3); 10.4 helpdesk admin console + SLA tracking + cross-link integration |
| Worksheet row | `estimation-worksheet.md §3` row `loop-node-helpdesk` |

## §2 Implementation surface inventory

**UI screens (estimate):**
- Member app helpdesk ticket filing: category selection + description + attachment (~2 screens)
- Member app ticket status tracker (~1 screen)
- Helpline operator call-to-ticket surface (Tier-2): member lookup + call notes + ticket creation + read-back card (~4 screens per Story 0.11 P0-2d synthesis inputs)
- Admin helpdesk console: ticket queue ordered by SLA deadline proximity + ticket detail + resolution + cross-link to claim (~4 screens)
- SLA tracking dashboard (Tier-3 admin-audit) (~2 screens)

**API endpoints (estimate):**
- Ticket CRUD: POST /helpdesk/tickets + GET + PATCH + DELETE (~8 endpoints)
- Routing-policy registry: GET /helpdesk/routing-policies + PATCH (admin) (~4 endpoints)
- SLA tracking: GET /helpdesk/sla-report + POST /helpdesk/tickets/:id/sla-override (~4 endpoints)
- Cross-link: PATCH /helpdesk/tickets/:id/claim-link (~2 endpoints)
(~18-20 endpoints)

**Data-model migrations (estimate):**
- helpdesk_ticket table + helpdesk_routing_policy table + helpdesk_sla_event table (~3 migrations)

**Background-job handlers (estimate):**
- sla-deadline-reminder + sla-breach-escalation + ticket-auto-close (~3 handlers)

**Surface count summary:** ~13 UI screens + ~20 API endpoints + ~3 migrations + ~3 background-job handlers = **~39 surfaces** (subject to Task 7 refinement; subject to Story 0.11 P0-2d synthesis refinement of routing-policy categories + SLA targets)

## §3 Complexity profile

| Dominant profile | Multiplier | Rationale |
|---|---|---|
| `external-integration` | +50% | Helpline telephony integration (Story 10.3 per Story 0.11 P0-2d operator-shadowing synthesis); ICP dedup-key cross-channel convergence (Story 6.4 substrate) |
| `multi-tenant-RLS-isolation` | +30% | Helpdesk tickets scoped per Pariwar; routing policies are per-Pariwar |

**Aggregate complexity multiplier:** +50% + 30% = **+80%** above baseline. Note: helpdesk routing-policy registry and SLA machinery are bounded scope; the operator surface (Story 10.3) is the highest-complexity surface due to telephony integration + Story 0.11 synthesis-informed design requirements.

## §4 Cross-cutting CI participation

- **FR-74 PII scrape gate** — helpdesk tickets may include member contact information + claim-related sensitive data; PII classification discipline at schema design
- **FR-100 schema-diff + benefit_mechanism tag** — ticket resolution events that trigger claim status changes emit benefit_mechanism-tagged audit lines
- **UX-DR3 friction-budget gate** — member-facing ticket filing (Tier-1 member app) gates friction-budget; operator surface (Tier-2) targets WCAG AA but acceptable v1 gap with tracking
- **Story 1.10 audit-line emission gate** — ticket status transitions + SLA events emit tamper-evident audit-log entries

**Estimated cross-cutting overhead:** 28-35% of surface effort

## §5 Engineer-month estimate

**Cadence basis (§5 assumption override):** 80 hr/week NET + AI-assisted per `estimation-methodology.md §2 row 2` (D-03-resolved Tasks 7+8 review; ratification pending Task 9 ≥2-trustee co-sign per Decision 2026-06-04-016). 1 AI-cadence month = 346 hr per methodology §2. Note: Story 0.11 P0-2d synthesis currently at `done` in sprint-status development_status; routing-policy categories + SLA assumptions from Story 0.11 are the basis here.

**Derivation:** Epic 10 Stories 10.1–10.4 (1 simple + 2 medium + 1 complex = 1+4+4 = 9 pts) + Epic 5 channel-dispatcher for helpdesk notifications (~3 medium stories = 6 pts) = 15 story-points. Diagnostic share of Epic 10: 4 of 15 stories = 26.67% ≈ **0.27 share** (rounding consistently to 2 sig figs); Epic 10 aggregation floor 0.40 × 0.27 = 0.108 months floor, rounds to **0.11**; ceiling 0.40 × 0.27 = 0.108 of Epic 10 ceiling 0.90 = 0.243, rounds to **0.24**. **Per Tasks 7+8 review P-10:** prior derivation showed `~27% / × 0.30 = 0.12 / 0.27` — the 0.30 multiplier was inconsistent with the cited 27% share (0.40 × 0.30 = 0.12 only by coincidence). Recomputed at consistent 0.27 share: floor 0.11 / ceiling 0.24 (diagnostic-only; §7 Epic 10 row remains the deterministic source for §8 totaling). Worksheet §3 cells retain the prior round values (0.12 / 0.27) per the append-only + supersession-only schema discipline; the corrected diagnostic values 0.11 / 0.24 are noted here as the methodology-consistent derivation. Routing-policy CRUD + SLA escalation engine are AI-generated efficiently once Story 0.11 routing categories are known. Confidence-band formula citation per methodology §3 + P-07: medium-band asymmetric form `floor = midpoint / (1 + factor)`, `ceiling = midpoint × (1 + factor)`, factor = 0.5 → 1 + factor = 1.5 (symmetric form coincides with asymmetric for medium-band).

| Field | Value |
|---|---|
| `engineer_month_floor` | `0.12` |
| `engineer_month_ceiling` | `0.27` |
| `confidence_band` | `medium` — operator console patterns established via Story 0.11 synthesis; routing-policy and SLA machinery are bounded CRUD + time-based escalation (AI-tractable). Medium-band ratio check: 0.27 ÷ 0.12 = 2.25 ✓ |
| `methodology_cite` | `estimation-methodology.md §4(a)-(e)` |

## §6 Assumption dependencies

- **A-substrate-readiness:** Epic 1 + Epic 5 (channel dispatcher for helpdesk notifications) must precede Epic 10. Epic 10 Story 10.3 telephony integration is also gated by Story 0.11 synthesis.
- **P0-2d-operator-shadowing-synthesis:** Story 0.11 synthesis must close before Epic 10 design freeze per epics line 3306 explicit dependency. Routing-policy categories + SLA targets are empirically informed by Story 0.11 shadowing findings (A-routing-claim-category-distinct + A-sla-24h-first-response + A-sla-5-day-resolution + A-helpline-call-to-ticket-5-step-workflow assumptions).
- **A-per-helpdesk-shift-staffing-depth:** The per-shift staffing depth (Story 0.12 reconciliation territory item per `helpdesk.md §5`) determines how many concurrent tickets the admin console queue must handle; affects UI complexity estimate.

## §7 Funding-tradeoff cross-reference

1. **Per-helpdesk-shift staffing depth** (`docs/fallback-handler-ledger/loop-nodes/helpdesk.md §5` line 50): "the shift count + per-shift staffing depth is a Story 0.12 reconciliation territory item." → `backfill-log.md` BFL-012

The substantive reconciliation outcome at Task 9 will determine: (a) per-shift staffing depth → affects admin console queue capacity design; (b) whether contracted operators are part of the contract-help path.

## §8 Cross-references

- [Source: `estimation-worksheet.md §3`] — worksheet row `loop-node-helpdesk`
- [Source: `docs/fallback-handler-ledger/loop-nodes/helpdesk.md §5`] — per-helpdesk-shift staffing cross-reference (BFL-012)
- [Source: `_bmad-output/planning-artifacts/epics.md` Stories 10.1–10.4] — implementing stories authority
- [Source: `estimation-methodology.md §4`] — estimation input discipline
- [Source: `backfill-log.md`] — citation-slot records for this loop node
