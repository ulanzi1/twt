---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-05-29'
workflowType: 'testarch-atdd'
storyId: 'twt-p0-asrs'
storyKey: 'twt-p0-asrs'
storyFile: '_bmad-output/test-artifacts/test-design/TWT-handoff.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-twt-p0-asrs.md'
generatedTestFiles:
  - _bmad-output/test-artifacts/atdd-scaffolds/asr-01-cross-pariwar-rls.spec.ts
  - _bmad-output/test-artifacts/atdd-scaffolds/asr-02-pool-engine-determinism.spec.ts
  - _bmad-output/test-artifacts/atdd-scaffolds/asr-03-pool-spawn-capacity.spec.ts
  - _bmad-output/test-artifacts/atdd-scaffolds/asr-04-validity-service-latency-freshness.spec.ts
  - _bmad-output/test-artifacts/atdd-scaffolds/asr-05-audit-integrity-chaos.spec.ts
  - _bmad-output/test-artifacts/atdd-scaffolds/asr-06-upi-intent-typed-builder.spec.ts
  - _bmad-output/test-artifacts/atdd-scaffolds/asr-07-recon-matcher-idempotency.spec.ts
  - _bmad-output/test-artifacts/atdd-scaffolds/asr-08-pii-scrape-gate.spec.ts
  - _bmad-output/test-artifacts/atdd-scaffolds/asr-09-i18n-parity.spec.ts
  - _bmad-output/test-artifacts/atdd-scaffolds/asr-10-step-up-otp-audit.spec.ts
  - _bmad-output/test-artifacts/atdd-scaffolds/asr-11-fr100-schema-diff-and-benefit-mechanism.spec.ts
  - _bmad-output/test-artifacts/atdd-scaffolds/asr-12-fr12a-determinism.spec.ts
inputDocuments:
  - _bmad-output/test-artifacts/test-design-architecture.md
  - _bmad-output/test-artifacts/test-design-qa.md
  - _bmad-output/test-artifacts/test-design/TWT-handoff.md
---

# ATDD Checklist — TWT v1 P0 ASR Bundle

**Date:** 2026-05-29
**Author:** BigDev (Master Test Architect)
**Primary Test Level:** Mixed (Unit property-based, API integration, E2E web, Load, Chaos)

---

## Story Summary

This is **not a single BMM story** — it is a coherent batch of red-phase acceptance test scaffolds covering the **12 ACTIONABLE Architecturally Significant Requirements** that drive the 19 HIGH-priority risks identified in the system-level test design (`test-design-architecture.md` + `test-design-qa.md`).

**As a** Solo Builder for TWT v1
**I want** red-phase acceptance tests in place before I write the implementation for the uncompromisable subsystems
**So that** every P0 ASR has a failing test that drives the green-phase work, and every Phase-1 launch gate has a deterministic pass/fail target.

---

## Acceptance Criteria

The 12 ASRs covered by this bundle (each ASR maps to one scaffold file, plus the cross-cutting fixtures module):

