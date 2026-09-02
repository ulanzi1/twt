# Story 11b.3: Sahyog Vivran Per-Claim Story Surface — Public Shell + Reversed-Denial Publish Hook Consumer + Financial-Truth-From-Canonical-Events Invariant `[SURFACE]`

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> ⭐⛔ **THIS STORY WAS SPLIT THREE WAYS ON 2026-09-01 (D6 RULED **(b)** BY BIGDEV). ⛔ THE KEY IS UNCHANGED.**
>
> | Story | Owns | Gated on |
> |---|---|---|
> | **11b.3** (this file) | the public shell, the route, the read, the **reversed-denial hook consumer**, the **financial-truth CI gate** — ⭐ **and ZERO Tier-1 fields at `public`** | ⛔ nothing. **Startable at Task 0.** |
> | **11b.3a** | nominee bank **public presentation** + the **per-Pariwar masking schedule** + the Trust-Admin knob + the **four ruled Tier-1 allowlist entries** | 11b.3 merged |
> | **11b.3b** | the **named-identity render layer** — the deceased member's name **and** the contributor list | 11b.3 merged **AND** a Panel ruling |
>
> ⭐ **THE SPLIT'S LOAD-BEARING PROPERTY: this story declares the `sahyog-vivran` surface with ⛔ NO
> `pii_tier: 1` field at `tier: public`.** ⇒ it needs ⛔ **no** `tier1_public_exception`, ⛔ **no**
> allowlist entry, and ⛔ **no Panel ruling** — so it cannot be blocked by one. Every named-identity
> question moves to 11b.3b, and every money-routing-PII question to 11b.3a, each with its own revert
> unit and its own reviewer.
>
> ⛔ **`11b-3a` and `11b-3b` are ⛔ NOT in `epics.md`'s story list** — exactly as `11b-2a` / `11b-2b`
> are not. Task 0 owes an **annotation** there so a future `sprint-planning` run does ⛔ not regenerate
> a ghost 11b.3 or drop these two.

> ⛔⛔ **AND READ THIS BEFORE THE STORY — THE EPIC'S ACs FOR 11b.3 ARE STALE, AND THE STALENESS WAS ALREADY A KNOWN OPEN CARRY.**
>
> `epics.md` Story 11b.3's newest annotation (**2026-08-29**) says the AR-48 deferral is
> **UNDISTURBED**. ⛔ **That is true of the *authenticated* half ONLY.** One day earlier
> `2026-08-28-160` **cl.10** ruled nominee bank details **publicly displayable during an active
> campaign**, `2026-08-28-164` **A2** **RE-PURPOSED SD-2** onto post-campaign masking, and
> `2026-08-28-165` **cl.1/cl.3** ruled **four** named `(surface, field)` Tier-1 pairs on
> `sahyog-vivran`. ⭐ The amendment to `epics.md` was **never made** and is recorded as owed at
> `trustee-panel-routing-note-2026-08-28-11b3-publication-basis-and-matrix.md` **§11**.
> ⇒ ⛔ **Do not build to the epic ACs.** ⇒ **Task 0 owes the annotation** — ⛔ annotation, ⛔ never a
> rewrite ([[feedback_supersede_never_reinterpret]]).

---

## Story

As a **non-member visitor** viewing the Sahyog Vivran for one pool,
I want **one per-claim page** telling that drive's story — which pool, how it closed, how many
contributions were **confirmed as money received**, and whether the claim reached it **by appeal** —
so that **institutional transparency is verifiable by anyone**, and every financial figure on it is a
**canonical Epic 9 event** rather than an estimate.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces ONE predicate that gates what a person sees, and it is a predicate about a
POOL, ⛔ not about a person.**

*"A drive gets its own public page once it exists as a pool — and what that page says about money is
only ever what reconciliation actually confirmed. If the drive is still collecting, the page says so
instead of guessing at a final figure."*

✅ **Checked against the Niyamavali:** the Niyamavali governs eligibility, contribution duty and
adjudication — ⛔ **it says nothing about publication of pool-level figures**, and per
[[feedback_niyamavali_rulebook_not_spec]] its silence is ⛔ not a blocker and ⛔ not authority either
way. ⚠ **Result: no amendment is owed by this story.**

⭐⛔ **AND THE NEGATIVE HALF IS THE LOAD-BEARING ONE, because it is what the split bought:**
**this story renders ⛔ NO person's name — ⛔ not the deceased member's, ⛔ not a contributor's, ⛔ not
a verifier's, ⛔ not a nominee's.** ⇒ it introduces ⛔ **no** predicate over any person's data, and
⛔ **no** predicate that reads `members.state`, `is_valid`, or a moderation overlay. A page that names
nobody is the **CORRECT** state here, ⛔ not a broken one — the same posture 11a.5 defended when it
**deleted five invented deceased-member names** rather than making them real.

---

## 🚦 Launch posture — ⛔ BUILT IS ⛔ NOT PUBLISHED

- ✅ **DPDPA clearance: LIFTED for this surface** (`2026-08-28-160` cl.7), on clause 4's model — ⛔ not
  on the basis counsel rejected on 2026-08-24. ⛔ Never write *"counsel is not engaged"*; **Adv. Mohit
  Agrawal** has been engaged since **2026-06-21** (`2026-08-24-158`). The correct form is *"counsel has
  not reviewed X"*.
- ⛔ **Row 17's ≥2-trustee publication posture extends here** via C-5 → **AI-11a-5**. ⛔ No new
  launch-gate roster row is minted.
- ⛔⛔ **The publication kill switch may ⛔ NOT be cited as this surface's technical launch gate**
  ([[project_directory_launch_gated_on_killswitch_ui]]) — it is an **emergency operational control,
  default-ENABLED by design**. What keeps this surface dark is **deployment plus the counsel/Panel
  process**, ⛔ never a code mechanism.
- ⚠ **The pull lever is ⛔ NOT IMMEDIATE.** `edge_cacheable` at `s-maxage=300` ⇒ a pulled Pariwar keeps
  being served **from every warm PoP**. ⛔ Direct SQL is ⛔ **NOT** the operational fallback.

---

## 🎯 What already EXISTS — verified live at `79ed41d`, ⛔ not inherited from prose

