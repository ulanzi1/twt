# Trustee Panel routing note — the bank's date for a joining fee: a family already refused, a reference that does not match, the day of death, and whether one person's word is enough

> **Status: WRITTEN 2026-11-21; brought into line 2026-11-27; SENT (BigDev — the 27 November version, as committed at `f01b7c24`;
> channel and time ⛔ recorded); RULED 2026-11-27 — `2026-11-27-511` (DR + KB).** The status as first written: Written from Story 6.39a (its Task 0.3), which builds your 21 November
> answer to Question 2 — *staff may use the bank's date*. No member uses the system yet. Nothing waits on this note to be built or
> merged; members' claims going live waits on your answers. Brought into line on 27 November with the build decisions BigDev made
> that day (Story 6.39a Task 0.2); the four questions are unchanged.

## §0 — the gate

**It is the Panel's:** Q1, Q2 and Q3 are the three edges your 21 November ruling left open, and each decides whether a particular
family is helped (what the Trust OWES). Q4 — whether one staff member's reading of the bank statement is enough — decides how much
one person's word can do to open a drive that members pay for; the record of your ruling notes it was not asked. **Split out and not
asked — ours, decided by BigDev on 27 November:** which staff member records the date (the finance officer — told to you below, so you can
object), what is stored, how the screens read for staff, and how the system compares a payment reference. **Stripped of every
reference, the questions read:** *"If a family has already been refused, can the bank's record still help them? If the payment
reference the member typed is wrong, can they be helped at all? If the money reached the Trust on the very day the member died, is
that in time? And is one person reading the bank statement enough?"* — questions about people, not about code.

---

