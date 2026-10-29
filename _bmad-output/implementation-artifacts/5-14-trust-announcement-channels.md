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
(2 CRITICAL / 5 HIGH / 12 MEDIUM / 10 LOW), every finding applied and the critical ones re-checked by hand (Change Log). FS1–FS15
PROPOSED for BigDev at Task 0.2; PQ1 PROPOSED (one Panel question — whether a public channel post may name a deceased member's family
ahead of the rule every public web page follows; it blocks the go-live row, ⛔ the build). ⛔ No code before Task 0.3 (the
author-commit decision committed ALONE) and Task 0.4 (records).

START CONDITION — MET at the pin: `-390` Q2 A (Trustee-ratified, 2026-10-23) homed this row; 5.5 (the per-Pariwar Telegram bot, its
config table and real `sendMessage` client), 8.1 (`openCycleAlert`), 8.8 (the fan-out) and the deadline sweep (days 5 / 10 / 13 / 14) are
`done` on `main`. Nothing this story needs is unbuilt elsewhere.

NUMBERS (footguns #19 / #42(e); `-366` decision 6): this file names no decision id, roster Row, migration number or ledger letter as
TAKEN. At the pin they WERE: decision max `-415` on `main` (`-413` held by 6.32's unlanded branch) ⇒ next `-416`; roster Row 43 on `main`
(Row 42 held by 6.32's branch) ⇒ next Row 44; migration `0188_degraded-bridge-sms` on `main` (journal `when` 1795837200033), and 6.32's
branch holds a colliding `0188_ground-inspection-questionnaire` (`when` 1795750800032) that it renumbers to ≥ `0189` at its rebase
(6.32 FS18) ⇒ this story's migration is `0189` if it lands first, else `0190`, with a `when` above every sibling's; ledger
`2026-10-29` on `main` ⇒ this creation takes `2026-10-29a`. Re-find every one AT THE TIME OF USE across `main`, every branch and every
worktree.

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
            pinning the post-death publication clause"*; `sahyog-vivran.ts:41` — `NAME_PUBLICATION_AUTHORISED` is false, so the name is
            *"null ON EVERY DRIVE TODAY, BY DESIGN"*). `2026-09-02-173` gave Sahyog Vivran its own ruling at the full name and kept it
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
      starting OFF (FS3) — the `-415` FS17 shape (*"⛔ The feature-flag store"*).
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
> the member opens a channel or says "Not now", plus a permanent settings entry. The ask never blocks anything and never says the member
> must join. **Day-one output: nothing is posted and nothing is shown.** The switch starts OFF, no Pariwar has a channel configured, and
> the go-live row (FS13) waits on PQ1, which asks whether a public channel may name a deceased member's family.
>
> **What it REUSES:** the Pariwar's Telegram bot credential (`pariwar_telegram_config.bot_token_secret_name`) and the real `sendMessage`
> client (`telegram-app.ts`); `resolvePoolIdentity` and the fan-out's identity wiring; `listCycleBindingCandidates`; `operationalDate`;
> the cycle-open post-commit hook and the deadline sweep's day computation; `withCompensatingAudit`; the channel-config admin module and
> `pariwar.configure_channels`; the 6.36c `HomeReminderCard` frame; the house `Linking.openURL` shape; the copy-key pin test pattern.
>
> **What it CHANGES:** ONE migration (a per-Pariwar config table + a post-record table); contracts (config DTOs, the member read, the
> post-record view, the post builder); two API route groups (admin config + posts list, member read); a jobs queue + handler and two
> enqueue hooks; the Telegram client (a request timeout, `retry_after` on its error, a `signal` on its fetch seam — FS7); the admin
> channel-config page; a mobile screen, a home card, a settings entry, a dismissal store; en + hi copy; the friction ledger;
> architecture §3.4 annotation; a roster row; epics.md.
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
| Story 5.11 FS16 (b) (`5-11-…md:426-432`) | ⛔ "TWT:" in the words — the sender carries the Trust's name | BigDev's reasoning — FS8 applies it |
| deferred-work "The Trust's announcement channels…" (Story 5.11 section) | open (2)–(5) + how a member is asked; *"Stays OPEN until that row is `done`"* | HOMED here — Closed by 5.14 effective when `done` on `main` |
| Architecture §3.4 annotations 2026-10-23 (×2) | the channels' place *"still owed"* | owed — Task 0.4 writes it |

## ⭐ THE INVARIANTS

- **I1 — Nothing is posted and nothing is shown unless a Pariwar admin has switched the channels on.** The config row starts OFF; the
  job reads the switch AT POST TIME (by design — a later switch-off stops later posts) and records `skipped:switch_off` otherwise; the
  member read returns no link while it is off. *Proof:* AC3, AC5.
- **I2 — At most one post per (Pariwar, occasion, subject).** The post record's UNIQUE key (`pariwar_id`, `occasion`, `subject_id`) —
  `subject_id` = the pool id for `pool_open`, the alert id for `last_day` — is the ONLY at-most-once guard (⛔ `singletonKey`: on this
  repo's standard queues it *"is only a label … and dedupes nothing"*, `contribution-notify-triggers.ts:739-741`). The claim (`INSERT … ON
  CONFLICT DO NOTHING` with a `claim_token`) commits BEFORE the Bot API call; only the holder of the row's `claim_token` may re-attempt it
  (a 429), and a stale `attempting` row becomes `unknown`, never re-posted. *Proof:* AC6.
- **I3 — No post is reported made without a real `ok: true` from Telegram.** The poster NEVER reaches `createFixtureTelegramProvider`
  (which returns `accepted` with no send — F5). *Proof:* AC6.
- **I4 — Nothing about one member is ever posted, and no name is ever stored.** A post carries only the pool label, the family's name
  (G2 / PQ1) and the cycle's last date; the builder's input type has no member field; the post record holds ids, states, the date and
  the pool label — ⛔ the family's name, ⛔ the post text (FS15). *Proof:* AC4, AC7.
- **I5 — The family's name is the ruled one, whole — or absent.** Which variant posts is ONE exported constant (FS6) set from PQ1's
  answer; the name comes from `resolvePoolIdentity` (or the public resolver, if PQ1 so rules — G3); never truncated; a pool whose name
  cannot be resolved is `refused:identity_unavailable`, ⛔ posted without the name. *Proof:* AC4.
- **I6 — One Pariwar's notices never reach another Pariwar's channel.** Config, post record and job are keyed by `pariwar_id` under the
  tenant RLS (`twt_app` + per-command tenant policies); the job reads inside `withPariwarScope` for the alert's own Pariwar. *Proof:* AC1,
  AC3, AC6.
- **I7 — The app stays official, joining stays a choice, and the app never claims what is not yet true.** Every member-facing string says
  the app is where every notice is; ⛔ "must", "required", "miss", or a consequence of not joining; the card and screen show only links
  that exist, only while the channels are on; the ask never gates any step and is never re-shown on that device after "Not now" or a
  successful open. *Proof:* AC8, AC9.
- **I8 — The frozen channel core and the per-member mirror do not move.** `dispatch`, `cascade`, `CANONICAL_CHANNEL_LADDER`,
  `TELEGRAM_ELIGIBLE_CATEGORIES`, `resolveTelegramTarget`, `provider-composition.ts`, the opt-in surfaces, the webhook processor and the
  `telegram_mirror` flag are left unedited; `channels-determinism` stays green. The ONLY change to `packages/channels` is the client's
  timeout + `retryAfter` + `signal` (FS7). *Proof:* AC11.
- **I9 — A post is never on the member's critical path.** The jobs are enqueued post-commit, best-effort (a failure alarms, never fails
  the cycle-open mint or the sweep); the per-member fan-out is unchanged in order and content. A dropped `pool_open` enqueue is NOT
  re-enqueued by any sweep (the cycle-open sweep re-enqueues only un-minted cycles — `cycle-open-alert.ts:7-18`) — an ACCEPTED cost for a
  mirror, recorded in the decision; the admin "Posts" list shows it as *"not attempted"* (AC2). *Proof:* AC5.

## 📜 Policy meaning (AI-10-1)

**5.14 introduces no predicate that gates a member's access to a benefit.** The channels are mirrors a member is asked to join (G1,
G4). Whether a member joined is unknown to the Trust (F13) and is read by nothing. A missed post changes nothing a member is owed or
counted for. R7's missed-cycle counting and R8's ninety-percent rule read contribution facts, never channel membership. The one
predicate it does introduce, the home card's display condition, gates only whether a card is SHOWN. In the member's terms: *"If your
Pariwar has Trust channels, the app shows you once where to follow them; following one or not changes nothing you are owed, and every
notice is still in the app."* **Niyamavali check, done 2026-10-29, with this result:** a case-insensitive search of
`packages/domain/seed/niyamavali-v1-clauses.sql` for *telegram | whatsapp | channel | notif | missed information* finds no clause. R10(B)
lives in the PRD's FR-94 T&C phrasing, not the seed. It makes missed information the member's responsibility, with the app as the
official channel. The channels add a route and remove none, so the sentence is CONSISTENT with R10(B) as written. (The Niyamavali is a
rulebook, not a ratified spec — [[feedback_niyamavali_rulebook_not_spec]].) ⚠ Re-run the search at Task 0.1; if a clause has appeared,
re-check this note.

## ⭐ FOUND FACTS (traced at `282bdd33`; traced to code, not read from prose — re-verify at Task 0.1)

**Telegram today: a per-member mirror, never a channel**
- **F1 — the client is real and per Pariwar.** `packages/channels/src/providers/telegram-app.ts:149` POSTs
  `https://api.telegram.org/bot<token>/sendMessage`; the body is `{ chat_id, text }` only (`:97-100` — plain text, no `parse_mode`);
  the client cache is keyed per Pariwar (`messagingFor(pariwarId, config)`, `:56`, `:139-203`); a rotated token is picked up only on
  restart (`:20-23`). ⚠ **No request timeout**, and the seams cannot carry one: `FetchInit` is `{ method, headers, body }` (`:61-65` — no
  `signal`); `TelegramSendError` carries only `telegramCode` and `httpStatus` (`:75-87`) and the error extraction (`:103-116`) DISCARDS
  `parameters.retry_after` ⇒ FS7. (WhatsApp has `AbortSignal` — `whatsapp-app.ts:280-303`; MSG91 `SMS_GATEWAY_TIMEOUT_MS = 9_000` —
  `sms-app.ts:189`.) A timeout today classifies as `api_unavailable` (httpStatus 0 in `telegram-errors.ts` `classForCode`). A channel
  `chat_id` (`@username` or the `-100…` numeric id) fits the existing `TelegramTextMessage { chatId, text }` shape unchanged.
- **F2 — the last day can never reach Telegram today.** `TELEGRAM_ELIGIBLE_CATEGORIES` = `alert_published`, `module_new`,
  `niyamavali_amended` (`packages/channels/src/dispatch.ts:48-52`); the day 5 / 10 / 13 / 14 reminders are category `deadline_reminder`
  — excluded. ⇒ the channel poster does NOT go through `dispatch` (I8); it calls the messaging handle directly.
- **F3 — config and token are per Pariwar.** `pariwar_telegram_config` (migration `0045`; schema
  `packages/domain/src/schema/pariwar_telegram_config.ts:28-57`): PK `pariwar_id`; `enabled` (default false — the per-member mirror's
  switch), `bot_username`, `bot_token_secret_name`, `webhook_secret_token_secret_name`; grants `twt_app` S/I/U/D with tenant policies
  (`0045:32,36-37`). Secrets are stored as NAMES; jobs resolve them with `resolveChannelSecret`
  (`apps/jobs/src/scheduler/contribution-providers.ts:80-88` — it THROWS on not-found AND on an outage alike), already imported in
  `apps/jobs/src/boot.ts:124`. The composition (`packages/channels/src/composition/provider-composition.ts:235-265`, jobs wiring `:525-540`)
  returns null ⇒ FIXTURE when the row is missing, `enabled` false, or the secret name blank.
- **F4 — the webhook processor is safe for a channel bot (traced at the pin).** `apps/jobs/src/tg-webhook-processor.ts` parses only
  `message` and `my_chat_member` (`:167-233`). Making the bot a channel admin sends `new_chat_member.status = 'administrator'`, ⛔ in
  `{kicked, left}` (`:40`, `:217`) ⇒ no effect; removing it carries `chat.id = -100…`, and `listActiveOptInsByChatId` matches only members'
  private-chat ids (positive user ids) ⇒ no effect; channel posts arrive as `channel_post`, never parsed. ⇒ ⛔ an edit; ONE regression test
  (a channel `my_chat_member` left / kicked with a `-100…` id flips no opt-in). ⚠ Side effect: no `allowed_updates` is set anywhere, so a
  human admin's `channel_post` update (which may carry a family's name) is persisted raw by the webhook ingress
  (`apps/api/src/modules/channel-webhooks/handlers.ts:119,170`) ⇒ FS13 leg (a) sets `allowed_updates: ["message","my_chat_member"]` when
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
  `resolvePoolIdentity` (`packages/domain/src/notifications/pool-identity.ts:201`) returns `null` — never throws — on a decrypt failure or
  an unresolvable name (`:216-229`).
- **F8 — the last day.** `runDeadlineReminderSweep` (`contribution-notify-triggers.ts:1398-1505`; cron `'30 9 * * *'` IST, `:95`) scans
  live alerts across Pariwars; `cycleDay = cycleDayFromCommittedAt(committedAt, now)` (`:1430`); non-send days skipped
  (`isDeadlineReminderSendDay`, days `[5, 10, 13, 14]` — `packages/contracts/src/alerts/contribution-loop-templates.ts:135`);
  `deadlineAt = committedAt + CYCLE_WINDOW_DAYS days` (`:1435`); then `listCycleBindingCandidates` (`:1437-1444`), whose throw is caught
  at `:1488`. The day-14 member reminder shows `"Today, {date}"` (`contribution.json:98`) with `date: operationalDate(input.deadlineAt)`
  (`operationalDate` at `:320-326`, used by `buildDeadlineReminderAlert`). ⇒ the last-day hook goes AFTER `:1435` and BEFORE `:1437`, so a
  pool-read throw cannot suppress it.
- **F9 — the existing member copy speaks to ONE member** (`"Your pool is open — {pool}"`, `contribution.json:92-93`) and the CHANNEL DRAFT
  rows were *"written as texts"* — "your pool [pool]" — so on a channel every member reads they would tell members of other pools "your
  pool" ⇒ FS8 adapts the words.
- **F19 — `singletonKey` dedupes nothing here** (`contribution-notify-triggers.ts:739-741`, `:1476-1477`, review R4-P5) ⇒ I2. pg-boss
  v12 needs `boss.createQueue(QUEUE_NAMES.X)` before send / work (`boot.ts:394`; `cycle-open-alert.ts:264`); `retryDelay` is fixed at
  send time ⇒ a `retry_after` delay is a re-send with `startAfter`.

**Where the ask can live (mobile)**
- **F10 — home.** `apps/mobile/app/(tabs)/index.tsx:54-115`: `ActiveContributionCard` first (8.2 AC), … `<HomePromptCards />` (`:84`)
  … `<LanguageSettingsEntry />` (`:105`), `<NotificationSettingsEntry />` (`:107`), `<TelegramNotificationSettingsEntry />` (`:109`) …
  Source pins: `apps/mobile/tests/unit/language-source-pins.test.ts:82-85` (Language directly above Notification), `:88-100` (no `[t]`
  dep in `(tabs)/index.tsx`); `peer-request.test.ts:192-196`. `HomePromptCards` shows ONE card chosen by `chooseHomeCard`
  (`apps/mobile/lib/home-cards.ts:13`, `:26-47`) from the known-people prompts read (`HomePromptCards.tsx:43,51`); the frame is
  `components/home/HomeReminderCard.tsx:12-58` — it renders NO label of its own: it takes a `dismissLabel` prop (`:16-27`, `:50-55`) and
  callers pass namespace keys (`known_people.card.dismiss`, `workplace.card.dismiss`). The 6.36c dismissal store
  (`apps/mobile/lib/home-card-dismissals.ts`) PRUNES every entry older than 30 days from its shared map on each `dismissCard`
  (`:68-77`) ⇒ a "for good" dismissal cannot live in it (FS10); sign-out clearing is wired in `apps/mobile/lib/session-context.tsx:40,171`.
- **F11 — links.** The house shape: `try { await Linking.openURL(url) } catch { … }` with `accessibilityRole="link"`
  (`components/sahyog-vivran/SahyogVivranEntry.tsx:116-141`; its comment: `openURL` REJECTS — do not copy the bare-`void` precedent at
  `(auth)/terminated.tsx:94`). `https://` links need no `LSApplicationQueriesSchemes` / `<queries>` (`app.config.ts` declares none) — never
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
  `pariwar.<x>_update` (`:96,184,259`); ADR-0030 lists the compensated handlers (`docs/adr/ADR-0030-compensating-audit-mechanization.md:71-75`).
  Module registration: `apps/api/src/server.ts` (`registerChannelConfigModule` `:44` / `:250`; member modules `:298` / `:303`). Admin form
  `apps/admin/src/modules/channel-config/TelegramConfigForm.tsx:1-82`, composed in `ChannelConfigPage.tsx:33-60`; hooks
  `apps/admin/src/api/hooks.ts:1470-1475`.
- **F15 — the at-most-once send record.** `alert_sms_sends` (migration `0184`): UNIQUE `(alert_id, member_id, occasion)`, a `claim_token`
  (`:45`, `:59`), CHECK-pinned enums, a finished row frozen by trigger; grants `twt_app` SELECT + COLUMN-LIMITED INSERT / UPDATE
  (`:71-77`); per-command tenant policies `<table>_tenant_isolation_{select,insert,update}` with
  `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`. Requires `member_id` ⇒ cannot hold a channel post ⇒ a NEW
  table (FS2). Its RLS / CHECK-lockstep test: `packages/domain/tests/integration/rls/alert-sms-sends-policy-regression.spec.ts`
  (`checkValues(client, '<check_name>')` against the exported constants, `:264`, `:285`).
- **F16 — the member read precedent.** `GET /api/v1/member/wa-opt-in` → `WaOptInStatusResponse` (`packages/contracts/src/wa-opt-in/opt-in.ts:73-83`);
  client `packages/api-client/src/index.ts:1044-1090`, mobile wrapper `apps/mobile/lib/member-api.ts`. OpenAPI is NOT automatic: a new
  module is added to `packages/contracts/scripts/emit-openapi.ts` (dynamic import `:158` / `:180`, components, `registry.registerPath`) and
  the barrel `packages/contracts/src/index.ts:94-107`; then `pnpm contracts:emit-openapi` and `pnpm contracts:check-openapi-determinism`
  (never hand-edit `openapi/v1.yaml`).
- **F17 — copy.** `packages/i18n/locales/{en,hi}/common.json` (flat dotted keys; families `waNotifications.*`, `telegramNotifications.*`);
  `t()` throws on unknown keys / missing params; neither `@twt/contracts` nor `@twt/domain` depends on `@twt/i18n` (jobs import `t` —
  `contribution-notify-triggers.ts:73`) ⇒ a shared builder takes `t` as a PARAMETER; parity by `pnpm i18n:check`; tone by
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
  last_day}, subject_id, alert_id, pool_label text NULL, last_date text NULL (DD-MM-YYYY), state ∈ {attempting, posted, refused, unknown,
  skipped}, detail, claim_token, telegram_message_id text NULL, attempt_count, created_at, updated_at)`, UNIQUE `(pariwar_id, occasion,
  subject_id)`, CHECKs on every enum and on `detail`'s shape, a finished row frozen by trigger, FORCE RLS, `twt_app` SELECT + column-limited
  INSERT / UPDATE, per-command tenant policies — the `0184` shape. ⛔ No family name, ⛔ no post text (FS15). *Cost (a):* one migration
  (numbering contested with 6.32 — NUMBERS). **(b) no record — rely on queue keys.** *Cost (b):* `singletonKey` dedupes nothing (F19) ⇒
  duplicate posts; nothing answers "was this pool's opening posted?".
- **FS3 — the switch and the config.** ⭐ **(a) a new per-Pariwar table `pariwar_announcement_channels`**: `pariwar_id` PK, `enabled
  boolean NOT NULL DEFAULT false` ("channels live" — Telegram posting ON, the links SHOWN to members, the WhatsApp words offered to the
  admin), `telegram_channel_chat_id text NULL` (CHECK `^@[A-Za-z][A-Za-z0-9_]{4,31}$` or `^-100[0-9]{1,16}$`), `telegram_invite_url text
  NULL` (CHECK `^https://t\.me/`), `whatsapp_channel_url text NULL` (CHECK `^https://(www\.)?whatsapp\.com/channel/`), `updated_by_actor`,
  `updated_at`; the `0045` grants (`twt_app` SELECT / INSERT / UPDATE) + tenant policies; written on the request's scope tx under
  `pariwar.configure_channels` with `withCompensatingAudit` (action `pariwar.announcement_channels_update`; one line added to ADR-0030's
  list). The poster uses the Pariwar's EXISTING bot credential (`pariwar_telegram_config.bot_token_secret_name`) — the bot is made an admin
  of the channel with "Post messages" — and does NOT require the per-member mirror's `enabled` (F3). *Cost (a):* posting needs the bot row
  with a secret name even if the mirror stays off; one switch covers both channels (an admin cannot show WhatsApp while Telegram posting is
  off — they can leave the Telegram chat id blank instead). **(b) add the columns to `pariwar_telegram_config`.** *Cost (b):* a WhatsApp link
  in a Telegram table; the 5.5 PUT DTO, form and fixtures change shape. **(c) a second bot token for the channel.** *Cost (c):* a second
  secret per Pariwar for no gain. **(d) gate posting on the `telegram_mirror` feature flag as well** (G7's other reading). *Cost (d):* this
  story becomes the flag's first consumer and must meet `-070`'s condition (the flag store's production-activation steps) before go-live.
- **FS4 — the WhatsApp Channel (F12).** ⭐ **(a) by hand, with ready words:** the admin "Posts" list shows the Pariwar's pool openings and
  last days of the last 15 days, each with its exact bilingual words (rebuilt at read — FS15) and a Copy button; ⛔ any automation, ⛔ any
  unofficial gateway. *Cost (a):* whether a WhatsApp post was made is not recorded; the WhatsApp Channel can lag the Telegram one.
  **(b) (a) plus a "Posted to WhatsApp" mark per post** (audited). *Cost (b):* a second state machine and an admin chore; the mark is
  self-reported. **(c) nothing — admins compose posts themselves.** *Cost (c):* the words drift from BigDev's, and the `-180` / PQ1 name
  rule is enforced by no one.
- **FS5 — post granularity (F7, F8).** ⭐ **(a) one post per POOL when a cycle opens (each names its pool and family), and ONE post per
  CYCLE on its last day (no pool, no name — every pool of a cycle shares the window).** *Cost (a):* N opening posts in a burst (Telegram
  throttles ~20 / minute in a group — the job paces ≥ 3 s and honours 429); the last-day post names no pool. **(b) one combined opening
  post.** *Cost (b):* Telegram's 4096-character cap after ~12 bilingual pools and a split rule; one failure loses every family's post.
  **(c) per pool for both.** *Cost (c):* N identical "today is the last day" posts on the same date.
- **FS6 — the family's name (G2, G3, PQ1).** ⭐ **(a) build BOTH word variants and select by ONE exported constant
  `ANNOUNCEMENT_POST_NAME_MODE: 'member_facing' | 'none'`, set to `'member_facing'` (per `-390` / `-180` as written) with a test pinning
  it to the decision; PQ1's answer can flip it in a one-line change + its tests (B ⇒ `'none'` until the post-death clause is pinned —
  today that is every member; a later "per member's own Terms" wiring is a deferred item, ⛔ built here); go-live leg (d) is PQ1's
  answer.** *Cost (a):* if PQ1 rules A with the PUBLIC form (G3 sub-question), a third mode wires the public resolver — small, later.
  Nothing is posted before go-live anyway. **(b) build only the named variant.** *Cost (b):* a B ruling becomes a builder change. **(c)
  build only the unnamed variant now.** *Cost (c):* narrows `-180` without a ruling — the Panel's.
- **FS7 — sending (F1, F5, F19).** ⭐ **(a) the poster resolves the Pariwar's bot secret itself and calls the messaging handle; the
  Telegram client gains: an injectable `timeoutMs` (default 9 000 — the MSG91 value) via a `signal` on `FetchInit`; `retryAfter` on
  `TelegramSendError` (from `parameters.retry_after`); a timeout keeps today's class `api_unavailable` on the mirror path (⛔ new
  `TelegramErrorClass` member — the mirror's tests enumerate the union). Outcomes: `ok: true` ⇒ `posted` + `message_id`; HTTP 429 ⇒ the row
  stays `attempting` (same `claim_token`) and the job RE-SENDS itself with `startAfter = retry_after` s (definitely not posted); any other
  `ok: false` ⇒ `refused:tg_<error_code>` + ONE alarm per Pariwar per class; a timeout or network error ⇒ `unknown` (it may have posted) +
  ONE alarm, ⛔ retried; an `attempting` row older than 30 minutes with no 429 detail ⇒ `unknown` + alarm on the next touch, ⛔ re-posted.**
  Branch on `error_code` / `retry_after`, ⛔ on `description` (Telegram: *"subject to change"*). Never hold a transaction or a pool client
  across the call or the pacing sleep (T8). *Cost (a):* an ambiguous timeout may leave one post missing rather than doubled; the mirror's
  hung call now ends `rejected` after 9 s instead of hanging (a fix — recorded). **(b) retry on timeout.** *Cost (b):* a possible duplicate
  post. **(c) no client change.** *Cost (c):* no timeout ([[project_jobs_pool_two_connection_starvation]]) and 429 handling impossible.
- **FS8 — the words (F9).** ⭐ **(a) BigDev's CHANNEL DRAFT words, adapted from "your pool" to a channel every member reads, ⛔ the
  "TWT:" prefix (Story 5.11 FS16 (b): the sender carries the Trust's name — here the channel's name does), one BILINGUAL post (Hindi, a
  blank line, English); the Hindi needs BigDev's review (roster leg (c)).** *Cost (a):* BigDev's reviewed words change (*"your pool"* →
  *"if you are assigned to this pool"*). **(b) the drafts verbatim.** *Cost (b):* members of other pools are told "your pool is open".
  **(c) two posts per notice (one per language).** *Cost (c):* doubles the burst and the noise.
- **FS9 — where the ask lives (G9, F10).** ⭐ **(a) a home card (the `HomeReminderCard` frame) shown while the channels are on, at least
  one link exists, and the member has not dismissed it on this device; plus a permanent settings entry "Trust announcement channels"
  after the Telegram entry on home, opening a screen with the same words.** *Cost (a):* a card outside `chooseHomeCard` (FS11); a reinstall
  or a new device shows the card once more. **(b) the settings entry only.** *Cost (b):* barely an "ask" — `-390` says members ARE asked.
  **(c) a signup wizard step.** *Cost (c):* a forced screen for every new member (5.10's precedent — a forced friction row, the step-label
  jump) for a mirror R10(B) calls *"not official"*. **(d) a 10.9 banner.** *Cost (d):* a banner has no link field
  (`MemberBannerResponse`, `packages/contracts/src/banners/dto.ts:200-214`).
- **FS10 — how often (G9).** ⭐ **(a) ONCE per device: "Not now", or a successful open of either link, hides the card for good on this
  device (a NEW sibling MMKV module, key `announcement-channels.card-dismissed.v1.<accountId>`, no expiry, cleared on sign-out via
  `session-context.tsx`); a failed open shows `link_error` inline and keeps the card; the settings entry stays.** *Cost (a):* a member who
  said "Not now" is not re-asked unless they reinstall / change device / sign out. **(b) the 6.36c 30-day re-show.** *Cost (b):* a recurring
  prompt for a mirror — the "nagging" the UX spec rules out. **(c) server-recorded once per member.** *Cost (c):* a new member-preference
  table for a mirror; it records a choice about a channel the Trust cannot see (F13).
- **FS11 — the card's data source.** ⭐ **(a) a separate `<AnnouncementChannelsCard />` directly AFTER `<HomePromptCards />`, fed by its
  own query on the member read; it renders nothing while loading, on error, or when no link is returned.** *Cost (a):* two reminder cards
  can show at once — bounded: this one shows once. **(b) a new `HomeCardKind` inside `chooseHomeCard`.** *Cost (b):* a second data source
  in a pure chooser; this card competes with the known-people prompts and may never show.
- **FS12 — the member read.** ⭐ **(a) `GET /api/v1/member/announcement-channels` → `{ whatsappChannelUrl: string | null,
  telegramChannelUrl: string | null }` (`.strict()`); BOTH null while `enabled` is false (I1 — the app never says posts are made before
  they are); member auth; the member's own Pariwar from the session.** *Cost (a):* one route, one contract, an OpenAPI diff.
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
  (channels on, chat id set, bot resolvable) and never stores the text; a `skipped` row holds ids, the pool label and the date only; the
  admin "Posts" list REBUILDS the words at read in the API (a named admin surface decrypting through the existing API KMS deps, under
  `pariwar.configure_channels`) from the Pariwar's alerts and pools of the last 15 days LEFT JOINED to the post rows (so a dropped enqueue
  shows *"not attempted"* — I9).** The builder is a pure function in `packages/contracts/src/announcement-channels/` that takes `t` as a
  parameter (F17); jobs and API pass the real `t`. *Cost (a):* a KMS decrypt per pool per admin page view (admin scale); ⛔ erasure work —
  no new column holds a name ([[project_append_only_guard_names_erasure_columns]]). **(b) store `post_text` on the row.** *Cost (b):* the
  deceased's decrypted name in plaintext at rest, against architecture's *"member name remains Tier-1 ciphertext"*, plus an RTBF / guard-
  function change. **(c) envelope-encrypt `post_text`.** *Cost (c):* a new ciphertext column, KEK handling and erasure treatment for a
  convenience.

