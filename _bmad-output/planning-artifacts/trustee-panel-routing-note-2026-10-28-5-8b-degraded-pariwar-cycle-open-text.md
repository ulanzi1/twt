# Trustee Panel routing note — one text when a new cycle opens, for a Pariwar the Trust has declared unreliable to reach

> **§0 gate — passed (2026-10-28).** **Question 1** asks what the Trust OWES the members of a Pariwar whose notifications it has
> declared unreliable: one text when a new cycle opens. In October you were told a pool opening is never texted (`-390`'s note);
> texting one, even on a declared Pariwar only, widens what you ruled on — yours. **Question 2** (asked only if Question 1 is A or C)
> asks whether the long-name rule you ruled for the four claim texts (`-379`) may extend to this fifth text — extending a ratified
> rule's scope is yours.
> ⚠ **Split out, NOT asked here:**
> - whether a member's agreement is needed before the Trust texts them — counsel's, the go-live check already open for the three
>   contribution texts (go-live record row `member-alert-sms-fallback-live`, leg (f)), shared by this text;
> - the price per text — no gateway contract yet; recorded once known;
> - the engineering choices (the text is tried first and the app and WhatsApp follow if it cannot go; how a send is recorded, retried
>   and recovered; who may declare) — the author's, decided by BigDev on 2026-10-28 and being built, not asked.
> ⭐ **Nothing waits for your answer except going live.** The text is built now and stays switched off until you answer Question 1
> and its template is approved by the telecom operator. A "B" to Question 1 means it is never switched on.
> ✅ **ANSWERED 2026-10-28 — Decision `2026-10-28-414` (Trustee-ratified, Dhiraj Rahul + Kalpana Bharti): Question 1 A, with a
> Super Admin on / off switch; Question 2 A.** The ruling is in the block below; everything after it is kept unedited, as put.
> ✅ **SENT** — recorded by the answer itself (whether the full note or a shorter copy was shown is not recorded). Written 2026-10-28
> on BigDev's answers to Story 5.8b's build questions (Task 0.2, 2026-10-28: *"FS1-FS16 as recommended"*).

---

> ## ✅ PANEL RULING — 2026-10-28, Decision `2026-10-28-414` (Trustee-ratified)
>
> **Ratifying trustees:** Dhiraj Rahul, Kalpana Bharti. **Verbatim, as relayed by BigDev:** *"by DR and KB"* / *"Q1 A - but build a
> switch that can be turned on/off by Superadmin, in case later we decide to turn it off."* / *"Q2 A"*.
>
> - **Question 1 — A, with a condition.** On a declared Pariwar, every member assigned to a pool is texted once when the cycle opens.
>   Cost accepted as put (about 2 SMS parts per member per cycle, up to 3; price not yet known; one declaration texts a whole
>   Pariwar; a change to what the Panel ruled in October). ⭐ The condition: the text is built with an on / off switch a Super Admin
>   operates, so the Trust can turn it off later. B and C were not chosen — the trigger is the manual declaration whether or not the
>   Pariwar's WhatsApp is on.
> - **Question 2 — A.** The claim texts' rule (`-379`) reaches this text: the full name whenever it fits 60 letters; above that, titles
>   dropped, then first words to initials, never the last word. Cost accepted as put.
>
> **Not covered:** the switch's shape (its starting position, Trust-wide or per Pariwar, where it lives, how a change is recorded and
> shown) — the build's, BigDev's; the price per text; consent (counsel); the automatic trigger; every other notification and Pariwar.
> ⭐ Everything below is kept **unedited** as the questions **as they were put** ([[feedback_supersede_never_reinterpret]]).

---

# Question 1 — may the Trust text a declared Pariwar's members when a new cycle opens?

**In one sentence:** when the Trust has declared that a Pariwar's notifications are not getting through, may it send every member of
that Pariwar one short text when a new cycle opens for their pool — although you were told in October that a pool opening is never
texted?

**Why it cannot be decided without you:** in October you ruled on a plan in which a pool opening goes to the Trust's announcement
channels and is never texted. This is one exception to that plan. Who the Trust contacts, and at what standing cost, is yours.

## The one fact that decides it

