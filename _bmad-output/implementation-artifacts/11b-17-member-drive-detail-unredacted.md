---
baseline_commit: a2617869
---

<!--
⭐ BASELINE — `fix(11b.15): drop the dead MemberDriveListEntry import lint caught on remote CI`.
⭐ **RE-PINNED 2026-09-10 by this story's `validate` pass** — `66ef4dce` → `a2617869`, **106 commits**
of drift, every claim below RE-VERIFIED against this SHA. ⛔ The previous pin was a *reachability*
fix only and explicitly disclaimed re-verification; that debt is now DISCHARGED.
⭐ **RE-CONFIRMED 2026-09-11 (second `validate` pass): the pin STILL HOLDS and is ⛔ NOT re-pinned.**
`git merge-base --is-ancestor a2617869 HEAD` passes, and every commit since is `governance(11b.17)` /
`story(8.17)` touching ⛔ ONLY `_bmad-output/` + `.decision-log.md` ⇒ ⛔ **no code moved**, so a2617869
remains the correct CODE baseline. ⚠ What DID move is the governance state — which is exactly what
footgun #4 warns is invisible to a `--name-only` check, and is where this pass's findings came from.
-->

# Story 11b.17: The Member's View of ONE Drive — Carrying What the Public Page No Longer Does `[SURFACE]`

Status: ready-for-dev

## ⛔ PREFLIGHT — ⛔⛔ **ONE STOP IS OPEN. ⛔ THIS STORY IS ⛔ NOT STARTABLE.**

⭐⭐ **BOTH ORIGINAL DECISIONS ARE RULED — `#decision-2026-09-10-212`, TRUSTEE-RATIFIED (DR + KB, 2026-09-10).**

| | Was open | ✅ Ruled |
|---|---|---|
| **D2** | Does the DETAIL render **लक्ष्य**, and for which stages? | ✅ **(B) — `live` drives ONLY** (cl.1) |
| **D3** | *"Shown to the logged-in member"* — the ID, or a pay button? | ✅ **(D) — the UPI ID goes on the PAYMENT screen, ⛔ not here** (cl.2) |

