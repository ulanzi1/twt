---
baseline_commit: 301d96d8
---

<!--
⭐ CUT 2026-10-14 by `bmad-create-story 6.36` (SW1). ⭐ THE RECORD is 6.36a's file (`6-36a-member-workplace-and-posting-history.md`).
This file BUILDS **SW9's staff half** (the Super Admin's list; the Pariwar Admin's SUGGESTION and the member's confirm-or-refuse route) and
**SW16 (2)–(5)** (the home cards and the invite, the transfer prompt, the replace prompt, the campaign). Where a summary here and 6.36a's text
disagree, 6.36a's is the record — EXCEPT where this file cites a later decision (`-333`, `-338`, `-342`) or a SHIPPED fact (§Shipped substrate).
⭐ RE-VALIDATED 2026-10-16 (v2.0) by `bmad-create-story 6.36c` against `main` `301d96d8` — rows 6-36a, 6-36b AND 6-36 are `done` and on
`main` (AC0 MET). The old pin `2581c514` is an ancestor; 186 files under `packages apps scripts infra` moved since it, so EVERY code pointer
below was re-read at `301d96d8` by four parallel verifiers (6.36a's record + code; 6.36b's code; the admin / API precedents; the governance
trail). ⚠ Before Task 1: `git diff --name-only 301d96d8..HEAD -- packages apps scripts infra` — re-read any cited file that moved.

STATUS: `ready-for-dev` (v2.3, 2026-10-16). Migration `0164` (journal idx 164, `when` `1794195600008` — the journal ends at `0163` /
`…007`); the SHARED test databases (`twt-test-pg` `:5433` AND `:5432` — `-338` call 4; ⛔ `twt-test-pg-b`); worktree
`.claude/worktrees/6-36c` on `story/6-36c-workplace-list-curation-and-prompts`; merges to `main` LAST. 6.27c waits for this row (`-332` call 6).
⛔ No Panel question is open for this part: SC2 is ⛔ owed (`-330` §0 — *"SC2 and SC3 are ⛔ not owed: SW9 A, SW15 A and SW16 A were chosen"*).
GLYPH REGISTER: `⛔` NEGATES the phrase it prefixes · `⭐` = action / emphasis · `⚠` = hazard · doubling is volume only.
ADDRESSING RULE: ⛔ no `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` — cite decision id + clause, item
heading, row key. LETTERS: as 6.36a; this file's own re-validation rulings are **RV1–RV12** (§The re-validation rulings).
-->

# Story 6.36c: Keeping the Lists Full — the Super Admin's Office List, a Pariwar Admin Suggests a Workplace the Member Confirms, and the Prompts That Ask Members to Fill Theirs In `[SURFACE]`

Status: review

> ⭐⭐ **WHAT THIS PART IS.** The school list comes from an import (6.36a); offices are ⛔ not in it, and ~11k Bihar schools are missing
> from the only bulk copy found (6.36a SF1). So: the SUPER ADMIN keeps an office list and adds any missing school; a PARIWAR ADMIN suggests
> a listed entry for a member's *"my workplace isn't listed"* and the MEMBER confirms it (⛔ never a staff act that sets or creates a
> workplace — SW9 A); and members are prompted, IN THE APP ONLY, to add their workplace, invite colleagues and name the people who know
> them — including by a Pariwar Admin's campaign. ⛔ No SMS, ⛔ no push, ⛔ no WhatsApp from any of it (`-307` §2 item 4: *"In the app only —
> members get ⛔ no ordinary text from this."*).

## Story

As **the Super Admin** — I want to keep the office list and add any school the import missed; as **a Pariwar Admin** — I want to suggest
the right entry for a member's unlisted workplace and to run a short campaign asking members to name people who know them; and as **a
member** — I want to confirm my workplace and to be reminded to add it, invite my colleagues and name people who know me,
so that **the people asked about a death really are a member's colleagues, and as few members as possible are left with nobody to ask.**

## Policy meaning (AI-10-1)

**This part introduces ⛔ no predicate that gates a member's access to a benefit.** In the member's terms: *"a Pariwar Admin can only
suggest where you work — nothing about you changes until you say yes, and the cards on your home are reminders you can dismiss."* It
curates a list, records a suggestion and shows prompts; ⛔ no claim, contribution, pool or payment code reads anything it writes. ⚠ The
one write near who is asked about a death — the member's *"Yes"* — is a posting written by the MEMBER's own act through 6.36a's ONE
writer (I2), and 6.36 reads it like any other posting, ONLY if recorded before the cut (SW20, `-339`). The prompts' gates (RV1) REUSE
6.36b's `knownPeopleCallerSql` and the posting route's own gate — ⛔ a new eligibility rule. Checked against the Niyamavali (a rulebook,
⛔ not ratified, ⛔ not binding): ⛔ no clause governs a workplace list, a suggestion or an in-app prompt ⇒ ⛔ no conflict.

## The rulings and decisions this part builds (6.36a is the record)

- **Author-commits:** `-330` (BigDev: *"all A, SC4 yes"*) — **SW9 A** (a Pariwar Admin SUGGESTS a listed entry in the request's district;
  the MEMBER confirms; ONLY the Super Admin adds) NARROWING `-307` §2 item 2 (*"match to an entry, or add one"*); **SW16 (2)–(5)**
  SUPERSEDING IN PART `-307` §2 item 4 (the invite card is NEUTRAL — ⛔ *"No one from your workplace is a member yet"*); **SW2** (a workplace
  is a posting fact; on staff surfaces ONLY in this part's list / suggestion screens and row 6-32's inspector questionnaire) · `-333`
  call 1 (the people-who-know-me CALLER is `active` AND ⛔ named by any claim as the deceased) and call 2 (c) (*"the CALLER must still be
  `active`"*) · `-332` call 2 (migration `0164` / `…008`) and call 5 (6.36b's copy in `known_people`) · `-338` calls 1–5 (built after row
  6-36; re-validated now; shared test DBs; `0164` and the worktree kept) · `-309` item 5 (the invite: the phone's share sheet, ⛔ nothing
  about a non-member sent to the Trust) and the Trust's name from config (BigDev: *"the legal name is under registration"*).
- **Trustee-ratified (posture only):** `-133` cl.2 (*"Only Super Admin / Trustee Panel may create or materially redefine directory
  attributes"*) applied BY ANALOGY to who adds to the list — ⛔ a ruling on this list, which is ⛔ a directory attribute (SW2).
- **`2026-10-16-342`** (author-commit, this re-validation — BigDev's answers to §For BigDev): RV4 / RV8 supersede `-330` SW16 (5) / (2)
  IN PART; RV3 (staff rows only); RV9 (⛔ batch-row actor column, the audit post-commit said out loud).
- **Read, ⛔ changed:** `-339` (the cut is the death's FIRST filing — a confirm after it ⛔ never steers who is asked) · `-340` / `-341`
  (the selection's claimant exclusions — 6.36's, ⛔ touched here).
- ⛔ **SC2 is ⛔ owed** (SW9 A chosen). The v1.x conditional *"if BigDev answered SW9 B or C …"* is CLOSED.

## The re-validation rulings (RV1–RV12 — author-level engineering, this pass; ⚠ the four that NARROW or DEPART from recorded text — RV3, RV4, RV8, RV9 — were put to BigDev and ANSWERED: `2026-10-16-342`, §For BigDev)

- **RV1 — who sees which card.** Two gates: (i) the WORKPLACE flags (`noWorkplace`, `hasWorkplace`, `suggestedWorkplace`) for a member
  the posting route itself serves — ⛔ in a terminal state (`TERMINAL_STATES = {'withdrawn','anonymized'}`, `life-events/handlers.ts:51`,
  private to that module today ⇒ EXPORT it from `@twt/domain` as `MEMBER_POSTING_TERMINAL_STATES` and use it in BOTH places — ⛔ a copy);
  ⚠ the prompts read checks `members.state` (the projection) where the posting route replays events (`getMemberStateAt`,
  `handlers.ts:144-160`) — recorded; the terminal gate MATCHES SW16 (2) (a `withdrawn` / `anonymized` account is ⛔ longer a Trust
  member and the posting route already answers 409 `life_events.member_terminal` — ⛔ a narrowing); ⛔ claim check on the workplace flags (SW16 (2) gates by ⛔ state or claim; a confirm after the
  cut ⛔ steers who is asked — SW20 / `-339`; adding one would be a further narrowing of recorded text, ⛔ taken);
  (ii) every PEOPLE-WHO-KNOW-ME flag (`transferReview`, `replaceNeeded`, `campaign`, and the new `canNamePeople`) ONLY for
  `knownPeopleCallerSql` (`packages/domain/src/member/known-people.ts:111` — `active` AND ⛔ claim-named; `-333` call 1). ⚠ SW16's
  *"only `active`"* is read WITH `-333` call 1 — a bare `members.state = 'active'` check is WRONG (a claim-named member would get a card
  whose screen answers 403).
- **RV2 — the prompts route is the ONE documented exception to 6.36b's "ONE 403 on every route".** `GET /api/v1/member/known-people/prompts`
  answers 200 for any member session — a non-caller gets the people flags `false` (⛔ a 403: the workplace flags are for a wider set).
  `-333` call 1 (a) (*"every 6.36b route admits a caller who is `active` AND whom ⛔ claim (in any state) names as the deceased"*) is ⛔
  widened: this route is 6.36c's, and every people flag on it is gated by that SAME predicate;
  the routes header (`apps/api/src/modules/known-people/routes.ts:3-8` — *"SEVEN routes … ONE 403 … otherwise"*) and the specs that
  enumerate the seven (`apps/api/tests/integration/known-people/known-people.spec.ts:109-125`, `:329`) are UPDATED to name the eighth and
  its exception.
- **RV3 (`-342` call 4) — rename / delist / relist apply to STAFF rows only** (`source = 'staff'`; an imported row ⇒ 422 `workplace.import_managed`). The
  import's upsert re-sets `name` / `district` / `status = 'listed'` on every changed or delisted IMPORT row
  (`packages/domain/src/member/workplace-import.ts:481-494`, `:519-533` — `setWhere: source = 'import'`), so a staff edit to an imported
  school would be silently undone by the next import. An imported school's name or listing is corrected by the import (the source of
  truth). Recorded as a NEW deferred-work item (Task 7).
- **RV4 (`-342` call 1) — the campaign card's population — ⚠ NARROWS SW16 (5)** (*"every `active` member of the Pariwar with fewer than three accepted
  people sees …"*): a LIVE campaign (RV6) AND `canNamePeople` AND `freeSlots > 0` AND ⛔ link with `asked_at` ≥ the campaign's start (the
  start of `starts_on`, IST). `freeSlots > 0` IMPLIES fewer than three accepted (an `unavailable` row holds a slot and is ⛔ counted as
  accepted) and ALSO hides the card from a member whose three slots are taken by people still deciding (e.g. 1 accepted + 2 asked) — they
  could ⛔ act on it (409 `limit_reached`). ⚠ A re-ask of a person with a live link writes ⛔ no row (6.36b returns the existing row) — so
  it does ⛔ end the card; recorded, ⛔ fixed.
- **RV5 — the invite carries ⛔ link** (no app / store link exists in config — the mobile env is `EXPO_PUBLIC_API_URL`, `_TRUST_NAME`,
  `_PUBLIC_SITE_ORIGIN`, `_HELPLINE_TEL`, `_LOOP_TIMING`; `APP_LINKS_HOST` is a build-time universal-link host for `/peer-request` only).
  The card REUSES 6.36b's message and share code (`known_people.invite.message` / `invite.message_no_name`,
  `apps/mobile/app/(life-events)/known-people-find.tsx:357-364`) — extracted to ONE helper both call (a second consumer now exists).
