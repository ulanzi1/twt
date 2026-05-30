---
title: 'TEA Test Design → BMAD Handoff Document'
version: '1.0'
workflowType: 'testarch-test-design-handoff'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
sourceWorkflow: 'testarch-test-design'
generatedBy: 'TEA Master Test Architect'
generatedAt: '2026-05-29T00:00:00Z'
projectName: 'TWT'
---

# TEA → BMAD Integration Handoff — TWT v1

## Purpose

Bridge TEA's system-level test design outputs with BMAD's epic/story decomposition workflow (`bmad-create-epics-and-stories`) and downstream test-driven workflows (`bmad-testarch-atdd`, `bmad-testarch-automate`, `bmad-testarch-trace`). Epics and stories already exist for TWT (see `_bmad-output/planning-artifacts/epics.md`), so this handoff threads test-design guidance into the *existing* story files rather than generating new ones.

## TEA Artifacts Inventory

| Artifact | Path | BMAD Integration Point |
| --- | --- | --- |
| Test Design — Architecture concerns | `_bmad-output/test-artifacts/test-design-architecture.md` | Epic-level quality requirements; pre-implementation blockers; trustee + solo-builder review surface |
| Test Design — QA execution recipe | `_bmad-output/test-artifacts/test-design-qa.md` | Story-level acceptance criteria; test-level selection per epic; tags + tooling |
| Test Design — Progress journal (audit trail) | `_bmad-output/test-artifacts/test-design-progress.md` | Workflow audit + future resume |
| Risk Assessment (55 risks, 19 HIGH) | embedded in architecture + progress | Epic risk classification; story priority |
| ASR-anchored Coverage Matrix (~135 scenarios) | embedded in QA doc | Story test requirements + tag wiring |

## Epic-Level Integration Guidance

### Risk References — P0/P1 epic-level quality gates

The 19 HIGH-priority risks (score ≥ 6) map to the following epics as quality gates that **must** appear in the epic's acceptance criteria:

| Epic | HIGH risks anchored here | Epic-level quality gate |
| --- | --- | --- |
| **Epic 0** — Phase-0 Operational Continuity | OPS-1, OPS-6, TECH-6 (P0-5) | All Phase-0 gates closed; runbook drill green; restore drill green; P0-5 ratify logged |
| **Epic 1** — Platform Foundation, Multi-Tenancy, RBAC & Audit | SEC-2, SEC-3, SEC-9, OPS-7, TECH-8, DATA-4 | ASR-1, ASR-5, ASR-8 passing; drizzle rehearsal harness in CI; PII scrape gate in CI |
| **Epic 2** — Niyamavali Publishing & Public Trust Identity | BUS-1, BUS-8 | ASR-9 i18n parity assertion passing; consent registry E2E green |
| **Epic 3** — Member Identity & Lifecycle | TECH-5, BUS-1, DATA-6 | DigiLocker happy + fallback + key-rotation chaos passing; RTBF E2E green; member-state replay-vs-current diff = 0 |
| **Epic 4** — Niyamavali Rules Engine & Validity Service | TECH-3, TECH-12, BUS-2 | ASR-4, ASR-12 passing; concealment-flag never auto-denial |
| **Epic 5** — Three-Tier Communication Channels | TECH-10 | WA inbound webhook mock-asserted; SMS fallback fires after 3-retry × exp-backoff; step-up OTP audit-per-send + consume |
| **Epic 6** — Claim Filing, Peer Verification, Ground Inspection & Appeal | BUS-2, BUS-1 | Concealment + R5/R9 paths fully covered; FR-43A appeal Stage-1 separation-of-duties asserted |
| **Epic 7** — Pool Engine & Cycle Spawn | TECH-4, PERF-1 | ASR-2 + ASR-3 passing; saga partial-failure resume green |
| **Epic 8** — Sushil's Contribution Loop | (linked to TECH-1, ASR-6) | UPI Intent typed builder + per-app device-lab matrix complete; mobile perf budgets met |
| **Epic 9** — Reconciliation Engine | TECH-1, TECH-2 | ASR-7 passing; 50 golden files × 5 banks green; E2E recon timing < 4 h p95 |
| **Epic 10** — Admin Operations Console | (multiple LOW/MED) | Bulk ops dry-run parity; feature flag deterministic eval + tenant isolation; reports scope-respecting |
| **Epic 11a/11b** — Public Transparency Surfaces | SEC-2 | AR-48 SSR cache-safety snapshot test; member-directory anti-enumeration |
| **Epic 12** — Module Marketplace | (B-3 blocker) | Account State Machine ADR closed; grief-context suppression state-machine-enforced |
| **Epic 13** — Growth & Field-Worker Attribution | BUS-6 | TDS §194H rate-matrix golden-file test; anti-fraud throttling assertion |
| **Epic 14** — Disaster Handling, DPO Readiness & Future-Benefit Hooks | DATA-3 | FR-100 schema-diff + `benefit_mechanism` tag gates green; Vyawastha Shulk back-prove query green |
| **All epics (cross-cutting)** | OPS-2 | Weekly Dokploy live-cycle fallback drill green on the release candidate |

