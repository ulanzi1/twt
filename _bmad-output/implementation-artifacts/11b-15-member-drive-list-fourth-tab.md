---
baseline_commit: c2dd787c
---

<!--
⭐ BASELINE ADVANCED 2026-09-09 (SECOND `validate` pass, same day). The prior pin `1b7fa9f3` was
⛔ NOT orphaned and needed no rescue — `git diff 1b7fa9f3..c2dd787c -- packages/ apps/` is EMPTY.
The three commits between them are `2ac7ca64`/`489b2913`/`cc4486f4` (THIS story's own first validate
pass + the `-211` decision + the STOP discharge) plus `c2dd787c` (a repo-wide orphaned-pin sweep that
touched 13 OTHER files and confirmed — ⛔ did not change — that `11b-15`'s own pin already resolved
from HEAD). ⇒ this advance is bookkeeping, not a rescue: it records that the pass below re-checked
every citation at the new HEAD rather than trusting the old pin's clean `--name-only` diff.

⭐ THIS pass re-verified: the AC3 13-field enumeration against `surface-fields.ts:401-428` (exact
match, order and all); `revealToMembers`'s reader count (still zero outside schema/policy/write/admin);
`resolvePoolIdentity`'s positional-`mode` signature (`pool-identity.ts:201-208`); the load-bearing
`member-name-form-parity.spec.ts` basis-seeding chain (`:212-243`); every routing note dated after
2026-09-07 and every decision after `-211` (none name this story); and Task 0's two open checkboxes
(the `epics.md` section, the sprint-row rewrite — confirmed still genuinely undone, not stale claims).
⛔ ZERO FINDINGS. ⛔ Zero rows move. ⛔ No code.

⭐ THE PRIOR (2026-09-09, first pass) BASELINE NOTE, kept for provenance: the pin `e578eb16` was
⛔ ORPHANED — it survived only on `story/11b-10-unguessable-address-and-inbound-path`; its main-line
twin was `4a763430` with a BYTE-IDENTICAL tree (`667443d5…`), so the CONTENT baseline was sound and
only the SHA was unreachable. 94 commits and 138 non-governance files had landed between that twin
and `1b7fa9f3`. That baseline carried decisions `2026-09-04-186` … `2026-09-08-210`; stories A · B ·
C · D all `done`; `8-16` `done`; `11b-16` `withdrawn`; and the public Sahyog index re-shaped by `-204`
· `-205` · `-206` · `-207`. ⛔ Every line number in this file was re-verified at that pin, and again
at this one.
-->

# Story 11b.15: The Member's Drive List — a **FOURTH TAB** Over Every Drive in Their Pariwar `[SURFACE]`

Status: done

> ⭐⛔ **⛔ NO `### Story 11b.15` SECTION EXISTS IN `epics.md`.** **Story E** of the six-story split
> (`2026-09-04-195` cl.3), following **Trustee-ratified** `-193` cl.2 and BigDev's `-194` cl.2 /
> `-196`. ⇒ owes an `epics.md` **SECTION** (Task 0), on the `8-16` precedent (`epics.md:3400`).
>
> ✅ **NO BLOCKERS REMAIN.** **B** (`11b-12`) is **`done`** — the shared stage copy is live and its
> key path is written into AC4 by name. **`8-16`** is **`done`** — `-208` cl.3's *"`8-16` before
> `11b-15`"* is **met**. ⭐ **Story F (`11b-17`, `ready-for-dev`) depends on this one.**
>
> ⭐⭐ **THIS IS A NEW SURFACE, ⛔ NOT A FILTER CHANGE.** `apps/mobile/app/(tabs)/` holds **three**
> tabs; ⛔ **no member-facing drive list exists** — `SahyogVivranEntry` is a single link on the My Pool
> card. ⇒ new tab, new route, new read, its own family-13 pass.

---

## ✅ PREFLIGHT — ✅ **ALL CLEAR. ⭐ THIS STORY IS STARTABLE.**

⭐ Five findings of the 2026-09-09 `validate` pass (three independent verifiers) reshaped this story.
⚠⛔ **⛔ KEPT AS THE RECORD, ⛔ not deleted** — they are why the scope reads as it does. ⛔ A later
reader must ⛔ not "restore" what any of them removed.

| | Found | Disposition |
|---|---|---|
| **F1** | Trap 1's premise (*"the member sees LESS NAME than the public"*) | ✅ **VOID** — `-209` cl.3. See Trap 1. |
| **F2** | *"⛔ no target"* contradicts a ratified routing-note ruling naming this story | ✅ **AC8b WRITTEN; the decision entry LANDED — `#decision-2026-09-09-211`.** |
| **F3** | AC3's `member ≥ public` floor grew by five public fields | ✅ **ENUMERATED** — AC3. |
| **F4** | AC3 ordered a comparison harness that already exists | ✅ **RE-POINTED** — AC3 / Task 6. |
| **F5** | Trap 2's *"the public tuple is `closed`+`settled`"* | ✅ **CORRECTED** — Trap 2. |

### ✅ STOP — **DISCHARGED 2026-09-09 by `#decision-2026-09-09-211`.**

⚠⛔ **⛔ KEPT AS THE RECORD, ⛔ not deleted.** The obligation in **AC8b** had been **ruled** on
2026-09-07 and then lived ⛔ ONLY in the routing note — `.decision-log.md` never recorded it, the
exact failure `-204`'s own Occasion block names (*"five days of Panel rulings lived ⛔ ONLY in a story
file and a sprint-status comment"*). ⭐ `-211` records it, and
[[feedback_governance_commits_precede_implementation]] is satisfied: the entry landed **before** any
code.

⚠ **ONE THING `-211` DECIDED THAT THE NOTE DID ⛔ NOT SAY — ⛔ read cl.2 before building AC8b.**
§13.3's *"on that same condition"* read literally means `reveal_to_public`; `-211` cl.2 reads the
**MEMBER** axis instead, and records why. ⛔ Do ⛔ not "correct" AC8b back to the public switch.

⭐ The story's own **Task 0 STOP** (governance first, ⛔ no code before the `governance:` commit) is
⛔ unaffected and still binds.

---

## Story

As a member of a Pariwar,
I want to see every drive my Pariwar has run — the one collecting now, the ones finished, and the ones
fully checked —
so that I can see what my contributions have added up to, in one place inside the app.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT** is introduced or changed. Stated
explicitly, ⛔ not omitted.

⭐ It **adds a read**. ⛔ No eligibility, ⛔ no assignment, ⛔ no obligation, ⛔ no amount owed is touched
— a member's own pool and what they owe come from the **existing** `active-contribution` path, which
this story ⛔ does ⛔ not modify.

⚠ **TWO VISIBILITY predicates ARE introduced, and neither gates a benefit** — ⭐ stated because a
reader will ask:

1. **Which drives appear** — `live` · `closed` · `settled`, ⛔ never `spawned` (Trap 2). ⭐ In the
   member's terms: *"you see every drive your Pariwar has actually collected for; a drive that has
   only just been approved is not shown to anyone yet."* ⭐ Checked against the Niyamavali: ⛔ no
   clause requires or forbids either; the ground is `-196` plus the disclosure argument in Trap 2.
2. **Whether the expected figure appears** — `revealToMembers` (AC8b). ⭐ In the member's terms:
   *"your Pariwar can choose to show you what a drive is expected to raise; until it does, no figure
   is shown to anyone."* ⭐ Checked: ⛔ no Niyamavali clause; the ground is `-190` cl.7(c), which
   reserves the act to a Superadmin, separately for member and for public.

⚠⛔ **AND THE RETIRED JUSTIFICATION IS ⛔ NOT AVAILABLE HERE EITHER** (`-209` cl.3). ⛔ Do ⛔ not write,
paraphrase, or offer a member *"the same name anyone can already see on the public page"* or *"until
now the app showed you less than the public page did"*. ⭐ Both were **false for every drive**, and
`8-16` was re-grounded away from them. This list inherits the re-grounded sentence, ⛔ not the old one.

## 🎯 What already EXISTS — ⭐ re-verified live 2026-09-09 at HEAD `c2dd787c`, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| **THREE** tabs; ⛔ no drive list | `apps/mobile/app/(tabs)/` — `index` · `shradhanjali` · `panchayat` (`_layout.tsx:39-59`) | ⭐ read |
| ⚠ Tab titles are **hardcoded English** in a bilingual app | `_layout.tsx:42,49,56` — `'My Pool'` · `'Shradhanjali'` · `'Panchayat'`; ⛔ the file imports ⛔ no `@twt/i18n` at all | ⭐ read |
| ⛔ **No member drive-list route** | `member-pool/routes.ts:46,57,68,87` — only `active-contribution`, `pool-contributors`, `contribution-history`, `contribution-note` | ⭐ read |
| ⭐ The **public** index renders the deceased's name in the Pariwar's **configured form — `full_name` is the DEFAULT** | `sahyog-drive.ts:125-126` (`2026-08-19-136` cl.1) — ⚠ **RE-ANCHORED**; `:94-96` is now the status enum | ⭐ read |
| ✅ The **member** path is **MODE-RESOLVED**, ⛔ NOT hard-coded | `packages/domain/src/notifications/pool-identity.ts:201-208` (`mode` is a positional INPUT) · `:227` `resolveMemberFacingDeceasedName(mode, fullName)`; My Pool sends ONE `deceasedDisplayName` (`active-contribution-card.ts:139`) | ⭐ read |
| ⛔⛔ The **public name gate is INERT** ⇒ `/sahyog` names **nobody** on any drive | `public-read.ts:261` is the ONLY site of `niy.public-disclosure.member-information`; `:855-858` — *"`false` FOR EVERY ROW IS THE EXPECTED DAY-ONE STATE … The surface is INERT"* | ⭐ read |
| ⚠⛔ **TWO CODE COMMENTS ARE STALE POST-`8-16` — ⛔ this story does ⛔ NOT fix them** | `sahyog-drive.ts:128` · `apps/api/src/modules/public-pages/handlers.ts:518-520` (both still say `resolvePoolIdentity` *"hard-codes"* the shielded form; both blame to `13f6af79b`, 2026-08-26). ⭐ The **fence** they express still holds (`sahyog-drive.spec.ts:558`); ⛔ their stated **reason** does not. ⇒ record in `deferred-work.md`; ⛔ do ⛔ not edit a public-surface file here (AC8) | ⭐ read |
| Long lists need virtualization on native | **UX-DR80** (`epics.md:509` — ⚠ shifted from `:504`, now UX-DR76) — *"Sahyog Drive archive … Native: FlatList tuning"*, **and** *"10k mobile / 50k desktop virtualization contracts on Sahyog List components"* | ⭐ read |
| ⚠ New-Arch **FlashList** (⭐ and `FlatList`) red-boxes crossing **empty → populated in place** | `components/contributor-list/PoolContributorList.tsx:226-228` (same epic) · `app/(helpdesk)/index.tsx:120` · [[project_fabric_flatlist_empty_populated_crash]] | ⭐ read |
| ⚠ A tamagui `<Button>` is `styled(View)`; `@tamagui/web` sets `accessible` **nowhere** | verified at the **installed** tamagui **2.1.0**: `@tamagui/button/dist/cjs/Button.native.js:53` is `styled(View)`; `grep -c accessible @tamagui/web/dist/cjs/createComponent.native.js` → **0** | ⭐ read |

## ⛔ THE FIVE TRAPS

### Trap 1 — ✅ **CLOSED BEFORE THIS STORY STARTED. ⛔ DO ⛔ NOT REBUILD ITS GUARD.**

⭐⭐ **The inversion this trap once warned of is dead twice over, and BOTH halves are verified at HEAD.**

**(i) THE PUBLIC SURFACE IS INERT.** `NAME_PUBLICATION_AUTHORISED` (`packages/domain/src/pool/public-read.ts:380-396`)
requires a `clause_versions` row for `niy.public-disclosure.member-information` pinned into an accepted
T&C version. ⛔ That clause id has **exactly ONE site in the whole repo — its own definition**
(`public-read.ts:261`); ⛔ no migration, ⛔ no seed, ⛔ no production writer pins it. ⇒ ⭐ `/sahyog`
shows ⛔ **NO** deceased name on ⛔ **ANY** drive.

**(ii) THE MEMBER PATH IS NO LONGER HARD-CODED.** `8-16` (**`done`**, `5aa31c39`) made all **FOUR**
consumers of `resolvePoolIdentity` mode-resolved from the same stored `public_name_presentation_mode`
the public side reads (`-181`). ⇒ the two forms can ⛔ **never diverge again BY CONSTRUCTION**.

⚠⛔ **THE RESIDUAL RISK IS THE OPPOSITE ONE, and it is `-209` cl.2's stated decision, ⛔ not a defect:**
on a Pariwar in the default `full_name` mode a member sees a **full legal name that ⛔ NOBODY can see
publicly**. ⛔ Do ⛔ not "correct" it, and ⛔ do ⛔ not repeat the retired justification — `-209` cl.3.