⭐ **The text goes ONLY to a Pariwar a Trust administrator has declared unreliable, ONLY for a cycle that opens while that declaration
stands, and at most ONCE per member per cycle. Every other Pariwar is exactly as you ruled in October.** The technical plan has always
named this one case — a narrow safety net for a Pariwar the app cannot reach — as separate from the bulk texting the Trust dropped.
The Trust has built the declaration; the text itself has never existed.

## The text we would send (English; the Hindi says the same — BigDev's words, the pool-open words you saw in October)

| When | The text |
|---|---|
| A new cycle opens for the member's pool, on a declared Pariwar | *"TWT: your pool [pool] is open, in support of [name]'s family. Please open the app to contribute."* |

`[name]` is the family the pool supports, in the form the Pariwar shows names in — the full name, or the shorter form if the Pariwar
uses it (your ruling `-180`: the full name on the cycle-open notice, *"no consumer is excluded"*).

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Yes** — on a declared Pariwar, every member assigned to a pool is texted once when the cycle opens. | A member the app cannot reach hears of the new cycle by text, whether or not they use WhatsApp. | Every such member is texted each cycle while the declaration stands: about **2 SMS parts per member per cycle** in English or Hindi, up to 3 with the longest pool and family names; the price per part is not yet known (no contract). One declaration texts a whole Pariwar. A change to what you ruled in October. |
| **B** | **No** — the text is never switched on. | A declared Pariwar's members hear of a new cycle only in the app, by WhatsApp where it is on, and through the Trust's channels if they joined one. | The gap the safety net exists for stays open: a member the app cannot reach, without WhatsApp and not in a channel, hears nothing — yet a cycle they miss still counts toward their record and the ninety-percent rule for an illness death. |
| **C** | **Yes, but only when the Pariwar's WhatsApp is switched off.** | As A, for a declared Pariwar that does not use WhatsApp. | When WhatsApp itself is down for everyone but the Pariwar's WhatsApp setting is on, nobody is texted. The technical plan's own wording carries this condition; the declaration as built does not. |

**Our reading:** A — **because** it is the one exception the technical plan and the PRD always named, it is switched on only by a
deliberate declaration for one Pariwar, and the member it reaches is exactly the one who would otherwise miss a cycle that counts.

**Stated, not asked (true under A or C):**
- **A member whose own death has been reported to the Trust is not texted** — their phone is now with their family, and the text names
  a family. (The technical plan stops notifications to such an account; the text follows it.)
- **A member whose text went does not also get the app notification for that cycle opening** — the text replaces it. The opening is
  always shown in the app, and if the text cannot go, the app notification and WhatsApp are tried as today.
- **Who can declare:** a Pariwar's administrator or a super administrator, in the admin tool. A declaration that is revoked stops texts
  for later cycles, not for one that already opened. The admin screen will say all this to whoever declares.
- **Suspended and grace-period members are texted** — they are assigned to a pool, so the cycle concerns them.

# Question 2 — a family name longer than 60 letters (asked only if Question 1 is A or C)

**In one sentence:** when the family the pool supports has a name longer than 60 letters, may the Trust shorten it in this text the
way you approved for the four claim texts — titles dropped first, then first words turned to initials, never the last word?

**Why it is back:** in October you were told this question was withdrawn because *"No text now carries a name"*. If Question 1 is A
or C, one does.

## The one fact that decides it

⭐ **The text has room for 60 letters of name, and your rule (`-379`) covers only the four claim texts.** Most names fit whole and are
sent whole; nothing measures how many do not.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Yes, the same rule** — shortened only above 60 letters, as for the claim texts. | Every member of the Pariwar is texted; a very long family name appears shortened. | A family's name appears shortened in a text that every member of the Pariwar receives. |
| **B** | **No** — a family whose name does not fit whole is not named, so that cycle's text is not sent. | Members of such a pool rely on the app, WhatsApp where on, and the Trust's channels for that cycle. | The members supporting the family with the longest name are the ones left out. |
| **C** | **A different rule.** | Depends on the rule. | A new rule to word, build and test. |

**Our reading:** A — **because** the rule is already built, tested and approved by you for texts more sensitive than this one.

**Until you answer, B applies:** a name over 60 letters is not texted (never cut mid-name, never dropped from a text that is sent).

---

# What is at stake right now

- **Live today:** nothing. The app is not in production, no template for this text is registered with the telecom operator, and no
  text of this kind has ever been sent.
