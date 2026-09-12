---
baseline_commit: 0d0a03ab
---

<!--
⭐ BASELINE — `governance(11b.17): record decision 2026-09-11-214`.
⚠⛔ **RE-PINNED 2026-09-12 (validate pass) — ⛔ the v0.1 pin `ff92cb00` was ⛔ NOT AN ANCESTOR OF HEAD.**
⭐ It survives only on `governance/11b-17-validate-and-panel-routing`; its main-line twin is
**`0d0a03ab`**, same commit message, and `git rev-parse <sha>^{tree}` is **BYTE-IDENTICAL**
(`718a1a25…`) ⇒ ⭐ the CONTENT baseline was sound and only the SHA was orphaned; ⛔ no staleness
argument is redone ([[feedback_story_validate_footguns]] #11).
⚠ **SYSTEMIC, ⛔ not this story's alone:** `11b-20`'s pin `738bb3ea` is orphaned the same way
(tree-identical twin `7d12a4ce`). ⭐ `11b-17`'s `a2617869` ✅ IS an ancestor.

⭐ Minted 2026-09-11 from `#decision-2026-09-11-214` **Consequence 2**, which requires B's unshipped
copy source a NAMED HOME before story F ships.

⚠⛔ **KEY `11b-18` IS DELIBERATELY SKIPPED — ⚠ CORRECTED 2026-09-12: THE REASON v0.1 GAVE WAS HALF
FALSE, AND THE REAL ONE IS STRONGER.** `sprint-status.yaml` names
`11b-18-drive-target-write-authority-retired` in several ledger entries (and twice asserts it
*"STAYS `ready-for-dev`"*). ✅ **TRUE:** it is ⛔ **NOT a row in `development_status`** (verified — the
11b rows run `…-17`, `-19`, `-20`). ⛔⛔ **FALSE:** *"has ⛔ no file."* ⭐ The file **EXISTS** —
`_bmad-output/implementation-artifacts/11b-18-drive-target-write-authority-retired.md`, on the
**local, unpushed** branch `story/11b-18-drive-target-write-authority-retired` (commit `99e18142`,
2026-09-07). ⭐⭐ And the ledger says so **DELIBERATELY** — its `2026-09-07k` block: *"THE ROW AND THE
STORY FILE ARE ⛔ NOT IN THIS BRANCH'S TREE — ⭐ deliberately. Both branches edit THIS FILE, so expect
a **LEDGER MERGE** when they land."*
⇒ ⭐ **the key is ⛔ not an orphaned name; it is CLAIMED by an authored `ready-for-dev` story awaiting
merge.** ⛔ Taking it would collide with a story that exists. ⭐ Recorded, ⛔ not resolved here.
-->

# Story 11b.19: B's Unshipped Half — the Ratified Message Block and its `Nominee full name` | `District` Table `[COPY SOURCE]`

Status: ready-for-dev

## ✅ PREFLIGHT — ✅ **ALL CLEAR. ⭐ THIS STORY IS STARTABLE.**

⭐⭐ **THE AUTHORITY IS ALREADY RATIFIED AND ⛔ NOTHING WAITS ON THE PANEL.**
`#decision-2026-09-11-214` (transcribing **Trustee-ratified DR + KB, 2026-09-05**) records the wording
verbatim and its scope. ⇒ ⛔ **this story AUTHORS; it ⛔ decides nothing.**

⚠⛔ **⛔ IT IS ⛔ NOT A LICENCE TO EDIT THE RATIFIED TEXT.** ⭐ Every sentence below is the Panel's own.
⛔ Do ⛔ not improve it, shorten it, re-punctuate it or translate it. ⚠ A wording change is a **new
routing note**, ⛔ never a render- or authoring-site act.

## Story

As the trust,
I want the message the Panel ratified for a bereaved family's drive to exist in ONE place, in both
languages,
so that the member app and the public page can each render the SAME words — instead of two surfaces
inventing their own, or a dev writing the trust's condolence copy at a render site.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT** is introduced or changed — ⛔ no
eligibility, ⛔ no assignment, ⛔ no obligation, ⛔ no amount owed, ⛔ no visibility rule.

⭐ **This story adds i18n KEYS and ⛔ nothing else.** ⛔ No route, ⛔ no contract, ⛔ no DB, ⛔ no render.
⇒ ⭐ **there is ⛔ no member-facing predicate to state**, and that is recorded here explicitly rather
than left as an unasked question.

## ⛔ THE FIVE TRAPS

### Trap 1 — ⛔⛔ `₹{amount}` WOULD RENDER **₹₹**. ⛔ THE RATIFIED TEXT'S RUPEE SIGN IS ⛔ NOT A TOKEN LITERAL

⭐ §8.1 writes ***"₹{amount}"***. ⚠⛔ But `{amount}` **arrives ALREADY FORMATTED** and the formatted
value **carries its own ₹** — `$comment.drive_target` shows it: *"`Expected: ₹ 300`"*.
⇒ ⛔ a literal `₹` before the token ships **`₹₹ 19,45,000`**.

⭐⭐ **B's OWN SHIPPED KEY SETTLES IT:** `index_line.full` = *"**{amount}** contributed by colleagues…"*
— ⛔ **no literal ₹**, from the same ratification, on the same day. ⇒ ⭐ **follow the shipped key, ⛔ not
the note's typography.**

⭐ **AND THE NAMESPACE SAYS IT OUTRIGHT** — `$comment.live_line`, Trustee-ratified 2026-09-07:
*"`{amount}` arrives **ALREADY FORMATTED** and carries the ₹ (**'Yes rupee sign should appear'**)."*
⇒ ⭐ the trap is ⛔ not an inference; ⭐ it is written down.

### Trap 2 — ⚠ `{familyName}` IS ⛔ NOT THIS REPO'S TOKEN SPELLING

⭐ §8.1 writes `{familyName}` (camelCase). ⚠ Every shipped key in this namespace is **snake_case** —
`{family_name}`, `{nominee_name}`, `{district_name}`, `{amount}`, `{count}`.
⇒ ⭐ **normalise to snake_case**, and ⛔ do ⛔ not treat that as editing the ratified text — ⭐ it is the
same token, spelled the way `t()` resolves it here.

### Trap 3 — ⛔⛔ AUTHOR IT, ⛔ DO ⛔ NOT RENDER IT. ⭐ `t()` THROWS

⚠ `packages/i18n/src/resolver.ts:36-42` — `t()` **THROWS** on an unsupplied token. ⛔ ⛔ Not a silent
blank: a premature render fails **LOUDLY**, and on a page-shaped block that is the **whole page**.

⭐⭐ **B ALREADY ESTABLISHED THIS EXACT PATTERN**, in `$comment.index_line`:
*"⛔ **AUTHORED HERE, RENDERED NOWHERE YET** … ⛔ Render none of these until every token is supplied."*
⇒ ⭐ **this story ships copy with ⛔ ZERO consumers, deliberately**, and says so in the `$comment`.

⚠⛔⛔ **BUT ⛔ DO ⛔ NOT COPY THAT SENTENCE AS IF IT WERE STILL TRUE OF ITS OWN KEYS — ⭐ IT IS ⛔ NOT,
AND THAT IS THE PATTERN COMPLETING, ⛔ not breaking.** ⭐ Story **D** (`11b-14`) landed: `index_line.*`
**IS resolved live today**, at `apps/public/src/pages/sahyog.astro:186-236`, behind
`selectIndexLineVariant`. ⇒ `$comment.index_line`'s *"RENDERED NOWHERE YET"* half is **STALE about
itself** ([[feedback_story_validate_footguns]] #19(b) — ⛔ never take a token's `$comment` for the
live state).
⭐⭐ **THE SURVIVING PROPERTY IS THE ONE TO MIRROR, and it is ⛔ stricter, ⛔ not weaker** — the fence
was **NARROWED, ⛔ not deleted**, and the narrowing is asserted at
`packages/i18n/tests/sahyog-shared-dark-copy.test.ts:160-196`: *"⛔ an `index_line.*` key is resolved
⛔ ONLY where EVERY token is supplied"*, enforced by a **named `AUTHORISED` allow-list** carrying
*"⛔ Do ⛔ not append to it to make a build green."*
⇒ ⭐ **this story's keys begin exactly where `index_line.*` began — with an ⛔ EMPTY authorised list**
(see **AC6**). ⛔ Do ⛔ not "fix" B's stale `$comment` here: ⛔ it is ⛔ not this story's file to edit
and the record is kept by supersession, ⛔ never by overwrite ([[feedback_supersede_never_reinterpret]]).

⚠ The renders are **elsewhere and ⛔ not this story's**: the **member** half is `11b-17` **AC10 /
Task 5d** (`-214` cl.4(b)); the **public** half is **`11b-20-public-sahyog-vivran-message-block`**
(`-214` Consequence 3) — ⚠ **CORRECTED 2026-09-12: v0.1 said it had *"no home yet"*, which was true
when authored and is ⛔ now FALSE.** ⭐ `11b-20` was minted the same day, is `ready-for-dev` with a
sprint row, and ⛔ **blocks on THIS story** for the copy.

### Trap 4 — ⭐ OMIT THE CLAUSE. ⛔ ⛔ NO COMBINATORIAL VARIANTS

⭐ `-214` Consequence 6 / routing note **§10.2 ruling 3** (Trustee-ratified): an absent token **DROPS
ITS CLAUSE**. ⛔ ⛔ Not a placeholder, ⛔ not *"Not recorded"*, ⛔ not a marker.

⚠⛔ **AND ⛔ NOT ONE VARIANT PER COMBINATION.** `$comment.index_line` states the rule B applied:
*"⛔ no combinatorial variants; **pick the ONE variant naming the absent token**."*

⭐⭐ **AND COPY B's ONE NON-OBVIOUS CALL:** its `no_family` variant drops the **district** clause **too**
— *"because *'who served in … district'* modifies the **DECEASED MEMBER** — leaving it would attribute
the posting district to the **NOMINEE**."* ⚠ ⇒ ⛔ the same reasoning governs the **table** here: a
`District` column beside a nominee's name, with the deceased absent, **mis-attributes the posting**.

### Trap 5 — ⚠⛔ THE COLUMN SAYS *"Nominee"* AND THE DATA ⛔ CANNOT PROMISE IT

⭐ The value behind `Nominee full name` is **`account_holder_name_ciphertext`** — the **disbursement
account holder**. ⚠ 6.8's **D1** removed the nominee linkage **deliberately** (⛔ no FK, ⛔ no rank,
⛔ no match rule), and `deferred-work.md` **`D5-subject (i)`** rules ***"the SCHEMA is the authority."***

