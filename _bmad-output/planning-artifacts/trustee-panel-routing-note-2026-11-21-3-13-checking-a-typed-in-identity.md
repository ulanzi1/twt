# Trustee Panel routing note — checking a typed-in identity while the member is alive: what staff must see, whether the member is told, and whether staff may see the member's phone number

> **Status: SENT and RULED 2026-11-25 — Decision `2026-11-25-502` (Trustee-ratified, DR + KB; relayed by BigDev).** Everything below
> the ruling block is kept as the questions were put. The original status line follows.
> **Status (as written): WRITTEN 2026-11-21; SENT 2026-11-21 (BigDev: "sent to panel"); ⏳ AWAITING RULING.** ⚠ Not recorded: the channel, the send
> time, and whether the text sent is identical to this file as committed at `9f7da520`.
> Written from Story 3.13 (Task 0.3), which builds the staff step that checks the
> identity of a member who typed their own details in when they joined. ⛔ Member uses the system yet. ⛔ Nothing waits on this note to be
> built or merged; the step does ⛔ go live until you have ruled.

## §0 — the gate

**It is the Panel's:** Q1 decides what the Trust accepts as proof of who a member is — and, through your ruling of 31 October, whether
that member's family later gets an identity check after the death (what the Trust OWES). Q2 decides whether a member is told that staff
could not confirm them (what the Trust tells a member). Q3 decides which staff may see a member's own phone number, and for what (what
the Trust DISCLOSES, and to whom) — your ruling of 13 October settled that only for a neighbour's call-back number, and said so.
**Split out and ⛔ asked — ours, and already decided in the story:** how the check is stored, how the staff screens are worded, which list
of photo IDs staff can tick, the order staff work through the members waiting, and that nothing about the member changes when staff
cannot confirm them (told to you below, so you can object). **Stripped of every reference, the questions read:** *"when someone could
not use DigiLocker and typed their details in, what must our staff see before they say 'yes, this is the person'? If they cannot say
yes, do we tell the member? And may the staff doing this see the member's phone number so they can arrange it?"* — questions about
people, ⛔ about code.

---

> ## ✅ RULED 2026-11-25 — Decision `2026-11-25-502` (Trustee-ratified, DR + KB)
>
> As relayed by BigDev: *"by DR and KB / follow up - Q1 E, Q4 B / identity - Q1 A, Q2 C, Q3 Staff will see the number for this
> purpose in addition to option B."*
>
> - **Q1 — A:** an original government photo ID, in person or on a video call, to a District Admin or the Pariwar Admin; nothing copied
>   or kept (our suggestion). Read with the follow-up's Q1 E (BigDev's clarification, in the decision): A and E both stand — A for a
>   member who typed their details in, E (with A as its fallback) for a person who uploaded documents.
> - **Q2 — C:** the app tells the member that their identity could not be checked yet and how to arrange it, AND the reason staff
>   recorded (⛔ our suggestion, which was B). Built by a new row `3-13a`.
> - **Q3 — B, widened:** the District Admin, the Pariwar Admin and the Super Admin as B put it, and also the member's field worker, the
>   verifiers, the helpline operators and the Block Admins (the roles are the Panel's — BigDev, in the decision) — for arranging the
>   identity check only.
>
> ⛔ NOT covered (see the decision): what surface the four further roles see the number on; the member's words for Q2 (the Panel
> approves them with row `3-13a`). Everything below is **unedited** — the questions **as they were put**
> ([[feedback_supersede_never_reinterpret]]).
---

# The questions

**In one sentence:** a member who could not use DigiLocker typed in their own name and date of birth when they joined, and nobody has
ever checked them; staff will now check them while the member is alive — what must staff see, is the member told when staff cannot
confirm them, and may staff see the member's phone number to arrange the check?

**Why it cannot be decided without you:** your rulebook says a person becomes a member only once their identity is verified, but says
nothing about who verifies a typed-in identity or from what. Once staff confirm it, the identity is never checked again — not even after
the member dies — so the standard you set here is the whole identity check that member's family will ever get. Telling a member, and
showing staff a member's phone number, are disclosures you have ruled on only in other cases.

