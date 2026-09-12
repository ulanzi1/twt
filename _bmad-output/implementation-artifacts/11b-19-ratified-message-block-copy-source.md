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

Status: done

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

⚠⛔ [Review][Patch] **RECORDED 2026-09-12 — AC0's OWN RULE WAS NOT FULLY HONORED BY ITS LANDING.** AC0
requires the sprint row **and** the `epics.md` entry to land in a `governance:` commit. The sprint row
actually landed in `7d12a4ce`, tagged `story(11b.19): ...` — ⛔ not `governance:`-prefixed. Only the
`epics.md` entry (`8303d92b`, `governance(11b.19): Task 1 ...`) satisfied the rule. ⛔ The published
commits are ⛔ **not** rewritten to fix this retroactively ([[project_story_automator_ops]] — commit
manually, never rebase/squash a shipped governance story). ⭐ Recorded here as the historical fact,
⛔ not corrected by amendment, so a future validate pass does not re-discover it as new.
⚠⛔ **CORRECTED 2026-09-12 (third pass) — "DISCHARGED" OVERSTATED WHAT ONE STORY CAN RULE ON ITS OWN
BREACH.** A prior pass here asserted AC0 "discharged," self-issued in the same document that recorded
the breach, with no cited decision authorising a waiver — precisely the reinterpret-a-ratified-rule
pattern this story elsewhere refuses to allow itself
([[feedback_supersede_never_reinterpret]]). ⭐ **RESTATED IN THIS STORY'S OWN REGISTER, matching
`11b-18`'s skip and `11b-15`'s render debt**: the sprint row landing outside a `governance:` commit
is ⛔ **recorded, ⛔ not resolved here.** ⭐ The observation that its substantive effect was narrow —
the row carried zero keys and zero code, only a ledger fact — is offered as **context for a future
reader**, ⛔ not as this story's own verdict on whether its rule was satisfied.

### AC1 — The five-paragraph block exists in `sahyog-shared`, BOTH locales, VERBATIM MODULO TWO DECLARED DEVIATIONS
⚠⛔ [Review][Patch] **RETITLED 2026-09-12 — "VERBATIM" ALONE OVERSTATED THIS AC.** The text below carries
two deliberate deviations from §8.1's literal typography (Trap 1's dropped ₹, Trap 2's snake_case
token) — declaring them here, in the title, rather than asserting an unqualified "verbatim" that the
body immediately contradicts.
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

⚠⛔ [Review][Patch] **DISCLOSED 2026-09-12 — THIS QUOTE CARRIES TRAP 1's SAME DEVIATION, UNDECLARED
UNTIL NOW.** §9.1 row 4's own text writes ***"₹{amount}"***, exactly like §8.1's headline. Trap 1's
reasoning (`{amount}` arrives already formatted, carrying its own ₹) applies identically here, so the
literal ₹ is **dropped from this variant too** — the shipped `message_block.headline.no_family` key
carries no literal ₹, same as `.full`. This is the SAME edit Trap 1 names for the `.full` headline;
it was applied to this variant without a matching disclosure. Recorded here now so no future reader
mistakes this quote for one left untouched.

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
- [x] **Task 2 — The keys** (AC1, AC2, AC3, AC4, AC7) — `packages/i18n/locales/{en,hi}/sahyog-shared.json`.
  - [x] ⭐ Name them on B's pattern (`index_line.full` / `.no_family` / …) so the omit-the-clause
        variants read as one family.
  - [x] ⚠⛔ ⛔ No literal `₹` (Trap 1) · ⭐ snake_case tokens (Trap 2).
- [x] **Task 3 — The `$comment`** (AC5) — ⭐ modelled on `$comment.index_line`, ⛔ not invented.
- [x] **Task 4 — Tests** (AC6, AC7)
  - [x] ⭐ The **zero-consumer fence** — ⛔ **do ⛔ not hand-roll a grep.** ⭐ Open
        `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` **FIRST** and extend it (or mirror it)
        with all **five** properties AC6 enumerates — ⭐ the `AUTHORISED` list for this family is
        **`[]`**.
  - [x] ⭐ Locale parity over the new key family — ⭐ then run **`pnpm turbo run i18n:check-parity`**
        locally; ⭐ PASS = zero findings (AC7).
  - [x] ⚠ ⛔ Do ⛔ not write a render test — ⭐ there is ⛔ nothing to render. ⛔ This is a pure catalog
        change; ⚠ a render test here would be **vacuous by construction**.

### Review Findings

