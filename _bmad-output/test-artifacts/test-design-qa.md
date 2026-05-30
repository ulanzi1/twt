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

# Test Design for QA: TWT (Teachers Welfare Trust) — v1

**Purpose:** Test execution recipe for the Solo Builder in QA mode (and the backup engineer once onboarded). Defines what to test, how to test it, at which level, with which tags, and what QA needs from the other tracks.

**Date:** 2026-05-29
**Author:** Master Test Architect (TEA)
**Status:** Draft
**Project:** TWT v1

**Related:** See `test-design-architecture.md` for architectural blockers (B-1 → B-5), testability concerns, and risk mitigation plans. This document does not duplicate them.

---

## Executive Summary

**Scope:** v1 (Bihar single-Pariwar) test suite anchoring the three uncompromisable subsystems (Pool Engine, Reconciliation, RBAC + multi-tenant isolation) and the elevated trio (Audit Integrity, Niyamavali / FR-12A, UPI Intent dispatch), plus DPDPA + accessibility + bilingual launch blockers.

**Risk Summary:**

- Total risks: 55 (19 high-priority score ≥ 6, 21 medium, 15 low).
- Critical categories: TECH (13) — correctness/replay; SEC (11) — RBAC, PII, audit; BUS (9) — regulatory, brand, claim-eligibility.

**Coverage Summary:**

- P0 tests: ~30 (uncompromisable subsystems, audit chain, RLS, PII scrape, recon idempotency, validity service, UPI Intent canonicalization, claim concealment, i18n parity, restore drill).
- P1 tests: ~50 (critical paths in Epics 3, 4, 6, 7, 8, 9, 10; appeal flow; verifier console N+1; bilingual rendering; mobile perf budgets; channel fallbacks).
- P2 tests: ~25 (helpdesk routing, banner/popup, Telegram mirror, calendar-aware close-of-cycle, adopter chain v1).
- P3 tests: ~10 (visual regression scaffolding, exploratory perf, design system stubs).
- **Total:** ~115 distinct test scenarios; **~170–275 engineer-hours to author** (Solo Builder, 6–10 calendar weeks parallelized with implementation post-P0-5 ratify).

---

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| **Crowdfunding Module gateway integration** | v1 explicitly out (PRD §6.2); Phase 2/3 | Defer until that phase; arch §Crowdfunding Boundary Rule prevents v1 coupling |
| **Cross-Pariwar member-facing UI (Pariwar-Passport)** | Data model in v1; UI v2 (FR-63) | API-layer Pariwar-Passport tests retained; UI tests deferred |
| **Helpline operator co-pilot (telephony AI)** | v2+ (§2.4 / AR-24) | Manual call handling in v1; no test scope |
| **Daughter's marriage / Jivandan / Retirementdaan** | v2/v3 categories (§3 Glossary) | `support_category` discriminator extension test only |
| **Pact MCP / consumer-driven contracts** | Single repo, no microservice topology; config `tea_use_pactjs_utils: false` | Out of scope; revisit at second Pariwar |
| **k6 Cloud / paid perf platform** | Solo cadence; self-hosted Artillery or `vitest --bench` is sufficient for Phase 1 | Plan re-evaluation at 4L milestone |
| **External a11y vendor audit** | NFR-22 Phase-2 gate; deliverable not internal hours | Vendor procurement is Trustee Panel task |
| **eHRMS auto-fetch** | PRD §6.2 explicit out (politically infeasible) | Manual entry only; no integration test |

Items above have been reviewed and accepted as out-of-scope by Solo Builder (acting QA + Dev) and the Trustee Panel.

---

## Dependencies & Test Blockers

**CRITICAL:** QA cannot proceed on the named subsystems without these items.

### Backend / Architecture Dependencies (Pre-Implementation)

Source: see `test-design-architecture.md` Quick Guide for detailed mitigation plans.

1. **B-1: Pool Engine snapshot format ADR (AR-11)** — Solo Builder — pre-Story 7.4. Without it, ASR-2 (determinism + replay) cannot freeze acceptance.
2. **B-2: Reconciliation normalized statement schema ADR (AR-69)** — Solo Builder — pre-Story 9.2. Without it, 50-golden-file/bank corpus and ASR-7 idempotency have no target.
3. **B-3: Account State Machine composition rules ADR** — Solo Builder + UX — pre-Story 12.4. Without it, Module Shelf grief-context suppression (UX-DR1) is untestable.
4. **B-4: Feature-flag tool ADR (P1 Deferred Decisions)** — Solo Builder — pre-first FR-58C cohort rollout. Without it, DigiLocker-mandatory cutover has no deterministic backbone.
5. **B-5: Tea config commitment** — Solo Builder — pre-Epic 1. Explicit `test_framework: vitest+playwright`, `ci_platform: github-actions` in `_bmad/tea/config.yaml`.
6. **P0-5 Native-Stack Validation (Story 0.14)** — Solo Builder — Phase-0 gate. Until ratify, mobile E2E framework (Detox vs Maestro) cannot be selected.
7. **AR-69 dependent ADRs** — Edge/WAF (§5.8a), Pool snapshot format, recon matcher mechanism, Bank statement normalization, IAM Isolation, OTP fraud-policy thresholds — pre-respective stories.

### QA Infrastructure Setup (Pre-Implementation, Epic 1)

1. **4L synthetic-member factory** — `packages/domain/__tests__/factories/member.ts` with faker-based deterministic seeding and clock-aware lifecycle states. Powers ASR-3 + ASR-4 load tests.
2. **Clock provider abstraction** — single time-as-actor source; used by ASR-4 freshness invariant, recon 48 h-mismatch transitions, alert state-machine SIE.
3. **PII allowlist for scrape gate** — single canonical list of Tier-1 PII tokens (mobile, email, Aadhaar, DOB, address, nominee bank, nominee IFSC, medical disclosures); used by ASR-8.
4. **Audit chaos harness** — credential context that mutates one audit row; integrity check must FAIL ≤ 24 h.
5. **Mockoon / Wiremock fakes** — Meta WA inbound, DigiLocker provider, FCM/APNs, partner module callbacks.
6. **`UPIIntentURL` typed builder** + property-based test scaffolding in `packages/domain`.
7. **drizzle rehearsal harness** — snapshot DB → migrate → run query suite on every PR touching `packages/drizzle/migrations`.
8. **Friction-budget CI gate prototype** (UX-DR3 reference impl).
9. **i18n parity assertion utility** in `packages/i18n` test-utils.
10. **Per-bank golden-file loader** — 50 files × 5 banks; expected normalized record per file.

### Test Environments

- **Local (Solo Builder workstation):** Docker Compose (Postgres 16 + Cloud SQL proxy mock + pg-boss runner) — runs full Vitest + smoke E2E in < 15 min.
- **CI (GitHub Actions):** Turborepo affected-graph; testcontainers for ephemeral Postgres; Playwright matrix; weekly capacity envelope on a dedicated runner.
- **Staging:** mirrors production minus per-Pariwar volume; Dokploy auto-deploy on `release/*` branches; used for Weekly lane (capacity gate, restore drill, edge-pivot rehearsal).
- **Production:** synthetic uptime probes only.

