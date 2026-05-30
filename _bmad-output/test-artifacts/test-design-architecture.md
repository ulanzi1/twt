---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-05-29'
workflowType: 'testarch-test-design'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
---

# Test Design for Architecture: TWT (Teachers Welfare Trust) — v1

**Purpose:** Architectural concerns, testability gaps, and NFR requirements for Solo Builder + Trustee Panel review. Serves as the contract between QA discipline and Engineering on what architecture must commit *before* test development on the three uncompromisable subsystems can begin.

**Date:** 2026-05-29
**Author:** Master Test Architect (TEA)
**Status:** Architecture Review Pending
**Project:** TWT — first Pariwar of the Pariwar Platform
**PRD Reference:** `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md`
**ADR Reference:** `_bmad-output/planning-artifacts/architecture.md` (single architecture document; per-decision ADRs forthcoming per AR-69 backlog)

---

## Executive Summary

**Scope:** v1 ships single Pariwar (TWT-Bihar) on a Pariwar-Platform substrate (`pariwar_id` first-class). The math heart — Pool Engine, Reconciliation, RBAC + multi-tenancy — is uncompromisable.

**Business Context (from PRD):**

- **Mission:** mutual-aid death-support for Bihar government teachers (~4 lakh active members at steady state); first end-to-end claim closing without manual heroics gates v1 (SM-1).
- **Stakes:** real trust money for grieving families; SM-C5 (PII exposure) is a hard-zero counter-metric.
- **Cadence:** Solo Builder build with ≥ 3-trustee oversight; Phase 1 soft-launch in one Bihar district at 1k–5k members.

**Architecture (from architecture.md):**

- TypeScript monorepo (Turborepo + pnpm), Postgres on GCP `asia-south1` with RLS-enforced multi-tenancy.
- Three uncompromisable subsystems: **Pool Engine**, **Reconciliation pipeline**, **RBAC + multi-tenant isolation**. Architecture elevates **Audit log integrity**, **Niyamavali registry / FR-12A**, and **UPI Intent dispatch** as equally catastrophic.
- Substrate-conditional commitments (RN + Tamagui for mobile, Cloudflare for edge) carry named pivot paths; do not freeze until P0-5 / §5.8a ADRs close.

**Expected Scale:** correct at 4L active members per Pariwar; operable at 1k–5k for Phase 1.

**Risk Summary:**

- **Total risks:** 55 (TECH 13, SEC 11, PERF 8, DATA 6, BUS 9, OPS 8).
- **High-priority (≥ 6):** 19 — all reachable from 12 ACTIONABLE ASRs; 5 ASRs alone burn down 14 of the 19.
- **Test effort:** ~170–275 engineer-hours of authoring (P0–P3 baseline) + ~30–45 hours of one-time setup (4L synthetic factory, device lab). At solo cadence, 6–10 calendar weeks parallelizable with implementation only after P0-5 ratify.

---

## Quick Guide

### 🚨 BLOCKERS — Team Must Decide (Can't Proceed Without)

Pre-implementation critical path. These items must close before story-level test development on the named subsystems can begin.

1. **B-1: Pool Engine snapshot format (AR-11 / AR-69)** — replay tests cannot freeze acceptance until snapshot shape (`cycle_id`, member-set hash, fixed_amount, version vector) is committed. *Owner:* Solo Builder.
2. **B-2: Reconciliation matcher normalized statement schema (AR-69, OQ-2)** — 5-bank common shape gates Story 9.2; without it, 50-golden-file/bank regression has no target. *Owner:* Solo Builder.
3. **B-3: Account State Machine composition rules** — Module Shelf grief-context suppression (UX-DR1) and frozen-state behaviors can't be tested deterministically until composition rules over claim/member/pool/alert primitives are frozen. *Owner:* Solo Builder + UX (Freya).
4. **B-4: Feature-flag tool selection (P1 Deferred Decision)** — DigiLocker-mandatory cutover (FR-2) and FR-58C-gated migrations need a tool that meets the §Deferred-Decisions capability bar. *Owner:* Solo Builder; *gate:* before first FR-58C cohort rollout.
5. **B-5: Tea config commitment** — commit `test_framework: vitest+playwright`, `ci_platform: github-actions` in `_bmad/tea/config.yaml` so the test stack is documented, not auto-detected. *Owner:* Solo Builder.

### ⚠️ HIGH PRIORITY — Team Should Validate (Recommendations for Approval)

