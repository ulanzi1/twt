---
baseline_commit: 6c4c1e47
---

<!--
PINNED: 6c4c1e47 (origin/main, "story(5.11): ledger 2026-10-24 — LANDED on main by fast-forward"). Branch
`story/5-11b-alert-sms-real-send`, worktree `.claude/worktrees/5-11b-alert-sms-real-send`.

Two facts, kept apart (footgun #24): (1) the PIN is valid iff `git merge-base --is-ancestor 6c4c1e47 HEAD`; (2) the FOUND FACTS
are valid iff `git diff --name-only 6c4c1e47..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory` is EMPTY
or every changed path is re-checked against the F it touches. Re-run BOTH at Task 0.1.

STATUS: 2026-10-24 created (`bmad-create-story 5.11b`) → ready-for-dev. FS5, FS6, FS8, FS9, FS12 (carried from 5.11) and FS17–FS23
(new) are PROPOSED; BigDev answers them at Task 0.2. ⛔ code before Task 0.3's decision is committed.

WHAT 5.11 LEFT: Story 5.11 (`done`, landed `7489a296`) decided WHAT is texted (three notices × hi / en, templates 17–22), to WHOM
(`-390` Q1 B), in WHICH words, and made the rung HONEST: a lit, eligible member ends `skipped_no_target` / `sms_send_not_wired`.
This story replaces `sms_send_not_wired` with a REAL send. Its starting facts were 5.11's "Carried to 5.11b" section — every one
re-verified at this pin (four read-only verifiers, 2026-10-24); corrections are marked ⚠ CORRECTED.

NUMBERS (footguns #19 / #42(e); `-366` decision 6 — the number belongs to the first COMMIT that takes it on any branch): found AT THE
TIME OF USE, never planned here. At the pin: decision — main's highest `-394`, but `-391`–`-393`, `-395`, `-398` are held by the
11b-4 worktree and `-396` / `-397` by the 6-36e worktree ⇒ the next free was `-399`. Migration — main's highest `0180`; BOTH the 11b-4
worktree (`0181_memorial-authorship.sql`) and the 6-36e worktree (`0181_member-nominee-links.sql`) hold a `0181` with the SAME
journal `when` `1795146000025` ⇒ the next safe at the pin was `0183` with a `when` strictly above every sibling's
([[project_sibling_migration_when_order_shared_db]]). Roster — highest `### Row 40` (11b-4 plans 41); 5.11b adds ⛔ row. DLT sheet —
highest template #22; 5.11b adds ⛔ template. The CRQID kind — two letters not in `cr ce sn pm ot` (FS22 proposes `as`).

§0 GATE (trustee-panel-routing-note-TEMPLATE.md) — readings. ⭐ None of FS5–FS23's RECOMMENDED options is the Panel's; the options
marked "Panel's" below are NOT recommended and, if chosen at Task 0.2, STOP the story for a routing note.
  G1  `-390` Q1 B (Trustee-ratified): *"any member the app (and WhatsApp, where used) could not reach"* gets the three texts. 5.11b
      changes ⛔ reach — MATCH. The predicate `isAlertSmsFallbackEligible` is read, ⛔ edited.
  G2  architecture §3.4 (`architecture.md:2318-2324`), ratified via `-065`: *"WA delivery returns undelivered after the committed retry
      window (3 attempts × exponential backoff)"*. `-390` superseded §3.4 IN PART — the sentence excluding members without a WhatsApp
      yes — and ⛔ the window clause. ⇒ FS9 (a) (wait for the window when WhatsApp is used) MATCHES; FS9 (b) (never wait) NARROWS a
      ratified clause ⇒ the Panel's. For a member with no WhatsApp target the window has nothing to wait for (5.11's carry) — MATCH.
  G3  `-387` LS10 (c) (author-commit, citing it as the Panel's): sending a member who chose one language the TEXT in the other language
      because that template is unusable *"narrows G1 … the Panel's, ⛔ taken"*; `-385` (Trustee-ratified) allowed the Pariwar's language
      ONLY for the two-day WhatsApp reminder. ⇒ FS5 (a) (the member's language, else ⛔ text) MATCHES; FS5 (c) EXTENDS `-385` ⇒ the Panel's.
  G4  `-387` LS13 — the language screen tells the member *"Some messages from the Trust (SMS and WhatsApp) will also come in this
      language."* FS5 (a) keeps that promise for these three texts; LS11's deferred item is discharged FOR THEM (push stays as listed).
  G5  `-390` "Not covered": *"the price per text and any per-member budget — Story 5.11b, recorded when priced"*. ⇒ the budget (FS8) is
      the AUTHOR'S, delegated by the ruling. ⚠ A cap that stops a text the ruling owes is a NARROWING of `-390` ⇒ FS8's cap sits ABOVE
      every legitimate per-day count (FS8's rule) — a flood guard, ⛔ a rationing rule.
  G6  `-345` MG12 (author-commit): *"the alert dispatch path stays DARK: a send with ⛔ named values is refused locally
      (`no_named_values`)."* FS12/MG12 change (zero-slot templates sendable) supersedes it IN PART — the author's (Task 0.3).
  G7  `-347` DR3 (author-commit): CRQID = two-letter kind + the send row's uuid, *"defined once, in `@twt/domain`"*; DR12: the silence
      alarm covers *"accepted SMS sends finalised between 48 hours and 7 days earlier that have no report"*. FS22 MATCHES both.
  G8  `-394` items 1–3 (author-commit): item 1's retry rule, item 2's pool-value rule, item 3's accepted residual (*"carried to 5.11b,
      whose real send and retry window re-decide it"*). FS9 / FS21 / FS17 supersede them IN PART — the author's (Task 0.3).
  G9  `-349` decision 1 (as `-389` item 7 applies it to templates 17–22, Row 40 (a)): *"⛔ id set before its template is approved"*. ⇒ at
      merge NO id is set ⇒ no text is sent in production until Row 40 (a) closes (day-one output below). MATCH.
  G10 Consent to these texts — counsel's, roster Row 40 (f) (`-390` "Not covered"; `-375`'s *"any SMS consent (row 5-11)"*). A
      GO-LIVE leg, ⛔ a build question; 5.11b neither answers nor routes it ([[project_not_in_production_merge_is_not_golive]]).
  G11 Cost-optimization vs `-390` (5.11 D4 (b), deferred-work "second full review") — CARRIED unchanged: 5.11b keeps the rung's order
      (`cost_optimized` first) and does ⛔ touch the toggle (hard-coded `false`).
  G12 Quiet hours — ⛔ ratified rule for any member SMS (grep of `architecture.md`, `.decision-log.md`); the 09:00–20:00 IST windows of
      the peer-mesh sends (`claim-peer-mesh-requests.ts:12`) and WS6 are AUTHOR-commits ⇒ FS23 is the author's.
  NOT covered by any ruling: the price per segment (Row 40 (d)); counsel's view (Row 40 (f)); quiet hours for member SMS (FS23).

GLYPH REGISTER: ⛔ marks a prohibition at the START of a bullet or clause only — inside a sentence this file writes "not" / "never".
⭐ = recommended / load-bearing; ⚠ = trap or caveat. `.decision-log.md`, `deferred-work.md` and `sprint-status.yaml` are NEVER cited
by `file:NNN` (newest-first prepends move every line).

LETTERS: F = found facts (this story's own, numbered fresh) · FS = build decisions — FS5 / FS6 / FS8 / FS9 / FS12 KEEP 5.11's names
(the epics entry and `-389` cite them); new ones start at FS17 (5.11 used FS1–FS16) · I = invariants · T = traps · S = Task 0.1 STOP
conditions. G = §0 readings (above).
-->

# Story 5.11b: The Real Alert SMS Send — the Three Contribution Texts Actually Go, Once, in the Member's Language, After WhatsApp's Window, Under a Flood Guard `[CONSUMER]`

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 5.11 decided that a member the app (and WhatsApp, where used) cannot reach gets a
> text for three notices about their own contribution — day 10 *"not recorded yet"*, payment not matched, payment still not confirmed
> — wrote the words (templates 17–22), and made the SMS rung honest: today a lit, eligible member ends `sms_send_not_wired` and
> nothing is sent. This story makes that rung SEND: through MSG91 (the 6.37 adapter, its pre-flight and 24-hex template ids), with a
> durable send record per (alert, member, occasion) so a text goes at most once, a delivery-report correlation kind so its report
> matches, the member's own language, a per-member flood guard, §3.4's WhatsApp retry window, MG12's zero-variable change (the
> "payment not matched" text has no variable), and `dispatch`'s lifecycle-suppression boundary restored. It adds ⛔ new words,
> ⛔ new templates and ⛔ new reach.
>
> **Day-one output: still no SMS in production — now because the IDS are unset, ⛔ because the code cannot send.** Row 40 (a) forbids
> setting `sms.dlt.template_id.contribution.<message>.<locale>` before the template is approved (G9), and no Pariwar has WhatsApp on.
> On merge, an eligible member's rung ends `skipped_no_target` / `config:dlt_template_id_missing:<locale>` — terminal, recorded
> `in_app_only`, ⛔ alarm, ⛔ send row (FS17) — the same retry profile as 5.11. The first real text needs Row 40 (a) + Row 32's gateway
> legs; Row 40 (e) (a real text on a device from staging) becomes observable for the first time.
>
> **What already ships and this story REUSES:** the MSG91 adapter (`createSmsDltProvider`, `sms-app.ts` flow client), the pre-flight
> memo (`createMsg91PreflightMemo`), `formatSmsCorrelationId`, `substituteDltValues`, the claim send core's checks
> (`claim-dlt-sms-send.ts`), the delivery-report pipeline (0167, `reports.ts`, the correlator, the silence alarm), the 5.11 registry
> (`contribution-sms-templates.ts`, `renderContributionSms`, `smsPoolLabel`), the 5.11 predicate and rung, `checkAndConsumeSmsBudget`
> (0049), the `includeMetadata` retry-count precedent.
>
> **What it CHANGES:** one migration (a send table; the two 0167 kind CHECKs replaced); `correlation.ts` + its mirrors; `reports.ts`
> (LOOKUP, silence counts) + the correlator + `sms-delivery-silence.ts`; the claim send core split into a generic DLT core + the claim
> wrapper (FS17); MG12 in `sms-dlt.ts` and `sms-app.ts`; `contribution-notify.ts` (the SMS rung's send seam, `shouldRetryFanOut`, the
> recorded details); `contribution-notify-triggers.ts` (per-member language for the `sms` block, the attempt number down the call
> chain, `includeMetadata` on the POOL_BATCH and MISMATCH workers); `boot.ts` (the pre-flight built before the contribution deps; the
> SMS deps passed; the bucket vacuum wired); `smsPoolLabel` (FS21); the WhatsApp memo's `off` state (FS20); records; tests.
>
> **What it READS and leaves alone:** the three texts' words, `contribution.json`, templates 1–22 and the DLT sheet's rows; the reach
> predicate `isAlertSmsFallbackEligible`; push / WhatsApp / Telegram copy and their language; the OTP path; claim behaviour (templates
> 1–14 send exactly as before — FS17's proof); the cost-optimization toggle (G11); the degraded-mode bridge (dark — row `5-8b`).

## Story

As a **member whose phone the Trust's app cannot reach**,
I want **the text about my own contribution — day 10 not recorded, a payment not matched, a payment still not confirmed — to
actually arrive, once, in the language I chose in the app**,
so that **a cycle does not count against me only because a push notification never arrived** (`-390` Q1 B).

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-10-23-390` Q1 B (Trustee-ratified) | *"Widen it for these three notices — any member the app (and WhatsApp, where used) could not reach."* Cost as put: *"about 1 SMS part per unreached member per cycle in English, 2 in Hindi … plus 1 / 2 per payment problem"*. Not covered: *"the price per text and any per-member budget — Story 5.11b, recorded when priced"*; consent — counsel's (Row 40 (f)). | RATIFIED — G1, G5, G10 |
| Architecture §3.4 (`architecture.md:2318-2324`; annotations `:2326-2349`) | *"… WA delivery returns undelivered after the committed retry window (3 attempts × exponential backoff) … Fallback fires per message, not per cohort."* The 2026-10-23 `-390` annotation: superseded IN PART for these three (the no-WhatsApp exclusion); *"⛔ A bulk-alert channel (RA-29)"*. | ratified via `-065` — G2 |
| `2026-10-23-389` (author-commit) | item 7: Row 40, *"No id is set before its template is approved"*; item 10: *"a lit, eligible member ends `sms_send_not_wired` until 5.11b"*; item 12: the Hindi review discharges Row 40 (b) for the three strings as worded. "Not covered": *"the real send — language, send record, budget, retry window, the 5.6 defects (row `5-11b-alert-sms-real-send`)"*. | BUILT (5.11) |
| `2026-10-23-394` (author-commit) | item 1: unsent ⇒ `in_app_only`, ⛔ retried, ONLY where the old fixture completed the member; item 2: `{pool}` trimmed, ≤ 30 UTF-16 units, ⛔ `\p{Cc}`, en basic GSM-7 only; item 3: an SMS-rung render / HMAC failure no longer retries — *"carried to 5.11b, whose real send and retry window re-decide it"*. | BUILT (5.11) — G8 |
| `2026-10-17-345` (author-commit) | MG4: 24-hex template ids, else `template_id_malformed`; MG5: ONE pre-flight memo per jobs process (pass 1 h, fault 5 min); correction / closure / certificate send on an UNPROVEN fault; MG12: alert path dark (`no_named_values`). | BUILT (6.37) — G6 |
| `2026-10-18-347` (author-commit) | DR3: CRQID = kind + row uuid (34 chars) inside the recipient; *"defined once, in `@twt/domain`"*; DR6: report retry schedule up to 72 h; DR12: the silence alarm (48 h – 7 d, accepted, no report). | BUILT (6.37b) — G7 |
| `2026-10-23-387` LS10 / LS11 / LS13 (author-commit); `2026-10-23-385` (Trustee-ratified) | LS10 (b): a TEXT whose language's template is unusable WAITS / stays unsent; LS10 (c) (the other language for a TEXT) *"the Panel's, ⛔ taken"*; LS11: other senders keep their language until *"a story or ruling that sets a language rule for that message"*; LS13's screen promise. `-385`: the WhatsApp reminder only may fall back to the Pariwar's language. | G3, G4 |
| `2026-10-19-366` decision 6 | *"the number belongs to the first COMMIT that takes it on any branch"* | numbering |
| Roster Row 40 `member-alert-sms-fallback-live`; Row 32 `sms-gateway-msg91-provisioned`; Row 30 note (1) / leg (d) (`inventory-roster.md`) | Row 40 (a)–(f) (templates 17–22 approved + ids; Hindi reviewed; Row 30 (d) answers incl. *"a template with no variable"*; price; *"a real alert SMS received on a device from staging (needs row 5-11b)"*; counsel). Row 32 (b), (d), (e), (g) are not scoped to claim texts. | open — go-live, ⛔ build |

## ⭐ THE INVARIANTS

- **I1 — A text goes at most once per (alert, member, occasion).** The send record's UNIQUE key is the keyed store's own scope
  (`day_10`, `pending_match_escalated`, `mismatch:<reason>` — F4), so a job retry, a sweep re-run, a keyed-store TTL expiry or two
  workers can never send the same notice twice. A row found `accepted` counts as `sent` WITHOUT a send. *Proof:* AC3.
- **I2 — Sent body = registered text with the member's values, byte for byte.** The body rendered through the real `t()`
  (`renderContributionSms`) equals `substituteDltValues(registeredText, slots, values)`; the template id is the one for the BODY'S
  locale. (5.11's I1, now enforced at send.) *Proof:* AC2.
- **I3 — ⛔ text in a language the member did not get by rule** — the member's chosen language, else their Pariwar's default; never the
  other language because a template is missing (G3). *Proof:* AC5.
- **I4 — The SMS rung respects `dispatch`'s lifecycle-suppression boundary** (5.11's DELIBERATE block, `contribution-notify.ts:372-380`).
  *Proof:* AC2 (a suppressing hook ⇒ ⛔ gateway call).
- **I5 — Every non-send names its reason** in the recorded trail (an allow-listed detail, never provider error text), and only the
  ONE retryable class (FS9's window wait; a definite transient non-send) puts a member back on the retry set. *Proof:* AC4.
- **I6 — Reach is unchanged.** `isAlertSmsFallbackEligible` and `alertSmsBlock` are byte-unchanged; no broadcast can reach a template
  (5.11's I5). *Proof:* AC8 (a source pin) + 5.11's tests green unchanged.
- **I7 — Claim texts unchanged.** Templates 1–14 send exactly as before FS17's split — every claim send test passes UNEDITED. *Proof:* AC7.

## 📜 Policy meaning (AI-10-1)

**5.11b adds conjuncts to the predicate that decides whether a member is TOLD, by text, about their own contribution** (5.11's
predicate gates no benefit itself, but a missed cycle counts under R7's lapse ladder and R8's ninety-percent rule — 5.11's Policy
meaning). In the member's terms: *"If the app — and WhatsApp, when your Pariwar uses it and three tries have failed — cannot reach
you about your own contribution, the Trust sends you the text once, in the language you chose in the app (or your Pariwar's language
if you never chose); if that text cannot be sent in your language you are not texted in the other one, and a fault that would text you
far more often than these notices ever could is stopped."* **Niyamavali check — done, with this result:** no clause names SMS
(`grep -i sms packages/domain/seed/niyamavali-v1-clauses.sql` — empty at the pin; 5.11's check of the rulebook, its FR mapping and both
amendment drafts stands); R10(B) makes the in-app surface the official channel and the member responsible for missed information ⇒
every conjunct here is CONSISTENT with the Niyamavali as written. The conjuncts are bounded by G2 / G3 / G5 so that none drops a text
`-390` owes — FS8's rule is the one that could, and it is set above every legitimate count for that reason. (The Niyamavali is a
rulebook, not a ratified spec — [[feedback_niyamavali_rulebook_not_spec]].)

## ⭐ FOUND FACTS (at `6c4c1e47` — re-run each at Task 0.1)

**The rung as 5.11 left it**
- **F1 —** `fanOutAlert` (`apps/jobs/src/scheduler/contribution-notify.ts:313-460`): bridge (`:343-346`) → cost-opt (`:350-367`; in `rung`
  `suppressed.has(channel)` ⇒ `cost_optimized` at `:400` BEFORE `if (channel === 'sms') return smsRung()` at `:401`) → `runChannelCascade`
  with `backoffMs: []` (`:414-418`). `smsRung` (`:381-394`): bridged ⇒ `sms_bridge_not_lit`; no block ⇒ `sms_message_not_lit`; predicate
  false ⇒ `sms_fallback_not_eligible`; `!ctx.targets.sms` ⇒ plain `skipped_no_target`; else `skipped_no_target` / `sms_send_not_wired`
  (`:393`). `SMS_RUNG_DETAIL` `:175-184`; `RECORDED_RUNG_DETAILS` `:190-194` (only allow-listed details persist); `serializeFanOutResult`
  `:198-211`; `isAlertSmsFallbackEligible` `:220-229`; `alertSmsBlock` `:232-240`. The DELIBERATE block `:372-380`: *"⛔ Row 5-11b must NOT add
  a send here without restoring that boundary — send through `dispatch`, or apply the same suppression hook first"*.
- **F2 — DB-free by contract** (`:142-143`): `MemberFanOutContext` (`:144-150`) is resolved by `resolveMemberDeliveryContext` (`:247-270`,
  one `Promise.all` of push / WA / SMS / Telegram targets + last engagement; ⛔ language). `ContributionNotifyDeps` (`:109-130`) has
  ⛔ SMS client, config resolver, pre-flight or locale. ⇒ the send arrives as an INJECTED seam.
- **F3 — the retry rule** `shouldRetryFanOut` (`:535-544`, doc `:526-534` *"Revisit when 5.11b wires a real SMS provider and its retry
  window"*): delivered ⇒ no; bridged ⇒ retry iff no SMS target; an unsuppressed SMS target ⇒ ⛔ retry (terminal `in_app_only`); else
  retry unless WhatsApp ended `rejected` with an FS3 refusal detail. `fanOutAlertToMembers` (`:557-588`) runs members ONE AFTER ANOTHER;
  a throw is alarmed and retried (`:576-584`). ⚠ When `rung()` throws, `runChannelCascade` records `error` (`cascade.ts:127-131`) and
  `rungOutcomes.set` (`:410`) is skipped ⇒ the predicate reads `undefined` ("not sent").

**Occasions, producers, workers**
- **F4 — the alert id is PER CYCLE; the OCCASION is the scope.** `idempotencyScope` (`contribution-notify-triggers.ts:656-660`):
  `day_<N>` / `pending_match` / `pending_match_escalated` / `cycle_open`; confirmed `'confirmed'` (`:1310`); mismatch
  `` `mismatch:${p.reason}` `` (`:1381`). Key `contribution.notify:<alert>:<member>:<scope>` (`memberKey`, `:662-664`). TTL 300 s (`:108`;
  pending-match 30 days, `:138`) and even completed keys are vacuumed ⇒ the keyed store is ⛔ a durable once-only guard for SMS.
  ⚠ CORRECTED: 5.11's carry said *"one row per (alert, member), UNIQUE"* — that key would collide day 10 with the escalated notice
  and every mismatch reason. The occasion is part of the key.
- **F5 — the three lit producers** build `sms: { message, locale, values }` with `locale = deps.locale ?? DEFAULT_LOCALE` (`:698`,
  `:1307`, `:1378` — one per JOB, ⛔ per member): day 10 `buildDeadlineReminderAlert` (`:338-377`, `cycleDay === 10` at `:366-374`,
  `values: { pool: smsPoolLabel(identity, locale), date }`); escalated `buildPendingMatchRetryAlert` (`:387-414`, `:409-411`); mismatch
  `buildContributionMismatchAlert` (`:449-474`, `values: {}` at `:471`). The alert is REBUILT per member per attempt — `alertFor(memberId)`
  (`:789-`) closes over the pool `identity` resolved once per job (`:727`); ⛔ alert payload is persisted for re-use. ⇒ a per-member
  locale can be applied AT THE PRODUCER with ⛔ contract change.
- **F6 — workers.** POOL_BATCH `boss.work(…, { localConcurrency: 8 /*:103*/ })` (`:1441-1453`); CYCLE_OPEN `:1456`, CONFIRMED `:1472`,
  MISMATCH `:1488` — ⛔ `includeMetadata` anywhere; handlers pass only `job.data`. Retry: `CHILD_RETRY_LIMIT = 4` (`:112`),
  `CHILD_RETRY_DELAY_SECONDS = 60` (`:113`), `retryBackoff: true` (CONFIRMED `:528-530`, MISMATCH `:557-559`, POOL_BATCH `:583-585`) ⇒
  5 runs, `retryCount` 0…4. Chain: `runContributionNotifyChild` (`:675`) → `fanOutAlertToMembers` (`:849`) → `fanOutAlert`. A retried
  member's claim is released and the job throws (`:855-865`, `:891-898`; CONFIRMED `:1337-1347`, MISMATCH `:1401-1411`). One `deps` object
  is shared by every worker and up to 8 concurrent POOL_BATCH jobs ⇒ the attempt is a PER-CALL parameter.
- **F7 — `includeMetadata` precedent** (pg-boss `12.19.1`, `apps/jobs/package.json:31`): `claim-contact-ladder-whatsapp.ts:660-668`
  (`job as Job & { retryCount?, retryLimit? }`, type-guarded; final-attempt rule `:408`); `claim-correction-reminders.ts:145-150,
  :1491-1500`; a test asserting the registration option: `claim-correction-control-paths.test.ts:565`.

**The send machinery**
- **F8 — the provider and MG12.** `createSmsDltProvider(deps)` (`packages/channels/src/providers/sms-dlt.ts:66`; deps `:37-45` —
  `messaging`, `dltTemplateId`, `values?`, `correlationId?`); MG12 at `:72-81` refuses `values === undefined || values.length === 0`
  ⇒ `rejected` `dlt_template_not_approved:no_named_values` before any call; accepted `:84-89`; any throw ⇒ `rejected` with
  `<errorClass>:<code>` (`:90-101`); never `not_implemented`. ⚠ NEW: the MSG91 client refuses empty values A SECOND TIME
  (`packages/channels/src/providers/sms-app.ts:335`, `localRefusal` `:331-351`); the flow body (`:315-325`) is
  `{ template_id, short_url:'0', recipients:[{ mobiles, <name>:<value>…, CRQID }] }`; `to` must be canonical E.164 (`:391-394`,
  `invalid_number:format`); 9 s client timeout (`:189`). Tests: `packages/channels/tests/sms.test.ts:89-103` (MG12, both forms),
  `:552-554` (client).
- **F9 — the claim send core** `sendClaimDltSms` (`apps/jobs/src/scheduler/claim-dlt-sms-send.ts:263-383`): `correlationIdOrCrash`
  (`:154-166`, requires a kind in the private `CLAIM_SEND_ROW_KINDS` `:148`) → template id + HELPLINE resolved (`:279-291`) → blank id
  ⇒ `config:dlt_template_id_missing`, blank helpline ⇒ `config:helpline_number_missing` — UNCONDITIONALLY, even for a template with no
  helpline slot (`:292-297`) → `isConfigured()` (`:298`) → `isMsg91TemplateId` (`:303`) → render (`:309`) → private `checkedValues`
  (`:199-220`: exact slot names, strings, length ≤ `maxLength` in CODE POINTS — `helpline` exempt — and the rebuilt body byte-equal to
  the rendered body) → pre-flight (`:316-337`, `preflightFailOpen`) → provider built PER SEND (`:340-351`) → `beforeSend` (`:353-357`) →
  send under a 10 s timeout (`:358-382`). Result (`:90-105`): `final` (`accepted` | `rejected_invalid_number` | `rejected_unreachable` |
  `error` + `alarm`) or `transient` (`rate_limited` / `api_unavailable`, incl. `api_unavailable:timeout`). It writes ⛔ row and never
  alarms (`:9`). ⇒ it CANNOT serve the alert texts as is (the helpline). ⚠ `:211` names `fitsDltAlphanumeric`, which does not exist.
- **F10 — the pre-flight** (`packages/channels/src/providers/sms-preflight.ts`): `checkMsg91Template` (`:108-158`, never throws;
  `content_mismatch` / `sms_type_needs_unicode` / `dlt_id_missing`); `createMsg91PreflightMemo` (`:190-242`, key
  `templateId \0 text \0 slotNames`, TTLs `:180-182`). Built at `apps/jobs/src/boot.ts:646-661` ONLY if `smsAppClient.isConfigured()` —
  AFTER `contributionNotifyDeps` (`:623-633`) and its registration (`:634`); `claimCorrectionDeps` (`:662-673`) carries `smsAppClient`,
  `resolveConfig: resolveSmsDltConfig`, `smsPreflight`. `contributionNotifyDeps` is reused by news (`:744`), survey (`:753`), moderation
  (`:760`). Clients: `contribution-providers.ts` (`smsAppClient` `:256`; `resolveSmsDltConfig` `:128-139` — Secret Manager per call,
  `null` on NOT_FOUND).
- **F11 — `dispatch`** (`packages/channels/src/dispatch.ts`): `DispatchDeps` (`:99-116`) take a per-call `providers?` registry, a
  `suppression?` hook (`:109`; default `noLifecycleSuppression` `:91`) and a `render?` override (`:115`); the hook runs once per
  dispatch (`:227-235`) and per channel (`:294-296`) ⇒ `suppressed`; the rendered HMAC (`:343-348`) — a throw makes the attempt `error`
  WITH the provider result kept; `alert.channel_send` audit (`:349-358`); `accepted`→`sent` (`:163-172`). ⛔ dispatch carries values ⇒ a
  per-send registry holding a values-bound provider + a render override is the way to send a DLT body through it.

**The send record and the report pipeline**
- **F12 — CRQID.** `SMS_CORRELATION_KINDS = ['cr','ce','sn','pm','ot']` (`packages/domain/src/sms-delivery/correlation.ts:21`),
  `SmsSendRowKind` (`:27`), pattern (`:30`), `formatSmsCorrelationId` (`:42-51`, a dashed uuid row id). SQL mirrors: 0167 `:50`
  (`sms_delivery_report_inbox_crqid_check`, five prefixes) and `:91` (`sms_send_deliveries_send_kind_check`, four); schema mirrors
  `schema/sms_send_deliveries.ts:13` (`SMS_SEND_KINDS`, "LOCKSTEP") / `:41`, `schema/sms_delivery_report_inbox.ts:47`. ⛔ migration
  0168–0180 touches either CHECK. Picked up by pattern (⛔ list): the webhook (`msg91-sms-reports.ts:117-118`), the client (`sms-app.ts:347`).
- **F13 — per-kind code.** `LOOKUP` (`packages/domain/src/sms-delivery/reports.ts:210-215`, `Record<SmsSendRowKind,…>` — tsc forces an
  entry; each returns `pariwar_id`, `outcome`, `provider_message_id`, `purpose` by PK; `sn` / `pm` return `NULL::text AS purpose`);
  `countSilentSmsSends` (`:317-340`, row type `:325`, four subqueries); `apps/jobs/src/sms-delivery-silence.ts:37, :52, :54, :59`; the
  correlator (`apps/jobs/src/sms-delivery-correlator.ts:29, :118, :130, :133-136, :138-140` (`pm` only), `:142-144` (attempting ⇒ retry),
  `:149-160` (`other_attempt`)); `claim-correction-reminders.ts:218`. Tests enumerating kinds: `packages/domain/tests/sms-delivery/
  correlation.test.ts:78-79, :86`; `packages/channels/tests/sms.test.ts:591`; `packages/domain/tests/integration/rls/
  sms-send-deliveries-policy-regression.spec.ts:175, :180`; `…/sms-delivery-report-inbox-policy-regression.spec.ts:208-209`;
  `apps/jobs/tests/claim-correction-send.test.ts:705`.
- **F14 — row precedents.** Peer mesh (0156; `packages/domain/src/claim/peer-mesh-request.ts` begin `:380-509`, finalise CAS `:550-578`,
  transient `:584-599`; a crashed `attempting` row is RE-SENT after a 10-min lease under the same CRQID — at-least-once, alarmed).
  Suspicion notices (0151 / 0155; `suspicion-notice.ts` begin `:715` — `INSERT … ON CONFLICT DO NOTHING` under a lock, finalise `:870`,
  transient `:907`; UNIQUE `(pariwar_id, claim_case_id, purpose)`; column-narrowed INSERT / UPDATE, ⛔ DELETE; a freeze trigger for
  finished rows). ⛔ precedent is at-MOST-once.
- **F15 — the keyed store cannot be the record** (`packages/domain/src/idempotency/keyed-store.ts`; `idempotency_keys`, 0012): ⛔ uuid
  row id, ⛔ `pariwar_id`, ⛔ outcome / provider id, TTL-deleted, `pending|completed` only. It stays the per-member CLAIM beside the record.
- **F16 — the budget** `checkAndConsumeSmsBudget(db, { memberKey, windowMs, maxPerWindow, now })` (`packages/domain/src/sms-rate-limit/
  buckets.ts:21-31, :51-54`): ALWAYS increments (even over budget); `sms_rate_buckets` (0049, global `USING(true)`); vacuum
  `deleteExpiredSmsRateBuckets` (`:82`) *"NOT wired to a job"*; ⛔ production caller; ⛔ configured number anywhere.

**Language, targets, WhatsApp**
- **F17 — language.** `getMemberLanguage` (`packages/domain/src/member/preferred-locale.ts:53-71`) — 2 queries, THROWS on a missing
  passport / member; only caller `apps/api/src/modules/member-language/handlers.ts:51`. Set-based `COALESCE(m.preferred_locale,
  pp.locale_default)` exists (`peer-mesh-request.ts:854, :907`; `peer-mesh-wa-reminder.ts:758-778`). `members.preferred_locale`
  nullable (`schema/members.ts:149`); `pariwar_passport.locale_default` NOT NULL (`schema/pariwar_passport.ts:86`).
- **F18 — targets.** `resolveSmsTarget` (`packages/domain/src/notifications/delivery.ts:157-176`): ⛔ opt-in gate; decrypt in try/catch
  (`:166-175`) ⇒ `null`; ⛔ E.164 check (the client's `normalizeMobile` catches a bad `to` — F8). `resolveWaTarget` (`:116-149`) re-reads
  `enabled` + `isOptInActive` per member.
- **F19 — the WhatsApp memo.** `createContributionProviderResolver` (`packages/channels/src/composition/provider-composition.ts:447-502`)
  memoizes per `` `${pariwarId} ${category}` `` (`:453`) for the process; `readWhatsappProvisioning` (`:99-133`) ⇒ `off | refused | ready`;
  doc `:432-436`: a Pariwar memoized `off` keeps the ACCEPTING fixture after WhatsApp is switched on, while the target is re-read live ⇒
  `whatsapp:sent` with nothing sent — and, once SMS is real, ⛔ text either (5.11 deferred-work W1, *"Re-trigger: 5.11b"*).

**Migrations and tables**
- **F20 — migrations** live in `packages/domain/migrations/`, journal `meta/_journal.json` (last: idx 180, `0180_peer-mesh-request-
  peer-is-nominee`, `when` `1795059600024`; spacing +86 400 001). `0140` is missing (historical — ⛔ reuse). Snapshots stop at `0020`;
  later migrations are hand-authored (⛔ `db:generate`). No gate checks numbering. Tests do not migrate: `pnpm db:migrate` against
  `DATABASE_URL` first (`scripts/ci-local.sh:137`). The drizzle migrator applies only a `when` greater than the last applied.
- **F21 — a new table must appear in:** `packages/domain/src/schema/<table>.ts` + `schema/index.ts`; an RLS spec
  `packages/domain/tests/integration/rls/<table>-policy-regression.spec.ts` (templates: `sms-send-deliveries-…`, `claim-suspicion-notice-…`);
  RTBF `packages/domain/src/member/anonymize.ts` — ids + a keyed hash only ⇒ a "nothing to scrub" comment line (`:338-344` precedent;
  the statement-count pin `rtbf-anonymize.test.ts:134-141` stays 26). ⛔ alert or send table is in `data-export/assemble.ts`.

## ⚖️ Build decisions (⭐ = recommended) — PROPOSED for BigDev at Task 0.2

- **FS5 — the language of the text (G3, G4).** ⭐ **(a) the member's language, resolved AT THE PRODUCER, never the other one:** the
  POOL_BATCH child reads the claimed members' languages in ONE set-based query — `COALESCE(m.preferred_locale, pp.locale_default)`
  over `pariwar_passport pp LEFT JOIN members m` for the job's Pariwar (F17's peer-mesh SQL shape; a missing member row ⇒ the Pariwar's
  default, so it never throws) — and `alertFor(memberId)` builds the `sms` block with `locale` = that language and values for it
  (`smsPoolLabel(identity, memberLocale)`; the date and the empty mismatch values are locale-free); the MISMATCH worker does the same for
  its one member. The rung sends the block's locale's template; if that template's id is unset or malformed the rung ends
  `config:dlt_template_id_missing:<locale>` / `template_id_malformed` — terminal, ⛔ the other language. The PUSH keeps
  `deps.locale ?? DEFAULT_LOCALE` (LS11 for push unchanged) — a member who chose English may get a Hindi push and an English text;
  recorded. ⛔ contract change (F5). *Cost (a):* one query per POOL_BATCH job / mismatch job; push and text may differ in language.
  **(b) resolve lazily in the send seam with `getMemberLanguage`** (only for eligible members). *Cost (b):* the seam has no pool
  identity to rebuild `{pool}` for the other locale ⇒ a contract change (values for both locales) or a second identity read; two
  queries per eligible member; a missing row throws. **(c) the Pariwar's language when the member's template is unusable** (`-385`'s
  shape). Not recommended — EXTENDS a ratified clause beyond the reminder ⇒ the Panel's (G3).
- **FS6 — the send record (I1).** ⭐ **(a) a new table, AT-MOST-ONCE:** `alert_sms_sends` (name the dev's), one row per
  `(alert_id, member_id, occasion)` UNIQUE (`occasion` = the keyed-store scope — F4), `send_id uuid` PK (the CRQID row id), `pariwar_id`
  (tenant RLS, the LOOKUP's column), `message`, `locale`, `outcome` (`attempting` → `accepted` | `rejected_invalid_number` |
  `rejected_unreachable` | `refused` | `error`; plus `deferred` for a definite transient — FS9), `detail` (allow-listed grammar),
  `provider_message_id`, `recipient_number_hash` (the keyed hash the suspicion path writes — `claim-suspicion-notices.ts:449-461`),
  `attempt_count`, `claimed_by_job`, `created_at`, `updated_at`. Begin = `INSERT … ON CONFLICT DO NOTHING` + read, in its OWN committed
  transaction BEFORE the gateway call (the precedents' order). Found `accepted` ⇒ the rung is `sent` with ⛔ send (a retry must not
  retry for ever); found a final non-accept ⇒ terminal, ⛔ re-send; found `deferred` ⇒ CAS to `attempting`, `attempt_count + 1`, send;
  found `attempting` (a crash between begin and finalise — the gateway MAY have accepted) ⇒ finalise `error` /
  `exhausted:outcome_unknown`, ⛔ re-send, ALARM. A timeout (`api_unavailable:timeout` — may have sent) is FINAL `error`, ⛔ deferred.
  A rendered-HMAC failure after an accept (F11) never re-sends: the row's truth is the gateway result. Column-narrowed grants, ⛔ DELETE,
  a freeze trigger on finished rows (0155's shape — run EACH transition above against it, footgun #52(a)); ⛔ pruned (the record).
  ⛔ added to the data export (no send table is — recorded in deferred-work). Discharges 6.37b's *"`correlationId` is optional"* for
  this path: the alert seam ALWAYS passes one. *Cost (a):* a crash in the ~10 s send window loses that text (the member keeps the
  in-app notice — R10(B)); ⛔ double charge, ⛔ double text. **(b) at-least-once** (the peer-mesh lease: a crashed `attempting` row is
  re-sent under the same CRQID after a lease). *Cost (b):* a possible second text and charge per crash, and a lease sweep the fan-out
  does not have (it is per job, not per row). **(c) no table — the keyed store + the trail.** Not viable (F15: no row id ⇒ no CRQID).
- **FS8 — the per-member flood guard (G5).** ⭐ **(a) ONE bucket, member key `alert_sms:<memberId>`, window 24 h, cap 10**, consumed
  AFTER begin and BEFORE the gateway call (a found `accepted` row consumes nothing); over the cap ⇒ finalise `refused` /
  `sms_budget_exceeded`, terminal, ALARM (it means a fault — a legitimate pattern never reaches it); the vacuum
  `deleteExpiredSmsRateBuckets` wired into an existing daily job (the dev names which — `sms-delivery-prune.ts` is the nearest). ⚠ THE
  RULE (G5): the cap must sit ABOVE the legitimate per-day maximum = (concurrent cycles a member can be in) × (1 day-10 + 1 escalated +
  1 per mismatch reason) — Task 0.1 counts the mismatch reasons and the maximum concurrent cycles per member; if that product can reach
  10, the cap is raised before Task 0.3, ⛔ the texts rationed. ⛔ a price budget — the price is unknown (Row 40 (d)); `-390`'s *"recorded
  when priced"* is met by Row 40 (d) re-deriving the cost line, ⛔ by this cap. *Cost (a):* one write per sent text; a counter that
  always increments (F16). **(b) a tight cap (24 h / 3).** *Cost (b):* a member in two concurrent cycles with a payment problem can hit
  it and lose a ruled text ⇒ a narrowing of `-390` (the Panel's). **(c) no guard.** *Cost (c):* a sweep or retry bug texts members
  without limit (at 4L scale, a bill — RA-29's own reason for dropping bulk SMS).
- **FS9 — §3.4's retry window (G2; `-394` items 1 and 3).** ⭐ **(a) wait for the window ONLY when WhatsApp was used:** the POOL_BATCH
  and MISMATCH workers register with `{ includeMetadata: true }` and pass the attempt (`retryCount`, `retryLimit` — type-guarded, F7)
  as a per-call parameter to `fanOutAlert`; a lit, eligible member with a WhatsApp TARGET (incl. an FS3 refusal — the Pariwar uses
  WhatsApp) whose WhatsApp rung did not end `sent` gets the text only when `retryCount >= 2` (the third attempt) or on the final
  attempt; before that the SMS rung ends `sms_awaiting_wa_window` and the member goes on the RETRY set (claim released, job throws —
  push and WhatsApp re-tried, which IS the window). A member with NO WhatsApp target is texted on the FIRST pass. The wait applies only
  when the send would otherwise proceed (id provisioned, gateway configured, budget not exceeded) — ⛔ retry storm before go-live.
  Missing metadata ⇒ treat as the final attempt (send). The other retryable class: a DEFINITE transient (`rate_limited`,
  `api_unavailable` other than a timeout, a pre-flight transient under fail-closed — FS17) ⇒ row `deferred`, member on the retry set;
  on the final attempt ⇒ recorded `in_app_only` with the detail. `-394` item 3's residual (a render / HMAC failure) ⇒ `error` +
  ALARM, terminal (⛔ silent). Supersedes `-394` item 1 IN PART (for lit, eligible members only; every other member's rule is
  unchanged). Recorded limits: the count is per POOL job, ⛔ per member, and a sweep re-enqueue resets it; real delay before attempt 3
  ≈ 3–6 min (exponential from 60 s). *Cost (a):* up to two extra job runs per affected pool job; an FS3 refusal waits ~3–6 min although
  WhatsApp cannot succeed (it is configuration, memoized until restart). **(a′)** as (a) but an FS3 refusal is texted on the first pass.
  *Cost (a′):* reads *"WhatsApp, where used"* as excluding a Pariwar whose WhatsApp cannot send — an author's reading of a ratified
  phrase ([[feedback_supersede_never_reinterpret]]); BigDev may take it as the author's if he judges the window is about DELIVERY.
  **(b) never wait — text on the first failed pass.** Not recommended — NARROWS §3.4's window clause ⇒ the Panel's (G2).
- **FS12 — the 5.6 mirror defects (AI-5-5).** ⭐ annotate both deferred-work items *"addressed for the alert path by 5.11b"*, ⛔ closed:
  (1) the template-id trim — on this path MG4's 24-hex check (`isMsg91TemplateId`) refuses an untrimmed id (`template_id_malformed`);
  (2) `resolveSmsTarget` — ⚠ CORRECTED (5.11 v1.2): the decrypt IS caught (F18); only the E.164 check is missing, and on this path the
  MSG91 client refuses a non-canonical `to` (`invalid_number:format`, F8) ⇒ `rejected_invalid_number`, terminal. `resolveSmsTarget`
  itself is ⛔ edited (its other callers).
- **FS17 — the send core (F9).** ⭐ **(a) split `sendClaimDltSms` into a generic `sendDltSms` + the claim wrapper:** the generic core
  takes `{ dltTemplateIdConfigKey, template, e164, render(), values(), correlation: { kind: SmsSendRowKind, rowId }, preflightFailOpen,
  beforeSend? }` — ⛔ helpline — and owns every check F9 lists except the helpline; `sendClaimDltSms` resolves the helpline (its
  unconditional `config:helpline_number_missing` UNCHANGED) and delegates. `CLAIM_SEND_ROW_KINDS` widens to every `SmsSendRowKind` in the
  generic core (the claim wrapper keeps its four). Fix the dead `fitsDltAlphanumeric` reference. The alert seam calls `sendDltSms` with
  `preflightFailOpen: true` (MG5's correction / closure / certificate shape: a PROVEN fault ⇒ `refused` / `preflight:<fault>` + ALARM;
  an unproven one is alarmed and SENT). The template ids are resolved through a per-process memo (5 min for found AND not-found, ⛔ a
  transient) — the fan-out would otherwise read Secret Manager once per member; the claim path's per-send read is ⛔ changed. The
  config checks (id, gateway) run BEFORE the send row is begun ⇒ a config refusal writes ⛔ row and ⛔ alarm (day one: every eligible
  member — Row 40 (a) tracks it). *Proof of I7:* every claim send test passes UNEDITED. *Cost (a):* edits a core five claim flows use.
  **(b) a sibling `sendAlertDltSms` copying ~60 lines.** *Cost (b):* the AI-5-5 mirror-defect class (5.6's "mirror exactly" copied bugs
  forward); two cores drift. **(c) call `sendClaimDltSms` with a placeholder helpline.** ⛔ — a fake config value.
- **FS18 — the suppression boundary (I4).** ⭐ **(a) send THROUGH `dispatch`:** the SMS rung calls `dispatch(alert, { providers: { sms:
  [oneSendProvider] }, resolveDelivery: () => ({ sms: target }), render: () => dltBody, suppression: deps.suppression, hashRendered,
  audit })`, where `oneSendProvider.send` runs the begin → budget → `sendDltSms` → finalise sequence and the rung reads the CORE's result
  captured by closure (dispatch's `rejected` loses `transient` vs `final`). Gains the suppression hook, the rendered HMAC and the
  `alert.channel_send` audit line for real sends. A suppressed member ⇒ `suppressed`, ⛔ row, ⛔ gateway call. *Cost (a):* a provider
  whose `send` writes rows — documented on the provider. **(b) call the suppression hook directly, then the core**, and write the audit
  line by hand. *Cost (b):* a second audit writer that can drift from `dispatch`'s.
- **FS19 — boot wiring (F10).** ⭐ move the `smsPreflight` construction above `contributionNotifyDeps` (it needs only
  `contributionProviders`, built at `:621`), and give the contribution deps an OPTIONAL `alertSms` seam (gateway client, config resolver,
  pre-flight, the template-id memo, the budget numbers). News / survey / moderation share the object but never reach the seam (⛔ `sms`
  block — I6). An absent seam ⇒ the rung keeps `sms_send_not_wired` (tests, a jobs process without a gateway); an unconfigured gateway ⇒
  `config:sms_gateway_unconfigured`.
- **FS20 — the WhatsApp memo's `off` direction (F19, W1).** ⭐ **(a) never memoize `off`:** the fan-out resolver memoizes only `ready`
  and `refused`; an `off` Pariwar is re-read on the next resolution (`resolveWaTarget` already reads the config per member). A switch-on
  is then seen at once; refused → ready still needs a restart (recorded, unchanged). *Cost (a):* one provisioning read per resolution
  for an `off` Pariwar (every Pariwar today). **(b) leave W1 deferred** with a roster note "restart jobs after switching WhatsApp on".
  *Cost (b):* until a restart, a member of a newly switched-on Pariwar is recorded `delivered` on a fake `whatsapp:sent` and gets ⛔ text.
- **FS21 — the Hindi pool value's invisible characters (deferred-work, 5.11 last fix diff; `-394` item 2).** ⭐ **(a) widen the ban
  before the first send:** `smsPoolLabel` falls back to the letter code when the trimmed name contains `\p{Cc}`, U+2028 / U+2029
  (`\p{Zl}` / `\p{Zp}`), any `\p{Cf}` EXCEPT ZWNJ U+200C / ZWJ U+200D (Devanagari shaping), or a lone surrogate (`!str.isWellFormed()`).
  Supersedes `-394` item 2 in part. *Cost (a):* a curated name with a stray format character is texted by letter. **(b) keep item 2.**
  *Cost (b):* a bidi control or ZWSP reaches DLT matching (Row 30 (d) unanswered for such characters) — a rejected or garbled text.
- **FS22 — the CRQID kind (F12, F13).** ⭐ **`as`** (alert SMS): `SMS_CORRELATION_KINDS` + pattern; a NEW migration REPLACES 0167's two
  CHECKs (⛔ edit 0167 — [[project_live_db_test_gotchas]]); the schema mirrors; `LOOKUP.as` (`send_id`, `pariwar_id`, `outcome`,
  `provider_message_id`, `NULL::text AS purpose`); the correlator's kind-specific rows checked for `as` (Row 6 "attempting ⇒ retry"
  holds; Row 5 is `pm`-only); ⭐ JOIN the silence alarm (`countSilentSmsSends` + `sms-delivery-silence.ts` — DR12 covers *"accepted SMS
  sends"*); every kind-enumerating test (F13). *Cost:* one more subquery in the silence count.
- **FS23 — quiet hours (G12).** ⭐ **(a) none — send at any hour, recorded:** the day-10 sweep runs at 09:30 IST (its cron); an
  escalation lands ≥ 24 h after the member's own payment attempt; a mismatch follows the member's own payment — each tracks the
  member's day; TRAI permits transactional / service SMS at any hour; the push already arrives at any hour. A deferred-work item names
  the trigger (a complaint or a ruling). *Cost (a):* an escalation or mismatch text can arrive at night. **(b) hold the whole notice
  (push too) to 09:00–20:00 IST** by `startAfter` at enqueue (escalated, mismatch). *Cost (b):* a payment-problem push waits up to 13 h.
  **(c) hold only the SMS** (per-member deferral, the peer-mesh shape). *Cost (c):* a new per-member deferral path in POOL_BATCH.

## Acceptance Criteria

**AC0 — Governance before code (Task 0).** One author-commit decision (next free id at the time of commit) records FS5–FS23 as
answered, the §0 readings G1–G12, and its SUPERSESSIONS IN PART — `-345` MG12 (zero-slot), `-389` item 10 (`sms_send_not_wired` replaced),
`-394` item 1 (FS9), item 2 (FS21, if (a)), item 3 (FS9 / FS17) — and "Not covered" (consent — Row 40 (f); price — Row 40 (d);
cost-optimization vs `-390` — carried); committed ALONE before any record or code. The records commit follows
([[feedback_governance_commits_precede_implementation]]). If BigDev picks an option marked "the Panel's", STOP and write the routing note
from the template instead.

**AC1 — The send record and its report (FS6, FS22).** The new migration (next free number, a `when` strictly above every journal entry on
`main` and every sibling worktree) creates the table with its UNIQUE `(alert_id, member_id, occasion)`, tenant RLS (FORCE), narrowed
grants, ⛔ DELETE, the freeze trigger, and replaces 0167's two kind CHECKs to admit `as`. A delivery report carrying an `as` CRQID for an
`accepted` row is MATCHED (`sms_send_deliveries` row with `send_kind = 'as'`); one for an `attempting` row is retried (correlator Row 6);
an accepted `as` send with no report in 48 h – 7 d is counted by the silence alarm. *Legs:* an RLS spec (cross-Pariwar read / write
refused; ⛔ DELETE; the freeze refuses rewriting a finished row); a live correlator leg; a silence-count leg; every F13 kind-enumerating test
updated.

**AC2 — The real send (I2, I4; FS17, FS18).** A lit, eligible member with an SMS target, the template id for the block's locale
provisioned (24-hex) and the gateway configured: the MSG91 flow client is called ONCE with that template id, the block's values in slot
order, the member's E.164 and a CRQID `as<send_id hex>`; the body passed equals `substituteDltValues(registeredText, …)` and
`renderContributionSms` (real `t()`); accepted ⇒ the rung is `sent`, the member `delivered`, the row `accepted` with the provider id, one
`alert.channel_send` line. A suppression hook that suppresses ⇒ `suppressed`, ⛔ row, ⛔ call. `payment_not_matched` (zero slots) SENDS
(`values: []` — AC7). *Legs:* a recording gateway double (assert calls, ⛔ provider id — 5.11's T2); one leg per message × locale; the
suppression leg; the zero-slot leg.

**AC3 — At most once (I1; FS6).** For the same (alert, member, occasion): a job retry, a sweep re-run after the keyed-store TTL, and two
concurrent workers produce ONE gateway call; a found `accepted` row ⇒ `sent` with ⛔ call; a found `attempting` row ⇒ `error` /
`exhausted:outcome_unknown`, ⛔ call, one alarm; a timeout ⇒ final `error`, ⛔ re-send on retry; an HMAC failure after an accept ⇒ the row
stays `accepted`, ⛔ re-send. Day 10, escalated and each mismatch reason for the same member and cycle are three different occasions
(three texts). *Legs:* live, on :5433, separate transactions for DB-clock ordering ([[project_db_clock_ordering_tests_tie]]).

**AC4 — Outcomes and the retry profile (I5; FS8, FS9, FS17).** Each non-send ends with a named, allow-listed detail (`RECORDED_RUNG_DETAILS`
extended): `config:dlt_template_id_missing:<locale>` / `template_id_malformed` / `config:sms_gateway_unconfigured` (⛔ row, ⛔ alarm,
terminal); `preflight:<fault>` (proven, `refused`, alarm, terminal); `sms_budget_exceeded` (`refused`, alarm, terminal);
`rejected_invalid_number` / `rejected_unreachable` (terminal, ⛔ alarm); `error` (alarm, terminal); `sms_awaiting_wa_window` and a definite
transient (RETRY set — the only two); on the final attempt either ⇒ `in_app_only` with the detail. Every member NOT lit-and-eligible keeps
`-394` item 1's rule byte for byte (the 5.11 R1 legs pass unedited). *Legs:* one per detail; the R1 legs; `shouldRetryFanOut` unit legs for
the two new retryable classes.

**AC5 — Language (I3; FS5).** A member who chose `en` in a `hi` Pariwar gets the en template with an en pool value (letter code unless the
curated name passes `smsPoolLabel`'s en rule); a non-chooser gets the Pariwar default; a member with no `members` row gets the Pariwar
default; with the en id unset, the chooser of `en` ends `config:dlt_template_id_missing:en` — ⛔ the hi template. The push copy's locale is
unchanged. *Legs:* POOL_BATCH and MISMATCH; the one-query read (a query-count assertion).

**AC6 — The window (FS9).** POOL_BATCH and MISMATCH register with `includeMetadata: true` (asserted, the `claim-correction-control-paths`
precedent). A WhatsApp-target member whose WhatsApp did not end `sent`: attempts 0–1 ⇒ `sms_awaiting_wa_window`, retried, ⛔ call; attempt 2
⇒ sent; the final attempt ⇒ sent; missing metadata ⇒ sent. A member with no WhatsApp target ⇒ sent on attempt 0. An unprovisioned id ⇒
terminal on attempt 0 (⛔ wait). FS9 (a) vs (a′) as answered for the FS3 refusal.

**AC7 — MG12 and the claim texts (G6; FS17).** `createSmsDltProvider` and the MSG91 client refuse `values === undefined`
(`no_named_values`) and ACCEPT `values: []`; the category composition path (`resolveSmsProviderDeps`, ⛔ values) is still refused (asserted).
`sendClaimDltSms`'s behaviour is unchanged: every claim send test passes UNEDITED (the File List names any test that had to change and why).

**AC8 — Nothing else moves; records; gate (I6; FS12, FS19–FS21, FS23).** `isAlertSmsFallbackEligible` and `alertSmsBlock` byte-unchanged
(a source pin); FS20's memo leg (off → on seen without a restart); FS21's `smsPoolLabel` legs (each banned class ⇒ letter code; ZWJ / ZWNJ
kept); the budget vacuum runs from its job. Records: deferred-work — the 6.34 TV6 item CLOSED on `done` ("Closed by 5.11b"); the
6.37b `correlationId` item, the two 5.6 items (FS12 wording), LS11's item (for the three texts), W1 (FS20), Y1 (FS21) annotated; a NEW item
for quiet hours (FS23 (a)) and the data export (FS6); roster Row 40 dated note ((e) now observable; Row 32 (b) / (d) / (e) / (g) cross-
referenced); the DLT sheet's *"The language each member gets is row 5-11b's"* and *"until row 5-11b changes it"* sentences get dated notes;
architecture §3.4 a dated annotation (the window as built; the language; the guard) — never a rewrite. `pnpm ci:local` green on :5433.

## Tasks / Subtasks

- [ ] **Task 0 — Governance (AC0)**
  - [ ] 0.1 Preflight: `git fetch origin`; rebase onto `origin/main`; run the pin checks (header). Re-run F1–F21 (every cite by CONTENT).
        Count the mismatch reasons and the maximum concurrent cycles per member (FS8's rule) and record the product. List consumers of
        `alert.channel_send` (FS18 adds real SMS lines). **STOP** if: **S1** a ruling on alert-SMS language, budget, window or quiet hours
        exists after `-394` (grep `^### Decision` on main + every branch + every worktree); **S2** another worktree edits
        `contribution-notify*.ts`, `claim-dlt-sms-send.ts`, `sms-dlt.ts`, `sms-app.ts`, `correlation.ts`, `reports.ts`, the correlator,
        `provider-composition.ts` or `contribution-sms-templates.ts` (`git worktree list`; ListAgents — [[feedback_shared_tree_branch_switch]]);
        **S3** a Pariwar's WhatsApp is enabled anywhere a deploy reads (FS9 then bites at once — tell BigDev); **S4** any `sms.dlt.template_id.
        contribution.*` id is set anywhere (G9 — it must not be before Row 40 (a)); **S5** Row 30 (d) was answered with a limit or charset
        rule that changes FS21 or the slot maxima.
  - [ ] 0.2 Put FS5, FS6, FS8, FS9, FS12, FS17–FS23 to BigDev; record answers VERBATIM in Debug Log (a). A bare option letter means the
        option's outcome AND its cost line (footgun #45).
  - [ ] 0.3 Stage the author-commit decision (AC0's contents; next free id at commit — re-check every worktree) in the scratchpad; commit it
        ALONE (`governance:` prefix) — try the decision-log write first ([[project_decision_log_writes_user_inserted]]).
  - [ ] 0.4 Records commit (AC8's record half): deferred-work annotations + new items; roster Row 40 note; DLT sheet notes; §3.4 annotation;
        `epics.md` `### Story 5.11b` dated note *"story file created"*; ledger by SAFE prepend ([[project_sprint_status_safe_prepend]]) + row
        `ready-for-dev → in-progress`.
- [ ] **Task 1 — Migration + domain (AC1; FS6, FS22)**: the table (schema file + barrel), the CHECK replacements, `correlation.ts` + mirrors;
      domain functions begin / mark-deferred / finalise (CAS on `attempting` + `claimed_by_job`, the precedents' shape); `LOOKUP.as`;
      `countSilentSmsSends` + `sms-delivery-silence.ts`; correlator review for `as`; `anonymize.ts` "nothing to scrub" line; RLS spec.
      `pnpm db:migrate` on :5433 before the live tests ([[project_prepush_hook_inherits_5432]]).
- [ ] **Task 2 — Send core + MG12 (AC2, AC7; FS17, FS12)**: `sendDltSms` extracted, `sendClaimDltSms` delegates (claim tests unedited);
      `fitsDltAlphanumeric` reference fixed; MG12 in `sms-dlt.ts` and `sms-app.ts` (`undefined` refused, `[]` allowed); the template-id memo.
- [ ] **Task 3 — The rung (AC2–AC4, AC6; FS8, FS9, FS18)**: the `alertSms` seam (begin → budget → core → finalise) behind a one-send
      provider through `dispatch` (render override, suppression); the outcome → detail map; `RECORDED_RUNG_DETAILS`; `shouldRetryFanOut`'s
      two new retryable classes; the attempt parameter down `runContributionNotifyChild` → `fanOutAlertToMembers` → `fanOutAlert`;
      `includeMetadata` on POOL_BATCH and MISMATCH. Replace the DELIBERATE block's text with what now holds (I4). ⛔ edit the predicate.
- [ ] **Task 4 — Producers' language (AC5; FS5)**: the set-based language read in the POOL_BATCH child and the MISMATCH worker; the `sms`
      block built per member in that language. Doc-only updates that would otherwise lie: `AlertSmsBlock`'s `locale` comment
      (`packages/contracts/src/alerts/alert.ts:90-92` — now "the RECIPIENT'S language", ⛔ "the producer's"); the MG12 caveat in
      `contribution-sms-templates.ts:66-67`; the `ContributionNotifyTriggerDeps.locale` comment (`:236-241`, "does ⛔ read
      `members.preferred_locale`" — true for push only now).
- [ ] **Task 5 — Boot + WhatsApp memo + pool value (AC8; FS19, FS20, FS21, FS8 vacuum)**: the pre-flight moved up; the seam wired; the
      vacuum on its job; `off` not memoized; `smsPoolLabel`'s wider ban.
- [ ] **Task 6 — Records (AC8)** — whatever Task 0.4 could not write before the code (e.g. File-List-dependent notes).
- [ ] **Task 7 — Tests (AC1–AC8)**: replace every `sms_send_not_wired` expectation that now sends (list below, Dev Notes) — each
      replaced test states what it replaced; keep the legs where the seam is absent; every new gate proven RED first (Debug Log (b)); the
      6.37d AC11 sha256 fence on `provider-composition.ts` / `contribution-notify.ts` re-taken with a dated note (5.11's precedent).
- [ ] **Task 8 — Verify**: `pnpm ci:local` with `DATABASE_URL` on :5433 ([[project_known_livedb_test_failures]]; sibling worktrees share
      :5433 — a deadlock or a foreign migration mid-run is re-run alone, recorded); review the diff before commit
      ([[feedback_review_the_fix_diff_before_commit]]); commit on the story branch ([[feedback_commit_on_story_branch]]); ⛔ push without
      BigDev's go-ahead.

## Dev Notes

### ⚠ TRAPS

- **T1 — The alert id is per cycle** (F4). A send record keyed `(alert, member)` silently drops the escalated text and every mismatch reason
  after day 10. Key by the keyed-store scope.
- **T2 — The keyed store is not durable** (F4, F15): 300 s TTL, completed keys vacuumed. Only the send record stops a second text.
- **T3 — Two MG12s** (F8): the provider AND the client refuse empty values. Change both, keep `undefined` refused — the category
  composition path (`resolveSmsProviderDeps`) must stay dark.
- **T4 — The claim core demands a helpline** (F9) even for templates without one. Never pass a placeholder; split the core (FS17).
- **T5 — Never assert on provider id** — the fixture and the real provider are both `sms-dlt` (5.11 F3). Assert gateway calls on a
  recording double and the trail's outcome + detail.
- **T6 — `dispatch`'s `rejected` loses `transient`** (F11). Read the core's result by closure; the send row's truth is the gateway result,
  not dispatch's outcome (an HMAC throw after an accept is `error` in dispatch and `accepted` in the row).
- **T7 — The deps object is shared** by 8 concurrent POOL_BATCH jobs and four other workers (F6, F10). The attempt number is a per-call
  parameter; ⛔ store it on deps.
- **T8 — A crash is not loud** (footgun #49(c)): pg-boss `fail()`s a handler throw without an `'error'` emit — log / alarm BEFORE throwing;
  the final attempt must finish the row itself (footgun #52(b)).
- **T9 — A config refusal per member is noise** on day one (every eligible member, every notice, until Row 40 (a)). ⛔ alarm, ⛔ row.
- **T10 — Migration ordering on a shared DB** (F20): a later `when` applied first makes drizzle skip the other
  ([[project_sibling_migration_when_order_shared_db]]); never regenerate an applied migration ([[project_live_db_test_gotchas]]).
- **T11 — Unit mismatch**: `checkedValues` counts code points, `smsPoolLabel` and the shape check count UTF-16 units (F9). ≤ 30 UTF-16
  implies ≤ 30 code points, so the pool value is safe; ⛔ "fix" either to the other unit.
- **T12 — Type-only import cycles** between `contribution-notify.ts`, the new seam and `claim-dlt-sms-send.ts` crash at runtime, invisible
  to tsc ([[project_type_only_import_cycle_trap]]).
- **T13 — A JSDoc with `**cl.3**`-style emphasis closes the comment** ([[project_markdown_emphasis_closes_jsdoc]]); hand-format
  ([[project_prettier_not_enforced]]).
- **T14 — A freeze trigger vs the transitions** (footgun #52(a)): list `attempting → deferred → attempting → final` and the correlator's
  reads, and run each against the trigger and the column grants before writing them.
- **T15 — `pnpm --filter X test -- name` runs the whole suite** and a typo'd filter passes with `passWithNoTests` (footgun #55(d)).

### Tests that change (5.11's `sms_send_not_wired` expectations — re-located at Task 0.1)

`apps/jobs/tests/contribution-notify.test.ts` (`:296` no-WhatsApp member ELIGIBLE; `:580`; `:590` FS3 refusal; `:636` I3 "an SMS provider that
WOULD accept … is never driven" — now inverted when the seam is wired, kept for the absent seam; `:664`; the R1 block `:694-760`; `:505`
"⛔ fake SMS line"); `apps/jobs/tests/contribution-notify-triggers.test.ts` (`:1296-1395`); `apps/jobs/tests/ai-8-3-ladder-armor-live.test.ts`
(`:246`); `apps/jobs/tests/contribution-notify-live.test.ts` (`:203`); `packages/channels/tests/sms.test.ts` (`:89-103` MG12; `:591` kinds);
`packages/channels/tests/provider-composition.test.ts:211-236` (stays — the composition path is still refused); the F13 kind tests.

### Reuse map

| Need | Reuse | Instead of |
|---|---|---|
| send checks, pre-flight, provider, timeout, result classes | `sendDltSms` split out of `claim-dlt-sms-send.ts` | a second core |
| CRQID | `formatSmsCorrelationId` (`@twt/domain`) | a local format |
| body | `renderContributionSms` + `substituteDltValues` | `render.ts`'s heading form |
| suppression, HMAC, audit | `dispatch` with a per-call registry + render override | a hand-written audit |
| row lifecycle | the suspicion-notice begin / finalise / transient shape (0151 / 0155) | a new state machine |
| language | the set-based `COALESCE(preferred_locale, locale_default)` SQL | `getMemberLanguage` per member |
| attempt | `includeMetadata` + the type guard (`claim-contact-ladder-whatsapp.ts:660-668`) | a counter of our own |
| flood guard | `checkAndConsumeSmsBudget` (0049) | a new table |

### Testing standards

Vitest; a RECORDING gateway double (zero-call assertions for every refusal — footgun #48 ⭐ also); real `t()` for every body; live legs on
:5433 with `pnpm db:migrate` first, separate transactions where DB-clock order matters; each replaced test names what it replaced; every new
gate proven RED (mutants restored byte-identical, sha256). ⛔ assertion on provider id.

### Project structure notes

The table's schema in `packages/domain/src/schema/`, its domain functions beside `sms-delivery/` (name the dev's); the migration in
`packages/domain/migrations/`; the core split inside `apps/jobs/src/scheduler/claim-dlt-sms-send.ts` (or a sibling `dlt-sms-send.ts`); the
seam in `apps/jobs/src/scheduler/` (it is DB-touching — never in `packages/channels`, which `fanOutAlert`'s contract keeps DB-free); no
pg-touching `@twt/domain` import into anything Metro bundles ([[project_contracts_domain_bundle_boundary]]).

### Sequencing

Open worktrees at the pin: `11b-4-memorial-authorship-…` (migration 0181, decisions `-391`–`-393`, `-395`, `-398`, plans Row 41),
`6-36e-nominee-member-link-at-declaration` (migration 0181, decisions `-396` / `-397`), `3-3c-member-kyc-name-english-only` (stale at 0178),
`6-35-in-app-language-switch` (landed). None edits the files S2 lists at the pin. Whichever 0181 lands second becomes 0182 ⇒ 5.11b takes the
next free AT ITS COMMIT, re-checked after every rebase. Peer session twt-17 was busy in the main checkout at creation — the story branch
lives only in this worktree.

### Previous story intelligence

- **5.11** (landed `7489a296`): the registry, words, predicate, honest rung, FS14 / R1, `-394`; its "Carried to 5.11b" section is this
  story's F / FS source. Its review lesson: R1 — a blanket "terminal" broke the retry profile; every retry change here is per class (AC4).
  Its round-2 P3 is this story's I4; P2 is FS5's reason; D3 is FS9's `-394` item 3.
- **6.37 / 6.37b / 6.37c**: MG4 / MG5 / MG12; the CRQID (DR3); `correlationId` optional (now required on this path); the at-least-once SMS
  items "open on a gateway idempotency key" (`-347` consequence 5) — FS6 (a) is at-most-once instead.
- **6.31 / 6.27c**: the per-row send record, begin / finalise CAS, lease re-claim (the at-least-once shape FS6 (b) names).
- **6.35**: the language column, LS10 / LS11 / LS13 (FS5).
- **5.6**: the two mirror defects (FS12).

### Git intelligence

`main` at the pin: 5.11 landed by fast-forward (PR #301; `7489a296`), then `ci: integration-tests timeout-minutes 20 → 30` and the 5.11
ledger. Stories land by fast-forward ([[feedback_land_prs_by_fast_forward]]).

### Latest tech information

No new fetch: 5.11's 2026-10-23 findings stand (TRAI ≥ 30 % fixed, typed variables, Service-Implicit transactional content; pg-boss 12.19.1
`retryCount` only with `includeMetadata`). MSG91's handling of a flow template with NO variable, and of Devanagari / format characters in a
variable, are provider questions already on roster Row 30 (d) / Row 40 (c) — answered in writing, never assumed from docs (footgun #53(a)).

### References

- `_bmad-output/planning-artifacts/architecture.md` §3.4 (`:2115-2119`, `:2318-2349`); epics `### Story 5.11b`.
- `.decision-log.md`: `-345`, `-347`, `-349`, `-366`, `-385`, `-387`, `-389`, `-390`, `-394` (by id, never line).
- `_bmad-output/implementation-artifacts/5-11-per-member-sms-fallback-fixed-wording.md` ("Carried to 5.11b"; Review Findings).
- `docs/launch-gate-inventory/{inventory-roster.md (Rows 30, 32, 40), dlt-template-requests-6-19.md (templates 17–22; cost)}`.
- Code: F1–F21 above.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-24 | v1.0 | Created (`bmad-create-story 5.11b`, worktree `.claude/worktrees/5-11b-alert-sms-real-send`, pinned `6c4c1e47`); four read-only verifiers re-checked 5.11's carry at the pin. CORRECTED: the send record's key includes the occasion (F4 — the alert id is per cycle); a second MG12 refusal in the MSG91 client (F8); the claim core's unconditional helpline (F9). FS5, FS6, FS8, FS9, FS12, FS17–FS23 PROPOSED; ⛔ Panel question at the recommended options. Ultimate context engine analysis completed - comprehensive developer guide created. |
