# Trustee Panel routing note — a text message about a member's own contribution when the app cannot reach them, and the Trust's announcement channels

> **§0 gate — passed (2026-10-23).** **Question 1** asks what the Trust OWES a member it cannot reach through the app, for the
> three notices about their OWN contribution: the approved plan sends a text only after a WhatsApp message fails, so a member
> without WhatsApp is never texted. Widening that extends a ratified plan — yours, as you widened it once before for the claim
> families (`-255` F7). **Question 2** asks what members are expected to do about the Trust's two announcement channels (one on
> WhatsApp, one on Telegram): join if they like, or join as a duty. The rules today call such channels "mirrors … not official";
> a duty to join is a new member obligation. Both are yours.
> ⚠ **Split out, NOT asked here:**
> - whether a member's agreement is needed before the Trust texts them about their own contribution — a legal question for
>   counsel, recorded as a go-live check (the go-live record row `member-alert-sms-fallback-live`, leg (f));
> - how the channels are built and fit the technical plan (a WhatsApp Channel is not in it today) — the author's, after your answer;
> - the engineering choices (when a text is retried, how a send is recorded) — being built, not asked.
> ⭐ **Nothing waits for your answer.** The build follows the approved plan (Question 1, A); a "B" is a small change. No channel is
> built until you answer Question 2.
> ✅ **ANSWERED 2026-10-23 — Decision `2026-10-23-390` (Trustee-ratified, Dhiraj Rahul + Kalpana Bharti): Question 1 B,
> Question 2 A.** The ruling is in the block below; everything after it is kept unedited, as put.
> ✅ **SENT to the Panel by BigDev on 2026-10-23** (BigDev: *"I have sent the note to Panel"*) — this version, unedited. Written on
> BigDev's answers to Story 5.11's build questions (Task 0.2, 2026-10-23; Decision `2026-10-23-389`): three notices are texted; the two
> general notices go to the Trust's channels.

---

