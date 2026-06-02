# Per-Loop-Node Estimate: Claim Filing

**Loop node ID:** `claim-filing` (canonical slug per `docs/fallback-handler-ledger/ledger.md §3`)

**Status:** Author-committed 2026-06-01. §5 Engineer-month estimate carries `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` placeholders. Substantive estimate lands at Task 7.

---

## §1 Loop node identity

| Field | Value |
|---|---|
| Canonical slug | `claim-filing` |
| Loop node description | End-to-end claim submission, peer verification, ground inspection trigger, and internal state management for a death-benefit claim from initial filing to first payout decision |
| Owning Epic(s) | Epic 6 (Stories 6.1–6.16) — primary; Epic 4 (Rules Engine for claim validity); Epic 3 (member identity substrate); Epic 9 (reconciliation engine integration at payout) |
| Implementing Stories | 6.1 claim case object data model; 6.2 member app claim filing Ravi-mode; 6.3 helpline-mediated claim filing; 6.4 ICP dedup key; 6.5 death certificate OCR; 6.6 peer-mesh selection + ping; 6.7 ground inspection scheduling; 6.8 claim-time nominee bank detail; 6.9 claim-time DPDPA consent; 6.11 verification decision strip; 6.12 human-shepherd assignment; 6.13 state-trustee cycle-freeze approval; 6.14 R9 special-case voting; 6.15 concealment-flagged claim path; 6.16 denial-appeal flow |
| Worksheet row | `estimation-worksheet.md §3` row `loop-node-claim-filing` |

## §2 Implementation surface inventory

_At Task 6 author-commit, this section lists the surface categories from the Epic 6 + Epic 4 spec. Exact counts require Solo Builder to enumerate at Task 7._

**UI screens (estimate):**
- Member app claim filing flow (Ravi-mode): submission form + step indicators + document upload + confirmation (~4 screens)
- Helpline operator claim filing surface (Story 6.3): member lookup form + read-back card + claim-creation flow (~3 screens)
- Verifier console signals panel (Story 6.10): claim summary + peer-verification status + ground-inspection status (~3 screens)
- Verification decision strip (Story 6.11): reason-code dropdown + audit-trail view (~2 screens)
- Human-shepherd assignment (Story 6.12): assignment UI + member-facing progress tracker (~2 screens)
- State-trustee cycle-freeze approval (Story 6.13): bulk-approval surface + individual claim review (~2 screens)
- R9 special-case voting walkthrough (Story 6.14): multi-actor vote UI (~2 screens)
- Denial-appeal flow surfaces (Story 6.16): 3-stage appeal UI + Sahyog Vivran publish hook (~3 screens)

**API endpoints (estimate):**
- Claim CRUD + status transitions: POST /claims + GET /claims/:id + PATCH /claims/:id/status + GET /claims (paginated) + DELETE /claims/:id (~10 endpoints)
- Document upload + OCR: POST /claims/:id/documents + GET /claims/:id/documents/:doc_id (~4 endpoints)
- Peer-mesh: POST /claims/:id/peer-verifications + GET /claims/:id/peer-verifications (~3 endpoints)
- Ground inspection: POST /claims/:id/inspection + GET /claims/:id/inspection (~3 endpoints)
- Verification: POST /claims/:id/verification-decisions + GET /claims/:id/audit (~4 endpoints)
- Appeals: POST /claims/:id/appeals + PATCH /claims/:id/appeals/:id/status (~4 endpoints)

**Data-model migrations (estimate):**
- claim table + claim_status_event_log + peer_verification table + ground_inspection table + verification_decision table + appeal_case table + nominee_bank_detail table (~7 migrations)

**Background-job handlers (estimate):**
- claim-deadline-reminder job + peer-mesh-timeout escalation + ground-inspection-deadline job + shepherd-assignment-trigger (~4 handlers)

**Surface count summary:** ~22 UI screens + ~28 API endpoints + ~7 migrations + ~4 background-job handlers = **~61 surfaces** (subject to Task 7 refinement)

## §3 Complexity profile

| Dominant profile | Multiplier | Rationale |
|---|---|---|
| `multi-party-state-machine` | +50% | Claim state machine involves member + peer verifiers + ground inspector + verifier console + trustee + system automations across 8+ states with audit trail at each transition |
| `external-integration` | +50% | DigiLocker OCR parity check (Story 6.5); helpline telephony integration (Story 6.3 UX-DR45 + UX-DR46); DPDPA consent registry at claim time (Story 6.9) |
| `safety-critical-with-property-test-coverage` | +100% | Denial-appeal flow is legally consequential; R9 special-case voting requires property-test coverage; incorrect claim state transitions are irreversible financial errors |
| `multi-tenant-RLS-isolation` | +30% | All claim + verification data is scoped per Pariwar; RLS enforcement at every data-touching surface |

**Aggregate cross-Epic complexity profile (revised 2026-06-01 per review D-04):** the four profiles above (+50% + 50% + 100% + 30% = +230%) describe the loop node's worst-case surface mix when read in aggregate. **Per methodology §4(b) the +200% cap is per-surface, not per-row aggregate** — a single surface that legitimately attracts all four profiles must be decomposed before substantive estimate authoring. **Task 7 decomposition requirement:** Solo Builder MUST split the `claim-filing` loop node into sub-rows by implementing-Epic boundary before authoring substantive estimates. Recommended sub-rows: `claim-filing-epic-4-rules-engine-portion` (rules-driven validity logic; safety-critical-with-property-test-coverage applies), `claim-filing-epic-6-claim-ui-portion` (member + operator + verifier surfaces; multi-party-state-machine + multi-tenant-RLS applies), `claim-filing-epic-9-bank-parser-portion` (payout reconciliation integration if scoped here; external-integration applies). Each sub-row's complexity profile re-evaluates the §4(b) per-surface multipliers against its own surface inventory. Aggregate per-sub-row multipliers must respect the per-surface +200% cap; surfaces beyond +200% require further decomposition or explicit assumption-catalogue rationale. The original `loop-node-claim-filing` worksheet row stays as a diagnostic-view aggregator citing the sub-rows.

