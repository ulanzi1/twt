---
baseline_commit: 2581c514
---

<!--
⭐ CUT 2026-10-14 by `bmad-create-story 6.36` (SW1). This file KEEPS the row key `6-36-peer-mesh-school-wise-selection` — every ruling
cites it (`-306` Consequence 1, `-308`, `-311` PM1, `-325` S1 A, `-326` BD1 A) and 6.27c waits for it.
⭐ THE RECORD is 6.36a's file (`6-36a-member-workplace-and-posting-history.md` — SF1–SF17, SW1–SW30, SC1–SC4, I1–I12, the shared Task 0).
This file BUILDS **SW18–SW27** and closes three deferred items (SW30). Where a summary here and 6.36a's text disagree, 6.36a's is the record.
⚠ Before Task 1: `git diff --name-only 2581c514..HEAD -- packages apps scripts infra` — re-read any cited file that moved (6.36a–c will
have moved `member_postings`, the life-events module and the mobile wizard).

STATUS: `backlog` — flips to `ready-for-dev` when 6.36a AND 6.36b are `done` (⭐ `2026-10-14-332`: wave 2, in parallel with 6.36c — it does ⛔ not need
6.36c). Migration `0163` (`when` `1794195600007`); the shared test databases; worktree `.claude/worktrees/6-36`; merges to `main` THIRD
(before 6.36c). 6.27c waits for this row AND row 6-36c.
GLYPH REGISTER, ADDRESSING RULE, LETTERS: as 6.36a.
-->

# Story 6.36: The Five Are Chosen From the Member's Own Workplace — Otherwise the People They Named, Otherwise Nobody, and Then the Claim Goes On; Staff See Where Each Person Came From `[SURFACE]`

Status: backlog

