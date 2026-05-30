---
project: TWT
date: 2026-05-28
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
filesIncluded:
  prd:
    - _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md
    - _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/addendum.md
  architecture:
    - _bmad-output/planning-artifacts/architecture.md
  epics:
    - _bmad-output/planning-artifacts/epics.md
  ux:
    - _bmad-output/planning-artifacts/ux-design-specification.md
  ux_supplementary:
    - _bmad-output/planning-artifacts/ux-design-directions.html
  overlays:
    - _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-27.md
  reference:
    - _bmad-output/planning-artifacts/briefs/brief-TWT-2026-05-22/brief.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-05-28
**Project:** TWT

## Document Inventory

### Authoritative Inputs

| Type | File | Size | Last Modified |
|---|---|---|---|
| PRD (primary) | `prds/prd-TWT-2026-05-22/prd.md` | 147 KB | 2026-05-27 |
| PRD (addendum) | `prds/prd-TWT-2026-05-22/addendum.md` | 20 KB | 2026-05-27 |
| Architecture | `architecture.md` | 278 KB | 2026-05-28 |
| Epics & Stories | `epics.md` | 437 KB | 2026-05-28 |
| UX Specification | `ux-design-specification.md` | 310 KB | 2026-05-24 |
| Sprint Change Overlay | `sprint-change-proposal-2026-05-27.md` | 67 KB | 2026-05-28 |

The Sprint Change Proposal is treated as an authoritative overlay on the PRD and epics where they conflict.

### Supplementary / Reference

| Type | File |
|---|---|
| UX Directions (visualization) | `ux-design-directions.html` |
| Project Brief | `briefs/brief-TWT-2026-05-22/brief.md` |
| PRD audit trail | extracts, reconciliations, reviews, polish-summary, decision-log inside `prds/prd-TWT-2026-05-22/` |

### Discovery Notes

- **No duplicates** — no whole/sharded conflicts requiring resolution.
- **No required document missing** — PRD, Architecture, Epics, UX all present.
- **Both Architecture and Epics were updated 2026-05-28** (today), consistent with the recent Sprint Change Proposal.

## PRD Analysis

PRD authoritative set: `prd.md` + `addendum.md` + sprint change proposal overlay (2026-05-27). FRs are globally numbered FR-N (with letter-suffix variants 1A, 12A, 43A, 58A/B/C). Journeys UJ-1..UJ-10. Metrics SM-1..SM-7, counter-metrics SM-C1..SM-C5.

### Functional Requirements (extracted)

#### §4.1 Identity & Membership Lifecycle
- **FR-1** — Member signup with mandatory ₹110 Vyawastha Shulk (creates `pending-kyc` → `pending-fee` → `lock-in`). Realizes UJ-1.
- **FR-1A** — Annual Vyawastha Shulk renewal with **3-month grace**. States: `active` → `active_in_grace` → `lapsed_unpaid`. Mid-grace death is eligible; lapsed-unpaid death is not.
- **FR-2** — DigiLocker KYC with manual fallback (`pending-valid` until trustee validates). Feature-flagged path to hard-mandatory later.
- **FR-3** — Lock-in clock widget on home screen (WI-13).
- **FR-4** — Multi-nominee declaration with 75/25 split (R5(E)); nominee bank entered at claim-time, not signup.
- **FR-5** — Life Events panel `[v1-S, except medical-disclosure v1-M]` — IMA-listed serious-illness disclosure with concealment ack.
- **FR-6** — Voluntary withdrawal flow; ₹110 forfeited; 12-month rejoin lock under same identity.

#### §4.2 Niyamavali (Rules Engine)
- **FR-7** — Versioned per-Pariwar rule registry with `benefit_mechanism` discriminator (`pool` | `reserve`).
- **FR-8** — Lock-in policy — trustee-adjustable, member-count-driven ramp (1mo → 3mo → 6mo → 12mo); `lock_in_days_at_join` snapshot per member; no retroactive re-locking.
- **FR-9** — Contribution discipline (R7(A–G) carry-over with v1 caveats).
- **FR-10** — 90% Rule (R8) with R8(A) and R8(B) sub-clauses.
- **FR-11** — Special death scenarios (R5(C.2), R5(D), R5(E), R5(F), R9, R9(A), Mar 2025 suicide/murder exclusion) + R14-adapted concealment-denial.
- **FR-12** — Retirement coverage extension (every 5 yrs → +1 yr post-retirement).
- **FR-12A** — Member Validity Service: real-time, deterministic, replayable; p95 < 200ms; cache freshness invariant ≤ 60s. *Named uncompromisable.*

#### §4.3 Pool Engine
- **FR-13** — Auto-spawn N pools per cycle; culture-rooted naming (Mahabharata seed); letter codes preserved.
- **FR-14** — Deterministic balanced assignment `hash(member_id + cycle_id) mod N`; audit-reproducible.
- **FR-15** — Fixed-amount per pool over 12+ month periods (effective_from ≥ now+12mo; emergency multi-trustee override).
- **FR-16** — Pool-bound payment enforcement (wrong-pool = invalid, no refund).
- **FR-17** — Idempotent payment reference (`tr=` unique per `(member_id, alert_id)`).
- **FR-18** — Amount-lock at UPI Intent.
- **FR-19** — Under-funded cycle: deliver actual, no top-up; **Pool-Reality #2** close-of-cycle celebration framing.
- **FR-20** — Engine parameterized for future *daan* reuse; `support_category` discriminator. Pool spawn N=50/M=4L < 60s p95 (launch readiness gate).

#### §4.4 Alert Lifecycle & Monthly Cycle
- **FR-21** — "My Pool" home-screen card (WI-31).
- **FR-22** — Alert state machine: `draft → frozen → published → live → closed → settled`.
- **FR-23** — Structured `alert` object → multi-channel render.
- **FR-24** — Real-time per-pool live contributor list (members) — confirmation-gated.
- **FR-25** — Pending contributors per pool `[v1-S]`.
- **FR-26** — Real-time progress meter + personal deadline countdown `[v1-S]`.

#### §4.5 Payment, UTR Self-Attestation & Reconciliation
- **FR-27** — UPI Intent payment flow.
- **FR-28** — UTR self-attestation post-payment.
- **FR-29** — Nominee-pushed daily bank statement intake (PDF / CSV).
- **FR-30** — UTR matching engine (cron 6×/day during live alerts); 48h-to-mismatch flip.
- **FR-31** — Dual nominee bank accounts (RBI UPI limit workaround).
- **FR-32** — Screenshot upload as forced fallback on UTR mismatch only.
- **FR-33** — Contribution Note PDF (never "receipt"/"invoice").
- **FR-34** — UPI failure coach `[v1-S]`.
- **FR-35** — Retry queue with 4-hour reminders `[v1-S]`.
- **FR-36** — Over-payment self-report + auto-drafted polite recovery `[v1-S]`.

#### §4.6 Claim Flow, Peer Verification & Ground Inspection
- **FR-37** — Claim filing with nominee bank entered at claim-time.
- **FR-38** — Death certificate upload + OCR parity check.
- **FR-39** — Peer first-witness verification — 5 nearest members.
- **FR-40** — Ground inspection retained alongside peer mesh (both, not either).
- **FR-41** — Human shepherd assigned per claim `[v1-M]`.
- **FR-42** — Member status banner / Trustee-Lite signals panel.
- **FR-43** — Special-case routing per Niyamavali R9 (trustee voting).
- **FR-43A** — Internal claim-denial appeal flow (3 stages: District → State Trustee → Trustee discretion) `[v1-M]`.