⇒ ⛔ **this story authors a LABEL, ⛔ not an assertion.** ⚠ ⛔ Do ⛔ not add copy that says the person
*"is the nominee of"* anyone — ⭐ that sentence-level claim is **§9.3's finding**, and it is
`D5-subject (ii)`'s commissioned work to make true, ⛔ not ours to assume.

---

## Acceptance Criteria

### AC0 — Governance first
⭐ The `epics.md` entry and the sprint row land in a **`governance:` commit**, ⛔ before any key is
written ([[feedback_governance_commits_precede_implementation]]). ⭐ Authority is `-214`; ⛔ nothing
waits on the Panel.

⚠⛔ **HALF OF THIS IS ⛔ ALREADY DONE — ⭐ verified 2026-09-12, ⛔ do ⛔ not add it twice.**
✅ **The sprint row EXISTS**: `11b-19-ratified-message-block-copy-source: ready-for-dev`, landed with
its ledger comment in `7d12a4ce`. ⇒ ⛔ **do ⛔ not re-add it**; ⭐ only correct the two facts this
validate pass overturned (the `11b-18` reason, and `11b-20` homing Consequence 3) — ⚠ and per
[[project_sprint_status_safe_prepend]], ⛔ **never** `open(p,'w')` over that 2.7 MB ledger.
⛔ **The `epics.md` entry is the OUTSTANDING half** — ⭐ confirmed absent (⛔ no `11b.19` or `11b-20`
string anywhere in `epics.md`). ⭐ The precedent for a story minting its own section is named at
`epics.md:5496` (Story 11b.15, itself following **8.16** and **7.11**) — ⭐ so a future
`sprint-planning` run can ⛔ neither drop it nor regenerate a ghost.

