---
baseline_commit: c46d872
---

# Story 10.26: R7(G) Personal-Event Excuse Assertion `[SURFACE]`

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member asserting that a personal event caused a missed contribution,
I want the assertion recorded on my own record,
so that R7(G) can explain, in my record, how the Niyamavali treats it.

---

## What this story is, in one paragraph

`packages/domain/seed/niyamavali-v1-clauses.sql:291` has encoded R7(G) as
`personal_event_excuse_claimed == true → no_exemption` since Story 4.2. Story 10.24 built the
`contribution.*` fact producer and supplied five keys; Story 10.25 added a sixth. **One key has never
had a source anywhere in the substrate** — `contribution.personal_event_excuse_claimed` — because,
unlike the other six, it is not derivable from anything: it is not a projection of events that already
exist, it is a **member act that has never had a place to happen**
(`sprint-change-proposal-2026-08-04-R2.md:106`: *"No assertion path exists."*). **This story is the one
that owns it**, and it is the LAST of the three-story contribution-governance decomposition
(`epics.md:3905-3970`).

Two things ship here:

1. **The assertion instrument** — a member-facing act that records *"a personal event affected my
   ability to contribute"*, and the `contribution.personal_event_excuse_claimed` fact derived from it.
2. **R7(G) activation** — the clause enters `VALIDITY_RULE_ORDER` and fires, so the member's own record
   carries the Niyamavali's answer: **personal events do not excuse skips**.

**This is not an excuse-granting flow.** FR-9 (`prd.md:353`) states R7(G) declaratively — *"personal
events do not excuse contribution skips"* — and the seeded clause's `on_pass` is `no_exemption` with
`restoration: {never_excuses: true}`. Asserting changes **no** outcome. The story exists so that the
member's honest disclosure is **recorded and answered**, rather than having nowhere to go.

---

## ⚠ Read this before planning: the harm this story can cause

Activating an R7 clause is not a neutral act in this codebase. `deriveViolatorFlags`
(`packages/domain/src/trustee-lite/violator-flags.ts:209-216`) maps **every** R7 clause id it finds in
`applicableNiyamavaliClauses[]` into a **violator flag** on the Trustee-Lite surface — *the surface
that feeds suspension decisions*. It has no `applied` check and no outcome check; the filtering is
upstream by contract (10.24 **D2**).

R7(G) applies **exactly when the member told the truth about their own life.**

So the naive implementation of this story produces a system in which **a member who discloses that
their father died acquires a violator flag on the suspension-candidate surface.** That is not a
degraded UX; it is a system that punishes honesty, and it inverts the entire purpose of the clause.

> **The single most important thing this story must get right is that an asserted personal event can
> never make a member's standing worse.** AC5 is that gate. Everything else is plumbing.

⚖ **This is now constitutional, not just humane.** The Trustee Panel ratified R7(G) into the Niyamavali
on 2026-08-06 (`docs/legal/niyamavali.md:81`), and the ratified text says the assertion *"carries no
consequence of its own."* A violator flag on the suspension-candidate surface **is** a consequence — so
the naive implementation does not merely harm members, it **contradicts the ratified Niyamavali**. The
governing invariant, ratified as **D4**:

> **A clause may influence trustee *understanding* without influencing trustee *suspicion*.**

Note carefully what is *not* the answer: keeping R7(G) held. The epic AC is explicit — *"so R7(G) fires
and explains why it does not apply — detection-and-explanation"* (`epics.md:3966`). The clause must
evaluate and reach the member's record. What it must not do is become a suspension signal.

---

## Boundary — read this before anything else

> **This story records an assertion, supplies the fact it implies, and activates R7(G) so the member's
> record can answer it. It grants nothing, waives nothing, excuses nothing, and moves no eligibility.**

### In scope / out of scope

| In scope (10.26) | Out of scope → owner |
|---|---|
| The **member assertion instrument**: a bounded-vocabulary event on the member's own stream (**D2/D3**), its write path, and a member-facing surface (**AC7**). | Any **trustee review**, approval, denial, or discretion workflow over an assertion. R7(G) has no such path and this story must not invent one. |
| `contribution.personal_event_excuse_claimed` as the **seventh** and FINAL `R7_SUPPLIED_FACT_KEYS` entry, derived **as-of** `at` (**AC3**). | `contribution.compliance_percent` (R8, **unowned** — `deferred-work.md`) · `member.joining_discipline_state` (**10.23**). |
| **Activating R7(G)**: `R7_ACTIVATED_CLAUSE_IDS` 4 → 5, `R7_HELD_CLAUSES` 3 → 2, `R7_HELD_FACTS` → **empty** (**AC4**). | Activating **R7(A)/(B)**. Their hold is unchanged and rests on `member.joining_discipline_state` (10.23) **and** the Trustee Panel's published Part 11 amendment (Decision 2026-08-06-077). |
| ⭐ The **violator-flag exclusion** — an asserted excuse never becomes a suspension signal (**AC5/D4**), filtered UPSTREAM with `violator-flags.ts` **frozen**. | Any change to `violator-flags.ts`, `ladder.ts`, or `interpretClause`. All three are frozen and behind the 100×-thread determinism P0 gate. |
| The payload/wire/hash blast radius, **a third time** — a seventh fact and a fifth activated clause move every `validityPayloadHash` (**AC8**). | Bumping `POOL_ASSIGNMENT_HASH_VERSION`. 10.17 D3 + 10.24 AC6(c) + 10.25 AC5(e) ratified: the roster reads `isAssignable` **only**. |
| A **missed-cycle-scoped** anchor for the assertion, **as an optional reference only** (**D5**). | Building a surface that lists a member's **missed** cycles. None exists (see D5) — that is a real gap and it is **recorded**, not absorbed. |
| The Tier-2 corrections this story makes false (**AC10**). | Amending the R7(G) **clause JSONB** — including dropping the now-contradicted `provisional` / `policy_review_required` flags. A governance instrument, and a new clause **version** (Escalation 1, carried item **(a)**). |

---

## Acceptance Criteria

### AC1 — The assertion is an ACT, and it is never a waiver

**Given** the **ratified Niyamavali §3.1** (`docs/legal/niyamavali.md:81`, Trustee Panel 2026-08-06) —
*"**No exemption.** Personal events do not excuse a missed contribution; the assertion is recorded on
the member's own record but grants no restoration relief **and carries no consequence of its own**"* —
matching FR-9 (`prd.md:353`) and the seeded clause (`niyamavali-v1-clauses.sql:291`), which carries
`on_pass: "no_exemption"` with `restoration: {"never_excuses": true}`

**Then** the instrument this story defines is a **record that an assertion was made**, and it:

- carries **no** approval, review, or decision field, and **no** state machine;
- has **no** admin/trustee action that grants, denies, or resolves it;
- changes **no** eligibility, **no** lock-in, **no** restoration package, and **no** roster position;
- is **not** reversible-by-outcome — there is no outcome to reverse. (A member may make a further
  assertion; nothing "approves" an earlier one.)

**And** no surface, copy key, route name, contract field, event name, or code identifier anywhere in
the diff may use the words **waiver, exemption, exception, excuse granted, apply, request, approve,
appeal, or forgive** in a way that implies the assertion can change an outcome. The word `excuse`
survives only where it names the **fact key the engine already ships**
(`contribution.personal_event_excuse_claimed`, frozen — `r7-ladder.ts:97`) and in copy that states the
Niyamavali's answer.

> ⚠ The strongest version of this failure is not a copy slip — it is a **route named
> `POST .../excuse-requests`** or a contract field named `status`. Those make the false promise
> structural. Name the instrument after what it is: an **assertion**, recorded.

### AC2 — The Story 8.10 `no-ingest-path` fence stays GREEN, and it is not dodged by accident

**Given** `packages/domain/tests/contribution/no-ingest-path.test.ts` pins the complete `contribution.*`
event vocabulary at **exactly three** (`utr-attested`, `confirmed`, `reconciliation-mismatch`) and
**source-scans** these roots (`:63-68`) for any quoted `contribution.*` literal that is not one of them:

```
packages/domain/src/contribution
packages/domain/src/schema
packages/domain/migrations
packages/events/src
```

**Then** the assertion event is **NOT** in the `contribution.*` namespace. It is
`member.personal_event_asserted` (**D2**), appended on the **member's own `events_log` stream**
(`stream_id = member_id`).

**And** the dotted fact-key literal `'contribution.personal_event_excuse_claimed'` **MUST NOT appear**
in any of the four scanned roots. This is a live trap: the fact key legitimately exists today only in
`packages/niyamavali-engine` and `packages/validity-service`, neither of which is scanned. Concretely —

| If you put the read here | Result |
|---|---|
| `packages/domain/src/member/…`, returning a **boolean** anchor (e.g. `personalEventAsserted`) | ✅ safe. The domain never spells the dotted key; `producer.ts` maps the boolean onto `R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED`. |
| `packages/domain/src/contribution/…`, returning a boolean anchor | ⚠ safe **only** while nobody writes the dotted literal in that directory. Avoid. |
| Anywhere in the scanned roots, spelling the dotted fact key | ❌ **fence RED.** |

**And** `pnpm --filter @twt/domain test` is run and `no-ingest-path.test.ts` is confirmed green
**before** the fact wiring lands — **verify, do not assume** (the fence is a source scan; it fails on a
string, not on a type).

### AC3 — The seventh fact: an as-of-correct existential, never a fabricated `false`

**Given** the fact contract `R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED`
(`r7-ladder.ts:97`) is **bool — "a personal-event excuse was asserted"**

**Then** `contribution.personal_event_excuse_claimed` is `true` iff **≥ 1** assertion event exists on
the member's stream with `occurred_at <= at`, and `false` otherwise (**D5** — a lifetime existential,
deliberately not a per-cycle or windowed predicate).

**And** the derivation is **as-of correct**: `at` in the past returns what was true at `at`, for the
same reason 10.24 AC1 and 10.25 AC1 state — `apps/jobs/src/assignable-roster.ts` calls
`getValidityAt(..., committedAt)` and Epic 4 commits *"Replayable for audit"* (`prd.md:425`).

**And** — the discipline that governs every fact in this producer — **the coverage gate is respected**.
`deriveContributionFacts` returning `null` (no `contribution_projection_coverage` row for the Pariwar,
or `at` before the watermark) continues to yield the `producer_unavailable` sentinel; the seventh fact
**never** appears alone on a payload whose other six are un-derivable.

> ⚠ **Do NOT extend the coverage watermark to this fact's own source.** The assertion is read from
> `events_log`, which has **no** backfill horizon — the events are the primary record, not a
> projection. `false` here genuinely means *"this member has never asserted"*, which is a real answer,
> unlike the projection facts where `0` and *unknown* had to be distinguished (10.25 AC7). Record that
> asymmetry at the derivation site so a future reader does not "fix" it into a nullable.

### AC4 — R7(G) ACTIVATES; the mechanization flips, and it flips all the way

**Given** the mechanized totality apparatus
(`packages/validity-service/tests/r7-activation-totality.test.ts`) that Stories 10.24 and 10.25 built
and that `deferred-work.md:59` predicted would fire here — *"**Re-trigger:** 10.26 landing"*