#### Example factory pattern (with `@seontechnologies/playwright-utils`)

```typescript
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures';
import { expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test('@P0 @API @MultiTenant cross-Pariwar read attempt is denied by RLS', async ({ apiRequest }) => {
  const pariwarA = `bihar-${faker.string.uuid()}`;
  const pariwarB = `rail-${faker.string.uuid()}`;

  // Seed one member per Pariwar
  await apiRequest({
    method: 'POST',
    path: '/test/seed/member',
    body: { pariwar_id: pariwarA, first_name: 'Sushil', district: 'Vaishali' },
  });
  await apiRequest({
    method: 'POST',
    path: '/test/seed/member',
    body: { pariwar_id: pariwarB, first_name: 'Ravi', district: 'Patna' },
  });

  // Auth as pariwarA admin; attempt to read pariwarB's member
  const { status, body } = await apiRequest({
    method: 'GET',
    path: `/p/${pariwarA}/admin/members`,
    headers: { 'x-actor-pariwar': pariwarA },
  });

  expect(status).toBe(200);
  expect(body.members.every((m: { pariwar_id: string }) => m.pariwar_id === pariwarA)).toBe(true);
  expect(body.members.find((m: { first_name: string }) => m.first_name === 'Ravi')).toBeUndefined();
});
```

---

## Risk Assessment

Full risk register lives in `test-design-architecture.md`. The table below summarizes only how QA validates each high-priority risk.

### High-Priority Risks (Score ≥ 6)

| Risk ID | Category | Description | Score | QA Test Coverage |
| --- | --- | --- | :-: | --- |
| **TECH-1** | TECH | Reconciliation matcher silently mismatches | **6** | ASR-7 idempotency + monotonic-confirmation property tests; 50 golden files × 5 banks corpus regression; end-to-end timing under simulated cycle |
| **TECH-2** | TECH | Bank parser drift across 5-bank allowlist | **6** | Per-bank corpus on every PR touching `packages/bank-parsers/*` |
| **TECH-3** | TECH | FR-12A non-determinism under cache race | **6** | ASR-12 determinism + ASR-4 latency at 4L synthetic |
| **TECH-4** | TECH | Pool-spawn capacity at 4L | **6** | ASR-3 measured-validation gate (Story 7.9) N=50/M=4L p95 < 60 s |
| **TECH-5** | TECH | DigiLocker signature / fallback failure | **6** | Provider-fault injection + key-rotation chaos; manual-fallback parity |
| **TECH-6** | TECH | RN+Tamagui substrate fails P0-5 | **6** | Story 0.14 device-lab matrix; ratify decision logged |
| **TECH-8** | TECH | drizzle migration corruption | **6** | Rehearsal harness in CI; restore-from-backup drill |
| **TECH-12** | TECH | FR-12A freshness invariant breach | **6** | ASR-4 chaos test (clock provider) |
| **SEC-2** | SEC | Public-surface PII leak | **6** | ASR-8 PII scrape gate; AR-48 SSR cache safety snapshot |
| **SEC-3** | SEC | Sole-engineer credential compromise → audit tamper | **6** | ASR-5 chaos: mutate audit row → integrity check fails ≤ 24 h |
| **SEC-9** | SEC | Audit-integrity check executable with mutate creds | **6** | Same as SEC-3 (IAM isolation §2.10a) |
| **PERF-1** | PERF | Pool spawn > 60 s at NFR-7 envelope | **6** | ASR-3 capacity gate (Weekly lane) |
| **DATA-4** | DATA | drizzle migration corruption (DATA lens) | **6** | Same as TECH-8 |
| **DATA-6** | DATA | Member-state drifts from event-history truth | **6** | Replay-from-events vs current-state diff assertion (nightly) |
| **BUS-1** | BUS | DPDPA Data Fiduciary non-compliance | **6** | Consent + RTBF + export E2E (Stories 3.11, 3.12, 2.7) |
| **BUS-2** | BUS | Concealment-penalty regression auto-denies | **6** | Unit truth-table + API non-auto-denial assertion (Stories 4.4, 6.15) |
| **BUS-8** | BUS | Hindi/English Niyamavali parity drift | **6** | ASR-9 i18n parity assertion on every publish |
| **OPS-1** | OPS | Sole-engineer unavailable > 7 days mid-cycle | **6** | Runbook drill (quarterly); backup engineer executes deploy + rollback + matcher manual intervention from runbooks |
| **OPS-2** | OPS | Dokploy outage Day 12–15 | **6** | Staging chaos drill; runbook validated |
| **OPS-6** | OPS | Backup restore failure | **6** | Quarterly restore-from-backup drill (NFR-25) |
| **OPS-7** | OPS | Audit-integrity job silently fails | **6** | Alert harness + canary fault test |

### Medium / Low-Priority Risks

Summary entries; full mitigations in architecture doc and progress file §3.2.

| Risk ID | Category | Description | Score | QA Test Coverage |
| --- | --- | --- | :-: | --- |
| TECH-7 | TECH | pg-boss partitioning race | 4 | Worker-pool sizing + saturation test |
| TECH-10 | TECH | WA template throttle / suspension | 4 | Provider-fault injection → SMS fallback assertion |
| TECH-13 | DATA | Pool snapshot vs audit retention misalignment | 4 | Retention-policy CI |
| SEC-4 | SEC | Cloudflare DPDPA-incompatibility pivot | 4 | Edge-pivot rehearsal in staging |
| SEC-7 | SEC | Anti-bot bypass → directory enumeration | 4 | Scrape simulation harness |
| SEC-8 | SEC | Field worker code abuse | 4 | Rate-limit + cohort-anomaly assertion |
| SEC-11 | SEC | Webhook signature spoof | 4 | Adversarial signature tests in CI |
| PERF-2 | PERF | FR-12A > 200 ms p95 | 4 | k6/Artillery load test |
| PERF-3 | PERF | Recon > 4 h p95 | 4 | E2E timing in simulated cycle |
| PERF-4 | PERF | UPI Intent launch > 1 s p95 | 4 | Mobile perf trace per Story 8.4 |
| PERF-5 | PERF | My Pool render > 500 ms p95 | 4 | Mobile perf trace per Story 8.2 |
| PERF-6 | PERF | Cold start > 3 s | 4 | Lighthouse-CI (web) + Detox/Maestro startup (mobile) |
| PERF-7 | PERF | Verifier console > 5 s (N+1) | 4 | N+1 detection lint + API perf assertion |
| DATA-3 | DATA | Vyawastha receipt RTBF collision (OQ-17) | 4 | Back-prove query CI gate (Story 14.6) |
| BUS-3 | BUS | FR-19 close-of-cycle copy framing | 4 | Template lint against rejected-phrase list |
| BUS-6 | BUS | TDS §194H deduction error | 4 | Rate-matrix + golden-file payout test (Story 13.5) |
| BUS-9 | BUS | Recon nominee chase → bad public Sahyog narrative | 4 | UX-driven E2E mismatch path |
| OPS-4 | OPS | pg-boss queue saturation | 4 | Queue-depth assertion + ASR-3 link |
| OPS-5 | OPS | Backup engineer untrained | 4 | Quarterly readiness drill |
| OPS-8 | OPS | Runbook drift | 4 | Runbook-as-code drill cadence |
| SEC-1, SEC-5, SEC-6, SEC-10, BUS-5, BUS-7, DATA-1, DATA-2, DATA-5, TECH-9, TECH-11, BUS-4, OPS-3, PERF-8, BUS-6_low | mixed | LOW (≤ 3) | 1–3 | Monitor; covered by their respective mitigations referenced in arch doc |

