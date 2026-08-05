---
baseline_commit: 55aa1ccfa452b0c52b0dce325039a9a77c4492d0
---

# Story 10.24: Contribution-Fact Producer — Projection + R7(C)–(F) Activation `[PRIMITIVE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the Niyamavali engine evaluating contribution discipline,
I want the `contribution.*` facts supplied from real event history,
so that R7 stops being structurally un-evaluated in production.

---

## The gap this closes — recorded, because *how it survived* is the lesson

Story 4.2 deferred the `contribution.*` fact producer to **"Epic 8/9"**. Both epics closed `done`
with retrospectives. **Nothing was ever built**, because:

1. **Two producers were conflated.** The `contribution.confirmed` **EVENT** producer *was* built —
   Story 9.4's matcher, two live emitters today. The **FACT** producer — the thing that maps those
   events into the seven `contribution.*` keys `r7-ladder.ts:61-76` declares — was not. Nothing maps
   one to the other; `assemblePayload` has **no contribution input at all**.
2. **The deferral named an EPIC, and epics carry no acceptance criteria.** All 13 Epic 8 stories and
   all 12 Epic 9 stories were checked — none is the fact producer. With no story to own it, both
   epics closed cleanly and the pointer expired unowned.

Consequence, live at `55aa1cc`: **no R7 violation can be detected, and no member's completion of an
R7 restoration package can be observed by any surface.** Two shipped surfaces degrade honestly
rather than lie about it — Story 10.11's `detection_unavailable` and Story 10.16's
`package_unavailable`. **This story is the one that turns those lights on.**

[[project_r7_fact_producer_unbuilt]] · [[project_engine_never_infers_contribution_facts]] ·
`sprint-change-proposal-2026-08-04-R2.md`

---

## Boundary — read this before anything else

> **This story produces governance FACTS only. It does not define governance policy, restoration
> accounting, or member assertions.**

That sentence is from the epic and it is load-bearing three separate times in this file. The
temptation to "just also light up R7(A) / the restoration package count / R7(G)" is the single
biggest way this story goes wrong, and the PRD now makes one of those **normative and forbidden**
(`prd.md:346`).

### Per-clause activation — what lights up, what stays dark, and *why*

| Clause | Gates on | This story |
|---|---|---|
| **R7(C)** `months_since_last >= 12` | gap | ✅ **ACTIVATED** |
| **R7(D)** `total_count >= 10 && skips_current_year == 1` | skips | ✅ **ACTIVATED** |
| **R7(E)** `total_count >= 10 && skips_current_year >= 2` | skips | ✅ **ACTIVATED** |
| **R7(F)** `months_since_last >= 6` | gap | ✅ **ACTIVATED** |
| **R7(A)** `in_lapse && total_count < 10 && r7a_restorations_used < 2` | joining discipline **+** restoration cap | ⛔ **HELD** — needs `member.joining_discipline_state` (**10.23**) **and** `contribution.r7a_restorations_used` (**10.25**) |
| **R7(B)** `ever_contributed == false` | joining discipline | ⛔ **HELD** — needs `member.joining_discipline_state` (**10.23**) |
| **R7(G)** `personal_event_excuse_claimed == true` | member assertion | ⛔ **HELD** — needs the assertion path (**10.26**) |
| **R8** (`niy.ninety-percent-rule.r8`) | `claim.death_classification` + `contribution.compliance_percent` | ⛔ **NOT IN SCOPE** — see the trap below |

**⚠ The R8 trap.** `validity-service/src/types.ts:56-65` says *"R7/R8 are OMITTED … until the Epic
8/9 producer supplies real `contribution.*` facts."* Read literally, supplying facts activates R8
too. **It does not.** R8's `all_of` requires three conditions: `claim.death_classification` (a
**claim-time** fact, Epic 6, absent at member standing), `contribution.total_count >= 10`, **and**
`contribution.compliance_percent` — the last is **not one of the five facts this story supplies**.
`VALIDITY_RULE_ORDER` must **not** gain R8. Correct that comment in place (AC8) rather than leaving
the next reader to re-derive this.

**⚠ Supplying the R7(A)/(B) proxies is FORBIDDEN, normatively.** `prd.md:346` (added 2026-08-04, under the `:344` amendment):

> **R7(A) and R7(B) MUST NOT be evaluated from the `contribution.total_count < 10` /
> `contribution.ever_contributed == false` proxies alone.** … An omitted clause is honest; a clause
> evaluated from a proxy this PRD has already disclaimed produces a *wrong eligibility answer on a
> real member's record*, which is the worse failure. … **This requirement is normative: future
> implementations MUST NOT substitute alternative proxy populations without a corresponding Part 11
> amendment.**

You **do** supply `total_count`, `ever_contributed` and `in_lapse` as **facts** — they are honestly
derived and surfaces read them. What is forbidden is putting `r7-a` / `r7-b` into
`VALIDITY_RULE_ORDER`. Facts ≠ clause activation.

### In scope / out of scope

| In scope (10.24) | Out of scope → owning story / seam |
|---|---|
| **Two projection tables** + one hand-authored migration: the contribution ledger and the member↔pool assignment index. | A `contributions` transactional table, a new `contribution.*` event type, or any write to the event log. This story **produces no events**. |
| **The five facts** — `total_count`, `ever_contributed`, `months_since_last`, `skips_current_year`, `in_lapse` — derived **as-of a pinned instant**. | `r7a_restorations_used` (**10.25**) · `personal_event_excuse_claimed` (**10.26**) · `member.joining_discipline_state` (**10.23**) · `compliance_percent` (R8, unowned). |
| **An `ok` arm on `contributionHistorySummary`** carrying the fact map + `lapseSince`, beside the existing typed sentinel. | Removing the `producer_unavailable` sentinel. It stays reachable for genuine per-member gaps (D6). |
| **R7(C)/(D)/(E)/(F) into `VALIDITY_RULE_ORDER`**, contributing **only APPLIED clauses** to `applicableNiyamavaliClauses[]` (**D2 — the most dangerous decision in this story**). | R7(A)/(B)/(G), R8, and any change to `interpretClause` / `ladder.ts` mechanics. |
| **Flipping the ONE 10.11 seam call site** to `{ status: 'available', candidates }`. | Any edit to `packages/domain/src/trustee-lite/violator-flags.ts`. 10.11 proved that file needs **zero** changes; if it needs one, that is a **finding**. |
| **The 4.8 cache-epoch discharge** (deploy note + the 0036 trigger scope extension its own comment mandates) and the **7.4 version-pin discharge** (prove no bump needed, with a replay test). | Adding a payload-shape component to the Story 4.8 cache key. 10.17 D5 **explicitly rejected** this for a 60s transient; do not re-open it. |
| **Tier-2 sentinel reconciliation** — the `epic-8-9` → `story-10-24` rename 10.11 owed forward, and re-pointing 10.16's `package_unavailable` producer. | Lighting up 10.16's `restorationPackage: { status: 'ok' }` arm. That is **restoration accounting** — this story's boundary forbids it (D7). |
| **Re-measuring the FR-12A p95 evidence** through the existing `@twt/measured-validation` harness. | Building new measurement tooling. AI-6-2 committed to ONE shared harness — it exists ([[project_measured_validation_framework]]). |

---

## Acceptance Criteria

### AC1 — The facts come from a PROJECTION, and it is replay-correct

**Given** FR-12A commits **p95 < 200 ms at 4L** and **freshness ≤ 60 s** (`prd.md:430-431`)
**When** the facts are supplied
**Then** they come from a **projection**, never a per-evaluation `events_log` scan.

**No existing read is a viable source** — verify this rather than assume it:
- `listMemberContributionHistory` (`packages/domain/src/contribution/history.ts:276`) anchors on
  `contribution.utr-attested` (**yellow** — a member's *claim*), not confirmation, and caps **both**
  of its queries at **500 rows** (`:302`, `:348`). A lifetime `total_count` from it would be wrong
  for a high-count member and blind to any confirmation without a member attestation.
- `listConfirmedContributorsForPool` / `hasConfirmedContribution` (`contribution/read.ts`) are
  **pool-scoped** — the wrong axis.
- The only JSONB payload index that exists is `contribution_utr_attested_member_idx` (migration
  `0081`), which is **partial on `event_type = 'contribution.utr-attested'`** — it does **not** serve
  a `contribution.confirmed` member-scoped lookup. A member-scoped confirmed scan today is a
  full-tenant sequential scan.

**And** the projection is **as-of correct**: `deriveContributionFacts(..., at)` at a historical `at`
returns what was true at `at`, not what is true now. This is not optional polish —
`apps/jobs/src/assignable-roster.ts` calls `getValidityAt(..., committedAt)` for **every member of
every spawning cycle**, and Epic 4 commits *"Replayable for audit"* (`prd.md:425`). A now-only
producer would make every R7 finding non-reproducible on the surface that feeds a **suspension
decision**.

**And** — because this story ships **two** projection maintenance mechanisms (a trigger for the
ledger, an explicit writer for the assignments, **D3**) — **the two are observationally equivalent,
proven by an invariant test.** The mechanism is an implementation detail; the projected state is the
contract. One shared test body, run against both paths, asserting **atomicity · idempotency · replay
equivalence · ordering-independence**, plus the fact-level check that
`deriveContributionFacts` over the incrementally-maintained tables equals
`deriveContributionFacts` over the freshly-backfilled tables for the same `(member, at)`.
A disagreement there means one mechanism is wrong and every fact downstream is untrustworthy — a
**P0 finding**, not a tolerance. Full property table in **D3**.

### AC2 — `months_since_last` is calendar-correct (AI-3-1)

**Given** AI-3-1 — calendar-correct derivation is the **PRODUCER's** job, never the engine's, and
never fixed-ms spans
**Then** `months_since_last` uses `date_trunc` / `interval` (SQL) or the existing calendar helpers
(`packages/validity-service/src/calendar.ts`), **never** `* 24*60*60*1000` / `86400000`.

**And** a unit test pins the leap/month-boundary cases: 2024-01-31 → 2024-02-29 is **1** month, not
0 and not 2; a Feb-29 anchor evaluated on Feb-28 of a non-leap year does not off-by-one.

**And** the engine remains date-math-free — `r7-ladder.ts:57-58` is unchanged.

### AC3 — Exactly the five facts, and R7(C)/(D)/(E)/(F) activate — nothing else

**Given** the 2026-08-04 FR-9 amendment disclaiming `total_count < 10` / `ever_contributed == false`
as **implementation proxies, not constitutional definitions** (`prd.md:344-346`)
**Then** this story supplies **exactly** `contribution.total_count`,
`contribution.ever_contributed`, `contribution.months_since_last`,
`contribution.skips_current_year`, `contribution.in_lapse`
**And** activates **R7(C), (D), (E), (F) only.**

**And** R7(A) / R7(B) / R7(G) remain **omitted** from `applicableNiyamavaliClauses[]` under an
**explicit, mechanized hold** — not a comment:

```ts
/** R7 sub-clauses this story deliberately does NOT evaluate, each naming its blocking fact + owner. */
export const R7_HELD_CLAUSES = [
  { clauseId: 'niy.contribution-discipline.r7-a', blockedBy: ['member.joining_discipline_state', 'contribution.r7a_restorations_used'], owner: 'story-10.23 + story-10.25' },
  { clauseId: 'niy.contribution-discipline.r7-b', blockedBy: ['member.joining_discipline_state'],                                     owner: 'story-10.23' },
  { clauseId: 'niy.contribution-discipline.r7-g', blockedBy: ['contribution.personal_event_excuse_claimed'],                          owner: 'story-10.26' },
] as const;
```

**And** a **totality test** asserts `R7_ACTIVATED_CLAUSE_IDS ∪ R7_HELD_CLAUSES.clauseId ===
R7_CLAUSE_IDS` (the engine's canonical seven) with an **empty intersection**. A future R7 sub-clause
cannot be added without landing in exactly one bucket. This is the mechanized form of the PRD's
normative requirement — [[feedback_mechanization_split_commitment]]: the un-mechanized half is where
decay concentrates.

**And** a **revert-sanity probe** is run and recorded: adding `r7-a` to `R7_ACTIVATED_CLAUSE_IDS`
must fail the totality test **and** at least one behavioural test. A green scan proves nothing
([[feedback_gate_scope_semantic_coverage]]).

### AC4 — `skips_current_year` derives from assignment ∩ verdict

**Given** `skips_current_year` needs per-cycle assignment history
**Then** it derives from pool snapshots' `member_assignments`
(`packages/domain/src/pool/snapshot.ts:66-68`, `:105`) **∩** confirmed-minus-reversed verdicts
**And** *"missed"* means **assigned at freeze with no live confirmation at close**.

Precisely:
- **Assigned** — the member id appears in the pool's snapshot `member_assignments` (the persisted
  truth Story 7.6 already reads for VPA resolution; **never** a naive recompute of
  `assignMembersToPools`).
- **Live confirmation** — via the SHARED `hasLiveConfirmation` chain (`contribution/read.ts:88`),
  honouring `reconciliation.confirmation-reversed`. **Never a second definition of "confirmed"** —
  that is the exact drift class [[project_epic6_drizzle_correlated_subquery_bug]] warns about.
- **At close** — the cycle's alert reached a closed state (`isAlertClosedState`,
  `contribution/history.ts:95`). An **open** cycle is **never** a skip; a member mid-window has not
  missed anything. Reuse the predicate, do not re-spell the state strings.
