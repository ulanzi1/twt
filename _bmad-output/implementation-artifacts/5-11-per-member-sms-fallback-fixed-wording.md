---
baseline_commit: d87d047a
---

<!--
PINNED: d87d047a (origin/main, "story(6.35): ledger 2026-10-23v — LANDED on main by fast-forward"). Branch
`story/5-11-per-member-sms-fallback-fixed-wording`, worktree `.claude/worktrees/5-11-per-member-sms-fallback-fixed-wording`.

Two facts, kept apart (footgun #24): (1) the PIN is valid iff `git merge-base --is-ancestor d87d047a HEAD`; (2) the FOUND FACTS
are valid iff `git diff --name-only d87d047a..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory` is EMPTY
or every changed path is re-checked against the F it touches. Re-run BOTH at Task 0.1 — ⛔ assume either.

STATUS: 2026-10-23 created (`bmad-create-story 5.11`) → ready-for-dev. FS1–FS13 + PQ1 PROPOSED for BigDev at Task 0.2.

START CONDITION — MET at the pin: 5.6 (the SMS rung), 5.12 (a yes has ⛔ clock), 6.34 (typed DLT variables; TV6 dark), 6.35
(`members.preferred_locale`, migration 0179), 6.37 / 6.37b (MSG91 adapter + delivery reports), 8.8 (the first live `dispatch()` —
the contribution notices) are all `done` on `main`.

NUMBERS (footguns #19 / #42(e); `-366` decision 6): this file names ⛔ migration number, ⛔ decision id, ⛔ roster Row number and ⛔
DLT-sheet ordinal that is not yet taken. The next free of each is found AT THE TIME OF USE (Task 0.3 / 0.4 / 5): `^### Decision` on
`main` + every branch + every worktree; `ls packages/domain/migrations` + every worktree; the roster's highest `### Row`; the DLT
sheet's highest template `#`. At the pin they WERE: decision `-388`, migration `0179`, Row 39, template 16 — ⛔ "the next is X".
The roster row is named by its KEY `member-alert-sms-fallback-live`.

§0 GATE (trustee-panel-routing-note-TEMPLATE.md) — readings:
  G1  architecture §3.4 fire condition (iii) *"per-member transactional fallback when both WA gates ON and WA delivery returns
      failure after the committed retry window"* + §3.4 *"Members without active WA opt-in receive only in-app push for non-OTP
      notifications — they do not receive transactional-fallback SMS."* — FS2 (a) MATCH; FS2 (b) WIDENS ⇒ PQ1 (the Panel's).
      ⚠ §3.4's SMS sentences carry ⛔ recorded Trustee ratification of their own (`-065` names ADRs only; ADR-0029 has ⛔ SMS
      word) — but the Panel has treated them as *"the approved plan"*: `-255` F7 (Trustee-ratified) widened it ONLY by a ruling,
      *"with its stated costs"*, and ordered §3.4 *"owed an annotation, ⛔ never a rewrite"*. ⇒ widening is the Panel's by that
      precedent, whatever (iii)'s own status ([[feedback_supersede_never_reinterpret]]).
  G2  §3.4 *"after the committed retry window (3 attempts × exponential backoff)"* — FS9 (a) MATCH; FS9 (b) NARROWS the wait —
      would be a re-reading of plan text ⇒ ⛔ recommended.
  G3  PRD RA-29 / §4.10 *"Bulk-alert SMS dropped … transactional-fallback-SMS preserved"*; *"Not a bulk-alert channel"* — MATCH
      for FS1 (a)/(c) (per member, per message, only on a failed higher rung); FS10 (a) (lighting the cycle-open BRIDGE) would
      reach every member of a degraded Pariwar ⇒ ⛔ recommended here (its own story).
  G4  the v1 SMS category set is *"a DERIVED product default"* (BigDev 2026-07-06, `sms-dlt-registry.ts:14-24`) — the AUTHOR's;
      adding the pool-open message (FS1) and keeping `claim_status_change` / `helpdesk_reply` dark are author-commits.
  G5  the WORDS (FS4): new member-facing copy, ⛔ ratified text exists for them (contrast DLT templates 7–14, the Panel's words).
      Author's, en; Hindi under a review row (the DLT sheet's *"every Hindi text — the author's, under a review row"*).
  G6  `-387` LS11 — *"Every other sender keeps its language … ⭐ Trigger: a story or ruling that sets a language rule for that
      message"* — FS5 IS that story for the alert SMS; LS13's screen already tells the member *"Some messages from the Trust (SMS
      and WhatsApp) will also come in this language"* — FS5 (a) MATCH.
  G7  `-385` (Trustee-ratified) — the neighbours' reminder falls back to the Pariwar's language — CITED as the closest analogy
      for FS5's fallback, ⛔ as binding here (its scope is that one reminder).
  G8  `-375` "Does NOT cover": *"any SMS consent (row 5-11)"* — answered by the PQ1 note's evidence (TRAI: a member's own-account
      notice is Service-Implicit; the Terms draft cl.10 names ⛔ SMS) — ⛔ a separate consent mechanism is proposed; whether one is
      owed is INSIDE PQ1, ⛔ a separate question.
  G9  `-349` decision 1 (no claim flow in production with an unapproved template) — scoped to templates 1–14; FS11 carries the same
      rule for the new templates as a roster leg (the author's narrowing).
  NOT covered by any ruling: the reach of the alert SMS for a member without WhatsApp (PQ1); whether R7 contribution discipline
  presumes the member was told (PQ1's "one fact"); the cost per message at 4L (recorded, ⛔ ruled).

GLYPH REGISTER: ⛔ = not / never / must not; ⭐ = recommended / load-bearing; ⚠ = trap or caveat. `.decision-log.md`,
`deferred-work.md` and `sprint-status.yaml` are NEVER cited by `file:NNN` (newest-first prepends move every line).

LETTERS: F = found facts · FS = build decisions (PROPOSED; answered by BigDev at Task 0.2) · I = invariants · T = traps ·
S = Task 0.1 STOP conditions · PQ = Panel question.
-->

# Story 5.11: The Per-Member SMS Fallback Is Switched On — Fixed, Registrable Wording (en + reviewed hi) for the Contribution Notices a Member Must Not Miss, Sent Only When the App and WhatsApp Could Not Reach Them `[SURFACE]`

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** A member whose phone the app cannot reach today hears nothing by text: the per-member
> SMS fallback exists in code but is DARK, because every v1 alert SMS was one whole-body variable that TRAI will not register
> (Story 6.34 TV6). Worse, "dark" is ⛔ silent — the rung falls to a log-only stand-in that reports `sent` (F3). This story writes
> FIXED wording (en + hi) for the contribution notices a member must act on — first among them **"your pool is open"**, the message
> that motivated the row — registers it on DLT, gives the alert SMS a real per-member send (named values, a correlation id, a send
> record), picks each member's language, and enforces WHO may receive it: as the approved plan reads, a member whose WhatsApp is
> on and failed (FS2 (a)); and it asks the Trustee Panel (PQ1) whether a member WITHOUT WhatsApp should get it too (BigDev's
> direction). ⛔ The degraded-mode bridge stays dark. ⛔ OTP is untouched.
>
> **Day-one output: none.** Every Pariwar's WhatsApp is off and ⛔ template id is provisioned, so under FS2 (a) nobody qualifies
> and under any answer ⛔ SMS goes until the new roster row's legs close. What changes on day one is that the rung stops LYING:
> the stand-in no longer reports `sent` for an alert SMS (I3).
>
> **What already ships and this story REUSES:** the ladder + cascade (`dispatch.ts`, `cascade.ts`); `resolveSmsTarget`; the DLT
> vocabulary and shape check (`dlt-variables.ts`); MSG91's named-value send + value proof + pre-flight (`createSmsDltProvider`,
> `substituteDltValues`, `smsPreflight` — Story 6.37); the CRQID grammar + delivery-report inbox (6.37b); the member-language
> read (`resolvePeerRequestLocale`, 6.35); the DLT sheet's lockstep test helpers (`apps/jobs/tests/_dlt-template-sheet.ts`); the
> per-member `sms_rate_buckets` (5.6, never wired — F12).
>
> **What it CHANGES:** `sms-dlt-registry.ts` (message-keyed, per locale, registrable); `render.ts`'s SMS branch for the lit
> messages; the alert payload (an optional SMS block — FS7); `fanOutAlert`'s SMS rung (eligibility + per-send provider);
> the WhatsApp stand-in for an enabled Pariwar (FS3); one migration (the send record + CRQID kind — FS6); `contribution.json`
> (en + hi `sms.*` keys); the DLT sheet; the roster; tests.
>
> **What it READS and leaves alone:** push and WhatsApp copy and logic; Telegram; the OTP registry and path; the claim texts
> (templates 1–14) and their core; the degraded-mode bridge's behaviour (kept dark, now explicitly — FS10); `claim_status_change`
> (⛔ producer) and `helpdesk_reply` (log-only in production) — both stay dark.

## Story

As a **member whose phone the Trust's app cannot reach**,
I want **a short text message, in my language, when my pool opens, when my contribution is still not recorded, on the cycle's last
day, and when my payment could not be matched or confirmed**,
so that **I am not left out of a cycle — and the record of what I missed — only because a push notification never arrived**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| Architecture §3.4 channels list (`architecture.md:2115-2119`) | *"SMS … preserved fire conditions: (i) OTP … (ii) step-up OTP … (iii) per-member transactional fallback when both WA gates ON and WA delivery returns failure after the committed retry window; plus the per-Pariwar cycle-open SMS bridge … Not a bulk-alert channel."* | committed plan (⛔ own Trustee ratification found — G1) |
| Architecture §3.4 "Per-member fallback SMS dispatch" (`architecture.md:2318-2324`) | *"When both WA gates are ACTIVE … and WA delivery returns undelivered after the committed retry window (3 attempts × exponential backoff), the dispatcher fires a DLT-transactional SMS containing the equivalent template payload. Fallback fires per message, not per cohort. Members without active WA opt-in receive only in-app push for non-OTP notifications — they do not receive transactional-fallback SMS."* + the 2026-09-28 annotation: *"The sentence above still holds for every `dispatch()` notification."* | committed plan; annotated, ⛔ rewritten |
| `2026-09-27-255` F7 (Trustee-ratified) | *"THE APPROVED PLAN IS WIDENED: text-message (SMS) reminders go to the people the filing agreement covers … Chosen with its stated costs: a change to the approved plan (which dropped bulk SMS for cost and regulatory reasons), a new DLT template registration, and a cost per message."* Consequence 2: §3.4 *"owed an annotation, ⛔ never a rewrite"*. | RATIFIED — the precedent for PQ1 |
| PRD RA-29 (`prds/prd-TWT-2026-05-22/addendum.md`) / §4.10 | *"Bulk-alert SMS dropped; OTP-SMS, step-up-OTP-SMS, and transactional-fallback-SMS preserved."* Rationale: *"TRAI bulk-SMS DLT approval friction + per-SMS cost at 4L scale"*. §4.10: *"Per-member transactional fallback when both WhatsApp gates … are ON and WA delivery fails"*. | committed |
| epics.md Story 5.6 AC | SMS after *"(a) in-app push fails … OR (b) WA delivery fails per AR-19, OR (c) the member has no opted-in higher-tier channels"* — ⚠ CONFLICTS with §3.4; 5.6's own D1 said *"Do not silently implement a blanket no-channel→SMS fallback"*. The code followed (c) (F4). | conflict, recorded |
| `2026-10-10-313` TV6 (author-commit) | the five whole-body alert entries DARK *"until a later story writes fixed en + hi wording"*; FOUND (c): six types, ≥ 30 % fixed, ≤ 2 variables (a third *"in case of exigency"*) | BUILT (6.34) |
| `2026-10-17-345` MG12 (author-commit) | *"A message with ⛔ `values` (the alert composition …) is refused locally `dlt_template_not_approved:no_named_values`; every alert category stays DARK (TV6)"* | BUILT (6.37) — Gate B (F3) |
| `2026-10-23-387` LS11 / LS13 (author-commit) | LS11: senders other than the neighbours' text keep their language until *"a story or ruling that sets a language rule for that message"*; LS13's screen: *"Some messages from the Trust (SMS and WhatsApp) will also come in this language."* | BUILT (6.35) |
| `2026-10-23-385` (Trustee-ratified) | the neighbours' WhatsApp reminder that cannot go in the member's chosen language goes in the Pariwar's language | RATIFIED — analogy only (G7) |
| `2026-10-21-375` "Does NOT cover" | *"any SMS consent (row 5-11)"* | open → PQ1 evidence |
| Row 30 note (1) (`inventory-roster.md`) | *"provisioning `sms.dlt.template_id.<category>` for any of them does NOTHING … turning the per-member SMS fallback on needs fixed wording (en + hi), a later story with its own §0."* | open — discharged in part here |
| Row 38 (d-i) / deferred-work 5.10-validate item | a switched-on Pariwar with no approved WA template: the stand-in reports `accepted` ⇒ *"the ladder stops before SMS"*; fix shape (d-ii) *"a fixture must not count as `sent` for a Pariwar whose WhatsApp is `enabled`"* | OPEN — FS3 |

## ⭐ THE INVARIANTS

- **I1 — Registered text = sent text, byte for byte.** Every lit message's SMS body is its registry `contentTemplate` with its
  named values substituted, rendered through the REAL `t()` from `contribution.json`; the value proof runs before the network
  (6.37 MG3). *Proof:* AC2, AC4.
- **I2 — Who receives it is ONE named predicate.** `isAlertSmsFallbackEligible` (name the dev's) decides the reach; under FS2 (a)
  it is true only when the member's WhatsApp target was resolved (Pariwar on + member ACTIVE) AND the WhatsApp rung did ⛔ end
  `sent`. Widening it after PQ1 is a change to this one function + its tests. *Proof:* AC3.
- **I3 — ⛔ alert SMS is ever reported `sent` without a real send.** A lit message with an unset id / unconfigured gateway ends
  the rung NON-sent (fail closed — the claim texts' T13 shape), ⛔ the log fixture's `accepted`. The fixture stays for tests and
  for categories that are ⛔ SMS-eligible at all. *Proof:* AC4.
- **I4 — Once per alert per member.** A pg-boss retry after a provider accept ⛔ sends a second text (the send record's UNIQUE).
  *Proof:* AC5.
- **I5 — Not a bulk channel.** ⛔ broadcast (`news`, `survey`, `moderation`, `module_new`, `niyamavali_amended`) and ⛔ the
  degraded-mode bridge can reach a lit template. Only the messages FS1 names, only per member, only on a failed higher rung.
  *Proof:* AC6.
- **I6 — Hindi parity.** Every lit message has en + hi; Hindi carries the NOT-YET-HUMAN-REVIEWED marker until the review row closes.
  *Proof:* AC2, AC8.

## 📜 Policy meaning (AI-10-1)

**5.11 introduces a predicate that decides whether a member is TOLD, by text, about their own pool — it gates ⛔ benefit directly,
but it borders one, so the sentence is written.** In the member's terms, under the recommended FS2 (a): *"If you have not said yes
to WhatsApp messages from the Trust, you will never get a text about your pool, its deadline or your payment — if the app cannot
reach you, you hear nothing, and a cycle you miss still counts in your contribution record."* Under FS2 (b) (PQ1 answered yes):
*"If the app (and WhatsApp, when you use it) cannot reach you, the Trust texts you the few notices you must act on."*
**Niyamavali check:** grepped for SMS / text-message notice — ⛔ match (the Niyamavali, its FR mapping and both amendment drafts
name ⛔ SMS; the Terms draft v0.2 cl.10 names the in-app surface as official, Telegram and WhatsApp as mirrors, and ⛔ SMS).
⚠ ⛔ checked: whether R7's counting of missed cycles presumes the member was notified — that question is put to the Panel inside
PQ1, ⛔ answered here. (The Niyamavali is a rulebook, ⛔ a ratified spec — [[feedback_niyamavali_rulebook_not_spec]].)

## ⭐ FOUND FACTS (at `d87d047a` — re-run each at Task 0.1)

**The rung and why it is dark**
- **F1 —** `CANONICAL_CHANNEL_LADDER = ['push','whatsapp','sms']` (`packages/channels/src/dispatch.ts:34`); `isCategoryEligible`
  returns `true` for sms for EVERY category (`dispatch.ts:73-77`) — ⛔ SMS eligibility lives in dispatch.
- **F2 —** `runChannelCascade` stops only on `sent`; `skipped_*` / `suppressed` advance immediately (`cascade.ts:109-147`, `:137-140`).
  The live fan-out passes `backoffMs: []` — pg-boss owns retry (`apps/jobs/src/scheduler/contribution-notify.ts:314-318`, D9;
  `CHILD_RETRY_LIMIT=4`, `CHILD_RETRY_DELAY_SECONDS=60` at `contribution-notify-triggers.ts:111-112`).
- **F3 — TWO gates, and "dark" reports SUCCESS.** Gate A: `resolveDltTemplate` returns `null` for an entry with
  `contentTemplate: null` (`sms-dlt-registry.ts:113-117`) ⇒ `resolveSmsProviderDeps` null (`composition/provider-composition.ts:193-212`)
  ⇒ `createFixtureSmsProvider` (`providers/index.ts:96-102`) returns `accepted` / `fixture-sms` (`providers/fixture-sms.ts:29-37`)
  ⇒ dispatch maps it to `sent` and audits `alert.channel_send` 202. Gate B: even with a registrable entry, composition returns
  ⛔ `values` (`provider-composition.ts:210-211`) ⇒ `createSmsDltProvider.send` refuses `dlt_template_not_approved:no_named_values`
  (`providers/sms-dlt.ts:72-81`). The resolver memoizes per `(pariwarId, category)` (`provider-composition.ts:345-399`) — it
  CANNOT carry per-member values, and its key has ⛔ locale.
- **F4 — (iii) is ⛔ enforced.** `resolveSmsTarget` has ⛔ opt-in gate (`packages/domain/src/notifications/delivery.ts:151-176`,
  doc: *"SMS has NO opt-in"*); `resolveWaTarget` is null when the Pariwar toggle is off or `isOptInActive` false (`delivery.ts:116-149`),
  and a null WA target is `skipped_no_target` (`contribution-notify.ts:303-309`) ⇒ the cascade goes on to SMS. Asserted by
  `apps/jobs/tests/contribution-notify.test.ts:263-274` (trail `push:rejected, whatsapp:skipped_no_target, sms:sent`). ⇒ lighting the
  registry ALONE would text exactly the members §3.4 says must ⛔ get it.
- **F5 — the WA stand-in stops the ladder.** Pariwar WA `enabled` + member ACTIVE + ⛔ approved template ⇒ `resolveWhatsappProviderDeps`
  null (`provider-composition.ts:89-90`) ⇒ fixture `accepted` (`providers/fixture-whatsapp.ts:28-36`) ⇒ `whatsapp:sent` ⇒ ⛔ SMS.
  Under FS2 (a) this cuts off the ONLY members who qualify (deferred-work, the 5.10-validate item; Row 38 (d-i)).

**The messages**
- **F6 — "pool assignment" is `alert_published`, ⛔ in the SMS registry.** The cycle-open notice is one `alert_published` per
  assigned member (`contribution-notify-triggers.ts:8-12`, `:321`); the SAME category carries news (`news-publish.ts:161`), surveys
  (`survey-publish.ts:145`), moderation (`moderation-notify.ts:240`) and a staff push (`claim-correction-reminders.ts:607`) ⇒ SMS
  eligibility must be per MESSAGE, ⛔ per category (I5).
- **F7 — the per-member messages and their copy** (`packages/contracts/src/alerts/contribution-loop-templates.ts`;
  `packages/i18n/locales/{en,hi}/contribution.json` `notify.*`): cycle-open (`notify.cycle_open.title/body` — `{pool}`, `{family}`,
  `{amount}`); deadline days 5 / 10 / 13 / 14 (`notify.deadline.day_N.subject/display` — `{pool}`, `{days}`, `{date}`, day 14 also
  `{family}`; "four sends, four messages", tone band derived from `selectToneGradientKey`); pending-match soft / escalated
  (`notify.pending_match.*` — `{pool}`); confirmed (`notify.confirmed.period_label` — `{cycleRef}`); mismatch (three reasons,
  ⛔ params). Reminders SKIP `already_confirmed` / `already_attested` members (`contribution-notify-triggers.ts:206-211`).
- **F8 —** `claim_status_change` has ⛔ producer (grep: only `deep-link.ts` / a schema CHECK); `helpdesk_reply`'s production
  notifier is `consoleHelpdeskReplyNotifier` (`apps/api/src/deps.ts:527`, log-only).
- **F9 — today's SMS render** is `` `${heading}: ${line}` `` (`render.ts:152-153`) with ENGLISH headings (`render.ts:82-126`) and the
  producer's localized, escaped line — mixed-script, unbounded.
- **F10 — value shapes.** `{pool}` = `poolName ?? poolLetterCode` (`contribution-notify-triggers.ts:247-249`); `pool_names` has
  ⛔ length CHECK (`migrations/0073_pool-naming.sql`) ⇒ an admin-curated name can exceed any slot. `{date}` = `DD-MM-YYYY` UTC
  (`:269-274`). `{amount}` = `formatCurrency(fixedAmount,'en')` ⇒ `"₹ 110"` / `"₹ 99.50"` (`packages/i18n/src/currency.ts:36`) —
  `₹` is ⛔ GSM-7 (makes English Unicode) and `.` makes it ⛔ numeric. `{family}` = the mode-resolved deceased name (unbounded).
- **F11 — language.** These senders use `deps.locale ?? DEFAULT_LOCALE` (`'hi'`) (`contribution-notify-triggers.ts:678, 1292, 1357`);
  boot never sets `locale` (`boot.ts:631-641`); `members.preferred_locale` (0179) is read only by `resolvePeerRequestLocale`
  (`packages/domain/src/claim/peer-mesh-request.ts:701-719`) — member choice ⇒ `member_choice`, else `pariwar_passport.locale_default`.

**Send plumbing**
- **F12 —** `checkAndConsumeSmsBudget` on `sms_rate_buckets` (0049; `packages/domain/src/sms-rate-limit/buckets.ts`) has ⛔ production caller.
- **F13 —** CRQID kinds `cr, ce, sn, pm, ot` (`packages/domain/src/sms-delivery/correlation.ts:21`, pattern `:30`), mirrored by
  0167's `sms_delivery_report_inbox_crqid_check` — the ONE sanctioned SQL mirror. ⛔ alert kind.
- **F14 —** the claim send core `sendClaimDltSms` (`apps/jobs/src/scheduler/claim-dlt-sms-send.ts:263-346`) is the model (values
  proof `:199-219`, pre-flight `:317-338`, CRQID at the top) but is CLAIM-shaped: it requires the per-Pariwar helpline key.
- **F15 —** the degraded-mode bridge force-sends SMS for `alert_published` when `alert.time_critical` (`contribution-notify.ts:256-280`;
  `degraded-mode.ts:96-113`) — through the SAME SMS rung ⇒ a pool-open template would LIGHT THE BRIDGE unless guarded (FS10).
- **F16 — CI gate** `scripts/dlt-typed-variables/lib.ts:50-62` (`REGISTRY_FILES` includes `sms-dlt-registry.ts`; `:53` notes the alert
  registry test asserts null).
- **F17 — DLT sheet** `docs/launch-gate-inventory/dlt-template-requests-6-19.md`: templates 1–16, the TV6 "⛔ Not registrable"
  section, per-template cost lines, the rejection table (*"If DLT rejects a template …"*), the Record.

**Tests that assert today's dark state (they CHANGE)**
- **F18 —** `packages/channels/tests/sms.test.ts:600-656` (exactly five dark entries; `:626-638` provisioned id never read; `:89-100`
  MG12); `packages/channels/tests/provider-composition.test.ts:24-38, 211-293`; `packages/channels/tests/contribution-provider-resolver.test.ts:24-37`;
  `apps/api/tests/unit/sms-composition.test.ts:40, 88-161` (each `vi.mock`s the registry with a fake registrable `deadline_reminder`);
  `packages/channels/tests/otp-sms-template.test.ts:52-54`; the ladder tests `apps/jobs/tests/contribution-notify.test.ts:242-300, 356-375`,
  `ai-8-3-ladder-armor-live.test.ts:157-238`, `contribution-notify-live.test.ts:155-232`,
  `packages/channels/tests/integration/live-dispatch-cascade.spec.ts:193` (AI-5-2 — reject doubles, ⛔ the shipped fixtures).

## ⚖️ Build decisions FS1–FS13 (⭐ = recommended) — PROPOSED for BigDev at Task 0.2

- **FS1 — which messages go by SMS.** ⭐ **(a) five — the ones a member must act on:** pool open (cycle-open), day 10 *"not recorded
  yet"*, day 14 *"last day"*, payment not matched (ONE text for all three reasons), payment still not confirmed (pending-match
  ESCALATED). ⛔ day 5 (repeats pool-open), ⛔ day 13 (the day before 14), ⛔ pending-match soft (> 4 h), ⛔ confirmed (a thank-you
  — every cycle for every member whose push fails). The skipped four still go by push / WhatsApp; only their SMS rung is ⛔ eligible.
  `claim_status_change` and `helpdesk_reply` stay dark (F8 — ⛔ live sender; lit by the story that gives them one). → **10 templates**
  (5 × en/hi). *Cost (a):* at most **3 texts per member per cycle** on the common path (pool-open, day 10, day 14), +1 per mismatch /
  escalated payment. **(b) all eight push messages** — 16 templates; up to 7 texts per member per cycle. *Cost (b):* ~2× registrations
  and spend; day 5 / 13 add little. **(c) pool-open + day 14 only** — 4 templates. *Cost (c):* a member who never opens the app
  learns of a missed contribution only on the last day, and never hears of a payment problem.
- **FS2 — who receives it (I2).** ⭐ **(a) as §3.4 (iii) reads, enforced in code NOW:** eligible only when the WhatsApp target was
  resolved (Pariwar on + member ACTIVE) and the WhatsApp rung did ⛔ end `sent` (incl. FS3's not-sent). Everyone else: the SMS rung
  is `skipped_no_target` with detail `sms_fallback_not_eligible`. ⭐ **AND route PQ1** (BigDev's direction): widen to *"any member whose
  push — and WhatsApp, where on — could not reach them"*. The build ships (a); a ruled (b) is a one-function change + its tests,
  made by this story if ruled before Task 7, else by a dated follow-up row. *Cost (a):* day-one reach ZERO (⛔ Pariwar has WhatsApp
  on); the motivating member — no app, no WhatsApp — is NOT reached until the Panel rules. **(b) ship the widening now without the
  Panel.** ⛔ Recommended — the Panel's by `-255` F7's precedent (G1). **(c) keep today's code (⛔ gate) and light the registry.**
  ⛔ — that IS (b), by omission (F4).
- **FS3 — the WhatsApp stand-in stops counting as `sent` for an enabled Pariwar** (deferred-work's (d-ii); Row 38 (d-i) stays as a
  provisioning leg). ⭐ **(a) fix it here:** when the Pariwar's WA config is `enabled` and the category has ⛔ `approved` template, the
  WA rung ends NON-sent (`skipped_no_target`, detail `wa_template_not_approved`) so the cascade reaches SMS — this story makes the
  defect bite (F5). The AI-5-2 live-dispatch spec's reject doubles stay. *Cost (a):* touches the WA provider selection (the item's
  own trigger); a disabled Pariwar keeps today's fixture. **(b) leave it to its item.** *Cost (b):* under FS2 (a) the only qualifying
  members are cut off until every category has an approved template in every Pariwar.
- **FS4 — the words** (table below). ⭐ **(a) as drafted:** ⛔ the family's name (cycle-open would need 4 variables with the 6.37e
  two-box name; a text to a possibly shared phone stays short), ⛔ helpline number (⛔ per-Pariwar dependency; FS4 (b) adds it),
  `Rs` in English (keeps it GSM-7 — F10), the amount as an alphanumeric value, the working brand "TWT" (Row 30 note (2): re-register
  when the Trust's name is fixed — [[project_legal_name_pending]]). *Cost (a):* the SMS names no family — the push still does.
  **(b) add *", or call the helpline {#var#}"*** (cbn, the existing `sms.claim_correction.helpline_number.<pariwarId>`). *Cost (b):*
  every send fails closed for a Pariwar with no number provisioned (DLT sheet: ⛔ none provisioned); a third variable on cycle-open
  needs an exigency line.
- **FS5 — the language.** ⭐ **(a) the member's own choice (`members.preferred_locale`), else the Pariwar's default** — EXTRACT the
  read out of `resolvePeerRequestLocale` into a neutral domain function both senders call (the 2nd consumer — [[feedback_no_premature_package]]
  is met; LS8's "ONE function" stays one). If that language's template is unusable (id unset / pre-flight proven fault) ⇒ the other
  language's if usable (`-385`'s shape, by analogy — G7), else the rung ends NON-sent `config:dlt_template_id_missing:<locale>`.
  ⚠ push keeps its language (LS11's item is narrowed for SMS only — record it). *Cost (a):* a member who chose English gets English
  SMS but Hindi push. **(b) the push's language** (`deps.locale ?? 'hi'`). *Cost (b):* contradicts LS13's screen promise.
- **FS6 — the send record.** ⭐ **(a) a new table** (one migration, the next free number): one row per (alert, member), UNIQUE —
  begun BEFORE the provider call (a CAS from ⛔ begun, the 6.27c ping shape), final outcome written after; a new CRQID kind (e.g.
  `as`) in `SMS_CORRELATION_KINDS` + the pattern + 0167's CHECK (replaced in the new migration, ⛔ 0167 edited —
  [[project_live_db_test_gotchas]]); the delivery-report matcher maps the kind. A row already begun ⇒ ⛔ resend (I4); recorded
  at-least-once edge: a crash between accept and write. Discharges 6.37b's deferred *"`correlationId` is optional"* for this path
  (made required). *Cost (a):* a migration, grants, RLS (the jobs pool bypasses RLS — explicit `pariwar_id` predicates). **(b) ⛔ row:**
  CRQID from the alert id, like `ot`. *Cost (b):* a pg-boss retry after an accept texts twice; reports match nothing.
- **FS7 — how the alert carries the SMS.** ⭐ **(a) an OPTIONAL `sms` block on the payload** of the lit producers —
  `{ message: <FS1 key>, values: { <slot>: <string> } }` built where the push copy's params are built (same locals — I1); absent ⇒
  the message is ⛔ SMS-eligible. *Cost (a):* a contracts change — OPTIONAL so no fixture breaks ([[project_contracts_tests_outside_tsc]]);
  the `alert_published` cycle-open payload gains it, news / survey / moderation never do (I5). **(b) rebuild the values in the fan-out**
  from ids. *Cost (b):* a second copy of the pool-label / date logic that can drift from the push.
- **FS8 — the per-member budget.** ⭐ **(a) wire 5.6's `checkAndConsumeSmsBudget`** before each alert SMS (F12); over budget ⇒ the rung
  ends NON-sent `sms_budget_exhausted`, audited. *Cost (a):* one write per text; the bucket's configured numbers become live — re-read
  them at Task 0.1. **(b) ⛔ cap** — FS1's per-cycle ceiling is the only bound.
- **FS9 — "after the committed retry window".** ⭐ **(a) honour it:** the SMS rung runs only on a pg-boss attempt ≥ 3 of the child when
  the earlier attempts' WhatsApp rung failed; attempts 1–2 end undelivered and throw (pg-boss retries, as today). *Cost (a):* the text
  goes ~2–3 min later; a few more job runs. **(b) SMS on the first failed pass** (today's cascade). ⛔ Recommended — a re-reading of
  plan text (G2). ⚠ If PQ1 widens the reach for a member with ⛔ WhatsApp target, the window has nothing to wait for ⇒ first pass.
- **FS10 — the degraded-mode bridge.** ⭐ **(a) stays DARK, explicitly:** a bridged send ⛔ uses the lit pool-open template (a guard +
  test); the bridge keeps the fixture until its own story writes its words (the draft is `docs/degradation-policy/comms-templates/sms-channel.md`).
  ⚠ The bridge today fakes `sent` (I3 reaches it too — its rung ends NON-sent `sms_bridge_not_lit`, so its trail stops lying).
  A `deferred-work.md` item records it. *Cost (a):* a degraded Pariwar still gets ⛔ text. **(b) light the bridge with the pool-open
  text.** *Cost (b):* every member of a degraded Pariwar, every cycle — a cost the Panel accepted in 5.8's epic text but never for
  these words; ⛔ in this story.
- **FS11 — go-live: a NEW roster row, KEY `member-alert-sms-fallback-live`** (the next free Row at Task 0.4; Row 38's shape),
  decision-authored: **(a)** the 10 templates (FS1) registered on SmartPing with their types, APPROVED, and their MSG91 template ids set;
  **(b)** the 5.11 Hindi strings HUMAN-REVIEWED (Row 28's control); **(c)** Row 30 (d)'s provider answers cover these texts (the date's
  hyphen; a pool name with spaces or Devanagari) — cross-referenced, ⛔ duplicated; **(d)** the per-segment price recorded and the
  per-cycle cost line in the DLT sheet re-derived with it; **(e)** a real alert SMS received on a device from staging (Row 32's setup
  legs). Rule (the `-349` decision 1 shape, the author's): ⛔ id is set until its template is approved. Blocks ⛔ build and ⛔ merge.
- **FS12 — the 5.6 mirror defects (AI-5-5).** ⭐ **(a) closed on this path by reuse:** the template id is checked as MSG91's 24 hex
  (MG4 — supersedes "trim") and the `to` validated by the MSG91 client; both 5.6 items annotated *"addressed for the alert path by
  5.11"*, ⛔ closed (the composition path stays for the dark categories). **(b)** leave both untouched.
- **FS13 — the pool name.** ⭐ **(a)** the `{pool}` slot is alphanumeric ≤ 30; a curated name over 30 code points sends the
  LETTER CODE instead (always short; F10); the push is unchanged. *Cost (a):* a long-named pool is named by letter in the SMS only.
  **(b)** refuse the send `value_too_long`. *Cost (b):* a member silently gets ⛔ text because of an admin's naming.

### The words (FS4 (a)) — DRAFT, en author-written, hi ⚠ NOT-YET-HUMAN-REVIEWED

Keys go in `packages/i18n/locales/{en,hi}/contribution.json` under `sms.*`; each `{param}` is a slot NAME (TV13). The REGISTERED
text is the same string with each `{param}` replaced by `{#var#}`.

| Key | Slots (type, max) | en | hi |
|---|---|---|---|
| `sms.pool_open` | `pool` alnum 30 · `amount` alnum 12 | TWT: your pool {pool} is open. This cycle's contribution is Rs {amount}. Please open the TWT app to contribute when you can. | TWT: आपका पूल {pool} खुल गया है। इस चक्र का अंशदान ₹ {amount} है। जब सुविधा हो, TWT ऐप खोलकर योगदान करें। |
| `sms.deadline_not_recorded` (day 10) | `pool` alnum 30 · `date` alnum 10 | TWT: your contribution to pool {pool} is not recorded yet. This cycle closes on {date}. Please see the TWT app. | TWT: पूल {pool} में आपका योगदान अभी दर्ज नहीं हुआ है। यह चक्र {date} को बंद होगा। कृपया TWT ऐप देखें। |
| `sms.deadline_last_day` (day 14) | `date` alnum 10 · `pool` alnum 30 | TWT: today, {date}, is the last day of this cycle for pool {pool}. If you are able, please contribute in the TWT app. | TWT: आज, {date}, पूल {pool} के इस चक्र का अंतिम दिन है। यदि संभव हो, तो कृपया TWT ऐप में योगदान करें। |
| `sms.payment_not_matched` | — | TWT: we could not match your payment yet. We will help you sort it out. Please see the TWT app. | TWT: आपके भुगतान का मिलान अभी नहीं हो पाया है। इसे ठीक करने में हम आपकी मदद करेंगे। कृपया TWT ऐप देखें। |
| `sms.payment_not_confirmed` (escalated) | `pool` alnum 30 | TWT: we still have not been able to confirm your payment for pool {pool}. Please check or retry in the TWT app. | TWT: पूल {pool} के लिए आपके भुगतान की पुष्टि अब तक नहीं हो पाई है। कृपया TWT ऐप में जाँचें या फिर से प्रयास करें। |

⭐ Pre-checked at creation (fixed share = fixed / (fixed + Σ slot max); segments at the LONGEST values; ⚠ the dev re-runs
`checkDltTemplateShape` on the real registry): fixed 68–100 % for all ten; **en 1 GSM-7 segment each** (95–152 chars); **hi 2
Unicode segments** (103–133), `sms.payment_not_confirmed` hi **3** (137). ⇒ FS1 (a)'s common path ≈ 3 segments per cycle in en,
6 in hi, per unreached member.
⚠ The amount value is `formatCurrency(fixedAmount,'en')` MINUS its `₹ ` prefix (the fixed text carries `Rs` / `₹`) — one helper, tested.
⚠ Every text must pass `checkDltTemplateShape` and the tone guide (`docs/tone-guide.md`, `docs/tone-review-checklist.md`) —
non-coercive, ⛔ "must", ⛔ "penalty", ⛔ urgency beyond the push's band. Segment counts go in the DLT sheet's cost line (Task 5).

### PQ1 — for the Trustee Panel (written at Task 0.3 from the TEMPLATE, ⛔ blocking the build)

**In one sentence:** should a member who has NOT said yes to WhatsApp get a text when the app cannot reach them about their pool,
its deadline or their payment? **The one fact that decides it:** under the approved plan such a member hears NOTHING outside the app,
yet a cycle they miss still counts in their contribution record — and the members the app cannot reach are mostly the ones without
WhatsApp too. Options: **A** keep the plan (texts only after a WhatsApp failure — cost: almost nobody is ever texted); **B** widen to
any member the app and WhatsApp could not reach, for FS1's five notices only (cost: a new standing SMS spend at scale, ~3 texts per
unreached member per cycle; a change to the approved plan, as F7 was); **C** widen for pool-open and last-day only (cost: payment
problems still unheard). Our reading: **B**. Evidence (LAST, per the template): §3.4 + its annotation; RA-29; `-255` F7; epics 5.6 (c)
vs §3.4; F4 (the code already reaches them — falsely); TRAI's Service-Implicit category (a member's own-account notice needs ⛔
explicit consent — web sources, unverified against the regulation's text); the Terms draft cl.10 (⛔ SMS); `-375`'s open SMS-consent
line. ⛔ "Shown to the Panel" until SENT ([[feedback_shown_to_panel_means_sent]]).

## Acceptance Criteria

**AC0 — Governance before code (Task 0).** The author-commit decision (FS1–FS13 as answered; the §0 readings G1–G9; "Supersessions:
none"; what it does NOT cover) is committed ALONE before any record or code; the PQ1 note is written from the template and its SENT
state recorded truthfully; the records commit (epics.md entry, §3.4 annotation, roster row, DLT sheet section, deferred-work
annotations, ledger) follows ([[feedback_governance_commits_precede_implementation]]).

**AC1 — The registry is message-keyed and registrable (I1, I5; FS1, FS4).** `sms-dlt-registry.ts` holds one entry per (FS1 message ×
locale) with `contentTemplate`, `slots`, `version`, config key `sms.dlt.template_id.<message>.<locale>`; the five category entries for
messages ⛔ lit stay listed DARK (`whole_body_variable` or a new reason `no_sms_message`), so `claim_status_change` / `helpdesk_reply`
remain visibly unlit. Every lit entry passes `checkDltTemplateShape`; the CI gate `dlt-typed-variables` passes with the file still in
`REGISTRY_FILES`. *Legs:* a registry test over EVERY entry; a test that ⛔ broadcast message key exists.

**AC2 — Registered text = rendered text (I1, I6).** For each lit message and locale, the body sent equals the registered text with its
values substituted, rendered by the REAL `t()` over `contribution.json` ([[feedback_stub_must_call_not_transcribe]]); the DLT sheet row
(by config key — `sheetRowByConfigKey`, `expectRegisteredTextRow`) matches the registry text and its MSG91 `##name##` form; Hindi keys carry
the `$comment` NOT-YET-HUMAN-REVIEWED marker. *Legs:* one lockstep test per template; a parity test (every `sms.*` key in both catalogs).

**AC3 — Who receives it (I2; FS2, FS3, FS9).** Under FS2 as answered: a member with ⛔ WhatsApp target gets ⛔ SMS (rung
`skipped_no_target` / `sms_fallback_not_eligible`); a member whose WhatsApp was attempted and ended non-`sent` gets it (on the attempt FS9
names); a member whose WhatsApp ended `sent` gets ⛔ SMS. With FS3 (a), an enabled Pariwar with ⛔ approved WA template ends the WA rung
non-sent. *Legs:* the `contribution-notify.test.ts:263-274` trail is REWRITTEN to the ruled behaviour (⛔ deleted); each branch one test.

**AC4 — A real send, or an honest non-send (I3; FS6, FS12).** A lit SMS is sent through a per-send MSG91 provider with named values,
a CRQID of the new kind, the MG4 id check and the one process pre-flight; an unset id / gateway / malformed id ends the rung NON-sent
with a `config:` / `dlt_template_not_approved:` detail and ⛔ `sent`; ⛔ path a lit message takes reaches `createFixtureSmsProvider`.
*Legs:* the F18 dark-state tests replaced by tests of THIS behaviour (each states what it replaced).

**AC5 — Once per alert per member (I4; FS6).** A second attempt for an alert whose send row is begun sends ⛔ text; the delivery report
for the new kind is matched to its row. *Legs:* live-DB test on :5433 (separate transactions — [[project_db_clock_ordering_tests_tie]]).

**AC6 — Not a bulk channel (I5; FS7, FS10).** News / survey / moderation / staff `alert_published` and every bridged send carry ⛔ `sms`
block and reach ⛔ lit template; a bridged send's SMS rung ends non-sent `sms_bridge_not_lit`. *Legs:* one test per producer family; a
bridge test.

**AC7 — Language (FS5).** The SMS goes in the member's chosen language, else the Pariwar default; an unusable template for that
language falls to the other (if usable), else non-sent; `resolvePeerRequestLocale` delegates to the extracted read with its tests green.

**AC8 — Records and gates (FS11).** The roster row `member-alert-sms-fallback-live` exists with legs (a)–(e); the DLT sheet gains the
templates (next free ordinals), their wording section, types, MSG91 forms, cost lines (segments en/hi with the longest values), a
rejection-table line (*"the author's; Hindi under its review row"*) and a Record line; the TV6 section and Row 30 note (1) get DATED
annotations (⛔ rewritten); deferred-work: the 6.34 TV6 item *"being built — Closed by 5.11 on `done`"*, the 5.10-validate ladder item
per FS3, the 6.37b `correlationId` item, the two 5.6 items (FS12), LS11's item narrowed for SMS, a NEW bridge item (FS10); and, if PQ1
is still unruled at `done`, a NEW item carrying it.

**AC9 — Nothing else moves.** Push and WhatsApp copy, OTP, claim texts 1–14, Telegram, the cost-optimization toggle: unchanged; `pnpm
ci:local` green on :5433.

## Tasks / Subtasks

- [ ] **Task 0 — Governance (AC0)**
  - [ ] 0.1 Preflight: fetch; rebase onto `origin/main`; run the pin checks (header); re-run F1–F18. **STOP** if: **S1** a ruling on SMS
        reach exists already (grep `^### Decision` for *"transactional-fallback"* / *"SMS"* newer than `-388`); **S2** another worktree
        edits `contribution-notify*.ts`, `provider-composition.ts`, `sms-dlt-registry.ts`, `correlation.ts` or claims the next
        migration (`git worktree list`; ListAgents — [[feedback_shared_tree_branch_switch]]) — sequence per `-366` decision 6;
        **S3** the DLT sheet's ordinals moved; **S4** 0167's CRQID CHECK was replaced by a later migration; **S5** `sms_rate_buckets`'
        config numbers are not what FS8 assumed; **S6** a Pariwar's WhatsApp is enabled anywhere a deploy reads (FS2 (a) then has reach —
        tell BigDev).
  - [ ] 0.2 Put FS1–FS13 + the words (en + hi) + PQ1's options to BigDev; record answers VERBATIM in Debug Log (a). If the hi is
        approved in session, the roster leg (b) still says *"whether that discharges this leg is recorded here, ⛔ assumed"*.
  - [ ] 0.3 Write PQ1 from `trustee-panel-routing-note-TEMPLATE.md` (§0 first; `trustee-panel-routing-note-YYYY-MM-DD-5-11-sms-for-members-without-whatsapp.md`),
        run its E4 commands, record ⛔ sent until BigDev sends it. Stage the author-commit decision (next free id) in the scratchpad;
        commit it ALONE (`governance:` prefix) — try the decision-log write first ([[project_decision_log_writes_user_inserted]]).
  - [ ] 0.4 Records commit: `epics.md` `### Story 5.11` between 5.10 and 5.12 (5.10's format; Epic 5's "9 stories" lines left as they
        stand); §3.4 dated annotation under the fallback paragraph (FS2 as answered; PQ1 pending) — ⛔ rewrite; roster row; deferred-work
        annotations (AC8); ledger entry by SAFE prepend ([[project_sprint_status_safe_prepend]]) + row `ready-for-dev → in-progress`.
- [ ] **Task 1 — Registry + words (AC1, AC2)**: restructure `sms-dlt-registry.ts` (message × locale; keep `resolveDltTemplate(category)`
      semantics for the composition path ⇒ `null` for every category — the alert path stops using it); add `sms.*` en/hi keys; update the
      registry header comment (TV6 history kept, a dated 5.11 section); CI gate passes.
- [ ] **Task 2 — Contract + producers (FS7, FS13, AC6)**: optional `sms` block in `packages/contracts/src/alerts/alert.ts` payloads;
      populate it in the cycle-open, day-10, day-14, mismatch and pending-escalated builders from the SAME locals as the push params;
      pool-label fallback (FS13); amount helper (F10).
- [ ] **Task 3 — Eligibility + WA stand-in + window (FS2, FS3, FS9, AC3)**: the ONE predicate; the WA non-sent outcome for an enabled
      Pariwar; the attempt gate (pg-boss job's retry count reaches the fan-out via its deps).
- [ ] **Task 4 — The send (FS5, FS6, FS8, FS12, AC4, AC5, AC7)**: migration (next free number; sibling `when` order —
      [[project_sibling_migration_when_order_shared_db]]); CRQID kind in `correlation.ts` + pattern + the CHECK; delivery-report kind
      mapping; extract the member-language read; a per-send SMS provider for the alert rung (reuse `createSmsDltProvider`,
      `substituteDltValues`, `smsPreflight`; ⛔ a second copy of the claim core's result classification — extract what is shared, or call
      a narrowed core); the budget check.
- [ ] **Task 5 — Bridge guard + records (FS10, FS11, AC6, AC8)**: the guard + test; DLT sheet section (types, MSG91 form, segment counts
      computed from the real renders with the longest values) and Record; roster row text; deferred-work items.
- [ ] **Task 6 — Tests (AC1–AC9)**: replace F18's dark-state assertions (say what each replaced); RED proofs in Debug Log (b).
- [ ] **Task 7 — Verify**: `pnpm ci:local` with `DATABASE_URL` on :5433 ([[project_prepush_hook_inherits_5432]]; known failures —
      [[project_known_livedb_test_failures]]); review the diff before commit ([[feedback_review_the_fix_diff_before_commit]]); commit on
      the story branch ([[feedback_commit_on_story_branch]]); ⛔ push without BigDev's go-ahead.

## Dev Notes

### ⚠ TRAPS

- **T1 — Lighting the registry alone texts the wrong people** (F4) and still sends nothing (F3 Gate B). Both gates move together or not at all.
- **T2 — "Dark" lies.** The fixtures answer `accepted`. ⛔ test that a lit message "sent" via a fixture; AI-5-2's reject doubles exist for this.
- **T3 — `alert_published` is not "pool assignment"** (F6). Key SMS eligibility by the FS1 message, ⛔ by category — else news is texted (I5).
- **T4 — The bridge shares the rung** (F15). Without FS10's guard a degraded Pariwar is texted the pool-open words.
- **T5 — `₹` and `.`** (F10): `₹` turns English into Unicode (more segments); `"99.50"` is ⛔ numeric — the amount slot is alphanumeric.
- **T6 — The memoized resolver cannot carry values** (F3). Build the SMS provider per send; leave the memo for push / WhatsApp.
- **T7 — CRQID's SQL mirror** lives in 0167's CHECK — replace it in the NEW migration; ⛔ edit or regenerate an applied migration.
- **T8 — Contracts tests run outside tsc** — a REQUIRED field breaks fixtures silently; keep `sms` OPTIONAL.
- **T9 — A JSDoc with `**cl.3**`-style emphasis closes the comment** ([[project_markdown_emphasis_closes_jsdoc]]).
- **T10 — Hand-format** — Prettier is ⛔ enforced; ⛔ `--write` ([[project_prettier_not_enforced]]).
- **T11 — Type-only import cycles** between `claim-dlt-sms-send.ts` and new jobs modules crash at runtime, invisible to tsc
  ([[project_type_only_import_cycle_trap]]).
- **T12 — Don't edit a ratified word.** Templates 1–14 and their core are out of scope; the DLT sheet's procedure governs a rejection.
- **T13 — ESLint carve-out globs are cwd-relative** per package ([[project_eslint_config_per_package_cwd]]).

### Reuse map

| Need | Reuse | ⛔ |
|---|---|---|
| shape check, types | `dlt-variables.ts` (`DLT_VAR`, `DltSlot`, `checkDltTemplateShape`) | a new validator |
| named-value send, value proof | `createSmsDltProvider`, `substituteDltValues` (6.37) | sending a finished body |
| pre-flight | the ONE `smsPreflight` memo built in `boot.ts` | a second memo |
| CRQID | `formatSmsCorrelationId` + a new kind | a second grammar |
| member language | the read inside `resolvePeerRequestLocale` (extracted) | a copy |
| lockstep tests | `apps/jobs/tests/_dlt-template-sheet.ts` | re-parsing the sheet |
| budget | `checkAndConsumeSmsBudget` (5.6) | a new bucket |
| send row shape | the 6.27c ping CAS (begun once) | an in-memory dedupe |

### Testing standards

Vitest; live-DB tests on :5433 (separate transactions for DB-clock ordering); real `t()` for every copy assertion; one test per FS branch;
each replaced F18 test names what it replaced. The DLT sheet lockstep finds rows by config key.

### Project structure notes

Registry and render in `packages/channels/src/`; the send record + CRQID in `packages/domain` (schema + migration + `sms-delivery/`);
the fan-out and provider build in `apps/jobs/src/scheduler/`; copy in `packages/i18n/locales/{en,hi}/contribution.json`; records in
`docs/launch-gate-inventory/` and `_bmad-output/`. ⛔ pg-touching `@twt/domain` import into anything Metro bundles
([[project_contracts_domain_bundle_boundary]]).

### Sequencing

Other open worktrees at the pin: `11b-4-memorial-authorship-…`, `3-3c-member-kyc-name-english-only`, `6-36d-exclude-nominees-from-the-five`
(edits peer-mesh — overlaps FS5's extraction of `resolvePeerRequestLocale`; rebase onto whichever lands first). ⚠ 6-36d HOLDS migration
0180 (uncommitted at the pin — ledger `2026-10-23v`), so 5.11's is later than that; whichever commits second renumbers (`-366` decision 6). 6.31's rule that its reminder never goes through `dispatch()` stands — a
lit SMS rung would otherwise text the neighbours twice.

### Previous story intelligence

- **6.34** made the five DARK *"truthfully"* and named this row's §0 trigger (*"turn the alert SMS fallback ON with new wording for members"*);
  its CI gate and lockstep helpers are the scaffolding here.
- **6.37 / 6.37b**: MG12 is Gate B; MG4's 24-hex check; MG5 pre-flight; DR3 CRQID; *"`correlationId` is optional"* deferred to this row.
- **6.35**: LS8 (one language read), LS10 T-states, LS11's deferred item (this story narrows it for SMS), LS13's screen promise.
- **5.10**: F7b / SB9 (d) — the stand-in stops the ladder; *"name it to row 5-11's create-story"* — FS3.
- **5.6**: D1 already flagged the §3.4 vs epics (c) conflict; its two OPEN mirror defects (FS12, AI-5-5).
- **6.24b / 6.27c**: the per-message × locale registry and the begun-once send row — the shapes FS6 copies.

### Git intelligence

Recent `main` (to `d87d047a`): 6.35 landed (migration 0179, `preferred_locale`); 8.15 landed; ledger-only commits otherwise. Stories land by
fast-forward ([[feedback_land_prs_by_fast_forward]]).

### Latest tech information (fetched 2026-10-23)

- TRAI: ≥ 30 % fixed content and pre-tagged variables (Direction of 12 May 2023); typed variable tags + URL/APK/OTT/CBN whitelisting and a
  logger-mode phase-in (Direction of 18 Nov 2025); TCCCPR 2nd Amendment (12 Feb 2025) — Service messages to a sender's own customers need
  ⛔ explicit consent (Service-Implicit); MSG91 files transactional content under Service-Implicit. One template ↔ one header (TRAI PR 60/2024).
  Per-variable limit 30 vs 40 is still Row 30 (d)'s open question — FS4 uses ≤ 30. ⚠ The consent reading rests on secondary sources; the
  PQ1 note says so.

### References

- `_bmad-output/planning-artifacts/architecture.md` §3.4 (`:2115-2119`, `:2318-2331`); PRD `prds/prd-TWT-2026-05-22/addendum.md` RA-29, `prd.md` §4.10.
- `.decision-log.md`: `-255` F7, `-313` TV6, `-345` MG12, `-347`, `-349`, `-375`, `-385`, `-387` (by id, ⛔ line).
- `packages/channels/src/{sms-dlt-registry,dlt-variables,dispatch,cascade,render}.ts`; `composition/provider-composition.ts`; `providers/`.
- `apps/jobs/src/scheduler/{contribution-notify,contribution-notify-triggers,claim-dlt-sms-send,contribution-providers}.ts`.
- `packages/domain/src/{notifications/delivery.ts,sms-delivery/correlation.ts,claim/peer-mesh-request.ts,sms-rate-limit/buckets.ts}`.
- `docs/launch-gate-inventory/{dlt-template-requests-6-19.md,inventory-roster.md}` (Rows 30, 32, 38).
- Stories `6-34-…`, `6-37-…`, `6-37b-…`, `6-35-…`, `5-10-…`, `5-6-…` in `_bmad-output/implementation-artifacts/`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

(a) Task 0.2 answers, verbatim · (b) RED proofs · (c) parity / lockstep / CI-gate outputs · (d) dev-DB side effects · (e) Task 0.1 preflight

### Completion Notes List

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-23 | v1.0 | Created by `bmad-create-story 5.11` (pinned `d87d047a`). FS1–FS13 + PQ1 PROPOSED; words drafted (en + hi, hi un-reviewed). Ultimate context engine analysis completed — comprehensive developer guide created. |