⭐ **WHAT SURVIVES:** the **structural** reason to keep the two surfaces aligned (`-209` cl.4) — the
moment the basis is provisioned the public rises to the configured form. ⇒ this list calls the
**same resolver**; it ⛔ never re-derives a name form (`8-16` AC2b: *"`resolvePoolIdentity` stays the
ONE join site"*).

### Trap 2 — ⛔ *"ALL PARIWAR DRIVES"* EXCLUDES `spawned`, AND THE GROUND IS ⛔ NOT TIDINESS

`-196`: the list reads **`live` · `closed` · `settled`** only.

⛔ A `spawned` pool follows an **APPROVED CLAIM**, before contributions open. ⇒ listing it would
disclose **a death and its claim approval to the whole Pariwar, earlier than any surface does today**.
⛔ A **disclosure change**, ⛔ not a filter widening.

⚠⛔ **AND THE PREDICATE IS ⛔ NOT THE PUBLIC ONE — EVEN THOUGH IT NOW READS THE SAME THREE WORDS.**
⭐ Story **D has landed**: `SAHYOG_DRIVE_VISIBLE_POOL_STATES` is already
`['live','closed','settled']` (`packages/domain/src/pool/public-read.ts:126`; amended 2026-09-07 by
`11b-14` AC1). ⇒ ⛔⛔ **that coincidence is a TRAP, ⛔ not a licence to import it.** The two tuples
agree *today* by accident of two separate rulings (`-189` cl.2(a) for the public, `-196` here); either
may move alone.

⇒ declare this surface's **OWN** named fragment with its own doc-block carrying the ground above —
`public-read.ts:283-284`'s standing rule: *"Exporting them is ⛔ NOT an invitation to widen them. A
consumer needing different semantics needs its OWN fragment with its own name, ⛔ never a parameter
bolted onto one of these."* ⭐ The precedent already exists at
`packages/domain/src/pool/sahyog-vivran-read.ts:124` (*"⛔⛔ DECLARED HERE EXPLICITLY, AND ⛔ NEVER
IMPORTED FROM `SAHYOG_DRIVE_VISIBLE_POOL_STATES`"*). ⛔ And do ⛔ **not** add the new fragment to that
constant's five-artefact fan-out list (`public-read.ts:119-125`).

⭐ **THE STAGE MAPPING IS ALREADY TOTAL — ⛔ do ⛔ not invent a second one.** `PUBLIC_STATUS_BY_POOL_STATE`
(`public-read.ts:169-173`) maps `live→'live'`, `closed→'closed'`, `settled→'verified'`, with the
totality-asserting accessor `publicStatusForPoolState` at `:180`. AC4's words must agree with it.
⭐ `POOL_LIFECYCLE_STATES` (`packages/domain/src/schema/pools.ts:78`) is exactly four values and the
machine is strictly linear — ⛔ there is ⛔ no cancelled/void state this three-state list silently drops.

### Trap 3 — ⚠ THE LIST STARTS EMPTY AND FILLS. THAT IS THE CRASH

New-Arch **FlashList** red-boxes crossing empty → populated in place
(`components/contributor-list/PoolContributorList.tsx:226-228`, in this epic) — ⭐ and *"loading,
then rows"* is this surface's **normal** path. ⚠ The same hazard is recorded for `FlatList`
(`app/(helpdesk)/index.tsx:120`), so the rule is ⛔ **primitive-independent**.

⇒ the **empty / loading / error** states render **OUTSIDE** the list component. ⛔ Never as a
`ListEmptyComponent` swapped in place.

⭐ **THE PRECEDENT — ⛔ do ⛔ not invent a third form.** Render shape:
`PoolContributorList.tsx:184-192` (loading, early `return`), `:194-203` (absence/error, early
`return`), `:236-251` (empty, a **SIBLING** of the list; the list mounts only in the `:252` `else`).
Test shape: `apps/mobile/tests/unit/helpdesk-screens-render.test.ts:77-82` — it slices the source
between the early-return and the list and asserts the list is ⛔ not in the empty branch.

### Trap 4 — ⚠⛔ THE TAB BAR IS HARDCODED ENGLISH, AND THE FOURTH TAB MUST CHOOSE

`_layout.tsx:42,49,56` carry `'My Pool'`, `'Shradhanjali'`, `'Panchayat'` as **literals**, ⛔ not
`t()`-resolved, in a bilingual app (⭐ re-verified: the file imports ⛔ no `@twt/i18n`).
⛔ **PRE-EXISTING** and ⛔ **not this story's to fix unasked.**

⚠ But the fourth tab must either add a **fourth untranslated title** or be **the one translated title
among four**. ⭐ Choose deliberately and record it; ⛔ do ⛔ not inherit the pattern silently.

### Trap 5 — ⛔ *"MORE THAN THE PUBLIC"* IS A **FLOOR**, ⛔ NOT A LICENCE

`-189` cl.3 sets a minimum. ⛔ It does ⛔ **not** authorise showing a member anything the Panel has
⛔ not ruled public **or** member-visible. ⚠ And its scope is bounded — `-195` cl.1 scopes cl.3 to the
**drive data class** and the six 11b split stories; ⛔ it is ⛔ not a universal invariant.

⛔ In particular: ⛔ **no banking coordinates on this LIST** — `-190` cl.3's *"complete banking
information"* is a **per-drive** view and is **story F**. ⛔ And ⛔ no contributor names, ⛔ no
per-member amounts, ⛔ no `spawned` rows.

⚠⛔ **BUT THE TARGET IS ⛔ NO LONGER "HIDDEN BY C" — ⛔ THAT SENTENCE IS RETIRED.** `-204` cl.2
superseded `-190` cl.7(a) (⛔ there is **no setter**; लक्ष्य is derived), cl.7(b)/(c) **STAND**
(`-204` cl.3), and story **D** shipped `revealToPublic`'s first consumer (`-204` cl.4). ⇒ see
**AC8b** — the member arm of cl.7(c) is **this story's**, and it is the first consumer it has ever had.

---

## Acceptance Criteria

### AC0 — Governance first
Task 0 writes the `epics.md` **section** (⭐ a **new member surface**), flips the sprint row, **lands
the AC8b decision entry** (Preflight STOP), and commits under `governance:` before any code.

### AC1 — A FOURTH TAB exists
Joins `index` · `shradhanjali` · `panchayat` — ⭐ a **peer of My Pool**, ⛔ not a route buried inside it
(`-194` cl.2). **And** Trap 4's title decision is made and recorded.

⚠⛔ **AND IT SUPERSEDES A RECORDED REJECTION — ⛔ name it, ⛔ do not overwrite it.** Story **10.15**
(**`done`**) records, in its load-bearing-decisions table (`10-15-survey-poll.md:134`), the rejected
alternative *"A dedicated 4th bottom tab → the tab bar is at three and the UX spec does not add one.
Enter from Panchayat."* ⇒ **`-194` cl.2 is the ruling that changes that**, and 10.15's ground is
**negative evidence only** — `ux-design-specification.md` fixes ⛔ no tab count (its single "tab bar"
mention, `:481`, is unrelated). ⭐ Task 4 records this supersession **by name** in the `_layout.tsx`
doc-block, so the next author does ⛔ not read 10.15 and revert the tab
([[feedback_supersede_never_reinterpret]]).

### AC2 — It lists EVERY drive in the member's Pariwar, in the three visible states
`live` · `closed` · `settled` (`-196`). **And** ⛔ `spawned` is **excluded**, with Trap 2's ground in
the code. **And** the predicate is this surface's **OWN named fragment** — ⛔ never the public tuple,
⛔ even though the two now read identically (Trap 2). **And** it is scoped to the member's **own
Pariwar** by the session scope, ⛔ never by a client-supplied id (family 12).

### AC3 — `member ≥ public`, field by field — per **D1**
For every drive the public index shows, this list shows **at least as much**, ⛔ never less.

⭐⭐ **THE FLOOR IS ENUMERATED AGAINST THE INDEX AS IT STANDS, ⛔ not as it stood at authoring.**
`SAHYOG_DRIVE_ROW_FIELD_IDS` (`apps/public/src/lib/surface-fields.ts:401-428`) is the list —
**13 field ids** (⚠ `driveLinkA11yLabel` maps to `null`: an a11y annotation, ⛔ not a field):

`deceased_member_name` · `pool_letter_code` · `pool_canonical_identifier` · `drive_href` ·
`drive_status` · `drive_closed_at` · `district` · `confirmed_contribution_count` ·
`close_of_cycle_framing` · `drive_progress_percentage` · `drive_participation_line` ·
`drive_target` · `nominee_account_holder_name` · `drive_index_line`

⚠⛔ **FIVE OF THOSE DID ⛔ NOT EXIST AT AUTHORING** — story D added them: the meter's three governed
values (`drive_progress_percentage`, `drive_participation_line`, `drive_target`; all `pii_tier: 3`),
`drive_index_line`, and ⛔⛔ **the nominee's FULL name** (`nominee_account_holder_name`,
`pii_tier: 1`, **Trustee-ratified `2026-09-07-205` cl.1**, with its own
`RULED_TIER1_PUBLIC_EXCEPTIONS` pair). ⭐ A nominee's **name** is ⛔ not a banking coordinate — Trap 5's
exclusion does ⛔ **not** reach it, and cl.3 makes it a floor.

⚠ **AND ONE OF THEM IS NULLABLE BY RULING:** `-207` cl.1 — `drive_progress_percentage` **leaves the
wire** on `closed` and `settled` rows. ⇒ the comparison must treat a public `null` as *"nothing to
match"*, ⛔ not as a missing member field.

**And** the comparison **enumerates all thirteen ids and fails on any the member read omits** —
⛔ never a hand-listed subset, which is how `-188` survived.

⛔⛔ **AND THE TEST MUST SEED THE PUBLICATION BASIS, OR IT PROVES NOTHING.** Because the basis is inert
(Trap 1), the public read returns `deceased_member_name: null` on **every** un-seeded drive and
`member ⊇ public` degenerates to a null-check. ⭐ Seed the REAL chain —
`terms_and_conditions_versions` → `clause_versions` (on `poolDomain.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID`)
→ `terms_and_conditions_pinned_clauses` → `consent_records` (`tc_acceptance`). ⛔ A fixture touching
`sahyog_drive_publication` proves nothing (`-160` cl.5 de-authorised it; read-never).

### AC4 — The three stages use story B's vocabulary, from story B's shared source
**Live** · **Closed** · **Verified**, ⛔ no second definition (B's AC4), and agreeing with
`PUBLIC_STATUS_BY_POOL_STATE` (Trap 2). **And** the info affordance is present, as a **real focusable
control** with a **tap** handler and an accessible name — ⛔ never hover-only.

> ⭐⭐ **THIS SURFACE — AND ITS AFFORDANCE — IS ⛔ NOT BUILT BY B. IT IS BUILT HERE.**
> ⚠⛔ B (`11b-12`) shipped the **SOURCE ONLY**: the shared keyed stage set in `packages/i18n`, plus a
> test that it is the only definition. ⛔ B renders **NOTHING** in `apps/mobile`, ⛔ by ruling —
> `driveStatus` appears ⛔ nowhere in **`apps/mobile`** today (⭐ it *is* live in `apps/public`:
> `src/lib/sahyog-vivran.server.ts:197-199`, `surface-fields.ts:274`), and `SahyogVivranEntry.tsx` is
> a link-out card with ⛔ no stage. ⇒ **the fourth tab this story creates is the FIRST place in the
> app where a stage exists at all**, so the render **and** the *"i"* control are ⭐ **this story's
> Task 4**, ⛔ not inherited work.
>
> ✅⭐⭐ **B HAS SHIPPED — key path re-verified key-by-key, both locales, 2026-09-09:**
>
> | What | Key |
> |---|---|
> | namespace | ⭐ **`sahyog-shared`** (`packages/i18n/locales/{en,hi}/sahyog-shared.json`) |
> | the three stage NAMES | `stage.live` · `stage.closed` · `stage.verified` |
> | their explanations | `stage.live.help` · `stage.closed.help` · `stage.verified.help` |
> | the affordance's visible label | `stage.explainer.summary` |
> | the affordance's ACCESSIBLE NAME | `stage.explainer.a11y` |
>
> ⚠ **THE TABLE ABOVE IS THE STAGE SUBSET, ⛔ NOT THE FILE.** The namespace has since grown
> (`live_line`, `zero_line.*`, `drive_target`, `index_line.*` — Trustee-ratified 2026-09-05/-07). ⭐ A
> dev who opens it will find twelve-plus keys where this table promises eight; ⛔ that is expected.
>
> ⭐ **THE CALL SHAPE, VERIFIED AGAINST THE LIVE SIGNATURE** (`packages/i18n/src/resolver.ts:53` —
> `t(key, params?, options?)`; `namespace` is inside the **THIRD** argument): in a **mobile
> component** use the locale-bound `useT()` (`packages/i18n/src/react.ts:57-59`) with
> `const NS = { namespace: 'sahyog-shared' } as const`, then `t(key, undefined, NS)` — the shipped
> mobile shape at `SahyogVivranEntry.tsx:79,127`. ⛔ Do ⛔ not hand-thread `locale` in a component; the
> raw `t(key, undefined, { locale, namespace })` form is for **non-React** callers
> (`[driveToken].astro:116`) and tests. ⚠ **EXPLICIT NAMESPACE ON EVERY CALL** — `t()` defaults to
> `common` (`resolver.ts:55`) and **THROWS** on a miss (`:58-64`).
>
> ⭐ `packages/i18n` is already a mobile dep (`apps/mobile/package.json:34`), the namespace is
> registered in `catalog.ts` (`:42,58,68,69,73` — all five edits), and
> `apps/mobile/tests/unit/sahyog-stage-copy-resolves.test.ts` (shipped by B) already proves all eight
> keys resolve **from this app** in both locales. ⇒ ⛔ there is ⛔ nothing left to wire.
>
> ⚠ The tamagui `accessible={true}` requirement (the 11b.10 review finding) is **this story's** —
> B recorded it and ⛔ did ⛔ not discharge it.
>
> ⛔⛔ **AND ⛔ DO ⛔ NOT MINT A SECOND KEY SET.** ⭐ There is a **LIVE ASSERTION** aimed at you:
> `sahyog-stage-copy-resolves.test.ts:66-73` — *"⭐ story E consumes THESE keys, by name — ⛔ it may
> ⛔ not mint its own"*. Two sources is exactly how *"Active"* came to mean two different things;
> `-193` cl.3 exists to close it.
>
> ⚠ Recorded from **both sides** deliberately. B's Task 5 wrote the key path into this AC by name.
> ⭐ B and E each read as though the other renders the stage; ⛔ no per-story pass can see that loop
> ([[feedback_circular_deferral_between_sibling_stories]]).

### AC5 — Family 13, in full
It is a new `[SURFACE]`. ⭐ Every row affordance is announced: a container carrying
`accessibilityLabel` is explicitly `accessible={true}` (⚠ tamagui `<Button>` is `styled(View)` and
supplies it **nowhere** — verified at the installed **2.1.0**); a role implying interaction has a
**real handler**; and every state the ACs ratify as reachable is **ANNOUNCED**, ⛔ not merely
reflected in a prop.

⭐ **THE PRECEDENT TO COPY IS ALREADY IN THIS EPIC — ⛔ do ⛔ not re-derive the reasoning, cite it:**
`components/sahyog-vivran/SahyogVivranEntry.tsx:108-128` — a tamagui `<Button>` with
`accessible={true}` (`:123`) + `accessibilityRole` (`:126`) + `accessibilityLabel` (`:127`) +
`accessibilityHint` (`:128`), mechanism spelled out at `:113-122`. For a **non-pressable labelled
container**: `contributor-list/PoolContributorList.tsx:246` or `panchayat/PinnedItem.tsx:107`.

### AC6 — Empty, loading and error render OUTSIDE the list
Per Trap 3, following `PoolContributorList.tsx:184-203,236-251`. **And** a test drives **empty →
populated** and asserts ⛔ no crash, on the shape of `helpdesk-screens-render.test.ts:77-82` — ⭐ the
regression this AC exists to prevent has a name in this repo.

> ⚠⛔ **[Review][Decision] EXTENDED 2026-09-09, code review SECOND pass — a FOURTH, ACCEPTED
> combined state: populated list + an inline background-refetch-error banner, simultaneously.** The
> three states above stay MUTUALLY EXCLUSIVE for a member's FIRST read of a page (loading → either
> empty or the populated list, or the full-screen error if nothing ever loaded). ⭐ What's new: once
> the list is populated, a LATER failed background attempt to get more data (a manual retry, or
> `fetchNextPage` scrolling for the next page) shows an inline banner ABOVE the still-showing,
> already-loaded list, rather than replacing it with the full-screen error state. ⛔ This is a
> refresh-failure OVERLAY on the populated state, ⛔ not a fifth primary state and ⛔ not a violation
> of "three DISTINCT states" — the member is never shown something FALSE (the list stays what it
> genuinely is), which is the invariant this AC actually protects.

### AC7 — It is virtualized, and the read is paginated
UX-DR80 (`epics.md:509`), whose *"10k mobile / 50k desktop virtualization contracts on **Sahyog List
components**"* clause routes this surface to **`@shopify/flash-list`** (`apps/mobile/package.json:25`),
⛔ **not `FlatList`** — the repo's recorded threshold split (`YogdaanBahi.tsx:23`: *"FlashList is Epic
11b's 10k Sahyog case, NOT this surface"*; `PoolContributorList.tsx:26-28`). ⚠ Copy
`PoolContributorList.tsx`'s `FlashList as any` React-19 / new-arch cast **and its warning** (`:257-262`:
the cast hides unknown props — a removed `estimatedItemSize` survived there).