---

## NFR Test Coverage Plan

Final PASS/CONCERNS/FAIL belongs to `bmad-testarch-nfr` once implementation evidence exists.

| NFR Category | Requirement / Threshold | Planned Validation | Tool / Level | Evidence Artifact | Priority |
| --- | --- | --- | --- | --- | :-: |
| Security | NFR-14 PII AES-256 (Tink + Cloud KMS HSM) | KMS access-log assertion + Tink usage lint | Integration + SAST | KMS audit log; Tink gate report | P0 |
| Security | NFR-15 TLS 1.3+ pinned | Cert-policy CI lint + handshake assertion | CI + external probe | TLS scan report per environment | P0 |
| Security | NFR-16 cross-tenant isolation | ASR-1 adversarial RLS sweep | Integration (SQL + API) | Adversarial test artifact | P0 |
| Security | NFR-28 OTP TTL + rate limits | API + audit-log assertion | API | OTP audit lines per send + consume | P0 |
| Security | NFR-29 Session model + step-up matrix | Per-operation step-up assertion | API + Component | Matrix-test artifact | P0 |
| Performance | NFR-1 Cold start < 3 s | Lighthouse-CI (web) + Detox/Maestro (mobile, post-P0-5) | Device-lab + CI | Device matrix report + Lighthouse JSON | P1 |
| Performance | NFR-2 My Pool render < 500 ms p95 | Mobile perf trace + virtualized-list assertion | Mobile perf | Frame timing trace | P1 |
| Performance | NFR-3 UPI Intent launch < 1 s p95 | Mobile perf measure + structured-event timing | Mobile perf | Client-side latency metric | P1 |
| Performance | NFR-4 Recon < 4 h p95 | E2E simulated cycle + structured-event timing | E2E + observability | Cycle-trace timing report | P0 |
| Performance | NFR-5 FR-12A p95 < 200 ms at 4L | k6 / Artillery against 4L synthetic | Load | Load-test HTML + p95 dashboard | P0 |
| Performance | NFR-6 FR-12A freshness ≤ 60 s | Chaos test (clock provider) | Chaos | Chaos run log + assertion | P0 |
| Performance | NFR-7 Pool spawn < 60 s at N=50/M=4L | Story 7.9 measured-validation gate | Load (Weekly) | Capacity-envelope report | P0 |
| Performance | NFR-8 Admin UI on mid-Android | Playwright mobile-viewport E2E + device-lab | E2E + Manual | Visual regression + interaction trace | P1 |
| Performance | NFR-9 Matcher idempotent + replayable | Unit + Integration replay | Unit + Integration | ASR-7 test artifact | P0 |
| Performance | NFR-10 Audit write ≤ 1 min | Structured-event timing + alert | Observability | Alert SLO + trace sample | P1 |
| Reliability | NFR-11 ≥ 99.5 / 99 % availability | Synthetic uptime probe + SLO dashboard | Observability | Dashboard snapshot | P1 |
| Reliability | NFR-12 Pool spawn atomic w/ retry | Integration saga test | Integration | Saga partial-failure resume log | P0 |
| Reliability | NFR-13 Audit log integrity | ASR-5 chaos + daily integrity job + off-site diff | Chaos + Integration | Integrity-check daily report | P0 |
| Maintainability | event immutability (AR-8) | ESLint rule + DB-trigger assertion | CI + Integration | Lint + trigger report | P1 |
| Maintainability | Coverage ≥ 80 % on domain/contracts/pool/recon/validity | Vitest coverage | CI | Coverage report | P1 |
| Maintainability | Flake rate < 1 % nightly | Test reporter dashboard | CI | Flake dashboard | P1 |
| Accessibility | NFR-20 WCAG 2.1 AA launch blocker | axe-core on member-flow surfaces; external audit | E2E + Vendor | axe report + audit deliverable | P0 |
| Accessibility | NFR-21 Devanagari parity | FM-5 contrast validation; render test on three devices | Component + Device-lab | Visual regression on device-lab | P1 |
| Localization | NFR-23 Hi/En parity (launch blocker) | ASR-9 parity assertion + inline-string lint | CI | Parity report per publish | P0 |
| Data residency | NFR-24 PII in `asia-south1` | Infra-policy CI (region declarations) | CI | Policy-scan report | P0 |
| Backup/DR | NFR-25 Daily backups + quarterly restore | OPS-6 drill | Drill | Restore drill log | P0 |
| Backup/DR | NFR-26 Audit 7-y retention | Retention-policy CI + WORM Bucket Lock | CI + Attestation | Policy-scan + quarterly attestation | P0 |
| Backup/DR | NFR-27 DigiLocker latency 8 s p95 + 12 s fallback CTA | Provider-fault injection + UX-timer assertion | Integration + Component | Latency trace + assertion | P1 |

### Missing thresholds or evidence sources

- **RTO / RPO targets** — owner: Solo Builder; resolve before Phase 1; operations-policy ADR.
- **Production push-notification reliability target** — UX-DR6 covers prototype only; owner: Solo Builder.
- **Helpdesk concurrent-ticket capacity** — owner: Trustee Panel via OQ-15 staff hiring plan.
- **DigiLocker downtime tolerance window beyond NFR-27 8 s p95** — owner: Solo Builder.
- **WA template throughput tier** — owner: Trustee Panel + commercial.
- **50 k-row desktop FPS floor for `<ContributionListTable>`** — owner: design system Phase 1.
- **Audit-log write-delay alert threshold** — bake into observability stack ADR.
- **DPDPA Data Fiduciary registration trigger numeric** — owner: Legal counsel (OQ-7).

None of these block current test design; each is escalated into the risk register or the appropriate operational owner per `test-design-architecture.md`.

---

## Entry Criteria

QA test development cannot begin until ALL of the following are met:

- [ ] Architecture blockers B-1 through B-5 closed or formally deferred for specific subsystems (Pool Engine: B-1; Reconciliation: B-2; Module Shelf: B-3; FR-58C: B-4; monorepo bootstrap: B-5).
- [ ] P0-5 Native-Stack Validation Experiment (Story 0.14) closed positive *or* mobile work formally re-scoped to Web-PWA fallback per FM-2 escalation.
- [ ] `_bmad/tea/config.yaml` updated with explicit `test_framework` and `ci_platform` values.
- [ ] Test environments provisioned (Local + CI testcontainers + Staging).
- [ ] Epic 1 infrastructure landed: 4L synthetic factory, clock provider, audit chaos harness, PII allowlist, mock providers (Meta WA, DigiLocker, FCM/APNs), `UPIIntentURL` builder, drizzle rehearsal harness, friction-budget gate prototype, i18n parity utility, golden-file loader.
- [ ] Phase-0 prerequisites (Story 0.1–0.15) signed off by Trustee Panel.
- [ ] Feature deployed to staging on the relevant release branch.