| ASR | Acceptance criterion (verbatim from test-design-architecture.md) | Scaffold |
| --- | --- | --- |
| ASR-1 | Cross-Pariwar isolation adversarial CI test (cross-Pariwar read across every RLS-bound table) | `asr-01-cross-pariwar-rls.spec.ts` |
| ASR-2 | Pool Engine determinism — property-based on `hash(member_id, cycle_id) mod N` + full-cycle replay from snapshot | `asr-02-pool-engine-determinism.spec.ts` |
| ASR-3 | Pool-spawn capacity envelope — N=50, M=4L, p95 < 60 s | `asr-03-pool-spawn-capacity.spec.ts` |
| ASR-4 | FR-12A latency p95 < 200 ms at 4L + cache freshness ≤ 60 s | `asr-04-validity-service-latency-freshness.spec.ts` |
| ASR-5 | Audit log hash-chain + off-site mirror integrity check — single mutate detected ≤ 24 h | `asr-05-audit-integrity-chaos.spec.ts` |
| ASR-6 | UPI Intent canonicalization — typed URL builder + per-UPI-app parity matrix | `asr-06-upi-intent-typed-builder.spec.ts` |
| ASR-7 | Reconciliation matcher idempotency + monotonic-confirmation invariant | `asr-07-recon-matcher-idempotency.spec.ts` |
| ASR-8 | PII shielding scrape test — public surfaces never expose Tier-1 PII | `asr-08-pii-scrape-gate.spec.ts` |
| ASR-9 | Bilingual parity — every i18n key present in both `hi` and `en` | `asr-09-i18n-parity.spec.ts` |
| ASR-10 | Step-up OTP audit-per-send + audit-per-consume tagged with operation identifier | `asr-10-step-up-otp-audit.spec.ts` |
| ASR-11 | FR-100 schema-diff + `benefit_mechanism` tag CI gates — non-additive guard | `asr-11-fr100-schema-diff-and-benefit-mechanism.spec.ts` |
| ASR-12 | FR-12A determinism — same `member_id` + same `rule_registry_version` ⇒ reproducible payload | `asr-12-fr12a-determinism.spec.ts` |

---

## Story Integration Metadata

- **Story ID:** `twt-p0-asrs`
- **Story Key:** `twt-p0-asrs`
- **Source Document (in lieu of a single BMM story):** `_bmad-output/test-artifacts/test-design/TWT-handoff.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-twt-p0-asrs.md`
- **Scaffold Directory:** `_bmad-output/test-artifacts/atdd-scaffolds/`

Each scaffold maps explicitly back to its target BMM story (see Implementation Checklist below). When `bmad-create-story` is run for those stories, mirror the scaffold path into the story's `## Dev Notes → ### ATDD Artifacts` subsection so `bmad-dev-story` can activate the scaffold during green-phase implementation.

---

## Red-Phase Test Scaffolds Created

### Property-Based / Unit Tests (5 scaffolds)

**Files:**
- `asr-02-pool-engine-determinism.spec.ts` (122 lines, 6 `test.skip()`)
- `asr-06-upi-intent-typed-builder.spec.ts` (138 lines, 7 `test.skip()`)
- `asr-09-i18n-parity.spec.ts` (84 lines, 6 `test.skip()`)
- `asr-12-fr12a-determinism.spec.ts` (125 lines, 5 `test.skip()`)
- `asr-07-recon-matcher-idempotency.spec.ts` (164 lines, 5 `test.skip()` — mixed unit + integration)

**Stack:** Vitest + `fast-check`. No browser. Runs on PR.

### API / Integration Tests (4 scaffolds)

**Files:**
- `asr-01-cross-pariwar-rls.spec.ts` (136 lines, 4 `test.skip()`)
- `asr-05-audit-integrity-chaos.spec.ts` (123 lines, 4 `test.skip()`)
- `asr-10-step-up-otp-audit.spec.ts` (133 lines, 4 `test.skip()` — covering 15-operation matrix)
- `asr-11-fr100-schema-diff-and-benefit-mechanism.spec.ts` (129 lines, 6 `test.skip()`)

**Stack:** Vitest + `@seontechnologies/playwright-utils/api-request` against ephemeral Postgres (testcontainers). Runs on PR; ASR-5 chaos runs Nightly.

### E2E Tests (1 scaffold)

**Files:**
- `asr-08-pii-scrape-gate.spec.ts` (97 lines, 5 `test.skip()` — covers 11 public routes via `for` loop + SSR direct check + pagination + noindex)

**Stack:** `@playwright/test` against the Astro SSR public site. Runs on PR.

### Load + Chaos Tests (2 scaffolds)

**Files:**
- `asr-03-pool-spawn-capacity.spec.ts` (123 lines, 3 `test.skip()` — N=50 / M=4L Weekly gate + N=10 / M=4L Nightly proxy + co-located k6 skeleton)
- `asr-04-validity-service-latency-freshness.spec.ts` (145 lines, 4 `test.skip()` — 50 VU × 60 s load + Niyamavali-amendment chaos + conservative-fallback chaos)