> ⭐⭐ **WHAT THIS PART IS.** The Panel ruled who is asked about a death (`-310` CF4 A): the members at the member's workplace (and the
> previous one after a transfer less than 90 days before the death); otherwise up to three people the member named who agreed; otherwise
> nobody — the ground inspection carries the claim. ⛔ Never the district; the family ⛔ never chooses. This part replaces 6.6's district
> metric with that rule, filters out anyone the Trust must ⛔ not text, records each claim's ranked group so 6.27c can replace a skipped
> person from the SAME group, stores where each person came from and SHOWS it to staff (*"Chosen from the workplace"* / *"Named by the
> member"* — `-308`), and — because "nobody" now happens often — lets a claim with nobody to ask go on to the ground inspection instead
> of waiting for ever (SF4).

## Story

As **the Trust** —
I want **the people asked about a member's death to be that member's own colleagues, or failing that the people the member named, chosen
the same way every time and ⛔ never steered by anything changed after the claim is filed (except eligibility, and a named person's own
withdrawal — 6.36a I8)**,
so that **the answers come from people who knew the member and are ⛔ not the family's choice — and a claim with nobody to ask still
reaches the inspection that carries it.**

## Policy meaning (AI-10-1)

⭐ **This part CHANGES a predicate that gates a family's access to a benefit** — when a claim may leave `documents_pending` (SW25). In the
member's terms: *"a family's claim is ⛔ no longer stuck because nobody worked with the member and nobody was named — it goes on to the
ground inspection, which then carries it."* Today such a claim can ⛔ never be inspected or approved (SF4). Checked against the Niyamavali:
§6.2 (*"The Trust verifies the qualifying event…"*) names ⛔ no neighbours and ⛔ no clause governs who is asked ⇒ ⛔ no conflict; the
change REMOVES a block the rulebook never contained. The other predicates here (SW20–SW23) decide who is ASKED, ⛔ never what a family is
owed: the peer mesh is a signal, ⛔ never a gate (`-263` FQ10).

## The rulings and decisions this part builds (6.36a is the record)

- `-310` CF4 A (as put — quoted in 6.36a) · `-310` CF2 (the inspector: *"⛔ never who"*) · `-308` (each answer shows its source) ·
  `-311` PM1 (i)–(iii) · `-325` S1 A · `-326` BD1 A (*"Row 6-36 owns the line, its wire field, and a test on BOTH surfaces"*).
- **SW18** the new metric and grouped engine · **SW19** the anchor (the filing date) · **SW20** as recorded before the filing day · **SW21** who is AT a
  workplace · **SW22** the ranking, recorded · **SW23** the ONE eligibility predicate · **SW24** the source, stored and shown · **SW25**
  nobody to ask ⇒ the claim goes on · **SW26** old selections · **SW27** what 6.27c inherits · **SW30** the three deferred items closed.

## Acceptance Criteria

1. **AC0 — ⛔ no code before 6.36a AND 6.36b are `done`** (`2026-10-14-332` — ⛔ not 6.36c), migration `0163` / `when` `1794195600007`, and SW18–SW27 as answered at 6.36a's Task 0.1 are applied here.
2. **AC1 — the migration** (FIXED by `2026-10-14-332`: `0163`, journal idx 163, `when` `1794195600007`): `claim_peer_mesh_selections` gains `source text null CHECK IN
   ('workplace','named_by_member')`, `previous_workplace_counted boolean null`, `recent_change_before_filing boolean null` (SW20's staff
   line), `deceased_workplace_id uuid null`, `deceased_previous_workplace_id uuid null` (row 6-32 reads them — SW25), `ranked_member_ids
   uuid[] null CHECK (cardinality(ranked_member_ids) <= 500)`; CHECK `metric_id <> 'workplace_named_v1' OR (ranked_member_ids IS NOT NULL
   AND previous_workplace_counted IS NOT NULL AND recent_change_before_filing IS NOT NULL)` and CHECK `metric_id <> 'workplace_named_v1' OR
   ((source IS NULL) = (cardinality(selected_member_ids) = 0))` — ⚠ scoped to the NEW id so the seven shipped fixtures that insert
   selections with other ids (e.g. `'m'` — `apps/api/tests/integration/_peer-reply-fixture.ts:63`, `packages/domain/tests/integration/claim/
   _peer-reply-fixtures.ts:48`, `rls/claim-peer-mesh-replies-policy-regression.spec.ts:58`, and four specs) stay valid; a trigger checks the
   selected ids are the FIRST entries of `ranked_member_ids` (arrays have ⛔ no prefix operator in a CHECK); `claim_peer_mesh_pings` gains
   `source text null CHECK IN (…)` with a BEFORE INSERT trigger requiring it to EQUAL its selection's `source` (`IS NOT DISTINCT FROM` —
   existing fixtures pass: null = null). ⚠ GRANTS: the ping table's UPDATE is already narrowed to the delivery columns (`0156:64-65`) — keep
   it; the SELECTION table still has a table-wide `GRANT SELECT, INSERT, UPDATE` (`0054_claim-peer-mesh.sql:77`) ⇒ REVOKE UPDATE and GRANT
   UPDATE (`outcome`, `response_window_expires_at`, `skip_reason`) only — the only columns any writer updates (`peer-mesh-persist.ts:292`,
   `:329`, `:361`; the one fixture that updates `selected_member_ids`, `peer-mesh-reply.spec.ts:419`, runs as superuser) ⇒ the new columns
   are immutable by grant (I9); applied on :5432 AND :5433; the policy-regression and trigger specs (an UPDATE of `source` /
   `ranked_member_ids` refused 42501).
3. **AC2 — the grouped engine is pure and replayable** (I7): `selectPeerMeshGrouped({ claimCaseId, candidates, metric })` — candidates
   each `{ memberId, group: 'workplace_previous' | 'workplace_current' | 'named', settled: boolean }`; returns `{ source, selectedMemberIds,
   rankedMemberIds, metricId, metricVersion }`; the `workplace` group = `workplace_previous` first (when present), then
   `workplace_current`, each split SETTLED first (a candidate flag `settled` = their current run at that workplace began, as recorded, 90 days or
   more before the cut — 6.36a SW22) then the rest, each ordered by
   ascending `sha256(claimCaseId + ':' + memberId)` hex (`settled` is false for every `named` candidate); `named` by the same hash; the first non-empty
   group wins (cap 5 / cap 3); ⛔ never two groups mixed; `rankedMemberIds` is the winning group's ranking TRUNCATED to its first 500 (the
   column's CHECK — an office of 600 members must ⛔ never fail the job and re-create SF4's stall). Unit tests: byte-identical on replay and
   across input order; a 6th colleague is in `rankedMemberIds` but ⛔ not selected; previous-workplace people rank first; ⛔ no fill-up from
   `named` when `workplace` has 2; a 600-person group ⇒ 500 ranked, the first 5 selected.