> ## ✅ RULED — 2026-11-27, Trustee-ratified (Dhiraj Rahul + Kalpana Bharti), relayed by BigDev
>
> **Verbatim as relayed:** *"by DR and KB / Q1 B, Q2 A, Q3 A, Q4 A"* — recorded as [`2026-11-27-511`](../../.decision-log.md#decision-2026-11-27-511),
> committed ALONE (`50e28068`).
>
> - **Q1 — B.** The bank's date also helps a family once its appeal sends a refused claim back (our suggestion; as built).
> - **Q2 — A.** Only a statement line carrying the same reference counts (our suggestion; as built).
> - **Q3 — A.** A bank date on the day of death counts as after — no drive (our suggestion; as built).
> - **Q4 — A.** One finance officer's record is enough (our suggestion; as built).
> - The told lines 1–7: ⛔ objection recorded — and ⛔ that is NOT a ratification; they stay ours, as built. Each option's cost, as put
>   below, is accepted with it.
>
> Everything below is kept **unedited** as the questions **as they were put** ([[feedback_supersede_never_reinterpret]]).

---

# The questions

**In one sentence:** on 21 November you ruled that staff may use the bank's date when the Trust's own bank statement shows a joining
fee arrived before the death; building it raised four things your words do not settle — whether it still helps a family already
refused, what happens when the member's recorded payment reference is not on the statement, whether money arriving on the day of
death is in time, and whether one person's reading of the statement is enough.

**Why it cannot be decided without you:** each answer either helps a family or turns one away, or decides how far the Trust relies on
a single person. Your ruling gave the remedy; these are its edges.

## The one fact that decides it

**The system cannot see the Trust's bank statement — a person reads it and types what it shows.** The bank's date can help only a
family whose recorded payment reference appears on that statement. The system can check the reference the person types against the
one recorded for the member; the **date** is that person's word. All four questions follow from this: when the person may type it
(Q1), what happens when the member's recorded reference is not on the statement (Q2), where the line falls for the date they type
(Q3), and whether one person typing it is enough (Q4).

---

# Q1 — a family already refused

**In one sentence:** a family can be refused for a late-recorded fee before anyone has looked at the bank statement — can the bank's
date still help them?

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Only before the claim is refused.** | A family whose claim is still waiting is helped. A family already refused is not, whatever the bank shows. | Nothing makes staff look at the bank first — the District Admin's screen tells them to record the check and then, if the member may have paid before the death, to ask the finance officer before refusing; it does not stop them refusing. So the order in which staff happen to act decides whether a family is helped. |
| **B** | **Also after the family's appeal sends the claim back** (our suggestion). | A refused family that appeals, and whose appeal is allowed, can then be helped by the bank's date. | The first thing we told you on 21 November — *"even an appeal that agrees with the family cannot open a drive"* — stops being true in this one case. The appeal must be allowed **before** the finance officer can record the date (while a claim is refused, the system accepts no bank date), so the people hearing the appeal decide on what they are told, not on a recorded check. If the bank then does not bear it out, the claim is refused again at the final vote — and a claim can be appealed only once. |
| **C** | **Staff may reopen a refused claim directly**, without an appeal. | A refused family is helped as soon as the bank's record is found, without having to appeal. | A new way to undo a refusal, beside the appeal you already have. It is not designed: someone must decide who may reopen, and on what. New work. |

**Our reading:** **B** — **because** your remedy has no time limit in its words, and the appeal is the family's existing second look;
under A, a family is helped or not by which staff member acted first. Its cost is that an appeal can now lead to a drive in a case
where we told you it could not. You can reject this reading and still use the table. **Will be built until you rule: B.**

# Q2 — a payment reference that does not match

**In one sentence:** the payment reference a member (or, after a death, the family) types into the app is never checked against a
bank; if it was typed wrongly, no line on the Trust's statement carries it — may staff match the payment some other way?

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Only a statement line carrying the same reference counts** (our suggestion). | A member whose recorded reference is on the statement is helped. A member who really paid, but whose reference was recorded wrongly, is not. | Nothing can correct a wrongly recorded reference today, so for that member there is no remedy at all — a typing mistake decides it. |
| **B** | **Staff may match by amount, day and the payer's name instead**, and a second staff member must agree. | A member whose reference was mistyped can still be helped. | Every joining fee is the same amount, so this is a judgement between look-alike payments, and another person's payment could be taken for the member's. The finance officer must be shown the member's name, which otherwise they never see. |

"The same reference" means the same digits and letters. Capital or small letters, and a stray space, are not treated as a difference —
that part is ours.

**Our reading:** **A** — **because** the reference is the only thing on a bank statement that ties a payment to this member; anything
else is a guess between payments of the same amount. Its cost is a real member defeated by a typing mistake. **Will be built until
you rule: A.**

# Q3 — the bank's date on the day of death

**In one sentence:** on 21 November you ruled that a fee **recorded** on the day of death counts as after it; does the same line hold
when the **bank's** date is the day of death?

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **It counts as after — no drive** (our suggestion). | A family whose member's money reached the Trust on the day they died is told no drive can open. | A member whose money arrived that morning and who died that evening gets no drive — the cost you accepted on 21 November for the recorded date. |
| **B** | **It counts as before — the drive may open.** | That family is helped. | Two different lines for "before the death": the day of death counts as after for a recorded date and as before for a bank date. A payment made hours after a death, on the same day, would open a drive. |

**Our reading:** **A** — **because** it keeps one line for "before the death", the one you drew on 21 November. **Will be built until
you rule: A.**

# Q4 — whether one person's word is enough

**In one sentence:** the finance officer types the date they read on the statement, and nobody else checks that date — is that enough,
or must a second person confirm it?

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **One finance officer's record is enough** (our suggestion). The District Admin then checks the claim again and the final vote follows — but neither of them sees the bank statement. | The family is helped as soon as the date is recorded and the claim is checked again. | One person's typed date can open a drive. A wrong date — a slip or a dishonest one — is caught only if someone later compares the record (who typed it, when, which statement and line, why) with the statement itself. The system can hold the date to very little: the reference must match, and the date cannot be in the future or before the member joined. |
| **B** | **A second person who also has the bank statement must confirm the date** before it counts. | The family waits for two people. | The Trust needs two people with access to its bank statements; whether it will have even one finance officer is not settled. Slower for the family. New work. |
| **C** | **Keep a copy of the statement line with the record**, so anyone checking later can see it. | No change for the family. | The Trust's statement shows every other payer's name and payment address. Keeping pieces of it is a new store of other people's data, which nobody has asked for and the lawyer has not looked at. |

**Our reading:** **A** — **because** the record names the statement, the line and the reason under the finance officer's own name, so
it can be checked afterwards, and B asks for staff the Trust may not have. Its cost is real: until someone checks, one person's word
stands. **Will be built until you rule: A.**

---

# Shown for information — not asked (object if you disagree)

1. **Who does it.** The Trust's finance officer — the role that already checks payments against bank statements — records the bank's
   date. The District Admin then checks the claim again, and the approvals follow as always. The system refuses that re-check from
   the same person who typed the date, whatever roles they hold. The first approver and the final voter are kept apart by role only: a
   person given both the finance officer's role and an approver's or the final voter's — or the Super Admin, who holds every power —
   could type the date and later approve the claim or cast the final vote. If the Trust has no finance officer, only the Super Admin can
   record a bank date — and then someone else must check the claim again, or it waits.
2. **What is kept.** No copy of the bank statement. The finance officer types the payment reference and the date, picks a reason, and
   writes a note saying which statement and what they saw; all of it is recorded under their name. The typed reference is checked and
   not kept.
3. **What the finance officer sees.** Not the dead person's name, and not the date of death. They see the date the payment was
   recorded, the amount and the last four characters of the reference — and so they learn that the member died on or before that
   recorded date, and nothing more exact.
4. **Nothing makes anyone look.** Your word was *"may"*. A District Admin can refuse a claim for a late-recorded fee without the bank
   statement having been looked at. Their screen tells them to record the check and then, if the member may have paid before the
   death, to ask the finance officer before refusing — the finance officer can act only once that check is recorded. Q1 is about what
   happens if they refuse first.
5. **The first thing we told you on 21 November is no longer true.** We said nothing changes the fee date except a new death
   certificate. The bank's date is now a second way — and, under Q1 B, an appeal can lead to a drive in this one case.
6. **The family is told nothing new.** While the finance officer looks, the family sees what it sees today. The one waiting line you
   ruled on 21 November stays for the identity check only.
7. **A later bank date never counts against a family.** If the bank's date is later than the recorded date (a bank can show a payment
   a day or two after it was made), the system keeps the recorded date. Your words let staff use the bank's date when it shows the
   money arrived *before* the death; a later date shows nothing of the kind, so it is never used to hold a claim.