### AC1 — The five-paragraph block exists in `sahyog-shared`, BOTH locales, VERBATIM
⭐ Namespace **`sahyog-shared`** — ⛔ never a second source (`-193` cl.3, `-206` cl.1).
⭐ **EN**, per §8.1, headline first:
> **Late {family_name}'s family received contributions of {amount} from colleagues.**
> When one family needs support, the whole Pariwar stands with them. Because in Pariwar, we stand together.
> Our heartfelt gratitude to every colleague who stood beside the family.
> **सहयोग का हाथ, हर परिवार के साथ।**
> **Join the Pariwar. Be the Movement.**

⭐ **HI**, per §8.1:
> **स्व. {family_name} जी के परिवार के लिए सहकर्मियों ने मिलकर {amount} का योगदान किया।**
> परिवार के हर सहकर्मी का सहयोग मायने रखता है। यही हमारी ताकत है।
> परिवार के साथ खड़े होने वाले हर सहकर्मी का हम हृदय से आभार व्यक्त करते हैं।
> **सहयोग का हाथ, हर परिवार के साथ।**
> **Pariwar से आज ही जुड़ें और इस आंदोलन का हिस्सा बनें।**

⚠⛔ **THE DEVANAGARI TAGLINE STAYS DEVANAGARI IN THE ENGLISH COPY.** ⭐ That is the Panel's own text,
⛔ not an oversight ⇒ ⛔ do ⛔ not translate or transliterate it.
⚠ Per Trap 1 the ₹ is **⛔ dropped** from `{amount}`; per Trap 2 the token is **snake_case**.

