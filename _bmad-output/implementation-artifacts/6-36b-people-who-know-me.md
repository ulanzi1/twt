---
baseline_commit: 2581c514
---

<!--
⭐ CUT 2026-10-14 by `bmad-create-story 6.36` (SW1). ⭐ THE RECORD is 6.36a's file (`6-36a-member-workplace-and-posting-history.md` —
SF1–SF17, SW1–SW30, SC1–SC4, I1–I12, the shared Task 0). This file BUILDS **SW10–SW15** and **SW17** (SW16 (1): ⛔ no signup step — a
member is ⛔ not yet `active` while signing up; the home prompt is 6.36c's). Where a summary here and 6.36a's text disagree, 6.36a's text is the record.
⚠ Before Task 1: `git diff --name-only 2581c514..HEAD -- packages apps scripts infra` — re-read any cited file that moved.

STATUS: `backlog` — flips to `ready-for-dev` when 6.36a is `done` (its Task 0.2 author-commit is then in the tree).
GLYPH REGISTER, ADDRESSING RULE, LETTERS: as 6.36a.
-->

# Story 6.36b: People Who Know Me — Up to Three Members a Member Names, Found From Their Phone's Contacts, Each of Whom Accepts `[SURFACE]`

Status: backlog

> ⭐⭐ **WHAT THIS PART IS.** When ⛔ no colleague can be asked about a member's death, the Trust asks up to three members that member
> named while alive and who agreed (`-310` CF4 A (2)). This part lets a member name them: *"Find members in my contacts"* checks the
> phone's contacts against the member list, shows ONLY the matches, under the names the member saved, and keeps ⛔ no non-member's number
> (`-310` CF5 A); the named member answers *"[Name] has named you as someone who knows them. Do you know him/her?"* in the app. ⚠ Go-live
> waits for Row 31 (counsel's basis for sending contacts to the Trust — SW28 (a)) — ⛔ never a merge blocker.

## Story

As **a member** —
I want **to name up to three other members who know me — found quickly from my phone's contacts — and to say yes or no when someone names
me**,
so that **if no colleague of mine can be asked when I die, people who truly knew me are — and the Trust never keeps the numbers of people
who are not members.**

## Policy meaning (AI-10-1)

**This part introduces ⛔ no predicate that gates a member's access to a benefit.** It records who a member named and who accepted; ⛔ no
claim, contribution, pool or payment reads it. 6.36 reads the accepted people to choose who is ASKED about a death (a signal, ⛔ no gate —
`-263` FQ10). Checked against the Niyamavali: ⛔ no clause governs it.

## The rulings and decisions this part builds (6.36a is the record)

- `-310` CF5 A (Trustee-ratified) and `-309` items 1–5 (the flow, ⛔ no non-member's number kept or logged, the caps, the invite on the
  phone) · `-310` CF4 A (2) (*"up to three members the member themselves named … each of whom agreed when named"*) · `-307` §2 item 3 (iii)
  (the request's words) · `-309`'s note in BigDev's words, the Trust's name from config.
- **SW10** up to three live, same Pariwar, accepted ones count, removable, withdrawable, a 30-day lapse · **SW11** the contacts flow and
  what the server returns · **SW12** the limits and the KMS bound · **SW13** the fallback (iOS picker / Android typed number) · **SW14** what
  each side sees · **SW15** ⛔ no workplace suggestions (dropped) · **SW16 (1)** ⛔ no signup step · **SW17** the records, erasure and
  export.

## Acceptance Criteria

1. **AC0 — ⛔ no code before 6.36a is `done`** (6.36a's Task 0.2 author-commit is in the tree; any SW answer that changed SW10–SW17 is
   already applied to this file).
2. **AC1 — the migration** (the next free number at build): `member_known_people`, `member_daily_counters` and `pariwar_daily_counters`
   (Task 1); member FKs SINGLE-COLUMN (6.36a SF14); per-command RLS; applied on :5432 AND :5433, proven from zero; a policy-regression
   spec (incl. the guard's transitions and the timestamp CHECKs).
3. **AC2 — at most three live** (I6): live = `accepted`, or `asked` within 30 days of `asked_at`; a fourth ask is refused
   (`known_people.limit_reached`, 409) by the writer under the namer's lock AND by the DB backstop on INSERT (a test on two connections
   asking at once: exactly one wins the last slot; a test that a namer with three `asked` links can still have each ACCEPTED — an
   `asked → accepted` update is live → live and ⛔ never refused).
4. **AC3 — matching** (`POST /api/v1/member/known-people/contact-matches`, body `{ numbers: string[] }`, 1–1,000 entries, each ≤ 32
   characters): the server re-normalises each entry with `normalizeMobile` (an entry that does ⛔ not normalise simply does ⛔ not match),
   computes the member blind indexes OUTSIDE any transaction (≤ 8 KMS calls in flight per instance) through a batch path that writes ONE
   audit line for the request (`kms.compute_hmac`, the count, purpose `contact_match` — 6.36a SW12 / SF9), then in the caller's scope
   returns `{ matched: number[] }` — the POSITIONS of entries that are a member of the CALLER'S Pariwar who is `active`, has ⛔ no claim
   filed for their own death, and is ⛔ not the caller; ⛔ never an id, a name or a count beyond the positions; ⛔ nothing written except
   the counters; the 4th request in an IST day, more than 2,000 numbers in a rolling 30 days, or the Pariwar's 100,000 a day ⇒ 429
   `known_people.daily_limit` / `known_people.monthly_limit` / `known_people.busy` (atomic upserts — the `sms_rate_buckets` precedent,
   migration 0049); a list over 1,000 fails the schema ⇒ 400 `request.validation` (`apps/api/src/middleware/error-mapping/index.ts:158-167`)
   whose body carries ⛔ no submitted value (a test).
5. **AC4 — ⛔ no number anywhere** (I4): a behaviour test plants a run of known numbers in a match request and in an ask, then asserts
   none of their digits (10-digit or `+91` form) appear in the captured request logs, error logs, audit lines, alarms, any row of
   `member_known_people` / `member_daily_counters`, or any error body; a source fence over the known-people handler + domain files
   refuses a log / audit / alarm call that receives the `numbers` or `mobile` value (the `apps/jobs/tests/staff-email-identity-read-fence.test.ts`
   shape: strip comments, an exact allow-list, a positive control).
6. **AC5 — asking** (`POST /api/v1/member/known-people`, `{ mobile, foundBy: 'contacts' | 'picker' | 'typed' }`, `Idempotency-Key`):
   resolves the number as AC3 does; ⇒ 201 with the link; a second ask of the same live person ⇒ the same link (200, ⛔ no second row); a
   number that is ⛔ not an eligible member ⇒ 404 `known_people.not_a_member` (ONE code for not-a-member, erased, withdrawn,
   reported-dead and another Pariwar's — indistinguishable); oneself ⇒ 422 (a HANDLER refusal — a schema failure is 400); the 11th ask in
   an IST day ⇒ 429; a re-ask of a person whose last link with this namer ENDED without acceptance (declined, lapsed) or was withdrawn,
   before that link's `ended_at` + 60 days ⇒ 409 `known_people.cannot_ask_now` (6.36a SW10 — one rule); the number is ⛔ never stored.
7. **AC6 — the named member's request** appears in the app only, and only to an `active` member (a home card + a notice-strip item,
   `PeerRequestEntry`'s shape):
   *"[Name] has named you as someone who knows them. Do you know him/her?"* with the namer's registered name (the member-to-member name
   form already shown elsewhere in the member app — ⛔ no new form), and above the answers *"[Name] will see your answer."* (6.36a SW14);
   *"Yes, I know them"* ⇒ `accepted`; *"No"* ⇒ `declined`; a request
   past `asked_at` + 30 days (lapsed, whether or not the writer has recorded it yet) or already answered ⇒ 409 `known_people.request_closed`;
   a DECLINED or LAPSED request leaves the named member's list and card — an ACCEPTED one stays (it is where they can withdraw, AC8); ⛔ no SMS, push or WhatsApp is sent (a test asserts ⛔ no dispatcher call).
8. **AC7 — the member's list** (`GET /api/v1/member/known-people`): each live link as `asked` (⛔ no name — the app shows the name the member
   saved, kept only on the phone) or `accepted` (the registered name); `not_accepted` — at once after a decline or a withdrawal, at
   `asked_at` + 30 days after a lapse — for 30 days, then ⛔ not at all (6.36a SW14 — a decline is visible at once, accepted and recorded);
   an ACCEPTED person who has withdrawn from the Trust or had a claim filed for their death (⛔ never a late renewal) reads
   `unavailable` — ⛔ no name, ⛔ never why, the slot kept until the namer removes the row; an erased person's link has ended and shows ⛔
   nothing (⚠ so a vanished row tells the namer that person left the Trust — ⛔ never that they died; recorded, 6.36a SW14); the contract's
   label enum is `asked | accepted | not_accepted | unavailable`; `freeSlots`; remove (`POST …/:linkId/remove`, `Idempotency-Key`) ⇒ `removed`,
   the named member is ⛔ not told.
9. **AC8 — withdraw:** the named member can withdraw an accepted link (`POST …/requests/:linkId/withdraw`) ⇒ `withdrawn` with `ended_at`;
   the namer sees `not_accepted` (having seen *"Accepted"* before, the namer can tell it was a withdrawal — accepted, 6.36a SW14).
10. **AC9 — the app flow:** Life Events → *"People who know me"*: the list (AC7), *"Find members in my contacts"* (the note → the permission
    prompt → read numbers → normalise on the phone → AC3 → the matched contacts under their SAVED names, with a search box → tick up to
    `freeSlots` → AC5 for each; more than 1,000 mobiles ⇒ *"We checked 1,000 of your contacts"*), and below the matches *"Not members yet —
    invite"* (each a share sheet, ONE contact at a time, the member's
    own message — Apple 5.1.2(v)); permission declined or unavailable ⇒ iOS *"Choose a contact"* (the system picker), Android *"Type their
    mobile number"* (SW13); a 429 / 404 / 409 each shows its own plain message.
11. **AC10 — ONLY an `active` member may use it** (SW10): matching, asking and answering are refused for any other caller with ONE
    code (403 `known_people.not_available` — ⛔ never a signal of which state); ⛔ no signup step (SW16 (1)) — the wizard is unchanged by
    this part; the people screen is reached from Life Events and from 6.36c's home cards.
12. **AC11 — the permission set:** `expo-contacts` installed at the SDK-55 version (`npx expo install expo-contacts`); the config plugin
    `['expo-contacts', { contactsPermission: '<copy>' }]` (iOS `NSContactsUsageDescription` — the Trust's name ⛔ not hard-coded); Android
    `blockedPermissions` drops `WRITE_CONTACTS` (the plugin adds it — SF3); `apps/mobile/tests/fixtures/app-config-prototype.json` updated
    and `apps/mobile/scripts/check-app-config.mjs` green.
13. **AC12 — erasure and export** (SW17): `anonymizeMember` ERASES every live link where the member is namer or named (`state = 'erased'`,
    `ended_at` set, ⛔ not deleted); the rtbf pin enrols the new `.update(memberKnownPeople)`; the data export lists the member's named people and the members
    who named them.
14. **AC13 — copy:** keys in the `workplace` namespace (6.36a) or a new `known_people` namespace (registered, member-facing, parity green);
    BigDev's note words (`-309`) with the Trust's name from config; the request text (`-307`) in en + hi; a real-`t()` test.
15. **AC14 — records and close:** Row 31's (a) / (d) evidence lines name this part's flows; `friction-budget.md` gains the row for the
    contacts permission (`optional` — SF15); `pnpm ci:local` green.

## Tasks / Subtasks

- [ ] **Task 1 — the migration (AC1, AC2).**
  - [ ] 1.1 `member_known_people`: `link_id uuid pk`, `pariwar_id`, `namer_member_id`, `named_member_id` (each FK → `members(member_id)`,
        SINGLE-COLUMN — 6.36a SF14), `found_by text CHECK IN ('contacts','picker',
        'typed')`, `state text CHECK IN ('asked','accepted','declined','lapsed','removed','withdrawn','erased')`, `asked_at timestamptz
        default clock_timestamp()`, `responded_at`, `ended_at`; CHECK `namer_member_id <> named_member_id`; CHECK `state IN ('accepted',
        'declined', 'withdrawn') ⇒ responded_at IS NOT NULL` and `state IN ('declined','lapsed','removed','withdrawn','erased') ⇒ ended_at
        IS NOT NULL` (6.36 reads links AS OF a date); CHECK `state = 'lapsed' ⇒ ended_at = asked_at + interval '30 days'`; a partial UNIQUE `(pariwar_id, namer_member_id, named_member_id) WHERE state IN
        ('asked','accepted')`; a guard trigger — forward-only transitions (`asked → accepted | declined | lapsed | removed | erased`,
        `accepted → removed | withdrawn | erased`; every other state final; ⛔ no identity column ever changes); the BACKSTOP trigger (BEFORE
        INSERT only — ⛔ never on `asked → accepted`, which is live → live): `pg_advisory_xact_lock` on the namer, then refuse when
        `count(state IN ('asked','accepted')) >= 3` (the writer lapses stale `asked` rows first, so the backstop's count is exact); GRANT
        SELECT, INSERT, UPDATE (`state`, `responded_at`, `ended_at`); ⛔ no DELETE.
  - [ ] 1.2 `member_daily_counters`: `(pariwar_id, member_id, counter text CHECK IN ('contact_match_requests','contact_match_numbers',
        'known_people_ask'), day date, count int CHECK (count >= 0))` PK on all four but `count`; and `pariwar_daily_counters` (`pariwar_id,
        counter text CHECK IN ('contact_match_numbers'), day date, count int`); the atomic `INSERT … ON CONFLICT … DO UPDATE SET count =
        count + $n WHERE count + $n <= $cap RETURNING count` (⛔ no row returned ⇒ refused — the `sms_rate_buckets` shape, 0049); the rolling
        30-day cap sums `contact_match_numbers` over the last 30 IST days under the NAMER's advisory lock (the SAME key `askKnownPerson`
        and the backstop trigger take — ⛔ never a `FOR UPDATE` on `members`: two members naming each other would deadlock against the
        insert's FK check, 40P01); every counter is charged in a short transaction BEFORE any HMAC is computed (a refused request costs ⛔
        no KMS call).
- [ ] **Task 2 — the domain (AC2–AC8, AC12).** A batch blind-index path in `packages/domain/src/encryption/blind-index.ts`
      (`blindIndexMany` — the name is the developer's): `kms.computeHmac` per value with bounded concurrency and ONE `auditHook('computeHmac',
      …)` call carrying `{ count, purpose }` (extend the hook's context type and the sink's `kmsEventToAuditInput`,
      `apps/api/src/audit/audit-log-sink.ts:152-217`, to carry them); a test that a 1,000-number match writes ONE audit line. New
      `packages/domain/src/member/known-people.ts`: `matchContactNumbers` (normalise → the batch path OUTSIDE any transaction → ONE query
      `member_identities.mobile_blind_index = ANY($1)` inside the caller's scope joined to `members` with the eligibility predicate — ⛔ not
      the `servicePool` pre-scope lookup `resolveMembersByMobile` uses (it crosses Pariwars — SF9) → positions);
      `askKnownPerson` (the caller must be `active`; the namer's advisory lock — ⛔ no row lock on `members` (Task 1.2); lapse stale
      `asked` rows (their `ended_at` = `asked_at` + 30 days, ⛔ never the moment the writer notices); refuse a re-ask before the last
      DECLINED, LAPSED or WITHDRAWN link's `ended_at` + 60 days (SW10 — ⛔ never a `removed` one); count; insert); `listMyKnownPeople`
      (derives `not_accepted` and `unavailable`, treats an `asked` row past `asked_at` + 30 days as lapsed — in `freeSlots` too);
      `listRequestsNamingMe` (drops declined / lapsed requests — an `asked` row past `asked_at` + 30 days counts as lapsed — and keeps accepted
      ones); `answerKnownPersonRequest`,
      `removeKnownPerson`, `withdrawKnownPerson`; ONE exported eligibility predicate for matching and asking (active · ⛔ no claim naming them
      as deceased · ⛔ not the caller), ⛔ not the selection's (6.36 SW23 adds the identity row and the claimant) — keep them two named functions
      so neither drifts into the other. Names are resolved and decrypted in the HANDLER after the read transaction commits (⛔ no KMS under a
      lock). The anonymizer arm + the rtbf pin; the data-export entries.
- [ ] **Task 3 — contracts + API (AC3–AC8, AC10).** Contracts `packages/contracts/src/members/known-people.ts` (`.strict()`); a new module
      `apps/api/src/modules/known-people/` (routes + handlers + registration in the app's module list — ⚠ confirm it is MOUNTED, ⛔ not only
      imported), every route `memberSession` + `perMemberKey`; the writes take `requireIdempotencyKey`; the daily counters (3 matches, 10
      asks); audit lines `member_known_people.contacts_matched` (context: `submitted`, `matched` counts — ⛔ not numbers), `.asked`,
      `.accepted`, `.declined`, `.removed`, `.withdrawn` (resource `member:<id>`; ⛔ not names, ⛔ not numbers); the KMS batch line's purpose
      and count carried in its row key (6.36a SW12 — an audit row has ⛔ no context column); the schema's 400 for an over-long list checked
      to carry ⛔ no submitted value (the error envelope's `details.issues`); route tests for every AC incl. AC10's single 403; AC4's
      behaviour test.
- [ ] **Task 4 — the member app (AC9, AC11).** `npx expo install expo-contacts`; the plugin entry + `blockedPermissions` in
      `apps/mobile/app.config.ts` (plugins at `:162-183`) + the fixture `apps/mobile/tests/fixtures/app-config-prototype.json`;
      `apps/mobile/lib/phone-normalize.ts` (a copy of `normalizeMobile` — `packages/domain/src/encryption/member-fields.ts:92-100` — plus
      `0091…`, `+91 (0)…`, `+910…` and NFKD digit folding; a shared fixture list proves the copy and the server agree on every case the
      server accepts); `app/(life-events)/known-people.tsx` (list + requests naming me + actions), `app/(life-events)/known-people-find.tsx`
      (the flow: `Contacts.requestPermissionsAsync()` → on `'granted'` (or iOS 18 `'limited'` — then only the shared contacts are read)
      `getContactsAsync({ fields: [Fields.PhoneNumbers, Fields.Name] })` → normalise + de-duplicate → ≤ 1,000 → AC3; the matched list on a
      `FlashList` with a search box over the SAVED names; the non-member list for invites; on `'denied'` the fallback per platform —
      `presentContactPickerAsync()` on iOS only); the saved names of `asked` links kept in MMKV (`known-people.saved-names.v1`, cleared with
      the other member caches — on sign-out, `lib/session-context.tsx:97-110`, AND on a terminated / rejected refresh, `:63-81`), ⛔ never sent; the contact list itself held in memory only
      (⛔ not MMKV, ⛔ no query cache — `gcTime: 0`); `components/known-people/KnownPeopleRequestEntry.tsx` (home `app/(tabs)/index.tsx:68`'s
      neighbour + the `'polls'` case of `PanchayatNoticeboard.tsx:204-215`, beside `PeerRequestEntry` — ⛔ no banner row); the invite list
      offers ONLY contacts that were actually checked and did ⛔ not match (⛔ never one beyond the first 1,000). Tests: the pure logic (normaliser
      parity, slot arithmetic, the permission-state machine) in vitest; `vi.mock('expo-contacts', …)` in the `vi.hoisted` shape of
      `tests/unit/peer-questionnaire-render.test.ts`.
- [ ] **Task 5 — copy (AC13).** The note (*"We need access to find your colleagues already at {trust_name}."* + *"Numbers of people who
      aren't members are not kept."*), the request (*"{name} has named you as someone who knows them. Do you know him/her?"*), the answers,
      the list states, the limits' messages — en + hi + `$comment`; the Trust's name a PARAM from config (memory: the legal name is pending).
- [ ] **Task 6 — close (AC14).** Row 31's (a) / (d) evidence lines name this part's flows; `friction-budget.md` (*"member (allowing the
      app to check their contacts, or typing a number, to name people who know them)"* · protects *"who is asked when no colleague can be"* ·
      `optional`); the Change Log and File List; `pnpm ci:local`.

## Dev Notes

### What exists to reuse (read at `2581c514`)
- **The blind index:** `mobileBlindIndex` (`packages/domain/src/encryption/member-fields.ts:113-123`) — ONE global namespace (SF9), one
  KMS `macSign` per value (`cloud-kms-provider.ts:85-95`); `member_identities` UNIQUE `(pariwar_id, mobile_blind_index)` ⇒ at most one
  member per number per Pariwar. ⚠ Erasure RETAINS the index ⇒ the `members.state = 'active'` join is what keeps an erased member out.
- **The daily-bucket precedent:** `sms_rate_buckets` (migration 0049, per MEMBER — the closer one) and `otp_rate_buckets` (0021;
  `otp-rate-limit.ts:35-70`) — atomic upserts.
- **The member card + notice-strip precedent:** `apps/mobile/components/peer-request/PeerRequestEntry.tsx:19-45` (renders `null` when
  empty; the query waits for `pariwarId`); `PanchayatNoticeboard.tsx:204-215` (sibling entries in the `'polls'` case, ⛔ not banner rows).
- **The permission-state precedent:** `apps/mobile/lib/push-notifications.ts:55-82` (`granted` / `denied` + `canAskAgain` / undetermined).
- **The idempotency precedent:** `apps/api/src/modules/surveys/member-handlers.ts:38,111`; `newIdempotencyKey()` in
  `apps/mobile/lib/peer-request.ts:129-139`.
- **The app-config gate:** `apps/mobile/scripts/check-app-config.mjs` + `apps/mobile/tests/unit/app-config.test.ts:56-70` pin the plugins
  array against `apps/mobile/tests/fixtures/app-config-prototype.json` — adding a plugin without updating the fixture is RED.

### Traps
1. ⚠ **Cross-Pariwar leakage** — the global HMAC namespace means a lookup outside the scope transaction would reveal membership in ANOTHER
   Pariwar. Match ONLY inside `withPariwarScope` with the explicit `pariwar_id` predicate (I5).
2. ⚠ **KMS and audit-chain starvation** — the login path uses the same key AND the same service pool, and every per-call audit line takes
   the deployment-wide chain lock (6.36a SF9). Bound matching concurrency (≤ 8 per instance), write ONE audit line per request, keep the caps.
3. ⚠ **The error envelope can echo input** — a 400 `request.validation` carries `details.issues`; assert it carries ⛔ no submitted value
   (AC3, AC4).
4. ⚠ **Withholding must be uniform where it is promised** — not-a-member / erased / withdrawn / reported-dead / other-Pariwar is ONE 404
   (memory: per-item hiding leaks via absence AND presence); a withdrawal from the Trust and a death read the SAME `unavailable`. ⛔ Not
   promised (6.36a SW14): a decline is visible at once, and a withdrawn link after an acceptance reads as one.
5. ⚠ **iOS 18 limited access** — `accessPrivileges: 'limited'` returns only the contacts the member shared; say so on the screen
   (*"Only the contacts you shared are checked."*) and offer `presentAccessPickerAsync()` to add more.
6. ⚠ **`useT()` returns a fresh closure** — depend on `locale`, ⛔ not on `t` (memory).
7. ⚠ **TanStack `mutate()` callbacks fire for the latest call only** — per-row asks need per-call `mutateAsync` (memory).

### Testing standards
As 6.36a. The two-connection race for the last slot (AC2) is a live integration test with two pools (memory: one BEGIN ⇒ every `now()`
equal; a race needs separate transactions).

### References
6.36a (the record — SW10–SW17, SF3, SF9); `-309`; `-310` CF5 A; `-307` §2 item 3 (iii); Expo SDK 55 contacts docs; Apple 5.1.1(iii),
5.1.2(i)/(iv)/(v); Google Play User Data policy (prominent disclosure: in the app, during normal use, ⛔ not only in the privacy policy;
affirmative consent).

## Dev Agent Record
### Agent Model Used
### Completion Notes List
- 2026-10-14 — cut by `bmad-create-story 6.36` (SW1). ⛔ No code.
### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 1.5 | Validate round 5: the named person sees *"[Name] will see your answer"*; only declined or lapsed requests leave their list (accepted ones stay — the withdraw entry); the re-ask rule names declined / lapsed / withdrawn (⛔ never removed); `listMyKnownPeople` derives the labels and `freeSlots`; Trap 4 and AC8 restate what is and is ⛔ not withheld. |
| 2026-10-14 | 1.4 | Validate round 4: the namer's list follows 6.36a SW14's honest rule (a decline shows at once; a lapse at day 30) and ONE re-ask rule (`ended_at` + 60 days); `unavailable` rows are unnamed for withdrawal and death alike; a lapsed request leaves the named member's list; the lapse's `ended_at` pinned by a CHECK. |
| 2026-10-14 | 1.3 | Validate round 3: ONE re-ask window and ONE display timeline for a decline and a lapse (AC5, AC7 — ⛔ no declined-vs-ignored signal, ⛔ not even in timing), with a neutral `known_people.cannot_ask_now`; a lapse dated `asked_at` + 30 and ⛔ no answer after it (AC6); the request card only for `active` members; an accepted person who can ⛔ no longer be asked, named only until erased. |
| 2026-10-14 | 1.2 | Validate round 2: ONLY an `active` member may match, ask or answer (AC10 — ⛔ no signup step, SW16 (1)); the namer's advisory lock (⛔ no row lock — the mutual-naming deadlock); the re-ask cooldown; counters charged before any HMAC; the KMS batch line's row key; the schema's 400; the invite list only from checked contacts; the leftover composite-FK fragment removed. |
| 2026-10-14 | 1.1 | Checklist validation: single-column member FKs; `erased` (⛔ not `ended`) and the timestamp CHECKs 6.36 reads as of a date; the backstop on INSERT only (an accept is ⛔ never refused); the monthly and Pariwar caps; the batch blind-index path with ONE audit line per match (6.36a SF9); 400 `request.validation` for schema failures; the >1,000 notice; the app-config paths; the friction-budget row. |
| 2026-10-14 | 1.0 | Cut by `bmad-create-story 6.36` (SW1): SW10–SW15, SW16 (1), SW17 — written to the RECOMMENDED answers; any differing answer at 6.36a's Task 0.1 amends this file before its code. |