- **Current year** — calendar year in **IST** at `at` (the tail-calendar convention, Story 8.9;
  [[project_calendar_aware_tail_not_window_extension]]), resolved with `date_trunc`, not
  `getFullYear()` on a UTC `Date`.

**And** a test proves each arm independently: assigned+confirmed → not a skip; assigned+reversed →
**is** a skip; assigned+cycle-still-open → not a skip; not-assigned → not a skip; assigned+mismatch
→ **is** a skip.

### AC5 — The payload gains an `ok` arm, and only APPLIED clauses reach the clause list

**Given** the shipped `deriveViolatorFlags` (`packages/domain/src/trustee-lite/violator-flags.ts`)
maps **every** R7 clause id it finds in `applicableNiyamavaliClauses[]` into a violator flag, with
**no `applied` check**
**Then** only clauses whose `on_pass` **fired** may enter `applicableNiyamavaliClauses[]` /
`provenanceTrace[]`.

**This is the highest-severity trap in the story.** `assembleClauses` (`payload.ts:246-277`) pushes
**every non-null slot**. Wire four R7 clauses as ordinary descriptors and every member in the
Pariwar acquires four violator flags with outcome `r7_not_applicable` — a **governance surface that
recommends suspending everyone**. See **D2** for the mechanism.

**And** `contributionHistorySummary` gains a discriminated `ok` arm carrying the fact map keyed by
the **dotted `R7_CONTRIBUTION_FACT_KEYS` values** (that is the shape `deriveViolatorFlags` already
filters on `startsWith('contribution.')`) plus `lapseSince`:

```ts
export interface ContributionHistoryAvailable {
  status: 'ok';
  /** Dotted `contribution.*` keys → values. Read by trustee-lite `factsEstablishing[]`. */
  facts: Readonly<Record<string, number | boolean>>;
  /** ISO-8601 onset of the current discipline lapse; null when not in lapse. Feeds `holdingSince`. */
  lapseSince: string | null;
  /** Facts this producer does NOT supply, each naming its owner — the honest hold, on the wire. */
  heldFacts: readonly { readonly key: string; readonly producer: string }[];
}
```

**And** the 10.11 seam flips at **exactly one call site** —
`apps/api/src/modules/trustee-lite/handlers.ts:237-240`, from
`{ status: 'unavailable', producer: … }` to `{ status: 'available', candidates }`.
`violator-flags.ts` is **not edited**.

**And** `holdingSince` is populated from `lapseSince` and is asserted **≠ `evaluatedAt`** — 10.11
pinned that distinction deliberately (*"the clause applies as of this evaluation"* and *"the member
has been in violation since this date"* are different claims on a suspension surface).

### AC6 — The blast radius is discharged: cache epoch, version pin, wire, deploy

Wiring into `assemblePayload` changes **every** validity payload hash. Four consequences, each
discharged explicitly:

**(a) Story 4.8 cache epoch.** The cache key (`validity-cache/store.ts:83-99`) is
`(member_id, member_state_hash, rule_registry_version, cohort_epoch)`. `member_state_hash` is the
max `event_version` on the **member's own stream** — and `contribution.confirmed` rides the **ALERT**
stream, so a confirmation **does not shift the key**. Freshness therefore rests entirely on the 60 s
TTL, which does satisfy FR-12A — but migration `0036:88-90` states in its own comment:

> *"FUTURE validity-relevant event families (`claim.*`, `contribution.*` — Epic 6/8/9 producers)
> **MUST extend this WHEN scope** when they land."*

**That obligation lands here.** Add a second AFTER-INSERT trigger on `events_log` for the
contribution/reconciliation families that deletes the member's cache rows keyed on
`payload->>'memberId'` (the existing trigger's `member_id = NEW.stream_id` is **wrong** for these
families — the stream is the alert). Test it: append a `contribution.confirmed` → the member's cache
row is gone in the same transaction.

**(b) Deploy window (10.17 D5 recurrence, accepted — not a defect).** For ≤ 60 s after rollout, a
warm pre-deploy `member_validity_cache` row holds the **old-shaped** JSONB, and
`fastify-type-provider-zod` parses the response against a `.strict()` DTO → a possible **500**.
Bound: `VALIDITY_CACHE_TTL_SECONDS = 60`. Zero-window lever, documented as a deploy step:
`POST /api/v1/p/:pariwarId/admin/validity-cache/invalidate-all`
(`apps/api/src/modules/member-validity/routes.ts:68` → `validityCache.invalidateAllForPariwar`).
**Explicitly REJECTED, do not re-open:** adding a payload-shape/version component to the frozen 4.8
cache key (10.17 D5 rejected it by name for exactly this transient).

**(c) Story 7.4 assignment version pin — do NOT bump.** `POOL_ASSIGNMENT_HASH_VERSION`
(`pool/assign.ts:55`) gates `{ hash fn, truncation width, delimiter, balancing rule }`. The roster
reads **`payload.isAssignable` and nothing else** (`assignable-roster.ts`, AI-7-2 as amended by
10.17), and `deriveIsAssignable` is a function of lifecycle state + moderation status only —
**contribution facts cannot move it**. The roster is an **input**, not the algorithm; a bump would
break replay of every already-frozen cycle (10.17 D3, ratified). **Prove it**: a test that spawns
from a frozen `committed_at`, then appends contribution/reversal events, then re-spawns from the
**same** frozen instant and asserts a **byte-identical** `computeAssignableRosterHash` **and**
byte-identical `pool_snapshots.member_assignments`.

**(d) The wire.** `ContributionHistoryUnavailableDto`
(`packages/contracts/src/members/validity.ts:47-49`) becomes a **union** with the `ok` arm; all
objects stay `.strict()`. Regenerate `openapi/v1.yaml` and run
`contracts:check-openapi-determinism`. *(Note: 10.17 found the Story 4.6 payload has never been
registered in the hand-curated emitter — a byte-identical regen is the expected outcome; record it,
do not "fix" the emitter here.)*

### AC7 — The p95 and spawn envelopes are re-measured, not assumed

Activating four clauses adds **four `evaluateAt` calls per member per evaluation**, and each one
runs its own `getMemberStateAt` full-stream replay + keyed-store round-trip, plus the ladder shell's
extra `resolveByClauseId` — roughly **8 additional queries per validity evaluation**. On the
`assignable-roster.ts` path this is **O(N children · M members)**.

**Then** re-run the existing evidence harness — do **not** build a new one
([[project_measured_validation_framework]], [[feedback_no_premature_package]]):
- `packages/validity-service/tests/integration/measured-validation-fr12a.spec.ts` (AI-4-1 cached-path
  p95) — the CI smoke must stay green; append a **versioned record** to
  `packages/validity-service/tests/bench/p95-budget.md` capturing before/after.
- `packages/validity-service/tests/integration/measured-validation-determinism.spec.ts` and
  `pnpm --filter @twt/validity-service test:determinism` (the 100×-thread byte-identical hash gate)
  must stay green. A single hash across 100 threads — a P0 on any variance.

**And — the criterion a reviewer can actually check — NO NEW N+1 QUERY PATH IS INTRODUCED.**
*"Materially slower"* is a judgement call that dies in review; *"is there a query inside a loop over
members, pools or clauses?"* is a yes/no a reviewer can verify from the diff alone. This is the
binding structural criterion; the p95 numbers above are the corroborating evidence, not the gate.

Concretely, **every** read this story adds must be **batched or O(1) per evaluation**:

| Path | Required shape |
|---|---|
| `deriveContributionFacts(member, at)` | A **fixed** number of queries — independent of the member's contribution count, assignment count, or cycle count. Aggregate in SQL (`COUNT`/`MAX` over the indexed projection); never fetch rows to count them in JS, and never one query per cycle. |
| The trustee-lite candidate scan (Task 5) | **Bounded reads over the Pariwar**, never one validity evaluation or one fact read per member in a loop. 10.11 already paid for this lesson — its own spec went 44 s → 220 s and timed out three unrelated suites by doing per-test setup work; a per-member read here has the same shape at production scale. |
| The assignment writer in `spawnChildPool` | **ONE bulk insert** of the whole `memberAssignments` array. Never a per-member `INSERT` in a `for` loop inside the spawn transaction. |
| The backfill | Set-based (`INSERT … SELECT`) or explicitly chunked with a stated chunk size. Never row-at-a-time across the whole event log. |
| `evaluateOrderedClauses` | Unchanged — the four R7 clause resolutions are a **fixed** addition per evaluation, not a function of anything member-scoped. |

**Then** assert it, don't just intend it: a test that counts queries (or wraps the `Db` handle and
records call count) over a fixture with **1 vs. N** contributions/assignments and asserts the count
is **identical** — an N-independent read is the definition of "no N+1", and a counted assertion
survives a refactor that a comment does not.

**And** if the added cost materially moves p95 or the Story 7.9 spawn envelope **even with no N+1**,
that is an **escalation with numbers**, not a silent acceptance. Record what you measured, and mark
anything you did not run as **un-attested** — never backfill ([[feedback_record_unattested_no_backfill]]).

### AC8 — Tier-2 reconciliation: every claim that is now false is corrected

Each of these asserts something that stops being true the moment this lands. Correct them **in
place**; do not leave the next reader to re-derive the truth.

