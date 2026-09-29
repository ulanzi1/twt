---
baseline_commit: c136b03c
---

<!--
BASELINE — `c136b03c` on `main` (`governance(6.19): place -257 (N1) on Story 6.19 …`). ⭐ Every claim under *What already EXISTS*
was RE-VERIFIED against this SHA on 2026-09-27 by three read-only passes (the return/closure/appeal code; the dispatch/scheduler/SMS
substrate; filing, PII, keys and 6.21a/b). 6.18, 6.20, 6.21a and 6.21b are all `done` and merged — ⛔ nothing here is against an
uncommitted tree any more. Before Task 1, run `git diff --name-only c136b03c..HEAD -- packages apps scripts` and re-read anything
it lists that this file cites.
⚠ 2026-09-29: 6.19a has since SHIPPED (78 code files moved by `f06ee41f`). For 6.19b's scope, 6.19b v2.1's *§ What 6.19a shipped, and
what moved* (re-derived at `f06ee41f`) wins over *What already EXISTS* below; 6.19c must re-derive its own scope the same way.

⭐ v0.9 IS A RE-DERIVATION, ⛔ NOT AN APPEND. The Panel answered every question this story put (`-250` … `-257`); the ACs, the
author decisions and the Tasks are re-derived from those answers and the old BLOCKED tags are gone. v0.8 (the question list as put, the
five appended status blocks) is preserved in git at `c136b03c` — the questions themselves live in the seven routing notes, which are
the record ([[feedback_supersede_never_reinterpret]] governs RULINGS; this file is a spec and is rewritten when its inputs change).

GLYPH REGISTER: `⛔` sits ONLY on a negation word (NOT / no / never / don't); `⭐` = key fact or action; `⚠` = hazard.
ADDRESSING RULE: no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first — every
prepend rots every number). Cite decision ids + clauses, item headings and row keys. `file:NNN` is used ONLY for code, as of
`c136b03c` — the function names are the stable handle.
LETTERS: `D1`…`D29` are 6.19's own author decisions (✅ COMMITTED by `-265`, 2026-09-28; ⭐ `D30`…`D34` and the supersession of D2 and of
D14's letter-writer clause by `-266`, 2026-09-29. First text: ⏳ PROPOSED — one author-commit in 6.19a's Task 0; D5, D14, D15, D16 revised
2026-09-28 by 6.19a's validate pass; D29 superseded by `-260` G1 before it was ever committed). The Panel's questions keep the
letters they were asked under (K L M N O P Q R T U; F1–F8 of `6-19-follow-ups`; N1 of `6-20-confirm-what-we-recorded`). Two NEW
questions found by this pass are `V` and `W`. Other stories' letters are qualified (`6.18 D1`, `6.16 D-F`).
-->

# Story 6.19 — SHARED SPEC for 6.19a · 6.19b · 6.19c · 6.19d: The Correction-Return Reminders, the Posted Letter, the Closure and the Super Admin's Review `[SURFACE]`

Status: split — ⛔ this file has no sprint row; it is the shared spec of four stories (below)

> ⭐⭐ **SPLIT 2026-09-27 (BigDev: *"split it three ways"* — D13).** The build now lives in four story files, each of which declares this file
> **part of itself** — read it end to end before any of them:
>
> | Story | Row / file | Scope | Status |
> |---|---|---|---|
> | **6.19a** | `6-19a-claim-contact-capture-at-filing` | AC0 (governance for the WHOLE set), AC1, AC13 | ✅ `done` (merged, `f06ee41f`) |
> | **6.19b** | `6-19b-correction-reminders-and-posted-letters` | AC2–AC5, AC16 | `ready-for-dev` — v2.4 on `-266` … `-269`, re-pinned `f06ee41f` |
> | **6.19c** | `6-19c-correction-closure-super-admin-review-and-refile` | AC6, AC7, AC14, AC15, AC17 | `ready-for-dev` — start only after 6.19b is `done` |
> | **6.19d** | `6-19d-replacement-certificate-reminder` | AC12 (CC1) | `backlog` — fenced on its routing note |
>
> The AC numbers are **kept** in the slices, so every decision and note that cites "6.19 AC n" still resolves; AC8, AC9 and AC11 are restated per
> slice (AC8a/b/c …). The row `6-19-correction-return-reminders-and-closure` is **retired** (ledger `2026-09-27j`); this file keeps its path
> because `-250` … `-257` and seven routing notes cite it.

> **Not in `epics.md`'s story list yet** (6.19a's Task 0 adds 6.19a–d). Commissioned by the Trustee Panel (Dhiraj Rahul + Kalpana Bharti) through the
> follow-ups to Story 6.18's code-review decision D2 — `-229` → `-232` (2026-09-20), answered in full by `-250` → `-257` (2026-09-27) —
> and by BigDev's call that the build is **its own story** (*"Create another story"*, `-230`). Like 6.17, 6.18, 6.20 and 6.21a/b it needs
> a `> ⚠ Minted by…` header in `epics.md`; the Epic 6 retrospective stays `done`.
>
> ⭐ **6.18 must not go live without 6.19** — until this ships, a claim the Pariwar Admin sent back waits forever if the family never
> answers. ⭐ **And 6.19's family-facing reminders must not go live before counsel** confirms the basis for the filer's agreement on
> others' behalf (**M**) and the privacy policy states the purpose (**S**) — `-253` consequence 3, `-255` F7. ⛔ Neither is a build
> blocker ([[project_not_in_production_merge_is_not_golive]]).
>
> ⚠ **Size.** This is three stories' worth of work in one file (filing capture · the reminder machine and letters · the closure, the
> Super Admin's review and the re-file guard). ✅ **Split** 2026-09-27 (D13) — see the table at the top.

## The rulings this story builds — verbatim keys, and what is still OUR reading

⚠ The verbatim text is in `.decision-log.md`; each row here is compact. A reading marked **ours** is ⛔ not ratified.

| Decision | The Panel said (compact) | What it fixes for this story |
|---|---|---|
| `-229` | Refusal only after a **90-day** wait, with the system **sending and recording** reminders (daily, then twice a week for a month, then weekly). | The period and the record. |
| `-230` | Reminders to **both** the District Admin and the family, a **non-name reference**, the **standard channel**; the clock starts the **day the claim was sent back**, a **second return restarts it**; a **dead number** → the District Admin **posts a letter** (tracking number; delivery date + screenshot within 14 days of sending); **one more letter** if no action in 30 days; reminders run **until corrected or 90 days**; a **first refusal is appealable, the second is not**. ⚠ Cl.3's last sentence ("auto closure") is **superseded by `-231`**. | Recipients, anchor, letters, the second refusal. |
| `-231` | ⭐ **⛔ No automatic closure** — the system **reminds** the District Admin, the **District Admin requests**, the **Pariwar Admin approves**; the closure is the **second refusal** (⛔ not appealable); dead = **"channel reports invalid"**; address **mandatory at filing**; the letter chase runs **7 → 12 days, then escalates to the Pariwar Admin**; the second letter is due **30 days after delivery**; **calendar days**; the District Admin's regular reminders are **replaced by ONE reminder 30 days after delivery**. | The closure is two human acts. |
| `-232` | Address (+ claimant **name and mobile** when the claimant is not the nominee) captured **at filing**, in the app or by the helpline; the Pariwar Admin **may decline** a closure **with a note**, which **escalates to the Super Admin**; the day-90 closure reminder runs **daily for 7 days, then escalates**; J confirms `-231` F. *"code is not in production"* ⇒ ⛔ no backfill. | Filing capture; the decline branch. |
| `-250` | #1 **CHANGED**: dead-number reminders stop when a **letter's delivery is recorded**. #2 **CHANGED**: the District Admin's letter chase counts from the **day the phone was found dead**. #3 the **day-14 overdue flag** (shown, nothing else). #4 letters recordable **after day 90**, no more reminders. #5 the **exact days** — 1–7; 10, 14, 17, 21, 24, 28, 31, 35; 42, 49, 56, 63, 70, 77, 84; stop at 90; **10:00**. #6 day-90 escalation → **the Pariwar Admin**. | ⭐ Every schedule number is now **the Panel's**, ⛔ no longer ours. |
| `-251` | **K = option C**: on a declined closure the **Super Admin decides the whole claim** — close, refuse for another reason, or **approve despite the name problem**. ⚠ Recorded as a **NARROWING** of `-226` cl.1/cl.6 and `-227` cl.2, **confined to that one case**; `-226` cl.5's highlight still reaches all three roles. | The Super Admin's three decisions. |
| `-252` | **O/R = option A**: "reached" = ≥ 1 reminder **accepted** by the network (or shown delivered, where a report exists) **or** a letter with a **recorded delivery date**, **for each person**; a family **no channel can reach** is offered the **letter route**; proven delivery (B) = a possible future version, ⛔ no row. | The closure precondition (STRICT, now the Panel's). |
| `-253` | **M = option C**: the filer's **agreement to be contacted** is asked **at filing**; a **new question**: the **claimant's relationship to the nominee**, **family relations only**; reminders go to **both people**; **one address per declared nominee**, the **claimant's details once**. ⚠ The legal basis (M) stays with **counsel**. | Two new filing fields. |
| `-254` | **Q = option C**: a claim closed for silence may be **filed again only through a person** — the District Admin or the helpline **confirms, with a note**. | A guarded re-file. |
| `-255` | **F2** a Super Admin **refusal** is **appealable once** (a closure never); **F3** every Super Admin decision carries a **note and a reason**; **F4** an approval despite the name problem needs **nothing more** (money may go to the mismatched account — chosen knowingly); **F5** the letter goes to **the person whose phone is dead**, at their own address; **F6** **each declared nominee** is reminded; ⭐ **F7** the plan is **WIDENED — SMS reminders** to people the agreement covers (a new **DLT template**, a **per-message cost**; PRD §4.10 + architecture §3.4 owe an **annotation**); **F8** the claimant-to-nominee list = **nineteen** family relations, ⛔ no `other`. | Recipients, channel, Super Admin rules. |
| `-256` | **F1 = option E**: the Super Admin may hold an escalated claim **under review** (with a note; ⛔ nothing paid, closed or refused meanwhile), **⛔ no hard deadline, a reminder every 30 days**, and ⭐ **may DIRECT the Pariwar Admin and the District Admin** — a **new power**, recorded against the named admin, who is reminded and **records what they did**. The review ends only with a decision + note. Restarting the family's reminders happens **only as a direction** (ours). | The review hold and the direction record. |
| `-257` | **Supersedes `-237` cl.1**: the **nominee** relationship list gains brother-in-law, son-in-law, mother-in-law, father-in-law, grandparent — **twenty**. `other` still forecloses correction (`-237` cl.2). | ⭐ F8's nineteen = these twenty **minus `other`** (one source). |
| `-258` | **V = option B**: every return **says who must act** — the Pariwar Admin marks *family* or *staff*, the District Admin may change it with a note; ⭐ **only while the family must act** is the family reminded, and ⭐ **only then can the claim ever be closed "for no response"**; staff cases chase **staff** (day 12 → Pariwar Admin, day 90 → **Super Admin**, who may review and direct); the District Admin may record **"no correction needed"** (note + fresh name check) and the Pariwar Admin approves or keeps it sent back; a switch to *family* starts the family's 90 days **that day**; the staff-case app line *"Your claim is still open — we are checking the bank details"*. ⚠ **Narrows** `-227` cl.2, `-230` cl.1–2, `-231` A/B; **widens** `-256` cl.3. | The mark, and every family reminder and closure conditioned on it (6.19b, 6.19c). |
| `-259` | **CC1 = option B, amended**: the certificate reminder runs the correction schedule to day 90, then monthly — ⭐ **stopping after 180 days**; **one** posted letter for a dead phone; SMS to the agreed people (**F7 extended**); a never-sent certificate is chased once the claim is being checked. ⛔ The claim still never closes. | 6.19d's schedule — unfenced. |
| `-260` | **G1–G6**: the Super Admin may **decide** a staff case at day 90 — approve **only with a fresh passing name check**, or refuse (appealable once), ⛔ never close (**widens** `-258`/`-256`); the Pariwar Admin says who must act when keeping a "no correction needed" claim (**widens** `-258` cl.1); ⛔ **no text** after a Super Admin refusal or approval; the first reminder stays the next morning; a second rejected certificate restarts the 180 days; monthly = days 120, 150, 180. | ⭐ Every Panel question on the set is answered. |

## Story

As the **District Admin** (with the **Pariwar Admin** and, for a disputed case, the **Super Admin** above me), I want a claim sent back
for a bank-name correction to be **chased on the Panel's fixed, recorded schedule** — reminders to me and, by text message, to each
person the family agreed may be contacted; a posted letter to anyone whose phone is dead or unreachable; and, after 90 days, a closure
**I request and the Pariwar Admin decides** (or, if the Pariwar Admin declines, the Super Admin reviews and decides) — so that a family is
**never refused for silence without having been reached**, a claim **never waits forever**, and every step is **on the record**.

## ⭐ THE INVARIANTS — read these first; every AC below serves one of them

1. **⛔ The system NEVER closes, refuses or approves a claim.** It reminds and escalates; a **human requests** a closure (District
   Admin) and a **human decides** it (Pariwar Admin; on a decline, the Super Admin). ⛔ No job, sweep or timer may call any decision
   writer. (`-231` B; AR-63: time-as-actor is non-punitive only.)
2. **⛔ A corrected claim is never closed as "no response".** The closure request, the Pariwar Admin's approval **and** the Super
   Admin's close each re-check `isReturnedClaimResubmitted` **under the trustee lock** (AC6). ⚠ *(`-268` §3: "corrected" = `isReturnedClaimResubmitted` **or** "the family's part is done" — the
   accounts rewritten after the return with ⛔ no later `does_not_match` — so a family awaiting a staff check is ⛔ never closed. `-269` §1:
   the LATEST check since the latest rewrite decides.)*
