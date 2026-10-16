---
baseline_commit: 2581c514
---

<!--
⭐ CUT 2026-10-14 by `bmad-create-story 6.36` (SW1). This file KEEPS the row key `6-36-peer-mesh-school-wise-selection` — every decision
that cites it (`-306` Consequence 1, `-308`, `-311` PM1, `-325` S1 A, `-326` BD1 A, `-330`, `-338`) and 6.27c waits for it.
⭐ THE RECORD is 6.36a's file (`6-36a-member-workplace-and-posting-history.md` — SF1–SF17, SW1–SW30, SC1–SC4, I1–I12, the shared Task 0).
This file BUILDS **SW18–SW27**, closes two deferred items and narrows a third (SW30). Where a summary here and 6.36a's text disagree,
6.36a's is the record — EXCEPT where this file cites a later decision (`-331`, `-333`) or a shipped fact (§Shipped substrate).
⭐ RE-VALIDATED 2026-10-15 (v2.0) against `main` `51382898` (6.36a AND 6.36b shipped): the pin `2581c514` is an ancestor of HEAD;
`git diff --name-only 2581c514..51382898` moved ⛔ none of the peer-mesh / claim files this story cites — every code pointer was
re-read at `51382898` (the pointers into 6.36a's / 6.36b's tables are NEW at that SHA). ⚠ Before Task 1: re-run
`git diff --name-only 51382898..HEAD -- packages apps scripts infra` and re-read any cited file that moved.

STATUS: `ready-for-dev` (v2.5, 2026-10-15) — `-338`: built FIRST and ALONE, ⛔ not in parallel with 6.36c (which starts only when this
row is `done`). Migration `0163` (journal idx 163, `when` `1794195600007` — the journal ends at 0162 / `…006`); the shared test
databases; worktree `.claude/worktrees/6-36`; merges to `main` before 6.36c. 6.27c waits for this row AND row 6-36c.
⏳ ONE Panel question OPEN, ⛔ non-blocking: RF1 (which filing day counts when a death is filed again) —
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-15-6-36-refiled-claim.md`, written, ⛔ NOT yet sent. AC4 builds the
rule as written (each claim's own filing day) behind ONE function.
⭐ (2026-10-16 annotation — RF1 RULED: `2026-10-16-339`, Trustee-ratified, option C — the death's FIRST filing counts, unless an innocence finding (`-238`) lifts a claim; built behind `resolvePeerMeshFilingCut`.)
GLYPH REGISTER: `⛔` NEGATES the phrase it prefixes · `⭐` = action / emphasis · `⚠` = hazard · doubling is volume only.
ADDRESSING RULE: ⛔ no `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` — cite decision id + clause,
item heading, row key. LETTERS: as 6.36a.
-->

# Story 6.36: The Five Are Chosen From the Member's Own Workplace — Otherwise the People They Named, Otherwise Nobody, and Then the Claim Goes On; Staff See Where Each Person Came From `[SURFACE]`

Status: done

> ⭐⭐ **WHAT THIS PART IS.** The Panel ruled who is asked about a death (`-310` CF4 A, Trustee-ratified): the members at the member's
> workplace (and the previous one after a recent transfer); otherwise up to three people the member named who agreed; otherwise
> nobody — the ground inspection carries the claim. ⛔ Never the district. `-331` SC1 A (Trustee-ratified) narrowed CF4 A twice: the
> 90 days are counted from the FILING day (the date of death is ⛔ not known when the five are chosen), and a change on the member's
> account before the filing day still counts — limited by asking long-standing colleagues first and telling staff of recent changes.
> This part replaces 6.6's district metric with that rule, filters out anyone the Trust must ⛔ not text, records each claim's ranked
> group so 6.27c can replace a skipped person from the SAME group, stores where each person came from and SHOWS it to staff
> (*"Chosen from the workplace"* / *"Named by the member"* — `-308`, `-326` BD1 A), and — because "nobody" now happens often — lets a
> claim with nobody to ask go on to the ground inspection instead of waiting for ever (SF4). CF4 A (3)'s letter from the head of the
> school or office is row 6-32's, ⛔ not this part's (see §Recorded, ⛔ built here).

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
ground inspection, which then carries it."* Today such a claim can ⛔ never be inspected or approved (SF4). A consequence the family
will notice: the claim now reaches the stage at which the certificate reminders begin (`-259` detail 3, Trustee-ratified: *"only once
the claim is with the District Admin for checking"*), exactly as a claim with people to ask does.
Checked against the Niyamavali (a rulebook, ⛔ not ratified and ⛔ not binding): §6.2 (*"The Trust verifies the qualifying event, the
claimant's entitlement, and document authenticity…"*) names ⛔ no neighbours, colleagues or peers, and ⛔ no clause governs who is asked
⇒ ⛔ no conflict; the change REMOVES a block the rulebook never contained.
The other predicates here (SW20–SW23) decide who is ASKED, ⛔ never what a family is owed: the peer mesh is a signal, ⛔ never a gate
(`-263` FQ10, Trustee-ratified: *"THE CHECK WITH NEIGHBOURS IS A SIGNAL, ⛔ NOT A GATE"*). SW23 deliberately asks only `active`
members, although 6.36b lets a member in renewal grace be found and named (`-333` call 2 (d)) — being asked is ⛔ a benefit to the
person asked.

## The rulings and decisions this part builds (6.36a is the record)

- **Trustee-ratified:** `-310` CF4 A / CF2 (the inspector: *"⛔ never who"*) / CF3 (a) (*"Every question the Panel ruled is in every
  version from now on"*) · `-331` SC1 A (the filing-day cut, settled-first, the staff line) / SC4 A (*"school or office"*, in the next
  version) · `-263` FQ10 · `-259` detail 3.
- **Author-commits:** `-330` SW18–SW27 / SW30 (superseding IN PART 6.6's D3 and its review item *"Zero-candidate selection has no
  defined disposition"*, `-306` §2 item 4, `-308` call 1, `-325` S1 A, `-276` CR3) · `-308` (each answer shows its source) · `-311` PM1
  (i)–(iii) · `-325` S1 A · `-326` BD1 A (*"Row 6-36 owns the line, its wire field, and a test on BOTH surfaces"*) · `-329` (v3's shape)
  · `-332` / `-338` (the build order) · `-333` call 1 (the dead member's account can ⛔ change their named people once any claim names them; a named person's own
    withdrawal still counts — call 1 (b)) and call 2 (d)
  (SW23 unchanged — `active` only) · `-327` BD4 / 6.27b PM25 (c) (an inspector's view of the console).
- ⏳ **OPEN, ⛔ non-blocking:** RF1 — which filing day counts when one death has more than one claim (the routing note named in the
  header; BigDev: *"Route to the Panel"*). ⭐ (2026-10-16 annotation — RF1 RULED: `2026-10-16-339`, Trustee-ratified, option C — the death's FIRST filing counts, unless an innocence finding (`-238`) lifts a claim; built behind `resolvePeerMeshFilingCut`.)
- **SW18** the new metric and grouped engine · **SW19** the anchor (the filing date) · **SW20** as recorded before the filing day ·
  **SW21** who is AT a workplace · **SW22** the ranking, recorded · **SW23** the ONE eligibility predicate · **SW24** the source, stored
  and shown · **SW25** nobody to ask ⇒ the claim goes on · **SW26** old selections · **SW27** what 6.27c inherits · **SW30** two
  deferred items closed, one narrowed, one left open.

## Acceptance Criteria

1. **AC0 — the start condition is MET** (`-332`, `-338`: 6.36a AND 6.36b are `done` and on `main` `51382898`; ⛔ not 6.36c);
   migration `0163` / `when` `1794195600007`; SW18–SW27 as `-330` recorded them, with `-331` SC1 A and `-333` call 2 (d) applied.
2. **AC1 — the migration** (`0163`, journal idx 163, `when` `1794195600007`):
   - `claim_peer_mesh_selections` gains `source text null CHECK IN ('workplace','named_by_member')`, `previous_workplace_counted
     boolean null`, `recent_change_before_filing boolean null` (SW20's staff line), `deceased_workplace_id uuid null`,
     `deceased_previous_workplace_id uuid null` (row 6-32 reads them — SW25), `ranked_member_ids uuid[] null CHECK
     (cardinality(ranked_member_ids) <= 500)`.
   - CHECK `metric_id <> 'workplace_named_v1' OR (ranked_member_ids IS NOT NULL AND previous_workplace_counted IS NOT NULL AND
     recent_change_before_filing IS NOT NULL)` and CHECK `metric_id <> 'workplace_named_v1' OR ((source IS NULL) =
     (cardinality(selected_member_ids) = 0))` (`selected_member_ids` is `uuid[] NOT NULL` and the zero branch writes `'{}'`, so the
     second CHECK is ⛔ vacuous). ⭐ (2026-10-16 annotation — review round 2, `2026-10-16-340` call 1: 0163 also gains
     `anchor_claim_case_id uuid null`, and the first CHECK also requires `anchor_claim_case_id IS NOT NULL`; immutable by the
     same narrowed grant.) ⚠ Both are scoped to the NEW id so the TEN shipped inserts with other ids stay valid — seven with
     `'m'` (`apps/api/tests/integration/_peer-reply-fixture.ts:63`, `packages/domain/tests/integration/claim/_peer-reply-fixtures.ts:48`,
     `packages/domain/tests/integration/rls/claim-peer-mesh-replies-policy-regression.spec.ts:58`,
     `apps/api/tests/integration/claims/peer-request-helpline.spec.ts:115`, `apps/api/tests/integration/claims/peer-request-member.spec.ts:69`,
     `packages/domain/tests/integration/claim/peer-mesh-reply.spec.ts:80`, `packages/domain/tests/integration/claim/peer-mesh-reply-rtbf.spec.ts:38`)
     and three with `'district_cohort_v1'` (`apps/api/tests/integration/claims/verifier-console.spec.ts:172`,
     `apps/api/tests/integration/claims/verifier-console-shape.spec.ts:180`, `apps/jobs/tests/claim-peer-mesh.test.ts:736`).
   - A trigger (`BEFORE INSERT OR UPDATE OF selected_member_ids, ranked_member_ids, metric_id` — the grant blocks `twt_app`, the owner
     and superuser tests can still UPDATE) checks the selected ids are the FIRST entries of `ranked_member_ids` (arrays have ⛔ no
     prefix operator in a CHECK) — ⚠ applied ONLY when `metric_id = 'workplace_named_v1'`, like the CHECKs (the legacy inserts carry a
     non-empty `selected_member_ids` with `ranked_member_ids` NULL). An empty selection is a valid prefix (`'{}'`).
   - `claim_peer_mesh_pings` gains `source text null CHECK IN (…)` with a BEFORE INSERT trigger (SECURITY INVOKER): it looks the
     selection up by (`pariwar_id`, `selection_id`); NOT FOUND (absent or RLS-invisible) ⇒ `RETURN NEW` and the composite FK refuses with
     `23503` (`claim-peer-mesh-replies-policy-regression.spec.ts:147` holds — it inserts with ⛔ no `source`); FOUND ⇒ raise unless
     `NEW.source IS NOT DISTINCT FROM` the selection's `source` (the shipped ping inserters write NULL against NULL-source selections ⇒
     they pass).
   - `member_postings` gains `CREATE INDEX member_postings_pariwar_workplace_idx ON member_postings (pariwar_id, workplace_id) WHERE
     workplace_id IS NOT NULL` (+ the matching `index()` in `packages/domain/src/schema/member_postings.ts`) — today its ONLY index is
     `member_postings_pariwar_member_idx` (`0031_member-postings.sql:34`) and 0161 added none, so "who is at workplace W" would scan the
     Pariwar's postings.
   - ⚠ GRANTS: the ping table's UPDATE is already narrowed to the delivery columns (`0156:64-65`) — keep it; the SELECTION table still
     has a table-wide `GRANT SELECT, INSERT, UPDATE` (`0054_claim-peer-mesh.sql:77`) ⇒ REVOKE UPDATE and GRANT UPDATE (`outcome`,
     `response_window_expires_at`, `skip_reason`) only — the only columns any writer updates (`resolvePeerMeshOutcome`
     `peer-mesh-persist.ts:292`, `extendPeerMeshWindow` `:328-329`, `skipPeerMesh` `:360-361`; ⛔ no erasure path touches the table —
     `packages/domain/src/member/anonymize.ts` checked at `51382898`; the two test UPDATEs, `peer-mesh-reply.spec.ts:333` and `:419`, run
     as superuser) ⇒ the new columns are immutable by grant (I9).
   - Applied on :5432 AND :5433; the policy-regression and trigger specs (an UPDATE of `source` / `ranked_member_ids` refused 42501; a
     ping with a mismatched `source` refused; a non-prefix selection refused; a legacy-id insert with NULL new columns accepted).
3. **AC2 — the grouped engine is pure and replayable** (I7): `selectPeerMeshGrouped({ claimCaseId, candidates, metric })` — candidates
   each `{ memberId, group: 'workplace_previous' | 'workplace_current' | 'named', settled: boolean }`; returns `{ source,
   selectedMemberIds, rankedMemberIds, metricId, metricVersion }`.
   - The `workplace` group = `workplace_previous` first (when present), then `workplace_current`; each split SETTLED first, then the
     rest; each part ordered by ascending `sha256(claimCaseId + ':' + memberId)` hex over the BRANDED (lower-case) ids — the job passes
     its branded `claimCaseId` (`claim-peer-mesh.ts:171`), ⛔ the raw payload string.
     ⭐ (2026-10-16 annotation — review round 2, `2026-10-16-340` call 1: the salt is the ANCHOR claim's id — the claim whose filing the
     cut is, returned by `resolvePeerMeshFilingCut` and stored as `anchor_claim_case_id` (required for `workplace_named_v1`, immutable by
     grant); replay reads the stored id. A refile asks the same people.)
   - ⭐ **`settled`** = the EARLIEST row of the candidate's current run at that workplace (SW21's run, read as of the cut) has
     `created_at` 90 days or more before the cut — the RECORDED time, ⛔ never the self-declared `started_on` (6.36a SW22 — its rejected
     Alt B: *"start dates are self-declared ⇒ the ranking could be bought with a typed date"*; `-331` SC1 A: *"colleagues recorded at
     the school for 90 days or more are asked first"*). `settled` is false for every `named` candidate. Recorded consequence (as
     ratified): a colleague whose "isn't listed" row was confirmed 15 days ago has a run of the confirmed row alone ⇒ ⛔ settled — so for
     90 days after a Pariwar's first import nobody is settled and the ranking is the hash alone.
   - `named` is ordered by the same hash; the first non-empty group wins (cap 5 / cap 3); ⛔ never two groups mixed; `rankedMemberIds` is
     the winning group's ranking TRUNCATED to its first 500 (the column's CHECK — an office of 600 members must ⛔ never fail the job and
     re-create SF4's stall). The engine THROWS on a duplicate `memberId` within the input (a join duplicate would otherwise select one
     person twice while the ping insert's `ON CONFLICT DO NOTHING`, `peer-mesh-persist.ts:113-121`, hides it).
   - Unit tests: byte-identical on replay and across input order; a 6th colleague is in `rankedMemberIds` but ⛔ not selected;
     previous-workplace people rank first; ⛔ no fill-up from `named` when `workplace` has 2; a 600-person group ⇒ 500 ranked, the first 5
     selected; a candidate recorded 10 days before the cut with `started_on` five years back ⇒ ⛔ settled; a duplicate id ⇒ throws.
4. **AC3 — the registry** keys entries by id; `workplace_named_v1` is a NEW id (⛔ no version bump of `district_cohort_v1` — SF6).
   - ⚠ FIRST give the v1 entry a LITERAL `metricId: 'district_cohort_v1'` (today `metricId: DEFAULT_PEER_MESH_METRIC_ID`,
     `peer-mesh-metric-registry.ts:102` — changing the constant would RENAME v1 and break the replay of every stored selection), THEN
     set `DEFAULT_PEER_MESH_METRIC_ID = 'workplace_named_v1'`; `resolvePeerMeshMetric('district_cohort_v1')` still resolves the old
     comparator.
   - The registry type is a discriminated union (`kind: 'ranked' | 'grouped'`) and the dispatch is ONE function (`runPeerMeshMetric`)
     used by the job AND by replay. `selectPeerMesh` keeps a `kind: 'ranked'` config — every caller that passes
     `resolvePeerMeshMetric(id)` straight to it narrows first (or goes through `runPeerMeshMetric`): `packages/domain/tests/claim/
     peer-mesh.test.ts:25` (shared by the whole file; asserted at `:73`, `:193-199` — amended to pin `'district_cohort_v1'` explicitly,
     every OTHER 6.6 replay assertion stays as it is) and `apps/jobs/tests/claim-peer-mesh.test.ts:307`, `:350`.
   - ⚠ The snapshot row becomes a union (Task 1) — the jobs replay legs that read `c.district` / `c.createdAt` off `candidateSnapshot`
     (`claim-peer-mesh.test.ts:295-300`, `:340-344`) and `persistPeerMeshSelection`'s map (`peer-mesh-persist.ts:62-66`) narrow on it.
5. **AC4 — the anchor is the filing date** (SW19, SF17): `filingDate = istDateOf(claim.createdAt)`; the cut = `istMidnightAt(filingDate)`
   — the shipped IST helpers (`packages/domain/src/cycle-calendar/holiday-resolver.ts:178`, `:220`; ⛔ a new copy of the IST offset —
   that file's own D6 note forbids one); 90-day date tests use `addCalendarDays` (`:201`). ⭐ Computed in ONE exported function (the
   name is the developer's) so RF1's answer is a small change behind it, with its own test (option A needs one more read — the
   earliest claim naming the same `deceased_member_id`; option A's own cost: a living member once wrongly reported dead, whose claim
   was refused, would anchor a later real death at that old, false filing — option C, keyed on `-238`'s innocence finding, narrows it); it uses THIS claim's `created_at` (the rule as written — RF1 option
   B) until the Panel rules. The select job decrypts ⛔ nothing and calls ⛔ no KMS (in v1 the certificate's OCR'd date is always empty —
   6.36a SF17); ⛔ no encryption dependency is added to the job. Tests: a selection made with a certificate row present still cuts at the
   filing day; a claim created at 23:59 IST cuts at that day's 00:00 IST; a second claim for the same death cuts at ITS OWN filing day
   (the RF1 pin — the leg that flips if the Panel answers A).
   ⭐ (2026-10-16 annotation — `2026-10-16-339` (Trustee-ratified) RULED RF1 **C**: the anchor is the EARLIEST `claims.created_at` among the
   claims (any state) naming this deceased in the Pariwar, EXCLUDING a claim carrying a `member_found_innocent` finding (our reading of
   "the first filing" — ⛔ ratified), computed in `resolvePeerMeshFilingCut` (`peerMeshFilingCut` stays the pure day → cut step). The RF1
   pin FLIPPED: a second claim cuts at the death's FIRST filing; a NEW leg — an innocence finding on the first claim ⇒ the second claim's
   own filing counts.)
6. **AC5 — the snapshot, as recorded before the cut** (SW20, SW21; I8). Rows count only if recorded (server time) before the cut.
   - **Posting row kinds** (as shipped — `0161_member-workplaces.sql:298-305`, `apps/api/src/modules/life-events/handlers.ts:291-301`):
     *workplace* (`workplace_id` set); *"isn't listed"* (`workplace_request_id` set); *retirement* (`is_retirement`, both ids NULL —
     including a `district_only` choice made with `isRetirement: true`); *district-only* (none of these — legacy rows, or a Pariwar with
     ⛔ no imported list; such rows come before every workplace row: `district_only` is refused once `workplace_districts` has any row —
     `apps/api/src/modules/life-events/handlers.ts:292` over `pariwarHasWorkplaceList`, `member/workplace.ts:205` — and that table has ⛔
     DELETE grant). Order a member's rows by `created_at DESC, posting_id DESC` (as
     `peer-mesh-read.ts` and `listMemberPostingHistory` do — ⛔ `getMemberPostingLatest`, which has ⛔ no tie-break by design).
     ⛔ Never read `workplace_requests` — its `state` is today's (I8) and its typed text is member-typed and erasable; ⛔ never filter on
     `workplaces.status` (a delisted workplace still counts — I3; ⛔ no join to `workplaces` is needed).
   - **The deceased's postings and every candidate's postings** count only if `member_postings.created_at` < cut (a member's
     confirmation of a staff suggestion IS a new workplace posting — 6.36c AC4 — so it is cut like any other).
   - **The CURRENT workplace** is the latest posting's, when it is a *workplace* row. A latest *retirement*, unconfirmed *"isn't
     listed"* or *district-only* row ⇒ ⛔ current workplace. *"Unconfirmed as of the cut"* ⇔ the *"isn't listed"* row is the latest
     posting before the cut (the confirm writes a NEW *workplace* posting carrying ⛔ no request id — 6.36c AC4).
   - **The PREVIOUS workplace** is the latest EARLIER *workplace* row naming a workplace DIFFERENT from the current one, skipping
     *retirement*, *"isn't listed"* and *district-only* rows. It counts when the CURRENT run began less than 90 days before the FILING
     date — 6.36a SW21 word for word: *"the latest consecutive postings of the same kind, counted back from the latest posting: rows
     naming the current workplace (an 'isn't listed' row BETWEEN two of them ⛔ never breaks the run), or — when the latest row is a
     retirement or an unconfirmed 'isn't listed' — the latest consecutive rows of THAT kind; its start = the `started_on` of its
     EARLIEST row"*. A *district-only* row ⛔ never breaks a run and is ⛔ never a run of its own (vacuous today — it can ⛔ follow a
     workplace row — but stated so the code needs no assumption). A run whose earliest row has `started_on` NULL is treated as RECENT —
     a code comment says it is unreachable: the `workplace`, `not_listed` and `retired` arms require `startedOn`
     (`packages/contracts/src/members/workplace.ts`); a NULL-start row (legacy, or `district_only` — with or without `isRetirement` —
     whose `startedOn` is optional) can only come BEFORE the list, so never after a workplace row.
   - **A candidate** is in `workplace_current` / `workplace_previous` when THEIR latest posting before the cut is a *workplace* row at
     that workplace. Drive the read FROM `member_postings WHERE pariwar_id = $p AND workplace_id IN (current, previous) AND created_at <
     cut` (AC1's index), then keep the members whose latest row before the cut is that row.
   - **The deceased's named people** = `member_known_people` rows with `namer_member_id` = the deceased (the deceased is the NAMER) that
     were ACCEPTED before the cut and still live at it: `responded_at < cut AND state IN ('accepted','removed','erased') AND (state =
     'accepted' OR ended_at >= cut)`. ⛔ `declined` / `lapsed` never count (a decline also writes `responded_at` —
     `0162_member-known-people.sql:40`); a `withdrawn` link ⛔ never counts, whenever it ended (6.36a SW17, read per `link_id`, so a
     later, separately accepted link counts on its own); an `asked → removed` / `asked → erased` link has `responded_at` NULL and ⛔ never
     counts. ≤ 3 by construction (6.36b's live-count backstop).
   - **A removal after filing cannot happen:** once any claim names the member as the deceased, 6.36b refuses every action BY the
     deceased's account — including a removal (`knownPeopleCallerSql`, `packages/domain/src/member/known-people.ts:107`; `-333` call 1).
     So the "removed on or after the cut" case is a removal on the filing day BEFORE the claim row exists (the family holding the phone —
     SF10). A NAMED person can still withdraw after the filing (`-333` call 1 (b)) — their own choice, which counts whenever it happens.
   - **`recent_change_before_filing`** = in [cut − 90 days, cut): the deceased's latest posting's `created_at`; or any link of theirs
     whose `responded_at` falls in the window with `state <> 'declined'` (an acceptance); or a `removed` link whose `ended_at` falls in
     the window (from `asked` or `accepted` — 6.36a SW20 word for word: *"any of their named people was ACCEPTED or REMOVED"*); or a
     `withdrawn` link, or an `erased` link with `responded_at IS NOT NULL` (an accepted person erased), whose `ended_at` falls in the
     window (`-331` SC1 A's ratified sentence: *"staff are told when … the people they named changed"*). The rule: SW20's two — an
     ACCEPTANCE into the set, or a REMOVAL by the account (even of an unanswered ask) — plus a change OUT of the accepted set (a
     withdrawal, an accepted person's erasure). An ask, a decline, a lapse and erasing an unanswered ask are none. SW20's list omitted the withdrawal and the erasure; our reading: this
     MATCHES the ratified sentence, ⛔ widens it.
   - **Live tests** (rows written in SEPARATE transactions — the same-tx `now()` trap):
     - a posting the family records on the filing day ⇒ ignored; a friend's posting at the deceased's school recorded on the filing day
       ⇒ ignored; a friend's posting recorded 10 days before ⇒ counted but ranked after every settled colleague;
     - the 90-day boundary — 89 days ⇒ the previous workplace counts, 90 ⇒ ⛔ not;
     - A → B (started 120 days before) → *"isn't listed"* → B (20 days before) ⇒ the previous workplace does ⛔ not count;
     - A → an unconfirmed *"isn't listed"* 20 days before ⇒ ⛔ current workplace, A counts as the previous one;
     - school A → *"isn't listed"* → confirmed school B (60 days before; seeded via `insertMemberPosting({ workplaceId: B, startedOn:
       <the request's>, exceptRequestId })` — 6.36c's confirm route does ⛔ not exist yet) ⇒ A's colleagues count and rank first;
     - a retirement 30 days before the filing ⇒ the previous workplace counts and there is ⛔ no current one; retiring twice ⛔ never
       re-arms;
     - a deceased whose only rows are *district-only* ⇒ ⛔ workplace group (named people or nobody);
     - a named person removed through `removeKnownPerson` on the filing day BEFORE the claim is inserted ⇒ still counted; removed the day
       before ⇒ ⛔ counted; a named person who DECLINED ⇒ never counted; who withdrew ⇒ never counted; an `asked`-then-removed link ⇒ ⛔
       counted; a named person erased after the cut ⇒ ⛔ selected (SW23 — `anonymized`);
     - `recent_change_before_filing = true` for each of: a transfer recorded 20 days before; an ask removed 10 days before (never
       accepted); a named person's withdrawal 10 days before; an accepted named person erased 10 days before (each of these two with its
       acceptance seeded MORE than 90 days before the cut — e.g. 120 — so only the end date can set the flag); a named person who
       accepted 10 days before; ⛔ true for a decline, an unanswered ask erased, an ask made (still `asked`) — each 10 days before —
       or a lapse (`asked_at` 40 days before, so `ended_at` = 10 days before by the lapse CHECK);
     - ONE snapshot leg runs under `SET LOCAL ROLE twt_app` (the test login is a superuser that bypasses RLS) and still sees the
       colleagues and the named people (the policies are Pariwar-wide: `member_postings` `0031:40`, `member_known_people` `0162:53`,
       `member_identities` `0019:109`, `members` `0018:60`, `claims` `0051:74`).
     - Fixtures: a *workplace* posting needs `workplace_districts` and `workplaces` rows (composite FKs) — reuse
       `packages/domain/tests/integration/member/_workplace-fixtures.ts`.