**Then** all four constants move together, and each edit is forced by a test rather than chosen:

```ts
// rules.ts
export const R7_ACTIVATED_CLAUSE_IDS = [
  'niy.contribution-discipline.r7-c',
  'niy.contribution-discipline.r7-d',
  'niy.contribution-discipline.r7-e',
  'niy.contribution-discipline.r7-f',
  'niy.contribution-discipline.r7-g',   // ← NEW
] as const satisfies readonly R7ClauseId[];

export const R7_HELD_CLAUSES = [
  { clauseId: 'niy.contribution-discipline.r7-a', blockedBy: ['member.joining_discipline_state'], owner: 'story-10-23' },
  { clauseId: 'niy.contribution-discipline.r7-b', blockedBy: ['member.joining_discipline_state'], owner: 'story-10-23' },
  // the r7-g entry is DELETED — its blocking fact is now supplied
] as const satisfies readonly R7HeldClause[];

// producer.ts
export const R7_SUPPLIED_FACT_KEYS = [ /* …six… */, R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED ] as const;
```

**And** `R7_HELD_FACTS` becomes **EMPTY** — the mechanization's own end state, and the first time it has
been. ⚠ **Type it explicitly**, or `[] as const` infers `readonly []` and the `{key, producer}` element
type is lost at every consumer (`producer.ts` `contributionFactsToSummary`, `member-status/presenter.ts:219`,
the contracts DTO):

```ts
/** The facts this producer does NOT supply. EMPTY since Story 10.26 — every engine key is now supplied. */
export const R7_HELD_FACTS: readonly { readonly key: string; readonly producer: string }[] = [];
```

**And** deleting the R7(G) held entry is **correct here and only here.** 10.25 narrowed R7(A)'s
`blockedBy` rather than deleting it because a *second* blocker remained. R7(G) has exactly one blocking
fact and this story supplies it, and — unlike R7(A) — there is **no** `prd.md:346` proxy prohibition and
**no** outstanding registry amendment blocking it (**D6**). State that distinction at the deletion site,
because "the previous story narrowed, so I should narrow" is the wrong lesson to carry forward.

**And** the totality test's sibling assertions move, deliberately and visibly:

| Assertion (current) | Becomes |
|---|---|
| `activates EXACTLY R7(C)/(D)/(E)/(F)` (`:56-63`) | + `'niy.contribution-discipline.r7-g'` |
| `holds EXACTLY R7(A)/(B)/(G)` (`:65-77`) | holds EXACTLY R7(A)/(B) |
| `expect(supplied.length).toBe(6)` (`:112`) | **7** |
| `expect(supplied).not.toContain('contribution.personal_event_excuse_claimed')` (`:126`) | **deleted** |

⚠ The `for (const clause of R7_HELD_CLAUSES)` loops (`:71-77`, `:101-108`) must **not** become
vacuously green. `R7_HELD_CLAUSES` still has two entries, so they still bite — but add an explicit
`expect(R7_HELD_CLAUSES.length).toBe(2)` so a future deletion of both cannot silently empty them
([[feedback_gate_scope_semantic_coverage]] — a green scan over an empty set proves nothing).

**And** a **revert-sanity probe is RUN and recorded** — this story's probe runs in the *opposite*
direction from 10.25's, and that is the point. Remove `'niy.contribution-discipline.r7-g'` from
`R7_ACTIVATED_CLAUSE_IDS` **without** re-adding it to `R7_HELD_CLAUSES` → the **totality** assertion
must go RED (the union is six, not seven). Restore; record the verbatim counts in the Dev Agent Record.

### AC5 — ⭐ THE HARM GATE: an asserted personal event NEVER becomes a violator flag

> ### ⚖ The invariant this AC enforces (RATIFIED — D4)
>
> **A clause may influence trustee *understanding* without influencing trustee *suspicion*.**
>
> `factsEstablishing[]` informs; `flags[]` accuses. R7(G) is granted the first and denied the second.
> This is not a UX preference — the ratified Niyamavali §3.1 (`docs/legal/niyamavali.md:81`) says the
> R7(G) assertion *"carries no consequence of its own"*, and a suspension-candidate flag is a
> consequence.

**Given** `deriveViolatorFlags` (`violator-flags.ts:209-216`) maps **every** R7 clause id in
`applicableNiyamavaliClauses[]` into a `ViolatorFlag`, with no `applied` check and no outcome check —
and 10.24 **D2** established that this filtering is the **producer's** obligation, discharged upstream,
with that file **frozen** (10.24 AC5: *"if it needs a change, that is a finding, not a task"*)

**Then** a member whose **only** applied R7 clause is R7(G) appears on the Trustee-Lite violator
section with **zero flags** — i.e. they do not appear at all (`summarizeViolatorFlags` omits
zero-flag members, `violator-flags.ts:275`).

**And** a member with an applied *imposing* clause (R7(C)/(D)/(E)/(F)) **plus** R7(G) carries flags for
the imposing clauses **only** — the R7(G) flag is absent, and the flag count is **unchanged** from what
it would have been had they never asserted.

**And** the exclusion is **DATA-DRIVEN**, read from the clause payload, never a hardcoded
`clauseId === 'r7-g'` branch (`ladder.ts:11-14` / `r7-ladder.ts:14-17`: *"There is NO `switch (clauseId)`
/ branch keyed by registry identity"*). The predicate is: **a clause contributes a violator flag only
if its `restoration` block prescribes an obligation.** R7(G)'s `{never_excuses: true}` prescribes none.

```ts
/**
 * Does this clause's payload IMPOSE a restoration obligation? A violator flag asserts that a member is
 * in a restoration/lock-in HOLDING; a clause that prescribes nothing is not a holding, it is an
 * EXPLANATION. Read from the clause DATA (never a clause-id branch) so a trustee amendment moves it.
 */
export function imposesRestorationObligation(payload: Record<string, unknown>): boolean;
```

Pinned by a test that walks the **seeded** R7(A)–(G) payloads and asserts R7(A)–(F) → `true`,
R7(G) → `false`.

**And** the exclusion is applied **UPSTREAM, at both R7 producers**, exactly where the `applied` filter
already lives — with **zero** change to `violator-flags.ts`:

| Seam | File | Note |
|---|---|---|
| Individual member | `evaluateAppliedR7ClauseSlots` (`rules.ts:308-329`) | the slot filter beside `.filter((entry) => entry.applied)` |
| Bulk Trustee-Lite scan | `r7-candidate-scan.ts` | the identical filter; payloads are already hoisted out of the per-member loop, so this costs **one more hoisted `resolveByClauseId`** (5 instead of 4), not a per-member read |

> ⚠ **The two seams must not drift.** They already carry twin `applied` filters and 10.24's round-2
> review found the bulk one un-probed. Share the predicate (one exported function, imported by both) and
> **probe BOTH**: delete the filter at each seam in turn and require a behavioural test to go RED
> naming the R7(G) flag. Record both probes verbatim.

**And** — the deliberate half of the design, recorded so a later reader does not "complete" it:
the assertion **remains visible to the trustee as a FACT.** `deriveViolatorFlags`'s
`factsEstablishing[]` filters on `startsWith('contribution.')` (`violator-flags.ts:204-207`), so
`contribution.personal_event_excuse_claimed` rides into the fact list of any member who is flagged for
some *other* clause. That is correct and intended: the assertion can never **create** a flag, and it
**can** inform a trustee's discretion on a flag that already exists. **Asserting can only ever help or
do nothing; it can never hurt.** Pin both halves with a test.

### AC6 — The ladder pick: R7(G) explains, and it never displaces a restoration package

**Given** `selectApplicable` (`ladder.ts:125-132`) picks the **highest** `precedence` among applied
clauses, and the seeded R7 precedences are

| R7(G) | R7(D) | R7(E) | R7(F) | R7(A) | R7(B) | R7(C) |
|---|---|---|---|---|---|---|
| **10** | 30 | 40 | 45 | 50 | 60 | 70 |

**Then** R7(G) carries the **lowest** precedence in the family and therefore can never win the pick
against any imposing clause. Pin this with a test — it is currently true only because of a seeded
integer, and `precedence` is trustee-amendable **DATA**
([[project_niyamavali_precedence_is_provenance]]). The test states *why* the ordering matters: if
R7(G) ever out-ranked an imposing clause, the member's surfaced explanation would become *"personal
events do not excuse skips"* **instead of** the restoration package they are actually serving.

**And** when R7(G) is the **only** applied clause, it wins the pick by default and
`resolveAppliedRestoration` (`rules.ts:350-361`) resolves its payload, so
`deriveRestorationPackage` (`producer.ts:567-581`) returns
`{ status: 'no_consecutive_requirement', clauseId: 'niy.contribution-discipline.r7-g' }` — where it
previously returned `{ status: 'no_consecutive_requirement', clauseId: null }`. **Same arm, same copy
key, different `clauseId`.** Story 10.25's third arm already handles it and
`RESTORATION_PACKAGE_NO_CONSECUTIVE_REQUIREMENT_KEY` needs no re-authoring. Pin the transition with a
test; **do not** add a fourth `RestorationPackageState` arm.

**And** the member's own record gains the explanation the story exists for:
`buildRuleExplanations` (`member-status/presenter.ts:314-322`) maps every applicable clause to
`ruleExplanationKey(c.reasonCode)` = `memberStatus.rule.<reasonCode>`. `interpretClause` builds the
code as `` `rule.${decision}` `` (`interpret.ts:320,404`) and R7(G)'s `on_pass` is `no_exemption`, so
the key is **`memberStatus.rule.no_exemption`** — author it in **`en` and `hi`** (AC7's copy rules bind
it). A missing key renders the raw code, which a11y `:1896` forbids. **Verify the key resolves**;
`ruleExplanationKey` interpolates blindly and cannot fail loudly.

### AC7 — The member surface: detection-and-explanation, stated BEFORE the member acts

**Given** the epic AC (`epics.md:3962`) — *"no surface may imply that asserting an excuse changes an
outcome"* — and Story 10.16 AC5's standing constraint that copy must never characterise a member's
standing as a moral failing

**Then** the surface lives on the member's **own record** — `apps/mobile/app/(membership)/index.tsx`,
the member-facing `<MemberStatusPanel>` (Story 4.7) — which is literally *"in my record"* from the user
story. The presenter (`packages/ui/src/member-status/`) stays **strictly pure** `(payload, opts) →
view-model`, emitting **KEYS only**; the screen resolves them with `useT()`.

**And** the flow discloses the consequence **before** the member commits, not after:

1. An affordance whose label states what it does — *record that a personal event affected a
   contribution* — never *"request"* / *"apply"* (AC1).
2. **Before submit**, the Niyamavali's answer is shown plainly: *personal events do not excuse missed
   contributions; recording this does not change your standing.* Naming the consequence only in the
   confirmation is a dark pattern — the member has already acted.
3. On success: recorded, plus the same statement, now on the record.

**And** the input is a **bounded vocabulary with NO free text** (**D3**) — Tier-1 PII never enters the
event, the `.strict()` contract admits no `notes` field, and the tone problem of asking a bereaved
member to type an explanation for a system that will refuse it is avoided entirely:

```
bereavement · illness · caregiving · displacement · financial_hardship · other
```

**And** every visible string is **Hindi-first** through `@twt/i18n` in **`en` and `hi`**
(`packages/i18n/locales/{en,hi}/contribution.json` — the file that already carries the 10.16/10.25
disclosure keys), routed through `docs/tone-guide.md`.

> ⚠ **There is no UX-spec coverage for this surface** — `ux-design-specification.md` has zero hits for
> *personal event* or *excuse*. Every copy string here is new and must go through the tone gate
> deliberately (Escalation 4). Do not infer wording from the suspension-disclosure copy: that
> disclosure is about **money without coverage**; this one is about **a life event the rules do not
> bend for**. Different register.

**And** the write route follows the shipped member-surface pattern (Story 10.2,
`apps/api/src/modules/helpdesk/member-routes.ts:42-62`): `requireMemberSession`, the FR-88 **per-member**
write rate limit (`perMemberKey`, `hook: 'preHandler'` — **not** `namedRateLimits.write`), and an
`Idempotency-Key` **header**. The `:pariwarId` path segment is validated against the member JWT in the
handler; a mismatch is a **404**, never a 403.

### AC8 — The payload, the wire, and a blast radius that is smaller than it looks

A seventh fact **and** a fifth activated clause move **every** `validityPayloadHash`. The 10.24 AC6 /
10.25 AC5 checklist, re-run — with one item that is genuinely free this time:

**(a) The fact rides the existing `facts` map.** `contributionFactsToBag` gains the key from
`R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED` — **never a re-spelled literal**. No new field
on `ContributionHistoryAvailable`; no field reordering (the hash is order-sensitive). `heldFacts` keeps
its position and becomes `[]`.

**(b) ⭐ Cache invalidation is ALREADY WIRED — prove it, do not build it.** Migration
`0036_member-validity-cache.sql:103-107` installs an AFTER-INSERT trigger on `events_log` with
`WHEN (NEW.event_type LIKE 'member.%')`, keyed `member_id = NEW.stream_id`. Because **D2** puts the
assertion in the `member.*` namespace **on the member's own stream**, an assertion evicts the member's
validity-cache row **automatically**. Migration `0093`'s contribution trigger (`:222-226`) covers only
four `contribution.*`/`reconciliation.*` types and is **irrelevant** here.

> **Prove it with a live-DB test** (append an assertion → the cache row is gone). Do **NOT** add a third
> trigger, and do **NOT** re-open adding a payload-shape component to the frozen 4.8 cache key —
> 10.17 D5 rejected that by name and 10.24/10.25 re-rejected it. **This is the strongest single
> argument for the D2 namespace choice; record it there.**

**(c) The contracts DTO.** `packages/contracts/src/members/validity.ts` — the fact map is
`Record<string, number|boolean>` and needs no shape change; the new assertion **request/response** DTOs
are new `.strict()` objects. Regenerate `openapi/v1.yaml`; run `contracts:check-openapi-determinism`.
**Contracts must not import `@twt/domain`** ([[project_contracts_domain_bundle_boundary]]) — declare the
event-kind enum as a local wire-enum, value-aligned with the domain's (the `LifeEventsLocale` precedent,
`contracts/src/life-events/address.ts:22`), and pin the two with a lockstep test.

