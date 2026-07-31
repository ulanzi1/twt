# ADR-0036: Feature-flag tool selection — in-house, Postgres-backed, no third-party flag vendor

> **Status:** drafted
> **Date:** 2026-07-31
> **Author:** Solo Builder
> **Ratifying trustees:** _(populated at `ratified` status)_

## Context

Architecture §Deferred Decisions L200-229 (Sprint Change Proposal Item 9) records feature-flag tool
selection as a **[P1] load-bearing dependency** for the DigiLocker-mandatory cutover (§2.8) and other
FR-58C-gated migrations. Per [[feedback_architecture_vs_adr_boundary]] the architecture already
committed the **properties** — Cross-Cutting #15 plus the seven-item capability bar at L208-227 — so
this ADR's job is to name the **control** and demonstrate those properties against shipped code, not
to restate the bar.

**Decision gate (L202-206):** selection must be operational *before* the first FR-58C-gated cohort
rollout; the canonical acceptance case is the DigiLocker-mandatory canary rollout (PRD A-4 timeline:
6–12 months post-launch).

**What forced the choice now.** Story 10.8 had to build the flag primitive to satisfy FR-58C, and a
primitive cannot be built without answering "backed by what?". Two additional constraints narrowed
the field before any vendor comparison began:

- **§1.4 commits Postgres-only** — no Redis, no additional datastore in v1.
- **DPDPA posture (L226-227)** — "flag evaluation does not require PII outbound." Any cohort
  predicate evaluated by a third party would carry member attributes (district, block, lifecycle
  state, cohort tags) across a residency boundary, on every evaluation.

**Risks of not deciding.** Launch-gate Row 12 (`docs/launch-gate-inventory/inventory-roster.md:177-183`)
records the predicate verbatim: if tool selection lags the first FR-58C-gated rollout, the
DigiLocker-mandatory migration "blocks or requires ad-hoc gating that violates Cross-Cutting #15's
visibility and no-secret-flags properties." Ad-hoc gating — a config edit, an environment variable, a
hardcoded tenant list — is exactly the un-audited, un-inventoried behaviour change the capability bar
exists to prevent.

**Risk of deciding wrong.** A feature flag is, by construction, a mechanism for changing production
behaviour *without a code review*. Selecting a tool that cannot be constrained would open a route
around every governance control this system has — audit, consent, validity, RBAC, the
canonical-financial-truth fence, and the CI gates themselves.

## Decision

**Feature flags are implemented in-house, backed by PostgreSQL, evaluated in-process. No third-party
feature-flag vendor is adopted for v1.**

This is a **selection**, not a deferral: the mechanism is built, shipped, and wired to a real consumer
at Story 10.8.

Load-bearing details:

- **Store** — `feature_flag_versions` (migration `0087_feature-flags.sql`): immutable, versioned,
  tenant-scoped, audit-anchored rows. A flip INSERTs a new version; prior rows are never mutated
  except a `superseded_by_version` forward-pointer, enforced by a DB trigger.
- **Not** a sixth event-derived-state primitive. A flag's `state` is an authored attribute of a
  version row, not a projection of an external event stream (Story 10.8 Decision 3).
- **Evaluation** — `packages/domain/src/feature-flags/evaluate.ts`: a pure, synchronous, first-match
  resolver over an explicitly-ordered clause array. No clock, no I/O, no randomness, no mutable state,
  and it never throws into a caller's request path.
- **Cohort predicate** — a *bounded declarative form*: a flat array of
  `{ dimension, op: 'in'|'eq', values[] }` over a fixed six-value dimension enum matching FR-58C's
  stated gating axes. Explicitly **not** an expression language (Decision 5).
- **Caching** — Story 4.8's cache *invariants*, not its machinery: a short-TTL in-process snapshot of
  the lookup only, with the access/audit layer outside the cached core.
- **Governance** — the capability bar is `governance_boundary.yaml` at the repo root, enforced by the
  `governance-boundary` CI gate (`scripts/governance-boundary/`).
- **Consumer wired** — the FR-2 DigiLocker cutover (`apps/api/src/modules/kyc/manual-fallback-seam.ts`
  + `provider-registry.ts`).

### The capability bar (architecture L208-227), demonstrated against shipped code