### Quality Gates per Epic

- **P0 pass rate = 100 %** on all scenarios tagged within the epic.
- **P1 pass rate ≥ 95 %** on all scenarios tagged within the epic.
- **HIGH-risk closure:** every HIGH risk anchored to the epic has a passing test *or* a written deferral signed by the Trustee Panel.
- **NFR evidence catalog:** for every in-scope NFR in the epic's surface area, evidence artifact path is committed (final PASS/CONCERNS/FAIL is deferred to `bmad-testarch-nfr` post-implementation).
- **Bilingual + a11y discipline:** any member-facing story emits both `hi` and `en` keys (NFR-23) and meets WCAG 2.1 AA on its primary flow (NFR-20).

## Story-Level Integration Guidance

### P0/P1 Test Scenarios → Story Acceptance Criteria

The following stories receive the explicit P0 / P1 acceptance-criteria additions below (test IDs reference `test-design-qa.md` §Test Coverage Plan). Story authors using `bmad-create-story` should fold these into the AC list verbatim.

| Story | P0/P1 Test ID(s) | Acceptance Criterion to add |
| --- | --- | --- |
| **Story 1.2** Cloud SQL + Drizzle migration tooling | P0-007 | "Every PR touching `packages/drizzle/migrations` runs the rehearsal harness (snapshot → migrate → query suite) and fails red on any query-suite diff." |
| **Story 1.6** `pariwar_id` first-class + RLS adversarial | P0-001, P0-002 | "Adversarial cross-Pariwar read test executes on every multi-tenant table in CI; any successful read across pariwars fails the build." |
| **Story 1.9** Admin auth + WebAuthn + step-up OTP | P0-009 | "Step-up OTP emits an audit line on send AND on consume, both tagged with the operation identifier." |
| **Story 1.10 + 1.11a** Audit log + integrity verification | P0-004, P0-005, P0-006 | "Chaos test mutates one audit row using sole-engineer credentials and the integrity check FAILS within 24 h; off-site mirror diff confirms divergence within 6 h." |
| **Story 1.12** pg-boss + idempotency keyed store | P0-008 | "Re-enqueue with same idempotency key yields exactly one execution; covered by property-based test." |
| **Story 1.16b** PII scrape CI gate | P0-011 | "CI scrape gate iterates every registered public route and asserts zero Tier-1 PII tokens; addition of a route without coverage fails the build." |
| **Story 1.16c + 1.16d** FR-100 schema-diff + `benefit_mechanism` gates | P0-012 | "Schema diff blocks any column addition to v1 trust-paid-benefit-marked tables; every rule registry entry must carry a `benefit_mechanism` discriminator." |
| **Story 2.1** `packages/i18n` foundation | P0-013, P0-014 | "Every member-facing string key exists in BOTH `hi` and `en` (parity assertion); inline formatting outside `packages/i18n` fails CI lint." |
| **Story 3.1** Member lifecycle state machine + event stream | P0-015 | "Replay-from-events vs persisted-current-state diff is zero across the synthetic-member corpus in nightly." |
| **Story 3.3a + 3.3b** DigiLocker provider interface + KYC flow | P0-016, P1-001, P1-002 | "Key-rotation chaos fails closed; manual fallback exposes the 12 s CTA per NFR-27." |
| **Story 3.12** RTBF soft-delete + anonymization | P0-018 | "Contributions anonymized; audit log NOT anonymized; 12-month rejoin lock enforced." |
| **Story 4.4** R5/R9 special death rules + R14 concealment | P0-017 | "Concealment flag is surfaced for State Trustee review; auto-denial path does not exist (negative assertion)." |
| **Story 4.6** FR-12A Validity Service | P0-019, P0-020 | "Determinism property-based test passes; p95 < 200 ms at 4L synthetic." |
| **Story 4.8** Per-cohort cache invalidation | P0-021, P1-018 | "Niyamavali amendment propagates to all-members read within 60 s under chaos; conservative fallback fires when cohort scope confidence is insufficient." |
| **Story 6.10** Verifier console signals panel | P1-033 | "Verifier console < 5 s load with single indexed query (no N+1)." |
| **Story 6.16** 3-Stage claim-denial appeal | P1-035 | "Stage-1 reviewer ≠ original decision-maker (separation-of-duties asserted); SLA tracked." |
| **Story 7.4** Deterministic member-to-pool assignment | P0-022, P0-023 | "Property-based test asserts pool sizes differ by ≤ 1 across M; full-cycle replay reproduces identical assignments from snapshot." |
| **Story 7.7** Idempotent payment reference + amount-lock | P0-026, P1-040, P1-041 | "Typed `UPIIntentURL` builder used; property-based on (`pa`, `am`, `cu`, `tr`, `tn`, `mc`); amount-lock rejected at reconciliation." |
| **Story 7.9** Pool Engine measured-validation gate | P0-025 | "N=50 / M=4L synthetic spawn p95 < 60 s (Weekly lane); evidence committed before Phase 1 transition." |
| **Story 8.4** UPI Intent flow + UTR self-attest | P0-027 | "Per-UPI-app parity matrix (BHIM/PhonePe/GPay/Paytm) executed in device lab; sign-off recorded in `.decision-log.md` before launch." |
| **Story 9.2** Bank statement parser + normalized schema | P0-028, P0-029 | "Every parser emits the normalized record shape; 50 golden files per bank pass per PR touching the parser." |
| **Story 9.4** UTR matching engine | P0-030, P0-031 | "Idempotent + monotonic-confirmation invariant asserted; end-to-end statement-intake → status flip p95 < 4 h in simulated cycle." |
| **Story 10.8** Feature flags per cohort | P0-032 | "Deterministic eval + tenant isolation + replay safety + audit on every flag-state change." |
| **Story 11a.1 + 11a.2** Public SSR shell | P0-033 | "AR-48 cache-safety snapshot asserts zero Tier-1 PII tokens in SSR HTML for Sahyog Vivran." |
| **Story 12.4** Grief-context Module Shelf suppression | P1-059 | "Module Shelf suppressed in all account-frozen states; assertion is state-machine-driven, not reviewer discretion." |
| **Story 13.5** Field worker commission trigger | P1-062 | "Commission fires only on KYC + ₹110 + first valid contribution; TDS §194H deducted per current-fiscal rate matrix." |
| **Story 14.6** FR-100 Vyawastha Shulk receipt back-prove | P1-065 | "Replay-derived historical eligibility query returns correct paid status for any past date in the corpus." |