**(d) Deploy window, accepted — not a defect.** For ≤ `VALIDITY_CACHE_TTL_SECONDS` (60 s) after rollout,
a warm pre-deploy cache row holds the old-shaped JSONB and the `.strict()` DTO can 500. Zero-window
lever, documented as a deploy step exactly as 10.24/10.25 did:
`POST /api/v1/p/:pariwarId/admin/validity-cache/invalidate-all`
(`apps/api/src/modules/member-validity/routes.ts:68`).

**(e) `POOL_ASSIGNMENT_HASH_VERSION` is NOT bumped.** Same proof as 10.24 AC6(c) / 10.25 AC5(e): the
roster reads `payload.isAssignable` and nothing else, and `deriveIsAssignable` is a function of
lifecycle state + moderation status only ([[project_assignability_predicate_is_isvalid_only]]).
`tests/integration/pool/assignment-version-pin-replay.spec.ts` must stay green **unchanged** — an edit
there is a finding.

**(f) The lifecycle reducer.** `member.personal_event_asserted` enters `member/state.ts` and MUST be
**IDENTITY** (`from_state === to_state`) — the shipped non-transition-marker precedent
(`member/events.ts:166` — *"the reducer treats `member.address_updated` as identity (R5)"*, alongside
`member.posting_updated`). Pin it: an assertion from every legal lifecycle state leaves the state
unchanged.

### AC9 — Bounded reads: the budget goes 2 → 3 and 7 → 8, stated rather than smuggled

**Given** 10.24 AC7's binding structural criterion — **"is there a query inside a loop over members,
pools or clauses?"**, a yes/no a reviewer can check from the diff alone — and the documented budgets
(`facts.ts:8-19`: two queries per member read; `r7-candidate-scan.ts:15-19`: seven for the Pariwar scan)

**Then** the assertion existential is **one additional bounded query in each shape** — a per-member
existential, and a `GROUP BY member` existential for the Pariwar scan. It is **not** folded into
`missedCycleAggregateSql`: that statement scans the pool/assignment axis, and the assertion lives on the
member's `events_log` stream — a different axis, and forcing a join would make the riskiest SQL in the
subsystem riskier for no gain (**D7**).

**And** the budgets are **re-stated in the doc comments**, never left stale (the exact Tier-2 failure
10.25 AC6 catalogued): **three** for the single-member read, **eight** for the Pariwar scan, plus the
fifth hoisted `resolveByClauseId` from AC5. The existing **counted-query assertions** are extended: 0, 1
and several assertions per member → still exactly three / exactly eight.

**And** the AI-4-1 p95 harness and the **100×-thread determinism gate** are re-run, with a versioned
record appended to `packages/validity-service/tests/bench/p95-budget.md`
([[project_measured_validation_framework]] — reuse the harness, never build a second one). The
determinism gate must report **exactly ONE hash**; any variance is a **P0**. FR-12A's p95 < 200 ms at
4L is the budget the added query spends against — measure, do not assume.

### AC10 — Tier-2 reconciliation: every claim this story falsifies is corrected in place

| Site | What stops being true |
|---|---|
| `packages/validity-service/src/producer.ts:15-33` (header) | *"STILL NOT produced: `contribution.personal_event_excuse_claimed` (Story 10.26) — so R7(G) stays HELD"*. **All seven are now produced.** |
| `packages/validity-service/src/producer.ts:190-223` (`R7_SUPPLIED_FACT_KEYS` / `R7_HELD_FACTS`) | *"SIX of the engine's seven"* + *"The ONE omitted key and its owner"*. Seven; none omitted. |
| `packages/validity-service/src/rules.ts:21-26, 57-83, 94-141` | *"R7(A)/(B)/(G) stay OMITTED"*; the R7(G) held entry and its prose. |
| `packages/niyamavali-engine/src/r7-ladder.ts:48-64` | *"SIX of the seven are supplied; `personal_event_excuse_claimed` is Story 10.26's."* |
| `packages/domain/src/member/events.ts:220` (the `MemberEventType` doc comment) | *"the 16 AC1 events + the 3 Story 10.10 moderation events = **19**"* → **20**. The identical stale-count class 10.25 AC6 catalogued. |
| `packages/domain/src/trustee-lite/violator-flags.ts:25-29` | *"R7(A)/(B)/(G) remain omitted … 10.25 … and 10.26"*. **Comment only — the module stays frozen (AC5).** Add the AC5 exclusion contract to the same header: this file still flags every clause it is given; the *imposing* filter is now upstream too. |
| `packages/ui/src/contribution-disclosure/view-model.ts:59-66` (the AC4 clause table) | R7(G) is no longer *"⛔ held"*. |
| `packages/domain/seed/niyamavali-v1-clauses.sql` (R7 family comment block, `:211-222`) | Any *"a future story will supply the excuse fact"* pointer — **and** the block's `provisional` caveat, now that R7(F)/R7(G) are ratified (`:214`). **Comment only: the clause JSONB is a governance instrument and is NOT edited here.** ⚠ The `provisional` / `policy_review_required` flags on the R7(F)/R7(G) rows (`:292,301`) are **already `false`** — Escalation 1's same-day UPDATE (Decision 2026-08-06-080) discharged carried item (a) before this story starts; confirmed live in the current seed file. Update only the **comment block**, not the JSONB — the data-side edit is already done. |
| `packages/validity-service/tests/r7-activation-totality.test.ts` header (`:1-29`) | The revert-probe narrative — append this story's two probes (AC4 + AC5). |
| `_bmad-output/implementation-artifacts/deferred-work.md:36-58` | The 10.24 hold entry — the **10.26 half discharged**; the entry closes. |
| `.decision-log.md` (line **136 at baseline `c46d872`; grep for the text, not the line number** — the Task 0 precursor commit inserts Decision 2026-08-06-080 above it and shifts it to ~205) | *"`contribution.personal_event_excuse_claimed` (R7(G)) remains held — Story 10.26."* |
| `_bmad-output/implementation-artifacts/moderation-model-decision-brief.md:163` | The ⚠️ *"not in §3.1"* marker on R7(G) — **and on R7(F) at `:162`**. Both are now in §3.1 (Escalation 1). **Confirmed still live and un-propagated as of this story's baseline** — both markers still read `not in §3.1`; this row is genuinely open and must be edited, not merely checked. |

**And** `grep -rn "story-10-26"` across `packages` + `apps` (excluding `dist`) returns only sites where
this story is genuinely the producer — every *"a future story will do this"* reference is gone. Existing
fixtures that hardcode the held-fact set **fail loudly** and are updated to the new truth, never
silenced: `packages/validity-service/tests/redaction.test.ts:73`,
`packages/validity-service/tests/contribution-facts.test.ts:275,285`,
`packages/ui/tests/contribution-disclosure/presenter.test.ts:173`,
`apps/admin/tests/member-status-panel.test.tsx:97`.

### AC11 — Validation

`pnpm turbo run typecheck` · `lint` · `pnpm --filter @twt/domain test` (**the 8.10 fence**, AC2) ·
`pnpm --filter @twt/validity-service test:determinism` · `contracts:check-openapi-determinism` ·
`pnpm domain-invariants:check` · `pnpm ci:local` (with **and** without `DATABASE_URL`).

A live-DB failure here is **not presumptively innocent** — this story changes a payload shape many specs
read and adds a lifecycle event type. Chase each to root cause; the known signatures are
[[project_ci_local_concurrency_oversubscription]] (a *different* victim each run, always timing-shaped)
and [[project_ci_local_double_run_pollution]]. Confirm innocence by running the suspect spec **in
isolation** ([[project_known_livedb_test_failures]]). Capture a **baseline before any edit** so an
inherited flake is not later attributed to this work.

---

## Load-Bearing Decisions

### D1 — ⭐ RECOMMENDED. The instrument is an **assertion**, and the surface's job is to be honest about its own futility.

