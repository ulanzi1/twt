# Per-Loop-Node Estimate: Peer Mesh

**Loop node ID:** `peer-mesh` (canonical slug per `docs/fallback-handler-ledger/ledger.md §3`)

**Status:** Author-committed 2026-06-01. §5 Engineer-month estimate carries `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` placeholders. Substantive estimate lands at Task 7.

---

## §1 Loop node identity

| Field | Value |
|---|---|
| Canonical slug | `peer-mesh` |
| Loop node description | Deterministic selection of 5 nearest peers for claim verification + dispatch of verification pings + peer response collection + R9 special-case multi-actor voting when peer-mesh result is contested |
| Owning Epic(s) | Epic 6 (Stories 6.6 peer-mesh selection + ping + 6.14 R9 voting); Epic 7 (Pool Engine geometry substrate for nearest-member selection) |
| Implementing Stories | 6.6 peer-mesh deterministic 5-nearest selection + ping; 6.14 R9 special-case voting walkthrough |
| Worksheet row | `estimation-worksheet.md §3` row `loop-node-peer-mesh` |

## §2 Implementation surface inventory

**UI screens (estimate):**
- Peer-verification request (member app): ping notification + verification form (~2 screens)
- Peer-verification status tracker (member app + verifier console): pending verifiers list + completion status (~2 screens)
- R9 voting walkthrough: multi-actor vote collection UI + tally display (~2 screens)

**API endpoints (estimate):**
- POST /claims/:id/peer-verifications (trigger 5-nearest selection + dispatch)
- GET /claims/:id/peer-verifications (status)
- POST /claims/:id/peer-verifications/:peer_id/responses
- GET /claims/:id/peer-verifications/:peer_id/responses
- POST /claims/:id/r9-voting (trigger R9 special-case path)
- GET /claims/:id/r9-voting/status
(~6-8 endpoints)

**Data-model migrations (estimate):**
- peer_verification table + peer_response table + r9_vote table (~3 migrations)

**Background-job handlers (estimate):**
- peer-mesh-timeout escalation (non-responsive peer escalation after SLA); peer-mesh completion aggregation (~2 handlers)

**Surface count summary:** ~6 UI screens + ~8 API endpoints + ~3 migrations + ~2 background-job handlers = **~19 surfaces** (subject to Task 7 refinement)

## §3 Complexity profile

| Dominant profile | Multiplier | Rationale |
|---|---|---|
| `multi-party-state-machine` | +50% | Peer-mesh involves 5 external actors (selected peers) + claim owner + system; non-response escalation; R9 voting adds contested-outcome path |
| `multi-tenant-RLS-isolation` | +30% | Peer selection geometry is per-Pariwar; peer identity disclosure is RLS-scoped |

**Aggregate complexity multiplier:** +50% + 30% = **+80%** above baseline. Note: peer-mesh is less complex than claim-filing because the surface count is smaller and the state machine is simpler (verification dispatch → response collection → aggregation, without the full claim lifecycle).

## §4 Cross-cutting CI participation

- **FR-74 PII scrape gate** — peer identity (limited; peer pseudonymization possible but name disclosure at verification stage) + member claim data exposure to peer
- **FR-100 schema-diff + benefit_mechanism tag** — peer-verification events emit audit-log entries linked to claim benefit_mechanism
- **UX-DR3 friction-budget gate** — peer verification request flow is member-facing (Tier-1); friction-budget discipline applies to ping acceptance UX
- **Story 1.10 audit-line emission gate** — each peer-verification event + each R9 vote emits a tamper-evident audit-log entry

**Estimated cross-cutting overhead:** 25-35% of surface effort

## §5 Engineer-month estimate

_**`<TO-BE-AUTHORED-BY-SOLO-BUILDER>`** — Task 7._

| Field | Value |
|---|---|
| `engineer_month_floor` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` |
| `engineer_month_ceiling` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` |
| `confidence_band` | `pending-Task-7` (expected: `medium` — deterministic selection algorithm has prior art; multi-actor voting is less well-defined) |
| `methodology_cite` | `estimation-methodology.md §4(a)-(e)` |

## §6 Assumption dependencies

- **A-substrate-readiness:** Epic 7 Pool Engine geometry substrate (member-to-pool assignment + nearest-member selection) must be available for peer-mesh deterministic selection. If Epic 7 is cut-scope'd at reconciliation, peer-mesh deterministic selection fallback strategy is needed.
- **A-peer-mesh-coordinator-volunteer-rota-bridge:** The peer-mesh loop node currently operates at `volunteer-rota-bridge` funding posture (Story 0.7 `loop-nodes/peer-mesh.md §5`). The Story 0.12 reconciliation decision determines whether the transition to `retainer-funded` happens at v1 or is deferred.

## §7 Funding-tradeoff cross-reference

1. **Loop-node fallback-handler funding transition** (`docs/fallback-handler-ledger/loop-nodes/peer-mesh.md §5` line 50): "the transition to retainer-funded is Story 0.12 spec-to-cadence reconciliation territory." → `backfill-log.md` BFL-010

The substantive reconciliation outcome at Task 9 will determine whether the peer-mesh coordinator funding transitions to `retainer-funded` at v1 launch or remains `volunteer-rota-bridge` per the explicit-deferral posture.

## §8 Cross-references

- [Source: `estimation-worksheet.md §3`] — worksheet row `loop-node-peer-mesh`
- [Source: `docs/fallback-handler-ledger/loop-nodes/peer-mesh.md §5`] — fallback-handler funding cross-reference (BFL-010)
- [Source: `_bmad-output/planning-artifacts/epics.md` Stories 6.6 + 6.14] — implementing stories authority
- [Source: `estimation-methodology.md §4`] — estimation input discipline
- [Source: `backfill-log.md`] — citation-slot records for this loop node