## Exit Criteria

Testing phase is complete when ALL of the following are met:

- [ ] All P0 tests passing (100 % pass rate).
- [ ] All P1 tests passing (≥ 95 % pass rate; failures triaged and accepted).
- [ ] All 19 HIGH-priority risks have a passing test *or* a written deferral signed off by Trustee Panel.
- [ ] No open P0 / P1 bugs.
- [ ] Coverage ≥ 80 % statement on `packages/domain`, `packages/contracts`, and the pool / reconciliation / validity modules.
- [ ] NFR evidence catalog committed; final NFR PASS/CONCERNS/FAIL handed off to `bmad-testarch-nfr`.
- [ ] Pre-launch external a11y audit (NFR-22) closed (Phase-2 gate).
- [ ] Quarterly restore-from-backup drill (NFR-25) green.
- [ ] Runbook drill executed by backup engineer; sign-off pre-Phase-1.

---

## Test Coverage Plan

**IMPORTANT:** P0/P1/P2/P3 = **priority and risk level**, not execution timing. Execution lanes (PR / Nightly / Weekly) are documented separately in `Execution Strategy`.

### P0 (Critical)

**Criteria:** Blocks core functionality + High risk (≥ 6) + No workaround + Affects majority of users.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P0-001** | Cross-Pariwar adversarial read across every RLS-bound table | Integration (SQL + API) | SEC-1, NFR-16 | Story 1.6; ASR-1 |
| **P0-002** | RLS policy lint: every multi-tenant table has `pariwar_id NOT NULL` + RLS policy | Unit (schema) | SEC-1 | CI gate on every migration |
| **P0-003** | RBAC `has_permission(user, key, target)` truth table — 12-role × scope × permission-key | Unit | SEC-1, FR-44/45 | Per FR-46 |
| **P0-004** | Audit log hash-chain integrity under concurrent writes | Unit (property-based) | TECH-9, ASR-5 | `prev_hash` property |
| **P0-005** | Audit-integrity chaos: mutate row → integrity check fails ≤ 24 h | Integration (chaos) | SEC-3, SEC-9, OPS-7, ASR-5 | Story 1.11a — gates Phase 1 |
| **P0-006** | Audit off-site mirror 6 h replication diff | API | SEC-9, DATA-2 | IAM `twt-audit-mirror` project |
| **P0-007** | Migration rehearsal harness: snapshot → migrate → query-suite | Integration (CI) | TECH-8, DATA-4 | Per PR touching migrations |
| **P0-008** | pg-boss idempotency keyed store: re-enqueue ⇒ single execution | Unit | AR-58 | Property-based |
| **P0-009** | Admin auth + WebAuthn + step-up OTP per-operation matrix | API + Component | NFR-29, ASR-10 | Audit-per-send + audit-per-consume |
| **P0-010** | Cloud KMS HSM + Tink envelope: Tier-1 PII round-trip; per-row DEK | Integration | NFR-14, SEC-10 | KMS access log emitted |
| **P0-011** | PII scrape gate: every public surface zero Tier-1 leak | API + E2E + CI | SEC-2, BUS-7, SM-C5, ASR-8 | Story 1.16b; gates Phase 1 |
| **P0-012** | Schema-diff CI gate (FR-100 non-add guard) | CI | ASR-11 | v1 tables remain non-additive |
| **P0-013** | i18n parity: every key in `hi` AND `en` | Unit (CI) | NFR-23, BUS-8, ASR-9 | Story 2.1 — gates Phase 1 |
| **P0-014** | i18n inline-string lint | CI | AR-59 | No formatting outside `packages/i18n` |
| **P0-015** | Member lifecycle state machine: every transition emits event | Unit (property-based) | NFR-18, AR-14, DATA-6 | Source-of-truth replay diff |
| **P0-016** | DigiLocker key-rotation chaos: signature verify fails closed | Integration | TECH-5, SEC-10 | Provider interface |
| **P0-017** | Medical disclosure ack + audit + concealment wiring — never auto-deny | API | BUS-2, FR-11 | Story 4.4 + 6.15 |
| **P0-018** | DPDPA RTBF soft-delete + anonymization (audit not anonymized) | API | BUS-1, FR-96 | Story 3.12 |
| **P0-019** | FR-12A determinism: same `member_id` + `rule_registry_version` ⇒ identical payload | Unit + API | ASR-12, TECH-3 | Replay |
| **P0-020** | FR-12A latency p95 < 200 ms at 4L synthetic | Load (k6 / Artillery) | NFR-5, ASR-4 | Weekly lane |
| **P0-021** | FR-12A cache freshness: amendment → all-members flips ≤ 60 s | Chaos | NFR-6, TECH-12, ASR-4 | Clock-provider abstraction |
| **P0-022** | Pool assignment determinism: `hash(member_id, cycle_id) % N` reproducible | Unit (property-based) | ASR-2, TECH-11 | Pool sizes differ ≤ 1 |
| **P0-023** | Full-cycle replay: snapshot → re-derive ⇒ identical | Integration | ASR-2, AR-57 | Snapshot from AR-11 ADR |
| **P0-024** | Pool spawn saga: parent → N children; resumable + idempotent | Integration | TECH-7, NFR-12 | Class-A pg-boss |
| **P0-025** | Pool-spawn capacity gate: N=50 / M=4L p95 < 60 s | Load (Weekly) | ASR-3, NFR-7, PERF-1 | Story 7.9; gates Phase 1 |
| **P0-026** | UPI Intent typed builder: property-based on (`pa`, `am`, `cu`, `tr`, `tn`, `mc`) | Unit | ASR-6, SEC-5 | `packages/domain` |
| **P0-027** | Per-UPI-app parity (BHIM/PhonePe/GPay/Paytm) | Device-lab manual | ASR-6 | Pre-launch checklist |
| **P0-028** | Bank statement parsers: 50 golden files × 5 banks regression | Unit | TECH-2, AR-41 | Per PR touching parser |
| **P0-029** | Normalized statement schema contract: every parser emits same shape | Contract (vitest) | TC-2, AR-69 | Schema ADR pre-Story 9.2 |
| **P0-030** | Reconciliation matcher idempotency + monotonic confirmation | Unit + Integration | ASR-7, NFR-9, DATA-6 | Replay-safe |
| **P0-031** | End-to-end recon timing: statement-intake → status update p95 < 4 h | E2E + perf | NFR-4, PERF-3 | Simulated cycle |
| **P0-032** | Feature flag deterministic eval + tenant isolation + replay safety | Unit + Integration | AR-64, CC-15 | Capability bar |
| **P0-033** | AR-48 SSR cache safety: zero PII tokens in SSR HTML for Sahyog Vivran | Unit + E2E | TC-7, AR-48 | Cache-poisoning probe |
| **P0-034** | DPDPA claim-time consent capture (public render / verifier publish / In Memoriam) — no default opt-in | API + Component | UX-DR2, BUS-1 | |
| **P0-035** | Quarterly restore-from-backup drill | Drill (Weekly) | OPS-6, NFR-25 | Manual sign-off |

