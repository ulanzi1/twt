# Niyamavali → FR Mapping

The canonical specification → implementation cross-walk from each Niyamavali clause (R-N) to the Functional Requirements (FR-NNN) that implement / enforce it, plus the owning epics, Stories, and architecture anchors.

Authority: PRD §1 (Niyamavali clauses) + PRD §4.2 (Rules Engine FRs) + architecture §1.14 (Member Lifecycle State Model) + architecture §1.7 + §1.10 (rule registry storage + caching) + epics.md Epic 2 (Niyamavali publishing + public trust identity) + epics.md Epic 3 (Member identity + lifecycle) + epics.md Epic 4 (Niyamavali rules engine + member validity service). Story 0.5 Task 3 authors this cross-walk; substantive rule-registry implementation lives in Story 2.3 + Epic 4.

## Mapping discipline

This table is a **cross-walk**, not a re-statement. The PRD §1 + §4.2 is the canonical source for Niyamavali clauses + FRs; architecture is the canonical source for the §1.14 state machine + FR provenance; epics.md is the canonical source for owning Story keys. **Silent duplication is forbidden** — if a clause excerpt diverges from PRD §4.2, that is a framework gap (raise as Open Question; do NOT silently re-author the clause text).

The single permitted duplication is the Account State Machine extract section below (verbatim transcription of architecture §1.14 lines 1238-1246), documented as a deliberate exception per `docs/knowledge-transfer/README.md` §4 invariant 1.

## Status legend (`current_status` column)

| Status | Meaning |
|---|---|
| `spec-only` | The clause is specified in PRD + epics; no implementation has shipped. **Dominant state at Story 0.5 author-commit (no Epic 1-14 Story has closed).** |
| `in-implementation` | At least one implementing FR's owning Story is `in-progress`. |
| `partially-implemented` | At least one implementing FR has shipped to production; the full clause coverage is not yet complete. |
| `fully-implemented` | All implementing FRs have shipped and the clause is operationally enforced via the rule registry. |

The status flip discipline (when a row flips from one status to the next) is operations-policy territory per `docs/knowledge-transfer/README.md` §8 Open ADR slots. Story 0.5 commits the schema; the per-flip threshold is deferred.

## Status summary as of Story 0.5 Task 3 author-commit (2026-05-30)

| Status | Row count |
|---|---|
| `spec-only` | 14 (all rows) |
| `in-implementation` | 0 |
| `partially-implemented` | 0 |
| `fully-implemented` | 0 |
| **Total** | **14** |

## Forbidden-removal rule

Rows are **never removed**. Supersession is the only allowed lifecycle exit. A clause that is amended by Trustee Panel ratification under FR-7 (the rule-registry amendment workflow) is **superseded** in this table with a cross-link to the amended row; the prior row is preserved as the Niyamavali-evolution record.

A new row is added via a `.decision-log.md` `[CONTINUITY]` entry under the owning Story's authority OR under operations-policy authority; row additions are append-only.

---

## Primary mapping table — Niyamavali clause → implementing FRs

