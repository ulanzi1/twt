---
baseline_commit: a2617869
---

<!--
⭐ BASELINE — `fix(11b.15): drop the dead MemberDriveListEntry import lint caught on remote CI`.
⭐ **RE-PINNED 2026-09-10 by this story's `validate` pass** — `66ef4dce` → `a2617869`, **106 commits**
of drift, every claim below RE-VERIFIED against this SHA. ⛔ The previous pin was a *reachability*
fix only and explicitly disclaimed re-verification; that debt is now DISCHARGED.
-->

# Story 11b.17: The Member's View of ONE Drive — Carrying What the Public Page No Longer Does `[SURFACE]`

Status: ready-for-dev

## ✅ PREFLIGHT — ✅ **ALL CLEAR. ⭐ THIS STORY IS STARTABLE.**

⭐⭐ **BOTH OPEN DECISIONS ARE RULED — `#decision-2026-09-10-212`, TRUSTEE-RATIFIED (DR + KB, 2026-09-10).**

| | Was open | ✅ Ruled |
|---|---|---|
| **D2** | Does the DETAIL render **लक्ष्य**, and for which stages? | ✅ **(B) — `live` drives ONLY** (cl.1) |
| **D3** | *"Shown to the logged-in member"* — the ID, or a pay button? | ✅ **(D) — the UPI ID goes on the PAYMENT screen, ⛔ not here** (cl.2) |