| # | Property (architecture L208-227) | How the shipped implementation demonstrates it |
|---|---|---|
| 1 | **Deterministic evaluation** — same cohort + same flag identity + same version yields the same result; reproducible for replay | `evaluateFlag(flagDoc, memberContext)` is pure: clause order is the only precedence source, no `Object.keys()`/`Map`/`Set` iteration decides the outcome, no clock, no randomness, no async. Time-windowing is split OUT into the version-in-force lookup (the `computeTicketSlaDueDates` split) precisely so the evaluator never takes a clock. Tested: 100 identical evaluations byte-identical, plus an input-non-mutation test and an interleaving test that would expose hidden state. |
| 2 | **Tenant isolation** — scoped by `pariwar_id`; cross-tenant leakage structurally impossible | RLS on `feature_flag_versions` with `ENABLE` + `FORCE`, Story-1.6 closed-failure predicates. Deliberately **asymmetric**: SELECT reads own-tenant rows `OR pariwar_id IS NULL` (the cross-readable global catalog), while INSERT/UPDATE have no null leg — a tenant can publish its own override but can never author or supersede a global row. Tested by a dedicated policy-regression spec (10 cases) covering pos/neg/withCheck/unset-scope **and** both global-row legs. |
| 3 | **Replay safety** — historical flag states queryable for past evaluations; changes carry version + effective-at | Immutable version rows: `(pariwar_id, flag_key, version)` is the replay pin, `effective_from`/`effective_until` the window, `flagVersionForVersion(...)` the reconstruction path. History cannot be rewritten — migration 0087's append-only trigger rejects any UPDATE touching a column other than `superseded_by_version`, and that is tested. Version 1 is owned by a code constant, so persisted rows start at 2 and the pin is unambiguous with no extra version-id column. |
| 4 | **Auditability** — every flag-state change emits a tamper-evident §1.5 audit line; inventory enumerable by Pariwar Admin and above; no concealed flags | Every flip runs under `audit.withCompensatingAudit` (ADR-0030): the intent line commits **first** — which is what produces the `auditId` threaded onto the row — so a flipped flag with no audit line is not reachable. `rationale` is REQUIRED and non-empty at the wire, the domain, and the UI (FR-58C, `prd.md:890`). Inventory: `GET /api/v1/global/feature-flags` + `GET /api/v1/p/:id/feature-flags` behind `feature_flag.view` (granted to `pariwar_admin` + `auditor`), rendered by `apps/admin/src/modules/feature-flags/`. **No concealed flags is structural, not promised:** the listing iterates the CODE REGISTRY rather than existing rows, so a never-flipped flag still appears; and there is no `hidden`/`internal`/`visibility` field anywhere in the schema, the contract, or the UI — the contract test asserts `.strict()` rejects one. |
| 5 | **Offline resilience** — evaluation continues under provider outage with a documented per-flag fallback default, part of the flag's lifecycle metadata | `fallback_default` is a NOT NULL per-flag column. Evaluation is in-process against local Postgres rows, so there is no external provider to be outaged by. An unknown dimension/op resolves to `fallback_default` with a typed `malformed_clause_fallback` reason rather than throwing. The wired consumer degrades one step further: a flag-subsystem failure falls back to `config.digilocker.manualFallbackEnabled`. |
| 6 | **Lifecycle accountability** — named owner + expected-retirement signal + dead-by date | `owner` and `dead_by` are both NOT NULL columns and both REQUIRED on the flip contract; the registry's code defaults carry them too, and a unit test asserts every registered flag has both. Rendered in the admin inventory so the quarterly inventory audit (architecture L4094-4098) has a surface to read. |
| 7 | **DPDPA-compatible posture** — India residency honored; flag evaluation does not require PII outbound | Evaluation is a pure in-process function over rows in the tenant's own Postgres. **No member attribute ever leaves the process**, let alone the country — there is no network call in the evaluation path at all. This is the property that most strongly argued against a SaaS vendor: a hosted evaluator would necessarily receive district/block/lifecycle-state/cohort-tag attributes on every evaluation. |

### The governance-boundary invariant (the part with no vendor equivalent)

`epics.md:3516-3522` requires that a flag cannot bypass audit, consent, validity, RBAC, a CI gate,
the canonical-financial-truth fence, or an architectural freeze-table row. Story 10.8 mechanizes this
in the `governance-boundary` CI gate, in two legs:

- **(a) Conformance** — the domain flag registry and `governance_boundary.yaml` admit exactly the same
  keys, in both directions, with a `count` cross-check. *This leg is bookkeeping.*
- **(b) Source scan** — **the load-bearing leg.** A TypeScript-AST scan proves no feature-flag
  evaluation reaches inside a governance module, across three independent detection routes (module
  specifier; named symbol including aliases; `featureFlags.*` property access, which catches
  `import * as domain from '@twt/domain'`). Scanned roots are read from the bar's own `prohibited`
  list so the scan scope and the documented prohibitions cannot drift apart.

Prohibition (e) — "never alter an architectural freeze-table row" — has no import to scan for, so it
is enforced at *admission*: the bar parser rejects an `allow` entry naming a frozen behaviour, citing
the freeze row (`epics.md:510-543`).

