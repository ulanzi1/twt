# Trustee Panel routing note — the staff check before a drive: what "the date the fee was paid" means, and what the family is told

> **Status: WRITTEN 2026-10-31; SENT 2026-11-21** (reported by BigDev; ⛔ ruled). Written from Story 6.39's create-story and its validation (Task 0.3), which build
> the staff check you ruled on 31 October. ⛔ Member uses the system yet. ⛔ Nothing waits on this note to be built or merged.

## §0 — the gate

**It is the Panel's:** Q1 and Q2 decide whose families the Trust helps when the joining fee and the death fall close together (what the
Trust OWES); Q3 and Q4 decide what a family is told about a person after a claim is filed (what the Trust DISCLOSES) — and your 31 October
words for that were ruled for the moment of filing only, so using them later would extend them. **Split out and ⛔ asked — ours, and
already decided in the story:** how the check is stored, which staff member does it (the District Admin who already accepts the death
certificate), how its screens are worded for staff, that a failed identity check makes the claim wait rather than refusing it, and that
the system — ⛔ the staff member — makes the date comparison, which staff cannot override (told to you below, so you can object). **Stripped of every reference, the questions read:** *"if a member pays the joining fee on the day they
die, or pays in life but the payment is only recorded after they die, does the Trust help their family? And when the Trust cannot help,
or cannot yet, what does it tell them?"* — questions about people, ⛔ about code.

---

> ## ⏳ AWAITING PANEL RULING — SENT (reported by BigDev, 2026-11-21)
>
> **SENT.** BigDev told the session on 2026-11-21 that this note has been sent to the Panel (*"sent the note to Panel"*), after its E4
> was re-run at `eedc9be3` and told line 4 was added (committed `abe2d306`). ⚠ NOT recorded anywhere in the repo: the channel, the
> time, and whether the text sent is identical to this file as committed at `abe2d306` — the file below is kept as it was then.
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new decision
> id. ⭐ Everything below is then kept **unedited** as the question **as it was put** ([[feedback_supersede_never_reinterpret]]).

---

# The questions

**In one sentence:** before any drive opens, staff will compare the date of death on the certificate with the date the joining fee was
paid, and no drive opens if the fee came after — but a certificate shows a **day**, not a time, and the system knows only when the
payment was **recorded**, not when the bank moved the money; so where exactly is the line, and what is the family told?

**Why it cannot be decided without you:** your ruling stops a drive when the fee was paid *after* the death. It does not say what happens
when the fee was paid **on the same day**, or when it was paid in life but recorded after the death — and each answer either helps a
family or turns one away. What the family is told is a disclosure you have ruled on only at the moment of filing.

## The one fact that decides it

**The system cannot see the moment of death or the moment of payment — only two days.** The certificate gives the **day** of death. The
system records the fee at the moment the member types the payment's reference number into the app — ⛔ when the bank moved the money —
and nothing limits how long after paying that may be. So "after the death" can only mean "on a later day than the death", and two cases
fall in the gap: a fee recorded **on the day of death** (Q1), and a fee **paid in life but recorded after** (Q2). Your own rule for nominee
changes already drew this same line once: *a change done before a day of death is the member's; everything else is discarded* — the day of
death counts as after.

---