- **Blocked:** nothing in the build. Going live waits for Question 1 (and the operator's approval of the template, the price and the
  other go-live checks); an over-60 name waits for Question 2.
- **If nothing is decided:** the text is built but stays switched off; a declared Pariwar is reached as in October's plan.

---

# How much to trust this note

- **Earlier versions of this question:** none sent. The story's first draft (2026-10-27) treated texting a pool opening on a declared
  Pariwar as already covered by the technical plan; checking what you were actually told in October showed it widens that, so it is
  asked here. Its draft cost line said *"at most 2 English / 3 Hindi parts"*; BigDev then chose to register the English text in the
  format that can carry a Hindi name, so the English count is now the same as the Hindi — about 2, up to 3 — and this note says so.
- **Corrected in this note — something you were told earlier:** in the 2026-10-23 note (on texts for members without WhatsApp,
  ruled `-390`) you were told *"Every other app notification (a pool opening, days 5, 13 and 14, …) is never texted. A pool opening and
  the last day go to the Trust's channels instead."* That is still true for every Pariwar the Trust has NOT declared unreliable. It
  left out the one exception the technical plan already named — this one — which was then switched off and had no words. Your Question 2
  ruling (members are asked, not required, to join a channel) is unaffected. The same note's *"No text now carries a name, so that
  question is withdrawn"* is why Question 2 is back.
- **Still uncertain:**
  - the price per SMS part — no gateway contract exists yet;
  - how many members a declared Pariwar has, and how long texting all of them takes — measured at a staging rehearsal before go-live;
  - how many family names exceed 60 letters — nothing measures it;
  - whether a member's agreement is needed — counsel's (go-live leg (f) of `member-alert-sms-fallback-live`);
  - reading the technical plan's *"WhatsApp switched off"* condition as belonging to an AUTOMATIC detector (not built) rather than to a
    trustee's declaration is the author's reading — Option C is the way to hold the Trust to the plan's wording.

---

# In plain English

When the app's notifications are not reaching a Pariwar — the notification service is down, WhatsApp is down, phones are not showing
them — a Trust administrator can declare that Pariwar unreliable to reach. The system already lets them do that, and the admin screen
already promises it will text members. It does not: the text was never written.

We have now written it, in the same words you saw in October for the channel post: "your pool is open, in support of [name]'s family".
We ask you two things. First: may the Trust send that one text to every member of a declared Pariwar when a new cycle opens? In
October you were told a pool opening is never texted, so this is an exception you should approve. It costs about two SMS parts per
member per cycle, price not yet known. We suggest yes. Second: if a family's name is longer than 60 letters, may it be shortened the way
you approved for the claim texts? We suggest yes. Until you answer, nothing is sent. If this summary and the evidence below ever
disagree, the evidence is the record.

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

> Architecture §3.4 (ratified with ADR-0029 by `2026-07-08-065` — as `2026-10-21-374` and `2026-10-23-390` describe it), the channels
> list: *"SMS (DLT-transactional / PE/OE) — preserved fire conditions: (i) OTP delivery (§2.2); (ii) step-up OTP (§2.2); (iii)
> per-member transactional fallback when both WA gates ON and WA delivery returns failure after the committed retry window; plus the
> per-Pariwar cycle-open SMS bridge below for degraded-push + disabled-WA conditions. Not a bulk-alert channel."*

> Architecture §3.4, "Power-saver awareness": *"Cycle-open SMS bridge (Pariwar-degraded-mode fallback): for cycle-open and other
> time-critical templates, when per-Pariwar push delivery rate falls below threshold AND the Pariwar WA admin-toggle is OFF, dispatcher
> fires a per-Pariwar SMS bridge to members. This is distinct from per-member WA-failure fallback (above) and from bulk-alert SMS
> (banned per RA-29) — it is a narrow degraded-mode safety net for time-critical communications. Trigger thresholds in Category 5
> Observability."*

> Architecture §3.4, "Lifecycle-driven dispatch suppression": *"When a member account enters a frozen state in the Account State
> Machine (`claim-filed-frozen`, `disbursed-frozen-readable`, `disabled-T+90`, `public-record-∞`), the dispatcher suppresses
> member-class push notifications for that account at the dispatch boundary."*