### Data-TestId Requirements

For testability hooks on UI surfaces, the following `data-testid` patterns are required (apply to RN components and to web components):

- **My Pool home card:** `data-testid="my-pool-card"` with sub-tids `my-pool-card.nominee`, `my-pool-card.amount`, `my-pool-card.days-remaining`, `my-pool-card.pay-cta`.
- **UPI Intent button:** `data-testid="upi-intent-button"` with `data-testid="upi-intent-button.utr-input"` after launch.
- **Lock-in clock:** `data-testid="lock-in-clock"` with `.countdown`, `.unlock-date`, `.policy-rationale`.
- **Verifier console:** `data-testid="verifier-console.signals-panel"`, `.member-banner`, `.approve-cta`, `.reject-cta`, `.escalate-cta`.
- **Public Sahyog Vivran:** `data-testid="sahyog-vivran.{public|authenticated}"` per AR-48 fragment composition; authenticated fragment hydrated post-auth only.
- **Status pill:** `data-testid="status-pill"` with `data-state="{pending|confirmed|mismatch|grey-takeover|held}"`.
- **Niyamavali public page:** `data-testid="niyamavali-page"` with `.clause-{id}`, `.version-diff`.
- **Helpdesk ticket form:** `data-testid="helpdesk-ticket-form"` per category.

## Risk-to-Story Mapping

