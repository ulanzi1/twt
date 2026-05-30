---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-05-29'
mode: 'system-level'
user: 'BigDev'
project: 'TWT'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-05-28.md
  - _bmad-output/planning-artifacts/implementation-readiness-supplement-2026-05-29.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-27.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-addendum-2026-05-29.md
knowledgeFragmentsLoaded:
  - adr-quality-readiness-checklist.md (system-level required)
  - nfr-criteria.md (system-level required)
  - test-levels-framework.md (system-level required)
  - risk-governance.md (system-level required)
  - test-quality.md (system-level required)
  - probability-impact.md (loaded for scoring matrix)
  - test-priorities-matrix.md (loaded for P0/P1 gating)
configFlags:
  test_artifacts: _bmad-output/test-artifacts
  test_design_output: _bmad-output/test-artifacts/test-design
  risk_threshold: p1
  tea_use_playwright_utils: true
  tea_use_pactjs_utils: false
  tea_pact_mcp: none
  tea_browser_automation: auto
  test_stack_type: auto (resolved → frontend+backend = fullstack)
  ci_platform: GitHub Actions (per AR-29)
  test_framework: auto (Vitest + Playwright recommended for this stack)
detectedStack: fullstack
  notes: |
    Greenfield project — no code yet, no tests yet. Inferred from architecture:
    backend (Fastify + TS + Drizzle, Vitest); native mobile (RN + Tamagui via Expo, Jest);
    web admin (Vite + React + TS, Vitest + Playwright); public (Astro 6 SSR, Playwright);
    contract testing (Vitest, no Pact MCP).
playwrightUtilsProfile: full-UI+API (browser surfaces + heavy API; load all core fragments)
---

# TWT — System-Level Test Design (in progress)

## Step 1 — Mode Detection & Prerequisites

**Mode selected:** System-Level Test Design

**Rationale:**

- User explicitly chose System-Level after detection prompt.
- File-based detection corroborates: no `sprint-status.yaml`, no `stories/` directory yet, but PRD + Architecture + Epics are all present.
- Goal: produce system-wide test strategy and per-epic QA docs to anchor downstream story-level work.

**Inputs confirmed available:**

| Input | Path | Status |
| --- | --- | --- |
| PRD | `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` | ✅ present |
| Architecture (incl. ADRs) | `_bmad-output/planning-artifacts/architecture.md` | ✅ present |
| Epics | `_bmad-output/planning-artifacts/epics.md` | ✅ present |
| UX Spec (supporting) | `_bmad-output/planning-artifacts/ux-design-specification.md` | ✅ present |
| Implementation Readiness Report | `_bmad-output/planning-artifacts/implementation-readiness-report-2026-05-28.md` | ✅ present |
| Implementation Readiness Supplement | `_bmad-output/planning-artifacts/implementation-readiness-supplement-2026-05-29.md` | ✅ present |
| Sprint Change Proposal + Addendum | `sprint-change-proposal-2026-05-27.md`, `sprint-change-proposal-addendum-2026-05-29.md` | ✅ present (course corrections noted) |

**Halt conditions:** none triggered.

**Next:** Step 2 — Load Context.

---

## Step 2 — Load Context & Knowledge Base

### Detected Stack

**Type:** `fullstack` (greenfield, no source code yet — inferred from architecture).

| Layer | Stack | Implied test stack |
| --- | --- | --- |
| Backend API | Fastify + TS + Drizzle + Postgres (RLS) | **Vitest** (unit/integration) + **Playwright APIRequest** (API-level black box + journey) |
| Jobs | pg-boss workers (matcher, audit, scheduler) | **Vitest** + replay tests; cron-as-actor harness |
| Native mobile | RN + Tamagui + Expo Router (P0-5 gated) | **Jest** unit, **Detox** or **Maestro** E2E, **Playwright CLI** for non-substrate fixtures |
| Public site | Astro 6 SSR | **Playwright** E2E, **axe-core** a11y, **Lighthouse-CI** budgets |
| Admin/Helpline | Vite + React + TS + Tailwind + Radix | **Vitest + Testing Library** component, **Playwright** E2E |
| Contracts | Zod-derived `packages/contracts` | **vitest** + property-based (`fast-check`); **no Pact MCP** for v1 (single repo) |
| CI | GitHub Actions → Dokploy | Staged jobs (typecheck → unit → integration → E2E → burn-in) |

### Documents Loaded

PRD (1537 lines), Architecture (5125 lines), Epics (4398 lines with 15 epics / ~150 stories), UX Spec, Implementation Readiness Reports, Sprint Change Proposals. All are recent and consistent (last edits 2026-05-29).

### Knowledge Base Fragments (System-Level Required)

- `risk-governance.md` — scoring matrix, gate decision rules.
- `probability-impact.md` — shared scoring scale.
- `test-levels-framework.md` — unit/integration/E2E selection.
- `test-priorities-matrix.md` — P0–P3 criteria.
- `nfr-criteria.md` — security/performance/reliability/maintainability status definitions.
- `test-quality.md` — green criteria, isolation rules, definition-of-done.
- `adr-quality-readiness-checklist.md` — 29-criteria ADR testability audit framework.
- `webhook-risk-guidance.md` (auto-pulled — relevant: nominee-pushed statement intake, WA inbound webhook for opt-in, partner module lead-handoff).
- `data-factories.md`, `fixture-architecture.md`, `network-first.md`, `auth-session.md`, `api-request.md`, `recurse.md`, `selector-resilience.md`, `playwright-cli.md`.

### Context Confirmation — Three Uncompromisable Subsystems (PRD §9.1 / Architecture)

The architecture explicitly elevates these as P0 surfaces. All test design that follows is calibrated to make these defensible *first*:

1. **Pool Engine** — auto-spawn, deterministic balanced assignment (`hash(member_id + cycle_id) mod N`), fixed-amount snapshot, audit-reproducibility, capacity envelope N=50/M=4L < 60s p95.
2. **Reconciliation pipeline** — UTR matcher + nominee daily bank-statement intake + 5-bank parser; idempotent, replayable, monotonic-confirmation invariant.
3. **RBAC + multi-tenant data isolation** — `pariwar_id` first-class everywhere; Postgres RLS; permission keys × scope dimensions; adversarial cross-Pariwar CI test mandatory.

Elevated by architecture as equally catastrophic:

4. **Audit log integrity** — hash-chain + WORM mirror + integrity-check independence from sole-engineer access.
5. **Niyamavali registry + FR-12A Member Validity Service** — deterministic, p95 < 200 ms at 4L, ≤ 60 s cache freshness, full provenance.
6. **UPI Intent dispatch + `tr=` idempotency** — single payment surface; one malformed URL = ₹310 to wrong VPA, no recourse.

### Open Issues to Flag for User

- No project-level `tea/config.yaml` override for `test_framework` or `ci_platform` — both currently `auto`. Recommend explicit commit pre-implementation (Vitest + Playwright + GitHub Actions).
- The repository is currently **empty of code and tests** (greenfield). Test design is therefore a *forward-looking plan*, not a coverage report against an existing baseline.
- No existing `sprint-status.yaml` — epic-level test plans (Phase 4 output) will be authored without per-story `[xs/sm/md/lg]` size hints; story shaping owner = sprint planning when it runs.

**Next:** Step 3 — Risk & Testability Assessment.

---

## Step 3 — Testability Review, Risk Register & NFR Planning

> Scoring convention (`probability-impact.md`): Probability 1=Low / 2=Medium / 3=High; Impact 1=Minor / 2=Significant / 3=Catastrophic; **Risk Score = P × I**. Gates: **≥ 6 = HIGH (P0 mitigation required)**; **4–5 = MEDIUM (P1)**; **≤ 3 = LOW (P2/P3)**. Threshold per project config: `risk_threshold: p1` — any HIGH risk gates Phase 1.

### 3.1 System-Level Testability Review

#### 🚨 Testability Concerns (actionable issues first)

