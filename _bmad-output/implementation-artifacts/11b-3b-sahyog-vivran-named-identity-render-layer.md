---
baseline_commit: 05094a68
---

<!--
⭐ **RE-PINNED 2026-09-11 by this story's FIRST `validate` pass** — `ae24a9e1` → `491a0fac`,
**188 commits** of drift. ⭐ Every claim below is RE-VERIFIED against this SHA by three independent
verifiers; ⛔ the previous anchor was DERIVED after the fact and **⛔ no claim had ever been checked**.
⚠ That debt is now DISCHARGED — and it was large: see **§ v2.0** below.
⛔ The old *"verified live at `79ed41d`"* second anchor is RETIRED — ⭐ one story, ⛔ one pin.

⚠⛔ **RE-PINNED AGAIN 2026-09-15 — `491a0fac` → `05094a68`. ⛔ THE 2026-09-11 PIN WAS ITSELF
ORPHANED.** `491a0fac` lives ⛔ only on `governance/11b-17-validate-and-panel-routing`; it is ⛔ NOT
an ancestor of `main`/`origin/main`. ⭐ Its main-line twin `05094a68` is **patch-identical**
(`65228ba4…`) **and tree-identical** (`9c3d21ab…`) ⇒ ⭐ **the CONTENT baseline was sound and only
the SHA was unreachable — ⛔ nothing below is re-argued, ⛔ no claim is re-opened.** ⛔ The note
above is KEPT as the record; this supersedes only its SHA.
⚠⚠ **BUT THE DRIFT IS REAL AND UNVERIFIED:** **24** commits and **42 files / +6039 lines** across
`packages`+`apps` have landed since `05094a68` — including
`packages/contracts/src/public-pages/sahyog-vivran.ts`, both `sahyog-vivran.json` locales,
both `sahyog-shared.json` locales,
`packages/i18n/src/catalog.ts` and `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` (+497) —
⛔ i.e. THIS STORY'S OWN SURFACE. ⭐ This pass fixed the **SHA only**; it did ⛔ **NOT** re-verify
§*What already EXISTS*. ⛔⛔ **The next `validate` pass MUST re-diff `packages apps` against the
pin before trusting any "already EXISTS" row** ([[feedback_story_validate_footguns]]).
-->

# Story 11b.3b: Sahyog Vivran Named-Identity Render Layer — Deceased Member Name + Contributor List `[SURFACE]`

Status: ready-for-dev

## ⛔ PREFLIGHT — ⚠ **ONE OPEN DECISION. ⛔ Task 2 does ⛔ not start until it is ruled.**

| | Question | State |
|---|---|---|
| **`D-percentage`** | Does the drive **PAGE** render a completion percentage on a `closed`/`settled` drive? | ⛔ **OPEN — and named to THIS story by a Trustee-ratified entry** |

⭐ `-207`'s Open follow-ups (`.decision-log.md:759-761`, Trustee-ratified 2026-09-08):
*"**11b-3b** owns the drive **page**'s `confirmedPercentage` posture (`-176` D1(b) / AC3b) … this ruling
binds the **index** only and does ⛔ not discharge 11b-3b's open question."*

⭐ **⛔ NOT a Panel matter** — it is a render posture on a surface whose exposure is already ruled.
**BigDev may author-commit it.** ⭐ **Recommendation: NO percentage** — `-207` cl.1 already took it off
the public wire for `closed`/`verified` rows, and AC3b's *"completion framing on a settled drive is a
different act"* argument is the same one. ⇒ ⭐ rule it, record it, then build.

⚠⛔ **AND `-195` cl.1's COMPLIANCE STATEMENT IS OWED (AC10)** — ⛔ not a decision, an **obligation**.

---

## ⭐ v2.0 — REWRITTEN AGAINST HEAD. ⛔ What was SUPERSEDED, and why

⚠⛔⛔ **⛔ THIS STORY WAS NEVER VALIDATED UNTIL 2026-09-11.** Authored 2026-09-02; **188 commits**
later, three independent verifiers found **~45 findings, 12 blocking**. ⭐ The **subject** survived
intact — `-173`/`-174`/`-175` are live and un-superseded, and the work is genuinely undone. ⛔ What
rotted was the **mechanism**: every artefact the old ACs named has since moved, been mechanized away,
or been ruled on by someone else.

⛔ **Kept as the record, ⛔ not deleted.** ⚠ A later reader must ⛔ not "restore" any of it.

| | What v1 said | ⛔ Why it is superseded |
|---|---|---|
| **S1** | AC3b: *"`rosterSize` and `fixedAmount` must reach the DTO"* | ⛔⛔ `rosterSize × fixedAmount` **IS लक्ष्य**. `-204` cl.3 reserves it to a `super_admin` reveal; **cl.8** closed the recovery channel *"BY CONSTRUCTION"* with *"the wire carries the PERCENTAGE only, ⛔ **never `rosterSize`**"*. ⇒ **AC3b now hoists `deliveredTotal`** |
| **S2** | Trap 3: *"D10 is author-ruled and ⛔ NOT Panel-ratified"* | ⛔ **FALSE** — `-179` **cl.2** ratified it the same day. The fence survives on `-205` cl.2's pair-pinning instead |
| **S3** | Trap 3: *"this story is its binder"* (11b.1 item (e)) | ⛔ **RE-POINTED to `8-16`** (`deferred-work.md:637-642`), which is `done` and merged FIRST |
| **S4** | AC8: *"if 8.16 has MERGED, record the CLOSURE"* | ⛔ **FORBIDDEN** — item (e)'s co-writer rule (`:1079-1082`): the one that merges **second** must *"⛔ neither re-affirm this item open ⛔ nor re-record its closure"* |
| **S5** | *"the ruled Tier-1 allowlist — **two** entries"* + *"update it by +2"* | ⛔ **FOUR** entries; and the assertions are **identity arrays**, ⛔ not counts |
| **S6** | *"`sahyog-vivran` has ZERO Tier-1 fields + a test asserting that count"* | ⛔ **FALSE both halves** — it carries **one**, and ⛔ no per-surface count test exists |
| **S7** | AC4: update `routes.ts` + `login-wall.spec.ts`, *"both stating the SAME count"*; *"11b.3a does the same in parallel"* | ⛔ **MECHANIZED AWAY by 11b.11** into `sahyog-vivran-controls.ts`; 11b.3a is **`done`**; the flip now yields **SEVEN**, ⛔ not five |
| **S8** | AC2: *"VERIFY ITEM (iii) LANDED — if absent, THIS story writes it"* | ✅ **DISCHARGED** — `epics.md:5156`, all three anchors annotated |
| **S9** | Trap 5 / AC5: RTBF omission, no mechanism named | ⛔ The substrate does ⛔ not do it — **the `ANONYMIZED_SENTINEL` backstop is now named** (AC5) |
| **S10** | *"THE MOST EXPENSIVE PAGE IN THE EPIC"* | ⛔ **No longer true** — `-205` cl.5: the index already steps to **~150** decrypts |
| **S11** | Header: *"NEITHER is ratified … STOP gate ⛔ unchanged"*; *"`D10` still open; `D9` open"*; Task 0's STOP | ⛔ All three were **stale projections** contradicted by the file's own later sections. `-177` ruled both |
| **S12** | *"ZERO OPEN DECISIONS"* | ⛔ **FALSE** — `-207`'s follow-up re-opened one (**`D-percentage`**) |
| **S13** | `D9` / `D10` used bare, colliding with 11b.1's and 11b.2's | ⛔ **RENAMED `D9-inversion` / `D10-rowkey`** per `-168` **cl.9** |