### The words (FS8 (a)) — DRAFT, for BigDev's review at Task 0.2 (Hindi ⚠ unreviewed)

The posts (one bilingual message each; Hindi first, a blank line, then English; plain text, ⛔ `parse_mode`, ⛔ links). Namespace
`contribution`, keys `channel_post.pool_open.named`, `channel_post.pool_open.unnamed`, `channel_post.last_day`, with a `$comment` naming
this story:

| Key | Variables | English | Hindi (DRAFT) |
|---|---|---|---|
| `channel_post.pool_open.named` (FS6 `member_facing`) | `pool` · `family` | Pool {pool} is now open, in support of {family}'s family. If you are assigned to this pool, please open the app to contribute. | पूल {pool} अब खुल गया है, {family} के परिवार के सहयोग हेतु। यदि आप इस पूल से जुड़े हैं, तो सुविधानुसार ऐप खोलकर योगदान करें। |
| `channel_post.pool_open.unnamed` (FS6 `none`) | `pool` | Pool {pool} is now open. If you are assigned to this pool, please open the app to contribute. | पूल {pool} अब खुल गया है। यदि आप इस पूल से जुड़े हैं, तो सुविधानुसार ऐप खोलकर योगदान करें। |
| `channel_post.last_day` | `date` (DD-MM-YYYY) | Today, {date}, is the last day of this cycle. If you are able, please contribute in the app. | आज, {date}, इस चक्र का अंतिम दिन है। यदि संभव हो, तो कृपया ऐप में योगदान करें। |

