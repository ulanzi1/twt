# Trustee Panel routing note — 2026-10-21 — a WhatsApp code for a member whose WhatsApp is on another phone

> **STATUS: RULED 2026-10-21 — OPTION A (Decision `2026-10-21-374`, Trustee-ratified).** Written 2026-10-21, corrected the same day
> before sending, put to the Panel and ruled 2026-10-21. Raised by BigDev during Story 5.10's creation (*"I think we need to send OTP in this case.
> May be ask later if whatsapp is on another phone."*, then *"2, go ahead"*). Implementation, if ruled in: sprint row
> `5-13-whatsapp-code-for-another-phone` (backlog).

**§0 gate — why this is the Panel's.** The proposal changes two things your 2026-07-08 design rules on: it would send a WhatsApp
message to a member **before** their WhatsApp is switched on, and it would let WhatsApp be switched on **without** the member sending a
WhatsApp message. Both extend ratified wording. Stripped of citations: *"may the Trust send one WhatsApp code to a member who asked for
WhatsApp in the app, and treat the code typed back as their yes?"* — that is about what the Trust sends a member and on what basis.
The engineering (how the code is made, stored, limited and checked) is ours and is ⛔ asked here.

---

> ## ✅ RULED — 2026-10-21 — OPTION A (Decision `2026-10-21-374`, Trustee-ratified)
>
> **The ruling, verbatim, as relayed by BigDev:** *"by DR and KB / option A, one code per request and one retry."* — Dhiraj Rahul and
> Kalpana Bharti.
>
> **A — "Allow the code. Only after the member ticks the box and taps "WhatsApp on another phone?"; one code per request, to the
> registered number only; WhatsApp is switched on when the code is typed back in the app."** Its cost was accepted as put (a WhatsApp
> message to someone not yet switched on; Meta's charge per code; Meta's approval of a new message type; more to build; counsel not
> asked), with the Panel's addition *"one retry"*. ⚠ BigDev's reading of "one retry", given in session when asked (⛔ separately
> ratified): *"Both"* — the code may be sent once more for the same request (at most two codes), and each code may be typed in twice.
> Built by sprint row `5-13-whatsapp-code-for-another-phone`; Story 5.10 builds the link with the number and phrase meanwhile.
>
> **Not covered by this ruling** (the full list is `-374`'s): counsel's view; whether §2.2's *"voice OTP only — no WhatsApp"* was
> ratified; Meta's template approval and price; the consent record for a code-confirmed yes; the unbuilt *"surfaced for member
> confirmation"* half of §3.4's mismatch rule. `-374`'s readings (i)–(iv) are the author's, ⛔ ratified.
>
> Everything below stays **unedited**, as the question **as it was put**.

---

# The question

**In one sentence:** when a member ticks "Send me WhatsApp messages from TWT" while signing up on a phone that does not have their
WhatsApp, may the Trust send **one WhatsApp message with a code** to their registered number, and switch WhatsApp on when they type
that code into the app?

**Why it cannot be decided without you:** your design says the Trust sends nothing on WhatsApp until a member's WhatsApp is switched on,
and that it is switched on only by a message the member sends us on WhatsApp. This would add a second way in, and one message before it.

## The one fact that decides it

**The code would be the only WhatsApp message the Trust sends to a member, as a member, before their WhatsApp is on — and the member
has already asked for WhatsApp in the app by ticking an unticked box.** Everything else turns on whether that in-app request is enough
to send that one message. (The one ratified WhatsApp contact outside the member opt-in is a claimant's messages about their claim, on
the claim's filing agreement — `-357`; it is the nearest precedent, E1.)

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Allow the code.** Only after the member ticks the box and taps "WhatsApp on another phone?"; one code per request, to the registered number only; WhatsApp is switched on when the code is typed back in the app. | A member signing up on someone else's phone (or a second phone) can finish in the app, the familiar way — read a code, type it in. | The Trust sends a WhatsApp message to someone not yet switched on (once, at their request). Meta charges for each code. A new message type needs Meta's approval. More to build (row 5-13). Counsel has not been asked. |
| **B** | **Keep today's rule.** The member is shown our WhatsApp number and a short code, and sends it to us **from the phone that has their WhatsApp**. | The same member can still finish, but must open WhatsApp on the other phone and type a message to a number. | Less familiar; some members will not finish and will stay without WhatsApp (they still get everything in the app). Nothing new is sent. |

**Our reading:** **A** — **because** the member has already said yes in the app, plainly and on an unticked box, and a code delivered
to their WhatsApp is an *equally strong* proof as today's message (both show the registered number has WhatsApp and that the member
controls it), in the direction members are used to. The one message is a direct answer to the member's own request. But A is a real
widening of your design, and B needs nothing new from you: Story 5.10 (planned, ⛔ built yet) will show the member our number and the
code to send from their WhatsApp phone, so nothing waits on this.

---

# What is at stake right now

- **Live today:** nothing — the app is not in production, and every Pariwar's WhatsApp is switched off.
- **Blocked:** nothing. Story 5.10 (planned, ⛔ built yet) will build option B either way; if you choose A, row 5-13 later swaps what
  the signup step's "another phone?" link shows.
- **If nothing is decided:** B is what Story 5.10 will build. Members who sign up on another phone finish by sending the code from their
  WhatsApp phone, or later from the app's "WhatsApp notifications" screen.

---

# How much to trust this note

- **Earlier versions of this question:** none for members. Your 2026-10-17 note (how long a yes lasts) was told, as a fact, that a
  signup box was planned; it did not ask about a code. The nearest earlier ruling is for claimants: your `-351` decision 2 and `-357`
  made the claimant's agreement at filing (an in-app capture) the consent for WhatsApp about their claim — claimants only (E1).
- **Corrected in this note (2026-10-21, before sending — Story 5.10's validate):** (1) it said Story 5.10 "builds B now" and that the
  app "already shows" the code — Story 5.10 is planned, ⛔ built; (2) it said a code is a "stronger" proof, and "a better check", than today's message — both
  prove the same two things; (3) it said nothing rules on any WhatsApp message to someone not yet switched on — `-357` does, for
  claimants; (4) it left out your design's own answer for a message from the wrong number (*"mismatch logged + surfaced for member
  confirmation"*, E1), which is only half built (E3); (5) it named "Settings", which the app does not have (the screen is "WhatsApp
  notifications", reached from the home screen).
- **Still uncertain:** (1) whether the architecture's sentence that one-time codes go by SMS with *"voice OTP only — no WhatsApp"* as
  the fallback was itself ratified — we have not confirmed it (E2); (2) Meta's current charge for an authentication message in India —
  not fetched; (3) counsel's view on contacting a member on WhatsApp on the strength of an in-app tick — not asked (the same gap is
  open for the signup box itself); (4) whether building your design's own "surfaced for member confirmation" (telling a member, in the
  app, that a message came from a different number and asking them to confirm it) would serve this case as well — a third route we
  have not costed or read against ADR-0029 (it may need your ruling if it would switch WhatsApp on for a number other than the one on
  file, or without a matched inbound message).

