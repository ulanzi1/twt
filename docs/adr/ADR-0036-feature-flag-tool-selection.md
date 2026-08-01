# ADR-0036: Feature-flag tool selection — an in-house subsystem on TWT's primary transactional platform, no external flag service for v1

> **Status:** ratified
> **Date:** 2026-08-01 (date entered current status)
> **Author:** Solo Builder
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-08-01; logged in `.decision-log.md` Decision 2026-08-01-070

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

**An in-house feature-flag subsystem, integrated into TWT's primary transactional platform (Google
Cloud SQL for PostgreSQL) and evaluated in-process, is the appropriate solution for TWT's current
scale and governance requirements — avoiding an additional external feature-flag service for v1.**
This is a scale/governance-fit judgment, not a permanent rejection of external services as a
category, and not a decision that PostgreSQL itself is the defining technology: the subsystem lives
on the platform TWT already runs on, rather than introducing a new one.

This is a **selection**, not a deferral: the mechanism is built, shipped, and wired to a real consumer
at Story 10.8.

**Revisit trigger (Trustee Panel amendment, 2026-08-01):** this decision should be revisited if
future requirements materially exceed the in-house implementation's capabilities — named examples:
experimentation (multi-variate testing, statistical-significance tooling), multi-region operation,
large-scale percentage-based rollouts, or advanced analytics on flag exposure/outcome correlation.
None of these needs exists today; this is a forward-looking bound the Trustee Panel wants recorded
explicitly, not a current gap. (See also the engineering-level pivot triggers under `Consequences >
Migration / pivot path` below — that list names measured-scale/latency and multi-product-line
triggers; this one is the trustee-level policy criterion and supersedes neither.)

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
- **Consumer wired — ONE, precisely.** The FR-2 DigiLocker manual-fallback cutover
  (`apps/api/src/modules/kyc/manual-fallback-seam.ts`) is wired end-to-end and proven by a live
  per-tenant integration test. ⚠ `provider-registry.ts` reads the evaluator but is **INERT in every
  current deployment**: the read is gated behind `alternateProviderKey`, which no construction site
  sets, because the only other registered builder today is the FIXTURE provider and pointing a
  production provider flip at a test double is worse than an honestly-inert seam. So of the FOUR
  admitted behaviours, ONE has a live consumer and THREE do not (`kyc_provider_selection` inert;
  `wa_cost_optimization` and `telegram_mirror` registered but deliberately unwired per Decision 8).
  Re-trigger for the provider seam: the story that registers a real AR-43 second vendor must set
  `alternateProviderKey` and add the enabled-path test. **Trustee condition (2026-08-01, on
  Decision `2026-08-01-069`'s ratification):** `kyc_provider_selection`, `wa_cost_optimization`,
  and `telegram_mirror` remain explicitly marked **declared, not production-active** — in
  `governance_boundary.yaml`'s own rationale text, not only in this ADR — until each ships its
  first real consumer, and every future review (the quarterly flag-inventory audit, this ADR, the
  admission entries themselves) must keep distinguishing admitted capability from live production
  behaviour rather than letting the two blur.

### The capability bar (architecture L208-227), demonstrated against shipped code

⚠ **Scope of this table.** It demonstrates the SEVEN Item-9 properties. Architecture Cross-Cutting #15
commits two further behaviours that are NOT rows here and must not be read as covered by a 7/7 score:
**canary → graduated cohorts** (the ladder ships and is enforced, but graduated-cohort staging is only
as good as the cohort predicate, which is OR-only — see failure mode 5) and **automatic rollback on
error-rate spike** (knowingly NOT built — failure mode 1).

| # | Property (architecture L208-227) | How the shipped implementation demonstrates it |
|---|---|---|
| 1 | **Deterministic evaluation** — same cohort + same flag identity + same version yields the same result; reproducible for replay | `evaluateFlag(flagDoc, memberContext)` is pure: clause order is the only precedence source, no `Object.keys()`/`Map`/`Set` iteration decides the outcome, no clock, no randomness, no async. Time-windowing is split OUT into the version-in-force lookup (the `computeTicketSlaDueDates` split) precisely so the evaluator never takes a clock. Tested: 100 identical evaluations byte-identical, plus an input-non-mutation test and an interleaving test that would expose hidden state. |
| 2 | **Tenant isolation** — scoped by `pariwar_id`; cross-tenant leakage structurally impossible | RLS on `feature_flag_versions` with `ENABLE` + `FORCE`, Story-1.6 closed-failure predicates. Deliberately **asymmetric**: SELECT reads own-tenant rows `OR pariwar_id IS NULL` (the cross-readable global catalog), while INSERT/UPDATE have no null leg — a tenant can publish its own override but can never author or supersede a global row. Tested by a dedicated policy-regression spec (10 cases) covering pos/neg/withCheck/unset-scope **and** both global-row legs. |
| 3 | **Replay safety** — historical flag states queryable for past evaluations; changes carry version + effective-at | Immutable version rows: `(pariwar_id, flag_key, version)` is the replay pin and `flagVersionForVersion(...)` the reconstruction path. **Resolution rule (as shipped):** the version in force at an instant is the NEWEST row whose `effective_from <= at`, whose own window is then checked — NOT "the newest row still inside its window". The distinction is load-bearing: under the older rule a superseded version RESURRECTED when the version that superseded it left its own window (an open-ended `rollout` reappearing the moment a bounded `rolled_back` expired). An expired head now means *nothing persisted governs* — fall through to the next tier — never "try the previous version". Point-in-time replay is preserved and asserted together with non-resurrection in `registry.spec.ts`. ⚠ **Scheduled (future-dated) flips are NOT authorable** — `createFlagVersion` rejects `effective_from > now()`; a future-dated version deadlocked the rollback path, so scheduling was dropped rather than repaired (see Failure modes). History cannot be rewritten: 0087's append-only trigger rejects any UPDATE touching a column other than `superseded_by_version` (0089 EXTENDED it — the trigger enumerates its protected columns explicitly, so a new column is outside the guarantee until added there). Persisted rows start at 2, now enforced by migration 0088's `CHECK (version >= 2)` rather than by convention alone. ⚠ **Known limit:** version 1 is owned by a CODE CONSTANT with no window and no append-only trigger, so a flag that has never been flipped replays against today's constant, not a historical row. That is most flags today. |
| 4 | **Auditability** — every flag-state change emits a tamper-evident §1.5 audit line; inventory enumerable by Pariwar Admin and above; no concealed flags | Every flip runs under `audit.withCompensatingAudit` (ADR-0030): the intent line commits **first** — which is what produces the `auditId` threaded onto the row — so a flipped flag with no audit line is not reachable. `rationale` is REQUIRED and non-empty at the wire, the domain, and the UI (FR-58C, `prd.md:890`). Inventory: `GET /api/v1/global/feature-flags` + `GET /api/v1/p/:id/feature-flags` behind `feature_flag.view` (granted to `pariwar_admin` + `auditor`), rendered by `apps/admin/src/modules/feature-flags/`. **No concealed flags is structural, not promised:** the listing iterates the CODE REGISTRY rather than existing rows, so a never-flipped flag still appears; and there is no `hidden`/`internal`/`visibility` field anywhere in the schema, the contract, or the UI — the contract test asserts `.strict()` rejects one. **Chain coverage, precisely:** `requestPayloadHash` is a canonical-JSON (RFC 8785) digest over the full flip input INCLUDING the `rationale` — added in review after the digest was found to omit the one field FR-58C names, while the surrounding prose claimed it was covered. `resourceLocator` carries the flag KEY only and CANNOT carry the version: under ADR-0030 the intent line commits BEFORE the insert, so at hash time the version does not exist; the `auditId` anchor ties line to row. The flipping admin's `users.display_name` is SNAPSHOT onto the row (migration 0089, never refreshed, never backfilled) so attribution survives a rename or a deleted account; `actorRole` is currently `null`, a repo-wide gap recorded in `deferred-work.md`. ⚠ **Attestation correction of record:** `kyc_manual_fallback`'s `fallback_default` shipped as `true` with a capability-bar rationale asserting that value meant "fallback AVAILABLE". It did not — the flag is named for the CUTOVER, so `true` traced through the seam's `!decision.enabled` to the manual CTA being HIDDEN, i.e. an unevaluable cohort rule made KYC HARD-MANDATORY, the exact outcome the attestation said was impossible. Corrected to `false`; the attestation this ADR carries is of the CORRECTED text (`.decision-log.md` 2026-08-01-069 item 3). |
| — | *Inverse of "no concealed flags", stated* | The listing iterates the CODE REGISTRY, so a registered-but-never-flipped flag always appears — that closes registry-not-in-DB. The INVERSE is open by the same design: a persisted `feature_flag_versions` row whose `flag_key` is absent from the registry is invisible to the inventory, and no FK can bind a table to a TypeScript constant. Leg (a) asserts registry ≡ allowlist, not registry ≡ persisted rows. In practice `createFlagVersion` rejects an unregistered key, so such a row requires a direct service-pool write — but "structural" is the wrong word for a property with an unmonitored inverse. |
| 5 | **Offline resilience** — evaluation continues under provider outage with a documented per-flag fallback default, part of the flag's lifecycle metadata | Demonstrated as a DEGRADATION LADDER, each rung shipped and tested. (i) The lookup is cache-optional/correctness-mandatory (Story 4.8 posture): a cache miss, expiry, or error degrades to a direct read, never to a wrong answer. (ii) A malformed or unevaluable cohort rule resolves to the flag's typed per-flag `fallback_default` (NOT NULL column) with a `malformed_clause_fallback` reason — the evaluator never throws into a member request path, guaranteed by shape guards and asserted by eight hostile-document cases. (iii) A flag-SUBSYSTEM failure (the Postgres read itself erroring or timing out) is caught at the consumer seam and degrades to the deployment's config floor, with the failure OBSERVED via an `onError` sink rather than silently swallowed. ⚠ **On that config floor, explicitly:** the deepest fallback is `config.digilocker.manualFallbackEnabled`, and this ADR's Context condemns "a config edit, an environment variable" as the un-audited behaviour change the capability bar exists to prevent. These are different acts. The bar governs a config EDIT used to change behaviour in place of an audited flip; this is a config value READ as a floor when the flag subsystem has said nothing at all. The floor cannot express a cohort, is not per-tenant, and changing it is a deploy — so it cannot substitute for a flip. ⚠ **Honest limit:** an in-house selection cannot demonstrate third-party-outage resilience, because the store IS the database — if Postgres is unreachable the request has already failed for other reasons. What is demonstrated is that no flag-subsystem fault can make the KYC surface HARDER, which is the property that actually protects members. |
| 6 | **Lifecycle accountability** — named owner + expected-retirement signal + dead-by date | `owner` and `dead_by` are both NOT NULL columns and both REQUIRED on the flip contract; the registry's code defaults carry them too, and a unit test asserts every registered flag has both. Rendered in the admin inventory so the quarterly inventory audit (architecture L4094-4098) has a surface to read. |
| 7 | **DPDPA-compatible posture** — India residency honored; flag evaluation does not require PII outbound | Evaluation is a pure in-process function over rows in the tenant's own Postgres. **No member attribute ever leaves the process**, let alone the country — there is no network call in the evaluation path at all. This is the property that most strongly argued against a SaaS vendor: a hosted evaluator would necessarily receive district/block/lifecycle-state/cohort-tag attributes on every evaluation. |

### The governance-boundary invariant (the part with no vendor equivalent)

`epics.md:3516-3522` requires that a flag cannot bypass audit, consent, validity, RBAC, a CI gate,
the canonical-financial-truth fence, or an architectural freeze-table row. Story 10.8 mechanizes this
in the `governance-boundary` CI gate, in two legs:

- **(a) Conformance** — the domain flag registry and `governance_boundary.yaml` admit exactly the same
  keys, in both directions, with a `count` cross-check. *This leg is bookkeeping in the sense that it
  proves nothing about BYPASS* — it is green the moment it lands and stays green while someone adds a
  flag read inside the RBAC module. It is not worthless: because it asserts equivalence in BOTH
  directions, neither the registry nor the bar can move without the other, which is what stops a key
  being added to code without an attested entry. `.decision-log.md` describes it in those terms; both
  readings are correct and this is the reconciliation.
- **(b) Source scan** — **the load-bearing leg.** A TypeScript-AST scan proves no feature-flag
  evaluation is NAMED inside a governance module, across five independent detection routes (module
  specifier, including a non-literal dynamic import; named symbol including aliases; `featureFlags.*`
  property and computed access, which catches `import * as domain from '@twt/domain'`; namespace
  re-export; and object-binding destructuring). Routes 4 and 5 were added after routes 1-3 were each
  independently defeated in review — `const { evaluateFlag } = await import('@twt/domain')` cleared
  all three at once. Scanned roots are the **twelve** in the bar's own `prohibited` list, read from
  it so the scan scope and the documented prohibitions cannot drift apart. Two anti-vacuity teeth: a
  root that does not resolve to a directory FAILS the gate (it used to report `clean (0 files)`), and
  a scan reading zero files overall FAILS.

⚠ **What leg (b) does and does not guarantee.** It closes every SYNTACTIC route by which a file can
name the evaluation surface, so a violation cannot be committed by accident or a casual edit. It does
**not** cover TRANSITIVE reachability: a per-file scanner resolves no module specifiers and follows no
import edges, so a governance module importing an innocent helper that itself imports the evaluator is
not detected. An earlier draft of this ADR, the gate's own source, and the gate inventory all said
"structurally impossible"; that overstated the mechanism and is retracted wherever it appeared.

Prohibition (e) — "never alter an architectural freeze-table row" — is checked at *admission*: the
bar parser rejects an `allow` entry naming a frozen behaviour, citing the freeze row
(`epics.md:510-543`). ⚠ **State its strength honestly:** that check is a non-exhaustive SUBSTRING
heuristic over a hand-maintained marker list, and it carries no marker for freeze row 13 or row 4 —
the two rows all four shipped entries actually cite. It catches the plausible naming attempts; it is
not freeze-table enforcement, and should not be read as such. (The `pool` and `claim` scan roots added
in review DO give prohibition (e) an import surface for the deterministic-assignment and money
modules, so the "no import to scan for" framing no longer holds in general either.)

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
- **Performance — NOT MEASURED.** The design reasons for sub-millisecond resolution are real: one
  indexed row from a table with tens of rows, memoized per process behind a 5s TTL, no network hop in
  the evaluation path. ⚠ But **NFR-FR58C's `< 5 ms` is asserted, not measured** — no p95 benchmark
  exists for flag resolution, and this is the ONE property in this ADR with no citable evidence while
  every other cites a named test. An earlier draft said "comfortably inside"; that is a claim a
  trustee cannot check. Re-trigger: the AI-4-1/AI-4-2 measured-validation family, where p95 evidence
  for this repo belongs — a flag-resolution bench should land there rather than be bolted on.
- **Cost.** Zero incremental — no per-seat or per-MAU vendor fee, no additional service to host.
- **Governance controls shipped AFTER this ADR was first drafted**, listed so the record is not read
  against a superseded implementation: the AC7 legal-transition ladder
  (`LEGAL_FLAG_STATE_TRANSITIONS`); an optional `Idempotency-Key` on both flip routes, so a retried
  flip cannot create a second identical version; migration **0088**'s six CHECK constraints (including
  the `version >= 2` that property 3 now relies on, plus rationale/owner/window/cohort-shape guards);
  migration **0089**'s `actor_display` snapshot column and its EXTENDED immutability trigger; typed
  HTTP mappings for every domain error the write path raises (four previously surfaced as anonymous
  500s); and production observers for the AC5c access observation at both wired consumers.