The app (namespace `common`, family `announcementChannels.*`; ⛔ "must", ⛔ "miss", ⛔ "required", ⛔ "Settings"). The body has three
variants so it never names a channel that has no link (I7):

| Key | English | Hindi (DRAFT) |
|---|---|---|
| `announcementChannels.card_title` | The Trust's announcement channels | ट्रस्ट के सूचना चैनल |
| `announcementChannels.body_both` | Pool openings and each cycle's last day are also posted on the Trust's WhatsApp Channel and Telegram channel. Joining one is your choice — every notice is always in this app. | पूल खुलने और हर चक्र के अंतिम दिन की सूचना ट्रस्ट के WhatsApp चैनल और Telegram चैनल पर भी दी जाती है। किसी एक से जुड़ना आपकी इच्छा है — हर सूचना हमेशा इस ऐप में रहती है। |
| `announcementChannels.body_whatsapp` | Pool openings and each cycle's last day are also posted on the Trust's WhatsApp Channel. Joining it is your choice — every notice is always in this app. | पूल खुलने और हर चक्र के अंतिम दिन की सूचना ट्रस्ट के WhatsApp चैनल पर भी दी जाती है। इससे जुड़ना आपकी इच्छा है — हर सूचना हमेशा इस ऐप में रहती है। |
| `announcementChannels.body_telegram` | Pool openings and each cycle's last day are also posted on the Trust's Telegram channel. Joining it is your choice — every notice is always in this app. | पूल खुलने और हर चक्र के अंतिम दिन की सूचना ट्रस्ट के Telegram चैनल पर भी दी जाती है। इससे जुड़ना आपकी इच्छा है — हर सूचना हमेशा इस ऐप में रहती है। |
| `announcementChannels.join_whatsapp` | Open the WhatsApp Channel | WhatsApp चैनल खोलें |
| `announcementChannels.join_telegram` | Open the Telegram channel | Telegram चैनल खोलें |
| `announcementChannels.not_now` | Not now | अभी नहीं |
| `announcementChannels.entry` | Trust announcement channels | ट्रस्ट के सूचना चैनल |
| `announcementChannels.screen_title` | Announcement channels | सूचना चैनल |
| `announcementChannels.link_error` | This link could not be opened on your phone. | यह लिंक आपके फ़ोन पर नहीं खुल सका। |