| Thing | State | Where |
|---|---|---|
| `claim.reversed` — the **publish-hook PRODUCER** | ✅ **LIVE** (Story 6.16, the 31st claim event); payload = `reversed_at_stage` (1\|2\|3) + `disposition_category` (bounded, **NON-PII**) | `packages/domain/src/claim/events.ts:480-503`, `:544-546`, `:578`, `:621` |
| A **consumer** of `claim.reversed` | ⛔ **NONE.** Only the reducer arm (`claim/state.ts:297`) and the writer (`appeal-panel-persist.ts`). **This story builds it.** | — |
| `listConfirmedContributorsForPool` (9.4/9.5 canonical) | ✅ **LIVE**, reversal-compensated, `DISTINCT` by member, ordered `member_id ASC` | `packages/domain/src/contribution/read.ts:132` |
| `classifyCycleOutcome` / close-of-cycle framing (Pool-Reality #2) | ✅ **LIVE** and **shared** with the Noticeboard + `/sahyog` | `packages/domain/src/close-of-cycle/framing.ts` |
| ⭐⛔ **`<PoolProgressCard>` — the SHIPPED `amountRaisedInr` producer** | ✅ **LIVE** (Story 9.12, **Decision 3**): `amountRaisedInr = confirmedCount × fixedAmount`, in-file *"the **SINGLE canonical definition** of 'amount raised'"*; confirmed-only **by shape**; already rendered to members. ⭐ `packages/ui/src/index.ts:10-13` names **this surface** as its next consumer in terms | `packages/ui/src/pool-progress/{presenter,view-model}.ts:69`, `packages/ui/src/index.ts:10-13` |
| The pool state machine | ✅ `live —pool.closed→ closed —pool.settled→ settled` | `packages/domain/src/pool/state.ts:96`, `pool/events.ts:138-141` |
| Pool identity (letter code · Mahabharata name · `P-YYYY-MM-###`) | ✅ **LIVE** | `pool/naming.ts`, `PoolContributorListPoolIdentity` |
| The public matrix + its **fail-closed** Tier-1 leg | ✅ **LIVE, both directions** | `packages/contracts/src/public-pages/matrix.ts:157-200`, `:376-424` |
| `<MatrixField>` · `<AuthenticatedFragment>` · `deriveFieldIds` · `parsePageParams` | ✅ **LIVE** (11a.1/11a.2) | `apps/public/src/components/`, `src/lib/surface-fields.ts`, `src/lib/pagination.ts` |
| `apps/public` dynamic-route precedent | ✅ `src/pages/blog/[postId].astro` | — |
| The `/sahyog` surface — the sibling to copy | ✅ **LIVE** (11b.1) | `apps/public/src/pages/sahyog.astro` + `src/lib/sahyog-render.ts` |

**⛔ What does ⛔ NOT exist — every one verified by grep, ⛔ not assumed:**

- ⛔ **No `sahyog-vivran` surface in the matrix** (the yaml declares 9: `root-redirect · niyamavali ·
  terms · blog · blog-post · not-found · server-error · member-directory · sahyog-drive`).
- ⛔ **No verifier profile page anywhere** — `grep -r "verifier profile\|verifierProfile"` over
  `packages/` + `apps/` returns **zero hits**. The epic AC's *"verifier hyperlinks resolving to
  verifier profile pages"* has ⛔ **no destination**.
- ⛔ **`contribution.confirmed` carries NO amount** (`poolId · memberId · alertId · utr · confirmedAt ·
  matchProvenance`, `.strict()`). See **Trap 1**.
- ⛔ **Stories 11b.4 (family story), 11b.5 (memorial components), 11b.7 (`<StatCardStrip>`) are all
  `backlog`.** 11b.7 additionally has **no producer and no owner** (C-3).
- ⛔ **No FR-19 close-of-cycle READ MODEL** (C-4 — ⭐ **SURVIVED** `2026-08-28-160` untouched).
- ⛔⛔ **No "Sahyog Vivran publication queue."** The phrase the epic AC and `claim/events.ts:492` both
  use is **PROSE ONLY** — it appears in `packages/events/src/registry.ts:351` and the claim event's
  doc-block and ⛔ **nowhere in code**. The only real queues are `apps/api/src/modules/news-blog/queue.ts`
  and `surveys/queue.ts`. ⇒ **D12.**

---

## ⛔ THE SIX TRAPS — read these before writing a line

### Trap 1 — ⭐⛔ *"AMOUNT RAISED"* ALREADY HAS A SHIPPED CANONICAL PRODUCER, AND THE TRAP IS RE-DERIVING IT

⛔ **`contribution.confirmed` carries no amount** (verified: `ContributionConfirmedPayloadSchema`,
`packages/domain/src/contribution/events.ts:147-157`, `.strict()`). ⚠ **That is true and it is ⛔ not
the end of the question**, because the rupee figure is ⛔ **not** unbuilt.

⭐⛔ **VERIFIED LIVE: `amountRaisedInr = confirmedCount × fixedAmount` IS SHIPPED, RULED AND CONSUMED.**
`packages/ui/src/pool-progress/presenter.ts:10` calls it *"the **SINGLE canonical definition** of
'amount raised'"*, ruled at **Story 9.12 Decision 3**, derived at `:69`, and rendered to members
through the RN progress meter today. Its own rationale answers the synthesis objection in terms: it
*"CANNOT be inflated by intent (every confirmed contribution is money at EXACTLY `fixedAmount`)"* and
is **confirmed-only by SHAPE** — ⛔ no yellow/pending operand can enter.

⭐⭐ **AND `packages/ui/src/index.ts:10-13` NAMES THIS SURFACE AS ITS NEXT CONSUMER, IN TERMS:**
*"shared by the apps/mobile RN progress meter today **+ the Epic-11b public Sahyog Vivran render
later**."*

⇒ ⛔ **The trap is ⛔ NOT "do not compute a total". It is: ⛔ do not hand-roll a SECOND definition of
a figure that already has one.** A count computed here from scratch, or a rupee figure multiplied
inline, forks the definition — and the shipped one is the canonical half.

⚠⭐ **AND THE TWO CONSTRAINTS THAT MAKE THIS A DECISION RATHER THAN A COPY:**
1. **11b.1 renders a COUNT on the INDEX** — `confirmedContributionCount` is *"⛔ a count, ⛔ never a sum
   of amounts"* (`sahyog-drive.ts:113-117`). ⚠ That is the **many-pools index**, where no single
   `fixedAmount` is in context; it is ⛔ **not** a ruling against a per-pool figure on a per-pool page.
2. ⛔ **The presenter lives in `@twt/ui`, and this story is fenced from adding `@twt/ui` to
   `apps/public` — that is 11b.3b's act (C-1).** ⇒ consuming the shipped producer here is ⛔ not free,
   and re-implementing it to dodge the fence is the ⛔ **worst** of the available moves.

⛔ **DO NOT pick a side in code.** → **D1**, which is re-posed against the producer that actually exists.

### Trap 2 — ⭐⛔ THIS SURFACE MUST DECLARE **ZERO** Tier-1 FIELDS AT `public`, AND THAT IS THE WHOLE POINT OF THE SPLIT

`MatrixFieldSchema.superRefine` is **fail-closed in both directions** (`matrix.ts:174-199`): a field
with `pii_tier: 1` at `tier: public` **and no `tier1_public_exception` FAILS**; a field carrying an
exception that is **not** Tier-1-at-public **also fails**.

⛔ **A shielded or masked value is still Tier-1.** `public-vs-private-matrix.yaml:60` — `pii_tier` is
*"a FACT about the data; ⛔ never changed to permit a render"* — and `2026-08-28-165` **cl.2**
re-affirmed it: *"the underlying account fields remain Tier-1 … treat masking as a
presentation/projection policy."*

⇒ ⛔ **Do NOT declare `deceased_member_name`, `contributor_name`, or any nominee bank field on this
surface.** They belong to **11b.3b** and **11b.3a**, each of which adds its own allowlist entry **at
the moment it declares the field** — ⚠ and that timing is itself a ruling: *"⛔ Not added now: the
matrix check is one-directional, so a pre-added entry is a standing permission with ⛔ no subject"*
(routing note **§11**).

⛔⛔ **AND DO NOT "fix" a failing entry by appending to `RULED_TIER1_PUBLIC_EXCEPTIONS`.** The file
forbids exactly that at `:388-391`: *"⛔ ADDING TO THIS LIST IS A RULING, NEVER A CODE CHANGE … **the
gate failing is the gate working.**"*

### Trap 3 — ⛔ THE AUTHENTICATED TIER STILL HAS NO VIEWER — ⚠ AND SD-2 IS ⛔ NOT "GONE"

`2026-08-28-164` **A2** ruled SD-2 **RE-PURPOSED, ⛔ not dissolved**: the active-campaign policy no
longer needs an authenticated viewer (that data is **public** — 11b.3a's subject), ⭐ **SD-2's concern
survives for the POST-campaign state**, ⛔⛔ *"the absence of an authenticated-member surface is ⛔ NOT
grounds to delete the requirement"*, and the **post-masking authenticated presentation** is a
**separate future decision** — ⛔ not carried, ⛔ not foreclosed.

⇒ ⛔ **do not mint a browser member session**, ⛔ do not read `Astro.cookies` /
`Astro.request.headers` / `Astro.session` anywhere on this surface, and ⛔ do not add an
`isAuthenticated` prop to `<AuthenticatedFragment>` — its own header forbids all three, because a prop
*"only moves the read to the caller and puts auth-derived branching back into cache-safe SSR output."*
⭐ **Every visitor sees byte-identical markup** ([[project_no_browser_member_token_surface]]).

### Trap 4 — ⛔ `apps/api/src/modules/public-pages/` CARRIES A **NO SECOND ROUTE** FENCE, AND THIS WOULD BE THE **THIRD**

The module shipped **deliberately unauthenticated** and defends that in two places. `2026-08-20-141`
cl.9 had ruled it must not exist yet; it was created one story later. Story 11b.1 added the **second**
GET and paid the stated price: **its own written defence in the route header AND its own
`login-wall.spec.ts` allowlist entry, stating the SAME control count in both**
(`routes.ts:136-142`, `login-wall.spec.ts:111`).

⇒ a third route is **not** the cheap path it looks like, and it is ⛔ **never** an authenticated route.
⚠ *"Two authoritative documents disagreeing on how many controls exist is the defect this file records
having already had once"* — keep them in lockstep.

### Trap 5 — ⛔ FOUR OF THE EPIC ACs NAME THINGS THAT DO ⛔ NOT EXIST, AND THE RULED POSTURE IS TO RENDER NOTHING

*"verifier hyperlinks resolving to verifier profile pages"* (**no such page, zero hits**) · *"family
story (Story 11b.4)"* (**`backlog`**) · *"the memorial visual components (Story 11b.5) consume into
this surface"* (**`backlog`**) · *"`<StatCardStrip>`"* (**C-3 — no producer, no owner**).

⭐ **The ruled posture for an absent producer on this epic is 11a.5's third path, and C-4 SURVIVED
`2026-08-28-160` untouched:** *"render the real, currently-empty source and **render nothing when
empty**, ⛔ never a fabricated row, ⛔ never a 'coming soon' placeholder."* ⚠ *"A silent section is the
CORRECT state, ⛔ not a bug to be closed quickly."* ⛔ **Do not stub `<StatCardStrip>`** — a stub
asserts an aggregate nothing computes. ⛔ Building any of the four re-commits **SD-1**.

### Trap 6 — ⚠ THE STALE-COMMENT FAMILY: FIX **ONE** LINE, SWEEP **NOTHING**

`packages/contracts/src/contributions/pool-contributor-list.ts:88` still says Epic 9's
`contribution.confirmed` producer *"is **unbuilt** — D2"*. ⛔ **False since 9.4/9.5**, and it
contradicts its **own file header at `:7-8`** ([[project_epic9_confirmed_producer_is_live]]).

⭐ **It is routed to THIS STORY by name** (deferred-work, routed by BigDev 2026-08-30; Decision
`2026-09-01-171` cl.1 restates the fence): *"⛔ TWO triggers, ⛔ not one: (i) 11b.3's authoring pass —
`:88` is precisely the line that would make it re-derive 'the list is structurally empty'."*
⚠ Story 11b.2b's **AC9** fences the line against being tidied *in passing*; ⭐ **this story is the
named consumer, so fixing it here is the DISCHARGE, ⛔ not a fence violation.**

⛔ **Do ⛔ NOT sweep the rest of the family** (`domain/contribution/read.ts:18` vs `:127` ·
`api-client/src/index.ts:553` · `PoolContributorList.tsx:11` · `usePoolContributorsQuery.ts:14` ·
`contribution-notify-triggers.ts:18,480` · `jobs/src/index.ts:75` · `queue/src/index.ts:249` ·
`contribution-history.ts:8`, plus **six test titles** that restate the false premise on every green
run). That is scope creep; they keep their own fallback trigger.

---

## Acceptance Criteria

### AC1 — The route ships at `/sahyog-vivran/{poolCanonicalIdentifier}`, on the `/sahyog` skeleton

**Given** Story 11a.2's Astro SSR shell and the `blog/[postId].astro` dynamic-route precedent
**When** a visitor requests `/sahyog-vivran/P-2026-09-001`
**Then** `apps/public/src/pages/sahyog-vivran/[poolCanonicalIdentifier].astro` renders one pool's
Sahyog Vivran, with **thin frontmatter and ALL display logic in a pure
`apps/public/src/lib/sahyog-vivran-render.ts`** — the house shape `members.astro` and `sahyog.astro`
both follow, and the one `surface-fields.ts` names as the reason its derivation is trustworthy
**And** every `t()` call passes an **explicit `namespace`** — ⚠ `t()` defaults to `common` and
**THROWS** on a miss; the `{{max}}` vs `{max}` defect that made `/members` throw on **every** request
at 11a.2 was exactly this shape, and no test caught it because every test bypassed `t()`
**And** an unknown or non-visible pool identifier renders the shell's **404**, ⛔ never an error
distinguishing *"does not exist"* from *"not published"* — a distinguishable miss is an enumeration
signal
**And** the visible-pool predicate is **declared explicitly** (⛔ never inferred) and is ruled by **D4**.

### AC2 — The matrix declares this surface EXPLICITLY, with ⛔ ZERO Tier-1 fields at `public`

**Given** the fail-closed Tier-1 leg (Trap 2) and the split's load-bearing property
**When** the surface is declared in `packages/contracts/public-pages/public-vs-private-matrix.yaml`
**Then** a `sahyog-vivran` surface is added carrying **every key explicitly** — `id · route · renders ·
description · search_indexing_policy · cache_policy · paginated · fields` — ⛔ **none left to a schema
default** (11b.1's 2026-08-27 review finding: *"a key an AC names is not optional just because a
default happens to supply it"*)
**And** ⭐ **`paginated: false` — stated, ⛔ not omitted, and ⛔ not copied from `sahyog-drive`.** This
story renders ⛔ no list, so there is nothing to page, and `parsePageParams()` is ⛔ **not** called.
⚠ **It is a value that MUST FLIP:** 11b.3b adds the contributor list and flips it to `true` — which is
⛔ not a free edit, because it also changes what the API route's written defence must claim (**D11**)
**And** `cache_policy: edge_cacheable` is **declared, ⛔ never inferred from field tiers** — a
rendering surface with ⛔ no `Cache-Control` **fails CI**
**And** ⛔ **NO field on this surface carries `pii_tier: 1` at `tier: public`**, ⇒ ⛔ **no
`tier1_public_exception` block is written and ⛔ `RULED_TIER1_PUBLIC_EXCEPTIONS` is NOT touched**
**And** ⭐ **a test asserts that emptiness positively** — the `sahyog-vivran` surface's
Tier-1-at-`public` field count is **0**, so a later story that adds one **without** its ruling fails
here as well as at the gate. ⚠ ⛔ This is ⛔ **not** a claim that the surface may never have one:
11b.3a and 11b.3b each add theirs **with** a cited ruling, and each owes this test an update in the
same commit
**And** the field-id set is derived through `deriveFieldIds` from the render model's own keys (11a.1
D3(a)), and the derivation returns a **NON-EMPTY** set — ⭐ so the tier-leak leg is **operative from
this surface's first commit**, ⛔ not armed-but-empty (a green scan over a vacuous leg proves nothing).

### AC3 — Financial truth derives EXCLUSIVELY from Epic 9 canonical events

**Given** the financial-truth-from-canonical-events invariant (this story's load-bearing commitment)
**When** any figure is rendered
**Then** the confirmed contributor **count** sources from `listConfirmedContributorsForPool`
(`contribution.confirmed`, compensated by `reconciliation.confirmation-reversed`) and **nothing else**
**And** settlement state sources from the **`pool.closed` / `pool.settled`** event stream
**And** ⛔ **PROHIBITED, each named so a reviewer can check for it:** (a) totals inferred from
attestation events; (b) projected or estimated final amounts during a live cycle; (c) *"X% confirmed
so far"* framing that exposes the attested↔confirmed gap; (d) synthesized confidence-interval-style
*"approximate"* totals; (e) any aggregate mixing confirmed and unconfirmed counts
**And** if Epic 9 has emitted no `contribution.confirmed` for a contribution, **it does not appear**;
if the pool is not `settled`, settlement totals **do not render** — the surface says
*"Pool live — final outcome will appear after reconciliation settles"* rather than estimating
**And** ⭐ **any RUPEE figure is D1's, and D1 is re-posed against a producer that EXISTS** — ⛔ if the
surface renders one, it consumes `derivePoolProgressCardViewModel`'s `amountRaisedInr` (Story 9.12
Decision 3, `packages/ui/src/pool-progress/presenter.ts:69`) and ⛔ **NEVER** re-derives it inline.
⛔ A second multiplication anywhere in this diff is the defect, ⛔ whichever way D1 rules
**And** the close-of-cycle framing reuses `classifyCycleOutcome` **UNCHANGED** — ⛔ it is shared with
the Panchayat Noticeboard and `/sahyog`, and its union's ordering is provenance-stable
**And** ⭐ the **zero-expectation** case is resolved **BEFORE** the call: 11b.1's review found
`0 >= 0` vacuously true, so the classifier returned `fully_funded` for a drive that collected nothing
and published *"the cycle closed with the support it needed"* beside *"0 confirmed"*. ⇒ a pool with no
assigned contributors renders **nothing**; ⛔ `partial` was considered and **rejected** (*"reconciliation
is still in progress"* is not true of a drive nobody was assigned to — that trades a false statement
for a misleading one).

### AC4 — A CI test proves AC3 STRUCTURALLY, ⛔ not by review

**Given** the epic AC's *"a CI test asserts: no API endpoint serving Sahyog Vivran data computes
inferred financial state from non-canonical sources"*
**When** the gate runs
**Then** a test asserts the Sahyog Vivran read path's **event-type surface** is exactly
`contribution.confirmed` + `reconciliation.confirmation-reversed` + the `pool.*` lifecycle types, and
**FAILS** on a planted read of `contribution.utr-attested`, `contribution.reconciliation-mismatch`, or
any attestation-derived source
**And** ⭐ **it is proven with a PLANTED VIOLATION and a revert-sanity run, recorded in the Dev Agent
Record** — ⛔ never merely scanned green ([[feedback_gate_scope_semantic_coverage]])
**And** the response DTO is `.strict()` with **no** `status` / `yellow` / `attested` / `utr` /
`estimated` / `projected` field — the confirmed-only invariant encoded as a **SHAPE**, mirroring
`pool-contributor-list.ts:51`'s existing teeth, and the shape test must **reject** an added key.

### AC5 — The reversed-denial publish hook CONSUMER

**Given** Story 6.16's `claim.reversed` — **live**, the *"ONE clean subscription point Epic 11b
consumes"*, carrying `reversed_at_stage` (1\|2\|3) + `disposition_category` (bounded, **NON-PII**)
**When** the event is appended
**Then** ⛔⛔ **the CONSUMER'S MECHANISM IS `D12`, AND IT IS OPEN — ⛔ do not infer one.** ⚠ Verified by
grep: there is ⛔ **no Sahyog Vivran publication queue**. The phrase exists only as PROSE, in
`packages/events/src/registry.ts:351` and `packages/domain/src/claim/events.ts:492`. The two real
queue precedents are `apps/api/src/modules/news-blog/queue.ts` and `surveys/queue.ts` — ⛔ neither is
this. ⭐ **And AC1 renders this page from live event data at REQUEST TIME**, so the narrative below is
derivable at render with ⛔ no consumer and ⛔ no queue at all. ⇒ building an inert queue and building
nothing are ⛔ both available and ⛔ both wrong to choose silently → **D12**
**And** ⭐ **whatever D12 rules, the RENDERED OUTPUT below is unchanged and is this AC's testable half**
**And** the surface renders a **"Reversed by appeal"** narrative carrying the **appeal-stage
attribution** + the **reversal date**, and the lineage **deny → appeal stage → reversal** is visible
**And** ⛔⛔ **the narrative NEVER carries rationale text or a reviewer identity** — those live on the
`claim.appeal_stageN_reviewed` **DECISION** event's Tier-1 metadata row and are ⛔ **never public**.
`claim.reversed` is the **PUBLISH SIGNAL**, ⛔ not the decision
**And** the routing is **audit-logged via Story 1.10**
**And** ⛔ the consumer does ⛔ **not** unfreeze the deceased member's account — `claim.reversed` is
**deliberately ABSENT** from `member/overlay.ts` `ACCOUNT_UNFREEZE_EVENT_TYPES` (a reversed claim
re-enters approval; the freeze persists to `settled` / `denied_no_appeal`)
([[project_claim_overlay_unfreeze_seam]]).

### AC6 — The read is over the `apps/api` hop, and the THIRD route is DEFENDED IN WRITING IN BOTH PLACES

**Given** the ⛔ **NO SECOND ROUTE** fence (Trap 4) and 11b.1's precedent price
**When** `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:poolCanonicalIdentifier` is registered
**Then** the route header carries **its own written defence**, and
`apps/api/tests/integration/login-wall.spec.ts` carries **its own allowlist entry**, and ⛔ **both
state the SAME control count**
**And** ⛔⛔ **THE COUNT IS ⛔ NOT FIVE, AND STATING FIVE IS THE DEFECT THE FILE ALREADY HAD ONCE.**
`routes.ts:52-55` rules in terms: *"the controls are properties of **an unauthenticated, PAGINATED,
PII-BEARING public COLLECTION**, ⛔ not of the Member Directory specifically. ⭐ **A third route that
CANNOT reuse them unchanged is a third route that needs its own ruling, ⛔ not its own bullet list.**"*
⚠ **After the D6(b) split this route is ⛔ NONE OF THE THREE:** it is a **single-item** GET on a path
parameter (⛔ not a collection), it declares `paginated: false` (⛔ not paginated), and it carries
**zero Tier-1 fields** (⛔ not PII-bearing). ⇒ controls **2** (`PUBLIC_SURFACE_PAGE_SIZE_CAP`) and **3**
(`PUBLIC_DIRECTORY_PAGE_HORIZON`) have ⛔ **no query parameter to bind to** and cannot be reused
**And** ⇒ the applicable set and the count are ruled at **D11**, ⛔ never chosen by the dev agent, and
⛔ **a control claimed in writing that does not exist is worse than a control honestly absent** —
*"two authoritative documents disagreeing on how many controls exist is the defect this file records
having already had once"*
**And** ⭐ **the two properties come BACK, in the siblings, and each owes this file an update:**
11b.3a makes the route **PII-bearing**, 11b.3b makes it **paginated** — ⛔ neither may restore a
property and leave the defence and the `login-wall.spec.ts` entry saying what they say today
**And** it reuses `config: { rateLimit: limits.search }` — ⛔ **not** `limits.read` (looser, and
backwards for an enumeration surface), ⛔ not an inline ceiling, ⛔ not a hand-rolled `keyGenerator`
**And** it is ⛔ **NEVER** an authenticated route — adding one to this module *"needs its own ruling,
its own written defence, and its own `login-wall.spec.ts` allowlist entry"*
**And** ⛔ `apps/public` gains ⛔ **no** `withPublicScope` read and ⛔ **no** KMS dependency (D6(a) /
`2026-08-20-143` cl.1: *"the KEK is shared across EVERY Tier-1 field class"*) — ⚠ and on this story
there is **nothing to decrypt at all**, which is the split's point.

### AC7 — Copy passes the microcopy gate, and the tone-review row is carried

**Given** Story 8.10's **`out-of-band-blame`** rule, which names **Epic 11b Story 11b.3** as its
**re-trigger** in terms
**When** the surface's locale namespace lands
**Then** `packages/i18n/locales/{en,hi}/sahyog-vivran.json` are added to `microcopy.yaml`
`scope.copy_globs` (the config-only pattern 7.8 / 8.2 / 8.10 established), so the `member_only`
vocabulary register and the strengthened **pool-reality-comparison** rule bite this copy at PR time
**And** teeth are **proven with a planted-violation fixture + revert sanity**, ⛔ not merely scanned
**And** ⛔ **out-of-band gifts are ⛔ not a metric, a funnel step, or a denominator**, and no copy may
claim credit for the cadre's direct giving
**And** the story carries a **tone-review Publish-routing row for its own surface** — ⚠ the reviewer
must be a **NON-AUTHOR real person** (the 11b.9 / 11b.2a precedent); ⛔ an un-reviewed row is recorded
**un-attested**, ⛔ never back-filled ([[feedback_record_unattested_no_backfill]]).

### AC8 — Accessibility: family 13 of the load-bearing-invariant checklist, in its web form

**Given** C-2 — ⛔ **no accessibility CI gate exists** (19 gates in `scripts/`, ⛔ none a11y) while
Story **11b.8** makes an accessibility audit a **LAUNCH-BLOCKER** (UX-DR70)
**When** this surface ships
**Then** it holds **family 13 (Semantic accessibility, AI-11a-3)** of
`_bmad/custom/load-bearing-invariant-checklist.md:72`
**And** ⚠⛔ **FAMILY 13 IS WRITTEN IN REACT-NATIVE VOCABULARY AND THIS IS AN ASTRO SURFACE — ⛔ the
example does NOT transfer as written.** 11a.6's worked example is
`apps/mobile/components/panchayat/PinnedItem.tsx` (⛔ **not** in `@twt/ui`), and
`accessible={true}` / `accessibilityLabel` / `accessibilityValue` are **RN props with ⛔ no HTML
equivalent**. ⇒ the story owes the **web translation, written down**: (a) the labelled container is a
real grouping element with `role` + `aria-label` (⛔ never a bare `<div>` carrying a label that no
role announces) · (b) a role implying a value carries `aria-valuenow`/`aria-valuetext` · (c) a role
implying interaction is a real `<a>`/`<button>` · (d) ⛔ no announced-order dependence on visual
order. ⛔ **Do ⛔ not record family 13 as held by pointing at the RN file**
**And** ⛔ **no a11y CI gate is minted here** — AI-11a-3 routes that to *"checklist/invariant family 13
first; a CI gate ⛔ only if later mechanically justified"*.

### AC9 — What this story does ⛔ NOT build is ROUTED, each with a re-trigger

**Then** `deferred-work.md` gains this story's section (newest-first) recording, **each with a named
trigger**: the **named-identity render layer** (→ **11b.3b**, gated on the Panel) · the **nominee bank
presentation + masking knob** (→ **11b.3a**) · the **family story** (11b.4) · the **memorial
components** (11b.5) · **`<StatCardStrip>`** (C-3, ⛔ unowned — ⛔ **do not stub it**) · the **FR-19
read model** (C-4, ⛔ unowned) · **verifier profile pages** (⛔ no destination exists) · the
**post-masking authenticated presentation** (`-164` A2 — *"a separate future decision, ⛔ not carried,
⛔ not foreclosed"*)
**And** the **stale doc-block at `pool-contributor-list.ts:88` IS fixed here** (Trap 6) — this story is
its named consumer — while ⛔ **the rest of the family is NOT swept**
**And** ⭐⛔ **the confirmed-contributor read's ORDER is CHANGED — ⛔ it is NOT "missing", and the
filed finding that says so is FALSE.** ⚠ Verified live at `79ed41d`:
`packages/domain/src/contribution/read.ts:183` already ends
`return liveMemberIds.sort().map(...)` under the comment *"Sort ascending for a stable,
replay-deterministic list"* — and `git log -L` puts that `.sort()` in the read's **first commit**
(Story 8.3, `afce9e0`), carried through 9.5 (`318f88b`). ⇒ `deferred-work.md:7137`'s
*"carries ⛔ NO `ORDER BY` at all … row order is whatever the plan returns … ⛔ not stable across
runs"* was **wrong when it was filed at 11b.2a**, and the sprint-status ledger repeats it
**And** ⇒ the actual defect is **narrower and sharper**: the order the read HAS is **`member_id`
ascending** — ⛔ **the exact key this AC and the deferral both prohibit** (*"⛔ not `member_id`, which
would leak an arbitrary identifier ordering onto a PII-shielded surface"*). ⇒ the work is to
**REPLACE a sort, ⛔ never to add a missing one**
**And** the replacement is the confirmation **`event_version`**, and the shape is stated so it is ⛔ not
re-derived: the query at `:136-141` selects only `eventType · eventId · memberId ·
reversedConfirmedEventId`, so **`eventsLog.eventVersion` must be added to the projection** and carried
through the `Map` reconciliation — ⛔ a `.sort()` over the existing row shape cannot express it
**And** ⭐ **the ambiguity is RULED HERE rather than left to the implementation:** a member may hold
**several** live confirmed events (a re-confirmation after a reversal re-lists them, `:180-182`), so
the row's sort key is the **EARLIEST live confirmation's `event_version`** — the instant that member
first became confirmed, which is the member-meaningful one and is stable under a later re-confirmation.
⛔ Not the latest, ⛔ not `occurred_at` (wall-clock, and ⛔ not the append order)
**And** ⚠ `event_version` is **per-STREAM** monotonic (`events_log_stream_id_event_version_uq`), and
`contribution.confirmed` is appended on the **ALERT stream** (`contribution/events.ts:145`) — ⇒ every
confirmation for one pool shares one stream, so `event_version` **is** a total order within the pool.
⛔ State that in the read; ⛔ do not let the next reader re-derive whether it is comparable
**And** ⚠ this changes a shipped read's behaviour for every existing consumer — check
`apps/api/src/modules/member-pool/handlers.ts:318,612` and the mobile list — ⛔ and the read's own
docstring at `:127` (*"Ordered by member id ASC"*) is part of the change, ⛔ not left behind
**And** ⭐ **`deferred-work.md:7137` is AMENDED IN PLACE — the false ground is corrected and the item's
disposition recorded — ⛔ never silently deleted and ⛔ never re-filed** (the `11b.2 (vi)`
amended-in-place precedent; [[feedback_supersede_never_reinterpret]])
**And** ⛔ **the public/member name INVERSION is RE-AFFIRMED, ⛔ NOT re-filed** (11b.1 item (e)) — ⛔
*"two records of one obligation is its own failure"* — and it is **carried, ⛔ not resolved** (**D7**).

---

## Tasks / Subtasks

- [ ] **Task 0 — ⛔ TRANSCRIBE-or-STOP. ⛔ Do not write code until this task is complete.** (AC: all)
  - [ ] Re-read `.decision-log.md` **head** and take the next free number. ⛔ Never renumber, ⛔ never
        merge into a sibling's entry. ⚠ **11b.3, 11b.3a and 11b.3b mint against the same head** — re-read
        it immediately before writing.
  - [ ] Transcribe **BigDev's rulings** for **D1 · D4 · D6 · D7** into `.decision-log.md`, including
        **D6 = (b) SPLIT, ruled 2026-09-01**. ⛔ **The dev agent transcribes; it ⛔ never authors,
        paraphrases or re-grounds a ruling.**
  - [ ] ⛔ **If D1, D4, D7, D11 or D12 is unruled → STOP and report.** ⚠ **FIVE, ⛔ not three** — D11
        (the third route's control set) and D12 (the reversed-denial consumer's mechanism) are ⛔ not
        preferences: D11 is a ruling `routes.ts:52-55` **demands in terms**, and D12 decides whether
        Task 5 builds anything at all.
  - [ ] Annotate `epics.md` Story 11b.3 with **(i)** the re-purposed SD-2 (`-164` A2) and the
        public-tier bank fields (`-160` cl.10, `-165` cl.1/cl.3) — the carry recorded at the 2026-08-28
        routing note **§11** — and **(ii)** the three-way split, so `sprint-planning` does ⛔ not
        regenerate a ghost 11b.3 or drop 11b.3a/11b.3b. ⛔ **Annotation, ⛔ never a rewrite**; ⛔ do not
        delete or re-word the 2026-08-23 or 2026-08-29 blocks.
  - [ ] ⭐ Record in the same entry that `-165` **cl.3**'s *"Story 11b.3 adds the four allowlist
        entries"* now lands at **11b.3a** — ⚠ the **obligation moves with the fields, it does ⛔ not
        evaporate**, and the *"⛔ not added now / a pre-added entry is a standing permission with no
        subject"* timing rule is preserved exactly.
  - [ ] Commit governance first, with the `governance:` prefix
        ([[feedback_governance_commits_precede_implementation]]). ⚠ The prefix is formally invalid
        under the checked-in commitlint config and survives only because commitlint is wired to
        nothing — **convention wins**; the divergence is already filed as 11b.2 item (v).

- [ ] **Task 1 — Declare the surface in the matrix, with zero Tier-1 fields** (AC: 2)
  - [ ] Add the `sahyog-vivran` surface with **every key explicit**.
  - [ ] Author the `FieldIdMapping`; verify the tier-leak leg is **non-vacuous** by planting an
        undeclared field and watching it fail.
  - [ ] Add the **Tier-1-count-is-zero** test, with the comment stating it is a *count for this story*,
        ⛔ not a permanent ceiling, and that 11b.3a/11b.3b each update it in their own commit.
  - [ ] ⛔ **Do NOT touch `RULED_TIER1_PUBLIC_EXCEPTIONS`.**

- [ ] **Task 2 — The domain read: one pool's Sahyog Vivran, canonical-events-only** (AC: 3)
  - [ ] Add the per-pool read in `packages/domain/src/pool/` (sibling of `public-read.ts`).
  - [ ] ⭐ **REPLACE** the read's existing `member_id`-ascending `.sort()` (`read.ts:183` — ⛔ it is
        ⛔ NOT missing; see AC9) with the **earliest live confirmation's `event_version`**. Add
        `eventsLog.eventVersion` to the projection at `:136-141` and carry it through the `Map`;
        update the docstring at `:127`; check `member-pool/handlers.ts:318,612` and the mobile list.
  - [ ] Resolve the **zero-expectation** case **before** calling `classifyCycleOutcome`; ⛔ do not
        modify the classifier.
  - [ ] ⛔ Never a `.limit()` from user input without the domain limit-clamp
        ([[project_domain_limit_clamp_and_savepoint_retry]]).

- [ ] **Task 3 — The third public-pages route + its defence in BOTH places** (AC: 6, 4)
  - [ ] Register with `limits.search`; write the header defence.
  - [ ] ⛔ **Write the control set D11 ruled — ⛔ never "five" by copy.** Controls 2 and 3 have no query
        parameter on a single-item route; ⛔ a claimed control that does not exist is the defect.
  - [ ] Add the `login-wall.spec.ts` allowlist entry stating the **same control count** as the header.
  - [ ] Author the `.strict()` DTO with the shape teeth.

- [ ] **Task 4 — The Astro page + pure render module** (AC: 1, 3, 8)
  - [ ] `apps/public/src/pages/sahyog-vivran/[poolCanonicalIdentifier].astro` — thin frontmatter.
  - [ ] `apps/public/src/lib/sahyog-vivran-render.ts` — all display logic, pure.
  - [ ] Every value through `<MatrixField>`. ⛔ No `Astro.cookies` / `Astro.request.headers` /
        `Astro.session` anywhere on this surface.
  - [ ] Render **nothing** for absent producers (family story, memorial components, FR-19,
        `<StatCardStrip>`) — ⛔ no placeholder, ⛔ no "coming soon".
  - [ ] Explicit `namespace` on every `t()`; add `sahyog-vivran.json` for **both** locales.

- [ ] **Task 5 — The `claim.reversed` consumer** (AC: 5)
  - [ ] ⛔ **Build the mechanism D12 ruled, ⛔ nothing else.** ⚠ There is ⛔ no publication queue in the
        codebase — the phrase is prose in `events/src/registry.ts:351`. If D12 rules render-time
        derivation, ⛔ **no queue and no consumer are built** and this task is the READ; if it rules a
        publication record, the precedents are `news-blog/queue.ts` / `surveys/queue.ts` — ⛔ never a
        third queue shape invented here.
  - [ ] Route by `claim_case_id`; audit-log via 1.10.
  - [ ] Render the lineage from `reversed_at_stage` + `disposition_category` **only**. ⛔ No rationale
        text, ⛔ no reviewer identity.
  - [ ] ⛔ Do not add `claim.reversed` to `ACCOUNT_UNFREEZE_EVENT_TYPES`.

- [ ] **Task 6 — The financial-truth CI gate, proven with a planted violation** (AC: 4)
  - [ ] Plant a violation; confirm it **fails**; revert; confirm it passes. ⭐ Record the revert-sanity.

- [ ] **Task 7 — Microcopy scope + tone review** (AC: 7)
  - [ ] Add both locale files to `microcopy.yaml` `scope.copy_globs`; prove teeth with a planted
        violation.
  - [ ] Carry the tone-review Publish-routing row; ⛔ record it **un-attested** if the non-author
        reviewer is unavailable.

- [ ] **Task 8 — Discharge Trap 6's one line; route everything else** (AC: 9)
  - [ ] Fix `packages/contracts/src/contributions/pool-contributor-list.ts:88`. ⛔ Sweep nothing else.
  - [ ] ⭐ **Amend `deferred-work.md:7137` IN PLACE** — its *"carries ⛔ NO `ORDER BY` at all"* ground is
        **false at `79ed41d`** and was false when filed (AC9). ⛔ Correct the ground and record the
        disposition; ⛔ never delete the item, ⛔ never re-file it as new.
  - [ ] Write this story's `deferred-work.md` section (newest-first), every item with a trigger.
  - [ ] ⛔ **Re-affirm, ⛔ do not re-file**, 11b.1 item (e) (the public/member inversion).

---

## ⚖️ Decisions — ✅ **D6 RULED (b) by BigDev, 2026-09-01.** ⛔ **FIVE OPEN: D1 · D4 · D7 · D11 · D12**

### ✅ D6 — RULED **(b)** (BigDev, 2026-09-01) — the story is **SPLIT THREE WAYS**

⭐ **Ruled shape:** **11b.3** (public shell, ⛔ zero Tier-1 fields) · **11b.3a** (nominee bank
presentation + masking schedule + admin knob + the four ruled allowlist entries) · **11b.3b** (the
named-identity render layer — the deceased member's name **and** the contributor list, both gated on
Panel rulings).

⚠⭐ **ONE THING CHANGED FROM THE SHAPE FIRST PROPOSED, AND IT IS RECORDED RATHER THAN SLID IN.** The
first sketch put the **deceased member's name** in 11b.3 (fenced) and only the contributor list in
11b.3b. ⇒ that would have left 11b.3 holding a Tier-1-at-`public` field it could not declare, so the
surface would have been **blocked on a Panel ruling it does not otherwise need**. Moving **both** name
questions to 11b.3b makes 11b.3's *"zero Tier-1 fields"* a **checkable property** (AC2) rather than an
aspiration, and is what makes this story startable today.

⛔ **What the split does ⛔ NOT do:** ⛔ it does not narrow any obligation away, ⛔ it does not
re-open a ruled question, and ⛔ it does not move `-165` cl.3's allowlist duty off the project — the
duty **travels with the fields** to 11b.3a (Task 0 records this).

### ⛔ D1 — *"Amount raised"*: what, if anything, does this surface render? (Trap 1, AC3)

⚠⭐ **RE-POSED 2026-09-01 (combined 11b.3/11b.3a/11b.3b validation). ⛔ THE FIRST POSING RESTED ON A
FALSE PREMISE and is corrected here rather than re-argued** ([[feedback_supersede_never_reinterpret]]):
it framed `confirmedCount × fixedAmount` as an **unbuilt** option needing a fresh ruling. ⛔ It is
**built, ruled and shipped** — `packages/ui/src/pool-progress/presenter.ts:10,69`, *"the SINGLE
canonical definition of 'amount raised'"*, **Story 9.12 Decision 3**, live in the RN progress meter,
and `packages/ui/src/index.ts:10-13` names **this surface** as its next consumer in terms.

⇒ the real question is ⛔ **not** *"may we synthesize a figure?"* It is: **does this surface consume the
existing canonical producer, or deliberately render less than the member app does for the same pool?**

- **(a) Render the COUNT only** — consistent with 11b.1's *index*. ⚠⛔ **And its cost is now visible and
  must be ruled with eyes open:** the public per-claim page would show **LESS** than the member app
  does for the same pool — ⛔ **the exact mirror of the D7 inversion this family is already carrying**,
  pointing the other way. ⛔ If ruled, that is a **NEW second instance** of the inversion and must be
  recorded as one, ⛔ never left implicit.
- **(b) Consume `derivePoolProgressCardViewModel`'s `amountRaisedInr`** — the shipped canonical
  definition, unchanged, confirmed-only **by shape**. ⭐ *Authoring recommendation: it is the figure the
  project has already ruled canonical, and rendering it is REUSE, ⛔ not synthesis.* ⚠⛔ **Its real
  price, stated rather than glossed:** the presenter lives in `@twt/ui`, which this story is ⛔ fenced
  from adding to `apps/public` (C-1 → **11b.3b's act**). ⇒ (b) is available only by **either** lifting
  that fence for this one dependency **or** moving the amount to **11b.3b** — ⛔ and moving it is a
  legitimate ruling, ⛔ never a drift.
- **(c) Re-derive the multiplication locally in `sahyog-vivran-render.ts`** — ⛔⛔ **NAMED ONLY TO BE
  REFUSED, so nobody reaches for it as the cheap path around the fence.** It forks the canonical
  definition of a money figure into a second site. ⛔ Reject.
- **(d) Add an amount to `contribution.confirmed`** — ⛔ an Epic 9 contract change, ⛔ out of scope.

### ⛔ D4 — Which pool states does this surface render? (AC1)

The state machine is `live —pool.closed→ closed —pool.settled→ settled` (`pool/state.ts:96`).
`/sahyog` shows `closed` + `settled` (`SAHYOG_DRIVE_VISIBLE_POOL_STATES`).

- **(a)** Mirror `/sahyog` — `closed` + `settled` only. ⚠ Then **11b.3a's active-campaign display has
  no host**, because "active campaign" is the `live` state — so (a) forces 11b.3a to widen it.
- **(b)** `live` + `closed` + `settled`. ⭐ *Authoring recommendation — 11b.3a's whole subject
  (`-160` cl.10(a)) is the **active** campaign, and widening the predicate in the story that ADDS the
  Tier-1 fields is the worse ordering.* ⚠ Then decide whether a `live` pool's page is **linked** from
  anywhere or reachable **by identifier only**.

### ⛔ D7 — Does the name INVERSION get resolved here? (AC9)

11b.1 item (e) records that after D10 the **public** page shows **MORE** than the **member app** does
for the same pool (`resolvePoolIdentity` shields the same family's name on the My Pool card, Yogdaan
Bahi and notifications), and says *"⛔ Not this story's to resolve — it binds 11b.2 and 11b.3."*

- **(a) Carry it** — re-affirm, ⛔ do not re-file. ⭐ *Authoring recommendation: resolving it means
  changing the MEMBER app's form, which is not this surface's act — and this story now renders no name
  at all, so it cannot resolve it even in principle.* ⚠ Then the item's **binder becomes 11b.3b**.
- **(b) Resolve it here.** ⛔ Out of this story's diff.

### ⛔ D11 — What is the THIRD route's control set, and what count do both documents state? (Trap 4, AC6)

⭐ **This is ⛔ not an authoring question — `routes.ts:52-55` reserves it in terms:** *"A third route
that CANNOT reuse them unchanged is a third route that **needs its own ruling**, ⛔ not its own bullet
list."* ⚠ **A NEW FINDING of the 2026-09-01 combined pass, and a CONSEQUENCE OF THE D6(b) SPLIT**:
pre-split this story was paginated and PII-bearing, so the five controls transferred whole. Post-split
it is a **single-item, unpaginated, zero-Tier-1** GET, and controls **2**
(`PUBLIC_SURFACE_PAGE_SIZE_CAP`) and **3** (`PUBLIC_DIRECTORY_PAGE_HORIZON`) have ⛔ **no query
parameter to bind to**.

- **(a) State the APPLICABLE set (3) and record the two as structurally N/A, with the reason** — the
  named `limits.search` tier, the global `X-Robots-Tag` hook, and the absence of a detail/export
  affordance; controls 2/3 recorded *"⛔ not applicable: no collection, no `limit`, no `page`"*, with
  the note that **11b.3b's pagination restores them**. ⭐ *Authoring recommendation: the only option
  under which both documents state something TRUE.*
- **(b) State five and treat 2/3 as vacuously held** — ⛔ two authoritative documents claiming a control
  that does not exist. ⛔ That is the defect the file records having already had, inverted.
- **(c) Give the third route a single-item control set of its own** — ⚠ legitimate, ⛔ but it must then
  say what bounds **identifier enumeration** of `P-YYYY-MM-###`, which is sequential.

⚠⛔ **AND WHICHEVER WAY IT GOES, THE OBLIGATION TRAVELS:** **11b.3a** makes this route **PII-bearing**
and **11b.3b** makes it **paginated** — each owes the header and the `login-wall.spec.ts` entry an
update **in its own commit**, ⛔ never leaving them stating what they state today. ⭐ That obligation is
now written in **all three** files, so ⛔ no pair can route it to each other
([[feedback_circular_deferral_between_sibling_stories]]).

### ⛔ D12 — What does the reversed-denial CONSUMER actually do? (AC5, Task 5)

⭐ **A NEW FINDING of the 2026-09-01 combined pass — ⛔ nothing had recorded it.** The epic AC and
`claim/events.ts:492` both say the consumer *"routes the claim to the Sahyog Vivran publication
queue."* ⛔ **Verified by grep: no such queue exists.** The phrase is prose in
`packages/events/src/registry.ts:351` and the claim event's doc-block; the only real queues are
`news-blog/queue.ts` and `surveys/queue.ts`. ⚠ **And AC1 renders this page from live event data at
REQUEST TIME**, so the "Reversed by appeal" narrative is derivable at render with ⛔ no consumer at all.

- **(a) RENDER-TIME DERIVATION — ⛔ no consumer, ⛔ no queue.** The read joins the claim's
  `claim.reversed` event and derives the narrative; the 6.16 publish-hook obligation is discharged **by
  the read**, and that discharge is recorded as *"Closed by [edit]"*, ⛔ not *"deferred"*
  ([[feedback_closure_language_precision]]). ⭐ *Authoring recommendation: this surface holds ⛔ no
  publication STATE for a queue to advance, so a queue here is a consumer with ⛔ no effect — the shape
  11b.2a's D6(a) deleted (*"a render arm that never fires is dead code"*).*
- **(b) A REAL publication record + queue** — ⚠ then say **what state it holds** and **what reads it**,
  because AC1's read does not. ⛔ An empty queue built to satisfy the AC's wording is (a) in ceremony.
- **(c) DEFER the consumer with a named trigger**, shipping the render half only. ⚠ Legitimate and
  honest — ⛔ but a **ruling**, ⛔ never the silent outcome of Task 5 being hard to interpret.

### ⏭️ Moved to siblings — ⛔ recorded so they cannot evaporate

- **D2** (contributor name: Panel Q1 declaration + Q2 form) → **11b.3b**. ⏳ Routed 2026-08-30, nothing
  ratified.
- **D3** (the deceased member's name has ⛔ **no** Tier-1 allowlist entry on this surface — a **new
  finding** of the 2026-09-01 authoring pass) → **11b.3b**.
- **D5** (the nominee data's basis — *"the nominee's own Claim Terms clause 8"* — has ⛔ **no
  substrate**) → **11b.3a**.

---

## Dev Notes

### Architecture constraints — ⛔ non-negotiable

- **The auth boundary lives at the API, ⛔ not at the page or the edge** (`architecture.md:504-517`).
  SSR output carries *"no PII, no member-state, and **no auth-derived branching**."*
  ⚠ ⭐ **AND THE ARCHITECTURE ITSELF CARRIES AN OPEN, UN-ATTESTED DEFECT HERE:** `architecture.md:495-525`
  commits a composition contract whose fragments *"hydrate client-side"* — **equally unbuildable
  today**, for the identical reason, and it names **FR-77 nominee bank details as its own worked
  example**. Routed to Winston, ⛔ **open**, ⛔ not back-filled. ⛔ This story does ⛔ **not** close it
  and must ⛔ **not** be written up as having done so.
- `cache_policy` is a **PER-SURFACE** enum of exactly `edge_cacheable | private_no_store | redirect`.
  ⭐ The original AR-48 AC asked for one surface **simultaneously** edge-cached **and**
  request-time-rendered-bypassing-cache. ⛔ *"That is not representable in the shipped matrix, and it
  should not be made representable"* — the split it asks for is the split between a **page** and an
  **API call**.
- ⛔ **`packages/contracts` must never import `@twt/domain`'s pg-touching namespaces** — it leaks `pg`
  into the RN Metro bundle ([[project_contracts_domain_bundle_boundary]]).
- ⛔ **`@twt/ui` stays React-free**, its dependency list exactly `@twt/contracts`. ⛔ **Do not add
  `@twt/ui` to `apps/public/package.json` in this story** — that is **11b.3b's** act (C-1 ruled it an
  **ORDINARY DEPENDENCY ADDITION**, ⛔ not a governance reversal; ⛔ **there was no prior declination**,
  `.decision-log.md:1734`). ⚠⭐ **AND THAT FENCE NOW HAS A CONSEQUENCE D1 MUST PRICE:** the shipped
  `amountRaisedInr` producer lives **behind** it, in `@twt/ui/pool-progress` — so under D1(b) the
  dependency must either be lifted for this one package or the amount moves to 11b.3b. ⛔ **Re-deriving
  the multiplication locally to stay inside the fence is D1(c), and it is refused.**

### Testing standards for this story

- **Astro pages are tested through the pure render module, ⛔ not through the `.astro` file** — the
  house carve-out, and why *"ALL display logic lives in the pure `.ts` render module"* is structural
  rather than stylistic (`surface-fields.ts` names the bypass it would otherwise create).
- **Every gate this story touches is proven with a PLANTED VIOLATION + a revert-sanity run**, recorded
  in the Dev Agent Record. A green scan over an armed-but-empty leg proves nothing.
- **`t()` is called for real**, namespace in the **third** slot, on the
  `apps/mobile/tests/unit/panchayat-noticeboard-render.test.ts:21,141` mount-free pattern. ⛔ Do not
  assert *around* `t()` by reading locale JSON from disk — that is the 11a.2 defect shape, and the
  ground *"no mount"* was found **false** at the 2026-09-01 combined review.
- **Live-DB specs:** ⛔ never regenerate an applied migration (42P07), ⛔ never `DROP SCHEMA` (42P01),
  assert **membership, not counts** — `PARIWAR_A` is shared and accumulates
  ([[project_live_db_test_gotchas]], [[project_ci_local_double_run_pollution]]).
- ⚠ **Known-open live-DB failure #3** (renewal-lifecycle) is pre-existing — confirm innocence by
  running a spec in isolation before attributing a failure to this story
  ([[project_known_livedb_test_failures]]).

### Latest-tech note — Astro 6 server islands

`server:defer` is the **recorded leading candidate** for the AR-48 hydration mechanism
(`2026-08-20-141` D2) — ⭐ the one reading under which the epic AC and the architecture agree.
⛔ **It is NOT adopted and must not be reached for**: a server island still needs *a viewer the browser
cannot identify*, so it is ⛔ **not a disposition on its own**. `apps/public` pins `astro ^6.4.8` and
`@astrojs/node ^10.1.4`; ⛔ do not bump either.

### Known footguns on this exact path

- ⚠ **`ci:local`**: `integration-tests` concurrency `=1` is **LOAD-BEARING** — ⛔ never raise it
  ([[project_ci_local_concurrency_oversubscription]]). `git push` runs the full `ci:local` via a
  pre-push hook (the "hang").
- ⚠ **Friction budget** AC-4 diffs **COMMITTED** history, so it passes vacuously until you commit
  ([[project_friction_budget_baseline_ratchet]]).
- ⚠ **Type-only → value import** materializes a module-init cycle that breaks **consuming** packages at
  runtime while typecheck/lint/local tests stay green ([[project_type_only_import_cycle_trap]]).
- ⚠ **CI Actions availability flips both ways without warning** — re-verify live; `ci.yml` vs
  `ci-local.sh` drift is invisible by construction ([[project_ci_actions_suspension_local_mirror]]).

### Previous-story intelligence (11b.2 / 11b.2a / 11b.2b, all `done` 2026-09-01)

- ⭐⭐ **The combined review found a CIRCULAR DEFERRAL** — 11b.2 and 11b.2b each routed the same `t()`
  obligation to the other and it was discharged by **neither**; five single-story passes each let it
  through, because the loop is only visible with both files open. ⇒ ⛔ **when this story routes an
  obligation to a sibling, name the sibling AND the artefact**, and ⛔ never route to a story that
  routes back ([[feedback_circular_deferral_between_sibling_stories]]). ⚠ **This story now has TWO
  siblings — the risk is higher here than it was there.**
- ⭐ **RTBF removes the contributor ENTIRELY** from any contributor list — ⛔ no anonymized row, ⛔ no
  marker, ⛔ no placeholder key — and the omitted contributor **still counts** toward every confirmed
  aggregate (`2026-08-30-169`). ⚠ **That binds AC3's count on this story even though it renders no
  names.**
- ⚠ **Concurrent review agents mutate the tree** — re-check `git status` after parallel passes
  ([[feedback_concurrent_review_agents_mutate_tree]]).

### Project Structure Notes

| Path | New / Update |
|---|---|
| `packages/contracts/public-pages/public-vs-private-matrix.yaml` | **UPDATE** — the 10th surface, ⛔ zero Tier-1 fields |
| `packages/contracts/src/public-pages/matrix.ts` | ⛔ **NOT TOUCHED** (11b.3a's) |
| `packages/contracts/src/public-pages/sahyog-vivran.ts` | **NEW** — the DTO (`.strict()`) |
| `packages/contracts/src/contributions/pool-contributor-list.ts` | **UPDATE** — `:88` only (Trap 6) |
| `packages/domain/src/pool/sahyog-vivran-read.ts` | **NEW** |
| `packages/domain/src/contribution/read.ts` | **UPDATE** — deterministic ORDER BY |
| `apps/api/src/modules/public-pages/{routes,handlers}.ts` | **UPDATE** — the third GET + its defence |
| `apps/api/tests/integration/login-wall.spec.ts` | **UPDATE** — allowlist entry, same control count |
| `apps/public/src/pages/sahyog-vivran/[poolCanonicalIdentifier].astro` | **NEW** |
| `apps/public/src/lib/sahyog-vivran-render.ts` | **NEW** — all display logic, pure |
| `packages/i18n/locales/{en,hi}/sahyog-vivran.json` | **NEW** |
| `microcopy.yaml` | **UPDATE** — `scope.copy_globs` |
| `apps/public/package.json` | ⛔ **NOT TOUCHED** (11b.3b's) |
| ⛔ any migration | ⛔ **NONE** — this story has no schema change (11b.3a's) |

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story-11b.3` — ⚠ **STALE**; see the top box]
- [Source: `.decision-log.md#decision-2026-08-28-160` cl.7 (clearance) · cl.10 (→ 11b.3a) · cl.11 (the fail-closed trap)]
- [Source: `.decision-log.md#decision-2026-08-28-164` **A2** (SD-2 re-purposed) · `#decision-2026-08-28-165` cl.1/cl.2/cl.3 (→ 11b.3a)]
- [Source: `.decision-log.md#decision-2026-09-01-171` cl.1 (the `:88` fence) · `#decision-2026-09-01-172` (RTBF ends at the wire)]
- [Source: `trustee-panel-routing-note-2026-08-28-11b3-publication-basis-and-matrix.md` §8 A2/A3 · §10 A5/A6 · **§11**]
- [Source: `packages/contracts/src/public-pages/matrix.ts:157-200` (fail-closed both directions) · `:376-424` (*"the gate failing is the gate working"*)]
- [Source: `packages/domain/src/contribution/events.ts:147-157` (⛔ **no amount**) · `read.ts:99-135` · `pool/state.ts:96` · `pool/events.ts:138-141`]
- [Source: `packages/domain/src/claim/events.ts:480-503` (`claim.reversed` payload + the publish-hook contract)]
- [Source: `apps/public/src/components/AuthenticatedFragment.astro` (the three ⛔ DO NOTs) · `apps/public/src/pages/sahyog.astro` (the house shape)]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` — 11b.1 items (e) (f) · the `:88` routing · the ORDER BY routing]
- [Source: `_bmad-output/implementation-artifacts/11b-1-sahyog-drive-active-archive.md` (the sibling public surface) · `11b-3a-…md` · `11b-3b-…md`]
- Memory: [[project_11b_consent_model_c5_superseded]] · [[project_no_browser_member_token_surface]] · [[project_directory_launch_gated_on_killswitch_ui]] · [[project_death_is_an_overlay_not_a_state]] · [[project_epic9_confirmed_producer_is_live]] · [[project_claim_overlay_unfreeze_seam]] · [[feedback_supersede_never_reinterpret]] · [[feedback_closure_language_precision]] · [[feedback_circular_deferral_between_sibling_stories]]

---

## Dev Agent Record

### Agent Model Used

_(to be filled by the dev agent)_

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Change |
|---|---|
| 2026-09-01 | Story authored (`bmad-create-story 11b.3`). Scope reconciled against `2026-08-28-160` cl.10 / `-164` A2 / `-165` cl.1–cl.3, which `epics.md` had never carried. Seven decisions raised. |
| 2026-09-01 | **Combined validation of 11b.3 / 11b.3a / 11b.3b** (`bmad-create-story validate`), run as one pass because a per-story pass cannot see the split seam. Six criticals applied. **D1 RE-POSED** — `amountRaisedInr` is shipped and ruled (9.12 D3), ⛔ not unbuilt. **D11** (the third route's control set — `routes.ts:52-55` reserves it) and **D12** (the reversed-denial consumer's mechanism — ⛔ no publication queue exists) minted OPEN. AC9's *"missing ORDER BY"* premise corrected: the read has sorted by `member_id` since 8.3, and `member_id` is the key the AC prohibits. |
| 2026-09-01 | **D6 RULED (b) by BigDev — SPLIT THREE WAYS.** This file narrowed to the public shell + reversed-denial hook + financial-truth gate, with ⛔ **zero Tier-1 fields at `public`** as a checkable property (AC2). D2/D3 → 11b.3b; D5 → 11b.3a. ⛔ The story KEY is unchanged — `deferred-work.md` and `2026-09-01-171` cite it by name. |