1. **H-1: Audit-integrity check IAM independence verification (TC-9)** — recommend a chaos test in Story 1.11a: sole-engineer credential mutates one row → integrity check must FAIL ≤ 24 h. Approver: Trustee Panel + Solo Builder.
2. **H-2: 4L synthetic-member factory in Epic 1** — recommend a deterministic synthesizer lands alongside RLS scaffolding; used by ASR-3 (Story 7.9) and ASR-4 (Story 4.6). Approver: Solo Builder.
3. **H-3: Clock-provider abstraction (TC-4)** — recommend a single time-as-actor (SIE) source for tests, lands with Story 1.12; used by ASR-4 freshness invariant + reconciliation 48 h transitions. Approver: Solo Builder.
4. **H-4: WA Business inbound webhook mock provider (TC-6)** — recommend Mockoon/Wiremock for Meta inbound so dual-gate opt-in (AR-16) is asserted before live Meta surface. Approver: Solo Builder.
5. **H-5: AR-48 SSR + auth-fragment cache safety snapshot test (TC-7)** — recommend an architecture-spec test asserting SSR HTML for Sahyog Vivran contains zero Tier-1 PII tokens, before Story 11a.1. Approver: Solo Builder.
6. **H-6: drizzle migration rehearsal harness (TC-8)** — recommend snapshot-→-migrate-→-query-suite gate in CI on every forward-only migration. Approver: Solo Builder.
7. **H-7: UPI Intent typed builder (TC-10)** — recommend `UPIIntentURL` builder + property-based tests in `packages/domain` *before* Stories 7.7 / 8.4 author the consumer surfaces. Approver: Solo Builder.
8. **H-8: Friction-budget CI gate reference impl (TC-12)** — recommend prototype before Story 1.16a so UX Stance #2 is enforceable, not aspirational. Approver: Solo Builder + UX (Freya).

### 📋 INFO ONLY — Solutions Provided (No Decisions Needed)

1. **Test strategy:** Vitest unit/component + API integration on testcontainers; Playwright for web E2E + axe-core; Detox or Maestro for mobile E2E (gated on P0-5); k6/Artillery for load; `fast-check` for property-based.
2. **Tooling:** `@seontechnologies/playwright-utils` per project config (UI + API profile); `packages/contracts` (Zod) yields a typed `packages/api-client` for black-box tests; channel-provider abstraction makes alert testing trivially fakeable.
3. **Execution model:** PR < 15 min (full Vitest + smoke E2E + lints + scrape gate), Nightly < 60 min (full E2E + axe + adversarial RLS + chaos + load proxy), Weekly < 4 h (full N=50/M=4L capacity + restore drill + Dokploy fallback + device-lab).
4. **Coverage:** ~30 P0 + ~50 P1 + ~25 P2 + ~10 P3 scenarios, deduplicated across levels; ASR-anchored.
5. **Quality gates:** P0 pass = 100 %; P1 ≥ 95 %; every HIGH risk has a passing test or written deferral; NFR evidence catalog committed before launch; final NFR PASS/CONCERNS/FAIL deferred to `bmad-testarch-nfr`.

Detailed coverage matrix, execution lanes, estimates, and tagged code examples → `test-design-qa.md`.

---

## For Architects and Devs — Open Topics 👷

### Risk Assessment

**Total risks identified:** 55 (TECH 13, SEC 11, PERF 8, DATA 6, BUS 9, OPS 8).

#### High-Priority Risks (Score ≥ 6) — Immediate Attention