- **RV6 — the campaign's window.** IST dates; *"up to 30 days"* = at most 30 calendar days INCLUSIVE ⇒ `ends_on - starts_on <= 29` (v1.x's
  `<= 30` allowed 31); `starts_on` ≥ today (IST); LIVE ⇔ `ended_at IS NULL AND starts_on <= today <= ends_on` (IST); OPEN ⇔ `ended_at
  IS NULL AND ends_on >= today` (live OR scheduled); ⛔ two OPEN campaigns of one Pariwar whose windows overlap (409); `/end` ends any
  OPEN campaign (a scheduled one is cancelled before it starts).
- **RV7 — ONE home card at a time.** The home is already long (the ScrollView note, `apps/mobile/app/(tabs)/index.tsx:45-50`); one
  container renders the FIRST APPLICABLE AND UN-DISMISSED card in the order (c) suggestion → (a) add workplace → (e) replace → (d)
  transfer → (f) campaign → (b) invite. ⛔ Card (a) while `suggestedWorkplace` is non-null — EVEN if (c) is dismissed (the member has a
  pending suggestion to answer on the Workplace screen, ⛔ a workplace to add).
- **RV8 (`-342` call 2) — `noWorkplace` is false in a Pariwar with ⛔ imported list — ⚠ NARROWS SW16 (2)** (*"a member whose latest posting names ⛔ no
  workplace … (no posting, a district-only posting, an unconfirmed 'isn't listed') sees 'Add your workplace'"*): in a Pariwar with ⛔ list
  (`pariwarHasWorkplaceList` false) the posting screen offers only the district (SW7), so the card would lead nowhere. A district-only
  posting made BEFORE the Pariwar's import still shows the card once the list exists.
- **RV9 — the import batch row gets ⛔ actor column — ⚠ DEPARTS from a recorded instruction (`-342` call 3).** The record,
  verbatim (`packages/domain/src/member/workplace-import.ts:35-37`; the same in `packages/domain/scripts/README-import-workplaces.md:66-69`
  and 6.36a's review patch, applied under BigDev's *"1"*): *"Story 6.36c's staff list / suggestion route — the FIRST HTTP caller of a list
  mutation — MUST carry the actor and the audit pair in the SAME transaction, and an actor column on the batch row lands with 6.36c's
  migration (0164)."* What this part does: (i) ⛔ batch-row actor column — this part's routes ⛔ never call `writeWorkplaceImport` /
  `renameWorkplaceDistrict` and ⛔ never write a batch row, and the CLI still has ⛔ HTTP actor, so the column would be NULL for ever;
  (ii) the ACTOR is carried in the SAME transaction (`created_by_actor_id` on a staff add, `suggested_by_actor_id` on a suggestion); (iii)
  ⚠ the *"audit pair in the SAME transaction"* is ⛔ met — the audit line is a POST-COMMIT log (`emitAuthAudit`, every admin writer's
  shape) and ⛔ event is written; a rename / delist / relist / close carries its actor ONLY in that post-commit audit line (`workplaces` has ⛔
  `updated_by` column). Task 1.4 rewrites the comment and the README to say exactly this — ⛔ silently.
- **RV10 — one confirm question, one wording.** 6.36a already renders an open suggestion in the history as `workplace.request_suggested`
  = *"Suggested: {name} — is that right?"* (`packages/i18n/locales/en/workplace.json:62`; `apps/mobile/lib/workplace.ts:150-155`). That
  key becomes *"Suggested: {name}"* (en + hi) and the QUESTION is asked once, with Yes / No, at the top of the Workplace screen and on
  home card (c): *"We think your workplace is {name}, {district}. Is that right?"*.
- **RV11 — a stale suggestion goes back to the Pariwar Admin.** On *"Yes"*, if the suggested workplace is ⛔ no longer `listed` or its
  district is ⛔ no longer the request's (an import can move an imported school's district — `workplace-import.ts:481-494` — moving the
  workplace but ⛔ the request), the route moves the request `suggested → pending` (the three suggestion columns NULLed), COMMITS that,
  and answers 409 `workplace.suggestion_stale`; the request reappears in the queue.
- **RV12 — copy namespaces.** Workplace cards and the confirm question in `workplace`; the people-who-know-me cards ((d), (e), (f), and
  (b)'s *"Add people who know you"*) in `known_people` (`-332` call 5's namespace; its reason — two parallel branches — no longer
  applies, so this is a choice, recorded).

## For BigDev — four departures from recorded text (author-level, ⛔ Panel; §0 gate: each NARROWS a staff power or a prompt and changes ⛔ nothing a member is owed)

| # | Recorded text (verbatim) | This file | Why |
|---|---|---|---|
| RV9 | *"… MUST carry the actor and the audit pair in the SAME transaction, and an actor column on the batch row lands with 6.36c's migration (0164)."* (`workplace-import.ts:35-37`; 6.36a review patch) | ⛔ batch-row column; actor in-row on add / suggest; audit post-commit; ⛔ event | ⛔ caller writes a batch row here; the CLI has ⛔ actor; ⛔ admin writer in the repo audits in-tx |
| RV3 | v1.x AC2: *"POST `/:workplaceId/rename`; POST `/:workplaceId/delist`"* (any row) | STAFF rows only; + `relist` | the next import silently undoes a staff edit to an imported row |
| RV4 | SW16 (5): *"every `active` member of the Pariwar with fewer than three accepted people sees 'Add people who know you'"* | + `freeSlots > 0` | a member with ⛔ free slot cannot act on the card |
| RV8 | SW16 (2): *"a member whose latest posting names ⛔ no workplace … sees 'Add your workplace'"* | ⛔ in a Pariwar with ⛔ list | the screen offers ⛔ workplace to pick there |

✅ **ANSWERED 2026-10-16 — BigDev took the recommended option on all four** (*"Drop column, say so"* · *"Staff rows only"* · *"Accept
both"*) ⇒ **`2026-10-16-342`** (author-commit, committed ALONE `61332dae` BEFORE any 6.36c code): call 1 = RV4, call 2 = RV8, call 3 =
RV9, call 4 = RV3. RV4 and RV8 SUPERSEDE `-330` SW16 (5) / (2) IN PART — cite `-342`, ⛔ SW16, for those two conditions.

## Shipped substrate (read at `301d96d8` — ⛔ rebuild any of it)

- **Tables (0161, `packages/domain/migrations/0161_member-workplaces.sql`):** `workplaces` (:131-173 — `kind` `school|office`, `name`
  CHECK `char_length(btrim(name)) BETWEEN 1 AND 200` (⚠ ⛔ `name = btrim(name)`), `district` FK → `workplace_districts`, `block_code` /
  `pincode` `^[0-9]{6}$`, `udise_school_code` `^[0-9]{11}$` UNIQUE per Pariwar ACROSS both sources, `source` `import|staff`, `status`
  `listed|delisted`, `created_by_actor_id uuid NULL`, ⛔ `village_name` length CHECK; UPDATE grant: `name, district, status, updated_at,
  cluster_name, village_name, pincode, block_code, import_batch_id` — ⛔ `kind`, the code, `source`, `created_by_actor_id` ⇒ set the actor
  at INSERT; ⛔ trigger — set `updated_at` by hand) · `workplace_districts` (:108-128 — `listed|retired`) · `workplace_requests` (:176-214;
  the guard :216-294 — states `pending|suggested|confirmed|withdrawn|closed` (:202) ⇒ ⛔ ALTER for `closed`; `suggested_workplace_id`,
  `suggested_by_actor_id`, `suggested_at` ALREADY EXIST (:185-187), `resolved_at` (:188); `suggested_check` (:203) ⛔ requires the actor; the
  partial index `workplace_requests_open_idx (pariwar_id, district) WHERE state IN ('pending','suggested')` is *"6.36c's queue"* (:213-214);
  the guard allows `pending → suggested|withdrawn|closed`, `suggested → confirmed|pending|withdrawn|closed`, ⛔ `suggested → suggested`,
  and lets the three suggestion columns change only on a move INTO `suggested` or back to `pending` (:281-287) — ⛔ it FORCES the NULLs) ·
  `member_postings` (:298-305 — `num_nonnulls(workplace_id, workplace_request_id) <= 1` (:304) ⇒ the confirming posting names the
  workplace and ⛔ its request; 6.36 depends on exactly that — `peer-mesh-read.ts:369-370`). RLS on all four: ENABLE + FORCE, per-command
  tenant policies on `app.pariwar_id`, ⛔ DELETE (`packages/domain/src/policies/workplaces-rls.ts`).
- **The ONE posting writer:** `insertMemberPosting(db, input)` (`packages/domain/src/member/posting.ts:54-80`; input :20-43 —
  `memberId, pariwarId, district, pariwarRef?, isRetirement?, workplaceId?, workplaceRequestId?, startedOn?, exceptRequestId?`). It runs
  on the CALLER's transaction, has ⛔ "arms" and ⛔ date check — after the insert it withdraws every open request ⛔ in `keep` = [its own
  `workplaceRequestId`, `exceptRequestId`] (`withdrawOlderOpenRequests`, `packages/domain/src/member/workplace.ts:431-449`). The ARMS live
  in the HANDLER (`apps/api/src/modules/life-events/handlers.ts:291-353`).
- **Domain helpers** (`packages/domain/src/member/workplace.ts`): `WORKPLACE_REFUSAL_CODES` (:59-65, in lockstep with the contracts'
  `packages/contracts/src/members/workplace.ts:34-40`) · `isValidStartDate` (:172-178 — strict `< previous` refused) ·
  `istToday(now)` (:164 — IST `YYYY-MM-DD`) · `pariwarHasWorkplaceList` (:205-212) · `lockListedDistrict` (:247-254, `FOR SHARE`) ·
  `searchWorkplaces` (:296-327, member search, listed only) · `getListedWorkplace` (:330-338) · `lockListedWorkplace(db, pariwarId,
  workplaceId)` (:345-365 — ⛔ district argument; locks the workplace's district then the workplace `FOR SHARE`; `null` for an unknown or
  delisted workplace or a retired district, else the row with ITS district) ·
  `lockMemberPostingWrites` (:373-375 — `pg_advisory_xact_lock(hashtext('member_posting:'||memberId))`) · `latestPostingStartedOn`
  (:378-386) · the history read with `request.suggested` (:469-470, :537-543).
- **The posting route** (`apps/api/src/modules/life-events/`): `LIFE_EVENTS_BASE = '/api/v1/member/life-events'` (`routes.ts:49`);
  `POST /posting` (:111-123, `preHandler: [memberSession]`, the `memberWrite` per-member rate limit :103-108); `GET /postings`
  (:146-153). `updatePosting` (`handlers.ts:231-422`): the closure-local `requireIdempotencyKey` (:93-100 — 400
  `life_events.idempotency_key_required`), key `life_events.posting_update:${pariwar}:${member}:${key}`, 24 h TTL (:59, :234-246);
  `openScopeTx` INSIDE the claim's try (:266); `assertMemberExistsAndNotTerminal` (:269); `lockMemberPostingWrites` FIRST (:274);
  `insertMemberPosting` (:355); `projectMemberState(… 'member.posting_updated' …)` (:367-386, inside the tx); `closeScopeTx` (:394);
  `recordResult` (:401-407); `emitAuthAudit(… 'member_life_events.posting_updated', { context: { district, choice, is_retirement } })`
  (:409-413, AFTER the commit); `releaseClaimWithRetry` unless committed (:420). Domain refusals ⇒ 422 via `refuse()` (:62-73). ⛔ The
  member has ⛔ route of its own for requests — they see one only through `GET /postings` (`request.state` + `request.suggested`).
- **6.36b (people who know me):** `member_known_people` (0162 — states `asked|accepted|declined|lapsed|removed|withdrawn|erased`;
  `asked_at`, `responded_at`, `ended_at`; ⛔ `created_at`). `packages/domain/src/member/known-people.ts`: `namedByClaimSql` (:85),
  `knownPersonEligibleSql` (:98 — the TARGET side, `active` OR `active-in-grace`), `knownPeopleCallerSql` (:111), `isKnownPeopleCaller`
  (:116), `namedUnavailableSql` (:127-129 — ⚠ NOT exported), `listMyKnownPeople` (:495 — `freeSlots` = 3 − live `asked` + `accepted`,
  `unavailable` included, :489 / :537; the `accepted` label excludes `unavailable`, :513). API module `apps/api/src/modules/known-people/`
  (`KNOWN_PEOPLE_BASE` `routes.ts:34`; `requireMemberSession` :39; rate limits :40-41; registered `apps/api/src/server.ts:297`); its
  number fence `apps/api/tests/unit/known-people-number-fence.test.ts:28-51` pins EXACT sink counts in `handlers.ts`. Contracts
  `packages/contracts/src/members/known-people.ts` (`.strict()`; `MyKnownPeopleResponse` :97; label enum incl. `unavailable` :59).
- **Mobile:** home `apps/mobile/app/(tabs)/index.tsx` — `<ActiveContributionCard/>` (the My Pool card, TOPMOST — Story 8.2) :52-54,
  `<ViewContributorsEntry/>` :57, `<SahyogVivranEntry/>` :64, `<PeerRequestEntry/>` :69, `<KnownPeopleRequestEntry/>` :72,
  `<LockInClockWidget/>` :73 ⇒ the new container mounts AFTER :72, BEFORE :73. Life Events → Workplace = `/(life-events)/posting`
  (`apps/mobile/app/(life-events)/posting.tsx`; header :6 — *"⛔ No confirm question here — … Story 6.36c's, with its route"*);
  `apps/mobile/components/workplace/` (`WorkplacePicker.tsx`, `useWorkplaceQueries.ts` — keys `['workplace', pariwarId, memberId, …]`,
  `gcTime: 0`); people screen `/(life-events)/known-people`; `apps/mobile/components/known-people/` (`useKnownPeopleQueries.ts` —
  `withReadTimeout` 15 s :46, a 403 kept as data :107-112; `known-people-cache.ts` keys `['known-people','v1',pariwarId,memberId,…]`,
  `gcTime: 0`). Clients in `packages/api-client/src/index.ts`: `createMemberAuthClient` (:369; `postingHistory` :906) and
  `createMemberKnownPeopleClient` (:1618-1650), bound in `apps/mobile/lib/known-people-api.ts`. Trust name: `configuredTrustName()`
  (`apps/mobile/lib/trust-name.ts:6`, `EXPO_PUBLIC_TRUST_NAME`, `null` ⇒ the `*_no_name` copy). MMKV: `apps/mobile/lib/mmkv.ts`
  (`mmkvStorage`); precedent `known-people.saved-names.v1` + `clearSavedNames` (`apps/mobile/lib/known-people-saved-names.ts:11`),
  called from `apps/mobile/lib/session-context.tsx` in THREE places — the terminated refresh (:72), the rejected refresh (:83), `signOut`
  (:108); `signIn` (:91-93) clears only `clearPeerRequestsCache` + `clearKnownPeopleCache` — EXPLICIT clear calls, ⛔ prefix scan. ⛔
  30-day dismissal precedent exists on the phone.
- **Admin / API precedents:** `apps/api/src/modules/approval-warning-reasons/routes.ts` (`chain` :42, `writeChain` :44 — key, then
  step-up AFTER the permission hook); its handlers take the actor from `request.requestContext.actorId` (`ctxOf`, `handlers.ts:87-92`),
  READ on the request's `scopeTx`, WRITE in their own `openScopeTx` / `closeScopeTx` (:110-123), audit after commit; registered
  `apps/api/src/server.ts:269`. Either-of-two-keys gate: `requireNiyamavaliReadAccess` (`apps/api/src/modules/rules/index.ts:105-134` —
  `hasPermission(A) || hasPermission(B)`, else `requirePermission(A)` for the audited 403). Step-up: `requireStepUp(deps, context)`
  (`apps/api/src/modules/step-up/gate.ts:16-27`; ONE `elevatedAction` per session — switching contexts forces a fresh step-up). Audit:
  `AuthAuditEventType` (`apps/api/src/audit/audit-sink.ts:15-670`; precedent `admin_approval_warning_reason.*` :478-490); ⚠ `context` is
  SHA-256-hashed into the audit row — the only READABLE "what" is `emitAuthAudit`'s `resourceLocator`
  (`apps/api/src/modules/auth/shared/audit.ts:14-30`). Forced-pagination guard: `apps/api/tests/integration/forced-pagination.spec.ts`
  — sees a GET as a collection ONLY if its 200 body is an array or has an `items` array (:57-62) ⇒ every list here answers
  `paginatedResponse(item)` (`packages/contracts/src/_common/pagination.ts:60` — `{ items, nextCursor, hasMore }`) with a bounded `limit`.
  `clampLimit` (`packages/domain/src/pagination.ts:34`; gate `pnpm domain-invariants:check`). The human-actor gate
  (`scripts/claim-adjudication-human-actor-invariant/check.ts:298-312`) scans ONLY `apps/api/src/modules/claims/*.routes.ts` ⇒ this
  part's tests prove the actor binding themselves.
- **Admin app:** routes `apps/admin/src/router.tsx` (precedent :297-302, `routeTree` :369-409) + a route WRAPPER per page in
  `apps/admin/src/routes/` (`ApprovalWarningReasonsRoute.tsx` — session check, `<Page key={pariwarId} …/>`); nav
  `apps/admin/src/routes/RootLayout.tsx` (Pariwar context from `useParams({strict:false})` :39; link shape :119-122); ⚠
  `session.data?.nationalGrants` (:32) carries GLOBAL grants only ⇒ a Pariwar Admin's `workplace.review` is ⛔ there; `apiFetch` is
  private (`apps/admin/src/api/client.ts:367`) — add exported functions beside the reasons ones (:3013-3027); hooks
  `apps/admin/src/api/hooks.ts` (precedent :2328-2370); step-up in a page: `ApprovalWarningReasonsPage.tsx:161-215`
  (`useRequestStepUp` / `useVerifyStepUp`, `hooks.ts:318` / `:337`; `auth.step_up_required` ⇒ a held `pendingWrite`); page test
  `apps/admin/tests/approval-warning-reasons-page.test.tsx` (mocks `@tanstack/react-router` and `../src/api/client.js` per function; renders
  `RootLayout` for the nav); `apps/admin/vitest.config.ts:16-20` (jsdom, `globals: true`). ⚠ The admin bundle ⛔ imports `@twt/domain`.
- **RBAC:** `PERMISSION_CATALOG_VERSION = 51` (`packages/domain/src/rbac/permissions.ts:755`; last notes :735-754); `SEED_PERMISSION_KEYS`
  ends :1318-1319 (`'approval_warning_reason.manage'`); `super_admin` = every catalog key (`roles.ts:311-317`, rationale :286-296);
  `pariwar_admin` bundle `roles.ts:319-470` (array :327-468); pins `packages/domain/tests/rbac/permissions.test.ts:230` (51) and `:232`
  (65 keys). ⛔ permissions table, ⛔ seeding migration (bundles live in code; `role_grants` stores roles only).
- **Friction budget:** `/friction-budget.md` rows `| payer | protects | event_type |` (:25-56; `optional` | `forced`); 6.36a's row is
  `forced`, 6.36b's `optional`; the AC-4 check diffs COMMITTED history against the merge-base with `origin/main`
  (`scripts/friction-budget/check.ts:60-93`) and passes only on a new / amended row or a `**Story <id> disposition (...)**` block.
  **Row 31 (f)** = `docs/launch-gate-inventory/inventory-roster.md` (the Hindi human review of every new member screen of the set, :555;
  per-story note precedent (7) :561).

## Acceptance Criteria

1. **AC0 — start condition MET.** Row 6-36 is `done` and on `main` (`-338` call 1). Migration `0164` / `when` `1794195600008` (`-332`
   call 2 — a migration that reaches a database after a higher-numbered one is SILENTLY SKIPPED: ⛔ renumber, ⛔ merge after a `0165`).
2. **AC1 — RBAC** (`PERMISSION_CATALOG_VERSION` `51 → 52`, ONCE; keys `65 → 68`): append to `SEED_PERMISSION_KEYS`, each with a comment
   block — `workplace.manage` (`super_admin` ONLY — derives every key ⇒ ⛔ `roles.ts` const; the `approval_warning_reason.manage`
   precedent), `workplace.review` and `known_people.run_campaign` (`pariwar_admin` + derived `super_admin` — two consts + two entries in
   the `pariwar_admin` array); the version note names `2026-10-14-330` (SW9 A / SW16) and this story; both pins updated with a ledger
   comment; a per-key holders test each (`roles.test.ts:390-398` shape); ⛔ `district_admin`, ⛔ `state_trustee`, ⛔ `block_admin`,
   ⛔ `district_verifier` on any (a test).
3. **AC2 — the Super Admin's list** (`/api/v1/p/:pariwarId/admin/workplaces`):
   - **GET** — `workplace.manage` OR `workplace.review` (the `requireNiyamavaliReadAccess` shape; the suggest picker uses it); query
     `district?`, `kind?`, `status?` (default `listed`), `q?` (name contains, case-folded), `limit` (bounded) + `cursor`; FILTERS IN SQL
     (⛔ after the `LIMIT` — 6.19c's recorded defect); ordered `name, workplace_id`; answer `paginatedResponse` of `{ workplaceId, kind,
     name, district, villageName, blockCode, udiseSchoolCode, source, status }`.
   - **POST add** `{ kind, name, district, villageName?, blockCode?, udiseSchoolCode? }` — `workplace.manage` + step-up. `name` and
     `villageName` TRIMMED, every `\p{Cc}` refused (the search cursor's bound depends on it — `packages/contracts/src/members/workplace.ts:130-136`),
     `name` 1–200, `villageName` ≤ 120; `blockCode` `^[0-9]{6}$`; `udiseSchoolCode` only for a school, `^[0-9]{11}$`, 409
     `workplace.code_taken` if the Pariwar already holds it (either source); `district` must be a LISTED `workplace_districts` spelling
     read `FOR SHARE` (`lockListedDistrict` — a retired or unknown one ⇒ 422 `workplace.district_not_found`; ⛔ a new spelling minted here —
     SW5) ⇒ a Pariwar with ⛔ import can add ⛔ office (recorded); inserts `source = 'staff'`, `status = 'listed'`,
     `created_by_actor_id` = the actor; a later import ⛔ never touches it (6.36a AC2 / I3).
   - **POST `/:workplaceId/rename`** `{ name }` (same name rules), **`/:workplaceId/delist`**, **`/:workplaceId/relist`** — `workplace.manage`
     + step-up; STAFF rows only (RV3 — an imported row ⇒ 422 `workplace.import_managed`); a delist / relist of a row already in that state ⇒
     409 `workplace.state_unchanged`; `updated_at` set; ⛔ a delete (I3 — a delisted entry stays on every posting); an unknown id or
     another Pariwar's ⇒ 404 `workplace.not_found`.
   - **Audit** (after commit, each with `resourceLocator: 'workplace:<id>'`): `admin_workplace.added` / `.renamed` / `.delisted` /
     `.relisted` (context: kind, district — hashed; ⛔ the name text).
4. **AC3 — the Pariwar Admin's queue** (`/api/v1/p/:pariwarId/admin/workplace-requests`):
   - **GET** — `workplace.review`; `state` = `pending` (default) | `suggested`; `district?`; newest first by `(created_at, request_id)`,
     cursor-paginated, bounded, filtered IN SQL (the open index); each item `{ requestId, typedName, typedPlace, district, startedOn,
     createdAt, state, sameNameCount, suggested: { workplaceId, name, district } | null }` where `sameNameCount` = the Pariwar's OTHER
     `pending` requests (⛔ itself) with the same typed name folded (`lower(regexp_replace(btrim(typed_name), '\s+', ' ', 'g'))` — ⚠ inside a
     JS template / `sql` tag write `\\s+`, or `\s` cooks to `s`; an erased `typed_name` ⇒ 0) —
     ⛔ the member's name, mobile, member id or any other member data on the wire (a contract test asserts the key set).
   - **POST `/:requestId/suggest`** `{ workplaceId }` — `workplace.review` + step-up. Order (the rename CLI's lock order — district →
     workplace → request): `w = lockListedWorkplace(tx, pariwarId, workplaceId)` (`null` ⇒ 422 `workplace.not_found` — unknown, delisted,
     another Pariwar's); then the request `SELECT … FOR UPDATE` in this Pariwar (unknown / other-Pariwar ⇒ 404 `workplace.request_not_found`;
     ⛔ `pending` ⇒ 409 `workplace.request_closed` — a re-suggestion goes BACK through `pending`, which only the member's *"No"* or RV11
     does); `w.district` ≠ the request's district ⇒ 422 `workplace.district_mismatch` (a same-named school elsewhere would move the
     member's district, SW5); ⇒ `suggested` with `suggested_workplace_id`, `suggested_by_actor_id` = the actor, `suggested_at = now()`;
     audit `admin_workplace.request_suggested` (`resourceLocator: 'workplace_request:<id>'`).
   - **POST `/:requestId/close`** — `workplace.review` + step-up; the request `FOR UPDATE`; `pending` or `suggested` ⇒ `closed` +
     `resolved_at`, the suggestion columns LEFT as they are (the guard refuses a change to them on a move to `closed`); any other state ⇒
     409 `workplace.request_closed` (⛔ a guard error surfacing as a 500); audited `admin_workplace.request_closed`. (An entry that names
     ⛔ real workplace.)
   - ⛔ No staff route writes a posting (a test greps the module for `insertMemberPosting`). A Pariwar Admin can ⛔ never ADD — a test that
     `workplace.review` alone gets 403 on every AC2 write.
   - ⛔ The refusals are keyed on the WORKPLACE and the REQUEST, ⛔ on anything about the member (footgun #46 — ⛔ an oracle for withheld data).
5. **AC4 — the member answers** (`POST /api/v1/member/life-events/workplace-requests/:requestId/answer` `{ answer: 'yes' | 'no' }`, in
   6.36a's life-events module, through the SAME closure-local `requireIdempotencyKey`, keyed store, 24 h TTL and `releaseClaimWithRetry`
   as `updatePosting` — ⛔ an eighth copy of the key helper; its OWN key prefix `life_events.workplace_answer:${pariwar}:${member}:${key}`
   (⛔ `posting_update:` — one key must ⛔ replay across routes); the `memberWrite` rate limit). Gate = the posting route's
   (`assertMemberExistsAndNotTerminal`, ⛔ claim check — a confirm after the cut ⛔ steers who is asked, SW20 / `-339`; recorded). Params
   `z.object({ requestId: z.string().uuid() }).strict()` (⛔ a 22P02 500). The HANDLER runs step 1 and the projection; the domain
   `answerWorkplaceSuggestion(scopeTx.tx, …)` runs steps 2–4 minus the projection and RETURNS `{ kind: 'confirmed', posting: {
   workplaceId, workplaceKind, district, startedOn } } | { kind: 'declined' } | { kind: 'stale' }` (it ⛔ throws for stale; its refusals throw a NEW `WorkplaceAnswerRefusedError` typed to `WORKPLACE_ANSWER_REFUSAL_CODES` — ⛔
   `WorkplaceWriteRefusedError`, which stays typed to the unchanged posting codes; it takes `input.now` from the handler). ONE
   transaction, in this order (district → workplace → request, the rename CLI's order — ⛔ a 40P01):
   1. `assertMemberExistsAndNotTerminal`; **`lockMemberPostingWrites` FIRST** (serializes against a concurrent posting that would withdraw
      the request);
   2. a PLAIN read of the request — ⛔ the CALLER's (another member's or an unknown id ⇒ the SAME 404 `workplace.request_not_found`); ⛔
      `suggested` (e.g. `withdrawn` because the member posted since, or `closed`) ⇒ 409 `workplace.request_closed`;
   3. **"No"** ⇒ the request `FOR UPDATE`, state re-checked, `suggested → pending` with `suggested_workplace_id`, `suggested_by_actor_id`,
      `suggested_at` ALL NULL (the 0164 guard enforces it) ⇒ `declined`. It reappears in the queue.
   4. **"Yes"** ⇒ `w = lockListedWorkplace(tx, pariwarId, request.suggested_workplace_id)`; then the request `FOR UPDATE`, state AND
      district re-checked (a concurrent `--rename-district` moves an open request's district); `w === null || w.district !==
      request.district` ⇒ RV11 (back to `pending`, NULLed) ⇒ `stale`; else `isValidStartDate(request.started_on, input.now /* the handler passes deps.clock() */,
      await latestPostingStartedOn(tx, pariwarId, memberId))` else 422 `workplace.start_date_invalid`; mark the request `confirmed` + `resolved_at` FIRST; then
      `insertMemberPosting({ workplaceId: w.workplaceId, district: w.district, startedOn: request.started_on, exceptRequestId: requestId })`
      (⛔ `workplaceRequestId` — the one-of-two CHECK) ⇒ `confirmed`. The HANDLER then runs `projectMemberState(scopeTx.client, …)`
      (`project.ts:73` takes the `pg` client, ⛔ the Drizzle `Db`) `member.posting_updated` with the posting route's payload shape
      (`workplace_id`, `workplace_kind`, `started_on`, `not_listed: false`; `trigger: 'life_events_workplace_confirm'`) and `buildSummary`.
   - **ONE response schema** (contracts): `WorkplaceAnswerResponse = z.discriminatedUnion('answer', [z.object({ answer: z.literal('yes'),
     summary: LifeEventsSummaryResponse }).strict(), z.object({ answer: z.literal('no') }).strict()])` — the route's 200, what
     `recordResult` stores for BOTH kinds, and what a replay `safeParse`s.
   - **The handler** sets `ok = true` for ALL THREE kinds and commits; then — `confirmed` ⇒ `recordResult` + 200 `{ answer: 'yes',
     summary }` + audit `member_life_events.posting_updated` exactly as `updatePosting` (choice `workplace`, `is_retirement: false`);
     `declined` ⇒ `recordResult` + 200 `{ answer: 'no' }` + audit `member_life_events.workplace_suggestion_declined`; `stale` ⇒ call
     `releaseClaimWithRetry` EXPLICITLY (after the commit `committed = true`, so `updatePosting`'s shared `finally` —
     `if (!claimSettled && !committed)`, `handlers.ts:420` — would ⛔ release it; a retry then sees `pending` ⇒ 409 `request_closed`) and
     throw 409 `workplace.suggestion_stale` AFTER `closeScopeTx(scopeTx, true)`, outside the inner try.
   - After a `closed`, the Workplace screen's history row reads *"We could not find '{typed_name}'. Please choose your workplace again."*
     (the history already carries `request.state`).
6. **AC5 — the prompts endpoint** (`GET /api/v1/member/known-people/prompts`, in 6.36b's module, RV2's exception; ONE read in ONE scope
   tx) ⇒ `{ noWorkplace, hasWorkplace, suggestedWorkplace: { requestId, workplaceId, name, district } | null, transferReview, replaceNeeded,
   canNamePeople, campaign: { campaignId } | null }` (`.strict()`):
   - **Workplace flags** (RV1 (i) — else all false / null): `noWorkplace` = the Pariwar HAS a list (RV8, `-342` call 2) AND (⛔ posting, or the latest
     posting names ⛔ workplace and is ⛔ a retirement — a district-only posting, an unconfirmed *"isn't listed"*); `hasWorkplace` = the
     latest posting names a workplace (listed or since delisted); `suggestedWorkplace` = the member's request in state `suggested` (at most
     one is open — the writer withdraws older ones), with the workplace's name and district.
   - **People flags** (RV1 (ii) — `knownPeopleCallerSql`, else all false / null): `canNamePeople` = the caller predicate itself;
     `transferReview` = the latest posting names workplace W, the most recent EARLIER posting that names a workplace names a DIFFERENT one,
     and the latest was recorded within 30 days (⛔ never after a retirement — it names ⛔ workplace; ⛔ never for a first confirmed
     *"isn't listed"* — there is ⛔ earlier workplace; ⚠ the confirming posting ⛔ points at its request — the CHECK); `replaceNeeded` = at
     least one ACCEPTED link of the caller that `namedUnavailableSql` marks (EXPORT it from `known-people.ts` — ONE definition; withdrawn
     from the Trust or named by a claim; ⛔ a late renewal; an erased link has ended — SW16 (4)) — ⛔ a name, ⛔ a count, ⛔ why;
     `campaign` = RV4 (`-342` call 1).
   - ⛔ No flag depends on whether OTHER members are at a workplace (SW16 (2) — a test seeds a lone member and a member with colleagues and
     asserts identical flags).
7. **AC6 — the home cards** (RV7 — ONE container `<HomePromptCards/>` mounted after `<KnownPeopleRequestEntry/>` (`index.tsx:72`), before
   `<LockInClockWidget/>`; self-suppresses on load / error / no card; the My Pool card stays TOPMOST). Each card dismissible for 30 days on
   the phone (MMKV — a per-viewer convenience; (f) dismissed per `campaignId`, (c) per `(requestId, workplaceId)` — a re-suggestion after a "No" keeps the `requestId`):
   (a) `noWorkplace` ⇒ *"Add your workplace"* → `/(life-events)/posting`;
   (b) `hasWorkplace` ⇒ *"Invite your colleagues to join"* — *"Invite"* opens ONE share sheet per tap (RV5's helper — the member's own
   message, the Trust's name from config, ⛔ link; ⛔ "invite all") and, ONLY when `canNamePeople`, *"Add people who know you"* →
   `/(life-events)/known-people`;
   (c) `suggestedWorkplace` ⇒ RV10's question with *"Yes"* / *"No"* (AC4's route);
   (d) `transferReview` ⇒ *"You have a new workplace — check the people who know you."* → `/(life-events)/known-people`;
   (e) `replaceNeeded` ⇒ *"Someone who knows you can no longer be asked — add someone else."* — ⛔ never who, ⛔ never why (SW16 (4)) →
   `/(life-events)/known-people`;
   (f) `campaign` ⇒ *"Add people who know you"* → `/(life-events)/known-people`.
   The Workplace screen (`posting.tsx`) gains the same question block (c) above the history, driven by the PROMPTS' `suggestedWorkplace`
   (RV1 (i) — ⛔ the history's ungated `request.suggested`); its header note (:6) updated.
8. **AC7 — the campaign** (`/api/v1/p/:pariwarId/admin/known-people-campaigns`; `known_people.run_campaign`; ⛔ step-up — it shows a card
   and sends nothing; recorded): **POST** `{ startsOn, endsOn }` (IST dates, RV6; 422 `known_people_campaign.window_invalid`; an overlap with a
   OPEN campaign (RV6) ⇒ 409 `known_people_campaign.overlap` — the writer takes
   `pg_advisory_xact_lock(hashtext('known_people_campaign:' || pariwarId))` FIRST);
   **POST `/:campaignId/end`** (any OPEN campaign — live or scheduled; already ended or past ⇒ 409 `known_people_campaign.not_live`; an
   unknown or another Pariwar's id ⇒ 404 `known_people_campaign.not_found`; the row `FOR UPDATE`; sets `ended_at`, `ended_by_actor_id`);
   codes in `KNOWN_PEOPLE_CAMPAIGN_REFUSAL_CODES` (`window_invalid` 422, `overlap` 409, `not_live` 409 — ⚠ the name is historical: it means ⛔ OPEN, `/end` also ends a scheduled one, `not_found` 404), mirrored in
   contracts with a lockstep assertion;
   **GET** list (paginated, newest first). Audit `admin_known_people.campaign_started` / `.campaign_ended` (`resourceLocator:
   'known_people_campaign:<id>'`). ⛔ No message to any phone: a test asserts ⛔ dispatcher / SMS / push / WhatsApp call on start, and a
   source scan of the campaign module finds ⛔ `@twt/channels` import.
9. **AC8 — the admin pages** (`apps/admin/src/modules/workplaces/`): `WorkplacesPage` (Super Admin — list with filters, add, rename,
   delist / relist; imported rows read-only, labelled by `source`) and `WorkplaceRequestsPage` (Pariwar Admin — the queue with the
   `pending` / `suggested` toggle, a suggest picker that searches LISTED entries of the REQUEST's district through AC2's GET (⚠ the
   district as LOADED — a `--rename-district` between loading and picking shows an empty picker until the queue refetches; recorded),
   close; the
   campaign control: start with two dates, end, the list); each with a route wrapper in `apps/admin/src/routes/` and a `createRoute` in
   `router.tsx` under `/p/$pariwarId/…`; nav in `RootLayout.tsx` inside a Pariwar context — the Workplaces link gated on
   `nationalGrants.includes('workplace.manage')`, the Requests link UNGATED (a Pariwar grant is ⛔ in `nationalGrants`; the server's 403
   is the gate — the closure-decisions link precedent); step-up like `ApprovalWarningReasonsPage`, with the contexts imported from
   `@twt/contracts` (⛔ hard-coded); `i18n-en.ts` per module; a page test each (+ the nav assertion).
10. **AC9 — records and close:** `friction-budget.md` gains TWO `optional` rows (the home prompts + campaign card; the confirm question);
    Row 31 gains a per-story note naming this part's member screens and keys for (f)'s Hindi review; `deferred-work.md` — the 6.36a items
    with a 6.36c trigger dispositioned EXACTLY (Task 7); `workplace-import.ts:28-38` records RV9; `pnpm ci:local` green on the shared DBs.

## Tasks / Subtasks

- [x] **Task 1 — migration `0164_workplace-curation-and-campaigns.sql` (AC2–AC4, AC7)** + journal idx 164 `when` `1794195600008`
      (⛔ snapshot files past 0020 — journal + SQL only, as 0163); applied on `:5433` AND `:5432`.
  - [x] 1.1 `known_people_campaigns`: `campaign_id uuid pk default gen_random_uuid()`, `pariwar_id uuid not null` (⛔ FK — there is ⛔
        `pariwars` table, `0073_pool-naming.sql:20`; tenancy is RLS + the writer's explicit `pariwar_id`, as in 0161 / 0162),
        `started_by_actor_id uuid not null`, `starts_on date not null`, `ends_on date not null`, `ended_at timestamptz null`,
        `ended_by_actor_id uuid null`, `created_at timestamptz not null default now()`; CHECK `ends_on >= starts_on AND ends_on - starts_on
        <= 29` (RV6); CHECK `(ended_at IS NULL) = (ended_by_actor_id IS NULL)`; UNIQUE `(pariwar_id, campaign_id)`; index `(pariwar_id,
        ends_on DESC)`; RLS ENABLE + FORCE with per-command tenant policies (the `workplaces-rls.ts` shape) + the policy spec; GRANT SELECT,
        INSERT, UPDATE (`ended_at`, `ended_by_actor_id`); ⛔ DELETE. Drizzle `packages/domain/src/schema/known_people_campaigns.ts` +
        schema barrel.
  - [x] 1.2 `workplaces`: ADD CHECK `name = btrim(name)` (closes the deferred *"`workplaces.name` ⛔ stored trimmed"*; the import already
        `.trim()`s — `workplace-import.ts:321` — so existing rows pass; if the ADD fails on a live DB, find the row — ⛔ `NOT VALID`).
  - [x] 1.3 `workplace_requests`: `CREATE OR REPLACE` the guard function so a move INTO `pending` REQUIRES the three suggestion columns
        NULL, and a move INTO `suggested` REQUIRES `suggested_by_actor_id` NOT NULL (closes *"`suggested → pending` may keep stale suggestion
        columns"*); keep every other arm byte-identical (erasure, rename); a spec leg per new refusal. ⚠ EXISTING FIXTURES suggest WITHOUT
        an actor and must set `suggested_by_actor_id`: `packages/domain/tests/integration/rls/workplaces-policy-regression.spec.ts:93`
        (the `moveTo` helper every state-parameterised leg uses) and `:347-353`; `packages/domain/tests/integration/member/workplace.spec.ts:199`,
        `:249`, `:337`; `packages/domain/tests/integration/member/import-workplaces.spec.ts:315` (grep `state = 'suggested'` across
        `packages apps` for any other). `workplaces-policy-regression.spec.ts:365` (`move(b, 'suggested')` ⇒ `'23514'`) becomes the GUARD
        code (a BEFORE trigger fires before the CHECK) — keep a leg proving `suggested_check` still fires (actor present, `suggested_at`
        NULL ⇒ `'23514'`).
  - [x] 1.4 ⛔ `workplace_import_batches` actor column (RV9, `-342` call 3) — rewrite `workplace-import.ts:35-37`'s
        RE-EXAMINATION sentence AND `packages/domain/scripts/README-import-workplaces.md:66-69` to record exactly RV9 (i)–(iii): ⛔ batch
        column (⛔ HTTP caller writes a batch row); the actor in-row on add / suggest; the audit line POST-commit and ⛔ event (the
        "audit pair in the SAME transaction" ⛔ met); the CLI's bypass stays as written.
- [x] **Task 2 — RBAC (AC1).** `permissions.ts` (three keys + note + version), `roles.ts` (two consts + two `pariwar_admin` entries),
      `permissions.test.ts` pins (52 / 68), `roles.test.ts` holders legs.
- [x] **Task 3 — the domain (AC2–AC5, AC7).**
  - [x] 3.1 `packages/domain/src/member/workplace-admin.ts`: `listWorkplacesForAdmin` (clampLimit, SQL filters, keyset cursor),
        `addStaffWorkplace`, `renameStaffWorkplace`, `setStaffWorkplaceListed` (delist / relist), `listWorkplaceRequestsForReview` (the
        same-name count as a correlated count over the open index, ⛔ an N+1), `suggestWorkplaceForRequest`, `closeWorkplaceRequest`,
        `answerWorkplaceSuggestion` (AC4's order — it takes the caller's tx, calls `insertMemberPosting`, RETURNS its kind). ⚠ Refusal
        codes: `WORKPLACE_REFUSAL_CODES` (`workplace.ts:59-65` — documented as *"The handler's domain refusals (422)"* at
        `packages/contracts/src/members/workplace.ts:33`; pinned by `apps/mobile/tests/unit/workplace.test.ts:143`; every code needs a
        member `refusal.<code>` key — `apps/mobile/tests/unit/workplace-copy.test.ts:49`; `handlers.ts:62`'s
        `Record<WorkplaceRefusalCode, string>`) stays UNCHANGED. Add `WORKPLACE_ADMIN_REFUSAL_CODES` (`not_found`, `district_not_found`,
        `district_mismatch`, `import_managed`, `state_unchanged`, `code_taken`, `request_not_found`, `request_closed`) and
        `WORKPLACE_ANSWER_REFUSAL_CODES` (`request_not_found`, `request_closed`, `suggestion_stale`, `start_date_invalid`), each mirrored in
        contracts with a lockstep assertion; the HTTP status is mapped PER ROUTE, ⛔ per code (`workplace.not_found` is 404 on AC2's
        `/:workplaceId/*` routes and 422 on AC3's body field); mobile's `refusalCopyKey` (`apps/mobile/lib/workplace.ts`) extended for the
        answer route's codes with member copy.
  - [x] 3.2 `packages/domain/src/member/known-people-prompts.ts`: `readKnownPeoplePrompts(db, pariwarId, memberId, now)` — AC5 in ONE
        round of SQL; IMPORTS `knownPeopleCallerSql` and the newly EXPORTED `namedUnavailableSql` (⛔ `namedByClaimSql` on its own — the workplace flags carry ⛔ claim check, RV1 (i))
        (`known-people.ts:127`) — ⛔ a copy. `freeSlots` is computed in JS today (`known-people.ts:536-537`). Extract ONE exported
        `liveKnownPersonSql(k)` = `(k.state = 'accepted' OR (k.state = 'asked' AND k.asked_at + make_interval(days =>
        KNOWN_PEOPLE_ANSWER_WINDOW_DAYS) > clock_timestamp()))` — written out today in `knownPersonLiveLabel` (`:457-458`) and equivalent to
        `listMyKnownPeople`'s label CASE (`:512-514`, label ≠ `not_accepted`); use it at `:457-458` and in this read (count in SQL). ⛔ Touch
        `listMyKnownPeople`'s SHOWN filter (`:519-523` — window + 30 days shown, WIDER: it keeps lapsed asks as `not_accepted`) or the ask's
        count (`:431-434`, after the lapse sweep — called at `:398` in `askKnownPerson`) — a 6.36b `listMyKnownPeople` spec stays green UNCHANGED. ONE clock per question:
        the DB's `IST_TODAY` (`known-people.ts:67` — export it) inside `liveCampaignSql` and this read; `istToday(deps.clock())`
        (`workplace.ts:164`) ONLY for AC4's start-date check (⚠ host / container clock skew — memory: DB-clock ordering).
  - [x] 3.3 `packages/domain/src/member/known-people-campaigns.ts`: `startCampaign` (advisory lock FIRST, then the overlap read),
        `endCampaign`, `listCampaigns`, `liveCampaignSql` (ONE definition, used by 3.2), `KNOWN_PEOPLE_CAMPAIGN_REFUSAL_CODES` (AC7).
  - [x] 3.3b Every new path param (`:workplaceId`, `:requestId`, `:campaignId`) is `z.string().uuid()` in its params schema (⛔ a 22P02
        500); `MEMBER_POSTING_TERMINAL_STATES` exported from `@twt/domain` and used by `life-events/handlers.ts:51` and 3.2 (RV1 (i)).
  - [x] 3.4 Barrel exports (`packages/domain/src/member/index.ts`); domain integration specs on the shared DBs: every refusal; the
        confirm's order (a concurrent posting that withdraws the request ⇒ 409, ⛔ a posting); RV11; "No" NULLs; the campaign window /
        overlap / end; each AC5 flag with a leg seeded so ONLY that clause can fire (footgun #47 (d)); RV1 legs (a claim-named active
        member ⇒ people flags false, workplace flags as for anyone; an `active-in-grace` member ⇒ workplace flags only; a `withdrawn`
        member ⇒ all false); the "other members" non-disclosure leg; TWO-CONNECTION legs (i) answer-Yes holding the workplace lock vs
        `renameWorkplaceDistrict` of its district — both finish, ⛔ `40P01`, the answer ends `confirmed` with the NEW spelling or `stale`;
        (ii) suggest vs the same rename. ⚠ Ordering tests in ONE tx tie on `now()` — separate txns (memory: DB-clock ordering).
- [x] **Task 4 — the API (AC2–AC5, AC7).**
  - [x] 4.1 `apps/api/src/modules/workplaces/` (`index.ts` `registerWorkplacesModule`, `routes.ts`, `handlers.ts`) — the
        approval-warning-reasons shape: `chain` / `writeChain` consts, the either-of-two GET gate, step-up AFTER the permission hook,
        `openScopeTx`, audit after commit with `resourceLocator`; register in `server.ts` beside `:269`.
  - [x] 4.2 The campaign routes (module `apps/api/src/modules/known-people-campaigns/` or inside 4.1 — ⛔ inside the member
        known-people module, which is member-session-gated).
  - [x] 4.3 The answer route in `apps/api/src/modules/life-events/` (`routes.ts` + a handler INSIDE `createLifeEventsHandlers` reusing
        its closure-local `requireIdempotencyKey`, the keyed store, the 24 h TTL and `releaseClaimWithRetry`).
  - [x] 4.4 The prompts route in `apps/api/src/modules/known-people/routes.ts` (`GET ${KNOWN_PEOPLE_BASE}/prompts`, the `read` limit; RV2
        — update the header and the "seven routes" specs; the number fence `known-people-number-fence.test.ts` re-pinned only if a sink is
        added — a read adds ⛔ audit).
  - [x] 4.5 Audit types in `AuthAuditEventType` beside `:488-490`: `admin_workplace.added|renamed|delisted|relisted|request_suggested|
        request_closed`, `admin_known_people.campaign_started|campaign_ended`, `member_life_events.workplace_suggestion_declined`.
  - [x] 4.6 Contracts: `packages/contracts/src/members/workplace.ts` (admin list item, add / rename bodies, queue item, suggest body, answer
        body + response, the new codes) and `packages/contracts/src/members/known-people.ts` (`KnownPeoplePromptsResponse`, the campaign
        DTOs); the step-up contexts `WORKPLACE_MANAGE_STEP_UP_CONTEXT` / `WORKPLACE_REVIEW_STEP_UP_CONTEXT` exported (the
        `DATA_RIGHTS_STEP_UP_CONTEXT` precedent); every response `.strict()`; contracts vitest (`pnpm --filter @twt/contracts test` — the
        tests are outside `tsc`).
  - [x] 4.7 API integration specs: each route's 401 / 403 / step-up; AC3's `workplace.review`-only 403 on every AC2 write; the queue's key
        set; AC4's one transaction and its 404-for-another-member; RV2's 200 for a non-caller; the forced-pagination guard green.
- [x] **Task 5 — the admin app (AC8).** `apps/admin/src/modules/workplaces/` (`WorkplacesPage.tsx`, `WorkplaceRequestsPage.tsx`,
      `CampaignControl.tsx`, `i18n-en.ts`, `index.ts`); route wrappers in `apps/admin/src/routes/`; `router.tsx`; `RootLayout.tsx`;
      `client.ts` + `hooks.ts` (invalidate on success); page tests in `apps/admin/tests/`.
- [x] **Task 6 — the member app (AC4, AC6).**
  - [x] 6.1 `packages/api-client/src/index.ts`: `prompts()` on `createMemberKnownPeopleClient`; `answerWorkplaceSuggestion(requestId,
        answer, idempotencyKey)` on `createMemberAuthClient` (beside `postingHistory`).
  - [x] 6.2 `apps/mobile/components/home/HomePromptCards.tsx` (RV7 — the container) + the six cards in
        `apps/mobile/components/workplace/` ((a), (b), (c)) and `apps/mobile/components/known-people/` ((d), (e), (f)); the query
        `['known-people','v1',pariwarId,memberId,'prompts']`, `gcTime: 0`, `withReadTimeout`; invalidated after a posting, an answer, an
        ask, a remove. Render nothing on load / error (⛔ a FlatList — memory: Fabric empty→populated).
  - [x] 6.3 `apps/mobile/lib/home-card-dismissals.ts` (MMKV key `home-cards.dismissed.v1`, a JSON map `cardKey → ISO time`, 30 days;
        `clearHomeCardDismissals()`) wired into FOUR places in `session-context.tsx`: beside the three `clearSavedNames()` calls (terminated
        refresh :72, rejected refresh :83, `signOut` :108) AND in `signIn` (:91-93, beside `clearKnownPeopleCache`).
  - [x] 6.4 `apps/mobile/lib/invite-share.ts` (RV5): ONE `shareInvite(knownPeopleT, trustName)` — the caller passes `useKnownPeopleT()`'s
        `t` explicitly (card (b) lives in `components/workplace/` with `workplace` copy, but the MESSAGE is `known_people.invite.*`);
        `known-people-find.tsx:357-364` switched to it (⛔ its behaviour changed — its test still green).
  - [x] 6.5 `posting.tsx`: the question block (c) above the history (RV10); the header note (:6) updated; `apps/mobile/lib/workplace.ts`
        history row for `closed` (AC4's line). ⚠ Depend on `locale`, ⛔ `t`, in memos (memory: `useT()` fresh closure).
  - [x] 6.5b The answer's `Idempotency-Key`: a FRESH UUID when the question is SHOWN, reused ONLY for retries of that press (the OTHER answer, or a new press after a 200, mints a new key), dropped when
        the prompts refetch shows a different `suggestedWorkplace` or none (⛔ a stable key per `(requestId, answer)` — a "No" after a
        re-suggestion would replay the old `{ answer: 'no' }` for 24 h and act on nothing).
  - [x] 6.6 Mobile unit tests (vitest; mock `lib/mmkv`; RTL `cleanup` under `globals: false`): each card's condition, dismissal expiry,
        the one-card order, the sign-out clear, the share helper, the answer flow (Yes / No / 409 stale / 409 closed).
- [x] **Task 7 — copy + records (AC9).**
  - [x] 7.1 Copy (RV12): `packages/i18n/locales/{en,hi}/workplace.json` — cards (a), (b)'s heading + invite, (c) / the question + Yes / No,
        `request_suggested` → *"Suggested: {name}"*, the `closed` row, the stale / closed errors; `known_people.json` — (b)'s *"Add people
        who know you"*, (d), (e), (f); Hindi marked NOT YET HUMAN-REVIEWED as the files already say; i18n parity test green;
        `apps/mobile/tests/unit/workplace-copy.test.ts`'s `producedKeys()` (:44-54 — today only the posting route's 422 codes) gains legs
        for the answer route's 404 / 409 codes and every new card / question key (memory: stubs call, never transcribe).
  - [x] 7.2 `friction-budget.md` — two `optional` rows (AC9).
  - [x] 7.3 Row 31 — a per-story note (8) naming the keys above for (f).
  - [x] 7.4 `deferred-work.md` — **Closed by 6.36c:** *"`workplaces.name` ⛔ stored trimmed"* (Task 1.2 + the trim on add / rename);
        *"`suggested → pending` may keep stale suggestion columns"* (Task 1.3 + AC4). **⛔ Addressed (stays open):** the start-date
        correction path (⛔ a 6.36c staff screen edits a posting — I2); the rename-race live spec — its trigger is ⛔ met (this part renames a
        WORKPLACE, ⛔ a district; ⛔ calls `renameWorkplaceDistrict`). **⛔ Triggered:** the `Idempotency-Key` length bound (⛔ an eighth copy
        — AC4 reuses the life-events closure). **NEW:** *"an imported school's name / listing can be corrected only by the import"* (RV3).
  - [x] 7.5 The Change Log, the File List; `pnpm ci:local` on the shared DBs (⚠ a peer worktree's `ci:local` ⇒ live-DB timeouts — memory).

## Dev Notes

- **Precedents:** the add-and-replace staff list with ⛔ edit-in-place — 6.23a's approval-warning reasons
  (`packages/domain/src/claim/approval-warning-reasons.ts:120` list, `:315` add, `:332` replace; page test
  `apps/admin/tests/approval-warning-reasons-page.test.tsx`); a Pariwar Admin queue — 6.19c's correction-closure queue
  (`apps/api/src/modules/claims/claims.correction-closure.routes.ts:12-21`, queue route `:166-173`; ⚠ its recorded defect — a filter
  applied AFTER the SQL `LIMIT` hides live rows, `packages/domain/src/claim/correction-closure-read.ts:89` / `:154` — filter IN SQL);
  banners are ⛔ the campaign's carrier (text only, ⛔ link field — `packages/contracts/src/banners/dto.ts:200-214`; one banner at a time
  :216-228; two-person publish `packages/domain/src/banners/write.ts:16-21`).
- ⚠ **A suggestion is the one staff act near who is asked — and it decides ⛔ nothing.** Only the member's *"Yes"* writes a posting,
  through the ONE writer; 6.36 reads it like any other, ⛔ after the cut (SW20, `-339`).
- ⚠ **Uniform withholding:** `replaceNeeded` is ONE boolean for a person who left the Trust and a person reported dead (`namedUnavailableSql`
  reads both the SAME — a death is ⛔ disclosed by the card). `canNamePeople` is false for a claim-named account (RV1 (ii)), but that
  account is the family's own; ⛔ another member learns anything. What a namer CAN still tell is recorded in 6.36a SW14.
- ⚠ **Locks — ONE order everywhere: district → workplace → request** (the rename CLI's: retire the district, move workplaces, move open
  requests; the posting route's: district / workplace `FOR SHARE`, then the withdraw UPDATE). The answer route takes
  `lockMemberPostingWrites` (advisory) FIRST, reads the request PLAIN, takes `lockListedWorkplace`, THEN the request `FOR UPDATE` and
  re-checks its state and district; the suggest route likewise; close and "No" lock only the request. `lockListedWorkplace` (`FOR SHARE`)
  blocks a concurrent delist / rename of that row until commit. The campaign writer takes its Pariwar advisory lock BEFORE its overlap
  read. An inverted order is a 40P01 surfacing as a 500.
- ⚠ **Audit is a log line after commit** (every admin writer here — ⛔ an in-transaction audit, ⛔ an event; RV9 (iii) says so out loud).
  The ACTOR is in the row for an add (`created_by_actor_id`), a suggestion (`suggested_by_actor_id`) and a campaign
  (`started_by_actor_id`, `ended_by_actor_id`); a rename / delist / relist / close carries its actor ONLY in the post-commit audit line.
- **Testing standards:** domain + API integration on the shared DBs (`:5433` and `:5432` — a migration reaches BOTH; ⛔ regenerate an
  applied migration; ⛔ `DROP SCHEMA`); contracts vitest; admin vitest / jsdom page tests; mobile vitest; `pnpm domain-invariants:check`;
  the friction-budget check on COMMITTED history; Prettier is ⛔ enforced — hand-format, ⛔ `--write` whole files; a `**…**/` inside a JSDoc
  closes it — grep after edits.
- **References:** 6.36a (SW2, SW5, SW9, SW14, SW16, SW20, SF1, SF15, I2, I3, Task 1.1b, Task 1.3); 6.36b (AC7, AC10; `-333`); 6.36
  (`6-36-peer-mesh-school-wise-selection.md` — the confirming posting is a NEW `workplace` posting with ⛔ request id, cut like any other);
  `-307` §2 items 2 and 4; `-330`; `-333`; `-338`; `-309` item 5; `-133` cl.2.

### Project Structure Notes

- New: `packages/domain/migrations/0164_workplace-curation-and-campaigns.sql`; `packages/domain/src/schema/known_people_campaigns.ts`;
  `packages/domain/src/member/{workplace-admin,known-people-prompts,known-people-campaigns}.ts`; `apps/api/src/modules/workplaces/`
  (+ the campaign routes); `apps/admin/src/modules/workplaces/`; `apps/admin/src/routes/Workplace{s,Requests}Route.tsx`;
  `apps/mobile/components/home/HomePromptCards.tsx`; `apps/mobile/lib/{home-card-dismissals,invite-share}.ts`.
- ⛔ A new shared package (memory: no premature package) — the invite helper is a mobile `lib/` file with two callers.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (1M context) — `bmad-dev-story 6.36c`, 2026-10-16, worktree `.claude/worktrees/6-36c` on
`story/6-36c-workplace-list-curation-and-prompts` (baseline `301d96d8`; ⛔ cited file moved since — `git diff --name-only
301d96d8..HEAD -- packages apps scripts infra` was empty at start).

### Debug Log References

- Migration `0164` applied on BOTH shared databases (`:5433` `twt-test-pg` and `:5432` native) with `pnpm db:migrate` — 164 rows in
  `drizzle.__drizzle_migrations` on each; `known_people_campaigns` and `workplaces_name_trimmed_check` present on each. ⛔ Hand delta, ⛔
  regenerate.
- Domain (live `:5433`): `rls/known-people-campaigns-policy-regression` 5, `rls/workplaces-policy-regression` 22, `member/workplace` 13,
  `member/import-workplaces` 14, `member/workplace-admin` 18, `member/known-people-campaigns` 6, `member/known-people-prompts` 15,
  `member/workplace-admin-concurrency` 5 (two connections, own-committing), `member/known-people` + `known-people-concurrency` 35 — all
  green; `tests/rbac` 174. A 4-mutation check on `readKnownPeoplePrompts` (`freeSlots > 0`, the different-workplace test, `has_list`,
  `state = 'accepted'`) — each mutation FAILED a leg (the legs bite); the source was restored.
- API (live `:5433`): `workplaces/workplaces.spec` 16, `known-people/known-people.spec` + `life-events/*` 45, forced-pagination,
  login-wall, security-headers, approval-warning-reasons and `tests/unit` 464 (1 skipped, pre-existing) — green.
- Contracts 1387, api-client 34, admin 74 files / 1186, mobile 67 files / 1030, i18n 116 + the parity gate — green. `pnpm typecheck`
  (20 tasks), `pnpm lint` (20 tasks), `schema:check`, `microcopy:check`, `domain-invariants:check`, `pii:check`,
  `claim-adjudication-human-actor:check`, `access-wrapper:check`, `member-state:check`, `governance-boundary:check` — green. Mobile `tsc`
  run BOTH ways (with the main checkout's `.expo/types` copied in, then removed — ⛔ committed): green.

### Completion Notes List

- 2026-10-14 — cut by `bmad-create-story 6.36` (SW1). ⛔ No code.
- 2026-10-16 — re-validated against `main` `301d96d8` by `bmad-create-story 6.36c` (v2.0; four parallel verifiers). Ultimate context
  engine analysis completed - comprehensive developer guide created. ⛔ No code.
- 2026-10-16 — IMPLEMENTED by `bmad-dev-story 6.36c` (Tasks 1–7), built to the RV rulings and `-342`:
  - **0164** — `known_people_campaigns` (the 30-day-inclusive window CHECK, the end's dated-AND-attributed CHECK, per-command RLS, FORCE,
    ⛔ DELETE, UPDATE granted on the end's two columns only, ⛔ FK — there is ⛔ `pariwars` table); `workplaces_name_trimmed_check`; the
    `workplace_requests` guard REPLACED (byte-identical but the marked block: into `pending` ⇒ the three suggestion columns NULL; into
    `suggested` ⇒ the actor). Five fixtures that suggested without an actor now set one; `:365`'s leg is the GUARD code and a new leg
    proves `suggested_check` still fires with the actor present. RV9 recorded in `workplace-import.ts` and its README (⛔ batch column;
    the actor in-row on add / suggest; the audit post-commit, ⛔ event).
  - **RBAC** 51 → 52, 65 → 68 keys: `workplace.manage` (super_admin ONLY, derived — ⛔ `roles.ts` const), `workplace.review` and
    `known_people.run_campaign` (pariwar_admin + derived super_admin); per-key holder legs incl. ⛔ district_admin / state_trustee /
    block_admin / district_verifier.
  - **Domain** — `member/workplace-admin.ts` (the staff list filtered IN SQL, add / rename / delist / relist on STAFF rows only, the queue
    with a correlated folded same-name count, suggest / close in the district → workplace → request order, and the member's
    `answerWorkplaceSuggestion` — `lockMemberPostingWrites` first, a plain read of the CALLER's request, `confirmed` FIRST then ONE posting
    through `insertMemberPosting` with `exceptRequestId`, a stale suggestion RETURNED, ⛔ thrown), `member/known-people-campaigns.ts`
    (the Pariwar advisory lock FIRST, OPEN vs LIVE on the DB's IST day), `member/known-people-prompts.ts` (AC5 in ONE SQL round; RV1's
    two gates; RV4; RV8). Shared, ⛔ copied: `MEMBER_POSTING_TERMINAL_STATES` (used by the life-events handler too), `IST_TODAY`,
    `namedUnavailableSql`, the extracted `liveKnownPersonSql` (now behind `knownPersonLiveLabel`), the workplace cursor helpers.
  - **API** — `modules/workplaces/` (the either-of-two GET gate, step-up AFTER the permission hook, statuses PER ROUTE, post-commit audit
    with `resourceLocator`), `modules/known-people-campaigns/` (⛔ step-up, ⛔ messaging import — a source scan), the answer route in
    life-events (the closure's `requireIdempotencyKey`, its OWN key prefix, ONE discriminated response, the stale path released
    explicitly), the prompts route in known-people (RV2 — the 6.36b header and both "seven routes" legs now name the eighth and assert
    its 200 with every people flag false), nine audit types.
  - **Admin** — `modules/workplaces/` (`WorkplacesPage`, `WorkplaceRequestsPage`, `CampaignControl`, a shared `StepUpPanel` taking the
    contracts' contexts), two route wrappers, `router.tsx`, the nav (Workplaces on the national grant; Requests ungated inside a Pariwar).
  - **Mobile** — `HomePromptCards` (ONE card, RV7's order and its (a)-while-(c) rule) and the six cards; `WorkplaceSuggestionQuestion` on
    the home and at the top of Life Events → Workplace (driven by the PROMPTS); `lib/home-card-dismissals.ts` (cleared in the FOUR
    session sites); `lib/invite-share.ts` (the find screen switched to it); the answer's key per showing (`answerKeyFor`); the closed
    request's row. The prompts are invalidated after a posting, an answer and every 6.36b write's `refresh`.
  - ⚠ **Two expectation changes, both this story's own ACs (⛔ a regression):** 6.36a's `workplace.test.ts` leg that pinned a CLOSED
    request to ⛔ status line now expects `request_closed` / `request_closed_no_name` (AC4); `request_suggested` reads *"Suggested:
    {name}"* (RV10) — the question moved to its own block.
  - ⚠ **Recorded, ⛔ claimed:** Row 31's per-story note is **(9)** — 6.36b had already used (8) (the Task said "note (8)"). The AC2 add
    form takes a district as typed (the server refuses one ⛔ LISTED — 422); ⛔ district picker on the admin page. Native layout, a screen
    reader and the share sheet on a device are ⛔ attested ([[feedback_record_unattested_no_backfill]]) — the render tests run the real
    components under jsdom with mocked primitives.
  - **`pnpm ci:local`** on the code commit `95e36161` (`DATABASE_URL` = `:5433`): **35 / 36 jobs green** — incl. `integration-tests`
    (every live-DB suite: domain, API, jobs, validity-service, channels, niyamavali-engine, events, queue), `friction-budget` (AC-4: 2
    rows added), `schema-diff`, `microcopy`, every invariant gate. ✗ `test (unit)`: 7 admin jsdom tests in files this story did ⛔ touch
    (`drive-target-page`, `fixed-amount-page`, `ground-inspection-*`, `helpline-claim-page`) — 6 × *"Test timed out in 5000ms"* and one
    `userEvent.type` whose typed text arrived SCRAMBLED (*"eMresm baerres…"*) — CPU starvation under the parallel run (memory:
    ci:local concurrency oversubscription); turbo then cancelled the sibling unit tasks. The job's own command re-run alone
    (`env -u DATABASE_URL pnpm turbo run test --concurrency=4 --force`): **37 / 37 tasks green**. ⇒ ⛔ a clean 36 / 36 in ONE run —
    recorded as such, ⛔ claimed.

### File List

**New**
- `packages/domain/migrations/0164_workplace-curation-and-campaigns.sql`
- `packages/domain/src/schema/known_people_campaigns.ts`
- `packages/domain/src/policies/known-people-campaigns-rls.ts`
- `packages/domain/src/member/workplace-admin.ts`
- `packages/domain/src/member/known-people-campaigns.ts`
- `packages/domain/src/member/known-people-prompts.ts`
- `packages/domain/tests/integration/rls/known-people-campaigns-policy-regression.spec.ts`
- `packages/domain/tests/integration/member/workplace-admin.spec.ts`
- `packages/domain/tests/integration/member/workplace-admin-concurrency.spec.ts`
- `packages/domain/tests/integration/member/known-people-campaigns.spec.ts`
- `packages/domain/tests/integration/member/known-people-prompts.spec.ts`
- `packages/contracts/tests/members-workplace-curation.test.ts`
- `packages/api-client/tests/workplace-curation-client.test.ts`
- `apps/api/src/modules/workplaces/{index,routes,handlers}.ts`
- `apps/api/src/modules/known-people-campaigns/{index,routes,handlers}.ts`
- `apps/api/tests/integration/workplaces/workplaces.spec.ts`
- `apps/admin/src/modules/workplaces/{WorkplacesPage,WorkplaceRequestsPage,CampaignControl,StepUpPanel}.tsx`, `i18n-en.ts`, `index.ts`
- `apps/admin/src/routes/WorkplacesRoute.tsx`, `apps/admin/src/routes/WorkplaceRequestsRoute.tsx`
- `apps/admin/tests/workplaces-page.test.tsx`, `apps/admin/tests/workplace-requests-page.test.tsx`
- `apps/mobile/components/home/{HomePromptCards,HomeReminderCard}.tsx`
- `apps/mobile/components/workplace/{AddWorkplaceCard,InviteColleaguesCard,WorkplaceSuggestionCard,WorkplaceSuggestionQuestion}.tsx`
- `apps/mobile/components/known-people/{TransferReviewCard,ReplaceNamedCard,CampaignCard}.tsx`
- `apps/mobile/lib/{home-card-dismissals,home-cards,invite-share}.ts`
- `apps/mobile/tests/unit/home-cards.test.ts`, `apps/mobile/tests/unit/home-prompt-cards-render.test.ts`

**Modified**
- `packages/domain/migrations/meta/_journal.json` (idx 164, `when` `1794195600008`)
- `packages/domain/src/{ids/index,schema/index,policies/index,member/index}.ts`
- `packages/domain/src/member/{known-people,posting,workplace,workplace-import}.ts`; `packages/domain/scripts/README-import-workplaces.md`
- `packages/domain/src/rbac/{permissions,roles}.ts`; `packages/domain/tests/rbac/{permissions,roles}.test.ts`
- `packages/domain/tests/integration/rls/workplaces-policy-regression.spec.ts`; `packages/domain/tests/integration/member/{workplace,import-workplaces}.spec.ts`
- `packages/contracts/src/members/{workplace,known-people}.ts`
- `packages/api-client/src/index.ts`
- `packages/i18n/locales/{en,hi}/{workplace,known_people}.json`
- `apps/api/src/audit/audit-sink.ts`; `apps/api/src/server.ts`
- `apps/api/src/modules/life-events/{handlers,routes}.ts`; `apps/api/src/modules/known-people/{handlers,routes}.ts`
- `apps/api/tests/integration/known-people/known-people.spec.ts`
- `apps/admin/src/api/{client,hooks}.ts`; `apps/admin/src/router.tsx`; `apps/admin/src/routes/RootLayout.tsx`
- `apps/mobile/app/(tabs)/index.tsx`; `apps/mobile/app/(life-events)/{posting,known-people-find}.tsx`
- `apps/mobile/components/known-people/{known-people-cache,useKnownPeopleQueries}.ts`; `apps/mobile/components/workplace/WorkplacePicker.tsx`
- `apps/mobile/lib/{session-context.tsx,workplace.ts}`
- `apps/mobile/tests/unit/{known-people-copy-keys,known-people-session,workplace-copy,workplace}.test.ts`
- `friction-budget.md`; `docs/launch-gate-inventory/inventory-roster.md` (Row 31 note (9))
- `_bmad-output/implementation-artifacts/deferred-work.md`; `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/6-36c-workplace-list-curation-and-prompts.md` (this file)

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-16 | 2.4 | IMPLEMENTED by `bmad-dev-story 6.36c` — Tasks 1–7: 0164 (campaigns, the trimmed-name CHECK, the guard's suggestion rules) on `:5433` and `:5432`; RBAC 52 / 68 keys; the domain (staff list, queue, suggest / close, the member's answer, campaigns, prompts); the API (two admin modules, the answer route, the prompts route — 6.36b's eighth, RV2); the admin pages; the home cards and the confirm question; copy en + hi; two friction rows; Row 31 note (9); the 6.36a deferrals dispositioned + one new (RV3). Every touched suite green on the shared DBs; `pnpm ci:local` 35 / 36 (`test (unit)` — 7 admin timeouts under load in untouched files; the job re-run alone 37 / 37 green). Status → `review`. |
| 2026-10-16 | 2.3 | Round-3 fresh validate: 0 BLOCKER / 0 HIGH / 1 MEDIUM / 8 LOW — CONVERGED; all applied (the leftover `namedByClaimSql` import dropped; the terminal gate classified as MATCHING SW16 (2); `suggestedWorkplace` carries `workplaceId` and card (c) is dismissed per `(requestId, workplaceId)`; the other answer mints a new key; `input.now` + `WorkplaceAnswerRefusedError`; `not_live` noted as historical; `askKnownPerson`'s sweep call `:398`; close joins RV9 (iii)). Sprint row `backlog` → `ready-for-dev`. |
| 2026-10-16 | 2.2 | `2026-10-16-342` (`61332dae`, committed ALONE) records BigDev's answers to §For BigDev — RV4 = call 1, RV8 = call 2, RV9 = call 3, RV3 = call 4 (each the recommended option); RV4 / RV8 cite `-342`, ⛔ SW16; the precedence clause names `-342`. Round-2 fresh validate (0 BLOCKER / 1 HIGH / 9 MEDIUM / 6 LOW, all applied): the HIGH — `liveKnownPersonSql` was pointed at `listMyKnownPeople`'s WIDER shown filter (a 6.36b regression); now `:457-458` / the label CASE, ⛔ the shown filter. Also: RV1 (i)'s claim half DROPPED (it would have been a fifth, unrecorded narrowing of SW16 (2)) and the terminal-state set exported (⛔ "reused" a private helper); AC4 splits handler / domain steps, one discriminated-union response, the stale path releases explicitly; the mobile key per showing; campaign refusal codes + 404; uuid params; one clock per question; two-connection rename legs; the copy test's produced keys; the picker's loaded district. |
| 2026-10-16 | 2.1 | Fresh-context validate of v2.0 (0 BLOCKER / 4 HIGH / 8 MEDIUM / 8 LOW, all applied): ⛔ FK to a `pariwars` table that does not exist (`0073:20`); Task 1.3 names the seven fixtures that suggest without an actor and `:365`'s code becoming the GUARD; `WORKPLACE_REFUSAL_CODES` left as the posting route's 422s — two new code lists, status per ROUTE; RV9 quotes the record verbatim and says the "audit pair in the SAME transaction" is ⛔ met — §For BigDev added (RV3, RV4, RV8, RV9 — each a narrowing / departure, built as written unless answered); `lockListedWorkplace(db, pariwarId, workplaceId)`; AC4's idempotency per kind (its own key prefix; `declined` recorded, `stale` released) and ONE lock order district → workplace → request (AC3 too — suggest / close lock the request, 409 ⛔ a guard 500); the Workplace screen's question reads the prompts, ⛔ the history; the sign-out clear sites corrected (three + `signIn`); RV6 OPEN vs LIVE — `/end` cancels a scheduled campaign; `freeSlots` counted in SQL through one extracted `liveKnownPersonSql`; `\\s+`; `sameNameCount` excludes itself; `shareInvite` takes the `known_people` `t`; RV2 quotes `-333` call 1 (a); RV7's (a)-while-(c) rule; the actor / IST / lock-key / trigger names. |
| 2026-10-16 | 2.0 | RE-VALIDATED against `main` `301d96d8` (rows 6-36a / 6-36b / 6-36 `done`; AC0 MET); status `backlog` → `ready-for-dev`; baseline re-pinned. Four verifiers. Stale pointers corrected (`life-events/handlers.ts:190-210` was `updateAddress` — the posting handler is `:231-422`; the My Pool card is `index.tsx:52-54`, the new cards mount after `:72`; `writeChain` `:44`; banners' rules split across `dto.ts` / `write.ts`). Taken in: `-333` call 1 (the people-who-know-me gate is `knownPeopleCallerSql`, ⛔ a bare `active`) → RV1 + `canNamePeople`; 6.36b's one-403 rule → RV2; the import undoes staff edits to imported rows → RV3; `freeSlots` / `asked_at` → RV4; ⛔ app link in config → RV5; the 30-day window off by one → RV6; one card at a time → RV7; ⛔ list ⇒ ⛔ "Add your workplace" → RV8; the batch actor column → RV9 (⛔ added; recorded); the existing `request_suggested` question → RV10; a stale suggestion → RV11; namespaces → RV12. The 6.36a deferrals with a 6.36c trigger dispositioned (Task 7.4); 0164 gains the `btrim` CHECK and the guard tightening; AC4's lock order; the either-of-two GET gate; `items`-shaped lists; the route wrappers and the ungated Pariwar nav link; readable `resourceLocator`s; step-up contexts in contracts; the four sign-out clears; `packages/api-client`. SC2 conditional CLOSED (`-330` §0). |
| 2026-10-15 | 1.7 | `2026-10-15-338` (`08932f43`): AC0 — starts when row 6-36 is `done`, ⛔ not in parallel with it; the shared test databases, ⛔ not `:5434`; re-validated against `main` before `ready-for-dev`. |
| 2026-10-14 | — | `2026-10-14-330` committed (`d44708e8`) — BigDev: *"all A, SC4 yes"*; every AC and Task here was written to the recommended answers ⇒ ⛔ none changed. |
| 2026-10-14 | 1.6 | `2026-10-14-332` (`33902d82`): wave 2 — starts when 6.36a AND 6.36b are done, in parallel with 6.36; migration `0164` / `…008`; `:5434`; merges last. |
| 2026-10-14 | 1.5 | Validate round 5: `replaceNeeded` = at least one `unavailable` row (the word "erased" dropped — an erased link has ended); the withholding note points to 6.36a SW14. |
| 2026-10-14 | 1.4 | Validate round 4: offices only in LISTED district spellings; `transferReview` and card (b)'s people-who-know-me button only for `active` members. |
| 2026-10-14 | 1.3 | Validate round 3: `replaceNeeded` (a boolean, ⛔ no names); `transferReview` needs an earlier, DIFFERENT workplace; `hasWorkplace` includes a delisted one; the people-who-know-me flags only for `active` members. |
| 2026-10-14 | 1.2 | Validate round 2: the confirm's order, its re-checks, the caller's own request, the handler's event + audit; a suggestion bound to the request's district; the admin GET open to `workplace.review`; offices only in the Pariwar's `workplace_districts`; `noWorkplace` covers a district-only posting; `transferReview` ⛔ never after a retirement. |
| 2026-10-14 | 1.1 | Checklist validation: SW9 is a SUGGESTION the member confirms; the cards follow SW16 (2); the human-actor gate's real scope; `-133` cl.2 cited as posture; friction-budget rows. |
| 2026-10-14 | 1.0 | Cut by `bmad-create-story 6.36` (SW1): SW9 (staff half), SW16 (2)–(5) — written to the RECOMMENDED answers. |