- **The admission workflow's own first use did not follow it.** The bar shipped with four seeded
  `allow` entries and no `.decision-log.md` attestation; the record was written retroactively
  (2026-08-01-069) and is **author-committed, with trustee ratification pending**. The workflow
  described above is the standing control; it is not yet a control with a clean history. Stated here
  because a reader of this ADR alone would otherwise conclude the bar has never been expanded without
  trustee sign-off, and the opposite is true for all four current entries.
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
  4. **THREE of the FOUR admitted behaviours have no live consumer.** `wa_cost_optimization` and
     `telegram_mirror` are registered and attested but deliberately unwired (Decision 8), returning
     their fail-safe defaults; `kyc_provider_selection` reads the evaluator but is INERT because
     `alternateProviderKey` is set nowhere (see Decision). Only `kyc_manual_fallback` is live. All
     recorded in `deferred-work.md`. *Revisit trigger:* each seam's own named consumer story.
  5. **Cohort clauses are OR-ONLY.** Values are ORed within a clause and clauses are first-match, so
     there is no conjunction: the canonical staged-rollout cohort "district = patna AND role = member"
     cannot be authored at all. The workaround is a `cohort_tag` precomputed OUTSIDE the flag
     document, which relocates cohort logic away from the audited, replayable record. Decision 5's
     text says "ANDed within a clause"; that is not what shipped. *Revisit trigger:* the first cohort
     that genuinely needs two dimensions at once — extend the clause shape, never encode a compound
     key into a `values` string.
  6. **Scheduled (future-dated) flips are dropped, not merely unimplemented.** A future-dated version
     deadlocked the rollback path — the effective-from ordering guard then rejected every later flip,
     including the audited rollback that failure mode 1 names as the entire shipped mechanism — and
     the pending row could be neither amended (append-only trigger) nor deleted (no DELETE grant).
     *Revisit trigger:* a real operational need for a pre-announced flip window, built together with
     a cancel path for pending versions.
  7. **The version-history read has no cursor.** It is bounded at 100 rows and now reports `has_more`
     honestly, but a tenant whose interleaved global+override history exceeds that is reliably TOLD
     its provenance is incomplete with no mechanism to page. *Revisit trigger:* the first flag whose
     history exceeds 100 versions in any tenant.
  8. **The staged-rollout ladder constrains operators.** `off → canary → rollout → full` is ENFORCED
     with no rung skipped, `rolled_back` is unreachable from `off`, and a rolled-back flag re-enters
     only at `off` or `canary`. Identity transitions stay legal (that is how lifecycle metadata is
     edited). This is deliberate staging discipline, but it means an operator cannot kill-switch a
     flag straight to `full`, and a flag at `off` cannot be "rolled back".
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