**Total P0:** ~35 scenarios. **(Scenarios numbered, not "tests" — each may spawn 1–5 individual assertions.)**

---

### P1 (High)

**Criteria:** Important features + Medium risk (3–5) + Common workflows + Workaround exists but difficult.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P1-001** | DigiLocker happy path: photo/name/DoB pulled; state → `verified` | API + E2E | FR-2 | |
| **P1-002** | DigiLocker manual fallback: provider down → `pending-valid` queued | API + E2E | TECH-5, FR-2 | 12 s fallback CTA |
| **P1-003** | Annual renewal grace: death during `active_in_grace` = eligible; during `lapsed_unpaid` = ineligible | Unit + API | FR-1A, BUS-2 | Date-arithmetic property tests |
| **P1-004** | `pending-fee → lock-in` only on UPI Intent + UTR confirm; idempotent on resubmit | API | FR-1 | |
| **P1-005** | Multi-nominee 75/25 split only on R5(E) two-nominee declaration | Unit | FR-4 | Bank/IFSC not at signup |
| **P1-006** | Lock-in clock widget countdown + unlock date | Component (mobile) | FR-3 | |
| **P1-007** | Voluntary withdrawal: ₹110 forfeited, 12-month rejoin lock | API | FR-6 | |
| **P1-008** | Data export ZIP (DPDPA portability) | E2E | BUS-1, FR-95 | |
| **P1-009** | Consent registry per-surface, per-category, revocable | API | BUS-1, FR-97 | |
| **P1-010** | T&C version pinning + member acceptance timestamp | API | FR-94 | |
| **P1-011** | Niyamavali amendment workflow: pariwar_id + version + diff + audit | API + Component | FR-7 | Two-Pariwar divergence asserted |
| **P1-012** | Public Niyamavali render with version diff (Astro SSR) | E2E (web) | FR-79 | axe-core a11y |
| **P1-013** | Rule evaluation audit line: `{member_id, rule_id, version, evaluated_at, outcome, inputs}` | Unit | FR-7, NFR-18 | |
| **P1-014** | R7(A)–R7(G) restoration ladder full coverage matrix | Unit | FR-9 | Table-driven |
| **P1-015** | R8 90 % rule + R8(A) skip + R8(B) mid-contribution death | Unit | FR-10 | |
| **P1-016** | R5/R9 special death rules + State Trustee vote (never auto-deny) | Unit + API | BUS-2, FR-11/43 | |
| **P1-017** | FR-12 retirement coverage on-the-fly compute | Unit | FR-12 | Property-based |
| **P1-018** | Per-cohort cache invalidation w/ conservative fallback | Integration | TECH-12 | Story 4.8 |
| **P1-019** | Member-self vs admin payload parity (minus internal flags) | API | FR-12A | Scope-based redaction |
| **P1-020** | Structured `alert` payload renders identically across channels | Unit + Integration | FR-23, AR-40 | Template parity |
| **P1-021** | FCM + APNs push delivery — 7 categories | Integration | FR-71 | Provider faked |
| **P1-022** | WA Business inbound webhook → opt-in ACTIVE | API + Webhook | FR-72, AR-16, TC-6 | Mockoon/Wiremock |
| **P1-023** | WA suppression when member acted in-app within staleness | API | AR-18 | Time-critical override |
| **P1-024** | SMS DLT-transactional fallback on WA undelivered | Integration | AR-19, TECH-10 | 3 retries × exp backoff |
| **P1-025** | Pariwar-degraded-mode cycle-open SMS bridge | Integration | AR-20 | |
| **P1-026** | Step-up OTP audit-per-send + audit-per-consume tagged w/ operation id | API | ASR-10, NFR-28/29 | TTL 3 min, single-use |
| **P1-027** | Claim case state machine `under_verification → ... → settled` | Unit + API | FR-37 | Property-based |
| **P1-028** | ICP dedup key cross-channel + override semantics | Integration | AR-62 | Member, helpline, admin |
| **P1-029** | OCR parity on death certificate; mismatch → trustee review (no auto-reject) | API | FR-38, BUS-2 | |
| **P1-030** | Peer mesh deterministic 5-nearest: district > block > school > member_id | Unit | FR-39 | Replay |
| **P1-031** | Ground inspection AND peer mesh both pass before State Trustee | API | FR-40 | |
| **P1-032** | Claim-time dual nominee bank w/ IFSC validation | API | FR-31, FR-37 | RBI workaround |
| **P1-033** | Verifier console load < 5 s; no N+1 | API perf | PERF-7, FR-42 | One indexed query |
| **P1-034** | Concealment-flagged claim: engine surfaces trigger, never auto-deny | Unit + API | BUS-2, FR-11 | Story 6.15 |
| **P1-035** | FR-43A 3-stage appeal: Stage-1 reviewer ≠ original decision-maker; SLA | API | FR-43A | Separation-of-duties |
| **P1-036** | Reversed-denial → Sahyog Vivran publish hook | API | FR-43A | |
| **P1-037** | Fixed-amount snapshot at spawn; immutable | Unit | FR-15 | |
| **P1-038** | Fixed-amount setter validator: `effective_from ≥ now + 12 months` | API | BUS-5, FR-15 | Emergency override audit-logged |
| **P1-039** | Pool-bound payment enforcement: wrong-pool → invalid, no refund | API | FR-16 | Facilitated recovery |
| **P1-040** | Idempotent `tr=`: repeated payments ⇒ one valid contribution | Unit | ASR-6, FR-17 | Property-based |
| **P1-041** | Amount-lock at UPI Intent: `am ≠ fixed_amount` rejected | Unit + Integration | FR-18 | |
| **P1-042** | FR-19 close-of-cycle copy template lint | Unit | BUS-3 | Rejected-phrase list |
| **P1-043** | My Pool render < 500 ms p95 on Snapdragon-4 / 3 GB | Mobile perf | NFR-2, PERF-5 | List virtualization |
| **P1-044** | Live contributor list updates on confirmation only | API | FR-24 | First-name + last-initial |
| **P1-045** | Yellow → Green pill flip on `contribution.confirmed` | API | FR-30 | |
| **P1-046** | Contribution Note PDF — never "receipt" | E2E (mobile) | FR-33, BUS-3 | Legal-reviewed |
| **P1-047** | 48 h-after-self-attest-without-match → `mismatch`; screenshot mandatory | Integration | FR-30, FR-32 | Clock-controlled |
| **P1-048** | Mismatch triage queue ordered by alert deadline | API | FR-50 | |
| **P1-049** | Bulk ops dry-run preview parity with actual run | Integration | FR-49 | 5k cap; one audit line per item |
| **P1-050** | Feature flag audit: every change emits tamper-evident line | Integration | AR-64, ASR-5 | |
| **P1-051** | Member moderation transitions w/ reason codes | API | FR-56 | 12-month rejoin lock |
| **P1-052** | 4-tier visibility matrix codified per surface | API | FR-74 | |
| **P1-053** | Member Directory anti-enumeration: `?page=all` rejected | API | FR-91, SEC-7 | |
| **P1-054** | Sahyog Vivran nominee bank fragment hydrates only post-auth | E2E (web) | AR-48, FR-77 | |
| **P1-055** | In Memoriam consent-governed revocable | API | UX-DR2, FR-78 | |
| **P1-056** | `<ContributionListTable>` 50k-row desktop virtualization | Component + perf | UX-DR13, PERF-8 | Real Data Test gate |
| **P1-057** | `<ContributionListMobileRow>` 10k-row 360 px | Component + perf | UX-DR14, PERF-8 | |
| **P1-058** | Module shelf eligibility filter — out-of-eligibility never sees card | API + Component | FR-65, UX-DR1 | |
| **P1-059** | Module Shelf suppressed in account-frozen states | Unit + API | UX-DR1, TC-14 | Story 12.4 |
| **P1-060** | Module lead-handoff transport: partner receives attribution | Integration | FR-65, AR-42 | |
| **P1-061** | 6-digit code generation Pariwar-scoped uniqueness | Unit | FR-81 | |
| **P1-062** | Field worker payment trigger gated on KYC + ₹110 + first valid contribution; TDS §194H | API + Unit | BUS-6, FR-84 | Rate matrix |
| **P1-063** | Anti-fraud throttling: > X/day or > Y devices → trustee flag | Integration | SEC-8, FR-86 | Assistive |
| **P1-064** | Disaster window declaration: alert engine throttling | API | FR-98 | Governance throttling |
| **P1-065** | FR-100 Vyawastha Shulk receipt back-prove query | Integration | DATA-3, FR-100 | Story 14.6 |

