# Trustee Panel routing note — 2026-10-17 — Story 6.31: how long does a member's "yes" to WhatsApp from the Trust last?

**§0 gate — why this is the Panel's.** It is a consent question: how long a member's agreement to be messaged lasts. The answer that
makes your earlier ruling work would replace part of a design you ratified on 2026-07-08 (`-065`, ADR-0029; amended on
2026-10-18 by `-357` for claimants only — the member opt-in was left unchanged). Without the
citations, the question is: *"a member said yes to WhatsApp from the Trust; does that yes last until they take it back, or only for
one day?"* That is a trustee question, not an engineering one. The engineering half (how the system stores and reads the answer)
is built by Story 6.31 either way. Only the meaning is asked here.

> ## ✅ RULED — 2026-10-19 — OPTION A (Decision `2026-10-19-364`, Trustee-ratified)
>
> **The ruling, verbatim, as relayed by BigDev:** *"by DR and KB / option A"* — Dhiraj Rahul and Kalpana Bharti.
>
> **A — "A yes lasts until the member takes it back (in the app, or by replying STOP), for every WhatsApp message from the
> Trust."** Its cost was accepted with its conditions: before anything is sent on a yes older than a day, the app's "expired"
> wording changes, its withdraw control shows, STOP always works, and taking a yes back ends every earlier yes, not only the
> newest. Built by sprint row `5-12-whatsapp-yes-lasts-until-withdrawn`; until it ships the system keeps the 24-hour behaviour.
>
> Written 2026-10-17 at `bmad-create-story 6.31` (pin `dae96d9b`); revised 2026-10-19 before sending (pin `15acb570`); sent and
> ruled 2026-10-19. Everything below stays **unedited**, as the question **as it was put**.

---

# The question

**In one sentence:** when a member tells the Trust *"yes, you may message me on WhatsApp"*, should that yes last **until they take
it back**, or (as the system is built today) **only for the next 24 hours**?

**Why it cannot be decided without you:** on 2026-10-10 you ruled that neighbours who *"have chosen WhatsApp messages from the
Trust"* get one reminder after two days. As built, a member's choice counts for only 24 hours after they make it, so that reminder
would reach almost nobody. Making the choice last longer changes what a member's consent means, and it changes a design you
ratified. Both are yours to decide.

## The one fact that decides it

