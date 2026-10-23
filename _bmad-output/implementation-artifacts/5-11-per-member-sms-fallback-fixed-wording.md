---
baseline_commit: 1268d47e
---

<!--
PINNED: 1268d47e (origin/main, "story(6.36d): ledger 2026-10-23af — LANDED on main by fast-forward"; re-pinned at v1.3 from
`d87d047a` — the rebase at Task 0.3 / 0.4, 6.36d landed). Branch
`story/5-11-per-member-sms-fallback-fixed-wording`, worktree `.claude/worktrees/5-11-per-member-sms-fallback-fixed-wording`.

Two facts, kept apart (footgun #24): (1) the PIN is valid iff `git merge-base --is-ancestor 1268d47e HEAD`; (2) the FOUND FACTS
are valid iff `git diff --name-only 1268d47e..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory` is EMPTY
or every changed path is re-checked against the F it touches. Re-run BOTH at Task 0.1 — never assume either. (Both held at the
v1.1 validation, 2026-10-23; at v1.3 the 6.36d diff touched five cited files — the line numbers re-taken, Debug Log (e).)

STATUS: 2026-10-23 created (`bmad-create-story 5.11`) → ready-for-dev; v1.1 validated the same day. v1.2 (same day): Task 0.2
ANSWERED by BigDev (Debug Log (a)) — FS1 (d), THREE texted notices (the two general notices, pool open and the last day, go to the
Trust's announcement channels — PQ3); FS16 (b); every other FS as recommended; the words corrected by BigDev (en + hi). PQ1 reshaped
to the three; PQ2 WITHDRAWN (no text carries a name); PQ3 NEW (the channels). v1.3 (same day): rebased onto `1268d47e`; Task 0.3
(Decision `-389`, `6db47c17`) and Task 0.4 (the records) DONE; the note SENT by BigDev 2026-10-23. v1.4 (same day): THE PANEL RULED — Decision `2026-10-23-390`
(Trustee-ratified, DR + KB: *"Q1 B, Q2 A"*): PQ1 B — the three texts go to any member the app (and WhatsApp, where used) could not
reach, WhatsApp yes or not (I2 / AC3 / Task 3 follow); PQ3 A — members are ASKED to join a Trust channel. Next: Task 1.

SCOPE SPLIT (v1.1): this story makes the alert SMS rung HONEST and decides WHAT is sent, to WHOM, in WHICH words; the REAL SEND
(send record, CRQID kind, per-send MSG91 provider, language, budget, retry window) is row `5-11b-alert-sms-real-send` — its
build decisions are carried, corrected, in "Carried to 5.11b" below and are NOT answered at this story's Task 0.2. Precedent:
6.37 → 6.37b. Day-one output of 5.11 alone: no SMS is sent to any member, and none is falsely reported as sent.

START CONDITION — MET at the pin: 5.6 (the SMS rung), 5.12 (a yes has no clock), 6.34 (typed DLT variables; TV6 dark), 6.35
(`members.preferred_locale`, migration 0179), 6.37 / 6.37b / 6.37e (MSG91 adapter, delivery reports, the two name boxes), 8.8
(the first live `dispatch()` — the contribution notices) are all `done` on `main`.

NUMBERS (footguns #19 / #42(e); `-366` decision 6): this file names no decision id, roster Row number or DLT-sheet ordinal that
is not yet taken. The next free of each is found AT THE TIME OF USE (Task 0.3 / 0.4 / 5): `^### Decision` on `main` + every
branch + every worktree; the roster's highest `### Row`; the DLT sheet's highest template `#`. At the pin they WERE: decision
`-388`, Row 39, template 16. 5.11 adds NO migration (the send record is 5.11b's). The roster row is named by its KEY
`member-alert-sms-fallback-live`.

§0 GATE (trustee-panel-routing-note-TEMPLATE.md) — readings:
  ⭐ v1.4: BOTH Panel questions RULED by `2026-10-23-390` (Trustee-ratified) — PQ1 B (G1's widening, for the three notices only — §3.4's
  *"they do not receive transactional-fallback SMS"* superseded in part); PQ3 A (G12 — a request, R10(B) unchanged). The readings below
  are kept as written at v1.1 / v1.2.
  G1  architecture §3.4 fire condition (iii) *"per-member transactional fallback when both WA gates ON and WA delivery returns
      failure after the committed retry window"* + §3.4 *"Members without active WA opt-in receive only in-app push for non-OTP
      notifications — they do not receive transactional-fallback SMS."* — FS2 (a) MATCH; FS2 (b) WIDENS ⇒ PQ1 (the Panel's).
      §3.4 is treated as RATIFIED: `-374` (Trustee-ratified) describes `-065` as ratifying *"ADR-0029 and architecture §3.4"*;
      `-375` cites *"`-065` item 4 (ADR-0029, §3.4)"*; `-357` (Trustee-ratified) amended §3.4 for claimants; deferred-work calls
      (iii) "ratified". And `-255` F7 (Trustee-ratified) widened the SMS plan ONLY by a ruling, *"with its stated costs"*. ⇒
      widening is the Panel's on both grounds ([[feedback_supersede_never_reinterpret]]).
  G2  §3.4 *"after the committed retry window (3 attempts × exponential backoff)"* — the window is 5.11b's FS9; 5.11 keeps
      today's retry profile (FS14) and narrows nothing.
  G3  PRD RA-29 / §4.10 *"Bulk-alert SMS dropped … transactional-fallback-SMS preserved"* and architecture §3.4's *"Not a
      bulk-alert channel"* — MATCH for FS1 (d) (per member, per message, only on a failed higher rung); lighting the cycle-open
      BRIDGE would reach every member of a degraded Pariwar ⇒ not in this story (FS10).
  G4  the v1 SMS category set is *"a DERIVED product default"* (BigDev 2026-07-06, `sms-dlt-registry.ts:14-24`), which
      *"Deliberately EXCLUDED"* `alert_published` as a broadcast. v1.2: FS1 (d) as ANSWERED KEEPS that 2026-07-06 call — no
      `alert_published` message is texted (FS1 (a) would have reversed it for pool open); `claim_status_change` / `helpdesk_reply`
      stay dark (author-commits).
  G5  the WORDS (FS4): new member-facing copy; no ratified text exists for them (contrast DLT templates 7–14, the Panel's words).
      Author's, en; Hindi under a review row (the DLT sheet's *"every Hindi text — the author's, under a review row"*) — v1.2:
      BigDev reviewed and corrected en + hi in session (Debug Log (a)); G10 / G11 no longer bind a text (no text carries a name).
  G6  `-387` LS11 — *"Every other sender keeps its language … ⭐ Trigger: a story or ruling that sets a language rule for that
      message"* — the alert SMS's language rule is 5.11b's FS5; 5.11 sets none.
  G7  `-385` (Trustee-ratified) — the neighbours' reminder falls back to the Pariwar's language — 5.11b's FS5 analogy.
  G8  `-375` "Does NOT cover": *"any SMS consent (row 5-11)"* — CONSENT IS NOT PQ1 (the template: *"A MIXED QUESTION IS TWO
      QUESTIONS"*). It is counsel's, carried as roster leg (f) (FS11) — `-255` F7's family SMS was likewise *"go-live gated on
      counsel"*, and `-374` recorded *"Counsel has not been asked"* as an accepted cost, not an answer.
  G9  `-349` decision 1 (no claim flow in production with an unapproved template), as NARROWED by `-354` decision 3 (a "not
      live" branch needs a Panel ruling first) — scoped to templates 1–14; FS11 carries the same rule for the new templates as a
      roster leg (the author's narrowing).
  G10 `2026-09-02-180` Q1 (Trustee-ratified) — the deceased family's FULL NAME renders on *"④ the cycle-open push / WhatsApp /
      SMS copy (8.8)"*; *"⛔ no consumer is excluded, and ⛔ no split is authorised"*; *"a future story that splits them is
      reversing this entry, ⛔ not optimising."* ⇒ the pool-open SMS CARRIES the name (FS4 (a) MATCH); dropping it (FS4 (b)) is a
      narrowing of `-180` ⇒ the Panel's. ⚠ `-180`'s context told the Panel *"SMS is reached when PUSH FAILS"* — true of the code
      (F4), not of §3.4's plan; PQ1's "Earlier versions / Corrected" section discloses it.
      v1.2: no text carries the name (FS1 (d)). ⭐ The pool-open CHANNEL post is a consumer of the same identity ⇒ it carries the
      full name (*"no consumer is excluded"*) — a cost PQ3's note states (a WhatsApp Channel is publicly listed), not a narrowing.
  G11 `2026-10-22-379` Q1 A (Trustee-ratified) — the full name across TWO 30-letter boxes; above 60, titles dropped, then first
      words become initials, never the last word. Its scope is *"THE FOUR TEXTS"* (claim templates 7–14). Applying the same
      rule to the pool-open SMS widens a ratified rule's scope ⇒ PQ2 (one line, the Panel's). Names ≤ 60 letters need no rule.
      v1.2: MOOT — no text carries a name; PQ2 WITHDRAWN (a channel post has no 60-letter limit).
  G12 Niyamavali R10(B) (PRD `prds/prd-TWT-2026-05-22/prd.md:1255`) — *"Missed information is the member's responsibility —
      official communications are delivered via the channels listed in this clause"* (official channel: the in-app surface;
      Telegram / WhatsApp mirrors); Terms draft v0.2 cl.10 carries the same and *"It is the member's responsibility to check the
      in-app surface."* FS2 (a) MATCHES R10(B) as written; PQ1 asks whether the Trust goes beyond it.
      v1.2: BigDev's direction (2026-10-23) that *"all members are supposed to join"* a Trust WhatsApp / Telegram Channel goes
      beyond a mirror ⇒ PQ3 (the Panel's — a member duty). v1.4: RULED A (`-390`) — a request, ⛔ a duty.
  G13 (v1.2) architecture §3.4's channel list names WhatsApp Business messages to opted-in members, and a Telegram mirror that is
      per member and *"announcements-only"* (`architecture.md`, "Telegram channel privacy posture"); a Trust BROADCAST channel on
      either is in neither ⇒ an architecture note (the author's) and a backlog row, both AFTER PQ3 — ⛔ built by 5.11. Found
      2026-10-23 (secondary sources only): Meta has no official API for posting to a WhatsApp Channel.
  NOT covered by any ruling: the reach of the alert SMS for a member without WhatsApp (PQ1); the Trust's announcement channels and
  any duty to join them (PQ3); counsel's view on alert SMS (roster leg (f)); the cost per message at 4L (recorded, not ruled).

GLYPH REGISTER: ⛔ marks a prohibition at the START of a bullet or clause only — inside a sentence this file writes "not" /
"never" in words. ⭐ = recommended / load-bearing; ⚠ = trap or caveat. `.decision-log.md`, `deferred-work.md` and
`sprint-status.yaml` are NEVER cited by `file:NNN` (newest-first prepends move every line).

LETTERS: F = found facts · FS = build decisions (PROPOSED; answered by BigDev at Task 0.2) · I = invariants · T = traps ·
S = Task 0.1 STOP conditions · PQ = Panel question.
-->

# Story 5.11: The Per-Member SMS Fallback Gets Fixed, Registrable Wording (en + reviewed hi) and an Honest Rung — WHAT Is Texted, to WHOM, in WHICH Words; the Real Send Is 5.11b `[SURFACE]`

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** A member the app cannot reach hears nothing by text today: the per-member SMS
> fallback exists in code but is dark, because every v1 alert SMS was one whole-body variable that TRAI will not register (Story
> 6.34 TV6). Worse, "dark" is not silent — the rung falls to a log-only stand-in that reports `sent` (F3), and that false `sent`
> is also what stops the job retrying (F19). This story writes FIXED wording (en + hi) for the THREE contribution notices about a
> member's own payment (v1.2, FS1 (d): day 10 *"not recorded yet"*, payment not matched, payment still not confirmed — the general
> notices, pool open and the last day, go to the Trust's announcement channels, PQ3) — records it for DLT
> registration, puts it in a message-keyed registry, gives the producers an SMS block, and decides WHO may receive it: as the
> approved plan reads, a member whose WhatsApp is on and failed (FS2 (a)); it asked the Trustee Panel (PQ1) whether a member WITHOUT
> WhatsApp should get it too — ⭐ v1.4: RULED B (`-390`): any member the app (and WhatsApp, where used) could not reach. It makes the rung honest — no alert SMS is reported `sent` without a real send — WITHOUT changing
> who is retried (FS14). The real send is row `5-11b-alert-sms-real-send`. The degraded-mode bridge stays dark. OTP stays exactly
> as it is.
>
> **Day-one output: no SMS, and an honest trail.** Every Pariwar's WhatsApp is off (`pariwar_wa_config.enabled` DEFAULT false; no
> seed or migration enables it) and no template id is provisioned. What changes on day one: every alert's SMS rung ends NOT-sent
> with a named reason instead of a fake `sent`; the member is recorded `in_app_only` (FS14) so the job completes on its first
> attempt, exactly as it does today; `alert.channel_send` audits for fake SMS sends stop.
>
> **What already ships and this story REUSES:** the ladder + cascade (`dispatch.ts`, `cascade.ts`); the DLT vocabulary and shape
> check (`dlt-variables.ts`); the per-message × locale registry shape (`peer-mesh-sms-templates.ts`,
> `suspicion-notice-sms-templates.ts`); the DLT sheet's lockstep helpers (`apps/jobs/tests/_dlt-template-sheet.ts`).
>
> **What it CHANGES:** a NEW registry `apps/jobs/src/scheduler/contribution-sms-templates.ts` (message × locale, registrable); the
> category registry `sms-dlt-registry.ts` (stays all-dark; dated header note); the alert payload (an optional SMS block — FS7);
> `fanOutAlert`'s SMS rung (eligibility, lit/not-lit, honest non-send — FS2, FS15); the WhatsApp stand-in for an enabled Pariwar
> (FS3); the child job's outcome for an unreachable member (FS14); the bridged path (FS10); `contribution.json` (en + hi `sms.*`
> keys); the CI gate's `REGISTRY_FILES`; the DLT sheet; the roster; tests.
>
> **What it READS and leaves alone:** push and WhatsApp copy; Telegram; the OTP registry and path; the claim texts (templates 1–14),
> their core `claim-dlt-sms-send.ts`, and `sms-member-name.ts` / `sms-member-boxes.ts` (imported, not edited); `claim_status_change`
> (no producer) and `helpdesk_reply` (log-only in production) — both stay dark.

## Story

As a **member whose phone the Trust's app cannot reach**,
I want **a short text message, in my language, when my contribution is still not recorded, and when my payment could not be
matched or confirmed** (v1.2: a pool opening and the cycle's last day reach me through the Trust's announcement channels — PQ3),
so that **I am not left out of a cycle — and the record of what I missed — only because a push notification never arrived**.

(5.11 decides and words these texts and makes the rung honest; 5.11b sends them.)

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| Architecture §3.4 channels list (`architecture.md:2115-2119`) | *"SMS … preserved fire conditions: (i) OTP … (ii) step-up OTP … (iii) per-member transactional fallback when both WA gates ON and WA delivery returns failure after the committed retry window; plus the per-Pariwar cycle-open SMS bridge … Not a bulk-alert channel."* | ratified via `-065` (G1) |
| Architecture §3.4 "Per-member fallback SMS dispatch" (`architecture.md:2318-2324`; annotation `:2326-2331`) | *"When both WA gates are ACTIVE … and WA delivery returns undelivered after the committed retry window (3 attempts × exponential backoff), the dispatcher fires a DLT-transactional SMS containing the equivalent template payload. Fallback fires per message, not per cohort. Members without active WA opt-in receive only in-app push for non-OTP notifications — they do not receive transactional-fallback SMS."* + the 2026-09-28 annotation: *"The sentence above still holds for every `dispatch()` notification."* | ratified; annotated, never rewritten |
| `2026-09-27-255` F7 (Trustee-ratified) | *"THE APPROVED PLAN IS WIDENED: text-message (SMS) reminders go to the people the filing agreement covers … Chosen with its stated costs: a change to the approved plan (which dropped bulk SMS for cost and regulatory reasons), a new DLT template registration, and a cost per message."* Consequence 2 (untagged — under "Consequences"): §3.4 *"owed an annotation, ⛔ never a rewrite"*. "Does NOT cover": go-live gated on counsel. | RATIFIED — the precedent for PQ1 |
| `2026-09-02-180` Q1 (Trustee-ratified) | the full name on *"④ the cycle-open push / WhatsApp / SMS copy (8.8)"*; *"⛔ no consumer is excluded, and ⛔ no split is authorised"* | RATIFIED — binds FS4 (G10) |
| `2026-10-22-379` Q1 A (Trustee-ratified) | *"THE MEMBER'S FULL NAME IN THE FOUR TEXTS, ACROSS TWO NAME BOXES (60 LETTERS); ONLY ABOVE 60 THE LISTED TITLES ARE DROPPED, THEN THE FIRST WORDS BECOME INITIALS, ⛔ NEVER THE LAST WORD"* | RATIFIED for templates 7–14 — PQ2 asks about the pool-open SMS (G11) |
| Niyamavali R10(B) (`prds/prd-TWT-2026-05-22/prd.md:1255`); Terms v0.2 cl.10 | *"Missed information is the member's responsibility — official communications are delivered via the channels listed in this clause."*; cl.10 adds *"It is the member's responsibility to check the in-app surface."* | rulebook text (not a ratified spec) — G12 |
| PRD RA-29 (`prds/prd-TWT-2026-05-22/addendum.md`) / §4.10 | *"Bulk-alert SMS dropped; OTP-SMS, step-up-OTP-SMS, and transactional-fallback-SMS preserved."* Rationale: *"TRAI bulk-SMS DLT approval friction + per-SMS cost at 4L scale"*. §4.10: *"Per-member transactional fallback when both WhatsApp gates … are ON and WA delivery fails"*. | committed |
| epics.md Story 5.6 AC | SMS after *"(a) in-app push fails … OR (b) WA delivery fails per AR-19, OR (c) the member has no opted-in higher-tier channels"* — CONFLICTS with §3.4; 5.6's own D1 (`5-6-…md:123`) said *"Do not silently implement a blanket no-channel→SMS fallback"*. The code followed (c) (F4). | conflict, recorded |
| `2026-10-10-313` TV6 (author-commit) | the five whole-body alert entries DARK *"until a later story writes fixed en + hi wording"*; FOUND (c): six types, ≥ 30 % fixed, ≤ 2 variables (a third *"in case of exigency"*), alphanumeric ≤ 40 | BUILT (6.34) |
| `2026-10-17-345` MG12 (author-commit) | *"the alert dispatch path stays DARK: a send with ⛔ named values is refused locally (`no_named_values`)."* | BUILT (6.37) — Gate B (F3) |
| `2026-10-23-387` LS11 / LS13 (author-commit) | LS11: senders other than the neighbours' text keep their language until *"a story or ruling that sets a language rule for that message"*; LS13's screen (`common.json` `language.intro`): *"Some messages from the Trust (SMS and WhatsApp) will also come in this language."* | BUILT (6.35) — 5.11b's FS5 |
| `2026-10-23-385` (Trustee-ratified) | the neighbours' WhatsApp reminder that cannot go in the member's chosen language goes in the Pariwar's language | RATIFIED — 5.11b analogy |
| `2026-10-21-375` "Does NOT cover" | *"any SMS consent (row 5-11)"* | open → roster leg (f) (G8) |
| Row 30 note (1) (`inventory-roster.md`) | *"provisioning `sms.dlt.template_id.<category>` for any of them does NOTHING … turning the per-member SMS fallback on needs fixed wording (en + hi), a later story with its own §0."* | open — discharged in part here |
| Row 38 (d-i) / deferred-work 5.10-validate item | a switched-on Pariwar with no approved WA template: the stand-in reports `accepted` ⇒ *"the ladder stops before SMS"*; fix shape (d-ii) *"a fixture must not count as `sent` for a Pariwar whose WhatsApp is `enabled`"* | OPEN — FS3 |

## ⭐ THE INVARIANTS

- **I1 — Registered text = catalogue text, byte for byte.** Every lit message's registry `contentTemplate` is the `sms.*` string from
  `contribution.json` with each `{param}` as `{#var#}`, checked through the REAL `t()`; the DLT sheet row matches. (Rendering the sent
  body and the value proof are 5.11b's — the same invariant, enforced at send.) *Proof:* AC2.
- **I2 — Who receives it is ONE named predicate.** `isAlertSmsFallbackEligible` (name the dev's) decides the reach; ⭐ v1.4, as
  RULED by `-390` Q1 B: true only for a lit message when the push rung did not end `sent` AND (`ctx.targets.whatsapp === null` — no
  WhatsApp target: Pariwar off or no ACTIVE yes — OR the WhatsApp rung did not end `sent`, FS3's refusal included). (The v1.2 build, FS2
  (a), also required `ctx.targets.whatsapp !== null`; the ruling removed it.) *Proof:* AC3.
- **I3 — No alert SMS is ever reported `sent` without a real send.** On the alert fan-out path the SMS rung never reaches
  `createFixtureSmsProvider` in production composition — for lit AND non-lit messages (FS15). Every non-send names its reason in the
  trail. The fixture stays for tests only. *Proof:* AC4.
- **I4 — The retry profile does not change in 5.11.** A member no rung reached is recorded `in_app_only` and not retried — exactly
  the members who are not retried today (today the fake `sms:sent` stops them). *Proof:* AC4.
- **I5 — Not a bulk channel.** No broadcast (`news`, `survey`, `moderation`, `module_new`, `niyamavali_amended`, the staff push) and no
  degraded-mode bridged send can reach a lit template. Only the messages FS1 names, only per member, only on a failed higher rung.
  *Proof:* AC5.
- **I6 — Hindi parity.** Every lit message has en + hi; the catalogues carry a `$comment.sms` NOT-YET-HUMAN-REVIEWED key in BOTH en
  and hi (the `claim.json` convention) until the review leg closes. *Proof:* AC2.

## 📜 Policy meaning (AI-10-1)

**5.11 introduces a predicate that decides whether a member is TOLD, by text, about their own pool. The predicate itself gates no
benefit, but what the member would miss does:** a missed cycle counts under R7's lapse / restoration ladder and toward R8's
ninety-percent rule (`packages/domain/seed/niyamavali-v1-clauses.sql` — *"Ninety-percent contribution rule (illness-death
eligibility gate)"*), so it can decide whether the member's family can claim. In the member's terms, under the recommended FS2 (a):
*"If you have not said yes to WhatsApp messages from the Trust and the app cannot reach you, the Trust will not text you about your
pool, its deadline or your payment — and a cycle you miss still counts against your cover."* Under FS2 (b) (PQ1 answered yes):
*"If the app (and WhatsApp, when you use it) cannot reach you, the Trust texts you the few notices you must act on."*
**Niyamavali check — done, with this result:** no clause names SMS (the Niyamavali, its FR mapping and both amendment drafts); R10(B)
says *"Missed information is the member's responsibility"* with the in-app surface as the official channel, and Terms v0.2 cl.10
repeats it ⇒ FS2 (a) is CONSISTENT with the Niyamavali as written, and R10(B) does not presume a member was notified before a missed
cycle counts. Whether the Trust should go beyond R10(B) for these three notices (v1.2) is PQ1 — the Panel's; ⭐ v1.4: RULED B (`-390`) — the member's
terms are the FS2 (b) sentence above. (The Niyamavali is a rulebook,
not a ratified spec — [[feedback_niyamavali_rulebook_not_spec]].)

## ⭐ FOUND FACTS (at `d87d047a`; cites re-taken at `1268d47e` in v1.3 — re-run each at Task 0.1)

**The rung and why it is dark**
- **F1 —** `CANONICAL_CHANNEL_LADDER = ['push','whatsapp','sms']` (`packages/channels/src/dispatch.ts:34`); `isCategoryEligible` returns
  `true` for sms for EVERY category (`dispatch.ts:73-77`). No code filters who may get an SMS; the other SMS-touching checks are the
  registry (dark ⇒ fixture), the degraded bridge (`degraded-mode.ts:96-113`), cost-opt (toggle hard-coded `false`,
  `contribution-notify.ts:181`), the news channel filter (`news-publish.ts:69-77`) and a null `resolveSmsTarget`.
- **F2 —** `runChannelCascade` stops only on `sent`; `skipped_*` / `suppressed` advance immediately (`cascade.ts:109-147`, `:137-140`).
  The live fan-out passes `backoffMs: []` — pg-boss owns retry (`apps/jobs/src/scheduler/contribution-notify.ts:316`, D9;
  `CHILD_RETRY_LIMIT=4`, `CHILD_RETRY_DELAY_SECONDS=60` at `contribution-notify-triggers.ts:111-112`, `retryBackoff: true` at
  `:509-511`, `:538-540`, `:564-566`).
- **F3 — TWO gates, and "dark" reports SUCCESS.** Gate A: `resolveDltTemplate` returns `null` for an entry with `contentTemplate: null`
  (`sms-dlt-registry.ts:113-117`); `alert_published` is ABSENT from the registry and also returns null ⇒ `resolveSmsProviderDeps` null
  (`composition/provider-composition.ts:193-212`) ⇒ `createFixtureSmsProvider` (`providers/index.ts:96-102`) returns `accepted`
  (`providers/fixture-sms.ts:29-37`) ⇒ dispatch maps it to `sent` and audits `alert.channel_send` 202. ⚠ The fixture's provider id is
  `'sms-dlt'` — the SAME id as the real provider — so neither the audit nor a test can tell them apart by id. Gate B: even with a
  registrable entry, composition passes no `values` (`provider-composition.ts:210-211`) ⇒ `createSmsDltProvider.send` refuses
  `dlt_template_not_approved:no_named_values` (`providers/sms-dlt.ts:72-81`) — and it refuses `values.length === 0` too, so a zero-slot
  template can never send (5.11b's MG12 change). `resolveDltTemplate` has ONE production caller (`provider-composition.ts:203`); the
  resolver memoizes per `` `${pariwarId} ${category}` `` (`:351`) for the process lifetime — it cannot carry per-member values and its key
  has no locale.
- **F4 — (iii) is not enforced.** `resolveSmsTarget` has no opt-in gate (`packages/domain/src/notifications/delivery.ts:151-176`, doc:
  *"SMS has NO opt-in"*); `resolveWaTarget` is null when the Pariwar toggle is off or `isOptInActive` false (`delivery.ts:116-149`), and a
  null WA target is `skipped_no_target` (`contribution-notify.ts:303-309`) ⇒ the cascade goes on to SMS. Asserted by
  `apps/jobs/tests/contribution-notify.test.ts:263-274` (trail `push:rejected, whatsapp:skipped_no_target, sms:sent`). ⇒ lighting a
  registry ALONE would text exactly the members §3.4 says must not get it.
- **F5 — the WA stand-in stops the ladder.** WA `enabled` (a boolean column, `pariwar_wa_config.ts:38`) + member ACTIVE + no approved
  template ⇒ `resolveWhatsappProviderDeps` null (`provider-composition.ts:89-90`) ⇒ fixture `accepted` (`providers/fixture-whatsapp.ts:28-36`)
  ⇒ `whatsapp:sent` ⇒ no SMS. The same happens when WA is enabled but the credential name or `phoneNumberId` is blank (`:76-85`). The
  provider memo lives for the whole process (`:320-327`): a WhatsApp switch-on or template approval is seen only after a restart,
  while `resolveWaTarget` reads live. No production guard refuses a fixture (no `NODE_ENV` check; boot only logs an unconfigured SMS
  gateway, `contribution-providers.ts:276-281`). Under FS2 (a) this cuts off the ONLY members who qualify (deferred-work's
  5.10-validate item; Row 38 (d-i)). A WhatsApp `sent` means Meta ACCEPTED it; later "undelivered" reports never re-enter the ladder.

**The messages**
- **F6 — "pool assignment" is `alert_published`, and SMS eligibility must be per MESSAGE.** The cycle-open notice is one
  `alert_published` per assigned member (`contribution-notify-triggers.ts:8-12`, `:321`); the SAME category carries news
  (`news-publish.ts:161`), surveys (`survey-publish.ts:145`), moderation (`moderation-notify.ts:240`) and a direct push-only staff
  dispatch (`claim-correction-reminders.ts:607`). The FS1 (a) five map to (v1.2: FS1 (d) lights day 10, mismatch and pending-match escalated only): pool open → `alert_published` (POOL_BATCH `cycle_open`); day 10,
  day 14 AND pending-match escalated → `deadline_reminder` (`:389`); mismatch → `contribution_mismatch`, on its OWN queue and worker
  (`:1344`).
- **F7 — the per-member messages and their copy** (`packages/contracts/src/alerts/contribution-loop-templates.ts`;
  `packages/i18n/locales/{en,hi}/contribution.json` flat keys `notify.*`): NINE push messages — cycle-open (`notify.cycle_open.title/body`
  — `{pool}`, `{family}`, `{amount}`; body *"In support of {family}'s family. This cycle's contribution is {amount}. Contribute when you
  can."*); deadline days 5 / 10 / 13 / 14 (`notify.deadline.day_N.subject/display` — `{pool}`, `{days}`, `{date}`, day 14 also `{family}`);
  pending-match soft / escalated (`{pool}`); confirmed (`{cycleRef}`); mismatch (three keys — two reasons + a generic fallback — no params,
  `:441-452`). Reminders skip `already_confirmed` / `already_attested` members — `deadline_reminder` only (`:752-755`, `:819`, `:897-913`).
- **F8 —** `claim_status_change` has no producer (only `deep-link.ts`, `alert.ts:147`, `render.ts:109`, the registry and a schema CHECK);
  `helpdesk_reply`'s production notifier is `consoleHelpdeskReplyNotifier` (`apps/api/src/deps.ts:527`, log-only; a real fan-out
  `apps/jobs/src/scheduler/helpdesk-reply-notify.ts:123` exists, unused).
- **F9 — today's SMS render** is `` `${heading}: ${line}` `` (`render.ts:152-153`) with ENGLISH headings (`render.ts:82-126`) and the producer's
  line through `escapeText` (`:143`) — mixed-script, unbounded. The lit path does not use it (5.11b renders from the registry; named
  values must never pass through `escapeText`).
- **F10 — value shapes.** `{pool}` = `poolName ?? poolLetterCode` (`contribution-notify-triggers.ts:247-249`) — and `poolName` is ALWAYS
  the HINDI curated name (`resolveCuratedPoolName` returns `displayNameHi`, `packages/domain/src/notifications/pool-identity.ts:284`);
  `pool_names` has no length CHECK (`migrations/0073_pool-naming.sql`). `{date}` = `DD-MM-YYYY` UTC (`:269-274`). `{family}` =
  `familyLabel` = the mode-resolved deceased name (unbounded). `{amount}` = `formatCurrency(fixedAmount,'en')` (`"₹ 110"`, `"₹ 1,100"`).
- **F11 — language.** These senders use `deps.locale ?? DEFAULT_LOCALE` (`'hi'`) (`contribution-notify-triggers.ts:678, 1292, 1357`);
  boot never sets `locale` (`boot.ts:623-633`). `members.preferred_locale` (0179) is read by `getMemberLanguage`
  (`packages/domain/src/member/preferred-locale.ts:53-71` — returns `{ chosenLocale, pariwarDefaultLocale }`, throws when the passport
  or the member row is missing), `resolvePeerRequestLocale` (`claim/peer-mesh-request.ts:725-743`), batch SQL in `peer-mesh-request.ts:854, 907`,
  `peer-mesh-wa-reminder.ts:758-778` and `data-export/assemble.ts:419`. (5.11b's FS5.)

**Job outcome**
- **F19 — the fake `sent` is what stops retries.** The child marks every member whose cascade ended without `sent` undelivered: it
  releases that member's claim and THROWS (`contribution-notify-triggers.ts:828-868`; the confirmed / mismatch workers `:1320-1326`,
  `:1378-1384`) ⇒ pg-boss runs the job 5 times and ends it `failed`; the cycle-open recovery sweep re-enqueues every live alert whose
  recorded idempotency keys are below the expected members, every hour, with a fresh retry count (`:951-975`); the pending-match tiers
  release a weeks-long claim, so the sweep nudges those members again. Today that never happens, because the fixture's `sms:sent` makes
  every member "delivered". ⇒ an honest non-send WITHOUT FS14 starts a retry storm on day one.
- **F20 — `fanOutAlert` is DB-free by contract** (`contribution-notify.ts:128-135`): its per-member inputs come in a `MemberFanOutContext`
  resolved by `resolveMemberDeliveryContext` (DB). Anything the SMS rung needs from the database (5.11b: send row, budget, language)
  arrives as a context field or an injected seam.
- **F21 — the bridged path is SMS-only.** When the bridge is active the fan-out skips the ladder and force-sends only
  `DEGRADED_MODE_BRIDGE_CHANNELS` (`contribution-notify.ts:255-280`); `time_critical` is true only on cycle-open while a bridge declaration
  is active (`:190-203`); the recovery sweep runs with `timeCritical: false` (`triggers.ts:990`).

**Registry, sheet, gate**
- **F24 — the registry shape to copy.** `peer-mesh-sms-templates.ts:35-79` and `suspicion-notice-sms-templates.ts:46-80` (both
  `apps/jobs/src/scheduler/`) are message × locale with `slots` and `configKey` of the form `sms.dlt.template_id.<family>.<message>.<locale>`
  (no `version` field; only `sms-dlt-registry.ts:67,77` has one). They take the name slots from `sms-member-boxes.ts` `MEMBER_BOX_SLOTS`
  (`member1` / `member2`, alphanumeric, 30 each — *"the ONLY 30, the ONLY 60"*), which lives in `apps/jobs` and so cannot be imported by
  `packages/channels`. ⇒ the new registry lives in `apps/jobs/src/scheduler/`.
- **F16 — CI gate** `scripts/dlt-typed-variables/lib.ts:51-63` `REGISTRY_FILES` (includes `sms-dlt-registry.ts` and the three apps/jobs
  registries; *"A new registry joins this list in the same change that adds it"*).
- **F17 — DLT sheet** `docs/launch-gate-inventory/dlt-template-requests-6-19.md`: templates 1–16 (highest 16); shape rules `:80-92`
  (≤ 3 variables, a third with a justification line; two alphanumeric boxes may sit side by side); TV6 "Not registrable" section `:106`;
  cost `:272`; the rejection table `:330`; the Record `:348`. Lockstep helpers `sheetRowByConfigKey` / `expectRegisteredTextRow` in
  `apps/jobs/tests/_dlt-template-sheet.ts` load ONLY `claim.json` (`CLAIM_CATALOG`).
- **F22 — `checkDltTemplateShape`'s real rules:** ≤ 3 variables (the exigency line is the sheet's, not the code's), ≥ 30 % fixed,
  adjacency (two side by side only if both alphanumeric), slot name and length; a zero-variable template passes.
- **F23 — catalogue conventions.** `$comment.<suffix>` keys exist in BOTH en and hi (e.g. `claim.json:147-158`); the parity check is en→hi.
  `contribution.json` has none today, and `scripts/microcopy/contribution.test.ts`'s `resolvedStrings` scans `Object.values` INCLUDING
  `$comment` keys (the claim / member-drive tests exclude them as "LOAD-BEARING").

**Tests that assert today's dark state (they CHANGE)**
- **F18 —** `packages/channels/tests/sms.test.ts:600-656` (exactly five dark entries; `:626-638` provisioned id never read; `:89-100` MG12 —
  stays, 5.11b's); the ladder tests `apps/jobs/tests/contribution-notify.test.ts:242-300, 356-375`, `ai-8-3-ladder-armor-live.test.ts:157-238`,
  `contribution-notify-live.test.ts:155-232`; `packages/channels/tests/integration/live-dispatch-cascade.spec.ts:197` (uses the SHIPPED
  `createFixtureSmsProvider()` as its SMS rung). The tests that `vi.mock` the registry (`provider-composition.test.ts:24-38, 211-293`,
  `contribution-provider-resolver.test.ts:24-37`, `apps/api/tests/unit/sms-composition.test.ts:40, 88-161`) mock `resolveDltTemplate`; if the
  category registry keeps its semantics they need not change — confirm at Task 6.

(v1.0's F12 `sms_rate_buckets`, F13 the CRQID grammar and F14 the claim send core moved to "Carried to 5.11b"; v1.0's F15 (the bridge) is now F21. Numbers are not reused.)

## ⚖️ Build decisions (⭐ = recommended) — PROPOSED for BigDev at Task 0.2

- **FS1 — which messages go by SMS.** ⭐ **(a) five — the ones a member must act on:** pool open (cycle-open), day 10 *"not recorded
  yet"*, day 14 *"last day"*, payment not matched (ONE text for all three mismatch keys), payment still not confirmed (pending-match
  ESCALATED). Not day 5 (repeats pool-open), not day 13 (the day before 14), not pending-match soft (> 4 h), not confirmed (a thank-you
  — every cycle for every member whose push fails). The other four still go by push / WhatsApp; their SMS rung ends
  `sms_message_not_lit` (FS15). `claim_status_change` and `helpdesk_reply` stay dark (F8). This REVERSES BigDev's 2026-07-06 exclusion of
  `alert_published` for the pool-open message only (G4). → **10 templates** (5 × en/hi). *Cost (a):* at most **3 texts per member per
  cycle** on the common path (pool-open, day 10, day 14), +1 per mismatch / escalated payment. **(b) all nine push messages** — 18
  templates; ≈ 5 texts per cycle for a member who never pays, up to 9. *Cost (b):* ~2× registrations and spend; day 5 / 13 add little.
  **(c) pool-open + day 14 only** — 4 templates. *Cost (c):* a member who never opens the app learns of a missed contribution only on the
  last day, and never hears of a payment problem. **(d) — ✅ ANSWERED (BigDev, 2026-10-23, *"2"*): THREE — the notices about the
  member's OWN contribution:** day 10 *"not recorded yet"*, payment not matched, payment still not confirmed. Pool open and day 14 are
  NOT texted: they are general notices, for the Trust's announcement channels (PQ3; ⛔ built here). → **6 templates** (3 × en/hi);
  `alert_published` stays excluded (G4 kept). *Cost (d):* until the channels exist and PQ3 is ruled, a member the app cannot reach
  hears of a pool opening and its last day only in the app (and the per-member Telegram mirror, where switched on); at most **1 text
  per member per cycle** on the common path (day 10), +1 per payment problem.
- **FS2 — who receives it (I2).** ⭐ **(a) as §3.4 (iii) reads, enforced in code NOW:** eligible only when the WhatsApp TARGET was
  resolved (Pariwar on + member ACTIVE) and the WhatsApp rung did not end `sent` (incl. FS3's not-sent). Everyone else: the SMS rung is
  `skipped_no_target` with detail `sms_fallback_not_eligible`. "WA delivery returns failure" is read as the rung's own result — a later
  "undelivered" report from Meta never re-enters the ladder (F5); recorded, not widened. ⭐ **AND route PQ1** (BigDev's direction): widen
  to *"any member whose push — and WhatsApp, where on — could not reach them"*. The build ships (a); a ruled (b) is a one-function change
  + its tests, made by this story if ruled before Task 7, else by 5.11b or a dated follow-up row. *Cost (a):* day-one reach ZERO (no
  Pariwar has WhatsApp on); the motivating member — no app, no WhatsApp — is NOT reached until the Panel rules. **(b) ship the widening
  now without the Panel.** Not recommended — the Panel's (G1). **(c) keep today's code (no gate).** Not recommended — that IS (b), by
  omission (F4).
  ⭐ **v1.4 — SUPERSEDED IN PART by `2026-10-23-390` Q1 B (Trustee-ratified).** The build is the ruled widening, made by THIS story (the
  rule above: *"made by this story if ruled before Task 7"*): a lit message's SMS rung is ELIGIBLE when the push rung did not end `sent`
  AND (`ctx.targets.whatsapp === null` OR the WhatsApp rung did not end `sent`). A member with no WhatsApp yes is now reached; the FS3
  refusal still counts as "WhatsApp did not succeed". Cost as ruled: ≈ 1 en / 2 hi segments per unreached member per cycle, +1 / +2 per
  payment problem; consent stays counsel's (Row 40 (f)).
- **FS3 — the WhatsApp stand-in stops counting as `sent` for an enabled Pariwar** (deferred-work's (d-ii); Row 38 (d-i) stays as a
  provisioning leg). ⭐ **(a) fix it in the resolver:** in `createContributionProviderResolver` (`provider-composition.ts:375-388`), when
  the Pariwar's WA config is `enabled` but the deps cannot be built — no `approved` template for the category, OR a blank credential
  name / `phoneNumberId` — return a NON-ACCEPTING WhatsApp provider whose `send` answers `rejected` with detail
  `wa_template_not_approved` / `wa_credentials_missing` (a provider cannot return `skipped_no_target` — `SendResult` allows only
  `accepted` / `rejected` / `not_implemented`). The cascade advances to SMS; FS14 treats the refusal as terminal. The process-lifetime memo
  stays: a newly approved template is seen after a restart (recorded). (A disabled Pariwar never reaches this path — its WA target is
  null.) *Cost (a):* touches the WA provider selection (the item's own trigger). **(a′)** as (a) plus a TTL on the memo. *Cost (a′):* one
  more moving part in a shared resolver; not needed while no Pariwar is enabled. **(b) leave it to its item.** *Cost (b):* under FS2 (a)
  the only qualifying members are cut off until every category has an approved template in every Pariwar.
- **FS4 — the words** (table below). ⭐ **(a) as drafted, WITH the family's full name on pool-open** (`-180` Q1 — G10): pool-open carries
  `{pool}` + the two name boxes `{member1}{member2}` (6.37e's `MEMBER_BOX_SLOTS` / `smsMemberName`, side by side, no separator — the
  sheet's shape rule) = 3 variables, with the exigency line *"`-180` Q1: the family's full name on the cycle-open SMS; the name needs two
  boxes (`-379` Q1 A's shape)"*; `{amount}` DROPPED from the SMS (the push and the app carry it — a 4th variable is not allowed). Names ≤ 60
  letters go whole; names > 60 follow `-379`'s rule ONLY if PQ2 says so — until then such a member's pool-open SMS ends non-sent
  `name_over_60_unruled` (5.11b enforces; recorded). No helpline number (FS4 (c)). *Cost (a):* pool-open is 2 segments in en / 3 in hi at
  the longest values (below); the amount is not in the text. **(b) drop the name.** A narrowing of `-180` Q1 ⇒ the Panel's, not the
  author's; would replace PQ2 with that question. *Cost (b):* a Panel question for 1 segment saved. **(c) add *", or call the helpline
  {#var#}"*** (cbn, `sms.claim_correction.helpline_number.<pariwarId>`). *Cost (c):* every send fails closed for a Pariwar with no number
  provisioned (none is); a 4th variable on pool-open is not allowed.
  ✅ **ANSWERED: (a), applied to FS1 (d)'s three texts, in BigDev's corrected words** (below). With pool open not texted, the name
  boxes, the exigency line and `name_over_60_unruled` fall away (no text has more than 2 variables). The pool-open / last-day words
  BigDev corrected are KEPT below as the draft for the channel posts (PQ3's row).
- **FS7 — how the alert carries the SMS.** ⭐ **(a) an OPTIONAL `sms` block on the payload** of the lit producers —
  `{ message: <FS1 key>, values: { <slot>: <string> } }` built where the push copy's params are built (same locals — I1); absent ⇒ the
  message is not SMS-eligible (FS15). (v1.2: pool open is not lit — the `smsMemberName(familyLabel)` clause that stood here is moot.) *Cost (a):* a contracts change — OPTIONAL so no fixture breaks ([[project_contracts_tests_outside_tsc]]); news / survey /
  moderation never carry it (I5). **(b) rebuild the values in the fan-out** from ids. *Cost (b):* a second copy of the pool-label / date /
  name logic that can drift from the push.
- **FS10 — the degraded-mode bridge.** ⭐ **(a) stays DARK, and while it is dark a bridged send runs the NORMAL ladder** (push → WA →
  SMS, as any send; its SMS rung never uses a lit template — trail detail `sms_bridge_not_lit` when the bridge was requested). Today a
  bridged member gets only a fake `sms:sent` (F21); under (a) they at least get the push. The bridge's words (draft
  `docs/degradation-policy/comms-templates/sms-channel.md`) are a NEW backlog row (the template's after-ruling step 5: *"If implementation
  follows, it needs a ROW"*) plus a `deferred-work.md` item. *Cost (a):* departs from 5.8's SMS-only bridge shape until the bridge row lands.
  **(b) keep the SMS-only bridged path, honest.** *Cost (b):* every member of a degraded Pariwar gets NOTHING on the first run; only the
  hourly sweep (non-time-critical) later pushes. **(c) light the bridge with the pool-open text.** *Cost (c):* every member of a degraded
  Pariwar, every cycle — a cost the Panel accepted in 5.8's epic text but never for these words; not in this story.
- **FS11 — go-live: a NEW roster row, KEY `member-alert-sms-fallback-live`** (the next free Row at Task 0.4; Row 38's shape),
  decision-authored, covering 5.11 + 5.11b: **(a)** the 6 templates (FS1 (d)) registered on SmartPing with their types, APPROVED, and their
  MSG91 template ids set; **(b)** the 5.11 Hindi strings HUMAN-REVIEWED (Row 28's control); **(c)** Row 30 (d)'s provider answers cover these
  texts (the date's hyphen; a pool name with spaces or Devanagari) — cross-referenced,
  not duplicated; **(d)** the per-segment price recorded and the per-cycle cost line in the DLT sheet re-derived with it; **(e)** a real
  alert SMS received on a device from staging (Row 32's setup legs; needs 5.11b); **(f)** counsel's view on alert SMS without separate
  consent (TRAI Service-Implicit; DPDP; the privacy notice's channel list) RECORDED — or *"Counsel has not been asked"* recorded as an
  accepted cost by BigDev, never as an answer (G8). Rule (the `-349` decision 1 shape, as narrowed by `-354` decision 3 — the author's):
  no id is set until its template is approved. Blocks neither build nor merge ([[project_not_in_production_merge_is_not_golive]]).
- **FS13 — the pool name in the SMS.** ⭐ **(a)** the `{pool}` slot is alphanumeric ≤ 30; the curated name is sent when it fits 30 code
  points AND, for the en text, is all GSM-7; otherwise the LETTER CODE (always short, ASCII). `poolName` is always the Hindi name (F10),
  so in practice en texts name the pool by letter and hi texts by name. The push is unchanged. *Cost (a):* an en SMS never shows the
  curated name. **(b)** send the Hindi name in en anyway. *Cost (b):* every en text turns Unicode — 152+ chars ⇒ 3 segments — and the
  pre-flight does not catch it (it checks only the registered text). **(c)** refuse the send `value_too_long`. *Cost (c):* a member
  silently gets no text because of an admin's naming.
- **FS14 — the outcome when no rung reached the member (F19).** ⭐ **(a) a final, recorded outcome `in_app_only`:** when the cascade ends
  without `sent`, the member is recorded (`store.recordResult`, the trail with each rung's reason) and NOT released or thrown for — the
  alert is on their in-app surface, the official channel (R10(B)); the recovery sweep counts them as notified. In 5.11 this is every
  non-`sent` member, which is exactly the set not retried today (I4). 5.11b adds the ONE retryable case (a real SMS send that failed
  transiently / the FS9 window). Applies to every worker that reaches the SMS rung: cycle-open / deadline / pending (POOL_BATCH), confirmed,
  mismatch, and — after the Task 4 trace — news / survey / moderation. *Cost (a):* a member whose push token is stale is not retried by
  push (also true today); the trail says why. **(b) retry like any undelivered member.** *Cost (b):* 5 runs + an hourly re-enqueue per live
  cycle for every unreachable member; pending-match members nudged again; jobs end `failed`.
- **FS15 — the SMS rung for messages that are NOT lit.** ⭐ **(a) honest everywhere on the alert path:** the fan-out's SMS rung considers
  a send only when the alert carries an `sms` block (FS7) AND the member is eligible (FS2); every other alert — the six unlit
  contribution messages (pool open among them), news, survey, moderation — ends the SMS rung `skipped_no_target` / `sms_message_not_lit`, never the fixture. A lit,
  eligible member in 5.11 ends `skipped_no_target` / `sms_send_not_wired` (5.11b replaces this with the real send). The category registry
  and its composition path stay in place, all-dark, unused by the alert SMS rung. *Cost (a):* every trail that ends `sms:sent` today
  changes (F18 tests), and fake SMS `alert.channel_send` audits stop — the dev greps consumers of `alert.channel_send` at Task 0.1 and lists
  them. **(b) keep the fixture for unlit messages.** *Cost (b):* I3 holds only for five messages; the rest keep reporting `sent`.
- **FS16 — the app's name in the fixed text.** ⭐ **(a) "TWT" as the working brand** in all ten texts (*"TWT: …"*, *"the TWT app"*) —
  the same posture as the claim texts (Row 30 note (2): re-register when the Trust's name is fixed — [[project_legal_name_pending]]). The
  app's shown name is configurable (`APP_IDENTITY_NAME`, `EXPO_PUBLIC_TRUST_NAME` — *"⛔ never hard-coded"*, `apps/mobile/app.config.ts:88-99`),
  but a DLT text cannot take it as a variable without losing fixed share. *Cost (a):* when the name is fixed, 10 re-registrations (plus the
  claim texts'). **(b) "the app" with no name.** *Cost (b):* a member with several apps may not know which; "TWT:" stays as the prefix
  regardless (the header carries the sender).
  ✅ **ANSWERED: (b).** BigDev, verbatim: *"FS16 Trust name is already mentioned in SMS header/WhatsApp sender. Mentioning it in SMS
  would lengthen the text unnecessarily."* "TWT:" stays as the prefix; no text names the app. Cost (a)'s re-registration when the
  Trust's name is fixed now rests on the "TWT:" prefix alone ([[project_legal_name_pending]]).

### The words (FS4 (a), FS16 (b)) — en + hi REVIEWED AND CORRECTED BY BIGDEV (2026-10-23, Debug Log (a))

v1.2: ONLY the three rows marked TEXTED become `sms.*` keys and templates; the two rows marked CHANNEL DRAFT are kept as BigDev's
words for the channel posts (PQ3's row) and are NOT added to `contribution.json` by 5.11.

Keys go in `packages/i18n/locales/{en,hi}/contribution.json` (flat keys, like `notify.*`) as `sms.<message>`; each `{param}` is a slot
NAME (TV13). The REGISTERED text is the same string with each `{param}` replaced by `{#var#}`. Config key:
`sms.dlt.template_id.contribution.<message>.<locale>` (F24's family form).

| Key | Slots (type, max) | en | hi |
|---|---|---|---|
| CHANNEL DRAFT — `sms.pool_open` | `pool` alnum 30 · `member1` / `member2` (`MEMBER_BOX_SLOTS`) | TWT: your pool {pool} is open, in support of {member1}{member2}'s family. Please open the app to contribute. | TWT: आपका पूल {pool} खुल गया है, {member1}{member2} के परिवार के सहयोग हेतु। सुविधानुसार ऐप खोलकर योगदान करें। |
| TEXTED — `sms.deadline_not_recorded` (day 10) | `pool` alnum 30 · `date` alnum 10 | TWT: your contribution to pool {pool} is not recorded yet. This cycle closes on {date}. Please contribute. | TWT: पूल {pool} में आपका योगदान अभी दर्ज नहीं हुआ है। यह चक्र {date} को बंद होगा। कृपया योगदान करें। |
| CHANNEL DRAFT — `sms.deadline_last_day` (day 14) | `date` alnum 10 · `pool` alnum 30 | TWT: today, {date}, is the last day of this cycle for pool {pool}. If you are able, please contribute. | TWT: आज, {date}, पूल {pool} के इस चक्र का अंतिम दिन है। यदि संभव हो, तो कृपया योगदान करें। |
| TEXTED — `sms.payment_not_matched` | — (zero slots) | TWT: we could not match your payment yet. We will help you sort it out. Please see the app. | TWT: आपके भुगतान का मिलान अभी नहीं हो पाया है। इसे ठीक करने में हम आपकी मदद करेंगे। कृपया ऐप देखें। |
| TEXTED — `sms.payment_not_confirmed` (escalated) | `pool` alnum 30 | TWT: we still have not been able to confirm your payment for pool {pool}. Please check or retry in the app. | TWT: पूल {pool} के लिए आपके भुगतान की पुष्टि अब तक नहीं हो पाई है। कृपया ऐप में जाँचें या फिर से प्रयास करें। |

⭐ Recomputed at v1.2 on BigDev's corrected words (fixed share = fixed / (fixed + Σ slot max); segments at the LONGEST values, ASCII
values; GSM-7 160 / 153, UCS-2 70 / 67; ⚠ the dev re-runs `checkDltTemplateShape` on the real registry):

| Message | fixed share en / hi | en (GSM-7) | hi (UCS-2) |
|---|---|---|---|
| deadline_not_recorded | 70.1 % / 68.8 % | 134 chars → 1 | 128 → 2 |
| payment_not_matched | 100 % / 100 % | 91 → 1 | 99 → 2 |
| payment_not_confirmed | 77.1 % / 77.4 % | 131 → 1 | 133 → 2 |
| *(channel draft, not texted)* pool_open | 48.3 % / 48.9 % | 174 → 2 | 176 → 3 |
| *(channel draft, not texted)* deadline_last_day | 69.2 % / 66.1 % | 130 → 1 | 118 → 2 |

⇒ FS1 (d)'s common path = 1 segment per cycle in en, 2 in hi, per unreached member who has not contributed by day 10; +1 en / +2 hi
per payment problem. (v1.1's table, on the draft words, had payment_not_confirmed hi at 3; the Devanagari-name caveat is moot — no text
carries a name.)
⚠ `sms.payment_not_matched` has ZERO slots — 6.37's MG12 refuses `values.length === 0` (F3), so it cannot send until 5.11b changes MG12
to tell "no values supplied" (`undefined`) from "a template with no slots" (`[]`); recorded in the 5.11b carry.
⚠ Every text passes `checkDltTemplateShape` and the tone guide (`docs/tone-guide.md`, `docs/tone-review-checklist.md`) — non-coercive, no
"must", no "penalty", no urgency beyond the push's band. Segment counts go in the DLT sheet's cost line (Task 5).

### PQ1 / PQ3 — for the Trustee Panel (ONE note, `trustee-panel-routing-note-2026-10-23-5-11-sms-for-members-without-whatsapp.md`; neither blocks the build) — v1.2; ✅ SENT by BigDev 2026-10-23, ⛔ ruled

**PQ1 (reshaped at v1.2), in one sentence:** should a member who has NOT said yes to WhatsApp get a text when the app cannot reach them
about their OWN contribution — not recorded by day 10, a payment not matched, a payment still not confirmed? **The one fact:** under the
approved plan such a member hears nothing outside the app about their own contribution, and a missed cycle counts (R7; R8's
ninety-percent rule); these notices are personal, so no channel post can carry them (§3.4's privacy posture). Options: **A** keep the plan
(cost: almost nobody is texted); **B** widen for the three (cost: ≈ 1 en / 2 hi segments per unreached member per cycle, +1 / +2 per
payment problem; a change to the approved plan, as F7 was); **C** day 10 only (cost: payment problems heard only in the app). Our reading:
**B**. "Earlier versions / Corrected": the two unsent drafts; the `-180` correction (*"SMS is reached when PUSH FAILS"* described the code).

**PQ2 — WITHDRAWN at v1.2.** No text carries the deceased member's name (FS1 (d)); a channel post has no 60-letter limit. The number is
not reused.

**PQ3 (NEW at v1.2), in one sentence:** the Trust will run a WhatsApp Channel and a Telegram channel for general notices (a pool
opening, a cycle's last day) — should members be asked to join one, and is joining a request or a requirement? **Source:** BigDev's
direction, 2026-10-23 (Debug Log (a)). **The one fact:** the Trust cannot see which of its members joined, so it can never check a
requirement, nor tell a member who missed a post from one who never joined. Options: **A** a request — the app stays the official channel,
R10(B) unchanged (cost: a member who does not join hears general notices only in the app); **B** a requirement — a new member duty in the
Terms (cost: it cannot be checked; a member without WhatsApp or Telegram cannot meet it); **C** no channels (cost: a member the app cannot
reach hears of a pool opening nowhere). Our reading: **A**. Stated, not asked: following `-180` the pool-open post names the family, and
a WhatsApp Channel is publicly listed (the Panel may narrow `-180` for this place — its call); Meta has no official Channels API (posts by
hand). Split out: the architecture note a broadcast channel owes (G13, the author's); the channels' build (a backlog row after PQ3).

⭐⭐ **v1.4 — RULED by `2026-10-23-390` (Trustee-ratified, Dhiraj Rahul + Kalpana Bharti, relayed by BigDev: *"by DR and KB"* / *"Q1 B,
Q2 A"*).** PQ1 → **B** (the three texts to any member the app and WhatsApp, where used, could not reach). PQ3 → **A** (members are ASKED
to join one channel; the app stays official; R10(B) unchanged). The Panel did ⛔ narrow `-180` for the pool-open post. The questions
above are kept as put.

"Shown to the Panel" only once SENT ([[feedback_shown_to_panel_means_sent]]).

## Acceptance Criteria

**AC0 — Governance before code (Task 0).** The author-commit decision (FS1–FS4, FS7, FS10, FS11, FS13–FS16 as answered; the §0 readings
G1–G13; "Supersessions: none" — FS1 (d) KEEPS the author's own 2026-07-06 category exclusion; what it does NOT cover, incl. everything
carried to 5.11b and the Trust's channels) is committed ALONE before any record or code; the PQ1 / PQ3 note is written from the template and its
SENT state recorded truthfully; the records commit (epics.md entry, §3.4 annotation, roster row, DLT sheet section, deferred-work
annotations, the bridge-words row (row `5-11b-alert-sms-real-send` was added at v1.1), ledger) follows
([[feedback_governance_commits_precede_implementation]]).

**AC1 — The registry is message-keyed and registrable (I1, I5; FS1, FS4, FS16).** `apps/jobs/src/scheduler/contribution-sms-templates.ts`
holds one entry per (FS1 message × locale) with `contentTemplate`, `slots` (no name slot — FS1 (d)),
config key `sms.dlt.template_id.contribution.<message>.<locale>`; the file joins `REGISTRY_FILES` in the same change (F16).
`packages/channels/src/sms-dlt-registry.ts` keeps its five dark category entries (`claim_status_change` / `helpdesk_reply` visibly unlit) and
gains a dated 5.11 header note (TV6 history kept). Every lit entry passes `checkDltTemplateShape`; the CI gate `dlt-typed-variables`
passes. *Legs:* a registry test over EVERY entry; a test that no broadcast message key exists.

**AC2 — Registered text = catalogue text (I1, I6).** For each lit message and locale, the registry text equals the `sms.*` catalogue string
with each `{param}` as `{#var#}`, read through the REAL `t()` over `contribution.json` ([[feedback_stub_must_call_not_transcribe]]); the DLT
sheet row (found by config key — `sheetRowByConfigKey`, `expectRegisteredTextRow`, extended to load a contribution catalogue) matches it and
its MSG91 `##name##` form; the lockstep test lives in `apps/jobs/tests/`. A `$comment.sms` NOT-YET-HUMAN-REVIEWED key exists in BOTH en and
hi; `scripts/microcopy/contribution.test.ts` excludes `$comment` keys (as the claim tests do). *Legs:* one lockstep test per template; a
parity test (every `sms.*` key in both catalogues); a planted-violation leg per new gate (8.8's (b2) precedent), each proven RED first.

**AC3 — Who receives it (I2; FS2 as RULED by `-390` Q1 B, FS3).** For a lit message: a member whose push did not end `sent` is ELIGIBLE
when they have no WhatsApp target OR their WhatsApp rung did not end `sent` (in 5.11 the eligible rung then ends `sms_send_not_wired`); a
member whose push or WhatsApp ended `sent` gets no SMS; an unlit message is never eligible (`sms_message_not_lit`). Any other non-eligible
case ends `skipped_no_target` / `sms_fallback_not_eligible`. With FS3 (a), an enabled Pariwar with no approved WA template — and
one with a blank credential name / `phoneNumberId` — ends the WA rung `rejected` with the FS3 detail. *Legs:* the
`contribution-notify.test.ts:263-274` trail (a no-WhatsApp member whose push failed) is REWRITTEN to the ruled behaviour — now ELIGIBLE,
ending `sms_send_not_wired`, never `sent` (not deleted); one test per branch (push sent; push failed + no WhatsApp target; push failed +
WhatsApp failed; WhatsApp sent; FS3 refuses ⇒ eligible; unlit ⇒ not eligible).

**AC4 — An honest rung and an unchanged retry profile (I3, I4; FS14, FS15).** On the alert fan-out path no production composition reaches
`createFixtureSmsProvider`; every non-send ends with a named detail (`sms_fallback_not_eligible`, `sms_message_not_lit`, `sms_send_not_wired`,
`sms_bridge_not_lit`); a member no rung reached is recorded `in_app_only` and the child does NOT throw for them — in POOL_BATCH, confirmed and
mismatch, and in every other producer the Task 4 trace finds; the cycle-open recovery sweep counts them. *Legs:* a no-app member's child
completes on its FIRST attempt; the sweep does not re-enqueue; a pending-match member's claim is kept; assertions are on the trail's outcome +
detail, never the provider id (F3: the fixture's id equals the real one); the F18 dark-state tests replaced by tests of THIS behaviour (each
states what it replaced).

**AC5 — Producers, and not a bulk channel (I5; FS7, FS10, FS13).** The three lit producers (day 10 and pending-match escalated — POOL_BATCH; mismatch — its own
worker) carry the `sms` block, built from the same locals as the push params; the `{pool}` value follows FS13 (curated name only when ≤ 30
code points and, for en, all GSM-7; else the letter code). News / survey / moderation / staff `alert_published` and the six unlit
contribution messages (pool open among them) carry no `sms` block. A bridged send follows FS10 as answered. *Legs:* one test per producer family; FS13's three
branches (fits; > 30; non-GSM in en); a bridge test.

**AC6 — Records and gates (FS11).** The roster row `member-alert-sms-fallback-live` exists with legs (a)–(f); the DLT sheet gains the
templates (next free ordinals), their wording section, types, MSG91 forms, cost lines (segments en / hi at the
longest values), a rejection-table line (*"the author's; en + hi reviewed by BigDev 2026-10-23; a rejection goes back to the author"*) and a Record line; the TV6 section and Row 30 note (1) get DATED annotations (not rewritten);
deferred-work: the 6.34 TV6 item annotated *"wording built by 5.11; send by 5.11b — Closed by 5.11b on `done`"*, the 5.10-validate ladder item
per FS3, a NEW bridge item (FS10, naming its row), and the items carried to 5.11b (the 6.37b `correlationId` item; the two 5.6 items — the
template-id trim and `resolveSmsTarget`'s decrypt try/catch + E.164; LS11's item) annotated *"→ 5.11b"*; and, if PQ1 / PQ3 is unruled at
`done`, a NEW item carrying each; and a NEW item for the Trust's announcement channels (PQ3 — the two channel-post drafts, G13's
architecture note, Meta's lack of an official Channels API).

**AC7 — Nothing else moves.** Push and WhatsApp copy, OTP, claim texts 1–14 and their core, `sms-member-name.ts` / `sms-member-boxes.ts`,
Telegram, the cost-optimization toggle: unchanged; `pnpm ci:local` green on :5433.

## Tasks / Subtasks

- [ ] **Task 0 — Governance (AC0)**
  - [ ] 0.1 Preflight: fetch; rebase onto `origin/main`; run the pin checks (header); re-run F1–F11, F16–F24 and the segment table. Grep
        consumers of `alert.channel_send` (FS15's cost) and list them in Debug Log (e). **STOP** if: **S1** a ruling on SMS reach exists
        already (grep `^### Decision` for *"transactional-fallback"* / *"SMS"* newer than `-388`); **S2** another worktree edits
        `contribution-notify*.ts`, `provider-composition.ts`, `sms-dlt-registry.ts`, `sms-member-*.ts` or `scripts/dlt-typed-variables/lib.ts`
        (`git worktree list`; ListAgents — [[feedback_shared_tree_branch_switch]]) — sequence per `-366` decision 6; **S3** the DLT sheet's
        ordinals moved; **S4** a Pariwar's WhatsApp is enabled anywhere a deploy reads (FS2 (a) then has reach — tell BigDev); **S5** Row 30
        (d) was answered with a per-variable limit other than 30 (the slot maxima and segment table change).
  - [x] 0.2 (DONE 2026-10-23 — Debug Log (a)) Put FS1–FS4, FS7, FS10, FS11, FS13–FS16 + the words (en + hi) + PQ1 / PQ2's options to BigDev; record answers VERBATIM in
        Debug Log (a). If the hi is approved in session, roster leg (b) still says *"whether that discharges this leg is recorded here, not
        assumed"*. Do NOT ask the 5.11b carry's FS5 / FS6 / FS8 / FS9 / FS12 here.
  - [x] 0.3 (DONE 2026-10-23 — Decision `2026-10-23-389` committed ALONE as `6db47c17` after the rebase; the note SENT by BigDev) Write the PQ1 / PQ3 note (PQ2 withdrawn at v1.2; written 2026-10-23, its E4 run — Debug Log (e)) from `trustee-panel-routing-note-TEMPLATE.md` (§0 first;
        `trustee-panel-routing-note-YYYY-MM-DD-5-11-sms-for-members-without-whatsapp.md`), run its E4 commands, record it as not sent until
        BigDev sends it. Stage the author-commit decision (next free id) in the scratchpad; commit it ALONE (`governance:` prefix) — try the
        decision-log write first ([[project_decision_log_writes_user_inserted]]).
  - [x] 0.4 (DONE 2026-10-23 — Debug Log (e); the row stays `ready-for-dev` until dev starts, the 6.36d precedent) Records commit: `epics.md` `### Story 5.11` between 5.10 and 5.12 (5.10's format; Epic 5's "9 stories" lines left as they stand)
        and `### Story 5.11b` after it (scope = the carry below); §3.4 dated annotation under the fallback paragraph (FS2 as answered; PQ1
        pending) — never a rewrite; roster row; the FS10 bridge-words row (backlog); deferred-work annotations (AC6); ledger entry by SAFE
        prepend ([[project_sprint_status_safe_prepend]]) + row `ready-for-dev → in-progress`.
- [ ] **Task 1 — Registry + words (AC1, AC2; FS1, FS4, FS16)**: create `contribution-sms-templates.ts` (shape of `peer-mesh-sms-templates.ts`;
      three messages, no name slot); add it to `REGISTRY_FILES`; add `sms.*` en / hi keys + `$comment.sms` in both; exclude `$comment` in
      the microcopy test; dated header note on `sms-dlt-registry.ts` (entries unchanged); extend `_dlt-template-sheet.ts` with a contribution
      catalogue.
- [ ] **Task 2 — Contract + producers (AC5; FS7, FS13)**: optional `sms` block in `packages/contracts/src/alerts/alert.ts` payloads; populate it
      in the day-10 and pending-escalated (POOL_BATCH) and mismatch (its own worker) builders from the SAME locals as the push
      params; the FS13 pool-label rule (one helper, tested).
- [ ] **Task 3 — Eligibility + WA stand-in (AC3; FS2, FS3)**: the ONE predicate as RULED (`-390` Q1 B): push not `sent` AND (no WhatsApp target OR WhatsApp not `sent`); the non-accepting
      WA provider in `createContributionProviderResolver` for enabled-but-unbuildable (template / credentials).
- [ ] **Task 4 — The honest rung + job outcome (AC4, AC5; FS10, FS14, FS15)**: the fan-out's SMS rung decides lit / eligible itself and never
      takes the category resolver's fixture on the alert path; `in_app_only` recorded (no release, no throw) in POOL_BATCH, confirmed and
      mismatch; TRACE every other `fanOutAlert` / `dispatch()` producer (news, survey, moderation, helpdesk fan-out) for what an undelivered member
      does to its job and apply FS14 there (Debug Log (e)); the bridged-path change per FS10.
- [ ] **Task 5 — Records (AC6; FS11)**: DLT sheet section (types, MSG91 form, segment counts computed from the real registry with
      the longest values) and Record; roster row text; deferred-work items.
- [ ] **Task 6 — Tests (AC1–AC7)**: replace F18's dark-state assertions (say what each replaced; confirm whether the `vi.mock` registry tests
      change); every new gate proven RED in Debug Log (b).
- [ ] **Task 7 — Verify**: `pnpm ci:local` with `DATABASE_URL` on :5433 ([[project_prepush_hook_inherits_5432]]; known failures —
      [[project_known_livedb_test_failures]]); review the diff before commit ([[feedback_review_the_fix_diff_before_commit]]); commit on the story
      branch ([[feedback_commit_on_story_branch]]); do not push without BigDev's go-ahead.

## Carried to 5.11b (`5-11b-alert-sms-real-send`) — NOT built or answered here

5.11b's create-story starts from these, re-verified at its own pin. Each was validated against `d87d047a`.

- **FS5 — the language.** Reuse `getMemberLanguage` (F11 — the neutral read already exists; no extraction from `peer-mesh-request.ts`, so no
  overlap with 6-36d), resolved in `resolveMemberDeliveryContext` into the fan-out context (F20). Fallback: `-387` makes the neighbours' text
  WAIT rather than go in the other language, and reserves "send it in the other language" (LS10 (c)) for the Panel ⇒ recommend the PARIWAR'S
  DEFAULT (`-385`'s shape), else non-sent `config:dlt_template_id_missing:<locale>`; never "the other language" without a ruling. A missing
  passport / member row (the function throws) ⇒ non-sent `language_unresolved`, terminal. Record LS11's item narrowed for SMS (push keeps its
  language; LS13's screen promise is what this keeps).
- **FS6 — the send record.** A new table (one migration, the next free number at time of use — 6-36d committed 0180 in `15937e87`; highest at
  validation 0180), one row per (alert, member), UNIQUE. Choose explicitly: **at-most-once** (a begun row never resends; a crash between accept
  and write loses a text) or **at-least-once** (the 6.27c precedent, `peer-mesh-request.ts:399-496` / 0156, re-sends on a re-claimed `attempting`
  row). A row begun AND accepted counts as `sent` on a retry (else the job retries forever); decide whether a `rejected` row may be retried; a
  hash failure after an accept (`dispatch.ts` ~343-348) must not re-send. Discharges 6.37b's *"`correlationId` is optional"* for this path.
- **The CRQID kind** (e.g. `as`) touches, beyond `SMS_CORRELATION_KINDS` + pattern (`correlation.ts:21`, `:30`) and 0167's
  `sms_delivery_report_inbox_crqid_check` (`0167:50`): 0167's `sms_send_deliveries_send_kind_check` (`:91`) and its schema mirrors
  (`schema/sms_send_deliveries.ts:13,41`, `schema/sms_delivery_report_inbox.ts:47`); the `LOOKUP` map (`sms-delivery/reports.ts:210-215` — the new
  table needs `pariwar_id`, `outcome`, `provider_message_id`, `purpose`); `countSilentSmsSends` (`reports.ts:317-338`, four kinds hard-coded) and
  `sms-delivery-silence.ts:37` — decide whether alert sends join the silence alarm; the correlator (`apps/jobs/src/sms-delivery-correlator.ts:138-144`);
  `CLAIM_SEND_ROW_KINDS` (`claim-dlt-sms-send.ts:148`); `SmsSendRowKind`'s doc (*"the claim-text send kinds"*). Replace CHECKs in the NEW migration,
  never edit 0167 ([[project_live_db_test_gotchas]]). No later migration (0168–0179) touches them.
- **The per-send provider.** `createSmsDltProvider(deps)` (`providers/sms-dlt.ts:66`) built per send with values; `substituteDltValues`
  (`dlt-variables.ts:214`); `formatSmsCorrelationId({kind,rowId})` (`correlation.ts:42`); the ONE `smsPreflight` memo — built at `boot.ts:646-660`,
  AFTER `contributionNotifyDeps` (`:623-633`) and its registration (`:634`), and the fan-out deps lack `smsAppClient` / `resolveConfig` ⇒ a boot
  reorder (list `boot.ts`). The claim core `sendClaimDltSms` (`claim-dlt-sms-send.ts:263-383`; `checkedValues` `:199-220` private; helpline
  required `:281, :295`) is CLAIM-shaped and is left alone — call nothing from it that needs the helpline; if a piece is shared, the 5.11b
  decision says so explicitly (5.11 forbids editing it). Seams for the send row, budget and language are injected (F20).
- **MG12's zero-slot change** for `sms.payment_not_matched` (`sms-dlt.ts:72-81`; `sms.test.ts:89-100` rewritten).
- **FS8 — the per-member budget.** `checkAndConsumeSmsBudget` (`packages/domain/src/sms-rate-limit/buckets.ts`, 0049) has no production caller and
  NO configured numbers — `windowMs` / `maxPerWindow` are caller inputs (`:21-31`), the vacuum is unwired (`:82`). 5.11b must PROPOSE the window
  and cap (FS1 (a)'s ceiling is ~3 + 2 texts per cycle).
- **FS9 — "after the committed retry window" (G2).** pg-boss 12.19.1 passes `retryCount` only with `boss.work(…, { includeMetadata: true })`
  (precedents `claim-contact-ladder-whatsapp.ts:660-667`, `claim-correction-reminders.ts:145, :1491-1493`); the POOL_BATCH, CONFIRMED and MISMATCH
  workers pass only `job.data` (`triggers.ts:1414-1465`). The deps object is shared by up to 8 concurrent jobs ⇒ the attempt is a PER-CALL
  parameter down `runContributionNotifyChild` → `fanOutAlertToMembers` → `fanOutAlert`. The count is per POOL job, not per member, and a sweep
  re-enqueue resets it; earlier attempts' WA failures are not persisted (claim released, nothing recorded), so attempt 3 sees only its own pass.
  Real delay before attempt 3 ≈ 3–6 min (`plans.js:1144-1152`), not 2–3. Decide whether FS3's deterministic WA refusal waits for the window
  (it is not a "delivery failure"). This is the ONE retryable case FS14 (a) leaves open. If PQ1 widens the reach for a member with no WhatsApp
  target, the window has nothing to wait for ⇒ first pass.
- **FS12 — the 5.6 mirror defects (AI-5-5)**, named: (1) the template id "trim" — superseded on this path by MG4's 24-hex check; (2)
  `resolveSmsTarget`'s missing decrypt try/catch + E.164 check — only HALF addressed by MSG91's `to` validation (the decrypt throw is not).
  Annotate both *"addressed for the alert path by 5.11b"* as far as true; not closed. ⚠ v1.2 CORRECTION: at the pin `resolveSmsTarget`
  DOES catch a decrypt failure (`packages/domain/src/notifications/delivery.ts:165-174` — logs, returns no target); only the E.164 check
  is missing. 5.11b re-checks the deferred-work item's text against the code before annotating it.
- ~~FS4's name rule above 60~~ — v1.2: MOOT (no text carries a name; PQ2 withdrawn).

## Dev Notes

### ⚠ TRAPS

- **T1 — Lighting a registry alone texts the wrong people** (F4) and still sends nothing (F3 Gate B). The predicate (FS2) and the rung (FS15)
  move together.
- **T2 — "Dark" lies, and the lie holds the retry loop shut** (F3, F19). Making the rung honest without FS14 starts a retry storm. Never test
  that a lit message "sent" via a fixture; never assert on provider id (the fixture's equals the real one).
- **T3 — `alert_published` is not "pool assignment"** (F6). Key SMS eligibility by the `sms` block, never by category — else news is texted (I5).
- **T4 — The bridge is SMS-only** (F21). An honest bridged rung without FS10 (a) leaves a degraded Pariwar with nothing.
- **T5 — The pool name is Hindi** (F10). In an en text it turns the SMS Unicode — FS13.
- **T6 — The memoized resolver cannot carry values and lives for the process** (F3, F5). Leave it for push / WhatsApp; the SMS rung decides
  lit / eligible itself.
- **T7 — One 30, one 60.** (v1.2: no 5.11 text carries a name; this binds only if one is added.) Import `MEMBER_BOX_SLOTS` / `smsMemberName`; never redefine a name slot or re-implement the fitter (the 6.37e AST fence
  in `sms-member-name.test.ts` watches for a retired helper name).
- **T8 — Contracts tests run outside tsc** — a REQUIRED field breaks fixtures silently; keep `sms` OPTIONAL.
- **T9 — A JSDoc with `**cl.3**`-style emphasis closes the comment** ([[project_markdown_emphasis_closes_jsdoc]]).
- **T10 — Hand-format** — Prettier is not enforced; never `--write` ([[project_prettier_not_enforced]]).
- **T11 — Type-only import cycles** between the new registry, `sms-member-*.ts` and the fan-out crash at runtime, invisible to tsc
  ([[project_type_only_import_cycle_trap]]).
- **T12 — Don't edit a ratified word.** Templates 1–14, their core and the name fitter are out of scope; the DLT sheet's procedure governs a
  rejection; no 5.11 text carries `-180`'s name (v1.2).
- **T13 — ESLint carve-out globs are cwd-relative** per package ([[project_eslint_config_per_package_cwd]]).
- **T14 — The mismatch notice runs on its own queue and worker** (F6) — FS7 and FS14 must reach it too.

### Reuse map

| Need | Reuse | Instead of |
|---|---|---|
| shape check, types | `dlt-variables.ts` (`DLT_VAR`, `DltSlot`, `checkDltTemplateShape`) | a new validator |
| registry shape | `peer-mesh-sms-templates.ts` / `suspicion-notice-sms-templates.ts` | a new shape |
| name boxes, 60-letter fitter (v1.2: not used by 5.11) | `sms-member-boxes.ts` `MEMBER_BOX_SLOTS`, `sms-member-name.ts` `smsMemberName` | a second 30 / 60 |
| lockstep tests | `apps/jobs/tests/_dlt-template-sheet.ts` (+ a contribution catalogue) | re-parsing the sheet |
| WA refusal | a non-accepting provider returning `rejected` | a new cascade outcome |
| job outcome | `store.recordResult` with the trail | a new table |

### Testing standards

Vitest; real `t()` for every copy assertion; one test per FS branch; each replaced F18 test names what it replaced; assertions on trail outcome +
detail, never provider id; every new gate proven RED. The DLT sheet lockstep finds rows by config key. Live-DB legs (if any) on :5433, separate
transactions for DB-clock ordering ([[project_db_clock_ordering_tests_tie]]).

### Project structure notes

The new registry beside its siblings in `apps/jobs/src/scheduler/`; the fan-out and resolver changes in `apps/jobs/src/scheduler/` and
`packages/channels/src/composition/`; the payload block in `packages/contracts/src/alerts/`; copy in `packages/i18n/locales/{en,hi}/contribution.json`;
records in `docs/launch-gate-inventory/` and `_bmad-output/`. No pg-touching `@twt/domain` import into anything Metro bundles
([[project_contracts_domain_bundle_boundary]]).

### Sequencing

Other open worktrees at the pin: `11b-4-memorial-authorship-…`, `3-3c-member-kyc-name-english-only` (English-only KYC names — would make a
Devanagari family name rarer in en texts; note it, do not depend on it), `6-36d-exclude-nominees-from-the-five` (edits `peer-mesh-request.ts` and
holds migration 0180, committed `15937e87`). 5.11 adds no migration and does not touch `peer-mesh-request.ts`, so it does not overlap 6-36d;
5.11b sequences after it. v1.3: 6-36d is `done` and LANDED on `main` (`1268d47e`, migration 0180 included) — this branch is rebased on it;
5.11b's next free migration is found at its create-story. 6.31's rule that its reminder never goes through `dispatch()` stands — a lit SMS rung would otherwise text the
neighbours twice.

### Previous story intelligence

- **6.34** made the five DARK *"truthfully"* and named this row's §0 trigger (*"turn the alert SMS fallback ON with new wording for members"*);
  its CI gate and lockstep helpers are the scaffolding here.
- **6.37e**: the two name boxes and `smsMemberName` (`-379`); the AST fence; *"the ONLY 30, the ONLY 60"*.
- **6.37 / 6.37b**: MG12 is Gate B (and refuses zero-slot); MG4's 24-hex check; MG5 pre-flight; DR3 CRQID; *"`correlationId` is optional"* — all
  5.11b's.
- **6.35**: `getMemberLanguage`, LS10 T-states, LS11's deferred item, LS13's screen promise — 5.11b's FS5.
- **5.10**: F7b / SB9 (d) — the stand-in stops the ladder; *"name it to row 5-11's create-story"* — FS3.
- **5.6**: D1 already flagged the §3.4 vs epics (c) conflict; its two OPEN mirror defects (5.11b's FS12).
- **8.16 / `-180`**: the full name on the cycle-open SMS — FS4.

### Git intelligence

Recent `main` (to `d87d047a`): 6.35 landed (migration 0179, `preferred_locale`); 8.15 landed; ledger-only commits otherwise. Stories land by
fast-forward ([[feedback_land_prs_by_fast_forward]]).

### Latest tech information (fetched 2026-10-23)

- TRAI: ≥ 30 % fixed content and pre-tagged variables (Direction of 12 May 2023); typed variable tags + URL/APK/OTT/CBN whitelisting and a
  logger-mode phase-in (Direction of 18 Nov 2025); TCCCPR 2nd Amendment (12 Feb 2025) — Service messages to a sender's own customers need no
  explicit consent (Service-Implicit); MSG91 files transactional content under Service-Implicit. One template ↔ one header (TRAI PR 60/2024).
  Per-variable limit 30 vs 40 is still Row 30 (d)'s open question — FS4 uses ≤ 30. ⚠ The consent reading rests on secondary sources — it is
  for counsel (roster leg (f)), not the Panel.
- pg-boss 12.19.1 (repo): `retryCount` only with `work(…, { includeMetadata: true })` (`dist/index.d.ts:28-32`) — 5.11b.

### References

- `_bmad-output/planning-artifacts/architecture.md` §3.4 (`:2115-2119`, `:2318-2331`); PRD `prds/prd-TWT-2026-05-22/addendum.md` RA-29, `prd.md` §4.10,
  `:1255` (R10(B)).
- `.decision-log.md`: `-065`, `-180`, `-255` F7, `-313` TV6, `-345` MG12, `-347`, `-349`, `-354`, `-357`, `-374`, `-375`, `-379`, `-385`, `-387` (by id,
  never line).
- `packages/channels/src/{sms-dlt-registry,dlt-variables,dispatch,cascade,render}.ts`; `composition/provider-composition.ts`; `providers/`.
- `apps/jobs/src/scheduler/{contribution-notify,contribution-notify-triggers,contribution-providers,peer-mesh-sms-templates,sms-member-boxes,sms-member-name}.ts`.
- `packages/domain/src/notifications/{delivery,pool-identity}.ts`; `packages/domain/seed/niyamavali-v1-clauses.sql` (R7, R8).
- `docs/launch-gate-inventory/{dlt-template-requests-6-19.md,inventory-roster.md}` (Rows 28, 30, 32, 38).
- Stories `6-34-…`, `6-37-…`, `6-37b-…`, `6-37e-…`, `6-35-…`, `5-10-…`, `5-6-…` in `_bmad-output/implementation-artifacts/`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

(a) Task 0.2 answers, verbatim · (b) RED proofs · (c) parity / lockstep / CI-gate outputs · (d) dev-DB side effects · (e) Task 0.1 preflight,
the `alert.channel_send` consumers, the Task 4 producer trace

**(a) Task 0.2 — BigDev's answers, verbatim (2026-10-23, this session).**

1. *"where is FS5 and FS6, I have reviewed the en/hi, file modified with correction. Others approved as recommended, but I have
   question. Have I mentioned Trust will have a WhatsApp Channel and Telegram Channel where all members are supposed to join, either of
   them to get the notifications."*
   - FS5 / FS6 (with FS8, FS9, FS12) are 5.11b's since the v1.1 split; not asked here (Task 0.2's own rule).
   - The words: BigDev edited the words table in this file (en + hi, all five rows); the edit is the review. Against the v1.1 draft:
     *"the TWT app"* → *"the app"*; day 10 ends *"Please contribute."* and day 14 *"If you are able, please contribute."* (no app named);
     the Hindi re-worded throughout. Segments recomputed (the table above).
   - The channel question was answered from the records (the session's reply, not BigDev's words): none states a WhatsApp Channel or a
     duty to join; Telegram is FR-73's per-member opt-in mirror, announcements only, *"not official"* under R10(B) / Terms cl.10.
2. *"2, FS16 Trust name is already mentioned in SMS header/WhatsApp sender. Mentioning it in SMS would lengthen the text
   unnecessarily."*
   - *"2"* = the session's option 2, as put: *"Reshape PQ1: channel posts for pool-open and last day, and SMS only for the three personal
     notices (day 10 and the two payment problems). This needs your decision on the channels first, and may be a Panel question of its
     own."* ⇒ FS1 (d); BigDev's channel direction (message 1) is the decision it needed; the duty to join is PQ3.
   - FS16 (b).

**Recorded as answered:** FS1 (d) · FS2 (a) + route PQ1, reshaped to the three · FS3 (a) · FS4 (a), on the three texts, in BigDev's words
· FS7 (a) (the pool-open name clause moot) · FS10 (a) · FS11 as listed (6 templates; leg (c) without the name-box items) · FS13 (a) ·
FS14 (a) · FS15 (a) · FS16 (b). PQ2 WITHDRAWN. PQ3 NEW.

**Roster leg (b) — the Hindi review.** BigDev reviewed and corrected the Hindi of all five rows in this session (the file edit,
2026-10-23). ⭐ Recorded reading: it DISCHARGES leg (b) for the three texted strings AS WORDED HERE — the same shape as `-387` LS14 (b)
(BigDev approving Hindi drafts) and 8.15 AC6 (BigDev's tone review, en + hi); any later change to a word re-opens it. The session drafted
the words and BigDev corrected them; if BigDev does not count as a non-author reviewer for that, the leg stays open — BigDev's to say.

**(e) Task 0.1 / 0.3 — partial (2026-10-23).** `git fetch origin`: `origin/main` = `d87d047a` = the pin; this branch is 2 commits ahead
(`d55d6627`, `4f12ef2b`) ⇒ no rebase needed, found facts unchanged. The routing note's E4 commands were run on the v1.2 note: every one
matches. Corrected while running them: the `resolveSmsTarget` doc quote spans two lines (`delivery.ts:152-153`), so the grep is
`'NO opt-in (the member'`; the function catches a decrypt failure (`:165-174`), which corrects the 5.11b carry's FS12 (2). The
`alert.channel_send` consumer grep and S1–S5 are still owed at Task 0.1 proper.

**(e) cont. — Task 0.3 / 0.4 (2026-10-23, BigDev: *"commit it and note base has moved, I have sent the note to Panel"*).**
- Rebased onto `origin/main` `1268d47e` (6.36d landed, 19 commits). Two stops, both in `sprint-status.yaml`'s newest-first ledger — both
  sides kept (6.36d's `23ab`…`23g`, then this row's `23z` / `23w`); YAML parses; `.decision-log.md` merged cleanly (`-389` above `-388`…`-384`).
- The 6.36d diff touched five files this story cites; each cite re-taken by CONTENT: `boot.ts` (`contributionNotifyDeps` 631-641 → 623-633,
  registration 642 → 634, `smsPreflight` 654-668 → 646-660); `peer-mesh-request.ts` (`resolvePeerRequestLocale` 701-719 → 725-743, batch SQL
  830 / 883 → 854 / 907, the at-least-once block 385-480 → 399-496); `peer-mesh-wa-reminder.ts` 754-774 → 758-778; `claim/index.ts` and the
  roster are cited by name only. No found fact changed in substance.
- Next free numbers, checked on `main` + every branch + every worktree: decision `-389` (taken by this story); roster Row 40 (taken);
  ledger letter `ag` (`x` / `aa` are the 11b-4 worktree's).
- Task 0.3: Decision `2026-10-23-389` committed ALONE (`6db47c17` after the rebase; `59085efe` before it).
- The note: SENT by BigDev 2026-10-23; its header records it; nothing below the header was edited.
- Task 0.4 records (one commit): `epics.md` `### Story 5.11` + `### Story 5.11b` (before 5.12); architecture §3.4 dated annotation after the
  2026-09-28 one; roster Row 40 `member-alert-sms-fallback-live`; deferred-work — a new 5.11 section (the Trust's channels; the bridge
  words → row `5-8b-degraded-mode-bridge-sms-wording`), dated annotations on the 6.34 TV6 item, the 5.10-validate ladder item (FS3),
  the `correlationId` item, the two 5.6 items (the decrypt half corrected — FS12 (2)), and `-387` LS11's item; the ledger `2026-10-23ag`
  (safe prepend), the row's dated comment, 5-11b's comment (five → three), the new backlog row `5-8b-…`. The row stays `ready-for-dev`
  (Task 0.4's *"→ in-progress"* is taken when dev starts, as 6.36d did); the DLT sheet, the TV6 section and Row 30 note (1) are Task 5's.

**(f) The Panel's ruling (2026-10-23, relayed by BigDev, verbatim):** *"by DR and KB"* / *"Q1 B, Q2 A"* ⇒ Decision `2026-10-23-390`
(Trustee-ratified), committed ALONE as `cd06cc5d`. Applied at v1.4: I2, AC3, Task 3, FS2, the Policy meaning, the §0 header line, the
PQ section; the records (note ruling block, §3.4 annotation, Row 40, deferred-work, the channels row, ledger) in one commit after it.

### Completion Notes List

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-23 | v1.0 | Created by `bmad-create-story 5.11` (pinned `d87d047a`). FS1–FS13 + PQ1 PROPOSED; words drafted (en + hi, hi un-reviewed). |
| 2026-10-23 | v1.1 | Validated (`bmad-create-story validate 5.11`, four parallel read-only checks; BigDev: *"all"*). Pin and found facts re-checked — no drift. SPLIT: the real send (FS5, FS6, FS8, FS9, FS12, the CRQID kind, MG12's zero-slot change) carried to new row `5-11b-alert-sms-real-send`; 5.11 adds no migration. New: F19 (the fake `sent` holds the retry loop shut) ⇒ FS14 (`in_app_only`, retry profile unchanged); FS15 (honest rung for unlit messages); FS16 (the app's name); G10 `-180` (full name on the cycle-open SMS ⇒ FS4 keeps it, two boxes, amount dropped) and G11 `-379` ⇒ PQ2; G12 R10(B) in the Policy meaning and PQ1; consent moved to counsel (roster leg (f)); FS3's mechanism (a rejecting provider); FS10 runs the normal ladder while the bridge is dark; FS13 letter code for non-GSM names in en; registry moved to `apps/jobs` (`MEMBER_BOX_SLOTS`); cites corrected (F7 nine messages, F11 `getMemberLanguage`, F18, `-345`, `-354`, G1, G3, G4); segment table recomputed; glyph inversions removed. |
| 2026-10-23 | v1.2 | Task 0.2 ANSWERED (Debug Log (a)). FS1 (d): three texted notices (day 10, payment not matched, payment still not confirmed); pool open and day 14 go to the Trust's announcement channels (BigDev's direction) ⇒ PQ3 NEW (ask or require members to join), G13 NEW (a broadcast channel is not in §3.4); PQ1 reshaped to the three; PQ2 WITHDRAWN (no text carries a name). FS16 (b). Words corrected by BigDev (en + hi) and segments recomputed (common path 1 en / 2 hi). `alert_published` stays excluded (G4 kept). Name boxes, the exigency line and `name_over_60_unruled` dropped from AC1 / AC5 / AC6 / Tasks 1, 2, 5 / T7 / T12. FS12 (2) corrected (`resolveSmsTarget` already catches a decrypt failure). Routing note rewritten — NOT sent. |
| 2026-10-23 | v1.3 | Rebased onto `origin/main` `1268d47e` (6.36d landed) and re-pinned; five cited files' line numbers re-taken by content (Debug Log (e)). Task 0.3: Decision `2026-10-23-389` committed alone (`6db47c17`). Routing note SENT by BigDev. Task 0.4: the records commit (epics 5.11 + 5.11b, §3.4 annotation, roster Row 40, deferred-work, ledger `2026-10-23ag`, new backlog row `5-8b-degraded-mode-bridge-sms-wording`). Status stays ready-for-dev; next is Task 1. |
| 2026-10-23 | v1.4 | THE PANEL RULED (`2026-10-23-390`, Trustee-ratified, DR + KB: *"Q1 B, Q2 A"*). PQ1 B: the eligibility check widens to any member the app (and WhatsApp, where used) could not reach — I2, AC3, Task 3, FS2 updated (the v1.2 `whatsapp !== null` requirement removed). PQ3 A: members asked, not required, to join a Trust channel — new backlog row `5-14-trust-announcement-channels`. Records committed after the decision. Status stays ready-for-dev; next is Task 1. |