**And** the read is **paginated** — ⛔ a Pariwar's whole history is ⛔ not one response.
⚠⛔ **⛔ THERE IS NO MEMBER-SIDE PRECEDENT:** ⛔ none of the four `member-pool` routes takes a
user-controlled limit (`contribution/read.ts:154,325`, which say so explicitly). ⇒ copy the **public
Sahyog Drive** shape (⭐ the same surface AC3 compares against): `page` + `limit` on the query contract
(`contracts/src/public-pages/sahyog-drive.ts:380-381`, echoed at `:415-416`) and
`.limit(clampLimit(...)).offset(...)` in the domain (`pool/public-read.ts:1053-1058`, options at
`:883-886`).
⛔⛔ **`clampLimit` (`packages/domain/src/pagination.ts:34`, exported from `domain/src/index.ts:30`) is
MANDATORY** — the `domain-accessor-invariants` CI gate fails any dynamic `.limit()` without it, and
`Math.min(limit, cap)` does ⛔ **not** satisfy it (`pagination.ts:11`).
See [[project_domain_limit_clamp_and_savepoint_retry]].

### AC8 — ⛔ Nothing else moves
⛔ No banking coordinates (**F**) · ⛔ no contributor names · ⛔ no per-member amounts · ⛔ no `spawned`
· ⛔ no change to `active-contribution` or anything a member owes · ⛔ no public surface touched
(⛔ including the two stale comments — record them, ⛔ do not edit them).

### AC8b — ⭐⭐ THE EXPECTED FIGURE (लक्ष्य) RENDERS TO MEMBERS, ⛔ ON THE PARIWAR'S SWITCH ONLY
✅ **UNBLOCKED — `#decision-2026-09-09-211` (author-committed, 2026-09-09).**

⚠⛔ **⛔ READ `-211` cl.2 FIRST.** It is the clause that chose the **member** axis over the routing
note's literal *"same condition"*, on three recorded grounds — cl.7(c) authorises the axes
**separately**; the DB CHECK makes public-on imply member-on so `-189` cl.3 holds either way; and
reading the public axis would ship an **inert** member switch. ⛔ Do ⛔ not reverse it silently.

⭐ **THE UNDERLYING AUTHORITY:** routing note `trustee-panel-routing-note-2026-09-07-11b14-drive-target-reveal-and-the-unwritten-headline.md`
**§12.3(A)(1)** — *"If the public sees the expected figure, **story E (`11b-15`) must show it to
members too** — ⛔ it currently says 'no target'. ⭐ Recorded as a change we will make, ⛔ not a
question"* — and **§13.3** (the Panel's answer, DR+KB 2026-09-07) — *"story **E** must show the figure
to members **on that same condition** — ⛔ not unconditionally."*
⚠ **Read §13 END TO END; the note's own header LAGS its body** and still says the render is forbidden
([[feedback_story_summary_can_lag_its_routing_note]]).

⭐ **THE CONDITION:** `resolveDriveTargetVisibility(db, pariwarId)`
(`packages/domain/src/pool/drive-target-policy.ts:233`) → `{ revealToMembers, revealToPublic }`.
This list reads **`revealToMembers`**. ⛔ An absent row is **HIDDEN FROM EVERYONE** — fail-closed by
ruling (`:227-231`, cl.7(b)) ⇒ ⛔ **nothing renders at launch, for any Pariwar**, and ⛔ that is correct.

⭐ **WHY `revealToMembers` AND ⛔ NOT `revealToPublic`:** cl.7(c) reserves the act *"separately for
member and for public"*, and the DB enforces the one-way order —
`NOT (reveal_to_public AND NOT reveal_to_members)` is a **CHECK constraint**
(`packages/domain/src/schema/pariwar_drive_target_visibility.ts:96`; mirrored at
`pool/drive-target.ts:135`, and in the admin form at `RevealSwitchesForm.tsx:105`). ⇒ public-on
implies member-on, so reading the member axis satisfies `-189` cl.3 in **both** directions.

⛔⛔ **AND IT NEEDS ITS OWN RESOLVER.** `resolveDriveTargetForPublic` (`public-read.ts:652`) is named
for its axis and takes `{ revealToPublic }`; ⛔ there is **no member analogue**. ⛔ Do ⛔ not bolt a
parameter onto it — Trap 2's rule. ⇒ add `resolveDriveTargetForMembers` beside it.

⭐ **THE FORM** (`-206` cl.3, `-204`): always short-form at and above ₹1,00,000 (*"₹50 lakh"*, ⛔ never
*"₹50.00 lakh"*); **exact below ₹1 lakh**; crore joins at ₹99.99 lakh. ⚠ The ₹10-lakh cut-off is the
*contributed* amount's rule and does ⛔ **not** apply to the target.

⚠⛔ **THIS IS THE FIRST CONSUMER `-190` cl.7(c)'s MEMBER ARM HAS EVER HAD.** `grep revealToMembers`
across `packages/domain/src`, `apps/api/src`, `apps/mobile`, `apps/public/src` returns ⛔ **zero read
paths** — only the schema, the policy return, the write handler and the admin form. Story D
(`11b-14:1065-1067`) recorded that as an open finding against this story **by line number**.

### AC9 — The friction budget is DISPOSED, ⛔ not skipped
**Given** [[project_friction_budget_baseline_ratchet]] — AC-4 diffs **COMMITTED** history, and
`git push` runs full `ci:local` via the pre-push hook
**Then** this story records its friction-budget disposition **explicitly**, as 11b.1 / 11b.10 /
11b.11 / 11b.12 each did
**And** ⚠ the disposition is written **after** the implementation commits exist — ⛔ a declaration
written against an empty diff passes **vacuously**.

---

## ⚖️ Decisions

### ✅ D1 — **RULED by BigDev, 2026-09-04 (`-197`), and ⭐ FULLY DISCHARGED IN CODE by `8-16`, 2026-09-08.** What NAME FORM does the member's list show?

> ⭐⭐ **THE RULING** (`#decision-2026-09-04-197`): this list shows the Pariwar's **configured** name
> form. ⭐ **And BigDev went further:** *"My Pool also adopt the same configured presentation mode so
> the member experience is consistent across member surfaces."*
>
> ✅⭐⭐ **THAT HALF HAS SHIPPED — ⛔ THERE IS ⛔ NOTHING LEFT TO SEQUENCE.** `8-16`
> (**`done`**; feat `5aa31c39`, review `1b7fa9f3`) made **ALL FOUR** consumers of
> `resolvePoolIdentity` mode-resolved, at the **wider** scope `-180` (Trustee-ratified) ruled:
>
> | # | Consumer | file:line |
> |---|---|---|
> | ① | My Pool card | `apps/api/src/modules/member-pool/handlers.ts:636` |
> | ② | Yogdaan Bahi (contribution-history) | `handlers.ts:847` |
> | ③ | Contribution Note PDF | `member-pool/contribution-note.ts:153` |
> | ④ | ⛔ **OUTBOUND PUSH** | `apps/jobs/src/scheduler/contribution-notify-triggers.ts:725` |
>
> ⭐ All three route through the wrapper at `member-pool/pool-identity.ts:98`. ⚠ **The shape moved:**
> `ResolvedPoolIdentity` shed the `deceasedFirstName` / `deceasedLastInitial` **pair** for ONE
> `deceasedDisplayName: string` (`packages/domain/src/notifications/pool-identity.ts:98`;
> `active-contribution-card.ts:139`). ⛔ **Those two field names ⛔ no longer exist in any source
> file** — ⛔ do ⛔ not search for them.
>
> ✅ **Task 1b is CLOSED IN CODE, ⛔ not merely ruled.** `-198` cl.1 (**FORM ONLY** — the member name
> takes the configured FORM and ⛔ NOT the publication BASIS gate) is live at
> `pool-identity.ts:63-66`. ⇒ a member sees a name **always**.
>
> ⚠⛔ **⛔ "STORY G" IS GONE.** `11b-16` is **`withdrawn`** (`-208` cl.1, `-210` cl.1). ⭐ Read every
> *"story G"* in this story's history as **`8-16`**. ⚠ `-198`'s **follow-up (i)** (the push
> carve-out) is ⛔ **VOID**, ⛔ not superseded (`-208` cl.2); follow-up (ii) **DISSOLVED**.

⇒ ✅ **D1 IS FULLY DISCHARGED AND AC3 IS UNBLOCKED.** ⛔ Nothing about D1 remains open, and ⛔ nothing
about it is this story's to sequence. ⭐ Build this list's name field on the **same resolver** and the
same once-per-request `kyc.resolvePublicNamePresentationMode(db, pariwarId)` read — ⛔ never a
re-derivation (`8-16` AC2b: *"`resolvePoolIdentity` stays the ONE join site"*).

---

## ⚠ What this story does ⛔ NOT do

⛔ No banking coordinates on the list — `-190` cl.3 is a **per-drive** view, ⭐ **story F** (`11b-17`).
⚠ ⭐ The nominee's **NAME** is ⛔ **not** a banking coordinate and **IS** in scope (AC3 — it is on the
public index, Trustee-ratified `-205` cl.1).
⛔ No change to **My Pool**, `active-contribution`, or anything a member owes (⭐ `8-16` already did
the name-form work; ⛔ this story does ⛔ not revisit it).
⛔ No public surface, ⛔ no `spawned`, ⛔ no contributor names, ⛔ no stage word invented here
(**B** owns them), ⛔ no tab-title i18n sweep (Trap 4), ⛔ no edit to the two stale code comments.
⚠ ⭐ **The TARGET is ⛔ no longer excluded** — see **AC8b**.

---

## Tasks / Subtasks