⭐ Answered from `trustee-panel-routing-note-2026-09-10-11b17-member-drive-detail-two-questions.md`
(**Q1**/**Q2**). ⚠ **Read `-212`'s Consequences 3-6 before Task 2** — cl.2 creates work **outside this
story** and ⛔ none of it is F's to absorb silently.

⛔ Task 1's `governance:` commit still binds ([[feedback_governance_commits_precede_implementation]]).

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
> text with *"⛔ no member identity behind it"* (`deferred-work.md:349`). ⇒ ⛔ do ⛔ not wait on `8-16`
> for it, and ⛔ do ⛔ not build it here.

> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST.** **Story F** of the split (`2026-09-04-195` cl.3) — ⚠ **one
> of SIX**, ⛔ not "the last of seven": `-208` cl.6 re-counted the set when G was withdrawn, and
> **F is `11b-17`**. ⇒ owes an `epics.md` **SECTION** (Task 0).
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
> records as **⛔ NOT taken** (`.decision-log.md:1497`). The Story statement must read as **(a)**, and
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
| ⚠ The **VPA plaintext has ⛔ never been on a member wire** — ⚠⛔ **but `-191` cl.1 (TRUSTEE-RATIFIED) says it should be *"shown to the logged-in member"*** | `nominee-accounts.ts:44`, `:61` (`vpaPresent: z.boolean()`) **vs** `.decision-log.md:2031-2036` | ⭐ read ⇒ **D3** |
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
`.decision-log.md:1550-1556`: the *"43,000"* is the **Panel's own ILLUSTRATIVE** number (`-190` cl.6),
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
Task 0 sections `epics.md`; flips nothing until the Preflight clears; lands in a `governance:` commit
before any code. **And** ⛔ it does ⛔ not proceed while **D2** or **D3** is open.

### AC1 — A member can open ONE drive from the list
A detail view, reached from story **E**'s fourth tab, for any drive **E** lists.
⚠⛔ **THE STATE TUPLE, AND ⛔ ITS OWN:** pool states `live` · `closed` · `settled` (⛔ never `spawned`,
`-196`). ⭐ Declare a **NEW named fragment for this surface** — `-196` Consequence 2 and
`public-read.ts:283-284` both forbid sharing or parameterising an existing tuple.
⚠⛔ **THE WIRE TOKEN IS `verified`, ⛔ NOT `settled`** — `MemberDriveStage = ['live','closed','verified']`
(`member-drive-list.ts:43`), mapped by the total `PUBLIC_STATUS_BY_POOL_STATE` (`public-read.ts:171-175`).

### AC2 — It shows at least everything the public drive page shows
For the same drive: the nominee's name, the drive facts, the stage (⭐ story **B**'s vocabulary), the
contributor count and the appeal outcome.
**And** a **comparison test** proves the superset.
⚠⛔ **AGAINST THE RIGHT MAP — ⛔ NOT E's.** This is the **detail**, so the floor is
**`SAHYOG_VIVRAN_FIELD_IDS`** *and* **`SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS`**
(`surface-fields.ts:646-661`, `:672-683`), which are **deliberately split**. ⛔ E's test reads
`SAHYOG_DRIVE_ROW_FIELD_IDS` — the **index** map; copying it proves nothing about this surface.
**And** ⚠ two fields are **⛔ NOT floor fields for archived rows**: `-207` cl.1 makes
`confirmedPercentage` `null` on the public wire for `closed`/`verified`. ⛔ Do ⛔ not assert it there.
**And** ⭐ **लक्ष्य per D2(B):** it renders on a `live` drive and ⛔ is ABSENT on `closed`/`settled`
— ⛔ never `null` — mirroring the list's own producer guard. ⚠ ⛔ This is ⛔ NOT a `member < public`
breach: the public index is **live-only** too (`-212` cl.1).
**And** ⚠ the public **name** gate is **PROVISIONING-INERT** (`handlers.ts:934-955`), so on a default
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
⚠⛔ **THE DIFFERING-HOLDER-NAME CASE IS ⛔ STILL UNRULED — and it is sharper than §8.4(ii) put it**
(`-213` cl.2): the **CODE asserts one nominee across both accounts** (`handlers.ts:537`) while the
**SCHEMA permits a different name per account** (`claim_nominee_bank_accounts.ts:61`) ⇒ ⛔ one of the
two is wrong and ⛔ nobody has said which. ⇒ ⭐ **SURFACE both names, ⛔ never pick one**, and ⛔ encode
⛔ no assumption either way. ⚠ Routed with **Task 0e**.
⚠⛔ **THE LABEL IS `Nominee Name`, ⛔ NEVER "Account holder"** — `-190` **cl.2**, re-affirmed `-206`
cl.2. ⭐ Reuse the TOKEN `nominee.label`, which `MemberDriveList.tsx:520` routes to this story by name
(*"stays a TOKEN so the label keeps ONE definition and story F reuses it rather than re-minting it"*).

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
  `envelope.ts:92-93` calls `kms.decryptDek(...)` then fires `auditHook('decryptDek', …)` on **every**
  `decryptTier1`, and ⛔ **there is ⛔ NO DEK cache** — each ciphertext embeds its own DEK.
  `createKmsAuditHook` (`audit/audit-log-sink.ts:196-205`) routes each one into the **same**
  global-chain writer.
- ⚠ This surface's encrypted fields (`claim_nominee_bank_accounts.ts:61-67`): `account_holder_name`,
  `account_number`, `ifsc` (+ optional `vpa`). ⭐ `bank_name` / `branch` are **Tier-3 plaintext** and
  cost nothing.
- ⇒ **per detail open: 1 (deceased name) + 3 × (accounts rendered) + AC5's own line.** ⚠⛔ **`-213`
  cl.1 rules BOTH accounts in ⇒ the operative figure is the ≈8 end, ⛔ not ≈5** — and ⛔ **seven of
  those eight are INVISIBLE**, emitted by the crypto layer, ⛔ not by AC5's code.

⚠⛔ **WHAT EACH ONE COSTS.** `writeAuditEntry` (`audit/write.ts:118-175`) holds
`pg_advisory_xact_lock(AUDIT_CHAIN_LOCK_KEY)` — ⛔ **ONE fixed key, deployment-wide, cross-tenant** —
across `BEGIN` → lock → tail read → `SELECT now()` → `INSERT` → `COMMIT`: **5-6 sequential round trips
per line**, committing its own transaction. ⭐ The tail read itself is cheap (`audit_log_entries_seq_uq`
serves `ORDER BY seq DESC LIMIT 1`); ⚠ **the cost is the SERIALIZATION, ⛔ not the query.**

⭐⭐ **AND IT IS ⛔ NOT NEW — story E ALREADY DOES THIS, SHIPPED.** Its list decrypts two names **per
row** under `DIRECTORY_DECRYPT_CONCURRENCY = 8` ⇒ routine browsing **already** takes the global lock,
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
`drive_href`; it is a public **field-id** mapped at `member-drive-list-field-floor.test.ts:67`.
**And** the affordance is a **REAL focusable control**: a real handler, an accessible name, and
`accessibilityRole` matching what it does.
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
> ⚠⛔ **DECISION TYPE: Author-committed (BigDev). ⛔ NOT Trustee-ratified** (`.decision-log.md:1486` —
> *"⛔ no 'by DR and KB' line"*). ⭐ It applies Trustee-ratified `-190` cl.3 **literally**. ⚠ That
> matters for **D3**: an author-committed entry ⛔ does ⛔ not silently override a standing prohibition
> recorded elsewhere.
>
> ⭐ **Two qualifiers, ⛔ both binding:** *"lifecycle"* ⇒ `live` · `closed` · `settled` only.
> *"member-surface access controls"* ⇒ ⭐ **the session scope IS the control** — ⭐ re-verified: member
> routes carry ⛔ **no `:pariwarId` parameter** (`member-pool/routes.ts`, `payment/routes.ts`); it comes
> from `request.requestContext.pariwarId` (`member-pool/handlers.ts:102-108`), and
> `claim_nominee_bank_accounts` runs RLS **FORCE**d (`migrations/0056:59-66`) under `SET LOCAL
> app.pariwar_id` (`db.ts:117`).
>
> ✅ **SCOPE CONFIRMED 2026-09-04: (i) — the member's OWN Pariwar.** ⛔ Cross-tenant (ii) is ⛔ NOT meant.
> ⇒ ⭐ **AC3's cross-Pariwar test is the ONLY remaining boundary**, and therefore the load-bearing one.
>
> ⚠⛔ **AND WHAT (a) DISCLOSES, STATED ONCE — ⛔ not re-litigated:** every authenticated member of a
> Pariwar can read the **full account number, IFSC and holder name of every family that Pariwar has
> ever supported** — on their phone, screenshottable, forwardable, persisting on devices.
> ⭐ **BigDev's call, and it is made.** ✅ The Panel disclosure note `-199` recommended was **WRITTEN**
> (Task 0c).

### ✅ D2 — **RULED (B) by the TRUSTEE PANEL, 2026-09-10** (`#decision-2026-09-10-212` cl.1)

> ⭐⭐ **THE RULING:** the detail page renders **"Expected" / लक्ष्य** on a **`live`** drive ⛔ ONLY —
> ⛔ not on `closed`, ⛔ not on `settled`. ⭐ **Trustee-ratified, DR + KB.**

⭐ **WHY IT LANDS THERE:** it mirrors the member LIST exactly (`-211` cl.1, whose producer guard already
enforces `status === 'live' ? true : driveTargetInr === undefined`) and `-204` cl.2's ruled slot
(*"right of the progress bar, on a LIVE row"*).

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

⚠⛔ **⛔ AND ⛔ NOT the payment-screen work itself** — ruled, ⛔ but ⛔ NOT F's (`-212` Consequence 3).

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
- [ ] ⚠⛔ **Task 0e — GIVE THE PAY-SCREEN WORK A NAMED HOME** (`-212` Consequence 3) — ⛔ NOT built
      here. ⭐ A story of its own, or an explicit `deferred-work.md` entry with a trigger, recorded
      **before this story ships**. ⛔ A ratified instruction must ⛔ not lapse twice.
      ⭐ **AND THE SAME PACKET CARRIES §8.4(ii)** (`-213` cl.2): the code asserts ONE nominee across
      both accounts; the schema permits TWO different names. ⚠ ⛔ One of them is wrong ⇒ ⛔ the Panel
      names which, ⛔ not a dev at a render site.
- [ ] **Task 1 — GOVERNANCE** (AC0) — ⭐ a **SECTION** in `epics.md`, ⛔ not an annotation (this is a
      new member-app surface with ⛔ no parent there — the `8-16` / `11b-15` precedent,
      `sprint-status.yaml:17545-17548`); flip the sprint row; record D2/D3 and **AC6's sentence**;
      ⛔ one `governance:` commit, ⛔ no code.
- [ ] **Task 2 — The read** (AC1, AC2, AC3) — a member-scoped per-drive read with its **OWN** named
      visible-state fragment.
      ⭐ **AND its OWN named `live`-only target fragment** (D2(B); `-212` Consequence 2) — ⛔ do ⛔ not
      share or parameterise the list's tuple. ⚠ On `closed`/`settled` the key is **ABSENT**, ⛔ not `null`. ⚠ Per Trap 3, ⛔ do ⛔ not widen `contribution-history`; ⭐ build the
      detail with its own justification, or **name the reversal**.
      ⚠⛔ **FORWARD-COMPAT — `deferred-work.md:8610-8626` NAMES THIS STORY TWICE:** `MemberDriveListEntry`
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
- [ ] **Task 4 — The audit** (AC5) — one line per coordinate read, keyed on the **canonical
      identifier**; ⭐ written as a **named departure** from the anonymous public precedent.
- [ ] **Task 5 — The screen** (AC1, AC4) — family 13 in full
      (`_bmad/custom/load-bearing-invariant-checklist.md:72`).
  - [ ] ⚠⛔ **THE `accessible` IDIOM IS TWO-TIER — ⛔ NOT "on every labelled container."**
        `MemberDriveList.tsx:233-240`: *"`accessible` USED TO SIT ON THE `<YStack>` ABOVE, which
        COLLAPSES THE WHOLE SUBTREE INTO ONE ELEMENT ⇒ the retry `<Button>`'s own `accessible={true}`,
        role, label and handler were ⛔ UNREACHABLE … ⛔ Do ⛔ not move `accessible` back onto the
        container."* ⇒ `accessible` on **leaf text / leaf-only groups**; every **control** carries
        `accessible={true}` + role + label and is a **SIBLING**, ⛔ never a descendant, of a labelled
        container. ⭐ Following the old wording would have made **AC8's control unreachable**.
  - [ ] ⚠ The **labels**: AC4 needs six and only four survive on a member surface. Story A
        (`45547a7b`) **DELETED** `label.account_number` / `label.ifsc` / `label.vpa` / `label.bank_name`
        / `label.branch` from `sahyog-vivran.json`, which now holds only `label.account_holder`.
        ⭐ Reuse `nominee.label` (routed here by name) and `contribution.json`'s
        `upi_intent.{account_holder,account_number,ifsc,bank}_label`. ⚠⛔ **There is ⛔ NO branch label
        and ⛔ NO UPI-ID label anywhere on a member surface** ⇒ `branch` needs one minted, and the
        UPI-ID label is moot under **D3(a)**. ⛔ Minting ratified copy is ⛔ not a render-site act.
  - [ ] ⚠⛔ **THE ERASURE BACKSTOP.** `anonymizeMember` overwrites `name_ciphertext` **in place** with
        an *encrypted* `[anonymized]` sentinel and RETAINS the row ⇒ the decrypt **SUCCEEDS** and the
        sentinel would render verbatim where a family name belongs (`member-pool/handlers.ts:497-524`).
        ⭐ ⛔ NOT a new rule — an **unswept** one. ⚠ The remedy **diverges by surface** (contributors
        omit the row; the drive list keeps the drive and drops the name) ⇒ ⛔ do ⛔ not copy mechanically.
  - [ ] ✅ **Both accounts, ⛔ no ordering implied** — ⭐ unconditional (`-213` cl.1). ⚠ The two
        holder names may differ and that is ⛔ UNRULED ⇒ **surface both, ⛔ pick neither**.
- [ ] **Task 5b — AC8: the drive-detail affordance** — render `pool_canonical_identifier`; make
      `publicToken` a **real focusable control**; ⭐ amend E's AC5 record and
      `drive-list-render.test.ts:272` **by name**. ⚠ There is ⛔ no detail route today — the tab is
      `apps/mobile/app/(tabs)/sahyog.tsx`.
- [ ] **Task 5c — AC9: the zero-day copy** — consume `zero_line.*` by name; variant on nullability;
      ⛔ do ⛔ not suppress the percentage; carry the a11y invariant; honour `-207` cl.2's ₹0 silence.
- [ ] **Task 6 — Tests** (AC2-AC5, AC7-AC9)
  - [ ] The `member ≥ public` **comparison** (AC2) — ⭐ against `SAHYOG_VIVRAN_FIELD_IDS` **and** the
        nominee map, ⛔ not E's index map.
  - [ ] ⛔⛔ A member of **ANOTHER Pariwar** gets the coordinate keys **ABSENT**, ⛔ not `null` (AC3) —
        ⭐ the load-bearing guard.
  - [ ] A **fence test** for AC7 — ⭐ including that ⛔ **no `vpa` key** reaches this wire (D3(D)), and
        that **लक्ष्य is ABSENT on `closed`/`settled`** (D2(B)).
  - [ ] Another Pariwar's drive is unreachable (family 12).
  - [ ] Every coordinate read writes exactly one audit line (AC5). ⚠⛔ **The precedent's write is
        FIRE-AND-FORGET** (`public-pages/handlers.ts:867`) — ⛔ a naive assertion is a flake trap
        unless the test drains it.
  - [ ] ⭐ **Size the audit write volume** under routine browsing before shipping (AC5) — ⚠⛔ **the
        unit is ≈5-8 global-lock acquisitions per detail open, ⛔ not 1** (see AC5). ⭐ Measure: the
        lines actually emitted for one open (assert the COUNT, which also pins the decrypt count), and
        the wall-clock cost of the serialized chain under concurrent opens. ⚠ Compare against story
        **E**'s already-shipped per-row decrypts — ⭐ the baseline is ⛔ not zero.
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

- **An empty/whitespace `bank_name` 500s the whole Sahyog Vivran page** (`deferred-work.md:8307-8320`):
  `sahyog-vivran-read.ts:547` passes `bankName` through raw while `branch` gets `.trim() || null`, and
  the contract requires `z.string().min(1)`. ⭐ Currently unreachable (fixture-only IFSC adapter). ⚠ AC4
  renders **both** ⇒ if Task 2 reuses that projection it inherits a **fail-hard on a fail-soft surface**.
- **The identifier-enumeration bound over four decrypted Tier-1 fields is RULED BLOCKING** (BigDev
  2026-09-03) and still open (`deferred-work.md:8180-8200`). ⚠ This story puts the same fields behind
  an authenticated route and plans **no** rate/enumeration bound.
- **The persisted query cache is unscoped and ⛔ never purged on sign-out** (`deferred-work.md:8590+`):
  keys carry ⛔ no `memberId`/`pariwarId`, MMKV `gcTime` **7 d**, and `grep` for `queryClient.clear` /
  `removeQueries` / `resetQueries` across `apps/mobile` returns **ZERO**. ⚠⛔ Its stated trigger — *"any
  DPDPA review of at-rest cached personal data on the handset"* — **fires here**: this story would put
  **unmasked payment coordinates** at rest for 7 days, surviving sign-out onto a different member of a
  different Pariwar. ⭐ That defeats D1's *"the session scope IS the control"* **at rest**, though ⛔ not
  on the wire. ⇒ ⛔ **record the trigger as fired**; the fix is one repo-wide change, ⛔ not a
  per-surface patch.

### ⚠ Three names, three subjects — ⛔ do ⛔ not cross them

- `resolvePublicMemberName` (`kyc/public-name.ts:73`) — the **LIVING member**, public directory,
  fails **closed** (`''` ⇒ omit the row).
- `resolveMemberFacingDeceasedName` (`notifications/pool-identity.ts:141`) — the **DECEASED member**,
  member surfaces. ⚠⛔ *"⛔ NEVER `resolvePublicMemberName` on this path"* (`member-drive-list.ts:52-56`).
- The **account-holder** value — claim-scoped free text routing through **neither**. ⚠⛔ AC2 and D1 call
  it *"the nominee's name"*; `deferred-work.md:171-175` rules that **the SCHEMA is the authority** and
  the schema **denies** the identity. ⇒ ⛔ do ⛔ not assert it names the nominee.

### References

- `.decision-log.md#decision-2026-09-04-190` cl.1-cl.4 · `-189` cl.3 · `-195` cl.1, cl.3 · `-196`
  (+ Consequence 2) · `-199` · `-200` cl.4 · `-205` cl.9 · `-206` cl.2, cl.4 · `-207` cl.1, cl.2 ·
  `-208` cl.4, cl.6 · `-209` cl.2, cl.3 · **`-211` cl.1, cl.2, Consequence 2**
- `packages/contracts/src/contributions/nominee-accounts.ts:18-20`, `:59` — the 9.9 donor path; the VPA fence
- `packages/contracts/src/contributions/contribution-history.ts:24-25` — the deliberate exclusion
- `packages/contracts/src/contributions/member-drive-list.ts:43`, `:121`, `:131`, `:187` — stage enum; the two unrendered ids; लक्ष्य
- `apps/api/src/modules/payment/handlers.ts:257-262`, `:289-292` — the VPA refusal; the live-pool gate
- `apps/api/src/modules/member-pool/handlers.ts:102-108`, `:497-524`, `:539-547` — session scope; the sentinel; the one-decrypt rule
- `apps/api/src/modules/public-pages/handlers.ts:840-905` — the audit posture ⚠ **departed from**, ⛔ not followed
- `packages/domain/src/audit/write.ts:62`, `:128` — the global advisory lock
- `apps/public/src/lib/surface-fields.ts:646-661`, `:672-683` — AC2's two floor maps
- `apps/mobile/components/drive-list/MemberDriveList.tsx:233-240`, `:413-416`, `:520` — the a11y idiom; the row fence; `nominee.label`
- `apps/mobile/tests/unit/drive-list-render.test.ts:272` — the test AC8 must amend
- `packages/i18n/locales/{en,hi}/sahyog-shared.json:14-15` — `zero_line.*`
- ⭐ `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-10-11b17-member-drive-detail-two-questions.md`
  — **D2 = Q1**, **D3 = Q2**. ⚠ Read the **body**, ⛔ not the header ([[feedback_story_summary_can_lag_its_routing_note]]).
- ⭐ `.decision-log.md#decision-2026-09-04-191` **cl.1** — ⚠⛔ the **ratified** text D3 turns on
- ⚠ `deferred-work.md:341-347` — item (e); ⛔ its *"nobody ruled on"* is **inaccurate**, see D3

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-10 | 1.0 | ✅⭐ **THE LAST CONDITIONAL IN AC4 IS CLOSED — `#decision-2026-09-10-213` (author-committed).** ⭐⭐ **BOTH ACCOUNTS RENDER, and it is ⛔ NOT the "reversal" the validate pass called it:** the list's one-decrypt rule governs the **HOLDER NAME** (*"the SAME nominee"* twice ⇒ a second decrypt buys nothing), while this surface renders **`account_number` + `ifsc`, which DIFFER per account** — and the money can have gone to **both**, the two being *"EQUAL destinations, the donor's choice"*. ⇒ the list's and pay screen's behaviour **STANDS UNTOUCHED**, and Task 5's *"only if the reversal is named"* sub-item is discharged **by showing there is none**. ⚠⛔ **The differing-holder-name case is ⛔ STILL UNRULED and is SHARPER than §8.4(ii) stated:** the **code asserts one nominee** across both accounts while the **schema permits two names** ⇒ one is wrong and nobody has said which ⇒ **routed with Task 0e**; AC4 surfaces both and picks neither. ⚠ AC5's sizing pins to the **≈8** end now both accounts are in. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-10 | 0.9 | ✅⭐⭐ **BOTH DECISIONS RULED BY THE TRUSTEE PANEL — `#decision-2026-09-10-212` (DR + KB). PREFLIGHT DISCHARGED; ⭐ THE STORY IS STARTABLE.** **D2 → (B):** लक्ष्य renders on **`live` drives ONLY**, mirroring the list and `-204` cl.2's slot; ⭐ `-189` cl.3 holds because the public index is live-only too, so (B) puts the detail **level with** the list, ⛔ not below it. **D3 → (D):** the UPI ID is ⛔ **NOT** on this page — it is **ADDED to the PAYMENT screen**. ⇒ AC4 renders **five** coordinates; AC2 gains the live-only target rule; AC7's target exclusion is replaced by the ruling. ⚠⛔ **Task 0e ADDED — the pay-screen work needs a NAMED HOME and is ⛔ NOT this story's** (`-212` Consequence 3), carrying three things with it: the `.strict()` additive-field trigger now FIRES, a UPI-ID label must be MINTED (story A deleted `label.vpa`), and the pay screen's *"Account holder"* label sits against `-190` cl.2 — ⛔ unresolved, ⛔ not to be fixed by side effect. ⭐ cl.2 **SUPERSEDES** `deferred-work.md` item (e), whose ground was **false when written**. ⛔ **NO CODE.** | Trustee Panel + BigDev |
| 2026-09-10 | 0.8 | ⭐⭐ **THREE PREMISES TRACED TO CODE AT BigDev's DIRECTION — ⛔ none had been.** (1) ⭐ **The `super_admin` reveal switch is BUILT AND OPERABLE** — table + CHECK, key, grant (test-asserted), module MOUNTED, route, write, admin page, form guard. ⇒ `-211` cl.3 holds in the STRONG sense: off because ⛔ nobody has switched it, ⛔ not because nobody can. (2) ⭐ **The UPI intent path is real but reaches ⛔ ONE drive** — `resolveMemberLivePool` needs active + `live` cycle + ASSIGNED, and returns the soonest-closing pool ⇒ on F's page there is ⛔ no pay path for any other drive, so D3's narrow reading is **EMPTY here**; ⭐ a new **option (D)** (the VPA belongs on the PAYMENT surface) was added to the Panel note. (3) ⚠⛔ **AC5's SIZING PREMISE WAS WRONG IN THE STORY'S FAVOUR** — `-199` says *"a write on every detail open"* (singular); it is **one line per ENCRYPTED FIELD DECRYPTED** (`envelope.ts:92-93`, ⛔ no DEK cache) ⇒ **≈5-8 global-lock acquisitions per open, seven of them INVISIBLE** (emitted by the crypto layer). ⭐ Each holds ONE deployment-wide key across 5-6 sequential round trips. ⭐⭐ **⛔ NOT NEW — story E already does it, shipped** (per-row decrypts at concurrency 8) ⇒ a **PRE-EXISTING condition F AMPLIFIES**; ⭐ F is the first surface where a Tier-1 READ is the ordinary path. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-10 | 0.7 | ⭐⭐ **BOTH OPEN DECISIONS ROUTED TO THE PANEL** — `trustee-panel-routing-note-2026-09-10-11b17-member-drive-detail-two-questions.md` (Q1 = D2, Q2 = D3). ⚠⛔⛔ **AND D3's FRAMING IN v0.6 WAS ⛔ WRONG AND IS CORRECTED HERE.** v0.6 read D3 as *"a standing prohibition vs an author-committed enumeration"*, with AC4 held to (a) as the safe default. ⛔ That inverted the authority: **`-191` cl.1 is TRUSTEE-RATIFIED** (DR + KB) and rules the VPA *"a MEMBER field … **shown to the logged-in member** … carried on the member surface as a payment coordinate"*; ⛔ only cl.4 was ever superseded. ⇒ ⭐ the *"prohibition"* is **ours** — a narrow reading taken in `deferred-work.md` item (e) and ⛔ never put back to the Panel — and its phrase *"a NEW Tier-1 exposure ⛔ nobody ruled on"* is **⛔ inaccurate**. ⭐ AC4's five-field render is now stated as a **HOLD, ⛔ not a finding that (a) won**. ⭐ D2 also gains its **second axis**: the list carries लक्ष्य on **`live` rows ONLY** (`member-drive-list.ts:236-244`, `-204` cl.2's *"on a LIVE row"*), while the detail covers three stages ⇒ the finished-drive case is unruled. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-10 | 0.6 | ⛔⛔ **RE-VALIDATED (`bmad-create-story validate`, three independent verifiers) — 32 FINDINGS APPLIED. ⛔ ZERO ROWS MOVE.** ⭐ Baseline **RE-PINNED** `66ef4dce` → `a2617869` (**106** commits of drift; the 2026-09-09 re-pin fixed reachability only and disclaimed re-verification — that debt is now DISCHARGED). ⛔⛔ **TWO DECISIONS OPENED AND A PREFLIGHT STOP ADDED: D2** (`-211` Consequence 2 hands the लक्ष्य question to F **by name**; `-211` cl.1 RETIRED *"no target"*, struck at both sites) and **D3** (AC4's UPI ID contradicts a thrice-stated prohibition; `-199` is **author-committed**, ⛔ not ratified, and supersession must be NAMED). ⭐ **AC8 + AC9 WRITTEN** — E's two routed obligations lived in prose only, ⛔ no AC, ⛔ no Task. ⭐ **AC5 RE-GROUNDED** as a named DEPARTURE: the cited precedent writes `actorId: null` and says *"⛔ Do not widen this to log every request."* ⭐ **AC2 re-pointed** to `SAHYOG_VIVRAN_FIELD_IDS` + the nominee map (E's is the **index** map) with `-207` cl.1 and the inert public name gate carved out. ⭐ **Task 5's a11y instruction INVERTED** — *"`accessible` on every labelled container"* is the defect E's third pass fixed and would have made AC8's control unreachable. ⚠ **AC4 narrowed** (VPA ⇒ D3; the second decrypt named as a reversal; §8.4(ii) surfaced; `Nominee Name` per `-190` cl.2) and its **missing labels** recorded (A deleted five; ⛔ no branch or UPI-ID label exists). ⭐ Added: the `.strict()` blank-out naming F twice, the MMKV at-rest trigger, the `ANONYMIZED_SENTINEL` backstop, `-200` cl.4's untouchable entry, the three-subject resolver split, `clampLimit`, and the **⛔ no-RN-mount-harness** correction. ⚠ Swept: *"43,000"* (7 sites) — `-199` itself corrected it to **per-Pariwar, no ratified figure**; the stale blocked-on chain (**story is UNBLOCKED**); Task 0c (**discharged**); *"last of seven"* → **six**; `-165` → `-205` cl.9; `:804-830` → `:840-905`; Task 0 annotation → **SECTION**. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-04 | 0.3 | ✅ **Scope CONFIRMED (i): the member's OWN Pariwar.** ⭐ AC6's member-facing sentence is now WRITTEN, with the Niyamavali check reported honestly as **non-dispositive** (it binds nothing). ⚠⛔ **The "⛔ Zero open decisions" claim in this row was TRUE WHEN WRITTEN and is ⛔ FALSE at HEAD** — `-211` (2026-09-09) opened D2 and the 2026-09-10 validate pass opened D3. ⛔ Kept as the record, ⛔ not rewritten ([[feedback_record_unattested_no_backfill]]). | BigDev + Claude |
| 2026-09-04 | 0.2 | ✅ **D1 RULED (a)** (`-199`) — ⛔ recommendation (b) NOT taken. ⚠ AC5's audit is now routine-volume; Trap 3 is now definitely a REVERSAL. | BigDev + Claude |
| 2026-09-04 | 0.1 | Created from `-195` cl.3 (story **F**). ⛔ **D1 is OPEN and IS the story.** ⭐⭐ Findings: `-189` cl.3 ⛔ does **not** force the scope; the **literal** cl.3 reading is a LARGER exposure than the one just removed; `contribution-history` excludes bank data **deliberately**. ⚠⛔ **Its "43,000 pockets" figure was CORRECTED by `-199` on the same day** — illustrative, and the operative axis is per-Pariwar. ⛔ Row kept as the record. | BigDev + Claude |