---

# What is at stake right now

- **Live today:** nothing — no member uses the system.
- **Blocked:** nothing. The remedy is not built yet. It will be built with **B** on Q1 and **A** on Q2, Q3 and Q4, and can be merged
  that way; your answers are needed before members' claims go live (our own go-live list will carry them).
- **If nothing is decided:** those four stand as built, and this point stays on the go-live list.
- ⚠ **Read with the note on an optional fee, sent alongside** (`trustee-panel-routing-note-2026-11-21-registration-fee-optional.md`).
  If you make the joining fee optional there, a fee recorded after the death no longer needs to stop a drive at all — the day the person
  pressed "Submit" decides instead — and most of this note matters only while the fee is required. If you keep the fee required, this
  note stands exactly as written.

# How much to trust this note

- **Earlier versions of this question:** the record of your 21 November ruling listed three of these as not covered by it — when the
  bank's date can be used, how a payment is matched, and a bank date on the day of death — and noted that whether a second person
  must agree was not asked. This note is that follow-up.
- **Corrected in this note:** (1) The story first told you, as a flat fact, that the person who types the date never decides the
  claim. Checking found that staff roles do not separate people — one person can hold two roles. The system will now refuse the
  re-check from the same person, and told line 1 says plainly what is kept apart by role only. (2) Whether a second person must
  confirm the date was first only told to you; it is now Q4. (3) The story first compared the reference character for character; a
  reference a member typed in small letters and a bank prints in capitals would have failed for no reason. Capitals and stray spaces
  are now ignored. (4) On 27 November, told line 1 was widened: the first approver, not only the final voter, is kept apart by role
  only, and a claim waits if the only person who could re-check is the one who typed the date. (5) Told line 4 and Q1 A's cost first
  said the District Admin's screen tells them the finance officer "can check first"; the finance officer can act only after a check
  is recorded, so the screen says to record the check, then ask. (6) Told line 7 was added.