## Ratification (2026-08-01)

Ratified by ≥2 trustees (Dhiraj Rahul + Kalpana Bharti) at the 2026-08-01 Trustee Panel session;
logged in `.decision-log.md` Decision `2026-08-01-070`. Consent sheet:
`docs/knowledge-transfer/adr-ratification-consent-sheet-2026-08-01.md`.

**Scope of what is ratified, stated explicitly per the panel's own framing:** the Trustee Panel
affirms the architectural decision to implement feature flags in-house using the governance
controls described in this ADR. **Ratification does not certify that every admitted capability
is currently active in production, nor does it waive any of the accepted limitations listed
under Consequences ("Failure modes accepted") or surfaced in the consent sheet's Read-first
priority section.** Those stand as recorded — ratifying the control does not retroactively
resolve them.

**Three amendments adopted in-session and applied to this ADR:**

1. **Decision framing softened from a vendor rejection to a scale/governance-fit judgment with
   named revisit triggers.** The Decision section previously opened with "No third-party
   feature-flag vendor is adopted for v1" as the headline framing. The panel asked for this
   reframed as: *"An in-house implementation is the appropriate solution for the current scale
   and governance requirements of TWT. The decision should be revisited if future requirements
   (e.g. experimentation, multi-region operation, large-scale percentage rollouts, or advanced
   analytics) materially exceed the capabilities of the in-house implementation."* Applied verbatim
   in substance — see the `## Decision` section above, which now leads with the scale/governance-fit
   framing and names the four trustee revisit triggers explicitly, alongside (not replacing) the
   pre-existing engineering-level pivot triggers under `Consequences > Migration / pivot path`.