**Stack:** Vitest orchestration + k6 (load lane), Vitest + `TestClock` (chaos lane). Runs Weekly (load) + Nightly (chaos).

### Shared Fixtures (1 module)

- `_fixtures/test-data.ts` (135 lines): `MemberSeed`, `synth4LMembers` generator (deterministic 4 lakh members), `NormalizedBankRecord`, `PariwarId` branded type, `CycleId`, `TIER1_PII_TOKEN_ALLOWLIST_FORBIDDEN` constant.

**Totals:** **12 scaffold files + 1 fixtures module = ~1654 lines; 59 `test.skip()` invocations.**

---

## Data Factories Created

### `synth4LMembers(pariwarId, count=400_000, seed=4242)` (generator)

Deterministic 4 lakh synthetic members, faker-seeded. Used by ASR-3 (capacity gate) and ASR-4 (FR-12A load). Move to `packages/domain/__tests__/_fixtures/` once monorepo lands.

### `newMemberSeed(overrides?)`

Single-member factory with faker-randomized first/last name, district, joined_at, lock_in_days_at_join = 30 (per FR-8 v1 default).

### `newBankRecord(overrides?)`

Single normalized bank statement record per AR-41 shape. Powers ASR-7 reconciliation tests once the **B-2 normalized schema ADR** lands.

### `newPariwarId(prefix)`, `newCycleId(yyyymm)`

Branded-string ID factories used across scaffolds.

---

## Mock Requirements

### Test seeder endpoint

**Endpoint:** `POST /test/seed/<table>` and `POST /test/seed-bulk` and `POST /test/exec-sql` and `GET /test/rls-introspection`
**Purpose:** Gated test-only endpoints (NODE_ENV=test) that let scaffolds:
- Seed canonical rows per RLS-bound table (ASR-1)
- Bulk-load the 4L synthetic factory (ASR-3, ASR-4)
- Execute raw SQL under a chosen pariwar_id session context (ASR-1 SQL-layer assertion)
- Introspect RLS policies + NOT NULL constraints per table (ASR-1)

These endpoints must be **physically absent in production builds** — disabled at build time via the `apps/api/test-only/*` plugin gate (Story 1.4 contracts module).

### Test clock endpoint

**Endpoint:** `POST /test/clock/advance { seconds }`
**Purpose:** Drives time-as-actor (SIE) transitions deterministically — used by ASR-4 cache-freshness chaos, ASR-5 24-h-integrity-check window, ASR-7 48-h reconciliation mismatch, ASR-10 OTP TTL expiry.
**Dependency:** TC-4 clock provider abstraction (Story 1.12).

### Audit verifier credential harness

**Endpoint:** `withSoleEngineerCredential(...)` + `withVerifierCredential(...)` helpers in `@twt/test-utils/iam`.
**Purpose:** Wraps SQL/API calls in distinct IAM contexts so ASR-5 can prove that mutation-capable credentials cannot pass the integrity check, and verifier credentials cannot mutate.
**Dependency:** AR-10 IAM Isolation Commitment (`twt-audit-mirror` GCP project provisioned).

### Mockoon / Wiremock providers (for downstream ATDD batches)

Not consumed by these P0 scaffolds directly, but Stories 5.3 / 5.4 will need them for WhatsApp Business inbound webhook ATDD. Flagged here so the same harness gets reused.

---

## Required data-testid Attributes

Only ASR-8 (PII scrape gate) is E2E and exercises the public surfaces. The `data-testid` contract from `TWT-handoff.md` applies:

- `data-testid="honeypot-field"` on every public form (FR-92).
- `data-fragment="nominee-bank"` (or equivalent attribute marker) on the AR-48 authenticated fragment so the SSR-only render check can assert absence.
- `data-testid="status-pill"` with `data-state="{pending|confirmed|mismatch|grey-takeover|held}"` for downstream Story 9.6 work (not directly asserted in this batch).

Other scaffolds in this batch are API/Unit/Load/Chaos — no UI selectors needed.