> `2026-10-23-390` [Trustee-ratified] Q1 B (the three own-contribution notices widened) and Q2 A (*"A request — members are asked to
> join one channel; the app stays the official channel; R10(B) is unchanged."*); its §2: *"⛔ A return of bulk-alert SMS (PRD RA-29) —
> per member, per message, only when the app (and WhatsApp, where used) did not reach them; three notices."* The note it ruled on
> (`trustee-panel-routing-note-2026-10-23-5-11-sms-for-members-without-whatsapp.md`, "The texts we would send"): *"Every other app
> notification (a pool opening, days 5, 13 and 14, "thank you, recorded", and all news, surveys and notices) is never texted. A pool
> opening and the last day go to the Trust's channels instead (Question 2)."*; "How much to trust": *"No text now carries a name, so
> that question is withdrawn."*

> `2026-09-02-180` Q1 [Trustee-ratified]: the full name renders on *"④ the cycle-open push / WhatsApp / SMS copy (8.8). ⇒ ⛔ no
> consumer is excluded, and ⛔ no split is authorised."* The form follows the Pariwar's presentation mode — `2026-09-02-181` (BigDev,
> MODE-RESOLVED).

> `2026-10-22-379` Q1 A [Trustee-ratified], scoped to *"THE FOUR TEXTS"*: *"(1) Send the full name whenever it fits 60 letters. (2)
> Only if it is longer: remove titles and suffixes … (3) If still longer: turn words into their first letter, starting from the FIRST
> word, one word at a time, until it fits — and ⛔ never the last word"*.

**Committed plan text (not a Panel ruling):** PRD addendum RA-29 lists the *"Pariwar-degraded-mode cycle-open bridge"* among the SMS
surfaces preserved when bulk-alert SMS was dropped; the PRD's TRAI line requires DLT registration for the *"degraded-mode
cycle-open-bridge SMS"*; and the PRD carries the same condition as §3.4: *"Pariwar-degraded-mode cycle-open bridge when push delivery
is degraded and WA admin-toggle is OFF (architecture §3.4)."* Epics Story 5.8 (planning text): *"As a Pariwar undergoing a
degraded-mode event (in-app push infrastructure down, WA Business API unavailable system-wide, or trustee-declared "treat all
cycle-open as critical") … So that no member misses a cycle-open alert during infrastructure degradation"*; *"every eligible member
receives the SMS regardless of channel-tier rules; cost impact is accepted as the trade-off for reach during degradation"* — no
decision entry rules on that cost.

**Author-commits this note follows (BigDev, not the Panel):** `2026-10-23-389` (Story 5.11) — headline *"A POOL OPENING AND THE LAST
DAY ARE ⛔ TEXTED — THEY ARE FOR THE TRUST'S ANNOUNCEMENT CHANNELS (BIGDEV'S DIRECTION)"* and §1 item 6 (*"the degraded-mode bridge
stays dark … the bridge's words are a new backlog row"*); BigDev's Story 5.8b answers (2026-10-28), to be recorded as a new decision
that supersedes `-389`'s headline, §1 item 1 and item 6 in part — for a declared Pariwar only.

## E2 — What is NOT ratified

- Texting a pool opening on a declared Pariwar (Question 1). No decision entry rules on Story 5.8's declaration, the bridge's trigger,
  its cost or its words (grep of the decision headings through `-413` hits only `-180`, the name, and `-389`, which keeps the bridge
  dark; `-313`, `-394` and `-404` mention it in their bodies, none ruling on these).
- Whether the technical plan's *"WA admin-toggle is OFF"* condition binds a manual declaration (Option C) — the built declaration does
  not read the toggle.
- The 60-letter rule for this text (Question 2) — `-379` is scoped to the four claim texts.
- The cost per text at Pariwar scale — price unknown (`member-alert-sms-fallback-live` leg (d)).
- Consent — `2026-10-21-375` "Does NOT cover": *"any SMS consent (row 5-11)"* — counsel's.
- A general lifecycle-suppression hook for every notification — not built (`member-alert-sms-fallback-live` leg (g)); this text
  excludes a deceased member on its own.

## E3 — What the code actually does (at `64e01121`)

- The declaration is BUILT (Story 5.8): a cycle that freezes while it is active opens a time-critical alert, and every member's
  fan-out knows the alert is bridged (`apps/jobs/src/scheduler/contribution-notify.ts:372-375`). Then nothing is texted: the bridge has
  no words, so its SMS step ends *"not lit"* and the ordinary app → WhatsApp ladder runs (`contribution-notify.ts:414`).