Both legs ship with revert-sanity negative controls, and both were proven to **fail** against real
planted violations during development (a `domain.featureFlags` reference in
`packages/domain/src/rbac/permissions.ts`; an orphaned bar entry). A gate that cannot be made to fail
has no teeth.

### Admission workflow (the bar cannot be silently expanded — `epics.md:3521`)

Adding a flag-toggleable behaviour requires, in a single reviewed change: trustee attestation
(recorded in `.decision-log.md`); an `allow` entry `{ kind, artifact, rationale, adr }` where the
rationale states what is toggled *and why it is safe to toggle without a code review*; a `count` bump
in the same commit; and a matching registry key with a named owner and dead-by date. The gate asserts
registry ≡ allowlist both ways, so neither half can move alone.

## Alternatives considered

- **A hosted SaaS flag vendor (LaunchDarkly, Unleash Cloud, Flagsmith Cloud, Split, etc.)** — **Rejected**
  on the capability bar itself, not on cost. Property 7 (DPDPA) is the decisive one: a hosted evaluator
  receives the cohort attributes on every evaluation, which is PII outbound across a residency boundary
  as a matter of course rather than as an incident. Property 2 (tenant isolation "structurally
  impossible") would become a vendor configuration rather than a database-enforced predicate we can
  write a regression test against. Property 4's audit line would have to be reconstructed from a vendor
  webhook rather than being the §1.5 hash chain. And the governance-boundary invariant has no vendor
  equivalent at all — no SaaS flag product can enforce "this flag may not be read inside the RBAC
  module", because that is a property of *our* source tree. **Residual risk / revisit trigger:** if flag
  volume or cohort complexity ever outgrows an in-process evaluator, revisit — but any successor must
  still satisfy properties 2, 4, and 7, which is a high bar for a hosted product.
- **Self-hosted Unleash (or equivalent OSS server)** — **Rejected** on §1.4 (Postgres-only; no
  additional datastore or service in v1) and on operational surface: it adds a service to run, patch,
  back up, and monitor, in exchange for a UI and an SDK we would still have to wrap to satisfy the
  governance boundary. The residency and audit-chain problems of the SaaS option are solved by
  self-hosting, but the "another moving part in the deployment" cost is real for a Solo Builder.
  **Revisit trigger:** if a second product line needs flags with an independent operator UI.
- **Redis-backed flags with a Postgres source of truth** — **Rejected** on §1.4 (no Redis in v1). Also
  unnecessary: a flag lookup is one indexed row from a table with tens of rows, already sub-millisecond
  against the NFR-FR58C `< 5 ms` budget.
- **Cloning Story 4.8's full cache substrate** (`member_validity_cache` + `cohort_invalidation_epochs`
  + the `events_log` AFTER-INSERT trigger) — **Deferred, not rejected.** 4.8's machinery exists because
  a validity recompute is expensive over a large rule registry; a flag lookup is not. Story 10.8 adopts
  4.8's *invariants* (cache-optional/correctness-mandatory; best-effort non-blocking writes; audit
  OUTSIDE the cached core) with a short-TTL in-process snapshot instead. **Revisit trigger:** a measured
  `< 5 ms` p95 risk.
- **A general-purpose expression language for cohorts** (JSONLogic, a mini-DSL, or anything `eval`-backed)
  — **Rejected.** It makes determinism unprovable, makes a rule un-reviewable in a trustee-attested PR,
  executes data as code, and needs its own parser plus fuzz surface. The niyamavali engine's rule applies
  here too: interpret DATA, never hardcode logic — but the data's *shape* must be bounded.
- **Making feature flags a sixth event-derived-state primitive** (projector-only `current_state` + DB
  trigger + a dedicated state-invariant CI gate) — **Rejected** as cost with no property gain. The five
  existing state primitives carry that machinery because an *external* event stream moves their state and
  a writer could diverge from the projector; nothing outside the admin write path ever moves a flag.
  Story 10.1 made the identical split correctly: its *tickets* are event-derived-state, its
  *routing-policy registry* is versioned-immutable-rows. A flag is the registry, not the ticket. Adding a
  sixth state gate would also dilute what the five existing gates signal.

## Consequences

- **Operational.** No vendor onboarding, no vendor account, no vendor outage in the KYC path. The
  admin console (`/p/:pariwarId/feature-flags`) is the operator surface; a flip is one audited write.
  The quarterly flag-inventory audit (architecture L4094-4098) reads the `owner` / `dead_by` columns.
  New obligation: a **short-TTL propagation window** — an in-process snapshot means a flip becomes
  visible everywhere within `FLAG_CACHE_TTL_MS` (5s), not instantly. This is bounded, documented, and
  the reason the TTL is short; an operator watching for their own flip should expect seconds.