**The 24 hours comes from a WhatsApp rule about chat, not from anything the member agreed to.** WhatsApp lets a business chat
freely for 24 hours after a person writes to it. Outside that window the business may still send **pre-approved message templates**
at any time. WhatsApp's own policy asks that the person has agreed to receive messages, sets no time limit of its own, leaves the
manner of agreeing to the law that applies to the Trust, and says every request to stop must be respected. The system as built treats the 24-hour chat window as the life of
the member's yes; its own code calls those 24 hours *"the Meta customer-service window"*. After 24 hours the app tells the member,
in Hindi, *"आपकी व्हाट्सएप ऑप्ट-इन अवधि समाप्त हो गई। फिर से चालू करने के लिए नीचे टैप करें।"* ("Your WhatsApp opt-in period has
ended. Tap below to turn it on again."), and the Trust stops sending to them. But the member's consent record still says
*granted*, and a WhatsApp "STOP" from them is ignored.

**Three more facts you should have.** (1) On 2026-10-18 you approved WhatsApp to a **claimant**, about that one claim, on the
claim's filing agreement: *"withdrawing it, or STOP, ends WhatsApp contact for that claim"*. That approval says nothing about 24
hours, and how long it lasts was not asked; we read it as lasting until withdrawn, for that claim only. (2) When a member's yes
runs out after 24 hours, its record is never closed; each new yes adds a new record, and taking it back closes only the newest,
so every yes that ran out before still reads *granted*. Nothing decides a message on those records today, though a member's own
data download lists them as granted; any longer-lasting yes must first make taking it back close every one of them. (3) A member's yes can be
asked for at signup: a separate WhatsApp box, not ticked in advance, with a reminder that important notices come on WhatsApp and
a choice to go back or carry on, is now planned (a new backlog item). Accepting the Terms is not the yes — the Terms do not name
WhatsApp as a way of contacting members, and your 2026-07-08 design does not allow a pre-ticked box or a yes bundled into other
terms. How long that yes lasts is still this question: as built, it too would end after 24 hours.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **A yes lasts until the member takes it back** (in the app, or by replying STOP), for every WhatsApp message from the Trust. | Members who said yes get the reminder, and later the Trust's other WhatsApp messages. The app shows them as still opted in, with a way to withdraw that always works. | More WhatsApp messages reach members than the system sends today. Before anything is sent on a yes older than a day: the app's "expired" wording must change, its withdraw control must show, STOP must always work, and taking a yes back must end every earlier yes, not only the newest. It replaces part of a design you ratified. |
| **B** | **A yes lasts until withdrawn, but only for the neighbours' reminder for now.** Other WhatsApp messages keep today's 24 hours until a later decision. | Only the reminder reaches members on a yes older than a day. | The same fixes as A (including ending every earlier yes), and it also replaces part of the design you ratified (for the reminder). Also two meanings of one "yes" side by side, which is harder to explain: the app would have to say the member is still reachable for reminders but "expired" for everything else. |
| **C** | **Keep it as built: a yes counts for 24 hours.** | Almost no neighbour gets the reminder: only one who said yes to WhatsApp in the last day. The text message still goes to all five. | Your 2026-10-10 reminder exists on paper but rarely happens. The consent record keeps saying *granted* after the app has told the member it expired. Nothing is sent on it, so it is a stale record, not an unwanted message — and each expired yes leaves one more, which a member's data download still shows as granted even after they withdraw. |

**Our reading:** **A** — **because** a member who says yes to WhatsApp means "you may message me", not "you may message me today".
(Your 2026-10-18 approval for claimants also set no 24 hours, though it covers one claim and was not asked how long it lasts.)
Under A or B the wording and withdrawal fixes come first, and nothing is sent on an older yes until they ship. If you prefer to be
cautious, **B** limits the change to the reminder you already ruled on.

---

# What is at stake right now

- **Live today:** nothing. The app is not in production, so no real member has said yes to WhatsApp yet, and the reminder's
  WhatsApp template does not exist yet. The app's wording can still be fixed before anyone opts in.
- **Blocked:** nothing. Story 6.31 builds the reminder on today's 24-hour meaning (C). If you choose B, one read changes and the
  wording and withdrawal fixes are added; under A the alert system's WhatsApp gate and the 24-hour expiry change too.
- **If nothing is decided:** the reminder ships under C and rarely fires. The reminder's go-live checklist row records whether you
  ruled.

---

# How much to trust this note

- **Earlier versions of this question:** none put to you. You have been told it exists: the follow-up note on the delivery
  ladder, which you answered on 2026-10-17, said *"How long a WhatsApp "yes" lasts is itself a separate open question for you,
  from Story 6.31."* (When we recorded your 2026-10-17 ruling on undelivered reminders, we also listed it among the questions to
  bring back to you — that list is ours, not your words.) The 2026-10-10 note on asking the neighbours said WhatsApp to members who
  opted in *"is already in the approved plan"*. That was true of the plan, but nobody had checked how long an opt-in lasts as
  built. This was found on 2026-10-17 while writing Story 6.31.