⭐ Answered from `trustee-panel-routing-note-2026-09-10-11b17-member-drive-detail-two-questions.md`
(**Q1**/**Q2**). ⚠ **Read `-212`'s Consequences 3-6 before Task 2** — cl.2 creates work **outside this
story** and ⛔ none of it is F's to absorb silently.

⛔ Task 1's `governance:` commit still binds ([[feedback_governance_commits_precede_implementation]]).

### ⛔⛔ STOP 1 — A RATIFIED OBLIGATION ROUTES TO F **BY NAME** AND ⛔ NEVER REACHED `.decision-log.md`

⚠⛔ **FOUND BY THE 2026-09-11 `validate` pass. ⛔ This is ⛔ not a new question — the Panel ANSWERED it on
2026-09-05.** It was never lifted into the log, so ⛔ no decision grep finds it
([[feedback_story_validate_footguns]] #15).

⚠⛔ **CITE THESE TWO SECTIONS, ⛔ NOT §8.3(3)/§8.5 — corrected 2026-09-11.** ⭐ §8.5 is titled
*"What we **propose**"* and §8.3(3) is the note authors' **sequencing statement**; ⛔ neither is a ruling.
⛔ The earlier wording of this STOP cited them and was **wrong about the authority**, though right about
the obligation. ⭐ The load-bearing sources are:

⭐ **§8.1 — "Ratified verbatim (DR + KB, 2026-09-05)"**: a five-paragraph block in **both locales**,
***"Plus: a table above the message — `Nominee full name` (left) · `District` (right) — on **both** the
member and the public view."*** ⚠⛔ **That scope phrase is the operative half** — it is what routes this
off the public surface, ⛔ not a rendering hint.
⭐ **§9.1 row 3 — answered 2026-09-05, relaying DR + KB**: ***"B can ship the shared copy source now.
E/F consume it later."***
⚠ **§8.3(2)** supplies the shape constraint only: the block *"is written for a **PAGE**"* ⇒ ⛔ it cannot
sit in a one-line index cell.

⭐ **AND §10 WAS READ TO THE END** ([[feedback_story_summary_can_lag_its_routing_note]]): **§10.4**
re-homes **three OTHER rulings** (mechanize the approver duty → a new story; the nominee name on the
**index** → its own story or **D**; omit-the-clause → **B**) and ⛔ **leaves this one standing**.
⛔ Do ⛔ not read §10.4 as having moved it.

⭐ Corroborated in a `done` story: `11b-12:583-600`.
⛔ `grep -c "Join the Pariwar\|E/F consume" .decision-log.md` ⇒ **ZERO**.

⛔⛔ **AND IT IS WORSE THAN "F OWES A RENDER" — ⛔ TRACED LIVE 2026-09-11.**
⚠⛔ **B ⛔ NEVER SHIPPED THE COPY SOURCE.** `sahyog-shared` holds `index_line.*` (§9.2's one-line index
wording, ✅ shipped) and ⛔ **no message-block key**; `grep "Be the Movement"` / `"सहयोग का हाथ"` across
`packages/i18n/locales/` returns **ZERO**. ⚠ `11b-12` is **`done`**.
⚠⛔ **AND STORY E (`11b-15`) CLOSED `done` OWING THE IDENTICAL OBLIGATION** — ⛔ it renders neither the
block nor the table. ⇒ ⛔ **this is ⛔ not F's omission; F is where it was CAUGHT.**
⇒ ⭐⭐ **AC10 IS UNSATISFIABLE UNTIL B's KEYS EXIST**, and a dev must ⛔ **NEVER** close that by authoring
ratified copy at a render site ([[feedback_story_validate_footguns]] #8). ⛔ That is a **STOP**.

⇒ ⛔⛔ **TASK 1's `governance:` COMMIT MUST CARRY THE DECISION ENTRY FIRST**
([[feedback_governance_commits_precede_implementation]]) — ⛔ an AC alone is ⛔ not enough, and this is
the precise failure `-211`'s own Occasion block describes. ⭐ **Then AC10 / Task 5d build it.**
⚠⛔ If the Panel's intent is judged narrower than §8.3(3) reads, that is a **NEW routing note**, ⛔ not a
silent narrowing here.

### ⭐ The 2026-09-10 `validate` pass — ⛔ KEPT AS THE RECORD, ⛔ not deleted

⚠ Three independent verifiers, **32 findings**. ⛔ A later reader must ⛔ not "restore" what any of
them removed.

| | Found | Disposition |
|---|---|---|
| **F1** | `-211` Consequence 2 opens the **लक्ष्य** question for THIS story BY NAME, and `-211` cl.1 RETIRED *"no target"* from E | ✅ **D2 OPENED**; the retired sentence STRUCK at both sites |
| **F2** | AC4's **UPI ID** contradicts a standing, thrice-stated prohibition | ✅ **D3 OPENED**; AC4 narrowed to the five unruled-free fields |
| **F3** | E's two routed obligations lived in PROSE ONLY — ⛔ no AC, ⛔ no Task | ✅ **AC8 + AC9 WRITTEN**, Tasks 5b/5c |
| **F4** | AC5 cited a precedent that **forbids** what AC5 orders | ✅ **RE-GROUNDED** as a named DEPARTURE |
| **F5** | Trap 1's premise (*"story A removes the public's banking entirely"*) | ⭐ **RE-VERIFIED SOUND** — it SHIPPED (`45547a7b`), and it is a DELETION, ⛔ not a gate ⇒ ⛔ nothing to be inert |

### ⭐ The 2026-09-11 `validate` pass — ⛔ KEPT AS THE RECORD, ⛔ not deleted

⚠ Three independent verifiers again, **34 findings, ALL APPLIED**. ⛔ A later reader must ⛔ not
"restore" what any of them removed.

| | Found | Disposition |
|---|---|---|
| **G1** | A **ratified** 2026-09-05 obligation routes to F by name and ⛔ never reached the log | ⛔ **STOP 1 OPENED**; **AC10** + **Task 5d** written |
| **G2** | D2(B) put लक्ष्य on the page but `reveal_to_members` reached ⛔ no AC and ⛔ no Task | ✅ **AC2 + Task 2 + Task 6 GATED** |
| **G3** | The ratified **number form** (`-206` cl.3) and **derivation** (`-204` cl.2) for लक्ष्य were absent | ✅ **AC2 + Task 2**; `drive_target` consumed BY NAME |
| **G4** | AC4's *"reuse `nominee.label`"* renders **`"Nominee"`**, ⛔ not the ruled *"Nominee Name"* | ✅ **RE-POINTED** to `label.account_holder` |
| **G5** | The `bank_name` hazard shipped **CLOSED BY DELETION** ⇒ the inherited risk was **INVERTED** | ✅ **RE-STATED** — the projection now yields ⛔ NEITHER field |
| **G6** | §8.4(ii)'s *"nobody has said which"* — ⛔ false; and **`6-18`** already builds on the answer | ✅ **RE-GROUNDED** on `D5-subject (i)`; Panel routing DROPPED |
| **G7** | The audit **unit** disagreed across AC5 / Task 4 / Task 6 (≈8 vs ≈17) | ✅ **PINNED: per OPEN** |
| **G8** | ⚠ Every `.decision-log.md:NNN` citation stale by **~+152** (`-212`/`-213` prepended) | ✅ **SWEPT**; `deferred-work.md` switched to **ITEM ADDRESSES** |

---

> ⚠⛔ **TWO CORRECTIONS, 2026-09-08 — ⛔ recorded, ⛔ nothing here is built yet.**
>
> **(1) ⛔ "STORY G" NO LONGER EXISTS.** `11b-16` is **WITHDRAWN** (`#decision-2026-09-08-208` cl.1);
> the member name form is owned by **`8-16-member-pool-identity-name-form-alignment`**, ruled at a
> **wider** scope (ALL FOUR consumers, `-180`).
>
> **(2) ⛔⛔ THE NOMINEE'S NAME FORM WAS ⛔ NEVER G's TO GIVE.** ⭐ It was ruled **FULL NAME** at
> `#decision-2026-09-07-205` **cl.1** and built in story **D** (`11b-14`, AC7). ⛔ The per-Pariwar
> `public_name_presentation_mode` has ⛔ **no subject** here — the nominee value is claim-scoped free
> text with *"⛔ no member identity behind it"* (`deferred-work.md` **`D5-subject (i)`**, `:390-391`). ⇒ ⛔ do ⛔ not wait on `8-16`
> for it, and ⛔ do ⛔ not build it here.

> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST.** **Story F** of the split (`2026-09-04-195` cl.3) — ⚠ **one
> of SIX**, ⛔ not "the last of seven": `-208` cl.6 re-counted the set when G was withdrawn, and
> **F is `11b-17`**. ⇒ owes an `epics.md` **SECTION** (**Task 1**).
>
> ✅⭐ **⛔ NO LONGER BLOCKED.** Story **A** (`11b-11`) is `done`; story **E** (`11b-15`) is `done`;
> ⛔ "E is blocked on B and G" was retired by `-208` cl.4 (E's dependency re-pointed to `8-16`, also
> `done`). ⇒ ⭐ **the only thing holding this story is the Preflight above.**
>
> ⭐⭐ **THIS IS THE STORY THAT MAKES `-190` cl.3 TRUE.** *"A logged-in member sees the complete banking
> information."* ✅ Its scope is RULED — see **D1**.

## Story

As a member looking at a drive in my Pariwar,
I want to open it and see what the trust actually holds about it — including the account the money
went to —
so that the people whose contributions funded it can see where it went, instead of that record
existing nowhere a member can reach.

> ⚠⛔ **THE `so that` CLAUSE IS ⛔ NOT *"rather than only strangers being able to."*** ⭐ After story A
> **⛔ no stranger can see it either** (`surface-fields.ts:675-681` — all six coordinate fields are
> gone). ⛔ That framing is the sentence class `-209` cl.3 **RETIRED** as *"false for every drive"* and
> forbade paraphrasing. ⛔ Do ⛔ not restore it.
>
> ⚠⛔ **AND ⛔ NOT *"for the drives that concern me."*** ⭐ That is D1 option **(b)**, which `-199`
> records as **⛔ NOT taken** (`.decision-log.md:1649`). The Story statement must read as **(a)**, and
> AC6's member-facing sentence already does.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT** is introduced or changed — ⛔ no
eligibility, ⛔ no assignment, ⛔ no obligation, ⛔ no amount owed.

⚠ **ONE VISIBILITY PREDICATE IS INTRODUCED AND IT GATES ⛔ NO BENEFIT** — *which member may read a
drive's banking coordinates* (D1). ⭐ Stated in the member's terms, ⛔ not the code's:

> **"Any member of your Pariwar can see the bank account details of every family your Pariwar has
> supported — ⛔ not only the drives you were asked to contribute to, and ⛔ not only while a drive is
> still collecting."**

⚠⛔ **THE NIYAMAVALI CHECK, REPORTED HONESTLY, ⛔ not faked.** ⭐ Result: **the check yields nothing
dispositive**, because the Niyamavali is an **unexecuted, agent-drafted design reference that binds
nothing** ([[feedback_niyamavali_rulebook_not_spec]]) — ⛔ it is ⛔ never a blocker and ⛔ must ⛔ not be
cited as binding. ⇒ ⭐ **the authority for this sentence is `2026-09-04-190` cl.3 as applied at `-199`,
⛔ nothing else.** ⛔ Do ⛔ not record a Niyamavali clause as authorising it.

⚠ **AC6 restates this sentence and is the AC that binds it.** ⛔ It is ⛔ not "written later" — it is
written, here and there, and ⛔ both must move together if it ever changes.

## 🎯 What already EXISTS — ⭐ re-verified live at `a2617869`, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| The member's bank access today: **own pool, `live` only** | `contracts/contributions/nominee-accounts.ts`; `payment/handlers.ts:289-292` → `{available:false, reason:'unassigned'}` with no live pool | ⭐ read |
| ⛔⛔ The member's **history** carries **⛔ NO nominee/bank data — DELIBERATELY** | `contribution-history.ts:24-25` — *"DELIBERATELY NO other-member field, NO UTR, NO `tr`, **NO nominee/bank data**, NO full names, NO Tier-1 ciphertext"* | ⭐ read |
| The values are returned **UNMASKED** on purpose | `nominee-accounts.ts:18-20` — *"a masked account# cannot be transferred to"* | ⭐ read |
| ✅ Story **A** SHIPPED: the public page carries **⛔ NO banking coordinates** — only the nominee's name | `surface-fields.ts:675-681`; `PublicSahyogVivranNomineeAccount` (`sahyog-vivran.ts:276-289`) carries **`accountRank` + `accountHolderName` ONLY** | ⭐ **read — `done`, ⛔ no longer merely "ruled"** |
| Two accounts exist per claim, **EQUAL**, ⛔ no primary/secondary | 6.8 / 9.9 ([[project_nominee_bank_disbursement_channel]]) | ⭐ known |
| ⚠ The member path today decrypts **ONE** account, ⛔ not two | `member-pool/handlers.ts:539-547` — the second would be *"a Tier-1 decrypt with ⛔ no authorising purpose"* | ⭐ read |
| ⚠ The **VPA plaintext has ⛔ never been on a member wire** — ⚠⛔ **but `-191` cl.1 (TRUSTEE-RATIFIED) says it should be *"shown to the logged-in member"*** | `nominee-accounts.ts:44`, `:61` (`vpaPresent: z.boolean()`) **vs** `.decision-log.md:2184-2190` | ⭐ read ⇒ **D3** |
| ⚠ The member **LIST** now renders **लक्ष्य** | `member-drive-list.ts:187` `driveTargetInr`, via `resolveDriveTargetForMembers` (`-211` cl.1/cl.4) | ⭐ read ⇒ **D2** |

## ⛔ THE FOUR TRAPS

### Trap 1 — ⭐⭐ **`-189` cl.3 DOES ⛔ NOT FORCE THIS STORY'S SCOPE.** ⛔ READ THIS BEFORE D1

*"A member must see MORE than the public, ⛔ never less"* was the argument that produced `-190` cl.3.
⚠⛔ **But story A removed the banking coordinates from the public surface entirely.**

⇒ after A, the public has **⛔ NOTHING** in that field. ⭐ **A member ⛔ cannot see "less than nothing."**
⇒ **cl.3 is satisfied on banking by construction**, whatever this story does.

⭐⭐ **RE-VERIFIED AT `a2617869` AND IT HOLDS.** ⚠ ⛔ Not taken on the story's word — checked two ways:
the withdrawal **SHIPPED** (`45547a7b`), and it is a **DELETION, ⛔ not a flag** ⇒ there is ⛔ no gate
that could be provisioning-inert and ⛔ no way for the comparison to be vacuous.

⇒ ⛔⛔ **THE SCOPE OF MEMBER BANKING ACCESS IS A FREE, SEPARATE DECISION.** ⚠ Anyone arguing *"cl.3
requires it"* is arguing from an inversion that ⛔ no longer exists.

⚠⛔ **BUT ⛔ NOT ON EVERY AXIS — cl.3 STILL BINDS THE REST.** ⭐ It is satisfied on the **name** and the
**drive facts** by `8-16` and **E**; ⚠ and on **लक्ष्य** it is **⛔ NOT satisfied** — the member list
and the public index both render it and this detail, as previously scoped, did not. ⇒ **D2**.

### Trap 2 — ⛔⛔ THE LITERAL READING PUTS EVERY FAMILY'S ACCOUNT NUMBER IN EVERY POCKET IN THE PARIWAR

`-190` cl.3 reads, unqualified: *"a logged-in member sees the complete banking information."*

⚠⛔ **Read literally — any member, any drive, any state — that is every member of a Pariwar holding the
full account number and IFSC of every bereaved family that Pariwar has ever supported.** ⛔ On phones.
⛔ Screenshottable. ⛔ Forwardable.

⚠⛔⛔ **THE SCALE FIGURE, STATED THE WAY `-199` CORRECTED IT — ⛔ do ⛔ not write "43,000".**
`.decision-log.md:1702-1710`: the *"43,000"* is the **Panel's own ILLUSTRATIVE** number (`-190` cl.6),
⭐ **and the Panel said to ignore its arithmetic**. The sourced figure is **4 lakh (400,000) trust-wide**
(`epics.md:2130`) — ⚠ but the **operative multiplier is PER PARIWAR**, because D1(a)/(i) scopes access
to the member's own Pariwar, and ⛔ **NO ratified per-Pariwar membership figure exists.** ⛔ Invent none.

⭐⭐ **THAT MAY STILL BE A LARGER EXPOSURE THAN THE ONE THIS PROGRAMME JUST REMOVED.** The public page
was reachable by anyone with a link but **revocable by changing the page**; ⛔ this is reachable by
anyone with an account, **and it persists on devices, where it cannot be taken back**.

### Trap 3 — ⚠ THE MEMBER'S HISTORY EXCLUDES BANK DATA **DELIBERATELY**, AND THAT IS A SHIPPED RULING

`contribution-history.ts:24-25` names it: *"DELIBERATELY … **NO nominee/bank data** … NO Tier-1"*.

⇒ ⛔ this story ⛔ cannot simply widen the history read. ⚠ Under D1(a) it is **definitely a REVERSAL**
(`-199` Consequence 3): that file excludes exactly what (a) grants, for the same member and the same
drives. ⇒ it must be **NAMED and ARGUED**, ⛔ never absorbed.

### Trap 4 — ⛔ UNMASKED IS THE POINT, ⛔ NOT AN OVERSIGHT

Wherever the coordinates DO appear they are **unmasked** — *"a masked account# cannot be transferred
to."* ⛔ Do ⛔ not "improve" this with a masked display for safety; ⭐ that would break the one thing the
field exists for. ⚠ The safety question is **WHO SEES IT** (D1), ⛔ never **how much of it**.

---

## ⚠⛔⛔ ROUTED HERE BY STORY E's CODE REVIEW — ✅ NOW CARRIED IN **AC8** AND **AC9**

⭐⭐ **`11b-15` (story E) is `done`; its THIRD code-review pass (2026-09-09) ruled TWO items into THIS
story BY NAME (BigDev)** — `11b-15:860-861`, both `[x] [Review][Decision] ✅ RULED`.

⚠⛔ **They lived in this prose block ⛔ ONLY until 2026-09-10 — ⛔ no AC, ⛔ no Task** — the precise
failure [[feedback_spec_edits_must_propagate_to_tasks]] describes. ✅ **Now AC8 / AC9 + Tasks 5b / 5c.**

1. ⚠⛔ **AC3's FLOOR IS ⛔ NOT FULLY DISCHARGED BY E — `drive_href` AND `pool_canonical_identifier`
   RENDER HERE.** ⇒ **AC8**.
   ⚠⛔ **THE GROUND MATTERS:** E's AC5 rules its row `accessibilityRole="text"`, ⛔ never
   `button`/`link`, because *"a row that LOOKED tappable and did nothing"* is the family-13(c) failure.
   ⭐ **THIS** story owns the per-drive view, so the affordance belongs here — and it must be a REAL
   focusable control with a real handler and an accessible name.

2. ⚠⛔ **THE ZERO-DAY ROW HAS RATIFIED COPY, AND ⛔ DO ⛔ NOT RE-DERIVE IT.** ⇒ **AC9**.
   ⭐ Keys verified live: `zero_line.full` / `zero_line.no_family` in **`sahyog-shared`**, both locales
   (`packages/i18n/locales/{en,hi}/sahyog-shared.json:14-15`). ⛔ Consume them BY NAME — ⛔ never mint a
   second set (`-193` cl.3), and ⛔ never translate one.
   ⚠⛔ **THE VARIANT CHOICE IS A SAFETY PROPERTY:** `deceasedMemberName` is nullable and `t()` **THROWS**
   on an unsupplied token (`packages/i18n/src/resolver.ts:36-42`) ⇒ `.full` on a nameless drive would
   take down the WHOLE page.
   ⚠ **AND THE PERCENTAGE IS ⛔ NOT SUPPRESSED AT ZERO** — the public meter renders at 0 too.

---

## Acceptance Criteria

### AC0 — Governance first
**Task 1** sections `epics.md` (⛔ **not** Task 0, which is `[x]` *"RULE D1"*); flips nothing until the
Preflight clears; lands in a `governance:` commit before any code.
**And** ⛔ it does ⛔ not proceed while **D2** or **D3** is open — ✅ both ruled.
**And** ⛔⛔ **it does ⛔ NOT proceed while STOP 1 is open**: the 2026-09-05 ruling must reach
`.decision-log.md` **in that same commit**, ⛔ before AC10 is built.

### AC1 — A member can open ONE drive from the list
A detail view, reached from story **E**'s fourth tab, for any drive **E** lists.
⚠⛔ **THE STATE TUPLE, AND ⛔ ITS OWN:** pool states `live` · `closed` · `settled` (⛔ never `spawned`,
`-196`). ⭐ Declare a **NEW named fragment for this surface** — `-196` Consequence 2 and
`public-read.ts:283-284` both forbid sharing or parameterising an existing tuple.
⚠⛔ **THE WIRE TOKEN IS `verified`, ⛔ NOT `settled`** — `MemberDriveStage = ['live','closed','verified']`
(`packages/contracts/src/contributions/member-drive-list.ts:43`), mapped by the total
`PUBLIC_STATUS_BY_POOL_STATE` (`packages/domain/src/pool/public-read.ts:169-173`).
⚠⛔⛔ **⛔ THE TWO VOCABULARIES ⛔ MUST ⛔ NOT BE MIXED IN AN ASSERTION.** ⭐ `live`/`closed`/**`settled`**
are **POOL STATES** (domain); `live`/`closed`/**`verified`** are **WIRE TOKENS** (contract). ⇒ every
fence or comparison test must say **which side of the boundary it asserts on** — ⛔ a wire assertion
written against `settled` matches ⛔ nothing.

### AC2 — It shows at least everything the public drive page shows
For the same drive: the nominee's name, the drive facts, the stage (⭐ story **B**'s vocabulary), the
contributor count and the appeal outcome.
**And** a **comparison test** proves the superset.
⚠⛔ **AGAINST THE RIGHT MAP — ⛔ NOT E's.** This is the **detail**, so the floor is
**`SAHYOG_VIVRAN_FIELD_IDS`** *and* **`SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS`**
(`surface-fields.ts:646-661`, `:672-683`), which are **deliberately split**. ⛔ E's test reads
`SAHYOG_DRIVE_ROW_FIELD_IDS` — the **index** map; copying it proves nothing about this surface.
⚠⛔ **AND `confirmedPercentage` IS ⛔ NOT IN EITHER FLOOR MAP — ⛔ do ⛔ not carve out what was never in.**
⭐ Traced 2026-09-11: `SAHYOG_VIVRAN_FIELD_IDS` carries **no percentage field at all** (its count field is
`confirmedContributionCount`), and the nominee map carries `accountRank` + `nomineeAccountHolderName`
only. `driveProgressPercentage` lives ⛔ **ONLY** in `SAHYOG_DRIVE_ROW_FIELD_IDS` — ⭐ the index map this
AC forbids three lines above. ⇒ `-207` cl.1 governs the public **INDEX** wire (11b.14's meter), ⛔ not
this surface, and the old *"two fields"* carve-out (which named one) was **vacuous against the stated
floor**. ⛔ Do ⛔ not reinstate it.
**And** ⭐ **लक्ष्य per D2(B):** it renders on a `live` drive and ⛔ is ABSENT on `closed`/`settled`
— ⛔ never `null` — mirroring the list's own producer guard.
⚠⛔⛔ **AND IT IS GATED — `reveal_to_members`, FAIL-CLOSED. ⛔ THIS IS ⛔ NOT OPTIONAL POLISH.**
`-212` cl.1: a member sees the figure ⛔ **only** where a `super_admin` has switched `reveal_to_members`
ON for that Pariwar (`-190` cl.7(b)/(c); `-211` cl.2/cl.3). ⭐ The read goes through
**`resolveDriveTargetVisibility`** (`packages/domain/src/pool/drive-target-policy.ts:233`), ⛔ **NEVER**
`getDriveTargetVisibilityRow` — *"a caller interpreting it is exactly how a fail-closed default becomes
fail-open"* (`-211` cl.3). ⚠⛔ A regression here is a **DISCLOSURE defect, ⛔ not a UI defect**
(`-211` Consequence 4). ⛔ ⛔ No Pariwar has a row ⇒ ⛔ nothing renders on the day this ships, and that
is **correct**, ⛔ not a bug to "fix".
⚠⛔⛔ **AND THE NUMBER FORM IS RATIFIED — ⛔ do ⛔ not re-derive it and ⛔ do ⛔ not format it here.**
⭐ **Derivation:** `-204` **cl.2** — लक्ष्य **IS** `assignedCount × pools.fixed_amount`; ⛔ there is ⛔ NO
setter and ⛔ nobody types it. ⭐ **Form:** `-206` **cl.3** (Trustee-ratified) — short-form at and above
**₹1,00,000**; **exact below ₹1 lakh**; crore joins at ₹99.99 lakh. ⚠⛔ The **₹10-lakh cut-off is the
CONTRIBUTED amount's rule and does ⛔ NOT apply to the target** (`-211` cl.5). ⛔ That clause exists
because **₹300 once rendered as `₹ 0 lakh`.**
⭐ **Copy:** consume **`drive_target`** (`"Expected: {amount}"`) from **`sahyog-shared`** BY NAME — ⛔ never
mint a second key (`-193` cl.3, `-206` cl.1). ⚠ `{amount}` arrives **ALREADY FORMATTED**. ⚠⛔ F is its
**THIRD** consumer (after `sahyog-render.ts:943` and `MemberDriveList.tsx:485`) ⇒ **`$comment.drive_target`
currently reads *"It now has TWO"* and owes a NAMED amendment** ([[feedback_supersede_never_reinterpret]]).
⚠ ⛔ **AND ⛔ NOT A SUPERSET CLAIM:** the public **DETAIL** page renders ⛔ no target in ⛔ any stage ⇒
D2(B) is a **member-side ADDITION**, ⛔ not a `member ≥ public` assertion, and the comparison test
⛔ cannot cover it against the named floor. ⛔ Do ⛔ not write it as one.
**And** ⚠ the public **name** gate is **PROVISIONING-INERT** (`public-pages/handlers.ts:934-955`), so on a default
`full_name` Pariwar a member already sees a name **nobody can see publicly** (`-209` cl.2). ⛔ That
asymmetry is ⛔ NOT a defect and the comparison must ⛔ not flag it.

### AC3 — The banking coordinates appear per **D1**'s ruled scope, and ⛔ nowhere else
⛔ The boundary is **enforced server-side** — ⛔ never by hiding a field the response already carried.
**And** a test asserts a member **outside** the ruled scope receives a response with the coordinate
keys **ABSENT** (⛔ not `null`) — ⭐ the discipline **story A** shipped, ruled at **`-205` cl.9**
(*"the keys are ABSENT, ⛔ never `null` (the 11b.11 shape)"*).
⚠⛔ **⛔ NOT `-165`** — that entry is the Tier-1 allowlist widening and contains ⛔ no `.strict()`, ⛔ no
`absent`, ⛔ no `null`. The earlier citation was wrong.

### AC4 — Where they appear, they are UNMASKED and COMPLETE
Per Trap 4 — **full account number, IFSC, holder name, bank and branch.**
✅⛔ **THE UPI ID IS ⛔ NOT IN THIS LIST, AND THAT IS NOW RULED — `-212` cl.2, option (D).**
⛔ Do ⛔ not add `vpa` to this story's wire, on ⛔ any drive, in ⛔ any stage.
⭐ The VPA is satisfied **on the PAYMENT screen** instead — ⚠⛔ **which is NEW WORK on ANOTHER surface
and is ⛔ NOT this story's** (`-212` Consequence 3). ⛔ Do ⛔ not absorb it here, and ⛔ do ⛔ not let it
lapse: `-191` cl.1 already lapsed once.
✅ **BOTH ACCOUNTS RENDER — ⛔ and this is ⛔ NOT a reversal** (`#decision-2026-09-10-213` cl.1).
⭐ The list's one-decrypt rule (`member-pool/handlers.ts:536-550`) governs the **HOLDER NAME**, which is
*"the SAME nominee"* twice ⇒ a second decrypt buys ⛔ nothing there. ⚠ **This surface renders
`account_number` and `ifsc`, which ⛔ DIFFER per account** ⇒ the second decrypt returns information the
first does ⛔ not carry, under the purpose `-199` already granted. ⭐ And the money **can have gone to
both** — the two are *"EQUAL payment destinations, the **donor's choice**"* (`nominee-accounts.ts:11`)
⇒ rendering one would be **incomplete by construction**.
⛔⛔ **The list's and the pay screen's one-decrypt behaviour is CORRECT and is ⛔ NOT to be touched.**
⚠⛔⛔ **THE DIFFERING-HOLDER-NAME CASE — ⛔ THE BUILD RULE STANDS, ⛔ ITS OLD GROUND DOES ⛔ NOT.**
⭐ **SURFACE both names, ⛔ never pick one**, and ⛔ encode ⛔ no assumption either way. ⭐ That much is
unchanged and is what Task 5 builds.
⚠⛔ **BUT *"nobody has said which"* WAS ⛔ FALSE — ⛔ corrected 2026-09-11, and this story's OWN Dev Notes
already said so.** `deferred-work.md` **`D5-subject (i)`** (the consent-subject gap) rules it: 6.8's
**D1** removed the linkage because the accounts are a **claim-scoped payment channel**, ⛔ not one row
per declared nominee ⇒ ***"the SCHEMA is the authority; the comment is recorded with a trigger."***
⇒ ⭐ **two differing holder names are a LEGITIMATE state**, and the artefact that is wrong is the
**code comment** at `member-pool/handlers.ts:534-542`, ⛔ not the schema.
⚠⛔ **⇒ THIS IS ⛔ NOT A PANEL QUESTION AND IS ⛔ NOT ROUTED WITH TASK 0e.** ⛔ Amending a doc-block to
match a ruled authority is ⛔ not a governance act.
⭐⭐ **AND A SIBLING IS ALREADY BUILDING ON THE ANSWER — ⛔ IT WAS NEVER NAMED HERE.**
`6-18-nominee-holder-name-on-the-verification-console` is **`ready-for-dev`** (Epic 6, Trustee-commissioned
2026-09-05); its **AC1** already orders *"for **each** of the two accounts: the account holder name …
⛔ the story does ⛔ not pick one"*, on the same ground. ⇒ ⭐ **align with `6-18`, ⛔ do ⛔ not re-litigate**
([[feedback_circular_deferral_between_sibling_stories]]).
⚠⛔⛔ **THE LABEL IS `Nominee Name`, ⛔ NEVER "Account holder"** — `-190` **cl.2**, re-affirmed `-206` cl.2.
⛔⛔ **AND ⛔ NOT VIA `nominee.label` — ⛔ THAT TOKEN RENDERS THE WRONG STRING.** ⚠ Traced live 2026-09-11:
`packages/i18n/locales/en/member-drive-list.json:48` resolves `nominee.label` to **`"Nominee"`** (hi:
`"नॉमिनी"`), ⛔ **not** *"Nominee Name"* — and its own `$comment.nominee` **claims it carries the ruled
wording, which is ⛔ false**. ⇒ following the old instruction shipped a label that **fails this AC's own
first sentence**.
⭐ **The token that DOES render the ruled string is `label.account_holder`**
(`packages/i18n/locales/en/sahyog-vivran.json:34` = *"Nominee Name"*; hi `"नामिती का नाम"`), confirmed
against `-190` cl.2's text. ⚠ ⛔ Its KEY name says "account_holder" and its VALUE is the ruled
*"Nominee Name"* — ⛔ do ⛔ not "fix" the key.
⚠ `MemberDriveList.tsx:519-520` still routes `nominee.label` here by name; ⇒ **amend that doc-block and
`$comment.nominee` BY NAME** ([[feedback_supersede_never_reinterpret]]), ⛔ never silently.
⚠ Two Hindi transliterations are already shipped (`"नॉमिनी"` vs `"नामिती का नाम"`) — ⛔ do ⛔ not
reconcile them by side effect.

### AC5 — Every read of a coordinate is ATTRIBUTABLE — ⚠ a **NEW** posture, ⛔ not an inherited one
⚠ This surface hands Tier-1 payment coordinates to a human. ⇒ the read carries an **audit line**
naming the member, the drive and the instant.
⚠⛔⛔ **THIS IS A NAMED DEPARTURE, ⛔ NOT "the same posture the public page takes."** The cited
precedent (`writeAppealReversalDisclosureAudit`, `public-pages/handlers.ts:840-905`) writes
**`actorId: null, actorRole: null`** — *"⛔ No actor … the caller is an anonymous visitor"* — and its
own doc-block says ***"⛔ Do not widen this to log every request."*** ⇒ this story departs on **both**
axes (attributed, and high-volume) and must **argue** it rather than claim inheritance.
**And** ⛔ the audit line names the **canonical identifier**, ⛔ never a token or an account number
(⭐ this half DOES match the precedent — `handlers.ts:665-670`: a token *"would additionally write a
live public ADDRESS into the durable audit chain"*).
**And** ⭐ the **write volume is SIZED before shipping** (`-199` Consequence 2).

⚠⛔⛔ **AND THE SIZING PREMISE IS WRONG IN THE STORY'S FAVOUR — ⭐ TRACED 2026-09-10, ⛔ not assumed.**
`-199` Consequence 2 says the chain *"takes a write on every detail open"* — **singular**. ⛔ It is
⛔ not one. The real shape:

- ⭐ **ONE audit line per ENCRYPTED FIELD DECRYPTED, ⛔ not per request and ⛔ not per row.**
  `packages/domain/src/encryption/envelope.ts:92-93` calls `kms.decryptDek(...)` then fires `auditHook('decryptDek', …)` on **every**
  `decryptTier1`, and ⛔ **there is ⛔ NO DEK cache** — each ciphertext embeds its own DEK.
  `createKmsAuditHook` (`apps/api/src/audit/audit-log-sink.ts:200-219`) routes each one into the **same**
  global-chain writer.
- ⚠ This surface's encrypted fields (`claim_nominee_bank_accounts.ts:61-67`): `account_holder_name`,
  `account_number`, `ifsc` (+ optional `vpa`). ⭐ `bank_name` / `branch` are **Tier-3 plaintext** and
  cost nothing.
- ⇒ **per detail open: 1 (deceased name) + 3 × (accounts rendered) + AC5's own line.** ⚠⛔ **`-213`
  cl.1 rules BOTH accounts in ⇒ the operative figure is the ≈8 end, ⛔ not ≈5** — and ⛔ **seven of
  those eight are INVISIBLE**, emitted by the crypto layer, ⛔ not by AC5's code.

⚠⛔⛔ **THE UNIT IS PINNED HERE, ⛔ ONCE — AC5 WRITES ⛔ EXACTLY ONE LINE, ⛔ PER DETAIL OPEN.**
⛔ **⛔ NOT one per coordinate.** ⭐ AC4 renders **five** coordinates × **two** accounts = **ten**
coordinate reads; a per-coordinate rule would make the real figure **≈17**, ⛔ not ≈8, and would
multiply the deployment-wide advisory lock by ten on the ordinary browsing path.
⇒ ⭐ **AC5's line names the member, the drive and the instant — ONE line, ONE open.** ⚠ Tasks 4 and 6
say so in those words; ⛔ if any of the three ever disagree again, **this sentence governs**
([[feedback_spec_edits_must_propagate_to_tasks]]).

⚠⛔ **WHAT EACH ONE COSTS.** `writeAuditEntry` (`packages/domain/src/audit/write.ts:118-199`) holds
`pg_advisory_xact_lock(AUDIT_CHAIN_LOCK_KEY)` — ⛔ **ONE fixed key, deployment-wide, cross-tenant** —
across `BEGIN` → lock → tail read → `SELECT now()` → `INSERT` → `COMMIT`: **5-6 sequential round trips
per line**, committing its own transaction. ⭐ The tail read itself is cheap (`audit_log_entries_seq_uq`
serves `ORDER BY seq DESC LIMIT 1`); ⚠ **the cost is the SERIALIZATION, ⛔ not the query.**

⭐⭐ **AND IT IS ⛔ NOT NEW — story E ALREADY DOES THIS, SHIPPED.** Its list decrypts two names **per
row** under `DIRECTORY_DECRYPT_CONCURRENCY = 8` (⚠ **effectively 4** — `member-pool/handlers.ts:388-397`
**halves** it unconditionally so the two-per-row inner `Promise.all` stays inside one cap; ⛔ the
argument is unchanged, but ⛔ do ⛔ not quote "8" as the row bound) ⇒ routine browsing **already**
takes the global lock,
today. ⇒ ⛔ this is a **PRE-EXISTING condition F AMPLIFIES**, ⛔ not a defect F introduces — ⭐ and
⛔ neither AC5 nor `-199` had noticed it. ⚠ Every other writer in the repo is a low-frequency
**administrative WRITE**; ⭐ **F is the first surface where a Tier-1 READ is the ordinary path.**

⇒ ⭐ Task 6 sizes the **real** number, ⛔ not AC5's assumed one. ⛔ Not a blocker; ⚠ ⛔ do ⛔ not
"optimise" it by dropping the KMS hook — that hook is the FR-47 record of **which key opened which
field**, and removing it to buy throughput would trade a **crypto audit obligation** for latency.

### AC6 — The member-facing sentence is WRITTEN
⭐ It is the sentence in **📜 Policy meaning** above, verbatim. ⛔ The two ⛔ must ⛔ not drift apart.

### AC7 — ⛔ Nothing else moves
⛔ No public surface · ⛔ no masking behaviour (⭐ dormant per `-190` cl.4) · ⛔ no change to the 9.9
donor path's own gate · ⛔ no contributor names · ⛔ no `spawned`.
✅ **THE TARGET IS RULED, ⛔ not excluded — `-212` cl.1: `live` ONLY.** ⚠ ⛔ Do ⛔ not restore the
retired *"⛔ no target"* sentence (`-211` cl.1 struck it at all three sites in story E); ⛔ and ⛔ do
⛔ not read D2(B) as that sentence returning — the figure **renders**, on one stage.
**And** ⭐ AC7 is discharged by a **fence test**, ⛔ not by assertion — the shape E's AC8 uses.

### AC8 — ⭐ The drive is REACHABLE: `drive_href` + `pool_canonical_identifier` RENDER here
Routed obligation 1. ⭐ E carries both on the member wire (`poolCanonicalIdentifier` `:121`,
`publicToken` `:131`) and renders **neither** — `publicToken`'s only uses there are `keyExtractor`
(`MemberDriveList.tsx:347`) and the dedupe (`useMemberDriveListQuery.ts:111`), ⛔ both keying, ⛔ neither
a render.
⚠⛔ **`drive_href` IS `publicToken` ON THE MEMBER WIRE** — there is ⛔ no key literally named
`drive_href`; it is a public **field-id** mapped at `apps/public/tests/…/member-drive-list-field-floor.test.ts:67`.
**And** the affordance is a **REAL focusable control**: a real handler, an accessible name, and
`accessibilityRole` matching what it does.
**And** ⚠ ⛔ **NOTE THE TENSION WITH AC5, RECORDED SO IT IS ⛔ NOT RE-DISCOVERED:** AC5 refuses to put a
token in the audit chain because it *"would additionally write a live public ADDRESS into the durable
audit chain"* — while this AC puts that same `publicToken` **on a member's screen**, where Trap 2's
own screenshottable/forwardable logic applies. ⭐ Survivable (`rotatePoolPublicToken` exists, and
`publicToken` is the **only** address form) — ⛔ but it is a **deliberate asymmetry**, ⛔ not an oversight.
**And** ⚠⛔ **DISCHARGING THIS TURNS A GREEN TEST RED, BY DESIGN** —
`apps/mobile/tests/unit/drive-list-render.test.ts:272` asserts E's row has ⛔ no `onPress` and ⛔ no
`button`/`link` role, enforcing `MemberDriveList.tsx:413-416`. ⇒ **amend E's AC5 record and that test
BY NAME** ([[feedback_supersede_never_reinterpret]]) — ⛔ never delete either quietly.

### AC9 — ⭐ The zero-day drive renders the RATIFIED copy, ⛔ not a derived one
Routed obligation 2. A `live` drive with ZERO confirmed contributions ⛔ must ⛔ NOT render a
*"₹ 0 contributed · 0 confirmed"*-shaped sentence. ⭐ Consume `zero_line.full` / `zero_line.no_family`
from **`sahyog-shared`** BY NAME (`-206` cl.4).
**And** ⭐ the **variant is chosen on nullability** — `.no_family` when `deceasedMemberName` is null,
because `t()` throws on an unsupplied token and would take down the page.
**And** ⛔ the percentage is **⛔ NOT suppressed at zero**.
**And** ⚠ **the ACCESSIBLE NAME obeys the same rule** — E's FOURTH pass (2026-09-10) found a
screen-reader member still hearing *"0 contributions confirmed. ₹0 contributed so far."* on a row whose
sighted copy the Panel had softened, and added `row.a11y.zero` / `row.a11y.zero_no_family` (name/code
+ stage only). ⭐ **The INVARIANT travels; those KEYS do ⛔ not** — they are `member-drive-list`-namespaced
**row** strings. ⛔ A new a11y key in this surface's own namespace is correct and is ⛔ NOT a `-193`
cl.3 double-mint (that fences the **shared stage/line vocabulary**, which this surface still consumes
by name).
**And** ⚠ `-207` **cl.2**: where a `closed`/`verified` drive's amount is **₹0**, the "About this drive"
sentence renders **NOTHING** — ⛔ no placeholder, ⛔ no marker, ⛔ no partial sentence.

### AC10 — ⭐ The Panel's own message block and the `Nominee full name` | `District` table RENDER here
⛔⛔ **GATED ON STOP 1 — ⛔ do ⛔ not build this until the decision entry lands AND B's keys exist.**
⭐ Ratified 2026-09-05, DR + KB (`…-11b12-under-funded-commitment-claim.md` **§8.1**, routed at
**§9.1 row 3**): ***"B can ship the shared copy source now. E/F consume it later."*** ⚠ §8.3(2): the
five-paragraph text *"is written for a **PAGE**"* ⇒ ⭐ **this** surface carries the full block; E's row
does ⛔ not.
⚠⛔⛔ **B's KEYS DO ⛔ NOT EXIST TODAY** (`sahyog-shared` carries `index_line.*` ⛔ ONLY) and `11b-12` is
**`done`** ⇒ ⛔ **the source needs a named home BEFORE this AC can be built.**
**And** ⭐ a **two-column table — `Nominee full name` | `District` — sits ABOVE the message**, on the
member view (the public view is ⛔ not this story's).
**And** ⛔⛔ **CONSUME THE PANEL'S OWN WORDING FROM `sahyog-shared` BY NAME** — ⛔ never re-derive it,
⛔ never translate it, ⛔ never mint a second copy (`-193` cl.3, `-206` cl.1). ⚠ Story **B** ships it;
⛔ if the key is absent at build time that is a **STOP**, ⛔ not a licence to author copy at a render
site ([[feedback_story_validate_footguns]] #8).
**And** ⚠ **the nominee's name here is FULL NAME** (`-205` cl.1, built in **D**) — ⛔ not the per-Pariwar
`public_name_presentation_mode`, which has ⛔ **no subject** for a claim-scoped value.
**And** ⚠ **`district` already ships on the member wire** and E renders it per row ⇒ ⛔ omitting it here
would make **F the surface that DROPS it**.

---

## ⚖️ Decisions

### ✅ D1 — **RULED (a)/(i) by BigDev, 2026-09-04** (`#decision-2026-09-04-199`)

> ⭐⭐ **THE RULING, VERBATIM:** *"Any authenticated member may access the member-facing Sahyog Vivran
> detail for any Trust Pariwar drive, including its full nominee banking coordinates, subject to the
> drive's lifecycle and member-surface access controls."*
>
> ⇒ **option (a).** ⛔ BigDev's recommendation **(b)** is ⛔ **NOT taken** — recorded plainly rather
> than quietly narrowed.
>
> ⚠⛔ **DECISION TYPE: Author-committed (BigDev). ⛔ NOT Trustee-ratified** (`.decision-log.md:1638` —
> *"⛔ no 'by DR and KB' line"*). ⭐ It applies Trustee-ratified `-190` cl.3 **literally**. ⚠ That
> matters for **D3**: an author-committed entry ⛔ does ⛔ not silently override a standing prohibition
> recorded elsewhere.
>
> ⭐ **Two qualifiers, ⛔ both binding:** *"lifecycle"* ⇒ `live` · `closed` · `settled` only.
> *"member-surface access controls"* ⇒ ⭐ **the session scope IS the control** — ⭐ re-verified: member
> routes carry ⛔ **no `:pariwarId` parameter** (`member-pool/routes.ts`, `payment/routes.ts`); it comes
> from `request.requestContext.pariwarId` (`member-pool/handlers.ts:102-108`), and
> `claim_nominee_bank_accounts` runs RLS **FORCE**d (`packages/domain/migrations/0056_claim-nominee-bank.sql:59-66`) under `SET LOCAL
> app.pariwar_id` (`db.ts:117`).
>
> ✅ **SCOPE CONFIRMED 2026-09-04: (i) — the member's OWN Pariwar.** ⛔ Cross-tenant (ii) is ⛔ NOT meant.
> ⇒ ⭐ **AC3's cross-Pariwar test is the ONLY remaining boundary**, and therefore the load-bearing one.
>
> ⚠⛔ **AND WHAT (a) DISCLOSES, STATED ONCE — ⛔ not re-litigated:** every authenticated member of a
> Pariwar can read the **full account number, IFSC and holder name of every family that Pariwar has
> ever supported** (⚠ `-199` itself enumerated **FOUR** items — it also named the **UPI ID**, which
> `-212` cl.2 has since moved to the payment screen; ⭐ recorded because that four-item enumeration is
> what disagreed with the working note, ⛔ so the trim is NAMED, not silent) — on their phone, screenshottable, forwardable, persisting on devices.
> ⭐ **BigDev's call, and it is made.** ✅ The Panel disclosure note `-199` recommended was **WRITTEN**
> (Task 0c).

### ✅ D2 — **RULED (B) by the TRUSTEE PANEL, 2026-09-10** (`#decision-2026-09-10-212` cl.1)

> ⭐⭐ **THE RULING:** the detail page renders **"Expected" / लक्ष्य** on a **`live`** drive ⛔ ONLY —
> ⛔ not on `closed`, ⛔ not on `settled`. ⭐ **Trustee-ratified, DR + KB.**

⭐ **WHY IT LANDS THERE:** it mirrors the member LIST exactly (`-211` cl.1, whose producer guard already
enforces `status === 'live' ? true : driveTargetInr === undefined`) and `-204` **cl.12**'s ruled slot
(*"right of the progress bar, on a LIVE row"*). ⚠ ⛔ **NOT cl.2** — cl.2 is *"लक्ष्य IS THE DERIVED
TOTAL"*; the slot quote is cl.12's 2026-09-08 correction table (routing note §12.1 answer 4). ⭐ The
mis-cite came in from `-212` cl.1 and is corrected here, ⛔ not propagated.

⭐ **AND `-189` cl.3 HOLDS:** the public index is **live-only** too ⇒ a member opening a `closed` drive
sees ⛔ no less than a stranger. ⚠ ⛔ The earlier worry that (B) would put the detail below the list is
⛔ answered — under (B) the two agree **by construction**.

⛔ **THE GATE IS UNCHANGED** and was never in question: ⛔ only where a `super_admin` has switched
`reveal_to_members` ON; fail-closed; ⛔ no Pariwar has a row ⇒ ⛔ nothing renders on the day this ships.

⚠ **Task 2 owes its OWN named live-only fragment** — `-196` Consequence 2 and `public-read.ts:283-284`
forbid sharing or parameterising the list's tuple (`-212` Consequence 2).

### ✅ D3 — **RULED (D) by the TRUSTEE PANEL, 2026-09-10** (`#decision-2026-09-10-212` cl.2)

> ⭐⭐ **THE RULING:** the nominee's **UPI ID is ⛔ NOT on this page**. ⭐ It is **ADDED to the PAYMENT
> screen**, where a member is actually asked to pay. ⭐ **Trustee-ratified, DR + KB.**

⇒ ⭐ **AC4 renders FIVE coordinates** — account number, IFSC, holder name, bank, branch. ⛔ No `vpa`.

⚠⛔⛔ **AND THE OTHER HALF IS ⛔ NOT THIS STORY'S — ⛔ do ⛔ not absorb it, ⛔ do ⛔ not drop it.**
`-212` Consequence 3: the payment-screen change touches `NomineeBankAccountView`
(`nominee-accounts.ts`), the `nominee-accounts` handler's decrypt, and `pay.tsx:473-480` — ⭐ which
today renders account holder, bank, **full account number** and IFSC, and ⛔ **no VPA row**. ⇒ it needs
a **named home** recorded **before F ships**. ⚠ `-191` cl.1 already lapsed once for want of one.

⚠⛔ **THREE THINGS THAT WORK CARRIES, RECORDED HERE SO THEY TRAVEL:**
⭐ (a) the `.strict()` additive-field trigger **FIRES** — adding `vpa` blanks that screen on installed
older builds until they update (`-212` Consequence 4); ⭐ (b) **a UPI-ID label must be MINTED** — story A
deleted `label.vpa` and ⛔ none exists on any member surface (Consequence 5); ⭐ (c) the pay screen
labels the nominee *"Account holder"*, which `-190` cl.2 rules ⛔ not to be used — ⚠ whether cl.2 binds
⛔ only the public surface is **⛔ unresolved** and is ⛔ **not** to be fixed by side effect (Consequence 6).

⭐⭐ **WHAT cl.2 SUPERSEDED, NAMED:** `deferred-work.md` item **(e)**'s *"do ⛔ NOT … add `vpa` to that
wire; that would be a NEW Tier-1 exposure ⛔ nobody ruled on."* ⚠ Its ground was **⛔ false when
written** — `-191` cl.1 had ruled, and item (e) quotes it in the same paragraph. ⇒ item (e) is amended
to record the supersession **and** the wrong ground ([[feedback_closure_language_precision]]).

## ⚠ What this story does ⛔ NOT do

⛔ No public surface · ⛔ no masking change (⭐ dormant, `-190` cl.4) · ⛔ no change to the 9.9 donor
path's own live-pool gate · ⛔ no widening of `contribution-history` without naming Trap 3's reversal ·
⛔ no contributor names · ⛔ no `spawned` · ⛔ no masked display of a coordinate (Trap 4) · ⛔ **no `vpa`
on any wire** (✅ **D3(D)** — it goes on the PAYMENT screen, ⛔ a different surface, ⛔ not this story) ·
⛔ **no लक्ष्य on a `closed` or `settled` drive** (✅ **D2(B)**).

⚠⛔ **⛔ AND ⛔ NOT the payment-screen work itself** — ruled, ⛔ but ⛔ NOT F's (`-212` Consequence 3);
✅ it has a named home in **`8-17`**.
⚠⛔ **AND ⛔ NOT the PUBLIC view of AC10's table and message block** — the 2026-09-05 ruling binds both
views; ⭐ **this story renders the MEMBER one only.**

⚠⛔ **AND ⛔ DO ⛔ NOT TOUCH `SahyogVivranEntry`.** `apps/mobile/components/sahyog-vivran/SahyogVivranEntry.tsx:22-41`
is a **Trustee-ratified** member-app path to the same drive's public page (`-200` cl.4, *"Phone-app
member should reach the page"*): ⛔ *"do not delete this entry on the ground that 'the public site is
reachable anyway'; do not fold it into a generic outbound-links screen … Any of those needs a PANEL
decision superseding `-200` cl.4."* ⚠ ⇒ after this story a member has **two** views of one drive — this
one unredacted, that one carrying no coordinates. ⭐ That divergence is **expected and recorded**, ⛔ not
a defect to "fix".

---

## Tasks / Subtasks

- [x] **Task 0 — RULE D1** — ✅ **RULED (a)** 2026-09-04 (`-199`).
- [x] **Task 0b — CONFIRM THE SCOPE** — ✅ **CONFIRMED (i): the member's OWN Pariwar**, 2026-09-04.
- [x] **Task 0c — the Panel disclosure note** — ✅ **WRITTEN AND COMMITTED** 2026-09-04:
      `trustee-panel-disclosure-note-2026-09-04-member-banking-access-quantification.md` (commit
      `468d43c1`). ⛔ FOR INFORMATION; ⛔ no reply required and ⛔ nothing waits on it.
- [x] ✅ **Task 0d — THE PREFLIGHT STOP — DISCHARGED.** `#decision-2026-09-10-212` landed 2026-09-10,
      ⛔ before any code. **D2 → (B)** `live` only; **D3 → (D)** the UPI ID goes on the payment screen.
      ⚠ Read its **Consequences 3-6** before Task 2.
- [x] ✅ **Task 0e — DISCHARGED: the pay-screen work has a NAMED HOME — story `8-17-nominee-vpa-on-the-payment-screen`** (`ready-for-dev`, ⛔ zero open decisions), which also carries §8.4(ii) and `-190` cl.2's *"Account holder"* conflict as recorded questions. ⭐ `-191` cl.1 will ⛔ not lapse twice.
- [x] ~~**Task 0e (original wording) — GIVE THE PAY-SCREEN WORK A NAMED HOME**~~ (`-212` Consequence 3) — ⛔ NOT built
      here. ⭐ A story of its own, or an explicit `deferred-work.md` entry with a trigger, recorded
      **before this story ships**. ⛔ A ratified instruction must ⛔ not lapse twice.
      ⚠⛔ ~~**AND THE SAME PACKET CARRIES §8.4(ii)** — ⛔ the Panel names which.~~ ⛔⛔ **WITHDRAWN
      2026-09-11: THERE IS ⛔ NOTHING FOR THE PANEL TO NAME.** ⭐ `deferred-work.md` **`D5-subject (i)`**
      already ruled it — 6.8's **D1** made the accounts a **claim-scoped payment channel** ⇒ ***"the
      SCHEMA is the authority"***, so two differing holder names are a **legitimate state** and the
      wrong artefact is the **code comment** (`member-pool/handlers.ts:534-542`). ⚠ `6-18` is
      **`ready-for-dev`** on that same ground. ⇒ ⭐ amending a doc-block is ⛔ **not** a governance act;
      see **AC4**. ⛔ Row kept as the record ([[feedback_record_unattested_no_backfill]]).
- [ ] **Task 1 — GOVERNANCE** (AC0, **AC6**, **AC10**) — ⭐ a **SECTION** in `epics.md`, ⛔ not an
      annotation (this is a new member-app surface with ⛔ no parent there — the `8-16` / `11b-15`
      precedent — ⭐ **the `11b-15` row block**, *"⛔ No `### Story 11b.15` SECTION in `epics.md` — owes
      one (Task 0)"* and *"⭐ **A SECTION, ⛔ NOT AN ANNOTATION**"* (`sprint-status.yaml:17685`, `:17739`
      **as of 2026-09-11** — ⚠⛔ that file is a **newest-first ledger**, so ⛔ **navigate by the `11b-15`
      row block, ⛔ not by the number**). ⛔ **NOT** `:17545-17548`, the pointer this story carried until
      2026-09-11: that was **11b-13**'s block, and it says that story owes an **ANNOTATION** — the
      opposite of what it was cited for.);
      flip the sprint row; record D2/D3 and **AC6's sentence**; ⛔ one `governance:` commit, ⛔ no code.
  - [ ] ⛔⛔ **STOP 1 FIRST — WRITE THE MISSING DECISION ENTRY** for the 2026-09-05 §8.3(3)/§8.5 ruling
        (AC10), naming the routing note and `11b-12:583-600` as its record. ⛔ Nothing else in this task
        lands before it ([[feedback_governance_commits_precede_implementation]]).
  - [ ] ⚠⛔ **REWRITE THIS STORY'S OWN `sprint-status.yaml` ROW BLOCK (`:17694-17717`) — it is stale FIVE
        ways** and is the block a reader reaches via the ledger: *"owes an **ANNOTATION**"* (⇒ SECTION);
        *"**BLOCKED ON A AND E**"* (⛔ both `done`); *"RECOMMENDED … a one-page disclosure note"*
        (⛔ discharged, `468d43c1`); ***"43,000"* TWICE** (⛔ `-199` corrected it — v0.6's *"swept 7 sites"*
        ⛔ never reached this row, [[feedback_story_validate_footguns]] #16); and *"BigDev **recommends
        (b)** … if (a) is wanted it needs the **PANEL**"* (⛔ D1 **RULED (a)**, five lines above in the
        same block). ⭐ Keep the superseded text as a **dated, struck line**, ⛔ never delete it.
  - [ ] ⚠ **AMEND THE TWO DOC-BLOCKS THIS STORY SUPERSEDES, BY NAME** — `$comment.drive_target`
        (*"It now has TWO"* ⇒ three) and `$comment.nominee` + `MemberDriveList.tsx:519-520` (which route
        `nominee.label` here, and whose ruled-wording claim is **false**; see AC4).
- [ ] **Task 2 — The read** (AC1, AC2, AC3) — a member-scoped per-drive read with its **OWN** named
      visible-state fragment.
      ⭐ **AND its OWN named `live`-only target fragment** (D2(B); `-212` Consequence 2) — ⛔ do ⛔ not
      share or parameterise the list's tuple. ⚠ On the **POOL STATES** `closed`/`settled` (⛔ wire
      `verified`) the key is **ABSENT**, ⛔ not `null`.
      ⛔⛔ **AND THE TARGET IS GATED — ⛔ THIS IS THE HALF THAT WAS MISSING.** Resolve visibility through
      **`resolveDriveTargetVisibility`** (`packages/domain/src/pool/drive-target-policy.ts:233`), ⛔ **NEVER**
      `getDriveTargetVisibilityRow` — *"a caller interpreting it is exactly how a fail-closed default
      becomes fail-open"* (`-211` cl.3). ⚠ Fail-closed; ⛔ no row ⇒ ⛔ no figure. ⚠⛔ A miss here is a
      **DISCLOSURE defect** (`-211` Consequence 4).
      ⭐ **AND ⛔ do ⛔ not compute or format the figure:** derive per `-204` **cl.2**
      (`assignedCount × pools.fixed_amount`, ⛔ no setter), format per `-206` **cl.3**, and render
      **`drive_target`** from `sahyog-shared` BY NAME (`{amount}` arrives **already formatted**).
      ⚠ Per Trap 3, ⛔ do ⛔ not widen `contribution-history`; ⭐ build the detail with its own
      justification, or **name the reversal**.
      ⚠⛔ **FORWARD-COMPAT — `deferred-work.md`'s `.strict()` ADDITIVE-FIELD ITEM (11b-15 THIRD-pass
      section, `:8630-8643`) NAMES THIS STORY TWICE:** `MemberDriveListEntry`
      is `.strict()` and `api-client`'s `call` throws ⇒ *"When **story F (`11b-17`)** … adds one field
      to the entry and the API ships, every INSTALLED app build older than that release … takes the
      FULL-SCREEN error branch — the whole tab, for every member on an older build."* ⭐ **Prefer a NEW
      contract over an additive field on the shared entry**; if additive is unavoidable, discharge or
      explicitly re-defer the item and record that its **trigger fired**
      ([[feedback_closure_language_precision]]).
      ⚠⛔ **AND IF ANY NEW `packages/domain` ACCESSOR TAKES A CALLER-SUPPLIED LIMIT** — route it through
      `clampLimit` (`packages/domain/src/pagination.ts`); the `domain-accessor-invariants` gate scans
      all of `packages/domain/src` and `Math.min` does ⛔ NOT satisfy it.
- [ ] **Task 3 — The scope boundary** (AC3) — enforced **server-side**; out-of-scope responses omit the
      keys **entirely**.
- [ ] **Task 4 — The audit** (AC5) — ⭐⭐ **EXACTLY ONE line per DETAIL OPEN** (⛔ **not** one per
      coordinate read — AC4 renders 5 × 2 = **ten** of those, which would make the real figure ≈17 and
      take the deployment-wide lock ten times on the ordinary path). ⭐ Keyed on the **canonical
      identifier**; names the member, the drive and the instant; ⭐ written as a **named departure**
      from the anonymous public precedent.
- [ ] **Task 5 — The screen** (AC1, AC4) — family 13 in full
      (`_bmad/custom/load-bearing-invariant-checklist.md:72`).
  - [ ] ⚠⛔ **THE `accessible` IDIOM IS TWO-TIER — ⛔ NOT "on every labelled container."**
        ⛔⛔ **⇒ READ FAMILY 13(a) WITH THIS CARVE-OUT.** The checklist's own **13(a)** still reads,
        unqualified, *"a container carrying `accessibilityLabel` is explicitly `accessible={true}`"* —
        ⚠ **that is the wording E's THIRD pass disproved**, and it has ⛔ not been swept there. ⭐ The
        reconciliation: ⛔ do ⛔ not put an `accessibilityLabel` on a container that **wraps controls** —
        label the **leaves**.
        `MemberDriveList.tsx:233-240`: *"`accessible` USED TO SIT ON THE `<YStack>` ABOVE, which
        COLLAPSES THE WHOLE SUBTREE INTO ONE ELEMENT ⇒ the retry `<Button>`'s own `accessible={true}`,
        role, label and handler were ⛔ UNREACHABLE … ⛔ Do ⛔ not move `accessible` back onto the
        container."* ⇒ `accessible` on **leaf text / leaf-only groups**; every **control** carries
        `accessible={true}` + role + label and is a **SIBLING**, ⛔ never a descendant, of a labelled
        container. ⭐ Following the old wording would have made **AC8's control unreachable**.
  - [ ] ⚠ The **labels**: AC4 needs **FIVE** (⛔ not six — D3(D) removed the VPA) and **four** survive on
        a member surface. Story A (`45547a7b`) **DELETED** `label.account_number` / `label.ifsc` /
        `label.vpa` / `label.bank_name` / `label.branch` from `sahyog-vivran.json` — ⚠ which still holds
        eight `label.*` keys in total; ⭐ **only its BANKING labels are down to `label.account_holder`.**
        ⭐ **The holder label is `label.account_holder`** (value = the ruled *"Nominee Name"*) — ⛔⛔ **NOT
        `nominee.label`, which renders `"Nominee"`** (see AC4).
        ⭐ Then `contribution.json`'s `upi_intent.{account_number,ifsc,bank}_label`. ⛔⛔ **⛔ NOT
        `upi_intent.account_holder_label` — its value is literally `"Account holder"`, the string
        `-190` cl.2 forbids** and the one this story records at D3 as ⛔ **not** to be fixed by side
        effect. ⚠⛔ **There is ⛔ NO branch label anywhere on a member surface** ⇒ `branch` needs one
        **minted**, and minting ratified copy is ⛔ not a render-site act.
        ⚠ The **UPI-ID label is ⛔ not moot** (the old text read *"D3(a)"*, a pre-ruling option): `-212`
        **Consequence 5** rules one **MUST be minted** — ⭐ it simply is ⛔ not F's; it travels with
        **`8-17`**. (⚠ A UPI-ID string already exists at `claim.json:60-62` — ⛔ check before minting a
        second.)
  - [ ] ⚠⛔⛔ **`bank_name` / `branch` — THE HAZARD SHIPPED **CLOSED BY DELETION**, AND THE RISK IS THE
        ⛔ OPPOSITE OF WHAT THIS STORY USED TO SAY.** ⭐ Traced live 2026-09-11:
        `packages/domain/src/pool/sahyog-vivran-read.ts:647-668` now returns
        `{ accountRank, accountHolderNameCiphertext }` **only** — *"Closed HERE by deletion"* — and the
        `.trim() || null` branch guard beside it is described in the **past tense**. ⇒ ⛔ there is
        ⛔ **nothing to inherit**: a Task-2 dev who reuses that projection gets **⛔ NEITHER `bankName`
        NOR `branch`**, and **AC4's five-field render comes up TWO FIELDS SHORT**. ⚠ ⇒ this surface owes
        its **own** projection for those two Tier-3 plaintext columns, with the `.trim() || null`
        discipline re-stated, ⛔ not assumed.
  - [ ] ⚠⛔ **THE ERASURE BACKSTOP.** `anonymizeMember` overwrites `name_ciphertext` **in place** with
        an *encrypted* `[anonymized]` sentinel and RETAINS the row ⇒ the decrypt **SUCCEEDS** and the
        sentinel would render verbatim where a family name belongs (`member-pool/handlers.ts:497-524`).
        ⭐ ⛔ NOT a new rule — an **unswept** one. ⚠ The remedy **diverges by surface** (contributors
        omit the row; the drive list keeps the drive and drops the name) ⇒ ⛔ do ⛔ not copy mechanically.
  - [ ] ✅ **Both accounts, ⛔ no ordering implied** — ⭐ unconditional (`-213` cl.1). ⚠ The two holder
        names may differ; ⭐ **`D5-subject (i)` rules the SCHEMA the authority**, so that is a
        **legitimate state**, ⛔ not an open question ⇒ **surface both, ⛔ pick neither** — the same
        shape `6-18`'s AC1 already builds. ⚠ `migrations/0056_claim-nominee-bank.sql:3` still calls them
        *"#1 (primary) / #2"*; ⛔ that header is **stale** (`9.9` D3 / `-213` cl.1 — the two are EQUAL)
        and the schema file is the correct one. ⛔ Do ⛔ not read an ordering out of the migration.
- [ ] **Task 5b — AC8: the drive-detail affordance** — render `pool_canonical_identifier`; make
      `publicToken` a **real focusable control**; ⭐ amend E's AC5 record and
      `drive-list-render.test.ts:272` **by name**. ⚠ There is ⛔ no detail route today — the tab is
      `apps/mobile/app/(tabs)/sahyog.tsx`.
- [ ] **Task 5c — AC9: the zero-day copy** — consume `zero_line.*` by name; variant on nullability;
      ⛔ do ⛔ not suppress the percentage; carry the a11y invariant; honour `-207` cl.2's ₹0 silence.
- [ ] ⛔⛔ **Task 5d — AC10: the Panel's message block + the `Nominee full name` | `District` table**
      — ⛔ **GATED ON STOP 1**; ⛔ do ⛔ not start before Task 1's decision entry lands.
      ⭐ Consume story **B**'s shared copy from `sahyog-shared` **BY NAME**; ⛔ never author, re-derive
      or translate it at a render site ([[feedback_story_validate_footguns]] #8). ⚠ If the key is ⛔ not
      there, **STOP** — ⛔ that is ⛔ not a licence to write copy.
      ⚠ `Nominee full name` is **`-205` cl.1's FULL NAME** (built in **D**), ⛔ not a
      `public_name_presentation_mode` subject. ⚠ `district` already ships on the member wire.
- [ ] **Task 6 — Tests** (AC2-AC5, AC7-AC9)
  - [ ] The `member ≥ public` **comparison** (AC2) — ⭐ against `SAHYOG_VIVRAN_FIELD_IDS` **and** the
        nominee map, ⛔ not E's index map.
  - [ ] ⛔⛔ A member of **ANOTHER Pariwar** gets the coordinate keys **ABSENT**, ⛔ not `null` (AC3) —
        ⭐ the load-bearing guard.
  - [ ] A **fence test** for AC7 — ⭐ including that ⛔ **no `vpa` key** reaches this wire (D3(D)), and
        that **लक्ष्य is ABSENT on the archived stages** (D2(B)). ⚠⛔ **SAY WHICH VOCABULARY THE
        ASSERTION IS IN:** pool states are `closed`/**`settled`**, the wire tokens are
        `closed`/**`verified`** — ⛔ a wire assertion written against `settled` matches ⛔ nothing.
  - [ ] ⛔⛔ **THE TARGET GATE FENCE (AC2)** — with ⛔ no `reveal_to_members` row, the target key is
        **ABSENT**; with the row ON, it is present on `live` only. ⭐ Assert the read goes through
        `resolveDriveTargetVisibility`, ⛔ never `getDriveTargetVisibilityRow`.
  - [ ] Another Pariwar's drive is unreachable (family 12).
  - [ ] ⭐ **ONE AC5 audit line per DETAIL OPEN** (AC5) — ⛔ **not** one per coordinate read.
        ⚠⛔⛔ **THE FLAKE TRAP IS REAL BUT WAS POINTED AT THE WRONG WRITER.** ⭐ Traced 2026-09-11: the
        cited precedent **IS awaited** (`public-pages/handlers.ts:661` — `await
        writeAppealReversalDisclosureAudit(…)`, which awaits `writeAuditEntry` inside a try/catch) ⇒
        ⛔ **no** flake window there. ⭐ The genuinely fire-and-forget writer is **`createKmsAuditHook`**
        (`apps/api/src/audit/audit-log-sink.ts:206` — `void writeAuditEntry(…).catch(…)`, doc-block:
        *"fire-and-forget on the service pool"*) — ⛔ i.e. **the seven INVISIBLE KMS lines AC5 counts**.
        ⇒ ⚠ any test asserting a **total** line count per open must **drain the KMS half**, or it flakes.
  - [ ] ⭐ **Size the audit write volume** under routine browsing before shipping (AC5) — ⚠⛔ **the
        unit is ≈5-8 global-lock acquisitions per detail open, ⛔ not 1** (see AC5). ⭐ Measure: the
        lines actually emitted for one open (assert the COUNT, which also pins the decrypt count), and
        the wall-clock cost of the serialized chain under concurrent opens. ⚠ Compare against story
        **E**'s already-shipped per-row decrypts — ⭐ the baseline is ⛔ not zero.
  - [ ] ⛔⛔ **RECORD THE MMKV TRIGGER AS FIRED** — ⛔ it currently lives in **Dev Notes prose ONLY**,
        with ⛔ no AC and ⛔ no Task; ⭐ the exact defect this story credits itself with fixing for E's two
        obligations ([[feedback_spec_edits_must_propagate_to_tasks]]). ⚠ Amend `deferred-work.md`'s
        persisted-query-cache item (11b-15 THIRD-pass section, `:8609-8628`) to record that its stated
        trigger — *"any DPDPA review of at-rest cached personal data on the handset"* — **FIRED at F**,
        and **how much Tier-1 is now at rest** ([[feedback_closure_language_precision]]). ⛔ The fix
        itself is **one repo-wide change**, ⛔ not F's.
  - [ ] ⚠ **Record the amplification** in `deferred-work.md` if the measured number is
        uncomfortable — ⭐ it is **repo-wide and pre-existing** (the KMS hook + the single global
        chain), ⛔ **not** a per-surface patch, and ⛔ not F's to fix alone
        ([[feedback_closure_language_precision]]).
  - [ ] ⭐ **Execute them** against `twt-test-pg` `:5433`.

---

## Dev Notes

### Read Trap 1 before anything else — ⭐ and note what it does ⛔ NOT cover

⭐ The instinct will be *"cl.3 says member > public, so the member must get the bank details."*
⛔ **That instinct is wrong on banking** — story A removed those fields from the public entirely.
⚠⛔ **But it is RIGHT on लक्ष्य**, which is why **D2** exists. ⛔ Do ⛔ not generalise Trap 1 into
*"cl.3 never applies here."*

### The asymmetry worth noticing

⭐ This programme spent six stories **narrowing** what a stranger can see. ⚠ D1(a) **widens**, in one
step, what a whole Pariwar can see — ⛔ under a clause written to **close** an inversion. ⇒ ⛔ that is
the shape to be suspicious of.

### Testing standards — ⚠ ⛔ there is ⛔ NO RN mount harness

⚠⛔ **⛔ Do ⛔ not write "RN unit tests" for the screen.** This repo has ⛔ no
`@testing-library/react-native`; `MemberDriveList.tsx` itself **cannot be imported** —
`apps/mobile/components/drive-list/format.ts:1-10` records it: *"confirmed by trying (`SyntaxError:
Unexpected token 'typeof'`, from a transitive React Native dependency's Flow syntax)."*
⇒ ⭐ **the two shipped idioms:** (1) scan the `.tsx` **source as text**, driven by the REAL i18n catalog
and REAL contract (`tests/unit/drive-list-render.test.ts`); (2) **extract pure logic into a plain
`.ts` module** so a test can call it (`components/drive-list/format.ts`). ⚠ A source scan proves a
function is REFERENCED, ⛔ never that it computes the right answer — put anything with a checkable
answer in the `.ts`.

Live-DB for the read, the boundary and the audit. ⚠ Assert **membership and explicit values**, ⛔ never
counts over the shared fixture ([[project_live_db_test_gotchas]]).

### ⚠ Two hazards inherited by the read, ⛔ neither this story's defect

- ⛔⛔ **`bank_name` — ⛔ THE HAZARD IS ⛔ NOT INHERITED; IT IS ⛔ GONE, AND SO ARE THE FIELDS.**
  ⚠ The old note here said an empty `bank_name` would 500 the page and that Task 2 would *"inherit a
  fail-hard on a fail-soft surface"*. ⭐ **Traced live 2026-09-11 and it is the OPPOSITE.**
  `packages/domain/src/pool/sahyog-vivran-read.ts:647-668` records *"an `''` failed `z.string().min(1)`
  … and 500'd the whole transparency page. ⭐ **Closed HERE by deletion**"*, and the projection now
  returns `{ accountRank, accountHolderNameCiphertext }` **only**. ⇒ ⛔ **neither `bankName` nor
  `branch` comes out of it**, and AC4 needs **both** ⇒ **Task 5 owes its own projection** for those two
  Tier-3 plaintext columns. ⚠ (The item's address is the 11b.3a **`bank_name` bullet**, `:8325-8337` —
  ⛔ not `:8307-8320`, which is the 11b.10 token item.)
- ⚠⛔ **The identifier-enumeration bound is ⛔ NOT "still open", and the remedy this story asked for was
  ⛔ DECLINED.** ⭐ `deferred-work.md` records it *"**ANSWERED 2026-09-03 — TRUSTEE-RATIFIED** … logged as
  `#decision-2026-09-03-184`"*: the ruling is **(B) MAKE THE ADDRESS UNGUESSABLE** (option (c)), and
  ***"the rate-limit tier is NOT changed."*** ⭐ It then went **CLOSED BY [EDIT]** at 11b.10 —
  `pools.public_token`, **128 bits** of CSPRNG entropy, **backfilled** by migration `0114`.
  ⇒ ⛔ criticising this story for planning *"no rate/enumeration bound"* points at a remedy **the Panel
  expressly refused** ([[feedback_closure_language_precision]]). ⭐ What this surface actually offers is
  **authentication + session scope**, and enumeration by a member is what **D1(a) GRANTS**. ⚠ What
  remains is a **deployment gate on the PUBLIC surface**, ⛔ not an unmade judgement here.
  (Address: the *"BLOCKING ON DEPLOYMENT"* bullet, `:8206`.)
- **The persisted query cache is unscoped and ⛔ never purged on sign-out** (11b-15 THIRD-pass section,
  `:8609-8628`) — ⚠⛔ **CARRIED AS A TASK NOW (Task 6), ⛔ no longer prose only:**
  keys carry ⛔ no `memberId`/`pariwarId`, MMKV `gcTime` **7 d**, and `grep` for `queryClient.clear` /
  `removeQueries` / `resetQueries` across `apps/mobile` returns **ZERO**. ⚠⛔ Its stated trigger — *"any
  DPDPA review of at-rest cached personal data on the handset"* — **fires here**: this story would put
  **unmasked payment coordinates** at rest for 7 days, surviving sign-out onto a different member of a
  different Pariwar. ⭐ That defeats D1's *"the session scope IS the control"* **at rest**, though ⛔ not
  on the wire. ⇒ ⛔ **record the trigger as fired**; the fix is one repo-wide change, ⛔ not a
  per-surface patch.

### ⚠⛔ Four stale artefacts THIS story makes wronger — ⛔ ROUTE them, ⛔ do ⛔ not absorb them

⭐ All four traced live 2026-09-11. ⛔ None is F's to fix; ⛔ all four get **worse** when F ships.

- ⛔⛔ **The admin form tells a `super_admin` the reveal switch does NOTHING.**
  `apps/admin/src/modules/drive-target/i18n-en.ts:108-109` —
  *"no page displays this target yet, in any state of these switches … they do not make anything appear
  today"* — rendered as `aria-describedby` on **both** checkboxes (`RevealSwitchesForm.tsx:246-250`).
  ⚠ Already **false** at HEAD (`public-read.ts:1058`, `member-drive-list.ts:289,374`); ⭐ **D2(B) makes
  it a THIRD consumer.** ⇒ an operator who flips it is told it changes nothing while it changes three
  screens. ⛔ Route it.
- ⚠ **A stale VPA doc-block the routing note ALREADY flagged and nobody carried.**
  `apps/api/src/modules/payment/handlers.ts:20-23` still claims *"There is NO VPA in the substrate
  today"*. ⭐ The 2026-09-10 note's **§4.2b / check C19** recorded it as *"**STALE** … a defect to fix,
  ⛔ not relying on it here"* — and `-212` carries ⛔ no consequence about it. ⚠ `-191` **cl.5** already
  corrected two other stale VPA claims by name; ⛔ this is the third. ⇒ it belongs in **`8-17`**'s packet.
- ⚠ **`-165`'s wrong ground is still in the SHIPPED contract.** AC3 correctly rules `-165` the wrong
  citation — ⛔ but `packages/contracts/src/public-pages/sahyog-vivran.ts:284` still reads *"the same
  discipline **`-165`** established for the masked arm."* ⭐ One site, ⛔ not swept
  ([[feedback_story_validate_footguns]] #16).
- ⚠ **A `done` sibling still asserts the RETIRED "no target" sentence as present-tense fact.**
  `11b-14:1072-1075` quotes *"`11b-15:116` reads '⛔ no target (story C keeps it hidden)'"* and concludes
  *"`-190` cl.7(c) has ⛔ no consumer in any of the **seven** stories"* — ⛔ both false at HEAD (`-211`
  cl.1 retired the sentence; `-208` cl.6 corrected the count to **six**). ⭐ `11b-14` is `done`, so this
  is **record staleness**, ⛔ not a live gate — ⭐ but it is the sibling site the sweep exists to catch.
  ⛔ **This story is CLEAN on both retired-sentence classes** and must stay so.

### ⚠ Three names, three subjects — ⛔ do ⛔ not cross them

- `resolvePublicMemberName` (`kyc/public-name.ts:73`) — the **LIVING member**, public directory,
  fails **closed** (`''` ⇒ omit the row).
- `resolveMemberFacingDeceasedName` (`notifications/pool-identity.ts:141`) — the **DECEASED member**,
  member surfaces. ⚠⛔ *"⛔ NEVER `resolvePublicMemberName` on this path"* —
  ⛔⛔ **`packages/domain/src/pool/member-drive-list.ts:50-53`, the DOMAIN file** (second site:
  `apps/api/src/modules/member-pool/handlers.ts:492`).
  ⚠⛔ **⛔ NOT the contracts file.** ⭐ Every OTHER bare `member-drive-list.ts:NN` in this story resolves
  to `packages/contracts/…`; **this one alone resolves to `packages/domain/…`**, and `grep` for the
  warning in the contracts file returns **ZERO** — `:52-56` there is FR-91 pagination prose. ⚠ This is
  footgun **#1** (domain/contracts shape drift) inside the very section that warns about it.
- The **account-holder** value — claim-scoped free text routing through **neither**. ⚠⛔ AC2 and D1 call
  it *"the nominee's name"*; `deferred-work.md:171-175` rules that **the SCHEMA is the authority** and
  the schema **denies** the identity. ⇒ ⛔ do ⛔ not assert it names the nominee.

### References

- `.decision-log.md#decision-2026-09-04-190` cl.1-cl.4, **cl.7(b)/(c)** · `-189` cl.3 · `-193` **cl.3**
  · `-195` cl.1, cl.3 · `-196` (+ Consequence 2) · `-199` · `-200` cl.4 · **`-204` cl.2, cl.12** ·
  `-205` **cl.1**, cl.9 · `-206` cl.2, **cl.3**, cl.4 · `-207` cl.1, cl.2 · `-208` cl.4, cl.6 ·
  `-209` cl.2, cl.3 · **`-211` cl.1, cl.2, cl.3, cl.5, Consequence 2, Consequence 4** ·
  ⭐ **`-212` cl.1, cl.2 + Consequences 2-6** · ⭐ **`-213` cl.1, cl.2**
  ⚠⛔ **⛔ CITE THESE BY CLAUSE, ⛔ NOT BY LINE.** ⭐ The log is **newest-first**: `-212`/`-213` prepended
  ~**152** lines on 2026-09-10 and moved every older anchor down. ⭐ All four line pointers in this file
  were re-derived at that shift on 2026-09-11; ⛔ assume the next entry breaks them again.
- ⛔⛔ **`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md`
  §8.3(2), §8.3(3), §8.5 row 3** — ⭐ **AC10 / STOP 1.** ⚠ Ruled 2026-09-05, ⛔ **never lifted into
  `.decision-log.md`**; corroborated at `11b-12:583-600`.
- `packages/contracts/src/contributions/nominee-accounts.ts:18-20`, `:60-61` — the 9.9 donor path; the VPA fence (⚠ `:59` is `ifsc`)
- `packages/contracts/src/contributions/contribution-history.ts:24-25` — the deliberate exclusion
- `packages/contracts/src/contributions/member-drive-list.ts:43`, `:121`, `:131`, `:187` — stage enum; the two unrendered ids; लक्ष्य
- `apps/api/src/modules/payment/handlers.ts:257-262`, `:289-292` — the VPA refusal; the live-pool gate
- `apps/api/src/modules/member-pool/handlers.ts:102-108`, `:497-524`, `:539-547` — session scope; the sentinel; the one-decrypt rule
- `apps/api/src/modules/public-pages/handlers.ts:840-905` — the audit posture ⚠ **departed from**, ⛔ not followed
- `packages/domain/src/audit/write.ts:62`, `:128` — the global advisory lock
- `apps/public/src/lib/surface-fields.ts:646-661`, `:672-683` — AC2's two floor maps
- `apps/mobile/components/drive-list/MemberDriveList.tsx:233-240`, `:413-416`, `:519-520` — the a11y idiom; the row fence; ⚠ the `nominee.label` routing this story **supersedes** (AC4)
- ⭐ `packages/i18n/locales/en/sahyog-vivran.json:34` — `label.account_holder` = **"Nominee Name"**, ⭐ the ruled string
- ⭐ `packages/i18n/locales/{en,hi}/sahyog-shared.json` — `drive_target` (**"Expected: {amount}"**); ⚠ its `$comment` still says *"It now has TWO"* consumers
- ⭐ `packages/domain/src/pool/drive-target-policy.ts:233` — **`resolveDriveTargetVisibility`**, AC2's gate
- ⭐ `packages/domain/src/pool/member-drive-list.ts:50-53` — ⚠⛔ the **DOMAIN** file's *"⛔ NEVER `resolvePublicMemberName`"* (⛔ **not** the contracts file)
- ⭐ `packages/domain/src/pool/sahyog-vivran-read.ts:647-668` — ⚠ `bankName`/`branch` **closed by DELETION**; Task 5 owes its own projection
- ⭐ `apps/api/src/audit/audit-log-sink.ts:200-219` — **`createKmsAuditHook`**, ⚠ the genuinely fire-and-forget writer
- ⭐ `_bmad-output/implementation-artifacts/6-18-nominee-holder-name-on-the-verification-console.md` — ⚠ `ready-for-dev`, same §8.4(ii) ground (AC4)
- `apps/mobile/tests/unit/drive-list-render.test.ts:272` — the test AC8 must amend
- `packages/i18n/locales/{en,hi}/sahyog-shared.json:14-15` — `zero_line.*`
- ⭐ `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-10-11b17-member-drive-detail-two-questions.md`
  — **D2 = Q1**, **D3 = Q2**. ⚠ Read the **body**, ⛔ not the header ([[feedback_story_summary_can_lag_its_routing_note]]).
- ⭐ `.decision-log.md#decision-2026-09-04-191` **cl.1** — ⚠⛔ the **ratified** text D3 turns on
- ⚠ `deferred-work.md` **11b.3a third-pass item `(e)` — VPA collection** (heading `:319`, body `:341-362`);
  ⛔ its *"nobody ruled on"* is **inaccurate**, see D3. ⚠⛔ **⛔ Do ⛔ not write a bare `(e)`** — the file's
  own lettering rule (`:727-730`) says a bare letter means **Story 11b.1's** item (e), a different
  obligation entirely. ⭐ And per `:747`: ***"The ITEM LETTERS are the stable address. Cite those, ⛔ not
  the lines."***
- ⚠ `deferred-work.md` **`D5-subject (i)`** (`:166-179`) — ⭐ *"the SCHEMA is the authority"*; AC4's real ground
- ⚠ `deferred-work.md` **11b-15 THIRD-pass section** (`:8607`) — the persisted-cache item (`:8609-8628`, Task 6) and the `.strict()` additive-field item (`:8630-8643`, Task 2)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-11 | 1.2 | ⚠⛔ **STOP 1's AUTHORITY CITATION WAS WRONG AND IS CORRECTED — ⛔ the obligation is UNCHANGED.** v1.1 cited **§8.3(3)** and **§8.5 row 3**; ⛔ §8.5 is *"What we **propose**"* and §8.3(3) is a **sequencing statement**, ⛔ neither a ruling. ⭐ The ratification is **§8.1** (*"Ratified verbatim (DR + KB, 2026-09-05)"* — the block **plus** the `Nominee full name` \| `District` table, ***"on both the member and the public view"***) and the routing is **§9.1 row 3** (*"B can ship the shared copy source now. **E/F consume it later**"*). ⭐ **§10 READ TO THE END:** §10.4 re-homes **three OTHER rulings** and ⛔ leaves this one standing. ⛔⛔ **AND TWO THINGS TRACED LIVE MAKE IT WORSE: B ⛔ NEVER SHIPPED THE COPY** (`sahyog-shared` has `index_line.*` only; the tagline is ⛔ nowhere in `packages/i18n/locales/`) while `11b-12` is `done`; **and story E (`11b-15`) closed `done` owing the IDENTICAL render.** ⇒ ⭐ **AC10 is UNSATISFIABLE until B's source has a named home** — ⛔ and that is a STOP, ⛔ never a licence to author ratified copy at a render site. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-11 | 1.1 | ⛔⛔ **RE-VALIDATED (`bmad-create-story validate`, three independent verifiers) — 34 FINDINGS, ALL APPLIED. ⛔ ZERO ROWS MOVE; ⛔ NO CODE.** ⭐ Baseline **NOT re-pinned** — `a2617869` is still an ancestor and every commit since is governance-only, so ⛔ no code moved. ⛔⛔ **THE PREFLIGHT IS RE-OPENED: STOP 1.** ⭐ `trustee-panel-routing-note-2026-09-05-11b12` **§8.3(3)/§8.5 row 3** ruled ***"B ships the copy; E and F render it"*** — a **`Nominee full name` \| `District`** table plus B's five-paragraph block, *"written for a **PAGE**"* — routing to F **BY NAME**, and it ⛔ **never reached `.decision-log.md`** ([[feedback_story_validate_footguns]] #15). ⇒ **AC10 + Task 5d WRITTEN**, gated on the decision entry landing FIRST ([[feedback_governance_commits_precede_implementation]]). ⛔⛔ **D2(B) SHIPPED UNGATED:** `reveal_to_members` appeared ⛔ ONCE, in prose — ⇒ **AC2 / Task 2 / Task 6 now carry the fail-closed gate and `resolveDriveTargetVisibility`** (`-211` cl.3; a miss is a **DISCLOSURE** defect). ⭐ **AND ITS RATIFIED NUMBER FORM WAS ABSENT** — `-206` **cl.3** (the clause that exists because **₹300 rendered as `₹ 0 lakh`**), `-204` **cl.2**'s derivation, and the shared **`drive_target`** key F is the **THIRD** consumer of. ⚠⛔ **AC4's *"reuse `nominee.label`"* SHIPPED THE FORBIDDEN STRING** — that token renders **`"Nominee"`**, ⛔ not the ruled *"Nominee Name"*, and its own `$comment` says otherwise and is **false** ⇒ re-pointed to `label.account_holder`. ⚠⛔ **THE `bank_name` HAZARD WAS INVERTED** — it shipped **CLOSED BY DELETION**, so the projection yields ⛔ **NEITHER** `bankName` **NOR** `branch` and AC4 was **two fields short**. ⚠⛔ **§8.4(ii)'s *"nobody has said which"* WAS FALSE** — `D5-subject (i)` ruled *"the SCHEMA is the authority"* (this story's own Dev Notes quoted it), and **`6-18` is `ready-for-dev` on that ground and was ⛔ never named** ⇒ re-grounded, Panel routing **DROPPED** from Task 0e. ⭐ **THE AUDIT UNIT PINNED: ONE line per DETAIL OPEN** — Task 4/Task 6 said *"per coordinate read"* (5 × 2 = ten ⇒ ≈17, ⛔ not ≈8); and the flake trap was pinned to an **awaited** writer while the real fire-and-forget one is `createKmsAuditHook`, ⛔ i.e. the seven invisible KMS lines. ⚠ Swept: **every** `.decision-log.md:NNN` (stale ~**+152**), six `deferred-work.md` cites (**two swapped**) now given as **ITEM ADDRESSES** per that file's own rule; `D3(a)`→**(D)**; *"AC4 needs six"*→**five**; `upi_intent.account_holder_label` (= literally *"Account holder"*) **struck**; the vacuous `-207` cl.1 carve-out (⛔ that field is in **neither** floor map) **struck**; the enumeration bound restated as **CLOSED by ruling + edit** (the rate-limit remedy was **DECLINED**); AC0 → **Task 1**; the pool-state/wire-token vocabularies **separated**. ⭐ Added: the MMKV trigger as a **Task** (it was prose only), four stale artefacts F makes wronger (the admin form that says the switch does nothing, the stale VPA doc-block, `-165` in the shipped contract, `11b-14`'s retired sentence), and family 13(a)'s carve-out. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-10 | 1.0 | ✅⭐ **THE LAST CONDITIONAL IN AC4 IS CLOSED — `#decision-2026-09-10-213` (author-committed).** ⭐⭐ **BOTH ACCOUNTS RENDER, and it is ⛔ NOT the "reversal" the validate pass called it:** the list's one-decrypt rule governs the **HOLDER NAME** (*"the SAME nominee"* twice ⇒ a second decrypt buys nothing), while this surface renders **`account_number` + `ifsc`, which DIFFER per account** — and the money can have gone to **both**, the two being *"EQUAL destinations, the donor's choice"*. ⇒ the list's and pay screen's behaviour **STANDS UNTOUCHED**, and Task 5's *"only if the reversal is named"* sub-item is discharged **by showing there is none**. ⚠⛔ **The differing-holder-name case is ⛔ STILL UNRULED and is SHARPER than §8.4(ii) stated:** the **code asserts one nominee** across both accounts while the **schema permits two names** ⇒ one is wrong and nobody has said which ⇒ **routed with Task 0e**; AC4 surfaces both and picks neither. ⚠ AC5's sizing pins to the **≈8** end now both accounts are in. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-10 | 0.9 | ✅⭐⭐ **BOTH DECISIONS RULED BY THE TRUSTEE PANEL — `#decision-2026-09-10-212` (DR + KB). PREFLIGHT DISCHARGED; ⭐ THE STORY IS STARTABLE.** **D2 → (B):** लक्ष्य renders on **`live` drives ONLY**, mirroring the list and `-204` cl.2's slot; ⭐ `-189` cl.3 holds because the public index is live-only too, so (B) puts the detail **level with** the list, ⛔ not below it. **D3 → (D):** the UPI ID is ⛔ **NOT** on this page — it is **ADDED to the PAYMENT screen**. ⇒ AC4 renders **five** coordinates; AC2 gains the live-only target rule; AC7's target exclusion is replaced by the ruling. ⚠⛔ **Task 0e ADDED — the pay-screen work needs a NAMED HOME and is ⛔ NOT this story's** (`-212` Consequence 3), carrying three things with it: the `.strict()` additive-field trigger now FIRES, a UPI-ID label must be MINTED (story A deleted `label.vpa`), and the pay screen's *"Account holder"* label sits against `-190` cl.2 — ⛔ unresolved, ⛔ not to be fixed by side effect. ⭐ cl.2 **SUPERSEDES** `deferred-work.md` item (e), whose ground was **false when written**. ⛔ **NO CODE.** | Trustee Panel + BigDev |
| 2026-09-10 | 0.8 | ⭐⭐ **THREE PREMISES TRACED TO CODE AT BigDev's DIRECTION — ⛔ none had been.** (1) ⭐ **The `super_admin` reveal switch is BUILT AND OPERABLE** — table + CHECK, key, grant (test-asserted), module MOUNTED, route, write, admin page, form guard. ⇒ `-211` cl.3 holds in the STRONG sense: off because ⛔ nobody has switched it, ⛔ not because nobody can. (2) ⭐ **The UPI intent path is real but reaches ⛔ ONE drive** — `resolveMemberLivePool` needs active + `live` cycle + ASSIGNED, and returns the soonest-closing pool ⇒ on F's page there is ⛔ no pay path for any other drive, so D3's narrow reading is **EMPTY here**; ⭐ a new **option (D)** (the VPA belongs on the PAYMENT surface) was added to the Panel note. (3) ⚠⛔ **AC5's SIZING PREMISE WAS WRONG IN THE STORY'S FAVOUR** — `-199` says *"a write on every detail open"* (singular); it is **one line per ENCRYPTED FIELD DECRYPTED** (`envelope.ts:92-93`, ⛔ no DEK cache) ⇒ **≈5-8 global-lock acquisitions per open, seven of them INVISIBLE** (emitted by the crypto layer). ⭐ Each holds ONE deployment-wide key across 5-6 sequential round trips. ⭐⭐ **⛔ NOT NEW — story E already does it, shipped** (per-row decrypts at concurrency 8) ⇒ a **PRE-EXISTING condition F AMPLIFIES**; ⭐ F is the first surface where a Tier-1 READ is the ordinary path. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-10 | 0.7 | ⭐⭐ **BOTH OPEN DECISIONS ROUTED TO THE PANEL** — `trustee-panel-routing-note-2026-09-10-11b17-member-drive-detail-two-questions.md` (Q1 = D2, Q2 = D3). ⚠⛔⛔ **AND D3's FRAMING IN v0.6 WAS ⛔ WRONG AND IS CORRECTED HERE.** v0.6 read D3 as *"a standing prohibition vs an author-committed enumeration"*, with AC4 held to (a) as the safe default. ⛔ That inverted the authority: **`-191` cl.1 is TRUSTEE-RATIFIED** (DR + KB) and rules the VPA *"a MEMBER field … **shown to the logged-in member** … carried on the member surface as a payment coordinate"*; ⛔ only cl.4 was ever superseded. ⇒ ⭐ the *"prohibition"* is **ours** — a narrow reading taken in `deferred-work.md` item (e) and ⛔ never put back to the Panel — and its phrase *"a NEW Tier-1 exposure ⛔ nobody ruled on"* is **⛔ inaccurate**. ⭐ AC4's five-field render is now stated as a **HOLD, ⛔ not a finding that (a) won**. ⭐ D2 also gains its **second axis**: the list carries लक्ष्य on **`live` rows ONLY** (`member-drive-list.ts:236-244`, `-204` cl.2's *"on a LIVE row"*), while the detail covers three stages ⇒ the finished-drive case is unruled. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-10 | 0.6 | ⛔⛔ **RE-VALIDATED (`bmad-create-story validate`, three independent verifiers) — 32 FINDINGS APPLIED. ⛔ ZERO ROWS MOVE.** ⭐ Baseline **RE-PINNED** `66ef4dce` → `a2617869` (**106** commits of drift; the 2026-09-09 re-pin fixed reachability only and disclaimed re-verification — that debt is now DISCHARGED). ⛔⛔ **TWO DECISIONS OPENED AND A PREFLIGHT STOP ADDED: D2** (`-211` Consequence 2 hands the लक्ष्य question to F **by name**; `-211` cl.1 RETIRED *"no target"*, struck at both sites) and **D3** (AC4's UPI ID contradicts a thrice-stated prohibition; `-199` is **author-committed**, ⛔ not ratified, and supersession must be NAMED). ⭐ **AC8 + AC9 WRITTEN** — E's two routed obligations lived in prose only, ⛔ no AC, ⛔ no Task. ⭐ **AC5 RE-GROUNDED** as a named DEPARTURE: the cited precedent writes `actorId: null` and says *"⛔ Do not widen this to log every request."* ⭐ **AC2 re-pointed** to `SAHYOG_VIVRAN_FIELD_IDS` + the nominee map (E's is the **index** map) with `-207` cl.1 and the inert public name gate carved out. ⭐ **Task 5's a11y instruction INVERTED** — *"`accessible` on every labelled container"* is the defect E's third pass fixed and would have made AC8's control unreachable. ⚠ **AC4 narrowed** (VPA ⇒ D3; the second decrypt named as a reversal; §8.4(ii) surfaced; `Nominee Name` per `-190` cl.2) and its **missing labels** recorded (A deleted five; ⛔ no branch or UPI-ID label exists). ⭐ Added: the `.strict()` blank-out naming F twice, the MMKV at-rest trigger, the `ANONYMIZED_SENTINEL` backstop, `-200` cl.4's untouchable entry, the three-subject resolver split, `clampLimit`, and the **⛔ no-RN-mount-harness** correction. ⚠ Swept: *"43,000"* (7 sites) — `-199` itself corrected it to **per-Pariwar, no ratified figure**; the stale blocked-on chain (**story is UNBLOCKED**); Task 0c (**discharged**); *"last of seven"* → **six**; `-165` → `-205` cl.9; `:804-830` → `:840-905`; Task 0 annotation → **SECTION**. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-04 | 0.3 | ✅ **Scope CONFIRMED (i): the member's OWN Pariwar.** ⭐ AC6's member-facing sentence is now WRITTEN, with the Niyamavali check reported honestly as **non-dispositive** (it binds nothing). ⚠⛔ **The "⛔ Zero open decisions" claim in this row was TRUE WHEN WRITTEN and is ⛔ FALSE at HEAD** — `-211` (2026-09-09) opened D2 and the 2026-09-10 validate pass opened D3. ⛔ Kept as the record, ⛔ not rewritten ([[feedback_record_unattested_no_backfill]]). | BigDev + Claude |
| 2026-09-04 | 0.2 | ✅ **D1 RULED (a)** (`-199`) — ⛔ recommendation (b) NOT taken. ⚠ AC5's audit is now routine-volume; Trap 3 is now definitely a REVERSAL. | BigDev + Claude |
| 2026-09-04 | 0.1 | Created from `-195` cl.3 (story **F**). ⛔ **D1 is OPEN and IS the story.** ⭐⭐ Findings: `-189` cl.3 ⛔ does **not** force the scope; the **literal** cl.3 reading is a LARGER exposure than the one just removed; `contribution-history` excludes bank data **deliberately**. ⚠⛔ **Its "43,000 pockets" figure was CORRECTED by `-199` on the same day** — illustrative, and the operative axis is per-Pariwar. ⛔ Row kept as the record. | BigDev + Claude |