| Niyamavali clause | Clause summary | Implementing FRs | Owning epic | Owning Story keys (sprint-status) | Architecture anchor | Current status | Notes |
|---|---|---|---|---|---|---|---|
| **R5(C.2)** | Actual cause of death governs eligibility, not honestly-declared pre-existing illness (e.g., declared kidney patient who dies in a road accident → eligible as accident death) | FR-7, FR-11, FR-12A | Epic 2 + Epic 4 + Epic 6 | `2-3-niyamavali-rule-registry-data-model-amendment-with-diff-storage` + `4-4-r5-r9-special-death-rules-r14-concealment-flagged-evaluation` + `4-6-fr-12a-member-validity-service` + `6-15-concealment-flagged-claim-path` | architecture.md §1.7 (rule registry storage) + §1.10 (validity cache) + epics.md Story 4.4 | `spec-only` | The R5(C.2) protection coexists with the R14-adapted concealment penalty (R5(C.2) protects honest disclosure; R14 targets concealment) — both clauses evaluated by the same rule engine |
| **R5(D)** | Core team has full discretion; no member has legal claim; commitment purely ethical | FR-7, FR-11 | Epic 4 + Epic 6 | `4-4-r5-r9-special-death-rules-r14-concealment-flagged-evaluation` + `6-14-r9-special-case-voting-walkthrough` | architecture.md §1.7 + Cross-Cutting #9 (staff-fallback at every node) | `spec-only` | R5(D) is the trustee-discretion clause; the rule registry captures the discretion-eligibility flag; substantive trustee voting flow lives in Story 6.14 |
| **R5(E)** | Multi-nominee 75/25 split (primary nominee receives 75%; secondary nominee receives 25%) | FR-4, FR-7 | Epic 3 + Epic 4 | `3-4-nominee-declaration-with-75-25-split` + `2-3-niyamavali-rule-registry-data-model-amendment-with-diff-storage` | architecture.md §1.7 (rule registry — 75/25 split stored as a per-Pariwar Niyamavali registry default) + epics.md Story 3.4 | `spec-only` | The 75/25 split is hardcoded as a Niyamavali rule-registry default; trustee amendment under FR-7 can revise the split per Pariwar |
| **R5(F)** | Special-death framing for non-illness deaths (accident / suicide / murder per Mar 2025 exclusions) | FR-11 | Epic 4 + Epic 6 | `4-4-r5-r9-special-death-rules-r14-concealment-flagged-evaluation` + `6-14-r9-special-case-voting-walkthrough` | architecture.md §1.7 + epics.md Story 4.4 | `spec-only` | Mar 2025 suicide / murder-with-nominee-accused exclusion is the load-bearing rule; concealment-penalty discipline applies for declared-illness fraud |
| **R7(A-G)** | Contribution discipline / restoration rules (R7(A) break before 10 contributions → 3-consecutive restore; R7(B) registered-but-never-contributed → 5-consecutive + 3-month lock-in; R7(C) long gap → new registration; R7(D-G) skip-based lock-in escalation) | FR-7, FR-9 | Epic 4 | `4-2-r7-contribution-discipline-rules` + `2-3-niyamavali-rule-registry-data-model-amendment-with-diff-storage` | architecture.md §1.7 + §1.10 + epics.md Story 4.2 | `spec-only` | R7 thresholds are `policy_review_required`-tagged in the registry per FR-9; Trustee Panel re-tunes thresholds ahead of year-2 lock-in graduation |
| **R8(A), R8(B)** | 90% Rule — R8(A) 1 skip/year permitted if prior compliance 100%; R8(B) mid-contribution-window death eligible | FR-7, FR-10 | Epic 4 | `4-3-r8-90-percent-rule` + `2-3-niyamavali-rule-registry-data-model-amendment-with-diff-storage` | architecture.md §1.7 + epics.md Story 4.3 | `spec-only` | R8 applies only to illness deaths (not accidents); threshold reviewed at 10/20/50 member milestones |
| **R9** | Controversial cases → core team voting workflow | FR-7, FR-11, FR-43 | Epic 4 + Epic 6 | `4-4-r5-r9-special-death-rules-r14-concealment-flagged-evaluation` + `6-14-r9-special-case-voting-walkthrough` | architecture.md §1.7 + Cross-Cutting #9 + epics.md Story 6.14 | `spec-only` | R9 special-case routing is a state-machine transition that surfaces in the verifier console (FR-42 signals panel) and triggers the voting workflow per Story 6.14 |
| **R9(A)** | Multiple deaths on same date → priority to higher support / contribution record | FR-7, FR-11 | Epic 4 | `4-4-r5-r9-special-death-rules-r14-concealment-flagged-evaluation` | architecture.md §1.7 + epics.md Story 4.4 | `spec-only` | R9(A) is a tie-breaker rule evaluated by the rule engine at multi-claim windows; outcome audit-logged per FR-47 |
| **R14-adapted** | Concealment penalty — if a member dies of an undeclared IMA-listed illness with reasonable causal link, the claim is flagged for State Trustee review with concealment recommendation (final denial requires explicit trustee action; never auto-denial) | FR-5, FR-7, FR-11, FR-43A | Epic 3 + Epic 4 + Epic 6 | `3-5-medical-disclosure-with-ima-list-concealment-denial-ack` + `4-4-r5-r9-special-death-rules-r14-concealment-flagged-evaluation` + `6-15-concealment-flagged-claim-path` + `6-16-3-stage-claim-denial-appeal-flow-reversed-denial-sahyog-vivran-publish-hook` | architecture.md §1.7 + epics.md Story 6.15 + 6.16 | `spec-only` | The TSCT R14 was originally about forged receipts; TWT extends the integrity-violation principle to declared-illness concealment. Concealment denial is never auto — always trustee action per UX Stance #5 (no punitive auto-action) |
| **Lock-in (TWT divergence)** | v1 launches at 30-day general-death lock-in; trustee-adjustable per FR-8 (member-count-driven ramp 1mo → 3mo → 6mo → 12mo); `lock_in_days_at_join` snapshot per member (no retroactive re-lock) | FR-3, FR-7, FR-8 | Epic 3 + Epic 4 | `3-7-lock-in-clock-widget-on-home-screen` + `4-2-r7-contribution-discipline-rules` + `2-3-niyamavali-rule-registry-data-model-amendment-with-diff-storage` | architecture.md §1.14 (member-state transitions) + epics.md Story 3.7 | `spec-only` | Lock-in duration is a Niyamavali clause `general_death_lock_in.days`, not a code constant; Trustee Panel amendment under FR-7 produces a diff document |
| **Annual renewal + 3-month grace** | Vyawastha Shulk annual renewal with 3-month grace; SIE non-punitive transition; reminder cadence | FR-1A, FR-7 | Epic 3 + Epic 4 | `3-8-annual-renewal-with-3-month-grace-vyawastha-shulk-status-payload-reminder-cadence` + `4-6-fr-12a-member-validity-service` | architecture.md §1.14 (active → active_in_grace → lapsed_unpaid transitions) | `spec-only` | Renewal-grace is a Niyamavali clause governing the `valid_through + 1 day → active_in_grace` transition; SIE driver in `apps/jobs/scheduler/` fires the transition per architecture §1.14 |
| **Retirement coverage extension** | After 5 years of valid membership, member retains +1 year post-retirement coverage; each additional 5 years adds +1 year (15 years → +3 years post-retirement) | FR-5, FR-7, FR-12 | Epic 4 | `4-5-fr-12-retirement-coverage-extension-computation` + `2-3-niyamavali-rule-registry-data-model-amendment-with-diff-storage` | architecture.md §1.7 + epics.md Story 4.5 | `spec-only` | Engine computes post-retirement coverage on-the-fly from `joined_at` + `retired_at` (when set); Retirement is a Life Event under FR-5 |
| **Member validity (canonical answer)** | "Is this member valid and active right now?" — real-time deterministic eligibility evaluation with rule-by-rule provenance | FR-7, FR-12A | Epic 4 | `4-1-rule-evaluation-engine-primitive` + `4-6-fr-12a-member-validity-service` + `4-7-member-status-panel-admin-member-facing-variants-compound-read-model` + `4-8-per-cohort-cache-invalidation-with-conservative-recompute-fallback` | architecture.md §1.7 + §1.10 (FR-12A validity service caching) + §1.14 (cache invalidation invariant) + epics.md Story 4.6 | `spec-only` | FR-12A is the canonical API surface; p95 < 200ms NFR; cache freshness invariant ≤ 60s; service is one of the three uncompromisable subsystems per PRD §9.1 |
| **Niyamavali amendment workflow** | Rule amendments require role `Pariwar Admin` or higher; produce a diff document; trigger notification to all affected members; every change audit-logged | FR-7, FR-44, FR-45, FR-46, FR-47 | Epic 1 + Epic 2 | `2-3-niyamavali-rule-registry-data-model-amendment-with-diff-storage` + `2-4-niyamavali-amendment-workflow-admin-ui-audit-logged-publish` + `2-5-public-astro-ssr-shell-foundation-niyamavali-public-render-with-version-diff` + `1-8-rbac-permission-keys-scope-dimensions-12-seeded-roles` + `1-10-tamper-evident-audit-log-hash-chain-6h-off-site-mirror` | architecture.md §1.5 (audit log) + §1.7 (rule registry) + §1.10 (cache invalidation on amendment) | `spec-only` | The amendment workflow is the canonical Niyamavali-evolution path; every amendment writes an audit-log line per FR-47; cache invalidates per FR-12A freshness invariant |

