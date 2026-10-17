---
baseline_commit: cdc39004
---

<!--
⭐ CUT 2026-10-10 from Story 6.27 v2.0 (`2026-10-10-305` §2 item 1).
⭐ RE-PINNED 2026-10-16 (v3.0 — `bmad-create-story 6.27c` run on this EXISTING file; BigDev chose 6.27c when asked for "6.26c") from
`fa2687ce` to `cdc39004` (`main` after 6.27a, 6.27b, 6.27d, 6.30, 6.34, 6.36a, 6.36b, 6.36 AND 6.36c shipped). ⚠ `fa2687ce` is ⛔ NOT an
ancestor of `main` (547 code files moved since it). Every `file:NNN` below is AS OF `cdc39004`, re-read by four read-only checkers
(6.27a's ping / answer substrate; the send core and the sweep; DLT typing + app links + the roster; 6.36's selection + governance) and
the author. The v2.x text is replaced, ⛔ not annotated — its history is the Change Log.
⚠ Before Task 1: `git diff --name-only cdc39004..HEAD -- packages apps scripts infra docs/launch-gate-inventory` — re-read any cited file
that moved.

STATUS: `done` — code review round 2 (2026-10-17): 3 decisions resolved by BigDev (D3 ⇒ `2026-10-17-344`), 18 patches applied and
adversarially re-reviewed, W1–W8 + W10 deferred, W9 accepted; before it,
round 1's six patch findings F1–F6 resolved (2026-10-17, `bmad-dev-story` review continuation).
⭐ SENDING IS LAST on purpose: once a real text goes out, real answers arrive — the warnings and the wait (6.27b), the approvers' view
(6.27b), the inspector's independence (6.27d) and the workplace selection (row 6-36) all exist now.
⭐ THE RECORD is 6.27a's file (`6-27-peer-mesh-sending-replies-and-date-of-death.md` — rulings, Invariants, F1–F41, PM1–PM25, Traps 1–21).
This file BUILDS the PMs tagged **[c]**: PM1 (the send-time exclusions + `-311`'s replacement), PM2 (the channel + registry), PM3 (the
words), PM4 (the `detail` grammar, the builder and the writers), PM5 (when it is sent), PM14, PM15, PM16's DLT templates, PM21 (b)–(f),
PM22, and PM11's `?c=` half. Where a summary below and 6.27a's text disagree, 6.27a's text is the record — EXCEPT the author readings
R1–R16 below, which this file records because 6.27a's text was written before the code it now runs on existed.
GLYPH REGISTER, ADDRESSING RULE: as 6.27a.
-->

# Story 6.27c: Each of the Five Is Texted Once — Naming the Member, With a Link to the Questions and the Helpline, in the Pariwar's Language, While an Answer Can Still Be Taken `[SURFACE]`

Status: done

> ⭐⭐ **WHAT THIS STORY IS.** The Panel ruled that each of the five neighbours is texted (`-303` Q1 A): *"We have been told that [member]
> has died. If you knew them, please answer a few short questions: [link] — or call the helpline [number]."* (`-304` Q6 A). This story
> sends that text — once ever per neighbour, through 6.24b's shared DLT send core with 6.29's hold / park / give-up; ⛔ never at night;
> while the claim can still take an answer (`-305` §2 item 4; `-324`); in the Pariwar's default language until row 6-35 lets members
> choose (`-310` CF1 A). A neighbour skipped at send time is REPLACED by the next eligible person in the SAME group (`-311` PM1; `-330`
> SW22 / SW23 / SW27). The link opens 6.27a's questionnaire (LIVE version `peer_mesh.v4` — `-331` SC4 A; ⛔ no change to the TEXT) through
> row 6-30's plumbing; 6.27a's card, list and notice-strip item are DARK until this story writes `send_outcome = 'accepted'`.
> ⚠ **Go-live, ⛔ never a merge fence** ([[project_not_in_production_merge_is_not_golive]]): the TEXTS wait for roster Row 27 — ALL EIGHT
> conditions (a)–(h), incl. (f) counsel's basis for the two health questions (MECHANISED here — AC2b, its tests in AC4) and (h) Row 31 closed (6.36a SW28);
> the template ids are ⛔ never provisioned until Row 27 closes; a real `https://` link opening the app is Row 29 (e).

## Story

As **the Trust** —
I want **each of the five neighbours texted once, with a link straight to the questions and the helpline number**,
so that **the check with neighbours actually reaches people — and ⛔ never says more than the Panel ruled, ⛔ never at night, and ⛔ never
after the claim can no longer take an answer.**

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ no predicate that gates a member's access to a benefit, and changes ⛔ none.** It decides WHICH NEIGHBOUR receives
a text and WHEN; ⛔ no approval, refusal, payment, warning or claim state reads anything it writes (6.27b's warnings read ANSWERS, which a
neighbour gives only after being texted — 6.27a PM11). It reuses two predicates without changing them: 6.27a's answer window
(`isClaimInAnswerWindow` / `answerWindowSql` — ratified by `-324`) and row 6-36's eligibility (`peerMeshEligibleMemberSql` — `-330` SW23,
`-340`, `-341`). A claim whose neighbours cannot be texted (e.g. `name_too_long`) still goes on — the ground inspection carries it
(`-310` CF4 A). In the member's terms: *"whether the Trust texts a neighbour about a reported death never changes what the family is paid
or whether they are paid."* Checked against the Niyamavali: ⛔ no clause governs who is asked about a death (it is ⛔ not a benefit
predicate; the Niyamavali is a rulebook, ⛔ not binding — [[feedback_niyamavali_rulebook_not_spec]]).

## The rulings this part builds (from 6.27a's table)

`-303` Q1 A (the text, the five; the 48-hour WhatsApp reminder is row 6-31 — ⛔ not built here) · `-303`'s language rider, narrowed for a
time by `-305` §2 item 2 (✅ `-310` CF1 A) · `-304` Q6 A (*"a few short questions"*) · `-305` §2 item 4 (the text while an answer can still
be taken) + `-324` (the R9 arm ratified) · `-310` CF4 A (workplace, else named people, else nobody; fewer than five ⇒ fewer texts) ·
`-295` RB4 / RB5 / RB11 / RB12 / RB16 · `-302` RN2–RN8 · `-255` F7 (the cost line) · author-commits `-311` PM1–PM5, PM14–PM16, PM21, PM22 ·
`-322` C1 / C6 / C7 + `-323` R1 (6.34's vocabulary, the helpline warning, Row 30 (d)) · `-329` decision 4 (a send writes exactly
`'accepted'`) · `-330` SW22–SW25, SW27, SW28 · `-331` SC4 A · `-339` RF1 C / `-340` call 1 (a replacement reads the STORED ranking) ·
`-340` call 2 + `-341` (⛔ anyone who reported the death through any channel).

## ⭐ FOUND FACTS at `cdc39004` (BF1–BF34 — each ⇒ the AC / Task it feeds)

**The ping table and the selection**
- **BF1** `claim_peer_mesh_pings` (`packages/domain/src/schema/claim_peer_mesh_pings.ts`; `PEER_MESH_SEND_OUTCOMES` `:42-50` = `attempting,
  accepted, rejected_invalid_number, rejected_unreachable, no_target, error, skipped_superseded`; `PEER_MESH_LOCALE_SOURCES` `:54`; delivery
  columns `:86-105`; `source` `:109`). 0156 (`packages/domain/migrations/0156_claim-peer-mesh-replies.sql`) added the 13 delivery columns
  (`:41-53`), the structural CHECKs (`:55-63` — the value set; `attempt_count >= 0 AND (send_outcome IS NULL) = (attempt_count = 0)`;
  `attempting` ⇒ `claimed_at` + `claimed_by_job`; while `attempting`, `sweep:held` ⇔ `parked_at`; `detail` / `first_detail` ≤ 200;
  `locale_source IN ('pariwar_default')`; `link_code ~ '^[0-9A-Za-z]{12}$'`; `UNIQUE(link_code)`), `REVOKE UPDATE` + a column `GRANT UPDATE`
  on exactly the 13 (`:64-65`), the partial index `(aging_since, claimed_at) WHERE send_outcome='attempting'` (`:66`) and the BEFORE UPDATE
  trigger `claim_peer_mesh_pings_guard_delivery` (`:68-101`: a finished row frozen; ⛔ back to NULL; `aging_since` ⛔ backwards / ⛔ to NULL;
  `link_code` write-once). ⛔ Nothing constrains the `detail` GRAMMAR today. The Drizzle file declares ⛔ none of 0156's CHECKs nor the
  partial index (`:111-120`) — **hand-author the migration** (⛔ `drizzle-kit generate`). INSERT is table-wide (`0054_claim-peer-mesh.sql:78`).
- **BF2** ⛔ **No `replaces_ping_id` column exists** (`git grep replaces_ping` — empty), although `-311` PM1 commits *"a NEW ping row naming
  the one it replaces (`replaces_ping_id`), at most five live"*; and ⛔ nothing caps live pings at five (only the selection's
  `selected_member_ids ≤ 5`, 0054). `UNIQUE(selection_id, member_id)` (`0054:71`) blocks re-pinging the same person in a selection. ⇒ AC1b,
  R2.
- **BF3** `aging_since` is NULLABLE with ⛔ no default (`0156:45`; schema `:93`) and ⛔ no CHECK requires it while `attempting` — a begin
  that forgets it makes a stalled ping NEVER give up. 0155's suspicion twin is `NOT NULL DEFAULT clock_timestamp()`. And 0156's trigger
  admits ANY forward `aging_since` move (`:87-90`) and lets `attempt_count` fall and `first_detail` / `claimed_*` be rewritten while
  `attempting` — deferred-work *"Ping delivery columns unconstrained while `attempting`"* (`deferred-work.md` §6.27a second pass group 1),
  **owner 6.27c**. 0155 admits an `aging_since` move ONLY on a parked re-claim (`0155_claim-suspicion-notice-backstops.sql:58-66`). ⇒ AC1b.
- **BF4** The selection (0163, `packages/domain/migrations/0163_peer-mesh-workplace-selection.sql:22-38`): `ranked_member_ids uuid[]` (≤ 500,
  the WINNING group's ranking only), `source` (`workplace` / `named_by_member`), `anchor_claim_case_id`; identity columns IMMUTABLE (`twt_app`
  UPDATE narrowed to `outcome, response_window_expires_at, skip_reason`); a ping's BEFORE INSERT trigger
  `claim_peer_mesh_pings_source_guard` (`:77-97`) refuses a `source` ≠ its selection's. A `district_cohort_v1` (pre-6.36) selection has a
  NULL ranking; a `named_by_member` selection's ranking normally EQUALS its selection (≤ 3 accepted names — `peer-mesh-metric-registry.ts:160`)
  ⇒ ⛔ nobody left to replace from (`-310` CF4: fewer are asked).
- **BF5** `persistPeerMeshPingIntents(db, selectionId, pariwarId, memberIds, source)` (`packages/domain/src/claim/peer-mesh-persist.ts:142-165`)
  — `source` REQUIRED; `ON CONFLICT DO NOTHING`; returns a COUNT, ⛔ the new `ping_id`, ⛔ a replaces-link ⇒ a replacement needs its own
  inserter (R2).
- **BF6** `peerMeshEligibleMemberSql(m, { deceasedMemberId })` (`packages/domain/src/claim/peer-mesh-read.ts:449`; exclusions `:450-464`):
  ⛔ `state <> 'active'`; named as the deceased by ANY claim (`namedByClaimSql`, `packages/domain/src/member/known-people.ts:88`); ⛔ a
  `member_identities` row; the deceased; the claimant of ANY claim for this death (`-340` call 2); the filer of ANY `intake_attempts` row
  for this death (`-341`). ONE boolean ⇒ PM4's fixed details need a LABELLING step that ⛔ never re-composes the gate (R4).
- **BF7** ⭐ **A replacement neighbour's first `has_died` save is a 500 today.** `recordPeerMeshResponse` still refuses a responder outside
  `selection.selectedMemberIds` (`peer-mesh-persist.ts:277-279` — the v2.x cite `:235-237` is stale) and is called by the reply writer at the
  first `has_died` save in the SAME tx (`packages/domain/src/claim/peer-mesh-reply.ts:464-471`); `PeerMeshResponderNotSelectedError` is ⛔
  mapped (`apps/api/src/modules/claims/peer-request-core.ts:63-67`) ⇒ an unmapped 500 that rolls the save back — app AND helpline. The
  immutable `selected_member_ids` cannot be widened (BF4) ⇒ the check MOVES to the ping rows (`-330` SW27; 6.36a SF11). The test that pins
  today's refusal: `apps/jobs/tests/claim-peer-mesh.test.ts:800`. The 72-hour count reads `claim.peer_mesh_responded` EVENTS, so a
  replacement who answers counts once fixed (FQ10 unchanged).

