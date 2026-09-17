---
baseline_commit: 05094a68
---

<!--
⭐ **RE-PINNED 2026-09-11 by this story's FIRST `validate` pass** — `ae24a9e1` → `491a0fac`,
**188 commits** of drift. ⭐ Every claim below is RE-VERIFIED against this SHA by three independent
verifiers; ⛔ the previous anchor was DERIVED after the fact and **⛔ no claim had ever been checked**.
⚠ That debt is now DISCHARGED — and it was large: see **§ v2.0** below.
⛔ The old *"verified live at `79ed41d`"* second anchor is RETIRED — ⭐ one story, ⭐ one pin.

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

⭐⭐ **THAT DEBT IS NOW DISCHARGED — v2.1, 2026-09-15, the story's SECOND validate pass.**
⭐ **THE TWO FACTS, STATED SEPARATELY** (⛔ never merged again — the 2026-09-11 pass merged them and
the conclusion expired in four days):
  · **The pin is an ancestor.** `git merge-base --is-ancestor 05094a68 HEAD` ✅ and
    `… 05094a68 origin/main` ✅. ⭐ **DURABLE** — re-assert only after a branch rewrite.
  · **The code claims were re-derived at `be0037cc`.** ⭐ **PERISHABLE** — ⛔ the next pass inherits
    ⛔ NOTHING from this line and MUST re-run `git diff --name-only <pin>..HEAD -- packages apps`.
⚠⛔ **THE RE-DERIVATION FOUND 16 DEFECTS, 6 BLOCKING** — see **§ v2.1**. ⛔ The baseline is ⛔ NOT
re-pinned: the pin is sound and the drift is now ARGUED rather than carried as risk.
⭐⭐ **AND `D-percentage` WAS RULED 2026-09-15** (`#decision-2026-09-15-218`) ⇒ ⭐ **this story now
carries ⛔ ZERO open decisions.**
-->

<!--
⭐⭐ **GLYPH REGISTER — DECLARED, ⛔ NOT INFERRED** ([[feedback_story_validate_footguns]] item 24(f);
a prior pass in a sibling file inverted **fourteen** instructions by using `⛔` as emphasis):
  · **`⛔` NEGATES the words that follow it.** ⛔ It is ⛔ never emphasis. *"⛔ not X"*, *"⛔ no X"*,
    *"⛔ never X"*. ⇒ ⛔ **do ⛔ not write `⛔ One commit`** when you mean *one commit*.
  · **`⭐` marks an ACTION or an affirmative finding.** Positive imperatives take `⭐`.
  · **`⚠` marks a HAZARD** — something true that will bite if unread.
  · **Doubling (`⭐⭐` / `⛔⛔` / `⚠⚠`) is VOLUME only** — ⛔ never a different meaning.
⇒ ⭐ on every edit, grep `⛔ ` followed by a verb, a number or a quoted word and re-read each hit.
-->

## ⭐ How to cite in this file

⛔⛔ **`.decision-log.md`, `deferred-work.md` and `sprint-status.yaml` are PREPEND-STRUCTURED or
heavily edited ⇒ ⛔ NO `file:NNN` POINTER INTO THEM SURVIVES.** The 2026-09-11 pass wrote nine, and
⛔ **all nine had rotted by 2026-09-15** — including the Preflight's own. ⇒ this file cites those
three by **decision id + clause**, by **item letter**, and by **row key**. ⛔ Never by line.
⭐ `deferred-work.md` states the rule itself: *"The **ITEM LETTERS** are the stable address. Cite
those, ⛔ not the lines."* ⚠ `packages/` and `apps/` line cites ARE used — they are re-derived at
`be0037cc` and are re-derivable by the next pass ([[feedback_story_validate_footguns]] item 19).

# Story 11b.3b: Sahyog Vivran Named-Identity Render Layer — Deceased Member Name + Contributor List `[SURFACE]`

Status: in-progress

<!--
⭐⭐ **THE THREE ROUTED QUESTIONS WERE RULED 2026-09-16 (Trustee Panel — Dhiraj Rahul + Kalpana
Bharti) as `#decision-2026-09-16-219`. ⛔ THE ROW STAYS `in-progress`, AND THE REASON HAS CHANGED:**
⛔ it is ⛔ no longer *"awaiting a ruling"* — it is ⭐ **IMPLEMENTATION OWED BY THE RULING**:
  · ✅ **cl.1/cl.3/cl.4 — DONE 2026-09-16.** ⭐ **THE HINDI WAS RULED — `एक सहकर्मी`** — which
    UNBLOCKED this. ⚠⛔ **`सहकर्मी` is ⛔ NOT a new word:** it is the SHIPPED Hindi for *colleague* on
    this very surface family, already in ratified Panel copy (`sahyog-shared.json` —
    `message_block.gratitude`, `message_block.solidarity`, `stage.live.help`) ⇒ ⭐ ONE vocabulary, ⛔ not
    a mint. ⚠ The English names the ACT and the Hindi the RELATIONSHIP; ⛔ that is ⛔ not drift — the
    page already carries both registers in both locales (`index_line.*` = *"by colleagues"*).
    ⭐ **The wire carries `name: null`, ⛔ never the word** — copy resolves at the RENDER layer from
    **`sahyog-vivran.value.contributor_unnamed`**. ⚠⛔ That NAMESPACE IS THE FENCE for cl.2: the member
    list consumes `contribution.contributor_list.*`, so it can ⛔ not reach this key and keeps D5 whole.
    ⭐ The placeholder renders as plain copy, ⛔ **NOT** through `<MatrixField>` — routing page copy
    through it would classify it as the member's Tier-1 datum AND make the scrape leak-leg pass over a
    row holding ⛔ no name.
    ⭐ **Three API tests INVERTED by name, ⛔ none deleted**, each quoting the superseded assertion.
    ⚠ A mis-citation was corrected on the way: the *"still counts"* ruling is `-169` **cl.6**
    (D3-aggregate), ⛔ not cl.4 (the batched-state-read clause), which that test had cited since it was
    written.
  · ✅ **cl.5(a) — DONE 2026-09-16.** `isAmountDerivation` gained a SECOND leg: a `COUNT_OPERAND`
    times a **numeric literal**, symmetric on operand order, parenthesis-tolerant. ⭐ **Three new
    tests, and the ISOLATION is proven, ⛔ not asserted:** reverted to `HEAD`'s `lib.ts` the two
    literal-leg tests go **RED** and ⛔ nothing else does (`2 failed | 22 passed`); restored, `24/24`
    and the live `check` still passes on the shipped tree. ⚠ The pre-existing test was ALSO re-titled
    and sharpened — it claimed *"even when NO banned word is named"* while its own fixture named
    `row.fixedAmount`, so it would have passed with the shape leg DELETED; it now pins the expected
    DOUBLE fire. ⚠⛔ **STILL ⛔ NOT CAUGHT, recorded in the doc-block:** an operand aliased to a local
    `const` (`const per = 1000; count * per`) — closing it needs const-tracking, a different
    instrument. ⭐ `-219` cl.5(b) makes this gate the SOLE enforcement of D1(c), so that gap is the
    WHOLE remaining exposure ([[feedback_record_unattested_no_backfill]]).
  · ✅ **cl.6 — DONE 2026-09-16.** `public-vs-private-matrix.yaml`'s `contributor_name` entry: the
    `-160` cl.7 basis citation is CORRECTED in both the `description` and the
    `tier1_public_exception.rationale`, with the superseded wording **quoted in place** rather than
    swapped away ([[feedback_closure_language_precision]]). ⚠ `decision:` stays `2026-09-02-174` —
    that is the DECLARATION's decision, ⛔ not the basis's. ⛔ No predicate changed.
⚠⛔ **AND ⛔ DO ⛔ NOT WRITE THE PLACEHOLDER AC AS CLOSING Q1** — `-219` cl.1 ratifies (E) on the
**FAIRNESS** ground and records in terms that it **WIDENS** disclosure.

⚠⛔⛔ **MOVED `done` → `in-progress` BY THE SECOND CODE-REVIEW PASS, 2026-09-16.** ⛔ This is ⛔ not a
re-opening of any ratified decision ([[feedback_supersede_never_reinterpret]]) — ⭐ the eleven patches
that pass found are APPLIED and VERIFIED. ⚠ The row moved back because **THREE PANEL-ROUTED
OBLIGATIONS WERE OPEN**, and one was live on a SHIPPING public surface: the
*"⛔ NO OMISSION COUNT, EVER"* rule is derivable by subtraction and, at `limit=1`, is a PER-POSITION
erasure oracle. ⭐ All three are carried in `deferred-work.md` under this pass's section, now marked
`[PANEL-ROUTED → DISCHARGED]` — ⚠⛔ **DISCHARGED ⛔ does ⛔ NOT mean BUILT** (see the block above).
⚠⛔ **AND THE TREE WAS RED WHEN THE ROW FIRST WENT `done`:** `662ab6a6`'s own review patch made six
wire fields hard requirements in `isSahyogVivranResponse` and broke `sahyog-serves.test.ts`, whose
repair was left UNCOMMITTED. ⇒ HEAD ran `3 failed / 21 passed` on that file and could ⛔ not have
passed `ci:local`. ⭐ See § *Review Findings — SECOND PASS (2026-09-16)*.
-->

## ⭐ PREFLIGHT — ⭐⭐ **ZERO OPEN DECISIONS. ⭐ Task 2 IS UNBLOCKED.**

| | Question | State |
|---|---|---|
| **`D-percentage`** | Does the drive **PAGE** render a completion percentage on a `closed`/`settled` drive? | ✅ **RULED 2026-09-15 — ⛔ NO.** `#decision-2026-09-15-218` **cl.1** (BigDev author-commit) |

⚠⛔ **⛔ THERE IS ⛔ NO SECOND OPEN ITEM.** ⭐ v2.1's first draft raised a *"`D-stageword`"* STOP over the
`settled` label. ⛔ **It was ⛔ not a decision and ⛔ not a conflict — it was a STALE CITATION**, and it is
**settled by reading**, ⛔ not by ruling. See **AC7**.

⭐ `#decision-2026-09-08-207`, **Open follow-ups** (Trustee-ratified 2026-09-08):
*"**11b-3b** owns the drive **page**'s `confirmedPercentage` posture (`-176` D1(b) / AC3b) … this ruling
binds the **index** only and does ⛔ not discharge 11b-3b's open question."*
⚠⛔ **CITE IT BY ID, ⛔ NOT BY LINE.** v2.0 cited `.decision-log.md:759-761`; at `be0037cc` that range
is a ⛔ **different entry entirely** (the publication-basis ruling). ⇒ see § *How to cite in this file*.

⭐ **RULED, RECORDED, AND THE STOP IS LIFTED.** `#decision-2026-09-15-218` **cl.1**: a `closed` or
`settled` drive page renders ⛔ **no** completion percentage — ⛔ not a figure, ⛔ not a meter, ⛔ not a
bar, ⛔ not an `aria-label`, ⛔ not copy. ⭐ BigDev author-commit; ⛔ ⛔ not a Panel matter.

⭐⭐ **AND THE TRACE CHANGED WHAT THE RULING *IS*.** The question was posed as if the page had a
percentage to suppress. ⛔ **It does ⛔ not** — `sahyog-vivran.ts` carries ⛔ **no percentage field in
⛔ any state**, the `:60-61` fence forbids one *"in any field, under any name"*, and
`packages/contracts/tests/public-pages-sahyog-vivran.test.ts:146-152` **already rejects**
`confirmedPercentage` (with `expectedTotal` / `targetAmount` / `shortfall`). ⚠ The percentage that
exists is the **INDEX's** — `sahyog-drive.ts:254`, gated to `live` at `sahyog-render.ts:445`.
⇒ **cl.2:** this ruling makes an existing **absence INTENTIONAL** and changes ⛔ **no code**. ⛔ Nobody
implements it; ⛔ nobody records it as work ([[feedback_closure_language_precision]]).

⚠⛔ **cl.3 — THE `live` ARM IS ⛔ NOT RULED AND MUST ⛔ NOT AUTO-WIDEN.** Only `closed`/`settled` was
asked and only that was answered. ⭐ The `live` page shows no percentage today **by FENCE**, ⛔ not by
ruling ⇒ adding one would need its own ruling **and** a fence lift. ⛔ Neither is granted.
⚠⛔ **cl.4 — AC3b's AMOUNT IS ⛔ NOT A BACK DOOR:** `amountRaisedInr` may ⛔ not be paired with, divided
by or captioned against a target, expected total or roster size — that reconstructs the percentage
cl.1 refuses and re-opens the channel `-204` cl.8 closed *"BY CONSTRUCTION"*.

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
| **S3** | Trap 3: *"this story is its binder"* (11b.1 item (e)) | ⛔ **RE-POINTED to `8-16`** (⚠ v2.0 addressed this as `deferred-work.md:637-642`; ⛔ **rotted** — navigate by the *"BINDER RE-POINTED (Story `8-16`…)"* bullet), which is `done` and merged FIRST |
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

⭐⭐ **THE `-177` vs `-182` QUESTION IS RESOLVED AND IS ⛔ NOT A DEFECT.** `#decision-2026-09-02-182`
lists D9/D10 as open; ⭐ it **transcribes a 2026-09-01 ruling** and its own Status line says it
*"supersedes, reverses and vacates **nothing**"*. ⇒ `-177` (ruled 2026-09-02) is authoritative.
⚠ `-182` owes a one-line forward pointer — ⛔ an amendment, ⛔ never a rewrite
([[feedback_supersede_never_reinterpret]]). ⚠⛔ v2.0 addressed this entry as `-182:3217`; ⛔ that line
pointer is retired per § *How to cite in this file*.

---

## ⭐ v2.1 — RE-DERIVED AGAINST `be0037cc`. ⛔ What the 2026-09-11 pass got wrong

⚠⛔ **v2.0 DISCHARGED THE "NEVER VALIDATED" DEBT AND LEFT A SECOND ONE OPEN IN WRITING** — it fixed the
SHA and told the next pass to re-diff `packages apps`. ⭐ This is that pass. **16 findings, 6 blocking.**
⭐ **THE SUBJECT SURVIVES AGAIN** — `-173`/`-174`/`-175` are live, the inert-gate finding (Trap 1) is
re-verified true, and the work is still undone. ⛔ What rotted this time was **addressing and
mechanism**: the code moved under four cited files, and v2.0's chosen build mechanism collides with
two shipped fences it never named.

⛔ **Kept as the record, ⛔ not deleted.** ⚠ A later reader must ⛔ not "restore" any of it.

| | What v2.0 said | ⛔ Why it is superseded |
|---|---|---|
| **T1** | AC3b: *"hoist `sahyog-vivran-read.ts:509`'s `deliveredTotal` onto the DTO"* | ⛔⛔ **BLOCKED BY A LIVE CI GATE.** `scripts/sahyog-vivran-financial-truth` rule (3) forbids an amount operand being **NAMED** in that DTO file. ⇒ **AC3b rewritten; AC11 minted** |
| **T2** | AC3b: `:509` is *"already computed server-side"* | ⛔ It is an **argument field inside a ternary**, guarded by `status === 'live' \|\| assignedCount === 0` ⇒ **`null` on every LIVE drive**; and `:496-498` forbids widening `SahyogVivranEntry` *"under any name"* |
| **T3** | AC3b names ⛔ no wire field and ⛔ no clamp | ⛔ The ruled name is **`amountRaisedInr`** (`-190` **cl.6**, `-189` **cl.5** — ⛔ neither was cited) and all three shipped precedents **clamp**, because an unclamped negative is a **500** |
| **T4** | AC3: *"authored over the SHARED presenter"* + *"resolves through `resolvePublicMemberName`"* | ⛔⛔ **MUTUALLY UNSATISFIABLE** — the presenter's input type has ⛔ **no full-name arm**; feeding it requires the **SHIELDED** form this story exists to reject |
| **T5** | Trap 5: *"every caller treats `''` as omit this row"* | ⛔ **FALSE at the cited call site** — `handlers.ts:528-530` omits **the NAME, ⛔ never the row**, and uses `.trim() \|\| null`, ⛔ not `=== ''` |
| **T6** | **Nine** `file:NNN` pointers into `.decision-log.md` / `deferred-work.md` / `epics.md` | ⛔ **ALL NINE ROTTED**, the Preflight's own among them ⇒ **re-expressed as ids / clauses / item letters**, ⛔ not re-derived |
| **T7** | AC5/Trap 4: `member-pool/handlers.ts:762-773`, `:771` | ⛔ **WRONG FUNCTION** — that range is now the `confirmedPercentage`/`driveTargetInr` pairing guard. Real sentinel sites: **`:621`, `:1047`, `:1236`** |
| **T8** | AC4: `member-pool/handlers.ts:406-408` *"HALVES the bound"* | ⛔ **WRONG FUNCTION** — that range is an audit-volume doc-block. The halved bound is **`:508`** |
| **T9** | AC7: *"the ten `contribution_list.*` keys"* | ⛔ **NO SUCH PREFIX** — the keys are **`contributor_list.*`** (`i18n-keys.ts:33-42`) |
| **T10** | AC7: `-191` cl.3 rules `settled` → *"Completed"* | ⛔ **SUPERSEDED CLAUSE** — **`-192` cl.1** amended it to **"Verified"** the same day and **`-193`** Trustee-ratified that. ⭐ The shipped copy is **CORRECT**; ⛔ only the citation was stale ⇒ **AC7 re-cited, ⛔ nothing minted, ⛔ no decision owed** |
| **T11** | AC2: *"the three stale epic ACs … under item (iii) at `:5156`"* | ⛔ `:5156` is **AI-11a-2**. ⭐ Two of the three ARE name-form annotations; the third (`:5045`) is a **different item** (11b.1 **D5**) |
| **T12** | ⛔ No AC named the `@twt/ui` presenter's own supersession | ⛔ **THREE shipped artefacts** still prescribe the presenter mechanism AC3b bypasses ⇒ **AC11 amends all three BY NAME** |
| **T13** | ⛔ No mention of `sahyog-shared-dark-copy.test.ts` | ⛔ A **repo-wide fence** over the namespace AC7's stage words live in, with two non-appendable allow-lists ⇒ **named at AC7** |
| **T14** | ⛔ No mention of the two `deferred-work.md` items routed here **by name** | ⚠ Both carry *"**Trigger:** 11b.3 merged"* and **`11b-3` is `done`** ⇒ ⭐ **both triggers have FIRED** |
| **T15** | `bounded-decrypt.ts` cited with ⛔ no path | ⭐ **`apps/api/src/modules/kyc/bounded-decrypt.ts`** (`:28` ✓, `:46` ✓) |
| **T16** | `⛔` used as **emphasis** at five sites, incl. **AC0's own commit rule** | ⛔ **INVERTS the instruction** ⇒ **glyph register declared**; all five corrected |

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

## 🎯 What already EXISTS — ⭐ RE-DERIVED at `be0037cc` (v2.1), ⛔ not assumed and ⛔ not inherited

⭐ **This table was re-read line by line at `be0037cc`.** ⚠ It is ⛔ **not** durable: the moment a
sibling ships, `git diff --name-only 05094a68..HEAD -- packages apps` is the only thing that says so.
⛔ The next pass inherits ⛔ nothing here.

| Fact | Where | ✓ |
|---|---|---|
| The `@twt/ui` `contribution-list` presenter emits name **PARTS** and ⛔ never joins them; the `unknown` arm **THROWS** | `packages/ui/src/contribution-list/presenter.ts:65-80` | ⭐ re-read |
| ⛔⛔ **AND ITS INPUT TYPE HAS ⛔ NO FULL-NAME ARM** — `{ kind:'name'; firstName; lastInitial } \| { kind:'unknown' }` | `packages/ui/src/contribution-list/view-model.ts:44-46`; the reason `:54-57` | ⭐ **v2.1** |
| ⚠ The shipped contributor wire is still the **SHIELDED** shape — ⛔ **the wrong form for this surface** | `packages/contracts/src/contributions/pool-contributor-list.ts:42-51` | ⭐ read |
| `resolvePublicMemberName` — Pariwar-configured; `full_name` is the **DEFAULT**, ⛔ never a literal | `packages/domain/src/kyc/public-name.ts:73`; default `:62` | ⭐ read |
| ⭐⭐ `resolvePoolIdentity` **NO LONGER hard-codes shielded** — 8.16 shipped it **mode-resolved** | `packages/domain/src/notifications/pool-identity.ts:201`, mode param `:205` | ⭐ read |
| ⚠ The Tier-1 allowlist holds **FOUR** entries, **two on 11b surfaces** | `packages/contracts/src/public-pages/matrix.ts:398-476` | ⭐ re-read |
| ⚠ `sahyog-vivran` already carries **ONE** Tier-1 field | `public-vs-private-matrix.yaml:1150-1152` | ⭐ read |
| `apps/public` has **⛔ NO** `@twt/ui` dependency — ⭐ adding it is **this story's act** | `apps/public/package.json` | ⭐ read |
| ⛔⛔ **THE RUPEE FIGURE IS ⛔ NOT "ALREADY COMPUTED" IN A USABLE FORM** — it is an argument field inside a ternary that is `null` on every **live** drive | `packages/domain/src/pool/sahyog-vivran-read.ts:504-510`; the anti-widening fence `:496-498` | ⭐ **v2.1** |
| ⭐ The **usable** precedent is the INDEX read — a clamped named binding, used twice, on the wire as `amountRaisedInr` | `packages/domain/src/pool/public-read.ts:1135`, `:1222`, `:1224`; why clamped `:1129-1134` | ⭐ **v2.1** |
| ⭐ Two more shipped instances of the same shape | `member-drive-detail.ts:376`, `:389`, `:461` · `member-drive-list.ts:346`, `:387` | ⭐ **v2.1** |
| ⛔⛔ **A LIVE CI GATE FORBIDS NAMING AN AMOUNT OPERAND ON THIS STORY'S OWN FILES** — and its header names **11b.3b** as owing the fix | `scripts/sahyog-vivran-financial-truth/lib.ts:112`, `:181-195`; scope + remedy `check.ts:12-22`, `:49-69`, `:181-187` | ⭐ **v2.1** |
| ⚠ It is wired into **both** CI arms | `.github/workflows/ci.yml:745-774` · `scripts/ci-local.sh:82` | ⭐ **v2.1** |
| ⚠ A **repo-wide** i18n fence walks `apps/public` and holds two ⛔ non-appendable allow-lists | `packages/i18n/tests/sahyog-shared-dark-copy.test.ts:227-249` (`index_line.*`), `:586-622` (`message_block.*`) | ⭐ **v2.1** |
| ⚠ The ten reusable keys are **`contributor_list.*`** in namespace `contribution` | `packages/ui/src/contribution-list/i18n-keys.ts:33-42` → `locales/{en,hi}/contribution.json:30-39` | ⭐ **v2.1** |
| ⚠ The public stage words ship in **`sahyog-shared`**, and `settled` renders **"Verified"** | `locales/{en,hi}/sahyog-shared.json` — `stage.live` / `stage.closed` / `stage.verified` | ⭐ **v2.1** |
| The control set is now **ONE constant**, which names this story as owner | `apps/api/src/modules/public-pages/sahyog-vivran-controls.ts:56-60` | ⭐ read |
| ⭐ The `ANONYMIZED_SENTINEL` plaintext-check pattern, at its **real** sites | `apps/api/src/modules/member-pool/handlers.ts:621`, `:1047`, `:1236`; the reason `:1229` | ⭐ **v2.1** |
| ⭐ The halved concurrency bound, at its **real** site | `apps/api/src/modules/member-pool/handlers.ts:508`; rationale `:489-496`, `:556` | ⭐ **v2.1** |

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
re-opens **by hand** the channel cl.8 closed.
⚠⛔ **v2.0 WROTE *"⛔ No gate catches it"* HERE. ⭐ THAT IS FALSE, AND THE TRUTH IS BETTER NEWS AND
WORSE NEWS AT ONCE** — see **Trap 2b**, which is the single most likely way this story fails CI.

⚠⛔ **The contract contradicts itself and BOTH halves are live:** `sahyog-vivran.ts:56-58` still invites
the two fields while `:60-61` forbids *"NO TARGET, EXPECTED TOTAL, PERCENTAGE, SHORTFALL OR COMPARISON
FIGURE — in any field, under any name."* ⇒ **Task 2 amends `:56-58` BY NAME.**

### Trap 2b — ⭐⭐ THE AMOUNT HAS A GATE, A FENCE AND A RULED FIELD NAME. ⛔ v2.0's AC3b MISSED ALL THREE

⛔⛔ **(1) A LIVE CI GATE FORBIDS THE OPERAND BEING *NAMED*, ⛔ not merely multiplied.**
`scripts/sahyog-vivran-financial-truth/` — wired into `.github/workflows/ci.yml:745-774` **and**
`scripts/ci-local.sh:82`, so it fails on `git push` ([[project_friction_budget_baseline_ratchet]]).
- `lib.ts:112` — `AMOUNT_OPERANDS = /^(fixedAmount|amountRaised|amountRaisedInr|rosterSize|expectedTotal|deliveredTotal)$/`
- `lib.ts:181-195` — rule (3) fires on any **identifier or string literal** matching it, in any file
  flagged `renderPath: true`. ⛔ It is ⛔ not a multiplication check.
- `check.ts:46` says it in terms: *"`renderPath: true` ⇒ rule (3) applies (**⛔ no amount operand may
  even be NAMED**)"*, and `check.ts:53` flags **`packages/contracts/src/public-pages/sahyog-vivran.ts`**
  — ⭐ **the exact file v2.0's AC3b ordered the field onto.** ⇒ ⛔ **v2.0's AC3b was red on write.**