⚠ Run every string through `pnpm microcopy:check` and the tone checklist (`docs/tone-review-checklist.md`). Match the
`telegramNotifications.*` family's register. ⚠ Interim truth (I7): the WhatsApp body says notices are "posted" there; that depends on the
admin posting by hand — the switch's on-label in the admin form says so (AC2), and the decision records it as FS4 (a)'s accepted gap.

### PQ1 — for the Trustee Panel (ONE short note; blocks go-live leg (d), ⛔ the build)

**Plain English:** the Panel agreed on 2026-10-23 that the Trust's channel post for a pool opening names the deceased member's family.
It was told a WhatsApp Channel is public. But every public page the Panel has ruled on names a deceased member only if THAT member had
accepted a Terms version that allows naming after death (`-160`). Until the clause is written and pinned, the page shows no name
(`-173`); today that holds for every member. The October note did not mention this rule. **The one fact that decides it:** a WhatsApp
Channel can be found and read by anyone, so as built per October the channel would be the only public place a deceased member is named,
and the only one without the member's own agreement. Options:
- **A — name every family, as October accepted.** Cost: public naming with no per-member basis, unlike every public page. Sub-question:
  in the member-facing form, or the public form, which leaves out a one-word name.
- **B — follow the public pages' rule.** Name a family only when the deceased member accepted the Terms that allow it. Today that means
  pool only, and names appear once the clause exists. Cost: it narrows `-180` for these posts until then; members still see the name in
  the app.