---

## Inverse-lookup section — FR → implementing Niyamavali clauses

The inverse view: an engineer reading an FR finds the Niyamavali clause(s) it implements.

| FR | FR summary | Implementing clauses | Owning epic | Owning Story keys |
|---|---|---|---|---|
| **FR-1** | Member signup with mandatory ₹110 Vyawastha Shulk | (Vyawastha Shulk policy — Niyamavali clause TBD per Trustee ratification; lock-in entry per R7) | Epic 3 | `3-6-signup-110-vyawastha-shulk-via-upi-intent-reference-code-lock-in-entry` |
| **FR-1A** | Annual Vyawastha Shulk renewal with 3-month grace | (Renewal-grace Niyamavali clause) | Epic 3 | `3-8-annual-renewal-with-3-month-grace-vyawastha-shulk-status-payload-reminder-cadence` |
| **FR-2** | DigiLocker KYC with manual fallback | (KYC-verification Niyamavali clause; honest-disclosure prerequisite for R5(C.2) protection) | Epic 3 | `3-3a-digilocker-provider-interface-abstraction` + `3-3b-digilocker-kyc-flow-in-signup-manual-fallback` |
| **FR-3** | Lock-in clock widget on home screen | Lock-in (TWT divergence) | Epic 3 | `3-7-lock-in-clock-widget-on-home-screen` |
| **FR-4** | Multi-nominee declaration with 75/25 split | R5(E) | Epic 3 | `3-4-nominee-declaration-with-75-25-split` |
| **FR-5** | Life Events panel (medical disclosure v1-M) | R14-adapted (medical-disclosure prerequisite); Retirement coverage extension (retirement as a Life Event) | Epic 3 | `3-5-medical-disclosure-with-ima-list-concealment-denial-ack` + `3-9-life-events-panel` |
| **FR-6** | Voluntary withdrawal flow | (Withdrawal Niyamavali clause; 110-forfeit + 12-month rejoin lock) | Epic 3 | `3-10-voluntary-withdrawal-flow-with-110-forfeit-12-month-rejoin-lock` |
| **FR-7** | Versioned per-Pariwar rule registry | All clauses (R5, R7, R8, R9, R14-adapted, Lock-in, Renewal-grace, Retirement, Amendment workflow) — FR-7 is the substrate | Epic 2 | `2-3-niyamavali-rule-registry-data-model-amendment-with-diff-storage` |
| **FR-8** | Lock-in policy — trustee-adjustable, member-count-driven ramp | Lock-in (TWT divergence) | Epic 4 | `4-2-r7-contribution-discipline-rules` (per Story 4.2 R7 implementation; lock-in registry-key is part of the same rule registry) |
| **FR-9** | Contribution discipline (R7 carry-over) | R7(A-G) | Epic 4 | `4-2-r7-contribution-discipline-rules` |
| **FR-10** | 90% Rule (R8) with R8(A), R8(B) sub-clauses | R8, R8(A), R8(B) | Epic 4 | `4-3-r8-90-percent-rule` |
| **FR-11** | Special death scenarios + concealment penalty | R5(C.2), R5(D), R5(E), R5(F), R9, R9(A), R14-adapted | Epic 4 | `4-4-r5-r9-special-death-rules-r14-concealment-flagged-evaluation` |
| **FR-12** | Retirement coverage extension | Retirement coverage extension | Epic 4 | `4-5-fr-12-retirement-coverage-extension-computation` |
| **FR-12A** | Member Validity Service (real-time eligibility evaluation) | Member validity (canonical answer) — composes all clauses | Epic 4 | `4-6-fr-12a-member-validity-service` |
| **FR-42** | Member status banner on claim review | R9 (verifier-console R9 routing); Member validity composition | Epic 6 | `6-10-verifier-console-signals-panel-cross-pariwar-scope-handling` |
| **FR-43** | Special-case routing per Niyamavali R9 | R9, R9(A) | Epic 6 | `6-14-r9-special-case-voting-walkthrough` |
| **FR-43A** | Internal claim-denial appeal flow | R14-adapted (concealment denial appeal path) | Epic 6 | `6-16-3-stage-claim-denial-appeal-flow-reversed-denial-sahyog-vivran-publish-hook` |
| **FR-47** | Audit log — attributable, tamper-evident, 7-year retention | Niyamavali amendment workflow (every amendment audit-logged) | Epic 1 | `1-10-tamper-evident-audit-log-hash-chain-6h-off-site-mirror` + `1-11a-audit-log-integrity-verification-primitive` + `1-11b-trustee-facing-audit-log-integrity-verification-ui` |
| **FR-79** | Niyamavali public render with version diff | Niyamavali amendment workflow (the public-facing diff surface) | Epic 2 | `2-5-public-astro-ssr-shell-foundation-niyamavali-public-render-with-version-diff` |
| **FR-94** | T&C version-pinned to Niyamavali | (T&C version-pin mechanism; cross-cuts every clause via Niyamavali version reference) | Epic 2 | `2-6-tc-version-pinning-mechanism-public-render` |

