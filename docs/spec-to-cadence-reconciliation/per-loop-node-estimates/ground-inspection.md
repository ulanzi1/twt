# Per-Loop-Node Estimate: Ground Inspection

**Loop node ID:** `ground-inspection` (canonical slug per `docs/fallback-handler-ledger/ledger.md §3`)

**Status:** Author-committed 2026-06-01. §5 Engineer-month estimate carries `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` placeholders. Substantive estimate lands at Task 7.

---

## §1 Loop node identity

| Field | Value |
|---|---|
| Canonical slug | `ground-inspection` |
| Loop node description | Scheduling and conducting physical site visits by field workers for high-value or contested claims; inspection notes + photo documentation + outcome recording |
| Owning Epic(s) | Epic 6 (Story 6.7 ground-inspection scheduling); Epic 13 (field-worker dispatch + attribution system) |
| Implementing Stories | 6.7 ground-inspection scheduling, notes, photos; 13.3 field-worker mobile-first dispatch app |
| Worksheet row | `estimation-worksheet.md §3` row `loop-node-ground-inspection` |

## §2 Implementation surface inventory

**UI screens (estimate):**
- Ground inspection scheduling (verifier console / admin): schedule form + assignment to field worker (~2 screens)
- Field worker mobile app inspection surface: inspection checklist + photo upload + notes + submission (~3 screens)
- Inspection outcome view (verifier console): inspection report viewer + outcome status (~2 screens)

**API endpoints (estimate):**
- POST /claims/:id/inspections (schedule)
- GET /claims/:id/inspections/:inspection_id
- PATCH /claims/:id/inspections/:inspection_id (update notes/photos/outcome)
- POST /claims/:id/inspections/:inspection_id/photos
- GET /field-worker/inspections (field worker queue)
(~8-10 endpoints)

**Data-model migrations (estimate):**
- ground_inspection table + inspection_photo table (~2 migrations)

**Background-job handlers (estimate):**
- inspection-deadline-reminder + field-worker-dispatch-trigger (~2 handlers)

**Surface count summary:** ~7 UI screens + ~10 API endpoints + ~2 migrations + ~2 background-job handlers = **~21 surfaces** (subject to Task 7 refinement)

## §3 Complexity profile

| Dominant profile | Multiplier | Rationale |
|---|---|---|
| `external-integration` | +50% | Photo upload + storage (cloud object storage integration); field worker mobile app has offline-first requirements per PRD §9.3 cash-flow constraint context (rural deployment with connectivity constraints) |
| `multi-tenant-RLS-isolation` | +30% | Inspection data scoped per Pariwar; field-worker attribution per Pariwar assignment |

**Aggregate complexity multiplier:** +50% + 30% = **+80%** above baseline.

## §4 Cross-cutting CI participation

- **FR-74 PII scrape gate** — inspection data may include location (claim site address) and indirect identity references; photo metadata stripping required
- **FR-100 schema-diff + benefit_mechanism tag** — inspection outcome events emit audit-log entries linked to claim benefit_mechanism
- **UX-DR3 friction-budget gate** — field worker mobile app is Tier-2 staff-primary; friction-budget discipline applies but WCAG AA gap acceptable at v1 with tracking
- **Story 1.10 audit-line emission gate** — inspection scheduling + outcome events emit tamper-evident audit-log entries

**Estimated cross-cutting overhead:** 25-30% of surface effort

## §5 Engineer-month estimate

_**`<TO-BE-AUTHORED-BY-SOLO-BUILDER>`** — Task 7._

| Field | Value |
|---|---|
| `engineer_month_floor` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` |
| `engineer_month_ceiling` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` |
| `confidence_band` | `pending-Task-7` (expected: `medium` — mobile dispatch app has prior art; offline-first requirements add uncertainty) |
| `methodology_cite` | `estimation-methodology.md §4(a)-(e)` |

## §6 Assumption dependencies

- **A-substrate-readiness:** Epic 1 + Epic 13 (field-worker attribution + dispatch infrastructure) must be available before ground inspection UI is meaningful. Ground inspection is structurally downstream of field-worker identity lifecycle (Story 13.1).
- **PRD-§9.3-cash-flow-constraint:** The field-worker comp model is a cash-flow constraint that gates ground-inspection density. Story 0.12 reconciliation decision will determine whether field-worker comp is sustainable at v1 density or if cut-scope defers ground inspection frequency.
- **A-photo-storage-integration:** Object storage (Cloudflare R2 or GCS) integration for inspection photos; 1-week integration latency assumed.

## §7 Funding-tradeoff cross-reference

1. **Field-worker comp model and ground-inspection density** (`docs/fallback-handler-ledger/loop-nodes/ground-inspection.md §5` line 51): "funding requires Trustee Panel + Story 0.12 reconciliation linkage — the field-worker comp model itself is a cash-flow constraint that gates ground-inspection density; the fallback handler funding is structurally downstream of the field-worker comp decision." → `backfill-log.md` BFL-011

The substantive reconciliation outcome at Task 9 will determine whether field-worker comp is sustainable at v1 scale (affects ground-inspection density → affects per-claim inspection trigger frequency → affects Epic 6 + Epic 13 scope).

## §8 Cross-references

- [Source: `estimation-worksheet.md §3`] — worksheet row `loop-node-ground-inspection`
- [Source: `docs/fallback-handler-ledger/loop-nodes/ground-inspection.md §5`] — funding-tradeoff cross-reference (BFL-011)
- [Source: `_bmad-output/planning-artifacts/epics.md` Stories 6.7 + 13.3] — implementing stories authority
- [Source: `estimation-methodology.md §4`] — estimation input discipline
- [Source: `backfill-log.md`] — citation-slot records for this loop node