3. **⛔ Never write `delivered` for an accepted send.** A reminder record says what is KNOWN; `delivered` only when a real signal
   arrived (T1). `accepted` **counts as reached** — the Panel's own answer (`-252` cl.1), ⛔ not our shortcut.
4. **⛔ No name, ever, in a family message** — a non-name reference only (T6).
5. **⛔ `voteOnFrozenClaim` and `assertClaimApprovable` are untouched.** Every new decision (closure, Super Admin close / refuse /
   approve) goes through a **NEW writer** (T2).
6. **Appealability is exact:** an ordinary refusal keeps 6.16's one appeal; **a closure is ⛔ never appealable**; **a Super Admin
   refusal is appealable once** unless the claim already had its one appeal (`-255` F2, 6.16 D-F).
7. **⭐ The `-251` narrowing is CONFINED and PARTIAL.** Only a Super Admin, only on a claim **escalated after a declined closure**, and it
   waives **only the name-check conjunct** — ⛔ never the accepted death certificate (6.21a), the two accounts or the effective nominee
   determination (6.20). Everywhere else `-226` cl.1/cl.6 and `-227` cl.2 stand.
8. **⭐ A re-file after a closure for silence needs a person's recorded confirmation** (`-254`) — keyed on the **closure record**, ⛔ never
   on `claim.denied_no_appeal` (a stage-3 uphold emits that too, and its re-file stays free).
9. **⛔ New claimant PII is Tier-1, gated, audited, never logged — and has no erasure path yet.** Record the gap; do ⛔ not fix it (T8).
10. **⛔ The certificate wait is never closed** (CC1 protection 2): the day-90 closure keys on a **correction return**, ⛔ never on a
    certificate wait (AC12).
11. **⛔ A family is never chased or closed for a silence that was never theirs** (`-258`): only a return whose **latest mark is "the family
    must act"** reminds the family or can be closed "for no response"; a staff case chases **staff**. (AC16, AC17)

## 📜 Policy meaning (AI-10-1)

⭐ This story introduces **five predicates that gate a member's claim** (the benefit the member's family is owed):
1. a sent-back claim may be closed only after **90 calendar days**, only if **each person was reached**, and only through a **human
   request and a human approval**;
2. a claim **closed for no response cannot be appealed**;
3. a **Super Admin refusal can be appealed once** (unless the appeal was already used);
4. on a claim escalated after a declined closure, **a Super Admin may approve payment even though the bank account is ⛔ not in the
   nominee's name**;
5. a death whose claim was closed for no response can be **filed again only with a District Admin's or the helpline's confirmation**;
6. ⭐ (`-258`) a claim can be closed for no response **only if the return says the family must act** — and a return found to need **no
   correction** can be approved **without** one, once the District Admin records it (with a fresh name check) and the Pariwar Admin agrees.

**The sentence, in the family's terms (ours, for the Panel to correct):** *"If your bank details need correcting we will remind you
regularly by text message, and if we cannot reach a person by phone we will write to them by post. If after 90 days we have still not
heard from you, the District Admin may ask for your claim to be closed and the Pariwar Admin decides; if the Pariwar Admin disagrees,
the Super Admin looks into it and decides — and may pay to the account you gave even though the name does not match. A claim closed
for no response cannot be appealed, but you can file again through the helpline or the District Admin."*

**Checked against the Niyamavali? ⛔ NO — and why.** `docs/legal/` is **absent from the public repo by design**
([[project_legal_corpus_private_repo_split]]); the earlier planning pass found **nothing** on non-response, closure or timelines in the
design reference; and the Niyamavali is an agent-drafted design reference, **⛔ not ratified and never a blocker**
([[feedback_niyamavali_rulebook_not_spec]]). The sentence was checked against `-226` → `-232` and `-250` → `-257` instead — each clause
of it traces to a ruling in the table above. ⚠ It **does tension with the PRD**: FR-43A makes internal appeal the *primary* grievance
path and only Stage 3 non-appealable, and 6.16 D-G requires counsel's procedural-fairness review before go-live — the rulings amend
neither ⇒ **S** (a go-live gate, ⛔ not a build blocker).

## ⚖️ Where every question stands (re-derived 2026-09-27)

| Q | Answer | Decision | Build status |
|---|---|---|---|
| **K** (+ F1–F4) | The Super Admin decides the whole claim (close / refuse / approve despite the name); a refusal is appealable once; every decision has a note + reason; an approval needs nothing more; **a review hold with directions**, ⛔ no deadline, a 30-day reminder. | `-251`, `-255` F2–F4, `-256` | ✅ **Buildable** — AC6, AC14 |
| **L** (+ F5) | Reminders to **both**; the letter to **the person whose phone is dead**. | `-253` cl.3, `-255` F5 | ✅ AC3, AC5 |
| **M** | Agreement asked **at filing** (mechanism). ⚠ The legal basis is **counsel's**. | `-253` cl.1 | ✅ build · ⚠ **go-live gated** |
| **N** | Day-90 escalation → the Pariwar Admin. | `-250` #6 | ✅ AC6 |
| **O**, **R** | `accepted` counts; STRICT reached-per-person; no working route → the letter route. | `-252` | ✅ AC3, AC6 |
| **P** (+ F7) | **SMS** to those the agreement covers, outside the app. | `-253`, `-255` F7 | ✅ build · ⚠ **go-live gated** (M, S); ⚠ a DLT template has an external lead time |
| **Q** | Re-file only through a person, with a note. | `-254` | ✅ AC15 |
| **T** | #1/#2 **reversed** (stop on delivery; chase from found-dead); #3/#4 confirmed. | `-250` #1–#4 | ✅ AC3–AC5 |
| **U** (+ F6) | One address per declared nominee; each nominee reminded; the claimant once. | `-253` cl.4, `-255` F6 | ✅ AC1, AC3 |
| **D3** | The days and 10:00 — **the Panel's**. | `-250` #5 | ✅ AC2 |
| **N1** | Nominee list → twenty. | `-257` | ✅ AC13 |
| **S** | The privacy policy's purpose; FR-43A. | — (counsel, Story 0.13) | ⚠ **go-live gate**, ⛔ never a Panel note |
| **CC1 protection 3** | ✅ **RULED** — option B amended: correction schedule to day 90, then monthly, **stop after 180 days**; one letter; SMS extended; a never-sent certificate chased once checking starts. | `-259` | ✅ **6.19d unfenced** — its ACs owe a `bmad-create-story` pass (stays `backlog` until then) |
| **V** (NEW, widened) | ✅ **RULED — option B**: the return says who must act; only a family-must-act return reminds the family or can be closed; staff cases chase staff (→ Super Admin at day 90); "no correction needed" + the Pariwar Admin's approval; a switch to family restarts the family's 90 days. | `-258` | ✅ Buildable — **AC16** (6.19b), **AC17** (6.19c) |
| **W** | ✅ **RULED by `-260` G3 = A** — ⛔ no new message after a Super Admin refusal or approval; the app and the helpline carry it (D23 stands as first written). | `-260` | ✅ |
| **G1–G6** | ✅ **RULED** — G1 B (the Super Admin may approve a staff case only with a fresh passing check, or refuse — appealable once; ⛔ never close) · G2 A (the Pariwar Admin says who must act when keeping) · ⚠ **G3 A — ⛔ no text after a Super Admin refusal or approval (our B ⛔ not taken)** · G4 A (first reminder the next morning) · G5 A (a second rejection restarts 180 days) · G6 confirmed (days 120, 150, 180). | `-260` | ✅ 6.19c (AC17 revised) · 6.19d |

### §0 run in this pass — the three items still open

- ✅ **RULED `-259`.** **CC1 protection 3 — the certificate reminder's schedule and channels (incl. letters, and whether `missing` is chased).** §0 result:
  ⭐ **the Panel's.** It fixes **what messages a family receives and whether the Trust writes to them by post** — exactly the ground on
  which `-250` treated this story's own schedule as the Panel's (*"each default fixes a date, a message or an alert a real person
  receives"*). ⇒ a routing note from the template is owed **before 6.19d builds anything**; ⚠ reusing the correction-return schedule by
  default would be deciding it for them. **6.19d is fenced (`backlog`); nothing in 6.19a–c waits on it.**
- ✅ **RULED `-258` (option B).** **V — a return that needs NO correction** ⭐ *(WIDENED 2026-09-27 at BigDev's direction to every return that is ⛔ not the family's to fix — staff mistakes too; see the note `…-2026-09-27-6-19-return-not-the-familys-to-fix.md`. The paragraph below is the narrower first framing, kept.)* (`deferred-work.md`, 6.18 chunk-1 item *"A return clears ONLY through a bank rewrite"* — its
  trigger is *"authoring Story 6-19 — its ACs must say what the District Admin does when the return needs no correction"*). Today a return
  clears only when **every account is rewritten after it** and a fresh passing check exists; a District Admin who finds the accounts
  already right can clear it only by a **no-op helpline rewrite with an invented reason** — and under this story the family would be
  **chased for 90 days and could be closed "for no response"** when nothing was owed. §0 result: ⭐ **the Panel's** — any path that
  clears a return **without** a correction narrows `-227` cl.2 (*"corrected, then re-submitted"*), a ratified clause. **What this story
  does meanwhile (within ratified rules, AC6):** the District Admin **does not request** a closure; the only way forward is the Pariwar
  Admin's own judgement. ⚠ There is ⛔ no in-system path for the Pariwar Admin to withdraw a return (a return is superseded only by a vote
  on a **resubmitted** claim, or by a new return on one). ⇒ **Recommended: route V as a note** (options: the Pariwar Admin may withdraw
  their own return with a note; or the District Admin may certify "no correction needed" and the Pariwar Admin re-votes). ⛔ Not a build
  blocker — the machinery is the same either way; V adds one path.
- **W — what the family is told after a Super Admin refusal or approval.** `-256`/`-255` rule the decisions, ⛔ not the notice. §0 result:
  ⚠ mixed. **Author default (D23):** the closure sends the name-free **closure notice** (AC6, the Panel asked for reminders to both people
  and a closure is their end); a Super Admin **refusal** and **approval** send ⛔ no new SMS — the member-app status and the helpline
  carry them, exactly as an ordinary refusal or approval does today. ⚠ If the Panel wants a letter or SMS on those too, that is a new
  message and theirs — carry it as a low-priority confirm in the next note.

## 🎯 What already EXISTS — re-verified on `c136b03c` (⛔ do not rebuild any of it)

**The return (6.18, merged).** `returnToDistrictAdmin` (`packages/domain/src/claim/state-trustee-decision-persist.ts:713`) writes ONE
`claim_state_trustee_decisions` row, phase `correction_return`, outcome `returned_for_correction`, reason `other` only, **no event, no
state move** (returns `eventVersion: null`). `decidedAt` is `timestamptz defaultNow()` = the transaction time. Partial-unique index
`claim_state_trustee_decisions_one_live_per_phase_uq` on `(claim_case_id, phase) WHERE superseded_at IS NULL`. ⚠ **A second return is
allowed only after resubmission** — it conditionally supersedes the resubmitted row and inserts a new one (`:735-766`); an unresubmitted
second return is `TrusteeDecisionConflictError(…,'correction_return')`. ⇒ **the live row's `decidedAt` is the LATEST return's date** —
the 90-day anchor, and a new return is a new clock for free (`-230` 2).