---

## Account State Machine extract — verbatim transcription

This section is the **single deliberate verbatim transcription** of architecture.md §1.14 lines 1238-1246, included here so an engineer reading the KT pack can find the load-bearing state-FR-trigger details without switching to architecture.md. Documented as a permitted exception per `docs/knowledge-transfer/README.md` §4 invariant 1.

[Source: `_bmad-output/planning-artifacts/architecture.md`, §1.14 lines 1238-1246]

| State | Enter from | Enter trigger | Exit trigger | FR |
|---|---|---|---|---|
| `pending-fee` | (signup begun) | UPI Intent created, payment not confirmed | Payment confirmed → `lock-in` | FR-1 |
| `lock-in` | `pending-fee` | First-payment confirmed | Lock-in period elapses → `pending-valid` or `active` | FR-1, FR-3 |
| `pending-valid` | `lock-in` | Lock-in elapsed AND DigiLocker unverified | Trustee approves manual KYC → `active` | FR-2 |
| `active` | `lock-in` (DigiLocker verified) OR `pending-valid` OR `active_in_grace` (on renewal) OR `lapsed_unpaid` (on renewal) | KYC verified AND fee paid AND not withdrawn | `valid_through + 1 day` → `active_in_grace`; OR member-initiated withdrawal → `withdrawn` | FR-1, FR-1A, FR-2 |
| `active_in_grace` | `active` | `valid_through + 1 day` | Renewal payment → `active`; OR grace period elapsed → `lapsed_unpaid` | FR-1A |
| `lapsed_unpaid` | `active_in_grace` | Grace period elapsed (per FR-1A) | Renewal payment → `active` (no re-lock-in) | FR-1A |
| `withdrawn` | `active` (or sub-states) | Member-initiated withdrawal | Re-signup allowed after lock period → `pending-fee` | FR-6 |

