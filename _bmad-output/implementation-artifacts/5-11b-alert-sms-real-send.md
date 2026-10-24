---
baseline_commit: 0e9b261d
---

<!--
PINNED: 0e9b261d (origin/main, "story(6.36e): ledger 2026-10-24v — LANDED on main by fast-forward"; the branch was REBASED onto it
2026-10-25 — created at `6c4c1e47`). Branch `story/5-11b-alert-sms-real-send`, worktree `.claude/worktrees/5-11b-alert-sms-real-send`.

Two facts, kept apart (footgun #24): (1) the PIN is valid iff `git merge-base --is-ancestor 0e9b261d HEAD`; (2) the FOUND FACTS
are valid iff `git diff --name-only 0e9b261d..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory` is EMPTY
or every changed path is re-checked against the F it touches. Re-run BOTH at Task 0.1. (`6c4c1e47..0e9b261d` = Story 6.36e: it moved
F14 / F17's lines and F21's RTBF pin — all re-taken below; no file the story edits changed.)

STATUS: 2026-10-24 created (`bmad-create-story 5.11b`) → ready-for-dev. 2026-10-25 VALIDATED (v1.1, four read-only checks: code claims ·
governance · end-to-end design · tests and gates). 2026-10-25 ANSWERED (v1.2): BigDev accepted every ⭐ option of FS5, FS6, FS8,
FS9, FS12, FS17–FS23 (Debug Log (a)); Task 0.1 done; Task 0.3's decision `2026-10-25-404` committed ALONE (`447c91e0`); Task 0.4's records
committed next (the row stays `ready-for-dev` until `bmad-dev-story 5.11b` starts — 5.11's precedent). Next: Task 1.

WHAT 5.11 LEFT: Story 5.11 (`done`, landed `7489a296`) decided WHAT is texted (three notices × hi / en, templates 17–22), to WHOM
(`-390` Q1 B), in WHICH words, and made the rung HONEST: a lit, eligible member ends `skipped_no_target` / `sms_send_not_wired`.
This story replaces `sms_send_not_wired` with a REAL send. Its starting facts were 5.11's "Carried to 5.11b" section — every one
re-verified at this pin (four read-only verifiers, 2026-10-24); corrections are marked ⚠ CORRECTED.

NUMBERS (footguns #19 / #42(e); `-366` decision 6 — the number belongs to the first COMMIT that takes it on any branch): found AT THE
TIME OF USE, never planned here. At the pin `0e9b261d`: decision — main holds `-396`, `-397`, `-399`, `-401`–`-403`; the 11b-4
worktree holds `-391`–`-393`, `-395`, `-398`, `-400`; nothing above `-403` exists on any ref ⇒ the next free is `-404`. Migration —
main's highest `0181_member-nominee-links` (`when` `1795146000025`); the 11b-4 worktree holds `0181_memorial-authorship` (the SAME
`when`) AND `0182_memorial-send-idempotency-key` (`when` `1795232400026`) and must renumber both at its rebase (→ `0182` / `0183`) ⇒
5.11b's number is `0184` or the next free AT COMMIT, with a `when` strictly above `1795232400026` and above 11b-4's renumbered entries
([[project_sibling_migration_when_order_shared_db]]). Roster — highest `### Row 40` (11b-4 plans 41); 5.11b adds ⛔ row. DLT sheet —
highest template #22; 5.11b adds ⛔ template. The CRQID kind — two letters not in `cr ce sn pm ot` (FS22 proposes `as`).

§0 GATE (trustee-panel-routing-note-TEMPLATE.md) — readings. ⭐ None of FS5–FS23's RECOMMENDED options is the Panel's; the options
marked "Panel's" below are NOT recommended and, if chosen at Task 0.2, STOP the story for a routing note.
  G1  `-390` Q1 B (Trustee-ratified): *"any member the app (and WhatsApp, where used) could not reach"* gets the three texts. 5.11b
      changes ⛔ reach — MATCH. The predicate `isAlertSmsFallbackEligible` is read, ⛔ edited.
  G2  architecture §3.4 (`architecture.md:2318-2324`), ratified via `-065`: *"WA delivery returns undelivered after the committed retry
      window (3 attempts × exponential backoff)"*. `-390` superseded §3.4 IN PART — the sentence excluding members without a WhatsApp
      yes — and not the window clause. ⇒ FS9 (a) MATCHES §3.4's COUNT ("3 attempts") and SHAPE (pg-boss `retryBackoff`) under TWO AUTHOR
      READINGS, stated here, ⛔ hidden: (i) one POOL-job run = one WhatsApp attempt — true in code: D9 (`contribution-notify.ts:40-60`,
      `backoffMs: []`) re-runs the whole ladder on a job retry, and a WhatsApp `sent` is never re-sent; (ii) "returns undelivered" =
      "the WhatsApp rung did not end `sent`" — this path sees the SEND result only, ⛔ a delivery report (a WhatsApp `sent` later
      undelivered never reaches SMS, `contribution-notify.ts:218-228`); the note `-390` ruled on
      (`trustee-panel-routing-note-2026-10-23-5-11-sms-for-members-without-whatsapp.md`) TOLD the Panel so: *"For member notices the code
      counts a WhatsApp message as reaching the member once Meta accepts it."* ⚠ AR-19 (`epics.md:304`) reads *"3 retries × exponential
      backoff"* (four attempts); FS9 follows §3.4's "3 attempts". The window's DURATION is not ratified (5.6's default schedule is 30 s /
      5 m / 30 m ≈ 35 min; FS9's ≈ 3–6 min). FS9 adds a TIME conjunct to `-390`'s predicate (the Policy meaning says so). FS9 (b) (never
      wait) DROPS §3.4's window ⇒ the Panel's. FS9 (a′) — see FS9: the Panel's. For a member with no WhatsApp target the window has
      nothing to wait for (5.11's carry) — MATCH.
  G3  `-387` (author-commit) keeps OUT, as the Panel's: *"the Panel's, ⛔ taken: LS10 (c) for the TEXT (sending a member who chose
      English the Hindi TEXT because the English template is unusable — it narrows G1 with ⛔ need; the text waits only briefly)"* —
      where `-387`'s "G1" is `-303`'s rider (the NEIGHBOURS' text), ⛔ this story's G1. `-310` CF1 A and the `-303` rider are both
      neighbours-only ⇒ ⛔ ruling covers THESE texts' language; LS11 hands the rule to *"a story or ruling that sets a language rule for
      that message"*. `-385` (Trustee-ratified) is where the Panel decided this trade-off itself — the Pariwar's language ONLY for the
      two-day WhatsApp reminder. ⇒ FS5 (a) (the member's language, else ⛔ text) is the author's, within LS11; FS5 (c) is the trade-off the
      Panel decided itself for the reminder ⇒ treated as the Panel's BY ANALOGY.
  G4  `-387` LS13 — the language screen tells the member *"Some messages from the Trust (SMS and WhatsApp) will also come in this
      language."* FS5 (a) keeps that promise for these three texts; LS11's deferred item is discharged FOR THEM (push AND WhatsApp stay as
      listed).
  G5  `-390` "Not covered": *"the price per text and any per-member budget — Story 5.11b, recorded when priced"* — an explicit DEFERRAL
      to the pricing (Row 40 (d)), ⛔ a delegation of a rationing rule. 5.11b sets no price budget; FS8 is a FLOOD GUARD, the author's.
      ⚠ A cap that stops a text the ruling owes is a NARROWING of `-390` ⇒ FS8's cap sits ABOVE every legitimate per-day CONSUMPTION
      (FS8's rule) — ⛔ a rationing rule.
  G6  `-345` MG12 (author-commit): *"the alert dispatch path stays DARK: a send with ⛔ named values is refused locally
      (`no_named_values`)."* FS12/MG12 change (zero-slot templates sendable) supersedes it IN PART — the author's (Task 0.3).
  G7  `-347` DR3 (author-commit): CRQID = two-letter kind + the send row's uuid, *"defined once, in `@twt/domain`"*, kinds *"(`cr`, `ce`,
      `sn`, `pm`, or `ot` for a login code)"*; DR12: the silence alarm covers *"accepted SMS sends finalised between 48 hours and 7 days earlier that have no
      report"*. FS22 EXTENDS DR3's kind list by `as` (supersedes it IN PART — the author's, Task 0.3) and MATCHES DR12. DR3's crash rule
      (a malformed CRQID *"does not record the attempt as a final outcome"*) is kept: on this path a bad CRQID is a code bug, the row stays
      `attempting`, and FS6's lease rule handles it.
  G8  `-394` items 1–3 (author-commit): item 1's retry rule, item 2's pool-value rule, item 3's accepted residual (*"carried to 5.11b,
      whose real send and retry window re-decide it"*). FS9 / FS21 / FS17 supersede them IN PART — the author's (Task 0.3).
  G9  Row 40 (a) / `-389` item 7 (author-commit): *"No id is set before its template is approved"* (`-349` decision 1's SHAPE — that
      decision itself is a go-live condition for the CLAIM flows, templates 1–14). ⇒ at merge NO id is set ⇒ no text is sent in production
      until Row 40 (a) closes (day-one output below). MATCH.
  G10 Consent to these texts — counsel's, roster Row 40 (f) (`-390` "Not covered"; `-375`'s *"any SMS consent (row 5-11)"*). A
      GO-LIVE leg, ⛔ a build question; 5.11b neither answers nor routes it ([[project_not_in_production_merge_is_not_golive]]).
  G11 Cost-optimization vs `-390` (5.11 D4 (b), deferred-work "second full review") — CARRIED unchanged: 5.11b keeps the rung's order
      (`cost_optimized` first) and does ⛔ touch the toggle (hard-coded `false`).
  G12 Quiet hours — ⛔ ratified rule for any MEMBER SMS (grep of `architecture.md`, `.decision-log.md`, the PRD). The Panel HAS ruled
      send hours for CLAIM messages: `-250` #5 (Trustee-ratified; the 10:00 hour) and `-368` Q1 A (Trustee-ratified; the claimant's
      WhatsApp reminder, *"About four hours after the failed text, between 9 am and 8 pm (a later failure waits for 9 am)."*); the
      peer-mesh window (`claim-peer-mesh-requests.ts:12`) is an author-commit. ⇒ FS23 (a) MATCHES `-390` as put (no hour was put);
      FS23 (b) / (c) DELAY a ruled text — the kind of choice the Panel made itself in `-368` ⇒ Panel-adjacent (a non-blocking confirm,
      footgun #55(b)), ⛔ recommended.
  G13 FS5 (a) WITHHOLDS a `-390` text from a member whose chosen language's template is unusable while the other's is usable. Reachable
      in production only on a FAULT (Row 40 (a) needs all six ids; a malformed id, or a proven pre-flight fault after go-live) — `-387`'s
      "a fault, ⛔ a policy choice" shape. The author's, stated; a non-blocking confirm is offered with the next Panel note (#55(b)).
  G14 `-347` consequence 5 (author-commit) keeps deferred-work's two at-least-once SMS items open on *"a gateway idempotency key"*. FS6 (a)
      with FS9's narrowed transient class (only `rate_limited` re-sends) is AT-MOST-ONCE and does not join that class; FS6 (b) — or keeping
      `api_unavailable:*` re-sendable — JOINS it (recorded on those items, dated). Either way the author's.
  G15 `-345` MG5 (author-commit; `-346` decision 3 narrows it: a pre-flight transient is cached 60 s) sets the pre-flight rule PER PATH
      (fail-closed for the first texts; fail-open for correction / closure / certificate). FS17 EXTENDS it to a NEW path, fail-open —
      supersedes MG5 IN PART (the author's, Task 0.3).
  NOT covered by any ruling: the price per segment (Row 40 (d)); counsel's view (Row 40 (f)); quiet hours for member SMS (FS23).

GLYPH REGISTER: ⛔ marks a prohibition at the START of a bullet or clause only — inside a sentence this file writes "not" / "never".
⭐ = recommended / load-bearing; ⚠ = trap or caveat. `.decision-log.md`, `deferred-work.md` and `sprint-status.yaml` are NEVER cited
by `file:NNN` (newest-first prepends move every line).

LETTERS: F = found facts (this story's own, numbered fresh) · FS = build decisions — FS5 / FS6 / FS8 / FS9 / FS12 KEEP 5.11's names
(the epics entry and `-389` cite them); new ones start at FS17 (5.11 used FS1–FS16) · I = invariants · T = traps · S = Task 0.1 STOP
conditions. G = §0 readings (above).

⚠ ORDER OF THE SEND (the one sequence every FS below assumes — read it first):
  prepare (config, MG4, render, values, pre-flight — ⛔ row, ⛔ CRQID; FS17) → read the send row, READ-ONLY (found `accepted` ⇒ `sent`;
  final ⇒ terminal; in flight ⇒ retry; FS6) → FS9's window check (no budget consumed) → `dispatch` with the one-send provider (FS18),
  whose `send` runs BEGIN (one `withPariwarScope` tx: INSERT … ON CONFLICT + read, + FS8's consumption if a counter is chosen) → CRQID +
  gateway call (no connection held) → FINALISE (CAS on the attempt's claim token); a begin that finds the row taken, or fails, THROWS a
  typed sentinel (dispatch records `error`, writes no `alert.channel_send`) and the seam maps it from the closure → the rung's recorded
  detail (AC4's table). BEGIN runs INSIDE dispatch so a SUPPRESSED member never gets a row. The seam NEVER throws (FS6).
-->

# Story 5.11b: The Real Alert SMS Send — the Three Contribution Texts Actually Go, Once, in the Member's Language, After WhatsApp's Window, Under a Flood Guard `[CONSUMER]`

Status: review

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
> `in_app_only`, ⛔ send row, ⛔ dispatch / audit line, ⛔ budget (FS17's prepare step), ONE alarm per (config key, detail) per memo window —
> ⛔ one per member (AC4) — the same retry profile as 5.11. The first real text needs Row 40 (a) + Row 32's gateway legs; Row 40 (e) (a real
> text on a device from staging) becomes observable for the first time. ⚠ DEPLOY ORDER: the migration, then the api (the webhook's CRQID
> pattern admits `as`), then the jobs that send `as` — a report for an `as` text reaching an older api is stored with a NULL CRQID and
> settles `no_crqid` for ever (roster Row 40 dated note, Task 0.4).
>
> **What already ships and this story REUSES:** the MSG91 adapter (`createSmsDltProvider`, `sms-app.ts` flow client), the pre-flight
> memo (`createMsg91PreflightMemo`), `formatSmsCorrelationId`, `substituteDltValues`, the claim send core's checks
> (`claim-dlt-sms-send.ts`), the delivery-report pipeline (0167, `reports.ts`, the correlator, the silence alarm), the 5.11 registry
> (`contribution-sms-templates.ts`, `renderContributionSms`, `smsPoolLabel`), the 5.11 predicate and rung, `checkAndConsumeSmsBudget` (only if FS8 keeps a counter)
> (0049), the `includeMetadata` retry-count precedent.
>
> **What it CHANGES:** one migration (a send table with an `occasion` CHECK; the two 0167 kind CHECKs replaced) + its schema file,
> barrel, `policies/<table>-rls.ts` and RLS spec; `correlation.ts` + its mirrors; `reports.ts` (LOOKUP, silence counts) + the correlator
> + `sms-delivery-silence.ts`; the claim send core split, INSIDE `claim-dlt-sms-send.ts`, into prepare / send + the claim wrapper (FS17);
> MG12 in `sms-dlt.ts` and `sms-app.ts`; `contribution-notify.ts` (the SMS rung's send seam, an optional `suppression` hook on
> `ContributionNotifyDeps` passed to EVERY dispatch, `shouldRetryFanOut`, the recorded details); `contribution-notify-triggers.ts`
> (per-member `smsLocale` for the `sms` block, the attempt + job id down the call chain, `includeMetadata` on the POOL_BATCH and MISMATCH
> workers); `boot.ts` (the pre-flight built before the contribution deps; the SMS deps passed; the bucket vacuum wired, if FS8 keeps a
> counter); `smsPoolLabel` (FS21); the WhatsApp memo's `off` state (FS20); records; tests. ⛔ edit to `dispatch.ts` / `cascade.ts` (sha256-
> fenced — T16).
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
| `2026-10-17-346` decision 3 (author-commit) | A pre-flight transient is cached for 60 s (narrows MG5). | BUILT (6.37) — G15 |
| `2026-10-17-347` (author-commit) | DR3: CRQID = kind + row uuid (34 chars) inside the recipient; *"defined once, in `@twt/domain`"*; kinds *"(`cr`, `ce`, `sn`, `pm`, or `ot` for a login code)"*; DR6: report retry schedule up to 72 h; DR12: the silence alarm (48 h – 7 d, accepted, no report); consequence 5: the at-least-once SMS items stay open on *"a gateway idempotency key"*. | BUILT (6.37b) — G7, G14 |
| `2026-10-23-387` LS10 / LS11 / LS13 (author-commit); `2026-10-23-385` (Trustee-ratified) | LS10 (b): the NEIGHBOURS' TEXT (LS11's scope) whose language's template is unusable WAITS / stays unsent; LS10 (c) (the other language for that TEXT) *"the Panel's, ⛔ taken"*; LS11: other senders keep their language until *"a story or ruling that sets a language rule for that message"*; LS13's screen promise. `-385`: the WhatsApp reminder only may fall back to the Pariwar's language. | G3, G4, G13 |
| `2026-09-27-250` #5, `2026-10-20-368` Q1 A (both Trustee-ratified) | Send hours for CLAIM messages (the 10:00 hour; the claimant's WhatsApp reminder 9 am – 8 pm). ⛔ member SMS. | G12 |
| `2026-10-19-366` decision 6 | *"the number belongs to the first COMMIT that takes it on any branch"* | numbering |
| Roster Row 40 `member-alert-sms-fallback-live`; Row 32 `sms-gateway-msg91-provisioned`; Row 30 note (1) / leg (d) (`inventory-roster.md`) | Row 40 (a)–(f) (templates 17–22 approved + ids; Hindi reviewed; Row 30 (d) answers incl. *"a template with no variable"*; price; *"a real alert SMS received on a device from staging (needs row 5-11b)"*; counsel). Row 32 (b), (d), (e), (g) are not scoped to claim texts. | open — go-live, ⛔ build |

## ⭐ THE INVARIANTS

- **I1 — A text goes at most once per (alert, member, occasion).** The send record's UNIQUE key is the keyed store's own scope
  (`day_10`, `pending_match_escalated`, `mismatch:<reason>` — F4; a CHECK admits only those literals), so a job retry, a sweep re-run, a
  keyed-store TTL expiry or two workers can never send the same notice twice. A row found `accepted` counts as `sent` WITHOUT a send. Only
  a send the gateway DEFINITELY did not take is ever re-sent (`rate_limited:*` — FS9); every `api_unavailable:*` (timeout, `body_read`,
  transport, 5xx — the gateway MAY have taken it) is FINAL. ⚠ If BigDev keeps `api_unavailable:*` re-sendable at Task 0.2, I1 reads "at
  most once, but for a rare gateway fault" (G14). *Proof:* AC3.
- **I2 — Sent body = registered text with the member's values, byte for byte.** The body rendered through the real `t()`
  (`renderContributionSms`) equals `substituteDltValues(registeredText, slots, values)`; the template id is the one for the BODY'S
  locale. (5.11's I1, now enforced at send.) *Proof:* AC2.
- **I3 — ⛔ text in a language the member did not get by rule** — the member's chosen language, else their Pariwar's default; never the
  other language because a template is missing (G3). *Proof:* AC5.
- **I4 — Every rung respects `dispatch`'s lifecycle-suppression boundary** (5.11's DELIBERATE block, `contribution-notify.ts:372-380`).
  ⚠ Today no rung has a hook: `ContributionNotifyDeps` has no `suppression` and `dispatchOneChannel` (`:328-338`) passes none ⇒ every
  dispatch runs `noLifecycleSuppression`. 5.11b adds an OPTIONAL `suppression?: LifecycleSuppressionHook` to the deps and passes it to
  EVERY dispatch (push, WhatsApp, SMS) — an SMS-only hook would be theatre. *Proof:* AC2 (one suppressing hook ⇒ push AND SMS
  `suppressed`, ⛔ row, ⛔ gateway call).
- **I5 — Every non-send names its reason** in the recorded trail (an allow-listed detail, never provider error text), and only the
  retryable classes AC4 names (FS9's window wait; `rate_limited`; a send in flight; the send state unavailable; a Secret Manager
  transient before any row) put a member back on the retry set. *Proof:* AC4.
- **I6 — Reach is unchanged.** `isAlertSmsFallbackEligible` and `alertSmsBlock` are byte-unchanged; no broadcast can reach a template
  (5.11's I5). *Proof:* AC8 (a source pin) + 5.11's tests green unchanged.
- **I7 — Claim texts unchanged.** Templates 1–14 send exactly as before FS17's split — every claim send test passes UNEDITED. *Proof:* AC7.

## 📜 Policy meaning (AI-10-1)

**5.11b adds conjuncts to the predicate that decides whether a member is TOLD, by text, about their own contribution** (5.11's
predicate gates no benefit itself, but a missed cycle counts under R7's lapse ladder and R8's ninety-percent rule — 5.11's Policy
meaning). In the member's terms: *"If the app — and WhatsApp, when your Pariwar uses it and three tries have failed — cannot reach
you about your own contribution, the Trust sends you the text once, in the language you
chose in the app (or your Pariwar's language if you never chose); if that text cannot be sent in your language you are not texted in
the other one, and the same notice is never texted to you twice."* **Niyamavali check — done, with
this result:** no clause names SMS (`grep -i sms packages/domain/seed/niyamavali-v1-clauses.sql` — empty at the pin; the seed holds no R10
at all; 5.11's check of the rulebook, its FR mapping and both amendment drafts stands); R10(B) (`_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:1255`)
makes the in-app surface the official channel and the member responsible for missed information ⇒ every conjunct here is CONSISTENT
with the Niyamavali as written. The conjuncts are bounded by G2 / G3 / G5 so that none drops a text `-390` owes — except two stated
cases: FS5 (a)'s fault case (G13) and, if chosen, an `api_unavailable:*` that may already have been taken being recorded final rather
than re-sent (G14; the member keeps the in-app notice — R10(B)). FS8's rule is set above every legitimate CONSUMPTION for the same
reason. (The Niyamavali is a rulebook, not a ratified spec — [[feedback_niyamavali_rulebook_not_spec]].)

## ⭐ FOUND FACTS (at `6c4c1e47`, re-checked at `0e9b261d` 2026-10-25 — re-run each at Task 0.1)

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
  a throw is alarmed and retried (`:576-584`). ⚠ When `rung()` throws, `runChannelCascade` records `error` with no detail and no alarm
  (`cascade.ts:127-131`) and `rungOutcomes.set` (`:410`) is skipped ⇒ the predicate reads `undefined` ("not sent") AND
  `shouldRetryFanOut` returns `false` for any member with an SMS target (`:538`) ⇒ a throwing seam silently ends the member
  `in_app_only` — ⛔ text, ⛔ retry, ⛔ alarm. ⇒ the seam NEVER throws (FS6).
- **F3b — other callers** (the new parameters must be OPTIONAL, absent = the final attempt): `shouldRetryFanOut` is also called by
  `news-publish.ts:240` and `survey-publish.ts:217`; `fanOutAlert` directly by `news-publish.ts:237` and `survey-publish.ts:214`;
  `fanOutAlertToMembers` by `helpdesk-reply-notify.ts:123` and `moderation-notify.ts:414`. `serializeFanOutResult`'s test
  (`contribution-notify.test.ts:764-785`) still uses `sms_send_not_wired` ⇒ it stays in `SMS_RUNG_DETAIL` (the seam-absent case).
  `RECORDED_RUNG_DETAILS` is an EXACT-string `Set` (`:190-194`, read at `:208`) parsed by no contract / zod schema ⇒ a detail not in it is
  silently dropped from the trail.

**Occasions, producers, workers**
- **F4 — the alert id is PER CYCLE; the OCCASION is the scope.** `idempotencyScope` (`contribution-notify-triggers.ts:656-660`):
  `day_<N>` / `pending_match` / `pending_match_escalated` / `cycle_open`; confirmed `'confirmed'` (`:1310`); mismatch
  `` `mismatch:${p.reason}` `` (`:1381`). Key `contribution.notify:<alert>:<member>:<scope>` (`memberKey`, `:662-664`). TTL 300 s (`:108`;
  pending-match 30 days, `:138`) and even completed keys are vacuumed ⇒ the keyed store is ⛔ a durable once-only guard for SMS.
  ⚠ CORRECTED: 5.11's carry said *"one row per (alert, member), UNIQUE"* — that key would collide day 10 with the escalated notice
  and every mismatch reason. The occasion is part of the key.
- **F5 — the three lit producers** build `sms: { message, locale, values }` with `locale = deps.locale ?? DEFAULT_LOCALE` — one per
  JOB, ⛔ per member — at `:698` (POOL_BATCH: day 10 + escalated) and `:1378` (MISMATCH); (`:1307` is the CONFIRMED worker — ⛔ lit): day 10
  `buildDeadlineReminderAlert` (`:338-377`, `cycleDay === 10` at `:366-374`, `values: { pool: smsPoolLabel(identity, locale), date }`);
  escalated `buildPendingMatchRetryAlert` (`:387-414`, `:409-411`); mismatch `buildContributionMismatchAlert` (`:449-474`, `values: {}` at
  `:471`). ⚠ Each builder takes ONE `locale` that feeds BOTH the push `t()` and the `sms` block (`:362-371`, `:404-410`, `:469-471`) ⇒ FS5
  needs a NEW builder input `smsLocale` (default `locale`); the builders are exported and called by tests. The alert is REBUILT per member
  per attempt — `alertFor(memberId)` (`:789-`) closes over the pool `identity` resolved once per job inside a `withPariwarScope` (`:727`);
  ⛔ alert payload is persisted for re-use. ⇒ a per-member locale can be applied AT THE PRODUCER with no Alert-contract change.
- **F6 — workers.** POOL_BATCH `boss.work(…, { localConcurrency: 8 /*:103*/ })` (`:1441-1453`); CYCLE_OPEN `:1456`, CONFIRMED `:1472`,
  MISMATCH `:1488` — ⛔ `includeMetadata` anywhere; handlers pass only `job.data`. Retry: `CHILD_RETRY_LIMIT = 4` (`:112`),
  `CHILD_RETRY_DELAY_SECONDS = 60` (`:113`), `retryBackoff: true` (CONFIRMED `:528-530`, MISMATCH `:557-559`, POOL_BATCH `:583-585`) ⇒
  5 runs, `retryCount` 0…4. Chain: `runContributionNotifyChild` (`:675`) → `fanOutAlertToMembers` (`:849`) → `fanOutAlert`. A retried
  member's claim is released and the job throws (`:855-865`, `:891-898`; CONFIRMED `:1337-1347`, MISMATCH `:1401-1411`). One `deps` object
  is shared by every worker and up to 8 concurrent POOL_BATCH jobs ⇒ the attempt is a PER-CALL parameter. ⚠ pg-boss keeps the SAME
  `job.id` across retries ⇒ a job id alone cannot tell attempt 0 from attempt 1 (FS6's claim token is `${job.id}:${retryCount}`).
  ⚠ Members are claimed per chunk (`DEFAULT_MEMBER_CHUNK_SIZE = 200`, `:99`) BEFORE their sequential fan-out, TTL 300 s (`:108`,
  *"MUST exceed the worst-case per-member fan-out"*); a 10 s SMS timeout per member can push a 200-member chunk past 300 s — the send
  row protects the TEXT, ⛔ the push (FS6's cost line; Task 3 bounds or records it).
- **F7 — `includeMetadata` precedent** (pg-boss range `^12.19.1`, `apps/jobs/package.json:31`): `claim-contact-ladder-whatsapp.ts:660-668`
  (`job as Job & { retryCount?, retryLimit? }`, type-guarded; final-attempt rule `:408`); `claim-correction-reminders.ts:145-150,
  :1491-1500`; a test asserting the registration option: `claim-correction-control-paths.test.ts:565`.

**The send machinery**
- **F8 — the provider and MG12.** `createSmsDltProvider(deps)` (`packages/channels/src/providers/sms-dlt.ts:66`; deps `:37-45` —
  `messaging`, `dltTemplateId`, `values?`, `correlationId?`); MG12 at `:72-81` refuses `values === undefined || values.length === 0`
  ⇒ `rejected` `dlt_template_not_approved:no_named_values` before any call; accepted `:84-89`; any throw ⇒ `rejected` with
  `<errorClass>:<code>` (`:90-101`); never `not_implemented`. ⚠ NEW: the MSG91 client refuses empty values A SECOND TIME
  (`packages/channels/src/providers/sms-app.ts:335`, `localRefusal` `:331-351`); the flow body (`:315-325`) is
  `{ template_id, short_url:'0', recipients:[{ mobiles, <name>:<value>…, CRQID }] }`; `to` must be canonical E.164 (`:391-394`,
  `invalid_number:format`); 9 s client timeout (`:189`). ⚠ `SmsGatewayMessage.values` is a REQUIRED field (`sms-app.ts:50`) ⇒ at the
  client "`undefined` refused" cannot be expressed: only `:335`'s `length === 0` refusal is dropped, and the PROVIDER's `undefined` check
  (`sms-dlt.ts:72`) becomes the only dark-path guard. The client is SHARED with the OTP path (`apps/api/src/deps.ts:426`). ⚠ The
  client's error classes (`:405-420`, `sms-errors.ts:67`): a timeout ⇒ `api_unavailable:timeout`; a transport failure after the request
  was written ⇒ `api_unavailable` (httpStatus 0); a 2xx whose body broke ⇒ `api_unavailable:body_read` — its own comment: *"A 2xx whose
  body broke may have been taken ⇒ ⛔ final"* (`:418-420`); every 5xx (incl. a proxy 502 / 504) ⇒ `api_unavailable`. ⇒ `api_unavailable:*`
  means "the gateway MAY have taken it", ⛔ "definitely not sent". Tests: `packages/channels/tests/sms.test.ts:89-103` (MG12, both
  forms), `:552-554` (client); `apps/api/tests/unit/sms-composition.test.ts:103-109` (composition refused — stays).
- **F9 — the claim send core** `sendClaimDltSms` (`apps/jobs/src/scheduler/claim-dlt-sms-send.ts:263-383`): `correlationIdOrCrash`
  (`:154-166`, requires a kind in the private `CLAIM_SEND_ROW_KINDS` `:148`) → template id + HELPLINE resolved (`:279-291`) → blank id
  ⇒ `config:dlt_template_id_missing`, blank helpline ⇒ `config:helpline_number_missing` — UNCONDITIONALLY, even for a template with no
  helpline slot (`:292-297`) → `isConfigured()` (`:298`) → `isMsg91TemplateId` (`:303`) → render (`:309`) → private `checkedValues`
  (`:199-220`: exact slot names, strings, length ≤ `maxLength` in CODE POINTS — `helpline` exempt — and the rebuilt body byte-equal to
  the rendered body) → pre-flight (`:316-337`, `preflightFailOpen`) → provider built PER SEND (`:340-351`) → `beforeSend` (`:353-357`) →
  send under a 10 s timeout (`:358-382`). Result (`:90-105`): `final` (`accepted` | `rejected_invalid_number` | `rejected_unreachable` |
  `error` + `alarm`) or `transient` (`rate_limited` / `api_unavailable`, incl. `api_unavailable:timeout` — `:373-375`, `:380`). It writes
  ⛔ row and never alarms (`:9`). ⇒ it CANNOT serve the alert texts as is (the helpline). ⚠ `:211` names `fitsDltAlphanumeric`, which
  exists nowhere in code. ⚠ ORDER: `correlationIdOrCrash(input.correlation)` runs FIRST, outside every `try` (`:276`) — it needs the
  send row's uuid ⇒ the config checks (`:279-305`) can only run AFTER a row exists; `beforeSend` is SYNCHRONOUS (`:114`) ⇒ it cannot begin
  a row. ⇒ FS17 SPLITS the core (prepare / send). ⚠ The details it returns (AC4 maps EVERY one): `config_unavailable:secret_manager`
  (transient, `:289`); `config:secret_manager_<code>` (final + alarm, `:290`); `config:dlt_template_id_missing` (final + `alarm: true`,
  ⛔ `:<locale>` suffix, `:293`); `config:helpline_number_missing`; `config:sms_messaging_unavailable`;
  `dlt_template_not_approved:template_id_malformed` (`:304`); a PROVEN pre-flight fault ⇒ `final error`, detail `auth:preflight` or
  `dlt_template_not_approved:<reason>` (`:325-330`); under fail-OPEN an unproven pre-flight fault is SENT with a warning (`:322-323`) ⇒ a
  "pre-flight transient" never defers on a fail-open path; provider `<errorClass>:<code>`. ⛔ `preflight:<fault>` detail exists. Tests
  import `CORRECTION_SEND_TIMEOUT_MS`, `ClaimDltSmsPreflight`, `helplineNotCallbackNumberWarning` and `sendClaimDltSms` from this file
  (≈ 10 files) ⇒ they stay exported HERE. `apps/jobs/tests/claim-suspicion-notice-no-decision.test.ts:28-35` reads THIS file's source by
  path (`NOTICE_MODULES`).
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
  per-send registry holding a values-bound provider + a render override is the way to send a DLT body through it. ⚠ TYPES:
  `DispatchDeps.providers` is a FULL `Readonly<Record<Channel, readonly ChannelProvider[]>>` (`:101`) ⇒ `{ sms: [p] }` alone fails tsc;
  `resolveDelivery` returns a PROMISE (`:94`). ⚠ dispatch hashes the rendered body and writes `alert.channel_send` for ANY provider result
  (`:343-358`), plus one `alert.dispatch` line per call (`:258-267`) ⇒ only a send that WILL reach the gateway may go through dispatch
  (FS18). `alert.channel_send` has no consumer outside `dispatch.ts:353`.

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
  `apps/jobs/tests/sms-delivery-correlator-live.test.ts:33-39` (`Kind` / `TABLE`), `:707-710` (`toEqual({ cr: 2, ce: 1, sn: 1, pm: 1 })` —
  exact keys); `apps/jobs/tests/sms-delivery-correlator.test.ts:131, :145, :288` (a fake row with no `as` ⇒ `NaN` total). ⚠
  `apps/jobs/tests/claim-correction-send.test.ts:705` is the CLAIM wrapper's four kinds — it STAYS UNEDITED (AC7), ⛔ "updated". Correlator
  Row 7 (`sms-delivery-correlator.ts:149-160`, `other_attempt`): a report for an `as` row that is NOT `accepted` (deferred, final `error`,
  `exhausted:outcome_unknown`) alarms `second_request_for_one_send:as` — AC1 names the expected outcome per state. The correlator writes
  `sms_send_deliveries` itself (`reports.ts` `upsertSmsSendDelivery`) ⇒ ⛔ write at accept, but the send row MUST store
  `provider_message_id` or every report hits Row 7.
- **F14 — row precedents.** Peer mesh (0156; `packages/domain/src/claim/peer-mesh-request.ts` begin `:381-510`, finalise CAS `:551-579`,
  transient `:585-600`; a crashed `attempting` row is RE-SENT after a 10-min lease under the same CRQID — at-least-once, alarmed).
  Suspicion notices (0151 / 0155; `suspicion-notice.ts` begin `:715` — `INSERT … ON CONFLICT DO NOTHING` under a lock, finalise `:870`,
  transient `:907` (`:903-921` — the row STAYS `attempting`); UNIQUE `(pariwar_id, claim_case_id, purpose)`; column-narrowed INSERT /
  UPDATE, ⛔ DELETE; a freeze trigger for finished rows); a found `attempting` row is re-claimed ONLY by its own job, or by another job
  past `CORRECTION_SEND_LEASE_MS` = 10 min (`correction-reminder-record.ts:64`; `suspicion-notice.ts:826-829`). ⛔ precedent is
  at-MOST-once; ⛔ precedent has a `deferred` state (FS6's is new).
- **F15 — the keyed store cannot be the record** (`packages/domain/src/idempotency/keyed-store.ts`; `idempotency_keys`, 0012): ⛔ uuid
  row id, ⛔ `pariwar_id`, ⛔ outcome / provider id, TTL-deleted, `pending|completed` only. It stays the per-member CLAIM beside the record.
- **F16 — the budget** `checkAndConsumeSmsBudget(db, { memberKey, windowMs, maxPerWindow, now })` (`packages/domain/src/sms-rate-limit/
  buckets.ts:21-31, :51-54`): ALWAYS increments (even over budget); `sms_rate_buckets` (0049, global `USING(true)`); vacuum
  `deleteExpiredSmsRateBuckets` (`:82`) *"NOT wired to a job"*; ⛔ production caller; ⛔ configured number anywhere. ⚠ A FIXED window,
  ⛔ rolling: `bucketEpoch = floor(now / windowMs)` (`:59`) ⇒ a 24 h bucket resets at 00:00 UTC (05:30 IST), and up to 2× the cap can pass
  across the boundary. It takes a drizzle `Db`; ⛔ peek (checking IS consuming). Granted to `twt_app`, policy `USING(true)`.
  `sms-delivery-prune.ts` is handed only `{ pool }`.

**Language, targets, WhatsApp**
- **F17 — language.** `getMemberLanguage` (`packages/domain/src/member/preferred-locale.ts:53-71`) — 2 queries, THROWS on a missing
  passport / member; callers `apps/api/src/modules/member-language/handlers.ts:51` and `preferred-locale.ts:83`. Set-based
  `COALESCE(m.preferred_locale, pp.locale_default)` exists (`peer-mesh-request.ts:855, :908`; `peer-mesh-wa-reminder.ts:759-780`); the
  closest precedent `resolvePeerRequestLocale` (`peer-mesh-request.ts:726-746`) is ONE `pariwar_passport pp LEFT JOIN members m` query
  that THROWS on a missing passport (`PeerRequestLocaleMissingError` ⇒ hold) or member. `members.preferred_locale` nullable
  (`schema/members.ts:149`); `pariwar_passport.locale_default` NOT NULL (`schema/pariwar_passport.ts:86`).
- **F18 — targets.** `resolveSmsTarget` (`packages/domain/src/notifications/delivery.ts:157-176`): ⛔ opt-in gate; decrypt in try/catch
  (`:166-175`) ⇒ `null`; ⛔ E.164 check (the client's `normalizeMobile` catches a bad `to` — F8). `resolveWaTarget` (`:116-149`) re-reads
  `enabled` + `isOptInActive` per member.
- **F19 — the WhatsApp memo.** `createContributionProviderResolver` (`packages/channels/src/composition/provider-composition.ts:447-502`)
  memoizes per `` `${pariwarId} ${category}` `` (`:453`) for the process; `readWhatsappProvisioning` (`:99-133`) ⇒ `off | refused | ready`;
  doc `:432-436`: a Pariwar memoized `off` keeps the ACCEPTING fixture after WhatsApp is switched on, while the target is re-read live ⇒
  `whatsapp:sent` with nothing sent — and, once SMS is real, ⛔ text either (deferred-work, 5.11's second full review, 2026-10-23 — the
  item *"WhatsApp off → on inside one process …"*, 5.11's label W1, *"Re-trigger: 5.11b"*). ⚠ The memo stores the WHOLE registry Promise
  (push, SMS, WhatsApp, Telegram) per (Pariwar, category) (`:450-500`) — the `off | refused | ready` state is not visible at that level —
  and `fanOutAlert` resolves providers once PER MEMBER (`contribution-notify.ts:321-323`). An un-memoized entry re-runs the Firebase
  service-account Secret Manager read (`:466`), the SMS DLT config read (`:471`) and a WhatsApp + Telegram DB tx (`:477`) on the `max:2`
  pool — per member, per alert, every category (FS20).

**Migrations and tables**
- **F20 — migrations** live in `packages/domain/migrations/`, journal `meta/_journal.json` (last on main: idx 181,
  `0181_member-nominee-links`, `when` `1795146000025`; spacing +86 400 001; 11b-4's branch adds `0181` / `0182` — header NUMBERS). `0140`
  is missing (historical — ⛔ reuse). Snapshots stop at `0020`;
  later migrations are hand-authored (⛔ `db:generate`). No gate checks numbering. Tests do not migrate: `pnpm db:migrate` against
  `DATABASE_URL` first (`scripts/ci-local.sh:137`). The drizzle migrator applies only a `when` greater than the last applied.
- **F21 — a new table must appear in:** `packages/domain/src/schema/<table>.ts` + `schema/index.ts`; a policies file
  `packages/domain/src/policies/<table>-rls.ts` (per-command `pgPolicy`, ⛔ `FOR ALL`, ⛔ DELETE policy) + its export in
  `policies/index.ts` (6.36e's precedent `member-nominee-links-rls.ts`, `index.ts:227`; also `claim-suspicion-notice-rls.ts`); an RLS
  spec `packages/domain/tests/integration/rls/<table>-policy-regression.spec.ts` (templates: `sms-send-deliveries-…`,
  `claim-suspicion-notice-…`); RTBF `packages/domain/src/member/anonymize.ts` — ids + a keyed hash only ⇒ a "nothing to scrub" comment line
  (`:340-346` precedent). The statement-count pin (`rtbf-anonymize.test.ts:231` `toHaveLength(27)` on main — 6.36e raised it from 26;
  11b.4 raises it again; tables `:270` / `:303` = 24) stays UNCHANGED by this story (⛔ statement added) — re-read it after every rebase.
  ⛔ alert or send table is in `data-export/assemble.ts` (re-checked on main). ⚠ ⛔ GLOBAL inventory gate exists (⛔ test enumerates tables
  for FORCE / grants; ⛔ data-export coverage gate) — the per-table registrations ARE the gate. The access-wrapper AST scan's roots
  (`check.ts:66-103`) exclude `apps/jobs` and `packages/domain/src/sms-delivery` — ⛔ claim it covers the seam.

## ⚖️ Build decisions (⭐ = recommended) — ANSWERED 2026-10-25: every ⭐ option ACCEPTED (Decision `2026-10-25-404`)

- **FS5 — the language of the text (G3, G4, G13).** ⭐ **(a) the member's language, resolved AT THE PRODUCER, never the other one:**
  for the three LIT kinds only (day 10, escalated, mismatch — ⛔ cycle-open / confirmed / news / survey / moderation), the POOL_BATCH
  child reads the languages of the payload's `p.memberIds` (members are claimed later, in the chunk loop `:834-845`) in ONE set-based
  query INSIDE the existing identity `withPariwarScope` (`:727` — no extra connection): `SELECT u.id, COALESCE(m.preferred_locale,
  pp.locale_default) FROM unnest($ids::uuid[]) u(id) CROSS JOIN pariwar_passport pp LEFT JOIN members m ON m.pariwar_id = pp.pariwar_id
  AND m.member_id = u.id WHERE pp.pariwar_id = $pariwarId` (⚠ the `WHERE` is REQUIRED: `pariwar_passport` is one row per Pariwar but
  its SELECT policy is `USING (true)` (0003:67) and the jobs pool is `SERVICE_DATABASE_URL`, BYPASSRLS (`boot.ts:306, :313, :625`) — an
  unfiltered `CROSS JOIN` yields members × every Pariwar; `members`' key is `member_id`, never `id`, `schema/members.ts:89`) (a missing member row ⇒ the Pariwar's default — a DELIBERATE departure from
  `resolvePeerRequestLocale`, which throws, recorded; ⚠ a plain `pp LEFT JOIN m` drops a missing member). ⚠ A Pariwar with no passport row:
  the read returns nothing ⇒ every member's `sms` block is OMITTED for this job (the rung ends `sms_message_not_lit`, the push unchanged)
  and ONE alarm `alert_sms.locale_unresolved` — ⛔ throw, ⛔ guess. The builders gain an input `smsLocale` (default `locale`); `alertFor(memberId)`
  passes the member's language and values for it (`smsPoolLabel(identity, smsLocale)`; the date and the empty mismatch values are
  locale-free); the MISMATCH worker does the same for its one member. The rung sends the block's locale's template; if that template's
  id is unset or malformed the rung ends `config:dlt_template_id_missing:<locale>` / `template_id_malformed` — terminal, ⛔ the other
  language (G13 — a fault case, stated). The PUSH keeps `deps.locale ?? DEFAULT_LOCALE` (LS11 for push unchanged) — a member who chose
  English may get a Hindi push and an English text; recorded. ⛔ Alert-contract change (F5). *Cost (a):* one query per POOL_BATCH job /
  mismatch job; push and text may differ in language; a member whose chosen language's template is unusable while the other's works gets
  no text (G13). **(b) resolve lazily in the send seam with `getMemberLanguage`** (only for eligible members). *Cost (b):* the seam has no
  pool identity to rebuild `{pool}` for the other locale ⇒ a contract change (values for both locales) or a second identity read; two
  queries per eligible member; a missing row throws. **(c) the Pariwar's language when the member's template is unusable** (`-385`'s
  shape). Not recommended — the trade-off the Panel decided itself for the reminder ⇒ the Panel's BY ANALOGY (G3).

- **FS6 — the send record (I1, G14).** ⭐ **(a) a new table, AT-MOST-ONCE:** `alert_sms_sends` (name the dev's), one row per
  `(alert_id, member_id, occasion)` UNIQUE, `alert_id` FK → `alerts` (Task 0.1, 2026-10-25: PROVEN — the deadline, pending-match and
  matcher paths all read their alert FROM `alerts`, so the PROJECTOR-written row — [[project_alert_primitive_substrate]] — is committed
  before any fan-out), `occasion` CHECKed to the six literals (`day_10`,
  `pending_match_escalated`, `mismatch:wrong_pool`, `mismatch:amount_mismatch`, `mismatch:entry_already_claimed`,
  `mismatch:sender_vpa_mismatch` — `EMITTABLE_MISMATCH_REASONS`, `matcher-worker.ts:63-68`; the producer builds the scope from a raw
  payload string, `contribution-notify-triggers.ts:1381`, so the CHECK is the boundary), `send_id uuid` PK (the CRQID row id),
  `pariwar_id` (tenant RLS, the LOOKUP's column), `message`, `locale`, `outcome` (`attempting` → `accepted` | `rejected_invalid_number` |
  `rejected_unreachable` | `refused` | `error`; plus `deferred` — FS9), `detail` (allow-listed grammar), `provider_message_id` (REQUIRED on
  `accepted` — the correlator matches by it, F13), `claim_token` (`${job.id}:${retryCount}` — never the bare job id, F6; missing metadata ⇒ a `randomUUID()`, never
  `undefined:undefined`), `attempt_count`,
  `created_at`, `updated_at`; a partial index `(updated_at) WHERE outcome = 'accepted'` for the silence count. ⛔ `recipient_number_hash`
  — it would cost one KMS HMAC per text in the CLAIM-contact field class (`correction-crypto.ts:60-61`) and has no consumer on this path.
  THE ROW'S LIFE (the one order — header; a sweep re-enqueue is a NEW job id, so its token differs and the lease rule, not the token,
  decides):
  1. **Read-only lookup BEFORE dispatch** (after FS17's prepare): found `accepted` ⇒ the rung is `sent`, ⛔ dispatch, ⛔ send, ⛔ budget (a
     retry must not retry for ever); found a final non-accept ⇒ terminal, ⛔ re-send; found `attempting` whose `updated_at` is NEWER than
     the lease (2 min: the 10 s send timeout + three finalise tries × the 10 s default connection timeout, `db.ts:29`, ≈ 40–50 s, with
     margin) ⇒ `sms_send_in_flight`: ⛔ send, ⛔ finalise, member on the RETRY set; found
     `attempting` OLDER than the lease (a crash between begin and finalise — the gateway MAY have accepted) ⇒ finalise `error` /
     `exhausted:outcome_unknown`, ⛔ re-send, ALARM; found `deferred` ⇒ proceed (begin CASes it).
  2. **Begin** — INSIDE `dispatch`, as the first step of the one-send provider's `send` (FS18; so a suppressed member never gets a row) —
     = ONE `withPariwarScope` transaction, committed BEFORE the gateway call: `INSERT … ON CONFLICT DO NOTHING` + read (or the CAS
     `deferred → attempting`, `attempt_count + 1`, new `claim_token`) + FS8's consumption if a counter is chosen, ON THAT TX'S `db` (⛔ `deps.serviceDb` inside the
     scope — two connections on the `max:2` pool, [[project_jobs_pool_two_connection_starvation]]). ⛔ connection is held across the gateway
     call. Lost the INSERT race, or the begin failed ⇒ the provider THROWS a typed sentinel (dispatch records `error`, no
     `alert.channel_send`) and the seam maps it from the closure (lost race ⇒ treat as found, step 1; failure ⇒
     `sms_send_state_unavailable`).
  3. **Send** — still inside the provider's `send`: `sendPreparedDltSms` (CRQID, gateway call).
  4. **Finalise** — still inside `send`, after the gateway answered — = CAS `WHERE outcome = 'attempting' AND claim_token = $mine`: `accepted` + `provider_message_id`; `rejected_*`; `rate_limited`
     ⇒ `deferred` (the ONLY re-sendable gateway result — FS9); EVERY `api_unavailable:*` (timeout, `body_read`, transport, 5xx — F8: the
     gateway MAY have taken it) and every `unknown:*` (e.g. `unknown:no_request_id` on a 2xx, `sms-app.ts:431`; `unknown:311`,
     `sms-errors.ts:42`) ⇒ FINAL `error` / `exhausted:outcome_unknown:<code>` + ALARM, never re-sent; a provider-final `auth:<code>` /
     `dlt_template_not_approved:<gw code>` ⇒ `error` + ALARM. A rendered-HMAC failure after an
     accept (F11) never re-sends: the row's truth is the gateway result. A finalise that fails AFTER the gateway answered ⇒ retried twice,
     then ALARM; the rung still returns the gateway truth (`sent` on accept).
  **The seam NEVER throws** (F3): a failure before begin commits (pool timeout, DB error) ⇒ `sms_send_state_unavailable`, retryable,
  ALARMED. Column-narrowed grants, ⛔ DELETE, a freeze trigger on finished rows (0155's shape — run EACH transition above against it,
  footgun #52(a): `attempting → deferred → attempting → final`, `attempting → final`, the stale-lease finalise, and the correlator's reads);
  ⛔ pruned (the record). ⛔ added to the data export (no send table is — recorded in deferred-work). Discharges 6.37b's *"`correlationId` is
  optional"* for this path: the alert seam ALWAYS passes one. *Cost (a):* a crash in the ~10 s send window, or a gateway answer that may
  hide an accept (`api_unavailable:*`), loses that text (the member keeps the in-app notice — R10(B)); ⛔ double charge, ⛔ double text;
  the push is NOT protected by the row when a 200-member chunk outlives the 300 s claim TTL (F6) — Task 3 bounds the chunk for lit kinds
  or records it. **(a″) as (a), but `api_unavailable:*` other than a timeout re-sendable (`deferred`).** *Cost (a″):* a proxy 504 or a
  broken 2xx body after MSG91 accepted texts the member TWICE and charges twice — the class `-347` consequence 5 keeps open on *"a gateway
  idempotency key"* (G14); I1 and the Policy meaning then say "at most once, but for a rare gateway fault". **(b) at-least-once** (the
  peer-mesh lease: a crashed `attempting` row is re-sent under the same CRQID after a lease). *Cost (b):* a possible second text and
  charge per crash, and a lease sweep the fan-out does not have (it is per job, not per row); joins G14's class. **(c) no table — the
  keyed store + the trail.** Not viable (F15: no row id ⇒ no CRQID).

- **FS8 — the per-member flood guard (G5).** ⚠ THE RULE (G5): a cap must sit ABOVE the legitimate per-day maximum of CONSUMPTIONS, ⛔ of
  texts. The count: occasions per (alert, member) = `day_10` + `pending_match_escalated` + one per mismatch reason (4 emittable,
  `matcher-worker.ts:63-68`; `sender_vpa_mismatch` is never produced in v1) = 6 (5 in v1); ⛔ code bounds the concurrent live alerts a
  member is in (`domain/src/alert/read.ts:19`) — with two live cycles, 12 > 10; and `checkAndConsumeSmsBudget` ALWAYS increments and is a
  FIXED window resetting at 05:30 IST (F16) ⇒ a cap of 10 per 24 h FAILS the rule. Task 0.1 (2026-10-25) count: 6 occasions per (alert, member) (5 in v1); one alert per cycle
  (`alerts.cycle_id` UNIQUE, 0078); a member is in EXACTLY one pool per cycle (`pool/errors.ts:467` — two is an integrity error) ⇒ the
  pool caveat below is not reachable; concurrent live cycles per member are unbounded in code ⇒ (d), which is per cycle, is unaffected.
  ⭐ **(d) a structural cap, ⛔ counter:** FS6's `occasion` CHECK (six literals) + the UNIQUE key (+ the `alert_id` FK — Task 0.1 allows it) cap the texts at 6 per
  member per REAL cycle BY CONSTRUCTION; ⛔ bucket, ⛔ vacuum, ⛔ narrowing of `-390`. *Cost (d):* no guard against a bug that loops over
  many REAL alerts (e.g. an alert minted per tick) — the silence and send counts are the only signal. ⚠ The bound holds only because the
  occasion carries NO pool: day-10 / escalated jobs run per POOL (singletonKey `${alertId}:${poolId}${scope}`, triggers `:579`) and the
  matcher dedups per (pool, member, reason) (`:543-544`) ⇒ a member owing N pools in a cycle gets ONE text per occasion naming the FIRST
  pool's `{pool}` (the push today collapses only within the 300 s claim TTL); the second pool's job finds `accepted` and records `sent`.
  Task 0.1 counts pools per member per cycle and records it — keying on `pool_id` would break the 6-per-cycle bound. **(a′) a per-(member, alert) bucket,
  cap 6** (the structural maximum), member key `alert_sms:<memberId>:<alertId>`, window 30 days, consumed ONLY on the INSERT path (⛔ on
  `deferred → attempting`), inside begin's tx; over the cap ⇒ finalise `refused` / `sms_budget_exceeded`, terminal, ALARM; the vacuum
  `deleteExpiredSmsRateBuckets` wired into an existing daily job (`sms-delivery-prune.ts` is handed only `{ pool }` — the dev names the
  job). *Cost (a′):* one write per text; duplicates what (d)'s CHECK already proves. **(a) ONE bucket `alert_sms:<memberId>`, 24 h, cap
  10.** Not recommended — fails THE RULE above (12 legitimate texts with two live cycles; the fixed window; consumption on re-attempts) ⇒
  it can refuse a text `-390` owes ⇒ a narrowing (the Panel's). **(b) a tight cap (24 h / 3).** *Cost (b):* the same narrowing, sooner
  (the Panel's). **(c) no guard at all.** *Cost (c):* (d) without the CHECK — a raw reason string mints unlimited occasions.

- **FS9 — §3.4's retry window (G2; `-394` items 1 and 3).** ⭐ **(a) wait for the window ONLY when WhatsApp was used:** the POOL_BATCH
  and MISMATCH workers register with `{ includeMetadata: true }` and pass the attempt (`retryCount`, `retryLimit` — type-guarded, F7) and
  `job.id` as OPTIONAL per-call parameters down `runContributionNotifyChild` → `fanOutAlertToMembers` → `fanOutAlert` (absent ⇒ the FINAL
  attempt — F3b's other callers keep today's behaviour); a lit, eligible member with a WhatsApp TARGET (incl. an FS3 refusal — the Pariwar
  uses WhatsApp) whose WhatsApp rung did not end `sent` gets the text only when `retryCount >= 2` (the third attempt) or on the final
  attempt; before that the SMS rung ends `sms_awaiting_wa_window` and the member goes on the RETRY set (claim released, job throws —
  push and WhatsApp re-tried, which IS the window, G2 (i)). A member with NO WhatsApp target is texted on the FIRST pass. THE WAIT
  PREDICATE = FS17's prepare succeeded AND FS6's read-only lookup found no final / accepted row — ⛔ the budget (checking it consumes it,
  F16). Missing metadata ⇒ treat as the final attempt (send). The other retryable classes: `rate_limited:*` (row `deferred`),
  `sms_send_in_flight`, `sms_send_state_unavailable`, `config_unavailable:secret_manager` (before any row) — member on the retry set; ON
  THE FINAL ATTEMPT any of them ⇒ recorded `in_app_only` with the detail AND a `deferred` row finalised `error` / `exhausted:<detail>`
  (frozen — ⛔ left `deferred`, or a later re-enqueue would send a stale text). `-394` item 3's residual (a render / HMAC failure) ⇒ `error`
  + ALARM, terminal (⛔ silent). Supersedes `-394` item 1 IN PART (for lit, eligible members only; every other member's rule is
  unchanged). Recorded limits: the count is per POOL job, ⛔ per member, and a sweep re-enqueue resets it; real delay before attempt 3
  ≈ 3–6 min (exponential from 60 s). *Cost (a):* up to two extra job runs per affected pool job, each RE-DISPATCHING push and WhatsApp for
  the waiting member (≈ 3× per waiting member); an FS3 refusal waits ~3–6 min although WhatsApp cannot succeed (it is configuration,
  memoized until restart). **(a′)** as (a) but an FS3 refusal is texted on the first pass. Not recommended — an FS3-refusal member has
  BOTH §3.4 gates ACTIVE (the Pariwar's toggle on, the opt-in active), so §3.4's window applies to them literally, and Story 5.3's epic
  entry (`epics.md:2318`) routes *"template not approved"* to SMS "per AR-19", through the window ⇒ texting on the first pass narrows a
  ratified clause by READING ⇒ the Panel's (or a non-blocking confirm, footgun #55(b)) — ⛔ the author's
  ([[feedback_supersede_never_reinterpret]]). **(b) never wait — text on the first failed pass.** Not recommended — DROPS §3.4's window ⇒
  the Panel's (G2).

- **FS12 — the 5.6 mirror defects (AI-5-5).** ⭐ annotate both deferred-work items *"addressed for the alert path by 5.11b"*, ⛔ closed:
  (1) the template-id trim — on this path MG4's 24-hex check (`isMsg91TemplateId`) refuses an untrimmed id (`template_id_malformed`);
  (2) `resolveSmsTarget` — ⚠ CORRECTED (5.11 v1.2): the decrypt IS caught (F18); only the E.164 check is missing, and on this path the
  MSG91 client refuses a non-canonical `to` (`invalid_number:format`, F8) ⇒ `rejected_invalid_number`, terminal. `resolveSmsTarget`
  itself is ⛔ edited (its other callers).

- **FS17 — the send core (F9, G15).** ⭐ **(a) split the core, INSIDE `claim-dlt-sms-send.ts`, into prepare + send + the claim wrapper:**
  - `prepareDltSms(deps, { dltTemplateIdConfigKey, template, render(), values(), preflightFailOpen })` — the template id (through the
    memo below), `isConfigured()`, MG4 `isMsg91TemplateId`, render, `checkedValues`, pre-flight; returns `{ refused, detail, alarm }` |
    `{ transient, detail }` | `{ prepared }` — ⛔ CRQID, ⛔ row, ⛔ helpline.
  - `sendPreparedDltSms(prepared, { e164, correlation: { kind: SmsSendRowKind, rowId }, beforeSend? })` — `correlationIdOrCrash` FIRST
    (as today), the provider built per send, the 10 s timeout, the classification. The generic path admits every `SmsSendRowKind`; the
    claim wrapper keeps its private `CLAIM_SEND_ROW_KINDS` (four).
  - `sendClaimDltSms` calls `correlationIdOrCrash` FIRST (as today — `claim-correction-send.test.ts:733-748`, unedited, asserts
    `resolveConfig` is NOT called before the crash), then prepare with an injected id resolver (the per-send read) and a `resolveExtra`
    hook that reads the helpline straight after the template id, with the checks in the OLD order (template-blank before helpline-blank,
    `:279-297`; its unconditional `config:helpline_number_missing` UNCHANGED), then send with the already-validated CRQID — the OLD order
    and the OLD results — I7. Every symbol tests import stays exported from this file (F9); the core stays in THIS file so the
    no-decision fence (`claim-suspicion-notice-no-decision.test.ts:28-35`) keeps covering it — a sibling file would need that test edited
    (AC7 forbids; T17).
  - The alert seam calls prepare → (FS6 lookup, FS9 wait, begin) → send → finalise, with `preflightFailOpen: true` (MG5's correction /
    closure / certificate shape — G15): a PROVEN fault (`auth:preflight`; `template_id_malformed` is listed with the config refusals) ⇒
    `refused`, ALARM, terminal; an UNPROVEN one (`api_unavailable:preflight`, `dlt_template_not_approved:preflight_<reason>`, `:332-334`)
    is SENT with a warning — never a recorded detail (so a "pre-flight transient" never defers here). The seam APPENDS `:<locale>` to
    `config:dlt_template_id_missing` (the claim tests assert the bare detail).
  - The template ids are resolved through a per-process memo (5 min for found AND not-found, ⛔ a transient) — the fan-out would
    otherwise read Secret Manager once per member; an id set by ops is seen within 5 min (recorded); the claim path's per-send read is
    ⛔ changed.
  - `messaging()` is PROBED in prepare (the prepared value carries the handle) — the core today builds it at provider build
    (`:340-351`) and maps any non-timeout throw to `config:sms_messaging_unavailable` (`:381`); a throw at send, after begin ⇒ finalise
    `error` / `config:sms_messaging_unavailable` + ALARM.
  - A config refusal in prepare (id unset / malformed, gateway unconfigured, `config:secret_manager_<code>`, the messaging probe, a
    `values_mismatch` / `value_too_long` from `checkedValues`) writes no row, ⛔ dispatch, ⛔ budget, and ONE alarm per (config key, detail) per memo window — ⛔ per member (the core's `alarm: true` is
    re-mapped by the seam). Day one: Row 40 (a) tracks it.
  - Fix the dead `fitsDltAlphanumeric` reference (`:211`). Map the registry's `registeredText` to the pre-flight entry's `text`
    (`contribution-sms-templates.ts:37` vs `sms-preflight.ts:41-44`), as the claim callers do.
  *Proof of I7:* every claim send test passes UNEDITED (T17's list). *Cost (a):* edits a core five claim flows use. **(b) a sibling
  `sendAlertDltSms` copying ~60 lines.** *Cost (b):* the AI-5-5 mirror-defect class (5.6's "mirror exactly" copied bugs forward); two cores
  drift. **(c) call `sendClaimDltSms` with a placeholder helpline.** ⛔ — a fake config value; and it still begins a row before config.

- **FS18 — the suppression boundary (I4).** ⭐ **(a) send THROUGH `dispatch`, and only a send that will reach the gateway:**
  `ContributionNotifyDeps` gains an OPTIONAL `suppression?: LifecycleSuppressionHook`, passed by `dispatchOneChannel` to EVERY dispatch
  (push, WhatsApp, SMS). After prepare, FS6's lookup and FS9's wait, the SMS rung calls:
  ```ts
  dispatch(alert, {
    providers: { ...(providers ?? DEFAULT_PROVIDER_REGISTRY), sms: [oneSendProvider] },
    resolveDelivery: () => Promise.resolve({ sms: target }),
    render: () => ({ channel: 'sms', title: null, body: dltBody, deepLink: null }),
    hashRendered, audit,
    ...(deps.suppression ? { suppression: deps.suppression } : {}),
  })
  ```
  where `oneSendProvider.send` runs begin → `sendPreparedDltSms` → finalise, and the rung reads the CORE's result captured by closure
  (dispatch's `rejected` loses `transient` vs `final` — T6). Gains the suppression hook, the rendered HMAC and the `alert.channel_send`
  audit line for REAL sends only (one `alert.dispatch` + one SMS `alert.channel_send` per text; ⛔ line for a config refusal or a found
  `accepted` row). A suppressed member ⇒ `suppressed`, ⛔ row, ⛔ gateway call. `dispatch.ts` / `cascade.ts` are not edited (sha256-fenced,
  T16). *Cost (a):* a provider whose `send` writes rows — documented on the provider; a KMS HMAC + two audit lines per real text.
  **(b) call the suppression hook directly, then the core**, and write the audit line by hand. *Cost (b):* a second audit writer that can
  drift from `dispatch`'s.

- **FS19 — boot wiring (F10).** ⭐ move the `smsPreflight` construction above `contributionNotifyDeps` (it needs only
  `contributionProviders`, built at `:621`), and give the contribution deps an OPTIONAL `alertSms` seam (gateway client, config resolver,
  pre-flight, the template-id memo, the budget numbers if FS8 keeps a counter). News / survey / moderation share the object but never
  reach the seam (⛔ `sms` block — I6). An absent seam ⇒ the rung keeps `sms_send_not_wired` (tests, a jobs process without a gateway); an
  unconfigured gateway ⇒ `config:sms_gateway_unconfigured`. Proven by source pins on `boot.ts` (AC8 — every other test injects the seam).

- **FS20 — the WhatsApp memo's `off` direction (F19, W1).** ⭐ **(a) memoize PER CHANNEL, `off` for a short TTL:** push / SMS / Telegram
  legs memoized for the process as today; the WhatsApp leg memoizes `ready` / `refused` for the process and `off` for 60 s (injected
  clock) — a switch-on is seen within a minute; refused → ready still needs a restart (recorded, unchanged). This needs the WhatsApp state
  surfaced from `readWhatsappProvisioning` to the memo. *Cost (a):* one WhatsApp provisioning read per Pariwar per category per 60 s; the
  memo's shape changes (provider-composition.ts is sha256-fenced — T16 re-take). **(a‴) never memoize `off`.** Not recommended — the
  memo caches the WHOLE registry and providers resolve per MEMBER (F19) ⇒ every member of every Pariwar (all `off` today), every
  category, re-runs a Secret Manager read and a DB tx on the `max:2` pool ≈ 4L reads per cycle open. **(b) leave W1 deferred** with a
  roster note "restart jobs after switching WhatsApp on". *Cost (b):* until a restart, a member of a newly switched-on Pariwar is recorded
  `delivered` on a fake `whatsapp:sent` and gets no text.

- **FS21 — the Hindi pool value's invisible characters (deferred-work, 5.11 last fix diff — 5.11's label Y1; `-394` item 2).** ⭐ **(a)
  widen the ban before the first send:** `smsPoolLabel` falls back to the letter code when the trimmed name contains `\p{Cc}`, U+2028 /
  U+2029 (`\p{Zl}` / `\p{Zp}`), any `\p{Cf}` EXCEPT ZWNJ U+200C / ZWJ U+200D (Devanagari shaping), or a lone surrogate — test with
  `/\p{Cs}/u` (⚠ `String.prototype.isWellFormed()` is ES2024; `tsconfig.base.json:7` sets `lib: ["ES2022"]` — tsc refuses it). Supersedes
  `-394` item 2 in part. *Cost (a):* a curated name with a stray format character is texted by letter. **(b) keep item 2.** *Cost (b):* a
  bidi control or ZWSP reaches DLT matching (Row 30 (d) unanswered for such characters) — a rejected or garbled text.

- **FS22 — the CRQID kind (F12, F13, G7).** ⭐ **`as`** (alert SMS): `SMS_CORRELATION_KINDS` + the hard-coded `SMS_CORRELATION_ID_PATTERN`
  (`correlation.ts:30`); a NEW migration REPLACES 0167's two CHECKs (⛔ edit 0167 — [[project_live_db_test_gotchas]]); the schema mirrors;
  `LOOKUP.as` (`send_id`, `pariwar_id`, `outcome`, `provider_message_id`, `NULL::text AS purpose`); the correlator's kind-specific rows
  checked for `as` (Row 6 "attempting ⇒ retry" holds; Row 5 is `pm`-only; Row 7 for every non-`accepted` `as` state — F13); ⭐ JOIN the
  silence alarm (`countSilentSmsSends` + `sms-delivery-silence.ts` — DR12 covers *"accepted SMS sends"*) AND add a "stale `as` `attempting`
  older than 1 h" count to `sms-delivery-silence.ts` (a crash on the final attempt leaves a row no job finalises; the correlator gives up at
  72 h and the silence count sees only `accepted`); every kind-enumerating test (F13 — ⛔ `claim-correction-send.test.ts:705`). *Cost:* two
  more subqueries in the silence count.

- **FS23 — quiet hours (G12).** ⭐ **(a) none — send at any hour, recorded:** the day-10 sweep runs at 09:30 IST (its cron); an
  escalation lands ≥ 24 h after the member's own payment attempt; a mismatch follows the member's own payment — each tracks the
  member's day; the push already arrives at any hour. Whether TRAI's rules restrict service / transactional SMS by hour is a PROVIDER /
  counsel question (⛔ fetched here — footgun #53(a)): Task 0.4 adds it to roster Row 40 as a dated question, ⛔ assumed. A deferred-work
  item names the trigger (a complaint, a ruling, or a written answer that hours are restricted). *Cost (a):* an escalation or mismatch text
  can arrive at night. **(b) hold the whole notice (push too) to 09:00–20:00 IST** by `startAfter` at enqueue (escalated, mismatch).
  *Cost (b):* a payment-problem push waits up to 13 h; Panel-adjacent (G12). **(c) hold only the SMS** (per-member deferral, the
  peer-mesh shape). *Cost (c):* a new per-member deferral path in POOL_BATCH; Panel-adjacent (G12).

## Acceptance Criteria

**AC0 — Governance before code (Task 0).** One author-commit decision (next free id at the time of commit — `-404` at the pin) records
FS5–FS23 as answered, the §0 readings G1–G15, and its SUPERSESSIONS / EXTENSIONS IN PART — `-345` MG12 (zero-slot), `-345` MG5 (extended to a
new fail-open path — G15), `-347` DR3 (the kind list extended by `as` — G7), `-389` item 10 (`sms_send_not_wired` replaced), `-394` item 1
(FS9), item 2 (FS21, if (a)), item 3 (FS9 / FS17) — whether FS6's answer JOINS `-347` consequence 5's at-least-once class (G14), the epics
`### Story 5.11b` entry's departures (*"the member's language (`getMemberLanguage`)"* — FS5 (a) resolves set-based at the producer; *"a
per-member budget"* — FS8 is a flood guard, ⛔ a budget), and "Not covered" (consent — Row 40 (f); price — Row 40 (d); cost-optimization vs
`-390` — carried; quiet-hours law — Row 40 dated question). Committed ALONE before any record or code. The records commit follows
([[feedback_governance_commits_precede_implementation]]). If BigDev picks an option marked "the Panel's", STOP and write the routing note
from the template instead.

**AC1 — The send record and its report (FS6, FS22).** The new migration (next free number — `0184` or later; a `when` strictly above every
journal entry on `main` and every sibling worktree, header NUMBERS) creates the table with its UNIQUE `(alert_id, member_id, occasion)`, the
`occasion` CHECK (six literals), tenant RLS (FORCE), per-command policies in `policies/<table>-rls.ts`, column-narrowed grants, ⛔ DELETE, the
freeze trigger, the partial index, and replaces 0167's two kind CHECKs to admit `as`. A delivery report carrying an `as` CRQID for an
`accepted` row is MATCHED (`sms_send_deliveries` row with `send_kind = 'as'`); one for an `attempting` row is retried (correlator Row 6); one
for a `deferred` / final-`error` / `exhausted:outcome_unknown` row lands Row 7 (`other_attempt`, alarm `second_request_for_one_send:as`) — the
expected outcome named per state; an accepted `as` send with no report in 48 h – 7 d is counted by the silence alarm; an `as` row
`attempting` > 1 h is counted as stale. *Legs:* an RLS spec copying `claim-suspicion-notice-policy-regression.spec.ts` — FORCE (`:126`), ⛔
DELETE (`:136`), per-command `pg_policies` (`:143`), EXACT `column_privileges` and no table-level grant (`:214`), LOCKSTEP of the outcome /
detail / occasion CHECKs with the TS vocabularies (`:320`, `:356`), the freeze binds even the superuser (`:420`); the inbox CHECK's
`pg_get_constraintdef` contains `SMS_CORRELATION_ID_PATTERN.source` (`sms-delivery-report-inbox-policy-regression.spec.ts:208-209` probes
values only); a live correlator leg per row state; a silence-count leg (year-2000 clock, `sms-delivery-correlator-live.test.ts:674`'s
precedent); every F13 kind-enumerating test updated EXCEPT `claim-correction-send.test.ts:705`.

**AC2 — The real send (I2, I4; FS17, FS18).** A lit, eligible member with an SMS target, the template id for the block's locale
provisioned (24-hex) and the gateway configured: the MSG91 flow client is called ONCE with that template id, the block's values in slot
order, the member's E.164 and a CRQID `as<send_id hex>`; the body passed equals the text rendered INDEPENDENTLY through the real `t()` (the
test's own expected string — ⛔ `substituteDltValues` compared with itself) and `substituteDltValues(registeredText, …)`; accepted ⇒ the
rung is `sent`, the member `delivered`, the row `accepted` with the provider id, ONE `alert.dispatch` + ONE SMS `alert.channel_send` line; a
re-run finding the `accepted` row ⇒ ⛔ second `alert.channel_send`, ⛔ call. ONE suppressing hook on the deps ⇒ push AND SMS `suppressed`, ⛔
row, ⛔ call. `payment_not_matched` (zero slots) SENDS (`values: []` — AC7). A PLANTED catalogue drift (the rendered body ≠ the registered
text) ⇒ refused, ⛔ call (`contribution-sms-templates.test.ts:149`'s precedent). *Legs:* a recording gateway double (assert calls, ⛔ provider
id — T5); one leg per message × locale; the suppression leg; the zero-slot leg; the drift leg; the audit-count legs.

**AC3 — At most once (I1; FS6).** For the same (alert, member, occasion): a job retry, a sweep re-run after the keyed-store TTL (DELETE the
`idempotency_keys` row between runs — a mutant WITHOUT the send record ⇒ RED), and two concurrent workers produce ONE gateway call; a found
`accepted` row ⇒ `sent` with no call and the budget (if any) UNCHANGED; a found `attempting` row younger than the lease ⇒ `sms_send_in_flight`,
⛔ call, ⛔ write to that row, retried; older than the lease ⇒ `error` / `exhausted:outcome_unknown`, ⛔ call, one alarm; each of
`api_unavailable:timeout`, `:body_read`, transport (httpStatus 0) and a 5xx ⇒ FINAL `error` / `exhausted:outcome_unknown:<code>` + alarm, ⛔
re-send on retry (or, if FS6 (a″) was chosen, the recorded at-least-once behaviour); `rate_limited` ⇒ `deferred`, re-sent on retry, and on
the final attempt finalised `exhausted:<detail>`; an HMAC failure after an accept ⇒ the row stays `accepted`, ⛔ re-send. Day 10, escalated
and each mismatch reason for the same member and cycle are different occasions (separate texts); an occasion outside the six literals is
refused by the CHECK. *Legs:* live, on :5433, separate transactions for DB-clock ordering ([[project_db_clock_ordering_tests_tie]]). The
concurrency leg is a DOMAIN spec `packages/domain/tests/integration/sms-delivery/<table>-concurrency.spec.ts` in the shape of
`packages/domain/tests/integration/claim/suspicion-notice-concurrency.spec.ts:15-20, :272-296`: two connections, begin called directly (⛔
keyed store — it would stop the second worker on its own and prove nothing about the record); A holds its begin open; B is proven waiting in
`Lock` via `pg_stat_activity` (⛔ a sleep); commit A; B ⇒ ⛔ call, ⛔ write to A's row; A's finalise lands `accepted`; a mutant (begin as
read-then-insert) ⇒ RED. A seam leg holding one connection of a `max:2` pool ⇒ ⛔ deadlock, ⛔ throw (`sms_send_state_unavailable` at worst).

**AC4 — Outcomes and the retry profile (I5; FS6, FS8, FS9, FS17).** Each non-send ends with a named, allow-listed detail —
`RECORDED_RUNG_DETAILS` extended with EXACT literals (it is an exact-string Set, F3b): `config:dlt_template_id_missing:hi`,
`config:dlt_template_id_missing:en`, `dlt_template_not_approved:template_id_malformed`, `config:sms_gateway_unconfigured`,
`config:sms_messaging_unavailable`, `config:secret_manager` (one literal for every `config:secret_manager_<code>`) — ⛔ row, ⛔ dispatch,
terminal, ONE alarm per (key, detail) per memo window; `config_unavailable:secret_manager` — retryable, before any row; a proven pre-flight
fault (`auth:preflight`) — `refused`, alarm, terminal (an UNPROVEN one is sent with a warning, never recorded);
`dlt_template_not_approved:values_mismatch`, `dlt_template_not_approved:value_too_long` — refused in prepare, alarm, terminal (AC2's drift
leg); every provider-final `<class>:<code>` ⇒ ONE allow-listed literal per class (`auth`, `dlt_template_not_approved`); `unknown:*` ⇒
`exhausted:outcome_unknown` (it may have been taken), alarm;
`sms_budget_exceeded` (only if FS8 keeps a counter) — `refused`, alarm, terminal; `rejected_invalid_number` / `rejected_unreachable` —
terminal, ⛔ alarm; `exhausted:outcome_unknown` (every `api_unavailable:*`, a stale lease, a render / HMAC failure) — `error`, alarm, terminal;
`sms_awaiting_wa_window`, `rate_limited`, `sms_send_in_flight`, `sms_send_state_unavailable` — the RETRY set; on the final attempt each of
those ⇒ `in_app_only` with the detail (and a `deferred` row finalised). A raw provider string is never persisted. Every member NOT
lit-and-eligible keeps `-394` item 1's rule byte for byte: the 5.11 R1 legs (`contribution-notify.test.ts:694-760`) pass UNCHANGED with the
seam ABSENT; new sibling legs cover the seam wired. *Legs:* a TABLE-DRIVEN leg over EVERY core result (F9's list) ⇒ its recorded detail
(exact strings) and its alarm count (a config refusal ⇒ `onAlarm` called once for N members, ⛔ N times); the R1 legs; `shouldRetryFanOut`
unit legs for each new retryable class; if FS8 keeps a counter, a fresh `randomUUID()` member per test (the bucket table is global on the shared :5433 DB).

**AC5 — Language (I3; FS5).** A member who chose `en` in a `hi` Pariwar gets the en template with an en pool value (letter code unless the
curated name passes `smsPoolLabel`'s en rule); a non-chooser gets the Pariwar default; a member with no `members` row gets the Pariwar
default; a Pariwar with no passport row ⇒ the `sms` block omitted, one alarm; with the en id unset, the chooser of `en` ends
`config:dlt_template_id_missing:en` — ⛔ the hi template. The push copy's locale is unchanged; the language is read only for the lit kinds.
*Legs:* POOL_BATCH and MISMATCH, LIVE on a pool bound to `role=twt_app` (a fake pool answers the fixture, not the SQL; RLS is FORCE); the
one-query read (a query-count assertion).

**AC6 — The window (FS9).** POOL_BATCH and MISMATCH register with `includeMetadata: true` added and `localConcurrency` UNCHANGED (POOL_BATCH passes
`deps.childConcurrency ?? DEFAULT_POOL_BATCH_LOCAL_CONCURRENCY`, `:1443`) — the exact options object asserted; the registered handler driven with metadata — `claim-correction-control-paths.test.ts:557-575`'s
precedent). A WhatsApp-target member whose WhatsApp did not end `sent`: attempts 0–1 ⇒ `sms_awaiting_wa_window`, retried, ⛔ call, ⛔ budget
consumed; attempt 2 ⇒ sent; the final attempt ⇒ sent — proven with `retryLimit: 1, retryCount: 1` (with `CHILD_RETRY_LIMIT = 4` the final
attempt passes through the `>= 2` clause alone and proves nothing); missing metadata ⇒ sent. A member with no WhatsApp target ⇒ sent on
attempt 0. An unprovisioned id ⇒ terminal on attempt 0 (⛔ wait). Two concurrent fan-outs on ONE deps object at attempts 0 and 2 ⇒ only the
attempt-2 member is sent (T7). The news / survey / helpdesk / moderation callers, passing no attempt, behave as before (F3b). FS9 (a) vs
(a′) as answered for the FS3 refusal.

**AC7 — MG12 and the claim texts (G6; FS17).** `createSmsDltProvider` refuses `values === undefined` (`no_named_values`) and ACCEPTS
`values: []`; the MSG91 client drops its `length === 0` refusal (`values` is a required field there — F8); the category composition path
(`resolveSmsProviderDeps`, ⛔ values) is still refused (`provider-composition.test.ts:211-236`, `apps/api/tests/unit/sms-composition.test.ts:103-110`
— both unchanged); the OTP path is unaffected. `sendClaimDltSms`'s behaviour is unchanged: every claim send test (T17's list) passes
UNEDITED — `git diff --stat origin/main -- <list>` is empty, else the File List names the test and why. NEW leg: `sendClaimDltSms` with kind
`as` ⇒ `[jobs] sms.bad_correlation:as` + throw (`claim-correction-send.test.ts:731` covers only `ot`).

**AC8 — Nothing else moves; records; gate (I6; FS12, FS19–FS21, FS23).** `isAlertSmsFallbackEligible` and `alertSmsBlock` byte-unchanged —
each function's text extracted with the TS AST (`ts.createSourceFile`, as `sms-member-name.test.ts:378` does) and hashed against the text
taken FROM `git show origin/main:` at the pin, ⛔ from the edited HEAD; revert-sanity ⇒ RED. Boot: source pins on `boot.ts` — `smsPreflight`
defined before `contributionNotifyDeps`, and `alertSms:` in it (precedents `claim-contact-ladder-whatsapp.test.ts:124`,
`claim-peer-mesh-wa-reminders.test.ts:141`). FS20's memo leg (off → on seen within the TTL, injected clock; the `resolveSecret` /
`withScope` counts across 100 members asserted — `contribution-provider-resolver.test.ts:254-276`'s shape); FS21's `smsPoolLabel` legs
(each banned class ⇒ letter code; ZWJ / ZWNJ kept; a lone surrogate); if FS8 keeps a counter, the vacuum runs from its job (a live leg of
the job body — `sms-delivery-correlator-live.test.ts:745-755`'s precedent). Records: deferred-work — the 6.34 TV6 item CLOSED on `done`
("Closed by 5.11b"); the 6.37b `correlationId` item, the two 5.6 items (FS12 wording), LS11's item (for the three texts — and its *"its FS5 —
`getMemberLanguage`"* corrected by dated note), the item *"WhatsApp off → on inside one process …"* (5.11 second full review; FS20), the
Hindi pool-value item (5.11 last fix diff; FS21), and — if FS6 joins G14's class — both at-least-once SMS items annotated; NEW items for
quiet hours (FS23 (a)), the data export (FS6), and the push left unprotected past the claim TTL (F6, if not bounded); roster Row 40 dated
note ((e) now observable; the DEPLOY ORDER; the TRAI-hours question; Row 32 (b) / (d) / (e) / (g) cross-referenced); the DLT sheet's
*"Until row 5-11b sends, a set id does nothing: a lit, eligible member's SMS rung ends `sms_send_not_wired`."* (`:271-272` — an operator
safety statement that becomes FALSE), *"The language each member gets is row 5-11b's"* (`:284`) and *"until row 5-11b changes it"* (`:289`)
get dated notes; architecture §3.4 a dated annotation (the window as built and its two author readings; the language; the guard) — never a
rewrite. `pnpm ci:local` green on :5433.

## Tasks / Subtasks

- [x] **Task 0 — Governance (AC0)**
  - [x] 0.1 Preflight: `git fetch origin`; rebase onto `origin/main`; run the pin checks (header). Re-run F1–F21 (every cite by CONTENT).
        Re-count FS8's product (mismatch reasons × concurrent live alerts per member) and record it. Prove whether the `alerts` row is
        committed before any fan-out (FS6's FK). List consumers of `alert.channel_send` (FS18 adds real SMS lines). **STOP** if: **S1** a
        ruling on alert-SMS language, budget, window or quiet hours exists after `-403` (grep `^### Decision` on main + every branch +
        every worktree); **S2** another worktree edits `contribution-notify*.ts`, `claim-dlt-sms-send.ts`, `sms-dlt.ts`, `sms-app.ts`,
        `correlation.ts`, `reports.ts`, the correlator, `provider-composition.ts`, `contribution-sms-templates.ts`, `dispatch.ts`,
        `cascade.ts` or `boot.ts` (`git worktree list`; ListAgents — [[feedback_shared_tree_branch_switch]]); **S3** a Pariwar's WhatsApp is
        enabled anywhere a deploy reads (FS9 then bites at once — tell BigDev); **S4** any `sms.dlt.template_id.contribution.*` id is set
        anywhere (G9 — it must not be before Row 40 (a)); **S5** Row 30 (d) was answered with a limit or charset rule that changes FS21 or
        the slot maxima.
  - [x] 0.2 Put FS5, FS6, FS8, FS9, FS12, FS17–FS23 to BigDev; record answers VERBATIM in Debug Log (a). A bare option letter means the
        option's outcome AND its cost line (footgun #45). Offer G13's non-blocking confirm.
  - [x] 0.3 Stage the author-commit decision (AC0's contents; next free id at commit — re-check every worktree) in the scratchpad; commit it
        ALONE (`governance:` prefix) — try the decision-log write first ([[project_decision_log_writes_user_inserted]]).
  - [x] 0.4 Records commit (AC8's record half): deferred-work annotations + new items; roster Row 40 note (incl. the deploy order and the
        TRAI-hours question); DLT sheet notes (all three sentences); §3.4 annotation; `epics.md` `### Story 5.11b` dated note *"story file
        created"* + the two departures (AC0); ledger by SAFE prepend ([[project_sprint_status_safe_prepend]]) + row
        `ready-for-dev → in-progress`.
- [x] **Task 1 — Migration + domain (AC1; FS6, FS22)**: the table (schema file + barrel + `policies/<table>-rls.ts` + its `policies/index.ts`
      export), the `occasion` CHECK, the CHECK replacements, `correlation.ts` (kinds + the hard-coded pattern) + mirrors; domain functions
      lookup (read-only) / begin (one tx, INSERT … ON CONFLICT or CAS `deferred → attempting`, + FS8's consumption if any, on the scope's
      `db`) / finalise (CAS on `attempting` + `claim_token`) / finalise-stale; `LOOKUP.as`; `countSilentSmsSends` + the stale-`attempting`
      count + `sms-delivery-silence.ts`; correlator review for `as` (Rows 6 / 7); `anonymize.ts` "nothing to scrub" line; RLS spec; the
      concurrency spec. `pnpm db:migrate` on :5433 before the live tests ([[project_prepush_hook_inherits_5432]]).
- [x] **Task 2 — Send core + MG12 (AC2, AC7; FS17, FS12)**: `prepareDltSms` / `sendPreparedDltSms` split INSIDE `claim-dlt-sms-send.ts`;
      `sendClaimDltSms` delegates in the old order (claim tests unedited; every imported symbol still exported here); `fitsDltAlphanumeric`
      reference fixed; `registeredText → text` mapping; MG12 in `sms-dlt.ts` (`undefined` refused, `[]` allowed) and `sms-app.ts` (drop
      `length === 0`); the template-id memo.
- [x] **Task 3 — The rung (AC2–AC4, AC6; FS6, FS8, FS9, FS18)**: `suppression?` on `ContributionNotifyDeps`, passed by `dispatchOneChannel`
      to every dispatch; the `alertSms` seam in the header's ORDER (prepare → lookup → wait → begin → one-send provider through `dispatch` →
      finalise) that NEVER throws; the outcome → detail map with exact literals; `RECORDED_RUNG_DETAILS`; `shouldRetryFanOut`'s new
      retryable classes; the OPTIONAL attempt + job-id parameters down `runContributionNotifyChild` → `fanOutAlertToMembers` →
      `fanOutAlert` (F3b's callers untouched); `includeMetadata` on POOL_BATCH and MISMATCH; the claim-TTL bound for lit kinds (F6) or its
      recorded residual. Replace the DELIBERATE block's text with what now holds (I4). ⛔ edit the predicate; ⛔ edit `dispatch.ts` /
      `cascade.ts`.
- [x] **Task 4 — Producers' language (AC5; FS5)**: the builders' `smsLocale` input; the set-based language read (lit kinds only, inside the
      identity scope) in the POOL_BATCH child and the MISMATCH worker; the no-passport rule. Doc-only updates that would otherwise lie:
      `AlertSmsBlock`'s `locale` comment (`packages/contracts/src/alerts/alert.ts:90-92` — now "the RECIPIENT'S language", ⛔ "the
      producer's"); the MG12 caveat in `contribution-sms-templates.ts:66-67`; the `ContributionNotifyTriggerDeps.locale` comment
      (`:236-241`, "does ⛔ read `members.preferred_locale`" — true for push only now).
- [x] **Task 5 — Boot + WhatsApp memo + pool value (AC8; FS19, FS20, FS21, FS8 vacuum if any)**: the pre-flight moved up; the seam wired;
      the vacuum on its job (if FS8 keeps a counter); the per-channel memo with WhatsApp `off` on a TTL; `smsPoolLabel`'s wider ban
      (`/\p{Cs}/u`, ⛔ `isWellFormed`).
- [x] **Task 6 — Records (AC8)** — whatever Task 0.4 could not write before the code (e.g. File-List-dependent notes).
- [x] **Task 7 — Tests (AC1–AC8)**: replace every `sms_send_not_wired` expectation that now sends (list below, Dev Notes) — each
      replaced test states what it replaced; keep the legs where the seam is absent; every new gate proven RED first (Debug Log (b)); the
      sha256 fence (`claim-contact-ladder-whatsapp.test.ts:153-194`) re-taken for `contribution-notify.ts` and `provider-composition.ts`
      with a dated note (5.11's precedent) — `dispatch.ts` / `cascade.ts` stay byte-identical (an edit there is a third re-take, ⛔ planned).
- [x] **Task 8 — Verify**: `pnpm ci:local` with `DATABASE_URL` on :5433 ([[project_known_livedb_test_failures]] — #13, #14, #15 can block
      the push; sibling worktrees share :5433 — a deadlock or a foreign migration mid-run is re-run alone, recorded); review the diff before
      commit ([[feedback_review_the_fix_diff_before_commit]]); commit on the story branch ([[feedback_commit_on_story_branch]]); ⛔ push
      without BigDev's go-ahead (when pushing, `DATABASE_URL` on :5433 explicitly — the pre-push hook inherits :5432).

## Dev Notes

### ⚠ TRAPS

- **T1 — The alert id is per cycle** (F4). A send record keyed `(alert, member)` silently drops the escalated text and every mismatch reason
  after day 10. Key by the keyed-store scope.
- **T2 — The keyed store is not durable** (F4, F15): 300 s TTL, completed keys vacuumed. Only the send record stops a second text.
- **T3 — Two MG12s** (F8): the provider AND the client refuse empty values. At the provider keep `undefined` refused (the category
  composition path, `resolveSmsProviderDeps`, must stay dark) and allow `[]`; at the client `values` is required — drop only `length === 0`.
- **T4 — The claim core demands a helpline** (F9) even for templates without one, and builds the CRQID FIRST. Never pass a placeholder;
  split the core (FS17).
- **T5 — Never assert on provider id** — the fixture and the real provider are both `sms-dlt` (5.11 F3). Assert gateway calls on a
  recording double and the trail's outcome + detail.
- **T6 — `dispatch`'s `rejected` loses `transient`** (F11). Read the core's result by closure; the send row's truth is the gateway result,
  not dispatch's outcome (an HMAC throw after an accept is `error` in dispatch and `accepted` in the row).
- **T7 — The deps object is shared** by 8 concurrent POOL_BATCH jobs and four other workers (F6, F10). The attempt number and job id are
  per-call parameters; ⛔ store them on deps.
- **T8 — A crash is not loud** (footgun #49(c)): pg-boss `fail()`s a handler throw without an `'error'` emit — log / alarm BEFORE throwing;
  the final attempt must finish the row itself (footgun #52(b)). And a throwing RUNG is silent too (F3) — the seam never throws.
- **T9 — A config refusal per member is noise** on day one (every eligible member, every notice, until Row 40 (a)). ⛔ row, ⛔ dispatch, ONE
  alarm per (key, detail) per memo window.
- **T10 — Migration ordering on a shared DB** (F20): a later `when` applied first makes drizzle skip the other
  ([[project_sibling_migration_when_order_shared_db]]); never regenerate an applied migration ([[project_live_db_test_gotchas]]).
- **T11 — Unit mismatch**: `checkedValues` counts code points, `smsPoolLabel` and the shape check count UTF-16 units (F9). ≤ 30 UTF-16
  implies ≤ 30 code points, so the pool value is safe; ⛔ "fix" either to the other unit.
- **T12 — Type-only import cycles** between `contribution-notify.ts`, the new seam and `claim-dlt-sms-send.ts` crash at runtime, invisible
  to tsc ([[project_type_only_import_cycle_trap]]).
- **T13 — A JSDoc with `**cl.3**`-style emphasis closes the comment** ([[project_markdown_emphasis_closes_jsdoc]]); hand-format
  ([[project_prettier_not_enforced]]).
- **T14 — A freeze trigger vs the transitions** (footgun #52(a)): list `attempting → deferred → attempting → final`, `attempting → final`,
  the stale-lease finalise and the correlator's reads, and run each against the trigger and the column grants before writing them.
- **T15 — `pnpm --filter X test -- name` runs the whole suite** and a typo'd filter passes with `passWithNoTests` (footgun #55(d)).
- **T16 — sha256 fence** (`claim-contact-ladder-whatsapp.test.ts:153-194`) pins `dispatch.ts`, `cascade.ts`, `provider-composition.ts`,
  `contribution-notify.ts` (+ `claim-correction-sms-templates.ts`, `sms-dlt-registry.ts`, `peer-mesh-wa-reminder.ts`,
  `whatsapp-direct-send-outcome.ts`, `wa-opt-in/{write,read}.ts`, `schema/pariwar_wa_templates.ts`). NOT pinned: `claim-dlt-sms-send.ts`,
  `sms-dlt.ts`, `sms-app.ts`, `boot.ts` (regex pins only — `:124`; `claim-peer-mesh.test.ts:1888`; `wa-opt-in-lasting-yes.test.ts:37`;
  `claim-peer-mesh-wa-reminders.test.ts:141`), `contribution-notify-triggers.ts`, `contribution-sms-templates.ts`.
- **T17 — The no-decision fence reads the core by PATH** (`claim-suspicion-notice-no-decision.test.ts:28-35`, `NOTICE_MODULES`). Moving
  the core to a sibling file silently drops it from the fence — keep it in `claim-dlt-sms-send.ts`.
- **T18 — The `dlt-typed-variables` rule (iii)**: the literal `sms.dlt.template_id.` may appear ONLY in `REGISTRY_FILES`
  (`scripts/dlt-typed-variables/lib.ts:56-67`) — comments count. The seam, memo and core read `dltTemplateIdConfigKey` from the registry;
  ⛔ spell the prefix.
- **T19 — Live legs as the superuser bypass RLS.** The new table is FORCE RLS and FS5's read runs inside `withPariwarScope`. Live seam and
  producer legs run on a pool bound to `role=twt_app` (`options=-c role=twt_app` — `claim-contact-ladder-whatsapp-live.test.ts:1071`,
  `wa-webhook-processor.test.ts:438`; `_claim-correction-seed.ts:24-29`).
- **T20 — The global bucket table fills on the shared DB** (F16, if FS8 keeps a counter): fixed member ids exhaust the cap after a few runs —
  a fresh `randomUUID()` member per test.

### Tests that change (5.11's `sms_send_not_wired` expectations — re-located at Task 0.1)

**Flip (the seam wired):** `apps/jobs/tests/contribution-notify.test.ts` (`:296` no-WhatsApp member ELIGIBLE; `:580`; `:586`; `:590` FS3
refusal; `:636` I3 "an SMS provider that WOULD accept … is never driven" — now inverted when the seam is wired, kept for the absent seam;
`:664`; `:505` "⛔ fake SMS line"; `:764-781` `serializeFanOutResult` — new-detail legs added, the `sms_send_not_wired` leg kept);
`apps/jobs/tests/ai-8-3-ladder-armor-live.test.ts` (`:246`); `packages/channels/tests/sms.test.ts` (`:89-103` — its `[undefined, []]` loop
SPLITS: `undefined` refused, `[]` sent; `:552-554` — the client's `values: []` now sent; `:591` kinds); `apps/jobs/tests/sms-delivery-correlator-live.test.ts`
(`:33-39` `Kind` / `TABLE`; `:707-710` `toEqual({ cr: 2, ce: 1, sn: 1, pm: 1 })`, `sms_report.silence:5`, the text `'cr 2, ce 1, sn 1, pm 1'`);
`apps/jobs/tests/sms-delivery-correlator.test.ts` (`:131`, `:145`, `:288`); `packages/domain/tests/sms-delivery/correlation.test.ts`
(`:77-79`, `:86` — incl. the pattern source); `packages/domain/tests/integration/rls/sms-send-deliveries-policy-regression.spec.ts` (`:175`,
`:180`); `…/sms-delivery-report-inbox-policy-regression.spec.ts` (`:208-209`); `apps/api/tests/unit/msg91-sms-reports.test.ts` (`:78` — add an
`as` case); `packages/channels/tests/contribution-provider-resolver.test.ts` (`:254-276`, FS20); `apps/jobs/tests/contribution-sms-templates.test.ts`
(`:198-219`, FS21).

**Stay (list them so the dev does not "fix" them):** the R1 block `contribution-notify.test.ts:694-760` (unchanged with the seam absent; new
sibling legs with it); `apps/jobs/tests/contribution-notify-live.test.ts:203` (an UNLIT cycle-open leg); `apps/jobs/tests/contribution-notify-triggers.test.ts:1296-1395`
(mocks the fan-out, `:42`); `packages/channels/tests/provider-composition.test.ts:211-236` and `apps/api/tests/unit/sms-composition.test.ts:103-110`
(the composition path is still refused); `apps/jobs/tests/claim-correction-send.test.ts:705` (the claim wrapper's four kinds); every file in
T17's claim list (AC7).

**AC7's unedited claim send tests** (confirm with `git diff --stat origin/main -- <list>`): `claim-correction-send.test.ts`,
`msg91-real-client-caller.test.ts`, `msg91-no-network.test.ts`, `claim-correction-control-paths.test.ts`,
`claim-certificate-reminders{,-live}.test.ts`, `claim-correction-reminders-live.test.ts`, `claim-correction-closure-live.test.ts`,
`claim-suspicion-notices-live.test.ts`, `claim-peer-mesh-requests-live.test.ts`, `claim-peer-mesh-wa-reminders.test.ts`,
`claim-contact-ladder-live.test.ts`, `claim-contact-ladder-whatsapp{,-live}.test.ts`, `sms-otp-preflight.test.ts`,
`contribution-providers.test.ts`, `claim-suspicion-notice-no-decision.test.ts` (all under `apps/jobs/tests/`, except where a path says
otherwise).

### Reuse map

| Need | Reuse | Instead of |
|---|---|---|
| send checks, pre-flight, provider, timeout, result classes | `prepareDltSms` / `sendPreparedDltSms` split inside `claim-dlt-sms-send.ts` | a second core |
| CRQID | `formatSmsCorrelationId` (`@twt/domain`) | a local format |
| body | `renderContributionSms` + `substituteDltValues` | `render.ts`'s heading form |
| suppression, HMAC, audit | `dispatch` with a full per-call registry + render override; `suppression` on the deps | a hand-written audit |
| row lifecycle | the suspicion-notice begin / finalise / lease shape (0151 / 0155; `suspicion-notice.ts:826-829`) | a new state machine |
| language | the set-based `COALESCE(preferred_locale, locale_default)` SQL (`resolvePeerRequestLocale`'s shape, with `unnest`) | `getMemberLanguage` per member |
| attempt | `includeMetadata` + the type guard (`claim-contact-ladder-whatsapp.ts:660-668`) | a counter of our own |
| flood guard | FS8 (d): the `occasion` CHECK + UNIQUE key; or `checkAndConsumeSmsBudget` (0049) if a counter is chosen | a new table |
| concurrency spec | `suspicion-notice-concurrency.spec.ts` (`pg_stat_activity`) | a sleep |
| RLS spec | `claim-suspicion-notice-policy-regression.spec.ts` | a fresh shape |

### Testing standards

Vitest; a RECORDING gateway double (zero-call assertions for every refusal — footgun #48 ⭐ also); real `t()` for every body, the expected
text built independently; live legs on :5433 with `pnpm db:migrate` first, as `role=twt_app` (T19), separate transactions where DB-clock
order matters; each replaced test names what it replaced; every new gate proven RED (mutants restored byte-identical, sha256). ⛔ assertion
on provider id. `scripts/ci-local.sh:137` runs `pnpm db:migrate` then `turbo test --force --concurrency=1` over 8 packages — new specs land
in packages already on the filter; CI timeouts: unit 20 min (`ci.yml:103`), integration 30 min (`:1022`). No gate demands anything for the
friction budget (member-facing prefixes are `apps/mobile/`, `apps/public/` only), i18n parity / microcopy (no copy added), audit / log
action names, or the trail shape.

### Project structure notes

The table's schema in `packages/domain/src/schema/`, its policies in `packages/domain/src/policies/`, its domain functions beside
`sms-delivery/` (name the dev's); the migration in `packages/domain/migrations/`; the core split INSIDE
`apps/jobs/src/scheduler/claim-dlt-sms-send.ts` (T17); the seam in `apps/jobs/src/scheduler/` (it is DB-touching — never in
`packages/channels`, which `fanOutAlert`'s contract keeps DB-free); no pg-touching `@twt/domain` import into anything Metro bundles
([[project_contracts_domain_bundle_boundary]]).

### Sequencing

Open worktrees at the pin `0e9b261d`: `11b-4-memorial-authorship-…` (done on its branch, ⛔ landed: migrations `0181_memorial-authorship`
(⚠ the SAME `when` as main's `0181`) and `0182_memorial-send-idempotency-key`, decisions `-391`–`-393`, `-395`, `-398`, `-400`, plans Row 41;
it renumbers to `0182` / `0183` at its rebase), `6-36f-nominee-mark-only-save` (at main; edits no S2 file), `3-3c-member-kyc-name-english-only`
(stale at 0178), `6-35-in-app-language-switch` (landed). 6.36e LANDED (`0181_member-nominee-links`, decisions `-396`, `-397`, `-399`,
`-401`–`-403`). None edits the files S2 lists. 5.11b takes the next free migration AT ITS COMMIT (`0184` or later), re-checked after every
rebase. Peer session twt-17 has used the main checkout — the story branch lives only in this worktree.

### Previous story intelligence

- **5.11** (landed `7489a296`): the registry, words, predicate, honest rung, FS14 / R1, `-394`; its "Carried to 5.11b" section is this
  story's F / FS source. Its review lesson: R1 — a blanket "terminal" broke the retry profile; every retry change here is per class (AC4).
  Its round-2 P3 is this story's I4; P2 is FS5's reason; D3 is FS9's `-394` item 3.
- **6.37 / 6.37b / 6.37c**: MG4 / MG5 / MG12; the CRQID (DR3); `correlationId` optional (now required on this path); the at-least-once SMS
  items "open on a gateway idempotency key" (`-347` consequence 5) — FS6 (a) with FS9's narrowed transient class is at-most-once instead
  (G14).
- **6.31 / 6.27c**: the per-row send record, begin / finalise CAS, lease re-claim (the at-least-once shape FS6 (b) names).
- **6.35**: the language column, LS10 / LS11 / LS13 (FS5).
- **6.36e** (landed after this story's creation): the newest table-registration precedent (`member-nominee-links-rls.ts`, the RTBF pin
  26 → 27); it skipped the policies README's `cross-pariwar-leak.spec.ts` probe — optional here too.
- **5.6**: the two mirror defects (FS12).

### Git intelligence

`main` at the pin: 6.36e landed by fast-forward (PR #302; `ec6de2b8`) and its ledger (`0e9b261d`); before it 5.11 (PR #301; `7489a296`) and
`ci: integration-tests timeout-minutes 20 → 30`. Stories land by fast-forward ([[feedback_land_prs_by_fast_forward]]).

### Latest tech information

No new fetch: 5.11's 2026-10-23 findings stand (TRAI ≥ 30 % fixed, typed variables, Service-Implicit transactional content; pg-boss 12.x
`retryCount` only with `includeMetadata`). MSG91's handling of a flow template with NO variable, of Devanagari / format characters in a
variable, and whether TRAI restricts service SMS by HOUR (FS23) are provider / counsel questions on roster Row 30 (d) / Row 40 (c) / Row 40's
new dated question — answered in writing, never assumed from docs (footgun #53(a)). TypeScript target `lib: ["ES2022"]` (`tsconfig.base.json:7`)
— ⛔ ES2024 string APIs (FS21).

### References

- `_bmad-output/planning-artifacts/architecture.md` §3.4 (`:2115-2119`, `:2318-2349`); epics `### Story 5.11b` (`epics.md:2483`), AR-19
  (`epics.md:304`), Story 5.3 (`epics.md:2318`).
- `.decision-log.md`: `-250`, `-345`, `-346`, `-347`, `-349`, `-366`, `-368`, `-385`, `-387`, `-389`, `-390`, `-394` (by id, never line).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-5-11-sms-for-members-without-whatsapp.md` (what the Panel was told).
- `_bmad-output/implementation-artifacts/5-11-per-member-sms-fallback-fixed-wording.md` ("Carried to 5.11b"; Review Findings).
- `docs/launch-gate-inventory/{inventory-roster.md (Rows 30, 32, 40), dlt-template-requests-6-19.md (templates 17–22; cost; `:271-272`,
  `:284`, `:289`)}`.
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:1255` (R10(B)).
- Code: F1–F21 above.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 5.11b`, 2026-10-25.

### Debug Log References

**(a) Task 0.1 and Task 0.2 (2026-10-25).**
- Task 0.1: `git fetch origin` — `origin/main` = `0e9b261d` = the pin; the pin is an ancestor of HEAD; the found-facts diff
  `0e9b261d..origin/main` is EMPTY. S1 clear (⛔ decision after `-403` on any ref or worktree; `-395`…`-403` touch no alert-SMS scope);
  S2 clear (⛔ open branch or worktree — 11b-4, 6-36f, 3-3c — edits an S2 file, committed or not); S3 clear (⛔ WhatsApp enablement in
  `infra/`); S4 clear (`template_id.contribution` appears only in the registry and its test); S5 clear (Row 30 (d)'s evidence is empty).
  FS8's count and FS6's FK: recorded at FS8 / FS6. `alert.channel_send` has ⛔ consumer outside `dispatch.ts:353`.
- Task 0.2, BigDev verbatim: *"all recommendation accepted for FS1-FS23"*. Read as every ⭐ option of FS5, FS6, FS8, FS9, FS12,
  FS17–FS23 with its outcome AND its cost line (footgun #45) — FS5 (a), FS6 (a), FS8 (d), FS9 (a), FS12 ⭐, FS17 (a), FS18 (a), FS19 ⭐,
  FS20 (a), FS21 (a), FS22 `as`, FS23 (a); G13 as stated (a non-blocking confirm goes with the next Panel note). FS1–FS4, FS7, FS10, FS11,
  FS13–FS16 are Story 5.11's (`-389`) — ⛔ re-decided.
- Task 0.3: Decision `2026-10-25-404` (author-commit) committed ALONE as `447c91e0` (the decision-log write was accepted).
- Task 0.4 (the records commit, after `447c91e0`): deferred-work — a new section "Story 5.11b — the real alert SMS send" (quiet hours,
  FS23; the data export, FS6) and dated annotations on the 6.34 TV6 item, the 6.37b `correlationId` item, the two 5.6 items (FS12), LS11's
  item (its *"FS5 — `getMemberLanguage`"* corrected), the WhatsApp off → on item (FS20) and the Hindi pool-value item (FS21); roster Row 40
  dated note (deploy order; both languages' ids; the TRAI-hours question; Row 32's legs); the DLT sheet's three stale sentences annotated;
  architecture §3.4 dated annotation (after the `-390` one); `epics.md` `### Story 5.11b` dated note (the two departures); the ledger.
  ⚠ DEVIATION, recorded: Task 0.4's *"row `ready-for-dev → in-progress`"* is NOT done — dev has not started (5.11's Task 0.4 kept its row
  `ready-for-dev` the same way); `bmad-dev-story 5.11b` moves it. The push-past-claim-TTL item (F6) waits for Task 3 (bounded or
  recorded then).

**(b) Dev (`bmad-dev-story 5.11b`, 2026-10-25).**
- Preflight: `git fetch origin` — `origin/main` = `0e9b261d` = the pin; the pin is an ancestor; the found-facts diff is EMPTY. Row
  `ready-for-dev → in-progress` (ledger entry at completion — [[project_sprint_status_ledger]]).
- ⭐ LIVE DB — a SEPARATE fresh database `twt_dev_511b` on the :5433 container (`CREATE DATABASE`, then `pnpm db:migrate`: 182
  migrations incl. 0184). The shared `twt_dev` on :5433 has 0180 as its newest applied migration (main's 0181 and 11b-4's 0181 / 0182
  unapplied); applying 0184 (`when` 1795405200028) there would make drizzle skip 11b-4's renumbered 0182 / 0183 for good
  ([[project_sibling_migration_when_order_shared_db]]). ⛔ Applied to `twt_dev` (:5433) or :5432. Every live leg and `ci:local` ran on
  `twt_dev_511b`. ⚠ Whoever lands second applies the siblings in journal order.
- Migration NUMBER 0184 (idx 184, `when` 1795405200028) — 0182 / 0183 are 11b-4's at its renumber (`-366` decision 6).
- Mutants, every one RED, every source restored sha256-identical: M1 `beginAlertSmsSend` as read-then-insert ⇒ the concurrency race
  leg RED; M2 `WHATSAPP_OFF_MEMO_TTL_MS = Infinity` (the old process-lifetime `off`) ⇒ both FS20 legs RED; M3 FS21 — the eight new
  `smsPoolLabel` legs RED before the source change (the Cc leg already held); MG12 — both new `sms.test.ts` legs RED before the
  change; seam (`alert-sms-send-live.test.ts`): M4 no send record (lookup skipped, begin always new) ⇒ 20 RED; M5 the seam's dispatch
  without `suppression` ⇒ the I4 leg RED; M6 `api_unavailable` re-sendable ⇒ the 4 G14 legs RED; M7 a refusal alarm per member ⇒ 3 RED;
  M8 (a throw at lookup) was EQUIVALENT — the outer catch maps it identically — so replaced by M8′ (the outer catch removed) against a
  NEW leg (a lifecycle hook that rejects inside the SMS dispatch) ⇒ RED; M9 `readMemberTextLanguages` without `WHERE pp.pariwar_id` ⇒
  the language spec RED; the AST pin's revert-sanity leg is in the suite itself.
- Found while building: (1) in the `deferred` re-claim race the loser waits in its INSERT (the speculative check waits on the tuple the
  winner's uncommitted compare-and-set holds), ⛔ the UPDATE — the concurrency leg admits either statement; (2) a MSG91 gateway code
  `421` classifies as `auth`, ⛔ `carrier_reject` — the carrier leg uses a classified local refusal; (3) the trigger unit suite's
  `@twt/domain` mock hands a fake scoped `db`, so the new language read is stubbed there (a harness stub, ⛔ an assertion change).
- ⚠ DEVIATIONS, recorded: (a) AC5's "POOL_BATCH and MISMATCH, LIVE" legs are SPLIT — the set-based read LIVE as `twt_app` with a
  one-statement assertion (`member-text-languages.spec.ts`), the producers' use of it in the trigger unit suite (⛔ live harness resolves
  a pool identity end to end) — deferred-work item, trigger named; (b) AC8's AST hashes are taken from `git show 0e9b261d:` at
  authoring time and PINNED (⛔ a `git show` at test time — CI's checkout need not hold the pin); (c) the 5.11 "Flip" tests in
  `contribution-notify.test.ts` / `ai-8-3-ladder-armor-live.test.ts` stay UNCHANGED — they run with the seam ABSENT and still hold; their
  seam-wired siblings are `alert-sms-send-live.test.ts`; (d) F6 is BOUNDED (`LIT_KIND_MEMBER_CHUNK_SIZE` = 16 for lit kinds once the seam
  is wired), ⛔ recorded as open; (e) AC7 — `claim-contact-ladder-whatsapp.test.ts` IS edited: Task 7's sha256 fence re-take (its two
  pins), ⛔ an assertion; every other claim test in T17's list is byte-unchanged.

- `ci:local` on `twt_dev_511b` (2026-10-25): 35 / 36 jobs green; the one red (`integration-tests`) was ONE file —
  `restoration-discipline-production-path-live.test.ts`'s 10.23 gate REFUSING a database not named `twt_dev` (⛔ a code failure; its
  own message names the override for a disposable DB) — and turbo then skipped `@twt/api`. Re-run: that file with
  `TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS=1` (the DB is this story's throwaway) 3 / 3; `@twt/api` integration 2105 passed / 1 skipped;
  domain 6279, channels 457, jobs 1675 (+ the 3), events / queue / niyamavali-engine / validity-service green. After two doc-comment
  fixes made post-run (one in the fenced `contribution-notify.ts` — its pin re-taken a second time): `@twt/jobs` typecheck + lint and
  the six touched suites (316 tests) green.

### Completion Notes List

- ⭐ The rung SENDS. A lit, eligible member with an SMS target goes prepare → read-only lookup → §3.4's window → `dispatch` with a
  one-send provider (begin, gateway, finalise) — `alert-sms-send.ts`, injected on `ContributionNotifyDeps.alertSms` and built in boot
  (FS19). The seam never throws; every non-send is an exact allow-listed literal (`alert-sms-details.ts`, a leaf module — T12).
- I1 — `alert_sms_sends` (0184): one row per (alert, member, occasion), the occasion CHECKed to six literals (FS8 (d)'s structural flood
  guard — ⛔ counter), FORCE RLS, per-command policies, EXACT column grants, ⛔ DELETE, a freeze trigger; only `rate_limited` leaves a row
  `deferred` for a re-send; every `api_unavailable:*` / `unknown:*` and a stale lease (2 min) is FINAL `exhausted:outcome_unknown…` +
  alarm. The CRQID kind `as` (FS22): 0167's two CHECKs replaced, `LOOKUP.as`, the silence count joins `as`, a stale-`attempting` count.
- I4 — `suppression?` on the deps reaches EVERY rung's dispatch (push, WhatsApp, SMS, the Telegram mirror); a suppressed member gets
  ⛔ row and ⛔ call. `dispatch.ts` / `cascade.ts` byte-identical.
- FS17 — the claim core split INSIDE `claim-dlt-sms-send.ts` (`prepareDltSms` / `sendPreparedDltSms`; `sendClaimDltSms` delegates in
  the old order) — 17 claim test files (503 tests) pass UNEDITED; the dead `fitsDltAlphanumeric` reference is gone. MG12: `values: []`
  sends, an absent `values` stays refused (provider), the client's `length === 0` refusal dropped.
- FS5 — the producers read each member's TEXT language in ONE set-based query (`readMemberTextLanguages`, inside the pool-identity
  scope; MISMATCH: one query); ⛔ passport ⇒ ⛔ text + one alarm; the push keeps the producer's locale. FS9 — `includeMetadata` on
  POOL_BATCH and MISMATCH; the attempt, job id and occasion go down the chain PER CALL; a WhatsApp-tried member is texted from attempt 2
  or on the final attempt. F6 bounded (16 per chunk for lit kinds once wired).
- FS20 — the fan-out resolver keeps a WhatsApp `off` only 60 s (W1 closed); FS21 — `smsPoolLabel` refuses Zl / Zp / Cs and every Cf
  but ZWNJ / ZWJ.
- Day one is unchanged in effect: ⛔ template id is set (Row 40 (a)) ⇒ `config:dlt_template_id_missing:<locale>`, ⛔ row, one alarm per
  key per 5 min. ⚠ DEPLOY ORDER (Row 40 note): migration → api → jobs.
- ⛔ Pushed. ⚠ 0184 is applied ONLY to `twt_dev_511b` (⛔ `twt_dev` on :5433, ⛔ :5432) — see Debug Log (b).

### File List

**New** — `packages/domain/migrations/0184_alert-sms-sends.sql`; `packages/domain/src/schema/alert_sms_sends.ts`;
`packages/domain/src/policies/alert-sms-send-rls.ts`; `packages/domain/src/sms-delivery/alert-sms-sends.ts`;
`apps/jobs/src/scheduler/alert-sms-details.ts`; `apps/jobs/src/scheduler/alert-sms-send.ts`;
`packages/domain/tests/integration/rls/alert-sms-sends-policy-regression.spec.ts`;
`packages/domain/tests/integration/sms-delivery/alert-sms-sends-concurrency.spec.ts`;
`packages/domain/tests/integration/member/member-text-languages.spec.ts`; `apps/jobs/tests/alert-sms-send.test.ts`;
`apps/jobs/tests/alert-sms-send-live.test.ts`.

**Modified (source)** — `packages/domain/migrations/meta/_journal.json`; `packages/domain/src/schema/index.ts`;
`packages/domain/src/policies/index.ts`; `packages/domain/src/schema/sms_send_deliveries.ts`;
`packages/domain/src/schema/sms_delivery_report_inbox.ts`; `packages/domain/src/sms-delivery/correlation.ts`;
`packages/domain/src/sms-delivery/reports.ts`; `packages/domain/src/sms-delivery/index.ts`; `packages/domain/src/member/anonymize.ts`
(comment); `packages/domain/src/member/preferred-locale.ts`; `packages/channels/src/providers/sms-dlt.ts`;
`packages/channels/src/providers/sms-app.ts`; `packages/channels/src/composition/provider-composition.ts`;
`packages/contracts/src/alerts/alert.ts` (comment); `apps/jobs/src/scheduler/claim-dlt-sms-send.ts`;
`apps/jobs/src/scheduler/contribution-notify.ts`; `apps/jobs/src/scheduler/contribution-notify-triggers.ts`;
`apps/jobs/src/scheduler/contribution-sms-templates.ts`; `apps/jobs/src/sms-delivery-silence.ts`;
`apps/jobs/src/sms-delivery-correlator.ts` (comment); `apps/jobs/src/boot.ts`.

**Modified (tests)** — `packages/domain/tests/sms-delivery/correlation.test.ts`;
`packages/domain/tests/integration/rls/sms-delivery-report-inbox-policy-regression.spec.ts`;
`packages/domain/tests/integration/rls/sms-send-deliveries-policy-regression.spec.ts`; `packages/channels/tests/sms.test.ts` (the
MG12 loop split); `packages/channels/tests/contribution-provider-resolver.test.ts`; `apps/api/tests/unit/msg91-sms-reports.test.ts`;
`apps/jobs/tests/sms-delivery-correlator-live.test.ts`; `apps/jobs/tests/sms-delivery-correlator.test.ts`;
`apps/jobs/tests/contribution-sms-templates.test.ts`; `apps/jobs/tests/contribution-notify-triggers.test.ts` (a harness stub for the
language read + new legs — ⛔ an existing assertion changed); `apps/jobs/tests/claim-contact-ladder-whatsapp.test.ts` (the sha256 fence
re-take of `contribution-notify.ts` and `provider-composition.ts` — the one AC7-list file edited, ⛔ an assertion).

**Records** — `_bmad-output/implementation-artifacts/5-11b-alert-sms-real-send.md`; `_bmad-output/implementation-artifacts/deferred-work.md`;
`_bmad-output/implementation-artifacts/sprint-status.yaml`.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-24 | v1.0 | Created (`bmad-create-story 5.11b`, worktree `.claude/worktrees/5-11b-alert-sms-real-send`, pinned `6c4c1e47`); four read-only verifiers re-checked 5.11's carry at the pin. CORRECTED: the send record's key includes the occasion (F4 — the alert id is per cycle); a second MG12 refusal in the MSG91 client (F8); the claim core's unconditional helpline (F9). FS5, FS6, FS8, FS9, FS12, FS17–FS23 PROPOSED; ⛔ Panel question at the recommended options. Ultimate context engine analysis completed - comprehensive developer guide created. |
| 2026-10-25 | v1.1 | Validated (`bmad-create-story validate 5.11b`; four read-only checks — code claims · governance · end-to-end design · tests and gates; BigDev: "all"). Branch rebased onto `origin/main` `0e9b261d` (6.36e landed) and re-pinned; F14 / F17 / F21 re-taken (RTBF pin now 27). ⭐ Design: only `rate_limited` is re-sent — every `api_unavailable:*` may hide an accept ⇒ final (FS6 (a″) offers the at-least-once alternative, G14); a found `attempting` row inside a 2-min lease is IN FLIGHT, ⛔ a crash (claim token `${job.id}:${retryCount}`); the core splits into prepare / send so config refusals write no row; begin + budget in ONE scope tx and the seam never throws; only real sends go through `dispatch`, with `suppression` on the deps for every rung; FS20 memoizes per channel (`off` on a 60 s TTL — never-memoize would re-read secrets per member); FS8 recommends (d), a structural cap (the `occasion` CHECK), since a 24 h / 10 bucket fails its own rule. Governance: `-347` dated 2026-10-17; G2 states its two author readings; G3 / G9 / G12 corrected; G13–G15 added; FS9 (a′) is the Panel's; AC0's supersession list completed. Tests: the change / stay lists corrected; RLS, concurrency, boot-pin, AST source-pin and `twt_app` legs specified; fences T16–T18. Numbers: decision `-404`, migration `0184`+. A fresh-context review of this revision's own diff then fixed: BEGIN runs INSIDE `dispatch` (a suppressed member gets no row); FS5's query filters `pp.pariwar_id` and joins `members.member_id`; the claim wrapper keeps `correlationIdOrCrash` first; the messaging probe, proven vs unproven pre-flight details and `unknown:*` mapped; FS8 (d)'s one-text-per-occasion across pools stated; the glyph register. |
| 2026-10-25 | v1.2 | Answered (Task 0.2): BigDev — *"all recommendation accepted for FS1-FS23"* — every ⭐ option of FS5, FS6, FS8, FS9, FS12, FS17–FS23. Task 0.1 done (no drift; S1–S5 clear; FS8's count; FS6's FK proven). Decision `2026-10-25-404` committed ALONE (`447c91e0`). Next: Task 0.4. |
| 2026-10-25 | v1.3 | Developed (`bmad-dev-story 5.11b`): Tasks 1–8. Migration 0184 (`alert_sms_sends` + the CRQID kind `as`); the claim core split (prepare / send) with every claim test unedited; MG12 for slot-less templates; the real send seam through `dispatch` (suppression on every rung), at most once, §3.4's window, the per-member text language, FS20 / FS21; 9 mutants RED. `ci:local` on a fresh isolated DB green but for one file's DB-name gate (re-run with its override — green). Status → review. ⛔ Pushed. |