- **Corrected in this note before sending:** the first draft said the app's "withdraw" button refuses. In fact the app never shows
  that button to an expired member; it tells them the opt-in expired. It is the server, and a WhatsApp STOP, that refuse. A
  revision on 2026-10-19 added the three facts above (the claimant's yes; the older records of a yes; the planned signup box), cited WhatsApp's own
  policy for the deciding fact (which the first draft called our reading), re-sourced "Still uncertain" (2) from third-party
  guides to WhatsApp's own guidance, and changed "Earlier versions" from "none" to "none put to you; you were told it exists".
- **Still uncertain:** (1) whether counsel would want the consent wording itself to say how long a yes lasts; counsel's view on
  WhatsApp consent has not been recorded. (2) WhatsApp's own guidance says "utility" messages are typically triggered by
  something the person did or asked for, or must be essential to them. A neighbour has done nothing about this death, so WhatsApp
  may class the reminder as "marketing" or refuse it. If so it does not go at all (your 2026-10-10 ruling already covers that). That is separate from this
  question.

---

# In plain English

When a member agrees to receive WhatsApp messages from the Trust, the system treats that agreement as lasting one day. It seems to
have been mixed up with a WhatsApp rule about chatting. After the day passes, the app tells the member their opt-in "expired" and
the Trust stops messaging them, yet the record still says they agreed, and a STOP from them is ignored. So the reminder you approved
for neighbours would almost never be sent. WhatsApp itself puts no time limit on a yes, and your approval for claimants set no
such limit either. We suggest a member's yes should last until they take it back, and that the app must show this and taking it
back must always work — ending every earlier yes too. That needs small fixes before any message relies on an older yes. If you
prefer, the change can apply only to the neighbours' reminder for now.

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

> `2026-10-10-303` Q1 A, ruling item 1: *"plus one WhatsApp reminder after two days (48 hours), with the same words, to those of
> the five who have ⛔ not answered and have chosen WhatsApp messages from the Trust (option A as put …)"*.

> `2026-07-08-065` (Trustee-ratified) ratified ADR-0029 (`docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md`). The
> ADR's own text: the operational lifecycle `PENDING | ACTIVE | REVOKED | BLOCKED_BY_META | EXPIRED_24H_WINDOW` *"plus a
> verification phrase, the pending-match key, and the 24h-window expiry"*; *"stale PENDINGs / past-window ACTIVEs →
> EXPIRED_24H_WINDOW"*; *"The AC6 dual gate reads BOTH (`isOptInActive` AND the admin toggle)"*.

> Architecture §3.4 (the approved plan): WhatsApp *"fires only when both (a) per-Pariwar admin toggle ON … and (b) per-member
> opt-in ACTIVE"*; opt-in only from a user-initiated interaction or an explicit affirmative capture; withdrawal from app settings or
> a STOP message; the opt-in flow *"ACTIVE + … Meta 24h customer-service window opened"*.

> `2026-10-18-357` (Trustee-ratified) approved architecture §3.4's "Claim-contact exception": *"Outside the member opt-in flow,
> WhatsApp may carry messages about a claim … to ONE person only: the **claimant**, on the claim's filing agreement … withdrawing
> it, or STOP, ends WhatsApp contact for that claim. … The exception does not change any member's opt-in state"*. ADR-0029's
> changelog: *"(ratified — amended) … member opt-in unchanged … No decision text of this ADR edited."*

> The follow-up note on the delivery ladder (sent; answered as `2026-10-17-351`), Q2: *"How long a WhatsApp "yes" lasts is itself a
> separate open question for you, from Story 6.31."* (`2026-10-17-350`'s "put back to the Panel" list (b) records the same — that
> list is the transcriber's, recorded with the ratified entry, and is not itself ratified.)

## E2 — What is NOT ratified

No ruling says how long a member's WhatsApp consent lasts as consent. ADR-0029 ratified a state machine in which a 24-hour expiry
exists. It does not say that the expiry ends the member's consent, and the consent record is not revoked by it (E3). No ruling covers
withdrawing an expired opt-in, or what the app tells the member when the 24 hours pass.

## E2b — The Terms and the planned signup box

- `docs/legal/terms-and-conditions.md` (DRAFT, version `[[v1.0]]`), R10(B): *"Official communications are delivered through the
  **in-app surface** — that is the channel of record. WhatsApp/Telegram are convenience mirrors only."* No clause names WhatsApp as a
  way the Trust will contact a member. `docs/legal/privacy-policy.md` (draft): *"Contact | Phone, email | Official communications,
  alerts, support | Consent; contract performance"*.
- Architecture §3.4 (ratified with ADR-0029 by `-065`): *"Passive defaults, pre-checked boxes, bundled consent, or inference from
  other settings are not valid opt-in origins."*
- Sprint row `5-10-signup-whatsapp-opt-in-checkbox` (backlog, added 2026-10-19): an unticked signup box + a reminder popup — the
  §3.4 *"explicit affirmative consent capture in-app"*. Not built; today an opt-in becomes active only by the member sending the
  phrase on WhatsApp (Story 5.4).

## E3 — What the code actually does (written at `dae96d9b`, re-checked at `15acb570`)

- `packages/domain/src/wa-opt-in/read.ts` `isOptInActive`: TRUE iff `state = 'ACTIVE' AND (window_expires_at IS NULL OR now() <
  window_expires_at)`.
- `apps/jobs/src/wa-webhook-processor.ts`: on a phrase match, consent recorded + `activateOptIn` with `window_expires_at = now() +
  24 hours` (`resolveWindowExpiresAt`). `runWaOptInExpirySweep` moves a past-window ACTIVE to `EXPIRED_24H_WINDOW`; its comment says
  *"Consent is NOT revoked on window expiry — the member remains opted in; only the Meta delivery window closed"*. STOP looks up
  `getActiveOptInByMobile` (ACTIVE only), so an EXPIRED member's STOP does nothing.
- `apps/api/src/modules/wa-opt-in/handlers.ts`: revoke on a non-ACTIVE row returns 409 `wa_opt_in.not_active`.
- `apps/mobile/app/(settings)/notifications.tsx` + `packages/i18n/locales/en/common.json`: an EXPIRED member sees
  *"WhatsApp opt-in expired"* / *"Your WhatsApp opt-in window closed. Tap below to opt in again."* and an enable button. The revoke
  control appears only for ACTIVE.
- `packages/domain/src/notifications/delivery.ts` `resolveWaTarget` reads `isOptInActive`, so the alert system's WhatsApp messages
  have the same 24-hour reach, not only the reminder.
- `apps/jobs/src/wa-webhook-processor.ts`: `/** The 24h Meta customer-service window, in ms. */`; only the PENDING→ACTIVE match sets
  `window_expires_at` — no later message extends it. `packages/channels/src/providers/whatsapp-errors.ts`: *"UTILITY templates CAN be
  sent outside 24h, but some accounts/message shapes still surface a window error"*.
- **The older records of a yes:** every activation records a NEW `whatsapp_opt_in` consent row (a fresh `consentId`); expiry
  revokes none; STOP and the API revoke revoke only the current opt-in's `consentId`; `consent_records` has no unique index;
  `consentExists` (`packages/domain/src/consent/read.ts`) is true on ANY unrevoked row. No code calls `consentExists` for
  `whatsapp_opt_in`; the member data export (`packages/domain/src/data-export/assemble.ts`) lists every consent row with its
  `revokedAt`.
- **WhatsApp's own pages (read 2026-10-19):** the pricing page (developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
  — a window closes when *"24 hours have passed since the user last messaged you"*, and *"template messages are the only message
  type that can be sent outside of a customer service window"*; the Business Messaging Policy (whatsappbusiness.com/policy,
  updated 2026-09-23) — *"you have received opt-in permission from the recipient confirming that they wish to receive subsequent
  messages or calls from you"* (no duration), *"You are solely responsible for determining the method of opt-in, that you have
  obtained opt-in in a manner that complies with laws applicable to your communications"*, and *"You must respect all requests
  (either on or off WhatsApp) by a person to block, discontinue, or otherwise opt out"*; the template-categorization page
  (…/whatsapp/templates/template-categorization) — *"Utility templates are typically triggered by a user action or request"*;
  approval needs a non-promotional template that is *"specific to or requested by the user"* or *"essential or critical to the
  user"*.