- **Still uncertain:** (1) Whether the Trust's bank statement shows a payer's reference in a form that can be matched in practice —
  not traced; the only statement samples we have are made up, so the first real use is the test. (2) Whether the Trust will have a
  finance officer — the list of roles and staff hiring are both still open. (3) How often any of this happens — not measured.
  (4) That a claim refused a second time, after an allowed appeal, cannot be appealed again is our reading of the code, not something
  we ran. (5) The rulebook's joining lock-in is not built and not ratified by you; under it a payment that arrived in the lock-in
  days before a death would still be outside cover, and this remedy helps such a family. (6) Recording a bank date
  needs a second sign-in code (decided 27 November), and the system cannot yet deliver that code to staff in production — until it can, the remedy cannot
  be used there. It is on our go-live list.

# In plain English

You ruled that when a member paid the joining fee in life but the payment was only recorded after they died, staff may use the date
on the Trust's own bank statement. The system cannot see that statement, so a person — the Trust's finance officer — will read it and
type in the payment reference and the date the money arrived. The system checks that the reference is the one recorded for the
member; the date it has to take on trust. Four things need your answer. A family that was refused before anyone looked at the bank:
we suggest they can still be helped once their appeal sends the claim back. A member whose payment reference was typed wrongly: we
suggest they cannot be helped, because nothing else on a statement ties a payment to them — and that is a hard result. Money that
arrived on the very day of death: we suggest it counts as after, the same line you drew on 21 November. And whether one person's
reading is enough: we suggest it is, because it is recorded under their name with the statement and the reason, and can be checked
later — but until someone checks, one person's word stands. Until you answer, it will be built that way and nothing goes live.

If this section and the evidence below ever disagree, the **evidence** is the record.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

**Question ↔ story mapping.** Q1 = Story 6.39a PQ1; Q2 = PQ2; Q3 = PQ3; Q4 = PQ4. Told line 1 = TL1; 2 = TL2; 5 = TL3; told line 3
= the story's N2; 4 = its Policy-meaning note (*"what that sentence deliberately does ⛔ promise"*) and DL11's console note; 6 = its DL14; 7 = TL4
(its DL6 — the earlier of the two dates).

## E1 — What is already ratified, verbatim

- **`2026-11-21-473` Q2 B (ruling 2; Trustee-ratified, DR + KB):** *"Staff may use the bank's date"* *"when the Trust's own bank
  statement shows the money arrived before the death; they record that they did, with a reason, and it is audited."* — *"The family
  is helped if the bank's record bears it out."* Cost as put, accepted: *"A new staff power over a bright line; someone must match
  the payment against the Trust's bank statement; and it is a new piece of work, ⛔ built."*
- **`-473` Q1 B (ruling 1):** *"The same day counts as after — ⛔ drive."* Cost as put, accepted: *"A real member who paid in the
  morning and died that evening gets ⛔ drive."*
- **`-473` "What this ruling does NOT cover"** (the entry's own list — the author's record of the ruling's limits, ⛔ the Panel's
  words):
  - *"**Q2 B — who the staff member is.** "Staff" is the option's word. The author's reading is the District Admin who records the
    membership check … — ⛔ ruled; whether a second person must agree was ⛔ asked."*
  - *"**Q2 B — when it can be used.** Before a denial only (while the claim waits on `fee_after_death`), or also after a
    `fee_paid_after_death` refusal, or on its appeal — ⛔ ruled."*
  - *"**Q2 B — how the payment is matched to the bank statement.** … What counts as "the Trust's own bank statement" inside the
    system, and what staff record of it, is a build decision."*
  - *"**Q2 B and Q1 B together.** Whether a bank date ON the day of death also counts as after — the author reads yes … — ⛔ ruled."*