**The send core and the clone source**
- **BF8** `sendClaimDltSms(deps, { dltTemplateIdConfigKey, pariwarId, e164, render: (helpline) => string })`
  (`apps/jobs/src/scheduler/claim-dlt-sms-send.ts:100-167`; result `:43-58` — `final accepted {providerMessageId}` / `final
  rejected_invalid_number | rejected_unreachable | error {detail, alarm}` / `transient {detail}`). It resolves ONLY the template id and the
  helpline (`sms.claim_correction.helpline_number.<pariwar>` — `claim-correction-sms-templates.ts:109-111`); `{member}` and `{link}` are
  CLOSED OVER in `render`. Its config gaps are FINAL `error` + alarm (`:127-135`) ⇒ the CALLER checks config FIRST and HOLDS. A Secret
  Manager `INVALID_ARGUMENT` / `PERMISSION_DENIED` / `FAILED_PRECONDITION` / `UNIMPLEMENTED` inside the core is a final error; but in the
  cloned shape the caller's own config check catches ANY fault first ⇒ `config:secret_manager` HOLD (`claim-suspicion-notices.ts:112-119,
  340-344`). ⚠ 6.27a PM16's *"since 6.29 an `INVALID_ARGUMENT` … uses up the slot"* is true ONLY for a fault that appears after the race
  guard. `helplineNotCallbackNumber: true` rides provider-handed finals; each caller logs it ONCE (`claim-suspicion-notices.ts:447`;
  builder `helplineNotCallbackNumberWarning` `claim-dlt-sms-send.ts:64-70`).
- **BF9** The domain clone source `packages/domain/src/claim/suspicion-notice.ts`: `beginSuspicionNotice` (`:715-860` — claim `FOR UPDATE`
  with `lock_timeout 30s`; `held_by_other`; a failed re-check on an existing row ⇒ `error` / `exhausted:recheck_*` + `expired` (`-297` §2,
  `:757-772`); RN7 re-claim `:806-830` — the UPDATE re-checks the lease itself and credits `aging_since` forward only for a parked row);
  `finaliseSuspicionNotice` `:870`; `noteSuspicionNoticeTransient` `:907`; `listStalledSuspicionNoticeScopes` `:355-368` (lease 10 min —
  `CORRECTION_SEND_LEASE_MS`, `correction-reminder-record.ts:59`); `parkHeldSuspicionNotices` `:385-407` (`'sweep:held'`);
  `expireExhaustedSuspicionNotices` `:430-468` (anchor `aging_since`, or `aging_since + (now − parked_at)` for a parked row; cutoff 00:00 IST
  of today−2, `RECLAIM_DAYS = 3`); the builder `suspicionNoticeDetail` `:177-194` + `isSuspicionNoticeDetail` `:199` + `assertDetail` `:204`;
  `sanitizeSmsGatewayCode` `:159`. ⭐ The PATTERN lives in the SCHEMA file: `SUSPICION_NOTICE_DETAIL_PATTERN`
  (`packages/domain/src/schema/claim_suspicion_notices.ts:38-39`), vocab arrays `suspicion-notice.ts:103-140`.
- **BF10** The jobs clone source `apps/jobs/src/scheduler/claim-suspicion-notices.ts`: sweep `:160-307` (config FIRST `:181-189`; stalled →
  held / unheld → park + one alarm `:197-216`; give-up over UNHELD scopes `:221-233`; paged enqueue `:240-286`; one end-of-run held alarm
  `:289-296`, ids via `sampleIds` `:103-107`); child `:322-459` (race guard ⇒ `held_config` + alarm `:340-344`; name MODE read in its OWN scope
  tx BEFORE begin `:346-353` (the KYC name itself is decrypted AFTER begin, `:404-416` — ⚠ R9 DELIBERATELY reads the whole name
  BEFORE begin, so a claim-wide name fault is known at the locked re-check; ⛔ copy the post-begin order); `expired` ⇒ "may have gone" alarm `:362-366`; the `-298` alarm on a re-claimed `no_target` `:389-397`; KYC →
  `decryptKycField` → sentinel → `resolveMemberFacingDeceasedName` `:404-416`); cron `'0 10 * * *'` tz `CLAIM_CORRECTION_TZ`
  (`claim-correction-reminders.ts:85`); registration `:467-500`; `alarmOf(deps) = deps.onAlarm ?? console.warn` `:99-101`. Queues
  `packages/queue/src/index.ts:430,438`; registered at `apps/jobs/src/boot.ts:622` with `claimCorrectionDeps` (`:597-607`).
- **BF11** ⛔ **No quiet-hours helper exists** (grep `quiet|nextIst|09:00`). IST primitives: `istDateOf` / `addCalendarDays` /
  `istMidnightAt` (`packages/domain/src/cycle-calendar/holiday-resolver.ts:178,201,220`); `startAfter` precedent `claim-peer-mesh.ts:122-133`.
- **BF12** ⛔ **The neighbour's mobile is NOT the suspicion child's.** `resolveCorrectionMobile` (`correction-crypto.ts:46`) reads claim
  contact / nominee classes. A neighbour's number = `getMemberMobileCiphertext(db, { pariwarId, memberId })`
  (`packages/domain/src/wa-opt-in/read.ts:118`, `member_identities`) → `decryptMobile(serialized, enc)`
  (`packages/domain/src/encryption/member-fields.ts:158`) → `normalizeMobile` (`:92` — ⛔ the duplicate in `wa-webhook-processor.ts:63`) →
  `correctionNumberHash(e164, pariwarId, enc)` (`claim/correction-crypto.ts:58`). ⛔ No jobs code does this today.
- **BF13** `resolveMemberFacingDeceasedName(mode, storedName): string` (`packages/domain/src/notifications/pool-identity.ts:141`) returns `''`
  when unresolvable and carries ⛔ no reason; the `none` / `erased` / `unresolvable` reasons are the CALLER's
  (`claim-suspicion-notices.ts:407,414,416` — `getMemberKycProfile` `kyc/profile-read.ts:24`, `ANONYMIZED_SENTINEL`
  `member/anonymize.ts:81`, `resolvePublicNamePresentationMode` `kyc/presentation-policy.ts:63`).
- **BF14** ⛔ **No locale reader exists** — only `passport.getPariwarPassport(db, id)` (`pariwar-passport/read.ts:50`, the whole row);
  `localeDefault` NOT NULL (`schema/pariwar_passport.ts:86`, enum `hi | en` `:54`). PM22's "ONE read row 6-35 changes" must be CREATED.
- **BF15** The post-commit hooks in the SELECT worker (`apps/jobs/src/claim-peer-mesh.ts`): the dep shape to clone is
  `enqueueShepherdAssign` (`:67-78`); the window enqueue is `:346-360`; the shepherd hook `:362-376` fires on `outcome.advanced` — TRUE only
  in `verification_in_progress` (set `:206`), so a clone fires ⛔ for a no-op run on a claim still answerable in `verifier_approved` etc.
  The no-op branch returns at `:200-209`; zero selected ⇒ `claim.peer_mesh_none_to_ask` `:276-307` (⛔ nothing to send). Boot:
  `registerClaimPeerMeshWorkers` `boot.ts:482-505` runs BEFORE `claimCorrectionDeps` / `smsAppClient` exist (`:597`) ⇒ the hook may only
  ENQUEUE there; the child and sweep register after `:622`. (v2.x's `:346-356` / `:483-505` cites are stale.)
- **BF16** The decrypt fence: `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts` — `FENCED_FILES` (`:38`; suspicion
  `:118`; 6.27a's `:129-136`), the floor `toBe(52)` (`:193`) and an `it` arm per module (template `:450-463`: `mobileCiphertext` present;
  `/decrypt\w*\s*\(/i`, `/\bkms\b/i`, `/\bencryption\b/`, `nameCiphertext` absent).
- **BF17** `APP_LINKS_BASE_URL` is read by ⛔ NO code (only `infra/dokploy/compose.yaml:51`, `infra/dokploy/README.md:73`,
  `apps/jobs/README.md:143-152`, a comment `staff-email-config.ts:108`). The read-at-boot / validate-per-run precedent: `ADMIN_APP_ORIGIN`
  (`boot.ts:631` → dep `claim-suspicion-staff-emails.ts:69` → gap `:101` `config:admin_app_origin_invalid` → use `:275`).
  `resolveHttpsOrigin(raw)` (`staff-email-config.ts:112-127`) keeps a trailing-dot host and a non-443 port — deferred-work *"`APP_LINKS_BASE_URL`
  can disagree with `APP_LINKS_HOST`"* (§6-30 round 2), **owner 6.27c: add an app-link-specific check**.

**Typing, the sheet, the roster**
- **BF18** 6.34's vocabulary: `packages/channels/src/dlt-variables.ts` — `DLT_VAR = '{#var#}'` `:29`; `DLT_TYPE_MAX_LENGTH` `:41-48`
  (alphanumeric 40, url 120, cbn 14); `DLT_MAX_VARIABLES = 3` `:54`; `SLOT_NAME` `:60` (= the i18n param = MSG91's `##name##`, TV13);
  `DltSlot { name, type, maxLength, label }` `:69-78`; `checkDltTemplateShape` `:102` (counts UTF-16 `.length`, `:24`); value predicates
  `isDltNumeric` `:176` / `isDltCallbackNumber` `:184` ONLY — ⛔ **no name-length predicate anywhere** ⇒ `name_too_long` is built here (R9).
- **BF19** The gate `scripts/dlt-typed-variables/lib.ts`: `REGISTRY_FILES` `:56-62` (five files; the doc comment `:54` says *"Story 6.27c adds
  its file — TV11"*); rules (i)–(iii) `:113-139` — `{#var#}`, `DLT_VAR` and `sms.dlt.template_id.` ONLY in a registry file, comments
  included (Trap 21); `checkScanCoverage` `:155` FAILS on an untracked registry path (⇒ `git add` the file first, README `:36-45`). Scanned:
  `apps/*/src`, `packages/*/src`, `docs/launch-gate-inventory/*.md` (⛔ `apps/jobs/tests/`).
- **BF20** The registry to clone: `apps/jobs/src/scheduler/suspicion-notice-sms-templates.ts` (`DLT_VAR` + `DltSlot` import `:30`; template
  interface `:40-49`; re-export `DLT_VAR` `:59`; slots `MEMBER` `:61` / `HELPLINE` `:63`; key function `:73-75`; `entry()` `:77-82`; the
  `Record<…, Record<'hi'|'en', …>>` `:85-108`; render through the REAL `t(copyKey, params, { locale, namespace: 'claim' })` `:111-123`). Its
  lockstep test `apps/jobs/tests/suspicion-notice-sms-templates.test.ts` (control-character markers per variable `:73-75` → `DLT_VAR` →
  `toBe(registeredText)` `:78-95`; the sheet row by config key `:97-103`; en = the Panel's words byte for byte `:112-114`; a deadline
  deny-list `:116-137`; `checkDltTemplateShape` + slots `toEqual` `:143-150`; slot names = i18n params in order with a real `t()`
  `:152-166`; sheet types + `msg91Form` `:168-173`; the `$comment` marker `:175-177`) and helpers `apps/jobs/tests/_dlt-template-sheet.ts`
  (`sheetRowByConfigKey` `:64`, `expectRegisteredTextRow` `:56`, `msg91Form` `:34`, `i18nParamNames` `:29`; the main-table row is SEVEN
  cells `| # | Message | Locale | Owning story | Config key | Variable types | MSG91 template |` `:72`; types parsed as `\d+ <type>` `:39`).
- **BF21** The sheet `docs/launch-gate-inventory/dlt-template-requests-6-19.md`: rows 1–12 (`:76-87`) and 15–16 (`:88-89`) taken; **13 and
  14 RESERVED for 6.27c** (`:15-16`, `:73`); each wording table under its own *"## The wording of templates N–M"* section (`| <n> | <text> |`,
  e.g. `:147-152`); the three-variable justification-line form (the shape-rules bullets, `:54-55`); *"Every template 1–12, 15, 16 passes (lowest: 7–12 at 52–62 %)"*
  (`:57`) goes STALE (13–14 ≈ 39.6 % fixed, the new lowest); the MSG91 last-word warning `:60-61` (6.27c's English also ends `{#var#}.`);
  the cost section (its heading, `:183-203`) needs a 13–14 line (`-255` F7); the URL-whitelisting section (`:205-222`) already names 6.27c's
  url slot; the Record table (`:224+`) needs a 13–14 row. ⚠ Cite these by HEADING in any edit — the file is 233 lines and moves.
- **BF22** i18n: `peer_mesh_sms` is ABSENT from both locales; params are SINGLE-brace (`TOKEN = /\{(\w+)\}/g`,
  `packages/i18n/src/resolver.ts:33`; a missing param THROWS `:39`). The `$comment` marker is **"NOT YET HUMAN-REVIEWED"** (spaces —
  `en/claim.json:164` `$comment.suspicion_sms`; the test asserts that exact form) — ⚠ 6.27a PM3 and Row 28 write "NOT-YET-HUMAN-REVIEWED"
  (hyphens); the CODE's form wins.
- **BF23** The roster `docs/launch-gate-inventory/inventory-roster.md`: **Row 27** (`:468`) now closes on **ALL EIGHT** (`:474`) — (a)–(g) as
  6.27a PM16 + **(h) Row 31 (`peer-mesh-selection-data-basis`) closed** (6.36a, 2026-10-14); status `open`, (c) / (g) met (`:476-477`); its
  (f) still says *"v2's `counselBasis`"* (the code reads the LIVE version — v4). Evidence lines `:480` ALREADY carry (1) the Devanagari
  question POINTING to Row 30 (d) and (2) the dotted Secret Manager names defect ⇒ 6.27c writes ⛔ neither again. **Row 30 (d)** (`:534`)
  asks the per-variable limit (40 vs 30), the UNIT it counts, Devanagari / spaces, and a variable as the LAST word — its evidence (`:537`)
  is EMPTY (the provider's / BigDev's to supply, ⛔ 6.27c's). Row 28 (`:482-494`) already names `peer_mesh_sms.request` and 13 / 14.
- **BF24** The cost: the ratified English text contains "—" (U+2014), outside GSM-7 ⇒ the English text is UCS-2 too (≈ 188 characters
  rendered ⇒ ≈ 3 segments) — 6.27a PM3 told only that the HINDI is *"likely THREE segments"*. ⛔ The words are ruled (Trap 2) ⇒ recorded on
  the sheet's cost line, ⛔ never "fixed" by editing the text. ⭐ An FYI line (⛔ a ruling question) goes into the NEXT Panel note written for any
  story — the cost the Panel saw was understated for English ([[feedback_shown_to_panel_means_sent]]: ⛔ recorded as shown until sent).

**The member surface, the link, the logs**
- **BF25** `link_code`: ⛔ **no generator exists**; 0156's CHECK `'^[0-9A-Za-z]{12}$'` (`:62`) is a SECOND copy of `APP_LINK_CODE_PATTERN`
  (`packages/contracts/src/app-links/paths.ts:68`, `/^[A-Za-z0-9]{12}$/`) with ⛔ no lockstep. CSPRNG precedent with rejection sampling:
  `packages/domain/src/telegram-opt-in/code.ts:16-37`. 6.30: `APP_LINK_CODE_PARAM = 'c'` `:62`; `buildAppLinkUrl(baseUrl, key, code)`
  `:90-103` THROWS on a non-bare https origin, a malformed code or an unknown key; `parseAppLinkCode(params)` `:112-116`; `app-link-paths.json:2`
  `"peerRequest": "/peer-request"`.
- **BF26** The member routes (`apps/api/src/modules/claims/claims.peer-request.member.routes.ts`: list `:48`, detail `:57`, PUT `:66`, submit
  `:81`): `requireMemberSession` on all; `perMemberKey` + `writeRateMax` on the WRITES only (`:41-46`) — ⛔ no GET carries a per-member
  budget (the read-budget precedent: `apps/api/src/modules/known-people/routes.ts:46`, `readRateMax` + `perMemberKey`). Session binding:
  `claims.peer-request.handlers.ts:75-82` (a path `pariwarId` ≠ the session's is the same 404); 409 `peer_request.submitted` then
  `peer_request.no_longer_open` (`:192-196`); 404 `peer_request.not_found` (`peer-request-core.ts:33`). The texted-only rule is `visible()`
  (`peer-mesh-reply.ts:178-180`); the list filters `p.send_outcome = 'accepted'` (`:231`); **"asked on" = `COALESCE(send_updated_at,
  claimed_at)`** (`:119, :162, :224`). ⛔ No by-link route, contract shape or api-client method exists (`createMemberPeerRequestClient`,
  `packages/api-client/src/index.ts` ~`:1594`).
- **BF27** ⭐ **The API's request logger writes the URL.** `buildServer` (`apps/api/src/server.ts:105-118`) runs Fastify's default logger at
  `info` in production — its *"incoming request"* line carries `req.url`. ⇒ a `GET …/by-link/:code` would put the code in a log line,
  breaking PM21 (e). The PII-spec precedent: `BuildServerOptions.logStream` (`server.ts:91-98`, Story 6.19b AC9b). ⇒ R13.
- **BF28** Mobile: the shell `apps/mobile/app/(peer-request)/peer-request.tsx:20-23` parses `c` (`parseAppLinkCode(useLocalSearchParams())`)
  and renders `<PeerRequestSlot code={code} />`; 6.27a FILLED `apps/mobile/components/peer-request/PeerRequestSlot.tsx` (session gate
  `:30-40`, then `PeerQuestionnaire` by `openPingId` or `PeerRequestList`) and IGNORES `code` (`_props` + an eslint-disable `:27-28`; its
  comment `:7-8`: *"6.27c wires `code` to the by-link resolver (its 404 reuses `PeerRequestNotOpenable`)"*). Not-openable:
  `PeerRequestNotOpenable.tsx:13` (`'peer_request.not_openable' | 'peer_request.no_longer_open'`); the error mapping
  `apps/mobile/lib/peer-request.ts:102-108`. Login-return: `_layout.tsx:138` `recordLinkTarget` → `lib/link-target.ts` → `(auth)/otp.tsx:42-51`
  `takeLinkTarget()` → `router.replace({ pathname, params: { c } })`. The home card `app/(tabs)/index.tsx:70` and the notice-strip item
  `components/panchayat/PanchayatNoticeboard.tsx:217` are ONE component (`PeerRequestEntry.tsx:22-23`), null until the list has items.
- **BF29** `send_outcome` readers outside tests: `peer-mesh-reply.ts:136,161,179,231` (member + helpline); `peer-answers-assembler.ts:176`
  (NULL ⇒ `'not_sent'`; a value outside `PEER_MESH_SEND_STATUSES`, `packages/contracts/src/claims/verifier-console.ts:180`, THROWS), `:238`
  (6.27b's call-back rule keys on exactly `'accepted'`), `:267` (**`noTargetReason = ping.detail` — the District Admin sees every
  `no_target:*` detail VERBATIM**, `apps/admin/src/modules/claim-verification/PeerMeshView.tsx:76`). `pingedMemberIds` (`:303, :342`) is
  unbounded (it may exceed 5 once replacements exist — fine; ⛔ a contract cap). ⛔ Nothing on the console links a skipped ping to its
  replacement.
- **BF30** The questionnaire: `resolveLiveVersion(kind, pariwarId: string, registry?)` (`packages/domain/src/questionnaires/registry.ts:45-58`)
  CAN RETURN `null`; LIVE = `peer_mesh.v4` (`peer-mesh.ts:220-225`, all Pariwars); `death_cause` / `death_illness` carry
  `counselBasis: 'pending'` (`:152, :169`; v3 / v4 inherit); ⭐ `pendingCounselBasisKeys(def): string[]` (`registry.ts:66-70`, pinned for v4 at
  `questionnaires.test.ts:146`) — REUSE it.
- **BF31** The answer window: `isStateInAnswerWindow(state, liveRoutedToR9)` (`packages/domain/src/claim/answer-window.ts:38`);
  `isClaimInAnswerWindow(db, pariwarId, claimCaseId, currentState)` (`:47-56`); `answerWindowSql(claimAlias)` (`:63-68`); re-exported
  `claim/index.ts:43`; the live parity leg `…/rls/claim-peer-mesh-replies-policy-regression.spec.ts:368-375`.
- **BF32** Erasure: `member/anonymize.ts` holds ⛔ nothing for the ping table; the precedent comment `:338` (`claim_suspicion_notices` holds
  *"ids + a KEYED number hash ⇒ nothing to scrub"*). `recipient_number_hash` is keyed ⇒ a comment line only; the rtbf counts ⛔ move.
- **BF33** Records 6.27c CHECKS (⛔ writes): 6.27a's Story 6.6 annotation EXISTS (`_bmad-output/planning-artifacts/epics.md:2548-2552`); the
  row-6-22 pointer EXISTS (the comment block directly above row `6-22-…` in `sprint-status.yaml` — cite by row block, ⛔ by line number).
- **BF34** Next free migration: **0166**, journal idx **166**, `when` > `1794195600009` (0165's). Migrations are hand-authored SQL + a manual
  `meta/_journal.json` entry, applied by `pnpm db:migrate` once with `DATABASE_URL` at :5432 and once at :5433
  ([[project_live_db_test_gotchas]] — ⛔ regen an applied migration; ⛔ DROP SCHEMA).

## ⚖️ Author readings R1–R16 (v3.0 — each is the AUTHOR's under the routing template's §0: an implementation of committed or ratified text; each names the sentence it implements and says MATCHES / NARROWS / WIDENS. ⛔ None widens a Trustee-ratified ruling; R5 narrows an author-commit — ✅ confirmed, `-343`)

- **R1 — the send-time order (MATCHES `-311` PM5 (iv) + PM1).** Under the claim lock, then the ping lock: ① the answer window (PM8's ONE
  predicate) — out ⇒ `skipped_superseded` / `superseded:claim_decided`; ② the CLAIM-WIDE name fault (read before the tx — R9) ⇒
  `no_target:name_<reason>`; ③ the peer's eligibility (R4) ⇒ `no_target:<peer reason>` + a replacement (R2); ④ else begin `attempting`.
  Each skip is the begin CAS from `send_outcome IS NULL` writing that outcome with `attempt_count = 1` (6.27a PM4; 0151's precedent).
  ⭐ **On a RE-CLAIMED `attempting` row** (RN7) the same ①–③ re-check runs: a window or peer failure is `-297` §2's form — `error` +
  `exhausted:recheck_(claim_decided|peer_ineligible)` + an ids-only alarm, ⛔ a skip outcome and ⛔ a replacement (the first attempt may
  have sent — the suspicion begin's `:757-772`); a NAME fault keeps its true reason — `no_target:name_<reason>` + the `-298` *"may have
  sent"* alarm (`-298` A, BigDev's choice for exactly this case, `.decision-log.md` `-298` §1) — ⛔ replaced (R3).
- **R2 — the replacement (MATCHES `-311` PM1 (ii), `-330` SW22 / SW24 / SW27, `-339` / `-340` call 1).** In the SAME transaction as the skip:
  walk the selection's STORED `ranked_member_ids` in order; take the first member with ⛔ no ping row in this selection who passes the ONE
  predicate (`peerMeshEligibleMemberSql`, ⛔ re-composed, ⛔ re-ranked); INSERT a NEW ping `{selection_id, pariwar_id, member_id, source =
  selection.source, replaces_ping_id = <the skipped ping>}` through a NEW domain inserter that RETURNS its `ping_id` (BF5 — ⛔ change
  `persistPeerMeshPingIntents`); the child then processes it like any due ping. ⚠ ORDER inside that one tx: the skip UPDATE (the CAS from NULL — or, on R6's path, the CAS
  finalise from `attempting` by its own job — which must match exactly ONE row) runs FIRST, then the INSERT — 0166's trigger reads the replaced ping and admits it only once it is already
  `no_target` with a peer detail. A NULL ranking (`district_cohort_v1`) or ⛔ one left ⇒ ⛔
  replacement (fewer are asked — `-310` CF4). **At most five live is BY CONSTRUCTION + a DB backstop:** a ping is replaced at most once
  (`UNIQUE (replaces_ping_id)`), and only a ping finished `no_target` with a PEER reason can be replaced (0166's trigger) ⇒ each
  replacement maps to exactly one distinct skipped ping ⇒ live pings ≤ the selection's original count ≤ 5. (The DB caps the REPLACEMENTS;
  the ORIGINAL rows rely on `persistPeerMeshPingIntents` inserting only `selected_member_ids` — by construction.)
- **R3 — what is replaced (NARROWS nothing — reads `-311` PM1's own scope).** Replaced: the PEER reasons only — `peer_not_active`,
  `peer_reported_deceased`, `peer_filed_for_this_death`, `peer_not_eligible`, `no_sendable_number`. ⛔ Never replaced: `name_*` (the
  DECEASED's name — every replacement would hit it; claim-wide), `superseded:*` (the claim left the window).
- **R4 — the peer reason is a LABEL over the ONE gate (MATCHES `-330` SW23 — *"6.27c's send-time re-check MUST reuse"* the predicate,
  6.36a `:447-452` — with `-340` call 2 and `-341`, whose exclusions `-311` PM1 (i)'s three reasons predate; ⛔ a Panel matter: the
  vocabulary is staff-facing only).** The GATE is `NOT peerMeshEligibleMemberSql(...)`, exactly as built. Only when it fails, a labelling read picks the
  FIRST matching reason: `state <> 'active'` ⇒ `peer_not_active`; named as the deceased by any claim (`namedByClaimSql`) ⇒
  `peer_reported_deceased`; ⛔ a `member_identities` row ⇒ `no_sendable_number`; the claimant of any claim / filer of any intake attempt for
  this death (`-340` / `-341`) ⇒ **`peer_filed_for_this_death`** (NEW); none matched ⇒ **`peer_not_eligible`** (NEW — a fallback so a future
  predicate conjunct ⛔ never crashes the send; a test pins that the four labels cover today's predicate). ⚠ The District Admin SEES these
  codes verbatim (BF29) — ⛔ never a name, number or id in one.
- **R5 — a `no_target` on a RE-CLAIMED row is ⛔ replaced (NARROWS `-311` PM1 (ii) at one edge — ✅ CONFIRMED by BigDev 2026-10-16,
  recorded as [`2026-10-16-343`](../../.decision-log.md#decision-2026-10-16-343)).** A re-claimed
  `attempting` row (`attempt_count > 1`) may already have been texted (`-298`: it alarms *"may have sent"*). Replacing it could text a SIXTH
  person while the first did receive a text. ⇒ such a row finishes `no_target` + the `-298` alarm, ⛔ no replacement. (Only R6's
  `no_sendable_number` is a REPLACEABLE `no_target` on a re-claim — a window or peer failure there is `-297` §2's `error`; a `name_*`
  keeps its reason + the `-298` alarm and is ⛔ never replaced anyway, R3.)
- **R6 — `no_sendable_number` is found AFTER COMMIT (MATCHES Trap 9; the suspicion child's split, `claim-suspicion-notices.ts:418-429`).**
  Decrypt → `normalizeMobile` runs outside any lock. ONLY an UNUSABLE plaintext — ⛔ ciphertext / ⛔ an identity row, the erased sentinel,
  or `normalizeMobile` → `null` — finalises the `attempting` row (the CAS finalise, own job) as `no_target:no_sendable_number`, in a SECOND
  transaction that takes claim → ping locks again and inserts the replacement there (R2) — unless R5 applies. ⛔ **A decrypt or hash THROW
  is NEVER `no_sendable_number`**: it is the transient note `decrypt_failed:tier1` / `hash_failed:tier1` + rethrow (the row stays
  `attempting`; RN7 re-claims it; the give-up after three IST days) — ⛔ no replacement, so a KMS outage ⛔ never drops a neighbour and
  texts another.
- **R7 — the responder check moves to the ping rows (MATCHES `-330` SW27; 6.36a SF11).** `recordPeerMeshResponse` refuses a responder with
  ⛔ NO ping row in the selection (it already locks the ping by `(selectionId, memberId)`, `peer-mesh-persist.ts:282-291`) instead of one
  outside `selectedMemberIds`. A non-pinged member is still refused; the `claim-peer-mesh.test.ts:800` leg is REWRITTEN to that, plus a new
  leg: a replacement's first `has_died` save succeeds and counts.
- **R8 — the hook (MATCHES `-311` PM5 (i)).** `enqueuePeerMeshRequestSend({ pariwarId, claimCaseId })` is injected into the SELECT worker and
  called after COMMIT on BOTH the fresh branch with ≥ 1 ping AND the no-op branch where a selection exists — keyed on *"a selection with
  pings exists"*, ⛔ on `outcome.advanced` (BF15); ⛔ for `none_to_ask`; ⛔ never a second `claim.peer_mesh_pinged`. The child judges the
  window under the lock.
- **R9 — the name and its length (MATCHES `-311` PM3's author reading; the LIMIT stays open at Row 30 (d)).** Read ONCE per child, outside
  any claiming tx, the suspicion child's way (BF13). `name_too_long` ⇔ the rendered name's CODE-POINT count (`[...name].length`) >
  `DLT_TYPE_MAX_LENGTH.alphanumeric` (40) — ONE constant + ONE pure predicate `fitsDltAlphanumeric(value)` (in the registry, beside its
  slot). Devanagari is BMP ⇒ code points = UTF-16 units = what `checkDltTemplateShape` counts. ⚠ If Row 30 (d) answers 30 or graphemes,
  the constant / predicate change in ONE place (a recorded go-live line, ⛔ a merge fence). ⛔ Never a truncated name.
- **R10 — the language (MATCHES PM22 / `-310` CF1 A).** NEW `resolvePeerRequestLocale(db, pariwarId) → { locale: 'hi' | 'en', source:
  'pariwar_default' }` in domain — the ONE read row 6-35 will change; recorded on begin as `locale_source = 'pariwar_default'`.
- **R11 — the config gaps (MATCHES RB12 / PM16 / PM23 (a); 6.29's shape).** Checked by the SWEEP (once per Pariwar per run ⇒ the scope
  HELD) and by the CHILD before any begin (the race guard ⇒ `held_config`, ⛔ no ping begun): the template id of the Pariwar's locale, the
  helpline, the gateway, any Secret Manager fault (`config:secret_manager`), `APP_LINKS_BASE_URL` invalid for an APP LINK (R12),
  `resolveLiveVersion('peer_mesh', pariwarId)` returning `null` (**`config:questionnaire_unavailable`** — NEW, BF30) or a non-empty
  `pendingCounselBasisKeys` (**`config:counsel_basis_pending`**). ⇒ ⛔ a neighbour is never texted into a questionnaire with a ruled
  question hidden.
- **R12 — the app-link origin check (CLOSES deferred-work *"`APP_LINKS_BASE_URL` can disagree with `APP_LINKS_HOST`"*).** NEW
  `resolveAppLinksOrigin(raw)` = `resolveHttpsOrigin(raw)` AND ⛔ any port written in the raw value (an explicit `:443` included — `resolveHttpsOrigin` normalises it
  away, so test the RAW string) AND ⛔ a trailing-dot host; else `null` ⇒
  `config:app_links_base_url_invalid`. Read at boot (`process.env['APP_LINKS_BASE_URL']`, the `ADMIN_APP_ORIGIN` precedent — BF17), validated
  every run.
- **R13 — the code ⛔ in a log (MATCHES PM21 (e); BF27).** The by-link route is registered with Fastify's route option `logLevel: 'warn'` (the
  incoming / completed lines are `info`; Fastify ^5.8), and a PII spec with `logStream` plants a code and proves it reaches ⛔ no line on
  200, 404 AND an injected 500 (the error mapper logs `{ err, traceId }` only — `apps/api/src/middleware/error-mapping/index.ts:690`; if a
  leg still finds the code, the route's `logSerializers` option drops `req.url`). ⚠ RECORDED residual: an edge / proxy access log sees the path exactly as it sees the texted link itself — the code is ⛔ a
  credential (PM21 (a)); ⛔ fixed here.
- **R14 — the by-link answer (MATCHES PM21 (d)).** `GET /api/v1/p/:pariwarId/member/peer-requests/by-link/:code` → `{ pingId }` iff the code
  matches `APP_LINK_CODE_PATTERN` AND its ping belongs to the SESSION member in that Pariwar AND `send_outcome = 'accepted'` — submitted or
  closed included (the detail read then answers 409 and the screen shows *"no longer open"*, BF26 / BF28); everything else ⇒ the SAME 404
  `peer_request.not_found`. A per-member READ budget (`readRateMax` + `perMemberKey`, BF26).
- **R15 — the attempting-row backstops (CLOSES deferred-work *"Ping delivery columns unconstrained while `attempting`"*; BF3).** 0166: a
  CHECK `send_outcome IS DISTINCT FROM 'attempting' OR aging_since IS NOT NULL`; the guard trigger REPLACED (`CREATE OR REPLACE FUNCTION`,
  same trigger) adding NEW arms that apply ONLY when `OLD.send_outcome = 'attempting'`: `attempt_count` ⛔ decreases; `first_detail`
  write-once; `aging_since` moves ONLY on a parked re-claim (OLD `claimed_by_job = 'sweep:held'`) — 0155's rule ADAPTED: ⛔ cloned literally,
  because a ping gets `aging_since` at its BEGIN (an UPDATE from `send_outcome IS NULL`, `OLD.aging_since` NULL), which must stay admitted
  (0155's arm has no state condition — its rows get `aging_since` at INSERT). Every existing 0156 rule and message kept — the backward move
  still raises a message matching `/aging_since moves only forward/` (`claim-peer-mesh-replies-policy-regression.spec.ts:175`); the begin
  legs `:164,174` stay green.
- **R16 — the sweep's due set (MATCHES PM8's *"EVERY set-based reader … the sweep … uses `answerWindowSql`"*).** The sweep enqueues claims
  with ≥ 1 ping `send_outcome IS NULL` whose claim is in `answerWindowSql`, plus every claim of a stalled `attempting` row in an UNHELD
  scope. ⚠ RECORDED: an unsent ping of a claim that LEFT the window before any child reached it stays NULL — the console's `'not_sent'`,
  which is true; ⛔ no drain.

## Acceptance Criteria

1. **AC1 — governance first.** ✅ MET 2026-10-16: R5 confirmed by BigDev and recorded as author-commit `2026-10-16-343`, committed ALONE on
   this branch (`ccca9f5f`) before any code ([[feedback_governance_commits_precede_implementation]]).
1b. **AC1b — migration `0166_peer-mesh-request-sending.sql`** (hand-authored, journal idx 166), applied on :5432 AND :5433, proven from
   zero: (a) the `detail` / `first_detail` GRAMMAR CHECK mirroring `PEER_MESH_REQUEST_DETAIL_PATTERN` (an ENUMERATED alternation in 0155's
   form, with the `(?!.*[0-9]{7})` lookahead) — every builder output passes it and a RAW gateway code is refused (6.29 Trap 4); ⚠ grep
   every existing test fixture that writes a ping `detail` (6.27a / 6.27b / 6.27d specs) — each must already match the grammar or be
   corrected IN THIS STORY; (b) `replaces_ping_id uuid NULL REFERENCES claim_peer_mesh_pings(ping_id) ON DELETE CASCADE` (a test that deletes a replaced ping by id
   must ⛔ fail on the FK) + `UNIQUE (replaces_ping_id)` + a
   BEFORE INSERT trigger: the replaced ping is in the SAME selection, is finished `no_target` with a PEER detail (R3) AND has
   `attempt_count = 1` (R5's backstop — a fresh skip and a first-attempt R6 both have 1; a re-claimed row has more) — else refused;
   ⛔ in the UPDATE grant (immutable); (c) R15's CHECK and trigger. A policy-spec leg per grammar family, per (b) refusal, per R15 rule. ⚠ Both new CHECKs are checked BEFORE
   the file is applied — :5432 and :5433 hold ⛔ row that fails (0155's header precedent; record the query and its result in the file's
   header comment). (Today's fixtures pass: `rate_limited:x` and `no_target:peer_not_active` are in the families; the `attempting` legs
   set `aging_since`; the `accepted` fixtures write ⛔ detail.)
2. **AC2 — each of the five is texted once.** A SELECT run that ends with a selection holding pings enqueues ONE child per claim (R8); the
   child processes that claim's due pings in `ping_id` order (and any replacement it creates). Each send: R1 under claim → ping locks
   (`lock_timeout`, the suspicion begin's form); then COMMIT; then (⛔ KMS under a lock) decrypt → `normalizeMobile` →
   `correctionNumberHash`; `sendClaimDltSms` with the template of the Pariwar's locale (R10) and `render` closing over the mode-resolved
   name and the link, rendering EXACTLY the registered text; the CAS finalise. `link_code` (12 base62 from a CSPRNG, rejection sampling)
   written ONCE by the begin UPDATE — a `23505` on `link_code` retried with a new code inside a SAVEPOINT
   ([[project_domain_limit_clamp_and_savepoint_retry]]). A re-run ⛔ never sends again (the CAS from NULL; a test on two connections).
   Outside 09:00–20:00 IST ⇒ nothing begun; the child re-enqueued with `startAfter` = the next 09:00 IST (a NEW pure helper `nextPeerRequestSendWindowStart(now)` /
   `isInPeerRequestSendWindow(now)` in `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`, built on `istDateOf` / `addCalendarDays` /
   `istMidnightAt` — BF11; tests at
   08:59 / 09:00 / 19:59 / 20:00 IST and across midnight).
2b. **AC2b — ⛔ no text while a question of the LIVE version is `'pending'`** (the label every existing pointer uses — Row 27 (f),
   `-329` decision 3, `questionnaires/registry.ts:65`, `questionnaires.test.ts:146,170` — KEPT): R11's `counsel_basis_pending` and
   `questionnaire_unavailable` hold in BOTH the sweep and the child's race guard; ⛔ no slot used up; tests in AC4. ⇒ a neighbour is ⛔ never
   texted into a questionnaire with a ruled question hidden.
2c. **AC2c — the accepted write.** A provider-accepted send writes EXACTLY `send_outcome = 'accepted'`, `provider_message_id`,
   `recipient_number_hash`, `send_updated_at = clock_timestamp()` (the member list's "asked on", BF26) — ⛔ a new "sent" value (`-329`
   decision 4: the call-back rules key on `'accepted'`).
3. **AC3 — ⛔ no text once the claim can no longer take an answer.** `state_trustee_approved` WITHOUT a live R9 routing, or refused / closed
   ⇒ `skipped_superseded` / `superseded:claim_decided`; `verification_in_progress`, `verifier_review`, `verifier_approved`, `reversed`,
   `state_trustee_freeze`, and `state_trustee_approved` WITH a live R9 routing ARE texted — through `isClaimInAnswerWindow` (⛔ re-composed;
   a test per state × routed).
4. **AC4 — a held config uses up ⛔ nothing** (R11's list): ⛔ no ping begun; the sweep's ONE ids-only end-of-run alarm, and the child's held
   return alarms ids-only; a stalled `attempting` row in a held scope is PARKED and given up only after three IST days of UN-parked time
   (RN2 / RN3); once set, every request still due is sent. Tests: a hook-enqueued child for a Pariwar whose live version has a `'pending'`
   question begins ⛔ no ping; the sweep holds that scope; `resolveLiveVersion` → `null` holds; an `APP_LINKS_BASE_URL` with `:8443` or a
   trailing dot holds; then, the gap closed (a test registry with ⛔ pending question), every due request is sent.
5. **AC5 — the exclusions and the replacement** (R2–R7): each peer reason finishes `no_target:<reason>` with ⛔ no alarm and creates ONE
   replacement from the same group's stored ranking (or none when ⛔ one is left / the ranking is NULL); `name_*` and `superseded:*` ⛔
   never replace; a replacement ping carries `replaces_ping_id` and the selection's `source`; a second replacement of the same ping is
   refused by the DB; live pings never exceed the original count; R5's edge; a replacement neighbour sees the request, saves, and their
   first `has_died` counts (R7). `name_too_long` per R9 (a test at 40 / 41 code points, Devanagari included).
5b. **AC5b — PM14 / PM15.** ⛔ No new event from any send path (a test counts `claim.peer_mesh_*` events before / after a full run with a
   replacement); alarms are ids-only: the held-scope alarm, a final `error`, a re-claimed `attempting` that fails its re-check (`-297` §2 ⇒
   `error`), a `no_target` on a re-claimed row (`-298` *"may have sent"*), the helpline warning (`helplineNotCallbackNumberWarning(pid,
   'peer mesh request')`); ⛔ no alarm for a peer or name `no_target` on a FIRST attempt. ⛔ No alarm, log or `detail` carries a name, number or link code.
6. **AC6 — the link.** `{link}` = `buildAppLinkUrl(origin, 'peerRequest', link_code)` with `origin = resolveAppLinksOrigin(...)` (R12).
   R14's route + contract + api-client method; R13's log proof. Mobile: `PeerRequestSlot` — once the session has loaded and `code` is
   present, ONE by-link call; `{ pingId }` ⇒ opens 6.27a's questionnaire for that ping (its 409s ⇒ the existing *"no longer open"*); 404 ⇒
   `PeerRequestNotOpenable` (`not_openable`); ⛔ no call before the session; a failed call ⇒ the not-openable state + the helpline CTA, ⛔ a
   hard error; the eslint-disable removed. Logged out → login → back keeps `c` (6.30's AL6 — a test that the slot receives it). Route tests:
   404 for unknown / another member's / another Pariwar's / an UNTEXTED ping / a malformed code — identical status, `code` and `message`
   (the envelope's `request_id` differs per request; the 6.27a precedent `peer-request-member.spec.ts:261`). The `:code` param schema is
   a plain `z.string()` — a pattern there would turn a malformed code into a 400, ⛔ R14's 404. ⚠ A REAL `https://`
   link opening the app on a device is Row 29 (e) — ⛔ this story's.
7. **AC7 — the member surface lights up.** After an accepted send, 6.27a's home card, notice-strip item and list show that request (a live
   API test from send to list), with "asked on" = the send date.
8. **AC8 — the records.** DLT templates 13 (hi) / 14 (en) in the sheet (BF21: the main-table rows in the SEVEN-cell form incl. the MSG91
   column `##member##` / `##link##` / `##helpline##`; a *"## The wording of templates 13–14"* section; their OWN three-variable justification
   line; the *"lowest"* line updated; a cost line for BOTH locales — BF24; a Record-table row); the lockstep test with the REAL `t()`
   ([[feedback_stub_must_call_not_transcribe]]); `REGISTRY_FILES` gains the registry; Row 27: (f)'s *"v2's"* annotated to *"the LIVE
   version's"* (dated, ⛔ rewritten) and ⛔ the existing evidence lines duplicated (BF23); a CHECK (⛔ a write) that BF33's two records exist;
   the deferred-work items R12 / R15 Close, W3 is NARROWED, and the console's verbatim `no_target` code is a NEW item (Task 5.4); `pnpm ci:local` green.

## Tasks / Subtasks

- [x] **Task 0 — governance (AC1).**
  - [x] 0.1 R5 asked. BigDev, 2026-10-16: *"Yout recommendation is accepted for Task 0.1"* — ⛔ replace a re-claimed `no_target`.
  - [x] 0.2 R5 (the only reading that narrows committed text) recorded as `2026-10-16-343` (author-commit), committed ALONE (`ccca9f5f`).
        R1–R16's other readings MATCH their sources (validate rounds 1–2) — implementation readings of `-311`, ⛔ entry.
  - [x] 0.3 `git diff --name-only cdc39004..HEAD -- packages apps scripts infra docs/launch-gate-inventory`; re-read any cited file that moved;
        `git log --oneline cdc39004..origin/main -- .decision-log.md` — a ruling after `-342` touching peer mesh is read before Task 1.
- [x] **Task 1 — copy and registry (AC2, AC8).**
  - [x] 1.1 `peer_mesh_sms.request` in `packages/i18n/locales/{en,hi}/claim.json`, params `{member}`, `{link}`, `{helpline}` (single brace);
        en = the ruled words EXACTLY (⛔ "TWT:"); hi agent-authored afresh for *"a few"* (⛔ copied from the `-303` routing block — Trap 19);
        ⚠ (2026-10-17 annotation, review round 2 D3 — ⛔ rewritten) as built the Hindi IS that block's draft with दो → कुछ; the "never
        copied" clause is SUPERSEDED by `2026-10-17-344`;
        `$comment.peer_mesh_sms` in BOTH with **"NOT YET HUMAN-REVIEWED"** (spaces — BF22), Row 28, and *"must match the registered DLT
        content byte for byte"*.
  - [x] 1.2 NEW `apps/jobs/src/scheduler/peer-mesh-sms-templates.ts` cloned from the suspicion registry (BF20): slots `member`
        alphanumeric 40 / `link` url 120 / `helpline` cbn 14 (names = the i18n params); `peerMeshRequestDltConfigKey(locale)` =
        `sms.dlt.template_id.peer_mesh.request.<locale>` (the ONLY place that prefix appears — Trap 21); the registered texts with `{#var#}`;
        `renderPeerMeshRequest(locale, { member, link, helpline })` through the real `t()`; `fitsDltAlphanumeric` (R9). `git add` it, then add
        it to `REGISTRY_FILES` (BF19).
  - [x] 1.3 `apps/jobs/tests/peer-mesh-sms-templates.test.ts` cloned leg for leg from BF20's test (incl. the deadline deny-list and the
        `$comment` marker); ⛔ transcribe the copy.
  - [x] 1.4 The sheet (BF21) — every edit AC8 lists.
- [x] **Task 2 — migration 0166 (AC1b).** As AC1b; the pattern constant `PEER_MESH_REQUEST_DETAIL_PATTERN` + vocab arrays in
      `schema/claim_peer_mesh_pings.ts` (the suspicion schema-file precedent, BF9); `replacesPingId` declared in the Drizzle file; a test
      that the SQL CHECK text equals the constant (the 0155 leg `claim-suspicion-notice-policy-regression.spec.ts:356-364`); a test that
      0156's `link_code` regex and `APP_LINK_CODE_PATTERN` accept / refuse the same samples (BF25); policy legs in
      `claim-peer-mesh-replies-policy-regression.spec.ts`.
- [x] **Task 3 — the domain send record (AC2–AC5b).** NEW `packages/domain/src/claim/peer-mesh-request.ts` (SHAPE of `suspicion-notice.ts`, BF9):
  - [x] 3.1 The ONE builder `peerMeshRequestDetail(d)` + `isPeerMeshRequestDetail` + `assertDetail` + LOCKSTEP vocab arrays (the
        `SUSPICION_NOTICE_*` arrays' form, `suspicion-notice.ts:103-140`). The STORED grammar, in full (0155's form, ⛔ backslashes):
        `^(?!.*[0-9]{7})(no_target:(peer_not_active|peer_reported_deceased|peer_filed_for_this_death|peer_not_eligible|no_sendable_number|
        name_too_long|name_none|name_erased|name_unresolvable)|superseded:claim_decided|exhausted:(attempting_three_days|recheck_(claim_decided|
        peer_ineligible))|decrypt_failed:tier1|hash_failed:tier1|config_unavailable:secret_manager|config:(dlt_template_id_missing|
        helpline_number_missing|sms_gateway_unconfigured|sms_messaging_unavailable|secret_manager_[A-Za-z0-9_]{1,64})|(invalid_number|
        carrier_reject|rate_limited|api_unavailable|dlt_template_not_approved|auth|unknown):[A-Za-z0-9_.-]{1,64})$` (one line in the
        constant — JOIN the wrapped lines with ⛔ whitespace). The `config:` arm holds ONLY the send core's own finals (BF8 — a fault after the race guard); R11's HOLD codes
        (`app_links_base_url_invalid`, `questionnaire_unavailable`, `counsel_basis_pending`, `secret_manager`, the template-id gap) are
        ALARM codes — a held scope writes ⛔ row, so they are ⛔ stored. The gateway classes are the SAME array as
        `SUSPICION_NOTICE_SMS_ERROR_CLASSES` (pin it; `sanitizeSmsGatewayCode`). A name-decrypt THROW happens before any begin (R9) ⇒ a
        retry, ⛔ stored. Each value pinned to the CHECK by a test (every builder output passes; a raw code is refused).
  - [x] 3.2 `generatePeerRequestLinkCode()` (CSPRNG, rejection sampling — the telegram-opt-in precedent; asserts `APP_LINK_CODE_PATTERN`).
  - [x] 3.3 `beginPeerMeshRequest(client, { pariwarId, claimCaseId, pingId, jobId, now, nameFault })` — R1; begin sets `attempting`,
        `attempt_count = 1`, `claimed_at`, `claimed_by_job`, `aging_since = clock_timestamp()`, `locale_source`, `link_code`; RN7 re-claim
        of a stale / own / parked row (the suspicion `:806-830` form; `-297` §2 on a failed re-check); returns `{ kind, recipientMemberId,
        mobileCiphertext (as stored — ⛔ decrypt), linkCode, attemptCount, replacementPingId? }`.
  - [x] 3.4 `finalisePeerMeshRequest` (CAS on `attempting` + own job; writes AC2c's columns on accept), `notePeerMeshRequestTransient`
        (`detail` + `send_updated_at` only), `finaliseNoSendableNumber` (R6: second tx, claim → ping locks, R5 respected, R2's insert).
  - [x] 3.5 The replacement inserter (R2) — RETURNING `ping_id`; reads the STORED ranking; ⛔ re-rank; the labelling read (R4) beside the
        ONE predicate.
  - [x] 3.6 Sweep reads: `listDuePeerMeshRequestClaims` (R16 — `answerWindowSql`, `clampLimit`, paged), `listStalledPeerMeshRequestScopes`,
        `parkHeldPeerMeshRequests`, `expireExhaustedPeerMeshRequests` (BF9's anchors).
  - [x] 3.7 `resolvePeerRequestLocale` (R10) and `resolvePeerRequestByLinkCode(db, { pariwarId, memberId, code })` (R14) — every list read
        `clampLimit`ed.
  - [x] 3.8 R7 in `recordPeerMeshResponse`; rewrite `claim-peer-mesh.test.ts:800`'s leg; the replacement-responder leg.
  - [x] 3.9 The decrypt fence (BF16): `peer-mesh-request.ts` in `FENCED_FILES`, floor 52 → 53, an `it` arm; `anonymize.ts` gains BF32's
        comment line for the ping table.
  - [x] 3.10 Live tests (`{ timeout: 20000 }`, membership ⛔ counts — [[project_live_db_test_gotchas]]): once-ever on two connections; the
        replacement chain; R5; the window per state; a save racing a send (claim → ping order, ⛔ deadlock).
- [x] **Task 4 — the jobs child + sweep (AC2–AC5b).** NEW `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`:
  - [x] 4.1 Queues `CLAIM_PEER_MESH_REQUEST_SMS: 'claim.peer_mesh_request.sms'` (child per claim; a `singletonKey` = claim id is a LABEL
        only — inert on pg-boss's standard policy, `claim-peer-mesh.ts:15-21`, `packages/queue/src/index.ts:375` — so hook, sweep and
        quiet-hours re-enqueues CAN run two children for one claim at once: the claim lock + the per-ping CAS are the dedup; a ping
        another live job holds is skipped (`held_by_other`) and the run continues) and
        `CLAIM_PEER_MESH_REQUEST_SWEEP: 'claim.peer_mesh_request.sweep'` in `packages/queue/src/index.ts` (doc comments ⛔ containing
        `sms.dlt.template_id.` / `{#var#}` — Trap 21).
  - [x] 4.2 The child: quiet hours (AC2) → config race guard (R11) → name read (R9, BF13) → per due ping: begin → COMMIT → mobile (BF12) →
        send → finalise; R6 on an UNUSABLE number only (a decrypt / hash THROW ⇒ the transient note `decrypt_failed:tier1` / `hash_failed:tier1`,
        ⛔ R6); transient ⇒ note + rethrow at the END (pg-boss retries; finished pings are skipped);
        `-298` / `-297` alarms; the helpline warning; replacements processed in the same run.
  - [x] 4.3 The sweep `'30 10 * * *'` tz `CLAIM_CORRECTION_TZ` (10:30 IST — inside quiet hours, after the suspicion sweep's 10:00): config per
        Pariwar FIRST → stalled scopes → park held + alarm → give-up over unheld → paged enqueue (R16) → one end-of-run held alarm (`sampleIds`).
  - [x] 4.4 Wiring: `enqueuePeerMeshRequestSend` dep in `claim-peer-mesh.ts` (R8) + its boot injection beside the shepherd hook
        (`boot.ts:492-504`, enqueue only); the child + sweep registered after `claimCorrectionDeps` (`boot.ts:622`) with `appLinksBaseUrl:
        process.env['APP_LINKS_BASE_URL']` (BF17) and `resolveAppLinksOrigin` (R12) beside `resolveHttpsOrigin`.
  - [x] 4.5 Unit tests (stubs that CALL the real registry / builder) + a live test `apps/jobs/tests/claim-peer-mesh-requests-live.test.ts`
        (the `claim-suspicion-notices-live.test.ts` template): hold → park → resume; once-ever; quiet hours; a full run with a replacement;
        ⛔ new events; ids-only alarms.
- [x] **Task 5 — the link, the screen, the records (AC6–AC8).**
  - [x] 5.1 Contracts `PeerRequestByLinkResponse` (`packages/contracts/src/claims/peer-request.ts`; run vitest — [[project_contracts_tests_outside_tsc]]);
        the route in `claims.peer-request.member.routes.ts` with `logLevel: 'warn'` and the read budget (R13 / R14); the handler + core
        mapping; api-client `byLink(code)`; route tests (404 ×5 identical status / code / message; 200; the read budget's 429) + the `logStream` PII spec.
  - [x] 5.2 Mobile `PeerRequestSlot` per AC6 (⛔ a new route file — 6.30 AL16; depend on `locale`, ⛔ `t` — [[project_uset_fresh_closure_memo_trap]];
        empty / loading / error OUTSIDE any list — [[project_fabric_flatlist_empty_populated_crash]]); source-scan + pure-logic tests
        (`apps/mobile/vitest.config.ts` renders ⛔ no screen); run tsc with and without `.expo/types` ([[project_mobile_typed_routes_worktree]]).
  - [x] 5.3 AC7's live API test (send → list → detail).
  - [x] 5.4 Records: Row 27 (f) annotation (AC8); BF33's CHECKs; deferred-work — Close *"`APP_LINKS_BASE_URL` can disagree …"* (R12) and
        *"Ping delivery columns unconstrained while `attempting`"* (R15) with *"Closed by Story 6.27c (…) — `attempt_count`, `first_detail`
        and `aging_since` constrained; `claimed_*` stays rewritable BY DESIGN (the RN7 re-claim needs it)"*; NARROW W3 (§6-36 round 2):
        *"unsent pings are re-checked at send time by the ONE predicate (6.27c); a TEXTED ping and the reply path still do ⛔ not re-check —
        stays open"* ([[feedback_closure_language_precision]]); a NEW item: *"the console shows a skipped ping's `no_target:*` code verbatim and
        ⛔ links it to its replacement"* (BF29) — trigger: the next touch of `PeerMeshView`; and, under its *"owed to the Trustee Panel"* heading, BF24's FYI line (the English text is
        ≈ 3 UCS-2 segments too — trigger: the next `trustee-panel-routing-note-*` written for ANY story).
  - [x] 5.5 Change Log + File List; `pnpm ci:local` green with `DATABASE_URL` at :5433 ([[project_prepush_hook_inherits_5432]]); the
        migration applied to BOTH DBs.

### Review Findings

Review date: 2026-10-17. Full branch review, without chunks: `cdc39004..668e545f`, 48 files,
5,084 additions / 188 deletions. Blind Hunter, Edge Case Hunter and Acceptance Auditor completed;
6 patch findings, 0 decisions, 0 deferred, 2 dismissed. Application code unchanged; patch disposition awaits BigDev. ⭐ (annotated
2026-10-17, round 2: BigDev chose to fix all six — commit `a1256ead` recorded them, `f3c19b62` fixed them; see the Resolution below.)

- [x] [Review][Patch] **F1 / P1 — Query failures log the by-link code.**
  [packages/domain/src/claim/peer-mesh-request.ts:641]
  AC5b / AC6 / R13: Drizzle wraps a failed resolver query in an error whose message and parameters contain the code.
  The member transaction rethrows it to the error mapper, which logs the raw error at `error`; the route's `warn` level
  permits that line. The existing PII test fails the connection before the query and misses this path. Sanitize the error
  before logging while retaining a safe diagnostic. **Verified:** inject a failure at the resolver's `client.query`;
  the API returns 500 and its captured log contains the planted code. Source: auditor.
- [x] [Review][Patch] **F2 / P2 — A daytime child can send after the 20:00 IST cutoff.**
  [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:415]
  AC2: the window is checked only at job entry, before awaited config, name, lock, decrypt and send work.
  Recheck the current clock at each begin and provider handoff, and defer remaining work when the window closes.
  **Verified:** start at 19:59:59, advance the injected clock to 20:00:01 during config resolution;
  both selected neighbours are still texted. Sources: blind + edge + auditor.
- [x] [Review][Patch] **F3 / P2 — A newly begun ping can already have an expired lease.**
  [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:452]
  AC2 / concurrency invariant: every begin receives the job-entry `now`, which is stored as `claimed_at`.
  Slow configuration or earlier processing can backdate a fresh lease by more than ten minutes, permitting another
  live child to reclaim and send the same ping. Timestamp the lease at the locked begin, using current time rather
  than the run-start snapshot. **Verified:** advance the clock eleven minutes during config, then start another child
  while the first is handing off its send; the single neighbour receives two provider calls. Sources: blind + edge.
- [x] [Review][Patch] **F4 / P2 — Back from one link suppresses later links on the mounted route.**
  [apps/mobile/components/peer-request/PeerRequestSlot.tsx:38]
  AC6: `linkDismissed` remains true when a new `code` prop arrives, so the resolver receives null and the list stays open.
  Scope dismissal to the incoming link and reset request navigation when the code changes.
  **Verified:** render the real slot with code A, invoke its questionnaire Back, rerender with code B;
  the mocked resolver hook receives null instead of B. Sources: blind + edge + auditor.
- [x] [Review][Patch] **F5 / P2 — Held prefixes can starve ready claims on every bounded sweep.**
  [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:284]
  AC4 / R16 recovery: each run resets the cursor to null and held claims consume the claim bound. If the same held
  low-id claims fill that bound (default 20,000), later ready claims are never visited by the recovery sweep.
  Preserve fair continuation across bounded runs. **Verified:** two claims, lower id held, higher id ready,
  `maxRuns = 1`; three successive sweeps enqueue neither claim. Sources: blind + edge.
- [x] [Review][Patch] **F6 / P2 — Valid origins can produce links longer than the registered DLT slot.**
  [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:530]
  The registry declares a 120-character URL ceiling, but the config guard validates only the origin's shape.
  An oversized rendered link reaches the provider after a once-ever slot is begun; a permanent DLT rejection would
  consume that slot. Check the complete fixed-length-code link against the registry ceiling during config validation
  and hold the scope if it cannot fit. **Verified:** an accepted HTTPS origin with valid 60- and 40-character DNS labels
  produces a 141-character request link. Sources: blind + edge.

**Resolution (2026-10-17, `bmad-dev-story` review continuation):** all six fixed, each with a test that FAILS on the unfixed code and
passes on the fix (red run, then green): F1 — `resolvePeerRequestByLinkCode` rethrows a sanitised `PeerRequestByLinkReadError` (the
SQLSTATE only, ⛔ `cause`); F2 — the clock re-read at each begin and before each hand-off, a closed window ⇒ re-enqueued for 09:00 IST
(with the run's counts); F3 — the begin's lease stamped with that fresh clock; F4 — a new `code` on the mounted slot resets the dismissal
and the open request; F5 — a held claim ⛔ counts against the hard bound (except under a GLOBAL gap); F6 — `appLinksConfigGap` holds an
origin whose link exceeds the `{link}` slot (`config:app_link_too_long`, via `fitsDltUrl`). The fix diff was adversarially reviewed
(fresh context): ⛔ HIGH; five LOW — three fixed (the global-gap bound, the deferral's counts + docs, the F1 spec's pooled clients); three
residuals recorded in `deferred-work.md`, ⛔ fixed here (the send core's own config reads after the check; a begun-⛔-sent row re-claimed
as attempt 2; the sweep cursor restarting).

**Validation (the review):** 195 existing focused tests passed: jobs/SMS 69, domain/detail/decrypt-fence/concurrency/policy 106,
mobile link/route-map 20. Six additional isolated reproductions failed their expected-correct-behavior assertions,
one for each finding. They live outside the repository at `/private/tmp/twt-6-27c-review-tests/` and
`/private/tmp/twt-6-27c-mobile-review/`. No full `ci:local` rerun was performed for this review.

**Invariant lens:** state/window guards, tenant/member ownership, replacement constraints and cascades have dedicated
tests; replacement cardinality follows the one-to-one replacement link plus the original selection cap; sweep bypasses
carry DELIBERATE blocks. Concurrency has a REAL GAP (F3), and minimal exposure has a REAL GAP (F1) — ✅ both closed by the F1 / F3 fixes (`f3c19b62`).
The new failure view reuses the announced not-openable state and real helpline handler. Device HTTPS opening,
provider approval and counsel basis remain explicitly assigned to launch gates; this review claims no device proof.

**Dismissed:** comparing the actual deployed app-link host is outside R12's expressly specified port/dot validation
and remains a deployment check; the unpaged distinct stalled-scope read had no demonstrated failure at the supported
scale, so the speculative performance finding was not retained. No Panel routing is required for these engineering fixes.

#### Round 2 — the whole branch (2026-10-17)

Review date: 2026-10-17. Whole branch `main...f3c19b62` (49 files, +5,551 / −188), 4 chunks (domain + migration + queue / jobs + scripts
/ API + contracts + api-client / mobile + i18n + docs + governance) × 3 layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — 12
layers, ⛔ failed. Every MED claim re-verified against the code before classification. **The review itself: 2 decision-needed, 17 patch, 8 defer
(W1–W8), 34 dismissed.** Resolved: D1 ⇒ P18 (a patch), D2 ⇒ W9 (ACCEPTED by BigDev — recorded with a trigger, ⛔ deferred work); the
fix-diff review added W10 (deferred); the adversarial review of the applied patches added D3 (BigDev ⇒ Decision `2026-10-17-344`) and
the follow-ups below. **Totals as recorded: 3 decisions, 18 patches, W1–W8 + W10 deferred, W9 accepted, 34 dismissed** (`deferred-work.md` § ROUND 2). ⛔ HIGH. Panel gate (§0): ⛔ finding is the Panel's — who is texted and when
changes ⛔ what anyone is owed (the story's Policy meaning); D1 touches BigDev's author-commit `-343`, ⛔ a ratified ruling.

- [x] [Review][Decision] **D1 — R5 treats a provably UN-sent re-claim as "may have sent"** — ✅ RESOLVED (BigDev, 2026-10-17): option (a) ⇒ P18 — R5 / 0166's replacement trigger key on
  `attempt_count > 1`, but three designed paths re-claim a ping that ⛔ reached the send core: a `decrypt_failed:tier1` / `hash_failed:tier1`
  transient (R6 — ⛔ R6 by design) and F2's 20:00 deferral after the begin. On that re-claim an unusable number, a window exit or a peer
  failure finishes the row WITHOUT a replacement (`peer-mesh-request.ts:580`, 0166 `IF replaced.attempt_count <> 1`) and alarms "a prior
  attempt was claimed and may have sent" — a neighbour who was ⛔ texted is lost (fewer asked) and staff get a false alarm. The recorded
  residual (module header, Completion Notes) names only the 20:00 case. Options: **(a)** keep R5 as built and widen the recorded residual to
  every pre-send path (header + `deferred-work.md` + a test pinning the behaviour) — ⛔ code, ⛔ migration; cost: the rare loss stays.
  **(b)** stamp a "handed to the send core" marker just before `sendClaimDltSms` (a new column + 0167, the trigger and R5 read it); cost: a
  new migration on both DBs, the trigger replaced again, another review round. Sources: edge (domain) + auditor (jobs).
- [x] [Review][Decision] **D2 — F4's reset discards an open questionnaire's unsaved work when a second link arrives** — ✅ RESOLVED (BigDev, 2026-10-17): option (a) ⇒ W9 — the render-time reset
  (`PeerRequestSlot.tsx:43-47`) unmounts `PeerQuestionnaire` on any new `code`, bypassing its `leaveQuestions` warning and
  `usePreventRemove` guard ⇒ queued saves and typed-but-unsaved dates are dropped silently (an in-flight Submit lands, its Thank-you is
  never shown). Introduced by round 1's F4. Options: **(a)** accept as a recorded trade-off (a member with two open requests tapping the
  second link mid-answer; autosave keeps saved answers) — a `deferred-work.md` line; **(b)** route a code change while the questionnaire is
  busy / dirty through the same leave warning. Source: edge (mobile).
- [x] [Review][Patch] **P1 (MED) — A config final from the send core mid-run uses up EVERY remaining slot of the claim**
  [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:590] — after the race guard, a `config:*` final (`dlt_template_id_missing`,
  `helpline_number_missing`, `sms_gateway_unconfigured`, `secret_manager_<CODE>`, `sms_messaging_unavailable` — `claim-dlt-sms-send.ts:125-135,165`)
  is finalised `error` and the loop begins the NEXT ping, which hits the same final. Stop on a `config:` final: record that one ping as today,
  return `held_config` with ⛔ further ping begun (the next sweep re-checks the scope). Source: edge (jobs). ⚠ As applied (fix-diff review):
  the stop also covers `auth` / `dlt_template_not_approved`; for those and `config:sms_messaging_unavailable` the sweep cannot see the
  fault, so the next child uses ONE more slot — recorded as W10.
- [x] [Review][Patch] **P2 (MED) — AC5b's alarms are ⛔ exercised at the jobs layer** [apps/jobs/tests/claim-peer-mesh-requests-live.test.ts]
  — ⛔ test reaches `:501` (re-check fails ⇒ `error`), `:508` (re-claimed `no_target`), `:548` (R6 on attempt > 1), `:588` (the helpline
  warning — the fixture helpline is a valid callback number), `:590` (a final `error` with `alarm`). Add a leg per alarm (fired, ids-only).
  Also: a re-claimed NAME fault returns the PRE-re-claim `attemptCount` (`peer-mesh-request.ts:397`) ⇒ the alarm reads "on attempt 1 — a prior
  attempt was claimed"; report the re-claim's count. Sources: auditor (jobs) + blind (domain). ⚠ As applied: the domain still returns
  the PRE-re-claim count (pinned by the domain spec); the ALARM was reworded to "on a re-claim after N claimed attempt(s)" instead.
- [x] [Review][Patch] **P3 (MED) — The `link_code` 23505 SAVEPOINT retry has ⛔ test** [packages/domain/src/claim/peer-mesh-request.ts:687]
  — AC2 / checklist family 2 (REAL GAP): plant a ping holding the code the generator will return first (stub the generator's bytes), begin
  another ⇒ the retry takes a fresh code inside the SAVEPOINT and the begin succeeds. Source: auditor (domain).
- [x] [Review][Patch] **P4 (MED) — A hung by-link call leaves the member on "Loading…" with ⛔ exit** [apps/mobile/components/peer-request/usePeerRequestQueries.ts:50]
  — the transport has ⛔ timeout and `byLink` takes ⛔ signal; a stalled cold start never becomes AC6's "failed call ⇒ not-openable + helpline"
  (header hidden ⇒ ⛔ Back on iOS), and a re-tap re-joins the hung fetch ([[project_tanstack_refetch_rejoins_hung_fetch]]). Give `byLink` an
  `opts.signal` and race the app's read timeout (6.36b's `withReadTimeout` precedent). Sources: edge + auditor (mobile).
- [x] [Review][Patch] **P5 — The deceased's name is decrypted before the child knows any ping is due** [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:470]
  — R8's hook enqueues on every no-op SELECT re-run ⇒ a KMS decrypt + audit line (and, on a fault, alarms + retries) for children with
  nothing to send. List the due pings first; `noop` when empty; then R9's read (still ONCE, before any begin). Source: blind (jobs).
- [x] [Review][Patch] **P6 — The lease is ⛔ re-checked before the hand-off** [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:567]
  — a begin → send gap past `CORRECTION_SEND_LEASE_MS` (untimed decrypt / HMAC / the core's two Secret Manager reads) lets another child
  re-claim and send the same ping. If `sendAt − beginAt ≥` the lease ⇒ the transient's path, ⛔ sent. Source: edge (jobs).
- [x] [Review][Patch] **P7 — A DB fault on the locale read is reported as a config HOLD** [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:173]
  — `config:locale_unavailable` (⛔ in R11's list) returns `held_config` with ⛔ retry and, in the sweep, PARKS the Pariwar's pings; the domain
  doc (`peer-mesh-request.ts:621`) says the child retries. Child: a throw ⇒ `ClaimCorrectionTransientError`; sweep: that Pariwar ⛔ held /
  ⛔ parked, ⛔ enqueued this run. Sources: auditor + blind (jobs).
- [x] [Review][Patch] **P8 — Host-vs-DB clock skew at 09:00 can re-enqueue the morning child in a tight loop**
  [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:448] — `startAfter` = 09:00:00 IST fires on the DB clock; a host a few seconds behind
  sees 08:59:5x and re-enqueues for today's 09:00 (already past for pg-boss). Floor the deferral (`max(next, now + 60 s)`). Sources: blind +
  edge (jobs).
- [x] [Review][Patch] **P9 — `expectIdsOnly` flakes on UUIDs** [apps/jobs/tests/claim-peer-mesh-requests-live.test.ts:270] —
  `/\d{10}/` matches ten decimal digits inside a UUID's hex groups (≈ 1.6 % per UUID — only the 12-hex group can hold ten in a row;
  first recorded as "≈ 2–3 %"); strip UUIDs before asserting. Sources: blind +
  auditor (jobs).
- [x] [Review][Patch] **P10 — Three of R11's hold codes are untested** [apps/jobs/tests/claim-peer-mesh-requests-live.test.ts] —
  `config:sms_gateway_unconfigured`, `config:secret_manager`, `config:helpline_number_missing`: a hold leg each (⛔ ping begun). Source:
  auditor (jobs).
- [x] [Review][Patch] **P11 — R6's second transaction inserts a replacement without re-checking the answer window**
  [packages/domain/src/claim/peer-mesh-request.ts:784] — a claim decided between the begin's commit and R6 gains an un-texted replacement
  (the console's extra `'not_sent'` row). Under the claim lock: out of the window ⇒ finish `no_target` with ⛔ replacement. Source:
  auditor (domain).
- [x] [Review][Patch] **P12 — Domain test teeth** [packages/domain/tests/integration/claim/peer-mesh-request.spec.ts;
  …/rls/claim-peer-mesh-replies-policy-regression.spec.ts] — the "every builder output passes 0166's CHECK" leg asserts ⛔ `rowCount`;
  R4's comments misstate coverage ("the deceased themself ⇒ the fallback" is `peer_reported_deceased`; the `peer_not_eligible` exclude is a
  no-op) and the `member_id <> deceased` conjunct has ⛔ leg; the "another Pariwar's ping is NOT FOUND" leg cannot fail for RLS (rename to
  what it proves); the live-cap assertion is `≤ s.pings.length` with unbegun originals; the trigger's SQL reason list is checked one way
  only (pin it equal to `PEER_MESH_REQUEST_REPLACEABLE_REASONS`). Sources: blind + auditor (domain).
- [x] [Review][Patch] **P13 — API test teeth** [apps/api/tests/integration/claims/peer-request-by-link.spec.ts;
  peer-request-after-send.spec.ts] — the read budget is proven only for one member from one IP (add a second member: still 200); `other`
  is ⛔ a seeded member (seed a real active member); ⛔ leg for a code of ANOTHER Pariwar's ping on the member's OWN path; ⛔ leg for a
  texted ping of a CLOSED claim (200 then the detail's 409 `no_longer_open`); the after-send spec never asserts by-link 404 while
  `attempting`. Sources: blind + auditor (API).
- [x] [Review][Patch] **P14 — Mobile test / comment drift** [apps/mobile/tests/unit/app-link-route-map.test.ts:310;
  peer-request-link.test.ts:370] — the kept comment "the slot itself calls nothing" is false since the by-link hook; the
  `openPingId + code + error` view case is unreachable in the slot (pin a reachable one). Source: blind (mobile).
- [x] [Review][Patch] **P15 — The Hindi is recorded as "agent-authored afresh", but it is the `-303` routing block's draft with `दो` → `कुछ`**
  [packages/i18n/locales/hi/claim.json:168] — word for word (`trustee-panel-routing-note-2026-10-10-6-27-asking-the-neighbours.md:53`).
  Trap 19's purpose (⛔ "two") is met; the RECORD is not — fix `$comment.peer_mesh_sms` (both locales), the sheet's 13–14 wording note and
  the Completion Notes to say what happened, so Row 28's reviewer reads the truth (the words unchanged). Source: auditor (mobile/docs).
  ⚠ The "purpose is met" wording RE-READ PM3 — corrected by D3: the clause is SUPERSEDED by `2026-10-17-344` (BigDev), ⛔ re-read.
- [x] [Review][Patch] **P16 — Story / gate records lag** [this file; friction-budget.md] — the File List omits `.decision-log.md` (`-343`);
  round 1's header still reads "patch disposition awaits BigDev" and its invariant lens "REAL GAP (F3) / (F1)" with ⛔ resolved note; the
  Change Log has ⛔ entry for `a1256ead` (→ in-progress); the friction-budget disposition omits `peer-request-slot-render.test.ts` and
  F4's member-visible change. Sources: auditor + blind (mobile/docs).
- [x] [Review][Patch] **P17 — The DLT sheet's own lines disagree** [docs/launch-gate-inventory/dlt-template-requests-6-19.md] — the header
  gates 13–14 on Row 27 AND Row 28, both "Do not provision … until Row 27 closes" lines name Row 27 only; "replaced by ONE other, so the
  count never grows past the original selection" (say TEXTS ≤ the original count; ROWS may exceed five); the cost line gives the best case
  only — a 40-char name ⇒ en 219 (4 segments), a 120-char link ⇒ hi ≈ 284 (5) — and the owed Panel FYI (`deferred-work.md`) repeats "3 / 4":
  state the range. Sources: blind + edge (mobile/docs).
- [x] [Review][Patch] **P18 (from D1 (a)) — Widen R5's recorded residual to every pre-send re-claim, and pin it** [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:21] — the module header, the Completion Notes and `deferred-work.md` name the 20:00 case only; state every path (a `decrypt_failed:tier1` / `hash_failed:tier1` transient, the F2 deferral, and — added by the patch review — P6's lease lapse before the handoff): on that re-claim a failed re-check or an unusable number finishes ⛔ replaced and alarms "may have sent" although ⛔ text went (R5 / `-343` as built); ⭐ trigger: such an alarm on a row whose `first_detail` is a pre-send fault (⚠ `provider_message_id` NULL alone cannot tell these from a crash after an accept). A live leg pins it (a decrypt throw, then an unusable number on attempt 2 ⇒ `no_target`, ⛔ replacement, the alarm).
- [x] [Review][Defer] **W1 — A permanently undecryptable deceased name loops daily** [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:406] — deferred, pre-existing shape (R9's read-before-begin)
- [x] [Review][Defer] **W2 — The child queue's default 900 s expiry + own-retry lease skip** [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:626] — deferred, inside the recorded at-least-once residual
- [x] [Review][Defer] **W3 — A transient by-link failure reads as the final not-openable** [apps/mobile/components/peer-request/usePeerRequestQueries.ts:60] — deferred, AC6 as written
- [x] [Review][Defer] **W4 — A multi-Pariwar member signed into another Pariwar gets the ONE 404** [apps/api/src/modules/claims/claims.peer-request.handlers.ts] — deferred, 6.30's link shape
- [x] [Review][Defer] **W5 — A 23514 on a ping write carries the row in Postgres' error detail** [packages/domain/src/claim/peer-mesh-request.ts] — deferred, reachable only through a bug
- [x] [Review][Defer] **W6 — ⛔ CHECK requires `link_code` on an `attempting` row** [packages/domain/migrations/0166_peer-mesh-request-sending.sql] — deferred, by construction today
- [x] [Review][Defer] **W7 — A parked ping stops ageing if ⛔ child re-claims it** [packages/domain/src/claim/peer-mesh-request.ts:819] — deferred, pre-existing (the suspicion twin)
- [x] [Review][Defer] **W8 — `locale_source` is a literal in the begin** [packages/domain/src/claim/peer-mesh-request.ts:696] — deferred, row 6-35
- [x] [Review][Accepted] **W9 (from D2 (a)) — F4's reset drops an open questionnaire's unsaved work on a second link** [apps/mobile/components/peer-request/PeerRequestSlot.tsx:43] — ACCEPTED by BigDev (⛔ deferred work — recorded with a trigger): rare (two open requests, the second link tapped mid-answer); saved answers are kept
- [x] [Review][Defer] **W10 (from the fix-diff review of P1) — A scope-wide send fault the sweep cannot see costs ONE slot per child run** [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts] — deferred, needs a persisted per-Pariwar send hold

- [x] [Review][Decision] **D3 (from the adversarial review of the applied patches) — the Hindi breaks the LETTER of `-311` PM3** — PM3
  (adopted AS WRITTEN by `-311` §3): *"hi: agent-authored afresh … ⛔ NEVER copied from the `-303` routing block's draft"*; the shipped
  Hindi IS that draft with `दो` → `कुछ`, and P15's "purpose is met" re-read the clause. ✅ RESOLVED (BigDev, 2026-10-17): option (b) —
  the clause SUPERSEDED by author-commit [`2026-10-17-344`](../../.decision-log.md#decision-2026-10-17-344), committed alone (`c7d2f9ca`);
  Row 28's human review stays the control. (Option (a), a fresh Hindi, declined.)

**Applied-patch review follow-ups (2026-10-17; two fresh-context adversarial passes over `7f98fbfb` — code, then tests + records; ⛔ HIGH):**
the domain `resolvePeerRequestLocale` JSDoc re-attached (it sat orphaned above the new error class and still said "the child retries");
an UNREADABLE Pariwar's stalled rows are now PARKED (the give-up clock paused) and its alarms carry the read's SQLSTATE
(`peerMeshSqlStateOf`, now exported — F1's helper); P8's rationale corrected (one extra hop, ⛔ a loop); the child's `@throws` and the
sweep header name the P1 stop and the unreadable skip; the R5 trigger stated honestly (the stored row cannot tell a pre-send re-claim
from a crash after an accept); P13's cross-Pariwar leg rebuilt (a ping of the SAME member in another Pariwar + a positive control — it
was failing on the member predicate); the new stalled-row fixtures take a fresh link code (`link_code` is UNIQUE across Pariwars); the
records — D3, the raw counts, W9 ACCEPTED (⛔ deferred), P2 / P9 / P18 as applied, the Change Log order. **Validation:** `ci:local` on
`7f98fbfb` (:5433) 35/36 — `test (unit)`: 7 admin jsdom timeouts under load in two files this branch ⛔ touches; `@twt/admin` re-run alone
75/75 files, 1229 tests; then the follow-ups' focused suites green (jobs live 36, API by-link 7, domain spec 26). **Final:** `ci:local` on
`e762a1af` (:5433) 35/36 — `test (unit)`: ONE admin jsdom timeout under load (`helpline-claim-page.test.tsx`, ⛔ touched); `@twt/admin`
re-run alone 75/75 files, 1229 tests.

**Dismissed (34), the notable ones:** R7 admitting a skipped ping's member (the ONE caller gates on `visible()` ⇒ `'accepted'`, and the
pre-6.27c gate `selected_member_ids` already admitted them); the code in proxy / Cloud Run access logs (R13's recorded residual); an
empty `scopes` give-up (`expireExhaustedPeerMeshRequests` returns `[]`); `CREATE OR REPLACE` dropping function attributes (0156 declares
none); `detail!` (typed `string` on every non-accepted branch); a finalise throw after an accept (the recorded at-least-once residual);
the helpline / name character sets (6.34 C1 "sent as today"; Row 30 (d)); Row 27 (f)'s annotation (AC8 prescribes it, dated, ⛔ rewritten);
`-343`'s commit order (`ccca9f5f` alone, before any code — verified); the contracts test importing `@twt/domain` (precedent).

## Dev Notes

- **Traps** (6.27a's list applies — `6-27-…md` §TRAPS): 2 (the ruled words only — ⛔ any deadline word), 5 (rebase onto every sibling), 8
  (⛔ never rewrite a selection — a replacement is a NEW ping row only), 9 (⛔ KMS under a lock — decrypt AFTER COMMIT), 10 (the erased
  sentinel is a "mobile" — ALWAYS `normalizeMobile`, ⛔ `resolveSmsTarget`), 11 (raw gateway codes — the ONE builder), 12
  (`clock_timestamp()` ⛔ `now()`), 13 (claim → ping → reply), 14 (`**/` closes a JSDoc — [[project_markdown_emphasis_closes_jsdoc]]), 16
  (Prettier ⛔ enforced — hand-format), 17 (leave room for row 6-31 — ⛔ give the finished-row trigger a rule that refuses a SEPARATE
  reminder record; the reminder reads the same answer window), 19 (⛔ the `-303` block's Hindi), 21 (`{#var#}` / `DLT_VAR` /
  `sms.dlt.template_id.` ONLY in the registry — comments included).
- ⚠ **Row 6-35** will change ONE read (R10) to *member's choice, else the Pariwar's default* — keep it a single function. ⚠ An `en`-default
  Pariwar sends English texts that open Hindi screens (the app always renders `hi` — [[project_mobile_app_no_language_switch]]); moot for Bihar.
- ⚠ **Row 6-37 (MSG91, backlog)** sends by slot NAME — the names `member` / `link` / `helpline` and the sheet's MSG91 column are the whole
  anticipation; ⛔ build an adapter.
- ⚠ **Row 26 (`jobs-db-role`)** — the production jobs login holds ⛔ no claim-table privileges; the new sweep is already listed on the row
  (`inventory-roster.md:456`). ⛔ Fixed here.
- ⚠ **The DLT ids are ⛔ never provisioned until Row 27 closes** — unset ⇒ the sweep HOLDS (R11). The dotted Secret Manager name defect is
  recorded on Row 27 (BF23) — ⛔ fixed here.
- ⚠ **Shared test DBs**: a peer worktree's `ci:local` on the same DB causes timeouts ([[project_known_livedb_test_failures]],
  [[project_ci_local_concurrency_oversubscription]]); `deadlock detected` in domain `ci:local` is lock order
  ([[project_fk_truncate_cascade_deadlock]]); DB-clock ties inside one BEGIN/ROLLBACK ([[project_db_clock_ordering_tests_tie]]).
- **Reuse map (⛔ reinvent):** send core `sendClaimDltSms` (BF8) · send record shape `suspicion-notice.ts` (BF9) · sweep / child shape
  `claim-suspicion-notices.ts` (BF10) · registry + lockstep `suspicion-notice-sms-templates.ts` + its test (BF20) · window
  `isClaimInAnswerWindow` / `answerWindowSql` (BF31) · eligibility `peerMeshEligibleMemberSql` (BF6) · pending check
  `pendingCounselBasisKeys` (BF30) · mobile → hash (BF12) · name (BF13) · app links (BF25) · origin `resolveHttpsOrigin` (BF17) · code
  generator shape `telegram-opt-in/code.ts` (BF25) · read budget `known-people/routes.ts:46` (BF26) · PII log spec `logStream` (BF27) ·
  decrypt fence (BF16) · the not-openable state (BF28).
- **Previous stories:** 6.24b (the send core + sibling registry), 6.29 (hold / park / give-up, the CHECKs, the trigger), 6.34 (typed
  variables, the gate, the sheet), 6.30 (app links, the login-return), 6.27a (the substrate — its review rounds U / V / W / X: owner-scoped
  caches, FIFO autosave, 0157's ownership constraints), 6.27b (`-329`'s `'accepted'` rule), 6.36 (the ranking, `-340` / `-341`).
- **Git:** recent `main` is 6.36c (`cdc39004`); land by fast-forward ([[feedback_land_prs_by_fast_forward]]); commit on
  `story/6-27c-peer-mesh-sending-texts-and-links` in worktree `.claude/worktrees/6-27c` ([[feedback_shared_tree_branch_switch]]).
- **Latest tech:** ⛔ no new library. Fastify's route option `logLevel` (v4/v5) sets the per-route logger level; pg-boss `startAfter` accepts
  a `Date` or seconds; Node `crypto.randomBytes` for the code.

### References
6.27a's file (PM1–PM5, PM8, PM11, PM14–PM16, PM21–PM23, Traps); 6.30's file (AL2, AL5, AL6, AL16); 6.34's file (TV1, TV4, TV11, TV13);
6.36a's file (SF11, SW22–SW28); `.decision-log.md` `-303`, `-304`, `-305`, `-310`, `-311`, `-322`, `-323`, `-324`, `-329`, `-330`, `-331`,
`-339`, `-340`, `-341`; `docs/launch-gate-inventory/inventory-roster.md` Rows 26–31; `docs/launch-gate-inventory/dlt-template-requests-6-19.md`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (1M context) — `bmad-dev-story`, 2026-10-16/17, in worktree `.claude/worktrees/6-27c` on `story/6-27c-peer-mesh-sending-texts-and-links`.

### Debug Log References

- Task 0.3 drift check: `git diff --name-only cdc39004..HEAD -- packages apps scripts infra docs/launch-gate-inventory` — empty; `git fetch` then
  `git log cdc39004..origin/main -- .decision-log.md` — empty (⛔ ruling after `-342`).
- 0166 pre-apply check (recorded in the file's header): :5432 0 ping rows; :5433 382 rows (344 begun) — 0 fail the grammar on `detail` /
  `first_detail`, 0 `attempting` without `aging_since`. Applied to :5433 (Task 2) and :5432 (Task 5.5); both DBs' journal hash for idx 166 =
  `shasum -a 256` of the file (`8999dfe2…`).
- Fixture faults found and fixed while writing the tests (⛔ code faults): a policy-leg helper passed no `pariwarId` (the trigger's "own
  selection" refusal fired); a parked-row fixture moved `aging_since` BACKWARD on a begun row (0156's forward-only arm, correctly refused) —
  rewritten to plant the row from ⛔ begun; a chained-replacement fixture excluded the second neighbour BEFORE the first replacement was picked
  (the inserter correctly skipped them); a concurrency seed inserted the claim row directly (the projector replays the stream, so the next
  event replayed to ⛔ window) — now `driveClaimTo`; a submitted-reply fixture wrote `submitted_at` in the INSERT (the order CHECK).
- A first run of the policy spec went to :5432 (the shell's `DATABASE_URL`; the worktree has ⛔ `apps/api/.env`) — per-test ROLLBACK, ⛔ rows
  left; every later run exported :5433 explicitly.

### Completion Notes List
- 2026-10-10 — cut from Story 6.27 v2.0 (`-305`). ⛔ No code.
- 2026-10-16 — v3.0 re-derived at `cdc39004` (`bmad-create-story 6.27c`): BF1–BF34, R1–R16; two fresh-context validate rounds (v3.1, v3.2 — ⛔ HIGH open). Ultimate context engine analysis completed —
  comprehensive developer guide created. ⛔ No code.
- 2026-10-17 — **implemented (`bmad-dev-story`)**, Tasks 0.3–5.5, one commit per task on the story branch:
  - **Task 1** — `peer_mesh_sms.request` (en = the ruled words byte for byte, ⛔ "TWT:"; hi — *"कुछ छोटे प्रश्नों"*, ⛔ the routing
    block's *"दो"*; ⚠ CORRECTED by review round 2 P15: the Hindi IS the routing block's draft with that one word changed — word for word
    otherwise, ⛔ "afresh" as first recorded; PM3's "never copied" clause SUPERSEDED by `2026-10-17-344` (D3); Row 28's review covers it), `$comment.peer_mesh_sms` with **NOT YET HUMAN-REVIEWED** + Row 28 in both; the registry
    `peer-mesh-sms-templates.ts` (slots member alphanumeric 40 / link url 120 / helpline cbn 14; `peerMeshRequestDltConfigKey(locale)`;
    `renderPeerMeshRequest` through the real `t()`; `fitsDltAlphanumeric` — code points, ONE constant), in `REGISTRY_FILES`; the lockstep
    test leg for leg (29 legs, incl. the deny-list and 40 / 41 code points in Devanagari and an astral case); the sheet: rows 13 (hi) / 14
    (en) in the seven-cell form, *"The wording of templates 13–14"*, their own three-variable justification, the *"lowest"* line
    (14 at 39.6 %, 13 at 43.7 %), the MSG91 last-word warning gains 14, a cost line for BOTH locales (UCS-2 — en ≈ 198 ⇒ 3 segments,
    hi ≈ 219 ⇒ 4, stated with its assumptions), a Record row.
  - **Task 2 — 0166** (hand-authored, idx 166): the two grammar CHECKs (= `PEER_MESH_REQUEST_DETAIL_PATTERN`, pinned by a
    `pg_get_constraintdef` leg); `replaces_ping_id` + `ON DELETE CASCADE` FK + `UNIQUE` + the BEFORE INSERT `replacement_guard` (same
    selection AND Pariwar — another Pariwar's ping is NOT FOUND under RLS; finished `no_target` with a peer detail — the list is
    `PEER_MESH_REQUEST_REPLACEABLE_REASONS`, iterated by a leg; `attempt_count = 1`); R15's CHECK + the guard function replaced in place
    (every 0156 message kept). `PEER_MESH_LINK_CODE_PATTERN` added beside the CHECK and pinned to `APP_LINK_CODE_PATTERN` over boundary
    samples in a contracts test (the domain cannot import the contracts). 11 new policy legs.
  - **Task 3 — `claim/peer-mesh-request.ts`**: the builder + vocab (the send families parsed by the suspicion notices' ONE parser, the
    gateway classes the SAME array — pinned), `generatePeerRequestLinkCode` (CSPRNG, rejection sampling, asserts its form),
    `beginPeerMeshRequest` (R1 ①–④ under claim → ping locks; the re-claimed row's `-297` §2 / `-298` A forms; the SAVEPOINT retry on a
    `link_code` 23505), `readPeerMeshRequestEligibility` (R4 — the gate IS `peerMeshEligibleMemberSql`, the labels only after it fails),
    `insertPeerMeshReplacementPing` (R2 — the STORED ranking in order, RETURNING `ping_id`), `finalisePeerMeshRequest` (AC2c),
    `notePeerMeshRequestTransient`, `finalisePeerMeshNoSendableNumber` (R6 + R5 read from the LOCKED row), the due pings, the locale (R10),
    the by-link read (R14), the sweep's due claims (R16 — `answerWindowSql`), stalled scopes, park and give-up. R7: `recordPeerMeshResponse`
    refuses a member with ⛔ PING in the selection (the 6.6 leg kept for a non-pinged member; a new leg: a replacement's response counts
    once). The decrypt fence 52 → 53 + its arm; `anonymize.ts`' comment line. Tests: 16 pure, 24 live, 3 two-connection.
  - **Task 4 — `scheduler/claim-peer-mesh-requests.ts`**: the child (quiet hours with `startAfter` = the next 09:00 IST; R11's race guard —
    the gateway, `resolveAppLinksOrigin` (R12, new beside `resolveHttpsOrigin`), the live version and `config:counsel_basis_pending` /
    `config:questionnaire_unavailable`, the locale's template id, the helpline, any Secret Manager fault; R9's name read before any begin;
    per ping begin → COMMIT → number → hash → send → CAS, R6 on an unusable number, a decrypt / hash THROW a transient, replacements processed
    in the same run, one throw at the end) and the 10:30 IST sweep (config first, park, give-up over un-held, paged enqueue, one end-of-run
    alarm). Queues `claim.peer_mesh_request.sms` / `.sweep`; R8's `enqueuePeerMeshRequestSend` hook in the SELECT worker (keyed on "a
    selection with pings exists" — fresh AND no-op; ⛔ `none_to_ask`), the child queue created before the SELECT worker registers, the
    workers registered beside the suspicion notices with `APP_LINKS_BASE_URL`. Tests: 49 pure (incl. 08:59 / 09:00 / 19:59 / 20:00 IST,
    midnight and year boundaries; the origin cases), 15 live (the shipped registry HOLDS; ⛔ live version, a port, an explicit `:443`, a
    trailing dot, ⛔ template id each HOLD; park → held five days → un-held ⇒ ⛔ given up, re-claimed and sent with the SAME code; the
    registered words + the row's own link; ⛔ a second text; quiet hours; a replacement texted in the same run; R6 on the erased sentinel;
    a decrypt throw ⇒ transient ⛔ replaced; `name_too_long`; ⛔ new event; ids-only alarms), and the R8 leg.
  - **Task 5** — the by-link route (`logLevel: 'warn'`, `readRateMax` per member, the `:code` a plain string) + handler + contract +
    `byLink(code)`; 5 route legs (200 incl. submitted, the 404 × 6 identical, 401, 429, the `logStream` proof on 200 / 404 / an injected 500
    — with a TEETH leg showing the same capture DOES log the URL on a route without the override); mobile `PeerRequestSlot` (one by-link
    call gated on the session AND a code, `retry: false`, `staleTime: Infinity`, in memory only; the pure `peerRequestSlotView`; a failure ⇒
    `PeerRequestNotOpenable`; Back dismisses the code; the eslint-disable gone; the 6.27a route-map scan updated 2 → 3 queries); AC7's live
    API test on the real writers (invisible before and while `attempting`, listed with "asked on" = the send date after). Records: Row 27
    (f) annotated (dated); BF33's two records CHECKED (both exist — ⛔ written); deferred-work — two items Closed, W3 NARROWED, a new console
    item, the BF24 Panel FYI under its own "owed to the Trustee Panel" heading.
  - **Validation:** `DATABASE_URL=:5433 pnpm ci:local` — 35/36 in one run (every static gate, `test (unit)`, `integration-tests`,
    `dlt-typed-variables`, `domain-invariants`, `access-wrapper` green); the one red job was `friction-budget` (AC-4: the mobile slot
    changed with ⛔ declaration) — fixed by the Story 6.27c disposition block in `friction-budget.md`, committed, and the gate re-run
    alone: ✓ passed. 0166 is applied to :5432 and :5433 at the file's hash.
  - **2026-10-17 — review continuation (F1–F6).** ✅ Resolved review finding [P1]: F1 — the by-link code in a query-failure log. ✅ Resolved
    review finding [P2]: F2 — the 20:00 IST cutoff checked only at job entry. ✅ Resolved review finding [P2]: F3 — a fresh lease stamped with
    the run-start clock. ✅ Resolved review finding [P2]: F4 — a dismissed link suppressing the next on the mounted route. ✅ Resolved review
    finding [P2]: F5 — held claims starving the bounded sweep. ✅ Resolved review finding [P2]: F6 — an origin whose link exceeds the url
    slot. Tests: 1 API leg (F1), 5 live jobs legs + 1 hold case (F2 ×2, F3, F5 ×2, F6), 4 pure jobs legs + 2 registry legs (F6), a new
    jsdom render test of the REAL slot (F4, 3 legs); each new leg red on the unfixed code. The fix diff adversarially reviewed: 3 LOW
    fixed, 3 residuals recorded in `deferred-work.md` (⛔ closed). ⚠ Recorded: a ping begun but ⛔ handed off when 20:00 passes is re-claimed
    at 09:00 as attempt 2 — truthfully ⛔ sent, but on that re-claim a failed re-check reads "may have sent" and is ⛔ replaced.
    ⭐ WIDENED by review round 2 (D1 (a), P18): the same for a re-claim after a `decrypt_failed:tier1` / `hash_failed:tier1` transient,
    and after P6's lease lapse before the handoff.
    `DATABASE_URL=:5433 pnpm ci:local` on the final tree: **36/36 green in one run** (⛔ migration in this continuation).
  - ⚠ **Go-live, ⛔ merge** ([[project_not_in_production_merge_is_not_golive]]): as built the sweep HOLDS every Pariwar today — the live
    `peer_mesh.v4` carries two `'pending'` questions (Row 27 (f)) and the template ids are unset (Row 27 closes on all eight). Nothing is texted
    until then.

### File List

**New**
- `packages/domain/migrations/0166_peer-mesh-request-sending.sql`
- `packages/domain/src/claim/peer-mesh-request.ts`
- `packages/domain/tests/claim/_peer-mesh-request-details.ts`
- `packages/domain/tests/claim/peer-mesh-request-detail.test.ts`
- `packages/domain/tests/integration/claim/peer-mesh-request.spec.ts`
- `packages/domain/tests/integration/claim/peer-mesh-request-concurrency.spec.ts`
- `apps/jobs/src/scheduler/peer-mesh-sms-templates.ts`
- `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`
- `apps/jobs/tests/peer-mesh-sms-templates.test.ts`
- `apps/jobs/tests/claim-peer-mesh-requests.test.ts`
- `apps/jobs/tests/claim-peer-mesh-requests-live.test.ts`
- `apps/api/tests/integration/claims/peer-request-by-link.spec.ts`
- `apps/api/tests/integration/claims/peer-request-after-send.spec.ts`
- `apps/mobile/tests/unit/peer-request-link.test.ts`
- `apps/mobile/tests/unit/peer-request-slot-render.test.ts` (review F4)

**Modified**
- `packages/domain/migrations/meta/_journal.json` (idx 166)
- `packages/domain/src/schema/claim_peer_mesh_pings.ts`
- `packages/domain/src/claim/index.ts`
- `packages/domain/src/claim/peer-mesh-persist.ts` (R7)
- `packages/domain/src/member/anonymize.ts` (comment)
- `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`
- `packages/domain/tests/integration/rls/claim-peer-mesh-replies-policy-regression.spec.ts`
- `packages/contracts/src/claims/peer-request.ts`
- `packages/contracts/tests/app-links.test.ts`
- `packages/contracts/tests/claims-peer-request.test.ts`
- `packages/api-client/src/index.ts`
- `packages/api-client/tests/peer-request-client.test.ts`
- `packages/queue/src/index.ts`
- `packages/i18n/locales/en/claim.json`
- `packages/i18n/locales/hi/claim.json`
- `apps/jobs/src/boot.ts`
- `apps/jobs/src/claim-peer-mesh.ts` (R8)
- `apps/jobs/src/scheduler/staff-email-config.ts` (`resolveAppLinksOrigin`)
- `apps/jobs/tests/claim-peer-mesh.test.ts`
- `apps/jobs/src/scheduler/peer-mesh-sms-templates.ts`, `claim-peer-mesh-requests.ts`, their three tests and
  `apps/api/tests/integration/claims/peer-request-by-link.spec.ts`, `packages/domain/src/claim/peer-mesh-request.ts`,
  `apps/mobile/components/peer-request/PeerRequestSlot.tsx` — modified AGAIN by the review continuation (F1–F6)
- `apps/api/src/modules/claims/claims.peer-request.member.routes.ts`
- `apps/api/src/modules/claims/claims.peer-request.handlers.ts`
- `apps/mobile/components/peer-request/PeerRequestSlot.tsx`
- `apps/mobile/components/peer-request/peer-request-cache.ts`
- `apps/mobile/components/peer-request/usePeerRequestQueries.ts`
- `apps/mobile/lib/peer-request.ts`
- `apps/mobile/tests/unit/app-link-route-map.test.ts`
- `scripts/dlt-typed-variables/lib.ts` (`REGISTRY_FILES`)
- `docs/launch-gate-inventory/dlt-template-requests-6-19.md`
- `docs/launch-gate-inventory/inventory-roster.md` (Row 27 (f) annotation)
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `friction-budget.md` (the Story 6.27c disposition)
- `_bmad-output/implementation-artifacts/6-27c-peer-mesh-sending-texts-and-links.md`
- `.decision-log.md` (`2026-10-16-343` — R5; Task 0.2, committed alone in `ccca9f5f`)
- review round 2 (2026-10-17) modified AGAIN: `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`, `peer-mesh-sms-templates.ts` (a
  comment), their live and pure tests; `packages/domain/src/claim/peer-mesh-request.ts` (P11), its live spec and the policy spec;
  `packages/api-client/src/index.ts` (`byLink`'s `opts.signal`); `apps/api/tests/integration/claims/peer-request-by-link.spec.ts`,
  `peer-request-after-send.spec.ts`; `apps/mobile/components/peer-request/usePeerRequestQueries.ts`, `tests/unit/peer-request-link.test.ts`,
  `app-link-route-map.test.ts`; `packages/i18n/locales/{en,hi}/claim.json` (the `$comment` only); the DLT sheet; `friction-budget.md`;
  `deferred-work.md`

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-17 | 3.7 | Adversarial review of the applied round-2 patches (code; tests + records): ⛔ HIGH; D3 (BigDev ⇒ `2026-10-17-344`, committed alone `c7d2f9ca` — the Hindi's lineage, PM3's clause superseded); follow-ups applied (the locale JSDoc, an unreadable Pariwar's rows parked + the SQLSTATE, P8's rationale, `@throws` / header, the R5 trigger's honesty, P13's cross-Pariwar leg rebuilt, fresh fixture link codes, the records); `ci:local` on `7f98fbfb` 35/36 (admin jsdom under load; alone 75/75). |
| 2026-10-17 | 3.6 | Code review ROUND 2 — the whole branch, 4 chunks × 3 layers (12): 2 decisions (BigDev: D1 (a) — R5 kept, its residual widened + pinned ⇒ P18; D2 (a) — F4's reset accepted ⇒ W9), 18 patches applied (P1 a scope-wide final stops the run; P4 the by-link read bounded; P5–P8, P11; tests P2 / P3 / P9 / P10 / P12–P14; records P15–P18); the fix diff adversarially reviewed (⛔ HIGH; 1 MED — P1's hold is not seen by the sweep for three classes ⇒ W10; LOWs fixed: P6's margin for the core's reads + send, P7's missing passport a hold again, the P6 path in the widened residual, the segment range, the partial-provisioning sentence, the test's forced-bytes cleanup), 10 deferred (W1–W10), 34 dismissed. |
| 2026-10-17 | 3.5 | Addressed code review findings — 6 items resolved (F1 P1; F2–F6 P2): the sanitised by-link read error, the send hours and the lease re-read per ping, the slot's per-link dismissal, held claims off the sweep's bound, the link-length hold; fix diff adversarially reviewed (3 LOW fixed, 3 residuals to `deferred-work.md`). Status → review. |
| 2026-10-17 | 3.4a | Code review round 1 recorded (`a1256ead`): F1–F6 as action items; status → in-progress. |
| 2026-10-17 | 3.4 | `bmad-dev-story`: Tasks 0.3–5.5 implemented — the registry + copy + sheet rows 13–14 (Task 1); 0166 (the grammar, the replacement link and trigger, R15) applied to :5432 and :5433 (Task 2); the domain send record + R7 (Task 3); the jobs child + 10:30 IST sweep + R8's hook + R12 (Task 4); the by-link route + mobile slot + AC7 + the records (Task 5). Status → review. |
| 2026-10-16 | 3.3 | Task 0.1 / 0.2 DONE: BigDev accepted R5 (⛔ replace a re-claimed `no_target`); recorded as `2026-10-16-343`, committed alone (`ccca9f5f`); AC1 met. Task 0.3 (the drift check) stays the dev's first step. |
| 2026-10-16 | 3.2 | Fresh-context validate round 2 (⛔ HIGH; the regex proven in node AND a Postgres ARE, every stored value covered, every fixture passes, R15 keeps every existing leg green): M1 — a re-claimed NAME fault keeps `no_target:name_<reason>` + the `-298` alarm (`-298` A), `recheck_name_unavailable` dropped; L1 — the replacement trigger also requires `attempt_count = 1` (R5's backstop); L2 — R6's finalise in the ORDER sentence; L3 — the deferred item closes with `claimed_*` rewritable by design; L4 — join the regex's wrapped lines; L5 — two stale AC labels. |
| 2026-10-16 | 3.1 | Fresh-context validate round 1 (≈ 70 cites spot-checked; ⛔ reading widens a ratified ruling): H1 — a decrypt / hash THROW is a transient, ⛔ `no_sendable_number` (a KMS outage would have dropped a neighbour and texted another — R6, Task 4.2); M1 — R15's `aging_since` arm applies only to an `attempting` OLD row (a literal 0155 clone refuses every begin); M2 — the stored grammar ENUMERATED in Task 3.1, the re-claimed-row failures stated (R1), the HOLD codes are alarm-only; M3 — R4's invented quote replaced by SW23 / `-340` / `-341`; M4 — `singletonKey` is a label, the CAS is the dedup; M5 — AC2b keeps its label (the pending-question hold every pointer cites), the accepted write is AC2c; L1–L7 — sheet cites by heading, 404s compared by status / code / message, the skip-then-insert order, `ON DELETE CASCADE`, the CHECK pre-check, the quiet-hours helper's home, the raw `:443`, BF24's Panel FYI. |
| 2026-10-16 | 3.0 | `bmad-create-story 6.27c` (asked as "6.26c"; BigDev chose 6.27c): RE-PINNED `fa2687ce` (⛔ an ancestor of `main`) → `cdc39004`; every predecessor `done`; status `backlog` → `ready-for-dev`. Four read-only checkers re-derived every pointer: BF1–BF34. Key changes: the replacement is BUILT here — `replaces_ping_id` + `UNIQUE` + a trigger in 0166 (⛔ existed; `-311` PM1), the responder check moves to the ping rows (a replacement's first answer is a 500 today — BF7), R5 (⛔ replace a re-claimed `no_target` — BigDev confirms); new detail labels `peer_filed_for_this_death` / `peer_not_eligible` over the ONE predicate (R4); `config:questionnaire_unavailable` (`resolveLiveVersion` can return null); the hook keys on "a selection with pings exists", ⛔ `outcome.advanced` (R8); the API logger writes the URL ⇒ the by-link route at `logLevel: 'warn'` + a PII spec (R13); the app-link origin check and the attempting-row backstops CLOSE two deferred items (R12, R15); W3 narrowed; Row 27 closes on EIGHT incl. (h) Row 31, and its two evidence lines already exist; the English text is UCS-2 too (BF24); the `$comment` marker is "NOT YET HUMAN-REVIEWED" (BF22); 0166 is the migration. The v2.x text is replaced (its history below). |
| 2026-10-13 | — | ANNOTATIONS by Story 6.27b's validate (`-328` / `-329`): v3 live; AC2b reads the LIVE version; AC7 writes exactly `'accepted'` (now AC2c). |
| 2026-10-12 | — | ANNOTATIONS by Story 6.34 Task 0.4 (TV11, `-322` C6 / C7, `-323` R1): waits for 6-34; 6.34's vocabulary; the Devanagari answer at Row 30 (d). |
| 2026-10-10 | 2.8 | `-311`: PM1 — a skipped neighbour is REPLACED at send time from the same group; PM2's in-app alert is 6.27a's. |
| 2026-10-10 | 2.7 | `-310`: CF1 and CF4 ratified. |
| 2026-10-10 | 2.6 | `-306`: predecessor row 6-36 added. |
| 2026-10-10 | 2.1–2.5 | Validate rounds 2–6: the migration + builder moved here; the ONE window predicate; the `'pending'`-question hold in sweep AND child; the `?c=` split; `locale_source`. |
| 2026-10-10 | 1.0 | Cut from Story 6.27 v2.0 (`-305` §2 items 1, 2, 4). |