2. **"Postgres-backed" reframed as "integrated into TWT's primary transactional platform" so the
   decision does not read as a PostgreSQL selection.** The panel's concern: "in-house,
   Postgres-backed feature-flag system" can sound like PostgreSQL was chosen as the defining
   technology, when the substance is that the subsystem lives on the platform TWT already runs
   (Google Cloud SQL for PostgreSQL) rather than introducing a new external service. Applied to the
   title, the `## Decision` section, and mirrored in `docs/knowledge-transfer/adr-index.md`'s
   Section A row for this ADR.
3. **"Declared, not production-active" is now the explicit standing label for the three
   no-live-consumer admissions.** This was the Trustee Panel's ratification condition on the
   coupled Decision `2026-08-01-069` (the capability-bar admission batch), carried into this ADR
   because the distinction matters wherever the four admitted behaviours are described. Applied to
   the `Consumer wired` bullet in `## Decision` above, and — the durable enforcement point — to
   `governance_boundary.yaml`'s own `rationale` text for `kyc_provider_selection`,
   `wa_cost_optimization`, and `telegram_mirror` (golden-hash-pinned in
   `packages/domain/tests/feature-flags/capability-bar.test.ts`, updated in the same change so the
   label cannot silently drift out of the attested artifact). The condition binds going forward:
   each label lifts only when that flag's first real consumer ships, and every future review
   (quarterly flag-inventory audit, this ADR, the admission entries themselves) must keep
   distinguishing admitted capability from live production behaviour.

No other amendments; the seven-property capability-bar demonstration, the governance-boundary
invariant, and the eight accepted failure modes are ratified as shipped and documented.

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-08-01 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-08-01 Trustee Panel session, with three in-session amendments applied (Decision framing softened to a scale/governance-fit judgment with named revisit triggers; "Postgres-backed" reframed as "integrated into TWT's primary transactional platform" to avoid reading as a PostgreSQL selection; "declared, not production-active" made the explicit standing label for the three no-live-consumer admissions, mirrored into `governance_boundary.yaml`'s rationale text). Ratification is scoped explicitly — does not certify every admitted capability is production-active, does not waive the accepted failure modes. `.decision-log.md` Decision `2026-08-01-070`; consent sheet `adr-ratification-consent-sheet-2026-08-01.md`. |
| 2026-07-31 | (initial draft) | Solo Builder | Authored under Story 10.8 (feature flags per cohort + capability bar + governance-boundary invariant) closure. |
