# Story 11b.3b: Sahyog Vivran Named-Identity Render Layer — Deceased Member Name + Contributor List `[SURFACE]`

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> ⭐⛔ **THIS STORY IS ⛔ NOT IN `epics.md`'s STORY LIST.** It is the third of the three-way split of
> Story 11b.3, ruled **D6(b)** by BigDev on **2026-09-01**, and is recorded in `epics.md` as an
> **annotation** owed by **11b.3's Task 0** — exactly as `11b-2a` / `11b-2b` are. ⛔ A future
> `sprint-planning` run must ⛔ not regenerate a ghost 11b.3 or drop this story.
>
> ⛔ **ORDER: runs AFTER `11b-3` is `done` AND MERGED.** ⭐ Independent of **11b.3a**; the two may run
> in parallel.

> ⛔⛔ **AND THIS STORY IS GATED ON A PANEL RULING THAT HAS ⛔ NOT ARRIVED. ⚠ READ THIS BEFORE ANYTHING ELSE.**
>
> **BOTH** of this story's subjects are **UNRULED**, and each needs a `(surface, field)` entry in
> `matrix.ts`'s enumerated Tier-1 allowlist — *"⛔ ADDING TO THIS LIST IS A RULING, NEVER A CODE
> CHANGE … do NOT 'fix' a failing third entry by appending it here — **the gate failing is the gate
> working**"* (`matrix.ts:388-391`).
>
> | Subject | Basis | Declaration | Form |
> |---|---|---|---|
> | **contributor name** | ✅ settled (`2026-08-28-160` cl.7) | ⛔ **UNRULED** (D2/Q1) | ⛔ **UNRULED** (D2/Q2) |
> | **deceased member's name** on `sahyog-vivran` | ✅ settled (member's own T&C, cl.4) | ⛔ **UNRULED** (D3) | ⚠ reserved to *"this surface's OWN Panel ruling"* (`matrix.ts:401-402`) |
>
> ⏳ **BOTH packets are now written, routed FILES — ⛔ and NEITHER is ratified.**
> · contributor → `trustee-panel-routing-note-2026-08-30-contributor-name-public-tier.md`
> · deceased member → `trustee-panel-routing-note-2026-09-02-11b3b-deceased-name-form.md` (**written
>   2026-09-02**, discharging the packet half of Task 0)
> ⚠⛔ **A ROUTED PACKET IS ⛔ NOT A RULING.** Both are **ROUTED, ⛔ nothing ratified and ⛔ nothing
> applied** — this story's STOP gate is ⛔ **unchanged** ([[feedback_closure_language_precision]]).
>
> ⇒ ⛔ **Task 0 is a STOP gate here in a way it is not on the siblings.** Until both rulings land,
> ⛔ **no code**.

---

## Story

As a **non-member visitor** reading a Sahyog Vivran,
I want to see **whose drive this was** and **who stood behind it**,
so that the page reads as a record of a community act rather than an anonymous ledger entry — with
each name appearing on **that person's own instrument**, in **the form the Trustee Panel ruled**, and
⛔ never in a form an engineer chose.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces TWO predicates that gate what a person sees. ⛔ NEITHER IS SETTLED, and that
is the whole reason this story is separate.**