⭐⭐ **THE `-177` vs `-182` QUESTION IS RESOLVED AND IS ⛔ NOT A DEFECT.** `-182:3217` lists D9/D10 as
open; ⭐ it **transcribes a 2026-09-01 ruling** and its own Status line says it *"supersedes, reverses
and vacates **nothing**"*. ⇒ `-177` (ruled 2026-09-02) is authoritative. ⚠ `-182` owes a one-line
forward pointer — ⛔ an amendment, ⛔ never a rewrite ([[feedback_supersede_never_reinterpret]]).

---

## Story

As a **non-member visitor** reading a Sahyog Vivran,
I want to see **whose drive this was** and **who stood behind it**,
so that the page reads as a record of a community act rather than an anonymous ledger entry — with
each name appearing on **that person's own instrument**, in **the form the Trustee Panel ruled**, and
⛔ never in a form an engineer chose.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⚠ **TWO predicates gate what a person sees. ⭐ BOTH are now RULED** (they were open when v1 was written):

1. **The contributor predicate.** *"Your name can appear on the public list of people who contributed
   to a drive because **you** accepted the membership Terms & Conditions."*
   ✅ **Basis** `-160` cl.7 · ✅ **Declaration + Form** `-174`, unconditional per `-175`: **FULL NAME**.
2. **The deceased-member predicate.** *"Your name can appear on the public page for the drive run in
   your memory because **you** accepted a version of the T&C that says so — ⛔ not because your family
   ticked a box."*
   ✅ **RULED** `-173`: **FULL NAME**. ⚠⛔ **But the basis is UNSATISFIABLE TODAY** — see Trap 1.

⛔⛔ **AND THE NON-PREDICATE:** ⛔ no predicate here may read `members.state`, `is_valid`, or a
moderation overlay. A contributor's name is ⛔ **never** removed because they died (11b.1 D9(a));
⛔ RTBF is a separate rule and is ⛔ NOT collapsed into it (Trap 4).

## 🎯 What already EXISTS — ⭐ re-verified live at `491a0fac` ≡ `05094a68` (tree-identical), ⛔ not assumed

⚠⛔ **STALE-RISK, ⛔ not a re-verification:** these rows were checked at the pin. **24** commits have
landed on `main` since, touching this story's own surface (see the header note) ⇒ ⭐ re-diff before use.

| Fact | Where | ✓ |
|---|---|---|
| The `@twt/ui` `contribution-list` presenter emits name **PARTS** and ⛔ never joins them; the `unknown` arm **THROWS** | `packages/ui/src/contribution-list/presenter.ts:67-80` | ⭐ read |
| ⚠ The shipped contributor wire is still the **SHIELDED** shape — ⛔ **the wrong form for this surface** | `packages/contracts/src/contributions/pool-contributor-list.ts:42-51` | ⭐ read |
| `resolvePublicMemberName` — Pariwar-configured; `full_name` is the **DEFAULT**, ⛔ never a literal | `packages/domain/src/kyc/public-name.ts:73`; default `:62` | ⭐ read |
| ⭐⭐ `resolvePoolIdentity` **NO LONGER hard-codes shielded** — 8.16 shipped it **mode-resolved** | `packages/domain/src/notifications/pool-identity.ts:201`, mode param `:205` | ⭐ read |
| ⚠ The Tier-1 allowlist holds **FOUR** entries, **two on 11b surfaces** | `packages/contracts/src/public-pages/matrix.ts:398-476` | ⭐ read |
| ⚠ `sahyog-vivran` already carries **ONE** Tier-1 field | `public-vs-private-matrix.yaml:1150-1152` | ⭐ read |
| `apps/public` has **⛔ NO** `@twt/ui` dependency — ⭐ adding it is **this story's act** | `apps/public/package.json` | ⭐ read |
| ⭐ The rupee figure is **ALREADY COMPUTED SERVER-SIDE** | `packages/domain/src/pool/sahyog-vivran-read.ts:509` — `deliveredTotal` | ⭐ read |
| The control set is now **ONE constant**, which names this story as owner | `apps/api/src/modules/public-pages/sahyog-vivran-controls.ts:56-60` | ⭐ read |

## ⛔ THE SIX TRAPS

### Trap 1 — ⭐⭐ A RULING IS ⛔ NOT A RENDER, AND THE TWO NAMES DIVERGE HERE

⛔⛔ **THE DECEASED NAME RENDERS ⛔ NOTHING ON THE DAY THIS SHIPS.** `NAME_PUBLICATION_AUTHORISED`
(`public-read.ts:380-397`) requires a `clause_versions` row for `niy.public-disclosure.member-information`
— ⭐ re-verified 2026-09-11: **ONE site in the whole repo, its own definition** (`:260-261`). ⛔ No
migration, ⛔ no seed, ⛔ no writer. ⇒ the predicate is **false for every member**, ⭐ fail-closed and
therefore **correct** (`-209` cl.2).
⛔⛔ **⛔ DO ⛔ NOT SEED A PLACEHOLDER ROW** — `public-read.ts:252-253` forbids it in terms: *"a stand-in
makes names render on an authority that does ⛔ not exist."* ⭐ A favourable ruling is exactly when that
shortcut stops looking like a lie. ⚠ Counsel's clause is **OVERDUE since 2026-09-07** and re-verified
absent 2026-09-11.