- [x] **Task 0 — GOVERNANCE FIRST** (AC0) — ⛔ one `governance:` commit, ⛔ no code.
  - [x] Write the **`### Story 11b.15`** section in `epics.md`, on the `8-16` precedent
        (`epics.md:3400`). ⚠ The key is ⛔ already named at `:3410` (`8-16` sequencing), `:5189` (the
        corrected six-story range) and `:5213` (11b.12's annotation assigning the member-app render
        here) — ⇒ this owes the **section**, ⛔ not a first mention.
        ✅ **WRITTEN** at `epics.md:5439-5518`, at the END of Epic 11b's story list (after 11b.9,
        before `## Epic 12`) — the 8.16 placement. ⭐ It records **why a SECTION and ⛔ not an
        annotation**: A–D each annotated Story 11b.3 because each **amended** the public Sahyog
        surface that story owns; ⛔ E amends nothing there. ⚠ Every decision anchor in it was
        resolved against `.decision-log.md` before commit — ⭐ `-207` is **`2026-09-08-207`**, ⛔ not
        `-09-07`, and the two anchors written that way were corrected.
  - [x] ✅ **THE PREFLIGHT STOP — DISCHARGED.** `#decision-2026-09-09-211` landed 2026-09-09
        (commit `489b2913`), ⛔ before any code. ⚠ ⛔ Read its **cl.2** before building AC8b.
        ✅ **READ END TO END before this commit** — cl.2 (the member axis, on three grounds), cl.3
        (fail-closed ⇒ ⛔ nothing renders at launch), cl.4 (⛔ its OWN resolver), cl.5 (`-206` cl.3's
        number form), cl.6 (Pool-Reality #2 travels with the switch).
  - [x] Flip the sprint row **and rewrite its comment block** — `sprint-status.yaml:17173-17193` is
        stale three ways (*"BLOCKED ON B"*, *"Task 1b is BLOCKING BOTH"*, *"⇒ STORY G"*).
        ⚠⛔ **THE ROW IS FLIPPED (`ready-for-dev` → `in-progress`). THE REWRITE WAS ⛔ NOT MADE,
        BECAUSE IT WAS ⛔ ALREADY DISCHARGED — ⛔ recorded, ⛔ not claimed as an edit**
        ([[feedback_closure_language_precision]]). ⭐ Checked live: ⛔ **none** of the three named
        phrases is in this story's row block — the 2026-09-09 `validate` rewrite already removed
        them (the block now reads *"BOTH BLOCKERS ARE GONE"*). ⚠ The cited line range
        `:17173-17193` is itself stale and now points into **`11b-11`**'s block; this story's block
        is `:17278-17329`. ⚠ The three phrases **do** survive at `:2034`/`:2041` — ⛔ those are
        HISTORICAL `last_updated` ledger rows and are ⛔ **not** rewritten
        ([[project_sprint_status_ledger]]: the ledger is a reverse-chron RECORD; ⛔ editing it would
        be a backfill, [[feedback_record_unattested_no_backfill]]).
  - [x] ⭐ **TRAP 4 / AC1 — THE TAB-TITLE DECISION IS MADE AND RECORDED** (BigDev, 2026-09-09).
        **`t()`-RESOLVED**, label **Sahyog Drives / सहयोग अभियान** ⇒ the fourth tab is **the one
        translated title among four**. ⭐ Ground: ⛔ new member-facing copy is ⛔ never minted
        untranslated in a bilingual app; the three existing literals are **pre-existing debt**,
        ⛔ **not swept here** (Trap 4). ⚠ Checked first: the repo's i18n CI gate
        (`i18n:check-parity`, `ci.yml:223`) is an **en/hi key-parity** gate and would ⛔ **not** have
        caught a hardcoded title — ⇒ this was a genuine choice, ⛔ not a gate-forced one.
- [x] **Task 1 — RULE D1** — ✅ **RULED 2026-09-04** (`-197`) and ✅ **SHIPPED by `8-16`** 2026-09-08.
- [x] **Task 1b — RULE THE BASIS-GATE SUB-QUESTION** — ✅ **RULED `-198` cl.1: FORM ONLY**, and live
      in code at `packages/domain/src/notifications/pool-identity.ts:63-66`.
- [x] **Task 2 — The read** (AC2, AC3, AC7, AC8b) — a member-scoped, **paginated** list over
      `live`+`closed`+`settled`, as this surface's **own** fragment; ⛔ scope from the session, ⛔ never
      a client-supplied Pariwar id; ⛔ every dynamic `.limit()` through `clampLimit`. ⭐ Add
      `resolveDriveTargetForMembers` beside `resolveDriveTargetForPublic`.
      ✅ `packages/domain/src/pool/member-drive-list.ts`. ⭐ `MEMBER_DRIVE_LIST_VISIBLE_POOL_STATES`
      is DECLARED there and ⛔ never imported from the public tuple (Trap 2), with the `spawned`
      disclosure ground in its doc-block — ⚠ reworded CATEGORY-AGNOSTICALLY after
      `pool-support-category-invariant` caught it (that gate scans COMMENTS). ⭐ The STAGE MAPPING is
      REUSED via `publicStatusForPoolState` — Trap 2 forbids a second mapping and AC4 requires
      agreement. ⭐ `resolveDriveTargetForMembers` sits BESIDE its public sibling in `public-read.ts`
      per `-211` cl.4. ⛔ `domain-invariants` green (`clampLimit`).
      ⚠⛔ **ONE DELIBERATE DIVERGENCE, RECORDED IN THE HEADER:** the claim/KYC joins are **SET-BASED**,
      ⛔ not the Yogdaan Bahi's per-pool `resolvePoolIdentity` memo — that shape costs 2 point reads
      per pool and would be a 100-round-trip N+1 on a 50-row page (11b.1 **D7(a)**, AR-65). ⭐ `8-16`
      **AC2b** forbids RE-DERIVING A NAME FORM, and that is honoured exactly: the form is decided by
      `resolveMemberFacingDeceasedName`, the ⛔ one site `resolvePoolIdentity` itself decides it.
- [x] **Task 3 — The route + contract** (AC2, AC3) — a new `/api/v1/member/…` route beside the four
      existing member-pool routes (`routes.ts:46,57,68,87`). ⚠ Its field set is the AC3 floor.
      ✅ `GET /api/v1/member/drive-list` + `MemberDriveListEntry/Query/Response` (`.strict()`).
      ⭐ Scope from the SESSION — there is ⛔ **no `pariwarId` parameter**, so family 12 holds by
      construction. ⭐ TWO independent page bounds: the schema `.max()` (what Story 1.14's
      forced-pagination guard SEES on the live swagger doc) and `clampLimit` (what bounds the SQL).
      ⭐ `openapi/v1.yaml` **RE-EMITTED**, ⛔ never hand-edited; determinism check green.
      ⚠⛔ **DELIBERATELY ⛔ NOT FAIL-SOFT AT THE ROUTE LEVEL — the ⛔ only read in this module that
      isn't.** AC6 ratifies empty · loading · error as three DISTINCT states; degrading to `items: []`
      would make the error branch **unreachable by construction** and would tell a member their
      Pariwar has run no drives when the truth is that we could not load them. ⇒ a failure in the
      list/count queries, the presentation-mode read, or the transaction itself propagates and 5xxs.
      ⚠⛔ **[Review][Decision] RESOLVED 2026-09-09, code review — THE EXCEPTION IS NAMED, ⛔ NOT LEFT
      IMPLICIT.** A single KYC field's decrypt (the deceased name, the nominee name) is caught
      INDIVIDUALLY and downgraded to `null` for that ONE field, with a warn log — the row SURVIVES.
      This is the deliberate, NARROWER fail-soft exception to the rule above, ⛔ not a contradiction of
      it: an external system's transient fault (self-heals on retry, carries no Panel-ruled-sensitive
      information) is categorically different from a structural domain fault, and dropping the whole
      page over one bad ciphertext envelope would take working rows down with a broken one.
- [x] **Task 4 — The tab** (AC1, AC4, AC5) — the fourth `Tabs.Screen`; Trap 4's title decision;
      ⭐ the 10.15 supersession recorded by name in the `_layout.tsx` doc-block; B's shared stage copy
      via bound `useT()` + `NS`; the info affordance; ⭐ `accessible={true}` on every labelled
      container.
      ✅ All five. ⭐ Title **`t()`-RESOLVED** (Trap 4 ruled): *Sahyog Drives / सहयोग अभियान*.
      ⭐ 10.15's rejection quoted BY NAME in the doc-block, with its ground verified to be **negative
      evidence only**. ⭐ Stage words + the *"i"* affordance read `sahyog-shared` by name via bound
      `useT()`; ⛔ **no second key set** — and the affordance is a REAL focusable control with a tap
      handler, ⛔ never hover-only.
      ⚠ **B's own live assertion carried a fence that had gone misleading** — its header said *"⛔ do
      ⛔ NOT add a stage to a mobile component"*, which was **B's scope fence** and correct for B.
      ⇒ recorded **DISCHARGED, ⛔ not deleted** ([[feedback_supersede_never_reinterpret]]): a mobile
      stage render is now EXPECTED; a second key set stays forbidden.
- [x] **Task 5 — The list** (AC6, AC7) — **FlashList**, ⛔ not `FlatList`; ⭐ empty / loading / error
      render **OUTSIDE** it, on `PoolContributorList.tsx`'s shape.
      ✅ Two early returns (loading, error) + the empty branch as a **SIBLING**; the list mounts ⛔ only
      in the `else`. ⛔ No `ListEmptyComponent`, ⛔ no `estimatedItemSize` riding the `as any` cast.
      ⭐ Rows keyed by `publicToken` (stable, unique, `pii_tier: 3`), ⛔ not an index.
      ⭐⭐ **AND TWO RULED MONEY FORMS WERE LIFTED INTO `@twt/i18n` RATHER THAN FORKED** —
      `apps/mobile` cannot import from `apps/public`, so rendering लक्ष्य here meant either sharing
      `formatSahyogTargetAmount` / the contributed-amount rule or writing a **second copy of a
      Trustee-ratified number form**. ⭐ `sahyog-render.ts` re-exports one and delegates the other, so
      ⛔ every existing `apps/public` call site and its **44 tests** are unchanged and the rendered
      output is byte-identical.
