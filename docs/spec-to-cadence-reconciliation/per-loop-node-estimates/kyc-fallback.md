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

**Cadence basis (§5 assumption override):** 80 hr/week NET + AI-assisted per `estimation-methodology.md §2 row 2` (D-03-resolved Tasks 7+8 review; ratification pending Task 9 ≥2-trustee co-sign per Decision 2026-06-04-016). 1 AI-cadence month = 346 hr per methodology §2.

**Derivation:** Story 3.3b (DigiLocker OAuth + document-pull KYC flow, complex, 4 pts) + Story 3.4 (manual-fallback admin review flow, medium, 2 pts) = 6 story-points × 4 hr/pt = 24 hr raw. External-integration + RLS (+80% per §3): 24 × 1.80 = 43 hr. CI/ADR overhead: 40% (highest PII sensitivity — Aadhaar; FR-74 gate is most critical for this node; KYC events emit Story 1.10 audit-log) → 43 × 1.40 = 60 hr ÷ 346 hr/month = 0.17 months computed midpoint. **Assumption-catalogue adjustment (per Tasks 7+8 review P-03):** computed midpoint 0.17 → operational midpoint 0.12 on the grounds that (i) DigiLocker API is well-documented in Indian fintech with public SDK references; (ii) AI-assisted API exploration reduces integration-discovery latency from methodology §5 default 1-2 weeks to ~3-5 days (AI parses OpenAPI specs + generates wrapper code in hours); (iii) Aadhaar format handling is bounded by UIDAI spec (no format-discovery uncertainty). The 0.12 midpoint reflects the AI-cadence integration-discovery speedup. Medium-band asymmetric formula per methodology §3 (factor = 0.5; 1 + factor = 1.5): floor = 0.12 / 1.5 = 0.08; ceiling = 0.12 × 1.5 = 0.18. Medium-band ratio 0.18 ÷ 0.08 = 2.25 ✓ — formula consequence per P-13 tautological-band disclaimer.

| Field | Value |
|---|---|
| `engineer_month_floor` | `0.08` |
| `engineer_month_ceiling` | `0.18` |
| `confidence_band` | `medium` — DigiLocker prior art in Indian fintech; Aadhaar format handling bounded by UIDAI spec. Native-stack choice (Story 0.14) may shift surface count ±15% (Expo vs Flutter WebView handling). Medium-band ratio check: 0.18 ÷ 0.08 = 2.25 ✓ |
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