7. **AC6 — the filter** (SW23): ONE exported predicate (`peerMeshEligibleMemberSql` — the name is the developer's) used by the snapshot
   AND exported for 6.27c's send-time re-check: `members.state = 'active'` ONLY, ⛔ no claim naming them as the deceased (any state), an
   `EXISTS member_identities` row, ⛔ not the deceased, ⛔ not the claimant (`claimRow.claimantActorId` is NULLABLE —
   `claim-peer-mesh.ts:217` — a NULL claimant excludes nobody, ⛔ never everybody).
   ⭐ (2026-10-16 annotation — review round 2, `2026-10-16-340` call 2: ⛔ the claimant of ANY claim, in any state, naming this deceased
   in the Pariwar — a death-level `NOT EXISTS` over `claims`; the predicate takes `{ deceasedMemberId }` only. `2026-10-16-341`: and ⛔
   the filer of ANY `intake_attempts` row for the death, in any status — a merged second-channel filing never reaches a claim row.)
   - ⚠ `active-in-grace` is ⛔ asked (`-333` call 2 (d): *"6.36's selection predicate (SW23) is ⛔ changed — it still asks only `active`
     members"*), unlike 6.36b's `knownPersonEligibleSql` (`known-people.ts:94`, which admits it — its doc-block at `:91-92`: *"⛔ NOT the
     selection's predicate … keep them two"*). Keep the two functions separate; 6.36b's deferred W5 rests on this.
   - ⚠ An erased member is kept out by `members.state = 'anonymized'`, ⛔ by the identity row (erasure RETAINS the blind index —
     `known-people.ts:91`) — this meets `anonymize.ts`'s note that 6.36 must ⛔ never ask an erased person.
   - The *"⛔ a claim naming them"* leg: export 6.36b's private `namedByClaimSql` (`known-people.ts:81`) and reuse it, or copy it and
     record the copy in the File List.
   - Tests: each exclusion; an `active-in-grace` colleague and an `active-in-grace` accepted named person are each ⛔ selected; a NULL
     claimant; a suspended (moderated) member stays eligible (6.27a F3 — recorded).
8. **AC7 — fewer than five / none** (I11): two colleagues ⇒ two selected, `source = 'workplace'`; ⛔ no colleagues + two named ⇒ two
   selected, `source = 'named_by_member'`; neither ⇒ zero selected, `outcome = 'skipped'`, `skip_reason =
   'no_workplace_colleague_or_named_person'` (a NEW exported constant beside `PEER_MESH_SKIP_REASON_NO_ELIGIBLE_CANDIDATES`,
   `peer-mesh-persist.ts:32`; `skip_reason` is plain `text` with ⛔ no CHECK — nothing to widen; the jobs test's pin at `:540` moves),
   `source = null`.
9. **AC8 — nobody to ask ⇒ the claim goes on, and ⛔ no edge is ever lost** (SW25):
   - The zero branch emits NEW event `claim.peer_mesh_none_to_ask` (`documents_pending → verification_in_progress`; payload `{ from_state,
     to_state, trigger: 'peer_mesh_none_to_ask', actor: 'system', metric_id, metric_version }`, `.strict()`; `trigger` is a free
     `z.string()` — ⛔ no enum to widen) through `projectClaimState`.
   - ⚠ **The lock, then the probe, on BOTH branches.** Today the job reads the claim with `getClaimCase` (⛔ no lock,
     `claim-peer-mesh.ts:199`) AFTER the idempotency probe, and swallows `ClaimStreamConcurrencyError` as *"benign append race … pinged
     already emitted"* (`:299-306`). ⭐ The latent defect is TWO SELECT JOBS at once — reachable only when two pollers serve the select
     queue (a second `jobs` process, a deploy overlap, or `localConcurrency` > 1; today ONE `jobs` service runs `boss.work` with ⛔
     options, `:505` — one job after another). One is enqueued per document upload (the
     select queue is created with pg-boss's standard policy, `:502`, ⛔ options, on which `singletonKey` is inert: pg-boss's singleton
     unique indexes cover only the short / singleton / stately / exclusive / key-strict-FIFO policies). Both probes find nothing; the
     loser waits on the selection's `claim_case_id` unique index, gets the winner's row (`onConflictDoNothing` → the existing row,
     `peer-mesh-persist.ts`), and — from its stale, unlocked `claimRow` still reading `documents_pending` — appends a SECOND
     `claim.peer_mesh_pinged` at the next free version (the reducer ignores it, `state.ts:131-133`; the audit trail carries a duplicate
     edge, and the zero branch would carry a duplicate `none_to_ask`). ⚠ A DIFFERENT writer (a bank save, DPDPA consent, a closure) can
     ⛔ win the append: the selection insert's FK to `claims` (`0054_claim-peer-mesh.sql:74`) takes FOR KEY SHARE on the claim row before
     the job reads the stream head, which serializes it against their FOR UPDATE. ⭐ So: the FIRST statement in the transaction is
     `claim.lockClaimCase` (FOR UPDATE — `packages/domain/src/claim/read.ts`), THEN the probe, THEN the state guard — the loser waits
     on the lock, then finds the winner's selection and no-ops; a `ClaimStreamConcurrencyError` is ⛔ never swallowed — it is rethrown
     and pg-boss retries the whole transaction (defensive: with the lock held ⛔ known appender can race). The lock is kept as that
     defence and as the order every other appender uses. This replaces 6.6's SAVEPOINT swallow on the `pinged` branch too.
   - ⭐ **A selection is persisted ONLY together with its edge.** Under the lock, a claim that is ⛔ `documents_pending` returns BEFORE
     the snapshot — `intake_converged` and every later state alike: it persists ⛔ no selection and enqueues ⛔ no window or shepherd job.
     (Today the persist at `claim-peer-mesh.ts:237` runs BEFORE the state guard at `:277`, so a select job that ran while the claim was
     still `intake_converged` would persist a `pending` selection with ⛔ no pings and enqueue its window job — the window then resolves
     with nobody asked, and once the claim reaches `documents_pending` the probe returns for ever. Whether a select job can run in
     `intake_converged` today is unproven — §Recorded.) The next document upload's OCR run enqueues a fresh select job (except a
     death-certificate replacement in the review window — `claim-ocr-parity.ts:454`, `:495`).
   - ⛔ **No heal of an existing selection.** A selection persisted before this commit with its claim still in `documents_pending`
     (6.6's states: a `skipped` zero selection — REACHABLE, SF4, asserted by `claim-peer-mesh.test.ts:527-544`; a `pending` one with ⛔
     edge — unproven; ⛔ none in production; AC14) stays as it is; the probe stays a no-op plus its shepherd self-heal.
   - The flag the shepherd enqueue keys on (`outcome.pinged`, `:266`, read at `:350`) is TRUE on the zero branch too (rename it
     `advanced` if preferred) ⇒ the shepherd-assign job is enqueued after COMMIT; the probe's self-heal (`:186-193`) already re-enqueues
     it on every later select job. ⛔ No window job (`:335` already keys on `outcome === 'pending'`), ⛔ no ping row.
   - The reducer + the transition table (`packages/domain/src/claim/state.ts:131-132`, `:386`) gain the edge; the new reducer case
     returns `state` unchanged unless it is `documents_pending` (`packages/domain/tests/claim/suspicion-refusal.test.ts:151-156` loops
     EVERY claim event type and requires `closed` to stay `closed`).
   - `CLAIM_EVENT_TYPES` (`packages/domain/src/claim/events.ts:770`), the payload map (`:818`; the `satisfies` at `:851` fails to compile
     until it has the entry) and `EVENT_TYPE_REGISTRY` (`packages/events/src/registry.ts`, beside `claim.peer_mesh_pinged`, `:206`) gain
     it — and all THREE vocabulary pins move (6.36a SF16): `packages/events/tests/claim-registry-coverage.test.ts` (set equality),
     `packages/domain/tests/claim/dpdpa-consent-events.test.ts:59` (`toHaveLength(36)` ⇒ 37) and the frozen-literal diff
     `packages/domain/tests/claim/nominee-name-check-events.test.ts:79-135` (add the literal).
   - The certificate reminder's day 0 reads the EARLIEST of `claim.peer_mesh_pinged` OR `claim.peer_mesh_none_to_ask`
     (`readCertificateWindowEnteredAt`, `packages/domain/src/claim/certificate-reminder.ts:131-152` — the `eq(eventType, …)` at `:147`
     becomes an `inArray`; its doc-block's *"the only edge `documents_pending → verification_in_progress`"* and the facts doc at `:169`
     are amended) and the sweep's no-entry alarm text (`apps/jobs/src/scheduler/claim-certificate-reminders.ts:303`). ⛔ No other
     functional reader of `claim.peer_mesh_pinged` exists at `51382898` (comment-only hits: `boot.ts`, `restoration-discipline.ts`,
     `claim-shepherd-assign.ts`, `packages/queue/src/index.ts`, `events.ts`); re-grep at build.
   - Tests: the claim reaches `verification_in_progress`; a ground inspection can then be scheduled (`CLAIM_REVIEW_WINDOW_STATES`
     includes it); a shepherd job is enqueued; a reminder run opens from that event; a re-run is a no-op (⛔ second event); a select job
     run while the claim is `intake_converged` ⇒ ⛔ selection row, ⛔ window job, and a later run after `documents_received` selects
     normally; the race (two connections), once for each branch: connection B runs the select job's own transaction up to its edge
     (`lockClaimCase`, the selection, the edge event) and holds it open; start the job on connection A; wait until `pg_stat_activity`
     shows A waiting; COMMIT B; await A ⇒ exactly ONE edge event in the claim's stream (today, the PINGED leg: A's unlocked probe finds
     nothing, waits on the selection's unique index, then appends a second edge — RED; the zero-branch leg pins the new code — there
     is ⛔ zero-branch edge to duplicate before Task 5).
10. **AC9 — the source on every ping** (SW24, I9): the ping intents of a `workplace_named_v1` selection carry `source`; a ping whose
    `source` differs from its selection's is refused by the trigger (a test); a `district_cohort_v1` selection's pings carry `null`.
11. **AC10 — the wire and the screen** (SW24, I10; `-326` BD1 A):
    - `PeerMeshPingView` (`packages/contracts/src/claims/verifier-console.ts:225-257`) gains `source: z.enum(['workplace',
      'named_by_member']).nullable()` — REQUIRED on the wire (⛔ optional: an absent key would hide a defect); the assembler maps the ping
      row's column at `apps/api/src/modules/claims/peer-answers-assembler.ts:262-271` (⛔ no new read — `getPeerMeshPingIntentsBySelection`
      and `getPeerMeshSelectionByClaim` already `.select()` every column, `peer-mesh-read.ts:150`, `:172` ⇒ `VERIFIER_CONSOLE_MAX_READS`
      stays 29 and its four pins stay unchanged).
    - `PeerMeshTranscript` (`verifier-console.ts:288-307`) gains `recentChangeBeforeFiling: boolean | null` (REQUIRED, null for
      `district_cohort_v1`), mapped in `assemblePeerMeshSection` (`peer-answers-assembler.ts:336-350` — the selection row is in hand).
    - Every fixture building either type is amended (contracts tests sit outside `tsc` — run vitest): `apps/admin/tests/
      neighbours-answers-panel.test.tsx`, `apps/admin/tests/verifier-console.test.tsx`, `apps/admin/tests/
      peer-mesh-inspection-discrepancy.test.tsx` (a typed `PeerMeshTranscript` literal, `:12-21`), `apps/api/tests/unit/
      peer-answers-stitch.test.ts`, `packages/contracts/tests/claims-peer-answers.test.ts`, `packages/contracts/tests/
      claims-verifier-console.test.ts` (re-grep `callbackBasis` / `inspectionDiscrepancies` at build for any twin added since).
    - `PeerMeshView` renders *"Chosen from the workplace"* / *"Named by the member"* (`verifierConsoleEn.peerMesh`,
      `apps/admin/src/modules/claim-verification/i18n-en.ts:93-152` — module-local English by design, ⛔ Hindi twin) BESIDE the `relationship` answer row when
      the reply has one (`PeerAnswerRow`, `PeerMeshView.tsx:72-74`, `:173-193`), otherwise in the ping header (`:53-65`) — so an
      unanswered ping shows it too — and nothing for `null`; and renders `recentChangeBeforeFiling` once at the top of the section as
      *"The member's workplace or the people they named changed in the 90 days before this claim was filed."* (6.36a SW20).
    - 2026-10-16 review R1 annotation: RF1 C (`-339`) can use an earlier filing. The staff line now says *"The member's workplace or the people they named changed in the 90 days before the filing used to choose whom to ask."* The original copy above is retained as the pre-RF1 wording; the corrected copy is tested on both staff surfaces.
    - Tests on BOTH surfaces — the District Admin's console (`verifier-console.test.tsx`) AND the approvers' panel
      (`neighbours-answers-panel.test.tsx`), plus the API spec that drives both in one file (`apps/api/tests/integration/claims/
      peer-answers-approvers.spec.ts` — `consolePings` vs `read`).