4. **AC3 — the registry** keys entries by id; `workplace_named_v1` is a NEW id (⛔ no version bump of `district_cohort_v1` — SF6); ⚠
   FIRST give the v1 entry a LITERAL `metricId: 'district_cohort_v1'` (today it reads `metricId: DEFAULT_PEER_MESH_METRIC_ID`,
   `peer-mesh-metric-registry.ts:102` — changing the constant would RENAME v1 and break the replay of every stored selection), THEN set
   `DEFAULT_PEER_MESH_METRIC_ID = 'workplace_named_v1'`; `resolvePeerMeshMetric('district_cohort_v1')` still resolves the old comparator; the
   6.6 domain test legs that resolve the DEFAULT (`packages/domain/tests/claim/peer-mesh.test.ts:25`, asserted at `:73`, `:193-199`) are
   amended to pin `'district_cohort_v1'` explicitly — every OTHER 6.6 replay assertion stays as it is; the registry type is a discriminated
   union (`kind: 'ranked' | 'grouped'`) and the dispatch is ONE function (`runPeerMeshMetric`) used by the job AND by replay.
5. **AC4 — the anchor is the filing date** (SW19, SF17): the cut = the START of the claim's filing day (IST, from `claims.created_at`);
   the select job decrypts ⛔ nothing and calls ⛔ no KMS (in v1 the certificate's OCR'd date is always empty — 6.36a SF17); ⛔ no
   encryption dependency is added to the job. A test: a selection made with a certificate row present still cuts at the filing day.
6. **AC5 — the snapshot, as recorded before the cut** (SW20, SW21; I8): the deceased's postings and every candidate's postings count only
   if `member_postings.created_at` is before the cut (a member's confirmation of a staff suggestion IS a posting — 6.36c AC4 — so it is cut
   like any other); the deceased's accepted people count only if `responded_at` is before the cut AND they were ⛔ not REMOVED before the
   cut (a removal after it — perhaps by the family — does ⛔ not count) AND THAT link was ⛔ never WITHDRAWN (a withdrawal excludes it
   whenever it happened — 6.36a SW17; read per LINK, so a later, separately accepted link counts on its own); the CURRENT workplace is the latest posting's; the PREVIOUS workplace is the latest
   EARLIER posting's that names a workplace DIFFERENT from the current one, skipping retirement and *"isn't listed"* rows; it counts when the
   CURRENT run began less than 90 days before the FILING date — 6.36a SW21 word for word: *"the latest consecutive postings of the same
   kind, counted back from the latest posting: rows naming the current workplace (an 'isn't listed' row BETWEEN two of them ⛔ never breaks
   the run), or — when the latest row is a retirement or an unconfirmed 'isn't listed' — the latest consecutive rows of THAT kind; its start
   = the `started_on` of its EARLIEST row"*, where *"unconfirmed"* means ⛔ no confirming posting recorded before the cut (⛔ never the
   request's state at selection time — I8); tests: A → B (started 120 days before) → *"isn't listed"* → B (20 days before) ⇒ the previous
   workplace does ⛔ not count; A → an unconfirmed *"isn't listed"* 20 days before ⇒ A counts; retiring twice ⛔ never re-arms; `recent_change_before_filing` = in the 90 days before the
   cut, the deceased's latest posting was recorded, or any of their named people was ACCEPTED or REMOVED. Live tests (rows written in SEPARATE transactions): a posting the family records on the filing day ⇒ ignored; a friend's posting at
   the deceased's school recorded on the filing day ⇒ ignored; a friend's posting recorded 10 days before ⇒ counted but ranked after every
   settled colleague; the 90-day boundary — 89 days ⇒ the previous workplace counts, 90 ⇒ ⛔ not; school A → *"isn't listed"* → confirmed
   school B (60 days before) ⇒ A's colleagues count and rank first; a retirement 30 days before the filing ⇒ the previous workplace counts
   and there is ⛔ no current one; a named person removed after the filing day began ⇒ still counted; a named person who withdrew ⇒ never
   counted; a transfer recorded 20 days before ⇒ `recent_change_before_filing = true`.