- **C — name the family on Telegram, as a private invite-only channel, and the pool only on WhatsApp.** Cost: two sets of words, and an
  invite link can be forwarded, so private is not secret.

**Our reading:** B, because it treats the channel like every public page the Panel has already ruled on and costs members nothing: the
name is in the app. The note is written from `trustee-panel-routing-note-TEMPLATE.md` at Task 0.3 and recorded as NOT sent until BigDev
sends it ([[feedback_shown_to_panel_means_sent]]). Its "How much to trust this note" records that v1.0 of this story cited `-157` as live
and was wrong.

## Acceptance Criteria

**AC0 — Governance before code (Task 0).** The author-commit decision (next free id) recording FS1–FS15 as answered, the §0 readings
G1–G9 (G6's tenancy reading, G7's flag reading and I1's read-at-post-time switch named in its "How much to trust this entry"), I9's
accepted cost, and what it does NOT cover (PQ1, consent / counsel, any other notice posted, a WhatsApp API) is committed ALONE before any
record or code. The PQ1 note is written from the template and its SENT state recorded truthfully. The records commit follows
([[feedback_governance_commits_precede_implementation]]).

**AC1 — The tables exist, start OFF, and are the Pariwar's (FS1, FS2, FS3, FS15).** The migration creates `pariwar_announcement_channels`
(FS3 (a): `enabled` DEFAULT false; the three CHECKs as written; the `0045` grants + tenant policies) and `announcement_channel_posts` (FS2
(a): the UNIQUE, the CHECKs, the `claim_token`, the frozen-row trigger, FORCE RLS, `twt_app` SELECT + column-limited INSERT / UPDATE,
per-command tenant policies; ⛔ a name or text column). A policy-regression spec per table
(`packages/domain/tests/integration/rls/<table>-policy-regression.spec.ts`) proves: as `twt_app` scoped to A, B's rows are invisible and
unwritable; every CHECK's literal set equals the exported domain constants (`checkValues`); a finished post row cannot be updated.

**AC2 — The admin config and posts list (FS3, FS4, FS15, F14).** `GET`/`PUT /api/v1/p/:pariwarId/admin/announcement-channels` and `GET
…/announcement-channels/posts`, gated by `pariwar.configure_channels` (⛔ new permission key — the catalog stays at version 55 / 71 keys);
the PUT validates with the contract (refinements equal to the CHECKs), writes on the scope tx under `withCompensatingAudit` (action
`pariwar.announcement_channels_update`; ⛔ the bot secret is never read or returned by the API); the posts list returns, per pool opening
and per last day of the last 15 days, the bilingual words rebuilt through the shared builder with the real `t()`, the Telegram state
(`posted` / `refused` / `unknown` / `skipped` / *"not attempted"*) and nothing else; 403 / 400 / 404 tested, and a test that a decrypt
failure yields that row's words as unavailable, ⛔ a 500. The admin page (`apps/admin/src/modules/channel-config/`) gains an
"Announcement channels" form (the `TelegramConfigForm` pattern) whose switch reads *"When on: members see these links in the app, and the
system posts pool openings and last days to the Telegram channel. Post the same words to the WhatsApp Channel by hand from the list
below."*, and the "Posts" list with a Copy button per post.

**AC3 — The member read (FS12; I1).** `GET /api/v1/member/announcement-channels` returns the member's own Pariwar's links only while
`enabled` is true, else both null; `.strict()` contract registered via `emit-openapi.ts` + the barrel (OpenAPI diff limited to this and
AC2's routes; determinism check green); 401 unauthenticated; a member of A never receives B's links (live test).

**AC4 — The words and the builder (FS6, FS8, FS15; I4, I5).** `buildAnnouncementPost(t, input)` in
`packages/contracts/src/announcement-channels/` — `input` is `{ occasion: 'pool_open', poolLabel, familyName | null } | { occasion:
'last_day', lastDate }`; a `@ts-expect-error` test proves a member field is refused. It returns Hindi, a blank line, English, through the
injected `t` (tests pass the REAL `t` from `@twt/i18n`). Named / unnamed is chosen by `ANNOUNCEMENT_POST_NAME_MODE` (a test pins its value
to the decision). The family comes from the F7 identity wiring (mode read + `resolvePoolIdentity`). `null` gives
`refused:identity_unavailable`, ⛔ an unnamed post while the mode is `member_facing`. The pool label is `poolName ?? poolLetterCode`. The
date is EXACTLY the day-14 member reminder's: `operationalDate(deadlineAt)` with the sweep's `deadlineAt` passed in the job payload
(export `operationalDate` or pass the formatted string). A test proves the post's date equals the member reminder's `date` param for the
same alert. ⚠ Mirror the reminder's existing day arithmetic; ⛔ "correct" it here. Catalogue parity en / hi.

**AC5 — When posts are enqueued (FS5; I1, I9).** (i) POST-COMMIT in `runCycleOpenAlert`, beside the contribution-notify enqueue (a new
optional `CycleOpenAlertDeps` seam, wired in `registerCycleOpenAlertWorkers`, `boot.ts:789-805`), best-effort with its own alarm, ALSO on
the `minted: false` path: send `announcement.channel.post` `{ pariwarId, alertId, cycleId, occasion: 'pool_open' }`; the handler lists the
cycle's pools and posts each, paced ≥ 3 s, with no transaction held across the pause. (ii) In `runDeadlineReminderSweep`, when `cycleDay
=== 14`, AFTER `deadlineAt` (`:1435`) and BEFORE `listCycleBindingCandidates` (`:1437`), send ONE `{ occasion: 'last_day', deadlineAtIso }`
job per alert in its own try/catch (a failure alarms; the per-pool loop still runs); `cycleDay` 15+ posts nothing (T3). (iii) The handler
reads `enabled`, the chat id and the bot secret name AT RUN TIME. Switch off ⇒ `skipped:switch_off`; no chat id ⇒ `skipped:no_chat_id`;
blank or absent secret name ⇒ `skipped:bot_not_configured`; `resolveChannelSecret` throws ⇒ `refused:secret_unresolved` + one alarm. ⛔ a
call in any of these. A `skipped` row holds ids, the pool label and the date only; ⛔ a decrypt is done for it. The queue is created
(`boss.createQueue`) and its worker registered in jobs boot. The per-member fan-out's enqueue order, payloads and tests are unchanged.

**AC6 — At most once, and honest (FS2, FS7; I2, I3).** States and transitions CHECK- and trigger-enforced; the claim commits before the Bot
API call; only the row's `claim_token` holder re-attempts; the outcomes exactly as FS7 (a). Live tests with a fake Telegram server
(injected `fetchImpl`): a second job for the same subject posts nothing; a retry after `posted` posts nothing; a 429 with `retry_after: 7`
re-sends the job with `startAfter` 7 s and the row keeps its token; a hung server ends `unknown` after the timeout and is never re-posted; a
stale `attempting` row ends `unknown`; with no secret name the outcome is `skipped:bot_not_configured`, ⛔ `posted` (the fixture is
unreachable).

**AC7 — Nothing about a member is posted or stored (I4).** A test drives a pool-open post for a pool with members in several payment
states and asserts the posted text equals `buildAnnouncementPost(t, { poolLabel, familyName })` exactly and contains no member name, mobile,
amount or status; a schema test asserts `announcement_channel_posts` has no column that can hold a name or the text.

**AC8 — The ask on home (FS9, FS10, FS11; I7).** `<AnnouncementChannelsCard />` renders directly after `<HomePromptCards />` (a source pin
added; existing pins unbroken); renders NOTHING while loading, on error, when both links are null, or when dismissed on this device for
this account; shows the body variant for the links present, one button per non-null link (equal props — neither primary) and "Not now"
(`dismissLabel = t('announcementChannels.not_now')`); "Not now" dismisses at once; a join button dismisses only after `openURL` resolves; a
rejected `openURL` shows `link_error` inline and keeps the card. Render tests (jsdom header, `vi.mock('../../lib/mmkv')`, RTL `cleanup`)
cover each branch; the dismissal module has its own unit tests (no expiry; per account; cleared on sign-out); ⛔ a `[t]` dependency.

**AC9 — The settings entry and screen (FS9).** `<AnnouncementChannelsEntry />` (chromeless, the `NotificationSettingsEntry` style)
renders directly after `<TelegramNotificationSettingsEntry />` only when at least one link is returned; `app/(settings)/announcement-channels.tsx`
shows the title, the body variant and the join buttons (equal weight, `accessibilityRole="link"`, `link_error` on failure). A copy-pin test
(the `wa-signup-copy-keys` pattern) pins the `announcementChannels.*` set, resolves each through the real `t()` in en and hi, and bans *must
/ required / miss / Settings / सेटिंग / ज़रूरी / अनिवार्य*.

**AC10 — Records (Task 0.4).** `epics.md` gains `### Story 5.14` after 5.13 (the 5.11 shape: a dated added-note, the story statement, a
short AC summary pointing to this file); architecture §3.4 gains a dated ANNOTATION (⛔ a rewrite) placing the two channels (per Pariwar;
mirrors members are asked to join; Telegram posted by the system via the Pariwar's bot; WhatsApp by hand; two notices only; ⛔ the
per-member mirror; the name per PQ1); the roster gains the FS13 row; ADR-0030's compensated-handler list gains one line; deferred-work's
5.11 channels item gets an appended line (HOMED → building; closes when this row is `done` on `main`) plus a NEW item for FS6's deferred
"per member's own Terms" wiring (trigger: PQ1 ruled B and the post-death clause pinned); the friction ledger gains ONE `optional` row for the
card and a `**Story 5.14 disposition**`.

**AC11 — Nothing frozen moved (I8).** `git diff origin/main -- packages/channels/src/dispatch.ts 'packages/channels/src/cascade*'
packages/channels/src/composition/provider-composition.ts packages/domain/src/notifications/delivery.ts apps/api/src/modules/telegram-opt-in
apps/jobs/src/tg-webhook-processor.ts 'apps/mobile/app/(settings)/telegram-notifications.tsx' packages/domain/src/rbac/permissions.ts
packages/domain/src/feature-flags/registry.ts` is EMPTY; `channels-determinism` green; the Telegram client diff is the timeout + `signal`
+ `retryAfter` alone (+ their tests); the mirror's tests pass unchanged except NEW timeout / retry-after cases; the F4 regression test
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
        `channel-config/` (api or admin), `(tabs)/index.tsx`, `home-card*`, `session-context.tsx`, `emit-openapi.ts`, the roster, ADR-0030,
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
- [ ] **Task 1 — Migration + domain schema (AC1; FS2, FS3)**: hand-written SQL (⛔ `db:generate` — [[project_live_db_test_gotchas]]);
      journal entry with a `when` above every sibling's (re-check 6.32's renumber — [[project_sibling_migration_when_order_shared_db]]);
      `packages/domain/src/schema/{pariwar_announcement_channels,announcement_channel_posts}.ts` (+ schema index); the occasion / state /
      detail constants exported; the two policy-regression specs.