| Risk ID | Category | Description | P | I | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | :-: | :-: | :-: | --- | --- | --- |
| **TECH-1** | TECH | Reconciliation matcher silently mismatches → wrong member status, erodes SM-5 ≥ 95 %. | 2 | 3 | **6** | Conservative `mismatch` flag (FR-30); screenshot fallback (FR-32); manual queue (FR-50); ASR-7 idempotency + replay. | Solo Builder | Phase-1 launch gate |
| **TECH-2** | TECH | Bank statement parser drift across 5-bank allowlist. | 3 | 2 | **6** | 50 golden files/bank (AR-41); parser shipping schedule gates Phase 2 (AR-55). | Solo Builder | Phase 2 gate |
| **TECH-3** | TECH | FR-12A non-determinism under cache-eviction race. | 2 | 3 | **6** | Cache freshness invariant ≤ 60 s with conservative all-members fallback (arch §1.10); ASR-4 + ASR-12. | Solo Builder | Phase-1 launch gate |
| **TECH-4** | TECH | Pool-spawn capacity envelope breach at 4L milestone. | 2 | 3 | **6** | Saga decomposition + Story 7.9 measured-validation gate; ASR-3. | Solo Builder | Phase-1 launch gate |
| **TECH-5** | TECH | DigiLocker signature verification breaks on key rotation or fallback misuse. | 2 | 3 | **6** | Provider interface (FR-2, AR-43); manual fallback baseline; FR-58C-gated mandatory switch. | Solo Builder | Phase-1 launch gate |
| **TECH-6** | TECH | RN + Tamagui substrate fails P0-5 ratify → blocks all mobile dev. | 2 | 3 | **6** | Phase-0 prototype + tiered escalation FM-2; Story 0.14. | Solo Builder | Phase-0 gate |
| **TECH-8** | TECH | drizzle forward-only migration corrupts prod under partial deploy. | 2 | 3 | **6** | Rehearsal harness (TC-8). | Solo Builder | Phase-1 launch gate |
| **TECH-12** | TECH | FR-12A cache freshness invariant > 60 s drift. | 2 | 3 | **6** | Conservative all-members fallback when scope confidence insufficient. | Solo Builder | Phase-1 launch gate |
| **SEC-2** | SEC | PII leak from public surfaces (FR-74 scrape gap). | 2 | 3 | **6** | CI scrape test (CC-7 + Story 1.16b); ASR-8 + AR-48 cache safety. | Solo Builder | Phase-1 launch gate |
| **SEC-3** | SEC | Sole-engineer credential compromise → audit tamper. | 2 | 3 | **6** | IAM isolation (AR-10, §2.10a); ASR-5 chaos test. | Solo Builder + Trustee Panel | Phase-1 launch gate |
| **SEC-9** | SEC | Audit-integrity check executable with mutate-capable credential. | 2 | 3 | **6** | IAM Isolation Commitment §2.10a; TC-9 chaos. | Solo Builder | Phase-1 launch gate |
| **PERF-1** | PERF | Pool spawn > 60 s at NFR-7 envelope. | 2 | 3 | **6** | Same as TECH-4. | Solo Builder | Phase-1 launch gate |
| **DATA-4** | DATA | drizzle migration corrupts prod (DATA lens). | 2 | 3 | **6** | Same as TECH-8. | Solo Builder | Phase-1 launch gate |
| **DATA-6** | DATA | Member-state derivation drifts from event-history truth. | 2 | 3 | **6** | Source-of-truth principle (§1.14); replay-from-events vs current-state diff assertion. | Solo Builder | Phase-1 launch gate |
| **BUS-1** | BUS | DPDPA Data Fiduciary non-compliance at launch. | 2 | 3 | **6** | OQ-16 + FR-95/96/97/99. | Legal counsel + Trustee Panel | Phase-1 launch gate |
| **BUS-2** | BUS | Concealment-penalty (FR-11) regression auto-denies a legitimate claim. | 2 | 3 | **6** | Rule-engine flags for State Trustee — never auto-denial; Stories 4.4 + 6.15. | Solo Builder | Phase-1 launch gate |
| **BUS-8** | BUS | Hindi/English Niyamavali parity drifts post-publish. | 2 | 3 | **6** | ASR-9 i18n parity assertion on every publish (Story 2.4). | Solo Builder | Phase-1 launch gate |
| **OPS-1** | OPS | Sole-engineer unavailable > 7 days during live cycle. | 2 | 3 | **6** | §9.1.1 Phase-0 prerequisites (runbooks, escrow, backup engineer); quarterly drill. | Solo Builder + Trustee Panel | Phase-0 gate |
| **OPS-2** | OPS | Dokploy outage Day 12–15 of a cycle. | 2 | 3 | **6** | Live-cycle fallback path (AR-54 + §5.10); chaos drill in staging. | Solo Builder | Phase-1 launch gate |
| **OPS-6** | OPS | Daily backup verification skipped — restore fails on quarterly drill. | 2 | 3 | **6** | NFR-25 + restore-from-backup drill in CI. | Solo Builder | Phase-0 gate |
| **OPS-7** | OPS | Audit-integrity-check job silently fails. | 2 | 3 | **6** | Daily integrity check + alert on failure; canary fault test. | Solo Builder | Phase-1 launch gate |

Medium and low-priority risks: see `_bmad-output/test-artifacts/test-design-progress.md` §3.2 for the full register (21 medium, 15 low, with mitigations).

#### Risk Category Legend

- **TECH** — Technical/Architecture (flaws, integration, scalability, determinism, replay)
- **SEC** — Security (RBAC, RLS, PII, auth, audit integrity)
- **PERF** — Performance (SLA, frame budget, latency)
- **DATA** — Data integrity (residency, retention, event immutability)
- **BUS** — Business impact (regulatory, UX, reputation, brand)
- **OPS** — Operations (deploy, runbook, bus-factor, on-call)

---

