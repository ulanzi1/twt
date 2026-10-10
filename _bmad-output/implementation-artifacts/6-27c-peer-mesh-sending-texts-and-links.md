---
baseline_commit: fa2687ce
---

<!--
⭐ CUT 2026-10-10 from Story 6.27 v2.0 (`2026-10-10-305` §2 item 1). Pinned `fa2687ce` (code identical to `main` `5946e411`).
⚠ Before Task 1: `git diff --name-only fa2687ce..HEAD -- packages apps scripts infra`.

STATUS: `backlog` — flips to `ready-for-dev` when 6.27b AND 6.27d are `done` AND row `6-30-app-links-open-the-app-from-a-text` is `done`.
⭐ SENDING IS LAST on purpose: once a real text goes out, real answers arrive — the warnings and the wait (6.27b), the approvers' view (6.27b)
and the inspector's independence (6.27d) must already exist.
⭐ THE RECORD is 6.27a's file (rulings, invariants, F1–F38, PM1–PM25; Task 0 shared). This file BUILDS the PMs tagged **[c]**: **PM1–PM5**
(PM4's writers — the columns are 6.27a's), **PM14**, **PM15**, **PM16**'s DLT templates, **PM21** (b)–(f), **PM22**, and PM11's `?c=` half.
Where a summary below and 6.27a's text disagree, 6.27a's text is the record.
GLYPH REGISTER, ADDRESSING RULE: as 6.27a.
-->

# Story 6.27c: Each of the Five Is Texted Once — Naming the Member, With a Link to the Questions and the Helpline, in the Pariwar's Language, While an Answer Can Still Be Taken `[SURFACE]`

Status: backlog

> ⭐⭐ **WHAT THIS STORY IS.** The Panel ruled that each of the five neighbours is texted (`-303` Q1 A): *"We have been told that [member]
> has died. If you knew them, please answer a few short questions: [link] — or call the helpline [number]."* (`-304` Q6 A). This story
> sends that text — once ever per neighbour, through 6.24b's shared DLT send core, with 6.29's hold / park / give-up; ⛔ never at night;
> while the claim can still take an answer (`-305` §2 item 4); in the Pariwar's default language until row 6-35 lets members choose
> (`-305` §2 item 2 — CF1). The link opens 6.27a's questionnaire through row 6-30's plumbing. ⚠ Go-live waits on Row 27 (counsel, the
> privacy policy, the link live, the health-question basis, CF1–CF3).

## Story

As **the Trust** —
I want **each of the five neighbours texted once, with a link straight to the questions and the helpline number**,
so that **the check with neighbours actually reaches people — and ⛔ never says more than the Panel ruled, ⛔ never at night, and ⛔ never
after the claim can no longer take an answer.**