- [ ] **Task 2 — Contracts + words (AC3, AC4; FS6, FS8, FS12, FS15)**: `packages/contracts/src/announcement-channels/` (config DTO, PUT DTO
      with refinements equal to the CHECKs, member response, posts-list view, the builder + `ANNOUNCEMENT_POST_NAME_MODE`); the barrel;
      `emit-openapi.ts`; the `contribution.json` `channel_post.*` keys and `common.json` `announcementChannels.*` (en + hi); contract tests
      (hand-built fixtures — [[project_contracts_tests_outside_tsc]]); builder tests with the real `t`.
- [ ] **Task 3 — Telegram client (AC6, AC11; FS7)**: `signal` on `FetchInit`; injectable `timeoutMs` (default 9 000,
      `AbortSignal.timeout`); `retryAfter` on `TelegramSendError` parsed from `parameters.retry_after`; the timeout stays class
      `api_unavailable`; tests on both paths.
- [ ] **Task 4 — The poster job (AC5, AC6, AC7; I1–I6, I9)**: `QUEUE_NAMES` entry in `packages/queue/src/index.ts`; handler
      `apps/jobs/src/scheduler/announcement-channel-post.ts` (short scope tx: config + pools + claim; NO tx across the call or pause;
      identity via the F7 wiring with `jobsEncryption`; secret via `resolveChannelSecret`; send; short tx: finish row; alarms deduped per
      Pariwar + class); `createQueue` + worker registration and the two enqueue hooks in jobs boot / `cycle-open-alert.ts` /
      `contribution-notify-triggers.ts`; the F4 regression test; live tests per AC6 / AC7.