- ⚠ Also `renderPath: true`: `apps/public/src/lib/sahyog-vivran.server.ts`, `…/sahyog-vivran-render.ts`,
  and the whole `apps/public/src/pages/sahyog-vivran` dir — ⛔ i.e. the layer AC3 builds.
- ⚠⛔ **AND A SECOND, INDEPENDENT TRIP:** `check.ts:181-187` is a **scope safeguard** — a file that
  *looks like* this read path and is ⛔ not in `SCAN_FILES` **fails the run**. ⇒ ⭐ every new file
  this story adds under `apps/public/src/lib` or `…/pages/sahyog-vivran` must be **enrolled**.

⭐⭐ **THE GATE'S OWN HEADER ROUTES THE REMEDY TO THIS STORY BY NAME** (`check.ts:12-22`) — an in-code
routing note no `_bmad-output` diff would ever show ([[feedback_story_validate_footguns]] item 9):
> *"⚠ **11b.3b** still owes its own [scope] — the named-identity render layer + the amount-raised
> render — ⛔ and it **MUST add them to `SCAN_FILES` in its own commit**. … ⚠⛔ AND **11b.3b IS THE
> SHARP ONE**: it lifts the `@twt/ui` fence and RENDERS the amount, so it must flip that file's
> `renderPath` flag to `false` — or, **better, replace rule (3)** with a check that the amount comes
> from the SHIPPED presenter rather than a local multiplication. ⛔ **Deleting the rule outright would
> discard D1(c)'s refusal**, which survives 11b.3b unchanged."*
⇒ ⭐ **NARROW, ⛔ never delete, ⛔ never append-to-green** — the remedy is written inside the fence
([[feedback_gate_scope_semantic_coverage]]). ⇒ **AC11.**

⛔⛔ **(2) THE DOMAIN READ CARRIES AN ANTI-WIDENING FENCE — AND v2.0's CITE POINTED *INSIDE* IT.**
`sahyog-vivran-read.ts:496-498`, three lines above the cited `:509`:
> *"⭐ **THE TARGET DIES ON THIS LINE.** Both totals are whole INR … and ⛔ only the opaque enum is
> returned. **⛔ Do not widen `SahyogVivranEntry` to carry either of them, under any name.**"*
⚠⛔ **AND `:509` IS ⛔ NOT A BINDING.** It is a field of the object literal handed to
`classifyCycleOutcome`, inside `status === 'live' || assignedCount === 0 ? null : …` (`:504-507`)
⇒ ⭐ **"hoisting `:509`" yields `null` on every LIVE drive** — the ordinary case for a public drive
page with a contributor list on it. ⛔ There is nothing there to lift.

⭐⭐ **(3) THE SHAPE IS RULED AND SHIPPED THREE TIMES. ⭐ MIRROR IT; ⛔ do ⛔ not invent a fourth.**
`public-read.ts` (the INDEX, 11b.14), `member-drive-detail.ts`, `member-drive-list.ts` all do the same
four things, and v2.0's AC3b named ⛔ none of them:
- a **named `const` above the ternary**, computed unconditionally — `public-read.ts:1135`
- **`Math.max(0, …)`**, because `pools.fixed_amount` has ⛔ **no DB positivity CHECK** (migration 0115)
  and a negative fails the contract's `.nonnegative()` ⇒ *"a **500** for the whole Pariwar index"*
  (`public-read.ts:1129-1134`); `member-drive-list.ts:343` also **warn-logs** the clamp
- the **same binding used twice** — into `classifyCycleOutcome` and onto the wire (`:1222`, `:1224`)
- the wire field named **`amountRaisedInr`** — ⭐ **RULED at `-190` cl.6**, with `-189` **cl.5**
  recording the rupee boundary as *"NEWLY CROSSED"* (`public-read.ts:1192-1194`).
  ⚠⛔ v2.0 cited `-190` cl.1/cl.2/cl.7(b)(c) and `-189` cl.3 — ⛔ **cl.6 and cl.5, the two that name
  the field and authorise the amount, were the halves it dropped**
  ([[feedback_story_validate_footguns]] item 7).
⚠ The index also hardened its guard to `assignedCount === 0 || r.fixedAmount <= 0`; ⛔ the drive-page
read at `:505` never took that. ⛔ Do ⛔ not silently fix it — ⭐ route it (AC8).

⚠⛔⛔ **(4) AND THREE SHIPPED ARTEFACTS STILL PRESCRIBE THE MECHANISM v2.0 ABANDONED.** Switching from
the `@twt/ui` presenter to a server-side figure is ⭐ **a defensible ruling** — ⛔ but it is a
**SUPERSESSION TO NAME**, ⛔ not one to make silently ([[feedback_supersede_never_reinterpret]]):
- `packages/contracts/src/public-pages/sahyog-vivran.ts:374-377` — *"whose **AC3b** consumes
  `derivePoolProgressCardViewModel(...).amountRaisedInr` **UNCHANGED** and lifts the `@twt/ui` fence
  THERE"*
- `deferred-work.md`, **§ the amount-raised render** — *"the amount MOVES to the story that adds the
  dependency"*
- `scripts/sahyog-vivran-financial-truth/check.ts:19-22` — *"**better**, replace rule (3) with a check
  that the amount comes from the **SHIPPED presenter**"*
⇒ ⭐ **AC11 amends all three BY NAME.** ⚠ And note the gate's preferred remedy assumes the presenter
⇒ ⭐ if AC3b keeps the server-side figure, the narrowing must say **why the presenter was ⛔ not used**
(Trap 2c) rather than leaving the gate's own text as the last word.

### Trap 2c — ⭐ WHY ⛔ NOT THE PRESENTER, STATED ONCE

