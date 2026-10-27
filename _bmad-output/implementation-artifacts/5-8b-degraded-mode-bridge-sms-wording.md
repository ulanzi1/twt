---
baseline_commit: 4e57fa42
---

<!--
PINNED: 4e57fa42 (HEAD of `main` and of this branch at creation, 2026-10-27 — "records: ledger landing entry relabelled
2026-10-27i -> 2026-10-27j …"). Branch `story/5-8b-degraded-mode-bridge-sms-wording`, worktree
`.claude/worktrees/5-8b-degraded-mode-bridge-sms-wording`.

Two facts, kept apart (footgun #24): (1) the PIN is valid iff `git merge-base --is-ancestor 4e57fa42 HEAD`; (2) the FOUND FACTS are valid
iff `git diff --name-only 4e57fa42..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory docs/degradation-policy` is
EMPTY or every changed path is re-checked against the F it touches. Re-run BOTH at Task 0.1 — never assume either. (Both held at
creation: HEAD equalled origin/main after `git fetch origin`.)

STATUS: 2026-10-27 created (`bmad-create-story 5.8b`) → ready-for-dev. Task 0.2 (the build decisions FS1–FS14) is BigDev's and is
OPEN; ⛔ code before it.

START CONDITION — MET at the pin: 5.8 (the declaration, the primitive, the admin surface), 8.1 (`openCycleAlert` stamps
`time_critical` from the declaration at the freeze instant), 8.8 (the live fan-out), 5.11 (the honest SMS rung), 5.11b (the real alert
SMS send, `alert_sms_sends`) and 6.35 (the member's language) are all `done` on `main`.

NUMBERS (footguns #19 / #42(e); `-366` decision 6): this file names no decision id, roster Row number, DLT-sheet ordinal, migration
number or ledger letter that is not yet taken — where it says 23 / 24 it means the pin's next-free DLT ordinals, to be re-found. The next free of each is found AT THE TIME OF USE (Task 0.3 / 0.4 / 2 / 7) across `main`,
every branch and every worktree. At the pin they WERE: decision `-410` on `main` (`-412` on the 11b-4a branch); roster Row 41 on `main`;
DLT-sheet template 22; migration `0185` on `main` (`0186` / `0187` on the 11b-4a branch); ledger letters through `-27q` (11b-4a's branch) and
`-27r` (6.32's branch); this creation took `-27s`.

§0 GATE (trustee-panel-routing-note-TEMPLATE.md) — readings (ratified text quoted verbatim; match / widen / narrow stated):
  G1  Architecture §3.4, channels list: *"SMS (DLT-transactional / PE/OE) — preserved fire conditions: (i) OTP delivery (§2.2); (ii)
      step-up OTP (§2.2); (iii) per-member transactional fallback when both WA gates ON and WA delivery returns failure after the
      committed retry window; plus the per-Pariwar cycle-open SMS bridge below for degraded-push + disabled-WA conditions. Not a
      bulk-alert channel."* and the bridge paragraph: *"for cycle-open and other time-critical templates, when per-Pariwar push delivery
      rate falls below threshold AND the Pariwar WA admin-toggle is OFF, dispatcher fires a per-Pariwar SMS bridge to members. This is
      distinct from per-member WA-failure fallback (above) and from bulk-alert SMS (banned per RA-29) — it is a narrow degraded-mode
      safety net for time-critical communications."* PRD RA-29 lists *"Pariwar-degraded-mode cycle-open bridge"* among the SMS
      *"preserved surfaces"*; the PRD's TRAI line requires DLT registration *"for … degraded-mode cycle-open-bridge SMS — committed as
      operational prerequisite"*. ⇒ giving the bridge registered words and lighting it is MATCH — the fire condition is in the text.
      ⚠ §3.4's standing as RATIFIED is by later entries' description (`-374`, `-375`, `-357`, `-255` F7 treat it so; 5.11's G1 the same);
      `-065` itself lists ADRs 0026–0030. Inherited here, not re-argued.
  G2  The TRIGGER (FS2): §3.4 describes an AUTOMATIC condition (push delivery rate below a threshold AND the Pariwar's WhatsApp toggle
      OFF; thresholds deferred to Category 5 Observability). Story 5.8 built a MANUAL trustee declaration — no threshold, no WhatsApp
      conjunct — on the epic's own three scenarios (*"in-app push infrastructure down, WA Business API unavailable system-wide, or
      trustee-declared 'treat all cycle-open as critical'"*) and recorded the automatic trigger as deferred. 5.8's reconciliation 5
      quotes the conjunct as part of the AUTOMATIC description and narrows AR-20 to manual declaration; it does not say whether a
      manual declaration is also bound by the conjunct, and the built code (`degradedModeActiveFor` = `alert.time_critical`) never
      reads the Pariwar's WhatsApp toggle. ⇒ READING, PROPOSED for BigDev (FS2): the conjunct belongs to the automatic detector; a
      manual declaration is the trustee's attestation that the Pariwar is degraded.
  G3  The COST: epics.md Story 5.8 says *"cost impact is accepted as the trade-off for reach during degradation"* — a sentence in a
      planning artifact, with no per-unit figure. No `.decision-log.md` entry rules on Story 5.8's declaration, AR-20, the bridge's trigger,
      its cost or its words (grep 2026-10-27): the only entries that mention the bridge are the degradation-policy framework's own record
      and Story 5.11's `-389` §1 item 6 (*"the degraded-mode bridge stays dark; a bridged send runs the normal ladder; the bridge's words
      are a new backlog row"*) with `-404`'s "Not covered" line. So *"a cost the Panel accepted in 5.8's epic text"*
      (the sprint-status comment on this row) is an inherited phrase, not a ratified acceptance of THESE words' cost. `-390` is the
      precedent for putting a per-part cost line to the Panel. ⇒ FS13 (the cost goes in the note as stated, not asked).
  G4  `2026-09-02-180` Q1 (Trustee-ratified): the deceased family's FULL NAME renders on *"④ the cycle-open push / WhatsApp / SMS copy
      (8.8)"*; *"no consumer is excluded, and no split is authorised"*. The bridge text is the ONLY cycle-open SMS that will exist
      (`-389` / `-390` keep a pool opening off the per-member fallback). ⇒ carrying the name is MATCH; omitting it is a split (the
      Panel's, FS6 (c)). The name is the label the Pariwar's presentation mode resolves — `full_name` (the default) or `shielded_name`
      (*"Rajesh S."*) — the SMS follows it, as the push does.
  G5  `2026-10-22-379` Q1 A (Trustee-ratified): the 60-letter rule — *"(1) Send the full name whenever it fits 60 letters. (2) Only if it
      is longer: remove titles and suffixes … (3) If still longer: turn words into their first letter … never the last word"* — scoped
      to *"THE FOUR TEXTS"* (the claim texts). The bridge text is a fifth text ⇒ applying the rule EXTENDS a ratified rule's scope ⇒ PQ1
      (the Panel's; one line; non-blocking — interim FS6 (a)).
  G6  `2026-10-23-390` (Trustee-ratified): *"⛔ A return of bulk-alert SMS (PRD RA-29)"*; under "Not covered": *"every other
      notification — a pool opening, days 5 / 13 / 14, … — ⛔ texted"*. The bridge is the RA-29 carve-out §3.4 names, not a return of
      bulk SMS, and it does not change the per-member fallback's reach (the three notices) ⇒ MATCH. `-389` G4 (BigDev's 2026-07-06
      exclusion of `alert_published` from the per-member CATEGORY registry) is KEPT: the bridge is keyed by a payload `sms` block on a
      bridged alert, not by a category registry entry; `sms-dlt-registry.ts` stays all-dark. What DOES change is 5.11's own invariant I5
      (*"no degraded-mode bridged send can reach a lit template"*) and the code and tests that enforce *"no pool-opening text"* (F16):
      they described the per-member fallback, and are rewritten here — a new decision entry supersedes `-389` §1 item 6 in part; no
      ratified sentence is edited.
  G7  Consent: `-375` "Does NOT cover" *"any SMS consent (row 5-11)"* ⇒ counsel's, roster Row 40 (f), shared by this story's text —
      ⛔ asked of the Panel (the template: a mixed question is two questions).
  G8  The degradation-policy framework (Story 0.4, trustee sign-off 2026-07-05 conditional on the markers): README §4 invariant 3 says
      `sms-channel.md` *"fires ONLY via the per-member transactional fallback … OR via the Pariwar-degraded-mode cycle-open SMS
      bridge"*; invariant 6: *"Silent removal [of the PENDING LEGAL REVIEW marker] is a framework violation"*; §14: *degraded POSTURE*
      is a different state (≥ 2 trustees declare it when the Solo Builder has been unreachable 7 days). This story registers NEW words
      for the bridge and leaves the framework documents byte-for-byte ⇒ MATCH (F3 shows the draft is the posture notice). README §5's
      table row for the bridge says *"YES — same template body"*: read as written on 2026-05-29, before Story 5.8 existed, for posture
      content; the same file's header makes posture activation over the bridge policy-gated, default no. A reading, not an edit (FS14).
  G9  WHO may declare: `pariwar.declare_degraded_mode` is held by `pariwar_admin` and `super_admin` (5.8 reconciled the epic's
      *"trustees"* — `state_trustee`'s ceiling cannot hold a `pariwar` grant). With the bridge lit, one declaration texts a whole
      Pariwar. ⇒ the author's: a go-live leg names the holders (FS12); ⛔ a Panel question (the epic authorised declaration "via admin
      UI"; 5.8's reconciliation stands).
  NOT covered by any ruling: the cost per text at Pariwar scale (price per part unknown — Row 40 (d)); consent (counsel, Row 40 (f));
  the 60-letter rule for this text (PQ1); the automatic trigger (Category 5 Observability); the lifecycle-suppression hook (Row 40 (g)).

GLYPH REGISTER: ⛔ marks a prohibition at the START of a bullet or clause only — inside a sentence this file writes "not" / "never" in
words. ⭐ = recommended / load-bearing; ⚠ = trap or caveat. `.decision-log.md`, `deferred-work.md` and `sprint-status.yaml` are NEVER
cited by `file:NNN` (newest-first prepends move every line).

LETTERS: F = found facts · FS = build decisions (PROPOSED; answered by BigDev at Task 0.2) · I = invariants · T = traps · S = Task 0.1
STOP conditions · G = §0 readings · PQ = Panel question.
-->

# Story 5.8b: The Degraded-Mode Cycle-Open SMS Bridge Gets Its Own Registrable Words (en + hi) and Is Lit — a Time-Critical Cycle-Open Is Texted Once, in the Member's Language, Naming the Family `[SURFACE]`

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** A trustee can already declare a Pariwar's degraded mode (Story 5.8); a cycle that freezes
> while the declaration is active already opens a time-critical alert (8.1), and every member's fan-out already knows it is bridged
> (8.8). Then nothing is texted: the bridge has no registered words, so since 5.11 a bridged member simply runs the ordinary push →
> WhatsApp ladder and the SMS rung ends `sms_bridge_not_lit` (before 5.11 it ended a fake `sent`). The admin banner nevertheless tells
> the declaring trustee *"the cycle-open SMS bridge is armed"* (F11). This story makes that sentence true. It writes the bridge's words
> (en + hi — BigDev's already-reviewed pool-open words, verbatim; the *"draft"* the row named, `sms-channel.md`, turns out to be the
> notice for a different state, F3), registers them, lets the cycle-open alert carry them, texts every member of a bridged roster once,
> in their own language, naming the family as `-180` rules, and settles what the bridge does when a text cannot go (the ladder as the
> fallback — FS3) and what the recovery sweep does to a bridged cycle (FS10). **Day-one output: still no SMS** — no template id is set
> until the go-live row's legs close, and no Pariwar is declared degraded. (Were one declared before then, a bridged member's text would
> end 5.11b's terminal `config:dlt_template_id_missing:<locale>` and the ordinary ladder would run exactly as it does today, with 5.11b's
> one alarm per key per 5 minutes while such a member exists — expected, not a fault.)
>
> **What it REUSES:** the 5.11b send seam (`alert-sms-send.ts`) and its record `alert_sms_sends`; the registry shape
> (`contribution-sms-templates.ts`); `smsMemberName` / `MEMBER_BOX_SLOTS`; `smsPoolLabel`; `readMemberTextLanguages`; the lit-kind
> bounded jobs; the DLT lockstep helpers and the CI gate.
>
> **What it CHANGES:** the alert contract (`AlertSmsMessage` + an optional `sms` block on the `alert_published` payload, allowed only when the alert is
> `time_critical`); the registry
> and `contribution.json`; `alertSmsBlock` and the bridge path in `fanOutAlert`; `shouldRetryFanOut`; the cycle-open producer (builder +
> child); the recovery sweep's signal; ONE migration (two CHECKs on `alert_sms_sends`) with its schema constants; the admin declare form
> and banner (one sentence); the DLT sheet; a roster row; the gate's lists and the tests that pin today's dark state.
>
> **What it READS and leaves alone:** `evaluateDegradedModeBridge` and `DEGRADED_MODE_BRIDGE_CHANNELS`; `dispatch` / `cascade` /
> `CANONICAL_CHANNEL_LADDER`; the declaration substrate and `openCycleAlert`'s semantics; cost-optimization; OTP; the per-member
> fallback's three texts and their reach; the Trust's announcement channels (row `5-14`); the degradation-policy framework documents.

## Story

As a **member of a Pariwar the Trust has declared degraded**,
I want **a short text message, in my language, when a new cycle opens for my pool**,
so that **I do not miss a cycle opening — and the record of what I missed — only because the app's notification could not reach me**.

(5.8b words, carries and sends this text; 5.8 built the declaration; 8.1 / 8.8 deliver the signal.)

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| Architecture §3.4 channels list + "Power-saver awareness" bridge paragraph | quoted at G1 | treated as ratified (G1) |
| PRD RA-29 / TRAI line (`prds/prd-TWT-2026-05-22/addendum.md`, `prd.md`) | *"SMS (preserved surfaces: OTP, step-up OTP, per-member transactional fallback, Pariwar-degraded-mode cycle-open bridge) … Bulk-alert SMS dropped"*; DLT registration required for *"degraded-mode cycle-open-bridge SMS"* | committed |
| epics.md Story 5.8 | *"every eligible member receives the SMS regardless of channel-tier rules; cost impact is accepted as the trade-off for reach during degradation"* | planning text — ⛔ a decision entry (G3) |
| `2026-09-02-180` Q1 | the full name on *"④ the cycle-open push / WhatsApp / SMS copy (8.8)"*; no consumer excluded, no split | RATIFIED — binds FS6 (G4) |
| `2026-10-22-379` Q1 A | the 60-letter rule over two 30-letter boxes, scoped to the four claim texts | RATIFIED — PQ1 asks about a fifth text (G5) |
| `2026-10-23-389` FS10 (a) | the bridge stays DARK; a bridged send runs the normal ladder; *"the bridge's words are a new backlog row"* | author-commit — BUILT by 5.11; this row is the new row |
| `2026-10-23-390` | per-member fallback widened for THREE notices; *"⛔ A return of bulk-alert SMS"*; pool opening not texted | RATIFIED — G6 |
| `2026-10-25-404` (5.11b) | the real alert SMS send: `alert_sms_sends`, at-most-once per (alert, member, occasion), the member's language resolved at the producer, a structural cap by CHECK; *"Not covered: the degraded-mode bridge's words (row `5-8b-…`)"* | author-commit — BUILT |
| `2026-10-21-375` "Does NOT cover" | *"any SMS consent (row 5-11)"* | open → roster Row 40 (f) (G7) |
| Roster Row 40 `member-alert-sms-fallback-live` | legs (a)–(g): templates, Hindi review, provider answers, price, device, consent, suppression hook | OPEN — shared legs (FS12) |
| degradation-policy README §4 (3, 6), §5, §14; `comms-templates/sms-channel.md` | G8 | framework, sign-off conditional on the marker |

## ⭐ THE INVARIANTS

- **I1 — Registered text = catalogue text, byte for byte.** The registry's `registeredText` is the `sms.cycle_open_bridge` string from
  `contribution.json` with each `{param}` as `{#var#}`, checked through the REAL `t()`; the DLT sheet row matches. *Proof:* AC2.
- **I2 — Only a bridged cycle-open is ever texted by this path.** A text goes only when `evaluateDegradedModeBridge` bridges (category
  `alert_published` AND `time_critical`) AND the alert carries a bridge `sms` block. News, surveys, moderation, helpdesk replies and the
  staff push share the category but hard-code `time_critical: false` and carry no block; the contract REFUSES a block on an
  `alert_published` whose `time_critical` is false (FS7), and a block on any alert that is not bridged is ignored.
  *Proof:* AC9.
- **I3 — At most one text per (alert, member).** The send record's UNIQUE key (`alert_id`, `member_id`, `occasion`) — a job retry, a
  recovery-sweep re-run, an idempotency-key purge or a second declaration never texts a member twice. *Proof:* AC3, AC6.
- **I4 — No bridged member is reported `sent` without a real send, and every non-send names its reason.** The rung never reaches
  `createFixtureSmsProvider`. *Proof:* AC5.
- **I5 — The family's name is `-180`'s, whole or not at all.** The label the presentation mode resolves, in the two 30-letter boxes;
  a name the fitter cannot place WHOLE is not texted until PQ1 is ruled (the producer omits that member's block and the job raises ONE
  alarm with the count — never the name) — never truncated, never dropped from the text. *Proof:* AC4.
- **I6 — The member's language, never the other.** The recipient's own choice, else their Pariwar's default, resolved at the producer
  (5.11b FS5); a missing template id for that language is a terminal named refusal, never the other language. *Proof:* AC4.
- **I7 — Hindi parity and review.** en + hi for the message; the catalogues carry the `$comment.sms` reviewed-state key in both.
  *Proof:* AC2.
- **I8 — The frozen channel core and the pure primitive do not move.** `dispatch`, `cascade`, `CANONICAL_CHANNEL_LADDER`,
  `evaluateDegradedModeBridge` and `DEGRADED_MODE_BRIDGE_CHANNELS` are consumed unedited; `channels-determinism` stays green. *Proof:* AC11.
- **I9 — The bridge signal is the declaration at the freeze instant, everywhere.** The primary enqueue and the recovery sweep derive it
  from the same read at the cycle's `committed_at` (8.1); nothing re-reads the declaration at notify-time `now()`. *Proof:* AC7.

## 📜 Policy meaning (AI-10-1)

**5.8b introduces a predicate that decides whether a member is TOLD, by text, that their cycle has opened.** The predicate gates no
benefit, but what the member would miss does: a missed cycle counts under R7's lapse / restoration ladder and toward R8's ninety-percent
rule (`packages/domain/seed/niyamavali-v1-clauses.sql`), so it can decide whether the member's family can claim. In the member's terms
(FS4 (a)): *"If the Trust has declared your Pariwar's notifications unreliable, you are texted when a new cycle opens for your pool —
whether or not you use the app or WhatsApp — in the language you chose, naming the family you are supporting; if for any reason the text
cannot go, the app and WhatsApp still try, and the alert is always in the app."* **Niyamavali check — done 2026-10-27, with this
result:** a case-insensitive search of `niyamavali-v1-clauses.sql` for *sms | text message | bridge | degraded | notif* finds nothing —
no clause names SMS, the bridge or a notification duty; R10(B) (in the PRD, `prds/prd-TWT-2026-05-22/prd.md`, not in the seed file) says *"Missed information is the member's responsibility"* with the
in-app surface as the official channel, so the text is CONSISTENT with the Niyamavali as written and R10(B) does not presume a member
was told before a missed cycle counts. (The Niyamavali is a rulebook, not a ratified spec — [[feedback_niyamavali_rulebook_not_spec]].)

## ⭐ FOUND FACTS (at `4e57fa42` — re-run each at Task 0.1; traced to code, not read from prose)

**The bridge today**
- **F1 — it is dark, and it does nothing else.** `fanOutAlert` calls `evaluateDegradedModeBridge({ category, degradedModeActive:
  alert.time_critical })` (`apps/jobs/src/scheduler/contribution-notify.ts:372-375`); `bridge.channels` is not read anywhere in `apps/jobs`.
  When `bridge.bridged`, the SMS rung returns `skipped_no_target` / `sms_bridge_not_lit` (`:414`) BEFORE the lit / eligible checks; the
  member otherwise runs push → WhatsApp, and the result says `bridged: true`. The AR-20 behaviour (SMS only, bypass the ladder and
  cost-optimization — `packages/channels/src/degraded-mode.ts`) exists nowhere in jobs. The file's header (`:14-21`) records 5.11's FS10 (a) but still
  frames the bridge as 8.8's SMS-only send and promises words in row 5-8b. Tests that pin the dark state (re-find by name): `contribution-notify.test.ts` — the BRIDGED legs (~`:389-427`), the I3
  leg (~`:636-650`), the R1 leg (~`:744-761`). ⚠ No live-DB test drives a bridged fan-out end to end; `contribution-notify-live`,
  `ai-8-3-ladder-armor-live`, `alert-sms-send-live` and the split-live test all use `time_critical: false`.
- **F2 — the trigger chain is BUILT end to end** (traced, not read from comments): `getActiveDegradedMode`
  (`packages/domain/src/degraded-mode/declarations.ts`) → `openCycleAlert` reads it at the cycle-freeze `committed_at` and sets
  `time_critical = active?.mode === CYCLE_OPEN_SMS_BRIDGE_MODE` (`packages/domain/src/alert/project.ts:437-449`; live-DB proof
  `cycle-open-derisk.spec.ts`) → `cycle-spawn.ts` enqueues the cycle-open alert after the freeze → `cycle-open-alert.ts` forwards
  `timeCritical` → the boot enqueue → the parent copies it to each pool child → `buildCycleOpenAlert` → `envelope()` stamps
  `time_critical` on each member's alert → `fanOutAlert`. `registerDegradedModeModule(app, deps)` is CALLED (`apps/api/src/server.ts:251`);
  `pariwar.declare_degraded_mode` is held by `pariwar_admin` + `super_admin` (holder-set test `roles.test.ts`); the admin route
  `/p/$pariwarId/degraded-mode` is in the router, **un-linked** (direct URL; `router.tsx` says so). ⇒ **no broken link.**
  **TIMING:** the declaration must be effective at the freeze instant; the declare contract rejects an `effectiveFrom` more than 5 minutes
  in the past (`NO_BACKDATE_GRACE_MS`), so declaring AFTER a cycle froze never bridges that cycle. ⚠ The comments say `time_critical` is
  "copied verbatim"; `openCycleAlert` actually RE-DERIVES it on every call (also on its idempotent no-op path).
- **F3 — ⭐ THE ROW'S PREMISE IS WRONG ABOUT THE DRAFT.** The sprint-status row, deferred-work and 5.11's FS10 call
  `docs/degradation-policy/comms-templates/sms-channel.md` "the bridge's words". Its body — *"TWT Pariwar: Sanchalan mein asthayi deri.
  Aapka sahyog chakra normal hai. Sthiti {expected_return_date_short} tak. Madad: {fallback_handler_phone_short}. - Trustee Panel"* — says operations are
  delayed and the member's cycle is normal; it does not say a cycle opened. It is the degraded-**POSTURE** notice: posture is declared by
  ≥ 2 trustees when the Solo Builder has been unreachable for 7 consecutive days (README §14.1–14.2) — a different state from 5.8's
  degraded **mode** (a Pariwar-level declaration). The draft is Hinglish (the other four channels' primary is Devanagari Hindi), untyped
  (deferred-work: *"the story that wires it"* must type it), carries a helpline-number placeholder no Pariwar provisions (5.11 FS4 (c)),
  and wears the PENDING LEGAL REVIEW marker. Its own header: the bridge path fires it *"for time-critical templates; for degraded-posture
  activation, the trigger is operations-policy-gated … default = no, the public-page banner is sufficient"*. ⇒ 5.8b writes NEW words
  (FS1); the draft is neither registered nor edited (FS14). ⚠ Contrary source, addressed: README §5's table treats `sms-channel.md` as
  the bridge's *"same template body"* — written 2026-05-29, before Story 5.8 (2026-07) existed, for posture content (G8).

**Why the cycle-open alert cannot be texted yet**
- **F4 — the alert has no place for a text.** The `alert_published` variant is `.strict()` with `{ title, body }` only
  (`packages/contracts/src/alerts/alert.ts:146`); `AlertSmsMessage` has three keys (`:80`); `sms: AlertSmsBlock.optional()` exists on
  `deadline_reminder` (`:161`) and `contribution_mismatch` (`:181`) only; `CycleOpenPayloadData` and `buildCycleOpenPayloadData`
  (`contribution-loop-templates.ts:261`, `:342`) take no `sms`; `alertSmsBlock()` (`contribution-notify.ts:257-265`) has
  `default: undefined`. The cycle-open builder (`contribution-notify-triggers.ts:321-350`) holds `pool` (`poolName ?? poolLetterCode`),
  `family` (`deceasedDisplayName`, mode-resolved) and `amount`; it holds no date (the text needs none).
- **F5 — the send seam and the record refuse it.** `alert-sms-send.ts:88-89, 344-347`: an occasion outside `ALERT_SMS_SEND_OCCASIONS`
  ends the rung `skipped_no_target` / `notAttempted` with an alarm — and the cycle-open child already passes the occasion `'cycle_open'`
  (`idempotencyScope` falls through to it; `fanOutCall(job, scope)` at `contribution-notify-triggers.ts:953`), which is not one of the
  six. The DB: `alert_sms_sends_occasion_check` (six literals) and `alert_sms_sends_message_check` (three) at
  `packages/domain/migrations/0184_alert-sms-sends.sql:54-55`, mirrored by `schema/alert_sms_sends.ts` (`ALERT_SMS_SEND_OCCASIONS`
  `:22-29`, `ALERT_SMS_SEND_MESSAGES` `:33`, the drizzle `check()` copies `:93-97`); 0184's header: *"at most six texts per member per
  real cycle BY CONSTRUCTION"*. The CRQID kind `as` is per SEND ROW, not per message — ⛔ CRQID change, and the report lookup
  (`reports.ts`) is unchanged. `alert_sms_sends.alert_id` is an FK to `alerts`; the cycle-open alert row is projected before the notify
  enqueue (`project.ts`, `cycle-open-alert.ts`), so it is satisfied by reading — **UNPROVEN by a test** (5.11b's proof covered the
  deadline, pending-match and matcher producers): AC3 adds the live-DB leg.
- **F6 — the cycle-open child is not a lit kind.** `isLitPoolPayload` (`contribution-notify-triggers.ts:654-656`) is true for day 10 and the
  escalated tier only; it gates the text-language read (`readMemberTextLanguages`, `:813-815`), `smsLocale` (`:903`, `:916`), the 8-member
  job bound `LIT_KIND_JOB_MEMBER_LIMIT` (`:113`, split `:609-614`, oversized-job guard `:773-777`, chunk `:781`). A cycle-open pool job
  carries the WHOLE roster in 200-member chunks, claimed up front under a 300 s TTL.
- **F7 — the cohort.** The cycle-open roster is the members of the LATEST persisted pool snapshot (`listCycleBindingCandidates`), i.e.
  members `is_assignable` at the freeze `committed_at` — INCLUDING grace and suspended members whose obligation remains
  (`apps/jobs/src/assignable-roster.ts`). There is no notify-time state filter, and production injects NO lifecycle-suppression hook
  (`apps/jobs/src/boot.ts`, the comment above `alertSms:`; roster Row 40 (g)). Whether `is_assignable` excludes a frozen or
  deceased-overlay member is **UNCLEAR** — not traced into the validity service. A rostered ERASED member's mobile decrypts to the
  sentinel `[anonymized]`; `resolveSmsTarget` returns a target and `msg91Mobile` rejects it locally (`rejected_invalid_number`, a row and
  two audit lines, no text) — by reading, not executed. `resolveSmsTarget` gates on no opt-in, consent, DND or state (*"SMS has NO opt-in"*).
- **F8 — the retry rule's bridged arm was written for the fixture world.** `shouldRetryFanOut` (`contribution-notify.ts:584-596`): after the
  5.11b retry-class check, `if (result.bridged) return ctx.targets.sms === null;` (`:588`) is `2026-10-23-394` item 1's ruled retry rule —
  *"retried ONLY where the old fixture would have completed them — an available, unsuppressed SMS target, or an FS3 named WhatsApp
  refusal …, or a bridged member with an SMS target"* — which preserved the pre-5.11 world in which a bridged member with an SMS target
  "completed" through the fixture. Once the bridge sends, a bridged member with a target whose text met a retryable refusal would be
  recorded `in_app_only` at once. Removing the arm supersedes `-394` item 1 in part (AC0).
- **F9 — the recovery sweep de-bridges, by documented design.** `runContributionNotifyRecoverySweep` re-enqueues with
  `timeCritical: false` (`contribution-notify-triggers.ts:1118`; comment: *"`false` is the fail-safe: it can only cost the degraded-mode
  SMS BRIDGE on a recovered cycle"*); the `alerts` projection has no `time_critical` column; no test pins the value. A member is
  un-keyed (so swept) after a child job exhausts its 4 retries, or if the hourly purge of expired idempotency rows (300 s claim TTL) has
  emptied the count — the latter **inferred, not run**; the same mechanism is proven live for pending-match, and deferred-work already
  records that the sweep's probe "assumes `idempotency_keys` rows are effectively permanent". The send row keeps any re-run at-most-once.
- **F10 — `resolveDegradedModeActive` is a dead export** (`apps/api/src/modules/degraded-mode/composition.ts`; zero callers). Its comments
  and `server.ts` describe a "future live fan-out" composing it; the fan-out takes the signal from `alert.time_critical` instead — by
  8.8's design (a notify-time re-read would break replay). ⛔ Wire it.
- **F11 — what a trustee sees.** The active banner reads *"⚠ Degraded mode ACTIVE — the cycle-open SMS bridge is armed."*
  (`DegradedModeBanner.tsx`) — **untrue today**: nothing is texted. The declare form has Mode / Expires at / Reason and no statement of
  what declaring does. The module is hard-coded English (5.8's review accepted that) and has NO admin-side test.

**Cost, limits, and the words**
- **F12 — the words' numbers**, run through the REAL `checkDltTemplateShape` on 2026-10-27: no problems; 3 variables; fixed share 48.3 %
  (en) / 48.9 % (hi); at the longest values 174 characters → 2 GSM-7 parts (en) and 176 → 3 UCS-2 parts (hi). A typical case (letter-code
  pool, a 25-letter name) is ≈ 110 characters → 1 part (en); ≈ 112 → 2 parts (hi). Three variables need the sheet's exigency line:
  templates 7–14 already carry three (the name in two boxes, `-379` Q1 A), each with a justification line in the sheet's "Shape rules" —
  the precedent; templates 17–22 carry at most two.
- **F13 — per text, today (agent-traced, not run):** three short transactions (lookup, begin, finalise — finalise retried at 200 ms / 1 s),
  two audit lines (`alert.channel_send`, `alert.dispatch`), each its own transaction under the deployment-wide audit-chain advisory lock
  (`AUDIT_CHAIN_LOCK_KEY`, `write.ts`), one rendered-message HMAC (KMS), one mobile decrypt (KMS), one MSG91 request (≤ 10 s). The jobs DB
  pool is `max: 2`, shared by every worker; members are processed sequentially within a job; pool jobs run 8 at a time per process.
  **No per-member budget** (`checkAndConsumeSmsBudget` / `sms_rate_buckets` have no callers; 5.11b chose the structural CHECK), **no
  per-Pariwar or global send limit, no pacing, no MSG91 batching** (one recipient per request; a 429 becomes `rate_limited` → retry →
  dropped on the final attempt). Nothing refuses a Pariwar-wide burst by policy; how long one takes is **unmeasured** (roster leg
  (d)). The template-id lookup is memoised 5 minutes; the MSG91 pre-flight 1 h / 5 min / 60 s and fails open on this path.
- **F14 — the records' state.** DLT sheet: templates 1–22 (17–22 are 5.11's; wording section "templates 17–22 (Story 5.11 …)", cost
  section, rejection table, Record table; MSG91 setup step (3) lists Unicode vs Normal by ordinal) — the next free ordinals are 23 and 24.
  Roster: Row 40 `member-alert-sms-fallback-live` has SEVEN legs (a)–(g) and says "six templates" and "three notices" — ⛔ the bridge's;
  Row 41 is the highest. `scripts/dlt-typed-variables/lib.ts` `REGISTRY_FILES` already lists `contribution-sms-templates.ts`.
- **F15 — governance state.** No `.decision-log.md` entry rules on Story 5.8's declaration, AR-20, the bridge's trigger, cost or words
  (grep 2026-10-27); `-389` §1 item 6 keeps it dark and homes its words here. Roster / decision / ledger numbers: see the header. The Trust's announcement channels (row `5-14-trust-announcement-channels`, backlog) will reuse BigDev's
  pool-open words for a channel post; that is a different artifact and a different catalogue key, if ever.

**The guards this story deliberately rewrites (they are not obstacles to dodge)**
- **F16 — 5.11's I5 says "no pool-opening text exists", in code and in tests.** `contribution-sms-templates.ts`'s header
  (*"⛔ A pool opening and the cycle's last day … ⛔ Any broadcast … — I5"*); `contribution-sms-templates.test.ts` — the exact three-message list
  (`:68`), the "I5" test that joins the registry keys into one string and asserts it contains none of `pool_open`, `last_day`,
  `cycle_open`, `news`, `survey`, `moderation`, `alert_published` (`:73-83` — a SUBSTRING check, so `cycle_open_bridge` trips it), the
  `toHaveLength(3)` on `sms.*` keys (`:173`), `ORDINAL: Record<AlertSmsMessage, …>` (`:39`); and the RLS regression spec
  (`alert-sms-sends-policy-regression.spec.ts:280-284`) which asserts the DB REFUSES the occasion `'cycle_open'` and a message
  `'cycle_open'`. ⚠ THREE more guards, omitted from this list's first draft, bear on FS7: `packages/contracts/tests/contribution-loop-templates.test.ts:464-478`
  (`it.each` over four categories — a planted `sms` must fail) and `apps/jobs/tests/contribution-notify-triggers.test.ts:1282-1288`
  (*"an `alert_published` … CANNOT carry the block: the contract refuses it"*) — both build an envelope with `time_critical: false`, so
  under FS7 (a) they stay green UNCHANGED — and `contribution-sms-templates.test.ts:92` (every registry entry's slots must not contain
  `member1`; it fails for `cycle_open_bridge`). They guard `-389` / `-390` (the per-member fallback texts three notices and no general one). The bridge is the §3.4
  carve-out, not the per-member fallback (G6) — so these tests are REWRITTEN to say what is now true (the three per-member notices, plus
  ONE bridge message that exists only on a bridged alert), each rewrite stating what it replaced. The names are not changed to slip past them.

## ⚖️ Build decisions (⭐ = recommended) — PROPOSED for BigDev at Task 0.2

Each is the author's (§0) unless it says PQ. Answer by letter; a bare letter means the option's outcome AND its cost line.

- **FS1 — what the bridge says (F3).** ⭐ **(a) the cycle-open notice, in BigDev's own reviewed words** — Story 5.11's pool-open
  "CHANNEL DRAFT" (en + hi), verbatim, as message `cycle_open_bridge` (table below). The bridge exists *"so that no member misses a
  cycle-open alert"* (5.8); BigDev reviewed and corrected these words in session on 2026-10-23. *Cost (a):* three variables (the third
  needs the sheet's exigency line — F12); at the longest values 2 en / 3 hi SMS parts (typically 1 / 2); the Hindi-review leg must be
  recorded for THESE strings (`-389` item 12 discharged it for the three texted strings only). **(b) the degraded-POSTURE notice in
  `sms-channel.md`.** *Cost (b):* it tells a member nothing about their cycle, belongs to a state that needs ≥ 2 trustees and 7 days
  of the Solo Builder's silence, is Hinglish and untyped, and the framework itself says a posture SMS to all members is not an
  available fire-condition without an ADR (README §5, "Zero-comms-path cohort"). **(c) both.** *Cost (c):* (b)'s objections plus a
  second template.
- **FS2 — the trigger reading (G2).** ⭐ **(a) accept it:** a manual declaration is the trustee's attestation that the Pariwar is
  degraded; the WhatsApp-off conjunct belongs to the automatic detector (deferred); recorded in the decision as the AUTHOR'S reading of
  two documents, named in its "How much to trust" part. *Cost (a):* a trustee can declare for a Pariwar whose WhatsApp works, and every
  rostered member is texted at the next cycle — the epic's third scenario, as written. **(b) route it** as a Panel question before the
  bridge is used (*"may the Trust text a whole Pariwar when its WhatsApp is on?"*). *Cost (b):* a note; the bridge stays unprovisioned
  meanwhile (it is anyway). **(c) add a code check** — bridge only when the Pariwar's WhatsApp toggle is off. *Cost (c):* it narrows the
  epic's second scenario (WhatsApp API down system-wide, the toggle still on) — the Panel's.
- **FS3 — what a bridged send does (F1, F8).** ⭐ **(a) the text FIRST, the ladder as the fallback:** for a bridged alert the fan-out
  tries the bridge text before push; `sent` ⇒ the member is delivered by SMS and push / WhatsApp are not run; anything else (no SMS
  target, no template id, a name the fitter cannot place whole, a refusal) ⇒ the ordinary push → WhatsApp ladder runs and its SMS rung
  ends the named `sms_bridge_already_tried`. This is the epic's *"regardless of channel-tier rules"* and 5.8's *"does not wait for
  push/WA to fail"*; `DEGRADED_MODE_BRIDGE_CHANNELS` and the primitive stay unedited (the composition sequences them); a member the text
  cannot reach still gets the push 5.11 gave them. *Cost (a):* a member whose text went gets no push for that alert (the alert is in
  the app; the Telegram mirror is independent and unchanged); a Pariwar declared while its push works loses the push that cycle.
  **(b) SMS only** (8.8's original shape). *Cost (b):* a member the text cannot reach gets nothing from the fan-out. **(c) the text
  beside the ladder** (the Telegram-mirror shape). *Cost (c):* a member with working push is told twice, and "delivered" and "retry" fork
  — a text that failed transiently must retry although the member is delivered.
- **FS4 — who is texted (AI-10-1).** ⭐ **(a) every member of the bridged cycle-open roster who has an SMS target** — regardless of
  push, WhatsApp or a WhatsApp yes (SMS has no opt-in — `resolveSmsTarget`). The roster is what 8.8 enumerates: members assigned to a
  pool at the freeze (`is_assignable` at `committed_at`, F7). One named predicate, the dev's name. *Cost (a):* production injects no
  lifecycle-suppression hook (Row 40 (g)), so a frozen or bereaved member on the roster is texted like the rest; consent is counsel's
  (Row 40 (f)). **(b) also require the push rung to have failed.** *Cost (b):* that is FS3 (c)'s ladder-then-text — it contradicts the
  bridge's point (push is what is unreliable).
- **FS5 — the cycle-open child joins the lit kinds (F6).** ⭐ **(a)** a time-critical cycle-open pool payload counts as a lit kind: the
  members' text languages are read in the identity scope (5.11b FS5 (a)); the pool splits into bounded jobs of ≤ 8 members in ONE atomic
  insert and its claim chunk is 8; a Pariwar with no passport row omits every block for the job with ONE alarm and the push unchanged.
  *Cost (a):* N/8 jobs per pool, only when bridged; even 8 members can outlive the 300 s claim TTL (worst case ~40–50 s each) — a lapsed
  claim risks a duplicate push, never a second text (the send row stops that); 5.11b's F6 stays OPEN. **(b) keep whole-pool jobs.**
  *Cost (b):* one job of hundreds of sequential sends outlives its claim and its retry unit is the whole pool. **(c) the Pariwar's
  language for everyone.** *Cost (c):* a member who chose Hindi gets English — against 6.35's screen promise and `-404` FS5.
- **FS6 — the name (G4, G5; PQ1).** ⭐ **(a)** the family label as the presentation mode resolves it, through `smsMemberName` into the
  two boxes; ONLY the `full` form is sent. A `shortened` or `too_long` result means the producer omits that member's block (the
  ladder then runs, FS3, its SMS rung ending `sms_message_not_lit`) and the job raises ONE alarm, `alert_sms.name_over_60_unruled`, with
  the count and never the name, until PQ1 is ruled — then a one-function change. *Cost (a):* a member whose family label is over 60
  letters is not texted (rare; the alert is in the app); the trail cannot name the reason because the block is absent. **(b) apply `-379`'s rule now** and ask the Panel to confirm without
  blocking. *Cost (b):* the author extends a ratified rule's scope by building it first. **(c) omit the name.** *Cost (c):* a split
  `-180` forbids — the Panel's.
- **FS7 — how the alert carries the text (F4).** ⭐ **(a)** an OPTIONAL `sms` block (`AlertSmsBlock`, message `cycle_open_bridge`) on the
  `alert_published` payload, built by the cycle-open builder from the SAME locals as the push params, only when `timeCritical`, and
  honoured ONLY on a bridged alert (I2), **and the contract refines `Alert`: an `alert_published` may carry a block ONLY when its
  envelope `time_critical` is true** — so the contract keeps refusing a block on news, surveys, moderation, helpdesk and the staff push
  exactly as it does today; the template sits in the SAME registry and enum as the three per-member notices (one seam
  lookup, one record, one gate list), and the F16 guards are rewritten to a positive statement of what exists. *Cost (a):* `Alert` becomes a
  refined union (run `pnpm contracts:emit-openapi`; grep every consumer — none uses `Alert.options` / `.shape` today); one hole remains by
  construction — a FUTURE producer that sets `time_critical: true` on an `alert_published` could carry a block — closed by AC9's
  enumeration test; the registry guards of F16 change, the two contract-level ones do not. **(a′) the block without the refinement.**
  *Cost (a′):* the type admits a block on any `alert_published`, the two contract-level guards must be DELETED and a seam test becomes the
  only protection against a news alert being texted — a weakening of a guard; not recommended. **(b) rebuild the values in the fan-out** from ids. *Cost (b):* a
  second copy of the pool-label / name logic that drifts. **(c) a new alert category.** *Cost (c):* a nine-value enum, every consumer
  and the `alerts` CHECK — out of proportion. **(d) the template in its OWN registry file and enum.** *Cost (d):* F16's guards stay
  literally true, but the seam looks up two registries, the contract grows a second enum and `REGISTRY_FILES` gains a file — more moving
  parts to keep one message honest.
- **FS8 — the send record (F5).** ⭐ **(a) reuse `alert_sms_sends`:** ONE hand-authored migration replacing
  `alert_sms_sends_message_check` (+ message `cycle_open_bridge`) and `alert_sms_sends_occasion_check` (+ occasion `cycle_open` — the
  string the keyed store's scope and the child's `fanOutCall` ALREADY use, so "occasion = scope" stays true), with
  `ALERT_SMS_SEND_OCCASIONS`, `ALERT_SMS_SEND_MESSAGES`, the drizzle `check()` copies and the lockstep tests; the at-most-once key and
  the freeze trigger unchanged; 5.11b's *"six texts per member per real cycle"* becomes seven (recorded in the migration header and in
  the decision). *Cost (a):* a migration; 5.11b's deploy order applies (migration, then the api, then the jobs). **(b) a separate bridge table.** *Cost (b):* duplicates the lease / CAS / finalise
  machinery. **(c) no record.** *Cost (c):* not viable — no row id, no correlation id (5.11b F15).
- **FS9 — a bridged member's retry (F8).** ⭐ **(a)** the bridge text uses 5.11b's retry classes unchanged (rate-limited, in-flight,
  state-unavailable, Secret-Manager-transient: retried until the final attempt, then the ladder / `in_app_only`); `shouldRetryFanOut`'s
  bridged arm (`-394` item 1's *"or a bridged member with an SMS target"*, written for the fixture world) is replaced by the normal rule —
  superseding `-394` item 1 in part. *Cost (a):* the tests
  that pin the leftover change (AC6 names them). **(b) keep the arm.** *Cost (b):* a bridged member whose text met a retryable refusal is
  recorded `in_app_only` on the first attempt and never retried.
- **FS10 — the recovery sweep (F9; I9).** ⭐ **(a) re-derive:** the sweep takes the signal from the same read the primary path uses (the
  cycle's freeze `committed_at` + `getActiveDegradedMode`) — one shared function, two callers — so a recovered cycle is bridged as its
  first pass was, and the send row keeps it at-most-once per member. *Cost (a):* a shared domain function and one more read per swept
  alert; it replaces a documented fail-safe (*"`false` … can only cost the degraded-mode SMS BRIDGE on a recovered cycle"*). **(b) leave
  `false`.** *Cost (b):* when the first pass loses members — exactly when infrastructure is down — they are recovered by the ordinary
  ladder only and never get the text the bridge exists to send. **(c) persist `time_critical` on the alert projection.** *Cost (c):* a
  migration and a projector change.
- **FS11 — what a declaring trustee is told (F11).** ⭐ **(a)** one sentence on the declare form and in the active banner: *"While this
  is active, every member the next cycle assigns to a pool is sent a text message when that cycle opens. A cycle that has already
  opened is not affected, and revoking does not recall texts already started."* (English, hard-coded, like the rest of that module.)
  The banner's *"the cycle-open SMS bridge is armed"* then becomes true. *Cost (a):* the module has NO tests today (F11) — new RTL tests for the form and the banner are part of the cost. **(b) leave it.**
  *Cost (b):* a trustee can text a whole Pariwar without being told so.
- **FS12 — go-live (F13, F14).** ⭐ **(a) a NEW roster row** (the next free at Task 0.4; key `degraded-bridge-sms-live`), decision-authored,
  legs: **(a)** the two templates registered on SmartPing with their types, APPROVED, ids set under
  `sms.dlt.template_id.contribution.cycle_open_bridge.<locale>` — no id before its template is approved; **(b)** the Hindi string recorded
  as reviewed (BigDev's 2026-10-23 session — recorded here, not assumed); **(c)** the holders of `pariwar.declare_degraded_mode` named
  and matching the Trust's intent (G9); **(d)** a staging rehearsal — declare → freeze → cycle-open → a real text on a device, the
  revoke-after-freeze behaviour observed, and the MEASURED seconds per member and the roster size recorded, so the time to text a whole
  Pariwar is a number (F13: nothing paces or measures it today) — a figure BigDev finds too slow becomes a follow-up row; **(e)** the
  Pariwar-wide per-cycle cost line recorded with the per-part price. Row 40's
  (c) provider answers, (f) consent and (g) suppression hook, and Row 32's setup legs are cross-referenced, not duplicated. **(b) add
  legs to Row 40.** *Cost (b):* Row 40 gates three notices every Pariwar can send; one declaration-gated broadcast would hold or ride them.
- **FS13 — the Panel (§0).** ⭐ **(a) ONE short, non-blocking note:** PQ1 asked; the Pariwar-wide cost (G3) and the name (G4's MATCH)
  STATED, not asked. *Cost (a):* a note to write and send. **(b) no note.** *Cost (b):* a long family label is never texted and nothing
  records that the Panel saw the Pariwar-wide cost. **(c) block the build on an answer.** *Cost (c):* not recommended — nothing is live
  and the interim is safe.
- **FS14 — the framework documents (G8).** ⭐ **(a) untouched** (marker preserved, invariant 6); the pointer — *"`sms-channel.md` is the
  degraded-POSTURE notice, not the cycle-open bridge's words"* — is recorded in deferred-work and the roster row. **(b) a dated
  annotation at the top of `sms-channel.md`** (no marker change). *Cost (b):* edits a trustee-signed framework document and owes it a
  changelog row.

### The words (FS1 (a)) — BigDev's, reviewed and corrected in session 2026-10-23 (Story 5.11 Debug Log (a))

Key `sms.cycle_open_bridge` in `packages/i18n/locales/{en,hi}/contribution.json` (flat, beside `sms.deadline_not_recorded`); each
`{param}` is a slot NAME; the REGISTERED text is the same string with each `{param}` as `{#var#}`. Config key
`sms.dlt.template_id.contribution.cycle_open_bridge.<locale>`. Slots in order: `pool` (alphanumeric 30), then `member1` and `member2`
(`MEMBER_BOX_SLOTS`, 30 each, side by side, no separator — the sheet's shape rule for two alphanumeric boxes).

| Locale | Text |
|---|---|
| en | `TWT: your pool {pool} is open, in support of {member1}{member2}'s family. Please open the app to contribute.` |
| hi | `TWT: आपका पूल {pool} खुल गया है, {member1}{member2} के परिवार के सहयोग हेतु। सुविधानुसार ऐप खोलकर योगदान करें।` |

⭐ Run through the REAL `checkDltTemplateShape` on 2026-10-27 (F12): no problems; 3 variables; fixed share 48.3 % (en) / 48.9 % (hi); at
the longest values 174 characters → 2 GSM-7 parts (en) and 176 → 3 UCS-2 parts (hi). The dev re-runs it on the real registry. "TWT:" is
the only name (5.11 FS16 (b)). Tone: warm, plain, no urgency, no "must" — `docs/tone-guide.md`; the family is *"the family"* of the member,
never a "Late …" ([[feedback_never_mangle_member_names]]).

### PQ1 — for the Trustee Panel (ONE short note, non-blocking; FS13 (a))

**In one sentence:** when the Trust texts a whole Pariwar that a new cycle has opened — naming the family it supports — and the
family's full name is longer than 60 letters, may the Trust shorten it the way the Panel already approved for the claim texts (titles
dropped first, then first words to initials, never the last word)? **The one fact:** the text has room for 60 letters of name; the Panel
ruled the shortening for the four claim texts only (`-379`). **Options:** **A** yes, the same rule (cost: the name appears shortened in a
text every member receives); **B** no — such a family is not named, so such a member is not texted and relies on the app and the
ladder (cost: the member whose family name is longest is the one left out); **C** a different rule (cost: a new rule to build and word).
**Our reading: A** — the rule is built, tested and approved for the more sensitive texts. **Stated, not asked:** at most 2 en / 3 hi SMS
parts per rostered member per bridged cycle (typically 1 / 2), price per part not yet known; a trustee's declaration texts one Pariwar;
the family's name is on the text as `-180` rules; the trigger is a manual declaration whether or not the Pariwar's WhatsApp is on. Until
answered, the interim of FS6 (a) holds (such a member is not texted). "Shown to the Panel" only once SENT ([[feedback_shown_to_panel_means_sent]]).

## Acceptance Criteria

**AC0 — Governance before code (Task 0).** The author-commit decision (FS1–FS14 as answered; the §0 readings G1–G9 with FS2's reading
named in its "How much to trust this entry"; its Supersedes list — in part `-389` §1 item 6 (FS10 (a), *"the bridge stays dark"*), `-394`
item 1's retry clause *"or a bridged member with an SMS target"*, and 5.11's I5 clause *"no degraded-mode bridged send can reach a lit template"*; it EXTENDS `-404` FS8 (d) — the structural cap six → seven;
what it does NOT cover: consent, the price per part, the automatic trigger, the suppression hook, PQ1) is committed ALONE before any
record or code; the PQ1 note (FS13 (a)) is written from the template and its SENT state recorded truthfully; the records commit follows
([[feedback_governance_commits_precede_implementation]]).

**AC1 — The alert can carry the text (FS7).** `AlertSmsMessage` gains `cycle_open_bridge`; the `alert_published` variant and
`CycleOpenPayloadData` gain `sms: AlertSmsBlock.optional()`; `buildCycleOpenPayloadData` takes an optional `sms` and OMITS the key when
absent (the deadline builder's shape); the doc-blocks that say the block rides *"only the two variants"* are updated; every existing
fixture still parses (T8); `Alert` REFUSES a block on an `alert_published` whose `time_critical` is false and admits it when true.
*Legs:* parse with and without; `.strict()` still rejects an unknown key; an `alert_published` with a block and `time_critical: false` is
refused (the two existing guards, unchanged) and with `time_critical: true` parses.

**AC2 — Registered text = catalogue text (I1, I7; FS1).** `contribution-sms-templates.ts` holds `cycle_open_bridge` × hi / en with
slots `pool` (alphanumeric 30) then `MEMBER_BOX_SLOTS` (`member1`, `member2`), config key
`sms.dlt.template_id.contribution.cycle_open_bridge.<locale>`; `contribution.json` carries `sms.cycle_open_bridge` in en and hi (the
words above) and `$comment.sms` still names the REVIEWED state and now covers it; every entry passes `checkDltTemplateShape`; the CI gate
`dlt-typed-variables` passes (`REGISTRY_FILES` already lists the file — no edit); the i18n parity and microcopy gates pass. For each
locale the registered text equals the catalogue string with each `{param}` as `{#var#}`, read through the REAL `t()`
([[feedback_stub_must_call_not_transcribe]]); the DLT-sheet rows (next free ordinals, found by config key) match it and its MSG91
`##name##` form; the third variable carries the sheet's exigency line, as templates 7–14 do (*"`-180` Q1: the family's full name on the cycle-open SMS; the name
needs two boxes (`-379` Q1 A's shape)"*). *Legs:* one lockstep test per template; the planted-violation leg for each new gate, proven RED
first.

**AC3 — At most once, with a record that admits the occasion (I3; FS8).** ONE hand-authored migration (next free number at the time; a
journal entry whose `when` is above every sibling's) replaces `alert_sms_sends_message_check` and `alert_sms_sends_occasion_check`;
`ALERT_SMS_SEND_MESSAGES`, `ALERT_SMS_SEND_OCCASIONS` and the drizzle `check()` copies follow; the existing TS ↔ SQL lockstep tests pin the
new lists together; it applies on a fresh database and on one at `0185`. *Legs (live-DB, :5433):* an `cycle_open` / `cycle_open_bridge` row
inserts, `alerts` FK included (F5 — the proof 5.11b did not have for cycle-open); an unknown occasion and an unknown message are still
refused; a second send for the same (alert, member) — a job retry, a sweep re-run, a second declaration — finds `accepted`, sends nothing
and reports `sent`.

**AC4 — The producer (I5, I6; FS5–FS7).** Only a `timeCritical` cycle-open child builds blocks. Such a pool payload counts as a lit kind
(FS5): its members' text languages are read in the identity scope, it splits into jobs of ≤ 8 members in ONE atomic insert, its claim chunk
is 8, and a job already queued whole at deploy time is converted by 5.11b's legacy split rather than failing (T6). Per member: `locale` =
the recipient's; `{pool}` = `smsPoolLabel(identity, locale)`; the name = `smsMemberName(familyLabel)` — ONLY `full` becomes `member1` /
`member2`; `shortened` / `too_long` omits that member's block and raises ONE alarm per job with the COUNT. A Pariwar with no passport row
omits every block for the job with ONE alarm and the push unchanged. A non-time-critical cycle-open, the sweep without a signal, news,
surveys, moderation, helpdesk and the staff push build no block. *Legs:* both presentation modes (`full_name`, `shielded_name`) with a
fixture that REACHES each; 60 / 61 letters; a missing passport; the hi and en `{pool}` rules; the job split at 8 / 9 members.

**AC5 — The bridge path (I2, I4, I8; FS3).** In `fanOutAlert`, for a bridged alert that carries a block, when the member has an SMS
target and the seam is wired: the bridge text is attempted FIRST through the injected `alertSms` seam (so it goes THROUGH `dispatch`,
carrying `deps.suppression`), with `whatsappTried: false` (the bridge does not wait for §3.4's WhatsApp window); `sent` ⇒ the result is
delivered, `deliveredChannel: 'sms'`, push and WhatsApp are not run; any other outcome ⇒ the ordinary ladder runs, the bridge attempt is
on the trail first, and the ladder's SMS rung ends `sms_bridge_already_tried`. A bridged alert with no block ⇒ the ordinary ladder, SMS rung
`sms_message_not_lit`; with no seam wired ⇒ `sms_send_not_wired`; with no SMS target ⇒ the ladder, as today. `SMS_RUNG_DETAIL.bridgeNotLit`
is retired (and leaves `RECORDED_RUNG_DETAILS`), `sms_bridge_already_tried` joins it. The Telegram mirror is unchanged; cost-optimization is
unchanged (a time-critical alert is never suppressed). `evaluateDegradedModeBridge`, `DEGRADED_MODE_BRIDGE_CHANNELS`, `dispatch`,
`cascade` and the ladder are not edited. *Legs:* one test per branch above; the trail is asserted by outcome AND detail, never by provider
id ([[feedback_stub_must_call_not_transcribe]]); a mutant that drops the `bridge.bridged` condition turns the AC9 leg RED.

**AC6 — Who, and retry (FS4, FS9).** Eligible: a member of the bridged roster, with an SMS target, whose alert carries a block — regardless
of push, WhatsApp or a WhatsApp yes (one named predicate). `shouldRetryFanOut`'s `result.bridged` arm is removed: a bridged member's
retry follows 5.11b's classes (`ALERT_SMS_RETRYABLE_DETAILS` until the final attempt) and the ordinary rule. *Legs:* a bridged member
whose text is rate-limited retries and, on the final attempt, is recorded `in_app_only`; one whose text is `rejected_invalid_number`
(the erased member, F7) is terminal; the replaced tests name what they replaced (the Dev Notes' closed list).

**AC7 — The recovery sweep (I9; FS10).** The sweep takes `timeCritical` from the same read as `openCycleAlert` (the cycle's freeze
`committed_at` + the declaration; ONE shared function, two callers) — ⛔ a notify-time `now()` read. *Legs:* a swept bridged cycle's
members are bridged; a swept non-bridged cycle is unchanged; a re-run after members were texted sends nothing (AC3); the sweep test
asserts the value it passes (today none does).

**AC8 — What the trustee is told (FS11).** The declare form and the active banner carry the FS11 sentence; the banner's existing
*"armed"* line stays and is now true. *Legs:* new RTL tests (the module has none) assert the sentence on the form and the banner.

**AC9 — Not a bulk channel (I2).** A news, survey, moderation, helpdesk-reply or staff `alert_published` is never texted by this path: the contract refuses a block
on it (`time_critical` false), and the seam ignores a block unless the alert is bridged. *Legs:* a test per producer family; an enumeration test over every `alert_published` builder asserting it
hard-codes `time_critical: false` or is the cycle-open builder; 5.11's I5 tests (F16) rewritten to the positive statement, each naming what
it replaced.

**AC10 — Records and gates (FS12–FS14).** DLT sheet: templates 23–24 (next free) in the main table and the text table, a new wording
section "templates 23–24 (Story 5.8b …)" (the heading 17–22 test keeps its section), types and MSG91 forms (hi Unicode, en Normal), the
exigency line, segment counts at the longest values (computed from the real registry), a cost line (per rostered member per bridged cycle),
a rejection-table line, a Record line, a bullet under "Shape rules" for the three-variable justification, and Row 30 note (1)'s *"(d)'s provider answers also
cover 17–22"* extended to 23–24 by a dated note; `sms-segment-cost.test.ts` gains the rows. Roster: the NEW row (FS12 (a)) with its legs and
cross-references, and a dated one-line annotation on Row 40 pointing to it. `epics.md` `### Story 5.8b` between 5.8 and 5.9 (the 5.10
format). Architecture §3.4: a dated annotation (what the bridge says; FS2's reading; the cap seven) — never a rewrite. deferred-work:
5.11's bridge item annotated *"→ 5.8b — Closed by 5.8b effective when `done` on `main`"*; NEW items: the dead `resolveDegradedModeActive`
(F10), the un-linked admin page (F11), the posture-notice pointer (F3), the throughput / audit-lock note (F13), the idempotency-purge
inference (F9), PQ1 if unruled at `done`. The header comment of `contribution-notify.ts` (`:14-21`) and the registry header are updated.
Ledger by SAFE prepend ([[project_sprint_status_safe_prepend]]).

**AC11 — Nothing else moves.** The primitive and `DEGRADED_MODE_BRIDGE_CHANNELS`, `dispatch` / `cascade` / the ladder
(`channels-determinism` green), the per-member fallback's three texts and their reach (a regression leg: their trails are identical),
OTP, cost-optimization, the declaration substrate and `openCycleAlert`'s result, the category registry `sms-dlt-registry.ts`, the
degradation-policy framework documents; `pnpm ci:local` green with `DATABASE_URL` on :5433.

## Tasks / Subtasks

- [ ] **Task 0 — Governance (AC0)**
  - [ ] 0.1 Preflight: `git fetch origin`; rebase onto `origin/main`; run the pin checks (header); re-run F1–F16. **STOP and tell BigDev if:**
        **S1** a ruling on the bridge, its words or a pool-opening text exists (grep `^### Decision` newer than `-410` for *bridge*,
        *cycle-open*, *degraded*); **S2** another worktree or session edits any of `contribution-notify*.ts`, `alert-sms-*.ts`,
        `contribution-sms-templates.ts`, `packages/contracts/src/alerts/`, the `alert_sms_sends` schema or migrations,
        `apps/admin/src/modules/degraded-mode/`, `scripts/dlt-typed-variables/`, the roster or the DLT sheet (`git worktree list`;
        ListAgents; `git diff --name-only origin/main...<branch>` — [[feedback_shared_tree_branch_switch]]; sequence per `-366` decision 6 —
        at the pin only 11b-4a touches the roster and migrations); **S3** a number moved (decision id, roster Row, DLT ordinal, migration,
        ledger letter) — re-find it; **S4** a Pariwar is declared degraded in any environment a deploy reads (the lit bridge would text it);
        **S5** Row 30 (d) was answered with a per-variable limit other than 30 (the slot maxima and every count change); **S6** row `5-14` has
        started and fixed the pool-open channel words differently (one source for BigDev's words); **S7** F7's UNCLEAR is answered — trace
        whether `is_assignable` rosters a frozen or deceased-overlay member; if it does, say so BEFORE FS4 is answered (it changes who is
        texted).
  - [ ] 0.2 Put FS1–FS14, the words (en + hi) and PQ1 to BigDev; record the answers VERBATIM in Debug Log (a). If BigDev confirms the words
        in session, roster leg (b) still says *"whether that discharges this leg is recorded here, not assumed"*.
  - [ ] 0.3 Write the PQ1 note from `trustee-panel-routing-note-TEMPLATE.md` (§0 first; `trustee-panel-routing-note-YYYY-MM-DD-5-8b-…`),
        run its evidence commands, record it as NOT sent until BigDev sends it. Stage the author-commit decision (next free id) in the
        scratchpad; commit it ALONE (`governance:` prefix) — try the decision-log write first ([[project_decision_log_writes_user_inserted]]).
  - [ ] 0.4 Records commit (AC10's docs): `epics.md`, §3.4 annotation, the roster row + Row 40 annotation, the DLT-sheet section, deferred-work,
        the ledger entry by SAFE prepend + row `ready-for-dev → in-progress`.
- [ ] **Task 1 — Contract, words, registry, catalogue (AC1, AC2; FS1, FS7)**: the enum key; the `sms` field on the variant, the payload
      schema and the builder; the `Alert` refinement (a block on an `alert_published` only when `time_critical`; run
      `pnpm contracts:emit-openapi`, never hand-edit `openapi/v1.yaml`); the registry entries and `SLOTS`; `sms.cycle_open_bridge` in en and hi; `$comment.sms` coverage; the
      doc-blocks.
- [ ] **Task 2 — Migration and domain constants (AC3; FS8)**: the migration; `ALERT_SMS_SEND_MESSAGES`, `ALERT_SMS_SEND_OCCASIONS`, the
      drizzle `check()` copies; the journal entry; the header text (six → seven).
- [ ] **Task 3 — Producer and child (AC4; FS5, FS6, FS7)**: widen `isLitPoolPayload` to a time-critical cycle-open; `buildCycleOpenAlert`
      takes `smsLocale` / the block; the child reads the languages, fits the name, omits-and-alarms; the legacy conversion for
      `cycle_open`.
- [ ] **Task 4 — The bridge path and retry (AC5, AC6, AC9; FS3, FS4, FS9)**: `alertSmsBlock` gains the `alert_published` case, guarded by
      `time_critical`; the bridge attempt before the ladder; the trail; `sms_bridge_already_tried`; `shouldRetryFanOut`'s arm removed; the
      header comment.
- [ ] **Task 5 — The sweep (AC7; FS10)**: extract the freeze-instant read from `openCycleAlert` into one domain function; both callers use
      it.
- [ ] **Task 6 — The trustee screen (AC8; FS11)**: the sentence on the declare form and the active banner; their tests (the module has none today — new RTL tests).
- [ ] **Task 7 — Records (AC10; FS12–FS14)**: the DLT sheet (segment counts computed from the real registry with the longest values), the
      roster row text, deferred-work items.
- [ ] **Task 8 — Tests (AC1–AC11)**: rewrite the tests in the Dev Notes' closed list (each states what it replaced); add the first live-DB
      bridged end-to-end test; every new gate proven RED (the mutants in Testing standards).
- [ ] **Task 9 — Verify**: `pnpm ci:local` with `DATABASE_URL` on :5433 ([[project_prepush_hook_inherits_5432]]; known failures —
      [[project_known_livedb_test_failures]]); review the diff before commit ([[feedback_review_the_fix_diff_before_commit]]); commit on the
      story branch ([[feedback_commit_on_story_branch]]); do not push without BigDev's go-ahead.

## Dev Notes

### ⚠ TRAPS

- **T1 — The draft is the wrong message (F3).** Do not register `sms-channel.md`'s body and do not touch its marker (README §4 invariant 6).
- **T2 — The F16 guards are rewritten, not dodged.** Names stay `cycle_open_bridge` (message) and `cycle_open` (occasion); each rewritten
  test says what it replaced; the new positive guard: the only message not texted as a per-member notice is `cycle_open_bridge`, and it is
  texted only from a bridged `alert_published`.
- **T3 — `alert_published` is the broadcast category (F4; I2).** Key the text by the block AND `bridge.bridged`, never by category alone;
  prove RED by dropping the `bridge.bridged` condition AND by dropping the contract's `time_critical` refinement.
- **T4 — The seam refuses an unknown occasion silently (F5).** A missing migration or constant looks like a config fault
  (`sms_not_attempted` + an alarm), not a failure; the live-DB leg uses the REAL seam and record.
- **T5 — Two CHECKs, two TS lists, two drizzle copies and the policy-regression spec move together.** Hand-author the migration (never
  `db:generate` — 42P07), find its number at the time (11b-4a holds `0186` / `0187`), set its `when` above every sibling's, and check the
  journal's idx / `when` uniqueness after every rebase ([[project_live_db_test_gotchas]], [[project_sibling_migration_when_order_shared_db]],
  [[project_rebase_ledger_conflict_separator]]).
- **T6 — Widening `isLitPoolPayload` moves four things at once (F6):** the language read, the 8-member split, the oversized-job guard and the
  legacy conversion. A time-critical cycle-open job queued WHOLE before the deploy becomes "oversized" under the new predicate — prove the
  5.11b conversion handles `kind: 'cycle_open'`.
- **T7 — The signal is derived at the freeze instant, twice (F2, F9, I9).** Never a notify-time `now()` read; never
  `resolveDegradedModeActive` (F10).
- **T8 — Contracts tests run outside tsc** ([[project_contracts_tests_outside_tsc]]): keep `sms` optional on the `alert_published` variant;
  grep the fixtures.
- **T9 — The text language is the recipient's; the PUSH language is unchanged** (`deps.locale ?? DEFAULT_LOCALE`): a Hindi-choosing member
  in an English-default Pariwar may get an English push and a Hindi text — recorded, as in 5.11b.
- **T10 — The pool value is Hindi (5.11 T5).** Reuse `smsPoolLabel` (trimmed, ≤ 30 UTF-16 units, no invisible characters but the Devanagari
  joiners, basic GSM-7 in en; else the letter code) — never re-implement it.
- **T11 — One 30, one 60.** Import `MEMBER_BOX_SLOTS` and `smsMemberName`; the AST fence in `sms-member-name.test.ts` watches for retired
  helper names — a fifth caller must pass it; ⛔ a name, box or shortened form in a log line, alarm, detail or payload — the PQ1 alarm
  carries a COUNT.
- **T12 — Both presentation modes** (`full_name`, `shielded_name` — *"Rajesh S."*) flow through the same label; a fixture per mode
  ([[feedback_gate_scope_semantic_coverage]]: a fixture cheaper than reality hides the branch).
- **T13 — `whatsappTried` is false on the bridge attempt.** The 5.11b retry classes still apply.
- **T14 — Type-only import cycle:** the seam is INJECTED (`deps.alertSms`); `contribution-notify.ts` takes only a TYPE import from
  `alert-sms-send.ts` ([[project_type_only_import_cycle_trap]]). Hand-format; a JSDoc with `**` emphasis closes the comment
  ([[project_markdown_emphasis_closes_jsdoc]], [[project_prettier_not_enforced]]).
- **T15 — Declaring after the freeze never bridges that cycle (F2).** The FS11 sentence says so; do not "fix" it.
- **T16 — A rostered erased member is rejected locally (F7):** a terminal `rejected_invalid_number`, not a retry.
- **T17 — The admin module is hard-coded English** (5.8's review); do not add an i18n wrapper for one sentence.
- **T18 — Fixtures must reach the branch.** No live-DB test drives a bridged fan-out today (F1): the first end-to-end test declares, freezes,
  opens the alert, runs the child and the seam with a fake gateway, and asserts a send row — or the new path is green over unreachable code.

### Closed list of edit sites (traced 2026-10-27 — re-run the greps at Task 0.1)

| Layer | Site | Change |
|---|---|---|
| Contract | `contracts/src/alerts/alert.ts` — `AlertSmsMessage` (`:80`); the `alert_published` variant (`:146`); the `Alert` union; doc-blocks | key; optional `sms`; the `time_critical` refinement |
| Contract | `contracts/src/alerts/contribution-loop-templates.ts` — `CycleOpenPayloadData`, `buildCycleOpenPayloadData`; `contracts/tests/contribution-loop-templates.test.ts` (the I5 guard `:464-478` stays green; new legs for `time_critical: true`) | optional `sms`; tests |
| Registry | `apps/jobs/src/scheduler/contribution-sms-templates.ts` — `SLOTS`, `CONTRIBUTION_SMS_TEMPLATES` (typed `Record<AlertSmsMessage, …>`: a missing key is a compile error), header | entries; header |
| i18n | `packages/i18n/locales/{en,hi}/contribution.json` — `sms.cycle_open_bridge`, `$comment.sms`; gates `i18n-parity`, `microcopy.yaml` | keys |
| Domain | `packages/domain/src/schema/alert_sms_sends.ts` — `ALERT_SMS_SEND_MESSAGES` (`:33`), `ALERT_SMS_SEND_OCCASIONS` (`:22-29`), `check()` copies (`:93-97`) | + `cycle_open_bridge`, + `cycle_open` |
| SQL | NEW migration replacing `alert_sms_sends_message_check`, `alert_sms_sends_occasion_check` (0184 `:54-55`); `meta/_journal.json` | new |
| Fan-out | `contribution-notify.ts` — `alertSmsBlock` (`:257-265`), the bridge path / `smsRung` (`:413-440`), `SMS_RUNG_DETAIL` + `RECORDED_RUNG_DETAILS` (`:198-219`), `shouldRetryFanOut` (`:588`), header (`:14-21`) | per AC5, AC6 |
| Producer | `contribution-notify-triggers.ts` — `isLitPoolPayload` (`:654`), `buildCycleOpenAlert` (`:321-350`), the child (`:773-781`, `:812-815`, `:858-870`, `:903`, `:916`, the `buildCycleOpenAlert` call `:920-929`), the legacy conversion (`:1598-1640`), the sweep (`:1118`) | per AC4, AC7 |
| Domain | `packages/domain/src/alert/project.ts` (`:437-449`) — extract the freeze-instant read | one function, two callers |
| Admin | `apps/admin/src/modules/degraded-mode/{DeclareForm,DegradedModeBanner}.tsx` | one sentence; NEW tests |
| Gate | `scripts/dlt-typed-variables/lib.ts` `REGISTRY_FILES` | no edit (the file is listed) |
| Docs | DLT sheet (+ a "Shape rules" bullet); roster (+ Row 30 note (1), `:540`); `epics.md`; architecture §3.4; deferred-work; ledger | AC10 |
| NOT edited | `sms-dlt-registry.ts` (category registry, all-dark), the CRQID kinds / grammar (`as` is per row), `degraded-mode.ts`, `dispatch.ts`, `cascade.ts`, `sms-channel.md`, README | — |

**Tests that CHANGE (each states what it replaced):** `apps/jobs/tests/contribution-sms-templates.test.ts` — the exact three-message
list (`:68`), the I5 substring test (`:73-83`), `toHaveLength(3)` on `sms.*` keys (`:173`), `ORDINAL` (`:39`), the no-`member1` assertion
(`:92`, per message: the three per-member notices carry no name box, the bridge carries `member1` / `member2`), the `$comment` regexes
(`:160-165`), the sheet-heading test (`:189` keeps its section; a new test for 23–24); `alert-sms-send.test.ts` (`:433-436`, the
occasion list); `alert-sms-send-live.test.ts` (`:1359-1360`, six → seven rows; `:1332` COMBOS is a hand-typed three-message list and
stays valid); `packages/domain/tests/integration/rls/alert-sms-sends-policy-regression.spec.ts` (`:280-284`: `'cycle_open'` leaves the
refused OCCASIONS — the message `'cycle_open'` stays refused because the message is `cycle_open_bridge`; `:289` follows the constant);
`contribution-notify.test.ts` (the BRIDGED legs, the I3 leg — a bridged cycle-open now DOES drive the `alertSms` seam, the FIXTURE is
still never driven — and the R1 leg); `contribution-notify-triggers.test.ts` (`:1244-1262` and `:1552` stay valid; the sweep tests gain
the signal assertion); `sms-segment-cost.test.ts` (`:153-157`, two rows). **Stay green UNCHANGED under FS7 (a) — and gain legs for
`time_critical: true`:** `contribution-loop-templates.test.ts:464-478` and `contribution-notify-triggers.test.ts:1282-1288`.
**New:** admin RTL tests for the form and the banner (none exist); the live-DB bridged end-to-end test (T18).
`packages/channels/tests/degraded-mode.test.ts` and `sms.test.ts` stay valid.

### Reuse map

| Need | Reuse | Instead of |
|---|---|---|
| shape check, types | `dlt-variables.ts` (`DLT_VAR`, `DltSlot`, `checkDltTemplateShape`) | a new validator |
| registry, seam, record | `contribution-sms-templates.ts`, `alert-sms-send.ts`, `alert_sms_sends` | a bridge sender |
| name boxes and fitter | `MEMBER_BOX_SLOTS`, `smsMemberName` | a second 30 / 60 |
| pool value | `smsPoolLabel` | a second label rule |
| text language | `readMemberTextLanguages` (producer, set-based) | `getMemberLanguage` per member |
| bounded jobs | the lit-kind split and legacy conversion | a new splitter |
| lockstep tests | `apps/jobs/tests/_dlt-template-sheet.ts` (`sheetRowByConfigKey`, `expectRegisteredTextRow`) | re-parsing the sheet |
| the signal | `getActiveDegradedMode` at the freeze `committed_at` | `resolveDegradedModeActive`, a notify-time read |

### Testing standards

Vitest; the real `t()` for every copy assertion; one test per FS branch; assertions on trail outcome + detail, never provider id; live-DB
legs on :5433 (`DATABASE_URL` on the command) with separate transactions for DB-clock ordering ([[project_db_clock_ordering_tests_tie]]),
membership not counts. Mutants proven RED in Debug Log (b): drop the `bridge.bridged` condition (AC9); remove `cycle_open` from the CHECK
(AC3); the sweep passes `false` (AC7); the producer sends a `shortened` name (AC4); the lit predicate left unwidened (AC4, T6).

### Project structure notes

Registry, fan-out, producer in `apps/jobs/src/scheduler/`; the contract in `packages/contracts/src/alerts/`; the record in
`packages/domain/{migrations,src/schema,src/sms-delivery}`; the freeze-instant read beside `openCycleAlert` in
`packages/domain/src/alert/`; the screen in `apps/admin/src/modules/degraded-mode/`; records in `docs/launch-gate-inventory/` and
`_bmad-output/`. No pg-touching `@twt/domain` import into anything Metro bundles ([[project_contracts_domain_bundle_boundary]]).

### Sequencing

Other worktrees at the pin: `11b-4a-family-memorial-public-render` (roster edits, migrations `0186` / `0187`, ledger letters through
`-27q`; 6.32 holds `-27r`), `12-1-…`, `13-2-…`, `6-32-…` (no overlap found). 5.8b's migration sequences after 11b-4a's, or takes the next free number with a
`when` above every sibling's; expect ledger and roster rebase conflicts ([[project_rebase_ledger_conflict_separator]]). Row `5-14`
(`trust-announcement-channels`, backlog) is independent. The go-live row's legs gate the first real text, never a merge
([[project_not_in_production_merge_is_not_golive]]).

### Previous story intelligence

- **5.8** built the declaration, the pure primitive and the admin surface, and deferred the live application; its review fixed a
  future-dated-declaration coverage gap and a no-op-revoke audit line — the read predicate is `revoked_at IS NULL OR > at`.
- **8.1 / 8.8** made `time_critical` the bridge signal and built the live fan-out; 8.8's rule: composition problems are solved in the
  composition, never by editing a frozen primitive.
- **5.11 / 5.11b** built the honest rung and the real send; their review rounds are the source of T6, T9, T10 and the retry classes; 5.11's
  FS10 (a) is what this story lights, and its CHANNEL DRAFT words are FS1 (a).
- **6.37e** built the two name boxes and the fitter (*"the ONLY 30, the ONLY 60"*); **6.35** the member's language.

### Git intelligence

Recent history on the bridge-adjacent files (newest first): `ee60c36d` and `c60bdbed` (5.11b review fixes — bounded SMS jobs, locked
fresh-only reclaim, migration `0185`, atomic split enqueue), `6d037d27` (5.11b dev), `72fd1499` / `93ad0596` / `0684fcb1` (5.11), `75b8e9b2`
(8.8), `70ea9b35` (5.8). Stories land by fast-forward ([[feedback_land_prs_by_fast_forward]]).

### Latest tech information

No new library. The TRAI facts (≥ 30 % fixed; typed variables; Service-Implicit for a sender's own customers; one template ↔ one header)
are carried from Story 5.11's 2026-10-23 fetch and were not re-fetched; the consent reading rests on secondary sources and is counsel's
(Row 40 (f)). MSG91's behaviour with a three-variable template and with the Devanagari-plus-Latin mix is Row 30 (c)'s open question.

### References

- `_bmad-output/planning-artifacts/architecture.md` §3.4 (channels list; "Power-saver awareness" bridge paragraph); PRD
  `prds/prd-TWT-2026-05-22/addendum.md` RA-29, `prd.md` §4.10 / the TRAI line; `epics.md` Story 5.8.
- `.decision-log.md` (by id, never line): `-065`, `-180`, `-255` F7, `-313`, `-345`, `-374`, `-375`, `-379`, `-389`, `-390`, `-394`, `-404`.
- `packages/channels/src/{degraded-mode,dlt-variables,sms-dlt-registry,dispatch,cascade}.ts`; `packages/domain/src/{degraded-mode,alert,notifications}/`;
  `packages/contracts/src/{alerts,degraded-mode}/`; `apps/jobs/src/scheduler/{contribution-notify,contribution-notify-triggers,alert-sms-send,alert-sms-details,contribution-sms-templates,sms-member-boxes,sms-member-name,cycle-open-alert}.ts`.
- `docs/degradation-policy/{README.md,comms-templates/sms-channel.md}`; `docs/launch-gate-inventory/{dlt-template-requests-6-19.md,inventory-roster.md}` (Rows 28, 30, 32, 40); `docs/tone-guide.md`, `docs/tone-review-checklist.md`.
- Stories `5-8-…`, `5-11-…`, `5-11b-…`, `6-37e-…`, `6-35-…`, `8-1-…`, `8-8-…` in `_bmad-output/implementation-artifacts/`.

## Dev Agent Record

### Agent Model Used

(filled by `bmad-dev-story`)

### Debug Log References

- (a) Task 0.2 — BigDev's answers to FS1–FS14 and PQ1, verbatim: (open)
- (b) Mutants proven RED: (open)
- (c) `pnpm ci:local` evidence: (open)
- (d) Task 0.1 preflight results (pin checks, F1–F16 re-run, S1–S7): (open)

### Completion Notes List

(open)

### File List

(open)

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-27 | v1.0 | Created via `bmad-create-story 5.8b` (pinned `4e57fa42`): two read-only code traces (the trigger chain and the cycle-open alert; the send machinery and the closed list of edit sites) plus the governance, framework and records reading. FOUND F1–F16 — incl. that the row's named draft is the degraded-POSTURE notice, not the bridge's words (F3); that the trigger chain is built end to end (F2); that the recovery sweep de-bridges by documented design (F9); that no ratified entry rules on the bridge's trigger, cost or words (F15); and that 5.11's "no pool-opening text" guards are in code and tests (F16). FS1–FS14 and PQ1 PROPOSED for BigDev at Task 0.2. Status `ready-for-dev`. |
| 2026-10-27 | v1.1 | Fresh-context fact-check applied (about 75 cites confirmed): FS7 (a) gains a contract refinement (`alert_published` may carry a block only when `time_critical`) because THREE existing tests assert the contract refuses a block there (F16); the admin module has no tests (AC8, FS11 — new ones); templates 7–14 already carry three variables (F12); `-394` item 1 is the ruling behind the retry arm and is superseded in part (F8, FS9, AC0); the stale ledger letter, R10(B)'s source, README §5's "same template body" row, the closed list's omissions (`:858-870`, `:920-929`, Row 30 note (1)) and several quotes corrected. |