**Total P1:** ~65 scenarios.

---

### P2 (Medium)

**Criteria:** Secondary features + Low risk (1–2) + Edge cases + Regression prevention.

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P2-001** | Reference Code parsing: 6-digit / username / empty → `attribution_source` | Unit | FR-82 | |
| **P2-002** | Adopter chain attribution v1 capture (no v1 commission) | API | FR-87 | Phase B v2 |
| **P2-003** | Telegram mirror fire-and-forget — non-canonical | Integration | FR-73 | TSCT-cohort honor |
| **P2-004** | 4-hour retry reminders | Integration | FR-35 | |
| **P2-005** | Over-payment self-report: facilitated, never enforced | API | FR-36 | |
| **P2-006** | Calendar-aware close-of-cycle timing (Bihar holiday windows) | Unit | UX-DR77 | |
| **P2-007** | Out-of-band contribution policy (direct-to-family gifts) | Unit | UX-DR76 | |
| **P2-008** | Honeypot fields + `noindex` on member-detail pages | E2E (web) | FR-92 | |
| **P2-009** | Helpdesk routing policy (category × scope → assignee role) | API | FR-52 | Registry-driven |
| **P2-010** | Helpdesk SLA tracking: first-response 24 h / resolution 5 biz days | API | FR-52 | |
| **P2-011** | Banner/popup manager `valid_from/until` auto-archive | API | FR-58B | |
| **P2-012** | Reports/exports library — scope-respecting; per-export audit | API | FR-58A | Async generation |
| **P2-013** | Trustee-Lite list + signals sorted by stage + deadline | API + Component | FR-57 | FR-42 signals on hover |
| **P2-014** | News/Blog dual surface + author ≠ reviewer | API | FR-51 | Per-post channel selection |
| **P2-015** | Per-Pariwar custom fields JSONB validation | Unit + API | FR-54 | Per-Pariwar JSON Schema |
| **P2-016** | Permission delegation w/ date range + audit | API | FR-48 | |
| **P2-017** | Survey/poll authoring + results dashboard | API + Component | FR-58 | |
| **P2-018** | Disaster-mode member-comms framing lint | Unit | FR-98 | |
| **P2-019** | Module time-bomb auto-archive at `valid_until` or slot exhaustion | Integration | FR-67 | |
| **P2-020** | Friction-budget repo-wide audit | CI (Nightly) | UX-DR3 | Drift detection |
| **P2-021** | Edge-pivot rehearsal in staging (§5.8a) | Drill | SEC-4 | Substitution points |
| **P2-022** | Dokploy live-cycle fallback drill (AR-54) | Drill | OPS-2 | Staging chaos |
| **P2-023** | Visual regression on design system primitives (StatusPill, NoticeboardStrip, PortraitFrame) | Component | UX-DR15/16/21 | Per-state coverage |
| **P2-024** | Hindi numeral / English numeral discipline (no mixed-numeral surfaces) | Component | UX-DR10 | i18n hardening |
| **P2-025** | Step-up OTP voice fallback | Integration | AR-21 | |

**Total P2:** ~25 scenarios.

---

### P3 (Low)

**Criteria:** Nice-to-have + Exploratory + Benchmarks + Documentation validation.

| Test ID | Requirement | Test Level | Notes |
| --- | --- | --- | --- |
| **P3-001** | Exploratory perf: My Pool render under throttled-3G | Mobile perf | Benchmark |
| **P3-002** | Visual regression scaffolding for design system stub tokens | Component | Coverage seed |
| **P3-003** | Lighthouse-CI baseline for public site shell | E2E (web) | Trend dashboard |
| **P3-004** | Documentation validation: ADR backlog (AR-69) closure tracker | Governance | Manual review |
| **P3-005** | Hindi font-fallback rendering on entry-level Android (Tiro Devanagari Hindi absent) | Mobile manual | UX-DR10 hardening |
| **P3-006** | Anti-pattern catch: dashboards reading from transactional tables | CI lint | NFR-19 |
| **P3-007** | Stale visual marker render (UX-DR... grey takeover) | Component | UX system |
| **P3-008** | Test stability dashboard: rolling flake rate | Reporter | DevX |
| **P3-009** | Pact-style consumer contract experiment for Module Marketplace handoff | Contract | Future-readiness |
| **P3-010** | Color contrast on Devanagari at 9 type-role × theme combinations | Component | FM-5 evidence |

**Total P3:** ~10 scenarios.

---

## Execution Strategy

**Philosophy:** Run everything in PRs that can finish in under 15 minutes; defer to nightly only what is genuinely expensive (k6/Artillery at 4L synthetic, chaos with > 60 s clock advances, device-lab mobile matrix); reserve weekly for capacity envelopes + restore drills + fallback drills.

**Organized by TOOL TYPE:**

### Every PR: Vitest + Playwright (~10–15 min)

All functional tests (any priority level):