#### §4.7 Admin UI — RBAC, Audit, News/Blog, Bulk Ops, Helpdesk
- **FR-44** — Flexible RBAC — permission keys + role bundles.
- **FR-45** — Scope dimension on every grant (block / district / state / pariwar / global).
- **FR-46** — 12 default seeded roles, editable (OQ-3).
- **FR-47** — Audit log — attributable, tamper-evident hash-chain, off-site mirror, 7-year retention; daily Merkle-root publication `[v1-S]`.
- **FR-48** — Permission delegation with date range `[v1-S]`.
- **FR-49** — Bulk operations everywhere with dry-run preview; per-item audit; scope-respecting; 5000-item batch cap.
- **FR-50** — Reconciliation review queue.
- **FR-51** — News/Blog dual surface with scheduled publishing, audience scoping, channel selection; review-distinct-from-author workflow.
- **FR-52** — Helpdesk / ticket system with categories, scope routing, SLA tracking.
- **FR-53** — Field-worker dispatch (mobile-first admin app); RBAC scope = self.
- **FR-54** — Custom fields per Pariwar via JSON columns.
- **FR-55** — Trustee fixed-amount setter + announcement workflow.
- **FR-56** — Member moderation — suspend / terminate / restore.
- **FR-57** — Trustee-Lite list + signals (v1 alternative to Kanban).
- **FR-58** — Survey/poll authoring + results dashboard `[v1-S]`.
- **FR-58A** — Reports & exports library (CSV/JSON; async over threshold).
- **FR-58B** — Banner / popup manager (scope/cohort-targeted).
- **FR-58C** — Feature flags per cohort (DigiLocker mandatory cutover is canonical use case).

#### §4.8 Multi-Pariwar Platform Architecture
- **FR-59** — `pariwar_id` first-class on every multi-tenant table. *Named uncompromisable (RBAC + multi-tenant isolation).*
- **FR-60** — Per-Pariwar branding config bundle.
- **FR-61** — Separate app per Pariwar — N build configs, N store listings.
- **FR-62** — GitHub → Dokploy auto-deploy v1; documented K8s migration path; 12-factor + container-image discipline.
- **FR-63** — Pariwar-Passport data model present (UI deferred to v2).

#### §4.9 Module Marketplace
- **FR-64** — Module manifest schema + storage.
- **FR-65** — Module shelf UI (members) with `eligibility_filter` + `scope_filter` + slot capacity.
- **FR-66** — Admin module-targeting wizard.
- **FR-67** — Time-bombed lifecycle (auto-archive at `valid_until` / slot=0).

#### §4.10 Communication & Brand Voice
- **FR-68** — Bilingual content with i18n hooks; Niyamavali Hindi/English parity.
- **FR-69** — Tone guide enforced via copy review.
- **FR-70** — Multi-channel render from single alert object.
- **FR-71** — In-app push notifications — primary delivery.
- **FR-72** — WhatsApp Business API integration `[v1-S]` — dual-gated (Pariwar admin + member self-declared opt-in via user-initiated WA message). UTILITY templates only.
- **FR-73** — Telegram channel mirror `[v1-S, locked]`.
- **(Sprint-Change overlay adds: SMS preserved for OTP, step-up-OTP, transactional fallback, degraded-mode bridge — bulk-alert SMS still dropped.)**

#### §4.11 Public Pages, Transparency & PII Shielding
- **FR-74** — Public-vs-Private matrix codified + enforced; automated public-PII-scan test.
- **FR-75** — Member Directory with PII shielding; forced pagination; `noindex`.
- **FR-76** — Sahyog Drive — Active + Archive (searchable).
- **FR-77** — Sahyog Vivran (per-claim story) with public verifier-profile hyperlinks; public SSR + login-walled bank-detail fragment (per sprint overlay).
- **FR-78** — In Memoriam.
- **FR-79** — Niyamavali public page with version diff.
- **FR-80** — English-first labels with Hindi parity.

#### §4.12 Growth, Field Worker Attribution & Onboarding
- **FR-81** — Field worker random 6-digit code (unique per Pariwar).
- **FR-82** — Optional Reference Code field at signup (FW code | adopter | empty).
- **FR-83** — Attribution analytics dashboard.
- **FR-84** — Field worker payment trigger gated on KYC + ₹110 + first valid contribution.
- **FR-85** — Field worker lifecycle (deactivation preserves prior attributions).
- **FR-86** — Anti-fraud throttling on attribution code `[v1-S]`.
- **FR-87** — Adopter chain attribution (data only in v1).

#### §4.13 Security, PII Shielding & Anti-Scraping
- **FR-88** — Cloudflare front + Bot Management + Turnstile (per sprint overlay: vendor-neutral edge/WAF capability bar; pivot to self-hosted under DPDPA review).
- **FR-89** — Rate limiting (IP / session / endpoint).
- **FR-90** — Login wall for sensitive data (nominee bank only during active alert window).
- **FR-91** — Forced pagination, no bulk export from public surfaces.
- **FR-92** — Honeypot fields + noindex on member-detail.
- **FR-93** — Phone/email obfuscation `[v1-S — moot per policy]`.

#### §4.14 Trust Posture, Compliance & DPDPA
- **§4.14.1 Regulatory Surface Inventory** — every cash flow enumerated against applicable law (Indian Trust Act, IT Act 12A/12AB, GST, TDS §194H, 80G, FCRA, RBI, PMLA, DPDPA, Consumer Protection Act 2019).
- **FR-94** — Trust posture in T&C — lawyer-reviewed (R5(D), R10(A/D/E), R10(B), tagline, "facilitator-not-intermediary").
- **FR-95** — Data export / portability (DPDPA ZIP).
- **FR-96** — Right to be Forgotten — soft delete + anonymize; no refund; 12-mo rejoin lock.
- **FR-97** — Consent registry (T&C, privacy, marketing, biometric, photo).
- **FR-98** — Disaster-handling policy (slow-roll, no panic, no reactive amount hikes).
- **FR-99** — DPO + breach-reporting readiness `[v1-S, MeitY threshold]`.

#### §4.15 Future Benefit Hooks
- **FR-100** — Durghatana Sahayata forward-compat hooks ONLY (no member-side benefit ships in v1). Hooks: indefinite Vyawastha Shulk receipt persistence, reserved payout-destination capability (no v1 schema), `benefit_mechanism` enum on rules registry (`pool` | `reserve`), separate request-entity at activation, audit-log substrate reuse, benefit independence.

### Non-Functional Requirements

**Cross-cutting (§8):**
- **NFR-Perf-1** — App cold start < 3s on Snapdragon 4-series / 3 GB RAM.
- **NFR-Perf-2** — My Pool render < 500 ms p95 when alert live.
- **NFR-Perf-3** — UPI Intent launch < 1 s p95.
- **NFR-Perf-4** — Reconciliation latency p95 < 4h during live alerts.
- **NFR-Rel-1** — Member-app availability ≥ 99.5% monthly; admin UI ≥ 99%.
- **NFR-Rel-2** — Pool spawn at cycle freeze atomic with retry semantics.
- **NFR-Sec-1** — PII at rest AES-256 (envelope encryption); in-transit TLS 1.3+.
- **NFR-Sec-2** — Audit log integrity (no post-write tampering; hash chain + off-site mirror).
- **NFR-Sec-3** — Cross-tenant isolation tested (P0 if breached).
- **NFR-Sec-4** — Cloudflare + Bot Management + Turnstile (or equivalent per §5.8a).
- **NFR-Obs-1** — Every state transition (member / alert / claim / reconciliation) emits a structured event.
- **NFR-A11y-1** — WCAG 2.1 AA **launch blocker** for member-app primary flows + public-site primary nav, Niyamavali, Sahyog pages. Devanagari rendering parity; scalable font sizing.
- **NFR-L10n-1** — Niyamavali Hindi/English parity; mismatch is launch blocker.
- **NFR-Data-1** — All PII stored in India (CERT-In compatible).
- **NFR-Backup-1** — Daily DB backups; restore tested quarterly; audit log archived separately.

**Feature-specific NFRs:**
- **NFR-FR12A** — Validity service p95 < 200 ms at ~4L scale; cache freshness ≤ 60s.
- **NFR-FR20** — Pool spawn for N=50, M=4L < 60s p95. Launch readiness gate requires measured evidence under simulated load.
- **NFR-FR30** — Reconciliation matcher idempotent + replayable; throughput for ~16k tx/pool over 15 days within 4-hour latency budgets.
- **NFR-FR47** — Audit retention 7 years; daily integrity check; off-site mirror every 6h; Merkle-root publication `[v1-S]`.
- **NFR-FR2** — DigiLocker latency budget 8s p95 (manual fallback CTA after 12s).
- **NFR-FR58C** — Flag evaluation < 5 ms per evaluation.