The tempting design is a request/review workflow, because that is what "asserting an excuse" looks like
everywhere else in software. FR-9 forecloses it: R7(G) **never** excuses. So the instrument is a
one-way record with no counterparty.

That raises the fair question **"why build it at all?"**, and the answer is load-bearing enough to carry
into the code comments:

- **The member has something to say and nowhere to say it.** Today a bereaved member who misses a cycle
  has no channel that is *about* their contribution standing. The alternative is not "nothing happens";
  it is that they file a helpdesk ticket, or say nothing and assume the system does not care.
- **The Niyamavali's answer is currently unstated.** R7(G) exists precisely so the rule is *auditable*
  (`4-2-r7-contribution-discipline-rules.md:140`: *"Its role is to exist as an auditable clause"*).
  Un-evaluated, the member never learns the rule; evaluated, their record says it plainly.
- **It can inform discretion without creating obligation** (AC5): the assertion is visible to a trustee
  as a fact and can never itself be a flag.

**Explicitly REJECTED — building nothing and keeping R7(G) held.** The epic AC is unambiguous
(`epics.md:3966`), and "the clause never excuses, so leave it dark" is exactly the reasoning that left
R7 structurally un-evaluated for two epics ([[project_r7_fact_producer_unbuilt]]).

### D2 — ⭐ RECOMMENDED. `member.personal_event_asserted`, on the MEMBER stream. Three reasons, one of which is decisive.

| Option | Verdict |
|---|---|
| `contribution.personal_event_asserted` | ❌ **Trips the 8.10 fence** (AC2). The fence source-scans four roots for a fourth `contribution.*` literal and names the offender. This is not negotiable and not worth a fence exception — the fence's whole purpose is that the vocabulary stays at three. |
| A new namespace (`discipline.*`) | ⚠ Viable — the 9.3 `reconciliation.*` precedent shows a new namespace is legitimate ([[project_reconciliation_transport_substrate]]). But it buys nothing here and forfeits the cache trigger below. |
| **`member.personal_event_asserted`** ⭐ | ✅ The assertion **is** a member act about the member, on the member's own stream. |

The three reasons:

1. **Semantics.** This is a statement a member makes about their own life, not a contribution
   transaction. `member.*` is where `address_updated`, `posting_updated` and `medical_disclosed` already
   live.
2. **The reducer already has this shape.** `member.address_updated` / `member.posting_updated` are
   shipped **non-transition markers reduced as identity** (`member/events.ts:166`, `:218-219`). AC8(f)
   follows an existing pattern rather than inventing one.
3. ⭐ **Decisive: cache invalidation comes free.** Migration `0036:103-107` fires on
   `NEW.event_type LIKE 'member.%'` keyed `member_id = NEW.stream_id`. Choose any other namespace and
   this story owes a new trigger — a migration, in a subsystem where migrations are hand-authored and
   [[project_live_db_test_gotchas]] applies. Choose `member.*` on the member stream and the fact's
   freshness guarantee is already installed and merely needs a proving test (AC8(b)).

**And the payload is `.strict()`** with the architecture §1.14 audit shape (`from_state`, `to_state`,
`trigger`, `actor: 'member'`) plus the bounded `kind` enum (**D3**) plus the optional cycle reference
(**D5**) — the `member/events.ts` house shape, not a bespoke one.

### D3 — ⭐ RECOMMENDED. A bounded vocabulary. **No free text. Not optional, not later.**

Free text here would be Tier-1 PII of the most sensitive kind — a member describing a death, an
illness, a family crisis — landing in `events_log`, which is **append-only and never redacted**. It
would need KMS envelope encryption (Story 1.5), an RTBF story (3.12), a PII-scrape-gate exemption
(1.16b), and a tone review of a text box that exists to collect grief.

**And it would earn nothing.** Nothing reads it: R7(G) is declarative, there is no reviewer (D1), and
the fact is a boolean. Free text on a surface with no reader is a **false promise** that someone is
listening — the exact harm AC1 forbids, in its most damaging form.

The bounded enum (`bereavement · illness · caregiving · displacement · financial_hardship · other`)
keeps the event non-PII plaintext, keeps the `.strict()` contract closed, and matches the shipped
no-free-text discipline ([[project_anonymous_diagnostic_log_convention]]). If a member needs to *say*
something, the Helpdesk (Epic 10.1–10.4) is the surface built for that, and it has real humans on the
other end — link to it rather than simulating one here.

⚠ `other` is deliberately retained despite carrying no information: removing it would force members
whose situation is not in the list to mis-categorise themselves, which is worse than a coarse bucket.

### D4 — ⚖ **RATIFIED 2026-08-06 by BigDev.** The violator-flag exclusion, filtered UPSTREAM on clause DATA.

This is the story's central design decision, and it is no longer only a design decision. The Trustee
Panel's ratified §3.1 text (`docs/legal/niyamavali.md:81`) settles it in the constitution:

> **R7(G)** — *"**No exemption.** Personal events do not excuse a missed contribution; the assertion is
> recorded on the member's own record but grants no restoration relief **and carries no consequence of
> its own.**"*

**"Carries no consequence of its own" is the legal basis for AC5**, not merely its rationale. A
violator flag on the surface that feeds suspension decisions **is** a consequence. So an implementation
that lets R7(G) produce a flag does not just harm members — it contradicts the ratified Niyamavali.

> ### ⚖ The invariant, stated once so it can be cited
>
> **A clause may influence trustee *understanding* without influencing trustee *suspicion*.**
>
> These are two different powers and the substrate already keeps them apart: `factsEstablishing[]`
> informs, `flags[]` accuses. R7(G) is granted the first and denied the second — and that is exactly
> what a clause with `never_excuses: true` and no restoration block is asking for. Any future
> declarative clause inherits the same treatment automatically, because the predicate reads the
> payload rather than the clause id.

Three options were weighed:

| Option | Verdict |
|---|---|
| Let R7(G) produce a violator flag | ❌ **A member is flagged as a suspension candidate for disclosing a bereavement.** Catastrophic, and precisely the class of outcome 10.24 D2 was written to prevent ("a governance surface that recommends suspending EVERYONE" — same mechanism, different trigger). |
| Filter inside `violator-flags.ts` | ❌ Two failures at once: it edits a **frozen** module (10.24 AC5 — *"if it needs a change, that is a finding"*), and the filter would be a **clause-id branch** in a codebase whose engine invariant is *no branch keyed by registry identity*. |
| **Filter UPSTREAM at both producers, on a DATA predicate** ⭐ | ✅ Same seam and same shape as the shipped `applied` filter; `violator-flags.ts` stays byte-frozen; the predicate reads the clause payload, so a trustee amendment moves it without a code change. |

The predicate — *does this clause impose a restoration obligation?* — is not a euphemism for *"is it
R7(G)?"*. It states the actual semantics of a violator flag: the flag asserts the member is **in a
holding**. R7(A)–(F) each prescribe `consecutive_required` and/or `lock_in_months` /
`catch_up_required` / `complete_all`. R7(G) prescribes `never_excuses: true`, which is the payload
saying *"this clause imposes nothing"* in its own words. If the Trustee Panel ever adds another purely
declarative clause, it is excluded automatically and correctly.

⚠ **Escalation 2**: this adds a second upstream filter to a shipped governance path. Recommended and
built; flagged because it changes which members appear on the Trustee-Lite surface, and because the two
seams that must carry it identically have drifted-by-omission once already (10.24 round 2).

### D5 — The fact is a **lifetime as-of existential**. The cycle reference is optional provenance.

`R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED` is a **bool** and the clause reads
`fact_equals … value: true`. Both are frozen wire contract. So the fact is *"has this member ever
asserted, as of `at`"* — the same shape as `ever_contributed`.

The alternative — scoping the fact to a cycle or a rolling window — was rejected: it would require the
engine to know *which* cycle the evaluation concerns (it does not; validity is member-standing, not
cycle-scoped), and it would make the boolean silently mean different things at different instants.

**But the assertion event SHOULD carry an optional cycle/pool reference**, because *"a personal event
affected my contributions"* is more meaningful on the record than a bare boolean, and because a future
cycle-scoped surface should not need a new event type.

> ⚠ **The finding this decision surfaces, recorded rather than absorbed: no member surface shows a
> MISSED cycle.** The Yogdaan Bahi (`contracts/src/contributions/contribution-history.ts`) lists the
> member's own **attested** contributions — a missed cycle produces no attestation and therefore **no
> row**; `grey` means *attested, cycle closed, no verdict*, not *missed*. So there is nowhere for the
> member to point at the specific cycle they mean. The assertion therefore anchors on the member's
> **status panel** (AC7), and the cycle reference is optional and — today — unpopulated by any UI. This
> is a genuine gap in the member's view of their own discipline; it is **Escalation 5**, not this
> story's to close.

Because the fact is monotone (`false → true`, never back), state that explicitly at the derivation
site, and note the consequence honestly: **a member cannot un-assert.** That is acceptable only because
the fact can never harm them (AC5) — the two decisions are load-bearing on each other and must be read
together. If AC5 is ever relaxed, monotonicity becomes a defect.

### D6 — Why activating R7(G) is legitimate here, when activating R7(A)/(B) is not.

Every previous story in this decomposition ended with *"the fact is supplied but the clause stays
held"*, and a reader arriving here may reasonably expect the same. **It does not apply**, and the
distinction is precise:

| | R7(A)/(B) | R7(G) |
|---|---|---|
| Blocking fact | `member.joining_discipline_state` — **absent** (10.23) | `personal_event_excuse_claimed` — **supplied by this story** |
| Population defined by a **disclaimed proxy**? | **Yes** — `prd.md:344` disclaims `total_count < 10` / `ever_contributed == false`; `:346` NORMATIVELY forbids evaluating from them | **No.** The population is *"a member who asserted"* — the assertion **is** the constitutional fact, not a proxy for one |
| Registry amendment outstanding? | **Yes** — Trustee Panel Part 11 (Decision 2026-08-06-077), **unpublished** | **No.** R7(G) is **RATIFIED INTO §3.1** (2026-08-06, `niyamavali.md:81`) — Escalation 1 closed by ratification |
| Eligibility consequence of activating | Real — decides whether a restoration path exists | **None** — `no_exemption`, `never_excuses: true`; AC5 removes the only indirect consequence |

`prd.md:346` says it directly: *"R7(C)–(G) gate on gap, skip and excuse facts rather than joining
discipline and are unaffected by this constraint — though R7(G) remains un-evaluated for a separate
reason, its own fact source."* **This story removes that separate reason.**

### D7 — No new table. The event is the record. No new projection.

10.24 **D8** ruled the general form: *"If you find yourself wanting to emit a `contribution.fact-*`
event, stop — that is a projection, and projections do not need events."* This story is the **mirror**
case and the rule points the other way: there is no existing data to project, because the member act
has never happened. **A new fact needs an event exactly when nothing in the system already knows it.**

So: one event type, no table, no projection, no migration. The existential is read from `events_log`
directly (**AC9**) — the same posture `packages/domain/src/member/` already takes for lifecycle anchors
([[project_member_lifecycle_domain_substrate]]).

