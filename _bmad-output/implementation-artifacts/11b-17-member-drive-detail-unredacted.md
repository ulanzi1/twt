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

⚠⛔⛔ **FALSIFIED 2026-09-13 (third `validate` pass) — ⛔ THE PARAGRAPH ABOVE IS KEPT, ⛔ NOT DELETED**
([[feedback_record_unattested_no_backfill]]).
⭐ **THE PIN ITSELF STILL HOLDS** — `git merge-base --is-ancestor a2617869 HEAD` passes and it is ⛔ NOT
re-pinned. ⛔ **But *"no code moved"* IS ⛔ FALSE AT HEAD.** `story(8.17)` and `story(11b.19)` both
**SHIPPED CODE** between the pin and HEAD — **15 files**, including ⭐ every one of these, all cited
below by line: `packages/i18n/locales/{en,hi}/sahyog-shared.json` (**STOP 2's keys**),
`…/member-drive-list.json`, `…/contribution.json`, `packages/contracts/src/contributions/nominee-accounts.ts`,
`packages/contracts/src/public-pages/sahyog-vivran.ts`, `apps/api/src/modules/payment/handlers.ts`,
`apps/mobile/app/(contribution)/pay.tsx`, and the ⭐ **NEW** `packages/i18n/tests/sahyog-shared-dark-copy.test.ts`.
⇒ ⭐ **every code citation in this file was RE-DERIVED AT HEAD on 2026-09-13**; ⛔ a2617869 is a valid
*reachable* baseline and is ⛔ **no longer a clean CODE baseline**.
⚠⛔ ⛔ The 2026-09-11 reasoning was sound and its conclusion expired in **one day** — ⭐ that is the
lesson, ⛔ not the error ([[feedback_git_fetch_before_remote_reasoning]]).

⭐ **RE-CONFIRMED 2026-09-13 (fourth `validate` pass), SAME DAY, ⛔ NOTHING CHANGED HERE.** Re-checked
`git merge-base --is-ancestor a2617869 HEAD` (still passes) and `git diff --name-only a2617869 HEAD --
packages apps` (still the same **15** files listed above — ⛔ no sixteenth appeared). ⭐ The pin holds,
still ⛔ not re-pinned, still ⛔ not a clean CODE baseline. ⛔ Nothing new to falsify here.
-->

# Story 11b.17: The Member's View of ONE Drive — Carrying What the Public Page No Longer Does `[SURFACE]`

Status: review

> ⭐⭐ **REGISTER — READ THIS FIRST.** `⛔` **NEGATES the words that follow it** (`⛔ NOT X`, `⛔ never X`,
> `⛔ no X`). `⭐` marks an **ACTION or a fact to rely on**. `⚠` marks a **hazard**. Doubling (`⛔⛔`,
> `⚠⛔⛔`) is **VOLUME ONLY** and ⛔ changes ⛔ no meaning.
> ⚠⛔ **⛔ NEVER put `⛔` in front of an imperative you want performed, or in front of a quoted word you
> mean to affirm** — ⭐ it reads as a prohibition. ⛔ That defect was found in this file on 2026-09-13 at
> **fourteen** sites, including AC0's own commit-ordering rule; ⛔ all were corrected.

## ✅ PREFLIGHT — ⭐⭐ **CLEAR TO BUILD. ⚠ ONE GOVERNANCE ENTRY IS OWED FIRST (§8.4(ii), Task 1).**

⭐ **ALL TWELVE ACs (AC0-AC11) ARE STARTABLE.**

⭐⭐ **BOTH ORIGINAL DECISIONS ARE RULED — `#decision-2026-09-10-212`, TRUSTEE-RATIFIED (DR + KB, 2026-09-10).**

| | Was open | ✅ Ruled |
|---|---|---|
| **D2** | Does the DETAIL render **लक्ष्य**, and for which stages? | ✅ **(B) — `live` drives ONLY** (cl.1) |
| **D3** | *"Shown to the logged-in member"* — the ID, or a pay button? | ✅ **(D) — the UPI ID goes on the PAYMENT screen, ⛔ not here** (cl.2) |

⭐ Answered from `trustee-panel-routing-note-2026-09-10-11b17-member-drive-detail-two-questions.md`
(**Q1**/**Q2**). ⚠ **Read `-212`'s Consequences 3-6 before Task 2** — cl.2 created work **outside this
story** and ⛔ none of it was F's to absorb silently.
✅⭐ **THOSE CONSEQUENCES ARE NOW RESOLVED THREE DIFFERENT WAYS — ⭐ traced live 2026-09-13:**
**Cons. 3** (the pay-screen render) and **Cons. 4** (the `.strict()` additive-field trigger) and
**Cons. 5** (a UPI-ID label must be minted) are **CLOSED BY [EDIT]** at story **`8-17`** (**`done`** —
`pay.tsx` renders the VPA row, `nominee-accounts.ts` carries `vpa`, and `upi_intent.vpa_label` = *"UPI ID"*
in both locales). ⚠⛔ **Cons. 6** (the pay screen's *"Account holder"* label vs `-190` cl.2) is
⛔ **NOT ADDRESSED** — `8-17`'s AC6(a) records it *"⛔ NOT relabelled — recorded, untouched"* and `8-17`
is now `done` ⇒ ⭐ **it has ⛔ no live home.** ⛔ Still ⛔ not F's, and ⛔ still ⛔ not to be fixed by side
effect ([[feedback_closure_language_precision]]).

### ✅ BOTH STOPS ARE DISCHARGED — ⭐ **verified live 2026-09-13, ⛔ not taken on the story's word**

⭐ **STOP 1 — DISCHARGED 2026-09-11.** `#decision-2026-09-11-214` (`.decision-log.md`, the `-214`
entry) transcribes the 2026-09-05 Trustee ratification (DR + KB) that had lived ⛔ only in a routing
note. ⛔⛔ **Do ⛔ NOT write a second entry** — see Task 1.

⭐ **STOP 2 — DISCHARGED 2026-09-12** by story **`11b-19-ratified-message-block-copy-source`**
(**`done`**). `packages/i18n/locales/{en,hi}/sahyog-shared.json` now carry **all eight keys, in BOTH
locales**: `message_block.headline.full` · `.headline.no_family` · `.solidarity` · `.gratitude` ·
`.tagline` · `.join` · `.table.nominee_name` (= *"Nominee full name"*) · `.table.district`
(= *"District"*). ⇒ ⭐⭐ **AC10 / Task 5d are BUILDABLE NOW.**

⚠⛔⛔ **AND AC10 INHERITS ⛔ ONE NEW OBLIGATION FROM THAT DISCHARGE — ⛔ it is ⛔ not in any earlier
version of this file.** `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` holds
`AUTHORISED: string[] = []` against a repo walk, and its resolver regex was **deliberately hardened on
2026-09-12 to catch a DYNAMICALLY-BUILT key** (`` `message_block.headline.${variant}` ``) — ⭐ exactly
the shape Task 5d will write. ⇒ ⚠⛔ **this render FAILS that fence BY PATH.** ⭐ **NARROW it**, ⛔ never
delete it and ⛔ never append to `AUTHORISED` to make a build green (**AC10**, **Task 5d**).

⚠ `-214` **Consequence 3** (the **PUBLIC** render) is ⭐ **HOMED at `11b-20-public-sahyog-vivran-message-block`**
(`ready-for-dev`) — ⚠⛔ **HOMED, ⛔ NOT closed** (its home is itself unbuilt,
[[feedback_closure_language_precision]]) — and ⛔ still ⛔ not F's.

⭐ Task 1's `governance:` commit **STILL BINDS** ([[feedback_governance_commits_precede_implementation]]),
and it now carries ⭐ **one owed decision entry of its own** — §8.4(ii), deferred here BY NAME by
`8-17`. ⛔ See Task 1.

---


> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST.** **Story F** of the split (`2026-09-04-195` cl.3) — ⚠ **one
> of SIX**, ⛔ not "the last of seven": `-208` cl.6 re-counted the set when G was withdrawn, and
> **F is `11b-17`**. ⇒ owes an `epics.md` **SECTION** (**Task 1**).
>
> ✅⭐ **⛔ NO LONGER BLOCKED.** Story **A** (`11b-11`) is `done`; story **E** (`11b-15`) is `done`;
> ⛔ "E is blocked on B and G" was retired by `-208` cl.4 (E's dependency re-pointed to `8-16`, also
> `done`). ⇒ ✅⭐ **AND THE PREFLIGHT IS NOW CLEAR TOO ⇒ ⛔ NOTHING HOLDS THIS STORY.** ⚠⛔ ⛔ The earlier
> wording — *"the only thing holding this story is the Preflight above"* — was true when written and is
> ⛔ **FALSE** from 2026-09-12; ⛔ corrected 2026-09-13.
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
> records as **⛔ NOT taken** (`-199`, its ***"⇒ option (a)"*** paragraph — ⛔ **cite the paragraph, ⛔ never
> a line**; see the References block). The Story statement must read as **(a)**, and
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

⚠⛔ **AND A SECOND VISIBILITY PREDICATE IS ⛔ CONSUMED, ⛔ NOT INTRODUCED — ⭐ RECORDED SO THE OMISSION
IS A JUDGEMENT, ⛔ not a miss.** `reveal_to_members` (`-190` cl.7(b)/(c), **built** at `11b-13`, **first
consumed** by story **E** under `-211` cl.2) gates whether a member sees **लक्ष्य**. ⇒ ⭐ F is its
**THIRD** consumer, ⛔ not its author — and it gates ⛔ **no benefit**: ⛔ no member's eligibility,
assignment, obligation or amount owed turns on seeing an expected figure. ⇒ ⭐ it needs ⛔ **no**
member-facing sentence of its own (AI-10-1).

⚠ **AC6 BINDS this sentence BY REFERENCE and is the AC that carries it.** ⭐ Deliberately **ONE copy,
⛔ not two** — ⛔ there is ⛔ nothing to drift. ⇒ if this sentence ever changes, it changes **here**, and
AC6 follows by construction.
⚠⛔ ⛔ The earlier wording (*"written here and there … both must move together"*) described a
two-copy design this story ⛔ never had; ⛔ corrected 2026-09-13, ⛔ and the one-copy design is the
safer one — ⛔ do ⛔ not "fix" it by pasting the sentence into AC6.

## 🎯 What already EXISTS — ⭐ re-verified live at **HEAD, 2026-09-13**, ⛔ not assumed

⚠⛔ **⛔ NOT re-verified at `a2617869` any more — ⭐ CODE MOVED.** `8-17` and `11b-19` shipped since the
pin; every row below was re-traced at HEAD (see the baseline block).
⚠⛔⛔ **AND THE HANDLER BOUNDARIES WERE MAPPED FIRST** ([[feedback_story_validate_footguns]] #21):
`payment/handlers.ts` exports `createPaymentHandlers(deps)` returning an object — ⛔ there are ⛔ **no
`app.get(...)` lines to grep**. ⭐ Its handlers are `intent` · `nomineeAccounts` · `attest` ·
`reportFailure`, and a line number alone ⛔ does ⛔ not tell you which one you are in.

| Fact | Where | Verified |
|---|---|---|
| The member's bank access today: **own pool, `live` only** | `contracts/contributions/nominee-accounts.ts`; the `{available:false, reason:'unassigned'}` return — ⭐ in the **`nomineeAccounts`** handler (⚠ the `intent` handler has its own) | ⭐ read ⚠⛔ **re-pointed 2026-09-13 — the old `:289-292` cite landed in `nomineeAccounts`'s DOC-BLOCK, ⛔ not in a return** |
| ⛔⛔ The member's **history** carries **⛔ NO nominee/bank data — DELIBERATELY** | `contribution-history.ts:24-25` — *"DELIBERATELY NO other-member field, NO UTR, NO `tr`, **NO nominee/bank data**, NO full names, NO Tier-1 ciphertext"* | ⭐ read |
| The values are returned **UNMASKED** on purpose | `nominee-accounts.ts:18-20` — *"a masked account# cannot be transferred to"* | ⭐ read |
| ✅ Story **A** SHIPPED: the public page carries **⛔ NO banking coordinates** — only the nominee's name | `surface-fields.ts:675-681`; `PublicSahyogVivranNomineeAccount` (`sahyog-vivran.ts:281-293` — ⚠ moved +5 when `8-17` inserted a VPA paragraph) carries **`accountRank` + `accountHolderName` ONLY** | ⭐ **read — `done`, ⛔ no longer merely "ruled"** |
| Two accounts exist per claim, **EQUAL**, ⛔ no primary/secondary | 6.8 / 9.9 ([[project_nominee_bank_disbursement_channel]]) | ⭐ known |
| ⚠ The member path today decrypts **ONE** account, ⛔ not two | `member-pool/handlers.ts:534-543` — the second would be *"a Tier-1 decrypt with ⛔ no authorising purpose"* | ⭐ read |
| ⭐⭐ The **VPA plaintext IS NOW ON A MEMBER WIRE** — ⚠⛔ **⛔ but ⛔ NOT on THIS surface's** | `NomineeBankAccountView.vpa` (`nominee-accounts.ts:103`, `.optional()`), shipped by **`8-17`** under `-191` **cl.1** + `-212` **cl.2** | ⭐ read ⇒ **D3(D) still excludes it here, on ⛔ any drive, in ⛔ any stage** |
| ⚠⛔ **THE 2026-09-11 PREMISE IS RETIRED, ⛔ not deleted** — *"the VPA has ⛔ never been on a member wire"* and *"the VPA fence at `nominee-accounts.ts:44`/`:61`"* | ⛔ Both **FALSE at HEAD**: `vpaPresent` moved to `:71`, `ifsc` to `:66`, and `:27` now reads *"`vpa` is a FIFTH coordinate on this view — OPTIONAL, unmasked"* | ⭐ traced 2026-09-13 ([[feedback_record_unattested_no_backfill]]) |
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
`-199`, its **`-190` cl.6 scale-figure paragraph** (⛔ **by paragraph, ⛔ never by line**): the
*"43,000"* is the **Panel's own ILLUSTRATIVE** number (`-190` cl.6),
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
⚠ **DECISION TYPE: author-committed (BigDev), ⛔ NOT Trustee-ratified** — ⭐ sufficient here, because it
routes work between two of BigDev's own stories and ⛔ overrides ⛔ no ratified clause. ⛔ Labelled
because AC8's *"turn a green test red"* consequence rests on it.

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
⭐ **THE PREFLIGHT IS CLEAR** (both STOPs discharged) ⇒ **Task 1** sections `epics.md` (⛔ **not** Task 0,
which is `[x]` *"RULE D1"*) **and flips the sprint row**, in **ONE** `governance:` commit — ⛔ never split — and **BEFORE** any
code, ⛔ never after.
**And** ⛔ it does ⛔ not proceed while **D2** or **D3** is open — ✅ both ruled.
**And** ⛔⛔ **IT CARRIES ONE OWED DECISION ENTRY: §8.4(ii).** `8-17` (**`done`**) deferred the record
**to this story BY NAME**, and `-213` is **unamended** — it still reads *"nobody has said which"* and
*"carried with **Task 0e**'s packet to the Panel"*. ⇒ ⭐ **a SUCCESSOR entry must land in that same
commit** ([[feedback_supersede_never_reinterpret]], [[feedback_governance_commits_precede_implementation]]).
⚠⛔ Until it lands, §8.4(ii) may ⛔ **NOT** be cited as settled — ⛔ not by AC4 of this story, ⛔ not by anything else.
**And** ⭐ **this story's own `sprint-status.yaml` ROW BLOCK is REWRITTEN** — its Preflight paragraph is
stale on STOP 1, on STOP 2, and on the §8.3(3)/§8.5 authority this story corrected five days ago and
⛔ never swept there ([[feedback_story_validate_footguns]] #16). ⭐ Superseded text stays as **dated,
struck lines**, ⛔ never deleted.
**And** ⭐ **the surviving stale artefacts are ROUTED — ⭐ "route" IS an ACTION, ⛔ never a note.** ⚠ Four
artefacts get **worse** when F ships and ⛔ none is F's to **fix**; ⇒ each is written into
`deferred-work.md` with its address and its trigger, **in this same `governance:` commit**
([[feedback_spec_edits_must_propagate_to_tasks]]).
**And** ⚠ ⛔ `11b-19`'s section (`epics.md`, the `### Story 11b.19` block, minted in a `governance:`
commit **before its first key was written**) is the ⭐ **freshest** SECTION-not-ANNOTATION precedent;
⚠ `11b-20` owes one too, and ⛔ that is ⛔ not F's.

### AC1 — A member can open ONE drive from the list
A detail view, reached from story **E**'s fourth tab, for any drive **E** lists.
⚠⛔ **THE STATE TUPLE, AND ⛔ ITS OWN:** pool states `live` · `closed` · `settled` (⛔ never `spawned`,
`-196`). ⭐ Declare a **NEW named fragment for this surface** — `-196` Consequence 2 forbids sharing or
parameterising the list's tuple. ⚠⛔ **`public-read.ts:283-284` IS ⛔ NOT LITERALLY ABOUT THIS TUPLE
— corrected 2026-09-13 (fourth `validate` pass).** ⭐ Traced live: that passage is the doc-comment for
the four correlated SQL count fragments (`:270-284`), not for `SahyogDriveVisiblePoolState` /
`PUBLIC_STATUS_BY_POOL_STATE` (`:162-173`). `-196` Consequence 2 **quotes** that sentence and applies
it **by analogy** to the pool-state tuple — a move the decision log made, ⛔ not this story inventing
one. ⭐ `-196` Consequence 2 is authority enough on its own; the code citation stands as the source of
the borrowed principle, ⛔ not as a literal reference for this tuple.
⚠⛔ **THE WIRE TOKEN IS `verified`, ⛔ NOT `settled`** — `MemberDriveStage = ['live','closed','verified']`
(`packages/contracts/src/contributions/member-drive-list.ts:43`), mapped by the total
`PUBLIC_STATUS_BY_POOL_STATE` (`packages/domain/src/pool/public-read.ts:169-173`; `settled: 'verified'`
at `:172`).
⚠⛔⛔ **⛔ DO ⛔ NOT "CORRECT" THIS TO `:171-175`. ⭐ RECORDED BECAUSE THE 2026-09-13 PASS DID EXACTLY
THAT, AND WAS WRONG:** `:169-173` is the **complete** map; `:171-175` drops the declaration line and
`live: 'live'`, and runs two lines PAST the closing brace. ⛔ Its stated ground — *"`:169-173` excludes
`settled: 'verified'` at `:174`"* — was **fabricated**: `:174` is **blank**. ⛔ Reverted 2026-09-13
([[feedback_record_unattested_no_backfill]]).
⚠⛔⛔ **⛔ THE TWO VOCABULARIES ⛔ MUST ⛔ NOT BE MIXED IN AN ASSERTION.** ⭐ `live`/`closed`/**`settled`**
are **POOL STATES** (domain); `live`/`closed`/**`verified`** are **WIRE TOKENS** (contract). ⇒ every
fence or comparison test must say **which side of the boundary it asserts on** — ⛔ a wire assertion
written against `settled` matches ⛔ nothing.

### AC2 — It shows at least everything the public drive page shows
For the same drive: the nominee's name, the drive facts, the stage (⭐ story **B**'s vocabulary), the
contributor count and the appeal outcome.
**And** a **comparison test** proves the superset — ⭐ **its assertion is STATED IN FULL at Task 6's
first subtask**, ⛔ not left to be reverse-engineered from the carve-outs below.
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
**And** ⭐ **लक्ष्य per D2(B):** it renders on a `live` drive and the key is **ABSENT** on the **WIRE
TOKENS** `closed`/`verified` (**POOL STATES** `closed`/`settled`) — ⛔ never `null` — mirroring the
list's own producer guard. ⚠ Per AC1, ⛔ **say which side of the boundary you are asserting on.**
⚠⛔⛔ **AND IT IS GATED — `reveal_to_members`, FAIL-CLOSED. ⛔ THIS IS ⛔ NOT OPTIONAL POLISH.**
`-212` cl.1: a member sees the figure ⛔ **only** where a `super_admin` has switched `reveal_to_members`
ON for that Pariwar (`-190` cl.7(b)/(c); `-211` cl.2/cl.3). ⭐ The read goes through
**`resolveDriveTargetVisibility`** (`packages/domain/src/pool/drive-target-policy.ts:233`), ⛔ **NEVER**
`getDriveTargetVisibilityRow` — *"a caller interpreting it is exactly how a fail-closed default becomes
fail-open"* (`-211` cl.3). ⚠⛔ A regression here is a **DISCLOSURE defect, ⛔ not a UI defect**
(`-211` Consequence 4). ⛔ No Pariwar has a row ⇒ **NOTHING renders** on the day this ships — ⭐ that
is **CORRECT**, ⛔ never a bug to "fix".
⚠⛔⛔ **AND THE NUMBER FORM IS RATIFIED — ⛔ do ⛔ not re-derive it and ⛔ do ⛔ not format it here.**
⭐ **Derivation:** `-204` **cl.2** — लक्ष्य **IS** `assignedCount × pools.fixed_amount`; ⛔ there is ⛔ NO
setter and ⛔ nobody types it. ⭐ **Form:** `-206` **cl.3** (Trustee-ratified) — short-form at and above
**₹1,00,000**; **exact below ₹1 lakh**; crore joins at ₹99.99 lakh. ⚠⛔ The **₹10-lakh cut-off is the
CONTRIBUTED amount's rule and does ⛔ NOT apply to the target** (`-211` cl.5). ⛔ That clause exists
because **₹300 once rendered as `₹ 0 lakh`.**
⭐ **Copy:** consume **`drive_target`** (`"Expected: {amount}"`) from **`sahyog-shared`** BY NAME — ⛔ never
mint a second key (`-193` cl.3 — ⛔ **NOT** `-206` cl.1, corrected 2026-09-13, fourth pass: cl.1's
subject is the progress bar's own `82%`; its "ONE SOURCE, ⛔ NOT TWO" sub-point is about that
percentage's format definition, ⛔ not this key. `-193` cl.3 is sufficient authority alone — the
References block already omitted cl.1 here; this citation had simply never been swept to match).
⚠ `{amount}` arrives **ALREADY FORMATTED**. ⚠⛔ F is its
**THIRD** consumer (after `sahyog-render.ts:943` and `MemberDriveList.tsx:485`) ⇒ **`$comment.drive_target`
currently reads *"It now has TWO"* and owes a NAMED amendment** ([[feedback_supersede_never_reinterpret]]).
⚠ ⛔ **AND ⛔ NOT A SUPERSET CLAIM:** the public **DETAIL** page renders ⛔ no target in ⛔ any stage ⇒
D2(B) is a **member-side ADDITION**, ⛔ not a `member ≥ public` assertion, and the comparison test
⛔ cannot cover it against the named floor. ⛔ Do ⛔ not write it as one.
⚠⛔⛔ **AND THE NAME GATE MUST BE RESOLVED ⛔ PER SUBJECT — ⛔ THIS SURFACE PUBLISHES TWO, AND ONLY ONE
IS GATED.** ⭐ Corrected 2026-09-13 ([[feedback_story_validate_footguns]] #20); ⛔ the earlier wording
said *"the public **name** gate"*, unqualified, and would have told the comparison to ignore an
asymmetry on a field where there is **none**.

⭐ **SUBJECT 1 — the DECEASED member's name: GATED, and the gate is PROVISIONING-INERT.**
`isSahyogDrivePublicationClausePinned` (`packages/domain/src/pool/public-read.ts:1298`) requires
`SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID` = `clauseId('niy.public-disclosure.member-information')`
(`public-read.ts:260-262`) to be pinned. ⚠⛔ **TRACED LIVE 2026-09-13: that clause id occurs at ⛔ EXACTLY
ONE site in the whole repo — its own definition.** ⛔ No migration, ⛔ no seed, ⛔ no admin mint path
⇒ ⛔ **no writer**, and the gate is **inert for every Pariwar**. ⇒ on a default `full_name` Pariwar a
member already sees a **deceased** name **nobody can see publicly** (`-209` cl.2). ⛔ That asymmetry is
⛔ NOT a defect and the comparison must ⛔ not flag it.
⚠ (⛔ The old cite `public-pages/handlers.ts:934-955` is `logNamePublicationBasisAbsence` — ⭐ the
diagnostic that **OBSERVES** the inertness, ⛔ **not** the gate. Keep it as evidence, ⛔ not as the
mechanism.)

⛔⛔ **SUBJECT 2 — the NOMINEE's name: ⛔ NO GATE AT ALL, AND ⛔ NOBODY HAS RULED ONE.**
⚠ ⛔ Stated precisely (⛔ corrected 2026-09-13): `-205` **cl.9** is a **scope-negation** — *"nobody has
ruled a narrowing"* — ⛔ which is ⛔ not the same as *"the absence is ruled"*. ⭐ The operative
consequence is unchanged.
`apps/api/src/modules/member-pool/handlers.ts:540-543`: *"⛔⛔ **THERE IS ⛔ NO SECOND GATE ON IT, AND
THAT IS RULED**: `-190` cl.2 published the nominee name and `-205` cl.9 records that narrowing it by
claim OUTCOME would be a NEW suppression rule ⛔ nobody has ruled. ⛔ Do ⛔ not invent one here."*
⇒ ⭐⭐ **on the nominee name the two surfaces are SYMMETRIC, so there is ⛔ NOTHING to carve out — and
the comparison test ⛔ MUST compare it.** ⚠⛔ A carve-out here would **suppress a real failure** on the
one field this whole story exists to surface.

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
✅⭐⭐ The VPA is satisfied **on the PAYMENT screen** instead — and ⭐ **THAT WORK SHIPPED: story `8-17`
is `done`** (`pay.tsx` renders the VPA row; `NomineeBankAccountView.vpa` is on the wire at
`nominee-accounts.ts:103`; `upi_intent.vpa_label` = *"UPI ID"* in both locales). ⇒ `-212` **Consequence 3**
is **CLOSED BY [EDIT]**, ⛔ no longer merely homed, and ⭐ **`-191` cl.1 did ⛔ not lapse twice.**
⚠⛔ ⛔ It was ⛔ never this story's, and it is ⛔ still ⛔ not — ⛔ do ⛔ not absorb it here.
✅ **BOTH ACCOUNTS RENDER — ⛔ and this is ⛔ NOT a reversal** (`#decision-2026-09-10-213` cl.1).
⭐ The list's one-decrypt rule (`member-pool/handlers.ts:534-543`) governs the **HOLDER NAME**, which is
*"the SAME nominee"* twice ⇒ a second decrypt buys ⛔ nothing there. ⚠ **This surface renders
`account_number` and `ifsc`, which ⛔ DIFFER per account** ⇒ the second decrypt returns information the
first does ⛔ not carry, under the purpose `-199` already granted. ⭐ And the money **can have gone to
both** — the two are *"EQUAL payment destinations, the **donor's choice**"* (`nominee-accounts.ts:11`)
⇒ rendering one would be **incomplete by construction**.
⛔⛔ **The list's and the pay screen's one-decrypt behaviour is CORRECT and is ⛔ NOT to be touched.**
⚠⛔⛔ **THE DIFFERING-HOLDER-NAME CASE — ⛔ THE BUILD RULE STANDS, ⛔ ITS OLD GROUND DOES ⛔ NOT.**
⭐ **SURFACE both names, ⛔ never pick one**, and ⛔ encode ⛔ no assumption either way. ⭐ That much is
unchanged and is what Task 5 builds.
⚠⛔⛔ **§8.4(ii) IS ⛔ NOT SETTLED. ⭐ ITS STATUS IS *"DE-ROUTED but ⛔ NOT LOGGED"*, AND THIS STORY OWES
THE RECORD.**
⚠ ⛔ Written this way deliberately: ⭐ the earlier phrasing (*"THE STATUS … IS ⛔ 'SETTLED'"*) used `⛔`
as a negation prefix on a quoted word and ⛔ **read as an assertion that it WAS settled** — ⛔ the
opposite of its meaning, on the one sentence in this story that ⛔ must ⛔ not be ambiguous.
⛔ Corrected 2026-09-13. ⭐ Use the file's own register — ***`⛔ NOT <word>`***, ⛔ never `⛔ "<word>"`. ⛔ Corrected 2026-09-13 ([[feedback_closure_language_precision]],
[[feedback_trace_internal_state_never_cite_decision_text]]).

⭐ **THE SUBSTANCE IS RIGHT AND IS UNCHANGED.** `deferred-work.md` **`D5-subject (i)`** (the
consent-subject gap) grounds it: 6.8's **D1** removed the linkage because the accounts are a
**claim-scoped payment channel**, ⛔ not one row per declared nominee ⇒ ***"the SCHEMA is the authority;
the comment is recorded with a trigger."*** ⇒ ⭐ **two differing holder names are a LEGITIMATE state**,
and the artefact that is wrong is the **code comment** at `member-pool/handlers.ts:534-543` (⭐ the one
pinned range for the one-decrypt rule — ⛔ not `:536-550`, ⛔ not `:539-547`, ⛔ not `:534-542`), ⛔ not the schema.

⚠⛔⛔ **BUT THE STATUS WORD WAS WRONG, AND A `done` SIBLING SAYS SO IN TERMS.** `8-17:352`:
***"But 'de-routed' is ⛔ NOT 'ruled'. The chain is: an OPEN deferred item (⛔ not a ruling) → applied
by an author-committed correction in a SIBLING story (⛔ not a decision entry) → … while `-213`'s entry
still says UNRULED. ⇒ THE RECORD IS OWED, ⛔ and it is ⛔ NOT this story's to write — it belongs with
`11b-17`'s correction."***
⚠ **TRACED LIVE 2026-09-13: `-213` is ⛔ UNAMENDED** — it still reads *"⛔ one of those two is wrong, and
⛔ nobody has said which"* and *"carried with **Task 0e**'s packet to the Panel"*, and records §8.4(ii)
as *"⛔ still open, now routed with Task 0e"*. ⇒ ⛔⛔ **the log and this story DISAGREE and ⛔ nothing has
settled them.**

⇒ ⭐⭐ **THE FIX IS A SUCCESSOR ENTRY, ⛔ NOT AN EDIT TO `-213`** ([[feedback_supersede_never_reinterpret]])
— ordered at **Task 1**, in the same `governance:` commit. ⚠⛔ **Until it lands, §8.4(ii) may ⛔ NOT be cited as settled.**
⭐ **WHAT DOES ⛔ NOT WAIT:** the **BUILD rule** below (surface both names, pick neither) — ⭐ it is what
`6-18` already builds and what the schema already permits, and it is ⛔ **safe under either answer.**
⚠⛔ **DECISION TYPE of the ground:** `D5-subject (i)` is an **author-committed `deferred-work.md`
item**, ⛔ not a ratified clause — ⭐ enough to drop a Panel routing ⛔ only because it **CONFIRMS** 6.8's
**D1** rather than making a new rule.
⚠⛔⛔ **⛔ 6.8's D1 IS ⛔ NOT TRUSTEE-RATIFIED EITHER — ⛔ corrected 2026-09-13.** `6-8-…:27` reads
*"Decision D1 (account model) — ✅ **APPROVED (BigDev, 2026-07-10)**"* ⇒ **author-committed**, and it
appears in `.decision-log.md` ⛔ nowhere as a ratification. ⛔ The earlier wording called it *"ratified"*,
and that sentence was this story's **entire licence to drop a Panel routing** — ⛔ it could ⛔ not carry
the weight.
⭐⭐ **THE STRONGER GROUND, WHICH THIS STORY HAD ⛔ NOT USED: D1 SHIPPED IN THE SCHEMA.**
`claim_nominee_bank_accounts` carries ⛔ no FK to `member_nominees`, ⛔ no `nominee_rank`, ⛔ no
holder-name-must-match validation (DDL `migrations/0056`). ⇒ ⭐ **a BUILT constraint outranks a decision
text** ([[feedback_trace_internal_state_never_cite_decision_text]]).
⚠ ⛔ Amending a doc-block to match a ruled authority is ⛔ not a governance act; ⭐ **writing the
successor entry is.**
⭐⭐ **AND A SIBLING IS ALREADY BUILDING ON THE ANSWER — ⛔ IT WAS NEVER NAMED HERE.**
`6-18-nominee-holder-name-on-the-verification-console` is **`ready-for-dev`** (Epic 6, Trustee-commissioned
2026-09-05); its **AC1** bullet 1 orders *"for **each** of the two accounts: the account holder name and
the declared nominee name(s)"*.
⚠⛔ **⛔ THAT IS A ONE-BULLET QUOTE. ⛔ Do ⛔ not splice it with AC1's bullet 4** (*"⛔ the story does ⛔ not
pick one"*) — ⭐ bullet 4's subject is **two declared NOMINEES**, ⛔ not two account-holder names; the
earlier wording here spliced them and manufactured a sentence. ⛔ Corrected 2026-09-13.
⚠⛔⛔ **AND `6-18` IS ⛔ NOT PROOF THE QUESTION IS SETTLED:** its own header says it does ⛔ **NOT** close
`D5-subject` **(i)** (it closes **(ii)** — *"different half, different fix, ⛔ explicitly forbidden here"*),
and **its own D1 is OPEN and ⛔ BLOCKS its AC1/AC2.** ⇒ ⭐ **align with `6-18`'s SHAPE, ⛔ do ⛔ not
re-litigate — and ⛔ do ⛔ not cite it as an answer** ([[feedback_circular_deferral_between_sibling_stories]]).
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
⚠⛔⛔ **AND `$comment.nominee` ALREADY CARRIES AN `8-17` SUPERSESSION CLAUSE — ⛔ APPEND, ⛔ DO ⛔ NOT
OVERWRITE.** ⭐ Traced 2026-09-13: `8-17` amended it to read *"⚠ PARTIALLY SUPERSEDED at Story 8.17 — and
⛔ only the ATTRIBUTION half … ⛔ NOW WRONG for ONE of the five: the VPA is ⛔ NOT story F's."* ⇒ ⭐ `8-17`
fixed the **attribution** half; ⛔ **the false ruled-wording claim is untouched and is still F's** —
add F's correction as a **second dated clause**, in both locales.
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
**And** ⚠⛔⛔ **THE CONVERSE IS ⛔ NOT IMPLIED — AC8 PUTS `publicToken` ON THE SCREEN, DELIBERATELY.**
⭐ The rule fenced here is *"⛔ not in the **durable audit chain**"*, ⛔ **not** *"⛔ nowhere"*. ⇒ ⛔ do
⛔ not "fix" AC8 to satisfy AC5 — ⭐ the asymmetry is argued at **AC8** and is survivable because
`rotatePoolPublicToken` exists.
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
✅ **THE TARGET IS RULED, ⛔ not excluded — `-212` cl.1: **POOL STATE** `live` ONLY.** ⚠ ⛔ Do ⛔ not
restore the retired *"⛔ no target"* sentence (`-211` cl.1 struck it at all three sites in story E);
⛔ and ⛔ do ⛔ not read D2(B) as that sentence returning — the figure **renders**, on one stage.

**And** ⭐ AC7 is discharged by a **fence test**, ⛔ not by assertion — ⚠⛔⛔ **⛔ NOT *"the shape E's AC8
uses"*. ⛔ CORRECTED 2026-09-13** ([[feedback_story_validate_footguns]] #16 — the same finding was
already made against `11b-19` and ⛔ never swept to this story, which carried the sentence verbatim).
⛔ **E's AC8 is a PROSE ENUMERATION that scans ⛔ NOTHING**, and it was **breached by E's own dev and
then NARROWED in review** (`11b-15:864`) ⇒ ⛔ the worst available model.
⭐⭐ **THE MODEL IS `packages/i18n/tests/sahyog-shared-dark-copy.test.ts`**, which carries all four
properties a fence needs: a **repo walk** over `apps/` + `packages/`; a **NON-VACUITY assertion**
(⛔ a green scan over an empty file set proves ⛔ nothing — [[feedback_gate_scope_semantic_coverage]]);
**self-exclusion by REAL PATH** (`realpathSync(f) === OWN_FILE`, ⛔ not a basename); and an
`AUTHORISED` allow-list that is ⛔ **not a waiver**. ⭐ And it was **PROVEN TO BITE** with a planted
probe, ⛔ not read off a green run.
**And** ⚠⛔ **THE FENCE MUST ⛔ NOT RE-ASSERT WHAT AC8 AND AC10 DELIBERATELY BREAK** —
⛔ `drive-list-render.test.ts:272`'s *"no `onPress`"* (**AC8** amends it BY NAME) and the dark-copy
`AUTHORISED = []` (**AC10** narrows it BY NAME). ⭐ AC7 fences the **public** surface and the four named
non-moves, ⛔ nothing inside this story's own blast radius.

### AC8 — ⭐ The drive is REACHABLE: `drive_href` + `pool_canonical_identifier` RENDER here
Routed obligation 1. ⭐ E carries both on the member wire (`poolCanonicalIdentifier` `:121`,
`publicToken` `:131`) and renders **neither** — `publicToken`'s only uses there are `keyExtractor`
(`MemberDriveList.tsx:347`) and the dedupe (`useMemberDriveListQuery.ts:111`), ⛔ both keying, ⛔ neither
a render.
⚠⛔ **`drive_href` IS `publicToken` ON THE MEMBER WIRE** — there is ⛔ no key literally named
`drive_href`; it is a public **field-id** mapped at
`apps/public/tests/member-drive-list-field-floor.test.ts:67` (`drive_href: ['publicToken']`)
— ⚠⛔ ⛔ **there is ⛔ NO subdirectory**; the old `tests/…/` path was phantom, corrected 2026-09-13.
⚠⛔ ⇒ **ONE value, TWO names.** ⛔ Do ⛔ not render the **field-id** as a label — ⭐ `drive_href` is the
public map's *name for the field*, ⛔ not a key on the member wire.
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
⚠⛔⛔ **BUT CHECK WHETHER IT FIRES AT ALL — ⛔ THE FENCE IS SCOPED TO `DriveRow`.** ⭐ Traced 2026-09-13:
`:275` reads `const row = listCode.slice(listCode.indexOf('function DriveRow'))` ⇒ the assertions at
`:276-279` cover **E's ROW ONLY**. ⇒ ⭐ if this story's affordance lands on a **new detail screen**
rather than making `DriveRow` tappable, **that test stays GREEN** and ⛔ there is ⛔ nothing to amend.
⚠ AC1 (*"reached from story E's fourth tab"*) implies the row **does** become tappable ⇒ expect the
red. ⛔ Do ⛔ not conclude from a green run that the amendment was unnecessary — ⭐ decide it from
**where you put the control**.

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
**And** ⚠ `-207` **cl.2**: where a drive's amount is **₹0** on the **WIRE TOKENS** `closed`/`verified`
(**POOL STATES** `closed`/`settled`), the "About this drive" sentence renders **NOTHING** — ⛔ no
placeholder, ⛔ no marker, ⛔ no partial sentence.

### AC10 — ⭐ The Panel's own message block and the `Nominee full name` | `District` table RENDER here
✅⭐⭐ **UNGATED — BOTH STOPS DISCHARGED. ⛔ BUILDABLE NOW.**
⭐ Ratified 2026-09-05, DR + KB (`…-11b12-under-funded-commitment-claim.md` **§8.1**, routed at
**§9.1 row 3**): ***"B can ship the shared copy source now. E/F consume it later."*** ⚠ §8.3(2): the
five-paragraph text *"is written for a **PAGE**"* ⇒ ⭐ **this** surface carries the full block; E's row
does ⛔ not. ⭐ Recorded at `-214` **cl.4(b)**: *"`11b-17` carries the MEMBER render — **AC10 / Task 5d** —
and ⛔ nothing more."*

⭐⭐ **THE EIGHT KEYS, BY NAME** — shipped by **`11b-19`** (`done`) into
`packages/i18n/locales/{en,hi}/sahyog-shared.json`, **BOTH locales**:
`message_block.headline.full` · `message_block.headline.no_family` · `message_block.solidarity` ·
`message_block.gratitude` · `message_block.tagline` · `message_block.join` ·
`message_block.table.nominee_name` (= *"Nominee full name"*) · `message_block.table.district`
(= *"District"*).

⚠⛔⛔ **FOUR RULED RENDER PROPERTIES — ⭐ `11b-19` PINNED EACH ONE IN ITS TEST. ⛔ READ BEFORE RENDERING.**
⭐ **(1) `{amount}` ARRIVES ALREADY FORMATTED AND CARRIES ITS OWN ₹** ⇒ ⛔ the copy carries ⛔ no literal
₹; adding one ships **₹₹**.
⭐ **(2) THE VARIANT IS CHOSEN ON NULLABILITY, AND ⛔ ONLY THE HEADLINE VARIES.** `.headline.no_family`
when the deceased name is null, `.headline.full` otherwise — `{family_name}` is the ⛔ **ONLY** omittable
token, and the other four paragraphs are **token-free by design**. ⚠⛔ `t()` **THROWS** on an unsupplied
token (`packages/i18n/src/resolver.ts:36-42`) and this block is **PAGE-shaped** ⇒ ⛔ **a `.full` on a
nameless drive takes down the WHOLE PAGE**, ⛔ not one line.
⭐ **(3) THERE IS ⛔ NO `no_amount` VARIANT AND ⛔ THERE MUST ⛔ NOT BE ONE.** Where the amount is
unavailable the block renders **NOTHING** — ⛔ it does ⛔ not fall back (**`-207` cl.2**, the ₹0-silence rule AC9 also
carries). ⚠⛔ ⛔ **NOT `-214` Consequence 5** — ⭐ that Consequence is about `{family_name}`'s nullability
and grounds property **(2)**, ⛔ not this one; ⛔ corrected 2026-09-13.
⭐ **(4) AN ABSENT `district` DROPS ITS COLUMN** — ⛔ never *"Not recorded"*, ⛔ never a placeholder,
⛔ never left attached to the nominee (the district clause travels with the **DECEASED**). `district` is
`.nullable()` on the contract. ⭐ Ground: **`-214` Consequence 6** (§10.2 ruling 3 — *an absent token
**DROPS ITS CLAUSE***, ⛔ no placeholder, ⛔ no combinatorial variants).
⚠⛔ **AND ⛔ NO KEY MAY ASSERT THE NOMINEE RELATIONSHIP** (`-214` Consequence 8) — the value behind
*"Nominee full name"* is `account_holder_name_ciphertext`, and `D5-subject (i)` **records** that **the
SCHEMA is the authority**. ⭐ They are **LABELS, ⛔ not assertions.**
⭐ **(5) TWO DELIBERATE DIVERGENCES `11b-19` RECORDED — ⛔ DO ⛔ NOT "FIX" EITHER.** ⚠⛔ Both live only in
`$comment.message_block` and reached ⛔ no AC until 2026-09-13:
⛔⛔ **(a) THE HINDI HEADLINE USES `स्व.` WHILE THE SHIPPED `index_line.*` / `zero_line.*` USE `स्व०`.**
⭐ That is §8.1's **own spelling** and was *"CHECKED, ⛔ not missed"* — ⛔ normalising it would be
**re-punctuating Trustee-ratified text**. ⭐ The divergence is **RECORDED for a future routing note,
⛔ never harmonised here** ([[feedback_supersede_never_reinterpret]]). ⚠ A dev will see both spellings on
one screen; ⛔ leave them.
⚠ **(b) THE TABLE'S TWO HINDI LABELS ARE THE ONE PLACE §8.1 GAVE ⛔ NO HINDI** — ⭐ `11b-19` lifted them
from §9.2's ratified HI index line and **RECORDED** it. ⛔ Not a dev translation, ⭐ but a gap a future
routing note should confirm.

**And** ⚠⛔⛔ **DISCHARGING THIS TURNS A SECOND GREEN TEST RED, BY DESIGN — ⛔ THE STORY CARRIED ⛔ NO
MENTION OF IT UNTIL 2026-09-13.** `packages/i18n/tests/sahyog-shared-dark-copy.test.ts:530`
(*"⛔ ⛔ ZERO CONSUMERS — ⛔ no source file resolves a `message_block.*` key"*) walks `apps/` + `packages/`
with `RESOLVER = /['"`]message_block\.[\w.$]+/` against `AUTHORISED: string[] = []` (`:560`). ⚠⛔ The
regex was **deliberately hardened on 2026-09-12** so a runtime-built key —
`` `message_block.headline.${variant}` `` — **cannot slip past**; ⭐ that is exactly the shape Task 5d
will write. ⇒ ⛔ **there is ⛔ NO way to build AC10 without meeting this fence.**
⛔⛔ **⛔ DO ⛔ NOT DELETE IT AND ⛔ DO ⛔ NOT APPEND TO `AUTHORISED` TO GO GREEN** — the file says so
itself (`:559`: *"a render arriving without its story is the exact defect this file exists to catch"*).
⭐ **NARROW IT**, per its own author's written instruction (`:535-539`): re-state it as ***"⛔ never
resolved without every token supplied"***, naming this render site, exactly as story **D** narrowed the
`index_line.*` fence ([[feedback_supersede_never_reinterpret]]).
**And** ⭐ a **two-column table — `Nominee full name` | `District` — sits ABOVE the message**, on the
member view (the public view is ⛔ not this story's).
**And** ⛔⛔ **CONSUME THE PANEL'S OWN WORDING FROM `sahyog-shared` BY NAME** — ⛔ never re-derive it,
⛔ never translate it, ⛔ never mint a second copy (`-193` cl.3 — ⛔ **NOT** `-206` cl.1; see AC2's
correction). ⚠ Story **B** ships it;
⛔ if the key is absent at build time that is a **STOP**, ⛔ not a licence to author copy at a render
site ([[feedback_story_validate_footguns]] #8).
**And** ⚠ **the nominee's name here is FULL NAME** (`-205` cl.1, built in **D**) — ⛔ not the per-Pariwar
`public_name_presentation_mode`, which has ⛔ **no subject** for a claim-scoped value.
**And** ⚠ **`district` already ships on the member wire** and E renders it per row ⇒ ⛔ omitting it here
would make **F the surface that DROPS it**.

### AC11 — ⭐ Family 13, in full — ⚠⛔ and the `accessible` idiom is **TWO-TIER**
⚠⛔ **WRITTEN 2026-09-13.** ⛔ Until now *"family 13 in full"* lived ⛔ ONLY as a Task-5 subtask with
⛔ no acceptance criterion and ⛔ no test — ⭐ the whole a11y surface of a new member screen,
unverifiable. ⚠ Story **E** carried a dedicated `AC5 — Family 13, in full`; F carried none
([[feedback_spec_edits_must_propagate_to_tasks]]).

Every **control** carries `accessible={true}` + `accessibilityRole` + an accessible name, and is a
**SIBLING**, ⛔ never a descendant, of a labelled container.
⛔⛔ **⛔ Do ⛔ not put an `accessibilityLabel` on a container that WRAPS CONTROLS — label the LEAVES.**
**And** ⚠⛔ **the checklist's own 13(a) is WRONG and has ⛔ not been swept there** — it reads,
unqualified, *"a container carrying `accessibilityLabel` is explicitly `accessible={true}`"*; ⭐ E's
THIRD pass disproved it at `MemberDriveList.tsx:233-240`. ⛔ **Following it would have made AC8's
control UNREACHABLE.**
**And** ⚠ AC9's zero-day **accessible name** obeys the same softening the sighted copy does.
**And** ⛔⛔ **`ANONYMIZED_SENTINEL` ⛔ NEVER RENDERS.** `anonymizeMember` overwrites `name_ciphertext`
**in place** with an *encrypted* `[anonymized]` sentinel and **RETAINS the row** ⇒ the decrypt
**SUCCEEDS** and the sentinel would render verbatim where a family name belongs
(`member-pool/handlers.ts:497-524`). ⭐ This surface's remedy is the **drive list's** (keep the drive,
drop the name), ⛔ **not** the contributor list's (omit the row) — ⛔ do ⛔ not copy mechanically.
**And** a test asserts it.

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
> ⚠⛔ **DECISION TYPE: Author-committed (BigDev). ⛔ NOT Trustee-ratified** (`-199`, its
> **Decision-type line** — *"⛔ no 'by DR and KB' line"*; ⛔ **by line-of-text, ⛔ never by line-number**).
> ⭐ It applies Trustee-ratified `-190` cl.3 **literally**. ⚠ That
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
TOTAL"*; the slot quote is cl.12's 2026-09-08 correction table (routing note §12.1 answer 4).
⚠⛔⛔ **THE MIS-CITE IS `-212` cl.1's OWN, AND ⛔ A STORY FILE ⛔ CANNOT CORRECT A RATIFIED CLAUSE.**
⛔ Corrected 2026-09-13 ([[feedback_supersede_never_reinterpret]]): the earlier wording said it *"is
corrected here"* — ⛔ it is ⛔ **not**. ⇒ ⭐ **BUILD to cl.12's slot, ⛔ do ⛔ not propagate the mis-cite,
and ⭐ RECORD the correction for a SUCCESSOR entry** — routed with the stale artefacts at Task 1.
⚠ **DECISION TYPE of `-211`: author-committed (BigDev, 2026-09-09), ⛔ NOT Trustee-ratified** — ⭐ it
applies Trustee-ratified `-190` cl.7(b)/(c). ⛔ Labelled because **`-211` cl.3 is the sole authority for
AC2's DISCLOSURE-class fail-closed gate**, and this story labels `-199` and did ⛔ not label this one.

⭐ **AND `-189` cl.3 HOLDS:** the public index is **live-only** too ⇒ a member opening a `closed` drive
sees ⛔ no less than a stranger. ⚠ ⛔ The earlier worry that (B) would put the detail below the list is
⛔ answered — under (B) the two agree **by construction**.

⛔ **THE GATE IS UNCHANGED** and was never in question: ⛔ only where a `super_admin` has switched
`reveal_to_members` ON; fail-closed; ⛔ no Pariwar has a row ⇒ **NOTHING renders** on the day this ships.

⚠ **Task 2 owes its OWN named live-only fragment** — `-196` Consequence 2 forbids sharing or
parameterising the list's tuple (`-212` Consequence 2). ⚠⛔ The `public-read.ts:283-284` half of this
citation is a borrowed-by-analogy source, ⛔ not literally about this tuple — see AC1's gloss.

### ✅ D3 — **RULED (D) by the TRUSTEE PANEL, 2026-09-10** (`#decision-2026-09-10-212` cl.2)

> ⭐⭐ **THE RULING:** the nominee's **UPI ID is ⛔ NOT on this page**. ⭐ It is **ADDED to the PAYMENT
> screen**, where a member is actually asked to pay. ⭐ **Trustee-ratified, DR + KB.**

⇒ ⭐ **AC4 renders FIVE coordinates** — account number, IFSC, holder name, bank, branch. ⛔ No `vpa`.

⚠⛔⛔ **AND THE OTHER HALF IS ⛔ NOT THIS STORY'S — ⛔ do ⛔ not absorb it, ⛔ do ⛔ not drop it.**
`-212` Consequence 3: the payment-screen change touches `NomineeBankAccountView`
(`nominee-accounts.ts`), the `nominee-accounts` handler's decrypt, and `pay.tsx:473-480` — ⭐ which
today renders account holder, bank, **full account number** and IFSC, and ⛔ **no VPA row**. ⇒ it needs
a **named home** recorded **before F ships**. ⚠ `-191` cl.1 already lapsed once for want of one.

⚠⛔ **THREE THINGS THAT WORK CARRIED — ⭐ AND `8-17` IS NOW `done`. TRACED LIVE 2026-09-13:**
✅ **(a)** the `.strict()` additive-field trigger **FIRED** (`-212` Consequence 4) — ⭐ **CLOSED BY
[EDIT]**: `8-17`'s **AC8** states the required deployment order (the **mobile build reaches devices
FIRST, then the API deploys**), grounded on `packages/api-client/src/index.ts:261`'s throwing
`schema.parse`. ⇒ ⭐ **that is now the worked precedent — see Task 2.**
✅ **(b)** a UPI-ID label **was MINTED** (Consequence 5) — ⭐ **CLOSED BY [EDIT]**:
`upi_intent.vpa_label` = *"UPI ID"*, both locales.
⚠⛔ **(c)** the pay screen still labels the nominee *"Account holder"* (`contribution.json:213`,
rendered at `pay.tsx`), which `-190` cl.2 rules ⛔ not to be used — ⚠ whether cl.2 binds ⛔ only the
public surface is **⛔ STILL UNRESOLVED**. ⛔⛔ **`8-17` is `done` and its AC6(a) records it *"⛔ NOT
relabelled — recorded, untouched"*** ⇒ ⭐ **Consequence 6 now has ⛔ NO LIVE HOME.** ⛔ Still ⛔ not F's,
and ⛔ still ⛔ **not** to be fixed by side effect ([[feedback_closure_language_precision]]).

⭐⭐ **WHAT cl.2 SUPERSEDED, NAMED:** `deferred-work.md` item **(e)**'s *"do ⛔ NOT … add `vpa` to that
wire; that would be a NEW Tier-1 exposure ⛔ nobody ruled on."* ⚠ Its ground was **⛔ false when
written** — `-191` cl.1 had ruled, and item (e) quotes it in the same paragraph. ⇒ item (e) is amended
to record the supersession **and** the wrong ground ([[feedback_closure_language_precision]]).

## ⚠ What this story does ⛔ NOT do

⛔ No public surface · ⛔ no masking change (⭐ dormant, `-190` cl.4) · ⛔ no change to the 9.9 donor
path's own live-pool gate · ⛔ no widening of `contribution-history` without naming Trap 3's reversal ·
⛔ no contributor names · ⛔ no `spawned` · ⛔ no masked display of a coordinate (Trap 4) · ⛔ **no `vpa`
on any wire** (✅ **D3(D)** — it goes on the PAYMENT screen, ⛔ a different surface, ⛔ not this story) ·
⛔ **no लक्ष्य on a `closed` or `settled` drive** (**POOL STATES**; ⭐ **WIRE TOKENS** `closed`/`verified`)
(✅ **D2(B)**).

⚠⛔ **⛔ AND ⛔ NOT the payment-screen work itself** — ruled, ⛔ but ⛔ NOT F's (`-212` Consequence 3);
✅⭐ **`8-17` is `done` and SHIPPED it.**
⚠⛔ **AND ⛔ NOT the PUBLIC view of AC10's table and message block** — the 2026-09-05 ruling binds both
views; ⭐ **this story renders the MEMBER one only.** ✅ The public half is **HOMED** at
**`11b-20-public-sahyog-vivran-message-block`** (`ready-for-dev`, `-214` Consequence 3) — ⚠⛔ **HOMED,
⛔ NOT built, and ⛔ NOT closed** ([[feedback_closure_language_precision]]).

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
      **BEFORE** any code. **D2 → (B)** `live` only; **D3 → (D)** the UPI ID goes on the payment screen.
      ⚠ Read its **Consequences 3-6** before Task 2.
- [x] ✅⭐ **Task 0e — CLOSED BY [EDIT]: story `8-17-nominee-vpa-on-the-payment-screen` is `done`**
      (2026-09-12, commits `5ffb366a` + `66976803`). ⛔ ⛔ **NOT merely "homed" and ⛔ no longer
      `ready-for-dev`** — ⭐ corrected 2026-09-13 ([[feedback_closure_language_precision]]: a
      `ready-for-dev` home is **HOMED**, ⛔ never DISCHARGED; this one has since actually shipped).
      ⭐ `-212` **Consequence 3** (the render), **Consequence 4** (the `.strict()` deployment order) and
      **Consequence 5** (the UPI-ID label) are all **CLOSED BY [EDIT]**. ⇒ ⭐ `-191` cl.1 did ⛔ **not**
      lapse twice.
      ⚠⛔ **TWO THINGS `8-17` did ⛔ NOT close, ⛔ and neither is F's to fix:** ⭐ `-212` **Consequence 6**
      (*"Account holder"* vs `-190` cl.2) — recorded *"⛔ NOT relabelled"* at its AC6(a) ⇒ ⛔ **no live
      home**; and ⭐ **§8.4(ii)'s owed RECORD**, which `8-17:352` deferred **to this story BY NAME** ⇒
      ⛔ **that one IS F's, and it is ordered at Task 1.**
- [x] ~~**Task 0e (original wording) — GIVE THE PAY-SCREEN WORK A NAMED HOME**~~ (`-212` Consequence 3) — ⛔ NOT built
      here. ⭐ A story of its own, or an explicit `deferred-work.md` entry with a trigger, recorded
      **before this story ships**. ⛔ A ratified instruction must ⛔ not lapse twice.
      ⚠⛔ ~~**AND THE SAME PACKET CARRIES §8.4(ii)** — ⛔ the Panel names which.~~ ⛔⛔ **WITHDRAWN
      2026-09-11: THERE IS ⛔ NOTHING FOR THE PANEL TO NAME.** ⭐ `deferred-work.md` **`D5-subject (i)`**
      already ruled it — 6.8's **D1** made the accounts a **claim-scoped payment channel** ⇒ ***"the
      SCHEMA is the authority"***, so two differing holder names are a **legitimate state** and the
      wrong artefact is the **code comment** (`member-pool/handlers.ts:534-543`). ⚠ `6-18` is
      **`ready-for-dev`** on that same ground. ⇒ ⭐ amending a doc-block is ⛔ **not** a governance act;
      see **AC4**. ⛔ Row kept as the record ([[feedback_record_unattested_no_backfill]]).
- [x] **Task 1 — GOVERNANCE** (AC0, **AC6**, **AC10**) — ⭐ a **SECTION** in `epics.md`, ⛔ not an
      annotation (this is a new member-app surface with ⛔ no parent there).
      ⚠⛔⛔ **⛔ NAVIGATE `sprint-status.yaml` BY ROW KEY, ⛔ NEVER BY LINE NUMBER.** ⭐ It is a
      **newest-first PREPEND ledger** — one new entry rots every older anchor at once, silently
      ([[feedback_story_validate_footguns]] #19, [[project_sprint_status_ledger]]). ⛔⛔ **All three line
      numbers this task carried until 2026-09-13 were stale by ~570-610 lines** and landed in Epic 1,
      Epic 6 and Epic 7 rows respectively. ⇒ ⭐ **grep the literal key
      `11b-15-member-drive-list-fourth-tab:` and read the comment block IMMEDIATELY ABOVE it** — it
      states *"⛔ No `### Story 11b.15` SECTION in `epics.md` — owes one (Task 0)"* and *"⭐ **A SECTION,
      ⛔ NOT AN ANNOTATION**"*. ⛔ **NOT** the `11b-13-per-pariwar-drive-target-substrate:` block, which
      says that story owes an **ANNOTATION** — the opposite of what it was once cited for.
      ⭐ **AND THE FRESHEST PRECEDENT IS NOW LIVE:** `11b-19` minted its own `### Story 11b.19` section
      in a `governance:` commit **before its first key was written** — ⭐ mirror that shape.
      Flip the sprint row; record D2/D3 and **AC6's sentence**; **ONE** `governance:` commit, ⛔ never split.
  - [x] ✅ **STOP 1 — DISCHARGED. THE DECISION ENTRY ALREADY LANDED (2026-09-11): `#decision-2026-09-11-214`.**
        ⛔⛔ **⛔ DO ⛔ NOT WRITE A SECOND ENTRY.** ⚠⛔ This row read `[ ]` *"WRITE THE MISSING DECISION
        ENTRY … for the 2026-09-05 **§8.3(3)/§8.5** ruling"* until 2026-09-13 — ⛔ **twice wrong**: the
        entry exists, and that authority cite was already corrected to **§8.1 / §9.1 row 3** by this
        story's own v1.2. ⭐ Row kept as the record ([[feedback_record_unattested_no_backfill]]).
  - [x] ⛔⛔ **WRITE THE §8.4(ii) SUCCESSOR ENTRY — ⭐ `8-17` DEFERRED IT HERE BY NAME.**
        (`8-17:348-354` — ⚠ the chain's third step, *"→ on an **unmerged branch** (⛔ not on `main`)"*, is part of the quote; and its Completion Notes: *"the owed record belongs with `11b-17`'s correction"*.)
        ⚠ `-213` is **UNAMENDED** — it still reads *"nobody has said which"* and *"carried with **Task 0e**'s
        packet to the Panel"*, and records §8.4(ii) as *"⛔ still open"*. ⇒ ⛔⛔ **the log and this story
        DISAGREE and ⛔ nothing has settled them.**
        ⭐ **WRITE A SUCCESSOR ENTRY, ⛔ NEVER EDIT `-213`** ([[feedback_supersede_never_reinterpret]]):
        record that `deferred-work.md`'s **`D5-subject (i)`** — *"the SCHEMA is the authority"*, grounded
        on 6.8's ratified **D1** — **DE-ROUTES** §8.4(ii); that `6-18` (`ready-for-dev`) already builds on
        it; and that the honest prior status was ***"DE-ROUTED but ⛔ NOT LOGGED"***, ⛔ not *"closed"*
        ([[feedback_closure_language_precision]]). ⚠⛔ **Until it lands, §8.4(ii) may ⛔ NOT be cited as
        settled — ⛔ not by AC4 of this story, ⛔ not by anything else.**
  - [x] ⚠⛔ **REWRITE THIS STORY'S OWN `sprint-status.yaml` ROW BLOCK — ⛔ navigate by the literal key
        `11b-17-member-drive-detail-unredacted:` and read the comment block IMMEDIATELY ABOVE it.**
        ⭐⭐ **THE FIVE 2026-09-11 STALENESSES ARE ⛔ ALREADY DISCHARGED** as dated strikes (annotation⇒SECTION,
        blocked-on-A-and-E, the disclosure note, *"43,000"* twice, *"recommends (b)"*) — ⛔ **do ⛔ not
        re-apply them.** ⚠ **WHAT IS NEW AND OWED:** (a) its *"PREFLIGHT IS RE-OPENED — STOP 1"* paragraph
        (⇒ **DISCHARGED**, `-214`); (b) that paragraph's **§8.3(3)/§8.5 row 3** authority cite (⇒ **§8.1 /
        §9.1 row 3** — ⛔ this story corrected it at v1.2 and ⛔ **never swept the ledger**, which is
        [[feedback_story_validate_footguns]] #16 committed by the pass that flagged it); (c) **STOP 2
        DISCHARGED** by `11b-19` (`done`); (d) `-214` **Consequence 3 HOMED** at `11b-20`.
        ⭐ Keep every superseded line as a **dated, struck line**, ⛔ never delete it.
  - [x] ⚠⛔ **ROUTE THE SURVIVING STALE ARTEFACTS — ⭐ "ROUTE" IS AN ACTION, ⛔ NOT A NOTE.**
        ⛔ Until 2026-09-13 all four lived in Dev Notes prose with ⛔ no AC and ⛔ no Task — ⭐ the precise
        defect this story credits itself with fixing for E's two obligations
        ([[feedback_spec_edits_must_propagate_to_tasks]]). ⛔ **Do ⛔ not FIX them here** — write each into
        `deferred-work.md` with its address and its trigger, in this `governance:` commit:
        **(a)** `apps/admin/src/modules/drive-target/i18n-en.ts:108-109` — the `noConsumerNote` an
        operator reads on **both** reveal checkboxes (bound at `RevealSwitchesForm.tsx:163-166` and
        `:178-181`; the note element itself is `:245-251`). ⚠ Already false at HEAD (two consumers) and
        ⭐ **D2(B) makes F a THIRD.** ⭐ Trigger: **FIRED**.
        **(b)** `packages/contracts/src/public-pages/sahyog-vivran.ts:289` — *"the same discipline `-165`
        established for the masked arm"*, which AC3 rules the wrong citation. ⚠ ⛔ Navigate by the
        doc-block above `accountHolderName`, ⛔ not the number — ⭐ it moved `:284`→`:289` when `8-17`
        shipped. ⭐ One site, ⛔ not swept.
        **(c)** `11b-14:1072-1075` — a `done` sibling asserting the **RETIRED** *"no target"* sentence and
        the superseded count of **seven**. ⭐ **Record staleness**, ⛔ not a live gate.
        **(d)** `-212` **cl.1's own mis-cite** of `-204` cl.2 where the ruled slot is **cl.12** — ⭐ record
        it for a successor entry; ⛔ **a story file cannot correct a ratified clause** (see D2).
        **(e)** ⚠⛔⛔ **`-212` Consequence 6 — ⛔ ADDED 2026-09-13, because this story DIAGNOSED it unhomed
        and then routed it ⛔ NOWHERE.** The pay screen's `upi_intent.account_holder_label` = *"Account
        holder"* (`contribution.json:213`) against `-190` **cl.2**. ⭐ Its routed owner was *"whoever takes
        Consequence 3"* — that is **`8-17`**, which is **`done`** and **DECLINED** it (its AC6(a):
        *"⛔ NOT relabelled — recorded, untouched"*). ⭐ **Trigger:** the next story touching the payment
        screen's labels. ⛔ Still ⛔ not F's to fix.
        ⚠ ⛔ This story built the instrument for exactly this case (*"⭐ 'route' IS an ACTION"*) and ⛔ did
        ⛔ not use it — ⭐ the same defect it charges others with ([[feedback_spec_edits_must_propagate_to_tasks]]).
        **(f)** ⚠⛔ **ADDED 2026-09-13 (fourth `validate` pass) — a `pay.tsx` DOC-COMMENT IS STALE, AND
        NEITHER `8-17` NOR THIS STORY SWEPT IT.** `apps/mobile/app/(contribution)/pay.tsx:16-18`'s flow
        comment still reads *"the nominee-VPA substrate is still deferred"* for the
        `reason: 'vpa_not_collected'` branch — ⛔ **false at HEAD**: `8-17` (`done`) shipped VPA
        collection/render on this same screen (see D3/AC4). ⭐ Found incidentally while re-verifying
        this story's `-212` Consequence 3 citations, ⛔ not by design. ⛔ Not F's file, ⛔ not F's to fix
        — ⭐ **Trigger:** the next story touching `pay.tsx`'s flow comment or the
        `vpa_not_collected`/`accounts_not_collected` branch.
  - [x] ⚠ **AMEND THE TWO DOC-BLOCKS THIS STORY SUPERSEDES, BY NAME** — `$comment.drive_target`
        (*"It now has TWO"* ⇒ three) and `$comment.nominee` + `MemberDriveList.tsx:519-520` (which route
        `nominee.label` here, and whose ruled-wording claim is **false**; see AC4). ⚠⛔ `$comment.nominee`
        **already carries an `8-17` supersession clause — ⛔ APPEND a second dated clause, ⛔ do ⛔ not
        overwrite it.**
        ⚠⛔⛔ **THESE ARE EDITS TO CODE FILES (`.json`, `.tsx`) ⇒ ⛔ THEY DO ⛔ NOT RIDE IN THE
        `governance:` COMMIT** ([[feedback_governance_commits_precede_implementation]]). ⭐ Comment-only
        or not, they ship with **Task 5**.
- [x] **Task 2 — The read** (AC1, AC2, AC3) — a member-scoped per-drive read with its **OWN** named
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
      ⚠⛔ **Per Trap 3, ⛔ do ⛔ NOT widen `contribution-history`** — ⭐ build the detail's own read with
      its own justification. ⛔⛔ **The *"or"* in the earlier wording was ⛔ not a choice** (corrected
      2026-09-13): ⛔ if you widen it anyway, the **REVERSAL must be NAMED and ARGUED** (`-199`
      Consequence 3), ⛔ never absorbed.
      ⚠⛔ **FORWARD-COMPAT — `deferred-work.md`'s `.strict()` ADDITIVE-FIELD ITEM (the **11b-15
      THIRD-pass section**'s `.strict()` additive-field item — ⭐ **cite it by ITEM, ⛔ never by line;
      the file's own rule says so**) NAMES THIS STORY TWICE:** `MemberDriveListEntry` is `.strict()` and
      `api-client`'s `call` throws ⇒ *"When **story F (`11b-17`)** … adds one field to the entry and the
      API ships, every INSTALLED app build older than that release … takes the FULL-SCREEN error branch
      — the whole tab, for every member on an older build."* ⭐ **Prefer a NEW contract over an additive
      field on the shared entry.**
      ⭐⭐ **AND THE PRECEDENT NOW EXISTS — ⛔ DO ⛔ NOT RE-DERIVE IT.** `8-17` (**`done`**) fired this
      trigger **FIRST**, adding `vpa` to `NomineeBankAccountView`, and discharged it with its **AC8**:
      a written **deployment order** — ⭐ the **mobile build reaches devices FIRST, the API deploys
      SECOND** — grounded on `packages/api-client/src/index.ts:261`'s throwing `schema.parse`.
      ⇒ ⭐ **follow `8-17` AC8's shape**, and amend the item to record that its trigger fired **at
      `8-17`**, ⛔ not at F ([[feedback_closure_language_precision]]).
      ⚠⛔ **AND IF ANY NEW `packages/domain` ACCESSOR TAKES A CALLER-SUPPLIED LIMIT** — route it through
      `clampLimit` (`packages/domain/src/pagination.ts`); the `domain-accessor-invariants` gate scans
      all of `packages/domain/src` and `Math.min` does ⛔ NOT satisfy it.
- [x] **Task 3 — The scope boundary** (AC3) — enforced **server-side**; out-of-scope responses omit the
      keys **entirely**.
- [x] **Task 4 — The audit** (AC5) — ⭐⭐ **EXACTLY ONE line per DETAIL OPEN** (⛔ **not** one per
      coordinate read — AC4 renders 5 × 2 = **ten** of those, which would make the real figure ≈17 and
      take the deployment-wide lock ten times on the ordinary path). ⭐ Keyed on the **canonical
      identifier**; names the member, the drive and the instant; ⭐ written as a **named departure**
      from the anonymous public precedent.
- [x] **Task 5 — The screen** (AC1, AC4, **AC11**) — family 13 in full
      (`_bmad/custom/load-bearing-invariant-checklist.md:72`). ⭐ **AC11 is the acceptance criterion
      for everything in this task's a11y subtasks** — ⛔ written 2026-09-13; ⛔ until then this task had
      ⛔ none.
  - [x] ⛔⛔ **THE DECEASED NAME RESOLVES THROUGH `resolveMemberFacingDeceasedName`
        (`packages/domain/src/notifications/pool-identity.ts:141`) — ⛔ NEVER `resolvePublicMemberName`**
        (AC2). ⚠⛔ ⛔ Carried as a **TASK** from 2026-09-13; ⛔ it lived in Dev Notes prose only, and it
        is **disclosure-class** ([[feedback_spec_edits_must_propagate_to_tasks]]).
        ⭐ The two share the stored mode and the form rule and differ ⛔ only in **ABSENCE** behaviour —
        the public **omits** a mononym under `shielded_name` (fails **closed**, `''` ⇒ omit the row),
        the member **SHOWS** it ⇒ ⛔ **reusing the public one DROPS A MEMBER'S OWN DRIVE.**
        ⚠⛔⛔ **THE WARNING LIVES IN THE *DOMAIN* FILE — `packages/domain/src/pool/member-drive-list.ts:50-53`**
        (second site `apps/api/src/modules/member-pool/handlers.ts:492`). ⛔ **⛔ NOT the contracts file
        of the same basename**: ⭐ every OTHER bare `member-drive-list.ts:NN` in this story resolves to
        `packages/contracts/…`, and ⭐ `grep` for the warning there returns **ZERO**. ⚠ This is footgun
        **#1** (domain/contracts drift) sitting inside the very rule that warns about it.
        ⚠⛔ **AND THE ACCOUNT-HOLDER VALUE ROUTES THROUGH ⛔ NEITHER** — it is claim-scoped free text and
        **the SCHEMA is the authority** (`D5-subject (i)`) ⇒ ⛔ do ⛔ not assert it names the nominee.
  - [x] ⚠⛔ **THE `accessible` IDIOM IS TWO-TIER — ⛔ NOT "on every labelled container."** (**AC11**)
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
  - [x] ⚠ The **labels**: AC4 needs **FIVE** (⛔ not six — D3(D) removed the VPA) and **four** survive on
        a member surface. Story A (`45547a7b`) **DELETED** `label.account_number` / `label.ifsc` /
        `label.vpa` / `label.bank_name` / `label.branch` from `sahyog-vivran.json` — ⚠ which still holds
        eight `label.*` keys in total; ⭐ **only its BANKING labels are down to `label.account_holder`.**
        ⭐ **The holder label is `label.account_holder`** (value = the ruled *"Nominee Name"*) — ⛔⛔ **NOT
        `nominee.label`, which renders `"Nominee"`** (see AC4).
        ⭐ Then `contribution.json`'s `upi_intent.{account_number,ifsc,bank}_label`. ⛔⛔ **⛔ NOT
        `upi_intent.account_holder_label` — its value is literally `"Account holder"`, the string
        `-190` cl.2 forbids** and the one this story records at D3 as ⛔ **not** to be fixed by side
        effect. ⚠⛔ **There is ⛔ NO branch label anywhere on a member surface** ⇒ `branch` needs one
        **MINTED** — ⭐ **HERE, in both locales, in `sahyog-vivran.json`.**
        ⛔⛔ **⛔ IT IS ⛔ NOT RATIFIED COPY, AND THE EARLIER WORDING THAT SAID SO WAS WRONG** (⛔ corrected
        2026-09-13 — it left AC4 **ordered, forbidden and unhomed at once**, the one shape a dev cannot
        act on). ⭐ Traced live: ⛔ **no clause names `branch`** — `-190` cl.2 ratifies *"Nominee Name"*,
        and `-206` cl.1 / `-193` cl.3 fence the **shared stage/line vocabulary**, ⛔ not every field
        label. `label.branch` (= *"Branch"* / *"शाखा"*) was an ordinary label **deleted as collateral**
        when story A withdrew the public banking tier (`45547a7b`).
        ⭐ **THE PRECEDENT IS TWO LINES BELOW AND ALREADY SHIPPED:** `8-17` minted `upi_intent.vpa_label`
        = *"UPI ID"* **at its own render site** (`5ffb366a`). ⇒ ⭐ do the same.
        ⚠⛔ **THE ⛔ non-render-site RULE GOVERNS AC10's PANEL BLOCK ⛔ ONLY.**
        ⚠ The **UPI-ID label is ⛔ not moot** (the old text read *"D3(a)"*, a pre-ruling option): `-212`
        **Consequence 5** rules one **MUST be minted** — ⭐ it simply is ⛔ not F's; it travels with
        **`8-17`**. (⚠ A UPI-ID string already exists at `claim.json:60-62` — ⛔ check before minting a
        second.)
  - [x] ⚠⛔⛔ **`bank_name` / `branch` — THE HAZARD SHIPPED **CLOSED BY DELETION**, AND THE RISK IS THE
        ⛔ OPPOSITE OF WHAT THIS STORY USED TO SAY.** ⭐ Traced live 2026-09-11:
        `packages/domain/src/pool/sahyog-vivran-read.ts:647-668` now returns
        `{ accountRank, accountHolderNameCiphertext }` **only** — *"Closed HERE by deletion"* — and the
        `.trim() || null` branch guard beside it is described in the **past tense**. ⇒ ⛔ there is
        ⛔ **nothing to inherit**: a Task-2 dev who reuses that projection gets **⛔ NEITHER `bankName`
        NOR `branch`**, and **AC4's five-field render comes up TWO FIELDS SHORT**. ⚠ ⇒ this surface owes
        its **own** projection for those two Tier-3 plaintext columns.
        ⭐⭐ **THE TABLE AND THE COLUMNS, NAMED — ⛔ they were ⛔ NOWHERE IN THIS TASK until 2026-09-13:**
        **`claim_nominee_bank_accounts`**, columns **`bank_name`** and **`branch`**
        (`packages/domain/src/schema/claim_nominee_bank_accounts.ts:70-71`; DDL at
        `migrations/0056_claim-nominee-bank.sql:46-47`).
        ⚠⛔⛔ **AND THEY ARE ⛔ NOT SYMMETRIC — ⛔ ⛔ DO ⛔ NOT WRITE ONE GUARD FOR BOTH.**
        ⭐ `bank_name` is `text **NOT NULL**` with ⛔ **no non-empty CHECK** ⇒ `''` is **reachable**, and
        `''` is the exact value that **500'd the whole public transparency page** before A deleted the
        field (`sahyog-vivran-read.ts:653-654`) ⇒ **`.trim() || null`, then degrade ROW-LOCAL**,
        ⛔ never page-wide.
        ⭐ `branch` is **genuinely nullable** ⇒ a `null` is an **ordinary absent optional**, ⛔ not a
        fault — **omit the row**, ⛔ never a placeholder.
  - [x] ⚠⛔ **THE ERASURE BACKSTOP** (**AC11**). `anonymizeMember` overwrites `name_ciphertext` **in place** with
        an *encrypted* `[anonymized]` sentinel and RETAINS the row ⇒ the decrypt **SUCCEEDS** and the
        sentinel would render verbatim where a family name belongs (`member-pool/handlers.ts:497-524`).
        ⭐ ⛔ NOT a new rule — an **unswept** one. ⚠ The remedy **diverges by surface** (contributors
        omit the row; the drive list keeps the drive and drops the name) ⇒ ⛔ do ⛔ not copy mechanically.
  - [x] ✅ **Both accounts, ⛔ no ordering implied** — ⭐ unconditional (`-213` cl.1). ⚠ The two holder
        names may differ, and **the SCHEMA PERMITS IT** — 6.8 **D1**, ⭐ **SHIPPED** (⛔ no FK, ⛔ no
        rank, ⛔ no match rule). ⇒ **surface both, ⛔ pick neither**, exactly as **`-213` cl.2** orders
        **for the period while §8.4(ii) is unruled**.
        ⚠⛔⛔ **⛔ DO ⛔ NOT READ THIS BUILD RULE AS SETTLING §8.4(ii)** — ⭐ its record is **STILL OWED**
        (AC4, **Task 1**). ⛔ Corrected 2026-09-13: the earlier wording (*"`D5-subject (i)` **rules** …
        ⛔ not an open question"*) promoted an **OPEN `deferred-work.md` item** to a ruling and
        contradicted this story's own AC0 and AC4.
        ⚠ `6-18` builds the **same SHAPE** — ⛔ but on `D5-subject` **(ii)**, ⛔ not (i): its own header
        says it does ⛔ **NOT** close (i), and ⛔ **its D1 is OPEN and "BLOCKS AC1/AC2"** — the very AC
        cited here. ⚠ `migrations/0056_claim-nominee-bank.sql:3` still calls them
        *"#1 (primary) / #2"*; ⛔ that header is **stale** (`9.9` D3 / `-213` cl.1 — the two are EQUAL)
        and the schema file is the correct one. ⛔ Do ⛔ not read an ordering out of the migration.
- [x] ⛔⛔ **Task 5a — NAME THE ROUTE BEFORE YOU BUILD IT** (AC1, AC8). ⚠⛔ **⛔ NO TASK NAMED THE FILE TO
      CREATE** until 2026-09-13, and ⭐ **AC8's test disposition DEPENDS ON IT.** There is ⛔ no detail
      route today; the tab is `apps/mobile/app/(tabs)/sahyog.tsx`. ⇒ ⭐ choose the Expo-router path
      (e.g. `apps/mobile/app/(tabs)/sahyog/[publicToken].tsx`), ⭐ **RECORD IT IN THE COMPLETION NOTES**,
      and ⚠⛔ **re-read AC8 before concluding the `drive-list-render.test.ts` amendment is unnecessary** —
      ⭐ that fence is scoped to `DriveRow`, so it stays GREEN unless E's row itself becomes tappable.
- [x] **Task 5b — AC8: the drive-detail affordance** — render `pool_canonical_identifier`; make
      `publicToken` a **real focusable control**; ⭐ amend E's AC5 record and
      `drive-list-render.test.ts:272` **by name**. ⚠ There is ⛔ no detail route today — the tab is
      `apps/mobile/app/(tabs)/sahyog.tsx`.
- [x] **Task 5c — AC9: the zero-day copy** — consume `zero_line.*` by name; variant on nullability;
      ⛔ do ⛔ not suppress the percentage; carry the a11y invariant; honour `-207` cl.2's ₹0 silence.
- [x] ⭐ **Task 5d — AC10: the Panel's message block + the `Nominee full name` | `District` table**
      — ✅ **UNGATED. ⛔ Both STOPs discharged; `11b-19` is `done` and the keys are live.**
      ⭐ **CONSUME THESE EIGHT BY NAME** from `packages/i18n/locales/{en,hi}/sahyog-shared.json`:
      `message_block.headline.full` · `message_block.headline.no_family` · `message_block.solidarity` ·
      `message_block.gratitude` · `message_block.tagline` · `message_block.join` ·
      `message_block.table.nominee_name` · `message_block.table.district`.
      ⛔ Never author, re-derive or translate any of them at a render site
      ([[feedback_story_validate_footguns]] #8). ⚠ If a key is ⛔ not there, **STOP** — ⛔ that is ⛔ not
      a licence to write copy.
      ⚠⛔ **THE VARIANT SELECTOR IS THE SAFETY PROPERTY** — `.headline.no_family` when the deceased name
      is null, `.headline.full` otherwise; `{family_name}` is the ⛔ ONLY omittable token; the other four
      paragraphs are **token-free**; `{amount}` arrives **already formatted with its own ₹** (⛔ adding
      one ships ₹₹); there is ⛔ **no `no_amount` variant** — where the amount is unavailable the block
      renders **NOTHING**; an absent `district` **drops its COLUMN**. ⚠⛔ `t()` **THROWS** and the block
      is **PAGE-shaped** ⇒ a missed token is the **whole page**, ⛔ not one line. (See AC10.)
  - [x] ⛔⛔ **NARROW THE DARK-COPY FENCE BY NAME** (AC10) — `packages/i18n/tests/sahyog-shared-dark-copy.test.ts`,
        the *"⛔ ZERO CONSUMERS"* test (`:530`, `AUTHORISED: string[] = []` at `:560`). ⚠ Its `RESOLVER`
        regex was hardened on 2026-09-12 to match through a `${` interpolation opener ⇒ ⛔ a
        runtime-built `` `message_block.headline.${variant}` `` is caught too. ⭐ **Add this render site
        AND add the surviving property** — *"⛔ never resolved without every token supplied"*: the site
        consults a variant selector and **returns early** rather than resolving a key with an unsupplied
        token. ⛔⛔ **⛔ Do ⛔ NOT delete the test, and ⛔ do ⛔ NOT merely append to `AUTHORISED` to go
        green** — ⭐ mirror the narrowed shape story **D** gave the `index_line.*` fence in the same file
        ([[feedback_supersede_never_reinterpret]]).
      ⚠ `Nominee full name` is **`-205` cl.1's FULL NAME** (built in **D**), ⛔ not a
      `public_name_presentation_mode` subject. ⚠ `district` already ships on the member wire.
      ⚠⛔ **AND ⛔ NO KEY ASSERTS THE NOMINEE RELATIONSHIP** — they are **LABELS** over
      `account_holder_name_ciphertext`; **the SCHEMA is the authority** (`D5-subject (i)`).
- [x] **Task 6 — Tests** (**AC2-AC5, AC7-AC11**) — ⚠⛔ ⛔ the old tag read *"AC2-AC5, AC7-AC9"* while
      **AC4, AC8, AC9 and AC10 had ⛔ NO subtask at all**; ⭐ corrected 2026-09-13, and the missing ones
      are written below. ⛔ **AC4 is the highest-disclosure AC in this story and was shipping untested.**
  - [x] **The `member ≥ public` comparison (AC2)** — ⭐⭐ **THE ASSERTION, STATED** (⛔ it was ⛔ never
        written down; AC2 gave only four things it must *not* do):
        every field id in **`SAHYOG_VIVRAN_FIELD_IDS`** (`apps/public/src/lib/surface-fields.ts:646-661`)
        **∪** **`SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS`** (`:672-683`) that the public **detail** page
        renders for a given drive **has a corresponding value on this member response** — read
        **programmatically from the maps**, ⛔ never from a hard-coded list, and ⛔ **never asserting a
        COUNT** (E's *"13 vs 14"* defect, `11b-15:1356`; [[project_live_db_test_gotchas]]).
        ⚠⛔ **THREE EXCLUSIONS, ⛔ AND EXACTLY THREE:**
        **(a)** **लक्ष्य / `driveTargetInr`** — a **member-side ADDITION** (D2(B)). The public **DETAIL**
        renders ⛔ no target in ⛔ any stage ⇒ it is in ⛔ **neither** floor map and the superset claim
        ⛔ cannot cover it. ⛔ Do ⛔ not write it as one.
        **(b)** **the DECEASED member's name** — its public gate is **provisioning-inert** (see AC2) ⇒
        ⛔ the comparison must ⛔ not flag that asymmetry.
        **(c)** ⛔ **⛔ NOTHING ELSE.** ⚠ `confirmedPercentage` / `driveProgressPercentage` is in
        **NEITHER** floor map — it lives ⛔ **only** in `SAHYOG_DRIVE_ROW_FIELD_IDS`, the **index** map
        this AC forbids ⇒ ⛔ do ⛔ not reinstate a carve-out for it.
        ⛔⛔ **AND THE NOMINEE'S NAME IS ⛔ NOT AN EXCLUSION — ⛔ IT IS COMPARED.** It carries ⛔ no gate
        and that is RULED (`member-pool/handlers.ts:540-543`) ⇒ the two surfaces are **symmetric**, and
        a carve-out there would **suppress a real failure**.
        ⛔ **⛔ NOT E's `SAHYOG_DRIVE_ROW_FIELD_IDS`** — the index map; copying it proves ⛔ nothing about
        this surface.
  - [x] ⛔⛔ **AC3 — ⛔ RESOLVE THE RESPONSE SHAPE FIRST, ⛔ THEN WRITE THE TEST.**
        ⚠⛔ ⛔ Until 2026-09-13 this task carried **TWO MUTUALLY UNSATISFIABLE subtasks** — *"the
        coordinate keys are ABSENT"* (which needs a **200 body**) and *"another Pariwar's drive is
        **unreachable**"* (which means there is **no body**) — ⛔ on the AC this story itself calls
        *"the ONLY remaining boundary, and therefore the load-bearing one."*
        ⭐ **THE LIKELY SHAPE:** member routes carry ⛔ **no `:pariwarId`** (`member-pool/handlers.ts:102-108`)
        and `claim_nominee_bank_accounts` runs RLS **FORCE**d under `SET LOCAL app.pariwar_id` ⇒ an
        out-of-Pariwar drive is ⛔ **not addressable** and the response is a **404**, ⛔ not a 200 with
        absent keys ([[feedback_trace_reachability_before_escalating]]).
        ⇒ ⭐ **TWO TESTS, ⛔ NEVER ONE:**
        **(a)** a member of **another Pariwar** requesting this drive gets **404** (family 12);
        **(b)** the **CONTRACT's** coordinate keys are structurally **ABSENT, ⛔ never `null`** — asserted
        against the **schema** (the `-205` cl.9 / 11b.11 shape), ⛔ not against a response body.
        ⚠⛔⛔ **⛔ Do ⛔ NOT write `expect(body).not.toHaveProperty('accountNumber')` against a 404** —
        ⭐ that passes **vacuously** on a 500, an empty body, or a typo'd id
        ([[feedback_gate_scope_semantic_coverage]]).
  - [x] A **fence test** for AC7 — ⭐ including that ⛔ **no `vpa` key** reaches this wire (D3(D)), and
        that **लक्ष्य is ABSENT on the archived stages** (D2(B)). ⚠⛔ **SAY WHICH VOCABULARY THE
        ASSERTION IS IN:** pool states are `closed`/**`settled`**, the wire tokens are
        `closed`/**`verified`** — ⛔ a wire assertion written against `settled` matches ⛔ nothing.
  - [x] ⛔⛔ **THE TARGET GATE FENCE (AC2)** — with ⛔ no `reveal_to_members` row, the target key is
        **ABSENT**; with the row ON, it is present on `live` only. ⭐ Assert the read goes through
        `resolveDriveTargetVisibility`, ⛔ never `getDriveTargetVisibilityRow`.
  - [x] ⭐ **AC4 — THE COORDINATE RENDER, ⛔ PREVIOUSLY UNTESTED.** Both accounts render; **five**
        coordinates each (account number, IFSC, holder name, bank, branch) — ⛔ **no `vpa` on this
        wire**, in ⛔ any stage (D3(D)); the values are **UNMASKED** (Trap 4); the holder label resolves
        to the ruled *"Nominee Name"* via **`label.account_holder`**, ⛔ **never** `nominee.label` (which
        renders `"Nominee"`) and ⛔ never `upi_intent.account_holder_label` (literally *"Account holder"*,
        the string `-190` cl.2 forbids). ⚠ Assert **explicit values and membership**, ⛔ never counts
        ([[project_live_db_test_gotchas]]). ⚠ Two **differing** holder names are a **legitimate state**
        — assert both **surface**, ⛔ that neither is picked.
  - [x] ⭐ **AC8 — the affordance is REAL** — a focusable control with a real handler, an accessible
        name, and an `accessibilityRole` matching what it does; `pool_canonical_identifier` renders.
        ⚠ Per the **no-RN-mount-harness** rule below, this is a **source scan** driven by the real
        catalog + real contract, ⛔ plus any checkable logic extracted into a plain `.ts`.
  - [x] ⭐ **AC9 — the zero-day copy** — `zero_line.full` vs `.no_family` selected on **nullability**;
        the percentage is ⛔ **not** suppressed at zero; the **accessible name** carries the same
        softening; and `-207` cl.2's **₹0 silence** on the **WIRE TOKENS** `closed`/`verified`.
  - [x] ⭐ **AC10 — the message block** — the eight keys resolve **in both locales**; the headline
        variant is chosen on `family_name` nullability; an absent `district` **drops its column**;
        ⛔ **no literal ₹** is added to `{amount}`. ⚠⛔ **AND THE DARK-COPY FENCE IS NARROWED, ⛔ not
        appended to** — see Task 5d.
  - [x] ⭐ **AC11 — family 13** — every control is `accessible={true}` + role + name and is a **SIBLING**
        of any labelled container, ⛔ never a descendant; and the `ANONYMIZED_SENTINEL` ⛔ never renders.
  - [x] ⭐ **ONE AC5 audit line per DETAIL OPEN** (AC5) — ⛔ **not** one per coordinate read.
        ⚠⛔⛔ **THE FLAKE TRAP IS REAL BUT WAS POINTED AT THE WRONG WRITER.** ⭐ Traced 2026-09-11: the
        cited precedent **IS awaited** (`public-pages/handlers.ts:661` — `await
        writeAppealReversalDisclosureAudit(…)`, which awaits `writeAuditEntry` inside a try/catch) ⇒
        ⛔ **no** flake window there. ⭐ The genuinely fire-and-forget writer is **`createKmsAuditHook`**
        (`apps/api/src/audit/audit-log-sink.ts:206` — `void writeAuditEntry(…).catch(…)`, doc-block:
        *"fire-and-forget on the service pool"*) — ⛔ i.e. **the seven INVISIBLE KMS lines AC5 counts**.
        ⇒ ⚠ any test asserting a **total** line count per open must **drain the KMS half**, or it flakes.
  - [x] ⭐ **Size the audit write volume** under routine browsing before shipping (AC5) — ⚠⛔ **the
        unit is ≈5-8 global-lock acquisitions per detail open, ⛔ not 1** (see AC5). ⭐ Measure: the
        lines actually emitted for one open (assert the COUNT, which also pins the decrypt count), and
        the wall-clock cost of the serialized chain under concurrent opens. ⚠ Compare against story
        **E**'s already-shipped per-row decrypts — ⭐ the baseline is ⛔ not zero.
  - [x] ⭐⭐ **RECORD THE MMKV TRIGGER AS FIRED** — ⚠ it lived in **Dev Notes prose ONLY**,
        with ⛔ no AC and ⛔ no Task; ⭐ the exact defect this story credits itself with fixing for E's two
        obligations ([[feedback_spec_edits_must_propagate_to_tasks]]). ⚠ Amend `deferred-work.md`'s
        **persisted-query-cache item** in the **11b-15 THIRD-pass section** (⭐ **by ITEM, ⛔ never by line —
        that file's OWN rule**: *"The ITEM LETTERS are the stable address. Cite those, ⛔ not the lines."*)
        to record that its stated
        trigger — *"any DPDPA review of at-rest cached personal data on the handset"* — **FIRED at F**,
        and **how much Tier-1 is now at rest** ([[feedback_closure_language_precision]]). ⛔ The fix
        itself is **one repo-wide change**, ⛔ not F's.
  - [x] ⭐⭐ **RECORD THE AMPLIFICATION — ⛔ AND THE DISPOSITION IS FIXED IN ADVANCE, ⛔ NOT LEFT TO
        TASTE.** ⚠⛔ ⛔ The old wording read *"if the measured number is uncomfortable"* — ⛔ a condition
        with **no threshold and no action**, which a dev cannot fail. ⭐ Corrected 2026-09-13:
        **whatever the number**, it is ⛔ **NOT** a blocker and ⛔ **NOT** a reason to drop a decrypt or
        the KMS hook (⭐ that hook is the **FR-47** record of *which key opened which field*; removing it
        to buy throughput trades a **crypto audit obligation** for latency). ⇒ ⭐ **record the measured
        figure** in `deferred-work.md` against the existing repo-wide item, ⛔ **and ship.**
        ⚠ It is **repo-wide and pre-existing** (the KMS hook + the single global chain), ⛔ **not** a
        per-surface patch, and ⛔ not F's to fix alone ([[feedback_closure_language_precision]]).
  - [x] ⭐ **Execute them** against `twt-test-pg` `:5433`.

---

## ⛔⛔ NINE THINGS THAT WILL BITE YOU — ⭐ read these after the Tasks, ⛔ before the first line of code

⭐ Each is load-bearing and each lived buried in a Trap, a Dev Note or the fifth paragraph of a Task.
⛔ Nothing here is new; ⭐ it is **hoisted**, 2026-09-13.
⚠⛔ **#1 AND #2 WERE ADDED ON THE RE-RUN** — ⛔ the first version of this block hoisted two **CI-level**
items and omitted the ⛔ **only two the file itself calls DISCLOSURE-class**. ⇒ ⭐ the two that ship
banking data to the wrong people now sort first.

1. ⛔⛔ **लक्ष्य IS GATED, FAIL-CLOSED — RESOLVE IT THROUGH `resolveDriveTargetVisibility`, ⛔ NEVER
   `getDriveTargetVisibilityRow`.** ⚠ A miss is a **DISCLOSURE defect**, ⛔ not a UI defect (`-211` cl.3,
   Consequence 4). ⭐ ⛔ No Pariwar has a row ⇒ **NOTHING renders** the day this ships — ⭐ that is
   **CORRECT**. **AC2 / Task 2 / Task 6.**
2. ⛔⛔ **AC3's CROSS-PARIWAR BOUNDARY IS THE ⛔ ONLY REMAINING ONE, AND THEREFORE LOAD-BEARING.**
   ⭐ Resolve the **response shape first** (⛔ no `:pariwarId` on the route + RLS FORCE ⇒ **404**), then
   write **two** tests. ⚠⛔ ⛔ An `expect(body).not.toHaveProperty(…)` against a 404 passes **vacuously**.
   **AC3 / Task 3 / Task 6.**
3. ⛔⛔ **AN ADDITIVE FIELD ON `MemberDriveListEntry` BLANKS THE WHOLE TAB** for every member on an
   installed build older than the API release — `.strict()` + `api-client`'s throwing `schema.parse`.
   ⭐ Prefer a **NEW contract**; if additive is unavoidable, follow **`8-17` AC8**'s deployment order
   (mobile to devices FIRST, API second). **Task 2.**
4. ⛔⛔ **`t()` THROWS on an unsupplied token, and AC10's block is PAGE-shaped** ⇒ a wrong variant is a
   **whole-page 500**, ⛔ not a blank line. ⭐ Select on `family_name` nullability. **AC10 / Task 5d.**
5. ⛔⛔ **TWO GREEN TESTS GO RED BY DESIGN, AND ⛔ NEITHER MAY BE DELETED** —
   `drive-list-render.test.ts:272` (**AC8** amends it by name) and `sahyog-shared-dark-copy.test.ts`'s
   `AUTHORISED = []` (**AC10** *narrows* it — ⛔ **never appends to it**).
6. ⛔⛔ **`resolveMemberFacingDeceasedName`, ⛔ NEVER `resolvePublicMemberName`** — the public one fails
   **closed** and would **drop a mononym member's own drive**. ⭐ The warning is in the **DOMAIN** file
   (`packages/domain/src/pool/member-drive-list.ts:50-53`), ⛔ not the same-named contracts file.
   **Task 5.**
7. ⛔⛔ **⛔ DO ⛔ NOT TOUCH `SahyogVivranEntry`** (`apps/mobile/components/sahyog-vivran/SahyogVivranEntry.tsx:22-41`)
   — **Trustee-ratified** (`-200` cl.4). ⚠ Deleting or folding it needs a **PANEL decision**, ⛔ not a
   judgement call. ⭐ After this story a member has **two** views of one drive; ⛔ that divergence is
   **expected and recorded**, ⛔ not a defect to "fix".
8. ⛔ **ANY new `packages/domain` accessor taking a caller-supplied limit goes through `clampLimit`**
   (`packages/domain/src/pagination.ts`). ⚠ The `domain-accessor-invariants` gate scans **all** of
   `packages/domain/src`, and `Math.min` does ⛔ **NOT** satisfy it
   ([[project_domain_limit_clamp_and_savepoint_retry]]). **Task 2.**
9. ⛔ **THERE IS ⛔ NO RN MOUNT HARNESS** — ⛔ do ⛔ not reach for `@testing-library/react-native`; it is
   ⛔ not installed and `MemberDriveList.tsx` **cannot be imported**. ⭐ The two shipped idioms are a
   **source scan** driven by the real catalog/contract, and **pure logic extracted to a plain `.ts`**.
   See *Testing standards* below. **Task 6.**

---

## Dev Notes

### Read Trap 1 before anything else — ⭐ and note what it does ⛔ NOT cover

⭐ The instinct will be *"cl.3 says member > public, so the member must get the bank details."*
⛔ **That instinct is wrong on banking** — story A removed those fields from the public entirely.
⚠⛔ **But it is RIGHT on लक्ष्य**, which is why **D2** exists. ⛔ Do ⛔ not generalise Trap 1 into
*"cl.3 never applies here."*

### The asymmetry worth noticing

⭐ This programme spent six stories **narrowing** what a stranger can see. ⚠ D1(a) **widens**, in one
step, what a whole Pariwar can see — ⚠ under a clause written to **close** an inversion. ⇒ ⚠ **that is
the shape to be suspicious of.**

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
  Tier-3 plaintext columns. ⚠ (⭐ **Address it as the 11b.3a third-pass `bank_name` BULLET** — ⛔ ⛔ not by
  line: both numbers this story carried were stale AND **INVERTED** (`:8325-8337` is in fact the **11b.10
  public-token** item), ⛔ corrected 2026-09-13.)
- ⚠⛔ **The identifier-enumeration bound is ⛔ NOT "still open", and the remedy this story asked for was
  ⛔ DECLINED.** ⭐ `deferred-work.md` records it *"**ANSWERED 2026-09-03 — TRUSTEE-RATIFIED** … logged as
  `#decision-2026-09-03-184`"*: the ruling is **(B) MAKE THE ADDRESS UNGUESSABLE** (option (c)), and
  ***"the rate-limit tier is NOT changed."*** ⭐ It then went **CLOSED BY [EDIT]** at 11b.10 —
  `pools.public_token`, **128 bits** of CSPRNG entropy, **backfilled** by migration `0114`.
  ⇒ ⛔ criticising this story for planning *"no rate/enumeration bound"* points at a remedy **the Panel
  expressly refused** ([[feedback_closure_language_precision]]). ⭐ What this surface actually offers is
  **authentication + session scope**, and enumeration by a member is what **D1(a) GRANTS**. ⚠ What
  remains is a **deployment gate on the PUBLIC surface**, ⛔ not an unmade judgement here.
  (⭐ Address: the ***"BLOCKING ON DEPLOYMENT"*** enumeration **bullet** — ⛔ by bullet, ⛔ not by line.)
- **The persisted query cache is unscoped and ⛔ never purged on sign-out** (11b-15 THIRD-pass section,
  ⭐ its **persisted-query-cache item**, ⛔ by item) — ⚠⛔ **CARRIED AS A TASK NOW (Task 6), ⛔ no longer prose only:**
  keys carry ⛔ no `memberId`/`pariwarId`, MMKV `gcTime` **7 d**, and `grep` for `queryClient.clear` /
  `removeQueries` / `resetQueries` across `apps/mobile` returns **ZERO**. ⚠⛔ Its stated trigger — *"any
  DPDPA review of at-rest cached personal data on the handset"* — **fires here**: this story would put
  **unmasked payment coordinates** at rest for 7 days, surviving sign-out onto a different member of a
  different Pariwar. ⭐ That defeats D1's *"the session scope IS the control"* **at rest**, though ⛔ not
  on the wire. ⇒ ⭐ **RECORD the trigger as FIRED**; the fix is one repo-wide change, ⛔ not a
  per-surface patch.

### ⚠⛔ Stale artefacts THIS story makes wronger — ⛔ ROUTE them, ⛔ do ⛔ not absorb them

⚠⛔⛔ **RE-TRACED LIVE 2026-09-13: ⭐ THREE SURVIVE, ⛔ ONE IS DISCHARGED, ⭐ AND A FOURTH IS ADDED.**
⭐ **A FIFTH WAS ADDED BY THE SAME DAY'S FOURTH `validate` PASS** — see the last bullet below.
⛔ None is F's to **fix**; ⚠ each gets **WORSE** when F ships (⛔ except the fifth, which F did not
create and does not worsen — it is carried here only because Task 1 is where this story routes what
it finds).
⇒ ⭐⭐ **ROUTING THEM IS NOW A TASK (Task 1) — ⛔ no longer prose only.** ⭐ *"Route it"* **IS** an
**ACTION**, ⛔ never a note; and until 2026-09-13 ⛔ none of these had an AC or a Task
([[feedback_spec_edits_must_propagate_to_tasks]]).

- ⛔⛔ **The admin form tells a `super_admin` the reveal switch does NOTHING.**
  `apps/admin/src/modules/drive-target/i18n-en.ts:108-109` —
  *"no page displays this target yet, in any state of these switches … they do not make anything appear
  today"* — ⭐ **BOUND on both checkboxes at `RevealSwitchesForm.tsx:163-166` and `:178-181`**
  (⚠⛔ ⛔ **not** `:246-250`, which pointed **INSIDE** the `<p id="dt-reveal-no-consumer">` note element —
  ⭐ that element is `:245-251` — ⛔ corrected 2026-09-13; the *claim* was sound, the cite pointed at the
  note rather than the bindings, and a line short at both ends).
  ⚠ Already **false** at HEAD (`public-read.ts:1058`, `packages/domain/src/pool/member-drive-list.ts:289`, `:374`);
  ⭐ **D2(B) makes it a THIRD consumer.** ⇒ an operator who flips it is told it changes nothing while it
  changes three screens. ⭐ **ROUTE IT** (**Task 1**) — ⛔ do ⛔ not fix it here.
- ✅⭐⭐ ~~**A stale VPA doc-block the routing note ALREADY flagged and nobody carried.**~~
  **DISCHARGED 2026-09-13 — ⛔ CLOSED BY [EDIT] at `8-17`; ⛔ row kept, ⛔ not deleted**
  ([[feedback_record_unattested_no_backfill]]). ⚠ The 2026-09-11 text said
  `apps/api/src/modules/payment/handlers.ts:20-23` *"still claims 'There is NO VPA in the substrate
  today'"* and routed it to `8-17`'s packet. ⭐ **`8-17` is `done` and did exactly that:** `:20` now
  reads *"── The nominee-VPA gap (D1) — ⛔ **CLOSED. THIS PARAGRAPH IS STALE AND IS KEPT ONLY AS THE
  RECORD** ──"*, quotes the old sentence explicitly as *"WHAT IT SAID, AND IT IS NO LONGER TRUE"*, and
  records the correction on the authority of `-191` **cl.5**. ⇒ ⛔ **nothing routes.**
  ⚠⛔ ⭐ **A negative claim about the repo is checkable in the repo** — ⛔ this one expired in two days
  ([[feedback_negative_claims_checkable_in_repo]]).
- ⚠ **`-165`'s wrong ground is still in the SHIPPED contract.** AC3 correctly rules `-165` the wrong
  citation — ⛔ but `packages/contracts/src/public-pages/sahyog-vivran.ts:**289**` still reads *"the same
  discipline **`-165`** established for the masked arm."* ⚠ ⛔ The cite moved `:284`→`:289` when `8-17`
  inserted a VPA paragraph — ⭐ **navigate by the doc-block above `accountHolderName`**, ⛔ not the
  number. ⭐ **RE-VERIFIED SOUND 2026-09-13: still one site, still ⛔ not swept**
  ([[feedback_story_validate_footguns]] #16). ⭐ **ROUTE IT** (**Task 1**) — ⛔ do ⛔ not fix it here.
- ⚠ **A `done` sibling still asserts the RETIRED "no target" sentence as present-tense fact.**
  `11b-14:1072-1075` quotes *"`11b-15:116` reads '⛔ no target (story C keeps it hidden)'"* and concludes
  *"`-190` cl.7(c) has ⛔ no consumer in any of the **seven** stories"* — ⛔ both false at HEAD (`-211`
  cl.1 retired the sentence; `-208` cl.6 corrected the count to **six**). ⭐ `11b-14` is `done`, so this
  is **record staleness**, ⛔ not a live gate — ⭐ but it is the sibling site the sweep exists to catch.
  ⛔ **This story is CLEAN on both retired-sentence classes** and must stay so. ⭐ **ROUTE IT** (**Task 1**).
- ⚠⛔ **ADDED 2026-09-13 — `-212` **cl.1** MIS-CITES ITS OWN AUTHORITY.** It grounds लक्ष्य's ruled slot
  on `-204` **cl.2**; ⭐ cl.2 is *"लक्ष्य IS THE DERIVED TOTAL"* and the **slot** quote is **cl.12**'s
  2026-09-08 correction table. ⚠⛔⛔ **⛔ A story file ⛔ CANNOT correct a ratified clause**
  ([[feedback_supersede_never_reinterpret]]) ⇒ ⭐ **build to cl.12's slot, ⛔ do ⛔ not propagate the
  mis-cite, and ROUTE the correction for a successor entry** (**Task 1**). ⛔ Earlier versions of this
  story said it *"is corrected here"* — ⛔ it was not.
- ⚠⛔ **ADDED 2026-09-13 (fourth `validate` pass) — a `pay.tsx` DOC-COMMENT IS STALE.**
  `apps/mobile/app/(contribution)/pay.tsx:16-18` still says *"the nominee-VPA substrate is still
  deferred"* — ⛔ false at HEAD, `8-17` (`done`) shipped it. ⭐ Not F's file; found incidentally while
  re-verifying this story's own `-212` Consequence 3 citations. **ROUTE IT** (**Task 1**, item (f)).

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
  it *"the nominee's name"*; `deferred-work.md`'s **`D5-subject (i)`** **records** that **the SCHEMA is the authority** (⚠ an OPEN item, ⛔ not a ruling) and
  the schema **denies** the identity. ⇒ ⛔ do ⛔ not assert it names the nominee.

### ⚠ A class of ±2-to-20-line citation drift, found 2026-09-13 — ⛔ deliberately NOT swept

⭐ The fourth `validate` pass re-verified every substantive code citation in this file against HEAD
and found no behavioural claim false, but found a handful of code-line citations off by a small
margin — following the precedent `8-16` v0.8 set for exactly this situation (*"a half-accurate re-date
adds error"*): `member-pool/handlers.ts:497-524` (the `ANONYMIZED_SENTINEL` backstop) is now nearer
`:500-527`; `PublicSahyogVivranNomineeAccount` (`sahyog-vivran.ts:281-293`) now spans `:281-297`; and
the `DIRECTORY_DECRYPT_CONCURRENCY` halving discussed at AC5 computes at `member-pool/handlers.ts:408`,
⛔ not within the cited `:388-397` (that range is the surrounding comment; the constant itself is
defined in `apps/api/src/modules/kyc/bounded-decrypt.ts`, ⛔ not in `handlers.ts`). ⭐ Every one of
these was re-verified TRUE in substance. ⛔ **Deliberately not swept** — chasing single-digit line
drift across a 1500-line file is how this file's own `-214` governance commit broke four pointers it
had just fixed.

### References

- `.decision-log.md#decision-2026-09-04-190` cl.1-cl.4, **cl.7(b)/(c)** · `-189` cl.3 · `-193` **cl.3**
  · `-195` cl.1, cl.3 · `-196` (+ Consequence 2) · `-199` · `-200` cl.4 · **`-204` cl.2, cl.12** ·
  `-205` **cl.1**, cl.9 · `-206` cl.2, **cl.3**, cl.4 · `-207` cl.1, cl.2 · `-208` cl.4, cl.6 ·
  `-209` cl.2, cl.3 · **`-211` cl.1, cl.2, cl.3, cl.5, Consequence 2, Consequence 4** ·
  ⭐ **`-212` cl.1, cl.2 + Consequences 2-6** · ⭐ **`-213` cl.1, cl.2**
  ⚠⛔⛔ **⛔ CITE THESE BY CLAUSE, ⛔ NEVER BY LINE — ⭐ AND THIS FILE NOW OBEYS ITS OWN RULE.**
  ⭐ The log is **newest-first**: `-212`/`-213` prepended ~**152** lines on 2026-09-10, `-214` prepended
  ~**96** more on 2026-09-11 ⇒ ⛔ **every** numeric anchor rotted **twice in two days**, silently.
  ⚠⛔⛔ **AND THE SECOND SHIFT WAS THIS STORY'S OWN Task-1 GOVERNANCE COMMIT** — ⛔ the 2026-09-11 pass
  re-derived four pointers and then **broke them itself, in the same commit**
  ([[feedback_story_validate_footguns]] #19).
  ⇒ ⭐⭐ **ALL FOUR `.decision-log.md:NNN` POINTERS WERE DELETED 2026-09-13 and re-expressed as CLAUSE /
  PARAGRAPH addresses.** ⛔ Do ⛔ not reintroduce a line number here — ⛔ not even a freshly-verified one.
  ⚠⛔ ⛔ And ⛔ never write a blanket *"every pointer verified"* sentence: ⭐ a sweep claim is itself a
  claim, and it is the easiest one to falsify.
- ⛔⛔ **`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md`
  **§8.1** (the ratification) and **§9.1 row 3** (the routing), with **§8.3(2)** for the PAGE-shape
  constraint only** — ⭐ **AC10.** ⚠⛔ **⛔ NOT §8.3(3) / §8.5 row 3** — ⭐ §8.5 is *"What we **propose**"*
  and §8.3(3) is a **sequencing statement**; ⛔ neither is a ruling. ⛔ The References block carried the
  wrong pair until 2026-09-13, five days after the story body had corrected it
  ([[feedback_story_validate_footguns]] #16).
  ✅ **IT REACHED THE LOG: `#decision-2026-09-11-214`** ⇒ ⭐ the *"never lifted into `.decision-log.md`"*
  clause is **DISCHARGED** — ⛔ do ⛔ not re-open it; corroborated at `11b-12:583-600`.
- `packages/contracts/src/contributions/nominee-accounts.ts:18-20` — the 9.9 donor path (*"a masked account# cannot be transferred to"*). ⚠⛔ **⛔ THE "VPA FENCE" IS GONE** — `8-17` shipped `vpa` onto this view (`:103`); `vpaPresent` is now `:71` and `ifsc` `:66` (⛔ **not** `:61`/`:59`). ⛔ Re-derived 2026-09-13.
- `packages/contracts/src/contributions/contribution-history.ts:24-25` — the deliberate exclusion
- `packages/contracts/src/contributions/member-drive-list.ts:43`, `:121`, `:131`, `:187` — stage enum; the two unrendered ids; लक्ष्य
- `apps/api/src/modules/payment/handlers.ts` — ⚠⛔⛔ **⛔ CITE THE HANDLER, ⛔ NEVER THE LINE** ([[feedback_story_validate_footguns]] #21): this module returns a handler **object**, so ⛔ there are ⛔ no `app.get(...)` lines and a line number ⛔ does ⛔ not tell you which function you are in. ⭐ The handlers are `intent` · `nomineeAccounts` · `attest` · `reportFailure`. ⛔ The old `:257-262` *"VPA refusal"* now points at the `nomineeAccounts` doc-block's **GRANT** (*"this handler now performs a FOURTH soft decrypt for the VPA"*, `8-17`), and `:289-292` was ⛔ never a return — ⭐ the `{available:false, reason:'unassigned'}` returns live in **`intent`** and in **`nomineeAccounts`**, one each.
- `apps/api/src/modules/member-pool/handlers.ts:102-108`, `:497-524`, **`:534-543`**, `:540-543` — session scope; the `ANONYMIZED_SENTINEL` backstop; ⭐ **the ONE pinned range for the one-decrypt rule** (⛔ not `:536-550`, ⛔ not `:539-547`, ⛔ not `:534-542` — ⚠⛔ **FOUR** ranges for one rule). ⚠⛔⛔ **⛔ THE 2026-09-13 CLAIM *"three ranges … unified"* WAS ⛔ FALSE — it named three of four and swept ⛔ NONE of the other sites. ⭐ Actually unified 2026-09-13 (second pass); ⛔ kept as the record that a sweep claim is the easiest claim to falsify.**; and ⛔⛔ **the nominee name's *"THERE IS ⛔ NO SECOND GATE ON IT, AND THAT IS RULED"*** (AC2's second subject)
- `apps/api/src/modules/public-pages/handlers.ts:840-905` — the audit posture ⚠ **departed from**, ⛔ not followed
- `packages/domain/src/audit/write.ts:62` (`AUDIT_CHAIN_LOCK_KEY`), `:118` (`writeAuditEntry`), `:128` (`pg_advisory_xact_lock`) — the ⛔ **one fixed, deployment-wide, cross-tenant** lock
- `apps/public/src/lib/surface-fields.ts:646-661`, `:672-683` — AC2's two floor maps
- `apps/mobile/components/drive-list/MemberDriveList.tsx:233-240`, `:413-416`, `:519-520` — the a11y idiom; the row fence; ⚠ the `nominee.label` routing this story **supersedes** (AC4)
- ⭐ `packages/i18n/locales/en/sahyog-vivran.json:34` — `label.account_holder` = **"Nominee Name"**, ⭐ the ruled string
- ⭐ `packages/i18n/locales/{en,hi}/sahyog-shared.json` — `drive_target` (**"Expected: {amount}"**); ⚠ its `$comment` still says *"It now has TWO"* consumers (⭐ re-verified 2026-09-13 — **still true**, F is the third)
- ⭐⭐ `packages/i18n/locales/{en,hi}/sahyog-shared.json` — **the eight `message_block.*` keys**, shipped by `11b-19` (`done`), **BOTH locales**. **AC10 / Task 5d.** ⚠⛔ ⛔ Never take a `$comment` for the live state ([[feedback_story_validate_footguns]] #19(b)) — ⭐ `grep` the **VALUE**.
- ⛔⛔ `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` — ⭐ **the fence AC10 must NARROW** (`:530` the test, `:535-539` its own narrowing instruction, `:550` the hardened regex, `:556-560` — *"THE ALLOW-LIST IS ⛔ NOT A WAIVER"* at `:556` and `AUTHORISED = []` at `:560`). ⭐ **AND IT IS AC7's MODEL**, ⛔ not E's AC8.
- ⭐ `_bmad-output/implementation-artifacts/11b-19-ratified-message-block-copy-source.md` — **`done`**; the copy source AC10 consumes
- ⭐ `_bmad-output/implementation-artifacts/11b-20-public-sahyog-vivran-message-block.md` — `ready-for-dev`; ⚠ **HOMED, ⛔ not built** — `-214` Consequence 3, the PUBLIC half, ⛔ **not F's**
- ⭐ `_bmad-output/implementation-artifacts/8-17-nominee-vpa-on-the-payment-screen.md` — **`done`**; ⚠⛔ its `:352` **defers §8.4(ii)'s owed record to THIS story BY NAME** (Task 1), and its **AC8** is the `.strict()` deployment-order precedent (Task 2)
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
- ⚠ `deferred-work.md` **11b.3a third-pass item `(e)` — VPA collection** (⭐ **by item, ⛔ never by line**;
  ✅ its heading now reads *"RE-OPENED as a BUILD OBLIGATION, and now **HOMED at `8-17`**"* and its body
  carries the `-212` cl.2 supersession — ⇒ **Closed by [edit]**, ⛔ no longer an imperative for F);
  ⛔ its *"nobody ruled on"* is **inaccurate**, see D3. ⚠⛔ **⛔ Do ⛔ not write a bare `(e)`** — the file's
  own **bare-letter rule** says a bare letter means **Story 11b.1's** item (e), a different obligation
  entirely. ⭐ And per that file's **addressing rule**: ***"The ITEM LETTERS are the stable address. Cite
  those, ⛔ not the lines."*** ⚠⛔ ⛔ This story cited **both** rules by line number until 2026-09-13, and
  **both numbers were stale.**
- ⚠ `deferred-work.md` **`D5-subject (i)` — THE CONSENT-SUBJECT GAP** — ⭐ *"the SCHEMA is the
  authority"*; AC4's real ground. ⚠⛔ ⛔ Still an **OPEN deferred item with a live trigger**, ⛔ not a
  ruling ⇒ see **Task 1**'s successor entry.
- ⚠ `deferred-work.md` **11b-15 THIRD-pass section** — its **persisted-query-cache item** (Task 6) and
  its **`.strict()` additive-field item** (Task 2). ⚠⛔ ⛔ The two were cited by line AND **SWAPPED INTO
  EACH OTHER** until 2026-09-13 ⇒ ⭐ **address them by ITEM**, per the file's own rule.

## 📚 RECORD — ⭐ KEPT AS THE RECORD, ⛔ NEVER DELETED. ⛔ NOTHING IN THIS SECTION IS AN INSTRUCTION.

⚠⛔ **MOVED HERE 2026-09-13, ⛔ zero bytes deleted.** ⭐ These ~100 lines are the record of superseded
state from three `validate` passes. They sat **BEFORE the Acceptance Criteria**, so a dev agent parsed
them before reaching a single buildable instruction. ⛔ A later reader must ⛔ not "restore" what any
pass removed, and ⛔ must ⛔ not read anything here as a live order — ⭐ **every live obligation is in the
ACs, the Tasks, or the *SEVEN THINGS* block.**

#### ⭐ The record of what STOP 1 was (⭐ kept as the record, ⛔ never deleted)

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
⛔⛔ **SUPERSEDED 2026-09-12 — ⛔ NOT AN INSTRUCTION. ⭐ See the Preflight.**
~~⚠⛔ **B ⛔ NEVER SHIPPED THE COPY SOURCE.**~~ `sahyog-shared` holds `index_line.*` (§9.2's one-line index
wording, ✅ shipped) and ⛔ **no message-block key**; `grep "Be the Movement"` / `"सहयोग का हाथ"` across
`packages/i18n/locales/` returns **ZERO**. ⚠ `11b-12` is **`done`**.
⚠⛔ **AND STORY E (`11b-15`) CLOSED `done` OWING THE IDENTICAL OBLIGATION** — ⛔ it renders neither the
block nor the table. ⇒ ⛔ **this is ⛔ not F's omission; F is where it was CAUGHT.**
⇒ ⭐⭐ ~~**AC10 IS UNSATISFIABLE UNTIL B's KEYS EXIST**~~ **— ⛔ FALSE FROM 2026-09-12; ⭐ AC10 IS
BUILDABLE.** ⭐ What SURVIVES: a dev must ⛔ **NEVER** close it by authoring ratified copy at a render
site ([[feedback_story_validate_footguns]] #8). ⚠⛔ ⛔ The *"**STOP (as it then stood)**"* is **LIFTED**.

⛔⛔ **SUPERSEDED 2026-09-11 — ⛔ NOT AN INSTRUCTION. ⭐ `-214` LANDED. ⛔ DO ⛔ NOT WRITE A SECOND ENTRY.**
⇒ ⛔⛔ ~~**TASK 1's `governance:` COMMIT MUST CARRY THE DECISION ENTRY FIRST**~~
([[feedback_governance_commits_precede_implementation]]) — ⛔ an AC alone is ⛔ not enough, and this is
the precise failure `-211`'s own Occasion block describes. ⭐ **Then AC10 / Task 5d build it.**
⚠⛔ If the Panel's intent is judged narrower than §8.3(3) reads, that is a **NEW routing note**, ⛔ not a
silent narrowing here.

⚠⛔⛔ **EVERYTHING ABOVE IN THIS RECORD BLOCK WAS TRUE WHEN WRITTEN (2026-09-11) AND IS ⛔ FALSE FROM
2026-09-12 — ⛔ KEPT, ⛔ NOT DELETED** ([[feedback_record_unattested_no_backfill]]).
⭐ **(i)** *"B ⛔ NEVER SHIPPED THE COPY SOURCE"* — ⛔ false: `11b-19` (**`done`**) shipped all eight
`message_block.*` keys; `grep "Be the Movement"` and `grep "सहयोग का हाथ"` across
`packages/i18n/locales/` now return **NON-ZERO** (`message_block.join`, `message_block.tagline`).
⭐ **(ii)** *"AC10 IS UNSATISFIABLE UNTIL B's KEYS EXIST"* — ⛔ false: it is **SATISFIABLE NOW**.
⭐ **(iii)** *"TASK 1's `governance:` COMMIT MUST CARRY THE DECISION ENTRY FIRST"* — ✅ **it did**:
`-214` landed 2026-09-11. ⛔ Do ⛔ not re-issue the order.
⭐⭐ **WHAT SURVIVES, AND IT IS THE PART THAT MATTERED:** the obligation was real, it was ratified at
**§8.1 / §9.1 row 3**, and ⛔ **a render site must ⛔ NEVER author ratified copy** — that rule is
unchanged and still governs Task 5d ([[feedback_story_validate_footguns]] #8).

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
| **G1** | A **ratified** 2026-09-05 obligation routes to F by name and ⛔ never reached the log | ⛔ **STOP 1 OPENED**; **AC10** + **Task 5d** written ⇒ ✅ **DISCHARGED 2026-09-11 by `-214`** |
| **G2** | D2(B) put लक्ष्य on the page but `reveal_to_members` reached ⛔ no AC and ⛔ no Task | ✅ **AC2 + Task 2 + Task 6 GATED** |
| **G3** | The ratified **number form** (`-206` cl.3) and **derivation** (`-204` cl.2) for लक्ष्य were absent | ✅ **AC2 + Task 2**; `drive_target` consumed BY NAME |
| **G4** | AC4's *"reuse `nominee.label`"* renders **`"Nominee"`**, ⛔ not the ruled *"Nominee Name"* | ✅ **RE-POINTED** to `label.account_holder` |
| **G5** | The `bank_name` hazard shipped **CLOSED BY DELETION** ⇒ the inherited risk was **INVERTED** | ✅ **RE-STATED** — the projection now yields ⛔ NEITHER field |
| **G6** | §8.4(ii)'s *"nobody has said which"* — ⛔ false; and **`6-18`** already builds on the answer | ✅ **RE-GROUNDED** on `D5-subject (i)`; Panel routing DROPPED |
| **G7** | The audit **unit** disagreed across AC5 / Task 4 / Task 6 (≈8 vs ≈17) | ✅ **PINNED: per OPEN** |
| **G8** | ⚠ Every `.decision-log.md:NNN` citation stale by **~+152** (`-212`/`-213` prepended) | ✅ **SWEPT**; `deferred-work.md` switched to **ITEM ADDRESSES** |

⚠⛔⛔ **TWO OF THESE EIGHT WERE THE PASS'S OWN DEFECTS — ⛔ marked 2026-09-13, ⛔ rows kept**
([[feedback_story_validate_footguns]] #22 — *the validate pass's own output needs validating*).
⭐ **G6 OVERCLAIMED.** *"RE-GROUNDED; Panel routing DROPPED"* traced the **TEXT** and ⛔ not the
**STATUS**: `D5-subject (i)` is an **OPEN deferred item with a live trigger**, ⛔ not a ruling, and
`-213`'s entry was ⛔ **never amended** — it still says *"nobody has said which"*. ⇒ ⭐ the honest word
was ***"DE-ROUTED but ⛔ NOT LOGGED"***, and `8-17` (`done`) has since deferred the owed record **to this
story by name**. ⇒ **Task 1** now writes the successor entry.
⭐ **G8's SWEEP DID ⛔ NOT HOLD — and it was broken by this story's OWN next commit.** `-214` prepended
~96 more lines hours later ⇒ all four pointers rotted again. ⇒ ⭐ they are now **DELETED**, ⛔ not
re-derived: ⛔ **never write a line number into a newest-first file, ⛔ not even a fresh one.**

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
> text with *"⛔ no member identity behind it"* (⚠⛔ **⛔ NOT `D5-subject (i)` and ⛔ NOT `:390-391`** —
> ⛔ corrected 2026-09-13: that quote is `deferred-work.md`'s **11b.1 item (h) `D-nominee-name-form`**, a
> *recorded argument*; ⭐ the statement to cite is `D5-subject (i)`'s ***"the SCHEMA is the authority"*** —
> ⚠⛔ an **OPEN `deferred-work.md` item with a live trigger**, ⛔ **NOT a ruling** (`.decision-log.md`
> records `D5-subject` OPEN at four separate sites); ⛔ corrected 2026-09-13. See the References). ⇒ ⛔ do ⛔ not wait on `8-16`
> for it, and ⛔ do ⛔ not build it here.

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) — `bmad-dev-story`, 2026-09-13.

### Debug Log References

⭐ **EVERY FENCE IN THIS STORY WAS PROVEN TO BITE WITH A PLANTED PROBE, ⛔ NOT READ OFF A GREEN RUN.**
⚠ Recorded because one of them was **VACUOUS** and only the probe found it (see finding **F1**).

| Probe | Target | Result |
|---|---|---|
| A third, unauthorised `message_block.*` resolver | the NARROWED dark-copy fence | ⛔ **RED** ✅ |
| `amountRaisedInr <= 0` guard removed | AC10(3) — the ₹0 silence, ⛔ no `no_amount` variant | ⛔ **RED** ✅ |
| `deceasedMemberName === null` variant removed | AC10(2) — a `.full` on a nameless drive = a WHOLE-PAGE 500 | ⛔ **RED** ✅ |
| a literal `₹` prepended to `{amount}` | AC10(1) — ships **₹₹** | ⛔ **RED** ✅ |
| the district column left attached to the nominee | AC10(4) — `-214` Consequence 6 | ⛔ **RED** ✅ |
| `onPress` stripped, `button` role kept | E's AMENDED row fence — ⭐ the direction the OLD assertion could ⛔ not catch | ⛔ **RED** ✅ |
| the push address rebuilt from `poolCanonicalIdentifier` | 11b.10 D2's guessability | ⛔ **RED** ✅ |
| the AC5 audit line moved inside the per-account map | AC5 — ⛔ ONE line per DETAIL OPEN, ⛔ not per account | ⛔ **RED** ✅ |
| the cross-Pariwar 404 "improved" into a 403 | AC3(a) — a 403 IS the enumeration oracle | ⛔ **RED** ✅ |
| `vpa` added to the wire + decrypted | D3(D) / `-212` cl.2 | ⛔ **RED** ✅ |
| the account number masked (`.slice(-4)`) | Trap 4 — *"a masked account# cannot be transferred to"* | ⛔ **RED** ✅ |
| the percentage suppressed at zero | AC9 — member would drop BELOW public | ⛔ **RED** ✅ |
| the table moved BELOW the message | AC10 / §8.1 — *"a table **above** the message"* | ⛔ **RED** ✅ |
| a `<Button>` nested inside a labelled container | AC11 / family 13 | ⚠⛔ **GREEN — ⛔ THE FENCE WAS VACUOUS.** See **F1** |

### Completion Notes List

⭐ **ALL TWELVE ACs (AC0-AC11) SATISFIED. ALL TASKS COMPLETE.** Two commits: the `governance:` commit
FIRST and with ⛔ **NO CODE** ([[feedback_governance_commits_precede_implementation]]), then the build.

#### ⭐ Task 1 — GOVERNANCE (AC0), ⛔ before a line of code
- **`epics.md`** gained a `### Story 11b.17` **SECTION** — ⛔ not an annotation (a NEW member-app
  surface with ⛔ no parent there; the `11b-19` / `11b-15` / `8-16` / `7-11` precedent).
- **`#decision-2026-09-13-215`** — the **§8.4(ii) SUCCESSOR** entry `8-17` deferred here **BY NAME**.
  ⛔ `-213` is ⛔ **NOT edited**. ⭐ The honest prior status is recorded as ***"DE-ROUTED but ⛔ NOT
  LOGGED"*** — ⛔ not *"closed"*, ⛔ not *"ruled"*, ⛔ not *"still routed"*
  ([[feedback_closure_language_precision]]). ⚠⛔ The ground is the **SHIPPED SCHEMA** (migration `0056`
  — ⛔ no FK, ⛔ no `nominee_rank`, ⛔ no match rule) and ⛔ **NOT** 6.8's D1 *as a decision*: that is
  author-committed (*"APPROVED (BigDev)"*) and was this story's **entire licence to drop a Panel
  routing** ([[feedback_trace_internal_state_never_cite_decision_text]]).
  ⛔ It does ⛔ **NOT** close `deferred-work.md`'s `D5-subject (i)`, which stays **OPEN**.
- **SIX stale artefacts ROUTED** into `deferred-work.md` with addresses and triggers, including the two
  the story itself had diagnosed and then routed ⛔ nowhere.
- **This story's own `sprint-status.yaml` row block REWRITTEN** — superseded text kept as **dated,
  struck lines**; the **§8.3(3)/§8.5** cite corrected to **§8.1 / §9.1 row 3** (the story body fixed it
  at v1.2 and ⛔ never swept the ledger — five days, [[feedback_story_validate_footguns]] #16).

#### ⭐ Tasks 2-4 — the read, the boundary, the audit
- ⭐⭐ **A NEW CONTRACT + A NEW ROUTE, ⛔ NOT AN ADDITIVE FIELD.** `MemberDriveListEntry` is `.strict()`
  and `api-client`'s `call` throws ⇒ one added field **BLANKS THE WHOLE FOURTH TAB** for every member
  on an older installed build. ⭐ This is `deferred-work.md`'s own stated remediation (*"prefer a NEW
  contract"*), and a new route is **INVISIBLE** to an older build ⇒ ⛔ no deployment order is owed here.
- ⭐ The domain accessor declares its **OWN** visible-state tuple **and** its **OWN** `live`-only लक्ष्य
  fragment (`-196` / `-212` Consequence 2), and **its own nominee projection**: reusing
  `sahyog-vivran-read.ts`'s would have yielded ⛔ **NEITHER `bankName` NOR `branch`** (it was narrowed
  to two fields — *"Closed HERE by deletion"*) and AC4's five-field render would have come up **TWO
  FIELDS SHORT**.
- ⭐ लक्ष्य resolves through **`resolveDriveTargetVisibility`**, ⛔ never `getDriveTargetVisibilityRow`.
  ⭐ **Proven live**: ⛔ no reveal row ⇒ the key is **ABSENT**; the switch ON ⇒ **₹5,000** (10 × ₹500).
- ⭐ `vpaCiphertext` is **⛔ NOT PROJECTED** — the exclusion is **STRUCTURAL**, ⛔ not remembered.
- ⭐ **AC3's shape RESOLVED: a 404**, collapsing FIVE cases (no such drive · not visible at this
  predicate · malformed token · real drive wrong token · **another Pariwar's drive**). ⛔ Never a 403 —
  a 403 **IS** the enumeration oracle. ⚠⛔ The vacuous
  `expect(body).not.toHaveProperty(…)`-against-a-404 was ⛔ **NOT** written.
- ⭐⭐ **AC5: EXACTLY ONE audit line per DETAIL OPEN**, attributed, naming the **canonical identifier** —
  ⛔ never the public token, ⛔ never a decrypted value. A **NAMED DEPARTURE** from the anonymous public
  precedent, on **both** axes.

#### ⭐⭐ AC5's SIZING — ⭐ MEASURED, ⛔ NOT ESTIMATED
⭐ A counting `auditHook` over a real open: **7 Tier-1 decrypts + 1 AC5 line = 8 global-lock
acquisitions per detail open** — ⭐ exactly the **≈8** end AC5 predicted, and ⛔ **SEVEN OF THE EIGHT
ARE INVISIBLE** (emitted by the crypto layer). ⚠⛔ `-199` Consequence 2's *"a write on every detail
open"* — **singular** — was **wrong in the story's favour**. ⭐ Asserted as an EXACT count, so a future
decrypt fails there and is sized deliberately. ⛔ **NOT a blocker**; ⛔ the KMS hook is **NOT** dropped
(it is the **FR-47** record of which key opened which field). ⭐ A **PRE-EXISTING** condition this
surface AMPLIFIES — story **E** already decrypts two names per row, so the baseline is ⛔ **not zero**.

#### ⭐ Task 5 — the screen
- ⭐ **AC4**: both accounts, **FIVE** fields each, **UNMASKED**. The holder label is the ruled
  *"Nominee Name"* via `label.account_holder` — ⛔ never `nominee.label` (renders *"Nominee"*), ⛔ never
  `upi_intent.account_holder_label` (literally the forbidden string). Two **DIFFERING** holder names
  **SURFACE BOTH, PICK NEITHER** — proven live with deliberately differing fixtures.
- ⭐ **`label.branch` MINTED HERE**, at its own render site (the `8-17` `upi_intent.vpa_label`
  precedent). ⛔ It is **NOT** ratified copy: ⛔ no clause names `branch`.
- ⭐ **AC8**: E's row became a **REAL** control; its fence went RED **by design** and was **AMENDED BY
  NAME** — and the amendment is **STRICTER** (it now catches a handler stripped from a role, which the
  old assertion could ⛔ not).
- ⭐ **AC10**: the eight keys consumed BY NAME; the dark-copy fence **NARROWED** per its own author's
  written instruction — ⛔ never deleted, ⛔ never appended to.

#### ⚠⛔ THREE THINGS FOUND THAT THE STORY DID ⛔ NOT PREDICT — ⭐ RECORDED, ⛔ NOT ABSORBED

**F1 — ⛔⛔ MY OWN FAMILY-13 FENCE WAS VACUOUS, AND ⛔ ONLY A PLANTED PROBE FOUND IT.**
The first version tracked a running JSX `depth` and recorded the labelled depth at the **LINE**
carrying `accessibilityLabel`; ⛔ this codebase formats JSX attributes across **MULTIPLE LINES**, so
the container's own `<YStack` had already incremented `depth` ⇒ a nested `<Button>` sat at the *same*
depth and `depth > labelledDepth` was ⛔ **never true**. ⭐ A planted `<Button>` inside a labelled
container **PASSED**. ⇒ rewritten to bound each element by its **matching close at the same
indentation**, and **re-probed in two places** — both now RED.
⚠⛔ Recorded rather than quietly rewritten ([[feedback_record_unattested_no_backfill]]): it is the exact
defect [[feedback_gate_scope_semantic_coverage]] names — **a green scan that asserts nothing** — found
in the pass that was writing the fences.

**F2 — ⛔⛔ A THIRD GREEN TEST WENT RED, AND THE STORY PREDICTED ⛔ ONLY TWO.**
`apps/mobile/tests/unit/sahyog-vivran-entry.test.ts` — *"⛔ no `(sahyog)` route group was added to the
app"* — is Story **11b.10's D4** pinned in code (*"⛔ no new route group"*, author-committed BigDev
2026-09-04b), and it `readdirSync`s the route root, ⭐ *"the DIRECT reading of that — ⛔ not a proxy"*.
⚠ My first build added `app/(sahyog)/` and turned it red.
⛔⛔ **RENAMING THE GROUP WOULD HAVE BEEN THE DISHONEST FIX** — the assertion names `(sahyog)` by
string, so `(drive-detail)` would have gone GREEN while adding **exactly the new route group D4
forbids**. ⇒ ⭐ the screen was **RE-HOMED INSIDE THE EXISTING `(contribution)` GROUP**
(`/(contribution)/drive/[driveToken]`), which **MEETS** D4 as written and needs ⛔ **no supersession
and ⛔ no reinterpretation** ([[feedback_supersede_never_reinterpret]]). ⭐ It is also the right home on
its merits: its sibling `contributors.tsx` is the same shape (a read-only member view of a pool,
reached by `router.push` from a card affordance) and `note/[id].tsx` already nests a dynamic route
there. ⚠ The story's **Task 5a** ordered *"NAME THE ROUTE BEFORE YOU BUILD IT"* and its own example
(`(tabs)/sahyog/[publicToken].tsx`) would ⛔ not have tripped D4 either — ⭐ the deviation was mine, and
a **shipped fence caught it**.

**F3 — ⚠⛔ A REAL `-189` cl.3 SHORTFALL: THE APPEAL LINEAGE. ⭐ ROUTED, ⛔ NOT CARVED OUT.**
⭐ **Found by writing AC2's comparison test**, which reads the floor **PROGRAMMATICALLY from the live
maps** — ⛔ it would ⛔ never have surfaced from a transcribed list. The public Sahyog Vivran **DETAIL**
renders a *"Reversed by appeal"* lineage (`appeal_reversal_stage` · `appeal_disposition_category` ·
`appeal_reversal_at`); ⛔ this member surface carries **none of them**.
⚠⛔ It is ⛔ **NOT** one of AC2's three authorised exclusions — AC2 names exactly three and then
*"⛔ NOTHING ELSE"* ⇒ ⭐ the honest word is **SHORTFALL**. ⛔ It was ⛔ **not** built here: the lineage is
a separate request-time read over the claim's `claim.reversed` stream, and putting it on a member
surface is a live **DISCLOSURE question** — *may every member see that a family's claim was DENIED and
then reversed, and at which stage?* — that `-199`, `-212` and `-213` ⛔ **none of them reach**, and the
public page publishes it under a **different** authority (11b.3 D12(a)) which is ⛔ **not transitive**.
⇒ ⭐ **DECLARED in the test** (the three ids carry an explicit empty counterpart, and an assertion pins
the gap at **exactly three** so a fourth fails loudly) and **ROUTED** to `deferred-work.md`.
⚠ The residual, plainly: on an appeal-reversed drive a member sees **LESS** than a stranger on that one
axis. ⭐ Bounded, and the error runs toward saying **LESS** — ⛔ it is not a disclosure leak.

#### ⚠ HONEST NOTES ON PROCESS
- ⚠⛔ **RED-GREEN WAS ⛔ NOT STRICTLY FOLLOWED** — the story's own **Task 6** holds all tests, and the
  task sequence is authoritative. ⭐ Stated, ⛔ not glossed (story **E** recorded the same).
- ⭐ The **dark-copy fence's SCOPE was NARROWED** to exclude **test modules** (`*.test.*` / `*.spec.*`),
  with its reason written in: it caught this story's own test file, and ⭐ its stated danger is a
  **production 500** — a test asserting the keys ⛔ cannot ship one, which is why the file already
  self-excluded itself by real path. ⚠⛔ The **WRONG** fix would have been appending the test to
  `AUTHORISED`, which both allow-lists forbid in terms. ⭐ Re-probed after the narrowing: an
  unauthorised **PRODUCTION** resolver still fails, and the `index_line.*` fence still names exactly
  `sahyog.astro`.

#### ⛔ WHAT THIS STORY DID ⛔ NOT DO (⭐ each deliberate)
⛔ No public surface · ⛔ no masking change · ⛔ no change to the 9.9 donor path or the member list's
one-decrypt behaviour · ⛔ no contributor names · ⛔ no `spawned` · ⛔ **no `vpa` on any wire** · ⛔ no
widening of `contribution-history` · ⛔ `SahyogVivranEntry` **untouched** (Trustee-ratified `-200`
cl.4 — ⚠ a member now has **TWO** views of one drive, and ⭐ that divergence is **expected and
recorded**) · ⛔ `-212` Consequence 6 (*"Account holder"*) **not fixed by side effect** — routed, and
⛔ still **unhomed** · ⛔ `deferred-work.md`'s `D5-subject (i)` **not closed**.

### File List

**Governance (the `governance:` commit — ⛔ NO CODE)**
- `_bmad-output/planning-artifacts/epics.md` — the `### Story 11b.17` SECTION
- `.decision-log.md` — `#decision-2026-09-13-215` (the §8.4(ii) successor entry)
- `_bmad-output/implementation-artifacts/deferred-work.md` — six routed artefacts
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — the row flip + the row-block rewrite

**Contracts**
- `packages/contracts/src/contributions/member-drive-detail.ts` — **NEW**
- `packages/contracts/src/contributions/index.ts` — barrel
- `packages/contracts/scripts/emit-openapi.ts` — components + the path
- `openapi/v1.yaml` — regenerated (determinism gate green)

**Domain**
- `packages/domain/src/pool/member-drive-detail.ts` — **NEW**
- `packages/domain/src/pool/index.ts` — barrel

**API**
- `apps/api/src/modules/member-pool/handlers.ts` — `driveDetail` + `resolveDriveDetail`
- `apps/api/src/modules/member-pool/routes.ts` — the route
- `apps/api/src/audit/audit-sink.ts` — `member_drive_detail.coordinates_viewed`

**API client**
- `packages/api-client/src/index.ts` — `memberDriveDetail`

**Mobile**
- `apps/mobile/app/(contribution)/drive/[driveToken].tsx` — **NEW** (⛔ **not** a new route group)
- `apps/mobile/components/drive-detail/MemberDriveDetail.tsx` — **NEW**
- `apps/mobile/components/drive-detail/format.ts` — **NEW** (the pure, testable selectors)
- `apps/mobile/components/drive-detail/useMemberDriveDetailQuery.ts` — **NEW**
- `apps/mobile/components/drive-list/MemberDriveList.tsx` — AC8: the row is a REAL control; two
  doc-blocks SUPERSEDED BY NAME
- `apps/mobile/app/_layout.tsx` — ⛔ reverted to unchanged (the `(sahyog)` registration was removed
  with the group)

**i18n**
- `packages/i18n/locales/{en,hi}/member-drive-detail.json` — **NEW**
- `packages/i18n/locales/{en,hi}/sahyog-vivran.json` — `label.branch` MINTED
- `packages/i18n/locales/{en,hi}/member-drive-list.json` — `row.open_hint`; `$comment.nominee` APPENDED
- `packages/i18n/locales/{en,hi}/sahyog-shared.json` — `$comment.drive_target` AMENDED (TWO ⇒ three)
- `packages/i18n/src/catalog.ts` — the namespace registered (⭐ **BOTH** registry lines + a test that
  resolves a real key — the 11a.2 trap)

**Tests**
- `apps/api/tests/integration/contributions/member-drive-detail.spec.ts` — **NEW** (live DB)
- `packages/contracts/tests/member-drive-detail.test.ts` — **NEW** (AC3(b) + AC7's fence)
- `apps/public/tests/member-drive-detail-field-floor.test.ts` — **NEW** (AC2's comparison)
- `apps/mobile/tests/unit/drive-detail-render.test.ts` — **NEW**
- `apps/mobile/tests/unit/drive-list-render.test.ts` — E's row fence AMENDED BY NAME
- `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` — the `message_block.*` fence NARROWED

**Deferred work (Task 6)**
- `_bmad-output/implementation-artifacts/deferred-work.md` — the MMKV/DPDPA trigger recorded **FIRED**;
  the `.strict()` item's trigger re-pointed to `8-17`; the measured amplification; ⭐ the **NEW**
  appeal-lineage shortfall (**F3**)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-13 | 2.0 | ✅⭐⭐ **IMPLEMENTED — `ready-for-dev` → `review`. ALL TWELVE ACs (AC0-AC11); ALL TASKS.** ⭐ **Task 1's `governance:` commit landed FIRST, with ⛔ NO CODE** ([[feedback_governance_commits_precede_implementation]]): the `epics.md` **SECTION**, **`#decision-2026-09-13-215`** (the §8.4(ii) SUCCESSOR entry `8-17` deferred here BY NAME — ⭐ status recorded as ***"DE-ROUTED but ⛔ NOT LOGGED"***, grounded on the **SHIPPED SCHEMA** and ⛔ **not** on 6.8's D1 *as a decision*, which is author-committed and could ⛔ not carry the licence to drop a Panel routing), **SIX routed artefacts**, and this story's own ledger row block rewritten with the **§8.1 / §9.1 row 3** correction the body made five days earlier and ⛔ never swept. ⭐ **A NEW CONTRACT + A NEW ROUTE, ⛔ not an additive field** — `MemberDriveListEntry` is `.strict()` and `api-client` throws, so one added field blanks the whole fourth tab on older builds; a new route is **INVISIBLE** to them ⇒ ⛔ no deployment order owed. ⭐ The domain read carries its **OWN** visible-state tuple, its **OWN** `live`-only लक्ष्य fragment **and its own nominee projection** — ⚠ reusing `sahyog-vivran-read.ts`'s (narrowed to two fields, *"Closed HERE by deletion"*) would have left AC4 **TWO FIELDS SHORT**. ⛔ `vpaCiphertext` is **NOT PROJECTED** ⇒ D3(D) is **STRUCTURAL**. ⭐ **AC3's shape RESOLVED: a 404** collapsing FIVE cases (incl. the cross-Pariwar one) — ⛔ never a 403, which IS the oracle. ⭐⭐ **AC5 SIZED, ⛔ not estimated: 7 Tier-1 decrypts + 1 line = 8 global-lock acquisitions per open**, exactly the ≈8 end; ⛔ SEVEN ARE INVISIBLE. `-199` Consequence 2's *"a write"* — singular — was **wrong in the story's favour**. ⛔ Not a blocker; ⛔ the FR-47 KMS hook is NOT dropped. ⭐ **AC8**: E's row became a REAL control; its fence went RED by design and was **AMENDED BY NAME** — and is now **STRICTER** (it catches a handler stripped from a role, which the old assertion could ⛔ not). ⭐ **AC10**: the dark-copy fence **NARROWED**, ⛔ never appended to. ⭐ `label.branch` **MINTED at its own render site** (⛔ it is NOT ratified copy). ⭐⭐ **EVERY FENCE PROVEN TO BITE WITH A PLANTED PROBE — 13 of 14 RED.** ⚠⛔⛔ **THREE THINGS THE STORY DID ⛔ NOT PREDICT, ⭐ ALL RECORDED: (F1) MY OWN FAMILY-13 FENCE WAS VACUOUS** — JSX attributes span multiple lines, so its depth tracker never fired; ⭐ a planted `<Button>` inside a labelled container **PASSED**; rewritten by element extent and re-probed RED twice ([[feedback_gate_scope_semantic_coverage]]). **(F2) A THIRD GREEN TEST WENT RED** — `sahyog-vivran-entry.test.ts` pins **11b.10's D4** (*"⛔ no new route group"*); my first build added `app/(sahyog)/`. ⛔⛔ **Renaming would have been the DISHONEST fix** (the assertion names the string) ⇒ ⭐ **re-homed into the EXISTING `(contribution)` group**, which MEETS D4 as written with ⛔ no supersession and ⛔ no reinterpretation. **(F3) A REAL `-189` cl.3 SHORTFALL** — the public DETAIL renders an **appeal lineage** this surface carries ⛔ none of; ⛔ it is **NOT** one of AC2's three authorised exclusions, so the honest word is **SHORTFALL**. ⛔ Not built (it is an unruled DISCLOSURE question `-199`/`-212`/`-213` ⛔ none of them reach) ⇒ ⭐ **DECLARED in the test** (pinned at exactly three ids) and **ROUTED**. ⚠ **RED-GREEN ⛔ not strictly followed** (Task 6 holds all tests, per the story's own sequence) — ⛔ stated, ⛔ not glossed. ✅ **Typecheck 20/20 · lint 20/20 · i18n parity green · openapi determinism green · full unit suite green · live-DB suite green** (`@twt/api` 1255, `@twt/domain` 3352, exit 0). | BigDev + Claude |
| 2026-09-13 | 1.5 | ⭐ **FOURTH `validate` PASS — ⛔ ZERO ROWS MOVE; ⛔ NO CODE; ⛔ NO CRITICAL FINDING.** Baseline drift re-checked (`a2617869` still an ancestor; the same 15 files still the full code-drift set); four parallel verification lanes plus direct spot-checks re-traced ~70 of this file's citations against HEAD, `.decision-log.md`, `sprint-status.yaml`, `epics.md`, every named sibling story, and both i18n locales — **nothing found FALSE**, no Stop reopened, no governance-state claim contradicted. **Two mis-cites corrected, both citing a passage about a DIFFERENT structure than the one being ruled:** AC1/D2's *"`public-read.ts:283-284` forbids sharing the tuple"* — that passage is the four SQL count fragments' doc-comment, ⛔ not the pool-state tuple's; `-196` Consequence 2 borrows its wording **by analogy** (the decision log's own move, ⛔ not this story inventing one) and remains sufficient authority alone. AC2/AC10's *"never mint a second key (`-193` cl.3, `-206` cl.1)"* — `-206` cl.1's subject is the progress bar's own `82%`; its *"ONE SOURCE, ⛔ NOT TWO"* sub-point is about that percentage's format, ⛔ not `drive_target`/`message_block`; `-193` cl.3 alone was already the References block's citation, just never swept to the ACs. **One class of citation drift recorded, deliberately NOT swept** (single-digit lines, no behavioural change — see the new Dev Notes subsection): the `ANONYMIZED_SENTINEL` backstop, `PublicSahyogVivranNomineeAccount`'s span, and the `DIRECTORY_DECRYPT_CONCURRENCY` halving site. **One stale artefact found OUTSIDE this story's own files, routed as Task 1 item (f):** `apps/mobile/app/(contribution)/pay.tsx:16-18`'s flow comment still calls VPA collection *"still deferred"* though `8-17` (`done`) shipped it — not F's file, found incidentally while re-verifying `-212` Consequence 3. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-13 | 1.4 | ⛔⛔ **RE-RUN OF THE VALIDATE CHECKLIST AGAINST v1.3's OWN OUTPUT — ⭐ PROMPTED BY BigDev CATCHING A DEFECT v1.3 HAD CERTIFIED. ⛔ ZERO ROW MOVES; ⛔ NO CODE.** ⭐ Three verifiers; ⭐⭐ **the majority of findings were v1.3's OWN** ([[feedback_story_validate_footguns]] #22). ⛔⛔ **THE WORST: v1.3 BROKE A CORRECT CITATION AND INVENTED ITS JUSTIFICATION** — `public-read.ts:169-173` was **right**; v1.3 "corrected" it to `:171-175` (which drops the declaration and `live: 'live'` and runs two lines past the closing brace) on the ground that *"`:169-173` excludes `settled: 'verified'` at `:174`"* — ⛔ **fabricated**: `:174` is BLANK and the mapping is at `:172`. ⛔ Reverted. ⛔⛔ **AND v1.3's *"three ranges … unified"* SWEEP CLAIM WAS FALSE** — it named three of **four** and swept ⛔ none of the other sites; ⭐ actually unified now. ⚠⛔⛔ **THE `⛔` GLYPH WAS INVERTING MEANING AT FOURTEEN SITES** — four of them **imperatives** (*"⛔ Route it"*, *"⛔ record the trigger as fired"*), one of them **AC0's own commit-ordering rule** (*"⛔ one `governance:` commit, ⛔ before any code"* = *not one, not before*), and one of them the **RECORD header's own disarming sentence** (*"⛔ KEPT, ⛔ NOT DELETED"* = *not kept*). ⭐ **A REGISTER BLOCK IS NOW DECLARED UNDER THE STATUS LINE** and all fourteen are corrected. ⛔⛔ **AC4's `branch` WAS ORDERED, FORBIDDEN AND UNHOMED AT ONCE** — v1.3 called *"Branch"* **ratified copy**; ⛔ no clause names it, and `8-17` already minted `upi_intent.vpa_label` **at its own render site** ⇒ ⭐ **mint `label.branch` HERE**. ⛔⛔ **6.8's D1 IS ⛔ NOT TRUSTEE-RATIFIED** (*"APPROVED (BigDev)"*) — ⛔ v1.3 called it ratified, and that sentence was the story's **entire licence to drop a Panel routing**; ⭐ re-grounded on the **SHIPPED SCHEMA**, which is stronger. ⛔⛔ **`D5-subject (i)` WAS PROMOTED TO A RULING** at three sites while this story's own AC0/AC4/References call it OPEN (the log records it OPEN at **four** sites) ⇒ swept to **records**. ⚠⛔ **`6-18` WAS CITED AS PROOF THE QUESTION IS SETTLED** — its own header says it does ⛔ NOT close `D5-subject` **(i)**, and **its D1 is OPEN and BLOCKS its AC1** — the very AC quoted; ⭐ and that quote was an **ellipsis splice of two separate bullets**. ⭐ Added: **Task 5a** (⛔ no task named the screen file to create, while AC8's test disposition depends on it), the **two Hindi divergences `11b-19` recorded** (`स्व.` vs `स्व०` — ⛔ normalising it re-punctuates ratified text), **per-paragraph SUPERSEDED sentinels** inside the RECORD (a grep lands mid-block on live-looking orders), and the hoist block reordered to **NINE**, with the ⛔ **two DISCLOSURE-class items first** — v1.3 had hoisted two CI-level items and omitted both. ⚠ Swept: `-214` Cons. 5→**Cons. 6** on AC10(4) and `-207` cl.2 onto AC10(3); *"ELEVEN ACs"*→**TWELVE**; *"~175 lines"*→**~99**; four cite drifts (`:558`→`:559`, `:558-560`→`:556-560`, `:274`→`:275`, `:246-250`→inside `:245-251`); the `8-17` quote restored to `:348-354`. ⭐ **CONFIRMED SOUND by an independent lane:** the §8.4(ii) headline, the *"DE-ROUTED but ⛔ NOT LOGGED"* word, the **successor-entry-never-edit-`-213`** remedy (the house pattern, verified at **five** sites), `-212` Cons. 6 as **unhomed**, `-214` Cons. 3 as **HOMED not closed**, both STOP discharges, and ⭐ **ZERO governance content lost in the v1.3 restructure**. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-13 | 1.3 | ⛔⛔ **RE-VALIDATED (`bmad-create-story validate`, three independent verifiers) — 38 FINDINGS, ALL APPLIED. ⛔ ZERO ROWS MOVE; ⛔ NO CODE.** ⭐ Baseline **NOT re-pinned** — `a2617869` IS still an ancestor. ⚠⛔⛔ **BUT THE v1.1 CLAIM *"⛔ no code moved"* IS ⛔ FALSE AND IS THE PREMISE EVERY OTHER CLAIM RESTED ON:** `story(8.17)` and `story(11b.19)` **SHIPPED 15 CODE FILES** since the pin — `payment/handlers.ts`, `pay.tsx`, `nominee-accounts.ts`, `public-pages/sahyog-vivran.ts`, four locale catalogs and a NEW i18n fence — ⛔ every one of them cited here by line. ✅⭐⭐ **BOTH STOPS ARE DISCHARGED AND THE STORY IS STARTABLE IN FULL:** STOP 1 by `-214` (2026-09-11), **STOP 2 by `11b-19` (`done`)**, which shipped all **eight** `message_block.*` keys in **both** locales ⇒ the v1.2 findings *"B ⛔ NEVER SHIPPED THE COPY"* and *"AC10 is UNSATISFIABLE"* are **FALSIFIED** (marked below, ⛔ not rewritten). ⛔⛔ **AND THAT DISCHARGE CREATED AN OBLIGATION THE FILE CARRIED ⛔ NOWHERE: `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` holds `AUTHORISED: string[] = []` with a regex HARDENED to catch a dynamic key ⇒ AC10 fails it BY PATH** — ⭐ **NARROW it** per its own author's written instruction, ⛔ never delete, ⛔ never append. ⛔⛔ **§8.4(ii) IS ⛔ NOT SETTLED — `8-17` (`done`) DEFERRED THE RECORD HERE BY NAME** (`8-17:352`) while `-213` still reads *"nobody has said which"* ⇒ the log and this story **DISAGREE** and ⭐ **Task 1 now owes a SUCCESSOR entry** ([[feedback_closure_language_precision]], [[feedback_supersede_never_reinterpret]]). ⭐ **AC7's fence model was WRONG** — *"the shape E's AC8 uses"* scans ⛔ nothing and was breached by E's own dev; ⚠ the correction was already made against `11b-19` and ⛔ **never swept to the story carrying the sentence verbatim** ([[feedback_story_validate_footguns]] #16). ⛔⛔ **AC2's inert-gate carve-out resolved ⛔ ONE of TWO subjects** — the **deceased** name's gate is inert (clause id: ⛔ ONE repo occurrence, its own definition) but the **NOMINEE's name carries ⛔ NO gate and that is RULED** ⇒ the carve-out would have **suppressed a real failure** (#20). ⭐ **WRITTEN: AC11** (family 13 + the `ANONYMIZED_SENTINEL` backstop — a whole a11y surface that had ⛔ no AC), **Task 6 subtasks for AC4/AC8/AC9/AC10/AC11** (⛔ AC4, the highest-disclosure AC, was shipping **untested**), a **Task** for the three-resolver rule, a **Task** that ROUTES the stale artefacts, and AC2's comparison **assertion stated in full**. ⚠⛔ **Task 1 ordered a decision entry that ALREADY EXISTS** (a dev would have minted a duplicate) and **Task 6 carried two MUTUALLY UNSATISFIABLE AC3 tests** on the AC this story calls load-bearing — ⭐ both fixed. ⚠ **Swept again:** all four `.decision-log.md:NNN` (stale a SECOND time — ⛔ **broken by this story's OWN `-214` governance commit**, ⭐ now DELETED in favour of clause addresses), all three `sprint-status.yaml` numbers (⛔ ~570-610 lines off ⇒ **row-key addressing**), eleven `deferred-work.md` numbers (two **swapped**, one pointing at the **wrong item**) ⇒ **item addresses**; `8-17`/`11b-19` statuses ⇒ **`done`**; `-214` Cons. 3 ⇒ **HOMED at `11b-20`**, ⛔ not unhomed; the *"stale VPA doc-block"* ⇒ **CLOSED BY [EDIT]**; `-211` and `D5-subject (i)` **labelled author-committed**; the `bank_name`/`branch` asymmetry **named** (⛔ one guard cannot serve both); five unlabelled pool-state/wire-token assertions **labelled**; `public-read.ts:169-173` ⇒ `:171-175` (⛔ the old range **excluded** the mapping it was cited for). ⭐ **RESTRUCTURED:** ~99 lines of pass archaeology moved under **`## 📚 RECORD`** — ⛔ nothing deleted from the moved block — and a **SEVEN THINGS THAT WILL BITE YOU** block hoisted after the Tasks. ⚠⛔ **AND ONE DELETION IS OWNED, ⛔ not hidden:** v1.2's 18-line PREFLIGHT status block was **superseded and removed** (its substance survives in the v1.2/v1.3 rows) ⇒ ⛔ the phrase *"zero bytes deleted"* held for the MOVE and ⛔ not for the rewrite. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-11 | 1.2 | ⚠⛔ **STOP 1's AUTHORITY CITATION WAS WRONG AND IS CORRECTED — ⛔ the obligation is UNCHANGED.** v1.1 cited **§8.3(3)** and **§8.5 row 3**; ⛔ §8.5 is *"What we **propose**"* and §8.3(3) is a **sequencing statement**, ⛔ neither a ruling. ⭐ The ratification is **§8.1** (*"Ratified verbatim (DR + KB, 2026-09-05)"* — the block **plus** the `Nominee full name` \| `District` table, ***"on both the member and the public view"***) and the routing is **§9.1 row 3** (*"B can ship the shared copy source now. **E/F consume it later**"*). ⭐ **§10 READ TO THE END:** §10.4 re-homes **three OTHER rulings** and ⛔ leaves this one standing. ⛔⛔ **AND TWO THINGS TRACED LIVE MAKE IT WORSE: B ⛔ NEVER SHIPPED THE COPY** (`sahyog-shared` has `index_line.*` only; the tagline is ⛔ nowhere in `packages/i18n/locales/`) while `11b-12` is `done`; **and story E (`11b-15`) closed `done` owing the IDENTICAL render.** ⇒ ⭐ **AC10 is UNSATISFIABLE until B's source has a named home** — ⛔ and that is a STOP, ⛔ never a licence to author ratified copy at a render site. ⛔ **NO CODE.** ⚠⛔⛔ **FALSIFIED 2026-09-13 — ⛔ ROW KEPT, ⛔ NOT REWRITTEN** ([[feedback_record_unattested_no_backfill]]). **(i)** *"B ⛔ NEVER SHIPPED THE COPY"* was TRUE WHEN WRITTEN and is ⛔ **FALSE at HEAD**: `11b-19` (`done`) shipped all eight `message_block.*` keys in both locales — the tagline and *"Join the Pariwar. Be the Movement."* are in `sahyog-shared.json` today. **(ii)** *"**AC10 is UNSATISFIABLE** until B's source has a named home"* is likewise ⛔ **FALSE** — it is **SATISFIABLE NOW**. ⭐ **WHAT SURVIVES:** the obligation was real, it was ratified at **§8.1 / §9.1 row 3**, and ⛔ a render site must ⛔ **NEVER** author ratified copy — ⭐ that rule is unchanged and still governs Task 5d. | BigDev + Claude |
| 2026-09-11 | 1.1 | ⛔⛔ **RE-VALIDATED (`bmad-create-story validate`, three independent verifiers) — 34 FINDINGS, ALL APPLIED. ⛔ ZERO ROWS MOVE; ⛔ NO CODE.** ⭐ Baseline **NOT re-pinned** — `a2617869` is still an ancestor and every commit since is governance-only, so ⛔ no code moved. ⛔⛔ **THE PREFLIGHT IS RE-OPENED: STOP 1.** ⭐ `trustee-panel-routing-note-2026-09-05-11b12` **§8.3(3)/§8.5 row 3** ruled ***"B ships the copy; E and F render it"*** — a **`Nominee full name` \| `District`** table plus B's five-paragraph block, *"written for a **PAGE**"* — routing to F **BY NAME**, and it ⛔ **never reached `.decision-log.md`** ([[feedback_story_validate_footguns]] #15). ⇒ **AC10 + Task 5d WRITTEN**, gated on the decision entry landing FIRST ([[feedback_governance_commits_precede_implementation]]). ⛔⛔ **D2(B) SHIPPED UNGATED:** `reveal_to_members` appeared ⛔ ONCE, in prose — ⇒ **AC2 / Task 2 / Task 6 now carry the fail-closed gate and `resolveDriveTargetVisibility`** (`-211` cl.3; a miss is a **DISCLOSURE** defect). ⭐ **AND ITS RATIFIED NUMBER FORM WAS ABSENT** — `-206` **cl.3** (the clause that exists because **₹300 rendered as `₹ 0 lakh`**), `-204` **cl.2**'s derivation, and the shared **`drive_target`** key F is the **THIRD** consumer of. ⚠⛔ **AC4's *"reuse `nominee.label`"* SHIPPED THE FORBIDDEN STRING** — that token renders **`"Nominee"`**, ⛔ not the ruled *"Nominee Name"*, and its own `$comment` says otherwise and is **false** ⇒ re-pointed to `label.account_holder`. ⚠⛔ **THE `bank_name` HAZARD WAS INVERTED** — it shipped **CLOSED BY DELETION**, so the projection yields ⛔ **NEITHER** `bankName` **NOR** `branch` and AC4 was **two fields short**. ⚠⛔ **§8.4(ii)'s *"nobody has said which"* WAS FALSE** — `D5-subject (i)` ruled *"the SCHEMA is the authority"* (this story's own Dev Notes quoted it), and **`6-18` is `ready-for-dev` on that ground and was ⛔ never named** ⇒ re-grounded, Panel routing **DROPPED** from Task 0e. ⭐ **THE AUDIT UNIT PINNED: ONE line per DETAIL OPEN** — Task 4/Task 6 said *"per coordinate read"* (5 × 2 = ten ⇒ ≈17, ⛔ not ≈8); and the flake trap was pinned to an **awaited** writer while the real fire-and-forget one is `createKmsAuditHook`, ⛔ i.e. the seven invisible KMS lines. ⚠ Swept: **every** `.decision-log.md:NNN` (stale ~**+152**), six `deferred-work.md` cites (**two swapped**) now given as **ITEM ADDRESSES** per that file's own rule; `D3(a)`→**(D)**; *"AC4 needs six"*→**five**; `upi_intent.account_holder_label` (= literally *"Account holder"*) **struck**; the vacuous `-207` cl.1 carve-out (⛔ that field is in **neither** floor map) **struck**; the enumeration bound restated as **CLOSED by ruling + edit** (the rate-limit remedy was **DECLINED**); AC0 → **Task 1**; the pool-state/wire-token vocabularies **separated**. ⭐ Added: the MMKV trigger as a **Task** (it was prose only), four stale artefacts F makes wronger (the admin form that says the switch does nothing, the stale VPA doc-block, `-165` in the shipped contract, `11b-14`'s retired sentence), and family 13(a)'s carve-out. ⛔ **NO CODE.** ⚠⛔⛔ **THREE CLAIMS IN THIS ROW ARE FALSIFIED AT HEAD — ⛔ ROW KEPT, ⛔ NOT REWRITTEN.** **(i)** *"Baseline **NOT re-pinned** … every commit since is governance-only, so ⛔ **no code moved**"* — ⛔ **FALSE**: `8-17` and `11b-19` shipped **15 code files**. ⭐ The **pin itself still holds** (`a2617869` IS an ancestor). **(ii)** *"THE PREFLIGHT IS RE-OPENED: **STOP 1**"* / *"it ⛔ **never reached `.decision-log.md`**"* — ✅ **CLOSED BY [EDIT]** 2026-09-11 by `#decision-2026-09-11-214`. **(iii)** *"gated on the decision entry landing FIRST"* — the **gate is LIFTED**; ⛔ the instruction is ⛔ not. ⚠⛔ **AND ONE CLAIM WAS ⛔ STILL WRONG AS WRITTEN:** it cites the authority as *"§8.3(3)/§8.5 row 3"* — ⭐ v1.2 corrected that to **§8.1 + §9.1 row 3** five hours later, and ⛔ the correction never reached the References block or the sprint ledger until 2026-09-13 ([[feedback_story_validate_footguns]] #16). ⚠⛔ **AND ITS OWN SWEEP CLAIM IS FALSE:** *"Swept: **every** `.decision-log.md:NNN`"* — ⭐ all four were still present, and `-214` re-broke them the same day. | BigDev + Claude |
| 2026-09-10 | 1.0 | ✅⭐ **THE LAST CONDITIONAL IN AC4 IS CLOSED — `#decision-2026-09-10-213` (author-committed).** ⭐⭐ **BOTH ACCOUNTS RENDER, and it is ⛔ NOT the "reversal" the validate pass called it:** the list's one-decrypt rule governs the **HOLDER NAME** (*"the SAME nominee"* twice ⇒ a second decrypt buys nothing), while this surface renders **`account_number` + `ifsc`, which DIFFER per account** — and the money can have gone to **both**, the two being *"EQUAL destinations, the donor's choice"*. ⇒ the list's and pay screen's behaviour **STANDS UNTOUCHED**, and Task 5's *"only if the reversal is named"* sub-item is discharged **by showing there is none**. ⚠⛔ **The differing-holder-name case is ⛔ STILL UNRULED and is SHARPER than §8.4(ii) stated:** the **code asserts one nominee** across both accounts while the **schema permits two names** ⇒ one is wrong and nobody has said which ⇒ **routed with Task 0e**; AC4 surfaces both and picks neither. ⚠ AC5's sizing pins to the **≈8** end now both accounts are in. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-10 | 0.9 | ✅⭐⭐ **BOTH DECISIONS RULED BY THE TRUSTEE PANEL — `#decision-2026-09-10-212` (DR + KB). PREFLIGHT DISCHARGED; ⭐ THE STORY IS STARTABLE.** **D2 → (B):** लक्ष्य renders on **`live` drives ONLY**, mirroring the list and `-204` cl.2's slot; ⭐ `-189` cl.3 holds because the public index is live-only too, so (B) puts the detail **level with** the list, ⛔ not below it. **D3 → (D):** the UPI ID is ⛔ **NOT** on this page — it is **ADDED to the PAYMENT screen**. ⇒ AC4 renders **five** coordinates; AC2 gains the live-only target rule; AC7's target exclusion is replaced by the ruling. ⚠⛔ **Task 0e ADDED — the pay-screen work needs a NAMED HOME and is ⛔ NOT this story's** (`-212` Consequence 3), carrying three things with it: the `.strict()` additive-field trigger now FIRES, a UPI-ID label must be MINTED (story A deleted `label.vpa`), and the pay screen's *"Account holder"* label sits against `-190` cl.2 — ⛔ unresolved, ⛔ not to be fixed by side effect. ⭐ cl.2 **SUPERSEDES** `deferred-work.md` item (e), whose ground was **false when written**. ⛔ **NO CODE.** ⚠ **NOTE 2026-09-13 — ⛔ this row was ⛔ NOT reversed:** the Preflight re-opened at v1.1 (STOP 1) and again at STOP 2, and ✅ **both are discharged as of 2026-09-12** ⇒ ⭐ this row's conclusion (*"the story is STARTABLE"*) **stands again, by a different route**. | Trustee Panel + BigDev |
| 2026-09-10 | 0.8 | ⭐⭐ **THREE PREMISES TRACED TO CODE AT BigDev's DIRECTION — ⛔ none had been.** (1) ⭐ **The `super_admin` reveal switch is BUILT AND OPERABLE** — table + CHECK, key, grant (test-asserted), module MOUNTED, route, write, admin page, form guard. ⇒ `-211` cl.3 holds in the STRONG sense: off because ⛔ nobody has switched it, ⛔ not because nobody can. (2) ⭐ **The UPI intent path is real but reaches ⛔ ONE drive** — `resolveMemberLivePool` needs active + `live` cycle + ASSIGNED, and returns the soonest-closing pool ⇒ on F's page there is ⛔ no pay path for any other drive, so D3's narrow reading is **EMPTY here**; ⭐ a new **option (D)** (the VPA belongs on the PAYMENT surface) was added to the Panel note. (3) ⚠⛔ **AC5's SIZING PREMISE WAS WRONG IN THE STORY'S FAVOUR** — `-199` says *"a write on every detail open"* (singular); it is **one line per ENCRYPTED FIELD DECRYPTED** (`envelope.ts:92-93`, ⛔ no DEK cache) ⇒ **≈5-8 global-lock acquisitions per open, seven of them INVISIBLE** (emitted by the crypto layer). ⭐ Each holds ONE deployment-wide key across 5-6 sequential round trips. ⭐⭐ **⛔ NOT NEW — story E already does it, shipped** (per-row decrypts at concurrency 8) ⇒ a **PRE-EXISTING condition F AMPLIFIES**; ⭐ F is the first surface where a Tier-1 READ is the ordinary path. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-10 | 0.7 | ⭐⭐ **BOTH OPEN DECISIONS ROUTED TO THE PANEL** — `trustee-panel-routing-note-2026-09-10-11b17-member-drive-detail-two-questions.md` (Q1 = D2, Q2 = D3). ⚠⛔⛔ **AND D3's FRAMING IN v0.6 WAS ⛔ WRONG AND IS CORRECTED HERE.** v0.6 read D3 as *"a standing prohibition vs an author-committed enumeration"*, with AC4 held to (a) as the safe default. ⛔ That inverted the authority: **`-191` cl.1 is TRUSTEE-RATIFIED** (DR + KB) and rules the VPA *"a MEMBER field … **shown to the logged-in member** … carried on the member surface as a payment coordinate"*; ⛔ only cl.4 was ever superseded. ⇒ ⭐ the *"prohibition"* is **ours** — a narrow reading taken in `deferred-work.md` item (e) and ⛔ never put back to the Panel — and its phrase *"a NEW Tier-1 exposure ⛔ nobody ruled on"* is **⛔ inaccurate**. ⭐ AC4's five-field render is now stated as a **HOLD, ⛔ not a finding that (a) won**. ⭐ D2 also gains its **second axis**: the list carries लक्ष्य on **`live` rows ONLY** (`member-drive-list.ts:236-244`, `-204` cl.2's *"on a LIVE row"*), while the detail covers three stages ⇒ the finished-drive case is unruled. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-10 | 0.6 | ⛔⛔ **RE-VALIDATED (`bmad-create-story validate`, three independent verifiers) — 32 FINDINGS APPLIED. ⛔ ZERO ROWS MOVE.** ⭐ Baseline **RE-PINNED** `66ef4dce` → `a2617869` (**106** commits of drift; the 2026-09-09 re-pin fixed reachability only and disclaimed re-verification — that debt is now DISCHARGED). ⛔⛔ **TWO DECISIONS OPENED AND A PREFLIGHT STOP ADDED: D2** (`-211` Consequence 2 hands the लक्ष्य question to F **by name**; `-211` cl.1 RETIRED *"no target"*, struck at both sites) and **D3** (AC4's UPI ID contradicts a thrice-stated prohibition; `-199` is **author-committed**, ⛔ not ratified, and supersession must be NAMED). ⭐ **AC8 + AC9 WRITTEN** — E's two routed obligations lived in prose only, ⛔ no AC, ⛔ no Task. ⭐ **AC5 RE-GROUNDED** as a named DEPARTURE: the cited precedent writes `actorId: null` and says *"⛔ Do not widen this to log every request."* ⭐ **AC2 re-pointed** to `SAHYOG_VIVRAN_FIELD_IDS` + the nominee map (E's is the **index** map) with `-207` cl.1 and the inert public name gate carved out. ⭐ **Task 5's a11y instruction INVERTED** — *"`accessible` on every labelled container"* is the defect E's third pass fixed and would have made AC8's control unreachable. ⚠ **AC4 narrowed** (VPA ⇒ D3; the second decrypt named as a reversal; §8.4(ii) surfaced; `Nominee Name` per `-190` cl.2) and its **missing labels** recorded (A deleted five; ⛔ no branch or UPI-ID label exists). ⭐ Added: the `.strict()` blank-out naming F twice, the MMKV at-rest trigger, the `ANONYMIZED_SENTINEL` backstop, `-200` cl.4's untouchable entry, the three-subject resolver split, `clampLimit`, and the **⛔ no-RN-mount-harness** correction. ⚠ Swept: *"43,000"* (7 sites) — `-199` itself corrected it to **per-Pariwar, no ratified figure**; the stale blocked-on chain (**story is UNBLOCKED**); Task 0c (**discharged**); *"last of seven"* → **six**; `-165` → `-205` cl.9; `:804-830` → `:840-905`; Task 0 annotation → **SECTION**. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-04 | 0.3 | ✅ **Scope CONFIRMED (i): the member's OWN Pariwar.** ⭐ AC6's member-facing sentence is now WRITTEN, with the Niyamavali check reported honestly as **non-dispositive** (it binds nothing). ⚠⛔ **The "⛔ Zero open decisions" claim in this row was TRUE WHEN WRITTEN and is ⛔ FALSE at HEAD** — `-211` (2026-09-09) opened D2 and the 2026-09-10 validate pass opened D3. ⛔ Kept as the record, ⛔ not rewritten ([[feedback_record_unattested_no_backfill]]). | BigDev + Claude |
| 2026-09-04 | 0.2 | ✅ **D1 RULED (a)** (`-199`) — ⛔ recommendation (b) NOT taken. ⚠ AC5's audit is now routine-volume; Trap 3 is now definitely a REVERSAL. | BigDev + Claude |
| 2026-09-04 | 0.1 | Created from `-195` cl.3 (story **F**). ⛔ **D1 is OPEN and IS the story.** ⭐⭐ Findings: `-189` cl.3 ⛔ does **not** force the scope; the **literal** cl.3 reading is a LARGER exposure than the one just removed; `contribution-history` excludes bank data **deliberately**. ⚠⛔ **Its "43,000 pockets" figure was CORRECTED by `-199` on the same day** — illustrative, and the operative axis is per-Pariwar. ⛔ Row kept as the record. | BigDev + Claude |