7. **AC6 — the filter** (SW23): ONE exported predicate (`peerMeshEligibleMemberSql` — the name is the developer's) used by the snapshot
   AND exported for 6.27c's send-time re-check: `members.state = 'active'`, ⛔ no claim naming them as the deceased (any state), an
   `EXISTS member_identities` row, ⛔ not the deceased, ⛔ not the claimant. Tests: each exclusion; a suspended (moderated) member stays eligible
   (6.27a F3 — recorded).
8. **AC7 — fewer than five / none** (I11): two colleagues ⇒ two selected, `source = 'workplace'`; ⛔ no colleagues + two named ⇒ two
   selected, `source = 'named_by_member'`; neither ⇒ zero selected, `outcome = 'skipped'`, `skip_reason =
   'no_workplace_colleague_or_named_person'`, `source = null`.
9. **AC8 — nobody to ask ⇒ the claim goes on** (SW25): the zero branch emits NEW event `claim.peer_mesh_none_to_ask` (`documents_pending →
   verification_in_progress`; payload `{ from_state, to_state, trigger: 'peer_mesh_none_to_ask', actor: 'system', metric_id,
   metric_version }`, `.strict()`) through `projectClaimState` under its own SAVEPOINT (the `peer_mesh_pinged` shape,
   `claim-peer-mesh.ts:277-306`); the reducer + the transition table (`packages/domain/src/claim/state.ts:131-132`, `:386`) gain the edge;
   `CLAIM_EVENT_TYPES`, the payload map and `EVENT_TYPE_REGISTRY` gain it — and all THREE vocabulary pins move (6.36a SF16):
   `packages/events/tests/claim-registry-coverage.test.ts` (set equality), `packages/domain/tests/claim/dpdpa-consent-events.test.ts:59`
   (`toHaveLength(36)` ⇒ 37) and the frozen-literal diff `packages/domain/tests/claim/nominee-name-check-events.test.ts:79-135` (add the
   literal); the shepherd-assign job is enqueued on this branch too (`claim-peer-mesh.ts:350-360`); the certificate reminder's day 0
   reads the EARLIEST of `claim.peer_mesh_pinged` OR `claim.peer_mesh_none_to_ask` (`packages/domain/src/claim/certificate-reminder.ts:132-169`,
   and the sweep's no-entry alarm `apps/jobs/src/scheduler/claim-certificate-reminders.ts:303`); ⛔ no window job, ⛔ no ping row. Tests: the
   claim reaches `verification_in_progress`; a ground inspection can then be scheduled; a shepherd job is enqueued; a reminder run opens
   from that event; a re-run of the job is a no-op (⛔ no second event).
10. **AC9 — the source on every ping** (SW24, I9): the ping intents of a `workplace_named_v1` selection carry `source`; a ping whose
    `source` differs from its selection's is refused by the trigger (a test); a `district_cohort_v1` selection's pings carry `null`.
11. **AC10 — the wire and the screen** (SW24, I10): `PeerMeshPingView` (`packages/contracts/src/claims/verifier-console.ts:225-257`) gains
    `source: z.enum(['workplace','named_by_member']).nullable()` — REQUIRED on the wire (⛔ not optional: an absent key would hide a defect),
    and every fixture building a ping view is amended (the 6.27d list: `apps/admin/tests/neighbours-answers-panel.test.tsx`,
    `apps/admin/tests/verifier-console.test.tsx`, `apps/api/tests/unit/peer-answers-stitch.test.ts`, the contracts tests
    `claims-peer-answers.test.ts` / `claims-verifier-console.test.ts` — run vitest, they sit outside `tsc`); the assembler maps the ping
    row's column at `apps/api/src/modules/claims/peer-answers-assembler.ts:262-271` (⛔ no new read — the ping read already selects every
    column, so `VERIFIER_CONSOLE_MAX_READS` stays 29 and its four pins stay unchanged); `PeerMeshView` renders *"Chosen from the workplace"*
    / *"Named by the member"* (`verifierConsoleEn.peerMesh`, `i18n-en.ts:93-152`) BESIDE the `relationship` answer row when the reply has
    one (`PeerAnswerRow`, `PeerMeshView.tsx:72-74`, `:173-193`), otherwise in the ping header (`:53-65`) — so an unanswered ping shows it
    too — and nothing for `null`; and `PeerMeshTranscript` (`verifier-console.ts:288-307`) gains `recentChangeBeforeFiling: boolean | null`
    (REQUIRED, null for `district_cohort_v1`), rendered once at the top of the section on BOTH surfaces as *"The member's workplace or the
    people they named changed in the 90 days before this claim was filed."* (6.36a SW20); tests on BOTH surfaces — the District Admin's
    console (`verifier-console.test.tsx`) AND the approvers' panel (`neighbours-answers-panel.test.tsx`), plus the API spec that drives both
    in one file (`apps/api/tests/integration/claims/peer-answers-approvers.spec.ts` — `consolePings` vs `read`).
12. **AC11 — ⛔ never to the inspector, the helpline or a member** (I10): ⛔ no `source` on the ground-inspection wire
    (`apps/admin/src/api/client.ts:1283-1296`), the showings table or `GroundInspectionPage`; ⛔ no `recentChangeBeforeFiling` there either (the
    schema-key tests cover BOTH keys); ⛔ not on `PeerRequestDetailResponse`
    (`packages/contracts/src/claims/peer-request.ts:79-99` — the neighbour's own view, shared by the helpline); a schema-key test on each
    that ⛔ no key named `source` exists; ⚠ an inspector who also holds `claim.verify` sees the console's full section once their own visit
    is complete — that is the console's existing audience (CF2's District Admin / verifiers row), recorded, ⛔ not changed.
13. **AC12 — the job test** (`apps/jobs/tests/claim-peer-mesh.test.ts`, the ONLY test that runs `runClaimPeerMeshSelect`; its replay legs
    already pass the stored id, `:307`, `:350`): the legs that assumed the district default are rewritten for `workplace_named_v1` (seed
    postings with workplaces); the legacy district legs move to the pure engine + replay with `'district_cohort_v1'` pinned (⛔ not through
    the job, whose default has moved); the zero-candidate leg now expects `verification_in_progress` and the new event.
14. **AC13 — the 6.27 set's stale text is annotated** (Task 0.4 of 6.36a wrote them — CHECKED here): 6.27a Invariant 4 / Trap 8, 6.27c AC5
    and its Dev Notes name `-311` PM1, `ranked_member_ids`, the SW23 predicate, the inherited ping `source`, and SF11's
    `recordPeerMeshResponse` check (6.27c moves it to the ping rows).
15. **AC14 — the deferred items** (SW30): the zero-candidate stall item and the `-308` hand-off item each gain an appended *"Closed by 6.36
    (code commit <sha>)"* line, and the uncapped-snapshot item *"Closed by 6.36 for `workplace_named_v1` (code commit <sha>) — the
    `district_cohort_v1` read is unchanged"* — written as NARROWED, ⛔ not closed, where the item's own text needs it (a very large office
    is still unbounded) (⛔ not rewritten); the family item gains *"⛔ not taken by 6.36 — no family-link
    data (SW23)"*.
