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

Status: ready-for-dev

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

- [ ] **Task 2 — `@twt/ui` + the Astro render layer** (AC1, AC3, AC3b) — ✅ `D-percentage` **RULED**;
      ⛔ still **after Task 1b** (the gate narrowing).
  - [ ] ⚠⛔ **`-218` cl.4:** ⛔ ⛔ no target / expected-total / roster-size companion to the amount.
  - [ ] ⭐ **AC11(a):** if Task 2 adds a NEW file under `apps/public/src/lib` or
        `apps/public/src/pages/sahyog-vivran`, enrol it in `SCAN_FILES` **in this same commit**.
        ⚠ Verified no-op for the files that already exist; ⛔ the scope safeguard fails the run if not.
  - [ ] ⭐ Bind `const deliveredTotal = Math.max(0, confirmedContributionCount * row.fixedAmount)`
        **above** the `fundingOutcome` ternary; use it **twice**; wire field **`amountRaisedInr`**.
  - [ ] ⭐ Amend `sahyog-vivran-read.ts:496-498`'s anti-widening fence to **`expectedTotal` only**.
  - [ ] ⭐ Amend `sahyog-vivran.ts:56-58`. ⛔ Neither factor crosses, under any name.
  - [ ] ⛔⛔ **⛔ Do ⛔ not feed `resolvePublicMemberName`'s output through the `contribution-list`
        presenter's `displayName`** — its input type has ⛔ no full-name arm, and ⛔ **never** call
        `splitFirstNameLastInitial` (that ships the SHIELDED form). ⭐ Render one resolved string.
  - [ ] ⭐ Omission **per subject**: contributor ⇒ omit the **ROW**; deceased ⇒ omit the **NAME**, keep
        the page. ⭐ Test with `.trim() || null`, ⛔ **never** `=== ''`.
  - [ ] ⭐ Per-row `try/catch` **INSIDE** the `mapWithConcurrency` callback.
- [ ] **Task 3 — Pagination, ordering, the anti-leaderboard fence, the control set** (AC4) — ⭐ edit
      `sahyog-vivran-controls.ts`; amend the three `login-wall.spec.ts` assertions **by name**; the
      count is **SEVEN**. ⭐ Full `DIRECTORY_DECRYPT_CONCURRENCY` (⛔ not the halved bound at
      `member-pool/handlers.ts:508`).
- [ ] **Task 4 — RTBF + the erasure backstop + the row key** (AC5) — ⭐ the `ANONYMIZED_SENTINEL`
      plaintext check is ⛔ **not** optional; ⭐ the pattern is at `member-pool/handlers.ts:621` /
      `:1047` / `:1236`; ⭐ import the constant, ⛔ never re-type the literal.
- [ ] **Task 5 — The buildable column inventory** (AC6, AC11) — annotate at the **canonical section**
      (`:1311-1335`), cited by its heading title; ⭐ cross-reference the **four** restatement anchors;
      ⭐ amend `:1334`'s stale *"UNRULED"* and add `:1335`'s forward pointer off `11b-3`.
- [ ] **Task 6 — a11y (web form) + real-`t()` both locales + the completeness fence** (AC7) — ⭐ Reuse
      the ten **`contributor_list.*`** keys (namespace `contribution`);
      consume `stage.*` from `sahyog-shared`; ⛔ **mint ⛔ no stage word**; ⛔ resolve ⛔ neither
      `index_line.*` nor `message_block.*` (the repo-wide fence).
- [ ] **Task 7 — Route what is not built** (AC8) — ⛔ the D10-ratification item untouched; the `11b-20`
      note; the two fired `deferred-work.md` triggers recorded as **carried**, ⛔ not closed.
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
- ⛔ **Tasks 2-8 remain OPEN.** ⚠ AC9 is **PARTLY** discharged (the two negative controls); its other
  four legs depend on Task 2's render.

### File List

- `scripts/sahyog-vivran-financial-truth/lib.ts` — rule (3) narrowed (`TARGET_OPERANDS`,
  `RULED_AMOUNT_FIELD`, `isAmountDerivation`, `namedOperand`)
- `scripts/sahyog-vivran-financial-truth/lib.test.ts` — 3 new fixtures
- `scripts/sahyog-vivran-financial-truth/check.ts` — scope-tax header amended; summary line corrected
- `packages/contracts/src/public-pages/sahyog-vivran.ts` — presenter-mechanism doc-block amended
- `packages/ui/src/contribution-list/view-model.ts` — stale *"form is UNRULED"* doc-block amended
- `_bmad-output/implementation-artifacts/deferred-work.md` — amount-raised item amended
- `_bmad-output/planning-artifacts/ux-design-specification.md` — `:1334`/`:1335` amended
- **Task 1:** `packages/contracts/public-pages/public-vs-private-matrix.yaml` (two field blocks +
  the discharged routing note) · `packages/contracts/src/public-pages/matrix.ts` (two allowlist pairs
  + the half-spent fence) · `packages/contracts/tests/public-pages.test.ts` ·
  `packages/contracts/tests/public-pages-matrix-schema.test.ts` ·
  `apps/public/tests/integration/public-pages/scrape-test.spec.ts`

## Change Log

| Date | Description | Author |
|---|---|---|
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