### NFR Testability Requirements

Architecture has already pre-named NFR budgets per subsystem (§5.12). The list below captures only the *gaps* and *clarifications* QA needs to plan validation; final PASS/CONCERNS/FAIL is for `bmad-testarch-nfr` once evidence exists.

| NFR Category | Threshold / Requirement | Current Design Support | Gap / Decision Needed | Planned Evidence |
| --- | --- | --- | --- | --- |
| Security | NFR-14 PII AES-256 envelope (Tink + Cloud KMS HSM); NFR-15 TLS 1.3+ pinned; NFR-16 cross-tenant isolation P0; NFR-28/29 OTP + session model | Supported (architecture §2.7, §2.7a, §2.2, §2.4, CC-1) | Final cert-policy CI lint owner; step-up OTP audit-line shape (operation-identifier tag schema) | KMS access log; TLS scan; ASR-1 adversarial RLS test; OTP audit lines per send + consume |
| Performance | NFR-1 cold start; NFR-2 My Pool; NFR-3 UPI; NFR-4 reconciliation; NFR-5 FR-12A 200 ms p95 / NFR-6 ≤ 60 s freshness; NFR-7 pool spawn N=50/M=4L < 60 s; NFR-8 admin mid-Android usable | Partial — capacity envelope unvalidated (FR-20 measured-validation gate pending); RTO/RPO deferred | 4L synthetic factory + clock provider; RTO/RPO numbers; production push-reliability target | k6/Artillery load report; chaos freshness log; Story 7.9 capacity-envelope report; Lighthouse-CI for web |
| Reliability | NFR-11 ≥ 99.5 / 99 % availability; NFR-12 atomic pool spawn; NFR-13 audit log integrity | Partial — observability stack ADR pending | Observability stack split (§5.6); alert SLOs for write-delay (NFR-10) and integrity-check failure (OPS-7) | Synthetic uptime probe; saga partial-failure resume log; daily integrity report |
| Maintainability | event immutability (AR-8); Zod single contract source (AR-38); test quality definition-of-done | Strong (architecture-by-design) | Coverage target & flake-rate SLOs (recommended ≥ 80 % statement on domain + contracts + pool/recon/validity; rolling flake < 1 % nightly) | Coverage report; flake dashboard |
| Compliance | NFR-23 Hindi/English parity (launch blocker); NFR-24 PII in India (`asia-south1`); NFR-26 audit 7-y retention; DPDPA consent/RTBF/export (FR-95/96/97/99) | Partial — DPO appointment timing (OQ-7), DPDPA Data Fiduciary trigger threshold, OQ-17 Vyawastha Shulk retention under RTBF all open | Trustee Panel + Legal sign-off | i18n parity report; infra-policy CI; retention-policy CI; DPDPA control surfaces audit |
| Accessibility | NFR-20 WCAG 2.1 AA launch blocker; NFR-21 Devanagari parity; NFR-22 pre-launch audit gates Phase 2 | Supported (FM-5 + UX-DR10 + UX-DR12) | External audit vendor + remediation closure log | axe-core CI; FM-5 contrast validation; external audit deliverable |

**Unknown thresholds (not guessed):** RTO/RPO targets (DR); production push-reliability budget (UX-DR6 covers prototype only); helpdesk concurrent-ticket capacity; DigiLocker downtime tolerance window beyond NFR-27 8 s p95; WA template throughput tier; 50 k-row desktop FPS floor; audit-log write-delay alert threshold; DPDPA Data Fiduciary registration trigger numeric. Each has a named owner in the progress file §3.3 and resolves before Phase-1 launch.

**Assessment boundary:** final PASS/CONCERNS/FAIL is the job of `bmad-testarch-nfr` after implementation evidence exists.

---

### Testability Concerns and Architectural Gaps

#### 🚨 ACTIONABLE CONCERNS — Architecture Team Must Address

**1. Blockers to Fast Feedback (What we need from Architecture)**