## The one fact that decides it

**A confirmation in life replaces the check after death.** On 31 October you ruled that for *"someone who typed in their own identity
details, never verified since"*, staff check the identity from the death documents before any drive opens. A member staff confirm under
this note is, by those words, no longer "never verified" — so when they die, that after-death identity check is skipped and only the
joining-fee date is checked. ⇒ Whatever staff must see under Q1 is **all** the identity checking that member's claim will ever get.
(And until the step that ends a member's joining lock-in is built, this is the **only** thing a confirmation changes.)

---

# Q1 — what must staff see before they confirm a typed-in identity?

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **An original government photo ID, shown in person or on a video call** to a District Admin (for members in their district) or the Pariwar Admin (for any member); they check the name, date of birth and face against what the member typed in. Nothing is copied or kept — staff record only which KIND of ID they saw (our suggestion). | The member arranges a meeting or a video call once; after that they are a full member like a DigiLocker member, and their family's claim is not held for an identity check. | A video call can be staged by a determined impostor, and a wrong "yes" means that family is later helped with ⛔ identity check after the death. It takes staff time — and it could be most members, because the typed-in route is open by default. |
| **B** | **As A, but in person only** — ⛔ video calls. | A member must meet a District Admin or the Pariwar Admin face to face. | Harder to stage, but a member far from the district office, unwell, or posted away may never be checked — and, once the joining lock-in can end, an unchecked member stops being covered. More staff travel. |
| **C** | **As A, and the member's school or office confirms in writing** that the person works there under that name. | Two checks instead of one; slower. | More work for staff and for the school; the Trust collects and keeps a letter from an employer; a member who has retired or moved has no current employer to ask. |
| **D** | **No staff check** — the member must complete DigiLocker themselves later; staff only remind them. | Only DigiLocker ever confirms an identity. | A member who cannot use DigiLocker is never confirmed and, once the joining lock-in can end, is not covered. And it needs new work first: today a member who has already joined cannot run DigiLocker again. |

**Our reading:** **A** — **because** it is a check the members who could not use DigiLocker can actually get, wherever they are, by the
two staff the Trust already trusts with a member's district; and it keeps nothing the Trust would then have to protect. Its real cost is
the staged video call, and you may prefer B for exactly that reason. You can reject this reading and still use the table. **Built until
you rule: A** — and the check does not go live until you have ruled.

# Q2 — when staff cannot confirm a member's identity, is the member told?

**In one sentence:** staff record "could not confirm" with a reason (the details do not match the ID, the photo does not match, no ID was
shown, or the member could not be reached); nothing about the member changes — should the app tell them?

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **No new message** — staff contact the member themselves, however they can (see Q3). | The member hears only what staff choose to tell them. | The member may not know anything is wrong until their joining lock-in ends and they are not covered. |
| **B** | **The app tells the member**, in their language, that their identity could not be checked yet and how to arrange it (our suggestion). | The member knows there is something to do, and how. | New words for members, in Hindi and English, which you would approve; a new piece of work to build them. |
| **C** | **As B, and the member is also told the reason** staff recorded. | The member knows exactly what went wrong. | A reason like "the photo does not match" is also told to an impostor, and tells them what to fix. |

**Our reading:** **B** — **because** a member who does not know their identity is unchecked cannot do anything about it, and the
consequence (not being covered once the lock-in ends) falls on them and their family. It says no more than that something is needed.
**Built until you rule: A** (nothing new) — B or C needs its own piece of work.

# Q3 — may the staff who check an identity see the member's phone number to arrange it?

**In one sentence:** the check needs a meeting or a video call, but the staff screen shows only the last digits of the member's mobile
number; may the District Admin and the Pariwar Admin see the whole number for this?

On 13 October you ruled that the Trust may contact any member at any time for any reason, but that not all staff should — and that a
neighbour's call-back number is shown to the District Admin and the Pariwar Admin only when the neighbour said "yes" (the Super Admin
always). That ruling said it does ⛔ cover who may phone a member for any other purpose. Apart from that neighbour's number, after their
"yes", ⛔ staff screen we found shows a member's own full number.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **⛔ number** — staff see only the last digits and arrange the check through people they already know (the member's field worker, the school). | Nothing new is disclosed. | Staff may have no way to reach the member at all; checks stall, and "could not reach the member" becomes the common outcome. |
| **B** | **The District Admin and the Pariwar Admin may see the whole number on this screen**, one press at a time, and every showing is recorded (who, which member, when — ⛔ the number) (our suggestion). The Super Admin also, as for every other number ("all rights"). | A member may get a call from a District Admin or the Pariwar Admin asking to arrange the check. | The member is not asked first. It goes beyond your 13 October ruling, which showed a neighbour's number only after the neighbour's "yes". |
| **C** | **Ask the member first** — the app asks *"May the Admin phone you to check your identity?"* and the number is shown only after a "yes". | The member decides whether they can be phoned. | New member words in Hindi and English and a new piece of work; a member who never opens the app or never answers is never reached — the same stall as A. |