---

# In plain English

Today, to get WhatsApp messages from the Trust, a member has to send us a short WhatsApp message from their own number. That proves the
number has WhatsApp and that the member really asked. It works well when the member is signing up on their own phone. If they are using
a relative's phone, the message goes from the wrong number and nothing happens.

We could fix that by sending them a code on WhatsApp and asking them to type it into the app. That is just as good a check, and it is what
people are used to. But your rules say we never message anyone on WhatsApp until they have switched it on by messaging us first. So
this needs your yes.

We suggest you allow it, for this one case and one message, because the member has just asked for WhatsApp in the app. If you would
rather not, nothing is lost: the app will show the member the code to send from their own WhatsApp phone (Story 5.10, planned).

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> **ADR-0029, Rationale** (ratified `2026-07-08-065` item 4): *"User-initiated ONLY (AR-16). A PENDING is minted only by the member
> tapping the toggle; ACTIVE only by a matched inbound WhatsApp message. Re-opt-in after revoke requires a NEW inbound message (a new
> PENDING + phrase) — no inferred re-consent."*

> **Architecture §3.4** (ratified with ADR-0029 by `-065`), channels: *"WhatsApp Business (Meta Cloud API) — dual-gated: fires only
> when both (a) per-Pariwar admin toggle ON (FR-72) and (b) per-member opt-in ACTIVE … Scope: Meta UTILITY templates only — payment
> reminder, payout issued, claim accepted, expiry warning, membership lapse."*

> **Architecture §3.4**, origination: *"WA opt-in state may only transition to ACTIVE via a user-initiated interaction (the user-sent
> WhatsApp message above) or an explicit affirmative consent capture in-app (recorded with timestamp + the UI context). Passive
> defaults, pre-checked boxes, bundled consent, or inference from other settings are not valid opt-in origins."*

> **`2026-10-19-364`** (Trustee-ratified, option A) keeps: *"opt-in only by a user-initiated message or an explicit affirmative capture
> in-app (⛔ pre-ticked, ⛔ bundled)"*.