- **`-473` on the told lines:** *"⚠ **Q2 B makes told line 1 partly untrue once built.**"* The told lines were ⛔ ratified (*"⛔
  Objection is recorded — and ⛔ that is NOT a ratification"*).
- **The 21 November note, told line 1, as put:** *"even an appeal that agrees with the family cannot open a drive, because nothing
  changes the fee date except a new death certificate with a different date."*

## E2 — What is NOT ratified

- **When, how matched, the day of death** (Q1–Q3) — the three items above. `2026-11-21-474` item 1 (an AUTHOR-COMMIT, ⛔ ratified)
  placed the work on row `6-39a` and classed its open decisions: *"(who, when — before or after a refusal, on appeal — how a payment
  is matched to the Trust's bank statement, a bank date on the day of death: `-473` "does NOT cover"; the last three are the Panel's
  if they change whose family is helped)"*. Each of the three does.
- **A second person** (Q4). By `-474` item 1's own list, "who" is the author's. Q4 is asked anyway, without blocking, because `-473`
  records the point as *"⛔ asked"* and the answer sets how far one person's word can open a drive. The rest of "who" — that it is
  the finance officer, ⛔ the District Admin `-473` named as the author's reading — is told (told line 1), ⛔ asked.
- **The finance officer as a role.** The PRD lists it among the seeded roles, *"Trustee Panel to confirm or revise before launch"*
  (OQ-3); staff hiring is OQ-15; the trust account itself is OQ-16.
- **The rulebook.** Niyamavali §2.1 (c) and §2.2 speak of the fee's payment, ⛔ of its recording, and §2.2 carries the joining
  lock-in. Cited by section, ⛔ quoted (the rulebook is in the private legal corpus). A rulebook, ⛔ ratified by the Panel
  (`-473`: *"⛔ ratified by this ruling"*).
- **Every build decision in Story 6.39a** — answered by BigDev at its Task 0.2 on 2026-11-27, each as proposed (story v1.4, Debug
  Log References). An author-commit, ⛔ ratified; its decision entry (Task 0.4) is ⛔ written at 2026-11-27.
- **The fee-optional question** (`2026-11-21-482` item 5, row `3-17`; the registration note sent alongside) — ⛔ ruled; `-473` Q1
  stands until it is.

## E3 — What the code actually does (traced at `90535934`, re-traced at `6536b8bb` on 2026-11-27), and what Story 6.39a will build

**Today (code):**
- The fee date is the Indian calendar date of the joining payment's `paid_at` — the server's time when the reference was typed
  (`vyawastha_shulk_receipts.paid_at`, default `now()`), ⛔ the bank's. The comparison is binding: outcomes `after_death` and
  `same_day` stop the drive (`MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES`), and ⛔ staff remedy exists — nothing named `fee_bank_date` is
  in `apps/` or `packages/`.
- A payment reference is accepted on its shape alone (12 digits, or 22 letters and digits) and stored as typed; it is ⛔ checked
  against any bank.
- The Trust's bank statement is ⛔ in the system. *(The story's trace, G3 — the statement intake that exists is for a nominee's
  account and a pool. A negative claim: ⛔ re-run for this note.)*
- The states in which the membership check can be recorded include `reversed` (a claim an appeal sent back) and ⛔ `denied`, ⛔ an
  appeal stage, ⛔ `state_trustee_approved`.
- A claim has *"exactly one appeal"* journey (`appeal-eligibility.ts`); a fee refusal carries ⛔ time limit to appeal. *(The second
  from a code comment and the 21 November note — a claim, ⛔ a run.)*
- One user can hold several role grants: `role_grants` has ⛔ uniqueness on user and role. The `finance_officer` role exists.
- Admin step-up codes are ⛔ delivered in production: `adminStepUpDelivery` is a log stub that reveals the code only outside
  production (deferral R4 keeps the stub in every environment; ⛔ discharged).
- The check record names the joining payment it compared (`claim_membership_checks.fee_receipt_id`, NOT NULL); row `3-17` would make
  it optional when the fee-optional switch is on.