- [ ] **Task 5 — API (AC2, AC3)**: `apps/api/src/modules/announcement-channels/` (admin config + posts list under
      `/p/:pariwarId/admin/…` with `pariwar.configure_channels`; the member route with member auth); `withCompensatingAudit`; the posts
      list decrypts through the API's existing KMS deps (find the admin decrypt precedent at Task 0.1 and cite it); registration in
      `apps/api/src/server.ts`; route tests (403 / 400 / 401 / 404 / cross-Pariwar / decrypt failure); the access-wrapper checklist walk
      (`docs/access-wrapper-invariants.md`) for both route groups and the job.
- [ ] **Task 6 — Admin UI (AC2; FS4)**: the form + posts list with Copy (`navigator.clipboard.writeText`, a visible "Copied" state) in
      `apps/admin/src/modules/channel-config/`; hooks in `src/api/hooks.ts`; `apps/admin/tests/announcement-channels-page.test.tsx`.
- [ ] **Task 7 — Mobile (AC8, AC9; FS9–FS11, FS14)**: the read in `lib/member-api.ts` + a TanStack query; `lib/announcement-channels-dismissal.ts`
      (no expiry, per account, the injectable `SyncStorage` seam; cleared in `session-context.tsx`); `components/home/AnnouncementChannelsCard.tsx`
      (on `HomeReminderCard`); `components/notifications/AnnouncementChannelsEntry.tsx`; `app/(settings)/announcement-channels.tsx`; home
      wiring + source pins; render + unit tests; copy pin test. Long Hindi labels: the `NomineeMarkControl` multi-line Button pattern
      ([[project_tamagui_button_text_one_line]]); record on-device wrapping as un-attested if no device run.
- [ ] **Task 8 — Records and gate (AC10, AC12)**: commit, then `pnpm friction:check` (row + disposition); `pnpm ci:local` on an isolated DB;
      Debug Log evidence; story → `review`.

## Dev Notes

### ⚠ TRAPS