> **Architecture §3.4**, inbound message handling: *"WA webhook (§3.11) matches the inbound WA number to member-mobile-on-file
> (assumption: same number; mismatch logged + surfaced for member confirmation). On match: WA opt-in state set to ACTIVE …"*

> **Architecture §3.4**, the claim-contact exception (Trustee-ratified, `2026-10-18-357`): *"Outside the member opt-in flow, WhatsApp
> may carry messages about a claim — the correction and certificate reminders' delivery ladder — to ONE person only: the **claimant**,
> on the claim's filing agreement, which names WhatsApp among the channels the Trust may use about this claim — an explicit affirmative
> capture recorded per claim with timestamp + the UI context, never pre-ticked; withdrawing it, or STOP, ends WhatsApp contact for that
> claim."* — the nearest precedent for option A (an in-app capture as the basis for WhatsApp contact), for claimants only.

Option A matches §3.4's in-app route for switching WhatsApp ON, but widens ADR-0029's *"ACTIVE only by a matched inbound WhatsApp
message"*, and widens §3.4's dual gate (a message sent while the member is not ACTIVE) and its *"UTILITY templates only"* scope (a code
is Meta's AUTHENTICATION category).

## E2 — What is NOT ratified

- No ruling covers a WhatsApp message to a member, as a member, before their WhatsApp is on; the one ratified exception is a
  claimant's messages about their claim (`-357`, E1).
- Architecture §2.2 (member authentication) commits SMS-DLT-transactional as the OTP channel, with *"fallback options (voice OTP only —
  no WhatsApp)"*. Whether that sentence was Trustee-ratified is ⛔ confirmed here. The proposed code is a WhatsApp opt-in check, ⛔ a login
  OTP, but it reads against that sentence.
- Counsel's view on WhatsApp consent is not recorded (the 2026-10-17 note's "still uncertain" (1); roster Row 37 (b)).

## E3 — What the code actually does

- A WhatsApp yes is switched on only by the jobs worker matching an inbound message on (Pariwar, the sender's number's blind index,
  the verification phrase, a PENDING request) — `matchPendingOptIn` in `apps/jobs/src/wa-webhook-processor.ts`. A message from any
  other number matches nothing and changes nothing. The *"surfaced for member confirmation"* half of the ratified mismatch rule (E1) is
  ⛔ built: an unmatched message is only logged (the worker's no-match branch — its log line says "surfaced for confirmation", but
  nothing reaches the member); recorded in `deferred-work.md` by Story 5.10's validate.
- No code sends a WhatsApp message to a member who is not ACTIVE: `resolveWaTarget` (`packages/domain/src/notifications/delivery.ts`)
  reads the Pariwar toggle AND `isOptInActive`.
- Story 5.10 (planned, ⛔ built; SB12) will build option B: a "WhatsApp on another phone?" link that shows the Pariwar's number and
  the phrase, with no server change. The phrase is `TWT-` + 8 unambiguous characters, matched case-insensitively
  (`packages/domain/src/wa-opt-in/phrase.ts`).
- Meta, *Get opt-in for WhatsApp* (fetched 2026-10-21): *"It is up to businesses to determine the method of opt-in"* (examples: SMS,
  a website, by phone, in person or on paper); it must name the business and say the person is opting in to its messages; *"Businesses
  may contact people on WhatsApp if: (a) they have given their mobile phone number; and (b) businesses have received opt-in permission from the recipient confirming that they wish to receive subsequent messages or calls from a particular business"* — so A is permitted by Meta; the limit is the
  Trust's own rule.

## E4 — Commands to re-verify every claim

```
grep -n "User-initiated ONLY" docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md
grep -n "dual-gated\|UTILITY templates only\|Opt-in origination requirement" _bmad-output/planning-artifacts/architecture.md
grep -n "voice OTP only" _bmad-output/planning-artifacts/architecture.md
grep -n "mismatch logged\|Outside the member opt-in flow" _bmad-output/planning-artifacts/architecture.md
grep -n '^### Decision .*-357' .decision-log.md
grep -n "matched no PENDING" apps/jobs/src/wa-webhook-processor.ts
grep -n '^### Decision .*-364' .decision-log.md
grep -n "matchPendingOptIn" apps/jobs/src/wa-webhook-processor.ts
grep -n "isOptInActive" packages/domain/src/notifications/delivery.ts
grep -n "PHRASE_ALPHABET\|VERIFICATION_PHRASE_PREFIX" packages/domain/src/wa-opt-in/phrase.ts
```