> ## ✅ PANEL RULING — 2026-10-23, Decision `2026-10-23-390` (Trustee-ratified)
>
> **Ratifying trustees:** Dhiraj Rahul, Kalpana Bharti. **Verbatim, as relayed by BigDev:** *"by DR and KB"* / *"Q1 B, Q2 A"*.
>
> - **Question 1 — B.** *"Widen it for these three notices — any member the app (and WhatsApp, where used) could not reach."* A member
>   with no app notification gets the three texts, whether or not they said yes to WhatsApp. Cost accepted as put (≈ 1 English / 2 Hindi
>   SMS parts per unreached member per cycle, plus 1 / 2 per payment problem; a change to the approved plan, as F7 was; consent is
>   counsel's).
> - **Question 2 — A.** *"A request — members are asked to join one channel; the app stays the official channel; R10(B) is unchanged."*
>   Cost accepted as put. The Panel did ⛔ ask for the pool-open post to name only the pool — `-180` stands for the posts.
>
> **Not covered:** consent (counsel — go-live leg (f)); the price per text; every other notification; how the channels are built and
> asked for (the author's). ⭐ Everything below is kept **unedited** as the questions **as they were put**
> ([[feedback_supersede_never_reinterpret]]).

---

# Question 1 — should a member WITHOUT WhatsApp get a text about their own contribution when the app cannot reach them?

**In one sentence:** when the app's notification does not reach a member, should the Trust send a short text message when their
contribution is still not recorded on day 10, when their payment could not be matched, or when their payment is still not confirmed —
even if that member has not said yes to WhatsApp messages?

**Why it cannot be decided without you:** the approved plan says a member without WhatsApp gets ONLY the app's notification, never a
text. Changing who the Trust contacts, and at what standing cost, is a change to that plan — as when you widened it for the claim
families on 2026-09-27.

## The one fact that decides it

⭐ **Under the approved plan, a member the app cannot reach — and who has not said yes to WhatsApp — hears NOTHING outside the app about
their own contribution, yet a cycle they miss still counts.** It counts in their contribution record (R7) and toward the ninety-percent
rule for an illness death (R8) — so a family's claim can turn on a notice the member never saw. These three notices are about one member's
own payment, so they can never be posted on the Trust's channels (the technical plan keeps per-member content off any channel). The
Niyamavali puts this on the member: *"Missed information is the member's responsibility"* (R10(B)); the app is the official channel.

⇒ The question is whether the Trust should go beyond what R10(B) requires, for these three notices only.

## The texts we would send (English; the Hindi says the same — BigDev has reviewed both)

| When | The text |
|---|---|
| Day 10, not yet recorded | *"TWT: your contribution to pool [pool] is not recorded yet. This cycle closes on [date]. Please contribute."* |
| A payment could not be matched | *"TWT: we could not match your payment yet. We will help you sort it out. Please see the app."* |
| A payment still not confirmed | *"TWT: we still have not been able to confirm your payment for pool [pool]. Please check or retry in the app."* |

At most **one text per cycle** for a member who is never reached (day 10, and only if they have not contributed), plus one per payment
problem. A text goes only when the app's notification — and WhatsApp, where the member uses it — did not get through. Every other app
notification (a pool opening, days 5, 13 and 14, "thank you, recorded", and all news, surveys and notices) is never texted. A pool opening
and the last day go to the Trust's channels instead (Question 2).

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Keep the approved plan** — a text only after a WhatsApp message to that member failed. | A member without WhatsApp hears about their own contribution only through the app. | Almost nobody is ever texted: only a member who said yes to WhatsApp, in a Pariwar that switched WhatsApp on, whose WhatsApp message failed. The members the app cannot reach are not helped. Consistent with R10(B). |
| **B** | **Widen it for these three notices** — any member the app (and WhatsApp, where used) could not reach. | A member with no app notification gets the texts above. | A standing text-message cost: about 1 SMS part per unreached member per cycle in English, 2 in Hindi (Hindi texts are longer in SMS terms), plus 1 / 2 per payment problem; the price per part is not yet known (no contract). A change to the approved plan, as F7 was. A member who said no to WhatsApp still gets texts — they were not asked about texts (whether they must be is counsel's). |
| **C** | **Widen it for day 10 only.** | The member hears when their contribution is not recorded. | About 1 English / 2 Hindi SMS parts per unreached member per cycle. A payment problem is still heard only in the app — a member who paid but was not matched may not know. |

**Our reading:** B — **because** a missed cycle can cost a family its claim, and these three notices are the ones about the member's own
contribution that no channel post can carry; the texts are short, carry no amount or private detail beyond the pool, and go only when the
app failed.

# Question 2 — the Trust's announcement channels: may members join, or must they?

**In one sentence:** the Trust will run one WhatsApp Channel and one Telegram channel that post general notices — a pool opening and a
cycle's last day; should members be asked to join one of them, and is joining a request or a requirement?

**Why it is yours:** what a member is expected to do is membership policy. Today the rules name the app as the only official channel, and
Telegram and WhatsApp as *"mirrors offered for convenience and … not official"* (R10(B); the draft Terms, cl.10). A requirement to join adds
a member duty.

## The one fact that decides it

⭐ **The Trust cannot see which of its members joined.** A WhatsApp Channel does not show its admin the followers' phone numbers, and a
Telegram channel shows Telegram accounts, not membership. So the Trust could never check a requirement, and could never tell a member who
missed a post from one who never joined.

## What the channels would post

| When | The post (BigDev's words, written as texts; a post has no length limit) |
|---|---|
| A pool opens | *"TWT: your pool [pool] is open, in support of [name]'s family. Please open the app to contribute."* |
| The cycle's last day | *"TWT: today, [date], is the last day of this cycle for pool [pool]. If you are able, please contribute."* |

Nothing about one member's own payment is ever posted.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **A request** — members are asked to join one channel; the app stays the official channel; R10(B) is unchanged. | A member who joins hears of every pool opening and last day even when the app's notification fails. | A member who does not join hears of them only in the app (and through the per-member Telegram or WhatsApp messages, where switched on). |
| **B** | **A requirement** — joining one channel becomes a member duty in the Terms. | The same, plus a duty. | It cannot be checked (above). A member without WhatsApp or Telegram — for example on a basic phone — cannot meet it. A change to the Terms, and to the Niyamavali if you adopt it there. |
| **C** | **No channels.** | General notices reach a member only in the app (and the per-member messages, where switched on). | A member the app cannot reach hears of a pool opening nowhere. |

**Our reading:** A — **because** a channel is a useful second route for general notices, but a duty the Trust cannot check adds a rule
without adding protection; R10(B) already says what a missed notice means.

**Costs that come with A or B (stated, not asked):**
- Following your ruling on the deceased family's name (`-180`: the full name on the cycle-open notice; *"no consumer is excluded"*), the
  pool-open post names the family. **A WhatsApp Channel is listed in a public directory and anyone can follow it** — so the name, the pool
  and the date can be read by people outside the Trust. If you want the post to name only the pool, say so: that would narrow `-180` for
  this one place.
- **Meta offers no official way for software to post to a WhatsApp Channel** (found 2026-10-23; only unofficial gateways that drive a
  linked phone). WhatsApp posts would be made by hand by a Trust admin. A Telegram channel can be posted to by the Trust's software.

---

# What is at stake right now

- **Live today:** nothing. No text of these kinds is registered with the telecom operator, no Pariwar has WhatsApp switched on, no Trust
  channel exists, and the app is not in production.
- **Blocked:** nothing. The build follows the approved plan (Question 1, A); B or C is a one-place change. The texts cannot go live
  until they are registered and approved, whatever you decide. The channels are not built until you answer Question 2.
- **If nothing is decided:** the approved plan stands — in practice, no member is texted, and there are no channels.

---

# How much to trust this note

- **Earlier versions of this question:** two drafts were written on 2026-10-23 and neither was sent.
  - The first (Story 5.11 v1.0) said *"the members the app cannot reach are mostly the ones without WhatsApp too"* — there is no evidence
    for that, and it is removed. It also folded the consent question into Question 1; that is now split out to counsel.
  - The second asked about FIVE texts (adding a pool opening and the last day) and asked a second question: whether the long-name rule
    you ruled for the claim texts (`-379`) could apply to the pool-open text. BigDev then moved the two general notices to the Trust's
    channels. No text now carries a name, so that question is withdrawn.
- **Corrected in this note — something you were told earlier:** in the 2026-09-02 note on the deceased family's name (`-180`), you were
  told *"SMS is reached when PUSH FAILS"*. That described the code, not the approved plan — and the code's "text" was a stand-in that only
  writes a log line and reports success. No member has ever been sent a text by it. The approved plan never texted a member without
  WhatsApp. Your ruling (the full name on the cycle-open notice) is unaffected and is followed by the channel post.
- **Still uncertain:**
  - how many members the app cannot reach — nothing measures it yet;
  - the price per SMS part — no gateway contract exists yet;
  - whether a member's own-contribution notice needs their agreement under the telecom rules — the reading that it does not
    ("service-implicit") rests on secondary sources; it is counsel's (go-live leg (f));
  - what a WhatsApp Channel's admin can see of followers, and whether Meta adds a posting API — from secondary sources on 2026-10-23,
    not from Meta's own pages;
  - whether the deceased family's name already appears anywhere public — not checked for this note.

---

# In plain English

The Trust's app tells members when their pool opens and when their contribution is due. Some members will not get those messages — a
phone without the app, notifications turned off, a broken phone. The plan we were given says such a member gets a text only if they use
WhatsApp and the WhatsApp message failed too. A member without WhatsApp gets nothing. The Trust's rules say missed information is the
member's own responsibility. But a missed cycle can cost a family its claim.

The Trust will also run a WhatsApp Channel and a Telegram channel for general news: "a pool has opened", "today is the last day". Those
cannot carry "your payment was not matched" — that is one person's business.

So we ask two things. First: may the Trust text any member the app could not reach, for the three notices about their own contribution?
It costs money for every text, and it changes the plan. Second: should members simply be asked to join a channel, or required to? We
suggest asking, not requiring — the Trust cannot see who joined, so a requirement could never be checked. If this summary and the evidence
below ever disagree, the evidence is the record.

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

> Architecture §3.4 (ratified with ADR-0029 by `2026-07-08-065` — as `2026-10-21-374` describes it: *"the design ratified on 2026-07-08 by
> `-065` (ADR-0029 and architecture §3.4)"*), the channels list: *"SMS (DLT-transactional / PE/OE) — preserved fire conditions: (i) OTP
> delivery (§2.2); (ii) step-up OTP (§2.2); (iii) per-member transactional fallback when both WA gates ON and WA delivery returns failure
> after the committed retry window; plus the per-Pariwar cycle-open SMS bridge below for degraded-push + disabled-WA conditions. Not a
> bulk-alert channel."*

> Architecture §3.4, "Per-member fallback SMS dispatch": *"When both WA gates are ACTIVE (Pariwar admin + member opt-in) and WA delivery
> returns undelivered after the committed retry window (3 attempts × exponential backoff), the dispatcher fires a DLT-transactional SMS
> containing the equivalent template payload. Fallback fires per message, not per cohort. Members without active WA opt-in receive only
> in-app push for non-OTP notifications — they do not receive transactional-fallback SMS."* — and its 2026-09-28 annotation: *"The sentence
> above still holds for every `dispatch()` notification."*

> Architecture §3.4, "Telegram channel privacy posture": *"Telegram mirror is announcements-only — alert published, cycle-close summary,
> public news. Per-member and per-claim content (contribution-confirmed, helpdesk-reply, claim-status-change) is not eligible for Telegram
> dispatch."*

> `2026-09-27-255` F7 [Trustee-ratified]: *"THE APPROVED PLAN IS WIDENED: text-message (SMS) reminders go to the people the filing
> agreement covers … when they are outside the app. ⚠ Chosen with its stated costs: a change to the approved plan (which dropped bulk SMS
> for cost and regulatory reasons), a new DLT template registration, and a cost per message."* Its scope: *"F7 is a narrow widening: SMS
> for 6.19's correction reminders only … ⛔ not a return of the bulk-alert SMS the PRD dropped."* Its "does NOT cover": *"the family SMS is
> go-live gated on counsel"*. Its consequence 2: §3.4 *"owed an annotation, ⛔ never a rewrite"*.

> `2026-09-02-180` Q1 [Trustee-ratified]: *"The deceased family's full name renders on every consumer of `resolvePoolIdentity`: … ④ the
> cycle-open push / WhatsApp / SMS copy (8.8). ⇒ ⛔ no consumer is excluded, and ⛔ no split is authorised."*

**Committed plan text (not a Panel ruling):** PRD addendum RA-29 — *"Bulk-alert SMS dropped; OTP-SMS, step-up-OTP-SMS, and
transactional-fallback-SMS preserved."* (rationale: *"TRAI bulk-SMS DLT approval friction + per-SMS cost at 4L scale"*). Epics Story 5.6's
AC (*"… OR (c) the member has no opted-in higher-tier channels"*) CONFLICTS with §3.4; 5.6's own D1: *"Do not silently implement a blanket
no-channel→SMS fallback"*. PRD FR-73: *"Telegram channel mirror `[v1-S, but locked]` — TSCT-cohort honor channel; fire-and-forget mirror of
alerts."* The TSCT reference extract: *"TWT decision: Telegram still **mandatory** for TWT to honor TSCT-cohort members migrating in
(mirror strategy). TWT alerts posted to Telegram **in addition to** in-app/WhatsApp."* — "mandatory" there is the Trust offering Telegram,
not members joining it.

**Rulebook text (the Niyamavali is a rulebook, not a ratified spec):** R10(B), TWT-adapted (PRD `prd.md`, the Terms phrasings list):
*"Missed information is the member's responsibility — official communications are delivered via the channels listed in this clause."*
(official channel: the in-app surface; Telegram and WhatsApp Business are mirrors). Terms of Membership DRAFT v0.2 cl.10: *"The official
channel is the in-app surface. Telegram and WhatsApp Business are mirrors offered for convenience and are not official. It is the member's
responsibility to check the in-app surface."* No Niyamavali clause, FR mapping or amendment draft names SMS, a WhatsApp Channel, or a duty
to join any channel.

## E2 — What is NOT ratified

- Whether a member without an active WhatsApp yes may receive a fallback text (Question 1).
- Whether members are asked or required to join a Trust channel (Question 2); BigDev's direction (2026-10-23): *"Trust will have a
  WhatsApp Channel and Telegram Channel where all members are supposed to join, either of them to get the notifications."*
- A WhatsApp Channel as a channel of the technical plan — §3.4 lists WhatsApp Business messages to opted-in members only.
- Whether a member's agreement is needed before an own-contribution notice is texted — `2026-10-21-375` "Does NOT cover": *"any SMS
  consent (row 5-11)"* — counsel's, not asked here.
- Whether R7's counting of a missed cycle presumes the member was told — R10(B) says it does not; no ruling restates it.
- The cost per text at scale — recorded once the gateway price is known; not ruled.
- Related, NOT governing: `2026-10-17-350` [Trustee-ratified] — for the claim reminders, *"A REMINDER THE NETWORK REPORTS AS NOT
  DELIVERED NO LONGER COUNTS AS REACHING THE PERSON"*. Its scope is those reminders; it shows the Panel has treated "reached" as
  "actually delivered" before. For member notices the code counts a WhatsApp message as reaching the member once Meta accepts it.

## E3 — What the code actually does (at `d87d047a`)

- The text-message step exists and is DARK: every alert text was one whole-body variable the operator will not register (Story 6.34,
  `2026-10-10-313` TV6). Being dark, it falls to a stand-in that writes a log line and REPORTS SUCCESS (`packages/channels/src/providers/fixture-sms.ts:29-37`)
  — no text is sent.
- The code does NOT enforce §3.4's WhatsApp condition: `resolveSmsTarget` has no opt-in check (`packages/domain/src/notifications/delivery.ts:151-175`,
  doc *"SMS has NO opt-in"*), and a member with no WhatsApp target goes straight on to the text step
  (`apps/jobs/src/scheduler/contribution-notify.ts:303-309`; test trail `push:rejected, whatsapp:skipped_no_target, sms:sent`,
  `apps/jobs/tests/contribution-notify.test.ts:263-274`). ⇒ *"SMS is reached when PUSH FAILS"* (`-180`'s context) is TRUE of the code and
  FALSE of the plan — and the "reaching" was the stand-in.
- Story 5.11 builds Option A: one check (`isAlertSmsFallbackEligible`, the name is the developer's) allows a text only when the member's
  WhatsApp was attempted and did not succeed; B or C changes that one check and its tests.
- No Pariwar has WhatsApp switched on (`pariwar_wa_config.enabled` defaults to false; no seed or migration sets it) ⇒ under A, no member
  qualifies today.
- Telegram today is a PER-MEMBER mirror, not a channel: a member gets a Telegram message only when their Pariwar switched Telegram on, they
  opted in, and they linked a chat (`packages/domain/src/notifications/delivery.ts:187-201`); only three kinds of notice are eligible — an
  alert published (which includes a pool opening), a new module, a Niyamavali amendment (`packages/channels/src/dispatch.ts:44-52`); the
  Pariwar switch defaults off (`packages/domain/migrations/0045_pariwar-telegram-config.sql:19`). No code posts to a channel.
- Lengths at the longest values (pool 30 letters, date 10): each of the three English texts is 1 SMS part, each Hindi text 2 (Story 5.11,
  "The words").

## E4 — Commands to re-verify every claim

```
# the rulings (locate by bare number; a mis-dated id greps EMPTY)
grep -n '^### Decision .*-065' .decision-log.md
grep -n '^### Decision .*-180' .decision-log.md
grep -n '^### Decision .*-255' .decision-log.md
grep -n '^### Decision .*-313' .decision-log.md
grep -n '^### Decision .*-374' .decision-log.md
grep -n '^### Decision .*-375' .decision-log.md
grep -n '^### Decision .*-350' .decision-log.md
# no ruling on SMS reach to members or on Trust channels (the hits are other subjects: -382, -365, -358, -350)
grep -n '^### Decision' .decision-log.md | grep -i 'sms\|fallback\|channel' | head
# §3.4 text, annotation and Telegram posture
grep -n 'they do not receive transactional-' _bmad-output/planning-artifacts/architecture.md
grep -n 'still holds for every `dispatch()` notification' _bmad-output/planning-artifacts/architecture.md
grep -n 'Telegram mirror is announcements-only' _bmad-output/planning-artifacts/architecture.md
# R10(B), RA-29, FR-73, the TSCT extract
grep -n "Missed information is the member's responsibility" _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md
grep -n 'Bulk-alert SMS dropped' _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/addendum.md
grep -n 'FR-73: Telegram channel mirror' _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md
grep -n 'mirror strategy' _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/extract-tsct-reference.md
# no Niyamavali clause names SMS (EMPTY is the finding)
grep -n -i 'sms\|text message' packages/domain/seed/niyamavali-v1-clauses.sql
# no WhatsApp Channel anywhere in the plan (EMPTY is the finding)
grep -rn -i 'whatsapp channel' _bmad-output/planning-artifacts/architecture.md _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md
# the code: no opt-in on SMS; the stand-in reports success; WhatsApp and Telegram default off; Telegram per member
grep -n 'NO opt-in (the member' packages/domain/src/notifications/delivery.ts
grep -n "status: 'accepted'" packages/channels/src/providers/fixture-sms.ts
grep -rn 'enabled' packages/domain/src/schema/pariwar_wa_config.ts
grep -rln 'pariwar_wa_config' packages/domain/seed packages/domain/migrations
sed -n 263,274p apps/jobs/tests/contribution-notify.test.ts
sed -n 187,201p packages/domain/src/notifications/delivery.ts
sed -n 44,52p packages/channels/src/dispatch.ts
grep -n '"enabled" boolean DEFAULT false' packages/domain/migrations/0045_pariwar-telegram-config.sql
```