| # | Concern | Why it matters for tests | Required disposition |
| --- | --- | --- | --- |
| **TC-1** | **Pool Engine snapshot format is deferred to ADR** (AR-11 / AR-69). | Replay tests cannot freeze acceptance criteria until the snapshot format + hash-on-snapshot rule is committed. Property-based tests would be authored against a moving target. | **ACTIONABLE — block Story 7.4 acceptance** until AR-11 ADR closes. Snapshot format must include `cycle_id`, member-set hash, fixed_amount, version vector. |
| **TC-2** | **Reconciliation matcher input normalization schema (5-bank common shape) deferred** (AR-69, OQ-2). | Without a frozen normalized record shape `{datetime, amount, sender_name, sender_VPA?, UTR, narration}` plus a canonical dedup key, no integration test can assert idempotent / replay-safe behaviour. | **ACTIONABLE — block Story 9.2 acceptance** on schema ADR. 50 golden files/bank (AR-41) are the regression corpus once schema lands. |
| **TC-3** | **FR-12A observability asymmetry**: admin calls audit-logged, member-self calls not logged. | Reconciliation of "member saw X" vs "admin saw X" requires symmetric provenance; absence of self-call logs prevents staleness/freshness regression detection. | **ACTIONABLE** — add an anonymized self-call counter (no member_id in log; rate + outcome digest only). Document in Story 4.6. |
| **TC-4** | **Cache freshness invariant ≤ 60 s** has no time-as-actor (SIE) test harness commitment. | The invariant is verbally asserted but lacks a deterministic clock provider, so any cache-invalidation test will be timing-flaky. | **ACTIONABLE** — clock provider abstraction lands with Story 1.12 (pg-boss + idempotency); used by Story 4.8 (per-cohort invalidation). |
| **TC-5** | **Pool-spawn capacity envelope (N=50 / M=4L < 60 s p95)** is a measured-validation gate, but no 4L-member synthetic fixture mechanism is committed. | Without a deterministic 4L-member generator + snapshot loader, Story 7.9 cannot execute. | **ACTIONABLE** — 4L synthetic-factory (data factory pattern) lands in Epic 1 alongside RLS adversarial scaffolding. |
| **TC-6** | **WA Business inbound webhook (Sprint Change Item 2)** binds opt-in correctness to provider delivery. | A missed Meta inbound = silent fall-through to SMS fallback; without a provider-side mock, the test cannot prove the dual-gate. | **ACTIONABLE** — Wiremock/Mockoon provider for Meta inbound; webhook-fundamentals + webhook-providers fragments are core for Epic 5. |
| **TC-7** | **AR-48 public SSR + authenticated fragments cache-safety boundary** has no architecture-spec test. | A regression that leaks member-state into SSR shell would be invisible until edge-cached and replayed for another user — a PII incident under SM-C5. | **ACTIONABLE** — snapshot-based assertion that SSR HTML for `Sahyog Vivran` contains zero Tier-1 PII tokens; lands before Story 11a.1. |
| **TC-8** | **drizzle forward-only migrations** without a rehearsal harness leave production-only risk. | A bad migration cannot be reverted, only fixed forward — costly while live. | **ACTIONABLE** — migration rehearsal harness in CI (snapshot DB → migrate → run query suite). Cross-cutting; lands with Story 1.2. |
| **TC-9** | **Audit-integrity-check execution-environment independence (AR-10)** is asserted but the test that proves it has not been named. | If the same credential that can write audit rows can also pass the integrity check, the off-site mirror buys no isolation. | **ACTIONABLE** — chaos test: with sole-engineer credentials, mutate one audit row → integrity check must FAIL within ≤ 24 h. Lands with Story 1.11a. |
| **TC-10** | **UPI Intent canonicalization** is the single most fragile correctness boundary. | One malformed URL = ₹310 to wrong VPA, no recourse; UPI app URL parsing is opaque from server side. | **ACTIONABLE** — typed `UPIIntentURL` builder in `packages/domain`; property-based tests on (`pa`, `am`, `cu`, `tr`, `tn`, `mc`) field invariants; per-UPI-app parity matrix in a manual device-lab checklist (mandatory for Story 7.7 / 8.4). |
| **TC-11** | **P0-5 substrate (RN + Tamagui) is unratified.** | Substrate-conditional engineering — including all mobile E2E test scaffolding — is parked behind the gate. | **FYI** — Phase-0 risk; documented in Story 0.14. Test plan defers mobile E2E framework selection (Detox vs Maestro) to ratify. |
| **TC-12** | **Friction-budget PR CI gate (UX-DR3 / AR-60)** declares a governance contract; no reference implementation. | Without a working gate, every PR ships free friction; UX Stance #2 erodes silently. | **ACTIONABLE** — reference impl prototype before Story 1.16a; gate auto-fails any PR touching `apps/mobile/forms/*` or `apps/admin/forms/*` without a `friction-budget.md` block. |
| **TC-13** | **Bilingual parity (NFR-23) is a launch blocker** but no parity-test harness committed. | A Hindi key missing where English is present = launch-blocking regression; impossible to spot at scale without automation. | **ACTIONABLE** — `packages/i18n` ships with: (a) CI lint (no inline strings outside utility); (b) parity assertion (every key present in both `hi` and `en`). Lands with Story 2.1. |
| **TC-14** | **Account State Machine composition rules are deferred** (PRD §22, arch Gap Analysis). | Module Shelf grief-context suppression (UX-DR1) and FR-65 frozen-state suppression cannot be tested deterministically until the state-table is frozen. | **ACTIONABLE — block Story 12.4 acceptance** on Account State Machine ADR. |
| **TC-15** | **`tea/config.yaml` has `test_framework: auto` and `ci_platform: auto`.** | Auto-detection works only post-bootstrap; lock-in is implicit, not documented. | **ACTIONABLE** — commit explicit values pre-Epic-1: `test_framework: vitest+playwright`, `ci_platform: github-actions`. |

#### ✅ Testability Assessment Summary (what is already strong)

- **Determinism & replay are first-class cross-cutting concerns** (architecture CC-4). Pool Engine assignment, rule-registry evaluation, audit log, and the event log all carry replay-grade provenance by design.
- **`packages/events` enforces event immutability (AR-8)** — corrections emit new events. Reconciliation, audit, and pool-spawn flows are structurally append-only → naturally idempotent.
- **`packages/contracts` (Zod-derived, AR-38) is the single source of truth for API shape**. Generated `packages/api-client/` gives free type-safety on every black-box test.
- **Postgres RLS-enforced multi-tenancy (AR-3)** means isolation tests can be written at the *SQL* layer, not just the app layer — bypass attempts are stopped by the engine.
- **12-factor + secrets-behind-provider-interface (AR-13)** lets every test environment use cheap fakes without touching production-shaped secrets.
- **Channel-provider abstraction (AR-40)** — all alert/notification channels swappable for in-test fakes (FCM, APNs, WA, SMS, Telegram).
- **Audit log hash-chain (FR-47)** provides a *cryptographic* assertion surface; expected `prev_hash` is verifiable.
- **Architecture §5.12 pre-names NFR budgets per subsystem** — acceptance criteria restate, not re-derive.
- **50 golden files/bank (AR-41)** is a built-in regression corpus for bank statement parsers.
- **Per-Pariwar build matrix (AR-29)** lets tenant-isolation be asserted at the build artifact level (no shared production assets).
- **Sprint Change Proposals 2026-05-27 and 2026-05-29 already pull testability into explicit governance** (cache invariant, webhook hardening, AR-48 boundary). Architecture is *aware* of testability cost.

#### Architecturally Significant Requirements (ASRs)

**ACTIONABLE** (each becomes a test plan acceptance gate):

| ID | ASR | Source | Owner story |
| --- | --- | --- | --- |
| **ASR-1** | Cross-Pariwar isolation adversarial CI test (cross-Pariwar read across every RLS-bound table) | Arch CC-1 + AR-3 + FR-59 | Story 1.6 |
| **ASR-2** | Pool Engine determinism — property-based on `hash(member_id, cycle_id) mod N` + full-cycle replay from snapshot | FR-14 + AR-57 | Story 7.4 |
| **ASR-3** | Pool-spawn capacity envelope (N=50, M=4L, < 60 s p95) — measured-validation gate | NFR-7 + FR-20 | Story 7.9 |
| **ASR-4** | FR-12A latency p95 < 200 ms at 4L + cache freshness ≤ 60 s | NFR-5 + NFR-6 | Stories 4.6 + 4.8 |
| **ASR-5** | Audit log hash-chain + off-site mirror integrity check — single mutate detected ≤ 24 h | FR-47 + AR-10 | Stories 1.10 + 1.11a |
| **ASR-6** | UPI Intent canonicalization — typed URL builder + per-UPI-app parity matrix | FR-17 + FR-18 + NFR-3 | Stories 7.7 + 8.4 |
| **ASR-7** | Reconciliation matcher idempotency + monotonic-confirmation invariant | FR-30 + NFR-9 + AR-58 | Story 9.4 |
| **ASR-8** | PII shielding scrape test — public surfaces never expose Tier-1 PII | FR-74 + Arch CC-7 + SM-C5 | Story 1.16b |
| **ASR-9** | Bilingual parity — every i18n key present in both `hi` and `en` | NFR-23 + AR-59 | Story 2.1 |
| **ASR-10** | Step-up OTP audit-per-send + audit-per-consume tagged with operation identifier | AR-24 + NFR-29 | Stories 1.9 + 5.9 |
| **ASR-11** | FR-20 `support_category` + FR-100 `benefit_mechanism` schema-diff CI gate — non-additive guard | Stories 1.16c + 1.16d + 14.4 + 14.5 |
| **ASR-12** | FR-12A determinism — same `member_id` + same `rule_registry_version` ⇒ reproducible payload | FR-12A + AR-57 | Story 4.6 |

**FYI** (operational ASRs, not directly testable by software):

- ASR-F1: P0-5 Native-Stack Validation Experiment must close before substrate-conditional test scaffolding is built (Story 0.14).
- ASR-F2: Trust formation + DPO appointment + 50-golden-file content commitment per bank are operational ASRs.
- ASR-F3: Phase-0 launch-gate inventory (AR-49) — software tests cannot vouch for non-software gates.

---

### 3.2 Risk Register

> Each row is a *risk* (uncertainty that could harm a defined outcome), not a feature. Mitigation column points to either an architectural commitment, an in-flight epic/story, or a new test obligation surfaced by this plan.

#### TECH — correctness, determinism, replay (13 entries)

| ID | Risk | P | I | Score | Tier | Mitigation |
| --- | --- | :-: | :-: | :-: | :-: | --- |
| **TECH-1** | Reconciliation matcher silently mismatches → wrong member status, eroded SM-5 ≥ 95 %. | 2 | 3 | **6** | **HIGH** | Conservative `mismatch` flag (FR-30); screenshot fallback (FR-32); manual queue (FR-50). **Test:** ASR-7 idempotency + replay; 50 golden files/bank corpus. |
| **TECH-2** | Bank statement parser drift across 5-bank allowlist. | 3 | 2 | **6** | **HIGH** | 50 golden files/bank (AR-41); parser shipping schedule gates Phase 2 (AR-55). **Test:** per-bank corpus regression on every PR touching `packages/bank-parsers/`. |
| **TECH-3** | FR-12A validity service non-determinism under cache-eviction race. | 2 | 3 | **6** | **HIGH** | Cache freshness invariant ≤ 60 s with conservative all-members fallback (arch §1.10). **Test:** ASR-4 + ASR-12. |
| **TECH-4** | Pool-spawn capacity envelope (NFR-7) breach at 4L launch milestone. | 2 | 3 | **6** | **HIGH** | Saga decomposition + measured-validation gate (Story 7.9). **Test:** ASR-3. |
| **TECH-5** | DigiLocker signature verification breaks on provider key rotation or fallback misuse. | 2 | 3 | **6** | **HIGH** | Provider interface (FR-2, AR-43); manual fallback baseline; FR-58C-gated mandatory switch. **Test:** key-rotation chaos + manual-fallback parity. |
| **TECH-6** | RN + Tamagui substrate fails P0-5 ratify → blocks all mobile dev. | 2 | 3 | **6** | **HIGH** | Phase-0 prototype + tiered escalation (FM-2). **Test:** Story 0.14 acceptance becomes the gate. |
| **TECH-7** | pg-boss queue partitioning incorrect → pool-spawn race or skipped cycle. | 2 | 2 | 4 | MED | Class-A queue + per-cycle partition (AR-5 + §5.11). **Test:** worker-pool sizing test + saturation test. |
| **TECH-8** | drizzle forward-only migration corrupts prod under partial deploy. | 2 | 3 | **6** | **HIGH** | Forward-only migrations + rehearsal harness (TC-8). **Test:** snapshot → migrate → query-suite gate in CI. |
| **TECH-9** | Audit log hash-chain break under concurrent writes / out-of-order persistence. | 1 | 3 | 3 | LOW | Async write + ≤ 1 min budget (NFR-10) + daily integrity check. **Test:** ASR-5 + concurrency stress. |
| **TECH-10** | WA Business template suspension or throttle mid-cycle. | 2 | 2 | 4 | MED | Channel-provider abstraction (AR-40); SMS transactional fallback (AR-19). **Test:** provider-fault injection → fallback path. |
| **TECH-11** | Pool assignment imbalance at small N (M < 10×N). | 1 | 2 | 2 | LOW | Property-based test asserts pool sizes differ ≤ 1 (FR-14). Already covered by ASR-2. |
| **TECH-12** | FR-12A cache freshness invariant breach (> 60 s drift) under cohort-scoped invalidation. | 2 | 3 | **6** | **HIGH** | Conservative all-members fallback when scope confidence insufficient. **Test:** ASR-4 freshness + chaos. |
| **TECH-13** | Pool snapshot retention misaligned with 7-y audit retention. | 2 | 2 | 4 | MED | Snapshot + audit retention alignment per AR-9 + AR-11. **Test:** retention-policy assertion in CI. |

