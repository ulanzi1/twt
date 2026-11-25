# For the Trustee Panel — told, not asked: how your rulings on checking a typed-in identity will be built (Story 3.13, 2026-11-25)

**For:** Dhiraj Rahul · Kalpana Bharti
**Prepared by:** BigDev (Solo Builder) · **Status:** **WRITTEN 2026-11-25 — ⛔ NOT YET SENT** (BigDev sends). Kept as sent once sent;
⛔ a ruling is asked.
**What this is:** for your information. Nothing here asks you to decide anything. It follows your ruling of 25 November (Decision
`2026-11-25-502`): *"by DR and KB / follow up - Q1 E, Q4 B / identity - Q1 A, Q2 C, Q3 Staff will see the number for this purpose in
addition to option B."* — with the staff you named for Q3: field workers, verifiers, helpline operators and Block Admins.

---

## What we are building

Staff can confirm a member who typed in their identity details by seeing an original photo ID, in person or on a video call (Q1 A).
The check of uploaded documents and a selfie (Q1 E) is built with the upload screens themselves, and keeps the copies as you ruled
(Q4 B). To arrange a check, staff can press *"Show mobile number"* and see the member's whole number, and every press is recorded.

## Four things you should know

**1. Two of the staff you named cannot be given the number yet.** The District Admin, the Pariwar Admin, the Super Admin, the
verifiers and the helpline operators will have it. **Field workers** will get it when they can log in to the system, which is a later
piece of work. **Block Admins** cannot be given it for now: the system records a member's district but not their block, so it cannot
tell which members are in a Block Admin's block. Until then, those members are reached through the other staff. We will tell you when
either is added.

**2. "For this purpose" is built in.** The number can be shown only while the member is waiting for an identity check. Once they are
confirmed, or once their death is reported, the button stops working. The record of each showing keeps who looked, at which member and
when. It never keeps the number.

**3. "The reason staff recorded" is the reason from the list.** When staff cannot confirm a member, they pick one of four reasons (the
details do not match the ID, the photo does not match, no ID was shown, the member could not be reached) and also write a private note.
Under Q2 C the member will be told the reason from that list. We read your words as not including the private note, which stays with
staff. The member's message, in Hindi and English, will come to you for approval as its own piece of work.

**4. Nothing goes live yet.** No member uses the system. The check, the number and the message go live only once all three are built
and checked.

---

*Evidence (for the record): Decision `2026-11-25-502` (the ruling, verbatim, and BigDev's clarifications); Decision `2026-11-25-503`
items 1–4 (the build, the two roles deferred, the reading of "the reason staff recorded"); Story 3.13
(`3-13-trustee-validation-of-manually-entered-identity`) v1.9 DL6a, F13, N6; `packages/domain/src/member-geo/resolve.ts` (a member has
no block); roster Row 57 (b2).*