- **Security.** No new vendor-trust dependency and no new network egress (architecture §2.1
  threat-actor inventory is unchanged). The genuinely new surface is the flag mechanism *itself* — a
  route to change production behaviour without a code review — which is why the governance-boundary
  gate exists and why the write key (`feature_flag.flip`) is narrower than the read key
  (`feature_flag.view`). `district_admin` is deliberately granted **neither**: both gates check at the
  `pariwar` dimension and a district-ceiling grant can never satisfy a pariwar-dimension check, so
  granting it would seed an inert capability that reads as authority.
- **Performance.** One indexed row read, memoized per process behind a 5s TTL. Comfortably inside
  NFR-FR58C's `< 5 ms`. No network hop in the evaluation path.
- **Cost.** Zero incremental — no per-seat or per-MAU vendor fee, no additional service to host.
- **Failure modes accepted.**
  1. **AR-64's automatic error-spike rollback is NOT built.** Story 10.8 ships the five-state machine
     and an audited **manual** `rolled_back` flip that takes effect on the next evaluation with zero
     consumer code change. The automatic detector is declared absent (`FlagHealthSignal` →
     `{ available: false }`) because **no error-rate metrics substrate exists in this repo** and AR-31's
     observability vendor is itself a deferred ADR. Building a synthetic error-rate pipeline inside a
     feature-flag story would be inventing a producer to satisfy a consumer, and a fake signal that
     auto-flips production behaviour is worse than an honest absence. **This is a knowing partial
     delivery of AR-64**, recorded as such in `deferred-work.md` and tied to the AR-31 observability
     story as its re-trigger. It is not closed.
  2. **Up-to-5-second flip propagation** (above).
  3. **Boolean cohort predicate.** It can select between two providers but cannot name one among
     three; a third KYC provider requires extending the predicate with a value channel, in its own
     reviewed story.
  4. **Two of three consumer seams are registered but unwired** (`wa_cost_optimization`,
     `telegram_mirror`) — attested in the bar so the behaviour is governed, but returning their
     fail-safe defaults. Recorded in `deferred-work.md`.
- **Migration / pivot path.** The evaluator, the store, and the transport contract are separate
  modules. A pivot to a hosted or self-hosted vendor would: (1) keep `packages/contracts/src/feature-flags/`
  as the wire contract; (2) replace `registry.ts`'s lookup with the vendor client, keeping
  `evaluate.ts` for local determinism or delegating it; (3) **retain the governance-boundary gate
  unchanged** — it scans our source tree, not the flag backend, so it survives any substrate pivot;
  (4) supersede this ADR. Trigger conditions: a measured latency or scale problem, or a second product
  line needing an independent operator UI. Any successor must still demonstrate properties 2, 4, and 7.

## References

- [Source: architecture.md §Deferred Decisions, lines 200-229] — the [P1] selection slot + the
  seven-property capability bar this ADR is measured against
- [Source: architecture.md §Cross-Cutting Concerns #15, lines 325-326] — canary → graduated cohorts +
  automatic rollback on error-rate spike; inventory visible; no secret flags
- [Source: architecture.md §Test + flag governance, lines 4094-4098] — per-flag named owner +
  expected-retirement signal + dead-by date; quarterly inventory audit
- [Source: architecture.md §1.4] — Postgres-only, no Redis
- [Source: architecture.md §1.10, lines 1047-1086] — the Story 4.8 cache posture this narrows to its
  invariants
- [Source: architecture.md, line 4570] — the `packages/platform-adapters` client-SDK mapping (deferred;
  no client consumer exists)
- [Source: sprint-change-proposal-2026-05-27.md, lines 747-809 (Item 9)] — the capability bar's origin
  + the decision gate + the Gap Analysis escalation path
- [Source: prds/prd-TWT-2026-05-22/prd.md §4, lines 884-892 (FR-58C)] — gating axes; DigiLocker as the
  canonical use case; audit with actor + rationale; deterministic + `< 5 ms`; inventory visible to
  Pariwar Admin and above; no secret flags
- [Source: epics.md, Story 10.8, lines 3501-3522] — the owning Story; the governance-boundary invariant
  + the `governance_boundary.yaml` CI-test AC + the trustee-attested-PR clause
- [Source: epics.md, lines 510-543] — the Architectural Freeze Boundaries table prohibition (e) protects
  (freeze row 13 explicitly contemplates provider-implementation fluidity via this flag)
- [Source: epics.md, line 4423 (Story 14.7c)] — the dual-content ADR obligation: what is flag-toggleable
  + the governance-boundary invariant + vendor selection criteria
- [Source: `docs/launch-gate-inventory/inventory-roster.md`, lines 177-183] — Row 12, the conditional
  escalation this ADR dispositions
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row for this ADR
- [Source: `scripts/governance-boundary/README.md`] — the gate this ADR's governance section describes