| Concern | Impact | What Architecture Must Provide | Owner | Timeline |
| --- | --- | --- | --- | --- |
| Pool Engine snapshot format deferred (B-1, TC-1) | Property-based replay tests cannot freeze acceptance | Snapshot shape + hash-on-snapshot rule committed in AR-11 ADR | Solo Builder | Pre-Story 7.4 |
| Recon matcher normalized schema deferred (B-2, TC-2) | 50 golden files/bank corpus has no target | Common shape `{datetime, amount, sender_name, sender_VPA?, UTR, narration}` + canonical dedup key committed | Solo Builder | Pre-Story 9.2 |
| Account State Machine composition rules deferred (B-3, TC-14) | UX-DR1 grief-context suppression cannot be tested deterministically | Frozen composition rules over claim/member/pool/alert primitives + frozen-* end-state enumeration | Solo Builder + Freya (UX) | Pre-Story 12.4 |
| Feature-flag tool selection (B-4) | DigiLocker-mandatory cutover lacks deterministic-eval, tenant-iso, replay-safe, audit-able backbone | ADR selecting tool against §Deferred-Decisions capability bar | Solo Builder | Pre-first FR-58C cohort rollout |
| Tea config auto-detection (B-5) | Test stack lock-in is implicit | Commit `test_framework: vitest+playwright`, `ci_platform: github-actions` | Solo Builder | Pre-Epic 1 |
| 4L synthetic-member factory missing (TC-5) | Story 7.9 capacity gate cannot run; ASR-3 & ASR-4 load tests have no fixture | Deterministic 4L generator in `packages/domain` test-utils; clock-aware | Solo Builder | Epic 1 |
| Clock-provider abstraction missing (TC-4) | Freshness invariant test (ASR-4) and 48 h-recon-mismatch transitions (Story 9.x) are timing-flaky | Single time-as-actor source (SIE driver) lands with Story 1.12 | Solo Builder | Epic 1 |
| Audit-integrity IAM independence proof (TC-9, H-1) | Without chaos test, "sole-engineer can't tamper" is asserted, not demonstrated | Chaos test in Story 1.11a: sole-engineer credential mutates row → integrity check fails ≤ 24 h | Solo Builder + Trustee Panel | Phase-1 launch gate |
| WA inbound webhook mock provider (TC-6, H-4) | Opt-in correctness depends on Meta surface; no in-test assertion | Mockoon/Wiremock-based fake for Meta inbound; webhook-fundamentals fragment applied | Solo Builder | Epic 5 |
| AR-48 SSR cache safety architecture-spec test (TC-7, H-5) | A PII leak via cached SSR shell would be invisible until replayed for another user | Snapshot assertion that SSR HTML for Sahyog Vivran contains zero Tier-1 PII tokens | Solo Builder | Pre-Story 11a.1 |
| drizzle migration rehearsal harness (TC-8, H-6) | Forward-only migration with no rehearsal = costly production-only risk | snapshot → migrate → query-suite gate on every PR touching `packages/drizzle/migrations` | Solo Builder | Epic 1 |
| UPI Intent typed builder (TC-10, H-7) | One malformed URL = ₹310 to wrong VPA; opaque post-launch | `UPIIntentURL` builder in `packages/domain` + property-based tests + per-app device-lab matrix | Solo Builder | Pre-Story 7.7 / 8.4 |
| Friction-budget CI gate reference impl (TC-12, H-8) | UX Stance #2 ungated = silent friction creep | Working prototype before Story 1.16a; fails PR on touch without `friction-budget.md` block | Solo Builder + Freya | Epic 1 |
| i18n parity assertion (TC-13) | NFR-23 launch blocker without automation | `packages/i18n` ships with inline-string lint + key-parity assertion | Solo Builder | Story 2.1 |
| Member-self FR-12A observability gap (TC-3) | Cannot reconcile member view vs admin view | Anonymized self-call counter (rate + outcome digest only); document in Story 4.6 | Solo Builder | Story 4.6 |

#### Testability Assessment Summary

##### What Works Well

- Determinism + replay are first-class cross-cutting concerns (CC-4); Pool Engine, Niyamavali registry, and the event log are all designed snapshot-able + provenance-grade.
- `packages/events` enforces event immutability (AR-8) → reconciliation, audit, pool-spawn flows are structurally append-only and naturally idempotent.
- `packages/contracts` (Zod) is the single source of truth for API shape; generated `packages/api-client` gives free typing on every black-box test.
- Postgres RLS-enforced multi-tenancy (AR-3) lets isolation be asserted at the SQL layer, not the app layer — bypass attempts are stopped by the engine.
- 12-factor + secrets-behind-provider-interface (AR-13) make test environments seedable without prod-shaped secrets.
- Channel-provider abstraction (AR-40) → every alert / notification channel swappable for in-test fakes.
- Audit log hash-chain provides a *cryptographic* assertion surface — tests compute expected `prev_hash` and detect mismatch.
- Architecture §5.12 pre-names NFR budgets per subsystem — acceptance criteria restate, not re-derive.
- 50 golden files/bank (AR-41) = built-in regression corpus.
- Per-Pariwar build matrix (AR-29) lets tenant-isolation be asserted at the build artifact level too.

##### Accepted Trade-offs (No Action Required for v1)

