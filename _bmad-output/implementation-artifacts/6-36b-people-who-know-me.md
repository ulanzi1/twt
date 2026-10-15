---
baseline_commit: 2581c514
---

<!--
⭐ CUT 2026-10-14 by `bmad-create-story 6.36` (SW1). ⭐ THE RECORD is 6.36a's file (`6-36a-member-workplace-and-posting-history.md` —
SF1–SF17, SW1–SW30, SC1–SC4, I1–I12, the shared Task 0). This file BUILDS **SW10–SW15** and **SW17** (SW16 (1): ⛔ no signup step — a
member is ⛔ not yet `active` while signing up; the home prompt is 6.36c's). Where a summary here and 6.36a's text disagree, 6.36a's text is the record.
⚠ Before Task 1: `git diff --name-only 2581c514..HEAD -- packages apps scripts infra` — re-read any cited file that moved.

STATUS: `ready-for-dev` — ⭐ `2026-10-14-332` (`33902d82`): built IN PARALLEL with 6.36a (wave 1). Worktree `.claude/worktrees/6-36b`; migration
`0162` (`when` `1794195600006`); test database `twt-test-pg-b` ONLY (`:5434`, `twt_dev` —
`DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5434/twt_dev?sslmode=disable'`), ⛔ never `:5432` / `:5433` until 6.36a has
merged; merges to `main` SECOND (after 6.36a — a finished 6.36b waits, then rebases).
GLYPH REGISTER, ADDRESSING RULE, LETTERS: as 6.36a.
-->

# Story 6.36b: People Who Know Me — Up to Three Members a Member Names, Found From Their Phone's Contacts, Each of Whom Accepts `[SURFACE]`

Status: in-progress

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

1. **AC0 — ⛔ no code before `2026-10-14-332` is in the tree** (it is — `33902d82`; `-330` and `-331` too); built in parallel with 6.36a,
   which it does ⛔ not need.
2. **AC1 — the migration** (FIXED by `2026-10-14-332`: `0162`, journal idx 162, `when` `1794195600006`): `member_known_people`,
   `member_daily_counters` and `pariwar_daily_counters` (Task 1); member FKs SINGLE-COLUMN (6.36a SF14); per-command RLS; applied ONLY to
   `twt-test-pg-b` (`:5434`) while 6.36a is unmerged — then, after rebasing onto `main`, to `:5432` AND `:5433` — proven from zero; a policy-regression
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
   a DECLINED or LAPSED request leaves the named member's list and card — an ACCEPTED one leaves the home CARD but stays in their list (the
   withdraw entry, AC8; it leaves the list too when the namer removes it); ⛔ no SMS, push or WhatsApp is sent (a test asserts ⛔ no dispatcher call).
8. **AC7 — the member's list** (`GET /api/v1/member/known-people`): each live link as `asked` (⛔ no name — the app shows the name the member
   saved, kept only on the phone) or `accepted` (the registered name); `not_accepted` — at once after a decline or a withdrawal, at
   `asked_at` + 30 days after a lapse — for 30 days, then ⛔ not at all (6.36a SW14 — a decline is visible at once, accepted and recorded);
   an ACCEPTED person who has withdrawn from the Trust or had a claim filed for their death (⛔ never a late renewal) reads
   `unavailable` — ⛔ no name, ⛔ never why, the slot kept until the namer removes the row; an erased person's link has ended and shows ⛔
   nothing (⚠ so a vanished row tells the namer that person left the Trust — ⛔ never that they died; recorded, 6.36a SW14); the contract's
   label enum is `asked | accepted | not_accepted | unavailable`; `freeSlots`; remove (`POST …/:linkId/remove`, `Idempotency-Key`) ⇒ `removed`
   — the named member gets ⛔ no message, but the link leaves their list (6.36a SW14 (4) — recorded).
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
14. **AC13 — copy:** keys in a NEW `known_people` namespace (`2026-10-14-332` call 5 — ⛔ never 6.36a's `workplace` files; registered, member-facing,
    parity green);
    BigDev's note words (`-309`) with the Trust's name from config; the request text (`-307`), *"[Name] will see your answer."* and *"[Name]
    will see that you withdrew."* in en + hi; a real-`t()` test.