⚠⛔⛔ **BUT THE CONTRIBUTOR LIST IS ⛔ NOT GATED, AND THIS IS THE STORY'S REAL DAY-ONE OUTPUT.**
⭐ The contributor predicate has **⛔ no clause gate anywhere in the code** — its basis is `-160` cl.7,
**settled**. `NAME_PUBLICATION_AUTHORISED` keys on `claims.deceased_member_id`, ⛔ not on contributors.
⇒ ⛔⛔ **this story publishes up to FIFTY living members' FULL LEGAL NAMES on an unauthenticated,
edge-cached page — while the deceased member it is named for renders nothing.**
⚠ ⛔ That asymmetry was **stated nowhere in v1**, and it is the opposite of what the title implies.
⭐ It is **ruled and intended** (`-174` + `-175`); ⛔ it is ⛔ not a defect. ⛔ But ⛔ do ⛔ not ship it
believing the page is dark.

### Trap 2 — ⛔⛔ `rosterSize` AND `fixedAmount` ARE लक्ष्य. ⛔ NEITHER GOES ON THIS WIRE

⚠ v1's AC3b ordered both onto the public DTO, following `-176`'s *"the presenter needs five keys"*.
⛔⛔ **That sentence is labelled in the log as an *"Implementation note, ⛔ not a ruling"*** — and five
days later `-204` closed the door:

- **cl.2:** लक्ष्य **IS** `assignedCount × pools.fixed_amount`.
- **cl.3:** it stays **invisible by default**; ⛔ only a `super_admin` may reveal it, separately for
  member and public (`-190` cl.7(b)/(c) upheld; `-211` cl.3 — ⛔ **no Pariwar has a row today**).
- **cl.8:** the arithmetic-recovery channel is ***"CLOSED BY CONSTRUCTION, ⛔ not mitigated"***, closing
  with ***"the wire carries the PERCENTAGE only, ⛔ never `rosterSize`, computed server-side (minimum
  disclosure)."***

