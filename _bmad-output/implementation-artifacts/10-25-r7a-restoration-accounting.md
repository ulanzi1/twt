---
baseline_commit: 8be7669
---

# Story 10.25: R7(A) Restoration Accounting `[PRIMITIVE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the Trust enforcing R7(A)'s lifetime restoration cap,
I want consumed restorations to be counted,
so that the two-lifetime-restoration limit is more than seeded data.

---

## What this story is, in one paragraph

`packages/domain/seed/niyamavali-v1-clauses.sql:38` has encoded R7(A) as
`in_lapse ∧ total_count < 10 ∧ r7a_restorations_used < 2` since Story 4.2. Story 10.24 built the
`contribution.*` fact producer and supplied **five** of the engine's seven keys — deliberately not
this one, because *"nothing in the system records an R7(A) restoration as **consumed**"*
(`epics.md:3943`). Story 4.2 said the same thing in 2026: *"R7(A) restoration **satisfaction**
(counting 3 consecutive contributions, incrementing `r7a_restorations_used`) is a **downstream
workflow**, out of 4.2 scope"* — and named **"Epic 8/9"** as the owner, the exact deferral shape that
produced [[project_r7_fact_producer_unbuilt]]. **This story is the one that owns it.**

Two things ship here, and they are the same computation seen from two ends:

1. **`contribution.r7a_restorations_used`** — the sixth supplied fact. The lifetime count of R7(A)
   restoration packages the member has **completed**.
2. **Story 10.16's `{ remaining, required }`** — how many contributions are left in the package the
   member is *currently* serving. Confirmed as this story's by **Decision 2026-08-05-074** (Story
   10.24's Escalation 3); its i18n copy already ships in `en` **and** `hi`.

Both read the *same* ordered opportunity sequence: one counts **completed** runs, the other measures
the **open** one.

**R7(A) does not activate here.** It needs `member.joining_discipline_state` (Story 10.23) too, and
that is the epic's own wording: *"R7(A) activates **jointly with** Story 10.23's
`member.joining_discipline_state` — this story alone does not light it"* (`epics.md:3950`).

---

## ⚠ Story 10.23 is `backlog`. Read this before planning.

`epics.md:3952` says **"Depends on: Story 10.23, Story 10.24."** 10.24 is `done` at `8be7669`;
**10.23 has not been authored, let alone built.** That is a real ordering problem and it is
recorded here rather than absorbed silently.

**It does not block this story, and here is the precise reason.** Story 10.24 ratified — and
`prd.md:346` makes normative — that **supplying a fact and activating a clause are different acts**:

> You **do** supply `total_count`, `ever_contributed` and `in_lapse` as **facts** — they are honestly
> derived and surfaces read them. What is forbidden is putting `r7-a` / `r7-b` into
> `VALIDITY_RULE_ORDER`. Facts ≠ clause activation.

So this story supplies the fact, lifts **one** of R7(A)'s two named blockers, and leaves R7(A)
**held** on the other. The epic anticipated exactly this outcome.

**What genuinely IS blocked, and must be recorded not quietly skipped:**

| Epic AC (`epics.md:3946-3947`) | Status here |
|---|---|
| *"the accounting couples to Story 10.23's restoration-discipline **overlay** with separate expiry; one clock never absorbs or shortens the other"* | **Cannot be built — the overlay does not exist.** Discharged as a **first-class absent seam** (D5), on the [[project_nominee_vpa_deferred_seam]] pattern: the coupling point is named, typed and unreachable, not faked. |
| *"R7(A) activates jointly with `member.joining_discipline_state`"* | **Correctly not done.** R7(A) stays in `R7_HELD_CLAUSES`, `blockedBy` narrowed to the one remaining fact (AC3). |

**A third blocker exists, and it is NOT a story's** — do not solve it here (Escalation 3): even with
both facts, R7(A) cannot honestly activate until its **clause DATA** stops keying on
`contribution.total_count < 10`, which `prd.md:344` disclaims as *"an implementation proxy, not the
constitutional definition"*. That is a **registry amendment** (a Trustee instrument), not a code
change — [[project_niyamavali_precedence_is_provenance]]: re-tune the DATA, never add engine logic.

⚖ **Owner assigned 2026-08-06 — the Trustee Panel, as a Part 11 amendment** (Decision
**2026-08-06-077**). So R7(A) has **three** activation conditions, not two: both facts supplied
**and** the amended registry version **published**. The third is verifiable rather than assumed,
because the implementation references a registry **version**.

---

## Boundary — read this before anything else

> **This story counts restorations and measures the open package. It does not define who may be
> restored, impose a restoration package, activate R7(A), or emit anything.**

### In scope / out of scope

| In scope (10.25) | Out of scope → owner |
|---|---|
| `contribution.r7a_restorations_used` as the **sixth** `R7_SUPPLIED_FACT_KEYS` entry, derived **as-of** `at`. | `contribution.personal_event_excuse_claimed` (**10.26**) · `contribution.compliance_percent` (R8, **unowned** — `deferred-work.md`). |
| A **named, versioned derivation policy** for "a restoration was consumed" (**D1/D2**), on the `missed-closed-cycle-v1` pattern. | Any **new event type**, any `restorations` table, any write path. 10.24 **D8** carries forward verbatim: projections do not need events. |
| Lighting Story 10.16's `RestorationPackageState.ok` arm with `{ remaining, required }` (Decision 2026-08-05-074). | Story 10.23's **overlay itself**, the `restoration_lock_in` disclosure arm, or anything that sets it (**D5**). |
| Narrowing `R7_HELD_CLAUSES[r7-a].blockedBy` to `['member.joining_discipline_state']` and re-pointing its `owner` (**AC3**). | Adding `r7-a` to `R7_ACTIVATED_CLAUSE_IDS` / `VALIDITY_RULE_ORDER`. **Normatively forbidden** (`prd.md:346`) and mechanically caught. |
| The payload/wire/hash blast radius, **again** — a sixth fact and a new sub-object move every `validityPayloadHash`. | Bumping `POOL_ASSIGNMENT_HASH_VERSION`. 10.17 D3 + 10.24 AC6(c) ratified: the roster reads `isAssignable` **only**; contribution facts cannot move it. |
| The Tier-2 corrections this story makes false (**AC6**). | Populating `member_search_projection.contribution_section` with real facts (still deferred, 10.24). |

---

## Acceptance Criteria

### AC1 — A restoration is consumed on **COMPLETION**, under a named versioned policy ⚖ RATIFIED

**Given** `epics.md:3943` — *"nothing in the system records an R7(A) restoration as **consumed**"* —
and FR-9 (`prd.md:347`): *"R7(A): break before 10 contributions → 3-consecutive-contribution restore;
one-time-only; max 2 lifetime → after that R7(B) applies"*

**Then** `contribution.r7a_restorations_used` = the number of **completed** R7(A) restoration
episodes in the member's lifetime as of `at`, under a **named, versioned implementation policy**
(**D1/D2**) declared exactly as `ContributionLapsePolicy` is:

```ts
/**
 * The v1 R7(A) restoration-accounting policy. A DOCUMENTED, VERSIONED implementation policy — a
 * genuine derivation under an explicit stated rule, NOT a placeholder and NOT provisional. It is part
 * of the payload contract the moment it ships: hashed into `validityPayloadHash`, read by the
 * trustee-lite `factsEstablishing[]`, and (once Story 10.23 lands) consumed by R7(A) — a clause that
 * decides whether a member's restoration path still exists at all.
 *
 * ⚖ RATIFIED 2026-08-06 by BigDev (Decision 2026-08-06-076), at STORY-AUTHORING time — deliberately
 * before implementation and before the fact reached the payload contract, the same lowest-cost-moment
 * argument that governed `ContributionLapsePolicy` on 2026-08-05. Read "v1" as a VERSION, not an
 * expiry date: the cheap-re-pin window is CLOSED and the bar for changing this rule is now HIGHER.
 *
 * ⚠ Any future change SUPERSEDES Decision 2026-08-06-076; it does NOT REINTERPRET it. Historical
 * payloads remain CORRECT under the policy in force when they were produced — they are not re-derived,
 * not re-hashed, and not "corrected" (Decision 2026-08-06-078, the standing principle). So a
 * supersession is never a backfill: re-running this producer over history under a new policy is a
 * separate, data-rewriting act needing its own decision. Decisions are superseded; history is not
 * rewritten. The forward blast radius is migration-shaped either way — every payload hash moves and
 * every cached row is re-shaped.
 *
 * Ratified as policy, NOT as implementation latitude: episodes are RUNS (not `floor(run/required)`),
 * the PRECEDING-MISS gate is load-bearing, and "consecutive" is an OPPORTUNITY-sequence predicate.
 */
export type R7ARestorationPolicy = 'consecutive-opportunity-restoration-v1';
```

**`consecutive-opportunity-restoration-v1`**, stated once, precisely:

> Over the member's **opportunity sequence** (their `member_pool_assignments` rows whose alert reached
> a closed state at/before `at`, ordered by close instant), each opportunity is **TAKEN** (a live
> confirmation at `at`) or **MISSED**. A **completed restoration episode** is a maximal run of
> **≥ `consecutive_required`** consecutive TAKEN opportunities that is **immediately preceded by at
> least one MISSED opportunity**. `r7a_restorations_used` is the **count of such episodes**.

Four consequences, each of which a naive reading gets wrong — **test each independently**:

| Case | Correct answer | Why |
|---|---|---|
| 6 consecutive TAKEN after a MISS | **1**, not 2 | Episodes are **runs**, not `floor(run / 3)`. The member restored once and kept contributing. |
| 10 TAKEN from the very first opportunity, never missed | **0** | The **preceding-MISS gate** is load-bearing. Without it every diligent member reads as having burned restorations and gets pushed toward R7(B) — the harsher clause. |
| MISS, TAKE, TAKE, MISS, TAKE, TAKE, TAKE | **1** | The first run (2) is short of 3. Only the second run completes. |
| MISS, TAKE, TAKE (in progress) | **0** | An **open** package is not a consumed one. It is `{ remaining: 1, required: 3 }` (AC2). |