15. **AC14 — records and close:** Row 31's (a) / (d) evidence lines name this part's flows; `friction-budget.md` gains the row for the
    contacts permission (`optional` — SF15); `pnpm ci:local` green.

## Tasks / Subtasks

- [x] **Task 1 — the migration (AC1, AC2).**
  - [x] 1.1 `member_known_people`: `link_id uuid pk`, `pariwar_id`, `namer_member_id`, `named_member_id` (each FK → `members(member_id)`,
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
  - [x] 1.2 `member_daily_counters`: `(pariwar_id, member_id, counter text CHECK IN ('contact_match_requests','contact_match_numbers',
        'known_people_ask'), day date, count int CHECK (count >= 0))` PK on all four but `count`; and `pariwar_daily_counters` (`pariwar_id,
        counter text CHECK IN ('contact_match_numbers'), day date, count int`); the atomic `INSERT … ON CONFLICT … DO UPDATE SET count =
        count + $n WHERE count + $n <= $cap RETURNING count` (⛔ no row returned ⇒ refused — the `sms_rate_buckets` shape, 0049); the rolling
        30-day cap sums `contact_match_numbers` over the last 30 IST days under the NAMER's advisory lock (the SAME key `askKnownPerson`
        and the backstop trigger take — ⛔ never a `FOR UPDATE` on `members`: two members naming each other would deadlock against the
        insert's FK check, 40P01); every counter is charged in a short transaction BEFORE any HMAC is computed (a refused request costs ⛔
        no KMS call).
