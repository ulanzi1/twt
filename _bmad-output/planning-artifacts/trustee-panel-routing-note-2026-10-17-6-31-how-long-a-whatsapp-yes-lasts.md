# Trustee Panel routing note — 2026-10-17 — Story 6.31: how long does a member's "yes" to WhatsApp from the Trust last?

**§0 gate — why this is the Panel's.** It is a consent question: how long a member's agreement to be messaged lasts. The answer that
makes your earlier ruling work would replace part of a design you ratified on 2026-07-08 (`-065`, ADR-0029). Without the
citations, the question is: *"a member said yes to WhatsApp from the Trust; does that yes last until they take it back, or only for
one day?"* That is a trustee question, not an engineering one. The engineering half (how the system stores and reads the answer)
is built by Story 6.31 either way. Only the meaning is asked here.

> ## ⏳ AWAITING PANEL RULING
>
> **Nothing is recorded here yet.** Written 2026-10-17 at `bmad-create-story 6.31` (pin `dae96d9b`). **Not yet sent.** When the
> Panel rules, the ruling is copied into this block **and** into `.decision-log.md` as a new decision id. Everything below then stays
> **unedited**, as the question **as it was put**.

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
at any time. The system as built treats that 24-hour chat window as the life of the member's yes. *(This is our reading of why it
was built so. The design notes describe the opt-in as "ACTIVE + … Meta 24h customer-service window opened".)* After 24 hours the app
tells the member *"WhatsApp opt-in expired … Tap below to opt in again"*, and the Trust stops sending to them. But the member's
consent record still says *granted*, and a WhatsApp "STOP" from them is ignored.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **A yes lasts until the member takes it back** (in the app, or by replying STOP), for every WhatsApp message from the Trust. | Members who said yes get the reminder, and later the Trust's other WhatsApp messages. The app shows them as still opted in, with a way to withdraw that always works. | More WhatsApp messages reach members than the system sends today. Before anything is sent on a yes older than a day: the app's "expired" wording must change, its withdraw control must show, and STOP must always work. It replaces part of a design you ratified. |
| **B** | **A yes lasts until withdrawn, but only for the neighbours' reminder for now.** Other WhatsApp messages keep today's 24 hours until a later decision. | Only the reminder reaches members on a yes older than a day. | The same fixes as A, and it also replaces part of the design you ratified (for the reminder). Also two meanings of one "yes" side by side, which is harder to explain: the app would have to say the member is still reachable for reminders but "expired" for everything else. |
| **C** | **Keep it as built: a yes counts for 24 hours.** | Almost no neighbour gets the reminder: only one who said yes to WhatsApp in the last day. The text message still goes to all five. | Your 2026-10-10 reminder exists on paper but rarely happens. The consent record keeps saying *granted* after the app has told the member it expired. Nothing is sent on it, so it is a stale record, not an unwanted message. |

**Our reading:** **A**, because a member who says yes to WhatsApp means "you may message me", not "you may message me today".
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

- **Earlier versions of this question:** none. The 2026-10-10 note on asking the neighbours said WhatsApp to members who opted in
  *"is already in the approved plan"*. That was true of the plan, but nobody had checked how long an opt-in lasts as built. This was
  found on 2026-10-17 while writing Story 6.31.
- **Corrected in this note before sending:** the first draft said the app's "withdraw" button refuses. In fact the app never shows
  that button to an expired member; it tells them the opt-in expired. It is the server, and a WhatsApp STOP, that refuse.
- **Still uncertain:** (1) whether counsel would want the consent wording itself to say how long a yes lasts; counsel's view on
  WhatsApp consent has not been recorded. (2) Guides written by third parties, not WhatsApp's own pages, say WhatsApp may class the
  reminder as "marketing". If so it does not go at all (your 2026-10-10 ruling already covers that). That is separate from this
  question.

---

# In plain English

When a member agrees to receive WhatsApp messages from the Trust, the system treats that agreement as lasting one day. It seems to
have been mixed up with a WhatsApp rule about chatting. After the day passes, the app tells the member their opt-in "expired" and
the Trust stops messaging them, yet the record still says they agreed, and a STOP from them is ignored. So the reminder you approved
for neighbours would almost never be sent. We suggest a member's yes should last until they take it back, and that the app must
show this and taking it back must always work. That needs small fixes before any message relies on an older yes. If you prefer, the
change can apply only to the neighbours' reminder for now.

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

## E2 — What is NOT ratified

No ruling says how long a member's WhatsApp consent lasts as consent. ADR-0029 ratified a state machine in which a 24-hour expiry
exists. It does not say that the expiry ends the member's consent, and the consent record is not revoked by it (E3). No ruling covers
withdrawing an expired opt-in, or what the app tells the member when the 24 hours pass.

## E3 — What the code actually does (pin `dae96d9b`)

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
- **Inference:** WhatsApp's documented rule is that templates may be sent outside the 24-hour customer-service window, so the 24
  hours is not a consent rule (WhatsApp pricing / messaging documentation, read 2026-10-17).

## E4 — Commands to re-verify every claim

```
grep -n "^### Decision 2026-10-10-303\|^### Decision 2026-07-08-065" .decision-log.md
grep -n "isOptInActive" -A 25 packages/domain/src/wa-opt-in/read.ts | grep -n "windowExpiresAt\|ACTIVE"
grep -n "is NOT revoked on window expiry\|resolveWindowExpiresAt\|getActiveOptInByMobile" apps/jobs/src/wa-webhook-processor.ts   # the comment wraps after "Consent"
grep -n "wa_opt_in.not_active" apps/api/src/modules/wa-opt-in/handlers.ts
grep -n "waNotifications.expired_title\|waNotifications.expired_desc" packages/i18n/locales/en/common.json
grep -n "EXPIRED_24H_WINDOW\|expired" "apps/mobile/app/(settings)/notifications.tsx"
grep -n "isOptInActive" packages/domain/src/notifications/delivery.ts
grep -n "24h-window expiry\|EXPIRED_24H_WINDOW\|dual gate" docs/adr/ADR-0029-*.md
grep -n "24h customer-service window" _bmad-output/planning-artifacts/architecture.md
grep -n "already in the approved plan" _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-10-6-27-asking-the-neighbours.md
```