- Vitest unit (all `packages/*`).
- Vitest component (Testing Library) for admin + public.
- API integration on ephemeral Postgres (testcontainers).
- Playwright smoke E2E: one representative path per app (`apps/public`, `apps/admin`, mobile when P0-5 ratifies).
- Contract tests (Zod-derived) for every endpoint touched in the diff.
- CI gates: TS typecheck, ESLint (incl. i18n inline + Tamagui escape + Tailwind shadow), schema-diff, `benefit_mechanism` tag, PII scrape, friction-budget, migration rehearsal harness.
- Affected-graph scoping via Turborepo to keep PR < 15 min.

**Why PR:** fast feedback; no expensive infrastructure.

### Nightly: Full E2E + adversarial RLS + Chaos + Load proxy (~45–60 min)

- Full Playwright E2E across `apps/public` + `apps/admin` (+ mobile build smoke when ratified).
- axe-core a11y across member-flow surfaces + public Niyamavali + Sahyog.
- ASR-1 RLS adversarial sweep across every RLS-bound table.
- Audit-integrity chaos (P0-005).
- Reconciliation 50-golden-file corpus across 5 banks.
- FR-12A load test against 4L synthetic (capped at p95 acceptance).
- Pool-spawn micro-bench (N=10 / M=100k as nightly proxy for full weekly gate).
- Step-up OTP per-operation matrix.
- Friction-budget repo-wide audit.

**Why nightly:** moderately expensive; not needed for fast PR feedback; catches drift in cross-cutting properties.

### Weekly (release-candidate gate): Capacity + DR + Edge (~3–4 h)

- **Pool-spawn full capacity gate** (N=50, M=4L) — ASR-3; Phase-1 launch gate.
- **End-to-end recon timing** (NFR-4) over a simulated full cycle.
- **Quarterly-on-weekly rotation:** Dokploy live-cycle fallback drill (AR-54), edge-pivot rehearsal (§5.8a), restore-from-backup drill (NFR-25), mobile device-lab matrix (Snapdragon-4 + entry-level Android + iOS min), runbook drill.

**Why weekly:** very expensive, very long-running, infrequent validation sufficient.

### Quarterly: Governance drills

OPS-3 escrow open-close drill, OPS-5 backup-engineer readiness drill, AR-10 IAM isolation attestation, AR-49 Phase-0 gate inventory review. Manual + automated.

### Per-cycle (live): Continuous monitoring

Reconciliation 6×/day cron health, audit-integrity daily check, push-delivery rate per Pariwar, structured-event ingestion SLOs.

**Selective execution:** Turborepo affected-graph for PR; full graph nightly; capacity + production-like weekly. Tags: `@p0 / @p1 / @p2 / @p3`, `@MultiTenant`, `@Security`, `@Performance`, `@A11y`, `@Bilingual`, `@Webhook`, `@Mobile`, `@Quarantine` (must close ≤ 7 days or move to permanent skip with named owner + reason).

**Manual tests** (excluded from automation):

- Per-UPI-app device-lab parity matrix (P0-027).
- Quarterly runbook drill executed by backup engineer.
- External a11y audit (NFR-22 vendor work).
- DevOps validation (deploy, monitoring sanity).
- Documentation validation (ADR backlog tracker).

---

## QA Effort Estimate

QA test development effort only (excludes DevOps, Trustee Panel, Legal, content curation).

| Priority | Count | Effort Range | Notes |
| --- | --- | --- | --- |
| **P0** | ~35 | **~80–120 h** | High setup cost (4L factory, chaos harness, snapshot replay, PII allowlist, UPI builder). |
| **P1** | ~65 | **~60–100 h** | Standard coverage with shared fixtures. |
| **P2** | ~25 | **~25–45 h** | Edge cases; benefits from P0/P1 fixtures. |
| **P3** | ~10 | **~5–10 h** | Exploratory + benchmarks. |
| **Total** | ~135 | **~170–275 h** | **Solo Builder, ~6–10 calendar weeks parallel with implementation post-P0-5 ratify.** |

**Assumptions:**

- Includes design, implementation, debugging, CI integration, tag wiring.
- Excludes ongoing maintenance (~ 10 % effort) and flake triage.
- Assumes test infrastructure (factories, fixtures, mock providers, clock provider) ready early Epic 1.
- Excludes one-time setup that benefits the long run: 4L synthetic data generation (+20–30 h), device-lab procurement + UPI Intent per-app matrix (+10–15 h), 50-golden-file curation per bank (content, not engineering).

**Dependencies from other tracks:**

- See *Dependencies & Test Blockers* for what QA needs from architecture, content, legal, and operations.

---

## Implementation Planning Handoff

| Work Item | Owner | Target Milestone | Dependencies / Notes |
| --- | --- | --- | --- |
| 4L synthetic-member factory | Solo Builder | Epic 1 | Powers ASR-3 + ASR-4 |
| Clock provider abstraction | Solo Builder | Epic 1 (with Story 1.12) | Powers ASR-4, recon transitions |
| Audit chaos harness | Solo Builder | Epic 1 (with Story 1.11a) | ASR-5 |
| PII scrape gate (allowlist + assertion) | Solo Builder | Epic 1 (Story 1.16b) | ASR-8; Phase-1 gate |
| `UPIIntentURL` typed builder | Solo Builder | Pre-Story 7.7 | ASR-6 |
| drizzle rehearsal harness | Solo Builder | Epic 1 (Story 1.2) | TECH-8 |
| Friction-budget CI gate prototype | Solo Builder | Epic 1 (Story 1.16a) | UX-DR3 |
| i18n parity utility | Solo Builder | Story 2.1 | ASR-9; NFR-23 |
| Mock providers (Meta WA, DigiLocker, FCM/APNs, partner module) | Solo Builder | Epic 5 + Epic 12 | TC-6 |
| 50-golden-file/bank corpus | Trustee Panel + Solo Builder | Pre-Story 9.2 | TECH-2 |
| Backup engineer onboarding + runbook drill | Solo Builder + Trustee Panel | Phase-0 gate | OPS-1 |
| Restore-from-backup drill | Solo Builder | Quarterly | OPS-6 |
| External a11y audit (vendor) | Trustee Panel | Pre-Phase 2 | NFR-22 |

---

## Tooling & Access

| Tool / Service | Purpose | Access Required | Status |
| --- | --- | --- | --- |
| Vitest + `fast-check` | Unit / property-based / contract / component | Local + CI | Ready (commit in `_bmad/tea/config.yaml`) |
| Playwright + `@seontechnologies/playwright-utils` | E2E for `apps/public` + `apps/admin` + API black-box | Local + CI matrix | Ready |
| axe-core | WCAG 2.1 AA assertions | CI | Ready |
| Lighthouse-CI | Web cold start + budgets | CI | Ready |
| k6 OSS / Artillery | Load (FR-12A, recon, capacity) | Self-hosted runner | Pending — Weekly-lane runner |
| Detox **or** Maestro | Mobile E2E | Local + CI device emulator | **Blocked on P0-5 ratify** |
| Testcontainers (Postgres) | Ephemeral DB for integration | CI | Ready |
| Mockoon / Wiremock | WA inbound + DigiLocker + partner module + FCM/APNs | Local + CI | Pending |
| GCP staging project | Per-Pariwar isolated env, audit mirror tier | Solo Builder | Owned by Solo Builder |
| Device lab (3 devices: Snapdragon-4 / entry-level Android / iOS min) | Per-UPI-app parity + Devanagari rendering + cold start | Solo Builder | Pending procurement |