---

## Implementation Checklist

Each scaffold maps to a target BMM story and a green-phase activation sequence. **Activate one `test.skip()` at a time** — confirm RED, implement, confirm GREEN, commit, move on.

### ASR-1 — `asr-01-cross-pariwar-rls.spec.ts` → Story 1.6

- [ ] B-5 closed: `_bmad/tea/config.yaml` commits `test_framework: vitest+playwright`, `ci_platform: github-actions`.
- [ ] Story 1.2 landed: Cloud SQL + Drizzle scaffold; ephemeral Postgres available in CI via testcontainers.
- [ ] Story 1.6 PR-1: `pariwar_id NOT NULL` + RLS policy on each RLS_BOUND_TABLES entry.
- [ ] Story 1.6 PR-2: `/test/seed/<table>`, `/test/exec-sql`, `/test/rls-introspection` test-only endpoints behind NODE_ENV gate.
- [ ] Move scaffold to `apps/api/__tests__/security/cross-pariwar-rls.spec.ts`.
- [ ] Activate adversarial read test for table `members` → confirm FAIL (no RLS yet) → implement → GREEN.
- [ ] Repeat for each RLS_BOUND_TABLES entry.
- [ ] Activate RLS introspection test → confirm FAIL → implement → GREEN.

**Estimated effort:** ~6–10 h (P0 fixture setup + per-table sweep).

### ASR-2 — `asr-02-pool-engine-determinism.spec.ts` → Story 7.4

- [ ] **B-1 closed: Pool Engine snapshot format ADR (AR-11)** — block on this; do not activate without snapshot shape committed.
- [ ] Story 7.1 landed: pool object data model + state machine.
- [ ] Move scaffold to `packages/domain/__tests__/pool-engine/determinism.spec.ts`.
- [ ] Activate `assignMemberToPool` idempotency property → FAIL → implement → GREEN.
- [ ] Activate range invariant → FAIL → implement → GREEN.
- [ ] Activate balance invariant → FAIL → implement → GREEN.
- [ ] Activate snapshot replay tests → FAIL → implement → GREEN.

**Estimated effort:** ~5–8 h.

### ASR-3 — `asr-03-pool-spawn-capacity.spec.ts` → Story 7.9

- [ ] B-1 closed (snapshot format).
- [ ] Story 7.3 landed (pool spawn saga: parent → N child jobs).
- [ ] TC-5 closed: 4L synthetic factory wired into `/test/seed-bulk`.
- [ ] k6 runner provisioned (self-hosted Weekly runner per QA doc Tooling table).
- [ ] Move scaffold to `apps/api/__tests__/perf/pool-spawn-capacity.spec.ts`.
- [ ] Author co-located `pool-spawn.k6.js` per skeleton in the scaffold comments.
- [ ] Activate Nightly proxy (N=10, M=4L) → FAIL → implement → GREEN.
- [ ] Activate full Weekly gate (N=50, M=4L) → FAIL → implement → GREEN; Phase-1 launch gate.

**Estimated effort:** ~12–20 h (load runner setup + 4L factory throughput tuning + saga retry semantics).

### ASR-4 — `asr-04-validity-service-latency-freshness.spec.ts` → Stories 4.6 + 4.8

- [ ] TC-4 closed: clock provider abstraction lands with Story 1.12.
- [ ] TC-5 closed: 4L synthetic factory.
- [ ] Story 4.1 + 4.6 landed: rule evaluation primitive + validity service surface.
- [ ] Move scaffold to `apps/api/__tests__/perf/validity-service-latency.spec.ts` and split chaos tests into `apps/api/__tests__/chaos/validity-cache-freshness.spec.ts`.
- [ ] Activate p95 < 200 ms load → FAIL → implement (per-cohort cache from Story 4.8) → GREEN.
- [ ] Activate freshness ≤ 60 s chaos → FAIL → implement → GREEN.
- [ ] Activate conservative-fallback chaos → FAIL → implement → GREEN.

**Estimated effort:** ~10–14 h.