16. **AC15 — `pnpm ci:local` green.**
17. **AC16 — the next version of the neighbours' questions, `peer_mesh.v4`** (`2026-10-14-331` SC4 A — *"school or office", in the next
    version (answers already given keep their words)"*; built here on our reading, in `-329`'s v3 shape): `packages/domain/src/questionnaires/
    peer-mesh.ts` gains v4 = v3's pages with ONE change — the `relationship` option `school_colleague` (code UNCHANGED, so stored answers keep
    their meaning; `:110-113`) takes a NEW copy key `peer_request_questions.relationship.school_or_office_colleague` (*"A colleague at the
    same school or office"* + Hindi — the reviewed Hindi is Row 28's), its `approvedBy` gaining `-331`; v4 becomes LIVE for every Pariwar and
    v3 HISTORICAL; a reply keeps the version it pinned (a v3 reply shows *"A colleague at the same school"*); every question the Panel ruled is
    in v4 (`-310` CF3 (a) — the validator); the two `'pending'` health questions and their `counselBasis` carry over unchanged (6.27c's AC2b
    hold reads `resolveLiveVersion` — ⛔ never a version name). Tests: the validator accepts v4; a new reply pins v4; a v3 reply renders v3's
    words; the copy keys resolve in en + hi (the real-`t()` lockstep test).

## Tasks / Subtasks

- [ ] **Task 1 — the migration (AC1, AC9).** Columns, the scoped CHECKs, the two triggers, the REVOKE UPDATE + column GRANT on the selection
      table; the Drizzle schema (`claim_peer_mesh_selections.ts`: the
      snapshot row type becomes a union — the legacy `{ memberId, district, createdAt }` and the grouped `{ memberId, group, settled }` (the
      ranking reads `settled` — I7: a replay rebuilds the ranking from the PERSISTED snapshot alone; a test replays a stored selection);
      `claim_peer_mesh_pings.ts`); apply on :5432 and :5433.
- [ ] **Task 2 — the engine and the registry (AC2, AC3).** FIRST the v1 entry's literal id (AC3). `packages/domain/src/claim/peer-mesh.ts`:
      keep `selectPeerMesh`; add `selectPeerMeshGrouped` (with the 500 truncation) and `runPeerMeshMetric`; rewrite the header's *"DO NOT add … school-proximity … inputs here"* to name SW18 (it
      supersedes 6.6 D3). `peer-mesh-metric-registry.ts`: the union type, the new entry, the new default, the header comment. The hash —
      `node:crypto` `createHash('sha256')` (pure, deterministic; the domain package runs on Node).
- [ ] **Task 3 — the snapshot reads (AC5, AC6).** In `packages/domain/src/claim/peer-mesh-read.ts`: `getPeerMeshWorkplaceSnapshot(db,
      { pariwarId, deceasedMemberId, claimantActorId, cutStart, filingDate })` — the deceased's postings as of the cut (current, previous, the
      90-day test against the filing date), the candidates (each with its `settled` flag) whose latest posting as of the cut is at either workplace, each through the SW23 predicate; and
      `getPeerMeshNamedSnapshot` — the deceased's accepted people as of the cut, through the same predicate. ⚠ Every correlated subquery
      over `member_postings` uses the LITERAL `"members"."member_id"` qualifier (the CORRELATION FIX note, `peer-mesh-read.ts:60-71`; the
      qualifier itself at `:84`, `:126`). ⚠ The
      snapshot is BOUNDED by the two workplaces and ≤ 3 named people — ⛔ not the whole roster (closes the 6.6 uncapped-snapshot item for this
      metric).
- [ ] **Task 4 — the job (AC4–AC8, AC12).** `apps/jobs/src/claim-peer-mesh.ts` `runClaimPeerMeshSelect`: unchanged in shape — the idempotency
      probe (and its self-heal), then the cut from the claim's `created_at`, the snapshot, `runPeerMeshMetric`, the persist (new columns), the
      pinged branch with `source` on the ping intents, the zero branch with `claim.peer_mesh_none_to_ask` + `skipPeerMesh` + the shepherd
      enqueue. `persistPeerMeshSelection` / `persistPeerMeshPingIntents` (`peer-mesh-persist.ts:58-123`) take the new fields.
- [ ] **Task 5 — the event (AC8).** `packages/domain/src/claim/events.ts` (the type tuple at `:770`, the payload schema, the map at `:818`),
      `state.ts` (reducer + table), `packages/events/src/registry.ts` (beside `claim.peer_mesh_pinged`, `:206`), the certificate-reminder
      reader and its sweep. Every reader of the edge is listed in SF4 — re-grep `peer_mesh_pinged` in `apps/*/src packages/*/src` at build
      for any reader added since.
- [ ] **Task 6 — the wire and the screen (AC10, AC11).** Contracts, the assembler mapping, `PeerMeshView`, the copy, the fixtures, the
      tests on both surfaces, the negative schema tests.
- [ ] **Task 7 — records and close (AC13–AC15).** CHECK 6.36a Task 0.4's annotations; the deferred-work appended lines (by item heading —
      ⛔ never line numbers); the 6.6 story file gains a dated annotation that D3 and its review Decision 1 are superseded (SW18, SW25); the
      Change Log and File List; `pnpm ci:local`.
- [ ] **Task 8 — `peer_mesh.v4` (AC16).** The version, the copy key (en + hi + `$comment` naming `-331`), the module header's version list,
      the tests; the 6.27c annotation already names v4 (6.36a's Task 0 follow-up).

## Dev Notes

### Current state of the code this part changes (read at `2581c514`)
- **The SELECT worker** (`apps/jobs/src/claim-peer-mesh.ts:153-367`, ONE `withPariwarScope` transaction): idempotency probe (`:181-194`)
  → `getClaimCase` → `getPeerMeshDeceasedAttributes` → `getPeerMeshCandidateSnapshot` (excluding the claimant) →
  `resolvePeerMeshMetric()` (⚠ NO argument — the default) + `selectPeerMesh` → `persistPeerMeshSelection` (the WINNING row is
  authoritative) → zero ⇒ `skipPeerMesh` and return → `documents_pending` ⇒ `claim.peer_mesh_pinged` under a SAVEPOINT +
  `persistPeerMeshPingIntents` → after COMMIT the 72-hour window job and the shepherd job. ⭐ Preserve: the idempotency probe and its
  self-heal; the winning-row rule; the SAVEPOINT handling of `ClaimStreamConcurrencyError`; the after-COMMIT enqueues.
- **The engine** (`packages/domain/src/claim/peer-mesh.ts:65-82`) and **the registry** (`peer-mesh-metric-registry.ts:65-136`) — SF6.
- **The selection table** (`packages/domain/src/schema/claim_peer_mesh_selections.ts`; 0054:45-62): the snapshot and output IMMUTABLE;
  `outcome` / `response_window_expires_at` mutable; ≤ 5 selected (CHECK); *"NO PII"* — ⭐ keep it so: the new columns hold workplace ids
  (Tier 3), booleans and member ids — ⛔ never a date of death.
- **The ping table** (`claim_peer_mesh_pings.ts:57-116`; 0054 + 0156): UPDATE narrowed to the delivery columns (`0156:64-65`); INSERT is
  table-wide ⇒ `source` written at insert is immutable by grant.
- **`recordPeerMeshResponse`** (`peer-mesh-persist.ts:220-275`) — the 6.6 response event; it checks the responder is in
  `selected_member_ids` (`:235-237`). ⛔ Not changed here (6.27c's — SF11).
- **The views:** `PeerMeshView` props `{ transcript, now? }` (`PeerMeshView.tsx:29`), per-ping loop `:51-90`, rendered by
  `SignalsPanel.tsx:276-284` and by `NeighboursAnswersPanel.tsx:176` on four hosts (`cycle-freeze/PendingCaseCard.tsx:500`,
  `correction-closure/PariwarClosureStrip.tsx:267`, `correction-closure/EscalationPanel.tsx:437`, `r9-voting/R9CasePanel.tsx:194`); the
  code note `PeerMeshView.tsx:2-4` already names this row (*"so row 6-36's source line (`-326` BD1 A) lands on both by construction"*).
  ⚠ The "How do you know [member]?" question is `relationship` (`claim.json:184`), ⛔ not `how_known` (*"How do you know they died?"*).

### Traps
1. ⚠ **The default moves** — every caller of `resolvePeerMeshMetric()` without an id now gets the grouped metric: the select job
   (`claim-peer-mesh.ts:221`) and the domain test `packages/domain/tests/claim/peer-mesh.test.ts:25` (asserted at `:73`, `:193-199`); the
   jobs test's replay legs already pass the stored id (`:307`, `:350`). ⚠ And v1's `metricId` IS the constant (`:102`) — give it a literal
   id FIRST (AC3).
2. ⚠ **⛔ no KMS in this job** — the anchor is the filing date (SF17); a later OCR-date anchor is a NEW metric id with its own story.
3. ⚠ **A new edge has readers** — the certificate reminder's day 0 and its sweep, the shepherd enqueue (SF4); re-grep at build.
4. ⚠ **`.strict()` everywhere** — the event payload, the wire DTO; a new required wire field breaks fixtures silently (contracts tests
   sit outside `tsc`).
5. ⚠ **Never leak "who" to the inspector** — the source is a category of who (CF2). The inspector's wire has ⛔ no per-ping rows; keep it so.
6. ⚠ **Determinism** — ⛔ no `Date.now()`, ⛔ no `Math.random()`, ⛔ no locale-dependent compares in the engine; the hash is over ASCII ids
   (branded ids are lower-case — memory).
7. ⚠ **Same-tx clocks** — the as-of cut uses `created_at` / `responded_at` / `ended_at` (server times) against a computed IST day start; a live test
   needs rows written in SEPARATE transactions (memory: one BEGIN ⇒ every `now()` equal).

### Testing standards
As 6.36a. The pure engine: `packages/domain/tests/claim/peer-mesh.test.ts`'s style (byte-identical replay, input-order independence).
The job: `apps/jobs/tests/claim-peer-mesh.test.ts` (live). The event registry coverage test is SET EQUALITY (⛔ not a count).

### References
6.36a (SW18–SW27, SF4–SF6, SF10, SF11); 6.6's story file (AC1, AC2, AC5, D3; its review Decision 1); 6.27a (PM1, Invariant 4, Trap 8,
Trap 9, F3); 6.27b (BD1 A — the shared view); 6.27d (R5 — staff see neighbour-derived content only inside the section); `-310` CF4 A /
CF2; `-308`; `-325` S1 A; `-326` BD1 A.

## Dev Agent Record
### Agent Model Used
### Completion Notes List
- 2026-10-14 — cut by `bmad-create-story 6.36` (SW1). ⛔ No code.
### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | — | `2026-10-14-332` (`33902d82`): wave 2 — starts when 6.36a AND 6.36b are done (⛔ not 6.36c), in parallel with 6.36c; migration `0163` / `…007`; merges third. |
| 2026-10-14 | — | ⭐ The Panel RULED SC1 A and SC4 A (`2026-10-14-331`, `0019b301`): SC1 A ratifies the filing-day cut (AC5); SC4 A adds AC16 / Task 8 — this story mints `peer_mesh.v4` with *"A colleague at the same school or office"* (our reading of who builds it). |
| 2026-10-14 | — | `2026-10-14-330` committed (`d44708e8`) — BigDev: *"all A, SC4 yes"*; every AC and Task here was written to the recommended answers ⇒ ⛔ none changed. |
| 2026-10-14 | 1.5 | Validate round 5: AC5 quotes SW21's run word for word, defines "unconfirmed" as of the cut, and its first test now has a previous workplace to miss. |
| 2026-10-14 | 1.4 | Validate round 4: the Story's promise names I8's two exceptions; `settled` measured from the run's recorded start and false for named people; AC5's run definition and its three tests. |
| 2026-10-14 | 1.3 | Validate round 3: the grouped snapshot row carries `settled` (replay); the Story's promise is "after the claim is filed"; AC5 reads a withdrawal per LINK, counts REMOVALS in the staff line, and measures the 90 days from the start of the CURRENT run; the negative schema-key tests cover `recentChangeBeforeFiling`. |
| 2026-10-14 | 1.2 | Validate round 2: the anchor is the FILING date — in v1 the certificate's OCR'd date is always empty (6.36a SF17) — so ⛔ no decrypt, ⛔ no KMS dependency, ⛔ no fence (AC4); the cut is the start of the filing day with SETTLED colleagues ranked first and ONE staff line `recentChangeBeforeFiling` (AC1, AC2, AC5, AC10); the previous workplace skips *"isn't listed"* and retirement rows; a withdrawal excludes whenever it happened; the CHECKs scoped to `workplace_named_v1` so seven shipped fixtures stay valid; the REVOKE / GRANT in Task 1; the uncapped-snapshot item NARROWED. |
| 2026-10-14 | 1.1 | Checklist validation: v1's literal id before the default moves (AC3) and the domain test legs that read the default; the anchor's pre-read, lower bound, `normalizeDate`, fail-closed decrypt, the jobs encryption dependency and a NEW decrypt fence (AC4); the cut at filing − 90 days when the certificate cannot be read (AC5, SW20); the selection's UPDATE grant narrowed (AC1); the 500 truncation (AC2); all three event pins (AC8); the source BESIDE the `relationship` answer (AC10); the uncapped-snapshot closure scoped to the new metric (AC14). |
| 2026-10-14 | 1.0 | Cut by `bmad-create-story 6.36` (SW1): SW18–SW27 and SW30's three closures — written to the RECOMMENDED answers. |
