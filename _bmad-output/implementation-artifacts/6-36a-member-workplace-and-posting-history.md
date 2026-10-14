---
baseline_commit: 2581c514
---

<!--
⭐ AUTHORED 2026-10-14 by `bmad-create-story 6.36` on branch `story/6-36-peer-mesh-school-wise-selection` (cut from `origin/main`
`2581c514`, in a separate worktree — a peer session shares the main checkout). Every `file:NNN` below is AS OF `2581c514`, read by five
read-only research passes (governance; the selection engine + data substrate; the member app; the staff surfaces; external sources) and
by the author, then re-checked by three fresh-context verifiers (code claims; governance + consistency; adversarial design) — v1.1.
⚠ Before Task 1: `git diff --name-only 2581c514..HEAD -- packages apps scripts infra` — re-read any cited file that moved.

⭐ THE SPLIT (`2026-10-10-307` Consequence 1: *"⚠ It is large — a split is its own story's call"*): row `6-36-peer-mesh-school-wise-selection`
is cut into FOUR parts, built in this order — **6.36a → 6.36b → 6.36c → 6.36**:
  · **6.36a** (THIS FILE, row `6-36a-member-workplace-and-posting-history`) — where each member works: the school list, the workplace and
    the date it began at signup and at every transfer, the history, *"my workplace isn't listed"*.
  · **6.36b** (row `6-36b-people-who-know-me`) — the up-to-three people a member names, found from the phone's contacts, who accept.
  · **6.36c** (row `6-36c-workplace-list-curation-and-prompts`) — the Super Admin's list, the Pariwar Admin's suggestion that the member
    confirms, the home cards (SW16 (2)–(4)) and the campaign (SW16 (5)).
  · **6.36** (KEEPS the row key `6-36-peer-mesh-school-wise-selection` — every ruling cites it) — the selection itself, the source line, and
    the claim that has nobody to ask.
  6.27c (sending) waits for row 6-36, which is last ⇒ 6.27c's predecessor text stays literally true.

⭐ THIS FILE IS THE RECORD for all four parts: the found facts (SF1–SF17), the build decisions (SW1–SW30, PROPOSED — answered at Task 0.1,
committed ONCE at Task 0.2), the Panel confirms (SC1–SC4 + one FYI), the invariants (I1–I12) and the shared Task 0. The other three files
BUILD the SW items tagged for them and point here. Where a summary in a part file and this file disagree, this file is the record.

STATUS: `ready-for-dev` — ⭐ Task 0 DONE (2026-10-14): BigDev answered *"all A, SC4 yes"*; `2026-10-14-330` committed ALONE (`d44708e8`);
the confirm note (SC1, SC4 + FYI — ⛔ not yet sent) and the annotations committed (`35fe513f`). AC0 is met — Task 1 may start.

GLYPH REGISTER, ADDRESSING RULE: as 6.27a — `⛔` sits ONLY on a negation word · `⭐` = key fact / action · `⚠` = hazard · doubling is volume
only. ⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite entry id + clause,
item heading, row key). `file:NNN` is used ONLY for code and for append-structured planning files.
LETTERS: `SW` = this set's build decisions (the author's); `SF` = FOUND facts; `SC` = questions for ONE short Panel confirm note; `I` =
invariants. Foreign letters cited: `PM` (6.27a, `-311`), `CF` (`-310`), `BD` (6.27b, `-326`), `S1` / `S12` (`-325`), `R1`–`R6` (6.27d),
`TV` (6.34), `AL` (6.30), `F` (6.27a's found facts). `SW`, `SF`, `SC` are used by ⛔ no earlier story (grepped 2026-10-14).
-->

# Story 6.36a: Where Each Member Works — a School or an Office Picked From a List at Signup and at Every Transfer, With the Date It Began, the History Kept `[SURFACE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THE SET IS.** When a death claim is filed, the Trust asks up to five members who knew the person (`-303` Q1 A). Today
> they are chosen from the whole DISTRICT (`district_cohort_v1`) — mostly strangers. BigDev (2026-10-10): *"Selection must be school wise,
> or in some cases where person has died in few days after transfer to new school. No one would know a person working in different school
> let alone block."* The Panel then ruled who is asked (`-310` CF4 A): the members at the member's workplace (school or office; the previous
> one after a transfer less than 90 days before the death); otherwise up to three members the member named who agreed; otherwise nobody —
> the ground inspection carries the claim, and the inspector collects a letter from the head of the school or office. ⛔ Never the
> district; the family ⛔ never chooses.
> ⭐ **THIS PART** builds the ground the rule stands on: ⛔ no member's workplace is recorded anywhere today (SF7). After it, every member
> picks their school (from an imported list) or office at signup and at every transfer, with the date it began, and the history is kept.
> ⛔ Nobody is chosen differently yet — that is 6.36.

## Story

As **a member** —
I want **to say where I work by picking my school or office from a list, when I join and whenever I am transferred, with the date I
started there**,
so that **if I die, the Trust asks the colleagues who actually worked with me — ⛔ never strangers from my district, and ⛔ never people
my family picks.**

## Policy meaning (AI-10-1)

- **For the whole set (the record):** ONE predicate in the set gates a member's family's access to a benefit — 6.36's SW25 changes when a
  claim may leave `documents_pending` going FORWARD. In the member's terms: ⭐ *"a family's claim is ⛔ no longer stuck because nobody
  worked with the member and nobody was named — it goes on to the ground inspection, which then carries it."* Today such a claim can ⛔
  never be inspected or approved (SF4). Checked against the Niyamavali: §6.2 (*"The Trust verifies the qualifying event…"*) names ⛔ no
  neighbours, school or workplace and ⛔ no clause governs who is asked ⇒ ⛔ no conflict; the change REMOVES a block the rulebook never
  contained.
- **For this part (6.36a):** ⛔ no predicate gates a member's access to a benefit. The signup step is REQUIRED, but every member can
  answer it (a school · an office · *"my workplace isn't listed"* · *"I have retired"*), and in a Pariwar that has ⛔ no imported list yet it
  falls back to today's district box (SW7) ⇒ it blocks ⛔ nobody's signup. Only 6.36c's prompts and 6.36's selection read the workplace.
- The selection's other predicates (6.36 SW20–SW23) decide who is ASKED about a death, ⛔ never what a family is owed: the peer mesh is a
  signal, ⛔ never a gate (`-263` FQ10).

## The rulings this set builds (quoted — ⛔ never paraphrased)