# Q1 — a joining fee recorded on the day of death

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **The same day counts as before** — the drive may open. (How it is built today, because your words stop a drive only when the fee came *after*.) | A member who paid on the morning of the day they died is helped. | A fee paid hours **after** a death, the same day, also opens a drive — and that is the case your ruling was written to stop (it needs the dead member's phone and a real payment). It also differs from your nominee-change rule, which counts the day of death as after. |
| **B** | **The same day counts as after** — ⛔ drive (our suggestion). | A family whose member paid on the day of death is told no drive can open. | A real member who paid in the morning and died that evening gets ⛔ drive. The case is rare: the member's first payment and their death must fall on one day. |
| **C** | **Use a time of death when one is known** — staff use the time recorded from the original certificate at the home visit, where there is one; else B. | Families whose certificate shows a time are judged by the hour. | Few certificates carry a time; staff do more work; two families with the same facts can be treated differently by what their certificate happens to show. |

**Our reading:** **B** — **because** it is the line you already drew for nominee changes (the day of death counts as after), so the
Trust has one rule for "before the death" rather than two; and the Trust's own rulebook keeps a new member's eligibility locked for its
first days after paying, so a same-day death is outside cover under the rulebook too. Its cost is a real member who paid that morning.
You can reject this reading and still use the table. **Built until you rule: A.**

# Q2 — a fee paid in life but recorded after the death

**In one sentence:** if a member pays the joining fee and dies before the app records it — or the family records it later from the
member's phone — the system sees a fee after the death and opens ⛔ drive, for good; should staff be able to use the bank's date instead?

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **The recorded date is the date** (how it is built). | The family is told no drive can open. | A member who really paid in life is treated as never having paid in time — and nothing staff can do changes it. |
| **B** | **Staff may use the bank's date** when the Trust's own bank statement shows the money arrived before the death; they record that they did, with a reason, and it is audited (our suggestion). | The family is helped if the bank's record bears it out. | A new staff power over a bright line; someone must match the payment against the Trust's bank statement; and it is a new piece of work, ⛔ built. |
| **C** | **Refuse as in A, but let the family appeal** on these grounds. | The family can ask for a second look. | The appeal can look again, but even an appeal that agrees with the family **cannot open a drive** — nothing reverses a fee date (see the first told line below). So C promises a remedy it cannot give. |

**Our reading:** **B** — **because** the Trust's own bank record is the honest answer to "when was the fee paid", and it separates a
member who paid in life from a fee paid after the death, which a recorded date cannot. Its cost is a staff power and new work. **Built
until you rule: A.**

# Q3 — what the family is told when no drive can open because the fee came after the death

**In one sentence:** after the family has filed and sent documents, staff find the fee came after the death and refuse the claim; today
the family's app says only *"This claim was not approved"* — should it say why?

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **As today** — the refusal, ⛔ reason. The app says *"This claim was not approved. If you believe that was a mistake, you can ask us to look at it again."* | The family is told no and can ask for a review. | After filing and sending documents, the family learns nothing about why. |
| **B** | **The one general reason** you ruled at the door: *"the person was not a member of the Trust when they died"* (our suggestion). | The family hears the same words they would have heard at the door. | Your words were ruled for the moment of filing; using them later extends them. It is a small disclosure — and it is true for this person. |
| **C** | **The specific reason** — *"the joining fee was paid after the date of death on the certificate."* | The family knows exactly what happened. | It tells the family exactly what to dispute, and how a later family could avoid it. |

**Our reading:** **B** — **because** it is true, it is the same words a family hears at the door, and it says no more. **Built until you
rule: A.**

# Q4 — what the family is told while staff cannot yet confirm the person's identity

**In one sentence:** for a member who typed in their own identity details, staff now check from the death documents that the person who
died is the member; if they cannot yet confirm it, the claim waits — what does the family see while it waits?

Today, once the certificate is accepted, the family's app says *"The death certificate has been accepted."* and nothing more. There is ⛔
way in the app for staff to ask the family for another document. Staff may phone the person who filed the claim (their agreement covers
calls); phoning a **nominee** waits on the lawyer's answer already being sought.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **As today** — the family sees the certificate was accepted, ⛔ more. | Nothing changes. | The family believes the claim is moving while it is waiting, with no end date. |
| **B** | **One line:** *"We need to confirm a few details before this claim can go ahead. Our staff will contact you."* (our suggestion). | The family knows the claim is waiting and that someone will be in touch. | It promises contact — staff must then make it; for a nominee that waits on the lawyer's answer. It does not say what is being checked. |

**Our reading:** **B** — **because** an open-ended silence after a death is the harder thing for a family, and the line promises only
what staff can do. **Built until you rule: A.**

---

# Shown for information — ⛔ asked (object if you disagree)

1. **An appeal cannot open a drive when the fee came after the death.** A refusal for that reason can be appealed once, as any refusal
   can, with ⛔ time limit — but even an appeal that agrees with the family cannot open a drive, because nothing changes the fee date
   except a new death certificate with a different date. At the door, by your Q2 ruling of 31 October, there is ⛔ appeal at all.
2. **A failed identity check makes the claim wait — it does not refuse it — and the wait has ⛔ time limit.** Staff can still refuse the
   claim in the usual way if they conclude it is not the member.
3. **A member whose joining finished only after the death.** A member may pay the fee before the last joining steps are done (choosing a
   nominee, a health declaration, agreeing to the terms). If they die in between and the family finishes those steps from the phone, the
   fee date is still before the death, so the drive may open — although by the rulebook the person became a member only after they died.
   Built on your words ("the date the fee was paid"); you may make it a question.
4. **The system compares the two dates, and staff cannot change its answer.** Your words were *"staff compare"*. As built, the system
   reads the fee date from the payment record and the date of death from the accepted certificate; the District Admin sees both dates
   and the result and records the check, but types neither date and cannot override the result. That is narrower than your words: it
   leaves staff no judgement on the fee date. Q2 B would give them one, in one case only. If you meant staff to judge it, say so.

---

# What is at stake right now

- **Live today:** nothing — no member uses the system.
- **Blocked:** nothing. The staff check is now built with **A** on all four questions — it is in code review, ⛔ merged yet — and can
  be merged; your answers are needed before
  members' claims go live (our own go-live list carries them).
- **If nothing is decided:** A stands on all four: a same-day fee opens a drive; a fee recorded after the death never does, even if paid
  in life; a refused family is told no reason; a waiting family is told nothing.

# How much to trust this note

- **Earlier versions of this question:** your 31 October ruling (the fee date) recorded that a fee paid on the day of death was ⛔ decided
  by its words and that what the family is told was ⛔ ruled; this note is the follow-up that ruling asked for. Q2 and Q4 are new.
- **Corrected in this note:** (1) The story first suggested **A** on Q1 without mentioning your nominee-change rule; checking found that
  rule counts the day of death as after, and the suggestion is now B. (2) The story first said a family whose identity check waits "is
  asked for more"; checking found nothing in the app can ask, so Q4 now asks what they are told. (3) The story first said every staff call
  to the family waits on the lawyer; in fact only a call to a nominee does. (4) Re-checked on 21 November against the built staff
  check, before sending: it does what this note says on every point, and told line 4 was added — the note had shown that staff cannot
  override the date comparison only in the evidence, ⛔ to you.
- **Still uncertain:** (1) how often Q2 happens — I have found ⛔ time limit between paying and recording, but ⛔ measured how long
  members take; (2) whether the Trust's bank statement can be matched to a fee by its reference number in practice — ⛔ traced; (3) the
  rulebook's lock-in clause is a rulebook, ⛔ ratified by you, so its weight in Q1 is yours to judge.

# In plain English

Before any drive opens, staff will check the date of death on the certificate against the date the joining fee was paid, as you asked.
But a certificate gives a day, not a time, and the app records the fee when the member types in the payment's reference, not when the
bank moved the money. So we need you to say where the line falls. For a fee recorded on the day of death, we suggest counting that day as
after the death — the same line you drew for nominee changes. For a fee paid in life but recorded only after the death, we suggest letting
staff use the Trust's own bank record of when the money arrived. When no drive can open, we suggest telling the family the same words they
would hear at the door — "the person was not a member of the Trust when they died". And while staff are still checking who the person
was, we suggest one line telling the family that staff will be in touch, instead of silence. Until you answer, the system is built the
other way on all four, and nothing goes live.

If this section and the evidence below ever disagree, the **evidence** is the record.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

**Question ↔ story mapping.** Q1 = Story 6.39 PQ1 (a); Q2 = PQ1 (b); Q3 = PQ2 (i); Q4 = PQ2 (ii); told lines 1–3 = TL1–TL3; told
line 4 = N3 (the binding comparison, declared a narrowing in `2026-11-21-472`).

## E1 — What is already ratified, verbatim

- **`2026-10-31-430` Q1 B (ruling 1):** *"**Before any drive opens**, staff compare the **date of death on the certificate** with the
  **date the fee was paid**, and ⛔ drive opens if the fee was paid after the death. This is added to the staff check that `-424` Q1 (a) C
  already requires before any drive."* Cost as put, accepted: *"The staff step is ⛔ built yet and grows by one comparison; it must exist
  before members' claims go live, as you already ruled for it. The family is stopped LATER — after filing and sending documents — which is
  harder news than a refusal at the door. Until it is built, A stands."*
- **`2026-10-31-430` Q2 A (ruling 2):** refused at the door, as built — cost: *"… there is ⛔ appeal."*
- **`2026-10-31-424` Q1 (a) C (ruling 1):** *"A claim for someone who typed in their own identity details, never verified since, is
  **filed** — but **the identity is checked first**, by staff, from the death documents and the details on record, **before any drive
  opens**."*
- **`2026-10-31-424` Q3 B (ruling 5):** the caller and the app are told *"the person was not a member of the Trust when they died"* — a
  refusal **at the door**.
- **`2026-09-20-235` Y:** *"A change done before a day of death will be assumed to be done by member, everything else will be discarded."*
  Its reading (4): *"a change made **on the day of death or any day after** is **discarded** … ⚠ *"a day"* we read as **calendar days in
  Indian time**."*
- **`2026-10-20-367` decision 2:** the claimant's filing agreement names *"text message, WhatsApp, phone call and post"*.
- **Roster Row 34** (`claim-contact-nominee-call-basis`): counsel's written basis before a District Admin's call reaches a **nominee**.

## E2 — What is NOT ratified

- **A fee recorded on the day of death.** `-430` reading (1): *"⚠ A fee paid ON the day of death is ⛔ decided by these words: a
  certificate carries a date, ⛔ a time. Row `6-39`'s create-story must put that edge, ⛔ assume it."*
- **"The date the fee was paid" = the recorded instant.** `-430` reading (1) reads it as the receipt's `paidAt` — a reading, ⛔ ratified.
  It also notes *"⚠ That is ⛔ always the date of the member's `pending-fee → lock-in` step"* — told line 3.
- **What the family is told after filing.** `-430` reading (3): *"⛔ ruled. Row `6-39`'s create-story owes it."* `-424` Q3 B is scoped
  to the door.
- **What a waiting family is told.** No ruling.
- **That the comparison binds staff.** `-430` Q1 B says *"staff compare"*. `2026-11-21-472` — an AUTHOR-COMMIT (BigDev), ⛔ a Panel
  ruling — builds it as the system's comparison: *"BINDING — STAFF TYPE NEITHER DATE AND CANNOT OVERRIDE THE RESULT, A DECLARED
  NARROWING"*. Told line 4.
- **Niyamavali §2.2** — *"Joining lock-in: a new member's beneficiary eligibility is locked for [[15 days]] after fee payment."* — a
  rulebook, ⛔ ratified ([[feedback_niyamavali_rulebook_not_spec]]); ⛔ built in the claim path.

## E3 — What the code actually does (and what Story 6.39 will build)

- **The fee's recorded instant:** `vyawastha_shulk_receipts.paid_at timestamptz NOT NULL DEFAULT now()`; `insertVyawasthaShulkReceipt`
  never passes it ⇒ the database's time at the member's UTR confirm. The fee routes (`/intent`, `/confirm`) carry ⛔ expiry or TTL
  (the handler file contains neither word — an absence, checked by grep).
- **The joining event's UTR is the request's:** the `pending-fee → lock-in` confirm emits `member.vyawastha_shulk_paid` with the body's
  `utr` (Story 6.39 G3) — why the story matches the receipt by member too.
- **The lock-in gate** (`member/lock-in-gate.ts`, `evaluateLockInGate`) needs a nominee, a medical disclosure and a T&C consent; a
  receipt commits before it runs (told line 3).
- **What the family sees on a denial:** only `appeal.eligible` — *"This claim was not approved. If you believe that was a mistake, you
  can ask us to look at it again."* (`packages/i18n/locales/en/claim.json`); ⛔ reason text.
- **What the family sees once the certificate is accepted:** `certificate.accepted` — *"The death certificate has been accepted."* ⛔
  documents-request route exists, and an accepted certificate closes uploads (Story 6.39 Policy meaning).
- **Appeals:** a denial is appealable once, with ⛔ deadline (`appeal-eligibility.ts`: *"D-E removed the claimant-facing deadline"*);
  only a `post_death_nominee_change` refusal has a 90-day limit.
- **Built (Story 6.39 — in code review, ⛔ merged; re-checked 2026-11-21 at `eedc9be3`):** `compareFeeDateWithDeathDate`
  (`claim/fee-death-date.ts`) computes `before_death` / `same_day` / `after_death` from the IST date of `paid_at` and the accepted
  certificate's date; only `after_death` blocks the approval gate (`MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES = ['after_death']`), so
  `same_day` passes (Q1 A); ⛔ staff override (Q2 A; told line 4); ⛔ new family words (Q3 A, Q4 A — the story changes nothing under
  `packages/i18n`); an identity staff could not confirm makes the gate answer `identity_not_confirmed` — the claim waits, ⛔ refused
  (told line 2); `fee_paid_after_death` is a deny reason on both denials and is appealable once with ⛔ time limit (told line 1).

## E4 — Commands to re-verify every claim

Re-run 2026-11-21 at `eedc9be3` on `story/6-39-identity-check-before-a-drive-for-an-unchecked-identity` (the built code, before
sending); every one returned what is stated. First run 2026-10-31 at `f792d4e3` (`22979b70` after the 2026-11-21 rebase) — there the
first command's looser pattern found two lines; it now also hit `-438`'s heading, which names `-424`, and the last returned
`ready-for-dev`.

```
grep -n '^### Decision 2026-10-31-4\(24\|30\):' .decision-log.md       # two entries: -430, -424
grep -c "Row \`6-39\`'s create-story must put that edge" .decision-log.md  # 1 (-430 reading 1)
grep -c "Row \`6-39\`'s create-story owes it" .decision-log.md            # 1 (-430 reading 3)
grep -c "A change done before a day of death will be assumed to be done by member" .decision-log.md   # ≥ 1 (-235 Y)
grep -c "on the day of death or any day after" .decision-log.md          # 1 (-235 Y reading (4); ⚠ "calendar days in Indian time" alone first hits another entry)
grep -n "Joining lock-in" /Users/dev/Developer/projects/TWT/docs/legal/niyamavali.md   # §2.2 (git-ignored corpus, main checkout)
grep -n "paid_at" packages/domain/src/schema/vyawastha_shulk_receipts.ts  # timestamptz, default now()
grep -c -i "expir\|ttl" apps/api/src/modules/vyawastha-shulk/handlers.ts  # 0 — ⚠ the ABSENCE is the finding (no time limit)
grep -n "export async function evaluateLockInGate" packages/domain/src/member/lock-in-gate.ts
grep -n '"appeal.eligible"\|"certificate.accepted"' packages/i18n/locales/en/claim.json   # the two family lines quoted
grep -n "D-E removed the" packages/domain/src/claim/appeal-eligibility.ts  # ⛔ appeal deadline
grep -n "^## Row 34" docs/launch-gate-inventory/inventory-roster.md      # nominee-call basis
grep -n "^  6-39-identity-check" _bmad-output/implementation-artifacts/sprint-status.yaml   # review (built; was ready-for-dev on 10-31)
grep -c "STAFF TYPE NEITHER DATE AND CANNOT OVERRIDE THE RESULT, A DECLARED NARROWING" .decision-log.md   # 1 (-472, told line 4)
grep -n "istDateOf(paidAt)" packages/domain/src/claim/fee-death-date.ts   # the fee's Indian calendar date
grep -n "MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES: readonly" packages/domain/src/claim/membership-check-approval.ts   # ['after_death'] — same_day passes (Q1 A)
grep -n "reason: 'identity_not_confirmed'" packages/domain/src/claim/membership-check-approval.ts   # the claim waits (told line 2)
grep -n "Every other reason: ⛔ no time limit" packages/domain/src/claim/appeal-eligibility.ts   # told line 1
git diff --name-only origin/main...HEAD -- packages/i18n | wc -l          # 0 — ⚠ the ABSENCE is the finding (no new family words; branch-only, until merged)
```