#### SEC — security, RBAC, PII, auth (11 entries)

| ID | Risk | P | I | Score | Tier | Mitigation |
| --- | --- | :-: | :-: | :-: | :-: | --- |
| **SEC-1** | Cross-Pariwar data leak via RBAC or RLS bug. | 1 | 3 | 3 | LOW | RLS + pariwar_id + adversarial CI test (FR-59). **Test:** ASR-1 — already mandatory per arch. |
| **SEC-2** | PII leak from public surfaces (FR-74 scrape test gap). | 2 | 3 | **6** | **HIGH** | CI scrape test (CC-7 + Story 1.16b). **Test:** ASR-8 + AR-48 cache-safety boundary assertion. |
| **SEC-3** | Sole-engineer credential compromise → audit log tamper. | 2 | 3 | **6** | **HIGH** | IAM isolation (AR-10, §2.10a) + integrity check independence. **Test:** ASR-5 chaos test (TC-9). |
| **SEC-4** | Cloudflare DPDPA-incompatibility ruling mid-flight → forced pivot. | 2 | 2 | 4 | MED | Capability bar (§5.8a) + named substitution points. **Test:** edge-pivot rehearsal in staging. |
| **SEC-5** | UPI Intent malformed URL → ₹310 to wrong VPA. | 1 | 3 | 3 | LOW | Typed builder + property-based tests (ASR-6). |
| **SEC-6** | Step-up OTP bypass via session theft on shared device. | 1 | 3 | 3 | LOW | TTL 3 min + single-use + audit-per-consume (AR-24, NFR-29). **Test:** ASR-10. |
| **SEC-7** | Honeypot / anti-bot bypass → mass enumeration of Member Directory. | 2 | 2 | 4 | MED | Forced pagination + login wall + Turnstile (FR-89, 91). **Test:** scrape simulation harness in CI. |
| **SEC-8** | Field-worker code abuse (fraud rings). | 2 | 2 | 4 | MED | Anti-fraud throttling (FR-86); qualified-acquisition gate (FR-84). **Test:** rate-limit + cohort-anomaly assertion. |
| **SEC-9** | Audit-integrity-check executable with mutate-capable credential. | 2 | 3 | **6** | **HIGH** | IAM Isolation Commitment §2.10a. **Test:** TC-9 chaos. |
| **SEC-10** | PII Tier-1 envelope-key compromise or Tink misuse. | 1 | 3 | 3 | LOW | Cloud KMS HSM + Tink library (AR-12). **Test:** key-handling lint + KMS access-log assertion. |
| **SEC-11** | Webhook ingress signature spoof (WA inbound, partner module). | 2 | 2 | 4 | MED | Persist + ack + signature verify (AR-44). **Test:** webhook-fundamentals fragment + adversarial signature tests. |

#### PERF — latency, throughput, frame budgets (8 entries)

| ID | Risk | P | I | Score | Tier | Mitigation |
| --- | --- | :-: | :-: | :-: | :-: | --- |
| **PERF-1** | Pool spawn > 60 s at NFR-7 envelope. | 2 | 3 | **6** | **HIGH** | Saga decomposition + measured-validation gate (Story 7.9). **Test:** ASR-3. |
| **PERF-2** | FR-12A > 200 ms p95 at 4L. | 2 | 2 | 4 | MED | Compound read model + per-cohort invalidation (AR-65). **Test:** ASR-4 load test. |
| **PERF-3** | Reconciliation > 4 h p95 during live alerts. | 2 | 2 | 4 | MED | 6×/day cron + idempotent matcher (FR-30). **Test:** end-to-end timing assertion under simulated cycle. |
| **PERF-4** | UPI Intent launch > 1 s p95. | 2 | 2 | 4 | MED | Client-side measurement; pre-fill avoids server roundtrip. **Test:** mobile perf budget per Story 8.4. |
| **PERF-5** | My Pool render > 500 ms p95. | 2 | 2 | 4 | MED | List virtualization (UX-DR13/14). **Test:** mobile perf budget per Story 8.2. |
| **PERF-6** | Cold start > 3 s on Snapdragon-4 / 3 GB Android. | 2 | 2 | 4 | MED | Bundle size budget + lazy load. **Test:** Lighthouse-CI for web; Detox/Maestro startup measure for mobile (gated on P0-5). |
| **PERF-7** | Verifier console > 5 s load — N+1 regression. | 2 | 2 | 4 | MED | Compound read model + denormalized store (FR-42 + AR-65). **Test:** N+1 detection lint + assertion. |
| **PERF-8** | 50k-row contribution list (UX-DR13) drops below 30 fps. | 2 | 1 | 2 | LOW | Virtualization contract (10k mobile / 50k desktop). **Test:** Real Data Test gate (Story 11b.8). |

#### DATA — residency, retention, integrity (6 entries)

| ID | Risk | P | I | Score | Tier | Mitigation |
| --- | --- | :-: | :-: | :-: | :-: | --- |
| **DATA-1** | PII stored outside `asia-south1` via misconfigured fallback. | 1 | 3 | 3 | LOW | Architecture-spec test: every storage primitive declares region (AR-27). **Test:** infra-policy assertion in CI. |
| **DATA-2** | Audit log WORM Bucket Lock lapses / Object Retention misconfigured. | 1 | 3 | 3 | LOW | Object Retention Lock (AR-9). **Test:** retention-policy CI assertion + quarterly attestation. |
| **DATA-3** | Vyawastha Shulk receipt deleted via RTBF (OQ-17 unresolved). | 2 | 2 | 4 | MED | FR-100 forward-compat hooks; OQ-17 owner Trustee Panel + DPO. **Test:** back-prove query CI gate (Story 14.6). |
| **DATA-4** | drizzle forward-only migration corrupts prod under partial deploy. | 2 | 3 | **6** | **HIGH** | Rehearsal harness (TC-8). Same root cause as TECH-8 — surfaced under DATA for retention/integrity lens. |
| **DATA-5** | Event log mutated (corrections by mutation, not new events). | 1 | 3 | 3 | LOW | `packages/events` enforces immutability (AR-8). **Test:** ESLint rule + DB-trigger assertion. |
| **DATA-6** | Member-state derivation drifts from event-history truth. | 2 | 3 | **6** | **HIGH** | Architecture §1.14 source-of-truth principle: persisted state = optimization only. **Test:** replay-from-events vs current-state diff assertion (deterministic). |

#### BUS — compliance, regulatory, reputation (9 entries)

| ID | Risk | P | I | Score | Tier | Mitigation |
| --- | --- | :-: | :-: | :-: | :-: | --- |
| **BUS-1** | DPDPA Data Fiduciary non-compliance at launch. | 2 | 3 | **6** | **HIGH** | OQ-16 + FR-95/96/97/99. **Test:** consent registry + RTBF + export ZIP CI checks. |
| **BUS-2** | Concealment-penalty (FR-11) regression auto-denies a legitimate claim. | 2 | 3 | **6** | **HIGH** | Rule-engine flags for State Trustee — never auto-denial. **Test:** Story 4.4 + 6.15 (engine must surface trigger, never act unilaterally). |
| **BUS-3** | FR-19 close-of-cycle copy framing violates "celebrate actual outcome" rule. | 2 | 2 | 4 | MED | Template-driven copy + tone-guide owner review. **Test:** template lint against rejected-phrase list. |
| **BUS-4** | Cross-Pariwar branding/copy bleed (logo, color, copy). | 1 | 2 | 2 | LOW | Per-Pariwar bundle (FR-60). **Test:** build artifact diff per Pariwar; no shared assets. |
| **BUS-5** | Trustee fixed-amount setter violates 12-month notice (FR-15). | 1 | 3 | 3 | LOW | Effective_from validator: must be ≥ now + 12 months. **Test:** validation assertion + emergency-override audit. |
| **BUS-6** | TDS §194H deduction wrong on field-worker payouts. | 2 | 2 | 4 | MED | Per-payment deduction logic. **Test:** rate matrix per fiscal year + golden-file test on payouts (Story 13.5). |
| **BUS-7** | SM-C5 (PII exposure incident, hard zero) breached at launch. | 1 | 3 | 3 | LOW | Multiple defenses (FR-74, CC-7, AR-48). **Test:** ASR-8 — failure of this test blocks Phase 1. |
| **BUS-8** | Hindi/English Niyamavali parity drifts post-publish (NFR-23). | 2 | 3 | **6** | **HIGH** | Bilingual parity gate (ASR-9). **Test:** parity assertion on every Niyamavali publish (Story 2.4). |
| **BUS-9** | Reconciliation chases nominee for one missing UTR → bad public Sahyog narrative. | 2 | 2 | 4 | MED | Screenshot fallback (FR-32) + manual review queue (FR-50). **Test:** UX-driven E2E asserting graceful mismatch path. |

#### OPS — bus factor, deploy, runbook (8 entries)