- [x] **Task 6 — Tests** (AC2, AC3, AC5, AC6, AC8b) — ⭐ **the `member ≥ public` comparison is the
      load-bearing one, and ⛔ IT ALREADY EXISTS:**
  - [x] ⭐⭐ **EXTEND `apps/api/tests/integration/contributions/member-name-form-parity.spec.ts`**
        (Story `8-16`, live at HEAD) — it already drives **both real routes** over live Postgres and
        proves `-189` cl.3 in **both directions** (`:21-23`; no-basis `:316`, basis-satisfied string
        equality `:333`). ⛔ Do ⛔ **not** reinvent the harness. This story adds the fourth-tab list as
        the **THIRD** surface in that comparison, and reuses its basis-seeding block (`:212-243`).
  - [x] ⛔ Inherit its scope note **verbatim** (`:24-27`): cl.3 is Trustee-scoped by `-195` cl.1 to
        the drive data class — ⛔ not a universal invariant. ✅ Carried into the appended block's
        header **and** into the AC3 field-floor test's header.
  - [x] Plus: `spawned` absent; another Pariwar's drives absent; the target renders **only** with
        `revealToMembers` and ⛔ not with an absent row; empty → populated does ⛔ not crash; the a11y
        props are present **and** the containers are accessibility elements. ✅ **All present.**
        ⚠⛔ **AND ONE FIXTURE GAP WAS FOUND BY A TEST FAILING, ⛔ not assumed:** `seedSharedPool`
        writes the roster into `pool_snapshots` only, ⛔ never `member_pool_assignments` — which is
        what `ASSIGNED_MEMBER_COUNT` counts. ⇒ the derived target was `20 × 0 = 0` and the read
        correctly resolved a zero-assignee pool to **SILENCE**. ⭐ `seedAssignment` added LOCALLY,
        ⛔ not folded into the shared fixture (8.16's cases assert names only).
  - [x] ⭐ **WHERE:** route-level live-DB → `apps/api/tests/integration/contributions/`;
        accessor-level → `packages/domain/tests/integration/pool/*.spec.ts` beside
        `sahyog-drive-public-read.spec.ts`; RN state/a11y → `apps/mobile/tests/unit/*.test.ts`.
        ⛔ Guard every live-DB suite with `describe.skipIf(!hasDatabase)`
        (`docs/runbooks/test-runbook.md:201`). ⭐ **Execute them** against `twt-test-pg` `:5433`
        (`test-runbook.md:22-23`).
- [x] **Task 7 — ✅ `8-16` HAS LANDED.** Status `done` (`sprint-status.yaml:16789`); verified at HEAD
      `1b7fa9f3`. ⇒ `-208` cl.3's *"`8-16` before `11b-15`"* is **met**, and this list cannot
      contradict the My Pool card — both call the **same** resolver. ⛔ Do ⛔ not fix My Pool here.
- [x] **Task 8 — The friction budget** (AC9) — ⛔ **after** the implementation commits exist.
      ✅ **Declaration affirmed — ⛔ NO new row, ⛔ none retired, ⛔ none amended.** A read is ⛔ not
      friction, and this surface **REMOVES** a step: before it the ⛔ only member-app path to a drive
      was a link-out that leaves the app and shows the member's **own live pool only**.
      ⭐ **Written AFTER `e9e5adcb` + `33409cba` existed, and PROVEN so:** `pnpm friction:check`
      **FAILED** on this story's file list before the block was written — ⛔ it did ⛔ not pass
      vacuously against an empty diff ([[project_friction_budget_baseline_ratchet]]).

### Review Findings

_bmad-code-review, 2026-09-09 — three parallel layers (Blind Hunter, Edge Case Hunter, Acceptance
Auditor) against the diff `c2dd787c..HEAD` (excl. generated `openapi/v1.yaml`)._

✅ **ALL 14 `[Review][Patch]` ITEMS APPLIED, 2026-09-09** (the 4 `[Review][Decision]` items resolved
first — 2 became patches, checked off below; 2 resolved with no code change, marked `[Review][Resolved]`).
Touched: `apps/api/src/modules/member-pool/handlers.ts` (concurrent per-row decrypts, sequential
list/count queries off the same tx, the `satisfiesMemberDriveLiveRowPairing` runtime guard, the
tightened fail-loud/fail-soft doc-block); `apps/mobile/components/drive-list/{MemberDriveList.tsx,
useMemberDriveListQuery.ts}` (paginated via `useInfiniteQuery` + `onEndReached`, the inline
background-refetch-failure banner, `closedAt`/`confirmedPercentage`/`fundingOutcome` wired into
`DriveRow`, the `useCallback` dep fix, the no-family a11y `{code}` token, `row.summary` replacing the
hardcoded `·`); `packages/i18n/locales/{en,hi}/member-drive-list.json` (new `row.summary`,
`row.progress`, `outcome.*` keys, the `{code}` token); new test coverage in
`apps/api/tests/unit/member-drive-list-handler.test.ts` (the forced-failure path, the per-field
fail-soft exception, the pairing guard, the lockstep constant test — `@twt/domain` may not import
`@twt/contracts`, so the lockstep test lives here, not in `packages/domain`),
`apps/mobile/tests/unit/drive-list-render.test.ts` (pagination, the AC3-floor renders, the a11y fix,
the `codeOnly` regex fix), `scripts/microcopy/member-drive-list.test.ts` (the real-string numeral
check). ⛔ `friction-budget.md` untouched — decision 3 kept both entry points, no disposition change.
Full suites re-run green: domain (135 files / 2039 tests), api (44 / 375), mobile (32 / 482), public
(24 / 513), the i18n parity gate, and the microcopy gate.

- [x] [Review][Patch] Fail-loud/fail-soft distinction needs to be made EXPLICIT in the story and in
      code — **RESOLVED 2026-09-09: the per-field null fallback is KEPT.** Route/read failures stay
      fail-loud (5xx); an individual protected field's decrypt failure is the deliberate, narrower
      fail-soft exception and yields `null` for that field only, with a warning log. Task 3's
      "DELIBERATELY NOT FAIL-SOFT" note and the matching in-code doc-block in `handlers.ts` both
      currently state the route-level claim without naming this field-level exception — tighten both so
      the distinction is explicit and this can't be misread as a contradiction again.
      [`apps/api/src/modules/member-pool/handlers.ts`; this story file, Task 3]
- [x] [Review][Patch] Wire AC3's three unrendered floor fields into `DriveRow` — **RESOLVED
      2026-09-09: render all three.** `closedAt` (the already-defined but dead `row.closed_on` i18n
      key), `confirmedPercentage` (a progress percentage/meter for `live` rows, reusing the public
      side's meter logic rather than forking it — Task 5's precedent), and `fundingOutcome` (a
      close-of-cycle framing sentence for `closed`/`settled` rows, reusing `apps/public`'s framing
      logic the same way). Extend the `MEMBER_COUNTERPART` field-floor test to assert render, not just
      contract-key presence, and to assert the populate-condition matches the public side.
      [`apps/mobile/components/drive-list/MemberDriveList.tsx`;
      `packages/contracts/src/contributions/member-drive-list.ts`;
      `apps/public/tests/member-drive-list-field-floor.test.ts`;
      `apps/public/src/lib/sahyog-render.ts` (reuse source)]
- [x] [Review][Resolved] Friction-budget duplicate entry point — **RESOLVED 2026-09-09: leave both,
      intentionally.** `SahyogVivranEntry.tsx`'s external link-out and this story's new in-app tab both
      stay; no retirement of the old path. [`friction-budget.md`;
      `apps/mobile/components/sahyog-vivran/SahyogVivranEntry.tsx`]
- [x] [Review][Resolved] Nominee full name enumerable across a member's Pariwar drive history —
      **RESOLVED 2026-09-09: `-190` cl.2 already covers this; no fresh Panel ruling.** Existing
      authority, not new disclosure — the field is already authorized at public tier, and the member
      surface is bound by the existing `member ≥ public` invariant. This story creates no new
      nominee-name disclosure ruling. [`packages/domain/src/pool/member-drive-list.ts`;
      `apps/api/src/modules/member-pool/handlers.ts`]
- [x] [Review][Patch] Client never advances past page 1 despite contract/route/domain all being
      paginated — `useMemberDriveListQuery` has no `page` param, no `onEndReached`, and never reads
      `data.total`; a Pariwar with more drives than one page never shows the remainder.
      [`apps/mobile/components/drive-list/useMemberDriveListQuery.ts:39-44`]
- [x] [Review][Patch] Per-row KYC decrypts run sequentially instead of concurrently, roughly doubling
      per-row decrypt latency across a page — await the deceased-name and nominee-name decrypts via
      `Promise.all` instead of two sequential `await`s.
      [`apps/api/src/modules/member-pool/handlers.ts`]
- [x] [Review][Patch] `listMemberPariwarDrives`/`countMemberPariwarDrives` run via `Promise.all`
      against the same transaction handle — a connection/protocol-multiplexing footgun, and pool state
      can change between the two statements so `total` can disagree with `items` with no snapshot
      pinning. Combine into one query or pin an explicit snapshot for the tx.
      [`apps/api/src/modules/member-pool/handlers.ts:346-349`]
- [x] [Review][Patch] No test exercises the claimed "must 5xx, never silently degrade" failure path —
      every integration test asserts `res.statusCode === 200`; add a test that forces a genuine
      failure and asserts the 500 response / the client's `isError` render.
      [`apps/api/tests/integration/contributions/member-name-form-parity.spec.ts`]
- [x] [Review][Patch] `useCallback(renderItem, [t, locale])` provides no memoization benefit — `t` from
      `useT()` is a fresh closure every render ([[project_uset_fresh_closure_memo_trap]]), so the
      callback is recreated regardless. Depend on `locale`, not `t`.
      [`apps/mobile/components/drive-list/MemberDriveList.tsx`]
- [x] [Review][Patch] Nameless-row accessibility label carries no identifying token — the visible
      fallback uses `poolLetterCode` so a sighted user can distinguish rows, but the `row.a11y.no_family`
      label doesn't, so a screen-reader user cannot distinguish two nameless rows.
      [`apps/mobile/components/drive-list/MemberDriveList.tsx`]
- [x] [Review][Patch] Comment-stripping regex used to derive "code-only" text for microcopy assertions
      doesn't guard against `/*`-like sequences inside string literals (unlike its acknowledged handling
      of line comments) — could misparse and corrupt downstream assertions on this file.
      [`scripts/microcopy/member-drive-list.test.ts`]
- [x] [Review][Patch] AC7's claimed "lockstep test" for the two page-size-cap constants doesn't exist —
      `MEMBER_DRIVE_LIST_LIMIT_MAX` (contracts, `50`) and `MEMBER_DRIVE_LIST_PAGE_SIZE_CAP` (domain,
      `50`) are asserted by the in-code comment to be pinned together by a test, but no test in the diff
      asserts their equality. Add the cross-package equality test the comment claims exists.
      [`packages/contracts/src/contributions/member-drive-list.ts`;
      `packages/domain/src/pool/member-drive-list.ts`]
- [x] [Review][Patch] Hardcoded `·` punctuation separator between amount and contribution count is
      written directly in JSX rather than composed through the i18n layer — inconsistent with how
      strictly every other punctuation/format decision in this diff is treated.
      [`apps/mobile/components/drive-list/MemberDriveList.tsx`]
- [x] [Review][Patch] Hindi numeral-discipline test (`checkNumerals`) is only exercised against
      synthetic planted strings — every real committed `hi/member-drive-list.json` value is a
      placeholder (`{count}`/`{amount}`) with no literal digit, so numeral discipline is never checked
      against copy that will actually ship.
      [`scripts/microcopy/member-drive-list.test.ts`; `packages/i18n/locales/hi/member-drive-list.json`]
- [x] [Review][Patch] A background refetch failure hides previously-loaded cached data behind the full
      error screen even when cached `data` from a prior successful fetch is still available — show the
      cached list with an inline error banner instead when `isError && data` both hold.
      [`apps/mobile/components/drive-list/MemberDriveList.tsx:107-151`]
- [x] [Review][Patch] No runtime guard checks the live-only row-pairing invariant
      (`confirmedPercentage`/`driveTargetInr` populated only on live rows) before a row reaches the
      wire — add an assertion so a malformed domain row is caught rather than silently shipped, given
      this exact pairing is what AC3's floor claim rests on.
      [`apps/api/src/modules/member-pool/handlers.ts:420-445`]
- [x] [Review][Defer] The `-211` cl.2 three-grounds rationale is copy-pasted near-verbatim across five
      files (`epics.md`, `sprint-status.yaml` comments, the contract file, `public-read.ts`,
      `handlers.ts`) — a future amendment or clarification of `-211` requires finding and updating every
      copy by hand or they silently diverge. [`epics.md`; `sprint-status.yaml`;
      `packages/contracts/src/contributions/member-drive-list.ts`;
      `packages/domain/src/pool/public-read.ts`;
      `apps/api/src/modules/member-pool/handlers.ts`] — deferred, pre-existing documentation pattern in
      this codebase, not a defect introduced by this diff.

### Review Findings — SECOND PASS

_bmad-code-review, 2026-09-09, re-run on the FIRST pass's own patches — three parallel layers against
the uncommitted diff of the fixes above. ⛔ This section does ⛔ NOT edit the first pass's checkboxes
above (the record of what pass 1 delivered stays as written,
[[feedback_supersede_never_reinterpret]]) — it records what pass 2 found IN THOSE PATCHES and fixed._

⚠⛔ **TWO GENUINE DESIGN QUESTIONS WERE RAISED AND RESOLVED BY BigDev:**

- **The `satisfiesMemberDriveLiveRowPairing` guard 5xxs the WHOLE page over one malformed row —
  seemingly the exact failure mode the per-field KYC fail-soft exception exists to avoid.**
  **RESOLVED: KEEP FAIL-LOUD.** A pairing violation is a STRUCTURAL domain-layer fault, categorically
  unlike a transient KMS decrypt failure — it signals the domain itself produced a row that could leak
  the roster-size-recovery channel `2026-09-08-207` cl.1 closed (`confirmedPercentage` present off a
  `live` row). Silently dropping just the bad row would hide that channel reopening rather than surface
  it. [`apps/api/src/modules/member-pool/handlers.ts`]
- **The inline background-refetch error banner renders the POPULATED list and an error indicator
  SIMULTANEOUSLY — a fourth on-screen state AC6's "empty · loading · error, three DISTINCT states"
  language didn't explicitly contemplate.**
  **RESOLVED: ACCEPT, RECORD.** This is a refresh-failure OVERLAY on the populated state (data already
  showing, a background attempt to get more/fresher data failed), ⛔ not a new PRIMARY state
  competing with the ratified three — the member always sees a coherent list; the banner adds
  information, it never replaces the list with something false. AC6 stands as ratified; this is a
  documented extension, ⛔ not a violation. [`apps/mobile/components/drive-list/MemberDriveList.tsx`]