### AC2 — The table's two column labels
⭐ **`Nominee full name`** (left) · **`District`** (right) — the §8.1 wording.
⚠ *"FULL name"* is the ruled **form** (`-205` cl.1) ⇒ ⛔ the per-Pariwar `public_name_presentation_mode`
has ⛔ **no subject** here. ⚠ Per Trap 5 these are **labels**, ⛔ not claims.

### AC3 — The no-name variant, both locales
⭐ Supplied by the Panel at routing note **§9.1 row 4** — ⛔ do ⛔ not derive one:
> **EN:** *The family received contributions of {amount} from colleagues.*
> **HI:** *परिवार के लिए सहकर्मियों ने मिलकर {amount} का योगदान किया।*

⚠ It replaces the **HEADLINE only**; ⭐ the remaining four paragraphs are name-free and unchanged.
⚠⛔ **THIS IS A SAFETY PROPERTY, ⛔ not a nicety** — `deceased_member_name` is nullable and `t()`
throws ⇒ the full variant on a nameless drive takes down the **whole page** (Trap 3).

### AC4 — Absent tokens DROP their clause
⭐ Per Trap 4: **one variant per absent token**, ⛔ never per combination; and the **district** clause
travels with the **deceased**, ⛔ not the nominee.
⚠ `District` is `.nullable()` on the wire (`sahyog-vivran.ts` — ⭐ navigate by the `district:` field
declaration, ⛔ **not** by a line number: it has already moved `:322`→`:344`→`:349`) ⇒ ⛔ its **column**
is dropped when absent, ⛔ never rendered as *"Not recorded"*.

⚠⛔ **AND THE ONE QUESTION AC4's RULE INVITES, ANSWERED HERE SO IT IS ⛔ NOT DISCOVERED: ⛔ THERE IS
⛔ NO `no_amount` VARIANT, AND THERE MUST ⛔ NOT BE ONE.** ⭐ §9.1's implementation note on blocker (1)
did order B *"the copy and the **no-amount variants**"* — ⚠ that was **ORDERING against an unbuilt
story D**, and ⭐ **D (`11b-14`) is `done`**. ⇒ the condition it guarded is gone.
⭐⭐ **B's own shipped precedent settles it and is ASSERTED, ⛔ not assumed:** all four `index_line.*`
variants carry `{amount}`, and `sahyog-shared-dark-copy.test.ts` pins exactly that —
*"`{amount}` is on EVERY variant — it is pending-on-D, ⛔ not nullable."*
⇒ ⭐ **`{amount}` is ⛔ not an omittable token here; `{family_name}` is the ⛔ only one** (AC3).

### AC5 — The `$comment` carries the ratification AND the no-consumer warning
⭐ Mirror `$comment.index_line`'s **SHAPE**: the ratifying trustees + date, the decision id
(**`2026-09-11-214`**), the §8.1 / §9.1-row-4 / §10.2-ruling-3 sources, ⭐ **"AUTHORED HERE, RENDERED
NOWHERE YET"**, the `t()`-throws warning, and Trap 4's district-attribution reasoning.
⚠⛔ ⛔ Do ⛔ not write *"the nominee of"* anywhere in the comment (Trap 5).

⚠⛔ **MIRROR ITS SHAPE, ⛔ NOT ITS PRESENT-TENSE STATE (Trap 3).** ⭐ *"RENDERED NOWHERE YET"* is
**true of THESE keys today** and is ⛔ **no longer true of `index_line.*`** — D landed and
`sahyog.astro` renders them. ⇒ ⭐ the new `$comment` states, in B's own idiom, the property that
**survives the render arriving**: *the key is resolved ⛔ ONLY where EVERY token is supplied* — ⭐ so
when `11b-17`/`11b-20` light it up, the comment **narrows**, ⛔ it does ⛔ not become false
([[feedback_supersede_never_reinterpret]]).