### ASR-5 — `asr-05-audit-integrity-chaos.spec.ts` → Stories 1.10 + 1.11a

- [ ] AR-10 GCP `twt-audit-mirror` project provisioned (separate IAM).
- [ ] Story 1.10 hash-chain primitive landed.
- [ ] Story 1.11a integrity verification job + alerting.
- [ ] `withSoleEngineerCredential` / `withVerifierCredential` harness lands in `@twt/test-utils/iam`.
- [ ] Move scaffold to `apps/api/__tests__/security/audit-integrity-chaos.spec.ts`.
- [ ] Activate "mutation detected ≤ 24 h" → FAIL → implement integrity job → GREEN.
- [ ] Activate "off-site mirror diff detects divergence ≤ 6 h" → FAIL → implement mirror diff → GREEN.
- [ ] Activate "verifier IAM cannot mutate" → FAIL (currently has intentional `expect(true).toBe(false)` placeholder pending harness) → implement → GREEN.

**Estimated effort:** ~10–14 h (IAM setup + chaos harness + alert wiring).

### ASR-6 — `asr-06-upi-intent-typed-builder.spec.ts` → Stories 7.7 + 8.4

- [ ] Move scaffold to `packages/domain/__tests__/upi-intent/url-builder.spec.ts`.
- [ ] Activate round-trip property → FAIL → implement `buildUPIIntentURL` + `parseUPIIntentURL` → GREEN.
- [ ] Activate scheme-prefix + param-encoding property → FAIL → implement → GREEN.
- [ ] Activate VPA validator → FAIL → implement → GREEN.
- [ ] Activate INR-only validator → FAIL → implement → GREEN.
- [ ] Activate amount validator → FAIL → implement → GREEN.
- [ ] Activate idempotent `tr=` helper → FAIL → implement `buildUPIIntentURL.forMemberAlert` → GREEN.
- [ ] Schedule per-UPI-app device-lab parity matrix (manual, separate from this scaffold).

**Estimated effort:** ~4–6 h (excluding device-lab).

### ASR-7 — `asr-07-recon-matcher-idempotency.spec.ts` → Story 9.4

- [ ] **B-2 closed: normalized statement schema ADR (AR-69)**.
- [ ] Story 9.2 PR-1: at least one parser emitting normalized records.
- [ ] Move scaffold to `packages/domain/__tests__/reconciliation/matcher-idempotency.spec.ts`.
- [ ] Activate replay/idempotency test → FAIL → implement → GREEN.
- [ ] Activate monotonic-confirmation invariant → FAIL → implement → GREEN.
- [ ] Activate amount-lock (FR-18) → FAIL → implement → GREEN.
- [ ] Activate order-invariance property → FAIL → implement → GREEN.

**Estimated effort:** ~6–10 h.

### ASR-8 — `asr-08-pii-scrape-gate.spec.ts` → Story 1.16b

- [ ] Story 11a.1 + 11a.2 landed: Astro SSR shell + tiered visibility renderers.
- [ ] PII allowlist (single source) lands in `packages/contracts/pii-allowlist.ts`.
- [ ] Move scaffold to `apps/public/e2e/security/pii-scrape.spec.ts` plus `apps/api/__tests__/security/pii-allowlist.spec.ts` for the API-level allowlist coverage.
- [ ] Activate scrape sweep for each route → FAIL initially (until renderers harden) → implement → GREEN.
- [ ] Activate AR-48 SSR-only assertion → FAIL → implement registry-declared authenticated fragment → GREEN.
- [ ] Activate forced pagination test → FAIL → implement → GREEN.
- [ ] Activate noindex + honeypot test → FAIL → implement → GREEN.

**Estimated effort:** ~6–8 h.

### ASR-9 — `asr-09-i18n-parity.spec.ts` → Story 2.1