✅ **THE FOLLOWING WERE FOUND AND FIXED IN THIS PASS** (bugs and gaps in the FIRST pass's own patches):

- [x] Per-row `Promise.all` KYC decrypts could push concurrent KMS calls to `DIRECTORY_DECRYPT_CONCURRENCY × 2` (verified the constant is `8` — worst case 16 against an intended cap of 8) — the row-level concurrency passed to `mapWithConcurrency` is now halved. [`apps/api/src/modules/member-pool/handlers.ts`]
- [x] The structural pairing guard ran AFTER paying for two KMS decrypts it might then discard — moved before the decrypt `Promise.all`, checked against the raw domain row's own fields (available pre-decrypt). [`apps/api/src/modules/member-pool/handlers.ts`]
- [x] The `Promise.all`→sequential comment for `listMemberPariwarDrives`/`countMemberPariwarDrives` asserted an unverified "connection/protocol-multiplexing footgun" — checked: `pg`'s `Client` already serializes queries on one connection regardless, so this was never actually unsafe and the change bought no consistency. Comment rewritten to be honest; the REAL, still-open gap (`total` can disagree with `items` under READ COMMITTED, no snapshot pinning) recorded in `deferred-work.md` rather than left implied-fixed. [`apps/api/src/modules/member-pool/handlers.ts`; `deferred-work.md`]
- [x] `formatClosedAtIst` had no guard against an unparseable instant — unlike the public `formatClosedAt` it copies, a malformed date would have rendered the literal "NaN-NaN-NaN". Guard added; the function now returns `string | null` and the call site checks it. [`apps/mobile/components/drive-list/format.ts` (extracted, see below); `MemberDriveList.tsx`]
- [x] The `fundingOutcome` → i18n key mapping used template-string interpolation off the wire enum with NO compile-time exhaustiveness tie — a future enum value with no matching key would throw and crash the WHOLE row's render. Replaced with an explicit switch + `never` guard, mirroring the public `framingFor` pattern exactly. [`apps/mobile/components/drive-list/format.ts`]
- [x] The inline banner's retry button called `refetch()` unconditionally — `refetch()` on an infinite query only re-fetches pages already in `data.pages`; a page that FAILED via `fetchNextPage` was never added there, so tapping retry after a failed pagination attempt cleared the error without actually retrying the missing page. Now retries `fetchNextPage()` when `hasNextPage` is true, `refetch()` otherwise. [`apps/mobile/components/drive-list/MemberDriveList.tsx`]
- [x] Task 3's "DELIBERATELY NOT FAIL-SOFT" story text was never tightened to name the per-field exception — only the matching `handlers.ts` doc-block was, in the FIRST pass. Fixed above, in Task 3.
- [x] `formatClosedAtIst`/`outcomeFramingKey` had ZERO real unit tests (only source-scans proving they're referenced, never that they compute the right answer) — extracted both into a new plain-`.ts` module (`format.ts`, no `react`/`tamagui` imports) specifically so they CAN be imported and called directly by a test; `MemberDriveList.tsx` itself cannot be `import`ed in this repo's pure-Vitest harness (confirmed by trying — a transitive React Native dependency's Flow syntax throws). Added: an ordinary case, the IST date-rollover boundary (the classic UTC+5:30 bug class), the malformed-input `null` case, exhaustive enum-to-key mapping, and the runtime throw for an out-of-enum value. [`apps/mobile/components/drive-list/format.ts` (new); `apps/mobile/tests/unit/drive-list-render.test.ts`]
- [x] The pairing-guard test only covered ONE direction of the two-way invariant (a non-live row with a live-only value) — added the mirror case (a `live` row with a `null` `confirmedPercentage`), plus a test proving the guard now runs BEFORE any decrypt (`decryptKycField` not called). [`apps/api/tests/unit/member-drive-list-handler.test.ts`]
- [x] Only the deceased-name decrypt-failure path was tested, despite the code's claim that both names "ride the SAME bounded map" identically — added the mirror nominee-name-failure case. [`apps/api/tests/unit/member-drive-list-handler.test.ts`]
- [x] The comment-stripper regex fix shipped with no test proving either half of its own claim (a real comment still stripped; a string-literal `/*` now survives) — added both, plus a JSX-curly-comment case. [`apps/mobile/tests/unit/drive-list-render.test.ts`]
- [x] The microcopy "plant a real digit" test picked its target string via `.find(v => v.length > 0)` — the first string in whatever order `Object.entries` yields, unnamed and unlogged; a future content reorder could silently change the test's semantics. Now targets the named `error` key directly. [`scripts/microcopy/member-drive-list.test.ts`]
- [x] The "5xx" handler test proved the resolver's promise REJECTS, not that the route returns an actual HTTP 500 — accurate for this codebase's own unit-test tier (`active-contribution-card.test.ts` and siblings test the resolver function directly, never through Fastify's HTTP layer; the reject→500 translation is Fastify's own well-tested framework behavior, and no live Postgres was available in this session to add a true HTTP-level integration assertion). Recorded here for precision rather than silently left implying more than the test proves.

⛔ **VERIFIED AND DISMISSED (checked against the actual code, not assumed):**
- A raw `Error` from the pairing guard leaking internal detail (`poolId`, the function name) to the
  client — checked `apps/api/src/middleware/error-mapping/index.ts`: every uncaught error already
  returns a generic `internal.error` envelope; `err.message`/stack are never serialized to a response.
- An `onEndReached` retry-storm on a bad connection — the app's global `QueryClient`
  (`apps/mobile/lib/query-client.ts`) already sets `retry: 1`, and the pattern matches this app's own
  existing `usePollsQuery`/`onEndReached` precedent verbatim.
- `poolLetterCode` returning empty/non-unique — a bijective base-26 encoding of `poolIndex + 1 ≥ 1` is
  always non-empty by construction; the domain's own tests already cover this.
- Pagination drift under concurrent writes (rows created/closed between page fetches) — the SAME
  pre-existing, disclosed READ COMMITTED gap as the `total`-vs-`items` item above, not novel to this
  patch, and not fixable without the deferred single-query rework.

⭐ Full suites re-run GREEN after this second pass: domain, api, mobile (+9 tests in
`drive-list-render.test.ts`), public; `i18n:check-parity`; the microcopy gate. Typecheck clean across
all five touched packages.

---

## Dev Notes

### The load-bearing test is a COMPARISON — and it is ⛔ NOT hypothetical

⭐ `-189` cl.3 is a **relational** invariant: it is ⛔ not about what this list shows, but about what it
shows **relative to another surface**. ⇒ a test that checks this list's fields in isolation ⛔ cannot
see a violation.

⭐⭐ **`member-name-form-parity.spec.ts` (8.16) IS that test, shipped.** This story **extends** it to a
third surface. ⚠ And its **Trap 7** header is the warning to carry: without seeding the basis the
comparison runs against `null` and *"would pass while proving NOTHING."*
⚠ Concurrency is **1** and load-bearing (`:34`); assert **membership and explicit values**, ⛔ never
counts over the shared fixture ([[project_live_db_test_gotchas]], [[project_ci_local_concurrency_oversubscription]]).

### The name form is ⛔ NO LONGER the difficulty — inherit the harness, ⛔ not the hazard

⭐ The public path (`kyc.resolvePublicMemberName`) and the member path
(`resolveMemberFacingDeceasedName`, `pool-identity.ts:141`) now read the **same stored
`public_name_presentation_mode`** and share the form rule; they differ only in **absence behaviour**
(the public omits a mononym under `shielded_name`; the member shows it — `8-16` Trap 5).
⚠ ⛔ Do ⛔ not reuse `resolvePublicMemberName` on the member side.

### ⭐ IN-CODE NOTES THAT NAME THIS STORY — ⛔ read before Task 4

⚠ Sibling stories left routing notes in doc-blocks that ⛔ no `_bmad-output` diff shows
([[feedback_story_validate_footguns]] item 9). All four are **consistent** with this story:

- `apps/mobile/tests/unit/sahyog-stage-copy-resolves.test.ts:7-14, 52-55, 66-73` — ⭐ a **LIVE
  assertion** that story E consumes B's keys *"by name — ⛔ it may ⛔ not mint its own"*, and
  *"⇒ ⛔ Do ⛔ NOT 'complete' this by adding a stage to a mobile component."*
- `apps/public/src/pages/sahyog-vivran/[driveToken].astro:112-116` — the non-React `t()` call shape.
- `packages/i18n/locales/{en,hi}/sahyog-shared.json:2` — *"⛔ Do NOT copy these strings into
  `apps/mobile`, into `sahyog-drive.json`, or into `sahyog-vivran.json`."*

### Testing standards

Live-DB integration for the read and the comparison; RN unit tests for the list states and the a11y
props. ⚠ Assert **membership and explicit values**, ⛔ never counts over the shared fixture.

### References

- `.decision-log.md#decision-2026-09-04-193` cl.2 · `-194` cl.2 · `-196` · `-189` cl.3 · `-195` cl.1
- ⚠⛔ **THE FOUR ENTRIES THAT MOVED THE SURFACE THIS STORY COMPARES ITSELF TO — ⛔ none existed at
  authoring:** `-204` (cl.1 the bar measures **contributors**; cl.2 **supersedes `-190` cl.7(a)** —
  ⛔ there is no setter; **cl.3 cl.7(b)/(c) STAND**; cl.4 story D builds the public reveal) ·
  **`-205` cl.1** (the nominee's FULL name on the public index — Trustee-ratified, `pii_tier: 1`) ·
  `-206` cl.3/cl.4 (the target's number form) · **`-207` cl.1** (`confirmedPercentage` is now
  `number | null` on `closed`/`settled` rows)
- `-208` cl.1/cl.3/cl.4 · **`-210` cl.1** (⭐ `withdrawn` minted — ⛔ **SUPERSEDES `-208` cl.7**, which
  had ruled `11b-16`'s row must stay `ready-for-dev`) · **`-209`** (⛔ the retired justification)
- ⚠ **`-190` cl.7 IN FULL** — cl.7(b) (the default: not visible) **and cl.7(c)** (the authority: only
  a Superadmin, **separately for member and for public**). ⛔ Quoting only (b) is what left the member
  arm with no consumer.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-07-11b14-drive-target-reveal-and-the-unwritten-headline.md`
  §3.4 · §12.3(A)(1) · **§13.3** — ⚠ read the **body**; the header lags it
- `packages/contracts/src/public-pages/sahyog-drive.ts:125-128` — the public name form. ⚠⛔ `:128`
  (*"NEVER through `resolvePoolIdentity()`, which hard-codes the shielded form"*) is **prose `8-16`
  did not sweep and is FALSE at HEAD**; the fence still holds, its stated reason does not.
- `apps/public/src/lib/surface-fields.ts:401-428` — **the AC3 floor**
- `packages/domain/src/pool/public-read.ts:126` (the public state tuple) · `:169-180` (the total stage
  mapping) · `:283-284` (the own-fragment rule) · `:380-396` (the inert name gate) · `:652`
  (`resolveDriveTargetForPublic`) · `:1053-1058` (the paginated read)
- `packages/domain/src/pool/drive-target-policy.ts:233` — `resolveDriveTargetVisibility`
- `packages/domain/src/pagination.ts:34` — `clampLimit` (the `domain-accessor-invariants` gate)
- `apps/mobile/app/(tabs)/_layout.tsx:42,49,56` — the three tabs and their hardcoded titles
- `apps/api/src/modules/member-pool/routes.ts:46,57,68,87` — the four existing member routes
- `_bmad-output/implementation-artifacts/10-15-survey-poll.md:134` — the recorded rejection AC1 supersedes
- **UX-DR80** (`epics.md:509`) — virtualization

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Opus 5) — `bmad-dev-story`, 2026-09-09.

### Debug Log References

**Task 0 — live verification before the `governance:` commit** ([[feedback_verify_before_committing_governance_claims]] — a report is not proof):

| Claim written into `epics.md` | Verified how | Result |
|---|---|---|
| `#decision-2026-09-09-211` exists and is readable | `.decision-log.md:37`, read END TO END incl. cl.2's three grounds | ✅ live |
| ⭐ **`-207` is `2026-09-08`, ⛔ not `-09-07`** | enumerated all 16 cited anchors against `^### Decision` headers | ⚠ **2 anchors corrected** |
| AC3 floor = **13** mapped field ids | `apps/public/src/lib/surface-fields.ts:401-428` | ✅ exact, incl. `driveLinkA11yLabel: null` |
| `revealToMembers` has ⛔ zero read paths | grep over `packages/domain/src`, `apps/api/src`, `apps/mobile`, `apps/public/src`, `apps/admin/src` | ✅ schema + policy + write handler + admin form ONLY |
| THREE tabs, hardcoded English, ⛔ no `@twt/i18n` import | `apps/mobile/app/(tabs)/_layout.tsx` read in full | ✅ confirmed |
| ⛔ No member drive-list route | `apps/api/src/modules/member-pool/routes.ts` read in full (4 routes) | ✅ confirmed |
| `SAHYOG_DRIVE_VISIBLE_POOL_STATES` == the member tuple | `packages/domain/src/pool/public-read.ts:126` | ✅ `['live','closed','settled']` — Trap 2's coincidence is **real** |
| `PUBLIC_STATUS_BY_POOL_STATE` total + `publicStatusForPoolState` | `public-read.ts:169-180` | ✅ |
| `POOL_LIFECYCLE_STATES` is exactly four, linear | `packages/domain/src/schema/pools.ts:78` | ✅ `spawned·live·closed·settled` |
| `resolveDriveTargetVisibility` fail-closed on absent row | `packages/domain/src/pool/drive-target-policy.ts:233-240` | ✅ |
| `clampLimit` shape | `packages/domain/src/pagination.ts:34` | ✅ `Math.max(1, Math.min(limit ?? default, cap))` |
| 10.15's superseded rejection, quoted verbatim | `10-15-survey-poll.md:134` | ✅ exact |
| ⭐ 10.15's ground is **negative evidence only** | `ux-design-specification.md` — its ONE *"tab bar"* hit is `:481` | ✅ ⛔ fixes no tab count |
| B's `sahyog-shared` key path, both locales | `packages/i18n/locales/{en,hi}/sahyog-shared.json` read in full | ✅ all 8 stage keys + `drive_target` |

⚠⛔ **ONE FINDING RAISED FOR A LATER TASK, ⛔ not silently absorbed:** `sahyog-shared.json`'s
`$comment.drive_target` states the figure is *"RENDERED ONLY WHERE A `super_admin` HAS SWITCHED
`reveal_to_public` ON"* — ⭐ **true when written, and SUPERSEDED for the member surface by `-211`
cl.2.** ⇒ that `$comment` is **amended by name** when AC8b is built ([[feedback_supersede_never_reinterpret]]);
⛔ leaving it would tell the next reader the member axis does not exist. ⛔ **Not** a new key — the
existing `drive_target` key is reused, per the live assertion at
`sahyog-stage-copy-resolves.test.ts:66-73`.

### Completion Notes List

⭐⭐ **STORY COMPLETE — all nine ACs satisfied, all Tasks closed. `ci:local` **34/34 GREEN**, including
live-DB `integration-tests` against `twt-test-pg` `:5433`.**

#### ⚠⛔ FINDINGS RAISED DURING IMPLEMENTATION — ⛔ recorded, ⛔ none silently absorbed

1. ⭐⭐ **THE AC3 FLOOR IS `14` MAPPED FIELD IDS, ⛔ NOT THE `13` THIS STORY'S PROSE STATES.** The
   story's **enumeration** lists 14 and is **CORRECT**; only its count WORD is wrong — which is why
   **two `validate` passes** re-checking *"the enumeration, exact match, order and all"* both passed.
   ⛔ The AC prose is ⛔ **not editable by `dev-story`**, so it is **recorded here** rather than
   rewritten. ⭐ **The build does ⛔ not depend on the number:** the test reads
   `SAHYOG_DRIVE_ROW_FIELD_IDS` **programmatically** and asserts ⛔ no count — ⚠ a transcribed count
   is the same defect class as the hand-listed subset `-188` survived.
   ⭐ **SWEPT:** `11b-17` (story F) does ⛔ **not** carry the claim; it is confined to this file
   ([[feedback_story_validate_footguns]] — a premise defect never swept to the sibling). ⚠ The
   `epics.md` section I authored **propagated it once** and was corrected in the same pass.
2. ⚠⛔ **`-207` IS DATED `2026-09-08`, ⛔ NOT `2026-09-07`.** The story cites it undated; my first
   `epics.md` draft guessed `-09-07` twice. ⭐ Caught by enumerating **all 16** cited anchors against
   `.decision-log.md` rather than trusting shorthand.
3. ⚠⛔ **TASK 0's *"rewrite the stale sprint comment block"* WAS ⛔ ALREADY DISCHARGED.** Its three
   named phrases are **absent** from this story's row block (the 2026-09-09 `validate` rewrite removed
   them); ⛔ only the FLIP was owed, and only the flip was made
   ([[feedback_closure_language_precision]]). ⚠ The cited range `:17173-17193` is itself stale and now
   points into `11b-11`. ⛔ The phrases survive only in HISTORICAL ledger rows, which are ⛔ not
   rewritten ([[project_sprint_status_ledger]]).
4. ⚠⛔ **`sahyog-shared.json`'s `$comment.drive_target` HAD GONE MISLEADING** — it said the figure
   renders ⛔ ONLY where `reveal_to_public` is on. True when written (ONE consumer); ⛔ false as scope
   now that this surface reads the **MEMBER** axis. ⇒ **AMENDED AND NAMED, ⛔ not deleted**
   ([[feedback_supersede_never_reinterpret]]). ⛔ **No new key was minted** — the existing
   `drive_target` key is reused, per the live assertion aimed at this story.
5. ⚠⛔ **B's LIVE ASSERTION CARRIED A FENCE THAT NOW READS AS A PROHIBITION** —
   `sahyog-stage-copy-resolves.test.ts`'s header says *"⛔ do ⛔ NOT add a stage to a mobile
   component"*. ⭐ That was **B's scope fence**, correct for B, and the same header names story E as
   the builder. ⇒ recorded **DISCHARGED**, ⛔ not deleted.
6. ⚠⛔ **THE SHARED TEST FIXTURE NEVER SEEDED `member_pool_assignments`** — `ASSIGNED_MEMBER_COUNT`
   counts that table, and `seedSharedPool` writes the roster only into `pool_snapshots`. ⇒ the derived
   target was `20 × 0 = 0` and the read **correctly** resolved a zero-assignee pool to SILENCE.
   ⭐ **Found by the test failing**, ⛔ not assumed; `seedAssignment` added locally so 8.16's cases keep
   their blast radius.
7. ⚠⛔ **`pool-support-category-invariant` CAUGHT THE TRAP 2 DOC-BLOCK, TWICE.** It scans **COMMENTS**,
   on the ground that *"a pool-engine comment thinking in category-specific terms is itself the
   smell"* (7.1 AC4). ⭐ The story's own Trap 2 phrases the disclosure ground in one
   `support_category`'s vocabulary; the code says it **category-agnostically** — which is **stronger**,
   because the argument holds for **every** category.
8. ⚠⛔ **A RAW-SOURCE TEST SCAN PUNISHES THE HOUSE DISCIPLINE.** Three mobile assertions forbid a token
   outright (`ListEmptyComponent`, `FlatList`, `estimatedItemSize`) and **all three failed** — because
   the component's doc-blocks NAME those tokens in order to forbid them. ⛔ The wrong fix is rewording
   comments until a regex is happy; ⭐ the right one is a comment-stripper, so the test scans **code**.
9. ⚠ **A MICROCOPY FIXTURE OF MINE WAS WRONG, ⛔ NOT THE RULE:** a bare *"hurry"* is **deliberately
   unmatched** — the fursat register's own shipped reassurance is *"there is no hurry"*. ⭐ The pattern
   was read; the fixture became `hurry up`.

#### ⭐ DELIBERATE DIVERGENCES, EACH RECORDED IN CODE

- **Set-based joins, ⛔ not the passbook's per-pool `resolvePoolIdentity` memo** (Task 2) — a
  performance decision, ⛔ not a policy one, and the **name FORM** still routes through the ⛔ one
  shared site. ⛔ Recorded in the module header so nobody "restores" the N+1 believing AC2b requires it.
- **⛔ Not fail-soft** (Task 3) — the ⛔ only read in `member-pool` that isn't, so AC6's error state is
  a real branch rather than a dead one.
- **`resolveDriveTargetForMembers` lives in `public-read.ts`** — `-211` cl.4 says *"beside it"*, and
  adjacency is the point: a member-axis resolver in a member module would leave the public one looking
  like *the* target resolver. ⛔ It adds ⛔ no public behaviour.
- **`confirmedPercentage` and `driveTargetInr` mirror the public LIVE-only gating** — AC3 is a
  **FLOOR**, so matching the public `null` satisfies it exactly. ⛔ Carrying a number instead would
  show a member MORE than the Panel ruled (Trap 5) and would re-open on the member wire the
  roster-recovery channel `-207` cl.1 closed.
- **AC3's floor is discharged at the DATA layer**, ⛔ not the rendered-STRING layer — three public ids
  are **composed sentences**; the member row carries every INPUT each is composed from. ⭐ Stated in
  the test's header so it is ⛔ not re-argued in review.

#### ⭐ TEETH PROVEN, ⛔ NOT MERELY GREEN ([[feedback_gate_scope_semantic_coverage]])

| Guard | Planted violation | Result |
|---|---|---|
| AC3 field floor | a NEW public field id with no member counterpart | ✗ **FAILS**, naming the id |
| AC3 field floor | a declared counterpart REMOVED from the contract | ✗ **FAILS**, naming both mappings |
| **AC8b gate** | the resolver switched to `revealToPublic` | ✗ **FAILS** — ⭐ i.e. it fails on **exactly the literal reading `-211` cl.2 departed from** |
| microcopy namespace | vocabulary · tone · numeral, BOTH locales | ✗ **FAILS** each; revert-sanity included |
| friction budget | (no plant needed) | ✗ **FAILED** on this story's file list before the disposition was written |

#### ⛔ WHAT WAS ⛔ NOT DONE, AND WHY

- ⛔ **No public surface edited.** ⚠ `apps/public/src/lib/sahyog-render.ts` is in the diff and is a
  **refactor with ⛔ no behaviour change** — its own 44 tests pass unchanged, output byte-identical.
- ⛔ **The two stale comments are RECORDED in `deferred-work.md`, ⛔ not edited** (AC8, in terms). ⚠ The
  FENCE they express still holds and is pinned by a live test; ⛔ only their stated REASON is false ⇒
  the owed fix is to **re-ground** them, ⛔ never to delete them.
- ⛔ **No tab-title i18n sweep** (Trap 4) · ⛔ no `spawned` · ⛔ no banking coordinates (story **F**) ·
  ⛔ no contributor names · ⛔ no per-member amounts · ⛔ no change to `active-contribution`.
- ⚠ **RED-GREEN WAS ⛔ NOT FOLLOWED STRICTLY, and it is stated rather than glossed.** The story's Task
  sequence puts ⛔ all tests in **Task 6**, after Tasks 2-5 — and the workflow makes the Task sequence
  authoritative. ⇒ implementation preceded its tests for those tasks. ⭐ The load-bearing guards were
  nonetheless proven to FAIL against planted defects (table above), which is what red-green exists to
  establish.

**Task 0 — GOVERNANCE FIRST (AC0). ⛔ Zero code in this commit.**

- ⭐ Wrote the **`### Story 11b.15` SECTION** in `epics.md`, at the end of Epic 11b's story list — the
  **8.16 precedent** (`epics.md:3400`), itself following **7.11** (`:3041`). ⭐ The section records
  **why a section and ⛔ not an annotation**: siblings A–D each annotated Story 11b.3 because each
  **amended** the public Sahyog surface that story owns; ⛔ E amends nothing there and has ⛔ no parent
  in the file.
- ⭐ **AC1's supersession is written by name**, ⛔ not overwritten: 10.15's recorded rejection
  (*"the tab bar is at three"*) is quoted, `-194` cl.2 named as the ruling that changes it, and its
  ground identified as **negative evidence only** ([[feedback_supersede_never_reinterpret]]).
- ⭐ **AC8b is stated on the MEMBER axis**, with `-211` cl.2's three grounds carried into `epics.md`
  so a future reader cannot "correct" it back to the public switch.
- ⚠ **`-207`'s date was wrong in my first draft** (`2026-09-07` → `2026-09-08`). ⭐ Caught by
  enumerating every cited anchor against the log rather than trusting the story file's undated
  shorthand ([[feedback_negative_claims_checkable_in_repo]]).
- ⚠⛔ **Task 0's *"rewrite the stale comment block"* sub-item is recorded ALREADY DISCHARGED, ⛔ not
  claimed as an edit** — its three named phrases are absent from this story's row block (the
  2026-09-09 `validate` rewrite removed them); only the **flip** was genuinely owed
  ([[feedback_closure_language_precision]]). ⛔ The historical ledger rows that still carry them are
  ⛔ **not** rewritten ([[project_sprint_status_ledger]]).
- ⭐ **Trap 4 ruled** (BigDev): the tab title is **`t()`-resolved** — **Sahyog Drives / सहयोग अभियान**.
  ⚠ Checked first that the repo's i18n gate is **key-parity only** and would ⛔ not have forced it.

### File List

⭐ Paths relative to repo root. ⚠ Scoped to **`afd0e3e2..HEAD`** — this story's own four commits
(`fdc2d964` · `e9e5adcb` · `33409cba` · the Task-8 docs commit). ⛔ The other
`implementation-artifacts/*.md` files that appear in a `merge-base..HEAD` diff belong to the **prior**
repo-wide orphaned-pin sweep (`c2dd787c`), ⛔ not to this story.

**Governance / docs**

- `_bmad-output/planning-artifacts/epics.md` — **modified** (the new `### Story 11b.15` **section**)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — **modified** (row → `in-progress` → `review`; ledger entries)
- `_bmad-output/implementation-artifacts/11b-15-member-drive-list-fourth-tab.md` — **modified** (checkboxes, Dev Agent Record, File List, Change Log, Status)
- `_bmad-output/implementation-artifacts/deferred-work.md` — **modified** (the two stale post-`8-16` comments RECORDED, ⛔ not edited)
- `friction-budget.md` — **modified** (the AC9 disposition — written AFTER the implementation commits)
- `microcopy.yaml` — **modified** (the `member-drive-list` namespace added to `scope.copy_globs`)

**Domain**

- `packages/domain/src/pool/member-drive-list.ts` — **NEW** (the read + its OWN visible-state fragment)
- `packages/domain/src/pool/public-read.ts` — **modified** (`resolveDriveTargetForMembers`, beside its public sibling)
- `packages/domain/src/pool/index.ts` — **modified** (barrel)
- `packages/domain/tests/pool/member-drive-list.test.ts` — **NEW** (the tuple fence + the member-axis resolver)

**Contracts / SDK / OpenAPI**

- `packages/contracts/src/contributions/member-drive-list.ts` — **NEW** (`.strict()` entry/query/response)
- `packages/contracts/src/contributions/index.ts` — **modified** (barrel)
- `packages/contracts/scripts/emit-openapi.ts` — **modified** (components + path)
- `openapi/v1.yaml` — **modified** (⭐ **RE-EMITTED**, ⛔ never hand-edited)
- `packages/api-client/src/index.ts` — **modified** (`memberDriveList` — ⛔ no `pariwarId` argument)

**API**

- `apps/api/src/modules/member-pool/handlers.ts` — **modified** (`driveList` + `resolveDriveList`)
- `apps/api/src/modules/member-pool/routes.ts` — **modified** (`GET /api/v1/member/drive-list`)
- `apps/api/tests/integration/contributions/member-name-form-parity.spec.ts` — **modified** (⭐ **EXTENDED** — the drive list as the THIRD surface; 8 new live-DB cases)

**Mobile**

- `apps/mobile/app/(tabs)/sahyog.tsx` — **NEW** (the fourth tab's screen)
- `apps/mobile/app/(tabs)/_layout.tsx` — **modified** (the fourth `Tabs.Screen`; the `t()` title; the 10.15 supersession by name)
- `apps/mobile/components/drive-list/MemberDriveList.tsx` — **NEW** (the list, its three states, the stage explainer)
- `apps/mobile/components/drive-list/useMemberDriveListQuery.ts` — **NEW**
- `apps/mobile/tests/unit/drive-list-render.test.ts` — **NEW** (20 assertions)
- `apps/mobile/tests/unit/sahyog-stage-copy-resolves.test.ts` — **modified** (B's fence recorded **DISCHARGED**, ⛔ not deleted)

**i18n**

- `packages/i18n/locales/{en,hi}/member-drive-list.json` — **NEW** (this surface's OWN chrome)
- `packages/i18n/locales/{en,hi}/sahyog-shared.json` — **modified** (⭐ `$comment.drive_target` AMENDED + NAMED; ⛔ **no key added, no string changed**)
- `packages/i18n/src/catalog.ts` — **modified** (namespace registration — all five edits)
- `packages/i18n/src/currency.ts` — **modified** (the two RULED Sahyog money forms, relocated here)
- `packages/i18n/src/index.ts` — **modified** (exports)

**Public (⛔ NO behaviour change)**

- `apps/public/src/lib/sahyog-render.ts` — **modified** (re-export + delegate; ⭐ its 44 tests pass unchanged, output byte-identical)
- `apps/public/tests/member-drive-list-field-floor.test.ts` — **NEW** (AC3's floor, enumerated from the live map)

**Gates**

- `scripts/microcopy/member-drive-list.test.ts` — **NEW** (teeth for the new copy namespace)

**Code-review patch pass, 2026-09-09 (⭐ addendum to the file list above, ⛔ not a rescope of it)**

- `apps/api/src/modules/member-pool/handlers.ts` — **modified** (concurrent decrypts, sequential list/count, the pairing guard, the tightened doc-block)
- `apps/api/tests/unit/member-drive-list-handler.test.ts` — **NEW** (the forced-failure path, the fail-soft exception, the pairing guard, the lockstep constant)
- `apps/mobile/components/drive-list/MemberDriveList.tsx` — **modified** (AC3's three floor fields, pagination wiring, the inline error banner, the a11y/`useCallback`/punctuation fixes)
- `apps/mobile/components/drive-list/useMemberDriveListQuery.ts` — **modified** (`useInfiniteQuery` + `flattenDriveList`)
- `apps/mobile/tests/unit/drive-list-render.test.ts` — **modified** (pagination/banner/AC3-floor/a11y coverage; the `codeOnly` regex fix)
- `apps/public/tests/member-drive-list-field-floor.test.ts` — **modified** (header note only — records the render-side fix lives in the mobile test)
- `packages/domain/tests/pool/member-drive-list.test.ts` — **modified** (header note only — records why the lockstep test moved to `apps/api`)
- `packages/i18n/locales/{en,hi}/member-drive-list.json` — **modified** (`row.summary`, `row.progress`, `outcome.*`, the no-family `{code}` token)
- `scripts/microcopy/member-drive-list.test.ts` — **modified** (the real-committed-string numeral check)

**Code-review patch pass, SECOND (2026-09-09) — further changes on top of the first pass's own patches**

- `apps/api/src/modules/member-pool/handlers.ts` — **modified** (halved decrypt concurrency; the pairing guard moved before the decrypts; the `Promise.all`→sequential comment corrected)
- `apps/api/tests/unit/member-drive-list-handler.test.ts` — **modified** (the mirror pairing case, the nominee-decrypt-failure case, `toHaveBeenCalled` assertions)
- `apps/mobile/components/drive-list/format.ts` — **NEW** (`formatClosedAtIst`/`outcomeFramingKey` extracted so they're directly unit-testable; the NaN guard; the exhaustiveness switch)
- `apps/mobile/components/drive-list/MemberDriveList.tsx` — **modified** (imports from `format.ts`; the inline-banner retry fix)
- `apps/mobile/tests/unit/drive-list-render.test.ts` — **modified** (real `format.ts` unit tests incl. the IST rollover boundary; the `codeOnly` regression tests; updated `fundingOutcome` assertion)
- `scripts/microcopy/member-drive-list.test.ts` — **modified** (the numeral-plant target named by key, not `.find()`)
- `_bmad-output/implementation-artifacts/deferred-work.md` — **modified** (the still-open `total`-vs-`items` consistency gap recorded)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-09 | 1.2 | ✅ **CODE REVIEW, SECOND PASS APPLIED — re-reviewed the first pass's own patches; 2 design questions resolved by BigDev (pairing guard stays fail-loud; the inline banner's fourth combined state accepted and recorded against AC6), 12 bugs/gaps found and fixed, 4 claims verified and dismissed.** See `### Review Findings — SECOND PASS` above. Full suites re-run green. | BigDev + Claude |
| 2026-09-09 | 1.1 | ✅ **CODE REVIEW APPLIED — all 14 `[Review][Patch]` findings fixed, all 4 `[Review][Decision]` findings resolved by BigDev** (2 → patch, 2 → resolved with no code change). See `### Review Findings` above for the full list and `git log` for the commit. Full suites re-run green: domain 135/135 files (2039 tests), api 44/44 (375), mobile 32/32 (482), public 24/24 (513); i18n parity gate and microcopy gate both green. | BigDev + Claude |
| 2026-09-09 | 1.0 | ✅⭐⭐ **IMPLEMENTED — `in-progress` → `review`. ALL NINE ACs SATISFIED; ALL TASKS CLOSED. `ci:local` 34/34 GREEN incl. live-DB integration.** ⭐ Four commits: `fdc2d964` (governance-first, ⛔ no code) · `e9e5adcb` (the read + route) · `33409cba` (the tab, the list, the tests) · the Task-8 docs commit. ⭐ **The surface:** a fourth tab with its OWN visible-state fragment (⛔ never the public tuple, Trap 2), a paginated member-scoped read (scope from the SESSION — there is ⛔ no `pariwarId` parameter), the three ruled stage words consumed from story B by name, and लक्ष्य on the **MEMBER** axis (`-211` cl.2), fail-closed ⇒ ⛔ nothing renders at launch. ⭐ **Trap 4 RULED:** the title is `t()`-resolved — *Sahyog Drives / सहयोग अभियान* — the one translated title among four; ⛔ the three pre-existing literals are ⛔ NOT swept. ⚠⛔⛔ **NINE FINDINGS RAISED, ⛔ none silently absorbed** — ⭐ chief among them: **the AC3 floor is 14 mapped field ids, ⛔ NOT the `13` this story's prose states** (the ENUMERATION is right; the count WORD is wrong, which is why two `validate` passes checking *"the enumeration, exact match"* both passed). ⛔ AC prose is ⛔ not `dev-story`-editable ⇒ RECORDED, and the test reads the map **programmatically** and asserts ⛔ no count. ⭐ Swept: `11b-17` does ⛔ not carry it. Also: `-207` is `2026-09-08` ⛔ not `-09-07`; Task 0's comment-block rewrite was ⛔ ALREADY discharged (flip only); `sahyog-shared`'s `$comment.drive_target` AMENDED + NAMED (⛔ no key minted); B's stage fence recorded **DISCHARGED**; the shared fixture never seeded `member_pool_assignments` (found by a test FAILING); `pool-support-category-invariant` caught the Trap 2 doc-block **twice** (it scans COMMENTS) ⇒ reworded category-agnostically. ⭐ **TEETH PROVEN on four guards** — ⭐⭐ the AC8b gate **FAILS when switched to `revealToPublic`**, i.e. on exactly the literal reading `-211` cl.2 departed from. ⚠ **Two ruled money forms were LIFTED into `@twt/i18n` rather than forked** (mobile cannot import `apps/public`); `sahyog-render.ts` re-exports/delegates and its **44 tests pass unchanged**. ⚠ **RED-GREEN was ⛔ not followed strictly** — the story's Task order puts all tests in Task 6 — ⛔ stated rather than glossed. ⛔ No public surface, ⛔ no `spawned`, ⛔ no banking coordinates, ⛔ no contributor names, ⛔ no change to `active-contribution`; the two stale comments RECORDED in `deferred-work.md`, ⛔ not edited. | BigDev + Claude |
| 2026-09-09 | 0.7 | ⭐⭐ **DEV STARTED — TASK 0 (GOVERNANCE FIRST) COMPLETE. `ready-for-dev` → `in-progress`. ⛔ ZERO CODE.** ⭐ The **`### Story 11b.15` SECTION** is written in `epics.md` (end of Epic 11b's story list, the **8.16 precedent** `:3400`), recording why a **SECTION** and ⛔ not an annotation — A–D each annotated Story 11b.3 because each **amended** the public Sahyog surface it owns; ⛔ E amends nothing there. ⭐ AC1's supersession of **10.15**'s recorded *"the tab bar is at three"* rejection is written **by name** (its ground verified to be **negative evidence only** — `ux-design-specification.md` fixes ⛔ no tab count). ⭐ AC8b is stated on the **MEMBER** axis with `-211` cl.2's three grounds carried in, so it cannot be silently "corrected" back to `reveal_to_public`. ⭐ **TRAP 4 RULED (BigDev): the tab title is `t()`-RESOLVED — Sahyog Drives / सहयोग अभियान**, the one translated title among four; ⚠ verified first that the repo's i18n gate is **key-parity only** and would ⛔ not have forced it. ⚠ **`-207`'s anchor date was wrong in the first draft** (`-09-07` → **`-09-08`**) — caught by enumerating all 16 cited anchors against `.decision-log.md` rather than trusting undated shorthand. ⚠⛔ **Task 0's *"rewrite the stale comment block"* sub-item is recorded ALREADY DISCHARGED, ⛔ not claimed as an edit** — its three named phrases are ⛔ absent from this story's row block (the 2026-09-09 `validate` rewrite removed them) and survive only in HISTORICAL ledger rows, which are ⛔ not rewritten. ⭐ **ONE FINDING RAISED FOR AC8b:** `sahyog-shared.json`'s `$comment.drive_target` still says the figure renders only on `reveal_to_public` — **superseded for the member surface by `-211` cl.2**, and it is amended **by name** when AC8b is built. | BigDev + Claude |
| 2026-09-09 | 0.6 | ⛔ **SECOND `validate` pass, same day — ZERO FINDINGS. Baseline advanced `1b7fa9f3`→`c2dd787c` (bookkeeping, not a rescue: `git diff --name-only` over `packages/`/`apps/` between them is EMPTY).** ⭐ Re-checked against the new HEAD: AC3's 13-field enumeration (exact match, `surface-fields.ts:401-428`); `revealToMembers`'s reader count (still zero production consumers outside schema/policy/write-handler/admin-form); `resolvePoolIdentity`'s live signature; the `member-name-form-parity.spec.ts` basis-seeding chain; every `.decision-log.md` entry and routing note dated after `-211`/2026-09-07 (none name this story); Task 0's two remaining checkboxes (confirmed genuinely open, not stale). ⚠ Also confirmed: the concurrent repo-wide orphaned-pin sweep (`c2dd787c`) checked `11b-15`'s own pin and found it healthy — it changed 13 other files, not this one. ⛔ No duplicate `ready-for-dev` story found elsewhere owning this work (footgun 10 check: grepped `implementation-artifacts/` for "fourth tab" / "drive list" / `resolveDriveTargetForMembers` — no hit outside the known 11b siblings). | BigDev + Claude |
| 2026-09-09 | 0.5 | ✅⭐⭐ **PREFLIGHT ALL CLEAR — `#decision-2026-09-09-211` LANDED** (`489b2913`), ⛔ before any code. AC8b is **UNBLOCKED**; the F2 STOP is ⛔ kept as the record, ⛔ not deleted. ⚠⛔ **`-211` cl.2 DEPARTS from the routing note's literal *"same condition"*:** the gate is **`reveal_to_members`**, ⛔ not `reveal_to_public` — cl.7(c) authorises the axes separately, the DB CHECK makes public-on imply member-on so `-189` cl.3 holds either way, and the public axis would have left the member switch **inert**. ⭐ Task 0's remaining two sub-items (the `epics.md` section, the sprint row) still bind. | BigDev + Claude |
| 2026-09-09 | 0.4 | ⛔⛔ **RE-VALIDATED (`bmad-create-story validate`, three independent verifiers) — 29 FINDINGS APPLIED. ⛔ ZERO ROWS MOVE.** ⭐ Baseline **RE-PINNED** `e578eb16` → `1b7fa9f3` (the old pin was ORPHANED; twin `4a763430`, byte-identical tree; **94** commits of drift). ⛔⛔ **Trap 1 is VOID** — `-209` cl.3 rules its premise false for every drive and forbids the paraphrase; the public name gate is INERT (one repo site) and `8-16` (`done`) made all four consumers MODE-RESOLVED, replacing `deceasedFirstName`/`deceasedLastInitial` with ONE `deceasedDisplayName`. ⭐ **AC8b ADDED** — the 2026-09-07 routing note §12.3(A)(1)/§13.3 rules story E **must** render the target on `revealToMembers`; *"no target"* is retired at all three sites, and the missing decision entry is a **Preflight STOP**. ⭐ **AC3 floor ENUMERATED** (13 field ids incl. the nominee's Trustee-ratified FULL name) and its test re-pointed to the **existing** `member-name-form-parity.spec.ts` **with basis-seeding mandated** (else vacuous). ⭐ Trap 2 corrected (the public tuple **already** reads `live`+`closed`+`settled`). ⭐ **AC9 friction budget** + **Preflight** added; AC1 names 10.15's superseded rejection; AC7 switched to **FlashList** and made `clampLimit` mandatory. ⚠ Citations re-anchored: `sahyog-drive.ts:94-96`→`:125-128`; `handlers.ts:630/:835`→`:636/:847`; `contribution-note.ts:144`→`:153`; THREE consumers→**FOUR**; `epics.md:504`→`:509`. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-04 | 0.3 | ✅ **Task 1b CLOSED by `-198` cl.1 (FORM ONLY).** ⛔ Zero open decisions; ⚠ still blocked on **B** and **G** (⭐ G runs first, `-198` cl.2). | BigDev + Claude |
| 2026-09-04 | 0.2 | ✅ **D1 RULED (`-197`)** — mirror the configured form; ⭐ My Pool adopts it too, ⚠ **via a new story G** (it reaches THREE shipped surfaces). ⛔ **Task 1b BLOCKING:** does the member name carry the publication BASIS gate, or only the FORM? ⭐ Form-only recommended — form-plus-basis is a REGRESSION. | BigDev + Claude |
| 2026-09-04 | 0.1 | Created from `-195` cl.3 (story **E**). ⚠ **D1 is OPEN.** ⭐⭐ Finding at authoring: **the member currently sees LESS NAME than the public** — public default is `full_name`, the member path hard-codes the shielded form. ⛔ A `-189` cl.3 inversion of the same shape as `-188`, ⛔ recorded nowhere until now. ⚠⛔ **⛔ THAT FINDING WAS FALSE** — see v0.4 and `-209` cl.3; the row is ⛔ kept as the record, ⛔ not deleted. | BigDev + Claude |
