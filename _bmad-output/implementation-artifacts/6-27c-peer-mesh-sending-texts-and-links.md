---
baseline_commit: fa2687ce
---

<!--
⭐ CUT 2026-10-10 from Story 6.27 v2.0 (`2026-10-10-305` §2 item 1). Pinned `fa2687ce` (code identical to `main` `5946e411`).
⚠ Before Task 1: `git diff --name-only fa2687ce..HEAD -- packages apps scripts infra`.

STATUS: `backlog` — flips to `ready-for-dev` when 6.27b AND 6.27d are `done` AND row `6-30-app-links-open-the-app-from-a-text` is `done`. ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, `-322` C6) AND row 6-34 is done.
⭐ (2026-10-14 annotation — Story 6.36a Task 0.4, `-330` SW1) row `6-36-peer-mesh-school-wise-selection` is now the LAST of four parts (6-36a,
6-36b, 6-36c, 6-36) — waiting for row 6-36 waits for all four.
⭐ SENDING IS LAST on purpose: once a real text goes out, real answers arrive — the warnings and the wait (6.27b), the approvers' view (6.27b)
and the inspector's independence (6.27d) must already exist.
⭐ THE RECORD is 6.27a's file (rulings, invariants, F1–F41, PM1–PM25; Task 0 shared). This file BUILDS the PMs tagged **[c]**: **PM1–PM5**
(PM4's `detail` GRAMMAR CHECK, the ONE builder and the writers — in 6.27c's OWN small migration; the columns and structural CHECKs are
6.27a's), **PM14**, **PM15**, **PM16**'s DLT templates, **PM21** (b)–(f), **PM22**, and PM11's `?c=` half.
Where a summary below and 6.27a's text disagree, 6.27a's text is the record.
GLYPH REGISTER, ADDRESSING RULE: as 6.27a.
-->

# Story 6.27c: Each of the Five Is Texted Once — Naming the Member, With a Link to the Questions and the Helpline, in the Pariwar's Language, While an Answer Can Still Be Taken `[SURFACE]`

Status: backlog

> ⚠ **PREDECESSORS (`2026-10-10-306`):** 6.27b, 6.27d, row `6-30` AND row `6-36-peer-mesh-school-wise-selection` all `done` — the five
> are chosen from the deceased member's WORKPLACE (school or office; and the previous one after a transfer within 90 days), otherwise the
> people the member named and who accepted (`-307`), ⛔ never the district; fewer than five means fewer texts, and none means ⛔ no text
> (the inspection carries the claim; the inspector collects the head's letter). ✅ `-310` CF4 A.

> ⭐⭐ **WHAT THIS STORY IS.** The Panel ruled that each of the five neighbours is texted (`-303` Q1 A): *"We have been told that [member]
> has died. If you knew them, please answer a few short questions: [link] — or call the helpline [number]."* (`-304` Q6 A). This story
> sends that text — once ever per neighbour, through 6.24b's shared DLT send core, with 6.29's hold / park / give-up; ⛔ never at night;
> while the claim can still take an answer (`-305` §2 item 4); in the Pariwar's default language until row 6-35 lets members choose
> (`-305` §2 item 2 — CF1). The link opens 6.27a's questionnaire through row 6-30's plumbing. ⭐ (2026-10-13 annotation — Story 6.27b validate, `2026-10-13-329` decision 3: the LIVE questionnaire
> is then `peer_mesh.v3` — v2 with the call-back question reworded *"May the Admin phone you about this?"* (`-328` Q1 C) under a new copy key;
> so the FIRST real reply pins v3 — ⛔ no production reply can ever pin v2. ⛔ No change to the TEXT this story sends.) ⚠ Go-live waits on Row 27 (counsel, the
> privacy policy, the link live, the health-question basis — the TEXTS themselves wait for it, ⛔ no texted neighbour sees a ruled question skipped — CF1–CF3).

## Story

As **the Trust** —
I want **each of the five neighbours texted once, with a link straight to the questions and the helpline number**,
so that **the check with neighbours actually reaches people — and ⛔ never says more than the Panel ruled, ⛔ never at night, and ⛔ never
after the claim can no longer take an answer.**

## The rulings this part builds (from 6.27a's table)
`-303` Q1 A (the text, the five; the 48-hour WhatsApp reminder is row 6-31 — ⛔ not built here) · `-303`'s language rider, narrowed for a time by
`-305` §2 item 2 (✅ `-310` CF1 A) · `-304` Q6 A (*"a few short questions"*) · `-305` §2 item 4 (the text while an answer can still be taken) · `-295`
RB4 / RB5 / RB11 / RB12 / RB16 · `-302` RN2–RN8 · `-255` F7 (the cost line). **Policy meaning:** ⛔ no predicate (6.27a's section).

## The decisions this part builds (6.27a is the record)
- **PM1** the exclusions (⛔ never replaced; the row-6-22 residual) · **PM2** the channel and registry · **PM3** the words (⛔ no "TWT:"; ⛔ never the
  `-303` block's Hindi; typed variables; `name_too_long`) · **PM4** the `detail` grammar CHECK
  (`PEER_MESH_REQUEST_DETAIL_PATTERN` — an ENUMERATED alternation, 0155's form: `no_target:(peer_not_active|peer_reported_deceased|
  no_sendable_number|name_too_long|name_<reason>)`, `superseded:claim_decided`, `config:…`, `exhausted:…`, `decrypt_failed:…`,
  `hash_failed:…`, the sanitised gateway families — enumerated in full at build, each pinned to the builder by a test), the ONE builder, and
  the writers (the CAS begin from `send_outcome IS NULL`, the CAS finalise, the transient note — as 6.27a's PM4 records them) · **PM5** the hook (one child per CLAIM, fan-out, also on the no-op branch), the sweep, quiet hours, the
  locked re-check (claim → ping; PM8's ANSWER WINDOW incl. `state_trustee_approved` under a live R9 routing) · **PM14** ⛔ no new events · **PM15** ids-only alarms · **PM16** DLT templates 13 / 14
  (typed), the dotted-key defect recorded · **PM21** (b)–(f): the link built by 6.30's `buildAppLinkUrl`, `APP_LINKS_BASE_URL` READ AT BOOT
  here and validated each run by 6.30's `resolveHttpsOrigin` (a hold on invalid), the parsed `c` (6.30's shell parses it — `parseAppLinkCode`)
  wired to the by-link resolver (route + call; 404 for unknown / another member's / another Pariwar's / an UNTEXTED ping alike, reusing
  6.27a's not-openable state), ⛔ never the code in any log · **PM22** the Pariwar's `locale_default` (the boundary with row 6-35), recorded as `locale_source = 'pariwar_default'` on the ping;
  ⚠ an `en`-default Pariwar sends English texts that open Hindi screens (the app always renders `hi`) — moot for Bihar; row 6-35.

## Acceptance Criteria

1. **AC1 — ⛔ no code before 6.27a's shared Task 0.4 author-commit**, and 6.27b, 6.27d and row 6-30 `done`.
1b. **AC1b — 6.27c's migration:** the `detail` / `first_detail` grammar CHECK (enumerated) applied on :5432 AND :5433, proven from zero;
   every builder output passes it and a RAW gateway code is refused (a test) — 6.29 Trap 4.
2. **AC2 — each of the five is texted once:** when the SELECT worker commits (or on its no-op branch), ONE child per claim is enqueued and
   fans out per ping; each send, under the claim → ping locks, re-checks that the claim is in PM8's answer window — the ONE predicate `isClaimInAnswerWindow`
   (6.27a Task 1; incl. a live R9 routing; ⛔ never re-composed) — and PM1, then
   (after COMMIT) decrypts, normalises, hashes and sends through `sendClaimDltSms` with the template of the Pariwar's `locale_default`,
   rendering EXACTLY the registered text (the mode-resolved name, the link, the helpline); `link_code` is written once at begin; the ping row
   records 0155's vocabulary; a re-run ⛔ never sends again; outside 09:00–20:00 IST ⇒ deferred to 09:00 IST.
2b. **AC2b — ⛔ no text while a question of the live version is `'pending'`** (6.27a PM23 (a), rounds 4–5): a `'pending'` question in
   `resolveLiveVersion('peer_mesh', pariwarId)` is a config GAP checked by BOTH halves of the RB12 shape — the SWEEP (once per Pariwar per
   run ⇒ the scope HELD) AND the CHILD's begin path (the race guard — a hook-enqueued child ⇒ `held_config`, ⛔ no ping begun); ⛔ no slot
   used up; ONE ids-only alarm `config:counsel_basis_pending` per sweep run, and the child's held return alarms ids-only (as the suspicion-notice child does); a stalled `attempting` row in that scope is PARKED as any held scope (AC4);
   tests: a hook-enqueued child for a pending Pariwar begins ⛔ no ping; the sweep holds the scope; once v2's basis is
   recorded (Row 27 (f)), every request still due is sent. ⭐ (2026-10-13 annotation — Story 6.27b validate, `2026-10-13-329` Consequence 4: *"v2's basis"* means the LIVE version's — `peer_mesh.v3`
   once 6.27b ships (v2 becomes historical; v3 keeps v2's two `'pending'` health questions and their `counselBasis` unchanged, so this hold
   applies to v3 as written; the check reads `resolveLiveVersion`, ⛔ never a version name)). ⇒ a neighbour is ⛔ never texted into a questionnaire with a ruled question hidden.
3. **AC3 — ⛔ no text once the claim can no longer take an answer:** a claim in `state_trustee_approved` WITHOUT a live R9 routing, or
   refused / closed ⇒ `skipped_superseded`; a claim in `verifier_approved` / `reversed` / `state_trustee_freeze`, or in
   `state_trustee_approved` WITH a live R9 routing, IS texted (PM8's answer window — `-305` §2 item 4; the `-283` A1 precedent).
4. **AC4 — a held config uses up ⛔ nothing** (the template id of a needed locale, the helpline, the gateway, an invalid
   `APP_LINKS_BASE_URL`, or a `'pending'` question — AC2b): ⛔ no ping is begun; one ids-only alarm per run; a stalled `attempting` row in a held scope is PARKED and given up
   only after three IST days of UN-parked time (RN2 / RN3); once set, every request still due is sent.
5. **AC5 — the exclusions:** a peer ⛔ not active, reported deceased, or with ⛔ no sendable number ⇒ `no_target` with its fixed detail and
   ⛔ no alarm; ⛔ no replacement; the selection unchanged; a name over the `{#alphanumeric#}` limit (⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, TV11: ⚠ on STPL / SmartPing the text keeps `{#var#}`; the tag names here are the slot TYPES — 6.34 TV1 / TV11) ⇒ `no_target:name_too_long` (a test; an author reading recorded at Task 0.4 — it narrows `-303`
   Q1 A at the edge; FYI in the confirm note; the provider's Devanagari answer is a Row 27 evidence line ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, `-322` C7: the answer is recorded ONCE at Row 30 (d) (`-322` C7); Row 27's evidence line POINTS to it (a refusal goes back to the Panel))).
   ⭐ (2026-10-14 annotation — Story 6.36a Task 0.4, `-330` SW23 / SW27 and `-311` PM1: *"⛔ no replacement; the selection unchanged"* is
   STALE — a send-time skip IS replaced by the next person in the SAME group's `ranked_member_ids` (PM1 (ii)), the replacement ping
   inheriting the selection's `source`; the re-check reuses row 6-36's ONE eligibility predicate PLUS PM1's decrypt-time
   `no_sendable_number`.)
5b. **AC5b — PM14 / PM15:** ⛔ no new event is emitted by any send path (a test counts `claim.peer_mesh_*` events before / after); a
   re-claimed `attempting` row that fails its re-check finishes `error` with an ids-only alarm (`-297` §2), and a `no_target` on a re-claimed
   row alarms *"may have sent"* (`-298`) — each a test.
6. **AC6 — the link:** `{link}` = `<origin>/peer-request?c=<code>` from 6.30's builder; navigating to `/peer-request?c=<code>` in the app
   (logged in, and logged out → login → back) opens 6.27a's questionnaire for the SESSION member's own request; the resolver answers 404
   for an unknown code, another member's code, another Pariwar's code and an UNTEXTED ping alike (6.27a's not-openable state); a closed request shows *"no longer open"*; the code is ⛔
   never in a log, alarm, audit row or `detail`. ⚠ A REAL `https://` link opening the app on a device is Row 29 (e) (6.30) — ⛔ not this story's.
7. **AC7 — the member surface lights up:** a ping with `send_outcome = 'accepted'` makes 6.27a's card and list show that request.
   ⭐ (2026-10-13 annotation — Story 6.27b validate, `2026-10-13-329` decision 4 / 6.27b Task 3.1 (a) rule 1: the staff call-back number is shown ONLY for a ping whose `send_outcome = 'accepted'` (⛔ never for an untexted one) —
   a successful send MUST write exactly `'accepted'` (⛔ never a new "sent" value), or the Super Admin's view and every *"Yes"* go dark.)
8. **AC8 — the records:** DLT templates 13 / 14 in the sheet with the exact typed registered text (proved by the lockstep test with the real
   `t()`; 6.27c types them, row 6-34 verifies them ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, TV11: ⚠ on STPL / SmartPing the text keeps `{#var#}`; the tag names here are the slot TYPES — 6.34 TV1 / TV11; 6.34 does ⛔ hand-verify them — 6.27c runs the shape check in its own registry test)); Row 27's evidence lines (incl. the provider's Devanagari answer ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, `-322` C7: the answer is recorded ONCE at Row 30 (d) (`-322` C7); Row 27's evidence line POINTS to it (a refusal goes back to the Panel))); a CHECK that 6.27a's
   epics.md annotation of Story 6.6 and its row-6-22 pointer exist (6.27a OWNS both — ⛔ never written twice); `pnpm ci:local` green.

## Tasks / Subtasks

- [ ] **Task 1 — copy and registry (AC2, AC8).** `peer_mesh_sms.request` en + hi + `$comment` in `claim.json`; `peer-mesh-sms-templates.ts`
      (typed variables); the lockstep test ([[feedback_stub_must_call_not_transcribe]]); DLT sheet templates 13 / 14. ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, TV11 / `-322` C1 / `-323` R1: ⚠ on STPL / SmartPing the text keeps `{#var#}`; the tag names here are the slot TYPES — 6.34 TV1 / TV11) `{#var#}` + `slots` from `@twt/channels` `dlt-variables.ts`; add the file to `REGISTRY_FILES`; raise the `helplineNotCallbackNumber` warning like the four callers (`-322` C1 / `-323` R1); the sheet rows 13 / 14 carry their OWN three-variable justification line.
- [ ] **Task 1b — 6.27c's migration (AC1b).** Next free number at build: the `detail` / `first_detail` grammar CHECK on
      `claim_peer_mesh_pings` (the ENUMERATED `PEER_MESH_REQUEST_DETAIL_PATTERN`); applied to :5432 AND :5433; a policy-spec leg per family.
- [ ] **Task 2 — the domain send record (AC2–AC5b).** NEW `packages/domain/src/claim/peer-mesh-request.ts` (cloned in SHAPE from
      `suspicion-notice.ts`): begin = the CAS from `send_outcome IS NULL` under claim → ping locks with the answer-window and PM1 checks; the
      CAS finalise; the transient note; the ONE `detail` builder (built HERE, pure, mirroring the CHECK) asserted by every writer; `listStalledPeerMeshRequestScopes`, `parkHeldPeerMeshRequests`, the give-up by `aging_since`;
      returns ciphertext as stored, ⛔ never decrypts; the decrypt-fence arm in the SAME commit.
- [ ] **Task 3 — the jobs child + sweep (AC2–AC4, AC2b — the `'pending'`-question hold).** NEW `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` (child per claim + fan-out +
      daily sweep + registration; queue names in `packages/queue/src/index.ts`); the sweep's window filter uses 6.27a's `answerWindowSql`; the
      `'pending'`-question gap in BOTH the sweep and the child's begin path (AC2b); the injected `enqueuePeerMeshRequestSend` in
      `claim-peer-mesh.ts` (also on the no-op branch) + boot wiring beside the shepherd hook (`boot.ts:483-505`); `APP_LINKS_BASE_URL` read at
      boot, passed as a dep, validated each run (6.30's `resolveHttpsOrigin`); the locale read (Pariwar `locale_default`) and the name read
      OUTSIDE the claiming transaction; quiet hours; decrypt → `normalizeMobile` → `correctionNumberHash` after COMMIT; ids-only alarms; live
      tests (hold → park → resume; once-ever; the begin race on two connections).
- [ ] **Task 4 — the link (AC6, AC7).** The by-link resolver route (in 6.27a's member routes file; bounded; `perMemberKey`; the
      untexted-ping 404); 6.30's shell's PARSED `c` (`parseAppLinkCode`) wired to the resolver call once the session has loaded, opening
      6.27a's questionnaire, its 404 reusing 6.27a's not-openable state; route tests (404 ×4 indistinguishable); the `link_code` written once
      (a test) and absent from logs.
- [ ] **Task 5 — records and close (AC8).** Row 27 evidence (the provider's Devanagari answer ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, `-322` C7: the answer is recorded ONCE at Row 30 (d) (`-322` C7); Row 27's evidence line POINTS to it (a refusal goes back to the Panel)); CHECK (⛔ never write) 6.27a's row-6-22
      pointer and Story 6.6 annotation; Change Log + File List; `pnpm ci:local` green.

## Dev Notes
- **Traps** (6.27a's list applies): 2 (the ruled words only), 8 (⛔ never the selection), 9 (⛔ no KMS under a lock), 10 (the erased sentinel), 11 (raw
  gateway codes), 13 (claim → ping), 17 (leave room for row 6-31), 19 (⛔ never the `-303` block's Hindi).
- ⚠ **Row 6-35** will change ONE read (the locale) to *member's choice, else the Pariwar's default* — keep it a single function.
- ⚠ **Row 6-34** retags every SMS template with typed variables; these two are registered typed from the start by 6.27c and VERIFIED by
  6-34 with every other — keep them consistent with it. ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, TV11 / `-322` C6: ⚠ on STPL / SmartPing the text keeps `{#var#}`; the tag names here are the slot TYPES — 6.34 TV1 / TV11; 6.27c WAITS for 6.34 — if it lands first anyway it STOPS and asks rather than re-creating 6.34's vocabulary.)
- ⚠ **Row 6-31's reminder** goes ONLY within PM8's answer window too (`-305` §2 item 4) — leave the predicate readable (6.27a Trap 17).
- ⭐ (2026-10-14 annotation — `-330` SW27 / 6.36a SF11) `recordPeerMeshResponse` refuses a responder outside `selection.selectedMemberIds`
  (`packages/domain/src/claim/peer-mesh-persist.ts:235-237`) — a replacement ping would be refused there; 6.27c moves that check to the
  ping rows.
- ⚠ **Row 26 (`jobs-db-role`)** — the production jobs login holds ⛔ no privileges on claim tables; the new sweep inherits it (recorded).
- **Previous story:** 6.24b (the send core, the sibling registry), 6.29 (the parity bar — hold / park / give-up, the CHECKs, the trigger).
- ⭐ **From 6.30 (dev, 2026-10-10):** the link code's shape is `APP_LINK_CODE_PATTERN` (`@twt/contracts` — `packages/contracts/src/app-links/`,
  `/^[A-Za-z0-9]{12}$/`) — the generator, the `link_code` CHECK / test and the resolver route consume it, ⛔ never a second pattern. The URL
  is `buildAppLinkUrl(origin, 'peerRequest', code)` where `origin = resolveHttpsOrigin(APP_LINKS_BASE_URL)` (`apps/jobs/src/scheduler/
  staff-email-config.ts`; `null` ⇒ hold `config:app_links_base_url_invalid`); `buildAppLinkUrl` THROWS on a non-bare origin or a malformed
  code. The shell's parsed code arrives as `PeerRequestSlot`'s `code` prop (`apps/mobile/components/peer-request/PeerRequestSlot.tsx` — a
  6.30 placeholder 6.27a may replace).
- **References:** 6.27a's file (PM1–PM5, PM14–PM16, PM21, PM22, F23–F29, F36); 6.30's file (AL2, AL5, AL6, AL16); `-303`, `-304`, `-305`.

## Dev Agent Record
### Agent Model Used
### Completion Notes List
- 2026-10-10 — cut from Story 6.27 v2.0 (`-305`). ⛔ No code.
### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-13 | — | ⭐ ANNOTATIONS by Story 6.27b's validate (`2026-10-13-328` Trustee-ratified; `2026-10-13-329` erratum — ⛔ no PM moved, ⛔ no word above changed): the header — the link opens questionnaire `peer_mesh.v3` (the call-back question reworded), so ⛔ no production reply pins v2; AC2b — *"v2's basis"* reads as the LIVE version's (v3 keeps the two pending health questions; the hold is unchanged); AC7 — a successful send writes exactly `'accepted'`, the value the staff call-back rules key on. ⛔ No change to the text sent, the window, the exclusions or the predecessors. |
| 2026-10-12 | — | ⭐ ANNOTATIONS by Story 6.34 Task 0.4 (TV11 / `2026-10-12-322` C6, C7 / `-323` R1 — ⛔ a PM moved, ⛔ a word above changed): the STATUS line gains *"AND row 6-34 is done"*; on STPL / SmartPing the text keeps `{#var#}` and the tag names are the slot TYPES; Task 1 uses 6.34's vocabulary, joins `REGISTRY_FILES` and raises the helpline warning; the Devanagari answer is recorded ONCE at Row 30 (d) and Row 27 POINTS to it (AC5, AC8, Task 5). |
| 2026-10-10 | 2.8 | `2026-10-10-311`: PM1 — a skipped neighbour is REPLACED at send time from the same group (6.27c builds the send-time replacement; row 6-36 the filter and ranking); PM2's in-app alert is 6.27a's. |
| 2026-10-10 | 2.7 | `2026-10-10-310`: CF1 and CF4 now ratified. |
| 2026-10-10 | 2.6 | `2026-10-10-306`: predecessor row 6-36 (school-wise selection) added. |
| 2026-10-10 | 2.5 | Round 6: header qualifier ("no texted neighbour"); AC2b's alarm wording (one per sweep run + the child's held return). |
| 2026-10-10 | 2.4 | Round 5: AC2b's pending-question gap is checked by BOTH the sweep and the child's begin path (the RB12 race guard — the hook-enqueued child is the main send path); AC4 lists it among held configs (parked as any held scope); Task 3 names `answerWindowSql` for the sweep. |
| 2026-10-10 | 2.3 | Round 4: AC2b — the sweep HOLDS while any question of the live questionnaire version is `'pending'` (6.27a PM23 (a)), so the ruled health questions are ⛔ never hidden from a texted neighbour; Task 3 carries it. |
| 2026-10-10 | 2.2 | Round-3 validate: the answer window is 6.27a's ONE extracted predicate `isClaimInAnswerWindow` (⛔ never re-composed); a skip at the locked re-check is the begin CAS from `send_outcome IS NULL` writing that outcome with `attempt_count = 1` (6.27a PM4). |
| 2026-10-10 | 2.1 | Round-2 validate: 6.27c now HAS a small migration — the ENUMERATED `detail` grammar CHECK and the ONE builder moved here from 6.27a (the vocabulary lives with its only writer); PM4's summary aligned with 6.27a's record (CAS begin / finalise, transient note); the answer window incl. `state_trustee_approved` under a live R9 routing (AC3); `name_too_long` / Devanagari recorded (AC5); AC5b for PM14 / PM15; the untexted-ping 404 on the resolver; the `?c=` split (6.30 parses, 6.27c wires); the 6.6 annotation and row-6-22 pointer OWNED by 6.27a (checked here); typed templates verified by 6-34; `locale_source`; the screen-vs-text language note; 6-31 within the window. |
| 2026-10-10 | 1.0 | Cut from Story 6.27 v2.0 (`2026-10-10-305` §2 items 1, 2, 4): PM1–PM5, PM14–PM16 (templates), PM21 (b)–(f), PM22, PM11's `?c=` half. |
