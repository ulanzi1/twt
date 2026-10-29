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

STATUS: v2.0 (2026-10-29): CODE REVIEW DONE — all four file groups reviewed. Group 1's 7 patches, groups 2–4's 37 patches and the
fix-diff review's 9 follow-ups are applied (BigDev "1" / "2" / "1"). Author-commit `2026-10-29-419` was committed alone. `ci:local` is
36 / 36 in ONE run on a fresh container. Status done; ⛔ pushed; ⛔ landed. Go-live stays roster Row 44.
v1.6 (2026-10-29): THIRD VALIDATION after the rebase onto `770ba815` (6.32 landed) — three fresh-context verifiers; the
decision-level changes are author-commit `2026-10-29-418` (committed alone), the rest applied here (Debug Log (e)); next: Task 0.4.
v1.5 (2026-10-29): Tasks 0.1–0.3 done — FS1–FS15 answered, PQ1 RULED (`-416`, A, full name), the words approved + Hindi reviewed, author-commit `-417` committed; next: Task 0.4 (records), then Task 1. 2026-10-29 created (`bmad-create-story 5.14`) → ready-for-dev. v1.0 → v1.1 the same day: one fresh-context checklist verifier
(2 CRITICAL / 5 HIGH / 12 MEDIUM / 10 LOW), every finding applied and the critical ones re-checked by hand (Change Log). v1.1 → v1.2 the
same day: a second validation (three fresh-context verifiers — jobs / API-admin-mobile / governance-design; 30 findings, all applied by
BigDev's "all"; Debug Log (e)). FS1–FS15
PROPOSED for BigDev at Task 0.2 (ANSWERED 2026-10-29 — as recommended); PQ1 PROPOSED (one Panel question — whether a public channel
post may name a deceased member's family ahead of the rule every public web page follows) — ✅ RULED 2026-10-29, `2026-10-29-416`
(Trustee-ratified, DR + KB): **A, full name**. ⛔ No code before Task 0.3 (the
author-commit decision committed ALONE) and Task 0.4 (records).

START CONDITION — MET at the pin: `-390` Q2 A (Trustee-ratified, 2026-10-23) homed this row; 5.5 (the per-Pariwar Telegram bot, its
config table and real `sendMessage` client), 8.1 (`openCycleAlert`), 8.8 (the fan-out) and the deadline sweep (days 5 / 10 / 13 / 14) are
`done` on `main`. Nothing this story needs is unbuilt elsewhere.

NUMBERS (footguns #19 / #42(e); `-366` decision 6): this file names no decision id, roster Row, migration number or ledger letter as
TAKEN. At the pin they WERE: decision max `-415` on `main` (`-413` held by 6.32's unlanded branch) ⇒ next `-416` (TAKEN 2026-10-29 by the Panel's PQ1 ruling ⇒ this story's author-commit takes
`-417`, re-checked at the time); roster Row 43 on `main`
(Row 42 held by 6.32's branch) ⇒ next Row 44; migration `0188_degraded-bridge-sms` on `main` (journal `when` 1795837200033), and 6.32's
branch ALREADY holds `0189_ground-inspection-questionnaire` (`when` 1795923600034, renumbered in `9eec3559`, 2026-10-29) ⇒ this story's
migration is `0190`, with a `when` above 1795923600034 (`-366` decision 6: a number belongs to the first COMMIT that takes it on any
branch — ⛔ "whoever lands first"); ledger `2026-10-29` on `main`, `-29a` held by 6.32's branch, `-29b` by 11b.5's ⇒ this creation takes
`2026-10-29c` (it first took `-29a` in `05d0dfe9` — a collision, relabelled at v1.2). Re-find every one AT THE TIME OF USE across `main`,
every branch and every worktree — the ledger letter included.
RE-CHECKED 2026-10-29 after the rebase onto `770ba815` (6.32 LANDED — its `-413`, Row 42, `0189` and ledger `-29a`–`-29d` are now on
`main`): decision max `-418` (this branch) ⇒ next `-419`; roster max Row 43 on every ref ⇒ next Row 44; migration `0189` on `main` ⇒
this story's `0190`, journal `when` above 1795923600034; ledger: this branch's `-29c` / `-29d` RELABELLED `-29h` / `-29i` (6.32's
`665c6da3` / `770ba815` landed those letters on `main`; 5.14 took them first, but `main` is not rewritten — the 6.32 `-28l` → `-28w`
precedent); this validation's ledger line is `-29j`, Task 0.4's the next free after it. The sentences above are the PIN-TIME record.

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
      basis — the only public place the TRUST would name a deceased member on NOBODY's permission (⚠ corrected 2026-10-29 at Task 0.3:
      since 11b.4a landed, the family's approved memorial is public in the family's own words, sent with the nominee's code — `-391` Q2 A,
      `-411` — and may name the deceased; and `-198` (BigDev) grounds the member-facing name's exemption in *"publication to the WORLD"*
      vs *"what a mutual-aid group is told"*). ⇒ `-390`'s accepted cost and `-160` / `-173`'s basis gate are
      two RATIFIED positions that may conflict — the template's fourth case ⇒ the Panel's ⇒ PQ1. ⛔ The author does not decide which
      governs ([[feedback_supersede_never_reinterpret]]). (v1.0 of this file cited `-157` as live — WRONG: `-160` superseded its hold.)
      ✅ RESOLVED 2026-10-29 by the Panel — `2026-10-29-416` (Trustee-ratified): *"option A, full name"* — the post names the family in
      the FULL name; `-160` / `-173` do not govern this post and are unmoved for the web pages.
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
      BigDev can raise at Task 0.2 (FS3). (Answered — `pariwar_admin` accepted, `-417` §1 item 3.)
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

Status: done

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
> the go-live row (FS13) waits on legs (a), (b), (e) and the build half of (d). PQ1 is RULED (`-416`: the pool-open post names the
> deceased member in the full name).
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
| `2026-08-28-160`; `2026-09-02-173`; the public-pages matrix fence | the deceased's name public only on the member's own accepted T&C version; each public surface its OWN ruling; Sahyog Vivran *"UNNAMED"* until the clause is pinned | RATIFIED — ⛔ govern this post (`-416` §2 reconciles, this surface only); unmoved for the web pages |
| `2026-10-29-416` PQ1 | *"option A, full name"* — the pool-open post names the family in the full name; the cost as put accepted | RATIFIED — G3, FS6, I5 |
| `2026-10-29-417` | FS1–FS15 as recommended; the words (en + hi) approved, the Hindi reviewed | author-commit (BigDev) |
| `2026-10-29-418` | amends `-417`: identity throw retries; final attempt from pg-boss metadata; last-day date mirrors the reminder (band accepted), stale only past the deadline; counsel leg kept asked-or-accepted; costs / readings / mints | author-commit (BigDev) — governs where it differs from `-417` |
| `2026-08-01-070` item 2 | `telegram_mirror` *"declared, not production-active"* | RATIFIED — G7, untouched (a named reading) |
| R10(B) / Terms v0.2 cl.10 | the app official; Telegram / WhatsApp mirrors | PRD / counsel draft — G4 |
| Routing note `…-2026-10-23-5-11-sms-for-members-without-whatsapp.md` Q2 | the draft posts (BigDev's words, *"written as texts"*); *"The Trust cannot see which of its members joined"*; *"Meta offers no official way for software to post to a WhatsApp Channel"* | AS PUT — kept unedited |
| Story 5.11 "The words" — CHANNEL DRAFT rows (`5-11-…md:447`, `:449`) | `sms.pool_open` / `sms.deadline_last_day` en + hi (BigDev's) | drafts — FS8 adapts them |
| Story 5.11 FS16 (b) (`5-11-…md:426-434`) | BigDev: *"Trust name is already mentioned in SMS header/WhatsApp sender"* — FS16 (b) itself KEPT "TWT:" as the prefix (*"'TWT:' stays as the prefix; no text names the app"*) | FS8 EXTENDS the reasoning (the author's) to drop "TWT:" on a channel — BigDev confirms at Task 0.2 |
| deferred-work "The Trust's announcement channels…" (Story 5.11 section) | open (2)–(5) + how a member is asked; *"Stays OPEN until that row is `done`"* | HOMED here — Closed by 5.14 effective when `done` on `main` |
| Architecture §3.4 annotations 2026-10-23 (×2) | the channels' place *"still owed"* | owed — Task 0.4 writes it |

## ⭐ THE INVARIANTS

- **I1 — Nothing is posted and nothing is shown unless a Pariwar admin has switched the channels on.** The config row starts OFF; the
  job reads the switch AT POST TIME (by design — a later switch-off stops later posts) and records `skipped:switch_off` otherwise (`refused:switch_off` for a `deferred` row — FS2); the
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
  answer — `'full_name'` (`-416`: *"option A, full name"*). In `full_name` mode the name is the deceased member's stored full name:
  `resolvePoolIdentity` with the mode `'full_name'` PASSED (⛔ the Pariwar's presentation mode read — `-416` item 2's reading); never
  truncated, a one-word name shown in full; a pool whose name cannot be resolved (`null`) is `refused:identity_unavailable`, ⛔ posted without the name; a THROWING read
  retries, and only the final attempt refuses (`-418` item 3). In `none` mode NO name is
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
  ⚠ *Dated 2026-10-29 (code review, [`-419`](../../.decision-log.md#decision-2026-10-29-419) item 4):* WIDENED. Review G1-4 / G1-7 also
  changed the shared client: explicit `ok: true` is required, `timeoutMs` must be an integer, and an over-range `retry_after` is ignored.
  So the per-member mirror also treats a 200 without `ok: true` as `rejected`. The rest of I8 holds.
- **I9 — A post is never on the member's critical path.** The jobs are enqueued post-commit, best-effort (a failure alarms, never fails
  the cycle-open mint or the sweep); the per-member fan-out is unchanged in order and content. A dropped `pool_open` enqueue is healed by
  the EXISTING hourly `runContributionNotifyRecoverySweep` (`contribution-notify-triggers.ts:1296`, which already scans every live alert
  and on which `cycle-open-alert.ts:164` relies): for a live alert with no `pool_open` post row per pool, it re-sends the per-cycle job
  through the same optional seam (AC5 (iv)). (The cycle-open sweep re-enqueues only un-minted cycles — `cycle-open-alert.ts:7-18`.) ACCEPTED
  costs, recorded in the decision: (1) a missed day-14 sweep (late, or the cron fails) loses that cycle's last-day post — day 15+ posts
  nothing (T3); (2) a finished row is frozen, so a `skipped` (switch off, no chat id, no bot) or final `refused` row blocks its subject for
  good, even after the cause is fixed; (3) a post found stale is `skipped:stale`, ⛔ posted late (AC5 (iii)); (4) the last-day post shows the member reminder's date, so
  for a cycle frozen 05:30–09:30 IST it reads *"Today, <the next day's date>"* (`-418` item 2). The admin "Posts" list shows
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
  `parameters.retry_after` ⇒ FS7. Copy WhatsApp's injectable `timeoutSignal` seam and its bounds check (`whatsapp-app.ts:280-303`); MSG91
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
  name (`:216-229`) — but its DB reads (`:209-211`) are unwrapped, so it CAN throw ⇒ wrap the call; a throw is TRANSIENT — no row, rethrow, only the final attempt writes
  `refused:identity_unavailable` (`-418` item 3; ⛔ final at once, as v1.2 had it). It needs `poolCount` (= the cycle's pool count) and ALWAYS decrypts. The no-decrypt label: `notifications.resolveCuratedPoolName(db,
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
  (`getTelegramConfig` / `putTelegramConfig` at `:958,963` — the admin client, ⛔ `packages/api-client`). **The admin decrypt precedent:**
  the deceased's name via `apps/api/src/modules/member-pool/pool-identity.ts` (`resolvePoolNamePresentationModeForRequest` `:63`;
  `resolvePoolIdentity(deps, tx, request, pariwarId, mode, input)` `:98`, over `deps.encryption` — `apps/api/src/context.ts:475-478,518`);
  that file's header (`:87`) says *"member-session layer (D11 — NOT the admin path)"* ⇒ the posts list crosses D11 consciously, recorded in
  the decision. The per-row degrade: each row's identity read under its own savepoint (`underSavepoint`,
  `apps/api/src/modules/claims/later-approval-warnings.ts:181`; `resolvePoolIdentity` already returns `null` on a decrypt failure, so
  `reconciliation-review`'s `safeDecrypt` at `:95-102` is ⛔ needed). The audited-read shape: `reconciliation-review/handlers.ts:105` (*"Audited read (the 6.10 audited-read precedent)"*) — which decrypts NOTHING and writes ONE `emitAuthAudit` line per GET
  (`admin_reconciliation.read`, a member of the closed `AuthAuditEventType` union in `apps/api/src/audit/audit-sink.ts`); each decrypt
  ALSO fires `auditHook('decryptDek')` (`packages/domain/src/encryption/envelope.ts:93`) into the global-lock audit chain (FS15, `-418` item 9). Forced pagination:
  `apps/api/tests/integration/forced-pagination.spec.ts` flags a GET whose body is a top-level array or `{ items[] }` without a bounded
  `limit`; a named array (`{ posts }`) is ⛔ examined by that detector (its `:41-50` note); the bound is the domain read's `clampLimit`ed
  `.limit()`, enforced by `scripts/domain-accessor-invariants` [⚠ *dated 2026-10-29, code review G2-P8: the read's bound is a raw-SQL `LIMIT`, so it is bounded BY HAND; the gate sees only Drizzle `.limit()` calls and ⛔ checks it*]
  (`packages/domain/src/pagination.ts`).
- **F15 — the at-most-once send record.** `alert_sms_sends` (migration `0184`): UNIQUE `(alert_id, member_id, occasion)`, a `claim_token`
  (`:45`, `:59`), CHECK-pinned enums, a finished row frozen by trigger; grants `twt_app` SELECT + COLUMN-LIMITED INSERT / UPDATE
  (`:71-77`); per-command tenant policies `<table>_tenant_isolation_{select,insert,update}` with
  `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`; an FK `alert_id → alerts`; timestamps defaulting to
  `clock_timestamp()`. Its LIFECYCLE (5.11b — copy it, ⛔ reinvent it): a 429 / rate-limited answer ⇒ **`deferred`** (`settle()`,
  `apps/jobs/src/scheduler/alert-sms-send.ts:252-266`); re-claim = compare-and-set `deferred → attempting` under `FOR UPDATE` with a FRESH
  `claim_token` (`beginAlertSmsSend`, `packages/domain/src/sms-delivery/alert-sms-sends.ts:146-187`); a lease `ALERT_SMS_SEND_LEASE_MS` =
  2 min (`:35`) past which a crash-left `attempting` row is final; `ALERT_SMS_DEFERRED_MAX_AGE_MS` = 30 min (`:49`) past which a `deferred`
  row is given up; an accept with no id is recorded as unknown (`alert-sms-send.ts:281-287`); the trigger (`0184:83-103`, BEFORE UPDATE only) refuses any update of a
  finished row and moves a `deferred` row only to `deferred` / `attempting` / a give-up (the prose at `0184:17-27` lists the intended
  transitions; the code is looser — AC1 tests what FS2's trigger enforces). The
  claim / finalise SQL lives in a DOMAIN accessor module (`alert-sms-sends.ts`), and alarms are deduped in-process by `alarmRefusalOnce`
  (`alert-sms-send.ts:366-378` — a map of last-alarm times, the sink called BEFORE the window is armed; window
  `ALERT_SMS_TEMPLATE_ID_TTL_MS` = 5 min, `:60`; ⛔ `createTtlMemo`, a read cache — `-418` item 5). A never-attempted final row is
  written by `recordLadderDeliveredAlertSmsSend`'s shape (`alert-sms-sends.ts:267-297` — INSERT as `attempting`, then the token
  compare-and-set to final; the INSERT grant has ⛔ `detail`). Requires `member_id` ⇒ cannot hold a channel post ⇒ a NEW table (FS2). Its RLS / CHECK-lockstep test:
  `packages/domain/tests/integration/rls/alert-sms-sends-policy-regression.spec.ts` (`checkValues(client, '<check_name>')` against the
  exported constants, `:264-267`).
- **F16 — the member read precedent.** `GET /api/v1/member/wa-opt-in` → `WaOptInStatusResponse` (`packages/contracts/src/wa-opt-in/opt-in.ts:73-83`);
  the member's Pariwar is `request.requestContext.pariwarId`, set by `requireMemberSession` (`apps/api/src/modules/wa-opt-in/handlers.ts:9,
  105-112`), and the read (`status`, `:245-274`) opens `openScopeTx` (`:249`; `../multi-tenant/scope-tx.js`) and closes it with `closeScopeTx(scopeTx,
  ok)` in `finally` (`:274`) — `:156` is the POST. Client: a method in
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
  `"$comment.<family>"` in BOTH en and hi (`contribution.json:2`; parity reads every string key; ⚠ the `microcopy:check` line scan (`scripts/microcopy/lib.ts:307`; `contribution.json` is in `copy_globs`) reads `$comment` lines
  raw — only the per-surface tests (e.g. `scripts/microcopy/contribution.test.ts:41`) filter them — so `$comment.channel_post` must itself pass the vocabulary and tone rules:
  ⛔ "report", "user", "donor", "receipt"). The
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
  post text (FS15). [`-418` items 11, §3] A never-attempted final row (`skipped:*`, `refused:secret_unresolved`,
  `refused:identity_unavailable`) is INSERTed as `attempting` with a fresh token and compare-and-set to final in ONE short transaction
  (the `recordLadderDeliveredAlertSmsSend` shape); `detail` per state, CHECK-paired: `attempting` / `posted` ⇒ NULL; `deferred` ⇒
  `tg_429`; `skipped` ⇒ `switch_off` | `no_chat_id` | `bot_not_configured` | `stale`; `refused` ⇒ `tg_<three digits>` | `tg_429_expired` |
  `secret_unresolved` | `identity_unavailable` | `switch_off` | `no_chat_id` | `bot_not_configured` | `stale` (under `refused`, the last four arise only
  as a `deferred` row's give-up — a rule of the JOB, ⛔ of the CHECK); a `deferred` row found when a skip applies, or when the secret or
  identity step refuses (final attempt, or identity `null`), is GIVEN UP to `refused:<that reason>` (`-418` item 11); `unknown` ⇒ `timeout_or_network` | `http_5xx` | `no_message_id` | `stale_lease` | `unclassified`. *Cost (a):* one migration (`0190` — NUMBERS). **(b) no record — rely on queue keys.** *Cost (b):* `singletonKey` dedupes nothing (F19) ⇒
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
  read — FS15) and a Copy button (switch off ⇒ states only); ⛔ any automation, ⛔ any unofficial gateway. *Cost (a):* whether a WhatsApp post was made is not recorded; the WhatsApp Channel can lag the Telegram one; the app's WhatsApp body
  says notices are posted there, true only while an admin posts by hand (`-418` item 7).
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
- **FS6 — the family's name (G2, G3, PQ1).** [AS PROPOSED at v1.2 and accepted by "as recommended" — its constant SUPERSEDED by
  `-416`, see ✅ below] ⭐ **(a) build BOTH word variants and select by ONE exported constant
  `ANNOUNCEMENT_POST_NAME_MODE: 'member_facing' | 'none'`, set to `'member_facing'` (per `-390` / `-180` as written) with a test pinning
  it to the decision; PQ1's answer can flip it in a one-line change + its tests (B ⇒ `'none'` until the post-death clause is pinned —
  today that is every member; a later "per member's own Terms" wiring is a deferred item, ⛔ built here); go-live leg (d) is PQ1's
  answer. In `'none'` mode neither the job nor the posts list reads the mode or decrypts anything (I5).** *Cost (a):* if PQ1 rules A with the PUBLIC form (G3 sub-question), a third mode wires the public resolver — small, later.
  ✅ **RULED 2026-10-29 (`-416`): A, full name** ⇒ the constant is `ANNOUNCEMENT_POST_NAME_MODE: 'full_name' | 'none'`, set to
  `'full_name'`, the test pinning it to `-416`; `'full_name'` decrypts the stored name and passes the mode `'full_name'` to
  `resolvePoolIdentity` — ⛔ a presentation-mode read; `'none'` stays built (a later ruling is a one-line flip). The "per member's own
  Terms" deferred item is ⛔ created (B was not chosen). Go-live leg (d): PQ1's half answered by `-416`; the constant is BUILT at Task 2 (the AC4 pin test) ⇒ (d) MET when that test lands on
  `main`. Nothing is posted before go-live anyway. **(b) build only the named variant.** *Cost (b):* a B ruling becomes a builder change. **(c)
  build only the unnamed variant now.** *Cost (c):* narrows `-180` without a ruling — the Panel's.
- **FS7 — sending (F1, F5, F19).** ⭐ **(a) the poster resolves the Pariwar's bot secret itself and calls the messaging handle; the
  Telegram client gains: an injectable `timeoutMs` (default 9 000 — the MSG91 value) via a `signal` on `FetchInit`; `retryAfter` on
  `TelegramSendError` (from `parameters.retry_after`); a timeout keeps today's class `api_unavailable` on the mirror path (⛔ new
  `TelegramErrorClass` member — the mirror's tests enumerate the union; `telegram-errors.ts` unedited — F1). Outcomes (the 0184 lifecycle
  — F15, I2): `ok: true` with a `message_id` ⇒ `posted`; `telegramCode === 429` ⇒ `deferred` (definitely not posted) and the job RE-SENDS
  itself with `startAfter = retry_after` s, the re-claim rotating the token; `telegramCode !== null` with HTTP 4xx ⇒
  `refused:tg_<error_code>` + ONE alarm; EVERYTHING ELSE — status 0 (timeout / network), 5xx, a 2xx with no `message_id`, a null code ⇒
  `unknown` (it may have posted) + ONE alarm, ⛔ retried. A crash-left `attempting` row past the LEASE (≈ 2 min, judged on
  `clock_timestamp()`; the timeout is 9 s) ⇒ `unknown`, ⛔ re-posted. A `deferred` row past its max age (30 min; for `last_day` also
  `deadlineAt`, the payload's `deadlineAtIso`) ⇒ final `refused:tg_429_expired`. Alarms deduped per Pariwar + class by the
  `alarmRefusalOnce` shape (in-process, 5-minute window — the 5.11b value; `-418` item 5).** [`-418` items 3–4] An identity-read THROW
  is transient like a secret outage (no row, rethrow; final attempt only refuses); FINAL ⇔ `retryCount >= retryLimit` from pg-boss
  metadata (`includeMetadata: true`), metadata ABSENT ⇒ ⛔ final. Branch on `error_code` / `retry_after`, ⛔ on `description` (Telegram:
  *"subject to change"*). Never hold a transaction or a pool client across the call (T8). *Cost (a):* an ambiguous timeout may leave one post missing rather than doubled; the mirror's
  hung call now ends `rejected` after 9 s instead of hanging (a fix — this cost line, accepted by `-417`; `-417` §2's "⛔ moved" list contradicted it — `-418` item 6). **(b) retry on timeout.** *Cost (b):* a possible duplicate
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
  query would show one account's links to the next; it renders nothing while loading, on error, or when no link is returned; the query carries `{ gcTime: 0, staleTime: 0 }` (the
  `KNOWN_PEOPLE_CACHE_OPTIONS` precedent, `known-people-cache.ts:40` — ⛔ persisted, refetched at each home mount) so a switch-off hides
  the links at the next mount (`-418` item 10).** *Cost (a):* two reminder cards
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
  Hindi of every string (posts + app) — recorded, ⛔ assumed; (✅ MET 2026-10-29 — `-417` FS8; a later string change re-opens it) **(d)** PQ1 answered and FS6's constant set to match (PQ1 ✅
  answered by `-416`; the constant `'full_name'` is BUILT at Task 2 — (d) MET when the AC4 pin test lands on `main`); **(e)** counsel asked
  about naming a deceased member's family on a public channel (or *"Counsel has not been asked"* recorded as an accepted cost — ⛔ an
  answer; KEPT by `-418` item 1 — ⚠ the PQ1 note told the Panel *"Going live waits for … counsel's question"*: if the accepted-cost path
  is taken, the roster line says so and quotes that sentence); **(f)** LAST: a Pariwar admin switches the channels on. ⛔ Never a merge fence ([[project_not_in_production_merge_is_not_golive]]).
- **FS14 — what the app says about privacy.** ⭐ **(a) nothing about who can see a follower** (F13 — WhatsApp's contact exception and
  Telegram's admin view make any "the Trust cannot see you" untrue). *Cost (a):* a privacy-minded member is not told what the channel shows.
  **(b) a per-platform accurate line.** *Cost (b):* long, platform-specific, and it can go stale when Meta changes it.
- **FS15 — where the words (with the name) live.** ⭐ **(a) NOWHERE persistent: the job decrypts and builds only when it actually posts
  (channels on, chat id set, bot resolvable, `full_name` mode) and never stores the text; a `skipped` row holds ids, the pool label
  (no-decrypt — F7) and the date only; the admin "Posts" list REBUILDS the words at read in the API (via `member-pool/pool-identity.ts`
  `:98` with the mode `'full_name'` passed — ⛔ the `:63` mode read since `-416` — F14 — crossing its D11 note consciously, recorded in
  the decision; an AUDITED read: ONE `emitAuthAudit` line per GET under the new `AuthAuditEventType` `admin_announcement_channels.posts_read`, counts
  only — the `reconciliation-review` `:105` shape; each row's identity read under its OWN savepoint (a nested transaction — the
  `claims.correction-closure.handlers.ts:490` precedent), so a null identity or a throw makes THAT row's words *unavailable*, ⛔ a 500 —
  `-418` item 9) under
  `pariwar.configure_channels`, from the Pariwar's alerts and pools of the last 15 days LEFT JOINED to the post rows (so a dropped enqueue
  shows *"not attempted"* — I9).** The builder is a pure function in `packages/contracts/src/announcement-channels/` that takes `t` as a
  parameter (F17); jobs and API pass the real `t`. *Cost (a):* while the switch is ON, per named `pool_open` row per admin page view, one KMS `decryptDek` AND one hidden audit-chain
  write under the deployment-wide audit lock (`envelope.ts:93`) — accepted at admin scale (`-418` item 9); switch OFF ⇒ nothing decrypted; ⛔ erasure work —
  no new column holds a name ([[project_append_only_guard_names_erasure_columns]]). **(b) store `post_text` on the row.** *Cost (b):* the
  deceased's decrypted name in plaintext at rest, against architecture's *"member name remains Tier-1 ciphertext"*, plus an RTBF / guard-
  function change. **(c) envelope-encrypt `post_text`.** *Cost (c):* a new ciphertext column, KEK handling and erasure treatment for a
  convenience.

### The words (FS8 (a)) — ✅ APPROVED, Hindi REVIEWED by BigDev 2026-10-29 (*"Hindi is fine, I reviewed it."*; `-417` FS8)

The posts (one bilingual message each; Hindi first, a blank line, then English; plain text, ⛔ `parse_mode`, ⛔ links). Namespace
`contribution`, keys `channel_post.pool_open.named`, `channel_post.pool_open.unnamed`, `channel_post.last_day`, with a
`"$comment.channel_post"` key naming this story in BOTH en and hi (F17):

| Key | Variables | English | Hindi (reviewed — `-417`) |
|---|---|---|---|
| `channel_post.pool_open.named` (FS6 `full_name` — ruled, `-416`) | `pool` · `deceasedName` | Pool {pool} is now open, in support of {deceasedName}'s family. If you are assigned to this pool, please open the app to contribute. | पूल {pool} अब खुल गया है, {deceasedName} के परिवार के सहयोग हेतु। यदि आप इस पूल से जुड़े हैं, तो सुविधानुसार ऐप खोलकर योगदान करें। |
| `channel_post.pool_open.unnamed` (FS6 `none`) | `pool` | Pool {pool} is now open. If you are assigned to this pool, please open the app to contribute. | पूल {pool} अब खुल गया है। यदि आप इस पूल से जुड़े हैं, तो सुविधानुसार ऐप खोलकर योगदान करें। |
| `channel_post.last_day` | `date` (DD-MM-YYYY) | Today, {date}, is the last day of this cycle. If you are able, please contribute in the app. | आज, {date}, इस चक्र का अंतिम दिन है। यदि संभव हो, तो कृपया ऐप में योगदान करें। |

The app (namespace `common`, family `announcementChannels.*`; ⛔ "must", ⛔ "miss", ⛔ "required", ⛔ "Settings"). The body has three
variants so it never names a channel that has no link (I7):

| Key | English | Hindi (reviewed — `-417`) |
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

### PQ1 — for the Trustee Panel — ✅ RULED `-416` (A, full name; DISCHARGED)

✅ **RULED 2026-10-29 — `2026-10-29-416` (Trustee-ratified, Dhiraj Rahul + Kalpana Bharti), verbatim: *"by DR and KB"* / *"option A,
full name"*.** The note: `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-29-5-14-public-channel-naming-the-family.md`
(SENT — recorded by the answer). `-390` / `-180` Q1 stand for the posts; `-160` / `-173` do not govern this post and are unmoved for
the web pages. ⚠ Flagged, not reachable today: a Pariwar set to `shielded_name` would post the full name while its member push shows
the shorter form (`-416` Not covered). Accepted cost, as put (verbatim, `-416` item 1): *"A deceased member is named in public with no basis of their own. That departs
from the rule every public page follows, and counsel has not been asked whether it is lawful."* B and C were ⛔ chosen ⇒ both channels
carry the name; the Telegram channel may be public or private. ⚠ The text below is the story's DRAFT (v1.3) of the question, kept
unedited as history. ⛔ It is NOT what the Panel was asked: the note's wording is the record (Option A *"Name the family, as October
agreed."*; the sub-question *"the full name, or the shorter form the public pages use"*). Its "Our reading: B" and "recorded as NOT
sent" are SUPERSEDED — the note was SENT and A was ruled.

**Plain English:** the Panel agreed on 2026-10-23 that the Trust's channel post for a pool opening names the deceased member's family.
It was told a WhatsApp Channel is public. But every public page the Panel has ruled on names a deceased member only if THAT member had
accepted a Terms version that allows naming after death (`-160`). Until the clause is written and pinned, the page shows no name
(`-173`); today that holds for every member. The October note did not mention this rule. **The one fact that decides it:** a WhatsApp
Channel can be found and read by anyone, so as built per October the TRUST would name a deceased member in public with neither the
member's own agreement nor the family's — every other public place rests on one of the two (the drive page on the member's Terms; the
family's memorial on the family's own words). Options:
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
(`checkValues` — the `detail` CHECK's `tg_<three digits>` pattern (`-418` §3) is pinned by an accept / reject case pair, since a pattern has no literal
set); the trigger refuses any update of a finished row and any `deferred → <state other than deferred / attempting / refused>`; INSERT is
unguarded by the trigger (FS2's never-attempted write path); every `detail` value per state (FS2, `-418` §3) has an accept / reject pair.

**AC2 — The admin config and posts list (FS3, FS4, FS15, F14).** `GET`/`PUT /api/v1/p/:pariwarId/admin/announcement-channels` and `GET
…/announcement-channels/posts`, gated by `pariwar.configure_channels` (⛔ new permission key — the catalog stays at version 55 / 71 keys);
the PUT validates with the contract (refinements equal to the CHECKs), writes on the scope tx under `withCompensatingAudit` (action
`pariwar.announcement_channels_update`; ⛔ the bot secret NAME or value is ever returned — the API reads only whether the name is
non-blank, for AC3); the module is added to `CHANNEL_ROOTS` (`scripts/access-wrapper-invariants/check.ts:69-77`) and a planted bare
`audit.writeAuditEntry` in it is shown to FAIL the access-wrapper gate (record RED, then remove); the config GET returns `{ enabled: false,
…nulls }` when no row exists (⛔ a 404). The posts list (an AUDITED read — F14) returns `{ posts: [...] }` (a named array — ⛔ examined by
the forced-pagination detector; bounded by the domain read's `clampLimit`ed `.limit()`, enforced by `scripts/domain-accessor-invariants` [⚠ *dated 2026-10-29, code review G2-P8: the read's bound is a raw-SQL `LIMIT`, so it is bounded BY HAND; the gate sees only Drizzle `.limit()` calls and ⛔ checks it*]), per pool opening and per last day of the last 15 days — a `last_day` entry only once the cycle has reached
day 14, its date from the SHARED `operationalDate` (AC4) — each with the Telegram state (`posted` / `deferred` / `refused` / `unknown` /
`skipped` / `attempting` / *"not attempted"*; an `attempting` row past the lease is SHOWN as `unknown`) and, ONLY while `enabled` is true,
the bilingual words rebuilt through the shared builder with the real `t()` (switch off ⇒ states only); nothing else. 403 / 400 / 401 /
cross-Pariwar tested, and a test that a decrypt failure (`resolvePoolIdentity` ⇒ `null`) or a throwing identity read on ONE row yields THAT row's words as
*unavailable*, ⛔ a 500, while the next row's words still build (its own savepoint — FS15); a test that a Pariwar stored as
`shielded_name` gets the FULL name in the list's words (mode `'full_name'` passed — ⛔ the presentation-mode read, `-416`); a test that
the GET writes ONE `admin_announcement_channels.posts_read` audit line (counts only); a `deferred` row past its max age is SHOWN as
`refused`. The
admin page (`apps/admin/src/modules/channel-config/`) gains an
"Announcement channels" form (the `TelegramConfigForm` pattern) whose switch reads *"When on: members see these links in the app, and the
system posts pool openings and last days to the Telegram channel. Post the same words to the WhatsApp Channel by hand from the list
below."*, a hint *"Posts go out through this Pariwar's Telegram bot (the bot-token name in the Telegram config above), even while
Telegram mirror delivery is off; add the bot to the channel as an admin with 'Post messages'."*, and the "Posts" list with a Copy button
per post.

**AC3 — The member read (FS12; I1, I7).** `GET /api/v1/member/announcement-channels` returns the member's own Pariwar's links only while
`enabled` is true, else both null; `telegramChannelUrl` only when the chat id is set and the bot secret name is non-blank (tested: a blank
bot secret name ⇒ `telegramChannelUrl: null` with the WhatsApp link still returned); `.strict()` contract registered via `emit-openapi.ts` + the barrel (OpenAPI diff limited to this and
AC2's routes; determinism check green); 401 unauthenticated; a member of A never receives B's links (live test).

**AC4 — The words and the builder (FS6, FS8, FS15; I4, I5).** `buildAnnouncementPost(t, input)` in
`packages/contracts/src/announcement-channels/` — `input` is `{ occasion: 'pool_open', poolLabel, deceasedName: string | null } | {
occasion: 'last_day', lastDate }`; a `@ts-expect-error` test proves a member field is refused. `t` is a LOCAL structural type (F17). It
returns Hindi, a blank line, English, through the injected `t` (tests pass the REAL `t` from `@twt/i18n`, a contracts devDependency).
Named / unnamed is chosen by `ANNOUNCEMENT_POST_NAME_MODE` (a test pins its value `'full_name'` to `-416`). In `full_name` mode the name
comes from a WRAPPED `resolvePoolIdentity` with the mode `'full_name'` passed (⛔ the Pariwar's presentation-mode read; `poolCount` = the
cycle's pools) — a test proves a Pariwar stored as `shielded_name` still posts the full name, and a one-word name in full; `null` gives
`refused:identity_unavailable`, ⛔ an unnamed post; a THROW on a non-final attempt writes no row and rethrows, on the final attempt
`refused:identity_unavailable` + one alarm (`-418` item 3); the label is `poolName ?? poolLetterCode`. In `none` mode: ⛔ mode read, ⛔
`resolvePoolIdentity`, ⛔ decrypt — the label is `resolveCuratedPoolName ?? poolLetterCode(poolIndex)` and a test proves NO KMS call. The
date is EXACTLY the day-14 member reminder's: `operationalDate` MOVES unchanged from `contribution-notify-triggers.ts:320-326` into
`packages/contracts/src/alerts/contribution-loop-templates.ts` beside `CYCLE_WINDOW_DAYS`, with ONE exported `cycleDeadlineAt(committedAt)`
(`committedAt + CYCLE_WINDOW_DAYS` days, the sweep's `:1435` arithmetic); the sweep, the job and the API all import them. A test proves the
post's date AND the posts list's date equal the member reminder's `date` param for the same alert. ⚠ Mirror the reminder's existing day
arithmetic; ⛔ "correct" it here. Known and ACCEPTED (`-418` item 2): for a cycle frozen 05:30–09:30 IST, `operationalDate(deadlineAt)`
is the day AFTER the day-14 sweep, so the post reads *"Today, <the next day's date>"*, as the member reminder already does. Catalogue parity en / hi.

**AC5 — When posts are enqueued (FS5; I1, I6, I9).** Every job is sent with `pariwarId` on the JobEnvelope (F19). Payloads, in full:
cycle job `{ alertId, cycleId, occasion: 'pool_open' }`; pool child `{ alertId, cycleId, poolId, occasion: 'pool_open' }`; last-day job
`{ alertId, cycleId, occasion: 'last_day', deadlineAtIso }`. (i) POST-COMMIT in `runCycleOpenAlert`, beside the contribution-notify enqueue
(a new optional `CycleOpenAlertDeps` seam, wired in `registerCycleOpenAlertWorkers`, `boot.ts:789-808`), best-effort with its own alarm,
ALSO on the `minted: false` path: send the cycle job; its handler lists the cycle's pools (a pools-only read with an explicit `pariwar_id`
predicate — ⛔ `listCycleBindingCandidates`, which also loads assignments) and sends one pool child each, the i-th with `startAfter = i × 3
s` (FS5) — ⛔ an in-process sleep. (ii) In `runDeadlineReminderSweep`, when `cycleDay === 14`, AFTER `deadlineAt` (`:1435`) and BEFORE
`listCycleBindingCandidates` (`:1437`), call a NEW OPTIONAL `enqueueAnnouncementPost` seam on `ContributionNotifyTriggerDeps` (wired in
boot; UNSET in existing tests, so their `send` calls — incl. `send.mock.calls[0]` at `contribution-notify-triggers.test.ts:651-670` — are
untouched) ONCE per alert, in its own try/catch (a failure alarms; the per-pool loop still runs); `cycleDay` 15+ posts nothing (T3).
(iii) The handler reads `enabled`, the chat id and the bot secret name AT RUN TIME, each by an explicit `pariwar_id` predicate (I6).
Switch off ⇒ `skipped:switch_off`; no chat id ⇒ `skipped:no_chat_id`; blank or absent secret name ⇒ `skipped:bot_not_configured`; a
`last_day` job run at or after `deadlineAt` (its payload's `deadlineAtIso`) ⇒ `skipped:stale` (`-418` item 2); a `pool_open` child whose alert is no longer live ⇒
`skipped:stale` — each as `refused:<reason>` when a `deferred` row is found (the give-up, FS2). The secret is resolved BEFORE the claim: if `resolveChannelSecret` throws, NO row is written and the job throws (pg-boss
retries — an outage is transient); only the FINAL attempt writes `refused:secret_unresolved` + one alarm. FINAL ⇔ `retryCount >= retryLimit` from pg-boss metadata (the
worker registers with `{ includeMetadata: true }`; every send passes an explicit `retryLimit` / `retryDelay` constant); metadata ABSENT ⇒
⛔ final (`-418` item 4). ⛔ a Bot API call in any of
these. A `skipped` row holds ids, the pool label (no-decrypt — F7) and the date only; ⛔ a decrypt is done for it. (iv) The existing hourly
`runContributionNotifyRecoverySweep` (`:1296`) gains one best-effort step through the same optional seam: for a live alert whose pools
lack a `pool_open` post row, re-send the cycle job (the UNIQUE makes a re-send harmless) [⚠ *dated 2026-10-29, code review G1-1 / `-419` item 3 (b):* it ALSO re-sends a
pool whose row is `deferred`, or `attempting` past its lease, even after the alert has closed, ⛔ restarting the member fan-out] — placed after the scope read (`:1325-1335`)
and BEFORE the `continue` at `:1337` (which skips both an all-empty cycle and a fully-notified one), in its own try/catch, run ONLY when the seam is set, its re-sends ⛔ counted in `reEnqueued`;
"lacks a row" = the cycle's pool ids minus their `pool_open` rows (explicit `pariwar_id`). The queue is created (`boss.createQueue`) BEFORE
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
throw on a non-final attempt writes no row, and with metadata ABSENT writes no row; a throwing identity read on a non-final attempt
writes no row; two identical refusals within 5 minutes alarm once; a re-sent 429 job that now finds the switch off gives the `deferred`
row up to `refused:switch_off`; a job for Pariwar A never reads or writes Pariwar B's config or post rows (the job runs on the
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
rejected `openURL` shows `link_error` inline and keeps the card; a test pins the query options `{ gcTime: 0, staleTime: 0 }` (FS11). Render tests (jsdom header, `vi.mock('../../lib/mmkv')`, RTL `cleanup`)
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
per-member mirror; the deceased member's FULL name on the pool-open post — `-416`; built per `-417` / `-418`), stating that it
discharges the 2026-10-23 annotation's "still owed" (`-389` G13); the roster gains the FS13 row (header "decision-authored, `-417` / `-418`"; dated lines "(c) MET 2026-10-29 by `-417` (v1.4 strings)"
and "(d) PQ1 answered by `-416`; the constant at Task 2"), and Row 26 a dated note (the two new tables join its scope — their
grants bind `twt_app` only; jobs reach them on the BYPASSRLS pool, isolated by explicit predicate — I6); ⛔ ADR-0030 (ratified; F14);
deferred-work's
5.11 channels item gets an appended line (HOMED → building; closes when this row is `done` on `main`) (FS6's "per member's own Terms"
item is ⛔ created — `-416` ruled A); deferred-work gains ONE 5.14 item: *a Pariwar set to `shielded_name` would post the full name while
its member push shows the shorter form (`-416` Not covered)* — trigger: the first migration, seed or admin write that sets any
`pariwar_public_name_presentation` row to `shielded_name` ⇒ the question back to BigDev (and the Panel if the post would change); the friction ledger gains ONE `optional` row for the
card and a `**Story 5.14 disposition**`.

**AC11 — Nothing frozen moved (I8).** `git diff origin/main -- packages/channels/src/dispatch.ts 'packages/channels/src/cascade*'
packages/channels/src/composition/provider-composition.ts packages/domain/src/notifications/delivery.ts apps/api/src/modules/telegram-opt-in
apps/jobs/src/tg-webhook-processor.ts 'apps/mobile/app/(settings)/telegram-notifications.tsx' packages/domain/src/rbac/permissions.ts
packages/domain/src/feature-flags/registry.ts packages/channels/src/providers/telegram-errors.ts
docs/adr/ADR-0030-compensating-audit-mechanization.md` is EMPTY; `channels-determinism` green; the Telegram client diff
(`telegram-app.ts`) is the timeout + `signal` + `retryAfter` alone (+ their tests) [⚠ *dated 2026-10-29: widened by `-419` item 4 — plus the
explicit-`ok: true` acceptance, the integer timeout and the `retry_after` bound (+ their tests)*]; the mirror's tests pass unchanged except NEW timeout / retry-after cases; the F4 regression test
added beside the webhook processor's tests.

**AC12 — Gate.** `pnpm ci:local` green on an isolated database (⛔ shared :5433 while siblings run — [[project_known_livedb_test_failures]];
set `DATABASE_URL` on the command — [[project_prepush_hook_inherits_5432]]); `pnpm friction:check` after committing; `pnpm i18n:check`;
`pnpm microcopy:check`; `pnpm contracts:check-openapi-determinism`.

## Tasks / Subtasks

- [x] **Task 0 — Governance (AC0)**
  - [x] 0.1 (DONE 2026-10-29 — Debug Log (d)) Preflight: `git fetch origin`; rebase onto `origin/main` if it moved (backup branch first); run the pin checks (header);
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
  - [x] 0.2 (DONE 2026-10-29 — FS1–FS15 as recommended; "The words" (en + hi) approved and the Hindi reviewed by BigDev — go-live leg (c)
        MET by `-417` for the strings as tabled at v1.4 (the FS13 row, written at Task 0.4, carries the dated line); Debug Log (a)) Put FS1–FS15, "The words" (en + hi) and PQ1 to BigDev; record the answers VERBATIM in Debug Log (a), each with its option's
        cost line (footgun #45). A confirmation of the Hindi in session does NOT discharge roster leg (c) unless BigDev says it does —
        record which.
  - [x] 0.3 (DONE 2026-10-29 — `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-29-5-14-public-channel-naming-the-family.md`
        SENT and RULED, `-416` (`3371b6d6`, was `26fc1f47` before the rebase); the author-commit `2026-10-29-417` committed ALONE (`0f55578f`, was
        `5fadaabd`); `-418` (v1.6) committed ALONE (`194f6d23`) — SHA map, Debug Log (d)) Write the PQ1 note (`trustee-panel-routing-note-YYYY-MM-DD-5-14-…`, from the template — §0 first, the one deciding fact,
        options with costs, "How much to trust this note" incl. the v1.0 `-157` error, evidence last); record it NOT sent until BigDev
        sends it. Stage the author-commit decision (next free id) in the scratchpad; commit it ALONE (`governance:` prefix) — try the
        decision-log write first ([[project_decision_log_writes_user_inserted]]).
  - [x] 0.4 (DONE 2026-10-29 — Debug Log (f)) Records commit (AC10), the ledger by SAFE prepend ([[project_sprint_status_safe_prepend]]) + row `ready-for-dev →
        in-progress`. Check the branch before every commit ([[feedback_concurrent_review_agents_mutate_tree]]).
- [x] **Task 1 — Migration + domain schema + accessor (AC1, AC6; FS2, FS3)**: hand-written SQL (⛔ `db:generate` —
      [[project_live_db_test_gotchas]]), `0190` at validation, with a journal `when` above 1795923600034 (`0189`, on `main` since 6.32 landed) and every other
      sibling's — re-check at Task 0.1 ([[project_sibling_migration_when_order_shared_db]]);
      `packages/domain/src/schema/{pariwar_announcement_channels,announcement_channel_posts}.ts` (+ `packages/domain/src/schema/index.ts`);
      the occasion / state / detail constants and the lease / max-age constants exported; a domain accessor module
      `packages/domain/src/announcement-channels/` (lookup / begin / finalise / give-up / stale-lease — the `alert-sms-sends.ts` shape, every
      query with an explicit `pariwar_id` predicate — I6; plus the pools-only read and the config read) + the domain barrel; the two
      policy-regression specs. The pools-only read returns `{ poolId, claimCaseId, poolIndex, poolCanonicalIdentifier, fixedAmount }[]` for
      `(pariwar_id, cycle_id)` (the `PoolIdentityInput` fields, `pool-identity.ts:70-78`) and the pool count; the pool child re-reads ITS
      pool by `(pariwar_id, pool_id)`. The accessor's never-attempted final write and the `deferred` give-up (FS2, `-418` item 11).
- [x] **Task 2 — Contracts + words (AC3, AC4; FS6, FS8, FS12, FS15)**: `packages/contracts/src/announcement-channels/` (config DTO, PUT DTO
      with refinements equal to the CHECKs, member response, posts-list view `{ posts }`, the builder with its local `t` type +
      `ANNOUNCEMENT_POST_NAME_MODE`); `operationalDate` moved + `cycleDeadlineAt` added in `contribution-loop-templates.ts` (AC4; the jobs
      file imports them); `"@twt/i18n": "workspace:*"` in `packages/contracts/package.json` devDependencies (+ lockfile); the barrel;
      `emit-openapi.ts` (the member route AND the three admin routes — the channel-config paths' shape, `:1992-2108`); the `contribution.json` `channel_post.*` keys + `$comment.channel_post` and `common.json` `announcementChannels.*`
      (en + hi); contract tests (hand-built fixtures — [[project_contracts_tests_outside_tsc]]); builder tests with the real `t`.
- [x] **Task 3 — Telegram client (AC6, AC11; FS7)**: `signal` on `FetchInit`; injectable `timeoutMs` (default 9 000) via a
      `timeoutSignal` seam with its bounds check, copied from `whatsapp-app.ts:280-303` (+ `WhatsappAppCacheOptions.timeoutSignal`, `:371`; ⚠ unlike WhatsApp's per-send option with no
      default, a cache-level 9 000 default applies to the mirror too — `-418` item 6); `retryAfter` on `TelegramSendError` parsed from
      `parameters.retry_after`; the timeout stays class `api_unavailable` (already — F1; `telegram-errors.ts` ⛔ edited); tests on both paths
      (the hung-server case through the injected seam).
- [x] **Task 4 — The poster job (AC4 job half, AC5, AC6, AC7, AC11's F4 test; I1–I6, I9)**: `QUEUE_NAMES` entry
      `announcement.channel.post` (`-417` §5) in `packages/queue/src/index.ts`; handler
      `apps/jobs/src/scheduler/announcement-channel-post.ts` — the cycle job (pools-only read ⇒ one pool child each, `startAfter = i × 3 s`)
      and the post job: LOOKUP (explicit `pariwar_id`: `posted` / final ⇒ done, ⛔ decrypt; in-flight ⇒ throw; stale lease ⇒ finalise
      `unknown`; deferred past max age ⇒ `refused:tg_429_expired`; none / `deferred` ⇒ continue) → config read (explicit `pariwar_id`) →
      skip / stale checks (a found `deferred` row is GIVEN UP to `refused:<the skip reason>`) → secret via `resolveChannelSecret` BEFORE the
      claim (a throw: no row, rethrow; final attempt only: `refused:secret_unresolved`) → identity (`full_name` only: a wrapped
      `resolvePoolIdentity`, mode `'full_name'` passed, with `jobsEncryption`; `null` ⇒ `refused:identity_unavailable`; a throw ⇒ no row,
      rethrow, final attempt only refuses + one alarm; a found `deferred` row is given up to `refused:<that reason>`; `none`: the no-decrypt label) → begin (short tx) → send through a handle from `createTelegramAppCache` with
      NOTHING held → finalise (short tx, own token) — all through the Task 1 accessor; alarms deduped per Pariwar + class by
      the `alarmRefusalOnce` shape (`-418` item 5); the worker registered with `{ includeMetadata: true }` and every send with an explicit
      `retryLimit` / `retryDelay` constant (`-418` item 4). `createQueue` BEFORE the contribution-notify and cycle-open workers register; worker registration; the optional
      seams on `CycleOpenAlertDeps` and `ContributionNotifyTriggerDeps` wired in boot (the latter AFTER `readBridgeSwitch`, `boot.ts:674` —
      ⛔ before `alertSms:`, which the boot pin `apps/jobs/tests/alert-sms-send.test.ts:299-311` holds within 900 characters) (the day-14 hook and the recovery-sweep step — AC5
      (ii), (iv)); `contribution-notify-triggers.ts` imports `operationalDate` / `cycleDeadlineAt` from contracts; the F4 regression test;
      the AC4 identity / date tests; live tests per AC6 / AC7.
- [x] **Task 5 — API (AC2, AC3)**: `apps/api/src/modules/announcement-channels/` (admin config + posts list under
      `/p/:pariwarId/admin/…` with `pariwar.configure_channels`; the member route with `requireMemberSession` + `openScopeTx` — F16);
      `withCompensatingAudit`; the module added to `CHANNEL_ROOTS` (`scripts/access-wrapper-invariants/check.ts:69-77`, in the SAME commit that creates the module
      folder — a missing root fails the gate; + the root lists in `docs/access-wrapper-invariants.md:110` and
      `scripts/access-wrapper-invariants/README.md:87`) with the planted bare-audit RED run against `pnpm access-wrapper:check` (AC2); the
      posts list decrypts via `member-pool/pool-identity.ts:98` with the mode `'full_name'` PASSED (⛔ the `:63` mode read — `-416`; FS15) as
      an AUDITED read (`admin_announcement_channels.posts_read` added to `apps/api/src/audit/audit-sink.ts`) with each row under its own
      savepoint (F14, FS15); registration in `apps/api/src/server.ts`; route tests (403 / 400 / 401 /
      cross-Pariwar / no-row defaults / decrypt failure / blank bot secret ⇒ no Telegram link / a throwing identity read on one row (the next row's words still build) / a
      `shielded_name` Pariwar ⇒ the full name / ONE `admin_announcement_channels.posts_read` line / a `deferred` row past its max age shown
      `refused`); the access-wrapper checklist walk
      (`docs/access-wrapper-invariants.md`) for both route groups and the job.
- [x] **Task 6 — Admin UI (AC2; FS4)**: the form + posts list with Copy (`navigator.clipboard.writeText`, a visible "Copied" state) in
      `apps/admin/src/modules/channel-config/`; the three calls in `apps/admin/src/api/client.ts` (F14) and hooks in `src/api/hooks.ts`;
      `apps/admin/tests/announcement-channels-page.test.tsx` (stub `navigator.clipboard` in jsdom — no admin precedent).
- [x] **Task 7 — Mobile (AC8, AC9; FS9–FS11, FS14)**: `getAnnouncementChannels()` in `createMemberAuthClient` (`packages/api-client`, F16);
      `components/announcement-channels/useAnnouncementChannelsQuery.ts` (key + sign-out clear per FS11); `lib/announcement-channels-dismissal.ts`
      (no expiry, per member, its own `SyncStorage` interface — the per-module seam of `home-card-dismissals.ts:35`; cleared in
      `session-context.tsx`); `components/home/AnnouncementChannelsCard.tsx` (on `HomeReminderCard`; one header-comment line added to
      `HomeReminderCard.tsx` naming this card's once-for-good exception — F10);
      `components/notifications/AnnouncementChannelsEntry.tsx`; `app/(settings)/announcement-channels.tsx`; home
      wiring + source pins; render + unit tests; copy pin test. Long Hindi labels: the `NomineeMarkControl` multi-line Button pattern
      ([[project_tamagui_button_text_one_line]]); record on-device wrapping as un-attested if no device run.
- [x] **Task 8 — Records and gate (AC10, AC12)**: commit, then `pnpm friction:check` (row + disposition); `pnpm ci:local` on an isolated DB;
      Debug Log evidence; story → `review`.

### Review Findings

**2026-10-29 — `bmad-code-review 5.14`, file group 1: posting pipeline.** Reviewed `b3218697` against its rebased base
`770ba815` (30 changed files; +3,415 / −17): jobs and enqueue hooks, Telegram client, domain accessors, migration/schema/policies,
post contracts/date helpers, queue entry, post copy, and their tests. Three independent layers completed: Blind Hunter,
Edge Case Hunter, Acceptance Auditor. **0 decision-needed, 7 patch, 0 defer, 1 dismissed.** These are engineering findings;
none changes what the Trust is authorised to disclose or owes a person. API/admin, mobile/copy, and governance/release records
remain for later file groups; this is not a completed review of the whole story.

- [x] [Review][Patch] **G1-1 [P1] Recover stranded 429 deferrals.** After committing `deferred`, a failed replacement enqueue is
      caught and the current job completes successfully. Recovery counts only pools lacking a row, so it never retries or gives up
      this existing row; a crash between the commit and enqueue has the same gap. Preserve a durable recovery path, and test enqueue
      failure/crash recovery. Violates AC6 / FS7 and the claimed give-up behavior. [apps/jobs/src/scheduler/announcement-channel-post.ts:427]
- [x] [Review][Patch] **G1-2 [P2] Enforce Telegram's retry delay at the shared claim.** `startAfter` delays only the replacement job;
      an already-queued duplicate can immediately reclaim `deferred` and post again, bypassing `retry_after`. Persist and enforce an
      earliest retry time in the database claim, with a duplicate-job test. Violates FS7's requirement to honour the 429 delay.
      [packages/domain/src/announcement-channels/posts.ts:185]
- [x] [Review][Patch] **G1-3 [P1] Validate the alert/pool/cycle association before posting.** `last_day` does not tenant-load its alert:
      an A envelope carrying B's alert posts to A and creates an A post referencing B (the FK is global `alert_id` only). `pool_open`
      separately loads a tenant-local pool and alert but never proves their cycles equal the payload's cycle; an unrelated live
      alert can supply the stale guard and consume the pool's once-only key. Validate ownership and all resource relationships before
      decrypt/claim/send; cover both paths. Violates I6 / AC5–AC6 and checklist family 3.
      [apps/jobs/src/scheduler/announcement-channel-post.ts:321]
- [x] [Review][Patch] **G1-4 [P2] Require explicit Telegram `ok: true` before recording `posted`.** HTTP 200 with
      `{ result: { message_id: 42 } }` and no `ok` field is accepted by the reused client's HTTP-success fallback, and the new poster
      records `posted`. The parser predates this story, but this consumer introduces the stronger I3 / AC6 guarantee. Enforce it and
      add a malformed-success test. [apps/jobs/src/scheduler/announcement-channel-post.ts:447]
- [x] [Review][Patch] **G1-5 [P2] Add the required live two-connection race proof.** Existing duplicate-job and stale-token tests are
      sequential. Prove simultaneous initial claims and deferred reclaims across two live connections, with exactly one send/claim
      winner and no stale-token finalisation. REAL GAP under checklist family 2, at AC6 severity.
      [apps/jobs/tests/announcement-channel-post-live.test.ts:236]
- [x] [Review][Patch] **G1-6 [P2] Implement AC7's mixed-payment-state privacy fixture.** The AC7-labelled test seeds the deceased,
      claim, alert and pools, but no contributing members/assignments/payments. Seed members in several payment states with distinct
      name/mobile/amount/status sentinels, then assert exact builder output and no sentinel leakage, as AC7 expressly requires.
      [apps/jobs/tests/announcement-channel-post-live.test.ts:215]
- [x] [Review][Patch] **G1-7 [P3] Reject fractional Telegram timeouts at construction.** `timeoutMs: 1.5` passes the new range check,
      but `AbortSignal.timeout(1.5)` throws before `fetch`; the poster can permanently classify this unattempted post as `unknown`.
      Require an integer and add a fractional-value case. [packages/channels/src/providers/telegram-app.ts:181]

**Validation:** existing Telegram tests 23/23; post contracts/date tests 26/26; jobs/poster/trigger/webhook tests 209/209 on the story's
dedicated `twt-514-pg` :5444 database. Six temporary reproductions outside the repository confirmed G1-1, G1-2, both G1-3 paths,
G1-4 and G1-7 (6/6 assertions of the current faulty behavior; not regression fixes). Logs:
`/private/tmp/twt-514-review-existing-jobs.log`, `/private/tmp/twt-514-review-repro.log`; repro source/config:
`/private/tmp/twt-514-review-repro/`. The sandbox denied the first DB run; the rerun with local-network access passed.

**Invariant lens:** family 1 covered by transition/stale/give-up tests; 2 has G1-5; 3 has G1-3; 4 covered by payload/fan-out tests;
5 has dedicated policy-regression coverage but the alert association lacks a tenant backstop (G1-3); 6 covered by explicit field
picking and column-limited grants (AC7's required fixture remains G1-6); 7 covered by tenant-scoped counts/`NOT EXISTS`, with the
500-pool cap matching the spawn ceiling; 9 covered by documented BYPASSRLS/direct-client choices; 10 has G1-1's false give-up
claim. Family 11 introduces no benefit-gating predicate in this pipeline. API attribution/member-admin writes/UI families are
outside this group. **Dismissed:** a proposed total 30-minute cap across repeated 429s would change the explicitly prescribed
0184 lifecycle, whose freshness clock also resets on each attempt; no such new aggregate budget is specified here.

**Group 1 resolution — 2026-10-29:** BigDev chose **1, apply every patch**. G1-1 through G1-7 are fixed, with the
regression proofs in the tests named above. Migration `0191_announcement-post-recovery` adds `retry_not_before` and the last-day
`deadline_at` payload snapshot (timestamps only; no name/text), the column-limited grants, and a composite tenant/alert FK backed
by `alerts_pariwar_alert_uq`; migration 0190 stays unedited. The hourly sweep recovers existing deferred/crash-left rows even after
an alert closes, without restarting its member fan-out. A lost retry enqueue rethrows; the database claim enforces Telegram's
persisted delay against every duplicate. Pool/alert/cycle relationships are checked before decrypt/send. Explicit `ok: true` is
required and fractional timeouts are rejected; this acceptance check is the authorised G1-4 extension to AC11's original client-diff
limit. The mixed-payment fixture proves real yellow/green/red histories with encrypted contributor names/mobiles and amount
sentinels; the initial/reclaim race uses two distinct PostgreSQL backend connections and proves one winner/send per attempt and
stale-token rejection. Focused validation: **215 jobs/trigger/webhook, 30 policy, 28 Telegram tests passed**; jobs/domain/channels
typecheck and lint, `domain-invariants:check`, and `git diff --check` passed. Full gate evidence is recorded below. Changes remain
uncommitted. Story stays **in-progress**, rather than `done`, because API/admin, mobile/copy and
governance/release file-group reviews are still outstanding.

**Group 1 gate completion — 2026-10-29:** `DATABASE_URL=…:5444/twt_dev pnpm ci:local` finished **34/36**. The two failures
were (1) a plain UUID passed where the new privacy-fixture helper requires `PariwarId` — corrected with `ids.pariwarId`, and
(2) the existing channel determinism test timing out at 90 seconds during the parallel unit job. The dedicated determinism job
passed, and the full live integration job passed (domain **439/439 files**, events **7/7**, validity **21/21**, channels **21/21**,
jobs **86/86**, API **204/204**, plus the other filtered packages). Reruns on the final code: `pnpm turbo run typecheck` —
**20/20 tasks passed**; `env -u DATABASE_URL pnpm turbo run test --concurrency=1` — **37/37 tasks passed** (packages serialized
for the rerun; CI configuration unchanged). Thus every CI job has passed across the main run and reruns, **not in one 36/36 run**.
The final privacy fixture uses the real identity namespace / `member_mobile` AAD for encrypted mobiles. Logs:
`/private/tmp/twt-514-patch-ci-local.log`, `/private/tmp/twt-514-patch-typecheck-rerun.log`,
`/private/tmp/twt-514-patch-unit-rerun.log`. All seven findings are resolved; the three remaining file groups are not reviewed.

⚠ **Correction, 2026-10-29 (groups 2–4 review, G4-P4; the text above is kept as written):**
- *"Every CI job has passed across the main run and reruns"* is too broad. The main run's lint, typecheck and the other early static
  jobs ran from 14:02:55, before the live test's last edit at 14:08:02 (the `ids.pariwarId` fix). Only typecheck (14:24) and unit
  (14:30) were re-run afterwards. The integration job did run the final file (jobs tests started 14:17:35). So lint and the other
  static jobs are unproven on the final group 1 code, and the next full `ci:local` is the proof.
- The main run's unit job failed on more than the determinism test: 19 admin tests in 5 files, 1 mobile test (all 5 000 ms timeouts),
  and a domain unit run killed by `ELIFECYCLE`. The serialized 37/37 rerun covers them.
- *"existing Telegram tests 23/23; post contracts/date tests 26/26"* cites no log. The arithmetic is consistent with the 28 in
  `twt-514-patch-telegram.log` (23 + 5 new), but neither baseline is attested.

**2026-10-29 — `bmad-code-review 5.14`, file groups 2–4, run together (BigDev: *"go ahead with group 2,3,4 all in parallel"*).**
Diffs: `770ba815` → the working tree (group 1's patches included, uncommitted). Group 2, API / admin / contracts / OpenAPI / domain
config + member read: 28 files, +2,426 / −70. Group 3, mobile / copy / friction: 18 files, +716 / −4. Group 4, governance / release
records plus the uncommitted story delta: 8 files. Nine layers ran (Blind Hunter, Edge Case Hunter and Acceptance Auditor per group),
and none failed. **1 decision-needed (resolved → G4-P11), 37 patch, 3 defer, 21 dismissed.** The orchestrator re-checked the load-bearing claims
by hand: EC2-1's swallowed-error path (`later-approval-warnings.ts:189-209` + `pool-identity.ts:280-298`); the PUT's missing denial
tests; the admin hook's focus refetch; the mobile client's `refetchOnWindowFocus: false`; the shared-client `ok` change
(`git diff HEAD`). BH4-3 (*"the live-DB job never ran on the final code"*) is **disproved**: the jobs live tests started 14:17:35, after the
live test's last edit at 14:08:02. The early lint / typecheck of that run did see the pre-fix file (see G4-P4).

*Group 2 — API / admin*
- [x] [Review][Patch] **G2-P1 [P2] The audited, name-decrypting "Posts" read refetches on window focus / reconnect** — each refocus
      re-decrypts every name (one `decryptDek` + one global-lock audit write per name) and writes another `posts_read` line. Set
      `refetchOnWindowFocus: false` and `refetchOnReconnect: false`, as `useNomineeNameCheck` / `useClaimPeerAnswers` do. Breaks FS15 /
      `-418` item 9's cost, which was accepted *"per admin page view"*. (blind+edge+auditor) [apps/admin/src/api/hooks.ts:1506]
- [x] [Review][Patch] **G2-P2 [P2] A swallowed SQL error poisons every later row's savepoint** — `resolveCuratedPoolName` catches
      a failed `reserveNames` query. The tx is aborted, but `read()` returns normally, and `underSavepoint` only logs the failed RELEASE
      (25P02), so every later `SAVEPOINT` fails and each later row shows "words unavailable". On a RELEASE failure, `ROLLBACK TO
      SAVEPOINT`; test with a SWALLOWED planted error, not only a thrown one. Breaks AC2's *"the next row's words still build"*.
      (edge) [apps/api/src/modules/claims/later-approval-warnings.ts:196]
- [x] [Review][Patch] **G2-P3 [P2] The PUT has no 401 / 403 / cross-Pariwar test** — the denials run against the two GETs only. Add
      `state_trustee`, no-session and A-admin-PUTs-to-B cases (a seeded B, not a random id). This is AC2 (*"403 / 400 / 401 / cross-Pariwar
      tested"*) and a family 3 REAL GAP, on the route that switches public naming on. (auditor)
      [apps/api/tests/integration/announcement-channels.spec.ts:196]
- [x] [Review][Patch] **G2-P4 [P3] Words + Copy are offered for pools whose alert is not `live`** — `alertLive` is read but never
      used, so the admin could hand-post an opening the system deliberately held. While `!alertLive` (and no row), show no words.
      (blind+edge) [apps/api/src/modules/announcement-channels/handlers.ts:131]
- [x] [Review][Patch] **G2-P5 [P3] `refused` / `skipped` labels name the wrong cause** — every `refused` row reads *"Telegram refused
      it"*, including `secret_unresolved`, `identity_unavailable`, `switch_off`, `no_chat_id` and `bot_not_configured`. Carry a reason
      (from `detail`) on `AnnouncementPostEntry` and label it truthfully; OpenAPI regenerated. (edge+auditor)
      [apps/admin/src/modules/channel-config/AnnouncementPostsList.tsx:14]
- [x] [Review][Patch] **G2-P6 [P3] A `last_day` row deferred past its deadline shows "Waiting"** — `shownState` checks only the
      30-minute freshness. FS7 also bounds a `last_day` by `deadlineAt`. (auditor) [apps/api/src/modules/announcement-channels/handlers.ts:49]
- [x] [Review][Patch] **G2-P7 [P3] The AC4 "same date as the member reminder" test is circular** — it compares with the handler's own
      helpers. Take the `date` param from the day-14 reminder builder for the same alert, and add a `last_day` words-while-ON case. (auditor)
      [apps/api/tests/integration/announcement-channels.spec.ts:316]
- [x] [Review][Patch] **G2-P8 [P3] `poolCount` is recomputed from a truncated set; the "enforced by `domain-accessor-invariants`" claim is
      unenforced** — the raw-SQL `LIMIT` is invisible to the gate, and the cross-cycle pool cap truncates in UUID order. Read each cycle's
      pool count in SQL (the curated-name index depends on it), and correct the AC2 / comment claim to "bounded by hand". (blind+auditor)
      [packages/domain/src/announcement-channels/reads.ts:161]
- [x] [Review][Patch] **G2-P9 [P3] Copy throws synchronously when `navigator.clipboard` is absent** — the "Copy failed" path is never
      reached. Guard it and route the failure to `failed`. (blind) [apps/admin/src/modules/channel-config/AnnouncementPostsList.tsx:29]
- [x] [Review][Patch] **G2-P10 [P3] "Copied" / "Copy failed" are not announced** — add `role="status"` / `aria-live="polite"`. A family 13 (d)
      REAL GAP. (auditor) [apps/admin/src/modules/channel-config/AnnouncementPostsList.tsx:35]
- [x] [Review][Patch] **G2-P11 [P3] The D11 crossing has no re-examination trigger, and `pool-identity.ts:87` still says "NOT the admin
      path"** — add the trigger plus a back-pointer, and fix the `@param mode` doc. Family 9. (auditor)
      [apps/api/src/modules/announcement-channels/handlers.ts:10]
- [x] [Review][Patch] **G2-P12 [P3] The admin "switch OFF ⇒ ⛔ words" test does not test the switch** — the UI never branches on
      `enabled`. Hide words / Copy in the UI while `!enabled` too, and make the test feed words with `enabled: false`. (blind)
      [apps/admin/tests/announcement-channels-page.test.tsx:95]
- [x] [Review][Patch] **G2-P13 [P3] A vacuous isolation assertion and a dead helper branch** — the "unrelated Pariwar's bot row" check
      goes through a read that never touches `pariwar_telegram_config`. Move it to the member read; let `configure` seed NO bot row,
      and test ON-with-no-bot-row. (blind) [apps/api/tests/integration/announcement-channels.spec.ts:179]
- [x] [Review][Patch] **G2-P14 [P3] An unguarded `poolLetterCode` — one bad `pool_index` 500s the whole list** — degrade that row,
      as the shared resolver does. (edge) [apps/api/src/modules/announcement-channels/handlers.ts:140]
- [x] [Review][Patch] **G2-P15 [P3] The invite-URL patterns accept a bare `https://t.me/` and inner whitespace** — require a
      non-empty, whitespace-free path in the contract, the domain constant and the CHECK (0191, still unlanded). Lockstep test updated.
      (edge) [packages/contracts/src/announcement-channels/channels.ts:15]
- [x] [Review][Patch] **G2-P16 [P3] The config form never re-syncs to fresh server data** — `defaultValues` only, so a stale `enabled`
      is re-saved. `reset(initial)` when the server data changes (the concurrency half is deferred below). (blind)
      [apps/admin/src/modules/channel-config/AnnouncementChannelsForm.tsx:35]

*Group 3 — mobile / copy*
- [x] [Review][Patch] **G3-P1 [P2] `link_error` is shown but never announced** — a bare `accessibilityRole="alert"`. Use the house
      `announce.tsx` helper, once per failure, including a repeat failure. AC8 / AC9 + family 13 (d) REAL GAP. (blind+edge+auditor)
      [apps/mobile/components/home/AnnouncementChannelsCard.tsx:41]
- [x] [Review][Patch] **G3-P2 [P2] The home card / entry never refetch while the process lives** — the home tab mounts once, and
      `refetchOnWindowFocus` / `refetchOnReconnect` are `false` app-wide, so a switch-off or corrected link is unseen for days. The
      member can tap a withdrawn link and dismiss the card for good. Refetch on app foreground (AppState `active`) and on screen focus.
      FS11's *"refetches at each home mount"* does not hold. (edge)
      [apps/mobile/components/announcement-channels/useAnnouncementChannelsQuery.ts:21]
- [x] [Review][Patch] **G3-P3 [P2] "Not now" is not an accessibility element** — the frame's tamagui `Button` has no `accessible={true}`,
      so its role and label are dropped. Add it (this also fixes the 6.36c cards), plus a `data-accessible` assertion. Family 13 (a) REAL
      GAP. (edge+auditor) [apps/mobile/components/home/HomeReminderCard.tsx:46]
- [x] [Review][Patch] **G3-P4 [P3] The card / entry / screen keep showing held links after a failed refetch** — gate on `isError` too,
      and test `data` + `isError`. AC8 / FS11 *"renders NOTHING … on error"*. (blind+auditor)
      [apps/mobile/components/home/AnnouncementChannelsCard.tsx:30]
- [x] [Review][Patch] **G3-P5 [P3] The settings screen is a bare title while loading, and its header comment claims words it does not
      show** — show a Spinner while pending, and correct the comment (the error / retry words are deferred below). (blind+edge+auditor)
      [apps/mobile/app/(settings)/announcement-channels.tsx:4]
- [x] [Review][Patch] **G3-P6 [P3] Opening a link from the settings screen does not dismiss the home card** — FS10: *"a successful open
      of either link hides the card for good"*. (edge) [apps/mobile/app/(settings)/announcement-channels.tsx:30]
- [x] [Review][Patch] **G3-P7 [P3] A failed MMKV write leaves "Not now" inert, and an `onOpened` throw shows `link_error`** — hide in
      component state as well as persisting, and call `onOpened` outside the `openURL` try. (blind)
      [apps/mobile/components/announcement-channels/ChannelLinkButtons.tsx:27]
- [x] [Review][Patch] **G3-P8 [P3] The copy gate's banned list misses common spellings; the `[t]`-deps loop is dead** — add `जरूरी`
      (no nukta) and precomposed `ज़`, `आवश्यक`, Hindi and English "lose / miss". Drop the dead regex loop. Per
      [[feedback_gate_scope_semantic_coverage]]. (blind+edge)
      [apps/mobile/tests/unit/announcement-channels-copy-keys.test.ts:34]
- [x] [Review][Patch] **G3-P9 [P3] AC8's named sign-out test is approximated** — run `signOut` through the provider and render the next
      account. (auditor) [apps/mobile/tests/unit/announcement-channels-dismissal.test.ts]
- [x] [Review][Patch] **G3-P10 [P3] The friction-ledger disposition says "for good" and omits the sign-out re-ask** — FS10 (a)'s cost
      line names it. (auditor) [friction-budget.md:3022]

*Group 4 — governance / release records*
- [x] [Review][Decision] **G4-D1 → RESOLVED 2026-10-29, BigDev: *"2"* — keep asked-or-accepted, but tell the Panel.** It becomes
      **G4-P11**: if leg (e) is met by the accepted-cost path, the Panel gets a one-line correction before any switch-on, ⛔ only
      a roster quote. That goes in the new author-commit entry (with G4-P2, superseding `-418` item 1 in part, committed FIRST and alone).
      Also: a dated pointer under `-416`'s Not covered (the *"a blocker unless BigDev makes it one"* line was the session's, not the
      Panel's), and the roster leg (e) reworded to *"a deceased member"*, matching `-416` / `-418`. Finding as raised:
      **[P2] Counsel leg (e) can close on a path the Panel was told would not happen** — the PQ1 note told
      the Panel *"Going live waits for this answer, and also for … counsel's question"*, and its ruling block accepted *"counsel has not
      been asked"* as a present fact. `-418` item 1 (BigDev: *"Keep asked-or-accepted"*) lets go-live record *"Counsel has not been
      asked"* as an accepted cost. It names that sentence, but the Panel is never told. `-416`'s Not covered (session-written, inside a
      Trustee-ratified entry) says *"a blocker unless BigDev makes it one"*, which the Panel never said. The leg also words the question
      as naming *"a deceased member's family"* (roster) against *"a deceased member"* (`-416` / `-418`). Not a merge blocker: it is a go-live
      fence ([[project_not_in_production_merge_is_not_golive]]). (blind+auditor)
      [docs/launch-gate-inventory/inventory-roster.md (Row 44 (e))]
- [x] [Review][Patch] **G4-P1 [P2] The uncommitted ledger line takes `2026-10-29`, which is main's 5.8b label** — relabel `2026-10-29m`
      (free on every ref and worktree) in both ledgers. Add the row's dated `review → in-progress` comment. (blind+edge+auditor)
      [_bmad-output/implementation-artifacts/sprint-status.yaml:1]
- [x] [Review][Patch] **G4-P2 [P2] Group 1's build changes are unrecorded in governance** — migration `0191`, `retry_not_before`, the
      `alerts` unique index, the recovery of EXISTING deferred / crash-left rows (`-418` item 11's *"nothing re-sends a pool that has a row"*
      is now false), and the SHARED-client `ok: true` / integer-timeout / `retry_after` bound changes. That last one alters 5.5's per-member
      mirror and breaks I8 / AC11 / `-418` item 6 / the closed edit list / the Debug Log (b) attestation. Write a new author-commit entry
      (next free id, BigDev's *"1"* recorded verbatim) FIRST and alone, then dated pointers. Update epics *"One migration"*, story I8 / AC5
      (iv) / AC11 / the edit list / the header STATUS. (blind+edge+auditor) [.decision-log.md (`-418` items 6, 11)]
- [x] [Review][Patch] **G4-P3 [P3] The Row 26 note under-lists the post job's reads** — it also reads `claims` and `member_kyc_profiles`
      (via `resolvePoolIdentity`) and `cycle_freeze_commits`. (8.8's jobs path already reads the identity pair under the same login, so
      this is a record fix, not a new grant class.) (blind+edge+auditor) [docs/launch-gate-inventory/inventory-roster.md (Row 26, 2026-10-29
      note)]
- [x] [Review][Patch] **G4-P4 [P2] The group 1 gate record overstates** — *"every CI job has passed"*, but lint and the other static
      jobs ran only on the pre-`ids.pariwarId` tree (the typecheck and unit were re-run). The unit job's failures also included 19 admin + 1
      mobile timeouts and a killed domain unit run, not only the determinism test. The 23/23 and 26/26 baselines cite no log. Correct the
      text; the pre-push `ci:local` is the proof. (edge+blind) [this file, "Group 1 gate completion"]
- [x] [Review][Patch] **G4-P5 [P3] Unsignposted corrections to ratified / committed entries** — add dated pointers, never edits:
      under `-416`: *"the WhatsApp Channel is posted by hand"* was stated in `-390`'s note, not this one; Consequence 1's *"(d) MET"* is
      narrowed by `-418` §2. Under `-417`: a pointer to `-418`. In `-418`: its quote *"a `last_day` job whose IST date is no longer the
      deadline's"* is not `-417`'s text (*"a last day no longer today"*). (blind+auditor) [.decision-log.md]
- [x] [Review][Patch] **G4-P6 [P3] `-418`'s Author line over-attributes** — *"Every other item … a correction of fact"*, but items 4 and
      9–11 are design calls BigDev did not separately answer. A dated pointer states which items were answered (the four, verbatim) and
      which were session calls applied. (blind+auditor) [.decision-log.md:41]
- [x] [Review][Patch] **G4-P7 [P3] Pre-rebase SHAs reachable only from the local backup branch** — `f5929d7d` (note line 18), `26fc1f47`,
      `5fadaabd` (ledger `-29f` / `-29g`): append the rebased SHAs (`71e0eaf2` / `3371b6d6` / `0f55578f`) from Debug Log (d2). (blind+edge)
      [_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-29-5-14-public-channel-naming-the-family.md:18]
- [x] [Review][Patch] **G4-P8 [P3] The new `-389` pointer renders as a setext heading** — a blank line before `---`. (edge+auditor)
      [.decision-log.md:1235]
- [x] [Review][Patch] **G4-P9 [P3] deferred-work wording** — `shielded_name`: "not in effect today" (an admin write path may exist),
      and the trigger routes to the Panel, since it is a disclosure question. 5.11 item: "Closed by 5.14 when its row is `done` on `main`",
      and address *"how a member is asked to join"*. (blind+auditor) [_bmad-output/implementation-artifacts/deferred-work.md]
- [x] [Review][Patch] **G4-P10 [P3] The §3.4 annotation states a reading as fact** — label (1) AUTHOR READING, as (2) is. (4)'s
      "ids and states" also holds the pool label, the date, `deadline_at` and `retry_not_before`. (auditor)
      [_bmad-output/planning-artifacts/architecture.md:2392]
- [x] [Review][Patch] **G4-P11 [P2] Counsel leg (e): the Panel is told before switch-on if the accepted-cost path is taken** (from
      G4-D1, BigDev *"2"*). New author-commit entry (with G4-P2) superseding `-418` item 1 in part; a dated pointer under `-416` Not
      covered; roster Row 44 (e) gains the Panel-notice step and is reworded to *"a deceased member"*.
      [docs/launch-gate-inventory/inventory-roster.md (Row 44 (e))]

*Deferred*
- [x] [Review][Defer] **G2-W1 The config PUT is last-writer-wins (no version guard)** [apps/api/src/modules/announcement-channels/handlers.ts:76]
      — deferred, pre-existing: no config PUT in the codebase carries an `expectedVersion` (channel-config precedent). The stale-form half
      is G2-P16.
- [x] [Review][Defer] **G3-W1 The settings screen has no error / retry words** [apps/mobile/app/(settings)/announcement-channels.tsx:27] —
      deferred: new member-facing words reopen BigDev's copy review (`-417`). No generic retry key exists. G3-P5 covers the spinner.
- [x] [Review][Defer] **G4-W1 Story 11b.5's branch holds ledger `2026-10-29b`, which main's 6.32 also holds**
      [_bmad-output/implementation-artifacts/sprint-status.yaml] — deferred, not 5.14's: relabel at 11b.5's rebase.

**Dismissed (21):** BH2-4: last-day words from day 14 conform to AC2. BH2-7: list order follows the spec's newest-first. BH2-8: sequential
KMS per row, an accepted cost (`-418` item 9). BH2-9: audit on the happy path only, because an errored response shows nothing, and each
decrypt is audited anyway. BH2-10: OpenAPI cannot express zod preprocess / superRefine; the generator limit, not a contract drift.
BH3-1 / BH3-2: the sign-out clear is ratified (FS10 (a)); the key is per member. BH3-7: double-tap. BH3-8 / AA3-7: https-only, enforced
by 0190's CHECKs. BH3-9: "opened = handed to the OS" is AC8's rule. BH3-12: the real `t()` leg exists. BH3-13: the entry matches its
Telegram sibling. BH3-14 / BH3-15: the words and Hindi were approved and reviewed (`-417`). BH3-16: the post keys are tested in the builder
(group 1). BH4-3: disproved (above). BH4-6: `-416`'s headline is scoped to THIS post, which option A decides. BH4-7: the false-date band
was accepted by BigDev (*"Mirror, record cost"*). BH4-20: the ⛔ glyph is house style. BH4-22 (a)–(d): /tmp evidence and DR / KB naming
are house practice and disclosed. EC4-3's cross-tenant recovery scan carries a DELIBERATE block with a re-examination trigger
(`contribution-notify-triggers.ts:1332`).

**Groups 2–4 resolution — 2026-10-29:** BigDev chose **2** on G4-D1 and **1** on the patches. Author-commit `2026-10-29-419` was
committed FIRST and alone (`7885114d`). All 37 patches are applied: groups 2 and 3 by two fix agents with disjoint file sets, and group 4's
records by the session. Every code patch's test was proved red with its fix removed, then restored.
- **Edits outside the listed files:** `packages/domain/src/schema/pariwar_announcement_channels.ts` (G2-P15's lockstep constant), a new
  `packages/domain/tests/integration/rls/announcement-activity-read.spec.ts` (G2-P8), and a one-line `retry_not_before` clear in `posts.ts` (FS-5).
- **The story DB:** 0191 had already been applied on :5444, so G2-P15's four appended statements were run by hand and the drizzle hash was
  set to the new file's. The gate below runs on a FRESH container.

**Fix-diff review — 2026-10-29** ([[feedback_review_the_fix_diff_before_commit]]): two fresh reviewers, server (2,147 lines) and mobile
(943 lines). They found 0 P1 / P2 and **9 P3**, all applied. Every finding was verdicted closed except G2-P8, G2-P16 and G3-P6, which were partial before
these follow-ups.
- **FS-1:** last-day words also need `now < deadlineAt`. The alert leaves `live` only at the hourly close sweep, so words and Copy
  were offered for up to an hour past the deadline.
- **FS-2:** G2-P16 compared raw form values with the parsed server DTO, so after a save that blanked or trimmed a field the re-sync stopped
  working. It now compares the parsed values.
- **FS-3:** the F14 / AC2 *"enforced by `domain-accessor-invariants`"* claim is annotated "bounded BY HAND".
- **FS-4:** the closed-alert heal also fanned out to pools that never had a row, writing `skipped:stale` rows. The trigger now reads
  the alert itself and runs the gap fan-out only while it is `live` (`-419` item 3 (b)).
- **FS-5:** the label reads *"this cycle is not open"*, and a given-up row's `retry_not_before` is cleared.
- **FM-1:** a home card left mounted under the settings screen now re-reads its dismissal on focus.
- **FM-2:** the link error is announced where it is set (in `onFailed`, once per failure), and it belongs to the read it happened on.
  This removes a stale re-announcement after a hidden `isError` (a regression from G3-P1 combined with G3-P4).
- **FM-3:** a throwing `onOpened` is caught at the call site and logged with no URL.
- **FM-4:** the banned list adds the short-u जरुर / ज़रुर forms, चाहिए, पड़ेगा (both nukta forms) and अवश्य.
- **Accepted, ⛔ fixed (FM-5):** with G3-P2's foreground refetch and G3-P4's error gate, the card and entry blink out during an offline
  resume until the next successful read. AC8 ratifies *"renders NOTHING … on error"*, so the cost is accepted as the AC's own.
- **Fix-diff checks that hold:**
  - `underSavepoint`'s RELEASE-failure rollback cannot be reached on any claims path, and the KMS audit stays on the service pool.
  - 0191 applies on a fresh DB, and the journal order holds.
  - Every new jobs-pool statement carries `pariwar_id`.
  - The api test's deep import of `@twt/jobs/src/…` breaks no gate.
- **Focused validation after the follow-ups:** api spec 17/17; jobs live + triggers 195/195; admin page 11/11; domain specs 31/31;
  announcement-channels mobile tests 38/38; full mobile unit suite 2,143/2,143. Typecheck and lint are clean for api / admin / jobs / domain /
  contracts / mobile. `friction:check` is green; its AC-4 is re-checked after the commit.

**Groups 2–4 gate — 2026-10-29:** `DATABASE_URL=…:5445/twt_dev pnpm ci:local` ran on a FRESH throwaway container `twt-514-gate`
(`postgres:16-alpine`, database NAMED `twt_dev`, UTC). It is **36 / 36 green in ONE run**, on the final tree, after every patch and
follow-up. It covers lint, typecheck, build, unit, every invariant gate, `friction-budget` and `integration-tests`. The api integration job
was 204 / 204 files (2,462 tests, 1 skipped), and 0191 applied from scratch. That is the full-run proof G4-P4 asked for. Log:
`/private/tmp/claude-501/-Users-dev-Developer-projects-TWT/72fb0497-d19c-45cc-ab6d-3db60130e1ac/scratchpad/ci-local-g234.log`.
⚠ Still UN-ATTESTED, carried: no device run (Hindi wrapping, TalkBack / VoiceOver on the card and the new announcements, `openURL` with
and without the apps installed), and no real Telegram post (Row 44 (b)).

**Invariant lens (groups 2–4):**
- Family 3: G2-P3, a REAL GAP.
- Family 5: covered by test (`pariwar-announcement-channels-policy-regression.spec.ts`).
- Family 6: covered by construction (explicit field picks, `.strict()` responses, counts-only audit).
- Family 8: covered (`withCompensatingAudit` plus test; actor-id attribution per the channel-config precedent).
- Family 9: G2-P11 (trigger missing), with the BYPASSRLS scope corrected by G4-P3.
- Family 10: G4-P2, G4-P4, G4-P5, G4-P6.
- Family 11: covered; no benefit-gating predicate, and the policy-meaning sentence is checked.
- Family 12: covered by construction (the only client id is `:pariwarId`, scope-resolved).
- Family 13: G2-P10, G3-P1, G3-P3 REAL GAPs; (b) not constructible; (c) covered by test.

## Dev Notes

### ⚠ TRAPS

- **T1 — the fixture says `accepted`.** Never route the poster through `createTelegramBotProvider` / the composition (it falls back to the
  fixture when the mirror's `enabled` is false — F3, F5). Resolve the secret and build the handle directly (`createTelegramAppCache`).
- **T2 — do NOT add `deadline_reminder` to `TELEGRAM_ELIGIBLE_CATEGORIES`** (F2). That would send every member's day 5/10/13/14 reminder
  to their personal Telegram chat — a per-member privacy-posture change (§3.4). The channel post never uses `dispatch`.
- **T3 — the sweep runs daily; the day-14 hook must hold across runs** (a re-run the same day, a late run): the record's UNIQUE holds
  (F19 — the queue key does not); `cycleDay` 15+ posts nothing — test it.
- **T4 — the name needs decrypt deps in jobs AND in the API** (FS15) — in `full_name` mode ONLY. `resolvePoolIdentity` returns `null`
  on a decrypt failure and can THROW on its DB reads — `null` ⇒ `refused:identity_unavailable`; a throw ⇒ retry, final attempt only
  refuses + one alarm (`-418` item 3); ⛔ a post without the name in `full_name` mode. Do NOT read the Pariwar's presentation mode for the post:
  `-416` rules the full name (*"option A, full name"*); that this holds whatever the Pariwar's mode is `-416` item 2's NAMED READING
  (the session's, ⛔ the Panel's words) — unreachable today (no Pariwar is `shielded_name`). The F7 wiring's mode read is for the
  member's own notice, ⛔ this post. In `none` mode none of this runs (I5) — ⛔ "reuse" the identity wiring for the label.
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
⚠ *Dated 2026-10-29 (code review, `-419`):* the review added edit sites outside this list:
- NEW: migration `0191_announcement-post-recovery` (+ journal);
- `packages/domain/src/schema/alerts.ts` (the `alerts_pariwar_alert_uq` index);
- `apps/api/src/modules/claims/later-approval-warnings.ts` (`underSavepoint`'s RELEASE-failure rollback, G2-P2);
- `apps/api/src/modules/member-pool/pool-identity.ts` (a comment, G2-P11);
- `apps/mobile/components/home/HomeReminderCard.tsx` (`accessible` on "Not now", G3-P3, shared with the 6.36c cards).
UPDATE: `packages/channels/src/providers/telegram-app.ts` (FS7 only); `packages/queue/src/index.ts`; `packages/domain/src/schema/index.ts`
+ the domain barrel; `apps/jobs/src/scheduler/cycle-open-alert.ts` (one deps seam + one post-commit send);
`apps/jobs/src/scheduler/contribution-notify-triggers.ts` (the day-14 seam call; the recovery-sweep step; `operationalDate` /
`cycleDeadlineAt` imported from contracts); `apps/jobs/src/boot.ts` (`createQueue` first, worker, seam wiring); `apps/api/src/audit/audit-sink.ts` (one `AuthAuditEventType` member);
`docs/access-wrapper-invariants.md` + `scripts/access-wrapper-invariants/README.md` (the root lists); the webhook processor's TEST
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

the 0184 lifecycle + `alert-sms-sends.ts` accessor shape + the `alarmRefusalOnce` alarm de-dup (F15, `-418` item 5) · `createTelegramAppCache` · `channelConfig.getTelegramConfig`
· `resolveChannelSecret` · `resolvePoolIdentity` with mode `'full_name'` (`-416`) · `resolveCuratedPoolName` + `poolLetterCode` (`none` / skipped) ·
`member-pool/pool-identity.ts` + the `reconciliation-review` audited-read shape + `underSavepoint` (API) · `withCompensatingAudit` · `TelegramConfigForm` ·
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

Task 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Tasks 6 and 7 can run in parallel after 5. The migration is `0190` (`0189` is on `main`);
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

`.decision-log.md` `-416`, `-417`, `-418`, `-390`, `-389` (G10/G12/G13), `-180`, `-181`, `-160`, `-173`, `-070`, `-415` FS17 · the 2026-10-23 routing note Q2 ·
`packages/contracts/src/public-pages/matrix.ts:394-415`, `sahyog-vivran.ts:41` · `5-11-per-member-sms-fallback-fixed-wording.md` "The words",
FS16 · `architecture.md` §3.4 · `prds/prd-TWT-2026-05-22/prd.md` FR-73, FR-94 (R10(B)); `addendum.md` RA-29 · `docs/tone-guide.md` §3 ·
`deferred-work.md` (5.11 section, the channels item; the Telegram re-fetch loop item) · `friction-budget.md` · the files cited in F1–F19.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) — `bmad-dev-story 5.14`, 2026-10-29.

### Debug Log References

(a) Task 0.2 answers — verbatim.
- **2026-10-29, BigDev, verbatim:** *"FS1-FS15 as recommended."* ⇒ every FS takes its ⭐ option, and that option's cost line is
  accepted as written (FS1 (a) … FS15 (a), as the FS block stands at v1.2). That includes FS3 (a)'s *"a `pariwar_admin` can switch on
  posts that may name the deceased"* (⇒ ⛔ `super_admin`-only); FS8 (a)'s dropping of "TWT:" and of the last-day *"for pool {pool}"*;
  and FS15 (a)'s audited admin decrypt, crossing D11. ⚠ NOT answered by this line: "The words" (en + hi), so roster leg (c) stays open;
  the Hindi script choice (व्हाट्सएप / टेलीग्राम vs Latin); PQ1 (the Panel's — the note is written, NOT sent).
- **2026-10-29, BigDev:** *"prepare rotuing note"* ⇒ Task 0.3's note written (path above).
- **2026-10-29, the Panel's PQ1 ruling, relayed by BigDev, verbatim:** *"by DR and KB"* / *"option A, full name"* ⇒ `2026-10-29-416`
  (Trustee-ratified), committed alone (`26fc1f47`); the note's ruling block filled; FS6's constant `'full_name'`; leg (d) MET.
- **2026-10-29, BigDev, verbatim, on "The words" (en + hi):** *"Hindi is fine, I reviewed it. commit it"* ⇒ the post and app strings
  as tabled at v1.4 are approved; BigDev states the Hindi was REVIEWED ⇒ roster leg (c) MET for those strings (a later change to any
  string re-opens it); the app's Hindi stays in Devanagari (व्हाट्सएप / टेलीग्राम, सूचनाएँ). ⇒ `2026-10-29-417` (author-commit) staged
  and committed ALONE (`5fadaabd`; after the rebase `0f55578f`).
- ⚠ BigDev's "as recommended" answered the v1.2 FS text; v1.4's differences are `-416`'s consequences (FS6 constant, FS15 no mode
  read, FS13 (d)); BigDev's "commit it" (said of "The words") committed `-417`, whose text carries them; that BigDev weighed `-416`
  item 2's named reading is ⛔ recorded — it stays the session's reading (T4).
- **2026-10-29, BigDev, v1.6 (third validation), as chosen:** counsel leg *"Keep asked-or-accepted"*; last-day date *"Mirror, record
  cost"*; a throwing identity read *"Retry, final only"*; recording *"New entry -418"* ⇒ `2026-10-29-418` committed ALONE (`194f6d23`).

(b) RED proofs (2026-10-29, the story DB `twt-514-pg` :5444, a throwaway container whose database is NAMED `twt_dev`).
- Task 1: the post-record spec green 21/21; RED by mutation — the freeze trigger DISABLED on the story DB ⇒ the freeze test fails (1), then
  re-enabled. The config spec 8/8. The whole `@twt/domain` suite 439/439 files on the story DB.
- Task 2: the builder's `@ts-expect-error` (⛔ a member field) is LOAD-BEARING — without it `tsc` reports TS2353 (the contracts tsconfig
  includes `tests/`). The Story 8.9 window fence pinned the sweep's arithmetic by TEXT; it now pins the call to `cycleDeadlineAt` and the
  helper's un-extended body (the arithmetic MOVED, unchanged). OpenAPI: a parsed before/after diff — exactly 3 paths (4 operations) and
  4 schemas added, nothing changed (the textual diff's 67 deletions are YAML anchor renumbering).
- Task 3: the 5 new client tests failed first (the hung-server case hung to the 5 s test timeout), then green; the mirror's 18 earlier
  tests unchanged; `channels-determinism` green (462/462 in `@twt/channels`).
- Task 4: the poster's 20 live tests passed first run ⇒ RED by mutation: "metadata absent ⇒ final" + the switch check removed ⇒ 4
  failures, restored ⇒ 20/20. The F4 webhook test is a PIN on code traced safe at the pin (⛔ edited) — it passed on first run; no RED
  is possible without editing the processor (T5). Seam tests 8 (cycle-open 2, triggers 6). Full `apps/jobs` suite 86/86 files.
- Task 5: the access-wrapper gate RED with a planted bare `audit.writeAuditEntry` in the new module's `mutate` (1 finding), green after
  removal. The API spec 9/9; RED by mutation — the per-row savepoint removed ⇒ the throwing row's real SQL error aborts the transaction
  and the NEXT row's words are lost (1 failure), restored ⇒ 9/9. Full `apps/api` suite 204/204 files on the story DB.
- Task 5 access-wrapper checklist walk (`docs/access-wrapper-invariants.md`), both route groups + the job: (a) authorization from the
  caller's grants (`requirePermissionHook`) / the session's own Pariwar — ⛔ a caller-supplied flag; the job's Pariwar is the envelope's,
  every statement by explicit predicate; (b) no default-disclosure path — no row ⇒ the OFF defaults (nothing about anyone); (c) the PUT's
  audit hash is over config values (links, chat id, the switch — ⛔ PII); the read line carries counts only; (d) no best-effort write on
  the request tx (the read audit is the sink; the job's writes are their own short transactions); (e) ⛔ a new key — `pariwar.configure_
  channels` at pariwar scope on `:pariwarId` routes; (f) ⛔ a credential compare; (g) the PUT under `withCompensatingAudit`, the module
  in `CHANNEL_ROOTS` (gated).
- Task 6: the admin test 5/5 (`navigator.clipboard` stubbed AFTER `userEvent.setup()`, which installs its own stub); the admin suite
  83/83; `microcopy:check` green over `apps/admin`.
- Task 7: the render suite 6/6; RED by mutation — the join button dismissing BEFORE `openURL` resolves ⇒ the ordering test fails (1),
  restored ⇒ 6/6. Dismissal + key + cache 5, copy-key pin 4 (the real `t()`, en + hi), source pins 6; the mobile suite 106/106 files.
  ⚠ UN-ATTESTED (no device run this session — [[feedback_record_unattested_no_backfill]]): the long Hindi labels' wrapping
  (`noTextWrap` + own `Text`, the `NomineeMarkControl` shape — a render test proves only the props), TalkBack / VoiceOver reading the
  card and the two link buttons, and `Linking.openURL` on a real phone with / without WhatsApp and Telegram installed.
- AC11: `git diff origin/main --` the frozen list (dispatch, cascade, the composition, delivery, the telegram-opt-in module, the webhook
  processor, the Telegram settings screen, permissions, the flag registry, telegram-errors, ADR-0030) is EMPTY (0 lines); the
  `telegram-app.ts` diff is the timeout + `signal` + `retryAfter` alone. ⚠ *Dated 2026-10-29: true of `b3218697`. It no longer holds after
  code review G1-4 / G1-7 (`-419` item 4), which also changed the shared client's acceptance and bound checks.*

(c) Gate runs (2026-10-29, a FRESH throwaway container `twt-514-pg` on :5444, database NAMED `twt_dev`, UTC session — the clean
single-run recipe; `DATABASE_URL` set on the command, ⛔ the shell's :5432).
- `pnpm ci:local`, first run: **35 / 36 green** — every job except `test (unit)`. The one failure: `apps/mobile/tests/unit/memorial-screens-
  render.test.ts` (Story 11b.4's file — ⛔ touched by this branch: `git diff origin/main` over the memorial components, screens and that
  test is empty). Its first P4 test hit the 5 s vitest timeout (12.4 s) under the parallel load (load average ≈ 11–12 during the run),
  and 133 later tests in the same file cascaded from the left-over render (`Unable to find … memorial-withdraw`). The known
  `ci:local` oversubscription class ([[project_ci_local_concurrency_oversubscription]]) — ⛔ a regression: that file alone 346 / 346;
  the whole mobile suite 106 / 106 files (twice this session).
- `test (unit)` re-run ALONE with its exact `ci-local.sh` command (`env -u DATABASE_URL pnpm turbo run test --concurrency=4`): **37 / 37
  tasks green**. ⇒ every one of the 36 jobs has passed on this tree; ⚠ not in one single run — recorded as such, ⛔ "36/36".
- `pnpm friction:check` after the Task 7 commit: green (AC-4 — one row added). `i18n:check`, `microcopy:check`,
  `contracts:check-openapi-determinism`, `access-wrapper:check`, `domain-invariants:check`: green (also inside `ci:local`).

(f) Task 0.4 records — 2026-10-29 (`bmad-dev-story 5.14`): `git fetch origin` — `origin/main` still `770ba815` (the branch's base); ListAgents: no other session; worktree clean. Next free numbers re-found: decision `-419` (none minted here), roster Row 44, ledger `2026-10-29k` (`main` -29d, 11b.5 -29b, this branch -29j). Written: `epics.md` `### Story 5.14` (after 5.13); architecture §3.4 dated ANNOTATION (after 5.8b's); roster Row 44 `trust-announcement-channels-live` (legs (a)–(f) per `-417` FS13 / `-418` item 1 and §2) + a Row 26 dated note; deferred-work: the 5.11 channels item's appended line (HOMED → building) + a new `## Story 5.14` section holding the `shielded_name` item; a dated pointer under `-389` (G13 discharged by `-417` §2). ⚠ AC10's friction-ledger row and disposition are written WITH the card (Task 7) and checked at Task 8 — the friction gate reads committed history and the card's event type does not exist yet. Sprint-status: row ready-for-dev → in-progress; ledger `-29k` in both ledgers; YAML parses (296 rows).

(d) Task 0.1 preflight — 2026-10-29: `git fetch origin`; `origin/main` = `282bdd33` = the pin (no rebase); `git merge-base
--is-ancestor 282bdd33 HEAD` true; `git diff --name-only 282bdd33..origin/main -- packages apps scripts docs/adr
docs/launch-gate-inventory` EMPTY ⇒ F1–F19 hold as re-traced at v1.2 the same day (three verifiers). **S1** none: max decision `-415`
on `main` and on every branch and worktree. **S2** known overlap only: 6.32 (migrations / journal / roster / decision-log /
sprint-status), 11b.5 (sprint-status ledger); 12-1 / 13-2 none. **S3** unchanged since v1.2 (next decision `-416`, Row 44, migration
`0190`). **S4** F4 holds (no code drift). **S5** none: no `clause_versions` row for `niy.public-disclosure.member-information` in any
migration or seed; `NAME_PUBLICATION_AUTHORISED` unchanged (`public-read.ts:393`). New at Task 0.3: 11b.4a's public memorial
(`-391` / `-411`, on `main` since 2026-10-28) — G3 corrected.

(d2) Rebase 2026-10-29 onto `origin/main` `770ba815` (6.32 LANDED, PR #309). Backup `backup/5-14-pre-rebase-2026-10-29` (= `234cf15b`).
Conflicts only in `sprint-status.yaml`'s two ledgers (branch lines on top); verified: every file's `-U0` changed-line set vs `origin/main`
equals the backup's vs the pin; `-416` / `-417` byte-identical; YAML parses with a duplicate-key loader (296 rows); `^last_updated:` once.
The code drift since the pin (84 paths, 6.32's claim / ground-inspection) touches this story's cites only at `apps/admin/src/api/client.ts`
(F14 → `:958,963`), `schema/index.ts` and the journal (appends); F1–F19 re-traced at `54e983da` by three verifiers (Debug Log (e)).
SHA map (old → new): creation `05d0dfe9` → `5b4fcc53`; v1.2 `e5544f16` → `5eb734b1`; v1.3 / note `f5929d7d` → `71e0eaf2`; `-416`
governance `26fc1f47` → `3371b6d6`; `-416` records `275aefb9` → `3fa72338`; `-417` governance `5fadaabd` → `0f55578f`; `-417` records
`234cf15b` → `54e983da`. `-416`'s and `-417`'s Status lines and the note's header cite the OLD SHAs and "on `282bdd33`" — kept as written (a record);
this map resolves them.

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
- **v1.5 → v1.6** (after the rebase; three fresh-context verifiers — jobs / channels / DB; API / admin / mobile / copy; governance +
  the v1.3–v1.5 edits; 4 critical, ~15 should-fix, ~12 low; critical ones re-checked by hand). **Critical:** (1) AC2 / Task 5 still
  ordered the presentation-mode read `-416` removed (two verifiers); (2) the last-day stale rule skipped every day-14 post of a cycle
  frozen 00:00–09:30 IST — now judged on `deadlineAt`, the date band accepted (`-418` item 2); (3) no final-attempt rule — pg-boss
  metadata, absent ⇒ ⛔ final (`-418` item 4); (4) the PQ1 block showed the draft question as live — marked. **Decisions (BigDev,
  `-418`):** counsel leg kept asked-or-accepted (what the Panel was told named); identity throw retries. **Should-fix:** the 0184
  lookup step; the never-attempted write path; the trigger's real shape + the `detail` vocabulary; the pools-only read's fields; the
  recovery-sweep placement; per-row savepoint; the audit event + its true cost; `gcTime: 0`; `alarmRefusalOnce` ⛔ `createTtlMemo`;
  T4's reading attributed to the session; leg (d)'s build half; `-416`'s cost line; rulings rows; stale header / Hindi labels; the
  SHA map; NUMBERS + the ledger relabel `-29c` / `-29d` → `-29h` / `-29i`; the `shielded_name` deferred item. **Low:** cites
  (`client.ts`, wa-opt-in GET, `boot.ts`, `whatsapp-app.ts`, the 0184 spec), `$comment` scanned by microcopy, the `CHANNEL_ROOTS`
  docs, the admin OpenAPI paths, the boot pin, the form's bot hint, the AC↔Task map, the `{ posts }` wording. **Dismissed:** a
  claimed glyph inversion in `-416` §2 (doubled ⛔ is volume, ⛔ cancellation).
  **Fix-diff review** (one fresh-context reviewer of `-418` + this diff, before commit): 0 high / 5 medium / 12 low — ALL the pass's own,
  all applied: `-418` corrected INSIDE its own commit (a fixup, before landing — it now names the `-417` points it narrows: leg (d), §4 (3)'s
  stale rule, FS7's last-day max age, §3 item 3's switch-off outcome; the `deferred` give-up on a secret / identity refusal; the 6.36d
  precedent for "absent ⇒ ⛔ final"); a sentence crediting BigDev with the session's reading struck; the give-up swept to I1 / AC5 (iii);
  AC2's pagination wording; cites (`alert-sms-sends.ts:267-297`, `emit-openapi.ts:1992-2108`, the `:41-50` note, the `:1337` placement);
  `underSavepoint` named, `safeDecrypt` dropped; alarms on the final identity refusal; Task 5's new test legs.

### Completion Notes List

- 2026-10-29: Ultimate context engine analysis completed - comprehensive developer guide created (`bmad-create-story 5.14`, at
  `282bdd33`; four read-only research passes — governance, server code, mobile/admin surfaces, platform docs — then one fresh-context
  checklist verifier).
- 2026-10-29: v1.2 — second checklist validation (three parallel fresh-context verifiers; 30 findings applied) — Debug Log (e).
- 2026-10-29: v1.6 — rebased onto `770ba815`; third checklist validation (three verifiers); `-418` committed alone — Debug Log (d2), (e).
- 2026-10-29: `bmad-dev-story 5.14` — Tasks 0.4–8 DONE (Debug Log (b), (c), (f)). Built: migration `0190` (`pariwar_announcement_channels`
  — one switch, created OFF; `announcement_channel_posts` — the 0184 lifecycle, ⛔ a name or text column) + the domain accessors (every
  statement by explicit `pariwar_id`); the contracts (DTOs, the ONE post builder, `ANNOUNCEMENT_POST_NAME_MODE = 'full_name'` pinned to
  `-416`; `operationalDate` moved, `cycleDeadlineAt`); the words en + hi; the Telegram client's 9 s timeout + `retryAfter`; the poster
  job (cycle fan-out, at-most-once posts, the 429 re-send, the `-418` final-attempt / give-up / alarm rules) and its three seams; the
  API (config, the audited "Posts" list with a savepoint per row, the member read); the admin section; the mobile card / entry / screen
  and the friction row. Day-one output is still NONE (every switch OFF; roster Row 44 legs (a), (b), (e), (f) open; (d)'s constant half
  closes when this lands on `main`).
- ⚠ Carried, ⛔ done here: no device run — Hindi label wrapping, TalkBack / VoiceOver on the card, `openURL` with / without the apps
  installed are UN-ATTESTED (Debug Log (b), Task 7); no real Telegram post (roster Row 44 (b) — staging).

### File List

- `.decision-log.md`
- `_bmad-output/implementation-artifacts/5-14-trust-announcement-channels.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-29-5-14-public-channel-naming-the-family.md`
- `apps/admin/src/api/client.ts`
- `apps/admin/src/api/hooks.ts`
- `apps/admin/src/modules/channel-config/AnnouncementChannelsForm.tsx`
- `apps/admin/src/modules/channel-config/AnnouncementPostsList.tsx`
- `apps/admin/src/modules/channel-config/ChannelConfigPage.tsx`
- `apps/admin/tests/announcement-channels-page.test.tsx`
- `apps/api/src/audit/audit-sink.ts`
- `apps/api/src/modules/announcement-channels/handlers.ts`
- `apps/api/src/modules/announcement-channels/index.ts`
- `apps/api/src/modules/announcement-channels/routes.ts`
- `apps/api/src/server.ts`
- `apps/api/tests/integration/announcement-channels.spec.ts`
- `apps/jobs/src/boot.ts`
- `apps/jobs/src/scheduler/announcement-channel-post.ts`
- `apps/jobs/src/scheduler/contribution-notify-triggers.ts`
- `apps/jobs/src/scheduler/cycle-open-alert.ts`
- `apps/jobs/tests/announcement-channel-post-live.test.ts`
- `apps/jobs/tests/contribution-notify-triggers.test.ts`
- `apps/jobs/tests/cycle-open-alert.test.ts`
- `apps/jobs/tests/tg-webhook-processor.test.ts`
- `apps/mobile/app/(settings)/announcement-channels.tsx`
- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/components/announcement-channels/ChannelLinkButtons.tsx`
- `apps/mobile/components/announcement-channels/useAnnouncementChannelsQuery.ts`
- `apps/mobile/components/home/AnnouncementChannelsCard.tsx`
- `apps/mobile/components/home/HomeReminderCard.tsx`
- `apps/mobile/components/notifications/AnnouncementChannelsEntry.tsx`
- `apps/mobile/lib/announcement-channels-dismissal.ts`
- `apps/mobile/lib/session-context.tsx`
- `apps/mobile/tests/unit/announcement-channels-copy-keys.test.ts`
- `apps/mobile/tests/unit/announcement-channels-dismissal.test.ts`
- `apps/mobile/tests/unit/announcement-channels-render.test.ts`
- `apps/mobile/tests/unit/announcement-channels-source-pins.test.ts`
- `docs/access-wrapper-invariants.md`
- `docs/launch-gate-inventory/inventory-roster.md`
- `friction-budget.md`
- `openapi/v1.yaml`
- `packages/api-client/src/index.ts`
- `packages/channels/src/index.ts`
- `packages/channels/src/providers/telegram-app.ts`
- `packages/channels/tests/telegram.test.ts`
- `packages/contracts/package.json`
- `packages/contracts/scripts/emit-openapi.ts`
- `packages/contracts/src/alerts/contribution-loop-templates.ts`
- `packages/contracts/src/announcement-channels/channels.ts`
- `packages/contracts/src/announcement-channels/index.ts`
- `packages/contracts/src/announcement-channels/post.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/tests/announcement-channels.test.ts`
- `packages/contracts/tests/contribution-window-fence.test.ts`
- `packages/domain/migrations/0190_announcement-channels.sql`
- `packages/domain/migrations/0191_announcement-post-recovery.sql`
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/announcement-channels/config.ts`
- `packages/domain/src/announcement-channels/index.ts`
- `packages/domain/src/announcement-channels/posts.ts`
- `packages/domain/src/announcement-channels/reads.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/policies/announcement-channels-rls.ts`
- `packages/domain/src/policies/index.ts`
- `packages/domain/src/schema/alerts.ts`
- `packages/domain/src/schema/announcement_channel_posts.ts`
- `packages/domain/src/schema/index.ts`
- `packages/domain/src/schema/pariwar_announcement_channels.ts`
- `packages/domain/tests/integration/rls/announcement-channel-posts-policy-regression.spec.ts`
- `packages/domain/tests/integration/rls/pariwar-announcement-channels-policy-regression.spec.ts`
- `packages/i18n/locales/en/common.json`
- `packages/i18n/locales/en/contribution.json`
- `packages/i18n/locales/hi/common.json`
- `packages/i18n/locales/hi/contribution.json`
- `packages/queue/src/index.ts`
- `pnpm-lock.yaml`
- `scripts/access-wrapper-invariants/README.md`
- `scripts/access-wrapper-invariants/check.ts`

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-29 | 1.0 | Created (`bmad-create-story 5.14`): FS1–FS14 + PQ1 proposed; ready-for-dev. |
| 2026-10-29 | 1.1 | Checklist validation (one verifier: 2 critical / 5 high / 12 medium / 10 low) — all applied; Debug Log (e). |
| 2026-10-29 | 1.2 | Second checklist validation (three parallel verifiers: 6 critical / 19 should-add / 4 optimisations / 1 LLM) — all applied on BigDev's "all"; Debug Log (e). Ledger relabelled `-29a` → `-29c`; migration `0190`. |
| 2026-10-29 | 1.3 | Task 0.1 done (clean — Debug Log (d)); Task 0.2: FS1–FS15 answered as recommended (Debug Log (a)), "The words" still open; Task 0.3: the PQ1 note written, NOT sent; G3 / PQ1 corrected (the public memorial; `-198`). |
| 2026-10-29 | 1.4 | PQ1 RULED — `2026-10-29-416` (Trustee-ratified, DR + KB): *"option A, full name"*. FS6's constant `'full_name'` (no presentation-mode read); I5 / AC4 / FS15 / T4 / Task 4 updated; go-live leg (d) MET; FS6's deferred item not created; the note's ruling block filled. |
| 2026-10-29 | 1.5 | Task 0.2 done — "The words" (en + hi) approved and the Hindi reviewed by BigDev (roster leg (c) MET for the v1.4 strings); Task 0.3 done — author-commit `2026-10-29-417` committed alone. |
| 2026-10-29 | 1.6 | Rebased onto `770ba815` (6.32 landed; SHA map, ledger `-29c` / `-29d` → `-29h` / `-29i`); third validation — 4 critical / ~15 should-fix / ~12 low, all applied; author-commit `2026-10-29-418` (amends `-417`) committed alone; Debug Log (d2), (e). |
| 2026-10-29 | 1.7 | `bmad-dev-story 5.14` started — Task 0.4 records (epics, §3.4 annotation, roster Row 44 + Row 26 note, deferred-work, `-389` pointer); Status in-progress; Debug Log (f). |
| 2026-10-29 | 1.8 | Tasks 1–8 built and tested (Debug Log (b), (c)); `ci:local` 35/36 + the unit job green on its own re-run (a memorial-file timeout under load — untouched by this branch); Status → review; File List. |
| 2026-10-29 | 1.9 | Group 1 posting-pipeline review: 7 patches accepted (BigDev “1”) and applied; migration 0191; strict acknowledgement, durable delayed retry/recovery, ID binding, two-connection race and mixed-payment privacy proofs. Gate 34/36 + typecheck (20/20) and unit (37/37, serialized) reruns green; remaining file-group reviews pending; Status → in-progress. |
| 2026-10-29 | 2.0 | Groups 2–4 reviewed in parallel (nine layers): 1 decision (BigDev "2": the Panel is told before switch-on if leg (e) is met by "not asked"), 37 patches (BigDev "1") and 9 fix-diff follow-ups, all applied; 3 deferred; 21 dismissed. Author-commit `2026-10-29-419` committed alone (`7885114d`); records corrected (dated pointers under `-416` / `-417` / `-418`, roster Rows 26 / 44, the §3.4 annotation, epics, deferred-work, ledger `-29m`). `ci:local` 36 / 36 in one run on a fresh container. Status → done. |