- **Substrate-conditional commitments are deferred** until P0-5 closes — this is named architecture discipline, not a defect. All RN + Tamagui-specific test scaffolding (Detox vs Maestro) sits behind the gate.
- **Member-self FR-12A self-calls are unaudited** by privacy + volume design — accepted; mitigated by anonymized counter (TC-3).
- **Pact MCP / consumer-driven contract testing is out for v1** (single repo, no microservice topology); `tea_use_pactjs_utils: false` is correct.
- **Edge / WAF final commitment** is open by design (§5.8a pivot path) — accepted; substitution points enumerated, not hard-coded.

---

### Risk Mitigation Plans (High-Priority Risks ≥ 6)

#### TECH-1: Reconciliation matcher silent mismatch (Score 6) — CRITICAL

**Mitigation Strategy:**

1. Commit normalized statement schema (B-2) before parser shipping.
2. Author ASR-7 idempotency + monotonic-confirmation property tests in `packages/domain`.
3. Build 50 golden files/bank corpus (AR-41) and gate every PR touching `packages/bank-parsers/*`.
4. Implement screenshot fallback (FR-32) + manual review queue (FR-50) as fail-safe paths verified by E2E.

**Owner:** Solo Builder · **Timeline:** Phase-1 launch gate · **Status:** Planned · **Verification:** ASR-7 passing in nightly; SM-5 ≥ 95 % at end of first soft-launch cycle.

#### TECH-2: Bank parser drift (Score 6) — CRITICAL

**Mitigation Strategy:**

1. 50 golden files per bank pre-launch (AR-41 content commitment).
2. Per-bank corpus regression on every PR touching parser.
3. Parser shipping schedule gates Phase 2 statewide rollout (AR-55).

**Owner:** Solo Builder (engineering) + Trustee Panel (content curation) · **Timeline:** Phase 2 gate · **Status:** Planned · **Verification:** every parser passes its corpus + zero unflagged anomalies on first 3 cycles.

#### TECH-3 / TECH-12: FR-12A determinism + freshness invariant (Score 6, 6) — CRITICAL

**Mitigation Strategy:**

1. ASR-12 determinism: same `member_id` + same `rule_registry_version` ⇒ identical payload.
2. ASR-4 latency: p95 < 200 ms at 4L synthetic (Story 4.6).
3. Chaos test on cache freshness: Niyamavali amendment → all-members read flips within 60 s (Story 4.8).
4. Conservative all-members fallback when scope confidence insufficient (per architecture §1.10).

**Owner:** Solo Builder · **Timeline:** Phase-1 launch gate · **Status:** Planned · **Verification:** load + chaos artifacts; ASR-4 / ASR-12 green in nightly.

#### TECH-4 / PERF-1: Pool-spawn capacity envelope (Score 6, 6) — CRITICAL

**Mitigation Strategy:**

1. Saga decomposition (parent → N child jobs) per architecture §5.11.
2. Class-A pg-boss queue + worker pool sizing (AR-5).
3. Story 7.9 measured-validation gate: N=50 / M=4L < 60 s p95 pre-launch.
4. Capacity-planning indicators in observability (architecture §5.6).

**Owner:** Solo Builder · **Timeline:** Phase-1 launch gate · **Status:** Planned · **Verification:** capacity-envelope report from Story 7.9; sustained < 60 s p95 across N {10, 25, 50} sweeps.

#### TECH-5: DigiLocker signature / fallback failure (Score 6) — CRITICAL

**Mitigation Strategy:**

1. Provider interface (AR-43) isolates parser + rate-limit + downtime concerns.
2. Manual fallback baseline (FR-2); state machine flips `pending-valid` → `verified` post-hoc without data migration.
3. Key-rotation chaos test fails closed.
4. FR-58C feature flag for hard-mandatory switch with canary rollout.

**Owner:** Solo Builder · **Timeline:** Phase-1 launch gate · **Status:** Planned · **Verification:** key-rotation chaos passes; manual fallback exit-rate < 5 % on average cycle.

#### TECH-6: RN + Tamagui substrate ratify (Score 6) — CRITICAL

**Mitigation Strategy:**

1. Phase-0 prototype on three test devices per UX-DR6 (Story 0.14).
2. Pass criteria P1–P6 (Devanagari render, UPI Intent, push reliability, offline cache, list 200+ at 60 fps target / 30 fps min, no blocking deps).
3. Tiered escalation (FM-2): mitigation → partial-surface fallback → substrate pivot.

**Owner:** Solo Builder · **Timeline:** Phase-0 gate · **Status:** Planned · **Verification:** ratify decision logged with evidence in `.decision-log.md`.