## E4 — Commands to re-verify every claim

```
grep -n "^### Decision 2026-10-10-303\|^### Decision 2026-07-08-065" .decision-log.md
grep -n "isOptInActive" -A 25 packages/domain/src/wa-opt-in/read.ts | grep -n "windowExpiresAt\|ACTIVE"
grep -n "is NOT revoked on window expiry\|resolveWindowExpiresAt\|getActiveOptInByMobile" apps/jobs/src/wa-webhook-processor.ts   # the comment wraps after "Consent"
grep -n "wa_opt_in.not_active" apps/api/src/modules/wa-opt-in/handlers.ts
grep -n "waNotifications.expired_title\|waNotifications.expired_desc" packages/i18n/locales/en/common.json packages/i18n/locales/hi/common.json
grep -n "customer-service window" apps/jobs/src/wa-webhook-processor.ts
grep -n "recordConsent\|consentId" apps/jobs/src/wa-webhook-processor.ts
grep -n "consentId" apps/api/src/modules/wa-opt-in/handlers.ts
grep -n "insert(memberWaOptIn)" packages/domain/src/wa-opt-in/write.ts
grep -n "consent_records" packages/domain/migrations/0017_*.sql
grep -n "consentRecords" packages/domain/src/data-export/assemble.ts
grep -rn "consentExists(" packages apps --include=*.ts | grep -v tests | grep whatsapp_opt_in   # expect none
grep -n "Claim-contact exception" -A 10 _bmad-output/planning-artifacts/architecture.md
grep -n "how long that consent lasts is open" .decision-log.md
grep -n "EXPIRED_24H_WINDOW\|expired" "apps/mobile/app/(settings)/notifications.tsx"
grep -n "isOptInActive" packages/domain/src/notifications/delivery.ts
grep -n "24h-window expiry\|EXPIRED_24H_WINDOW\|dual gate" docs/adr/ADR-0029-*.md
grep -n "24h customer-service window" _bmad-output/planning-artifacts/architecture.md
grep -n "already in the approved plan" _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-10-6-27-asking-the-neighbours.md
```
