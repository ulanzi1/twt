# Per-Loop-Node Estimate: Denial Appeal

**Loop node ID:** `denial-appeal` (canonical slug per `docs/fallback-handler-ledger/ledger.md §3`)

**Status:** Author-committed 2026-06-01. §5 Engineer-month estimate carries `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` placeholders. Substantive estimate lands at Task 7.

---

## §1 Loop node identity

| Field | Value |
|---|---|
| Canonical slug | `denial-appeal` |
| Loop node description | Three-stage internal appeal process when a claim is denied; Sahyog Vivran publish hook on reversed denial; cross-cut with R9 special-case voting for contested outcomes |
| Owning Epic(s) | Epic 6 (Story 6.16 3-stage denial-appeal flow + reversed-denial Sahyog Vivran publish hook); Epic 4 (Rules Engine for R9 special-case evaluation) |
| Implementing Stories | 6.16 3-stage claim denial-appeal flow + reversed-denial Sahyog Vivran publish hook |
| Worksheet row | `estimation-worksheet.md §3` row `loop-node-denial-appeal` |

## §2 Implementation surface inventory

**UI screens (estimate):**
- Appeal stage 1 (member-initiated): appeal form + grounds submission (~2 screens)
- Appeal stage 2 (committee review): trustee + staff review surface (~2 screens)
- Appeal stage 3 (final determination): final outcome screen + Sahyog Vivran publish trigger (~2 screens)
- Appeal status tracker (member app) (~1 screen)

**API endpoints (estimate):**
- POST /claims/:id/appeals (initiate stage 1)
- PATCH /claims/:id/appeals/:id/stage-2 (advance to committee)
- PATCH /claims/:id/appeals/:id/final-determination
- GET /claims/:id/appeals/:id/status
- POST /claims/:id/appeals/:id/sahyog-vivran (publish hook on reversal)
(~10-12 endpoints)

**Data-model migrations (estimate):**
- appeal_case table + appeal_stage_event table + sahyog_vivran_publish_log table (~3 migrations)

**Background-job handlers (estimate):**
- appeal-stage-deadline-reminder + sahyog-vivran-publish-trigger (~2 handlers)

**Surface count summary:** ~7 UI screens + ~12 API endpoints + ~3 migrations + ~2 background-job handlers = **~24 surfaces** (subject to Task 7 refinement)

## §3 Complexity profile

| Dominant profile | Multiplier | Rationale |
|---|---|---|
| `multi-party-state-machine` | +50% | Three-stage appeal with multiple actors (member, committee, system); outcome branching (reversal vs uphold); Sahyog Vivran publish hook on reversal |
| `safety-critical-with-property-test-coverage` | +100% | Denial-appeal is legally consequential; incorrect denial-reversal or failure to publish Sahyog Vivran on reversal is a trust-governance failure; property-test coverage required per architecture §Implementation Handoff |
| `multi-tenant-RLS-isolation` | +30% | Appeal data scoped per Pariwar |

**Aggregate complexity multiplier:** +50% + 100% + 30% = **+180%** above baseline.

## §4 Cross-cutting CI participation

- **FR-74 PII scrape gate** — appeal data includes claim-sensitive PII + committee deliberation (limited disclosure); PII discipline at schema design
- **FR-100 schema-diff + benefit_mechanism tag** — appeal outcome events emit benefit_mechanism-tagged audit lines (denial reversed → benefit authorized is a critical audit event)
- **UX-DR3 friction-budget gate** — member-facing appeal initiation (Tier-1) gates friction-budget
- **Story 1.10 audit-line emission gate** — every appeal stage transition + final determination emits tamper-evident audit-log entries (highest audit-priority surface in Epic 6)

**Estimated cross-cutting overhead:** 40-50% (safety-critical density + legal-audit requirement drives higher-than-baseline overhead)

## §5 Engineer-month estimate