**Our reading:** **B** — **because** it is the set you already named ("the Admin": the District Admin and the Pariwar Admin), for one
purpose the member benefits from, with every look recorded; your 13 October words already say the Trust may contact any member. Its cost
is that the member is not asked, which C would fix at the price of the stall. **Built until you rule: A.**

---

# Shown for information — ⛔ asked (object if you disagree)

1. **"Could not confirm" changes nothing for the member today.** ⛔ change to their membership, ⛔ mark against them, ⛔ message (unless
   you choose Q2 B or C). Staff may try again at any time, as often as needed.
2. **A "yes" cannot be undone by staff.** If a confirmation later turns out to be wrong, that is the Trust's existing process for identity
   fraud — ⛔ a button on this screen.
3. **Nothing is copied or kept.** Staff record only the kind of photo ID they saw (an Aadhaar card, a PAN card, a voter ID, a driving
   licence, a passport or a government service ID) — ⛔ its number, ⛔ a picture of it. The law bars the Trust from storing a full Aadhaar
   number for any purpose.
4. **Not once a death is reported.** Once a claim is filed for the member's death, this check is refused; the identity is checked on the
   claim instead, as you ruled on 31 October.
5. **A suspended member can be checked** (who a person is does not change with a suspension); a member whose membership was ended cannot.
6. **The member's details are never changed by this check.** If staff find a typed-in name is wrong, this step can only say "could not
   confirm" — correcting a member's details is a separate piece of work, and your 31 October addition (the old entry always stays visible)
   would bind it.

---

# What is at stake right now

- **Live today:** nothing — ⛔ member uses the system. Every member who typed their details in is unchecked today, and so every one of
  them would get the after-death identity check you ruled on 31 October.
- **Blocked:** nothing in the building or merging of Story 3.13. Its going live waits on Q1 (and on Q2 and Q3 if you choose B or C).
- **If nothing is decided:** the step is built on A for all three questions and stays switched off for members; every typed-in member
  keeps the after-death check, and — once the joining lock-in can end — stops being covered at its end with no way to be confirmed.

---

# How much to trust this note

- **Earlier versions of this question:** none. This is the first note on checking an identity in life. Your 31 October ruling named this
  step as "related" and did not decide it.
- **Corrected in this note:** the story first put Q1 without the deciding fact (that a "yes" in life removes the after-death check) and
  with option D's cost missing (a joined member cannot run DigiLocker again); both were added when the story was checked. It also quoted
  your 8 November ruling as *"never the phone number"*; your words were *"Keep the phone number out."* — and that ruling was about a field
  worker's number shown to a District Admin, ⛔ a member's. The nearest ruling on a member's number is 13 October's, used in Q3. Option B
  of Q1 (in person only) was added while writing this note.
- **Still uncertain:** how many members will be waiting (the typed-in route is open by default, so possibly most); whether a District
  Admin can practically meet or video-call every member in their district; whether a help ticket staff open for a member reaches the
  member's app (⛔ traced — it matters to Q3 A); counsel's view on showing a member's number to staff is ⛔ recorded (counsel is engaged,
  ⛔ asked this).