## §4 Cross-cutting CI participation

All four CI gates apply:
- **FR-74 PII scrape gate** — claim data includes member identity fields, nominee data, bank account details; PII classification and encryption discipline at every schema change
- **FR-100 schema-diff + benefit_mechanism tag gate** — every claim-state-transition endpoint emits a `benefit_mechanism`-tagged audit line; the schema-diff gate validates contract integrity at each PR
- **UX-DR3 friction-budget gate** — Ravi-mode claim filing (Tier-1 flow) gates friction-budget compliance; every new screen in the member-facing claim flow is measured
- **Story 1.10 audit-line emission gate** — every claim state transition emits a tamper-evident audit-log entry per Story 1.10 substrate; audit-line emission is the most load-bearing CI gate for Epic 6

**Estimated cross-cutting overhead:** 35-45% of surface effort (higher than baseline 20-45% range due to audit-line + PII density in claim data)

## §5 Engineer-month estimate

_**`<TO-BE-AUTHORED-BY-SOLO-BUILDER>`** — Task 7: Solo Builder enumerates exact §2 surface count + applies §3 complexity profile + computes floor + ceiling + confidence band per `estimation-methodology.md §4-§6`._

| Field | Value |
|---|---|
| `engineer_month_floor` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` |
| `engineer_month_ceiling` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` |
| `confidence_band` | `pending-Task-7` (expected: `medium` — Epic 6 has substantial prior art in claim state machines; specific UX + RLS patterns are TWT-specific) |
| `methodology_cite` | `estimation-methodology.md §4(a)-(e)` |

## §6 Assumption dependencies

Assumptions from `estimation-methodology.md §5` that gate this row's estimate:

- **A-substrate-readiness:** Epic 1 (member lifecycle state machine + RLS + audit-log substrate) must be complete before Epic 6 stories begin. If Epic 1 substrate is delayed, this row's floor shifts upward.
- **A-legal-counsel-return-latency:** Denial-appeal flow (Story 6.16) + DPDPA consent flow (Story 6.9) require legal review (Story 0.13); 5-10 biz-day latency per artifact in estimate.
- **A-trustee-ratification-latency:** State-trustee cycle-freeze approval surface (Story 6.13) requires trustee panel review sessions in estimate.
- **A-digilocker-integration-readiness:** OCR parity check (Story 6.5) requires DigiLocker sandbox access; 1-2 week integration latency assumed.
- **P0-2b-bereaved-spouse-synthesis-readiness:** Story 0.9 synthesis must close before Epic 6 design freeze per UX-DR5 + epics line 2263 explicit dependency; estimate assumes synthesis available before Epic 6 begins.

## §7 Funding-tradeoff cross-reference

This loop node carries two direct Story 0.12 funding-tradeoff cross-references from upstream artifacts (revised 2026-06-01 per review P-02 — BFL IDs corrected against backfill-log canonical assignments):

1. **Loop-node fallback-handler funding-status** (`docs/fallback-handler-ledger/loop-nodes/claim-filing.md §5`): "funding requires Trustee Panel + Story 0.12 reconciliation linkage" → `backfill-log.md` BFL-007
2. **Claim-shepherd salary** (`docs/fallback-handler-ledger/loop-nodes/claim-filing.md §5` line 58): "Trustee Panel + Story 0.12 P0-3 spec-to-cadence reconciliation will determine the substantive retainer-vs-salary-vs-volunteer-bridge posture at Task 9 ratification + per-loop-node negotiation" → `backfill-log.md` BFL-015

**No ledger.md backfill row** — `docs/fallback-handler-ledger/ledger.md §3` claim-filing funding-status row has no explicit Story 0.12 text at author-commit grep; therefore it is NOT a backfill-log row. The previous reference to a fictitious BFL-017 at ledger.md was a worksheet error; BFL-017's canonical assignment per `backfill-log.md` is `operations-lead-commitment.md` line 84 (Operations Lead salary range ADR slot).

The substantive reconciliation outcome at Task 9 will determine: (a) whether claim-shepherd is a contracted role in the contract-help path; (b) whether the claim-filing loop node's fallback-handler posture is `retainer-funded` vs `salary-funded` vs `volunteer-rota-bridge`.

## §8 Cross-references

- [Source: `estimation-worksheet.md §3`] — worksheet row `loop-node-claim-filing` (plus Task 7 sub-rows per §3 decomposition requirement)
- [Source: `docs/fallback-handler-ledger/loop-nodes/claim-filing.md §5`] — fallback-handler entry cross-reference (BFL-007 + BFL-015)
- [Source: `_bmad-output/planning-artifacts/epics.md` Epic 6] — implementing stories authority
- [Source: `estimation-methodology.md §4`] — estimation input discipline
- [Source: `backfill-log.md`] — citation-slot records for this loop node's funding-tradeoff cross-references
