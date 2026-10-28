---
baseline_commit: 64e01121
---

<!--
PINNED: 64e01121 (`origin/main` at Task 0.1, 2026-10-28 — "records: launch-gate Row 41 (b) MET — Story 11b.4a landed on main
(PR #307)"; the branch was rebased onto it — backup `backup/5-8b-pre-rebase-2026-10-28`). Created at 4e57fa42 (2026-10-27). Branch `story/5-8b-degraded-mode-bridge-sms-wording`, worktree
`.claude/worktrees/5-8b-degraded-mode-bridge-sms-wording`.

Two facts, kept apart (footgun #24): (1) the PIN is valid iff `git merge-base --is-ancestor 64e01121 HEAD`; (2) the FOUND FACTS are valid
iff `git diff --name-only 64e01121..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory docs/degradation-policy` is
EMPTY or every changed path is re-checked against the F it touches. Re-run BOTH at Task 0.1 — never assume either. (Both held at
creation: HEAD equalled origin/main after `git fetch origin`. Re-run 2026-10-28 (v1.2): the pin is an ancestor; `origin/main` =
`64e01121`, 28 commits on — Story 11b.4a LANDED (PR #307: migrations `0186` / `0187`, roster Row 41, `server.ts`, `boot.ts`, `router.tsx`,
`roles.ts`, `emit-openapi.ts`). None of the bridge's own files moved; the cites that did are re-taken below (`server.ts:254`). The
branch is NOT yet rebased — Task 0.1 does it.) Task 0.1 DONE 2026-10-28: rebased onto `64e01121` and re-pinned — Debug Log (d).

STATUS: 2026-10-27 created (`bmad-create-story 5.8b`) → ready-for-dev; 2026-10-28 v1.2. Task 0.2 ANSWERED 2026-10-28 (v1.4): BigDev
"FS1-FS16 as recommended" — every ⭐ option (FS4 (d), FS3.1 (a), FS11 with the FS4 (d) sentence) — Debug Log (a). ⛔ Still no code
before Task 0.3 (the decision committed ALONE) and Task 0.4 (records). ⚖️ v1.6: THE PANEL RULED — `2026-10-28-414` (DR + KB): PQ2 A
WITH A SUPER ADMIN ON / OFF SWITCH, PQ1 A — see "After the Panel's ruling" under the build decisions; FS17 (the switch) and FS18 (the
migration under BigDev's merge order — 5.8b BEFORE 6.32) are PROPOSED for BigDev. v1.7: BigDev "FS17 a, FS18 a"; the author-commit
`2026-10-28-415` (FS1–FS18) committed ALONE `34a0cb6d` ⇒ Task 0.3 DONE; AC0 / AC3 / AC4 / AC5 / AC8 / AC10 updated and AC12 (the switch)
added. v1.8: Task 0.4 DONE — the records committed; row `ready-for-dev → in-progress`; Task 1 is next. (Before v1.4: v1.2 CHANGED these proposals — read them fresh: FS3 (+ FS3.1), FS4 (new ⭐ (d)), FS6, FS8,
FS9, FS10, FS11 (new sentence; the screen's two existing AR-20 sentences), FS12 (legs), FS13 (PQ2), and NEW FS15 (the English
template's SMS type) and FS16 (PQ2's interim).)

START CONDITION — MET at the pin: 5.8 (the declaration, the primitive, the admin surface), 8.1 (`openCycleAlert` stamps
`time_critical` from the declaration at the freeze instant), 8.8 (the live fan-out), 5.11 (the honest SMS rung), 5.11b (the real alert
SMS send, `alert_sms_sends`) and 6.35 (the member's language) are all `done` on `main`.

NUMBERS (footguns #19 / #42(e); `-366` decision 6): this file names no decision id, roster Row number, DLT-sheet ordinal, migration
number or ledger letter that is not yet taken — where it says 23 / 24 it means the pin's next-free DLT ordinals, to be re-found. The next free of each is found AT THE TIME OF USE (Task 0.3 / 0.4 / 2 / 7) across `main`,
every branch and every worktree. At the pin they WERE: decision `-410` on `main` (`-412` on the 11b-4a branch); roster Row 41 on `main`;
DLT-sheet template 22; migration `0185` on `main` (`0186` / `0187` on the 11b-4a branch); ledger letters through `-27q` (11b-4a's branch) and
`-27r` (6.32's branch); this creation took `-27s`. On 2026-10-28 (11b.4a landed; 6.32's local branch `d0d635cb` holds the rest) they ARE:
decision max `-412` on `main`, `-413` on 6.32 ⇒ next `-414`; roster Row 41 on `main`, Row 42 on 6.32 ⇒ next Row 43; DLT template 22
everywhere ⇒ 23 / 24; migration `0187` on `main`, `0188` on 6.32 (journal `when` 1795750800032) ⇒ next `0189` with a `when` above that;
ledger `-28e` on `main`, `-28f`…`-28k` on 6.32 ⇒ next `2026-10-28l`. Re-find every one at the time of use.

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
      trustee-declared 'treat all cycle-open as critical'"*) and recorded the automatic trigger as deferred. The PRD carries the same
      conjunct: *"Pariwar-degraded-mode cycle-open bridge when push delivery is degraded and WA admin-toggle is OFF (architecture §3.4)"*
      (`prd.md:1074`) — so FS2 (a)'s reading departs from BOTH documents' text, not only the architecture's. 5.8's reconciliation 5
      quotes the conjunct as part of the AUTOMATIC description and narrows AR-20 to manual declaration; it does not say whether a
      manual declaration is also bound by the conjunct, and the built code (`degradedModeActiveFor` = `alert.time_critical`) never
      reads the Pariwar's WhatsApp toggle. ⇒ READING, PROPOSED for BigDev (FS2): the conjunct belongs to the automatic detector; a
      manual declaration is the trustee's attestation that the Pariwar is degraded.
  G3  The COST: epics.md Story 5.8 says *"cost impact is accepted as the trade-off for reach during degradation"* — a sentence in a
      planning artifact, with no per-unit figure. No `.decision-log.md` entry rules on Story 5.8's declaration, AR-20, the bridge's trigger,
      its cost or its words (grep 2026-10-27, re-run 2026-10-28 through `-413`): the entries that mention the bridge are the
      degradation-policy framework's own record, `-313` TV12 (*"the degraded-mode SMS draft"*), `-394` item 1 (the bridged retry clause,
      F8), Story 5.11's `-389` §1 item 6 (*"the degraded-mode bridge stays dark; a bridged send runs the normal ladder; the bridge's words
      are a new backlog row"*) and `-404`'s "Not covered" line — none rules on the trigger, the cost or the words. So *"a cost the Panel accepted in 5.8's epic text"*
      (the sprint-status comment on this row) is an inherited phrase, not a ratified acceptance of THESE words' cost. `-390` is the
      precedent for putting a per-part cost line to the Panel. ⇒ FS13 (the cost goes in the note as stated, not asked).
  G4  `2026-09-02-180` Q1 (Trustee-ratified): the deceased family's FULL NAME renders on *"④ the cycle-open push / WhatsApp / SMS copy
      (8.8)"*; *"no consumer is excluded, and no split is authorised"*. The bridge text is the ONLY cycle-open SMS that will exist
      (`-389` / `-390` keep a pool opening off the per-member fallback). ⇒ carrying the name is MATCH; omitting it is a split (the
      Panel's, FS6 (c)). The name is the label the Pariwar's presentation mode resolves — `full_name` (the default) or `shielded_name`
      (*"Rajesh S."*) — the SMS follows it, as the push does; following the mode is `2026-09-02-181` (BigDev, MODE-RESOLVED), not `-180`.
  G5  `2026-10-22-379` Q1 A (Trustee-ratified): the 60-letter rule — *"(1) Send the full name whenever it fits 60 letters. (2) Only if it
      is longer: remove titles and suffixes … (3) If still longer: turn words into their first letter … never the last word"* — scoped
      to *"THE FOUR TEXTS"* (the claim texts). The bridge text is a fifth text ⇒ applying the rule EXTENDS a ratified rule's scope ⇒ PQ1
      (the Panel's; one line; non-blocking — interim FS6 (a)). ⚠ The Panel has seen this question before and been told it was dropped:
      `-389` §0 *"PQ2 (the 60-letter rule on the pool-open SMS) WITHDRAWN before sending"*, and the note `-390` ruled on says (`:142-144`)
      the long-name rule for the pool-open text was considered and *"No text now carries a name, so that question is withdrawn."* The
      PQ1 note must say why it is back (a pool-open text with a name now exists — on a declared Pariwar only).
  G6  `2026-10-23-390` (Trustee-ratified): *"⛔ A return of bulk-alert SMS (PRD RA-29)"*; under "Not covered": *"every other
      notification — a pool opening, days 5 / 13 / 14, … — ⛔ texted"*. The bridge is the RA-29 carve-out §3.4 names, not a return of
      bulk SMS, and it does not change the per-member fallback's reach (the three notices) — on RA-29 alone that is MATCH. ⭐ BUT what
      the Panel was TOLD, and ruled on, is wider than the "Not covered" line: the note `-390` ruled on
      (`trustee-panel-routing-note-2026-10-23-5-11-sms-for-members-without-whatsapp.md:71-72`) says *"Every other app notification (a pool
      opening, days 5, 13 and 14, … ) is never texted. A pool opening and the last day go to the Trust's channels instead (Question 2)."*;
      `-390` Q2's accepted cost: *"A member who does not join hears of them only in the app (and through the per-member Telegram or
      WhatsApp messages, where switched on)."*; `-389`'s headline (BigDev): *"A POOL OPENING AND THE LAST DAY ARE ⛔ TEXTED — THEY ARE FOR
      THE TRUST'S ANNOUNCEMENT CHANNELS (BIGDEV'S DIRECTION)"* and its §1 item 1 (*"⛔ Pool open … (general notices — for the channels)"*);
      roster Row 40's notes repeat it. ⇒ texting a pool opening on a declared Pariwar is a **WIDENING** of what the Panel was told ⇒
      **PQ2** (the Panel's — footgun #55: a widening is asked, not "stated"), with a "Corrected in this note — something you were told
      earlier" line (the shape of that note's `:145`); `-389`'s headline and §1 item 1 are superseded IN PART by BigDev's own decision
      (AC0). `-389` G4 — verbatim *"BigDev's 2026-07-06 exclusion of `alert_published` from SMS — KEPT"* — is READ as scoped to the
      per-member category registry (`sms-dlt-registry.ts:14-20` is that registry), and KEPT on that reading: the bridge is keyed by a
      payload `sms` block on a bridged alert, not by a category registry entry; `sms-dlt-registry.ts` stays all-dark. The reading is named
      in the decision's "How much to trust" part. What ALSO changes is 5.11's own invariant I5
      (*"no degraded-mode bridged send can reach a lit template"*) and the code and tests that enforce *"no pool-opening text"* (F16):
      they described the per-member fallback, and are rewritten here — a new decision entry supersedes `-389` §1 item 6 in part; no
      ratified sentence is edited.
  G7  Consent: `-375` "Does NOT cover" *"any SMS consent (row 5-11)"* ⇒ counsel's, roster Row 40 (f), shared by this story's text —
      ⛔ asked of the Panel (the template: a mixed question is two questions).
  G8  The degradation-policy framework (Story 0.4; the trustee sign-off of 2026-07-05 covered `surface-inventory.md` +
      `table-top-exercise.md` ONLY — `degradation-policy-ledger.md:34-35`: *"the 5 comms templates … are excluded from this sign-off;
      ratification is conditional on the marker being preserved"* — so `sms-channel.md` is OUTSIDE the sign-off): README §4 invariant 3 says
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
  G10 Lifecycle suppression: architecture §3.4 "Lifecycle-driven dispatch suppression" (`architecture.md:2210`) — *"When a member account
      enters a frozen state in the Account State Machine (`claim-filed-frozen`, `disbursed-frozen-readable`, `disabled-T+90`,
      `public-record-∞`), the dispatcher suppresses member-class push notifications"*; `sms-channel.md` "Suppression": *"members in frozen Account State
      Machine states do NOT receive this template"* (that file covers the bridge path too). BUILT? No — production injects no
      lifecycle-suppression hook (`apps/jobs/src/boot.ts`, the comment above `alertSms:`; Row 40 (g)). The cycle-open roster DOES carry
      members under the `account-frozen` (death-claim) overlay (F7). READING (the author's, named in the decision): §3.4's
      `claim-filed-frozen` IS the built `account-frozen` overlay (set by `claim.intake_initiated`, `packages/domain/src/member/overlay.ts`);
      the other three frozen states have no built form the roster could carry. ⇒
      texting them would go past §3.4's stated rule; FS4 ⭐ (d) excludes them from the bridge text (MATCH to §3.4 for this channel) and
      leaves today's push / WhatsApp untouched (Row 40 (g) stays the home of the general hook).
  NOT covered by any ruling: the cost per text at Pariwar scale (price per part unknown — Row 40 (d)); consent (counsel, Row 40 (f));
  the 60-letter rule for this text (PQ1); a pool opening texted on a declared Pariwar (PQ2); the automatic trigger (Category 5
  Observability); the general lifecycle-suppression hook (Row 40 (g)).

GLYPH REGISTER: ⛔ marks a prohibition at the START of a bullet or clause only — inside a sentence this file writes "not" / "never" in
words. ⭐ = recommended / load-bearing; ⚠ = trap or caveat. `.decision-log.md`, `deferred-work.md` and `sprint-status.yaml` are NEVER
cited by `file:NNN` (newest-first prepends move every line).

LETTERS: F = found facts · FS = build decisions (PROPOSED; answered by BigDev at Task 0.2) · I = invariants · T = traps · S = Task 0.1
STOP conditions · G = §0 readings · PQ = Panel question.
-->

# Story 5.8b: The Degraded-Mode Cycle-Open SMS Bridge Gets Its Own Registrable Words (en + hi) and Is Lit — a Time-Critical Cycle-Open Is Texted Once, in the Member's Language, Naming the Family `[SURFACE]`

Status: in-progress

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** A trustee can already declare a Pariwar's degraded mode (Story 5.8); a cycle that freezes
> while the declaration is active already opens a time-critical alert (8.1), and every member's fan-out already knows it is bridged
> (8.8). Then nothing is texted: the bridge has no registered words, so since 5.11 a bridged member simply runs the ordinary push →
> WhatsApp ladder and the SMS rung ends `sms_bridge_not_lit` (before 5.11 it ended a fake `sent`). The admin screen nevertheless tells
> the declaring trustee *"the cycle-open SMS bridge is armed"* and that cycle-open alerts *"force SMS to every eligible member,
> bypassing cost-optimization"* (F11). This story makes the screen true — the first by building the bridge, the second by rewording it
> to what is built (FS11). It writes the bridge's words
> (en + hi — BigDev's already-reviewed pool-open words, verbatim; the *"draft"* the row named, `sms-channel.md`, turns out to be the
> notice for a different state, F3), registers them, lets the cycle-open alert carry them, texts each member of a bridged roster once
> (⭐ except a member whose own death has been reported — FS4 (d)), in their own language, naming the family as `-180` rules, and
> settles what the bridge does when a text cannot go (the ladder as the fallback — FS3) and what the recovery sweep does to a bridged
> cycle (FS10). ⚠ Texting a pool opening WIDENS what the Panel was told in October (G6) — PQ2. **Day-one output: still no SMS** — no template id is set
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
> child, incl. the FS4 (d) overlay read); the recovery sweep's signal; ONE migration (two CHECKs on `alert_sms_sends`) with its schema
> constants; the admin page header, declare form and banner (FS11); the DLT sheet; a roster row; the gate's lists and the tests that pin
> today's dark state (incl. the `smsMemberName` caller fence).
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
| `2026-09-02-181` | the name follows the Pariwar's presentation mode (`full_name` / `shielded_name`) | BigDev, MODE-RESOLVED (G4) |
| `2026-10-22-379` Q1 A | the 60-letter rule over two 30-letter boxes, scoped to the four claim texts | RATIFIED — PQ1 asks about a fifth text (G5) |
| `2026-10-23-389` FS10 (a) | the bridge stays DARK; a bridged send runs the normal ladder; *"the bridge's words are a new backlog row"*; headline + §1 item 1: a pool opening ⛔ texted (for the channels) | author-commit — BUILT by 5.11; this row is the new row; headline / item 1 / item 6 superseded IN PART (AC0) |
| `2026-10-23-390` + the note it ruled on | per-member fallback widened for THREE notices; *"⛔ A return of bulk-alert SMS"*; the Panel was told a pool opening *"is never texted"* (note `:71-72`; Q2's cost) | RATIFIED — G6 ⇒ PQ2 (a widening) |
| `2026-10-23-394` item 1 | the retry rule's bridged clause (*"⛔ retried ONLY where … or a bridged member with an SMS target"*) | already superseded in part by `-404` §2 (lit, eligible members); its bridged clause superseded here (F8, FS9) |
| `2026-10-25-404` (5.11b) | the real alert SMS send: `alert_sms_sends`, at-most-once per (alert, member, occasion), the member's language resolved at the producer, a structural cap by CHECK (*"CAPPED BY CONSTRUCTION AT SIX PER MEMBER PER CYCLE"*; FS6 (a) *"`occasion` CHECKed to six literals"*); *"Not covered: the degraded-mode bridge's words (row `5-8b-…`)"* | author-commit — BUILT; FS6 (a) / FS8 (d) superseded IN PART (six → seven, FS8) |
| `2026-10-21-375` "Does NOT cover" | *"any SMS consent (row 5-11)"* | open → roster Row 40 (f) (G7) |
| Roster Row 40 `member-alert-sms-fallback-live` | legs (a)–(g): templates, Hindi review, provider answers, price, device, consent, suppression hook | OPEN — shared legs (FS12) |
| degradation-policy README §4 (3, 6), §5, §14; `comms-templates/sms-channel.md` | G8 | framework, sign-off conditional on the marker |

## ⭐ THE INVARIANTS

- **I1 — Registered text = catalogue text, byte for byte.** The registry's `registeredText` is the `sms.cycle_open_bridge` string from
  `contribution.json` with each `{param}` as `{#var#}`, checked through the REAL `t()`; the DLT sheet row matches. *Proof:* AC2.
- **I2 — Only a bridged cycle-open is ever texted by this path.** A text goes only when `evaluateDegradedModeBridge` bridges (category
  `alert_published` AND `time_critical`) AND the alert carries a bridge `sms` block. News (`news-publish.ts:149`), surveys
  (`survey-publish.ts:133`), moderation (`moderation-notify.ts:255`) and the staff push (`claim-correction-reminders.ts:607`) — all in
  `apps/jobs/src/scheduler/` — share the category but hard-code `time_critical: false` and carry no block; the
  contract REFUSES a block on an `alert_published` whose `time_critical` is false (FS7), and the FAN-OUT ignores a block on any alert that
  is not bridged (the send seam checks only the occasion). Helpdesk replies are category `helpdesk_reply` (`helpdesk-reply-notify.ts:66-77`)
  — a `.strict()` variant with no `sms` key, so they cannot carry a block at all. *Proof:* AC9.
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
- **I10 — (if FS4 (d)) No member whose own death has been reported is texted by the bridge.** A member under the `account-frozen`
  overlay when the child runs gets no block (one set-based read; the overlay's `NOT_DECEASED` form) — their push / WhatsApp is today's,
  unchanged. *Proof:* AC4.

## 📜 Policy meaning (AI-10-1)

**5.8b introduces a predicate that decides whether a member is TOLD, by text, that their cycle has opened.** The predicate gates no
benefit, but what the member would miss does: a missed cycle counts under R7's lapse / restoration ladder and toward R8's ninety-percent
rule (`packages/domain/seed/niyamavali-v1-clauses.sql`), so it can decide whether the member's family can claim. In the member's terms
(FS4 ⭐ (d)): *"If the Trust has declared your Pariwar's notifications unreliable, you are texted once when a new cycle opens for your
pool — whether or not you use the app or WhatsApp — in the language you chose, naming the family you are supporting, unless your own
death has been reported to the Trust; if for any reason the text cannot go, the app and WhatsApp still try, and the alert is always in
the app."* (Under FS4 (a) the "unless" clause is dropped — and a deceased member's phone, now with their family, is texted.)
**Niyamavali check — done 2026-10-27, with this
result:** a case-insensitive search of `niyamavali-v1-clauses.sql` for *sms | text message | bridge | degraded | notif* finds nothing —
no clause names SMS, the bridge or a notification duty; R10(B) (in the PRD, `prds/prd-TWT-2026-05-22/prd.md`, not in the seed file) says *"Missed information is the member's responsibility"* with the
in-app surface as the official channel, so the text is CONSISTENT with the Niyamavali as written and R10(B) does not presume a member
was told before a missed cycle counts. (The Niyamavali is a rulebook, not a ratified spec — [[feedback_niyamavali_rulebook_not_spec]].)

## ⭐ FOUND FACTS (traced at `4e57fa42`; re-verified at `64e01121` at Task 0.1 — Debug Log (d); traced to code, not read from prose)

**The bridge today**
- **F1 — it is dark, and it does nothing else.** `fanOutAlert` calls `evaluateDegradedModeBridge({ category, degradedModeActive:
  alert.time_critical })` (`apps/jobs/src/scheduler/contribution-notify.ts:372-375`); `bridge.channels` is not read anywhere in `apps/jobs`.
  When `bridge.bridged`, the SMS rung returns `skipped_no_target` / `sms_bridge_not_lit` (`:414`) BEFORE the lit / eligible checks; the
  member otherwise runs push → WhatsApp, and the result says `bridged: true`. The AR-20 behaviour (SMS only, bypass the ladder and
  cost-optimization — `packages/channels/src/degraded-mode.ts`) exists nowhere in jobs. The file's header (`:14-21`) records 5.11's FS10 (a) but still
  frames the bridge as 8.8's SMS-only send and promises words in row 5-8b. Tests that pin the dark state (re-find by name), in
  `contribution-notify.test.ts`: GO RED — `:410-418` (expects `sms_bridge_not_lit`) and the R1 leg `:744-753` (FS9's one changed case,
  F8); stay GREEN unchanged but are EXTENDED to the new path — `:393-408` (bridged → push delivers; its `cycleOpenAlert` fixture
  `:191-204` carries no block), the I3 leg `:636-648`, R1 `:755-761`. ⚠ No live-DB test drives a bridged fan-out end to end; `contribution-notify-live`,
  `ai-8-3-ladder-armor-live`, `alert-sms-send-live` and the split-live test all use `time_critical: false`.
- **F2 — the trigger chain is BUILT end to end** (traced, not read from comments): `getActiveDegradedMode`
  (`packages/domain/src/degraded-mode/declarations.ts`) → `openCycleAlert` reads it at the cycle-freeze `committed_at` and sets
  `time_critical = active?.mode === CYCLE_OPEN_SMS_BRIDGE_MODE` (`packages/domain/src/alert/project.ts:437-449`; live-DB proof
  `cycle-open-derisk.spec.ts:228-258`) → `apps/jobs/src/cycle-spawn.ts:337-353` enqueues the cycle-open alert after the freeze →
  `cycle-open-alert.ts:156` forwards `timeCritical` → the boot enqueue (`boot.ts:788-800`; `:782-794` at the creation pin) → the parent copies it to each pool
  child (`contribution-notify-triggers.ts:710`) → `buildCycleOpenAlert` → `envelope()` stamps `time_critical` (`:308`) on each member's
  alert → `fanOutAlert`. `registerDegradedModeModule(app, deps)` is CALLED (`apps/api/src/server.ts:254` on `origin/main`; `:251` at the
  pin); `pariwar.declare_degraded_mode` is held by `pariwar_admin` (`roles.ts:358`) + `super_admin` (the whole catalog) — holder-set test
  `roles.test.ts:551`; the admin route `/p/$pariwarId/degraded-mode` is in the router, **un-linked** (direct URL; the "Un-linked by
  design, like its degraded-mode … siblings" text sits in the directory-publication route's comment, `router.tsx:129-131` on
  `origin/main`; `RootLayout.tsx` has no link). ⇒ **no broken link.**
  **TIMING:** the declaration must be effective at the freeze instant. The admin form has no `effectiveFrom` field (`DeclareForm.tsx:4-5`;
  the server defaults to now, `handlers.ts:66`), so declaring from the SCREEN after a cycle froze never bridges that cycle. A direct API
  call may backdate up to `NO_BACKDATE_GRACE_MS` = 5 min (`contracts/src/degraded-mode/declarations.ts:29,41`): a declaration made within
  5 minutes after a freeze with `effectiveFrom` ≤ `committed_at` DOES bridge it (`openCycleAlert` re-derives; so would the FS10 sweep).
  ⚠ The comments say `time_critical` is "copied verbatim" (`:163-164`; `cycle-open-alert.ts:155`); `openCycleAlert` actually RE-DERIVES it
  on every call (also on its idempotent no-op path). **REVOKE:** revoking after a freeze does not un-bridge that cycle — the read at
  `committed_at` still finds the declaration (`revoked_at` > `committed_at`; `declarations.ts:165`), for texts not yet started and for
  sweep re-runs alike.
- **F3 — ⭐ THE ROW'S PREMISE IS WRONG ABOUT THE DRAFT.** The sprint-status row and 5.11's FS10 treat
  `docs/degradation-policy/comms-templates/sms-channel.md` as the bridge's words (deferred-work calls it the *"draft"*). Its body — *"TWT Pariwar: Sanchalan mein asthayi deri.
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
  job bound `LIT_KIND_JOB_MEMBER_LIMIT` (`:113`, split `:608-614`, oversized-job guard `:773-777`, chunk `:781`) — the guard and the
  8-chunk apply ONLY when `deps.alertSms` is wired (`:773`, `:781`), so tests must wire it. Its one other caller,
  `resolveReminderSuppressions` (`:1025`), runs for deadline reminders only — unaffected by widening. A cycle-open pool job carries the
  WHOLE roster; claims are taken per 200-member chunk under a 300 s TTL, just before that chunk's sequential fan-out (`:938-953`).
  The legacy conversion (`:1611-1645`, inside `registerContributionNotifyWorkers`) is KIND-AGNOSTIC: `isLitPoolPayload(payload)` and
  > 8 members ⇒ `enqueuePoolBatch(boss, envelope, payload, job.id)`; the split copies every field (`{...payload, memberIds: slice}`,
  `:610-613` — `timeCritical` kept); the scope is `''` for cycle-open (`:601-606`); the deterministic id hashes `sourceJobId`. ⇒ widening
  the predicate is enough — the conversion needs a TEST, not code.
- **F7 — the cohort.** The cycle-open roster is the members of the LATEST persisted pool snapshot (`listCycleBindingCandidates`), i.e.
  members `is_assignable` at the freeze `committed_at` — INCLUDING grace and suspended members whose obligation remains
  (`apps/jobs/src/assignable-roster.ts`). There is no notify-time state filter, and production injects NO lifecycle-suppression hook
  (`apps/jobs/src/boot.ts`, the comment above `alertSms:`; roster Row 40 (g)). ⭐ **A deceased member IS rostered (S7 answered YES,
  traced 2026-10-28):** `assignable-roster.ts:72-74` reads only `payload.isAssignable` = `deriveIsAssignable(state, moderationStatus)`
  (`packages/validity-service/src/payload.ts:151-156`) = `VALID_STATES` (lock-in / active / active-in-grace, `:68-72`) AND not
  `terminated`. The `account-frozen` overlay (a `claim.intake_initiated` naming this member as deceased) is *"NEVER written to
  `members.state`"* (`packages/domain/src/member/overlay.ts:1-12`) and the validity service never reads it; its only consumer is
  `member/directory-read.ts:132` (`NOT_DECEASED`); `pool/spawn.ts` / `pool/assign.ts` exclude no deceased member. ⇒ a deceased member
  stays on the roster while their state is lock-in / active / grace — INCLUDING the subject of the claim this very cycle supports, whose
  registered mobile is now in the family's hands and would read "… in support of [their own] family". Suspended and grace members are
  rostered too (their obligation remains). Excluded: pending-*, lapsed-unpaid, withdrawn, anonymized, terminated. ⛔ The exclusion cannot
  go in the roster — AI-7-2 (`assignable-roster.ts:50-57`); it belongs at the bridge (FS4 (d)); `overlay.ts:35-38` says "change one, check
  the other" for its two forms. A rostered ERASED member is a NARROW RACE (anonymization runs only on a `withdrawn` member,
  `member/anonymize.ts:156-165`, and withdrawn is not assignable — so only a member withdrawn and erased between the freeze and the child
  job, or a sweep re-run): the mobile decrypts to the sentinel `[anonymized]`; `resolveSmsTarget` returns a target and `msg91Mobile`
  rejects it locally (`rejected_invalid_number`, a row and two audit lines, no text) — by reading, not executed. `resolveSmsTarget`
  (`delivery.ts:151-175`) gates on no opt-in, consent, DND or state (*"SMS has NO opt-in"*).
- **F8 — the retry rule's bridged arm was written for the fixture world — and removing it changes ONE case.** `shouldRetryFanOut`
  (`contribution-notify.ts:584-595`): `:586-587` reads the FIRST `sms` trail entry and, if its detail is in `ALERT_SMS_RETRYABLE_DETAILS`,
  retries until the final attempt; only THEN `if (result.bridged) return ctx.targets.sms === null;` (`:588`) — `2026-10-23-394` item 1's
  rule, verbatim: *"a member whose ladder ended unsent is recorded `in_app_only` and ⛔ retried ONLY where the old fixture would have
  completed them — an available, unsuppressed SMS target, or an FS3 named WhatsApp refusal (the old WA fixture), or a bridged member with
  an SMS target"* (i.e. those members are NOT retried). `-404` §2 already superseded that item in part (*"for lit, eligible members only"*).
  ⇒ A retryable bridge-text refusal is ALREADY retried, with or without the arm (`:587` runs first). A bridged alert is time-critical, so
  never cost-suppressed: for a member WITH an SMS target `:588` and `:589` both return `false`. The ONLY behaviour the arm decides: a
  bridged member with NO SMS target whose WhatsApp rung ended a named refusal (`wa_template_not_approved` / `wa_credentials_missing`) —
  retried today, terminal after removal (the general rule's `refusedWhatsapp` arm). That is exactly the R1 leg `contribution-notify.test.ts:744-753`.
  ⚠ The trail ORDER is load-bearing: `:586` reads only the FIRST `sms` entry — the bridge entry must precede the ladder's (AC5).
- **F9 — the recovery sweep de-bridges, by documented design.** `runContributionNotifyRecoverySweep` re-enqueues with
  `timeCritical: false` (`contribution-notify-triggers.ts:1118`; comment: *"`false` is the fail-safe: it can only cost the degraded-mode
  SMS BRIDGE on a recovered cycle"*); the `alerts` projection has no `time_critical` column; no test pins the value. A member is
  un-keyed (so swept) after a child job exhausts its 4 retries, or if the hourly purge of expired idempotency rows (300 s claim TTL) has
  emptied the count — the latter **inferred, not run**; the same mechanism is proven live for pending-match, and deferred-work already
  records that the sweep's probe "assumes `idempotency_keys` rows are effectively permanent". The send row keeps any re-run at-most-once.
  ⚠ If the purge inference holds it is REPEATED: `recordResult` does not extend `expires_at` (`keyed-store.ts:205-206`) and the vacuum runs
  hourly (`boot.ts:162`, `'0 * * * *'`), so every live cycle-open alert is re-fanned hourly for its live window — under FS10 (a) each bridged
  member re-hits the send-row lookup and `dispatch` each hour (no second text; reported `sent`; push NOT re-run only if the bridge path
  returns before the ladder). The sweep row carries only `alert_id, cycle_id, pariwar_id` (`contribution-notify-triggers.ts:1071-1085`) —
  no `committed_at`.
- **F10 — `resolveDegradedModeActive` is a dead export** (`apps/api/src/modules/degraded-mode/composition.ts`; zero callers). Its comments
  and `server.ts` describe a "future live fan-out" composing it; the fan-out takes the signal from `alert.time_critical` instead — by
  8.8's design (a notify-time re-read would break replay). ⛔ Wire it.
- **F11 — what a trustee sees.** The active banner reads *"⚠ Degraded mode ACTIVE — the cycle-open SMS bridge is armed."*
  (`DegradedModeBanner.tsx:55`) — **untrue today**: nothing is texted. Its SECOND line (`:56-58`): *"Cycle-open alerts will force SMS to
  every eligible member, bypassing cost-optimization."* The page header above the form (`DegradedModePage.tsx:37-41`): *"Declare degraded
  mode when in-app push or WhatsApp is unavailable system-wide. While active, cycle-open alerts force SMS to every eligible member,
  bypassing cost-optimization (the AR-20 carve-out). Declaring supersedes any currently-active declaration."* Both describe AR-20's
  SMS-only shape — false today and false under FS3 (a) (the ladder is the fallback; cost-optimization never touched a time-critical alert
  anyway). The `DeclareForm` component itself (Mode / Expires at / Reason) states nothing. The module is hard-coded English (5.8's review
  accepted that) and has NO admin-side test.

**Cost, limits, and the words**
- **F12 — the words' numbers**, run through the REAL `checkDltTemplateShape` on 2026-10-27: no problems; 3 variables; fixed share 48.3 %
  (en) / 48.9 % (hi); at the longest values 174 characters → 2 GSM-7 parts (en) and 176 → 3 UCS-2 parts (hi). A typical case (letter-code
  pool, a 25-letter name) is ≈ 110 characters → 1 part (en); ≈ 112 → 2 parts (hi). ⚠ The en figures assume a LATIN family name: nothing
  keeps a Devanagari name out of the en text (`smsPoolLabel` guards the pool, `:139`; the name has no such guard), and a Devanagari name
  makes the en text UCS-2 — ≈ 110 → 2 parts typically, 174 → 3 at the longest. The sheet already keeps template 14 PROVISIONED Unicode
  for exactly this reason (*"a name value may be Devanagari"* — MSG91 setup step (3), `dlt-template-requests-6-19.md:47-52`;
  `dlt-template-sheet.test.ts:68-72`), while 8 / 10 / 12 stay Normal as an OPEN question (Row 32 (d)) ⇒ FS15. Three variables need the sheet's exigency line:
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
  Row 41 was the highest at the pin (Row 42 is now on 6.32's branch — next free Row 43; re-find at Task 0.4). `scripts/dlt-typed-variables/lib.ts` `REGISTRY_FILES` already lists `contribution-sms-templates.ts`.
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
  `member1`; it fails for `cycle_open_bridge`). ⭐ And a HARD caller fence: `apps/jobs/tests/sms-member-name.test.ts:321` sets `CALLERS`
  to EXACTLY `claim-peer-mesh-requests.ts` + `claim-suspicion-notices.ts`, asserted with `toEqual(CALLERS)` (`:397-401`, describe *"N4 —
  ONE function for the four texts, called by exactly the two text senders"* `:394`; module header `sms-member-name.ts:2`) — a call from
  `contribution-notify-triggers.ts` turns it RED; `:441-444` limits `MEMBER_NAME_MAX` readers to the boxes file and the module (the
  producer must not read it); `(m)` (`:283-311`) counts exactly 8 box-using templates and requires the box slots at indices [0] / [1] —
  the bridge puts `pool` first, so extending `(m)` to the contribution registry needs an index-aware check. They guard `-389` / `-390` (the per-member fallback texts three notices and no general one). The bridge is the §3.4
  carve-out, not the per-member fallback (G6) — so these tests are REWRITTEN to say what is now true (the three per-member notices, plus
  ONE bridge message that exists only on a bridged alert), each rewrite stating what it replaced. The names are not changed to slip past them.

## ⚖️ Build decisions (⭐ = recommended) — PROPOSED for BigDev at Task 0.2; ANSWERED 2026-10-28: every ⭐ (Debug Log (a))

Each is the author's (§0) unless it says PQ. Answer by letter; a bare letter means the option's outcome AND its cost line.

- **FS1 — what the bridge says (F3).** ⭐ **(a) the cycle-open notice, in BigDev's own reviewed words** — Story 5.11's pool-open
  "CHANNEL DRAFT" (en + hi), verbatim, as message `cycle_open_bridge` (table below). The bridge exists *"so that no member misses a
  cycle-open alert"* (5.8); BigDev reviewed and corrected these words in session on 2026-10-23. *Cost (a):* three variables (the third
  needs the sheet's exigency line — F12); at the longest values 2 en / 3 hi SMS parts (typically 1 / 2) — en up to 3 with a Devanagari
  family name or under FS15 (a); the Hindi-review leg must be
  recorded for THESE strings (`-389` item 12 discharged it for the three texted strings only). **(b) the degraded-POSTURE notice in
  `sms-channel.md`.** *Cost (b):* it tells a member nothing about their cycle, belongs to a state that needs ≥ 2 trustees and 7 days
  of the Solo Builder's silence, is Hinglish and untyped, and the framework itself says a posture SMS to all members is not an
  available fire-condition without an ADR (README §5, "Zero-comms-path cohort"). **(c) both.** *Cost (c):* (b)'s objections plus a
  second template.
- **FS2 — the trigger reading (G2).** ⭐ **(a) accept it:** a manual declaration is the trustee's attestation that the Pariwar is
  degraded; the WhatsApp-off conjunct belongs to the automatic detector (deferred); recorded in the decision as the AUTHOR'S reading of
  two documents (architecture §3.4 AND `prd.md:1074` both carry the WhatsApp-off conjunct — G2), named in its "How much to trust" part.
  *Cost (a):* a trustee can declare for a Pariwar whose WhatsApp works, and every rostered member is texted at each cycle that freezes
  while it is active — the epic's third scenario, as written. **(b) route it** as a Panel question before the
  bridge is used (*"may the Trust text a whole Pariwar when its WhatsApp is on?"*). *Cost (b):* a note; the bridge stays unprovisioned
  meanwhile (it is anyway). **(c) add a code check** — bridge only when the Pariwar's WhatsApp toggle is off. *Cost (c):* it narrows the
  epic's second scenario (WhatsApp API down system-wide, the toggle still on) — the Panel's.
- **FS3 — what a bridged send does (F1, F8).** ⭐ **(a) the text FIRST, the ladder as the fallback:** for a bridged alert the fan-out
  tries the bridge text before push; `sent` ⇒ the member is delivered by SMS and push / WhatsApp are not run; anything else (no SMS
  target, no template id, a name the fitter cannot place whole, a refusal) ⇒ the ordinary push → WhatsApp ladder runs and its SMS rung
  ends the named `sms_bridge_already_tried`. This is the epic's *"regardless of channel-tier rules"* and 5.8's *"does not wait for
  push/WA to fail"*; `DEGRADED_MODE_BRIDGE_CHANNELS` and the primitive stay unedited (the composition sequences them); a member the text
  cannot reach still gets the push 5.11 gave them. The bridge attempt's trail entry comes FIRST (`shouldRetryFanOut` reads only the
  first `sms` entry — F8); the Telegram mirror (`alert_published` is Telegram-eligible, `dispatch.ts:47-51`; it runs after the cascade,
  `contribution-notify.ts:483-495`) runs on the bridge-`sent` path too — ⛔ an early return that skips it. *Cost (a):* a member whose
  text went gets no push for that alert (the alert is in the app; the Telegram mirror still runs); a Pariwar declared while its push
  works loses the push that cycle. §3.4's *"Time-critical templates always send through both channels regardless of the optimization
  toggle"* (`architecture.md:2308`) is bounded by its scope words — it forbids the cost toggle from dropping a channel, not a bridge
  sequence — MATCH by scope (named in the decision).
  **(b) SMS only** (8.8's original shape). *Cost (b):* a member the text cannot reach gets nothing from the fan-out. **(c) the text
  beside the ladder** (the Telegram-mirror shape). *Cost (c):* a member with working push is told twice, and "delivered" and "retry" fork
  — a text that failed transiently must retry although the member is delivered.
  - **FS3.1 — the send row a delivered member leaves behind.** Under (a) a bridge text that met `rate_limited` leaves its row `deferred`
    (re-claimable, `alert-sms-send.ts:213-214`); the ladder then delivers by push, so the member is not retried, and `giveUpDeferred` runs
    only on the final attempt (`:372-373`) — the row stays `deferred` with no end (`deferred_expired` is handled only on a later lookup,
    `:583-611`). In 5.11b the SMS rung was LAST, so `deferred` always meant undelivered → retried → given up. ⭐ **(a) give the row up when
    the ladder delivers** (5.11b's give-up write, once, in the same member pass). *Cost (a):* `giveUpDeferred` is a closure PRIVATE to the
    seam (`alert-sms-send.ts:637-642`, over the domain's `smsDelivery.giveUpDeferredAlertSmsSend`), so the injected seam gains one
    operation (or the bridge attempt is told up front that a ladder follows) — the dev's shape, named in the decision; one more write on
    that path; a test. **(b) leave it.** *Cost (b):* by reading (not run), an hourly sweep re-run (F9) re-claims the un-expired `deferred`
    row and TEXTS a member the push already told — still at most one text, but after the push.
- **FS4 — who is texted (AI-10-1; F7 — S7 answered YES).** **(a) every member of the bridged cycle-open roster who has an SMS target** —
  regardless of push, WhatsApp or a WhatsApp yes (SMS has no opt-in — `resolveSmsTarget`). The roster is what 8.8 enumerates: members
  assigned to a pool at the freeze (`is_assignable` at `committed_at`, F7). One named predicate, the dev's name. *Cost (a):* a member
  whose own death has been reported (the `account-frozen` overlay) IS on the roster (F7) — their phone, now with their family, is texted
  *"… in support of [X]'s family"*, possibly naming their OWN family; suspended, lock-in and grace members are texted too; production
  injects no lifecycle-suppression hook (Row 40 (g)); consent is counsel's (Row 40 (f)). **(b) also require the push rung to have
  failed.** *Cost (b):* that is FS3 (c)'s ladder-then-text — it contradicts the bridge's point (push is what is unreliable).
  ⭐ **(d) (a), minus every member under the `account-frozen` overlay when the child runs** — one set-based read in the child (the
  overlay's `NOT_DECEASED` set form, a NEW consumer; `overlay.ts:35-38` "change one, check the other"), ⛔ in the roster (AI-7-2,
  `assignable-roster.ts:50-57`); such a member's block is omitted, so their push / WhatsApp is exactly today's (no change to what Row 40
  (g) governs); I10. Matches §3.4's lifecycle-suppression rule for this channel (G10). *Cost (d):* one more read per bridged job; a
  member frozen by a claim that is later denied misses that cycle's text (the alert is in the app); suspended and grace members are still
  texted (their obligation remains — the epic's "every eligible member").
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
  the count and never the name, until PQ1 is ruled — then a one-function change. Guidance: call `smsMemberName` only after the pool
  `identity` is non-null (it THROWS on an empty name, `sms-member-name.ts:89`; `deceasedDisplayName` is never `''` — `pool-identity.ts:227-228`
  returns null and the pool is skipped); the label is the SAME string the push uses (`familyLabel`, `contribution-notify-triggers.ts:282-284`,
  resolved once per job); shielded *"Rajesh S."* (`pool-identity.ts:156`) is `full` and passes with its full stop (the no-full-stop rule
  binds `shortened` only); a mononym shows the first name (`:152`); copy the alarm shape of `alert_sms.locale_unresolved` (`:859-863`: one
  name-free `alarm()` per job, carrying a count); a 1-code-point label would give `[name, '']` (`sms-member-name.ts:69`) and fail
  `AlertSmsBlock.values` `min(1)` (`alert.ts:103`) — unreachable in practice, but omit the block rather than throw. *Cost (a):* a member
  whose family label is over 60 letters is not texted (rare; the alert is in the app); the trail cannot name the reason because the
  block is absent. **(b) apply `-379`'s rule now** and ask the Panel to confirm without
  blocking. *Cost (b):* the author extends a ratified rule's scope by building it first. **(c) omit the name.** *Cost (c):* a split
  `-180` forbids — the Panel's.
- **FS7 — how the alert carries the text (F4).** ⭐ **(a)** an OPTIONAL `sms` block (`AlertSmsBlock`, message `cycle_open_bridge`) on the
  `alert_published` payload, built by the cycle-open builder from the SAME locals as the push params, only when `timeCritical`, and
  honoured ONLY on a bridged alert (I2), **and the contract refines `Alert`: an `alert_published` may carry a block ONLY when its
  envelope `time_critical` is true** — so the contract keeps refusing a block on news, surveys, moderation and the staff push (helpdesk replies are `helpdesk_reply`, a variant with no `sms` key)
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
  parts to keep one message honest. OpenAPI: `Alert` is NOT registered in `emit-openapi.ts` (checked on `origin/main`) and `alert.ts:17-19`
  promises `openapi/v1.yaml` stays byte-identical — run `pnpm contracts:emit-openapi` and expect NO diff (a diff is a fault). Update
  the `alert.ts:21-26` header (*"`Alert` is a `z.discriminatedUnion`"*). `dispatch` runs `Alert.parse` (`dispatch.ts:214`), so the
  refinement must admit the block when `time_critical` is true. `-404` FS5 (a)'s *"⛔ Alert-contract change"* was scoped to 5.11b — the
  decision says so in one line.
- **FS8 — the send record (F5).** ⭐ **(a) reuse `alert_sms_sends`:** ONE hand-authored migration replacing
  `alert_sms_sends_message_check` (+ message `cycle_open_bridge`) and `alert_sms_sends_occasion_check` (+ occasion `cycle_open` — the
  string the keyed store's scope and the child's `fanOutCall` ALREADY use, so "occasion = scope" stays true), with
  `ALERT_SMS_SEND_OCCASIONS`, `ALERT_SMS_SEND_MESSAGES`, the drizzle `check()` copies and the lockstep tests; the at-most-once key and
  the freeze trigger unchanged; 5.11b's *"six texts per member per real cycle"* becomes seven — a SUPERSEDE IN PART of `-404`'s headline
  cap and FS6 (a) / FS8 (d) ([[feedback_supersede_never_reinterpret]]), and the §3.4 annotation of 2026-10-25 (*"six occasions per
  cycle"*, dated note (b) *"SIX is the CHECK's cap"*) gets a dated note naming those sentences; recorded in the migration header too.
  *Cost (a):* a migration; 5.11b's deploy order applies (migration, then the api, then the jobs). **(b) a separate bridge table.** *Cost (b):* duplicates the lease / CAS / finalise
  machinery. **(c) no record.** *Cost (c):* not viable — no row id, no correlation id (5.11b F15).
- **FS9 — a bridged member's retry (F8).** The bridge text uses 5.11b's retry classes unchanged either way (rate-limited, in-flight,
  state-unavailable, Secret-Manager-transient — `:587` runs BEFORE the bridged arm; retried until the final attempt, then
  `in_app_only`). The arm decides ONE case: a bridged member with NO SMS target whose WhatsApp rung ended a named refusal.
  ⭐ **(a) remove the arm** (`-394` item 1's bridged clause, written for the fixture world; that item is already superseded in part by
  `-404` §2) — that member then follows the general rule and is terminal, like an un-bridged member with a named WhatsApp refusal;
  superseding `-394` item 1's bridged clause. *Cost (a):* such a member is recorded `in_app_only` at once instead of retried; the R1 leg
  `:744-753` is rewritten. **(b) keep the arm.** *Cost (b):* a fixture-era special case stays in the one retry function: a bridged member
  with no SMS target retries on a WhatsApp refusal that cannot clear within the job's attempts, while an un-bridged one does not.
- **FS10 — the recovery sweep (F9; I9).** ⭐ **(a) re-derive:** the sweep takes the signal from the same read the primary path uses (the
  cycle's freeze `committed_at` + `getActiveDegradedMode`) — one shared function, two callers — so a recovered cycle is bridged as its
  first pass was, and the send row keeps it at-most-once per member. Shape: extract exactly what `openCycleAlert` reads —
  `loadCycleFrozenPayload(db, cycleId)` then `getActiveDegradedMode(db, cf.pariwar_id, new Date(cf.attestation.committed_at))`
  (`project.ts:437-449`) — as one `(db, cycleId)` domain function that `openCycleAlert` calls; ⛔ `pool.getCycleFreezeCommittedAt` (it reads
  `cycle_freeze_commits`, the deadline sweep's source, `:1179-1180` — a different source breaks I9's "same read"). The sweep row has no
  `committed_at` (F9): call it inside the sweep's existing `withPariwarScope(deps.pool, row.pariwar_id, …)`, only when re-enqueueing (the
  pool bypasses RLS, but both reads filter explicitly — stream id; `declarations.ts:164`). The unit-test mock of `@twt/domain`
  (`contribution-notify-triggers.test.ts:30-37`) gains the new function. `openCycleAlert` has two production callers (jobs;
  `apps/api/.../alert.service.ts:29`) — the extraction stays inside it, both unchanged. *Cost (a):* a shared domain function and one more
  read per swept alert — hourly per live alert if F9's purge inference holds; it replaces a documented fail-safe (*"`false` … can only
  cost the degraded-mode SMS BRIDGE on a recovered cycle"*). **(b) leave
  `false`.** *Cost (b):* when the first pass loses members — exactly when infrastructure is down — they are recovered by the ordinary
  ladder only and never get the text the bridge exists to send. **(c) persist `time_critical` on the alert projection.** *Cost (c):* a
  migration and a projector change.
- **FS11 — what a declaring trustee is told (F11).** ⭐ **(a)** REPLACE the page header's second sentence (`DegradedModePage.tsx:37-41`)
  and the banner's second line (`DegradedModeBanner.tsx:56-58`) — both promise AR-20's *"force SMS … bypassing cost-optimization"* — with
  ONE sentence, used in both places and on the declare form: *"While this is active, each cycle that opens texts every member assigned
  to a pool in it, once, in their language — once the bridge's text templates are approved (until then no text is sent). A member who
  cannot be texted still gets the app and WhatsApp notification. A cycle that opened before you declared is not affected; revoking does
  not stop texts for a cycle that opened while this was active."* (English, hard-coded, like the rest of that module; under FS4 (d) add
  *"Members whose death has been reported are not texted."*) It is true at merge (F2 REVOKE; the day-one dark state; FS3's fallback);
  the banner's *"the cycle-open SMS bridge is armed"* is true once the templates are approved — until then the new sentence says why
  nothing goes. *Cost (a):* the module has NO tests today (F11) — new RTL tests for the page header, the form and the banner are part of
  the cost. **(b) leave it.** *Cost (b):* the screen keeps promising an SMS-only send that bypasses cost-optimization — false under FS3
  (a) — and says nothing of the day-one dark state or revoke.
- **FS12 — go-live (F13, F14).** ⭐ **(a) a NEW roster row** (the next free at Task 0.4; key `degraded-bridge-sms-live`), decision-authored,
  legs: **(a)** the two templates registered on SmartPing with their types, APPROVED, ids set under
  `sms.dlt.template_id.contribution.cycle_open_bridge.<locale>` — no id before its template is approved; **(b)** the Hindi string recorded
  as reviewed (BigDev's 2026-10-23 session — recorded here, not assumed); **(c)** the holders of `pariwar.declare_degraded_mode` named
  and matching the Trust's intent (G9); **(d)** a staging rehearsal — declare → freeze → cycle-open → a real text on a device, the
  revoke-after-freeze behaviour observed, and the MEASURED seconds per member and the roster size recorded, so the time to text a whole
  Pariwar is a number (F13: nothing paces or measures it today) — a figure BigDev finds too slow becomes a follow-up row; **(e)** the
  Pariwar-wide per-cycle cost line recorded with the per-part price (with the en Unicode case, FS15); **(f)** PQ1 answered, or its interim
  (an over-60 name is not texted) accepted by BigDev for go-live; **(g)** PQ2 answered YES (a NO keeps the row open and the bridge
  unprovisioned — FS16); **(h)** Row 40 (g) (the lifecycle-suppression hook) closed, or BigDev records that the bridge goes live without it
  (under FS4 (d) the death overlay is already excluded). Row 40's (c) provider answers and (f) consent, and Row 32's setup legs (incl.
  (d), the 14-vs-8/10/12 SMS-type question) are cross-referenced, not duplicated. **(b) add legs to Row 40.** *Cost (b):* Row 40 gates
  three notices every Pariwar can send; one declaration-gated broadcast would hold or ride them.
- **FS13 — the Panel (§0).** ⭐ **(a) ONE short note, two questions, blocking the GO-LIVE row and not the build:** PQ2 (a pool opening
  texted on a declared Pariwar — a widening of what the Panel was told, G6) and PQ1 (the 60-letter rule — withdrawn in October, back
  because a named pool-open text now exists, G5) asked; a "Corrected in this note — something you were told earlier" line (G6); the
  Pariwar-wide cost (G3) and the name (G4's MATCH) STATED. *Cost (a):* a note to write and send. **(b) no note.** *Cost (b):* the Panel's
  October picture ("a pool opening is never texted") stays wrong, a long family label is never texted, and nothing records that the
  Panel saw the Pariwar-wide cost. **(c) block the build on the answers.** *Cost (c):* not recommended — nothing is live; the interims
  are safe (FS6 (a), FS16).
- **FS14 — the framework documents (G8).** ⭐ **(a) untouched** (marker preserved, invariant 6); the pointer — *"`sms-channel.md` is the
  degraded-POSTURE notice, not the cycle-open bridge's words"* — is recorded in deferred-work and the roster row. **(b) a dated
  annotation at the top of `sms-channel.md`** (no marker change). *Cost (b):* edits a framework document (outside the 2026-07-05
  sign-off, but marker-conditional — G8) and owes it a changelog row.
- **FS15 — the English template's SMS type (F12).** ⭐ **(a) Unicode, like template 14** — the sheet's latest recorded choice for a
  name-carrying template (*"a name value may be Devanagari"*). *Cost (a):* every en text is counted UCS-2: ≈ 110 → 2 parts typically,
  174 → 3 at the longest — the cost line and PQ2's stated cost say so. **(b) Normal, like 8 / 10 / 12.** *Cost (b):* rides Row 32 (d)'s
  OPEN question; a Devanagari family name in an en text then depends on MSG91's handling of a Normal template carrying Unicode (Row 30 (c)).
- **FS16 — PQ2's interim and a NO (G6).** ⭐ **(a) build now; PQ2 gates go-live** (roster leg (g)): nothing is texted before the templates
  are approved anyway; a NO leaves the bridge unprovisioned (no template id) and a follow-up removes or re-scopes it. *Cost (a):* code
  that may never send. **(b) hold the build for the answer.** *Cost (b):* the story idles; the screen's untrue sentences (F11) stay
  untrue meanwhile unless FS11 is split out.

### ⚖️ After the Panel's ruling — `2026-10-28-414` (Trustee-ratified, DR + KB, 2026-10-28)

Verbatim: *"by DR and KB / Q1 A - but build a switch that can be turned on/off by Superadmin, in case later we decide to turn it off. /
Q2 A"*. What it changes in the decisions above (BigDev's answers stand; the ruling moves these):

- **PQ2 (note Question 1) — A, with a condition:** FS16's interim ENDS (go-live leg (g) MET by `-414`); FS2 (a) stands — B and C were
  not chosen, so the manual declaration is the trigger whether or not the Pariwar's WhatsApp is on. ⭐ The condition becomes FS17.
- **PQ1 (note Question 2) — A:** FS6 (a)'s interim is NOT built. The cycle-open producer sends what `smsMemberName` returns for `full`
  AND `shortened` (the `-379` form, now reaching this fifth text); only `too_long` omits the block — `-379` step (4) *"If it still does
  not fit … ⛔ text, as today — the family's text raises an alarm"* — with ONE name-free alarm per job carrying the count (the
  `alert_sms.locale_unresolved` shape; the alarm's name is the dev's — ⛔ `name_over_60_unruled`, which no longer describes it).
  The `smsMemberName` caller fence (F16, `sms-member-name.test.ts:321`) gains the cycle-open producer as a THIRD caller, and the
  module header's *"each caller keeps TODAY's outcome"* list gains it. Go-live leg (f) MET by `-414`.
- **FS13** done (the note was sent and answered); the §3.4 dated annotation (Task 0.4) names `-414` beside the author-commit.
- The author-commit for FS1–FS18 is `2026-10-28-415` (committed ALONE `34a0cb6d`).

- **FS17 — the Super Admin switch (`-414` Q1's condition).** ANSWERED 2026-10-28: **(a)** (BigDev "FS17 a"; `-415` item 17). The Panel fixed only that a Super Admin can turn the
  text on and off; the rest is the build's (`-414` Not covered). ⭐ **(a) ONE Trust-wide switch, held by `super_admin` ONLY, starting
  OFF; turning it ON is the go-live row's LAST leg.** A new permission key granted to `super_admin` alone (the name is the dev's); a
  single control row with an append-only history (who, when, a required reason), changed from the degraded-mode admin page by a Super
  Admin and shown READ-ONLY to everyone who can see that page; read at the SEND point (the fan-out's bridge attempt, once per job), so
  turning it off also stops texts already queued — when off, no text is tried, the trail names it (`sms_bridge_switched_off`, the
  dev's name) and the push → WhatsApp ladder runs exactly as today. FS11's sentence gains *"A Super Admin can switch these texts off
  for every Pariwar."*, and the banner says when the switch is off. *Cost (a):* a table (rides the story's ONE migration — FS18), a
  permission key (`ROLE_PERMISSIONS_VERSION` bump + the roles tests), an endpoint pair, admin UI and RTL tests, one read per bridged
  job; starting OFF means go-live is a deliberate act by a named person, but it is one more step to forget. **(b) the same, starting
  ON.** *Cost (b):* reads the Panel's "in case later we decide to turn it off" literally; harmless before the templates are approved
  (nothing can send), but go-live then happens the moment an id is set, with no last deliberate act. **(c) the existing feature-flag
  store's GLOBAL row** (`packages/domain/src/feature-flags/`; precedent: `apps/jobs/src/restoration-discipline.ts`, a global kill
  switch). *Cost (c):* `feature_flag.flip` is held by `pariwar_admin` (`roles.ts:454`), not Super Admin only — the Panel's words need a
  new flip rule or a carve-out; the five-state rollout ladder (off / canary / rollout / full / rolled_back) is not an on / off switch;
  the flags console is Pariwar-scoped. **(d) per Pariwar.** *Cost (d):* the declaration is ALREADY per Pariwar; a second per-Pariwar
  switch duplicates it and is not what *"in case later we decide to turn it off"* describes.
- **FS18 — the migration number under BigDev's merge order (S2, answered 2026-10-28: *"5.8b will be merged befor 6.32."*).** ANSWERED
  2026-10-28: **(a)** (BigDev "FS18 a"; `-415` item 18 and §2). Two recorded rules meet here: `-366` decision 6 (*"the number belongs to the first COMMIT that takes it on any branch"* —
  6.32 committed `0188`) and `-332` decision 2 (*"a migration that reaches a database after a higher-numbered one is SILENTLY SKIPPED
  there. So the parts reach `main` strictly in number order … ⛔ Never renumber a migration that has reached any shared database"*).
  With 5.8b landing FIRST, a 5.8b `0189` would reach `main` before 6.32's `0188`. FOUND 2026-10-28: 6.32's `0188` (`when`
  1795750800032) is applied ONLY in 6.32's own container `twt-632-pg` (:5448); `:5432` `twt_dev` is at 180 migrations, `:5433`
  `twt_dev` at 185, `twt-11b4a-pg` at 187 — it has reached no shared database. ⭐ **(a) 5.8b takes `0188`** (a `when` above `0187`'s and
  above 6.32's 1795750800032), and 6.32 takes the next free number with a `when` above 5.8b's at ITS rebase — allowed by `-332` because
  its `0188` has reached no shared database; recorded in 5.8b's author-commit as a departure from `-366` decision 6 for this pair only;
  6.32 recreates its own container (it holds `0188` = the ground-inspection migration). Decision ids and roster rows have no ordering
  hazard and stay as `-366` decision 6 assigns them (`-414` / `-415`, Row 43). *Cost (a):* rework on 6.32's branch at its rebase (a file
  rename, the journal entry, its story / decision text naming `0188`); 6.32's session must be told. **(b) 5.8b keeps `0189`**, and 6.32
  renumbers past it at its rebase. *Cost (b):* the same rework for 6.32, AND `main` keeps a permanent gap at `0188`. **(c) 5.8b keeps
  `0189` and 6.32 keeps `0188` with a re-stamped higher `when`.** *Cost (c):* the journal's `when` stops rising with the number — the
  convention `-332` states — and any database that applied 6.32's `0188` at its old `when` first skips 5.8b's.

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
the longest values 174 characters → 2 GSM-7 parts (en) and 176 → 3 UCS-2 parts (hi); en becomes UCS-2 (2 typical / 3 longest) with a
Devanagari family name or under FS15 (a). The dev re-runs it on the real registry. "TWT:" is
the only name (5.11 FS16 (b)). Tone: warm, plain, no urgency, no "must" — `docs/tone-guide.md`; the family is *"the family"* of the member,
never a "Late …" ([[feedback_never_mangle_member_names]]).

### PQ2 and PQ1 — for the Trustee Panel (ONE short note; blocks the go-live row, not the build; FS13 (a))

⚖️ ANSWERED 2026-10-28 — `2026-10-28-414` (Trustee-ratified, DR + KB): PQ2 A with a Super Admin on / off switch, PQ1 A ("After the
Panel's ruling", above). ⭐ WRITTEN 2026-10-28 as `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-28-5-8b-degraded-pariwar-cycle-open-text.md` (SENT — recorded by the answer). The note is the version put to the Panel; where this draft and the note differ, the
NOTE governs — its cost line follows FS15 (a): about 2 SMS parts per member per cycle in EITHER language, up to 3 at the longest (this
draft's *"2 en / 3 hi"* predates FS15). In the note PQ2 is "Question 1" and PQ1 "Question 2".

Written from `trustee-panel-routing-note-TEMPLATE.md` (§0 first). It opens with **"Corrected in this note — something you were told
earlier"**: in October the Panel was told a pool opening *"is never texted"* and goes to the Trust's channels (note `:71-72`; `-390` Q2).
That stays true for every Pariwar the Trust has NOT declared degraded; this note asks about the one exception.

**PQ2 — in one sentence:** when the Trust has declared a Pariwar's notifications unreliable, may it send every member of that Pariwar
one text when a new cycle opens for their pool — the narrow safety net the architecture and the PRD name — although the Panel was told
in October that a pool opening is never texted? **The one fact:** the text goes only on a declared Pariwar, only for a cycle that opens
while the declaration is active, at most once per member; every other Pariwar is unchanged. **Options:** **A** yes (cost: every
rostered member of a declared Pariwar is texted each cycle — at most 2 en / 3 hi parts, en 3 with a Devanagari name; price per part not
yet known); **B** no — the bridge stays unprovisioned (cost: a declared Pariwar's members hear of a cycle only in the app, WhatsApp
where on, and the Trust's channels — the gap the bridge exists for); **C** yes, but only when the Pariwar's WhatsApp is switched off
(cost: a system-wide WhatsApp outage with the toggle on is not covered — the epic's second scenario). **Our reading: A** — it is the
carve-out §3.4 and PRD RA-29 name, gated by a trustee's declaration.

**PQ1 — in one sentence:** when the Trust texts a whole Pariwar that a new cycle has opened — naming the family it supports — and the
family's full name is longer than 60 letters, may the Trust shorten it the way the Panel already approved for the claim texts (titles
dropped first, then first words to initials, never the last word)? **The one fact:** the text has room for 60 letters of name; the Panel
ruled the shortening for the four claim texts only (`-379`). **Why it is back:** the October note told the Panel this question was
withdrawn because *"No text now carries a name"* — if PQ2 is A, one does (asked only if PQ2 is A or C). **Options:** **A** yes, the same rule (cost: the name appears shortened in a
text every member receives); **B** no — such a family is not named, so such a member is not texted and relies on the app and the
ladder (cost: the member whose family name is longest is the one left out); **C** a different rule (cost: a new rule to build and word).
**Our reading: A** — the rule is built, tested and approved for the more sensitive texts. **Stated, not asked:** at most 2 en / 3 hi SMS
parts per rostered member per bridged cycle (typically 1 / 2; en up to 3 with a Devanagari name or a Unicode en template — FS15), price
per part not yet known; a trustee's declaration texts one Pariwar; the family's name is on the text as `-180` rules; the trigger is a
manual declaration whether or not the Pariwar's WhatsApp is on (PQ2 C is the Panel's way to narrow that); under FS4 (d) a member whose
own death has been reported is not texted. Until answered, the interims of FS6 (a) and FS16 hold (an over-60 name is not texted;
nothing is provisioned before PQ2). "Shown to the Panel" only once SENT ([[feedback_shown_to_panel_means_sent]]).

## Acceptance Criteria

**AC0 — Governance before code (Task 0).** ⭐ MET 2026-10-28 for the decisions: the Panel's ruling `2026-10-28-414` (`9ffd9466`) and the
author-commit `2026-10-28-415` (`34a0cb6d`, FS1–FS18, incl. FS18's departure from `-366` decision 6), each committed ALONE; the records
commit (Task 0.4) follows. As written: the author-commit decision (FS1–FS16 as answered; the §0 readings G1–G10 with FS2's
reading, G6's `-389` G4 scope reading, G10's "frozen" reading and FS3's §3.4 `:2308` scope reading named in its "How much to trust this
entry"; its Supersedes-IN-PART list — `-389` §1 item 6 (FS10 (a), *"the bridge stays dark"*), `-389`'s headline clause *"A POOL OPENING
AND THE LAST DAY ARE ⛔ TEXTED"* and §1 item 1 (*"⛔ Pool open"*) for a declared Pariwar's cycle-open only (BigDev's own direction, G6),
`-394` item 1's remaining bridged clause *"or a bridged member with an SMS target"* (that item already superseded in part by `-404` §2 for
lit, eligible members), `-404`'s headline cap and FS6 (a) / FS8 (d) (*"SIX PER MEMBER PER CYCLE"* → seven), and 5.11's I5 clause *"no
degraded-mode bridged send can reach a lit template"*; what it does NOT cover: consent, the price per part, the automatic trigger, the
general suppression hook, PQ1, PQ2) is committed ALONE before any record or code; the PQ2 + PQ1 note (FS13 (a)) is written from the
template and its SENT state recorded truthfully; the records commit follows ([[feedback_governance_commits_precede_implementation]]).

**AC1 — The alert can carry the text (FS7).** `AlertSmsMessage` gains `cycle_open_bridge`; the `alert_published` variant and
`CycleOpenPayloadData` gain `sms: AlertSmsBlock.optional()`; `buildCycleOpenPayloadData` takes an optional `sms` and OMITS the key when
absent (the deadline builder's shape); the doc-blocks that say the block rides *"only the two variants"* are updated; every existing
fixture still parses (T8); `Alert` REFUSES a block on an `alert_published` whose `time_critical` is false and admits it when true.
*Legs:* parse with and without; `.strict()` still rejects an unknown key; an `alert_published` with a block and `time_critical: false` is
refused (the two existing guards, unchanged) and with `time_critical: true` parses (also through `dispatch`'s `Alert.parse`);
`pnpm contracts:emit-openapi` yields NO diff to `openapi/v1.yaml`; the `alert.ts:21-26` header describes the refined union.

**AC2 — Registered text = catalogue text (I1, I7; FS1).** `contribution-sms-templates.ts` holds `cycle_open_bridge` × hi / en with
slots `pool` (alphanumeric 30) then `MEMBER_BOX_SLOTS` (`member1`, `member2`), config key
`sms.dlt.template_id.contribution.cycle_open_bridge.<locale>`; `contribution.json` carries `sms.cycle_open_bridge` in en and hi (the
words above) and `$comment.sms` still names the REVIEWED state and now covers it; every entry passes `checkDltTemplateShape`; the CI gate
`dlt-typed-variables` passes (`REGISTRY_FILES` already lists the file — no edit); the i18n parity and microcopy gates pass. For each
locale the registered text equals the catalogue string with each `{param}` as `{#var#}`, read through the REAL `t()`
([[feedback_stub_must_call_not_transcribe]]); the DLT-sheet rows (next free ordinals, found by config key) match it and its MSG91
`##name##` form and SMS type (hi Unicode; en per FS15, cross-referencing Row 32 (d)); the third variable carries the sheet's exigency line, as templates 7–14 do (*"`-180` Q1: the family's full name on the cycle-open SMS; the name
needs two boxes (`-379` Q1 A's shape)"*). *Legs:* one lockstep test per template; the planted-violation leg for each new gate, proven RED
first.

**AC3 — At most once, with a record that admits the occasion (I3; FS8).** ONE hand-authored migration — **`0188`** (FS18 (a): 5.8b
merges before 6.32; a journal `when` above `0187`'s AND above 6.32's 1795750800032; re-check at Task 2 that `0188` is still not on
`main`) — that also carries FS17's switch table (AC12) — replaces `alert_sms_sends_message_check` and `alert_sms_sends_occasion_check`;
`ALERT_SMS_SEND_MESSAGES`, `ALERT_SMS_SEND_OCCASIONS` and the drizzle `check()` copies follow; the existing TS ↔ SQL lockstep tests pin the
new lists together; it applies on a fresh database and on one at the latest migration on `main` at the time (`0187` on 2026-10-28 —
6.32 lands AFTER 5.8b and renumbers past `0188`). *Legs (live-DB, :5433):* a `cycle_open` / `cycle_open_bridge` row inserts, `alerts` FK included (F5 — the proof
5.11b did not have for cycle-open); an unknown occasion and an unknown message are still refused; a second send for the same (alert,
member) — a job retry, a sweep re-run, a second declaration — finds `accepted`, sends nothing and reports `sent` (an in-flight row ⇒
`sms_send_in_flight`, retried; a final row ⇒ terminal — the seam's existing arms); under FS3.1 (a) a `rate_limited` bridge text followed
by a ladder delivery leaves the row given up, not `deferred`, and a later re-run sends nothing.

**AC4 — The producer (I5, I6; FS5–FS7).** Only a `timeCritical` cycle-open child builds blocks. Such a pool payload counts as a lit kind
(FS5): its members' text languages are read in the identity scope, it splits into jobs of ≤ 8 members in ONE atomic insert, its claim chunk
is 8, and a job already queued whole at deploy time is converted by 5.11b's legacy split rather than failing (T6 — the conversion is
kind-agnostic; no code, a test). Per member: `locale` = the recipient's; `{pool}` = `smsPoolLabel(identity, locale)`; the name =
`smsMemberName(familyLabel)`, called only once `identity` is non-null — `full` AND `shortened` become `member1` / `member2` (`-414` Q2 A:
the `-379` form reaches this text; a box that would be empty omits the block, never throws); ONLY `too_long` omits that member's block and
raises ONE alarm per job with the COUNT (`-379` step (4); the `alert_sms.locale_unresolved` shape; ⛔ `name_over_60_unruled`). Under FS4 (d) a member under the `account-frozen` overlay when the child runs gets no block (one
set-based read per job; no alarm per member; a count in the job's log line is allowed, never a name or id). A Pariwar with no passport row
omits every block for the job with ONE alarm and the push unchanged. A non-time-critical cycle-open, the sweep without a signal, news,
surveys, moderation and the staff push build no block. *Legs:* both presentation modes (`full_name`, `shielded_name` — *"Rajesh S."*
passes as `full`) with a fixture that REACHES each; 60 letters (`full`) / 61 (`shortened`, SENT, with titles dropped then initials) / a
name `too_long` even shortened (omitted + the alarm); a missing passport; the hi and en `{pool}` rules; the job split at
8 / 9 members (with `deps.alertSms` wired — the split is inert without it); a whole job of 9 queued before the deploy is split; a
deceased (account-frozen) member on the roster gets no block while their neighbours do.

**AC5 — The bridge path (I2, I4, I8; FS3).** In `fanOutAlert`, for a bridged alert that carries a block, when the member has an SMS
target and the seam is wired: the bridge text is attempted FIRST through the injected `alertSms` seam (so it goes THROUGH `dispatch`,
carrying `deps.suppression`), with `whatsappTried: false` (the bridge does not wait for §3.4's WhatsApp window); `sent` ⇒ the result is
delivered, `deliveredChannel: 'sms'`, push and WhatsApp are not run; any other outcome ⇒ the ordinary ladder runs, the bridge attempt is
on the trail FIRST (the first `sms` entry is the one `shouldRetryFanOut` reads — F8), and the ladder's SMS rung ends
`sms_bridge_already_tried`. ⭐ With the Super Admin switch OFF (AC12) ⇒ no bridge text is tried, the trail names it (`sms_bridge_switched_off`, the dev's
name) and the ordinary ladder runs exactly as today. A bridged alert with no block ⇒ the ordinary ladder, SMS rung `sms_message_not_lit`; with no seam wired ⇒
`sms_send_not_wired`; with no SMS target ⇒ the ladder, as today. `SMS_RUNG_DETAIL.bridgeNotLit` is retired (and leaves
`RECORDED_RUNG_DETAILS`; it appears in no migration, contract or admin code — only `contribution-notify.ts`, `contribution-notify.test.ts`
and `alert-sms-send.test.ts:35,264`), `sms_bridge_already_tried` joins it. The Telegram mirror runs on EVERY path, the bridge-`sent` path
included; cost-optimization is unchanged (a time-critical alert is never suppressed). `evaluateDegradedModeBridge`,
`DEGRADED_MODE_BRIDGE_CHANNELS`, `dispatch`, `cascade` and the ladder are not edited. *Legs:* one test per branch above; the bridge entry
precedes the ladder's in the serialised trail (both serialise as `sms:0:…`, `serializeFanOutResult :231-234`); the Telegram mirror is
dispatched on the bridge-`sent` path; the trail is asserted by outcome AND detail, never by provider id
([[feedback_stub_must_call_not_transcribe]]); a mutant that drops the `bridge.bridged` condition turns the AC9 leg RED.

**AC6 — Who, and retry (FS4, FS9).** Eligible: a member of the bridged roster, with an SMS target, whose alert carries a block (under
FS4 (d): and not under the `account-frozen` overlay) — regardless of push, WhatsApp or a WhatsApp yes (one named predicate).
`shouldRetryFanOut`'s `result.bridged` arm is removed (FS9 (a)): a bridged member's retry follows 5.11b's classes
(`ALERT_SMS_RETRYABLE_DETAILS` until the final attempt — unchanged by the removal) and the ordinary rule. *Legs:* ⭐ THE CHANGED CASE —
a bridged member with NO SMS target whose WhatsApp rung ended `wa_template_not_approved` is terminal (was: retried; the R1 leg
`:744-753` rewritten, naming what it replaced); a bridged member whose text is rate-limited — while push is down — retries and, on the
final attempt, is recorded `in_app_only` (passes with or without the arm: it proves the classes, not the removal); one whose text is
`rejected_invalid_number` (the erased-member race, F7) is terminal; the replaced tests name what they replaced (the Dev Notes' closed list).

**AC7 — The recovery sweep (I9; FS10).** The sweep takes `timeCritical` from the same read as `openCycleAlert` — one `(db, cycleId)`
domain function (`loadCycleFrozenPayload` + `getActiveDegradedMode` at `attestation.committed_at`), called by `openCycleAlert` and by
the sweep inside its existing `withPariwarScope`, only when re-enqueueing — ⛔ a notify-time `now()` read, ⛔
`pool.getCycleFreezeCommittedAt`. *Legs:* a swept bridged cycle's members are bridged; a swept non-bridged cycle is unchanged; a
declaration revoked after the freeze still bridges the swept cycle (F2 REVOKE); a re-run after members were texted sends NO second text
AND runs NO push for them (AC3); the sweep test asserts the value it passes (today none does — `:440-511`); the `@twt/domain` mock in
`contribution-notify-triggers.test.ts:30-37` gains the function.

**AC8 — What the trustee is told (FS11).** The page header's second sentence (`DegradedModePage.tsx:37-41`) and the banner's second line
(`DegradedModeBanner.tsx:56-58`) — the AR-20 *"force SMS … bypassing cost-optimization"* promises — are REPLACED by the FS11 sentence,
which the declare form also carries, plus *"Members whose death has been reported are not texted."* (FS4 (d)) and *"A Super Admin can
switch these texts off for every Pariwar."* (FS17); the banner's *"armed"* line stays while the switch is ON, and says the texts are
switched off while it is OFF. *Legs:* new RTL tests (the module has none) assert the sentence
on the page header, the form and the banner, and assert *"bypassing cost-optimization"* appears nowhere in the module. Templates:
`apps/admin/tests/telegram-config-form.test.tsx` (a presentational React Hook Form rendered standalone — DeclareForm's shape) and
`apps/admin/tests/integrity-page.test.tsx` (`renderWithClient`, a mocked client — the page and the banner, which mirrors
`audit-integrity/StatusBanner`).

**AC9 — Not a bulk channel (I2).** A news, survey, moderation or staff `alert_published` is never texted by this path: the contract
refuses a block on it (`time_critical` false), and the FAN-OUT ignores a block unless the alert is bridged (the seam checks only the
occasion). A helpdesk reply is category `helpdesk_reply` — its strict variant has no `sms` key (one leg). *Legs:* a test per producer
family; an enumeration test over every `alert_published` builder (`news-publish.ts`, `survey-publish.ts`, `moderation-notify.ts`,
`claim-correction-reminders.ts`, `contribution-notify-triggers.ts` at the pin — found by grep, not by this list) asserting it hard-codes
`time_critical: false` or is the cycle-open builder; 5.11's I5 tests (F16) rewritten to the positive statement, each naming what it replaced.

**AC10 — Records and gates (FS12–FS15).** DLT sheet: templates 23–24 (next free) in the main table and the text table, a new wording
section "templates 23–24 (Story 5.8b …)" (the heading 17–22 test keeps its section), types and MSG91 forms (hi Unicode; en per FS15, with
MSG91 setup step (3) updated to name it and cross-reference Row 32 (d)), the exigency line, segment counts at the longest values (computed
from the real registry; en with a Latin AND a Devanagari name), a cost line (per rostered member per bridged cycle), a rejection-table line,
a Record line, a bullet under "Shape rules" for the three-variable justification, and Row 30 note (1)'s *"(d)'s provider answers also
cover 17–22"* extended to 23–24 by a dated note; `sms-segment-cost.test.ts` gains the bridge as its OWN `it` (the existing `cases`
`:153-157` feed `it.each` blocks asserting 1 en / 2 hi parts — the bridge is 2 / 3 at its longest and needs `member1` / `member2`
values). Roster: the NEW row (FS12 (a)) with its legs (a)–(i) as `-415` Consequence 2 lists them ((f) and (g) MET by `-414`; (i) LAST — a Super
Admin turns the switch ON) and cross-references, and a dated one-line annotation on Row 40 pointing to
it. `epics.md` `### Story 5.8b` between 5.8 and 5.9 (the 5.10 format). Architecture §3.4: a dated annotation (what the bridge says; FS2's
reading; FS4 (d) / G10; the cap seven, naming the 2026-10-25 annotation's *"six occasions per cycle"* and note (b) *"SIX is the CHECK's
cap"* as superseded in part) — never a rewrite. deferred-work: 5.11's bridge item annotated *"→ 5.8b — Closed by 5.8b effective when
`done` on `main`"*; the three older items annotated too (footgun #14 — every reference site): 5.8's *"Live degraded-mode bridge
application …"* (its Re-trigger says *"driven by `resolveDegradedModeActive`"* — record that 5.8b deliberately does NOT, F10), 5.8's
*"Member-eligibility enumeration for the bridge"* (closed by FS4), and 8.8's *"AR-18 SMS-bridge signal is lost on the
recovery-sweep-repaired path"* (closed by FS10 (a)); NEW items: the dead `resolveDegradedModeActive` (F10), the un-linked admin page
(F11), the posture-notice pointer (F3), the throughput / audit-lock note (F13) with the hourly re-fan cost (F9), the idempotency-purge
inference (F9), FS18's note to Story 6.32 (renumber its migration above `0188` at its rebase; recreate its container). Dated pointer
lines under `-389`, `-394` and `-404` naming `-415` (⛔ an edit of their text). The header comment of `contribution-notify.ts` (`:14-21`) and the registry header are
updated. Ledger by SAFE prepend ([[project_sprint_status_safe_prepend]]).

**AC12 — The Super Admin switch (FS17 (a); `-414` Q1's condition).** ONE Trust-wide switch for the bridge text: a new permission key
granted to `super_admin` ONLY (`ROLE_PERMISSIONS_VERSION` bumped; the roles tests pin the sole holder, as `roles.test.ts:551-557` does
for the declare key); a single control row created OFF by the migration (`0188`), with an append-only history row per change (who,
when, ON / OFF, a REQUIRED reason; ⛔ UPDATE / DELETE on the history — the project's append-only guard pattern); a read endpoint for
everyone who can see the degraded-mode page and a change endpoint behind the new key (idempotent, audited); the degraded-mode page shows
the state to all and the control to a Super Admin only. The fan-out reads it ONCE per job at the bridge attempt (so switching it off
stops texts already queued) — OFF ⇒ AC5's switched-off branch. *Legs:* a non-`super_admin` (incl. `pariwar_admin`) is refused the
change (403) and sees the state read-only; a change without a reason is refused; ON → OFF → ON writes three history rows and the last
state wins; a live-DB leg: switch OFF ⇒ a bridged member gets no text and the ladder's trail is today's; switch ON ⇒ the text is tried;
a mutant that skips the switch read turns the OFF leg RED; the migration leaves it OFF on a fresh database.

**AC11 — Nothing else moves.** The primitive and `DEGRADED_MODE_BRIDGE_CHANNELS`, `dispatch` / `cascade` / the ladder
(`channels-determinism` green), the per-member fallback's three texts and their reach (a regression leg: their trails are identical),
OTP, cost-optimization, the declaration substrate and `openCycleAlert`'s result, the category registry `sms-dlt-registry.ts`, the
degradation-policy framework documents; `pnpm ci:local` green with `DATABASE_URL` on :5433.

## Tasks / Subtasks

- [x] **Task 0 — Governance (AC0)** (DONE 2026-10-28)
  - [x] 0.1 (DONE 2026-10-28 — Debug Log (d); S2 tripped as a KNOWN overlap, reported to BigDev; S4 local-only) Preflight: `git fetch origin`; rebase onto `origin/main`; run the pin checks (header); re-run F1–F16. **STOP and tell BigDev if:**
        **S1** a ruling on the bridge, its words or a pool-opening text exists (grep `^### Decision` newer than `-413` for *bridge*,
        *cycle-open*, *degraded*, *pool open*; through `-413` none does — checked 2026-10-28); **S2** another worktree or session edits any of `contribution-notify*.ts`, `alert-sms-*.ts`,
        `contribution-sms-templates.ts`, `packages/contracts/src/alerts/`, the `alert_sms_sends` schema or migrations,
        `apps/admin/src/modules/degraded-mode/`, `scripts/dlt-typed-variables/`, the roster or the DLT sheet (`git worktree list`;
        ListAgents; `git diff --name-only origin/main...<branch>` — [[feedback_shared_tree_branch_switch]]; sequence per `-366` decision 6 —
        on 2026-10-28 11b.4a has LANDED and 6.32's local branch touches `.decision-log.md` (`-413`), the roster (Row 42), migration `0188`
        + the journal, `sprint-status.yaml`, `deferred-work.md` and `epics.md`; 12-1 / 13-2 have no commits); **S3** a number moved
        (decision id, roster Row, DLT ordinal, migration, ledger letter) — re-find it (header NUMBERS: they HAVE moved since the pin);
        **S4** a Pariwar is declared degraded in any environment a deploy reads (the lit bridge would text it);
        **S5** Row 30 (d) was answered with a per-variable limit other than 30 (the slot maxima and every count change); **S6** row `5-14` has
        started and fixed the pool-open channel words differently (one source for BigDev's words); **S7** ANSWERED 2026-10-28 (F7: a
        deceased member IS rostered) — re-confirm the cites and put it to BigDev WITH FS4 (it decides FS4 (a) vs (d)).
  - [x] 0.2 (DONE 2026-10-28 — Debug Log (a): "FS1-FS16 as recommended"; PQ2 / PQ1 stay the Panel's; roster leg (b) NOT discharged) Put FS1–FS16, the words (en + hi), PQ2 and PQ1 to BigDev — the v1.2-changed FS first (header STATUS); record the answers
        VERBATIM in Debug Log (a), each with its option's conditions (footgun #45). If BigDev confirms the words in session, roster leg (b)
        still says *"whether that discharges this leg is recorded here, not assumed"*.
  - [x] 0.3 (NOTE WRITTEN 2026-10-28 — `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-28-5-8b-degraded-pariwar-cycle-open-text.md`; E4 run, Debug Log (e); SENT and ANSWERED — `2026-10-28-414` committed ALONE
        `9ffd9466`, Debug Log (f); the author-commit `2026-10-28-415` committed ALONE `34a0cb6d` after BigDev's "FS17 a, FS18 a" — DONE 2026-10-28) Write the PQ2 + PQ1 note from `trustee-panel-routing-note-TEMPLATE.md` (§0 first; the "Corrected in this note" line;
        `trustee-panel-routing-note-YYYY-MM-DD-5-8b-…`), run its evidence commands, record it as NOT sent until BigDev sends it. Stage the
        author-commit decision (next free id) in the scratchpad; commit it ALONE (`governance:` prefix) — try the decision-log write first
        ([[project_decision_log_writes_user_inserted]]).
  - [x] 0.4 (DONE 2026-10-28 — Debug Log (g)) Records commit (AC10's docs): `epics.md`, §3.4 annotation, the roster row + Row 40 annotation, the DLT-sheet section,
        deferred-work (the new items AND the four older reference sites), the ledger entry by SAFE prepend + row `ready-for-dev → in-progress`.
- [ ] **Task 1 — Contract, words, registry, catalogue (AC1, AC2; FS1, FS7)**: the enum key; the `sms` field on the variant, the payload
      schema and the builder; the `Alert` refinement (a block on an `alert_published` only when `time_critical`; run
      `pnpm contracts:emit-openapi` and expect NO diff — `Alert` is not registered; never hand-edit `openapi/v1.yaml`); the `alert.ts:21-26`
      header; the registry entries and `SLOTS`; `sms.cycle_open_bridge` in en and hi; `$comment.sms` coverage; the doc-blocks.
- [ ] **Task 2 — Migration and domain constants (AC3, AC12; FS8, FS17, FS18)**: the migration `0188` (FS18 — re-check it is free on
      `main`), incl. the switch's control and history tables (created OFF, FORCE RLS / grants as the project's pattern); `ALERT_SMS_SEND_MESSAGES`, `ALERT_SMS_SEND_OCCASIONS`, the
      drizzle `check()` copies; the journal entry; the header text (six → seven).
- [ ] **Task 3 — Producer and child (AC4; FS4 (d), FS5, FS6, FS7)**: widen `isLitPoolPayload` to a time-critical cycle-open;
      `buildCycleOpenAlert` takes `smsLocale` / the block; the child reads the languages, fits the name (only once `identity` is
      non-null), omits-and-alarms; under FS4 (d) one set-based `account-frozen` read per job (the `NOT_DECEASED` form) omits those members'
      blocks; the legacy conversion needs NO edit — add its `cycle_open` test.
- [ ] **Task 4 — The bridge path and retry (AC5, AC6, AC9; FS3, FS3.1, FS4, FS9)**: `alertSmsBlock` gains the `alert_published` case,
      guarded by `time_critical`; the bridge attempt before the ladder, its trail entry FIRST; the Telegram mirror on the bridge-`sent`
      path; `sms_bridge_already_tried`; under FS3.1 (a) give up a `deferred` bridge row when the ladder delivers; `shouldRetryFanOut`'s arm
      removed; the header comment; read the Super Admin switch once per job at the bridge attempt (AC12) — OFF ⇒ the switched-off
      detail and today's ladder.
- [ ] **Task 5 — The sweep (AC7; FS10)**: extract `(db, cycleId)` → `loadCycleFrozenPayload` + `getActiveDegradedMode` from
      `openCycleAlert` into one domain function; `openCycleAlert` and the sweep (inside its `withPariwarScope`, only when re-enqueueing)
      both call it; update the `@twt/domain` test mock.
- [ ] **Task 6 — The trustee screen and the switch (AC8, AC12; FS11, FS17)**: replace the page header's and the banner's AR-20 sentences with the FS11 sentence, and
      put it on the declare form (+ the FS4 (d) and FS17 sentences); the switch's state for all and its control for a Super Admin;
      the permission key (`super_admin` only), the read / change endpoints and the history (AC12); their tests (the module has none
      today — new RTL tests, templates in AC8).
- [ ] **Task 7 — Records (AC10; FS12–FS15)**: the DLT sheet (segment counts computed from the real registry with the longest values, en
      with a Latin and a Devanagari name; the en SMS type per FS15), the roster row text, deferred-work items.
- [ ] **Task 8 — Tests (AC1–AC12)**: rewrite the tests in the Dev Notes' closed list (each states what it replaced); add the first live-DB
      bridged end-to-end test; every new gate proven RED (the mutants in Testing standards).
- [ ] **Task 9 — Verify**: `pnpm ci:local` with `DATABASE_URL` on :5433 ([[project_prepush_hook_inherits_5432]]; known failures —
      [[project-known-livedb-test-failures]]); review the diff before commit ([[feedback_review_the_fix_diff_before_commit]]); commit on the
      story branch ([[feedback_commit_on_story_branch]]; check the branch before every commit —
      [[feedback-concurrent-review-agents-mutate-tree]]); do not push without BigDev's go-ahead.

## Dev Notes

### ⚠ TRAPS

- **T1 — The draft is the wrong message (F3).** Do not register `sms-channel.md`'s body and do not touch its marker (README §4 invariant 6).
- **T2 — The F16 guards are rewritten, not dodged.** Names stay `cycle_open_bridge` (message) and `cycle_open` (occasion); each rewritten
  test says what it replaced; the new positive guard: the only message not texted as a per-member notice is `cycle_open_bridge`, and it is
  texted only from a bridged `alert_published`.
- **T3 — `alert_published` is the broadcast category (F4; I2).** Key the text by the block AND `bridge.bridged`, never by category alone;
  prove RED by dropping the `bridge.bridged` condition AND by dropping the contract's `time_critical` refinement.
- **T4 — A missing constant and a missing migration fail DIFFERENTLY, and neither looks like a code fault (F5).** A missing CONSTANT ends
  the rung `sms_not_attempted` + an alarm (`alert-sms-send.ts:344-347`) — a config-looking fault. A missing MIGRATION with the constant
  present fails the CHECK at begin ⇒ `begin_failed` → `sms_send_state_unavailable`, retried and alarmed (`:446-449`, `:499`). The live-DB
  leg uses the REAL seam and record.
- **T5 — Two CHECKs, two TS lists, two drizzle copies and the policy-regression spec move together.** Hand-author the migration (never
  `db:generate` — 42P07), find its number at the time (`0186` / `0187` are on `main`; 6.32's branch holds `0188` — next free `0189` on
  2026-10-28), set its `when` above every sibling's, and check the
  journal's idx / `when` uniqueness after every rebase ([[project_live_db_test_gotchas]], [[project-sibling-migration-when-order-shared-db]],
  [[project_rebase_ledger_conflict_separator]]).
- **T6 — Widening `isLitPoolPayload` moves four things at once (F6):** the language read, the 8-member split, the oversized-job guard and the
  legacy conversion. A time-critical cycle-open job queued WHOLE before the deploy becomes "oversized" under the new predicate — the 5.11b
  conversion is kind-agnostic (F6), so this is a TEST, not code; the guard and split are inert unless `deps.alertSms` is wired.
- **T7 — The signal is derived at the freeze instant, twice (F2, F9, I9).** Never a notify-time `now()` read; never
  `resolveDegradedModeActive` (F10).
- **T8 — Contracts tests run outside tsc** ([[project-contracts-tests-outside-tsc]]): keep `sms` optional on the `alert_published` variant;
  grep the fixtures.
- **T9 — The text language is the recipient's; the PUSH language is unchanged** (`deps.locale ?? DEFAULT_LOCALE`): a Hindi-choosing member
  in an English-default Pariwar may get an English push and a Hindi text — recorded, as in 5.11b.
- **T10 — The pool value is Hindi (5.11 T5).** Reuse `smsPoolLabel` (trimmed, ≤ 30 UTF-16 units, no invisible characters but the Devanagari
  joiners, basic GSM-7 in en; else the letter code) — never re-implement it.
- **T11 — One 30, one 60 — and the caller fence is EXACT.** Import `MEMBER_BOX_SLOTS` and `smsMemberName`; ⛔ read `MEMBER_NAME_MAX` in
  the producer (`sms-member-name.test.ts:441-444` limits its readers to the boxes file and the module). `sms-member-name.test.ts:321`
  pins `CALLERS` to EXACTLY the two claim senders (`toEqual`, `:397-401`) — adding `contribution-notify-triggers.ts` is a deliberate,
  named rewrite of that list, its describe title (`:394`, "four texts … exactly the two text senders") and the module header
  (`sms-member-name.ts:2`), not something to route around. `(m)` (`:283-311`) assumes the boxes at slot indices [0] / [1]; the bridge's
  slots are `[pool, member1, member2]` — make `(m)` index-aware if it is extended. ⛔ a name, box or shortened form in a log line, alarm,
  detail or payload — the PQ1 alarm carries a COUNT.
- **T12 — Both presentation modes** (`full_name`, `shielded_name` — *"Rajesh S."*) flow through the same label; a fixture per mode
  ([[feedback_gate_scope_semantic_coverage]]: a fixture cheaper than reality hides the branch).
- **T13 — `whatsappTried` is false on the bridge attempt.** The 5.11b retry classes still apply.
- **T14 — Type-only import cycle:** the seam is INJECTED (`deps.alertSms`); `contribution-notify.ts` takes only a TYPE import from
  `alert-sms-send.ts` ([[project_type_only_import_cycle_trap]]). Hand-format; a JSDoc with `**` emphasis closes the comment
  ([[project_markdown_emphasis_closes_jsdoc]], [[project-prettier-not-enforced]]).
- **T15 — Declaring from the screen after the freeze never bridges that cycle; revoking after the freeze never un-bridges it (F2).**
  (A direct API call inside the 5-minute backdate grace can bridge a just-frozen cycle.) The FS11 sentence says so; do not "fix" either.
- **T16 — A rostered erased member is a narrow race and is rejected locally (F7):** a terminal `rejected_invalid_number`, not a retry.
- **T17 — The admin module is hard-coded English** (5.8's review); do not add an i18n wrapper for one sentence.
- **T18 — Fixtures must reach the branch.** No live-DB test drives a bridged fan-out today (F1): the first end-to-end test declares, freezes,
  opens the alert, runs the child and the seam with a fake gateway, and asserts a send row — or the new path is green over unreachable code.
- **T19 — The trail order is load-bearing (F8).** `shouldRetryFanOut` reads the FIRST `sms` trail entry; if the ladder's
  `sms_bridge_already_tried` lands first, every retry class is read off the wrong entry. Bridge entry first; a test pins it.
- **T20 — The Telegram mirror sits AFTER the cascade (`contribution-notify.ts:483-495`).** A bridge-`sent` early return skips it
  silently. Keep the mirror on every path.
- **T21 — A Devanagari family name makes the en text Unicode (F12).** Nothing guards the name like `smsPoolLabel` guards the pool;
  the segment counts and the en SMS type (FS15) must assume it.
- **T22 — The death overlay is not in the roster and ⛔ must not be put there (F7; FS4 (d)).** AI-7-2 forbids a roster-side exclusion
  (`assignable-roster.ts:50-57`); read the overlay in the child, set-based, and keep its two forms in step (`overlay.ts:35-38`).

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
| Producer | `contribution-notify-triggers.ts` — `isLitPoolPayload` (`:654`), `buildCycleOpenAlert` (`:321-350`), the child (`:773-781`, `:812-815`, `:856-870`, `:903`, `:916`, the `buildCycleOpenAlert` call `:920-929`), the FS4 (d) overlay read (new, in the child), the sweep (`:1071-1085` row, `:1118`) | per AC4, AC7 |
| Producer — NO edit | the legacy conversion (`:1611-1645`, kind-agnostic — F6); `resolveReminderSuppressions` (`:1025`, deadline only) | a test only |
| Domain | `packages/domain/src/alert/project.ts` (`:437-449`) — extract the freeze-instant read `(db, cycleId)`; `packages/domain/src/member/overlay.ts` — the `NOT_DECEASED` set form, a new consumer (FS4 (d); no edit unless a set-read export is needed — then "change one, check the other") | one function, two callers |
| Admin | `apps/admin/src/modules/degraded-mode/{DegradedModePage,DeclareForm,DegradedModeBanner}.tsx` — the page header (`:37-41`) and banner line (`:56-58`) AR-20 sentences replaced | the FS11 sentence; NEW tests |
| Gate | `scripts/dlt-typed-variables/lib.ts` `REGISTRY_FILES` | no edit (the file is listed) |
| Switch (FS17, AC12 — added v1.7) | the permission key in `packages/domain/src/rbac/permissions.ts` + `roles.ts` (`super_admin` ONLY; `ROLE_PERMISSIONS_VERSION`) and `packages/domain/tests/rbac/roles.test.ts`; NEW schema + domain read / change functions (control row + append-only history) in migration `0188`; NEW contract shapes beside `contracts/src/degraded-mode/declarations.ts`; NEW api read / change routes beside the degraded-mode routes (`server.ts` wiring); the fan-out's read (`contribution-notify.ts`) and its injected dependency in `apps/jobs/src/boot.ts`; the admin page's state + control (`apps/admin/src/modules/degraded-mode/`, `api/client.ts`) | new — exact files the dev's, re-found at Task 6 |
| Docs | DLT sheet (+ a "Shape rules" bullet); roster (+ Row 30 note (1), `:540`); `epics.md`; architecture §3.4; deferred-work; ledger | AC10 |
| NOT edited | `sms-dlt-registry.ts` (category registry, all-dark), the CRQID kinds / grammar (`as` is per row), `degraded-mode.ts`, `dispatch.ts`, `cascade.ts`, `sms-channel.md`, README | — |

**Tests that CHANGE (each states what it replaced):** `apps/jobs/tests/contribution-sms-templates.test.ts` — the exact three-message
list (`:68`), the I5 substring test (`:73-83`), `toHaveLength(3)` on `sms.*` keys (`:173`), `ORDINAL` (`:39`), the no-`member1` assertion
(`:92`, per message: the three per-member notices carry no name box, the bridge carries `member1` / `member2`), the `$comment` regexes
(`:160-165`), the sheet-heading test (`:189` keeps its section; a new test for 23–24); `alert-sms-send.test.ts` (`:433-436`, the
occasion list); `alert-sms-send-live.test.ts` (`:1359-1360`, six → seven rows; `:1332` COMBOS is a hand-typed three-message list and
stays valid); `packages/domain/tests/integration/rls/alert-sms-sends-policy-regression.spec.ts` (`:280-284`: `'cycle_open'` leaves the
refused OCCASIONS — the message `'cycle_open'` stays refused because the message is `cycle_open_bridge`; `:289` follows the constant);
⭐ `apps/jobs/tests/sms-member-name.test.ts` (`CALLERS` `:321` + the N4 describe `:394-401` — a third caller, named; `(m)` `:283-311`
index-aware if extended; `:441-444` unchanged — the producer does not read `MEMBER_NAME_MAX`); `contribution-notify.test.ts` — RED:
`:410-418` (`sms_bridge_not_lit` retired) and the R1 leg `:744-753` (FS9's changed case); EXTENDED (green unchanged, gain the new path):
`:393-408` (bridged → push), the I3 leg `:636-648` (a bridged cycle-open WITH a block now DOES drive the `alertSms` seam; the FIXTURE is
still never driven), R1 `:755-761`; `alert-sms-send.test.ts:35,264` (`sms_bridge_not_lit` references); `contribution-notify-triggers.test.ts`
(`:1244-1262` and `:1552` stay valid; the sweep tests `:440-511` gain the signal assertion; the `@twt/domain` mock `:30-37` gains the
extracted function); `sms-segment-cost.test.ts` (the bridge as its OWN `it` — the `cases` at `:153-157` assert 1 en / 2 hi parts).
**Stay green UNCHANGED under FS7 (a) — and gain legs for `time_critical: true`:** `contribution-loop-templates.test.ts:464-478` and
`contribution-notify-triggers.test.ts:1282-1288`.
**New:** admin RTL tests for the form and the banner (none exist); the live-DB bridged end-to-end test (T18); the switch's tests (AC12 —
the sole-holder roles test, the 403 / reason legs, the history, the live-DB OFF / ON legs, the switch-read mutant); `sms-member-name.test.ts`
legs for this caller's `shortened` (sent) and `too_long` (omitted) outcomes (`-414` Q2 A).
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
| the signal | `getActiveDegradedMode` at the freeze `committed_at`, via `loadCycleFrozenPayload` | `resolveDegradedModeActive`, a notify-time read, `pool.getCycleFreezeCommittedAt` |
| the death overlay (FS4 (d)) | `member/overlay.ts` `NOT_DECEASED` (set form, as `directory-read.ts:132` uses it) | a per-member `getMemberAccountOverlay` loop; a roster filter |
| the PQ1 alarm | the `alert_sms.locale_unresolved` alarm shape (`contribution-notify-triggers.ts:859-863`) | a new alarm style |
| admin RTL tests | `telegram-config-form.test.tsx`, `integrity-page.test.tsx` | a new harness |

### Testing standards

Vitest; the real `t()` for every copy assertion; one test per FS branch; assertions on trail outcome + detail, never provider id; live-DB
legs on :5433 (`DATABASE_URL` on the command) with separate transactions for DB-clock ordering ([[project_db_clock_ordering_tests_tie]]),
membership not counts. Mutants proven RED in Debug Log (b): drop the `bridge.bridged` condition (AC9); remove `cycle_open` from the CHECK
(AC3); the sweep passes `false` (AC7); the producer sends a `shortened` name (AC4); the lit predicate left unwidened (AC4, T6); the
overlay read removed (AC4, FS4 (d)); the ladder's SMS entry placed before the bridge's (AC5, T19); the Telegram mirror skipped on
bridge-`sent` (AC5, T20); the bridged retry arm restored (AC6's changed-case leg).

### Project structure notes

Registry, fan-out, producer in `apps/jobs/src/scheduler/`; the contract in `packages/contracts/src/alerts/`; the record in
`packages/domain/{migrations,src/schema,src/sms-delivery}`; the freeze-instant read beside `openCycleAlert` in
`packages/domain/src/alert/`; the screen in `apps/admin/src/modules/degraded-mode/`; records in `docs/launch-gate-inventory/` and
`_bmad-output/`. No pg-touching `@twt/domain` import into anything Metro bundles ([[contracts-domain-bundle-boundary]]).

### Sequencing

On 2026-10-28: 11b.4a has LANDED on `main` (PR #307 — migrations `0186` / `0187`, roster Row 41); this branch is 28 commits behind and
is rebased at Task 0.1. In flight: `6-32-…` (local `d0d635cb`, contains `main`) holds decision `-413`, roster Row 42, migration `0188` +
the journal, ledger `-28f`…`-28k`, and edits `deferred-work.md` and `epics.md`; `12-1-…` and `13-2-…` have no commits. 5.8b's migration
takes the next free number with a `when` above every sibling's (6.32's included); expect ledger, roster, deferred-work and epics rebase
conflicts ([[project_rebase_ledger_conflict_separator]]). ⭐ MERGE ORDER (BigDev, 2026-10-28): 5.8b lands BEFORE 6.32 — so the
migration's NUMBER follows FS18, not "next free" alone (`-332` decision 2: migrations reach `main` in number order). Row `5-14`
(`trust-announcement-channels`, backlog) is independent. The go-live row's legs gate the first real text, never a merge
([[project-not-in-production-merge-is-not-golive]]).

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
(8.8), `70ea9b35` (5.8). Stories land by fast-forward ([[feedback-land-prs-by-fast-forward]]).

### Latest tech information

No new library. The TRAI facts (≥ 30 % fixed; typed variables; Service-Implicit for a sender's own customers; one template ↔ one header)
are carried from Story 5.11's 2026-10-23 fetch and were not re-fetched; the consent reading rests on secondary sources and is counsel's
(Row 40 (f)). MSG91's behaviour with a three-variable template and with the Devanagari-plus-Latin mix is Row 30 (c)'s open question.

### References

- `_bmad-output/planning-artifacts/architecture.md` §3.4 (channels list `:2115-2119`; "Power-saver awareness" bridge paragraph
  `:2133-2139`; "Lifecycle-driven dispatch suppression" `:2210`; *"Time-critical templates always send through both channels"* `:2308`);
  PRD `prds/prd-TWT-2026-05-22/addendum.md` RA-29 (`:47`), `prd.md` `:1074` (the WA-off conjunct), the TRAI line (`:1243`), R10(B)
  (`:1255`); `epics.md` Story 5.8 (`:2398-2414`).
- `.decision-log.md` (by id, never line): `-065`, `-180`, `-181`, `-255` F7, `-313` TV12, `-345`, `-374`, `-375`, `-379`, `-389`, `-390`,
  `-394`, `-404`. The note `-390` ruled on: `trustee-panel-routing-note-2026-10-23-5-11-sms-for-members-without-whatsapp.md` (`:71-72`,
  `:142-145`).
- `docs/degradation-policy/degradation-policy-ledger.md:34-35` (the sign-off's scope).
- `packages/channels/src/{degraded-mode,dlt-variables,sms-dlt-registry,dispatch,cascade}.ts`; `packages/domain/src/{degraded-mode,alert,notifications}/`;
  `packages/contracts/src/{alerts,degraded-mode}/`; `apps/jobs/src/scheduler/{contribution-notify,contribution-notify-triggers,alert-sms-send,alert-sms-details,contribution-sms-templates,sms-member-boxes,sms-member-name,cycle-open-alert}.ts`.
- `docs/degradation-policy/{README.md,comms-templates/sms-channel.md}`; `docs/launch-gate-inventory/{dlt-template-requests-6-19.md,inventory-roster.md}` (Rows 28, 30, 32, 40); `docs/tone-guide.md`, `docs/tone-review-checklist.md`.
- Stories `5-8-…`, `5-11-…`, `5-11b-…`, `6-37e-…`, `6-35-…`, `8-1-…`, `8-8-…` in `_bmad-output/implementation-artifacts/`.

## Dev Agent Record

### Agent Model Used

(filled by `bmad-dev-story`)

### Debug Log References

- (a) Task 0.2 — BigDev's answers to FS1–FS16, PQ2 and PQ1, verbatim — 2026-10-28: **"FS1-FS16 as recommended"**. Read as every ⭐
  option, each WITH its cost line (footgun #45) — nothing else was said, so nothing else is assumed:
  - **FS1 (a)** the cycle-open notice in BigDev's reviewed words (en + hi, the table under "The words"), message `cycle_open_bridge`;
    three variables; 2 en / 3 hi parts at the longest. **FS2 (a)** the manual declaration is the trigger; the WhatsApp-off conjunct is
    the deferred detector's — recorded as the AUTHOR'S reading of `architecture.md` §3.4 and `prd.md:1074` in "How much to trust".
  - **FS3 (a)** the text FIRST, the push → WhatsApp ladder as the fallback (rung `sms_bridge_already_tried`); the bridge's trail entry
    first; the Telegram mirror runs on the `sent` path too; §3.4 `:2308` MATCH by scope. **FS3.1 (a)** give the `deferred` row up when the
    ladder delivers — the seam gains one operation (the dev's shape, named in the decision).
  - **FS4 (d)** every rostered member with an SMS target, MINUS the `account-frozen` overlay when the child runs (set-based
    `NOT_DECEASED`, a new consumer — `overlay.ts:35-38` gains it; ⛔ not in the roster); I10. Suspended and grace members ARE texted.
  - **FS5 (a)** bounded jobs of ≤ 8 members, languages read in the identity scope. **FS6 (a)** only the `full` name; `shortened` /
    `too_long` ⇒ the block is omitted and ONE alarm `alert_sms.name_over_60_unruled` per job, until PQ1. **FS7 (a)** an optional `sms`
    block on `alert_published`, the contract refined to `time_critical` only, SAME registry and enum; `openapi/v1.yaml` unchanged.
  - **FS8 (a)** reuse `alert_sms_sends` (+ message `cycle_open_bridge`, + occasion `cycle_open`); six → seven texts per member per cycle —
    SUPERSEDE IN PART of `-404` (headline, FS6 (a), FS8 (d)) and the §3.4 dated note. **FS9 (a)** remove the bridged arm of
    `shouldRetryFanOut` — SUPERSEDE IN PART of `-394` item 1's bridged clause. **FS10 (a)** the sweep re-derives the signal through one
    shared `(db, cycleId)` domain function.
  - **FS11 (a)** replace the page header's and the banner's AR-20 sentences with the FS11 sentence, PLUS (FS4 (d)) *"Members whose death
    has been reported are not texted."*; new RTL tests. **FS12 (a)** a NEW roster row (`degraded-bridge-sms-live`), legs (a)–(h).
    **FS13 (a)** ONE Panel note, PQ2 + PQ1, blocking the go-live row and not the build. **FS14 (a)** framework documents untouched.
    **FS15 (a)** the en template registered Unicode, like template 14. **FS16 (a)** build now; PQ2 gates go-live.
  - ⛔ **NOT answered by this, and so still OPEN:** (1) **PQ2 and PQ1** — the Panel's; FS13 (a) says only that the note is written
    (Task 0.3) and NOT sent until BigDev sends it. ⚖️ ANSWERED 2026-10-28 by the Panel — `-414`, Debug Log (f). (2) **Roster leg (b)** — the Hindi string's review: BigDev chose the words (FS1 (a)) but
    did not confirm the review in this session, so leg (b) is NOT discharged here. (3) **S4** — whether any deployed environment holds a
    degraded-mode declaration (asked 2026-10-28; no answer yet; it does not block the build — nothing is texted before the templates are
    approved — but it is re-asked before go-live). (4) **S2** — the sequencing after 6.32 (`-414`, Row 43, `0189`) — asked, no answer;
    the plan stands unless BigDev says otherwise, and every number is re-found at the time of use anyway. ANSWERED 2026-10-28:
    *"5.8b will be merged befor 6.32."* — the migration consequence is FS18 (Debug Log (f)).
- (b) Mutants proven RED: (open)
- (c) `pnpm ci:local` evidence: (open)
- (d) Task 0.1 preflight results (pin checks, F1–F16 re-run, S1–S7) — 2026-10-28:
  - **Rebase.** `git fetch origin` (`origin/main` = `64e01121`); backup `backup/5-8b-pre-rebase-2026-10-28` (= `84e43c64`); `git rebase
    origin/main` — ONE conflict, the `sprint-status.yaml` top-of-file ledger (a pure prepend both sides: the branch's `-27s` over main's
    `-28e`…`-27k`), resolved branch-then-main; the second commit applied cleanly. New tips `e1211c6b` (created) / `5b39c9aa` (validated).
    Verified: for both files the sorted `-U0` changed-line set vs `origin/main` EQUALS the backup's vs `4e57fa42`; `sprint-status.yaml`
    parses (296 rows; this row `ready-for-dev`); `_journal.json` 187 entries, `idx` and `when` unique (last `0187_memorial-takedown`).
    No decision entry on the branch (nothing to byte-compare).
  - **Pin.** Re-pinned to `64e01121` (front matter + header); `git merge-base --is-ancestor 64e01121 HEAD` ✓.
  - **F1–F16 re-run.** Of the files the Fs cite, the only ones that changed `4e57fa42..64e01121` are `apps/jobs/src/boot.ts`,
    `apps/api/src/server.ts`, `apps/admin/src/router.tsx`, `packages/domain/src/rbac/roles.ts` (11b.4a's additions) and
    `architecture.md` / `epics.md` (+5 / +4 lines elsewhere). Every other cited file — `contribution-notify*.ts`, `alert-sms-send.ts`,
    `contribution-sms-templates.ts`, `sms-member-name.ts`, `contracts/src/alerts/`, `alert_sms_sends` schema + `0184`, `alert/project.ts`,
    `degraded-mode/`, `member/overlay.ts`, `validity-service`, `assignable-roster.ts`, `cycle-spawn.ts`, the admin module, `packages/channels`,
    the two catalogues, `scripts/dlt-typed-variables/`, every cited test, the DLT sheet, `docs/degradation-policy/` — is byte-identical, so
    the v1.2 verifiers' line-level checks at `4e57fa42` stand (not re-executed one by one). Re-taken by content: `boot.ts:160` → `:162`
    (vacuum cron), `:782-794` → `:788-800` (the cycle-open enqueue) — both corrected above; `server.ts:254`, `roles.ts:358`,
    `roles.test.ts:551`, `router.tsx:129-131` confirmed; architecture §3.4 `:2115`, `:2133-2139`, `:2210`, `:2308`, the `:2363` *"six
    occasions per cycle"* annotation, `prd.md:1074` and epics 5.8 `:2398` / 5.9 `:2416` confirmed by content. No F changes meaning.
  - **S1 — clear.** `^### Decision` newer than `-410`: `-411`, `-412` on `main`, `-413` on 6.32's branch — none mentions bridge,
    cycle-open, degraded or pool open (0 hits in each).
  - **S2 — TRIPPED (known, already sequenced in v1.2).** 6.32's local branch (`d0d635cb`, 15 ahead) touches the roster
    (Row 42), `0188_ground-inspection-questionnaire.sql` and `_journal.json` — plus the decision log, ledger, deferred-work and epics.
    12-1 / 13-2: 0 commits. No other worktree or local branch touches a 5.8b code file. Remote `origin/story/*` refs with commits not on
    `main` are LANDED stories' pre-landing refs (e.g. 6-34, 6-30), not in flight. ListAgents: one peer session (twt-7a, idle) — not in
    this worktree. ⇒ sequencing per `-366` decision 6: 5.8b takes numbers AFTER 6.32's (decision `-414`, Row 43, migration `0189` with a
    `when` > 1795750800032, ledger after `-28k`); if 6.32 lands first, expect roster / journal / ledger / deferred-work / epics rebase
    conflicts.
  - **S3 — numbers re-found, unchanged from v1.2:** decision max `-412` (`main`) / `-413` (6.32) ⇒ `-414`; roster Row 41 / Row 42 ⇒ Row
    43; DLT template 22 everywhere ⇒ 23 / 24; migration `0187` / `0188` ⇒ `0189`; ledger `-28e` (`main`) / `-28k` (6.32) / `-28l` (this
    branch) ⇒ next `-28m`.
  - **S4 — clear LOCALLY; deployed environments un-attested.** `pariwar_degraded_mode_declarations` in every local DB: `twt-test-pg`
    (:5433) `twt_dev` 12 rows / 0 unrevoked, `twt_dev_511b` 0; `twt-11b4a-pg` (:5447) 2 / 0; `twt-632-pg` (:5448) 0. No deployed
    environment is known (project memory: "code is not in production", BigDev 2026-09-22) — NOT re-confirmed this session; asked of
    BigDev.
  - **S5 — clear.** Roster Row 30 `closure_evidence_link` (d) is `(empty)` — unanswered; the 30-letter slot maxima stand.
  - **S6 — clear.** Row `5-14-trust-announcement-channels` is `backlog`; no story file, no branch.
  - **S7 — answered in v1.2 (F7: a deceased member IS rostered); re-confirmed** — `validity-service`, `assignable-roster.ts`,
    `member/overlay.ts` byte-identical at `64e01121`. Goes to BigDev WITH FS4 at Task 0.2.

- (e) Task 0.3 (part) — the Panel note, 2026-10-28 (BigDev: "yes write the note to panel"): `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-28-5-8b-degraded-pariwar-cycle-open-text.md`, from the template (§0 first;
  the ⏳ block; "Corrected in this note" naming the 2026-10-23 note's *"is never texted"* and *"No text now carries a name"*). Question 1
  = PQ2 (A yes / B no / C only when WhatsApp is off; reading A), Question 2 = PQ1 (asked only if Q1 is A or C; A the `-379` rule / B not
  named, not texted — the interim / C another rule; reading A). Stated, not asked: the cost (≈ 2 parts per member per cycle, up to 3;
  price unknown); a member whose death has been reported is not texted (FS4 (d)); a texted member gets no push for that opening (FS3
  (a)); who may declare; revoke does not stop an opened cycle; suspended / grace members texted. Split out: consent (counsel, Row 40
  (f)); price; the engineering choices. E4 RUN on `6610b0a9`: every command returned what the note says EXCEPT two, both fixed before
  this entry — the decision-heading grep for the bridge hits `-180` and `-389` (the comment had named `-313` / `-389` / `-394` / `-404`,
  which mention it in bodies only), and the who-may-declare range is `roles.test.ts:551-557` (the `toEqual` line), not `:551-558`. The
  Niyamavali grep is EMPTY (the finding). ⛔ NOT SENT — it counts as shown only once BigDev sends it ([[feedback_shown_to_panel_means_sent]]).
  Still to do in 0.3: the author-commit decision (next free id at the time — `-414` if 6.32's `-413` stands) staged in the scratchpad
  and committed ALONE.

- (f) The Panel's ruling and S2 — 2026-10-28. BigDev relayed, verbatim: *"by DR and KB / Q1 A - but build a switch that can be turned
  on/off by Superadmin, in case later we decide to turn it off. / Q2 A"*. Recorded as `2026-10-28-414` (Trustee-ratified), committed
  ALONE as `9ffd9466` (`-413` is 6.32's; next free checked on `origin/main`, every branch and every worktree: max `-413`). The note's
  ruling block transcribed; SENT recorded by the answer. Consequences: "After the Panel's ruling" (FS6's interim not built — `full` and
  `shortened` sent, `too_long` omitted with one alarm per `-379` step (4); FS16 ended; legs (f) / (g) MET); FS17 (the switch) PROPOSED.
  Earlier the same turn BigDev answered S2: *"5.8b will be merged befor 6.32."* — FS18 PROPOSED (the migration number; `0188` reached
  no shared database — per-container counts recorded in FS18). Both wait for BigDev; the author-commit (`-415`) waits for both.
  BigDev then answered, verbatim: *"FS17 a, FS18 a"*. The author-commit `2026-10-28-415` (FS1–FS18; supersedes in part `-389`
  headline / §1 items 1 and 6, `-394` item 1's bridged clause, `-404`'s six → seven; departs from `-366` decision 6 for `0188` / 6.32)
  committed ALONE as `34a0cb6d` (next free re-checked: `-414` is the ruling, nothing else took `-415`). The `-210` anchor date corrected
  in the draft before commit (`2026-09-08-210`, not `08-31`).

- (g) Task 0.4 — the records, 2026-10-28 (one commit): `epics.md` — `### Story 5.8b` between 5.8 and 5.9 (the 5.10 format) and a dated
  note under Story 5.8's ACs (AR-20's SMS-only shape is built as FS3 / FS4 (d) / FS17); architecture §3.4 — ONE dated annotation after the
  2026-10-25 one (trigger, words, who, how, the switch, the cap seven — naming the 2026-10-25 *"six occasions per cycle"* and note (b) as
  superseded in part); roster — Row 43 `degraded-bridge-sms-live` appended (legs (a)–(i), (f) / (g) MET), Row 40's notes cross-referenced,
  Row 30 note (1) extended to templates 23–24 (dated); DLT sheet — rows 23–24 in the main table, the setup step (3) dated note (24 Unicode),
  the exigency line and fixed shares under "Shape rules", a wording section "templates 23–24 (Story 5.8b …)", a cost paragraph, a
  rejection-table row and a Record row (segment figures computed from the words; ⚠ to be PINNED from the real registry at Task 7 — the
  `sms-segment-cost.test.ts` leg); deferred-work — a new 5.8b section (FS18's 6.32 renumber, the dead `resolveDegradedModeActive`, the
  unlinked admin page, the posture-notice pointer, the unpaced burst, the hourly re-fan inference, the automatic trigger, the suppression
  hook) and the four older items annotated (5.11's bridge item, 5.8's two, 8.8's sweep item); `.decision-log.md` — dated pointers under
  `-404`, `-394`, `-390`, `-389` and `-379` (⛔ a word of theirs edited). Checks run: `pnpm dlt-typed-variables:check` passed; the gate's
  25 tests, and `apps/jobs` `contribution-sms-templates`, `suspicion-notice-sms-templates`, `peer-mesh-sms-templates`, `sms-segment-cost`
  and `dlt-template-sheet` (207 tests) all pass with the new sheet rows. Ledger `2026-10-28q`; row `ready-for-dev → in-progress`. ⚠ Not
  done here (by design): the registry, catalogue and code (Task 1+); 6.32's session is NOT yet told of FS18 — the deferred-work item and
  BigDev carry it.

### Completion Notes List

(open)

### File List

(open)

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-27 | v1.0 | Created via `bmad-create-story 5.8b` (pinned `4e57fa42`): two read-only code traces (the trigger chain and the cycle-open alert; the send machinery and the closed list of edit sites) plus the governance, framework and records reading. FOUND F1–F16 — incl. that the row's named draft is the degraded-POSTURE notice, not the bridge's words (F3); that the trigger chain is built end to end (F2); that the recovery sweep de-bridges by documented design (F9); that no ratified entry rules on the bridge's trigger, cost or words (F15); and that 5.11's "no pool-opening text" guards are in code and tests (F16). FS1–FS14 and PQ1 PROPOSED for BigDev at Task 0.2. Status `ready-for-dev`. |
| 2026-10-27 | v1.1 | Fresh-context fact-check applied (about 75 cites confirmed): FS7 (a) gains a contract refinement (`alert_published` may carry a block only when `time_critical`) because THREE existing tests assert the contract refuses a block there (F16); the admin module has no tests (AC8, FS11 — new ones); templates 7–14 already carry three variables (F12); `-394` item 1 is the ruling behind the retry arm and is superseded in part (F8, FS9, AC0); the stale ledger letter, R10(B)'s source, README §5's "same template body" row, the closed list's omissions (`:858-870`, `:920-929`, Row 30 note (1)) and several quotes corrected. |
| 2026-10-28 | v1.2 | `bmad-create-story validate 5.8b` — three read-only verifiers (the fan-out / contract / record; the producer / sweep / screen; governance / records) re-checked about 200 claims against `4e57fa42` and `origin/main` `64e01121` (11b.4a landed). Applied: S7 ANSWERED — a deceased member IS rostered (F7) ⇒ NEW ⭐ FS4 (d), I10, G10 (§3.4 lifecycle suppression), T22; G6 re-read as a WIDENING of what the Panel was told (pool openings "never texted") ⇒ NEW PQ2, FS16, `-389` headline / §1 item 1 added to the supersede list; F8 / FS9 corrected — the `-394` quote had dropped its ⛔, and the arm's removal changes only a bridged no-target member with a named WhatsApp refusal; F11 / FS11 / AC8 — the page header and banner already promise AR-20's SMS-only send; FS11's sentence rewritten truthfully; the `smsMemberName` EXACT caller fence added (F16, T11, closed list); the en cost with a Devanagari name ⇒ NEW FS15; FS3 gains the trail order, the Telegram mirror on bridge-`sent`, §3.4 `:2308`'s scope, FS3.1 (the `deferred` row); FS10's shape (`loadCycleFrozenPayload`, the sweep has no `committed_at`, the hourly re-fan); the legacy conversion is a test, not code; `-404` six → seven is a supersede in part; PQ1's October withdrawal; PRD `:1074`; `-181`; the sign-off's scope; helpdesk is `helpdesk_reply`; T4; the red-vs-extended test split; every number re-found (next: `-414`, Row 43, DLT 23 / 24, `0189`, ledger `-28l`). |
| 2026-10-28 | v1.3 | Task 0.1 DONE: rebased onto `origin/main` `64e01121` (one ledger conflict, prepend-resolved; changed-line sets verified equal) and re-pinned; F1–F16 re-verified (only `boot.ts` cites moved: `:162`, `:788-800`); S1, S3, S5, S6 clear; S2 tripped by 6.32's known roster / migration overlap (sequenced: `-414`, Row 43, `0189`); S4 clear locally, deployed environments un-attested; S7 re-confirmed. Debug Log (d). |
| 2026-10-28 | v1.4 | Task 0.2 ANSWERED: BigDev "FS1-FS16 as recommended" — every ⭐ option, each with its cost line, recorded in Debug Log (a) (FS4 (d), FS3.1 (a), FS11 plus the FS4 (d) sentence; the `-404` and `-394` supersedes-in-part go into the decision at Task 0.3). Still open: PQ2 / PQ1 (the Panel's), roster leg (b) (the Hindi review not confirmed in session), S4 (deployed environments) and S2 (the sequencing) — asked, unanswered. Ledger `2026-10-28n`. |
| 2026-10-28 | v1.5 | Task 0.3 (part): the Panel note WRITTEN, ⛔ not sent — `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-28-5-8b-degraded-pariwar-cycle-open-text.md`; E4 run (two mismatches found and fixed in the note); the PQ section points to the note, which governs (cost per FS15 (a): ≈ 2 parts, up to 3, either language). The author-commit decision is not yet staged. Debug Log (e). Ledger `2026-10-28o`. |
| 2026-10-28 | v1.6 | ⚖️ THE PANEL RULED — `2026-10-28-414` (Trustee-ratified, DR + KB; committed ALONE `9ffd9466`): PQ2 A with a Super Admin on / off switch, PQ1 A. Note ruling block transcribed (SENT, by the answer). "After the Panel's ruling" added: FS6's interim not built (`-379` form sent; `too_long` omitted + one alarm), FS16 ended, go-live legs (f) / (g) MET. FS17 (the switch — ⭐ Trust-wide, `super_admin` only, starts OFF) and FS18 (the migration under BigDev's merge order 5.8b → 6.32 — ⭐ 5.8b takes `0188`) PROPOSED. S2 answered. Debug Log (f). Ledger `2026-10-28p`. |
| 2026-10-28 | v1.7 | BigDev "FS17 a, FS18 a". Author-commit `2026-10-28-415` (FS1–FS18) committed ALONE `34a0cb6d` ⇒ Task 0.3 DONE. Spec propagated to the ACs and Tasks ([[feedback_spec_edits_must_propagate_to_tasks]]): AC0 MET for the decisions; AC3 names migration `0188` (+ the switch table); AC4 sends `full` and `shortened`, omits only `too_long`; AC5 the switched-off branch; AC8 the two added sentences and the banner's off state; AC10 legs (a)–(i), the 6.32 note, the dated pointers; NEW AC12 (the switch); Tasks 2 / 4 / 6 / 8 updated. |
| 2026-10-28 | v1.8 | Task 0.4 DONE — the records (epics, §3.4 annotation, roster Row 43 + Rows 30 / 40 notes, DLT sheet 23–24, deferred-work, dated pointers under `-379` / `-389` / `-390` / `-394` / `-404`); sheet tests and the DLT gate green. Task 0 DONE. Status `in-progress`. Debug Log (g). Ledger `2026-10-28q`. |

