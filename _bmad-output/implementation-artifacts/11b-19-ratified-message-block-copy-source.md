---
baseline_commit: ff92cb00
---

<!--
⭐ BASELINE — `governance(11b.17): record decision 2026-09-11-214`.
⭐ Minted 2026-09-11 from `#decision-2026-09-11-214` **Consequence 2**, which requires B's unshipped
copy source a NAMED HOME before story F ships.
⚠⛔ **KEY `11b-18` IS DELIBERATELY SKIPPED.** `sprint-status.yaml` names
`11b-18-drive-target-write-authority-retired` in several ledger entries (and twice asserts it
*"STAYS `ready-for-dev`"*) — ⛔ but it is **⛔ NOT a row in `development_status` and has ⛔ no file.**
⭐ Recorded, ⛔ not resolved here; ⛔ taking that key would collide with a recorded intent.
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

⚠ The renders are **elsewhere and ⛔ not this story's**: the **member** half is `11b-17` **AC10 /
Task 5d** (`-214` cl.4(b)); the **public** half has ⛔ **no home yet** (`-214` Consequence 3).

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
⚠ `District` is `.nullable()` on the wire ⇒ ⛔ its **column** is dropped when absent, ⛔ never rendered
as *"Not recorded"*.

### AC5 — The `$comment` carries the ratification AND the no-consumer warning
⭐ Mirror `$comment.index_line`'s shape: the ratifying trustees + date, the decision id
(**`2026-09-11-214`**), the §8.1 / §9.1-row-4 / §10.2-ruling-3 sources, ⭐ **"AUTHORED HERE, RENDERED
NOWHERE YET"**, the `t()`-throws warning, and Trap 4's district-attribution reasoning.
⚠⛔ ⛔ Do ⛔ not write *"the nominee of"* anywhere in the comment (Trap 5).

### AC6 — ⛔ Nothing renders, and ⛔ nothing else moves
⛔ No component · ⛔ no route · ⛔ no contract · ⛔ no DB · ⛔ no public surface · ⛔ no member surface.
**And** ⭐ a **fence test** proves the new keys have **ZERO** consumers in `apps/` and `packages/`
(⛔ excluding this story's own catalog test) — ⭐ the shape story E's AC8 uses.

### AC7 — Both locales stay structurally identical
⭐ Same key set, same token set per key, ⛔ no key in one locale absent from the other — the existing
i18n parity gate. ⚠ ⛔ A missing HI key is a **throw at render**, ⛔ not a fallback.

---

## Tasks / Subtasks

- [ ] **Task 1 — GOVERNANCE** (AC0) — ⭐ an `epics.md` entry under Epic 11b naming `-214` Consequence 2
      as the commissioning authority; add the sprint row; ⛔ one `governance:` commit, ⛔ no keys.
  - [ ] ⚠ Record that **`11b-18` is skipped** and why (the ledger names it; `development_status` has
        ⛔ no such row and there is ⛔ no file) — ⛔ recorded, ⛔ not resolved here.
- [ ] **Task 2 — The keys** (AC1, AC2, AC3, AC4, AC7) — `packages/i18n/locales/{en,hi}/sahyog-shared.json`.
  - [ ] ⭐ Name them on B's pattern (`index_line.full` / `.no_family` / …) so the omit-the-clause
        variants read as one family.
  - [ ] ⚠⛔ ⛔ No literal `₹` (Trap 1) · ⭐ snake_case tokens (Trap 2).
- [ ] **Task 3 — The `$comment`** (AC5) — ⭐ modelled on `$comment.index_line`, ⛔ not invented.
- [ ] **Task 4 — Tests** (AC6, AC7)
  - [ ] ⭐ The **zero-consumer fence** — ⛔ a grep-shaped source scan, since these keys are ⛔ meant to
        be dark.
  - [ ] ⭐ Locale parity over the new key family.
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

⭐ It clears **STOP 2** on `11b-17` — ⇒ **AC10 / Task 5d** become buildable.
⛔ It does ⛔ **not** clear `-214` **Consequence 3** — the **public** render still has ⛔ no named home.

### ⚠ The `{amount}` dependency, stated so it is ⛔ not discovered

⭐ `{amount}` is supplied by story **D** (`11b-14`), which is **`done`** ⇒ the field exists. ⚠ But the
**block** is dark until a render site supplies every token ⇒ ⭐ ⛔ nothing here is blocked on D, and
⛔ nothing here may render.

### References

- ⭐ `.decision-log.md#decision-2026-09-11-214` — **the commissioning authority**; cl.4(d), Consequences 2, 5, 6, 7, 8
- ⭐ `…/trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md` **§8.1** (the text), **§9.1 row 3** (the routing), **§9.1 row 4** (the no-name variant), **§10.2 ruling 3** (omit the clause)
- ⭐ `packages/i18n/locales/{en,hi}/sahyog-shared.json` — `index_line.*` + `$comment.index_line`, ⭐ **the pattern to copy**
- ⭐ `packages/i18n/src/resolver.ts:36-42` — `t()` throws on an unsupplied token
- ⚠ `deferred-work.md` **`D5-subject (i)`** — *"the SCHEMA is the authority"* (Trap 5)
- ⚠ `_bmad-output/implementation-artifacts/11b-17-member-drive-detail-unredacted.md` — **AC10 / Task 5d**, the member render this unblocks
- `.decision-log.md#decision-2026-09-04-193` cl.3 · `#decision-2026-09-07-206` cl.1, cl.3 · `#decision-2026-09-07-205` cl.1

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-11 | 0.1 | ⭐ Created from `#decision-2026-09-11-214` **Consequence 2** — B's unshipped copy source given a NAMED HOME, as `-191` cl.1's lapse taught us to do. ⛔ **AUTHORITY ALREADY RATIFIED** (DR + KB, 2026-09-05) ⇒ ⛔ ZERO open decisions. ⭐⭐ **FIVE TRAPS FOUND BY LIVE VERIFICATION WHILE AUTHORING:** (1) §8.1's literal **`₹{amount}` would ship `₹₹`** — `{amount}` arrives ALREADY FORMATTED **with** its ₹ (`$comment.drive_target`: *"`Expected: ₹ 300`"*), and B's own `index_line.full` carries ⛔ **no** literal ₹ from the same ratification; (2) §8.1 writes **`{familyName}`** where this namespace is **snake_case** throughout; (3) `t()` **THROWS** ⇒ **author, ⛔ do ⛔ not render** — B's `$comment.index_line` already names the pattern (*"AUTHORED HERE, RENDERED NOWHERE YET"*); (4) ruling 3's omit-the-clause has ⛔ **no combinatorial variants**, and B's `no_family` drops the **district** clause too because *"who served in … district"* modifies the **DECEASED**, ⛔ not the nominee — ⭐ the same logic governs the **table**; (5) the column says *"Nominee"* over `account_holder_name_ciphertext`, which `D5-subject (i)` rules the **schema** denies ⇒ ⭐ author a **LABEL**, ⛔ never the claim *"is the nominee of"*. ⚠ **KEY `11b-18` SKIPPED** — named in `sprint-status.yaml` ledger entries (twice as *"STAYS `ready-for-dev`"*) but ⛔ **absent from `development_status`** and ⛔ no file; ⛔ recorded, ⛔ not resolved. ⛔ **NO CODE.** | BigDev + Claude |
