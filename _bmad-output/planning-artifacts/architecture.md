---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/briefs/brief-TWT-2026-05-22/brief.md
  - _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md
  - _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/addendum.md
  - _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/review-adversarial.md
  - _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/review-rubric.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/research/tsct-reference-learnings.md
workflowType: 'architecture'
project_name: 'TWT'
user_name: 'BigDev'
date: '2026-05-24'
lastStep: 8
status: 'complete'
completedAt: '2026-05-26'
---

# Architecture Decision Document — TWT (Teachers Welfare Trust)

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:** ~104 FRs across 14 capability clusters. Bias toward
operational core: Admin UI (16), Reconciliation (10), Pool Engine (8), Claims (8),
Rules Engine (7), Identity Lifecycle (6).

**Non-Functional Requirements** (budgets paired with the subsystem they constrain):
- Performance:
  - Cold start <3s on 3GB Android [native-stack performance budget]
  - My Pool render <500ms p95 [native-stack performance budget]
  - UPI Intent launch <1s p95 [UPI dispatch budget]
  - Reconciliation latency p95 <4h during live alerts [Reconciliation pipeline freshness
    budget]
  - FR-12A p95 <200ms at 4L members [Niyamavali rule-registry read-path budget]
  - Pool spawn (N=50, M=4L) <60s p95 [Pool Engine atomicity budget]
- Reliability: member-app ≥99.5% monthly; admin UI ≥99%; pool-spawn atomic with retry.
- Security: PII AES-256 at rest (see §2.7); TLS 1.3+ pinned at edge / internal-hop /
  external-integration hop classes (see §2.7a); cross-tenant isolation P0; tamper-evident
  audit log.
- Accessibility: WCAG 2.1 AA launch blocker for member-app primary flows and public
  Niyamavali + Sahyog pages.
- Localization: Hindi/English parity launch blocker; Devanagari validated on target
  devices.
- Data residency: PII in India per DPDPA posture; final scope per counsel.
- Backup: daily; restore tested quarterly; audit log archived separately. RTO/RPO targets
  deferred.

**Scale targets — ceiling vs launch reality:**
- Performance budgets are **steady-state ceilings at ~4 lakh active members per Pariwar**.
- Phase 1 launch reality is **1,000–5,000 members in one Bihar district**.
- Architecture must be **correct at 4L** (math, determinism, isolation) but **operable at
  1k–5k** (no 4L-scale infrastructure required to launch). At Phase 1 scale,
  single-instance infrastructure is sufficient for most subsystems; multi-instance
  deployment is a Phase 2+ trigger.

**Project complexity:** enterprise / launch-stakes (regulatory, financial, multi-tenant,
audit-grade) at solo-engineer cadence — the load-bearing tension. Primary technical
domain: full-stack — native mobile, multiple web surfaces, backend API, reconciliation
data pipeline, telephony, payments, audit-grade storage.

### Uncompromisable Subsystems

Grouped to honor the brief's "three uncompromisable subsystems" framing while elevating
two adjacent primitives whose failure modes are equally catastrophic. Bugs in any of
these are P0 incidents.

**Trust Core** — the math heart of the product:
- **Pool Engine** — auto-spawn, deterministic balanced assignment, fixed-amount-on-
  90-day-notice, audit-reproducible from snapshotted membership-at-freeze.
- **Reconciliation pipeline** — UTR self-attestation + nominee daily bank-statement
  intake + cron matcher; idempotent, replayable.

**Governance Core** — enforcement and evidence:
- **RBAC + multi-tenant data isolation** — `pariwar_id` first-class everywhere; every
  query scoped; permission keys + role bundles + scope dimensions.
- **Audit log integrity** — tamper-evident hash chain + off-site WORM-grade mirror +
  daily integrity check; mirror credentials separable from sole-engineer access.

**Critical Infrastructure** — load-bearing primitives every other subsystem depends on:
- **Niyamavali rule registry** — every eligibility check registry-driven, not hardcoded;
  versioned per Pariwar; deterministic evaluation with full provenance. The canonical
  read-path the registry exposes is the **Member Validity Service (FR-12A)** — the
  deterministic, real-time answer to "is this member valid right now?" consumed by every
  admin surface (including FR-42 signals panel) and the member's own profile.
- **UPI Intent dispatch + `tr=` idempotency** — single payment surface for support flows;
  one malformed URL = ₹310 to wrong VPA with no recourse.

### Architectural Commitments

**Load-bearing (closed at this phase):**
- Multi-tenancy via `pariwar_id` first-class on every multi-tenant table.
- UPI Intent only for member → nominee in the support flow; no payment gateway for trust
  money in v1.
- Hindi + English bilingual launch with Devanagari rendering on mid-range Android.
- PII residency in India per DPDPA posture; final scope per counsel.
- Native mobile + multiple web surfaces (member-responsive, staff admin, helpline operator
  console, public website).
- Crowdfunding Module (Phase 2/3) introduces gateway-mediated regulatory surface; v1
  architecture accommodates without compromising the gateway-free support flow.
  **Enforcement test:** support-flow code paths must not depend on payment-gateway
  interfaces; verified in architecture-spec test.
- Backend services packaged as container images; 12-factor config; secrets abstracted
  behind a provider interface.
- Substrate-agnostic adapter layer for native primitives (per FM-1) and centralized i18n
  utility — both committed regardless of substrate-conditional outcomes.
- Forward-compat hooks for trust-paid assistance benefits (FR-100, PRD §4.15) — rule
  registry payload carries a `benefit_mechanism` discriminator (`pool` | `reserve`);
  payout-destination capability reserved as an architectural slot only; Vyawastha Shulk
  receipts persisted indefinitely + reconstructable for any past date. v1 ships no
  member-side benefit, table, column, endpoint, validator, or UI for trust-paid
  assistance; Durghatana Sahayata flow itself is v2/v3. Activating the benefit at launch
  must be a greenfield addition (new entity + new endpoints), not a column/index add to
  v1 tables. See §1.13.

**Operationally committed (see Critical External Dependencies):**
- DigiLocker for Aadhaar-linked KYC + manual fallback (single data shape both paths).
- Cloudflare front + Bot Management + Turnstile.
- **Communication channels — three-tier hierarchy:**
  - **In-app push (universal):** FCM + APNs; every notification category fires
    in-app.
  - **WhatsApp Business — dual-gated:** Pariwar admin toggle (FR-72) AND member
    self-declared opt-in (architecture §3.4). Scope: Meta UTILITY templates only —
    payment reminder, payout issued, claim accepted, expiry warning, membership
    lapse. Per-Pariwar WA Business number is admin-configurable, not hardcoded.
  - **SMS — three preserved surfaces** (no bulk-alert SMS, per PRD addendum RA-29):
    (a) canonical OTP channel via DLT-transactional (PE/OE) headers (§2.2);
    (b) step-up OTP for high-trust operations (§2.2);
    (c) per-member transactional fallback when both WA gates ON and WA delivery
        fails (§3.4); plus per-Pariwar cycle-open SMS bridge for time-critical
        alerts under degraded-push + disabled-WA conditions (§3.4 existing).
  - **Telegram mirror:** TSCT-cohort honor; admin-toggleable; non-canonical;
    announcements-only.
- **In-app-engagement cost optimization (per-Pariwar, FR-58C-flag-gated):** suppress
  WhatsApp send when member acted on the same notification in-app within the
  staleness window. Time-critical templates always send through both channels
  regardless.

### Deferred Decisions (architecture-phase workload)

Each is a working assumption with a named gate, an open architectural surface, or both.
Priority tags: **[P0]** security / data correctness; **[P1]** operations;
**[P2]** scale economics.

- **Backend language / runtime / framework / API style / auth model.**
- **Native mobile stack (RN + Tamagui)** — working assumption; ratifies on P0-5
  Native-Stack Validation Experiment per UX §6. Substrate-conditional engineering work
  cannot begin until P0-5 lands. Pivot evaluation per FM-2 tiered escalation.
