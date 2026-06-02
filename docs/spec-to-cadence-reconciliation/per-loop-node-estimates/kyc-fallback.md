# Per-Loop-Node Estimate: KYC Fallback

**Loop node ID:** `kyc-fallback` (canonical slug per `docs/fallback-handler-ledger/ledger.md §3`)

**Status:** Author-committed 2026-06-01. §5 Engineer-month estimate carries `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` placeholders. Substantive estimate lands at Task 7.

---

## §1 Loop node identity

| Field | Value |
|---|---|
| Canonical slug | `kyc-fallback` |
| Loop node description | Manual KYC fallback path when DigiLocker automated KYC fails during member signup or claim filing; document submission + staff review + manual approval gate |
| Owning Epic(s) | Epic 3 (Story 3.3a DigiLocker provider interface abstraction + 3.3b DigiLocker KYC flow + manual fallback); Epic 6 (claim filing KYC gate) |
| Implementing Stories | 3.3a DigiLocker provider interface abstraction; 3.3b DigiLocker KYC flow in signup + manual fallback |
| Worksheet row | `estimation-worksheet.md §3` row `loop-node-kyc-fallback` |

## §2 Implementation surface inventory

**UI screens (estimate):**
- DigiLocker KYC flow in signup (Tier-1): DigiLocker redirect + callback + result display (~3 screens)
- Manual fallback: document upload form + submission confirmation (~2 screens)
- Staff KYC review queue (Tier-2 admin): document viewer + approval/rejection form (~3 screens)

**API endpoints (estimate):**
- DigiLocker provider: POST /kyc/digilocker/initiate + GET /kyc/digilocker/callback + POST /kyc/digilocker/verify (~6 endpoints)
- Manual fallback: POST /kyc/manual + GET /kyc/manual/:id (~4 endpoints)
- Staff review: GET /kyc/review-queue + PATCH /kyc/:id/decision (~4 endpoints)
(~14-16 endpoints)

**Data-model migrations (estimate):**
- kyc_attempt table + kyc_document table + kyc_review_event table (~3 migrations)

**Background-job handlers (estimate):**
- kyc-review-deadline-reminder + digilocker-callback-retry (~2 handlers)

**Surface count summary:** ~8 UI screens + ~16 API endpoints + ~3 migrations + ~2 background-job handlers = **~29 surfaces** (subject to Task 7 refinement)

## §3 Complexity profile

| Dominant profile | Multiplier | Rationale |
|---|---|---|
| `external-integration` | +50% | DigiLocker OAuth + document pull API; per-Aadhaar format variations; DigiLocker sandbox access required; integration failure handling is safety-critical |
| `multi-tenant-RLS-isolation` | +30% | KYC data is per-member per-Pariwar; highest-sensitivity PII tier (Aadhaar / government ID) |

**Aggregate complexity multiplier:** +50% + 30% = **+80%** above baseline. The manual fallback path adds a staff review flow; if DigiLocker reliability is high, the manual fallback is rarely used but still requires full implementation.

## §4 Cross-cutting CI participation

- **FR-74 PII scrape gate** — KYC data is the highest-sensitivity PII tier (Aadhaar / government ID); FR-74 gate is most critical for this loop node
- **FR-100 schema-diff + benefit_mechanism tag** — KYC approval events do not directly carry benefit_mechanism tags but gate claim filing (downstream benefit_mechanism emission)
- **UX-DR3 friction-budget gate** — DigiLocker KYC flow in signup is Tier-1 critical path; friction-budget gate applies
- **Story 1.10 audit-line emission gate** — every KYC attempt + approval/rejection emits tamper-evident audit-log entries (KYC is a PII-sensitive event requiring audit trail)

**Estimated cross-cutting overhead:** 35-45% (highest PII sensitivity)

## §5 Engineer-month estimate

_**`<TO-BE-AUTHORED-BY-SOLO-BUILDER>`** — Task 7._

| Field | Value |
|---|---|
| `engineer_month_floor` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` |
| `engineer_month_ceiling` | `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` |
| `confidence_band` | `pending-Task-7` (expected: `medium` — DigiLocker integration has prior art in Indian fintech; specific Aadhaar format handling is nuanced) |
| `methodology_cite` | `estimation-methodology.md §4(a)-(e)` |

## §6 Assumption dependencies

- **A-substrate-readiness:** Epic 1 (member lifecycle state machine + KMS PII encryption) must be available before Epic 3 DigiLocker stories begin.
- **A-digilocker-integration-readiness:** DigiLocker sandbox access assumed available; 1-2 week integration discovery latency. If DigiLocker API changes or access is restricted, this row's ceiling shifts upward.
- **A-story-0.14-native-stack-ratify:** Story 0.14 P0-5 native-stack decision determines whether the DigiLocker flow is implemented in Expo (React Native) or Flutter; different WebView/deep-link handling. `TBD-pending-Story-0.14-native-stack-ratify-decision` for the mobile-specific surface count.

## §7 Funding-tradeoff cross-reference

No direct Story 0.12 "reconciliation territory" cross-reference in the upstream `docs/fallback-handler-ledger/loop-nodes/kyc-fallback.md §5` at author-commit grep. Funding-posture determination is Story 0.12 Task 9 territory.

## §8 Cross-references

- [Source: `estimation-worksheet.md §3`] — worksheet row `loop-node-kyc-fallback`
- [Source: `docs/fallback-handler-ledger/loop-nodes/kyc-fallback.md`] — fallback-handler operational entry
- [Source: `_bmad-output/planning-artifacts/epics.md` Stories 3.3a + 3.3b] — implementing stories authority
- [Source: `estimation-methodology.md §4`] — estimation input discipline