- [ ] Story 2.1 PR-1: `packages/i18n/{en,hi}.json` shell + `formatCurrency`/`formatDate` utility.
- [ ] Move scaffold to `packages/i18n/__tests__/parity.spec.ts`.
- [ ] Activate "every key in en exists in hi" → FAIL → implement → GREEN.
- [ ] Activate reverse → FAIL → implement → GREEN.
- [ ] Activate "no empty value" → FAIL → implement → GREEN.
- [ ] Activate placeholder-parity → FAIL → implement → GREEN.
- [ ] Activate inline-formatting lint → FAIL → implement → GREEN.

**Estimated effort:** ~3–5 h.

### ASR-10 — `asr-10-step-up-otp-audit.spec.ts` → Stories 1.9 + 5.9

- [ ] Story 1.9 admin auth scaffolding (email + password + WebAuthn passkey).
- [ ] AR-21 SMS DLT-transactional provider abstraction with a fake.
- [ ] Story 5.9 step-up OTP channel delivery + per-operation audit lines.
- [ ] Move scaffold to `apps/api/__tests__/auth/step-up-otp-audit.spec.ts`.
- [ ] Activate per-operation send/consume audit assertion for operation #1 → FAIL → implement → GREEN.
- [ ] Repeat for each STEP_UP_OPERATIONS entry (15 total).
- [ ] Activate TTL = 3 min expiry → FAIL → implement → GREEN.
- [ ] Activate "high-trust operation without step-up rejected" → FAIL → implement gate → GREEN.

**Estimated effort:** ~8–12 h.

### ASR-11 — `asr-11-fr100-schema-diff-and-benefit-mechanism.spec.ts` → Stories 1.16c + 1.16d (continuous CI) and Stories 14.4 + 14.5 (final closure)

- [ ] Story 1.16c: schema-diff helper + git tag `v1.0.0-schema` cut at end of Epic 1.
- [ ] Story 1.16d: rule registry storage + listing API.
- [ ] Move scaffolds to `apps/api/__tests__/governance/fr100-schema-diff.spec.ts` + `apps/api/__tests__/governance/benefit-mechanism-tag.spec.ts`.
- [ ] Activate schema-diff non-additive guard → FAIL until tag cut → tag → GREEN.
- [ ] Activate column-removal block → GREEN (trivially passes when no removals).
- [ ] Activate `benefit_mechanism` presence test → FAIL until v1 rules tagged → implement → GREEN.
- [ ] Activate v1-no-`reserve` test → GREEN (negative assertion; alerts if a future PR adds one).
- [ ] Activate evaluation-line carries discriminator → FAIL → implement → GREEN (post-Story 4.1).

**Estimated effort:** ~5–7 h.

### ASR-12 — `asr-12-fr12a-determinism.spec.ts` → Story 4.6

- [ ] Story 4.1 + 4.6 landed (rule evaluation + validity service with `pinned_registry_version`).
- [ ] Move scaffold to `packages/domain/__tests__/validity-service/determinism.spec.ts`.
- [ ] Activate single-pair determinism test → FAIL → implement deterministic eval → GREEN.
- [ ] Activate property-based determinism across 100 members → FAIL → implement → GREEN.
- [ ] Activate version-change semantics → FAIL → implement → GREEN.
- [ ] Activate provenance-grade `applicable_niyamavali_clauses` → FAIL → implement → GREEN.

**Estimated effort:** ~5–8 h.

**Grand total estimated effort across all 12 ASRs:** ~80–120 hours (matches the P0 column estimate in `test-design-qa.md` §QA Effort Estimate).

---

## Running Tests