**No migration is expected in this story.** If one becomes necessary, that is a design change worth
escalating — and it must be hand-authored (never `db:generate`: the drizzle baseline is frozen and a
regenerate raises `42P07`, [[project_live_db_test_gotchas]]).

---

## Escalations owed (raise them; do not silently absorb)

1. **✅ RESOLVED 2026-08-06 — R7(G) is RATIFIED INTO THE NIYAMAVALI. Closed by ratification, not by
   deferral** ([[feedback_closure_language_precision]]). Raised because
   `moderation-model-decision-brief.md:163` marked R7(G) ⚠️ *"not in §3.1"* — a TSCT carry-over the
   ratified legal text did not contain — and because its sibling R7(F) carried the same marker with
   only a brief **D9** *recommendation* behind it. **The Trustee Panel ratified BOTH**, and
   `docs/legal/niyamavali.md` §3.1 (`:80-83`) + Appendix A (`:223-224`) now carry them
   ([[project_r7f_r7g_ratified_into_niyamavali]]). R7(F) — **already activated by 10.24** — was
   operating ahead of its legal text until this ratification; R7(G) activates *behind* it, which is
   the correct order and the reason this was raised **before** activation rather than after.

   The ratified R7(G) text is **stronger than this story assumed** and is now binding on AC5 (see
   **D4**): *"the assertion is recorded on the member's own record but grants no restoration relief
   **and carries no consequence of its own**."*

   > ⚠ **UPDATE 2026-08-06, same day:** (a) below was live-disputed between two concurrent sessions
   > working this repo — one proposed an in-place seed edit, the other (this text) argued it must be a
   > new clause VERSION via the amendment ledger, never an in-place JSONB edit
   > ([[feedback_supersede_never_reinterpret]]). **Resolved by the operator in favour of the in-place
   > edit**, reasoned as follows: `feedback_supersede_never_reinterpret` protects **historical payloads
   > that were already in force** for a real member; `docs/legal/niyamavali.md`'s own front matter still
   > carries `[[v1.0]]` / `[[date]]` — this Niyamavali has **never published**, so version 1 has never
   > been "in force" for anyone. Dropping a pre-launch draft's review-status flag is not a policy
   > supersession; it is finishing the draft, exactly as **D9** already prescribed for R7(C) ("record 12
   > months… so it can drop `provisional: true`"). Decision **2026-08-06-080** records this.
   >
   > **(a) DONE, not open.** `packages/domain/seed/niyamavali-v1-clauses.sql`'s `r7-f` and `r7-g` rows
   > now carry `"policy_review_required":false,"provisional":false` (Decision 2026-08-06-080). R7(A)/(B)/(C)/(D)/(E)
   > are **unchanged** — do not assume ratification propagated to them. Verify live before citing, as
   > always ([[feedback_verify_before_committing_governance_claims]]).
   >
   > **(b) `moderation-model-decision-brief.md:163`'s ⚠️ marker and `.decision-log.md` /
   > `deferred-work.md` may still read as open.** Verify current state before citing any of them;
   > correct in place under **AC10** rather than assuming the ratification propagated. (`.decision-log.md`
   > now carries Decision 2026-08-06-080, which explicitly does NOT discharge the `:136` R7(G) fact-hold
   > line — that line is about engine activation, still this story's job, still accurate.)
2. **The violator-flag exclusion (D4/AC5)** — a second upstream filter on a shipped governance path,
   changing which members appear on the Trustee-Lite surface. Recommended, built, flagged; **both**
   seams revert-probed.
3. **`R7_HELD_FACTS` becomes empty and `R7_HELD_CLAUSES` drops to two.** The mechanization reaching its
   own end state for the `contribution.*` family. Confirm the totality/falsifiable-hold assertions
   still **bite** rather than passing vacuously (AC4), and record that the *next* fact-hold apparatus —
   R8's `compliance_percent`, still **UNOWNED** (`deferred-work.md`) — has no equivalent mechanization.
4. **No UX-spec coverage.** Zero hits for *personal event* / *excuse* in
   `ux-design-specification.md`. Every string is new copy on a bereavement-adjacent surface; route it
   through `docs/tone-guide.md` deliberately and record the review.
5. **No member surface shows a MISSED cycle (D5).** The member cannot point at the cycle they mean, so
   the assertion's cycle reference ships **optional and unpopulated**. A genuine gap in the member's
   view of their own contribution discipline; recorded, and **OWNED BY THE TRUSTEE PANEL** (assigned
   2026-08-06 by BigDev) — not this story's to close. Six questions owed, two blocking; see
   `deferred-work.md`. ⚠ Decaying: assertions are being recorded now with no cycle anchor and cannot
   be backfilled later.
6. **The query budget grows (AC9):** 2 → 3 per-member, 7 → 8 for the Pariwar scan, plus a fifth hoisted
   clause resolution. Measured against FR-12A's p95 < 200 ms at 4L, and recorded in `p95-budget.md`
   — but the 4L figure remains **un-attested** at production scale
   ([[feedback_record_unattested_no_backfill]]).

---

## Tasks / Subtasks

### Task 0 — Orient; confirm nothing moved under you (AC: all)
- [x] `git fetch origin`; confirm `main` is `c46d872`
      ([[feedback_git_fetch_before_remote_reasoning]]). **The tree will NOT be clean at `c46d872`** —
      `.decision-log.md`, `sprint-status.yaml` and `packages/domain/seed/niyamavali-v1-clauses.sql`
      carry this story's own pre-work (Decision 2026-08-06-080: dropping the `r7-f`/`r7-g`
      `provisional`/`policy_review_required` flags — Escalation 1(a)). Confirm those three diffs are
      exactly that pre-work and nothing else, commit them as a precursor commit, **then** branch from
      the resulting commit. If `main` has moved past `c46d872` by a different diff, stop and re-baseline
      the citations below by content, not by assumption.
- [x] Re-verify live before citing: `producer.ts:190-223`, `rules.ts:78-152`,
      `r7-activation-totality.test.ts`, `violator-flags.ts:195-219`, `r7-candidate-scan.ts`,
      `ladder.ts:125-132`, `no-ingest-path.test.ts:63-68`, `0036_member-validity-cache.sql:103-107`,
      `niyamavali-v1-clauses.sql:291`. Record any drift
      ([[feedback_verify_before_committing_governance_claims]]).
- [x] Confirm `10-23` is still `backlog` — this story must not assume it landed, and must not touch
      R7(A)/(B).
- [x] Capture a `pnpm ci:local` **baseline** (with and without `DATABASE_URL`) **before any edit**.

### Task 1 — ⭐ FIRST: the harm gate, before the thing that can cause the harm (AC: 5; D4)

**Deliberately first.** AC5 is the reason this story is risky. Landing the exclusion before R7(G)
enters `VALIDITY_RULE_ORDER` means there is no commit in which an assertion could flag a member.

- [x] Add `imposesRestorationObligation(payload)` — a PURE, DATA-driven predicate. **No clause-id
      branch.** Export it from one place; both seams import it. Carry the ratified **D4** invariant
      into its doc comment verbatim in substance — *a clause may influence trustee understanding
      without influencing trustee suspicion* — with the `niyamavali.md:81` citation, so a future reader
      sees the constitutional basis and not merely a design preference.
- [x] Test it against the **seeded** R7(A)–(G) payloads: (A)–(F) → `true`, (G) → `false`. Read the
      seed, do not re-spell the payloads.
- [x] Apply it at `evaluateAppliedR7ClauseSlots` (`rules.ts:308-329`) beside the existing `applied`
      filter, and at the equivalent point in `r7-candidate-scan.ts` (hoisting the fifth
      `resolveByClauseId` **outside** the per-member loop — AC9).
- [x] `violator-flags.ts` stays **byte-unchanged** except its header comment (AC10). A change to its
      logic is a **finding**, not a task.
- [x] **Revert-sanity probes, RUN and recorded — BOTH seams** (AC5): delete each filter in turn; a
      behavioural test must go RED naming the R7(G) flag. Restore; verbatim counts in the Dev Agent
      Record.

### Task 2 — The assertion instrument (AC: 1, 2; D1, D2, D3, D7)
- [x] `packages/domain/src/member/events.ts` — `PersonalEventAssertedPayloadSchema` (`.strict()`,
      audit shape + `actor: 'member'` + the bounded `kind` enum + the optional cycle/pool ref);
      register `'member.personal_event_asserted'` in `MEMBER_EVENT_TYPES` + the payload-schema map.
- [x] `packages/domain/src/member/state.ts` — reduce it as **IDENTITY** (the `address_updated` /
      `posting_updated` precedent). Test: identity from **every** legal lifecycle state.
- [x] `packages/events/src/registry.ts` — register the type. ⚠ This file **is** in the 8.10 fence's
      scanned roots; the event name contains no `contribution.` literal, which is the whole point.
- [x] The write path (`packages/domain/src/member/…`): append on the **member's own stream**
      (`stream_id = member_id`). **No table, no projection, no migration** (D7).
- [x] **Run `pnpm --filter @twt/domain test` and confirm `no-ingest-path.test.ts` is GREEN** (AC2).
      Verify; do not assume.
- [x] AC1 vocabulary sweep over the whole diff — no waiver/exemption/request/approve semantics in any
      route, field, event, constant, or copy key.

### Task 3 — The fact (AC: 3, 9; D5)
- [x] A bounded existential read in `packages/domain/src/member/…` returning a **boolean** anchor
      (**never** the dotted fact key — AC2), as-of `at`, in **both** shapes: single-member and
      `GROUP BY member` for the Pariwar scan.
- [x] `ContributionFactsInput` gains the anchor; `deriveContributionFacts` maps it purely.
      `contributionFactsToBag` emits it from `R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED`.
- [x] Document the **coverage-gate asymmetry** (AC3): the assertion is not projection-bounded, so
      `false` is a real answer, not an unknown. State it where a reader will hit it.
- [x] Unit-test DB-free: never asserted → `false`; asserted → `true`; asserted **after** `at` → `false`
      (as-of correctness); several assertions → `true` once; assertion + `deriveContributionFacts`
      returning `null` → the sentinel, never a lone seventh fact.
- [x] Extend the **counted-query assertions**: 0 / 1 / several assertions → exactly **three** (member)
      and exactly **eight** (Pariwar scan). Re-state both budget doc comments (AC9).

### Task 4 — Activation + the mechanization (AC: 4, 6)
- [x] `producer.ts` — `R7_SUPPLIED_FACT_KEYS` gains the seventh key; `R7_HELD_FACTS` → **explicitly
      typed empty array** (AC4).
- [x] `rules.ts` — `R7_ACTIVATED_CLAUSE_IDS` gains `r7-g`; delete its `R7_HELD_CLAUSES` entry.
      **R7(A)/(B) are untouched.** Record at the deletion site *why* deletion (not narrowing) is right
      here (D6).
- [x] `r7-activation-totality.test.ts` — all four assertion updates from the AC4 table, plus
      `expect(R7_HELD_CLAUSES.length).toBe(2)` so the loops cannot go vacuous.
- [x] **Revert-sanity probe, RUN and recorded** (AC4): remove `r7-g` from `R7_ACTIVATED_CLAUSE_IDS`
      without re-adding the hold → totality RED. Restore; verbatim counts.
- [x] Pin the **precedence** invariant (AC6): R7(G) is the lowest in the family and never wins the pick
      against an imposing clause — with the *why* in the test name.
- [x] Pin the `restorationPackage` transition (AC6): R7(G)-only → `no_consecutive_requirement` with
      `clauseId: '…r7-g'`. **No fourth arm.**

### Task 5 — The member surface (AC: 7; D1, D3)
- [x] `packages/contracts/src/…` — `.strict()` request/response DTOs; local wire-enum for `kind`
      (contracts must **not** import `@twt/domain`), plus a lockstep test against the domain enum.
      Regenerate `openapi/v1.yaml`; `contracts:check-openapi-determinism`.
- [x] `apps/api` — the member route: `requireMemberSession`, per-member FR-88 write limit
      (`perMemberKey`, `hook:'preHandler'`), `Idempotency-Key` header, `:pariwarId`-vs-JWT mismatch →
      **404**. Follow `helpdesk/member-routes.ts`.
- [x] `packages/ui/src/member-status/` — presenter stays **strictly pure**, emits KEYS only. Confirm
      `memberStatus.rule.<R7(G) reasonCode>` resolves in **`en` and `hi`**; author it if absent (AC6).
- [x] `apps/mobile/app/(membership)/index.tsx` — the affordance, the **pre-submit** consequence
      statement, the bounded picker, the confirmation. Hindi-first via `useT()`.
- [x] New i18n copy in **`en` and `hi`** (`packages/i18n/locales/{en,hi}/contribution.json`), routed
      through `docs/tone-guide.md`. **Record the tone review** (Escalation 4).
- [x] Link to the Helpdesk for anything the member actually needs a human for (D3) — do not simulate
      one here.

### Task 6 — Blast radius (AC: 8)
- [x] **Live-DB test that migration `0036`'s `member.%` trigger evicts the member's validity-cache row**
      on an assertion append (AC8(b)). **No new trigger. No cache-key change** (10.17 D5, re-rejected
      twice).
- [x] `assignment-version-pin-replay.spec.ts` stays green **unchanged**; `POOL_ASSIGNMENT_HASH_VERSION`
      still `'v1'`.
- [x] Deploy note (the ≤60 s shape window + the `invalidate-all` lever) in `deferred-work.md` and the
      Dev Agent Record.
- [x] Re-run the AI-4-1 p95 harness + `test:determinism` (**exactly ONE hash**); append the versioned
      record to `p95-budget.md`.

### Task 7 — Tier-2 reconciliation (AC: 10)
- [x] Every row of the AC10 table, corrected **in place**.
- [x] `grep -rn "story-10-26"` over `packages` + `apps` (excluding `dist`) — every remaining hit is a
      site where this story genuinely IS the producer.
- [x] Update the four hardcoded held-fact fixtures listed in AC10 to the new truth — they fail loudly,
      which is the mechanization working.

### Task 8 — Measure, then validate (AC: 9, 11)
- [x] **The N+1 review pass first** — walk the whole diff for a query inside a loop over members, pools
      or clauses. Structural gate; the numbers corroborate.
- [x] Full AC11 validation, both `DATABASE_URL` modes. Chase every live failure to root cause; confirm
      innocence in isolation. Record anything not run as **un-attested**
      ([[feedback_record_unattested_no_backfill]]).

### Task 9 — Governance records
- [x] `.decision-log.md` — record D2 (namespace + the cache-trigger consequence), D3 (no free text),
      **D4 (the violator-flag exclusion — the decision this story is really about)**, D5 (lifetime
      existential + the missed-cycle gap), D6 (why R7(G) may activate when R7(A)/(B) may not). Update
      the *"R7(G) remains held — Story 10.26"* open-follow-up line to **discharged** — locate it by
      grep, its line number moved from `:136` once the Task 0 precursor commit landed.
- [x] `deferred-work.md` — close the 10.24 hold entry (both halves now discharged); open Escalations
      4, 5, 6. Escalation 1 (including its former carried item (a), the `r7-f`/`r7-g` seed flags) is
      **fully closed by ratification** (Decision 2026-08-06-080) — record it as discharged, do not
      re-open it and do not re-litigate the in-place-edit-vs-new-version question it already settled.
- [x] `sprint-status.yaml` — one combined `ready-for-dev → in-progress → review` ledger entry at
      completion ([[project_sprint_status_ledger]]).
- [x] Update [[project_r7_fact_producer_unbuilt]] and
      [[project_contribution_fact_projection_substrate]] — both become stale the moment this merges
      (all seven keys supplied; five of seven clauses activated).

---

## Dev Notes

### The three-story arc closes here

| Story | Supplied | Activated | Left held |
|---|---|---|---|
| 10.24 | `total_count`, `ever_contributed`, `months_since_last`, `skips_current_year`, `in_lapse` | R7(C)(D)(E)(F) | R7(A)(B)(G) |
| 10.25 | + `r7a_restorations_used` | — (R7(A) needs 10.23 **and** a published Part 11 amendment) | R7(A)(B)(G) |
| **10.26** | **+ `personal_event_excuse_claimed` → all seven** | **+ R7(G) → five of seven** | **R7(A)(B) only** |

After this story the ONLY un-activated R7 clauses are R7(A)/(B), and their blockers are **not facts** —
they are Story 10.23 and a Trustee Panel instrument. `contribution.compliance_percent` (R8) remains
**UNOWNED**.

### Things that will bite

- **The 8.10 fence is a source scan, not a type check.** It fails on a string in one of four
  directories. `pnpm --filter @twt/domain test` early and often (AC2).
- **`R7_HELD_FACTS` going empty is a typing hazard**, not just a value change (AC4). `[] as const`
  loses the element type at every consumer.
- **The two R7 producers must carry the AC5 filter identically.** They already carry twin `applied`
  filters and drifted-by-omission once (10.24 round 2 found the bulk seam un-probed). Share one
  function; probe both.
- **`ladder.ts`, `interpretClause` and `violator-flags.ts` are FROZEN.** All three are shared by
  R7/R8/special-death and sit behind the 100×-thread determinism P0 gate. If one appears to need a
  change, that is a finding to raise, not a task to do.
- **`domain` cannot import `@twt/niyamavali-engine`** (package cycle — `concealment-review.ts:10-13`
  documents it). The dotted fact key belongs to the producer, not the domain read (AC2).
- **`contracts` cannot import `@twt/domain`** ([[project_contracts_domain_bundle_boundary]]) — `pg`
  would leak into the RN Metro bundle. Local wire-enum + lockstep test.
- **Domain camelCase vs contracts snake_case** drift and JSONB `->>` casts are recurring
  ([[feedback_story_validate_footguns]]).

### Project Structure Notes

Expected touch set (files marked **NEW**; everything else is an UPDATE):

```
packages/domain/src/member/events.ts                  ← event type + .strict() payload schema
packages/domain/src/member/state.ts                   ← reduce as IDENTITY
packages/domain/src/member/personal-event.ts   NEW    ← write + as-of existential read (both shapes)
packages/events/src/registry.ts                       ← register the type
packages/validity-service/src/producer.ts             ← 7th key; R7_HELD_FACTS → typed empty
packages/validity-service/src/rules.ts                ← activate r7-g; drop its hold; AC5 filter
packages/validity-service/src/r7-candidate-scan.ts    ← AC5 filter + 5th hoisted clause resolution
packages/validity-service/tests/r7-activation-totality.test.ts
packages/contracts/src/…                       NEW    ← .strict() assertion DTOs + wire-enum
apps/api/src/modules/…                         NEW    ← member route + handler
packages/ui/src/member-status/{presenter,view-model,i18n-keys}.ts
apps/mobile/app/(membership)/index.tsx                ← the affordance + pre-submit disclosure
packages/i18n/locales/{en,hi}/contribution.json       ← new copy (tone-gated)
packages/domain/src/trustee-lite/violator-flags.ts    ← HEADER COMMENT ONLY (frozen logic)
```

**No migration.** **No new table.** **No new projection.** (D7 — if one becomes necessary, escalate.)

### References

- ⚖ `docs/legal/niyamavali.md:80-83` (§3.1) + `:223-224` (Appendix A) — **the ratified R7(F)/R7(G)
  clauses (Trustee Panel, 2026-08-06)**. R7(G)'s *"carries no consequence of its own"* is binding on
  AC5/D4. See [[project_r7f_r7g_ratified_into_niyamavali]] for what the ratification did **not** do.
- `_bmad-output/planning-artifacts/epics.md:3954-3970` — Story 10.26 ACs; `:3905-3953` — 10.24/10.25
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:339-356` — FR-9, incl. the normative
  `:346` R7(A)/(B) proxy prohibition and its explicit R7(C)–(G) carve-out
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-04-R2.md:106,208` — *"No assertion
  path exists"*; the 10.26 scope statement
- `_bmad-output/implementation-artifacts/10-25-r7a-restoration-accounting.md` — the immediate
  predecessor and the structural exemplar for this story's AC shape
- `_bmad-output/implementation-artifacts/10-24-contribution-fact-producer-projection-r7-cf-activation.md`
  — D2 (applied-only), D6 (honest sentinel), D8 (projections do not need events)
- `_bmad-output/implementation-artifacts/moderation-model-decision-brief.md:162-163` — the R7(F)/R7(G)
  ⚠️ *"not in §3.1"* markers, **both superseded by the 2026-08-06 ratification** (Escalation 1); D9 —
  the two-rung C/F ladder that the ratification also discharged
- `_bmad-output/implementation-artifacts/4-2-r7-contribution-discipline-rules.md:120,140` — the fact
  contract and *"its role is to exist as an auditable clause"*
- `_bmad-output/implementation-artifacts/deferred-work.md:36-58` — the mechanized hold and its
  *"Re-trigger: 10.26 landing"*
- `.decision-log.md:136` — *"`contribution.personal_event_excuse_claimed` (R7(G)) remains held"*
- `docs/tone-guide.md` · `docs/policies/out-of-band-contributions.md`

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), via `bmad-dev-story`.

