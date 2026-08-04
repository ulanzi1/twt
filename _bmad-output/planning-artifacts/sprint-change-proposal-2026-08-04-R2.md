# Sprint Change Proposal — Contribution-Governance Fact Producer (Epic 10)

**Date:** 2026-08-04
**Author:** BigDev (via `bmad-correct-course`)
**Trigger story:** 10.11 — Trustee-Lite List + Signals `[SURFACE]`
**Baseline:** `main` @ `db95327`
**Scope classification:** **Moderate** — backlog reorganization (three new stories), one PRD amendment, one epic correction
**Status:** Proposed — awaiting approval

> Distinct from `sprint-change-proposal-2026-08-04.md` (the moderation-model correct-course, PR #162), which
> this proposal builds on. That one created Stories 10.16–10.23; this one addresses a gap that surfaced
> while authoring 10.11 against it.

---

## Section 1 — Issue Summary

**The `contribution.*` fact producer that Story 4.2 deferred to "Epic 8/9" was never built, and both epics
have since closed `done` with retrospectives.** R7 contribution-discipline is therefore structurally
un-evaluated in production: no R7 violation can be detected, and no member's completion of an R7
restoration package can be observed by any surface.

### Evidence

| Claim | Source |
|---|---|
| The payload hardcodes the unavailable sentinel | `packages/validity-service/src/payload.ts:294` — `contributionHistorySummary: CONTRIBUTION_UNAVAILABLE` |
| R7/R8 are omitted from the clause list until a producer lands | `packages/validity-service/src/types.ts:53-65` — sentinel carries `producer: 'epic-8-9'` |
| The engine reads facts and never derives them | `packages/niyamavali-engine/src/r7-ladder.ts:51` |
| The seven fact keys | `r7-ladder.ts:61-77` (`R7_CONTRIBUTION_FACT_KEYS`) |
| Epics 8 and 9 are closed | `sprint-status.yaml` — all 13 + 12 stories `done`, both retrospectives `done` |

### Why it survived two rounds of governance review

**Two distinct producers were conflated, and the deferral note does not distinguish them.** The
`contribution.confirmed` **event** producer *was* built — two live emitters today
(`apps/jobs/src/matcher/matcher-worker.ts:325`, `apps/api/src/modules/reconciliation-review/handlers.ts:308`).
The **fact** producer — mapping those events into the seven `contribution.*` keys the engine consumes — was
not. Nothing maps one to the other; `assemblePayload` has no contribution input at all. So "did Epic 9
produce contribution facts?" reads *yes* for events and *no* for facts.

**Compounding it: the deferral named an epic, and epics carry no acceptance criteria.** All 13 Epic 8
stories and all 12 Epic 9 stories were checked — none is the fact producer. With no story to own it, both
epics closed cleanly and the pointer expired unowned.

Neither the 2026-08-04 decision brief nor the moderation change proposal caught it; both assumed R7
evaluation worked. The brief's §2.2 diagnosed the *roster* blockage (→ Story 10.17), which is a different
defect. **Even after 10.17 unblocks the roster, nothing observes the cure.**

---

## Section 2 — Impact Analysis

### Epic impact

Epic 10 completes as planned; three stories append at its tail. No epic is invalidated, obsoleted or
resequenced. The Epic 10 sequencing recorded at `db95327` (10.16 → 10.17 → 10.11) is unaffected — Story
10.17 is independent of the producer, deriving `is_assignable` from lifecycle state and `moderationStatus`
only (`epics.md:3695`), with zero `contribution.*` facts.

### Story impact

| Story | Impact |
|---|---|
| 10.11 | Ships degraded per ratified D1-B; lights up with zero file changes when 10.24 lands. Not blocked. |
| 10.16 | AC1's restoration-package count has the same missing source. Cites D1-B; must not re-litigate it. |
| 10.23 | Now a **joint** dependency for R7(A)/(B) activation — supplies `member.joining_discipline_state`. |
| 10.24–10.26 | New. |

### Artifact conflicts

**PRD — action needed.** `prd.md:339` FR-9 was amended 2026-08-04 to disclaim `total_count < 10` and
`ever_contributed == false` as *"implementation proxies, not the constitutional definitions,"* holding that
R7(A)/(B) apply only while joining discipline is incomplete. The seeded clause payloads still encode the
proxies (`packages/domain/seed/niyamavali-v1-clauses.sql:38,236`). **Supplying those two facts would not
make R7(A)/(B) correct — it would make them confidently wrong**, which is worse than dark. The amendment
states the position in prose but binds no testable consequence, so nothing currently stops an implementer
from wiring the proxies and declaring the clauses done.

**Epics — action needed.** `epics.md:3578` credits the violator mechanism to *"Story 10.17's D1 surfacing
mechanism."* Story 10.17 as authored is entirely about `is_assignable`; the decision brief (`:795-797`)
assigns the mechanism to 10.11, whose scope table already claims it.

**Architecture — no conflict.** `architecture.md:1150` references R7 only to tag it `pool`-mechanism. No
invariant, component boundary, data model or contract is touched. Consistent with the property-driven
substrate discipline: the architecture commits the seam, not the producer.

**UI/UX — no conflict.** No surface changes. Stories 10.11 and 10.16 already carry degraded-state copy.

**Other artifacts — action needed.** Two code comments predate Epic 9's matcher and now assert the
opposite of the truth (`packages/contracts/src/contributions/pool-contributor-list.ts:7`,
`packages/domain/src/index.ts:166`).

### Technical impact

**Substrate assessment, corrected against live source:**

| Fact | Source status |
|---|---|
| `total_count` | Derivable (confirmed minus reversed). **No viable existing read** — see below. |
| `ever_contributed` | Derivable — `total_count > 0`. |
| `months_since_last` | Derivable. Calendar-correct per AI-3-1: `date_trunc`/`interval`, never fixed-ms spans. |
| `skips_current_year` | Derivable from pool snapshots' `member_assignments` (`pool/snapshot.ts:105`) ∩ confirmed verdicts. Expensive, not absent. |
| `in_lapse` | Derivable, but the definition of "lapse" is a policy decision. |
| `r7a_restorations_used` | **No accounting exists.** Nothing records an R7(A) restoration as *consumed*. |
| `personal_event_excuse_claimed` | **No assertion path exists.** |

**`listMemberContributionHistory` (`domain/src/contribution/history.ts:276`) is not a viable source.** It
anchors on `contribution.utr-attested` (yellow) rather than confirmation, joins verdicts only for per-row
status, and caps **both** of its queries at 500 rows. A lifetime `total_count` derived from it would be
wrong for a high-count member and blind to any confirmation without a member attestation. The pool-scoped
reads (`listConfirmedContributorsForPool`, `hasConfirmedContribution`) are the wrong axis.

**This forces a projection, not a read.** FR-12A commits p95 < 200ms at 4L scale with ≤60s freshness. A
per-evaluation `events_log` scan across a member's lifetime cannot hold that budget, so the producer is a
derived read model — materially larger than "map events to facts."

**Blast radius.** Wiring into `assemblePayload` changes **every** validity payload hash, which propagates to
the Story 4.8 cache epochs and the Story 7.4 assignment version pin. Never a side-quest.

---

## Section 3 — Recommended Approach

**Selected: Option 1 — Direct Adjustment.** Effort **High**, risk **Medium**, no timeline impact to the
current sequence.

**Option 2 (Rollback) — not viable.** There is nothing to roll back. The gap is an absence, not a defect;
no completed work is wrong, only incomplete.

**Option 3 (MVP review) — not viable.** R7(A)–(G) is FR-9, core scope carried verbatim from TSCT. It is not
available to cut, and the Niyamavali describes it as live governance.

### The decomposition principle

**This decomposition follows governance ownership rather than implementation convenience: projection facts,
restoration accounting, and member assertions evolve independently and therefore remain independently
story-owned.**

That is why there are three stories and not one. Restoration accounting shares a data source with the
projection facts but answers to a different governance instrument (Story 10.23's restoration discipline),
and a member assertion is a member-facing act rather than a derived fact. Collapsing them would couple
three independently-amendable governance surfaces to a single story's release.

### Per-clause activation

Each R7 sub-clause activates as its facts land, rather than the family waiting on the slowest one:

| Clause | Gates on | Activated by |
|---|---|---|
| R7(C), (D), (E), (F) | gap / skip counts | **10.24** |
| R7(A), (B) | joining discipline + restoration cap | **10.23 + 10.25**, jointly |
| R7(G) | asserted personal-event excuse | **10.26** |

Clauses whose facts are absent stay **omitted** from `applicable_niyamavali_clauses[]` — the established
honest-sentinel discipline. An omitted clause is honest; a clause evaluated from disclaimed proxies is a
wrong eligibility answer on a real member's record.

---

## Section 4 — Detailed Change Proposals

### 4.1 — Epics: three new stories (`epics.md`, appended after Story 10.23)

**Story 10.24: Contribution-Fact Producer — Projection + R7(C)–(F) Activation `[PRIMITIVE]`**

> As the Niyamavali engine evaluating contribution discipline, I want the seven `contribution.*` facts
> supplied from real event history, so that R7 stops being structurally un-evaluated in production.
>
> **Boundary.** This story produces governance facts only. It does not define governance policy,
> restoration accounting, or member assertions.
>
> **Given** FR-12A's p95 < 200ms at 4L scale and freshness ≤ 60s
> **Then** the facts come from a **projection**, not a per-evaluation `events_log` scan — no existing read
> is a viable source (`listMemberContributionHistory` caps both queries at 500 rows and anchors on
> attestation, not confirmation)
>
> **Given** AI-3-1 (calendar-correct derivation is the producer's job)
> **Then** `months_since_last` uses `date_trunc`/`interval`, never fixed-ms spans
>
> **Given** the 2026-08-04 FR-9 amendment
> **Then** this story supplies `total_count`, `ever_contributed`, `months_since_last`,
> `skips_current_year`, `in_lapse` and activates **R7(C), (D), (E), (F) only**. R7(A)/(B) remain omitted
> from `applicableNiyamavaliClauses[]` with an explicit hold citing `member.joining_discipline_state`
> (Story 10.23) — supplying the proxies would make them *confidently wrong*
>
> **Given** `skips_current_year` needs per-cycle assignment
> **Then** it derives from pool snapshots' `member_assignments` (`pool/snapshot.ts:105`) ∩
> confirmed-minus-reversed verdicts; "missed" means assigned-at-freeze with no live confirmation at close
>
> **Given** wiring into `assemblePayload` changes **every** validity payload hash
> **Then** the story explicitly discharges the Story 4.8 cache-epoch bump and the Story 7.4 assignment
> version pin, and pins byte-identical re-spawn from a frozen `committed_at`
>
> **Depends on:** none. **Blocks:** R7(A)/(B) activation.

**Story 10.25: R7(A) Restoration Accounting `[PRIMITIVE]`**

> Supplies `contribution.r7a_restorations_used` — the lifetime count of consumed R7(A) one-time
> restorations (cap 2). No event records a restoration as *consumed* today; this story defines that
> instrument. Couples to Story 10.23's restoration-discipline overlay — same instrument, separate expiry.
> Activates R7(A) **jointly with** 10.23's `joining_discipline_state`.
>
> **Depends on:** 10.23, 10.24.

**Story 10.26: R7(G) Personal-Event Excuse Assertion `[SURFACE]`**

> Supplies `contribution.personal_event_excuse_claimed`. Per FR-9 the rule is **declarative — personal
> events do not excuse skips** — so this is not an excuse-granting flow. It records that an excuse was
> *asserted* so R7(G) can fire and explain, in the member's own record, why it does not apply.
> Detection-and-explanation, never a waiver path.
>
> **Depends on:** 10.24.

### 4.2 — Epics: mis-attribution correction (`epics.md:3578`)

**OLD:** `… and **moderation violator flags (Story 10.17's D1 surfacing mechanism)**`

**NEW:** `… and **moderation violator flags — the surfacing mechanism is implemented by this story (10.11);
the contribution-governance fact source is Story 10.24. Until Story 10.24 lands, this section renders
`detection_unavailable` per D1-B rather than implying no violations exist**`

*Rationale:* Story 10.17 contains no violator surfacing. The correction also moves the fact-source pointer
and the degraded-state requirement into the epic, so D1-B no longer lives only inside a story file — the
exact failure mode this proposal exists to close.

### 4.3 — PRD: bind the FR-9 amendment to the fact contract

**Artifact:** `prds/prd-TWT-2026-05-22/prd.md`, FR-9 (`:339`) — new **first** bullet under
**Consequences (testable):**

> - **R7(A) and R7(B) MUST NOT be evaluated from the `contribution.total_count < 10` /
>   `contribution.ever_contributed == false` proxies alone.** The 2026-08-04 amendment above disclaims them
>   as constitutional definitions, so until `member.joining_discipline_state` is **produced by the validity
>   payload** both clauses remain **omitted** from `applicable_niyamavali_clauses[]`. An omitted clause is
>   honest; a clause evaluated from a proxy this PRD has already disclaimed produces a *wrong eligibility
>   answer on a real member's record*, which is the worse failure. R7(C)–(G) gate on gap, skip and excuse
>   facts rather than joining discipline and are unaffected by this constraint — though R7(G) remains
>   un-evaluated for a separate reason, its own fact source. **This requirement is normative: future
>   implementations MUST NOT substitute alternative proxy populations without a corresponding Part 11
>   amendment.**

*Deliberately out of scope:* the seeded clause payloads stay as shipped —
`niyamavali-v1-clauses.sql:38,236` already carry `policy_review_required: true` and `provisional: true`,
the registry's own honest marker, and re-tuning seed data is a registry amendment rather than a PRD edit.
The PRD also does not specify how joining-discipline state is derived; that is Story 10.23's.

### 4.4 — Sprint status (`sprint-status.yaml`)

Three keys appended to the Epic 10 block, after `10-23-restoration-discipline-lock-in` and before
`epic-10-retrospective` (which stays last so the retro cannot be picked up before the epic's stories):

```yaml
  10-24-contribution-fact-producer-projection-r7-cf-activation: backlog
  10-25-r7a-restoration-accounting: backlog
  10-26-r7g-personal-event-excuse-assertion: backlog
```

Plus a `2026-08-04c` ledger entry recording: the contribution-governance fact producer gap and why it
survived; the three-way split and its per-clause activation rule; the FR-9 proxy finding and the resulting
R7(A)/(B) hold on 10.23; the corrected substrate assessment; the projection requirement; and the
payload-hash blast radius. No status flips on any existing key.

### 4.5 — Code documentation

**`packages/contracts/src/contributions/pool-contributor-list.ts:7-8`**

**OLD:** `it reads `contribution.confirmed` event-derived state (Epic 9's producer, unbuilt → honestly EMPTY today) and renders it`

**NEW:** `it reads `contribution.confirmed` event-derived state (produced by the Epic 9 matcher since Story 9.4 — this list is live, not structurally empty) and renders it`

**`packages/domain/src/index.ts:166-167`**

**OLD:** `Sources EXCLUSIVELY from `contribution.confirmed` event-derived state (Epic 9's producer, unbuilt → honestly empty today) + the pure pending-aggregate.`

**NEW:** `Sources EXCLUSIVELY from `contribution.confirmed` event-derived state (live since Story 9.4's
matcher). **Note the two distinct producers:** the `contribution.confirmed` EVENT producer exists; the
contribution-*fact* producer that supplies `contribution.*` keys to the validity payload does not — that is
Story 10.24, which is why R7 contribution-discipline clauses remain only partially evaluable despite Epic
9's completed contribution matcher.`

---

## Section 5 — Implementation Handoff

**Scope classification: Moderate** — backlog reorganization with a PRD amendment. Not Minor (it adds
stories and amends a normative requirement); not Major (no replan, no architecture change, no MVP impact).

| Deliverable | Owner | Timing |
|---|---|---|
| §4.1 three story bodies in `epics.md` | PO / DEV | With this proposal |
| §4.2 mis-attribution correction | PO / DEV | With this proposal |
| §4.3 FR-9 normative consequence | PO / DEV | With this proposal |
| §4.4 sprint-status keys + ledger | PO / DEV | With this proposal |
| §4.5 code comments | DEV | **Independent — executable now**, does not wait on 10.24 |
| Story 10.24 authoring | `bmad-create-story 10.24` | After 10.16 → 10.17 → 10.11 |

**MVP impact: none.** FR-9 remains in scope and unreduced. What changes is that its implementation
dependency is now explicit and owned rather than implicit and unowned.

### Success criteria

1. `epics.md` carries three stories with acceptance criteria — the deferral is attached to a story, not an epic.
2. FR-9 carries a testable consequence that fails a proxy-wired implementation.
3. `epics.md:3578` sends a reader to the story that actually implements violator surfacing.
4. `sprint-status.yaml` parses clean; three new `backlog` keys; no existing key flipped.
5. Neither stale comment survives.
6. When 10.24 lands, R7(C)–(F) evaluate and R7(A)/(B)/(G) remain **explicitly** held with named blockers
   **until their governing facts become available; no implementation may substitute proxy populations or
   silently evaluate them.**

### Standing risk, recorded not resolved

Until 10.24 lands, R7 remains un-evaluated. Trustees cannot detect contribution-discipline violations, and
a member who completes a restoration package has no system-observable path to having that recognised. This
proposal does not fix that; it makes it owned, sequenced and visible. Stories 10.11 and 10.16
**intentionally degrade under ratified decision D1-B rather than presenting incomplete governance
information as complete.**