**Helpers.** Module-private: `getLiveReturnRow` (`:792`), `hasLiveRoutedRow` (`:330`). Exported: `getLiveCorrectionReturn` (`:818`),
`hasLiveReturnRow` (`:827`), `isReturnedClaimResubmitted(db, pariwarId, claimCaseId, deceasedMemberId, returnedAt)` (`:855`),
`resolveClaimCorrectionState(db, pariwarId, claimCaseId, deceasedMemberId, currentState)` (`:953`) — ⭐ **the one "under correction"
answer; use it, ⛔ do not re-derive** (two readers already re-derive "resubmitted" — `cycle-freeze-read.ts:281-288`,
`correction-queue-read.ts:280` — a drift risk ⛔ not to extend). `isReturnedClaimResubmitted` = ≥ 1 account **and** every account's
`updated_at` > `returnedAt` **and** `assertNomineeNameCheckForApproval` passes (exactly 2 live accounts; the 6.20 effective determination
is `'effective'`; a latest check that is current and ⛔ not `does_not_match`); it swallows only the three "required" errors, and
deliberately uses the **inner** helper (⛔ no death-certificate conjunct).

**What supersedes a return.** Exactly two writers: `voteOnFrozenClaim` (`:503`; the conditional `UPDATE … WHERE superseded_at IS NULL
RETURNING`, 0 rows ⇒ `ClaimAwaitingCorrectionError`, `:544-554`) and a second `returnToDistrictAdmin` on a resubmitted claim. ⭐
`voteOnFrozenClaim` checks the live return **before** branching on outcome, so it blocks **approve and deny** alike (`:534-543`); its
comment at `:565-567` names this story. ⭐ **Return ⟂ route-to-R9 is now enforced** (6.18): `TrusteeExclusionConflictError(claimCaseId,
'routing'|'correction_return')` (`:286`) — `routeToR9` refuses a live return (`:671-673`), a return refuses a live routing row (`:731-733`).

**States.** `TRUSTEE_RETURNABLE_STATES = TRUSTEE_VOTABLE_STATES = ['verifier_approved','reversed','state_trustee_freeze']` (`:125`, `:87`).
State machine `packages/domain/src/claim/state.ts`: `verifier_approved`/`reversed` —`state_trustee_frozen`→ `state_trustee_freeze`
(`:258-259`); `state_trustee_freeze` —`state_trustee_approved`→ `state_trustee_approved` (`:263`) / —`state_trustee_denied`→ `denied`
(`:268`, the ONLY edge for that event); `state_trustee_approved` —`approved`→ `approved` (`:274`); `claim.reversed` and
`claim.denied_no_appeal` are identity annotations (`:327-333`). `commitCycleFreeze` (`:1138`) excludes a claim with a live
`routing`/`correction_return` row (`:1173-1196`) and re-checks under the lock (`:1214`).

**The approval gate.** `assertClaimApprovable(db, pariwarId, claimCaseId, deceasedMemberId)` (`nominee-name-check.ts:383`, 6.21a) =
`assertDeathCertificateAcceptedForApproval` (`death-certificate-approval.ts:393`) **then** `assertNomineeNameCheckForApproval`
(`nominee-name-check.ts:418`). Called at P1 `adjudicateClaim`, P3 `voteOnFrozenClaim` (`:570-577`), P4 `finalizeR9Outcome`
(`r9-voting-persist.ts:613-627`). Throws `DeathCertificateAcceptanceRequiredError`, `NomineeBankAccountsRequiredError`,
`NomineeDeterminationRequiredError`, `NomineeNameCheckRequiredError`.

**Reason codes.** `STATE_TRUSTEE_REASON_CODES` (pgEnum `state_trustee_reason_code`, `state-trustee-decision.ts:97-120`):
`standing_not_met`, `documents_insufficient`, `concealment_upheld`, `r9_special_case`, `r9_panel_denied`, `concealment_override`, `other`;
`TRUSTEE_REASON_CODE_OUTCOME_COMPAT` lets `other` pair with `denied` (`:135-151`). Contract mirror `packages/contracts/src/claims/cycle-freeze.ts:40-104`.

**The closure vocabulary.** `claim.denied_no_appeal` = `requireIdentityTransition({…auditShape, deceased_member_id})`
(`events.ts:635-638`; registry `packages/events/src/registry.ts:384`). ONE emitter today: `decideAppealStage3`'s uphold
(`appeal-persist.ts:472-491`, trigger `appeal_exhausted_stage3_uphold`). ONE consumer: `ACCOUNT_UNFREEZE_EVENT_TYPES =
['claim.settled','claim.denied_no_appeal']` (`member/overlay.ts:50`). ⚠ **An ordinary `denied` that is never appealed leaves the
deceased's account frozen for ever** — nothing else unfreezes it (6.16 D-E: no appeal deadline).