- **`-310` CF4 A** (Trustee-ratified, 2026-10-10; the confirms note `trustee-panel-routing-note-2026-10-10-6-27-confirms.md` §CF4, as
  put): *"(1) the members posted at the same school or office as the member who died (and, after a transfer less than 90 days before the
  death, at the previous one); (2) if there are none, up to three members the member themselves named as "people who know me" — each of
  whom agreed when named; (3) if still none, nobody — the ground inspection carries the claim, and the inspector collects a letter from
  the head of the school or office."* Option A's cost line, as put: *"New information is collected: each member's school or office and the
  date they joined it (picked from the government's school list), and the up-to-three people they name (each of whom must agree). The
  privacy notice must name these."* The ruling block: *"⛔ Never the district; the family ⛔ never chooses."* ⚠ Option C — *"The workplace
  first, then fill up to five from the same block or district"* — was REJECTED ⇒ ⛔ no fill-up from another group.
- **`-310` CF5 A** (Trustee-ratified): *"With the member's permission, the app checks their phone contacts against the member list, shows
  the matches under the names the member saved, and keeps ⛔ no non-member's number; counsel confirms the basis."* As put: *"…with a
  search box; ⛔ no non-member's number is kept or logged; limits stop anyone using it to test numbers in bulk."*
- **`-310` CF2** (Trustee-ratified) — the inspector: *"⛔ Nothing before completing their own record; then only THAT the family and a
  neighbour differ, question by question — ⛔ never the neighbour's answer itself, ⛔ never who"* ⇒ the source line ⛔ never reaches the
  inspector (6.36 SW24).
- **`-303` Q1 A** (Trustee-ratified) — each of the five is texted (the texts are 6.27c's; this set changes WHO).
- **`-132` R2** (Trustee-ratified): *"directory attributes are **display-only by default**, not authority-bearing by Pariwar-Admin
  action, enforced **by signature**"*. **`-133` cl.1** (Trustee-ratified): *"Since school is not hierarchical, it is not eligible"* (for
  RBAC). **`-133` cl.2** (Trustee-ratified): *"Only Super Admin / Trustee Panel may create or materially redefine directory attributes.
  Pariwar Admins may configure permitted usage of already-governed attributes, but cannot create a new attribute or elevate an attribute
  into an RBAC-capable class."* ⇒ read against this set in SW2 and SW9.
- **Author-commits this set applies** (BigDev, ⛔ not Trustee-ratified): `-306` (the school; the 90 days; ⛔ no backfill — *"The code is
  not in production"*), `-307` (workplace = school or office from a list; A → B → D; the prompts), `-308` (each answer shows its source),
  `-309` (contact matching; ⛔ no non-member's number kept), `-311` PM1 (i)–(iii) (the filter at selection; the ranked groups; the
  send-time replacement is 6.27c's), `-325` S1 A and `-326` BD1 A (the source line is this set's, on BOTH staff surfaces).

## FOUND at authoring (SF1–SF17) — facts, recorded in Task 0.2's author-commit (⛔ not decisions)

- **SF1 — the school list is ⛔ not where `-307` §1 said.** `-307` §1 recorded as FOUND: *"UDISE+ … publishes a school directory
  filterable by state / district / block with a CSV download; the same data is on data.gov.in under the Government Open Data License –
  India … Bihar has about 80,000 schools, codes beginning `10`"*, marking only *"the exact columns and a sample download"* UNVERIFIED.
  Re-checked 2026-10-14, the FOUND part did ⛔ not hold: data.gov.in's catalogue holds UDISE **district / state AGGREGATES only**
  (searches: "udise", "school directory", "basic details", "school master", "UDISE code" — a fuzzy search, so "not found", ⛔ not "proven
  absent"); UDISE+ "Know Your School" (`kys.udiseplus.gov.in`) has ⛔ no bulk download (its school search needs a captcha) and its
  Copyright Policy reads *"Material featured on this site may not be reproduced in any format or media without due permission from
  Ministry of Education"*. The only bulk school-level copy found is the **India Data Portal's "UDISE – Basic Details of Schools"** (ISB
  Bharti Institute; CKAN resource `457fddf1-982f-4c85-855d-5095578accc1`; **licence ODC-BY 1.0**, ⛔ not GODL-India; retrieved by the
  portal 2022-01-12 from the UDISE+ locate-school page; CSV, 1,372,195 rows all-India) ⇒ its upstream rights chain is UNCLEAR (SW3, Row 31
  (c)). **Bihar: 84,352 rows** (all 11-digit unique codes; 38 districts; Department of Education 71,454 · private unaided 5,625 ·
  unrecognised 4,834 · madarsa 1,629 · aided 670 · other 140) against the official UDISE+ count for 2025-26 of **95,195** ⇒ ~11k schools
  short (`-307`'s *"about 80,000"* corrected). Columns (verified): `id, state_name, state_code, district_name, district_code,
  subdistrict_name, subdistrict_code, cluster_name, village_name, village_code, pincode, ward, school_name, udise_school_code,
  school_category, school_type, management, year_of_establishment, longitude, latitude, status, location_type, class_from, class_to, …`
  (enrolment columns follow). `district_code` is the portal's LGD join (e.g. Araria 188) and is EMPTY for Aurangabad.
- **SF2 — the file has ⛔ no BLOCK NAME.** UDISE codes are state(2) district(2) block(2) village(3) school(2); the file's `subdistrict_*`
  is an LGD join, EMPTY for 13,649 Bihar rows (16%), and LGD sub-districts (441) do ⛔ not match UDISE blocks (537). The block CODE is
  `udise_school_code[0:6]`; block NAMES live only in UDISE+'s internal masters (SF1's copyright policy). ⇒ SW4.
- **SF3 — on Android it is `expo-contacts`' picker, ⛔ not the platform, that needs the contacts permission.** `expo-contacts` (SDK 55,
  `~55.0.18`) `presentContactPickerAsync`: *"On Android, the READ_CONTACTS permission is required … On iOS, no permissions are required."*
  Android's own `ACTION_PICK` contact picker grants the caller read access to the ONE picked contact without the permission, but
  `expo-contacts` does ⛔ not expose it (a small native module would). ⇒ `-309` item 6's fallback (*"uses the phone's contact picker"*)
  works today on iOS only (SW13). Google Play: apps targeting API 37+ may request `READ_CONTACTS` only *"if the Android Contact Picker is
  not sufficient"* — friend matching qualifies; Play Console declaration forms from September 2026, enforcement 2027-01-27. The
  `expo-contacts` config plugin adds BOTH `READ_CONTACTS` and `WRITE_CONTACTS` on Android. Apple 5.1.2(v): contacting people from Contacts
  only *"at the explicit initiative of that user on an individualized basis; do not include a Select All option"* ⇒ the invite is one share
  at a time.
- **SF4 — a claim with NOBODY to ask can never go forward (REACHABLE — traced).** `apps/jobs/src/claim-peer-mesh.ts:249-268`: zero
  selected ⇒ `skipPeerMesh(…, 'no_eligible_candidates')`, ⛔ no event, *"the claim stays `documents_pending`, operator resolves via
  ground-inspection"* (6.6's review item *"Zero-candidate selection has no defined disposition"*, `6-6-…-ping.md:122`; the code calls it
  *"Decision 1"*). ⚠ That remedy is impossible: `claim.peer_mesh_pinged` is the ONLY forward edge out of `documents_pending`
  (`packages/domain/src/claim/state.ts:131-132`, `:386`; `claim.closed` also leaves it, `:344-346`); `scheduleGroundInspection` is
  guarded by `isClaimInGroundInspectionWindow`, whose states exclude `documents_pending`; ⛔ no shepherd is enqueued (the shepherd job
  follows the ping, `claim-peer-mesh.ts:350-360`); the certificate reminder's day 0 is the EARLIEST `claim.peer_mesh_pinged`
  (`packages/domain/src/claim/certificate-reminder.ts:132-169`). ⇒ CF4 A's *"nobody — the ground inspection carries the claim"* cannot
  happen today, and a school-wise rule makes "nobody" COMMON. The pinged payload requires `selected_member_ids … .min(1).max(5)`
  (`packages/domain/src/claim/events.ts:144`). ⇒ 6.36 SW25.
- **SF5 — ⛔ no plaintext date of death exists when the five are chosen.** Selection is enqueued by the OCR job right after it advances
  the claim (`apps/jobs/src/claim-ocr-parity.ts:489-497`); the RAW OCR string is stored ENCRYPTED (Tier 1) on the claim's `claim_documents`
  row (`date_of_death_ciphertext`, encrypted at `claim-ocr-parity.ts:302`, upserted `:364-398`) — it is normalised only in memory
  (`claim.normalizeDate`, `packages/domain/src/claim/parity.ts:91`, accepting ISO and D/M/Y) — and may be absent (OCR failed / unclear); the
  family enters ⛔ no date at filing; the accepted certificate date comes later (6.21a). The only current decrypt of the column is the
  verifier console (`apps/api/src/modules/claims/claims.verifier-console.handlers.ts:868`); ⛔ no fence covers it. The select job holds ⛔
  no crypto dependency (`ClaimPeerMeshDeps`, `claim-peer-mesh.ts:55-80`; the OCR job's `decryptTier1Field` wiring at
  `claim-ocr-parity.ts:562` is the precedent). ⇒ 6.36 SW19.
- **SF17 — in v1 the certificate's date is ALWAYS empty.** The production OCR provider is `createDeterministicOcrProvider()`
  (`apps/jobs/src/boot.ts:509`), whose doc reads *"In v1 (no live vendor, no manual entry in the queue payload) this is the production
  path"* — a zero-confidence EMPTY parse (`apps/jobs/src/ocr/index.ts:55-73`) ⇒ `date_of_death_ciphertext` is ⛔ never filled in v1.
  And `members.created_at` is ⛔ not a membership start (`claim-ocr-parity.ts:272-277`: *"do not approximate with `createdAt`"*). ⇒ SW19.
- **SF6 — the engine has ⛔ no groups; the registry is keyed by id only; and v1's id IS the default constant.** `selectPeerMesh` is one
  comparator + `slice(0, count)` (`packages/domain/src/claim/peer-mesh.ts:75-77`); `PEER_MESH_METRIC_REGISTRY` is keyed by `metricId` and
  `resolvePeerMeshMetric` ignores `metricVersion` (`peer-mesh-metric-registry.ts:113-136`) ⇒ a bumped version under the SAME id would
  overwrite v1 and break replay of old claims ⇒ the new rule needs a NEW id. ⚠ v1's entry reads `metricId: DEFAULT_PEER_MESH_METRIC_ID`
  (`:102`) ⇒ changing the default constant would RENAME v1. 6.6's D3 (*"richer metrics drop in as new registry entries (+ their substrate)
  without touching the engine"*, `6-6-…-ping.md:160`; the registry's comment: *"WITHOUT touching the pure engine"*, `:14`) cannot hold
  for A → B → D ⇒ superseded by SW18 (an author decision in a story file — BigDev's). The default is also used, without an id, by
  `packages/domain/tests/claim/peer-mesh.test.ts:25` (and asserted at `:73`, `:193-199`).
- **SF7 — ⛔ no member's workplace is recorded, and ⛔ no posting is written at signup.** `member_postings`
  (`packages/domain/src/schema/member_postings.ts:34-66`; 0031): `district text NOT NULL` (free text), `pariwar_ref`, `is_retirement`,
  `created_at` — ⛔ no start date, ⛔ no school; GRANT SELECT, INSERT only (append-only). The ONE writer is `insertMemberPosting`
  (`packages/domain/src/member/posting.ts:35-54`), called ONLY by the Life Events route (`apps/api/src/modules/life-events/handlers.ts:170-216`;
  `memberSession` only — ⛔ no step-up, ⛔ no per-member limit (the global per-IP limit applies, `apps/api/src/plugins/rate-limit/index.ts:121-125`),
  ⛔ no Idempotency-Key; `life-events/routes.ts:89-101`). The signup wizard is `tc → kyc → nominees → medical → payment`
  (`apps/mobile/lib/wizard-steps.ts:15`) and collects ⛔ no district. Epic 4's retirement anchor reads the FIRST `is_retirement` row
  (`getMemberPostingRetiredEver`, `posting.ts:61`; `getMemberRetirementAnchorAt`, `:91`).
- **SF8 — the directory-attribute model meets this set.** Architecture §2.7 (amended by `-132` / `-133`): *"`School` and `Designation`
  are not fixed member columns — they are Pariwar-selected directory attributes (§2.13) … `District` remains platform-common, derived from
  `member_postings`"*; §2.13.2: *"Directory attributes are display-only BY DEFAULT — they may not feed RBAC scope containment, pool
  assignment, `is_valid`/`is_assignable`, or peer-mesh selection by virtue of being defined or populated."* `epics.md` FR-39 C8 (a
  2026-08-19 reconciliation line): *"Expansion to `block` or `school` proximity requires TWO things: the governed substrate to exist, and an
  R4 promotion decision (`2026-08-19-132`). ⛔ A *collected* directory attribute is **display-only by default** — letting one steer claim
  verification would make a Pariwar Admin's data entry influence who verifies a death."* ⚠ The CF4 confirms note cited only `-303`–`-305`:
  the Panel was ⛔ not shown `-132`, `-133`, C8 or §2.13.2 when it ruled CF4 A. ⇒ SW2, SW9, the SC note's FYI.
- **SF9 — matching hazards.** `member_identities.mobile_blind_index` is an HMAC under ONE global namespace (`MEMBER_IDENTITY_NAMESPACE`,
  `packages/domain/src/encryption/member-fields.ts:113-123`) — the same number can be a member in several Pariwars; erasure RETAINS the
  index (`anonymize.ts:140-147`); death is an overlay, ⛔ not a `members.state` value. Each `blindIndex` is ONE KMS `macSign` call
  (`cloud-kms-provider.ts:85-95`) AND fires `kms.auditHook('computeHmac', …)` (`packages/domain/src/encryption/blind-index.ts:33`), which
  writes ONE audit line on the service pool (`apps/api/src/audit/audit-log-sink.ts:195-217`) under the deployment-wide audit-chain advisory
  lock (`packages/domain/src/audit/write.ts:124-128`) — the same pool login uses ⇒ 1,000 numbers = 1,000 serialised audit writes. That
  per-call line is Story 1.5's engineering deferral D10-1.5 (*"Audit-log entry on every encrypt/decrypt operation"*), closed by Story 1.10 —
  ⛔ not a Panel ruling. ⛔ No list matcher exists (`resolveMembersByMobile` is single-number, pre-scope, on the service pool —
  `member-auth.repo.ts:81`). Per-member DB-backed buckets: `sms_rate_buckets` (0049, per member) and `otp_rate_buckets` (0021); the API's
  own limits are in-memory, per minute (`plugins/rate-limit/index.ts:26-30`). The server's `normalizeMobile` (`member-fields.ts:92-100`)
  drops non-ASCII digits and refuses `0091…`, `+91 (0)…` and `+910…`.
- **SF10 — the family often holds the dead member's own account.** Filing in the member app runs on the deceased's phone (Story 6.2
  "Ravi-mode") ⇒ anything changed in that account after the death was changed by the family. ⇒ 6.36 SW20.
- **SF11 — stale "never replaced" text in the 6.27 set.** 6.27a Invariant 4 and Trap 8, and 6.27c AC5 (*"⛔ no replacement; the selection
  unchanged"*), still read as before `-311` PM1 (*"a skipped neighbour IS REPLACED"*). And `recordPeerMeshResponse` refuses a responder
  ⛔ not in `selection.selectedMemberIds` (`packages/domain/src/claim/peer-mesh-persist.ts:235-237`) — a 6.27c replacement ping would be
  refused there. ⇒ annotations (Task 0.4); the fix is 6.27c's.
- **SF12 — the ruled answer option says "school".** `-304` Q6 A ruled *"How do you know [member]?"* with *"A colleague at the same
  school"* (`packages/domain/src/questionnaires/peer-mesh.ts:113`; en `claim.json:187`) — an office colleague has ⛔ no exact option. A
  reworded option is a new questionnaire version, which 6.27a PM23 (a) allows only from row 6-33's chain or a Panel decision id ⇒ SC4.
- **SF13 — the district SPELLING is an authorisation input.** `district` is compared BYTE-FOR-BYTE (`packages/domain/src/member-geo/resolve.ts:24-29`;
  ⛔ no canonical district list exists; a member ⛔ never resolves to a block, `:8-20`), and the claim console authorises
  `{ dimension: 'district', value: ctx.district }` (`apps/api/src/modules/claims/claims.verifier-console.handlers.ts:634`) ⇒ if the list's
  spelling differs from the spelling in a District Admin's grant, that admin can ⛔ no longer reach a new member's claim. ⇒ SW3, SW5.
- **SF14 — `members` has ⛔ no `(pariwar_id, member_id)` UNIQUE.** Only the PK `member_id` and the non-unique `members_pariwar_id_idx`
  (`packages/domain/src/schema/members.ts:85,149`; 0018). Every member FK in the repo is single-column (e.g. `0031:32`) ⇒ a composite
  member FK fails (42830).
- **SF15 — every member-app change trips the friction-budget gate.** `scripts/friction-budget/lib.ts:453` (`MEMBER_FACING_PREFIXES =
  ['apps/mobile/', …]`) fails a change under `apps/mobile/` that leaves `friction-budget.md` unchanged ⇒ each part names its friction.
- **SF16 — the event vocabulary is pinned three ways.** `packages/events/tests/claim-registry-coverage.test.ts` (set equality),
  `packages/domain/tests/claim/dpdpa-consent-events.test.ts:59` (`toHaveLength(36)`) and the frozen-literal diff in
  `packages/domain/tests/claim/nominee-name-check-events.test.ts:79-135` ⇒ a new claim event updates all three (6.36 AC8).

## The decisions (SW1–SW30) — the author's (BigDev's), ✅ COMMITTED as `2026-10-14-330` (`d44708e8`) — BigDev: *"all A, SC4 yes"*

> ⭐ Each is written as the recommended answer, with its alternatives and their honest costs. ⚠ Every AC and Task in the four files is
> written to the RECOMMENDED answer — an answer that differs amends the files it names BEFORE their code (Task 0.5).

### The set
- **SW1 — four parts, in order a → b → c → 6.36; 6.36 keeps the row key.** New rows `6-36a-member-workplace-and-posting-history`
  (`ready-for-dev`), `6-36b-people-who-know-me`, `6-36c-workplace-list-curation-and-prompts` (both `backlog` until their predecessor is
  `done`). Row `6-36-peer-mesh-school-wise-selection` stays `backlog` until 6.36a, 6.36b AND 6.36c are `done`; 6.27c keeps waiting for
  it (⇒ for all four). *Alt:* (B) three parts (fold c into a) — a part as large as 6.27a, reviewed in one pass; (C) selection before the
  prompts — 6.27c could start before the office list exists, so office workers would have ⛔ no colleagues. *§0:* the author's (how the
  work is cut — `-307` Consequence 1 delegates it to this story).

### Where a member works (6.36a builds SW2–SW8 and SW9's member half; 6.36c builds SW9's staff half)
- **SW2 — a workplace is a POSTING FACT, ⛔ not a directory attribute.** A school (from the imported list) or an office (from the Super
  Admin's list, 6.36c), one `workplaces` table per Pariwar; recorded on `member_postings` beside the district (platform-common, like the
  district); used to choose who is asked about a death (CF4 A), to set the posting's district (SW5) and to drive the member's OWN prompts
  (SW16) — ⛔ never an RBAC scope (`-133` cl.1); ⛔ never on any public page, ⛔ never in the member directory; on staff surfaces ONLY in
  6.36c's list / suggestion screens and, for a dead member's own claim, row 6-32's inspector questionnaire (SW25); Tier 3 plaintext
  (architecture §2.7 lists "School" as Tier 3). *Reading against the ratified text:* `-132` R2 forbids a directory attribute becoming
  authority-bearing **by default** or **by Pariwar-Admin action**; here (i) the use is the Panel's own CF4 A, and (ii) ⛔ no Pariwar Admin's
  act ever makes a member's workplace count — only the MEMBER's own pick or confirmation does (SW9) ⇒ **MATCHES** R2 on our reading; `-133`
  cl.1 — **MATCHES** (⛔ never RBAC). ⚠ C8 asked for *"an R4 promotion decision"* before school proximity steers selection; R4 concerns
  RBAC participation, and the Panel decided the selection use itself in CF4 A without being shown C8 (SF8) ⇒ ⛔ not a question, an **FYI
  line** in the SC note (SW29) so the Panel can say otherwise; `epics.md` C8 and architecture §2.7 / §2.13.2 are ANNOTATED (Task 0.4),
  ⛔ never rewritten. *Alt:* (B) model it as the directory's "School" attribute (11a's substrate) — that substrate is ⛔ not a schema
  (memory: *"matrix is NOT a schema"*), and a display attribute steering selection is exactly what §2.13.2 fences.
- **SW3 — the list is IMPORTED from a documented CSV profile with an explicit DISTRICT MAP; the PRODUCTION source and permission are a
  go-live record.** The import tool reads the India Data Portal file's columns (SF1), keeps the rows of the Pariwar's UDISE state code
  (Bihar `10`), maps EVERY file district to the Pariwar's district spelling through a required map file (`--district-map`, a two-column
  CSV; an unmapped district REFUSES the whole run — SF13), upserts by `udise_school_code` in ONE transaction, and records the batch (source
  name + URL, retrieval date, licence, attribution text, counts). ⛔ Never deletes: an IMPORTED school missing from a later file is
  DELISTED (hidden from pickers, kept for every posting that names it) and RE-LISTED if it returns; offices and Super-Admin-added schools
  (`source = 'staff'`) are ⛔ never touched by an import — EXCEPT the explicit `--rename-district` (Task 1.1b), which moves every row's
  district. Dev / staging / tests use the IDP file or a small committed fixture (ODC-BY:
  commercial use allowed; an attribution notice required). ⚠ Before go-live (Row 31 (c), (h)): BigDev obtains an OFFICIAL list or written
  permission (the Ministry of Education's UDISE+ team, or Bihar's education department / BEPC, whose e-Shikshakosh keys schools by UDISE code
  — REPORTED, ⛔ not verified), the app shows the attribution, and every live Pariwar's list is imported with its district map checked
  against the District Admins' grants. *Alt:* (B) wait for an official list before building — blocks 6.36a for an unknown time; (C) scrape
  UDISE+ — ⛔ not allowed (its copyright policy). *§0:* the author's (which data source to build on); the licence is counsel's /
  BigDev's at go-live — ⛔ not a Panel question (it concerns ⛔ no one's personal data).
- **SW4 — the picker: district → type-to-search, ⛔ not district → block → school.** Step 1 a district (the Pariwar's listed districts);
  step 2 *"A school"* / *"An office"*; step 3 a SERVER-side search (debounced, the previous request cancelled) over that district's listed
  schools (or offices), each row showing the name, the village and the cluster (UDISE names are mostly English upper-case — shown as they
  are, `-307` §2 item 2); a block filter is added when a list with block names is obtained. *Alt:* (B) district → block (shown by CODE,
  e.g. `100712`) → school — teachers do ⛔ not know block codes; (C) wait for block names. ⚠ Supersedes `-307` §2 item 2's *"district →
  block → school"* in part (an author-commit — BigDev's).
- **SW5 — the posting's district is the workplace's district.** A school's or office's district (the list's MAPPED spelling — SW3)
  becomes the posting's `district`; for *"isn't listed"* or *"I have retired"*, the district picked in step 1 ⇒ the free-text district box
  goes — EXCEPT in a Pariwar with ⛔ no `workplace_districts` row (⛔ no import yet), which keeps today's free-text district (SW7). ⛔ No backfill (`-306`: not in
  production).
- **SW6 — the start date.** *"When did you start working here?"* (or, for *"I have retired"*, *"When did you retire?"*) — a full date,
  typed `DD-MM-YYYY` with the app's existing parser (`apps/mobile/lib/peer-request.ts:70-95` `parseDisplayDate` — Devanagari digits
  accepted); stored as the posting's `started_on`; refused if in the future (IST), before 1950-01-01, or before the start date of the
  member's previous posting. The retirement row keeps Epic 4's meaning (SF7).
- **SW7 — a REQUIRED signup step, after KYC, that ⛔ never blocks.** `tc → kyc → workplace → nominees → medical → payment`; four answers,
  each valid: a school · an office · *"My workplace isn't listed"* · *"I have retired"*. It writes the member's FIRST posting row. In a
  Pariwar with ⛔ no `workplace_districts` row (⛔ no import yet), the step shows today's free-text district box (+ *"I have retired"*) and writes
  a district-only posting, as Life Events does today. *Alt:* (B) optional — most members would skip it, and the rule would choose nobody.
- **SW8 — a transfer is a NEW posting, from the same picker.** The Life Events "Posting" screen becomes "Workplace": the current
  workplace and the history (name, district, start date) and *"I have been transferred"* (the same picker + start date) ⇒ a NEW row
  (history kept, `-306` §2 item 2); *"I have retired"* writes the retirement row. EVERY posting write ends the member's older open
  *"isn't listed"* request (`withdrawn`). The route gains `Idempotency-Key` and a per-member rate limit; ⛔ no step-up (as today; change
  after a death is answered by 6.36 SW20, ⛔ not by friction).
- **SW9 — *"My workplace isn't listed"*: the member types it; a Pariwar Admin SUGGESTS a listed entry; the MEMBER confirms it; ONLY the
  Super Admin ADDS to the list.** The member types the workplace's name (≤ 120 characters) and, optionally, its village or block (≤ 120),
  under the district picked, and the start date (kept on the request); until confirmed, the member has ⛔ no workplace for selection.
  6.36c: a Pariwar Admin SUGGESTS an existing listed workplace IN THE REQUEST'S DISTRICT (the server refuses any other — a same-named
  school elsewhere would move the member's district, SW5) (step-up, audited); the member sees *"We think your workplace is [name], [district].
  Is that right?"* — *"Yes"* (6.36c's answer route) first marks the request `confirmed`, then writes a NEW posting with that workplace and
  the request's start date through the ONE writer (the member's own act, I2 — the writer's "end older requests" step skips it); *"No"*
  returns it to `pending`. A request the member has since replaced with another posting is `withdrawn` and can ⛔ no longer be answered. A
  workplace that is ⛔ not on the list is ADDED by the Super Admin (offices, missing schools), then suggested. ⚠ Narrows `-307` §2 item 2's
  *"a Pariwar Admin review queue (match to an entry, or add one)"* twice: a Pariwar Admin can ⛔ never create a workplace, and ⛔ never set
  one — C8's hazard (*"a Pariwar Admin's data entry influence who verifies a death"*) and `-133` cl.2's posture (creation is the Super
  Admin's / the Panel's). *Alt:* (B) the Pariwar Admin's match counts without the member (as `-307` wrote) ⇒ **SC2** is owed; (C) the
  Pariwar Admin also adds ⇒ **SC2**. *§0:* the author's on A (it NARROWS a staff power and changes ⛔ nothing a member sees or is owed); the
  Panel's (SC2) on B or C.

### People who know me (6.36b builds SW10–SW15, SW16 (1), SW17; 6.36c builds SW16 (2)–(5))
- **SW10 — up to three, each accepted, same Pariwar.** At most THREE live (asked + accepted together) per member; each another
  `active` member of the SAME Pariwar, ⛔ never oneself; ONLY an `active` member may match contacts or ask (an unpaid, pending account ⛔
  never can); only ACCEPTED ones count; the member removes one at any time (the person is ⛔ not told); the named person may also withdraw
  later (*"I don't know them"*); a request ⛔ not answered within 30 days of `asked_at` LAPSES (its `ended_at` = `asked_at` + 30 days,
  recorded lazily by the writer — ⛔ no job; ⛔ no answer is taken after it) and frees the slot; a request that ENDED without acceptance
  (declined, lapsed) or a link that was withdrawn lets the namer ask the same person again only from its `ended_at` + 60 days. *Alt:* (B) ⛔ no lapse — an ignored
  request holds a slot for ever.
- **SW11 — finding them by contacts (CF5 A).** *"Find members in my contacts"* → a note in BigDev's words with the Trust's name FROM
  CONFIG (`-309`; the legal name is under registration — ⛔ never hard-coded): *"We need access to find your colleagues already at [the
  Trust's name]."* + *"Numbers of people who aren't members are not kept."* → the phone's permission prompt → the app reads the phone
  numbers, normalises them on the phone to `+91XXXXXXXXXX` (a copy of `normalizeMobile` that ALSO takes `0091…`, `+91 (0)…`, `+910…` and
  non-ASCII digits — SF9), keeps only Indian mobiles, drops duplicates, sends AT MOST 1,000 in ONE request (more ⇒ the screen says *"We
  checked 1,000 of your contacts"*); the server matches them against the CALLER'S Pariwar's members who are `active` and have ⛔ no claim
  filed for their own death, returns ONLY the positions that matched (⛔ no member id, ⛔ no name), and keeps ⛔ nothing; the app shows the
  matched contacts under the names saved in the phone, with a search box; the member ticks up to their free slots and sends. ⛔ No number
  in any DB row, log, audit line, alarm or error body (a fence + behaviour tests). The registered name is shown only after acceptance
  (`-309` item 3).
- **SW12 — the limits, and the audit.** ≤ 1,000 numbers per request; ≤ 3 matching requests per member per IST day; ≤ 2,000 numbers per
  member per rolling 30 days; ≤ 100,000 numbers per Pariwar per IST day; ≤ 10 name-requests per member per day (DB-backed counters — the
  `sms_rate_buckets` precedent, SF9). *Reading:* CF5 A's *"limits stop anyone using it to test numbers in bulk"* — one account can test
  at most 2,000 numbers a month, and only an `active` (KYC'd, paid) member may match (SW10) ⇒ **MATCHES**. The counters are charged in a
  short transaction BEFORE any HMAC is computed (a refused request costs ⛔ no KMS call). The HMACs are computed OUTSIDE any transaction,
  ≤ 8 in flight per API instance, and audited as ONE line per request (`kms.compute_hmac`, the caller's Pariwar, the purpose and count
  carried in the line's row key — e.g. `contact_match:n=1000` — because an audit row has ⛔ no context column, only a payload hash,
  `apps/api/src/audit/audit-log-sink.ts:184-188`) — ⛔ not one line per number: SF9's per-call hook would serialise up to 1,000 audit writes on the lock login shares.
  ⚠ This departs from Story 1.5's D10-1.5 (*"an audit-log entry on every … operation"*) for this one path — an engineering rule, ⛔ not a
  ruling — and is recorded in the decision. COST, recorded: one KMS HMAC call per number (≤ 2,000 per member per month); Row 31 (e) checks
  the KMS quota. *Alt:* (B) keep one audit line per number and cap a request at 100 numbers — most phonebooks then need ten passes.
- **SW13 — the fallback without the permission.** iOS: the system contact picker (⛔ no permission — SF3), one contact at a time; Android:
  TYPE the person's mobile number. Either way only that number is sent, matched and discarded; a non-member's number is ⛔ never kept.
  Supersedes `-309` item 6 IN PART (Android). *Alt:* (B) a small Expo native module wrapping Android's `ACTION_PICK` (⛔ no permission) —
  native code to write, review and keep across SDK upgrades.
- **SW14 — what each side sees.** The member sees a pending request under the name THEY saved (kept only on their phone, ⛔ never sent),
  then, once accepted, the named member's REGISTERED name; the named member sees, in the app only (the home card + a notice-strip item —
  PM2's shape; ⛔ no SMS, ⛔ no push, ⛔ no WhatsApp): *"[Name] has named you as someone who knows them. Do you know him/her?"* (`-307` §2 item
  3 (iii); + Hindi) with the namer's registered name — *"Yes, I know them"* / *"No"*. The namer's list reads, per link: *"Asked"* (under
  the name they saved); *"Accepted"* (the registered name); *"Not accepted"* — at once after a *"No"* or a withdrawal, at day 30 after a
  lapse — for 30 days, then the link disappears; or *"Can no longer be asked"* (an accepted person who has withdrawn from the Trust or had a
  claim filed for their death — ⛔ no name, ⛔ never why; the slot stays used until the namer removes the row). ⚠ Four things each side CAN
  tell, recorded and accepted: (1) the namer sees a *"No"* at once (distinguishable from silence); (2) the namer sees a WITHDRAWAL after an
  acceptance; (3) an ERASED person's link has ended, so the namer's row VANISHES and the slot frees — erasure follows only a withdrawal, so a
  vanished row shows that the person left the Trust, ⛔ never that they died; (4) the NAMED member sees an accepted link leave their list
  when the namer removes it. *§0 — this WIDENS `-307` §2 item 3 (iii)* (*"only accepted names count, and the named list shows names only
  after acceptance"* — an author-commit, BigDev's own), on two grounds: the request screen tells the named person *"[Name] will see your
  answer."* BEFORE they answer, and the withdraw screen *"[Name] will see that you withdrew."* — so each answer reaches the namer with its
  author's knowledge; and *"Can no longer be asked"* / a vanished row add only what `member_status` already shows publicly (`-307` §1 —
  the directory), with a death ⛔ never told apart from leaving ⇒ the author's on our reading; if BigDev reads (3)–(4) as a disclosure
  *"to whom"*, they join **SC3**. *Alt:* (B) make a decline look like a lapse in every channel (the list, `freeSlots`,
  a re-ask's answer, a removal) until day 30 — four places that must stay consistent, each a test.
- **SW15 — workplace SUGGESTIONS are DROPPED for v1** (supersedes `-307` §2 item 3 (ii)). (1) A member's present-workplace colleagues are
  already asked FIRST (group A) — naming them adds ⛔ nothing while they share the workplace. (2) Showing a past workplace's members to
  anyone who DECLARES that workplace (the posting is self-declared) tells a stranger where members worked — *"what the Trust DISCLOSES about
  a person, or to whom"* is the Panel's under the routing template's §0; `-307`'s §0 classed it as the author's and CF4 / CF5 as put do ⛔
  not mention it — re-read under the template, that classification does ⛔ not hold. Contacts matching covers finding people. *Alt:* (B)
  past workplaces only + **SC3**; (C) as `-307` wrote + **SC3**.
- **SW16 — the prompts and the campaign, in the app only.** (1) ⛔ No signup step for *"People who know you"*: a member is ⛔ not yet
  `active` during signup (SW10) — supersedes `-307` §2 item 4's *"at signup (an optional, skippable step)"*; the prompt comes on the home once
  the member is active (2). (2) [6.36c] Home cards: a member whose latest posting names ⛔ no workplace and is ⛔ not a retirement (no
  posting, a district-only posting, an unconfirmed *"isn't listed"*) sees *"Add your workplace"* (→ Life Events → Workplace); a member WITH a workplace sees *"Invite your colleagues to join"* — the phone's share
  sheet with the member's own message, ONE share at a time (Apple 5.1.2(v)), and *"Add people who know you"*; each hidden for 30 days when
  dismissed. ⚠ Supersedes `-307` §2 item 4's condition (*"when ⛔ no other member shares the member's workplace"*, with the words *"No one
  from your workplace is a member yet"*): that card would tell anyone who declares a school whether any member works there (SW15's
  disclosure logic) — *Alt:* keep `-307`'s condition and words + **SC3**. (3) [6.36c] After a new posting: *"You have a new workplace —
  check the people who know you."* (shown after a transfer, ⛔ never after a retirement). (4) [6.36c] When a named person has WITHDRAWN
  from the Trust or had a claim filed for their death (SW14's unnamed *"Can no longer be asked"* row exists): *"Someone who knows you can
  no longer be asked — add someone else."* — ⛔ never who, ⛔ never why
  (both read the SAME, and the card names ⛔ nobody); a person who is merely late with a
  renewal (`active-in-grace`, `lapsed-unpaid`) triggers ⛔ no card (it would tell another member about their payments). Every card and flag
  about people who know me is shown ONLY to an `active` member (SW10). (5) [6.36c] A Pariwar
  Admin CAMPAIGN (a start and an end, ≤ 30 days): every `active` member of the Pariwar with fewer than three accepted people sees *"Add
  people who know you"* until they ask someone after the campaign began, dismiss it, or the campaign ends — ⚠ narrows `-307` §2 item 4's *"every member in their
  scope"* by skipping members who already have three.
- **SW17 — the named-people records.** One table (namer, named, state, dates, how found); member ids only; on either member's erasure
  their live links are ERASED (`state = 'erased'`, ⛔ not deleted — the history is kept, the ids are opaque); every end records `ended_at`;
  6.36 reads a REMOVAL as of its date (a removal after the cut — perhaps by the family — does ⛔ not count), but a named person's own
  WITHDRAWAL of THAT link excludes them whenever it happened (they said they do ⛔ not know the member) — a later, separately accepted link
  between the same two members counts on its own; a member's data export lists the people they named and the members who named them (names they already
  saw).

### The selection (6.36 builds SW18–SW27)
- **SW18 — a NEW metric `workplace_named_v1`, a GROUPED engine.** A new registry id (SF6) — ⛔ not *"a NEW metric version"* (`-306` §2
  item 4) under the old id, which would break replay — and the default for every new selection; `district_cohort_v1` stays for replay
  under a LITERAL id. The engine gains a grouped form: groups in order — `workplace` (cap 5) then `named_by_member` (cap 3); the FIRST
  group with ≥ 1 eligible person is the selection's SOURCE; ⛔ never a second group to fill up (CF4's option C was rejected); none ⇒ nobody
  (SW25). Supersedes 6.6's D3 (*"without touching the engine"*) — an author decision, BigDev's.
- **SW19 — the ANCHOR is the FILING date.** The claim's filing date (`claims.created_at`, IST) — the only date of the death known when
  the five are chosen (SF5): ⛔ no family-entered date exists, and in v1 ⛔ no OCR vendor is wired, so the certificate's OCR'd date is
  ALWAYS empty (SF17). ⛔ No decrypt, ⛔ no KMS call in the select job. ⚠ When a real OCR vendor (or a family-entered date) lands, using
  the certificate's date is a NEW metric id with its own story — recorded, ⛔ not built. *Alt:* (B) decrypt the OCR date when present —
  a branch that never runs in v1 (SF17) and a family-supplied, unaccepted date.
- **SW20 — the CUT: everything as recorded before the filing day.** The deceased's postings, the deceased's accepted people, and every
  candidate's postings are read as RECORDED (server time) before the START of the filing day (IST) ⇒ ⛔ nothing changed on or after the
  day the claim is filed can choose who is asked. ⚠ What it cannot stop: a change made between the DEATH and the filing — by the family
  holding the dead member's phone (SF10), or by a friend who declares the dead member's school. Two limits: (i) SW22 ranks SETTLED
  colleagues first (SW22's definition — their current run at that workplace began, as recorded, 90 days or more before the cut); (ii) staff see ONE line in the neighbours' section when,
  in the 90 days before the cut, the dead member's latest posting was recorded, or any of their named people was ACCEPTED or REMOVED:
  *"The member's workplace or the people they named changed in the 90 days before this claim was filed."* (the District Admin, the district's verifiers and the
  later approvers only — CF2's list; ⛔ never the inspector). Eligibility (SW23) is read at selection time, and a named person's own withdrawal counts whenever it happened
  (SW17). *Reading:* **NARROWS** CF4 A's
  *"the family ⛔ never chooses"* — a family that holds the phone CAN still change who is asked before filing; staff are told and the
  inspection always runs ⇒ **SC1**.
- **SW21 — who is AT a workplace, and the 90 days.** The deceased's CURRENT workplace = the workplace of their latest posting (as of the
  cut); a retirement row or an unconfirmed *"isn't listed"* row (*"unconfirmed"* = ⛔ no confirming posting recorded before the cut —
  ⛔ never the request's state at selection time, I8) ⇒ ⛔ no current workplace. The PREVIOUS workplace = the workplace of the
  latest EARLIER posting (as of the cut) that names a workplace DIFFERENT from the current one — skipping retirement rows and *"isn't
  listed"* rows (a transfer to an unlisted school, later confirmed, still reaches the school before it). It counts when the CURRENT run
  began less than 90 days before the FILING date. The CURRENT run = the latest consecutive postings of the same kind, counted back from
  the latest posting: rows naming the current workplace (an *"isn't listed"* row BETWEEN two of them ⛔ never breaks the run), or — when
  the latest row is a retirement or an unconfirmed *"isn't listed"* — the latest consecutive rows of THAT kind; its start = the
  `started_on` of its EARLIEST row ⇒ re-declaring the same workplace, or retiring twice, ⛔ never re-arms the old one. ⚠ Counting from the
  filing, ⛔ not the death, NARROWS CF4 A (*"after a transfer less than 90 days before the death"*) when a family files late ⇒ **SC1**.
  Group `workplace` = every eligible member whose latest posting (as of the cut) is at the current workplace or, when it counts, the
  previous one.
- **SW22 — the ranking, recorded.** Inside `workplace`: when the previous workplace counts, its people FIRST (they worked with the member
  longer — why `-306` added them), then the current one's; inside each, SETTLED people first (their current run at that workplace — SW21's
  definition — began, as RECORDED, 90 days or more before the cut: the earliest row's `created_at`), then the rest; inside each tier, ascending `sha256(claim_case_id ‖ ':' ‖ member_id)` (deterministic,
  replayable, and ⛔ not movable by anything a member types). Inside `named_by_member`: the same hash (⛔ no settled tier — `settled` is
  false for every named candidate). The ranked group is stored, capped deterministically at its first 500 (`ranked_member_ids`, immutable) — the first ≤ cap are asked;
  6.27c replaces a send-time skip with the next in the SAME list (PM1 (ii)). *Alt:* (B) longest time together — start dates are
  self-declared ⇒ the ranking could be bought with a typed date.
- **SW23 — the filter (PM1 (i)), ONE predicate.** Eligible = `members.state = 'active'` · ⛔ no claim (in any state) naming them as the
  deceased · an identity row exists (`EXISTS member_identities` — an `active` member always has a normalised mobile: memory *Member always
  has a mobile*; ⛔ no KMS) · ⛔ not the deceased · ⛔ not the claimant. Exported as ONE domain predicate that 6.27c's send-time re-check MUST
  reuse, KEEPING PM1's decrypt-time `no_sendable_number` check beside it. ⚠ Recorded, ⛔ not changed: a member under a moderation
  SUSPENSION stays eligible (6.27a F3); a relative of the deceased is ⛔ not excluded (⛔ no family-link data — the deferred item stays
  open; the *"How do you know [member]?"* answer shows staff *"A relative"*).
- **SW24 — the SOURCE, on the ping and on both staff surfaces.** `workplace` / `named_by_member` is stored on the selection AND on every
  ping (written at insert, ⛔ never updatable, a trigger checks it equals the selection's — 6.27c's replacement pings inherit it); the
  selection's UPDATE grant is narrowed to its mutable columns so the new columns are immutable too. The reply reaches the source through
  its ping (the reply is FK'd to the ping — `0157`) ⇒ ONE copy — ⚠ supersedes IN PART `-308` call 1's *"stored on the reply"* and `-325`
  S1 A's *"carries it onto the reply"* (stored on the reply's ping). The wire field `PeerMeshPingView.source` (`'workplace' | 'named_by_member' | null` — null ONLY for a
  `district_cohort_v1` selection); shown in the ONE `PeerMeshView` — on the District Admin's console AND the four later-approver hosts —
  as *"Chosen from the workplace"* / *"Named by the member"* (`-308`) BESIDE the *"How do you know [member]?"* answer when that answer
  exists, otherwise in the ping's header (a ping with ⛔ no reply still shows it). ⛔ Never on the inspector's screens, wire or showings
  (CF2: *"⛔ never who"*), ⛔ never on the helpline's caller view (it is the neighbour's OWN request view), ⛔ never on any member surface,
  ⛔ never in any text.
- **SW25 — nobody to ask: the claim goes on.** A selection with ⛔ no eligible person in either group is recorded `skipped`
  (`no_workplace_colleague_or_named_person`) AND moves the claim into checking with a NEW event `claim.peer_mesh_none_to_ask`
  (`documents_pending → verification_in_progress`) — so the ground inspection can be scheduled, a shepherd is assigned, and the
  certificate reminder's day 0 reads EITHER event (⚠ supersedes IN PART `-276` CR3's *"the claim's earliest `claim.peer_mesh_pinged`"*;
  the family may then receive 6.19d's certificate reminders, as any claim in checking does; `-259` detail 3 still holds); ⛔ no window job, ⛔ no text to anyone about neighbours. ⭐ FORWARD to row 6-32: CF4 A (3)'s *"the inspector collects a
  letter from the head of the school or office"* is 6-32's (`-307` Consequence 2); 6.36 stores the deceased's workplace ids on the
  selection for it; ⚠ our suggestion to 6-32: ask for the head's letter on EVERY full visit, so the question tells the inspector ⛔ nothing
  about the neighbours before they complete their own record (CF2). Supersedes 6.6's review item (SF4). *Alt:* (B) reuse
  `claim.peer_mesh_pinged` with an empty list — needs the payload's `.min(1)` relaxed (SF4) and an event that says "pinged" when nobody was.
- **SW26 — old selections keep their five.** Claims selected under `district_cohort_v1` replay as before; their pings have `source =
  null` and show ⛔ no source line.
- **SW27 — what 6.27c inherits** (annotations, Task 0.4): the replacement reads `ranked_member_ids` and the SW23 predicate (+ PM1's
  decrypt-time check); a replacement ping carries the selection's source; `recordPeerMeshResponse`'s check against `selected_member_ids`
  must move to the ping rows (SF11); 6.27c AC5's *"⛔ no replacement"* is stale (PM1).

### The records
- **SW28 — go-live Row 31 `peer-mesh-selection-data-basis`** (the next free row — the roster's highest is 30): ALL EIGHT, each recorded as
  a Decision — **(a)** counsel's basis for the workplace and posting dates, the named people, and the phone numbers sent for matching
  (matched then discarded — DPDP §6(1) asks that the data be NECESSARY for the purpose); **(b)** a published privacy-policy revision naming
  all three; **(c)** the PRODUCTION school list's source and permission (SW3) and the app's attribution notice; **(d)** the Play Console
  contacts declaration and Apple's contacts-usage string reviewed; **(e)** the KMS quota checked against SW12's matching rate; **(f)** a
  Hindi human review of every new member screen; **(g)** the SC confirm note answered (SW29); **(h)** every live Pariwar's list imported
  and its district map matched to the District Admins' grants (SF13). AND Row 27 gains **(h)** *"Row 31 closed"* (its criteria become *"ALL
  EIGHT"*) — so 6.27c's texts, which
  wait for Row 27, wait for the data basis too (`-306` §3 / `-307` §3 / `-309` owed *"a Row 27 evidence line"*; `-310` says this data is
  *"go-live gated (Row 27)"* — Row 31 holds the detail, Row 27 points to it). Owner BigDev; counsel. It blocks ⛔ no merge — nothing is in
  production.
- **SW29 — ONE short Panel confirm note** (the `-305` §3 precedent), non-blocking for the build, answered before Row 31 closes: **SC1**
  always; **SC2** only if SW9 B / C; **SC3** only if SW15 B / C, SW16 (2)'s alternative, or SW14 (3)–(4) read as a disclosure; **SC4** recommended (one line in a note that is
  going anyway); and ONE **FYI** (⛔ not a question): the directory-attribute rulings and C8 that CF4 A was ruled without (SW2).
- **SW30 — the records the set touches.** `epics.md` gains entries for 6.36a / 6.36b / 6.36c / 6.36 and dated ANNOTATIONS (⛔ not rewrites)
  on Story 6.6 and FR-39's C8 line; `prd.md` FR-39 gains an annotation; architecture §2.7 / §2.13.2 gain one (SW2); 6.27a's Invariant 4 /
  Trap 8 and 6.27c's AC5 / its STATUS line / its Dev Notes gain annotations (SW27); Row 27 gains (h) and Row 31 is appended (SW28).
  Deferred items: the zero-candidate stall — CLOSED by 6.36's code (SW25); *"`getPeerMeshCandidateSnapshot` has no cap"* — NARROWED by
  6.36 for the new metric (its snapshot reads only the deceased's two workplaces and named people; a very large office stays unbounded —
  the item stays open with that note); the `-308` hand-off item and its `-326` line —
  CLOSED by 6.36's code; *"the deceased's FAMILY … not excluded"* — stays OPEN (SW23).

## The Panel confirms (SC1–SC4 + an FYI) — the routing template's §0 applied

- **SC1 (always) — the date of death is ⛔ not known when the five are chosen.** Stripped of citations: *"when we choose who to ask, we
  know only the day the claim was filed — the certificate's date is checked by staff later. So (1) we count the 90-day transfer rule back
  from the filing day, and (2) a family that holds the member's phone could change the member's workplace or the people they named before
  filing. We limit (2): colleagues who were recorded there for 90 days or more are asked first, and staff are told when the member's
  workplace or named people changed in the 90 days before the claim. May we go ahead on that basis?"* ⇒ it NARROWS CF4 A twice (*"less
  than 90 days before the death"*; *"the family ⛔ never chooses"*) ⇒ the Panel's. Options, each with its cost: **A** — as above (our
  suggestion; a late filing can miss the previous school, and a family that plans ahead can still steer — staff see it, and the inspection
  always runs); **B** — ignore every change to the member's own workplace or named people made in the 90 days before the filing (⛔ no
  steering inside that window, but the motivating case — a member who dies days after a recorded transfer — loses the new school's
  colleagues, and a member who joined less than 90 days before has ⛔ nobody asked); **C** — choose the five only after a District Admin
  has accepted the certificate's date (the rule then runs on the real date, ⛔ no steering after the death; but the neighbours are asked
  days later, and the claim must enter checking without a selection — a change to how every claim starts).
- **SC2 (only if SW9 B / C)** — *"may a Pariwar Admin set or add a member's school or office, knowing that this changes who can be asked
  about a member's death?"* — C8 names it.
- **SC3 (only if SW15 B / C, SW16 (2)'s alternative, or BigDev reads SW14 (3)–(4) as a disclosure)** — *"may the app show members which other members work, or worked, at a school or
  office they say is theirs — or whether any member does?"* — a disclosure *"to whom"*.
- **SC4 (recommended)** — *"may the answer 'A colleague at the same school' read 'A colleague at the same school or office' in the next
  version of the neighbours' questions?"* — the words of a ruled question; built as a new version only after the ruling, by the story the
  ruling names (as `-329` minted v3 through 6.27b).
- **FYI (⛔ not a question)** — SW2's reading of `-132` R2 / `-133` / C8 against CF4 A.
- ⛔ NOT the Panel's (each strips to "the code should do X" within CF4 / CF5): the split, the list's import shape, the picker, the start
  date, the limits and their audit, the fallback on Android, the ranking, the anchor's mechanics, SW25's event, the source line's
  placement.

## Invariants (I1–I12) — the whole set

- **I1** — the workplace is ⛔ never an RBAC scope, ⛔ never on a public page or in the member directory, ⛔ never in any text; on staff
  surfaces only in 6.36c's list / suggestion screens and row 6-32's inspector questionnaire for a dead member's own claim (SW2).
- **I2** — `member_postings` stays APPEND-ONLY; a transfer, a retirement, an *"isn't listed"* answer and the member's confirmation of a
  suggestion are each a NEW row written by the MEMBER's act; a staff suggestion writes ONLY the request row.
- **I3** — a delisted workplace is hidden from pickers and ⛔ not deleted; every posting that names it keeps it; an import ⛔ never delists
  an office or a staff-added school.
- **I4** — ⛔ no non-member's phone number is ever stored or logged; ⛔ no member's number is ever returned by matching (SW11).
- **I5** — matching and naming stay inside the caller's Pariwar; an erased, withdrawn or reported-dead member ⛔ never matches (SF9).
- **I6** — at most three live named people per member, enforced by the writer under a lock AND by a DB backstop on INSERT.
- **I7** — the selection is deterministic: the persisted snapshot + the metric id ⇒ a byte-identical selection and ranking on replay.
- **I8** — nothing recorded on or after the filing day can change who is asked (SW20) — except eligibility (SW23), read at selection time,
  and a named person's own withdrawal (SW17), counted whenever it happened.
- **I9** — one source per selection; every ping of a selection carries it; neither the selection's new columns nor the ping's source ever
  change.
- **I10** — the source is shown to the District Admin, the district's verifiers and the later approvers ONLY (CF2's list) — ⛔ never the
  inspector, ⛔ never the helpline's caller view, ⛔ never any member.
- **I11** — ⛔ no group fills up another (CF4's rejected option C); fewer than five means fewer asked; nobody means the claim goes on (SW25).
- **I12** — the Trust's name comes from config; ⛔ never hard-coded (memory: the legal name is pending).

---

## Acceptance Criteria (6.36a)

1. **AC0 — ⛔ no code before Task 0.2's author-commit is in the tree, committed ALONE** (the next free decision id at that moment — `-330`
   if ⛔ no branch has taken it; grep EVERY branch's `.decision-log.md` for the bare number), and every file the answers amend is amended
   first (Task 0.5).
2. **AC1 — the migration** (the next free number at build — `0161` at `2581c514`: the journal ends at idx 160 and ⛔ no branch holds a
   higher number): `workplaces`, `workplace_districts`, `workplace_import_batches`, `workplace_requests`, and three new nullable columns
   on `member_postings`
   (`workplace_id`, `workplace_request_id`, `started_on`), with the CHECKs, triggers and grants in Task 1; member FKs SINGLE-COLUMN (SF14);
   per-command RLS on `app.pariwar_id`; applied on :5432 AND :5433, proven from zero; a policy-regression spec (cross-tenant refused,
   fail-closed without scope, ⛔ no DELETE, the column grants, the request guard incl. its erasure arm AND its rename arm).
3. **AC2 — the import tool** reads the IDP profile (SF1's columns) for ONE Pariwar, ONE UDISE state code and ONE district map; refuses the
   WHOLE run on an unmapped district; refuses a row without an 11-digit code or a name, and keeps only the FIRST row of a code repeated in
   the file (both counted, ⛔ not fatal); in ONE transaction inserts the batch row first (`running`), writes every mapped district to
   `workplace_districts`, upserts by `(pariwar_id, udise_school_code)` ONLY over `source = 'import'` rows (a staff row with the same code
   is KEPT and counted `rows_skipped_staff`), updates a school's district when a corrected map moves it, DELISTS a listed IMPORTED school
   absent from the file — only within the districts the file contains (a one-district file ⛔ never delists the rest) — RE-LISTS a delisted
   imported school present in it, and finishes the batch with its counts; ⛔ never touches a `source = 'staff'` row (except
   `--rename-district`); REFUSES the whole run when its map names a RETIRED spelling, unless `--relist-district "<spelling>"` is passed
   (a stale map must ⛔ never undo a rename); `--dry-run` writes
   ⛔ nothing and prints the same counts; a second identical run changes 0 rows. A fixture CSV test covers: a duplicate code, a malformed
   code, another state's row, an unmapped district (whole run refused), a rename, a corrected district, a delisting, a re-listing, a staff
   office untouched, a staff school sharing a code, a one-district file (⛔ no other district's spelling or school changes), a stale map
   naming a retired spelling (refused), the same map with `--relist-district` (re-listed), and `--rename-district` (the old spelling
   retired and ⛔ never offered; every workplace and open request moved; a closed and a confirmed request keep `<old>`; postings untouched;
   the printed count of postings still on `<old>`).
4. **AC3 — the member reads:** the Pariwar's LISTED districts (from `workplace_districts` — the import's district map, so a district with
   ⛔ no listed school still appears, and a retired spelling ⛔ never does — `status = 'listed'` only; empty in a Pariwar with ⛔ no import); listed workplaces of
   one district and one kind, searched by name or village (case-insensitive substring, the input ESCAPED for `ILIKE`), paginated with a
   bounded `limit` (the forced-pagination spec covers every collection GET automatically); ⛔ no delisted row; ⛔ not another Pariwar's row
   (RLS + the explicit `pariwar_id`).
5. **AC3b — the member's own history:** every posting, newest first, each with its workplace name and kind (or *"Not listed yet"* /
   *"Retired"*), district and start date; an open request shows its state (*"Waiting for a Pariwar Admin"* / *"Suggested: [name] — is
   that right?"*).
6. **AC4 — the posting write** (`POST /api/v1/member/life-events/posting`, the body REPLACED by a three-way choice): `workplace`
   (`workplaceId`, `startedOn`) · `not_listed` (`district`, `typedName`, `typedPlace?`, `startedOn`) · `retired` (`district`, `startedOn`
   — the retirement date); in a Pariwar with ⛔ no `workplace_districts` row (⛔ no import yet), ONLY `district_only` (`district` free
   text 1–200, `isRetirement?`, `startedOn?`). Schema failures answer 400 `request.validation` (`apps/api/src/middleware/error-mapping/index.ts:158-167`); the
   HANDLER's domain refusals answer 422 with ONE code per family: an unknown, delisted or other-Pariwar workplace (`workplace.not_found`,
   indistinguishable), a district ⛔ not among the Pariwar's LISTED spellings (`workplace.district_not_found` — a retired spelling is
   refused too), a start date in the future / before 1950-01-01 /
   before the previous posting's start (`workplace.start_date_invalid`), a typed name that is empty or carries a run of seven digits AFTER
   folding Devanagari and other non-ASCII digits to ASCII (`workplace.typed_name_invalid`); requires `Idempotency-Key` (a replay returns the
   same result, ⛔ no second row); a per-member rate limit; writes ONE posting row (and, for `not_listed`, ONE request row first) and the
   `member.posting_updated` event with its new nullish fields, and marks any older open (`pending` / `suggested`) request of the member
   `withdrawn` — except a request being confirmed (6.36c's answer route passes it) — in ONE transaction; the audit line carries the district and the CHOICE, ⛔ never the typed text.
7. **AC5 — the signup step** `(signup)/workplace` sits between `kyc` and `nominees`; ⛔ not skippable; *"Continue"* is enabled only by a
   valid answer; in a Pariwar with ⛔ no list it shows the district box (SW7); it calls AC4 and then goes to `nominees`; *"Step N of M"*
   counts it.
8. **AC6 — Life Events → "Workplace"** replaces "Posting": the current workplace, the history (AC3b — an open request shows its state)
   and *"I have been transferred"* (the same picker); a successful save shows the new row at the top. ⛔ No confirm question here — 6.36c
   builds it with its route.
9. **AC7 — the district:** after any AC4 write, the posting's `district` is the workplace's mapped district (or the picked / typed one) —
   a test; ⛔ no other `member_postings` reader changes (Dev Notes' list).
10. **AC8 — ⛔ never public:** ⛔ no public-pages, directory or Sahyog contract gains a workplace field — a test over
    `packages/contracts/src/public-pages/` and the directory contracts that ⛔ no key matches `workplace` / `school` / `udise`.
11. **AC9 — erasure and export:** the anonymizer, in ONE update per row, NULLs a withdrawn member's `workplace_requests.typed_name` /
    `typed_place` in EVERY state and moves an open one to `closed` (the guard's erasure arm admits exactly that; ⛔ no CHECK may require the
    typed text — memory: a CHECK is re-checked by the erasure the story adds), and
    keeps the posting rows (non-PII Tier 3, as today); the rtbf pin test enrols the new `.update(workplaceRequests)`; the member's data
    export lists their postings (new columns included) and their requests.
12. **AC10 — copy:** a new `workplace` namespace (en + hi + `$comment`), registered in the catalog, member-facing in `classification.json`,
    parity green; a real-`t()` test that every key the screens use resolves.
13. **AC11 — records:** Row 31 appended and Row 27 (h) added (SW28); `epics.md` entries + annotations, architecture / PRD annotations
    (Task 0.4) CHECKED present; `friction-budget.md` gains the workplace step's row (`forced` — SF15); `pnpm ci:local` green (a known #15
    failure in `review-queue-read` is reported as such, ⛔ never as "green").

## Tasks / Subtasks

- [x] **Task 0 — SHARED, before ANY code of ANY part (AC0).** ✅ 2026-10-14.
  - [x] 0.1 Put SW1–SW30 to BigDev as plain-language summaries (one line each, the recommended answer first); record each answer word
        for word in the Change Log below.
  - [x] 0.2 Stage ONE author-commit in the scratchpad (`decision-<id>.md`): Decision type *Author-commit (BigDev, Solo Builder)*; the
        Occasion with BigDev's words; **§1 FOUND** = SF1–SF17 (SF1 as a correction to `-307` §1's FOUND line — `-307` is ⛔ not edited);
        **§2 THE CALLS** = SW1–SW30 as answered, each marked where it supersedes IN PART: `-307` §2 item 2 by SW4 and SW9; `-307` §2 item 3
        (ii) by SW15 (with the §0 re-read); `-307` §2 item 4 by SW16 (1), (2) and (5); `-306` §2 item 4 by SW18 (a new id, ⛔ not a version);
        `-308` call 1 and `-325` S1 A by SW24 (stored on the reply's ping); `-276` CR3 by SW25 (day 0 reads either event); `-309` item 6 by SW13; Story 1.5's D10-1.5 for the matching path by SW12;
        6.6's D3 and its zero-candidate review item (story-file decisions) by SW18 and SW25; Row 27's criteria by SW28 (h); **§3 OWED** =
        the SC note and Row 31. Grep the BARE number on every branch right before inserting; insert above the newest `### Decision`
        heading; verify `git diff --numstat` is additive-only and equals the draft; commit ALONE (`governance: record Story 6.36's build
        decisions SW1–SW30 (Decision <id>)`). ⚠ If the write is refused, ask BigDev once with the staged path (memory: *Decision-log
        writes: try first*). Write the SHA into the Change Log only AFTER `git commit`.
  - [x] 0.3 Write ONE note from `trustee-panel-routing-note-TEMPLATE.md` (its order: the question, the one fact, the options with a cost on
        every one, then evidence) — `trustee-panel-routing-note-<date>-6-36-confirms.md` — carrying SC1, every other SC BigDev's answers
        leave open, and the FYI; committed with the governance commit or alone; ⛔ never recorded as "shown to the Panel" until BigDev says
        it was sent.
  - [x] 0.4 The annotations (dated, ⛔ not rewrites, each naming the decision id): `epics.md` — new entries for 6.36a / 6.36b / 6.36c / 6.36
        (the 6.27 entries' shape: *"Minted by …"*, row key, order, *"Full ACs: <file>"*) and annotations on Story 6.6 and FR-39's C8 line;
        `prd.md` FR-39; `architecture.md` §2.7 and §2.13.2 (SW2); 6.27a Invariant 4 and Trap 8; 6.27c AC5, its STATUS line and its Dev
        Notes (SW27). Commit with the governance commit.
  - [x] 0.5 Apply any answer that differs from a recommendation to EVERY file it touches (rebuild each file's AC ↔ Task map both ways),
        before Task 1.
- [ ] **Task 1 — the migration (AC1).**
  - [ ] 1.1 `workplaces`: `workplace_id uuid pk default gen_random_uuid()`, `pariwar_id uuid not null`, `kind text not null CHECK (kind IN
        ('school','office'))`, `name text not null CHECK (length(btrim(name)) BETWEEN 1 AND 200)`, `district text not null CHECK
        (length(btrim(district)) BETWEEN 1 AND 200)`, `block_code text null CHECK (block_code ~ '^[0-9]{6}$')`, `cluster_name text null`,
        `village_name text null`, `pincode text null CHECK (pincode ~ '^[0-9]{6}$')`, `udise_school_code text null CHECK
        (udise_school_code ~ '^[0-9]{11}$')`, `source text not null CHECK (source IN ('import','staff'))`, `import_batch_id uuid null`
        (FK → batches), `status text not null default 'listed' CHECK (status IN ('listed','delisted'))`, `created_by_actor_id uuid null`,
        `created_at`, `updated_at`; CHECKs: `kind = 'office' ⇒ udise_school_code IS NULL`; `source = 'import' ⇒ kind = 'school' AND
        udise_school_code IS NOT NULL AND import_batch_id IS NOT NULL`; UNIQUE `(pariwar_id, udise_school_code)`; UNIQUE `(pariwar_id,
        workplace_id)` (the owner key the posting / request FKs use); FK `(pariwar_id, district)` → `workplace_districts`; index
        `(pariwar_id, district, kind, status)`. GRANT SELECT, INSERT, UPDATE (`name`, `district`, `status`, `updated_at`, `cluster_name`,
        `village_name`, `pincode`, `block_code`, `import_batch_id` — ⛔ not `kind`, ⛔ not the code, ⛔ not `pariwar_id`) to the app role; ⛔ no
        DELETE. ⚠ A district change on a workplace ⛔ never rewrites a posting (each posting copied its district when written — I2).
  - [ ] 1.1b `workplace_districts`: `(pariwar_id, district)` PK, `status text not null default 'listed' CHECK IN ('listed','retired')`,
        `source_batch_id uuid null`, `created_at`, `updated_at` — the Pariwar's canonical district spellings, written by the import from its
        district map (SF13); an import ⛔ never retires a spelling on its own (a one-district file must ⛔ never empty the other districts);
        a spelling is RETIRED only by the tool's explicit `--rename-district "<old>" "<new>"`, which in ONE transaction lists `<new>`,
        moves EVERY workplace (import AND staff) and every open request from `<old>` to `<new>`, retires `<old>` (kept for the postings
        that copied it — I2 — but ⛔ never offered), and writes a batch row (`source_name = 'rename'`, `districts_retired = 1`,
        `rows_updated` = the workplaces moved); it RETIRES `<old>` FIRST, and every writer that checks a district (the posting writer, the
        staff add) reads its `workplace_districts` row `FOR SHARE`, so ⛔ no write can land on `<old>` during the move; it PRINTS how many
        postings still carry `<old>` with the warning that a District Admin's grant must cover BOTH spellings until those members post
        again (SF13 — Row 31 (h) checks it at go-live; after go-live the printed warning and the tool's README are the check); a closed or
        confirmed request keeps `<old>`; a retired spelling named by a later map REFUSES that run unless `--relist-district "<spelling>"`
        names it (then it is re-listed — AC2); GRANT SELECT, INSERT, UPDATE (`status`,
        `source_batch_id`, `updated_at`); ⛔ no DELETE.
  - [ ] 1.2 `workplace_import_batches`: `batch_id`, `pariwar_id`, `source_name`, `source_url`, `retrieved_on date`, `licence`,
        `attribution text`, `state_code text CHECK ~ '^[0-9]{2}$'`, `status text CHECK IN ('running','finished')`, `rows_read`,
        `rows_inserted`, `rows_updated`, `rows_delisted`, `rows_relisted`, `rows_refused`, `rows_duplicate`, `rows_skipped_staff`,
        `districts_retired` (nullable until finished), `started_at`, — with CHECK `source_name = 'rename' OR (source_url, retrieved_on,
        licence, attribution, state_code) are all NOT NULL` (a rename row carries ⛔ no source fields),
        `finished_at`; GRANT SELECT, INSERT, UPDATE (the counts, `status`, `finished_at` only); a trigger: `finished` is FINAL.
  - [ ] 1.3 `workplace_requests`: `request_id`, `pariwar_id`, `member_id` (FK → `members(member_id)` — SINGLE-COLUMN, SF14), `district
        text not null`, `typed_name text null`, `typed_place text null` (both ≤ 120 and `!~ '[0-9]{7}'` — the writer folds digits first),
        `started_on date not null` (the start date the member gave — the confirm reuses it),
        `state text not null default 'pending' CHECK IN ('pending','suggested','confirmed','withdrawn','closed')`, `suggested_workplace_id
        uuid null` (FK `(pariwar_id, suggested_workplace_id)` → `workplaces (pariwar_id, workplace_id)`), `suggested_by_actor_id uuid
        null`, `suggested_at timestamptz null`, `resolved_at timestamptz null` (set when the request becomes `confirmed`, `withdrawn` or
        `closed`), `created_at`; UNIQUE `(pariwar_id, request_id)`; CHECK `state = 'suggested' ⇒ suggested_workplace_id IS NOT NULL AND
        suggested_at IS NOT NULL`; CHECK `state IN ('confirmed','withdrawn','closed') ⇔ resolved_at IS NOT NULL`; ⛔ no CHECK on the typed
        text's presence (AC9); a guard trigger: `pending → suggested | withdrawn | closed`, `suggested → confirmed | pending | withdrawn |
        closed`, `confirmed` / `withdrawn` / `closed` FINAL — EXCEPT the erasure arm: `typed_name` / `typed_place` may become NULL in ANY
        state, either with every other column unchanged or together with an allowed move of an open request to `closed` that also sets
        `resolved_at` (the ⇔ CHECK) (test it on a row in each state); AND the rename arm: `district` may change on a `pending` or
        `suggested` row when every other column is unchanged (Task 1.1b's `--rename-district` — test it); GRANT SELECT, INSERT, UPDATE
        (`state`, `district`, `suggested_workplace_id`, `suggested_by_actor_id`, `suggested_at`, `resolved_at`, `typed_name`, `typed_place`).
  - [ ] 1.4 `member_postings`: ADD `workplace_id uuid null` (FK `(pariwar_id, workplace_id)` → `workplaces (pariwar_id, workplace_id)`),
        `workplace_request_id uuid null` (FK `(pariwar_id, workplace_request_id)` → `workplace_requests (pariwar_id, request_id)`),
        `started_on date null CHECK (started_on >= DATE '1950-01-01')`; CHECK `num_nonnulls(workplace_id, workplace_request_id) <= 1`;
        CHECK `is_retirement ⇒ workplace_id IS NULL AND workplace_request_id IS NULL`; ⚠ the existing grant is SELECT, INSERT (0031) — keep
        it (append-only); a column ADD needs ⛔ no new grant. Legacy rows keep NULLs (⛔ no backfill).
  - [ ] 1.5 Drizzle schema files (`packages/domain/src/schema/workplaces.ts`, `workplace_districts.ts`, `workplace_import_batches.ts`,
        `workplace_requests.ts`; three
        columns in `member_postings.ts`), policy files `packages/domain/src/policies/*-rls.ts`, the barrel; the journal entry
        (hand-authored; ⛔ never regenerate — memory *Live-DB test gotchas*); apply to :5432 and :5433.
- [ ] **Task 2 — the domain (AC3–AC4, AC7, AC9).** New `packages/domain/src/member/workplace.ts`: `listWorkplaceDistricts` (`status = 'listed'` only), `searchWorkplaces(db, { pariwarId, district, kind, q, limit, cursor })` (`clampLimit` — the `domain-accessor-invariants` gate; the
      `ILIKE` input escaped for `%`, `_`, `\`), `getListedWorkplace`, `pariwarHasWorkplaceList`; extend `insertMemberPosting` with
      `workplaceId`, `workplaceRequestId`, `startedOn` (still the ONE writer) and, in the SAME transaction, end the member's older open
      request (`withdrawn`); `insertWorkplaceRequest` (folds non-ASCII digits to ASCII — NFKD + the Devanagari digit range — before the
      seven-digit check); `listMemberPostingHistory` (joins the workplace and the request; newest first by `created_at, posting_id`);
      `latestPostingStartedOn` for AC4's "before the previous start" check; `pariwarHasWorkplaceList` reads `workplace_districts`;
      `insertMemberPosting` takes an optional `exceptRequestId` (the request being confirmed is ⛔ never withdrawn by its own posting), and
      ⛔ never withdraws the posting's OWN `workplaceRequestId` (a new *"isn't listed"* answer's request). The `member.posting_updated` payload schema
      (`packages/domain/src/member/events.ts:230-237`, `.strict()`) gains `workplace_id`, `workplace_kind`, `started_on` and `not_listed` —
      each `.nullish()` (the 6.17 `block` precedent). ⛔ No typed text in the event. The anonymizer arm (AC9) + the rtbf pin; the
      data-export entries.
- [ ] **Task 3 — the import tool (AC2).** `packages/domain/scripts/import-workplaces.ts` (run as `pnpm --filter @twt/domain
      workplaces:import -- --pariwar <uuid> --state 10 --file <csv> --district-map <csv> --source "<name>" --url <url> --retrieved
      YYYY-MM-DD --licence ODC-BY-1.0 --attribution "<text>" [--relist-district "<spelling>"] [--dry-run]`, and separately
      `workplaces:import -- --pariwar <uuid> --rename-district "<old>" "<new>" [--dry-run]`): streams the CSV (⛔ never 400 MB in memory — a line reader),
      inserts the batch row first (`running`), maps the IDP columns (`udise_school_code`, `school_name`, `district_name` → the district map,
      `cluster_name`, `village_name`,
      `pincode`; `block_code` = `udise_school_code[0:6]`), de-duplicates codes BEFORE batching (a repeated code inside one statement would
      fail it, 21000), runs under `withPariwarScope` in ONE transaction, writes `workplace_districts` from the map, batches upserts (1,000 per
      statement, `ON CONFLICT … DO UPDATE … WHERE workplaces.source = 'import'`), delists / re-lists only within the districts the file
      contains, ⛔ never retires a district spelling except through `--rename-district`, REFUSES the run (also under `--dry-run`) when the
      map names a retired spelling ⛔ not passed in `--relist-district`, finishes the batch with its counts, prints them; `--rename-district`
      follows Task 1.1b step by step. The attribution text to record (ODC-BY §4.3): *"Contains information from UDISE – Basic Details of
      Schools (India Data Portal, ISB Bharti Institute), made available under the ODC Attribution License."* A committed fixture CSV
      (`packages/domain/tests/fixtures/workplaces-fixture.csv`, ~40 rows, one Pariwar's two districts) and a documented `pnpm` seed command
      so dev and staging DBs are ⛔ never left without a list. ⚠ ⛔ Never fetch the real file in a test or in CI.
- [ ] **Task 4 — contracts + API (AC3–AC4, AC3b, AC8).** Contracts `packages/contracts/src/members/workplace.ts` (`.strict()`; the body as
      a discriminated union on `choice`; the read DTOs) and the changed `PostingUpdateRequest` (`packages/contracts/src/life-events/
      posting.ts:23-29`; ⚠ `pariwarRef` has readers — the handler and the data export, `assemble.ts:344` — keep it optional on the
      `workplace`, `retired` and `district_only` arms); routes in `apps/api/src/modules/life-events/` — `GET …/workplaces/districts`,
      `GET …/workplaces?district=&kind=&q=&limit=&cursor=`, `GET …/postings`, and the changed `POST …/posting` (an `Idempotency-Key` check
      in the handler — a module-local `requireIdempotencyKey` like the seven existing copies, e.g. `surveys/member-handlers.ts:111` —
      + the domain `idempotency` namespace; `perMemberKey` with `hook: 'preHandler'`); the handler validates the start date against the
      member's latest posting INSIDE the scope tx; `emitAuthAudit('member_life_events.posting_updated', { context: { district, choice }
      })`; route tests: each refusal, the idempotent replay, the other-Pariwar workplace = unknown, the no-list Pariwar's `district_only`
      arm, ⛔ no typed text in the audit / event / logs; AC8's contracts fence test. ⚠ The existing posting route's spec
      (`apps/api/tests/integration/life-events/life-events.spec.ts`) sends today's body — amend it to the new one.
- [ ] **Task 5 — the member app (AC5, AC6).** `apps/mobile/components/workplace/WorkplacePicker.tsx` (district list → kind → a SERVER
      search, debounced and cancelling the previous call, rendered in a `FlashList`; empty / loading / error rendered OUTSIDE the list —
      memory: the Fabric FlatList crash; then the start date; the *"isn't listed"*, *"retired"* and no-list branches);
      `apps/mobile/app/(signup)/workplace.tsx` + `WIZARD_STEPS` (`apps/mobile/lib/wizard-steps.ts:15`) + `kyc.tsx`'s hard-coded
      `router.replace` (`kyc.tsx:215` → `/(signup)/workplace`; the new screen → `/(signup)/nominees`); `apps/mobile/app/(life-events)/
      posting.tsx` reworked as "Workplace" (history + transfer; an open request's state — ⛔ no confirm question, 6.36c's); the API client methods
      (`packages/api-client/src/index.ts`, `call()` with `extraHeaders` for the key; `newIdempotencyKey()` from
      `apps/mobile/lib/peer-request.ts:129-139` — move it to a shared `lib/` module now that a second caller needs it); the TanStack
      queries (keys namespaced by `pariwarId, memberId`; the search results `gcTime: 0` — ⛔ never persisted to MMKV). ⚠ Typed routes in a
      worktree: run `tsc` both ways (memory). ⚠ The app ⛔ cannot import `@twt/domain`.
- [ ] **Task 6 — copy (AC10).** `packages/i18n/locales/{en,hi}/workplace.json` + `src/catalog.ts` + `locales/classification.json`; the
      screens' strings (the step title *"Where do you work?"*, the kinds, *"My workplace isn't listed"*, *"I have retired"*, *"When did you
      start working here?"*, *"When did you retire?"*, the refusals, the history labels, *"Not listed yet — a Pariwar Admin will look for
      it"*); a real-`t()` test.
- [ ] **Task 7 — records and close (AC11).** Row 31 appended to `docs/launch-gate-inventory/inventory-roster.md` in Row 30's shape and
      Row 27's (h) added (SW28 — each cites the decision that created it); CHECK Task 0.4's annotations exist; `friction-budget.md` row
      (*"member (picking their school or office and the date they started, at signup and at each transfer)"* · protects *"who is asked
      about a member's death — colleagues, ⛔ never strangers"* · `forced`); the Change Log and File List; `pnpm ci:local` green.

## Dev Notes

### Current state of the files this part changes (read at `2581c514`)
- **`packages/domain/src/schema/member_postings.ts:34-66` / `0031_member-postings.sql:21-41`** — append-only history (GRANT SELECT,
  INSERT), `district` NOT NULL free text, "current" = newest `created_at` (`getMemberPostingLatest` orders by `created_at DESC` ONLY —
  a recorded divergence, `member/posting.ts:117-140`; the peer-mesh reads add `posting_id DESC`). ⭐ Preserve: every reader keeps working
  on `district` (`member-geo/resolve.ts:83-92`, `peer-mesh-read.ts:81-87,123-129`, `data-export/assemble.ts:233-237`,
  `directory-read.ts:271`, `news-blog/audience.ts:165`, `surveys/read.ts:308`, `surveys/audience.ts`, `banners/audience.ts`,
  `pool/public-read.ts:534`, `claim/correction-queue-read.ts:240`, reports `member-roster.ts:82`, `contribution-rate-by-district.ts:79`);
  Epic 4's retirement anchor (the FIRST `is_retirement` row — SF7).
- **`apps/api/src/modules/life-events/handlers.ts:170-216`** — `updatePosting`: one scope tx; `insertMemberPosting` → `projectMemberState
  ('member.posting_updated')` → `buildSummary` → audit. ⭐ Keep the order and the single transaction; insert the request BEFORE the
  posting (the posting references it).
- **`packages/contracts/src/life-events/posting.ts:23-29`** — `{ district (1–200), pariwarRef?, isRetirement? }`; the summary returns only
  `{ recorded, is_retirement }` (`life-events/summary.ts:23`).
- **`apps/mobile/app/(life-events)/posting.tsx:20-110`** — a free-text district `Input` + a retirement toggle (`☑/☐`, `:72-84`) → becomes
  the picker (the free-text box survives only for a Pariwar with ⛔ no list). The Life Events hub (`app/(life-events)/index.tsx:24-53`)
  lists it.
- **`apps/mobile/app/(signup)/`** — each step: local `busy / error / done` → a `memberAuth.*` call → a "done" view whose button
  `router.replace`s to the next HARD-CODED literal (typed routes refuse computed hrefs — `wizard-steps.ts:3-6`). ⚠ There is ⛔ no resume
  guard: a member who quits mid-wizard lands in `(tabs)` on relaunch (pre-existing) — such a member has ⛔ no posting; 6.36c's *"Add your
  workplace"* card prompts them.
- **No picker / select / search / date-picker primitive exists** (`packages/ui` holds headless presenters only). Reuse: the radio list in
  `PeerQuestionnaire.tsx:523-548` (`accessibilityRole` radio + `checked`), the DD-MM-YYYY input `:492-521`, `AnnouncedText`
  (`components/peer-request/announce.tsx`).

### Traps
1. ⚠ **Byte-for-byte districts** — the mapped spelling becomes the posting's (two spellings merge ONLY through the explicit
   `--rename-district`, Task 1.1b); ⛔ never normalise a district on read (it would silently
   change who can see a claim — SF13). Test that two spellings of a district never merge.
2. ⚠ **The Drizzle correlated-subquery tautology** (the CORRELATION FIX note, `peer-mesh-read.ts:60-71`; the literal qualifier at `:84`,
   `:126`) — reference the outer row by a LITERAL qualifier in any correlated subquery over `member_postings`.
3. ⚠ **`clampLimit`, ⛔ not `Math.min`** — the `domain-accessor-invariants` gate fails any dynamic `.limit()` without it.
4. ⚠ **`.strict()` contracts and response PARSING** — responses are parsed (`apps/api/src/plugins/zod-openapi/index.ts`
   `serializerCompiler`); a new required response field breaks fixtures silently (contracts tests sit outside `tsc` — run vitest). Keep new
   INPUT rules off output schemas.
5. ⚠ **The event is `.strict()`** — new fields `.nullish()`; ⛔ no typed text in any event or audit line.
6. ⚠ **Prettier is ⛔ not enforced** — hand-format; ⛔ never `--write` whole files. **Markdown emphasis inside a JSDoc** — `**x**/` closes the
   comment.
7. ⚠ **Applied migrations are never regenerated** (42P07); edits reach :5432 AND :5433; ⛔ never `DROP SCHEMA`.
8. ⚠ **The IDP file is 397 MB** — stream it; ⛔ never commit it; ⛔ never download it in CI.

### Testing standards
Domain: vitest unit + live integration (`packages/domain/tests/integration/…`, BEGIN/ROLLBACK per test — memory: one BEGIN ⇒ every
`now()` equal; ordering tests need separate transactions). RLS: a new spec in `packages/domain/tests/integration/rls/` (the `attempt()`
SAVEPOINT / SQLSTATE pattern of `claim-peer-mesh-replies-policy-regression.spec.ts`). API: `apps/api/tests/integration/…` (the
forced-pagination guard walks `app.swagger()` — every collection GET is covered; only exemptions are listed). Mobile: vitest (node env;
one jsdom render precedent — `apps/mobile/tests/unit/peer-questionnaire-render.test.ts` with every native module mocked); pure logic split
out of components. `pnpm ci:local` before push (memory: unit=4 tunable; integration=1).

### References
- `-310` CF4 A / CF5 A / CF2; `-306`, `-307`, `-308`, `-309`, `-311` PM1 / PM2, `-325` S1 A, `-326` BD1 A; `-132` R2, `-133` cl.1 / cl.2.
- `trustee-panel-routing-note-2026-10-10-6-27-confirms.md` (CF4 / CF5 as put); the routing-note template.
- Architecture §2.7, §2.13.1–2.13.2; `epics.md` FR-39 + C8, Story 6.6; PRD FR-39, UJ-1 (*"He fills in his school, district, designation"*).
- External (2026-10-14): India Data Portal CKAN `ckan.indiadataportal.com/dataset/udise`; UDISE+ KYS `kys.udiseplus.gov.in`; ODC-BY 1.0
  `opendatacommons.org/licenses/by/1-0/`; Expo SDK 55 contacts `docs.expo.dev/versions/v55.0.0/sdk/contacts/`; Google Play User Data
  policy (answer 10144311) and contacts permission (answer 16935362); Apple App Review Guidelines 5.1.1 / 5.1.2.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List
- 2026-10-14 — authored by `bmad-create-story 6.36` (five read-only research passes + the author; three fresh-context verifiers). ⛔ No
  code. Ultimate context engine analysis completed — comprehensive developer guide created.

### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 1.7 | ⭐ Task 0 (shared) DONE. Task 0.1 — BigDev's answer, word for word: *"all A, SC4 yes"* (to SW1–SW30 and SC1–SC4 put as plain-language summaries). Task 0.2 — `2026-10-14-330` committed ALONE (`d44708e8`; inserted by this session, additive 45 / 0, byte-identical to the scratchpad draft). Task 0.3 — `trustee-panel-routing-note-2026-10-14-6-36-confirms.md` (SC1, SC4, the FYI; SC2 / SC3 ⛔ not owed) committed with the annotations (`35fe513f`); ⛔ not yet sent. Task 0.4 — the annotations in `epics.md` (four entries + Story 6.6 + FR-39 C8), `prd.md` FR-39, architecture §2.7 / §2.13.2, 6.27a Invariant 4 / Trap 8, 6.27c STATUS / AC5 / Dev Notes (`35fe513f`). Task 0.5 — ⛔ no answer differed from a recommendation ⇒ ⛔ no AC or Task changed. |
| 2026-10-14 | 1.6 | Validate round 6 (one fresh-context verifier — 0 BLOCKER, 1 HIGH, 4 MEDIUM, 6 LOW, all applied): Task 1.1b's leftover "re-listed" sentence replaced by the stale-map refusal and `--relist-district` (the HIGH); SW14 lists FOUR things each side can tell and its §0 says WIDENS `-307` §2 item 3 (iii), with the two notices and the `member_status` ground; the rename retires `<old>` first, writers read the district FOR SHARE, it prints the postings left on `<old>`, closed / confirmed requests keep `<old>`, and its batch row carries ⛔ no source fields (a CHECK); AC1 tests the rename arm; SW21 defines "unconfirmed". |
| 2026-10-14 | 1.5 | Validate round 5 (one fresh-context verifier — 0 BLOCKER, 1 HIGH, 8 MEDIUM, 6 LOW, all applied): the requests' `district` grant and a rename arm in their guard (the HIGH); staff rows and the stale-map refusal around `--rename-district`, its batch row and its grant consequence; SW14 states the two things a namer CAN tell (an immediate *"No"*; a vanished row = a withdrawal, ⛔ never a death), the named person is told *"[Name] will see your answer"*, and a §0 line; SW16 (4)'s card fires only for SW14's unnamed row (the word "erased" dropped); SW20 (i) points to SW22; duplicates removed. |
| 2026-10-14 | 1.4 | Validate round 4 (one fresh-context verifier — 0 BLOCKER, 2 HIGH, 5 MEDIUM, 3 LOW, all applied): SW14 RECOMMENDS the honest rule — a *"No"* shows *"Not accepted"* at once, a lapse at day 30 — after round 4 showed the indistinguishable version leaking through slots, re-asks and removals (it stays as SW14's alternative); one re-ask rule (`ended_at` + 60 days); the *"Can no longer be asked"* row is unnamed for withdrawal and death alike; district spellings are retired ONLY by an explicit `--rename-district` that moves every workplace and open request (a one-district file retires nothing); every district check reads LISTED spellings; SW21's run skips an *"isn't listed"* row between two of the same workplace and covers a retirement or an unconfirmed *"isn't listed"*; `settled` measured from the run's recorded start and false for named people. |
| 2026-10-14 | 1.3 | Validate round 3 (one fresh-context verifier — 0 BLOCKER, 3 HIGH, 9 MEDIUM, 8 LOW, all applied): ONE re-ask rule and ONE display timeline for a decline and a lapse (SW10, SW14 — ⛔ no declined-vs-ignored signal, ⛔ not even in timing); the lapse dated `asked_at` + 30; `workplace_districts` gains a `status` (a corrected map RETIRES the old spelling); SW17 per LINK; SW20's staff line counts removals; I8 / SW20 name the withdrawal exception; SW21's 90 days from the start of the CURRENT run; the writer ⛔ never withdraws its own posting's request; the replace card names ⛔ nobody and every people-who-know-me card is for `active` members only; the erasure arm sets `resolved_at`; Task 1 / Task 3 gaps; one wording for the no-list Pariwar. |
| 2026-10-14 | 1.2 | Validate round 2 (two fresh-context verifiers — consistency + claims; adversarial design): 1 BLOCKER, 10 HIGH, ~18 MEDIUM / LOW, all applied. The BLOCKER: in v1 the certificate's OCR'd date is ALWAYS empty (SF17) ⇒ SW19's anchor is the FILING date, ⛔ no decrypt; SW20's cut is the start of the filing day, with settled-first ranking (SW22) and ONE staff line about recent changes on the dead member's account; SC1 restated as the default rule with options A / B / C. Also: SW21's previous workplace skips *"isn't listed"* and retirement rows; only an `active` member may match or ask, so ⛔ no signup step for people who know me (SW16 (1)); the re-ask cooldown; a withdrawal excludes whenever it happened; the suggestion bound to the request's district and confirmed through 6.36c's route with `exceptRequestId`; `workplace_districts` (the Pariwar's district spellings; the no-list fallback per Pariwar); the import ⛔ never overwrites a staff row, delists only within the file's districts, may correct a district; the request's `started_on` and `resolved_at`; the erasure arm; the replace card ⛔ never shown for a late renewal; `-276` CR3 and `-325` S1 A added to the supersessions; Row 27 *"ALL EIGHT"*. |
| 2026-10-14 | 1.1 | Checklist validation (three fresh-context verifiers — code claims; governance + consistency; adversarial design): 2 BLOCKER, 11 HIGH, ~20 MEDIUM, ~30 LOW, all applied. Among them: single-column member FKs (SF14); the import's batch written first in one transaction, a required district map (SF13), re-imports ⛔ never delisting offices / staff rows; the request guard's erasure exception; a Pariwar with ⛔ no list keeps today's district box (SW7); a Pariwar Admin SUGGESTS and the member CONFIRMS (SW9); the retirement date (SW6); SW19's lower bound and fail-closed decrypt; SW20's cut at filing − 90 days when the certificate cannot be read, with SC1 restated; SW12's monthly cap and one audit line per match (SF9); SW16 (2)'s neutral invite card; SW24 beside the answer, the selection grant narrowed; SW25's forward line to row 6-32; Row 31 (g) (h) and Row 27 (h); SF1 / SF3 / SF4 / SF6 corrected; SF13–SF16 added. |
| 2026-10-14 | 1.0 | Authored by `bmad-create-story 6.36`: the four-way split (SW1); THE RECORD — SF1–SF12, SW1–SW30 (PROPOSED), SC1–SC4, I1–I12, the shared Task 0; 6.36a's ACs and Tasks. ⛔ No decision written; ⛔ no code. |