**Canonical home for the state machine code:** `packages/domain/member/state.ts` per architecture §1.14.

**Source-of-truth principle:** Member state is derived from event history per architecture §1.14 + Cross-Cutting #4 (Determinism & replay). Persisted state is an optimization only.

**Time-driven transitions** (per architecture §1.14 + Cross-Cutting #14 SIE):
- `lock-in` → `pending-valid` or `active` on lock-in expiry
- `active` → `active_in_grace` on `valid_through + 1 day`
- `active_in_grace` → `lapsed_unpaid` on grace expiry

SIE driver lives in `apps/jobs/scheduler/`; transition emission is idempotent and audit-logged per FR-47.

**Cache invalidation invariant** (per architecture §1.14 + §1.10): FR-12A validity-service caches invalidate on any member-state transition. Transition emission and cache-invalidation event are in the same transaction; consumers see a consistent view.

**Claim-filing concurrency** (per architecture §1.14 + Cross-Cutting #14 — non-punitive): If a claim is filed while the member is in `active_in_grace`, eligibility resolves against member-state at filing time. A subsequent `active_in_grace` → `lapsed_unpaid` transition does not retroactively invalidate a filed claim.

**Audit-log emission** (per architecture §1.14 + Cross-Cutting #2): Every member-state transition emits a structured event with `from_state`, `to_state`, `trigger`, `actor` (`member`, `system`, `trustee`), `timestamp`, and `pariwar_id`.

## References

- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md`, §4.1 (lines 216-308)] — FR-1 through FR-6 identity + lifecycle FRs
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md`, §4.2 (lines 309-435)] — FR-7 through FR-12A rule registry + validity service FRs; canonical R5/R7/R8/R9/R14-adapted clause definitions
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md`, §4.6 (lines 648-735)] — FR-42 + FR-43 + FR-43A claim + appeal FRs (R9 + R14-adapted consumers)
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md`, §4.7 (lines 736-895)] — FR-44 through FR-47 RBAC + audit log FRs
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §1.7 (lines 936-985)] — Per-tenant custom fields + rule registry storage
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §1.10 (lines 1040-1080)] — Three named caches (FR-12A validity service); cache freshness invariant
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §1.14 (lines 1217-1283)] — Member Lifecycle State Model — load-bearing state table + FR provenance + canonical-home + source-of-truth principle + time-driven transitions + cache invalidation invariant + claim-filing concurrency + audit-log emission
- [Source: `_bmad-output/planning-artifacts/epics.md`, Epic 2 (Story 2.3 + 2.4 + 2.5 + 2.6)] — Niyamavali publishing + amendment workflow + public render + T&C version-pin
- [Source: `_bmad-output/planning-artifacts/epics.md`, Epic 3 (Story 3.4 + 3.5 + 3.7 + 3.8 + 3.9 + 3.10)] — Member identity + lifecycle + nominee + medical disclosure + lock-in + renewal + Life Events + voluntary withdrawal
- [Source: `_bmad-output/planning-artifacts/epics.md`, Epic 4 (Story 4.1 + 4.2 + 4.3 + 4.4 + 4.5 + 4.6 + 4.7 + 4.8)] — Rule evaluation engine + R7/R8/R9/R14 + FR-12 retirement coverage + FR-12A validity service + read model + cache invalidation
- [Source: `_bmad-output/planning-artifacts/epics.md`, Epic 6 (Story 6.10 + 6.14 + 6.15 + 6.16)] — Verifier console signals + R9 voting + concealment-flagged claim path + denial appeal
- [Source: `docs/knowledge-transfer/README.md`] — KT pack framework + structural invariants
- [Source: `docs/knowledge-transfer/adr-index.md`] — `adr-index.md` Section A row `ADR-NNNN-feature-flag-tool-selection` + others affect rule-registry mechanism choices
- Memory: [[feedback_architecture_vs_prd_boundary]] — architecture commits state/transitions/events; PRD commits policy/eligibility/cadence
- Memory: [[feedback_closure_language_precision]] — `spec-only` is "Resolved via explicit deferral"; never collapsed with `fully-implemented`