⭐ `@twt/ui`'s `pool-progress` presenter **is** the canonical producer of `amountRaisedInr`
(9.12 D3, [[project_amount_raised_canonical_producer]]) and `-176` **D1(b)** ruled it **CONSUMED**.
⛔ **But it takes `rosterSize` and `fixedAmount` as inputs** — the two factors `-204` **cl.3**/**cl.8**
reserve — so consuming it *on this surface* means putting both on the public wire, which is exactly
what Trap 2 forbids. ⇒ ⭐ **the server-side figure is the ⛔ only shape that satisfies both `-176` D1(b)
and `-204` cl.8**, and it forks ⛔ no definition: the arithmetic is byte-identical and already shipped
at three sites. ⚠ **D1(c) survives unchanged** — ⛔ no second `× fixedAmount` in `apps/public`.

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
⚠⛔ **v1's ground was FALSE: `-179` cl.2 PANEL-RATIFIED D10** and `deferred-work.md`'s
**D10-ratification item** now reads *"✅ **CLOSED** (first half) · ⏳ **CLOSING by `8-16`** (second
half)"*. ⛔ Do ⛔ not restore the old argument. ⚠⛔ *(v2.1: v2.0 addressed this as `:1060`; ⛔ rotted —
cite the item, ⛔ not the line.)*

### Trap 4 — ⛔ RTBF REMOVES THE CONTRIBUTOR ENTIRELY — AND THE SUBSTRATE DOES ⛔ NOT DO IT FOR YOU

`-169`: RTBF removes the contributor — ⛔ no anonymized row, ⛔ no marker, ⛔ no placeholder key — and
the omitted contributor **still counts** toward every aggregate. `-170`: the guarantee lives on the
**decrypted plaintext**, ⛔ not the lifecycle-state read, and ⛔⛔ a per-row state re-check is
**FORBIDDEN** as a TOCTOU mitigation. `-172`: the guarantee ends **AT THE WIRE**.

⛔⛔ **AND HERE IS THE MECHANISM v1 NEVER NAMED.** `anonymizeMember` overwrites `name_ciphertext`
**in place** with an *encrypted* `[anonymized]` sentinel and **RETAINS the row**
(`packages/domain/src/member/anonymize.ts:70,107`) ⇒ ⭐ **the decrypt SUCCEEDS.**
⚠⛔ `splitFirstNameLastInitial('[anonymized]')` returns a **NON-EMPTY `firstName`**, so an empty-name
guard ⛔ does ⛔ not catch it. And `member/read.ts:183-187`: the lifecycle map is **PERMISSIVE** and
*"⛔ NOT a sufficient erasure guarantee on its own"* — ⭐ `:186` names the backstop explicitly.
⇒ ⭐ **compare the DECRYPTED PLAINTEXT to `memberDomain.ANONYMIZED_SENTINEL` and omit the row.**
⛔ Without it this surface renders **`[anonymized]`** where a person's name belongs.

⚠⛔⛔ **v2.0's CITES FOR THIS PATTERN ARE ⛔ THE WRONG FUNCTION — CORRECTED AT v2.1.** It sent the dev
to `member-pool/handlers.ts:762-773` and `:771`; at `be0037cc` that range is the **live-only
`confirmedPercentage`/`driveTargetInr` pairing guard** and `:771` is `status: row.status` — ⛔ nothing
to do with erasure ([[feedback_story_validate_footguns]] item 21).
⭐ **THE REAL SITES ARE THREE**, and the pattern is `storedName === memberDomain.ANONYMIZED_SENTINEL`
on the **decrypted plaintext**:
- `member-pool/handlers.ts:621` (with its rationale at `:610`)
- `member-pool/handlers.ts:1047`
- `member-pool/handlers.ts:1236` — ⭐ **read `:1229` first**; it states this trap in the substrate's own
  words: *"(`ANONYMIZED_SENTINEL`), so the decrypt **SUCCEEDS** and the sentinel would otherwise render"*.
⭐ The constant is exported from `@twt/domain` (`member/anonymize.ts:70` = `'[anonymized]'`) —
⛔ **never re-type the literal**; `pool-contributors-rtbf.spec.ts:46-49` records why.

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
**`''`** for a single-token name (`public-name.ts:98`, `-145` cl.3). ⛔ Do ⛔ **not** "fix" it by falling
through to `firstName`: `:86` records that exact bug — for a mononym it returns **the entire stored
legal name**, byte-identical to `full_name`.
⚠ **Mononyms are common in India; ⛔ this is not a corner case.** ⇒ **AC3 rules it for both subjects.**

⚠⛔⛔ **BUT v2.0's *"every caller treats `''` as omit this ROW"* IS ⛔ FALSE AT THE VERY CALL SITE IT
CITES — CORRECTED AT v2.1.** `handlers.ts:528-530`, ⛔ two lines below the `resolvePublicMemberName`
call this story is told to mirror:
> *"An unresolvable name omits the **NAME**, ⛔ never the row — same rule as the decrypt failure above,
> and the same inverse of the directory. ⚠ **`.trim() || null`, ⛔ not `=== ''`** (Review finding,
> 2026-09-08) — a whitespace-only [name] …"*
⇒ ⭐ **two corrections the dev must carry, ⛔ neither of which v2.0 had:**
1. ⭐ **The omission UNIT differs by subject, and it is ⛔ not a style choice.** For the **deceased
   member** the name is a page **header** with ⛔ no row — the sibling's rule applies as written
   (**omit the NAME, keep the page**). For a **contributor** the row exists only to carry that name,
   so an unrenderable name means **omit the ROW** — which is also what `-169` already requires for an
   RTBF'd contributor, and what keeps the *"N confirmed beside FEWER than N rows"* invariant true.
   ⛔ Do ⛔ not apply one rule to both subjects.
2. ⚠⛔ **Test `.trim() || null`, ⛔ NEVER `=== ''`.** That exact narrowing was already found and fixed
   on the sibling surface on 2026-09-08; ⛔ writing `=== ''` here re-introduces a **closed** defect —
   a whitespace-only stored name slips the guard and renders a blank where a person's name belongs.

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
✅ **`D-percentage` IS RULED AND RECORDED** — `#decision-2026-09-15-218`, committed **before** any
code. ⭐ **Exactly ONE `governance:` commit**, carrying ⛔ **no code**
([[feedback_governance_commits_precede_implementation]]).
⚠ *(v2.1: this line previously read `⛔ One governance: commit` — under this file's declared glyph
register that negates the instruction it exists to give. ⛔ Kept as the record of the class, corrected
here and at Task 0.)*

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
**And** ⚠ the stale epic ACs are **already annotated** ⇒ ⭐ **DISCHARGED; ⛔ do ⛔ not re-do it.**
⚠⛔ **v2.1 CORRECTION — v2.0 COUNTED THREE AND POINTED AT THE WRONG ITEM.** Navigate by the quoted
text, ⛔ not the line: **TWO** of the three are name-form annotations (`epics.md:3156` and `:3257`,
both annotating the `first-name + last-initial` form as **SUPERSEDED** by `-174`/`-175`/`-180` —
⭐ both re-read at `be0037cc` and both sound). ⛔ The third (`:5045`) is a **different item**: the
epic-AC-vs-UX-spec **grain mismatch**, annotated to **Story 11b.1 `D5`**, ⛔ not to item (iii).
⛔ And `epics.md:5156` is **AI-11a-2** (the member-browser-session disposition), ⛔ not item (iii).
⇒ ⭐ item (iii)'s discharge stands; ⛔ its **address** does not — cite it by its heading text.

### AC3 — `apps/public` adds `@twt/ui`; the Astro layer resolves the FULL NAME
⭐ C-1 ruled this *"an **ORDINARY DEPENDENCY ADDITION**"* — `#decision-2026-08-23-154` **cl.6**,
⭐ *"⛔ Verified: there was no declination"* (cl.1's ground). ⚠ `@twt/ui`'s own deps stay exactly
`@twt/contracts`. ⚠⛔ v2.0 addressed this as `.decision-log.md:6388-6400` / `:6394`; ⛔ both had rotted
by `be0037cc` — cite by id + clause (§ *How to cite in this file*).

**And** ⭐ **the form resolves through `resolvePublicMemberName(mode, storedName)`** under the Pariwar's
**stored** mode — ⛔ never a literal (Trap 5), ⛔ never `resolvePoolIdentity`.

⛔⛔ **AND HERE IS THE BLOCKING CORRECTION v2.1 FOUND: THE SHARED PRESENTER ⛔ CANNOT CARRY A FULL
NAME, SO v2.0's AC3 ORDERED TWO THINGS THAT ⛔ CANNOT BOTH BE DONE.**
`packages/ui/src/contribution-list/view-model.ts:44-46`:
```
ContributionRowDisplayName =
  | { kind: 'name'; firstName: string; lastInitial: string }
  | { kind: 'unknown' }
```
⇒ ⛔ **there is ⛔ no arm that holds a resolved single-string name**, and the type says why (`:54-57`):
*"Name PARTS, and ONLY name parts. The presenter **NEVER** joins firstName + lastInitial: the
contributor name **FORM is UNRULED** (D7-nameform(a)) … **joining it here would RULE it.**"*
⚠⛔ `resolvePublicMemberName` returns **one string**. Feeding it to this presenter requires running
`splitFirstNameLastInitial` first — ⛔ i.e. **producing the SHIELDED form**, on the one surface
`-173`/`-174` ruled **FULL NAME**, with ⛔ every test still green. ⭐ That is the precise failure
`handlers.ts:516-521` calls *"the easiest thing to get wrong on a POOL surface."*

⇒ ⭐⭐ **THE RULING FOR THIS STORY, STATED ONCE:**
1. ⭐ **The Astro layer renders the name as ONE resolved string** — the output of
   `resolvePublicMemberName`. ⛔ It does ⛔ **not** decompose it, and ⛔ **never** calls
   `splitFirstNameLastInitial`.
2. ⭐ **`@twt/ui`'s `contribution-list` presenter is consumed for its ⛔ NON-name outputs only** —
   `poolLetterCode` and the `rowA11y` **ref** — ⛔ or ⛔ not consumed at all if that leaves it vacuous.
   ⛔ Do ⛔ **not** widen `ContributionRowDisplayName` with a third arm as a side effect of this story:
   ⚠ its two-arm shape is load-bearing for **11b.2b's shipped mobile row**
   ([[project_contribution_row_render_layer_substrate]]) and a third kind would break that consumer's
   exhaustiveness arm by design (`presenter.ts:81-98`).
3. ⚠⛔ **The presenter's stated reason is ⛔ now DISCHARGED, and that is a record this story owes.**
   `view-model.ts:55` still says the form is *"UNRULED … AC6 item (iii) routes it to the Panel."*
   ⭐ The Panel **ruled it** (`-174`, unconditional per `-175`). ⇒ **AC11 amends that doc-block BY
   NAME** — ⛔ an amendment, ⛔ never a deletion, and ⛔ **not** a licence to change the type.
⚠ The `unknown` arm **THROWS** (`presenter.ts:76-80`) ⇒ ⭐ if the presenter is consumed at all, the
per-row `try/catch` below is ⛔ not optional.

**And** ⭐ **the mononym / unresolvable rule is ruled HERE, ⛔ PER SUBJECT** (Trap 5):
· **contributor** — an unrenderable name ⇒ **omit the ROW** (it exists only to carry the name; `-169`
  already requires this for RTBF and the *"N confirmed"* invariant absorbs it).
· **deceased member** — an unrenderable name ⇒ **omit the NAME, ⛔ never the page** (the sibling's
  shipped rule, `handlers.ts:528-529`).
· ⚠⛔ **the test is `.trim() || null`, ⛔ NEVER `=== ''`** (Review finding 2026-09-08, already fixed on
  the sibling); and ⛔ ⛔ no fall-through to `firstName` (`public-name.ts:86`).

**And** ⚠ a **per-row `try/catch`** (the `PoolContributorList.tsx:108-124` pattern) ⇒ ⭐ **a single bad
row must ⛔ not take down the surface.** ⚠ `mapWithConcurrency` propagates rejections and stops every
worker (`bounded-decrypt.ts:38-41`), so the catch belongs **INSIDE `fn`** — the helper's own doc-block
says so in terms.

### AC3b — The rupee figure is `amountRaisedInr`, server-derived, clamped — and ⛔ NEITHER FACTOR crosses
⭐ Per **Trap 2 / 2b / 2c**. ⚠⛔ **v2.0's *"hoist `:509`'s `deliveredTotal` onto the DTO"* is
SUPERSEDED** — it was red against a live CI gate, `null` on every live drive, and pointed inside an
anti-widening fence. ⛔ Do ⛔ not restore it.

⭐ **The shape, mirroring `public-read.ts:1135`/`:1222`/`:1224` exactly:**
1. ⭐ In `readPublicSahyogVivran`, **above** the `fundingOutcome` ternary, bind
   `const deliveredTotal = Math.max(0, confirmedContributionCount * row.fixedAmount);`
   ⇒ ⭐ computed **unconditionally** (⛔ not inside the `status === 'live' || assignedCount === 0` arm)
   and **clamped** — `pools.fixed_amount` carries ⛔ no DB positivity CHECK, and an unclamped negative
   fails the contract's `.nonnegative()` ⇒ **a 500 for the whole page** (`public-read.ts:1129-1134`).
   ⚠ Warn-log the clamp, as `member-drive-list.ts:343` does.
2. ⭐ **Use the SAME binding twice** — into `classifyCycleOutcome`'s `deliveredTotal` and onto the
   entry. ⛔ A second `× fixedAmount` anywhere is the defect (`-176` **D1(c)**, **REFUSED**).
3. ⭐ **The wire field is `amountRaisedInr`** — ruled at **`-190` cl.6**, with **`-189` cl.5** recording
   the rupee boundary as *"NEWLY CROSSED"*. ⛔ Not `deliveredTotal`, ⛔ not a new name.
4. ⭐ **Amend `sahyog-vivran-read.ts:496-498`'s anti-widening fence BY NAME** — it forbids carrying
   *"either of them, under any name"*, and this story narrows it to **`expectedTotal` only**
   ([[feedback_supersede_never_reinterpret]]). ⛔ Do ⛔ not delete it: ⭐ the target quarantine it
   protects **survives unchanged**.

⛔⛔ **⛔ NO `rosterSize`. ⛔ NO `fixedAmount`. ⛔ NO percentage, target, expected total, shortfall or
comparison figure — in any field, under any name.** ⚠ `expectedTotal` stays **inside** the domain read.

**And** ⚠⛔⛔ **THE FIELD NAME ALONE TRIPS CI — SEE AC11.** `amountRaisedInr` is in the gate's
`AMOUNT_OPERANDS` set, and `packages/contracts/src/public-pages/sahyog-vivran.ts` is `renderPath: true`
⇒ ⭐ **AC11's narrowing is a PRECONDITION of this AC, ⛔ not a follow-up.**
**And** ⛔⛔ **⛔ do ⛔ NOT write the *"no second multiplication"* test v2.0 ordered — ⭐ IT ALREADY
EXISTS.** `scripts/sahyog-vivran-financial-truth` rule (3) **is** that test, shipped and wired into
both CI arms. ⭐ Extending its **scope** (AC11) is the work; ⛔ re-implementing it is the wheel.
**And** ✅ **`D-percentage` IS RULED: ⛔ NO percentage on a `closed`/`settled` drive**
(`-218` cl.1) — ⭐ and `sahyog-vivran.ts:60-61` + `public-pages-sahyog-vivran.test.ts:146-152` are
**already** its enforcement ⇒ ⛔ **⛔ no work is owed by that clause.** ⚠⛔ **`-218` cl.4 binds THIS AC:**
`amountRaisedInr` may ⛔ **never** be paired with, divided by or captioned against a target, expected
total or roster size — ⛔ that reconstructs the refused percentage by hand.
**And** ⭐ Task 2 **amends `sahyog-vivran.ts:56-58`** — the comment inviting the two fields is ⛔ now
wrong and contradicts `:60-61`.
**And** ⚠ the index's `fundingOutcome` guard was hardened to `assignedCount === 0 || fixedAmount <= 0`
(Review finding 2026-09-08) while the **drive-page** read at `:505` still guards only on `status` and
`assignedCount`. ⛔ Do ⛔ not fix it inside this story — ⭐ **route it** (AC8).

### AC4 — Paginated, deterministically ordered, ⛔ never a leaderboard
⭐ Page size **50**, deep-page horizon **200** (`pagination.ts:39`, `:65`, `parsePageParams` `:121`).
⭐ Ordering is the **earliest LIVE confirmation's `event_version`** — ⛔ **never `member_id`**
([[project_confirmed_contributor_read_is_ordered]]).
⭐ Bounded decrypt: `mapWithConcurrency` + `DIRECTORY_DECRYPT_CONCURRENCY = 8` —
**`apps/api/src/modules/kyc/bounded-decrypt.ts`** `:46` and `:28` (⚠ v2.0 gave ⛔ no path for this file);
live pattern at `public-pages/handlers.ts:62`, `:201`.
⚠⛔ ⛔ Do ⛔ **not** copy the **halved** bound at **`member-pool/handlers.ts:508`**
(`Math.max(1, Math.floor(DIRECTORY_DECRYPT_CONCURRENCY / 2))`), which exists for that surface's
**two-decrypt-per-row** path — rationale `:489-496` and `:556`. ⭐ A contributor row is **one** decrypt
⇒ the full constant is right here.
⚠⛔ *(v2.1: v2.0 cited `:406-408` / `:389-396` for this; at `be0037cc` that range is an audit-volume
doc-block — ⛔ the wrong function, ⛔ not merely a shifted line.)*
⚠ **One KMS round-trip per row is irreducible** — *"envelope encryption gives every stored name its
own DEK, so there is ⛔ no shared secret to decrypt once and reuse"* (`handlers.ts:188-189`).
⚠⛔ **⛔ DO ⛔ NOT CALL IT "THE MOST EXPENSIVE PAGE IN THE EPIC"** — `-205` cl.5: the **index** already
steps to **~150** decrypts. ⭐ 50 + 1 is this page's post-merge figure.
**And** ⭐ **the control set is ONE constant now** — `sahyog-vivran-controls.ts:56-60`, which names this
story as owner: *"11b.3b adds two entries HERE, in its own commit."* ⛔ The YAML states ⛔ no number.
⚠⛔ **THREE SHIPPED ASSERTIONS INVERT, BY DESIGN** — `login-wall.spec.ts:425` (`toHaveLength(5)`),
`:429-435` (the id identity array), `:445-448` (the `kind === 'control'` filter). ⭐ **The set becomes
SEVEN** (11b.10 added control 7) — ⛔ **not** the *"SIX"* that file's `:247` predicts, which is
arithmetically stale. ⭐ Amend each **BY NAME** ([[feedback_supersede_never_reinterpret]]).
**And** ⛔ ⛔ no rank, ⛔ no total-per-contributor, ⛔ no sort by amount.

### AC5 — RTBF, the erasure backstop, and the row key
⭐ Per **Trap 4**: the omitted contributor is **absent entirely** and **still counts**.
**And** ⭐⭐ **the `ANONYMIZED_SENTINEL` check on the DECRYPTED PLAINTEXT** — snapshot-independent,
⛔ never a marker. ⭐ The shipped pattern is `storedName === memberDomain.ANONYMIZED_SENTINEL` at
**`member-pool/handlers.ts:621`, `:1047`, `:1236`** (⭐ read `:1229`'s rationale first).
⛔ **Import the constant from `@twt/domain`; ⛔ never re-type the `'[anonymized]'` literal.**
⚠⛔ *(v2.1: v2.0 cited `:771` / `:762-773` — ⛔ the wrong function at `be0037cc`.)*
**And** ⛔ ⛔ **no per-row lifecycle re-check** — `-170` forbids it as a TOCTOU mitigation.
**And** ⭐ **`D10-rowkey`(a) RULED: there is ⛔ NO ROW KEY.** ⛔ Not `index`, ⛔ not `member_id`, ⛔ not a
token. Astro SSR emits static HTML with ⛔ no reconciler.
**And** ⛔ Story 8.3's `keyExtractor` deferral is **RE-AFFIRMED OPEN**, trigger re-pointed to *"the
first VIRTUALIZED render of a **multi-pool contributor** list"*, citing `-177`. ⚠ 11b.15 shipped a
stable-key FlashList (`MemberDriveList.tsx:347`) — ⭐ per-**drive**, ⛔ not per-contributor ⇒ the
trigger has ⛔ **not** fired. ⭐ **Record it** so a reviewer does ⛔ not read `D10-rowkey`(a) as *"this
repo never keys FlashLists."* ⚠ `MemberDriveList.tsx` moved since the pin — ⭐ re-confirm `:347` before
quoting it.

### AC6 — The buildable public column inventory is NAMED [`deferred-work.md` **11b.1's** item (f)]
⭐ **RE-VERIFIED at `be0037cc`** — the UX spec is **unmoved since the pin** and all three pointers hold:
`:1298` is the heading `### Public Column Inventory — Sahyog List` · `:1311` opens the **canonical**
annotation block (*"⭐ **This is the CANONICAL record of the finding**; the four other anchors point
here"*) · `:1158` is the *"Searchable transparency table"* layout primitive, annotated at `:1160`.
⭐ AC6's warn-off stands: the section runs from `:1287`, ⛔ but the **block** is `:1311`+.
⚠⛔ **ONE CORRECTION — THE BLOCK IS `:1311-1335`, ⛔ NOT `:1311-1330`.** `:1333-1335` is its
*"WHAT IS ⛔ NOT DECIDED HERE"* half, and ⭐ **that is the half this story changes.**
⚠ Cite it **by section title**, ⛔ not by line.

⛔⛔ **AND THE BLOCK CARRIES ITS OWN INSTRUCTION, WHICH v2.0 DID ⛔ NOT READ: *"⛔ THE COUNT IS ⛔ NOT
THE REQUIREMENT, THE LIST IS."*** `:1330` names **FOUR other anchors already annotated** — `:1158`
(the layout primitive) · `:1252` (the Real Data Test) · `:1788`/`:1798` (desktop / mobile row anatomy)
· `:2161`+`:2165` (the performance contract) — and `:1331` warns of **SIX FURTHER REFERRING SITES
⛔ NOT in scope**, ⭐ naming `:2581` *"in a breakpoint table no one annotating §8/§10/§11 would open."*
⇒ ⭐ **the BUILDABLE half is written at the canonical block (`:1311`+) and cross-referenced from the
four restatement anchors** — ⛔ do ⛔ not annotate only `:1158`, and ⛔ do ⛔ not treat the annotated set
as exhaustive.

⚠⛔⛔ **AND `:1334` IS STALE — ⭐ THIS STORY IS WHAT MAKES IT SO.** It still reads *"⛔ **The contributor
NAME FORM is UNRULED** … ⛔ **ROUTED, ⛔ nothing ratified, ⛔ nothing applied**"* (`-168` cl.4).
⛔ **FALSE at HEAD** — `-174` ruled it (**Panel**), `-175` made it unconditional. ⇒ **AC11(e).**
⭐ This is the **third** instance of one class — a shipped artefact whose stated reason is *"this is
unruled"*, ⛔ now discharged (with `view-model.ts:54-57` and `sahyog-vivran.ts:374-377`).

⚠⛔ **AND THE UX SPEC NAMES THE WRONG STORY.** `:1335` says *"Naming the buildable inventory is
**11b.3's**, at the point it has a host."* ⛔ `11b-3` is **`done`** and ⛔ did ⛔ not do it — the work came
here in the **D6(b)** three-way split. ⇒ ⭐ **AC11(e) adds the forward pointer**, ⛔ an amendment, ⛔ never
a rewrite ([[feedback_supersede_never_reinterpret]]) — the same debt `-182` owes at Task 0.

⚠ **Two `### (f)` headings exist** — 11b.3a's *post-masking authenticated-member presentation* and
**11b.1's** *UX-spec Sahyog List column inventory (`D5(a)`)*. ⭐ **This AC means 11b.1's, and ⛔ only
that one** (the same disambiguation AC8 makes for `(e)`).
⚠⛔ ⛔ Do ⛔ not follow the UX spec's own *"item **(f)** (`:296-313`)"* pointer at `:1313` — ⛔ **rotted**;
`:296-313` is 11b.3a's nominee-bank text.
⚠ The **not-buildable** half is **already named** there with all ten dispositions ⇒ ⭐ **only the
BUILDABLE half is owed.**
**And** ⛔ `Donor Name` is ⛔ **no longer "CONDITIONAL on D2"** — D2 is **RULED**; it is buildable at the
full name. ⚠ `microcopy.yaml:42` (`donor`) and `:48` (`Late Teacher`) stay `member_only: true` ⇒ the
**labels** remain fenced.
**And** ⭐ the ground is `-132` **cl.1 (R1/R7)**, ⛔ not cl.3 (the RBAC eligibility-class axis) —
⚠ **with `-133` cl.1 as co-ground**, which `:1327` names and v2.0 omitted.

### AC7 — Accessibility + i18n
⭐ Family 13 in its **WEB** form; a **real `t()`** assertion across **both** locales.
⚠ All ten `CONTRIBUTION_LIST_I18N_REFS` carry `namespace: 'contribution'`
(`packages/ui/src/contribution-list/i18n-keys.ts:32-43`), shipping at
`locales/{en,hi}/contribution.json:30-39` ⇒ ⭐ **REUSE ONLY; ⛔ nothing is minted there.**
⚠⛔ **THE PREFIX IS `contributor_list.*`, ⛔ NOT `contribution_list.*`** — v2.0 wrote the latter at
`be0037cc` and it matches ⛔ **zero** keys in the repo (the *module* is `contribution-list`; the *keys*
are `contributor_list.`). ⭐ The rule is: ⛔ do ⛔ not copy those ten keys into a second home.
⚠⛔ **⛔ Do ⛔ not say "no third namespace" — `sahyog-shared` EXISTS** and `-214` routes ratified copy
there via `11b-19`.

⚠⛔⛔ **AND `sahyog-shared` IS FENCED REPO-WIDE — ⭐ NAMED HERE BECAUSE v2.0 NAMED IT NOWHERE.**
`packages/i18n/tests/sahyog-shared-dark-copy.test.ts` (**+497 lines since the pin**) walks the whole
repo — ⭐ it **asserts** `apps/public/src/pages/sahyog.astro` is reachable (`:607`) — and holds two
allow-lists, ⭐ **both non-appendable in terms** (*"⛔ Do ⛔ not append to it to make a build green"*):
- `index_line.*` → exactly `['/apps/public/src/pages/sahyog.astro']` (`:227-249`)
- `message_block.*` → two `apps/mobile` files only (`:586-622`); ⭐ **the PUBLIC half is `11b-20`**,
  *"HOMED, ⛔ NOT built — ⛔ its site is ⛔ not pre-authorised here."*
⇒ ⛔⛔ **this story's `[driveToken].astro` must resolve ⛔ NEITHER family.** ⚠ Its regex deliberately
catches a dynamic `` `message_block.headline.${variant}` `` shape, so a template literal ⛔ does ⛔ not
slip past. ⭐ `t()` **THROWS** on an unsupplied token ⇒ an unguarded resolution is a **500 on a whole
page**, ⛔ not a blank line.

⚠⛔⛔ **THE STAGE WORDS LIVE IN THAT SAME NAMESPACE — AND v2.0 CITED A SUPERSEDED CLAUSE FOR ONE OF
THEM. ⭐ SETTLED BY READING; ⛔ ⛔ NOTHING IS OWED AND ⛔ NOTHING IS MINTED.**
⭐ `-191` **cl.3** (2026-09-04) did rule `settled` → *"Completed"*. ⛔ **`-192` cl.1 AMENDED it the same
day** — *"the three public words are **Live / Closed / Verified**, ⛔ amending `-191` cl.3's
'Completed', **which implied a payment event that ⛔ does not exist**"* — and `-192` **Consequence 3**
records the amendment by name (*"`-191` cl.3's table is amended — 'Completed' → 'Verified'"*).
⭐ **`-193` then TRUSTEE-RATIFIED *"Verified"*** and listed it for both public and member.
⇒ ⭐ **the shipped copy is CORRECT and RATIFIED**, and `-191` cl.3 is a **superseded clause**, ⛔ not a
live one ([[feedback_supersede_never_reinterpret]]).
⭐ **CONSUME, ⛔ DO ⛔ NOT MINT:** `stage.live` = **"Live"** / **"जारी"** · `stage.closed` = **"Closed"** /
**"बंद"** · `stage.verified` = **"Verified"** / **"सत्यापित"**. ⛔ There is ⛔ no `stage.settled` key, and
**"Completed" is in ⛔ no locale file** — ⭐ that absence is the amendment **working**, ⛔ not a gap.
⭐ The wire token agrees: `public-read.ts:169-172` maps `settled: 'verified'`.
⚠⛔ **⛔ CITE `-192` cl.1 + `-193`, ⛔ NEVER `-191` cl.3 ALONE** — quoting the superseded half is how
*"Completed"* would get re-minted as a second source for a ratified word.

⭐⭐ **AND THE TRACE PAID FOR ITSELF — THE `verified` ARM IS UNREACHABLE IN PRODUCTION TODAY.**
`-192`'s Occasion records that the `pool.settled` events in the database are **FIXTURES, seeded
directly** ⇒ ***"⛔ no production pool can reach `settled` today"***, and `-193` says the *"Verified"*
section is ***"PERMANENTLY EMPTY until settlement ships."***
⇒ ⭐ **this story's `verified` render arm is DEAD CODE ON DAY ONE** — ⭐ build it, ⛔ but ⛔ do ⛔ not
size, demo or test it as a reachable state, and ⛔ do ⛔ not "discover" its emptiness as a defect.
⚠ ⭐ It is the **same shape as Trap 1's deceased name**: correct, built, and inert by design.
⚠⛔ `-192` **cl.3** also requires the stage **explainer** to describe *Verified* *"even while ⛔ no drive
can be in it"* — ⭐ that is 11b.12's shipped affordance; ⛔ this story ⛔ neither re-mints ⛔ nor omits it.
**And** ⛔⛔ **MINTED COPY MAY ⛔ NEVER CLAIM THE LIST IS COMPLETE** — two shipped doc-blocks say so
(`sahyog-vivran.ts:384-386` — ⚠ v2.0 said `:380-382`, which shifted +5 when 8.17 landed — and
`sahyog-vivran-read.ts:336`): this page reads *"N confirmed"* beside **FEWER than N named rows BY
DESIGN**. ⭐ Three independent omissions cause it: RTBF (`-169`), the mononym (`-145` cl.3), and the
erasure sentinel (AC5).
**And** ⚠ the public stage vocabulary is **RULED** — `-191` cl.3: `live`→**Live**, `closed`→**Closed**.
⛔ *"Active"*, *"Collecting"*, *"Archive"* are **retired**. ⭐ The third word is **"Verified"**
(`-192` cl.1, Trustee-ratified at `-193`), ⛔ **not** `-191` cl.3's superseded *"Completed"*.
⭐ Consume `stage.live` / `stage.closed` / `stage.verified` from `sahyog-shared`; ⛔ **mint nothing.**

### AC8 — What this story does ⛔ NOT build is ROUTED
⛔ ⛔ No member surface · ⛔ no masking change · ⛔ no `@twt/ui` fence lift beyond `apps/public` ·
⛔ no index change.
**And** ⛔⛔ **⛔ TOUCH `deferred-work.md`'s *"D10's Trustee Panel ratification"* ITEM ⛔ NOT AT ALL.**
⚠⛔ **DISAMBIGUATED AT v2.1 — THE FILE HOLDS ⛔ TWO `### (e)` HEADINGS**, and a bare *"item (e)"* is
⛔ therefore ⛔ not an address: one is **VPA collection** (now homed at `8-17`), the other is **D10's
Trustee Panel ratification** — ⭐ **this story means the D10 one, and ⛔ only that one.**
⭐ Its binder was **RE-POINTED to `8-16`**, `8-16` merged **FIRST** (row `8-16-…` = `done`), and its
**co-writer rule** says the one merging **second** must *"⛔ neither re-affirm this item open ⛔ nor
re-record its closure."*
⇒ ⭐ **this story is the second. It does neither.** ⛔ v1's *"record the CLOSURE"* branch is **WITHDRAWN**.
⚠⛔ *(v2.1: v2.0 addressed these three facts as `:637-642`, `:1060` and `:1079-1082`; ⛔ all three had
rotted by `be0037cc`. ⭐ Navigate by the item HEADINGS and the quoted sentences — the file's own rule:
*"The **ITEM LETTERS** are the stable address. Cite those, ⛔ not the lines."*)*

**And** ⭐⭐ **TWO `deferred-work.md` ITEMS ARE ROUTED TO THIS STORY BY NAME, AND ⛔ BOTH TRIGGERS HAVE
FIRED** — ⛔ v2.0 carried neither. Each ends ***"→ Story 11b.3b. Trigger: 11b.3 merged."*** and the row
`11b-3-sahyog-vivran-per-claim-story-surface` is **`done`**:
1. ⭐ **Counsel's WRITTEN CLAUSE from `-173` Q3** — *"still owed and still the only thing between the
   deceased-member ruling and a rendered name."* ⇒ ⭐ **carried by Trap 1 + AC1**, which is why the
   deceased half renders nothing. ⛔ The item stays **OPEN**; this story ⛔ does ⛔ not close it.
   ⚠ That same bullet also re-states *"the ruling is a CEILING, ⛔ not a literal"* (`-136` cl.1) and
   *"`-181` put the MEMBER side on the same stored per-Pariwar mode"* — ⭐ both already in Trap 5.
2. ⭐ **The amount-raised render** — *"the amount MOVES to the story that adds the dependency"*, with
   **D1(c) staying REFUSED** and the `render_path_multiplication` rule named as *"what makes the
   refusal **enforceable** rather than aspirational."* ⇒ ⭐ **discharged by AC3b + AC11**, and that
   bullet is one of the three artefacts AC11 amends (Trap 2b(4)).
   ⚠ It also records *"THE INTERIM ASYMMETRY IS ⛔ NOT A DEFECT"* — ⭐ **this story's merge ENDS that
   interim**, so ⛔ that carve-out retires with it.
**And** ⚠⛔ ⛔ **do ⛔ not write *"the member app shields on three"*** or any present-tense form of the
inversion comparison — `-209` cl.3 ruled that class **false for every drive** and forbade paraphrase.
⭐ A **conditional** statement is permitted (`-209` cl.4); a **present-tense** one is not.
**And** ⭐ carry story D's **Trap-10 back-reference** — its `deferred-work.md` item records the
divergence *"ONE-SIDEDLY"*, routes it here by name (***"Trigger:** `11b-3b`'s Task 0 annotation, which
owes the back-reference"*), and notes D's own Task 6 **forbade** D from amending this file. ⛔ v1
carried it nowhere. ✅ **CARRIED AND DISCHARGED AT TASK 0 (2026-09-15):** the back-reference is
written, and `#decision-2026-09-15-218` **answers the open question the divergence was about** ⇒ ⭐ the
two surfaces now differ **BY RULING** (`-189` cl.2(b) for the index, `-218` cl.1 for the page), ⛔ not
by unexplained contradiction. ⚠⛔ *(v2.1: v2.0 addressed it as `:8477-8487`; ⛔ rotted. ⭐ Navigate by the item's
own words — *"The Trap-10 divergence with `11b-3b` is recorded ONE-SIDEDLY"*.)*
**And** ⭐ **ROUTE, ⛔ do ⛔ not fix:** the drive-page read's `fundingOutcome` guard never took the
2026-09-08 non-positive-`fixed_amount` hardening its index twin did (AC3b's last clause). ⭐ Record it
as an observation with its trigger; ⛔ it is ⛔ outside this story's scope
([[feedback_gap_analysis_observational]]).
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
⇒ ⭐ **THE STATEMENT, FOR BOTH DATA CLASSES, IN ONE PLACE — ⭐ WRITTEN HERE, ⛔ not deferred:**

#### ⛔⛔ Data class 1 — the **CONTRIBUTOR** name: ⛔ **NOT COMPLIANT — ⭐ knowingly, and ⭐ THIS STORY IS THE ACT THAT CREATES IT**

⭐ **Public (this story):** the **FULL NAME** — `-174`, unconditional per `-175`.
⛔ **Member (shipped):** `firstName + lastInitial` — `apps/api/src/modules/member-pool/handlers.ts:1240`
calls `splitFirstNameLastInitial(fullName)` for the member contributor list.
⇒ ⛔⛔ **on merge, the PUBLIC sees MORE of a contributor's name than a MEMBER does** — ⛔ the exact
inversion `-189` cl.3 / `-195` cl.1 forbid.

⭐⭐ **IT IS RULED AND CARRIED, ⛔ NOT AN OVERSIGHT.** `-177` **cl.2** ruled `D9-inversion(a)` —
**CARRY** the inversion. ⇒ ⭐ this AC **STATES** the non-compliance with its authority, which is what
`-195` cl.1 asks for; it ⛔ does ⛔ not cure it and ⛔ must ⛔ not be read as curing it
([[feedback_closure_language_precision]]).
⚠⛔ **AND ⛔ DO ⛔ NOT ASSUME `-180` CLOSED THIS — ⛔ IT DID ⛔ NOT.** `-180` cl.1's *"ALL FOUR places"* is
scoped to **`resolvePoolIdentity`'s consumers** — ⭐ the **DECEASED** family's name (the My Pool card,
Yogdaan Bahi, the push, consumer ④). ⛔ It ⛔ never reached the **contributor** list, and `:1240` still
splits. ⇒ ⚠ a reader who pattern-matches *"8.16 closed the inversion"* onto this data class is ⛔ wrong
— ⭐ a completeness finding restated in the wrong **unit** ([[feedback_story_validate_footguns]]).
⚠⛔ **⛔ Do ⛔ not "fix" it inside this story.** Raising the member side to the full name is a
**member-surface change** that **AC8** puts out of scope, and it would reverse `-177` cl.2.
⭐ **Trigger for the cure:** any story that takes the member contributor list's name form.

#### ✅ Data class 2 — the **DECEASED MEMBER** name: ✅ **COMPLIANT**, in the present and the post-clause state

⭐ **Today:** public renders ⛔ **nothing** — `NAME_PUBLICATION_AUTHORISED` is false for every member
(Trap 1, re-verified); the member renders the **mode-resolved full name** since 8.16 / `-180` cl.1
(`pool-identity.ts:201`). ⇒ ⭐ member **>** public. ✅
⭐ **After counsel's clause is pinned:** both sides resolve through the **same per-Pariwar mode** —
public via `resolvePublicMemberName`, member via `resolvePoolIdentity` ⇒ **equal**, which satisfies
*"⛔ never LESS"*. ✅
⚠ **And the one divergence keeps the sign correct:** a **mononym** is **SHOWN** on the member side and
**OMITTED** on the public side (`pool-identity.ts:148-151`, `public-name.ts:98`) ⇒ member **≥** public
in every mode. ⛔ That divergence is **UNCHANGED by 8.16** and must ⛔ not be reported as closed.

### AC11 — ⭐ The financial-truth gate is EXTENDED and NARROWED, and three stale artefacts are amended
⛔⛔ **A PRECONDITION OF AC3b, ⛔ not a follow-up** — without it the build is red on the first push.
⭐ **(a) SCOPE — enrol any NEW render-layer file.** ⚠⛔ **ORDERING CORRECTED 2026-09-15: (a) lands with
TASK 2, ⛔ NOT before it** — it speaks about files **Task 2 creates**, so gating Task 2 on it was
circular. ⭐ **Verified at `be0037cc`: the render layer's files are ⛔ ALREADY enrolled** —
`sahyog-vivran.server.ts`, `sahyog-vivran-render.ts` and `pages/sahyog-vivran/[driveToken].astro` are
all in `SCAN_FILES` at `renderPath: true` ⇒ **(a) is a NO-OP unless Task 2 adds a genuinely new file.**
⛔ If it does — anything under `apps/public/src/lib` or `apps/public/src/pages/sahyog-vivran` — that
file joins `SCAN_FILES` **in the same commit**, with an explicit `renderPath` flag and a **stated
reason**; ⚠ `check.ts`'s scope safeguard **fails the run** otherwise. ⇒ ⛔ ⛔ not optional bookkeeping.
⭐ **(b)-(e) are what actually gate Task 2, and they are DONE** — see the Dev Agent Record.
⭐ **(b) NARROW rule (3) — ⛔ never delete it, ⛔ never append-to-green.** The gate's header gives two
remedies; ⭐ take the one that keeps teeth: **re-point rule (3) at the DEFECT** — a local
`confirmedCount × fixedAmount` on the render path — rather than at the mere **naming** of an operand,
so `amountRaisedInr` may cross the wire while **D1(c) stays enforced**. ⛔ Flipping `renderPath:false`
on the DTO is the weaker option: it would leave that file unscanned for every operand at once.
⚠⛔ **Prove the teeth survive**: `lib.test.ts` already plants a known-bad local multiplication ⇒ ⭐ that
fixture must still go **red** after the narrowing, and a **new** fixture must prove `amountRaisedInr`
passes ([[feedback_gate_scope_semantic_coverage]] — ⛔ a green scan proves nothing on its own).
⭐ **(c) AMEND THE THREE ARTEFACTS THAT STILL PRESCRIBE THE PRESENTER MECHANISM, BY NAME** (Trap 2b(4)):
`contracts/src/public-pages/sahyog-vivran.ts:374-377` · the `deferred-work.md` amount-raised item ·
`scripts/sahyog-vivran-financial-truth/check.ts:19-22`. ⭐ Each gets the **reason** (Trap 2c), ⛔ not
just the new instruction — ⛔ amendments, ⛔ never rewrites ([[feedback_supersede_never_reinterpret]]).
⭐ **(d) AMEND `packages/ui/src/contribution-list/view-model.ts:54-57`** — its *"the form is UNRULED …
routes it to the Panel"* is ⛔ now false; `-174` ruled it, `-175` made it unconditional. ⭐ Record the
ruling **and** that the two-arm type is **deliberately kept** for 11b.2b's shipped consumer (AC3).
⭐ **(e) AMEND `ux-design-specification.md:1334`** — its *"the contributor NAME FORM is UNRULED …
⛔ nothing ratified"* is ⛔ now false (`-174`, unconditional per `-175`) — **and add the forward pointer
at `:1335`** re-homing the buildable inventory from `11b-3` (⛔ `done`, ⛔ undone) to this story.

---

## ⚖️ Decisions

- ✅ **D2** — contributor declaration + form: **RULED, Panel, FULL NAME** (`-174`; unconditional `-175`).
- ✅ **D3** — deceased member on this surface: **RULED, Panel, FULL NAME** (`-173`).
- ✅ **`D9-inversion`(a)** — **CARRY** the inversion (`-177` cl.2). ⚠ **RENAMED** from bare `D9` per
  `-168` **cl.9** (*"two different D5s in one sibling set is exactly how a ruling gets applied to the
  wrong question"*): 11b.1 and 11b.2 each have their own `D9(a)`.
- ✅ **`D10-rowkey`(a)** — **NO row key** (`-177` cl.3). ⚠ **RENAMED** from bare `D10`: 11b.1's `D10`
  is the `/sahyog` full-name ruling, **Panel-ratified at `-179` cl.2**.
- ✅ **`D-percentage`** — **RULED, BigDev author-commit: ⛔ NO percentage on a `closed`/`settled`
  drive page** (`#decision-2026-09-15-218` cl.1). ⚠ **cl.3:** the `live` arm is ⛔ **NOT** ruled and
  ⛔ must not auto-widen. ⚠ **cl.2:** ⛔ no code moves — the absence was already fenced and tested.
- ⭐ **VACATED by `-175`:** `D14-order` · `D12-schedule` · `D13-maskedname` · `D11-order` — ⛔ their
  QUESTIONS ceased to exist; ⛔ they were ⛔ not rejected.

## Tasks / Subtasks

⭐ **Bidirectional map, rebuilt at v2.1** — every AC has ≥1 Task; every Task carries ≥1 AC tag:
AC0→T0 · AC1→T2 · AC2→T1 · AC3→T2 · AC3b→T2 · AC4→T3 · AC5→T4 · AC6→T5 · AC7→T6 · AC8→T7 · AC9→T8 ·
AC10→T0 · **AC11→T1b** (and T1b gates T2).

- [x] **Task 0 — GOVERNANCE** (AC0, AC10) — ✅ **COMPLETE, 2026-09-15, in ONE `governance:` commit
      carrying ⛔ no code.** ⭐ `D-percentage` **RULED AND RECORDED** (`#decision-2026-09-15-218`) ·
      ⭐ **AC10's compliance statement WRITTEN** for both data classes (⛔ contributor **NOT COMPLIANT**,
      carried under `-177` cl.2; ✅ deceased **COMPLIANT**) · ⭐ story D's **Trap-10 back-reference**
      carried **and discharged** by `-218` · ⭐ **`-182`'s forward pointer** appended · ⭐ the
      un-hardened `fundingOutcome` guard **ROUTED** (AC8), ⛔ not fixed.
  - [x] ✅ **DONE** — forward pointer appended to **`#decision-2026-09-02-182`**: its D9/D10
        enumeration is a **snapshot of 2026-09-01**, superseded by `-177` cl.2/cl.3. ⭐ Additive and
        clearly marked; ⛔ nothing above it rewritten, reversed or vacated.
  - [x] ✅ **HELD** — ⛔ ⛔ no `file:NNN` pointer into `.decision-log.md`, `deferred-work.md` or
        `sprint-status.yaml` was written. ⭐ Checked on the way **out**: this story's only five such
        strings are **record-quotes** (*"v2.0 cited X; it rotted"*), ⛔ not live cites
        ([[feedback_story_validate_footguns]] item 19). ⚠⛔ The `-218` prepend **does** rot such
        pointers in **other** artefacts — ⛔ not swept, and `-218` Consequence 4 says so.
- [x] **Task 1 — ⭐ THE TWO FIELDS + TWO ALLOWLIST ENTRIES, ONE COMMIT** (AC2, part of AC9) —
      ✅ **DONE 2026-09-15.** ⭐ `sahyog-vivran.deceased_member_name` (`2026-09-02-173`) and
      `sahyog-vivran.contributor_name` (`2026-09-02-174`) declared in the YAML **and** pinned in
      `RULED_TIER1_PUBLIC_EXCEPTIONS` **in the same commit** (`-165` cl.3). ⇒ the surface's
      Tier-1-at-`public` set is **THREE**; the allowlist is **SIX**.
      ⭐ `matrix.ts`'s fence amended: its **11b.3 half is spent**, its **11b.6 (In Memoriam) half
      STANDS**. ⭐ The YAML's *"⛔ NO SECOND TIER-1 ENTRY BELONGS HERE"* routing note **discharged**.
      ⚠⛔ **`escalation_count` is UNCHANGED at 1 — ⭐ settled by READING, ⛔ not decided:** the shipped
      test says *"a field being declared for the FIRST time has ⛔ no honest `from` tier. Declaring a
      surface is ⛔ not an escalation."*
      ⚠ **FIVE shipped assertions inverted and were amended BY NAME** (⛔ none deleted) — see the Dev
      Agent Record. ⛔ AC9's other four legs stay OPEN (Task 8): they depend on Task 2's render.
- [x] **Task 1b — ⭐ THE FINANCIAL-TRUTH GATE: NARROWED, AND ITS TEETH PROVEN** (AC11 b/c/d/e) —
      ✅ **DONE 2026-09-15.** ⭐ Rule (3) **narrowed, ⛔ not deleted and ⛔ not appended-to-green**: the
      TARGET and its factors stay banned by NAME, the ruled `amountRaisedInr` may cross, and the D1(c)
      act is caught **BY SHAPE** (`isAmountDerivation`). ⭐ Four artefacts amended **by name**.
      ⚠⛔ **AC11(a) is ⛔ NOT part of this task** — it lands with **Task 2** (ordering correction above).

- [x] **Task 2 — ⭐ THE AMOUNT AND THE DECEASED NAME BOTH SHIP** (AC3b ✅, AC1 ✅; AC3 **deceased arm
      ✅ / contributor arm → Task 3**) — ✅ **COMPLETE 2026-09-15, in TWO units.**
      ✅ **UNIT 1 of 2 — the RUPEE FIGURE, end to end.** Domain binding (clamped,
      hoisted above the ternary, used twice) → `SahyogVivranEntry.amountRaisedInr` → the wire DTO →
      the API handler → the matrix declaration → the Astro render.
      ⚠⛔⛔ **UNIT 1 WAS RE-REVIEWED BEFORE UNIT 2 STARTED AND A SHIPPED DEFECT WAS FOUND AND FIXED**
      — the rupee sign rendered **TWICE** (`₹₹ 1,37,000 raised`) in **BOTH** locales. ⛔ Recorded, ⛔ not
      quietly repaired: see the Dev Agent Record and the Change Log.
      ✅ **UNIT 2 of 2 — the DECEASED MEMBER'S NAME, `2026-09-02-173`, FULL NAME.** The shared
      `NAME_PUBLICATION_AUTHORISED` predicate **EXPORTED, ⛔ not copied** → a **LEFT** join to
      `member_kyc_profiles` → ciphertext + basis carried UNRESOLVED to the boundary → the gated
      decrypt (⛔ basis BEFORE decrypt ⇒ ⛔ zero KMS calls today) → `resolvePublicMemberName(mode, …)`
      → `.trim() || null` → the wire → the Astro `<dt>`/`<dd>` pair, **SUPPRESSED TOGETHER**.
      ⭐ **AC1's designed INERT STATE is preserved AND PROVEN END TO END** — the fixture plants a real
      Tier-1 ciphertext, the read selects it, the ruling authorises it, and the name still does ⛔ not
      render, because ⛔ no `clause_versions` row satisfies the basis. ⛔ ⛔ No placeholder was seeded.
      ⚠⛔ **SCOPE STATED, ⛔ NOT SILENTLY NARROWED:** the **contributor LIST** stays in **Task 3**,
      where **AC4** owns its pagination, ordering, bounded decrypt and control-set changes — ⛔ shipping
      rows without those is an unbounded unauthenticated decrypt fan-out. ⇒ AC3's per-row `try/catch`
      and its **contributor** omission arm land with Task 3.
  - [x] ⚠⛔ **`-218` cl.4:** ⛔ ⛔ no target / expected-total / roster-size companion to the amount.
        ✅ **ASSERTED** — the render fence now scans for `rosterSize` / `fixedAmount` / `expectedTotal`
        / `deliveredTotal` / `shortfall` / `percent` / `target` / an `"of ₹"` framing, ⭐ and the API
        spec asserts the same absence on the RAW WIRE BODY (unit 2).
  - [x] ⭐ **AC11(a):** ⛔ **NO new file was added** by EITHER unit — both edited only files already in
        `SCAN_FILES`. ⇒ a verified no-op, and the gate's scope safeguard is green.
  - [x] ⚠⛔ **`@twt/ui` IS ⛔ NOT ADDED YET, AND THAT IS DELIBERATE.** AC3 orders the dependency, ⛔ but
        ⛔ NEITHER half of Task 2 uses the presenter: the AMOUNT cannot (Trap 2c: it takes `rosterSize`
        + `fixedAmount` as INPUTS, which `-204` cl.3/cl.8 reserve) and the NAME must ⛔ not (the
        presenter's input type has ⛔ no full-name arm — AC3's own blocking finding). ⇒ adding it now
        would be a dependency with ⛔ no consumer — *"a field with no render is the vacuous-leg defect
        wearing a forward-compatibility costume"*, this surface's own words
        ([[feedback_no_premature_package]]). ⭐ It lands with the **contributor list**, its first real
        consumer, at Task 3.
- [x] **Task 3 — ⭐ THE CONTRIBUTOR LIST: pagination, ordering, the anti-leaderboard fence, the
      control set** (AC4; AC3's **contributor arm**) — ✅ **DONE 2026-09-15.**
      ⭐ The shared producer `listConfirmedContributorsForPool` (**ordered by the earliest LIVE
      confirmation's `event_version`**, ⛔ never `member_id`) → **PAGE FIRST, DECRYPT SECOND** →
      bounded decrypt at the **FULL** `DIRECTORY_DECRYPT_CONCURRENCY` (⛔ not the halved bound at
      `member-pool/handlers.ts:508`: a contributor row is ⛔ ONE decrypt) → the per-row `try/catch`
      **INSIDE `fn`** → `resolvePublicMemberName` → `.trim() || null` → **omit the ROW**.
      ⭐ **The control set is SEVEN** — ordinals 2 and 3 RESTORED in
      `sahyog-vivran-controls.ts`, with `routes.ts`'s header, the matrix's `paginated` flag and
      **four** `login-wall.spec.ts` assertions moved **BY NAME** in the same commit.
      ⚠⛔ **SEVEN, ⛔ not the "SIX" three shipped documents predicted** — that arithmetic was written
      when the set held FOUR and 11b.10 then added ordinal 7 without re-doing it.
      ⭐ The wire array is named **`items`** so Story 1.14's forced-pagination guard SEES a bounded
      collection — ⛔ the prior *"no `items` key"* instruction's premise was *"an **UNPAGINATED**
      single-item route"*, and ⛔ renaming it `contributors` would make this route invisible to that
      guard.
      ⚠⛔ **AC5's ERASURE BACKSTOP WAS PULLED FORWARD INTO THIS TASK, ⛔ NOT DEFERRED TO TASK 4 —
      STATED, ⛔ not done silently.** Shipping rows without the `ANONYMIZED_SENTINEL` plaintext check
      would render the literal **`[anonymized]`** where a person's name belongs, on an
      unauthenticated edge-cached page, for as long as Task 4 took. ⇒ ⭐ the check lands with the rows
      it protects. ⛔ **Task 4 still owns the rest of AC5**: `D10-rowkey`(a)'s record, Story 8.3's
      `keyExtractor` deferral re-affirmation, and the *"still counts"* aggregate note.
- [x] **Task 4 — RTBF + the erasure backstop + the row key** (AC5) — ✅ **DONE 2026-09-15**, in TWO
      places, and the split is stated rather than left invisible.
      ✅ **AT TASK 3, with the rows they protect** (⛔ deliberately ⛔ not held back — the gap would have
      rendered the literal `[anonymized]` publicly): the `ANONYMIZED_SENTINEL` plaintext check
      (constant **IMPORTED** from `@twt/domain`, ⛔ never re-typed) · **absent entirely AND still
      counts** · ⛔ **no** per-row lifecycle re-check (`-170`) · ⛔ **no** row key (`D10-rowkey`(a)).
      ✅ **AT TASK 4 (this commit):** ⭐ **`-177` cl.3's TRIGGER RE-POINTING IS RECORDED IN
      `deferred-work.md` FOR THE FIRST TIME.** ⚠⛔ **It was RULED on 2026-09-02 and had ⛔ NEVER reached
      that file** — the word *"virtualized"* appeared in ⛔ no entry there. ⇒ the 8.3 entry still
      carried *"reused for the Epic 11b **public render**"*, which **THIS STORY IS**, so a reviewer
      would have read the trigger as FIRED and unactioned. ⭐ It has ⛔ **not** fired: ⛔ not virtualized
      (Astro SSR) and ⛔ not multi-pool.
      ⭐ **The `-169` cl.4 aggregate leg was WIDENED** — *"every aggregate"* now means `total` **and**
      `confirmedContributionCount` **and** `amountRaisedInr`, all asserted blind to the erasure.
      ⭐ **The edge-cache residual is STATED** at the sentinel and routed (`-172` ends the guarantee AT
      THE WIRE; `s-maxage=300` keeps an erased row warm for ≤5 min). ⛔ ⛔ Not re-derived as new.
      ⚠⛔ **TWO LINE CITES WERE STALE AND ARE RE-DERIVED, ⛔ not patched into the entries above:**
      AC5's own `MemberDriveList.tsx:347` is live at **`:363`** (⭐ AC5 warned it might have moved), and
      the 8.3 `keyExtractor` is at **`:275-277`**, ⛔ not the `:254-256` the 11b.2b block recorded.
- [x] **Task 5 — The buildable column inventory** (AC6; AC11(e) **already discharged at Task 1b**) —
      ✅ **DONE 2026-09-15.** ⭐ The **BUILDABLE half** is written at the **canonical section**, cited by
      its heading title, and **cross-referenced from ALL FOUR restatement anchors** per the block's own
      *"⛔ THE COUNT IS ⛔ NOT THE REQUIREMENT, THE LIST IS"* rule. ⛔ Annotation, ⛔ never a rewrite:
      ⛔ no column deleted, ⛔ no replacement inventory authored, ⛔ neither microcopy fence lifted.
      ⭐⭐ **THE FIRST FINDING IS ⛔ NOT ABOUT COLUMNS — IT IS THE ROW GRAIN.** The inventory describes ONE
      ROW PER CONTRIBUTION; ⛔ **no shipped public surface has that grain and ⛔ none may** (the wire
      carries ⛔ no per-contribution id, ⛔ no per-contribution date, ⛔ no per-contributor amount). ⇒ the
      ten-column table was **SPLIT BY GRAIN**, ⛔ not narrowed.
      ⭐ **FIVE of ten buildable** — `Donor Name` · `District` · `Pool` · `Late Teacher` · `Date` — ⚠ two
      keep **microcopy-fenced LABELS** and one (`Late Teacher`) is **INERT by design**.
      ⭐ **AC11(e) was already done at Task 1b** — ⭐ **VERIFIED LIVE, ⛔ not trusted from the note**: both
      stale sentences are amended, kept and not rewritten.
      ⚠⛔ **ALL FOUR OF AC6's ANCHOR CITES HAD ROTTED** and are re-derived: the canonical section is
      `:1298` · the Real Data Test `:1257` (⛔ not `:1252`) · the anatomies `:1830`/`:1842` (⛔ not
      `:1788`/`:1798`) · the performance contract `:2218` (⛔ not `:2161`+`:2165`). ⭐ Only `:1158` held.
- [x] **Task 6 — a11y (web form) + real-`t()` both locales + the completeness fence** (AC7) —
      ✅ **DONE 2026-09-15.**
      ⭐ **FAMILY 13 IN ITS WEB FORM**, in a new `sahyog-vivran-a11y.test.ts` (8 legs, the house
      source-scan idiom + an anti-vacuity guard). ⚠⛔ **The checklist's mobile wording does ⛔ NOT
      transliterate** — there is ⛔ no `accessibilityRole` on the web: **the semantic element IS the
      role**. ⇒ ⭐ real ELEMENT · real NAME · real STRUCTURE, and ⛔ **no `role="list"` patches**.
      ⭐ Two markup corrections fell out of writing it: the section is now named by its own `<h2>` via
      `aria-labelledby` (⛔ not a second `aria-label` that can drift), and the paging `<nav>` is named
      **`pagination.label`** — ⚠⛔ Task 3 had labelled it `contributorsHeader`, which announces a
      NAVIGATION landmark called *"Confirmed contributions"* and collides with the `<h2>` two elements
      up. ⭐ `<ul>`/`<li>` now mirrors `/sahyog` exactly.
      ⭐ **REAL-`t()` BOTH LOCALES** — the three `pagination.*` keys joined `KEYS`, and the
      **cross-namespace** `contributor_list.*` keys get their own legs **plus the negative half**:
      they resolve from `contribution` and **THROW** from `sahyog-vivran` ⇒ ⛔ nobody copied them into
      a second home. ⚠⛔ The prefix is **`contributor_list.`**, ⛔ not `contribution_list.`.
      ⭐ **THE COMPLETENESS FENCE** — ⛔ no copy in either namespace claims the list is complete
      (*"all/every contributor"*, *"complete/full/entire list"*, `सभी सहयोगी`, `पूरी सूची`) and
      ⛔ **none counts omissions** (*"withheld"*, *"omitted"*, `छिपाए`, `रोके`).
      ⭐ **STAGE WORDS: CONSUMED, ⛔ NOT MINTED** — `stage.*` **THROWS** from `sahyog-vivran` and
      resolves from `sahyog-shared` (⛔ the negative leg alone would be vacuous), and ⛔ `stage.settled`
      exists in **⛔ NO namespace**: the wire token is `settled`, the ruled WORD is **"Verified"**
      (`-192` cl.1, Trustee-ratified at `-193`; ⛔ never `-191` cl.3's superseded *"Completed"*).
      ⚠⛔ **THE `sahyog-shared` DARK-COPY FENCE IS ⛔ NOT DUPLICATED — ⭐ VERIFIED TO ALREADY COVER
      THIS FILE.** Its walker is `SCAN_ROOTS = ['apps', 'packages']`, so `[driveToken].astro` is
      already scanned and the suite is green ⇒ this page resolves ⛔ neither `index_line.*` nor
      `message_block.*`. ⭐ A local copy would be a second scanner over the same ground
      ([[feedback_gate_scope_semantic_coverage]]).
      ⭐ **Teeth proven** — planting a redundant `role="list"` and re-pointing the nav label both go
      RED; reverting returns 613/613.
- [x] **Task 7 — Route what is not built** (AC8) — ✅ **DONE 2026-09-15.** ⭐ Every obligation was
      checked **against live state**, ⛔ not asserted from the AC's own text.
      ✅ **FOUR HELD, verified against the branch diff** (`be0037cc..HEAD`): the three negative scope
      fences (⛔ `apps/mobile` and `member-pool` untouched · ⛔ masking untouched) · the **D10-ratification item untouched**
      · ⛔ no present-tense inversion phrase · story D's **Trap-10 back-reference** (Task 0) · the
      `fundingOutcome` guard **ROUTED** (Task 0).
      ⚠⛔⛔ **CORRECTED 2026-09-16 (second review pass) — `@twt/ui` WAS MIS-FILED HERE AS A HELD
      FENCE, AND IT IS ⛔ NOT ONE** ([[feedback_closure_language_precision]]). ⛔ It was counted among
      the negative scope fences as *"⛔ `@twt/ui` never added — `apps/public/package.json` is ⛔ not in
      the diff"*. ⚠ But AC8's fence forbids lifting `@twt/ui` **BEYOND** `apps/public`; ⛔ it was read
      as satisfied by never lifting it **AT ALL** — which converted an **unmet AC3 obligation** into a
      green check on a **DIFFERENT AC**. ⭐⭐ The ENGINEERING call is RIGHT and stands: AC3 cl.2 permits
      *"⛔ not consumed at all if that leaves it vacuous"*, it matches [[feedback_no_premature_package]],
      and a live in-code fence at `apps/public/src/pages/sahyog.astro:917-919` says the same. ⇒ ⛔ **⛔ no
      code change is owed.** ⭐ The correct entry is:
      · ⭐ **AC3's `@twt/ui` dependency clause — RESOLVED VIA EXPLICIT DEFERRAL, ⛔ not "HELD".**
        `-154` cl.6 ruled it an *"ORDINARY DEPENDENCY ADDITION"*; Task 2 deferred it to Task 3 (*"It
        lands with the contributor list, its first real consumer"*); ⚠ Task 3 shipped the list and the
        dependency did ⛔ not land, and ⛔ said nothing. ⭐ Its first real consumer is now **11b.2 /
        11b.5 / 11b.7**, per the `sahyog.astro` fence. ⛔ It is ⛔ not a fence this story held.
      ✅ **THREE WERE OPEN AND ARE NOW CLOSED:**
      · ⭐ **Counsel's clause (`-173` Q3) — recorded as CARRIED, ⛔ not discharged.** ⚠ Its silence would
        have read as *"routed to a story that ignored it"*; ⭐ the record states that `11b-3b` built the
        WHOLE render path and the clause is still the only thing stopping a name. ⭐ **Trigger sharpened:**
        counsel delivering the clause **AND it being minted and PINNED** — ⛔ delivery alone does ⛔ not fire it.
      · ⭐ **The amount-raised item — DISCHARGED on its own stated condition** (*"it closes when 11b.3b's
        Task 2 ships the field"* — ⭐ Task 2 shipped it), and the ***"INTERIM ASYMMETRY"* carve-out
        RETIRED**: ⚠⛔ a count-vs-amount divergence between the two surfaces is ⛔ no longer *"ORDERING"*
        and is now a **DEFECT** to file. ⛔ Its other half (⛔ *"not a second D7 inversion"*) STANDS.
      · ⭐ **The `11b-20` record — WRITTEN**, with the third asymmetry `11b-20` most needs and AC8 does
        ⛔ not name: the **contributor** names render TODAY while the deceased member's do not.
      ⭐ **PLUS TWO NOT ENUMERATED BY AC8, ROUTED UNDER ITS DISCIPLINE:** the **abuse counter** (see the
      Completion Notes) and a note that `public-read.ts` is in the diff for a **one-keyword export** — so
      a reviewer meets the *"⛔ no index change"* fence's reason instead of deriving it.
- [x] **Task 8 — Amend the five inverted tests and re-plant the negative control** (AC9) —
      ✅ **DONE 2026-09-15**, and it was a **VERIFY-AND-RECORD** pass: all five inverted as they landed,
      across Tasks 1-3. ⭐ Each **verified LIVE at `a097b953`**, ⛔ not trusted from a completion note.
      ⚠⛔⛔ **AC9's COUNT WAS LOW BY MORE THAN FOUR TIMES — ⛔ ITS LIST WAS RIGHT, ITS NUMBER WAS NOT.**
      The real figure is **22 amendment markers across SEVEN test files**, plus `public-pages.test.ts`'s
      identity snapshot. ⚠ One leg was narrowed **THREE TIMES** across three tasks.
      ⇒ ⭐ **the same defect class this story kept finding in others, in the story's own AC** — a COUNT
      carried forward as a WORD (the control set's *"SIX"* → **SEVEN**; AC2's *"three stale epic ACs"* →
      **TWO**; the field-floor's *"EXACTLY TWO"* enumerating two under a heading saying three).
      ⚠⛔ **AND AC9 SAID *"a negative control"* — SINGULAR. ⭐ THERE WERE THREE**, each re-planted onto a
      subject chosen so ⛔ no future story can declare it away: **`donation_id`** (⛔ no substrate
      anywhere) · **`verifierName`** (⛔ unruled at every tier) · **`in-memoriam`** (its fence stands).
      ⭐ **The choice of subject is the whole value** — a control re-planted onto something a sibling is
      about to declare goes green for the wrong reason at the worst moment.
      ✅⛔ **AC9's ACTUAL PROHIBITION — *"⛔ never deleted quietly"* — VERIFIED MECHANICALLY:** the branch
      removes **15** `it(` lines and adds **49**; ⭐ **all 15 are RENAMES with a live successor**, each
      because the assertion inverted and the title had to follow. ⛔ **ZERO legs dropped.**

### Review Findings

⚠ **PARTIAL PASS — GROUP 1 OF 5 (chunked; diff exceeded the 3000-line single-pass threshold).**
Scope: `packages/contracts`, `packages/domain`, `packages/api-client`, `packages/ui`, diffed
`05094a68..HEAD`. Remaining groups queued for follow-up runs: `apps/api`, `apps/mobile`,
`apps/public`, `packages/i18n`+`scripts`+`openapi`+`microcopy.yaml`.

⭐ **KEY RESULT: this diff range is NOT pure 11b.3b.** `05094a68..HEAD` also carries story 11b.17
(`d7c320b9`, `b2b467e3`, `f41ee8e5`) and story 8.17 (`5ffb366a`, `66976803`) — both already
carrying their own "code review" fix commits. Every finding below was checked against `git log
05094a68..HEAD --grep="11b.3b" -- <path>` to confirm authorship before being counted against this
story; findings landing only in files 11b.3b's own commits never touched are dismissed as
out-of-scope rather than charged to this story.

The Acceptance Auditor found **zero AC violations** in the files 11b.3b's own commits touched
(`sahyog-vivran.ts`, `matrix.ts`, `public-vs-private-matrix.yaml`, `public-read.ts`,
`sahyog-vivran-read.ts`, `view-model.ts`, and their tests) — AC2, AC3b, AC4, AC9 and AC11(c)/(d)
all independently verified compliant.

- [x] **[Review][Defer] Clamp-to-zero total logic duplicated across two stories** [`packages/domain/src/pool/sahyog-vivran-read.ts`] — the "clamp negative `deliveredTotal` to 0, warn-log" pattern 11b.3b added here is near-verbatim duplicated in 11b.17's `member-drive-detail.ts`, with only prose (not a shared helper) preventing drift. Deferred — pre-existing pattern spans two already-shipped stories; not 11b.3b's to refactor unilaterally.
- [x] **[Review][Resolved] `PublicSahyogVivranQuery.page`/`limit` have no `.default()`** [`packages/contracts/src/public-pages/sahyog-vivran.ts`] — ⭐ RESOLVED by the group 2 (`apps/api`) pass: the Acceptance Auditor confirmed the handler itself supplies `page`/`limit` defaults, "resolving a question a prior review pass had deferred." No contract change needed.
- [x] **[Review][Defer] `PublicSahyogVivranResponse` has no cross-field bound on `items.length`/`page`/`limit`** [`packages/contracts/src/public-pages/sahyog-vivran.ts`] — Fastify does validate/serialize this schema at runtime (`routes.ts:379`), so an unbounded producer bug would pass through uncaught; no other response schema in `public-pages`/`contributions` uses `.refine()` for this. Left deferred — group 2 found no actual violation of the bound, only its absence at the schema level; a defense-in-depth item, not a live defect.
- [x] **[Review][Defer] `confirmedContributionCount × row.fixedAmount` has no explicit overflow guard** [`packages/domain/src/pool/sahyog-vivran-read.ts`] — no check against `Number.MAX_SAFE_INTEGER`. Deferred — the multiplication itself pre-dates this diff (11b.3b only hoisted it into a shared `deliveredTotal` binding, per its own doc-block); real-world contributor counts/INR amounts make overflow implausible.

**Dismissed as out-of-scope (group 1, 17):** findings landing exclusively in files 11b.3b's commits never touched — `driveTargetInr`'s `.positive()` bound, `nomineeAccounts` rank-uniqueness, `driveTargetInr` null-vs-absent-key, four hardcoded pool-state tuples, IFSC length mismatch (100 vs 200), `vpa`/`vpaPresent` cross-validation, missing `api-client` test coverage, an unchecked `as` cast on `row.currentState`, a fence test's duplicated `SKIP` set, undemonstrated reliance on `getClaimNomineeBankAccountsCiphertext`/`resolveDriveTargetForMembers`/`resolveDriveTargetVisibility`, an OpenAPI description stuffed with internal decision-log references, an unenforced stage/percentage pairing invariant, generously wide string bounds on bank fields, a missing client-side empty-`driveToken` guard, unbounded bank-field lengths reaching the contract, an OpenAPI doc/`.min(1)` mismatch, and a nominee-account ordering guarantee with no local sort backstop — all in `packages/domain/src/pool/member-drive-detail.ts`, `packages/contracts/src/contributions/{member-drive-detail,nominee-accounts}.ts`, `packages/api-client/src/index.ts`, or their tests (stories 11b.17 / 8.17, each with their own prior review-fix commits).

### Group 2/5 — `apps/api`, diffed `05094a68..HEAD`

⭐ Same authorship filter applied: 11b.3b's own commits in `apps/api` only touched
`sahyog-vivran-controls.ts`, `public-pages/handlers.ts`, `public-pages/routes.ts`,
`sahyog-vivran.spec.ts` (integration), and `login-wall.spec.ts`. Everything else in this slice
(`member-pool/*`, `payment/*`, `audit/*`, and their tests) belongs to 11b.17 / 8.17.

- [x] **[Review][Patch] Missing erasure-sentinel backstop on the deceased-member name decrypt (Trap 4 / AC5, real gap)** [`apps/api/src/modules/public-pages/handlers.ts:872-882`] — ✅ **FIXED 2026-09-15.** The Task 2 unit 2 block decrypted `drive.deceasedNameCiphertext` and only checked `storedName !== null`; it never checked `storedName === memberDomain.ANONYMIZED_SENTINEL`, so `anonymizeMember`'s in-place `[anonymized]` ciphertext would decrypt successfully and render as the deceased member's literal name once `namePublicationAuthorised` goes live. Patched by mirroring the contributor-list block's own erasure-backstop check (Task 3, lines ~1021-1048) immediately after the decrypt and before `resolvePublicMemberName`. Added a regression test, `⭐⭐ THE ERASURE SENTINEL OMITS THE NAME, ⛔ NEVER RENDERS \`[anonymized]\` (Trap 4, AC5)`, in `sahyog-vivran.spec.ts`'s Task 2 unit 2 describe block — verified it fails against the pre-patch code (`expected '[anonymized]' to be null`) and passes with the fix. Full spec file (40 tests) and `login-wall.spec.ts` (5 tests) green afterward; `tsc --noEmit` clean.

Dismissed as out-of-scope or already-known (group 2, 18): a silent audit-locator console-only fallback, missing rate limiting and advisory-lock load risk on the member drive-detail route, order-dependent cross-test mutable state, non-deterministic nominee-name selection, no test for differing nominee holder names, missing >200-char token boundary coverage, an internal pool-ID leak via an unhandled error message, ambiguous VPA-decrypt-failure UX, an unconditional second-account VPA decrypt, brittle hardcoded decrypt/audit-line test counts (all in 11b.17's `member-drive-detail.ts`/spec or 8.17's `payment/handlers.ts`, or `audit/shared` — none touched by 11b.3b's own commits); three Edge Case Hunter findings in `member-pool/handlers.ts` and `payment/handlers.ts` (audit-then-throw ordering, commit-failure-after-success, an unguarded empty-VPA spread) — same reason; an inconsistent Unicode-stripping gap in 11b.17's new `district` renderer relative to 11b.3b's own already-shipped fix — not 11b.3b's defect; and the self-quantified public-contributor scraping-exposure math, which is **already recorded and deliberately routed** by this story's own Task 7 (AC8) — verified live in `deferred-work.md` ("CARRIED BY STORY `11b-3b` (2026-09-15, AC8/Task 7) — DELIBERATELY NOT DISCHARGED"), so re-filing it here would be a duplicate of an already-ratified decision, not a new finding.

### Group 3/5 — `apps/mobile`

⭐ **ZERO commits from 11b.3b touch `apps/mobile`** (`git log --grep="11b.3b" -- apps/mobile` returns nothing) — every commit in this diff range touching that directory belongs to 11b.17 or 8.17. Skipped entirely; nothing to review.

### Group 4/5 — `apps/public`, diffed `05094a68..HEAD`

⭐ This slice IS overwhelmingly 11b.3b's own work: `sahyog-vivran-render.ts`, `sahyog-vivran.server.ts`, `surface-fields.ts`, `[driveToken].astro`, and four of its five touched test files. One shared completeness-fence file, `member-drive-detail-field-floor.test.ts`, is jointly amended with 11b.17 — findings there were checked against which commit added which entry before being counted.

- [x] **[Review][Patch] Response validator never checked the six fields this story added to the wire — a malformed/degraded body could crash the render instead of falling into the outage state** [`apps/public/src/lib/sahyog-vivran.server.ts`] — ✅ **FIXED 2026-09-15.** `isSahyogVivranResponse`'s own doc-block states its purpose is to catch a malformed body before render, because a bare/missing check "lets an unknown token reach a `default:` branch that throws INSIDE the render, defeating this module's own '⛔ NEVER THROWS' guarantee." Despite that, it never checked `deceasedMemberName`, `amountRaisedInr`, `items`, `page`, `limit`, or `total` — all six fields 11b.3b added. Concretely reachable: `formatCurrency` throws on a non-finite `amountRaisedInr`, and `contributors.map` throws a `TypeError` when `items` isn't an array — either would crash `buildSahyogVivranView` on a degraded upstream response. The test file's own `OK_BODY` fixture had also never been updated to include these fields, which is exactly what let the gap ship unnoticed. Patched by extending the validator with the same literal/bound checks used for every pre-existing field (`.int().nonnegative()` for `amountRaisedInr`/`total`, `.int().positive()` for `page`/`limit`, `.min(1).nullable()` for `deceasedMemberName`, per-row `{name: string}` shape for `items`). Updated `OK_BODY` to carry all six fields and added 8 new rejection/acceptance tests in `sahyog-vivran-client.test.ts`; verified all 8 fail against the pre-patch validator and pass with it. Full file (31 tests) plus `sahyog-vivran-render.test.ts`/`sahyog-vivran-copy.test.ts`/`sahyog-vivran-a11y.test.ts`/`member-drive-detail-field-floor.test.ts` (119 tests) green; `tsc --noEmit` clean.
- [x] **[Review][Defer] Same i18n key used for two different "confirmed" numbers on one page** [`apps/public/src/pages/sahyog-vivran/[driveToken].astro`] — `contributorTotal` (the confirmed-contributor SET SIZE) and `confirmedContributionCount` (the confirmed-contribution EVENT count) both resolve through the identical key `value.contributions_count`, so two numbers the code's own comments say "answer different questions" can both render as "N confirmed" on the same page. This is a copy/product wording question, not a code defect — deferred rather than patched unilaterally, since inventing distinct copy in a governance-heavy i18n surface needs a product/copy call, not a reviewer's guess.
- [x] **[Review][Defer] No direct test of the `.astro` page's own query-string-rejection 404** [`apps/public/src/pages/sahyog-vivran/[driveToken].astro`] — the Acceptance Auditor confirmed the strict allowlist + 404-collapse behavior exists and is correct in code, but no test in this diff exercises `?x=1` directly. A coverage gap, not a functional defect.
- [x] **[Review][Defer] Duplicated doc-comment blocks and test fixtures across three files** [`sahyog-vivran-render.ts`, `surface-fields.ts`, `[driveToken].astro`, `scrape-test.spec.ts`, `sahyog-vivran-render.test.ts`] — near-verbatim rationale comments and near-identical fixture objects exist in multiple places with no shared source, inviting drift. Code-quality observation, not a functional defect.

Dismissed as verified non-issues (group 4, 4): a pagination `limit: 0` division-by-zero-style concern — already guarded (`contributorLimit > 0 &&` in `[driveToken].astro`); an outage-state `contributorTotal: ''` rendering an empty `<p>` — unreachable, the entire contributor section is gated behind `apiUnavailable ? outage : normal` and never renders in the outage branch; an unescaped-contributor-name XSS concern — no `set:html` is used, Astro/JSX escapes the interpolated value by default; and a cosmetic `<dt>`/`<dd>` structural inconsistency for `amount_raised_inr` sharing a `<dt>` with the confirmed count — the Acceptance Auditor confirmed this is valid HTML with self-describing text and explicitly called it "not a fix I'd block on." Also dismissed as established, deliberate codebase conventions rather than new defects: the "negative control replanting" test pattern, the anti-enumeration undifferentiated-404 design, and the density of ⭐/⛔ governance prose per line.

### Group 5/5 (FINAL) — `packages/i18n`, `scripts`, `openapi/v1.yaml`, `microcopy.yaml`, diffed `05094a68..HEAD`

⭐ 11b.3b's own commits in this scope touched only five files: `packages/i18n/locales/{en,hi}/sahyog-vivran.json` and `scripts/sahyog-vivran-financial-truth/{check,lib,lib.test}.ts`. Everything else in the slice (`member-drive-detail*`/`member-drive-list`/`contribution`/`sahyog-shared` locale files, `catalog.ts`, `sahyog-shared-dark-copy.test.ts`, `scripts/microcopy/member-drive-detail.test.ts`, `microcopy.yaml`, all of `openapi/v1.yaml`) belongs to 11b.17 / 11b.19 / 8.17.

- [x] **[Review][Patch] Dead constant with a misleading doc-comment in the financial-truth gate script** [`scripts/sahyog-vivran-financial-truth/lib.ts`] — ✅ **FIXED 2026-09-15.** `RULED_AMOUNT_FIELD` was declared with a comment claiming it is what "permits" `amountRaisedInr` on the render path, but it was never referenced anywhere in the file — the actual permission is simply `amountRaisedInr` not being a member of `TARGET_OPERANDS`. Harmless today, but exactly the kind of comment that could mislead a future maintainer into treating the regex as load-bearing (e.g. "narrowing" it further under a false belief). Removed the dead constant, left a one-line note explaining what actually gates the field. `lib.test.ts` (20 tests) green; `tsc --noEmit` clean.
- [x] **[Review][Defer] `isAmountDerivation`'s shape check only recognizes `*`, not `*=`** [`scripts/sahyog-vivran-financial-truth/lib.ts`] — a compound-assignment re-derivation (`total *= row.fixedAmount`) isn't matched by the `AsteriskToken`-only operator check this story's own Task 1b introduced. Verified this is **not independently exploitable** in practice: the same expression's `row.fixedAmount` PropertyAccessExpression is still visited independently by the AST walk and still trips the bare-name `TARGET_OPERANDS` check regardless of the surrounding operator, so the realistic case is still caught. The gap only matters if the operand is ALSO aliased away from every recognized name — in which case the shape check wouldn't fire on a `*` either (the aliased name wouldn't match `COUNT_OPERAND`/`PER_MEMBER_AMOUNT`), so widening the operator-token check alone would not close it. Deferred as a documented, low-severity precision note rather than a rushed fix that wouldn't meaningfully change coverage.

Dismissed as out-of-scope (group 5, most of Blind Hunter's + Edge Case Hunter's findings): a Hindi tagline in the English `sahyog-shared.json`, `openapi/v1.yaml` schema duplication/`rank` modeling/YAML-anchor concerns (all 11b.17's `MemberDriveDetailResponse`/`MemberDriveNomineeAccountView` — `openapi/v1.yaml` contains zero `sahyog-vivran` references per the Acceptance Auditor's direct check), duplicated governance prose across `member-drive-detail.json`/`member-drive-list.json`, an unshipped cross-namespace-equality "durable fix" noted in those same files, `scripts/microcopy/member-drive-detail.test.ts`'s test-input-shape inconsistency, the dark-copy-fence regex-widening and `isTestModule` gaps in `sahyog-shared-dark-copy.test.ts` (11b.19's `message_block`/`index_line` surface), and the "scope patched in after the fact, not by the story" observation about `microcopy.yaml` — none of these files were touched by 11b.3b's own commits.

---

## ⭐⭐ REVIEW COMPLETE — ALL 5 GROUPS (2026-09-15)

Chunked review of the full story diff (`05094a68..HEAD`, 83 files / +16,455 / −1,609 across the
whole range) against the actual authorship of 11b.3b's own commits, cross-checked at every group
via `git log --grep="11b.3b" -- <path>` before any finding was charged to this story.

**Totals across all 5 groups:**
- **Groups reviewed:** 1 (contracts/domain/api-client/ui), 2 (apps/api), 4 (apps/public), 5 (i18n/scripts/openapi/microcopy)
- **Groups skipped:** 3 (apps/mobile) — zero 11b.3b commits touch it
- **Patches found and fixed:** 3 — a missing erasure-sentinel backstop on the deceased-member name decrypt (group 2, real disclosure-shaped gap), an unvalidated response boundary that could crash the public render (group 4, real availability-shaped gap), and a dead/misleading constant in the financial-truth gate script (group 5, cosmetic)
- **Decision-needed:** 0
- **Deferred:** 5 open (1 resolved mid-review) — all either cross-slice questions already closed by a later group, product/copy calls outside a reviewer's authority, test-coverage gaps, or low-severity/non-exploitable precision notes
- **Dismissed:** ~60, the overwhelming majority because they landed in files 11b.3b's own commits never touched — this diff range also carries stories 11b.17, 11b.19, and 8.17 interleaved in the same linear history, each already reviewed under its own commits
- **Acceptance Auditor verdict across every in-scope file:** zero AC violations found against AC1–AC11

### Review Findings — SECOND PASS (2026-09-16)

⚠⛔ **THIS PASS SUPERSEDES ⛔ NOTHING ABOVE — it is a SECOND, INDEPENDENT review run after the row
had already moved to `done`** ([[feedback_supersede_never_reinterpret]]). ⭐ Three layers, ⛔ zero
failed. ⭐⭐ **THE RANGE IS DIFFERENT AND THAT IS THE POINT:** this pass diffed **`be0037cc..HEAD`**
— the branch's merge-base with `origin/main` — where ⭐ **all 15 commits are 11b.3b's own.** ⛔ The
first pass diffed `05094a68..HEAD`, which carried 11b.17 / 11b.19 / 8.17 interleaved and forced a
per-finding `git log --grep` authorship filter. ⇒ ⭐ **⛔ no finding below needs that filter**, and
⛔ none is dismissed as another story's.
⭐ The working tree was included: `apps/public/tests/sahyog-serves.test.ts` is UNCOMMITTED at HEAD.

- [x] **[Review][Decision → ROUTED]** **The "⛔ NO OMISSION COUNT, EVER" rule is defeated by the envelope shipped beside it — and `limit=1` makes it a PER-POSITION erasure oracle** — `packages/contracts/src/public-pages/sahyog-vivran.ts:672-674` rules the property absolutely (*"⛔ Not a tally, ⛔ not a 'some names withheld' line, ⛔ not a per-row marker. A count of omissions is an enumeration signal over which members were erased"*), and `handlers.ts:981-983` restates it. ⚠ But `total` is the set size taken BEFORE omission (`-169` **cl.6** (D3-aggregate), correctly — an erased contributor still counts; ⚠ this said
cl.4 until 2026-09-17, which is the BATCHED-STATE-READ clause) while `items` is post-omission, and the slice is taken over the UNFILTERED set. ⇒ `total − Σ items.length` **IS** the tally, and `GET …?limit=1&page=k` returning `{items: [], total: N}` for `k ≤ N` proves **position k specifically** was omitted — strictly MORE precise than the marker the design refuses. ⭐ Both horns leak: a post-omission `total` would instead shrink over time and leak that an erasure occurred. ⇒ ⛔ **⛔ not a reviewer's patch — this contradicts a ratified clause and needs the Panel.** Options: (a) ratify the derivable tally as accepted residual risk and amend the absolute wording; (b) floor `limit` above 1 so no page is a single position; (c) re-rule `total` post-omission and accept the shrink signal. ⭐⭐ **RULED 2026-09-16 (BigDev) — ROUTED TO THE PANEL.** ⛔ No code change taken in this review; the obligation is carried in `deferred-work.md` under this pass's section. ⭐ **ESCALATED:** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-16-11b3b-code-review-three-questions.md` (Q1 = the omission oracle · Q2 = D1(c)'s enforcement · Q3 = the living contributor's basis). ⭐⭐ **RULED 2026-09-16 (Trustee Panel, DR + KB) — `#decision-2026-09-16-219` cl.1-cl.4: OPTION (E), THE PLACEHOLDER ROW.** ⚠⛔ **On the FAIRNESS ground, ⛔ NOT the privacy one — and this AC must ⛔ never be written as closing the leak: (E) WIDENS disclosure.** `-169` cl.1 is SUPERSEDED **for the PUBLIC surface only**; the member list keeps D5 whole. ⭐ Word = **`A contributor`**, ratified together with its constraint: TRUE under all five omission causes, with ⛔ nothing disclosing WHICH. ⛔ `Anonymous` / `Not recorded` ruled out BY NAME. ⚠ `Name not shown` is the fallback. ⛔⛔ **THE HINDI IS ⛔ NOT RULED and the English ships ⛔ no sooner than it does.** ⇒ ⭐ **THIS RETURNS TO IMPLEMENTATION** (placeholder render + word + the `sahyog-vivran.ts:672` fence amended IN PLACE, ⛔ not appended).
- [x] **[Review][Decision → ROUTED]** **The financial-truth gate's AC11(b) narrowing REMOVED coverage D1(c) previously had — a literal operand now passes green** [`scripts/sahyog-vivran-financial-truth/lib.ts:132,140-141,160-170`] — `amountRaisedInr` was dropped from `TARGET_OPERANDS` (correctly — the ruled field's own name can ⛔ not be unshippable), and the replacement `isAmountDerivation` fires only when BOTH operands resolve to an identifier matching `COUNT_OPERAND` × `PER_MEMBER_AMOUNT`. ⇒ `const amountRaisedInr = model.confirmedContributionCount * 1000;` in a `renderPath` file: `namedOperand` returns `undefined` for the NumericLiteral ⇒ ⛔ no finding. ⚠ Before the narrowing that exact line tripped the name rule. ⭐ The doc-block's load-bearing claim — *"caught STRUCTURALLY … under ANY local spelling"* — is therefore ⛔ false, and `-176` **D1(c)** (*"a second multiplication anywhere in this app is the defect"*) is now enforceable only against the one spelling the domain happens to use. ⭐⭐ **CORRECTION TO ONE LAYER:** the shape leg is ⛔ NOT dead code — `PER_MEMBER_AMOUNT` accepts `fixed_amount` (snake), which is ⛔ absent from `TARGET_OPERANDS`, so `confirmedCount * fixed_amount` is caught by shape ALONE. ⇒ the defect is the LITERAL/aliased operand hole, ⛔ not vacuity. ⚠ Widening the gate amends a ratified AC ⇒ ⛔ not a unilateral reviewer fix. ⭐⭐ **RULED 2026-09-16 (BigDev) — ROUTED TO THE PANEL.** ⛔ No code change taken in this review; the obligation is carried in `deferred-work.md` under this pass's section. ⭐ **ESCALATED:** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-16-11b3b-code-review-three-questions.md` (Q1 = the omission oracle · Q2 = D1(c)'s enforcement · Q3 = the living contributor's basis). ⭐⭐ **RULED 2026-09-16 — `-219` cl.5: OPTION (A), HARDEN THE GATE *AND* CORRECT THE RECORD.** ⭐ `isAmountDerivation` must fire when one operand is a `COUNT_OPERAND` and the other a **numeric literal**, with a test that **isolates the shape leg** (⚠ the existing fixture names `fixedAmount` and passes on the NAME leg alone). ⭐ `-176` D1's premise *"11b.3b — which already adds `@twt/ui`"* is recorded **FALSE** ⇒ the gate is now the **SOLE** enforcement of D1(c). ⛔ D1(c) ⛔ not relaxed, ⛔ not violated. ⛔ Option (C) declined. ⇒ ⭐ **cl.5(a) RETURNS TO IMPLEMENTATION.**
- [x] **[Review][Patch]** **The API's stated "THE DEFAULT IS THE CAP (50)" is unreachable from the only production caller — the page always sends 25** [`apps/api/src/modules/public-pages/handlers.ts:605`] — the handler defaults `limit` to `PUBLIC_SURFACE_PAGE_SIZE_CAP` (50) behind a seven-line rationale: *"splitting ONE drive's record across pages by default would make a transparency page under-report at a glance."* ⚠ But `parsePageParams` (`apps/public/src/lib/pagination.ts:173`) ALWAYS returns a `limit`, defaulting to `PUBLIC_SURFACE_PAGE_SIZE_DEFAULT` = **25**, and `sahyog-vivran.server.ts:138-139` forwards it whenever it is ⛔ not `undefined`. ⇒ a drive with 26–50 confirmed contributors renders 25 names + a "Next" link — ⭐ exactly the split the stated design refuses. ⚠ Both sibling public routes in the same file default to the DEFAULT, ⛔ not the cap, so `:605` is the outlier on both axes. ⇒ **the ambiguity is which layer is wrong**: fix the page to forward `limit` only when the visitor supplied one, fix the handler to 25, or retire the comment. ⛔ A reviewer cannot pick. ⭐⭐ **RULED 2026-09-16 (BigDev) — FIX THE PAGE, ⛔ not the handler:** `[driveToken].astro` forwards `limit` ONLY when the visitor actually supplied one, so the handler's documented default of **50** applies to an unparameterised visit. ⛔ The handler's rationale stands and is ⛔ not retired.
- [x] **[Review][Decision → ROUTED]** **The contributor publication basis is asserted in the matrix but evaluated NOWHERE in code — a REVOKED T&C still publishes a living member's full legal name** [`apps/api/src/modules/public-pages/handlers.ts:1010-1060`; `packages/contracts/public-pages/public-vs-private-matrix.yaml`] — the deceased subject checks a real basis (`NAME_PUBLICATION_AUTHORISED`, which joins `consent_records` and honours `revoked_at`); the contributor subject checks ⛔ nothing — ⛔ not T&C acceptance, ⛔ not its version, ⛔ not revocation. ⭐ The matrix says this is SETTLED under `-160` cl.7 (the member's own accepted membership T&C) and that is a ratified product/legal call ⇒ ⛔ **⛔ not filed as a defect.** ⚠ What is raised is the sub-case the ruling may ⛔ not have contemplated: a member whose `tc_acceptance` is later REVOKED is excluded as a deceased subject but still renders as a contributor, indefinitely, on an edge-cached public page. The enforcing mechanism already exists and is exported in the same file. ⇒ a Panel/counsel question ([[project_dpdpa_counsel_engaged_but_unrecorded]]), ⛔ not a code call. ⭐⭐ **RULED 2026-09-16 (BigDev) — ROUTED TO THE PANEL.** ⛔ No code change taken in this review; the obligation is carried in `deferred-work.md` under this pass's section. ⭐ **ESCALATED:** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-16-11b3b-code-review-three-questions.md` (Q1 = the omission oracle · Q2 = D1(c)'s enforcement · Q3 = the living contributor's basis). ⭐⭐ **RULED 2026-09-16 — `-219` cl.6: OPTION (A), MEMBERSHIP ITSELF IS THE BASIS.** Contributing is a **PUBLIC ACT**; a T&C withdrawal does ⛔ not retract it. ⭐ The matrix citation is **CORRECTED** — `-160` cl.7 does ⛔ not reach a LIVING subject (its cl.4 is *"after death"* throughout) ⇒ cite `-174` cl.1/cl.2 + `-175` for the declaration and form, and `-219` cl.6 for the basis. ⛔ Option (B) declined. ⚠ The counsel's-clause item is ⛔ UNAFFECTED and stays OPEN. ⇒ ⭐ **a MATRIX-TEXT correction is owed; ⛔ no predicate changes.**
- [x] **[Review][Patch] The story is `done` and the committed tree is RED — 3 tests fail at HEAD; the only fix is an UNCOMMITTED file** [`apps/public/tests/sahyog-serves.test.ts:217`] — commit `662ab6a6`'s own group-4 patch hardened `isSahyogVivranResponse` (`apps/public/src/lib/sahyog-vivran.server.ts:283-306`) to REQUIRE `page`/`limit`/`total`/`items`/`deceasedMemberName`/`amountRaisedInr`. ⚠ The committed fixture in `sahyog-serves.test.ts` stubs `json({ drive: vivranDrive(driveStatus) })` — carrying ⛔ none of them ⇒ `bad_response` where the suite asserts `res.ok`. ⭐ **Executed both ways:** reverted to HEAD → `Tests 3 failed | 21 passed`; with the working-tree file → `27 passed`. ⇒ HEAD cannot pass `scripts/ci-local.sh` or CI. ⚠⛔ The file is ⛔ **not in the story's File List at all**, so ⛔ nothing in the record accounts for it. ⭐ Remedy: COMMIT the working-tree file and add it to the File List.
- [x] **[Review][Patch] The per-row `try/catch` AC3 ordered drops the abort-transaction re-throw the precedent it NAMES carries — one DB fault silently truncates a public list of names into a cached 200** [`apps/api/src/modules/public-pages/handlers.ts:1074-1084`] — AC3 names `PoolContributorList`'s pattern; the live precedent `apps/api/src/modules/member-pool/handlers.ts:1203` guards with `if (isAbortedTransaction(err)) throw err;` and explains why at `:1197-1202` (*"Once any statement on this scope tx fails, every later statement returns `25P02`"*). ⚠ `isAbortedTransaction` exists ONLY at `member-pool/handlers.ts:1073`; `public-pages/handlers.ts` ⛔ never references it (grep-verified). ⇒ any statement timeout mid-map aborts the scope tx, every remaining `getMemberKycProfile` throws `25P02`, each is swallowed to `null`, and the handler returns `ok` with a TRUNCATED list beside the full `total`. ⭐⭐ **This surface is uniquely bad at detecting that**, because its own contract normalises the symptom (`sahyog-vivran.ts:660-668`: *"FEWER than N named rows BY DESIGN"*) ⇒ a transient fault is indistinguishable from lawful RTBF omission and is edge-cached at `s-maxage=300`.
- [x] **[Review][Patch] The leak-scan fixture never sees a contributor name — the ONLY full-legal-name field this story added has a VACUOUS PII leg** [`apps/public/tests/integration/public-pages/scrape-test.spec.ts:82-83,1358-1368`] — `sahyogVivranSurfaceFieldIds` derives ids from THREE mappings (`surface-fields.ts:816-826`), but the fixture resolves values through only TWO — it ⛔ never imports `SAHYOG_VIVRAN_CONTRIBUTOR_FIELD_IDS` (grep: zero hits). ⇒ `contributor_name` misses both lookups, `value` falls to `null`, and the scan runs over `<dd></dd>`. ⚠⛔ **This is VERBATIM the failure the fixture's own comment at `:1354-1357` warns about** (*"Looking only in the shell mapping would silently emit `''` … making the leak leg pass over a value it never actually saw"*), re-committed one story later. ⇒ `verdict.piiMatches === []` and the `\d{6,}` naked-PII assertion both pass over a field they never saw.
- [x] **[Review][Patch] A zero-width-only stored name renders a blank name cell / an empty `<li>` — the fix applied to `district` in the SAME returned object was applied to neither name** [`apps/api/src/modules/public-pages/handlers.ts:900` (deceased), `:1072-1073` (contributor)] — `district` at `:1118` carries `.replace(/[\u200b-\u200f\ufeff]/g, '')` with a comment naming this exact class (*"an invisible-only value survives `.trim()` and `.min(1)` and would render the identical blank cell (review finding)"*). ⚠ `String.trim()` does ⛔ not strip U+200B–U+200F. Nothing downstream catches it: the contract is `.min(1)`, and the public validator tests `.length === 0` / `name === ''` — a 1-char invisible string passes all three. ⇒ `<dd><span>​</span></dd>` where a person's name belongs, and an empty bullet for a contributor — ⭐ precisely the announced-omission the row-omission rule forbids.
- [x] **[Review][Patch] An unknown query parameter 404s a REAL, live drive — `?fbclid=…` breaks every shared link** [`apps/public/src/pages/sahyog-vivran/[driveToken].astro:266-280`] — the allowlist is exactly `{page, limit, lang}`; anything else sets `pagingRefused`, folded into the same `{ok:false, reason:'not_found'}` as a bogus token. ⇒ a family shares the drive link on Facebook/WhatsApp, the platform appends `?fbclid=…` or `?utm_source=…`, and every recipient sees "no such drive" for a live drive. ⭐⭐ The remedy does ⛔ NOT weaken the ruled anti-enumeration property: IGNORING (or canonicalising away) an unknown param creates ⛔ no oracle distinguishing *"real drive, bad page"* from *"no such drive"* — only the 404-on-unknown-param does that work needlessly. ⚠ Keep the 404 for a genuinely refused `page`/`limit`; drop it for unknown keys.
- [x] **[Review][Patch] The "Next" link can point PAST the page horizon and land on the page's own 404** [`apps/public/src/pages/sahyog-vivran/[driveToken].astro:340,347`] — `hasNextPage = contributorLimit > 0 && contributorPage * contributorLimit < contributorTotalCount`, with ⛔ no check against `PUBLIC_DIRECTORY_PAGE_HORIZON` (200), which the contract enforces on the NEXT request (`packages/contracts/src/public-pages/sahyog-vivran.ts:640`) and which a refused page collapses into `not_found`. ⇒ a drive with >200 confirmed contributors at `?limit=1&page=200` renders a "Next" to `page=201`; clicking a control the page itself rendered yields "this drive does not exist". ⭐ Clamp `hasNextPage` by the horizon.
- [x] **[Review][Patch] `Math.max(0, …)` guards the SIGN only — a non-integer or `NaN` `fixed_amount` 500s the public page with ⛔ no warning** [`packages/domain/src/pool/sahyog-vivran-read.ts:605-610`] — the block is documented as *"the second line of that defence"* against a 500, citing the absent DB positivity CHECK on `pools.fixed_amount`. ⚠ It says nothing about INTEGRALITY, and `Math.max(0, x)` is transparent to non-integers and returns `NaN` for `NaN`. ⛔ `NaN < 0` is false ⇒ the warn-log ⛔ never fires either. ⇒ `fixed_amount = 100.5` × 3 confirmed → `301.5` → the wire's `.int()` rejects → **500 on the whole public page**, silently. ⭐ `Number.isFinite` + `Math.trunc` costs nothing.
- [x] **[Review][Patch] The deceased-name arm's "omit the NAME, keep the PAGE" guarantee stops at the decrypt — the resolver sits OUTSIDE the `try`, unlike the contributor arm** [`apps/api/src/modules/public-pages/handlers.ts:~928,~977`] — the block commits to *"⛔ Letting this throw would 503 an entire public transparency page over one bad envelope"*, but only `decryptKycField` is inside the `try`; `resolvePublicMemberName` follows the `catch`. ⭐ The contributor arm puts the identical call INSIDE its `try` (`:1072`). ⚠ Separately, the hoisted `resolvePublicNamePresentationMode` is now an unguarded DB read on every request to this page. ⇒ the asymmetry is ⛔ not defensible either way round; move the resolver inside.
- [x] **[Review][Patch] The financial-truth gate's `SCAN_FILES` doc-block still states the rule AC11(b) DELETED, and the remedy it implies is the option AC11(b) REFUSED** [`scripts/sahyog-vivran-financial-truth/check.ts:63,69`] — `:63` still reads *"`renderPath: true` ⇒ rule (3) applies (⛔ no amount operand may even be NAMED)"* and `:69` *"nothing about an amount may reach the wire at this story"*. ⚠ Both are false at HEAD: `lib.ts:112-119` narrowed the ban to `TARGET_OPERANDS` and `amountRaisedInr` now crosses that exact wire. ⭐ AC11(c) was discharged only in the file's TOP header (`:24-39`); the two sentences that define what the `renderPath` flag MEANS were ⛔ not touched. ⇒ `:63` is the sentence a maintainer reads when flagging a new file, and it now implies flipping `renderPath:false` — ⛔ the weaker option AC11(b) explicitly refused. ⭐ Gate itself verified GREEN live.
- [x] **[Review][Patch] AC3's `@twt/ui` clause was never implemented, and Task 7 closed the absence as a PASSED scope fence** [`apps/public/package.json:18-25`] — AC3's heading clause rules the addition an *"ORDINARY DEPENDENCY ADDITION"* (`-154` cl.6); `@twt/ui` is ⛔ absent from `apps/public`'s dependencies. Task 2 deferred it to Task 3 (*"It lands with the contributor list, its first real consumer"*); Task 3 shipped the list and said ⛔ nothing; Task 7 then recorded *"⛔ `@twt/ui` never added"* as one of *"FIVE HELD"* under AC8's fence *"⛔ no `@twt/ui` fence lift BEYOND `apps/public`"*. ⚠⛔ **That fence forbids lifting it BEYOND `apps/public`; it was read as satisfied by never lifting it AT ALL** — an unmet AC3 obligation converted into a green check on a DIFFERENT AC. ⭐⭐ The ENGINEERING call is right and matches [[feedback_no_premature_package]] (AC3 cl.2 permits *"⛔ not consumed at all if that leaves it vacuous"*), and a live in-code fence at `apps/public/src/pages/sahyog.astro:917-919` says the same. ⇒ ⛔ **⛔ no code change is owed — the RECORD is the defect.** Correct closure language is *"Resolved via explicit deferral"*, ⛔ never *"HELD"* ([[feedback_closure_language_precision]]).
- [x] **[Review][Defer] The contributor read takes ⛔ NO as-of instant while the count beside it does — the "fewer rows than the count" invariant can INVERT** [`packages/domain/src/contribution/read.ts:156-187` vs `packages/domain/src/pool/public-read.ts:298-313`] — `handlers.ts:607-611` states *"ONE INSTANT FOR THE WHOLE REQUEST … it binds THREE as-of reads"*; `listConfirmedContributorsForPool` is the FOURTH read on this page and its params are only `{pariwarId, poolId}` — ⛔ no `now`, ⛔ no `occurred_at` predicate, while `CONFIRMED_CONTRIBUTION_COUNT` filters `occurred_at <= now`. ⇒ if the DB clock leads the app clock, or a confirmation lands between `deps.clock()` and the contributor query, the page renders "5 confirmed" beside SIX named rows. Deferred — the producer is SHARED (11b.3 AC9) and threading an as-of instant changes other consumers; ⛔ not 11b.3b's to alter unilaterally.
- [x] **[Review][Defer] Two different numbers render under IDENTICAL copy on one page** [`apps/public/src/pages/sahyog-vivran/[driveToken].astro:157,194`] — `contributorTotal` (the contributor SET SIZE) and `confirmedContributionCount` (the contribution EVENT count) both resolve through `value.contributions_count`, so two numbers the code's own doc-block says *"answer different questions"* and *"⛔ Do ⛔ not reconcile"* both render as "N confirmed". ⚠ **RE-FOUND by two independent layers this pass**, and the as-of item above RAISES its severity: the two can now legitimately disagree. ⭐ Already deferred by the FIRST pass as a copy/product call outside a reviewer's authority — re-affirmed, ⛔ not re-opened.
- [x] **[Review][Defer] The DB read is UNBOUNDED; only the DECRYPT is paged, plus an N+1 profile read per row** [`apps/api/src/modules/public-pages/handlers.ts:950-979`] — the block headlines *"PAGE FIRST, DECRYPT SECOND … the whole anti-fan-out property"*, which is true of the KMS fan-out only. `listConfirmedContributorsForPool` takes ⛔ no `limit`/`offset` — the ENTIRE confirmed set is materialised and then sliced (necessarily, since `total = confirmedContributors.length`), and there is one `getMemberKycProfile` round-trip per rendered row. ⇒ `?page=200&limit=1` still pays the full-set read to render ONE name. Deferred — the shape follows from the ruled pre-omission `total`; changing it is the same Panel question as the omission-oracle item.
- [x] **[Review][Defer] `?limit=50` is a SECOND shared-cache key for byte-identical content, and `page × limit` is ~10,000 cacheable keys per drive, each holding Tier-1 PII** [`apps/public/src/pages/sahyog-vivran/[driveToken].astro:266-276,345`] — the page's own rationale for dropping `page` at page 1 is that a second URL for identical content *"would be a wasted PoP entry re-serving Tier-1 PII under a different key"*, and the unknown-param refusal is justified as preventing *"an UNBOUNDED space of distinct SHARED-cache keys"*. ⚠ The ACCEPTED params undercut both: the default limit IS the cap, so `?limit=50` duplicates the bare URL under a new key, and `page ∈ [1,200] × limit ∈ [1,50]` is a bounded-but-large ~10,000 keys per token at `s-maxage=300`. Deferred — CDN/caching config is ⛔ not in this diff and the remedy (canonicalise, or `no-store` on non-canonical variants) is an infra call.
- [x] **[Review][Defer] AC0's *"Exactly ONE `governance:` commit, carrying ⛔ no code"* is literally false story-wide** — seven `governance(11b.3b):` commits exist; TWO carry production code (`02c6f127` → `handlers.ts` +10 and the integration spec; `7ca84c99` → `handlers.ts` +36). ⭐ AC0's INTENT is satisfied: `0841c2c5` is the first commit on the branch and touches only governance files. ⚠ Recorded because a `governance:` prefix carrying code weakens [[feedback_governance_commits_precede_implementation]] as a reviewable signal. Deferred as an AC-WORDING defect, ⛔ not a build defect.

⭐ **Dismissed as verified non-issues (3):** an ordering-tie duplicate/skip across pages — ⛔ refuted: `packages/domain/src/contribution/read.ts:224-231` sorts on earliest-live `event_version` with `memberId.localeCompare` as the FINAL tie-break only (⭐ ruled: `member_id` is prohibited as the PRIMARY key, ⛔ not as a last-resort tie-break), deterministic and replay-stable; `formatCurrency` throwing at ≥ 9e13 — `pools.fixed_amount` is a PG `integer` (≤ 2.1e9), needing ~42,000 confirmations on one pool ⇒ ⛔ not reachable; and the un-wired abuse counter — ⭐ already investigated, recorded and routed by this story's own Task 7 (AC8) and live in `deferred-work.md`, ⇒ a duplicate of a ratified act, ⛔ not a new finding.

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
  `-179` **cl.2**, cl.3 · `-180` cl.1 · `-181` · **`-189` cl.3, cl.5 / `-195` cl.1** · `-190` cl.1,
  cl.2, **cl.6**, cl.7(b)/(c) · `-191` cl.1, ⛔ **cl.3 SUPERSEDED** · **`-192` cl.1, cl.3 + Consequence 3** · **`-193`** · `-193` cl.3 · **`-204` cl.1, cl.2, cl.3, cl.8** ·
  **`-205` cl.1, cl.2, cl.5** · **`-207` cl.1, cl.2 + Open follow-ups** · `-208` cl.2 ·
  `-209` cl.2, cl.3, cl.4 · `-211` cl.3 · `-214` cl.4(b) · `-160` cl.7 · `-165` cl.2-4 · `-168` **cl.9** ·
  `-169` · `-170` · `-172` · `-136` cl.1, cl.2 · `-145` cl.3 · `-154` cl.6 · `-159` cl.2 · `-132` cl.1
  ⚠⛔ **⛔ CITE BY CLAUSE, ⛔ NOT BY LINE** — the log is newest-first. ⭐ v1's pointers rotted, **and so
  did all of v2.0's** ⇒ this file now holds **ZERO** numeric pointers into `.decision-log.md`,
  `deferred-work.md` or `sprint-status.yaml`, and ⛔ none may be added
  ([[feedback_story_validate_footguns]] item 19).
  ⭐ **`-190` cl.6 and `-189` cl.5 are NEW at v2.1** — they name `amountRaisedInr` and record the rupee
  boundary as crossed; ⛔ v2.0 cited their siblings and dropped exactly these two.
⭐ **`packages/` + `apps/` line cites below were RE-DERIVED at `be0037cc`** and are re-derivable by the
next pass. ⚠ They are ⛔ **not** durable — ⭐ re-diff `packages apps` against the pin every time.

- `packages/contracts/src/public-pages/matrix.ts:394-397`, `:398-476`, `:405-406`, `:407-408`
- `packages/domain/src/pool/public-read.ts:169-172` (the stage-word map), `:252-259`, `:260-261`,
  `:380-397` · ⭐ **the INDEX precedent: `:1129-1134`, `:1135`, `:1192-1194`, `:1222`, `:1224`**
- ⭐ `packages/domain/src/pool/sahyog-vivran-read.ts:496-498` (⛔ the anti-widening fence AC3b amends),
  `:504-510` (⚠ the ternary — ⛔ **not** a usable binding), `:336`
- ⭐ `packages/domain/src/pool/member-drive-detail.ts:376`, `:389`, `:461` ·
  `member-drive-list.ts:331`, `:343`, `:346`, `:387` — two more instances of the ruled shape
- `packages/contracts/src/public-pages/sahyog-vivran.ts:56-58` (⛔ amend), `:60-61` (the fence that
  stands), **`:374-377`** (⛔ amend — the presenter prescription), `:384-386` (the completeness fence)
- ⭐ `packages/ui/src/contribution-list/view-model.ts:44-46`, **`:54-57`** (⛔ amend) ·
  `presenter.ts:65-80`, `:81-98` · `i18n-keys.ts:32-43`
- ⭐ `scripts/sahyog-vivran-financial-truth/lib.ts:112`, `:181-195` · `check.ts:12-22`, `:46`, `:49-69`,
  `:181-187` · wired at `.github/workflows/ci.yml:745-774` and `scripts/ci-local.sh:82`
- ⭐ `packages/i18n/tests/sahyog-shared-dark-copy.test.ts:227-249`, `:586-622`, `:605-609` ·
  `packages/i18n/locales/{en,hi}/contribution.json:30-39` · `…/sahyog-shared.json` (`stage.*`)
- `packages/domain/src/kyc/public-name.ts:62`, `:73`, `:86`, `:98`
- `packages/domain/src/notifications/pool-identity.ts:112-137`, `:148-151`, `:201`
- `apps/api/src/modules/public-pages/handlers.ts:62`, `:188-189`, `:201`, `:516-526`, **`:528-530`**
- ⭐ `apps/api/src/modules/kyc/bounded-decrypt.ts:28`, `:38-41`, `:46` *(⚠ v2.0 gave ⛔ no path)*
- `apps/api/src/modules/public-pages/sahyog-vivran-controls.ts:56-60`
- `apps/api/tests/integration/login-wall.spec.ts:247` (⚠ stale "SIX"), `:425`, `:429-435`, `:445-448`
- ⭐ `apps/api/src/modules/member-pool/handlers.ts:621`, `:1047`, `:1229`, `:1236` (the sentinel) ·
  **`:508`**, `:489-496`, `:556` (the halved bound) · `packages/domain/src/member/anonymize.ts:70`,
  `:107` · `packages/domain/src/member/read.ts:183-187`
- `apps/public/src/lib/members-render.ts:101` (⭐ the real `-136` cl.2 quote; ⛔ **not** `sahyog-render.ts:213`)
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts:1481`, `:1553`, `:1562`; `packages/contracts/tests/public-pages.test.ts:522`
- `apps/public/tests/sahyog-vivran-render.test.ts:109`; `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts:385`
- ⭐ `_bmad-output/planning-artifacts/ux-design-specification.md` — **RE-VERIFIED at `be0037cc`**
  (⛔ unmoved since the pin): `:1298` (heading) · **`:1311-1335`** (the canonical block; ⚠ ⛔ not
  `-1330`) · `:1158`+`:1160` (layout primitive) · `:1330` (the four restatement anchors) ·
  `:1331` (the six out-of-scope referring sites) · ⛔ **`:1334` STALE**, `:1335` **wrong story** ·
  `:1327` (`-132` R1/R7 + `-133` cl.1). ⚠⛔ its `:1313` pointer to `deferred-work.md:296-313` is ROTTED
- `deferred-work.md` — ⭐ **by item, ⛔ never by line**: the **D10-ratification** item (⚠ ⛔ NOT the VPA
  `(e)`) · the **counsel's-written-clause** item · the **amount-raised** item · the **Trap-10
  divergence** item · **11b.1's item (f)** — *UX-spec Sahyog List column inventory (`D5(a)`)*, ⚠ ⛔ NOT
  11b.3a's `(f)` (*post-masking authenticated-member presentation*) · **`D5-subject (i)`**
- `epics.md:3156`, `:3257` (⭐ the two name-form annotations, re-read at `be0037cc`), `:5045`
  (⚠ a **different** item — 11b.1 `D5`), `:5152`

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) — Task 0 (governance) and Task 1b (AC11 b/c/d/e), 2026-09-15.

### Debug Log References

⭐ **REVERT-SANITY ON THE NARROWED GATE, RUN ON A REAL RENDER-PATH FILE, ⛔ not only on fixtures** —
`check.ts`'s own header asks for this to be recorded here.
1. ⭐ `pnpm sahyog-vivran-financial-truth:test` → **20/20 pass**, including the two PRE-EXISTING rule-3
   fixtures (⭐ both still red on their planted defects) and **three NEW** ones (see below).
2. ⭐ `pnpm sahyog-vivran-financial-truth:check` → **passes** on the live tree.
3. ⛔⛔ **TEETH PROVEN:** planted `const __plantedTotal = confirmedContributionCount * row.fixedAmount;`
   into `apps/public/src/lib/sahyog-vivran-render.ts` ⇒ gate **FAILED with 2 findings** at `:435` —
   ⭐ one from the **structural** derivation check, one from the **`fixedAmount` name** ban. ⇒ ⭐ both
   arms of the narrowed rule are live.
4. ⭐ Reverted the plant ⇒ gate **passes** again; ⛔ working tree clean of it.

⭐⭐ **THE `₹₹` DEFECT — HOW IT WAS FOUND, AND THE REVERT-SANITY ON ITS FIX (2026-09-15, unit 1
re-review).** ⛔ It was ⛔ NOT found by a failing test; every test was green.
1. ⛔ Read `value.amount_raised` (`"₹{amount} raised"`) beside the render site's
   `formatCurrency(amountInr, 'en')`, and `currency.ts:65` returns `` `₹ ${digits}` `` ⇒ the symbol
   is in the value ALREADY.
2. ⭐ **EXECUTED, ⛔ not reasoned** — a throwaway probe through the REAL `t()` and the REAL catalog:
   `en: "₹₹ 1,37,000 raised"` · `hi: "₹₹ 1,37,000 एकत्र"`. ⛔ Probe deleted; tree clean.
3. ⭐ **TEETH PROVEN ON THE FIX:** re-planted `"₹{amount} raised"` in the en locale ⇒ the new
   `sahyog-vivran-copy.test.ts` leg goes **RED**; reverted ⇒ **59/59 green**.

⭐⭐ **UNIT 2 — A STALE ASSERTION THAT WAS ALREADY RED AND NOBODY KNEW.**
⚠⛔ `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts` is `describe.skipIf(!hasDatabase)`
⇒ it **SKIPS SILENTLY** in a `turbo test` run with ⛔ no `DATABASE_URL`, which is how unit 1 shipped a
key-set assertion that ⛔ did ⛔ not list `amountRaisedInr`. ⭐ Run against the live DB at `:5433` it
failed on the FIRST try. ⇒ ⭐ **a DB-gated spec is ⛔ NOT covered by the green `turbo test` line** —
⛔ do ⛔ not read one as evidence for the other ([[project_known_livedb_test_failures]]).
⭐ Amended for BOTH units and re-run with the live DB: **34/34**.

### Completion Notes List

- ✅ **Task 0 (AC0, AC10)** — one `governance:` commit, ⛔ no code: `#decision-2026-09-15-218`
  (`D-percentage`), AC10's compliance statement for both data classes, story D's Trap-10
  back-reference (**discharged**), `-182`'s forward pointer, and the `fundingOutcome` guard **routed**.
- ✅ **Task 1b (AC11 b/c/d/e)** — rule (3) **NARROWED, ⛔ never deleted**: `TARGET_OPERANDS` keeps the
  target and its factors banned by NAME; `RULED_AMOUNT_FIELD` (`amountRaisedInr`) is **permitted to be
  named**; `isAmountDerivation` catches the D1(c) product **BY SHAPE**, so it is caught under ⛔ any
  local spelling — ⭐ strictly harder to evade than the vocabulary ban it replaces.
  ⚠⛔ **⛔ The gate's own suggested remedy was ⛔ NOT taken and the reason is recorded in `check.ts`:**
  it proposed *"the amount comes from the SHIPPED presenter"*; ⛔ that presenter takes **`rosterSize`
  and `fixedAmount` as INPUTS**, which `-204` cl.3/cl.8 reserve ⇒ it would put both factors on a public
  wire. ⭐ The amount is taken **server-side** from `deliveredTotal` instead.
- ✅ **Four artefacts amended BY NAME** (AC11 c/d/e), each carrying its **reason**, ⛔ none rewritten:
  `contracts/src/public-pages/sahyog-vivran.ts` · `deferred-work.md`'s amount-raised item ·
  `scripts/sahyog-vivran-financial-truth/check.ts` · `packages/ui/src/contribution-list/view-model.ts`
  · `ux-design-specification.md`'s canonical block.
- ⚠⛔ **AC11(a) re-ordered** — it depends on files **Task 2** creates, so it moved to Task 2. ⭐ Verified
  a **no-op** for the files that already exist (all three are already `renderPath: true`).
- ✅ **Task 1 (AC2)** — two field declarations + two allowlist pairs, one commit. ⭐ Five shipped
  assertions inverted and were **amended by name**, ⛔ none deleted:
  `public-pages-matrix-schema.test.ts`'s negative control (**re-planted** onto `in-memoriam`, whose
  fence still stands, ⭐ plus a new POSITIVE leg proving the declared pair parses) ·
  `public-pages.test.ts`'s six-entry identity snapshot ·
  `scrape-test.spec.ts`'s Tier-1 count, its per-field attribution loop (⭐ re-shaped from a blanket
  single-decision check to a **per-field** map, so three rulings ⛔ cannot dilute it), and its
  *"NO SECOND Tier-1 entry"* leg (⭐ re-pointed at what it was really protecting — that the names
  arrived **WITH** attributed exception blocks) · and `scrape-test.spec.ts`'s undeclared-id negative
  control, **re-planted** onto `donation_id`, a UX-spec column with ⛔ no substrate anywhere, so
  ⛔ no future story can declare it out from under the control.
  ⚠⛔ **`escalation_count` UNCHANGED at 1** — ⭐ FOUND in a shipped test's own reasoning, ⛔ not ruled.
- ⭐ **Task 2, unit 1 of 2 (AC3b)** — the ruled rupee figure, end to end. ⭐ The domain binding is
  **clamped and warn-logged**, hoisted above the `fundingOutcome` ternary and **used twice**, so
  `amountRaisedInr` and `classifyCycleOutcome`'s `deliveredTotal` are provably ONE figure.
  ⭐ The `:496-498` anti-widening fence is **NARROWED to `expectedTotal` only**, ⛔ not lifted — लक्ष्य
  stays quarantined. ⭐ Four stale artefacts amended **by name** (the DTO's *"11b.3b will need
  `rosterSize` and `fixedAmount`"* invitation **withdrawn**, the Astro header's *"⛔ NO RUPEE FIGURE"*
  **discharged**, and two shipped fences **narrowed** rather than deleted).
  ⚠⛔ **A non-obvious interaction, recorded:** Indian digit grouping is what keeps a rupee figure
  structurally unable to trip the anti-account-number control (`/\d{6,}/`). ⛔ A future trip there is
  ⛔ never fixed by weakening that control.
- ⚠⛔⛔ **UNIT 1 WAS RE-REVIEWED BEFORE UNIT 2 BEGAN, AND IT CARRIED A SHIPPED DEFECT — ⛔ RECORDED,
  ⛔ NOT QUIETLY REPAIRED.** `value.amount_raised` was minted as **`"₹{amount} raised"`** while the
  render site passes `formatCurrency(amountInr, 'en')`, whose output ALREADY carries the symbol, the
  house space and the Indian grouping ⇒ the page rendered **`₹₹ 1,37,000 raised`**, in **BOTH**
  locales, from the first commit of the figure.
  ⭐ **IT IS ⛔ NOT A NEW CLASS:** `sahyog-shared`'s `$comment.message_block` records it in terms —
  *"the literal ₹ is DROPPED because `{amount}` arrives ALREADY FORMATTED and carries its own ⇒ a
  literal ₹ would ship `₹₹`"* — and its `index_line.*` variants, same ratification and same day, carry
  ⛔ no literal ₹ for exactly this reason. ⇒ the figure now takes that shipped form.
  ⚠⛔⛔ **AND THE MORE USEFUL HALF IS WHY ⛔ NOTHING CAUGHT IT.** Both suites stubbed
  `labels.amountRaised` with a HAND-WRITTEN `` `₹${a.toLocaleString('en-IN')} raised` ``, bypassing
  `t()` **and** `formatCurrency` at once — ⭐ the same fixture blind spot as the 11a.2 `{{max}}` vs
  `{max}` defect that threw on every `/members` request, re-run on a new key. ⚠ And
  `sahyog-vivran-copy.test.ts` — the file that exists **precisely** to close that gap (*"the 11a.2
  defect lived in the gap between those two files, so both must exist"*) — was ⛔ never given the key.
  ⇒ ⭐ **the durable half of the fix is the third part:** both stubs now **CALL** `formatCurrency`
  rather than transcribing it (the transcription was wrong TWICE — it also dropped the house space),
  and the copy test gained the real-`t()` leg for both locales. ⛔ AC7 still owns the full a11y+i18n
  obligation at **Task 6**; this is the regression leg for a shipped defect, ⛔ not that AC's discharge.
- ⭐ **Task 2, unit 2 of 2 (AC1, AC3 deceased arm)** — the deceased member's name, end to end.
  ⭐ `NAME_PUBLICATION_AUTHORISED` is **EXPORTED from `public-read.ts`, ⛔ never copied**: it is a
  fail-closed authorisation gate with four independently subtle legs (the one-directional
  `uuid → text` cast, three explicit `pariwar_id` scopes, the validity window, the clause-id match),
  and a fork would drift **silently** — ⛔ no error, ⛔ no failing test, and the failure mode is a name
  rendering on an authority that does ⛔ not exist. ⚠ It correlates by BARE table name ⇒ ⛔ neither
  consumer may alias `pools` or `claims`; recorded at the export.
  ⭐ The `member_kyc_profiles` join is **LEFT, ⛔ never INNER** — an absent profile must remove a NAME,
  ⛔ never a DRIVE. ⭐ The basis is checked **BEFORE** the decrypt ⇒ a drive with ⛔ no basis costs
  **ZERO** KMS calls, which is every drive today. ⭐ ONE decrypt for the whole page ⇒ it rides ⛔ no
  bounded map and needs none (the list shapes are the index's and Task 3's).
  ⭐ **THE FORM RESOLVES THROUGH `resolvePublicMemberName(mode, storedName)`** under the Pariwar's
  STORED mode — ⛔ never a literal (`-136` cl.1), ⛔ never `resolvePoolIdentity` and ⛔ never
  `splitFirstNameLastInitial` (both hard-code the SHIELDED form, on the one surface ruled FULL NAME,
  ⛔ with every other test still green). ⭐ Proven by a leg that flips the stored mode and asserts the
  rendered form CHANGES — ⛔ the only leg that catches a hard-coded literal.
  ⭐ **THE OMISSION ARM IS THE DECEASED MEMBER'S, ⛔ not the contributor's:** an unrenderable name
  **omits the NAME, ⛔ never the page**, via **`.trim() || null`, ⛔ never `=== ''`** (the 2026-09-08
  narrowing already fixed on the sibling — ⛔ re-introducing it is a CLOSED defect). ⚠ A **MONONYM**
  under `shielded_name` lands in that same `null`, and ⛔ there is ⛔ no fall-through to `firstName`:
  `public-name.ts` records that for a mononym it returns the ENTIRE stored legal name.
  ⭐ **AC1's INERT STATE IS PRESERVED AND ⭐ PROVEN END TO END, ⛔ not asserted:** the fixture plants a
  REAL Tier-1 ciphertext, the read SELECTS it, `-173` AUTHORISES it — and the name still does ⛔ not
  render, because ⛔ no `clause_versions` row satisfies the basis. ⛔⛔ ⛔ No placeholder row was seeded
  anywhere. ⚠ The positive arm is proven in a test transaction so the gate is ⛔ not vacuous —
  ⛔ *"the name never renders"* passes identically for a surface that could ⛔ never render one.
- ⚠⛔ **A STALE ASSERTION FROM UNIT 1, FOUND AND FIXED AT UNIT 2 — ⛔ RECORDED, ⛔ not absorbed.** The
  API integration spec's EXACT-key-set leg never gained `amountRaisedInr`, and it went unnoticed
  because the whole `describe` is `skipIf(!hasDatabase)` ⇒ **it skips silently in `turbo test`.**
  ⇒ ⭐ **a DB-gated spec is ⛔ NOT covered by the green `turbo test` line.** Amended for both units
  (the key set, the rupee fence narrowed to the FACTORS, and a new `-218` cl.4 comparison fence on the
  raw body) and re-run against the live DB: **34/34**.
  ⭐⭐ **AND ITS `Rajesh` / `Sharma` LEGS DID ⛔ NOT GO STALE — THEY BECAME THE SHARPEST ASSERTION IN
  THE STORY.** They now prove the inert state end to end, and the comment says so: ⛔ if either ever
  goes red it means a publication basis became satisfiable — a GOVERNANCE event, ⛔ never a test fix.
- ⚠⛔ **ONE EXPECTATION I WROTE WAS WRONG AND THE CODE WAS RIGHT** — the shielded-form leg first
  asserted `Rajesh K.`; `splitFirstNameLastInitial` takes the **LAST** token's initial, so it is
  `Rajesh S.`. ⭐ Corrected against what the function DOES, ⛔ not what a three-token name looks like
  it should do, and the reason is recorded at the leg.
- ⭐ **Task 3 (AC4; AC3's contributor arm)** — the confirmed contributor list, end to end.
  ⭐ **THE PRODUCER IS THE SHARED ONE** (`listConfirmedContributorsForPool`), so the RULED ordering —
  the **earliest LIVE confirmation's `event_version`**, ⛔ never `member_id` — is ⛔ not re-implemented
  and cannot fork from the member surface ([[project_confirmed_contributor_read_is_ordered]]).
  ⭐ **PAGE FIRST, DECRYPT SECOND** — the whole anti-fan-out property: slicing before the map bounds
  the Tier-1 decrypts to `limit` (≤ 50) instead of to the pool roster. ⭐ The **FULL**
  `DIRECTORY_DECRYPT_CONCURRENCY`, ⛔ not the halved bound — that halving exists for a surface with
  TWO decrypts per row, and a contributor row here is ONE.
  ⭐ **THE CATCH IS INSIDE `fn`** — `mapWithConcurrency` propagates a rejection and stops every
  worker, so one bad row would otherwise take the whole page down.
  ⭐ **THE OMISSION UNIT IS THE ROW** (the inverse of the deceased member's), and the ordering
  survives it because `mapWithConcurrency` writes at the INPUT index, ⛔ never completion order.
  ⛔⛔ ⛔ No amount, ⛔ no rank, ⛔ no row key — `.strict()` over a single `name` makes all three a
  PARSE ERROR rather than a convention, and the row's key set is asserted at three layers.
- ⭐ **THE CONTROL SET IS SEVEN, AND THE RESTORATION WAS THE POINT.** Ordinals 2 and 3 were recorded
  as *"structurally N/A"* **with an explicit expiry naming this story**; the expiry fired, and
  `sahyog-vivran-controls.ts`, `routes.ts`'s header, the matrix's `paginated` flag and **four**
  `login-wall.spec.ts` assertions all moved **BY NAME** in one commit.
  ⚠⛔ **SEVEN, ⛔ NOT THE "SIX" THREE SHIPPED DOCUMENTS PREDICTED** — that arithmetic was written when
  the set held FOUR, and 11b.10 added ordinal 7 without re-doing it. ⭐ The count is DERIVED from the
  list, ⛔ never carried forward as a word — which is the defect those documents record having had.
  ⭐ The absence legs (`.not.toContain(2)` / `(3)`) were **INVERTED, ⛔ not deleted**: they existed so
  the restoration *"cannot be forgotten silently"*, and a gapless `[1..7]` assertion was added.
- ⭐ **`items`, ⛔ NOT `contributors`, AND THE OLD INSTRUCTION'S OWN REASONING IS WHY.** The contract
  forbade an `items` key because Story 1.14's forced-pagination guard would then see *"an
  **UNPAGINATED** single-item route"* as an unbounded collection. ⭐ The route is PAGINATED now with
  both bounds declared ⇒ the guard becomes an ASSET, and ⛔ naming the array `contributors` would make
  this route INVISIBLE to it — the same mistake in the other direction.
- ⚠⛔⛔ **AC5's ERASURE BACKSTOP WAS PULLED FORWARD INTO TASK 3 — ⛔ RECORDED, ⛔ not done silently.**
  The story sequences the `ANONYMIZED_SENTINEL` check into **Task 4**. ⛔ Shipping the rows without it
  renders the literal **`[anonymized]`** where a person's name belongs, on an unauthenticated
  edge-cached page, for as long as Task 4 takes — `anonymizeMember` overwrites the ciphertext IN
  PLACE and RETAINS the row, so the decrypt SUCCEEDS and an empty-name guard does ⛔ not catch it.
  ⇒ ⭐ the check lands with the rows it protects, with its own leg proving the erased contributor is
  **absent entirely AND still counts** (`-169` cl.4). ⛔ **Task 4 still owns the rest of AC5.**
- ⭐ **Task 4 (AC5)** — ⭐ **the act was a RECORD, and it was overdue by thirteen days.**
  `#decision-2026-09-02-177` **cl.3** re-pointed the Story 8.3 `keyExtractor` trigger from *"reused
  for the Epic 11b public render"* to *"the first VIRTUALIZED render of a multi-pool contributor
  list"* — and said in terms that 11b.3b's AC required the re-pointing be explicit and cite its
  ruling. ⚠⛔ **THE RULING EXISTED; THE RECORD DID ⛔ NOT.** `deferred-work.md` still carried the OLD
  trigger, and *"virtualized"* appeared in ⛔ no entry in that file.
  ⇒ ⛔⛔ **THE STAKE IS ⛔ NOT TIDINESS: THIS STORY *IS* THE EPIC 11b PUBLIC RENDER**, so the un-recorded
  entry read as *"trigger fired, nobody acted"* the moment this merged. ⭐ It has ⛔ not fired — ⛔ not
  virtualized (Astro SSR has ⛔ no reconciler and ⛔ no key at all) and ⛔ not multi-pool (ONE drive's
  roster, the scale the deferral's own ground calls fine).
  ⭐ **AND THIS STORY MAKES THE BLOCKER *MORE* TRUE, ⛔ not less:** *"the PII-shielded shape carries no
  stable per-member identifier"* — the public row carries **EXACTLY ONE FIELD**, `.strict()`-enforced.
  ⭐ **11b.2b's re-affirmation block is SUPERSEDED ON ITS FORWARD-LOOKING HALF, ⛔ kept verbatim:** its
  *"Story 11b.3 is the public host and the real re-trigger, and it is `backlog`"* is doubly false —
  `11b-3` is `done` and ⛔ did ⛔ not build the render (the D6(b) split moved it here), and `-177` cl.3
  moved the trigger **off the public render entirely**. ⭐ Its backward-looking half STANDS.
  ⭐ **11b.15's stable-key FlashList is RECORDED so `D10-rowkey`(a) is ⛔ not misread** as *"this repo
  never keys FlashLists"*: `keyExtractor={(item) => item.publicToken}` is keyed **PER-DRIVE** on an
  address that surface already publishes — ⛔ not a precedent for a per-CONTRIBUTOR key, because the
  contributor list has ⛔ no such identifier to reach for, which is the blocker itself.
- ⭐ **Task 5 (AC6)** — the buildable inventory, written at the canonical section and cross-referenced
  from **all four** restatement anchors (⛔ annotating only `:1158` is what AC6 forbids by name).
  ⭐⭐ **THE SHARPEST FINDING IS ONE AC6 DID ⛔ NOT ANTICIPATE: THE UNBUILDABLE PART IS THE *ROW GRAIN*,
  ⛔ NOT THE COLUMN COUNT.** A row carrying `Donor Name` **and** `Late Teacher` **and** `Pool` **and**
  `Date` is one contribution joined to its drive — ⛔ and the public wire carries ⛔ no per-contribution
  identifier, ⛔ no per-contribution date and ⛔ no per-contributor amount. ⇒ the five buildable columns
  ⛔ **cannot be assembled into a single row of that table** even though each exists separately. ⭐ The
  table was **SPLIT ACROSS TWO SURFACES BY GRAIN** (`/sahyog` per DRIVE, `/sahyog-vivran` per
  CONTRIBUTOR), and that split is structural.
  ⭐ **AND A SECOND FINDING THE 2026-08-30 PASS MISSED:** `<ContributionListMobileRow>`'s **primary
  line** assumes a per-contributor **₹ amount**, which is **REFUSED BY RULING** (11b.1 AC5's
  anti-leaderboard clause; `D10-rowkey`(a)) — ⛔ **not** merely unbuilt. That pass flagged only the
  identity/metadata line's three identifiers. ⇒ ⛔ no virtualization budget may be sized against it.
  ⚠⛔ **AND THE REAL DATA TEST'S RE-POSING NEEDED A CORRECTION BEFORE USE** — it lists *"first-name +
  last-initial"* among *"the fields that DO exist"*. ⛔ That is the **MEMBER** form; `-174`/`-175` ruled
  the **public** contributor name at the **FULL NAME**, which collides **differently** ⇒ a fixture built
  on the shielded form would measure the wrong surface.
  ⭐ **11b.1's item (f) is DISCHARGED, ⛔ not "closed"** — recorded **at that item** (⚠ ⛔ not 11b.3a's
  `(f)`), together with the correction that it was ⛔ never `11b-3`'s: that story is `done` and ⛔ did
  ⛔ not author it. ⛔ Its other three bullets stay open, and the *"name FORM stays UNRULED"* one is
  marked **SPENT** — ⚠ with the note that the three `epics.md` lines are ⛔ not wrong about the MEMBER
  surface, they lack a **surface qualifier**.
  ⚠⛔ **FOUR OF AC6's FIVE ANCHOR CITES HAD ROTTED** — re-derived and recorded, ⛔ not patched into the
  ratified entries ([[feedback_supersede_never_reinterpret]]).
- ⭐ **Task 6 (AC7)** — family 13 in its **WEB** form, the real-`t()` legs, and the completeness fence.
  ⚠⛔⛔ **THE CHECKLIST DOES ⛔ NOT TRANSLITERATE, AND SAYING SO IS HALF THE WORK.** Family 13 is
  written for React Native — `accessible={true}` + `accessibilityRole` + a sibling-of-a-labelled-
  container rule. ⛔ On the web there is ⛔ no `accessibilityRole`: **the semantic element IS the
  role**, and `role="list"` on a `<ul>` adds nothing while a typo in it silently REMOVES the
  semantics the element already had. ⇒ ⭐ the web form of the same three checks is **real ELEMENT ·
  real NAME · real STRUCTURE**, and the test asserts the redundant roles are ABSENT.
  ⚠⛔ **WRITING THE TEST FOUND TWO DEFECTS IN MY OWN TASK-3 MARKUP** — ⛔ recorded, ⛔ not quietly
  fixed: the paging `<nav>` was labelled `contributorsHeader`, so a screen reader announced a
  NAVIGATION landmark called *"Confirmed contributions"* — naming the SECTION rather than the control
  and colliding with the `<h2>` two elements up; and the section had ⛔ no accessible name at all.
  ⭐ Both fixed, and both now have a leg. ⭐ `pagination.label` is the sibling `/sahyog`'s own answer,
  reused rather than invented.
  ⭐ **THE NEGATIVE HALF IS THE ONE THAT MATTERS** in all three i18n legs: the `contributor_list.*`
  keys **THROW** from `sahyog-vivran` (⛔ nobody copied them into a second home), the `stage.*` words
  **THROW** from `sahyog-vivran` and resolve from `sahyog-shared`, and `stage.settled` exists in ⛔ no
  namespace at all. ⛔ A positive-only leg would pass on a page that had minted its own copies.
  ⚠⛔ **AND ONE FENCE WAS DELIBERATELY ⛔ NOT WRITTEN.** AC7 names the repo-wide `sahyog-shared`
  dark-copy fence; ⭐ I **verified its walker already covers this file** (`SCAN_ROOTS =
  ['apps','packages']`) rather than adding a local copy — a second scanner over the same ground proves
  nothing and rots independently ([[feedback_gate_scope_semantic_coverage]]).
- ⚠⛔⛔ **PARTIAL ON TASK 7 (AC8) — THE `evaluateDirectoryAbuse` QUESTION IS INVESTIGATED AND ROUTED.**
  ⭐ Determined from the evaluator's **actual semantics and the rules file's own scope**, ⛔ not from the
  stale skip comment — which was found **FALSE ON BOTH HALVES** and is amended in place as a record.
  ⭐ **THE RULES FILE ALREADY REACHES THIS ROUTE:** it describes *"an unauthenticated, paginated public
  collection"*, ⛔ *"not the Member Directory specifically"* — and after Task 3 that is exactly what
  this is. ⭐ **All four ACTIVE rules have a subject**, the depth ones for a ⛔ non-obvious reason:
  `limit` goes down to **1**, so a 50-contributor drive is **50 pages**. ⚠⛔ **I had first reasoned they
  were structurally vacuous and that was WRONG** — caught by checking the bound rather than assuming it.
  ⛔⛔ **BUT IT IS STILL ⛔ NOT WIRED, ON TWO GOVERNANCE GROUNDS, ⛔ neither a shape problem:**
  **(1)** the file's own `district_query_volume` precedent — written by 11b.1 about the last rule whose
  applicability changed — rules that this is *"a REAL change … ⛔ not a status flip"* needing a
  **per-SURFACE** threshold and its **own planted control**. ⚠ And here the directory's threshold misses
  by a mile in the **wrong direction**: `high_volume_lookups` is 60 req/60 s, while a harvester pulling
  **one drive per request** at 59/min takes **~2,950 full legal names a minute** and ⛔ never fires ⇒
  wiring it as-is would ship a counter that **reports green through the abuse it is named for**.
  **(2)** ⭐⭐ **THE SHARPER HALF: `2026-09-02-183` is TRUSTEE-RATIFIED, and its subject is *"a
  Tier-1-bearing SINGLE-ITEM GET"*** — a judgement 11b.3a's AC2 reserves to the **Panel**, *"⛔ not a
  tuning knob — in either direction."* ⚠⛔ **This route is ⛔ no longer a single-item GET.** ⇒ the ruling
  **STANDS and is ⛔ not reopened**, ⛔ but the thing it was made about changed shape, and re-posing it is
  a **Panel act** — ⛔ a dev picking a threshold would be making it by side effect.
  ⭐ **ROUTED with a three-way trigger** (a Panel routing note re-posing `-183`; any story threading a
  new dimension into the evaluator; edge configuration), and ⛔ explicitly **⛔ NOT** *"a reviewer
  noticing the route is uninstrumented"* — ⭐ that is the item.
  ⛔ **Task 7's other obligations remain OPEN.**
- ⭐ **Task 7's REMAINING THREE OBLIGATIONS — CLOSED.** ⚠⛔ **AND TWO OF THE THREE WERE FOUND BY
  CHECKING, ⛔ not by reading the AC:** the amount-raised item's own amendment named a condition
  (*"closes when Task 2 ships the field"*) that had **since been met** and nobody had returned to it;
  and the `11b-20` record existed **⛔ only inside AC8's prose** — ⛔ in ⛔ no artefact `11b-20` will read.
  ⭐ **THE `11b-20` RECORD GAINED A THIRD ASYMMETRY AC8 DOES ⛔ NOT NAME**, and it is the one most likely
  to mis-size that story's copy: ⛔ the AMOUNT is unconditional, ⛔ the DECEASED NAME is gated on the
  pinned clause — ⭐ and the **CONTRIBUTOR NAMES render TODAY**, because the contributor predicate has
  ⛔ no clause gate anywhere in the code. ⇒ ⛔ the page is ⛔ not "dark" on merge.
  ⭐ **AND THE FAILURE MODE IS NAMED WITH IT:** `t()` **THROWS** on an unsupplied token and
  `message_block.*` is written for a PAGE ⇒ a name token `11b-20` assumes is supplied is **a 500 on the
  WHOLE PAGE**, ⛔ not a blank line. ⭐ B's `zero_line.*` variant split is the shipped answer.
  ⭐ **Counsel's-clause trigger SHARPENED, ⛔ not merely restated:** delivery alone does ⛔ **not** fire it
  — the gate keys on the **PIN**, so an un-pinned clause still renders nothing.
- ⭐ **Task 8 (AC9)** — a **verify-and-record** pass, ⛔ not new work: all five of AC9's legs inverted as
  they landed across Tasks 1-3, and each was **re-verified live** rather than trusted from a note.
  ⚠⛔⛔ **THE FINDING IS ABOUT THE AC ITSELF: its count was low by more than 4×** — **22** test-leg
  amendments across **seven** files, against AC9's *"five"*. ⭐ Its **LIST** was right about every entry
  it named; ⛔ its **NUMBER** is what a reviewer would have stopped at. ⇒ ⭐ **the same defect class this
  story spent five tasks finding in other people's artefacts, sitting in its own AC.**
  ⭐ **AND *"a negative control"* WAS THREE** — `donation_id`, `verifierName`, `in-memoriam` — each
  re-planted onto a subject ⛔ no future story can declare away, which is the half that matters: a
  control re-planted onto something a sibling is about to declare goes green for the wrong reason.
  ✅ **AC9's real prohibition was checked MECHANICALLY, ⛔ not asserted:** 15 `it(` lines removed, 49
  added, and ⭐ **all 15 are renames with live successors** ⇒ ⛔ nothing was deleted quietly.
  ⭐ **Recorded for the next AC author:** ⛔ do ⛔ not write *"N shipped tests invert"* — name what you
  know and add *"and any other leg the change inverts"*. ⭐ The count is discovered by the build,
  ⛔ never known at authoring time. ⚠ AC9 is **PARTLY** discharged — ⭐ **three** of its five inverted
  tests plus **both** negative controls are now amended BY NAME (the render layer's rupee fence at
  unit 1; the contracts person leg, the `member-drive-detail-field-floor` exclusion (b) and the
  render test's UN-RULED-person leg at unit 2; and the render test's own negative control
  **re-planted onto `verifierName`**, which ⛔ nobody has ruled at any tier so ⛔ no future story can
  declare it out from under the control). ⛔ `scrape-test.spec.ts`'s `paginated: false → true` leg
  stays OPEN — it depends on **Task 3**'s contributor list.

### File List

⚠⛔⛔ **`apps/public/tests/sahyog-serves.test.ts` WAS MISSING FROM THIS LIST ENTIRELY** (Review
finding, 2026-09-16 second pass) — and it was ⛔ not merely unlisted, it was **UNCOMMITTED**, while
the row had already moved to `done`. ⇒ HEAD (`662ab6a6`) ran **3 failed / 21 passed** on that file
and could ⛔ not have passed `scripts/ci-local.sh`. ⭐ Listed now:

- `apps/public/tests/sahyog-serves.test.ts` — the `vivranDrive` fixture given this story's TWO
  drive-level fields (`deceasedMemberName`, `amountRaisedInr`) and a new `vivranEnvelope` carrying
  the paginated contributor shape (`items`/`page`/`limit`/`total`) ALONGSIDE `drive`, ⛔ never inside
  it. ⚠ Required because `662ab6a6`'s own review patch made all six fields HARD requirements in
  `isSahyogVivranResponse` — ⛔ the fixture had modelled ⛔ none of them, which is what masked the
  validator never checking them at all.
- `scripts/sahyog-vivran-financial-truth/lib.ts` — rule (3) narrowed (`TARGET_OPERANDS`,
  `RULED_AMOUNT_FIELD`, `isAmountDerivation`, `namedOperand`)
- `scripts/sahyog-vivran-financial-truth/lib.test.ts` — 3 new fixtures
- `scripts/sahyog-vivran-financial-truth/check.ts` — scope-tax header amended; summary line corrected
- `packages/contracts/src/public-pages/sahyog-vivran.ts` — presenter-mechanism doc-block amended
- `packages/ui/src/contribution-list/view-model.ts` — stale *"form is UNRULED"* doc-block amended
- `_bmad-output/implementation-artifacts/deferred-work.md` — amount-raised item amended
- `_bmad-output/planning-artifacts/ux-design-specification.md` — `:1334`/`:1335` amended
- **Task 8 (AC9):** `_bmad-output/implementation-artifacts/deferred-work.md` (the verify-and-record
  pass; ⛔ **no code and no test changed** — all five legs had already inverted across Tasks 1-3)
- **Task 7 (AC8):** `_bmad-output/implementation-artifacts/deferred-work.md` — counsel's-clause item
  **carried** with a sharpened trigger · the amount-raised item **discharged** and its interim-asymmetry
  carve-out **retired** · the **`11b-20`** record · the `public-read.ts` one-keyword-export note
- **Task 7 (AC8, partial — the abuse-counter investigation):**
  `_bmad-output/implementation-artifacts/deferred-work.md` (the routed observation + trigger) ·
  `apps/api/src/modules/public-pages/handlers.ts` (the expired skip comment amended in place — ⛔ a
  comment correction, ⛔ **no** counter wired)
- **Task 6 (AC7):** `apps/public/tests/sahyog-vivran-a11y.test.ts` (**new** — family 13, web form) ·
  `apps/public/tests/sahyog-vivran-copy.test.ts` (the `pagination.*` keys; the cross-namespace
  `contributor_list.*` legs + their negative half; the completeness fence; the stage-word fence) ·
  `apps/public/src/pages/sahyog-vivran/[driveToken].astro` (`aria-labelledby`; the nav's own label;
  `<ul>`/`<li>` page links) · `apps/public/src/lib/sahyog-vivran-render.ts` (`paginationLabel`) ·
  `packages/i18n/locales/{en,hi}/sahyog-vivran.json` (`pagination.label`) ·
  `apps/public/tests/sahyog-vivran-render.test.ts` · `apps/public/tests/integration/public-pages/scrape-test.spec.ts`
- **Task 5 (AC6):** `_bmad-output/planning-artifacts/ux-design-specification.md` (the buildable half at
  the canonical section + cross-references at all four restatement anchors, two of which gained their
  own corrections) · `_bmad-output/implementation-artifacts/deferred-work.md` (11b.1's item (f)
  discharged in place; the *"name FORM stays UNRULED"* bullet marked SPENT; a top-level pointer)
- **Task 4 (AC5):** `_bmad-output/implementation-artifacts/deferred-work.md` (the `-177` cl.3
  re-pointing recorded; the 11b.2b block superseded on its forward half; two stale cites re-derived;
  the edge-cache residual routed) · `apps/api/src/modules/public-pages/handlers.ts` (the `-172`
  end-at-the-wire residual stated at the sentinel) ·
  `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts` (the `-169` cl.4 aggregate leg
  widened to `confirmedContributionCount` and `amountRaisedInr`)
- **Task 3 (the contributor list):** `packages/contracts/src/public-pages/sahyog-vivran.ts`
  (`PublicSahyogVivranContributor`; the query gains bounded `page`/`limit`; the response gains
  `items`/`page`/`limit`/`total`) · `packages/domain/src/pool/sahyog-vivran-read.ts` (`poolId` +
  `cycleId`, INTERNAL) · `apps/api/src/modules/public-pages/handlers.ts` (the paged, bounded,
  per-row-guarded read; `mode` hoisted to once-per-request) ·
  `apps/api/src/modules/public-pages/sahyog-vivran-controls.ts` (ordinals 2 and 3 RESTORED;
  control 5's summary amended) · `apps/api/src/modules/public-pages/routes.ts` (header) ·
  `packages/contracts/public-pages/public-vs-private-matrix.yaml` (`paginated: true`) ·
  `apps/public/src/lib/surface-fields.ts` · `apps/public/src/lib/sahyog-vivran-render.ts` ·
  `apps/public/src/lib/sahyog-vivran.server.ts` ·
  `apps/public/src/pages/sahyog-vivran/[driveToken].astro` ·
  `packages/i18n/locales/{en,hi}/sahyog-vivran.json` (`pagination.*` + its `$comment`) ·
  `apps/api/tests/integration/login-wall.spec.ts` (four assertions) ·
  `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts` (the `contributors` fixture + five
  new legs) · `packages/contracts/tests/public-pages-sahyog-vivran.test.ts` ·
  `apps/public/tests/sahyog-vivran-render.test.ts` ·
  `apps/public/tests/integration/public-pages/scrape-test.spec.ts`
- **Task 2 unit 1 (the `₹₹` repair):** `packages/i18n/locales/{en,hi}/sahyog-vivran.json`
  (the literal ₹ dropped from `value.amount_raised`, + a `$comment.amount_raised` recording why) ·
  `apps/public/tests/sahyog-vivran-copy.test.ts` (the real-`t()` regression leg) ·
  `apps/public/tests/sahyog-vivran-render.test.ts` and
  `apps/public/tests/integration/public-pages/scrape-test.spec.ts` (both stubs now CALL
  `formatCurrency` instead of transcribing it)
- **Task 2 unit 2 (the deceased member's name):**
  `packages/domain/src/pool/public-read.ts` (`NAME_PUBLICATION_AUTHORISED` **exported**, with the
  one-predicate-two-surfaces and no-aliasing riders) ·
  `packages/domain/src/pool/sahyog-vivran-read.ts` (the no-join fence **narrowed**; LEFT join;
  `deceasedNameCiphertext` + `namePublicationAuthorised` selected and carried) ·
  `packages/contracts/src/public-pages/sahyog-vivran.ts` (the *"no person the Panel has not named"*
  clause **amended**; `deceasedMemberName` declared) ·
  `apps/api/src/modules/public-pages/handlers.ts` (basis-before-decrypt, the gated Tier-1 decrypt,
  `resolvePublicMemberName`, `.trim() || null`) ·
  `apps/public/src/lib/surface-fields.ts` · `apps/public/src/lib/sahyog-vivran-render.ts` ·
  `apps/public/src/pages/sahyog-vivran/[driveToken].astro` (the `<dt>`/`<dd>` pair, suppressed
  together) · `packages/i18n/locales/{en,hi}/sahyog-vivran.json` (`label.deceased_member`) ·
  `packages/contracts/tests/public-pages-sahyog-vivran.test.ts` ·
  `apps/public/tests/sahyog-vivran-render.test.ts` (the UNNAMED-drive describe; the UN-RULED-person
  leg narrowed; the negative control **re-planted onto `verifierName`**) ·
  `apps/public/tests/sahyog-vivran-copy.test.ts` · `apps/public/tests/member-drive-detail-field-floor.test.ts`
  (exclusion (b) **spent**; the counterpart row added) ·
  `apps/public/tests/integration/public-pages/scrape-test.spec.ts` ·
  `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts` (the `authorised` fixture, the
  governed `setMode` helper, and six new legs)
- **Task 1:** `packages/contracts/public-pages/public-vs-private-matrix.yaml` (two field blocks +
  the discharged routing note) · `packages/contracts/src/public-pages/matrix.ts` (two allowlist pairs
  + the half-spent fence) · `packages/contracts/tests/public-pages.test.ts` ·
  `packages/contracts/tests/public-pages-matrix-schema.test.ts` ·
  `apps/public/tests/integration/public-pages/scrape-test.spec.ts`

## Change Log

| Date | Description | Author |
|---|---|---|
| 2026-09-15 | ✅ **ALL EIGHT TASKS COMPLETE — the story moves to `review`.** ⭐ **Task 2** shipped the RUPEE FIGURE and the DECEASED NAME; ⭐ **Task 3** the CONTRIBUTOR LIST (paginated, bounded, ordered by the earliest LIVE confirmation, omit-the-ROW) with controls 2 and 3 **RESTORED** ⇒ the set is **SEVEN**; ⭐ **Tasks 4-8** the records. ⚠⛔⛔ **THE DAY-ONE OUTPUT IS THE INVERSE OF THE TITLE, AND IT IS RULED:** the page names up to **fifty LIVING contributors' FULL LEGAL NAMES** on an unauthenticated edge-cached surface while the **deceased member it is named for renders NOTHING** — `NAME_PUBLICATION_AUTHORISED` is fail-closed for every member until counsel's clause is **PINNED**, and that inertness is **proven END TO END** by a live-DB leg that plants a real ciphertext and asserts the name still never reaches the wire. ⛔⛔ ⛔ No placeholder `clause_versions` row was seeded. ⚠⛔ **A SHIPPED DEFECT WAS FOUND BY RE-REVIEWING TASK 2 UNIT 1 BEFORE UNIT 2 BEGAN** — the rupee sign rendered **TWICE** (`₹₹`) in **BOTH** locales, because both suites stubbed the label with a HAND-WRITTEN form and bypassed `t()` **and** `formatCurrency` at once; ⭐ the durable half of the fix is that the stubs now **CALL** the formatter and the copy test gained the real-`t()` leg ([[feedback_stub_must_call_not_transcribe]]). ⚠⛔ **AND A SECOND CLASS:** the API route spec is `skipIf(!hasDatabase)` ⇒ it **SKIPS SILENTLY** under the house `env -u DATABASE_URL turbo test`, so a key-set assertion had been **RED for a day** behind a green 37/37 — ⭐ **a DB-gated spec is ⛔ NOT covered by that line.** ⭐ **FOUR GOVERNANCE FINDINGS THE ACs DID ⛔ NOT ANTICIPATE:** (1) `-177` cl.3's trigger re-pointing had been **RULED 13 days earlier and had ⛔ NEVER reached `deferred-work.md`** — and this story IS the render its stale trigger named, so it read as *"fired, nobody acted"*; (2) the UX inventory's unbuildable part is the **ROW GRAIN**, ⛔ not the column count — the ten-column table was **SPLIT ACROSS TWO SURFACES**, and the mobile row's per-contributor **₹ amount is REFUSED BY RULING**, ⛔ not merely unbuilt; (3) **`-183` is TRUSTEE-RATIFIED about a *"Tier-1-bearing SINGLE-ITEM GET"*** — ⛔ this route is no longer one, so the abuse-counter question is a **PANEL act** and is ROUTED, ⛔ not wired; (4) **AC9's own count was low by more than 4×** (**22** test-leg amendments across seven files, ⛔ not five) — ⭐ the same count-carried-forward defect the story spent five tasks finding in other people's artefacts. ⭐ **Verified:** `turbo typecheck + lint + test` **77/77**, the financial-truth gate **green**, and against the **live DB at `:5433`** — `apps/api` **132 files**, `@twt/domain` **270 files**, the route spec **39/39**. | BigDev + Claude |
| 2026-09-15 | ✅ **TASK 2 COMPLETE — BOTH UNITS. ⭐ The RUPEE FIGURE and the DECEASED MEMBER'S NAME both ship.** ⚠⛔⛔ **AND UNIT 1 WAS RE-REVIEWED BEFORE UNIT 2 BEGAN, ⛔ NOT TRUSTED — IT CARRIED A SHIPPED DEFECT.** `value.amount_raised` was minted as **`"₹{amount} raised"`** while the render site passes `formatCurrency(amountInr, 'en')`, whose output **already carries the symbol**, the house space and the Indian grouping ⇒ the page rendered **`₹₹ 1,37,000 raised`**, in **BOTH** locales, from the first commit of the figure. ⭐ **⛔ NOT A NEW CLASS:** `sahyog-shared`'s `$comment.message_block` records it in terms — *"the literal ₹ is DROPPED because `{amount}` arrives ALREADY FORMATTED and carries its own ⇒ a literal ₹ would ship `₹₹`"* — and its `index_line.*` variants, same ratification and same day, carry ⛔ no literal ₹ for exactly this reason. ⚠⛔⛔ **THE USEFUL HALF IS WHY ⛔ NOTHING CAUGHT IT:** both suites stubbed `labels.amountRaised` with a **hand-written** `` `₹${a.toLocaleString('en-IN')} raised` ``, bypassing `t()` **and** `formatCurrency` at once — ⭐ the same fixture blind spot as the 11a.2 `{{max}}` vs `{max}` defect that threw on every `/members` request, re-run on a new key — and `sahyog-vivran-copy.test.ts`, **the file that exists precisely to close that gap**, was ⛔ never given the key. ⇒ ⭐ the durable half of the fix: both stubs now **CALL** `formatCurrency` rather than transcribing it (the transcription was wrong TWICE — it also dropped the house space), and the copy test gained the **real-`t()`** leg for both locales, **teeth proven** by re-planting the defect (red) and reverting (green). ⛔ AC7 still owns the full a11y+i18n obligation at **Task 6**. ⭐⭐ **UNIT 2 — THE DECEASED MEMBER'S NAME (`2026-09-02-173`, FULL NAME, unconditional per `-175`).** `NAME_PUBLICATION_AUTHORISED` **EXPORTED, ⛔ never copied** (⛔ one fail-closed gate with four subtle legs; a fork drifts **silently** and its failure mode is a name rendering on an authority that does ⛔ not exist — and it correlates by **bare table name**, so ⛔ neither consumer may alias `pools`/`claims`) → a **LEFT, ⛔ never INNER** join (an absent profile removes a **NAME**, ⛔ never a **DRIVE**) → ciphertext + basis carried **UNRESOLVED** to the boundary → **the basis checked BEFORE the decrypt** (⇒ ⛔ ZERO KMS calls today) → `resolvePublicMemberName(mode, …)` under the Pariwar's **STORED** mode, ⛔ never a literal (`-136` cl.1), ⛔ never `resolvePoolIdentity` and ⛔ never `splitFirstNameLastInitial` → **`.trim() \|\| null`, ⛔ never `=== ''`** → the `<dt>`/`<dd>` pair **SUPPRESSED TOGETHER**. ⭐⭐ **AC1's DESIGNED INERT STATE IS PRESERVED AND ⭐ PROVEN END TO END:** the fixture plants a **real Tier-1 ciphertext**, the read **selects** it, `-173` **authorises** it — ⛔ and the name still does ⛔ not render, because ⛔ no `clause_versions` row satisfies the basis. ⛔⛔ ⛔ No placeholder row was seeded. ⭐ The spec's `Rajesh`/`Sharma` legs did ⛔ not go stale — ⭐ they became the story's sharpest assertion, and the comment says so: ⛔ if either goes red, a publication basis became satisfiable — a **GOVERNANCE event**, ⛔ never a test fix. ⭐ The **positive** arm is proven too (a test transaction seeding the post-clause world), so the gate is ⛔ not vacuous; ⭐ a **mode-flip** leg proves the form follows the stored mode — ⛔ the only leg that catches a hard-coded literal; ⭐ and the **MONONYM** and **whitespace-only** arms each have their own leg. ⭐ The domain read's *"⛔ NO join to `member_kyc_profiles`"* fence is **NARROWED, ⛔ not deleted** — its PREMISE expired, ⛔ not what it protected. ⭐ **FOUR inverted tests amended BY NAME, ⛔ none deleted**, and the render test's **negative control RE-PLANTED onto `verifierName`** — ⛔ nobody has ruled a verifier identity at any tier, so ⛔ no future story can declare it out from under the control. ⚠⛔ **A STALE ASSERTION FROM UNIT 1 WAS FOUND AND FIXED HERE, ⛔ RECORDED ⛔ not absorbed:** the API spec's exact-key-set leg never gained `amountRaisedInr`, and ⛔ nothing noticed because the whole `describe` is `skipIf(!hasDatabase)` ⇒ **it SKIPS SILENTLY in `turbo test`.** ⇒ ⭐ **a DB-gated spec is ⛔ NOT covered by the green `turbo test` line.** ⚠ And ⛔ one expectation I wrote was WRONG while the code was RIGHT — the shielded form takes the **LAST** token's initial (`Rajesh S.`, ⛔ not `Rajesh K.`); corrected against what the function DOES. ⭐ **Verified:** `turbo test` **37/37**, typecheck + lint **40/40**, the financial-truth gate **green**, and against the **live DB at `:5433`** — `apps/api` **1265 passed / 132 files**, `@twt/domain` **3352 passed / 270 files**, the Sahyog Vivran route spec **34/34**. ⛔ **Tasks 3-8 remain OPEN**; ⛔ the row is ⛔ not moved to `review`. | BigDev + Claude |
| 2026-09-15 | ✅ **`D-percentage` RULED — ⛔ NO completion percentage on a `closed`/`settled` drive page.** `#decision-2026-09-15-218`, **BigDev author-commit** (⛔ not a Panel matter), recorded **BEFORE** any code ([[feedback_governance_commits_precede_implementation]]). ⭐ **The Preflight STOP is LIFTED and Task 2 is unblocked; the story carries ⛔ ZERO open decisions.** ⚠⛔ **AND THE TRACE CHANGED WHAT THE RULING IS** — the question was posed as if the page had a percentage to suppress; ⛔ **it does ⛔ not.** `sahyog-vivran.ts` carries ⛔ **no percentage field in ⛔ any state**, `:60-61` forbids one *"in any field, under any name"*, and `public-pages-sahyog-vivran.test.ts:146-152` **already rejects** `confirmedPercentage` / `expectedTotal` / `targetAmount` / `shortfall`; the percentage that exists is the **INDEX's** (`sahyog-drive.ts:254`, gated to `live` at `sahyog-render.ts:445` under `-207` cl.1) — ⛔ a **different surface**, ⛔ never a shared field. ⇒ **cl.2: the entry makes an existing ABSENCE INTENTIONAL and changes ⛔ NO CODE** — ⛔ nobody implements it, ⛔ nobody records it as work; what changed is the absence's **status**, from *"⛔ not built yet"* to *"⭐ RULED OUT"* ([[feedback_closure_language_precision]]). ⚠⛔ **cl.3: the `live` arm is ⛔ NOT ruled** — only `closed`/`settled` was asked and only that was answered; `live` shows none today **by FENCE**, ⛔ not by ruling ⇒ ⛔ the clause must ⛔ not auto-widen (the care `-192` cl.2 records), and it is carried as an **Open follow-up**, unrouted and blocking ⛔ nothing. ⚠⛔ **cl.4 binds AC3b:** `amountRaisedInr` may ⛔ never be paired with, divided by or captioned against a target, expected total or roster size — ⛔ that reconstructs the refused percentage by hand and re-opens what `-204` cl.8 closed *"BY CONSTRUCTION"*. ⭐ `-207`'s Open follow-up naming this story is **DISCHARGED BY THAT ENTRY**; ⛔ `-207` is ⛔ not edited. ✅ **TASK 0 IS COMPLETE IN THIS SAME COMMIT** — ⭐ AC0 requires **exactly ONE** `governance:` commit, so the ruling and its records land **together**: AC10's compliance statement, story D's Trap-10 back-reference (**discharged** — `-218` answers the question the divergence was about), `-182`'s forward pointer, and the `fundingOutcome` guard **routed** to `deferred-work.md`. ⚠⛔ **AC10's finding is material and ⛔ not a formality: the CONTRIBUTOR data class is ⛔ NOT COMPLIANT with `-195` cl.1** — public gets the FULL NAME, the member gets `firstName + lastInitial` (`member-pool/handlers.ts:1240`) ⇒ ⛔ **the public sees MORE than the member, and THIS STORY is the act that creates it.** ⭐ Ruled and CARRIED under `-177` cl.2 (`D9-inversion`), ⛔ so it is STATED, ⛔ not cured — and ⛔ `-180` did ⛔ **not** close it (its *"ALL FOUR"* is scoped to `resolvePoolIdentity`'s consumers, ⛔ the DECEASED name). ✅ The deceased class **IS** compliant, now and post-clause. | BigDev + Claude |
| 2026-09-15 | ⭐⭐ **v2.1 — THE SECOND `validate` PASS. RE-DERIVED AGAINST `be0037cc`. ⛔ NO CODE.** ⭐ The pin is **UNCHANGED** (`05094a68`) and **re-confirmed an ancestor of both `HEAD` and `origin/main`** — ⭐ the two facts are now stated **separately**, because v2.0 merged them and its *"no code moved"* half expired in four days. ⭐ **THE DEBT v2.0 RECORDED IS DISCHARGED**: `git diff --name-only 05094a68..HEAD -- packages apps` = **42 files**, and §*What already EXISTS* is re-read line by line. **16 findings, 6 BLOCKING**, in the order they would have bitten: **(1)** AC3b was **red on write** — `scripts/sahyog-vivran-financial-truth` rule (3) forbids an amount operand being **NAMED** in the very DTO file AC3b targeted (`check.ts:53`, `lib.ts:112`), and the gate is wired into **both** `ci.yml:745` and `ci-local.sh:82` ⇒ ⭐ **AC11 minted**, and the gate's own header routes the remedy here *"in its own commit"*; **(2)** AC3b's source `:509` is an **argument field inside a ternary** that is `null` on every **live** drive, sitting under a fence reading *"⛔ Do not widen `SahyogVivranEntry` to carry either of them, under any name"* ⇒ ⭐ **rewritten to mirror the shipped index precedent** — a clamped named binding used twice, on the wire as **`amountRaisedInr`** (⭐ **`-190` cl.6 / `-189` cl.5**, the two clauses v2.0 dropped while citing their siblings); **(3)** AC3 ordered the **shared presenter** *and* `resolvePublicMemberName` — ⛔ mutually unsatisfiable: the presenter's input type has ⛔ **no full-name arm**, so following it ships the **SHIELDED** form on the one surface ruled **FULL NAME**, ⛔ with every test green; **(4)** Trap 5's *"every caller treats `''` as omit this ROW"* is **FALSE at the call site it cites** — the sibling omits **the NAME, ⛔ never the row**, and uses **`.trim() \|\| null`, ⛔ not `=== ''`** (a 2026-09-08 review finding v2.0 would have re-broken) ⇒ ⭐ ruled **per subject**; **(5)** **all nine** `file:NNN` pointers into `.decision-log.md` / `deferred-work.md` / `epics.md` had **ROTTED**, the **Preflight's own** among them ⇒ ⭐ **re-expressed as ids, clauses and item letters and the numbers DELETED**, ⛔ not re-derived — this file now holds **ZERO** numeric pointers into any prepend-structured file; **(6)** every `member-pool/handlers.ts` cite landed in the **wrong function** (`:762-773`/`:771` → the sentinel is at **`:621`/`:1047`/`:1236`**; `:406-408` → the halved bound is **`:508`**). ⚠ Also: AC7's `settled`→*"Completed"* corrected — ⭐ **`-191` cl.3 is SUPERSEDED**: **`-192` cl.1** amended it to **"Verified"** the same day (*"which implied a payment event that ⛔ does not exist"*, with Consequence 3 recording the amendment by name) and **`-193`** Trustee-ratified it ⇒ ⭐ the shipped copy is **CORRECT**, ⛔ only the citation was stale. ⭐ **And the trace paid for itself:** `-192`'s Occasion records the `pool.settled` events as **FIXTURES** ⇒ *"⛔ no production pool can reach `settled` today"*, and `-193` calls the *"Verified"* section *"PERMANENTLY EMPTY until settlement ships"* ⇒ ⭐ **this story's `verified` render arm is INERT ON DAY ONE**, the same shape as Trap 1's deceased name — ⭐ now stated in AC7 so it is ⛔ not re-discovered as a defect. ⚠⛔ **v2.1's OWN FIRST DRAFT GOT THIS WRONG AND IT IS RECORDED, ⛔ NOT QUIETLY FIXED:** it raised this as a *"`D-stageword`"* **Preflight STOP** offering a branch in which *"the shipped copy is defective on a Trustee-ratified line"* — ⛔ **FALSE**, and acting on it would have **broken correct ratified copy**. ⭐ It was ⛔ never a decision and ⛔ never a conflict: it was a **stale citation, settled by READING the log**. ⇒ ⭐ the category test is *"is the answer FOUND or DECIDED?"* — ⛔ a validate pass owes the read before it hands anyone a STOP ([[feedback_closure_language_precision]], [[feedback_trace_internal_state_never_cite_decision_text]]) · the repo-wide **`sahyog-shared-dark-copy` fence** (+497 lines, two ⛔ non-appendable allow-lists) named for the first time · the key prefix is **`contributor_list.*`**, ⛔ not `contribution_list.*` · **two `deferred-work.md` items routed here BY NAME** whose *"Trigger: 11b.3 merged"* has **FIRED** (`11b-3` is `done`) · **three shipped artefacts** still prescribing the presenter mechanism AC3b abandons ⇒ **AC11(c)** amends each **by name**, ⛔ never silently · `bounded-decrypt.ts` given its **path** · the **glyph register DECLARED** and **five `⛔`-as-emphasis inversions** corrected, including **AC0's own commit rule** · AC2's *"three stale epic ACs"* corrected to **two** (the third is 11b.1 **`D5`**) · and `ux-design-specification.md`'s three pointers **recorded as ⛔ UN-RE-VERIFIED** rather than re-asserted ([[feedback_record_unattested_no_backfill]]). ⚠⛔ **AND THE UX SPEC — WHICH THIS PASS FIRST RECORDED AS ⛔ UN-RE-VERIFIED — WAS THEN RE-VERIFIED ON BigDev'S CHALLENGE.** ⭐ The file is **unmoved since the pin** and **all three pointers HOLD** (`:1298` heading · `:1311` canonical block · `:1158`+`:1160` layout primitive), ⛔ but the read found **four things AC6 did ⛔ not carry**: ⭐ the block is **`:1311-1335`**, ⛔ not `-1330` — and `:1333-1335` is **the half this story changes**; ⭐ the block's own rule *"⛔ THE COUNT IS ⛔ NOT THE REQUIREMENT, THE LIST IS"* names **FOUR** other annotated anchors (`:1252`, `:1788`/`:1798`, `:2161`+`:2165` beyond `:1158`) plus **six** out-of-scope referring sites incl. `:2581`; ⛔⛔ **`:1334` IS STALE** — *"the contributor NAME FORM is UNRULED … ⛔ nothing ratified"* is **FALSE** (`-174` Panel, unconditional `-175`), ⭐ the **third** instance of the stale-*"unruled"* class after `view-model.ts:54-57` and `sahyog-vivran.ts:374-377`; and ⛔ **`:1335` NAMES THE WRONG STORY** — it assigns the buildable inventory to **`11b-3`**, which is **`done`** and ⛔ did ⛔ not do it ⇒ ⭐ **AC11(e)** adds the forward pointer. ⚠ Also: **two `### (f)` headings** exist ⇒ AC6 now says **11b.1's**, ⛔ not 11b.3a's (the `(e)` disambiguation **swept**, [[feedback_story_validate_footguns]] item 16); the UX spec's own `:1313` pointer to `deferred-work.md:296-313` is **ROTTED**; and `-133` **cl.1** added as co-ground with `-132` R1/R7. ⇒ ⭐ **the *"un-re-verified" note is RETIRED, ⛔ not left standing** — ⚠⛔ and the lesson is recorded: **a validate pass's own scope carve-out ("outside my diff scope") is a HAZARD, ⛔ not a discharge** ([[feedback_record_unattested_no_backfill]]). ⛔ **Every falsified v2.0 row is KEPT and MARKED** — see **§ v2.1**. ⛔ Rows unchanged; ⛔ baseline unchanged. | BigDev + Claude |
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