12. **AC11 — ⛔ never to the inspector, the helpline or a member** (I10; `-310` CF2): ⛔ no `source` on the ground-inspection wire
    (`apps/admin/src/api/client.ts:1283-1296`), the showings table or `GroundInspectionPage`; ⛔ no `recentChangeBeforeFiling` there
    either (the schema-key tests cover BOTH keys); ⛔ not on `PeerRequestDetailResponse` (`packages/contracts/src/claims/
    peer-request.ts:93-99` — the neighbour's own view, shared by the helpline; ⛔ `.strict()`, so the test asserts the key's ABSENCE from
    the schema shape); a schema-key test on each that ⛔ no key named `source` exists. ⚠ An inspector who also holds `claim.verify` sees
    the console's full section once their own visit is complete — the console's existing audience (CF2's District Admin / verifiers
    row; `-327` BD4, 6.27b PM25 (c)), recorded, ⛔ not changed.
13. **AC12 — the job test** (`apps/jobs/tests/claim-peer-mesh.test.ts`, the ONLY test that runs `runClaimPeerMeshSelect`; its replay legs
    already pass the stored id, `:307`, `:350`): the legs that assumed the district default are rewritten for `workplace_named_v1` (seed
    postings with workplaces); the legacy district legs move to the pure engine + replay with `'district_cohort_v1'` pinned (⛔ through
    the job, whose default has moved); the zero-candidate leg now expects `verification_in_progress`, the new event and the new
    `skip_reason`; AC8's lock / `intake_converged` / race legs live here.
14. **AC13 — the 6.27 set's annotations are CHECKED** (6.36a Task 0.4 wrote them; present at `51382898`): 6.27a Invariant 4 / Trap 8,
    6.27c AC5, its Dev Notes and its v4 line name `-311` PM1, `ranked_member_ids`, the SW23 predicate, the inherited ping `source`, and
    SF11's `recordPeerMeshResponse` check (6.27c moves it to the ping rows). Re-read them after the build; a mismatch with what was built
    gets a dated annotation in 6.27c, ⛔ a rewrite. ALSO (Task 7): the 6.6 story file's dated annotation that D3 and its review item
    *"Zero-candidate selection has no defined disposition"* are superseded by `2026-10-14-330`, and 6.36a SW17's dated annotation
    naming `-333` call 1.
15. **AC14 — the deferred items** (SW30; by item heading, ⛔ line numbers; appended lines, ⛔ rewrites):
    - *"A claim whose peer mesh finds ZERO candidates never leaves `documents_pending`…"* ⇒ *"Closed by 6.36 (code commit <sha>) — for
      selections made after that commit; a `district_cohort_v1` selection already `skipped` stays where it is — ⛔ none exist in
      production."*
    - *"`-308`'s 6.27a share — each answer's SOURCE on the reply and the console — HANDED OFF to row 6-36"* AND its `-326` sub-bullet ⇒
      each *"Closed by 6.36 (code commit <sha>)"*.
    - *"`getPeerMeshCandidateSnapshot` has no cap on active-roster size"* ⇒ *"⭐ NARROWED by 6.36 (code commit <sha>) for
      `workplace_named_v1` — the snapshot reads only the deceased's two workplaces and ≤ 3 named people; a very large office is still
      unbounded (the 500 cap limits only the STORED ranking); the `district_cohort_v1` read is unchanged. ⛔ Not closed."*
    - *"The deceased's FAMILY who are themselves members are ⛔ not excluded from the five (PM1, RECORDED)"* ⇒ *"⛔ not taken by 6.36 — no
      family-link data (SW23); stays OPEN."*
    - A NEW item (Task 7): the OCR job's swallowed `ClaimStreamConcurrencyError` (below, §Recorded — reachability unproven).