- [x] [Review][Patch] Zero-consumer fence's `RESOLVER` regex only matches a fully bare-quoted literal (`` /['"`]message_block\.[a-z_.]+['"`]/ ``) and misses a dynamically-constructed key (e.g. a template literal a future render site could plausibly write) — the `AUTHORISED = []` guarantee can go silently stale [`packages/i18n/tests/sahyog-shared-dark-copy.test.ts:492`] — **fixed:** dropped the required closing quote/backtick, so `` `message_block.headline.${variant}` `` is caught too. ⚠ **CORRECTED 2026-09-12 (third pass):** this bullet originally said the class "runs to the first character a real key cannot contain (`$`/`{`)" — ⛔ WRONG, `$` is *included* in `[\w.$]`, not excluded; `{` alone is what actually stops the match. See the in-code comment, corrected in the second pass, which this bullet had been left contradicting.
- [x] [Review][Patch] AC1's heading asserts the block exists "VERBATIM" while the same section documents two applied deviations (dropped literal ₹, `{familyName}`→`{family_name}`) — retitle to acknowledge the declared deviations rather than an unqualified "verbatim" [`11b-19-ratified-message-block-copy-source.md:158`] — **fixed:** retitled to "VERBATIM MODULO TWO DECLARED DEVIATIONS" with an inline note
- [x] [Review][Patch] The "no `no_amount` variant" check (`/^message_block\..*no_amount/`) only asserts a naming convention, not the structural guarantee that `{amount}` can never be omitted — a future variant omitting `{amount}` under a different name would pass unnoticed [`packages/i18n/tests/sahyog-shared-dark-copy.test.ts:386`] — **fixed:** added a structural walk over every `message_block.headline.*` key that exists, asserting `{amount}` on each, independent of its name
- [x] [Review][Patch] The EN copy is tested to keep the Devanagari tagline untranslated (`:283`), but there is no mirror assertion protecting the Latin "Pariwar" inside the HI `message_block.join` string from a future localization pass [`packages/i18n/locales/hi/sahyog-shared.json:29`] — ⚠⛔ **CORRECTED 2026-09-12 (re-review): the finding's premise was false.** The pre-existing `.toBe()` exact-match on the same key already fully pins the string — any transliteration fails it on its own — and the EN tagline check is likewise a bare `.toBe()` with no companion `.toContain()`. The `toContain('Pariwar')` line first added here was a no-op and has been **removed** rather than left in as redundant scaffolding.
- [x] [Review][Patch] Self-exclusion carve-out matches by bare filename (`f.endsWith('sahyog-shared-dark-copy.test.ts')`) rather than by path — a same-named file elsewhere would be wrongly excluded, and a rename of this file would make the fence self-fail [`packages/i18n/tests/sahyog-shared-dark-copy.test.ts:194,494`] — **fixed:** both call sites now compare `f === OWN_FILE`, an exact path computed from `import.meta.url`
- [x] [Review][Patch] AC3's "do not derive one" no-name variant silently drops the ₹ from the Panel's literal §9.1 row-4 text with no Trap-1-style disclosure — the `.full` headline's ₹-drop is explicitly flagged as a deviation, but the `.no_family` headline's identical ₹-drop is presented as an unaltered quote [`11b-19-ratified-message-block-copy-source.md:183-186`] — **fixed:** added an explicit disclosure note under AC3 naming the same Trap-1 deviation
- [x] [Review][Patch] AC0 requires "the `epics.md` entry AND the sprint row land in a `governance:` commit" but the sprint row actually landed in the story-creation commit (`7d12a4ce`, `story(11b.19):...`), not a `governance:`-prefixed one — only the `epics.md` entry (`8303d92b`, later) satisfied the rule [`11b-19-ratified-message-block-copy-source.md:143-144`] — **fixed:** recorded the fact under AC0 rather than rewriting the shipped commits
- [x] [Review][Defer] "Nothing else moved" test regexes an unrelated package's exact chained-method spelling (`` district:\s*z\.string\(\)\.min\(1\)\.nullable\(\) ``) in `packages/contracts/src/public-pages/sahyog-vivran.ts` — a semantically-equivalent refactor there would break this i18n test for reasons unrelated to copy [`packages/i18n/tests/sahyog-shared-dark-copy.test.ts:522`] — deferred, pre-existing (same technique already used for `nomineeName` at `:232`; redesigning the verification method is out of scope for a copy-only story)
- [x] [Review][Defer] Trap 5's "no relationship claim" guarantee is enforced by a narrow keyword blacklist (`/nominee of|की नॉमिनी|के नॉमिनी/`), trivially defeated by rephrasing [`packages/i18n/tests/sahyog-shared-dark-copy.test.ts:341`] — deferred, pre-existing (a semantic guarantee a regex test can't fully close; same limitation as B's earlier fence)
- [x] [Review][Defer] The claim that `$comment.*` keys are excluded from the production parity script / resolver's resolvable surface is never verified against production code in this diff, only by the test file's own filter (`!k.startsWith('$comment')`) — deferred, pre-existing (convention inherited from B's `$comment.index_line`, not introduced here)
- [x] [Review][Defer] The "five traps" governance narrative is duplicated near-verbatim across the Change Log, four sprint-status ledger blocks, `epics.md`, and two locale `$comment` blocks — this diff's own finding (that `$comment.index_line` went stale about its own render state) shows this duplication pattern reliably rots, yet more copies were added — deferred, pre-existing (systemic governance-process pattern, not a defect introduced by this diff)
- [x] [Review][Defer] The darkness proof pins the exact thrown-error wording from `resolver.ts` (`/missing interpolation param '...'/`) — couples a "pure catalog change" story's tests to an implementation detail of the resolver's error message [`packages/i18n/tests/sahyog-shared-dark-copy.test.ts`] — deferred, pre-existing (pattern inherited from B's `index_line` tests)
- [x] [Review][Defer] `baseline_commit` pins going stale mid-review is a recurring cross-story process gap (this story's `ff92cb00`, sibling `11b-20`'s `738bb3ea`, both orphaned the same way) — deferred, pre-existing (a tooling/process fix, not a patch to this diff)
- [x] [Review][Defer] Both locale JSON files ship a multi-hundred-word `$comment.message_block` governance narrative that would bloat any client-side runtime payload loading these files [`packages/i18n/locales/en/sahyog-shared.json`, `packages/i18n/locales/hi/sahyog-shared.json`] — deferred, pre-existing (same convention as B's `$comment.index_line`; a fix needs build-time `$comment.*` stripping across the whole i18n package)
- [x] [Review][Defer] AC4's district-drop behavior is asserted only vacuously (`not.toMatch(/not recorded/i)`), trivially true regardless of any future column-dropping logic — deferred, pre-existing (AC6 forbids a render test here; the real guarantee can only be enforced once a render site exists, which is `11b-17`/`11b-20`'s job)

### Re-review Findings (2026-09-12, second pass — reviewing the 7 patches above)

- [x] [Review][Patch] The "Pariwar" fix above was itself a no-op (see the corrected bullet above) — **fixed:** retracted, recorded, and explained rather than left in place
- [x] [Review][Patch] Self-exclusion's `f === OWN_FILE` compares two path forms (a directory-walk `join()` path and a `fileURLToPath` path) with no normalization, leaving a theoretical symlink/separator/case mismatch open [`packages/i18n/tests/sahyog-shared-dark-copy.test.ts:39-40,200,522`] — **fixed:** both sides now compared through `resolve()`
- [x] [Review][Patch] The sibling `index_line.*` zero-consumer fence (AC9) was left with the old fully-quoted-literal `RESOLVER` regex while the `message_block.*` fence (AC6) was widened to catch a dynamically-built key — same bypass class, same file, left inconsistent [`packages/i18n/tests/sahyog-shared-dark-copy.test.ts:198`] — **fixed:** widened to the same `[\w.$]+` shape; verified the one authorised consumer (`sahyog.astro`) uses only bare literals, so the fence still names exactly that one file
- [x] [Review][Patch] The widened `message_block.*` `RESOLVER`'s own inline comment misdescribed the regex, claiming `$` "ends" the match when `$` is included in, not excluded from, the character class [`packages/i18n/tests/sahyog-shared-dark-copy.test.ts:522-527`] — **fixed:** corrected the comment to name `{` as the actual terminator and explain why `$` is deliberately included
- [x] [Review][Patch] AC0's new note records a rule breach (sprint row landed outside a `governance:` commit) without stating whether AC0 is considered satisfied, waived, or still failing, while the story is marked `done` immediately alongside it [`11b-19-ratified-message-block-copy-source.md:158-164`] — **fixed, then corrected 2026-09-12 (third pass):** the second pass's fix over-reached, unilaterally declaring AC0 "discharged" with no cited authorising decision — exactly the reinterpret-a-ratified-rule pattern this story elsewhere forbids itself. Third pass restated it in the story's own established register: recorded, not resolved, matching `11b-18`'s skip and `11b-15`'s render debt
- [x] [Review][Patch] The legacy naming-only `no_amount` grep was kept alongside the new structural per-key check with no stated rationale for keeping both [`packages/i18n/tests/sahyog-shared-dark-copy.test.ts:409`] — **fixed:** added a comment explaining the naming check still names the offending key directly, which the structural walk cannot do
- [x] [Review][Defer] A render site could resolve a `message_block.*` key by string concatenation (`'message_block' + '.' + key`) rather than a template literal or bare literal, bypassing the widened `RESOLVER` regex — deferred, same class as Trap 5's regex-based relationship blacklist already deferred above (a semantic "no resolver anywhere" guarantee that no finite regex can fully close); folded into `deferred-work.md` under the existing entry for that limitation class

### Third-pass Findings (2026-09-12 — reviewing the fixes above, cumulatively)

- [x] [Review][Patch] AC0's "discharged" resolution (added in the second pass) was self-issued with no cited authorising decision, more conclusive than this story's own "recorded, not resolved" convention for other admitted historical facts (`11b-18`, `11b-15`) — **fixed:** restated in the story's established register (see the corrected AC0 note above)
- [x] [Review][Patch] The self-exclusion `resolve()` fix (second pass) claimed to close a "symlink/case mismatch" risk that `resolve()` cannot actually close (it normalises separators/relative segments only, not symlinks or case) — **fixed:** switched to `realpathSync` on both sides of the comparison, which does canonicalise through symlinks; re-verified 19/19 green
- [x] [Review][Patch] The sibling `index_line.*` fence's widening (second pass) was asserted "verified" by reasoning alone, with no equivalent probe evidence to the one already run for `message_block.*` — **fixed:** planted a live template-literal probe against the `index_line.*` fence too; it failed naming the probe by path, confirming parity of rigor; probe removed, tree verified clean
- [x] [Review][Patch] The rationale for keeping the legacy `no_amount` naming grep alongside the new structural walk (second pass) was factually wrong — it claimed only the naming grep names the offending key, but the structural walk's own assertion message already does that too — **fixed:** rewrote the rationale to the real reason (the naming grep also covers `message_block.*` keys outside `.headline.*`, which the structural walk never examines)
- [x] [Review][Patch] The structural `{amount}` walk (second pass) derived `headlineKeys` from the EN locale file only and reused them for HI — a headline variant existing only in HI would never be checked; and the filter required a `.` after `headline`, silently skipping a bare `message_block.headline` key with no variant suffix — **fixed:** `headlineKeys` now unions both locales' key sets, and the filter also matches the bare key
- [x] [Review][Patch] The `deferred-work.md` entries added in the first pass cited `:522` for two different pieces of code, both now stale after later passes shifted the file — the same brittleness this test file's own comments warn against for `sahyog-vivran.ts` — **fixed:** re-expressed both citations by what they point at, not a line number
- [x] [Review][Patch] The concatenation-bypass deferred item (second pass) inherited the Trap 5 bullet's "Trigger: unchanged," which describes a copy-wording change and has no bearing on a render site's key-construction style — **fixed:** wrote a trigger specific to the actual risk (the first `11b-17`/`11b-20` render landing)
- [x] [Review][Patch] The concatenation-bypass deferred item (second pass) used single-backtick code spans around a regex literal containing a literal backtick character, breaking Markdown rendering — **fixed:** switched to double-backtick delimiters, matching the convention used elsewhere in the same file
- [x] [Review][Patch] The first pass's own "fixed:" note for the `RESOLVER` widening claimed the character class "runs to the first character a real key cannot contain (`$`/`{`)," directly contradicted by the second pass's correction that `$` is included, not excluded — **fixed:** corrected the first-pass bullet's own wording for consistency

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

Claude Opus 5 (`claude-opus-5`) — `bmad-dev-story`, 2026-09-12.

### Debug Log References

- ⭐ **RED confirmed before a single key was written** — `pnpm vitest run tests/sahyog-shared-dark-copy.test.ts` ⇒ **9 failed | 10 passed**. ⭐ The 9 failures were the new `message_block.*` assertions (`missing key 'message_block.headline.full'`); ⭐ the 10 passes were B's shipped `index_line.*` block, ⛔ unbroken by the helper hoist.
- ⭐ **GREEN** after Tasks 2–3 ⇒ **19/19**; the full `@twt/i18n` suite **108/108** (13 files).
- ⭐ **AC7 gate run for real, ⛔ not read off a comment** — `pnpm turbo run i18n:check-parity` ⇒ *"✓ i18n parity gate passed — every member-facing en/ key has non-empty Hindi parity"*, **zero findings**.
- ⭐⭐ **THE FENCE WAS PROVEN TO BITE, ⛔ not assumed green** ([[feedback_gate_scope_semantic_coverage]]): a throwaway `packages/i18n/src/__fence_probe__.ts` containing the single string `'message_block.headline.full'` was planted, the suite re-run, and the zero-consumer test **FAILED naming the probe by path** (`+ "/packages/i18n/src/__fence_probe__.ts"`). ⭐ Probe deleted; `git status` verified clean; suite re-run **19/19**.
- ⭐ Regression sweep over every other `sahyog-shared` consumer: `apps/public` (`sahyog-copy` · `sahyog-stage-vocabulary` · `sahyog-vivran-copy`) **179/179**; `apps/mobile` (`sahyog-stage-copy-resolves` · `drive-list-render`) **42/42**. `typecheck` + `lint` on `@twt/i18n` clean.

### Completion Notes List

- ⭐ **AC0 — the `epics.md` section is minted** under Epic 11b (after 11b.15, before `## Epic 12`), naming `-214` **Consequence 2** as the commissioning authority, on the **11b.15 precedent** (`epics.md:5496`). ⛔ The sprint row was **NOT** re-added — ✅ it already existed (`7d12a4ce`); ⛔ only its value moved, via a **successor** `2026-09-12b` ledger block with the prior one untouched. ⭐ One `governance:` commit, ⛔ zero keys in it.
- ⭐ **THE PREMISE WAS RE-VERIFIED LIVE** before any work: `grep` for *"Be the Movement"* / *"सहयोग का हाथ"* / `message_block` across `packages/i18n/locales`, `apps/`, `packages/` ⇒ **ZERO** ⇒ B's half genuinely unshipped. ⭐ Baseline `0d0a03ab` re-checked as an **ancestor of HEAD** (`f408ca28`).
- ⭐ **AC1 — eight keys, both locales**, `sahyog-shared` grows **21 ⇄ 21 → 30 ⇄ 30** (8 keys + one `$comment`). ⭐ Verbatim against **§8.1 read at source**, ⛔ not transcribed from the story file.
- ⭐ **KEY SHAPE, and why the block is SIX keys and ⛔ not one.** AC3 rules the no-name variant *"replaces the **HEADLINE only**"* ⇒ a single whole-block key would force the other four paragraphs to be duplicated per variant, which is exactly the combinatorial explosion §10.2 ruling 3 forbids. ⇒ `message_block.headline.full` · `.headline.no_family` · `.solidarity` · `.gratitude` · `.tagline` · `.join`, plus `.table.nominee_name` · `.table.district` — ⭐ B's `index_line.full` / `.no_family` naming, extended by one segment (3-segment keys already exist here: `stage.live.help`).
- ⚠⛔ **ONE GAP THE PANEL LEFT, RECORDED OPENLY RATHER THAN PAPERED OVER** ([[feedback_record_unattested_no_backfill]]): **§8.1 gives the two table labels in ENGLISH ONLY** — it states the table inside an English sentence. ⚠ But the parity gate **requires** an HI value (an absent key is a **throw at render**, ⛔ not a fallback) ⇒ one had to exist. ⭐ **It is ⛔ NOT a dev translation:** both nouns are the **Panel's own Hindi words for these exact fields**, lifted from **§9.2's ratified HI index line** — *"**जनपद** {district_name} में कार्यरत … की **नॉमिनी** {nominee_name}"* — same routing note, same ratification, same day, same data. ⭐ The only word not lifted is *"पूरा नाम"*, which renders `-205` cl.1's ruled **FULL** form. ⇒ **`नॉमिनी का पूरा नाम`** · **`जनपद`**, asserted in the test **against B's shipped HI key** so the provenance cannot rot. ⚠ **Still worth a future routing note's confirmation** — ⭐ recorded in both `$comment`s, ⛔ not hidden in a commit message.
- ⚠⛔ **A SECOND DIVERGENCE FOUND AND ⛔ DELIBERATELY NOT "FIXED": `स्व.` vs `स्व०`.** §8.1's HI headline writes **`स्व.`** (full stop); B's shipped `index_line.*` / `zero_line.*` write **`स्व०`** (Devanagari abbreviation sign), and `$comment.zero_line` calls that *"the `index_line.*` convention"*. ⭐ §8.1's spelling is **KEPT** — the story's own instruction forbids *"re-punctuat[ing]"* ratified text, and normalising it is precisely that. ⭐ **CHECKED, ⛔ not missed**; recorded in both `$comment`s and in the test's own comment for a future routing note ([[feedback_supersede_never_reinterpret]]).
- ⭐ **AC4 — asserted, ⛔ not commented:** ⛔ **no literal `₹`** on any of the eight keys (Trap 1 — §8.1's `₹{amount}` would ship `₹₹`), and the round-trip proves it end-to-end (`rendered.match(/₹/g)` ⇒ **exactly 1**). ⛔ **No `no_amount` variant** exists and the headline has **exactly two** variants — both pinned programmatically over the raw JSON, ⛔ never a transcribed count.
- ⭐ **AC5 / Trap 5 — the prohibition is a TEST, ⛔ not a promise:** every key in the family is asserted **not** to match `/nominee of|की नॉमिनी|के नॉमिनी/` ⇒ ⛔ no key can ever state the relationship the schema cannot support (`D5-subject (i)`). ⭐ Neither `$comment` writes *"the nominee of"*.
- ⭐ **AC5 — the `$comment` mirrors `$comment.index_line`'s SHAPE, ⛔ not its present tense.** It carries *"AUTHORED HERE, RENDERED NOWHERE YET"* (⭐ **true of THESE keys today**) **and** the property that **survives the render arriving** — *resolved ⛔ ONLY where EVERY token is supplied* — so when `11b-17` / `11b-20` light it up the comment **narrows**, ⛔ it does ⛔ not become false. ⛔ B's stale comment was **NOT** edited.
- ⭐ **AC6 — the fence EXTENDS B's shipped file rather than forking it.** The repo walker (`SCAN_ROOTS` / `SKIP` / `sources` / `files`) was **hoisted to module scope, byte-identical**, so both families scan **ONE** walker — two copies drift the moment one gains a `SKIP` entry the other lacks. ⛔ No assertion of B's was weakened; all five AC6 properties are present for `message_block.*` (walk · **self-exclusion** · **non-vacuity** `>200` · `AUTHORISED = []` · `t()`-throws + clean round-trip).
- ⭐ **The fence carries its OWN successor instruction in writing**, as B's did: *when `11b-17`/`11b-20` land, ⛔ do ⛔ not delete this assertion — **NARROW** it to "never resolved without every token supplied", naming each authorised site.*
- ⚠ **NOT this story's, and left alone deliberately:** `11b-17`'s retired *"Consequence 3 … still unhomed"* sentence (the last line of its STOP 2 block) · `11b-15`'s recorded render debt · `11b-18`'s unmerged branch · B's stale `$comment.index_line`.

### File List

- `_bmad-output/planning-artifacts/epics.md` — modified (AC0: new `### Story 11b.19:` section at the end of Epic 11b)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (row → `in-progress` → `review`; successor `2026-09-12b` ledger block)
- `_bmad-output/implementation-artifacts/11b-19-ratified-message-block-copy-source.md` — modified (tasks, Dev Agent Record, File List, Change Log, Status)
- `packages/i18n/locales/en/sahyog-shared.json` — modified (AC1–AC5: `$comment.message_block` + 8 keys)
- `packages/i18n/locales/hi/sahyog-shared.json` — modified (AC1–AC5: `$comment.message_block` + 8 keys)
- `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` — modified (AC6/AC7: helper hoist + 9 new assertions across two describe blocks)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-12 | 1.0 | ⭐⭐ **IMPLEMENTED (`bmad-dev-story`) — ALL 7 ACs SATISFIED, ALL 4 TASKS COMPLETE.** ⭐ `sahyog-shared` grows **21 ⇄ 21 → 30 ⇄ 30**: `$comment.message_block` + **8 keys** in each locale (`message_block.headline.full` · `.headline.no_family` · `.solidarity` · `.gratitude` · `.tagline` · `.join` · `.table.nominee_name` · `.table.district`). ⛔ **ZERO renders, ⛔ zero routes, ⛔ zero contracts, ⛔ zero DB.** ⭐ **AC0** — the `epics.md` section is minted (11b.15 precedent) in a **`governance:` commit that contains ⛔ no keys**; ⛔ the sprint row was **not** re-added, ⭐ only flipped, via a successor `2026-09-12b` ledger block. ⭐ **THE PREMISE AND THE PIN WERE RE-VERIFIED LIVE** before any work — the ratified strings grep to **ZERO**, and `0d0a03ab` ✅ **IS** an ancestor of HEAD. ⭐ **AC1** verbatim against **§8.1 read at source**, ⛔ not transcribed from this file. ⭐⭐ **THE BLOCK IS SIX KEYS AND ⛔ NOT ONE, BY AC3's OWN RULE**: the no-name variant replaces *"the **HEADLINE only**"* ⇒ a single whole-block key would duplicate the other four paragraphs per variant — ⭐ precisely the combinatorial explosion §10.2 ruling 3 forbids. ⚠⛔ **ONE GAP THE PANEL LEFT, RECORDED OPENLY ⛔ RATHER THAN PAPERED OVER: §8.1 GIVES THE TABLE LABELS IN ENGLISH ONLY**, but the parity gate requires an HI value (an absent key is a **throw**, ⛔ not a fallback). ⭐ The two Hindi labels are ⛔ **NOT a dev translation** — **जनपद** and **नॉमिनी** are the **Panel's own Hindi words for these exact fields**, lifted from **§9.2's ratified HI index line** (same note, same ratification, same day), plus *"पूरा नाम"* for `-205` cl.1's ruled FULL form; ⭐ **asserted in the test against B's shipped HI key** so the provenance cannot rot, and ⚠ flagged in both `$comment`s as worth a future routing note's confirmation. ⚠⛔ **A SECOND DIVERGENCE FOUND AND ⛔ DELIBERATELY NOT "FIXED": `स्व.` (§8.1) vs `स्व०` (B's shipped convention)** — ⭐ §8.1's spelling is KEPT, because normalising it is exactly the *"re-punctuat[ing]"* this story forbids; ⭐ **CHECKED, ⛔ not missed**, and recorded in both `$comment`s. ⭐ **AC4 is ASSERTED, ⛔ not commented**: ⛔ no literal `₹` on any key (the round-trip proves **exactly ONE** ₹ reaches the page), ⛔ **no `no_amount` variant**, and the headline's **two** variants are counted **programmatically over the raw JSON**, ⛔ never transcribed. ⭐ **Trap 5 is a TEST**: every key is asserted **not** to match `/nominee of|की नॉमिनी|के नॉमिनी/`. ⭐ **AC5** mirrors `$comment.index_line`'s **SHAPE, ⛔ not its stale present tense** — it states the property that **survives the render arriving**, so the comment **narrows** when `11b-17`/`11b-20` land; ⛔ B's own stale comment was **not** edited. ⭐⭐ **AC6 EXTENDS B's SHIPPED FENCE rather than forking it** — the repo walker is **hoisted byte-identical** so both families scan **ONE** walker; all five properties hold for the new family with **`AUTHORISED = []`**, and the fence carries its **own successor instruction** (*narrow, ⛔ never delete*). ⭐⭐ **AND THE FENCE WAS PROVEN TO BITE, ⛔ NOT ASSUMED GREEN** ([[feedback_gate_scope_semantic_coverage]]): a planted `__fence_probe__.ts` made it **FAIL naming the probe by path**; probe deleted, tree verified clean, suite re-run **19/19**. ⭐ **AC7** — `pnpm turbo run i18n:check-parity` run locally ⇒ **zero findings**. ⭐ Regressions: `@twt/i18n` **108/108** · `apps/public` copy suites **179/179** · `apps/mobile` **42/42** · typecheck + lint clean. ⚠ **Left alone deliberately** (⛔ not this story's): `11b-17`'s retired STOP-2 sentence · `11b-15`'s recorded debt · `11b-18`'s unmerged branch · B's stale `$comment`. | BigDev + Claude |
| 2026-09-12 | 0.2 | ⭐⭐ **VALIDATED (`bmad-create-story validate`) — 8 FINDINGS, ALL APPLIED. ⛔ ZERO ROWS MOVE; ⛔ NO CODE.** ⭐ The story's CORE survived every check: AC1's EN **and** HI match routing-note **§8.1 verbatim** (modulo the two declared deviations), AC3 matches **§9.1 row 4** verbatim, §10.2 ruling 3 is quoted exactly, and the premise is **live-true** — `grep "Be the Movement"` / `"सहयोग का हाथ"` across `packages/i18n/locales/` still returns **ZERO** ⇒ B's half is genuinely unshipped. ⚠⛔ **(1) THE PIN WAS ORPHANED** — `ff92cb00` is ⛔ NOT an ancestor of HEAD (it lives only on `governance/11b-17-…`); re-pinned to its **tree-identical** main-line twin **`0d0a03ab`** ⇒ ⭐ the content baseline was sound, ⛔ nothing re-argued. ⚠ `11b-20` carries the same orphan. ⛔⛔ **(2) *"THE PUBLIC RENDER HAS ⛔ NO NAMED HOME"* IS ⛔ NOW FALSE at TWO sites** — **`11b-20`** was minted the same day from Consequence 3, is `ready-for-dev`, and **blocks on THIS story**; ⇒ `-214` is **HOMED end to end**, ⚠ ⛔ **not "closed"** (all three are `ready-for-dev`). ⭐⭐ **(3) AC6 NAMED THE WRONG FENCE AND THE RIGHT ONE IS SHIPPED** — v0.1 said *"the shape story E's AC8 uses"*; ⛔ `11b-15`'s AC8 is a *"nothing else moves"* **semantic** fence that scans ⛔ nothing. ⭐ The real model is **`packages/i18n/tests/sahyog-shared-dark-copy.test.ts`**, which already solves all five properties — repo walk, **self-exclusion**, a **non-vacuity** assertion (`files.length > 200`), an **`AUTHORISED` allow-list** (⭐ `[]` here), and a `t()`-throws **proof of darkness**. ⭐⭐ **(4) TRAP 3's MODEL IS STALE ABOUT ITSELF** — `$comment.index_line` says *"RENDERED NOWHERE YET"*, ⛔ but **story D landed** and `index_line.*` **IS resolved live** at `sahyog.astro:186-236`; ⇒ mirror its **SHAPE**, ⛔ not its present tense, and mirror the **narrowed** surviving property (*"only where EVERY token is supplied"*). ⚠ **(5) THE `11b-18` SKIP REASON WAS HALF FALSE** — *"no row"* ✅ true, *"⛔ no file"* ⛔ **FALSE**: the file exists on the unmerged local branch `story/11b-18-…` and the ledger's `2026-09-07k` block says the omission is **deliberate**; ⭐ the conclusion is unchanged and **stronger**. ⚠ **(6) §9.1 WAS QUOTED IN HALF** — its note on blocker (1) also ordered *"the **no-amount** variants"*; ⭐ moot (D is `done`) and now **stated**, with B's own four-variant precedent asserted. ⚠ **(7) AC0 IS HALF-DISCHARGED** — the **sprint row already exists** (`7d12a4ce`); ⛔ only the `epics.md` entry is owed. ⭐ **(8) AC7's GATE NAMED WITH ITS PASSING STATE** — CI `i18n-parity` → `pnpm turbo run i18n:check-parity`; today **21 ⇄ 21 keys, zero asymmetry**. ⭐ **Verified clean, ⛔ so the next pass need not re-derive:** `resolver.ts:36-42` is an EXACT cite in the **right function** (#21); the AC↔Task map is **bidirectionally complete**; ⛔ no code doc-block or `deferred-work.md` item routes anything to `11b-19` (#9); ⛔ **no rival story** owns this work (#10); `D5-subject (i)`'s *"the SCHEMA is the authority"* is called **that item's own ruling** ⇒ Trap 5's word survives (#22); `District` is still `.nullable()` (⭐ re-expressed as a field address — it has moved `:322`→`:349`, #19). ⚠⛔ **AND THIS PASS CHECKED ITSELF ON THE WAY OUT (#22), WHICH CAUGHT ONE OF ITS OWN:** the sweep note it had just written cited `11b-17:51` — ⛔ the sentence is at **`:50`** and `:51` is blank. ⇒ ⭐ re-expressed as *"the last line of its STOP 2 block"*, and ⛔ **no blanket *"all pointers verified"* sentence is written here** — each of the eight pointers this pass added was `sed`-ed individually (#22(c)). ⭐ AC↔Task map re-built **bidirectionally** after the edits: ⛔ zero orphans either way (#22(b)). ⭐⭐ **AND THE TWO FALSE LEDGER CLAIMS WERE FIXED BY THIS PASS, ⛔ NOT ROUTED TO THE DEV** — they were **ours**, so `sprint-status.yaml` gains a **successor** `2026-09-12a` block with the prior one untouched (the `-128`/`-129` precedent, and the same call `8-17`'s third pass made). ⚠ That prepend shifts every line number in that file — ⭐ which is why ⛔ **no `sprint-status.yaml` line number is cited anywhere here**; ⭐ navigate it by `last_updated` block and by the `11b-19` row (#19). | BigDev + Claude |
| 2026-09-11 | 0.1 | ⭐ Created from `#decision-2026-09-11-214` **Consequence 2** — B's unshipped copy source given a NAMED HOME, as `-191` cl.1's lapse taught us to do. ⛔ **AUTHORITY ALREADY RATIFIED** (DR + KB, 2026-09-05) ⇒ ⛔ ZERO open decisions. ⭐⭐ **FIVE TRAPS FOUND BY LIVE VERIFICATION WHILE AUTHORING:** (1) §8.1's literal **`₹{amount}` would ship `₹₹`** — `{amount}` arrives ALREADY FORMATTED **with** its ₹ (`$comment.drive_target`: *"`Expected: ₹ 300`"*), and B's own `index_line.full` carries ⛔ **no** literal ₹ from the same ratification; (2) §8.1 writes **`{familyName}`** where this namespace is **snake_case** throughout; (3) `t()` **THROWS** ⇒ **author, ⛔ do ⛔ not render** — B's `$comment.index_line` already names the pattern (*"AUTHORED HERE, RENDERED NOWHERE YET"*); (4) ruling 3's omit-the-clause has ⛔ **no combinatorial variants**, and B's `no_family` drops the **district** clause too because *"who served in … district"* modifies the **DECEASED**, ⛔ not the nominee — ⭐ the same logic governs the **table**; (5) the column says *"Nominee"* over `account_holder_name_ciphertext`, which `D5-subject (i)` rules the **schema** denies ⇒ ⭐ author a **LABEL**, ⛔ never the claim *"is the nominee of"*. ⚠ **KEY `11b-18` SKIPPED** — named in `sprint-status.yaml` ledger entries (twice as *"STAYS `ready-for-dev`"*) but ⛔ **absent from `development_status`** and ⛔ no file; ⛔ recorded, ⛔ not resolved. ⛔ **NO CODE.** | BigDev + Claude |