#### TECH-8 / DATA-4: drizzle forward-only migration corruption (Score 6, 6) — CRITICAL

**Mitigation Strategy:**

1. Snapshot DB → run new migration → run query-suite assertion in CI on every PR touching migrations.
2. Forward-only discipline preserved; rollback is forward-fix only.
3. Restore-from-backup drill quarterly (OPS-6 link).

**Owner:** Solo Builder · **Timeline:** Phase-1 launch gate · **Status:** Planned · **Verification:** rehearsal harness green; quarterly restore drill green.

#### DATA-6: Member-state derivation drift from event-history truth (Score 6) — CRITICAL

**Mitigation Strategy:**

1. Source-of-truth principle per architecture §1.14: persisted state = optimization only.
2. Replay-from-events vs current-state diff assertion in nightly.
3. Event-log immutability lint (AR-8).

**Owner:** Solo Builder · **Timeline:** Phase-1 launch gate · **Status:** Planned · **Verification:** zero diff under nightly replay across N synthetic members.

#### SEC-2: Public-surface PII leak (Score 6) — CRITICAL

**Mitigation Strategy:**

1. CI scrape gate (Story 1.16b) — every PR, every public surface.
2. AR-48 SSR cache-safety snapshot test (H-5).
3. Anti-enumeration (FR-91), honeypot + noindex (FR-92), Cloudflare + Bot Management + Turnstile.
4. SM-C5 hard-zero counter-metric monitoring post-launch.

**Owner:** Solo Builder · **Timeline:** Phase-1 launch gate · **Status:** Planned · **Verification:** ASR-8 green; zero PII findings in scrape gate over 14 days.

#### SEC-3 / SEC-9 / OPS-7: Audit-integrity surface (Score 6, 6, 6) — CRITICAL

**Mitigation Strategy:**

1. IAM Isolation Commitment per architecture §2.10a — write role in `twt-audit-mirror` project, read role in separate project, sole-engineer prod-DB credentials cannot access either.
2. ASR-5 chaos test: mutate one audit row with sole-engineer credential → integrity check FAILS ≤ 24 h.
3. Daily integrity check job + alerting harness; canary fault validates alert.
4. Quarterly attestation (Trustee Panel).

**Owner:** Solo Builder + Trustee Panel · **Timeline:** Phase-1 launch gate · **Status:** Planned · **Verification:** chaos test green; quarterly attestation log; alert harness fires on canary.

#### OPS-1: Sole-engineer unavailable > 7 days mid-cycle (Score 6) — CRITICAL

**Mitigation Strategy:**

1. Runbooks for every operational task (PRD §9.1.1, AR-67).
2. Credential escrow with ≥ 2 trustees (Story 0.2).
3. Code escrow auto-mirror on release-branch push (Story 0.3).
4. Backup engineer retainer (A-13, Story 0.6).
5. Runbook drill — backup engineer executes deploy + rollback + matcher manual intervention from runbooks alone.

**Owner:** Solo Builder + Trustee Panel · **Timeline:** Phase-0 gate · **Status:** Planned · **Verification:** quarterly drill log; sign-off pre-Phase-1.

#### OPS-2: Dokploy outage Day 12–15 of cycle (Score 6) — CRITICAL

**Mitigation Strategy:**

1. Live-cycle fallback path documented (AR-54 + §5.10).
2. Dokploy-down chaos drill in staging.
3. Kubernetes migration path (AR-28) ready when trigger fires.

**Owner:** Solo Builder · **Timeline:** Phase-1 launch gate · **Status:** Planned · **Verification:** staging chaos drill green; runbook signed off.

#### OPS-6: Backup restore failure on quarterly drill (Score 6) — CRITICAL

**Mitigation Strategy:**

1. Daily backups (NFR-25) with automated backup-job assertion.
2. Quarterly restore-from-backup drill in CI + manual sign-off.
3. Restore time captured against RTO once committed.

**Owner:** Solo Builder · **Timeline:** Phase-0 gate · **Status:** Planned · **Verification:** quarterly restore drill artifact + Trustee attestation.

#### BUS-1: DPDPA Data Fiduciary non-compliance at launch (Score 6) — CRITICAL

**Mitigation Strategy:**

1. Consent registry (FR-97) per surface, per category, revocable.
2. RTBF flow (FR-96) soft-delete + anonymize.
3. Data export ZIP (FR-95).
4. DPO appointment plan (OQ-7) + readiness for breach reporting (FR-99) at MeitY threshold.

**Owner:** Legal counsel + Trustee Panel · **Timeline:** Phase-1 launch gate · **Status:** Planned · **Verification:** consent / RTBF / export E2E tests green; legal sign-off on T&C and Privacy Policy.