16. **AC15 — `pnpm ci:local` green.**
17. **AC16 — the next version of the neighbours' questions, `peer_mesh.v4`** (`-331` SC4 A — *"school or office", in the next version
    (answers already given keep their words)*; who builds it is our reading, ⛔ ratified; built in `-329`'s v3 shape):
    - `packages/domain/src/questionnaires/peer-mesh.ts` gains `PEER_MESH_QUESTIONNAIRE_V4` = v3's pages with ONE change — the
      `relationship` option `school_colleague` (code UNCHANGED, so stored answers keep their meaning; defined in v2 at `:110-113`, which v3
      spreads) takes a NEW copy key `peer_request_questions.relationship.school_or_office_colleague` (*"A colleague at the same school or
      office"* + Hindi in `packages/i18n/locales/{en,hi}/claim.json` — the reviewed Hindi is Row 28's); `-331` in BOTH the `relationship`
      question's `approvedBy` and the version's (the v3 precedent). v4 `status: 'live'`, v3 flipped to `'historical'`.
    - ⚠ `packages/domain/src/questionnaires/keys.ts` — add `'2026-10-14-331'` to `PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS` (`:62-68`):
      `validator.ts:55-58` rejects an unlisted `approvedBy` and `registry.ts:21` validates every version at MODULE LOAD ⇒ without the entry the
      boot fails. The list's comment says adding one is a reviewed code edit that cites its decision.
    - `packages/domain/src/questionnaires/registry.ts` — import + append v4 to `QUESTIONNAIRE_REGISTRY`. ⛔ No DB row, seed or migration:
      liveness is the code constant `status` / `scope` read by `resolveLiveVersion`; replies pin a text version id. (The recipe 6.27b
      used for v3: `peer-mesh.ts` + `registry.ts` + `keys.ts` + en/hi `claim.json` + `questionnaires.test.ts`.)
    - A reply keeps the version it pinned (a v3 reply shows *"A colleague at the same school"* — labels resolve per reply version,
      `peer-answers-assembler.ts:200-209`); every question the Panel ruled is in v4 (`-310` CF3 (a) — the validator); the two `'pending'`
      health questions and their `counselBasis` carry over unchanged (6.27c's AC2b hold reads `resolveLiveVersion` — ⛔ a version name).
    - ⚠ The v3-live pins MOVE: `packages/domain/tests/questionnaires/questionnaires.test.ts:80-90` (the registry list, v3 `'live'`,
      `resolveLiveVersion → V3`) and `:109-114` (fixtures spread from V3 with `versionId: 'peer_mesh.v4'` — once v3 is historical the
      spread inherits `status: 'historical'` and the legs go vacuous, AND the id collides with the real v4 ⇒ rebuild them from V4 as
      `peer_mesh.v5`, the 6.27b trap recorded at `:107-108`); `apps/api/tests/integration/claims/peer-request-member.spec.ts:151`,
      `:160-173`; `packages/domain/tests/integration/claim/peer-mesh-reply.spec.ts:60`, `:179`.
    - Tests: the validator accepts v4; a new reply pins v4; a v3 reply renders v3's words; the copy keys exist in en AND hi
      (`questionnaires.test.ts:352-363`, a JSON read over every registered version — covers v4 automatically) and resolve through the real
      `t()` in en AND hi (`peer-request-member.spec.ts:160-173`'s leg, moved to v4).

## Tasks / Subtasks

- [x] **Task 1 — the migration (AC0 checked, AC1, AC9).** Columns, the scoped CHECKs, the scoped prefix trigger, the ping `source`
      trigger (⛔ raises on a missing selection), the `member_postings` workplace index, the REVOKE UPDATE + column GRANT on the selection table; the Drizzle
      schema (`claim_peer_mesh_selections.ts`: the snapshot row type becomes a union — the legacy `{ memberId, district, createdAt }` and
      the grouped `{ memberId, group, settled }` (the ranking reads `settled` — I7: a replay rebuilds the ranking from the PERSISTED
      snapshot alone; a test replays a stored selection); `claim_peer_mesh_pings.ts`; `member_postings.ts`'s `index()`); the policy-regression and trigger specs
      (AC1). ⚠ The legacy `deceased_created_at` is NOT NULL (`0054_claim-peer-mesh.sql:51`; `deceased_district`, `:50`, is nullable): for
      `workplace_named_v1` both are still written from `getPeerMeshDeceasedAttributes` (unchanged) and are read by nothing in the grouped
      metric or its replay — the schema comment says so. Apply on :5432 and :5433.
- [x] **Task 2 — the engine and the registry (AC2, AC3).** FIRST the v1 entry's literal id (AC3). `packages/domain/src/claim/peer-mesh.ts`:
      keep `selectPeerMesh` (`:61-84`); add `selectPeerMeshGrouped` (the 500 truncation, the duplicate-id throw) and `runPeerMeshMetric`;
      rewrite the header's *"DO NOT add … school-proximity … inputs here"* to name SW18 (it supersedes 6.6 D3 — `-330`; AC3).
      `peer-mesh-metric-registry.ts`: the union type, the new entry, the new default, the header comment. The hash — `node:crypto`
      `createHash('sha256')` (pure, deterministic; the domain package runs on Node). Narrow every `resolvePeerMeshMetric(…)` →
      `selectPeerMesh` caller (AC3).
- [x] **Task 3 — the cut and the snapshot reads (AC4, AC5, AC6).** The ONE cut function (AC4 — the shipped IST helpers). In
      `packages/domain/src/claim/peer-mesh-read.ts`: `getPeerMeshWorkplaceSnapshot(db, { pariwarId, deceasedMemberId, claimantActorId,
      cut, filingDate })` — the deceased's postings as of the cut (the row kinds; current, previous, the 90-day test against the filing
      date), the candidates driven from the workplace index (each with its `settled` flag from the run's EARLIEST `created_at`) whose latest
      posting as of the cut is at either workplace, each through the SW23 predicate; and `getPeerMeshNamedSnapshot` — the deceased's links
      by AC5's predicate, through the same SW23 predicate; and the `recent_change_before_filing` read. The SW23 predicate (AC6) beside
      them. ⚠ Every correlated subquery over `member_postings` uses the LITERAL `"members"."member_id"` qualifier (the CORRELATION FIX
      note, `peer-mesh-read.ts:60-71`; the qualifier itself at `:84`, `:126`). ⚠ The snapshot read is BOUNDED by the two workplaces and ≤
      3 named people — ⛔ the whole roster (NARROWS the 6.6 uncapped-snapshot item for this metric — ⛔ closed).
- [x] **Task 4 — the job (AC4–AC9, AC12).** `apps/jobs/src/claim-peer-mesh.ts` `runClaimPeerMeshSelect`: FIRST `lockClaimCase`, THEN
      the idempotency probe (unchanged — a no-op plus its shepherd self-heal), THEN the state guard (⛔ `documents_pending` ⇒ return before
      the snapshot, ⛔ selection); the cut from the claim's `created_at`;
      the snapshot; `runPeerMeshMetric`; the persist (new columns); the pinged branch with `source` on the ping intents; the zero branch
      with `claim.peer_mesh_none_to_ask` + `skipPeerMesh` (the new skip constant) + the shepherd enqueue. ⭐ REPLACE the SAVEPOINT swallow
      of `ClaimStreamConcurrencyError` with the lock + rethrow on BOTH branches (AC8). `persistPeerMeshSelection` /
      `persistPeerMeshPingIntents` (`peer-mesh-persist.ts:58-95`, `:102-123`) take the new fields. ⭐ Preserve: the winning-row rule, the
      after-COMMIT enqueues, the window job only for `pending`.
- [x] **Task 5 — the event (AC8).** `events.ts` (the type tuple, the payload schema, the map), `state.ts` (reducer + table),
      `packages/events/src/registry.ts`, the three vocabulary pins, the certificate-reminder reader (+ its doc-blocks) and its sweep's
      alarm text. Re-grep `peer_mesh_pinged` in `apps/*/src packages/*/src scripts` at build for any reader added since `51382898`.
- [x] **Task 6 — the wire and the screen (AC10, AC11).** Contracts, the two assembler mappings, `PeerMeshView`, the copy, the six fixture
      files, the tests on both surfaces, the negative schema tests.
- [x] **Task 7 — records and close (AC13–AC15).** CHECK 6.36a Task 0.4's annotations (AC13); the deferred-work appended lines (AC14 — by
      item heading) and ONE new item for the OCR job's swallowed race (§Recorded — reachability unproven); the 6.6 story file gains a dated annotation (⛔ a
      rewrite) that D3 and its review item *"Zero-candidate selection has no defined disposition"* are superseded by `2026-10-14-330`
      (SW18, SW25 — author-commit); 6.36a's SW17 *"perhaps by the family"* gains a dated annotation naming `-333` call 1 (⛔ removal once a
      claim names the member); the Change Log and File List; `pnpm ci:local`.
- [x] **Task 8 — `peer_mesh.v4` (AC16).** The version, the `keys.ts` allow-list entry, the registry, the copy key (en + hi + `$comment`
      naming `-331`), the module header's version list, the moved v3 pins, the tests; the 6.27c annotation already names v4 (6.36a's
      Task 0 follow-up).

### Review Findings

2026-10-16 — `bmad-code-review 6.36`, full review of `51382898..0d4c23af` (58 files, +4,425 / −717 lines), three independent layers: Blind Hunter (diff only), Edge Case Hunter, Acceptance Auditor. **0 decision-needed, 1 patch (MEDIUM / P2), 0 defer, 3 dismissed candidates.** BigDev chose option 1 (apply the patch). R1 is resolved; story and sprint status are `done`.

