# Trustee Panel routing note — 2026-10-21 — a WhatsApp code for a member whose WhatsApp is on another phone

> **STATUS: WRITTEN 2026-10-21 — ⛔ NOT SENT.** It becomes "shown to the Panel" only when BigDev sends it
> ([[feedback_shown_to_panel_means_sent]]). Raised by BigDev during Story 5.10's creation (*"I think we need to send OTP in this case.
> May be ask later if whatsapp is on another phone."*, then *"2, go ahead"*). Implementation, if ruled in: sprint row
> `5-13-whatsapp-code-for-another-phone` (backlog).

**§0 gate — why this is the Panel's.** The proposal changes two things your 2026-07-08 design rules on: it would send a WhatsApp
message to a member **before** their WhatsApp is switched on, and it would let WhatsApp be switched on **without** the member sending a
WhatsApp message. Both extend ratified wording. Stripped of citations: *"may the Trust send one WhatsApp code to a member who asked for
WhatsApp in the app, and treat the code typed back as their yes?"* — that is about what the Trust sends a member and on what basis.
The engineering (how the code is made, stored, limited and checked) is ours and is ⛔ asked here.

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. Everything below is then kept **unedited** as the question **as it was put**.

---

# The question

**In one sentence:** when a member ticks "Send me WhatsApp messages from TWT" while signing up on a phone that does not have their
WhatsApp, may the Trust send **one WhatsApp message with a code** to their registered number, and switch WhatsApp on when they type
that code into the app?

**Why it cannot be decided without you:** your design says the Trust sends nothing on WhatsApp until a member's WhatsApp is switched on,
and that it is switched on only by a message the member sends us on WhatsApp. This would add a second way in, and one message before it.

## The one fact that decides it

**The code would be the only WhatsApp message the Trust sends before a member's WhatsApp is on — and the member has already asked for
WhatsApp in the app by ticking an unticked box.** Everything else turns on whether that in-app request is enough to send that one
message.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Allow the code.** Only after the member ticks the box and taps "WhatsApp on another phone?"; one code per request, to the registered number only; WhatsApp is switched on when the code is typed back in the app. | A member signing up on someone else's phone (or a second phone) can finish in the app, the familiar way — read a code, type it in. | The Trust sends a WhatsApp message to someone not yet switched on (once, at their request). Meta charges for each code. A new message type needs Meta's approval. More to build (row 5-13). Counsel has not been asked. |
| **B** | **Keep today's rule.** The member is shown our WhatsApp number and a short code, and sends it to us **from the phone that has their WhatsApp**. | The same member can still finish, but must open WhatsApp on the other phone and type a message to a number. | Less familiar; some members will not finish and will stay without WhatsApp (they still get everything in the app). Nothing new is sent. |

**Our reading:** **A** — **because** the member has already said yes in the app, plainly and on an unticked box, and a code delivered
to their WhatsApp is a *stronger* proof than today's message (it shows the registered number has WhatsApp and that the member can read
it). The one message is a direct answer to the member's own request. But A is a real widening of your design, and **B already works**:
Story 5.10 builds B now, so nothing waits on this.

---

# What is at stake right now

- **Live today:** nothing — the app is not in production, and every Pariwar's WhatsApp is switched off.
- **Blocked:** nothing. Story 5.10 ships option B either way; if you choose A, row 5-13 later swaps what the "another phone?" link shows.
- **If nothing is decided:** B stays. Members who sign up on another phone finish by sending the code from their WhatsApp phone, or in
  Settings later.

---

# How much to trust this note

- **Earlier versions of this question:** none. Your 2026-10-17 note (how long a yes lasts) was told, as a fact, that a signup box was
  planned; it did not ask about a code.
- **Corrected in this note:** none yet.
- **Still uncertain:** (1) whether the architecture's sentence that one-time codes go by SMS with *"voice OTP only — no WhatsApp"* as
  the fallback was itself ratified — we have not confirmed it (E2); (2) Meta's current charge for an authentication message in India —
  not fetched; (3) counsel's view on contacting a member on WhatsApp on the strength of an in-app tick — not asked (the same gap is
  open for the signup box itself).

---

# In plain English

Today, to get WhatsApp messages from the Trust, a member has to send us a short WhatsApp message from their own number. That proves the
number has WhatsApp and that the member really asked. It works well when the member is signing up on their own phone. If they are using
a relative's phone, the message goes from the wrong number and nothing happens.

We could fix that by sending them a code on WhatsApp and asking them to type it into the app. That is a better check, and it is what
people are used to. But your rules say we never message anyone on WhatsApp until they have switched it on by messaging us first. So
this needs your yes.

We suggest you allow it, for this one case and one message, because the member has just asked for WhatsApp in the app. If you would
rather not, nothing is lost: the app already shows the member the code to send from their own WhatsApp phone.

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

Option A matches §3.4's in-app route for switching WhatsApp ON, but widens ADR-0029's *"ACTIVE only by a matched inbound WhatsApp
message"*, and widens §3.4's dual gate (a message sent while the member is not ACTIVE) and its *"UTILITY templates only"* scope (a code
is Meta's AUTHENTICATION category).

## E2 — What is NOT ratified

- Nothing rules on any WhatsApp message to a member who is not yet switched on.
- Architecture §2.2 (member authentication) commits SMS-DLT-transactional as the OTP channel, with *"fallback options (voice OTP only —
  no WhatsApp)"*. Whether that sentence was Trustee-ratified is ⛔ confirmed here. The proposed code is a WhatsApp opt-in check, ⛔ a login
  OTP, but it reads against that sentence.
- Counsel's view on WhatsApp consent is not recorded (the 2026-10-17 note's "still uncertain" (1); roster Row 37 (b)).

## E3 — What the code actually does

- A WhatsApp yes is switched on only by the jobs worker matching an inbound message on (Pariwar, the sender's number's blind index,
  the verification phrase, a PENDING request) — `matchPendingOptIn` in `apps/jobs/src/wa-webhook-processor.ts`. A message from any
  other number matches nothing and changes nothing.
- No code sends a WhatsApp message to a member who is not ACTIVE: `resolveWaTarget` (`packages/domain/src/notifications/delivery.ts`)
  reads the Pariwar toggle AND `isOptInActive`.
- Story 5.10 (v1.3, SB12) builds option B: a "WhatsApp on another phone?" link that shows the Pariwar's number and the phrase, with no
  server change. The phrase is `TWT-` + 8 unambiguous characters, matched case-insensitively (`packages/domain/src/wa-opt-in/phrase.ts`).
- Meta, *Get opt-in for WhatsApp* (fetched 2026-10-21): opt-in may be collected outside WhatsApp, including in an app, if it names the
  business and says the person is opting in to its messages — so A is permitted by Meta; the limit is the Trust's own rule.

## E4 — Commands to re-verify every claim

```
grep -n "User-initiated ONLY" docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md
grep -n "dual-gated\|UTILITY templates only\|Opt-in origination requirement" _bmad-output/planning-artifacts/architecture.md
grep -n "voice OTP only" _bmad-output/planning-artifacts/architecture.md
grep -n '^### Decision .*-364' .decision-log.md
grep -n "matchPendingOptIn" apps/jobs/src/wa-webhook-processor.ts
grep -n "isOptInActive" packages/domain/src/notifications/delivery.ts
grep -n "PHRASE_ALPHABET\|VERIFICATION_PHRASE_PREFIX" packages/domain/src/wa-opt-in/phrase.ts
```