**Appeals (6.16).** `assertAppealInitiable` (`appeal-eligibility.ts:134-153`: `denied` else `AppealNotDeniedError`; no `claim_appeals`
row else `AppealAlreadyExhaustedError`), called from `initiateAppeal`. `claim_appeals_one_per_claim_uq` is **unconditional**
(`schema/claim_appeals.ts:71`). Handler `claims.appeal.handlers.ts`: `can_initiate: currentState === 'denied' && journey === undefined`
(`:291`), `appeal_exhausted: journey?.status === 'upheld_final'` (`:294`). Contract `MemberAppealStatusResponse`
(`packages/contracts/src/claims/appeal.ts:294`, `:301`). Mobile `deriveAppealView` (`apps/mobile/lib/appeal-status.ts:39-49`:
`showExhausted = showExternalRemedy = appeal_exhausted`) → `AppealStatusCard.tsx`. ⚠ **The member appeal routes 404 for every real
claim**: they guard on `claimRow.claimantActorId !== memberId` (`:206`, `:282`) and **every production filing path sets
`claimantActorId` null** (member `claims.service.ts:260`, helpline `claims.helpline.handlers.ts:100`, convergence
`claims.convergence.handlers.ts:204`). ⭐ The **production** appeal path is the operator's on-behalf initiate (AR-61, `POST
…/admin/claims/:claimCaseId/appeal`, `claims.appeal.routes.ts`). ⛔ Not this story's to fix — record it.

**Re-filing.** `CLAIM_TERMINAL_STATES = ['settled','denied']` (`read.ts:33`). The intake dedup is `getConvergenceCandidate`
(`icp.ts:110-137`: filters terminal claims, ±30-day window). The mint is `tryConverge` (`icp.ts:275`; `if (!candidate)` at `:295` mints
`intake_initiated` + `intake_converged`), called only from `initiateIntake` (`claims.service.ts:240`, `:265`) — the member path
(`claims.handlers.ts:138`) and the helpline path (`claims.helpline.handlers.ts:90`). ⚠ **A SECOND mint path:** `overrideIntakeAttempt`
(`icp.ts:553`). `getClaimByDeceasedMember` is only a race backstop at intake (`claims.service.ts:287`).

**The District Admin's correction queue (6.18 D4).** `listClaimsUnderCorrection` (`packages/domain/src/claim/correction-queue-read.ts:188`,
row `ClaimUnderCorrectionRow` `:60`); `GET /api/v1/p/:pariwarId/admin/claims/under-correction` (`claims.nominee-name-check.routes.ts:181-199`,
preHandler `[adminSession, scope, resolveQueueScope, requireQueueView]`, key `claim.view_nominee_name_check`, per-request dimension via
`resolveQueueScopeStash` `:94-127`, `limit` ≤ 200); handler `getClaimsUnderCorrection` (`…handlers.ts:427`); contract
`ClaimsUnderCorrectionResponse` (`packages/contracts/src/claims/nominee-name-check.ts:408`); admin route `/p/$pariwarId/claims/under-correction`
→ `CorrectionQueueRoute` / `CorrectionQueueView` (`apps/admin/src/routes/CorrectionQueueRoute.tsx`), hook `useClaimsUnderCorrection`,
copy `correctionQueue` (`claim-verification/i18n-en.ts:211`). ⚠ **Nothing in the admin nav links to it** (`deferred-work.md`, 6.18 chunk 3 —
trigger: *"Story 6-19 (its reminders should deep-link here)"*). The return itself is `POST …/admin/cycle-freeze/decision` with `action:
'return_to_district_admin'` (`claims.cycle-freeze.handlers.ts:369-371`), audit `admin_cycle_freeze.returned`; the Pariwar Admin's screen is
`CycleFreezeRoute.tsx`.

**District keys.** `resolveNomineeNameCheckDistrict()` (`claims.nominee-name-check.routes.ts:51-72`) loads the claim, then
`getMemberPostingLatest(deceasedMemberId)`, and stashes the district (null ⇒ fail closed); `requirePermissionHook(deps, KEY,
{dimension:'district', resolveValue})` (`:137-146`). ⭐ Copy this for every district-dimension key.

**Permissions.** `PERMISSION_CATALOG_VERSION = 48` (`packages/domain/src/rbac/permissions.ts:726`); pinned in
`packages/domain/tests/rbac/permissions.test.ts` (`toBe(48)`, `keys toHaveLength(56)`) and `roles.test.ts` (13 bundles). `super_admin`
derives **every** key from `PERMISSION_CATALOG.keys` (`roles.ts:300-305`); a super-admin-only key has **no const in `roles.ts`**
(`pariwar.manage_drive_target_visibility`, `:280-287`, routes in `apps/api/src/modules/drive-target/routes.ts`). Holders:
`claim.view_nominee_name_check` = district_admin, verifier, pariwar_admin, helpline_operator; `claim.check_nominee_name` = district_admin
only; `cycle.freeze`, `claim.r9_vote` = pariwar_admin.

**The human-actor gate.** `scripts/claim-adjudication-human-actor-invariant/check.ts`: a hand-maintained `COVERAGE_SET` (`:46-177`,
`{file, pathSubstrings, owner, expectedMethods}`) + `NON_ADJUDICATION_ROUTES` (`:188`) + `ENROLMENT_OWED` (`:200`), ⭐ **now reconciled
against disk**: `unclassifiedRouteFiles()` (`:215`) fails on any `apps/api/src/modules/claims/*.routes.ts` not in exactly one list;
duplicate check (`:233`); `COVERAGE_FLOOR = 10` (`:262`). ⇒ a new route **file** cannot be forgotten, but a new **route in an existing
file** is caught only by `expectedMethods`.

**Audit.** `AuthAuditEventType` is a string union (`apps/api/src/audit/audit-sink.ts:15`); `resourceLocator?: string` sits on `interface
AuthAuditEvent` (`:536`, `:562`). `emitAuthAudit` (`apps/api/src/modules/auth/shared/audit.ts:14`) accepts it but it must match
`/^[a-z0-9][a-z0-9:_.-]{0,127}$/` — ⚠ **anything else is SILENTLY replaced by `user:<actorId>`** ⇒ lower-case the claim id
(`claims.cycle-freeze.handlers.ts:241` does). `withCompensatingAudit`'s `auditIntent` takes it too.

**The dispatch substrate.** `dispatch(alert, deps)` (`packages/channels/src/dispatch.ts:212`), ladder `['push','whatsapp','sms']`
(`:34`), Telegram started concurrently (`:244`); `TELEGRAM_ELIGIBLE_CATEGORIES` = `alert_published`, `module_new`, `niyamavali_amended`
(`:48-52`). One direct call site: `fanOutAlert` (`apps/jobs/src/scheduler/contribution-notify.ts:227`, call `:246`, `backoffMs: []`
`:316`), which narrows `resolveDelivery` per rung and drives the **real Telegram mirror** itself (`:338-350`); reused by news, surveys,
moderation (`fanOutAlertToMembers`, `:436`), helpdesk and the contribution triggers. `Alert` (`packages/contracts/src/alerts/alert.ts`): nine
categories, `member_id` a **required UUID**, `time_critical` required, every variant `.strict()`; `alert_published` = `{title, body}`.
`render.ts` headings are static English except `alert_published` (payload title); SMS renders `${heading}: ${line}`. Resolvers
(`packages/domain/src/notifications/delivery.ts`): `resolvePushTargets(db, enc, pariwarIdStr, principalType 'member'|'admin',
principalId)`, `resolveWaTarget` / `resolveSmsTarget` / `resolveTelegramTarget` — **all keyed on a member id; ⛔ none takes a phone
number**. `resolveMemberDeliveryContext` lives in `contribution-notify.ts:161-184` (hard-codes `'member'`).
⭐ **The SMS DLT registry** `packages/channels/src/sms-dlt-registry.ts`: `SMS_DLT_TEMPLATE_REGISTRY: Partial<Record<AlertCategory,
DltTemplate>>` (`:57-83`), five categories, config keys `sms.dlt.template_id.<category>`; ⚠ **`alert_published` is DELIBERATELY
EXCLUDED** (`:18-20`) — `resolveDltTemplate` returns null and the provider falls back to the **fixture**. `createSmsDltProvider({messaging,
dltTemplateId})` (`sms-dlt.ts:53`). ⭐ **The explicit-number precedent** is the OTP path: its own template registry
(`packages/channels/src/otp-sms-template.ts`, keyed by intent) and a direct send in `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts`,
⛔ not through `dispatch()`.

**The scheduler analogues** (`apps/jobs/src/scheduler/contribution-notify-triggers.ts`): `runDeadlineReminderSweep` (`:1032`),
`runPendingMatchRetrySweep` (`:1159`) — a raw cross-tenant `deps.pool.query` on the BYPASSRLS pool, `ORDER BY … LIMIT $1`, limit
`Math.max(1, … ?? 500)`, alarm at `rows.length >= limit`, per-entity try/catch with alarm; a child queue (`enqueuePoolBatch`
`:545-569`, singletonKey, `retryLimit` 4); the keyed-store claim, release on undelivered, `recordResult` and the throw live in the
**child** (`runContributionNotifyChild`, `:821-868`). Registration `registerContributionNotifyWorkers` (`:1399-1529`, from `boot.ts:579`):
`createQueue` → `work` → `schedule(queue, cron, {}, {tz:'Asia/Kolkata'})`. `QUEUE_NAMES` in `packages/queue/src/index.ts:41`. Clock
`deps.now?.() ?? new Date()`. **Calendar math** `istDateOf(instant): CalendarDateString` / `addCalendarDays(date, days)` (throws on a
non-integer) in `packages/domain/src/cycle-calendar/holiday-resolver.ts:178`, `:187` (via `@twt/domain` as `cycleCalendar.*`).

**Staff recipients.** Admin push tokens live in `member_device_tokens` with `principal_type 'admin'`, `member_id` NULL, registered under
`ADMIN_GLOBAL_NAMESPACE` (nil UUID) (`apps/api/src/modules/device-token/device-token.handlers.ts:115-131`); `resolvePushTargets(…,'admin',…)`
works but **nothing calls it that way today**. ⛔ No "admins by role and scope" accessor; the duty-specific precedents join `role_grants ⋈
users`: `resolveShepherdCandidates` (`claim/shepherd-assign-persist.ts:190`), `resolveEligibleFixedAmountAttestors`
(`pool/fixed-amount-panel.ts:201`). ⛔ No admin inbox table. `users.contact_phone` (plaintext, E.164, nullable) has ⛔ no resolver. The
District Admin for a claim = the live `claim_shepherd_assignments` row.

**Filing (member app).** `CLAIM_STEPS` (`apps/mobile/lib/claim-steps.ts:22-29`) = `handover-otp`, `relationship`, `consent`, `document`,
`nominee-review`, `acknowledgement`; each screen hard-codes its next typed route (`nominee-review.tsx:270` → `acknowledgement`);
`_layout.tsx` renders `{step} / {total}`; `apps/mobile/tests/unit/claim-steps.test.ts` pins the list, `{1,6}`/`{6,6}` and the
`nextClaimStep` chain. `lib/claim-draft.ts` is **PII-free** (MMKV `claim-draft:<deceasedMemberId>`). ⚠ `nominee-review.tsx` (508 lines) is
already the nominee summary **plus** the dual-account form — ⛔ do not add a third concern to it. ⚠ **A pre-existing resume gap**
(`(claim)/index.tsx:66-77`): only `relationship`, `document`, `nominee-review` are handled; `lastStep='relationship'` and
`lastStep='nominee-review'` fall through to `handover-otp`. Session = the deceased member (Ravi-mode); ⛔ **no filer or claimant phone is
stored anywhere on a claim** (the handover OTP goes to the **current** rank-1 nominee's mobile, not persisted).

**Filing (helpline).** `apps/admin/src/modules/helpline-claims/`: `HelplineConsoleShell` slots `lookupSlot`, `stepUpSlot`, `bankSlot` (+
`bankRecorded`, rendered when `result !== null`); 6.20's `HelplineNomineeCorrection` and 6.21b's `HelplineCertificateReplacement` are
**siblings after the shell** (`HelplineClaimPage`, after `HelplineConsoleShell`), ⛔ not slots. ⚠ **There is ⛔ no consent UI in the helpline module.**

**Side-route pattern.** Nominee bank (`claims.nominee-bank.handlers.ts`): member `GET/POST /api/v1/member/claims/:claimCaseId/nominee-bank`
(guard `requireDeceasedMemberId`, mismatch ⇒ 404), helpline `GET/POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-bank`
(`recordHelpline`, step-up). DPDPA consent (`claims.dpdpa-consent.handlers.ts`): member `POST/GET …/dpdpa-consent`, helpline `recordHelpline`
(`grantedViaActor:'staff_assisted'`, preHandlers `canFileClaim, stepUp`). ⭐ **ICP:** neither does canonical resolution — the claim id a
filer holds is already canonical (a merge only flips `intake_attempts` to `converged`; no second claim row exists).

**Consent.** `DpdpaConsentType` (`packages/contracts/src/claims/dpdpa-consent.ts:81-86`) = `claim_time_dpdpa`, `sahyog_vivran_publication`,
`in_memoriam_listing`, `sahyog_drive_publication` (preserved by ruling, must not shrink); `claim_time_dpdpa` is ⛔ **not** revocable
(`DpdpaRevocableConsentType` `:113` = the three publication types). DB `pgEnum('consent_type', …)` (`schema/consent_records.ts:113`),
revocation via `revoked_at` + `revocation_reason` + `revoked_audit_id`. Copy `dpdpa.*` in `packages/i18n/locales/{en,hi}/claim.json`,
byte-identical lockstep `apps/api/tests/unit/dpdpa-consent-copy.test.ts` ↔ `DPDPA_CONSENT_COPY` (`claims/dpdpa-consent-copy.ts:38`); also
`packages/domain/tests/consent/preserved-consent-types.test.ts`. The policy is *"un-attested-pending … Story 0.13"* (`:28-29`, `:123`, `:153`).

**Nominees.** `member_nominees`: PK `(member_id, rank)`, rank 1 or 2; `name_ciphertext`, ⭐ **`mobile_ciphertext` NOT NULL** (every
nominee has a mobile), `address_ciphertext` nullable, `relationship` plain `text`. ⚠ The declaration is **locked** once a claim exists
(`claim/nominee-lock.ts`, 409 `nominee.locked_claim_filed`). ⭐ **The nominee who matters is the one in force at death**, ⛔ not the
current rows: `getEffectiveNomineeDeclaration(db, pariwarId, claimCaseId)` (`claim/nominee-effective.ts:324`, bulk `:339`). ⚠ The handover
OTP still reads the current projection (`claims.service.ts:100-101`) — ⛔ do not copy that.

**Relationship lists.** `NOMINEE_RELATIONSHIP_CODES` (`packages/contracts/src/nominee/declaration.ts:47-63`, 15 values; its *"⚠ Still
OPEN, recorded in `-237`"* note at `:44-45`); domain mirror `NOMINEE_RELATIONSHIPS` (`packages/domain/src/nominee/relationship.ts:12-28`);
`ClaimantRelationship` (`packages/contracts/src/claims/filing.ts:38`, five values; its comment ends *"never the claimant's PII"* and
`:32-36` forbid widening it).

**PII.** `claim_nominee_bank_accounts` is the model (Tier-1 `piiColumn(1,'claim_nominee_bank')`, `policies/claim-nominee-bank-rls.ts`,
encrypt-before-insert `encryptNomineeBankField` in `apps/api/src/modules/claims/nominee-bank-crypto.ts:25`). `piiColumn`
(`packages/domain/src/encryption/column.ts:70`) only **tags**; the handler encrypts. RTBF `member/anonymize.ts` scrubs nominee tables and
`claim_death_certificate_reviews`, and deliberately does ⛔ not touch `claim_documents`, uploads, bank accounts or `claims` (`-243`).

**Documents.** `ClaimDocumentStorage` (`packages/contracts/src/claims/documents.ts:86`), `CLAIM_DOCUMENT_ALLOWED_MIME_TYPES` (jpeg, png, pdf),
`CLAIM_DOCUMENT_MAX_BYTES` (10 MiB); instance `deps.claimDocumentStorage`; keys `pariwar/{pariwarId}/claim/{claimCaseId}/{documentType}/{id}`.
`claim_documents` is OCR-shaped (NOT NULL `parity_outcome`, `parity_flags`, `ocr_confidence`, `verifier_review_required`; unique per
`(claim, document_type)`). ⚠ ⛔ No virus scan on any claim document (only the 9.3 `StatementScanner` seam for bank statements).

**6.21a/b (CC1's trigger).** `isDeathCertificateReplacementRequested(db, pariwarId, claimCaseId)` (`claim/death-certificate-approval.ts:223`)
— true only in the review window with a current `rejected` certificate; never a deadline. Family status `DeathCertificateFamilyStatus`
(`:248`) = `not_needed | missing | awaiting_review | accepted | replacement_requested`.

**Planning text owed an annotation (F7, and `-259`).** PRD `prds/prd-TWT-2026-05-22/prd.md` §4.10 *"**Bulk-alert SMS — dropped.**"* (also the §4.14
TRAI line *"no bulk-alert SMS"*); `architecture.md` §3.4 *"Per-member fallback SMS dispatch"* — *"…they do not receive transactional-
fallback SMS."* ⛔ Neither carries an annotation yet. (Cited by section and phrase: the PRD's line numbers moved when `-263`'s FR-40
annotation landed.)

**The fallback-handler ledger (AR-61).** `docs/fallback-handler-ledger/ledger.md` + `loop-nodes/`; rows are two-column tables
(`loop_node_id`, `node_description`, `owning_epic + stories`, `primary_actor`, `fallback_actor`, `escalation_trigger`, …, `status`).
⚠ ⛔ No entry for 6.17, 6.18, 6.20 or 6.21 either — record that, ⛔ do not back-fill them here.

## ⚠ THE TRAPS

**T1 — "delivered" is ⛔ NOT attainable, and ⛔ never written for an accepted send.** SMS: *"The gateway gives NO synchronous delivery receipt
at accept time (no DLR seam in v1). Honest `unknown` here; never fabricate `delivered`."* (`sms-dlt.ts:82-83`); no DLR webhook or table.
`sms-errors.ts` `INVALID_NUMBER_CODES = {'INVALID_NUMBER','INVALID_MOBILE','E001'}` → class `invalid_number` — ⚠ *"CODES ARE INDICATIVE,
VERIFY AT IMPLEMENT TIME"* (`:9`, `:27`). ⭐ The Panel made `accepted` count (`-252` cl.1), so the record needs only **accepted / rejected
(invalid_number) / no_target / error**; `delivered` stays a column only a real signal may fill. Capture `providerMessageId` from the provider's
`SendResult` at send time (it is dropped today by `fanOutAlert`) — ⛔ no DLR integration is built (`-252` cl.3 opens no row).

**T2 — ⛔ do not loosen `voteOnFrozenClaim` or `assertClaimApprovable`.** They block approve **and** deny on a live unresubmitted return; the
closure and every Super Admin decision go through **new writers**. Amending the vote's deny path would let an ordinary deny skip the
"awaiting correction" block; amending `assertClaimApprovable` would widen `-251`'s narrowing to P1/P3/P4 (invariant 7).

**T3 — appeal eligibility is read in THREE places**, all of which must learn the closure: `assertAppealInitiable`, the handler's
`can_initiate`, and the mobile card via the contract. Updating one leaves the UI offering an appeal that 409s. ⚠ And the **operator's
on-behalf initiate** (AR-61) goes through `assertAppealInitiable` — the production path; test it there.

**T4 — the overlay.** Every terminal refusal that can ⛔ no longer be appealed must emit `claim.denied_no_appeal` (carrying
`deceased_member_id`), or the deceased's account stays frozen for ever: ⭐ the **closure** (always) and a **Super Admin refusal on a claim
that already used its appeal** (F2's "unless"). A Super Admin refusal that **is** appealable emits ⛔ no `denied_no_appeal` — exactly an
ordinary refusal. ⚠ A NEW lifecycle state or unfreeze type would trigger the `NOT_DECEASED` re-examination fence
([[project_death_is_an_overlay_not_a_state]]) — D1 adds neither.

**T5 — the reminder record is ⛔ NOT `idempotency_keys`.** The keyed store has a mandatory TTL and `purgeExpiredKeys` (hourly, `boot.ts:352`)
deletes lapsed rows regardless of status; `recordResult` does not extend `expires_at`. It is a guard, ⛔ not an audit record.

**T6 — the family message ⛔ never names anyone, and ⛔ is not an `Alert`.** The pool reminders NAME the family (`resolvePoolIdentity`) — ⛔ do
not reuse them. ⭐ **Why ⛔ not `alert_published` (v0.8's D7, now withdrawn):** (a) F7 makes the family channel **SMS**, and
`alert_published` is **deliberately excluded** from the DLT registry — an SMS would go to the **fixture**, ⛔ never the gateway; (b)
registering `alert_published` for SMS would make **every** news/survey/moderation fallback a real, paid, bulk SMS — the exact thing PRD §4.10
dropped; (c) `Alert.member_id` is required, but the recipients are a nominee and a claimant who may not be members, and every resolver keys on
a member id; (d) `alert_published` is Telegram-mirrored by `fanOutAlert`. ⇒ **D7: a direct DLT SMS to an explicit number, on the OTP path's
precedent.** Tone: warm-formal, never dunning — *witness, not bailiff*; UX Stance #5 (*no punitive auto-action*). ⚠ The `microcopy` gate
scans whole files in `scope.copy_globs` (`microcopy.yaml`, `claim.json` included) — a panic word (`\bURGENT\b`) breaks it.

**T7 — who can be reached, by what.** Every declared nominee has a mobile (NOT NULL); the claimant's mobile is mandatory when they are not a
nominee (`-232` G). ⇒ with F7's SMS a recipient is `no_target` only if a number cannot be sent to (malformed, not an Indian mobile) — rare,
but the letter route still applies (`-252` cl.2). WhatsApp is dual-gated on a **member** opt-in and ⛔ cannot reach a non-member; push reaches
only a member's device. ⇒ v1's family channel is **SMS only** (D7). ⚠ Lifecycle suppression is architecture PROSE (no caller passes
`suppression`); `costToggleEnabled` is hard `false` — neither touches a direct SMS.

**T8 — claimant data is a NEW PII surface.** The system holds ⛔ no claimant personal data today (only a null `claimantActorId` and a relationship
label). Tier-1 (`piiColumn(1, …)`), encrypt in the handler, never logged or echoed except through a gated, audited read. ⛔ **No RTBF path
reaches it** — record the gap, ⛔ do not fix it (the precedent: `-243` deliberately leaves claim tables alone). Contracts ⛔ never import
`@twt/domain` ([[project_contracts_domain_bundle_boundary]]). `ClaimantRelationship`'s comment stays ⛔ untouched (`-232` consequence 3).

**T9 — the re-file guard must key on the CLOSURE, ⛔ not on `denied_no_appeal`.** A stage-3 uphold also emits `denied_no_appeal`, and its family
re-files freely (`-254`'s scope is the closure for silence only; `-239` (b)'s refile by the true nominee is untouched). Guard **both** mint
paths — `tryConverge` **and** `overrideIntakeAttempt`.

**T10 — the Super Admin approve is a NEW approval path.** It must: supersede the live return (conditional `UPDATE`, 0 rows ⇒ 409), move the
claim through the existing events (`state_trustee_frozen` if at `verifier_approved`/`reversed`, then `state_trustee_approved`), write whatever
`commitCycleFreeze` needs to see an approved decision (⚠ **trace it** — the Pariwar Admin's vote writes a decision row; mirror that row's phase
and outcome, ⛔ do not guess), and gate on **the accepted death certificate + two accounts + the effective determination** while waiving
**only** the name-check currency/pass (invariant 7). ⚠ The inner helper bundles the determination with the name check — split it with a
pure refactor that leaves `assertNomineeNameCheckForApproval`'s behaviour byte-identical for its existing callers. ⭐ The approved-name-differs
highlight (`-226` cl.5, 6.18 AC8) must still show on such a claim — prove it.

**T11 — escalated claims are held.** While a declined closure is with the Super Admin (and while **under review**), ⛔ nothing is paid, closed
or refused, and the family's reminders do ⛔ not run (they stopped at day 90) unless a **direction** restarts them (D18). `commitCycleFreeze`
already excludes the claim (the return row is live) — keep it live until a Super Admin decision supersedes it.

**T12 — the "reached" set is the as-at-death declaration.** "Each declared nominee" (`-255` F6) = the nominees of
`getEffectiveNomineeDeclaration`, ⛔ never the current rows and ⛔ never the handover OTP's rank-1 read. Their mobiles come from that
declaration version. ⚠ **WHEN it exists:** the effective declaration is `undetermined` (no entries) until the District Admin's
determination, recordable only in `CLAIM_REVIEW_WINDOW_STATES` (from `verification_in_progress`). ⇒ it governs 6.19b's reminders and
letters and D14's check **at approval** — ⛔ never the capture at filing, which binds to the declaration's versions as they stand then (D5).

**T13 — DLT is external.** A new SMS content template needs **TRAI DLT registration** before any real send (F7's own cost) — per locale, per
message (reminder, closure notice). Build against config keys; a missing key must fail **closed and loud** (record `error`, alarm), ⛔ never
fall back to a fixture that reports `accepted`.

**T14 — sequencing inside the story.** 6.18, 6.20, 6.21a/b are merged; the last migration is **0123** ⇒ this story's migrations start at
**0124**. ⚠ *(As of `f06ee41f`: 6.19a used 0124 + 0125 ⇒ 6.19b starts at **0126**.)* 6.19a's Task 3 (N1) is independent and may land first; 6.19d (CC1) is fenced on its routing note.

## ⚖️ Decisions — the AUTHOR's (BigDev's; ✅ committed by `-265` — D2 and D14's letter clause ⚠ SUPERSEDED and D30–D34 ADDED by `-266`)

⛔ None of these is the Panel's (§0 gate: each is "the code should do X" with no change to what a person is owed beyond what the rulings fix).
Where a decision only records a Panel ruling it says so.

- **D1 — closure modelling: `denied` + `denied_no_appeal` through a NEW writer, ⛔ no new state.** A **new claim-scoped closure table** holds
  the request, the Pariwar Admin's decision (+ note), the escalation and the Super Admin's review and decision. On an approved closure (Pariwar
  Admin, or Super Admin "close"), one scope-tx under the trustee advisory lock: supersede the live return (conditional `UPDATE`, 0 rows ⇒ 409),
  emit `claim.state_trustee_frozen` (from `verifier_approved`/`reversed` only), `claim.state_trustee_denied` (reason `other` + a fixed rationale
  — ⛔ no new reason-code value; `other` + note is the return's own precedent), then `claim.denied_no_appeal` with trigger
  `correction_closure_approved` / `correction_closure_super_admin` (carrying `deceased_member_id`). The three appeal sites refuse when the claim
  has a closure row in state `closed` (the **table** is the marker for the 409 code; the event is what the overlay reads). *Cost:* migration,
  writer, three appeal-site edits, a status string.
- ⚠ **D2 — SUPERSEDED by `-266` §1 (2026-09-29): a run is its OWN record** — a runs table (`kind` ∈ {family, staff, direction}, `anchor_id`,
  `day0`, ⭐ one open run per return — ⚠ **per CLAIM** since `-267` §1), the record keyed UNIQUE `(run_id, slot_day, recipient_key, purpose)` —
  ⚠ **+ `subject_key`** since `-267` §4 — `recipient_key` stable across a
  6.20 correction (the chain root). Why: D26's family → staff → family switch reused the return's `decision_id` and collided. *The text
  below is D2 as `-265` committed it, kept.* **D2 — the reminder record is a dedicated append-only table** keyed UNIQUE `(schedule_run_id, slot_day, recipient_key)`, carrying
  `attempt_state` (`attempting` → `accepted | rejected_invalid_number | no_target | error | skipped_superseded`, plus `late`), a
  `delivered_at` only a real signal fills, and `provider_message_id`. `schedule_run_id` is the return's `decision_id` — or a direction id when a
  Super Admin restarts reminders (D18). ⛔ Not `idempotency_keys` (T5), ⛔ not a claim event. Own RLS file; own migration.
- **D3 — the schedule is a pure function over a DATA table** (⭐ keyed by run KIND since `-266` §1 — 6.19d adds its own kind's days; ⭐ `-260`
  G4: ⛔ nothing on day 0 of a return **or** a switch) (the Panel's numbers, `-250` #5): day 0 = `istDateOf(decidedAt)`; slots 1–7, 10,
  14, 17, 21, 24, 28, 31, 35, 42, 49, 56, 63, 70, 77, 84; ⛔ nothing on or after day 90; one send per day at **10:00 IST** (a cron
  `0 10 * * *`, `tz:'Asia/Kolkata'`). "At least 90 days" ⇔ `istDateOf(now) >= addCalendarDays(day0, 90)`. **Catch-up:** a due slot with no
  record is sent ONCE and flagged `late`; older missed slots are written `skipped_superseded` — ⛔ no burst. ⚠ The numbers are now the Panel's:
  a change is a new ruling, ⛔ never an edit.
- ⚠ *(`-269` §2: the pause has two tiers — `resubmitted` pauses the whole run; "the family's part is done" (`-268`, the LATEST check per
  `-269` §1) pauses the family only.)* ⚠ *(`-267` §3: `resubmitted` now PAUSES a run — ⛔ no send, ⛔ no record — and ⛔ never ends it; a run ends on superseded, day 90, a mark
  change or `decided`.)* **D4 — the stop predicate, per recipient.** All reminders on a run stop when the return row is superseded **or**
  `resolveClaimCorrectionState(…).resubmitted` holds, and at day 90. A recipient's **dead number** (a send-time `invalid_number`) or **no working
  route** (`no_target`) keeps them on the schedule (harmless — they fail, and `-250` #1 says so) **until a letter to that person has a recorded
  delivery date**, then their reminders stop (`-250` #1, F5). The dead-number/unreachable marker is **per run** (a second return re-evaluates).
- **D5 — REVISED 2026-09-28. A NEW claim-scoped contact table, bound to the declaration's VERSIONS**, ⛔ not on `claims` and ⛔ not on
  `intake_attempts`: one row per claim, plus child rows **UNIQUE `(contact_id, nominee_version_id)`** (`nominee_version_id` FK →
  `member_nominee_versions`) holding each nominee's **postal address** (Tier-1) and, when the claimant is none of the nominees, the
  claimant-to-nominee **relationship** (D16). On the parent: **exactly one claimant side** — `claimant_nominee_version_id` **or** the claimant
  block (name, mobile, address; Tier-1) — enforced by a CHECK; `agreement_consent_id` NOT NULL FK → `consent_records` (D15);
  `contact_locale` (`hi` default, `en`); `recorded_by_actor`, `recorded_via` (`member_app | helpline`, set by the creating write).
  `piiColumn(1,'claim_contact')`; own RLS file modelled on `claim-nominee-bank-rls.ts`. ⛔ No mobile blind index. ⛔ No backfill (`-232`: not
  in production). The declaration stays locked — the address lives here, ⛔ never by editing `member_nominees` (`-233`).
  ⚠ **Why versions, ⛔ not the effective declaration:** it is `undetermined` until the District Admin's determination in the review window
  (T12), and the determination can land mid-filing.
  ⭐ **The write rules are 6.19a AC1's W1–W10 — the ONE copy** (⛔ not restated here, so the two can ⛔ never drift): W1 the member binds to
  the **projected** version (what `member_nominees` was last written from — ⛔ never the highest `version_no`); W2 the helpline binds by
  explicit allowed `nomineeVersionId` (effective once determined, else projected); W3 the windows (member = `NOMINEE_BANK_COLLECTABLE_STATES`;
  helpline = that ∪ `TRUSTEE_ROUTABLE_STATES`); W4 upsert-only rows; W4a the correction chain (after filing the declaration is locked, so
  a 6.20 correction is the only re-versioning — a row or claimant link on V counts for any version correcting V, nearest wins); W5 add-only in the helpline's extra states under `claim.file` (the
  reason is recorded: there the helpline only COMPLETES the filing; an identical value is ⛔ not an overwrite); W6 the claimant side and its
  fills in the extra states (creating; a non-effective claimant version → an effective one or the block) and
  `claim_contact.awaiting_determination`; W7 the creating write (`agreement_required`, `nominee_set_mismatch`, `claimant_required`,
  `address_required`); W8 the agreement after creation (a revoked one counts as missing; `agreed` alone is a valid helpline body); W9
  `locale` and provenance; W10 the audit unit (one `withCompensatingAudit` intent line + `emitAuthAudit` events). *(First text, before
  2026-09-28: the child rows were "per declared nominee (from the effective declaration, T12)" — unsatisfiable at filing; in git at
  `6752e0d6`.)*
- **D6 — the letter screenshot reuses the `claimDocumentStorage` PORT with its own key prefix** (`…/correction-letter/{letterId}`), a NEW
  letters table and handler; ⛔ not `claim_documents` / `uploadClaimDocument` (OCR-shaped, unique per type, state-gated, enqueues OCR). MIME and
  size limits enforced **before** `put`; reads only through a TTL-limited signed URL. ⚠ ⛔ No virus scan exists — record the gap.
- **D7 — REVISED. The family message is a direct DLT SMS to an explicit number, ⛔ not an `Alert` and ⛔ not `dispatch()`.** Composed in
  `apps/jobs`, on the OTP precedent: a small **claim-correction SMS template registry** (keyed by message × locale — `reminder`, `closure_notice`
  × `hi`, `en` — config keys `sms.dlt.template_id.claim_correction.<message>.<locale>`), a send through `createSmsDltProvider`, the
  **explicit** mobile decrypted from the contact record (claimant) or the effective declaration version (nominee), the
  `providerMessageId` and the classified error kept on the reminder row. ⛔ No push, ⛔ no WhatsApp, ⛔ no Telegram for the family in v1 (T7).
  ⚠ The template registry is a **new file** beside the OTP one — ⛔ do not add a category to `SMS_DLT_TEMPLATE_REGISTRY` or to `AlertCategory`.
  *Cost:* a 10th send path to maintain; it is the only one that fits F7 without widening bulk SMS.
- **D8 — REVISED. Six permission keys**, each with its own doc-block reuse-check, decided in ONE author-commit (6.19a Task 0) and minted by the slice
  that uses them — ⚠ **the arithmetic below is superseded by `-265` §2: 6.19b mints (1) + (7) in ONE bump, 48 → 49, 56 → 58; 6.19c (2)–(6) + (8), 49 → 50, 58 → 64** — first text: 6.19b key (1), catalog 48 → 49; 6.19c keys (2)–(6), 49 → 50; keys 56 → **62** in all (⭐ **64** once `-258`'s keys (7) and (8) are added — see D25–D29): (1) **record a posted letter** — district, `district_admin`; (2) **request a closure** — district, `district_admin`; (3) **decide a
  closure** — Pariwar, `pariwar_admin`; (4) **decide an escalated claim** (close / refuse / approve-despite-the-name) — `super_admin` only (no
  `roles.ts` const, the drive-target precedent); (5) **hold under review and direct** — `super_admin` only; (6) **confirm a re-file after a
  closure** — `district_admin` (district) and `helpline_operator` (Pariwar), per-request dimension like `resolveQueueScopeStash`. **Reads** reuse
  `claim.view_nominee_name_check` (its four holders already read the correction queue) — ⚠ **reuse-check (2026-09-28):** that key's own
  rationale forbids acquiring a second living subject's plaintext *"as a side effect"*, so under it the contact record is **presence-only**;
  the **plaintext** read is under `claim.file` (the helpline operator, who re-types these fields), and 6.19b's letter form reads the address
  under its own key (1). The key's doc-block in `permissions.ts` is amended to say so — ⛔ no catalog bump. A **direction response** needs ⛔ no key: the actor must be
  the **named directee** (identity check) and hold that read key. Names are the developer's.
- **D9 — the claimant's NAME is ⛔ not English-gated.** `-227` cl.9 scoped the gate to the two names the check compares; UX-DR57 requires bilingual
  input. Say so in the doc-block.
- **D10 — reminders are claim-shepherd communications.** Moot for the family (a direct SMS bypasses suppression); for staff push, `time_critical:
  false` (like every non-cycle-open producer).
- **D11 — REVISED. Staff reach: the in-app queues first, admin push best-effort.** The District Admin's correction queue gains every due item
  (below), and ⭐ the admin nav gains a link to it (closes the 6.18 deferred item). Pariwar Admin and Super Admin get two small queues (closures
  awaiting decision; escalated claims + directions). Push: `resolvePushTargets(…,'admin', userId)` composed in `apps/jobs` through `dispatch()`
  narrowed to push, an `alert_published` envelope with **English** staff copy (staff copy is English-only) and `member_id` = the deceased as
  **subject** — ⚠ run ⛔ no Telegram mirror for it (call `dispatch` directly, ⛔ not `fanOutAlert`). Build a small **admin directory** accessor
  (`role_grants ⋈ users`, by role and scope; precedent `resolveShepherdCandidates`); the District Admin = the live shepherd.
- **D12 — recorded, ⛔ no longer ours:** the day-90 escalation goes to the Pariwar Admin (`-250` #6).
- **D13 — split: ✅ DECIDED 2026-09-27 by BigDev (*"split it three ways"*) — a, b, c as below, and CC1 as 6.19d (`backlog`). Recorded in 6.19a's Task 0 author-commit.** *(As proposed:)* Proposed: **6.19a** filing capture + N1 (AC1, AC13;
  Tasks 2, 12) — it is the letter track's input and independent of the reminder machine; **6.19b** the reminders, letters and staff chase
  (AC2–AC5, Tasks 3–5); **6.19c** the closure, the Super Admin's review, the appeal sites and the re-file guard (AC6, AC7, AC14, AC15, Task 6);
  **CC1** to its own row once its routing note is answered (AC12, Task 11). Shared: AC0 (governance), AC8–AC11 per slice.
- **D14 — REVISED 2026-09-28. Where the "contact record required" boundary lives.** ⛔ No server "filing completed" transition exists. So:
  (1) the contact routes reject an incomplete body (**400**, at the contract); (2) the member step gate and the helpline card refuse to
  complete (conveniences); (3) the **server boundary** is a NEW exported domain check (e.g. `assertClaimContactRecorded`) called **after**
  `assertClaimApprovable` at P1/P3/P4, approve-only — ⛔ never inside `assertClaimApprovable` (which stays unchanged) and ⛔ never inside
  `isReturnedClaimResubmitted`'s inner helper; it reads `getEffectiveNomineeDeclaration` itself. It passes only when the contact row exists, its agreement consent exists and is ⛔ not
  revoked, **every EFFECTIVE nominee's `versionId`** has an address row (resolved per effective id through the correction chain, 6.19a
  W4a — ⛔ never a count), and **either** (the claimant's version is one of the effective
  nominees' versions) **or** (the claimant fields are present **and** every effective nominee's row carries the claimant-to-nominee
  relationship). It throws
  `ClaimContactRequiredError` (`reason`: `no_record | agreement_withdrawn |
  nominee_address_missing | claimant_details_missing` — the first that applies, in that order; rows selected by the effective ids), mapped per route as the gate's other errors are: **409 `verifier_decision.` / `cycle_freeze.` /
  `r9_voting.claim_contact_required`**, and the three admin screens explain it. Running it **after** the existing gate keeps every existing
  refusal's code unchanged when several are missing. ⚠ **The letter writer's clause is SUPERSEDED by `-266` §2 (D31)** — a letter needs only that person's address + a live agreement. The closure writers and the three NEW approval writers
  (6.19c: the `-251` approve, D27's approve, `-260` G1's approve) call it too — "the full gate" means `assertClaimApprovable` **and** this
  check. A claim that lacks it **waits, ⛔ never denied**; the write windows (D5) keep a path to supply it open.
  *(First text: "a new conjunct beside the approval gate … (or as a third helper it calls)", one flat code `claim_contact.required`.)*
- **D15 — REVISED 2026-09-28. The filer's agreement (`-253` cl.1) is a NEW consent type `claim_contact_agreement`**, recorded in
  `consent_records` (subject = the deceased member, [[project_consent_subject_key_convention]]) **in the same transaction as the contact
  row**, which carries its `agreement_consent_id` — ⭐ the agreement is **per claim**: `consent_records` has ⛔ no claim column and
  `consent_artifact_ref` is a provenance back-link, ⛔ never a query key, so a refiled claim for the same death (`-261` C3: *"the consents
  … are given again"*) must ⛔ never be satisfied by an earlier claim's row. Its own `ADD VALUE IF NOT EXISTS` migration (own file); the
  value is added to the pgEnum and to contracts `ConsentTypeSchema` **only** (the two are pinned equal by `packages/contracts/tests/consent.test.ts`)
  — ⛔ not to `DpdpaConsentType` (its `Record`-total `DPDPA_CONSENT_COPY` and the DPDPA GET view's `ALL_TYPES` would change a shipped
  surface) and ⛔ not to `CLAIM_TIME_CONSENT_TYPES` (pinned by an exact `toEqual`; it derives the `claim.dpdpa_consent_recorded` payload —
  recording the agreement emits ⛔ no claim event). Its own versioned copy constant in apps/api, keys in `claim.json` **en + hi**, and a
  byte-identical lockstep test (the `dpdpa-consent-copy` precedent); a `staff_assisted` helpline variant. **Mandatory** to complete filing
  (*"The filer confirms — in the form"*); ⚠ a filer who declines leaves the claim **unapprovable** (D14) — our reading, stated in 6.19a's
  policy note. ⛔ **Not revocable in v1** (as `claim_time_dpdpa`); whether it must be withdrawable, and whether it may be a **condition of
  approval**, is **counsel's (M)** — record both. ⚠ The copy is ⭐ **go-live gated on counsel** — ship it marked *"pending Story 0.13"*.
  *(First text: "the `DpdpaConsentType` contract widened (the preserved-types test only forbids shrinking)" — false for
  `CLAIM_TIME_CONSENT_TYPES`, and it would have changed the DPDPA surface.)*
- **D16 — REVISED 2026-09-28. The claimant-to-nominee relationship (`-253` cl.2, F8)** is asked only when the claimant is **none** of the
  nominees, once **per nominee** (on D5's child row); values = `NomineeRelationship.exclude(['other'])` (derived, AC13); stored as plain
  `text` (as `member_nominees.relationship`), ⛔ not Tier-1 (a label, like `ClaimantRelationship`) — `-253` left "whether the answer is PII"
  open; this is our call and recorded. ⭐ The question fixes its **direction** in both locales — *"The claimant is the nominee's …"* — since
  half the values are inverse pairs (son/father, son-in-law/father-in-law, grandchild/grandparent).
- **D17 — NEW. The Super Admin's three decisions**, each with a **required note and a reason** (`-255` F3), all under the trustee lock, all
  re-checking `resolveClaimCorrectionState` first (a corrected claim is ⛔ never closed; if corrected, only **approve** via the ordinary vote
  remains — the Super Admin's writer 409s `closure.claim_corrected` and the claim returns to the Pariwar Admin's ordinary vote):
  - **close** → the D1 chain (`denied` + `denied_no_appeal`), ⛔ not appealable;
  - **refuse for another reason** → `state_trustee_frozen` (if needed) + `state_trustee_denied` with a reason from `STATE_TRUSTEE_REASON_CODES`
    (⛔ `other` without a note refused), **and** `denied_no_appeal` **only if** a `claim_appeals` row already exists (T4, F2);
  - **approve despite the name** → T10's writer.
  Each supersedes the live return with the conditional `UPDATE`; each writes its audit line (`resourceLocator: 'claim:<lower-case uuid>'`).
- **D18 — NEW. The review hold and the direction record (`-256`).** The closure table carries `under_review_since` + note (set by key (5));
  a NEW **directions** table: `(direction_id, claim_case_id, directed_to_actor, directed_to_role ∈ {district_admin, pariwar_admin}, kind,
  text (Tier-2 note), created_by, created_at, response_text, responded_at, responded_by)`. `kind` = `restart_family_reminders | other` —
  ⭐ **only** `restart_family_reminders` has a system effect: it opens a NEW schedule run anchored on the direction's date (the D3 table,
  ending at day 90 of **that** run or at the Super Admin's decision, whichever first), ⛔ never re-opening a closure request (the claim is
  already escalated). Reminders: the **Super Admin** every **30 days** under review (`-256` cl.2); the **directed admin** 7 days after the
  direction if unanswered, then weekly until answered (ours — `-256` left the cadence to us). ⛔ No consequence for an unanswered direction
  beyond its reminder (`-256` "does NOT cover"). ⚠ The power is **confined to escalated claims** — the direction route 409s on any other claim.
- **D19 — NEW. The re-file guard (`-254`).** A NEW **re-file confirmations** table `(claim_case_id of the closed claim, deceased_member_id,
  confirmed_by, via ∈ {district_admin, helpline}, note (required), created_at, consumed_by_claim_case_id)`. At **both** mint paths (T9), when
  the deceased member's most recent terminal claim has a closure row `closed` and ⛔ no unconsumed confirmation exists → **409
  `claim.refile_requires_confirmation`**; a mint consumes the confirmation in the same tx. The member app shows a calm "please call the
  helpline" state (en + hi) — ⛔ never a bare error. ⛔ Nothing about what carries over from the closed claim (`-254` does not rule it): the new
  claim starts empty, as any re-file does today.
- ⚠ *(`-269` §4: `carrier_reject` → `rejected_unreachable`, letter-eligible too. 6.19b v2.5: *"then escalated"* = found-dead day + 13 —
  `-231` C's *"thereafter"*.)* **D20 — NEW. The letter track's anchors, per person.** A person is **letter-eligible** from the first slot whose outcome is
  `rejected_invalid_number` (dead, `-231` C) or `no_target` (no working route, `-252` cl.2) — that date is their **found-dead day**. The District
  Admin's chase for that person's letter record (tracking number, delivery date, screenshot) runs from the found-dead day: first reminder on
  **day 7**, **daily through day 12**, then **escalated to the Pariwar Admin** (a record + a reminder; ⛔ no automatic act) (`-231` C, `-250`
  #2). The **overdue flag** is shown at **14 days after posting** (*"within 14 days of sending letter"*, `-230` 3; `-250` #3) — shown, nothing
  else. At most **two letters per person per run**; the second is due **30 days after the first's recorded delivery**, with **ONE** District
  Admin reminder then (`-231` D/F); if the run reaches day 90 first, ⛔ nothing further is required. Letters stay recordable after day 90 with
  ⛔ no reminders (`-250` #4). ⛔ The second letter gets no 7/12 chase (the Panel replaced the regular reminders with one — ours).
- ⚠ *(6.19b v2.4: the "single 30-day reminder" and `-231` D's second letter are ONE reminder **per person** — `letter_second_due` at that
  person's delivery + 30 days; ⛔ no separate `replacement_reminder` in v1.)* **D21 — NEW. The District Admin's regular reminders** follow D3's days; they are replaced by the single 30-day reminder (`-231` F, `-232` J)
  only when **every** family recipient is letter-eligible **and** each has a recorded delivery (with one person still on a working phone, the
  chase continues — ours; `-231` F was ruled for "the family's number").
- ⚠ *(`-271` §1: an accept counts only when it went to the person's CURRENT number — `recipient_number_hash`.)* **D22 — NEW. The "reached" precondition (`-252` cl.1)** is a pure function over the run's records: for **each** person who must be reached
  (each effective nominee, and the claimant when none of them), ≥ 1 reminder `accepted` (or `delivered`) **or** a letter with a recorded
  delivery date. A closure **request** refuses otherwise (**409 `closure.not_reached`**, naming ⛔ no person in the body — a count and the
  roles only).
- ✅ **D23 — CONFIRMED by `-260` G3 (A) — ⛔ no text after a Super Admin refusal or approval.** **D23 — NEW. Family notices:** the closure sends a name-free **closure notice** SMS to each reached person (en/hi per `contact_locale`); a
  Super Admin refusal or approval sends ⛔ no new SMS (W — a confirm for the Panel's next note). The member app derives
  **`closed_no_response`** through a **new contract field** on the claim status, ⛔ never `appeal_exhausted` (`deriveAppealView` would show the
  external-remedy disclosure — the wrong text).
- **D24 — NEW. The go-live gate is a record, ⛔ not a runtime flag** — unless BigDev prefers the 6.16 D-G precedent
  (`appeal_flow_legal_review_status`, a tracked config flag). Recommended: record M and S in the architectural launch-gate inventory (Story
  0.15) and this story's header; ⛔ no dormant code path that could be "switched on" untested. ⚠ Nothing is in production, so every deploy
  before counsel clears is a dev/staging deploy — the DLT template IDs stay unset there (T13 fails closed).

**⭐ APPENDED 2026-09-27 — the author decisions `-258` (V) needs (⏳ PROPOSED, in the same 6.19a Task 0 author-commit):**

- ⚠ *(`-270`: `set_by_role` also admits `super_admin`.)* **D25 — the "who must act" mark is its own append-only record**, keyed on the return's `decision_id`: `(mark_id, return_decision_id,
  claim_case_id, must_act ∈ {family, staff}, set_by_actor, set_by_role ∈ {pariwar_admin, district_admin}, note, set_at)`; the **latest row
  wins**; RLS + FORCE, own migration. ⛔ Not a column on `claim_state_trustee_decisions` (every phase shares it). The Pariwar Admin's
  `return_to_district_admin` action gains a **required** `must_act` field, written in the **same tx** as the return row (6.18's cycle-freeze
  contract + handler). A District Admin change needs a **required note** and key (7).
- **D26 — the runs follow the mark.** A **family run** exists only while the latest mark is `family`: day 0 = the return's date if marked
  `family` at the return, else the date of the latest change **to** `family` (`-258` detail 1); a change to `staff` ends the family run at once
  (the running slot's record is written `skipped_superseded`); a change back to `family` opens a **new** run (a full 90 days). A **staff run**
  exists while the mark is `staff`: the District Admin is reminded on D3's days from the return / the latest change to `staff`, **day 12** →
  escalated to the Pariwar Admin (a record + a reminder), **day 90** → escalated to the Super Admin (6.19c). The letter track (D20) runs
  only in a family run. The District Admin's own reminders (AC4) continue in both.
- **D27 — "no correction needed"** is a District Admin record (key (8)) with a **required note**, valid only with a **current, passing name
  check recorded after it** (6.18's write); recording it sets the mark to `staff` (so the family is ⛔ not chased meanwhile) and puts the claim
  on the Pariwar Admin's queue. The Pariwar Admin (`cycle.freeze`, the return's own key) **approves** — through a **NEW writer** (T2: ⛔ never
  `voteOnFrozenClaim`), under the trustee lock: a live "no correction needed" record newer than the return, the **full**
  `assertClaimApprovable` (⛔ nothing waived — unlike the `-251` path), the conditional supersede of the return, then the ordinary approval
  events — **or keeps it sent back**, re-stating the mark (`family` or `staff`) with a note — ⭐ **ratified by `-260` G2**.
- ⚠ *(D28's "reviewed" Hindi: its review is a **go-live** gate since `-267` §6.)* **D28 — the staff-case family copy** (`-258` detail 3): *"Your claim is still open — we are checking the bank details"* (en, ratified) +
  a **reviewed** Hindi line (⛔ not machine-translated); the member claim status exposes the case as a status value (e.g.
  `bank_details_being_checked` vs `bank_details_correction_needed`), ⛔ never the mark's note or who set it. `nominee.bank.correction_needed`
  shows **only** in a family case. ⚠ *(6.19b v2.0: a returned claim ⛔ never renders `correction_needed` — it renders `…_staff`; the staff case replaces `…_staff`.)*
- ⚠ **D29 — ⛔ SUPERSEDED by `-260` G1 (B): the Super Admin MAY decide a staff case — approve with the FULL approval gate (a fresh passing name check; ⛔ nothing waived), or refuse for another reason (appealable once; `denied_no_appeal` only after a used appeal), each with a note and a reason; ⛔ never close. The text below is the proposal as first written, kept.** **D29 — the Super Admin on a staff case at day 90** (`-258` detail 2, `-256` widened): the case appears on the Super Admin's queue; the Super
  Admin may **hold it under review and direct** (D18's machinery), incl. directing the District Admin to switch the mark to `family`. ⛔ **No
  Super Admin decision** (close / refuse / approve) on a staff case is built — `-258` does ⛔ not rule one, and "close for no response" is
  barred by construction. ⚠ A confirm for the next note.
- **Keys:** **(7)** change who must act — district, `district_admin` (minted by 6.19b); **(8)** record "no correction needed" — district,
  `district_admin` (minted by 6.19c). ⇒ **eight** keys in all: 6.19b mints (1) + (7); 6.19c mints (2)–(6) + (8).

**⭐ ADDED 2026-09-29 by `-266` (author-commit; the full text is the decision entry — ⛔ not restated here):**

- **D30 — nobody nameable ⇒ ⛔ no family send.** Undetermined declaration / ⛔ no contact record / agreement ⛔ not live (⚠ + `claimant_unresolved` for the claimant alone, `-267` §5c) ⇒ ⛔ no send, ⛔ no
  record for the slot, a *"cannot remind"* queue flag; D3's catch-up once fixed; the 90-day clock is ⛔ not paused (D22 protects the family).
- **D31 — the letter's own precondition:** letter-eligible in the run + THAT person's address via `resolveContactRow` (⚠ the claimant's from the block's own column, `-267` §5b) + a live agreement;
  409 `correction_letter.not_letter_eligible | .address_missing | .agreement_not_live`. D14 stays approval-only.
- **D32 — 6.19b builds BOTH family messages** (`reminder`, `closure_notice` × `hi`, `en`), their copy, the lockstep test and the DLT sheet's
  wording; 6.19c only sends the closure notice.
- ⚠ *(`-269` §5: the helpline key is per Pariwar — `sms.claim_correction.helpline_number.<pariwarId>`.)* **D33 — the SMS's variables:** the short reference (first 8 hex of the claim id, upper-cased — shown on the queue row) and the helpline
  number from config key `sms.claim_correction.helpline_number`, failing closed.
- **D34 — one District Admin reminder per claim per day**, following the open run (⭐ one per claim, `-267` §1); at most one staff push per District Admin per claim per day.

## Where the Acceptance Criteria and Tasks now live (split 2026-09-27)

⭐ The ACs are **in the slice files**, verbatim from v0.9 (AC8, AC9, AC11 restated per slice). ⛔ This file carries none — a dev agent works
from a slice's Tasks list ([[feedback_spec_edits_must_propagate_to_tasks]]).

| v0.9 AC | Now in | v0.9 Task | Now in |
|---|---|---|---|
| AC0 governance | 6.19a (for the whole set) | Task 0 | 6.19a Task 0 (b, c, d each have a preflight) |
| AC1 capture at filing | 6.19a | Task 1 migrations | split by table: a (contact, consent type), b (reminder record, letters), c (closures, directions, re-file) |
| AC2 clock · AC3 record + SMS · AC4 staff · AC5 letters | 6.19b | Task 2 | 6.19a Task 2 |
| AC6 closure · AC7 appealability | 6.19c | Tasks 3–5 | 6.19b Tasks 2–5 |
| AC8 surfaces · AC9 PII/audit · AC11 proof | restated per slice (AC8a/b/c, AC9a/b/c, AC11a/b/c) | Task 6 | 6.19c Tasks 3–5 |
| AC10 nothing else moves | carried into a, b and c | Task 7 keys | b mints key 1; c mints keys 2–6 (one author-commit in a's Task 0) |
| AC12 CC1 | 6.19d (`backlog`) | Tasks 8–9 | per slice |
| AC13 N1 | 6.19a | Task 10 friction · Task 11 CC1 · Task 12 N1 | a Task 5 · d · a Task 3 |
| AC14 Super Admin review · AC15 re-file | 6.19c | | |
| ⭐ **AC16** (`-258`) the mark, family runs vs staff runs, the staff-case copy | 6.19b (appended 2026-09-27) | | |
| ⭐ **AC17** (`-258`) the closure condition, "no correction needed", the staff case at day 90 | 6.19c (appended 2026-09-27) | | |
| AC12 → 6.19d's ACs (`-259`) | to derive — `bmad-create-story` on 6.19d | | |

## Dev Notes

### Dependency and sequencing
6.18, 6.20, 6.21a, 6.21b are `done` and merged. Migrations start at **0124** (6.19a); 6.19b and 6.19c take the next free numbers. Order: 6.19a (Task 0 first) → 6.19b → 6.19c; 6.19d after its
ruling. ⚠ 6.18's domain live specs lacked a suite timeout and its helpers
seed a passing check unconditionally (`seedNomineeNameCheck`) — ⛔ do not copy them blindly.

### Previous-story intelligence (6.18 → 6.21b)
- **6.18** built the return, the correction queue and the name-check gate; its reviews found tests that could not fail as titled, a hand-maintained
  gate that dropped routes, and a missing `resourceLocator` — each is an AC here.
- **6.20** moved "who is the nominee" to the **effective declaration at death** and locked the declaration on the first claim — T12 and D5 follow
  from it. Its `-241` is the model for Task 0's single author-commit.
- **6.21a/b** added the certificate gate to the approval chain (so the Super Admin approve must keep it), a new upload table (⛔ not
  `claim_documents`), and the `claim_live` signal; their reviews found offline caches telling a refused family "still open" — hence
  `closed_no_response` comes from a fresh server read, ⛔ never a cache.
- **Recent commits** (`c136b03c` … `b068173a`) are all governance: the Panel's answers and routing notes for this story. ⛔ No code has been
  written for 6.19.

### Files — UPDATE (read each completely before changing it) and NEW
**UPDATE:** `packages/domain/src/claim/{state-trustee-decision-persist,appeal-eligibility,icp,nominee-name-check}.ts` (the approval-gate split,
T10), `apps/api/src/modules/claims/{claims.appeal.handlers,claims.service}.ts` + the override path, `packages/contracts/src/claims/{appeal,dpdpa-consent}.ts`,
`packages/contracts/src/nominee/declaration.ts`, `packages/domain/src/nominee/relationship.ts`, `packages/domain/src/schema/consent_records.ts`,
`apps/mobile/lib/{claim-steps,appeal-status}.ts`, `apps/mobile/app/(claim)/{index,nominee-review}.tsx`, `apps/mobile/components/claim/AppealStatusCard.tsx`,
`apps/mobile/components/life-events/NomineeForm.tsx`, `apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx`, the correction-queue
read/handler/contract/view, `CycleFreezeRoute.tsx` (or a sibling strip), the admin nav, `packages/domain/src/rbac/{permissions,roles}.ts`,
`apps/api/src/audit/audit-sink.ts`, `packages/queue/src/index.ts`, `apps/jobs/src/boot.ts`, `packages/i18n/locales/{en,hi}/{claim,common}.json`,
`scripts/claim-adjudication-human-actor-invariant/check.ts`, `friction-budget.md`.
**NEW:** the tables + RLS policy files (`policies/index.ts`, `schema/index.ts`); `(claim)/contact.tsx`; the reminder sweep module beside
`contribution-notify-triggers.ts`; the claim-correction SMS template registry; the admin directory accessor; the contact / letter / closure /
Super Admin / direction / re-file handlers + routes under `apps/api/src/modules/claims/`; the admin modules (Pariwar Admin strip, Super Admin
queue, direction inbox).
**⛔ NEVER edit:** `packages/channels/src/{dispatch,render,sms-dlt-registry}.ts` and `AlertCategory`; `claim_documents` / `uploadClaimDocument`;
`voteOnFrozenClaim`'s guard; `assertClaimApprovable`'s behaviour for P1/P3/P4; `ClaimantRelationship` and its comment.

### Testing standards
[[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]], [[project_ci_local_double_run_pollution]]: never regenerate an applied
migration (42P07); never `DROP SCHEMA` (42P01); **assert membership, not counts** (shared `PARIWAR_A`); `{ timeout: 20000 }` on new domain live
specs; own-committing specs for the sweep and the races; a green turbo run is ⛔ not proof when specs self-skip without `DATABASE_URL`.
Exemplars: `apps/jobs/tests/contribution-notify-triggers.test.ts` (mocked deps, `now: () => NOW`), `apps/jobs/tests/pending-match-idempotency-live.test.ts`
(live, injected clock), `apps/api/tests/integration/claims/cycle-freeze.spec.ts` and `packages/domain/tests/integration/alert/alert-stream-concurrency.spec.ts`
(two-connection races), `apps/api/tests/unit/dpdpa-consent-copy.test.ts` (copy lockstep).

### Latest technical notes
No new library. ⚠ TRAI DLT: each content template (Hindi is Unicode — a shorter per-segment length) is registered with its `{#var#}` slots before
use; the send must match the registered text exactly — keep the copy in `claim.json` and the registered text in lockstep (a test comparing the
template registry's content against the rendered `t()` output).

### References
- `.decision-log.md` — `-229`, `-230`, `-231`, `-232`, `-250` … `-257`; `-226`, `-227`, `-228`, `-233`, `-236`, `-237`, `-241`, `-243`, `-244`.
- Routing notes `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-20-6-19-{reaching-the-family,reached-before-closure,declined-closure,refiling-after-closure,confirm-our-defaults}.md`, `…-2026-09-27-6-19-{follow-ups,f1-keep-open}.md`, `…-2026-09-27-6-20-confirm-what-we-recorded.md` (N1); the TEMPLATE.
- Stories 6.16 (D-E, D-F, D-G), 6.18 (`### Review Findings`, AC11, D4), 6.20, 6.21a/b; `deferred-work.md` 6.18 chunks 1 and 3.
- PRD (FR-43A, FR-71/72/73, §4.10, §4.14); `architecture.md` (§3.4, §2.12, AR-18, AR-61, AR-63); `ux-design-specification.md` (Stance #5, UX-DR44/54/57/67).

## Change Log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-20 | Created from `-229` → `-232`; ⚠ `backlog` — Panel questions K L M O P Q R open. |
| v0.2 | 2026-09-20 | A fresh-context validator's findings applied (the corrected-claim guard, STRICT Q-R, Q-T, D13, D14, Q-U, D7). |
| v0.3 | 2026-09-25 | Appended the `-236` CC1 item (AC12, Task 11). |
| v0.4–v0.7 | 2026-09-27 | Appended the Panel's answers `-250` … `-256` as status blocks; status stayed `backlog`. |
| v0.8 | 2026-09-27 | Appended `-257` (N1): AC13, Task 12. (v0.1–v0.8 text preserved in git at `c136b03c`.) |
| **v0.9** | **2026-09-27** | ⭐ **RE-DERIVED, ⛔ not appended** (create-story validate pass). Every claim re-verified on `c136b03c` by three read-only passes. **Panel answers folded in:** every BLOCKED tag removed; T's (1)/(2) reversals applied (stop on delivery; chase from found-dead); the schedule numbers and the day-14 flag relabelled the Panel's. **Corrected against the code:** a second return supersedes only a resubmitted one (the live `decidedAt` is the latest return's); return ⟂ R9 is now enforced; migrations start at **0124**, ⛔ not 0119; the human-actor gate now reconciles against disk; `resourceLocator` is silently replaced unless lower-case; the member appeal route 404s in production (the operator path is the real one); `nominee-review.tsx` is already two concerns (⇒ a NEW `contact` step) and the claim-flow resume gap. ⭐ **D7 REVISED:** `alert_published` is excluded from the SMS DLT registry, so F7's SMS is a **direct DLT send to an explicit number** (the OTP precedent), ⛔ not an `Alert`. **New author decisions D15–D24:** the agreement as a consent type; the relationship per nominee; the Super Admin's three decisions (the `-251` narrowing waives ONLY the name check — the certificate, accounts and determination still gate); the review hold + directions; the re-file guard keyed on the closure record at both mint paths; the letter-track anchors per person; "reached" per person; family notices; the go-live gate as a record. **New ACs:** AC14 (Super Admin review), AC15 (re-file). **§0 run:** CC1 protection 3 is the Panel's ⇒ Task 11 fenced on a routing note; **V** (a return needing no correction — the 6.18 deferred item's trigger) and **W** (notices after a Super Admin decision) found, both non-blocking. Keys 4 → **6**. **Status → `ready-for-dev`**: every Panel question on the build is answered; counsel (M, S) gates go-live only; Task 11 is fenced. |
| **v1.0** | **2026-09-27** | ⭐ **SPLIT (BigDev: *"split it three ways"*, D13)** into 6.19a (`ready-for-dev`), 6.19b and 6.19c (`ready-for-dev`, each fenced on its predecessor being `done`) and 6.19d (CC1, `backlog`). This file becomes the **shared spec**: ACs and Tasks moved to the slices (map above), the Dev Agent Record removed, the row retired. The CC1 and V routing notes **drafted** (⛔ not sent, ⛔ not committed). |
| v1.1 | 2026-09-27 | **V WIDENED** (BigDev: a family is reminded even when staff made the mistake): the note is renamed `…-2026-09-27-6-19-return-not-the-familys-to-fix.md` and now asks whether a return that is ⛔ not the family's to fix (a helpline typing error, a wrong name check, or no error) reminds the family and can ever be closed "for no response". ⭐ Best answered before 6.19b is built. |
| v1.2 | 2026-09-27 | ⭐ **The Panel ruled V (`-258`, option B) and CC1 (`-259`, option B amended — stop after 180 days).** Rulings table +2 rows; invariant 11; policy predicate 6; question table + §0 bullets marked RULED; **D25–D29** and keys (7), (8) appended (PROPOSED); the AC map gains AC16 (6.19b) and AC17 (6.19c). 6.19d unfenced, its ACs owed. |
| v1.3 | 2026-09-27 | ⭐ **`-260` (G1–G6) recorded** — every Panel question on the set is answered. D29 SUPERSEDED (G1 B: the Super Admin decides a staff case, full gate, ⛔ never close); D23 CONFIRMED (G3 A — ⚠ our B ⛔ not taken); D27's keep ratified (G2). Only counsel's M and S remain (go-live). |
| v1.4 | 2026-09-28 | ⭐ **6.19a's validate pass revises four PROPOSED author decisions before Task 0 commits them.** **D5:** capture binds to the declaration's **versions** at filing — the effective declaration (T12) is `undetermined` until the review window, so it can't size the address slots; write windows + replace-on-re-POST added. **D14:** a named check **after** `assertClaimApprovable` (which stays unchanged), per-route `…claim_contact_required` codes, and the sibling writers that must call it. **D15:** the pgEnum + `ConsentTypeSchema` only (⛔ not `DpdpaConsentType` / `CLAIM_TIME_CONSENT_TYPES`), linked per claim through `agreement_consent_id` (`-261` C3). **D16:** per nominee version; the question's direction fixed. T12 gains a note on when the effective declaration exists. Stale pointers re-expressed (the PRD §4.10 lines moved with `-263`'s FR-40 annotation; the `HelplineClaimPage` range was wrong). Code claims re-checked at `6752e0d6` (⛔ no code moved since `c136b03c`). |
| v1.5 | 2026-09-28 | 6.19a's re-validation: **D5** gains the two binding rules (member → head versions; helpline → explicit allowed `nomineeVersionId`), UNIQUE `(contact_id, nominee_version_id)`, upsert-only writes (v1.4's "a re-POST replaces" would have erased helpline-added rows and left the helpline unable to supply an effective nominee's address), add-only post-intake helpline writes under `claim.file` with the reason recorded, and the writer-level nominee-set check. **D14** gains the `agreement_withdrawn` reason. |
| v1.6 | 2026-09-28 | 6.19a's third validate pass: **D5**'s add-only rule defined (insert or fill a null column; the claimant-block write also nulls `claimant_nominee_version_id`) and scoped to the helpline's extra states only (full upsert inside `NOMINEE_BANK_COLLECTABLE_STATES`); **D14** reads the effective declaration itself and requires the relationship on every effective row when the claimant block is present. |
| v1.7 | 2026-09-28 | 6.19a's fourth validate pass: **D5** gains the two request shapes (member full, helpline partial), `agreement_required` on the creating write, and the agreement repointing rules; **D14**'s predicate parenthesised. |
| v1.8 | 2026-09-28 | 6.19a's fifth validate pass: **D5**'s add-only refusals get an outcome (409 `claim_contact.add_only`, nothing written; `claimantNomineeVersionId` refused in the extra states) and helpline nominee rows take an optional address and relationship. |
| v1.9 | 2026-09-28 | 6.19a's sixth validate pass: **D5**'s claimant-block exception narrowed to a non-effective stored claimant version; the parent CHECK's two sides cleared symmetrically in every write; `claim_contact.address_required` named. |
| v1.10 | 2026-09-28 | 6.19a v1.7 (external review): **D5** gains `claim_contact.awaiting_determination` (a claimant-block write in the extra states while the effective declaration is ⛔ not `effective`), a revoked agreement counting as missing (fillable in any window), and the audit unit; **D14** selects rows by effective `versionId`, ⛔ never a count. |
| v1.11 | 2026-09-28 | 6.19a v1.8 (fresh-context validate): **D5** rewritten as the table shape + a pointer to 6.19a AC1's **W1–W10** as the ONE copy of the write rules (projected versions, the claimant-side fills, `claimant_required`, `agreed` alone, `locale`, the audit unit) — ⛔ no second restatement to drift; **D8** records the `claim.view_nominee_name_check` reuse-check (presence-only; plaintext under `claim.file`); **D14** pins the reason precedence. Glyph register: six positive clauses that carried `⛔` corrected. |
| v1.12 | 2026-09-28 | 6.19a v1.9: **D5**'s pointer list gains **W4a** (the correction chain — a 6.20 correction ⛔ never orphans an address or the claimant link); **D14** resolves rows through it. |
| **v1.13** | **2026-09-29** | ⭐ **6.19b's validate pass + author-commit `-266`:** D2 SUPERSEDED (a runs table — the return's `decision_id` collided on a family → staff → family switch); D3 keyed by run kind + `-260` G4; D14's letter-writer clause SUPERSEDED (D31); **D30–D34 added**; D8's arithmetic marked (`-265` §2); T14's migration number marked (6.19b starts at 0126); the status table (6.19a `done`) and the LETTERS / Decisions headers (COMMITTED). ⚠ *What already EXISTS* stays pinned to `c136b03c` — for 6.19b's scope, 6.19b v2.0's *§ What 6.19a shipped, and what moved* (re-derived at `f06ee41f`) is the current record. |
| v1.14 | 2026-09-29 | ⚠ **`-267`** (erratum to `-266`, from re-validating 6.19b v2.0): one open run per **claim**; the resolver returns runs open **or ended**; `resubmitted` pauses a run; `subject_key` on per-person items; the claimant's letter address is the block's; `direction` only while `family`; D30's `claimant_unresolved`; **D28 amended** — the Hindi review is a go-live gate. The decision entry is the text; ⛔ not restated here. |
| v1.15 | 2026-09-29 | ⚠ **`-268`**: invariant 2's "corrected" also means "the family's part is done"; D4's pause (via `-267` §3) is widened to it. |
| v1.16 | 2026-09-29 | ⚠ **`-269`**: the latest check decides "the family's part is done"; two pause tiers (D4); ⛔ no family run during a Super Admin hold (6.19c fills 6.19b's opener hook — T11/D18); D20 gains `rejected_unreachable`; D33's helpline key is per Pariwar. |
| v1.17 | 2026-09-29 | 6.19b v2.5's re-check: invariant 2 marked with `-269` §1; D20's escalation day (13); D21 read as one reminder per person; D25's role set gains `super_admin` (`-270`). |
| v1.18 | 2026-09-29 | ⚠ **`-271`**: D22 counts only accepts to the person's current number; ⛔ no staff run on a switch during a Super Admin hold. |