- [x] [Review][Patch] **R1 — MEDIUM / P2: date the staff warning against the filing used for selection.** [`apps/admin/src/modules/claim-verification/i18n-en.ts:132`] — RF1 C (`2026-10-16-339`; AC4's later annotation) now computes `recentChangeBeforeFiling` relative to the death's FIRST filing without a `member_found_innocent` finding (`resolvePeerMeshFilingCut`, `packages/domain/src/claim/peer-mesh-read.ts:293-303`). AC10's original copy still says "in the 90 days before this claim was filed." Example: first filing on 1 April, a workplace change on 20 March, then a second filing on 1 October; the second claim retains a true warning but its screen falsely dates March's change to the 90 days before October. Correct the wording to identify the filing used for selection, preserving RF1's innocence exception, and cover a later refiling on both shared staff surfaces. This is an engineering correction to make the disclosure accurately describe the existing selection rule; no new Panel ruling is required. Source: Blind Hunter; verified against the anchor, snapshot composition, assembler and shared view.

**R1 resolution (2026-10-16):** the shared staff copy now says "The member's workplace or the people they named changed in the 90 days before the filing used to choose whom to ask." This describes the resolved anchor without implying that it is always this claim's own filing or ignoring the innocence exception. The existing console and later-approver tests both assert the corrected words directly; the contract field comment documents RF1 C. Post-fix verification: **105 tests passed in four files** (81 admin, 24 contracts); `git diff --check` passed. No selection logic or wire shape changed. No unresolved review findings remain.

**Verification in this review:** 369 tests passed across 22 files: domain unit/questionnaires 138; admin 85; contracts 26; live domain snapshot / 0163 policy regression / certificate reminders 49; live select/window worker 25 (including both two-connection races and real pg-boss delivery); API 43 (including both staff audiences and member questionnaire pinning); event-registry coverage 3. Live tests used the existing test database on :5433; the initial sandbox connection denial was resolved by rerunning with approved database access. `git diff --check` passed. The full `pnpm ci:local` gate was not rerun during review; its recorded green run on `e4316ffb` remains the implementation evidence for AC15.

**Invariant lens:** families 1, 2, 3, 5 and 6 covered by the named state/idempotency/race, RLS, direct constraint/grant, replay and audience tests above; families 4, 7, 8, 10, 11 and 12 covered by construction (projector and selection share a transaction; `min` / `NOT EXISTS` and distinct/grouped candidate reads avoid fan-out; system attribution; explicit narrow closures; the member-facing policy sentence; tenant/member predicates and a server-loaded deceased id through the enqueue chain). Family 13 covered by readable DOM text with no new interactive or measurable roles. Family 9 is untouched. R1 identified the correctness gap between the later anchor rule and the original staff copy; the resolution above closes it.

**Dismissed candidates:** legacy empty/skipped selections are expressly excluded from healing by AC8 and AC14 (no production rows, no backfill); storing the previous workplace id even when it does not count is required by AC5 for row 6-32 (the schema comment is stale, selection filtering is correct); the worker's payload deceased-id trust predates this diff and current producers obtain it from the loaded claim, so queue tampering alone supplies no constructible new user path.

#### Round 2 (2026-10-16)

`bmad-code-review 6.36` round 2: the whole branch `51382898` → the working tree (the R1 patch included; 48 code files, +3,479 / −517, plus records). Three layers ran in parallel: Blind Hunter (14 candidates), Edge Case Hunter (5), Acceptance Auditor (5, with checklist verdicts). Result: **2 decision-needed (both resolved ⇒ P8, P9), 7 patch, 1 defer, 12 dismissed.** No HIGH. The Auditor checked AC0–AC16 against the code and against `-339`, `-331`, `-330` and 6.36a SW17–SW27 read verbatim, and found no AC violation. It also found R1's copy correct: it matches `-331` SC1 A's *"…changed in the 90 days before the claim"* as read with `-339`.

- [x] [Review][Decision] ~~D1~~ **RESOLVED 2026-10-16 (BigDev: "Salt by the anchor claim") ⇒ P8.** **D1 — MEDIUM: a refiled death draws a different five from the same frozen pool.** [`packages/domain/src/claim/peer-mesh.ts:132`] — the rank key is `sha256(claimCaseId ':' memberId)` (SW22 as written). Since `-339` C, a second claim for the same death gets the FIRST filing's cut, so the candidate pool is identical, but the salt is the new claim's id, so a different five are asked. Example: 12 settled colleagues; claim 1 asks five and is refused; the family refiles; claim 2 asks a different five. The pool cannot be changed, but a refile re-draws who is asked. `-339`'s option as put (*"A change made to the dead member's account after the first filing ⛔ never decides who is asked, on any later claim"*) speaks to account changes, ⛔ not the draw. Pinned by `peer-mesh-grouped.test.ts:165` ("salted by the claim"); no refile leg with more than five candidates. Source: Edge Case Hunter.
- [x] [Review][Decision] ~~D2~~ **RESOLVED 2026-10-16 (BigDev: "Exclude every claimant") ⇒ P9.** **D2 — MEDIUM: only THIS claim's claimant is excluded; an earlier claimant of the same death can be asked.** [`packages/domain/src/claim/peer-mesh-read.ts:430`] — `peerMeshEligibleMemberSql` excludes `member_id <> claimRow.claimantActorId` only (SW23: *"⛔ not the claimant"*, singular). Example: member X (a colleague and the nominee) files claim 1; it is refused or closed; a helpline or operator files claim 2 (claimant NULL, or someone else); X is eligible and can be one of the five asked about the death X filed. The cut became death-level with `-339`; the claimant exclusion stayed claim-level. Source: Edge Case Hunter.
- [x] [Review][Patch] **P1 — LOW: the schema comment says `deceased_previous_workplace_id` is "set only when it COUNTED"; the code stores it whenever a previous workplace exists (AC5, for row 6-32).** [`packages/domain/src/schema/claim_peer_mesh_selections.ts:168`] — round 1 dismissed the behaviour as correct and the comment as stale; the stale comment is on the column row 6-32 will read. Fix the comment. Source: Blind + Edge.
- [x] [Review][Patch] **P2 — LOW: R1 and `-339` are not carried into the record documents.** [`_bmad-output/implementation-artifacts/6-36a-member-workplace-and-posting-history.md` SW20; `_bmad-output/planning-artifacts/epics.md` (Story 6.36 entry, the 2026-10-15 validate annotation)] — 6.36a is the record and SW20 still quotes the pre-R1 copy with no dated annotation (SW19 has its `-339` one). The epics.md annotation still calls RF1 open and not sent. Add dated annotations; ⛔ no rewrite. Source: Auditor.
- [x] [Review][Patch] **P3 — LOW: the zero-branch race test's connection B skips `skipPeerMesh`, so its selection commits `pending` rather than the real job's `skipped`.** [`apps/jobs/tests/claim-peer-mesh.test.ts:705`] — A's no-op then enqueues a window job for a zero selection, which the real job never does, and `sends` is not asserted. Add `skipPeerMesh` to B and assert no window send. Source: Auditor + Blind.
- [x] [Review][Patch] **P4 — LOW: the anchor read is never exercised under `twt_app`, and the snapshot spec's cross-Pariwar check is vacuous.** [`packages/domain/tests/integration/claim/peer-mesh-workplace-snapshot.spec.ts:629`, `:637`] — `resolvePeerMeshFilingCut` reads `claims` and `claim_nominee_findings`; a lost grant or policy would make every select job throw and stall claims in `documents_pending` (the grant exists today: `0119`). Call it in the `twt_app` leg. The foreign posting at `:637` names a different workplace id, so the `workplace_id IN (…)` filter excludes it with or without RLS. Make the check meaningful, or say plainly what it does prove. Source: Auditor.
- [x] [Review][Patch] **P5 — LOW: comments elsewhere describe the removed SAVEPOINT and the pinged-only flow.** [`apps/jobs/src/restoration-discipline.ts:273`; `packages/queue/src/index.ts:124-131`, `:146-148`; `apps/jobs/src/boot.ts:489`] — they cite the `peer_mesh_pinged` savepoint as the convention, the "5 nearest" selection with `singletonKey` preventing a double select (inert on this queue — AC8), and a shepherd enqueued only after `pinged`. Source: Auditor.
- [x] [Review][Patch] **P6 — LOW: `persistPeerMeshPingIntents`'s `source` defaults to `null`, which 0163's trigger refuses for a `workplace_named_v1` selection.** [`packages/domain/src/claim/peer-mesh-persist.ts:142`] — the one live caller passes it, but a future inserter (6.27c's replacement pings) would compile and then fail at runtime on every new claim. Make it required. Source: Blind.
- [x] [Review][Patch] **P7 — LOW: AC15 is not attested on the tree being marked `done`.** The last `pnpm ci:local` pass was on `e4316ffb`; R1 (uncommitted) and this round's patches are not in it. Run the gate on the final tree before the row closes. Source: Auditor.
- [x] [Review][Patch] **P8 — MEDIUM (from D1): salt the ranking by the ANCHOR claim, the claim whose filing `-339` C anchors on.** [`packages/domain/src/claim/peer-mesh.ts:132`; `peer-mesh-read.ts` `resolvePeerMeshFilingCut`; `0163`] — Governance first: an author-commit superseding `-330` SW22's salt (*"`claim_case_id`"*) IN PART, committed ALONE before code. Then:
  - `resolvePeerMeshFilingCut` returns the anchoring claim's id beside the cut. It is the selected claim itself when it is the first, or when every earlier claim is innocence-lifted.
  - The engine salts by that id.
  - The selection stores it in a new `anchor_claim_case_id uuid null` column, NOT NULL for `workplace_named_v1` by the scoped CHECK, and immutable by grant.
  - Replay reads the stored id, so I7 holds and is never re-derived from live claims. A legacy selection salts by its own claim.
  - **0163 is amended in place**, because it is unmerged. The same `ALTER` is applied by hand on :5432 AND :5433. ⛔ Not a new `0165`: it would merge before 6.36c's `0164`, and the migrator silently skips an out-of-order migration (`-332` call 2).
  - Tests: a refile with more than five colleagues asks the SAME five; an innocence-lifted first claim gives the refile its own draw; replay of a stored refile selection; the policy spec covers the new column. The "salted by the claim" leg is re-pinned.
- [x] [Review][Patch] **P9 — MEDIUM (from D2): exclude every claimant of ANY claim naming this deceased.** [`packages/domain/src/claim/peer-mesh-read.ts:430`] — Governance first: the same author-commit supersedes `-330` SW23's singular *"⛔ not the claimant"* IN PART.
  - `peerMeshEligibleMemberSql` replaces `member_id <> claimantActorId` with a death-level `NOT EXISTS (claims c WHERE c.pariwar_id = m.pariwar_id AND c.deceased_member_id = <deceased> AND c.claimant_actor_id = m.member_id)`. This covers any state, innocence-lifted claims included, and keeps today's NULL-claimant behaviour.
  - The exported signature and 6.27c's inheritance note are updated.
  - Recorded residual: a pending second-channel `intake_attempts` filer, which has no claim row.
  - Tests: an earlier claimant of a refused claim ⛔ asked on the refile; another death's claimant still asked.
- [x] [Review][Defer] **W1 — LOW: no DB backstop that `deceased_workplace_id` / `deceased_previous_workplace_id` are this Pariwar's workplaces, and no CHECK for `previous_workplace_counted = true ⇒ deceased_previous_workplace_id IS NOT NULL`.** [`packages/domain/migrations/0163_peer-mesh-workplace-selection.sql`] — deferred. AC1 specified plain `uuid null`; the job reads both ids from the Pariwar's own postings (FK-scoped), so it is unreachable today; 0163 is already applied on :5432 / :5433. ⭐ Trigger: row 6-32 (the columns' reader) or any second writer.

**Fix-diff review (2026-10-16, user: "run adversarial review on patches applied").** Three layers ran in parallel on the patch diff over `4c74c5b6` (1,066 code lines plus records): Blind Hunter (15 candidates), Edge Case Hunter (6), Acceptance Auditor (10; P1–P9 verified as specified, P4 partial).

Applied (F1–F14):
- F1: the same-instant tie-break leg is deterministic. The later-inserted claim has the lower id, so heap order and the tie-break disagree.
- F2: replay THROWS on a grouped row with no anchor (⛔ silently re-salted).
- F3: the schema comment's "read under the claim lock" is corrected.
- F4: the engine's refile leg is titled honestly.
- F5: three garbled comments are fixed.
- F6: the 0163 header no longer claims the hand delta was applied.
- F7: story and sprint row are `in-progress` until the gate.
- F8: AC1 is annotated.
- F9: the registry records the in-place salt change as a one-time exception.
- F10: the `twt_app` leg now resolves the anchor THROUGH an innocence finding, so a lost findings policy fails it. This completes P4. The stray-row `twt_app` leg proved nothing beyond the superuser leg and is removed.
- F11: the snapshot spec's header no longer claims a ranking test.
- F12: P9's leg covers an innocence-lifted claim's filer.
- F13: the job refuses a payload whose deceased is ⛔ the claim's own, now that that id chooses the anchor and the exclusions (family 12 (a)); there is a jobs leg for it.
- F14: File List and Change Log are updated.

Deferred:
- [x] [Review][Defer] **W2 — LOW: an anchor LATER than the claim being selected for.** [`packages/domain/src/claim/peer-mesh-read.ts` `resolvePeerMeshFilingCut`] — Example: claim A, then claim B for the same death; A is innocence-lifted while still `documents_pending`; A's select job anchors at B and reads past A's own filing day. Unreachable until row 6-22 writes the finding, and neither `-339` nor `-340` covers the case. ⭐ Trigger: row 6-22.
- [x] [Review][Defer] **W3 — LOW: someone already asked who LATER files a claim for the same death keeps their live ask.** [`peer-mesh-read.ts` `peerMeshEligibleMemberSql`] — `-340` call 2 is read at selection; nothing re-applies it to a sent ping or a reply. ⭐ Trigger: 6.27c's send-time re-check, which reuses the predicate.
- W1 is widened: there is also ⛔ FK or check that `anchor_claim_case_id` names a claim of this Pariwar and this death (one writer).

**Edge #1 resolved by `2026-10-16-341`** (BigDev: *"Exclude attempt filers"*, committed alone as `5511a2e2`): the predicate also excludes the filer of ANY `intake_attempts` row for the death, in any status, with legs on the superuser read AND under `twt_app`.

**Convergence round** (one combined adversarial + edge layer, on the interdiff since the fix-diff review): 3 LOW, all applied, no defect in the new SQL.
- The replay throw has its own leg and uses `== null`.
- The `-341` leg's claim is filed on the helpline channel, as its comment says.
- **Recorded residual, more precise than `-341`'s own sentence (`-341` ⛔ edited):** a filing the ICP absorbs WITHOUT a row leaves its filer ⛔ excludable. There are two such paths, not one: a filing on a channel the claim already carries (ICP (3b), a no-op), AND a filing on a channel that already has a PENDING attempt for the death (ICP (3c) reuses the first filer's row; the one-pending-per-channel index forbids a second). ⛔ No read can exclude a person the system never recorded.

**Round 2 closed (2026-10-16).**
- P1–P9 and F1–F14 are applied, and the convergence round's three LOW items are applied.
- **Decisions:** `-340` (`4c74c5b6`) and `-341` (`5511a2e2`), each committed alone before its code.
- **Live databases:** `twt-test-pg` (:5433) was RECREATED fresh (BigDev's choice) and migrated from zero (163 migrations; the amended 0163's CHECK verified). ⚠ The native :5432 still carries the EARLIER 0163 (⛔ `anchor_claim_case_id`): the hand delta (the column, the widened CHECK, the journal hash) was blocked by the auto-mode classifier and is ⛔ applied. Until it is, a `workplace_named_v1` selection insert on :5432 fails. `ci:local` does not use it.
- **Targeted runs on :5433:** domain 37 (snapshot 28, policy 9) + 752 in `tests/claim` and the reply / certificate specs; jobs 27; API 79.
- **P7, the gate:** `pnpm ci:local` on the final tree, `DATABASE_URL` = :5433: **PASSED — 36 / 36 jobs green.**
  - Integration: domain 5,397 (+1 skipped), API 1,782 (+1), jobs 807, validity-service 284, channels 231, niyamavali-engine 144, events 36, queue 4.
  - Unit: contracts 1,377, admin 1,174, mobile 1,009, public 748.

Dismissed:
- `claimant_actor_id` type: it is `uuid` (checked live).
- The in-place migration on other databases: :5434 stops at 0162, and snapshots end at 0020.
- Refile cleanup: `cleanup` deletes by deceased.
- Metric version not bumped: F9 records the exception.
- Race leg B's connection: it is `bindScopedDb(b)`.
- Ping-intent callers: there is one, and it passes `source`.
- `deceasedPreviousWorkplaceId`: verified in code.
- Per-candidate `NOT EXISTS`: indexed on `claims.deceased_member_id`.

**Dismissed (12):**
- The staff line fires on any latest posting in the window, including a re-declaration of the same workplace, and on a removed unanswered ask. That is SW20 word for word (*"the dead member's latest posting was recorded, or any of their named people was ACCEPTED or REMOVED"*).
- Legacy parked `skipped` selections are not healed (AC8 / AC14; round 1).
- `claimantActorId` is bound un-branded, but `claims.claimant_actor_id` is a `uuid` column.
- Only the certificate reminder learned the new edge. Re-grepped: ⛔ no other functional reader of `claim.peer_mesh_pinged`, and `computeStageSlaStatus` does not read it.
- The narrowed UPDATE grant: AC1's writers are enumerated and the policy spec covers them.
- The inspector-wire test is client-side, as AC11 places it. The server's inspection handler builds typed DTOs and never reads the peer-mesh tables, so it is covered by construction.
- The schema-key walker's unwalked Zod kinds: the schemas are plain objects.
- Previous-workplace people rank first: that is AC2 / SW22.
- The `source` vocabulary is in three places, backed by the DB CHECK.
- `Date` parsing of timestamps.
- No drizzle snapshot: snapshots end at `0020`; migrations are hand-written.
- R1's copy against the ratified sentence: it matches `-331` as read with `-339` (Auditor).

## Dev Notes

### Current state of the code this part changes (re-read at `51382898` — unmoved since `2581c514`)
- **The SELECT worker** (`apps/jobs/src/claim-peer-mesh.ts:153-367`, ONE `withPariwarScope` transaction): idempotency probe (`:181-194`)
  → `getClaimCase` (⛔ lock) → `getPeerMeshDeceasedAttributes` → `getPeerMeshCandidateSnapshot` (excluding the claimant) →
  `resolvePeerMeshMetric()` (⚠ NO argument — the default, `:221`) + `selectPeerMesh` → `persistPeerMeshSelection` (the WINNING row is
  authoritative) → zero ⇒ `skipPeerMesh` and return `pinged: false` (`:255-266`) → `documents_pending` ⇒ `claim.peer_mesh_pinged` under a
  SAVEPOINT that swallows `ClaimStreamConcurrencyError` (`:277-306` — ⚠ replaced by AC8) + `persistPeerMeshPingIntents` → after COMMIT
  the 72-hour window job (only for `pending`, `:335`) and the shepherd job (`:350-360`).
- **The engine** (`packages/domain/src/claim/peer-mesh.ts:61-84`) and **the registry** (`peer-mesh-metric-registry.ts:65-136`) — SF6.
- **The selection table** (`packages/domain/src/schema/claim_peer_mesh_selections.ts`; `0054:45-62`; one row per claim — `claim_case_id`
  UNIQUE): the snapshot and output IMMUTABLE; `outcome` / `response_window_expires_at` / `skip_reason` mutable; ≤ 5 selected (CHECK,
  `:61`); `candidate_snapshot` is uncapped jsonb; *"NO PII"* — ⭐ keep it so: the new columns hold workplace ids (Tier 3), booleans and
  member ids — ⛔ never a date of death.
- **The ping table** (`claim_peer_mesh_pings.ts:57-116`; 0054 + 0156; FK to `selection_id`): UPDATE narrowed to the delivery columns
  (`0156:64-65`); INSERT is table-wide ⇒ `source` written at insert is immutable by grant.
- **`recordPeerMeshResponse`** (`peer-mesh-persist.ts:220-275`) — the 6.6 response event; it checks the responder is in
  `selected_member_ids` (`:235-237`). ⛔ Not changed here (6.27c's — SF11).
- **The views:** `PeerMeshView` props `{ transcript, now? }` (`PeerMeshView.tsx:29`), per-ping loop `:51-90`, rendered by
  `SignalsPanel.tsx:276-284` and by `NeighboursAnswersPanel.tsx:176` on four hosts (`cycle-freeze/PendingCaseCard.tsx:500`,
  `correction-closure/PariwarClosureStrip.tsx:267`, `correction-closure/EscalationPanel.tsx:437`, `r9-voting/R9CasePanel.tsx:194`); the
  code note `PeerMeshView.tsx:2-4` already names this row (*"so row 6-36's source line (`-326` BD1 A) lands on both by construction"*). The
  console renders `skipped` as *"No neighbour could be chosen"* (`i18n-en.ts:109`). ⚠ The "How do you know [member]?" question is
  `relationship` (`claim.json:184`), ⛔ `how_known` (*"How do you know they died?"*).
- **Downstream of a zero-ping claim in `verification_in_progress`** (checked at `51382898`): ground inspection can be scheduled
  (`CLAIM_REVIEW_WINDOW_STATES`, `review-window.ts:15-21`); approval warnings key on reply answers only (`approval-warnings.ts:530-538`)
  ⇒ zero answers, ⛔ wait; ⛔ approval / freeze code reads `outcome` or `response_window_expires_at`. ⛔ No gate stalls it.

### Shipped substrate this part reads (6.36a / 6.36b, at `51382898`)
- **`member_postings`** (`schema/member_postings.ts`; `0031`, `0161:298-305`): `posting_id`, `member_id`, `pariwar_id`, `district`,
  `pariwar_ref`, `is_retirement`, `workplace_id`, `workplace_request_id`, `started_on` (`'YYYY-MM-DD'` or NULL), `created_at`. APPEND-ONLY
  (GRANT SELECT, INSERT — `0031:36`); ⛔ `ended_at`, ⛔ superseded rows. Writer: `insertMemberPosting` (`member/posting.ts:54`, takes
  `exceptRequestId`). ⛔ No helper computes a current / previous workplace or a run — this part writes them.
- **`member_known_people`** (`schema/member_known_people.ts`; `0162:22-62`): `link_id`, `namer_member_id`, `named_member_id`, `found_by`,
  `state` (`asked|accepted|declined|lapsed|removed|withdrawn|erased` — `KNOWN_PEOPLE_LINK_STATES`), `asked_at`, `responded_at`,
  `ended_at`. Forward-only (guard `0162:86-108`: `asked → accepted|declined|lapsed|removed|erased`, `accepted → removed|withdrawn|erased`);
  `responded_at` / `ended_at` written once. Removal = the namer, from `asked` or `accepted`; withdrawal = the named, from `accepted`, per
  link. A death report leaves ACCEPTED links `accepted` (`-333` call 1 (b)); open asks are hidden and lapse. Index
  `member_known_people_namer_idx (pariwar_id, namer_member_id)`.
- **Predicates** (`member/known-people.ts`): `knownPersonEligibleSql` (`:94` — `active` + `active-in-grace`; ⛔ SW23), `knownPeopleCallerSql`
  (`:107` — `active`, ⛔ a claim naming them), `namedByClaimSql` (`:81`, private).
- **IST:** `istDateOf`, `addCalendarDays`, `istMidnightAt` (`cycle-calendar/holiday-resolver.ts:178`, `:201`, `:220`).
- **Claim + scope:** `claim.getClaimCase` / `claim.lockClaimCase` → `ClaimRow.createdAt`, `.claimantActorId` (nullable);
  `withPariwarScope` sets `app.pariwar_id` — every table above has a Pariwar-wide `FOR SELECT TO twt_app` policy (reachable).
- **Renewal grace** is `members.state = 'active-in-grace'` (`schema/members.ts:56`).

### Recorded, ⛔ built here
- ⚠ **CF4 A (3)'s letter from the head of the school or office** is row `6-32-inspector-questionnaire-at-the-ground-inspection`'s
  (`backlog`). ⛔ No go-live row fences it at `51382898` (`docs/launch-gate-inventory/inventory-roster.md` names ⛔ 6-32) ⇒ after this
  part, a claim with nobody to ask is inspected and approvable WITHOUT the letter until 6-32 is `done`. ⛔ Not in production (merge ≠
  go-live). ⭐ A launch-gate row making 6-32 a go-live predecessor was PROPOSED to BigDev on 2026-10-15 (BigDev adds it).
- ⚠ **The OCR job swallows a `ClaimStreamConcurrencyError` the same way** (`apps/jobs/src/claim-ocr-parity.ts:457-485`) — alarmed as
  *"benign"*, the claim left `intake_converged`, and the select job still enqueued. ⚠ Reachability UNPROVEN: on a first upload the
  job's `claim_documents` insert (its FK to `claims`) takes FOR KEY SHARE on the claim row before the head read, which serializes it
  against every FOR UPDATE appender, and a tracked death-certificate upload already takes FOR UPDATE on the claim
  (`claim-ocr-parity.ts:318-322`); only an UNTRACKED document's re-upload upsert (the DO UPDATE path, ⛔ FK check) could race. If it happens, the claim
  stays `intake_converged` until a later upload's OCR run emits `documents_received` (after AC8 the select job persists ⛔ selection for
  it meanwhile). ⛔ Out of this part's scope (the OCR job is 6.4's / 6.6's trigger seam); Task 7 records it as a NEW deferred-work item
  — reachability unproven, owner unassigned.
- ⏳ **RF1** — a death filed again moves the cut (each claim has its own `created_at`; postings are ⛔ frozen after the first filing;
  the deceased's account can ⛔ change named people — `-333` call 1 — though a named person's own withdrawal still counts). Routed to
  the Panel (non-blocking); built as written behind AC4's one function. Option A carries its own cost (a false death report, refused,
  would anchor a later real death) and option C narrows it — the note says so. ⭐ (2026-10-16 annotation — RF1 RULED: `2026-10-16-339`, Trustee-ratified, option C — the death's FIRST filing counts, unless an innocence finding (`-238`) lifts a claim; built behind `resolvePeerMeshFilingCut`.)
- A living member once wrongly reported dead stays outside every later five, permanently: SW23's *"⛔ a claim naming them as the
  deceased (any state)"* (6.36b's `namedByClaimSql`, `-333` D1 A's recorded cost) — a consequence of the shared rule, ⛔ a change made
  here. The key that would lift it is `-238`'s innocence finding (`claim_nominee_findings.kind = 'member_found_innocent'`, producer row
  6-22, unbuilt) — `nominee-lock.ts` already reads it; SW23 / `namedByClaimSql` do ⛔ not read it (recorded for 6-22).
- If the select job's three attempts all fail (pg-boss v12 defaults: retry limit 2, ⛔ backoff, ⛔ dead letter), the transaction rolls
  back: ⛔ selection, the claim stays `documents_pending`, ⛔ alarm on the final failure; only another upload re-triggers it. With the
  lock nothing is known to fail persistently — recorded, ⛔ changed here.
- Until a Pariwar imports its workplace list, every claim there goes to named people or nobody (district-only rows name no workplace).
- A deceased with ⛔ posting at all still gets a shepherd enqueue that DLQs (`claim-shepherd-assign.ts:92-99`) — pre-existing, unchanged.

### Traps
1. ⚠ **The default moves** — every caller of `resolvePeerMeshMetric()` without an id now gets the grouped metric: the select job
   (`claim-peer-mesh.ts:221`) and the domain test `packages/domain/tests/claim/peer-mesh.test.ts:25` (asserted at `:73`, `:193-199`); the
   jobs test's replay legs already pass the stored id (`:307`, `:350`) but feed `selectPeerMesh` directly (AC3). ⚠ And v1's `metricId` IS
   the constant (`:102`) — give it a literal id FIRST (AC3).
2. ⚠ **⛔ no KMS in this job** — the anchor is the filing date (SF17); a later OCR-date anchor is a NEW metric id with its own story.
3. ⚠ **`settled` reads `created_at`; the 90-day previous-workplace test reads `started_on`** — two different clocks for two different
   questions (SW22 vs SW21). Swapping them lets a typed date buy rank.
4. ⚠ **A "benign" append race is ⛔ benign** — never swallow `ClaimStreamConcurrencyError` in this job (AC8).
5. ⚠ **`declined` writes `responded_at`** — "accepted before the cut" is a STATE test, ⛔ a timestamp test (AC5).
6. ⚠ **Two eligibility predicates, ⛔ one** — 6.36b's admits renewal grace; SW23 does ⛔ (`-333` call 2 (d)).
7. ⚠ **`.strict()` everywhere** — the event payload, the wire DTO; a new required wire field breaks fixtures silently (contracts tests sit
   outside `tsc`); response schemas are PARSED.
8. ⚠ **Never leak "who" to the inspector** — the source is a category of who (CF2). The inspector's wire has ⛔ per-ping rows; keep it so.
9. ⚠ **Determinism** — ⛔ `Date.now()`, ⛔ `Math.random()`, ⛔ locale-dependent compares in the engine; the hash is over branded
   (lower-case) ASCII ids.
10. ⚠ **Same-tx clocks** — the as-of cut compares `created_at` / `responded_at` / `ended_at` (server times) with a computed IST day start;
    a live test needs rows written in SEPARATE transactions (one BEGIN ⇒ every `now()` equal).
11. ⚠ **`v4` is ALREADY a fixture id** — `questionnaires.test.ts:109-114` uses `'peer_mesh.v4'` for a Pariwar-scoped fixture; rebuild it as
    `v5` from V4 (AC16).

### Testing standards
As 6.36a. The pure engine: `packages/domain/tests/claim/peer-mesh.test.ts`'s style (byte-identical replay, input-order independence). The
job: `apps/jobs/tests/claim-peer-mesh.test.ts` (live; AC8's race leg uses two connections). The event registry coverage test is SET
EQUALITY (⛔ a count). The snapshot: live legs in `packages/domain/tests/integration/claim/` (separate transactions; one leg under
`twt_app`).

### References
6.36a (SW17–SW27, SW30, SF4–SF6, SF10, SF11, SF16, SF17, I3, I7–I11); 6.36b (`-333`; W5); 6.36c AC4 (the confirm writes a posting); 6.6's
story file (AC1, AC2, AC5, D3; its review item *"Zero-candidate selection has no defined disposition"*); 6.27a (PM1, Invariant 4, Trap 8,
Trap 9, F3); 6.27b (BD1 A — the shared view; PM25 (c); the v3 recipe); 6.27d (R5 — staff see neighbour-derived content only inside the
section); `-310` CF4 A / CF2 / CF3 (a); `-331` SC1 A / SC4 A; `-330`; `-333` calls 1 and 2 (d); `-308`; `-325` S1 A; `-326` BD1 A; `-327`
BD4; `-259` detail 3; `-263` FQ10; the RF1 routing note.

## Dev Agent Record
### Agent Model Used
Claude Opus 5.5 (1M context) — `bmad-dev-story 6.36`, worktree `.claude/worktrees/6-36`, branch `story/6-36-peer-mesh-school-wise-selection`.

### Debug Log References
- Before Task 1: `git diff --name-only 51382898..HEAD -- packages apps scripts infra` ⇒ ⛔ nothing moved (HEAD `0695874e` carried records only).
- 0163 dry-run inside `BEGIN … ROLLBACK` on :5433, then `db:migrate` on :5433 AND :5432 (both at journal 0162 / `…006` before; 0163 / `…007` after).
- Red phases: the 0163 spec 9/9 red before the migration; the race legs run against 6.6's job body (its metric pinned to
  `district_cohort_v1` so it runs on the new domain) — both RED (A returned `created: true` on the conflict path), then restored.
- Mutation checks on the snapshot spec — seven, each caught: an "isn't listed" row BREAKING the run; a decline counted as an
  acceptance; a link ended before the cut still counted; everyone `settled`; the candidates' postings ⛔ cut; the claimant ⛔ excluded;
  renewal grace admitted (2 legs).

### Completion Notes List
- 2026-10-14 — cut by `bmad-create-story 6.36` (SW1). ⛔ No code.
- 2026-10-15 — re-validated against `main` `51382898` (v2.0–v2.5) ⇒ `ready-for-dev`. ⛔ No code.
- 2026-10-16 — IMPLEMENTED (code commit `3fa2ff0c`), all eight Tasks:
  - **Task 1 / AC1, AC9** — migration `0163_peer-mesh-workplace-selection` (idx 163, `when` `1794195600007`): the six selection columns,
    the source vocabulary and the 500 cap, the TWO CHECKs scoped to `workplace_named_v1`, the selected-is-a-prefix trigger (INSERT and
    UPDATE OF the three columns, scoped), the ping `source` + its SECURITY INVOKER BEFORE INSERT trigger (NOT FOUND ⇒ `RETURN NEW`, the
    composite FK's 23503 holds), `member_postings_pariwar_workplace_idx`, REVOKE UPDATE + GRANT UPDATE (`outcome`,
    `response_window_expires_at`, `skip_reason`). Drizzle: the snapshot row is a union (`PeerMeshDistrictSnapshotRow` |
    `PeerMeshGroupedSnapshotRow`), `PEER_MESH_SOURCES`, `PEER_MESH_RANKED_MAX`. Spec `claim-peer-mesh-workplace-selection-policy-regression`
    (9 legs).
  - **Task 2 / AC2, AC3** — v1's literal id FIRST, then the default moved; the registry is `PeerMeshRankedMetricConfig |
    PeerMeshGroupedMetricConfig`; `selectPeerMeshGrouped` (previous first, settled first, sha256 over branded ids via `node:crypto`; the
    first non-empty group; 5 / 3; 500; a duplicate throws `PeerMeshDuplicateCandidateError`); `runPeerMeshMetric` (ONE dispatch; a
    mismatched candidate shape throws); `replayPeerMeshSelection` (from the persisted row alone). 6.6's unit test pins `district_cohort_v1`.
  - **Task 3 / AC4–AC6** — `peerMeshFilingCut` (the ONE anchor — RF1 option B; the shipped IST helpers), `derivePeerMeshPostingRun` +
    `peerMeshPreviousWorkplaceCounts` (SW21 word for word, pure), `peerMeshEligibleMemberSql` (SW23 — `active` only; 6.36b's
    `namedByClaimSql` EXPORTED and reused, ⛔ copied), `getPeerMeshWorkplaceSnapshot` / `getPeerMeshNamedSnapshot` /
    `getPeerMeshNamedChangeBeforeFiling` / `getPeerMeshGroupedSnapshot`. Raw SQL with explicit aliases (⛔ interpolated Column objects —
    the CORRELATION FIX trap does not arise).
  - **Task 4 / AC4–AC9, AC12** — the select job: `lockClaimCase` FIRST → the probe → the state guard → the cut → the grouped snapshot →
    `runPeerMeshMetric` → the persist (the workplace record) → `claim.peer_mesh_pinged` + pings carrying `source`, or
    `claim.peer_mesh_none_to_ask` + `skipped` (`no_workplace_colleague_or_named_person`); the SAVEPOINT swallow is GONE (rethrown);
    the shepherd keys on `advanced` (true on both edges). The jobs test rewritten (24 legs, see below).
  - **Task 5 / AC8** — the 37th claim event (schema, tuple, map, reducer + table, `EVENT_TYPE_REGISTRY`), all three vocabulary pins
    moved (a FIFTH frozen literal in `nominee-name-check-events.test.ts`); `readCertificateWindowEnteredAt` reads
    `CERTIFICATE_WINDOW_ENTRY_EVENTS` (both edges) + its doc-blocks + the sweep's alarm text. Re-grep of `peer_mesh_pinged` readers in
    `apps/*/src packages/*/src scripts`: ⛔ new functional reader since `51382898` (comment-only hits as listed in AC8).
  - **Task 6 / AC10, AC11** — `PeerMeshPingView.source` and `PeerMeshTranscript.recentChangeBeforeFiling` (REQUIRED, nullable), mapped
    from the rows already read (⛔ new read — `VERIFIER_CONSOLE_MAX_READS` stays 29); `PeerMeshView` shows the source line beside the
    `relationship` answer or in the ping header, and the staff line once at the top; the six fixture files amended; tests on BOTH surfaces
    + the API spec that drives both; absence tests on the inspector's client wire (keys injected — stripped), the inspection tables and
    `PeerRequestDetailResponse` / `PeerRequestListResponse` (a zod shape walk).
  - **Task 7 / AC13–AC15** — AC13: 6.27a's annotations (PM1 at its `-311` / `ranked_member_ids` / SW23 lines) and 6.27c's (AC5,
    the SF11 Dev Note, the v4 line) re-read — consistent with the build; ONE dated annotation added to 6.27c naming what was built
    (the predicate's name and signature, the winning-group ranking, the immutable-by-grant selection, the ping-source trigger — a
    replacement is a NEW ping row passing `selection.source`). 6.6's D3 and its zero-candidate review item annotated (superseded by
    `-330`); 6.36a SW17's *"perhaps by the family"* annotated (`-333` call 1). AC14: the four deferred items appended by heading
    (two Closed, one NARROWED, one left OPEN) + ONE new item (the OCR job's swallowed race, reachability unproven). AC15: see the gate
    line below.
  - **Task 8 / AC16** — `PEER_MESH_QUESTIONNAIRE_V4` (live; v3 historical): the `relationship` option `school_colleague` takes
    `…relationship.school_or_office_colleague` (en *"A colleague at the same school or office"*; hi agent-authored, ⛔ reviewed — Row 28;
    a `$comment` names `-331`), `-331` in the question's and the version's `approvedBy`, `'2026-10-14-331'` in
    `PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS`, the registry; the v3-live pins moved (the Pariwar fixture rebuilt from V4 as
    `peer_mesh.v5`); a v3 reply keeps v3's words on the member's view AND the console (tests).
- **Readings the code had to make (recorded, ⛔ silent):**
  - `deceased_previous_workplace_id` is stored whenever a previous workplace EXISTS as of the cut (row 6-32's head-of-school letter may
    need it); `previous_workplace_counted` says whether its people were asked. AC1 names the column, ⛔ when it is NULL.
  - A named person who is ALSO a colleague is kept ONCE, in the workplace group (the snapshot composer dedupes) — the named group is read
    only when the workplace group is empty, so the replay is unchanged; the engine's duplicate throw stays reserved for a real join defect
    (⛔ a stall re-created by a member who is both).
  - The job asserts the default metric is `grouped` (it reads the grouped snapshot) — a ranked default would throw, ⛔ select nobody.
  - A claim ⛔ `documents_pending` returns `{ created: false, selectedCount: 0 }` (⛔ selection, ⛔ window, ⛔ shepherd).
- **Tests and how they hold the same-tx trap.** The domain snapshot spec (19 legs) places EVERY recorded time explicitly relative to the
  cut (postings' and the claim's `created_at`, the links' `asked_at` / `responded_at` / `ended_at`), so ⛔ comparison reads a
  transaction-start clock; the one writer that stamps its own clock (`removeKnownPerson`, `clock_timestamp()`) is followed by a claim
  filed at that instant, read back. AC5 asks for "rows written in SEPARATE transactions" — this meets its purpose (the ordering under test
  is the ordering written) ⛔ its letter; the jobs test (own-committing, one transaction per step) drives the job end to end.
- **⛔ Not tested, recorded:** the rethrow of a `ClaimStreamConcurrencyError` in the select job — with the claim lock held ⛔ known
  appender can race, so the error cannot be provoked without a fault injector (AC8 calls it defensive).
- 2026-10-16 — **RF1 RULED (`2026-10-16-339`, option C; governance `6c9ebed3`, committed alone first)** and built: `resolvePeerMeshFilingCut`
  (`packages/domain/src/claim/peer-mesh-read.ts`) reads the earliest `claims.created_at` naming the deceased, ⛔ a claim with a
  `member_found_innocent` finding (the `nominee-lock.ts` filter), defaulting to the claim's own when every one is lifted; the select job
  calls it after the lock. Tests: five domain anchor legs (one claim; an earlier refused / closed claim anchors; an innocence finding lifts
  that claim — the next counts, then the claim's own; `nominee_disqualified` ⛔ lifts, another member's / Pariwar's claims ⛔ count; the
  snapshot moves with the anchor) and the jobs RF1 pin flipped + an innocence leg (25 / 25). The routing note's ⏳ block replaced by the
  ruling; 6.36a SW19 annotated. Code commit `e4316ffb`. **Gate on `e4316ffb` (fresh :5433):** the FIRST `pnpm ci:local` failed ONE job —
  `test (unit)`, ONE admin leg (`ground-inspection-discrepancy.test.tsx`, Story 6.27d's completion-seeds leg): *"Test timed out in
  5000ms"* under the job's `--concurrency=4` load (the file ran 41.7 s there); ⛔ admin code changed by `e4316ffb`; the file alone, three
  times: 37 / 37 each (~7.7 s). `apps/admin` has ⛔ global `testTimeout` (api / jobs have 20 s). The SECOND run: **PASSED — 36 / 36**
  (integration: domain 5390 passed, api 1782, jobs 805).
- **Gate (AC15) on `3fa2ff0c`:** `DATABASE_URL=…:5433/twt_dev pnpm ci:local` — every static job green (lint, typecheck, build,
  test (unit), db-check and every gate); `integration-tests` RED on ONE file only — `packages/domain/tests/integration/reconciliation/
  review-queue-read.spec.ts` (Story 9.8, 7 legs), the recorded shared-DB class: 575 `live` alerts under the fixed `PARIWAR_A` on :5433, past
  `listOpenReconciliationCases`' 500-cycle scan (memory *ci:local double-run pollution*, 2026-10-13 note) — ⛔ a file this story touches.
  Because domain failed first, turbo ran ⛔ api / jobs live-DB suites in that phase, so the integration job was re-run ALONE on a fresh
  scratch database (`CREATE DATABASE twt_ci_636` on :5433, `db:migrate` from zero, the job's exact filter with `--continue`): domain 375 / 375
  files (5385 passed, 1 skipped — the reconciliation spec green), api 167 / 167 (1782 passed), jobs 56 / 57 — the one red is Story 10.23's
  `restoration-discipline-production-path-live` REFUSING a database not named `twt_dev` (by design), then run directly with
  `TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS=1` on the same scratch DB: 3 / 3; events, queue, niyamavali-engine, validity-service, channels all green.
  Scratch DB dropped. ⇒ green, with the shared-:5433 pollution left as it is (recreating the container is BigDev's call, ⛔ a side effect).
  ⭐ **2026-10-16, BigDev: *"recreate the container and get it done"*** — `twt-test-pg` (:5433) removed with its volume and recreated
  (`postgres:16`, the same user / db / port), migrated from zero (163 journal entries = 163 applied, the last `…007` = 0163); then
  `DATABASE_URL=…:5433/twt_dev pnpm ci:local` on `3fa2ff0c`: **PASSED — 36 / 36 jobs green** (integration: domain 375 / 375 files —
  5385 passed, 1 skipped; api 167 / 167 — 1782 passed, 1 skipped; jobs 57 / 57 — 804 passed, the 10.23 gate included on `twt_dev`).

### File List
- `apps/admin/src/modules/claim-verification/PeerMeshView.tsx` — modified
- `apps/admin/src/modules/claim-verification/i18n-en.ts` — modified
- `apps/admin/tests/neighbours-answers-panel.test.tsx` — modified
- `apps/admin/tests/peer-mesh-inspection-discrepancy.test.tsx` — modified
- `apps/admin/tests/peer-mesh-source-not-on-inspector-wire.test.ts` — NEW
- `apps/admin/tests/verifier-console.test.tsx` — modified
- `apps/api/src/modules/claims/peer-answers-assembler.ts` — modified
- `apps/api/tests/integration/_peer-reply-fixture.ts` — modified
- `apps/api/tests/integration/claims/peer-answers-approvers.spec.ts` — modified
- `apps/api/tests/integration/claims/peer-request-member.spec.ts` — modified
- `apps/api/tests/unit/peer-answers-stitch.test.ts` — modified
- `apps/jobs/src/claim-peer-mesh.ts` — modified
- `apps/jobs/src/scheduler/claim-certificate-reminders.ts` — modified
- `apps/jobs/tests/claim-peer-mesh.test.ts` — modified
- `packages/contracts/src/claims/verifier-console.ts` — modified
- `packages/contracts/tests/claims-peer-answers.test.ts` — modified
- `packages/contracts/tests/claims-peer-request-no-source.test.ts` — NEW
- `packages/contracts/tests/claims-verifier-console.test.ts` — modified
- `packages/domain/migrations/0163_peer-mesh-workplace-selection.sql` — NEW
- `packages/domain/migrations/meta/_journal.json` — modified
- `packages/domain/src/claim/certificate-reminder.ts` — modified
- `packages/domain/src/claim/events.ts` — modified
- `packages/domain/src/claim/peer-mesh-metric-registry.ts` — modified
- `packages/domain/src/claim/peer-mesh-persist.ts` — modified
- `packages/domain/src/claim/peer-mesh-read.ts` — modified
- `packages/domain/src/claim/peer-mesh.ts` — modified
- `packages/domain/src/claim/state.ts` — modified
- `packages/domain/src/member/known-people.ts` — modified
- `packages/domain/src/questionnaires/keys.ts` — modified
- `packages/domain/src/questionnaires/peer-mesh.ts` — modified
- `packages/domain/src/questionnaires/registry.ts` — modified
- `packages/domain/src/schema/claim_peer_mesh_pings.ts` — modified
- `packages/domain/src/schema/claim_peer_mesh_selections.ts` — modified
- `packages/domain/src/schema/member_postings.ts` — modified
- `packages/domain/tests/claim/dpdpa-consent-events.test.ts` — modified
- `packages/domain/tests/claim/nominee-name-check-events.test.ts` — modified
- `packages/domain/tests/claim/peer-mesh-cut.test.ts` — NEW
- `packages/domain/tests/claim/peer-mesh-grouped.test.ts` — NEW
- `packages/domain/tests/claim/peer-mesh-source-audience.test.ts` — NEW
- `packages/domain/tests/claim/peer-mesh.test.ts` — modified
- `packages/domain/tests/integration/claim/certificate-reminder.spec.ts` — modified
- `packages/domain/tests/integration/claim/peer-mesh-reply.spec.ts` — modified
- `packages/domain/tests/integration/claim/peer-mesh-workplace-snapshot.spec.ts` — NEW
- `packages/domain/tests/integration/rls/claim-peer-mesh-workplace-selection-policy-regression.spec.ts` — NEW
- `packages/domain/tests/questionnaires/questionnaires.test.ts` — modified
- `packages/events/src/registry.ts` — modified
- `packages/i18n/locales/en/claim.json` — modified
- `packages/i18n/locales/hi/claim.json` — modified
- `_bmad-output/implementation-artifacts/6-36-peer-mesh-school-wise-selection.md` — modified
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified
- `_bmad-output/implementation-artifacts/deferred-work.md` — modified
- `_bmad-output/implementation-artifacts/6-6-peer-mesh-deterministic-5-nearest-selection-ping.md` — modified
- `_bmad-output/implementation-artifacts/6-36a-member-workplace-and-posting-history.md` — modified
- `_bmad-output/implementation-artifacts/6-27c-peer-mesh-sending-texts-and-links.md` — modified
- Review round 2 (`2026-10-16-340`) — modified: `packages/domain/migrations/0163_peer-mesh-workplace-selection.sql` (amended in
  place), `packages/domain/src/schema/claim_peer_mesh_selections.ts`, `packages/domain/src/claim/peer-mesh.ts`,
  `peer-mesh-read.ts`, `peer-mesh-persist.ts`, `peer-mesh-metric-registry.ts`, `apps/jobs/src/claim-peer-mesh.ts`,
  `apps/jobs/src/boot.ts`, `apps/jobs/src/restoration-discipline.ts`, `packages/queue/src/index.ts` (comments), the tests
  `peer-mesh-grouped.test.ts`, `peer-mesh-workplace-snapshot.spec.ts`, the 0163 policy spec, `apps/jobs/tests/claim-peer-mesh.test.ts`,
  `apps/api/tests/integration/_peer-reply-fixture.ts`; records `.decision-log.md` (`-340`), `_bmad-output/planning-artifacts/epics.md`.

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-16 | 3.5 | Round 2 CLOSED: fix-review Edge #1 → `2026-10-16-341` (attempt filers excluded); convergence round (3 LOW) applied; `twt-test-pg` recreated fresh; `pnpm ci:local` on the final tree PASSED 36 / 36; P1–P9 checked off; status `in-progress` → `done`. ⚠ :5432's 0163 delta ⛔ applied (blocked) — recorded. |
| 2026-10-16 | 3.4 | Code review ROUND 2 (whole branch, three layers): 2 decision-needed → BigDev D1 *"Salt by the anchor claim"*, D2 *"Exclude every claimant"* (`2026-10-16-340`, committed alone `4c74c5b6`), 7 patch, 1 defer, 12 dismissed; BigDev "1": P1–P9 applied; the fix diff reviewed by three layers (F1–F14 applied, W2–W3 deferred, one decision open). Status `done` → `in-progress` until the live-DB delta, the DB-backed tests and the gate (P7). |
| 2026-10-16 | 3.3 | Three-layer code review of `51382898..0d4c23af`: 1 MEDIUM / P2 patch (R1), 0 decision-needed / defer, 3 dismissed candidates; 369 review tests passed. BigDev option 1: corrected the staff warning's chronology for RF1, aligned the contract comment and both existing staff-surface assertions; 105 post-fix tests passed. R1 checked off; story and sprint row `review` → `done`. Full CI not rerun for the copy/comment/assertion patch. |
| 2026-10-16 | 3.2 | RF1 RULED — `2026-10-16-339` (Trustee-ratified, option C): the anchor is the death's FIRST filing unless an innocence finding lifts a claim (`resolvePeerMeshFilingCut`); the RF1 pin flipped, an innocence leg and five domain anchor legs added; AC4, the header, the rulings list and §Recorded annotated (⛔ rewritten). |
| 2026-10-16 | 3.1 | AC15 closed GREEN: `twt-test-pg` recreated fresh (BigDev), migrated from zero, `pnpm ci:local` on `3fa2ff0c` — 36 / 36 jobs. |
| 2026-10-16 | 3.0 | IMPLEMENTED by `bmad-dev-story 6.36` (code commit `3fa2ff0c`): migration 0163 (applied on :5432 AND :5433); the grouped engine, the ONE dispatch and replay; the filing-day cut, the SW21 run, the SW23 predicate and the snapshot reads; the select job locked FIRST, a selection only with its edge, ⛔ swallow, `claim.peer_mesh_none_to_ask` (the 37th event) and the reminder reading either edge; the source and the staff line on both staff surfaces (⛔ on the inspector's / helpline's / a member's wire — tests); `peer_mesh.v4` live. Records: 6.27c annotated (AC13), 6.6 D3 + its review item and 6.36a SW17 annotated, deferred-work appended (two Closed, one NARROWED, one OPEN, one NEW). |
| 2026-10-15 | 2.5 | Round-6 narrow re-validate (the note + its story lines): ⛔ finding at HIGH or above — the rounds have converged. 2 MEDIUM, 5 LOW applied: option C's effect holds only when an investigation found the member innocent (a refusal without one still anchors as in A); two negative staff-line legs (an ask, a lapse); the note names C beside A where it should, "the same filter" ⛔ "exact shape", the table exists but nothing writes it, SW19 cited as 6.36a's record; a glyph fix in §Recorded. |
| 2026-10-15 | 2.4 | Round-5 narrow re-validate of v2.3: 1 HIGH (the routing note), 3 MEDIUM, 2 LOW, all applied. HIGH: option C was written as a new staff step and a new reason — false: `-238` (Trustee-ratified) already rules the innocence finding and `claim_nominee_findings.kind = 'member_found_innocent'` exists, read with C's exact shape by `nominee-lock.ts` (producer row 6-22, unbuilt) ⇒ C keyed on it (behaves as A until 6-22), our reading C; §Recorded names it as the key that would lift the falsely-reported-member exclusion. MEDIUM: two staff-line legs seed acceptance MORE than 90 days back (exactly 90 is inside the window); a positive acceptance leg; the staff-line rule restated as SW20's two plus changes out of the accepted set. LOW: the note's suspicion-refusal sentence; "Our reading" is one option. |
| 2026-10-15 | 2.3 | Round-4 fresh-context re-validate of v2.2: 1 HIGH (the routing note only), 4 MEDIUM, 3 LOW, all applied. HIGH: the note's "Our reading" recommended a variant that was in ⛔ option row ("the first filing since the last refusal") — undefined ("refusal" is ⛔ a single recorded state) and, read as `denied`, it reopened option B for the commonest re-file ⇒ the narrow version is now option C ("…unless refused because the member was found alive" — a new staff step); our reading: A, or C. MEDIUM: the two-select-jobs race is LATENT (one `jobs` service, `boss.work` with ⛔ options) — the lock is kept as defence; the race test's zero-branch leg cannot be RED before Task 5; the staff line's rule restated (acts by the account, or changes to the accepted set); two staff-line legs seed their acceptance ≥ 90 days back. LOW: the `skipped` zero selection in `documents_pending` is REACHABLE (SF4) — ⛔ unproven; the OCR item names the tracked upload's FOR UPDATE; a living member once falsely reported stays outside every later five (recorded). |
| 2026-10-15 | 2.2 | Round-3 fresh-context re-validate of v2.1: 2 HIGH, 3 MEDIUM, 6 LOW, all applied. ⚠ v2.0's HIGH premise for AC8 was FALSE and is withdrawn (rows 2.0 / 2.1 kept as written): a bank save, DPDPA consent or a closure can ⛔ win the select job's append — the selection insert's FK to `claims` takes FOR KEY SHARE on the claim row before the head read, serializing it against their FOR UPDATE. The REACHABLE defect is two select jobs at once (one per upload; `singletonKey` inert): the loser appends a duplicate edge from its stale, unlocked read. AC8's lock stays (now taken FIRST, before the probe); the race test is rebuilt on two select transactions; the probe heal is DROPPED (it served only an unproven pre-commit state, and could still ping after a lost window job); the OCR item is recorded as reachability-unproven. HIGH: RF1 option A's cost was missing — a member once wrongly reported dead, claim refused, would anchor a later real death at that false filing (the note, AC4, §Recorded). MEDIUM: the staff line counts an `erased` link only when it had been accepted (an unanswered ask was never a named person) + its test legs. LOW: the NULL-`started_on` reasoning; the district-only refusal cited at the route; a death-certificate replacement in the review window enqueues ⛔ select job; Task 4 tags AC9; `claim-peer-mesh.ts:217`, `:299-306`. |
| 2026-10-15 | 2.1 | Fresh-context re-validate of v2.0 (two verifiers — cites / consistency, adversarial design): 2 HIGH, 9 MEDIUM, ~10 LOW, all applied. HIGH: AC8's heal would have pinged people after their window was gone (a select job run while the claim was still `intake_converged` persisted a `pending` selection and its window job) ⇒ a selection is now persisted ONLY together with its edge, and the heal is scoped to selections persisted before this commit (a resolved non-zero one ⇒ alarm, ⛔ edge); the RF1 note over-stated the freeze on named people (only the dead member's account is refused — a named person can still withdraw), and the story said it in three places. MEDIUM: the staff line counts every REMOVED link (SW20 word for word — v2.0 had narrowed it to accepted-then-removed) and now also withdrawn / erased links (our reading of `-331` SC1 A's *"the people they named changed"* — MATCHES the ratified sentence; flagged to BigDev); the ping trigger's NOT FOUND ⇒ `RETURN NEW`; the prefix trigger also on UPDATE; `deceased_district` is nullable; a glyph inversion in Task 1; AC14's legacy carve-out vs the heal; the race test rebuilt around a held transaction; `pg-boss`'s standard policy makes `singletonKey` inert (one select job per upload). LOW: off-by-one cites (`known-people.ts:91`, `claim-peer-mesh.ts:266`, `peer-mesh-persist.ts:328-329` / `:360-361`, `questionnaires.test.ts:107-108` / `:109-114`, `claim-peer-mesh.test.ts:340-344`, `claim-shepherd-assign.ts:92-99`); the RLS cites name the tables read; RF1's answer is a small change, ⛔ one line; the retries-exhausted residual; the settled-after-first-import consequence; AC↔Task tags. |
| 2026-10-15 | 2.0 | Validate against `main` `51382898` (6.36a AND 6.36b shipped; four parallel verifiers — code cites, shipped substrate, governance, premise / reachability): 0 BLOCKER, 5 HIGH, 11 MEDIUM, 7 LOW, all applied (BigDev: *"All"*). HIGH: AC8 — the job's swallowed `ClaimStreamConcurrencyError` loses the edge when ANOTHER event (a bank save) wins the append ⇒ the claim read under `lockClaimCase`, the error rethrown, the probe heals a missing edge (6.6's pinged branch too); AC5 — a `declined` link also writes `responded_at` ⇒ the named-people predicate is a STATE test; AC2 — `settled` reads the run's earliest `created_at`, ⛔ `started_on` (SW22, `-331` SC1 A); AC16 — v4 needs `-331` in `PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS` or the registry fails at module load, plus the moved v3 pins and the colliding `peer_mesh.v4` fixture; SW30 — two items closed, one NARROWED, one left open (the header, the rulings list, Task 3 and AC14 had called them closed). MEDIUM: SW23 is `active` only (`-333` call 2 (d)) with grace tests; the posting row kinds incl. district-only, and "unconfirmed" as the latest row; the `member_postings` workplace index; the shipped IST helpers; a removal after filing is refused (`-333` call 1); the staff line's "removed"; the registry / snapshot union's callers; the NOT NULL legacy columns; both triggers scoped (the FK's 23503 kept); the transcript fixture twin and its assembler mapping; the rulings listed by instrument kind, 6.6's item named. LOW: ten fixture inserts (⛔ seven); the zero branch's skip constant and shepherd flag; the reducer's `closed` invariant; the duplicate-id throw and branded hash input; erasure / `twt_app` / NULL-claimant legs; cite precision (`peer-mesh.ts:61-84`, `peer-request.ts:93-99`, `certificate-reminder.ts:131-152`); the Policy-meaning note's certificate-reminder consequence. DECIDED by BigDev: RF1 (a re-filed claim's cut) ROUTED to the Panel — note written, ⛔ sent, non-blocking, built as written behind one function; the head's-letter gap recorded here and a launch-gate row PROPOSED. Row `backlog` → `ready-for-dev`. |
| 2026-10-15 | — | `2026-10-15-338` (`08932f43`): wave 2 built one after the other — this row FIRST, 6.36c only after it is `done`; re-validated against `main` (`51382898`) before `ready-for-dev`. ⛔ No AC changed. |
| 2026-10-14 | — | `2026-10-14-332` (`33902d82`): wave 2 — starts when 6.36a AND 6.36b are done (⛔ not 6.36c), in parallel with 6.36c; migration `0163` / `…007`; merges third. |
| 2026-10-14 | — | ⭐ The Panel RULED SC1 A and SC4 A (`2026-10-14-331`, `0019b301`): SC1 A ratifies the filing-day cut (AC5), the settled-first ranking (AC2) and the staff line (AC10); SC4 A adds AC16 / Task 8 — this story mints `peer_mesh.v4` with *"A colleague at the same school or office"* (our reading of who builds it). |
| 2026-10-14 | — | `2026-10-14-330` committed (`d44708e8`) — BigDev: *"all A, SC4 yes"*; every AC and Task here was written to the recommended answers ⇒ ⛔ none changed. |
| 2026-10-14 | 1.5 | Validate round 5: AC5 quotes SW21's run word for word, defines "unconfirmed" as of the cut, and its first test now has a previous workplace to miss. |
| 2026-10-14 | 1.4 | Validate round 4: the Story's promise names I8's two exceptions; `settled` measured from the run's recorded start and false for named people; AC5's run definition and its three tests. |
| 2026-10-14 | 1.3 | Validate round 3: the grouped snapshot row carries `settled` (replay); the Story's promise is "after the claim is filed"; AC5 reads a withdrawal per LINK, counts REMOVALS in the staff line, and measures the 90 days from the start of the CURRENT run; the negative schema-key tests cover `recentChangeBeforeFiling`. |
| 2026-10-14 | 1.2 | Validate round 2: the anchor is the FILING date — in v1 the certificate's OCR'd date is always empty (6.36a SF17) — so ⛔ no decrypt, ⛔ no KMS dependency, ⛔ no fence (AC4); the cut is the start of the filing day with SETTLED colleagues ranked first and ONE staff line `recentChangeBeforeFiling` (AC1, AC2, AC5, AC10); the previous workplace skips *"isn't listed"* and retirement rows; a withdrawal excludes whenever it happened; the CHECKs scoped to `workplace_named_v1` so seven shipped fixtures stay valid; the REVOKE / GRANT in Task 1; the uncapped-snapshot item NARROWED. |
| 2026-10-14 | 1.1 | Checklist validation: v1's literal id before the default moves (AC3) and the domain test legs that read the default; the anchor's pre-read, lower bound, `normalizeDate`, fail-closed decrypt, the jobs encryption dependency and a NEW decrypt fence (AC4); the cut at filing − 90 days when the certificate cannot be read (AC5, SW20); the selection's UPDATE grant narrowed (AC1); the 500 truncation (AC2); all three event pins (AC8); the source BESIDE the `relationship` answer (AC10); the uncapped-snapshot closure scoped to the new metric (AC14). |
| 2026-10-14 | 1.0 | Cut by `bmad-create-story 6.36` (SW1): SW18–SW27 and SW30's three closures — written to the RECOMMENDED answers. |