### AC6 — ⛔ Nothing renders, and ⛔ nothing else moves
⛔ No component · ⛔ no route · ⛔ no contract · ⛔ no DB · ⛔ no public surface · ⛔ no member surface.
**And** ⭐ a **fence test** proves the new keys have **ZERO** consumers in `apps/` and `packages/`
(⛔ excluding this story's own catalog test).

⭐⭐ **⛔ DO ⛔ NOT INVENT THE FENCE — ⭐ IT IS SHIPPED, REVIEWED, AND IN THIS VERY PACKAGE.**
⚠⛔ **CORRECTED 2026-09-12: v0.1 said *"the shape story E's AC8 uses."* ⛔ It is ⛔ NOT** — `11b-15`'s
AC8 is a *"Nothing else moves"* **semantic scope fence** about ⛔ not changing a public surface, and it
scans ⛔ nothing for key consumers ([[feedback_story_validate_footguns]] #17).
⭐ **The real model is `packages/i18n/tests/sahyog-shared-dark-copy.test.ts`** — B's own dark-copy
fence for `index_line.*`, which already carries every part AC6 needs:
- ⭐ a repo-wide walk of `apps/` + `packages/` over `.ts|.tsx|.astro`, skipping
  `node_modules`/`dist`/`.turbo`/`ios`/`android`/`.astro`;
- ⭐ **self-exclusion** (`if (f.endsWith('sahyog-shared-dark-copy.test.ts')) return false`) — ⭐ exactly
  the *"⛔ excluding this story's own catalog test"* carve-out, ⛔ already solved;
- ⭐⭐ a **non-vacuity assertion** (`expect(files.length).toBeGreaterThan(200)`) — ⛔ without it a green
  scan proves nothing ([[feedback_gate_scope_semantic_coverage]]);
- ⭐ an **`AUTHORISED` allow-list** compared with `toEqual` — ⭐ for this story it is **`[]`**, and a
  ⛔ second render site anywhere still fails;
- ⭐ a `t()`-**throws** assertion as the positive **proof of darkness**, plus a supply-every-token
  round-trip proving the copy itself resolves cleanly (⛔ so *"dark"* ⛔ never excuses a broken string).
⚠ ⭐ Extend that file with a `message_block.*` describe-block, or mint a sibling on its shape — ⛔ do
⛔ not weaken any of the five properties above. ⚠ Its `expect(VARIANTS).toHaveLength(4)` is scoped to
`index_line` and is ⛔ **unaffected** by the new family.

### AC7 — Both locales stay structurally identical
⭐ Same key set, same token set per key, ⛔ no key in one locale absent from the other — the existing
i18n parity gate. ⚠ ⛔ A missing HI key is a **throw at render**, ⛔ not a fallback.

⭐ **THE GATE IS REAL AND NAMED, and ⭐ here is what PASSING looks like** (⛔ a gate claim is a config
read, ⛔ never a comment read — [[feedback_gate_scope_semantic_coverage]]): CI job **`i18n-parity`**
(`.github/workflows/ci.yml:223`) runs **`pnpm turbo run i18n:check-parity`** →
`packages/i18n/scripts/check-parity.ts`. ⭐ PASS = **zero findings**; a miss prints
`locales/hi/sahyog-shared.json :: key '<k>'` and fails the job. ⚠ It flags an **empty / whitespace-only**
HI value too ⇒ ⛔ a placeholder is ⛔ not a way past it.
⭐ Today `sahyog-shared` is **21 keys ⇄ 21 keys, ⛔ zero asymmetry** — ⭐ that is the state to preserve.

---

## Tasks / Subtasks

- [x] **Task 1 — GOVERNANCE** (AC0) — ⭐ an `epics.md` entry under Epic 11b naming `-214` Consequence 2
      as the commissioning authority; ⛔ one `governance:` commit, ⛔ no keys.
  - [x] ⚠⛔ **⛔ DO ⛔ NOT ADD THE SPRINT ROW — ✅ IT ALREADY EXISTS** (`7d12a4ce`). ⭐ Only the
        `epics.md` entry is owed (AC0).
  - [x] ⚠ Record that **`11b-18` is skipped** and why — ⭐ **the CORRECTED reason** (header comment):
        ⛔ no `development_status` row, ⚠ **but the FILE EXISTS** on the unmerged local branch
        `story/11b-18-…` and the ledger's `2026-09-07k` block says the omission is **deliberate**,
        with a **LEDGER MERGE** expected. ⛔ Recorded, ⛔ not resolved here.
  - [x] ✅ **DONE 2026-09-12 — ⛔ NOT the dev's.** The two false claims this validate pass overturned
        (`11b-18` *"no file"*; *"Consequence 3 unhomed"*) sat in **our** `11b-19` ledger comment, so
        the pass corrected them itself, via the **successor** `last_updated: 2026-09-12a` block — ⛔ the
        prior block is left untouched ([[feedback_governance_commits_precede_implementation]], the
        `-128`/`-129` precedent). ⚠ ⛔ Do ⛔ not re-open it.
- [ ] **Task 2 — The keys** (AC1, AC2, AC3, AC4, AC7) — `packages/i18n/locales/{en,hi}/sahyog-shared.json`.
  - [ ] ⭐ Name them on B's pattern (`index_line.full` / `.no_family` / …) so the omit-the-clause
        variants read as one family.
  - [ ] ⚠⛔ ⛔ No literal `₹` (Trap 1) · ⭐ snake_case tokens (Trap 2).
- [ ] **Task 3 — The `$comment`** (AC5) — ⭐ modelled on `$comment.index_line`, ⛔ not invented.
- [ ] **Task 4 — Tests** (AC6, AC7)
  - [ ] ⭐ The **zero-consumer fence** — ⛔ **do ⛔ not hand-roll a grep.** ⭐ Open
        `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` **FIRST** and extend it (or mirror it)
        with all **five** properties AC6 enumerates — ⭐ the `AUTHORISED` list for this family is
        **`[]`**.
  - [ ] ⭐ Locale parity over the new key family — ⭐ then run **`pnpm turbo run i18n:check-parity`**
        locally; ⭐ PASS = zero findings (AC7).
  - [ ] ⚠ ⛔ Do ⛔ not write a render test — ⭐ there is ⛔ nothing to render. ⛔ This is a pure catalog
        change; ⚠ a render test here would be **vacuous by construction**.

## Dev Notes

### ⭐ Why this story exists at all — ⛔ read this before touching the copy

⚠⛔ **B (`11b-12`) was told to ship this on 2026-09-05 and shipped ⛔ only half of it.** It shipped the
§9.2 **index line** (`index_line.*`, ✅ live) and ⛔ **never** the §8.1 **message block**. ⭐ `11b-12` is
**`done`**. ⇒ ⛔ this is ⛔ not new scope; it is **B's unshipped half**, given a home by `-214`
Consequence 2.

⚠ **Story E (`11b-15`) also closed `done` owing the RENDER half** — ⭐ recorded against E, ⛔ never
back-filled and ⛔ not transferred ([[feedback_record_unattested_no_backfill]]).

### ⚠ What this story UNBLOCKS, and what it does ⛔ not

⭐ It clears **STOP 2** on `11b-17` — ⇒ **AC10 / Task 5d** become buildable (⭐ verified: F's **STOP 2**
block names this story as the discharge of Consequence 2).

⚠⛔ **CORRECTED 2026-09-12 — v0.1 said Consequence 3 *"still has ⛔ no named home."* ⭐ THAT WAS TRUE
WHEN AUTHORED AND IS ⛔ NOW FALSE.** ⭐ **`11b-20-public-sahyog-vivran-message-block`** was minted the
same day from Consequence 3, is **`ready-for-dev`** with a sprint row, and ⛔ **blocks on THIS story**
for the copy (plus `11b-3b` for both of its headline tokens).
⇒ ⭐ **`-214` is now homed END TO END**: Consequence 2 = this story · cl.4(b) = `11b-17` AC10 ·
Consequence 3 = `11b-20`. ⚠ **⛔ NOT "closed"** — ⭐ all three are `ready-for-dev`, ⛔ none is built, and
each still owes its **`epics.md` entry** ([[feedback_closure_language_precision]]).
⚠ `11b-15`'s omission stays **RECORDED against `11b-15`** and is ⛔ never back-filled
([[feedback_record_unattested_no_backfill]]).
⚠ **SWEEP NOTE, ⛔ not this story's to edit:** `11b-17` still carries the retired *"Consequence 3 …
is ⛔ still unhomed"* sentence — ⭐ the **last line of its STOP 2 block** (⛔ cite it by that block,
⛔ not by a number). ⭐ Recorded here so the next pass on F strikes it
([[feedback_story_validate_footguns]] #16).

### ⚠ The `{amount}` dependency, stated so it is ⛔ not discovered

⭐ `{amount}` is supplied by story **D** (`11b-14`), which is **`done`** ⇒ the field exists. ⚠ But the
**block** is dark until a render site supplies every token ⇒ ⭐ ⛔ nothing here is blocked on D, and
⛔ nothing here may render.

### References

- ⭐ `.decision-log.md#decision-2026-09-11-214` — **the commissioning authority**; cl.4(d), Consequences 2, 5, 6, 7, 8
- ⭐ `…/trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md` **§8.1** (the text), **§9.1 row 3** (the routing), **§9.1 row 4** (the no-name variant), **§10.2 ruling 3** (omit the clause)
- ⭐ `packages/i18n/locales/{en,hi}/sahyog-shared.json` — `index_line.*` + `$comment.index_line`, ⭐ **the pattern to copy** (⚠ its *"RENDERED NOWHERE YET"* half is **stale about itself** — Trap 3); also `$comment.live_line` (the ₹ is in `{amount}`) and `$comment.drive_target` (*"`Expected: ₹ 300`"*)
- ⭐⭐ `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` — ⭐ **THE SHIPPED FENCE AC6 MODELS ON**; `:160-196` is the narrowed *"every token supplied"* property + the `AUTHORISED` allow-list
- ⭐ `packages/i18n/src/resolver.ts:36-42` — `t()` throws on an unsupplied token (⭐ the throw is at `:39`, inside `interpolate`)
- ⚠ `apps/public/src/pages/sahyog.astro:186-236` — ⭐ the ⛔ **ONE** authorised `index_line.*` render (story D), ⭐ proof the dark phase ENDS rather than being abandoned
- ⭐ `.github/workflows/ci.yml:223` (`i18n-parity`) → `packages/i18n/scripts/check-parity.ts` — the AC7 gate
- ⚠ `deferred-work.md` **`D5-subject (i)`** — *"the SCHEMA is the authority"*, which that item calls **its own ruling** while the ITEM stays **open, non-blocking, with a live Trigger** (Trap 5)
- ⚠ `_bmad-output/implementation-artifacts/11b-17-member-drive-detail-unredacted.md` — **AC10 / Task 5d**, the member render this unblocks
- ⚠ `_bmad-output/implementation-artifacts/11b-20-public-sahyog-vivran-message-block.md` — ⭐ the **PUBLIC** render (`-214` Consequence 3), ⛔ **blocked on this story**
- `.decision-log.md#decision-2026-09-04-193` cl.3 · `#decision-2026-09-07-206` cl.1, cl.3 · `#decision-2026-09-07-205` cl.1

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-12 | 0.2 | ⭐⭐ **VALIDATED (`bmad-create-story validate`) — 8 FINDINGS, ALL APPLIED. ⛔ ZERO ROWS MOVE; ⛔ NO CODE.** ⭐ The story's CORE survived every check: AC1's EN **and** HI match routing-note **§8.1 verbatim** (modulo the two declared deviations), AC3 matches **§9.1 row 4** verbatim, §10.2 ruling 3 is quoted exactly, and the premise is **live-true** — `grep "Be the Movement"` / `"सहयोग का हाथ"` across `packages/i18n/locales/` still returns **ZERO** ⇒ B's half is genuinely unshipped. ⚠⛔ **(1) THE PIN WAS ORPHANED** — `ff92cb00` is ⛔ NOT an ancestor of HEAD (it lives only on `governance/11b-17-…`); re-pinned to its **tree-identical** main-line twin **`0d0a03ab`** ⇒ ⭐ the content baseline was sound, ⛔ nothing re-argued. ⚠ `11b-20` carries the same orphan. ⛔⛔ **(2) *"THE PUBLIC RENDER HAS ⛔ NO NAMED HOME"* IS ⛔ NOW FALSE at TWO sites** — **`11b-20`** was minted the same day from Consequence 3, is `ready-for-dev`, and **blocks on THIS story**; ⇒ `-214` is **HOMED end to end**, ⚠ ⛔ **not "closed"** (all three are `ready-for-dev`). ⭐⭐ **(3) AC6 NAMED THE WRONG FENCE AND THE RIGHT ONE IS SHIPPED** — v0.1 said *"the shape story E's AC8 uses"*; ⛔ `11b-15`'s AC8 is a *"nothing else moves"* **semantic** fence that scans ⛔ nothing. ⭐ The real model is **`packages/i18n/tests/sahyog-shared-dark-copy.test.ts`**, which already solves all five properties — repo walk, **self-exclusion**, a **non-vacuity** assertion (`files.length > 200`), an **`AUTHORISED` allow-list** (⭐ `[]` here), and a `t()`-throws **proof of darkness**. ⭐⭐ **(4) TRAP 3's MODEL IS STALE ABOUT ITSELF** — `$comment.index_line` says *"RENDERED NOWHERE YET"*, ⛔ but **story D landed** and `index_line.*` **IS resolved live** at `sahyog.astro:186-236`; ⇒ mirror its **SHAPE**, ⛔ not its present tense, and mirror the **narrowed** surviving property (*"only where EVERY token is supplied"*). ⚠ **(5) THE `11b-18` SKIP REASON WAS HALF FALSE** — *"no row"* ✅ true, *"⛔ no file"* ⛔ **FALSE**: the file exists on the unmerged local branch `story/11b-18-…` and the ledger's `2026-09-07k` block says the omission is **deliberate**; ⭐ the conclusion is unchanged and **stronger**. ⚠ **(6) §9.1 WAS QUOTED IN HALF** — its note on blocker (1) also ordered *"the **no-amount** variants"*; ⭐ moot (D is `done`) and now **stated**, with B's own four-variant precedent asserted. ⚠ **(7) AC0 IS HALF-DISCHARGED** — the **sprint row already exists** (`7d12a4ce`); ⛔ only the `epics.md` entry is owed. ⭐ **(8) AC7's GATE NAMED WITH ITS PASSING STATE** — CI `i18n-parity` → `pnpm turbo run i18n:check-parity`; today **21 ⇄ 21 keys, zero asymmetry**. ⭐ **Verified clean, ⛔ so the next pass need not re-derive:** `resolver.ts:36-42` is an EXACT cite in the **right function** (#21); the AC↔Task map is **bidirectionally complete**; ⛔ no code doc-block or `deferred-work.md` item routes anything to `11b-19` (#9); ⛔ **no rival story** owns this work (#10); `D5-subject (i)`'s *"the SCHEMA is the authority"* is called **that item's own ruling** ⇒ Trap 5's word survives (#22); `District` is still `.nullable()` (⭐ re-expressed as a field address — it has moved `:322`→`:349`, #19). ⚠⛔ **AND THIS PASS CHECKED ITSELF ON THE WAY OUT (#22), WHICH CAUGHT ONE OF ITS OWN:** the sweep note it had just written cited `11b-17:51` — ⛔ the sentence is at **`:50`** and `:51` is blank. ⇒ ⭐ re-expressed as *"the last line of its STOP 2 block"*, and ⛔ **no blanket *"all pointers verified"* sentence is written here** — each of the eight pointers this pass added was `sed`-ed individually (#22(c)). ⭐ AC↔Task map re-built **bidirectionally** after the edits: ⛔ zero orphans either way (#22(b)). ⭐⭐ **AND THE TWO FALSE LEDGER CLAIMS WERE FIXED BY THIS PASS, ⛔ NOT ROUTED TO THE DEV** — they were **ours**, so `sprint-status.yaml` gains a **successor** `2026-09-12a` block with the prior one untouched (the `-128`/`-129` precedent, and the same call `8-17`'s third pass made). ⚠ That prepend shifts every line number in that file — ⭐ which is why ⛔ **no `sprint-status.yaml` line number is cited anywhere here**; ⭐ navigate it by `last_updated` block and by the `11b-19` row (#19). | BigDev + Claude |
| 2026-09-11 | 0.1 | ⭐ Created from `#decision-2026-09-11-214` **Consequence 2** — B's unshipped copy source given a NAMED HOME, as `-191` cl.1's lapse taught us to do. ⛔ **AUTHORITY ALREADY RATIFIED** (DR + KB, 2026-09-05) ⇒ ⛔ ZERO open decisions. ⭐⭐ **FIVE TRAPS FOUND BY LIVE VERIFICATION WHILE AUTHORING:** (1) §8.1's literal **`₹{amount}` would ship `₹₹`** — `{amount}` arrives ALREADY FORMATTED **with** its ₹ (`$comment.drive_target`: *"`Expected: ₹ 300`"*), and B's own `index_line.full` carries ⛔ **no** literal ₹ from the same ratification; (2) §8.1 writes **`{familyName}`** where this namespace is **snake_case** throughout; (3) `t()` **THROWS** ⇒ **author, ⛔ do ⛔ not render** — B's `$comment.index_line` already names the pattern (*"AUTHORED HERE, RENDERED NOWHERE YET"*); (4) ruling 3's omit-the-clause has ⛔ **no combinatorial variants**, and B's `no_family` drops the **district** clause too because *"who served in … district"* modifies the **DECEASED**, ⛔ not the nominee — ⭐ the same logic governs the **table**; (5) the column says *"Nominee"* over `account_holder_name_ciphertext`, which `D5-subject (i)` rules the **schema** denies ⇒ ⭐ author a **LABEL**, ⛔ never the claim *"is the nominee of"*. ⚠ **KEY `11b-18` SKIPPED** — named in `sprint-status.yaml` ledger entries (twice as *"STAYS `ready-for-dev`"*) but ⛔ **absent from `development_status`** and ⛔ no file; ⛔ recorded, ⛔ not resolved. ⛔ **NO CODE.** | BigDev + Claude |