### Debug Log References

**Baseline (before any edit).** `pnpm ci:local` without `DATABASE_URL` → `ci:local PASSED — 29 job(s)
green`, exit 0. Captured so an inherited flake could not later be attributed to this work.

**Precursor commit `838f667`** — the Escalation-1(a) pre-work that was already in the working tree at
baseline `c46d872` (`.decision-log.md` Decision 2026-08-06-080, `sprint-status.yaml`, and the seed's
`r7-f`/`r7-g` `provisional`/`policy_review_required` flag drop). Verified to be exactly that and
nothing else, committed, then branched.

**⭐ Revert-sanity probe #1 — AC4 totality (RUN, RECORDED, RESTORED).** Removed
`'niy.contribution-discipline.r7-g'` from `R7_ACTIVATED_CLAUSE_IDS` **without** re-adding it to
`R7_HELD_CLAUSES`. Verbatim: `Tests  2 failed | 8 passed (10)`.
- `activated ∪ held === R7_CLAUSE_IDS` → RED, `expected [ …(6) ] to deeply equal [ …(7) ]`
- `activates EXACTLY R7(C)/(D)/(E)/(F)/(G)` → RED, `expected [ …(4) ] to deeply equal [ …(5) ]`

This probe runs in the **opposite direction** from 10.24's (which added a clause and produced a
duplicate); this one removes one and produces a gap. Totality catches an under-count as loudly as an
over-count. Restored; suite green.