⇒ ⛔ publishing both factors hands every unauthenticated visitor the figure `-204` cl.3 reserved, and
re-opens **by hand** the channel cl.8 closed. ⚠ ⛔ **No gate catches it.**
⭐⭐ **AND THE FIX COSTS NOTHING:** `sahyog-vivran-read.ts:509` **already computes**
`deliveredTotal = confirmedContributionCount * row.fixedAmount` — ⭐ server-side, in this very read.
**11b.14 solved the identical problem this way for the index** (*"returns `deliveredTotal`, ⛔ never a
new multiplication"*). ⇒ **hoist it; publish ⛔ neither factor; ⛔ do ⛔ not call the presenter here.**
⚠ This satisfies `-176` **D1(b)** (the canonical *definition* is consumed, ⛔ not forked) and keeps
**D1(c)** refused.
⚠⛔ **The contract contradicts itself and BOTH halves are live:** `sahyog-vivran.ts:56` still invites
the two fields while `:60-61` forbids *"NO TARGET, EXPECTED TOTAL, PERCENTAGE, SHORTFALL OR COMPARISON
FIGURE — in any field, under any name."* ⇒ **Task 2 amends `:56` BY NAME.**

### Trap 3 — ⛔ SHIELDING DOES ⛔ NOT LOWER THE TIER — EVERY FORM NEEDS AN ALLOWLIST ENTRY

`MatrixFieldSchema.superRefine` is fail-closed both ways (`matrix.ts:175-200`): `pii_tier: 1` at
`tier: public` **without** a `tier1_public_exception` **FAILS**.
⚠ *"first-name + last-initial isn't really Tier-1"* is ⛔ **not** available — `public-vs-private-matrix.yaml:60`:
`pii_tier` is *"a FACT about the data; ⛔ never changed to permit a render."*
⭐⭐ **AND THERE IS NOW A WORKED PRECEDENT, ⛔ not just an inference:** `-205` **cl.2** — the allowlist
pins **(surface, field) PAIRS** *"precisely so that this second surface needs its own authority"*, and
`matrix.ts:453-459` says it in terms: *"IT IS ⛔ NOT AN INHERITANCE FROM THE ENTRY ABOVE, AND THAT IS
THE WHOLE POINT OF PINNING PAIRS."*
⇒ ⭐ **this — ⛔ not "D10 is unratified" — is why `/sahyog`'s form is no precedent here.**
⚠⛔ **v1's ground was FALSE: `-179` cl.2 PANEL-RATIFIED D10** and `deferred-work.md:1060` now reads
*"✅ CLOSED (first half)"*. ⛔ Do ⛔ not restore the old argument.

### Trap 4 — ⛔ RTBF REMOVES THE CONTRIBUTOR ENTIRELY — AND THE SUBSTRATE DOES ⛔ NOT DO IT FOR YOU

`-169`: RTBF removes the contributor — ⛔ no anonymized row, ⛔ no marker, ⛔ no placeholder key — and
the omitted contributor **still counts** toward every aggregate. `-170`: the guarantee lives on the
**decrypted plaintext**, ⛔ not the lifecycle-state read, and ⛔⛔ a per-row state re-check is
**FORBIDDEN** as a TOCTOU mitigation. `-172`: the guarantee ends **AT THE WIRE**.

⛔⛔ **AND HERE IS THE MECHANISM v1 NEVER NAMED.** `anonymizeMember` overwrites `name_ciphertext`
**in place** with an *encrypted* `[anonymized]` sentinel and **RETAINS the row**
(`packages/domain/src/member/anonymize.ts:70,107`) ⇒ ⭐ **the decrypt SUCCEEDS.**
⚠⛔ `splitFirstNameLastInitial('[anonymized]')` returns a **NON-EMPTY `firstName`**, so the empty-name
guard ⛔ does ⛔ not catch it (`member-pool/handlers.ts:762-773`). And `member/read.ts:183-187`:
the lifecycle map is **PERMISSIVE** and *"⛔ NOT a sufficient erasure guarantee on its own."*
⇒ ⭐ **compare the DECRYPTED PLAINTEXT to `ANONYMIZED_SENTINEL` and omit the row** — the
`member-pool/handlers.ts:771` pattern. ⛔ Without it this surface renders **`[anonymized]`** where a
person's name belongs.

⚠ **The edge cache is this surface's MMKV equivalent:** an erasure keeps being served from every warm
PoP at `s-maxage=300` (`[driveToken].astro:196`). ⛔ State it; ⛔ do ⛔ not re-derive it as new.

### Trap 5 — ⭐⛔ *"FULL NAME"* IS A **CEILING**, ⛔ NOT A LITERAL — ⭐ AND 8.16 MADE THIS SHARPER

`-173`/`-174` ruled the full name **AUTHORISED**. ⛔ They did ⛔ not make it a constant:
- `-136` **cl.1** — *"a build in which the public name form cannot be changed without a code change
  **FAILS** this clause."* `public-name.ts:62` implements a **DEFAULT**, ⛔ never a literal.
- ⭐ The real sibling call site is `apps/api/src/modules/public-pages/handlers.ts:516-526`, which
  resolves `sahyog-drive`'s `deceasedMemberName` through `resolvePublicMemberName`.
  ⚠⛔ **v1 cited `sahyog-render.ts:213` — ⛔ WRONG FILE.** That quote lives in `members-render.ts:101`,
  the **Member Directory** renderer; 11b.14 rewrote `sahyog-render.ts` and `:213` is now `driveTargetLine`.
- ⭐⭐ **8.16 SHIPPED.** `pool-identity.ts:201` returns **one** mode-resolved `deceasedDisplayName`
  *"so 'one identity everywhere' is a property of the **TYPE** rather than a convention four call sites
  are trusted to keep."*

⇒ ⛔⛔ **A HARD-CODED FULL NAME HERE IS NOW THE LAST REMAINING WAY TO RE-OPEN THE DIVERGENCE.** ⭐ The
member side is a type-level invariant; this Astro layer is the **only** consumer not protected by it.
⚠ ⛔ Not caught by any gate — every allowlist, tier and CI check passes on a literal.

⚠⛔ **THE MONONYM HALF IS EQUALLY LIVE.** In `shielded_name` mode `resolvePublicMemberName` returns
**`''`** for a single-token name (`public-name.ts:98`, `-145` cl.3) and every caller treats `''` as
*omit this row*. ⛔ Do ⛔ **not** "fix" it by falling through to `firstName`: `:86` records that exact
bug — for a mononym it returns **the entire stored legal name**, byte-identical to `full_name`.
⚠ **Mononyms are common in India; ⛔ this is not a corner case.** ⇒ **AC3 rules it for both subjects.**

⚠⛔ **AND ⛔ DO ⛔ NOT "ALIGN" THE TWO RESOLVERS.** `pool-identity.ts:112-137` records why the member
side must ⛔ not reuse the public one: *"`''` there means BOTH 'unresolvable name' AND 'mononym that
cannot be shielded'."* ⭐ On the member side a mononym is **SHOWN**; here it is **omitted**
(`pool-identity.ts:148-151`) — ⛔ that single divergence is **UNCHANGED by 8.16** and must ⛔ not be
reported as a closed inversion.

### Trap 6 — ⚠ THE LADDER: `-175` cl.4 SAYS ⛔ *"DO NOT REACH FOR IT HERE"* — ⭐ READ WHAT *"HERE"* MEANS

`-175` **cl.4**: *"the ratified per-Pariwar ladder — `full_name` → `shielded_name` → omitted — ⛔ was
**never adopted** for this surface by `-174` … It remains the **Member Directory's** presentation mode.
⛔ Do ⛔ not reach for it here."*

⚠⛔ **v1 transcribed that AND ordered the reach, 80 lines apart, with ⛔ no reconciliation.**
⭐ **The distinction, stated once:** `-175` cl.4's subject is the **staged-reduction / masked-state**
question (`D13-maskedname`, **VACATED**) — ⛔ *what "masked" means for a name*. It is ⛔ **not** the
**form-resolution** question, which `-136` cl.1 governs and which the sibling public surface
**already implements** at `handlers.ts:516-526`.
⇒ ⭐ **resolve the form through `resolvePublicMemberName`; ⛔ do ⛔ not import the ladder as a policy.**
⛔ Do ⛔ not delete either half of this tension — ⭐ it is recorded so it is ⛔ not re-litigated.

---

## Acceptance Criteria

### AC0 — Governance first
⭐ **`D-percentage` is ruled and recorded** before Task 2. ⛔ One `governance:` commit, ⛔ no code
([[feedback_governance_commits_precede_implementation]]).

### AC1 — The rulings are cited; the inert state is preserved
✅ `-173` (deceased) and `-174` (contributor), each **YES at the FULL NAME**; `-175` made them
**UNCONDITIONAL** — ⛔ do ⛔ not carry the withdrawn staged-reduction condition forward.
**And** ⛔ the deceased name still **⛔ does not RENDER** until counsel's clause exists and is pinned
(**OVERDUE since 2026-09-07**; re-verified absent 2026-09-11). ⭐ That is the **designed inert state**,
⛔ not an incomplete implementation, and ⛔⛔ **no placeholder row may be seeded.**

### AC2 — Two allowlist entries land WITH their field declarations, in ONE commit
⭐ `sahyog-vivran.contributor_name` (cites **`-174`**) and `sahyog-vivran.deceased_member_name`
(cites **`-173`**), each `scope:` block stating the **ruled FULL NAME form** and fencing it to **this
surface**; ⭐ for `contributor_name`, recording that `-174` cl.3's apparent condition was **CORRECTED
away by `-175`**.
⚠⛔ **THE LIST HOLDS FOUR ENTRIES, ⛔ NOT TWO** (`matrix.ts:398-476`) ⇒ this story makes it **SIX**.
⚠⛔ **AND THE ASSERTIONS ARE IDENTITY ARRAYS, ⛔ NOT COUNTS** — ⛔ there is ⛔ no "+2" to make:
`scrape-test.spec.ts:1481` (`toEqual(['nominee_account_holder_name'])`) and
`public-pages.test.ts:522` (the `'…@decision-id'` snapshot). ⇒ add **named strings with their
decision ids**.
**And** ⭐ amend the fence at **`matrix.ts:407-408`** (⛔ not `:401-402`) — its first half goes UNTRUE
for `sahyog-vivran` and must **stay true for 11b.6**. ⚠⛔ Respect the guard three lines above
(`:405-406`): *"⚠ COMMENT ONLY — ⛔ changing the entry or its cited decision is a governance act."*
**And** ⚠ the three stale epic ACs are **already annotated** — `epics.md:3156-3160` · `:3257-3261` ·
`:5045-5049`, under item (iii) at **`:5156`**. ⭐ **DISCHARGED; ⛔ do ⛔ not re-do it.**

### AC3 — `apps/public` adds `@twt/ui`; the Astro layer is authored over the SHARED presenter
⭐ C-1 ruled this *"an **ORDINARY DEPENDENCY ADDITION**"* (`-154` cl.6, `.decision-log.md:6388-6400`;
⭐ *"there was no declination"* at `:6394`). ⚠ `@twt/ui`'s own deps stay exactly `@twt/contracts`.
**And** ⭐ **the form resolves through `resolvePublicMemberName(mode, storedName)`** under the Pariwar's
**stored** mode — ⛔ never a literal (Trap 5), ⛔ never `resolvePoolIdentity`.
**And** ⭐ **the mononym rule is ruled HERE for both subjects**: `''` ⇒ **omit the row**; ⛔ ⛔ no
fall-through to `firstName`.
**And** ⚠ a **per-row `try/catch`** (the `PoolContributorList.tsx:108-124` pattern) ⇒ ⛔ one bad row
must ⛔ not take down the surface.

### AC3b — The rupee figure comes from `deliveredTotal`, and ⛔ NEITHER FACTOR crosses
⭐ Per **Trap 2**: hoist `sahyog-vivran-read.ts:509`'s `deliveredTotal` onto the DTO as the amount.
⛔⛔ **⛔ NO `rosterSize`. ⛔ NO `fixedAmount`. ⛔ NO percentage, target, expected total, shortfall or
comparison figure — in any field, under any name.**
**And** ⛔ **⛔ never `confirmedCount × fixedAmount` written in this diff** — that is `-176` **D1(c)**,
**REFUSED**.
**And** ⭐ **a test asserts ⛔ no second multiplication** anywhere in `apps/public`.
**And** ⚠ `D-percentage` governs whether a percentage renders at all — ⛔ ruled at AC0, ⛔ not here.
**And** ⭐ Task 2 **amends `sahyog-vivran.ts:56`** — the comment that invites the two fields is ⛔ now
wrong and contradicts `:60-61`.

### AC4 — Paginated, deterministically ordered, ⛔ never a leaderboard
⭐ Page size **50**, deep-page horizon **200** (`pagination.ts:39`, `:65`, `parsePageParams` `:121`).
⭐ Ordering is the **earliest LIVE confirmation's `event_version`** — ⛔ **never `member_id`**
([[project_confirmed_contributor_read_is_ordered]]).
⭐ Bounded decrypt: `mapWithConcurrency` + `DIRECTORY_DECRYPT_CONCURRENCY = 8`
(`bounded-decrypt.ts:46`, `:28`; live pattern at `public-pages/handlers.ts:62`, `:201`).
⚠⛔ ⛔ Do ⛔ **not** copy `member-pool/handlers.ts:406-408`, which **HALVES** the bound for its
**two-decrypt-per-row** path (`:389-396`). ⭐ A contributor row is **one** decrypt ⇒ the full constant
is right here.
⚠ **One KMS round-trip per row is irreducible** — *"envelope encryption gives every stored name its
own DEK, so there is ⛔ no shared secret to decrypt once and reuse"* (`handlers.ts:188-189`).
⚠⛔ **⛔ DO ⛔ NOT CALL IT "THE MOST EXPENSIVE PAGE IN THE EPIC"** — `-205` cl.5: the **index** already
steps to **~150** decrypts. ⭐ 50 + 1 is this page's post-merge figure.
**And** ⭐ **the control set is ONE constant now** — `sahyog-vivran-controls.ts:56-60`, which names this
story as owner: *"11b.3b adds two entries HERE, in its own commit."* ⛔ The YAML states ⛔ no number.
⚠⛔ **THREE SHIPPED ASSERTIONS INVERT, BY DESIGN** — `login-wall.spec.ts:425` (`toHaveLength(5)`),
`:429-435` (the id identity array), `:445-448` (the `kind === 'control'` filter). ⭐ **The set becomes
SEVEN** (11b.10 added control 7) — ⛔ **not** the *"SIX"* that file's `:247` predicts, which is
arithmetically stale. ⛔ Amend each **BY NAME** ([[feedback_supersede_never_reinterpret]]).
**And** ⛔ ⛔ no rank, ⛔ no total-per-contributor, ⛔ no sort by amount.

### AC5 — RTBF, the erasure backstop, and the row key
⭐ Per **Trap 4**: the omitted contributor is **absent entirely** and **still counts**.
**And** ⭐⭐ **the `ANONYMIZED_SENTINEL` check on the DECRYPTED PLAINTEXT** — the
`member-pool/handlers.ts:771` pattern, snapshot-independent, ⛔ never a marker.
**And** ⛔ ⛔ **no per-row lifecycle re-check** — `-170` forbids it as a TOCTOU mitigation.
**And** ⭐ **`D10-rowkey`(a) RULED: there is ⛔ NO ROW KEY.** ⛔ Not `index`, ⛔ not `member_id`, ⛔ not a
token. Astro SSR emits static HTML with ⛔ no reconciler.
**And** ⛔ Story 8.3's `keyExtractor` deferral is **RE-AFFIRMED OPEN**, trigger re-pointed to *"the
first VIRTUALIZED render of a **multi-pool contributor** list"*, citing `-177`. ⚠ 11b.15 shipped a
stable-key FlashList (`MemberDriveList.tsx:347`) — ⭐ per-**drive**, ⛔ not per-contributor ⇒ the
trigger has ⛔ **not** fired. ⛔ Record it so a reviewer does ⛔ not read `D10-rowkey`(a) as *"this repo
never keys FlashLists."*

### AC6 — The buildable public column inventory is NAMED [11b.1 item (f)]
⭐ Annotate at the **canonical** block — `ux-design-specification.md:1311-1330` (⛔ **not**
`:1287-1298`; the heading is `:1298`). ⭐ Cite it **by section title**, ⛔ not by line.
⚠ The **not-buildable** half is **already named** there with all ten dispositions ⇒ ⭐ **only the
BUILDABLE half is owed.**
**And** ⛔ `Donor Name` is ⛔ **no longer "CONDITIONAL on D2"** — D2 is **RULED**; it is buildable at the
full name. ⚠ `microcopy.yaml:42` (`donor`) and `:48` (`Late Teacher`) stay `member_only: true` ⇒ the
**labels** remain fenced.
**And** ⭐ the ground is `-132` **cl.1 (R1/R7)**, ⛔ not cl.3 (the RBAC eligibility-class axis).

### AC7 — Accessibility + i18n
⭐ Family 13 in its **WEB** form; a **real `t()`** assertion across **both** locales.
⚠ All ten `CONTRIBUTION_LIST_I18N_REFS` carry `namespace: 'contribution'` (`i18n-keys.ts:32-43`),
shipping at `locales/{en,hi}/contribution.json:30-39` ⇒ ⭐ **REUSE ONLY; ⛔ nothing is minted there.**
⚠⛔ **⛔ Do ⛔ not say "no third namespace" — `sahyog-shared` EXISTS** and `-214` routes ratified copy
there via `11b-19`. ⭐ The rule is: ⛔ do ⛔ not copy the ten `contribution_list.*` keys into a second home.
**And** ⛔⛔ **MINTED COPY MAY ⛔ NEVER CLAIM THE LIST IS COMPLETE** — two shipped doc-blocks say so
(`sahyog-vivran.ts:380-382`, `sahyog-vivran-read.ts:336`): this page reads *"N confirmed"* beside
**FEWER than N named rows BY DESIGN**. ⭐ Three independent omissions cause it: RTBF (`-169`), the
mononym (`-145` cl.3), and the erasure sentinel (AC5).
**And** ⚠ the public stage vocabulary is **RULED** — `-191` cl.3: `live`→**Live**, `closed`→**Closed**,
`settled`→**Completed**. ⛔ *"Active"*, *"Collecting"*, *"Archive"* are **retired**.

### AC8 — What this story does ⛔ NOT build is ROUTED
⛔ ⛔ No member surface · ⛔ no masking change · ⛔ no `@twt/ui` fence lift beyond `apps/public` ·
⛔ no index change.
**And** ⛔⛔ **⛔ TOUCH `deferred-work.md` ITEM (e) ⛔ NOT AT ALL.** ⚠ Its binder was **RE-POINTED to
`8-16`** (`:637-642`), `8-16` merged **FIRST**, and item (e)'s co-writer rule (`:1079-1082`) says the
one merging **second** must *"⛔ neither re-affirm this item open ⛔ nor re-record its closure."*
⇒ ⭐ **this story is the second. It does neither.** ⛔ v1's *"record the CLOSURE"* branch is **WITHDRAWN**.
**And** ⚠⛔ ⛔ **do ⛔ not write *"the member app shields on three"*** or any present-tense form of the
inversion comparison — `-209` cl.3 ruled that class **false for every drive** and forbade paraphrase.
⭐ A **conditional** statement is permitted (`-209` cl.4); a **present-tense** one is not.
**And** ⭐ carry the `deferred-work.md:8477-8487` **back-reference** — story D's Trap 10 routed it here
by name (*"Trigger: `11b-3b`'s Task 0 annotation"*) and ⛔ v1 carried it **nowhere**.
**And** ⚠ record for **`11b-20`**: ⛔⛔ **this story discharges the AMOUNT unconditionally and the NAME
only CONDITIONALLY.** ⭐ `11b-20`'s gate for the name half is **the pinned clause**, ⛔ not this story's
merge ([[feedback_mechanization_split_commitment]]).

### AC9 — Five shipped tests invert, and a negative control loses its subject
⭐ Each is amended **BY NAME**, ⛔ never deleted quietly:
`scrape-test.spec.ts:1553` (`deceased_member_name` absent → present) · `:1562` (`paginated: false` →
`true`) · `sahyog-vivran-render.test.ts:109` and `sahyog-vivran.spec.ts:385` (the two *"NO rupee
figure"* fences → AC3b makes them false) · **and the negative control that plants
`'deceased_member_name'` as its undeclared id** — ⭐ this story **declares** that field, so the control
loses its subject. ⛔ Do ⛔ not "fix" it by deleting the leg: **re-plant a genuinely undeclared id and
name it.**

### AC10 — ⭐ The `-195` cl.1 compliance statement is WRITTEN
⭐ `-189` cl.3 / `-195` cl.1 ruled *"**A MEMBER MUST SEE MORE THAN THE PUBLIC, AND ⛔ NEVER LESS**"* a
**DATA-CLASS invariant**, with *"each must state its compliance."* ⛔ v1 cited neither.
⇒ ⭐ this story states its compliance for **both** data classes it publishes, ⛔ in one place.

---

## ⚖️ Decisions

- ✅ **D2** — contributor declaration + form: **RULED, Panel, FULL NAME** (`-174`; unconditional `-175`).
- ✅ **D3** — deceased member on this surface: **RULED, Panel, FULL NAME** (`-173`).
- ✅ **`D9-inversion`(a)** — **CARRY** the inversion (`-177` cl.2). ⚠ **RENAMED** from bare `D9` per
  `-168` **cl.9** (*"two different D5s in one sibling set is exactly how a ruling gets applied to the
  wrong question"*): 11b.1 and 11b.2 each have their own `D9(a)`.
- ✅ **`D10-rowkey`(a)** — **NO row key** (`-177` cl.3). ⚠ **RENAMED** from bare `D10`: 11b.1's `D10`
  is the `/sahyog` full-name ruling, **Panel-ratified at `-179` cl.2**.
- ⛔ **`D-percentage`** — **OPEN.** See the Preflight.
- ⭐ **VACATED by `-175`:** `D14-order` · `D12-schedule` · `D13-maskedname` · `D11-order` — ⛔ their
  QUESTIONS ceased to exist; ⛔ they were ⛔ not rejected.

## Tasks / Subtasks

- [ ] **Task 0 — RULE `D-percentage`; GOVERNANCE** (AC0, AC10) — record the ruling; write AC10's
      compliance statement; add the `deferred-work.md:8477` back-reference; ⛔ one `governance:` commit.
  - [ ] ⚠ Append a forward pointer to **`-182`** noting its D9/D10 enumeration was superseded by
        `-177` — ⭐ an **amendment**, ⛔ never a rewrite.
- [ ] **Task 1 — The two fields + two allowlist entries, ONE commit** (AC2) — ⭐ identity arrays, ⛔ not
      counts; amend `matrix.ts:407-408`; ⛔ do ⛔ not re-do item (iii).
- [ ] **Task 2 — `@twt/ui` + the Astro render layer** (AC3, AC3b) — ⛔ **after** `D-percentage`.
      ⭐ Hoist `deliveredTotal`; ⛔ neither factor; amend `sahyog-vivran.ts:56`.
- [ ] **Task 3 — Pagination, ordering, the anti-leaderboard fence, the control set** (AC4) — ⭐ edit
      `sahyog-vivran-controls.ts`; amend the three `login-wall.spec.ts` assertions **by name**; the
      count is **SEVEN**.
- [ ] **Task 4 — RTBF + the erasure backstop + the row key** (AC5) — ⭐ the `ANONYMIZED_SENTINEL`
      plaintext check is ⛔ **not** optional.
- [ ] **Task 5 — The buildable column inventory** (AC6) — annotate at `ux-design-specification.md:1311-1330`.
- [ ] **Task 6 — a11y (web form) + real-`t()` both locales + the completeness fence** (AC7).
- [ ] **Task 7 — Route what is not built** (AC8) — ⛔ item (e) untouched; the `11b-20` note.
- [ ] **Task 8 — Amend the five inverted tests and re-plant the negative control** (AC9).

## Dev Notes

### ⭐ Read Trap 1 before anything else

⚠ The title says *"named identity"*; ⭐ **the deceased name is the half that renders nothing.** The
contributor list is the half that ships — and it ships **fifty full legal names of living members** on
a public, edge-cached page. ⇒ ⛔ do ⛔ not size, review or announce this story as *"mostly dark."*

### ⚠ Three names, three subjects — ⛔ do ⛔ not cross them

- `resolvePublicMemberName` (`kyc/public-name.ts:73`) — the **LIVING** member, public, fails **closed**.
- `resolveMemberFacingDeceasedName` (`notifications/pool-identity.ts`) — the **DECEASED** member,
  **member** surfaces. ⛔ Never on a public path.
- The **account-holder** value — claim-scoped free text routing through **neither**;
  `deferred-work.md` **`D5-subject (i)`** rules **the SCHEMA the authority**.

### Testing standards

⭐ Astro SSR + live-DB for the read and the boundary. ⚠ Assert **membership and explicit values**,
⛔ never counts over the shared fixture ([[project_live_db_test_gotchas]]).

### References

- `.decision-log.md` `-173` · `-174` · `-175` (cl.4) · `-176` D1(b)/(c) · **`-177` cl.2, cl.3** ·
  `-179` **cl.2**, cl.3 · `-180` cl.1 · `-181` · **`-189` cl.3 / `-195` cl.1** · `-190` cl.1, cl.2,
  cl.7(b)/(c) · `-191` cl.1, **cl.3** · **`-204` cl.1, cl.2, cl.3, cl.8** · **`-205` cl.1, cl.2, cl.5** ·
  **`-207` cl.1, cl.2 + Open follow-ups** · `-208` cl.2 · `-209` cl.2, cl.3, cl.4 · `-211` cl.3 ·
  `-214` · `-160` cl.7 · `-165` cl.2-4 · `-168` **cl.9** · `-169` · `-170` · `-172` · `-136` cl.1, cl.2 ·
  `-145` cl.3 · `-154` cl.6 · `-159` cl.2 · `-132` cl.1
  ⚠⛔ **⛔ CITE BY CLAUSE, ⛔ NOT BY LINE** — the log is newest-first; every v1 line pointer had rotted.
- `packages/contracts/src/public-pages/matrix.ts:394-397`, `:398-476`, `:405-406`, `:407-408`
- `packages/domain/src/pool/public-read.ts:252-259`, `:260-261`, `:380-397`
- ⭐ `packages/domain/src/pool/sahyog-vivran-read.ts:509` — **`deliveredTotal`**, AC3b's source
- `packages/contracts/src/public-pages/sahyog-vivran.ts:56` (⛔ amend), `:60-61` (the fence that stands)
- `packages/domain/src/kyc/public-name.ts:62`, `:73`, `:86`, `:98`
- `packages/domain/src/notifications/pool-identity.ts:112-137`, `:148-151`, `:201`
- `apps/api/src/modules/public-pages/handlers.ts:62`, `:188-189`, `:201`, `:516-526`
- `apps/api/src/modules/public-pages/sahyog-vivran-controls.ts:56-60`
- `apps/api/tests/integration/login-wall.spec.ts:247` (⚠ stale "SIX"), `:425`, `:429-435`, `:445-448`
- `apps/api/src/modules/member-pool/handlers.ts:762-773`, `:771`; `packages/domain/src/member/anonymize.ts:70`, `:107`; `packages/domain/src/member/read.ts:183-187`
- `apps/public/src/lib/members-render.ts:101` (⭐ the real `-136` cl.2 quote; ⛔ **not** `sahyog-render.ts:213`)
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts:1481`, `:1553`, `:1562`; `packages/contracts/tests/public-pages.test.ts:522`
- `apps/public/tests/sahyog-vivran-render.test.ts:109`; `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts:385`
- `_bmad-output/planning-artifacts/ux-design-specification.md:1298`, **`:1311-1330`**, `:1158`
- `deferred-work.md` **item (e)** (`:637-642`, `:1060`, `:1079-1082`) · **item (f)** · **`D5-subject (i)`** · **`:8477-8487`**
- `epics.md:3156-3160`, `:3257-3261`, `:5045-5049`, **`:5156`** (item (iii), ✅ discharged), `:5152`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Description | Author |
|---|---|---|
| 2026-09-15 | ⚠⛔ **PIN REPAIR ONLY — `491a0fac` → `05094a68`. ⛔ NO CODE, ⛔ NO ROWS MOVE, ⛔ NOTHING RE-ARGUED.** The 2026-09-11 v2.0 re-pin was ⛔ **itself orphaned** — `491a0fac` survives only on `governance/11b-17-validate-and-panel-routing` and is ⛔ NOT an ancestor of `origin/main`. ⭐ Re-pinned to its main-line twin `05094a68`: **patch-identical** (`65228ba4…`) **and tree-identical** (`9c3d21ab…`) ⇒ ⭐ the CONTENT baseline was sound; only the SHA was unreachable. ⭐ Every v2.0 finding stands **verbatim and unre-opened**. ⚠⚠ **What this pass did ⛔ NOT do:** re-verify §*What already EXISTS*. **24** commits / **42 files / +6039 lines** in `packages`+`apps` have landed since the pin, hitting this story's own surface (`contracts/src/public-pages/sahyog-vivran.ts`, both `sahyog-vivran.json` + `sahyog-shared.json` locales, `i18n/src/catalog.ts`, `sahyog-shared-dark-copy.test.ts` +497) ⇒ ⛔ the drift is **RECORDED AND CARRIED AS RISK**, ⛔ **not backfilled** ([[feedback_record_unattested_no_backfill]]). ⭐ Sibling check in the same sweep: `11b-17` (`a2617869`) and `6-18` (`55912d83`) pins re-checked LIVE ⇒ ⭐ **both are ancestors of `origin/main` — SOUND**, ⇒ the 2026-09-09 *"`11b-17` and `6-18` still carry ORPHANED pins; `11b-3b` has NO pin"* note is **superseded on all three counts** (the first two were repaired at their own validate passes; `11b-3b` had a pin, and it was the broken one). ⛔ Row stays `ready-for-dev`. | BigDev + Claude |
| 2026-09-11 | ⛔⛔ **v2.0 — REWRITTEN AGAINST HEAD after the story's FIRST `validate` pass (three independent verifiers, ~45 findings, 12 BLOCKING). ⛔ NO CODE.** ⭐ Baseline **RE-PINNED** `ae24a9e1` → `491a0fac` (**188 commits**; the old anchor was DERIVED and ⛔ no claim had ever been verified). ⭐ **THE SUBJECT SURVIVED INTACT** — `-173`/`-174`/`-175` are live, un-superseded, and the work is genuinely undone. ⛔ **What rotted was the MECHANISM.** ⛔⛔ **BLOCKING, in the order they would have bitten:** (1) AC3b ordered **`rosterSize` + `fixedAmount`** onto a public wire — ⭐ their product **IS लक्ष्य**, which `-204` **cl.3** reserves to a `super_admin` reveal and **cl.8** closed *"BY CONSTRUCTION"* with *"the wire carries the PERCENTAGE only, ⛔ never `rosterSize`"* ⇒ **AC3b now hoists `deliveredTotal`** (already computed at `sahyog-vivran-read.ts:509`, the shape 11b.14 used); (2) ⭐⭐ **the day-one output is the INVERSE of the title** — the clause gates the DECEASED name only, so this ships **50 living members' FULL LEGAL NAMES** on an unauthenticated edge-cached page while the member it is named for renders **nothing**; ⛔ v1 said this nowhere; (3) AC5 ruled RTBF omission but ⛔ never named the mechanism — `anonymizeMember` keeps the row and the decrypt **SUCCEEDS** ⇒ the **`ANONYMIZED_SENTINEL` plaintext check** is now ordered; (4) Trap 3's ground was **FALSE** — `-179` **cl.2** Panel-ratified D10 ⇒ re-grounded on `-205` cl.2's pair-pinning; (5) item (e)'s binder was **RE-POINTED to `8-16`**, which merged FIRST ⇒ v1's *"record the CLOSURE"* branch is **WITHDRAWN** as the co-writer rule forbids it; (6) v1 transcribed `-175` cl.4's *"⛔ do ⛔ not reach for the ladder here"* and **ordered that reach 80 lines later** ⇒ Trap 6 now names the distinction; (7) **`-195` cl.1's compliance statement** was owed and uncited ⇒ **AC10**; (8) *"ZERO OPEN DECISIONS"* was **FALSE** — `-207`'s follow-up re-opened one ⇒ **`D-percentage`**, a Preflight STOP; (9) the allowlist is **FOUR** entries and the assertions are **identity arrays**, ⛔ so *"update it by +2"* was unexecutable; (10) AC4's control-set mechanism was **mechanized away by 11b.11** and the count is **SEVEN**; (11) AC4's *"11b.3a in parallel"* — it is `done`; (12) three **header self-contradictions** and a Task 0 STOP on decisions `-177` had ruled. ⚠ Also: **five shipped tests invert** and a **negative control plants this story's own field id** (**AC9**) · `-191` **cl.3**'s ruled vocabulary (**Live/Closed/Completed**) added · the *"⛔ never claim the list is complete"* prohibition, live in two doc-blocks and ⛔ no AC, added to **AC7** · `sahyog-render.ts:213` was the **WRONG FILE** (the quote is `members-render.ts:101`) · **every** `public-read.ts`, `matrix.ts`, `epics.md` and UX-spec anchor re-derived · **item (iii) DISCHARGED**, ⛔ not re-done · `D9`/`D10` **RENAMED** `D9-inversion`/`D10-rowkey` per `-168` **cl.9** (a three-way `D9(a)` collision existed) · three **retired-sentence** sites struck under `-209` cl.3, which **AC8 itself banned** · and the `11b-20` dependency corrected: ⭐ **this story discharges the AMOUNT unconditionally and the NAME only conditionally.** ⭐ **`-177` vs `-182` RESOLVED:** `-177` is authoritative; `-182` transcribes a **2026-09-01** ruling and disclaims superseding anything ⇒ it owes a forward pointer, ⛔ not a correction. ⛔ **Rows unchanged.** | BigDev + Claude |
| 2026-09-02 | **Second combined validation of 11b.3 / 11b.3a / 11b.3b.** Six fixes, and ⭐⭐ the two shared-presenter findings. ⚠⛔ **KEPT AS THE RECORD** — ⛔ much of what this row and the rows below assert was **FALSIFIED by 2026-09-11's pass**; see **§ v2.0**. ⛔ Not rewritten ([[feedback_record_unattested_no_backfill]]). | BigDev + Claude |
| 2026-09-02 | ⭐⭐ **THE PANEL DIRECTED THAT THE PUBLIC/MEMBER INVERSION BE CLOSED** (`-179` cl.3). ⚠ Its sibling **cl.2** — which Panel-ratified 11b.1's D10 — was ⛔ **not** carried, and Trap 3 rested on its absence for nine days. | BigDev + Claude |
| 2026-09-02 | ✅ **`D9(a)` + `D10(a)` RULED by BigDev** (`-177`) ⇒ *"THIS STORY NOW HAS ZERO OPEN DECISIONS"*. ⚠⛔ **That claim was TRUE WHEN WRITTEN and is ⛔ FALSE at HEAD** — `-207`'s follow-up re-opened one. ⛔ Kept. | BigDev + Claude |
| 2026-09-02 | ⭐ **THIS STORY GAINED THE AMOUNT-RAISED RENDER (`AC3b`)**, BigDev `-176` **D1(b)**. ⚠⛔ Its *"`rosterSize` + `fixedAmount` must reach the DTO"* sentence is an **Implementation note, ⛔ not a ruling**, and `-204` closed it five days later. | BigDev + Claude |
| 2026-09-02 | ⚠⭐ **`-174` cl.3 CORRECTED, Panel-ratified** (`-175`) — the *"progressive reduction"* is the **nominee bank fields'**; Q1/Q2 stand **unconditionally**. ⭐ Still true at HEAD. | BigDev + Claude |
| 2026-09-02 | ✅ **D2 RULED by the Trustee Panel** (DR, KB) — contributor name **YES**, at the **FULL NAME**. ⭐ Un-superseded at HEAD. | Trustee Panel |
| 2026-09-02 | ✅ **D3 RULED by the Trustee Panel** (KB, DR) — **YES**, at the **FULL NAME**. ⭐ Un-superseded at HEAD. | Trustee Panel |
| 2026-09-02 | **The D3 packet is WRITTEN AND ROUTED** — `trustee-panel-routing-note-2026-09-02-11b3b-deceased-name-form.md`. | BigDev + Claude |
| 2026-09-01 | **Combined validation of 11b.3 / 11b.3a / 11b.3b.** Six fixes, the sharpest being AC7's namespace finding. ⭐ AC7's i18n analysis **survives 2026-09-11 intact**. | BigDev + Claude |
| 2026-09-01 | Story created by the **D6(b)** three-way split of Story 11b.3 (BigDev, 2026-09-01). | BigDev + Claude |