- **Web stack composition** — Tailwind + Radix is the UX-spec working assumption, but
  the four web surfaces have incompatible workloads (SEO-grade SSR for public site;
  telephony/CTI for helpline; heavy data tables for staff admin; member-responsive could
  fall under the native stack's web build). 3-to-4-way decision required.
- **Datastore** — must support enforceable tenant isolation, replay semantics, and
  audit-grade integrity. Row-Level Security is a candidate enforcement mechanism, not a
  requirement on the engine.
- **Cloud hosting region** — constrained to India per PII residency posture; specific
  provider/region open.
- **Deployment substrate** — Dokploy v1; documented migration path to Kubernetes gates
  on first of: 2nd Pariwar provisioning, or sustained ≥70% peak-cycle infra utilization.
- **[P1] Dokploy failure fallback for live-cycle continuity** — what happens if the
  deployment substrate itself fails during Days 12–15 of a cycle.
- **Source-code hosting** — GitHub primary; trustee-evaluable continuity escrow
  alternative needed for bus-factor mitigation.
- **Backup target + RTO/RPO targets.**
- **Design tokens** — hand-rolled TS module for v1; Style Dictionary at tenant-2 or
  first non-TS consumer.
- **[P0] Threat model + threat-actor inventory** — sole engineer with prod DB access;
  field-worker fraud rings; external scrapers; FR-43A Stage-1 reviewer collusion; hostile
  trustee. Controls defended against named actors, not in isolation.
- **[P0] DigiLocker signature verification policy** — key rotation, key-compromise
  procedure, offline-cache validity semantics. Signature correctness is the integrity
  hinge for every downstream "KYC verified" claim.
- **[P0] Bank statement normalization schema** — the common shape that all 5 bank
  parsers emit before matching. If the normalized schema is wrong, the matcher is wrong
  for every bank.
- **Idempotency store** — backend, TTL strategy, partition behavior.
- **Pool Engine snapshot** — format, hash-on-snapshot, retention alignment with
  audit-log 7-year retention.
- **[P2] Pool Engine snapshot + audit-log storage volume sizing** — at 4L scale,
  snapshot rows reach tens of millions and audit lines exceed 170M; drives storage-tier
  choice and whether the audit log shares the operational datastore or lives separately.
- **Audit log mirror target** — WORM-grade store choice; integrity-check execution
  environment separable from sole-engineer access; Merkle-root publication channel.
- **Reconciliation matcher mechanism** (OQ-2) — parser strategy; dispute sub-flow.
- **[P1] Observability stack split** — structured-event ingestion; metrics; traces;
  alerting. Four decisions with different managed-vs-self-hosted trade-offs; each
  separately deferred.
- **[P1] Infrastructure on-call rotation** — distinct from P0-1 loop-node fallback.
  Matcher-cron failure, audit-integrity-check failure, push-provider outage are
  different problems from claim/verification handoff.
- **[P1] Capacity-planning indicators** — named metrics (pool spawn time, statement-
  intake queue depth, FR-12A p95 trend) whose movement triggers multi-instance
  deployment.
- **Job runner** for time-as-actor (SIE) transitions; clock-skew tolerance across
  instances.
- **[P1] Feature-flag tool selection** — load-bearing dependency for DigiLocker-
  mandatory cutover (§2.8) and other FR-58C-gated migrations. **Decision gate:**
  selection must be operational before the first FR-58C-gated cohort rollout;
  canonical acceptance is the DigiLocker-mandatory canary rollout (per PRD A-4
  timeline: 6–12 months post-launch). Architecture commits Cross-Cutting #15
  properties + Test + flag governance lifecycle; the specific tool is committed
  in an ADR.

  **Selected implementation must demonstrate** (outcome-oriented; vendor-neutral):
  - **Deterministic evaluation** — same cohort + same flag identity + same
    version yields the same result; output is reproducible for replay (Cross-
    Cutting #4).
  - **Tenant isolation** — flag definitions and evaluations scoped by
    `pariwar_id`; cross-tenant leakage is structurally impossible (Cross-Cutting
    #1).
  - **Replay safety** — historical flag states are queryable for past
    evaluations; flag changes carry version + effective-at timestamps.
  - **Auditability** — every flag-state change emits a tamper-evident audit
    line (§1.5 hash chain); inventory enumerable + inspectable by Pariwar Admin
    and above; no concealed flags (Cross-Cutting #15).
  - **Offline resilience** — flag evaluation continues to work under provider
    outage with a documented fallback default per flag; the default is part of
    the flag's lifecycle metadata.
  - **Lifecycle accountability** — each flag carries a named owner +
    expected-retirement signal + dead-by date (per Test + flag governance).
  - **DPDPA-compatible posture** — any flag gating member-PII-touching surfaces
    honors India residency; flag evaluation does not require PII outbound.

  **Capability bars are acceptance criteria for future ADRs and are intentionally
  vendor-neutral.**
- **Pariwar-Passport data model in v1** (FR-63) — cross-Pariwar identity schema lands
  even though member-facing UI is v2.
- **Per-tenant custom fields via JSON columns** (FR-54) — indexing, validation, query
  patterns, type-safety in application layer.
- **Telephony integration** for the Helpline Operator console (Persona #7).
- **Object storage** for KYC docs, death certificates, Contribution Note PDFs, bank
  statements.
- **Bank statement intake pipeline** — 5-bank parser allowlist (SBI, PNB, BoB, BoI, +1
  Bihar cooperative); UX commits 50 golden-file tests per bank.

### Critical External Dependencies (fragile surfaces)

- **DigiLocker** — govt API with OAuth-style flow, signed Aadhaar document format, rate
  limits, downtime patterns, signature verification, and provider-approval gating (A-4).
  Optional → mandatory switch is itself a migration gated by FR-58C. Isolate behind a
  provider interface so parser, rate-limit, and downtime concerns don't leak into the
  membership lifecycle.
- **[P0 — CLEARED 2026-06-21] Edge / WAF surface — Cloudflare ↔ India-PII residency.** Cloudflare is
  the v1 default; DPDPA compatibility per legal review is **cleared** — Story 0.13 counsel
  Adv. Mohit Agrawal returned "acceptable as designed" (`.decision-log.md` Decision 2026-06-21-057),
  and the provider is committed + ≥2-trustee-ratified in **ADR-0010**. The committed pivot
  path is retained (reversibility if the posture is later withdrawn). Architecture commits
  the property requirements (§5.8a Edge / WAF capability bar); the specific
  provider is committed in that ADR (legal review cleared). **Pivot readiness:**
  Cloudflare-dependent sections (§2.1, §2.11, §3.11, §5.8) must identify
  substitution boundaries and avoid irreversible coupling; substitution points
  enumerated in §5.8a.
- **WhatsApp Business API** — Meta-controlled template approval, throughput tiers,
  suspension risk, DPDPA compliance. Same external-regulatory shape that killed SMS.
  Architecture abstracts behind a channel-provider interface so alternative channels are
  drop-in.
- **[P1] Dokploy** — relatively young deployment substrate with reported production-
  stability questions in the community. Live-cycle fallback path required (see Deferred
  Decisions).
- **Bank statement intake** — each bank's format is independently fragile; parser
  shipping schedule gates Phase 2 statewide rollout (not Phase 1 single-district).
- **External-regulatory gates (Phase-0 prerequisites; final scope per counsel):** Indian
  Trust Act registration (Bihar); 12A/12AB; GST (likely required from launch given module
  commissions); 80G (Phase 2/3 readiness); DPDPA Data Fiduciary registration; CPA 2019
  internal appeal flow (FR-43A); RBI/UPI rate-limit workaround via dual nominee bank
  accounts; TDS §194H on field-worker commission.

### Cross-Cutting Concerns

Each names the *what*; the *enforcement mechanism* is committed where decided and listed
under Deferred Decisions where not.

1. **Multi-tenant isolation** — every query scoped by `pariwar_id`; typed constraint at
   the data layer; adversarial cross-Pariwar read test in CI; any leak is P0.
2. **Audit-grade observability** — every state transition emits structured event; audit
   log tamper-evident via hash chain + off-site WORM-grade mirror replicated every 6h;
   daily integrity check; Merkle-root publication (v1-S). Mirror credentials and check
   execution separable from sole-engineer access.
3. **Idempotency** — keyed store with explicit TTL covering UPI Intent `tr=` (per
   member×alert), reconciliation matcher input dedup, pool assignment evaluation, bulk
   admin operations.
4. **Determinism & replay** — Pool Engine assignment reproducible from snapshotted
   membership-at-freeze; rule-registry evaluations carry full provenance for replay.
   *Canonical financial truth (§3.6):* confirmed-contribution truth derives EXCLUSIVELY
   from the `contribution.confirmed` event-derived state (never reconstructed from
   inputs); the only un-confirm path is the trustee-attested
   `reconciliation.confirmation-reversed` compensating event — enforced by the executable
   fence in `packages/domain/tests/contribution/` (Story 9.5).
5. **i18n at the core** — centralized formatting utility; CI lint against inline
   formatting; Devanagari display / body / numeric typeface separation; Hindi numerals
   reserved for ceremonial Devanagari prose (v4 amendment).
6. **DPDPA compliance** — consent registry (per surface, per category, revocable), RTBF
   flow (soft-delete + anonymize, no refund), data export, India residency, breach
   reporting, DPO appointment.
7. **PII shielding** — Public-vs-Private matrix in a single enforcement layer; automated
   CI scrape-test asserts no "Never public" fields leak from public surfaces.
8. **Friction-as-budget** — per-PR CI gate validates declared `payer` + `protects` per
   UX Stance #2.
9. **Staff-fallback at every node** — Account State Machine drives screen-mode
   parameters; every loop node carries `{primary_actor, fallback_actor,
   escalation_trigger}`. P0-1 gates Phase 1.
10. **Channel-provider abstraction** — single canonical `alert` payload renders across
    all channels behind a swappable provider interface; alternative channels are drop-in.
11. **Regulatory surface as architectural workload** — module-commission flows carry
    tax-calculation logic; field-worker payouts carry per-payment deduction; FR-43A
    appeal flow is a separate state machine with SLA tracking, evidence-trail, and
    separation-of-duties (Stage 1 reviewer ≠ original decision-maker). Specific tax-law
    applicability per counsel.
12. **Account State Machine as first-class architectural primitive** — Account State
    is atomically computed across claim / member / pool / alert state primitives.
    Member-state primitive enumerated in **§1.14** (renewal-grace states load-bearing
    for FR-12A validity service). Claim-state, pool-state, alert-state primitives and
    the composition rules producing the full Account State (including the frozen-*
    end states named in §3.4) are the subject of a focused follow-up architectural
    workload — flagged in §Gap Analysis.
13. **Intake Convergence Points (ICPs)** — every channel-merge node specifies dedup key,
    in-flight session visibility across channels, override semantics under race
    conditions.
14. **Time-as-actor (SIE)** — non-punitive state transitions on scheduled time; no
    punitive auto-action (UX Stance #5).
15. **Feature-flag staged-rollout** — canary → graduated cohorts + automatic rollback on
    error-rate spike; inventory visible to Pariwar Admin and above; no "secret" flags.
16. **Pariwar-Passport data model in v1** (FR-63) — cross-Pariwar identity schema lands
    even though member-facing UI is v2.
17. **Per-tenant custom fields** (FR-54) — schema-flexible per-Pariwar fields with
    indexing, validation, and query strategy.
18. **Compound read models for operator surfaces** — Anita's verifier console must load
    in ~5 seconds with no N+1; denormalized read store with freshness budget targeted to
    real-time within seconds (stale reads risk ₹50L wrong-claim approvals). Each
    disbursement decision authorizes ~₹50 lakh; UX flagged this surface as exceptional
    design budget (15–30 packets/day).
19. **Disaster handling** (FR-98) — mass-casualty windows throttle claim spawn over
    months; queue-rollover semantics; alert-engine throttling config; member-comms
    framing de-emphasizes urgency.
20. **Solo-build operational continuity** — runbooks, credential escrow, code escrow
    with trustee-evaluable engineering steward, named backup engineer (A-13,
    unconfirmed), degradation policy. *Detailed operational architecture deferred to a
    dedicated step; surfaced here because it informs every decision criterion (prefer
    mainstream tools, typed over dynamic, self-documenting over clever).*
21. **[P0] Cross-Pariwar identity carve-out** — Pariwar-Passport tables (FR-63) are the
    explicit exception to Cross-Cutting #1 "every query scoped by `pariwar_id`."
    Isolation carve-out specified at the data layer; cross-Pariwar query patterns
    enumerated when v2 UI lands.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack TypeScript monorepo with:
- Native mobile (Expo + RN + Tamagui)
- Multiple web surfaces (public website, staff admin including helpline operator console
  as a feature module, member-responsive)
- Backend API (Fastify + Drizzle + Postgres) with background jobs (matcher, audit,
  scheduler)
- Shared packages (tokens, i18n, domain, contracts, api-client, platform-adapters,
  bank-parsers, events)

### Starter Options Considered

Three serious shapes were evaluated:

1. **`tamagui/starter-free`** — official Tamagui monorepo (Expo + Next.js + Solito +
   Tamagui). *Rejected:* bundles Next.js for web surfaces; user chose Astro for public
   site. Would require ripping out Next and re-assembling.

2. **`create-universal-app`** — opinionated fullstack (Expo + Next + tRPC + Prisma +
   Clerk + Tamagui). *Rejected:* deprecated January 2026; bundles Prisma not Drizzle;
   bundles tRPC + Clerk (auth model still deferred); too many decisions made for us.

3. **`create-turbo` baseline + per-app scaffolds** — empty Turborepo + pnpm workspaces
   skeleton, then scaffold each app using its native generator. *Selected:* respects all
   four discovery answers exactly, no decisions imposed beyond what was already
   committed, future apps are additive.

### Selected Starter Foundation: Turborepo + pnpm workspaces

**Why Turborepo over Nx:**
- Turborepo is the right default for most TS monorepos in 2026 (simpler setup, excellent
  caching, smaller mental model).
- Nx is faster at large CI scale (~7× in some scenarios), but Nx's generators + integrated
  ecosystem are dead weight for solo-build cadence — Solo Builder mental-model overhead
  is the dominant cost.
- Bun workspaces is viable but less battle-tested for production monorepos at TWT's stake.

### Workspace Layout — Bootstrap (Day 1)

Deployment units shaped to honor the "correct at 4L, operable at 1k–5k" principle
(Step 2). At Phase 1 most jobs run alongside the API; the workspace separation
establishes the boundary now so the future split is a deployment-config change rather
than a refactor.

```
apps/
  mobile/      # Expo + Tamagui native
  public/      # Astro 6 SSR
  admin/       # Vite + React + Tailwind + Radix
    modules/   # Feature modules
      helpline/  # Helpline Operator console (CTI/telephony lives here at v1)
  api/         # Fastify HTTP API
    modules/   # Feature modules (member, pool, claim, rules, alert, etc.)
    telephony/ # CTI signaling sub-module
  jobs/        # Background jobs
    matcher/   # Reconciliation cron
    audit/     # Audit-integrity check + Merkle-root publication
    scheduler/ # SIE driver, alert state-machine, renewal-grace progression
packages/
  tokens/             # Design tokens (hand-rolled TS module per UX §6)
  i18n/               # Centralized locale + formatting utilities
  domain/             # Drizzle schema + RLS policies + tenant rules + validators
                      # + shared domain types
  contracts/          # Transport-layer contracts: DTOs, validation schemas,
                      # request/response shapes (HTTP/RPC). Distinct from events.
  api-client/         # Typed API client generated from contracts; consumed by frontends
  platform-adapters/  # FM-1 substrate-agnostic adapter layer (native + future web)
  bank-parsers/       # Statement parser allowlist + golden files (per-Pariwar scoped)
  events/             # Internal event contracts for replay/audit. Immutable.
                      # Corrections emit new events; never mutate existing ones.
docs/
  adr/                # Architecture Decision Records
```

### Package Boundary Rationale

- **`packages/domain/`** holds the system's identity: Drizzle schema, RLS policies,
  tenant rules, validators, shared domain types. The database is one expression of the
  domain, not the system's identity.
- **`packages/contracts/`** holds transport-layer contracts (HTTP/RPC DTOs, validation
  schemas, request/response shapes). Kept distinct from `events/` because transport
  contracts and internal event contracts evolve on different cadences and serve different
  consumers.
- **`packages/events/`** holds internal event contracts for replay/audit. **Events are
  immutable**: a correction emits a *new* event referring to the original; no event row
  is ever rewritten. This rule protects the replay foundation that Pool Engine
  determinism (Step 2) and audit log integrity both depend on.
- **`packages/platform-adapters/`** holds the FM-1 substrate-agnostic adapter layer. The
  adapter pattern generalizes beyond native (member-web split may consume it; P0-5 pivot
  may swap the substrate behind the same adapter contract).

### Split Triggers (define now, fire later)

A sub-module (`apps/api/modules/*`, `apps/admin/modules/*`, or `apps/jobs/*`) graduates
to its own top-level app workspace when **any** of the following fires:

- **Independent credentials** required (e.g., audit-integrity check must use credentials
  separable from sole-engineer prod-DB access per C-3 fix).
- **Independent scaling** required (e.g., matcher cron sustained at >70% utilization
  while API is at 20%).
- **Independent connection lifecycle** required (e.g., telephony CTI signaling lifecycle
  distinct from HTTP API restart cycle).

Expected graduation candidates (when triggers fire, not pre-scaffolded):
- `apps/helpline/` — graduates from `apps/admin/modules/helpline/` on the connection-
  lifecycle trigger.
- `apps/telephony-bridge/` — graduates from `apps/api/telephony/` on the connection-
  lifecycle trigger.
- `apps/worker-audit/` — graduates from `apps/jobs/audit/` on the credential-
  separability trigger.
- `apps/crowdfunding-api/` — emerges when Phase 2/3 ships (gateway-dependent code
  isolated from support-flow code).

### Crowdfunding Boundary Rule (no placeholder app)

Phase 2/3 concerns must not create empty workspaces in v1. The Step 2 enforcement test
(*support-flow code paths must not depend on payment-gateway interfaces*) is realized by
two layered boundary rules:

1. **Module-level boundary.** Crowdfunding code, when it ships, lands under
   `apps/api/modules/crowdfunding/`. CI import-rule lint forbids any import from
   `crowdfunding/` into support-flow modules (member, pool, claim, alert, reconciliation,
   rules).
2. **Dependency-level boundary.** **Payment-gateway SDKs (Razorpay, Cashfree, or any
   equivalent) are prohibited as dependencies outside the crowdfunding boundary.** CI
   dependency-graph lint enforces: no support-flow workspace or module may declare a
   gateway SDK in its dependencies, direct or transitive. This protects the support flow
   structurally — not just by discipline.
3. Crowdfunding integration tests must not accidentally import payment-gateway types into
   the support-flow test surface.
4. When the boundary becomes structurally insufficient (e.g., gateway SDK forces module-
   level side effects on import), `apps/api/modules/crowdfunding/` graduates to
   `apps/crowdfunding-api/` per the split-trigger criteria.

### Member-Responsive Web — Deferral with Named Triggers

Initial choice: use Expo-router-web from `apps/mobile/` to share components with native.
Split out as `apps/member-web/` (new SSR app) when **any** of the following fires:

- SEO-relevant member-portal pages identified outside `apps/public/` scope.
- Expo-router-web SSR fidelity insufficient for measured indexing.
- Admin / trustee demand for member-portal-on-laptop without app install becomes a
  recurring helpdesk pattern.

**Cross-surface rendering policy — public pages with login-walled fragments.**

Some public pages serve both non-members and authenticated members at the same
URL, with member-only fragments rendered alongside public content (e.g., FR-77
Sahyog Vivran shows public story + verifiers + contributor count to everyone;
nominee bank details only to logged-in members during a live pool).

**Architecture commits the composition contract** (outcome-oriented; vendor-
neutral):
- The public page is composed of a **cache-safe public SSR shell** plus
  **registry-declared authenticated fragments** that hydrate client-side.
- The SSR shell renders only public content (per FR-74 Public-vs-Private
  matrix); the SSR output contains no PII, no member-state, and no
  auth-derived branching.
- Authenticated fragments hydrate after page load. Non-authenticated visitors
  see a public-fallback state baked into the SSR output (e.g., "log in to see
  contribution details").
- The **auth boundary lives at the API**
  (`apps/api/modules/public-pages/`), not at the page or the edge —
  authenticated fragment requests cross the boundary the same way other
  authenticated API calls do (§2.4 session model). No special-case auth
  surface is introduced at the public page layer.

**Cache-safe public SSR guarantee.** Public SSR output is cacheable at the
CDN / edge under standard public-cache semantics — it contains no member-
conditional content, no session-derived branching, no PII. The cache-safety
guarantee is enforced structurally (through type system, build-time check, or
equivalent mechanism committed in an ADR), not through documented discipline.
Member-conditional content lives exclusively in authenticated fragments that
cross the auth boundary at the API.

**Why this pattern:**
- Single URL serves both audiences; SEO continuity preserved for public
  content.
- Public SSR stays minimal-JS for the non-member view; only authenticated
  fragments ship hydration JS.
- Member-facing payment flow remains canonical in `apps/mobile/` (My Pool
  card); the public page's bank-detail fragment is a secondary view for
  members on a laptop or non-app device.
- Cache-safe SSR means the public page is CDN-cacheable without risk of
  leaking PII across visitors.

**Registry-declared fragments (v1).** Every authenticated fragment on a
public page is declared in a fragments registry. v1 ships with:
- **FR-77 Sahyog Vivran:** nominee bank account + IFSC fields, payment
  status, UPI Intent CTA (deeplinks to `apps/mobile/`).

**Migration boundary for `apps/member-web/` split** (existing triggers
above): when `apps/member-web/` ships, registry-declared fragments may
migrate to that workspace without changing the API auth boundary or the
public SSR shell's cache-safety guarantee.

**Capability bars are acceptance criteria for future ADRs and are
intentionally vendor-neutral.**

### Initialization Commands (the "first implementation story")

```bash
# 1. Monorepo skeleton (Turborepo + pnpm workspaces)
pnpm dlx create-turbo@latest twt --package-manager pnpm

cd twt

# 2. Native app — Expo + Tamagui (P0-5 ratifies the substrate)
pnpm dlx create-tamagui@latest apps/mobile --template expo-router

# 3. Public website — Astro 6
pnpm create astro@latest apps/public

# 4. Staff admin web (hosts helpline operator console as a module) — Vite + React + TS
pnpm create vite@latest apps/admin -- --template react-ts
mkdir -p apps/admin/modules/helpline

# 5. Backend API — manual Fastify + TS + Drizzle scaffold in apps/api/
#    Reference: dev.to/vladimirvovk/fastify-api-with-postgres-and-drizzle-orm
mkdir -p apps/api/{modules,telephony}

# 6. Jobs — single workspace, sub-directories per job
mkdir -p apps/jobs/{matcher,audit,scheduler}

# 7. Shared packages — all created at bootstrap (empty TS modules at first)
mkdir -p packages/{tokens,i18n,domain,contracts,api-client,platform-adapters,bank-parsers,events}

# 8. ADR directory — populated in the second PR
mkdir -p docs/adr

# 9. Dockerfile per deployable workspace — minimal at bootstrap
#    Every apps/* workspace (including apps/jobs/) gets a Dockerfile from day 1;
#    Turborepo task graph builds container images.

# 10. Per-Pariwar build profile — turbo.json + apps/mobile/eas.json
#     Bihar profile defined at v1; future Pariwars add a profile, not a convention.
```

### Architectural Decisions Provided by the Starter Foundation

**Language & runtime:**
- TypeScript everywhere.
- Runtime versions governed by a compatibility matrix and CI baseline (specific minimums
  per workspace; declared in ADRs, not pinned in this section).
- Native: Hermes (Expo default).

**Workspace + build orchestration:**
- pnpm workspaces (efficient install, strict dependency hygiene).
- Turborepo task graph + remote cache; CI-friendly out of the box.
- No release/versioning included — Changesets to add later if multi-package publishing
  matters.

**Per-surface scaffolds give us:**
- Expo Router for native navigation (Tamagui-compatible).
- Astro 6 with server islands, view transitions, Vite 7.
- Vite React-TS for admin SPA (helpline as module; HMR, fast builds).
- Fastify + Drizzle assembled manually (most control; aligned with Critical Infrastructure
  correctness discipline).

**Replay foundation (`packages/events`):**
- Event contract schemas (shape, version field, semantic meaning).
- Canonical serialization (deterministic JSON for hash-chain compatibility with audit log).
- Versioning policy (additive-only fields within a major version; major-version bumps
  carry migration notes).
- **Immutability:** events are never mutated; corrections emit new events referring to
  the original.
- Consumed by Pool Engine snapshot writers, audit-log writers, reconciliation matcher,
  alert-state-machine driver, and any future event-sourced surface.

**Transport contracts (`packages/contracts`):**
- DTOs, validation schemas, HTTP/RPC request/response shapes.
- Single source of truth for client/server contract; `packages/api-client/` generates a
  typed client from these.
- Distinct from `packages/events/` — transport contracts and internal event contracts
  evolve on different cadences.

**Container packaging:**
- Dockerfile per **deployable workspace** from day 1 (every `apps/*`, including
  `apps/jobs/`).
- Turborepo task graph builds container images as a step.
- K8s migration trigger (Step 2) becomes a topology change, not a packaging retrofit.

**Per-Pariwar build profile:**
- `turbo.json` profile convention with `bihar` defined at v1.
- `apps/mobile/eas.json` Expo build profile per Pariwar.
- 2nd Pariwar adds a profile entry, not a convention.

**Code organization:**
- `apps/` — runnable surfaces (one per deployment unit; sub-modules carve future split
  boundaries).
- `packages/` — shared libraries.
- `docs/adr/` — Architecture Decision Records (ADRs) for every load-bearing choice.

**Development experience:**
- Hot reload across all surfaces (Expo, Astro, Vite, Fastify watch).
- One `pnpm i` for the whole tree.
- `turbo run dev --filter=mobile` style filtered runs.
- One TS configuration root with per-app extensions.

### Decisions the Starter Foundation Does NOT Make (still deferred per Step 2)

- Auth model (cookie session, JWT, OAuth-style, etc.).
- API style (REST, tRPC, GraphQL — Fastify supports all).
- Job runner (BullMQ + Redis, pg-boss, Inngest — for SIE + matcher cron).
- Idempotency store backend.
- Observability stack.
- Datastore-as-managed (Neon, Supabase, self-hosted Postgres on Dokploy) — RLS support
  gates the choice.
- Telephony provider for helpline console.
- DigiLocker integration patterns.
- Bank statement parser strategy (parser implementations land in
  `packages/bank-parsers/`; per-Pariwar subdirectories established when a 2nd Pariwar
  provisions).
- Runtime-version minimums (declared per workspace in ADRs).

### Initialization Sequence

The bootstrap should land as two PRs:

1. **PR-1: Skeleton.** Turborepo + pnpm + all `apps/*` + all `packages/*` + Dockerfiles
   + ADR directory + per-Pariwar profile convention. Empty implementations; verifies
   the whole tree builds + lints + types-checks.
2. **PR-2: ADRs + multi-tenant scaffolding discipline.** Initial ADR set (Turborepo
   choice, Tamagui choice, Fastify choice, Drizzle over Prisma, Astro over Next.js,
   Postgres + RLS multi-tenant strategy, helpline-as-admin-module decision, runtime
   compatibility matrix). `pariwar_id` schema discipline in `packages/domain/`; FM-1
   adapter (`packages/platform-adapters/`) first concrete passthrough; centralized i18n
   stub; events package contract conventions including immutability rule; contracts
   package shape; gateway-SDK dependency-lint rule wired into CI.

Subsequent stories add feature workspaces and graduations as triggers fire.

### Sources

- [create-turbo CLI reference](https://turborepo.dev/docs/reference/create-turbo)
- [Astro 6 release notes](https://astro.build/blog/astro-6-beta/)
- [Drizzle ORM RLS docs](https://orm.drizzle.team/docs/rls)
- [Fastify + Drizzle + Postgres tutorial](https://dev.to/vladimirvovk/fastify-api-with-postgres-and-drizzle-orm-a7j)
- [Tamagui Expo guide](https://tamagui.dev/docs/guides/expo)
- [tamagui/starter-free](https://github.com/tamagui/starter-free)
- [Nx vs Turborepo comparison](https://daily.dev/blog/monorepo-turborepo-vs-nx-vs-bazel-modern-development-teams/)

## Core Architectural Decisions

### Category 1: Data Architecture

#### 1.1 Datastore — Managed Postgres in India region

**Decision:** Managed Postgres in an India region — **GCP Cloud SQL Postgres**
(`asia-south1`, Mumbai), per §5.1. PostgreSQL RLS first-class support is a hard
requirement; Cloud SQL satisfies it.

**Rationale:** Managed-in-India satisfies the DPDPA residency posture, transfers
operational burden (backups, patching, point-in-time recovery, multi-AZ) off the Solo
Builder, and aligns with the bus-factor mitigation goal. The provider choice is an
operational decision within a closed architectural envelope.

**Region outage policy required.** A documented response to in-region Postgres outage
during a live cycle must be committed. Specific topology (replica location, promotion
mechanism, RTO/RPO targets) deferred to Category 5 (Infrastructure).

**Connection pool policy.** Pool sizing committed in Category 5 (Infrastructure) with
named ceiling per workspace; queue-vs-reject behavior committed there. Per-workspace
pool isolation principle: jobs use a separate pool so a worker spike doesn't starve
member-facing requests.

**Affects:** Backup target [P2]; cloud hosting region (Step 2 Deferred Decision —
resolved to India per DPDPA); audit log storage location; observability stack
provider choice.

#### 1.2 Multi-tenant isolation — Postgres Row-Level Security via `pariwar_id`

**Decision:** RLS as the typed-constraint enforcement of Cross-Cutting #1. Drizzle's
`pgPolicy` declarative API defines policies inside the schema. Per-request session
variable (set at request-handler entry from authenticated context) scopes every query.

**Rationale:** RLS is the only mechanism that makes cross-tenant isolation a database
guarantee rather than an application discipline. Step 2 Cross-Cutting #1 commits "every
query scoped by `pariwar_id`; typed constraint at the data layer." RLS is that
constraint.

**Carve-out:** Pariwar-Passport tables (Step 2 Cross-Cutting #21) are the explicit
exception. Their RLS policies allow cross-Pariwar reads under named conditions; the
policies live in `packages/domain/` alongside scoped-table policies and are reviewed
together when the v2 cross-Pariwar UI lands.

**Service-role connections (background jobs):** workers operate across Pariwars by
design (matcher, audit-integrity, scheduler). RLS isolation extends to the worker layer
through three rules:
- Service-role connections set the `pariwar_id` session variable per job execution —
  even when processing one tenant at a time inside a multi-tenant batch.
- Operations that legitimately span tenants are a named code surface
  (`packages/domain/cross-tenant/`); every cross-tenant read writes an audit line
  capturing actor + reason + tenant set.
- CI import-rule lint forbids constructing service-role connections outside the named
  cross-tenant operations module.

**RLS regression discipline:**
- **Policy regression test in CI.** Every RLS policy in `packages/domain/` ships with
  positive (allowed query returns expected rows) and negative (forbidden query returns
  empty or raises) assertions.
- **Session-variable middleware enforcement.** Fastify request lifecycle sets the
  `pariwar_id` session variable at handler entry; absence raises a 500 with structured
  error, not silent empty results.
- **Connection-level fail-closed.** Any database connection without a set `pariwar_id`
  raises at first query attempt, except for connections opened inside the named
  cross-tenant operations module.

**Defense-in-depth on `pariwar_id` resolution:**
- **Session-variable re-parse.** The middleware re-parses `pariwar_id` as a strict UUID
  at the middleware boundary, independent of auth output; fail-closed on parse error.
  Auth correctness + middleware re-parse = two independent guards.
- **Active-scope resolution for multi-Pariwar identities.** Every authenticated request
  has exactly one active `pariwar_id` derived from a deterministic source (URL path,
  explicit session selection, or token claim). Multi-Pariwar users must explicitly
  select active scope; ambiguous requests are rejected. Resolution mechanism committed
  in Category 2 (Auth); the data-model implication — that the user-to-Pariwar
  membership set is queryable at session start — is committed here.

**Cross-tenant operations enforcement:**
- Cross-tenant reads are exposed only via a helper that emits the audit line as part of
  its contract; the audit write is structural, not documented discipline.
- The cross-tenant module's exports are limited to the helper and its variants.
- CI import-rule lint forbids raw service-role connection construction outside the
  cross-tenant operations module.

#### 1.3 Validation library — Zod

**Decision:** Zod for transport-layer validation (in `packages/contracts/`) and any
runtime validation surface that crosses a workspace boundary.

**Integration discipline (drizzle-zod compatibility note):** A known incompatibility
exists between drizzle-zod's generated `BuildSchema` and `fastify-type-provider-zod`'s
expected `zod.Object` interface. The architecture's response:
- Transport-layer Zod schemas in `packages/contracts/` are hand-written, not
  drizzle-zod-generated.
- drizzle-zod may be used for internal parsing inside `packages/domain/` where transport
  validation is not required.
- The hand-written contracts can co-evolve with the Drizzle schema via type tests
  (TS-level assertions that contract types are assignable from inferred schema types)
  without depending on drizzle-zod at runtime.

**Contract-domain drift detection:**
- **Type tests in CI.** Assertion files in `packages/contracts/` declare that contract
  types are assignable from inferred Drizzle types (or explicitly diverge with a
  comment); CI fails on drift.
- **Validator-presence lint.** Custom lint rule asserts every route in
  `apps/api/modules/` declares a Zod validator; CI gate.

#### 1.4 Cache + idempotency + job queue — Postgres-only for v1

**Decision:** No Redis at Phase 1. Postgres-only for cache, idempotency keys, and job
queue:
- **Job queue:** pg-boss (12.x current as of Jan 2026) for matcher cron, audit-integrity
  cron, SIE scheduler, and any future background job. Uses Postgres tables; ORM-aware
  transaction adapters available for Drizzle.
- **Idempotency keys:** Postgres advisory locks + an idempotency-key table with TTL
  cleanup via pg-boss-scheduled vacuum job.
- **Cache:** Cache-aside pattern with explicit invalidation on writes; in-process
  request-scoped memoization where appropriate.

**Add-Redis trigger:** sustained pg-boss queue depth growing under load with no other DB
pressure; or cache invalidation latency becoming a measurable bottleneck for FR-12A's
200 ms p95 budget at scale. Until then, Redis is dead weight.

**Rationale:** Aligns with "Phase 1 operability — no 4L-scale infrastructure required to
launch" (Step 2). Single backing store; fewer credentials; fewer failure modes; one
backup story.

**Saga pattern for multi-step background work.** Long-running multi-entity operations
(pool spawn across 4L members for N pools, batch reconciliation, mass-amendment cache
invalidation) are structured as sagas with per-step checkpoints:
- Parent job spawns child jobs (one per logical sub-unit, e.g., one per pool); parent
  completes only when all children complete.
- Idempotency by domain-natural uniqueness (e.g., `(alert_id, claim_id) → pool_id`);
  re-running a child job is a no-op when output already exists.
- Replay from checkpoint after worker crash; pg-boss retry on each child is independent.

**Job-class priority.** Three classes:
- **Class A — member-facing real-time:** UPI Intent generation, UTR validation, FR-12A
  recompute on amendment.
- **Class B — operational SLA:** matcher cron, alert state transitions, helpdesk ticket
  routing.
- **Class C — background:** audit integrity, statement parsing, analytics aggregation.

Disaster windows (FR-98) elevate Class A guarantees; Class C work is throttled or paused
per the trustee-marked disaster window.

**Dead-letter handling:**
- Jobs that exhaust retries move to a dead-letter state in pg-boss.
- Per-class handling: Class A failures escalate to on-call immediately; Class B/C
  accumulate and are triaged daily through the staff admin triage queue.
- Dead-letter accumulation past named threshold alarms (Category 5 Observability).

#### 1.5 Audit log storage — Two-tier (Postgres hot + S3 Object Lock cold)

**Decision:**
- **Hot tier (Postgres, last 90 days):** native partitioning on `created_at`; daily
  partition; hash chain (`this_hash = hash(prev_hash + canonical(entry))`) computed at
  insert time.
- **Cold tier (canonical, Cloud Storage in `asia-south1`):** **GCP Cloud Storage** with
  **Bucket Lock + Object Retention Lock** (Cohasset-assessed WORM-equivalent; per §5.2).
  Retention-locked objects are structurally immutable until retention expiry;
  administrative principals cannot delete or shorten retention during the active
  retention window. 7-year retention per FR-47.
- **Integrity check job (`apps/jobs/audit/`):** daily verification that the hash chain
  is intact across both tiers; chain breaks raise P0 incident. Job runs against the S3
  canonical copy, not the operational Postgres — separable from sole-engineer prod-DB
  access per C-3 fix.
- **Merkle-root publication (v1-S):** daily aggregate hash published to a trustee-
  controlled channel (named in ADR).

**Rationale:** S3 Object Lock in Compliance mode is structural immutability, not policy.
Postgres hot tier serves queryability for Auditor role + helpdesk investigation. The
boundary aligns with the C-3 separability requirement.

**Storage volume sizing [P2 deferred decision from Step 2]:** at 4L scale and ~170M+
audit lines over 7 years, S3 Standard-IA + lifecycle-to-Glacier-Instant-Retrieval at the
1-year mark is the expected tier strategy. Specific lifecycle policy committed in an ADR.

**Integrity check distinguishes two failure modes:**
- **Replication-lag detector** — Postgres tracks last-successfully-replicated entry
  sequence; alarms when lag exceeds the operational threshold (named in Category 5
  Observability).
- **Chain-integrity check** — verifies the chain is intact up to the last replicated
  mark; compares hot-tier chain after the mark to detect tampering during the
  replication-lag window.

Two alarms, two response paths: lag triggers an ops runbook; chain break triggers a P0
incident.

**Write-path scoping:**
- **Write-via-restricted-IAM-role** scoped to append-only object-name patterns matching
  the hash-chain sequence; no overwrites permitted by the role.
- **Cross-project isolation under enforced org policy** (per §5.2, IAM Isolation
  Commitment §2.10a): the Cloud Storage write role lives in a dedicated GCP project
  (`twt-audit-mirror`) under org-policy constraints that prevent cross-project
  service-account impersonation and cross-project IAM grants by org-level admins. The
  read role used by the integrity-check job lives in a separate GCP project. Aligns with
  Step 2 "mirror credentials separable from sole-engineer access."
- **Bucket IAM policy denies writes from any principal except the named write role** —
  belt-and-braces against IAM misconfiguration.

**Hash algorithm:** SHA-256 for hash-chain entries and canonical JSON hashing across the
system. Algorithm choice and upgrade path recorded in an ADR.

**Bounded undetectable audit-loss window.** The architecture commits that the window
during which audit-log tampering or deletion could go undetected is bounded and
observable. The specific topology (continuous replication, dual-write, batched mirror
cadence, or other mechanism) is committed in Category 5 (Infrastructure /
Observability). What is fixed here: the bound exists, its current value is queryable,
and operations are alerted if it is exceeded.

**Canonical JSON specification.** A single canonical-JSON specification is committed in
an ADR — one library, one version across all consumers of the `packages/events/` hash
chain. All hash producers and verifiers (Pool Engine snapshot writers, audit-log
writers, integrity-check job) use the same canonicalizer. Divergent canonicalization is
a build-time error.

#### 1.6 Pool Engine snapshot storage — Postgres hot + S3 cold

**Decision:** Snapshot rows in Postgres for the last 12–18 months of cycles (active +
recent-replay window); archived to Cloud Storage in `asia-south1` with Object Retention Lock for older cycles.
Each snapshot carries its own integrity hash; the cycle's snapshot-hash is included in
the audit log entry for the freeze transition.

**Rationale:** Aligns with audit log retention alignment (Step 2 Deferred Decision).
Recent cycles need fast replay for dispute resolution + verifier console; old cycles
need durability + tamper-evidence, not speed.

**Snapshot format versioning + migration adapters:**
- Each snapshot carries a **format version** field.
- Replay loads snapshots through **migration adapters**: an old-version snapshot is read
  by the version's adapter, which produces the canonical (current-version) shape in
  memory.
- Adapters compose forward across versions; consumer code handles only the canonical
  shape — no permanent reader forest.
- Schema evolution requires an adapter update in the same PR; CI guards that schema
  changes affecting snapshot-relevant columns ship with a corresponding adapter.

**Snapshot adapter correctness via historical fixtures + property checks:**
- **Historical fixtures.** Representative snapshot examples from prior format versions
  retained in `packages/domain/snapshot-fixtures/`. Not exhaustive per-version coverage
  — representative cases that exercise meaningful structural variation.
- **Property checks.** Each adapter run produces output that satisfies named invariants:
  deterministic given the same input; canonical shape per current schema; replay
  invariants hold (totals reconcile, references resolve, hash-chain semantics intact).
- **No fixture forest.** The discipline is property-driven, not example-pinned. Adapter
  changes pass when invariants hold across the historical fixtures, not by matching
  exact bytes.

#### 1.7 Per-tenant custom fields — Postgres JSONB with per-Pariwar JSON Schema

**Decision:** JSONB columns on `members`, `claims`, and `pools` for per-Pariwar
extension. Per-Pariwar JSON Schema definitions in `packages/domain/per-pariwar/<id>/`.
Indexing strategy:
- GIN index on the JSONB column for arbitrary path queries.
- Functional B-tree indexes on specific JSON paths declared per-Pariwar when a query
  pattern is identified.
- Index inventory + per-Pariwar policy lives in `packages/domain/`.

**Operational implication:** index management becomes per-Pariwar as additional tenants
provision. Per-Pariwar schema-migration convention scaffolded in PR-2 (Step 3
Initialization Sequence).

**Per-Pariwar custom-field policy.** Schema in `packages/domain/per-pariwar/<id>/`
declares:
- Field cardinality bounds and max-size envelope.
- Type allowlist (scalars, small bounded arrays, small bounded objects). Unbounded event
  logs and arbitrary blobs are not permitted as custom fields — they go to dedicated
  tables.
- Per-Pariwar GIN index size monitored against a named budget; alarm fires at the
  operational threshold (named in Category 5 Observability).

**Custom-field evolution:**
- **Only tenant-authored field definitions — key, type, labels, tier, bounds — live in
  the registry; every governance constraint on what a definition may declare is
  code-owned, never tenant-authored.**
- Field definitions live in an append-only, versioned, RLS-scoped registry table
  (`pariwar_custom_field_definitions`). The immutable identity of a definition is
  `(pariwar_id, host_entity, field_key, version)`; changing `field_key` therefore
  creates a new definition rather than modifying an existing one.
- The type allowlist, forbidden-key patterns, and system-level hard limits remain CODE in
  `packages/domain/`; a tenant must never author the fence that governs its own writes.
- **Functional B-tree indexes** on specific JSON paths remain first-class drizzle-kit
  migrations, scoped to a single `pariwar_id`; the index inventory + per-Pariwar policy
  remain in `packages/domain/per-pariwar/<id>/index-inventory.ts`.
- Old fields supported in readers until a deprecation window closes (`retired_at`).

**System-level JSONB hard limits.** Independent of per-Pariwar custom-field policy, the
system enforces three classes of hard limit:
- Maximum JSON payload size per column write.
- Maximum nesting depth.
- Per-Pariwar GIN index growth ceiling with alarm + write-rate limit when approached.

**The existence of these three limit classes is architecturally frozen** — every JSONB
write path is subject to all three; no code path bypasses them. This is the
defense-in-depth substrate against a buggy or malicious tenant and survives any
future cloud / substrate pivot.

**The specific numeric values** for each limit class are **operational policy under
Trustee-Panel review**, not architectural commitments. Values live in
`packages/domain/` as named constants (single source of truth, version-controlled,
change-audited) and are revisable on Trustee-Panel authority when a Pariwar's
legitimate document profile requires it. No per-Pariwar admin can override values at
runtime; value changes flow through the Trustee-Panel review path that governs other
system-integrity policy (cf. FR-15 fixed-amount, FR-8 lock-in policy). Specific
current values + the review/escalation procedure are committed in an ADR.

#### 1.8 Migration tool — drizzle-kit (forward-only)

**Decision:** drizzle-kit for schema migrations. Migration policy:
- **Forward-only.** No `--down` reliance. Rollback is a new forward migration that
  inverts the change.
- **Squash at major release boundaries** to keep the migration history readable.
- **Per-Pariwar migrations** for JSONB-column-related changes; share-of-tenant-scope
  migrations apply across all Pariwars.

**Rationale:** Forward-only is the convention in production systems with audit-grade
retention — backward migrations are a footgun for replay foundations. drizzle-kit's CLI
fits the Turborepo task graph cleanly.

**Deploy discipline:**
- **Migration phase precedes code deploy.** Schema migrations apply in their own
  pipeline step; failure stops the pipeline — code is not promoted against an
  inconsistent schema.
- **Per-migration atomicity** — each migration file wraps in a single transaction where
  Postgres supports it (most DDL is transactional; concurrent index creation is handled
  in a separate step).
- **Pre-merge migration testing** in CI: drizzle-kit dry-run against a production-shaped
  fixture + assertion that the migration completes.

**Online migration for hot tables:**
- Changes affecting large tables (`members`, `contributions`, `audit_log` hot tier)
  split into multiple migrations: add nullable column → backfill via pg-boss job → add
  constraint.
- `CREATE INDEX CONCURRENTLY` for index changes on hot tables.
- Per-migration lock-time budget declared in metadata; CI fails if expected lock time
  exceeds budget without an online-migration plan attached.
- **Maintenance-window override** when an online migration isn't feasible; scheduled
  outside cycle windows; member-comms templated.

#### 1.9 Data modeling style — Module-bounded CRUD; DDD-aggregate language reserved

**Decision:** Module-bounded CRUD entities by default. DDD-aggregate language
(invariants, aggregate roots, consistency boundaries) reserved for the three
uncompromisable subsystems where consistency boundaries are real:
- **Pool Engine** — pool spawn + assignment is an aggregate operation.
- **Reconciliation pipeline** — UTR ↔ statement match is an aggregate operation.
- **Claim lifecycle** — claim state transitions through verification → approval → pool
  spawn → settlement is the canonical aggregate.

**Rationale:** Solo-build cadence punishes over-DDD-ification of low-stakes modules.
Where consistency boundaries are real (uncompromisable subsystems), DDD vocabulary earns
its weight. Elsewhere, CRUD is honest.

**Claim-aggregate scope.** The `claim` aggregate is scoped to **death-support nominee
claims** (the v1 product). Future trust-paid assistance benefits — beginning with
Durghatana Sahayata (FR-100, PRD §4.15) — will use a **separate request/case entity**,
not this `claim` aggregate. The v1 `claim` schema does not absorb accident-assistance
fields, payout-destination columns, or benefit-mechanism branches. Boundary protected
by §1.13.

#### 1.10 Caching strategy — Three named caches with explicit invalidation

**Decision:**
- **FR-12A Member Validity Service cache** — 60s TTL per UX commitment. Backed by
  Postgres materialized view + cache-aside read. Invalidated on Niyamavali amendment
  (FR-7) or member state change (any write to `members`, contribution lifecycle,
  suspension).
- **Static reference data cache** — Pariwar config, current Niyamavali version, current
  alert state. 60s TTL with cache-aside. Invalidated on trustee write.
- **Per-request memoization** — in-process, request-scoped. FR-12A evaluations within a
  single request reuse the first lookup.

**Per-cohort invalidation with correctness invariants.**
- **Scope declaration is mandatory.** Every Niyamavali amendment declares its
  affected-member scope as part of the amendment record (e.g., `all_members` |
  `past_lockin` | `r7_subclause_C_active` | named cohort definition). Amendments
  cannot be committed without a scope declaration.
- **Correctness invariant.** The declared scope must include every member whose
  FR-12A output changes as a result of the amendment. Trustee-quorum amendment
  review (per FR-7) treats scope completeness as a review criterion.
- **Conservative fallback (all-members invalidation)** fires when (a) scope is
  declared `all_members`, (b) scope cross-references multiple rules where
  transitive effect is possible, or (c) **scope confidence is insufficient to
  guarantee completeness**.
- **Member-state-change invalidation** is always per-member, scoped to the
  affected member's cache key set; not subject to cohort-declaration rules.

**Stampede protection.**
- **Stale-while-revalidate** — readers don't block while a recompute is pending;
  last-known-good value is served with a `revalidating: true` flag. Returned
  values carry a freshness timestamp.
- **Bounded recomputation** — recompute fan-out is capped per unit time; excess
  invalidation requests queue against the cap rather than stampede the database.

Specific mechanisms (e.g., singleflight pattern, lease coordination, exact threshold
values) committed in an implementation ADR.

**Future trigger for distributed cache (Redis):** if Postgres materialized-view refresh
becomes the bottleneck for FR-12A's 200 ms p95 at 4L scale. Until then, in-DB caching is
sufficient.

#### 1.11 Database-authoritative time

**Decision:** Business timestamps come from the database, not from application-server
clocks. Postgres time is the canonical source for cycle freeze, contribution
attestation, claim state transitions, audit log entries, Pool Engine snapshot
timestamps, hash-chain entry times. Application-server clocks are not trusted for any
timestamp that crosses an audit, replay, or integrity boundary.

**Timestamp source must be explicit and documented per use case.** Each timestamp-
bearing surface (cycle freeze, audit log entry, snapshot, pool spawn, lock-in expiry,
renewal grace, alert state transitions) declares its time source in the schema or the
operation contract; the choice is committed in an ADR. Postgres function semantics are
implementation detail, not an architecture commitment.

**Rationale:** TWT depends heavily on time-driven correctness — cycle windows (FR-22),
lock-in expiry (FR-3, FR-8), renewal grace (FR-1A), audit-log ordering (FR-47), Pool
Engine determinism (FR-14), SIE transitions (UX Stance #5). Clock skew across worker
nodes is an invisible source of replay divergence, audit-chain ordering bugs, and
disputed timestamps. Database-authoritative time removes the surface.

#### 1.12 Query observability for sensitive operations

**Decision:** Every cross-tenant operation, every reconciliation match decision, every
pool spawn operation emits trace metadata to the observability stack. No payload —
operation name, duration, row count, tenant scope (`pariwar_id`).

**Rationale:** These are the surfaces where audit, replay, and isolation correctness
depend on operational visibility. Trace metadata at this level lets post-hoc
investigation answer questions like "what happened during the freeze on this date?"
without payload-level access to PII or financial data. Cheap to instrument at write
time; priceless when needed.

**Observability stack details** (collector, storage, alerting) committed in Category 5.

#### 1.13 Forward-compat hooks for trust-paid assistance benefits (FR-100, PRD §4.15)

**Decision:** The architecture commits exactly three forward-compat hooks so that
future **trust-paid assistance benefits** — beginning with **Durghatana Sahayata
(Accident Assistance)** — can be activated later without destructive migration of v1
member / payment / receipt records. **v1 ships none of the benefit flow itself**; the
flow (member-self intake UI, accident-evidence handling, ground-inspection variant,
trust-side disbursement, accident-specific lock-in policy, Niyamavali rules,
disbursement entity) is v2/v3 scope.

Trust-paid assistance benefits are categorically distinct from *daan* / pool-engine
support categories (which are crowdfunded from members under the Pool Engine). Do not
conflate **Jivandan** (a planned future *daan* / pool category — crowdfunded medical
aid; reuses the Pool Engine via FR-20) with **Durghatana Sahayata** (a trust-paid
assistance benefit — disbursed from the trust account, not from a member pool). The
PRD glossary is canonical for the term distinction; this section commits only the
architectural slots.

**Hook 1 — `benefit_mechanism` discriminator on the Niyamavali rule registry.**
Every rule's stored payload (FR-7 rule registry — see §1.10 cache invalidation + §4.2
service mapping) carries a `benefit_mechanism` discriminator. Enum width is two
values, deliberately wide so future benefits co-locate rather than spawn one tag per
product:
- `pool` — rules governing crowdfunded *daan* benefits (death-support today;
  Jivandan / Kanyadan / Retirementdaan later when they reuse the Pool Engine).
- `reserve` — rules governing trust-paid assistance benefits (Durghatana Sahayata and
  future reserve-funded benefits such as education-aid, retirement-aid).

v1 ships only `pool`-tagged rules (R5, R7, R8, R9, R10, etc.). The `reserve` value
exists in the enum so Durghatana Sahayata rules can be added later without re-tagging
existing rules. The discriminator is part of every eligibility-check audit-log line
(§1.5) — every evaluation records which mechanism it served. Rule-registry replay
remains deterministic across mechanism additions.

**Hook 2 — Payout-destination architectural slot (reserved, not schema-locked).**
The data model reserves a future capability identifying where trust-paid assistance
may be disbursed (`member`, `nominee`, `hospital`, future types). **Testable v1
non-add (architecture-spec test):**
- No `payout_destinations` table in v1 baseline schema.
- No `payout_destination_id` column on `members`, `claims`, `pools`, `payments`, or
  any v1 entity.
- No API endpoint, Zod schema, validator, OpenAPI route, or admin/member UI surface
  for payout destinations in v1.
- Schema-diff against the v1 baseline at Durghatana Sahayata launch must show a
  **greenfield introduction** (new table + new endpoints + new module under
  `apps/api/src/modules/`) — never a column/index addition to a v1 table.

The slot is reserved by *prohibiting v1 surface*, not by stubbing scaffolding.
"Reserved" means architecturally named and excluded; it does not mean pre-built.

**Hook 3 — Vyawastha Shulk receipt persistence + post-hoc reconstructibility.**
Vyawastha Shulk receipts (FR-1, ₹110 mandatory entry fee) retain `paid_at`,
`valid_through`, `amount`, `utr`, `payment_method` indefinitely in v1 — sufficient to
reconstruct, for any past date, whether a member was Vyawastha Shulk-paid on that
date. This means Durghatana Sahayata can evaluate eligibility against the historical
accident date at v2/v3 launch with no retroactive backfill of v1 records. Retention
window collides with FR-47 7-year audit retention and FR-96 RTBF anonymization
(OQ-17) — the receipt-fact retention horizon under DPDPA RTBF is resolved before
Durghatana Sahayata enters design.

**v1 posture on the ₹110 (cross-reference, FR-1).** The Vyawastha Shulk buys the
member no direct return in v1 — it funds trust operations. Vyawastha Shulk-paid state
is, however, the **future eligibility anchor** for trust-paid assistance benefits.
FR-1 itself owns only the fee in v1; the future products it enables live behind these
three hooks. FR-1 does not own Durghatana Sahayata semantics.

**Audit substrate reuse, no v1 work.** The trust-disbursement audit trail (FR-47;
§1.5 two-tier audit log) is already attributable + immutable — Durghatana Sahayata
trust-paid disbursements will reuse the audit-log substrate at v2/v3 launch with no
v1 schema work required.

**Benefit independence (architectural commitment).** Future trust-paid assistance
benefits **do not reduce, replace, delay, or prioritize death-support eligibility**.
The two flows are independent products that consume Vyawastha Shulk-paid status
without interfering with each other's outcomes for the member or the nominee. This
is committed at the architecture layer so future schema changes cannot couple the
two.

**Rationale:** Activating Durghatana Sahayata without these three hooks would require
destructive migration of v1 records (re-tag every rule, retroactively backfill
receipt history, retrofit payout destinations into existing tables). The hooks are
the *minimum* surface that removes that future migration cost — no richer scaffolding
(configurable claim-template, accident taxonomy, ground-inspection SLA variant) is
admitted at v1.

**Out of scope for this section** (deferred to Durghatana Sahayata v2/v3 design):
- Durghatana Sahayata request/case entity schema, lifecycle, and module structure.
- Durghatana Sahayata rule predicates in the Niyamavali registry (R-numbers reserved
  but not authored).
- Ground-inspection variant for accident-assistance (the §4.6 claim-side
  ground-inspection is scoped to death; accident-assistance cadence + SLA
  re-specified at launch).
- Member-self intake UI for accident assistance.
- Accident-specific lock-in policy.
- Member-facing "what your ₹110 bought" communication (remains explicitly
  *not published* even after Durghatana Sahayata ships — TSCT R15 precedent;
  *"gift, not entitlement"* framing).

**Dependencies on open questions:** OQ-17 (Vyawastha Shulk receipt retention horizon
under DPDPA RTBF) and OQ-18 (Trustee Panel ratification of Durghatana Sahayata scope
and posture) gate v2/v3 design. v1 hooks are posture-neutral.

#### 1.14 Member Lifecycle State Model

**Why this section exists.** Cross-Cutting #12 commits a formal transition table
for the Account State Machine. The Account State is computed atomically across
claim / member / pool / alert state primitives; this section commits the
**member lifecycle state model**. Composition rules for the broader Account
State (member + claim + pool + alert → Account State, including the frozen-*
end states named in §3.4) are the subject of a separate architectural
workload — flagged in §Gap Analysis.

**Canonical home:** `packages/domain/member/state.ts` — single source of truth.

**Source-of-truth principle.** Member state is **derived from event history**.
Persisted state is an optimization only — the authoritative state is what the
event log replays to. This aligns with Cross-Cutting #4 (Determinism & replay):
any persisted member-state row can be reconstructed by replaying the member's
audit-log events. Persisted state is materialized for read efficiency and
cache invalidation hooks; it is not the source of truth.

**States and transitions** (PRD-load-bearing; FR provenance noted):

| State | Enter from | Enter trigger | Exit trigger | FR |
|---|---|---|---|---|
| `pending-fee` | (signup begun) | UPI Intent created, payment not confirmed | Payment confirmed → `lock-in` | FR-1 |
| `lock-in` | `pending-fee` | First-payment confirmed | Lock-in period elapses → `pending-valid` or `active` | FR-1, FR-3 |
| `pending-valid` | `lock-in` | Lock-in elapsed AND DigiLocker unverified | Trustee approves manual KYC → `active` | FR-2 |
| `active` | `lock-in` (DigiLocker verified) OR `pending-valid` OR `active_in_grace` (on renewal) OR `lapsed_unpaid` (on renewal) | KYC verified AND fee paid AND not withdrawn | `valid_through + 1 day` → `active_in_grace`; OR member-initiated withdrawal → `withdrawn` | FR-1, FR-1A, FR-2 |
| `active_in_grace` | `active` | `valid_through + 1 day` | Renewal payment → `active`; OR grace period elapsed → `lapsed_unpaid` | FR-1A |
| `lapsed_unpaid` | `active_in_grace` | Grace period elapsed (per FR-1A) | Renewal payment → `active` (no re-lock-in) | FR-1A |
| `withdrawn` | `active` (or sub-states) | Member-initiated withdrawal | Re-signup allowed after lock period → `pending-fee` | FR-6 |

**Policy consumers** — these systems read member-state to apply business policy
defined elsewhere (PRD, FRs). The states above name structural lifecycle
positions; the eligibility rules and cadences attached to each state live in
their governing FR / rule registry:
- **Validity service (FR-12A)** — canonical read path; exposes
  `vyawastha_shulk_status: { paid_through, days_until_lapse, in_renewal_grace,
  grace_remaining_days }` per FR-1A.
- **Pool eligibility** — Pool Engine (FR-14) reads member-state at snapshot
  time.
- **Claim eligibility** — claim filing reads member-state at filing time;
  eligibility policy in FR-1A.
- **Alert routing** — dispatcher (§3.4) reads member-state for suppression,
  routing, and reminder cadence (FR-1A schedule).

**Time-driven transitions (Cross-Cutting #14 — SIE).** The following
transitions fire on scheduled time, non-punitively:
- `lock-in` → `pending-valid` or `active` on lock-in expiry.
- `active` → `active_in_grace` on `valid_through + 1 day`.
- `active_in_grace` → `lapsed_unpaid` on grace expiry.
SIE driver lives in `apps/jobs/scheduler/`; transition emission is idempotent
and audit-logged.

**Cache invalidation invariant (Cross-Cutting #18, §1.10).** FR-12A validity-
service caches invalidate on any member-state transition. Transition emission
and cache-invalidation event are in the same transaction; consumers see a
consistent view.

**Claim-filing concurrency (Cross-Cutting #14 — non-punitive).** If a claim is
filed while the member is in `active_in_grace`, eligibility resolves against
member-state at filing time. A subsequent `active_in_grace` → `lapsed_unpaid`
transition does not retroactively invalidate a filed claim.

**Audit-log emission (Cross-Cutting #2).** Every member-state transition
emits a structured event with `from_state`, `to_state`, `trigger`, `actor`
(`member`, `system`, `trustee`), `timestamp`, and `pariwar_id`.

#### Decisions deferred to subsequent categories

- **Backup target + RTO/RPO** (Step 2 Deferred Decision) — committed in Category 5.
- **Reconciliation matcher mechanism (OQ-2)** — committed in Category 3 (matcher input
  shape is a transport-layer concern) and Category 5 (job scheduling).
- **Bank statement normalization schema [P0]** — lives in
  `packages/domain/bank-statement/`; schema committed when the first parser ships.
- **Audit log mirror credentials separability mechanism** — committed in Category 2.
- **Active-scope resolution mechanism for multi-Pariwar identities** — committed in
  Category 2.
- **Specific bound for undetectable audit-loss window** — committed in Category 5.

### Category 2: Authentication & Security

#### 2.1 Threat-actor inventory [P0 — Step 2 carryover]

The architecture defends against a named set of actors with explicit attack surfaces.
Controls are mapped to actors, not enumerated in isolation.

| Actor | Privileges | Primary attack surface | Defenses |
|---|---|---|---|
| Sole engineer with prod-DB access | Read/write any row | Audit-log tampering; cross-tenant data exfiltration; backup-restore manipulation | Audit-log integrity (§1.5); mirror credentials separable (§2.10); cross-tenant operations helper (§1.2) |
| Field-worker fraud rings | Authenticated member accounts under sock-puppet identities | Commission inflation via fake signups | Qualified-acquisition gating (FR-84); attribution throttling (FR-86); device/IP/UPI deduplication (Category 5) |
| External scrapers | Unauthenticated; web crawler scale | PII harvesting from public surfaces | Cloudflare + Bot Management + Turnstile (FR-88); forced pagination (FR-91); PII shielding matrix (FR-74); scrape-test in CI (Step 2 #7) |
| FR-43A Stage-1 reviewer collusion | District Admin scope | Pre-decision claim manipulation | Separation-of-duties enforcement (Stage 1 reviewer ≠ original decision-maker per FR-43A); audit log of every reviewer action |
| Hostile trustee | Pariwar Admin / State Trustee | Niyamavali manipulation; fixed-amount change; rule registry tampering | Versioned amendments with public diff (FR-79); audit log of every rule change; cooling-off period via 90-day notice (FR-15) — shortened, not removed |
| Compromised member account | Member-class session | Session hijack via stolen device; OTP interception | Short JWT lifetime; refresh-token rotation; device-binding (§2.4); per-phone OTP throttling (§2.11) |
| Compromised admin account | Admin scope per role | Account takeover → RBAC scope abuse | WebAuthn 2nd factor (phishing-resistant); audit log per privileged action; lockout policy |
| Compromised partner module | Module Marketplace SDK | Supply-chain attack via 3rd-party dependency | Crowdfunding boundary (Step 3); module SDK sandboxing in admin UI |
| Compromised DigiLocker integration | KYC signing | Forged Aadhaar pull bypassing signature check | Signature verification policy (§2.8); cached certificate rotation; manual fallback (FR-2) |
| Compromised bank statement intake | Reconciliation matcher input | Forged statement to confirm fake UTRs | Bank parser allowlist with golden files (Step 3); statement-source verification at intake (§2.8 pattern); manual triage queue (FR-50) |

**Periodic-review commitment.** The actor → control matrix is reviewed quarterly + on
every new partner integration + on every new feature class that introduces a privileged
surface. New actors require explicit analysis and matrix updates before the introducing
feature ships.

#### 2.2 Member authentication — mobile + OTP

**Decision:** Per FR-1, members authenticate via phone number + OTP at signup;
subsequent logins via phone + OTP or session-resume via stored refresh token.
**OTP delivery channel is SMS via DLT-transactional (PE/OE) headers** — distinct
from the bulk-alert SMS ban (RA-29). Voice OTP may be introduced as a fallback
channel via ADR. WhatsApp is not an authentication channel in v1 — identity
(SMS) and communication (WhatsApp) remain separated.

**Session model — long-lived with explicit re-OTP gates:**
- **Refresh-token lifetime:** 90 days; refresh-on-app-open extends if device is in
  trusted-device state.
- **Trusted-device binding:** max **2 trusted devices per member** (configurable
  per Pariwar via FR-58C — covers typical primary + backup/family phone). Binding
  a 3rd device drops the oldest and requires step-up OTP.
- **Force-re-OTP signals** (session invalidated; OTP required on next action):
  SIM-swap-positive; device-binding state change; risk signals as defined by the
  fraud-policy ADR (e.g., suspected device takeover, anomalous access patterns).
  Specific detection formulas and thresholds live in the fraud-policy ADR, not
  architecture.
- **Session-resume vs first-login:** session-resume does not require OTP unless
  a force-re-OTP signal fires; first-login on any device requires OTP regardless.

**Step-up OTP — high-trust operations require fresh SMS-OTP at action time:**
Regardless of session state, the following operations require a fresh DLT-
transactional SMS-OTP within the action's commit window:
- **Member-side identity / account:** mobile-number change; account-recovery
  initiation; member self-deactivation / pause; account deletion / RTBF request
  acknowledgment (DPDPA); DigiLocker re-link.
- **Member-side financial:** nominee change; bank-account / IFSC change.
- **Claim / payout-side:** claim filing; trust-payout authorization (admin);
  refund / claw-back initiation (admin).
- **Admin / trustee-side:** staff privilege escalation / role grant; Niyamavali
  rule amendment (trustee — FR-7); per-Pariwar branding bundle changes affecting
  public surfaces (FR-60); disaster-window declaration (FR-98); helpline operator
  co-pilot session start (v2+; architectural slot reserved).
- **Step-up OTP TTL:** 3 minutes; single-use; emits audit line per send + per
  consume tagged with the operation identifier.

**Discipline:**
- **OTP issuance rate-limited per device, per member, and per IP** — separate
  budgets for cost protection and abuse protection; budgets enforced
  independently (a member legitimately authenticating on a fresh device must
  not be locked by an unrelated IP-level abuse window). Specific budgets in
  Category 5 Observability.
- Per-phone OTP throttling: separate thresholds for login-OTP vs step-up-OTP
  (Category 5 Observability).
- OTP TTL: login-OTP 5 min; step-up-OTP 3 min; one-time use; invalidated on
  next-OTP-request.
- OTP delivery failure surfaces alternate channels per ADR (voice OTP if
  introduced; helpdesk-mediated escalation otherwise).

**OTP-mechanism security floor.** Regardless of delivery channel (SMS-DLT,
voice OTP if introduced), the mechanism must support per-channel rate
limiting, per-OTP revocability, audit-log emission per send + per attempt +
per consume, SIM-swap detection with helpdesk-mediated fallback (never silent
re-issue), and distinct OTP pools per intent class (step-up cannot share
value with concurrent login-OTP).

**ADR captures:** chosen primary OTP channel (committed: SMS-DLT-transactional);
fallback options (voice OTP only — no WhatsApp); cost/reach analysis at 4L scale;
SIM-swap mitigation specifics; DLT-PE/OE registration evidence + per-template
registration list.

#### 2.3 Admin authentication — email + password + WebAuthn passkey

**Decision:** Email + password + WebAuthn passkey as 2nd factor. Mandatory for paid trust
staff (Anita, Priya, Vikram-class field-worker dispatch, Auditor role, trustees). No
opt-in tier — admin access requires both factors.

**Implementation discipline:**
- Password hashing: Argon2id (current best practice).
- WebAuthn via SimpleWebAuthn library (FIDO-conformant, TS-first, Fastify-compatible).
- Backup recovery codes (10 one-time-use codes) provisioned at WebAuthn enrollment; used
  only when the passkey is lost; each use audited.
- Password reset via signed email link with short TTL; re-enrollment of WebAuthn required
  after password reset; the reset itself emits an audit line.
- Account lockout after N failed password attempts; lockout escalates to helpdesk;
  hostile-trustee scenarios (§2.1) trigger trustee-quorum unlock not single-admin unlock.

**WebAuthn enrollment ceremony.** A new passkey enrollment requires either (a) an
existing 2nd factor (active passkey or recovery code), or (b) an out-of-band signed
email link with short TTL, sent to the registered email and consumed exactly once.
Password-only access does not grant passkey enrollment authority.

**Password-hash parameters.** Argon2id parameters (memory cost, time cost, parallelism)
must meet the current accepted security baseline and be reviewed periodically; the
specific baseline and review cadence are recorded in an ADR.

#### 2.4 Session model — hybrid

**Decision:**
- **Admin web (staff admin + helpline operator console + trustee tooling):**
  `@fastify/session` plugin with **Postgres-backed session store**. HttpOnly Secure
  SameSite=Lax cookie. Idle timeout 12h; absolute timeout 7 days. Server-side revocation
  by deleting the session row.
- **Mobile + native API:** `@fastify/jwt` with short-lived access token (15 minutes) +
  refresh token (30 days, server-side recorded for revocation). Refresh-token rotation
  on use; refresh-token table backed by Postgres; per-device binding via stable device
  identifier captured at signup.

**Revocation discipline:**
- Admin sessions: revoke by deleting the session row (immediate).
- Mobile JWT: access tokens not invalidatable mid-lifetime (acceptable for 15-min
  windows); refresh-token deletion revokes the next refresh attempt.
- Suspension of a member or admin (FR-56) cascades to delete all sessions + refresh
  tokens.

**Aligned with Postgres-only posture (§1.4).** No Redis required for session store.

**Refresh-token device binding.** Refresh-token binding must use a revocable device trust
mechanism. Hardware-backed attestation (Android KeyStore, iOS Secure Enclave) is
preferred where supported and applied as the binding when available; software-derived
identifiers are the fallback for devices without hardware-backed signing. The
architecture commits the *revocability + audit-on-rotation* properties, not a specific
binding mechanism — Android fragmentation + reinstall realities make a single mandatory
mechanism impractical.

**Session lifecycle correctness:**
- **Session-ID rotation on auth-state change.** Login, role change, password reset, and
  WebAuthn re-enrollment all rotate the session ID to defeat fixation attacks.
- **CSRF protection** on state-changing admin requests via the double-submit cookie
  pattern + origin/referer check on cross-origin requests; SameSite=Lax cookies are the
  baseline (already committed) and not the only line of defense.
- **JWT algorithm pinning.** The JWT verifier accepts an explicit allowlist of signing
  algorithms (e.g., RS256 or ES256 only); `none` is structurally rejected; symmetric
  algorithms are rejected where the verifier expects asymmetric.

#### 2.5 Multi-Pariwar active scope — URL path prefix

**Decision:** Active Pariwar scope is structurally encoded in the URL path:
`/p/<pariwar_id>/...` for all admin routes; mobile API paths carry the same prefix under
the hood.

**Auth middleware contract:**
- Extracts `pariwar_id` from URL path.
- Re-parses as strict UUID at the middleware boundary (§1.2 RT-1).
- Verifies the authenticated user has a membership record in that `pariwar_id` (admin or
  member, as appropriate).
- Sets the Postgres session variable `app.pariwar_id` for the request lifetime.
- Rejects (404) requests where `pariwar_id` doesn't exist or the user has no membership.

**Multi-Pariwar users (Pariwar-Passport):**
- Each Pariwar membership is a separate URL prefix.
- Switching scope = navigating to a different URL prefix.
- No silent scope changes; no header-based switching mid-session.

**Member app:** the URL prefix is not user-visible (native nav); the client SDK injects
the active `pariwar_id` into API requests as part of the path.

**Scope-change audit emission.** Every navigation that changes the active `pariwar_id`
(multi-Pariwar admin moving between scopes) emits an audit line capturing actor +
previous scope + new scope + timestamp. An Auditor reconstructing cross-Pariwar admin
activity sees the navigation pattern, not only the actions within a scope.

#### 2.6 RBAC enforcement — permission keys + scope dimensions

**Decision:** Per FR-44/45/46, RBAC enforced via:
- **Permission keys:** `<resource>.<action>` strings (e.g., `claim.approve`,
  `member.suspend`, `pariwar.amend_rule`, `audit.export`). Enumerated and versioned in
  `packages/domain/permissions/`.
- **Role bundles:** the 12 default seeded roles per FR-46 ship as named bundles in
  `packages/domain/roles/`; editable by Super Admin per FR-44.
- **Scope dimensions** per FR-45: `block | district | state | pariwar | global`. Each
  grant carries a target scope; queries against `target` are matched against the
  authenticated user's scope.
  - ⭐ **AMENDED — Decision `2026-08-19-134` (routing note G2, ratified 2026-08-19).**
    **Dimensions belong to a named hierarchy.** `global`, `pariwar` and `self` remain
    **universal**; `state → district → block` becomes **one named hierarchy rather than
    the only one**, so a Pariwar with a different organizational shape (Rail's
    `Zone → Division`; a future `Region → Area → Branch`) carries its own.
  - ⭐ **The published hierarchy document declares its own dimension ordering.** A single
    global rank table is **no longer the authority on ordering**.
  - ⛔ **Comparison is meaningful only WITHIN a hierarchy.** Across hierarchies it must be
    **structurally impossible — fail-closed — not merely wrong**: an unknown or
    cross-hierarchy dimension **denies, never compares**. A numeric compare that answers
    *"is Zone broader than District?"* is the ADR-0038 failure mode by name.
  - **Mechanism is committed in `ADR-0039`, not here** — the dimension tuple, the
    `scope_dimension` enum and their migration are ADR-level concerns. This section
    commits the **property**.

**Enforcement pattern:**
- Authorization helper `requires(user, permission_key, target)` called at the entry of
  every privileged route handler.
- Authorization failure raises 403 with structured error (audit-logged).
- Authorization check is the second guard after RLS — RLS prevents cross-tenant data
  leak; authorization prevents in-tenant action by an insufficiently-privileged user.

**No silent role escalation.** Role changes go through a dedicated audit-logged
endpoint; role modification requires Super Admin scope; trustee discretion logged.

#### 2.7 PII encryption at rest — three-tier strategy

**Decision:**

- **Tier 1 — Ciphertext (envelope-encrypted).** Mobile, email, Aadhaar number, DOB,
  address, nominee bank account, nominee IFSC, medical disclosures.
  - Envelope encryption: KEK in **Cloud KMS** (HSM-backed, per §5.2); per-row DEK
    encrypted by KEK and stored alongside the ciphertext.
  - Encryption at the application layer (`packages/domain/encryption/`); the database
    sees only ciphertext.
  - Library: **Google Tink** (committed in an ADR alongside Cloud KMS integration).
- **Tier 2 — Blind index (HMAC-SHA-256 with separate keyed secret).** eHRMS ID, member
  name (for search and dedup).
  - Stored as: ciphertext (Tier 1) + HMAC hash for equality lookup.
  - Separate KMS-held HMAC key; same plaintext always yields same hash; different keys
    per Pariwar to prevent cross-Pariwar correlation (where required).
  - Equality search only — no range, no partial match.
- **Tier 3 — Plaintext.** School, district, designation, joining date, contribution
  count, public-facing fields per FR-74 Public-vs-Private matrix.
  - ⚠ **AMENDED — Decisions `2026-08-19-132` / `-133`.** The **tier classification stands**;
    the **storage model does not**. `School` and `Designation` are **not fixed member
    columns** — they are **Pariwar-selected directory attributes** (§2.13). ⛔ There is no
    canonical directory schema. `District` remains platform-common, derived from
    `member_postings`.

**Baseline:** Managed Postgres TDE (DB-level encryption with KMS-managed keys) underlies
all tiers — protects against disk theft. Application-layer encryption on Tier 1 + 2 is
defense-in-depth.

**Tier classification authority:** the Public-vs-Private matrix (FR-74) is canonical;
new PII fields declare their tier at schema definition; CI guards that no Tier 1 field
is rendered to a public surface.

> ⛔ **AMENDED — Decision `2026-08-19-135` clause 7(c) + `2026-08-19-136` (routing note G3,
> ratified 2026-08-19). ONE RULED EXCEPTION, stated explicitly rather than left to be
> inferred.**
>
> **Member name may be decrypted from Tier-1 and rendered on the PUBLIC directory
> surface.** The Trustee Panel authorised full-name display at both the public and
> authenticated tiers, using the existing KYC/legal name
> (`member_kyc_profiles.name_ciphertext`). ⛔ This **supersedes** FR-75's *"first-name +
> last-initial only"* and FR-74's public-tier name form — ⛔ **the name form only**;
> FR-75's forced pagination, `noindex` on member detail pages, and
> no-mobile/email/address/DOB consequences **stand unchanged**.
>
> ⛔ **The exception is exactly one field on exactly one surface class.** No other Tier-1
> field may be rendered publicly, and **no PII tier changes** — member name remains
> Tier-1 ciphertext + Tier-2 blind index. This authorises a **decrypt at a named
> surface**, not a reclassification.
>
> ⚠ **Story 10.7 is NOT amended.** Its *"Tier-1 not decrypted into a report in v1"* ruling
> was scoped to **admin bulk exports**. ⛔ What is no longer true is the project-wide
> reading that Tier-1 is never decrypted outside self-access — that reading was never
> ratified and must not be cited as though it were.
>
> ⛔ **The CI guard named in this clause must be OPERATIVE before the directory ships**
> (`2026-08-19-136` clause 4). It is currently **inert for tier leaks** — the scrape
> gate's snapshot loader is a stub and the matrix declares no surfaces — so at present
> the sentence above describes a control that cannot catch this exception being violated.
> ⚠ The matrix is populated by the same story that ships the directory; **sequence it
> deliberately.**

**HMAC input namespacing.** Blind index inputs are namespaced by field class:
`HMAC(key, "<field_class>:" || value)` where `<field_class>` is the named field name
(`ehrms_id`, `name`, etc.). Same plaintext under different field classes yields different
hashes; no cross-class collision.

**KEK rotation cadence.** KEKs (Tier 1 envelope encryption + Tier 2 HMAC keys) rotate on
a committed cadence and on suspected compromise. Rotation re-encrypts DEKs and re-derives
HMAC contents lazily; specific cadence values committed in an ADR.

#### 2.7a Transport encryption — TLS 1.3+ pinned at three hop classes

§2.7 commits PII encryption *at rest*. §2.7a commits transport encryption — the
in-transit counterpart — as a frozen architectural property, pinned distinctly at
three hop classes so substrate pivots cannot silently weaken it.

**Frozen property: TLS 1.3+ at every network hop where TWT data crosses a trust
boundary.** No TLS 1.2 fallback. No `cleartext` exception. The property holds
substrate-by-substrate; a pivot of any underlying substrate does not relax it.

**Three pinned hop classes:**

1. **Edge hop — client ↔ TWT-controlled edge.** All traffic from member apps,
   admin browsers, public-website visitors, helpline operators, and field-worker
   devices to TWT's edge (currently Cloudflare per §5.8a; substitutable per the
   §5.8a pivot-readiness commitment) terminates TLS 1.3+. Substrate-pivot
   requirement: any replacement edge (self-hosted WAF, K8s ingress, alternate
   CDN) must terminate TLS 1.3+; downgrade is a launch-blocker.
2. **Internal hop — edge ↔ origin and origin ↔ Postgres / object storage /
   internal services.** Traffic between TWT's edge and the API origin, between
   the API and Cloud SQL, between the API and Cloud Storage, and between
   internal services (when workers split per §2.9) is TLS 1.3+. Within-VPC
   traffic is no exception; the property holds end-to-end regardless of whether
   the substrate provides "automatic in-VPC encryption" — TWT does not rely on
   substrate-provided privacy as a substitute for application-pinned TLS.
3. **External-integration hop — TWT ↔ third-party APIs.** Outbound calls to
   DigiLocker (§2.8), bank statement intake transports (§3.6), FCM/APNs (§3.3),
   and any future external integration are TLS 1.3+ with server certificate
   verification. Inbound webhook ingress (§3.11) terminates TLS 1.3+ at the
   edge per hop-class 1. No integration that requires TLS 1.2 or weaker is
   permitted; substitution to a compliant provider is the resolution path.
   (UPI Intent payment handoff is OS-level and out of scope here; the OS UPI
   stack handles its own transport.)

**ADR territory (deferred):**
- Specific cipher suite allowlist and ordering.
- Mutual-TLS (mTLS) policy at the internal-hop class — currently called out as
  an option in §2.9 service-to-service auth; the choice is taken at split-trigger
  time per §2.9 and the ADR records the mTLS decision then.
- Certificate pinning policy at the client (native member-app) — pin / no-pin /
  certificate-transparency-only is deferred to an ADR alongside the OS-platform
  cert-pinning library choice.
- TLS-cert rotation cadence and automation (Let's Encrypt / ACM-equivalent /
  manual) — Category 5 operational territory.
- Substrate-specific TLS terminator configuration (Cloudflare TLS profile,
  K8s ingress TLS settings, etc.).

**Substrate-pivot safety.** Every ADR that records substrate choice for any hop
must reaffirm TLS 1.3+ at that hop. The architectural property does not flex; only
its implementation mechanism does. Reviewers of substrate-pivot proposals are
required to verify TLS 1.3+ posture is preserved at the affected hop classes
before approval.

**Verification:**
- CI gate: integration test asserts TLS 1.3+ at the edge for every published
  endpoint.
- Quarterly attestation: external scan + internal config audit confirm TLS 1.3+
  at all three hop classes; result archived in audit log.
- Substrate-pivot review: TLS 1.3+ posture verification is a named pre-promotion
  gate in the substrate-pivot runbook.

**Cross-references.** NFR-15 (epics doc) declares TLS 1.3+ at the requirements
layer; §1 Architectural Commitments / Security line bullet (line 42) summarises
the property; §2.7a (this section) is the canonical architectural commitment.

#### 2.8 DigiLocker integration

**Decision:** OAuth 2.0 authorization-code flow with PKCE. Direct integration with
DigiLocker (no aggregator) for v1, behind a provider interface that allows aggregator
substitution if direct integration proves operationally heavy.

**Signature verification policy:**
- DigiLocker returns a PKI-signed XML response (eAadhaar).
- Verification at the application layer using the issuer's public certificate.
- Certificates cached locally; refresh via daily pg-boss job; refresh failure alarms (not
  fail-closed — last good certificate is used until refresh succeeds, with named
  staleness budget in Category 5 Observability).
- Signature verification failure: KYC entry stays in `pending-valid` state per FR-2 with
  manual trustee fallback; never silently accepted.

**Key compromise procedure:**
- Cached certificate revocation: rotate KEK + reissue certificate cache.
- Re-verification policy: KYC entries verified against a known-compromised key are
  flagged for re-verification (trustee-action queue per FR-2).
- Procedure rehearsed quarterly; incident-response process owned by Category 5.

**Optional → mandatory switch** gated by FR-58C feature flag (Step 2 Cross-Cutting #15).

**DigiLocker callback URL allowlist.** The OAuth `redirect_uri` is strictly validated
against a server-side allowlist; mismatched URIs are rejected at the auth boundary.
Registered allowlist is per-environment (production, staging, local-dev) and audit-logged
on change.

**DigiLocker SDK pinning + supply-chain attestation.** The DigiLocker integration SDK
(or direct-API client) is pinned to a specific version with cryptographically verifiable
provenance (npm provenance / SLSA attestation / equivalent). Version updates require
explicit review of provenance + changelog; no auto-update of supply-chain-sensitive
packages.

#### 2.9 Service-to-service authentication

**Decision:** v1 — workers run in the same process or workspace as the API at Phase 1;
in-process function calls; no inter-service auth required. Cross-tenant operations
helper (§1.2) is the audit-emitting boundary.

**When workers split** (per Step 3 split triggers — independent credentials / scaling /
connection lifecycle), inter-service auth options committed at split time:
- Short-lived signed JWTs (5-minute lifetime) per service-call.
- mTLS within VPC (alternative; depends on deployment substrate).
- IAM-based auth (if K8s migration completes and the cluster supports workload identity).

**Decision deferred** to the first split-trigger event; the principle committed here is
that service-to-service auth is named and audited, never implicit.

#### 2.10 Audit log access controls

**Decision:**
- **Auditor role isolation.** A dedicated Postgres database role (`twt_auditor`) with
  `SELECT`-only privileges on audit tables and `INSERT`-denied on all tables. Auditor
  connections use this DB role, distinct from the application's DB user.
- **Auditor exports** run against a dedicated read replica (replica topology committed
  in Category 5) — large Auditor queries don't degrade operational read paths.

**Audit log mirror credentials separability (Category 1 carryover):**
- **Write to Cloud Storage mirror:** dedicated GCP service account in a dedicated GCP
  project (`twt-audit-mirror`); the account has `roles/storage.objectCreator` scoped to
  the audit-mirror bucket only — no Delete, no other actions.
- **Read for integrity check:** separate service account in a separate GCP project;
  runs in a dedicated execution environment (`apps/jobs/audit/` deployment unit with
  its own credentials).
- **Sole-engineer prod-DB credentials cannot access either project.** Credentials
  stored in Secret Manager; rotation policy in Category 5.
- The Auditor role (read), the mirror-write role (write), and the prod-data project
  live in **separate GCP projects under the IAM Isolation Commitment (§2.10a, below)**.
  An attacker who compromises one cannot pivot to the other through IAM alone.

**Periodic independent integrity review.** The audit log integrity story (hash chain +
S3 Object Lock + cross-account separation) is reviewed periodically by an independent
party. The specific reviewer + cadence committed in an ADR; the principle (external
verification of the architecture's integrity claims) is committed here.

#### 2.10a Isolation Commitment — preserving audit independence

§1.5, §2.10, and §5.2 require that audit-mirror credentials remain operationally
and administratively separable from production data access.

Because the canonical cloud is GCP (§5.1), the architecture commits the following
properties:

- Compromise of production application credentials must not permit modification
  of audit-mirror data.
- Compromise of audit-read credentials must not permit access to production data.
- Sole-engineer operational credentials must not transitively grant audit-write
  authority.
- Separation controls must survive routine IAM mistakes and be periodically
  verified.

Implementation mechanism (project isolation, organization boundaries, org policy,
service-account restrictions, or equivalent) is selected and frozen in an ADR.

Quarterly attestation is required.

If attestation demonstrates that selected controls do not preserve independence
guarantees, isolation strength must be escalated before launch.

#### 2.11 Rate limiting strategy

**Decision:** Three layers of rate limiting:
- **Cloudflare front-line (FR-88):** IP-level rate limits + Bot Management + Turnstile
  challenges on signup, claim filing, helpdesk forms.
- **Per-session at API:** Fastify rate-limit plugin (`@fastify/rate-limit`) with
  configurable per-endpoint limits. Write endpoints stricter than read; signup endpoints
  strictest.
- **Per-resource throttling:**
  - OTP send: per-phone-number max N attempts / 15-min window + global cap to detect
    bulk attacks.
  - Search endpoints (public Member Directory, Sahyog List): per-IP + per-search-query
    throttling per FR-89.
  - WebAuthn registration / authentication: per-account throttle to prevent enrollment
    flooding.

**Threshold values** named in Category 5 Observability with named tuning policy.

**Default-deny rate-limit ceiling at bootstrap.** Every endpoint ships with a
generous-but-finite rate-limit ceiling at bootstrap. Category 5 tightens thresholds based
on observed traffic patterns; bootstrap ceilings are not "unlimited until Category 5."

#### 2.12 DPDPA control surfaces

**Decision:**
- **Consent registry** as a first-class table: `(user_id, pariwar_id, consent_category,
  version, granted_at, revoked_at, source_surface)`. Every consent grant is an event in
  `packages/events/`; consent revocation is a new event (per immutability rule).
- **RTBF (FR-96) mechanics:**
  - Soft-delete: member row's PII columns (Tier 1 + Tier 2 ciphertext) zeroed; Tier 3
    fields retained for historical contribution records.
  - Anonymization: contributions remain in the public Sahyog List as "an anonymous
    member"; verifier role references anonymized.
  - Identifier retention: Aadhaar HMAC hash retained for the 12-month rejoin lock
    (FR-6); cross-attempts under same Aadhaar fail attribution.
  - Audit log RTBF carve-out: regulatory necessity (Step 2) — audit entries are not
    anonymized.
- **Data export (FR-95):** pg-boss job (Class B priority); generates ZIP containing
  profile, contribution history, attribution chain, Contribution Notes (PDFs); download
  via short-lived signed URL.
- **Breach reporting:** incident-response procedure documented in ops runbook
  (Category 5); DPDPA notification timelines + DPO contact baked into the runbook.

**DPIA support + ownership.** The architecture must support DPIA execution and identify
DPIA ownership before launch. SDF classification is reviewed at named triggers
(member-base milestone, biometric data inclusion, regulatory threshold publication);
DPIA artifact lives in the trust's governance documentation, not in the codebase.

**Per-data-class retention.** A retention matrix maintained as a governed policy
artifact, named per data class (member profile, contribution history, field-worker
payout records, KYC, consent registry, audit log). Each row carries retention horizon +
post-horizon disposition (anonymize, delete, archive). The matrix is reviewed at the
same cadence as the threat-actor inventory (§2.1).

**Audit-log PII handling under RTBF.** Audit log entries reference users by stable
internal ID, not by name or other PII; PII-bearing surfaces in audit lines are looked up
at display time from the live member table, which respects RTBF anonymization. The audit
log retention is independent of member RTBF; the displayed-name-on-replay respects RTBF.
The trade-off (audit retention is structural; display-time identity is not) is documented
explicitly.

**KYC retention policy** derived from legal review and codified before launch.
Architecture commits the requirement; the specific period is committed in an ADR after
counsel review.

**Breach detection signals.** Named signals committed: cross-tenant read anomaly (volume
above per-actor baseline), PII export volume above per-actor baseline, RLS-policy bypass
attempts (any non-trivial counterexample), out-of-hours privileged admin sessions,
dead-letter accumulation in Class A jobs. Alert routing committed in Category 5; the
detection signal commitment is here.

**Minor-data handling at claim time.** When the nominee captured at claim time is a
minor, the claim flow:
- Captures minor identity under verifiable parental/guardian consent (separate consent
  record).
- Restricts minor-PII access to claim-disbursement workflow only.
- Suppresses minor identity from public surfaces (Sahyog Vivran shows family without
  minor's name; In Memoriam unaffected since the deceased is the member, not the minor).
- DPDPA §9 compliance carries to all minor-data handling.

#### 2.13 Member directory attributes — classification, authority layering, presentation, and hierarchy integrity

**Decision:** Ratified by the Trustee Panel 2026-08-19 across Decisions `2026-08-19-132`
through `-137` (routing notes G1–G4a). This section commits the **properties**; policy
detail lives in those entries, and scope-dimension mechanism in `ADR-0039`.

**⭐ 2.13.1 The attribute set is extensible and Pariwar-selected — never a fixed global schema.**
*(Decision `2026-08-19-132` R1/R7; eligibility class `2026-08-19-132` clause 3 as resolved by `2026-08-19-133` clauses 1 and 3.)*

⛔ There is **no canonical directory schema**. A Pariwar selects which governed attributes
apply to it: `Block` may be enabled for Shikshak and disabled for Rail, which instead uses
`Zone → Division`. A future Pariwar may need attributes that do not exist today. ⛔ Adding a
Pariwar must not require a new fixed schema column.

Every attribute carries **two orthogonal axes**:

| Axis | Values |
|---|---|
| **Provisioning category** | platform-common · Pariwar-specific · requires-new-governed-substrate |
| **Eligibility class** | hierarchical organizational unit · ordinary organizational/member attribute · individual attribute |

⭐ **RBAC eligibility is DERIVED from the eligibility class, never chosen.** A *hierarchical
organizational unit* (`Block`, `Zone`, `Division`) is **eligible**. An *ordinary
organizational* attribute (`School`) and an *individual* attribute (`Designation`) are
⛔ **permanently ineligible** — ineligible, not merely un-promoted. ⛔ The only way to change
eligibility is to change the **classification**, which is a material redefinition.

**⭐ 2.13.2 Authority is layered in three separate acts. No layer implies the next.**
*(Decision `2026-08-19-133` clauses 2 and 4; display-only default `2026-08-19-132` R2/R4.)*

| # | Layer | Authority |
|---|---|---|
| 1 | **CREATE the capability** — attribute + classification + hierarchy parent; eligibility derived | ⛔ Super Admin / Trustee Panel **only** |
| 2 | **ENABLE the capability** — this Pariwar's directory use; and, if eligible, whether this Pariwar uses it for RBAC | Per-Pariwar **scope**, governed **authority** |
| 3 | **GRANT authority** — a person, a role, a **named node** | ⛔ Trustee |

⛔ **Creating an attribute grants nobody anything. Enabling it grants nobody anything.** Only
layer 3 confers authority, and only over a named node. ⛔ A Pariwar Admin **cannot** create an
attribute or elevate one into an RBAC-capable class; they configure **permitted usage** of
already-governed attributes.

⭐ **Directory attributes are display-only BY DEFAULT** — they may not feed RBAC scope
containment, pool assignment, `is_valid`/`is_assignable`, or peer-mesh selection by virtue of
being defined or populated. Enforced **by signature**, following the advisory-`routed_to_role`
precedent. ⚠ Publishing a hierarchy may support hierarchy-scoped RBAC **independently of
directory adoption**; the two are separate questions.

**⭐ 2.13.3 A member's stored identity is separate from its public presentation.**
*(Decision `2026-08-19-136` clauses 1–3; source name and tier posture `2026-08-19-135`.)*

> **Member's legal/KYC name ≠ public-directory presentation of that name.**

One stored name; **N presentation modes**, selected by a per-Pariwar policy control
(`full_name` at launch → `shielded_name` → future modes). ⛔ Changing the mode must **not**
touch the stored KYC/legal name and must **not** require a second identity system. The
shipped `splitFirstNameLastInitial()` shield is the **implementation of `shielded_name`**.

⚠ **Scope and authority are different axes here too:** the control is **per-Pariwar** in
scope, and changing it is a **governed act** — ⛔ not a casual Pariwar-Admin toggle. The
policy may move in **either direction**; ⛔ it is not a one-way ratchet toward privacy.

⛔ **Full-name publication must not be hard-coded as permanent.** A build in which the public
name form cannot change without a code change **violates this section**.

**⭐ 2.13.4 Hierarchy integrity — the orphan state is designed out, not represented.**
*(Decision `2026-08-19-137` clauses 1–3 and 6–8.)*

> **INVARIANT: every node referenced by a live member assignment must exist in the in-force
> hierarchy.**

When a Pariwar restructures, collected assignments are **migrated**, not stranded:

- A **rename preserves the logical node** — identity is retained; it is not a migration.
- Successor node(s) must **exist before** the old assignment is retired.
- ⛔ **The system must never silently guess a mapping.** Deterministic transitions may be
  automatic; **ambiguous transitions require the member's own choice**.
- ⛔ **Deleting or orphaning a node that has members is FORBIDDEN.** With no successor, the
  old node **remains**.
- The Pariwar Admin **initiates and manages** migration; ⛔ the **member decides** the
  ambiguous case. Neither substitutes for the other.

*(Per-transition policy — the full six-case matrix — is ruled in Decision `2026-08-19-137`;
this section commits the invariant and the never-guess property.)*

⚠ **Two consequences this invariant creates, neither of which exists today:**

1. **The hierarchy publish path becomes member-aware.** Document validation today checks
   structure only (cycles, rank, parent-strictly-broader). Enforcing *forbidden* requires
   consulting **member assignments** at publish time — a new capability, not a new rule on an
   existing one.
2. **A pending-choice state is first-class.** A member choosing their own successor is not an
   authority act (2.13.2 still holds), but the state **must be representable**, and the
   Pariwar Admin must have visibility into who has not yet chosen. ⚠ With no deadline and no
   guessing, a split can remain **pending indefinitely** on one member — a direct and
   intended consequence of refusing to guess.

⚠ **Recorded control limit:** hierarchy-membership integrity **cannot** be expressed as a DB
`CHECK` constraint. It is app-layer, optionally trigger-backed — ⛔ **weaker than the
custom-field fence beside it**, and the next reader must not assume parity.

#### Decisions deferred to subsequent categories

- **OTP delivery channel (SMS DLT / WhatsApp / voice / in-app push)** — committed in an
  ADR with cost/coverage analysis.
- **Service-to-service auth mechanism** — committed at first split-trigger event.
- **Threshold values for rate limiting** — Category 5 Observability.
- **Auditor read replica topology** — Category 5 Infrastructure.
- **Secret rotation policy** — Category 5 Infrastructure.

### Category 3: API & Communication

#### 3.1 API style — REST + OpenAPI, Zod-derived

**Decision:** REST with OpenAPI 3.1 specs generated from Zod schemas. Single source of
truth: Zod schemas in `packages/contracts/` drive runtime validation
(`fastify-type-provider-zod`), OpenAPI documentation (`fastify-zod-openapi` +
`@fastify/swagger`), and TS client generation in `packages/api-client/`.

**Path convention:** `/api/v1/p/<pariwar_id>/<resource>/...` for tenant-scoped routes;
`/api/v1/global/<resource>` for the small set of cross-Pariwar endpoints (e.g.,
authentication, Pariwar lookup).

**Rationale:** REST + OpenAPI is the lowest-friction format for partner-module
integration (HDFC, LIC, future Crowdfunding gateway), serves the public-API surface
cleanly, and integrates with the existing Zod-everywhere discipline (§1.3, §2.7).
End-to-end type safety achieved via codegen from OpenAPI into `packages/api-client/`
rather than the type-leaking tRPC pattern.

**Surface scope:**
- Mobile, admin, helpline, public-site frontends consume the generated client from
  `packages/api-client/`.
- Partner modules consume the OpenAPI spec directly.
- The OpenAPI spec is the contract; clients are derived; deviations are build-time
  errors.

#### 3.2 Error handling, pagination, versioning conventions

**Structured error response:**
```
{
  "error": {
    "code": "<namespaced.error.code>",
    "message": "<human-readable>",
    "details": { ... },         // optional, per-error-type
    "request_id": "<uuid>"      // correlation id for log lookup
  }
}
```

- Error codes namespaced by domain (e.g., `pool.spawn.duplicate`, `member.suspended`,
  `claim.appeal.stage1_only`). Enumerated in `packages/contracts/errors/`.
- HTTP status codes per RFC standard.
- `request_id` echoed in response headers + log lines + audit entries for correlation.
- Member-facing copy translation happens in the client layer (Hindi/English via i18n);
  the API returns the structured code.

**Pagination:**
- **Cursor-based** by default; stable across writes during the read; cursor is opaque.
- Page size capped per FR-91 (max 50 for public surfaces; higher for authenticated
  admin queries within reason).
- `?cursor=<opaque>&limit=<n>` query parameters; response includes `next_cursor` +
  `has_more`.
- Forced pagination on public surfaces; `?limit=all` rejected (FR-91).

**Cursor binding.** Cursors are scoped to tenant (`pariwar_id`), resource type, ordering
key, and expiry. The architecture commits these properties; the signing mechanism (HMAC,
encrypted token, opaque server-side lookup) is committed in an implementation ADR.

**Versioning + evolution:**
- URL-based major versioning (`/api/v1/`, future `/api/v2/`).
- Additive (backwards-compatible) changes do not bump major: new optional fields, new
  endpoints, new enum values *only* in non-strict-enum positions.
- Breaking changes go through deprecation: announce in OpenAPI metadata + Sunset header,
  grace period, removal in next major.
- Zod schema versioning for transport contracts evolves with the API version.

**OpenAPI breaking-change detection.** CI runs semantic diff between the proposed
OpenAPI spec and the last published spec for the major version. Semantic-breaking diffs
fail the build unless the PR carries a reviewer-approved breaking-change tag.
Additive-looking changes that are semantically breaking (tightened regex, narrowed
union, removed enum value) are caught at this gate.

**Generator determinism.** Generator output committed to the repository
(`openapi/v1.yaml` or equivalent). CI verifies that re-running the generator produces
byte-identical output. fastify-zod-openapi version pinned. Drift between source schemas
and committed spec = build failure.

**Per-client-class migration window.** API major-version migration windows vary by
client class:
- **Partner integrations:** minimum notice committed in partner contracts; significantly
  longer than internal clients.
- **Mobile clients:** at least one app-update cycle past the announcement;
  minimum-version enforcement on the client side.
- **Internal-only clients** (admin web, public website, helpline): synchronized with
  backend deploy.

The architectural commitment is the *property* — migration windows are per-client-class,
not uniform. Specific timeframes in operations policy.

#### 3.3 Real-time updates — push notification primary; on-resume refresh

**Decision:** No persistent connections at v1. State-change events delivered via push
notifications (FCM/APNs); apps refresh state on launch, resume, or pull-to-refresh.
Polling for queue-like surfaces (verifier console, reconciliation triage) uses
short-interval polling (5–10s) on the active screen only.

**Rationale:** UX §6 commits push as load-bearing infrastructure. The 15-day cycle
cadence does not require sub-second updates. Persistent connections (SSE, WebSocket)
introduce connection-lifecycle complexity and Cloudflare-edge nuance for no commensurate
gain at Phase 1 scale.

**Push triggers:**
- Alert published (FR-22) → push to assigned members.
- Contribution confirmed / mismatch flagged (FR-30) → push to contributor.
- Claim status change → push to nominee + claim shepherd.
- Helpdesk reply → push to ticket owner.
- Module new (FR-65) → push to eligible members.

**Background refresh:** OS background-fetch hooks where supported (iOS BGAppRefresh,
Android WorkManager); explicit pull-to-refresh as the always-available path.

**Future trigger for SSE/WebSocket:** if a verifier-console real-time-decision-stream
pattern emerges (e.g., trustee live-vote on R9 special cases), connection-based
real-time joins the architecture. Until then, push + polling is sufficient.

**Notification isolation boundary.** One Pariwar's notification send surge must not
exhaust another Pariwar's send capacity. The architecture commits the isolation
property; the mechanism (separate FCM projects, separate credentials, dedicated rate
buckets, or other) is committed in Category 5 Observability.

**Push-token rotation.** Push tokens are marked invalid on FCM "not registered"
response; the member's active-token set is rebuilt at app-open (next-open registers the
current token and marks others stale); stale-token cleanup runs as a Class C pg-boss
job.

#### 3.4 Channel-provider abstraction — templated alert + central dispatcher

**Decision:** A canonical `Alert` object in `packages/events/` is rendered by per-channel
renderers and dispatched by a central dispatcher.

**Architectural shape:**
- **Canonical Alert** carries: alert_id, alert_type (alert-published, claim-status,
  contribution-confirmed, etc.), payload (structured per type), recipient set
  (member_ids), pariwar_id, timestamps.
- **Dispatcher** subscribes to alert events (via `packages/events/`); for each active
  channel per Pariwar (FR-23 admin toggle), calls the channel renderer + sends.
- **Per-channel renderer** in `apps/api/modules/channels/<channel>/`: takes Alert +
  recipient → produces channel-specific message (push payload, WhatsApp template params,
  Telegram markdown).
- **Per-channel send** delegates to the provider SDK; failures retry via pg-boss with
  channel-class priority (Class A for member-facing real-time alerts).

**Channels at v1 — three-tier hierarchy:**
- **In-app push (FCM HTTP v1 + APNs via Firebase Admin SDK)** — universal; every
  notification category; per-Pariwar FCM project; per-member device tokens stored
  encrypted (Tier 1 PII).
- **WhatsApp Business (Meta Cloud API)** — **dual-gated**: fires only when both
  (a) per-Pariwar admin toggle ON (FR-72) and (b) per-member opt-in ACTIVE (see
  Member WA opt-in flow below). Scope: Meta UTILITY templates only — payment
  reminder, payout issued, claim accepted, expiry warning, membership lapse.
  Per-Pariwar WA Business number is admin-configurable, not hardcoded. Per-Pariwar
  template approval workflow; provider interface allows BSP substitution.
- **SMS (DLT-transactional / PE/OE)** — preserved fire conditions: (i) OTP
  delivery (§2.2); (ii) step-up OTP (§2.2); (iii) per-member transactional
  fallback when both WA gates ON and WA delivery returns failure after the
  committed retry window; plus the per-Pariwar cycle-open SMS bridge below for
  degraded-push + disabled-WA conditions. Not a bulk-alert channel.
- **Telegram mirror (Bot API)** — fire-and-forget; announcements-only;
  per-Pariwar channel.

**Channel-provider abstraction discipline (Step 2 Cross-Cutting #10):**
- Each channel implements a small interface
  (`Channel.send(alert, recipient): Promise<SendResult>`).
- Providers are swappable; WhatsApp BSP swap, FCM-to-PWA-push swap, future DLT-SMS,
  future IVR all drop in.
- Per-Pariwar config selects active channels; templates live alongside their renderer.

**Power-saver awareness (UX P0-2):** push delivery success ≠ push visibility.
Members on power-saver-enabled Android devices may not see pushes. Mitigation:
- In-app banner on next open showing missed alerts.
- **Cycle-open SMS bridge (Pariwar-degraded-mode fallback):** for cycle-open
  and other time-critical templates, when per-Pariwar push delivery rate falls
  below threshold AND the Pariwar WA admin-toggle is OFF, dispatcher fires a
  per-Pariwar SMS bridge to members. This is distinct from per-member WA-failure
  fallback (above) and from bulk-alert SMS (banned per RA-29) — it is a narrow
  degraded-mode safety net for time-critical communications. Trigger thresholds
  in Category 5 Observability.

**Template approval lead-time policy.** Channel template changes (especially WhatsApp
Business templates requiring Meta approval) follow an approval lead-time policy.
Cycle-cadence templates (cycle-open, deadline-reminder, contribution-confirmed,
close-of-cycle) have a lead-time floor that protects the cycle from in-flight template
approval lag. The principle is committed here; specific lead-time windows live in
operations policy, not architecture.

**Mid-cycle template suspension fallback.** If a primary WhatsApp template is suspended
by Meta mid-dispatch, the dispatcher falls back to a per-Pariwar pre-approved fallback
template (generic announcement format; simpler copy that doesn't trigger the
suspension). Pre-approved fallback templates are maintained per Pariwar as part of
operations policy. Members affected by the template switch see the fallback content;
in-app push remains unaffected.

**Telegram channel privacy posture.** Telegram mirror is announcements-only — alert
published, cycle-close summary, public news. Per-member and per-claim content
(contribution-confirmed, helpdesk-reply, claim-status-change) is not eligible for
Telegram dispatch. Enforcement mechanism committed in an implementation ADR.

**Channel-renderer escaping discipline.** Per-channel renderer escapes payload data at
variable substitution. CI test asserts that a fixture of "name with markdown / template
syntax" renders as inert text in each channel.

**Provider authentication lifecycle.** Provider authentication (FCM service-account
JWT, APNs auth token, partner JWT signing keys, telephony provider tokens) must be
automatically refreshed and verified. The architecture commits the property; SDK choice
is an implementation decision.

**Provider-quota self-regulation.** The dispatcher self-regulates to stay within each
provider's published quota and degrades gracefully when quota is approached or
exceeded. Mechanism (token bucket, queue pacing, batching, or other) committed in
Category 5 Observability.

**Replayable outbound dispatch.** Outbound dispatch (push, WhatsApp, Telegram, partner)
stores **message intent** — the canonical request: target, payload, channel, timestamp,
attempt counter — not just the provider's send-result. Provider response is captured but
is not the source of truth. After a provider outage or transient failure, the intent log
is replayable; missed sends can be re-dispatched without recomputing what should have
been sent. Replay is idempotent: the provider-side dedup (where supported) or the
intent's idempotency key prevents double-sends.

**Intent storage isolation principle.** High-volume dispatch intent storage must not
contend with audit durability paths. The intent log and the audit log (§1.5) are
different durability surfaces — one is a working record of outbound dispatch, the other
is the immutable record of state transitions. Batch persistence is permitted for
fan-out efficiency. Specific isolation mechanism (separate table, tablespace, cluster,
or other) and batch sizing committed in Category 5.

**Time-to-fan-out budget.** Cycle-open push notifications target ≥95% delivery within a
committed window after cycle freeze (specific minutes in Category 5 NFR). Under
provider-quota strain (per quota self-regulation), the budget degrades gracefully — the
dispatch window extends rather than dropping members. Degradation is observable and
member-facing UX absorbs the extended window without panic framing.

**WhatsApp Business dispatch is structurally multi-day at scale.** At 4L members +
WhatsApp Business throughput tiers, cycle-open WhatsApp dispatch starts at freeze and
continues over the dispatch tail (1–4 days depending on tier + Meta-approval status).
Cycle-open *push* is the timely channel; *WhatsApp* is the durable mirror for members
who depend on it. Member-facing UX commitments around WhatsApp reflect this shape (per
UX §6 channel hierarchy).

**Per-Pariwar provider selection.** Channel and integration providers may be globally
configured or per-Pariwar configured; each integration's provider interface declares
its scope. Per-Pariwar providers carry their own credentials, quotas, and observability
scope. Telephony, WhatsApp BSP, and OCR provider are likely candidates for per-Pariwar
selection; FCM may remain global; DigiLocker is single-tenant by design (govt KYC).
The architecture commits the *property*; per-integration scoping decisions live in the
integration capability registry (§3.13).

**Lifecycle-driven dispatch suppression.** When a member account enters a frozen state
in the Account State Machine (`claim-filed-frozen`, `disbursed-frozen-readable`,
`disabled-T+90`, `public-record-∞`), the dispatcher suppresses member-class push
notifications for that account at the dispatch boundary. Claim-shepherd communications
continue through the appropriate channel. Frontend surfaces reflect this state (clear
locally cached/queued push surfaces on next open) but the *policy* lives here — the
dispatcher is the single source of truth for what gets dispatched to whom.

**Member WA opt-in flow.** Members self-declare WhatsApp availability during
onboarding:
- After mobile-OTP verification, member is offered: **"Do you have WhatsApp? Get
  notified on WhatsApp?"**
- **"Yes" branch:** app opens WhatsApp via deeplink to the Pariwar's WA Business
  number with a pre-filled message: **"Hello, I would like to get notifications
  on WhatsApp."** Member must tap send to complete opt-in.
- **Inbound message handling:** WA webhook (§3.11) matches the inbound WA number
  to member-mobile-on-file (assumption: same number; mismatch logged + surfaced
  for member confirmation). On match: WA opt-in state set to ACTIVE + opt-in
  timestamp recorded in audit log + Meta 24h customer-service window opened.
- **"No" branch** (or member doesn't send the message during onboarding): opt-in
  remains INACTIVE. Settings surface presents a retry CTA: "Want WhatsApp
  notifications? Tap here to enable."
- **Opt-in withdrawal:** member disables from app settings (audit-logged) or
  sends STOP message to the Pariwar's WA Business number (handled by inbound
  webhook; audit-logged).
- **Per-Pariwar WA Business number** stored in Pariwar config (Pariwar Admin UI;
  default NULL — WA disabled at Pariwar until configured); changes are trustee
  authority + audit-logged.
- **Opt-in origination requirement.** WA opt-in state may only transition to
  ACTIVE via a **user-initiated interaction** (the user-sent WhatsApp message
  above) or an **explicit affirmative consent capture** in-app (recorded with
  timestamp + the UI context). Passive defaults, pre-checked boxes, bundled
  consent, or inference from other settings are not valid opt-in origins. This
  protects against compliance drift under Meta policy and DPDPA consent
  semantics.
- **Fallback driven by WA-Cloud-API undelivered status,** not pre-send presence
  detection.

**In-app-engagement cost optimization (per-Pariwar, FR-58C-flag-gated).**
- Per-Pariwar admin toggle (separate from WA admin-toggle FR-72): when ON,
  dispatcher suppresses WA send if the member acted on the same notification's
  in-app surface within the optimization staleness window (default 6 hours;
  tunable in Category 5 Observability).
- **Time-critical templates always send through both channels** regardless of
  the optimization toggle:
  - Payment reminder within 48 hours of cycle close.
  - Expiry warning within 7 days of expiry.
  - Payout issued.
- Cost-suppression decisions emit audit lines + per-Pariwar observability
  metrics.
- Optimization is independent of per-member opt-in: a member with opt-in ACTIVE
  may still see suppressed WA sends under the optimization rule.

**Per-member fallback SMS dispatch.** When both WA gates are ACTIVE (Pariwar
admin + member opt-in) and WA delivery returns undelivered after the committed
retry window (3 attempts × exponential backoff), the dispatcher fires a
DLT-transactional SMS containing the equivalent template payload. Fallback
fires per message, not per cohort. Members without active WA opt-in receive
only in-app push for non-OTP notifications — they do not receive transactional-
fallback SMS.

#### 3.5 Telephony integration — Helpline Operator console (Persona #7)

**Scope demarcation.** This section covers telephony / CTI only — inbound call
routing, outbound dialing, call recording, screen-pop. **The helpdesk ticketing
subsystem (FR-52) is a distinct capability** with its own backend module, admin
UI, and member-facing UI — committed in §3.5a below. The Helpline Operator role
(FR-46) is one scope that receives helpdesk ticket assignments per FR-52; the
role spans both subsystems but the subsystems themselves are independent.

**Decision:** CTI integration via a provider interface in `apps/api/modules/telephony/`;
specific provider committed in an ADR (Twilio India region, Exotel, Knowlarity, Plivo —
India-region capable).

**Architectural shape:**
- **Inbound call → webhook** at `apps/api/telephony/webhook` → identifies member via
  caller ID → emits a `helpline.call.inbound` event → triggers screen-pop in
  `apps/admin/modules/helpline/` via push notification to the operator's active session.
- **Outbound calls** initiated from the operator dashboard; same provider; logged with
  call metadata.
- **WebRTC** for browser-side audio (operator handset is the browser); STUN/TURN per
  provider.
- **Call recording** (per consent committed at call open) → object storage with
  retention per §2.12 per-data-class matrix.
- **Provider abstraction** isolates the provider-specific SDK behind a uniform
  interface; swap is config + adapter change.

**Connection-lifecycle independence (Step 2 split trigger):** when the helpline-bridge
needs independent connection lifecycle from the HTTP API (persistent WebSocket
maintenance, separate restart cadence), `apps/api/modules/telephony/` graduates to
`apps/telephony-bridge/` per the Step 3 split-trigger criteria.

**Webhook signature verification.** Every telephony webhook is signed by the provider;
TWT verifies the signature at entry; unverified or invalid-signature requests fail
closed (404, to avoid leaking webhook existence to probes).

**Caller ID treated as hint, not identifier.** Inbound caller ID can be spoofed (VoIP
relays, international call routing). The operator console presents the caller-ID-matched
member as a candidate; the operator confirms member identity via secondary signal
(member states eHRMS ID, or a per-call verification code the operator reads out and the
member confirms in-app or via another channel).

**Call-recording consent ordering.** Recording is gated on a "consent-acknowledged"
flag; the flag flips when the operator confirms consent in the console after reading the
consent statement. Pre-consent audio is dropped at the recording layer (not just
trimmed in post-processing) — the system never holds unconsented audio.

**Telephony provider fallback policy:**
- **Inbound fallback:** secondary number with auto-attendant routing handled at the
  carrier level; member-facing comms templated ("we're experiencing technical
  difficulties; please call back / leave a message via WhatsApp").
- **Outbound fallback:** degraded mode — operators notified the outbound channel is
  down; calls deferred; outbound-required workflows pause until restoration.
- **Multi-provider redundancy** is an operational choice in Category 5; the architecture
  commits the fallback property, not the redundancy mechanism.

#### 3.5a Helpdesk ticketing subsystem (FR-52)

**Decision:** Helpdesk is a first-class subsystem distinct from telephony.
PRD FR-52 commits the capability (members open tickets; routed by category +
scope to admin roles). Architecture commits the structural shape; routing-policy
specifics (category-to-scope mapping rules) are rule-registry-driven, not
hardcoded.

**Backend module:** `apps/api/modules/helpdesk/`. Owns:
- Ticket lifecycle primitives (create, assign, transition, reopen, close).
- Category-based routing logic against the routing-policy registry.
- Scope-based assignment via RBAC scope dimensions (§2.6, FR-45).
- Audit-log emission per state transition (Cross-Cutting #2).

**Admin UI module:** `apps/admin/modules/helpdesk/`. Owns:
- Ticket queue per scope (Pariwar / district / block / role).
- Ticket detail view + reply composition.
- Bulk operations on tickets (per FR-49).
- Scope-filtered search + saved filters.

**Member-facing UI:** member app surfaces (native + responsive web). Members see
their own tickets + status, append replies, and receive helpdesk-reply push
notifications (per channel hierarchy §3.4).

**Contracts:** `packages/contracts/helpdesk/`. Owns the API contracts shared by
backend + admin UI + member UI; type tests assert contract-domain alignment
(per §1.3 discipline).

**Ticket state primitive.** The state set and transitions are committed in PRD
FR-52. Architecture commits: (a) ticket state is derived from event history per
Cross-Cutting #4 (Determinism & replay) — persisted state is an optimization,
not the source of truth; (b) every state transition emits a structured audit
event per Cross-Cutting #2; (c) state changes are queryable for past points in
time via event replay.

**Routing policy (rule-registry-driven, not hardcoded):**
- Category-to-scope mapping (e.g., `category=kyc-trouble → scope=district-admin`)
  lives in the per-Pariwar rule registry alongside Niyamavali (FR-7) and the
  per-Pariwar capability registry (§3.13).
- Per-Pariwar overrides allowed; default routing-policy ships with v1.
- Routing changes are audit-logged + versioned.

**Integration points** (other admin modules that read/write helpdesk):
- **Helpline (§3.5):** Helpline Operator can create a helpdesk ticket from a
  live call (call metadata as ticket attachment); a helpdesk ticket can trigger
  an outbound call from helpline.
- **Claim (claim modules):** `claim-status` category tickets cross-link to
  the claim record; resolution may update claim state where authorized by role.
- **Reconciliation (§3.6):** `UTR-mismatch` category tickets cross-link to the
  reconciliation queue; can attach the relevant bank-statement line.
- **Module Marketplace (§3.7):** `partner-module-issue` category tickets
  cross-link to the partner integration handler.
- **Validity service (FR-12A):** `profile-update` category tickets read
  member-state for context.

**SLA policy** lives in operations policy + the routing-policy registry, not
architecture. Architecture commits that SLA budgets per category are queryable,
breach signals are surfaced to the assignee's queue, and breach events emit
audit lines.

**Form ingress** (member-side ticket submission) flows through the standard
API path with rate-limiting + bot-management gates (§2.11, §5.8a); helpdesk
form surfaces are named in the FR-88 protected-surface list.

**Lifecycle dispatch suppression (§3.4 cross-reference):** tickets owned by
members in frozen Account States may remain open in the assignee queue; member-
class notifications about those tickets are suppressed per §3.4 dispatch-
suppression policy.

#### 3.6 Bank statement intake transport — reconciliation matcher input (OQ-2)

**Decision:** CSV-first hybrid (Option C from PRD addendum §4). Ship CSV-only first; add
PDF + OCR fallback when the first non-CSV bank arrives.

**Transport:**
- Multipart upload endpoint in `apps/api/modules/reconciliation/` for CSV (and later
  PDF).
- Nominee-shepherd auth per §2.3 admin auth + scope check (claim-specific).
- Files quarantined in a virus-scan staging bucket; clean files promoted to the parser
  ingestion path.
- Object storage: Cloud Storage in `asia-south1` (per §5.2).

**Parser pipeline:**
- **CSV path:** `csv-parse` (Node.js streaming; production-grade; active maintenance).
  Parser produces normalized statement rows per the schema in
  `packages/domain/bank-statement/`.
- **PDF path (added when first non-CSV bank requires it):** PDF + OCR; rendered text
  passed through the same parser pipeline to produce normalized rows.
- **Per-bank parser variant** in `packages/bank-parsers/<pariwar_id>/<bank>/`; 50
  golden-file tests per bank per UX commitment.

**Normalized statement-row schema (Step 2 [P0] carryover):** the common shape all bank
parsers emit before the matcher consumes. Schema in `packages/domain/bank-statement/`:
`{datetime, amount, sender_name?, sender_vpa?, utr, narration, source_bank, source_account}`.
First-class schema; CI guards that all parser outputs conform.

**Matcher consumes** the normalized stream + member UTR self-attestations + nominee
account list to produce match decisions per FR-30. Matcher job scheduling +
parallelization committed in Category 5.

**Statement input + output discipline:**
- **CSV inputs preserved.** Bank statement intake parses CSV into structured data; the
  original narration values are stored unmodified and consumed unmodified by the matcher.
- **CSV outputs sanitized.** Any CSV TWT generates for human consumption (audit log
  export, statement archive download, member directory export) is sanitized at export —
  fields beginning with `=`, `+`, `-`, `@` are prefixed with a literal escape. Downstream
  tools (Excel, LibreOffice) that may interpret formulas receive inert data.
- **PDF-OCR confidence scoring:** PDF OCR results carry per-row confidence scores; rows
  below a named threshold land in the reconciliation review queue (FR-50) for manual
  triage; high-confidence rows flow to the matcher.

**OCR pipeline pacing.** PDF + OCR runs as a separately-paced stage with its own worker
pool, distinct from the matcher's read/write path. Per-statement OCR latency budget
committed (specific value in Category 5); statements exceeding the budget surface as a
P1 to ops. PDF + OCR is a Phase-2 commitment (first non-CSV bank arrives); the *pacing
property* — OCR has its own stage with its own throughput sizing — is committed now so
the reconciliation latency budget (FR-30 p95 < 4h) is preserved as OCR enters scope.

**Load-bearing invariant — canonical financial truth (Cross-Cutting #4; Story 9.4
producer / Story 9.5 fence).** Confirmed-contribution truth derives **EXCLUSIVELY** from
the `contribution.confirmed` event-derived state — the matcher's single reconciliation
verdict. No surface may independently claim a contribution is "confirmed" by inferring it
from a yellow self-attestation (`contribution.utr-attested`), a member-pasted UTR, a
pending state, or any other proxy; every consumer — the My Pool progress meter (Story
8.2), the live contributor list (8.3), the Yogdaan Bahi (8.6), the reminder-suppression
set (8.8), the future PoolProgressCard (9.12), Sahyog Drive (Epic 11b), the public stat
strip (Epic 11a), and every Epic-10 analytics / audit / regulatory export — **MUST read
that event-derived state, never reconstruct "confirmed" from inputs.** The **ONLY**
un-confirm path is the trustee-attested `reconciliation.confirmation-reversed` compensating
event (Story 9.8 producer): confirmation only ever moves forward except by that explicit,
attested walk-back, which backs the confirmation out of every consumer by a per-confirmation
event-id chain (a re-confirmation re-greens; the derived intermediate state is `held`).
The enforcement artifact is the executable fence
`packages/domain/tests/contribution/canonical-financial-truth.test.ts` (Story 9.5) — a
single-authority-constant scan + the live-DB reversal-consumer proof; a future consumer
that re-spells the confirmed event type or mixes yellow into a confirmed aggregate fails it
at PR time. A new consumer author points here and reads the event-derived state.

#### 3.7 Module Marketplace lead-handoff transport

**Decision:** Lead submission contract in `packages/contracts/module-leads/`. Per-partner
endpoint receives leads with TWT attribution; partner authentication via signed JWT
(asymmetric — partner holds TWT's public key for verification).

**Architectural shape:**
- Member taps Apply on a module card (FR-65) → consent capture (DPDPA, per surface
  category) → lead submission to TWT API.
- TWT API generates a signed-JWT lead envelope (member-attributed, scope-redacted to
  partner-allowed fields per FR-66 wizard) → POSTs to the partner endpoint.
- Partner response acknowledges receipt + provides downstream tracking reference.
- All lead submissions audit-logged.

**Partner contract evolution:** versioned per-partner; partner contract changes do not
cascade to other partners.

**Cross-Pariwar implication:** lead contracts are per-Pariwar (TWT-Bihar's HDFC contract
≠ future Rail Parivar's HDFC contract); contract storage scoped by `pariwar_id`.

**Partner webhook retry + UX state:**
- **Retry policy:** exponential backoff with named ceiling; dead-letter to the
  partner-coordination admin queue after exhaustion.
- **Member UX state:** lead status is `delivered | pending_retry | failed_delivery`;
  visible to the member in the Module Shelf entry; helpdesk can resubmit via admin.
- **Partner-side dedup:** TWT lead JWT carries a nonce; partner is contractually
  expected to dedupe by nonce. Contract clause + dedup expectation lives in the partner
  data-handling agreement.

**Per-partner circuit breaker + concurrency limit:**
- **Circuit breaker** per partner endpoint: opens after N consecutive failures;
  half-open after cooldown; closes after N consecutive successes.
- **Per-partner outbound concurrency limit:** caps simultaneous in-flight retries so
  one flaky partner doesn't crowd out other partners' lead-handoff path.
- Open circuit surfaces to the partner-coordination admin view; dead-letter triage
  continues independently.

#### 3.8 DigiLocker integration transport

**Decision:** See §2.8 for OAuth flow + signature verification policy. Transport
specifics:
- Provider interface in `apps/api/modules/digilocker/`; isolates the DigiLocker SDK
  behind a uniform contract.
- Signed-XML schema in `packages/domain/digilocker/` for parsing the eAadhaar response.
- Public-certificate cache in a dedicated table (`digilocker_public_certs`); refreshed
  by daily pg-boss job per §2.8.

**Aggregator substitution path:** if direct DigiLocker integration proves operationally
heavy (rate limits, certificate-rotation cycles, API instability), the provider
interface allows substitution with an aggregator (Setu, Surepass, etc.) as a swap —
not a rewrite.

**DigiLocker certificate staleness budget:**
- Staleness budget named in an ADR with two windows: a within-budget window during
  which the cached certificate is trusted and staleness alarms fire, and a hard limit
  past which new KYC verifications fail closed.
- Within budget: cached certificate trusted; alarms surface the staleness to operations.
- Past budget: new KYC verifications fail closed → members land in `pending-valid` with
  manual trustee fallback per FR-2; existing verified members are unaffected.

#### 3.9 Read consistency policy

Each read path declares its consistency expectation:
- **Strong consistency:** Pool Engine internal reads during spawn, claim state
  transitions, RLS-enforced privileged operations.
- **Eventual consistency acceptable:** public surfaces (Sahyog List, Member Directory),
  Auditor + Reports.
- **Cacheable:** high-volume read-mostly surfaces where staleness within a named budget
  is acceptable.

**FR-12A is not cache-first globally.** Member Validity Service has both a cached path
(member self-service, frequent reads with stable input) and a non-cached path (helpdesk
operations, dispute resolution, verifier console review, any support surface where
stale-read consequences are high). The declaration of which path applies lives in the
calling code's contract, not in FR-12A's implementation.

Routing committed in Category 5 (Infrastructure).

#### 3.10 External-API deprecation monitoring

Every external API integration (DigiLocker, FCM/APNs, telephony provider, WhatsApp
Business, Telegram Bot API, partner endpoints, bank statement formats) has a named
monitoring owner responsible for tracking the provider's deprecation announcements.
Owner check-in cadence committed in operations policy.

The architectural property: every external API has an accountable monitoring owner;
no integration is "set and forget."

**PAN verification follows the external integration contract pattern.** When 80G
receipts ship (Phase 2/3), PAN verification is added as an external integration
following the same patterns as DigiLocker and other external calls:
- Provider abstraction (§3.4 provider interface; per-Pariwar if applicable per §3.4
  per-Pariwar provider selection).
- HTTP timeout + circuit breaker + retry policy (§3.12).
- Deprecation monitoring with named owner (this section).
- Audit-line emission per verification call.

PAN is a checksummed identifier, not a cryptographically-signed credential — no
signature-verification pattern (unlike DigiLocker's eAadhaar). The integration handles
checksum validation + provider response handling.

#### 3.11 Webhook ingress pattern — persist + ack

Every inbound webhook (telephony provider, partner replies, bank-statement push, future
payment-gateway callbacks, future Crowdfunding Module donor confirms) follows the
**persist + ack** pattern:
1. **Verify** provider signature at handler entry (per §3.5, §2.8 patterns).
2. **Persist** the inbound event to a dedicated webhook-queue table.
3. **ACK** the provider (200 OK + minimal body).
4. **Return.** No business logic, no synchronous downstream calls, no external API
   calls in the handler path.

Workers process the webhook queue asynchronously per pg-boss job classes (§1.4). The
ingress path's only durable work is verify + write + ack — a provider's outbound burst
(intentional batch or recovery replay) cannot starve other API handlers.

#### 3.12 External-call resilience

Per-external-integration HTTP timeout + circuit breaker as a cross-cutting architectural
pattern. Every external API call (DigiLocker, FCM, APNs, WhatsApp Business, Telegram,
telephony provider, partner endpoints, bank-statement upload services, future
payment-gateway, future Crowdfunding endpoints) carries:
- **Timeout** — conservative default (≤ provider's documented latency budget × 3);
  per-integration override allowed with rationale.
- **Circuit breaker** — opens after N consecutive failures; half-open after cooldown;
  closes after N consecutive successes. Open circuit surfaces to the integration-owner
  admin view.
- **Retry policy** — exponential backoff with named ceiling, per-integration; retry
  budget capped to prevent retry storms.

The partner-specific circuit breaker (§3.7) is a specialization of this cross-cutting
pattern. Per-integration thresholds committed in Category 5; the architectural
commitment here is the property — every external call has timeout + breaker + retry
policy declared at the integration boundary.

#### 3.13 Per-Pariwar configurability and extensibility

**Actor-class extensibility in the identity model.** The identity model carries an
`identity_type` field, extensible by enumeration. Known classes at v1: member, admin,
partner, nominee. Future classes (public donor for the Crowdfunding Module in Phase 2/3,
future actor classes) extend the enumeration; no schema rewrite required. The
architecture commits the *extensibility property* — not the specific future schemas.
Concrete donor tables, donor consent flows, donor auth path are deferred to the Phase
that ships them.

**Cross-Pariwar role composition.** Role grants are scoped to a single Pariwar. A user's
effective role set is the union of grants across their Pariwar memberships, evaluated
*per active scope*; the active scope (URL path per §2.5) selects the role grants
applicable to that scope; cross-scope role inheritance is forbidden by default. The
grant tuple in `packages/domain/permissions/` is `(user_id, pariwar_id, role)`, not
`(user_id, role)`. Extends §2.6 RBAC enforcement.

**Integration capability registry.** Every external integration (DigiLocker, FCM, APNs,
WhatsApp Business, Telegram, telephony provider, bank-statement intake, partner
endpoints, future PAN verification, future video-KYC, future payment gateway) declares
its **capabilities** and **per-Pariwar availability** in a single registry. Per-Pariwar
availability is consulted before integration use; capability declarations drive feature
gating (e.g., "this Pariwar's WhatsApp is Tier-2, so multi-day-dispatch policy
applies"). The registry sits alongside the per-Pariwar Niyamavali rule registry; both
are first-class trustee-visible configuration.

#### Decisions deferred to subsequent categories

- **Push provider final selection** (FCM-only vs FCM + native APNs vs Firebase Cloud
  Messaging for both) — committed in an ADR after cloud-provider final selection.
- **WhatsApp Business provider** (Meta direct vs BSP — Gupshup, Wati, etc.) — committed
  in an ADR with template-approval-cadence analysis.
- **Telephony provider final selection** — committed in an ADR with India-region
  capability + recording compliance review.
- **Background-fetch hook implementation** per platform (Expo Background Tasks, native
  modules) — implementation detail; surface in Category 4 frontend architecture.
- **OpenAPI client-generation tool** (openapi-typescript-codegen, Orval, Kubb, etc.) —
  implementation detail in an ADR.
- **Cursor signing mechanism** (HMAC, encrypted token, opaque server-side lookup) —
  committed in an implementation ADR.
- **Intent storage isolation mechanism** (separate table, tablespace, cluster) —
  Category 5.
- **Time-to-fan-out budget specific value** (95% delivery within N minutes) —
  Category 5.
- **Per-statement OCR latency budget specific value** — Category 5.
- **Pre-cycle-open cache warming + amendment-deployment lead-time window** — operations
  policy.

### Category 4: Frontend Architecture

**Category 4 cross-reference index** — cross-cutting rules referenced across categories:
- **Notifications + dispatch suppression** → primary in Category 3 §3.4; frontend
  reflects state.
- **Authentication + session model + auth recovery mechanics** → primary in
  Category 2 §2.2–§2.4; frontend §4.9 covers recovery-path UX.
- **Offline cache + mutation handling** → §4.5 + §4.5a (primary here).
- **Accessibility** → §4.10 (horizontal; cross-references §4.15 for actor-class register).
- **Actor adaptation (member / admin / nominee / partner / future donor)** → §4.15
  (authority).

#### 4.1 Frontend stack overview

The frontend layer spans runnable surfaces sharing a TS-everywhere foundation:

| Surface | Stack | Primary concern |
|---|---|---|
| `apps/mobile/` | Expo + RN + Tamagui + Expo Router | Member-facing UX; offline-capable; P0-5 ratifies the native stack |
| `apps/public/` | Astro 6 (SSR + islands) | SEO-mandatory pages; minimal JS by default; progressive enhancement |
| `apps/admin/` (with `modules/helpline/`) | Vite + React + Tailwind + Radix | Heavy data tables; verifier console at ₹50L stakes; helpline CTI host |
| Member-responsive web | Expo-router-web from `apps/mobile/` | Code reuse with native; split criteria per Step 3 |
| Field-worker dispatch | Scope deferred | Surface placement (within `apps/mobile/` with role gating, or separate workspace) committed when field-worker network operations begin |

Shared layer: `packages/tokens/`, `packages/i18n/`, `packages/contracts/`,
`packages/api-client/` (generated), `packages/platform-adapters/`.

#### 4.2 Server-state management — TanStack Query (universal)

**Decision:** TanStack Query as the universal server-state layer across mobile + admin
+ helpline + public-site islands.

**Architectural shape:**
- Query hooks generated from OpenAPI / Zod contracts via the OpenAPI client tool
  (Category 3 §3.1; specific tool in ADR).
- Per-Pariwar query keys include `pariwar_id` in the key tuple to prevent cross-tenant
  cache pollution.
- Mutation patterns: optimistic updates for member-app contribution attestation
  (UX expects sub-2-minute loop); pessimistic for admin decisions (verifier console
  expects server-confirmed outcomes).
- Background refetch on app resume + on window focus; aligns with Category 3 §3.3
  on-resume refresh.

**NetInfo + online manager (native).** Connection status drives the QueryClient's
`onlineManager`; queries paused offline; resumed on reconnect; UI reads `isOnline`
from a shared hook.

**Cold-start hydration UX.** App boot renders a loading skeleton until first hydration
completes; subsequent paints show cached data with a revalidation pulse. Reinstall
detection (new install ID) drops the cache + prompts re-auth before hydrating
stale-account data.

**Authoritative-status reconciliation.** The cache is *advisory* for status-bearing
reads (FR-12A validity, claim state, contribution state). The authoritative read is
required before any action on the status. Transitions emit a UI event
(`authoritative-state-change`); affected screens listen and re-render with the
server-truth state + a member-class copy line if the change surprises the user.

**Cold-start query priority ordering.** FR-12A status read fires first on cold-start;
other queries (Sahyog Drive, Module Shelf, history) queue behind. The 200 ms p95
budget for FR-12A (Step 2 NFR) is preserved by sequencing rather than letting
revalidation chatter contend. Mechanism (TanStack Query `enabled` + sequencing layer,
explicit boot orchestrator, or other) in an ADR.

**Notification suppression (cross-reference).** Per Category 3 §3.4 "Lifecycle-driven
dispatch suppression," the dispatcher suppresses member-class pushes for frozen
accounts. On the frontend: locally queued or cached push surfaces are cleared on next
open for accounts in frozen states. Frontend reflects; does not duplicate the policy.

**Long-session recoverability.** Surfaces must remain recoverable during extended
sessions (Anita's 6+ hour days; helpline operator shifts; trustee deep-review sessions).
Subscriptions have bounded lifecycles (mount/unmount cleanly; no leaked event
listeners); memory bounds enforced on accumulated client state (Zustand stores,
in-memory caches); browser-tab restoration handled on admin/helpline web. The
architecture commits *recoverability* as the property; specific cleanup mechanisms in
ADRs. No forced refresh or remount cycles.

#### 4.3 Client-state management — Zustand

**Decision:** Zustand for non-server client state (UI state, ephemeral flows,
cross-screen state).

**Boundary discipline:**
- **Server state** (members, pools, alerts, contributions, claims, audit log) →
  TanStack Query. No mirror in Zustand.
- **Client state** (current onboarding step, draft form values across screens, UI
  preferences, active filters) → Zustand.
- **Auth/session state** (authenticated user, active `pariwar_id`, role set per active
  scope per §3.13) → Zustand store hydrated from server on session boot.

**Store structure:** small, purpose-scoped stores rather than one monolithic store.
Each store exports typed selectors. CI lint forbids importing one store's internals
from another store's code.

#### 4.4 Form handling — hybrid

**Decision:**
- **Astro public site:** native HTML `<form>` + manual Zod validation via Astro Actions
  (Astro 6's type-safe form pattern). Forms work with zero client-side JS; progressively
  enhanced where interactive feedback adds value.
- **React surfaces (mobile + admin + helpline):** React Hook Form + Zod
  (`@hookform/resolvers/zod`). Same Zod schemas from `packages/contracts/` validate
  client + server inputs.

**Rationale:** the public site's primary forms benefit from zero-JS submission for SEO
+ accessibility + reliability. React surfaces have rich form interactions (multi-step
KYC, claim filing, role configuration) where RHF's uncontrolled-component performance
is meaningful.

**Discipline:** form-level validation uses the same Zod schema as the API endpoint
validates against; CI type test (§1.3) asserts assignability between contract types and
form input types.

**Cross-surface validation parity test.** Zod schemas in `packages/contracts/` are
consumed by three runtimes: Astro Actions (public site), React Hook Form via
`@hookform/resolvers/zod` (React surfaces), and `fastify-type-provider-zod` (API). A
CI test runs a fixture set (`{valid_inputs, invalid_inputs}`) through each runtime;
outputs must agree. Drift between consumer validation behaviors = build failure.
Extends §1.3 type-test discipline to runtime validation parity.

#### 4.5 Offline cache strategy

**Decision:**
- **Native (mobile):** MMKV as the persistence layer; TanStack Query's
  `persistQueryClient` plugin uses an MMKV persister to hydrate cache on app open.
  MMKV is JSI-based, synchronous, ~10–30× faster than AsyncStorage at scale.
- **Web (admin, helpline, Astro islands):** IndexedDB as the persistence layer;
  TanStack Query's IndexedDB persister hydrates cache.
- **Sensitive data** (auth tokens, refresh tokens, key material) → `expo-secure-store`
  on native; secure browser storage on web. Never in MMKV/IndexedDB unencrypted.

**Cache scope discipline:**
- Member-facing read-only surfaces cached for offline read.
- Member-facing write actions require network; queued for retry per §4.5a.
- Admin surfaces: cache-disabled for verifier-console reads (§3.9 strong-consistency
  expectation); cache-enabled for reference data.

**MMKV operational note:** requires Expo's Continuous Native Generation (CNG) workflow,
not Expo Go. Consistent with P0-5 native-stack validation experiment scope (UX §6).

**Cache schema versioning.** Cached entries carry a schema version. On cold-start
hydration, mismatched-version entries are dropped (forcing a refetch) rather than
rehydrated. Same discipline-direction as §1.6 snapshot adapters, but cache prefers
drop-and-refetch over in-memory migration (cache is regenerable; snapshot is canonical).

**Per-surface cache-size budget + eviction policy.** Cache-size budgets per surface
(verifier console > admin > member app, reflecting Reena's constraint). LRU eviction
runs in the background on TanStack Query's cache without blocking reads.

**MMKV write batching.** Persistence-layer writes coalesce same-frame writes;
non-critical writes (cache updates) debounce; critical writes never delay. Architecture
commits the *property* (writes don't block the UI thread under cycle-open load);
specific batching mechanism in an ADR.

**Background-fetch failure UX.** When background-fetch hooks (iOS BGAppRefresh, Android
WorkManager) fail to run (battery-saver kill, OS scheduling decision), the next
app-open detects the missed fetch (last-successful-fetch timestamp vs threshold) and
surfaces the Cached → Refreshing transition with a member-class copy line ("your data
may be from <last-fetch-time>; refreshing now"). Member sees the staleness; data
refreshes; transition is transparent.

Internal cache-policy code lives in the shared platform-adapter layer (per FM-1);
specific module organization is implementation detail in an ADR.

#### 4.5a Offline mutation handling

**Write queue for offline-capable mutations.** Mutations explicitly marked
offline-capable (UPI Intent confirmation, claim-filing draft submit, status
acknowledgments) are persisted to MMKV at submit time with an idempotency key +
payload + retry metadata. Mutations not marked offline-capable (admin authorization
decisions, real-time helpdesk routing, anything requiring server-confirmed outcome
before the next user action) require network and fail with a retry prompt if offline.
Not all writes are queueable — queueability is an explicit per-mutation property.

**Opportunistic replay.** App boot does not block on queue replay. Replay begins
opportunistically once hydration completes and connectivity is available; replay
progress surfaces in the UI but does not gate user action. Strict replay ordering,
multi-queue orchestration, and cross-screen hydration choreography are deferred.

**Conflict resolution by server authority.** Queued-mutation responses carry
`conflict_resolution: already_accepted | superseded | duplicate | failed`. The first
three are success-equivalent — the member's intent was satisfied; UI shows
confirmation without "your submission failed" framing. Genuine failure is distinguished.

**Disk-full handling.** MMKV write returns success/failure synchronously;
queue-enqueue failure surfaces a member-class error ("your phone storage is full;
please free some space and try again") with a helpline-call CTA. Never silently drop
a write.

**Replay error classification.** Queue replay distinguishes:
- **Transient** (5xx, network timeout, rate-limited): retry with exponential backoff up
  to a ceiling; queue item remains.
- **Permanent** (4xx with validation error code from §3.2): mutation marked as failed;
  member sees the error with reason code; manual retry possible.
- **Conflict**: success-equivalent.

Internal mutation-queue code lives in the shared platform-adapter layer (per FM-1);
specific module organization is implementation detail in an ADR.

#### 4.6 List virtualization — platform requirement

**Decision:** Per UX §6 commitment, list virtualization is a platform requirement, not
a stack choice. Every list whose row count can exceed the visible viewport uses
virtualization.

**Surfaces requiring virtualization:**
- Yogdaan Bahi (50–500 entries per member, growing)
- Shradhanjali Sahyog Vivran contributor scroll (200–16,000+ entries per pool)
- Sahyog Drive archive (years of cycles)
- In Memoriam roll
- Admin verifier console packet list
- Admin member-search results

**List virtualization library choice criteria.** Default: FlatList with tuned
`windowSize` + `maxToRenderPerBatch` for lists below the threshold; **FlashList for
lists above the threshold** (Shradhanjali contributor scroll at 200–16k+ entries is
the canonical case). Threshold value + benchmark methodology surfaced in P0-5
native-stack validation experiment scope. Architecture commits the *criteria*;
specific row-count threshold in P0-5 output.

On web: TanStack Virtual or react-virtuoso — chosen in an ADR. Architectural commitment
is the *property* (no list renders the full set into the DOM/native view); library
choice is implementation.

#### 4.7 Routing strategy

**Decision:**
- **Native:** Expo Router (file-system routing; deep-link compatible; URL-path-prefix
  per §2.5 active scope).
- **Astro public site:** Astro's file-system routing (`pages/` directory); server-side
  rendering for SEO-critical pages; static generation where eligible.
- **Admin / helpline (Vite + React):** TanStack Router (TypeScript-first; full type
  safety on routes + params; loader pattern integrates with TanStack Query). Active
  Pariwar scope is a path-prefix route segment (`/p/:pariwarId/...`).

**Cross-surface deep links:**
- Push notification payloads carry deep-link URIs.
- URI scheme + path conventions in `packages/contracts/deep-links/` so backend and
  frontend share the URL grammar.

**Deep-link landing checks.** Push-notification deep links may arrive after session
expiry, scope change, or RBAC revocation. Landing pages check three layers before
render:
1. **Auth state** — if expired, re-auth flow preserves the deep-link target as the
   post-auth redirect.
2. **Active scope match** — if the link is for a Pariwar other than the current active
   scope, prompt scope-switch with a context line.
3. **Authorization on the target resource** — if revoked, graceful "this is no longer
   available to you" with helpline-call CTA. Never hard 404.

#### 4.8 Motion & animation

**Decision:** Minimal motion budget per UX §6. No celebratory animations on grief
surfaces; state-change feedback only (yellow → green confirmation pulse on
contribution match; pull-to-refresh native gesture).

**Library:** RN Reanimated for native (already in Expo); CSS transitions on web. No
heavy animation library at v1.

**Accessibility:** `prefers-reduced-motion` respected on web; equivalent native
accessibility settings honored.

#### 4.9 Error boundaries + recovery patterns

**Two error-handling layers:**
- **Component error boundaries** at the route level catch render-time errors
  (component crash, hook misuse).
- **Query/mutation error surfaces** handle backend errors — every screen handling
  server data declares its error-rendering pattern (full-screen empty state + retry,
  inline-error banner with retry, toast for non-critical mutations). Error-display
  patterns live in the shared platform-adapter layer (per FM-1).

**Member-facing failure copy** translated via `packages/i18n/`; technical detail goes
to the audit log + crash report, never to the member.

**Weak-signal auth recovery path.** When auth flows (re-auth on deep-link, OTP
verification, session refresh) fail due to weak signal, the UI surfaces a recovery
path:
- **Resume** when signal returns (automatic retry).
- **Retry** manually (user-initiated).
- **Helpdesk fallback** (helpline-call CTA) when retries don't recover.

Specific OTP mechanics live in Category 2.

**Crash reporting:** crashes + uncaught errors → observability stack (Category 5).
No PII in error reports — error context is sanitized via the existing tier-1
ciphertext + tier-2 hash discipline.

**Focus management on UI state transitions.** The `authoritative-state-change` event
(§4.2) coordinates focus: pre-transition focus is saved; post-transition focus moves
to a designated landing element (e.g., the new copy line announcing the change) or
restored to the equivalent of the pre-transition element. Pattern lives in the shared
platform-adapter layer.

#### 4.10 Accessibility tooling — WCAG 2.1 AA (launch blocker per Step 2)

**Decision:**
- **Native:** RN Accessibility primitives (accessibilityLabel, accessibilityRole,
  accessibilityHint, accessibilityLiveRegion) wrapped in the atom layer per UX §6.
- **Web:** Radix UI primitives provide WCAG AA-grade focus, keyboard nav, ARIA
  semantics out of the box.
- **Color contrast:** token-pair WCAG check at build time (every color token pair
  declares its contrast result); CI fails if a token pair drops below AA.
- **Audit cadence:** pre-launch accessibility audit gates Phase 2 per UX §6.

**Devanagari readability is a two-gate property.** Accessibility passes only when
*both* gates clear:
1. **Build-time gate** — token-pair WCAG AA contrast check.
2. **Field validation gate** — empirical Devanagari readability + screen-reader audit
   (TalkBack Hindi, NVDA Hindi) during P0-2 + ongoing audits.

Failing either gate is a launch-blocker. The build-time check alone is insufficient
because Devanagari has script-specific cognitive-load characteristics (matras,
conjuncts, optical sizing) that contrast ratios don't capture.

**Compound-view semantic structure.** Every compound surface (verifier console,
helpline console, member profile review) declares its landmark structure: semantic
regions, heading hierarchy without skips, skip-links to the primary decision-strip.
Element-level semantics follow accessibility standards current at implementation.
Automated a11y CI scan per compound view (specific scanner in an ADR).

**Keyboard navigation for operator surfaces.** Named keyboard shortcut set per
operator surface (verifier console, helpline console at minimum). Discoverable via a
`?` overlay; shortcut conflicts resolved at the design-system layer. Keyboard-shortcut
definitions live in the shared platform-adapter layer.

**Per-actor-class copy register** — cross-reference: register dimension committed in
§4.15 Actor adaptation; accessibility tooling consumes the register here.

#### 4.11 Performance discipline

##### 4.11.1 Bundle discipline

- **Page-weight budget enforcement mechanism.** CI runs a bundle analyzer per route on
  member-facing surfaces; KB-per-screen delta against the previous main branch is
  reported in the PR; reviewer cannot approve without acknowledging the delta.
  Regressions past the named budget fail the build. Specific tool in an ADR.
- **Per-route OpenAPI client subsetting.** The OpenAPI client-generation tool
  (Category 3 §3.1) must produce per-tag (or per-namespace) client modules so each app
  imports only the surface it consumes. CI test asserts no admin-only operations land
  in the mobile bundle; no member-only operations in the admin bundle.
- **Install footprint budget.** The native app's install footprint (initial install +
  per-Pariwar branding bundle assets + native modules from CNG workflow) is bounded by
  a committed budget with measured enforcement; CI measures the produced APK/IPA size
  on builds; regressions past the budget alarm. Specific values in Category 5 /
  operations policy; per-Pariwar bundles included in the budget.

##### 4.11.2 Asset + media discipline

- **Sahyog Vivran media budgets.** Per-Sahyog-Vivran image dimension limits + per-page
  total payload budget; images lazy-load below the fold; opt-in media require explicit
  member tap. Media served via an **edge-compatible responsive media pipeline**
  (variants per device + viewport; format negotiation). The pipeline is vendor-agnostic
  at the architecture layer; specific edge transform provider committed in an
  implementation ADR.
- Astro Image component on the public site; Expo Image on native.

##### 4.11.3 Performance instrumentation

- **Render-cost budget** as performance guardrails (not analytics): per-screen render
  count, slow-commit flag, large-list render time. Regressions past named thresholds
  alarm in dev/staging and fail CI on member-facing surfaces. Not member PII; not user
  behavior tracking; pure performance instrumentation.
- **Freshness telemetry** (§4.14) for cache/staleness signals.

#### 4.12 Browser / device support matrix

- **Native:** Android 9+ (Snapdragon 4-series, 3 GB RAM is the floor per UX §6); iOS
  16+; CNG workflow (not Expo Go) for MMKV + native modules.
- **Web (admin, helpline, public, member-responsive):** evergreen Chrome / Firefox /
  Edge / Safari; specific minimum versions in an ADR; explicitly drop IE.
- **Public Astro site additionally:** must render Sahyog List + Member Directory +
  Niyamavali pages on Snapdragon 4-series Android Chrome (UX-targeted device per §1
  Real Data Test gate).
- **Accessibility tooling:** screen-reader support tested on TalkBack (Android),
  VoiceOver (iOS), NVDA + JAWS (Windows); Hindi screen-reader empirical validation
  during P0-2 field work.

#### 4.13 Form draft persistence

Named long-form flows preserve drafts: KYC signup, claim filing, profile update,
helpdesk ticket composition, **verifier-console decision authoring** (review notes,
reason codes, signoff rationale — Anita-class admins can carry decisions across
packets within a working session without losing work to idle timeout). Drafts
persisted to MMKV/IndexedDB with auto-save on form change (debounced); restored on
resume with a member-class prompt ("you have a saved draft — resume or discard?").
Drafts have a named TTL (specific value in operations policy).

Form drafts are distinct from the offline mutation queue (§4.5a): drafts are
in-progress user state, not mutations awaiting server delivery.

#### 4.14 Stale visual markers

Offline-capable UI visibly distinguishes data freshness states. No invisible
staleness — the member always knows what they're looking at:
- **Fresh** — data fetched from server within a recency window; default visual state.
- **Cached** — data hydrated from local persistence; pre-revalidation; subtle indicator
  (e.g., dimmed timestamp or "last updated" line).
- **Refreshing** — revalidation in progress; subtle pulse or progress indicator.
- **Offline** — connectivity unavailable; clear indicator + reassurance copy ("offline
  — your latest action will sync when connection returns").

Authoritative-status reads (per §4.2 reconciliation) never display as "cached" — they
display as Fresh or block on network.

**Freshness telemetry.** Each cache hydration and revalidation emits structured trace
events with metadata only — no payload. Captured: `cache_age` (time since last server
fetch), `hydrate_time` (cold-start hydration latency), `offline_restore_count`
(records restored from offline cache), `background_fetch_last_run` (timestamp of last
successful background fetch), `online_state` (online/offline transitions). No member
PII in events. Closes the loop on the offline + cached posture by making freshness
measurable. Observability stack details in Category 5.

**Stale-state accessibility announcements.** Each stale-marker transition emits an
accessibility announcement via `aria-live="polite"` (web) or `accessibilityLiveRegion`
(RN). Per-state copy lives in i18n with the per-actor-class register —
cross-reference §4.15.

#### 4.15 Actor adaptation (authority section)

Actor class is a first-class dimension across the frontend. Other sections (§4.10
accessibility, §4.14 staleness announcements, error copy in §4.9, lifecycle UX in
§4.2) reference this section as the authority on actor-class concerns. Accessibility,
copy, durability surfaces remain horizontal in their own sections; the actor-class
*adaptation* is centralized here.

**Sub-commitments:**

- **Actor-class enumeration** (per §3.13 identity model): member, admin, partner,
  nominee; future donor (Crowdfunding Phase 2/3).
- **UI variant dimensions per actor class:**
  - **Copy register** — member is calm-precise; nominee is grief-respectful; admin is
    operational; partner is contractual.
  - **Surface composition** — Module Shelf suppression in frozen-account states for
    member-class; nominee-class console emphasizes reconciliation surfaces; admin-class
    emphasizes decision surfaces.
  - **Interaction tone** — nominee uses witness-not-bailiff cadence; member uses
    neutral-action cadence.
- **Durable nominee-facing access path.** A nominee-facing surface (e.g., long-term
  receipts portal per UX OQ-UX-8) is independent of the deceased member's account
  lifecycle; survives all Account State Machine transitions. Architecture commits
  *existence + durability* of the path; auth mechanism in Category 2.

**Cross-class leakage prevention.** CI test asserts that no member-class copy renders
inside a nominee-class surface; no admin-class shortcuts appear in member-class
navigation.

Variant code lives in the shared platform-adapter layer (per FM-1).

#### Decisions deferred to subsequent categories

- **OpenAPI client-generation tool** (Category 3 deferred) — affects TanStack Query
  hook generation pattern.
- **List virtualization library final choice** per surface — implementation ADR.
- **Crash reporting provider** — Category 5 observability.
- **Web minimum-version specifics** — implementation ADR.
- **Specific page-weight budget values** — UX-driven; operations policy.
- **Specific install footprint budget values** — Category 5 / operations policy.
- **Specific cold-start hydration latency budget** — Category 5 NFR.
- **Specific FlatList → FlashList row threshold** — P0-5 output.
- **Edge-compatible responsive media pipeline provider** — implementation ADR.
- **A11y CI scanner choice** — implementation ADR.
- **Helpline console keep-alive mechanism** — implementation ADR.

### Category 5: Infrastructure & Deployment

#### 5.1 Cloud provider — GCP Mumbai (`asia-south1`)

**Decision:** GCP `asia-south1` (Mumbai) as the primary cloud. Per the India PII
residency posture (Step 2), all PII-bearing infrastructure lives in this region.

**Rationale:** GCP Mumbai supports the full surface required (Cloud SQL Postgres with
multi-AZ + RLS, Cloud Storage with WORM-grade object retention lock, Cloud KMS HSM,
Secret Manager, observability stack); the smaller-than-AWS India footprint is
acceptable for v1's single-region posture; GCP IAM + Workload Identity Federation are
clean fits for the CI/CD pattern (§5.4).

**Single-vendor risk accepted at v1.** Committing to GCP Mumbai as the primary cloud
means GCP-corporate-level events (legal action against the provider, billing freeze,
region-wide compromise, vendor exit from India) affect TWT's infrastructure. The trust
accepts this assumption at v1; cross-vendor mitigations are Phase 2+ candidates
triggered by named criteria (§5.2 audit-durability portability, §5.7 DR posture,
§5.14 per-Pariwar isolation).

**Resolves:** Cloud provider final selection (Category 1 §1.1, Category 2 §2.7).

#### 5.2 GCP service map (canonical)

GCP service map covering the canonical service for every property the architecture
commits.

| Concern | GCP service | Property satisfied |
|---|---|---|
| Datastore | **Cloud SQL Postgres** (`asia-south1`) with regional HA | India PII residency, RLS, managed-in-region |
| Audit log cold tier | **Cloud Storage** with **Bucket Lock** + **Object Retention Lock** (Cohasset-assessed WORM-equivalent) | Structurally immutable retention; 7-year per FR-47 |
| Audit lifecycle tiering | Cloud Storage with **Nearline** → **Coldline** → **Archive** transitions | Cost-tier storage matching access frequency |
| Pool Engine snapshot cold | Cloud Storage with Object Retention Lock | Tamper-evident snapshot durability |
| Object storage (KYC, statements, certificates, attachments) | Cloud Storage | DPDPA-compliant managed storage |
| Key management (KEK + HMAC keys) | **Cloud KMS** with HSM-backed keys | KEK rotation + HMAC key isolation |
| Secrets storage | **Secret Manager** | Rotation, IAM-scoped access |
| Container registry | **Artifact Registry** in `asia-south1` | Container lifecycle + signed-image discipline |
| IAM | **GCP projects** for separation, under §2.10a Isolation Commitment | Audit independence + cross-project isolation |
| Push notifications | FCM | Per FR-58C-flagged provider decision |
| Edge / WAF | Cloudflare front-line (DPDPA compatibility per legal review — see §5.8a) | Property bar per §5.8a |

**WORM equivalence note:** Cloud Storage Retention-locked objects are structurally 
immutable until retention expiry; administrative principals cannot delete or shorten 
retention during the active retention window. Same regulatory posture as S3 Object Lock 
Compliance mode (both Cohasset-assessed). The Category 1 §1.5 commitments (write-via-restricted-IAM-role,
cross-account separation, bucket policy belt-and-braces) translate directly:
dedicated **GCP project** for the audit mirror with `roles/storage.objectCreator`
only; integrity check runs in a separate GCP project; sole-engineer prod credentials
cannot reach either.

**Object Retention Lock misconfiguration prevention.** Once Cloud Storage Object
Retention Lock is set, the policy cannot be reduced or removed; misconfiguration is
permanent. Discipline:
- Two-person review on any IaC change touching retention policy.
- CI sanity check that retention values fall within a committed band (≥ 7 years per
  FR-47, ≤ a named upper bound).
- Staging-environment dry-run before prod application.

**Pre-launch Cloud SQL extension compatibility (narrow scope).** Pre-launch
verification covers only the Postgres extensions required by the v1 launch scope
(pg-boss dependencies, native partitioning support, RLS, and the extensions named
across §1.x). Future extensions (pgvector, TimescaleDB-style, others) require an ADR
before adoption — verification at adoption time, not speculative reservation now.

**Audit durability architecture preserves future cross-cloud export capability.** The
architecture commits that audit-log durability (Cloud Storage with Bucket Lock +
Object Retention Lock today) does not foreclose future cross-cloud export. The
canonical format — canonical-JSON-hashed entries, immutable chain, tier semantics — is
portable across object-storage providers without re-derivation. When and how a
second-cloud durability surface is added is a Phase-2 decision; the property —
*cross-cloud export remains an option* — is committed now.

**Audit-log post-7-year disposition.** Post-retention audit records transition to a
cold-cold tier with stronger compression and reduced access path, or are deleted per
the retention matrix (§2.12). The property is committed; the specific mechanism is
committed when the first records approach the boundary.

#### 5.3 Deployment substrate

**Decision:** Dokploy v1 (per Step 3 commitment); migration path to **Cloud Run** or
**GKE Autopilot** (chosen at migration trigger). Both are GCP-native; Cloud Run is
the lighter option (serverless containers; suitable for stateless workspaces); GKE
Autopilot is the heavier option (managed K8s; suitable when worker pools + persistent
connections expand).

**Migration trigger** (per Step 2 + Step 3): first of (a) 2nd Pariwar provisioning,
(b) sustained ≥70% peak-cycle infra utilization on Dokploy. Specific target (Cloud
Run vs GKE Autopilot) committed at trigger time based on workspace shape.

**Dokploy failure fallback for live-cycle continuity [P1 from Step 2]:**
- **Runbook commitment:** if Dokploy fails during Days 12–15 of a live cycle, the
  fallback is direct deployment to Cloud Run (since backend services are 12-factor
  containerized per Step 3 R-4; secrets are abstracted per Step 2). The fallback is a
  documented runbook, not a continuously-warm secondary substrate.
- The 12-factor + container packaging from Step 3 is what makes Dokploy → Cloud Run
  failover a runbook execution rather than a rewrite.

**Dokploy supply-chain discipline:**
- **Version pinning** for Dokploy and its dependencies; updates require explicit
  two-person review.
- **Provenance verification** on Dokploy updates (signature / checksum against
  published release).
- **IAM isolation**: Dokploy runs in an isolated GCP project (e.g.,
  `twt-dokploy-prod`) with cross-project deploy permissions, *not* in the prod data
  project. Dokploy compromise affects the deployment surface, not the data surface.

**Bank statement parser sandbox.** Parsers (csv-parse + future PDF/OCR) ingest
potentially-untrusted inputs (compromised statement source, forged statement,
crafted-malicious PDF). The execution environment commits:
- Parser code runs in an isolated environment (separate Cloud Run service or
  equivalent, separate IAM identity, no privileged access to operational data).
- Parser failure (crash, hang, OOM) does not propagate to the matcher or the broader
  pipeline.
- Resource limits (CPU, memory, execution time) enforced per parser invocation.

**Dokploy maintenance cadence (independent of K8s migration trigger):**
- Version review at the same cadence as other supply-chain pinned dependencies.
- Security advisories monitored (named owner per §3.10).
- Upgrade discipline: two-person review + provenance verification + staging dry-run.
- Out-of-cycle patching for high-severity CVEs.

Cadence is independent of K8s migration trigger; Dokploy stays current even while it
remains the substrate.

**Resolves:** Dokploy failure fallback [P1]; Dokploy supply-chain risk.

#### 5.4 CI/CD pipeline

**Decision:** GitHub Actions + Workload Identity Federation (keyless auth to GCP) +
Artifact Registry.

**Pipeline shape:**
- **Source-code host:** GitHub primary (per Step 2 + Step 3); escrow mirror to
  trustee-controlled location per Step 2 §9.1.1.
- **Auth from CI to GCP:** Workload Identity Federation (OIDC token exchange); no
  long-lived service account keys.
- **Container builds:** per-workspace Dockerfile (Step 3 R-4) → push to Artifact
  Registry in `asia-south1`.
- **Per-Pariwar build profile** (Step 3 R-5) drives matrix builds.
- **Per-environment artifact promotion:** dev → staging → prod via signed manifest +
  manual approval gate at the staging → prod boundary.

**WIF claim restrictions.** WIF trust binding is scoped per-environment to repo +
branch + workflow file (and optionally actor identity). Per-environment bindings
differ in strictness:
- **Dev / staging:** looser (broader branch set, broader workflow set).
- **Prod:** strictest — only the production-release branch + production-deploy
  workflow file. Protected-branch claim enforced.

Compromise of a non-production workflow cannot mint a prod-deploy token.

**Container image signing + verification.** Build-time signing (Sigstore / Cosign or
GCP Binary Authorization); deploy-time signature verification — Cloud Run / GKE
accepts only signed images from a named signer identity. Tag immutability enforced
for production images via Artifact Registry's immutable-tag policy.

**WIF trust-relationship recovery.** GitHub's OIDC issuer or claim format may change;
the WIF trust relationship in GCP IAM can drift or be misconfigured. Recovery
requires GCP IAM admin access:
- WIF trust-relationship inventory committed and reviewed periodically.
- Secondary IAM-admin role granted to ≥ 3 principals (Solo Builder + backup engineer
  per A-13 + one trustee with engineering capability) so any one can repair the
  relationship.
- Periodic recovery drill (rotate the trust relationship in staging + verify
  recovery).

**Promotion-approver backup.** Staging → prod promotion approval is not a
single-principal gate. The approver role is granted to ≥ 2 principals (Solo Builder +
backup engineer at minimum). Any single principal can approve; the grant spreads
availability.

**CI gates surfaced across the architecture** include the gates committed in earlier
sections: OpenAPI breaking-change detection, generator determinism check, RLS policy
regression test, cross-Pariwar adversarial read test, contract↔domain type test,
validator-presence lint, cross-surface validation parity test, bundle analyzer +
page-weight budget, per-route OpenAPI client subsetting, install footprint
measurement, render-cost guardrails, a11y CI scan on compound views, cross-class
leakage prevention, audit-log integrity check, adapter golden-file invariant tests,
friction-budget CI gate.

**Resolves:** CI/CD pipeline + container registry.

#### 5.5 Environment topology

**Decision:**
- **Three environments:** dev, staging, prod. Each in its own GCP project
  (`twt-dev`, `twt-staging`, `twt-prod`); separate billing accounts where
  appropriate.
- **Additional dedicated GCP project for the audit-log mirror**
  (`twt-audit-mirror-prod`) with cross-project IAM separating mirror-write from
  mirror-read (§5.2).
- **Per-Pariwar tenancy** within a single prod environment for v1 (TWT-Bihar only).
  2nd Pariwar provisioning may add a sibling prod project; decision at trigger time
  per §5.14.

**No production PII in dev / staging.** Structural commitment, not discipline:
- Dev and staging environments use synthetic data only.
- Prod → lower-env data flow forbidden unless via the data export + anonymization
  pipeline (which produces the same anonymized shape as §2.12 RTBF mechanics).
- CI gate verifies dev/staging seed data does not carry plaintext prod-shape PII
  (sentinel-value detection on lower-env data).

**Resolves:** Environment configuration.

#### 5.6 Observability stack (split per concern)

**Decision:** Per Step 2 [P1] observability stack split:
- **Managed (metrics + logs + alerting):** GCP **Cloud Monitoring** (metrics +
  alerts) + **Cloud Logging** (structured logs). Cloud-native integrations with Cloud
  SQL + Cloud Storage + Cloud Run. Cost scales with log volume; per-log-class
  retention policy committed per data class.
- **Self-hosted (audit-log read):** **Grafana** + **Loki** or equivalent in a
  trustee-controlled GCP project (the audit-mirror project). Auditor + Reports
  queries run here against the Cloud Storage audit cold tier indexed for query.
  Self-hosted because audit-log integrity demands trustee-controlled execution
  environment per §1.5 + §2.10.
- **SaaS (distributed tracing):** Sentry / Honeycomb / Grafana Cloud Traces — chosen
  in ADR. Tracing volume is bounded by trace-sampling rate; cost predictable.
- **Crash reporting:** same SaaS as tracing or separate (chosen in ADR).

**Capacity-planning indicators [P1]** committed as named metrics emitted into Cloud
Monitoring + alarms wired:
- Pool spawn duration (per cycle freeze)
- Statement-intake queue depth
- FR-12A p95 latency rolling window
- pg-boss queue depth per class
- Cloud SQL connection pool utilization
- Cloud Storage write rate
- FCM dispatch throughput vs published quota
- Audit-log replication lag

When a named indicator crosses its threshold, the alert routes to the on-call surface
(§5.10).

**GCP quota planning + headroom.** Per-quota baseline + 2× headroom committed
pre-launch. Quota inventory reviewed at the same cadence as capacity-planning
indicators; upgrade requests filed proactively when approaching thresholds — not
reactively at the moment of need.

**Audit-read fallback property.** Audit-log read access has two paths to the same
canonical Object-Retention-Locked source:
- **Daily path:** the observability stack handles routine Auditor + Reports queries.
- **Break-glass:** direct audit extraction from the Cloud Storage cold tier (without
  dependency on the observability stack) during observability-stack outage.

The architecture commits the *property* (two paths to the same canonical source). A
second analytics platform is not architected at v1; the break-glass mechanism is
operational (signed query against the cold tier with appropriate IAM grants).

**Audit-mirror access constrained to approved execution environments.** Audit-mirror
read access is granted only to named execution environments (the integrity-check
job's compute environment + Auditor-role query surfaces). The *property* is
committed: access is not granted to arbitrary execution environments or
member-facing services. The specific enforcement mechanism (VPC Service Controls,
IAM conditions, named perimeter, or other) is committed in an implementation ADR.

**Quarterly capacity review.** Not autoscaling — a deliberate review point.
Quarterly review of:
- Traffic patterns (cycle-open peaks, post-cycle decay, helpdesk volumes).
- Storage growth (audit log, snapshots, statements, recordings).
- Cost trends (per-Pariwar, per-environment, per-service).
- Recovery posture (drill outcomes, RTO/RPO actuals vs targets).

Reviewed by Solo Builder + a trustee (and backup engineer once contracted per A-13).
Catches drift before it becomes an incident.

**Resolves:** Observability stack split [P1]; capacity-planning indicators [P1].

#### 5.7 Backup + Disaster Recovery

**Decision:** Multi-AZ in-region + manual DR runbook; RTO/RPO targets committed;
cross-region topology deferred.

**Specific commitments:**
- **Cloud SQL Postgres regional HA:** primary + standby in two zones within
  `asia-south1`. Automatic failover on zonal failure.
- **Automated daily backups + PITR** up to 35 days (Cloud SQL default).
- **Audit cold tier + Pool Engine snapshots** in Cloud Storage with Object Retention
  Lock (§5.2); these survive region-level events as long as Cloud Storage's
  cross-region resilience for the chosen storage class holds.
- **RTO target:** 4 hours from declared incident to operational restoration.
- **RPO target:** 1 hour of data loss tolerance at the operational tier.
- **DR runbook:** documented restoration procedure; periodic restore drill
  (quarterly per Step 2 NFR).

**Cross-region replica trigger criteria.** In addition to the existing triggers
(2nd Pariwar provisioning, sustained operational scale), cross-region replica
activates when any of:
- **Restore drill misses RTO** — the quarterly DR drill demonstrates that
  restore-from-backup cannot meet the committed RTO target.
- **Business recovery window unacceptable** — operational experience or trustee
  judgment determines the manual-DR-runbook window is too long for the trust's
  commitments.
- **Trust governance requires it** — explicit trustee panel decision.

Exposure value alone does not trigger — exposure ≠ infrastructure risk.
Infrastructure-risk evidence (drill failure, operational signal, governance
direction) does.

**DR runbook accessibility.** The DR runbook is a *separate durability surface* from
the system it covers:
- PDF / printed copies held by trustees (credential-escrow envelope per Step 2
  §9.1.1).
- Mirrored to a non-GCP location (a GCP-region outage does not render the runbook
  inaccessible).
- Read access independent of the prod environment's IAM.

Discoverable during incident; usable when the system it covers is down.

**DR posture escalation procedure.** When cross-region replica trigger conditions
fire, a documented procedure for escalating DR posture exists. The runbook lives in
`docs/runbooks/` (per §5.15); specific contents evolve as infrastructure evolves.
The architectural commitment is the *existence* of the procedure, not its current
contents.

**Resolves:** Backup target; RTO/RPO targets.

#### 5.8 Network topology

**Decision:**
- **Edge / WAF front-line** (per §5.8a capability bar) — v1 default: Cloudflare
  (Bot Management + Turnstile + WAF Rules); pivot to self-hosted WAF if legal
  review finds Cloudflare incompatible with DPDPA. Rate-limiting layer (§2.11),
  ingress signature verification (§3.11), and edge-only ingress (below) maintain
  clean substitution boundaries.
- **GCP VPC** for backend services; **Private Service Connect** for Cloud SQL
  access from compute (no public IP on Cloud SQL).
- **Egress controls:** named outbound destinations (DigiLocker, FCM, APNs, WhatsApp
  Business, Telegram, telephony provider, partner endpoints, bank statement upload
  endpoints) allowlisted via VPC Service Controls or equivalent firewall rules.
- **Internal service-to-service traffic** stays within the VPC; inter-environment
  traffic crosses VPC peering boundaries with explicit rules.

**Edge-only ingress (default) + break-glass bypass.** Backend services default to
edge-only ingress — traffic arrives via the selected edge / WAF (Cloudflare or
self-hosted, per §5.8a), not directly to Cloud Run / GKE. The mechanism
(Cloudflare Tunnel, signed-token verification, mTLS, or other) is committed in
an ADR contingent on edge selection; the *property* is that backend services
are not directly reachable from the public internet under normal operation.
**Break-glass access must be time-bounded and audit-logged** — activation
requires explicit operator action with a stated expiry; every direct-ingress
request emits an audit line (Cross-Cutting #2); auto-revert at expiry unless
explicitly renewed with re-justification.

**Break-glass path:** during Cloudflare outage or other emergencies, direct ingress
is permitted but is **temporary, audited, and rate-limited**. The path is documented;
activation requires explicit operator action (not a default behavior); every
direct-ingress request is logged with elevated detail; rate limits prevent the
bypass from becoming the new normal.

**Private Service Connect verification gate.** Post-deploy network-scanning probe
verifies:
- Cloud SQL has no public IP.
- No `0.0.0.0/0` authorized network entries.
- VPC firewall rules match expected configuration.

Gate fails the deploy on any violation. Pattern repeats for any
"private-by-architecture" service.

**Resolves:** Network topology.

#### 5.8a Edge / WAF capability bar + pivot disposition

Edge / WAF selection is contingent on legal review of Cloudflare-DPDPA
compatibility. Architecture commits the property bar; the specific provider is
committed in an ADR after legal review.

**Selected implementation must demonstrate** (outcome-oriented; vendor-neutral):
- **Rate limiting** — per-IP and per-session, configurable per endpoint, with
  named thresholds (§2.11 commits the layered structure; specific values in
  Category 5 Observability).
- **Bot management + CAPTCHA-style challenge** — automated traffic classification
  with configurable response (allow / challenge / block); challenge on named
  endpoints per FR-88 (signup, claim filing, helpdesk forms).
- **Ingress signature verification** — verifies inbound traffic origin before
  passing to backend (§3.11 webhook persist + ack assumes verified ingress).
- **Edge-only ingress capability** — backend services not directly reachable
  from the public internet; mechanism varies per provider (§5.8 commits the
  property, not the mechanism).
- **DPDPA-compatible posture** — edge processing and storage of member data must
  remain compatible with the selected DPDPA posture and legal interpretation at
  launch.
- **Observable edge metrics** — request rate, error rate, challenge rate, bot
  classification rate queryable from the architecture's observability stack
  (Category 5).

**Pivot disposition** — if legal review finds Cloudflare incompatible with
DPDPA, the replacement implementation is selected by ADR and must satisfy the
capability bar above. Target deployment region is GCP `asia-south1`.

**Substitution points** — architecture references requiring clean substitution
boundaries (no irreversible coupling):
- §2.1 (External scraper threat actor) — bot management + challenge equivalents.
- §2.11 (Rate limiting Layer 1) — IP-level rate limits.
- §3.11 (Webhook ingress) — ingress signature verification.
- §5.8 (Network topology) — edge-only ingress + break-glass bypass.

**Capability bars are acceptance criteria for future ADRs and are intentionally
vendor-neutral.**

#### 5.9 Secret management + rotation

**Decision:** GCP **Secret Manager** for all credentials, API keys, signing secrets,
KEK references, and webhook signing secrets.

**Rotation policy:**
- **KEK rotation cadence** (per §2.7): annual + on suspected compromise (specific
  cadence in operations policy).
- **Service-account credentials:** Workload Identity Federation means no long-lived
  service-account keys (§5.4); short-lived tokens rotate automatically.
- **Partner JWT signing keys:** rotated per partner contract terms; rotation
  coordinated with partner-side public-key updates.
- **Webhook signing secrets:** rotated on a committed cadence; rotation coordinated
  with provider via dual-secret window.
- **Database credentials:** managed via Secret Manager + IAM authentication where
  Cloud SQL supports it.

**Audit-mirror credential separation** (§2.10) implemented via separate GCP project
with separate IAM service-account chains; sole-engineer prod credentials cannot
reach either the mirror-write or mirror-read role.

**KEK rotation + DEK re-encryption recovery.** Annual KEK rotation requires
re-encrypting all DEKs against the new KEK. The re-encryption job is structured as
a saga with per-row checkpoint (analogous to §1.4 saga pattern); resumable across
worker crashes; old KEK retained until 100% re-encryption is verified. "DEK
migration status" is committed as a named observability metric (per §5.6).

**High-sensitivity secret separation.** A named tier of highest-sensitivity secrets
lives in a separate GCP project (or projects) from prod:
- Audit-mirror credentials (already separated per §5.2).
- KEK roots.
- Partner JWT signing keys.
- Telephony recording-storage credentials.

The prod project has cross-project IAM grants to use these but does not store them.
Compromising the prod project does not compromise the high-sensitivity tier.

**KEK-roots destruction discipline:**
- Maximum delayed-destruction window: 30 days (Cloud KMS maximum).
- Two-person approval required for any "schedule destruction" action on a KEK-roots
  key (Terraform-mediated change with co-sign; workflow denies single-person
  scheduling).
- Alarm on any KMS operation on KEK-roots keys — immediate paging signal.

**Telephony recording storage in the high-sensitivity tier.** Voice recordings from
the helpline operator console (§3.5) live in the high-sensitivity Cloud Storage tier
alongside KEK roots + audit-mirror credentials. Access restricted to Auditor role +
named quality-review role with audit logging on every access; access constrained to
approved execution environments (per §5.6 audit perimeter property).

**High-sensitivity Secret Manager two-person approval.** Secret updates to the
high-sensitivity tier require two-person approval (Terraform-mediated change with
co-sign, or workflow-mediated update with second-approver). Both approvers captured
in the audit log.

**Resolves:** Secret rotation policy.

#### 5.10 Operations: capacity planning + on-call + Dokploy fallback

**Capacity-planning indicators:** named in §5.6 above. Crossing a threshold triggers
the on-call surface.

**Infrastructure on-call rotation [P1 from Step 2]:**
- **Solo Builder is the named infrastructure on-call** at v1 per the solo-build
  cadence acknowledgment (Step 2 §9.1).
- **Backup engineer (A-13 pre-launch trustee approval needed)** provides surge +
  continuity coverage per Step 2 §9.1.1.
- **Alert routing:** Cloud Monitoring alarms route to a paging surface (named in
  operations policy); paging integration may use the same SaaS as the tracing /
  crash-reporting provider.

**Backup alert path.** Critical alarms have ≥ 2 delivery paths (paging SaaS +
voice-call rota; or dual-provider configuration). The architectural property:
P0-class alerts have at least two delivery paths; the mechanism is operational.
Paging SaaS outage cannot silently fail all alerts.

**Backup engineer (A-13) access posture:**
- **Read-only by default** for daily-ops use; the backup engineer can investigate
  without write access.
- **Write/admin requires per-action approval** — trustee approval, or co-sign with
  Solo Builder when both are reachable; break-glass path with audit + paging for
  unreachable-Solo-Builder scenarios.
- **Credential rotation cadence** committed in operations policy.
- **Activity audit-logged + periodically reviewed** by a trustee (or contracted
  security advisor).

**Dokploy failure fallback** committed in §5.3 — runbook execution, not standby
substrate.

**Cold-start mitigation for Class A workers:**
- Class A pg-boss workers run on persistent worker pools (not serverless cold-start
  path) at v1.
- When Cloud Run or GKE Autopilot enters scope, Class A workloads pin to
  minimum-instance configurations that eliminate cold-start latency.

**Resolves:** Infrastructure on-call rotation [P1]; cold-start mitigation.

#### 5.11 pg-boss queue partitioning + worker pool sizing

**Decision:**
- **Queue partitioning by class:** Class A, B, C (per §1.4) implemented as separate
  pg-boss queues with independent worker pools. Class A worker pool sized to handle
  cycle-open burst; Class C worker pool sized to handle audit-integrity + analytics
  load without starving Class A.
- **Specific worker counts** per class committed in operations policy + tuned via
  capacity-planning indicators.
- **pg-boss queue tables** on a separate Postgres schema from operational data; for
  larger Pariwars or 2nd Pariwar provisioning, dedicated queue Postgres instance
  becomes the next-step option.

**Resolves:** pg-boss queue partitioning + per-class worker count.

**Pool spawn capacity envelope (FR-20 NFR substantiation).**

PRD FR-20 commits pool spawn for N=50 claims and M=4L members < 60s p95.
Architecture commits the capacity-bound mechanism that targets this envelope:

- **Decomposition.** Pool spawn at cycle-freeze is a saga (§1.4): the parent
  job spawns N child jobs, one per pool. Child jobs are independent — no
  inter-pool serialization. pg-boss Class A queue dispatches children
  concurrently.

- **Per-child saga shape.** Each child job:
  - Reads the members-at-freeze snapshot (immutable snapshot evaluation per
    §1.6).
  - Computes the deterministic assignment (per FR-14 hash + member set).
  - Persists assignment rows through a **bulk-write primitive capable of
    sustaining the required pool-spawn throughput envelope**; the per-cycle
    assignment table is partitioned per §1.1.
  - Inserts the pool row + emits the `pool.spawned` event.
  - Emits an audit line per Cross-Cutting #2.

- **Concurrency property.** Child jobs perform immutable snapshot evaluation
  with bounded write contention: snapshot reads do not conflict, and writes
  land in per-cycle partition slices with no inter-pool serialization. No
  shared mutable state across child jobs during spawn.

- **Capacity decomposition.** Decomposition is performed from PRD envelope
  assumptions (N, M, per-cycle structure); specific decomposition values
  (worker count K, batch size, partition strategy) are operational tuning
  parameters, committed in operations policy + tuned via capacity-planning
  indicators §5.6.

- **Launch readiness gate.** Launch readiness requires measured evidence
  that the committed envelope satisfies the PRD pool-spawn SLO under
  representative simulated load. Capacity assumptions remain provisional
  until validated.

**Capacity bars are acceptance criteria for capacity-planning ADRs and are
intentionally vendor-neutral.**

#### 5.12 NFR budgets — consolidated commitments

Specific values for budgets deferred across categories are committed here.

| Budget | Source | Committed value |
|---|---|---|
| Cold-start hydration latency (§4.2) | Frontend NFR | 95% of cold-start hydrations complete within ≤ 2 seconds on Snapdragon 4-series Android |
| Install footprint (§4.11.1) | Frontend NFR | Initial app install ≤ 50 MB base + ≤ 5 MB per active Pariwar branding bundle (totals reviewed quarterly) |
| Time-to-fan-out at cycle-open (§3.4) | Dispatcher NFR | ≥ 95% of cycle-open pushes delivered within 5 minutes of cycle freeze; graceful degradation extends window under quota strain |
| Per-statement OCR latency (§3.6) | Reconciliation NFR | Typical statement (≤ 20 pages) OCR completes within 10 minutes; outliers surface as P1 |
| Undetectable audit-loss window (§1.5) | Audit-integrity NFR | Bound ≤ 5 minutes via continuous logical replication to Cloud Storage; alarm if lag > 3 minutes |
| Connection pool — API workspace (§1.1) | Pool sizing | 50 connections at Phase 1; scales with capacity-planning indicators |
| Connection pool — jobs workspace (§1.1) | Pool sizing | 20 connections at Phase 1; separate pool from API per FM-A |
| Rate limit — OTP per phone (§2.11) | OTP discipline | 5 attempts per 15-min window per phone; global send-rate cap per Pariwar |
| Rate limit — public search (§2.11) | Anti-scrape | 60 req/min per IP; CAPTCHA challenge above |
| Replication lag alarm (§1.5) | Observability | Alarms at > 3 min replication lag (within the 5-min bound) |
| Cache TTL — FR-12A (§1.10) | Read budget | 60s TTL with stale-while-revalidate per UX commitment |
| Pool spawn (§5.11, FR-20) | Pool Engine SLO | Per PRD envelope; evidence via load validation pre-launch (platform-owned) |

**Audit-loss-window mechanism.** §5.12 commits a ≤ 5-minute undetectable audit-loss
window. The mechanism is committed in an ADR after Phase-0 dry-run; candidates
include Datastream → Pub/Sub → Cloud Function → Cloud Storage append, Cloud SQL
logical replication slot → custom consumer → Cloud Storage, or other. The
architectural property — ≤ 5-min lag, hash-chain preservation across the boundary,
replication-lag detector alarm at 3 min (per §1.5) — is committed here; the
mechanism is named in an ADR.

Values are reviewed at the same cadence as the threat-actor inventory (§2.1) +
capacity-planning indicators. Specific numbers tuned by measurement post-launch;
review is committed.

**Resolves:** all consolidated NFR budgets carried from earlier categories.

#### 5.13 Cost controls

**Decision:**
- **Per-Pariwar cost labeling** on every GCP resource via labels
  (`pariwar=bihar`, `env=prod`, `workspace=api`); enables per-Pariwar cost reporting +
  budget alarms.
- **Per-environment budget alarms** in Billing API; alarms route to the on-call
  surface when projected monthly spend exceeds named threshold.
- **Observability cost monitoring** — log volume + trace volume metered; if a
  deploy introduces a logging spike, an alarm fires before the billing surprise.
- **FCM + WhatsApp Business cost** is largely free-tier at v1 scale but is
  monitored; Phase-2 scale brings these into budget review.
- **Cold-tier storage class transitions** (§5.2) reduce cost for old audit data
  without manual intervention.

#### 5.14 Per-Pariwar infrastructure isolation strategy

**Decision (v1):** Single prod environment for TWT-Bihar; per-Pariwar isolation
implemented at the application layer (RLS + `pariwar_id` discipline) rather than at
the infrastructure layer.

**2nd Pariwar provisioning option set** (decided at trigger time):
- **Same prod environment, application-layer isolation only.**
- **Sibling GCP project per Pariwar** — separate IAM, separate billing, separate
  VPC.
- **Sibling cloud region per Pariwar** — geographic isolation; supports per-Pariwar
  India regional preference + DR posture per Pariwar.

The architecture commits the *property* (per-Pariwar isolation can be tightened from
shared-prod to sibling-project to sibling-region without code rewrites — the
`pariwar_id` discipline + branding bundles + per-Pariwar build profile already
support this).

**Per-Pariwar infrastructure isolation trigger criteria expanded.** In addition to
existing triggers (2nd Pariwar provisioning, sustained scale, named trustee
decision), per-Pariwar infrastructure isolation activates when:
- **Regulatory requirement for infrastructure-level separation** — e.g.,
  banking-sector regulations for a future Bank Parivar, sector-specific compliance
  for Public Servants Parivar, or other jurisdictional rules that prohibit
  cross-tenant data colocation at the infrastructure layer.

Application-layer isolation (RLS + `pariwar_id`) is the default; infrastructure-
layer isolation is invoked when regulators or contractual commitments demand it.

**Cross-Pariwar audit governance.** Each Pariwar has its own Auditor scope
(per-Pariwar RBAC); a cross-Pariwar audit role requires explicit grants per
Pariwar's trustee approval. No automatic cross-Pariwar audit visibility.

**Per-module infrastructure isolation.** Modules introducing materially different
regulatory obligations (payment-gateway flows, donor-side compliance regimes,
sector-specific licensing) may require independent infrastructure boundaries. The
decision activates when the module's regulatory surface differs qualitatively from
the support-flow's posture; activation pattern follows the §5.14 per-Pariwar
isolation pattern.

**Resolves:** per-Pariwar infrastructure isolation strategy commitment level.

#### 5.15 Operational runbook inventory

Operational runbooks complement Architecture Decision Records (Step 3 R-6); ADRs
cover decisions, runbooks cover operations. Named runbooks at v1:
- DR runbook (§5.7).
- Cycle-freeze operational procedure.
- Reconciliation triage procedure.
- Helpline operator escalation procedure.
- Partner-coordination escalation procedure.
- Audit-mirror integrity check failure response.
- Provider deprecation response procedure (per §3.10).
- Cross-region DR posture escalation (per §5.7).
- Backup-engineer activation handoff procedure.

Inventory lives in `docs/runbooks/`; reviewed at the same cadence as the
threat-actor inventory (§2.1) and the data-class retention matrix (§2.12).

#### Decisions deferred to operations policy or implementation ADRs

- **Push provider final choice** (FCM-only vs FCM + native APNs) — implementation
  ADR.
- **WhatsApp Business provider** (Meta direct vs BSP) — operations ADR.
- **Telephony provider final selection** — operations ADR.
- **A11y CI scanner specific tool** — implementation ADR.
- **Edge-compatible responsive media pipeline provider** — implementation ADR.
- **Helpline console keep-alive mechanism** — implementation ADR.
- **OpenAPI client-generation tool** — implementation ADR.
- **SaaS tracing/crash provider** — operations ADR.
- **List virtualization library final choice per surface** — implementation ADRs.
- **Specific worker counts per pg-boss class** — operations policy, tuned by
  capacity indicators.
- **Specific cost thresholds + alarm levels** — operations policy.
- **Per-Pariwar isolation choice at 2nd-Pariwar trigger** — trustee + architect
  joint decision at trigger.
- **Audit-loss-window mechanism** (Datastream / logical replication slot / other) —
  implementation ADR after Phase-0 dry-run.
- **Cross-region replica activation playbook** — `docs/runbooks/` (per §5.15).

## Implementation Patterns & Consistency Rules

The TWT architecture commits a substantial pattern surface across Step 4. This step
formalizes the pattern language AI agents and contractor engineers must follow to write
consistent code, and fills the remaining gaps.

### Essential patterns — Day-1 onboarding

A backup engineer or contractor reading this for the first time internalizes these ten
patterns before all others. Detail follows the table.

| Pattern | One-line summary |
|---|---|
| DB ↔ TS naming | snake_case in DB; camelCase in TS; Drizzle maps explicitly |
| API JSON naming | camelCase everywhere on the wire |
| Branded IDs | `MemberId`, `PariwarId`, etc. are branded types; mandatory on first PR for new IDs |
| Generated types | `packages/contracts/` is the source; no hand-written `dto.ts` / `*.types.ts` shadowing it |
| Error emission | All errors flow through a single helper; raw `logger.error` forbidden; PII stripped at the boundary |
| Context propagation | AsyncLocalStorage for `{requestId, pariwarId, actorId, traceId}`; job payloads carry the envelope |
| Service boundaries | Transactions managed at the service layer; expected failures via typed returns; throws for unexpected errors only |
| Zustand discipline | Small purpose-scoped stores; immutable updates only; large lists belong in TanStack Query |
| TS strictness | No `as any`; no `as unknown as T` outside test fixtures; clock injection for time-based code |
| ESLint hard-stops | Raw SQL camelCase; relative cross-package imports; `Date.now()` in business logic; raw logger calls |

**Table evolution rule.** The table is **stable size, rotating membership.** Maximum
~10 entries; replacement is allowed; reviewed quarterly. A new pattern enters only if it
is (a) day-1 critical, (b) cross-cutting across multiple workspaces, and (c) frequently
violated. Entering a new pattern displaces an existing entry.

### Document organization rules

- **Section split: Architecture vs Operational commitments.** This step carries both:
  *Architecture* commitments (enduring; irreversible without rework) and *Operational
  commitments* (cadence, governance, review). Same document, separate headings.
- **Pattern cross-references.** New patterns carry a "Related:" annotation linking
  dependencies. Forward-only — existing patterns are not retrofitted.
- **Cross-step references.** Patterns that exist in earlier steps reference the upstream
  source rather than re-stating; reduces drift risk.
- **Reference scheme at final assembly.** Cross-references use section anchors
  (§5 / §1.5 / etc.), not elicitation patch tags (CRG-X / MA-X / etc.); patch tags
  preserved in changelog for traceability only.
- **Pattern lifecycle tags.** New patterns carry a tag: **[Day-1]** (must internalize
  immediately) / **[Growth]** (as codebase grows) / **[Scale]** (at production scale) /
  **[Operations]** (gates on ops cadence). Forward-only.

### Golden example feature

**Claim creation** (`apps/api/modules/claim/`) is the canonical golden example. Every
onboarding artifact references this feature.

Rationale: claim creation exercises the full 5-file shape (types, repo, service,
handlers, events); touches the three uncompromisable subsystems (Pool Engine via
spawned-pool, Reconciliation via subsequent UTR matching, RBAC via authorization); uses
branded IDs (`ClaimId`, `MemberId`, `PariwarId`); runs through the canonical event chain
(`claim.filed` → `claim.verified` → `claim.approved` → `claim.settled`); and includes
both happy path and FR-43A appeal-flow edges.

Selection committed at first-implementation time; updates require an onboarding-tour
review.

---

## Architecture — enduring patterns

### Naming patterns

**Database layer (Cloud SQL Postgres):**
- **Tables:** `snake_case` plural (`members`, `pool_spawn_events`, `audit_log_entries`).
- **Columns:** `snake_case` (`member_id`, `created_at`, `pariwar_id`).
- **Foreign keys:** `<referenced_singular>_id`.
- **Indexes:** `idx_<table>_<columns>`.
- **JSONB fields:** `snake_case` inside the JSON payload.

**Drizzle TypeScript layer:** Drizzle schema explicitly maps each DB column to a
camelCase TS property; single source of truth in `packages/domain/schema/`. Migration
files preserve `snake_case` SQL; the TS mapping lives only in schema definitions.

**Raw SQL string convention.** `db.execute(sql`...`)` blocks (session variables, complex
queries Drizzle's builder doesn't cover, RLS policy invocation) use **snake_case**
identifiers — matching the DB layer. CI lint catches camelCase identifiers in raw SQL
strings.

**API + transport (JSON over HTTP):**
- **Field naming:** `camelCase` everywhere.
- **Endpoint paths:** plural resource names; route parameters as `:paramName`
  (camelCase); query parameters camelCase.
- **Custom headers:** `X-TWT-<Concern>` for trust-controlled headers.

**Code (TypeScript):**
- **Variables + functions:** `camelCase`.
- **Types + interfaces + classes:** `PascalCase`.
- **Constants (module-level):** `SCREAMING_SNAKE_CASE` only for true compile-time
  constants.
- **Boolean predicates:** `is*` / `has*` / `should*` / `can*` prefix.
- **Async functions:** verb-first; no `Async` suffix.

**Files + directories:**
- **TS files:** `kebab-case` (`member-validity.service.ts`).
- **React + Astro component files:** `PascalCase` matching the exported component
  (`MemberDirectoryRow.tsx`, `SahyogList.astro`).
- **Test files:** mirror source name (`member-validity.service.test.ts`).
- **Directories:** `kebab-case`.

**Branded types for cross-cutting domain IDs.** Identifiers that flow across
architectural boundaries (`MemberId`, `PariwarId`, `ClaimId`, `PoolId`, `AlertId`,
`ContributionId`, and others as they emerge) are committed as branded types in a shared
contracts layer. The brand applies only to identifiers crossing boundaries — not to
every string field. Implementation pattern in an ADR.

**Branding mandatory on first PR for new IDs.** When a new ID type emerges, branding is
mandatory on the PR that introduces it. ESLint catches new `*Id` string types that
aren't branded. PR template includes the checklist item.

**Default to `z.output<typeof schema>` for post-parse types.** `z.input<typeof schema>`
for pre-parse (request body shape). `z.infer<>` is the alias; `input` and `output` are
the architecture-canonical names.

**`as` cast restrictions.** `as const` allowed (semantic narrowing); `as T` allowed only
in narrowing utilities, type guards, and explicit boundary code (FFI, untyped libs);
`as any` forbidden; `as unknown as T` forbidden except in test-fixture builders. ESLint
rule enforces.

**Generated types are the single source of truth — no duplication.** `packages/contracts/`
is the source for transport-layer types; domain layer derives via `z.output<>` /
`z.input<>`. Hand-written `dto.ts` / `member.types.ts` / `schema.ts` files that
redeclare what `packages/contracts/` already defines are forbidden. CI test asserts no
schema redefinition across the contracts ↔ domain boundary (extends §1.3).

**Reviewer prompt for type duplication.** Per-PR reviewer template asks: "does any new
type in this PR introduce independent business meaning, or does it shadow an existing
contract type?" *Shadowing* is the anti-pattern; legitimate reshaping (`Pick<>`,
`Omit<>`, transforms) is fine.

### Structure patterns

**Project organization** (committed in Step 3):
- `apps/<workspace>/` — runnable surfaces.
- `apps/<workspace>/modules/<feature>/` — feature modules.
- `packages/<library>/` — cross-workspace shared libraries.
- `docs/adr/` — Architecture Decision Records.
- `docs/runbooks/` — Operational runbooks (per Step 4 §5.15).
- `docs/onboarding-tour.md` — Named day-1 reading list.

**File organization within a module** (the 5-file target shape):
- `<module>.types.ts` — Zod schemas + TS types (when not in `packages/contracts/`).
- `<module>.repo.ts` — database access; RLS-scoped.
- `<module>.service.ts` — business logic; consumes repos + emits events.
- `<module>.handlers.ts` — Fastify route handlers.
- `<module>.events.ts` — event emit/subscribe wiring.
- `<module>.service.test.ts` — unit tests co-located.

**Module-structure threshold.** The 5-file shape is mandatory when **any** of: source-
file count exceeds a named threshold; module emits events; module participates in a saga
or transaction spanning ≥ 2 entities; module is in the named uncompromisable-subsystem
set (Pool Engine, Reconciliation, RBAC + multi-tenant isolation, Niyamavali rule
registry, UPI Intent dispatch, Audit-log integrity). Below the threshold, the relaxed
shape is acceptable.

**Internal decomposition beyond the complexity threshold.** When a module exceeds the
threshold *internally*, internal decomposition is mandatory. Options: sub-features as
folders, bounded contexts, pipelines. The parent module becomes a thin coordinator —
it does not absorb sub-feature logic. Recursion of the 5-file shape is one option, not
the only option.

**Feature-first organization, not global-by-type.** Surface-level layout is by-feature
(`apps/admin/modules/<feature>/`). Local organization (`components/`, `hooks/`,
`utils/` inside a single feature) is acceptable as the feature grows. The anti-pattern
is *global* by-type structure at the workspace root.

**Three-tier code location:**
- **Cross-workspace shared:** `packages/<library>/` — consumed by multiple workspaces.
- **Workspace-shared:** `apps/<workspace>/lib/` or `apps/<workspace>/shared/` — shared
  by multiple feature modules within the workspace.
- **Feature-scoped:** `apps/<workspace>/modules/<feature>/`.

Tier determined by *consumer set*.

**`lib/` promotion triggered by second consumer.** Workspace-shared `lib/` must remain
local until a second workspace imports it. When a second workspace imports from
`apps/<workspace>/lib/<module>`, that import surfaces a promotion decision — promote to
`packages/` or stop the cross-workspace import.

**Cross-workspace imports use the package name.** `from "@twt/contracts"`, not
`from "../../../packages/contracts"`; not path aliases. pnpm workspace symlinks are the
canonical resolution. CI lint forbids relative cross-package paths.

**Long-form components default to draft-persisted.** Named long-form flows (KYC signup,
claim filing, profile update, helpdesk ticket, verifier-console decision authoring)
default to draft-persisted. Opt-out is explicit and reviewer-acknowledged. Default-on
inverts the failure mode.

**Integration test isolation + reproducibility.** Integration tests must remain isolated
(one test's effects do not leak) and reproducible (running twice produces the same
result). Transaction-rollback per test is the default for DB-touching tests;
alternatives (fresh schema per file, dedicated test database per worker) acceptable
where the default doesn't fit.

**Astro component test carve-out.** `.astro` files do not have co-located unit tests.
Component logic moves to `.ts` modules (which have co-located tests); rendering tested
via integration / e2e (Playwright).

### Format patterns

**API response envelope:**
- **Success:** the resource directly (no wrapper) for single-object responses;
  `{items: [...], nextCursor: …, hasMore: …}` for paginated lists.
- **Error:** `{error: {code, message, details?, requestId}}` per §3.2.
- **Status codes:** standard HTTP semantics; namespaced error codes carry business
  meaning.

**Date + time:**
- **Wire format:** ISO 8601 strings with timezone. Never Unix timestamps in API.
- **Storage:** Postgres `timestamptz`; database-authoritative time per §1.11.
- **In-memory:** single temporal library (specific in ADR; candidates dayjs, date-fns,
  native `Temporal`). CI lint forbids direct date-string arithmetic.

**Booleans:** `true` / `false` literals on wire + DB. Never `0`/`1`.

**Null handling:** explicit `null` for semantically-absent values; property omitted when
the value is "not applicable here." TS: prefer `T | undefined` (omit-when-absent) over
`T | null` unless the distinction matters.

**Schema evolution deploy ordering.** Additive fields ship as **optional first**;
required only after the client base has migrated. Required-from-day-1 reserved for
atomic-deploy cases (rare in mobile-first cadence). OpenAPI breaking-change CI catches
violations.

**`.strict()` as default schema behavior.** All `packages/contracts/` schemas default
to `.strict()`. `.passthrough()` only at explicit provider-controlled boundaries
(webhook payloads beyond the spec). CI lint enforces.

### Communication patterns

**Event naming** (cross-reference: `packages/events/` per Step 4 §3.4):
- **Cross-service events** (audit log entries, channel-dispatcher events, saga child-
  spawned): **dotted resource.action** (`pool.spawned`, `claim.approved`,
  `contribution.matched`, `member.suspended`).
- **In-process events** (Zustand store actions, TanStack Query invalidations,
  component-tree events): **PascalCase** type identifiers (`PoolSpawned`,
  `ClaimApproved`).

The two surfaces bridge at the emit-to-event-store boundary.

**Event payload structure:**
- Flat object with required `version: 'v1' | 'v2' | ...` field at top.
- All fields camelCase.
- Canonical-JSON serialization per Step 4 §3.4.
- Immutability per Step 4 §3.4.

**Zustand discipline (consolidated):**
- Stores are small, purpose-scoped; one store per concern; CI lint forbids cross-store
  internal imports.
- Updates via `set(prev => ({...prev, x: y}))` (or `produce`-style); direct
  `state.x = y` mutation forbidden by ESLint rule.
- Verb-first action names (`setActiveScope`, `dismissNotification`); selectors named as
  nouns / boolean predicates.
- Large mutable lists (~1000+ items) do not belong in Zustand — server-state lists in
  TanStack Query; virtualized UI derives from server state.

*Related: TanStack Query server-state (§4.2); list virtualization (§4.6).*

**Logging format + levels:**
- **Structured JSON** logs: `{level, time, msg, requestId, pariwarId, ...context}`.
- **Levels:** `trace | debug | info | warn | error | fatal`. `info` is default
  production level.
- **PII discipline:** never log Tier 1 PII fields (per §2.7). Log internal IDs; resolve
  display names at render time.

### Process patterns

**Exception hierarchy.** A `DomainError` base class is committed for known business
failures the handler maps to 4xx with a specific `error.code`. Uncaught errors (or
subclasses outside `DomainError`) map to a generic 500. Service-layer code throws
`DomainError` subclasses when typed-return is impractical (rare; deep in repo
internals).

**Service-layer error handling: typed returns for expected failures.** The service
layer signals expected failure modes via typed return values (discriminated union with
`error` variant, or equivalent — specific shape in an ADR). Throws reserved for
unexpected runtime errors. The §3.2 structured error format applies at the handler
boundary; the expected-failure-as-data discipline at the service boundary. Handlers
translate.

**Transaction outcome discipline.** When a service function returns an expected-failure
result inside a transactional boundary, the transaction outcome must be **explicit** —
the function declares whether the failure rolls back or commits. Mechanism (throw to
signal rollback, manual rollback, or other) in an ADR.

**Transactional boundary discipline.** Drizzle transactions managed at the **service
layer**. Repo methods accept an optional `tx` parameter; handlers do not open or commit
transactions directly. Multi-repo operations within a service compose under one
transaction; cross-service operations are not transactionally coupled.

**AsyncLocalStorage-based context propagation.** Logging context (`requestId`,
`pariwarId`, `actorId`, `traceId`) propagates via Node's AsyncLocalStorage. Fastify
request entry hydrates ALS; every log line in nested async calls picks up the context
automatically.

**Context propagation across job-queue boundaries.** ALS does not cross pg-boss
boundaries. Job payloads carry a standard metadata envelope (`{requestId, pariwarId,
actorId, traceId}`); pg-boss worker handlers hydrate ALS from the envelope at job
entry.

**Error emission via a single helper (consolidated).** All errors sent to logging /
crash reporting / observability flow through a single helper (`emitError(err, context)`)
in the shared platform-adapter layer. The helper applies PII-stripping (fields named
`email`, `mobile`, `aadhaar`, `dob`, `address`, `name` + per-Pariwar custom-field PII
inventory are redacted) + structured envelope from ALS context + routes to the
observability stack. Raw `logger.error(err)` / `console.error(err)` /
`Sentry.captureException(err)` calls forbidden in business-logic packages by ESLint
rule.

*Related: AsyncLocalStorage context; query observability (§1.12).*

**Clock injection for time-based code.** Production code consuming current time accepts
an optional `clock: Clock` parameter (defaulting to a singleton wall clock). Tests
inject a fake clock for deterministic assertions. Direct `Date.now()` / `new Date()`
calls forbidden in `packages/domain/`, `apps/api/`, `apps/jobs/` business logic
(ESLint rule). UI surfaces + audit-log entries use database-authoritative time per §1.11.

**N+1 prevention (consolidated):**
- Repository methods join everything the caller needs in one query; loops-with-sub-
  queries inside a service-layer call are anti-pattern.
- **Lint pattern:** `Promise.all(items.map(repo.findById(...)))` and similar fetch-in-
  loop patterns flagged for reviewer attention.
- **CI integration test:** named "no-N+1" test asserts query counts on representative
  read patterns. Regressions fail the build.
- DataLoader pattern committed only where loops are structurally inherent (rare).

*Related: Verifier console compound read budget (Step 4 §1.18).*

**Default `staleTime` per surface class.** TanStack Query default `staleTime` differs
by surface:
- **Member-facing surfaces** — matched to UX freshness expectations.
- **Admin / verifier-console reads** — closer to "always fresh" for ₹50L decisions.
- **Reference data** — matched to FR-12A cache TTL.
- **Authoritative-status reads** — non-cached per §4.2.

Surface-class taxonomy is architectural; specific second values are measured budgets in
operations policy.

**Worker process lifecycle:**
- **Health check endpoint** per worker workspace.
- **Graceful shutdown on SIGTERM** — stop accepting new jobs; drain in-flight jobs
  with a named timeout; force-shutdown after.
- **Crash discipline** — uncaught errors flow through the single error helper; process
  exit code ≠ 0 triggers container restart per the orchestrator.

**Authentication flow** — committed in Category 2; this section references it. Member
flow: phone + OTP (§2.2); admin flow: email + password + WebAuthn (§2.3). Active scope:
URL-path prefix `/p/<pariwarId>/...` (§2.5).

**Validation timing:**
- **Transport boundary:** Zod schema from `packages/contracts/` at request entry +
  form submit (cross-surface validation parity test per §4.4).
- **Domain boundary:** repository methods accept already-validated input.
- **Database boundary:** RLS + constraints + foreign keys are last-resort defense.

### Cross-cutting

**Contract ownership.** `packages/contracts/` owns all transport-layer schemas. The
domain layer must not redefine transport schemas. When transport and domain shapes
diverge (intentional), the divergence is explicit and documented. CI test asserts no
schema redefinition across the boundary.

**Repo-layer fetch semantics independent of ORM query style.** Repository methods
commit *stable fetch semantics* (named operations like `findActiveMembers`,
`findClaimsByStatus`); ORM API style is implementation. Default preference: Drizzle
Core API; Drizzle Relational API allowed when nested-include shape is needed.
Architecture avoids depending on ORM API fashions.

---

## Operational commitments — cadence, governance, review

### Enforcement

**ESLint + Prettier with shared TWT config** (lives in `packages/eslint-config-twt/`)
covering naming, import boundaries, no-magic-numbers, and the architecture-specific
rules accumulated below.

**TypeScript strict mode** across all packages; `noUncheckedIndexedAccess` enabled.

**Consolidated ESLint-rule inventory.** `packages/eslint-config-twt/README.md` (or
equivalent) is the canonical inventory of all CI-enforced lint rules. The architecture
commits the *existence + cadence-review* of the inventory; rule details live in the
package. Reviewed quarterly (alongside PR-template review + friction-budget review) to
retire stale rules and surface new ones.

**File-name + directory-name lint** (kebab-case files; PascalCase components).

**Conventional Commits scope vocabulary.** Scope is the workspace or workspace/module
path:
- Workspace-level: `feat(api): ...`, `fix(mobile): ...`.
- Module-level: `feat(api/member): ...`, `fix(admin/helpline): ...`.
- Cross-workspace shared: `refactor(packages/contracts): ...`.
- Repo-wide / chore: `chore: ...` (no scope).

**Generated artifacts remain deterministic and synchronized with committed contracts.**
The committed generated client (and other generated artifacts) match the committed
source contracts at all times. Drift = build failure (CS-API-1 generator determinism
gate). Generation trigger (on PR / on release / on schedule) is implementation; the
synchronization invariant is architectural.

**Generated artifacts excluded from PR review diff.** Generated files
(`packages/api-client/dist/*`, `openapi/v1.yaml`, etc.) remain committed but are
excluded from default PR review surface — CODEOWNERS owns generated paths to a bot
identity, or `.gitattributes linguist-generated=true` marks them. Reviewers see source-
only diff by default; opt-in surface available for sanity check.

**Database migration env confirmation.** Migration commands require explicit env
target; CLI prompts for `dev | staging | prod` and requires confirmation for
`staging` / `prod`. CI-driven migrations bypass the prompt with explicit flag + audit-
log entry. Local-dev migrations against non-dev env require second-person co-sign per
§5.4.

### Review cadences

**Cumulative friction budget reviewed quarterly.** Friction-budget surfaces
(`friction-budget.md` lines across PRs) reviewed at the quarterly capacity-review
cadence (§5.6). Cumulative friction count + per-persona load tracked over time; growth
past committed bounds triggers a friction-cleanup pass before adding new friction
surfaces.

**PR-template review budget.** The PR template carries reviewer prompts. Without a cap,
the template grows unbounded. The architecture commits a *bounded* checklist — each
new prompt requires retiring an existing prompt or merging into an existing category.
Reviewed at the quarterly capacity-review cadence.

**PR-template initial scope.** First-commit-time prompts: type-shadowing check,
branded-ID check, friction-budget declaration, accessibility-impact note,
performance-impact note, security-impact note. HR-9 governs *additions* past this
baseline.

**Multi-actor controls in degraded mode.** Several patterns require ≥ 2 actors (KEK-
roots destruction approval, retention-IaC two-person review, Secret Manager high-
sensitivity updates, Dokploy version updates, staging/prod migration co-sign). These
controls operate in **degraded mode** until staffing assumptions hold — when only one
actor is reachable, the action is blocked or paged out rather than silently single-
signed. The architectural property is that the multi-actor control does not silently
downgrade to single-actor.

### Onboarding artifacts

**Repository README structure.** The repo root `README.md` is an architecture artifact.
Contents: cross-reference to the essential-patterns table; index of `docs/adr/`,
`docs/runbooks/`, `docs/onboarding-tour.md`; first-PR walkthrough; environment setup
checklist. Reviewed at the threat-actor-inventory cadence.

**Onboarding tour file.** `docs/onboarding-tour.md` is committed as an architectural
artifact. Named ordered list of files a contractor reads in their first day:
- One canonical `service.ts` (the golden example).
- One canonical `repo.ts`.
- One canonical `handler.ts`.
- One canonical Zustand store.
- One canonical feature test.
- One canonical `packages/contracts/` schema.
- One canonical ADR.
- One canonical runbook.

Reviewed at the threat-actor-inventory cadence.

### Test + flag governance

**Flaky tests become visible, tracked, and temporary.** Flaky tests are:
- **Visible** — CI surfaces flake events explicitly; no silent pass.
- **Tracked** — every flaky test has a named owner + a tracking issue + a dead-by-date.
- **Temporary** — past dead-by-date, the flaky test must be fixed, replaced, or
  deleted. No permanent quarantine.

**Feature-flag lifecycle.** Each feature flag carries at creation: named owner +
expected-retirement signal (measurable condition triggering retirement). Quarterly
capacity review audits the flag inventory; dead flags retired; perpetually-on flags
reviewed for default-behavior promotion.

---

## Top 10 architectural anti-patterns

Short list; references deeper sections.

1. **Raw logger calls** in business-logic packages — use the error-emit helper.
2. **Type shadowing** of `packages/contracts/` via hand-written `dto.ts` / `*.types.ts`.
3. **Fetch-in-loop** patterns (`Promise.all(items.map(repo.findById))`) without explicit
   reviewer approval.
4. **Kitchen-sink `lib/`** — code that's cross-workspace lives in `packages/`, not in
   `apps/<workspace>/lib/`.
5. **`Date.now()` or `new Date()`** in business-logic packages — use clock injection.
6. **`as any`** anywhere in the codebase.
7. **`as unknown as T`** outside test-fixture builders.
8. **Direct Zustand mutation** (`state.x = y` instead of `set(prev => ...)`).
9. **camelCase identifiers in raw SQL strings** — DB layer is snake_case.
10. **Path-alias or relative cross-package imports** instead of package names
    (`@twt/contracts`).

## Pattern examples

```typescript
// apps/api/modules/member/member.service.ts
export class MemberService {
  async fetchActiveMembers(pariwarId: PariwarId, cursor?: Cursor): Promise<MemberPage> {
    const result = await this.memberRepo.findActive({ pariwarId, cursor });
    return { items: result.rows, nextCursor: result.next, hasMore: result.more };
  }
}

// packages/events/pool/spawned.ts
export const PoolSpawnedEvent = z.object({
  version: z.literal('v1'),
  poolId: z.string().uuid(),
  alertId: z.string().uuid(),
  claimId: z.string().uuid(),
  pariwarId: z.string().uuid(),
  spawnedAt: z.string().datetime(),
}).strict();
```

```typescript
// ❌ snake_case in TS layer
export async function fetch_active_members(pariwar_id) { /* ... */ }

// ❌ Direct Date.now() in business logic
export function isExpired(payment: Payment): boolean {
  return Date.now() > payment.expiresAt.getTime();
}

// ❌ Raw logger in business-logic package
import logger from 'pino';
logger.error('Pool spawn failed', { err });

// ❌ Cross-store import in Zustand
import { useAuthStore } from '../auth/store';  // inside a feature store
```

## Project Structure & Boundaries

Based on commitments across Steps 2–5, the project structure is largely determined.
This step assembles the complete tree, maps FRs to specific locations, surfaces
boundaries between layers, and commits the rules that govern where new code lands.

### Complete project directory structure

```
twt/
├── README.md                           # Architecture map's front door
├── package.json                        # pnpm workspace root
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json                          # Turborepo task graph + per-Pariwar build profiles
├── tsconfig.base.json
├── .nvmrc
├── .gitignore
├── .gitattributes                      # generated paths marked linguist-generated
├── .env.example
├── eslint.config.js                    # Re-exports packages/eslint-config-twt
├── prettier.config.js
├── commitlint.config.js                # Conventional Commits enforcement
├── .github/
│   ├── CODEOWNERS                      # generated paths owned by @bot identity
│   ├── pull_request_template.md        # Initial PR-template scope (Step 5 CR2-7)
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
│       ├── ci.yml                      # lint + typecheck + test + bundle + a11y + scrape-test
│       ├── deploy-dev.yml
│       ├── deploy-staging.yml
│       ├── deploy-prod.yml             # WIF-gated; promotion approval ≥ 2 principals
│       ├── migration.yml               # env-confirmation gated
│       └── nightly-integrity.yml       # audit log integrity check
├── infra/                              # Deployment + cloud-resource IaC
│   ├── cloudflare/                     # WAF, Bot Management, Turnstile config (FR-88)
│   ├── gcp/                            # Cloud SQL, Cloud Storage, KMS, Secret Manager, IAM, networking
│   └── dokploy/                        # Dokploy deployment config (isolated GCP project)
├── docs/
│   ├── adr/                            # Architecture Decision Records (with status markers)
│   ├── runbooks/                       # Operational sequences (cadence + provider-specific)
│   ├── escrow/                         # Credential + code escrow inventory + procedures
│   ├── architecture/
│   │   └── evolution/                  # Split triggers, ownership, migration checklists
│   └── onboarding-tour.md              # Day-1 named file list
├── openapi/
│   └── v1.yaml                         # Generated spec (synchronization invariant)
├── apps/
│   ├── mobile/                         # Expo + Tamagui native
│   │   ├── package.json
│   │   ├── app.json
│   │   ├── eas.json                    # Per-Pariwar build profiles
│   │   ├── babel.config.js
│   │   ├── metro.config.js
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── app/                        # Expo Router file-system routes
│   │   │   ├── _layout.tsx             # Banner rendering at layout level
│   │   │   ├── (auth)/
│   │   │   ├── select-pariwar/         # v2 multi-Pariwar account selection (gated; v1 single-Pariwar)
│   │   │   ├── p/[pariwarId]/
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── home/               # My Pool card + Yogdaan Bahi
│   │   │   │   ├── pool/
│   │   │   │   ├── claims/
│   │   │   │   ├── modules/            # Module Shelf (member view)
│   │   │   │   ├── profile/            # FR-12A status self-visibility
│   │   │   │   ├── news/               # FR-51 member news feed
│   │   │   │   └── polls/              # FR-58 active surveys
│   │   │   └── ravi-mode/              # Relative-as-deceased flow
│   │   ├── lib/                        # Workspace-shared utilities
│   │   ├── shared/                     # Multi-feature components
│   │   ├── modules/                    # Feature modules (when scope grows)
│   │   ├── assets/
│   │   └── docs/
│   ├── public/                         # Astro 6 SSR public website
│   │   ├── package.json
│   │   ├── astro.config.mjs
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── pages/                  # File-system routing
│   │   │   │   ├── index.astro
│   │   │   │   ├── sahyog-list.astro
│   │   │   │   ├── members.astro       # Member Directory (FR-75)
│   │   │   │   ├── memoriam.astro      # In Memoriam (FR-78)
│   │   │   │   ├── niyamavali.astro    # Rulebook with diff (FR-79)
│   │   │   │   └── api/                # Astro Actions
│   │   │   ├── components/
│   │   │   ├── layouts/
│   │   │   └── content/
│   │   └── public/                     # Static assets
│   ├── admin/                          # Vite + React + Tailwind + Radix
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── routes/                 # TanStack Router file routes
│   │   │   │   └── p/[pariwarId]/
│   │   │   ├── modules/
│   │   │   │   ├── verifier/           # Anita's verifier console (FR-42)
│   │   │   │   ├── helpline/           # Priya's operator console (Persona #7)
│   │   │   │   ├── claim-review/
│   │   │   │   ├── members-admin/
│   │   │   │   ├── niyamavali-admin/
│   │   │   │   ├── modules-admin/
│   │   │   │   ├── audit-explorer/
│   │   │   │   ├── helpdesk/
│   │   │   │   ├── field-worker-dispatch/
│   │   │   │   ├── reconciliation-queue/
│   │   │   │   ├── news-blog-author/
│   │   │   │   ├── reports/            # FR-58A reports & exports library
│   │   │   │   ├── surveys/            # FR-58 survey/poll authoring (v1-S)
│   │   │   │   ├── banners/            # FR-58B banner / popup manager
│   │   │   │   └── pariwar-provisioning/  # 2nd-Pariwar wizard (empty at v1)
│   │   │   ├── lib/
│   │   │   └── shared/
│   │   └── public/
│   ├── api/                            # Fastify HTTP API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── server.ts               # Fastify boot + ALS middleware + WIF setup
│   │   │   ├── plugins/                # Framework integration (Fastify ecosystem)
│   │   │   │   ├── zod-openapi/
│   │   │   │   ├── swagger/
│   │   │   │   ├── session/            # @fastify/session (admin web)
│   │   │   │   ├── jwt/                # @fastify/jwt (mobile + API)
│   │   │   │   ├── rate-limit/         # @fastify/rate-limit
│   │   │   │   └── cookie/
│   │   │   ├── middleware/             # Cross-cutting request policy
│   │   │   │   ├── request-context/    # ALS hydration at request entry
│   │   │   │   ├── scope-resolution/   # pariwar_id from URL path → session variable
│   │   │   │   ├── audit-context/      # Audit-emit context propagation
│   │   │   │   └── error-mapping/      # DomainError → 4xx; uncaught → 500
│   │   │   ├── modules/
│   │   │   │   ├── member/             # Membership lifecycle (FR-1..6)
│   │   │   │   ├── kyc/                # DigiLocker + manual fallback (FR-2)
│   │   │   │   ├── rules/              # Niyamavali rule registry (FR-7..11)
│   │   │   │   ├── validity/           # FR-12A Member Validity Service
│   │   │   │   ├── pool/               # Pool Engine (FR-13..20)
│   │   │   │   ├── alert/              # Alert lifecycle (FR-21..26)
│   │   │   │   │   ├── alert.types.ts
│   │   │   │   │   ├── alert.service.ts
│   │   │   │   │   └── channels/       # Per-channel dispatchers
│   │   │   │   │       ├── fcm/
│   │   │   │   │       ├── whatsapp/
│   │   │   │   │       └── telegram/
│   │   │   │   ├── payment/            # UPI Intent dispatch (FR-27..36)
│   │   │   │   ├── reconciliation/     # Matcher input + UTR
│   │   │   │   ├── claim/              # GOLDEN EXAMPLE — Claim lifecycle (FR-37..43A)
│   │   │   │   ├── appeal/             # FR-43A internal appeal flow
│   │   │   │   ├── auth/
│   │   │   │   │   ├── member/         # OTP + JWT refresh
│   │   │   │   │   ├── admin/          # Email + password + WebAuthn (operator session lives here for now)
│   │   │   │   │   ├── partner/        # JWT verification for partner endpoints
│   │   │   │   │   └── shared/         # Cross-flow primitives
│   │   │   │   ├── rbac/               # Permission keys + role bundles (FR-44..46)
│   │   │   │   ├── audit-log/          # Hash-chain writer + integrity
│   │   │   │   ├── multi-tenant/       # pariwar_id session middleware integration
│   │   │   │   ├── modules-shelf/      # Module Marketplace (FR-64..67)
│   │   │   │   ├── partner-leads/      # Partner lead handoff
│   │   │   │   ├── helpdesk/           # Ticket system (FR-52)
│   │   │   │   ├── field-worker/       # Attribution (FR-81..87)
│   │   │   │   ├── news-blog/          # News + blog (FR-51)
│   │   │   │   ├── feature-flags/      # FR-58C cohort flags
│   │   │   │   ├── dpdpa/              # Consent registry, RTBF, data export
│   │   │   │   ├── pariwar-passport/   # FR-63 cross-Pariwar identity
│   │   │   │   ├── public-pages/       # Sahyog Drive + Vivran (FR-74..80)
│   │   │   │   ├── reports/            # FR-58A query orchestration
│   │   │   │   ├── surveys/            # FR-58 backend (v1-S)
│   │   │   │   ├── banners/            # FR-58B backend
│   │   │   │   ├── pariwar-provisioning/  # Provisioning orchestration (empty at v1)
│   │   │   │   └── crowdfunding/       # Phase 2/3 boundary placeholder + import lint
│   │   │   └── telephony/              # CTI signaling (peer of modules per Step 3 R-1)
│   ├── jobs/                           # pg-boss workers
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── boot.ts                 # pg-boss boot + health endpoint + SIGTERM drain
│   │   │   ├── matcher/                # Reconciliation cron (FR-30)
│   │   │   ├── audit/                  # Audit-integrity check + Merkle publish
│   │   │   └── scheduler/              # SIE driver + alert state machine + grace progression
└── packages/
    ├── tokens/                         # Design tokens
    │   ├── package.json
    │   ├── src/
    │   │   ├── colors.ts
    │   │   ├── typography.ts
    │   │   ├── spacing.ts
    │   │   └── per-pariwar/            # Per-Pariwar token overlays (FR-60)
    │   │       └── bihar/
    ├── i18n/                           # Centralized locale + formatting
    │   ├── package.json
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── number.ts
    │   │   ├── currency.ts
    │   │   ├── date.ts
    │   │   ├── relative-time.ts
    │   │   ├── pluralize.ts
    │   │   ├── actor-class-register.ts # Per-actor-class register
    │   │   ├── strings/                # Base strings (hi-IN + en-IN)
    │   │   └── per-pariwar/
    │   │       └── bihar/
    ├── domain/                         # Drizzle schema + RLS + branded IDs + tenant rules
    │   ├── package.json
    │   ├── migrations/                 # drizzle-kit canonical location
    │   ├── seed/
    │   │   ├── dev/                    # Synthetic dev data
    │   │   └── staging/                # Synthetic staging data
    │   ├── src/
    │   │   ├── schema/                 # Drizzle table definitions
    │   │   ├── policies/               # RLS via pgPolicy
    │   │   ├── ids/                    # Branded type definitions
    │   │   ├── encryption/             # Envelope encryption + blind-index helpers
    │   │   ├── snapshot-fixtures/      # Historical-format snapshots
    │   │   ├── snapshot-adapters/      # Migration adapters
    │   │   ├── cross-tenant/           # Named cross-tenant operations helper
    │   │   ├── bank-statement/         # Normalized statement-row schema
    │   │   ├── per-pariwar/
    │   │   │   └── bihar/
    │   │   │       ├── manifest.ts     # Pariwar identity envelope (RE6-2)
    │   │   │       └── index-inventory.ts  # Functional B-tree index inventory (§1.7 D1)
    │   │   └── permissions/            # RBAC permission keys + role bundles
    ├── contracts/                      # Transport Zod schemas (by externally-consumed domain)
    │   └── src/
    │       ├── members/
    │       ├── claims/
    │       ├── pools/
    │       ├── alerts/
    │       ├── contributions/
    │       ├── modules/
    │       ├── partners/
    │       ├── audit/
    │       ├── rbac/
    │       ├── kyc/
    │       ├── reconciliation/
    │       ├── helpdesk/
    │       ├── feature-flags/
    │       ├── pariwar-passport/
    │       ├── deep-links/
    │       └── _common/                # errors, pagination, cursors, shared primitives
    ├── api-client/                     # Generated client (per-tag subsetting)
    │   └── dist/
    ├── platform-adapters/              # Substrate-agnostic primitives
    │   └── src/
    │       ├── native-primitives/      # Mobile native bridge (FM-1)
    │       ├── error-display/          # Standardized error rendering
    │       ├── cache-policy/           # Per-surface cache budgets
    │       ├── focus-management/       # State-change focus restoration
    │       ├── keyboard-shortcuts/     # Operator-surface shortcuts
    │       └── logging/                # Shared Pino setup + PII-stripping + ALS integration
    ├── ui/                             # Composed shared UI components
    │   ├── src/
    │   │   ├── sahyog-list/
    │   │   ├── yogdaan-bahi/
    │   │   ├── member-directory-row/
    │   │   ├── pool-card/
    │   │   ├── memorial-frame/
    │   │   └── ...
    │   └── variants/
    │       ├── _allowlist.ts           # Components that accept overrides + which slots
    │       └── bihar/                  # Per-Pariwar overlays (allowlisted only)
    ├── bank-parsers/                   # Per-Pariwar bank statement parsers
    │   ├── src/
    │   │   └── registry.ts             # Runtime parser dispatch (RE6-6)
    │   └── bihar/
    │       ├── sbi/                    # CSV parser + 50 golden files
    │       ├── pnb/
    │       ├── bob/
    │       ├── boi/
    │       └── cooperative/
    ├── events/                         # Immutable event contracts
    │   └── src/
    │       ├── pool/
    │       ├── claim/
    │       ├── contribution/
    │       ├── audit/
    │       ├── alert/
    │       ├── member/
    │       ├── ...
    │       └── registry.ts             # Enumerates all event types (FM-PS-10)
    └── eslint-config-twt/              # Consolidated ESLint rules inventory + README
└── tests/
    ├── integration/
    │   ├── pool-engine/replay.spec.ts            # Pool Engine determinism (uncompromisable)
    │   ├── multi-tenant/cross-pariwar-leak.spec.ts  # Cross-Pariwar adversarial (uncompromisable)
    │   ├── rls/policy-regression.spec.ts         # RLS regression (uncompromisable)
    │   ├── audit-log/integrity-check.spec.ts     # Hash-chain integrity (uncompromisable)
    │   ├── snapshot-adapters/property.spec.ts    # Historical fixtures + invariants (uncompromisable)
    │   ├── public-pages/scrape-test.spec.ts      # PII shielding FR-74 (uncompromisable)
    │   ├── member/
    │   ├── pool/
    │   ├── claim/
    │   ├── reconciliation/
    │   └── ...
    └── e2e/                            # Playwright golden-path flows
        ├── member-signup/
        ├── monthly-contribution/
        ├── claim-filing-ravi-mode/
        ├── reconciliation-mismatch/
        └── ...
```

### Architectural boundaries

#### Documentation location boundary

Six named homes; place by **change cadence**:
- **`docs/adr/`** — decisions (what was chosen + why + alternatives). Change rarely.
- **`docs/runbooks/`** — operational sequences (cadence-based, provider-specific).
- **`docs/escrow/`** — credential + code escrow inventory + sealed-procedure references.
- **`docs/architecture/evolution/`** — architectural change shape (split triggers,
  ownership, migration).
- **`docs/onboarding-tour.md`** — day-1 reading list.
- **`README.md`** — repo front door.

#### Component-layer boundary

- **`packages/platform-adapters/`** — substrate-agnostic adapters + behavioral
  primitives. Stateless visual + accessibility + interaction units; no TWT-specific
  data-shape knowledge.
- **`packages/ui/`** — composed components that know TWT-specific data shape (Sahyog
  List, Yogdaan Bahi, etc.). Built on platform-adapters + tokens + i18n.
- **Feature-internal composed components** — single-feature scope stays in
  `apps/<workspace>/modules/<feature>/`. Promotion to `packages/ui/` follows the
  second-consumer rule (Step 5 HR-1 modified).

**Per-Pariwar UI variants via allowlisted overlay.** `packages/ui/variants/<id>/` allows
overrides on copy, icons, layout slots, optional sections — **not** full feature
replacement. CI enforces the allowlist at the component definition.

#### `plugins/` vs `middleware/` rule

- **`plugins/`** — framework integration. Code whose primary purpose is bridging TWT
  with Fastify's ecosystem.
- **`middleware/`** — cross-cutting request policy. Code whose primary purpose is
  enforcing TWT-specific request-handling discipline.

Some middleware may still use Fastify hooks underneath; that's implementation, not
category-defining. Rule is intent-driven.

#### `infra/` vs `packages/<config>/` boundary

- **`infra/`** — deployment + cloud-resource IaC. Deployed to a cloud at apply-time.
- **`packages/<config>/`** — code-level shared configuration. Consumed at build-time.

Rule: **deployed vs consumed-by-build.**

#### Contracts sub-domain rule

`packages/contracts/src/<domain>/` exists for **externally-consumed API surfaces**
only. Internal-only modules emit events (via `packages/events/`) and consume internal
types from `packages/domain/`.

#### Integration test enumeration rule

- **Uncompromisable subsystems** *must* have integration tests; fail the build on
  regression; never quarantined.
- **Other modules** *may* have integration tests when meaningful.
- **End-to-end tests** cover golden-path user flows.

#### Package ownership declaration

Every root package (`packages/<name>/`) optionally carries a short ownership block in
its README:
```
## Package
Owner: <name or role>
Purpose: <one line>
Promotion rule: <when does code enter / leave this package>
```

Short — not governance. Just discoverability.

### Requirements-to-structure mapping

| FR cluster | Lives in |
|---|---|
| §4.1 Identity & Membership (FR-1..6) | `apps/api/src/modules/member/` + `kyc/` |
| §4.2 Niyamavali Rules (FR-7..11) | `apps/api/src/modules/rules/` + `packages/domain/policies/` |
| §4.2 FR-12A Validity Service | `apps/api/src/modules/validity/` |
| §4.3 Pool Engine (FR-13..20) | `apps/api/src/modules/pool/` + `apps/jobs/src/scheduler/` |
| §4.4 Alert Lifecycle (FR-21..26) | `apps/api/src/modules/alert/` + `channels/` |
| §4.5 Payment + Reconciliation (FR-27..36) | `apps/api/src/modules/payment/` + `reconciliation/` + `apps/jobs/src/matcher/` |
| §4.6 Claim Flow (FR-37..43A) | `apps/api/src/modules/claim/` + `appeal/` — **GOLDEN EXAMPLE** |
| §4.7 Admin UI (FR-44..58C) | `apps/admin/modules/*` + `apps/api/src/modules/{rbac,audit-log,reports,surveys,banners}` |
| §4.8 Multi-Pariwar (FR-59..63) | `apps/api/src/modules/{multi-tenant,pariwar-passport,pariwar-provisioning}` + `packages/domain/per-pariwar/<id>/` |
| §4.9 Module Marketplace (FR-64..67) | `apps/api/src/modules/{modules-shelf,partner-leads}` |
| §4.10 Communication (FR-68..73) | `packages/i18n/` + `apps/api/src/modules/alert/channels/` |
| §4.11 Public Pages + PII (FR-74..80) | `apps/public/` + `apps/api/src/modules/public-pages/` |
| §4.12 Growth + Field Worker (FR-81..87) | `apps/api/src/modules/field-worker/` + `apps/admin/modules/field-worker-dispatch/` |
| §4.13 Security (FR-88..93) | `infra/cloudflare/` + `apps/api/src/plugins/rate-limit/` |
| §4.14 Trust Posture + DPDPA (FR-94..99) | `apps/api/src/modules/dpdpa/` + Niyamavali registry + `packages/i18n/` legal copy |
| §4.15 Future Benefit Hooks (FR-100) | *no v1 surface;* forward-compat hooks only — `benefit_mechanism` discriminator on rule-registry payload (`apps/api/src/modules/rules/`); reserved payout-destination slot (no v1 table/column/endpoint); Vyawastha Shulk receipt persistence on `payments` / `receipts`. Durghatana Sahayata module is greenfield at v2/v3 (see §1.13). |

**Cross-cutting concerns:**

| Concern | Lives in |
|---|---|
| Audit log integrity | `apps/api/src/modules/audit-log/` (writer) + `apps/jobs/src/audit/` (integrity check) |
| Branded IDs | `packages/domain/src/ids/` |
| Encryption + KMS | `packages/domain/src/encryption/` |
| Cross-tenant operations | `packages/domain/src/cross-tenant/` |
| Channel dispatch | `apps/api/src/modules/alert/channels/` + provider adapters in `packages/platform-adapters/` |
| Webhook ingress | per-module `webhooks/` (persist + ack pattern) |
| Feature flags | `apps/api/src/modules/feature-flags/` + flag SDK in `packages/platform-adapters/` |
| Snapshot adapters | `packages/domain/src/snapshot-adapters/` + fixtures |
| Bank parsers | `packages/bank-parsers/<pariwar>/<bank>/` + `registry.ts` |
| Permissions / RBAC | `packages/domain/src/permissions/` + `apps/api/src/modules/rbac/` |

### Integration points

#### Internal communication

- **API ↔ workers** — same Postgres + same domain layer; pg-boss jobs spawned by API
  handlers and consumed by `apps/jobs/`.
- **API ↔ frontends** — REST + generated client; OpenAPI as the contract.
- **Frontend ↔ frontend (deep links)** — `packages/contracts/src/deep-links/` defines
  URL grammar.
- **Worker ↔ worker** — events via `packages/events/`; consumers registered in
  `registry.ts`; no direct worker-to-worker calls.

#### External integrations

- **DigiLocker** (KYC) — `apps/api/src/modules/kyc/` behind a provider interface.
- **FCM + APNs** (push) — via Firebase Admin SDK; per-Pariwar FCM project.
- **WhatsApp Business** — Meta Cloud API behind channel provider interface.
- **Telegram Bot API** (mirror) — fire-and-forget.
- **Telephony provider** — behind provider interface in `apps/api/src/telephony/`.
- **Partner endpoints** — signed-JWT lead handoff; partner webhooks per persist+ack.
- **Bank statement upload** — multipart upload in
  `apps/api/src/modules/reconciliation/` → parser sandbox (per Step 4 §5.3) →
  matcher queue.
- **GCP services** — Cloud SQL, Cloud Storage, Cloud KMS, Secret Manager, Cloud
  Monitoring, Cloud Logging, Artifact Registry.
- **Cloudflare** — edge WAF + Bot Management + Turnstile.

#### Data flow — monthly contribution cycle (canonical)

```
1. Trustee approves N claims @ cycle freeze
   └─ alert.frozen event → apps/jobs/src/scheduler/ spawns N pool-spawn jobs (saga)

2. Pool spawn (per-pool child job, idempotent by (alert_id, claim_id))
   └─ apps/api/src/modules/pool/ creates Pool object
   └─ packages/events/src/pool/spawned.ts emitted
   └─ audit log entry written (hash-chain)
   └─ Pool Engine snapshot persisted

3. Alert publish
   └─ apps/api/src/modules/alert/ → channel dispatcher
   └─ FCM (timely) + WhatsApp (multi-day tail) + Telegram (announcement)
   └─ message intent log persisted (replayable)

4. Member opens app → My Pool card
   └─ apps/mobile/ → TanStack Query → apps/api/src/modules/validity/ (FR-12A)
   └─ apps/api/src/modules/pool/ → assigned pool details

5. Member taps Pay → UPI Intent
   └─ apps/api/src/modules/payment/ → UPI URL with tr= idempotency
   └─ UPI app handoff
   └─ Member returns → UTR self-attest

6. Reconciliation
   └─ Nominee uploads daily statement → apps/api/src/modules/reconciliation/
   └─ Parser sandbox → normalized rows → packages/domain/src/bank-statement/
   └─ apps/jobs/src/matcher/ runs every 4h
   └─ Match → contribution.confirmed event → push to member

7. Cycle close (Day 15)
   └─ alert.closed event → public Sahyog Vivran published (apps/public/)
   └─ In Memoriam updated
   └─ Audit log entries finalized
```

### File organization patterns

- **Configuration files** — at workspace root; per-environment in
  `apps/<workspace>/config/<env>.ts` (TS, not JSON).
- **Source organization** — by-feature within workspace; three-tier code location
  per Step 5 (cross-workspace `packages/` → workspace-shared
  `apps/<workspace>/lib/` → feature-scoped `apps/<workspace>/modules/<feature>/`).
- **Test organization** — co-located unit tests; integration in `tests/integration/`;
  e2e in `tests/e2e/`; Astro logic moved to `.ts` for testability.
- **Asset organization** — static assets in `apps/<workspace>/public/` (or
  `assets/`); per-Pariwar branding bundles in `apps/mobile/eas.json` + per-app
  build profiles.

### Development workflow integration

- **Development server:** `pnpm turbo run dev --filter=<workspace>` for filtered
  runs; `pnpm turbo run dev` for the full tree.
- **Build process:** `pnpm turbo run build`; Docker image builds per deployable
  workspace via Turborepo task graph.
- **Deployment:** GitHub Actions + WIF → Artifact Registry → Dokploy v1; promotion
  gate at staging → prod with ≥ 2 principals.
- **CI gates** consolidated in Step 4 §5.4 + Step 5 enforcement.

## Architecture Validation Results

> _This section validates the architecture's coherence, surfaces gaps, classifies readiness, and defines the handoff to implementation. It is a **validation** section, not new architectural commitment. Subsections marked **(Calibration)** or **(Distinction)** introduce framing notes that the validation depends on; subsequent statements should be read through that frame._

### Coherence Validation

**Decision Compatibility.** Committed technology choices align without surfaced
conflicts. Cross-step references resolve. Versions are committed where
load-bearing (Astro 6, Postgres on Cloud SQL Mumbai, pg-boss 12.x,
fastify-zod-openapi for OpenAPI extraction); other specific version pinning is
deferred to ADRs at implementation time. No contradictory decisions surfaced
across Categories 1–5.

**Pattern Consistency.** Implementation patterns (Step 5) align with the
technology stack. Naming conventions are explicit and uniform (snake_case in DB,
camelCase in TS/JSON, Drizzle handles the boundary). Communication patterns
(event naming, dispatcher contract, dotted cross-service vs PascalCase
in-process) are coherent. Process patterns (error handling, transactions, ALS
context propagation, branded IDs) reinforce architectural commitments.

**Structure Alignment.** Project structure (Step 6) materializes the
architectural decisions: monorepo with Turborepo + pnpm; three-tier code
location (cross-workspace `packages/` → workspace-shared `apps/<workspace>/lib/`
→ feature-scoped `apps/<workspace>/modules/<feature>/`); per-workspace
boundaries enforced by import lint. The multi-tenant boundary surfaces at
structure (URL path prefix), runtime (request context), data (RLS), and
codebase (ESLint rules) — structural redundancy by design.

### Requirements Coverage Validation

**Functional Requirements Coverage.** ~104 FRs across 14 capability clusters
mapped to directory homes:

| Cluster | Module location |
|---|---|
| Admin UI (16 FRs) | `apps/admin/modules/` |
| Reconciliation (10 FRs) | `apps/api/modules/reconciliation/` + `apps/jobs/matcher/` |
| Pool Engine (8 FRs) | `apps/api/modules/pool/` |
| Claims (8 FRs) | `apps/api/modules/claim/` (golden example) |
| Rules Engine (7 FRs) | `apps/api/modules/rules/` |
| Identity Lifecycle (6 FRs) | `apps/api/modules/member/` + `apps/api/modules/lifecycle/` |
| Payments / UPI (5 FRs) | `apps/api/modules/payment/` |
| Helpline (telephony / CTI, Persona #7) | `apps/admin/modules/helpline/` + `apps/api/src/telephony/` |
| Helpdesk / ticketing (FR-52) | `apps/api/modules/helpdesk/` + `apps/admin/modules/helpdesk/` + `packages/contracts/helpdesk/` |
| Notifications | `apps/api/modules/notification/` + `apps/jobs/dispatcher/` |
| Audit & Compliance | `apps/api/modules/audit/` + audit-mirror project |
| Trust / Pariwar Mgmt | `apps/api/modules/pariwar/` |
| Mobile-facing | `apps/mobile/modules/` |
| Public site | `apps/public/` |
| Cross-cutting (RBAC, branding, domain) | `packages/auth/`, `packages/domain/`, `packages/ui/` |

Coverage is at cluster level. Per-FR audit is deferred to implementation-time as
each cluster materializes.

**Non-Functional Requirements Coverage.** Performance, security, compliance,
and scalability NFRs are addressed in §5.12 (NFR table) cross-referencing the
architectural surface that enforces each. Budgets are paired with the subsystem
they constrain.

**Cross-cutting Requirements.** 20+ cross-cutting concerns mapped in Step 2 with
enforcement mechanisms named where decided; remaining mechanism choices
deferred to implementation-time with ADR commitment.

### Implementation Readiness Validation

The three uncompromisable subsystems each have:

- A committed mechanism (Pool Engine, Reconciliation pipeline, RBAC +
  multi-tenant isolation).
- Structural protection (RLS, branded IDs, import lint, dual-write
  reconciliation, hash chain).
- Evidence trail (commits + ADRs + runbooks per §6).

**Decision Completeness.** Critical decisions documented at
architectural-commitment level. Specific tool versions deferred to ADRs at
implementation time where not load-bearing.

**Structure Completeness.** The directory tree (Step 6) defines all workspaces
+ module boundaries; integration points named; component boundaries enforced.

**Pattern Completeness.** Step 5 essential-patterns table + detail covers
conflict points across naming, communication, error handling, transactions,
branded IDs, dispatcher contract.

### (Calibration) Checklist `[x]` semantics

A `[x]` in the completeness checklist means **architecturally committed** — not
empirically validated. The architecture commits the property; downstream PoC,
implementation, and operational evidence confirm execution. A reader could
interpret `[x]` as "proven"; the workflow's commitment is "specified +
internally consistent." This distinction is load-bearing for the readiness
assessment.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions (where load-bearing; per-decision version pinning deferred to ADRs at implementation time)
- [x] Technology stack fully specified (mobile substrate ratifies on P0-5)
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete (cluster-level; per-FR audit deferred)

### Gap Analysis

**Gap tiering.** Two tiers:

- **Architecture complete** — the document is internally consistent +
  comprehensively scoped (no architectural Critical Gap).
- **Launch gated** — items that gate Phase 1 launch but not architecture-phase
  completion.

#### Launch Gate Risks (Owner / Support)

**Phase 1 transition requires closure or explicit disposition of each listed
gate.** Each gate is named here with owner and support; PRD §12 Phase 0
references this inventory as a prerequisite category. Disposition may be
"closed," "accepted risk," "deferred per named criteria," or "reframed" —
binary closure is not required.

| Gate | Owner | Support |
|---|---|---|
| A-13 backup engineer retainer | Trustee Panel | BigDev (technical-fit assessment) |
| P0-3 Spec-to-Cadence Reality Check | BigDev | Trustee Panel (scope decisions) |
| **[P0] Edge / WAF DPDPA-compatibility decision** (Cloudflare-incompatible → pivot to self-hosted WAF per §5.8a) | Trustee Panel | Legal Counsel (review), BigDev (pivot design) |
| P0-1 Lifecycle Operational-State Coverage | BigDev | UX |
| P0-2 Member-Class Validation (field work) | UX Researcher | Trustee Panel (logistics) |
| P0-4 Empty/Skeleton/Error Inventory | UX | BigDev |
| P0-5 Native-Stack Validation Experiment | BigDev | UX (UI parity assessment) |
| DPDPA grievance officer designation | Trustee Panel | Legal Counsel + BigDev (helpline architecture fit) |
| FR-43A external forum destination (district / state consumer commission, civil court) | Trustee Panel + Legal Counsel | — |
| Regulatory surface sign-off (trust + DPDPA + UPI) | Trustee Panel + Legal Counsel | BigDev (artifact preparation) |
| Trust formation + legal registration | Trustee Panel | Legal Counsel |

Owner is accountable; Support contributes expertise. No gate is single-threaded
where multiple disciplines are required.

#### P0-3 reconciliation note

The architecture's discipline surface accrued substantially across elicitation
— additional cross-cutting concerns, ongoing-maintenance disciplines,
structural protections beyond the original PRD scope. The architecture
discipline increased implementation obligations; implementation planning should
re-baseline scope before commitment. Complexity ≠ calendar linearly, but the
planning conversation should re-occur now that the architecture is finalized.

#### Composed Account State enumeration (deferred)

Cross-Cutting #12 commits Account State as atomically computed across member /
claim / pool / alert state primitives. Member-state primitive is committed in
§1.14. Claim-state, pool-state, alert-state primitives + the composition rules
+ the full enumeration of Account State end states (including §3.4's
`claim-filed-frozen`, `disbursed-frozen-readable`, `disabled-T+90`,
`public-record-∞`) are a focused follow-up workload. **Risk:** consumers of
computed Account State (dispatcher suppression §3.4, Module Shelf suppression
§4.15, screen-mode parameters Cross-Cutting #9) depend on a contract that is
not fully enumerated; today these consumers reference a partial state name list
inline. **Mitigation:** each consumer treats its current state-name list as
authoritative until the composition workload lands; new state names cannot be
introduced without enumerating them in the composition table.

#### Feature-flag tool selection (P1) — load-bearing dependency observation

Architecture references FR-58C feature flags as the gating mechanism for
DigiLocker-mandatory cutover (§2.8), progressive per-Pariwar capability rollout
(§3.13 capability registry), and staged migration of any future behavior
(Cross-Cutting #15). The specific tool is deferred per §Deferred Decisions
with a stated decision gate. **Observation:** if tool selection lags the first
FR-58C-gated rollout, DigiLocker-mandatory migration (PRD A-4) blocks or
requires ad-hoc gating that violates Cross-Cutting #15's visibility and
no-secret-flags properties. **Escalation path:** Gap Analysis findings may
elevate unresolved decisions into Launch Gate Risks (see §Launch Gate Risks
above) if this observation materializes into a slipping decision.

#### FR-20 pool-spawn capacity envelope — provisional until validated

Architecture commits the capacity-bound mechanism (§5.11 saga decomposition +
bulk-write primitive + per-cycle partition isolation + immutable snapshot
evaluation) that targets the PRD pool-spawn envelope. **Observation:**
capacity assumption remains provisional until validated under representative
load. If pre-launch measurement reveals the envelope does not hold, the
spawn-saga decomposition or the bulk-write mechanism may require revision.
**Escalation path:** Gap Analysis findings may elevate the unresolved
capacity-validation outcome into a Launch Gate Risk alongside the entries in
§Launch Gate Risks above.

### External Validation Pending

Every elicitation pass in this workflow was self-generated. External-perspective
review at trust-grade is named-but-not-completed.

**Required (block Phase 1 launch):**

- **Legal counsel** — trust posture under CPA 2019 + DPDPA + RBI/UPI; Cloudflare
  residency review; Phase-0 regulatory surface (§4.14.1). Engagement begins
  from architecture finalization and remains **concurrent** through Phase-0 and
  pre-launch checkpoints (not post-hoc review).
- **Independent security architect** — threat-actor inventory + RLS isolation +
  audit log integrity + KMS posture.
- **UX researcher (P0-2)** — member-class validation. Not because users are
  digitally inexperienced, but because TWT workflows are **infrequent,
  emotionally sensitive, financially meaningful, and difficult to validate
  analytically**. Engineering analytics alone cannot surface bereavement-flow
  friction, trust-eroding error copy, or cycle-event confusion.

**Recommended (improve confidence; not Phase-1 blocking):**

- **DBA with Postgres-at-scale experience** — RLS performance at 4L scale,
  connection pool sizing, audit log integrity check at 170M rows, snapshot
  storage projection.
- **SRE with on-call experience** — incident response + DR runbook +
  observability stack split + on-call rotation.

**DPIA ownership.** Trustee Panel + Legal Counsel own the DPIA artifact. DPIA
execution is operational, not architectural; architecture commits SDF
classification trigger + DPIA execution support (§2.12).

### PoC Validation Pending

P0-5 (Native-Stack Validation Experiment) is the only commitment to write
working code before architecture finalization. Five load-bearing assumptions
need empirical validation; everything else derives:

| PoC | Property measured |
|---|---|
| **RLS at scale** | Multi-policy compound query latency at 4L scale |
| **Queue burst** | pg-boss throughput under cycle-open burst |
| **Push fan-out** | 4L-member time-to-fan-out under FCM quota |
| **OCR reality** | OCR accuracy on real (non-curated) bank PDFs |
| **Crypto query** | Envelope encryption + HMAC blind-index query performance at 4L |

**Per-PoC Pass / Partial / Fail bands.** Each PoC author defines bands per the
property measured (latency, throughput, delivery rate, accuracy). **The
architecture owns existence; the PoC owns numbers.**

**PoC timing.** PoCs run *during* implementation, not as a prerequisite phase.
Solo Builder owns; early PoC signal informs feature commitment past PR-2.

**PoC failure rule.** A PoC result that contradicts an architectural assumption
triggers an **ADR**, not a retroactive edit to this architecture document. The
ADR documents the contradiction, the impact assessment, and the corrective
decision (substrate pivot, threshold revision, scope change). The architecture
document remains the **commitment record**; ADRs become the **evolution
record**.

### Enforcement Tiers

Architecture commits ongoing disciplines across many surfaces. Disciplines tier
by enforcement mechanism:

- **Tier A — Automated.** CI gates, lint rules, type tests, sentinel-value
  detection, bundle analyzers, OpenAPI breaking-change detection, integration
  tests, accessibility regression check. Hold at solo-build cadence —
  automation enforces continuously without human review.
- **Tier B — Cadence-driven.** Daily audit integrity check, daily push token
  cleanup, scheduled DR drill, dispatcher quota self-regulation, quarterly
  UX-copy audit, member-feedback inbox review. Hold as long as the cron /
  scheduler / cadence runs.
- **Tier C — Staffing-dependent.** Quarterly capacity review, quarterly
  threat-actor inventory review, quarterly friction-budget review, quarterly
  ESLint inventory review, quarterly ADR status audit, two-person approval
  workflows, peer review of high-sensitivity IaC changes. Activate or
  strengthen as A-13 contracts.

**No Tier C UX disciplines.** UX disciplines hold at solo cadence via
automation + cadence, not staffing-dependent enforcement.

**Tier C degraded-mode protocol.** Until A-13 is contracted, Tier C controls
operate in **degraded mode** with a documented exception log (per CR2-5). Each
exception captures: control name, reason for deviation, mitigating compensating
action, scheduled re-validation when A-13 activates. Degraded-mode is honest
about solo-build reality; it is not an indefinite license to bypass. A-13
contracting moves the architecture from degraded-discipline to full-discipline
by activating Tier C controls.

### (Distinction) Audit-readiness ≠ architecture-completeness

The architecture commits controls (two-person review on retention IaC, audit
log integrity hash chain, RLS isolation, KMS key separation, dual-write
reconciliation). **Designed controls ≠ exercised controls.** Audit-readiness
requires *demonstrated* controls — exercised drills, dry-runs, integrity-check
evidence, restore tests, IR tabletop runs. These are Phase-0 / Phase-1
deliverables, not architecture-phase outputs. The architecture's evidence trail
(commits + ADRs + runbooks) supports audit-readiness work; it does not
constitute audit-readiness.

### Control-Demonstration Schedule

Each high-stakes designed control commits to a **first exercise** trigger and a
**review cadence**:

| Control | First exercise | Review cadence |
|---|---|---|
| DR drill (restore from snapshot) | Pre-launch | Quarterly |
| Audit log integrity check restore | Pre-launch | Semi-annual |
| Access review (RBAC + Secret Manager) | Pre-launch | Quarterly |
| Incident response tabletop | Pre-launch | Semi-annual |
| Two-person approval workflow | Activates with A-13 | Per-event |
| Retention IaC + Object Lock dry-run | Pre-launch | On-change |
| Push fan-out load test | Phase-0 | On-significant-membership-growth |
| OCR accuracy regression | Phase-0 | On-bank-parser-addition |

Pattern is "first exercise + review cadence"; implementation calibrates within
the pattern, not against exact operational schedules.

### Integrity-check execution independence

Implementation must demonstrate the daily audit log integrity check executes
**independent of the primary runtime boundary** — a sole-engineer compromise of
the primary API runtime cannot suppress integrity-check execution or tamper
with its outputs. The architecture commits the property; the implementation
path (audit-mirror project, separate cron substrate, externally-triggered
check) is at the implementer's discretion with the choice documented in an ADR.

### Architecture corpus vs evidence corpus

| Corpus | Contains | Purpose |
|---|---|---|
| **Architecture corpus** | This document + ADRs + runbooks | Commitment + evolution record |
| **Evidence corpus** | Incident postmortems, deviation logs (Tier C exception authorizations under degraded-mode), exception authorizations (any departure from committed controls with reason + approval trail), quarterly access reviews | Audit-trail surface |

Both corpora are required for trust-grade audit; **neither substitutes for the
other.**

### Regulatory cross-reference table

Consolidated legal-review surface — pointer from regulatory requirement to
architectural locus:

| Requirement | Architecture locus |
|---|---|
| DPDPA — consent, data residency, breach reporting, grievance | §2.12 + §4.14 + §5.x + helpline module |
| CPA 2019 — appeal flow, no-judicial-challenge mitigation | FR-43A + appeal module |
| RBI / UPI — payment provider boundary | §4.x (payment subsystem) |
| ITA 2000 — digital records, audit trail | audit log subsystem |
| Trust law (state) | trust formation prerequisite in Launch Gates |

_Specific section anchors filled by final cross-reference pass during
architecture acceptance._

### Architecture Readiness Assessment

> **Executive summary.** The architectural design is complete; external
> validation + Phase-0 experiments + operational hires follow before serious
> build investment.

**Overall Status:** **ARCHITECTURE COMPLETE.**

Implementation readiness gated on:

- **Launch prerequisites** — Phase-0 P0-1 to P0-5 (UX §1), trust formation +
  legal registration (§9.2), regulatory surface sign-off (§4.14.1), A-13
  backup engineer retainer, DPDPA grievance officer designation, FR-43A
  external forum destination.
- **External validation** — Required reviewers (legal counsel, independent
  security architect, UX researcher); Recommended reviewers (DBA, SRE).
- **Phase-0 evidence** — PoC signal for the five named load-bearing
  assumptions.

**Confidence Level:**

- **High** (architecture coherence) — internally consistent; cross-step
  references resolve; uncompromisable subsystems are structurally protected;
  multi-round adversarial elicitation surfaced + resolved hidden assumptions.
- **Moderate** (delivery predictability) — solo-build cadence + unconfirmed
  A-13 + P0-3 scope-vs-cadence tension + uncalibrated PoC empirical evidence
  introduce real delivery uncertainty.

**Key strengths:**

- Three uncompromisable subsystems are structurally protected, not
  discipline-protected.
- Multi-tenant boundary surfaces at multiple layers (URL path, RLS, request
  context, ESLint).
- Trust-grade audit posture committed (hash chain + Object Retention Lock +
  cross-account separation + integrity-check execution independence).
- Decision Freeze + ADR evolution path prevents post-acceptance document churn.
- Owner / Support assignments on Launch Gate Risks eliminate single-threaded
  ambiguity.

**Areas for future enhancement:**

- Per-FR coverage audit at implementation time (currently cluster-level).
- Phase 2/3 Crowdfunding Module — boundary committed; implementation surface
  unscaffolded.
- Pariwar-Passport v1 data model anticipates v2 UI; refinement expected on UI
  feedback.
- Specific tool / version pinning across deferred-ADR commitments.
- DBA + SRE engagement recommendations strengthen v1 confidence; not
  Phase-1-blocking.

### Architecture Exit Criteria

The architecture is *complete* when:

- **Decisions frozen** — every load-bearing decision committed; alternatives
  considered + named + rejected with rationale.
- **Gaps categorized** — every known gap classified into the gap tiering
  (Architecture complete / Launch gated / Phase-2+ deferred).
- **Ownership defined** — every external API + external integration has a
  named monitoring owner (§3.10); every cross-cutting concern + uncompromisable
  subsystem has a directionally-clear home in the structure.

The architecture is **not** required to be complete only when:

- PoCs complete — empirical validation is a separate Phase-0 + Phase-1 surface.
- Implementation started — PR-1 / PR-2 / feature work is downstream.
- All ADRs written — many ADRs are deferred to implementation time per Step 5
  commitments.

The distinction matters: **completion is a commitment state, not an executed
state.** This Step 7 validation confirms commitment-state completeness.

### Implementation Handoff

**Implementer Guidelines:**

- Follow all architectural decisions exactly as documented across Steps 2–6.
- Use implementation patterns consistently (Step 5).
- Respect project structure and boundaries (Step 6).
- Refer to this document for all architectural questions; consult ADRs for
  evolution.

**PR-1 / PR-2 sequencing:**

- **PR-1** — mechanical bootstrap: monorepo skeleton, workspace topology, CI
  bones, no schema, no business logic. Ships immediately on architecture
  acceptance.
- **PR-2** — multi-tenant scaffolding + golden example claim feature. Depends
  on **early RLS PoC signal** (Pass or Partial).

**Signal ≠ production confidence.** Early PoC signal unblocks feature
commitment past PR-2; it does *not* unblock production traffic.
Production-readiness requires the full validation surface (Launch Gate
completion + external validation + control demonstration).

**PR-2 ADRs are transcription** of architectural decisions already documented
in Steps 2–6, not net-new architectural work. Implementation-time ADRs document
*new* choices at the moment they're made.

**Phase-0 / PR-2 documentation deliverables.** Committed documentation
artifacts (onboarding tour, ADRs, runbooks, escrow docs) are Phase-0 / PR-2
deliverables, not architecture-phase outputs. Architecture commits the
artifacts' existence + content shape; writing them is downstream.

### Decision Freeze

The architecture is **frozen** at the end of this workflow. Changes after PR-2
require an **ADR** — not retroactive edits to this document. Continuing the
elicitation pattern past architecture-phase completion creates churn; the
architecture serves as the immutable commitment baseline, and ADRs serve as the
evolution record. ADRs reference the architecture section(s) they modify and
document the decision in the ADR template format. **Decision-evolution is
healthy; document-rewriting is not.**

### Architecture sunset → maintenance mode

Architecture acceptance moves the document from **drafting mode** to
**maintenance mode**.

In maintenance mode:

- Changes flow through **ADRs**, not re-elicitation.
- The architecture document is the immutable commitment baseline; ADRs evolve
  it.
- Re-elicitation patterns (option 1–5, A/P/C menus) are not appropriate in
  maintenance mode.

**Architecture accepted → enters maintenance mode. Changes → ADR. Not
re-elicitation.**