> **All commands assume Story 1.1 (Turborepo bootstrap, Story 1.2 (Postgres + Drizzle), and B-5 (config commitment) are complete.** Until then, the scaffolds live in `_bmad-output/test-artifacts/atdd-scaffolds/` and are not executable.

```bash
# Run all P0 ASR scaffolds for the bundle
pnpm test --grep "@P0"

# Run by category
pnpm test --grep "@P0 @MultiTenant"   # ASR-1
pnpm test --grep "@P0 @Pool"           # ASR-2, ASR-3
pnpm test --grep "@P0 @FR-12A"         # ASR-4, ASR-12
pnpm test --grep "@P0 @Audit"          # ASR-5
pnpm test --grep "@P0 @UPI"            # ASR-6
pnpm test --grep "@P0 @Recon"          # ASR-7
pnpm test --grep "@P0 @PII"            # ASR-8
pnpm test --grep "@P0 @Bilingual"      # ASR-9
pnpm test --grep "@P0 @Auth @StepUp"   # ASR-10
pnpm test --grep "@P0 @Governance"     # ASR-11

# Headed (debug) mode for E2E (ASR-8)
pnpm playwright test --grep "@P0 @PII" --headed --debug

# Weekly lane (load + capacity)
pnpm test:weekly --grep "@P0 @Capacity"
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ All 12 ASR scaffolds written with `test.skip()` markers (59 total `test.skip()` invocations).
- ✅ All assertions assert *expected* behavior (no `expect(true).toBe(true)` placeholders except one intentional FAIL placeholder in ASR-5 that marks an un-landed harness — flagged in comments).
- ✅ Shared fixtures (`_fixtures/test-data.ts`) authored with deterministic seeding.
- ✅ Mock requirements documented (test-seeder endpoints, test-clock endpoint, IAM credential harness).
- ✅ `data-testid` requirements listed for ASR-8 E2E.
- ✅ Implementation checklist created per ASR with story mapping + activation sequence.

### GREEN Phase (Solo Builder — Next Steps)

For each ASR's checklist above:

1. Close upstream blockers first (B-1 / B-2 / B-3 / B-4 / B-5 / TC-4 / TC-5 per the test design).
2. Move the scaffold from `_bmad-output/test-artifacts/atdd-scaffolds/` to its target final location.
3. Remove `test.skip()` from the first scenario.
4. Run the test → confirm RED (fails because the contract isn't implemented yet).
5. Implement the minimal code to make the test pass.
6. Run the test → confirm GREEN.
7. Commit.
8. Move on to the next scenario.

### REFACTOR Phase (Solo Builder — After Each Epic Closes)

- All ASRs anchored to the epic must be GREEN.
- Refactor with tests as safety net.
- Update the progress file in `_bmad-output/test-artifacts/test-design-progress.md` so the next ATDD batch can reference closure status.

---

## Next Steps

1. **Bootstrap Epic 1 infrastructure** in this order (per test-design-qa.md §Dependencies):
   - B-5 config commitment.
   - Story 1.1 Turborepo + pnpm workspaces bootstrap.
   - Story 1.2 Cloud SQL + Drizzle + migration rehearsal harness (TC-8).
   - Stories 1.3 / 1.4 events + contracts packages.
   - Story 1.12 pg-boss + idempotency keyed store **+ clock provider abstraction (TC-4)**.
   - Move ASR-8 scaffolds + ASR-9 + ASR-11 first (lowest dependency depth).
2. **Move scaffolds to their target final locations** as each story's prerequisites close (the location is in each scaffold's header comment).
3. **Run `bmad-create-story` for the named target stories**, folding the per-story acceptance criteria from `TWT-handoff.md` §Story-Level Integration Guidance into each.
4. **Execute green-phase per ASR** following the Implementation Checklist above.
5. **Once all 12 ASRs green:** run `bmad-testarch-automate` to expand coverage beyond the P0 set, then `bmad-testarch-ci` to wire the PR / Nightly / Weekly lanes per the QA doc execution strategy.

---

## Knowledge Base References Applied

- **fixture-architecture.md** — composable factories + branded-type IDs in `_fixtures/test-data.ts`.
- **data-factories.md** — `synth4LMembers` generator, `newMemberSeed`, `newBankRecord` using `@faker-js/faker` with deterministic seeding.
- **network-first.md** — relevant for downstream automate workflow (network interception); minimal use here since ASR-8 is the only browser-based scaffold.
- **test-quality.md** — Given/When/Then structure, one assertion per test (mostly), property-based where determinism is the target.
- **test-levels-framework.md** — level selection (Unit property-based for ASR-2/6/9/12; Integration for ASR-1/5/7/10/11; E2E for ASR-8; Load/Chaos for ASR-3/4).
- **test-priorities-matrix.md** — all 12 ASRs are P0 by criterion (blocks core, high risk ≥ 6, no workaround).
- **api-request.md** + **auth-session.md** + **recurse.md** — applied via `@seontechnologies/playwright-utils/api-request/fixtures` import in ASR-1, 8, 10.

See `tea-index.csv` for the full knowledge fragment mapping.

---

## Test Execution Evidence

### RED Phase Verification — Static Only

Until Story 1.1 lands and the monorepo is bootstrapped, **none of these scaffolds can execute**. RED phase verification is limited to static checks:

```
Static checks (verified at scaffold creation 2026-05-29):
  Total scaffold files:        12
  Total .spec.ts lines:        1,519
  test.skip() invocations:     59
    asr-01:  4   asr-02:  6   asr-03:  3   asr-04:  4
    asr-05:  4   asr-06:  7   asr-07:  5   asr-08:  5
    asr-09:  6   asr-10:  4   asr-11:  6   asr-12:  5
  Placeholder `expect(true).toBe(true)`: 1 (ASR-6 fc.property smoke
    check inside skip; intentional, marked in comments)
  Intentional RED `expect(true).toBe(false)`: 1 (ASR-5 verifier-credential
    harness placeholder; marked in comments)
  All scaffolds reference imports that DO NOT EXIST YET (this is the point —
    activating any test will fail at module-resolution, then progressively
    pass as the contract is implemented).
```

**Expected execution evidence (once framework lands):**

```
$ pnpm test --grep @P0

  vitest run --reporter verbose

  asr-01-cross-pariwar-rls
    ↓ pariwarA admin cannot read pariwarB rows from members (skipped)
    ↓ ... (other variants skipped)

  asr-02-pool-engine-determinism
    ↓ assignMemberToPool > idempotent (skipped)
    ↓ ...

  ... (all 59 tests skipped, expected; total: 0 failed, 0 passed, 59 skipped)

  ✅ TDD RED phase verified: all scaffolds present, all skipped.
```

---

## Notes

- **The scaffolds are *forward-looking sketches* against contracts that don't exist yet.** Imports like `@twt/domain/pool-engine`, `@twt/test-utils/clock`, `@seontechnologies/playwright-utils/api-request/fixtures` are *declared targets*. They will resolve once Story 1.1 lands and `packages/*` are populated.
- **Greenfield discipline:** every scaffold uses `declare function` for un-landed APIs so TypeScript will surface mismatches the moment the real implementation arrives — a deliberate compile-time RED phase before the runtime RED phase.
- **The shared fixtures module is also forward-looking** — it will move to `packages/domain/__tests__/_fixtures/` once the monorepo is bootstrapped.
- **One intentional ASR-5 placeholder** (`expect(true).toBe(false)` in the verifier-IAM-cannot-mutate test) is flagged in the file's comments. It marks the harness that hasn't landed yet; replace with the proper `await expect(withVerifierCredential(...)).rejects.toThrow(...)` once `@twt/test-utils/iam` exists.
- **Per-UPI-app device-lab parity (ASR-6 second test in the QA doc)** is intentionally **NOT** in this batch — it's a manual checklist per `test-design-qa.md` §Tooling & Access. The scaffold here covers only the canonical URL contract.
- **No subagent execution was attempted** (single-agent runtime); sequential mode was forced. This matches the test-design's execution model — solo cadence, single-author throughput.

---

## Contact

- Solo Builder + Master Test Architect: **BigDev** (this session).
- Test design source documents: `_bmad-output/test-artifacts/test-design-architecture.md` + `_bmad-output/test-artifacts/test-design-qa.md`.
- BMAD handoff: `_bmad-output/test-artifacts/test-design/TWT-handoff.md`.

---

**Generated by:** BMad TEA Agent (Master Test Architect)
**Workflow:** `bmad-testarch-atdd`
**Mode:** Create → sequential
**Date:** 2026-05-29