**⭐ Revert-sanity probe #2 — AC5 the harm gate, bulk seam (RUN, RECORDED, RESTORED).** Deleted
`.filter((entry) => contributesViolatorFlag(entry.clauseId, payloadsByClauseId))` from
`r7-candidate-scan.ts`. Verbatim: `Tests  2 failed | 30 skipped (32)`, both naming the clause:
- bereaved-member case → `expected [ 'niy.contribution-discipline.r7-g' ] to deeply equal []`
- already-flagged member → `expected [ …(3) ] to deeply equal [ …(2) ]`, the extra entry being
  `"niy.contribution-discipline.r7-g"`

That is a member acquiring a suspension-candidate flag for disclosing a bereavement, reproduced
exactly on the live scan path. Restored immediately.

**⭐ Revert-sanity probe #3 — the accusation-channel FENCE (RUN, RECORDED, RESTORED).** Added a second
production caller of `deriveViolatorFlags` (`src/probe-b-accusation.ts`).
`tests/violator-accusation-channel.test.ts` → RED with its own message, naming
`packages/validity-service/src/probe-b-accusation.ts`. `Tests  1 failed | 2 passed (3)`. File deleted;
fence green. This probe substitutes for the second-seam filter probe AC5 asked for — see the finding
below for why that seam carries no filter.

**AC2 — the Story 8.10 fence, verified not assumed.** `pnpm --filter @twt/domain exec vitest run
tests/contribution/no-ingest-path.test.ts` → `7 passed`, run **before** the fact wiring landed and
again at the end. The dotted key `'contribution.personal_event_excuse_claimed'` appears in none of the
four scanned roots.

**AC8(b) — cache invalidation PROVED, not built.** A new live-DB case in
`tests/integration/validity-cache.spec.ts`: warm the cache, append
`member.personal_event_asserted`, and the row count goes `1 → 0` with the next read reporting
`{ kind: 'miss' }`. No new trigger, no migration, no cache-key change.

**AC9 — measured.** AI-4-1 p95 harness: `p50 7.80 ms · p95 10.92 ms · p99 13.91 ms` (120 iterations)
against FR-12A's 200 ms. Determinism gate: exactly ONE hash across 100 OS threads.

**AC11 validation — the full record, including what was NOT clean.**

| Gate | Result |
|---|---|
| `pnpm turbo run typecheck` | 20/20 ✓ |
| `pnpm turbo run lint` | 20/20 ✓ |
| `pnpm --filter @twt/domain test` (the 8.10 fence) | 2361 passed / 1 skipped ✓ |
| `pnpm --filter @twt/validity-service test:determinism` | exactly ONE hash across 100 threads ✓ |
| `contracts:check-openapi-determinism` | ✓ (and `openapi/v1.yaml` byte-unchanged — the DTOs carry no `.openapi()`) |
| `pnpm domain-invariants:check` | ✓ |
| `pnpm exec tsx scripts/microcopy/check.ts` | ✓ |
| `pnpm turbo run i18n:check-parity` | ✓ |
| **`pnpm ci:local` (no `DATABASE_URL`)** | **PASSED — 29 jobs green** ✓ |
| **`pnpm ci:local` (with `DATABASE_URL`)** | **2 jobs red — one REAL failure fixed, then flakes only** |

**⚠ The real failure, chased to root cause and FIXED, not silenced.** The first live-DB run went red on
`tests/integration/validity-service.spec.ts` → "assembles the canonical payload…" with
`+ "contribution.personal_event_excuse_claimed": false` in the diff. That is an EXACT fact-map
assertion this story genuinely invalidates — the mechanization working. Updated to the new truth (with
the reason the seventh key is unconditional, unlike the two absences the same test documents).
Re-ran: `5 passed`.

**⚠ The remaining live-DB reds are PRE-EXISTING FLAKES, confirmed by isolation — not presumed
innocent.** Every failing spec was in a file this story never touched, and each passes alone:

| Failing under `ci:local` | In isolation |
|---|---|
| `admin` × 5 (add-pariwar-form, news-page, helpline-claim-page, ground-inspection-page ×2) | **271/271 passed** |
| `@twt/api` `banners.spec.ts` ("expected 500 to be 201") | **26/26 passed** |
| `@twt/channels` `dispatch-audit.spec.ts` ("Cannot use a pool after calling end", 5000 ms timeout) | **1/1 passed** |

Both signatures are on file: [[project_ci_local_concurrency_oversubscription]] (a different victim
each run, always timing-shaped) and [[project_ci_local_double_run_pollution]] (a `DATABASE_URL`-global
run executes integration specs twice — visibly so here, the validity-service failure appearing under
BOTH `test (unit)` and `integration-tests`). To close it out, **every package this story touches was
run in full, in isolation, with `DATABASE_URL` set**:

`domain` 2361✓ · `api` 858✓ · `validity-service` 270✓ · `contracts` 846✓ · `admin` 271✓ ·
`channels` 204✓ · `ui` 102✓ · `niyamavali-engine` 144✓ · `events` 33✓ · `api-client` 1✓

⚠ **Recorded as un-attested rather than claimed green:** a single fully-clean `ci:local` run in
`DATABASE_URL` mode was not achieved on this branch. The evidence above is per-package isolation, not
one green aggregate — a weaker claim, stated as such ([[feedback_record_unattested_no_backfill]]).

### Completion Notes List

**⚠ FINDING — AC5 and AC6 conflict as written; resolved in AC5's own favour, and mechanized.**
AC5's table asks for the `imposesRestorationObligation` filter at BOTH R7 producers, on the stated
premise that both feed violator flags. A source trace shows they do not, and the two channels are
different things:

| Seam | Its `applicableNiyamavaliClauses` is read by | Channel | Filtered? |
|---|---|---|---|
| `r7-candidate-scan.ts` | `deriveViolatorFlags` → `summarizeViolatorFlags` → the Trustee-Lite violator section | **accusation** | **YES** |
| `evaluateAppliedR7ClauseSlots` | `assembleClauses` → `MemberValidityPayload` → `@twt/ui` `buildRuleExplanations` | **the member's own record** | **NO** |

Filtering the second would delete `memberStatus.rule.rule.no_exemption` — the one thing this story
exists to put on the member's record (**AC6**) — leaving R7(G) activated but **mute**. That is not a
relaxation of AC5; it is AC5's own ratified invariant (*a clause may influence trustee understanding
without influencing trustee suspicion*) applied to the channel that actually accuses. Because the
asymmetry is only safe while it stays true, it is **mechanized** by a new fence,
`tests/violator-accusation-channel.test.ts`, which fails if any production module outside the
trustee-lite handler routes a clause list into `deriveViolatorFlags`. Probe #3 above proves it bites.

**⚠ FINDING — AC6's predicted i18n key was one segment short.** AC6 states the key is
`memberStatus.rule.no_exemption`. `ruleExplanationKey` prefixes `memberStatus.rule.` onto a reasonCode
that is *itself* already `rule.`-prefixed (`interpretClause` builds `` `rule.${decision}` ``), so the
shipped key is **`memberStatus.rule.rule.no_exemption`** — as the pre-existing Story 4.7 test
(`…rule.rule.a_ok`) already pinned. Authored in `en` **and** `hi`, and a new test asserts it
**resolves** in both, because `ruleExplanationKey` interpolates blindly and a missing key renders the
raw code to the member (a11y `:1896` forbids it).

**⚠ FINDING — AC9's Pariwar-scan baseline was already stale.** AC9 predicted `7 → 8`. The true
baseline was **8**: Story 10.25 added `readContributionProjectionContext` as a third statement inside
the bulk fact read and updated only `facts.ts`'s comment, leaving `r7-candidate-scan.ts`'s header
claiming 7. The real move is **8 → 10** (+1 assertion existential, +1 hoisted clause resolution for
R7(G)). Both budgets are now carried by **counted assertions** — including a bulk counted-query test
that **did not exist before** — rather than by comments, which is the whole lesson.

**What shipped.**
- ⭐ **The harm gate FIRST** (Task 1, before activation, so no commit exists in which an assertion
  could flag a member): `imposesRestorationObligation(payload)` — a PURE, DATA-driven predicate over
  the clause's own `restoration` block, with **no clause-id branch**. Pinned against the **seeded**
  R7(A)–(G) payloads read from the seed SQL itself, plus a vocabulary-coverage assertion so an
  unclassified future restoration key fails loudly instead of being swept into "no obligation".
  `violator-flags.ts` is byte-frozen except its header comment.
- **The instrument**: `member.personal_event_asserted` (D2) — `.strict()`, audit shape,
  `actor: z.literal('member')`, a bounded six-value `kind` enum, optional `cycle_ref`. Reducer
  IDENTITY from all nine lifecycle states. **No table, no projection, no migration** (D7).
- **The seventh fact**: an as-of, lifetime existential read from `events_log` in both shapes
  (single-member `EXISTS`, Pariwar `GROUP BY`). The coverage-gate **asymmetry** is documented at the
  derivation site — `false` is a real answer here, unlike the projection facts, because `events_log`
  has no backfill horizon; the payload-level coverage gate still governs, so the seventh fact never
  rides alone. ⚠ A third pass folds members who have **only** ever asserted into the bulk result, so
  the bulk and single-member paths cannot diverge on exactly the member R7(G) is about.
- **Activation**: `R7_ACTIVATED_CLAUSE_IDS` 4 → 5, `R7_HELD_CLAUSES` 3 → 2 (the R7(G) entry
  **deleted**, with the D6 why-deletion-not-narrowing reasoning at the site), `R7_SUPPLIED_FACT_KEYS`
  6 → 7, and `R7_HELD_FACTS` → **explicitly typed empty array** (not `[] as const`, which would lose
  the element type at every consumer). `expect(R7_HELD_CLAUSES.length).toBe(2)` added at both loops so
  they cannot go vacuously green.
- **The surface**: `.strict()` DTOs with a local wire-enum + lockstep test (contracts must not import
  `@twt/domain`); `POST /api/v1/p/:pariwarId/member/contributions/personal-events` with
  `requireMemberSession`, the FR-88 **per-member** write limit, an `Idempotency-Key` **header**, and
  a `:pariwarId`-vs-JWT mismatch → **404**; a mobile component whose **pre-submit** disclosure states
  the Niyamavali's answer before the member commits; en+hi copy through the tone guide.
- **Tier-2**: every AC10 row corrected in place, plus three stale sites the table did not list
  (`contracts/trustee-lite/dto.ts`, `contracts/members/validity.ts`, and a **live** `heldFacts`
  fixture in `validity-service.spec.ts` still asserting `story-10-26`).