- [x] **Task 2 — the domain (AC2–AC8, AC12).** A batch blind-index path in `packages/domain/src/encryption/blind-index.ts`
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
- [x] **Task 3 — contracts + API (AC3–AC8, AC10).** Contracts `packages/contracts/src/members/known-people.ts` (`.strict()`); a new module
      `apps/api/src/modules/known-people/` (routes + handlers + registration in the app's module list — ⚠ confirm it is MOUNTED, ⛔ not only
      imported), every route `memberSession` + `perMemberKey`; the writes take `requireIdempotencyKey`; the daily counters (3 matches, 10
      asks); audit lines `member_known_people.contacts_matched` (context: `submitted`, `matched` counts — ⛔ not numbers), `.asked`,
      `.accepted`, `.declined`, `.removed`, `.withdrawn` (resource `member:<id>`; ⛔ not names, ⛔ not numbers); the KMS batch line's purpose
      and count carried in its row key (6.36a SW12 — an audit row has ⛔ no context column); the schema's 400 for an over-long list checked
      to carry ⛔ no submitted value (the error envelope's `details.issues`); route tests for every AC incl. AC10's single 403; AC4's
      behaviour test.
- [x] **Task 4 — the member app (AC9, AC11).** `npx expo install expo-contacts`; the plugin entry + `blockedPermissions` in
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
- [x] **Task 5 — copy (AC13).** The note (*"We need access to find your colleagues already at {trust_name}."* + *"Numbers of people who
      aren't members are not kept."*), the request (*"{name} has named you as someone who knows them. Do you know him/her?"*), the answers,
      *"{name} will see your answer."*, *"{name} will see that you withdrew."*, the list states, the limits' messages — en + hi + `$comment`; the Trust's name a PARAM from config (memory: the legal name is pending).
- [x] **Task 6 — close (AC14).** Row 31's (a) / (d) evidence lines name this part's flows; `friction-budget.md` (*"member (allowing the
      app to check their contacts, or typing a number, to name people who know them)"* · protects *"who is asked when no colleague can be"* ·
      `optional`); the Change Log and File List; `pnpm ci:local`.

### Review Findings

Review: `bmad-code-review`, 2026-10-15, `b6cbf9db...185da74a` (77 files). All three review layers completed:
Blind Hunter, Edge Case Hunter, Acceptance Auditor. Triage: **0 decision-needed, 6 patch, 0 defer, 1 dismissed**.
All six findings are **MEDIUM / P2** engineering fixes; no Trustee Panel ruling is required.

**Disposition (2026-10-15):** BigDev selected **2 — Leave as action items**. R1–R6 remain unchecked;
0 patches applied. Story and sprint status return to `in-progress` while these findings remain unresolved.

- [ ] [Review][Patch] **R1 — Reserve the limiter slot when waking a queued task (AC3 / SW12).**
  [`packages/domain/src/encryption/blind-index.ts:64`]
  `release()` decrements `active` before the queued waiter resumes; a new task can take that same slot in between.
  Actual-source probes reached two concurrent tasks with a maximum of one, and nine with a maximum of eight.
  Transfer the occupied slot directly to its waiter and add a handoff-interleaving regression test.
  Sources: blind + edge.
- [ ] [Review][Patch] **R2 — Keep every live outgoing link visible and count slots independently of displayed history (AC7).**
  [`packages/domain/src/member/known-people.ts:443`]
  `LIMIT 50` applies to live links and recent negative history together; `freeSlots` then counts only returned rows.
  A live-DB, RLS-enforced reproduction with one older accepted link and 50 newer declines returned 50 negative rows,
  omitted the accepted link and its remove control, and reported three free slots instead of two. This is reachable
  under the ten-asks-per-day cap. Preserve live rows and calculate the aggregate over the full live set.
  Sources: blind + edge + auditor.
- [ ] [Review][Patch] **R3 — Make all incoming links reachable through pagination (AC6 / AC8).**
  [`apps/api/src/modules/known-people/handlers.ts:241`]
  The handler returns only the newest 50 links; the contract has only `limit`, no cursor, and the domain additionally
  truncates at 100. Incoming acceptances have no per-recipient cap. An actual-handler, rollback-only DB reproduction
  with 51 accepted links returned 50, omitted the oldest, and exposed no next-page field. The member cannot reach
  that link's withdrawal control through the app. Add pagination across domain, contract, client and screen.
  Sources: blind + edge + auditor.
- [ ] [Review][Patch] **R4 — Hide the home card and notice item when eligibility refetch is denied (AC6 / AC10).**
  [`apps/mobile/components/known-people/KnownPeopleRequestEntry.tsx:18`]
  The entry reads only `data`. TanStack retains previous successful data when a refetch fails, so after
  `403 known_people.not_available` the old asked request still renders the entry for a now non-active member.
  Verified with the installed QueryClient: an error state retains the original request data. Check the denial/error
  state before rendering cached requests. Source: auditor.
- [ ] [Review][Patch] **R5 — Announce successful request actions (checklist 13(d), AC6 / AC8).**
  [`apps/mobile/app/(life-events)/known-people.tsx:48`]
  The action wrapper sets an accessible status only on failure. Acceptance swaps the controls for ordinary text;
  decline, removal and withdrawal delete rows without a success announcement. Add action-specific accessible success
  feedback so a screen-reader member can tell that the action completed. This is a source finding; device or emulator
  screen-reader behavior was not demonstrated. Source: auditor.
- [ ] [Review][Patch] **R6 — Enforce current caller eligibility before delivering an idempotent replay (AC10).**
  [`apps/api/src/modules/known-people/handlers.ts:115`]
  The stored-result branch precedes every active-member check, which currently lives inside `run()`. With a valid
  access JWT and an unexpired completed key, a now non-active caller receives the old success instead of the uniform
  403. The actual-handler DB probe returned 200 for a completed remove replay by an `active-in-grace` member, while
  the same request with a fresh key returned `403 known_people.not_available`. Apply the active-member check before
  claim/replay handling. Sources: edge + auditor.

**Validation in this review:** 159 focused existing tests passed: domain batch crypto / mobile normalization parity
38; mobile known-people / phone normalization 55; API number fence / lockstep / audit sink 22; live domain / policy /
two-connection concurrency 44 on `:5434`. The first sandboxed DB attempt failed with `EPERM`; the authorized rerun
passed. Temporary reproductions used actual source imports and rolled back their DB fixtures. No production code was
changed. No device/emulator rendering or full `ci:local` rerun was performed during review.

**Invariant lens:** families 2 and 3 have the R1/R6 boundary gaps; family 7 has R2; family 13 has R5.
Touched families 1, 5, 6 and 12 are covered by the dedicated transition/policy/concurrency/ownership/privacy tests and
explicit response field selection. Families 10 and 11 are covered by the story's honest device/Hindi disclosure and
its explicit no-benefit-gate meaning. Other families introduce no additional applicable obligation in this diff.

**Dismissed:** the blind review's formatted-number-as-saved-name candidate concerns a member-owned contact label
stored locally after a successful member ask. It does not demonstrate retention of a non-member number or a server
number leak, so it is not treated as an AC4 violation. SW17 permits exports of names previously seen; historical
accepted-name export is not a finding.

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
   promised (6.36a SW14's four): a decline is visible at once; a withdrawal after an acceptance reads as one; an erased person's row vanishes
   (so a withdrawal and a death diverge at erasure); the named member sees a removed link leave their list.
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
Claude Opus 5.5 (1M context) — `bmad-dev-story`, 2026-10-14, worktree `.claude/worktrees/6-36b`, branch `story/6-36b-people-who-know-me`
(⛔ committed — the dev-story workflow does ⛔ commit; BigDev commits).

### Debug Log References
- The test DB is `twt-test-pg-b` `:5434` ONLY (AC1) — 0162 applied there by `db:migrate`; ⛔ `:5432` / `:5433` touched. 0162 also
  migrated FROM ZERO on a scratch database on `:5434` (`twt_zero_636b`, 161 entries) and the policy spec run there (19/19), then
  dropped.
- Fixture clock skew (host vs container) made two policy-spec legs flaky — the default `asked_at` is now a minute in the past.
- `kmsEventToAuditInput`'s single-HMAC lines are UNCHANGED (the same row key and hash input when ⛔ `purpose` / `count`).

### Completion Notes List
- 2026-10-14 — cut by `bmad-create-story 6.36` (SW1). ⛔ No code.
- 2026-10-14 — ⭐ `bmad-dev-story` (Tasks 1–5 done; Task 6 PARTIAL — see the last note):
  - **Task 1 (AC1, AC2):** migration `0162` (journal idx 162, `when` `1794195600006`) — `member_known_people` (single-column member
    FKs; the CHECKs incl. the lapse date and the answer window; a partial UNIQUE of ONE live link per pair; the forward-only GUARD
    trigger — every identity column frozen, the two dates written once, a lapse only after 30 days; the BEFORE INSERT BACKSTOP under
    `member_known_people_lock_namer(namer)` — ONE SQL function the writer calls too, so the key cannot drift); `member_daily_counters`
    / `pariwar_daily_counters` (the 0049 atomic capped upsert). Per-command RLS, FORCE, ⛔ DELETE, column grants. Policy spec 19/19;
    the two-connection race (backstop alone, the writer, mutual naming ⛔ 40P01) 3/3.
  - **Task 2:** `blindIndexMany` (≤ 8 HMACs in flight PER PROCESS — one shared limiter; ONE `auditHook` line with `{ count, purpose }`;
    the hook's context type `KmsAuditContext`; the API sink carries `<purpose>:n=<count>` in the row key) — a 1,000-number batch writes
    ONE line (unit). `member/known-people.ts`: `matchContactNumbers` (charge in its own short tx → HMACs outside any tx → ONE scoped
    query → positions; a refused charge THROWS inside the scope so ⛔ counter moves), `askKnownPerson`, the lists with the derived labels
    and `freeSlots`, answer / remove / withdraw, ONE eligibility predicate `knownPersonEligibleSql` (⛔ the selection's), the erasure arm
    (ONE `.update(memberKnownPeople)` — a stale ask recorded `lapsed`, every other live link `erased`; the rtbf pin 24 → 25 statements,
    21 → 22 tables) and the export (`profile.json` → `knownPeople.named` / `namedBy`, with ONLY the names the member already saw; ⚠ the
    STRICT `contracts.ProfileSection` gained the field — without it every export build would have failed the jobs' parse). Domain spec
    22/22.
  - **Task 3:** contracts `members/known-people.ts`; module `apps/api/src/modules/known-people/` MOUNTED in `server.ts` (the route tests
    hit it); seven routes, `memberSession` + `perMemberKey` on each; the writes take `Idempotency-Key` (a replay returns the original
    status + body); ONE 403 `known_people.not_available` for every non-`active` caller on every route (AC10); the six audit lines
    (ids and counts only); the KMS line's row key. Route spec 6/6 incl. AC4's behaviour leg (planted numbers in a match and an ask —
    ⛔ their digits in the request / error logs, the console, the audit lines, the KMS line, any row or any error body); the number
    fence (AC4 + AC6's ⛔ messaging path, exact sink allow-list, positive control) — it CAUGHT `body.foundBy` passed into an audit call
    (fixed: `body` never reaches a sink); login-wall + forced-pagination guards green.
  - **Task 4:** `expo-contacts ~55.0.18` (`npx expo install`; ⚠ it also re-sorted the devDependencies block — reverted by hand, only the
    one line added; `pnpm install --frozen-lockfile --offline` green); the plugin entry (the permission text names the Trust ONLY from
    `EXPO_PUBLIC_TRUST_NAME` — absent ⇒ *"This app …"*) + `blockedPermissions: [WRITE_CONTACTS]`; the prototype fixture regenerated FROM
    THE REAL LOADER (only `android` and `plugins` changed); `check-app-config.mjs` green. `lib/phone-normalize.ts` + the shared fixture
    (`packages/contracts/tests/fixtures/mobile-normalize-cases.json`, proven by BOTH halves). The two screens, the hub card, the home card
    + the notice-strip item (AFTER `<PollsEntry />` — 6.27a's pinned adjacency kept), the saved names in MMKV (⛔ a number is ever saved
    as a name), the caches cleared on sign-in / sign-out / a terminated or rejected refresh. `tsc` green BOTH ways (with and without
    `.expo/types`). Mobile vitest 868/868 (58 files).
  - **Task 5:** `known_people` namespace (en + hi + `$comment`s), registered in the catalog; member-facing BY DEFAULT (⛔ an explicit
    entry — `classification.json`'s `namespaces` holds overrides only); parity green; the real-`t()` test (every key, both locales, the
    ruled sentences verbatim, ⛔ the Trust's name in the copy).
  - ⚠ **NOT demonstrated on a device or emulator** — the screens are typechecked and their logic unit-tested; ⛔ rendered
    ([[feedback_record_unattested_no_backfill]]).
  - **`pnpm ci:local` (2026-10-14, `DATABASE_URL` = `:5434` — ⛔ `:5432` / `:5433`): RED — 1 job of 36.** `test (unit)` failed ONLY on
    `@twt/channels` `tests/determinism.test.ts` (the P0 100×-threaded render gate) — a 96 s run against its 90 s budget, the CPU-
    contention class [[project_ci_local_concurrency_oversubscription]] describes; this story touches ⛔ `packages/channels`. turbo then
    CANCELLED the rest of that job (admin, mobile, domain, api, jobs, validity-service never finished in it). Every other job green:
    lint, typecheck, build, the 26 gates, `expo-config`, `friction-budget` (its AC-4 leg dormant — uncommitted), `determinism-replay`,
    **`channels-determinism` (the same gate, isolated — green)**, and **`integration-tests` green** (domain 5235, API 1755, jobs 797,
    channels 231, validity-service 284, events 36, niyamavali-engine 144, queue 4). Then the unit job's own command re-run ALONE
    (`env -u DATABASE_URL pnpm turbo run test --concurrency=4`): **37/37 tasks green** (mobile 868, admin 1170, channels 227 + 4
    skipped). ⛔ Reported as a red first run, ⛔ as "green".
  - ⚠ **Task 6 — PARTIAL.** Done: `friction-budget.md` (the `optional` row + a disposition paragraph). ⚠ The gate's AC-4
    attribution leg is DORMANT while the work is uncommitted (it diffs committed history) — re-run `pnpm friction:check` after the
    commit. ⛔ **NOT done — Row 31's (a) / (d) evidence lines:** Row 31 does ⛔ not exist in this tree — 6.36a appends it (its Task 7),
    and 6.36a has ⛔ committed yet. Owed AT THE REBASE onto `main` after 6.36a merges (`-332`: 6.36b merges second), with 0162 then
    applied to `:5432` AND `:5433` (AC1). The lines to add then, in Row 31's `closure_evidence_link` / notes:
    **(a)** *"6.36b: the phone's numbers reach the Trust ONLY through `POST /api/v1/member/known-people/contact-matches` (≤ 1,000 per
    request, HMAC'd, matched, then discarded — the response is positions) and `POST /api/v1/member/known-people` (one number, HMAC'd,
    dropped); stored: the links `member_known_people` (member ids, states, dates, how found) and the counters (counts) — ⛔ any number."*
    **(d)** *"6.36b: Android `READ_CONTACTS` (the `expo-contacts` plugin; `WRITE_CONTACTS` blocked); the in-app note BEFORE the system
    prompt (`app/(life-events)/known-people-find.tsx`); iOS `NSContactsUsageDescription` = `contactsPermissionText()` (`apps/mobile/
    app.config.ts`) — the Trust's name from `EXPO_PUBLIC_TRUST_NAME`."*

  - 2026-10-15 — ⭐ **REBASED onto 6.36a's tip `b6cbf9db`** (6.36a `done`, code-reviewed, *"ready to fast-forward"*; ⚠ ⛔ yet on
    `origin/main`, which is still `2581c514` — so `main` will equal `b6cbf9db` when 6.36a fast-forwards and 6.36b needs ⛔ second
    rebase unless 6.36a's tip moves). 6.36b = `7d37ffc6` (the work, committed 2026-10-15 as `30222b39`, rebased) + the follow-up
    `18c7a843`. Nine shared files resolved, each keeping BOTH stories: the journal (0161 then 0162), the contracts / domain barrels,
    the ids, the i18n catalog (`workplace` + `known_people`), `assemble.ts` (6.36a's workplace columns + requests AND 6.36b's
    `knownPeople`; `ProfileSection` auto-merged with both), `anonymize.ts` (both arms), the rtbf pin (**23 tables, 26 statements**,
    the no-claims case 23 — both stories' legs kept; 21/21), `friction-budget.md` (both rows + both dispositions), `sprint-status.yaml`
    (6-36a `done`, 6-36b `in-progress`). The screens' `newIdempotencyKey` import moved to 6.36a's `lib/idempotency-key.ts`.
  - 2026-10-15 — **Task 6 finished on the rebased tree:** Row 31's **notes (5)–(8)** name this part's flows for (a) what is sent and
    kept, (d) what the build declares, (e) the KMS load and (f) the Hindi copy — ⛔ any criterion written closed and ⛔ any
    `closure_evidence_link` filled ([[feedback_closure_language_precision]]); the `known_people` `$comment` carries 6.36a's
    *"NOT YET HUMAN-REVIEWED — go-live Row 31 (f)"* marker.
  - 2026-10-15 — ⭐ **`pnpm ci:local` on the rebased tree (`18c7a843`, `DATABASE_URL` = the fresh `:5434` `twt_dev`): PASSED — 36 / 36
    jobs green** (`.expo/types` moved aside so it matches CI): unit 37 / 37 tasks; integration — domain 5308, API 1771, jobs 797,
    channels 231, validity-service 284, niyamavali-engine 144, events 36, queue 4; `friction-budget`'s AC-4 leg LIVE (committed) —
    *"declaration affirmed"*. All six Tasks done ⇒ Status `review`.
  - 2026-10-15 — the test DB for the rebased tree: on `:5434` the old `twt_dev` (0162 without 0161 — the migrator would SKIP 0161 there,
    its `when` being older) was RENAMED `twt_dev_6_36b_pre_rebase` (⛔ dropped — BigDev may drop it) and a fresh `twt_dev` migrated
    FROM ZERO (162 migrations: 0161's and 0162's tables both present). Mobile `tsc` green with freshly regenerated `.expo/types` AND
    without them. ⚠ **STILL OWED (AC1):** apply 0162 to `:5432` AND `:5433` once 6.36a has actually landed on `main` (`-332` — ⛔ until
    then). ✅ **DONE 2026-10-15** — BigDev: *"6.36a is on main"*; verified after `git fetch`: `origin/main` = `b6cbf9db` exactly (6.36b sits
    three commits on it — ⛔ second rebase). `db:migrate` applied 0162 on `:5432` and `:5433` (each was at 0161; now 162 entries); the
    three tables' schema dumps equal `:5434`'s from-zero dump (only `pg_dump`'s random `\restrict` nonce differs), the three functions'
    bodies hash equal, and the recorded migration hash = the file's SHA-256 on all three; the 0162 policy / domain / concurrency specs
    44 / 44 on `:5432` AND on `:5433`.

### File List
- `packages/domain/migrations/0162_member-known-people.sql` (new); `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/member_known_people.ts`, `member_daily_counters.ts` (new); `packages/domain/src/schema/index.ts`
- `packages/domain/src/policies/member-known-people-rls.ts`, `member-daily-counters-rls.ts` (new); `packages/domain/src/policies/index.ts`
- `packages/domain/src/ids/index.ts`
- `packages/domain/src/encryption/blind-index.ts`, `kms-provider.ts`, `member-fields.ts`, `index.ts`
- `packages/domain/src/member/known-people.ts` (new); `packages/domain/src/member/index.ts`, `anonymize.ts`
- `packages/domain/src/data-export/assemble.ts`
- `packages/domain/tests/encryption/blind-index-many.test.ts`, `mobile-normalize-parity.test.ts` (new)
- `packages/domain/tests/integration/rls/member-known-people-policy-regression.spec.ts` (new)
- `packages/domain/tests/integration/member/known-people.spec.ts`, `known-people-concurrency.spec.ts` (new)
- `packages/domain/tests/integration/data-export/data-export.spec.ts`; `packages/domain/tests/member/rtbf-anonymize.test.ts`
- `packages/contracts/src/members/known-people.ts` (new); `packages/contracts/src/members/index.ts`; `packages/contracts/src/data-export/data-export.ts`
- `packages/contracts/tests/members-known-people.test.ts`, `packages/contracts/tests/fixtures/mobile-normalize-cases.json` (new)
- `packages/api-client/src/index.ts`; `packages/api-client/tests/known-people-client.test.ts` (new)
- `apps/api/src/modules/known-people/index.ts`, `routes.ts`, `handlers.ts`, `names.ts` (new); `apps/api/src/server.ts`
- `apps/api/src/audit/audit-sink.ts`, `audit-log-sink.ts`; `apps/api/tests/unit/audit-log-sink.test.ts`
- `apps/api/tests/integration/known-people/known-people.spec.ts`, `apps/api/tests/unit/known-people-number-fence.test.ts`, `known-people-lockstep.test.ts` (new)
- `packages/i18n/locales/en/known_people.json`, `packages/i18n/locales/hi/known_people.json` (new); `packages/i18n/src/catalog.ts`; `packages/i18n/tests/known-people-copy.test.ts` (new)
- `apps/mobile/package.json`, `pnpm-lock.yaml` (`expo-contacts ~55.0.18`)
- `apps/mobile/app.config.ts`, `apps/mobile/scripts/check-app-config.mjs`, `apps/mobile/tests/fixtures/app-config-prototype.json`, `apps/mobile/tests/unit/app-config.test.ts`
- `apps/mobile/app/(life-events)/known-people.tsx`, `known-people-find.tsx` (new); `apps/mobile/app/(life-events)/index.tsx`; `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/components/known-people/KnownPeopleRequestEntry.tsx`, `known-people-cache.ts`, `useKnownPeopleQueries.ts` (new); `apps/mobile/components/panchayat/PanchayatNoticeboard.tsx`
- `apps/mobile/lib/known-people.ts`, `known-people-api.ts`, `known-people-contacts.ts`, `known-people-i18n.ts`, `known-people-saved-names.ts`, `phone-normalize.ts`, `trust-name.ts` (new); `apps/mobile/lib/session-context.tsx`
- `apps/mobile/tests/unit/known-people-logic.test.ts`, `known-people-contacts.test.ts`, `known-people-copy-keys.test.ts`, `known-people-session.test.ts`, `phone-normalize.test.ts` (new)
- `friction-budget.md`; `docs/launch-gate-inventory/inventory-roster.md` (Row 31 notes (5)–(8))
- `_bmad-output/implementation-artifacts/6-36b-people-who-know-me.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-15 | 1.10 | `bmad-code-review`: three review layers completed on `b6cbf9db...185da74a`; 6 MEDIUM / P2 patch findings, 0 decisions, 0 deferrals, 1 dismissed; 159 focused tests passed. BigDev selected **2 — Leave as action items**: R1–R6 recorded unchecked, 0 patches applied; story and sprint status → `in-progress`. |
| 2026-10-15 | 1.9 | 6.36a confirmed on `main` (`origin/main` = `b6cbf9db`); AC1's last step done — 0162 applied on `:5432` AND `:5433`, schema and hashes equal to the from-zero `:5434`, the 0162 specs 44 / 44 on both. ⛔ No code changed. |
| 2026-10-15 | 1.8 | `bmad-dev-story` (continued): committed, REBASED onto 6.36a's tip `b6cbf9db` (nine shared files resolved, both stories kept); Task 6 finished — Row 31 notes (5)–(8); `ci:local` 36 / 36 green on a fresh `:5434` from zero. Status → `review`. ⚠ Owed after 6.36a lands on `main`: 0162 on `:5432` AND `:5433` (AC1). |
| 2026-10-14 | 1.7 | `bmad-dev-story`: Tasks 1–5 built and tested (migration 0162 on `:5434` only; the domain, contracts, API module, member app, `known_people` copy); Task 6 PARTIAL — the friction-budget row done; Row 31's (a) / (d) evidence lines owed at the rebase onto 6.36a (Row 31 is ⛔ in this tree yet). Status stays `in-progress`. |
| 2026-10-14 | — | `2026-10-14-330` committed (`d44708e8`) — BigDev: *"all A, SC4 yes"*; every AC and Task here was written to the recommended answers ⇒ ⛔ none changed. |
| 2026-10-14 | 1.6 | Validate round 6: AC7 / Trap 4 / AC6 record what each side can tell (6.36a SW14's four); the accepted request leaves the card but stays in the list; the two notices in the copy. |
| 2026-10-14 | 1.6 | `2026-10-14-332` (`33902d82`): `ready-for-dev` NOW — built in parallel with 6.36a; migration `0162` / `…006`; its own database `:5434` and worktree; merges second; its copy in a new `known_people` namespace. |
| 2026-10-14 | 1.5 | Validate round 5: the named person sees *"[Name] will see your answer"*; only declined or lapsed requests leave their list (accepted ones stay — the withdraw entry); the re-ask rule names declined / lapsed / withdrawn (⛔ never removed); `listMyKnownPeople` derives the labels and `freeSlots`; Trap 4 and AC8 restate what is and is ⛔ not withheld. |
| 2026-10-14 | 1.4 | Validate round 4: the namer's list follows 6.36a SW14's honest rule (a decline shows at once; a lapse at day 30) and ONE re-ask rule (`ended_at` + 60 days); `unavailable` rows are unnamed for withdrawal and death alike; a lapsed request leaves the named member's list; the lapse's `ended_at` pinned by a CHECK. |
| 2026-10-14 | 1.3 | Validate round 3: ONE re-ask window and ONE display timeline for a decline and a lapse (AC5, AC7 — ⛔ no declined-vs-ignored signal, ⛔ not even in timing), with a neutral `known_people.cannot_ask_now`; a lapse dated `asked_at` + 30 and ⛔ no answer after it (AC6); the request card only for `active` members; an accepted person who can ⛔ no longer be asked, named only until erased. |
| 2026-10-14 | 1.2 | Validate round 2: ONLY an `active` member may match, ask or answer (AC10 — ⛔ no signup step, SW16 (1)); the namer's advisory lock (⛔ no row lock — the mutual-naming deadlock); the re-ask cooldown; counters charged before any HMAC; the KMS batch line's row key; the schema's 400; the invite list only from checked contacts; the leftover composite-FK fragment removed. |
| 2026-10-14 | 1.1 | Checklist validation: single-column member FKs; `erased` (⛔ not `ended`) and the timestamp CHECKs 6.36 reads as of a date; the backstop on INSERT only (an accept is ⛔ never refused); the monthly and Pariwar caps; the batch blind-index path with ONE audit line per match (6.36a SF9); 400 `request.validation` for schema failures; the >1,000 notice; the app-config paths; the friction-budget row. |
| 2026-10-14 | 1.0 | Cut by `bmad-create-story 6.36` (SW1): SW10–SW15, SW16 (1), SW17 — written to the RECOMMENDED answers; any differing answer at 6.36a's Task 0.1 amends this file before its code. |