## The rulings this part builds (from 6.27a's table)
`-303` Q1 A (the text, the five; the 48-hour WhatsApp reminder is row 6-31 — ⛔ not built here) · `-303`'s language rider, narrowed for a time by
`-305` §2 item 2 (⚠ CF1) · `-304` Q6 A (*"a few short questions"*) · `-305` §2 item 4 (the text while an answer can still be taken) · `-295`
RB4 / RB5 / RB11 / RB12 / RB16 · `-302` RN2–RN8 · `-255` F7 (the cost line). **Policy meaning:** ⛔ no predicate (6.27a's section).

## The decisions this part builds (6.27a is the record)
- **PM1** the exclusions (⛔ never replaced; the row-6-22 residual) · **PM2** the channel and registry · **PM3** the words (⛔ no "TWT:"; ⛔ never the
  `-303` block's Hindi; typed variables; `name_too_long`) · **PM4** the writers (the CAS finalise, the transient note, the `detail` builder
  asserted) over 6.27a's columns · **PM5** the hook (one child per CLAIM, fan-out, also on the no-op branch), the sweep, quiet hours, the
  locked re-check (claim → ping; the answer window) · **PM14** ⛔ no new events · **PM15** ids-only alarms · **PM16** DLT templates 13 / 14
  (typed), the dotted-key defect recorded · **PM21** (b)–(f): the link built by 6.30's `buildAppLinkUrl`, `APP_LINKS_BASE_URL` READ AT BOOT
  here and validated each run by 6.30's `resolveHttpsOrigin` (a hold on invalid), the `?c=` read in 6.30's shell, the by-link resolver
  (404 ×3 indistinguishable), ⛔ never the code in any log · **PM22** the Pariwar's `locale_default` (the boundary with row 6-35).

## Acceptance Criteria

1. **AC1 — ⛔ no code before 6.27a's shared Task 0.4 author-commit**, and 6.27b, 6.27d and row 6-30 `done`.
2. **AC2 — each of the five is texted once:** when the SELECT worker commits (or on its no-op branch), ONE child per claim is enqueued and
   fans out per ping; each send, under the claim → ping locks, re-checks that the claim is in `CLAIM_REVIEW_WINDOW_STATES` and PM1, then
   (after COMMIT) decrypts, normalises, hashes and sends through `sendClaimDltSms` with the template of the Pariwar's `locale_default`,
   rendering EXACTLY the registered text (the mode-resolved name, the link, the helpline); `link_code` is written once at begin; the ping row
   records 0155's vocabulary; a re-run ⛔ never sends again; outside 09:00–20:00 IST ⇒ deferred to 09:00 IST.
3. **AC3 — ⛔ no text once the claim can no longer take an answer:** a claim in `state_trustee_approved` or refused / closed ⇒ `skipped_superseded`;
   a claim in `verifier_approved` / `reversed` / `state_trustee_freeze` IS texted (the answer window — `-305` §2 item 4).
4. **AC4 — a held config uses up ⛔ nothing** (the template id of a needed locale, the helpline, the gateway, or an invalid
   `APP_LINKS_BASE_URL`): ⛔ no ping is begun; one ids-only alarm per run; a stalled `attempting` row in a held scope is PARKED and given up
   only after three IST days of UN-parked time (RN2 / RN3); once set, every request still due is sent.
5. **AC5 — the exclusions:** a peer ⛔ not active, reported deceased, or with ⛔ no sendable number ⇒ `no_target` with its fixed detail and
   ⛔ no alarm; ⛔ no replacement; the selection unchanged; a name over the `{#alphanumeric#}` limit ⇒ `no_target:name_too_long` (a test).
6. **AC6 — the link:** `{link}` = `<origin>/peer-request?c=<code>` from 6.30's builder; navigating to `/peer-request?c=<code>` in the app
   (logged in, and logged out → login → back) opens 6.27a's questionnaire for the SESSION member's own request; the resolver answers 404
   for an unknown code, another member's code and another Pariwar's code alike; a closed request shows *"no longer open"*; the code is ⛔
   never in a log, alarm, audit row or `detail`. ⚠ A REAL `https://` link opening the app on a device is Row 29 (e) (6.30) — ⛔ not this story's.
7. **AC7 — the member surface lights up:** a ping with `send_outcome = 'accepted'` makes 6.27a's card and list show that request.
8. **AC8 — the records:** DLT templates 13 / 14 in the sheet with the exact typed registered text (proved by the lockstep test with the real
   `t()`); Row 27's evidence lines; the epics.md annotation of Story 6.6; the row-6-22 pointer; `pnpm ci:local` green.

## Tasks / Subtasks

- [ ] **Task 1 — copy and registry (AC2, AC8).** `peer_mesh_sms.request` en + hi + `$comment` in `claim.json`; `peer-mesh-sms-templates.ts`
      (typed variables); the lockstep test ([[feedback_stub_must_call_not_transcribe]]); DLT sheet templates 13 / 14.
- [ ] **Task 2 — the domain send record (AC2–AC5).** NEW `packages/domain/src/claim/peer-mesh-request.ts` (cloned in SHAPE from
      `suspicion-notice.ts`): begin under claim → ping locks with the window and PM1 checks; the CAS finalise; the transient note; the
      `detail` builder (6.27a's) asserted; `listStalledPeerMeshRequestScopes`, `parkHeldPeerMeshRequests`, the give-up by `aging_since`;
      returns ciphertext as stored, ⛔ never decrypts; the decrypt-fence arm in the SAME commit.
- [ ] **Task 3 — the jobs child + sweep (AC2–AC4).** NEW `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` (child per claim + fan-out +
      daily sweep + registration; queue names in `packages/queue/src/index.ts`); the injected `enqueuePeerMeshRequestSend` in
      `claim-peer-mesh.ts` (also on the no-op branch) + boot wiring beside the shepherd hook (`boot.ts:483-505`); `APP_LINKS_BASE_URL` read at
      boot, passed as a dep, validated each run (6.30's `resolveHttpsOrigin`); the locale read (Pariwar `locale_default`) and the name read
      OUTSIDE the claiming transaction; quiet hours; decrypt → `normalizeMobile` → `correctionNumberHash` after COMMIT; ids-only alarms; live
      tests (hold → park → resume; once-ever; the begin race on two connections).
- [ ] **Task 4 — the link (AC6, AC7).** The by-link resolver route (in 6.27a's member routes file; bounded; `perMemberKey`); the shell's
      `?c=` handling wired to 6.27a's questionnaire; route tests (404 ×3); the `link_code` written once (a test) and absent from logs.
- [ ] **Task 5 — records and close (AC8).** Row 27 evidence; the row-6-22 pointer; Story 6.6's epics annotation; Change Log + File List;
      `pnpm ci:local` green.

## Dev Notes
- **Traps** (6.27a's list applies): 2 (the ruled words only), 8 (⛔ never the selection), 9 (⛔ no KMS under a lock), 10 (the erased sentinel), 11 (raw
  gateway codes), 13 (claim → ping), 17 (leave room for row 6-31), 19 (⛔ never the `-303` block's Hindi).
- ⚠ **Row 6-35** will change ONE read (the locale) to *member's choice, else the Pariwar's default* — keep it a single function.
- ⚠ **Row 6-34** retags every SMS template with typed variables; these two are registered typed from the start — keep them consistent with it.
- ⚠ **Row 26 (`jobs-db-role`)** — the production jobs login holds ⛔ no privileges on claim tables; the new sweep inherits it (recorded).
- **Previous story:** 6.24b (the send core, the sibling registry), 6.29 (the parity bar — hold / park / give-up, the CHECKs, the trigger).
- **References:** 6.27a's file (PM1–PM5, PM14–PM16, PM21, PM22, F23–F29, F36); 6.30's file (AL2, AL5, AL6, AL16); `-303`, `-304`, `-305`.

## Dev Agent Record
### Agent Model Used
### Completion Notes List
- 2026-10-10 — cut from Story 6.27 v2.0 (`-305`). ⛔ No code.
### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-10 | 1.0 | Cut from Story 6.27 v2.0 (`2026-10-10-305` §2 items 1, 2, 4): PM1–PM5, PM14–PM16 (templates), PM21 (b)–(f), PM22, PM11's `?c=` half. |