**And** the derivation is **as-of correct** — `at` in the past returns what was true at `at` — for the
same reason 10.24 AC1 states: `apps/jobs/src/assignable-roster.ts` calls `getValidityAt(..., committedAt)`
and Epic 4 commits *"Replayable for audit"* (`prd.md:425`). A restoration count that only answers
"now" would make an R7(A) finding non-reproducible on the surface that feeds a suspension decision.

**And** the count is **NOT clamped** at 2 in the producer. `lifetime_max: 2` lives in the **clause
data** (`restoration.lifetime_max`), and the clause applies `fact_lt … max: 2`. A producer that
clamps would make "used 2" and "used 7" indistinguishable and would put a governance threshold in
code — precisely what the registry exists to prevent.

### AC2 — "Consecutive" means consecutive **OPPORTUNITIES**, never consecutive ledger rows

**Given** the ratified 2026-08-05 ruling recorded at `producer.ts` (`ContributionFacts.monthsSinceLast`)
— *"Contribution discipline must always be evaluated against contribution **opportunities**, never
against elapsed time alone"* ([[project_contribution_discipline_opportunity_not_elapsed_time]])

**Then** "3 consecutive contributions" is a predicate over the **assigned-and-closed cycle sequence**,
not over `member_contribution_ledger` rows.

**This is the single biggest way this story goes wrong.** Three ledger rows in a row is *not*
3 consecutive contributions if the member was assigned to — and missed — a cycle between any two of
them. Counting ledger rows would hand a restoration to a member who skipped inside their own package.

**And** the constituent predicates are **reused, never re-spelled** — the identical discipline 10.24
enforced and that `live-confirmation-parity.spec.ts` exists to protect:

| Need | Use | Never |
|---|---|---|
| assigned | `member_pool_assignments` (the persisted 7.6 snapshot truth) | a recompute of `assignMembersToPools` |
| cycle closed at `at` | `ALERT_CLOSED_EVENT_TYPES` / `isAlertClosedState` (`contribution/history.ts:95`) | `alerts.current_state` (a **now** cache — it cannot answer "closed at `at`") |
| taken | `liveConfirmationExistsSql` (`facts.ts:80`) | a second reversal reconciliation |
| the episode-opening lapse | a **MISSED opportunity in the sequence** | `contribution.in_lapse` — see below |

> **⚠ `in_lapse` is the wrong gate and it looks right.** `missed-closed-cycle-v1` is scoped to the
> **current IST calendar year**. A member who missed a cycle in December and took the next three in
> January has genuinely completed a restoration; keyed off `in_lapse` the December miss is invisible
> and the episode vanishes on 1 January. The episode-opening lapse is a **sequence** fact, not a
> **year** fact. The two are deliberately different and must not be collapsed.

### AC3 — The fact is supplied; R7(A) stays HELD; the mechanized hold is narrowed, not deleted

**Given** `prd.md:346` is **normative** — R7(A)/(B) MUST NOT be evaluated from the
`total_count < 10` / `ever_contributed == false` proxies — and `member.joining_discipline_state`
does not exist

**Then** `R7_ACTIVATED_CLAUSE_IDS` and `VALIDITY_RULE_ORDER` are **unchanged**. `r7-a` stays in
`R7_HELD_CLAUSES`, with its `blockedBy` **narrowed** and its `owner` re-pointed:

```ts
{
  clauseId: 'niy.contribution-discipline.r7-a',
  blockedBy: ['member.joining_discipline_state'],   // was: + 'contribution.r7a_restorations_used'
  owner: 'story-10-23',                             // was: 'story-10-23 + story-10-25'
},
```

**This edit is not optional — the mechanization forces it, exactly as designed.**
`tests/r7-activation-totality.test.ts` asserts *"every held clause's `blockedBy` names a fact key this
producer genuinely does NOT supply"*. The moment `contribution.r7a_restorations_used` enters
`R7_SUPPLIED_FACT_KEYS`, that test goes **RED** with its own failure message:

> *"…claims to be blocked by `contribution.r7a_restorations_used`, but the producer DOES supply it —
> the hold has outlived its reason and must be re-justified or lifted."*

`deferred-work.md:40` predicted this in writing: *"**Re-trigger:** 10.25 / 10.26 landing; the test
will then fail until the hold is lifted."* **Narrowing the hold is the correct response. Deleting
the R7(A) entry, or adding `r7-a` to `R7_ACTIVATED_CLAUSE_IDS` to make the red go away, is the
failure this whole apparatus exists to catch** ([[feedback_mechanization_split_commitment]]).

**And** the same test's sibling assertions move with it, deliberately and visibly:
- `expect(supplied.length).toBe(5)` → **6**.
- `expect(supplied).not.toContain('contribution.r7a_restorations_used')` → **deleted** (the
  `personal_event_excuse_claimed` line **stays**).
- `R7_HELD_FACTS` (`producer.ts:201`) drops its `story-10-25` entry; `story-10-26` remains.

**And** a **revert-sanity probe is RUN and recorded** ([[feedback_gate_scope_semantic_coverage]] — a
green scan proves nothing): add `'niy.contribution-discipline.r7-a'` to `R7_ACTIVATED_CLAUSE_IDS` →
the totality **and** disjointness assertions must go RED **and** at least one behavioural test must
fail. Restore; record the verbatim counts in the Dev Agent Record.

### AC4 — Story 10.16's restoration-package count lights up — for the packages that have one

**Given** Decision **2026-08-05-074**: *"Story 10.25 is CONFIRMED as the owner of the Story 10.16
restoration-package count. This is no longer an open scope question."*

**Then** `RestorationPackageState` (`packages/ui/src/contribution-disclosure/view-model.ts:53`)
reaches its `ok` arm with `{ remaining, required }`, where:
- `required` = the applied R7 clause's `restoration.consecutive_required` (**from the clause DATA**,
  never a code constant),
- `remaining` = `max(0, required − <length of the member's current open TAKEN run>)` — the same
  sequence AC1 walks, measured at its open end.

**And** the render layer needs **no change**: `RESTORATION_PACKAGE_REMAINING_KEY`
(`i18n-keys.ts:59` = `suspension_disclosure.package_remaining`) already ships with `{remaining}` /
`{required}` interpolation in **both** `packages/i18n/locales/en/contribution.json` **and**
`.../hi/contribution.json`. **Do not author new copy; do not touch `pay.tsx`.** The presenter is
strictly pure `(payload) → view-model`, so the numbers must arrive **on the payload** (AC5).

**And — the finding this AC exists to force into the open (D4).** `{ remaining, required }` only
describes a package measured in **consecutive contributions**, and only three of the seven R7 clauses
have one:

| Clause | `restoration` block (seed) | Has `consecutive_required`? | Activated today? |
|---|---|---|---|
| R7(A) | `{consecutive_required: 3, lock_in_months: 0, one_time_only, lifetime_max: 2}` | ✅ 3 | ⛔ held |
| R7(B) | `{consecutive_required: 5, lock_in_months: 3, core_team_recommendation}` | ✅ 5 | ⛔ held |
| R7(C) | `{consecutive_required: 5, lock_in_months: 3}` | ✅ 5 | ✅ **yes** |
| R7(D) | `{lock_in_months: 3, catch_up_required: true}` | ❌ | ✅ yes |
| R7(E) | `{lock_in_months: 5, complete_all: true}` | ❌ | ✅ yes |
| R7(F) | `{lock_in_months: 5, complete_all: true}` | ❌ | ✅ yes |
| R7(G) | `{never_excuses: true}` | ❌ | ⛔ held |

So the `ok` arm is reachable **today only for a member whose applied clause is R7(C)**. For a member
whose applied clause is R7(D)/(E)/(F) there is no consecutive count to show — and leaving them on
`{ status: 'package_unavailable', producer: 'story-10-25' }` **after this story ships** repeats
exactly the failure 10.24's AC9 corrected: *"an honest sentinel that has quietly become a lie"*,
naming a story that shipped and did not close their case.

**Then** add a **third, honest arm** rather than mislabelling them:

```ts
export type RestorationPackageState =
  | { readonly status: 'package_unavailable'; readonly producer: 'story-10-25' }   // facts un-derivable
  | { readonly status: 'no_consecutive_requirement'; readonly clauseId: string }   // NEW — see below
  | { readonly status: 'ok'; readonly remaining: number; readonly required: number };
```

`no_consecutive_requirement` says the true thing: *this member's restoration package is not measured
in consecutive contributions*. `package_unavailable` **stays** and stays reachable — it is the answer
when the facts themselves are un-derivable (the coverage watermark, AC7), which is a different claim.
Its `producer` literal stays `'story-10-25'`: this story is its producer, and a per-member gap in a
shipped producer is honest (10.24 **D6**).

**And** the new arm needs one i18n key in **`en` and `hi`** (the only new copy in this story), routed
through `docs/tone-guide.md` — AC5 of Story 10.16 forbids copy that characterises the member's
standing as a moral failing.

### AC5 — The payload carries it, and the blast radius is discharged

A sixth fact plus a restoration-package sub-object moves **every** `validityPayloadHash`. Four
consequences, each discharged explicitly — the 10.24 AC6 checklist, re-run:

**(a) The fact rides the existing `facts` map.** `contributionFactsToBag` /
`contributionFactsToSummary` gain the key from `R7_CONTRIBUTION_FACT_KEYS.R7A_RESTORATIONS_USED`
(**never a re-spelled literal**). Because `facts` is keyed by the dotted values,
`deriveViolatorFlags`'s `startsWith('contribution.')` filter picks it up into `factsEstablishing[]`
with **zero** change to `packages/domain/src/trustee-lite/violator-flags.ts` — which stays **frozen**
(10.24 AC5; if it needs a change, that is a **finding**, not a task).

**(b) The package count is a NEW field on `ContributionHistoryAvailable`**, not a fact key:

```ts
export interface ContributionHistoryAvailable {
  status: 'ok';
  facts: Readonly<Record<string, number | boolean>>;
  lapseSince: string | null;
  heldFacts: readonly { readonly key: string; readonly producer: string }[];
  /** The restoration package the member is CURRENTLY serving, or an honest degraded arm (AC4). */
  restorationPackage: RestorationPackageState;   // NEW
}
```

