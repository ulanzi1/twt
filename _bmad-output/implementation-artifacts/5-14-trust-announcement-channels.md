---
baseline_commit: 282bdd33
---

<!--
PINNED: 282bdd33 (`origin/main` at creation, 2026-10-29 — "records: ledger 2026-10-29 — Story 5.8b LANDED on main by fast-forward
(PR #308, CI 36/36)"). Branch `story/5-14-trust-announcement-channels`, worktree `.claude/worktrees/5-14-trust-announcement-channels`,
created from `origin/main` after `git fetch origin` (HEAD = origin/main at creation).

Two facts, kept apart (footgun #24): (1) the PIN is valid iff `git merge-base --is-ancestor 282bdd33 HEAD`; (2) the FOUND FACTS are valid
iff `git diff --name-only 282bdd33..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory` is EMPTY or every changed
path is re-checked against the F it touches. Re-run BOTH at Task 0.1 — never assume either.

STATUS: 2026-10-29 created (`bmad-create-story 5.14`) → ready-for-dev. v1.0 → v1.1 the same day: one fresh-context checklist verifier
(2 CRITICAL / 5 HIGH / 12 MEDIUM / 10 LOW), every finding applied and the critical ones re-checked by hand (Change Log). v1.1 → v1.2 the
same day: a second validation (three fresh-context verifiers — jobs / API-admin-mobile / governance-design; 30 findings, all applied by
BigDev's "all"; Debug Log (e)). FS1–FS15
PROPOSED for BigDev at Task 0.2; PQ1 PROPOSED (one Panel question — whether a public channel post may name a deceased member's family
ahead of the rule every public web page follows; it blocks the go-live row, ⛔ the build). ⛔ No code before Task 0.3 (the
author-commit decision committed ALONE) and Task 0.4 (records).

START CONDITION — MET at the pin: `-390` Q2 A (Trustee-ratified, 2026-10-23) homed this row; 5.5 (the per-Pariwar Telegram bot, its
config table and real `sendMessage` client), 8.1 (`openCycleAlert`), 8.8 (the fan-out) and the deadline sweep (days 5 / 10 / 13 / 14) are
`done` on `main`. Nothing this story needs is unbuilt elsewhere.

NUMBERS (footguns #19 / #42(e); `-366` decision 6): this file names no decision id, roster Row, migration number or ledger letter as
TAKEN. At the pin they WERE: decision max `-415` on `main` (`-413` held by 6.32's unlanded branch) ⇒ next `-416`; roster Row 43 on `main`
(Row 42 held by 6.32's branch) ⇒ next Row 44; migration `0188_degraded-bridge-sms` on `main` (journal `when` 1795837200033), and 6.32's
branch ALREADY holds `0189_ground-inspection-questionnaire` (`when` 1795923600034, renumbered in `9eec3559`, 2026-10-29) ⇒ this story's
migration is `0190`, with a `when` above 1795923600034 (`-366` decision 6: a number belongs to the first COMMIT that takes it on any
branch — ⛔ "whoever lands first"); ledger `2026-10-29` on `main`, `-29a` held by 6.32's branch, `-29b` by 11b.5's ⇒ this creation takes
`2026-10-29c` (it first took `-29a` in `05d0dfe9` — a collision, relabelled at v1.2). Re-find every one AT THE TIME OF USE across `main`,
every branch and every worktree — the ledger letter included.

§0 GATE (trustee-panel-routing-note-TEMPLATE.md) — readings (ratified text quoted verbatim; match / widen / narrow stated):
  G1  `2026-10-23-390` Q2 A (Trustee-ratified): *"A request — members are asked to join one channel; the app stays the official channel;
      R10(B) is unchanged."* The question as put: *"the Trust will run one WhatsApp Channel and one Telegram channel that post general
      notices — a pool opening and a cycle's last day"*. Its "Not covered": *"how the channels are built, what a WhatsApp Channel admin
      may post by hand, and their place in the technical plan — the author's (an architecture annotation or ADR; a backlog row), after
      this ruling"*; *"the words of the channel posts beyond the drafts shown — the author's"*; *"how a member is ASKED to join (where in
      the app, how often) — the author's, non-coercive (the tone guide)"*. ⇒ building the channels, the posts and the ask is MATCH; every
      FS below is the author's EXCEPT PQ1.
  G2  `2026-09-02-180` Q1 (Trustee-ratified): the deceased family's full name on *"④ the cycle-open push / WhatsApp / SMS copy (8.8)"*;
      *"⛔ no consumer is excluded, and ⛔ no split is authorised"*. `-390`: *"the Panel did ⛔ say so ⇒ `-180` Q1 stands for the posts,
      ⛔ narrowed"* (the note had offered: *"If you want the post to name only the pool, say so: that would narrow `-180` for this one
      place"*). `-181` (BigDev, MODE-RESOLVED): the member-facing name form follows the Pariwar's stored presentation mode. ⇒ on its face
      the pool-open post names the family — but see G3.
  G3  ⚠ THE TENSION (⇒ PQ1). Every PUBLIC surface that names a deceased member does so under two conditions the Panel set for public
      pages, and a WhatsApp Channel is public (Meta's Channels Privacy Policy: *"Channels are public, meaning that anyone can discover,
      follow, and view your Channel"*):
        (i) its OWN Panel ruling — the public-pages matrix (`packages/contracts/src/public-pages/matrix.ts:394-395`): *"⛔ ADDING TO THIS
            LIST IS A RULING, NEVER A CODE CHANGE"*; and (`:408`) *"moving them requires each surface's OWN Panel ruling"*. `-390` can be
            read as the channel's own ruling: the Panel was told the channel is publicly listed (*"so the name, the pool and the date can
            be read by people outside the Trust"*) and did not narrow `-180`.
        (ii) the BASIS — `2026-08-28-160` (Trustee-ratified, counsel present): *"THE THREE EPIC 11b SURFACES ARE CLEARED, on a NEW BASIS,
            ⛔ not on the one `2026-08-24-157` cl.3 rejected; ⭐ the member's own versioned T&C acceptance becomes the publication authority
            for their name after death"*; built as a per-member gate (`matrix.ts:402-403` — *"Gated on the MEMBER'S OWN accepted T&C version
            pinning the post-death publication clause"*; `NAME_PUBLICATION_AUTHORISED` is an SQL `EXISTS` predicate on clause
            `niy.public-disclosure.member-information` (`packages/domain/src/pool/public-read.ts:393`) that evaluates false today, so
            the name is *"null ON EVERY DRIVE TODAY, BY DESIGN"* (`sahyog-vivran.ts:415`)). `2026-09-02-173` gave Sahyog Vivran its own ruling at the full name and kept it
            *"UNNAMED, by ruled design"* until the written clause *"exists and is PINNED"*.
      The `-390` note cited neither (ii) nor the matrix fence, and said of itself *"whether the deceased family's name already appears
      anywhere public — not checked for this note"*. A post built per `-390` would name EVERY family on a public channel, with no per-member
      basis — today the ONLY public place a deceased member would be named. ⇒ `-390`'s accepted cost and `-160` / `-173`'s basis gate are
      two RATIFIED positions that may conflict — the template's fourth case ⇒ the Panel's ⇒ PQ1. ⛔ The author does not decide which
      governs ([[feedback_supersede_never_reinterpret]]). (v1.0 of this file cited `-157` as live — WRONG: `-160` superseded its hold.)
      Sub-question for option A only: WHICH form — the member-facing resolver renders a mononym in full in `shielded_name` mode
      (`pool-identity.ts:226-228`, `resolveMemberFacingDeceasedName`), while the public resolver omits it (`-181` trap; `-145` cl.3).
  G4  Niyamavali R10(B), TWT-adapted (PRD `prds/prd-TWT-2026-05-22/prd.md:1255`, under FR-94 — ⛔ in the seed clause file): *"Missed
      information is the member's responsibility — official communications are delivered via the channels listed in this clause."*
      (official channel: the in-app surface; Telegram / WhatsApp Business mirrors). Terms draft v0.2 cl.10 (source:
      `docs/legal-counsel-engagement/handover/build_tc.py:55-57`; the counsel corpus itself is private —
      [[project_legal_corpus_private_repo_split]]): *"The official channel is the in-app surface. Telegram and WhatsApp Business are mirrors
      offered for convenience and are not official."* ⇒ every word this story shows a member keeps the app official — MATCH (`-390`:
      *"NARROWS NOTHING in R10(B) or the Terms draft cl.10"*).
  G5  Architecture §3.4 (ratified with ADR-0029 by `-065`, by later entries' description): *"Telegram mirror (Bot API) — fire-and-forget;
      announcements-only; per-Pariwar channel."* and the 2026-10-23 annotation: *"The Trust's WhatsApp Channel and Telegram channel are
      MIRRORS members are ASKED to join (Q2 A — the app stays the only official channel); their place in this section is the author's
      annotation or ADR, still owed."* ⇒ this story writes that annotation (Task 0.4) — the author's (G1). A channel POST sends no message
      to any member, reads no member's opt-in, and takes no member's chat id.
  G6  Tenancy — `-390` says *"the Trust"*; architecture says the Telegram mirror is a *"per-Pariwar channel"* and *"Multi-tenant isolation
      — every query scoped by `pariwar_id` … any leak is P0"*; the PRD: *"v1 ships only Bihar (one Pariwar)"* and FR-61 *"Separate app
      per Pariwar"*. In v1 the Trust and its one Pariwar are the same members. ⇒ FS1 (a) configures the channels PER PARIWAR — for v1
      exactly "the Trust's one WhatsApp Channel and one Telegram channel" (MATCH); a later second Pariwar gets its own, so one Pariwar's
      deceased family is never posted to another Pariwar's members. Recorded as the AUTHOR'S reading of "the Trust's" in the decision.
  G7  `2026-08-01-070` item 2 (Trustee-ratified, ratifying `-069`'s condition): *"`kyc_provider_selection`, `wa_cost_optimization`, and
      `telegram_mirror` remain explicitly marked "declared, not production-active" until each ships its first real consumer"*; the
      re-trigger *"the first live Telegram mirror dispatch for `telegram_mirror`"*. ⚠ A CONTESTABLE AUTHOR READING, named as such in the
      decision's "How much to trust this entry": the PRD calls FR-73 *"Telegram channel mirror"* (`prd.md:1065`), but FR-73 / Story 5.5 /
      §3.4 describe a PER-MEMBER, opt-in mirror of a member's alerts; a Trust channel post is a broadcast that mirrors no member's alert ⇒
      it is ⛔ a "mirror dispatch", ⛔ reads the flag, and leaves its status untouched. If BigDev reads it otherwise (FS3 (d)), the flag's
      first consumer is this story and `-070`'s condition must be met here. The posting switch is this story's own per-Pariwar column,
      starting OFF (FS3), flipped under `pariwar.configure_channels` (held by `pariwar_admin`). ⚠ This is NOT the `-415` FS17 shape: FS17
      rejected both *"⛔ The feature-flag store"* AND a per-Pariwar switch (Trust-wide, `super_admin` only). Per-Pariwar here is the
      author's choice under G6; whether switching on a post that may name the deceased should be `super_admin`-only is a question
      BigDev can raise at Task 0.2 (FS3).
  G8  PRD addendum RA-29 (`prds/prd-TWT-2026-05-22/addendum.md:47` — *"Bulk-alert SMS dropped"*) — ⛔ engaged: no SMS is sent.
  G9  Tone: `docs/tone-guide.md` §3 *"No false alarms; no manufactured deadlines; no notification-anxiety patterns"*; *"Anxiety /
      coercion framings"*; UX spec *"no nagging notifications"*; `NotificationSettingsEntry.tsx:3-5` *"opting in is a member choice,
      framed neutrally, never nagged"*. ⇒ binds FS9 / FS10 (the ask), the rule that the app says nothing not yet true (the links and copy
      show only while the channels are on — FS3, FS12) and the words.

NOT covered by any ruling and NOT this story's: consent to the posts under DPDP (counsel — FS13 leg (e)); the automatic posting of any
other notice (news, surveys, Niyamavali amendments); a WhatsApp Channel posting API (none exists — F12); the per-member Telegram mirror
(5.5) and its flag (G7).
-->

# Story 5.14: The Trust's Announcement Channels — One Telegram Channel the System Posts To, One WhatsApp Channel an Admin Posts To by Hand, and One Calm Ask in the App `[SURFACE]`

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The Trustee Panel ruled on 2026-10-23 (`-390` Q2 A) that the Trust runs one WhatsApp
> Channel and one Telegram channel that post general notices (a pool opening and a cycle's last day), and that members are ASKED, never
> required, to join one, while the app stays the only official channel. Nothing exists yet. Telegram today is a per-member opt-in
> mirror (5.5). It never posts to a channel and never carries the last day, because `deadline_reminder` is not Telegram-eligible
> (F2). Meta has no API for posting to a WhatsApp Channel (F12). This story builds, per Pariwar (G6), a channel configuration a Pariwar
> admin fills in: the two invite links, the Telegram channel's id and ONE "channels live" switch that starts OFF. While the switch is
> on, three things happen. A job posts to the Telegram channel through the Pariwar's existing bot: once per pool when a cycle opens,
> and once per cycle on its last day. Each post goes at most once, recorded in a new table that holds ids and states but never a name.
> An admin page shows the same words, ready to copy into the WhatsApp Channel by hand. The app shows one calm ask: a home card until
> the member opens a channel or says "Not now", plus a settings entry shown while a link exists. The ask never blocks anything and never says the member
> must join. **Day-one output: nothing is posted and nothing is shown.** The switch starts OFF, no Pariwar has a channel configured, and
> the go-live row (FS13) waits on PQ1, which asks whether a public channel may name a deceased member's family.
>
> **What it REUSES:** the Pariwar's Telegram bot credential (`pariwar_telegram_config.bot_token_secret_name`) and the real `sendMessage`
> client (`telegram-app.ts`, via `createTelegramAppCache`); the `alert_sms_sends` (0184 / 5.11b) claim lifecycle; `resolvePoolIdentity`
> and the fan-out's identity wiring (named mode only); `operationalDate` (moved to contracts); the cycle-open post-commit hook, the deadline
> sweep's day computation and the hourly recovery sweep; `withCompensatingAudit`; the channel-config admin module and
> `pariwar.configure_channels`; the 6.36c `HomeReminderCard` frame; the house `Linking.openURL` shape; the copy-key pin test pattern.
>
> **What it CHANGES:** ONE migration (a per-Pariwar config table + a post-record table); contracts (config DTOs, the member read, the
> post-record view, the post builder); two API route groups (admin config + posts list, member read); a jobs queue + handler and two
> enqueue seams + a recovery-sweep step; the Telegram client (a request timeout, `retry_after` on its error, a `signal` on its fetch seam
> — FS7); the access-wrapper gate's `CHANNEL_ROOTS`; the admin channel-config page; a mobile screen, a home card, a settings entry, a
> dismissal store; en + hi copy; the friction ledger; architecture §3.4 annotation; a roster row + a Row 26 note; epics.md.
>
> **What it READS and leaves alone:** `dispatch` / `cascade` / `CANONICAL_CHANNEL_LADDER` / `TELEGRAM_ELIGIBLE_CATEGORIES`; the
> per-member Telegram mirror, its opt-in and its webhook processor (F4 — verified safe); the `telegram_mirror` feature flag (G7); the
> per-member notification fan-out; the SMS paths; `openCycleAlert`; the degraded-mode bridge and its switch.

## Story

As a **member of a Pariwar**,
I want **to be able to follow the Trust's WhatsApp Channel or Telegram channel, where every pool opening and every cycle's last day is
posted, and to be asked about it once, calmly, in the app**,
so that **I have a second way to hear about a pool opening or a last day when the app's notification does not reach me, while the app
remains the official place for every notice**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-10-23-390` Q2 A | *"A request — members are asked to join one channel; the app stays the official channel; R10(B) is unchanged."* | RATIFIED — G1 |
| `2026-10-23-390` "Not covered" | build, hand-posting, place in the plan, words beyond the drafts, how / how often a member is asked — *"the author's"* | the FS block |
| `2026-10-23-389` G10 / G12 / G13 | the pool-open channel post *"carries the full name"*; a broadcast channel is in neither §3.4 nor the built mirror ⇒ *"an architecture note (the author's) and a backlog row, both AFTER PQ3"* | author-commit — this row |
| `2026-09-02-180` Q1 / `-181` | full name on every consumer; the member-facing form MODE-RESOLVED | RATIFIED / BigDev — G2 |
| `2026-08-28-160`; `2026-09-02-173`; the public-pages matrix fence | the deceased's name public only on the member's own accepted T&C version; each public surface its OWN ruling; Sahyog Vivran *"UNNAMED"* until the clause is pinned | RATIFIED — G3 ⇒ PQ1 |
| `2026-08-01-070` item 2 | `telegram_mirror` *"declared, not production-active"* | RATIFIED — G7, untouched (a named reading) |
| R10(B) / Terms v0.2 cl.10 | the app official; Telegram / WhatsApp mirrors | PRD / counsel draft — G4 |
| Routing note `…-2026-10-23-5-11-sms-for-members-without-whatsapp.md` Q2 | the draft posts (BigDev's words, *"written as texts"*); *"The Trust cannot see which of its members joined"*; *"Meta offers no official way for software to post to a WhatsApp Channel"* | AS PUT — kept unedited |
| Story 5.11 "The words" — CHANNEL DRAFT rows (`5-11-…md:447`, `:449`) | `sms.pool_open` / `sms.deadline_last_day` en + hi (BigDev's) | drafts — FS8 adapts them |
| Story 5.11 FS16 (b) (`5-11-…md:426-434`) | BigDev: *"Trust name is already mentioned in SMS header/WhatsApp sender"* — FS16 (b) itself KEPT "TWT:" as the prefix (*"'TWT:' stays as the prefix; no text names the app"*) | FS8 EXTENDS the reasoning (the author's) to drop "TWT:" on a channel — BigDev confirms at Task 0.2 |
| deferred-work "The Trust's announcement channels…" (Story 5.11 section) | open (2)–(5) + how a member is asked; *"Stays OPEN until that row is `done`"* | HOMED here — Closed by 5.14 effective when `done` on `main` |
| Architecture §3.4 annotations 2026-10-23 (×2) | the channels' place *"still owed"* | owed — Task 0.4 writes it |

## ⭐ THE INVARIANTS

- **I1 — Nothing is posted and nothing is shown unless a Pariwar admin has switched the channels on.** The config row starts OFF; the
  job reads the switch AT POST TIME (by design — a later switch-off stops later posts) and records `skipped:switch_off` otherwise; the
  member read returns no link while it is off. *Proof:* AC3, AC5.
- **I2 — At most one post per (Pariwar, occasion, subject).** The post record's UNIQUE key (`pariwar_id`, `occasion`, `subject_id`) —
  `subject_id` = the pool id for `pool_open`, the alert id for `last_day` — is the ONLY at-most-once guard (⛔ `singletonKey`: on this
  repo's standard queues it *"is only a label … and dedupes nothing"*, `contribution-notify-triggers.ts:739-741`). The lifecycle is
  `alert_sms_sends`' (0184 / 5.11b — F15) copied exactly: lookup → begin (`INSERT … ON CONFLICT DO NOTHING`, else a compare-and-set
  `deferred → attempting` under `SELECT … FOR UPDATE` with a NEW `claim_token`) commits BEFORE the Bot API call → finalise by a
  compare-and-set on THAT attempt's token. Only a `deferred` row (a 429 — definitely not posted) is ever re-claimed; an `attempting` row
  past the lease, and every "may have posted" outcome, is final `unknown`, never re-posted. *Proof:* AC6.
- **I3 — No post is reported made without a real `ok: true` from Telegram.** The poster NEVER reaches `createFixtureTelegramProvider`
  (which returns `accepted` with no send — F5). *Proof:* AC6.
- **I4 — Nothing about one member is ever posted, and no name is ever stored.** A post carries only the pool label, the family's name
  (G2 / PQ1) and the cycle's last date; the builder's input type has no member field; the post record holds ids, states, the date and
  the pool label — ⛔ the family's name, ⛔ the post text (FS15). *Proof:* AC4, AC7.
- **I5 — The family's name is the ruled one, whole — or absent.** Which variant posts is ONE exported constant (FS6) set from PQ1's
  answer. In `member_facing` mode the name comes from `resolvePoolIdentity` (or the public resolver, if PQ1 so rules — G3); never
  truncated; a pool whose name cannot be resolved is `refused:identity_unavailable`, ⛔ posted without the name. In `none` mode NO name is
  read: ⛔ mode read, ⛔ `resolvePoolIdentity`, ⛔ decrypt — the label comes from `resolveCuratedPoolName` ?? `poolLetterCode`, and
  `identity_unavailable` cannot arise. *Proof:* AC4.
- **I6 — One Pariwar's notices never reach another Pariwar's channel.** Config, post record and job are keyed by `pariwar_id`. The API
  binds through the tenant RLS (`twt_app` + tenant policies). ⚠ The JOB does NOT: the jobs pool is the BYPASSRLS service pool (`boot.ts:589,
  607`), and `withPariwarScope` (`packages/domain/src/db.ts:164-183`) only `SET LOCAL app.pariwar_id` — it never switches role (roster
  Row 26: jobs' production login is unprovisioned). ⇒ in the job, isolation is an EXPLICIT `pariwar_id = $1` predicate on every read and
  write (the `listCycleBindingCandidates` / `getTelegramConfig` / 0184-accessor shape), ⛔ RLS. *Proof:* AC1, AC3, AC6.
- **I7 — The app stays official, joining stays a choice, and the app never claims what is not yet true.** Every member-facing string says
  the app is where every notice is; ⛔ "must", "required", "miss", or a consequence of not joining; the card and screen show only links
  that exist, only while the channels are on (a Telegram link only while posting to it is possible — FS12); the ask never gates any step
  and, after "Not now" or a successful open, is never re-shown on that device for that account until it signs out (FS10). *Proof:* AC8,
  AC9.
- **I8 — The frozen channel core and the per-member mirror do not move.** `dispatch`, `cascade`, `CANONICAL_CHANNEL_LADDER`,
  `TELEGRAM_ELIGIBLE_CATEGORIES`, `resolveTelegramTarget`, `provider-composition.ts`, the opt-in surfaces, the webhook processor and the
  `telegram_mirror` flag are left unedited; `channels-determinism` stays green. The ONLY change to `packages/channels` is the client's
  timeout + `retryAfter` + `signal` (FS7). *Proof:* AC11.
- **I9 — A post is never on the member's critical path.** The jobs are enqueued post-commit, best-effort (a failure alarms, never fails
  the cycle-open mint or the sweep); the per-member fan-out is unchanged in order and content. A dropped `pool_open` enqueue is healed by
  the EXISTING hourly `runContributionNotifyRecoverySweep` (`contribution-notify-triggers.ts:1296`, which already scans every live alert
  and on which `cycle-open-alert.ts:164` relies): for a live alert with no `pool_open` post row per pool, it re-sends the per-cycle job
  through the same optional seam (AC5 (iv)). (The cycle-open sweep re-enqueues only un-minted cycles — `cycle-open-alert.ts:7-18`.) ACCEPTED
  costs, recorded in the decision: (1) a missed day-14 sweep (late, or the cron fails) loses that cycle's last-day post — day 15+ posts
  nothing (T3); (2) a finished row is frozen, so a `skipped` (switch off, no chat id, no bot) or final `refused` row blocks its subject for
  good, even after the cause is fixed; (3) a post found stale is `skipped:stale`, ⛔ posted late (AC5 (iii)). The admin "Posts" list shows
  every state (AC2). *Proof:* AC5.

## 📜 Policy meaning (AI-10-1)

**5.14 introduces no predicate that gates a member's access to a benefit.** The channels are mirrors a member is asked to join (G1,
G4). Whether a member joined is unknown to the Trust (F13) and is read by nothing. A missed post changes nothing a member is owed or
counted for. R7's missed-cycle counting and R8's ninety-percent rule read contribution facts, never channel membership. The one
predicate it does introduce, the home card's display condition, gates only whether a card is SHOWN. In the member's terms: *"If your
Pariwar has Trust channels, the app shows you once where to follow them; following one or not changes nothing you are owed, and every
notice is still in the app."* **Niyamavali check, done 2026-10-29, with this result:** a case-insensitive search of
`packages/domain/seed/niyamavali-v1-clauses.sql` for *telegram | whatsapp | channel | notif | missed information* finds no clause ("channel"
hits two SQL comments, `:120` and `:251` — no clause text). R10(B)
lives in the PRD's FR-94 T&C phrasing, not the seed. It makes missed information the member's responsibility, with the app as the
official channel. The channels add a route and remove none, so the sentence is CONSISTENT with R10(B) as written. (The Niyamavali is a
rulebook, not a ratified spec — [[feedback_niyamavali_rulebook_not_spec]].) ⚠ Re-run the search at Task 0.1; if a clause has appeared,
re-check this note.

## ⭐ FOUND FACTS (traced at `282bdd33`; traced to code, not read from prose — re-verify at Task 0.1)

**Telegram today: a per-member mirror, never a channel**
- **F1 — the client is real and per Pariwar.** `packages/channels/src/providers/telegram-app.ts:149` POSTs
  `https://api.telegram.org/bot<token>/sendMessage`; the body is `{ chat_id, text }` only (`:97-100` — plain text, no `parse_mode`);
  the client cache is keyed per Pariwar (`messagingFor(pariwarId, config)`, `:56`, `:139-203`) and `createTelegramAppCache` is exported
  from `@twt/channels`, so the poster can build a handle from a resolved token without the composition. `messagingFor` IGNORES the config
  after its first call (`:143-146`) ⇒ a rotated token is picked up only on restart (`:20-23`) — reading the secret name "at run time"
  does not change that. ⚠ **No request timeout**, and the seams cannot carry one: `FetchInit` is `{ method, headers, body }` (`:61-65` — no
  `signal`); `TelegramSendError` carries only `telegramCode` and `httpStatus` (`:75-87`) and the error extraction (`:103-116`) DISCARDS
  `parameters.retry_after` ⇒ FS7. Copy WhatsApp's injectable `timeoutSignal` seam and its bounds check (`whatsapp-app.ts:280-299`); MSG91
  uses `SMS_GATEWAY_TIMEOUT_MS = 9_000` (`sms-app.ts:189`). An abort is already caught at `:159` as httpStatus 0 ⇒ class `api_unavailable`
  (`telegram-errors.ts` `classForCode`) ⇒ `telegram-errors.ts` needs NO edit. A 2xx whose body read aborts or lacks `message_id` throws
  `TelegramSendError(…, null, 200)` (`:166-195`) — it MAY have posted (FS7). A channel `chat_id` (`@username` or the `-100…` numeric id)
  fits the existing `TelegramTextMessage { chatId, text }` shape unchanged.
- **F2 — the last day can never reach Telegram today.** `TELEGRAM_ELIGIBLE_CATEGORIES` = `alert_published`, `module_new`,
  `niyamavali_amended` (`packages/channels/src/dispatch.ts:48-52`); the day 5 / 10 / 13 / 14 reminders are category `deadline_reminder`
  — excluded. ⇒ the channel poster does NOT go through `dispatch` (I8); it calls the messaging handle directly.
- **F3 — config and token are per Pariwar.** `pariwar_telegram_config` (migration `0045`; schema
  `packages/domain/src/schema/pariwar_telegram_config.ts:28-57`): PK `pariwar_id`; `enabled` (default false — the per-member mirror's
  switch), `bot_username`, `bot_token_secret_name`, `webhook_secret_token_secret_name`; grants `twt_app` S/I/U/D with ONE `select` policy
  and ONE `FOR ALL` write policy (`0045:32,36-37`). Jobs read the row with `channelConfig.getTelegramConfig`
  (`packages/domain/src/channel-config/telegram-config.ts:37`). Secrets are stored as NAMES; jobs resolve them with `resolveChannelSecret`
  (`apps/jobs/src/scheduler/contribution-providers.ts:80-88` — it THROWS on not-found AND on an outage alike), already imported in
  `apps/jobs/src/boot.ts:124`. The composition (`packages/channels/src/composition/provider-composition.ts:235-265`, jobs wiring `:525-540`)
  returns null ⇒ FIXTURE when the row is missing, `enabled` false, or the secret name blank.
- **F4 — the webhook processor is safe for a channel bot (traced at the pin).** `apps/jobs/src/tg-webhook-processor.ts` parses only
  `message` and `my_chat_member` (`:167-233`). Making the bot a channel admin sends `new_chat_member.status = 'administrator'`, ⛔ in
  `{kicked, left}` (`:40`, `:217`) ⇒ no effect; removing it carries `chat.id = -100…`, and `listActiveOptInsByChatId` matches only members'
  private-chat ids (positive user ids) ⇒ no effect; channel posts arrive as `channel_post`, never parsed. ⇒ ⛔ an edit; ONE regression test
  (a channel `my_chat_member` left / kicked with a `-100…` id flips no opt-in). ⚠ Side effect: no `allowed_updates` is set anywhere, so a
  human admin's `channel_post` update (which may carry a family's name) is persisted raw by the Telegram webhook ingress
  (`apps/api/src/modules/channel-webhooks/handlers.ts:170`; `:119` is the WhatsApp persist) ⇒ FS13 leg (a) sets `allowed_updates: ["message","my_chat_member"]` when
  the webhook is registered.
- **F5 — the fixture lies by design.** `packages/channels/src/providers/fixture-telegram.ts:28-36` returns `status: 'accepted'`,
  `providerMessageId: 'fixture-telegram'` with nothing sent ⇒ I3: the poster builds its own handle from a resolved secret or does not post.
- **F6 — the mirror's flag is not read anywhere.** `telegram_mirror` is registered (`packages/domain/src/feature-flags/registry.ts:290-300`)
  and *"NOT READ HERE"* (`apps/jobs/src/scheduler/contribution-notify.ts:685-692`); `-070` keeps it *"declared, not production-active"*
  (G7). This story neither reads nor activates it (unless FS3 (d)).

**The two notices**
- **F7 — a pool opening.** `runCycleOpenAlert` (`apps/jobs/src/scheduler/cycle-open-alert.ts:126-187`, queue `cycle.open.alert`) mints
  ONE alert per cycle per Pariwar (`deriveAlertId(cycleId)`, `packages/domain/src/alert/id.ts:46`) and, POST-COMMIT, best-effort,
  enqueues the contribution-notify fan-out (`:143-167` — fired on the idempotent no-op path too); at the hook (`:149`) `pariwarId`,
  `cycleId` and `result.alertId` are in scope. The `alert.published` event carries no name, pool or date
  (`packages/domain/src/alert/project.ts:362-372`). Pools of a cycle: `poolDomain.listCycleBindingCandidates(db, pariwarId,
  cycleFreezeCommitId)` (`contribution-notify-triggers.ts:1437-1444`). The pool label: `poolName ?? poolLetterCode` (`:298-300`). The
  family: the identity wiring at `contribution-notify-triggers.ts:903-958` — the mode read with its own try/catch (`:933-943`,
  `kycDomain.resolvePublicNamePresentationMode`), then `notifications.resolvePoolIdentity(db, deps.encryption, …)` (`:945-957`); KMS deps
  `buildJobsEncryptionDeps` (`apps/jobs/src/deps.ts:37`), instantiated as `jobsEncryption` (`apps/jobs/src/boot.ts:333`, passed at `:651`).
  `resolvePoolIdentity` (`packages/domain/src/notifications/pool-identity.ts:201`) returns `null` on a decrypt failure or an unresolvable
  name (`:216-229`) — but its DB reads (`:209-211`) are unwrapped, so it CAN throw ⇒ wrap the call; a throw is `refused:identity_unavailable`
  too. It needs `poolCount` (= the cycle's pool count) and ALWAYS decrypts. The no-decrypt label: `notifications.resolveCuratedPoolName(db,
  pariwarId, poolCount, poolIndex)` (`pool-identity.ts:272`, its own try/catch) ?? `poolDomain.poolLetterCode(poolIndex)`
  (`packages/domain/src/pool/naming.ts:102`). One alert per cycle (UNIQUE `alerts.cycle_id`) and pools belong to one cycle ⇒ the
  `subject_id`s (pool id / alert id) are sound.
- **F8 — the last day.** `runDeadlineReminderSweep` (`contribution-notify-triggers.ts:1398-1505`; cron `'30 9 * * *'` IST, `:95`) scans
  live alerts across Pariwars; `cycleDay = cycleDayFromCommittedAt(committedAt, now)` (`:1430`); non-send days skipped
  (`isDeadlineReminderSendDay`, days `[5, 10, 13, 14]` — `packages/contracts/src/alerts/contribution-loop-templates.ts:135`);
  `deadlineAt = committedAt + CYCLE_WINDOW_DAYS days` (`:1435`; `CYCLE_WINDOW_DAYS` in `packages/contracts/src/alerts/contribution-loop-templates.ts:46`);
  then `listCycleBindingCandidates` (`:1437-1444`), whose throw is caught at `:1484`. The day-14 member reminder shows `"Today, {date}"`
  (`contribution.json:98`) with `date: operationalDate(input.deadlineAt)` (`operationalDate` at `:320-326` — MODULE-PRIVATE, not exported;
  used by `buildDeadlineReminderAlert`). ⇒ the last-day hook goes AFTER `:1435` and BEFORE `:1437`, so a pool-read throw cannot suppress
  it. ⚠ The existing day-14 test asserts `send.mock.calls[0]` is the pool batch (`apps/jobs/tests/contribution-notify-triggers.test.ts:651-670`)
  ⇒ the hook goes through an OPTIONAL deps seam, ⛔ the same `boss.send` (AC5 (ii)). The hourly `runContributionNotifyRecoverySweep`
  (`:1296`) already scans every live alert (I9's heal point).
- **F9 — the existing member copy speaks to ONE member** (`"Your pool is open — {pool}"`, `contribution.json:92-93`) and the CHANNEL DRAFT
  rows were *"written as texts"* — "your pool [pool]" — so on a channel every member reads they would tell members of other pools "your
  pool" ⇒ FS8 adapts the words.
- **F19 — `singletonKey` dedupes nothing here** (`contribution-notify-triggers.ts:739-741`, `:1476-1477`, review R4-P5) ⇒ I2. pg-boss
  v12 needs `boss.createQueue(QUEUE_NAMES.X)` before send / work (`boot.ts:394`; `cycle-open-alert.ts:264`); `retryDelay` is fixed at
  send time ⇒ a `retry_after` delay is a re-send with `startAfter` (precedent: `apps/jobs/src/claim-peer-mesh.ts:404`). A send to a queue
  not yet created THROWS in v12 ⇒ create the new queue BEFORE `registerContributionNotifyWorkers` / `registerCycleOpenAlertWorkers`.
  `pariwarId` rides the JobEnvelope, not the payload.

**Where the ask can live (mobile)**
- **F10 — home.** `apps/mobile/app/(tabs)/index.tsx:54-115`: `ActiveContributionCard` first (8.2 AC), … `<HomePromptCards />` (`:84`)
  … `<LanguageSettingsEntry />` (`:105`), `<NotificationSettingsEntry />` (`:107`), `<TelegramNotificationSettingsEntry />` (`:109`) …
  Source pins: `apps/mobile/tests/unit/language-source-pins.test.ts:82-85` (Language directly above Notification), `:88-100` (no `[t]`
  dep in `(tabs)/index.tsx`); `peer-request.test.ts:192-196`. `HomePromptCards` shows ONE card chosen by `chooseHomeCard`
  (`apps/mobile/lib/home-cards.ts:44`; `HomeCardKind` at `:13`) from the known-people prompts read (`HomePromptCards.tsx:43,51`); the frame
  is `components/home/HomeReminderCard.tsx:12-58` — props `title`, `body?`, `children` (the actions — two link buttons fit here),
  `dismissLabel`, `onDismiss`, `dismissDisabled`; it renders NO label of its own (`:16-27`, `:50-55`) and callers pass namespace keys
  (`known_people.card.dismiss`, `workplace.card.dismiss`). Its header (`:1-3`) says every card is *"dismissed for 30 days"* ⇒ add one
  comment line there naming this card's once-for-good exception (FS10). The persisted query cache: successful queries are written to MMKV
  and kept 7 days (`components/Provider.tsx:3,16`; `lib/query-client.ts:18`), and `signOut` clears only NAMED caches
  (`lib/session-context.tsx:162-178` — no `queryClient.clear()`); the member-scoped key shape is
  `components/known-people/known-people-cache.ts`. The 6.36c dismissal store
  (`apps/mobile/lib/home-card-dismissals.ts`) PRUNES every entry older than 30 days from its shared map on each `dismissCard`
  (`:68-77`) ⇒ a "for good" dismissal cannot live in it (FS10); sign-out clearing is wired in `apps/mobile/lib/session-context.tsx:40,171`.
- **F11 — links.** The house shape: `try { await Linking.openURL(url) } catch { … }` with `accessibilityRole="link"`
  (`components/sahyog-vivran/SahyogVivranEntry.tsx:116-141`; its comment: `openURL` REJECTS — do not copy the bare-`void` precedent at
  `(auth)/terminated.tsx:94`). A Tamagui link button needs `accessible={true}` with its role and label, or *"the three props below are ⛔
  NEVER announced"* (`SahyogVivranEntry.tsx:113-122`). `https://` links need no `LSApplicationQueriesSchemes` / `<queries>` (`app.config.ts` declares none) — never
  `tg://` / `whatsapp://`. ⚠ The Telegram settings screen re-fetches in an endless loop (`app/(settings)/telegram-notifications.tsx:36-50`);
  deferred-work's trigger: *"the next edit of `telegram-notifications.tsx`, or the first production Telegram opt-in"*. This story does NOT
  edit that file (AC11), and FS13 leg (a) needs only the bot row's secret — ⛔ the mirror's `enabled` — so it does not open member opt-in;
  if a Pariwar ALSO turns the per-member mirror on, the loop item's second trigger is met (record it then — ⛔ this story's).
- **F12 — WhatsApp Channels have no posting API.** Meta's Business Platform changelog (latest entry 2026-05-12) has no Channels entry;
  only unofficial gateways that drive a linked WhatsApp session exist, and WhatsApp's Terms forbid *"bulk messaging, auto-messaging"*
  and access *"through automated or other means"* — a ban risk for the admin's account. ⇒ the WhatsApp Channel is posted BY HAND
  (FS4). Invite links look like `https://whatsapp.com/channel/<id>` (observed form, also seen with `www.`; Meta publishes no spec).
- **F13 — the Trust cannot see who joined.** WhatsApp: *"Following a Channel won't reveal your phone number to the Admin"* — EXCEPT a
  follower the admin has saved as a contact (Channels Privacy Policy); Telegram: a bot cannot list a channel's subscribers. ⇒ nothing
  in this story records or infers membership; no member-facing string claims the Trust "cannot see you" (FS14).

**Patterns to copy**
- **F14 — the Pariwar-scoped admin config.** `GET`/`PUT /api/v1/p/:pariwarId/admin/channel-config/{whatsapp,telegram}`
  (`apps/api/src/modules/channel-config/routes.ts:33-87`), gated by `pariwar.configure_channels` (`handlers.ts:31-32`; held by
  `pariwar_admin` — `roles.ts:354`); the PUT writes on `request.scopeTx.tx` as `twt_app` (`handlers.ts:247-252`) with audit actions named
  `pariwar.<x>_update` (`:96,184,259`), already under `withCompensatingAudit`. ⚠ ADR-0030 (ratified, `-065`) is ⛔ edited: its
  `:67-80` is Context history (modules that shipped WITHOUT compensation), not a list to append to; its §4 gate (`:238-264`) scans the
  folders in `CHANNEL_ROOTS` (`scripts/access-wrapper-invariants/check.ts:69-77` — `channel-config`, `wa-opt-in`, `telegram-opt-in`, …), which
  does NOT include a new `apps/api/src/modules/announcement-channels` ⇒ add it there (Task 5), or the new PUT is never checked. The GETs
  return zero-config defaults when no row exists (⛔ a 404). Module registration: `apps/api/src/server.ts` (`registerChannelConfigModule`
  `:44` / `:250`; member modules `:298` / `:303`). Admin form `apps/admin/src/modules/channel-config/TelegramConfigForm.tsx:1-82`, composed
  in `ChannelConfigPage.tsx:33-60`; hooks `apps/admin/src/api/hooks.ts:1470-1475`, which call `apps/admin/src/api/client.ts`
  (`getTelegramConfig` / `putTelegramConfig` at `:955,960` — the admin client, ⛔ `packages/api-client`). **The admin decrypt precedent:**
  the deceased's name via `apps/api/src/modules/member-pool/pool-identity.ts` (`resolvePoolNamePresentationModeForRequest` `:63`;
  `resolvePoolIdentity(deps, tx, request, pariwarId, mode, input)` `:98`, over `deps.encryption` — `apps/api/src/context.ts:475-478,518`);
  that file's header (`:87`) says *"member-session layer (D11 — NOT the admin path)"* ⇒ the posts list crosses D11 consciously, recorded in
  the decision. The per-row degrade + audited-read shape: `apps/api/src/modules/reconciliation-review/handlers.ts:95-102` (`safeDecrypt` —
  per-field null, never a throw), `:105` (*"Audited read (the 6.10 audited-read precedent)"*). Forced pagination:
  `apps/api/tests/integration/forced-pagination.spec.ts` flags a GET whose body is a top-level array or `{ items[] }` without a bounded
  `limit`; a NAMED array (`{ posts }`) is the accepted shape (its `:36-43` note) with a `clampLimit`ed domain read
  (`packages/domain/src/pagination.ts`).
- **F15 — the at-most-once send record.** `alert_sms_sends` (migration `0184`): UNIQUE `(alert_id, member_id, occasion)`, a `claim_token`
  (`:45`, `:59`), CHECK-pinned enums, a finished row frozen by trigger; grants `twt_app` SELECT + COLUMN-LIMITED INSERT / UPDATE
  (`:71-77`); per-command tenant policies `<table>_tenant_isolation_{select,insert,update}` with
  `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`; an FK `alert_id → alerts`; timestamps defaulting to
  `clock_timestamp()`. Its LIFECYCLE (5.11b — copy it, ⛔ reinvent it): a 429 / rate-limited answer ⇒ **`deferred`** (`settle()`,
  `apps/jobs/src/scheduler/alert-sms-send.ts:252-266`); re-claim = compare-and-set `deferred → attempting` under `FOR UPDATE` with a FRESH
  `claim_token` (`beginAlertSmsSend`, `packages/domain/src/sms-delivery/alert-sms-sends.ts:146-187`); a lease `ALERT_SMS_SEND_LEASE_MS` =
  2 min (`:35`) past which a crash-left `attempting` row is final; `ALERT_SMS_DEFERRED_MAX_AGE_MS` = 30 min (`:49`) past which a `deferred`
  row is given up; an accept with no id is recorded as unknown (`alert-sms-send.ts:281-287`); the trigger admits only `attempting →
  deferred → attempting → final`, `attempting → final`, `deferred → error`, stale-lease `attempting → error` (`0184:17-27,83-103`). The
  claim / finalise SQL lives in a DOMAIN accessor module (`alert-sms-sends.ts`), and alarms are deduped in-process by `createTtlMemo`
  (`alert-sms-send.ts:191`). Requires `member_id` ⇒ cannot hold a channel post ⇒ a NEW table (FS2). Its RLS / CHECK-lockstep test:
  `packages/domain/tests/integration/rls/alert-sms-sends-policy-regression.spec.ts` (`checkValues(client, '<check_name>')` against the
  exported constants, `:264`, `:285`).
- **F16 — the member read precedent.** `GET /api/v1/member/wa-opt-in` → `WaOptInStatusResponse` (`packages/contracts/src/wa-opt-in/opt-in.ts:73-83`);
  the member's Pariwar is `request.requestContext.pariwarId`, set by `requireMemberSession` (`apps/api/src/modules/wa-opt-in/handlers.ts:9,
  105-112`), and the read opens `openScopeTx(deps, pariwarIdStr)` (`:156`; `../multi-tenant/scope-tx.js`). Client: a method in
  `createMemberAuthClient` (`packages/api-client/src/index.ts:392`; e.g. `getTelegramOptInStatus` `:1083`); `apps/mobile/lib/member-api.ts`
  is only the client INSTANCE (`:15`). OpenAPI is NOT automatic: a new
  module is added to `packages/contracts/scripts/emit-openapi.ts` (dynamic import `:158` / `:180`, components, `registry.registerPath`) and
  the barrel `packages/contracts/src/index.ts:94-107`; then `pnpm contracts:emit-openapi` and `pnpm contracts:check-openapi-determinism`
  (never hand-edit `openapi/v1.yaml`).
- **F17 — copy.** `packages/i18n/locales/{en,hi}/common.json` (flat dotted keys; families `waNotifications.*`, `telegramNotifications.*`);
  `t()` throws on unknown keys / missing params; neither `@twt/contracts` nor `@twt/domain` depends on `@twt/i18n` (jobs import `t` —
  `contribution-notify-triggers.ts:73`) ⇒ a shared builder takes `t` as a PARAMETER (no precedent in contracts / domain — new, but sound:
  `@twt/i18n` has no `@twt/*` deps, so no cycle). It declares a LOCAL structural type `(key: string, params?: Record<string, string |
  number>, options?: { locale?: 'hi' | 'en'; namespace?: string }) => string` matching `BoundTranslate` (`packages/i18n/src/resolver.ts:75-79`)
  without importing it; `t()`'s default locale is `hi`. Contracts tests that import the real `t` need `"@twt/i18n": "workspace:*"` in
  `packages/contracts/package.json` devDependencies (+ lockfile) — today it has none (`:23-35`). `$comment` keys take the form
  `"$comment.<family>"` in BOTH en and hi (`contribution.json:2`; parity reads every string key; microcopy tests skip `$comment*`). The
  Hindi register: `hi/common.json` writes व्हाट्सएप (46×) and टेलीग्राम (15×) in Devanagari (Latin "WhatsApp" once, `language.intro`), and
  the `telegramNotifications.*` family says सूचनाएँ (`:383-400`). Parity by `pnpm i18n:check`; tone by
  `pnpm microcopy:check` (`scripts/microcopy/check.ts`, `microcopy.yaml`); the pin pattern `apps/mobile/tests/unit/wa-signup-copy-keys.test.ts`;
  the `useT()` fresh-closure trap (`packages/i18n/src/react.ts:57-60`).
- **F18 — friction.** `friction-budget.md` (rows `| payer | protects | event_type |`, dispositions `**Story <id> disposition (...)**`);
  the gate's AC-4 (`scripts/friction-budget/lib.ts:453`, `:489-610`) reads COMMITTED history — commit first, then `pnpm friction:check`.
  Precedents: 6.36c home cards (optional, "Not now"), 5.5 Telegram opt-in (optional), 5.10 signup step (forced).

## ⚖️ Build decisions (⭐ = recommended) — PROPOSED for BigDev at Task 0.2

Each is the author's (§0, G1) unless it says PQ. Answer by number + letter; a bare letter means the option's outcome AND its cost line.

- **FS1 — whose channels (G6).** ⭐ **(a) per Pariwar:** one config row per Pariwar; for v1, the one Pariwar's row IS "the Trust's"
  channels. *Cost (a):* a second Pariwar needs its own two channels (under FR-61 it is a separate app and brand anyway); recorded as the
  author's reading of "the Trust's". **(b) one Trust-wide row** (the `-415` FS17 global-singleton shape). *Cost (b):* with a second
  Pariwar, Pariwar A's deceased family is posted to Pariwar B's members — the cross-tenant disclosure architecture calls P0 — and the
  Telegram bot (a per-Pariwar credential) has no Trust-wide equivalent: a NEW global bot secret.
- **FS2 — the record of posts.** ⭐ **(a) a new table `announcement_channel_posts`**: `(post_id, pariwar_id, occasion ∈ {pool_open,
  last_day}, subject_id, alert_id (FK → `alerts`), pool_label text NULL, last_date text NULL (DD-MM-YYYY), state ∈ {attempting, deferred,
  posted, refused, unknown, skipped}, detail, claim_token, telegram_message_id text NULL, attempt_count, created_at, updated_at (both
  DEFAULT `clock_timestamp()`))`, UNIQUE `(pariwar_id, occasion, subject_id)`, CHECKs on every enum, on `detail`'s shape, and `state <>
  'posted' OR telegram_message_id IS NOT NULL`; the 0184 transition trigger (F15) adapted: `attempting → deferred → attempting → final`,
  `attempting → final`, `deferred → refused` (given up), stale-lease `attempting → unknown`; any other update of a finished row refused;
  FORCE RLS, `twt_app` SELECT + column-limited INSERT / UPDATE, per-command tenant policies — the `0184` shape. ⛔ No family name, ⛔ no
  post text (FS15). *Cost (a):* one migration (`0190` — NUMBERS). **(b) no record — rely on queue keys.** *Cost (b):* `singletonKey` dedupes nothing (F19) ⇒
  duplicate posts; nothing answers "was this pool's opening posted?".
- **FS3 — the switch and the config.** ⭐ **(a) a new per-Pariwar table `pariwar_announcement_channels`**: `pariwar_id` PK, `enabled
  boolean NOT NULL DEFAULT false` ("channels live" — Telegram posting ON, the links SHOWN to members, the WhatsApp words offered to the
  admin), `telegram_channel_chat_id text NULL` (CHECK `^@[A-Za-z][A-Za-z0-9_]{4,31}$` or `^-100[0-9]{1,16}$`), `telegram_invite_url text
  NULL` (CHECK `^https://t\.me/`), `whatsapp_channel_url text NULL` (CHECK `^https://(www\.)?whatsapp\.com/channel/`), a pairing CHECK
  `(telegram_invite_url IS NULL) = (telegram_channel_chat_id IS NULL)` (a Telegram link is never shown with nowhere to post — I7),
  `updated_by_actor`, `updated_at`; grants `twt_app` SELECT / INSERT / UPDATE (⛔ DELETE — a deliberate narrowing of `0045`'s S/I/U/D: the
  row is switched off, never deleted) + per-command tenant policies (the `0184` form, not `0045`'s `FOR ALL`); written on the request's
  scope tx under
  `pariwar.configure_channels` with `withCompensatingAudit` (action `pariwar.announcement_channels_update`; the module added to
  `CHANNEL_ROOTS` — F14; ⛔ an ADR-0030 edit). The poster uses the Pariwar's EXISTING bot credential (`pariwar_telegram_config.bot_token_secret_name`) — the bot is made an admin
  of the channel with "Post messages" — and does NOT require the per-member mirror's `enabled` (F3). *Cost (a):* posting needs the bot row
  with a secret name even if the mirror stays off; one switch covers both channels (an admin cannot show WhatsApp while Telegram posting is
  off — they leave the Telegram chat id AND invite link blank instead, and then no Telegram link is shown); a `pariwar_admin` can switch on
  posts that may name the deceased (G7 — BigDev may ask for `super_admin`-only). **(b) add the columns to `pariwar_telegram_config`.** *Cost (b):* a WhatsApp link
  in a Telegram table; the 5.5 PUT DTO, form and fixtures change shape. **(c) a second bot token for the channel.** *Cost (c):* a second
  secret per Pariwar for no gain. **(d) gate posting on the `telegram_mirror` feature flag as well** (G7's other reading). *Cost (d):* this
  story becomes the flag's first consumer and must meet `-070`'s condition (the flag store's production-activation steps) before go-live.
- **FS4 — the WhatsApp Channel (F12).** ⭐ **(a) by hand, with ready words:** the admin "Posts" list shows the Pariwar's pool openings and
  last days of the last 15 days, each with its Telegram state and — only while the switch is ON — its exact bilingual words (rebuilt at
  read — FS15) and a Copy button (switch off ⇒ states only); ⛔ any automation, ⛔ any unofficial gateway. *Cost (a):* whether a WhatsApp post was made is not recorded; the WhatsApp Channel can lag the Telegram one.
  **(b) (a) plus a "Posted to WhatsApp" mark per post** (audited). *Cost (b):* a second state machine and an admin chore; the mark is
  self-reported. **(c) nothing — admins compose posts themselves.** *Cost (c):* the words drift from BigDev's, and the `-180` / PQ1 name
  rule is enforced by no one.
- **FS5 — post granularity (F7, F8).** ⭐ **(a) one post per POOL when a cycle opens (each names its pool and family), and ONE post per
  CYCLE on its last day (no pool, no name — every pool of a cycle shares the window). The cycle-open job FANS OUT one child job per pool
  (the contribution-notify parent → child shape), the i-th with `startAfter = i × 3 s` — pacing by the queue, ⛔ an in-process sleep — so
  each pool's claim, 429 and retry are independent.** *Cost (a):* N opening posts in a burst (Telegram throttles ~20 / minute in a group —
  ≥ 3 s apart, 429 honoured); the last-day post names no pool and decrypts nothing. **(b) one combined opening
  post.** *Cost (b):* Telegram's 4096-character cap after ~12 bilingual pools and a split rule; one failure loses every family's post.
  **(c) per pool for both.** *Cost (c):* N identical "today is the last day" posts on the same date.
- **FS6 — the family's name (G2, G3, PQ1).** ⭐ **(a) build BOTH word variants and select by ONE exported constant
  `ANNOUNCEMENT_POST_NAME_MODE: 'member_facing' | 'none'`, set to `'member_facing'` (per `-390` / `-180` as written) with a test pinning
  it to the decision; PQ1's answer can flip it in a one-line change + its tests (B ⇒ `'none'` until the post-death clause is pinned —
  today that is every member; a later "per member's own Terms" wiring is a deferred item, ⛔ built here); go-live leg (d) is PQ1's
  answer. In `'none'` mode neither the job nor the posts list reads the mode or decrypts anything (I5).** *Cost (a):* if PQ1 rules A with the PUBLIC form (G3 sub-question), a third mode wires the public resolver — small, later.
  Nothing is posted before go-live anyway. **(b) build only the named variant.** *Cost (b):* a B ruling becomes a builder change. **(c)
  build only the unnamed variant now.** *Cost (c):* narrows `-180` without a ruling — the Panel's.
- **FS7 — sending (F1, F5, F19).** ⭐ **(a) the poster resolves the Pariwar's bot secret itself and calls the messaging handle; the
  Telegram client gains: an injectable `timeoutMs` (default 9 000 — the MSG91 value) via a `signal` on `FetchInit`; `retryAfter` on
  `TelegramSendError` (from `parameters.retry_after`); a timeout keeps today's class `api_unavailable` on the mirror path (⛔ new
  `TelegramErrorClass` member — the mirror's tests enumerate the union; `telegram-errors.ts` unedited — F1). Outcomes (the 0184 lifecycle
  — F15, I2): `ok: true` with a `message_id` ⇒ `posted`; `telegramCode === 429` ⇒ `deferred` (definitely not posted) and the job RE-SENDS
  itself with `startAfter = retry_after` s, the re-claim rotating the token; `telegramCode !== null` with HTTP 4xx ⇒
  `refused:tg_<error_code>` + ONE alarm; EVERYTHING ELSE — status 0 (timeout / network), 5xx, a 2xx with no `message_id`, a null code ⇒
  `unknown` (it may have posted) + ONE alarm, ⛔ retried. A crash-left `attempting` row past the LEASE (≈ 2 min, judged on
  `clock_timestamp()`; the timeout is 9 s) ⇒ `unknown`, ⛔ re-posted. A `deferred` row past its max age (30 min; for `last_day` also the
  end of the deadline's IST day) ⇒ final `refused:tg_429_expired`. Alarms deduped per Pariwar + class by `createTtlMemo` (in-process,
  5-minute window — the 5.11b value; state it in the decision).** Branch on `error_code` / `retry_after`, ⛔ on `description` (Telegram:
  *"subject to change"*). Never hold a transaction or a pool client across the call (T8). *Cost (a):* an ambiguous timeout may leave one post missing rather than doubled; the mirror's
  hung call now ends `rejected` after 9 s instead of hanging (a fix — recorded). **(b) retry on timeout.** *Cost (b):* a possible duplicate
  post. **(c) no client change.** *Cost (c):* no timeout ([[project_jobs_pool_two_connection_starvation]]) and 429 handling impossible.
- **FS8 — the words (F9).** ⭐ **(a) BigDev's CHANNEL DRAFT words, adapted from "your pool" to a channel every member reads, ⛔ the
  "TWT:" prefix (Story 5.11 FS16 (b): the sender carries the Trust's name — here the channel's name does), one BILINGUAL post (Hindi, a
  blank line, English); the Hindi needs BigDev's review (roster leg (c)).** Dropping "TWT:" is the AUTHOR'S extension of BigDev's FS16 (b)
  reasoning — 5.11 itself kept "TWT:" (rulings table). *Cost (a):* BigDev's reviewed words change (*"your pool"* → *"if you are assigned
  to this pool"*), the "TWT:" prefix goes, and the last-day draft's "for pool {pool}" goes (FS5). **(b) the drafts verbatim.** *Cost (b):* members of other pools are told "your pool is open".
  **(c) two posts per notice (one per language).** *Cost (c):* doubles the burst and the noise.
- **FS9 — where the ask lives (G9, F10).** ⭐ **(a) a home card (the `HomeReminderCard` frame) shown while the channels are on, at least
  one link exists, and the member has not dismissed it on this device; plus a settings entry "Trust announcement channels", shown while
  at least one link exists, after the Telegram entry on home, opening a screen with the same words.** *Cost (a):* a card outside
  `chooseHomeCard` (FS11); a reinstall, a new device, or a sign-out shows the card once more. **(b) the settings entry only.** *Cost (b):* barely an "ask" — `-390` says members ARE asked.
  **(c) a signup wizard step.** *Cost (c):* a forced screen for every new member (5.10's precedent — a forced friction row, the step-label
  jump) for a mirror R10(B) calls *"not official"*. **(d) a 10.9 banner.** *Cost (d):* a banner has no link field
  (`MemberBannerResponse`, `packages/contracts/src/banners/dto.ts:200-214`).
- **FS10 — how often (G9).** ⭐ **(a) ONCE per device: "Not now", or a successful open of either link, hides the card for good on this
  device for that account (a NEW sibling MMKV module, key `announcement-channels.card-dismissed.v1.<memberId>` — per member so that a
  second account on a shared phone is asked once too; no expiry; cleared on sign-out via `session-context.tsx` for the same privacy /
  cleanup reason as `clearHomeCardDismissals` at `:171`); a failed open shows `link_error` inline and keeps the card; the settings entry
  stays while a link exists.** *Cost (a):* a member who
  said "Not now" is not re-asked unless they reinstall / change device / sign out. **(b) the 6.36c 30-day re-show.** *Cost (b):* a recurring
  prompt for a mirror — the "nagging" the UX spec rules out. **(c) server-recorded once per member.** *Cost (c):* a new member-preference
  table for a mirror; it records a choice about a channel the Trust cannot see (F13).
- **FS11 — the card's data source.** ⭐ **(a) a separate `<AnnouncementChannelsCard />` directly AFTER `<HomePromptCards />`, fed by its
  own query on the member read, keyed `['announcement-channels', 'v1', pariwarId, memberId]` (the `known-people-cache.ts` shape) and
  cleared in `signOut` beside `clearHomeCardDismissals` — the query cache is persisted to MMKV for 7 days (F10), so an unkeyed / uncleared
  query would show one account's links to the next; it renders nothing while loading, on error, or when no link is returned.** *Cost (a):* two reminder cards
  can show at once — bounded: this one shows once. **(b) a new `HomeCardKind` inside `chooseHomeCard`.** *Cost (b):* a second data source
  in a pure chooser; this card competes with the known-people prompts and may never show.
- **FS12 — the member read.** ⭐ **(a) `GET /api/v1/member/announcement-channels` → `{ whatsappChannelUrl: string | null,
  telegramChannelUrl: string | null }` (`.strict()`); BOTH null while `enabled` is false (I1 — the app never says posts are made before
  they are); `telegramChannelUrl` non-null only when `telegram_invite_url` AND `telegram_channel_chat_id` are set AND the Pariwar's
  `pariwar_telegram_config.bot_token_secret_name` is non-blank (I7 — never a link to a channel nothing can post to); member auth; the
  member's own Pariwar from the session (`requestContext.pariwarId` — F16).** *Cost (a):* one route, one contract, an OpenAPI diff.
  **(b) `EXPO_PUBLIC_*` build-time env.** *Cost (b):* a link change needs a release; not per Pariwar; cannot follow the switch.
- **FS13 — the go-live row (next free Row, ⭐ key `trust-announcement-channels-live`).** Legs: **(a)** the Trust creates the two channels
  (the WhatsApp Channel on the Trust's own WhatsApp app account — a Cloud-API-only number has no app client; the Telegram channel with the
  Pariwar's bot as an admin with "Post messages"), enters the links and chat id, and sets the bot webhook's `allowed_updates` to
  `["message","my_chat_member"]` (F4); **(b)** a real post from staging to a private test channel (ids only); **(c)** BigDev's review of the
  Hindi of every string (posts + app) — recorded, ⛔ assumed; **(d)** PQ1 answered and FS6's constant set to match; **(e)** counsel asked
  about naming a deceased member's family on a public channel (or *"Counsel has not been asked"* recorded as an accepted cost — ⛔ an
  answer); **(f)** LAST: a Pariwar admin switches the channels on. ⛔ Never a merge fence ([[project_not_in_production_merge_is_not_golive]]).
- **FS14 — what the app says about privacy.** ⭐ **(a) nothing about who can see a follower** (F13 — WhatsApp's contact exception and
  Telegram's admin view make any "the Trust cannot see you" untrue). *Cost (a):* a privacy-minded member is not told what the channel shows.
  **(b) a per-platform accurate line.** *Cost (b):* long, platform-specific, and it can go stale when Meta changes it.
- **FS15 — where the words (with the name) live.** ⭐ **(a) NOWHERE persistent: the job decrypts and builds only when it actually posts
  (channels on, chat id set, bot resolvable, `member_facing` mode) and never stores the text; a `skipped` row holds ids, the pool label
  (no-decrypt — F7) and the date only; the admin "Posts" list REBUILDS the words at read in the API (via `member-pool/pool-identity.ts`
  `:63,98` — F14 — crossing its D11 note consciously, recorded in the decision; an AUDITED read per the `reconciliation-review` `:105`
  precedent; a null identity or a throwing mode read makes THAT row's words *unavailable*, ⛔ a 500 — the `safeDecrypt` shape) under
  `pariwar.configure_channels`, from the Pariwar's alerts and pools of the last 15 days LEFT JOINED to the post rows (so a dropped enqueue
  shows *"not attempted"* — I9).** The builder is a pure function in `packages/contracts/src/announcement-channels/` that takes `t` as a
  parameter (F17); jobs and API pass the real `t`. *Cost (a):* a KMS decrypt per pool per admin page view (admin scale); ⛔ erasure work —
  no new column holds a name ([[project_append_only_guard_names_erasure_columns]]). **(b) store `post_text` on the row.** *Cost (b):* the
  deceased's decrypted name in plaintext at rest, against architecture's *"member name remains Tier-1 ciphertext"*, plus an RTBF / guard-
  function change. **(c) envelope-encrypt `post_text`.** *Cost (c):* a new ciphertext column, KEK handling and erasure treatment for a
  convenience.

### The words (FS8 (a)) — DRAFT, for BigDev's review at Task 0.2 (Hindi ⚠ unreviewed)

The posts (one bilingual message each; Hindi first, a blank line, then English; plain text, ⛔ `parse_mode`, ⛔ links). Namespace
`contribution`, keys `channel_post.pool_open.named`, `channel_post.pool_open.unnamed`, `channel_post.last_day`, with a
`"$comment.channel_post"` key naming this story in BOTH en and hi (F17):

| Key | Variables | English | Hindi (DRAFT) |
|---|---|---|---|
| `channel_post.pool_open.named` (FS6 `member_facing`) | `pool` · `deceasedName` | Pool {pool} is now open, in support of {deceasedName}'s family. If you are assigned to this pool, please open the app to contribute. | पूल {pool} अब खुल गया है, {deceasedName} के परिवार के सहयोग हेतु। यदि आप इस पूल से जुड़े हैं, तो सुविधानुसार ऐप खोलकर योगदान करें। |
| `channel_post.pool_open.unnamed` (FS6 `none`) | `pool` | Pool {pool} is now open. If you are assigned to this pool, please open the app to contribute. | पूल {pool} अब खुल गया है। यदि आप इस पूल से जुड़े हैं, तो सुविधानुसार ऐप खोलकर योगदान करें। |
| `channel_post.last_day` | `date` (DD-MM-YYYY) | Today, {date}, is the last day of this cycle. If you are able, please contribute in the app. | आज, {date}, इस चक्र का अंतिम दिन है। यदि संभव हो, तो कृपया ऐप में योगदान करें। |

The app (namespace `common`, family `announcementChannels.*`; ⛔ "must", ⛔ "miss", ⛔ "required", ⛔ "Settings"). The body has three
variants so it never names a channel that has no link (I7):

| Key | English | Hindi (DRAFT) |
|---|---|---|
| `announcementChannels.card_title` | The Trust's announcement channels | ट्रस्ट के सूचना चैनल |
| `announcementChannels.body_both` | Pool openings and each cycle's last day are also posted on the Trust's WhatsApp Channel and Telegram channel. Joining one is your choice — every notice is always in this app. | पूल खुलने और हर चक्र के अंतिम दिन की सूचनाएँ ट्रस्ट के व्हाट्सएप चैनल और टेलीग्राम चैनल पर भी दी जाती हैं। किसी एक से जुड़ना आपकी इच्छा है — हर सूचना हमेशा इस ऐप में रहती है। |
| `announcementChannels.body_whatsapp` | Pool openings and each cycle's last day are also posted on the Trust's WhatsApp Channel. Joining it is your choice — every notice is always in this app. | पूल खुलने और हर चक्र के अंतिम दिन की सूचनाएँ ट्रस्ट के व्हाट्सएप चैनल पर भी दी जाती हैं। इससे जुड़ना आपकी इच्छा है — हर सूचना हमेशा इस ऐप में रहती है। |
| `announcementChannels.body_telegram` | Pool openings and each cycle's last day are also posted on the Trust's Telegram channel. Joining it is your choice — every notice is always in this app. | पूल खुलने और हर चक्र के अंतिम दिन की सूचनाएँ ट्रस्ट के टेलीग्राम चैनल पर भी दी जाती हैं। इससे जुड़ना आपकी इच्छा है — हर सूचना हमेशा इस ऐप में रहती है। |
| `announcementChannels.join_whatsapp` | Open the WhatsApp Channel | व्हाट्सएप चैनल खोलें |
| `announcementChannels.join_telegram` | Open the Telegram channel | टेलीग्राम चैनल खोलें |
| `announcementChannels.not_now` | Not now | अभी नहीं |
| `announcementChannels.entry_label` | Trust announcement channels | ट्रस्ट के सूचना चैनल |
| `announcementChannels.entry_hint` | Where the Trust also posts pool openings and last days | जहाँ ट्रस्ट पूल खुलने और अंतिम दिन की सूचनाएँ भी देता है |
| `announcementChannels.screen_title` | Announcement channels | सूचना चैनल |
| `announcementChannels.link_error` | This link could not be opened on your phone. | यह लिंक आपके फ़ोन पर नहीं खुल सका। |

⚠ Run every string through `pnpm microcopy:check` and the tone checklist (`docs/tone-review-checklist.md`); at validation none of these
trips a `microcopy.yaml` rule (avoid "report" in the admin form — `apps/admin/src/**` is scanned). The Hindi follows the house register
(F17): व्हाट्सएप / टेलीग्राम in Devanagari, सूचनाएँ — if BigDev prefers Latin "WhatsApp" / "Telegram" (as in the posts, where the channel
name shows anyway), record that choice at Task 0.2. The entry pairs `entry_label` with `entry_hint` (the `NotificationSettingsEntry.tsx:22-23`
pattern). ⚠ Interim truth (I7): the WhatsApp body says notices are "posted" there; that depends on the
admin posting by hand — the switch's on-label in the admin form says so (AC2), and the decision records it as FS4 (a)'s accepted gap.

### PQ1 — for the Trustee Panel (ONE short note; blocks go-live leg (d), ⛔ the build)

**Plain English:** the Panel agreed on 2026-10-23 that the Trust's channel post for a pool opening names the deceased member's family.
It was told a WhatsApp Channel is public. But every public page the Panel has ruled on names a deceased member only if THAT member had
accepted a Terms version that allows naming after death (`-160`). Until the clause is written and pinned, the page shows no name
(`-173`); today that holds for every member. The October note did not mention this rule. **The one fact that decides it:** a WhatsApp
Channel can be found and read by anyone, so as built per October the channel would be the only public place a deceased member is named,
and the only one without the member's own agreement. Options:
- **A — name every family, as October accepted.** Cost: public naming with no per-member basis, unlike every public page; counsel has not
  been asked (FS13 (e)). Sub-question:
  in the member-facing form, or the public form, which leaves out a one-word name.
- **B — follow the public pages' rule.** Name a family only when the deceased member accepted the Terms that allow it. Today that means
  pool only. Cost: it narrows `-180` for these posts; a member the app's notification did not reach — the member the channel exists for —
  sees no name in the post; names appear only after counsel's clause is pinned (owed since 2026-09-07 — `sahyog-vivran.ts:42`) AND a
  further build wires each member's own Terms.
- **C — name the family on Telegram, as a private invite-only channel, and the pool only on WhatsApp.** Cost: two sets of words, and an
  invite link can be forwarded, so private is not secret.

**Our reading:** B, because it keeps one rule for every public place the Panel has ruled on; the name stays in the app for every member
who opens it. The note is written from `trustee-panel-routing-note-TEMPLATE.md` at Task 0.3 and recorded as NOT sent until BigDev
sends it ([[feedback_shown_to_panel_means_sent]]). Its "How much to trust this note" records that v1.0 of this story cited `-157` as live
and was wrong.

## Acceptance Criteria

**AC0 — Governance before code (Task 0).** The author-commit decision (next free id) recording FS1–FS15 as answered, the §0 readings
G1–G9 (G6's tenancy reading, G7's flag reading and I1's read-at-post-time switch named in its "How much to trust this entry"), I9's
three accepted costs, the posts list's conscious crossing of `member-pool/pool-identity.ts`'s D11 "NOT the admin path" note (FS15), the
alarm-dedup window (FS7), and what it does NOT cover (PQ1, consent / counsel, any other notice posted, a WhatsApp API) is committed ALONE before any
record or code. The PQ1 note is written from the template and its SENT state recorded truthfully. The records commit follows
([[feedback_governance_commits_precede_implementation]]).

**AC1 — The tables exist, start OFF, and are the Pariwar's (FS1, FS2, FS3, FS15).** The migration creates `pariwar_announcement_channels`
(FS3 (a): `enabled` DEFAULT false; the four CHECKs as written, the pairing CHECK included; grants + per-command tenant policies as FS3
states) and `announcement_channel_posts` (FS2 (a): the FK, the UNIQUE, the CHECKs incl. `posted ⇒ telegram_message_id`, the `claim_token`,
the transition trigger, FORCE RLS, `twt_app` SELECT + column-limited INSERT / UPDATE, per-command tenant policies; ⛔ a name or text
column). A policy-regression spec per table (`packages/domain/tests/integration/rls/<table>-policy-regression.spec.ts`) proves: as
`twt_app` scoped to A, B's rows are invisible and unwritable; every CHECK's literal set equals the exported domain constants
(`checkValues` — the `detail` CHECK's `tg_<error_code>` pattern is pinned by an accept / reject case pair, since a pattern has no literal
set); the trigger admits exactly FS2's transitions and refuses any other update of a finished row.

**AC2 — The admin config and posts list (FS3, FS4, FS15, F14).** `GET`/`PUT /api/v1/p/:pariwarId/admin/announcement-channels` and `GET
…/announcement-channels/posts`, gated by `pariwar.configure_channels` (⛔ new permission key — the catalog stays at version 55 / 71 keys);
the PUT validates with the contract (refinements equal to the CHECKs), writes on the scope tx under `withCompensatingAudit` (action
`pariwar.announcement_channels_update`; ⛔ the bot secret NAME or value is ever returned — the API reads only whether the name is
non-blank, for AC3); the module is added to `CHANNEL_ROOTS` (`scripts/access-wrapper-invariants/check.ts:69-77`) and a planted bare
`audit.writeAuditEntry` in it is shown to FAIL the access-wrapper gate (record RED, then remove); the config GET returns `{ enabled: false,
…nulls }` when no row exists (⛔ a 404). The posts list (an AUDITED read — F14) returns `{ posts: [...] }` (a named array, `clampLimit`ed —
the forced-pagination guard), per pool opening and per last day of the last 15 days — a `last_day` entry only once the cycle has reached
day 14, its date from the SHARED `operationalDate` (AC4) — each with the Telegram state (`posted` / `deferred` / `refused` / `unknown` /
`skipped` / `attempting` / *"not attempted"*; an `attempting` row past the lease is SHOWN as `unknown`) and, ONLY while `enabled` is true,
the bilingual words rebuilt through the shared builder with the real `t()` (switch off ⇒ states only); nothing else. 403 / 400 / 401 /
cross-Pariwar tested, and a test that a decrypt failure or a throwing mode read yields that row's words as *unavailable*, ⛔ a 500. The
admin page (`apps/admin/src/modules/channel-config/`) gains an
"Announcement channels" form (the `TelegramConfigForm` pattern) whose switch reads *"When on: members see these links in the app, and the
system posts pool openings and last days to the Telegram channel. Post the same words to the WhatsApp Channel by hand from the list
below."*, and the "Posts" list with a Copy button per post.

**AC3 — The member read (FS12; I1, I7).** `GET /api/v1/member/announcement-channels` returns the member's own Pariwar's links only while
`enabled` is true, else both null; `telegramChannelUrl` only when the chat id is set and the bot secret name is non-blank (tested: a blank
bot secret name ⇒ `telegramChannelUrl: null` with the WhatsApp link still returned); `.strict()` contract registered via `emit-openapi.ts` + the barrel (OpenAPI diff limited to this and
AC2's routes; determinism check green); 401 unauthenticated; a member of A never receives B's links (live test).

**AC4 — The words and the builder (FS6, FS8, FS15; I4, I5).** `buildAnnouncementPost(t, input)` in
`packages/contracts/src/announcement-channels/` — `input` is `{ occasion: 'pool_open', poolLabel, deceasedName: string | null } | {
occasion: 'last_day', lastDate }`; a `@ts-expect-error` test proves a member field is refused. `t` is a LOCAL structural type (F17). It
returns Hindi, a blank line, English, through the injected `t` (tests pass the REAL `t` from `@twt/i18n`, a contracts devDependency).
Named / unnamed is chosen by `ANNOUNCEMENT_POST_NAME_MODE` (a test pins its value to the decision). In `member_facing` mode the name comes
from the F7 identity wiring (mode read + a WRAPPED `resolvePoolIdentity`, `poolCount` = the cycle's pools); `null` or a throw gives
`refused:identity_unavailable`, ⛔ an unnamed post; the label is `poolName ?? poolLetterCode`. In `none` mode: ⛔ mode read, ⛔
`resolvePoolIdentity`, ⛔ decrypt — the label is `resolveCuratedPoolName ?? poolLetterCode(poolIndex)` and a test proves NO KMS call. The
date is EXACTLY the day-14 member reminder's: `operationalDate` MOVES unchanged from `contribution-notify-triggers.ts:320-326` into
`packages/contracts/src/alerts/contribution-loop-templates.ts` beside `CYCLE_WINDOW_DAYS`, with ONE exported `cycleDeadlineAt(committedAt)`
(`committedAt + CYCLE_WINDOW_DAYS` days, the sweep's `:1435` arithmetic); the sweep, the job and the API all import them. A test proves the
post's date AND the posts list's date equal the member reminder's `date` param for the same alert. ⚠ Mirror the reminder's existing day
arithmetic; ⛔ "correct" it here. Catalogue parity en / hi.

**AC5 — When posts are enqueued (FS5; I1, I6, I9).** Every job is sent with `pariwarId` on the JobEnvelope (F19). Payloads, in full:
cycle job `{ alertId, cycleId, occasion: 'pool_open' }`; pool child `{ alertId, cycleId, poolId, occasion: 'pool_open' }`; last-day job
`{ alertId, cycleId, occasion: 'last_day', deadlineAtIso }`. (i) POST-COMMIT in `runCycleOpenAlert`, beside the contribution-notify enqueue
(a new optional `CycleOpenAlertDeps` seam, wired in `registerCycleOpenAlertWorkers`, `boot.ts:789-805`), best-effort with its own alarm,
ALSO on the `minted: false` path: send the cycle job; its handler lists the cycle's pools (a pools-only read with an explicit `pariwar_id`
predicate — ⛔ `listCycleBindingCandidates`, which also loads assignments) and sends one pool child each, the i-th with `startAfter = i × 3
s` (FS5) — ⛔ an in-process sleep. (ii) In `runDeadlineReminderSweep`, when `cycleDay === 14`, AFTER `deadlineAt` (`:1435`) and BEFORE
`listCycleBindingCandidates` (`:1437`), call a NEW OPTIONAL `enqueueAnnouncementPost` seam on `ContributionNotifyTriggerDeps` (wired in
boot; UNSET in existing tests, so their `send` calls — incl. `send.mock.calls[0]` at `contribution-notify-triggers.test.ts:651-670` — are
untouched) ONCE per alert, in its own try/catch (a failure alarms; the per-pool loop still runs); `cycleDay` 15+ posts nothing (T3).
(iii) The handler reads `enabled`, the chat id and the bot secret name AT RUN TIME, each by an explicit `pariwar_id` predicate (I6).
Switch off ⇒ `skipped:switch_off`; no chat id ⇒ `skipped:no_chat_id`; blank or absent secret name ⇒ `skipped:bot_not_configured`; a
`last_day` job whose IST date is no longer the deadline's ⇒ `skipped:stale`; a `pool_open` child whose alert is no longer live ⇒
`skipped:stale`. The secret is resolved BEFORE the claim: if `resolveChannelSecret` throws, NO row is written and the job throws (pg-boss
retries — an outage is transient); only the FINAL attempt writes `refused:secret_unresolved` + one alarm. ⛔ a Bot API call in any of
these. A `skipped` row holds ids, the pool label (no-decrypt — F7) and the date only; ⛔ a decrypt is done for it. (iv) The existing hourly
`runContributionNotifyRecoverySweep` (`:1296`) gains one best-effort step through the same optional seam: for a live alert whose pools
lack a `pool_open` post row, re-send the cycle job (the UNIQUE makes a re-send harmless). The queue is created (`boss.createQueue`) BEFORE
`registerContributionNotifyWorkers` / `registerCycleOpenAlertWorkers`, and its worker registered in jobs boot. The per-member fan-out's
enqueue order, payloads and tests are unchanged.

**AC6 — At most once, and honest (FS2, FS7; I2, I3, I6).** States and transitions CHECK- and trigger-enforced; the claim commits before
the Bot API call; the 0184 lifecycle (F15) — only a `deferred` row is re-claimed, with a NEW token; finalise only on the attempt's own
token; the outcomes exactly as FS7 (a). Live tests with a fake Telegram server (injected `fetchImpl`): a second job for the same subject
posts nothing; a retry after `posted` posts nothing; a 429 with `retry_after: 7` marks the row `deferred` and re-sends the job with
`startAfter` 7 s, and the re-claim ROTATES the token (a stale holder of the old token cannot finalise); a `deferred` row past its max age
ends `refused:tg_429_expired`; a hung server ends `unknown` after the timeout and is never re-posted; a 5xx and a 2xx with no
`message_id` each end `unknown`; a crash-left `attempting` row past the lease ends `unknown`; one pool's 429 does not delay or fail another
pool's child; with no secret name the outcome is `skipped:bot_not_configured`, ⛔ `posted` (the fixture is unreachable); a secret-manager
throw on a non-final attempt writes no row; a job for Pariwar A never reads or writes Pariwar B's config or post rows (the job runs on the
BYPASSRLS pool — I6).

**AC7 — Nothing about a member is posted or stored (I4).** A test drives a pool-open post for a pool with members in several payment
states and asserts the posted text equals `buildAnnouncementPost(t, { occasion: 'pool_open', poolLabel, deceasedName })` exactly and contains no member name, mobile,
amount or status; a schema test asserts `announcement_channel_posts` has no column that can hold a name or the text.

**AC8 — The ask on home (FS9, FS10, FS11; I7).** `<AnnouncementChannelsCard />` renders directly after `<HomePromptCards />` (a source pin
added; existing pins unbroken); renders NOTHING while loading, on error, when both links are null, or when dismissed on this device for
this account; shows the body variant for the links present, one button per non-null link (equal props — neither primary; each with
`accessible={true}` + `accessibilityRole="link"` + a label — F11) and "Not now" (`dismissLabel = t('announcementChannels.not_now')`); the
query is keyed and cleared on sign-out as FS11 states (a test: after `signOut`, the next account's first render has no cached links);
"Not now" dismisses at once; a join button dismisses only after `openURL` resolves; a
rejected `openURL` shows `link_error` inline and keeps the card. Render tests (jsdom header, `vi.mock('../../lib/mmkv')`, RTL `cleanup`)
cover each branch; the dismissal module has its own unit tests (no expiry; per account; cleared on sign-out); ⛔ a `[t]` dependency.

**AC9 — The settings entry and screen (FS9).** `<AnnouncementChannelsEntry />` (chromeless, the `NotificationSettingsEntry` style)
renders directly after `<TelegramNotificationSettingsEntry />` only when at least one link is returned, with `entry_label` + `entry_hint`;
`app/(settings)/announcement-channels.tsx` shows the title, the body variant and the join buttons (equal weight, `accessible={true}` +
`accessibilityRole="link"`, `link_error` on failure). A copy-pin test
(the `wa-signup-copy-keys` pattern) pins the `announcementChannels.*` set, resolves each through the real `t()` in en and hi, and bans *must
/ required / miss / Settings / सेटिंग / ज़रूरी / अनिवार्य*.

**AC10 — Records (Task 0.4).** `epics.md` gains `### Story 5.14` after 5.13 (the 5.11 shape: a dated added-note, the story statement, a
short AC summary pointing to this file); architecture §3.4 gains a dated ANNOTATION (⛔ a rewrite) placing the two channels (per Pariwar;
mirrors members are asked to join; Telegram posted by the system via the Pariwar's bot; WhatsApp by hand; two notices only; ⛔ the
per-member mirror; the name per PQ1); the roster gains the FS13 row, and Row 26 a dated note (the two new tables join its scope — their
grants bind `twt_app` only; jobs reach them on the BYPASSRLS pool, isolated by explicit predicate — I6); ⛔ ADR-0030 (ratified; F14);
deferred-work's
5.11 channels item gets an appended line (HOMED → building; closes when this row is `done` on `main`) plus a NEW item for FS6's deferred
"per member's own Terms" wiring (trigger: PQ1 ruled B and the post-death clause pinned); the friction ledger gains ONE `optional` row for the
card and a `**Story 5.14 disposition**`.

**AC11 — Nothing frozen moved (I8).** `git diff origin/main -- packages/channels/src/dispatch.ts 'packages/channels/src/cascade*'
packages/channels/src/composition/provider-composition.ts packages/domain/src/notifications/delivery.ts apps/api/src/modules/telegram-opt-in
apps/jobs/src/tg-webhook-processor.ts 'apps/mobile/app/(settings)/telegram-notifications.tsx' packages/domain/src/rbac/permissions.ts
packages/domain/src/feature-flags/registry.ts packages/channels/src/providers/telegram-errors.ts
docs/adr/ADR-0030-compensating-audit-mechanization.md` is EMPTY; `channels-determinism` green; the Telegram client diff
(`telegram-app.ts`) is the timeout + `signal` + `retryAfter` alone (+ their tests); the mirror's tests pass unchanged except NEW timeout / retry-after cases; the F4 regression test
added beside the webhook processor's tests.

**AC12 — Gate.** `pnpm ci:local` green on an isolated database (⛔ shared :5433 while siblings run — [[project_known_livedb_test_failures]];
set `DATABASE_URL` on the command — [[project_prepush_hook_inherits_5432]]); `pnpm friction:check` after committing; `pnpm i18n:check`;
`pnpm microcopy:check`; `pnpm contracts:check-openapi-determinism`.

## Tasks / Subtasks

- [ ] **Task 0 — Governance (AC0)**
  - [ ] 0.1 Preflight: `git fetch origin`; rebase onto `origin/main` if it moved (backup branch first); run the pin checks (header);
        re-trace F1–F19. **STOP and tell BigDev if:** **S1** a ruling on the Trust's channels, their words, or public naming of the
        deceased exists newer than `-415` (grep `^### Decision` for *channel*, *Telegram*, *announcement*, *public*, *deceased*); **S2**
        another worktree edits `cycle-open-alert.ts`, `contribution-notify-triggers.ts`, `telegram-app.ts` / `telegram-errors.ts`,
        `channel-config/` (api or admin), `apps/admin/src/api/client.ts`, `scripts/access-wrapper-invariants/check.ts`,
        `contribution-loop-templates.ts`, `alert-sms-sends.ts` / `alert-sms-send.ts`, `(tabs)/index.tsx`, `home-card*`, `HomeReminderCard.tsx`,
        `session-context.tsx`, `emit-openapi.ts`, `packages/api-client/src/index.ts`, the roster,
        migrations / journal, `epics.md`, `deferred-work.md` ([[feedback_shared_tree_branch_switch]] — `git worktree list`, ListAgents; at
        creation: 6.32 (mid-rebase) touches migrations / journal / roster / decision-log / sprint-status; 12-1 / 13-2 have no commits);
        **S3** a number moved (NUMBERS); **S4** F4's trace no longer holds (the processor parses `channel_post`, or matches negative chat
        ids); **S5** a `clause_versions` row for the post-death publication clause now exists, or `NAME_PUBLICATION_AUTHORISED` changed (G3
        and PQ1 change).
  - [ ] 0.2 Put FS1–FS15, "The words" (en + hi) and PQ1 to BigDev; record the answers VERBATIM in Debug Log (a), each with its option's
        cost line (footgun #45). A confirmation of the Hindi in session does NOT discharge roster leg (c) unless BigDev says it does —
        record which.
  - [ ] 0.3 Write the PQ1 note (`trustee-panel-routing-note-YYYY-MM-DD-5-14-…`, from the template — §0 first, the one deciding fact,
        options with costs, "How much to trust this note" incl. the v1.0 `-157` error, evidence last); record it NOT sent until BigDev
        sends it. Stage the author-commit decision (next free id) in the scratchpad; commit it ALONE (`governance:` prefix) — try the
        decision-log write first ([[project_decision_log_writes_user_inserted]]).
  - [ ] 0.4 Records commit (AC10), the ledger by SAFE prepend ([[project_sprint_status_safe_prepend]]) + row `ready-for-dev →
        in-progress`. Check the branch before every commit ([[feedback_concurrent_review_agents_mutate_tree]]).
- [ ] **Task 1 — Migration + domain schema + accessor (AC1, AC6; FS2, FS3)**: hand-written SQL (⛔ `db:generate` —
      [[project_live_db_test_gotchas]]), `0190` at validation, with a journal `when` above 1795923600034 (6.32's `0189`) and every other
      sibling's — re-check at Task 0.1 ([[project_sibling_migration_when_order_shared_db]]);
      `packages/domain/src/schema/{pariwar_announcement_channels,announcement_channel_posts}.ts` (+ `packages/domain/src/schema/index.ts`);
      the occasion / state / detail constants and the lease / max-age constants exported; a domain accessor module
      `packages/domain/src/announcement-channels/` (lookup / begin / finalise / give-up / stale-lease — the `alert-sms-sends.ts` shape, every
      query with an explicit `pariwar_id` predicate — I6; plus the pools-only read and the config read) + the domain barrel; the two
      policy-regression specs.
- [ ] **Task 2 — Contracts + words (AC3, AC4; FS6, FS8, FS12, FS15)**: `packages/contracts/src/announcement-channels/` (config DTO, PUT DTO
      with refinements equal to the CHECKs, member response, posts-list view `{ posts }`, the builder with its local `t` type +
      `ANNOUNCEMENT_POST_NAME_MODE`); `operationalDate` moved + `cycleDeadlineAt` added in `contribution-loop-templates.ts` (AC4; the jobs
      file imports them); `"@twt/i18n": "workspace:*"` in `packages/contracts/package.json` devDependencies (+ lockfile); the barrel;
      `emit-openapi.ts`; the `contribution.json` `channel_post.*` keys + `$comment.channel_post` and `common.json` `announcementChannels.*`
      (en + hi); contract tests (hand-built fixtures — [[project_contracts_tests_outside_tsc]]); builder tests with the real `t`.
- [ ] **Task 3 — Telegram client (AC6, AC11; FS7)**: `signal` on `FetchInit`; injectable `timeoutMs` (default 9 000) via a
      `timeoutSignal` seam with its bounds check, copied from `whatsapp-app.ts:280-299`; `retryAfter` on `TelegramSendError` parsed from
      `parameters.retry_after`; the timeout stays class `api_unavailable` (already — F1; `telegram-errors.ts` ⛔ edited); tests on both paths
      (the hung-server case through the injected seam).
- [ ] **Task 4 — The poster job (AC5, AC6, AC7; I1–I6, I9)**: `QUEUE_NAMES` entry in `packages/queue/src/index.ts`; handler
      `apps/jobs/src/scheduler/announcement-channel-post.ts` — the cycle job (pools-only read ⇒ one pool child each, `startAfter = i × 3 s`)
      and the post job: config read (explicit `pariwar_id`) → skip / stale checks → secret via `resolveChannelSecret` BEFORE the claim (a
      throw: no row, rethrow; final attempt only: `refused:secret_unresolved`) → identity (`member_facing` only: the F7 wiring, wrapped,
      with `jobsEncryption`; `none`: the no-decrypt label) → begin (short tx) → send through a handle from `createTelegramAppCache` with
      NOTHING held → finalise (short tx, own token) — all through the Task 1 accessor; alarms deduped per Pariwar + class by
      `createTtlMemo`. `createQueue` BEFORE the contribution-notify and cycle-open workers register; worker registration; the optional
      seams on `CycleOpenAlertDeps` and `ContributionNotifyTriggerDeps` wired in boot (the day-14 hook and the recovery-sweep step — AC5
      (ii), (iv)); `contribution-notify-triggers.ts` imports `operationalDate` / `cycleDeadlineAt` from contracts; the F4 regression test;
      live tests per AC6 / AC7.
- [ ] **Task 5 — API (AC2, AC3)**: `apps/api/src/modules/announcement-channels/` (admin config + posts list under
      `/p/:pariwarId/admin/…` with `pariwar.configure_channels`; the member route with `requireMemberSession` + `openScopeTx` — F16);
      `withCompensatingAudit`; the module added to `CHANNEL_ROOTS` (`scripts/access-wrapper-invariants/check.ts:69-77`) with the planted
      bare-audit RED run against `pnpm access-wrapper:check` (AC2); the posts list decrypts via `member-pool/pool-identity.ts:63,98` as an
      AUDITED read with per-row `safeDecrypt` degrade (F14, FS15); registration in `apps/api/src/server.ts`; route tests (403 / 400 / 401 /
      cross-Pariwar / no-row defaults / decrypt failure / blank bot secret ⇒ no Telegram link); the access-wrapper checklist walk
      (`docs/access-wrapper-invariants.md`) for both route groups and the job.
- [ ] **Task 6 — Admin UI (AC2; FS4)**: the form + posts list with Copy (`navigator.clipboard.writeText`, a visible "Copied" state) in
      `apps/admin/src/modules/channel-config/`; the three calls in `apps/admin/src/api/client.ts` (F14) and hooks in `src/api/hooks.ts`;
      `apps/admin/tests/announcement-channels-page.test.tsx` (stub `navigator.clipboard` in jsdom — no admin precedent).
- [ ] **Task 7 — Mobile (AC8, AC9; FS9–FS11, FS14)**: `getAnnouncementChannels()` in `createMemberAuthClient` (`packages/api-client`, F16);
      `components/announcement-channels/useAnnouncementChannelsQuery.ts` (key + sign-out clear per FS11); `lib/announcement-channels-dismissal.ts`
      (no expiry, per member, its own `SyncStorage` interface — the per-module seam of `home-card-dismissals.ts:35`; cleared in
      `session-context.tsx`); `components/home/AnnouncementChannelsCard.tsx` (on `HomeReminderCard`; one header-comment line added to
      `HomeReminderCard.tsx` naming this card's once-for-good exception — F10);
      `components/notifications/AnnouncementChannelsEntry.tsx`; `app/(settings)/announcement-channels.tsx`; home
      wiring + source pins; render + unit tests; copy pin test. Long Hindi labels: the `NomineeMarkControl` multi-line Button pattern
      ([[project_tamagui_button_text_one_line]]); record on-device wrapping as un-attested if no device run.
- [ ] **Task 8 — Records and gate (AC10, AC12)**: commit, then `pnpm friction:check` (row + disposition); `pnpm ci:local` on an isolated DB;
      Debug Log evidence; story → `review`.

## Dev Notes

### ⚠ TRAPS

- **T1 — the fixture says `accepted`.** Never route the poster through `createTelegramBotProvider` / the composition (it falls back to the
  fixture when the mirror's `enabled` is false — F3, F5). Resolve the secret and build the handle directly (`createTelegramAppCache`).
- **T2 — do NOT add `deadline_reminder` to `TELEGRAM_ELIGIBLE_CATEGORIES`** (F2). That would send every member's day 5/10/13/14 reminder
  to their personal Telegram chat — a per-member privacy-posture change (§3.4). The channel post never uses `dispatch`.
- **T3 — the sweep runs daily; the day-14 hook must hold across runs** (a re-run the same day, a late run): the record's UNIQUE holds
  (F19 — the queue key does not); `cycleDay` 15+ posts nothing — test it.
- **T4 — the name needs decrypt deps in jobs AND in the API** (FS15) — in `member_facing` mode ONLY. `resolvePoolIdentity` returns `null`
  on a decrypt failure and can THROW on its DB reads — key `refused:identity_unavailable` on `null`, a throw, and a failed mode read; ⛔ a
  post without the name in `member_facing` mode. In `none` mode none of this runs (I5) — ⛔ "reuse" the identity wiring for the label.
- **T5 — the webhook processor is NOT edited** (F4 — verified safe at the pin); add only the regression test. If S4 trips, stop.
- **T6 — `useT()` fresh closure.** Depend on `locale`, never `t` ([[project_uset_fresh_closure_memo_trap]]).
- **T7 — two reminder cards at once (FS11 (a))** — acceptable and bounded; do not "fix" it by hiding known-people cards.
- **T8 — never hold a connection across the send** ([[project_jobs_pool_two_connection_starvation]]): claim in one short tx, send with
  nothing held, finish in another short tx. Pacing is `startAfter` on the pool children, ⛔ a sleep.
- **T9 — a Telegram `chat_id` `-100…` exceeds 2^31** — TEXT end to end; never `Number()` it.
- **T10 — plain text, no `parse_mode`.** A family name with `<` or `&` then needs no escaping; if anyone later adds HTML mode, every
  interpolated value must be entity-escaped.
- **T11 — Telegram counts characters, not SMS parts** — a single bilingual pool post is ~300 characters against the 4096 cap.
- **T12 — the friction gate reads committed history** — commit before `friction:check`.
- **T13 — the switch is read at post time ON PURPOSE (I1).** 5.8b's review "fixed" a notify-time re-read of a declaration; here the
  opposite is intended — a switch turned off stops later posts. Do not "fix" it; the decision says so.
- **T14 — RLS does not protect the job** (I6). The jobs pool is BYPASSRLS and `withPariwarScope` only sets a GUC; a query without
  `pariwar_id = $1` reads every Pariwar. Every accessor takes `pariwarId` and filters on it; the cross-Pariwar live test (AC6) proves it.
- **T15 — a claim token never rides a job payload.** A pg-boss retry would make two holders of one token. A 429 re-send carries only
  ids; the re-claim (`deferred → attempting`) mints a NEW token (F15).
- **T16 — the existing day-14 test asserts `send.mock.calls[0]`** (F8) — the hook uses its own optional seam; ⛔ a second `boss.send` on
  the sweep's `send`.

### Closed list of edit sites (re-run the greps at Task 0.1)

NEW: the migration `0190` + journal entry; `packages/domain/src/schema/{pariwar_announcement_channels,announcement_channel_posts}.ts`;
`packages/domain/src/announcement-channels/*` (the accessor — Task 1); `packages/domain/tests/integration/rls/{pariwar-announcement-channels,announcement-channel-posts}-policy-regression.spec.ts`;
`packages/contracts/src/announcement-channels/*`; `apps/jobs/src/scheduler/announcement-channel-post.ts` (+ tests);
`apps/api/src/modules/announcement-channels/*` (+ tests); `apps/admin/src/modules/channel-config/AnnouncementChannels*.tsx`;
`apps/admin/tests/announcement-channels-page.test.tsx`; `apps/mobile/lib/announcement-channels-dismissal.ts`;
`apps/mobile/components/announcement-channels/useAnnouncementChannelsQuery.ts`; `apps/mobile/components/home/AnnouncementChannelsCard.tsx`;
`apps/mobile/components/notifications/AnnouncementChannelsEntry.tsx`; `apps/mobile/app/(settings)/announcement-channels.tsx`; mobile tests;
the routing note (Task 0.3).
UPDATE: `packages/channels/src/providers/telegram-app.ts` (FS7 only); `packages/queue/src/index.ts`; `packages/domain/src/schema/index.ts`
+ the domain barrel; `apps/jobs/src/scheduler/cycle-open-alert.ts` (one deps seam + one post-commit send);
`apps/jobs/src/scheduler/contribution-notify-triggers.ts` (the day-14 seam call; the recovery-sweep step; `operationalDate` /
`cycleDeadlineAt` imported from contracts); `apps/jobs/src/boot.ts` (`createQueue` first, worker, seam wiring); the webhook processor's TEST
file only; `apps/api/src/server.ts`; `scripts/access-wrapper-invariants/check.ts` (`CHANNEL_ROOTS` + one entry);
`packages/contracts/src/alerts/contribution-loop-templates.ts` (`operationalDate` moved, `cycleDeadlineAt`); `packages/contracts/src/index.ts`;
`packages/contracts/package.json` (devDependency `@twt/i18n`) + lockfile; `packages/contracts/scripts/emit-openapi.ts`; `openapi/v1.yaml`
(generated); `packages/api-client/src/index.ts` (`getAnnouncementChannels`); `apps/admin/src/modules/channel-config/ChannelConfigPage.tsx`;
`apps/admin/src/api/client.ts`; `apps/admin/src/api/hooks.ts`; `apps/mobile/app/(tabs)/index.tsx`; `apps/mobile/lib/session-context.tsx`;
`apps/mobile/components/home/HomeReminderCard.tsx` (one header-comment line); the source-pin tests;
`packages/i18n/locales/{en,hi}/{common,contribution}.json`; `friction-budget.md`; records (Task 0.4: `epics.md`, `architecture.md`,
`docs/launch-gate-inventory/inventory-roster.md` (the FS13 row + a Row 26 note), `deferred-work.md`, `sprint-status.yaml`, `.decision-log.md`).
⛔ NOT: everything in AC11's list (incl. `telegram-errors.ts` and ADR-0030); any SMS file (the 0184 accessor and job are READ as the
pattern, ⛔ edited); `home-card-dismissals.ts`; `home-cards.ts`; `apps/mobile/lib/member-api.ts` (the instance only — F16).

### Reuse map

the 0184 lifecycle + `alert-sms-sends.ts` accessor shape + `createTtlMemo` (F15) · `createTelegramAppCache` · `channelConfig.getTelegramConfig`
· `resolveChannelSecret` · the F7 identity wiring (`member_facing` only) · `resolveCuratedPoolName` + `poolLetterCode` (`none` / skipped) ·
`member-pool/pool-identity.ts` + `reconciliation-review` `safeDecrypt` (API) · `withCompensatingAudit` · `TelegramConfigForm` ·
`HomeReminderCard` · the `SahyogVivranEntry` link shape · `known-people-cache.ts` key shape · `wa-signup-copy-keys.test.ts`.

### Testing standards

Vitest everywhere; live-DB tests on an isolated container (own container, DB NAMED `twt_dev` — [[project_known_livedb_test_failures]];
[[project_db_clock_ordering_tests_tie]] for time ordering); mobile render tests with the jsdom header, the mmkv mock and RTL `cleanup`
([[project_mobile_vitest_and_expo_install_traps]]); admin tests via `apps/admin/tests/_helpers.tsx`; a fake Telegram server via injected
`fetchImpl` (never the network). RED first for each invariant's proof; record RED in the Debug Log.

### Project structure notes

Pariwar-scoped config follows `pariwar_telegram_config`; the post record follows `alert_sms_sends`. The jobs handler lives in
`apps/jobs/src/scheduler/`. The admin surface extends channel-config rather than adding a top-level module. No new package
([[feedback_no_premature_package]]).

### Sequencing

Task 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Tasks 6 and 7 can run in parallel after 5. The migration is `0190` (6.32 holds `0189`);
re-check at Task 0.1 and at every rebase (NUMBERS).

### Carried forward (only what F1–F19 do not already say)

- 5.8b: a switch that starts OFF plus a go-live row whose LAST leg flips it is the accepted "built but not live" shape (T13 on the
  read-time difference). 5.13: copy approved at Task 0.2 is pinned by a key-set test, and the approval sentence is quoted verbatim in the
  Debug Log. Every Epic 5 story: the access-wrapper checklist is walked by hand ([[project_access_wrapper_gate_pending_scope]]). Landing:
  governance commit → records commit → code; fast-forward ([[feedback_land_prs_by_fast_forward]]).
- Telegram Bot API 10.3 (2026-08-24): the bot needs channel admin with `can_post_messages`; text 1–4096 characters after entity parsing;
  ~20 messages / minute in a group, no channel figure published ⇒ ≥ 3 s apart. WhatsApp Channels: up to 16 admins; posting only from the
  WhatsApp app (F12). Expo SDK 55: `Linking.openURL('https://…')` needs no query-scheme config and REJECTS when nothing handles it (F11).

### References

`.decision-log.md` `-390`, `-389` (G10/G12/G13), `-180`, `-181`, `-160`, `-173`, `-070`, `-415` FS17 · the 2026-10-23 routing note Q2 ·
`packages/contracts/src/public-pages/matrix.ts:394-415`, `sahyog-vivran.ts:41` · `5-11-per-member-sms-fallback-fixed-wording.md` "The words",
FS16 · `architecture.md` §3.4 · `prds/prd-TWT-2026-05-22/prd.md` FR-73, FR-94 (R10(B)); `addendum.md` RA-29 · `docs/tone-guide.md` §3 ·
`deferred-work.md` (5.11 section, the channels item; the Telegram re-fetch loop item) · `friction-budget.md` · the files cited in F1–F19.

## Dev Agent Record

### Agent Model Used

### Debug Log References

(a) Task 0.2 answers — verbatim. (b) RED proofs. (c) Gate runs. (d) Task 0.1 preflight.

(e) Validation 2026-10-29.
- **v1.0 → v1.1** (one fresh-context verifier; critical claims re-checked by hand): **C1** G3 / PQ1 cited `-157` as live — `-160`
  superseded its hold; G3 and PQ1 rewritten on `-160`'s per-member basis + the matrix fence + `-173`, with the name-form sub-question.
  **C2** the stored `post_text` (a decrypted name at rest) removed — NEW FS15. **H1** client `signal` + `retryAfter`. **H2** grants per
  `0045` / `0184`. **H3** the builder takes `t` as a parameter. **H4** links and copy only while the channels are on; three body variants.
  **H5** `singletonKey` dedupes nothing. Mediums / lows: identity-wiring cites, I9's cost, `link_error`, the dismissal module, the edit
  list, the day-14 hook placement, F4 traced safe, T8, F11's trigger, the audit action name, line offsets, G7's `-070` reading, CHECK
  regexes.
- **v1.1 → v1.2** (three fresh-context verifiers in parallel — jobs / channels / DB; API / admin / mobile / copy; governance + adversarial
  design; 30 findings, ALL applied on BigDev's "all"; re-checked by hand: the ledger and migration collisions, FS16 (b), the 0184
  `deferred` lifecycle, the BYPASSRLS jobs pool, the day-14 test's `calls[0]`, ADR-0030 / `CHANNEL_ROOTS`, the contracts deps, sign-out
  clearing). **Critical:** (1) the 429 model replaced by 0184's lifecycle (`deferred`, lease, fresh token on re-claim, max age) — I2, F15,
  FS2, FS7, AC6, T15; (2) I6's RLS claim false for jobs — explicit `pariwar_id` predicates, a cross-Pariwar live test, a Row 26 note — I6,
  AC6, AC10, T14; (3) FS6 `none` mode reads / decrypts nothing — I5, AC4, T4; (4) ADR-0030 ⛔ edited, the module added to `CHANNEL_ROOTS`
  with a RED proof — F14, FS3, AC2, AC10, Task 5; (5) NUMBERS: ledger `-29c` (`-29a` / `-29b` held by 6.32 / 11b.5 — the creation's
  `-29a` relabelled), migration `0190`; (6) FS16 (b) kept "TWT:" — dropping it is the author's extension. **Should-add:** the Telegram
  link pairing CHECK + member-read condition; the day-14 seam; secret resolved before the claim; "may have posted" ⇒ `unknown`; one job
  per pool with `startAfter`; `skipped:stale`; the recovery-sweep heal (I9's cost narrowed + two more accepted costs named); the admin
  decrypt precedent + audited read + D11 crossing; `operationalDate` / `cycleDeadlineAt` shared; the posts list's states incl.
  `deferred` / `attempting` (no `upcoming` state needed — a `last_day` entry appears only from day 14); the posts list's words gated on the switch; full payloads; the persisted query
  cache keyed + cleared; `@twt/i18n` devDependency + local `t` type; the edit list (admin `client.ts`, accessor, barrels, api-client,
  hook file, scan roots, contracts `package.json`); `{ posts }` for the pagination guard; Devanagari व्हाट्सएप / टेलीग्राम; `accessible`;
  PQ1 B's and A's costs; G7's `-415` FS17 citation corrected. **Lows / optimisation:** citation fixes; FS2's FK / `posted ⇒ message_id`
  / `clock_timestamp()`; `$comment.channel_post`; `entry_hint`; clipboard stub; the `HomeReminderCard` comment; AC2's 404 ⇒ defaults;
  I7 / FS9 / FS10 wording; `family` → `deceasedName`; a pools-only read; token rotation; the `timeoutSignal` seam; Previous-story / Git /
  Latest-tech sections collapsed into "Carried forward"; this history moved out of the Change Log.

### Completion Notes List

- 2026-10-29: Ultimate context engine analysis completed - comprehensive developer guide created (`bmad-create-story 5.14`, at
  `282bdd33`; four read-only research passes — governance, server code, mobile/admin surfaces, platform docs — then one fresh-context
  checklist verifier).
- 2026-10-29: v1.2 — second checklist validation (three parallel fresh-context verifiers; 30 findings applied) — Debug Log (e).

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-29 | 1.0 | Created (`bmad-create-story 5.14`): FS1–FS14 + PQ1 proposed; ready-for-dev. |
| 2026-10-29 | 1.1 | Checklist validation (one verifier: 2 critical / 5 high / 12 medium / 10 low) — all applied; Debug Log (e). |
| 2026-10-29 | 1.2 | Second checklist validation (three parallel verifiers: 6 critical / 19 should-add / 4 optimisations / 1 LLM) — all applied on BigDev's "all"; Debug Log (e). Ledger relabelled `-29a` → `-29c`; migration `0190`. |