### Additional Requirements / Constraints

- **Three uncompromisable subsystems** (§9.1) — Pool Engine, Reconciliation pipeline, RBAC + multi-tenant isolation. Bugs are P0.
- **Solo-build operational continuity (§9.1.1)** — runbooks; credential escrow (≥2 trustees); code escrow; degradation policy; ADR + Niyamavali→FR mapping; backup-engineer retainer (A-13).
- **Phase-0 prerequisites** — trust legal formation, Trustee Panel formation, DPO appointment plan, Bihar field-worker recruitment plan (OQ-5), trust staff hiring plan (OQ-15), 80G/12A/GST/Indian Trust Act registrations (OQ-16), partner deal terms (OQ-4), Niyamavali legal review, brand name (OQ-1), cash-flow model, app-store + brand identity, IMA list canonical source (OQ-13), curated pool-name list (OQ-12), **architectural launch-blocker gates** (P0-1..P0-5, edge/WAF DPDPA, FR-20 capacity validation).
- **Trust posture (§4.14)** — facilitator/not-intermediary, codified in registry + UX. Weakening any of FR-6, FR-19, FR-32, FR-33, FR-36, FR-43, FR-43A, FR-74 fractures the posture.
- **Friction-as-resource principle (§4.5)** — happy path frictionless; friction budgeted at named surfaces only.
- **Expectation-calibration discipline (§4.12)** — recruitment copy goes through tone-guide review; never "₹50 lakh guaranteed/insurance."

### Open Questions / Assumptions (counts only — full list in PRD §13–14)
- **18 Open Questions** (OQ-1 brand → OQ-18 Durghatana Sahayata ratification). OQ-6 resolved.
- **14 Assumptions** (A-1..A-14).

### PRD Completeness Assessment

**Strong areas:**
- Capability surface is comprehensive (~106 FRs) with explicit `[v1-S]` / `[v1-M]` / `[v2]` / `[v3]` deferral tags.
- Trust posture, friction-budget, and expectation-calibration are codified as named principles that constrain downstream design.
- Glossary discipline is enforced — every domain noun defined once, FRs/UJs use terms verbatim.
- Regulatory surface inventory (§4.14.1) is concrete and named.
- Forward-compat hooks (FR-100) are surgical — minimal v1 surface, no destructive migration at v2.
- Three uncompromisable subsystems explicitly identified.
- Sprint Change Proposal (2026-05-27) closed 10 PRD↔architecture drift items pre-CE.

**Items downstream artifacts must honor:**
- FR-1A grace state machine — needs explicit `active_in_grace` + `lapsed_unpaid` states in architecture & epics (sprint overlay §1.14 commits this).
- FR-12A is the canonical "is this member valid?" answer surface — every admin and member screen must call it, not reimplement.
- FR-43A internal appeal flow is multi-stage with separation-of-duties — deferred Item 8 in sprint overlay (architecture treats as "thread, not substance") — **flag for epic review**.
- FR-100 forward-compat hooks (Item 6 deferred in sprint overlay) — load-bearing data commitment for back-proving historical Vyawastha Shulk state is not fully architected — **flag for epic review**.
- FR-14 pool engine hash-input-invariance (Item 7 deferred) — snapshot migration policy missing — **flag for epic review**.
- FR-13 curated pool-name list storage surface (Item 13 deferred) — undecided — **flag for epic review**.
- FR-6 rejoin-lock identity tuple post-RTBF (Item 4 deferred) — eHRMS retention through soft-delete unclear — **flag for epic review**.
- FR-69 / FR-94 tone-guide + lawyer-reviewed T&C commit gates (Item 14 deferred) — no enforcement architecture committed — **flag for epic review**.
- FR-54 JSONB custom-field hard limits (Item 16 deferred) — architecture may impose constraints PRD doesn't authorize — **flag for epic review**.
- TLS 1.3+ pinning at edge/internal hops (Item 18 deferred) — restated as NFR but not pinned — **flag for epic review**.

These eight deferred items are the explicit scope of *this* Implementation Readiness check (per sprint proposal §5 "Out of scope, deferred to IR").


## Epic Coverage Validation

The epics document (`epics.md`, 4398 lines, 173 stories across 16 epics including 11a/11b split) contains an explicit, structured **FR Coverage Map** at lines 485–508. Each of the 106 PRD FRs is assigned to **exactly one epic**, with a numeric count-check that sums to 106. The epics document also separately enumerates 29 NFRs, 69 ARs (architecture-derived requirements), and 80 UX-DRs as first-class inputs.

### Coverage Matrix (FR → Epic)

| Epic | FRs Covered | Count |
|---|---|---|
| Epic 0 — Pre-launch Operational Continuity & Phase-0 Gates | *(no FRs — discharges PRD §9.1.1 + P0-1..P0-5)* | 0 |
| Epic 1 — Platform Foundation, Multi-Tenancy, RBAC & Audit | FR-44, 45, 46, 47, 59, 60, 61, 62, 63, 88, 89, 90, 91, 92 | 14 |
| Epic 2 — Niyamavali Publishing & Public Trust Identity | FR-7, 68, 69, 79, 80, 94, 97 | 7 |
| Epic 3 — Member Identity & Lifecycle | FR-1, 1A, 2, 3, 4, 5, 6, 95, 96 | 9 |
| Epic 4 — Niyamavali Rules Engine & Validity Service | FR-8, 9, 10, 11, 12, 12A | 6 |
| Epic 5 — Three-Tier Communication Channels | FR-23, 70, 71, 72, 73 | 5 |
| Epic 6 — Claim Filing, Peer Verification, Ground Inspection & Internal Appeal | FR-37, 38, 39, 40, 41, 42, 43, 43A | 8 |
| Epic 7 — Pool Engine & Cycle Spawn | FR-13, 14, 15, 16, 17, 18, 19, 20 | 8 |
| Epic 8 — Sushil's Contribution Loop | FR-21, 22, 24, 25, 26, 27, 28, 33, 34 | 9 |
| Epic 9 — Reconciliation Engine | FR-29, 30, 31, 32, 35, 36, 50 | 7 |
| Epic 10 — Admin Operations Console (Helpdesk first-class) | FR-48, 49, 51, 52, 54, 55, 56, 57, 58, 58A, 58B, 58C | 12 |
| Epic 11a — Public Trust Identity Shell (parallel to Epic 3) | FR-74, 75, 93 | 3 |
| Epic 11b — Memorial + Sahyog Drive (post-Epic 9) | FR-76, 77, 78 | 3 |
| Epic 12 — Module Marketplace | FR-64, 65, 66, 67 | 4 |
| Epic 13 — Growth: Field-Worker Attribution & Member Invite Loop | FR-53, 81, 82, 83, 84, 85, 86, 87 | 8 |
| Epic 14 — Disaster Handling, DPO Readiness & Future-Benefit Hooks | FR-98, 99, 100 | 3 |
| **Total** | | **106** ✓ |

### Coverage Statistics

- **Total PRD FRs (incl. letter-suffix variants):** 106
- **FRs covered in epics:** 106
- **Coverage percentage:** **100%**
- **FRs claimed but not in PRD:** 0
- **FRs in PRD but not claimed:** 0

### Cross-Check — Eight Sprint-Change Deferred IR Items (per sprint proposal §5)

These eight items were explicitly deferred to this Implementation Readiness check. Story-level coverage spot-checked below:

| Sprint-Change Item | Coverage in Epics | Status |
|---|---|---|
| **Item 4** — FR-6 rejoin-lock identity tuple (eHRMS retention through RTBF) | Story 3.10 (12-mo rejoin block) + Story 3.12 (RTBF appends `rtbf.anonymized` event; rejoin lock holds even after anonymization; events immutable) | ✓ Addressed |
| **Item 6** — FR-100 back-prove historical Vyawastha Shulk state | Story 3.6 enforces indefinite retention (AR-67); **Story 14.6 "FR-100 Vyawastha Shulk Receipt Back-Prove Query — Replay-Derived Historical Proof Invariant"** | ✓ Addressed |
| **Item 7** — FR-14 Pool Engine determinism + hash-input-invariance | Story 7.4 "Deterministic Member-to-Pool Assignment + Property-Based + Replay Test Suite" | ✓ Addressed |
| **Item 8** — FR-43A multi-stage appeal (state machine + SLA + separation-of-duties) | Story 6.16 "3-Stage Claim-Denial Appeal Flow + Reversed-Denial → Sahyog Vivran Publish Hook (FR-43A)"; explicit reviewer-≠-original-decision-maker enforcement | ✓ Addressed |
| **Item 13** — FR-13 culture-rooted pool-name list storage surface | Story 7.2 "Pool Naming Service (Culture-Rooted Curated List + Dual Identifier UX-DR72)" | ✓ Addressed |
| **Item 14** — FR-69 tone-guide / FR-94 T&C enforcement architecture | Story 2.2 "Tone Guide + Vocabulary Enforcement Process"; Story 2.6 "T&C Version-Pinning Mechanism + Public Render (Pending Legal Review per Story 0.13)" | ✓ Addressed |
| **Item 16** — FR-54 JSONB custom-field hard limits | Story 10.12 "Per-Pariwar Custom Fields JSONB"; AR-7 per-Pariwar JSON Schema. **Spot-check needed in Step 4** that architecture does not impose constraints beyond PRD authorization. | ⚠ Spot-check in Architecture step |
| **Item 18** — TLS 1.3+ launch-blocker NFR restatement | **NFR-15 "In-transit TLS 1.3+ at edge and internal hops"** explicit in epic NFR inventory. **Spot-check needed** that a story commits the actual edge & internal-hop pinning. | ⚠ Spot-check in Architecture step |

### Missing FR Coverage

**None.** Every PRD FR is claimed by exactly one epic. The count-check in the epics document (`14 + 7 + 9 + 6 + 5 + 8 + 8 + 9 + 7 + 12 + 3 + 3 + 4 + 8 + 3 = 106`) holds.

### Coverage Quality Notes

- **First-class additions** in the epics document beyond simple FR-to-epic mapping:
  - **15 architectural-freeze boundaries** with erosion checks (e.g., Pool Engine deterministic assignment, event-derived member lifecycle state, RLS multi-tenant isolation, three-tier comms hierarchy, audit-log immutability property, `benefit_mechanism` discriminator enum) — these prevent silent decay during sprint execution.
  - **AR-1..AR-69** translates architecture/Sprint-Change commitments into epic inputs (Turborepo bootstrap, Cloud SQL Postgres + RLS, Cloud KMS HSM + Tink, three-tier channels with WA dual-gating, GCP audit-mirror IAM isolation, helpdesk §3.5a, public-page composition contract, pool-spawn capacity envelope, etc.).
  - **UX-DR1..UX-DR80** captures UX-spec design requirements as story-level inputs (component library, accessibility gates, Real Data Test, friction-budget CI gate, P0-1..P0-5 launch gates).
- **Cross-cutting commitments** explicitly enumerated for stories that span multiple epics (accessibility gate, §1.14 event-log primitive, friction-budget CI gate, one-slice-one-surface story discipline, Phase-0 prereq gates, PII scrape CI gate, FR-100 forward-compat CI gates).
- **Epic 0** is a deliberately FR-less epic that discharges PRD §9.1.1 (bus-factor mitigations) + UX P0-1..P0-5 + architectural launch gates. This is correct hygiene — pre-launch operational work is not feature work, and the epics document treats it accordingly.
- **Two FR-100 CI gates** (schema-diff + `benefit_mechanism` tag) are installed in **Epic 1** and run across Epics 2/3/7/8 — preventing late discovery of missing forward-compat hooks.
- **PII scrape CI gate** (FR-74) is installed in Epic 1 even though the Public-vs-Private matrix is owned by Epic 11a — so leaks cannot land in interim epics.

### Verdict (Step 3 only)

**Epic FR coverage is complete and structurally sound.** The two ⚠ spot-checks (Item 16 JSONB limits, Item 18 TLS 1.3+ pinning) are deferred into Step 4 (Architecture alignment).


## UX Alignment Assessment

### UX Document Status

**Found.** `ux-design-specification.md` (310 KB / 2753 lines). Loaded as authoritative.

The UX spec is organized as a "loop-first" view (Reconciliation loop, Claim loop, Contribution loop, Verification loop, Invite loop) rather than as an FR-by-FR map. The epics document is the canonical bridge between UX surfaces and PRD FRs — it captures **UX-DR1..UX-DR80** as first-class epic inputs alongside PRD FRs and architecture ARs.

### UX ↔ PRD Alignment

**User journeys cross-check (PRD UJ-N → UX journey):**