| Site | What is now false |
|---|---|
| `packages/validity-service/src/types.ts:56-65` | *"R7/R8 are OMITTED … until the Epic 8/9 producer"* — R7(C)–(F) now evaluate; R8 is **not** activated by these facts (it needs `compliance_percent` + a claim-time fact, on top of `total_count >= 10` which this story does supply). |
| `packages/validity-service/src/producer.ts:12-18` | *"NOT produced (Epic 8/9): `contribution.*`"* — five of the seven now are. |
| `packages/validity-service/src/rules.ts:21-24` | *"The only engine-evaluated clause at member standing today is R12; R7/R8 are GATED OFF"*. |
| `packages/niyamavali-engine/src/r7-ladder.ts:53-55` | *"contribution events do NOT exist yet (Story 9.x)"* — they have existed since 9.4. Correct the prose; **do not touch the fact-contract constants**. |
| `packages/domain/src/trustee-lite/violator-flags.ts:20-35` (header only) | The *"dark today / all backlog"* narration, **and** its own stale `payload.ts:294` line-anchor for `CONTRIBUTION_UNAVAILABLE` (it's `:283-286`/`:336` now — the same staleness Escalation 5 names in the change proposal, a second copy of it). **Header prose only — the code is frozen (AC5).** |
| `apps/api/src/modules/trustee-lite/handlers.ts:225-236` | The *"candidate source is `unavailable` today"* block, rewritten as the record of the flip. |
| `packages/ui/src/member-status/presenter.ts:169-181` | Renders the sentinel unconditionally; must branch on the discriminant and render real facts on the `ok` arm. |

**And the sentinel rename 10.11 owed forward** ([[feedback_closure_language_precision]] — this is a
carried commitment, not a nice-to-have): `producer: 'epic-8-9'` → `'story-10-24'` across
`validity-service/src/types.ts:65`, `payload.ts:283-286`,
`contracts/src/members/validity.ts:47-49` and `:143-147` (the `z.enum(['epic-6','epic-8-9'])`),
the `member_search_projection.contribution_section` column default (migration `0035:34` → an
`ALTER COLUMN … SET DEFAULT` **plus** an `UPDATE` of existing rows, in this story's migration), the
`apps/admin` `producerLabel` map (`src/modules/trustee-lite/i18n-en.ts:103` — admin i18n files are
per-module, not top-level) and its test
(`apps/admin/tests/trustee-lite.test.tsx:168`), and every fixture in `packages/ui/tests/**`.

The **status literal `'producer_unavailable'` does NOT change** — `violator-flags.ts`'s
short-circuit and `packages/validity-service/tests/trustee-lite-sentinel-lockstep.test.ts` depend on
it, and that lockstep test must stay green (it is the pin that keeps the two constants honest).

**Explicitly DEFERRED, recorded not hidden:** populating `member_search_projection.contribution_section`
with **real facts** (the admin member-search compound read model). This story only re-points its
sentinel. Name the deferral in `deferred-work.md`.

### AC9 — Story 10.16's restoration-package count stays dark, and says so accurately

**Given** this story's boundary excludes **restoration accounting**
**Then** `RestorationPackageState` (`packages/ui/src/contribution-disclosure/view-model.ts:53`)
stays on its `package_unavailable` arm — the `ok` arm remains **declared and unreachable**.

**And** its `producer` literal is re-pointed from `'story-10-24'` to **`'story-10-25'`** (R7(A)
Restoration Accounting), because after this story lands the label would otherwise name a story that
has shipped and did not close the gap — an honest sentinel that has quietly become a lie. Update
`presenter.ts:45-47`, the type literal, and
`packages/ui/tests/contribution-disclosure/presenter.test.ts:135-136`, `:199`.

**✅ Escalation 3 RESOLVED (2026-08-05, Decision 2026-08-05-074):** BigDev confirmed Story 10.25 as the
owner. The re-point stands and the count was NOT built here.

### AC10 — Validation

`pnpm turbo run typecheck` · `lint` · `pnpm --filter @twt/validity-service test:determinism` ·
`contracts:check-openapi-determinism` · `pnpm domain-invariants:check` · `pnpm ci:local` (with and
without `DATABASE_URL`).

A live-DB failure here is **not presumptively innocent** — this story changes a payload shape that
many specs read. Chase each to root cause before filing it as an inherited flake; the known
signatures are [[project_ci_local_concurrency_oversubscription]] (a *different* victim each run,
always timing-shaped) and [[project_ci_local_double_run_pollution]]. Confirm innocence by running the
suspect spec **in isolation** ([[project_known_livedb_test_failures]]).

---

## Load-Bearing Decisions

### D1 — RECOMMENDED. Two narrow projection tables, both as-of correct. ⭐

The five facts must be answerable **at any instant**, cheaply. Two tables, one migration:

**(1) `member_contribution_ledger`** — one row per confirmation, with its reversal folded in.

| column | note |
|---|---|
| `pariwar_id` | RLS predicate column; branded `PariwarId`. |
| `member_id` | from `payload->>'memberId'` (`CONFIRMED_PAYLOAD_MEMBER_KEY`). |
| `pool_id` | from `payload->>'poolId'` (`CONFIRMED_PAYLOAD_POOL_KEY`). |
| `confirmed_event_id` | **PK** — the `contribution.confirmed` `event_id`; idempotent by construction. |
| `confirmed_at` | the confirmation's `occurred_at`. |
| `reversed_at` | the `reconciliation.confirmation-reversed` `occurred_at`, or NULL. **Nullable, time-bearing** — a reversal that happened *after* `at` must not apply *at* `at`. |
| `reversed_by_event_id` | provenance. |

Index: `(pariwar_id, member_id, confirmed_at DESC)`.
`total_count(at)` = `COUNT(*) WHERE confirmed_at <= at AND (reversed_at IS NULL OR reversed_at > at)`.
`months_since_last(at)` = calendar months from `MAX(confirmed_at)` under the same predicate.

**(2) `member_pool_assignments`** — one row per (member, pool) at freeze.

| column | note |
|---|---|
| `pariwar_id`, `member_id`, `pool_id` | PK `(pool_id, member_id)`. |
| `cycle_id` | `CycleFreezeCommitId`, unFK'd (the pool substrate's posture, [[project_pool_primitive_substrate]]). |
| `assigned_at` | the cycle-freeze `committed_at` — the assignment instant. |

Index: `(pariwar_id, member_id, assigned_at DESC)`.
`skips_current_year(at)` = assignments in the IST calendar year of `at`, whose alert is closed by
`at`, minus those with a live confirmation at `at`.

**Why not one aggregate row per member?** An aggregate table can only answer *"now"*. It would make
`getValidityAt(historical)` silently disagree with `getValidity()`, break replay for the surface
that feeds suspension decisions, and put an un-versioned staleness watermark on the correctness path.
Row-level + indexed aggregate is **both** faster than the events_log JSONB scan **and** replay-correct.

**Table-level discipline** (mirror `pool_snapshots.ts` — a plain append projection, **not** an
event-derived-state cache): RLS policy in `packages/domain/src/policies/`, registration in
`schema/index.ts`, snake_case columns / camelCase TS / snake_case-plural table.

### D2 — ⭐ THE MOST IMPORTANT DECISION. Only APPLIED R7 clauses enter the payload.

`assembleClauses` (`payload.ts:246-277`) pushes **every non-null slot** into
`applicableNiyamavaliClauses[]`. `deriveViolatorFlags` maps **every R7 clause id it finds there**
into a flag, unconditionally. Combine the two naively and the Trustee-Lite violator section flags
**every member in the Pariwar**, four times each, on the surface that feeds suspension decisions.

**Mechanism — use the family ladder, not four ordinary descriptors.** `evaluateLadderAt`
(`ladder.ts:197`, exported from the engine index) already computes `applied` per clause **from the
payload's own `on_pass` DATA**, with the swapped-payload guard (`parseMeta`), sorted by `clause_id`,
and reports `missingClauseIds`. Call it with **`R7_ACTIVATED_CLAUSE_IDS`** (the four) and
`R7_NOT_APPLICABLE`, then contribute `perClauseResults.filter(e => e.applied)` as slots.

- **Do NOT** re-derive `applied` as `decision !== 'r7_not_applicable'` in `rules.ts`. That
  duplicates `isApplied` minus its swap-guard — a second definition of "applied", which is exactly
  the drift class this codebase keeps getting bitten by.
- **Do NOT** modify `ladder.ts` / `interpretClause`. They are frozen, shared by R7/R8/special-death,
  and behind the 100×-thread determinism gate.
- **Contribute EVERY applied clause**, not just the ladder's precedence pick. `precedence` orders
  *which explanation surfaces*, never eligibility — every applied clause already means the
  restoration path applies ([[project_niyamavali_precedence_is_provenance]]), and the trustee flag
  list is natively plural (`ViolatorFlagMember.flags[]`).

**Determinism (AC2 of Story 4.6, a P0 gate):** the R7 family occupies **one fixed position** in
`VALIDITY_RULE_ORDER`, after `R12_CLAUSE_ID`; within it, clause-id ascending (the ladder already
sorts). Never `Promise.all` completion order, never hash-map order.

**The two tests that make this real:**
1. A member with **zero** applied R7 clauses → **zero** R7 entries in `applicableNiyamavaliClauses`
   → `deriveViolatorFlags` returns `{ status: 'ok', flags: [] }`, and the section renders empty.
2. A member with `months_since_last = 13` → **exactly** `r7-c` (and `r7-f`, whose `>= 6` also fires)
   present, `r7-d`/`r7-e` absent.

### D3 — RECOMMENDED. Maintain the ledger by an `events_log` AFTER-INSERT trigger.

**Verify the writer topology before deciding** — the change proposal's *"two live emitters"* are
**call sites**, not writers. At `55aa1cc` there are **two domain-level append writers**:

- `appendConfirmedContribution` (`packages/domain/src/reconciliation/matcher-write.ts:116-133`) —
  the **only** `eventType: CONFIRMED_EVENT_TYPE` writer in the repo, reached from
  `apps/jobs/src/matcher/matcher-worker.ts:325` **and**
  `apps/api/src/modules/reconciliation-review/handlers.ts:308` (*"the ONLY manual confirm path"*, 9.8 D2).
- `appendConfirmationReversed` (`reconciliation/reconciliation-review-write.ts:139`), reached from
  `reconciliation-review/handlers.ts:503`.

So a projector call **inside those two writers** would also be single-point today — that alternative
is real and should be named, not strawmanned. The trigger is still preferred, for three reasons the
writer route cannot match: it is **atomic with the append** (a rolled-back append rolls back the
projection, no ordering to get right), it covers **any future writer** including the backfill and
any replay/repair path, and the failure mode this entire story exists to fix is *"a producer nobody
owned"* — a mechanism that cannot be forgotten is worth more here than elsewhere. Precedent:
migration `0036:85-107`.

- Scope by `WHEN (NEW.event_type IN ('contribution.confirmed','reconciliation.confirmation-reversed'))`.
- The confirmed arm INSERTs; the reversal arm UPDATEs `reversed_at` by
  `payload->>'reversedConfirmedEventId'` (`REVERSED_CONFIRMED_EVENT_ID_KEY`).
- `ON CONFLICT (confirmed_event_id) DO NOTHING` — idempotent under replay/retry.
- Both are single indexed statements — cheap enough per INSERT (same argument `0036` makes).
- The **same migration** adds the AC6(a) cache-invalidation trigger for these families.

**Assignments take the opposite route — an explicit domain writer, not a trigger.** A trigger on
`pool_snapshots` would expand a JSONB array of up to `4L / N` member ids inside the spawn
transaction, un-instrumented, inside Story 7.9's `<60 s` envelope. Write them explicitly beside the
existing `db.insert(poolSnapshots)` in `spawnChildPool` (`pool/spawn.ts:484-495`) from the **same**
`memberAssignments` value — one bulk insert, measurable, in the code that already owns that budget.

**Backfill both**, idempotently, from existing data (`events_log` for the ledger, `pool_snapshots`
for the assignments) — a one-shot job or a guarded migration step. State plainly whether production
data exists; if it does not, say so rather than claiming a backfill you could not exercise.

#### ⚠ The two mechanisms MUST be observationally equivalent — and a test must prove it

Two projection styles in one story is a real hazard: they will drift into subtly different
guarantees (ordering, idempotency, transactional boundary, what a replay reproduces), and the
divergence will surface years later as a fact that disagrees with its own source. **The mechanism is
an implementation detail; the projected state is the contract.** So the difference between them must
be *where the write is invoked* and **nothing else**.

Four properties both mechanisms must satisfy **identically**, asserted by a shared
**invariant test** (one test body, run twice — once against the trigger path, once against the
explicit-writer path — never two parallel test files that can drift):

| Property | Must hold for BOTH |
|---|---|
| **Atomicity** | The projection row commits/rolls back **with** its source write. Roll back the enclosing tx → **no** projection row survives. |
| **Idempotency** | Applying the same source twice (event re-append / re-spawn / re-run backfill) yields **byte-identical** projected state — never a duplicate, never a second increment. |
| **Replay equivalence** | Rebuilding from scratch via the **backfill** over the same source data produces state **byte-identical** to the incrementally-maintained state. This is the load-bearing one: it is what makes the backfill a genuine repair path rather than a second, differently-wrong producer. |
| **Ordering-independence** | The projected state is a function of the source **set**, not of arrival order (a reversal arriving before its confirmation must converge to the same row). |

**And** the acceptance test that ties it to what actually matters: **`deriveContributionFacts` over
the incrementally-maintained tables and over the freshly-backfilled tables returns identical facts
for the same `(member, at)`** — across a fixture exercising confirmations, reversals, assignments,
open cycles and closed cycles. If those two ever disagree, one of the mechanisms is wrong and the
facts are untrustworthy; a diff here is a **P0 finding**, not a tolerance.

**And** the choice of mechanism per table is recorded in `.decision-log.md` **with this equivalence
requirement attached**, so a future author adding a third projection inherits the obligation rather
than the precedent alone.

### D4 — RATIFIED HERE. `VALIDITY_RULE_ORDER` is the omission mechanism.

An omitted clause is one that **never gets a descriptor** — it is not evaluated, not memoized, not
audited, and cannot appear in `applicableNiyamavaliClauses[]` or `provenanceTrace[]`. That is
strictly stronger than evaluating-then-filtering, and it is the *"honest sentinel"* discipline the
change proposal names (§3). `R7_HELD_CLAUSES` is the **record** of the omission; the absence from
`VALIDITY_RULE_ORDER` is the **enforcement**.

### D5 — `in_lapse` ships under a NAMED **implementation policy** — the `LapseNettingPolicy` precedent.

*"Lapse"* has no Niyamavali-pinned definition in the registry, and this story's boundary forbids
defining **governance** policy. But the epic AC names `in_lapse` among the five, so it ships the same
way `valid_membership_years` shipped under an unresolved Trustee-Panel question ([[CR-4.5-D2]],
`producer.ts:26-34`): as a **named constant carrying an explicit, documented derivation policy**.

> **⚠ Read "v1" as a VERSION, not as an expiry date.** `missed-closed-cycle-v1` is a **documented
> implementation policy** — a genuine, calendar-correct derivation under a stated rule. It is **not**
> a placeholder, **not** provisional data, and **not** disposable. The moment it ships it is part of
> the `contributionHistorySummary` **payload contract**: it is hashed into `validityPayloadHash`,
> read by the trustee-lite `factsEstablishing[]`, and its `lapseSince` is rendered as `holdingSince`
> on a surface that feeds suspension decisions. Changing it later is a **contract change with a
> migration-shaped blast radius** (every payload hash moves, every cached row is re-shaped, every
> recorded flag's onset can shift) — reviewed and versioned like any other, **never** an
> "it was only v1, so I retuned it" edit.

This is precisely the `LapseNettingPolicy` posture, which `producer.ts:26-34` states in the same
terms — *"a DOCUMENTED policy choice, NOT a placeholder: it is a genuine calendar-correct derivation
under an explicit, stated policy"* — and which has now sat un-retuned since Story 4.6 without
anyone treating it as temporary. Mirror that wording; do not weaken it.

```ts
/**
 * The v1 contribution-lapse derivation policy. A DOCUMENTED, VERSIONED implementation policy — a
 * genuine derivation under an explicit stated rule, NOT a placeholder and NOT provisional.
 * It is part of the payload contract (hashed into `validityPayloadHash`, rendered as `holdingSince`
 * on the trustee moderation surface). Re-pinning it is a versioned contract change, never a retune.
 */
export type ContributionLapsePolicy = 'missed-closed-cycle-v1';
```

`missed-closed-cycle-v1`: **in lapse iff ≥ 1 assigned-and-closed cycle in the current calendar year
resolved without a live confirmation** — i.e. `skips_current_year > 0`. `lapseSince` = the **close
instant of the earliest** such cycle. Derived from data already in the projection; no new source.

**What "no live clause consumer" does and does not buy.** `in_lapse` is read by **no activated
clause** — only R7(A), which is **held** — so re-pinning it today would not change any eligibility
answer. That bounds the *governance* cost of a re-pin; it does **not** make the fact disposable,
because it is already on the wire and on a moderation surface. **Escalation 1** asks the Trustee
Panel to confirm or re-pin the definition **now, while that window is open**, rather than after the
first clause starts reading it.

### D6 — The `producer_unavailable` sentinel STAYS reachable.

After this story, the producer exists — but a per-member gap can still be genuine (no member-stream
events; a historical `at` before the projection's coverage; a corrupt/incomplete backfill). The
sentinel is the honest answer for those, and it is what
`ContributionHistoryUnavailable`/`RetirementCoverageUnavailable` were designed for
([[CR-4.4-D3]] / [[CR-4.5-D1]] — *"an absent fact must be distinguishable from a clean-record
member"*). **Never** return `{ status: 'ok', facts: { 'contribution.total_count': 0 } }` for a member
whose history could not be derived. Zero and unknown are different claims.

Consequence worth stating: `summarizeViolatorFlags` degrades the **whole section** to
`detection_unavailable` if **any** candidate is unevaluable (10.11, deliberately strict — a partial
scan is a false all-clear for exactly the members it skipped). So a single un-derivable member darkens
the trustee section. That is correct and must not be "fixed" by fabricating a zero.

### D7 — Story 10.16's restoration-package count is NOT this story's.

`RestorationPackageState.ok` needs `{ remaining, required }` — the count of **consecutive**
contributions completed against the clause's `restoration.consecutive_required`. That is
**restoration accounting**, which the boundary assigns to Story 10.25 (and which couples to 10.23's
restoration-discipline overlay with **separate expiry** — the non-subsumption principle,
[[project_moderation_model_correct_course]]). Building it here would collapse two independently
amendable governance instruments into one story's release — precisely what the three-way
decomposition exists to prevent. Re-point the label (AC9); do not build the arm.

### D8 — No new event type; the 8.10 fence is not approached.

This story **emits nothing**. No `contribution.*` event type is minted, so the Story 8.10
pool-bound-payment fence and the `contribution.*` namespace discipline are untouched
([[project_contribution_event_name_contract]]). If you find yourself wanting to emit a
`contribution.fact-*` event, stop — that is a projection, and projections do not need events.

---

## Escalations owed (raise them; do not silently absorb)

1. **✅ RESOLVED 2026-08-05 — the `in_lapse` derivation policy (D5).** BigDev **CONFIRMED**
   `missed-closed-cycle-v1` as the ratified versioned implementation policy for `contribution.in_lapse`
   (Decision **2026-08-05-074**). Rationale as given: `in_lapse` is now part of the validity payload
   contract, and no activated clause currently depends on it — which made this the lowest-cost point to
   ratify. **Future changes, once the fact is consumed by member eligibility rules, are GOVERNANCE
   changes rather than implementation refinements.** Note the direction: the cheap-re-pin window is now
   **CLOSED**, and the bar for changing this rule went UP. Recorded at the definition site
   (`producer.ts`) and pinned by a test that states why the literal is not free to move. Closed by
   ratification, not by deferral ([[feedback_closure_language_precision]]).
2. **p95 / spawn-envelope cost (AC7).** Four extra clause evaluations ≈ 8 extra queries per member
   per validity evaluation, multiplied by `O(N·M)` on the roster path. If the measured numbers move
   materially, escalate **with the numbers**, and propose (do not build) the obvious lever: hoisting
   the per-clause `getMemberStateAt` replay out of `evaluateAt` — a Story 4.1 change, not this one's.
3. **✅ RESOLVED 2026-08-05 — who owns the restoration-package count (AC9 / D7).** BigDev
   **CONFIRMED** Story 10.25 as the owner; the `story-10-24` → `story-10-25` re-point stands
   (Decision **2026-08-05-074**). No longer an open scope question — moving it again needs a superseding
   decision, not a judgement call. Recorded at both label sites.
4. **FR-12A's documented `contribution_history` shape is not what ships.** `prd.md:404-406` names
   `{total_contributions, missed_count_lifetime, rolling_year_skips, R7_subclause_state,
   R8_subclause_state}`. The shipped sub-object is `contributionHistorySummary` (Story 4.6 already
   diverged), and this story supplies engine-fact-keyed values instead — with **no
   `missed_count_lifetime`** (lifetime misses need assignment history predating the projection's
   backfill horizon). Record as a variance; do **not** invent a lifetime miss count you cannot derive.
5. **The change proposal's line anchors are stale.** It cites `payload.ts:294` for
   `CONTRIBUTION_UNAVAILABLE`; at `55aa1cc` it is **`:283-286`**, and the `assemblePayload` use is
   **`:336`** (Story 10.17 inserted `deriveIsAssignable` above). Re-verify every anchor live before
   citing it — [[feedback_verify_before_committing_governance_claims]].

---

## Tasks / Subtasks

### Task 0 — Orient; confirm nothing moved under you (AC: all)
- [x] `git fetch origin`; confirm `main` is still `55aa1cc` and the tree is clean
      ([[feedback_git_fetch_before_remote_reasoning]]).
- [x] Re-verify live: `payload.ts:283-286` + `:336`, `types.ts:56-65`, `rules.ts:41` + `:76`,
      `r7-ladder.ts:61-93`, `violator-flags.ts`, `trustee-lite/handlers.ts:237`. Record any drift.
- [x] Confirm `10-23`, `10-25`, `10-26` are still `backlog` — this story must not assume any landed.
- [x] Capture a `pnpm ci:local` **baseline** (with and without `DATABASE_URL`) *before any edit*, so
      an inherited flake is not later attributed to this story.

### Task 1 — ⭐ FIRST: the activation/hold constants and their MECHANIZATION TESTS (AC: 3)

**Deliberately ahead of every other task.** D2/D4 is the highest-risk architectural decision in this
story, and the discipline that enforces it is **pure, DB-free, and depends on nothing** — the
constants plus the engine's already-exported `R7_CLAUSE_IDS`. Writing it first means the boundary
that governs everything downstream is **green and revert-proven before any payload wiring exists**,
rather than being retro-fitted around code that is already shaped. If it lands last, it degrades
into a description of what was built ([[feedback_mechanization_split_commitment]] — decay
concentrates in the un-mechanized half).

- [x] `rules.ts` — introduce **`R7_ACTIVATED_CLAUSE_IDS`** (the four: `r7-c`, `r7-d`, `r7-e`,
      `r7-f`) and **`R7_HELD_CLAUSES`** (the three, each naming `blockedBy` + `owner`, per AC3).
      **Constants only** — no evaluation, no descriptor, no `VALIDITY_RULE_ORDER` change yet.
- [x] The **totality test**: `activated ∪ held.clauseId === R7_CLAUSE_IDS` (the engine's canonical
      seven) **and** `activated ∩ held === ∅`. A future R7 sub-clause must land in exactly one bucket.
- [x] Assert `VALIDITY_RULE_ORDER` contains **no** R8 clause id (the R8 trap, Boundary §).
- [x] **Run the revert-sanity probe NOW and record the result**: add `r7-a` to
      `R7_ACTIVATED_CLAUSE_IDS` → the totality test must go **RED**. Restore. A green scan proves
      nothing ([[feedback_gate_scope_semantic_coverage]]).
- [x] Assert each held clause's `blockedBy` names a fact key that is **genuinely absent** from the
      five this story supplies — so the hold cannot silently outlive its reason.
- [x] **Checkpoint:** this task is done when the constants exist, the tests are green, and the revert
      probe is recorded as run. **Do not start Task 4 or 5 before it is.**

### Task 2 — The projection substrate (AC: 1, 4; D1, D3)
- [x] Hand-author migration `0093_contribution-fact-projection.sql`. **⚠ Do NOT run `db:generate`** —
      the drizzle snapshot baseline is frozen at `0020`; a regenerate emits a bloated catch-up
      migration and drizzle-kit skips an applied migration by journal `when`, not SQL hash, raising
      `42P07` ([[project_live_db_test_gotchas]]; the `0081` header documents this verbatim).
- [x] Tables `member_contribution_ledger` + `member_pool_assignments` per **D1**, with their indexes,
      `GRANT`s for `twt_app`, and the `_journal.json` entry.
- [x] Drizzle schema files in `packages/domain/src/schema/`, registered in `schema/index.ts`.
- [x] RLS policies in `packages/domain/src/policies/` + `policies/index.ts` (mirror
      `member-validity-cache-rls.ts`).
- [x] The two `events_log` triggers (D3): ledger maintenance **and** the AC6(a) cache invalidation
      for `contribution.*` / `reconciliation.confirmation-reversed`.
- [x] Assignment writer beside `db.insert(poolSnapshots)` in `pool/spawn.ts:484-495`, from the same
      `memberAssignments` value — **ONE bulk insert**, never per-member in a loop (AC7).
- [x] Idempotent backfill for both tables, **set-based or explicitly chunked** (AC7); state honestly
      whether it was exercised against real data.
- [x] **⭐ The D3 observational-equivalence invariant test** — ONE shared test body run against BOTH
      mechanisms, asserting all four properties (atomicity · idempotency · replay equivalence ·
      ordering-independence). Never two parallel test files that can drift.

### Task 3 — The pure fact derivation (AC: 1, 2, 4, 7; D5, D6)
- [x] `packages/domain/src/contribution/facts.ts` (or `validity-service/src/producer.ts` — see
      Project Structure Notes) — the as-of reads + a **PURE** `deriveContributionFacts(input, at)`.
- [x] `total_count` / `ever_contributed` / `months_since_last` (calendar-correct, AC2) /
      `skips_current_year` (AC4) / `in_lapse` + `lapseSince` (D5 — carry the **payload-contract**
      framing into the doc comment verbatim; it is not a placeholder).
- [x] Reuse `hasLiveConfirmation` (`contribution/read.ts:88`) and `isAlertClosedState`
      (`contribution/history.ts:95`). **Never** a second definition of confirmed/closed.
- [x] **AC7 — aggregate in SQL, fixed query count.** `COUNT`/`MAX` over the indexed projection; never
      fetch rows to count them in JS, never one query per cycle. Add the **counted-query assertion**
      (1 vs. N contributions/assignments → identical query count).
- [x] Every dynamic `.limit()` routed through `clampLimit` or a fixed integer literal —
      `pnpm domain-invariants:check` ([[project_domain_limit_clamp_and_savepoint_retry]]).
- [x] Return `null` (→ the sentinel) when inputs are genuinely un-derivable. **Never a fabricated 0**
      (D6).
- [x] **The AC-level equivalence check (D3):** `deriveContributionFacts` over the incrementally-
      maintained tables vs. over freshly-backfilled tables → **identical facts** for the same
      `(member, at)`. A diff is a **P0 finding**.

### Task 4 — Payload contract: the `ok` arm (AC: 5, 6d, 8)
- [x] `types.ts` — `ContributionHistoryAvailable` + the union; keep the sentinel type, re-point its
      `producer` to `'story-10-24'`.
- [x] `payload.ts` — `AssembleInput` gains `contributionHistory`; `assemblePayload:336` stops
      hardcoding `CONTRIBUTION_UNAVAILABLE`. Field **position is unchanged** (the hash is
      order-sensitive).
- [x] `index.ts` exports; `contracts/src/members/validity.ts` union DTO (`.strict()`), enum widened,
      OpenAPI regenerated + determinism-checked.
- [x] Confirm `redaction.ts` treats the new arm correctly — contribution facts are **non-PII member
      standing**, not State-Trustee-only. Add a positive redaction pin either way.

### Task 5 — Rule wiring: R7(C)–(F) via the family ladder (AC: 3, 5)

*Requires Task 1 green.* The constants and their tests already exist; this task only **uses** them.

- [x] `VALIDITY_RULE_ORDER` gains the R7 family at ONE fixed position **after** R12;
      `AvailableFacts` gains `contribution: Facts | null`.
- [x] Evaluate via `evaluateLadderAt(deps, ctx, at, R7_ACTIVATED_CLAUSE_IDS, R7_NOT_APPLICABLE)`;
      contribute **only** `perClauseResults.filter(e => e.applied)` as slots, clause-id ascending
      (**D2**). **Not** `evaluateR7LadderAt`/`evaluateR7Ladder` — see anti-pattern 9, Dev Notes.
- [x] `service.ts` — produce the facts at the **same pinned instant** as every other read (join the
      existing `Promise.all`), then `buildRuleDescriptors`.
- [x] The two D2 behavioural tests: a member with **zero** applied clauses → **zero** R7 entries; a
      member with `months_since_last = 13` → exactly `r7-c` + `r7-f`, never `r7-d`/`r7-e`.
- [x] **Second revert-sanity probe:** remove the `.filter(e => e.applied)` → the "clean member has no
      flags" test must go **RED**. Restore; record.

### Task 6 — The 10.11 seam flip (AC: 5, 7)
- [x] `apps/api/src/modules/trustee-lite/handlers.ts:237` → `{ status: 'available', candidates }`,
      candidates built from the R7 projection over the Pariwar's members.
- [x] `packages/domain/src/trustee-lite/violator-flags.ts` **stays byte-unchanged below its header**.
      If it needs a code change, **stop and record a finding** — 10.11 proved otherwise.
- [x] Live-DB test: a member with an applied R7 clause appears with the right `clauseId`,
      `factsEstablishing[]` and `holdingSince`; a clean member does not appear at all;
      `holdingSince !== evaluatedAt`.
- [x] **AC7 — bounded reads, never per-member round-trips.** 10.11's own spec went 44 s → 220 s and
      timed out three unrelated suites on exactly this shape; the counted-query assertion applies
      here too.

### Task 7 — Cache epoch, version pin, deploy note (AC: 6)
- [x] Test the new invalidation trigger (append `contribution.confirmed` → cache row deleted in-tx).
- [x] The **byte-identical re-spawn** replay test (AC6c) on `computeAssignableRosterHash` **and**
      `member_assignments`. Assert `POOL_ASSIGNMENT_HASH_VERSION` is still `'v1'`.
- [x] Deploy note in `deferred-work.md` + the Dev Agent Record: the ≤60 s shape window, the
      `invalidate-all` lever, and the **rejected** cache-key change (10.17 D5).

### Task 8 — Tier-2 reconciliation + the sentinel rename (AC: 8, 9)
- [x] Every row of the AC8 table; the rename across all listed sites; the
      `trustee-lite-sentinel-lockstep.test.ts` and `r7-clause-ids-lockstep.test.ts` stay green.
- [x] `member_search_projection.contribution_section` default `ALTER` + row `UPDATE`; the search-projection
      **fact population** recorded as deferred.
- [x] AC9's `'story-10-24'` → `'story-10-25'` re-point in `@twt/ui` + tests.
- [x] **The rename also breaks test fixtures the AC8 table doesn't enumerate** — these hardcode the
      `'epic-8-9'` literal in assertions and will fail once the production rename lands, not silently
      pass:
      `packages/ui/tests/member-status/presenter.test.ts:34,148`,
      `packages/ui/tests/member-status/moderation.test.ts:45`,
      `packages/ui/tests/contribution-disclosure/presenter.test.ts:43`,
      `packages/validity-service/tests/payload.test.ts:56`,
      `packages/validity-service/tests/integration/validity-service.spec.ts:159`,
      `packages/contracts/tests/trustee-lite.test.ts:114,115,121,213`,
      `packages/domain/tests/trustee-lite/violator-flags.test.ts:31,75,210,212`,
      `packages/domain/tests/integration/member/search-projection.spec.ts:83`,
      `apps/admin/tests/helpline-claim-page.test.tsx:32`,
      `apps/admin/tests/trustee-lite.test.tsx:129,136,145,168`,
      `apps/admin/tests/helpline-console.test.tsx:30`,
      `apps/admin/tests/helpdesk-operator-console.test.tsx:32`,
      `apps/admin/tests/member-status-panel.test.tsx:28,52`,
      `apps/admin/tests/verifier-console.test.tsx:47`.
- [x] `grep -rn "epic-8-9"` across `packages` + `apps` (excluding `dist`) returns **only** intentional
      historical references.

### Task 9 — Measure, then validate (AC: 7, 10)
- [x] **The N+1 review pass first** — walk the whole diff for a query inside a loop over members,
      pools or clauses. This is the structural gate; the numbers below corroborate it.
- [x] Re-run the AI-4-1 p95 harness + the determinism gate; append the versioned record to
      `p95-budget.md`.
- [x] Full AC10 validation. Chase every live-DB failure to root cause; confirm innocence in isolation.
- [x] Record un-attested anything you did not run ([[feedback_record_unattested_no_backfill]]).

### Task 10 — Governance records
- [x] `.decision-log.md` — D2 (applied-only clause contribution), **D3 (the two-mechanism choice,
      with the observational-equivalence obligation attached so a future third projection inherits
      it)**, D5 (the lapse policy, recorded as a **versioned payload-contract element**, not a
      provisional value), D7 (the 10.16 label re-point).
- [x] `deferred-work.md` — the search-projection fact population, `missed_count_lifetime`, the
      escalations' outcomes.
- [x] `sprint-status.yaml` — one combined `ready-for-dev → in-progress → review` ledger entry at
      completion ([[project_sprint_status_ledger]]).
- [x] Update `[[project_r7_fact_producer_unbuilt]]` — it will be **stale the moment this merges**.

### Review Findings

_Code review run 2026-08-05 — full diff (~7017 lines) vs. this spec, three parallel layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor), no failed layers._

- [x] [Review][Decision] **RESOLVED — accepted as an intentional dual implementation strategy, not a second definition.** `facts.ts`'s `liveConfirmationExistsSql` is a SQL EXECUTION STRATEGY for the same "live-confirmed" definition `hasLiveConfirmation` owns, required because AC7 forbids a per-row round-trip and the shared function cannot be called from a set-based aggregate. The `live-confirmation-parity.spec.ts` parity spec is the governing contract: any future change to confirmation semantics must update both implementations and preserve parity, or the two silently drift. Doc comment at `packages/domain/src/contribution/facts.ts:18-25` strengthened to state this obligation explicitly. No further code change.
- [x] [Review][Decision] **RESOLVED — dismissed; recorded as a new operational invariant (Decision 2026-08-05-075).** The `skips_current_year` December→January windowing gap assumes contribution pools may span calendar years — they must not. Pool cycles are single-calendar-month instruments by governance model; assignment-year and close-year are identical in normal operation, and a cross-month/cross-year cycle would require an explicit Trustee Panel emergency resolution, not an alternative `skips_current_year` derivation. No code change to Story 10.24. Pointer comment added at `packages/domain/src/contribution/facts.ts:98-103` (`missedCycleAggregateSql`) citing the decision.

- [x] [Review][Patch] AC8's mandated correction to `r7-ladder.ts:53-55` was never made, contradicting the Dev Agent Record's claim that "every row of the AC8 table" was corrected — `packages/niyamavali-engine/src/r7-ladder.ts:54` still reads "contribution events do NOT exist yet (Story 9.x)" though they have existed since 9.4; the diff touches zero files under `packages/niyamavali-engine/`. **Fixed**: comment corrected in place.
- [x] [Review][Patch] AC6(c)'s required byte-identical re-spawn replay test is vacuous — it never calls `spawnChildPool` and never reads `pool_snapshots.member_assignments` from the DB — `packages/domain/tests/integration/pool/assignment-version-pin-replay.spec.ts`. It calls the pure functions `computeAssignableRosterHash`/`assignMembersToPools` twice with the same in-memory array before/after appending DB events, which proves the pure functions are pure, not that the real spawn/roster-resolution pipeline is contribution-blind. The Dev Agent Record describes a test that was not built. **Fixed**: a new test now calls the REAL `spawnChildPool` (via `planCycleSpawn` + `createPoolAssignmentSeam`) with a wired roster, appends contribution/reversal events, re-spawns from the same frozen instant, and asserts byte-identical `pool_snapshots.member_assignments` AND `member_pool_assignments` — plus a fresh from-scratch seam recomputation matching the persisted row. 20/20 tests pass live.
- [x] [Review][Patch] The AC4 "shared IST-year lockstep" test doesn't cover the module under test — `packages/domain/tests/contribution/alert-closed-lockstep.test.ts:72` only asserts the canonical `IST_UTC_OFFSET_MS` (from `holiday-resolver.js`) against a hardcoded literal; it never imports or references `facts.ts`'s private, non-exported copy (`packages/domain/src/contribution/facts.ts:42`), so a typo or off-by-one in the copy would go completely undetected despite the doc comment's claim that "a change to the canonical constant fails here." **Fixed**: `facts.ts`'s constant is now exported and the test imports both and asserts direct equality.
- [x] [Review][Patch] Revert-sanity probe #2's result (removing `.filter(e => e.applied)` turning a clean member's zero R7 entries into four) is recorded only in the Dev Agent Record's prose, not mechanically in shipped test code — unlike probe #1, which has an in-file, permanently-checked record in `r7-activation-totality.test.ts`'s header comment with exact test-run counts. Add an equivalent in-code record near the D2 behavioral tests. **Fixed**: recorded in-code in `contribution-facts.spec.ts` above the D2 describe block.
- [x] [Review][Patch] Migration 0093's confirmation trigger casts `payload->>'memberId'`/`poolId`/`reversedConfirmedEventId` to `::uuid` without format validation — a malformed-but-present (non-null, non-UUID) value throws inside the AFTER-INSERT trigger, aborting the whole `contribution.confirmed` event append — `packages/domain/migrations/0093_contribution-fact-projection.sql:127-144`. **Fixed**: a UUID-shape regex guard runs before every cast in both trigger arms, skipping (with a `RAISE WARNING`) rather than throwing. Two new live-DB tests cover both arms.
- [x] [Review][Patch] `backfillContributionLedger` fails outright (not "skips", contradicting its own comment) on a historical row with a malformed UUID in the same fields — `packages/domain/src/contribution/projection-write.ts:105-120`. **Fixed**: the same UUID-shape check now gates both backfill statements (confirmed arm + reversal CTE).
- [x] [Review][Patch] The confirmation trigger silently drops confirmations missing `memberId`/`poolId` with zero observability (no log, metric, or dead-letter row) — `packages/domain/migrations/0093_contribution-fact-projection.sql` (the `IF … IS NOT NULL AND … IS NOT NULL THEN … END IF` with no `ELSE`). An operator has no way to discover a silently-dropped contribution except by manually reconciling counts. **Fixed**: both trigger arms now `RAISE WARNING` (with `event_id` + `pariwar_id`) on skip — folded into the same fix as the malformed-UUID guard above.
- [x] [Review][Patch] `R7_HELD_CLAUSES` owner strings use dotted story ids (`'story-10.23'`, `packages/validity-service/src/rules.ts:104,109,114`) inconsistent with the hyphenated convention every other producer/sentinel literal in this same story uses (`'story-10-24'`, `'story-10-25'`, `'story-10-26'` — e.g. `payload.ts:303`, `producer.ts:193-194`, `types.ts:85`). Align the format. **Fixed**: aligned to hyphenated form; the totality test's own regex assertion (which hardcoded the dotted form) was updated to match — a genuine test/code contradiction the patch surfaced.
- [x] [Review][Patch] `liveConfirmationExistsSql` builds its table alias via `sql.raw(assignmentsAlias)` (`packages/domain/src/contribution/facts.ts:65`) instead of a parameterized construct — currently safe (only ever called with the hardcoded literal `'mpa'`), but contrary to the diff's own all-parameterized `sql` convention used everywhere else in the same file, and unguarded against a future caller passing a non-literal value. **Fixed**: the parameter type is now a literal union (`'mpa'`) rather than `string`, so the compiler rejects any future non-literal caller.
- [x] [Review][Patch] `contributionFactsToSummary` forces an unchecked `as Readonly<Record<string, number | boolean>>` cast (`packages/validity-service/src/producer.ts:343`) that would silently hide a future divergence if `Facts` ever gains a non-`number|boolean` key. Prefer a `satisfies`-checked conversion or a structural mapper. **Fixed**: a runtime-verifying `assertNumberOrBooleanFacts` helper throws on a divergent value instead of silently casting.
- [x] [Review][Patch] Doc comments claim "TWO queries, always (AC7)" (`packages/domain/src/contribution/facts.ts:9,175,233`; `packages/validity-service/src/producer.ts:352`) but the real per-evaluation cost is ~8 queries once ladder resolution (`resolveByClauseId` ×4) is included — true only for the fact-input read in isolation. Scope the comment so a future cost audit isn't misled. **Fixed**: a scope note added to the header comment.
- [x] [Review][Patch] `packages/i18n/locales/en/common.json:274` and `packages/i18n/locales/hi/common.json:274` (`memberStatus.detail.contributionUnavailable`) still carry the old "not yet available" wording, while `apps/admin/src/modules/member-status/i18n-en.ts:36-37` was updated to the new per-member derivation-failure wording for the identical key (consumed via the shared `packages/ui/src/member-status/i18n-keys.ts:41`). The member-facing surface using the common/Hindi locale would show stale, semantically-different copy from the admin surface for the same state. Align wording and translate to Hindi. **Fixed**: both locales updated to the honest per-member-gap wording, second-person tone matching the surrounding member-facing strings.

**Dismissed as noise (4):** the p95 benchmark's known coverage gap (already honestly disclosed per the story's own un-attested convention — [[feedback_record_unattested_no_backfill]]); the BigDev escalation/ratification process observation (organizational critique, not a code defect); `listMemberStatesForPariwar`'s membership-sized read (satisfies AC7's "bounded reads over the Pariwar" literally, mirrors the 10.11-established scan shape, not new to this diff); and a general comment-density/tone observation (style opinion, not actionable).

**Post-patch validation (2026-08-05):** `pnpm --filter @twt/domain typecheck/lint`, `pnpm --filter @twt/validity-service typecheck/lint`, `pnpm --filter @twt/niyamavali-engine typecheck`, `pnpm --filter @twt/i18n typecheck`, `pnpm domain-invariants:check`, `pnpm contracts:check-openapi-determinism` all green. Live-DB (`DATABASE_URL` → `twt-test-pg:5433`): `@twt/domain` 32 files/261 tests, `@twt/validity-service` 17 files/192 tests (incl. the 100×-thread determinism gate at exactly one hash), `apps/api` trustee-lite E2E 19/19, `@twt/ui` 98/98, `@twt/admin` 271/271, `@twt/contracts` 837/837 — all pass. One live fallout caught and fixed by this pass: the totality test's owner-string regex hardcoded the pre-patch dotted format and had to be updated alongside the rules.ts fix (see above). Migration 0093's trigger function was re-applied to `twt-test-pg` directly (`CREATE OR REPLACE FUNCTION`) since the DB had the pre-patch version from the story's original implementation.

---

## Dev Notes

### The five files you must read before writing a line

1. `packages/validity-service/src/payload.ts` — `assembleClauses` (`:246`) is why D2 matters;
   `CONTRIBUTION_UNAVAILABLE` (`:283`); the wiring point (`:336`); the hash contract (`:359`).
2. `packages/validity-service/src/rules.ts` — `VALIDITY_RULE_ORDER` (`:41`), `buildRuleDescriptors`
   (`:76`), `evaluateOrderedClauses` (`:102`) and its declared-order determinism commitment.
3. `packages/niyamavali-engine/src/ladder.ts` — `isApplied` (`:104`), `parseMeta`'s swap-guard
   (`:92`), `evaluateLadderAt` (`:197`). **This is the mechanism D2 depends on.**
4. `packages/domain/src/trustee-lite/violator-flags.ts` — the consumer whose contract dictates
   applied-only. Read it as a **specification**, not as code you may edit.
5. `packages/domain/src/contribution/read.ts` + `history.ts` — `hasLiveConfirmation` (`read.ts:88`),
   the payload key constants (`:63-76`), `isAlertClosedState` (`history.ts:95`). Reuse; never re-spell.

### Current state of the data path, end to end

```
contribution.confirmed  ──┐   (2 live emitters since 9.4)
                          ├─→ events_log ──✗ NOTHING ✗──→ contribution.* facts
reconciliation.          ─┘                                        │
  confirmation-reversed                                            ↓
                                              assemblePayload:336 pins CONTRIBUTION_UNAVAILABLE
                                                                   │
                        ┌──────────────────────────────────────────┼──────────────────────────┐
                        ↓                                          ↓                          ↓
        applicableNiyamavaliClauses[]              contributionHistorySummary      member-status panel
        (R7 absent — no descriptor)                 (sentinel, always)              renders "not yet available"
                        │                                          │
                        ↓                                          ↓
        deriveViolatorFlags → short-circuits on the sentinel → detection_unavailable
                        │
                        ↓
        Trustee-Lite violator section: DARK
```

Everything to the right of `events_log` is what this story fills in — **without touching the emitters
and without emitting anything new**.

### Anti-patterns — the nine ways this story goes wrong

1. **Wiring the four R7 clauses as ordinary descriptors** → every member gets four violator flags.
   The single worst outcome available (**D2**).
2. **Activating R7(A)/(B) from the proxies** because "the facts are right there" — normatively
   forbidden (`prd.md:344`).
3. **Assuming R8 activates too** because `types.ts` says *"R7/R8 are omitted until…"*. It does not.
4. **A now-only aggregate table** — kills replay on the surface that feeds suspension decisions (D1).
5. **A second definition of "confirmed"/"closed"/"applied"** instead of reusing
   `hasLiveConfirmation` / `isAlertClosedState` / the ladder's `isApplied`.
6. **Fabricating `{ total_count: 0 }`** for an un-derivable member. Zero ≠ unknown (D6).
7. **Editing `violator-flags.ts`, `ladder.ts`, or `interpretClause`.** All three are frozen; the
   first is 10.11's proof that the seam works, the last two sit behind the determinism P0 gate.
8. **Running `db:generate`** for the migration → `42P07` and a bloated catch-up file
   ([[project_live_db_test_gotchas]]).
9. **Calling `evaluateR7LadderAt` / `evaluateR7Ladder`** (`niyamavali-engine/src/r7-ladder.ts:110-124`,
   exported from the package index) instead of the generic `evaluateLadderAt` with
   `R7_ACTIVATED_CLAUSE_IDS`. These wrappers hardcode the FULL `R7_CLAUSE_IDS` (all seven) — calling
   either evaluates the three HELD clauses too. It will not throw (`interpretClause`'s `hasFact` guard
   resolves a missing fact to `false` rather than erroring), so it fails silently: the held clauses get
   evaluated off absent/proxy-shaped facts, which is exactly what `prd.md:346` forbids, and D2/D4's
   omission mechanism is defeated without any test noticing. Currently unused anywhere in the
   codebase — nothing stops Task 5 from reaching for it by name. Use `evaluateLadderAt` directly.

### Reuse map — do not reinvent

| Need | Use | Not |
|---|---|---|
| live-confirmed truth | `hasLiveConfirmation` (`contribution/read.ts:88`) | a fresh reversal reconciliation |
| cycle closed? | `isAlertClosedState` (`contribution/history.ts:95`) | string comparisons on `current_state` |
| per-clause `applied` | `evaluateLadderAt` (`ladder.ts:197`) | `decision !== 'r7_not_applicable'` |
| calendar math | `validity-service/src/calendar.ts`, SQL `interval` | fixed-ms spans (AI-3-1) |
| assignment truth | `pool_snapshots.member_assignments` | recomputing `assignMembersToPools` |
| cohort invalidation | `validityCache.invalidateAllForPariwar` (`epoch.ts:79`) | a new cache-key component |
| p95 evidence | `@twt/measured-validation` + the two integration specs | new benchmarking tooling |
| canonical hashing | `canonicalJsonStringify` + SHA-256 | a bespoke stringify |

### Testing standards

- **Pure derivation** unit-tested DB-free and exhaustively (the Epic-4 determinism spine): every AC4
  arm, every AC2 calendar boundary, the D6 unknown-vs-zero distinction.
- **Live-DB integration** (`twt-test-pg` on `:5433`) for the projection, the triggers, the seam flip,
  and the replay pin. Own-committing writers accumulate rows — **assert membership, not counts**
  ([[project_live_db_test_gotchas]]).
- **The 100×-thread determinism gate** must stay at exactly one hash.
- **Revert-sanity is mandatory**, not optional: AC3's probe, plus at least one probe proving the
  applied-only filter has teeth (remove the filter → the "clean member has no flags" test goes red).
- Suite-level `{ timeout: 20000 }` on new live-DB specs; do not add unbounded parallelism
  ([[project_ci_local_concurrency_oversubscription]]).

### Project Structure Notes

- **Where the derivation lives.** `@twt/domain` **cannot** import `@twt/validity-service` (the
  reverse dependency is a turbo cycle) and cannot import `@twt/events` either — domain reads
  `events_log` directly ([[project_member_lifecycle_domain_substrate]]). Put the **DB reads +
  projection accessors** in `packages/domain/src/contribution/`, and the **fact-bag mapping +
  service orchestration** in `packages/validity-service/src/producer.ts` beside
  `deriveRetirementFacts` / `retirementFactsToBag`. That is the shipped shape; follow it.
- **Contracts must not import `@twt/domain`** — plain Zod + `_common` primitives, `.strict()`
  everywhere ([[project_contracts_domain_bundle_boundary]]).
- **No new permission key**; `PERMISSION_CATALOG_VERSION` is unchanged. The trustee-lite surface is
  already `member.moderate`-gated.
- **Variance to record:** the FR-12A documented `contribution_history` shape (Escalation 4) — the
  shipped sub-object name and its engine-fact-keyed contents differ from `prd.md:404-406`, and
  `missed_count_lifetime` is not supplied.

### Latest technical notes

No new dependencies. Drizzle ORM, `pg`, Zod, Vitest are all already in place at their pinned
versions. JSONB expression/partial indexes are hand-authored in SQL (drizzle-kit does not model
them — `0081`'s header states this); document the constraint name in the Drizzle schema file's
comment for sync, exactly as `schema/events_log.ts` does.

---

## References

- `_bmad-output/planning-artifacts/epics.md:3905-3949` — Story 10.24 ACs; `:3578` — the corrected
  10.11 / 10.24 attribution; `:3950-3975` — Stories 10.25 / 10.26.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-04-R2.md` — the origin document
  (§1 the gap, §2 substrate assessment, §3 per-clause activation, §4.3 the FR-9 amendment).
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:339-356` — FR-9 + the normative
  no-proxy consequence at `:346`; `:385-433` — FR-12A payload shape, determinism, replayability,
  p95 < 200 ms @ 4L, ≤ 60 s freshness.
- `_bmad-output/implementation-artifacts/4-2-r7-contribution-discipline-rules.md` — the fact contract
  and AI-3-1; `4-6-fr-12a-member-validity-service.md` — the producer/assembly seams;
  `4-8-…-cache-invalidation-….md` — the epoch mechanism; `10-11-trustee-lite-list-signals.md` — D1-B,
  the named seam, the owed-forward sentinel rename; `10-17-moderation-roster-unblock.md` — D3 (no
  version bump) and D5 (the cache-shape deploy window).
- Source anchors as cited inline, all re-verified live at `55aa1cc`.

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) via `bmad-dev-story`.

### Debug Log References

- Baseline `pnpm ci:local` (with + without `DATABASE_URL`), captured BEFORE any edit at `55aa1cc`:
  **29/30 jobs green**. The one failure was `integration-tests` → `apps/api tests/integration/banners/banners.spec.ts`
  AC5. Confirmed innocent by running that package in isolation (**107 files / 852 tests, all passing**) —
  the timing-shaped concurrency signature of [[project_ci_local_concurrency_oversubscription]], present
  before this story touched anything. Recorded as an INHERITED flake, not attributed to this work.
- **Revert-sanity probe #1 (AC3), RUN and recorded.** Added `'niy.contribution-discipline.r7-a'` to
  `R7_ACTIVATED_CLAUSE_IDS` → `Tests 3 failed | 134 passed`: totality, disjointness and the exact-set
  assertion all went RED. Note what did NOT catch it: the `satisfies readonly R7ClauseId[]` constraint
  stayed green, because `r7-a` IS a real R7 id. The compiler cannot catch this class — which is why the
  mechanization is a test, not a type. Restored; suite green.
- **Revert-sanity probe #2 (Task 5), RUN and recorded.** Removed `.filter((entry) => entry.applied)` from
  `evaluateAppliedR7ClauseSlots` → the "clean member has zero R7 entries" test went RED with the exact
  catastrophe D2 predicts: a member with NO applied clause acquired **four** R7 entries. Restored.
- **`violator-flags.ts` byte-unchanged below its header, verified mechanically** (comment-stripped diff of
  `HEAD` vs working tree = empty). 10.11's claim that its seam was producer-shaped rather than
  story-shaped HELD.
- **AC10 validation, chased to root cause — one REAL find and two inherited flakes.** The first post-change
  `ci:local` failed `test (unit)` + `integration-tests` on the SAME spec (the `DATABASE_URL`-global
  double-run, [[project_ci_local_double_run_pollution]]): a **stale Story 4.6 assertion** in
  `validity-service.spec.ts` expecting `contributionHistorySummary` to be the sentinel. That is a genuine
  consequence of this story and was FIXED, not waived — a member with a readable history and no
  contributions now correctly derives `total_count: 0`, and the assertion was rewritten to pin that
  (including `months_since_last` being ABSENT). It escaped the earlier `pnpm turbo run test` because that
  runs WITHOUT `DATABASE_URL`, so the spec skipped. The SECOND `ci:local` failed a **different** pair —
  `@twt/jobs` audit-chain (8.5s) and `banners.spec.ts` (9.3s, a different test than the baseline's) —
  both timing-shaped, both passing in isolation (11/11 and 26/26), neither touching contribution /
  validity / R7. Different victim each run is the [[project_ci_local_concurrency_oversubscription]]
  signature, and `banners.spec.ts` was already failing in the PRE-EDIT baseline. Recorded as inherited.
- Migration 0093 initially failed to apply (`P0001` from `member_search_projection_reject_unguarded_write`)
  — a REAL find, not a test artifact: migration 0035's write-rejection trigger admits only the projector.
  Fixed by arming `SET LOCAL app.member_search_projection_writer` for the label UPDATE (the guard is not
  weakened; `SET LOCAL` reverts on commit). The failed migration rolled back cleanly — tables absent,
  journal at 93 — confirming the migrator is transactional.

### Completion Notes List

**What this story closed.** The `contribution.*` FACT producer Story 4.2 deferred to "Epic 8/9", which
neither epic built. **R7(C)/(D)/(E)/(F) now evaluate in production and the Trustee-Lite violator section
is live.** The lesson worth carrying: two producers were conflated (the `contribution.confirmed` EVENT
producer WAS built at 9.4), and the deferral named an **epic**, which carries no acceptance criteria — so
nothing owned it and both epics closed cleanly.

**⚠ A REAL PRODUCTION BUG the live-DB tests caught, invisible to typecheck.** `max(<timestamptz>)` comes
back from node-postgres as a **STRING**, not a `Date` — the driver's date parser applies to plain column
reads, not to aggregate expression output. The read was annotated `sql<Date | null>`, a lie the compiler
happily believed, and `deriveContributionFacts` threw `lastConfirmedAt.getTime is not a function` **on the
live path**. Now typed as the raw driver shape and normalised through `toDate`, with the reason recorded
at the call site so it is not "simplified" back.

**Decisions implemented as specified.** D1 (two as-of-correct projections, row-level not aggregate),
**D2** (applied-only clause contribution via `evaluateLadderAt` + `R7_ACTIVATED_CLAUSE_IDS` — never the
`evaluateR7Ladder*` wrappers, which hardcode all seven and would silently evaluate the HELD three), D3
(trigger for the ledger, explicit writer for the assignments, held observationally equivalent), D4
(omission via `VALIDITY_RULE_ORDER`), D5 (`missed-closed-cycle-v1` as a VERSIONED payload-contract
element), D6 (the sentinel stays reachable; zero ≠ unknown), D7 (10.16's label → 10.25), D8 (no new event
type). Recorded in `.decision-log.md` as **Decision 2026-08-05-073**.

**One honest judgement call worth flagging for review.** `scanR7ViolatorCandidates` (the Pariwar-wide
trustee scan) uses the ladder's **PURE** core `evaluateLadder` rather than the DB shell `evaluateLadderAt`,
resolving the four clause payloads ONCE instead of per member. That is what makes the scan bounded (7
queries for the whole Pariwar rather than O(M) validity evaluations — AC7's binding structural criterion,
and the shape that took 10.11's own spec from 44s to 220s). The mechanics are identical — same `isApplied`,
same `parseMeta` swap-guard, same clause-id sort — so there is no second definition of "applied". **The
trade-off, stated rather than buried:** this path does not write the per-clause `rule.evaluate`
compute-audit line. That is correct for a read-only detection scan over every member (auditing M×4 clause
computations per dashboard load would flood the chain with rows nobody reads, and the surface read is
already audited once by `admin_trustee_lite.read`), and an individual member's authoritative, audited
verdict still comes from `getValidityAt`, which is unchanged. Flagged because it is a deliberate
divergence from D2's literal "call `evaluateLadderAt`" wording, made for the reason AC7 exists.

**Two design decisions the tests forced into the open, both kept.** (a) Neither projection grants DELETE
to `twt_app` — append projections whose repair path is the idempotent backfill. A test now pins the 42501
directly, so the test helper's role-switch can never be misread as "the app can delete these, we just
chose not to". (b) The 0093 label UPDATE must arm the `member_search_projection` writer guard (above).

**AC6(a) could NOT be discharged the obvious way.** Migration 0036's comment says future families "MUST
extend this WHEN scope" — but that trigger keys on `member_id = NEW.stream_id`, and a
`contribution.confirmed` rides the **ALERT** stream. Widening the WHEN would have fired the trigger and
deleted **nothing**: an obligation that looks discharged and is not. A SECOND trigger keyed on
`payload->>'memberId'` is the only correct form.

**`months_since_last` is OMITTED — not zero, not large — for a never-contributed member.** Supplying
"months since signup" would fire R7(C)/(F) on exactly R7(B)'s population, i.e. proxy evaluation by the
back door, which `prd.md:346` forbids normatively. The engine's `hasFact` guard resolves the absent fact
to a failed condition, so the omission is the honest outcome.

**Un-attested, recorded not backfilled** ([[feedback_record_unattested_no_backfill]]): the p95 bench
Pariwar seeds R12 only, so the recorded numbers include the four extra `evaluateAt` calls but NOT the four
extra `resolveByClauseId` resolutions a fully-provisioned Pariwar incurs. The fully-provisioned delta is
**larger than measured and has not been measured**. The BINDING AC7 gate is structural and passes: 1 vs.
25 contributions → **identical** query count, exactly 2. Also un-attested: no production data exists, so
both backfills were exercised against the test fixture only — where they are asserted byte-identical to
the incrementally-maintained state.

**Final validation.** `pnpm turbo run typecheck` / `lint` / `build` green. `test:determinism` at exactly
ONE hash. `contracts:check-openapi-determinism`, `pnpm domain-invariants:check` and all 26 other static
gates green. The story's own surface: `@twt/validity-service` **192/192**, `@twt/domain`
contribution + pool + trustee-lite **251/251**, `apps/api` trustee-lite E2E **19/19**. `ci:local`'s two
red jobs are the inherited concurrency flake documented above, confirmed innocent in isolation.

**Measured (isolated A/B, same machine, back-to-back).** Uncached `getValidityAt` p50 5.50 → 6.05/6.31 ms;
p95 15.55 → 18.73/15.98 ms. Cached-path p95 115.03 → 34.85/38.96 ms (dominated by warmup placement, not a
real improvement). Only the p50 delta (+0.6–0.8 ms, the producer's two aggregate queries) is a clean
signal. Determinism gate: exactly ONE hash across 100 threads. Full record appended to
`tests/bench/p95-budget.md`.

**OpenAPI regen was BYTE-IDENTICAL** despite the DTO becoming a union — the expected outcome per 10.17's
finding that the 4.6 payload was never registered in the hand-curated emitter. Recorded; deliberately not
"fixed" here.

**Escalations — 1 and 3 RESOLVED by BigDev on 2026-08-05 (Decision 2026-08-05-074).**
**(1)** `missed-closed-cycle-v1` is **RATIFIED** as the versioned implementation policy for
`contribution.in_lapse`, on the reasoning that it is already part of the payload contract and no
activated clause depends on it yet — the lowest-cost moment to pin it. Consequence, worth stating
because it runs opposite to how "v1" usually reads: the cheap-re-pin window is **closed** and the bar
for changing this rule is now HIGHER — a future re-pin is a governance change requiring a superseding
decision, not a refactor. Recorded at the definition site and pinned by a test that says why.
**(3)** Story **10.25** is **CONFIRMED** as the owner of the restoration-package count; the label
re-point stands, recorded at both sites.
**(2)/(4)/(5)** are unaffected and stay recorded in `.decision-log.md` and `deferred-work.md`: the
un-attested fully-provisioned p95 delta, the FR-12A shape variance (`missed_count_lifetime` NOT
invented), and the stale change-proposal anchors (all re-verified live before use).

### File List

**New — substrate**
- `packages/domain/migrations/0093_contribution-fact-projection.sql`
- `packages/domain/src/schema/member_contribution_ledger.ts`
- `packages/domain/src/schema/member_pool_assignments.ts`
- `packages/domain/src/policies/contribution-projection-rls.ts`
- `packages/domain/src/contribution/facts.ts`
- `packages/domain/src/contribution/projection-write.ts`
- `packages/validity-service/src/r7-candidate-scan.ts`

**New — tests**
- `packages/validity-service/tests/r7-activation-totality.test.ts`
- `packages/validity-service/tests/contribution-facts.test.ts`
- `packages/validity-service/tests/fixtures/r7-clauses.ts`
- `packages/validity-service/tests/integration/contribution-facts.spec.ts`
- `packages/domain/tests/contribution/alert-closed-lockstep.test.ts`
- `packages/domain/tests/integration/contribution/projection-equivalence.spec.ts`
- `packages/domain/tests/integration/contribution/live-confirmation-parity.spec.ts`
- `packages/domain/tests/integration/contribution/cache-invalidation-trigger.spec.ts`
- `packages/domain/tests/integration/pool/assignment-version-pin-replay.spec.ts`

**Modified — production**
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts`,
  `packages/domain/src/contribution/index.ts`
- `packages/domain/src/pool/spawn.ts` (the assignment writer, beside the snapshot insert)
- `packages/domain/src/member/read.ts` (`listMemberStatesForPariwar` — the bulk read the scan needs)
- `packages/domain/src/schema/member_search_projection.ts` (sentinel label)
- `packages/domain/src/trustee-lite/violator-flags.ts` (**header prose ONLY — code byte-unchanged**)
- `packages/validity-service/src/{rules,producer,payload,types,service,calendar,index}.ts`
- `packages/contracts/src/members/validity.ts` (the union DTO + the enum widen)
- `apps/api/src/modules/trustee-lite/handlers.ts` (**the ONE 10.11 seam call site**)
- `packages/ui/src/member-status/{presenter,i18n-keys}.ts`,
  `packages/ui/src/contribution-disclosure/{presenter,view-model}.ts`
- `apps/admin/src/modules/{member-status,trustee-lite}/i18n-en.ts`
- `packages/i18n/locales/{en,hi}/common.json`

**Modified — tests + records**
- `packages/validity-service/tests/{redaction,payload}.test.ts`,
  `packages/validity-service/tests/integration/validity-service.spec.ts`,
  `packages/validity-service/tests/bench/p95-budget.md`
- `packages/domain/tests/trustee-lite/violator-flags.test.ts`,
  `packages/domain/tests/integration/member/search-projection.spec.ts`
- `packages/contracts/tests/trustee-lite.test.ts`
- `packages/ui/tests/**` (member-status ×2, contribution-disclosure)
- `apps/admin/tests/**` (×6), `apps/api/tests/integration/trustee-lite/trustee-lite.spec.ts`
- `.decision-log.md` (Decision 2026-08-05-073), `_bmad-output/implementation-artifacts/deferred-work.md`,
  `_bmad-output/implementation-artifacts/sprint-status.yaml`

_(`openapi/v1.yaml` regenerated — byte-identical, so it does not appear as a change.)_

---

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-05 | 1.0 | **Implemented via `bmad-dev-story`.** The `contribution.*` fact producer exists; R7(C)–(F) evaluate; the Trustee-Lite violator section is live. Migration 0093 adds two as-of-correct projections maintained by two deliberately-different mechanisms held observationally equivalent by one shared invariant test. Both mandated revert probes RUN and recorded (removing the applied-filter turned a clean member's zero R7 entries into four). `violator-flags.ts` verified byte-unchanged below its header — 10.11's seam claim held; the whole production change was ONE call site. Found and fixed a real production bug typecheck could not see: `max(timestamptz)` returns a STRING, so the `sql<Date|null>` annotation was a lie and the derivation threw on the live path. Sentinel rename `epic-8-9` → `story-10-24` swept; 10.16's label re-pointed to `story-10-25`. Escalations 1 and 3 raised for BigDev. | Amelia (dev) |
| 2026-08-05 | 0.2 | Four refinements from BigDev at authoring time. (i) **D3 now requires the trigger and the explicit writer to be *observationally equivalent*, proven by ONE shared invariant test** over atomicity / idempotency / replay-equivalence / ordering-independence, plus a fact-level check that incrementally-maintained state and freshly-backfilled state yield identical facts — otherwise two projection styles drift into subtly different guarantees. Promoted into AC1 so it is an acceptance criterion, not only a decision, and into `.decision-log.md` so a future third projection inherits the obligation. (ii) **D5 reframed: `missed-closed-cycle-v1` is a documented, VERSIONED implementation policy — not a temporary placeholder.** It is part of the payload contract the moment it ships (hashed, on the wire, rendered as `holdingSince`), so re-pinning it is a versioned contract change; Escalation 1 now argues the *window* for a cheap re-pin rather than implying disposability. (iii) **AC7 gains an explicit structural criterion — "no new N+1 query path" — as the binding gate**, with a per-path required-shape table and a counted-query assertion (1 vs. N → identical query count); the p95 numbers become corroborating evidence rather than the judgement call a reviewer has to interpret. (iv) **Task order changed: the D2/D4 mechanization moves to Task 1**, ahead of all payload wiring — the constants + totality test + revert probe are pure and dependency-free, so the boundary is green and revert-proven *before* code is shaped around it, instead of retro-fitted into a description of what was built. Task 5 gains a second revert probe for the applied-only filter. | Bob (SM) |
| 2026-08-05 | 0.1 | Story authored via `bmad-create-story` off `main` @ `55aa1cc`. Eight decisions recorded (D1 two as-of-correct projection tables, **D2 applied-only clause contribution via the family ladder — the story's highest-severity finding**, D3 trigger-maintained ledger + explicit assignment writer, D4 omission via `VALIDITY_RULE_ORDER`, D5 the named lapse policy, D6 the sentinel stays reachable, D7 the restoration count belongs to 10.25, D8 no new event type). Ten ACs. Five escalations raised, including the un-pinned `in_lapse` policy and the measured p95 cost of four extra clause evaluations. | Bob (SM) |