1. **The contributor predicate.** *"Your name can appear on the public list of people who contributed
   to a drive because **you** accepted the membership Terms & Conditions."*
   ⛔ **Checked, and the answer is NOT SETTLED.** The **basis** is settled (`2026-08-28-160` cl.7); the
   **declaration** and the **form** are ⛔ UNRULED, routed **2026-08-30**, ⏳ nothing ratified.
   ⚠⛔ **And the count of things already assuming an answer is THREE, ⛔ not one** — `epics.md:3145`
   (Story 8.3's own *"I want"*, which names *"any visitor on Sahyog Drive (Epic 11b)"* and specifies
   *"first-name + last-initial only"*), `:3238` (the receipt PDF), `:4931` (11b.2's epic AC). ⭐ ⛔ **An
   epic AC is not a ruling** — that is the only reason *"unruled"* survives against three assumptions.

2. **The deceased-member predicate.** *"Your name can appear on the public page for the drive run in
   your memory because **you** accepted a version of the T&C that says so — ⛔ not because your family
   ticked a box."*
   ✅ **Checked against the Niyamavali:** the disclosure clause is minted **as a Niyamavali clause and
   pinned** to a T&C version (`2026-08-28-161`, Story 11b.9 D6(a)). ⚠ **Result: the clause does ⛔ NOT
   EXIST YET** — counsel's T&C return is due **2026-09-07**. ⇒ even once D3 rules, the predicate reads
   **false for every member** and the surface renders **unnamed**. ⭐ **Fail-closed, and therefore
   correct** ([[project_11b_consent_model_c5_superseded]]).

⭐⛔ **AND THE NON-PREDICATE:** ⛔ **no predicate in this story may read `members.state`, `is_valid`, or
a moderation overlay.** A contributor's name is ⛔ **never removed because they died** (11b.1 D9(a)),
and ⛔ **RTBF is a separate rule that is ⛔ NOT collapsed into it** — see Trap 5.

---

## 🎯 What already EXISTS — verified live at `79ed41d`

| Thing | State | Where |
|---|---|---|
| The `@twt/ui` `contribution-list` **presenter** (11b.2) | ✅ **LIVE** — emits name **PARTS** and ⛔ **never joins them**, precisely so ⛔ nothing in it decides the form (`-168` cl.6 / D9(a)); `unknown` arm **throws** (D8(a)) | `packages/ui/src/contribution-list/{presenter,view-model,i18n-keys}.ts` |
| The confirmed-contributor **wire** | ✅ `ConfirmedContributorRow = { firstName: min(1), lastInitial: max(16) }`, `.strict()` — ⚠ a **BUILT-TO** form, ⛔ **not a ratified one** | `packages/contracts/src/contributions/pool-contributor-list.ts:42-51` |
| The **mobile** render layer (11b.2b) | ✅ **LIVE** — the adapter + per-row `try/catch` pattern to mirror | `apps/mobile/components/contributor-list/PoolContributorList.tsx` |
| `resolvePublicMemberName` | ✅ the **Pariwar-configured** form (`full_name` is the **DEFAULT**, ⛔ not a constant — `2026-08-19-136` cl.1) | ⚠ `packages/domain/src/kyc/public-name.ts:73` — ⛔ **NOT** `pool/public-read.ts`, which holds the different `NAME_PUBLICATION_AUTHORISED` SQL predicate at `:283` |
| `resolvePoolIdentity` | ✅ **hard-codes the SHIELDED** form; used by the **member-facing** My Pool card / Yogdaan Bahi / notifications (8.6/8.7/8.8) | `packages/domain/src/notifications/pool-identity.ts:76` |
| The `sahyog-vivran` surface | ✅ **created by 11b.3** with ⛔ **zero** Tier-1 fields + a test asserting that count | `public-vs-private-matrix.yaml` |
| The ruled Tier-1 allowlist | ✅ **two** entries — `member-directory.member_name`, `sahyog-drive.deceased_member_name`. ⛔ **Neither is a contributor** | `matrix.ts:392-404` |
| C-1's ruling: `apps/public` **adds `@twt/ui`** | ✅ *"an **ORDINARY DEPENDENCY ADDITION**"* (`2026-08-23-154` cl.6); ⛔ **there was no prior declination** (`.decision-log.md:1734`) | — |

**⛔ What does ⛔ NOT exist:**

- ⛔ **No contributor entry in the allowlist, on any surface.**
- ⛔ **No `sahyog-vivran.deceased_member_name` entry** — and `matrix.ts:401-402` reserves it: *"Its
  scope does NOT reach 11b.3 (Sahyog Vivran) or 11b.6 (In Memoriam) … moving them requires each
  surface's OWN Panel ruling."*
- ⛔ **No `clause_versions` row for the disclosure clause** — the 11b.9 predicate is **inert**, by
  ruled design.
- ⛔ **No stable per-member row key.** `rowKey` was **vacated by 11b.2a's D5** and ships in ⛔ neither
  `@twt/ui`, the contract, nor `apps/mobile`. ⇒ **Trap 4.**
- ⛔ **`apps/public` does not depend on `@twt/ui`.** Adding it is **this story's** act.

---

## ⛔ THE FIVE TRAPS

### Trap 1 — ⭐⛔ THE BASIS IS SETTLED AND THE FORM IS NOT, AND A READER WHO CHECKS ONLY THE BASIS CONCLUDES WRONGLY

The 2026-08-30 routing note's §5 table exists for exactly this failure:

| Layer | State |
|---|---|
| **BASIS** — *why* a contributor's name may render publicly | ✅ **SETTLED** (`-160` cl.7 cleared all three 11b surfaces) |
| **DECLARATION** — the `(surface, field)` matrix pair | ⛔ **NOT MADE** |
| **FORM** — full vs first-name + last-initial vs other | ⛔ **UNRULED since 2026-08-19** |
| **MECHANISM** — what gates it at render time | ⛔ **NOT BUILT** |

⚠ *"A reader who checks only the basis concludes the question is answered. It is not."*
⛔ **Do not build to the shipped wire shape and call it ratified** — `pool-contributor-list.ts:42-51`
implements the shielded form, and the note names it **built-to, ⛔ not ratified**. ⭐ A ruling either
way costs **no migration**, which is precisely why nobody should pre-empt it.

### Trap 2 — ⭐⛔ SHIELDING DOES ⛔ NOT LOWER THE TIER, SO **EVERY** FORM NEEDS AN ALLOWLIST ENTRY

`MatrixFieldSchema.superRefine` is fail-closed both ways (`matrix.ts:174-199`): `pii_tier: 1` at
`tier: public` **without** a `tier1_public_exception` **FAILS**.

⚠ **And *"first-name + last-initial is not really Tier-1"* is ⛔ NOT available as an argument.**
`public-vs-private-matrix.yaml:60` — `pii_tier` is *"a FACT about the data; ⛔ never changed to permit
a render"* — and `2026-08-28-165` **cl.2** ruled the analogous point for masking. ⚠⭐ **But note what
the 2026-08-30 note §4 says about that extension:** applying cl.2 (whose subject was **bank account
fields**) to **a person's name** is *"a SOUND INFERENCE … ⛔ and NOT something the ruling decided."*
⇒ ⛔ **offer it as reasoning, ⛔ never cite it as authority.**

⇒ ⭐ **the shielded form and the full form need the SAME thing: a Panel ruling and an entry.** The form
question is about **which name**, ⛔ not about **whether an entry is needed**.

### Trap 3 — ⚠ THERE ARE **TWO** PUBLIC NAME RESOLVERS, THEY PRODUCE **DIFFERENT FORMS**, AND THE INVERSION IS ALREADY OPEN

`resolvePublicMemberName` = Pariwar-configured (default **full name**). `resolvePoolIdentity()` =
**hard-coded shielded**, and is what the **member app** uses for the same family.

⭐ `/sahyog` renders the **full** name under D10 — ⚠ and **D10 is author-ruled and ⛔ NOT
Panel-ratified** (`deferred-work.md` 11b.1 item **(e)**). ⇒ ⛔ **do not cite `/sahyog`'s form as
precedent for this surface**; `matrix.ts:401-402` fences it out **by name**, and 11b.1's own exception
rationale flags its comparative ground as *"⛔ not to be cited for a third surface."*

⚠ **The INVERSION binds this story now.** After D10 the **public** page shows **MORE** than the
**member app** does for the same pool. 11b.1 item (e) says *"⛔ Not this story's to resolve — it binds
11b.2 and 11b.3."* ⇒ **11b.3 carried it (D7(a)); this story is its binder.** ⛔ **Re-affirm it, ⛔ do
not re-file it** — *"two records of one obligation is its own failure."* Whether this story **resolves**
it is **D9**.

### Trap 4 — ⛔ THE FlashList `keyExtractor` RE-TRIGGER FIRES **HERE**, AND ITS BLOCKER IS STILL TRUE

The Story 8.3 deferral (*"`keyExtractor` includes `index`, so row identity churns"*) records its
re-trigger as *"if this list ever needs to scale beyond a single pool's roster (e.g. reused for the
Epic 11b **public** render)"*. ⭐ **Story 11b.2b was ⛔ NOT that** — it is the **member** render of a
single pool's roster, the exact scale the deferral's own ground calls fine (*"dozens, not the ~16k
Sahyog Vivran scale"*) — and 11b.2b's authoring pass **wrongly claimed the trigger had fired**, which
was corrected on the record.

⇒ ⭐ **This story IS the public host and the real re-trigger.** ⚠ **And its recorded blocker is still
true verbatim:** *"the PII-shielded shape carries no stable per-member identifier."* `rowKey` was
vacated by **11b.2a's D5** and ships nowhere.

⇒ **D10**: what is the stable key? ⛔ It is ⛔ **not** `index`, and it is ⛔ **not** a `member_id` on a
public wire — 11a.3's handler refuses that **in terms**, because a per-member permalink is an
**enumeration primitive**.

### Trap 5 — ⛔ RTBF REMOVES THE CONTRIBUTOR **ENTIRELY**, AND THE OMITTED ROW **STILL COUNTS**

`2026-08-30-169`: RTBF removes the contributor from the list — ⛔ **no anonymized row, ⛔ no marker,
⛔ no placeholder key** — and the omitted contributor **still counts** toward every confirmed-transaction
aggregate. ⚠ `2026-08-31-170`: the guarantee lives on the **decrypted plaintext**, ⛔ **not** on the
lifecycle-state read (which is an **optimization**), and ⛔⛔ **a per-row state re-check is FORBIDDEN
as a TOCTOU mitigation** — it is the rejected construction *and* it does not close the window.

⚠⛔ **AND A LIVE RESIDUAL IS CARRIED OPEN, ⛔ not closed** (`2026-09-01-172`): the RTBF guarantee **ends
AT THE WIRE**; the device-side persisted cache is out of scope **by ruling**, so an erased
contributor's name can render from MMKV for up to **7 days offline** and **survives sign-out on a
shared device**. ⭐ **That residual is a MOBILE one** — ⛔ this Astro surface has no MMKV — ⚠ but the
**edge cache is this surface's equivalent exposure**: an erasure keeps being served from every warm
PoP at `s-maxage=300`. ⛔ **State it; ⛔ do not re-derive it as new.**

---

## Acceptance Criteria

> ⛔ **AC1 is a STOP gate. ⛔ Nothing below it builds until both rulings land.**

### AC1 — Both rulings exist, are cited, and are transcribed BEFORE any code

**Given** D2 (contributor: declaration + form) is with the **Panel**, ⏳ routed 2026-08-30, and D3
(deceased member on this surface) has ⛔ **no packet yet**
**When** Task 0 runs
**Then** the D3 packet is **written and routed** as a trustee-panel routing note in the house shape —
⛔ it may ⛔ **not** be resolved by BigDev alone, because `matrix.ts:401-402` reserves it to *"each
surface's **OWN Panel ruling**"*
**And** ⛔ **if either ruling is absent → STOP and report.** ⛔ Do not ship *"first-name + last-initial
for now"*, ⛔ do not add a matrix field, ⛔ do not add `@twt/ui` to `apps/public/package.json`
**And** both rulings are **transcribed** into `.decision-log.md` — ⛔ the dev agent transcribes, it
⛔ **never** authors, paraphrases or re-grounds one.

### AC2 — The two allowlist entries land WITH their field declarations, in the SAME commit

**Given** Trap 2 and the §11 timing rule (*"a pre-added entry is a standing permission with ⛔ no
subject"*)
**When** the fields are declared
**Then** `sahyog-vivran.contributor_name` and `sahyog-vivran.deceased_member_name` are added to
`RULED_TIER1_PUBLIC_EXCEPTIONS`, **each citing the ruling that authorised it**
**And** each YAML field carries a full `tier1_public_exception: {decision, rationale, scope}` whose
`scope` fences it to **this surface** and states the **ruled form**
**And** ⭐ the surface's Tier-1-count test is updated **in the same commit** (⛔ never deleted) — ⚠ its
value depends on whether **11b.3a** has merged first; ⛔ **read it, ⛔ do not assume it**
**And** ⛔⛔ **an entry is ⛔ NEVER added to make a failing check pass** — *"the gate failing is the gate
working."*

### AC3 — `apps/public` adds `@twt/ui`, and the Astro render layer is authored over the SHARED presenter

**Given** C-1 — RULED: **headless presenter + per-stack render layer**, and *"an ORDINARY DEPENDENCY
ADDITION"* (⛔ **not** a governance reversal; ⛔ **there was no declination** — the Story 2.5 variance is
about where **tokens** live)
**When** the layer is built
**Then** `@twt/ui` is added to `apps/public/package.json`, and `@twt/ui`'s **own** dependency list stays
**exactly `@twt/contracts`** — ⛔ no React, ⛔ no `.astro`, ⛔ no framework of any kind enters it
**And** the `.astro` component consumes `deriveContributionRowViewModel` and renders the **name parts**
in the ruled form — ⭐ **the JOIN happens in the render layer, ⛔ never in the presenter** (D9(a) is what
keeps the form question open, and moving the join would make a routed deferral false)
**And** the presenter's **input** name kind is `'name'`; `'nameParts'` is **OUTPUT only** — ⚠ 11b.2b's
AC9 got this wrong ([[project_contribution_row_render_layer_substrate]])
**And** ⭐ **every row is wrapped in its own `try/catch`** — the `unknown` arm **throws** by design
(D8(a)), and this Astro producer is the **first** that can legitimately reach it. ⛔ One bad row must
⛔ not take down the surface
**And** ⭐ **`packages/ui/src/index.ts` has stated since Story 9.12** that `<PoolProgressCard>` is
*"shared by the apps/mobile RN progress meter today **+ the Epic-11b public Sahyog Vivran render
later**"* — ⇒ ⛔ `apps/public` lacked the dep because it had **no presenter to consume**, ⛔ not because
anyone declined one.

### AC4 — The list is paginated, deterministically ordered, and ⛔ never a leaderboard

**Given** FR-91 and the **remembrance-not-analytics** invariant this epic enforces in three places
**When** the list renders
**Then** it binds `apps/public/src/lib/pagination.ts`'s `parsePageParams()` **unchanged** (page-size
cap 50, deep-page horizon 200, ⛔ no silent clamp), and the surface's `paginated` **flips `false` →
`true`** in the matrix — ⚠ 11b.3 declared it `false` because it renders no list; ⛔ read the current
value, ⛔ do not assume it
**And** ⭐⛔ **THAT FLIP RESTORES THE TWO CONTROLS THE THIRD ROUTE COULD NOT CARRY, AND THE ROUTE'S
WRITTEN DEFENCE MUST MOVE WITH IT — ⛔ IN THIS COMMIT.**
`apps/api/src/modules/public-pages/routes.ts:52-55` rules that the control set is a property of *"an
unauthenticated, **PAGINATED**, PII-bearing public collection"*; 11b.3 shipped the route
**unpaginated** under **D11**, so controls **2** (`PUBLIC_SURFACE_PAGE_SIZE_CAP`) and **3**
(`PUBLIC_DIRECTORY_PAGE_HORIZON`) were recorded as structurally N/A. ⇒ the `routes.ts` header **and**
the `login-wall.spec.ts` allowlist entry are both updated to the set that applies now, ⛔ **both
stating the SAME count** — *"two authoritative documents disagreeing on how many controls exist is the
defect this file records having already had once"*
**And** ⚠ this story ALSO makes the route **PII-bearing** (two Tier-1 fields) — ⭐ **11b.3a does the
same, independently and in parallel.** ⛔ Whichever lands second must **read** what the other wrote and
extend it; ⛔ neither may overwrite the other's control set
**And** the order is the **deterministic** one 11b.3 established at the read (confirmation
`event_version`) — ⛔ **never `member_id`**, which leaks an arbitrary identifier ordering onto a
PII-shielded surface
**And** ⛔ **PROHIBITED:** contributor leaderboards · rankings (*"top contributors"*, *"supporter of the
month"*) · gamification (badges, streaks, achievements) · social-performance metrics · popularity
metrics. ⛔⛔ **AND THE SORT ORDER IS NOT A RANKING** — there is deliberately **no sortable column
header**: *"sort by contributions" is a leaderboard wearing a table affordance*
**And** ⭐ **THE TEST:** *"Does this serve remembrance, transparency or claim discoverability?"* If the
honest answer is **engagement, ranking or social performance**, it is **REJECTED at design time**
**And** ⛔ **no bulk-export affordance** — ⛔ no `format`, ⛔ no `csv`, ⛔ no `all` parameter (FR-91). The
authorized export path is Story 10.7's scope-respecting, audit-logged library.

### AC5 — RTBF and the row key

**Given** Trap 4 and Trap 5
**When** a contributor has exercised RTBF
**Then** they are **absent from the list entirely** — ⛔ no anonymized row, ⛔ no marker, ⛔ no
placeholder key — **and still counted** in every confirmed aggregate
**And** ⛔ **no per-row lifecycle-state re-check is added** as a TOCTOU mitigation — forbidden by
`2026-08-31-170`
**And** the row key is the one **D10** rules — ⛔ not `index`, ⛔ not `member_id` on a public wire.
⚠ ⭐ **If D10 rules (a), the correct output is NO key at all** and this clause is discharged by the
8.3 deferral being **re-affirmed open with a re-pointed trigger** — ⛔ never by inventing one anyway
**And** the **edge-cache residual is stated in writing** on the surface's own file: an erasure keeps
being served from every warm PoP for up to `s-maxage` seconds, and ⛔ **direct SQL is NOT the
operational fallback**. ⛔ Recorded, ⛔ not re-derived as a new finding.

### AC6 — The buildable public column inventory is NAMED here [11b.1 D5(a)'s remaining half]

**Given** `deferred-work.md` 11b.1 item **(f)**: the UX-spec amendment **records** the defect but
*"does ⛔ NOT repair the surface — ⛔ **naming the BUILDABLE inventory is 11b.3's**, at the point it has
a host"*
**When** the contributor table lands
**Then** ⭐⛔ **THE BUILDABLE HALF IS NAMED POSITIVELY — ⛔ a second negative list does NOT discharge
this AC.** The UX spec's `:1160` annotation **already** records what is not buildable; restating it is
⛔ not the obligation. ⇒ name what a reader can actually be shown: **`District` · `Pool` · `Date`** are
buildable today (district from the deceased member's Pariwar geography, pool from
`PoolContributorListPoolIdentity`'s letter code, date from the confirmation event) — ⭐ **plus
`Donor Name`, CONDITIONAL on D2**, and ⚠ its *label* is separately microcopy-PROHIBITED
(`microcopy.yaml:42`, `member_only: true`) even if the field is ruled in, so the ruled form ships under
a permitted label
**And** the not-buildable half is named against the ten columns at
`ux-design-specification.md:1158`, each with its disposition: **`Donation ID` · `HRMS` · `Member ID`**
have ⛔ **no substrate** (the last **refused in terms** on a public wire as an enumeration primitive) ·
**`Donor Name` · `Late Teacher`** are **microcopy-PROHIBITED** (`microcopy.yaml:42`, `:48`, both
`member_only: true`) · **`School` / `Block`** are separately ineligible or gated
(`2026-08-19-133` cl.1, `-132` cl.3, `2026-08-19-137` cl.7)
**And** ⛔ **the UX spec is ANNOTATED at the canonical anchor (`:1287-1298`), ⛔ never rewritten** — ⛔ no
column is deleted and ⛔ no replacement inventory is authored elsewhere
([[feedback_supersede_never_reinterpret]])
**And** ⚠ **the Real Data Test's disambiguation question stays OWED** — its scenarios rest on
`Member ID` + `HRMS`, which do not exist. ⛔ **The gate is not weakened**; the **means** must be re-posed
against fields that do exist, and re-posing it is ⛔ not this story's act.

### AC7 — Accessibility + i18n

**Then** the list holds **family 13 (Semantic accessibility, AI-11a-3)** of
`_bmad/custom/load-bearing-invariant-checklist.md:72` — each row a coherent unit, ⛔ never a stream of
disconnected text nodes
**And** ⚠⛔ **family 13 is written in REACT-NATIVE vocabulary and this is an ASTRO surface** — 11a.6's
worked example is `apps/mobile/components/panchayat/PinnedItem.tsx` (⛔ **not** in `@twt/ui`), and
`accessible={true}` / `accessibilityLabel` have ⛔ **no HTML equivalent**. ⇒ hold it in its **web
form**: a real table with `<th scope="col">`, each row one coherent announced unit, `aria-label` on a
grouping element that carries a role — ⛔ never a labelled `<div>` no role announces. ⛔ **Do ⛔ not
record family 13 as held by pointing at the RN file**
**And** every `t()` call passes an explicit `namespace` in the **third** slot — ⚠ `t()` defaults to
`common` and **THROWS**
**And** ⭐⛔ **THE NAMESPACE IS `contribution` FOR THE TEN REFS, ⛔ NOT `sahyog-vivran` — ⛔ AND THEY ARE
⛔ NOT COPIED INTO ONE.** Verified live: every entry in `CONTRIBUTION_LIST_I18N_REFS` carries
`namespace: 'contribution'` (`packages/ui/src/contribution-list/i18n-keys.ts`), the keys ship
bilingually at `packages/i18n/locales/{en,hi}/contribution.json:30-39`, and that file's header rules it
in terms: *"**REUSE ONLY. NOTHING IS MINTED HERE, AND NO NAMESPACE IS CREATED.**"* ⇒ the render layer
calls **`t(ref.key, params, { namespace: ref.namespace })`** — the ref carries its own namespace and
⛔ **nothing re-points it**. ⚠ `contribution` is **already globbed** (`microcopy.yaml:317-318`), so no
gate is dodged by leaving it there — ⛔ and duplicating ten keys into `sahyog-vivran` to make one
namespace true would be the copy this module exists to prevent
**And** ⭐ **only copy this surface MINTS** — headings, the reversed-appeal narrative, the memorial
framing — lands in the `sahyog-vivran` namespace 11b.3 added to `scope.copy_globs`; ⛔ do not add a
third namespace
**And** ⭐ **all ten `CONTRIBUTION_LIST_I18N_REFS` resolve through the REAL `t()` in BOTH locales** —
⚠ this is the obligation that survived a **circular deferral** between 11b.2 and 11b.2b and was
discharged only at the 2026-09-01 combined review; ⛔ **do not let a third instance open here**, and
⛔ **a test that resolves them against the wrong namespace is a third instance wearing a green run**
([[feedback_circular_deferral_between_sibling_stories]]).

### AC8 — What this story does ⛔ NOT build is ROUTED

**Then** `deferred-work.md` gains this story's section recording, each with a trigger: **11b.2 items
(i) / (ii) / (iii)** — ⭐ **discharged if AC1–AC3 complete, ⛔ and explicitly re-affirmed OPEN if the
rulings do not arrive** · the **public/member name INVERSION** (11b.1 item (e) — ⛔ re-affirmed, ⛔ not
re-filed; **D9** decides whether it moves) · the **FlashList `keyExtractor`** deferral (⛔ discharged
only if D10 supplies a stable key; otherwise **re-affirmed OPEN**, ⛔ never silently re-pointed) · the
**Real Data Test disambiguation** question (AC6)
**And** ⛔ **the `epics.md` annotation is 11b.3's Task 0, ⛔ not this story's** — ⛔ do not write a
second one.

---

## Tasks / Subtasks

- [ ] **Task 0 — ⛔ STOP GATE. ⛔ No code until both rulings land.** (AC: 1)
  - [ ] ⛔ Verify `11b-3` is `done` AND MERGED.
  - [x] ✅ **The D3 packet is WRITTEN AND ROUTED (2026-09-02)** —
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-02-11b3b-deceased-name-form.md`,
        in the house shape, ⛔ not re-arguing D2. ⚠⛔ **This discharges the WRITING, ⛔ not the
        question** — D3 stays **UNRULED** and this task stays a STOP gate.
  - [ ] ⭐ **Check whether the Panel answered it** — an `§8`-style appendix on that note, or a new
        `.decision-log.md` entry. ⛔ Do ⛔ not infer an answer from silence.
  - [ ] ⚠ **Check the note's Q3 (the CLAUSE SCOPE) outcome too** — counsel's clause returned
        **2026-09-07** under `niy.public-disclosure.member-information`. ⛔ A Q1 "yes" over a
        narrowly-scoped clause is a ruling with ⛔ no instrument, and the surface renders unnamed
        anyway. ⛔ Do not build to Q1 without reading Q3.
  - [ ] Check whether **D2** has been answered (`§8`-style appendix on the 2026-08-30 note, or a new
        `.decision-log.md` entry). ⛔ Do ⛔ not infer an answer from silence.
  - [ ] ⛔ **If either is unruled → STOP and report.** ⚠ This is the one story in the family where
        stopping is the expected outcome on a first pass.
  - [ ] Transcribe both rulings; re-read `.decision-log.md` head first (⚠ 11b.3a mints against the
        same head). `governance:` commit first.

- [ ] **Task 1 — Declare the two fields + their two allowlist entries, in ONE commit** (AC: 2)
- [ ] **Task 2 — Add `@twt/ui` to `apps/public`; author the Astro render layer** (AC: 3)
  - [ ] Per-row `try/catch`; the join lives in the render layer, ⛔ never in the presenter.
  - [ ] ⛔ `@twt/ui`'s own dependency list stays exactly `@twt/contracts`.
- [ ] **Task 3 — Pagination + ordering + the anti-leaderboard invariant, written where it is read** (AC: 4)
  - [ ] ⭐ Flip the surface's `paginated` **`false` → `true`** (⛔ read it first), and update the
        `routes.ts` header **and** the `login-wall.spec.ts` allowlist entry to the control set that
        applies now the route is paginated and PII-bearing — ⛔ both stating the **same** count. ⚠ If
        11b.3a landed first, **extend** what it wrote; ⛔ never overwrite it.
  - [ ] Record the remembrance-not-analytics invariant in **three** places, as 11b.1 did
        (`sahyog.astro`, `lib/sahyog-render.ts`, the abuse-rules README) — the equivalent three here.
- [ ] **Task 4 — RTBF behaviour + the row key** (AC: 5)
- [ ] **Task 5 — Name the buildable column inventory; annotate the UX spec at `:1287-1298`** (AC: 6)
- [ ] **Task 6 — a11y family 13 (in its WEB form) + the real-`t()` assertion across both locales** (AC: 7)
  - [ ] ⛔ Resolve the ten refs through **`ref.namespace` (`contribution`)** — ⛔ never re-pointed at
        `sahyog-vivran`, ⛔ never copied into it. Only surface-minted copy uses `sahyog-vivran`.
- [ ] **Task 7 — Route what is not built; re-affirm what stays open** (AC: 8)

---

## ⚖️ Decisions — ⛔ **FOUR OPEN. D2 and D3 are THE PANEL'S and are BLOCKING.**

### ⛔ D2 — **PANEL, BLOCKING.** May `contributor_name` be declared at `public` on `sahyog-vivran`, and in what FORM?

⏳ **ALREADY ROUTED** — `trustee-panel-routing-note-2026-08-30-contributor-name-public-tier.md`, **Q1
(declaration)** · **Q2 (form)** · **Q3 (are basis and form independent?)**. ⛔ **Nothing ratified.**
⭐ The note's *"Story 11b.3 cannot start without one"* resolves, after the D6(b) split, to: **this
story cannot start**; 11b.3 and 11b.3a can.

### ⛔ D3 — **PANEL, BLOCKING.** Does `sahyog-vivran.deceased_member_name` get an allowlist entry, and in what form?

⭐ **A NEW FINDING of the 2026-09-01 authoring pass — ⛔ nothing had recorded it.** `matrix.ts:401-402`
says 11b.3/11b.6 *"keep first-name + last-initial"* and that *"moving them requires each surface's OWN
Panel ruling"* — ⚠ **but keeping a shielded form is not the same act as having an entry**, and the
gate is fail-closed regardless of form (Trap 2). ⇒ as things stand this surface ⛔ **cannot name the
deceased member at all**, beside a `/sahyog` that names them in **full**.

- **(a)** Route at **first-name + last-initial** — the form `matrix.ts` already reserves for this
  surface. ⭐ *Authoring recommendation: the smallest widening, and the one the file contemplates.*
- **(b)** Route at the **full name**, aligning with `/sahyog` D10. ⚠ D10 is **author-ruled and ⛔ NOT
  Panel-ratified**, and 11b.1's own exception rationale flags its comparative ground as ⛔ not to be
  cited for a third surface. ⇒ (b) builds on unratified ground **twice over**.
- **(c)** Ship the surface **un-named** and defer. ⚠ Legitimate and fail-closed — ⛔ but a **choice**,
  ⛔ never a default, and it must be recorded as such ([[feedback_closure_language_precision]]).

✅ **THE PACKET NOW EXISTS AND IS ROUTED (2026-09-02):**
`trustee-panel-routing-note-2026-09-02-11b3b-deceased-name-form.md`. ⛔ **Written, ⛔ not answered** —
D3 stays open and blocking ([[feedback_closure_language_precision]]).

⭐⭐ **AND THE PACKET SURFACED A THIRD QUESTION THAT CHANGES WHETHER (a) OR (b) IS EVEN BUILDABLE —
`Q3`, THE CLAUSE SCOPE.** Story 11b.9's shipped basis predicate
(`pool/public-read.ts:283-299`) pins the clause id **`niy.public-disclosure.member-information`**
(`:181-183`) — ⚠ a **GENERAL** disclosure clause carried under a constant *named*
`SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID`. **The constant's name is surface-scoped; the clause id is ⛔
not.** ⇒ whether a D3 "yes" is **buildable** depends on counsel's clause TEXT, which returned
**2026-09-07**:

| Counsel's clause drafted… | A D3 "yes" is… |
|---|---|
| **narrowly** (the Sahyog Drive index) | ⛔ **unbuildable** — the entry is ruled, the predicate stays false here, the page renders unnamed regardless |
| **generally** (the Trust's public transparency surfaces) | ✅ **live the moment it is pinned**, with ⛔ no further code |

⛔ **Do ⛔ not read a Q1 ruling alone as clearance to build.** ⚠ And ⛔ do ⛔ not "fix" a narrow clause
by pinning a second one, or by seeding a `clause_versions` row — `public-read.ts:171-175` forbids the
placeholder in terms: *"a stand-in makes names render on an authority that does ⛔ not exist."*

### ⛔ D9 — Does this story RESOLVE the public/member name inversion, or carry it? (Trap 3, AC8)

11b.3 ruled **D7(a) carry**, which makes this story the binder.
- **(a) Carry** — re-affirm, ⛔ do not re-file. ⭐ *Authoring recommendation: resolving it means
  changing the **member** app's form (`resolvePoolIdentity`), which is not this surface's act.*
- **(b) Resolve** — out of this story's natural diff, and it would change 8.6/8.7/8.8 behaviour.

### ⛔ D10 — What is the stable per-row key? (Trap 4, AC5)

⛔ Not `index` (the 8.3 defect). ⛔ Not `member_id` on a public wire (an enumeration primitive, refused
in terms by 11a.3's handler). ⚠ `rowKey` was **vacated** by 11b.2a's D5 and ships nowhere.

⚠⭐ **AND THE PRIOR QUESTION IS ASKED FIRST, BECAUSE THE OBVIOUS ANSWER MAY BE "NONE".** `keyExtractor`
is a **FlashList** concern. This surface is **Astro SSR** — it emits static HTML with ⛔ no list
virtualization, ⛔ no reconciler and ⛔ no re-render, so there is ⛔ **nothing for a row key to be
stable FOR**. ⇒ inventing one to satisfy the 8.3 deferral's wording would mint an identifier this
surface does not need, on the surface where a per-row identifier is most expensive.

- **(a)** ⭐⛔ **NO ROW KEY IS MINTED. The 8.3 deferral is RE-AFFIRMED OPEN and its re-trigger
  RE-POINTED** — Astro SSR is ⛔ not the scale case the deferral was waiting for, and the trigger moves
  to *"the first VIRTUALIZED render of a multi-pool contributor list"*. ⭐ *Authoring recommendation:
  it is the only option that adds nothing and states the truth.* ⚠ It must be recorded as a **ruling**,
  ⛔ never as the deferral quietly evaporating ([[feedback_closure_language_precision]]).
- **(b)** A per-render **opaque positional key** scoped to the page — ⛔ stable within a page, ⛔ not
  across pages; ⚠ and it does ⛔ not discharge the 8.3 mobile deferral either, so it buys the cost of
  (c) with the outcome of (a).
- **(c)** Mint a **stable non-identifying row token** on the wire — ⚠ reopens what 11b.2a's D5 vacated,
  and a per-row stable token on a public surface is an **enumeration primitive** unless it is
  per-render salted. ⛔ Not free, and ⛔ not needed by anything on this surface.

---

## Dev Notes

### Architecture constraints — ⛔ non-negotiable

- ⛔ **`@twt/ui` stays React-free**; its dependency list stays **exactly `@twt/contracts`**. That
  headlessness is what lets **one** presenter serve the RN bundle **and** an Astro surface without
  either dictating to the other ([[project_contracts_domain_bundle_boundary]]).
- ⛔ **`packages/contracts` must never import `@twt/domain`'s pg-touching namespaces** — it leaks `pg`
  into the RN Metro bundle.
- ⛔ **The auth boundary lives at the API** (`architecture.md:504-517`). ⛔ No `Astro.cookies` /
  `Astro.request.headers` / `Astro.session` on this surface; ⛔ no `isAuthenticated` prop on
  `<AuthenticatedFragment>` ([[project_no_browser_member_token_surface]]).
- ⚠ **Type-only → value import** materializes a module-init cycle that breaks **consuming** packages at
  runtime while typecheck/lint/local tests stay green ([[project_type_only_import_cycle_trap]]) —
  ⭐ **directly relevant**: this story adds a new cross-package import edge (`apps/public` → `@twt/ui`).

### Testing standards

- **Test through the pure render module**, ⛔ not the `.astro` file.
- ⭐ **Call `t()` for real, in both locales, for all ten refs** — namespace in the **third** slot, on
  the `apps/mobile/tests/unit/panchayat-noticeboard-render.test.ts:21,141` mount-free pattern. ⛔ Do
  ⛔ not assert *around* `t()` by reading locale JSON from disk: that is the 11a.2 defect shape, the
  ground *"no mount"* was found **false**, and this exact obligation already survived a **circular
  deferral** once.
- **Prove the allowlist gate with a planted violation** — add an unruled Tier-1-at-public field, watch
  it fail, revert, confirm green; record the revert-sanity
  ([[feedback_gate_scope_semantic_coverage]]).
- **Test the `unknown` arm reaches the `try/catch`** — ⚠ it has been **un-attested / unexercised**
  since 11b.2 precisely because no producer could reach it; ⭐ **this story's producer can**, so the
  arm stops being un-attested here ([[feedback_record_unattested_no_backfill]]).
- ⚠ **`ci:local`**: `integration-tests` concurrency `=1` is **LOAD-BEARING**
  ([[project_ci_local_concurrency_oversubscription]]).

### Previous-story intelligence (11b.2 / 11b.2a / 11b.2b)

- ⭐⭐ **The circular deferral** — 11b.2 and 11b.2b each routed the same `t()` obligation to the other;
  five single-story review passes let it through because the loop is only visible with both files
  open. ⇒ ⛔ **when routing to a sibling, name the sibling AND the artefact, and ⛔ never route to a
  story that routes back.**
- ⭐ **11b.2's presenter emits PARTS and never joins them** (D9(a)) — that is load-bearing for D2 being
  still open, and this story is where the join finally happens.
- ⭐ **11b.2a's D6(a) DELETED the anonymized presenter variant** — *"a render arm that never fires is
  dead code."* ⛔ Do not reintroduce one for RTBF; RTBF **omits the row**.
- ⚠ **11b.2b's second pass shipped a whole-surface crash in its own diagnostic**, and its `try/catch`
  *"didn't guard everything it claimed to."* ⇒ ⛔ verify the guard's **scope**, not its presence.
- ⚠ **Concurrent review agents mutate the tree** — re-check `git status` after parallel passes.

### Project Structure Notes

| Path | New / Update |
|---|---|
| `apps/public/package.json` | **UPDATE** — add `@twt/ui` (⭐ this story's act, ⛔ not 11b.3's) |
| `packages/contracts/public-pages/public-vs-private-matrix.yaml` | **UPDATE** — two fields + two exception blocks |
| `packages/contracts/src/public-pages/matrix.ts` | **UPDATE** — two allowlist entries, ⛔ nothing else |
| `apps/public/src/components/ContributorList.astro` (or similar) | **NEW** — the render layer |
| `apps/public/src/lib/sahyog-vivran-render.ts` | **UPDATE** — the row adapter + the name join |
| `packages/i18n/locales/{en,hi}/sahyog-vivran.json` | **UPDATE** — ⛔ surface-minted copy ONLY; the ten `contributor_list.*` keys stay in `contribution.json` |
| `packages/contracts/public-pages/public-vs-private-matrix.yaml` | **UPDATE** — also flips `paginated` `false` → `true` |
| `apps/api/src/modules/public-pages/routes.ts` | **UPDATE** — the header defence, now paginated + PII-bearing (D11) |
| `apps/api/tests/integration/login-wall.spec.ts` | **UPDATE** — the same control count as the header |
| `_bmad-output/planning-artifacts/ux-design-specification.md` | **UPDATE** — annotate `:1287-1298` (AC6) |
| `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-02-11b3b-deceased-name-form.md` | ✅ **WRITTEN 2026-09-02** — ⛔ the RULING it seeks is still open |
| ⛔ `packages/ui/` | ⛔ **NOT TOUCHED** — the presenter is consumed, ⛔ not changed |

### References

- [Source: `trustee-panel-routing-note-2026-08-30-contributor-name-public-tier.md` — §1 (the two separable questions) · §2 (the two entries, ⛔ neither a contributor) · §4 (the inference, offered ⛔ not ruled) · §5 (the asymmetry table) · §6 (the THREE assuming documents) · §9 (Q1/Q2/Q3) · §10 (the inversion)]
- [Source: `packages/contracts/src/public-pages/matrix.ts:174-199` (fail-closed both ways) · `:388-391` (*"the gate failing is the gate working"*) · `:392-404` (the two entries) · `:401-402` (the 11b.3/11b.6 fence)]
- [Source: `packages/contracts/public-pages/public-vs-private-matrix.yaml:60` (`pii_tier` is a FACT about the data)]
- [Source: `.decision-log.md#decision-2026-08-30-168` cl.4 (D7-nameform) · cl.6 (D9(a) — parts, never joined) · `#decision-2026-08-30-169` (RTBF omits entirely) · `#decision-2026-08-31-170` (the guarantee is on the plaintext; ⛔ no per-row re-check) · `#decision-2026-09-01-172` (RTBF ends at the wire)]
- [Source: `.decision-log.md#decision-2026-08-23-154` cl.6 (C-1 — the ordinary dependency addition) · `.decision-log.md:1734` (⛔ there was no declination)]
- [Source: `packages/ui/src/contribution-list/` · `packages/contracts/src/contributions/pool-contributor-list.ts:42-51` (built-to, ⛔ not ratified)]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` — 11b.2 items (i) (ii) (iii) · 11b.1 items (e) (f) · the `keyExtractor` re-trigger correction]
- [Source: `_bmad-output/implementation-artifacts/11b-3-…md` (the host surface, AC2's Tier-1 count test) · `11b-3a-…md` (the sibling; ⛔ different subject, same `.decision-log.md` head)]
- Memory: [[project_contribution_row_render_layer_substrate]] · [[project_epic9_confirmed_producer_is_live]] · [[project_no_browser_member_token_surface]] · [[project_11b_consent_model_c5_superseded]] · [[project_uset_fresh_closure_memo_trap]] · [[feedback_circular_deferral_between_sibling_stories]] · [[feedback_closure_language_precision]] · [[feedback_supersede_never_reinterpret]] · [[feedback_record_unattested_no_backfill]]

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
| 2026-09-02 | **The D3 packet is WRITTEN AND ROUTED** — `trustee-panel-routing-note-2026-09-02-11b3b-deceased-name-form.md`. ⛔ Task 0 stays a STOP gate: the packet is written, D3 is ⛔ not answered. ⭐ The packet surfaced a **third question (Q3, the CLAUSE SCOPE)**: 11b.9's basis predicate pins `niy.public-disclosure.member-information` — a **general** clause under a Sahyog-Drive-*named* constant — so whether a D3 "yes" is **buildable** turns on counsel's clause text (returned 2026-09-07), ⛔ not on the ruling alone. |
| 2026-09-01 | **Combined validation of 11b.3 / 11b.3a / 11b.3b.** Six fixes, the sharpest being AC7's namespace: all ten `CONTRIBUTION_LIST_I18N_REFS` resolve in **`contribution`**, ⛔ not `sahyog-vivran` — pointing them at this surface's namespace would have opened a **third** instance of the 11b.2↔11b.2b circular deferral wearing a green run. Also: this story flips `paginated` and makes the third route PII-bearing, so it now owes `routes.ts` + `login-wall.spec.ts` their update (11b.3's **D11**); **D10 gains option (a)** — Astro SSR needs no row key at all; AC6 now names the **buildable** columns; `resolvePublicMemberName`'s path corrected to `kyc/public-name.ts:73`. |
| 2026-09-01 | Story created by the D6(b) three-way split of Story 11b.3 (ruled by BigDev, 2026-09-01). ⭐ Carries **BOTH** named-identity questions — the contributor list (**D2**, Panel, routed 2026-08-30) and the deceased member's name (**D3**, a **new finding** of the authoring pass, ⛔ no packet yet). That pairing is what lets 11b.3 ship with **zero Tier-1 fields** and no Panel dependency. Task 0 is a **STOP gate**; stopping on a first pass is the expected outcome. |