- **T1 — the fixture says `accepted`.** Never route the poster through `createTelegramBotProvider` / the composition (it falls back to the
  fixture when the mirror's `enabled` is false — F3, F5). Resolve the secret and build the handle directly.
- **T2 — do NOT add `deadline_reminder` to `TELEGRAM_ELIGIBLE_CATEGORIES`** (F2). That would send every member's day 5/10/13/14 reminder
  to their personal Telegram chat — a per-member privacy-posture change (§3.4). The channel post never uses `dispatch`.
- **T3 — the sweep runs daily; the day-14 hook must hold across runs** (a re-run the same day, a late run): the record's UNIQUE holds
  (F19 — the queue key does not); `cycleDay` 15+ posts nothing — test it.
- **T4 — the name needs decrypt deps in jobs AND in the API** (FS15). `resolvePoolIdentity` returns `null` on failure — key
  `refused:identity_unavailable` on `null` and on a failed mode read; ⛔ a post without the name in `member_facing` mode.
- **T5 — the webhook processor is NOT edited** (F4 — verified safe at the pin); add only the regression test. If S4 trips, stop.
- **T6 — `useT()` fresh closure.** Depend on `locale`, never `t` ([[project_uset_fresh_closure_memo_trap]]).
- **T7 — two reminder cards at once (FS11 (a))** — acceptable and bounded; do not "fix" it by hiding known-people cards.
- **T8 — never hold a connection across the send or the pacing sleep** ([[project_jobs_pool_two_connection_starvation]]): claim in one
  short tx, send with nothing held, finish in another short tx.
- **T9 — a Telegram `chat_id` `-100…` exceeds 2^31** — TEXT end to end; never `Number()` it.
- **T10 — plain text, no `parse_mode`.** A family name with `<` or `&` then needs no escaping; if anyone later adds HTML mode, every
  interpolated value must be entity-escaped.
- **T11 — Telegram counts characters, not SMS parts** — a single bilingual pool post is ~300 characters against the 4096 cap.
- **T12 — the friction gate reads committed history** — commit before `friction:check`.
- **T13 — the switch is read at post time ON PURPOSE (I1).** 5.8b's review "fixed" a notify-time re-read of a declaration; here the
  opposite is intended — a switch turned off stops later posts. Do not "fix" it; the decision says so.

### Closed list of edit sites (re-run the greps at Task 0.1)

NEW: the migration + journal entry; `packages/domain/src/schema/{pariwar_announcement_channels,announcement_channel_posts}.ts`;
`packages/domain/tests/integration/rls/{pariwar-announcement-channels,announcement-channel-posts}-policy-regression.spec.ts`;
`packages/contracts/src/announcement-channels/*`; `apps/jobs/src/scheduler/announcement-channel-post.ts` (+ tests);
`apps/api/src/modules/announcement-channels/*` (+ tests); `apps/admin/src/modules/channel-config/AnnouncementChannels*.tsx`;
`apps/admin/tests/announcement-channels-page.test.tsx`; `apps/mobile/lib/announcement-channels-dismissal.ts`;
`apps/mobile/components/home/AnnouncementChannelsCard.tsx`; `apps/mobile/components/notifications/AnnouncementChannelsEntry.tsx`;
`apps/mobile/app/(settings)/announcement-channels.tsx`; mobile tests; the routing note (Task 0.3).
UPDATE: `packages/channels/src/providers/telegram-app.ts` + `telegram-errors.ts` (FS7 only); `packages/queue/src/index.ts`;
`apps/jobs/src/scheduler/cycle-open-alert.ts` (one deps seam + one post-commit send); `apps/jobs/src/scheduler/contribution-notify-triggers.ts`
(the day-14 branch; `operationalDate` export if chosen); `apps/jobs/src/boot.ts` (`createQueue`, worker, wiring); the webhook processor's
TEST file only; `apps/api/src/server.ts`; `packages/contracts/src/index.ts`; `packages/contracts/scripts/emit-openapi.ts`; `openapi/v1.yaml`
(generated); `packages/api-client/src/index.ts`; `apps/admin/src/modules/channel-config/ChannelConfigPage.tsx`; `apps/admin/src/api/hooks.ts`;
`apps/mobile/app/(tabs)/index.tsx`; `apps/mobile/lib/member-api.ts`; `apps/mobile/lib/session-context.tsx`; the source-pin tests;
`packages/i18n/locales/{en,hi}/{common,contribution}.json`; `friction-budget.md`; records (Task 0.4: `epics.md`, `architecture.md`,
`docs/launch-gate-inventory/inventory-roster.md`, `docs/adr/ADR-0030-compensating-audit-mechanization.md`, `deferred-work.md`,
`sprint-status.yaml`, `.decision-log.md`).
⛔ NOT: everything in AC11's list; any SMS file; `home-card-dismissals.ts`; `home-cards.ts`.

### Reuse map

the F7 identity wiring (mode read + `resolvePoolIdentity`, `jobsEncryption`) · `listCycleBindingCandidates` · `operationalDate` ·
`resolveChannelSecret` · the `telegram-app.ts` messaging handle · `withPariwarScope` · `withCompensatingAudit` · the `0184` record shape and
its policy-regression spec · the `0045` config grants · `TelegramConfigForm` · `HomeReminderCard` · the `SahyogVivranEntry` link shape ·
`wa-signup-copy-keys.test.ts`.

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

Task 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Tasks 6 and 7 can run in parallel after 5. The migration number is decided at Task 1 against 6.32's
renumber; if 6.32 lands first, take the next free and rebase.

### Previous story intelligence (5.8b, 5.11, 5.11b, 5.13)

- 5.8b: a switch that starts OFF and a go-live row with a LAST leg is the accepted shape for "built but not live" (T13 on the read-time
  difference).
- 5.11b: claim before the gateway call, with a `claim_token`; never let a fixture report success; alarms deduped per class + Pariwar.
- 5.11: the channel words were BigDev's but "written as texts" (F9) — adapt, then re-confirm with BigDev; ⛔ silently re-word.
- 5.13: copy approved at Task 0.2 is pinned by a key-set test; the approval sentence is quoted verbatim in the Debug Log.
- Every Epic 5 story: the access-wrapper checklist walked by hand for new access entrypoints
  ([[project_access_wrapper_gate_pending_scope]]).

### Git intelligence

The last five commits on `main` are 5.8b's landing and its three review rounds: governance commit first, records commit, then code;
fast-forward landing ([[feedback_land_prs_by_fast_forward]]); ledger entries by safe prepend.

### Latest tech information (researched 2026-10-29)

- Telegram Bot API 10.3 (2026-08-24): `sendMessage` `chat_id` accepts `@channelusername` or the numeric channel id; the bot needs channel
  admin with `can_post_messages`; text 1–4096 characters after entity parsing; errors carry `error_code` (*"subject to change"*) and
  `parameters.retry_after`; the FAQ names ~20 messages / minute in a group and no channel figure — pace ≥ 3 s.
- WhatsApp Channels: no Business Platform API (changelog through 2026-05-12); Channels are public and directory-listed; admins do not see
  followers' numbers unless saved as contacts; up to 16 admins; posting only from the WhatsApp app.
- Expo SDK 55 in the repo (`expo-linking` ~55): `Linking.openURL('https://…')` needs no query-scheme config; the promise rejects when no
  handler — wrap it.

### References

`.decision-log.md` `-390`, `-389` (G10/G12/G13), `-180`, `-181`, `-160`, `-173`, `-070`, `-415` FS17 · the 2026-10-23 routing note Q2 ·
`packages/contracts/src/public-pages/matrix.ts:394-415`, `sahyog-vivran.ts:41` · `5-11-per-member-sms-fallback-fixed-wording.md` "The words",
FS16 · `architecture.md` §3.4 · `prds/prd-TWT-2026-05-22/prd.md` FR-73, FR-94 (R10(B)); `addendum.md` RA-29 · `docs/tone-guide.md` §3 ·
`deferred-work.md` (5.11 section, the channels item; the Telegram re-fetch loop item) · `friction-budget.md` · the files cited in F1–F19.

## Dev Agent Record

### Agent Model Used

### Debug Log References

(a) Task 0.2 answers — verbatim. (b) RED proofs. (c) Gate runs. (d) Task 0.1 preflight. (e) Validation 2026-10-29 (v1.0 → v1.1).

### Completion Notes List

- 2026-10-29: Ultimate context engine analysis completed - comprehensive developer guide created (`bmad-create-story 5.14`, at
  `282bdd33`; four read-only research passes — governance, server code, mobile/admin surfaces, platform docs — then one fresh-context
  checklist verifier).

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-29 | 1.0 | Created (`bmad-create-story 5.14`): FS1–FS14 + PQ1 proposed; ready-for-dev. |
| 2026-10-29 | 1.1 | Checklist validation (one fresh-context verifier; critical claims re-checked by hand): **C1** G3 / PQ1 cited `-157` as live — `-160` superseded its hold; G3 and PQ1 rewritten on `-160`'s per-member basis + the matrix fence + `-173`, with the name-form sub-question. **C2** the stored `post_text` (a decrypted name at rest) removed — NEW FS15 (rebuild at read; no name stored). **H1** FS7 / I8 / AC11 / Task 3 widened to the client's `signal` + `retryAfter`; 429 = re-send with `startAfter`. **H2** grants per `0045` (config) and `0184` (posts). **H3** the builder takes `t` as a parameter in contracts. **H4** links and copy shown only while the channels are on; three body variants. **H5** `singletonKey` dedupes nothing — the UNIQUE + `claim_token` is the guard; stale `attempting` → `unknown`. Mediums: identity-wiring cites; I9's unrecovered enqueue an accepted cost + "not attempted"; `link_error` inline / dismiss on success; a separate no-expiry dismissal module; the edit list (queue, boot, server, emit-openapi, barrel, RLS specs, roster, ADR-0030); the day-14 hook placement; skipped / refused alignment; F4 traced safe (no processor edit; `allowed_updates` at leg (a)); T8 no tx across the send; F11's full trigger; the audit action name. Lows: line offsets, `dismissLabel`, FS16 attribution, G7's `-070` item 2 + contestable reading (FS3 (d)), Terms source, RA-29 file, CHECK regexes, trap order, quoted diff paths, the timeout's class. |