⚠ **Field position matters** — the hash is order-sensitive (`payload.ts`, the 4.6 canonical-JSON
contract). Append; do not reorder existing fields. The contracts DTO
(`packages/contracts/src/members/validity.ts`) mirrors it as a **`.strict()` discriminated union**,
`openapi/v1.yaml` is regenerated and `contracts:check-openapi-determinism` runs. *(A byte-identical
regen is the expected outcome — the 4.6 payload was never registered in the hand-curated emitter,
10.17's finding. Record it; do **not** "fix" the emitter here.)*

**(c) Cache epoch — verify, do not re-build.** Migration `0093`'s second AFTER-INSERT trigger already
invalidates on the `contribution.*` / `reconciliation.confirmation-reversed` families keyed on
`payload->>'memberId'`, so a confirmation that changes a restoration run already evicts the member's
cache row. **Prove it still holds for this fact** (one test); do **not** add a third trigger, and do
**not** re-open adding a payload-shape component to the frozen 4.8 cache key — **10.17 D5 rejected
that by name** and 10.24 re-rejected it.

**(d) Deploy window, accepted — not a defect.** For ≤ `VALIDITY_CACHE_TTL_SECONDS` (60 s) after
rollout, a warm pre-deploy cache row holds the **old-shaped** JSONB and the `.strict()` DTO can 500.
Zero-window lever, documented as a deploy step exactly as 10.24 did:
`POST /api/v1/p/:pariwarId/admin/validity-cache/invalidate-all`
(`apps/api/src/modules/member-validity/routes.ts:68`).

**(e) `POOL_ASSIGNMENT_HASH_VERSION` is NOT bumped.** Same proof as 10.24 AC6(c): the roster reads
`payload.isAssignable` and nothing else (AI-7-2 as amended by 10.17), and `deriveIsAssignable` is a
function of lifecycle state + moderation status only. The existing
`tests/integration/pool/assignment-version-pin-replay.spec.ts` must stay green **unchanged** — if it
needs an edit, that is a finding.

### AC6 — Tier-2 reconciliation: every claim this story falsifies is corrected in place

| Site | What stops being true |
|---|---|
| `packages/validity-service/src/producer.ts:179-199` (doc comment + `R7_SUPPLIED_FACT_KEYS` at `:193`) | *"EXACTLY five of the engine's seven"* + the two-owner list — now six, one owner left. |
| `packages/validity-service/src/producer.ts:201-206` (`R7_HELD_FACTS` at `:202`) | Drops the `story-10-25` entry. |
| `packages/validity-service/src/rules.ts` (`R7_HELD_CLAUSES`, header prose) | R7(A)'s hold now rests on **one** fact (AC3). |
| `packages/niyamavali-engine/src/r7-ladder.ts` (`R7_CONTRIBUTION_FACT_KEYS.MONTHS_SINCE_LAST`) | *"int — **CALENDAR** months since last contribution"* — **already false at `8be7669`**: 10.24's round-2 Decision 1 made it opportunity-aware. A stale claim of exactly the class three review rounds kept finding. Correct the **comment only**; the fact-contract constants are frozen. |
| `packages/domain/src/contribution/facts.ts:8-19` | The *"TWO queries, always"* budget note — restate against whatever this story actually ships (**D3**: still two). |
| `packages/ui/src/contribution-disclosure/{presenter,view-model}.ts` | The *"the ONLY `restorationPackage` value reachable today"* / *"DECLARED AND UNREACHABLE"* narration. |
| `packages/domain/seed/niyamavali-v1-clauses.sql:220-222` | *"R7(A) restoration SATISFACTION … is a downstream **Epic 8/9** workflow"* — the original unowned-epic pointer. Re-point to `story-10-25`. **Comment only — the clause JSONB is a governance instrument and is NOT edited here** (Escalation 3). |
| `_bmad-output/implementation-artifacts/deferred-work.md:36-40` | The 10.24 hold entry — record the 10.25 half **discharged**, the 10.26 half **still open**. |

**And** `grep -rn "story-10-25"` across `packages` + `apps` (excluding `dist`) returns only sites
where this story is genuinely the producer — every *"a future story will do this"* reference is gone.

### AC7 — Un-derivable stays un-derivable; zero stays different from unknown

**Given** 10.24 **D6** and the ratified *"Unknown projection state must never fabricate a clean
member"* (2026-08-05)

**Then** `r7a_restorations_used` is supplied **only** on the path that already passes the coverage
watermark. `deriveContributionFacts` returning `null` (no `contribution_projection_coverage` row for
the Pariwar, or `at < covered_from`) continues to yield the `producer_unavailable` sentinel — the new
fact **never** appears as a fabricated `0` for a member whose history was not projected.

**And** the honest limit is **recorded, not hidden** (Escalation 5): the count is only as deep as the
backfill horizon. A restoration completed before `covered_from` is not counted — and the sentinel,
not a wrong number, is the answer for any `at` in that window. `0` means *"projected, and none
completed"*; the sentinel means *"we do not know"*. Collapsing them on a clause that decides whether
a member's restoration path still exists would be the same class of error the watermark was built to
end.

### AC8 — Bounded reads: fold into the existing scan, do not add a query

**Given** AC7 of Story 10.24 — the binding structural gate is **"is there a query inside a loop over
members, pools or clauses?"**, a yes/no a reviewer can check from the diff alone

**Then** the restoration-run computation is folded into the **existing single scan** in
`missedCycleAggregateSql` (`facts.ts:174`) — **not** added as a third query (**D3**). Both the
single-member and the `GROUP BY member` bulk shapes keep their **two-query** budget, and the trustee-
lite candidate scan stays bounded over the Pariwar.

**And** the existing **counted-query assertion** (1 vs. N contributions/assignments → *identical*
query count) is extended to cover fixtures with 0, 1 and several completed restoration episodes and
must still report **exactly two**. A counted assertion survives a refactor that a comment does not.

**And** the AI-4-1 p95 harness and the **100×-thread determinism gate** are re-run, with a versioned
record appended to `packages/validity-service/tests/bench/p95-budget.md`
([[project_measured_validation_framework]] — reuse the harness, never build a second one). The
determinism gate must report **exactly ONE hash**; any variance is a **P0**.

### AC9 — Validation

`pnpm turbo run typecheck` · `lint` · `pnpm --filter @twt/validity-service test:determinism` ·
`contracts:check-openapi-determinism` · `pnpm domain-invariants:check` · `pnpm ci:local` (with **and**
without `DATABASE_URL`).

A live-DB failure here is **not presumptively innocent** — this story changes a payload shape many
specs read. Chase each to root cause; the known signatures are
[[project_ci_local_concurrency_oversubscription]] (a *different* victim each run, always
timing-shaped) and [[project_ci_local_double_run_pollution]]. Confirm innocence by running the suspect
spec **in isolation** ([[project_known_livedb_test_failures]]). Capture a **baseline before any edit**
so an inherited flake is not later attributed to this work.

---

## Load-Bearing Decisions

### D1 — ⚖ **RATIFIED 2026-08-06 by BigDev** (Decision **2026-08-06-076**). A restoration is consumed on **COMPLETION**, not on grant.

The epic says *"this story defines that instrument"* and defining it means choosing the increment
point. Three readings exist; only one survives the constitution.

| Reading | Increment when | Verdict |
|---|---|---|
| **(a) On grant** | R7(A) applies (the member lapses with the R7(A) population) | ❌ A member who lapses twice and never cures has "used" two restorations they never received, and is pushed to R7(B) — **harsher** — having never been restored. The fact is named `restorations_**used**`. |
| **(b) On COMPLETION** ⚖ **RATIFIED** | the member finishes `consecutive_required` consecutive taken opportunities after a lapse | ✅ Matches FR-9's *"3-consecutive-contribution restore … max 2 lifetime → after that R7(B) applies"* and §8.3's `rule-clearance`. |
| **(c) On imposition** | a trustee formally imposes the package | ❌ No such act exists (10.23 would own it), and D1 of the moderation brief is explicit that a restoration package arises from **§3.1 evaluation**, independent of any trustee act. |

**The abuse case (b) is accused of and survives.** *"Could a member lapse, start a package, abandon
it, and never burn a restoration?"* Yes — and they stay **in lapse** the whole time, so R7(A) keeps
applying and they remain a violator candidate on the trustee surface. The cap exists to stop **serial
lapse-restore-lapse cycling**, which (b) counts exactly. Nothing is bought by punishing an
uncompleted attempt, and (a) would silently convert the cap into a lapse counter. **This reasoning is
part of the ratified decision, not a note beside it** — the abuse case was weighed and rejected as a
reason to change the increment point.

**⚖ RATIFIED 2026-08-06 by BigDev (Decision 2026-08-06-076), at authoring time — before implementation
and before the fact reaches the payload contract.** That timing is the same argument that governed
`contribution.in_lapse` on 2026-08-05, and it has the same consequence, which runs opposite to how
"v1" usually reads: **the cheap-re-pin window is now CLOSED and the bar for changing this policy is
HIGHER, not lower.** Once shipped it is payload contract; once R7(A) activates it is consumed by
member **eligibility**. A re-pin is a governance change requiring a decision-log entry that supersedes
2026-08-06-076 — never a refactor, never an *"it was only v1"* edit.

> **⚠ And supersession is not reinterpretation** (Decision **2026-08-06-078**, the standing
> principle). Any future change **supersedes** 2026-08-06-076; it does **not re-read** it as having
> always meant the new thing. **Historical payloads remain correct under the policy in force when they
> were produced** — not re-derived, not re-hashed, not "corrected". A policy supersession is therefore
> **never a backfill**: re-running this producer over history under a new policy is a separate,
> data-rewriting act that needs its own decision. *Decisions are superseded; history is not rewritten.*

Three elements of
`consecutive-opportunity-restoration-v1` are **ratified policy, not implementation latitude**:
episodes are **runs** (not `floor(run / required)`), the **preceding-MISS gate** is load-bearing, and
"consecutive" is an **opportunity-sequence** predicate. Carry that framing into the doc comment
verbatim in substance — do not weaken it.

### D2 — ⭐ RECOMMENDED. A PURE derivation over the 10.24 projections. **No new event, no new table.**

The instrument this story "defines" is a **named versioned derivation policy**, not a new substrate.
That is the shipped house pattern twice over — `LapseNettingPolicy` (Story 4.6) and
`missed-closed-cycle-v1` (Story 10.24 D5) — and 10.24 **D8** ruled the general form:

> *"If you find yourself wanting to emit a `contribution.fact-*` event, stop — that is a projection,
> and projections do not need events."*

Everything the derivation needs already exists in `member_pool_assignments` × `member_contribution_ledger`
× the alert stream. A derivation gets **as-of correctness, replayability and idempotency for free**;
a new event or table would have to earn all three and would put a second writer on the correctness
path. **No migration is expected in this story.** If one becomes necessary, that is a design change
worth escalating — and it must be hand-authored (never `db:generate`: the drizzle baseline is frozen
at `0020` and a regenerate raises `42P07`, [[project_live_db_test_gotchas]]).

**Explicitly REJECTED — counting `member.moderation.restored` events.** A `rule-clearance` restore
(`reason-codes.ts:121`) looks like the obvious source and is wrong **in both directions**:
- **Under-counts.** Per the moderation brief **D1**, a restoration package arises from §3.1
  evaluation and is *"a separate, discretionary trustee act"* from §8.2 suspension. A member can
  complete R7(A) having never been suspended, so no moderation event exists to count.
- **Over/mis-counts.** `rule-clearance` is not R7(A)-specific, and a `trustee-discretion` restore
  consumes **no** restoration at all. A moderation restore is a *consequence* of clearing a rule, not
  the record of which rule was cleared.

### D3 — Fold the run computation into the existing scan; keep the two-query budget.

`missedCycleAggregateSql` (`facts.ts:174`) already scans exactly the right rows — but its `WHERE`
carries `AND NOT ${liveConfirmationExistsSql('mpa', at)}`, so **TAKEN opportunities never reach the
result set** and runs cannot be seen.

**The shape:** relax that `WHERE` to admit **every** assigned-and-closed opportunity, push the missed
predicate down into each existing `FILTER (...)` clause (so `skips_current_year`,
`earliest_skip_closed_at` and `opportunities_since_last` are **bit-for-bit unchanged**), and compute
the runs over the same scan with window functions in a wrapping CTE — the standard gap-and-islands
form (`row_number()` partitioned by member, ordered by close instant; island key = row number minus a
running count of taken rows). **One statement**, both the single-member and `GROUP BY member` shapes.

⚠ Relaxing that `WHERE` is the riskiest edit in the story: the three existing aggregates must be
proven unchanged, not assumed. **Pin them first** — run the 10.24 fact tests **before** touching the
SQL and require byte-identical fact output for every existing fixture afterwards.

⚠ Ordering must be **total and deterministic** — a tie on close instant between two opportunities
must not make the run count depend on scan order. Order by `(closed_at, pool_id)`; the payload hash
is behind a 100×-thread P0 gate.

### D4 — The `ok` arm does not fit every package. Add an honest third arm.

See AC4's table. `{ remaining, required }` is a **consecutive-contribution** shape; R7(D)/(E)/(F) —
the majority of what is activated today — prescribe `lock_in_months` + `catch_up_required` /
`complete_all` instead. Three routes were considered:

| Option | Verdict |
|---|---|
| Leave R7(D)/(E)/(F) members on `package_unavailable` | ❌ The producer named there has **shipped**. This is precisely the "honest sentinel quietly becomes a lie" failure 10.24 AC9 was written to fix. |
| Widen the `ok` arm to a union of package shapes (lock-in months, catch-up, complete-all) | ❌ Scope creep into 10.16's contract and, for lock-in shapes, into **10.23's** instrument. Ship the count that is owned; do not model packages nobody asked for. |
| **A third `no_consecutive_requirement` arm** ⭐ | ✅ Says the true thing, keeps the render layer's two existing keys intact, and leaves the lock-in-shaped disclosure to 10.23 where it belongs. |

⚠ **Escalation 2**: the arm is a small addition to a **shipped** view-model contract. Recommended and
built; flagged because 10.16's own AC4 pinned that union.

### D5 — Story 10.23's overlay coupling: a FIRST-CLASS ABSENT SEAM.

The epic AC requires coupling to an overlay that does not exist. The house answer is the Story 8.4
nominee-VPA posture ([[project_nominee_vpa_deferred_seam]]): **the seam is absent and absent
first-class** — named, typed, unreachable, and never faked.

Concretely: this story writes **no** overlay, reads **no** overlay signal, and does **not** touch
`isUnderRestorationDisciplineLockIn` / `RESTORATION_LOCK_IN_FLAG`
(`contribution-disclosure/presenter.ts`). The `restoration_lock_in` disclosure arm stays structurally
complete and out of force. What this story **does** owe 10.23 is a recorded, non-negotiable
constraint at the definition site:

> **Non-subsumption ([[project_moderation_model_correct_course]], brief §1d / D8).** Joining
> discipline and restoration discipline are independent instruments that run **concurrently**.
> `r7a_restorations_used` counts **completed restoration episodes** and nothing else; it must never be
> derived from, shortened by, or folded into a joining-discipline clock — **and Story 10.23's overlay
> must not read this count as its own expiry.** One clock never absorbs the other.

That sentence is the coupling, discharged as far as it can honestly be discharged today.

### D6 — Facts ≠ clause activation, restated because this is the tempting moment.

Every previous story could say *"R7(A) is dark because a fact is missing."* After this story that
sentence is **half** true, and half-true is how a normative prohibition gets rationalised away.
`prd.md:346` is unchanged and unconditional; the remaining blockers are
`member.joining_discipline_state` (10.23) **and** the published clause-data amendment (Trustee Panel,
Decision 2026-08-06-077). The
mechanization in AC3 is what makes this survive the temptation — trust it, and when it goes red,
narrow the hold rather than lifting it.

---

## Escalations owed (raise them; do not silently absorb)

1. **✅ RESOLVED 2026-08-06 — the increment point (D1/AC1). BigDev RATIFIED COMPLETION**
   (Decision **2026-08-06-076**), and `consecutive-opportunity-restoration-v1` is the ratified
   versioned implementation policy. **Closed by ratification, not by deferral**
   ([[feedback_closure_language_precision]]) — and closed *at authoring time*, before implementation
   and before the fact reached the payload contract, which is the same lowest-cost-moment argument
   Decision 2026-08-05-074 used for `contribution.in_lapse`. Note the direction: the cheap-re-pin
   window is now **CLOSED** and the bar for changing this rule went **UP**. Record it at the definition
   site and pin it with a test that states why the literal is not free to move. **The producer still
   does not clamp at 2** (Escalation 4 stands).
2. **The third `RestorationPackageState` arm (D4/AC4).** An addition to a shipped view-model union.
   Recommended, built, flagged.
3. **✅ RESOLVED 2026-08-06 — R7(A)'s clause DATA has an OWNER** (Decision **2026-08-06-077**).
   Closed by **owner assignment**, not by deferral ([[feedback_closure_language_precision]]). Raised
   because it was the same shape as the failure 10.24 spent three review rounds closing — a real
   obligation with no story that owns it ([[project_r7_fact_producer_unbuilt]]) — and corrected
   **before** the second occurrence rather than after it.

   | | |
   |---|---|
   | **Owner** | the **Trustee Panel**, as a **Part 11 amendment**. Deliberately not a story: the R7(A) population is a constitutional definition and no engineering story is competent to set it. |
   | **Deliverable** | a ratified amendment to the R7(A) registry clause replacing the proxy population with the **constitutional joining-discipline criterion**. |
   | **Implementation dependency** | Story **10.23** supplies `member.joining_discipline_state`; Story **10.25** consumes the amended registry **when published**. |
   | **Completion** | Trustee Panel ratifies → registry version **published** → implementation references the new version. |

   **What this means for this story:** nothing changes in scope — 10.25 still supplies the fact and
   narrows the hold. But R7(A) now has **three** conditions for activation, not two, and the third is
   verifiable as *published* rather than merely intended, because the implementation references a
   registry **version**. `R7_HELD_CLAUSES` stays the mechanized record of the hold. The amendment is
   **not** blocked on the code, and the code must **not** proceed without it.
4. **`lifetime_max: 2` vs. the uncapped fact.** The producer deliberately does not clamp (AC1). If
   the Trustee Panel ever wants "restorations remaining" surfaced, it is `lifetime_max − used` read
   from the clause data — never a producer-side clamp. Recorded so a future reader does not "fix" the
   uncapped count.
5. **The backfill horizon bounds restoration history (AC7).** Restorations completed before
   `covered_from` are invisible, and no production data exists to measure the real depth. Record
   **un-attested**; never backfill a number ([[feedback_record_unattested_no_backfill]]).

---

## Tasks / Subtasks

### Task 0 — Orient; confirm nothing moved under you (AC: all)
- [x] `git fetch origin`; confirm `main` is `8be7669` and the tree is clean
      ([[feedback_git_fetch_before_remote_reasoning]]). Branch from `main` — **not** from
      `feat/10-24-contribution-fact-producer`.
- [x] Re-verify live before citing: `producer.ts:180-205`, `rules.ts` (`R7_HELD_CLAUSES`),
      `facts.ts:174` (`missedCycleAggregateSql`), `contribution-disclosure/{presenter,view-model}.ts`,
      `r7-activation-totality.test.ts`. Record any drift ([[feedback_verify_before_committing_governance_claims]]).
- [x] Confirm `10-23` and `10-26` are still `backlog` — this story must not assume either landed.
- [x] Capture a `pnpm ci:local` **baseline** (with and without `DATABASE_URL`) **before any edit**.

### Task 1 — ⭐ FIRST: pin the existing facts, then relax the scan (AC: 2, 8; D3)

**Deliberately first.** D3 relaxes a `WHERE` that three shipped aggregates depend on. Doing this
before anything else means the regression surface is proven flat while the diff is still small.

- [x] Run the 10.24 fact suites and **record the exact pass counts** as the pin:
      `packages/validity-service/tests/contribution-facts.test.ts`,
      `tests/integration/contribution-facts.spec.ts`,
      `packages/domain/tests/integration/contribution/projection-equivalence.spec.ts`.
- [x] Relax `missedCycleAggregateSql`'s `WHERE` to admit every assigned-and-closed opportunity; push
      the missed predicate into each existing `FILTER (...)`. **`skips_current_year`,
      `earliest_skip_closed_at` and `opportunities_since_last` must be byte-identical** for every
      existing fixture.
- [x] Re-run the pinned suites. **Any diff is a P0 stop**, not a fixture update.
- [x] Total, deterministic ordering — `(closed_at, pool_id)` — so a tie cannot make the count
      scan-order dependent (the 100×-thread hash gate).

### Task 2 — The restoration-run derivation (AC: 1, 2, 7, 8; D1, D2, D3)
- [x] Add the gap-and-islands run computation to the **same statement** (single-member **and**
      `GROUP BY member` shapes). Aggregate in SQL — never fetch rows to count them in JS.
- [x] `facts.ts` returns two new anchors on `ContributionFactInputs`: the count of completed episodes
      and the length of the **current open** TAKEN run (AC4 needs the second).
- [x] `producer.ts` — declare `R7ARestorationPolicy` / `R7A_RESTORATION_POLICY` with the AC1 doc
      comment **verbatim in substance** (the versioned-payload-contract framing, not a placeholder
      framing), and derive the fact **purely**.
- [x] Unit-test each AC1 case DB-free: 6-after-a-miss → **1**; never-missed → **0**; short run then
      long run → **1**; in-progress → **0**; reversal turning a TAKEN into a MISS mid-run → the run
      breaks; not-assigned → not an opportunity; open cycle → not an opportunity.
- [x] Pin the **`in_lapse` trap** explicitly (AC2): a December miss + three January takes → **1**,
      evaluated at an `at` in January, when `in_lapse` is `false`.
- [x] Coverage-watermark gate unchanged: no coverage → the sentinel, never a fabricated `0` (AC7).
- [x] Extend the **counted-query assertion**: 0 / 1 / several episodes → still **exactly two** queries.
- [x] Type the new `row_number()`/count/window-function columns against their **actual node-postgres
      driver shape**, not the intended TS type, and normalize explicitly at the call site (the same
      fix 10.24 applied via `toDate` after `max(<timestamptz>)` came back as a string and passed
      typecheck while throwing on the live path).

### Task 3 — The activation/hold narrowing and its mechanization (AC: 3, 6)
- [x] `producer.ts` — `R7_SUPPLIED_FACT_KEYS` gains `R7A_RESTORATIONS_USED`; `R7_HELD_FACTS` drops
      `story-10-25`.
- [x] `rules.ts` — narrow `R7_HELD_CLAUSES[r7-a].blockedBy` to `['member.joining_discipline_state']`
      and `owner` to `'story-10-23'`. **`R7_ACTIVATED_CLAUSE_IDS` and `VALIDITY_RULE_ORDER` are
      untouched.**
- [x] `r7-activation-totality.test.ts` — `5` → `6`, delete the `r7a` `not.toContain` line, keep the
      `personal_event_excuse_claimed` line. The falsifiable-hold and totality assertions stay green
      **on their own terms**, not by weakening them.
- [x] **Revert-sanity probe, RUN and recorded** (AC3): add `r7-a` to `R7_ACTIVATED_CLAUSE_IDS` → RED
      on totality + disjointness + at least one behavioural test. Restore; verbatim counts in the Dev
      Agent Record.

### Task 4 — The payload, the wire, the disclosure (AC: 4, 5; D4, D5)
- [x] `types.ts` — `ContributionHistoryAvailable` gains `restorationPackage` (**appended**, never
      reordered). `producer.ts` — `contributionFactsToBag` gains the fact key from the engine constant;
      `contributionFactsToSummary` populates the new field.
- [x] Resolve `required` from the applied R7 clause's `restoration.consecutive_required`
      (**clause DATA**, via the already-resolved ladder result — never a code constant, never a second
      registry read).
- [x] `view-model.ts` — add the `no_consecutive_requirement` arm (**D4**); rewrite the
      *"DECLARED AND UNREACHABLE"* narration. `presenter.ts` — map the payload arm through;
      `isUnderRestorationDisciplineLockIn` and `RESTORATION_LOCK_IN_FLAG` stay **untouched** (**D5**).
- [x] `contracts/src/members/validity.ts` — mirror as a `.strict()` union; regenerate `openapi/v1.yaml`;
      `contracts:check-openapi-determinism`. **Contracts must not import `@twt/domain`**
      ([[project_contracts_domain_bundle_boundary]]).
- [x] ONE new i18n key for the third arm, in **`en` and `hi`**, routed through `docs/tone-guide.md`.
      **Do not** re-author `suspension_disclosure.package_remaining` — it already ships in both.
- [x] `member-status/presenter.ts:215` — `heldFacts` now renders one entry; update its tests.
- [x] Confirm `redaction.ts` treats the new field correctly (contribution facts are **non-PII member
      standing**, not State-Trustee-only) and add a positive redaction pin.

### Task 5 — Blast radius (AC: 5, 8)
- [x] Test that migration `0093`'s existing invalidation trigger still evicts on a confirmation that
      moves a restoration run. **No third trigger. No cache-key change** (10.17 D5, re-rejected).
- [x] `assignment-version-pin-replay.spec.ts` stays green **unchanged**;
      `POOL_ASSIGNMENT_HASH_VERSION` still `'v1'`.
- [x] Deploy note (the ≤60 s shape window + the `invalidate-all` lever) in `deferred-work.md` and the
      Dev Agent Record.
- [x] Re-run the AI-4-1 p95 harness + `test:determinism` (**exactly ONE hash**); append the versioned
      record to `p95-budget.md`.

### Task 6 — Tier-2 reconciliation (AC: 6)
- [x] Every row of the AC6 table, corrected **in place**.
- [x] `grep -rn "story-10-25"` over `packages` + `apps` (excluding `dist`) — every remaining hit is a
      site where this story genuinely IS the producer.
- [x] Existing fixtures that hardcode the held-fact set: `redaction.test.ts:71`,
      `contribution-facts.test.ts:247,256,258,261`,
      `tests/integration/validity-service.spec.ts:218`. These **fail loudly** on the change — that is
      the mechanization working; update them to the new truth, never to silence them.

### Task 7 — Measure, then validate (AC: 8, 9)
- [x] **The N+1 review pass first** — walk the whole diff for a query inside a loop over members,
      pools or clauses. Structural gate; the numbers corroborate.
- [x] Full AC9 validation, both `DATABASE_URL` modes. Chase every live failure to root cause; confirm
      innocence in isolation. Record anything not run as **un-attested**
      ([[feedback_record_unattested_no_backfill]]).

### Task 8 — Governance records
- [x] `.decision-log.md` — **D1 is ALREADY RECORDED as Decision 2026-08-06-076** (ratified at
      authoring); cite it, do not re-litigate or duplicate it. Add the implementation record for D2
      (derivation, no new event/table), D3 (the scan relaxation + the unchanged-aggregates obligation),
      D4 (the third arm) and D5 (the 10.23 non-subsumption constraint).
- [x] `deferred-work.md` — the 10.24 hold entry's **10.25 half discharged / 10.26 half open**;
      Escalation 3 (the R7(A) clause-data amendment — **owner already assigned**, Decision
      2026-08-06-077: cite it and its completion criteria, do not re-open the ownership question),
      plus 4 and 5.
- [x] `sprint-status.yaml` — one combined `ready-for-dev → in-progress → review` ledger entry at
      completion ([[project_sprint_status_ledger]]).
- [x] Update [[project_r7_fact_producer_unbuilt]] and
      [[project_contribution_fact_projection_substrate]] — both become stale the moment this merges.

---

### Review Findings

_Code review (2026-08-06) — Blind Hunter + Edge Case Hunter + Acceptance Auditor, triaged against the diff and this spec._

**Acceptance Auditor: all 9 ACs verified, zero violations.** Two disclosed, tested, reasoned variances from illustrative spec text (extra registry read in `resolveAppliedRestoration`; `clauseId: string | null` vs the AC4 snippet's bare `string`) — both already recorded as Decision 2026-08-06-079 points 3/5 and covered by tests. Not defects.

- [x] [Review][Patch] Bare `::int` cast on `restoration.consecutive_required` crashes the whole fact read on malformed clause data — [packages/domain/src/contribution/facts.ts:192-200]. Fixed: guarded with a `CASE WHEN ... ~ '^[0-9]+$'` check that degrades to `NULL` on non-numeric payload data, matching `readConsecutiveRequired`'s JS-side behavior. Re-verified live: `tests/integration/contribution-facts.spec.ts` (29/29 passed).
- [x] [Review][Patch] `RESTORATION_PACKAGE_NO_CONSECUTIVE_KEY` constant name drops "REQUIREMENT" — [packages/ui/src/contribution-disclosure/i18n-keys.ts:79-80]. Fixed: renamed to `RESTORATION_PACKAGE_NO_CONSECUTIVE_REQUIREMENT_KEY` across `i18n-keys.ts`, `index.ts`, `SuspensionDisclosure.tsx`, and the mobile source-scan test. Re-verified: `presenter.test.ts` (24/24) and `pay-screen-disclosure-render.test.ts` (21/21) passed.
- [x] [Review][Patch] Non-exhaustive ternary over the 3-arm `restorationPackage.status` union — [apps/mobile/components/active-contribution/SuspensionDisclosure.tsx:115-117]. Fixed: extracted to a `degradedRestorationKey` switch with a `never`-typed exhaustiveness check on the default case. Re-verified: `pay-screen-disclosure-render.test.ts` (21/21) passed; `tsc --noEmit` clean on `@twt/mobile` and `@twt/ui`.
- [x] [Review][Defer] `r7aConsecutiveRequiredSql` executes twice per single-member read across two un-transactioned statements [packages/domain/src/contribution/facts.ts:158,366] — deferred, documented two-query-budget tradeoff (D3); a clause-version change between the two reads could pair a run count with a different resolved threshold. Narrow race, not fixed here — flagged as a follow-up (thread the JS-resolved value into `missedCycleAggregateSql` instead of re-embedding the subquery).
- [x] [Review][Defer] `resolveAppliedRestoration`/`restorationOfPick` collapse "clause applied but payload vanished from the registry mid-read" into the same `null` as "no clause applied at all" [packages/validity-service/src/rules.ts:350-361] — deferred, pre-existing framing choice; only reachable at a live (non-historical) `at`, and the code's own comment already names the window. Worth a sharper distinction if the race is ever observed.
- [x] [Review][Defer] `deriveRestorationPackage`'s `consecutiveRequired <= 0` branch is unreachable from any real caller [packages/validity-service/src/producer.ts:572] — deferred, harmless defensive redundancy; `readConsecutiveRequired` (its only real source) already filters non-positive values to `null`.
- [x] [Review][Defer] R7(A)'s clause id is re-spelled as a raw string literal in multiple places instead of one shared exported constant [packages/domain/src/contribution/facts.ts:63, packages/validity-service/src/rules.ts:127] — deferred, pre-existing repo-wide convention (same pattern in `r7-ladder.ts:108`, `violator-flags.ts:70`), out of scope for this story.
- [x] [Review][Defer] Admin panel test fixtures updated for type compatibility only, no assertion that the new fields render [apps/admin/tests/member-status-panel.test.tsx:88-131] — deferred, real coverage gap; `member-status/presenter.ts` now threads `r7aRestorationsUsed` into panel data but no test confirms it surfaces.
- [x] [Review][Defer] `RestorationPackagePayload` and `RestorationPackageDto` independently declare the same union shape with no parity test [packages/validity-service/src/types.ts:150, packages/contracts/src/members/validity.ts:96] — deferred, unlike this diff's other cross-checked dual-spelling pairs (SQL/pure, SQL-threshold/registry-read).
- [x] [Review][Defer] `resolveByClauseId` rejection in `resolveAppliedRestoration` is an unhandled-rejection path [packages/validity-service/src/rules.ts:358] — deferred, pre-existing pattern shared by the frozen `ladder.ts:219`'s identical unguarded call; not a regression introduced here.
- [x] [Review][Defer] SQL vs. pure-reference divergence when `consecutiveRequired` resolves to ≤0 [packages/domain/src/contribution/facts.ts:362-367 vs 413-439] — deferred, confirmed harmless in production (`deriveContributionFacts` discards the SQL-side count whenever the threshold is non-positive), but the "SQL === PURE" pinned-test invariant doesn't exercise this degenerate case.

Dismissed as noise (5): mobile source-scan test methodology (documented, established 7th-of-its-kind pattern in the file's own header); self-ratified "Trustee-ratified" decision-log entries (established repo-wide documentation convention, not unique to this diff); documentation volume/narrative tone (same); claim that `readContributionProjectionCoverage → readContributionProjectionContext` breaks external callers (verified false — one internal call site, already updated in this diff); Acceptance Auditor's two disclosed variances (already reasoned and tested, judged non-defects by the auditor itself).

---

## Dev Notes

### The five files you must read before writing a line

1. `packages/domain/src/contribution/facts.ts` — `missedCycleAggregateSql` (`:174`) is the statement
   you extend; `liveConfirmationExistsSql` (`:80`) and `ALERT_CLOSED_EVENT_TYPES` (`:63`) are the
   predicates you **reuse**; the header states the two-query budget you must keep.
2. `packages/validity-service/src/producer.ts` — `ContributionLapsePolicy` (`:207-245`, the doc
   comment **and** the type) is the exact posture to mirror; `deriveContributionFacts` is where the
   fact is derived; `R7_SUPPLIED_FACT_KEYS` (`:193`) / `R7_HELD_FACTS` (`:202`) are the contract you
   widen.
3. `packages/validity-service/src/rules.ts` — `R7_HELD_CLAUSES` / `R7_ACTIVATED_CLAUSE_IDS` /
   `VALIDITY_RULE_ORDER`. Read `prd.md:346` beside it.
4. `packages/validity-service/tests/r7-activation-totality.test.ts` — **read it as the specification
   of what you are allowed to do**, not as a test to update.
5. `packages/ui/src/contribution-disclosure/{view-model,presenter}.ts` — the consumer contract and
   the D5 seam you must not disturb.

Also read, for the governance frame:
`_bmad-output/implementation-artifacts/moderation-model-decision-brief.md` **§1d, D1, D2, D8** — the
non-subsumption principle in its original words.

### Current state of the R7 fact surface, at `8be7669`

```
member_contribution_ledger ─┐
                            ├─→ readContributionFactInputs ──→ deriveContributionFacts
member_pool_assignments   ──┤        (2 queries, as-of)              │
alerts / events_log       ──┘                                        ↓
                                              5 facts ──→ R7(C)(D)(E)(F) ✅ evaluate
                                                     ├──→ R7(A) ⛔ held: joining_discipline_state
                                                     │              + r7a_restorations_used  ← THIS STORY
                                                     ├──→ R7(B) ⛔ held: joining_discipline_state
                                                     └──→ R7(G) ⛔ held: personal_event_excuse_claimed

10.16 disclosure ──→ restorationPackage: { package_unavailable, producer: 'story-10-25' }  ← THIS STORY
```

This story adds the sixth fact and the package measurement. It removes **one** of R7(A)'s two
blockers. **R7(A) is still dark when this merges — by design.**

### Anti-patterns — the thirteen ways this story goes wrong

1. **Counting ledger rows as "consecutive"** instead of walking the opportunity sequence (AC2). The
   single most likely error, and it silently hands restorations to members who skipped inside their
   own package.
2. **Omitting the preceding-MISS gate** — every diligent member then reads as having burned
   restorations and gets pushed toward R7(B), the harsher clause.
3. **Counting `floor(run / consecutive_required)`** instead of counting runs. Six-in-a-row is one
   restoration.
4. **Using `contribution.in_lapse` as the episode-opening lapse.** It is year-scoped; the episode is
   sequence-scoped. A December miss disappears on 1 January.
5. **Counting `member.moderation.restored` / `rule-clearance` events** (D2) — wrong in both
   directions.
6. **Activating R7(A)** because the fact now exists. Two blockers remain: `member.joining_discipline_state`
   (10.23), and the **published** registry amendment the Trustee Panel owns (Decision 2026-08-06-077).
   `prd.md:346` is normative until both land.
7. **Deleting or weakening the R7(A) `R7_HELD_CLAUSES` entry** to make the totality test green
   (AC3). The red **is** the mechanism.
8. **Clamping the count at 2** in the producer. `lifetime_max` is clause data.
9. **Adding a third query** instead of folding into the existing scan (D3/AC8).
10. **Changing the existing aggregates** while relaxing the `WHERE` (D3). Pin them first.
11. **Emitting a new event type or adding a table** (D2/10.24 D8), or running `db:generate`
    ([[project_live_db_test_gotchas]]).
12. **Editing `violator-flags.ts`, `ladder.ts` or `interpretClause`.** All three are frozen; the last
    two sit behind the determinism P0 gate.
13. **Trusting the TS type on the new aggregate/window-function outputs instead of the driver's actual
    shape.** 10.24 shipped a live production bug from exactly this: `max(<timestamptz>)` came back from
    node-postgres as a **string**, not a `Date` — `sql<Date | null>` lied to the compiler until a
    live-DB test caught `lastConfirmedAt.getTime is not a function`. `row_number()`, `count`, and other
    aggregate/window outputs this story adds to the same statement (`missedCycleAggregateSql`) have the
    same well-known node-postgres coercion behavior (e.g. bigint counts return as strings). Type against
    the raw driver shape and normalize explicitly at the call site — do not annotate the intended type
    and trust it.

### Reuse map — do not reinvent

| Need | Use | Not |
|---|---|---|
| live-confirmed at `at` | `liveConfirmationExistsSql` (`facts.ts:80`) / `hasLiveConfirmation` (`read.ts:88`) | a fresh reversal reconciliation |
| cycle closed at `at` | `ALERT_CLOSED_EVENT_TYPES` (`facts.ts:63`) | `alerts.current_state` (a **now** cache) |
| assignment truth | `member_pool_assignments` | recomputing `assignMembersToPools` |
| the fact key | `R7_CONTRIBUTION_FACT_KEYS.R7A_RESTORATIONS_USED` | a re-spelled string literal |
| `required` | the clause payload's `restoration.consecutive_required` | a `3` in code |
| the "remaining" copy | `RESTORATION_PACKAGE_REMAINING_KEY` — **already in `en` + `hi`** | new copy |
| per-clause `applied` | the ladder's `isApplied` via `evaluateLadderAt` | `decision !== 'r7_not_applicable'` |
| coverage/unknown | the `coveredFrom` watermark (`facts.ts:102`) | a fabricated `0` |
| cache invalidation | migration `0093`'s existing trigger | a third trigger, or a cache-key change |
| p95 evidence | `@twt/measured-validation` + the two integration specs | new benchmarking tooling |

### Testing standards

- **Pure derivation** unit-tested DB-free and exhaustively — every AC1 case, the AC2 `in_lapse` trap,
  the AC7 unknown-vs-zero distinction.
- **Live-DB integration** (`twt-test-pg` on `:5433`) for the relaxed scan, the payload arm and the
  disclosure. Own-committing writers accumulate rows — **assert membership, not counts**
  ([[project_live_db_test_gotchas]]).
- **The 100×-thread determinism gate** stays at exactly one hash.
- **Revert-sanity is mandatory** (AC3), not optional.
- Suite-level `{ timeout: 20000 }` on new live-DB specs; add no unbounded parallelism
  ([[project_ci_local_concurrency_oversubscription]]).
- Every dynamic `.limit()` through `clampLimit` or a fixed literal — `pnpm domain-invariants:check`
  ([[project_domain_limit_clamp_and_savepoint_retry]]).

### Project Structure Notes

- **Where the code lives** (the shipped 10.24 split — follow it): the **DB reads / SQL** in
  `packages/domain/src/contribution/facts.ts`; the **pure derivation + fact-bag mapping** in
  `packages/validity-service/src/producer.ts`. `@twt/domain` cannot import `@twt/validity-service`
  (turbo cycle) and cannot import `@twt/events` ([[project_member_lifecycle_domain_substrate]]).
- **No new permission key**; `PERMISSION_CATALOG_VERSION` unchanged. No new route, no new handler.
- **No new event type, no migration expected** (D2). If either becomes necessary, escalate first.
- **Variance to keep recorded:** the FR-12A documented `contribution_history` shape
  (`prd.md:404-406`) still differs from the shipped `contributionHistorySummary`, and
  `missed_count_lifetime` is still not supplied. This story widens the sub-object further — record the
  variance, do **not** invent the missing field.

### Latest technical notes

No new dependencies. Drizzle ORM, `pg`, Zod and Vitest are all in place at their pinned versions.
Window functions (`row_number() OVER (PARTITION BY … ORDER BY …)`) are plain PostgreSQL and need no
Drizzle modelling — write them as hand-authored `sql` fragments in the existing style, all values
parameterized (`sql.raw` only where the compiler already constrains the argument to a literal union,
as `AssignmentsAlias` does at `facts.ts:73`).

---

## References

- `_bmad-output/planning-artifacts/epics.md:3935-3952` — Story 10.25's ACs; `:3867-3891` — Story
  10.23 (the un-built dependency); `:3893-3933` — Story 10.24 and the decomposition rationale.
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:339-356` — FR-9, the 2026-08-04
  non-substitution amendment and the **normative** no-proxy rule at `:346`; `:425-431` — FR-12A
  replayability, p95 and freshness; `:857-862` — §8.3 restoration paths.
- `_bmad-output/implementation-artifacts/moderation-model-decision-brief.md` — §1d, **D1** (no
  auto-suspend; packages are independent of suspension), **D2** (the overlay), **D8**
  (non-subsumption), §2.2/§2.3 (the ladder and the restoration paths).
- `_bmad-output/implementation-artifacts/10-24-contribution-fact-producer-projection-r7-cf-activation.md`
  — the producer, D2/D4 (applied-only + omission), D5 (the versioned-policy pattern), D6 (zero ≠
  unknown), **D7** (this count is 10.25's), D8 (no new event), AC9 (the label re-point).
- `_bmad-output/implementation-artifacts/4-2-r7-contribution-discipline-rules.md:118,130,141` — the
  fact contract, R7(A)'s seeded `restoration` block, and the original *"downstream Epic 8/9"*
  deferral this story discharges.
- `.decision-log.md` — Decision **2026-08-05-074** (10.25 confirmed as owner of the count; the
  `in_lapse` ratification and its raised-bar consequence), **2026-08-05-073** (10.24's record),
  **2026-08-05-075** (pool cycles are single-calendar-month instruments).
- Source anchors as cited inline, all re-verified live at `8be7669`.

---

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5), via the BMad `dev-story` workflow.

### Debug Log References

**Branch:** `feat/10-25-r7a-restoration-accounting`, cut from `main` @ `8be7669` (verified equal to
`origin/main` after `git fetch origin`; tree clean apart from this story's own governance files).
`10-23` and `10-26` re-confirmed `backlog` before any edit.

#### Baselines captured BEFORE any edit (Task 0)

| Run | Result |
|---|---|
| `pnpm ci:local` (no `DATABASE_URL`) | **EXIT 0**, fully green |
| `pnpm ci:local` (with `DATABASE_URL`) | **EXIT 1** — 2 INHERITED failures, both `@twt/api` E2E, both `expected 500 to be …`: `news-blog.spec.ts` "AC4 review findings: schedule rejects a scheduled_publish_at at/before now" and `banners.spec.ts` "Decision 5: a WINDOW-ONLY edit needs no re-review". Recorded so neither could later be attributed to this work. |

#### Task 1 — the pin, then the scan relaxation (D3)

The three shipped aggregates were pinned by running the 10.24 suites and requiring identical counts
after the `WHERE` → `FILTER` move:

| Suite | Baseline @ `8be7669` | After the relaxation |
|---|---|---|
| `packages/domain/tests/integration/contribution/projection-equivalence.spec.ts` | 15 passed | **15 passed** |
| `packages/validity-service/tests/integration/contribution-facts.spec.ts` | 15 passed | **15 passed** (later 29 with the new block) |
| `packages/validity-service/tests/contribution-facts.test.ts` | 19 passed | **19 passed** (later 39 with the new block) |

No aggregate moved. `skips_current_year`, `earliest_skip_closed_at` and `opportunities_since_last`
are computed over the same rows as before, the missed predicate having moved into each `FILTER`.

#### ⚖ Revert-sanity probe — RUN AND RECORDED (AC3)

Added `'niy.contribution-discipline.r7-a'` to `R7_ACTIVATED_CLAUSE_IDS`, ran the full
`@twt/validity-service` suite with `DATABASE_URL` set, restored immediately. **Verbatim:**

```
Test Files  2 failed | 15 passed (17)
     Tests  6 failed | 214 passed (220)
```

Five MECHANIZATION failures + **one BEHAVIOURAL** failure, as AC3 requires:

- `activated ∪ held === R7_CLAUSE_IDS` → RED (totality)
- `activated ∩ held === ∅` → RED (disjointness)
- `activates EXACTLY R7(C)/(D)/(E)/(F)` → RED
- `VALIDITY_RULE_ORDER carries NO held R7 clause id` → RED (the omission ENFORCEMENT)
- `R7(A) is STILL HELD after Story 10.25 supplied its restoration count (D6)` → RED (added by this story)
- **behavioural:** `tests/integration/validity-service.spec.ts > assembles the canonical payload for an
  active non-retired member with real tenure-derived coverage` → RED

After restoring: `Test Files 17 passed (17) · Tests 220 passed (220)`.

#### The loud fixture failures Task 6 predicted — updated to the new truth, never silenced

- `tests/integration/validity-service.spec.ts:218` — `expected [ 'story-10-26' ] to deeply equal
  [ 'story-10-25', 'story-10-26' ]`. The `story-10-25` hold is genuinely discharged.
- `tests/redaction.test.ts` and `tests/contribution-facts.test.ts` — failed to COMPILE on the three new
  required `ContributionFactsInput` anchors. Deliberate: a defaulted `0` restoration count is an
  affirmative claim about a member, so each fixture must state it.
- `apps/admin/tests/member-status-panel.test.tsx` — two fixtures failed typecheck on the new
  `restorationPackage` field.
- `apps/mobile/tests/unit/pay-screen-disclosure-render.test.ts` — four source-shape assertions keyed on
  the old two-arm branch; re-pointed at the three-arm anatomy.

#### Final validation

| Gate | Result |
|---|---|
| `pnpm turbo run typecheck` | **20/20 successful** |
| `pnpm turbo run lint` | **20/20 successful** |
| `pnpm --filter @twt/validity-service test:determinism` | **exactly ONE** `validity_payload_hash` across 100 OS threads |
| `pnpm contracts:check-openapi-determinism` | deterministic; `openapi/v1.yaml` regen **byte-identical** (0 diff) |
| `pnpm domain-invariants:check` | passed — every dynamic `.limit()` clamped |
| `pnpm ci:local` (no `DATABASE_URL`) | **EXIT 0**, fully green |
| `pnpm ci:local` (with `DATABASE_URL`) | 1 failure, chased to root cause and confirmed INNOCENT — see below |

**The one live-DB failure, chased rather than presumed innocent** (AC9): `@twt/channels`
`tests/integration/dispatch-audit.spec.ts` → *"Test timed out in 5000ms"*. Timing-shaped, in a package
this diff does not touch, and a **different victim** from the two the baseline showed — the textbook
[[project_ci_local_concurrency_oversubscription]] signature. **Confirmed innocent by running it in
isolation: 1 passed.** An earlier pair of runs showed several more timeouts (an admin form at 83s
against a 5s limit, an api E2E at 355s against 20s, the determinism gate at 90s); those were MY error —
I had two `ci:local` runs overlapping. Re-run sequentially and exclusively, the no-`DATABASE_URL` pass
is EXIT 0 and the live pass has only the single channels timeout above. The two failures the BASELINE
carried (`news-blog`, `banners`) did not recur, which is itself the same flake signature.

**⚠ Nothing here is recorded as un-attested:** every AC9 gate was actually run.

### Completion Notes List

**What shipped.** `contribution.r7a_restorations_used` is the SIXTH supplied fact, derived as-of `at`
under the ratified `consecutive-opportunity-restoration-v1` policy (Decision 2026-08-06-076), and
Story 10.16's `restorationPackage` reaches its `ok` arm with real `{remaining, required}`. R7(A) is
**still dark, by design** — its hold was NARROWED, not lifted.

**Decisions D2–D5 are recorded as Decision 2026-08-06-079** in `.decision-log.md`. D1 was already
ratified as 2026-08-06-076 and was cited, not re-litigated.

**Four things a reviewer should look at deliberately:**

1. **A GENUINE FINDING, surfaced by the live test rather than predicted by the story (AC4).** Today
   `remaining` is **necessarily equal to** `required` on every reachable `ok` arm. R7(C) is the only
   ACTIVATED clause carrying `restoration.consecutive_required`, and its own precondition is
   `months_since_last >= 12` — a gap counted in missed opportunities *since the last live
   confirmation*. The instant the member takes one contribution that gap resets to 0, R7(C) stops
   applying, and the `ok` arm stops being reached. So any member for whom it renders has a trailing
   run of 0. The partial-progress arithmetic is real and is pinned DB-free; it becomes reachable on a
   live payload only when R7(A)/(B) activate. **This is a property of which clauses are activated, not
   a defect in the accounting — do not "fix" it by measuring the run differently.** Recorded in the
   integration spec beside the test that exposed it.

2. **Three deliberate variances from the story text**, each recorded at its site rather than absorbed:
   - **One extra bounded registry read** on the individual-member path. `LadderResult` does not surface
     the resolved payload and `ladder.ts` is FROZEN, so "never a second registry read" was not
     achievable without widening a frozen result shape. `rules.ts` resolves the ladder PICK's payload
     once, only when a clause applied, outside every loop. The bulk scan pays nothing. See
     `resolveAppliedRestoration`.
   - **`no_consecutive_requirement.clauseId` is `string | null`**, not `string`. `null` is the honest
     answer for a member to whom NO R7 clause applied — neither "we cannot tell you" nor "your package
     is not counted in contributions".
   - **The WIRE type carries two arms, not three.** `restorationPackage` exists only on the summary's
     `ok` arm, where the facts are derivable by construction, so declaring `package_unavailable` there
     would have been exactly the "declared and unreachable" narration this story removed elsewhere.
     `@twt/ui`'s `RestorationPackageState` carries all three — which is where AC4 pins the union and
     where all three are genuinely reachable.

3. **`SuspensionDisclosure.tsx` DID change** (`pay.tsx` did not). AC4 says the render layer needs no
   change for `RESTORATION_PACKAGE_REMAINING_KEY`, and it did not — but the third arm has to render
   somewhere, and the discriminated union made that a compile error rather than a silent omission.

4. **R7(A) reads its own clause DATA now.** The "3" in "3 consecutive contributions" is a governance
   number, so `facts.ts` resolves `restoration.consecutive_required` from the R7(A) clause payload as a
   scalar subquery (the same fold `coveredFromSql` uses), keeping the TWO-query budget. Reading a
   clause's data is **not** evaluating the clause — `prd.md:346` forbids putting `r7-a` into
   `VALIDITY_RULE_ORDER`, which this does not do. When R7(A) resolves to no version the count is
   **UNKNOWN and the fact is omitted**, never a fabricated `0`.

**Deploy step owed at rollout (AC5(d)).** The payload shape changed, so for ≤ `VALIDITY_CACHE_TTL_SECONDS`
(60 s) a warm pre-deploy cache row holds old-shaped JSONB and the `.strict()` DTO can 500. Zero-window
lever: `POST /api/v1/p/:pariwarId/admin/validity-cache/invalidate-all`
(`apps/api/src/modules/member-validity/routes.ts`). Also recorded in `deferred-work.md`.

**Blast radius, discharged:** `POOL_ASSIGNMENT_HASH_VERSION` is still `'v1'` and
`assignment-version-pin-replay.spec.ts` is green **and unedited**; migration `0093`'s existing trigger
was PROVEN to still evict on run-moving events (no third trigger, no cache-key change — 10.17 D5
re-rejected); `violator-flags.ts`, `ladder.ts` and `interpretClause` are **untouched**; no new event
type, no new table, **no migration**.

**Still open after this story:** R7(G) / `personal_event_excuse_claimed` (10.26); R8's
`compliance_percent` (unowned); R7(A) activation, which needs Story 10.23's fact **and** the Trustee
Panel's published Part 11 amendment (Decision 2026-08-06-077); and the backfill-horizon depth, recorded
**un-attested** because no production data exists to measure it.

### File List

**Source — domain**
- `packages/domain/src/contribution/facts.ts` — the relaxed scan + gap-and-islands runs, the R7(A)
  threshold scalar subquery, `readContributionProjectionContext`, the PURE `deriveRestorationRuns`
- `packages/domain/seed/niyamavali-v1-clauses.sql` — **comment only**; the "Epic 8/9" pointer re-pointed
  and the Part 11 amendment recorded beside R7(A). The clause JSONB is a governance instrument and was
  NOT edited.

**Source — engine / validity service**
- `packages/niyamavali-engine/src/r7-ladder.ts` — **comments only**; the stale "CALENDAR months" claim
  corrected, `R7A_RESTORATIONS_USED` documented. The fact-key constants are frozen and unchanged.
- `packages/validity-service/src/producer.ts` — `R7ARestorationPolicy`, the sixth supplied key, the
  derivation, `deriveRestorationPackage`, `contributionFactsToSummary(facts, applied)`
- `packages/validity-service/src/rules.ts` — the NARROWED R7(A) hold, `readConsecutiveRequired`,
  `resolveAppliedRestoration`
- `packages/validity-service/src/types.ts` — `RestorationPackagePayload`, `restorationPackage` appended
- `packages/validity-service/src/service.ts` — passes the ladder pick into the summary
- `packages/validity-service/src/r7-candidate-scan.ts` — `restorationOfPick` (zero extra reads)

**Source — contracts / UI / apps**
- `packages/contracts/src/members/validity.ts` — `RestorationPackageDto` (`.strict()` union)
- `packages/ui/src/contribution-disclosure/view-model.ts` — the third arm; narration rewritten
- `packages/ui/src/contribution-disclosure/presenter.ts` — `restorationPackageOf`
- `packages/ui/src/contribution-disclosure/i18n-keys.ts` — `RESTORATION_PACKAGE_NO_CONSECUTIVE_KEY`
- `packages/ui/src/contribution-disclosure/index.ts` — barrel export
- `packages/ui/src/member-status/presenter.ts` — surfaces the sixth fact
- `packages/i18n/locales/en/contribution.json`, `packages/i18n/locales/hi/contribution.json` — ONE new key
- `apps/mobile/components/active-contribution/SuspensionDisclosure.tsx` — three-arm render

**Tests**
- `packages/validity-service/tests/contribution-facts.test.ts` (19 → **39**)
- `packages/validity-service/tests/integration/contribution-facts.spec.ts` (15 → **29**)
- `packages/validity-service/tests/r7-activation-totality.test.ts` (8 → **9**)
- `packages/validity-service/tests/redaction.test.ts`, `.../tests/integration/validity-service.spec.ts`
- `packages/validity-service/tests/fixtures/r7-clauses.ts` — `R7A_PAYLOAD` (DATA only)
- `packages/domain/tests/integration/contribution/cache-invalidation-trigger.spec.ts` (7 → **8**)
- `packages/ui/tests/contribution-disclosure/presenter.test.ts` (98 → **101** package-wide)
- `apps/admin/tests/member-status-panel.test.tsx`, `apps/mobile/tests/unit/pay-screen-disclosure-render.test.ts`

**Records**
- `.decision-log.md` — Decision **2026-08-06-079**
- `_bmad-output/implementation-artifacts/deferred-work.md` — 10.25 half discharged, 10.26 open,
  Escalations 3/4/5, the deploy step
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/validity-service/tests/bench/p95-budget.md` — versioned measurement record
- `_bmad-output/implementation-artifacts/10-25-r7a-restoration-accounting.md` — this file

**Regenerated:** `packages/contracts/openapi/v1.yaml` — byte-identical, no diff (the 4.6 payload was
never registered in the hand-curated emitter; 10.17's finding, recorded not "fixed").

---

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-06 | 1.0 | **Story IMPLEMENTED** via `bmad-dev-story` on `feat/10-25-r7a-restoration-accounting` off `main` @ `8be7669`. All 9 ACs satisfied; 40/40 subtasks complete. Sixth fact `contribution.r7a_restorations_used` supplied under the ratified `consecutive-opportunity-restoration-v1`; Story 10.16's `{remaining, required}` LIVE; R7(A)'s hold NARROWED (not lifted) with the revert-sanity probe RUN and recorded verbatim (`6 failed \| 214 passed`, five mechanization + one behavioural). Two-query budget HELD (D3) with the three pre-existing aggregates proven bit-for-bit unchanged. Decisions D2–D5 recorded as **2026-08-06-079**. THREE variances recorded rather than absorbed (one bounded extra registry read on the individual-member path — `ladder.ts` is frozen and `LadderResult` does not surface the payload; `clauseId: string \| null` on the new arm; the wire type carries two arms where the view-model carries three). ONE genuine finding surfaced by a live test: `remaining` is necessarily equal to `required` on every arm reachable today, because R7(C) is the only activated clause with a consecutive package and its own precondition resets the moment the member contributes. | Amelia (dev) |
| 2026-08-06 | 0.4 | **Story validated** (`bmad-create-story validate`). Citations re-verified live against `epics.md`, `prd.md`, all four cited decision-log entries, and the five live source files this story edits — all confirmed accurate at `8be7669` except one off-by-one (AC1's FR-9 citation corrected `prd.md:348` → `:347`). Added Anti-pattern 13 and a Task 2 subtask carrying forward 10.24's node-postgres aggregate-coercion production bug (`max(<timestamptz>)` returned as a string, not `Date`) — this story adds new `row_number()`/count outputs to the identical statement (`missedCycleAggregateSql`) and the same driver-shape gotcha applies. | BigDev |
| 2026-08-06 | 0.3 | **Escalation 3 RESOLVED by OWNER ASSIGNMENT** (Decision **2026-08-06-077**): the R7(A) registry clause-data amendment belongs to the **Trustee Panel as a Part 11 amendment** — deliverable, implementation dependency (10.23 supplies the fact, 10.25 consumes the published registry) and completion criteria all recorded. R7(A) therefore has **three** activation conditions, not two, and the third is verifiable as *published* rather than merely intended. Corrected **before** the unowned-obligation failure could recur ([[project_r7_fact_producer_unbuilt]]). **Also — a STANDING PRINCIPLE ratified** (Decision **2026-08-06-078**): versioned policy decisions are **superseded, never reinterpreted**, and **historical payloads remain correct under the policy in force when they were produced** — so a policy supersession is *never* a backfill. Carried into D1 and the `R7ARestorationPolicy` doc comment. Decision 2026-08-06-076 was deliberately **not** edited to insert it; the principle binds it from a new entry, which is the principle applied to itself. | BigDev |
| 2026-08-06 | 0.2 | **Escalation 1 RESOLVED by ratification at authoring time.** BigDev ratified **D1 — a restoration is consumed on COMPLETION, not on grant** — and `consecutive-opportunity-restoration-v1` as the versioned implementation policy for `contribution.r7a_restorations_used` (Decision **2026-08-06-076**). Ratified *before* implementation and *before* the fact reached the payload contract, on the same lowest-cost-moment argument Decision 2026-08-05-074 used for `contribution.in_lapse` — with the same consequence, which runs opposite to how "v1" usually reads: the cheap-re-pin window is now **CLOSED** and the bar for changing the rule went **UP**. Three elements are ratified as **policy, not implementation latitude**: episodes are runs, the preceding-MISS gate is load-bearing, and "consecutive" is an opportunity-sequence predicate. The producer still does **not** clamp at 2 (Escalation 4 stands). Escalations 2–5 unaffected — including **Escalation 3, R7(A)'s unowned clause-data amendment**. | BigDev |
| 2026-08-06 | 0.1 | Story authored via `bmad-create-story` off `main` @ `8be7669`. Six decisions recorded (**D1 restorations are consumed on COMPLETION, not on grant** — the story's governance core; **D2** a pure versioned derivation over the 10.24 projections with no new event or table, and `member.moderation.restored` rejected by name as a source; **D3** fold the run computation into the existing scan and keep the two-query budget; **D4** the `{remaining, required}` shape does not fit R7(D)/(E)/(F) — a third honest arm; **D5** Story 10.23's overlay coupling as a first-class absent seam; **D6** facts ≠ clause activation, restated). Nine ACs. Five escalations, including the increment-point ratification and — newly surfaced — **R7(A)'s clause-data amendment, which no story owns**, the same unowned-obligation shape that produced the gap 10.24 closed. | Bob (SM) |