Access requests needed:

- [ ] GCP `twt-audit-mirror` project provisioned (per AR-10 IAM Isolation Commitment) — required for ASR-5 chaos test.
- [ ] WhatsApp Business sandbox + template approvals — required for TC-6.
- [ ] DigiLocker provider sandbox (post Trustee Panel registration) — required for TECH-5.
- [ ] Backup engineer GitHub + Dokploy read access — required for OPS-1.

---

## Interworking & Regression

| Service / Component | Impact | Regression Scope | Validation Steps |
| --- | --- | --- | --- |
| **Pool Engine** | All cycle work, FR-12A consumers | Full ASR-2 + ASR-3 + saga + replay suite | Nightly + Weekly capacity gate |
| **Reconciliation pipeline** | Member status, public Sahyog, audit chain | 50 golden files × 5 banks + ASR-7 + E2E timing | PR (corpus) + Nightly + Weekly |
| **RBAC + RLS** | Every API endpoint | ASR-1 adversarial sweep + RBAC truth table | PR (lint) + Nightly (sweep) |
| **Audit log** | Every state transition consumer | Hash-chain property + ASR-5 chaos | Nightly + per-PR on `packages/events` |
| **FR-12A Validity Service** | Every admin surface + member profile | Determinism + latency + freshness | Nightly + Weekly load |
| **UPI Intent dispatch** | Every contribution + Vyawastha Shulk payment | Typed builder property + device-lab matrix | PR (property) + pre-launch checklist |
| **Channel-provider abstraction** | All alert / notification consumers | Provider parity + provider-fault → fallback | Nightly |
| **`packages/contracts` (Zod)** | API client + every endpoint | Contract tests on diff | PR |
| **Per-Pariwar branding bundle** | All build artifacts | Build-artifact diff per Pariwar | CI matrix |

**Regression strategy:**

- Affected-graph in PR (Turborepo); full graph nightly.
- Touching `packages/domain`, `packages/contracts`, `packages/events`, `packages/bank-parsers`, or any `apps/*/modules/(pool|reconciliation|validity|audit|public-pages)/*` automatically expands to the full sweep nightly.
- Cross-team coordination: Solo Builder (engineer + QA) coordinates with Trustee Panel for content / regulatory regression (FR-19 copy, IMA list, T&C); with Legal for DPDPA / consent / T&C regression; with backup engineer for runbook drift.

---

## Appendix A: Code Examples & Tagging

**Playwright Utils profile:** Full UI + API (per `tea_use_playwright_utils: true` and detected fullstack stack).

```typescript
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures';
import { expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

// P0 — Pool assignment determinism (property-based seed)
test('@P0 @Pool @Determinism same (member,cycle) always maps to same pool', async ({ apiRequest }) => {
  const memberId = `m-${faker.string.uuid()}`;
  const cycleId = `c-${faker.string.uuid()}`;

  const { status: s1, body: b1 } = await apiRequest({
    method: 'GET',
    path: `/api/pool-engine/assignment?member=${memberId}&cycle=${cycleId}`,
  });
  const { status: s2, body: b2 } = await apiRequest({
    method: 'GET',
    path: `/api/pool-engine/assignment?member=${memberId}&cycle=${cycleId}`,
  });

  expect(s1).toBe(200);
  expect(s2).toBe(200);
  expect(b1.pool_index).toBe(b2.pool_index);
});

// P0 — PII scrape gate (no Tier-1 token in public HTML)
test('@P0 @Security @PII public Sahyog Vivran shell contains zero Tier-1 PII tokens', async ({
  page,
}) => {
  const TIER1_TOKENS = ['mobile', 'aadhaar', 'dob', 'address', 'account_number', 'ifsc', 'email'];
  await page.goto('/p/bihar/public/sahyog/alert-78/pool-karna');
  const html = (await page.content()).toLowerCase();
  for (const token of TIER1_TOKENS) {
    expect(html).not.toContain(token);
  }
});

// P0 — Step-up OTP audit-per-send AND audit-per-consume tagged with operation id
test('@P0 @Auth @StepUp claim filing requires step-up OTP with audit per send + consume', async ({
  apiRequest,
}) => {
  const operationId = `claim_file-${faker.string.uuid()}`;

  const { status: sendStatus } = await apiRequest({
    method: 'POST',
    path: '/api/auth/step-up/send',
    body: { operation_id: operationId, operation: 'claim_filing' },
  });
  expect(sendStatus).toBe(200);

  const { body: auditAfterSend } = await apiRequest({
    method: 'GET',
    path: `/api/admin/audit?operation_id=${operationId}`,
  });
  expect(auditAfterSend.entries).toContainEqual(
    expect.objectContaining({ kind: 'step_up_otp_sent', operation_id: operationId })
  );

  const { status: consumeStatus } = await apiRequest({
    method: 'POST',
    path: '/api/auth/step-up/consume',
    body: { operation_id: operationId, code: '000000' /* test fixture */ },
  });
  expect(consumeStatus).toBe(200);

  const { body: auditAfterConsume } = await apiRequest({
    method: 'GET',
    path: `/api/admin/audit?operation_id=${operationId}`,
  });
  expect(auditAfterConsume.entries).toContainEqual(
    expect.objectContaining({ kind: 'step_up_otp_consumed', operation_id: operationId })
  );
});

// P1 — Hindi/English i18n parity
test('@P1 @Bilingual every i18n key present in both hi and en', async () => {
  const en = await import('@/packages/i18n/en.json');
  const hi = await import('@/packages/i18n/hi.json');
  const enKeys = Object.keys(en).sort();
  const hiKeys = Object.keys(hi).sort();
  expect(hiKeys).toEqual(enKeys);
});
```

**Run specific tags:**

```bash
# Run only P0 tests
npx playwright test --grep @P0

# Run P0 + P1
npx playwright test --grep "@P0|@P1"

# Run only multi-tenant adversarial tests
npx playwright test --grep @MultiTenant

# Run all in PR (default)
pnpm test
```

---

## Appendix B: Knowledge Base References

- **Risk Governance**: `risk-governance.md` — scoring methodology used in §Risk Assessment.
- **Test Priorities Matrix**: `test-priorities-matrix.md` — P0-P3 criteria used in §Test Coverage Plan.
- **Test Levels Framework**: `test-levels-framework.md` — E2E vs API vs Unit selection.
- **Test Quality**: `test-quality.md` — definition of done (no hard waits, < 300 lines / test file, < 1.5 min / test).
- **Webhook fundamentals + providers**: used for TC-6 WA inbound + DigiLocker provider mocking.
- **Fixture architecture + data factories**: used for 4L synthetic factory + per-bank corpus loaders.

---

**Generated by:** BMad TEA Agent (Master Test Architect)
**Workflow:** `bmad-testarch-test-design`
**Version:** 4.0 (BMad v6)