- The admin screen ALREADY promises a text: *"⚠ Degraded mode ACTIVE — the cycle-open SMS bridge is armed."* and *"Cycle-open alerts
  will force SMS to every eligible member, bypassing cost-optimization."*
  (`apps/admin/src/modules/degraded-mode/DegradedModeBanner.tsx:55-58`; the page header, `DegradedModePage.tsx:37-41`). Story 5.8b
  rewords both to what is built.
- Who may declare: `pariwar_admin` and `super_admin` only (`packages/domain/tests/rbac/roles.test.ts:551-557`).
- A member whose death has been reported IS on the cycle-open roster: the roster reads one pre-derived flag
  (`packages/validity-service/src/payload.ts:151-156`, which does not read the death-claim overlay; `apps/jobs/src/assignable-roster.ts`
  must not filter it — AI-7-2). Story 5.8b removes such a member from the TEXT only, at send time, from the overlay
  (`packages/domain/src/member/overlay.ts`); their app and WhatsApp notifications are unchanged.
- Lengths (pool label up to 30 letters, name up to 60, both texts registered in the format that can carry Devanagari): about 114–126
  characters typically ⇒ 2 SMS parts; 174 (en) / 176 (hi) at the longest ⇒ 3 parts (computed from the words above, 70 / 67 characters
  per part).
- The name fitter sends a name whole up to 60 letters; above that it returns a shortened form that only the four claim texts may use
  (`apps/jobs/src/scheduler/sms-member-name.ts`); for this text, a name that does not fit whole is not sent and one alarm (with a count,
  never the name) is raised.

## E4 — Commands to re-verify every claim

```
# the rulings (locate by bare number; a mis-dated id greps EMPTY)
grep -n '^### Decision .*-065' .decision-log.md
grep -n '^### Decision .*-180' .decision-log.md
grep -n '^### Decision .*-181' .decision-log.md
grep -n '^### Decision .*-375' .decision-log.md
grep -n '^### Decision .*-379' .decision-log.md
grep -n '^### Decision .*-389' .decision-log.md
grep -n '^### Decision .*-390' .decision-log.md
# no ruling on the bridge, its trigger, cost or words: two headings hit — -180 (the name on the cycle-open copy) and -389
# (keeps the bridge dark); -313, -394 and -404 mention it in their bodies only; none rules on the trigger, cost or words
grep -n '^### Decision' .decision-log.md | grep -i 'bridge\|degraded\|cycle-open\|pool open'
# §3.4: the channels list, the bridge paragraph, lifecycle suppression
grep -n 'plus the per-Pariwar cycle-open SMS bridge below' _bmad-output/planning-artifacts/architecture.md
grep -n 'degraded-mode safety net for time-critical' _bmad-output/planning-artifacts/architecture.md
grep -n 'Lifecycle-driven dispatch suppression' _bmad-output/planning-artifacts/architecture.md
# the PRD's conjunct, RA-29, the TRAI line; the epic
grep -n 'Pariwar-degraded-mode cycle-open bridge' _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/addendum.md
grep -n 'degraded-mode cycle-open-bridge SMS' _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md
grep -n 'cost impact is accepted as the trade-off' _bmad-output/planning-artifacts/epics.md
# what the Panel was told in October
grep -n 'is never texted' _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-5-11-sms-for-members-without-whatsapp.md
grep -n 'No text now carries a name' _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-5-11-sms-for-members-without-whatsapp.md
# the code: bridged but not lit; the screen's promise; who may declare; the roster flag
sed -n 372,375p apps/jobs/src/scheduler/contribution-notify.ts
sed -n 414p apps/jobs/src/scheduler/contribution-notify.ts
sed -n 55,58p apps/admin/src/modules/degraded-mode/DegradedModeBanner.tsx
sed -n 37,41p apps/admin/src/modules/degraded-mode/DegradedModePage.tsx
sed -n 551,557p packages/domain/tests/rbac/roles.test.ts
sed -n 151,156p packages/validity-service/src/payload.ts
# no Niyamavali clause names SMS, the bridge or a notification duty (EMPTY is the finding)
grep -n -i 'sms\|text message\|bridge\|degraded' packages/domain/seed/niyamavali-v1-clauses.sql
```