**Cadence basis (§5 assumption override):** 80 hr/week NET + AI-assisted per `estimation-methodology.md §2 row 2` (D-03-resolved Tasks 7+8 review; ratification pending Task 9 ≥2-trustee co-sign per Decision 2026-06-04-016). 1 AI-cadence month = 346 hr per methodology §2.

**Derivation:** Story 6.16 (3-stage denial-appeal flow + Sahyog Vivran publish hook, very complex, 7 pts) + Epic 4 R9-special-case rule stories (Story 4.5 R9 voting workflow + Story 4.6 special-case evaluation = 2 complex stories = 8 pts) = 15 story-points × 4 hr/pt = 60 hr raw. Safety-critical property-test coverage (+100% per §3; legally consequential — AI generates property-test suites efficiently, discounting traditional overhead ~50%): 60 × 1.50 = 90 hr. CI/ADR overhead: 45% (highest audit-priority in Epic 6 per §4; every appeal stage-transition emits Story 1.10 audit-log; FR-100 benefit_mechanism on reversal events; legal-review artifact per Story 0.13) → 90 × 1.45 = 131 hr ÷ 346 hr/month = 0.38 months computed. **Assumption-catalogue adjustment (per Tasks 7+8 review P-03):** computed midpoint 0.38 → operational midpoint 0.24 on the grounds that (i) the multi-stage appeal pattern has substantial open-source prior art (workflow engines, state-machine libraries) that AI extracts efficiently — implementation effort lands closer to template-fill than novel design; (ii) the primary uncertainty is **legal-review return latency** (Story 0.13 dependency, 5-10 biz-days per artifact) which is captured in the LOW-band ceiling, not the midpoint; (iii) implementation complexity itself is bounded once legal-counsel-approved phrasings are returned. The 0.24 midpoint reflects implementation complexity; the wide low-band absorbs the legal-review latency uncertainty. Low-band asymmetric formula per methodology §3 (factor = 1.0): floor = 0.24 / 2 = 0.12; ceiling = 0.24 × 2 = 0.48. Low-band ratio 0.48 ÷ 0.12 = 4.0 ✓ — formula consequence per P-13 tautological-band disclaimer.

| Field | Value |
|---|---|
| `engineer_month_floor` | `0.12` |
| `engineer_month_ceiling` | `0.48` |
| `confidence_band` | `low` — legally consequential outcome; property-test coverage required for irreversible denial-reversal events; legal-review latency (Story 0.13) is ceiling driver. Low-band ratio check: 0.48 ÷ 0.12 = 4.0 ✓ |
| `methodology_cite` | `estimation-methodology.md §4(a)-(e)` |

## §6 Assumption dependencies

- **A-substrate-readiness:** Epic 6 claim state machine + Epic 4 Rules Engine (for R9 special-case integration) must precede Story 6.16.
- **A-legal-counsel-return-latency:** Story 6.16 (denial-appeal procedural fairness) is specifically named in Story 0.13 legal counsel scope; legal review latency 5-10 biz-days per artifact.
- **A-trustee-ratification-latency:** Appeal committee review surface requires Trustee Panel involvement; session scheduling latency in estimate.

## §7 Funding-tradeoff cross-reference

No direct Story 0.12 "reconciliation territory" cross-reference in the upstream `docs/fallback-handler-ledger/loop-nodes/denial-appeal.md §5` at author-commit grep. The denial-appeal loop node's fallback-handler funding posture is captured in `docs/fallback-handler-ledger/ledger.md §3` general `funding_status = unfunded`; substantive posture determination is Story 0.12 Task 9 territory.

## §8 Cross-references

- [Source: `estimation-worksheet.md §3`] — worksheet row `loop-node-denial-appeal`
- [Source: `docs/fallback-handler-ledger/loop-nodes/denial-appeal.md`] — fallback-handler operational entry
- [Source: `_bmad-output/planning-artifacts/epics.md` Story 6.16] — implementing story authority
- [Source: `estimation-methodology.md §4`] — estimation input discipline