**AC1 vocabulary sweep** over the whole diff: no waiver/exemption/request/approve semantics in any
route, field, event, constant, audit action or copy key. The one `exemption` hit is a reference to the
PII-scrape-gate's own exemption mechanism, and `no_exemption` is the frozen clause outcome slug.

**Deliberately NOT done, and why.** No Turnstile gate on the route (AC7 enumerates three gates and
Turnstile is not among them; unlike the helpdesk create this surface accepts no free text, no files
and pages nobody — recorded as a decision at the handler). No `GET` route (a member has nothing to
check back on — adding one would invite them to look for a decision that will never come). No
`POOL_ASSIGNMENT_HASH_VERSION` bump (`assignment-version-pin-replay.spec.ts` byte-unchanged and
green). No edit to the R7(G) clause JSONB (comment block only). No fourth `RestorationPackageState`
arm. R7(A)/(B) untouched.

**Owed at deploy (third time):** the ≤60 s payload-shape window. Call
`POST /api/v1/p/:pariwarId/admin/validity-cache/invalidate-all` after rollout. ⚠ An *assertion* needs
no such step — migration `0036`'s trigger handles it per-member.

**Escalations:** 1 closed by ratification (pre-work commit `838f667`); 2 built and flagged; 3, 4, 5, 6
recorded in `deferred-work.md`. **Escalation 5 (no member surface shows a MISSED cycle) is genuinely
open and is OWNED BY THE TRUSTEE PANEL** (assigned 2026-08-06 by BigDev), with six questions recorded
verbatim in `deferred-work.md` — two of them blocking. The Panel owns the DECISION, not the surface;
implementation ownership follows from their answer, and two of the possible answers close the
escalation with nothing to build. Flagged this precisely because a deferral that names an owner but
no answerable question expires just as surely as one that names an epic.

### File List

Paths relative to repo root. **NEW** = created by this story; everything else is an UPDATE.
The precursor commit `838f667` (Escalation-1(a): `.decision-log.md` Decision 2026-08-06-080,
`sprint-status.yaml`, the seed's `r7-f`/`r7-g` flag drop) landed before the branch and is listed
separately at the end.

**The harm gate (AC5/D4) — Task 1**
- `packages/validity-service/src/rules.ts` — `imposesRestorationObligation` + `contributesViolatorFlag` + `RESTORATION_OBLIGATION_KEYS`; R7(G) activated; its `R7_HELD_CLAUSES` entry deleted; headers corrected
- `packages/validity-service/src/r7-candidate-scan.ts` — the AC5 filter + hoisted payload map; query budget re-counted 8 → 10; the seam-asymmetry record
- `packages/validity-service/tests/imposes-restoration-obligation.test.ts` **NEW** — the predicate over the SEEDED R7(A)–(G) payloads + vocabulary coverage
- `packages/validity-service/tests/violator-accusation-channel.test.ts` **NEW** — the fence mechanizing the seam asymmetry
- `packages/domain/src/trustee-lite/violator-flags.ts` — **HEADER COMMENT ONLY** (module byte-frozen)

**The instrument (AC1/AC2/AC8(f); D1/D2/D3/D7) — Task 2**
- `packages/domain/src/member/events.ts` — `PERSONAL_EVENT_KINDS`, `PersonalEventAssertedPayloadSchema`, vocabulary 19 → 20
- `packages/domain/src/member/personal-event.ts` **NEW** — the write + both as-of existential reads
- `packages/domain/src/member/state.ts` — reducer header (identity via the existing `default` arm)
- `packages/domain/src/member/index.ts` — barrel export
- `packages/events/src/registry.ts` — event registration
- `packages/domain/tests/member/personal-event-assertion.test.ts` **NEW**
- `packages/domain/tests/member/life-events-markers.test.ts` — the 19 → 20 count fixture

**The seventh fact (AC3/AC9; D5) — Task 3**
- `packages/domain/src/contribution/facts.ts` — the anchor + the 3rd/4th queries + the budget doc comments
- `packages/validity-service/src/producer.ts` — `ContributionFacts`/`Input`/`toBag`; `R7_SUPPLIED_FACT_KEYS` 6 → 7; `R7_HELD_FACTS` → typed empty; header

**Activation + mechanization (AC4/AC6) — Task 4**
- `packages/validity-service/tests/r7-activation-totality.test.ts` — all four assertion moves + the vacuity guards + the probe narrative
- `packages/validity-service/tests/r7g-ladder-pick.test.ts` **NEW** — precedence + the restorationPackage transition
- `packages/validity-service/tests/fixtures/r7-clauses.ts` — R7(G) payload added; R7(F) flags synced to the ratification
- `packages/validity-service/tests/contribution-facts.test.ts` — the AC3 derivation block + fixtures
- `packages/ui/tests/member-status/presenter.test.ts` — AC6: R7(G) on the member's own record + the key RESOLVES in en/hi
- `packages/niyamavali-engine/src/r7-ladder.ts` — fact-contract comment (AC10)

**The member surface (AC7) — Task 5**
- `packages/contracts/src/contributions/personal-event.ts` **NEW** — `.strict()` DTOs + local wire-enum
- `packages/contracts/src/contributions/index.ts` — barrel
- `packages/contracts/tests/contributions-personal-event.test.ts` **NEW** — the domain lockstep + AC1 structure
- `packages/api-client/src/index.ts` — optional `extraHeaders` on `call`; `createPersonalEventClient`
- `apps/api/src/modules/contributions/personal-event-handlers.ts` **NEW**
- `apps/api/src/modules/contributions/personal-event-routes.ts` **NEW**
- `apps/api/src/modules/contributions/index.ts` **NEW**
- `apps/api/src/server.ts` — module registration
- `apps/api/tests/integration/contributions/personal-event.spec.ts` **NEW** — E2E
- `apps/mobile/components/member-status/PersonalEventAssertion.tsx` **NEW**
- `apps/mobile/components/member-status/usePersonalEventAssertion.ts` **NEW**
- `apps/mobile/lib/personal-event-api.ts` **NEW**
- `apps/mobile/app/(membership)/index.tsx` — the affordance, on the member's own record
- `packages/i18n/locales/{en,hi}/contribution.json` — the surface copy (tone-gated)
- `packages/i18n/locales/{en,hi}/common.json` — `memberStatus.rule.rule.no_exemption`

**Blast radius (AC8) — Task 6**
- `packages/validity-service/tests/integration/validity-cache.spec.ts` — AC8(b), the trigger proof
- `packages/validity-service/tests/bench/p95-budget.md` — the versioned 10.26 record
- `packages/validity-service/tests/integration/contribution-facts.spec.ts` — the harm-gate behavioural tests, the assertion seeder, the counted budgets (3 / 10), the R7(G) clause seeding

**Tier-2 reconciliation (AC10) — Task 7**
- `packages/contracts/src/members/validity.ts`, `packages/contracts/src/trustee-lite/dto.ts` — stale forward-references corrected
- `packages/validity-service/tests/redaction.test.ts`, `packages/ui/tests/contribution-disclosure/presenter.test.ts`, `apps/admin/tests/member-status-panel.test.tsx`, `packages/validity-service/tests/integration/validity-service.spec.ts` — held-fact fixtures updated to the new truth
- `packages/domain/seed/niyamavali-v1-clauses.sql` — **COMMENT BLOCK ONLY** (zero JSONB lines changed)
- `_bmad-output/implementation-artifacts/moderation-model-decision-brief.md` — the R7(F)/R7(G) ⚠️ markers cleared

**Governance records — Task 9**
- `.decision-log.md` — Decision 2026-08-06-081; the `:205` R7(G) fact-hold follow-up marked DISCHARGED
- `_bmad-output/implementation-artifacts/deferred-work.md` — the 10.24 hold entry CLOSED (both halves); Escalations 3/4/5/6 + the deploy step opened
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — combined ledger entry; `10-26` → `review`

**Precursor commit `838f667` (Escalation 1(a), landed before the branch)**
- `.decision-log.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, `packages/domain/seed/niyamavali-v1-clauses.sql`

---

## Change Log

| Date | Change |
|---|---|
| 2026-08-06 | **Precursor commit `838f667`** — Escalation 1(a) pre-work landed before the branch: Decision 2026-08-06-080 (Trustee Panel ratifies R7(F)/R7(G) into `niyamavali.md` §3.1/Appendix A), and the seed's `r7-f`/`r7-g` rows drop `provisional`/`policy_review_required`. |
| 2026-08-06 | **Task 1** — the AC5/D4 harm gate, landed FIRST so no commit exists in which an assertion could flag a member: `imposesRestorationObligation` (PURE, DATA-driven, no clause-id branch), the shared `contributesViolatorFlag` seam filter applied at the bulk scan, and a new accusation-channel fence mechanizing the seam asymmetry. Three revert probes run and recorded. |
| 2026-08-06 | **Task 2** — the assertion instrument: `member.personal_event_asserted` on the member's own stream, `.strict()` bounded-vocabulary payload with NO free text, reducer identity, event-registry entry. No table, no projection, no migration. 8.10 fence verified green. |
| 2026-08-06 | **Task 3** — the SEVENTH fact: an as-of lifetime existential in both shapes; the coverage-gate asymmetry documented at the derivation site; query budgets 2 → 3 (member) and 8 → 10 (Pariwar scan), both pinned by counted assertions. |
| 2026-08-06 | **Task 4** — R7(G) ACTIVATED. `R7_ACTIVATED_CLAUSE_IDS` 4 → 5, `R7_HELD_CLAUSES` 3 → 2 (entry deleted, with the D6 reasoning at the site), `R7_SUPPLIED_FACT_KEYS` 6 → 7, `R7_HELD_FACTS` → explicitly-typed EMPTY. Precedence + restorationPackage transition pinned; no fourth arm. |
| 2026-08-06 | **Task 5** — the member surface: `.strict()` DTOs + lockstep wire-enum, the member route (session + FR-88 per-member limit + `Idempotency-Key` header + 404-not-403), the mobile component with its PRE-SUBMIT disclosure, and en+hi copy through the tone guide. |
| 2026-08-06 | **Task 6** — blast radius: AC8(b) cache-trigger eviction PROVED by live-DB test; `POOL_ASSIGNMENT_HASH_VERSION` unbumped and its pin spec byte-unchanged; p95 10.92 ms recorded; determinism gate reports exactly ONE hash. |
| 2026-08-06 | **Task 7** — Tier-2 reconciliation: every AC10 row corrected in place, plus three stale sites the table did not list (including a LIVE `heldFacts` fixture still asserting `story-10-26`). Seed comment block updated with zero JSONB lines touched. |
| 2026-08-06 | **Task 9** — governance: Decision 2026-08-06-081; the `:205` R7(G) fact-hold follow-up DISCHARGED; the 10.24 hold entry CLOSED (both halves); Escalations 3/4/5/6 + the deploy step opened in `deferred-work.md`. |
| 2026-08-06 | **Three story-spec corrections recorded** (not silently absorbed): AC5-vs-AC6's seam conflict, AC6's i18n key being one segment short, and AC9's Pariwar-scan baseline already being stale at 8 rather than 7. |