| ID | Risk | P | I | Score | Tier | Mitigation |
| --- | --- | :-: | :-: | :-: | :-: | --- |
| **OPS-1** | Sole-engineer unavailable > 7 days during live cycle. | 2 | 3 | **6** | **HIGH** | §9.1.1 Phase-0 prerequisites (runbooks, escrow, backup engineer). **Test:** runbook drill — backup engineer executes deploy + rollback + matcher manual-intervention from runbooks alone. |
| **OPS-2** | Dokploy outage Day 12–15 of a cycle. | 2 | 3 | **6** | **HIGH** | Live-cycle fallback path (AR-54 + §5.10). **Test:** Dokploy-down chaos drill in staging. |
| **OPS-3** | Credential escrow fails to open under quorum. | 1 | 3 | 3 | LOW | Sealed escrow with ≥ 2 trustees (Story 0.2). **Test:** quarterly opening drill + attestation. |
| **OPS-4** | pg-boss queue saturation during cycle spawn. | 2 | 2 | 4 | MED | Class-A queue + worker pool sizing (AR-5, §5.11). **Test:** ASR-3 + queue-depth assertion. |
| **OPS-5** | Backup engineer not on call when needed. | 2 | 2 | 4 | MED | Retainer + read access (A-13). **Test:** quarterly readiness drill. |
| **OPS-6** | Daily backup verification skipped — restore fails on Q3 test. | 2 | 3 | **6** | **HIGH** | NFR-25 daily backups + quarterly restore. **Test:** restore-from-backup drill + assertion in CI. |
| **OPS-7** | Audit-integrity-check job silently fails. | 2 | 3 | **6** | **HIGH** | Daily integrity check + alert on failure. **Test:** alerting harness + canary fault. |
| **OPS-8** | Runbook drift — architecture evolves; runbook stale. | 2 | 2 | 4 | MED | Runbook inventory (§5.15 + AR-35). **Test:** runbook-as-code drill cadence; quarterly review. |

#### Risk Register Summary