| Risk ID | Category | P×I | Recommended Story / Epic | Test Level |
| --- | --- | --- | --- | --- |
| TECH-1 | TECH | 2×3 = 6 | Story 9.4 (Reconciliation matcher) | Unit + Integration + E2E |
| TECH-2 | TECH | 3×2 = 6 | Story 9.2 (Bank statement parser) | Unit (corpus) |
| TECH-3 | TECH | 2×3 = 6 | Stories 4.6 + 4.8 | API + Chaos |
| TECH-4 / PERF-1 | TECH/PERF | 2×3 = 6 | Story 7.9 (Pool Engine measured-validation) | Load |
| TECH-5 | TECH | 2×3 = 6 | Stories 3.3a + 3.3b | Integration + E2E |
| TECH-6 | TECH | 2×3 = 6 | Story 0.14 (P0-5 native stack) | Manual + Device-lab |
| TECH-8 / DATA-4 | TECH/DATA | 2×3 = 6 | Story 1.2 (drizzle tooling) | Integration (CI gate) |
| TECH-12 | TECH | 2×3 = 6 | Story 4.8 (per-cohort cache invalidation) | Chaos |
| SEC-2 | SEC | 2×3 = 6 | Stories 1.16b + 11a.1 | API + E2E + CI |
| SEC-3 / SEC-9 / OPS-7 | SEC/OPS | 2×3 = 6 | Stories 1.10 + 1.11a | Chaos + Integration |
| DATA-6 | DATA | 2×3 = 6 | Story 3.1 (Member lifecycle event stream) | Unit (property-based) |
| BUS-1 | BUS | 2×3 = 6 | Stories 2.7 + 3.11 + 3.12 | E2E |
| BUS-2 | BUS | 2×3 = 6 | Stories 4.4 + 6.15 | Unit + API |
| BUS-8 | BUS | 2×3 = 6 | Story 2.1 (i18n) | CI |
| OPS-1 | OPS | 2×3 = 6 | Stories 0.1 + 0.5 + 0.6 | Drill (Quarterly) |
| OPS-2 | OPS | 2×3 = 6 | (cross-cutting; AR-54 runbook) | Drill (Weekly) |
| OPS-6 | OPS | 2×3 = 6 | (cross-cutting; NFR-25 drill) | Drill (Quarterly) |

## Recommended BMAD → TEA Workflow Sequence

1. **TEA Test Design** (this workflow) — **DONE**: produced this handoff plus the architecture + QA documents.
2. **BMAD Story Refinement** — for the named stories above, fold the P0/P1 acceptance criteria into the existing story files (via `bmad-create-story` or direct edit).
3. **TEA ATDD** (`bmad-testarch-atdd`) — generate red-phase acceptance test scaffolds for the P0 scenarios, especially:
   - ASR-1 (P0-001), ASR-2 (P0-022/023), ASR-3 (P0-025), ASR-4 (P0-020/021), ASR-5 (P0-005), ASR-6 (P0-026), ASR-7 (P0-030), ASR-8 (P0-011), ASR-9 (P0-013), ASR-10 (P0-009), ASR-11 (P0-012), ASR-12 (P0-019).
4. **BMAD Story Automator / Quick-Dev** — implement story-by-story with TDD; acceptance tests turn green; reviews + retros per epic.
5. **TEA Automate** (`bmad-testarch-automate`) — expand test automation coverage beyond the P0 scaffolds.
6. **TEA NFR Assess** (`bmad-testarch-nfr`) — once implementation evidence exists, evaluate the planned NFR evidence catalog into PASS / CONCERNS / FAIL.
7. **TEA Trace** (`bmad-testarch-trace`) — validate coverage completeness against the risk register.
8. **TEA CI** (`bmad-testarch-ci`) — scaffold the PR / Nightly / Weekly lanes per `test-design-qa.md` §Execution Strategy.

## Phase Transition Quality Gates

| From Phase | To Phase | Gate Criteria |
| --- | --- | --- |
| Test Design | Story refinement | All P0 risks have mitigation strategy documented; ASR list closed |
| Story refinement | ATDD | Named stories have acceptance criteria from §Story-Level Integration Guidance |
| ATDD | Implementation | Failing acceptance tests exist for all P0/P1 scenarios in the named stories |
| Implementation | Test Automation | All red acceptance tests pass on the local branch |
| Test Automation | Phase-1 launch | Trace matrix shows ≥ 80 % coverage of P0/P1 requirements; all 19 HIGH risks have green test or signed deferral; OPS-6 quarterly restore drill green; Story 7.9 weekly capacity gate green; external a11y audit (NFR-22) scheduled or closed |

## Open Assumptions

- All five architecture blockers (B-1 through B-5) close before their dependent stories begin; if any slip, the corresponding epic's Phase-1 readiness slips with them.
- P0-5 ratify is positive; if it pivots, mobile E2E framework selection re-opens and the mobile-side ASR scaffolding rescopes to Web-PWA fallback per FM-2 escalation.
- Backup engineer arrangement (A-13) is funded by Trustee Panel pre-Phase-1; OPS-1 mitigation depends on this.
- 50 golden files per bank are content-curated by Trustee Panel + Solo Builder before Story 9.2; otherwise ASR-7 has no regression corpus.

**End of TEA → BMAD Handoff Document**