| PRD UJ | UX Coverage | Status |
|---|---|---|
| UJ-1 — Sushil signup (₹110, KYC, lock-in clock) | Implied across §6 Defining Core Experience + UX-DR24/25 + §11 journey infrastructure | ✓ Covered |
| UJ-2 — Sushil pays monthly contribution | UX **Journey 1: Sushil's Monthly Sahyog Cycle** (full Mermaid flow) | ✓ Covered |
| UJ-3 — Nominee files claim | UX **Journey 2: Ravi-mode (relative on deceased's phone)** + **Journey 3: Helpline-mediated (Priya path)** + UX-DR31..UX-DR34 | ✓ Covered (dual-path ICP, UX-DR75) |
| UJ-4 — Anita reviews claim queue | UX **Journey 5: Anita's Verification Queue** + UX-DR39 verification console (₹50L design budget) | ✓ Covered |
| UJ-5 — Vikram recruits & gets paid | Implied — field-worker dispatch UX-DR48; no dedicated journey diagram for the Vikram recruitment path | ⚠ Partial — covered at component level, not journey level |
| UJ-6 — Trustee changes fixed amount | Covered in §6 "Fixed-amount transition pattern" (3-month gradient on My Pool card) + Story 10.13 admin UI | ⚠ Partial — no dedicated trustee journey diagram |
| UJ-7 — Trustee amends Niyamavali | Covered in Story 2.4 admin workflow + §6 diff render | ⚠ Partial — no dedicated trustee journey diagram |
| UJ-8 — Public visitor browses Sahyog Drive | Covered in §8 Public Column Inventory + UX-DR13/14 + Epic 11a/11b | ⚠ Partial — no public-visitor journey diagram |
| UJ-9 — Member resolves UTR mismatch | UX Journey 1 yellow-stuck recovery branch + UX-DR28 `<SelfVerifySurface>` | ✓ Covered |
| UJ-10 — Reena explores Module Shelf | Covered via UX-DR1 (Module Shelf grief-context exclusion) + Stance #1 | ✓ Covered |
| **+ UX Journey 4** — Sunita's Reconciliation Cycle (nominee-side) | UX-DR35 `<NomineeConsole>` + UX-DR36 `<BankStatementUpload>` | UX-spec-added persona detail; productive expansion of PRD UJ-3 nominee-side scope |
| **+ UX Journey 6** — Invite fellow teachers (viral loop) | UX-DR29/30 + FR-87 v1-M promotion (a v1-S → v1-M elevation captured in UX) | UX-spec-added flow; aligns with FR-87 |

**Vocabulary alignment.** UX vocabulary discipline (UX-DR71 — `सम्मानित साथी` / "colleague"; "Deceased Member" / never "Late Teacher") aligns with PRD FR-69 tone guide.

**Stance ↔ PRD policy alignment.** UX foundational stances (UX-DR1 grief-context Module Shelf exclusion, UX-DR2 claim-time DPDPA consent, UX-DR3 friction-budget CI gate, UX-DR4 P0-1 fallback-handler launch gate, UX-DR5 P0-2 empathy field-work gate, UX-DR6 P0-5 native-stack validation) integrate cleanly with PRD policy (FR-65 module manifest, FR-97 consent registry, friction-as-resource principle, §9.1 uncompromisable subsystems, A-12 Kubernetes deferral, A-13 backup-engineer retainer).

### UX ↔ Architecture Alignment

**Substrate alignment (UX-DRs → Architecture ARs):**

| UX-DR | Architecture commitment | Status |
|---|---|---|
| UX-DR7 React Native + Tamagui native; Tailwind + Radix web | AR-1 Turborepo + apps/mobile (Expo + Tamagui + Expo Router) + apps/public (Astro 6 SSR) | ✓ Aligned |
| UX-DR8 `packages/tokens` hand-rolled TS | AR-1 packages/tokens/ in monorepo | ✓ Aligned |
| UX-DR11 `packages/i18n` centralized utility | AR-59 i18n at the core; CI lint against inline formatting | ✓ Aligned |
| UX-DR39 verification console ~5s load, no N+1, 10k/50k virtualization | AR-65 compound read models; AR-39 push primary; Story 6.10 indexed query | ✓ Aligned |
| UX-DR67 WCAG AA + NFR-20 launch blocker | NFR-20/21/22 + AR-? accessibility audit gate (Story 11b.8 + Epic 0 Story 0.10 P0-2c) | ✓ Aligned |
| UX-DR74 Account State Machine UX | AR-14 §1.14 member lifecycle state machine + Sprint-Change Item 3 + Cross-Cutting #12 | ✓ Aligned (composed Account-State enumeration deferred per Sprint-Change Item 3 Gap Analysis — explicit and tracked) |
| UX-DR75 dual-path claim ICP | AR-62 ICPs + Story 6.4 Intake Convergence Point | ✓ Aligned |
| UX-DR80 list virtualization platform contract | AR-? virtualization library choice deferred to ADR; epic Story 11b.2 (50k desktop / 10k mobile) | ✓ Aligned |
| UX-DR3 friction-budget CI gate | AR-60 Friction-as-budget enforcement + Story 1.16a | ✓ Aligned |
| UX-DR4 P0-1 fallback-handler launch gate | AR-61 staff-fallback at every node + Story 0.7 P0-1 ledger | ✓ Aligned |
| UX-DR6 P0-5 native-stack validation | A-12 + Story 0.14 P0-5 validation | ✓ Aligned |
| UX-DR48 Field worker dispatch scheduler | FR-53 + Epic 13 Story 13.3 mobile-first dispatch app | ✓ Aligned |
| UX-DR70 Accessibility audit gate (axe-core CI + manual TalkBack-Hindi + NVDA) | Story 11b.8 + AR-? observability stack | ✓ Aligned |

**Performance contract alignment:**
- UX implicit: push delivery ≥95% / p95 ≤5s — aligns with NFR-perf / AR-39.
- UX-DR80 long-list 60fps target / 30fps minimum — aligns with NFR-2 (My Pool < 500ms p95) and operates within architecture's worker-budget posture.

### Alignment Issues

**Minor issue 1 — UX spec inline "FR" references use local Trust-Loop numbering, not PRD's global FR-N.**

UX §9 User Journey Flows annotates each journey with "Realizes FR-X" — but the FR numbers used are local Trust-Loop identifiers (e.g., UX Journey 1 cites "FR-7 (Sahyog assignment), FR-8 (UPI Intent payment), FR-9 (SIE reconciliation), FR-19 (close-of-cycle celebration)"). These do **not** correspond to PRD FR-7 (rule registry), FR-8 (lock-in policy), FR-9 (R7 contribution discipline), etc.

The UX spec's intro (line 44) **promised** an appendix "PRD FR ↔ Trust Loop cross-reference table" — this appendix is **not present** in the current UX file.

**Impact:** Low. The epics document reconciles UX-DRs against PRD FR-N successfully, so the epic/story layer is unambiguous. A new reader picking up UX §9 in isolation and trying to look up "PRD FR-7" would be misled.

**Recommendation:** Either (a) add the promised PRD FR ↔ Trust Loop cross-reference appendix to `ux-design-specification.md`, or (b) renumber UX §9's "Realizes FR-X" to match PRD's FR-N, or (c) explicitly note in §9's intro that those numbers are Trust-Loop-local. Not blocking for implementation since the epics document is the authoritative bridge.

**Minor issue 2 — Three PRD User Journeys lack dedicated UX journey diagrams.**

- **UJ-5 (Vikram recruits & gets paid)** — field-worker dispatch UX is at component level (UX-DR48), no Mermaid journey diagram.
- **UJ-6 (Trustee changes fixed amount)** — covered in §6 transition pattern + Story 10.13; no dedicated trustee journey.
- **UJ-7 (Trustee amends Niyamavali)** — Story 2.4 + §6; no dedicated trustee journey.
- **UJ-8 (Public visitor browses Sahyog Drive)** — UX-DR13/14 + §8 column inventory; no public-visitor journey diagram.

**Impact:** Low. These are admin/public surfaces; the epics document covers each via FR mappings. The UX spec's loop-first organizing principle prioritizes member-side and operator-side loops; trustee/public surfaces are committed at component level. Not blocking — but documenting this gap helps future agents understand why some PRD UJs don't have a `### Journey N` block.

### Warnings

**None blocking.** Both alignment issues above are documentation hygiene, not implementation blockers. The epics document successfully reconciles UX-DRs ↔ PRD FRs ↔ Architecture ARs.

### Verdict (Step 4 only)

**UX is present, internally complete, and aligns with PRD policy and Architecture substrate.** Two minor documentation-hygiene findings (cross-reference appendix missing; three PRD UJs lack dedicated journey diagrams) are noted for follow-up but do not block implementation.


## Epic Quality Review

Reviewing 16 epics / 173 stories against create-epics-and-stories standards.

### Epic Structure Validation

#### A. User Value Focus

| Epic | Framing | Verdict |
|---|---|---|
| Epic 0 — Pre-launch Operational Continuity | Operational (no FRs); discharges PRD §9.1.1 + P0-1..P0-5 launch gates | ✓ Legitimate pre-launch operational epic; bus-factor mitigation has clear trust-side stakeholder value (Trustee Panel, future-hire engineers) |
| Epic 1 — Platform Foundation, Multi-Tenancy, RBAC & Audit | Mixed `[PRIMITIVE]` + `[SURFACE]` framing (21 stories) | ⚠ Borderline-technical framing rescued by user-facing stories (Story 1.6 RLS protects Pariwar admins; Story 1.10 audit log protects Trustee Panel; Story 1.11b trustee-facing integrity UI; Story 1.13 edge protection benefits members) — and by PRD §9.1's explicit naming of RBAC + audit as uncompromisable. Acceptable. |
| Epic 2 — Niyamavali Publishing & Public Trust Identity | "The trust becomes *publicly real*" | ✓ User-value framing (members, trustees, public) |
| Epic 3 — Member Identity & Lifecycle | "Sushil signup + lock-in + renewal + Life Events + withdrawal + DPDPA" | ✓ Persona-anchored user value |
| Epic 4 — Niyamavali Rules Engine & Validity Service | Members + admins can read FR-12A validity status | ✓ User value (the canonical "am I valid?" surface) |
| Epic 5 — Three-Tier Communication Channels | Members receive notifications | ✓ User value |
| Epic 6 — Claim Filing, Peer Verification, Ground Inspection & Appeal | Bereaved families file claims; admins verify; appeals | ✓ Clear user value |
| Epic 7 — Pool Engine & Cycle Spawn | Math heart; members get assigned to pools | ✓ User value (Sushil sees My Pool) |
| Epic 8 — Sushil's Contribution Loop | Persona-named loop | ✓ Strong user-value framing |
| Epic 9 — Reconciliation Engine | Sunita's nominee surface + UTR matching | ✓ Persona-anchored |
| Epic 10 — Admin Operations Console (Helpdesk first-class) | Anita's operational toolkit | ✓ User value (operators) |
| Epic 11a — Public Trust Identity Shell | Public visitor + member directory | ✓ User value |
| Epic 11b — Memorial + Sahyog Drive | Family memorial authorship; bereaved relatives | ✓ User value |
| Epic 12 — Module Marketplace | Members see eligible partner modules | ✓ User value |
| Epic 13 — Growth: Field-Worker Attribution & Member Invite Loop | Vikram + Sushil-invites-colleague | ✓ User value |
| Epic 14 — Disaster Handling, DPO Readiness & Future-Benefit Hooks | Trustee + DPO + v2 readiness | ✓ User value |

**Verdict:** All epics are user-value-anchored. Epic 1's borderline-technical framing is justified by being TWT's named uncompromisable substrate (PRD §9.1) and by surfacing user-facing stories (admin auth, trustee integrity UI, multi-Pariwar provisioning).

#### B. Epic Independence & Dependency Direction

The epics document declares **explicit forward-only dependencies** at the epic level (e.g., Epic 7 lists "Dependencies: Epic 1 (substrate) · Epic 3 (member state) · Epic 4 (Validity Service) · Epic 6 (approved claims)"). Sampled across all 16 epics:

| From | Depends on (backward only) | Forward references found? |
|---|---|---|
| Epic 0 | (operational; depends on nothing) | No |
| Epic 1 | Epic 0 (P0-5 substrate ratify) | No |
| Epic 2 | Epic 1 | No |
| Epic 3 | Epic 1, Epic 2 | No |
| Epic 4 | Epic 1, Epic 2 (Niyamavali registry), Epic 3 (member state) | No |
| Epic 5 | Epic 1 (substrate), Epic 4 (validity for opt-in eligibility) | No |
| Epic 6 | Epic 1, Epic 3, Epic 4, Epic 5 | No |
| Epic 7 | Epic 1, Epic 3, Epic 4, Epic 6 (approved claims) | No |
| Epic 8 | Epic 1, Epic 3, Epic 4, Epic 5, Epic 7 | No |
| Epic 9 | Epic 1, Epic 6, Epic 7, Epic 8 | No |
| Epic 10 | Epic 1 | No (helpdesk first-class) |
| Epic 11a | Epic 1, Epic 2 (Niyamavali public render) | No (deliberately parallel to Epic 3) |
| Epic 11b | Epic 9 (canonical financial truth) | No (deliberately deferred to Phase 4) |
| Epic 12 | Epic 1, Epic 3 (account-frozen state machine), Epic 4 | No |
| Epic 13 | Epic 1, Epic 3 | No |
| Epic 14 | Epic 1, Epic 3, Epic 7, Epic 8 (FR-100 hooks installed across) | No |

**Verdict:** No forward dependencies. Epic 11a/11b split is deliberate (early shell vs Phase 4 memorial); Epic 12's dependency on Epic 3's `account-frozen` state is forward-declared and Story 3.1 was explicitly amended to anticipate it (per Workflow Progress Tracker note: *"Story 3.1 amended with `account-frozen` derived governance overlay state per Epic 12 dependency"*).

### Story Quality Assessment

#### A. Story Sizing

Sampled stories across epics show:
- Stories follow **one-slice-one-surface** discipline (each story modifies API OR admin UI OR mobile UI; contract-first via `packages/contracts/`).
- Stories carry **persona-anchored "As X, I want…, so that…"** narratives even for primitive stories (e.g., Story 1.1 = "As Solo Builder" for monorepo bootstrap — accepted as appropriate for foundational `[PRIMITIVE]` stories).
- Story granularity stays within solo-build dev-agent context windows (per the cross-cutting commitment).
- Story tags `[PRIMITIVE]` / `[SURFACE]` / `[CONSUMER]` / `[GOVERNANCE]` provide additional structure beyond standard story sizing.

#### B. Acceptance Criteria Format

**BDD Given/When/Then format used consistently** across sampled stories (Story 1.1, 1.6, 1.8, 1.10, 3.10, 3.12, 4.6, 6.16, 7.1, 14.6). Each AC block:
- Names the **trigger condition** (Given the freeze / FR / prior story).
- Names the **observable behavior** (When the surface is implemented / the test runs).
- Names the **measurable outcome** (Then specific identifiers, columns, payload shapes, error responses, audit emissions).

Spot-checked AC quality on critical stories:
- **Story 1.6 RLS adversarial test** — AC explicitly names "any leak (even a single row) fails CI as a P0" — testable, specific.
- **Story 1.10 audit log** — AC names every column (`audit_id`, `prev_audit_hash`, `audit_hash`, etc.), append-only DB enforcement, 6h Cloud Storage mirror in separate GCP project.
- **Story 4.6 FR-12A validity service** — AC commits p95 < 200ms + ≤ 60s freshness invariant + rule evaluation order determinism.
- **Story 6.16 3-stage appeal** — AC enforces `appeal.stage1.reviewer_id != claim.original_verifier_id` at the API layer (separation-of-duties hard-coded as invariant).
- **Story 14.6 Vyawastha Shulk back-prove** — AC commits the **replay-derived-not-mutable-annotation invariant** with explicit prohibitions (no retroactive annotation tables, no admin-mutable override flags, no path where two queries diverge).

#### C. Database / Entity Creation Timing

- **Story 1.2** creates the DB substrate (Cloud SQL Postgres + Drizzle migration scaffolding) — no schemas yet.
- **Story 1.6** adds `pariwar_id` first-class to *all Pariwar-scoped tables* — but this is a **discipline pattern** (RLS-by-default in migrations), not a one-shot upfront schema dump.
- Subsequent stories create their own tables when needed (Story 3.1 adds member-state tables; Story 6.1 adds claim case object; Story 7.1 adds pool object; etc.).

**Verdict:** Database tables are created per story as needed, not upfront in Story 1.x.

#### D. Starter Template

- **AR-1** (architecture) commits Turborepo + pnpm workspaces.
- **Story 1.1** is "Turborepo Monorepo Bootstrap" with explicit `pnpm dlx create-turbo@latest twt --package-manager pnpm` invocation.
- Story 1.1 satisfies the bmad starter-template requirement.

### Special Implementation Checks

#### Greenfield indicators

- **Story 1.1** — initial project setup ✓
- **Story 1.2** — DB substrate + migration tooling ✓
- **Story 1.15** — Dokploy auto-deploy CI/CD pipeline (early) ✓
- **Story 0.1..0.15** — operational continuity + Phase-0 launch gates discharged before substrate work ✓

#### Brownfield indicators

Not applicable — TWT is greenfield.

### Cross-Cutting Hygiene Observations (positive)

These are *better-than-baseline* patterns worth naming:

1. **Architectural Freeze Boundaries** (15 frozen items) — explicit erosion checks per frozen item; any change requires ADR or trustee-ratified Sprint Change Proposal.
2. **Fluid sub-categorization** (ADR-deferred / implementation-details / continuous polish) — prevents premature freeze of items that should iterate.
3. **Three-way discipline boundary** (Architecture vs PRD vs ADR) named and applied throughout; "Policy consumers:" pattern enumerated in §1.14.
4. **17 named "Load-Bearing Invariants"** appended to specific epics (canonical-case-identity, signals-advisory-not-adjudicating, monotonic-confirmation, replay-derived-historical-proof, etc.) — these are first-class story-level commitments that survive sprint-execution drift.
5. **Foundational CI gates** (friction-budget, PII scrape, schema-diff, `benefit_mechanism` tag, contract-diff) installed in Epic 1 and enforced across all subsequent epics — prevents late discovery.
6. **One-slice-one-surface story discipline** — bounds story file-churn for solo-build dev-agent context windows.
7. **Cross-epic commitments** explicitly enumerated (accessibility gate, §1.14 event-log primitive, friction-budget CI, Phase-0 prereq gates, PII scrape CI, FR-100 CI gates).
8. **Demoable closure** stated per epic — what does "this epic is done" look like in a runnable form, with named SM-1 demo beats threaded through.
9. **Sprint Change Proposal Item references** woven into stories (Items 1-17) ensuring overlay commitments land at story-level, not just doc-level.
10. **Gap Analysis observational entries** with conditional escalation paths (composed Account-State enumeration, feature-flag tool selection, FR-20 capacity validation) — explicit "may elevate to Launch Gate Risk" framing keeps the discipline boundary clean.

### Findings by Severity

#### 🔴 Critical Violations
**None.**

#### 🟠 Major Issues
**None.**

#### 🟡 Minor Concerns

1. **Epic 1 user-value framing is borderline.** Story-level user value is present (RLS protects Pariwar admins; audit log protects Trustee Panel; multi-Pariwar provisioning enables future tenants), but the epic title and overview read as infrastructure framing. **Recommendation:** Not blocking — TWT's three uncompromisable subsystems (PRD §9.1) explicitly include RBAC + audit + multi-tenant isolation, so a foundation-as-first-class-epic is justified. Optional cosmetic fix: reframe the Epic 1 narrative to lead with the *trustee* or *Pariwar-admin* outcome ("Trustees can prove the trust holds up under regulatory inquiry" / "Pariwar admins can operate within scope without cross-tenant exposure") rather than the substrate.

2. **UX spec FR cross-reference appendix is missing** (already noted in Step 4). The epics document compensates by being the canonical bridge.

3. **Story 1.1 / 1.2 / 1.3 / 1.4 / 1.5 use "As Solo Builder" persona** for `[PRIMITIVE]` stories. This is an accepted TWT customization but deviates from strict external-user persona discipline.

#### Best Practices Compliance Checklist

| Check | Pass? |
|---|---|
| Each epic delivers user value | ✓ (Epic 1 borderline, justified) |
| Each epic can function independently | ✓ (no forward deps) |
| Stories appropriately sized | ✓ (one-slice-one-surface discipline) |
| No forward dependencies | ✓ |
| Database tables created when needed | ✓ |
| Clear acceptance criteria (BDD) | ✓ |
| Traceability to FRs maintained | ✓ (FR Coverage Map + per-story FR annotations) |
| Starter template handled in Epic 1 Story 1 | ✓ (Story 1.1 Turborepo bootstrap) |

### Verdict (Step 5 only)

**Epic and story quality is exceptionally strong.** The epics document applies architectural-freeze boundaries, load-bearing invariants, three-way discipline (Architecture vs PRD vs ADR), and cross-cutting CI gates with rigor that exceeds the create-epics-and-stories baseline. No critical or major violations. Minor cosmetic suggestions noted; none blocking.


## Summary and Recommendations

### Overall Readiness Status

**READY for Phase 4 implementation, with two minor documentation-hygiene follow-ups and one cross-document architectural-detail spot-check.**

### Headline Findings

| Domain | Result |
|---|---|
| Document inventory | ✓ All four required artifact types present; no duplicates; sprint change overlay properly integrated |
| PRD requirements extraction | ✓ 106 FRs + 29 NFRs + 18 OQs + 14 Assumptions; trust posture / friction-budget / expectation-calibration named principles intact |
| Epic FR coverage | ✓ **100% (106/106 FRs)** mapped to exactly one epic; count-check holds |
| Sprint-change deferred IR items (8) | ✓ All addressed at story level (Items 4, 6, 7, 8, 13, 14 closed; Items 16, 18 noted for arch spot-check) |
| UX ↔ PRD alignment | ✓ All UJ-1..UJ-10 covered; minor: cross-reference appendix promised but not present |
| UX ↔ Architecture alignment | ✓ All UX-DR substrate commitments map to architecture ARs (Tamagui, Tailwind+Radix, Astro SSR, GCP Cloud SQL, RLS, Cloud KMS) |
| Epic quality (structure + independence) | ✓ No forward dependencies; persona-anchored; user-value framing |
| Story quality (BDD + sizing) | ✓ Consistent Given/When/Then; testable AC; one-slice-one-surface discipline |
| Database creation timing | ✓ Per-story, not upfront |
| Starter template | ✓ Story 1.1 Turborepo bootstrap |
| Critical violations | **None** |
| Major issues | **None** |
| Minor concerns | 3 (documentation hygiene) |

### Critical Issues Requiring Immediate Action

**None.** No item in this assessment blocks Phase 4 sprint planning from starting on the current epics/stories set.

### Issues Found (by severity)

#### 🟡 Minor — should be addressed but do not block sprint planning

1. **UX spec — promised "PRD FR ↔ Trust Loop" cross-reference appendix is missing.**
   - **Where:** `ux-design-specification.md` line 44 promises an appendix that does not exist in the file.
   - **Impact:** A reader picking up UX §9 in isolation would misinterpret "Realizes FR-7" (UX-local trust-loop numbering) as PRD's FR-7 (rule registry). The epics document successfully bridges this, so downstream story implementation is unambiguous.
   - **Recommendation:** Add the cross-reference appendix to the UX spec, OR renumber UX §9 annotations to match PRD FR-N, OR note explicitly in UX §9 intro that those numbers are loop-local.
   - **Effort:** ~30 min; owner: UX spec author.

2. **PRD UJ-5, UJ-6, UJ-7, UJ-8 lack dedicated UX journey diagrams.**
   - **Where:** `ux-design-specification.md` §9 User Journey Flows covers Journey 1 (Sushil contribution), Journey 2 (Ravi-mode), Journey 3 (Priya helpline), Journey 4 (Sunita reconciliation), Journey 5 (Anita verification), Journey 6 (invite teachers). PRD UJ-5 (Vikram field-worker recruits + paid), UJ-6 (trustee changes fixed amount), UJ-7 (trustee amends Niyamavali), UJ-8 (public visitor browses Sahyog Drive) are not journey-diagrammed.
   - **Impact:** Low — covered at component / surface level in UX-DRs and Epic stories.
   - **Recommendation:** Either add four short journey diagrams (Mermaid) for completeness, OR document explicitly in UX §9 intro that admin/public/field-worker journeys are committed at component level. Not blocking.
   - **Effort:** ~2 hours each if diagrammed; or ~10 min for the explicit-note path; owner: UX spec author.

3. **Epic 1 narrative framing is borderline-technical.**
   - **Where:** `epics.md` Epic 1 — "Platform Foundation, Multi-Tenancy, RBAC & Audit".
   - **Impact:** Story-level user-value is present (Story 1.6 RLS for Pariwar admins; Story 1.10 audit log for Trustees; Story 1.11b trustee-facing integrity UI). Epic-title framing is infrastructure-first.
   - **Recommendation:** Optional cosmetic reframing of Epic 1 narrative to lead with trustee / Pariwar-admin outcome. Not blocking.
   - **Effort:** ~15 min; owner: epic author.

### Spot-Checks Deferred from Step 3 (require architecture cross-verification)

These are **not new findings** — they are the explicit deferred IR items from sprint proposal §5 that need final architecture-level verification before Phase 4 begins. I flagged each as ⚠ in the Epic Coverage Validation; recommend a 1-hour focused architecture review covering:

- **Sprint-change Item 16** — `architecture.md` §1.7 JSONB custom-field limits should be reviewed to confirm any committed limits (size caps, schema-shape constraints) do not exceed what PRD FR-54 authorizes. Story 10.12 references AR-7 — verify the constraint surface matches FR-54's intent.
- **Sprint-change Item 18** — TLS 1.3+ pinning. NFR-15 is captured but architecture should be checked for whether *edge*, *internal hop* (service-to-service), and *external integration* (DigiLocker, WhatsApp BSP, etc.) TLS versions are all explicitly pinned, not just declared at a high level.

If these are already pinned in architecture.md, no further action; if not, add as ADR or architectural-freeze entries.

### Recommended Next Steps

1. **Apply the three minor documentation-hygiene fixes** above (UX cross-reference appendix; UJ journey diagrams or explicit deferral note; optional Epic 1 reframing). Total estimated effort: 1–3 hours depending on choices.
2. **Run a 1-hour focused architecture spot-check** on the two remaining sprint-change items (16 JSONB limits, 18 TLS pinning) and either add to architecture or confirm already-pinned. If anything needs reconciliation, file a small Sprint Change Proposal addendum rather than re-running the full course-correct workflow.
3. **Proceed to Phase 4 (implementation)** — sprint planning can begin against the current `epics.md` story set. Epic 0 (Pre-launch Operational Continuity & Phase-0 Gates) must be discharged before substrate engineering begins, per the existing epic dependency tree. Story 1.1 (Turborepo bootstrap) is the first substrate story after Epic 0 closes; specifically Story 0.14 (P0-5 native-stack validation) gates Story 1.1.
4. **Maintain discipline boundaries** identified in the Sprint Change Proposal Appendix A:
   - Architecture commits **properties**; ADRs commit **specific cloud controls**.
   - Architecture commits **state/transitions/events**; PRD commits **policy/eligibility/cadence**.
   - Gap Analysis is **observational** with conditional escalation paths — never directly overrides architecture or prescribes sprint planning.
5. **Track the 9 deferred ADRs** (AR-69) — Cloud provider final ratification, IAM isolation mechanism, Edge/WAF selection, Feature-flag tool, OTP fraud thresholds, Public-page composition, Pool-spawn bulk-write primitive, Bank statement normalization, Reconciliation matcher mechanism, audit-mirror execution environment. These have explicit acceptance criteria but no chosen tool yet — handle as the first sprint encounters each.
6. **Continue the Phase-0 launch gates** (P0-1 through P0-5 + edge/WAF DPDPA + FR-20 capacity validation) in parallel with engineering — per AR-49, substrate-conditional implementation commitments must not be frozen until P0-5 closes.

### Final Note

This assessment identified **3 minor documentation-hygiene issues** and **2 deferred architecture spot-checks** across 5 review categories. **No critical or major issues** were found.

The TWT planning artifacts represent an exceptionally disciplined planning effort:
- 106 FRs × 16 epics × 173 stories × 100% coverage
- Architectural-freeze boundaries + load-bearing invariants + three-way doc discipline (PRD/Architecture/ADR)
- Sprint Change Proposal closed 10 critical PRD↔architecture drift items pre-CE
- Forward-compat hooks (FR-100) are surgical and non-invasive
- Cross-cutting CI gates (friction-budget, PII scrape, schema-diff, `benefit_mechanism` tag, contract-diff) enforced from Epic 1
- 17 named load-bearing invariants survive sprint-execution drift
- Persona-anchored stories with consistent BDD acceptance criteria

The minor findings above are improvements, not corrections. Recommend addressing the three documentation-hygiene items in parallel with sprint planning; they do not block implementation.

**Assessor:** BMad Implementation Readiness skill (`/bmad-check-implementation-readiness`), invoked by BigDev.
**Date:** 2026-05-28.
**Report file:** `_bmad-output/planning-artifacts/implementation-readiness-report-2026-05-28.md`.


---

## Addendum — Architecture Spot-Check on Deferred Items 16 & 18

*Date: 2026-05-29.*

### Item 16 — FR-54 JSONB custom-field hard limits

**Architecture state.** `architecture.md` §1.7 commits a clear policy framework for per-Pariwar custom fields:

| Architecture commits | Owner |
|---|---|
| JSONB columns on `members`, `claims`, `pools` | Architecture (Cross-Cutting #17) |
| Per-Pariwar JSON Schema in `packages/domain/per-pariwar/<id>/` | Architecture |
| GIN + functional B-tree indexes per declared path | Architecture |
| Field cardinality bounds + max-size envelope (per-Pariwar) | Per-Pariwar policy |
| Type allowlist (scalars, small bounded arrays, small bounded objects) | Per-Pariwar policy |
| **System-level JSONB hard limits** — max payload size per column write, max nesting depth, per-Pariwar GIN-index growth ceiling | **Global constants in `packages/domain/`; "no Pariwar admin can override"** |

**PRD authorization (FR-54):** "Per-Pariwar custom fields via JSON columns on member, claim, pool. Per-Pariwar JSON-column-based custom fields." PRD does not specify limits or forbid them.

**Verdict.** Architecture is **mostly within bounds** — committing system-integrity defense properties is appropriate ("defense against a buggy or malicious tenant"). The architecture commits **properties + shape** (limit categories) while deferring **values** to operational policy/Category 5 Observability. This matches the Architecture vs ADR boundary discipline.

**One issue worth tightening.** Architecture line 971: *"These limits live in `packages/domain/` as global constants; no Pariwar admin can override. Defense against a buggy or malicious tenant."*

A future Pariwar (e.g., Rail Parivar) could legitimately need deeper nesting or larger payloads than TWT-Bihar's profile. The architecture's framing positions the limits as engineer-decided + immovable. PRD's intent (per "first-class multi-tenancy") suggests these limits should be **Trustee-Panel reviewable** (operational policy), not engineer-controlled-without-review.

**Recommendation:**
- **Small architectural clarification:** Add to §1.7 — *"Limit values are committed in operational policy + Category 5 Observability and require Trustee-Panel approval to change. The architectural property (the existence of system-integrity limits) is frozen; specific numeric values are tunable per-Pariwar via trustee-approved operational policy."*
- This costs ~15 minutes; it removes the engineer-bottleneck framing without weakening the defense property.
- Story 10.12 should reference this policy review mechanism in its AC.

**No blocking issue.** Just a discipline-tightening to keep the policy-vs-property line clean.

### Item 18 — TLS 1.3+ pinning at edge, internal hops, external integrations

**Architecture state.** Only one TLS reference in the full architecture document:

- Line 42 (property summary): *"Security: PII AES-256 at rest; TLS 1.3+; cross-tenant isolation P0; tamper-evident audit."*

Other crypto/transport mentions:
- §2.9 service-to-service: mTLS named as one option (deferred to split-trigger).
- §5.8 edge-only ingress: mTLS named as one mechanism (committed in ADR contingent on edge selection).
- §2.7 envelope encryption: at-rest only; doesn't address in-transit.

**Epic capture.** `epics.md` **NFR-15** explicitly commits: *"In-transit TLS 1.3+ at edge and internal hops."*

**Gap.** The architecture mentions TLS 1.3+ as a one-line summary property but does **not**:
- Name TLS 1.3+ as an architectural-freeze entry.
- Specify enforcement at the three distinct hop classes — **edge** (client ↔ Cloudflare/WAF), **internal** (worker ↔ API ↔ DB), **external integration** (DigiLocker / WhatsApp BSP / FCM / banks).
- Commit a single floor (TLS 1.3+) that applies regardless of substrate choice (Dokploy v1 vs K8s future).

**Verdict.** **Small architectural gap.** NFR-15 carries the requirement at the epic level, but architecture should mirror it as a named freeze entry so the property survives substrate pivots (Dokploy → K8s, Cloudflare → self-hosted WAF, etc.).

**Recommendation:**
- **Small architectural addition:** Add a new freeze-table entry or §2.x security commitment:
  > **TLS 1.3+ floor across all hop classes.** Architecture commits TLS 1.3+ as the minimum at: (a) **edge** — client to edge/WAF; (b) **internal** — backend service-to-service and service-to-DB; (c) **external integration** — every outbound to DigiLocker, WhatsApp BSP, FCM, banks, payment-aggregator partners. Substrate-specific enforcement mechanisms (Cloudflare TLS profile, Cloud SQL TLS config, mTLS, etc.) live in ADRs. The TLS-1.3+ floor is architecturally frozen and must survive any substrate pivot.
- This is ~30 minutes; it can be filed as a small Sprint Change Proposal addendum rather than a full course-correct workflow.
- Story 1.13 (Cloudflare + Bot Management) and Story 1.2 (Cloud SQL) should reference this property in their AC.

**No blocking issue.** Just an architectural mirror of an already-stated NFR commitment.

### Spot-Check Summary

| Item | Result | Effort to close |
|---|---|---|
| **Item 16 JSONB hard limits** | Architecture is sound; one discipline-tightening clarification needed (Trustee-Panel reviewability of specific values) | ~15 min architecture edit |
| **Item 18 TLS 1.3+ pinning** | NFR captured at epic level; architecture should mirror as a frozen property across 3 hop classes | ~30 min architecture edit |

**Combined: ~45 minutes of architectural housekeeping. Neither blocks Phase 4 sprint planning;** both can be done in parallel with sprint kickoff. File as a small Sprint Change Proposal addendum (or as separate ADR entries) to keep the change provenance clean.

### Updated Readiness Status

**Still READY for Phase 4 implementation.** The two spot-checks confirmed the architecture is well-aligned with the epics and PRD; one item needs a clarification (Item 16) and one needs a mirror (Item 18). Both are documentation hygiene — no implementation rework required.