- **Total risks identified:** 55 (TECH 13, SEC 11, PERF 8, DATA 6, BUS 9, OPS 8).
- **HIGH (score ≥ 6):** 19 risks. **MEDIUM (4–5):** 21 risks. **LOW (≤ 3):** 15 risks.
- **`risk_threshold: p1` ⇒ every HIGH risk must have a named mitigation + a Phase-1 acceptance gate**. All 19 HIGHs have one.
- **Top 5 by leverage** (single test investment, multiple risks burned down):
  1. **ASR-7 reconciliation idempotency replay** → burns TECH-1, TECH-2, DATA-6.
  2. **ASR-3 pool-spawn capacity gate** → burns TECH-4, PERF-1, OPS-4.
  3. **ASR-5 audit-integrity chaos** → burns TECH-9, SEC-3, SEC-9, OPS-7.
  4. **ASR-8 PII scrape test** → burns SEC-2, BUS-7, and AR-48 cache-safety boundary.
  5. **ASR-1 cross-Pariwar adversarial test** → burns SEC-1 (the architecture's single most uncompromisable correctness assertion).

---

### 3.3 NFR Planning Assessment

> Boundary: this workflow *plans* NFR validation. Final PASS/CONCERNS/FAIL belongs to `bmad-testarch-nfr` after implementation evidence exists.

#### Performance NFRs

| NFR | Threshold | Source | Evidence path |
| --- | --- | --- | --- |
| NFR-1 Cold start | < 3 s on Snapdragon-4 / 3 GB Android | PRD §8 | Detox/Maestro startup measure on device-lab matrix (P0-5-gated) + Lighthouse-CI for web shell |
| NFR-2 My Pool render | < 500 ms p95 | PRD §8 | Mobile perf trace per Story 8.2; Vitest perf assertion in CI on virtualized list component |
| NFR-3 UPI Intent launch | < 1 s p95 | PRD §8 | Mobile perf trace per Story 8.4; client-side measurement → push to metrics |
| NFR-4 Reconciliation latency | < 4 h p95 during live alerts | PRD §8 | End-to-end timing assertion in simulated cycle; structured event timing |
| NFR-5 FR-12A latency | < 200 ms p95 at 4L | FR-12A + Arch §5.12 | Load test with 4L synthetic factory; per-endpoint p95 budget |
| NFR-6 FR-12A cache freshness | ≤ 60 s | FR-12A + Arch §1.10 | Chaos test: Niyamavali amendment → assert all-members read flips within 60 s |
| NFR-7 Pool spawn | < 60 s p95 at N=50 / M=4L | FR-20 + Arch §5.11 | Story 7.9 measured-validation gate; ASR-3 |
| NFR-8 Admin UI on mid-Android (≤ 720p) | most admin actions doable on mobile | PRD §8 | Manual device-lab matrix + Playwright mobile-viewport E2E |
| NFR-9 Matcher idempotent & replayable | no false confirmations | PRD §8 | ASR-7 replay test; monotonic-confirmation invariant |
| NFR-10 Audit log async write delay | ≤ 1 min | PRD §8 | Structured event timing + alert on > 1 min |

#### Reliability NFRs

| NFR | Threshold | Source | Evidence path |
| --- | --- | --- | --- |
| NFR-11 Availability | ≥ 99.5 % member; ≥ 99 % admin (monthly) | PRD §8 | Synthetic uptime probe + SLO dashboard (observability stack ADR pending) |
| NFR-12 Pool spawn atomic | atomic with retry | PRD §8 | Saga test: parent-job failure mid-N-spawn → resumable + idempotent |
| NFR-13 Audit log integrity | no post-write tampering | PRD §8 + FR-47 | ASR-5 chaos; daily integrity check; off-site mirror diff |

#### Security NFRs

| NFR | Threshold | Source | Evidence path |
| --- | --- | --- | --- |
| NFR-14 PII at rest | AES-256 envelope (Tink + Cloud KMS HSM) | Arch §2.7 | KMS-access-log assertion; Tink usage lint; encrypted-at-rest gate |
| NFR-15 In-transit | TLS 1.3+ pinned at edge / internal / external hop classes | Arch §2.7a | Cert-policy CI lint + TLS handshake assertion on every external probe |
| NFR-16 Cross-tenant isolation | adversarial test; any leak = P0 | Arch CC-1 | ASR-1 — adversarial CI test on every RLS-bound table |
| NFR-17 Cloudflare front | per FR-88 + §5.8a | Arch §4.13 | Edge-config policy CI; substitution points enumerated (§5.8a) |
| NFR-28 OTP delivery | login OTP TTL 5 min; step-up TTL 3 min; one-time | Epics §NFR-28 | Audit-per-send + audit-per-consume (ASR-10) |
| NFR-29 Session model | refresh 90 d; max 2 trusted devices; step-up for high-trust ops | Epics §NFR-29 | Per-operation step-up matrix asserted in test |

#### Observability NFRs

| NFR | Threshold | Source | Evidence path |
| --- | --- | --- | --- |
| NFR-18 Structured event per state transition | every member/alert/claim/recon transition | PRD §8 | `packages/events` lint: every state-machine transition emits event |
| NFR-19 Trustee dashboards on events | dashboards = event consumers | PRD §8 | Dashboard query points only at `packages/events`; lint forbids dashboard reads from transactional tables |

#### Accessibility NFRs

| NFR | Threshold | Source | Evidence path |
| --- | --- | --- | --- |
| NFR-20 WCAG 2.1 AA — launch blocker | member-app primary flows + public Niyamavali/Sahyog | PRD §8 | axe-core assertion in CI on every member-flow surface; pre-launch audit (NFR-22) |
| NFR-21 Devanagari parity with English | same affordances + scalable sizing | PRD §8 | FM-5 Devanagari-aware contrast validation; render test on three test devices |
| NFR-22 Pre-launch accessibility audit | gates Phase 2 | PRD §8 | External audit deliverable + remediation closure log |

#### Localization & Data Residency NFRs

| NFR | Threshold | Source | Evidence path |
| --- | --- | --- | --- |
| NFR-23 Niyamavali Hindi/English parity | launch blocker | PRD §8 | ASR-9 i18n parity assertion |
| NFR-24 PII stored in India | GCP `asia-south1` | PRD §8 | Infra-policy CI: every storage primitive declares region |

#### Backup, DR & Operations NFRs

| NFR | Threshold | Source | Evidence path |
| --- | --- | --- | --- |
| NFR-25 Daily backups; quarterly restore | drill + log | PRD §8 | Backup-job assertion; quarterly restore drill; OPS-6 mitigation |
| NFR-26 Audit log 7-y retention | separately archived | PRD §8 + FR-47 | Retention-policy CI; off-site mirror integrity check |
| NFR-27 DigiLocker latency | 8 s p95; fallback CTA after 12 s | PRD §8 (FR-6 nfrs) | Provider-fault injection + UX-timer assertion |

#### NFR Gaps & UNKNOWNs

The following thresholds are **declared but not yet quantitatively bounded** in the source documents. Each is escalated into the risk register or flagged as a clarification item — **no values are guessed**.

| Gap | Where it should live | Disposition |
| --- | --- | --- |
| **RTO / RPO** for production DB and audit log | architecture §5.7 marks "deferred" | **Clarification item** → owner: Solo Builder; resolve before Phase 1; tracked as Operations-policy ADR. |
| **Push notification reliability target** (FR-71 primary delivery) | partial in UX-DR6 (P0-5 gate: ≥ 95 % / p95 ≤ 5 s for prototype) — not committed for production | **Clarification item** → owner: Solo Builder; needs PRD note or ADR. Currently fits under TECH-10 (channel resilience). |
| **Helpdesk SLA throughput** under degraded mode | FR-52 says first-response 24 h / resolution 5 biz days but no concurrent-ticket capacity bound | **Clarification item** → resolved by operational policy (trust staff hiring plan OQ-15). Not blocking launch; escalated to **OPS-8** (runbook drift). |
| **DigiLocker downtime tolerance window** (above 8 s p95) | NFR-27 covers latency, not duration | **Clarification item** → owner: Solo Builder; surfaces in SEC/PERF — currently covered by TECH-5 mitigation (manual fallback). |
| **WhatsApp template approval / throughput tier** | AR-53 references but no committed throughput threshold | **Clarification item** → operational policy + commercial; defer to first-cycle observation; covered by TECH-10. |
| **50k-row desktop FPS floor** for `<ContributionListTable>` | UX-DR13 commits virtualization contract but not the FPS floor | **Clarification item** — under PERF-8 (LOW); resolve in design system Phase 1. |
| **Audit log write delay alert threshold** | NFR-10 ≤ 1 min, but no alert SLO | **Clarification item** → bake into observability stack ADR. |
| **DPDPA Data Fiduciary registration threshold** that triggers DPO appointment | FR-99 says "MeitY threshold" without numeric trigger | **Clarification item** → owner: Legal counsel (OQ-7). Currently BUS-1 mitigation. |

**Net:** 8 NFR clarification items, none blocking immediate test design. All are tracked back into the appropriate risk row or operational policy owner.

---

### 3.4 Summary

- **The architecture is *unusually* test-friendly for a greenfield project of this stakes.** Determinism, replay, event immutability, RLS-enforced isolation, and a typed contract surface are committed up front. The testability concerns are concentrated in **deferred ADRs (TC-1, TC-2, TC-14)** and **un-prototyped test infrastructure (TC-4, TC-5, TC-6, TC-8, TC-9, TC-12, TC-13)** — both fixable inside Epic 1.
- **19 HIGH-tier risks** dominate the design surface. All 19 are reachable by the 12 ACTIONABLE ASRs; **5 ASRs alone (ASR-1, 3, 5, 7, 8) cover 14 of 19 HIGHs** — these are the leverage points and must be Phase-1 gating.
- **The risk profile is *correctness, integrity, and bus-factor heavy* — not feature heavy.** That matches the PRD's discipline-over-cleverness posture: the test plan's job is to prove the math, not catch the features.
- **NFR planning is well-bounded** — only 8 UNKNOWN values, all referrable to a named owner. None block test design.
- **Next:** Step 4 will translate this into a per-layer coverage plan and a per-epic test-design artifact map.

---

## Step 4 — Coverage Plan & Execution Strategy

> Level guidance per `test-levels-framework.md`: **Unit** for pure logic, **Component** for UI in isolation, **API** (incl. contract) for service boundaries, **E2E** sparingly for full journeys. Priorities per `test-priorities-matrix.md`: P0 blocking + high risk + no workaround; P1 critical path; P2 secondary; P3 nice-to-have / benchmarks.

### 4.1 Coverage Matrix (per-epic, risk-anchored)

Each row in the per-epic tables is an *atomic test scenario* — not a feature. Scenarios are deduplicated across levels: a property tested at Unit is not re-tested at API unless the contract layer adds new failure modes. P0/P1 columns also list **the risk(s) and ASR(s) burned down**, so leverage is visible.

#### Epic 0 — Phase-0 Operational Continuity & Launch Gates `[15 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| Runbook drill: backup engineer executes deploy + rollback + matcher manual-intervention from runbooks alone | Manual | P0 | OPS-1, OPS-5, OPS-8 | Quarterly cadence; sign-off required pre-Phase-1 |
| Credential escrow open-and-close drill (2-trustee quorum) | Manual | P0 | OPS-3 | Annual cadence |
| Code-escrow mirror integrity check (release-branch auto-mirror) | API | P1 | OPS-1 | Mirror diff assertion in CI |
| Restore-from-backup drill (NFR-25 quarterly) | API | P0 | OPS-6 | Automation gates CI; manual sign-off on prod restore drill |
| P0-1 fallback-handler ledger publication + on-rota SLA evidence | Manual | P0 | OPS-1, UX-DR4 | Phase-1 launch gate |
| P0-2 empathy interview record (Reena/Sushil/Vikram/bereaved-family) | Manual | P0 | UX-DR5 | Phase-1 launch gate |
| P0-5 Native-stack validation prototype results — pass P1–P6 criteria | Manual + Component | P0 | TECH-6, ASR-F1 | Substrate ratify gate |

#### Epic 1 — Platform Foundation, Multi-Tenancy, RBAC & Audit `[~20 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| Cross-Pariwar adversarial read (every RLS-bound table — automated enumeration) | Integration (SQL) | P0 | SEC-1, ASR-1 | Failure ⇒ Phase-1 block |
| RLS policy lint: every multi-tenant table has `pariwar_id` NOT NULL + RLS policy | Unit (schema) | P0 | SEC-1, NFR-16 | CI gate on every migration |
| RBAC `has_permission(user, key, target)` matrix — full permission × scope × role enumeration | Unit | P0 | SEC-1, FR-44, FR-45 | Truth table seeded per FR-46 12-role set |
| Audit log hash-chain — append → compute `prev_hash` chain → assert continuity under concurrent writes | Unit | P0 | TECH-9, ASR-5 | Property-based; concurrency stress |
| Audit-integrity check chaos — sole-engineer mutates a row → integrity check FAILS ≤ 24 h | Integration | P0 | SEC-3, SEC-9, OPS-7, ASR-5 | Burns 4 HIGH risks in one harness |
| Audit off-site mirror 6 h replication diff | API | P0 | SEC-9, DATA-2, ASR-5 | Mirror-write IAM in separate GCP project |
| Migration rehearsal harness — snapshot → migrate → query-suite assertion | Integration | P0 | TECH-8, DATA-4 | CI gate on every drizzle migration |
| pg-boss idempotency keyed store — re-enqueue same key ⇒ single execution | Unit | P0 | AR-58 | Property-based |
| Admin auth: email/password + WebAuthn passkey + step-up OTP — per-operation step-up matrix | API + Component | P0 | NFR-29, ASR-10 | Audit-per-send + audit-per-consume asserted |
| Cloud KMS HSM + Tink envelope encryption — Tier-1 PII round-trip; KMS-access-log emitted | Integration | P0 | NFR-14, SEC-10 | Per-row DEK |
| Cloudflare + Turnstile happy-path + bot-fail path | E2E (web) | P1 | SEC-7, NFR-17 | Substitution-point readiness for §5.8a pivot |
| Rate-limit enforcement (auth, write, search endpoints) | API | P1 | FR-89, SEC-7 | Per-endpoint per-IP budget |
| Friction-budget CI gate prototype (UX-DR3) | CI | P1 | TC-12 | Auto-fail PR touching `apps/*/forms/*` without budget block |
| PII scrape CI gate (FR-74) — public surfaces never expose Tier-1 tokens | API + E2E | P0 | SEC-2, BUS-7, SM-C5, ASR-8 | Snapshot HTML against allowlist |
| Schema-diff CI gate (FR-100 non-add guard) | CI | P1 | ASR-11 | v1 tables cannot grow columns for trust-paid benefits |
| `benefit_mechanism` tag CI gate (every rule entry tagged `pool` or `reserve`) | CI | P1 | ASR-11 | |
| Design system token sync CI gate (FM-4) | CI | P2 | TC-15 | Web + native token parity |

#### Epic 2 — Niyamavali Publishing & Public Trust Identity `[~7 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| i18n parity assertion — every key present in `hi` and `en` | Unit | P0 | NFR-23, BUS-8, ASR-9 | Launch-blocker NFR |
| i18n inline-string lint — no formatting outside `packages/i18n` | CI | P0 | AR-59, BUS-8 | |
| Niyamavali amendment workflow — `pariwar_id`, version, effective date, diff produced, audit logged | API + Component | P0 | FR-7 | Includes "two simultaneous Pariwars, divergent rule sets" assertion |
| Public Niyamavali render with version diff (Astro SSR) | E2E (web) | P1 | FR-79 | axe-core a11y assertion |
| Consent registry — per-surface, per-category, revocable | API | P0 | BUS-1, FR-97 | DPDPA compliance |
| T&C version pinning — member acceptance timestamp persisted | API | P1 | FR-94 | Audit-recoverable across versions |

#### Epic 3 — Member Identity & Lifecycle `[~12 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| Member lifecycle state machine — every transition emits event with `from_state/to_state/trigger/actor/timestamp/pariwar_id` | Unit | P0 | NFR-18, AR-14 | Property-based on transition table |
| `pending-fee → lock-in` only on successful UPI Intent + UTR confirm | API | P0 | FR-1 | Idempotent on UTR resubmission |
| Annual renewal grace state machine — death during `active_in_grace` = eligible; during `lapsed_unpaid` = ineligible | Unit + API | P0 | FR-1A, BUS-2 | Date-arithmetic property tests |
| DigiLocker happy path: photo/name/DoB pulled; state → `verified` | API + E2E | P0 | FR-2 | Provider-fault tolerance test |
| DigiLocker manual fallback — provider down → `pending-valid` queued for trustee | API + E2E | P0 | TECH-5, FR-2 | Includes 12 s fallback CTA |
| DigiLocker key rotation chaos — signature verify fails on stale key → fails closed, never opens | Integration | P0 | TECH-5, SEC-10 | |
| Multi-nominee 75/25 split — only on R5(E) two-nominee declaration | Unit | P1 | FR-4 | Bank/IFSC NOT collected at signup |
| Lock-in clock widget — countdown + unlock date from `lock_in_days_at_join` snapshot | Component (mobile) | P1 | FR-3 | Transitions to My Pool on expiry |
| Medical disclosure ack + audit-log + concealment-penalty wiring | API | P0 | BUS-2, FR-5, FR-11 | Never auto-deny — flags only |
| Voluntary withdrawal — ₹110 forfeited, 12-month rejoin lock | API | P1 | FR-6 | RTBF is a distinct path |
| DPDPA RTBF soft-delete + anonymization | API | P0 | BUS-1, FR-96, DATA-3 | Audit log NOT anonymized |
| Data export ZIP (DPDPA portability) | E2E | P1 | BUS-1, FR-95 | Profile + history + Contribution Notes |

#### Epic 4 — Niyamavali Rules Engine & Validity Service `[8 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| Rule evaluation engine — eligibility check writes audit line `{member_id, rule_id, version, evaluated_at, outcome, inputs}` | Unit | P0 | FR-7, NFR-18 | Determinism on identical inputs |
| R7(A)–R7(G) restoration ladder — full coverage matrix per sub-clause | Unit | P0 | FR-9 | Threshold table-driven; not hardcoded |
| R8 90% rule — applies only after ≥ 10 contributions; only illness deaths | Unit | P0 | FR-10 | Mid-contribution-death R8(B) eligible |
| R5/R9 special death rules — suicide/murder-with-nominee-accused → State Trustee vote, never auto-deny | Unit + API | P0 | BUS-2, FR-11, FR-43 | |
| FR-12 retirement coverage — on-the-fly compute from `joined_at` + `retired_at` | Unit | P1 | FR-12 | Property-based |
| **FR-12A determinism** — same `member_id` + same `rule_registry_version` ⇒ identical payload | Unit + API | P0 | ASR-12, TECH-3 | Replay-able |
| **FR-12A latency** — p95 < 200 ms at 4L synthetic | Load (k6 or Artillery) | P0 | NFR-5, ASR-4 | 4L synthetic-factory fixture |
| **FR-12A cache freshness** — Niyamavali amendment → all-members read flips ≤ 60 s | Chaos | P0 | NFR-6, TECH-12, ASR-4 | Clock-provider abstraction required |
| Per-cohort invalidation with conservative all-members fallback | Integration | P0 | TECH-12 | When scope confidence insufficient |
| Member-self vs admin payload parity (minus internal flags) | API | P1 | FR-12A | Scope-based field redaction |

#### Epic 5 — Three-Tier Communication Channels `[9 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| Structured `alert` payload renders identically across in-app/WA/Telegram/SMS via channel-provider abstraction | Unit + Integration | P0 | FR-23, AR-40 | Template parity test |
| FCM + APNs push delivery — 7 categories, opt-in tokens | Integration | P0 | FR-71 | Provider faked |
| WA Business inbound webhook → opt-in ACTIVE after user-initiated WA message | API + Webhook | P0 | TC-6, FR-72, AR-16 | Mockoon/Wiremock for Meta inbound |
| WA send suppressed when member acted in-app within staleness window (FR-58C-flag-gated) | API | P1 | AR-18 | Time-critical templates override |
| SMS DLT-transactional fallback — WA undelivered after 3 retries × exp-backoff → SMS fires equivalent payload | Integration | P0 | AR-19, TECH-10 | |
| Pariwar-degraded-mode cycle-open SMS bridge (per-Pariwar push rate < threshold AND WA OFF) | Integration | P1 | AR-20 | |
| Step-up OTP delivery — audit-per-send + audit-per-consume tagged with operation identifier | API | P0 | ASR-10, NFR-28, NFR-29 | TTL 3 min, single-use |
| Telegram mirror fire-and-forget — non-canonical, announcements-only | Integration | P2 | FR-73 | TSCT-cohort honor |

#### Epic 6 — Claim Filing, Peer Verification, Ground Inspection & Appeal `[16 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| Claim case state machine — `under_verification → ... → settled` with audit | Unit + API | P0 | FR-37 | Property-based |
| Intake convergence point (ICP) — dedup key cross-channel; override semantics under race | Integration | P0 | AR-62 | Member-app, helpline, admin |
| OCR parity check on death certificate — mismatch → trustee manual review (never auto-reject) | API | P1 | FR-38, BUS-2 | |
| Peer mesh deterministic 5-nearest selection — `district > block > school > member_id` | Unit | P0 | FR-39 | Replay-from-snapshot |
| Ground inspection AND peer mesh must both pass before State Trustee approval | API | P1 | FR-40 | Not either/or |
| Claim-time nominee bank — dual accounts validated against IFSC; both required before `frozen` | API | P0 | FR-31, FR-37 | RBI UPI limit workaround |
| Claim-time DPDPA consent capture — public render / verifier publication / In Memoriam (no default opt-in) | API + Component | P0 | UX-DR2, BUS-1 | |
| Verifier console load < 5 s with no N+1 (compound read model) | API perf | P0 | PERF-7, FR-42 | One indexed query |
| Concealment-flagged claim — engine surfaces trigger; never auto-deny | Unit + API | P0 | BUS-2, FR-11 | Story 6.15 |
| FR-43A 3-stage appeal — Stage-1 reviewer ≠ original decision-maker; SLA tracking | API | P0 | FR-43A | Separation-of-duties asserted |
| Reversed-denial → Sahyog Vivran publish hook fires | API | P1 | FR-43A | |

#### Epic 7 — Pool Engine & Cycle Spawn `[10 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| **Pool assignment determinism** — `pool_index = hash(member_id, cycle_id) % N` reproducible from `(member_id, cycle_id)` alone | Unit (property-based) | P0 | ASR-2, TECH-11 | Across active M, sizes differ ≤ 1 |
| Full-cycle replay — load snapshot → re-derive assignments → identical to original | Integration | P0 | ASR-2, AR-57 | Snapshot format from AR-11 ADR (gate TC-1) |
| Pool spawn saga — parent → N child jobs; partial failure ⇒ resumable + idempotent | Integration | P0 | TECH-7, NFR-12 | Class-A pg-boss queue |
| **Pool-spawn capacity gate** — N=50 / M=4L synthetic ⇒ p95 < 60 s | Load | P0 | ASR-3, NFR-7, PERF-1 | Pre-launch measured-validation gate (Story 7.9) |
| Fixed-amount snapshot at spawn; cannot change after | Unit | P0 | FR-15 | Amount snapshot immutable |
| Fixed-amount setter validator — `effective_from ≥ now + 12 months` (emergency override audit-logged) | API | P0 | BUS-5, FR-15 | |
| Pool-bound payment enforcement — wrong-pool deposit → `wrong-pool/invalid`, no refund | API | P0 | FR-16 | Facilitated recovery in helpdesk |
| Idempotent `tr=` reference — repeated payments ⇒ one valid contribution | Unit | P0 | ASR-6, FR-17 | Property-based on `(member_id, alert_id)` |
| Amount-lock at UPI Intent — `am ≠ fixed_amount` rejected at reconciliation | Unit + Integration | P0 | FR-18 | |
| FR-19 close-of-cycle copy — celebration framing on < 100% cycle; rejected-phrase lint | Unit | P1 | BUS-3 | Template-driven |

#### Epic 8 — Sushil's Contribution Loop (My Pool + UPI Intent + Contribution Note) `[12 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| `<UPIIntentButton>` builds canonical URL — typed builder; property-based per (`pa`, `am`, `cu`, `tr`, `tn`, `mc`) | Unit | P0 | ASR-6, SEC-5 | |
| Per-UPI-app parity matrix — BHIM/PhonePe/GPay/Paytm launch URL correctness | Device-lab manual | P0 | ASR-6 | Pre-launch checklist; can't fully automate |
| My Pool render < 500 ms p95 on Snapdragon-4 / 3 GB Android | Mobile perf | P1 | NFR-2, PERF-5 | List virtualization |
| Live contributor list — updates only on reconciliation confirmation, not UTR self-attest | API | P0 | FR-24 | First-name + last-initial only |
| Yellow → Green pill flip — `contribution.confirmed` is canonical financial truth | API | P0 | FR-30 | Reconciliation-driven |
| Calendar-aware close-of-cycle timing (Bihar holiday windows) | Unit | P2 | UX-DR77, FR-19 | |
| Contribution Note PDF — never "receipt"; watermark + Niyamavali version | E2E (mobile) | P1 | FR-33, BUS-3 | Legal-reviewed copy |
| 90-second TWT-portion loop measurement instrumentation | E2E (mobile) | P1 | SM-1 demo beat | |

#### Epic 9 — Reconciliation Engine `[12 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| **Bank statement parser per-bank corpus** — 50 golden files × 5 banks regression | Unit | P0 | TECH-2, AR-41 | Per-PR gate on `packages/bank-parsers/*` |
| **Normalized statement schema** — every parser emits the same shape | Contract (vitest) | P0 | TC-2, AR-69 | Gate: schema ADR before Story 9.2 |
| **Matcher idempotency** — replay same statement N times ⇒ single confirmation per UTR | Unit + Integration | P0 | ASR-7, NFR-9 | Primary UTR + secondary (amount+VPA+timestamp) match |
| **Monotonic-confirmation invariant** — once `confirmed`, never reverts | Integration | P0 | ASR-7, DATA-6 | Property-based |
| 48 h-after-self-attest-without-match → `mismatch` (screenshot upload becomes mandatory) | Integration | P0 | FR-30, FR-32 | Time-controlled fixture |
| Mismatch triage queue ordered by alert-deadline proximity | API | P1 | FR-50 | |
| 4-hour retry reminders | Integration | P2 | FR-35 | |
| End-to-end reconciliation timing — statement-intake → member status update p95 < 4 h | E2E + perf | P0 | NFR-4, PERF-3 | Simulated cycle |
| Over-payment self-report — facilitated, never enforced | API | P2 | FR-36 | |

#### Epic 10 — Admin Operations Console `[15 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| Bulk ops framework — dry-run preview parity with actual run; scope-respecting; 5k cap; per-item failures don't roll back batch | Integration | P0 | FR-49 | One audit line per item w/ shared `batch_id` |
| Helpdesk routing policy (category × scope → assignee role) | API | P1 | FR-52 | Registry-driven |
| Feature flag deterministic evaluation — same cohort + flag identity + version ⇒ same result | Unit | P0 | AR-64, CC-15 | Replay-safe |
| Feature flag tenant isolation — flag definitions scoped by `pariwar_id` | Integration | P0 | SEC-1, AR-64 | No cross-tenant leakage |
| Feature flag audit — every flag-state change emits tamper-evident audit line | Integration | P1 | AR-64, ASR-5 | |
| Member moderation transitions — `active ↔ suspended → terminated` with reason codes | API | P1 | FR-56 | 12-month rejoin lock |
| Reports/exports library — scope-respecting; per-export audit line | API | P1 | FR-58A | Async generation |
| Banner/popup manager — `valid_from/until` auto-archive; one-per-surface | API | P2 | FR-58B | |

#### Epic 11a + 11b — Public Transparency Surfaces `[14 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| 4-tier visibility matrix codified per surface | API | P0 | FR-74 | Replaces public-vs-private binary |
| **PII shielding scrape test** — public surfaces never expose Tier-1 PII | E2E + CI | P0 | ASR-8, SEC-2, BUS-7 | Snapshot HTML against allowlist |
| AR-48 SSR + authenticated fragment cache safety — SSR shell zero PII, zero auth-derived branching | Unit + E2E | P0 | TC-7, AR-48 | Cache-poisoning probe |
| Member Directory anti-enumeration — forced pagination, `?page=all` rejected, max page size | API | P0 | FR-91, SEC-7 | |
| Honeypot + `noindex` on member-detail pages | E2E (web) | P1 | FR-92 | |
| Sahyog Vivran composition — nominee bank fragment hydrates only post-auth | E2E (web) | P0 | AR-48, FR-77 | |
| In Memoriam consent-governed revocable | API | P0 | UX-DR2, FR-78 | |
| `<ContributionListTable>` 50k-row desktop virtualization | Component + perf | P1 | UX-DR13, PERF-8 | Real Data Test gate |
| `<ContributionListMobileRow>` 10k-row mobile virtualization at 360 px | Component + perf | P1 | UX-DR14, PERF-8 | |

#### Epic 12 — Module Marketplace `[6 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| Module manifest schema + lifecycle state machine | Unit | P1 | FR-64, FR-67 | Time-bombed via `valid_until` / `slot_capacity == 0` |
| Module shelf eligibility filter — out-of-eligibility members never see card | API + Component | P0 | FR-65, UX-DR1 | Grief-context suppression |
| Grief-context exclusion — Module Shelf suppressed in all account-frozen states | Unit + API | P0 | TC-14, UX-DR1 | State-machine-enforced |
| Module lead-handoff transport — partner receives lead with TWT attribution | Integration | P1 | FR-65, AR-42 | |
| Time-bomb auto-archive at `valid_until` or slot exhaustion | Integration | P2 | FR-67 | |

#### Epic 13 — Growth & Field-Worker Attribution `[8 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| 6-digit code generation — Pariwar-scoped uniqueness invariant | Unit | P0 | FR-81 | |
| Reference Code parsing — 6-digit / username/eHRMS / empty → `attribution_source` | Unit | P1 | FR-82 | |
| Field worker payment trigger — only on KYC + ₹110 + first valid contribution (TDS §194H deducted) | API + Unit | P0 | BUS-6, FR-84 | Per-fiscal-year rate matrix |
| Anti-fraud throttling — code usage > X/day or > Y unique devices → trustee review flag | Integration | P1 | SEC-8, FR-86 | Assistive, not auto-punitive |
| Adopter chain attribution (v1 capture; v2 commission) | API | P2 | FR-87 | |

#### Epic 14 — Disaster Handling, DPO, Future-Benefit Hooks `[7 stories]`

| Scenario | Level | Pri | Risks/ASRs | Notes |
| --- | :-: | :-: | --- | --- |
| Disaster window declaration — alert engine throttling config | API | P1 | FR-98 | Governance throttling, not policy suspension |
| Disaster-mode member-comms framing — de-emphasized urgency lint | Unit | P2 | FR-98 | Template lint |
| FR-100 schema-diff verification (continuous CI gate) — v1 tables remain non-additive for trust-paid benefits | CI | P0 | ASR-11 | |
| FR-100 `benefit_mechanism` tag continuous CI gate | CI | P0 | ASR-11 | Every rule entry tagged |
| FR-100 Vyawastha Shulk receipt back-prove — historical eligibility query across any past date | Integration | P0 | DATA-3, FR-100 | Replay-derived |
| AR-69 ADR backlog ratification — five capability bars frozen | Governance | P1 | TC-1, TC-2, TC-14 | Decision-gate, not test |

---

### 4.2 NFR Coverage & Evidence Plan

> Final PASS/CONCERNS/FAIL deferred to `bmad-testarch-nfr` once implementation evidence exists. This table commits **planned validation scenario + level + evidence artifact** only.

| NFR | Validation level/tool | Evidence artifact (for `nfr-assess` later) | Status |
| --- | --- | --- | :-: |
| NFR-1 Cold start < 3 s | Mobile (Detox/Maestro) + Lighthouse-CI | Device-lab matrix report + Lighthouse JSON | Plan |
| NFR-2 My Pool render < 500 ms p95 | Mobile perf + Vitest perf assertion | Frame timing trace | Plan |
| NFR-3 UPI Intent launch < 1 s p95 | Mobile perf measure + structured-event timing | Client-side latency metric | Plan |
| NFR-4 Reconciliation latency < 4 h p95 | E2E simulated cycle + structured-event timing | Cycle-trace timing report | Plan |
| NFR-5 FR-12A p95 < 200 ms at 4L | k6 / Artillery load test against 4L synthetic | Load-test HTML + p95 dashboard snapshot | Plan |
| NFR-6 FR-12A freshness ≤ 60 s | Chaos test (clock provider) | Chaos run log + freshness assertion | Plan |
| NFR-7 Pool spawn < 60 s at N=50/M=4L | Load + Story 7.9 measured-validation gate | Capacity-envelope report (Phase-1 gate) | Plan |
| NFR-8 Admin UI on mid-Android | Playwright mobile-viewport E2E + device-lab | Visual regression + interaction trace | Plan |
| NFR-9 Matcher idempotent + replayable | Unit + Integration (replay) | ASR-7 test artifact | Plan |
| NFR-10 Audit log write ≤ 1 min | Structured-event timing + alert | Alert SLO config + trace sample | Plan |
| NFR-11 Availability ≥ 99.5 / 99 % | Synthetic uptime probe + SLO dashboard | Observability stack ADR pending; dashboard snapshot | Plan |
| NFR-12 Pool spawn atomic w/ retry | Integration saga test | Saga partial-failure resume log | Plan |
| NFR-13 Audit log integrity | ASR-5 chaos + daily integrity job + off-site diff | Integrity check daily report | Plan |
| NFR-14 PII AES-256 envelope | KMS-access-log assertion + Tink lint | KMS audit log; Tink usage gate | Plan |
| NFR-15 TLS 1.3+ pinned | Cert-policy CI + handshake assertion | TLS scan report per environment | Plan |
| NFR-16 Cross-tenant isolation | ASR-1 adversarial CI on every RLS-bound table | Adversarial-test result | Plan |
| NFR-17 Cloudflare front | Edge-config policy CI; substitution points enumerated | §5.8a pivot-readiness checklist | Plan |
| NFR-18 Structured event per state transition | `packages/events` lint + per-transition test | Event coverage report | Plan |
| NFR-19 Trustee dashboards on events | Dashboard-source lint (no transactional reads) | Source-of-truth audit | Plan |
| NFR-20 WCAG 2.1 AA launch blocker | axe-core in CI + external pre-launch audit (NFR-22) | axe-core report + audit deliverable | Plan |
| NFR-21 Devanagari parity | FM-5 contrast + render test on three test devices | Visual regression on device-lab | Plan |
| NFR-22 Pre-launch a11y audit | External audit | Audit report + remediation closure | Plan |
| NFR-23 Hindi/English parity | ASR-9 i18n parity assertion | Parity report per publish | Plan |
| NFR-24 PII in India | Infra-policy CI (region declarations) | Policy-scan report | Plan |
| NFR-25 Daily backups; quarterly restore | OPS-6 mitigation drill | Restore drill log | Plan |
| NFR-26 Audit log 7-y retention | Retention-policy CI + WORM Bucket Lock | Policy-scan + quarterly attestation | Plan |
| NFR-27 DigiLocker latency 8 s p95 | Provider-fault injection + UX-timer assertion | Latency trace + fallback-CTA assertion | Plan |
| NFR-28 OTP delivery TTL + rate limits | API + audit-log assertion | OTP audit lines per send + consume | Plan |
| NFR-29 Session model | Per-operation step-up matrix | Matrix-test artifact | Plan |

**NFR threshold gaps (carry over from Step 3.3):** RTO/RPO, push-notification production reliability target, helpdesk concurrent-ticket capacity, DigiLocker downtime tolerance window, WA template throughput tier, 50 k-row desktop FPS floor, audit-log write-delay alert threshold, DPDPA Data Fiduciary registration trigger. **Disposition:** none blocks current test design; each is owner-named in Step 3 and reaches resolution before Phase-1 launch gate.

---

### 4.3 Execution Strategy — PR / Nightly / Weekly

| Lane | Wall-clock budget | Suites that run |
| --- | --- | --- |
| **PR (every push)** | **< 15 min** | TS typecheck, ESLint (incl. i18n inline + Tamagui escape + Tailwind shadow lint), Vitest unit, Vitest component (Testing Library), API integration on ephemeral Postgres (testcontainers), Playwright smoke (1 path per app), Pact-style contract suite on `packages/contracts/*`, friction-budget gate (UX-DR3), PII scrape gate (Story 1.16b), schema-diff gate (Story 1.16c), `benefit_mechanism` gate (Story 1.16d). |
| **Nightly (main + release branches)** | **< 60 min** | Full Playwright E2E across `apps/public` + `apps/admin` (+ mobile build smoke when P0-5 ratified), axe-core a11y on member-app primary flows + public Niyamavali/Sahyog, RLS cross-Pariwar adversarial sweep, audit-integrity chaos (single-row mutate), reconciliation replay corpus (50 golden files × 5 banks), FR-12A load test at 4L synthetic, pool-spawn capacity micro-bench (N=10/M=100k as nightly proxy for full gate), step-up OTP matrix, friction-budget repo-wide audit. |
| **Weekly (release-candidate gate)** | **< 4 h** | Full pool-spawn capacity gate (N=50, M=4L) — ASR-3, Phase-1 launch gate, end-to-end reconciliation timing (NFR-4), Dokploy live-cycle fallback drill (AR-54), edge-pivot rehearsal (§5.8a), full restore-from-backup drill (NFR-25), mobile device-lab matrix (Snapdragon-4 + entry-level Android + iOS min), pre-launch a11y audit cadence (NFR-22), runbook drill cadence. |
| **Quarterly (governance)** | manual + automated | OPS-3 escrow open-and-close drill, OPS-5 backup-engineer readiness drill, OPS-6 prod restore drill, AR-10 IAM isolation attestation, AR-49 Phase-0 gate inventory review. |
| **Per-cycle (live)** | continuous | Reconciliation 6×/day cron monitoring, audit-integrity daily check, push-delivery rate per Pariwar, structured-event ingestion SLOs. |

**Selective execution** (per `selective-testing.md`):

- PR uses **Turborepo affected-graph** to scope Vitest + Playwright suites to changed packages only.
- Nightly runs the **full graph**; Weekly runs **capacity + production-like** suites.
- Tags: `@p0 / @p1 / @p2 / @p3` on every test; `@quarantine` for flake triage (must close within 7 days or move to permanent skip with owner + reason).

---

### 4.4 Resource Estimates (ranges only)

Author-time only; excludes ongoing maintenance, flake triage, and infra ops.

| Tier | Range (engineer-hours) | What's covered |
| --- | --- | --- |
| **P0** | **~80–120 h** | ASRs 1–12 (~12 ASRs × ~6–10 h each) + Epic 0 drills + ASR test harnesses (clock provider, 4L synthetic factory, audit chaos, webhook providers, UPI typed builder, PII scrape, i18n parity, schema-diff gates, restore drill). |
| **P1** | **~60–100 h** | Critical-path flows per Epics 3, 4, 6, 7, 8, 9 not already covered by P0; reconciliation triage queue; verifier console N+1; appeal flow; bilingual content rendering; mobile perf budgets. |
| **P2** | **~25–45 h** | Secondary flows: helpdesk routing, banner/popup, Telegram mirror, over-payment self-report, calendar-aware close-of-cycle timing, adopter chain v1 capture. |
| **P3** | **~5–10 h** | Exploratory perf benchmarks, visual-regression scaffolding for design system stub tokens. |
| **Total v1** | **~170–275 h** | Engineer-hours to baseline. With solo cadence + Phase-0 prerequisites, **expect 6–10 calendar weeks of focused authoring**, parallelizable with implementation only after P0-5 substrate ratify (Story 0.14). |

**Sanity check:** these numbers cover *authoring* + baseline-CI wire-up only. They do **not** include:
- 4L synthetic-factory data generation (one-time setup, expect +20–30 h).
- Device-lab procurement + UPI Intent per-app device-matrix verification (one-time setup, expect +10–15 h).
- 50 golden file curation per bank (operational content; not engineer time).
- External a11y audit (NFR-22) — vendor cost, not internal hours.

---

### 4.5 Quality Gates

These gates are committed thresholds — not aspirations. A miss on any gate marked **Phase-1 launch blocker** halts Phase 1 transition.

| Gate | Threshold | Source / Owner | Phase-1 launch blocker? |
| --- | --- | --- | :-: |
| **P0 test pass rate** | 100 % | This plan §4.1 | ✅ |
| **P1 test pass rate** | ≥ 95 % | This plan §4.1 | ✅ |
| **HIGH-risk mitigation evidence** | every HIGH risk has a passing test (or written deferral + Trustee Panel sign-off) | This plan §3.2 | ✅ |
| **ASR-1 cross-Pariwar adversarial** | zero leak across all RLS-bound tables | Story 1.6 | ✅ |
| **ASR-3 Pool-spawn capacity** | N=50, M=4L, p95 < 60 s | Story 7.9 | ✅ |
| **ASR-4 FR-12A latency + freshness** | p95 < 200 ms; freshness ≤ 60 s | Story 4.6 + 4.8 | ✅ |
| **ASR-5 Audit-integrity chaos** | single-row mutate detected ≤ 24 h | Story 1.10 + 1.11a | ✅ |
| **ASR-7 Reconciliation replay** | idempotent + monotonic confirmation | Story 9.4 | ✅ |
| **ASR-8 PII scrape** | zero Tier-1 leak from public surfaces | Story 1.16b | ✅ |
| **ASR-9 i18n parity** | every key present in both `hi` and `en` | Story 2.1 | ✅ |
| **WCAG 2.1 AA** | pre-launch audit closed (NFR-22) | external auditor | ✅ (Phase-2 gate) |
| **NFR-25 backup restore** | quarterly drill passed | OPS-6 mitigation | ✅ |
| **Coverage target** | ≥ 80 % statement coverage on `packages/domain` + `packages/contracts` + Pool/Reconciliation/Validity modules; coverage *not* a target on UI shells | `test-quality.md` adjusted | ⚠️ Strong recommendation; not strict launch gate |
| **NFR evidence catalog** | every in-scope NFR has a planned evidence artifact (§4.2) | This plan | ✅ |
| **Final NFR PASS/CONCERNS/FAIL** | deferred to `bmad-testarch-nfr` post-implementation evidence | nfr-assess workflow | Per-NFR — not by this workflow |
| **Test stability** | rolling flake rate < 1 % over 14 days on nightly; weekly < 5 % | `test-quality.md` | Strong recommendation |
| **PR wall-clock** | < 15 min on representative diff | execution strategy §4.3 | Strong recommendation |

**Phase-0 specific gates (per PRD §12 + AR-49):**

- P0-1 fallback-handler ledger published (Story 0.7) — **launch blocker for any loop node it covers**.
- P0-2 empathy field-work complete (Stories 0.8–0.11) — **launch blocker for nominee-facing surfaces + Helpline Operator console**.
- P0-3 spec-to-cadence reality check (Story 0.12).
- P0-4 legal counsel concurrent-review (Story 0.13).
- P0-5 native-stack validation prototype ratify (Story 0.14) — **launch blocker for all substrate-conditional engineering**.

---

### 4.6 Summary

- **30 P0 scenarios** dominate the plan and are all reachable from the 12 ACTIONABLE ASRs.
- Execution model is conservative: **PR < 15 min, Nightly < 60 min, Weekly < 4 h** — fits a solo-build cadence without sacrificing the three uncompromisable subsystems.
- Resource envelope **~170–275 engineer-hours** for authoring, plus one-time setup for the 4L synthetic factory and device lab.
- Quality gates are explicit and enforce the architectural commitments rather than reinventing them: pass-rates, ASR closure, NFR evidence catalog, and Phase-0 gates.

**Next:** Step 5 — Emit final artifacts (system-level `test-design-architecture.md` and per-epic `test-design-qa.md` stubs).

---

## Step 5 — Generate Outputs & Validate

### Execution Mode Resolution

- `config.tea_execution_mode`: `auto`
- `config.tea_capability_probe`: `true`
- Runtime capability: single-agent (no subagent / agent-team available within this session for parallel two-doc generation)
- **Resolved mode:** `sequential` — generate `test-design-architecture.md` then `test-design-qa.md` then `TWT-handoff.md` in order; reconcile cross-references as a final pass.

### Output Artifacts

| Artifact | Path | Status |
| --- | --- | --- |
| Architecture-team test design | `_bmad-output/test-artifacts/test-design-architecture.md` | ✅ written |
| QA execution recipe | `_bmad-output/test-artifacts/test-design-qa.md` | ✅ written |
| BMAD handoff document | `_bmad-output/test-artifacts/test-design/TWT-handoff.md` | ✅ written |
| Progress / audit trail | `_bmad-output/test-artifacts/test-design-progress.md` | ✅ this file |

### Validation Against Checklist

Checked against `_bmad/skills/bmad-testarch-test-design/checklist.md`:

**Prerequisites (System-Level Mode):**

- [x] PRD with functional + non-functional requirements (PRD §4 features + §8 NFRs)
- [x] ADR / architecture document (architecture.md; per-decision ADRs from AR-69 backlog forthcoming)
- [x] Architecture document available
- [x] Requirements testable and unambiguous (where ambiguous → flagged as TC-1…TC-15 testability concerns)

**Process Steps:**

- [x] PRD, epics, architecture, UX spec, readiness reports, sprint change proposals all loaded
- [x] Knowledge base fragments loaded (risk-governance, probability-impact, test-levels, test-priorities, nfr-criteria, test-quality, adr-quality-readiness-checklist; webhook-fundamentals + providers contextually)
- [x] Genuine risks identified (55, not just features), categorized TECH/SEC/PERF/DATA/BUS/OPS, scored 1–3 × 1–3
- [x] HIGH risks (19) flagged with mitigation, owner, timeline
- [x] NFR thresholds extracted from PRD + architecture; UNKNOWNs surfaced (8) with owners
- [x] Atomic test scenarios; test levels selected; no duplicate coverage; P0–P3 priorities; risk-linked
- [x] Resource estimates as ranges, not exact numbers
- [x] Quality gates defined; final NFR PASS/CONCERNS/FAIL deferred to `bmad-testarch-nfr`

**Output Validation:**

- [x] Architecture doc: Quick Guide (🚨 / ⚠️ / 📋); risk table with all columns; actionable concerns first, FYI last; mitigation plans for all 19 HIGH; NO test scripts in arch doc; cross-references to QA doc
- [x] QA doc: Dependencies & Test Blockers near top; risk assessment summary (refs arch); P0/P1/P2/P3 tables with priority-as-risk-classification (NOT execution timing); NFR coverage plan; PR/Nightly/Weekly execution strategy; interval-based effort estimates; Appendix A code examples with `@seontechnologies/playwright-utils` import; Appendix B knowledge base refs
- [x] Handoff doc: TEA Artifacts Inventory; Epic-Level + Story-Level Integration Guidance; Risk-to-Story mapping; Recommended workflow sequence; Phase transition gates
- [x] Cross-document consistency: risk IDs identical (TECH-1…OPS-8); priority levels identical (P0–P3); pre-implementation blockers identical (B-1…B-5); ASR IDs identical (ASR-1…ASR-12)
- [x] No CLI sessions orphaned; no temp artifacts outside `_bmad-output/test-artifacts/`
- [x] Document length: architecture ~280 lines (concerns-focused; longer than the ~150–200 line target but TWT has 19 HIGH risks each requiring its own mitigation plan, plus 15 actionable concerns — content is risk-anchored, not bloated)

### Completion Report

- **Mode used:** System-Level (PRD + architecture + epics present; user-selected over Epic-Level option).
- **Execution mode:** sequential.
- **Output files:**
  - `_bmad-output/test-artifacts/test-design-architecture.md`
  - `_bmad-output/test-artifacts/test-design-qa.md`
  - `_bmad-output/test-artifacts/test-design/TWT-handoff.md`
  - `_bmad-output/test-artifacts/test-design-progress.md` (this audit trail)
- **Key risks (HIGH ≥ 6):** 19 total; concentrated in TECH (8), SEC (3), DATA (2), BUS (3), OPS (4) — see architecture doc table.
- **Gate thresholds:** P0 = 100 % pass; P1 ≥ 95 % pass; every HIGH risk has a passing test or signed deferral; ASR-1/3/4/5/7/8/9 are Phase-1 launch blockers; external a11y audit gates Phase 2.
- **Open assumptions:** 5 blockers (B-1 → B-5); P0-5 substrate ratify; backup engineer retainer; 50 golden files per bank content curation.
- **Suggested next workflows:** `bmad-testarch-atdd` for P0 scaffolds, then `bmad-testarch-framework` if not done, then `bmad-testarch-ci` to wire the PR/Nightly/Weekly lanes.

### Workflow Status: **COMPLETED**