**Will be built (Story 6.39a v1.4 — a plan, ⛔ code; the build decisions answered by BigDev at Task 0.2, 2026-11-27):** one recorded
act, the bank date, by the finance officer, behind a fresh step-up; accepted only in the review window (⛔ during an appeal), while a
RECORDED check holds the claim on its fee, when the typed reference equals the recorded one (spaces trimmed, letter case ignored);
the claim then waits for the District Admin's re-check, which compares the EARLIER of the bank's and the recorded date by the same
rule; the re-check refused from the person who recorded the date; ⛔ name and ⛔ date of death shown to the finance officer; the
District Admin's note says to record the check, then ask the finance officer; ⛔ new family-facing words.

## E4 — Commands to re-verify every claim

Run 2026-11-21 in the story's worktree, after `git fetch origin`; RE-RUN 2026-11-27 on the branch rebased onto `6536b8bb` — every
result below as stated (only the first changed). The result follows each `# =>`.

```
git rev-parse --short origin/main                                                          # => 6536b8bb (90535934 on 2026-11-21)
grep -c '^### Decision 2026-11-21-473' .decision-log.md                                    # => 1
grep -c 'they record that they did, with a reason, and it is audited' .decision-log.md     # => 1
grep -c 'whether a second person must agree was ⛔ asked' .decision-log.md                  # => 1
grep -c 'Before a denial only (while the claim waits on' .decision-log.md                  # => 1
grep -c 'Whether a bank date ON the day of death also counts as after' .decision-log.md    # => 1
grep -c "the last three are the Panel's if they change whose family is helped" .decision-log.md   # => 1
grep -c 'even an appeal that agrees with the family cannot open a drive' \
  _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-31-6-39-fee-date-and-family-told.md   # => 1
grep -c "MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES: readonly MembershipCheckFeeOutcome\[\] = \['after_death', 'same_day'\]" \
  packages/domain/src/claim/membership-check-approval.ts                                   # => 1
grep -c "'reversed'," packages/domain/src/claim/review-window.ts                           # => 1
grep -c "'denied'" packages/domain/src/claim/review-window.ts                              # => 0
grep -c 'exactly one appeal' packages/domain/src/claim/appeal-eligibility.ts               # => 1
grep -c 'Every other reason: ⛔ no time limit' packages/domain/src/claim/appeal-eligibility.ts   # => 1
grep -c 'utr: z.string().regex' packages/contracts/src/payments/vyawastha-shulk.ts         # => 1 (shape only)
grep -c "paid_at'.*defaultNow()" packages/domain/src/schema/vyawastha_shulk_receipts.ts    # => 1
git grep -c 'fee_bank_date' -- apps packages | wc -l                                       # => 0 (nothing of 6.39a is built)
grep -c "role: 'finance_officer'" packages/domain/src/rbac/roles.ts                        # => 1
grep -ci 'unique' packages/domain/src/schema/role_grants.ts                                # => 0
grep -c 'adminStepUpDelivery: createLogStepUpDelivery({ revealForDev: !isProd })' apps/api/src/deps.ts   # => 1
grep -c 'ADMIN step-up OTP-over-SMS' _bmad-output/implementation-artifacts/deferred-work.md   # => 1 (deferral R4 — the stub kept, ⛔ discharged)
# added 2026-11-27:
grep -c "'appeal_stage_" packages/domain/src/claim/review-window.ts                        # => 0 (⛔ record during an appeal)
grep -c "'state_trustee_approved'" packages/domain/src/claim/review-window.ts              # => 0
grep -cE '\bCLAIM_APPROVE\b[,\]]' packages/domain/src/rbac/roles.ts                        # => 3 (the first approval, held by three roles)
grep -c '"fee_receipt_id" uuid NOT NULL' packages/domain/migrations/0212_claim-membership-checks.sql   # => 1
grep -c '^### Decision 2026-11-21-482' .decision-log.md                                    # => 1 (the fee-optional proposal)
grep -c 'Record the check, then deny the claim with the reason' \
  apps/admin/src/modules/claim-verification/i18n-en.ts                                     # => 1 (today's note; the amended one is ⛔ built)
```