#### BUS-2: Concealment-penalty regression auto-denies legitimate claim (Score 6) — CRITICAL

**Mitigation Strategy:**

1. Rule engine surfaces the trigger; final denial requires explicit State Trustee action (FR-11).
2. Unit + API tests on the concealment-flag path (Stories 4.4 + 6.15).
3. Audit log every evaluation with rule version (FR-7).

**Owner:** Solo Builder · **Timeline:** Phase-1 launch gate · **Status:** Planned · **Verification:** unit truth-table covers all R5/R9/R14-adapted paths; integration test asserts non-auto-denial.

#### BUS-8: Hindi/English Niyamavali parity drift (Score 6) — CRITICAL

**Mitigation Strategy:**

1. ASR-9 i18n parity assertion (Story 2.1).
2. CI lint against inline formatting (AR-59).
3. Parity assertion on every Niyamavali publish (Story 2.4).

**Owner:** Solo Builder · **Timeline:** Phase-1 launch gate · **Status:** Planned · **Verification:** parity report green on every release.

---

### Assumptions and Dependencies

#### Assumptions

1. P0-5 Native-Stack Validation closes positive (RN + Tamagui ratified for mobile) — if it pivots, the mobile E2E framework selection re-opens and ASR-3/4 mobile-side scaffolding regresses by ~2 weeks.
2. The 5-bank parser allowlist (SBI, PNB, BoB, BoI + 1 Bihar cooperative) remains stable through Phase 2; new banks are out of v1 scope.
3. `pg-boss` Class-A queue + worker pool sizing per §5.11 holds at the N=50 / M=4L spawn envelope — if not, ADR re-opens.
4. DigiLocker provider approval timeline holds (A-4): 6–12 months post-launch; mandatory switch is FR-58C-gated.
5. Architecture's source-of-truth principle (§1.14) is honored across implementation — persisted state never mutated independently of events.
6. Trustee Panel sign-off remains the gate for OQ-3 (12-role set), OQ-13 (IMA list source), OQ-15 (staff hiring), OQ-16 (regulatory) — these are operational, not software.

#### Dependencies

1. AR-11 ADR (Pool Engine snapshot format) — required before Story 7.4 acceptance.
2. AR-69 ADR backlog (esp. recon matcher + edge/WAF + flag tool) — required before respective stories.
3. P0-5 Native-Stack Validation (Story 0.14) — required before mobile-specific test scaffolding.
4. AR-49 Phase-0 gate inventory — required before Phase 1 transition.

#### Risks to the Test Plan Itself

- **Risk:** Solo Builder cadence cannot parallelize implementation + test authoring at the planned 6–10 week envelope without slip.
  - **Impact:** P0 coverage may lag implementation; PR-time feedback weakens.
  - **Contingency:** Stage P0 by uncompromisable-subsystem order (Pool Engine → Reconciliation → RBAC/Audit → Validity Service) and gate Phase 1 launch *only* on those ASRs; defer P1 visual-regression coverage to nightly until backup engineer onboarded.
- **Risk:** Open ADRs (B-1 to B-4) slip and block their dependent stories.
  - **Impact:** Test design's blocker list becomes implementation's blocker list; calendar slip.
  - **Contingency:** Treat each open ADR as a Phase-1 launch gate item; do not let work begin on dependent stories until ADR closes.

---

**End of Architecture Document**

**Next Steps for Architecture Team (Solo Builder + Trustee Panel):**

1. Review Quick Guide (🚨 Blockers / ⚠️ High Priority / 📋 Info) and prioritize the 5 blockers (B-1 → B-5).
2. Assign owners + timelines for the 19 high-priority risks (≥ 6) using the table above as the planning surface.
3. Validate assumptions and dependencies (notably P0-5 outcome, AR-11 / AR-69 closure).
4. Provide feedback to QA on whether the 15 ACTIONABLE testability concerns are accepted, deferred, or re-scoped.

**Next Steps for QA Discipline (Solo Builder in QA mode):**

1. Wait on B-1 / B-2 / B-3 / B-4 / B-5 before starting Pool Engine / Reconciliation / Module Shelf / FR-58C / monorepo-bootstrap test development.
2. Refer to companion QA doc (`test-design-qa.md`) for the full coverage matrix, execution lanes, and code patterns.
3. Begin test infrastructure setup in Epic 1: 4L synthetic factory, clock provider, audit chaos harness, PII scrape gate, friction-budget reference impl, i18n parity assertion, drizzle rehearsal harness, WA webhook mock provider, UPI Intent typed builder.