---

# In plain English

Some teachers could not use DigiLocker when they joined, so they typed in their own name and date of birth. Nobody has ever checked
those details. Your rulebook says a person is a member only once their identity is verified, so the Trust needs a way to check them —
and because of your 31 October ruling, once staff check them, their family will not get another identity check after they die. That
makes this check important.

We suggest: the member shows an original photo ID, in person or on a video call, to their District Admin or the Pariwar Admin, who
checks it against what was typed in and keeps no copy (Q1 A). If staff cannot confirm, the member is told in the app that something is
needed and how to arrange it (Q2 B). And so staff can actually arrange it, the District Admin and the Pariwar Admin may see the member's
phone number on this one screen, with every look recorded (Q3 B). If the staged video call worries you, choose in person only (Q1 B); if
showing the number without asking worries you, choose to ask the member first (Q3 C) — both have the costs set out above.

If this section and the evidence below ever disagree, the evidence is the record.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-10-31-424` Q1 (a) — C** (Trustee-ratified, DR + KB): *"A claim for someone who typed in their own identity details, never
> verified since, is filed — but the identity is checked first, by staff, from the death documents and the details on record, before any
> drive opens."* · Consequence 2: *"Related: row `3-13` (validating a typed-in identity during life — the same missing capability,
> another moment)."* · Does ⛔ cover: *"periodic re-verification of identity (raised by BigDev in session 2026-10-31, ⛔ put to the
> Panel)."*

> **`2026-10-31-424` Q2 (b) — A, the Panel's addition:** *"even though staff can change, old entry cannot be gone in this particular case,
> but clearly visible along with new entry made by staff"* (shown-for-information item 6).

> **`2026-10-13-328`** (Trustee-ratified, DR + KB), verbatim as relayed: *"Bigdev is right, although Trust can contact any member anytime
> for any reason, but not all staff should have right to contact any member anytime. Superadmin - all rights. Q1 - C , May the Admin phone
> you about this? This will include District Admin and Pariwar Admin. Superadmin has all the rights, no explicit permission is required.
> Q2 - the District Admin, the district's verifiers, the Pariwar Admin and the Super Admin"*. Decision 1: *"the Trust may contact any
> member at any time for any reason. What is limited is WHICH STAFF may do so."* Does ⛔ cover: *"who may PHONE a member for any other
> purpose"*. ⇒ Q3 B **widens** it (no "yes" asked); Q3 C **matches** its mechanism; Q3 A narrows nothing.

> **`2026-11-08-459` Q2** (Trustee-ratified, DR + KB): *"Keep the phone number out."* — a field WORKER's number, shown to the District
> Admin at the other end of a move request. ⛔ a member's number; cited only because the story first mis-quoted it.

## E2 — What is NOT ratified

- **What a confirmation in life means at death.** Read as a MATCH of `-424` Q1 (a) C's *"never verified since"*; the defining reading of
  `-424` (*"a KYC record written by the manual route (`self_declared`) and never verified (`trusteeVerified` false), in any lifecycle
  state"*) is ⛔ ratified, and Story 6.39 built it as author-commit `2026-11-21-472` DL4: *"When the deceased's KYC record is not
  DigiLocker-verified and not trustee-verified, or there is no KYC record at all. Today that is every member who typed their details in."*
  It is put as Q1's deciding fact so you can object.
- **Who verifies, and from what.** PRD FR-2 (*"the member becomes `pending-valid` until trustee validation"*; *"A trustee-action queue
  contains all `pending-valid` members ordered by signup date"*) and architecture §1.14 (*"Trustee approves manual KYC → `active`"*) are
  specifications, ⛔ rulings. Niyamavali §2.1 (a rulebook, ⛔ ratified): *"A person becomes a member only on **all** of: (a)
  registration; (b) identity verification (KYC); (c) payment of the Vyawastha Shulk; and (d) admission under these rules."* — ⛔ who or
  how. "Trustee" in the PRD is read as the Pariwar Admin (the Trustee-Lite) and the District Admin — Q1's options name them.
- **Telling a member anything about their identity check** — ⛔ ruling (Q2).
- **Any staff member seeing a member's own full number** — ⛔ ruling (Q3; `-328` excludes it in terms).

## E3 — What the code actually does (and what Story 3.13 will build)

- **Nothing ever confirms a typed-in identity.** `member_kyc_profiles.trustee_verified` (migration `0024`) defaults to `false`; both
  writers (`apps/api/src/modules/kyc/kyc.handlers.ts`, the manual route and the DigiLocker confirm) write `false`; ⛔ code writes `true`.
- **The typed-in route is open by default.** `apps/api/src/modules/kyc/manual-fallback-seam.ts`: the `kyc_manual_fallback` flag is
  named for the cutover and inverted — its registry default leaves the manual route AVAILABLE.
- **A joined member cannot run DigiLocker again.** Both KYC writers refuse unless the member is still `pending-kyc` (`kyc.not_pending`)
  — Q1 D's cost.
- **The after-death check reads the flag on every call.** `packages/domain/src/claim/membership-check-approval.ts`
  `isIdentityCheckRequired`: the identity half applies unless the record is DigiLocker-verified or trustee-verified. ⇒ the deciding fact.
- **Nothing ends the joining lock-in today** (row `3-14`, ⛔ built), so `pending-valid` is unreachable and a confirmation changes only the
  after-death half until it is.
- **Staff see a masked mobile only.** `apps/api/src/modules/member-validity/handlers.ts` (`maskMobile`); the admin member panel shows
  `maskedMobile`. The only full member number any staff screen shows is a pinged neighbour's call-back number under `-328`
  (`apps/api/src/modules/claims/peer-answers-assembler.ts`, audited per showing, ⛔ the number). Inference, ⛔ exhaustive: found by
  grepping every `decryptMobile` caller in `apps/api/src`.
- **Staff cannot start a conversation in the app.** The helpdesk lets a member open a ticket and staff reply; staff may FILE a ticket
  (`helpdesk.create`) — whether that reaches the member's app is ⛔ traced.
- **Story 3.13 will build (v1.1, Task 0.2 answers so far — BigDev 2026-11-21):** the check by the District Admin (members in their
  district) and the Pariwar Admin (any member, including one with no district recorded); Super Admin by derivation; ⛔ field worker,
  helpline operator, verifier or any other role. One recorded act per check (confirmed / could not confirm, the kind of ID, a reason and a
  private note), a later act replacing the earlier one, history kept. Q1 A, Q2 A, Q3 A until ruled.

## E4 — Commands to re-verify every claim

```
# The ratified texts (locate by the bare number — the log is newest-first)
grep -n '^### Decision [0-9-]*-424:' .decision-log.md
grep -n 'never verified since' .decision-log.md
grep -n '^### Decision [0-9-]*-328:' .decision-log.md
grep -n 'who may PHONE a member for any other' .decision-log.md
grep -n 'Keep the phone number out' .decision-log.md
grep -n '^### Decision [0-9-]*-472:' .decision-log.md
grep -n 'becomes a member only' /Users/dev/Developer/projects/TWT/docs/legal/niyamavali.md

# Nothing writes trustee_verified = true (expect only `false` / `?? false` writers and readers)
grep -rn 'trusteeVerified\|trustee_verified' apps packages --include='*.ts' | grep -v tests | grep -v node_modules

# A joined member cannot re-run either identity route
grep -n 'kyc.not_pending' apps/api/src/modules/kyc/kyc.handlers.ts

# The after-death identity trigger
grep -n 'export function isIdentityCheckRequired' -A4 packages/domain/src/claim/membership-check-approval.ts

# Every place a member's mobile is decrypted (expect masked everywhere except the -328 call-back number)
grep -rln 'decryptMobile' apps/api/src --include='*.ts' | grep -v test

# ⛔ production emitter of the lock-in end (expect only the vocabulary, the registry and the reducer)
grep -rn "'member.lock_in_expired'" apps packages --include='*.ts' | grep -v tests | grep -v node_modules
```
