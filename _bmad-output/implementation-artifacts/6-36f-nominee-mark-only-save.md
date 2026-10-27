---
baseline_commit: 0e9b261d
---

<!--
PINNED: `0e9b261d` = `origin/main` (`git fetch origin` 2026-10-24, after 6.36e LANDED by fast-forward — PR #302, ledger `2026-10-24v`).
Created at `0e9b261d` in its OWN worktree `/Users/dev/Developer/projects/TWT/.claude/worktrees/6-36f-nominee-mark-only-save`, branch
`story/6-36f-nominee-mark-only-save` ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]] — a peer session was busy
in the main checkout; ⛔ switch it). Two facts, stated separately: (1) the pin is an ancestor of this branch (durable); (2) every `apps/` /
`packages/` claim below was traced at `0e9b261d` on 2026-10-24 by two read-only research passes, the load-bearing ones spot-checked by
hand (`nominee-crypto.ts`, `declaration-write.ts`, `declaration-history.ts`, `member-links.ts`) — perishable, re-check at Task 0.1.
RE-TRACED 2026-10-26 at `origin/main` `b3b1e8e9` (44 commits past the pin, stories 11b.4 + 5.11b): ⛔ nominee file changed — the
nominee handler, `member-links`, `declaration-*`, the nominee contracts, the life-events / nominee-links routes, the mobile nominee files,
`nominee_link.json` and the number fence are byte-identical; `audit-sink.ts` (memorial literals), `api-client/src/index.ts` (memorial
client) and `anonymize.ts` (memorial scrub; now returns `AnonymizeMemberResult`) moved without touching a claim here. ⚠ The branch is
BEHIND main ⇒ rebase at Task 0.1 BEFORE the author-commit.
Re-locate by FUNCTION, ⛔ by line number.

STATUS: ready-for-dev (v1.1 — validated). MK1–MK12 are PROPOSED — BigDev answers them at Task 0.2; ONE author-commit records them BEFORE
any code (Task 0.3, [[feedback_governance_commits_precede_implementation]]). ⛔ Panel question (§0 below — the details never leave the
server, ⛔ new data, ⛔ new reader of the mark).

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes (before an already-negative word it is emphasis: "⛔ never") · ⭐ = action /
emphasis · ⚠ = hazard.

ADDRESSING RULE: ⛔ file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite decision id +
clause, item heading, row key).

NUMBERS (`-366` decision 6: *"the number belongs to the first COMMIT that takes it on any branch"*), each re-grepped at the commit that
takes it (`git log --all` + every worktree), as of 2026-10-26: decisions — highest COMMITTED on any branch `2026-10-25-406` (main;
`-404` / `-406` are 5.11b's, `-405` 11b.4's) ⇒ the author-commit takes ≥ `-407`. Migrations — ⛔ NEEDED under the recommended MK2 /
MK6 (state it again at Task 0.3 if an answer changes that); for the record, main's highest is `0185_contribution-suppression-batch-indexes`.
Ledger letters — this creation commit took `2026-10-24w` (⛔ used on main, so it stays as written at the rebase, branch-on-top, the
11b.4 precedent; mind the `---` separators when keeping both sides); main's latest is `2026-10-26c`; the validate pass took `2026-10-26d`;
every later line takes the next free letter OF ITS OWN DATE.

LETTERS: G = found facts (traced at the pin) · MK = build decisions (PROPOSED) · TR = traps.
-->

# Story 6.36f: A Member Changes or Removes a Nominee Mark Without Retyping the Nominees — the Server Keeps the Details `[SURFACE]`

Status: review

> **Current, 2026-10-27:** all three code-review patches are applied and verified. The code-review
> workflow keeps this story `in-progress` while the required AC7 device run and the recorded P2
> deferrals remain outstanding. Device validation stays deferred under “Review now, device later”;
> no device completion, go-live approval, commit or push is claimed. The earlier Task 1 pointer below
> is historical; implementation has already completed.

> ⭐ **Next: Task 1 (contracts + client).** Task 0 is DONE (2026-10-26): MK1–MK12 as recommended, MK9 en + hi final, Decision
> `2026-10-26-407` committed alone (`a1053c0b`), the records after it. AC0 is met; code may start.

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

Story 6.36e let a member mark a nominee who is also a member. But the Life Events nominee form starts EMPTY: the nominees status read
carries no personal data (G6), so every save is a full retype. On 6.36e's device run, removing or swapping ONE mark meant retyping every
nominee's name, relationship and mobile, and the first save was refused for the UNCHANGED first nominee ("Please enter your nominee's
mobile number."). BigDev chose **C, "server keeps the details"** over A (keep as is) and B (prefill the form from the record, which sends
personal data to the phone and needs a privacy ruling). This story adds a **marks-only save**. The phone sends only each rank's mark (`keep` /
`new` / none) and the version it is changing. The **server** copies that rank's stored encrypted details **byte for byte** into the new
version, then runs the same guards and the same `planNomineeLinks` rules as a full save. No personal data goes to the phone and nothing is
retyped. A typing slip can no longer silently replace a declared nominee's details. The full form is unchanged and is still the only way to
change a name, relationship, mobile, address or the number of nominees.

## Story

As a member who has marked a nominee who is also a member,
I want to change or remove a mark without retyping every nominee's name, relationship and mobile,
so that a mark-only change cannot silently replace a declared nominee's details with a typing slip.

## 📜 Policy meaning (AI-10-1)

**This story introduces NO predicate that gates a member's access to a benefit, and changes none.** Who may be marked (6.36e NE5 —
`knownPersonEligibleSql`), who may add a mark (the caller gate `isKnownPeopleCaller`), the declaration lock (6.20's D3), the terminal
states, the `nominee_change` step-up and what the five leave out (6.36e NE7) are all REUSED UNCHANGED, and the same `planNomineeLinks`
decides every carry and end. The two new refusals both gate only the marks-only PATH, never the declaration: "no declaration to keep"
(MK3) and "your nominees changed since you opened this screen" (MK3). The full form stays open in both cases. **In the member's terms:**
*"You can mark, change or remove which of your nominees is a TWT member without typing your nominees again. Their names, numbers and
shares stay exactly as you saved them, and who you may mark is unchanged. A mark changed on or after the day of death counts as a
nominee change, exactly as re-saving your nominees does today."* (`-239`; see §0 row 4.) **Checked against the Niyamavali** (the main checkout's
gitignored copy `docs/legal/niyamavali.md`, mtime 2026-08-16; a rulebook, ⛔ ratified — [[feedback_niyamavali_rulebook_not_spec]]): §2.4
*"Each member declares **one or two nominees** at signup or via Life Events"* and the 75 / 25 split. This story changes ⛔ count, ⛔ split
and ⛔ the route by which nominees are declared, so there is ⛔ conflict. Part 10 (*"processes member/nominee/claimant data lawfully, for
specified purposes"*) is ⛔ engaged afresh: the copied ciphertext is the same data, for the same purpose, held as before (MK2). **Result:
⛔ conflict.**

## The rulings and decisions this story builds on

| Source | Key (verbatim, short) | Status |
|---|---|---|
| BigDev, in session 2026-10-24 (6.36e device run, second pass) | *"C: server keeps the details"* (chosen over B, prefill from the record, and A, keep as is) | ⭐ THIS ROW'S ORIGIN — a build direction, ⛔ yet in `.decision-log.md` (`epics.md` `### Story 6.36f`: *"⛔ a decision-log entry (a build direction, written into this story's decisions at its create-story)"*) ⇒ recorded by the Task 0.3 author-commit |
| `-234` V / X | V: *"system should keep the timeline of nominee change"*, the change allowed until a claim is filed; X: *"Yes nominee should cover names, relationship, mobile, address, split. Yes all of them can be changed as long as member is alive."* | ⭐ TRUSTEE-RATIFIED — a marks-only save appends versions to that timeline (MK2); ⛔ field changes |
| `-234` Consequence 2(a) | *"an append-only declaration history — each change kept with its time, Tier-1 ciphertext retained, ⛔ never deleted"* | AUTHOR's consequence (built by 6.20) — the copy keeps it true (MK2) |
| `-384` Q2 A + `-397` §0 / §2 | `-384`: *"Yes — warn staff about nominee changes too."*; `-397` §2: *"**RECORDS** that `-384` Q2 A's staff warning already covers a link set or ended (a declaration save writes versions)"* | ⭐ TRUSTEE-RATIFIED (`-384`) + AUTHOR-COMMIT (`-397`) — a marks-only save trips the warning exactly as 6.36e's full re-save for a mark change does; ⛔ a new trigger (MK2) |
| `-396` Q1 A / Q2 A; Not covered | Q1 A *"Yes — the mark counts from the moment the member saves it."*; Q2 A *"Both."* — the marked member is told in the app (in-app only, consistent with `-356`); Not covered: *"any other use of the mark — payout, nominee determination, claim filing, contact, staff screens"* | ⭐ TRUSTEE-RATIFIED — unchanged; Q2 A binds MK8 (the pre-save `form.will_ask*` line, the marked member's in-app ask); Not covered binds MK6 (⛔ staff label, ⛔ ciphertext comparison) |
| `-397` NE2 / NE5 / NE7 / NE8 / NE11 / NE14 | a link is set *"Only by a declaration save, in the same tx as its versions"*; the 4-a-day meter; the exclusion as of the cut; ⛔ staff-line change; audit by `nominee_link:<id>`; ⛔ other reader (paraphrases, except NE2) | AUTHOR-COMMIT — REUSED; MK2 keeps NE2's *"same tx as its versions"* literally true |
| `-399` call 3 | *"The declarer's OWN `marked[]` rows stay one per version (they join `nomineeHistory[]` by `(rank, versionNo)` …)"* | AUTHOR-COMMIT — MK2 keeps it (a new version per marks-only save) |
| `-401` | ⛔ screen says that the Trust asks members about a death; a test pins it over the `nominee_link` namespace | AUTHOR-COMMIT — binds MK9's copy |
| `-235` Y / `-239` (a) / (b) | (a) *"'dated on or after the day of death' by itself enough to treat it as deliberate. That should raise the suspicion. System shouldn't refuse the claim, district admin will act upon suspicion and refuse"*; (b) *"Member's true nominee has to start over and produce original death certificate."* | ⭐ TRUSTEE-RATIFIED — a marks-only version is a member-source version and is classified like one (§0 row 4; MK2 / MK6) |
| `-234` V / 6.20 D3 | the declaration may change *"until claim has been filed"*, then locks | ⭐ TRUSTEE-RATIFIED — the same `guardDeclare` (MK4) |
| 3.9 (story file, Dev Notes) | *"Do NOT duplicate the declare/submit logic — add a new gated ROUTE that calls the existing SERVICE"* | precedent for MK4 |

### §0 — whose decision is this ([[feedback_panel_gate_read_ratified_verbatim]])

The template's test: what does the Trust DISCLOSE, OWE, or need a BASIS for, and which ratified clause would have to give? Strip the
citations and what is left is: *"the server writes the same encrypted bytes again instead of asking the member to retype them, and the
phone learns a version number"*. That is "the code should do X" with ⛔ change to what a person sees or is owed ⇒ **the AUTHOR's**.
Checked edge by edge:

| Edge | Ratified text | Verdict |
|---|---|---|
| Copying a rank's stored ciphertext into a new version | `-234` V *"keep the timeline of nominee change"* + X; Consequence 2(a) (author's); same data, same purpose, same table | **MATCH** (author's) |
| The phone learns each rank's version NUMBER and relationship (MK3) | ⛔ ratified text; an integer and a relationship already on the status read, ⛔ new personal data, read only by the declarer about their own declaration | **MATCH** (author's) |
| The staff warning fires on a marks-only save | `-384` Q2 A, as `-397` §0 / §2 already RECORDS for a link set or ended (*"a declaration save writes versions"*) | **MATCH** (author's, already ruled at `-397`): ⛔ new reader — the warning and the timeline read VERSIONS, ⛔ `member_nominee_links`; staff could already see "a re-save with nothing visibly changed" under 6.36e, whose only way to change a mark is a full re-save with identical details |
| A post-death marks-only save is a "change" | `-234` X (the mark is part of "the nominee" — `-397` §0 MATCH); `-235` Y; `-239` (a) / (b) | **MATCH** (author's): a marks-only version is a MEMBER-source version; dated on or after the day of death it is `discarded` (`-235` Y) and is `-239`'s ground — *"by itself enough"* for the District Admin to refuse the claim, the true nominee refiling with a fresh certificate. ⚠ ⛔ "the payout is unaffected". This is IDENTICAL to a full re-save with identical details today (6.20 T3, ⛔ dedup) — 6.36e already exposes it for every mark change. **Recorded cost** (author-commit Consequences): the marks path makes such a version producible by whoever holds the phone and its OTP WITHOUT knowing the nominees' details |
| The audit action `member_nominees.marks_saved` (MK7) | `-397` NE11 (each mark change already audited by `nominee_link:<id>`) | **MATCH** (author's): the new literal says only that the SERVER supplied the details; the sink is a structured log line, `context` stored only as a hash; ⛔ staff surface, ⛔ events_log change — unlike MK6's rejected label, which a staff CLAIM screen would show |
| Labelling a version "marks only" for staff — or any reader comparing version ciphertexts | `-396` Not covered *"any other use of the mark — payout, nominee determination, claim filing, contact, staff screens"*; `-397` NE14 *"⛔ other reader"* | **REJECTED** (MK6): it would tell staff that a mark changed, a new reader of the mark and so a Panel question. ⛔ Offered. ⚠ Byte-identical ciphertext IS a durable at-rest marker of a server copy (a full re-save encrypts afresh) ⇒ ⛔ reader may compare version ciphertexts; one that did would be a Panel question |
| Prefilling the form from the record (option B) | — | **REJECTED by BigDev** (needs a privacy ruling); ⛔ built |

## FOUND FACTS (G) — traced at `0e9b261d`

- **G1 — the save route and its order.** `POST /api/v1/member/life-events/nominees` (`apps/api/src/modules/life-events/routes.ts`; body
  `NomineeDeclareRequest`, response `NomineeStatusResponse`; preHandler `[memberSession, requireMemberStepUp(deps, 'nominee_change')]`;
  the ONLY route with `allowLink: true`). The signup twin `POST /api/v1/member/nominees` (`nominee/nominee.routes.ts`) passes `allowLink:
  false`. ⛔ per-route rate limit (only the global `@fastify/rate-limit`) and ⛔ Idempotency-Key on either. Handler
  `createNomineeHandlers(deps).declare(route)` (`apps/api/src/modules/nominee/nominee.handlers.ts`), in order: count guard (400
  `nominee.invalid_count`) → `deriveNomineeSplit` → `!allowLink` + any `memberLink` ⇒ 400 `nominee.link_not_available` → every `kind:'new'`
  number through `encryption.normalizeMobile` (null ⇒ 422 `nominee.link_not_found`, uncharged) → `hasFreshElevation(…'nominee_change')`
  OUTSIDE any tx → **if any `new`**: a short `openScopeTx` running `guardDeclare` FIRST (uncharged refusals), then
  `nomineeDomain.chargeNomineeLinkResolve` (caller gate `isKnownPeopleCaller` = `active` AND ⛔ `namedByClaimSql`, then
  `chargeMemberCounter(…'nominee_link_resolve', n, 4)`; refused ⇒ the same 422; over ⇒ 429 `nominee.link_daily_limit`) → ONE
  `encryption.mobileBlindIndexMany(…, { purpose: 'nominee_link_resolve' })` OUTSIDE any tx → the main `openScopeTx`: `guardDeclare`
  again → `lockLiveNomineeLinks` (`FOR UPDATE`, computes `onHead`) → `resolveNomineeLinkTargets` → `planNomineeLinks` (refusals via
  `LINK_REFUSAL`: 422 `not_found` / 409 `nominee.link_stale` / 422 `nominee.link_duplicate`) → **`encryptNomineeField` ×2 per entry
  (×3 with an address) INSIDE the tx (KMS)** → `readDatabaseClock` → `planDeclarationVersions(getNomineeVersionHeads(…), ranks)` → `replaceMemberNominees` →
  `projectMemberState('member.nominees_declared', …)` → `appendMemberDeclarationVersions` → `applyNomineeLinkPlan(…, versions,
  recordedAt)` → `buildStatus` → `ok = true` → audit `member_nominees.declared` + one `member_nominee_links.ended|carried|asked` line per
  link (`resourceLocator: nominee_link:<id>`, `context: { rank }`), INSIDE the `try`, before the COMMIT in `finally`. Each entry's
  rank is its ARRAY INDEX (`deriveNomineeSplit`'s `ranks[i]`). ⚠ The charge tx COMMITS (`closeScopeTx(chargeTx, charged)`) before the
  HMAC; 6.36e ⛔ refunds a unit on a later refusal (`link_stale`, `locked_claim_filed`, …).
- **G2 — `guardDeclare`.** `claimDomain.lockNomineeDeclarationForEdit` (`packages/domain/src/claim/nominee-lock.ts` — the D3 advisory
  lock, the tx's FIRST lock, then `isNomineeDeclarationLocked`: a claim naming the member as deceased unless a `member_found_innocent`
  finding ⇒ 409 `nominee.locked_claim_filed`) → `TERMINAL_STATES = {withdrawn, anonymized}` ⇒ 409 `nominee.member_terminal` → the D9
  re-declaration step-up (`isRedeclaration` ∧ state ∉ `PRE_LOCK_IN_STATES` ∧ ⛔ fresh elevation ⇒ `StepUpRequiredError('nominee_change')`).
  ⚠ `namedByClaimSql` (the caller gate) has ⛔ innocence release; the D3 lock has one. A `keep` or "none" is ⛔ metered and ⛔ caller-gated.
  `guardDeclare` ⛔ reads the body: `isRedeclaration` comes from the DB, so a marks-only save is always a re-declaration. ⚠ On the Life
  Events route the `requireMemberStepUp` preHandler demands a fresh elevation UNCONDITIONALLY, before the handler runs ⇒ the
  `PRE_LOCK_IN_STATES` exemption only ever matters on the signup route. ⚠ **Writers that take the D3 lock:** both member saves and claim
  intake (`tryConverge`). **Writers that do ⛔:** `anonymizeMember` (its callers in `member-data-rights/handlers.ts` / `rtbf/handlers.ts` take `rtbfAdvisoryLockKey`; legal from `withdrawn` OR a moderation
  `terminated` OVERLAY — `member/rtbf-legality.ts` — so the lifecycle state can still be `active` and `guardDeclare` passes) and the staff
  correction (`nominee-correction-persist.ts`: *"The D3 advisory lock cannot be taken here"* — reachable for a save only after an
  innocence unlock, which has ⛔ production caller today).
- **G3 — ciphertext CAN be copied.** `apps/api/src/modules/nominee/nominee-crypto.ts`: `encContext(pariwarId) = { pariwarId, fieldClass:
  MEMBER_NOMINEE_FIELD_CLASS }`, with ⛔ row or version identity in the encryption context (verified by hand; `envelope.ts` allows an
  optional `rowKey`, which the nominee family does ⛔ pass). ⇒ the serialized `enc:v1:…` bytes of one row decrypt from any other nominee
  row OF THE SAME PARIWAR. A test must prove it (AC3); a later change that adds a `rowKey` would break every copy (TR2).
- **G4 — two tables.** `member_nominees` (`0025`; PK `(member_id, rank)`; `name_ciphertext` / `mobile_ciphertext` NOT NULL,
  `address_ciphertext` NULL, all `piiColumn(1, 'member_nominee')`; `relationship` plain; `split_pct`) is the CURRENT projection, rewritten
  DELETE-then-INSERT by `replaceMemberNominees` (`nominee/declaration-write.ts`, which takes CIPHERTEXT rows — encryption is app-layer).
  `member_nominee_versions` (`0119`) is APPEND-ONLY (SELECT, INSERT + column UPDATE on the three ciphertext columns for the RTBF scrub;
  `kind declared | vacated`; `source member | correction`; `version_no` monotone per `(member_id, rank)`, UNIQUE; `declaration_id`
  groups one save; `recorded_at = clock_timestamp()` after the D3 lock).
- **G5 — "head" means two things.** `projectedVersionOfRank` (`nominee/declaration-history.ts`): *"⛔ NEVER 'the highest `version_no`'"*;
  a `correction` of an OLDER version takes head + 1 but is ⛔ projected. ⚠ It takes ONE rank's rows in version order and returns a
  `NomineeVersionId | null` — ⛔ a `versionNo`. `getProjectedNomineeVersions` (same file; 2 production calls, both in `claim-contact-persist.ts`, +
  4 test callers; `peer-mesh-nominees.ts` uses `projectedVersionOfRank` through its own `projectedVersionsAsOf`) returns `{ rank, versionId }[]`; `member_nominees` has ⛔ version column. A `vacated` projected version ⇒
  `null` and the rank is absent from the projection (they agree). 0119 was *"NO BACKFILL"* ⇒ a projection row with ⛔ version row is
  possible in pre-0119 / fixture data. `getMemberNominees` (`nominee/declaration-read.ts`) already returns the projection rows WITH
  ciphertext. The PROJECTION (`member_nominees`) equals the projected version.
  BUT `getNomineeVersionHeads` (used by `planDeclarationVersions`), `lockLiveNomineeLinks`'s `onHead` and `listNomineeLinksForDeclarer`
  (the links read) all use **max(`version_no`)**. They differ only after a correction of an older version, which is recordable only in the
  post-filing review window and so is reachable for a SAVE only after an innocence-finding unlock. A pre-existing 6.36e edge (MK11).
- **G6 — the status read carries ⛔ personal data.** `NomineeStatusResponse` = `{ nominees: [{ rank, relationship, splitPct,
  mobilePresent, addressPresent }], locked }` (`packages/contracts/src/nominee/declaration.ts`; `buildStatus`). The CLAIM flow reads it
  too (`(claim)/contact.tsx`, `(claim)/nominee-review.tsx`, `lib/claim-contact.ts`) ⇒ ⛔ field may be added (6.36e TR15). The marks come
  from the Life-Events-only read `GET /api/v1/member/life-events/nominee-links` (`apps/api/src/modules/nominee-links/routes.ts`) →
  `NomineeLinksView { links: { rank, linkId, label, name }[] }` (`contracts/src/nominee/member-link.ts`), `.strict()`-parsed by the
  api-client (`createMemberNomineeLinksClient().links()`, ⛔ on `memberAuth`). Its handler (`nominee-links/handlers.ts` `links()`) reads
  in one `inScope` tx under READ COMMITTED. The nominee-link schemas and every `/api/v1/member/life-events/*` path are ⛔ registered in
  `packages/contracts/scripts/emit-openapi.ts` (routes are hand-registered with `registry.registerPath`).
- **G7 — `planNomineeLinks`** (`packages/domain/src/nominee/member-links.ts`, pure): `(live: LiveNomineeLink[], submitted: { rank, link:
  SubmittedNomineeLink | null }[]) → { kind: 'plan', inserts, ends } | { kind: 'refused', reason }`. A `new` with ⛔ resolved member ⇒
  `not_found`; a `keep` not among the live ⇒ `stale`; a `new` of a member live on ANY rank ⇒ a CARRY (`foundBy: null`); a `keep` carries to
  the rank submitted on; one member twice among inserts ⇒ `duplicate`; ends: carried ⇒ `redeclared`; else `!onHead` or rank not resubmitted
  or resubmitted WITH a link ⇒ `redeclared`, else `removed_by_declarer`. `applyNomineeLinkPlan` ends first, then inserts (a new link's
  `asked_at = recordedAt`; a carry copies `nominee_member_id, found_by, answer, asked_at, responded_at` and sets `carried_from_link_id`),
  each onto `versions.find(v => v.rank === i.rank && v.kind === 'declared')`. Unit tests `packages/domain/tests/nominee/member-links.test.ts`.
- **G8 — `member_nominee_links`** (`0181`): ⛔ `created_at`; partial UNIQUE `(version_id) WHERE state = 'live'`; guard trigger (identity
  columns incl. `version_id` / `asked_at` never change); BEFORE INSERT `version_check` (the version is `declared`, same rank / declarer /
  Pariwar).
- **G9 — readers of the version shape.** (i) **6.36d / 6.36e exclusion**: `projectedVersionsAsOf` (`recorded_at < cut`) →
  `peerMeshNomineeLinkedMembersAsOf` counts any link on those versions with `ended_at IS NULL OR >= cut`, ⛔ `asked_at` test — V15: *"a
  link is written in the same transaction as its version"* (`claim/peer-mesh-nominees.ts`). (ii) **Staff warning**
  `getPeerMeshNomineeChangeBeforeFiling` (`claim/peer-mesh-read.ts`) — EXISTS on any version `recorded_at` in `[recentFrom, cut)`;
  documented to over-report. (iii) **Staff declaration timeline** (`apps/api/src/modules/claims/claims.nominee-declaration.handlers.ts`):
  per-version metadata (`version_no, kind, source, relationship, split_pct, recorded_at, effective_at, corrects_version_id`, warnings from
  `classifyNomineeVersion` — `recent_nominee_change`, `post_death_version` in `claim/approval-warnings.ts`) + decrypted snapshots; the
  determination marks EVERY version (`claim/nominee-determination-persist.ts`, cap 1,000). (iv) **Export** (`data-export/assemble.ts`):
  `nomineeHistory[]` one row per version; `nomineeLinks.marked` `{ rank, versionNo, state, answer, askedAt, name }` via
  `getNomineeLinksForExport` (one per version, `-399` call 3); `namedBy` collapses carry chains. (v) **Erasure** (`member/anonymize.ts`):
  scrubs every `declared` version's ciphertexts and the projection; `eraseNomineeLinks` erases live links. ⛔ Member-facing history
  endpoint exists (the export is the member's history).
- **G10 — the event and the audit.** `member.nominees_declared` (non-transition; payload `{ from_state, to_state, trigger:
  'nominee_declaration', actor: 'member', nominee_count, split, source: 'member', versions: [{ rank, version_no, kind }] }`, `.strict()`,
  `source` / `versions` optional — `packages/domain/src/member/events.ts`). Audit action names are literals of `AuthAuditEventType`
  (`apps/api/src/audit/audit-sink.ts`, the ONLY audit-name registry — ⛔ other list, map or switch); `context` is stored ONLY as a
  SHA-256 hash. `member_nominees.declared`'s context is `{ nominee_count, split, versions }` (`versions` a joined `"r:n:kind,…"` string).
  The 6.36b number fence (`apps/api/tests/unit/known-people-number-fence.test.ts`) pins the nominee handler file through THREE
  hand-maintained lists — `FILES`, `NOMINEE_LINK_FILES`, and `SINK_ALLOWLIST` (EXACT call counts per file and callee, e.g.
  `'nominee.handlers.ts:emitAuthAudit': 2`) — plus two identifier rules inside any sink call: `NUMBER_BEARING` (incl. `body`, `memberLink`,
  `newMarks`, `markIndexes`, `entries`, `mobile`, `indexes`, `raw`, `numbers`) and `NAME_OR_OTHER_MEMBER` (incl. `marks`, `resolved`,
  `liveLinks`, `read`, `nameCiphertext`, `nomineeMemberId`, a bare `name` / `names`) — read the test's lists, they are longer.
- **G11 — mobile.** `apps/mobile/app/(life-events)/nominees.tsx`: `EMPTY_FORM`; `freshForms()` = empty slots + `reconcileMarks`; the form
  waits on `links.data`; the status query `['member','nominees']` gives `locked`; the save is ⛔ a TanStack mutation —
  `stepUp.guard(() => memberAuth.lifeEventsUpdateNominees({ nominees }))`, then `stepUp.verifyAndRetry(…)` after the OTP
  (`useStepUpGate('nominee_change')`); refusals via `saveRefusalCopyKey`; a stale refusal refetches the links and remounts; 409
  `locked_claim_filed` ⇒ the locked state; drafts via `redactForDraft`. `components/life-events/NomineeForm.tsx`: validation REQUIRES name,
  relationship and mobile (`nominees.*_required` in `common.json`); the mark UI is `markControl` (Find… / Pick a different member / Remove
  mark / Keep the mark — `height={48}`), `keepMark` ⇒ `form.kept` "Mark kept.", `removeMark` ⇒ `form.removed`; the V3 question
  (`markNeedsQuestion`) blocks a save with `edit.answer_first`. Pure logic `apps/mobile/lib/nominee-links.ts` (`FormMark`, `markToSubmit`,
  `reconcileMarks`, `applyPick`, `saveRefusalCopyKey`, the pick handoff `handNomineeLinkPick` / `takeNomineeLinkPick`). The find screen
  `app/(life-events)/nominee-link-find.tsx` (`matchContactsForNominee`, `purpose: 'nominee_link'`; iOS picker / Android typed fallback).
  ⚠ Facts the marks mode depends on (MK8): (i) `markControl` is a CLOSURE inside `NomineeForm()` reading `props.link`, `t`, `lt`,
  `keepMark` / `removeMark` (which close over `forms`, `commit`, `setNotice`, `setInlineError`) and holding the V3 block
  (`markNeedsQuestion(slot)` needs name + mobile); the spoken *"Mark removed."* / *"Mark kept."* are the form's `notice` state rendered
  OUTSIDE it; the pre-save disclosure `form.will_ask` / `form.will_ask_no_name` (`-396` Q2 A; kept by `-401` call 4) renders inside it;
  testIDs `nominee-mark-${index}` / `nominee-mark-question-${index}` are pinned by `nominee-form-link-render.test.ts`. (ii) The pick
  handoff is ONE module-global `pendingPick { rank, mark }` (⛔ keyed per screen), taken once in `nominees.tsx`'s `useFocusEffect`; the
  find screen returns by `router.back()`; `nominees.tsx` calls `clearNomineeLinkSession()` on unmount (drops the matched contacts AND
  the pick). (iii) `applyPick` is slot-shaped (writes the picked number into an empty `mobile`, sets `namePending`, stamps
  `confirmedFor`). (iv) "May add a mark" on the phone = `canFind = useKnownPeoplePromptsQuery().data?.canNamePeople === true`
  (server: the 6.36b caller predicate — `active`, ⛔ named by a claim). (v) The full save leaves through `invalidateAndLeave()`
  (clears the `nominees` draft, invalidates `['member','nominees']` + `['member','life-events']`, refetches the links, `router.back()`);
  the step-up footer is written INLINE in `nominees.tsx`; `nominee-screen-draft-pins.test.ts` pins exactly 2 `saveDraft` calls there;
  ⛔ test renders `nominees.tsx`. (vi) The mark control offers only *Find…* / *Pick a different member* / *Remove mark* (+ *Keep the
  mark* in the V3 question) — ⛔ control MOVES a kept mark to the other rank. (vii) `(life-events)/_layout.tsx` is a plain `<Stack/>`;
  the root guard has ⛔ allowlist.
  Links hooks `components/nominee-links/useNomineeLinkQueries.ts`. Copy `packages/i18n/locales/{en,hi}/nominee_link.json` (`useNomineeLinkT`);
  relationship labels `nominees.relationship_*` in `common.json`. api-client `lifeEventsUpdateNominees` posts to `${LIFE_EVENTS_BASE}/nominees`
  (`packages/api-client/src/index.ts`).
- **G12 — tests that exist.** API `apps/api/tests/integration/nominee/nominee-member-link.spec.ts` (createTestApp + a log stream + a KMS
  `auditHook` capturing HMAC lines), `nominee-declare.spec.ts`, `nominee-lock.spec.ts`, `life-events/life-events.spec.ts`,
  `tests/unit/nominee-link-twins.test.ts`. Domain `tests/nominee/member-links.test.ts`, `tests/nominee/declaration-history.test.ts`,
  `tests/integration/nominee/member-links{,-concurrency}.spec.ts`, `tests/claim/peer-mesh-nominees.test.ts`,
  `tests/integration/claim/peer-mesh-workplace-snapshot.spec.ts`, `tests/member/rtbf-anonymize.test.ts` (DB-FREE — captures statements;
  27 tables / 30 statements after 11b.4) and the LIVE-DB `tests/integration/member/rtbf-anonymize.spec.ts`. Staff timeline
  `apps/api/tests/integration/claims/nominee-declaration.spec.ts` (`GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-declaration`
  + `/snapshots`). Jobs `apps/jobs/tests/data-export.test.ts` (`nomineeLinks`, the `(rank, versionNo)` join; `assemble.ts` lives in
  `packages/domain/src/data-export/`). Mobile `apps/mobile/tests/unit/nominee-{form-link-render,links-logic,links-hooks,link-find-render,
  link-match-purpose,link-requests-render,screen-draft-pins,history-copy}.test.ts`; render precedents `nominee-link-find-render.test.ts`,
  `memorial-screens-render.test.ts`. The `-401` death-word absence test is `packages/i18n/tests/nominee-link-copy.test.ts` (its regex
  includes `passing` and `asked about`; every parameterised key needs an entry in its `PARAMS` map or the "every key resolves" loop throws).

## ⚖️ Build decisions MK1–MK12 (PROPOSED — BigDev answers at Task 0.2)

Each carries the recommendation first.

- **MK1 — the request. RECOMMEND (a): a NEW route `POST /api/v1/member/life-events/nominees/marks`** (preHandler `[memberSession,
  requireMemberStepUp(deps, 'nominee_change')]`, the Life Events save's own) with its OWN strict body `NomineeMarksSaveRequest = { marks:
  { rank: 1 | 2, versionNo: int ≥ 1, memberLink: NomineeMemberLink | null }[] }` (1..2 entries, ranks unique — a `superRefine`; every
  object `.strict()`; `NomineeMemberLink` is 6.36e's union, REUSED). The schema has ⛔ field for the nominee's DETAILS (name,
  relationship, mobile, address, split), so a marks-only save CANNOT change them. ⚠ The reused `new` variant still carries the LOOKUP
  number (HMAC'd, ⛔ stored) — the number fence covers the new code exactly as it covers `declare` (MK7). The server keys every mark by
  its `rank` field (sorted by rank; uniqueness re-checked in the handler as well as by the `superRefine`), ⛔ by array position (TR11).
  Response: `NomineeStatusResponse` (unchanged). **Rejected:** (b) an "unchanged" variant
  of `NomineeDeclareEntry`: that body is shared with the signup route (G1), and it would let one save mix typed and untouched entries, a
  partly-typed save the epics entry excludes (MK10); (c) the signup route (6.36e NE4: Life Events only).
- **MK2 — what is written. RECOMMEND (a): a NEW version per occupied rank, carrying the SAME ciphertext.** Inside the main tx, after
  `guardDeclare` (the D3 lock serialises it against the other member save and claim intake — ⛔ against erasure or a staff correction,
  G2), read the member's projection rows with `getMemberNominees` (REUSED, given a `FOR UPDATE` option — Task 2.1; ⛔ a new read; the projection = each rank's
  projected version, G5), THEN compute each rank's projected `versionNo` (so a correction committed before the lock shows up as
  `marks_stale`), THEN re-read the lifecycle state for `TERMINAL_STATES`. For each rank, the new version is `kind 'declared'`, `source
  'member'`, with `name_ciphertext`, `mobile_ciphertext`, `address_ciphertext` (NULL stays NULL) and `relationship` COPIED BYTE FOR BYTE
  from that row (G3). The split is DERIVED from the projection's count by `deriveNomineeSplit` and ASSERTED equal to each row's
  `split_pct` (`member_nominees.split_pct` has ⛔ CHECK); a mismatch fails closed (500, ⛔ write) — the event's `split` and the rows'
  splits come from one source, as in a full save. Then the existing
  sequence runs unchanged: `planDeclarationVersions` → `replaceMemberNominees` (the same rows) → the event → `appendMemberDeclarationVersions`
  → `applyNomineeLinkPlan`. ⛔ KMS call for the details (⛔ `encryptNomineeField`; ⛔ decrypt). Every 6.36e invariant then holds as written: a link
  is written in the same tx as its version (`-397` NE2; V15, G9 (i)); `marked[]` stays one row per version (`-399` call 3); `onHead` is
  unchanged; the staff warning fires (`-384` Q2 A as `-397` §0 / §2 records it) and a version dated on or after the day of death is
  `discarded` and is `-239`'s refusal ground (§0 row 4 — the same as a full re-save with identical details today; the recorded cost is
  that the marks path produces it without knowing the details). ⚠ **Erasure race (pre-existing for the full save, sharper here):**
  `anonymizeMember`'s callers take the RTBF lock, ⛔ D3; a member with a `terminated` overlay can be `active`. With the `FOR UPDATE`
  read the scrub's `UPDATE member_nominees` waits for this save, but if the scrub's statements take their snapshot before this tx
  commits, they skip the projection rows and versions this save inserts — real ciphertext survives for an `anonymized` member. ⛔ Fixed here (⛔ new lock in hardened code,
  TR7) — recorded for BOTH paths in `deferred-work.md` (Task 0.4). **Rejected:** (b) hanging the new link
  off the EXISTING head version, which breaks V15. A save on the filing day before the claim, or after an innocence unlock, would hang a
  post-cut link on a pre-cut version, and the exclusion would count it. A fix by `asked_at` fails because a carry copies the original
  `asked_at`, so it needs a new `linked_at` column, a migration and a reader change. It also gives `marked[]` two rows per `(rank,
  versionNo)`, and it hides the mark change from the staff warning and from the post-death classification.
- **MK3 — the basis, and staleness. RECOMMEND:** each mark names the `versionNo` of its rank's PROJECTED version as the phone saw it, and
  the set of submitted ranks must EQUAL the projection's ranks. Any mismatch ⇒ 409 `nominee.marks_stale` (the phone refetches the status and
  the links read, shows the marks again, and the member saves again). A member with ⛔ projection row ⇒ 409 `nominee.marks_no_declaration`
  (the control is hidden anyway). A projection rank with ⛔ version row (G5, pre-0119 data) ⇒ the same 409
  `nominee.marks_no_declaration` (fail closed; a full save writes the versions), ⛔ a `marks_stale` loop. Without this, a member whose
  nominees were re-declared on another device could apply a mark to a nominee they never saw. **Where the phone learns it:** the
  Life-Events-only links read gains `ranks: { rank, versionNo, relationship }[]`, one per occupied rank at its PROJECTED version that HAS
  a version row (an integer and a relationship already on the status read, about the declarer's own declaration, ⛔ new personal data;
  `getProjectedNomineeVersions` extended with `versionNo` — it selects the ciphertext INTERNALLY via `listNomineeDeclarationVersions`,
  but returns and ships ⛔ ciphertext). The marks mode labels each block ONLY from `ranks` (⛔ from the cached status read, which may be
  stale). **Read order:** `ranks` FIRST, then `links[]`, in the links handler's same `inScope` READ COMMITTED tx. A save that commits
  between the two reads leaves `ranks`' `versionNo` stale, so the marks save is refused 409 `marks_stale` — a mark added between the reads
  can never be removed unseen. ⛔ REPEATABLE READ: `openScopeTx` has already run a query (`assertPariwarScopeSet`), after which Postgres
  refuses to set the isolation level; ⛔ change `openScopeTx`. A test that reverses the read order goes RED. ⛔ The
  status read (G6 — the claim flow reads it). **Where it is checked:** in the metering tx right after `guardDeclare` (a stale save is ⛔
  charged) when any mark is `new`, and authoritatively in the main tx after `guardDeclare`. ⚠ A concurrent save landing BETWEEN the
  charge tx's COMMIT and the main tx makes the main-tx check refuse 409 AFTER the unit is spent and the HMAC ran — consistent with 6.36e
  (⛔ refund, G1); tested as charged (AC2). **Rejected:** checking only the `keep` link ids. A rank with ⛔ mark that was re-declared with
  a different person would pass, and a `new` mark would land on that person.
- **MK4 — the guards and the order. RECOMMEND: the declare path's EXACT order (G1), shared, ⛔ copied.** Normalise every `new` number →
  `hasFreshElevation` → (any `new`) the metering tx: `guardDeclare`, the MK3 basis check, the caller gate + charge → ONE HMAC batch → the
  main tx: `guardDeclare`, the MK3 basis check, `lockLiveNomineeLinks`, `resolveNomineeLinkTargets`, `planNomineeLinks` (UNCHANGED — each
  submitted rank's `link` is the mark, or `null` for none), then MK2's writes, `buildStatus`, the audit (MK7), COMMIT. Built by extracting
  the link pipeline and the write sequence of `declare` into shared functions that BOTH handlers call, with the details either encrypted
  from the body (full save) or copied from the projection (marks-only). The shared pipeline takes `{ rank, link }` pairs KEYED BY RANK
  (the full save builds them from its index-derived ranks, the marks save from the body's `rank` field, sorted). 3.9's rule: *"Do NOT
  duplicate the declare/submit logic"*. ⛔ A second implementation of any guard. The extracted helpers stay IN
  `nominee.handlers.ts` (⛔ new fenced file). Step-up: the route's `requireMemberStepUp` preHandler demands a fresh elevation every time
  (G2), so ⛔ elevation ⇒ 403 BEFORE any tx; `guardDeclare`'s D9 check stays as it is (it only bites on the signup route).
- **MK5 — a save that changes nothing. RECOMMEND:** if the plan only carries each live link onto its OWN rank and asks nobody new (every
  `keep` stays on its own rank, every "none" sits on a rank with ⛔ live link, and any `new` resolves to the member already live on that rank),
  the server answers 200 with the status and writes ⛔ version, ⛔ projection, ⛔ event and ⛔ audit line. Versions written for nothing would
  trip the staff warning for nothing. **The predicate** — pure `isUnchangedMarksPlan(live, plan)`, decidable from `(live, plan)` once
  MK3 guarantees submitted ranks = projection ranks: EVERY insert has `carriedFrom !== null` with `carriedFrom.rank === insert.rank`
  AND `carriedFrom.onHead === true`, and EVERY live link is carried. (End reasons tell nothing: a carried link also ends `redeclared`.
  The `onHead` conjunct matters: in the MK11 state a re-pick of a link the links read hides must be re-hung on a fresh head version, or
  the member loops on a save that changes nothing.) A `new` re-pick of an answered link keeps its answer and `asked_at` (a carry), so
  nobody is re-asked. **Recorded:** MK5 deliberately departs from 6.20 T3 (*"⛔ no dedup"*) for marks-only saves only; a `new` that
  resolves this way has already spent its meter unit and left its KMS HMAC audit line with ⛔ `member_nominees.*` line (6.36e's recorded
  cost (1)). The phone also keeps *Save marks* disabled until a mark differs from the saved one. ⚠ A retry after a LOST response to a save that DID change something
  ⇒ 409 `marks_stale` (the versions moved). The phone refetches and shows the saved marks; recorded, ⛔ an idempotency key (the declare has
  none either, G1).
- **MK6 — what the history shows. RECOMMEND (i): ⛔ label.** A marks-only version appears everywhere exactly as a re-save with identical
  details does today: the staff timeline (decrypted snapshots show the same details), the export's `nomineeHistory[]`, the determination
  marks, the warnings. **Rejected:** (ii) a "details unchanged" label DERIVED by ciphertext equality. Byte-identical ciphertext could only
  come from a server copy, so the label would tell staff that a MARK changed: a new reader of the mark (`-397` NE14; `-396` Not covered
  *"any other use of the mark — payout, nominee determination, claim filing, contact, staff screens"*), which is a Panel question; ⛔
  offered. (iii) a stored column: an ALTER of the append-only `0119` table (6.36e TR2), a migration and the `kind_coherence` / trigger
  rework. ⚠ The byte-identical ciphertext is itself a durable at-rest marker of a marks-only version ⇒ ⛔ reader, response or export may
  carry or compare version ciphertexts (AC4 pins that the timeline and export responses carry ⛔ ciphertext); one that did would be a reader
  of the mark ⇒ the Panel. Recorded in MK10 and the author-commit.
- **MK7 — events and audit. RECOMMEND:** `member.nominees_declared` emitted exactly as a full save emits it (`source: 'member'`, the
  versions; ⛔ new payload field — the lifecycle sees a declaration save, and a plaintext events_log payload names ⛔ mark, `-397` NE11).
  Audit: a NEW action `member_nominees.marks_saved` (a literal in `AuthAuditEventType`; `context: { nominee_count, split, versions }`,
  exactly the `.declared` shape, `versions` the same joined string) IN PLACE OF `member_nominees.declared`, so the security record says
  truthfully that the server, not the member, supplied the details. It sits beside the unchanged link lines (`asked` / `carried` /
  `ended`), guarded by `ok`, before the COMMIT (the recorded audit-before-COMMIT item in `deferred-work.md` now covers this line too).
  The number fence (G10): `SINK_ALLOWLIST`'s `nominee.handlers.ts:emitAuthAudit` count updated to the new EXACT count; any new file joins
  `FILES` AND `NOMINEE_LINK_FILES`; the audit call's arguments use ⛔ `body`, `marks`, `memberLink` or any other fenced identifier (compute
  `nominee_count` from the projection rows, ⛔ `body.marks.length`).
- **MK8 — the phone. RECOMMEND (a): a marks-only MODE inside `app/(life-events)/nominees.tsx`** (⛔ new route — matches the epics
  wording *"the Life Events form offers a marks-only save"*). **The entry card** — shown ABOVE the form only when `status.data.nominees.length
  > 0`, ⛔ `status.isError`, ⛔ locked, `links.data !== undefined`, `links.data.ranks.length === status.data.nominees.length` (every rank
  has a basis, MK3), and (a live mark OR `canFind` — `canNamePeople`, G11 (iv); an `active-in-grace` member with ⛔ mark gets ⛔ card):
  `marks.entry`. Tapping it switches the screen into marks mode: the `NomineeForm` is ⛔ rendered (unmounted), so ⛔ stale form or
  draft can sit beneath it. **Marks mode** shows one block per `links.data.ranks` entry, `marks.slot` (*"{nominee} · {relationship}"* — `{nominee}` through the existing `nominees.primary_label` / `nominees.secondary_label`, the relationship through `nominees.relationship_*`; from
  `ranks` ONLY, MK3). Each block has the current mark (the links read's label; the name only when `confirmed`) and the SAME mark control,
  `markControl` EXTRACTED from `NomineeForm.tsx` into ONE shared component in `apps/mobile/components/life-events/` (⛔ forked), with
  props `{ index, mark, canFind, questionOpen, onFind, onRemove, onKeep }`, keeping testIDs `nominee-mark-${index}` /
  `nominee-mark-question-${index}`, 48 dp, the `labelled()` WCAG 2.5.3 labels and the `form.will_ask` / `form.will_ask_no_name` line for a
  `new` mark (`-396` Q2 A — the pre-save disclosure, REQUIRED in marks mode too). The form passes its existing state through the callbacks;
  marks mode passes `questionOpen = false` (⛔ editable details ⇒ the V3 question does ⛔ apply). Marks mode holds `Record<rank, FormMark |
  null>` initialised from the links read; the screen's EXISTING `useFocusEffect` takes the pick and, in marks mode, applies it to that
  record directly (⛔ `applyPick`, which is slot-shaped). The session stays owned by `nominees.tsx` (its unmount clear is unchanged; marks
  mode ⛔ clears it). Body building and "a mark differs" are PURE functions in `lib/nominee-links.ts` (`marksDiffer`, `buildMarksBody`).
  *Save marks* stays disabled until a mark differs. The save uses the screen's existing `useStepUpGate('nominee_change')` and its inline
  footer: `stepUp.guard(() => memberAuth.lifeEventsUpdateNomineeMarks(…))` / `verifyAndRetry` (its own `pending` marks body). After a 200
  it announces `marks.saved` with `AccessibilityInfo.announceForAccessibility` on BOTH platforms (the page-change rule in
  `components/peer-request/announce.tsx`: a live region unmounted by `router.back()` is never read) immediately before the SAME
  `invalidateAndLeave()` (clears the nominees draft, invalidates status + life-events, refetches the links). Marks mode keeps its OWN
  `{ text, seq }` notice, set by `onRemove` / `onKeep` (`form.removed` / `form.kept`), rendered through `AnnouncedText key={seq}`
  OUTSIDE the per-rank blocks (the form's pattern — the extracted control carries ⛔ notice). Refusals reuse `saveRefusalCopyKey` + two new keys (`marks_stale` ⇒
  refetch the links, re-initialise the marks record, show its line; `marks_no_declaration` ⇒ back to the form); `nominee.link_stale` ⇒ the
  same refetch + `save.stale` / `save.stale_not_reloaded` as the form; 409 `locked_claim_filed` ⇒ the locked state. A "Back to the full
  form" control leaves marks mode and remounts the form from `freshForms()`. ⛔ `saveDraft` in marks mode: nothing is typed, the picked
  number is held in memory only (the draft-pins test's 2 `saveDraft` calls stay 2). Loading: copy the screen's `marksKnown` guard and the
  local `retrying` flag ([[project_tanstack_refetch_resets_pending_without_data]]); ⛔ `t` / `lt` in a `useMemo` dependency list
  ([[project_uset_fresh_closure_memo_trap]]). **A swap** is TWO `new` picks in one marks save (⛔ control moves a kept mark — G11 (vi)):
  both resolve to members live on the other rank ⇒ both CARRIED (answers and `asked_at` kept), 2 of the 4 daily lookup units charged.
  The full form is otherwise UNCHANGED. **Rejected:** (b) a separate `nominee-marks.tsx` route: the full form would stay mounted beneath
  it with stale marks (a mark added there, then a full save, ends it `removed_by_declarer`), it would share the module-global pick and the
  session `nominees.tsx` clears on unmount, and it would need a copy of the inline step-up footer. (c) Detecting untouched slots in the
  full form: an empty slot is ambiguous (unchanged, or not yet typed), and a mixed typed / untouched save is the partly-typed save MK10
  excludes. (d) A "move mark" control: a new copy key and tests for a rare action that two picks already do.
- **MK9 — the copy. RECOMMEND:** new keys in the `nominee_link` namespace — flat dotted keys, SINGLE-brace tokens (`{name}`; the
  resolver's `TOKEN = /\{(\w+)\}/g`, and `t()` throws on an unsupplied token) — en + hi; parity; a real-`t()` test
  ([[feedback_stub_must_call_not_transcribe]]); the `-401` absence test (`packages/i18n/tests/nominee-link-copy.test.ts`) then covers
  them, so ⛔ word of a death, and `marks.slot` joins its `PARAMS` map. **FINAL — English AND Hindi approved by BigDev 2026-10-26
  (*"reviewed hi/en, it's fine, record it"*, on the side-by-side sheet, ⛔ edit).** Copy them into `packages/i18n/locales/{en,hi}/nominee_link.json`
  VERBATIM at Task 4; ⛔ rewording without a new approval:

  | Key | English | Hindi |
  |---|---|---|
  | `marks.entry` | Only changing a member mark? Do it here without typing your nominees again. | सिर्फ़ सदस्य-चिह्न बदलना है? अपने नामित व्यक्तियों को दोबारा टाइप किए बिना यहाँ बदलें। |
  | `marks.title` | Member marks | सदस्य-चिह्न |
  | `marks.intro` | Your nominees' names, numbers and shares stay exactly as you saved them. Here you can only mark, change or remove which nominee is a TWT member. | आपके नामित व्यक्तियों के नाम, नंबर और हिस्से ठीक वैसे ही रहेंगे जैसे आपने सहेजे थे। यहाँ आप सिर्फ़ यह चिह्नित कर सकते हैं, बदल सकते हैं या हटा सकते हैं कि कौन-सा नामित व्यक्ति TWT का सदस्य है। |
  | `marks.slot` | {nominee} · {relationship} | {nominee} · {relationship} |
  | `marks.save` | Save marks | चिह्न सहेजें |
  | `marks.saved` | Marks saved. | चिह्न सहेज दिए गए। |
  | `marks.nothing_changed` (the disabled Save's hint) | Change a mark first. | पहले कोई चिह्न बदलें। |
  | `marks.back_to_form` | Change names or numbers instead | इसके बजाय नाम या नंबर बदलें |
  | `save.marks_stale` | Your nominees changed since you opened this screen. Check the marks again, then save. | यह स्क्रीन खोलने के बाद आपके नामित व्यक्ति बदल गए। चिह्न दोबारा जाँचें, फिर सहेजें। |
  | `save.marks_no_declaration` | Save your nominees first, then you can mark a member. | पहले अपने नामित व्यक्तियों को सहेजें, फिर आप किसी सदस्य को चिह्नित कर सकते हैं। |

  `{nominee}` ← `nominees.primary_label` / `nominees.secondary_label`; `{relationship}` ← `nominees.relationship_*`. The Hindi approval
  is already given ⇒ AC7's "Hindi approved before the PR" is MET for these ten keys (any further key needs its own approval).
- **MK10 — scope. RECOMMEND:** marks ONLY. ⛔ change to a name, relationship, mobile, address, split or the number of nominees; ⛔ vacating a
  rank; ⛔ signup; ⛔ prefill (option B); ⛔ backfill; ⛔ migration; ⛔ new disclosure; ⛔ new reader of the mark — incl. ⛔ reader that
  carries or compares version ciphertexts (MK6); ⛔ "move mark" control (MK8 (d)); ⛔ fix for the erasure race (MK2). A MIXED save (one
  rank's details retyped, the other's kept by the server) is ⛔ built and goes to `deferred-work.md` (Task 0.4). Accepted: adding `ranks`
  to the `.strict()` `NomineeLinksView` breaks an installed app build from BEFORE this change (its links read fails, the form shows
  "Could not load") — ⛔ in production ([[project_not_in_production_merge_is_not_golive]]); install the new build for the device run.
- **MK11 — the "head" mismatch (G5). RECOMMEND: copy and check against the PROJECTED version** (what the family sees, and what the
  projection row holds), and ⛔ fix the max-`version_no` readers here. In the one state where they differ (a correction of an OLDER version,
  then an innocence unlock), the links read can hide a live link that sits on the projected version, and `planNomineeLinks` ends it
  `redeclared` (`onHead = false`). This is pre-existing in a full save too, and `deferred-work.md` ALREADY carries it (*"NE9's recorded
  residual has a screen consequence"*; *"A post-filing staff correction of a LINKED rank leaves the link on the corrected-from version
  only"*) ⇒ a dated line on those items (⛔ a new item), plus a test that DOCUMENTS today's behaviour, named as such (Task 3). MK5's
  `onHead` conjunct keeps a marks-only re-pick from looping in that state. The `epics.md` entry's *"the head per rank"* is read as the
  PROJECTED version (narrows the wording, ⛔ contradicts it) — stated in the dated epics note.
- **MK12 — governance. RECOMMEND:** the author-commit records BigDev's *"C: server keeps the details"* as its Occasion and MK1–MK12 as
  decided, and in Consequences the recorded costs: §0 row 4 (a post-death marks-only version is `-239`'s ground, producible without the
  details), MK5's departure from 6.20 T3, MK6's at-rest marker (⛔ reader may compare ciphertexts), MK2's erasure race. ⛔ Panel note (§0
  above). ⛔ Roster change: Row 31 (j)'s privacy line is unaffected (⛔ new data use); the marks mode INHERITS Row 31 (j)'s go-live gate
  (⛔ new leg). The `epics.md` entry gets a dated note that its three open design questions are decided (MK2, MK6, MK8), and its *"⛔ a
  decision-log entry"* is answered by the new id (a dated note, ⛔ rewritten).

## Acceptance Criteria

**AC0 — governance before code.** Task 0.2 recorded (MK1–MK12 answered verbatim; the MK9 English final); the author-commit committed
ALONE (Task 0.3); the records commit after it (Task 0.4). ⛔ `apps/` / `packages/` change before both.

**AC1 — contracts (MK1, MK3).** `NomineeMarksSaveRequest` (MK1's shape, every object `.strict()`, ranks unique) in
`packages/contracts/src/nominee/member-link.ts`; `NomineeLinksView` gains REQUIRED `ranks: { rank, versionNo, relationship }[]`; the
error codes `nominee.marks_stale` and `nominee.marks_no_declaration` join `NOMINEE_LINK_ERROR_CODES` (same file; `marksStale` /
`marksNoDeclaration`). `NomineeStatusResponse` / `NomineeSummaryEntry` / `NomineeDeclareRequest` are ⛔ changed. ⛔ OpenAPI change: the
Life Events paths and nominee-link schemas are ⛔ registered in `emit-openapi.ts` (G6, as 6.36e) — `pnpm contracts:check-openapi-determinism`
green with `openapi/v1.yaml` unchanged. `packages/contracts/tests` cover the new shapes (a rank twice ⇒ refused; a `name` / `relationship` /
`address` key ⇒ refused by `.strict()`). A fixture sweep covers the new REQUIRED `ranks` across contracts, api-client and mobile tests
([[project_contracts_tests_outside_tsc]]). The api-client gains `lifeEventsUpdateNomineeMarks` on `memberAuth` (posts to
`${LIFE_EVENTS_BASE}/nominees/marks`, parses `NomineeStatusResponse`) and the links-read parse (`createMemberNomineeLinksClient().links()`)
accepts `ranks`.

**AC2 — the route and the guards (MK1, MK3, MK4, MK5).** `POST /api/v1/member/life-events/nominees/marks` registered beside the Life
Events save with the same preHandlers, served by a handler that SHARES `declare`'s guard, link and write functions (MK4; a reviewer can
point to ONE `guardDeclare`, ONE metering function, ONE write sequence). Integration legs (live DB, `apps/api/tests/integration/nominee/`):
remove a mark ⇒ the link ended `removed_by_declarer`, new versions, ⛔ re-ask; a swap (two `new` picks, each the member live on the
other rank) ⇒ both carried (answers and `asked_at` kept), old rows `redeclared`, TWO units charged; a `new` mark ⇒ asked, charged ONE
`nominee_link_resolve` unit, ONE `mobileBlindIndexMany` call, and the marked member's `GET …/nominee-links/requests` lists the ask (`-396`
Q2 A); a `keep` beside a removal; a body with the ranks in REVERSED order applies each mark to its own `rank` (TR11); MK5's no-change
save (a `keep` on its own rank; a `new` re-pick of the member live on that rank) ⇒ 200, ⛔ version / event / `member_nominees.*` audit
line; stale `versionNo` ⇒ 409 `marks_stale`, ⛔ charged and ⛔ HMAC'd even with a `new` mark; a concurrent save committed between the
charge tx and the main tx ⇒ 409 `marks_stale` WITH the unit charged (MK3, recorded); a missing or extra rank ⇒ 409 `marks_stale`; ⛔
declaration, or a projection rank with ⛔ version row ⇒ 409 `marks_no_declaration`; a claim-locked declaration ⇒ 409 `locked_claim_filed`
and ⛔ write; a terminal member ⇒ 409; ⛔ elevation ⇒ 403 from the preHandler, before any tx; the 5th `new` in an IST day ⇒ 429, ⛔ KMS;
an `active-in-grace` member's removal and `keep` succeed, while their `new` ⇒ the 422 (the caller gate, unchanged); a stale `keep` ⇒ 409
`link_stale`; a body carrying `name` ⇒ 400; a rollback injected after the link insert leaves ⛔ version and ⛔ link (the 6.36e
injection pattern in `nominee-member-link.spec.ts`).

**AC3 — the copy (MK2).** On a marks-only save: each occupied rank gets ONE new `declared` / `member` version whose three ciphertext
columns are BYTE-IDENTICAL to the projection row's before the save, and whose `relationship` / `split_pct` are equal. The projection rows
are byte-identical before and after (apart from row identity and `created_at`, which the DELETE-then-INSERT resets). `decryptNomineeField`
of the copied version's name and mobile returns the original plaintext (G3 proved, not assumed). The KMS mock's `auditHook` (it also
fires on `encryptDek` / `decryptDek`) records ⛔ encrypt or decrypt call for the details (only the `new` mark's HMAC batch). A projection
`split_pct` that disagrees with `deriveNomineeSplit` ⇒ fail closed, ⛔ write. **Reader legs — in API integration** (they must drive
`POST …/nominees/marks`; a domain test that seeds versions directly cannot tell a marks-only save from any other): the staff warning
`getPeerMeshNomineeChangeBeforeFiling` fires for a marks-only save inside the window; a marks-only `new` link on a version recorded
BEFORE the cut excludes that member from the five (`peerMeshNomineeLinkedMembersAsOf`, the 6.36e exclusion, unchanged), and one recorded
AFTER the cut does ⛔ (V15 holds); the export (`packages/domain/src/data-export/assemble.ts`, through its strict contract) shows the extra
`nomineeHistory[]` row and `marked[]` one row per version joinable by `(rank, versionNo)`; `anonymizeMember` scrubs the copied versions'
ciphertexts like any other (the LIVE-DB `packages/domain/tests/integration/member/rtbf-anonymize.spec.ts` extended by a leg, or the same
assertion in the API leg; the DB-free unit test's 27 tables / 30 statements ⛔ change). `apps/jobs/tests/data-export.test.ts` re-runs
UNCHANGED as regression only.

**AC4 — the history is unchanged (MK6).** On `GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-declaration` (+ `/snapshots`)
in `apps/api/tests/integration/claims/nominee-declaration.spec.ts` — the marks-only save made BEFORE the claim is filed (a filed claim
locks the declaration) — the marks-only version's entry DEEP-EQUALS a full re-save-with-identical-details version's entry apart from
`version_no`, `recorded_at`, `effective_at` and ids, warnings included; neither response, nor the export, carries any ciphertext; ⛔
admin UI change.

**AC5 — events, audit, fences (MK7).** `member.nominees_declared` payload as a full save's (a test compares the keys); audit
`member_nominees.marks_saved` (a literal of `AuthAuditEventType`) with `context: { nominee_count, split, versions }`, plus the link lines;
⛔ `member_nominees.declared` line on a marks-only save; ⛔ number, name or other member's id in any log, audit or alarm. The number fence:
`SINK_ALLOWLIST`'s exact counts updated, any new file in `FILES` AND `NOMINEE_LINK_FILES`, ⛔ fenced identifier (`body`, `marks`,
`memberLink`, …) inside a sink call — the fence green WITHOUT widening its identifier rules.

**AC6 — the phone (MK8, MK9).** The entry card on `nominees.tsx`, shown ONLY when `status.data.nominees.length > 0`, ⛔
`status.isError`, ⛔ locked, `links.data` loaded, `ranks.length === nominees.length`, and (a live mark OR `canNamePeople`) — a render
test: an `active-in-grace` member with ⛔ mark ⇒ ⛔ card. The marks mode inside `nominees.tsx` (⛔ new route; the form unmounted while
it shows); `markControl` extracted into ONE shared component in `components/life-events/` that the form and the marks mode both render
(the existing form render tests, incl. `nominee-form-link-render.test.ts`'s testIDs, stay green UNCHANGED); the `form.will_ask*` line
shown for a `new` mark in marks mode (a test); the pick taken by the screen's `useFocusEffect` into the marks record (⛔ `applyPick`;
the session ⛔ cleared by marks mode); *Save marks* disabled until a mark differs; the step-up guard and retry; the refusal copy (incl.
`marks_stale` ⇒ refetch + re-initialise; `marks_no_declaration` ⇒ the form; `link_stale` ⇒ refetch + `save.stale` /
`save.stale_not_reloaded`); `marks.saved` announced with `AccessibilityInfo.announceForAccessibility` immediately before `invalidateAndLeave()`; marks mode's own
notice (`form.removed` / `form.kept` through `AnnouncedText key={seq}`, outside the blocks — a render-test assertion); "back to the full form" remounts from `freshForms()`;
⛔ `saveDraft` from marks mode (`nominee-screen-draft-pins.test.ts` still pins exactly 2). Copy keys en + hi, single-brace tokens,
parity, the real-`t()` test, the `-401` absence test green over the new keys with `marks.slot` in its `PARAMS`. Pure-function tests in
`lib/nominee-links.ts` (`marksDiffer`, `buildMarksBody`): an untouched record cannot save; a removal sends `memberLink: null` with the
rank's `versionNo`; a swap sends two `new`s; each entry carries its own `rank`. Render test (the `nominee-link-find-render.test.ts` /
`memorial-screens-render.test.ts` pattern): marks mode renders each rank's label + relationship from `ranks` and its current mark; a 409
`marks_stale` refetches. RTL `cleanup` and `lib/mmkv` mocked ([[project_mobile_vitest_and_expo_install_traps]]); any list renders its
empty / error state OUTSIDE the list ([[project_fabric_flatlist_empty_populated_crash]]).

**AC7 — the gates.** `tsc`, ESLint, i18n parity, `pnpm friction:check` green with a `**Story 6.36f disposition (…)**` block in
`friction-budget.md` committed BEFORE the check (any `apps/mobile/**` change triggers the declaration facet; AC-4 reads COMMITTED history —
[[project_friction_budget_baseline_ratchet]]; 6.36e hit this red), `ci:local` on a test database (⛔ `:5432`;
[[project_prepush_hook_inherits_5432]]); known reds named, ⛔ hidden ([[project_known_livedb_test_failures]]). The Hindi approved by
BigDev before the PR. A device run on the Android emulator with a FRESH build (MK10): remove a mark, swap two marks (two picks), add a
mark (the pre-save line shown), TalkBack speaks *"Mark removed."* and *"Marks saved."*; the NOT-covered list stated (iOS / VoiceOver at
least).

## Tasks / Subtasks

- [x] **Task 0 — governance (AC0)**
  - [x] 0.1 Preflight: `git fetch origin`; REBASE onto `origin/main` (the branch is behind; ledgers branch-on-top, `---` separators kept,
        `2026-10-24w` / `2026-10-26d` kept as written unless a collision); re-run G1–G12's greps (`planNomineeLinks`, `guardDeclare`,
        `replaceMemberNominees`, `encContext`, `listNomineeLinksForDeclarer`, `getProjectedNomineeVersions`, `NomineeLinksView`, the fence's
        three lists); re-take the NUMBERS (decision ≥ `-407`; the next free ledger letter of the date of writing); confirm ⛔ migration is
        needed under the answers. **DONE 2026-10-26:** fetched; rebased onto `origin/main` `b3b1e8e9` (one ledger conflict,
        branch-on-top); G1–G12 re-traced there at the validate pass; decision `-407`; ⛔ migration.
  - [x] 0.2 BigDev answers MK1–MK12, recorded VERBATIM here and in the Completion Notes, and finalises MK9's English.
        **Answered 2026-10-26 (BigDev): *"MK1–MK12 all as recommended."*** MK9's English AND Hindi FINAL (BigDev: *"reviewed hi/en,
        it's fine, record it"* — the side-by-side sheet, ⛔ edit); recorded in MK9's table.
  - [x] 0.3 The author-commit: the next free decision id, *"AUTHOR-COMMIT (BigDev) — STORY 6.36f: A MARKS-ONLY NOMINEE SAVE — THE SERVER
        COPIES THE STORED DETAILS …"*, with the Occasion (*"C: server keeps the details"*, chosen over A / B, 6.36e device run), §0, MK1–MK12
        as decided, Not covered (MK10's list; the MK11 residual), Consequences (⛔ migration; ⛔ the Panel; ⛔ roster change, Row 31 (j)
        inherited; the RECORDED COSTS of MK12: §0 row 4, MK5 vs 6.20 T3, MK6's at-rest marker, MK2's erasure race). Committed ALONE as
        `governance: …`; its SHA written after ([[project_decision_log_writes_user_inserted]] — if the write is refused, ask once).
        **DONE 2026-10-26: Decision `2026-10-26-407`, committed ALONE as `a1053c0b`** — it also SUPERSEDES IN PART `-241` D2 (*"⛔
        no dedup"*) for the marks-only save only, when it changes no mark (MK5), with a dated pointer under `-241` in the same commit.
  - [x] 0.4 The records commit (append-only, each dated): `epics.md` `### Story 6.36f` — a dated note (the decision id; the three open
        questions decided by MK2 / MK6 / MK8; *"the head per rank"* read as the projected version, MK11); `deferred-work.md` (under
        `## Deferred from: the 6.36e device run (Android emulator, 2026-10-24)` and the 6.36e sections) — a dated line on item (b)
        (*"homed in 6.36f, ⛔ closed until row `done` on main"*, [[feedback_closure_language_precision]]); dated lines (⛔ new items) on
        *"NE9's recorded residual has a screen consequence"* and *"A post-filing staff correction of a LINKED rank …"* (MK11 — the marks
        path inherits them), *"Audit lines are emitted before the COMMIT …"* (MK7 extends it), *"The OTP retry re-submits the `pending`
        payload"* and *"The find screen is reachable by deep link …"* (marks mode reuses both), *"The `new` ⇒ carry rule changed NE2 by
        dated story notes only"* (MK5 / the swap rely on the any-rank carry — the author-commit records it), *"`openapi/v1.yaml` omits the
        Life Events declare …"* (now also the marks route), *"No test reads the audit sink for a carried `new` mark"* (AC5's audit legs may
        close it — say so only once they do), NE4 (b) *"A post-activation home prompt"* (left as is; 6.36f removes the retype only for
        re-declarations); NEW items: the mixed save (MK10); the erasure race for BOTH save paths (MK2); the sprint row's note.
        **DONE 2026-10-26** (the commit after `a1053c0b`): the epics dated note; ten dated lines in `deferred-work.md` and its new
        section `## Story 6.36f — a marks-only nominee save (2026-10-26)` (two items); the sprint row note + ledger `2026-10-26e`.
- [x] **Task 1 — contracts + client (AC1)** — `NomineeMarksSaveRequest`, `NomineeLinksView.ranks` (`{ rank, versionNo, relationship }`),
      the two codes in `NOMINEE_LINK_ERROR_CODES`, `lifeEventsUpdateNomineeMarks`, the links-read parse, contracts tests + the fixture
      sweep; `pnpm contracts:check-openapi-determinism` green with ⛔ OpenAPI change.
- [x] **Task 2 — domain (AC2, AC3)**
  - [x] 2.1 The copy source: REUSE `getMemberNominees` (`nominee/declaration-read.ts`), with a `FOR UPDATE` variant or option for the
        main tx (MK2); ⛔ new projection read. Inside the caller's tx, ⛔ KMS.
  - [x] 2.2 EXTEND `getProjectedNomineeVersions` (`declaration-history.ts`) to return `versionNo` beside `versionId` (its 2 production calls,
        both in `claim-contact-persist.ts`, and 4 test callers read only `.versionId` — they keep compiling and passing); add `relationship` for the links read (or join
        it from the projection). The links read's `ranks` is read by the links handler BEFORE `listNomineeLinksForDeclarer`, in that
        handler's same `inScope` READ COMMITTED tx (MK3's read order; a read outside it loses the RLS scope), with a leg that goes RED
        when the order is reversed.
  - [x] 2.3 A pure `isUnchangedMarksPlan(live, plan)` (MK5's predicate, incl. the `onHead` conjunct) beside `planNomineeLinks`, with unit
        tests in `member-links.test.ts` (a `keep` on its own rank ⇒ unchanged; a same-rank `new` re-pick ⇒ unchanged; a removal ⇒
        changed; a swap ⇒ changed; a carry of an `onHead = false` link ⇒ changed). `planNomineeLinks` itself ⛔ changed.
- [x] **Task 3 — API (AC2, AC3, AC4, AC5)** — extract `declare`'s shared parts (guards + basis, the metering tx, the HMAC batch, the
      main-tx link pipeline, the write sequence) INTO `nominee.handlers.ts` so both handlers call them, keyed by rank (MK4, TR11); the
      marks handler (the MK2 read order, the split assertion, MK5) + route; the audit literal; the links read handler's `ranks`; the
      number fence's three lists; the AC2 legs; the AC3 reader legs (staff warning, exclusion before / after the cut, export, rtbf scrub
      of copies) driven through the route; the AC4 timeline leg; the AC5 audit / event legs; the MK11 test NAMED as documenting today's
      behaviour (a correction of an older version + an innocence unlock ⇒ the links read hides the live link and a full save ends it
      `redeclared`). Re-run `nominee-member-link.spec.ts`, `nominee-declare.spec.ts`, `life-events.spec.ts` UNCHANGED as the
      extraction's regression proof; `apps/jobs/tests/data-export.test.ts` UNCHANGED.
- [x] **Task 4 — mobile (AC6)** — the shared mark control (props per MK8, the `form.will_ask*` line); the pure `marksDiffer` /
      `buildMarksBody` in `lib/nominee-links.ts`; the entry card + marks mode in `nominees.tsx` (the pick into the marks record, the
      step-up save, the refusals, the announce, `invalidateAndLeave`, back to the form); the client call; the copy (en + hi draft,
      single-brace tokens, `PARAMS`; BigDev approves the Hindi); the tests.
- [x] **Task 5 — gates + records (AC7)** — the `friction-budget.md` disposition block COMMITTED, then `pnpm friction:check`; `ci:local`;
      the device run (fresh build; TalkBack lines); the Debug Log (each new guard's mutation RED); the ledger line; File List.
      *(2026-10-26 — disposition `efe6246d` then friction:check green; ci:local 35 / 36 + the two integration reds run down (Completion
      Notes); Debug Log, File List, ledger `2026-10-26g`. ⚠ The DEVICE RUN is ⛔ done — OWED: BigDev chose "Review now, device later";
      a go-live item, as 6.36e's was. ⛔ iOS / VoiceOver either.)*

### Review Findings

Full code review, 2026-10-26, of `b3b1e8e9..bf8312ce` (37 files, +3,397 / -348). The creation pin
`0e9b261d` also includes inherited main changes; the reviewed base is the story's post-rebase parent.
Blind Hunter, Edge Case Hunter and Acceptance Auditor completed in parallel. The blind layer read only an
apps/packages diff artifact; the other layers could trace project source. No review layer failed.
Result: **0 decision-needed, 3 patch, 3 defer, 3 dismissed**. No application code changed by this review.

- [x] [Review][Patch] **R1 / P2 — prevent switching modes while a marks save is pending**
  [apps/mobile/app/(life-events)/nominees.tsx:494]. Source: blind + edge; AC6 / MK8. The back-to-form
  button ignores `busy`. With a delayed save, the member can return to the form and type a nominee;
  the old marks request then succeeds and `marksSaved()` calls `invalidateAndLeave()`, clearing that
  newly written draft and navigating away. Disable the mode switch during the request and its completion
  work, or otherwise prevent an abandoned operation from clearing/navigating the current form. Add a
  render regression with a deferred save promise and attempted mode switch. A temporary executed harness
  reproduces typed form input being saved as a draft, then that draft being cleared and navigation firing
  when the older marks request resolves; see verification below.
- [x] [Review][Patch] **R2 / P2 — prove the post-row-lock terminal re-read with two live connections**
  [apps/api/src/modules/nominee/nominee.handlers.ts:450]. Source: auditor; MK2, Testing standards,
  checklist families 1–2. The terminal test in `nominee-marks-save.spec.ts` transitions the member BEFORE
  the request, so `guardDeclare` refuses before `checkMarksBasis` is reached. The domain `pg_locks` leg
  establishes a relation lock mode, not the required waiting/commit interleaving. Hold the projection row
  on one connection, let the marks route pass its first guard and wait for that row, then commit a
  terminal lifecycle transition from the other connection. Assert the marks request refuses without
  copying ciphertext, versions or links; removing the terminal re-read must make the test fail. This
  proves the implemented guard; it does not request a fix to MK2's separately accepted erasure race.
- [x] [Review][Patch] **R3 / P2 — add actor, tenant and keep-link ownership denials for the new route**
  [apps/api/tests/integration/nominee/nominee-marks-save.spec.ts:458]. Source: auditor; checklist families
  3 and 12. The new route's suite covers valid member tokens and missing elevation, but no another-declarer
  or cross-Pariwar real `keep` link, tampered bearer, or wrong/non-member principal. The shared guard and
  declarer-scoped live-link reads appear correct; no unauthorized write is demonstrated. Add runtime
  denial legs through `/nominees/marks`, asserting the other declarer's link and both declarations remain
  unchanged. Existing full-save/answer tests are not per-new-route proof.
- [x] [Review][Defer] **R4 / P2 — OTP verification saves the earlier pending marks instead of later visible edits**
  [apps/mobile/app/(life-events)/nominees.tsx:306] — deferred, pre-existing. Source: blind + edge.
  Reproduced: request step-up for a removal, pick a replacement while the OTP is visible, then verify;
  the UI shows the replacement but the API receives the original removal and announces success. The
  existing deferred item **“The OTP retry re-submits the `pending` payload”** already has a 6.36f Task 0.4
  annotation explicitly extending it to marks mode. Preserve that recorded scope decision; this review
  confirms the behavior rather than reopening it as a new patch.
- [x] [Review][Defer] **R5 / P2 — the shared OTP prompt has no iOS announcement**
  [apps/mobile/app/(life-events)/nominees.tsx:362] — deferred, pre-existing. Source: auditor; checklist
  family 13(d), REAL GAP. The prompt uses only `accessibilityLiveRegion`, with no iOS announcement or
  focus movement. The same footer exists at `b3b1e8e9`; the new mode inherits it. The current render
  suite always mocks `needsOtp: false` and cannot cover this phase. Use the existing announcement
  pattern and test a real OTP-visible state when this shared accessibility debt is addressed. This is
  source-level evidence; no VoiceOver/device observation is claimed.
- [x] [Review][Defer] **R6 / P2 — audit can describe a save whose COMMIT subsequently fails**
  [apps/api/src/modules/nominee/nominee.handlers.ts:615] — deferred, pre-existing. Source: edge.
  `emitAudit()` precedes `closeScopeTx()`; the deferred-trigger failure test asserts rolled-back rows
  but not audit absence. The existing deferred item **“Audit lines are emitted before the COMMIT that
  can still fail”** explicitly covers `marks_saved` through its 6.36f Task 0.4 annotation and MK7.
  Preserve that deferral; shared extraction does not repair the inherited ordering.

#### Review verification and triage

- **123 existing tests passed:** mobile marks-mode/form rendering, marks logic, hooks and draft pins
  (75); contracts nominee-member-link (15); domain link planning (29); API read order and number fence (4).
- **Temporary reproduction harness:** `/private/tmp/twt-6-36f-review-tests/marks-mode-review.test.ts`,
  adapted from the existing render harness, with a stateful OTP mock and a deferred API promise:
  **2 checks passed**. They verify the erroneous behavior, not desired fixed behavior. Run from `apps/mobile`:
  `pnpm exec vitest run --config /private/tmp/twt-6-36f-review-tests/vitest.config.mts -t 'review repro'`.
  Native layout, TalkBack/VoiceOver and live DB races were not rerun in this review. Prior CI results
  remain the development session's attestation. AC7's device run stays owed under “Review now, device later”.
- **Dismissed (3):** ordinary background-refresh stale-basis overwrite (global query defaults disable
  focus/reconnect refetch; no independent reachable trigger established); missing-declaration re-entry
  loop (no supported transition from a valid loaded basis established); hidden-mark removal after an
  older-version correction (already expressly covered by MK11 and its deferred items, with no production
  innocence-unlock caller). These are not claimed fixed. The broader erasure race remains recorded under MK2.
- **Panel gate:** every new action item is an engineering correction or test obligation. No change to
  disclosure, entitlement or legal basis is required; no Panel question is introduced.

#### Load-bearing invariant verdicts

| Touched family | Verdict and evidence |
|---|---|
| 1. State-machine totality and guards | Existing identity event and ordinary guards covered by the shared write path and AC2 test; **REAL GAP R2** for the new post-wait terminal check. |
| 2. Concurrency and redelivery | Charge/main-tx interleaving covered by AC2/MK3 test; **REAL GAP R2** for the projection-lock wait. Lost-response retry behavior is explicitly recorded in MK5. |
| 3. Tenant and actor boundaries | **REAL GAP R3**: per-new-route runtime negative tests missing. |
| 4. Event completeness | Covered by AC5 event-shape test and the single shared `writeDeclaration`. |
| 5. DB backstops | Covered by construction: no new persisted shape; existing scoped version/link constraints reused. |
| 6. Projection and snapshots | Covered by AC3 COPY / READERS / EXPORT-ERASURE tests and AC4 timeline/snapshot deep equality. |
| 8. Audit and attribution | Successful save/link attribution covered by AC2/AC5; inherited pre-COMMIT timing remains **R6**, explicitly deferred. |
| 9. Deliberate bypasses | Covered by construction: retained DELIBERATE rationale for request-time elevation and eligibility-free carries. |
| 10. Closure honesty | Covered by construction: CI reds, missing race leg and outstanding device work disclosed; none backfilled by this review. |
| 12. Cross-member ownership | Declarer comes from session and links are declarer-scoped by construction; runtime denial proof remains **R3**. |
| 13. Accessibility | Remove/pick/save announcements and handlers covered by render tests; shared iOS OTP phase is **REAL GAP R5**, pre-existing and deferred. |

#### Applied patches and verification — completed 2026-10-27

BigDev selected **1, apply every patch**, then **continue** after the interruption. R1–R3 are resolved;
R4–R6 remain deferred as originally triaged. The findings and initial checklist verdicts above describe
the pre-patch review; this dated record supplies their subsequent disposition.

- **R1 fixed:** the marks-mode back-to-form button now has `disabled={busy}` and a matching
  accessibility state. `busy` spans the API save and the awaited success/refusal refetch. Two render
  regressions prove the form cannot be reopened during either the request or success refetch, no new
  form draft is written, and the control becomes usable again after refusal. Removing the disabled
  prop made both R1 regressions fail; restored before the final passing run.
- **R2 covered by a live race test:** one scoped connection locks the member's actual projection row;
  the request runs concurrently. The test queries `pg_stat_activity` / `pg_blocking_pids` and requires
  that this test's own backend blocks the request's `member_nominees ... FOR UPDATE`, rather than
  inferring a wait from elapsed time. Only then does the holder append the real
  `member.rtbf_anonymized` lifecycle event and commit. The request returns 409 `nominee.member_terminal`
  with unchanged declaration versions, projection, links and declaration events, no nominee audit, and
  no KMS work. This fixture isolates terminal-state visibility; it does not perform or attest a full
  erasure. Removing the post-row-lock terminal re-read changed the response to 200 and made this test
  fail. The original guard was restored byte-for-byte; no API production code changed.
- **R3 covered by runtime denials:** the new route refuses another declarer's real live keep-link both
  within the same Pariwar and across Pariwars, preserving all three declarations and link sets. A
  separate leg rejects missing/tampered tokens, signup-continuation/Pariwar-select/system token kinds,
  a nonexistent member principal, and a real elevated member paired with the wrong Pariwar. The
  declaration, projection, links, declaration events, nominee audit and KMS assertions remain unchanged.
- **Final checks, run 2026-10-26:** 77 focused mobile tests and all 23 marks-save live API tests passed
  against the existing `twt_6_36f` database on `:5433`. Both touched packages' TypeScript checks and
  targeted ESLint checks passed; `git diff --check` passed. The broader `ci:local` was not rerun: its
  earlier 35/36 record and known integration failures remain as recorded, not superseded by these
  targeted checks. No device/TalkBack/VoiceOver run was performed.
- **Fix-diff review:** Blind Hunter, Edge Case Hunter and Acceptance Auditor reviewed the three-file
  code/test patch in parallel after the mutation guards were restored. All completed with no actionable
  findings. The blind layer's possible double-close concern was dismissed after checking
  `closeScopeTx`'s explicit `scopeTx.closed` idempotence guard.
- **Updated checklist verdicts:** families 1–2 are now **covered-by-test** by the R2 live lock-wait
  test; families 3 and 12 are now **covered-by-test** by the R3 denial legs. R5 remains a family 13(d)
  REAL GAP with its P2 severity and pre-existing deferral preserved. R6's inherited audit timing and
  MK2's separately recorded scrub/save race remain unaddressed. Nothing is backfilled or marked closed
  by the absence of a device test.
- **Records:** story and sprint row move `review` → `in-progress` under the review workflow's
  unresolved-work rule. This records remaining AC7/deferral work, not an unfixed R1–R3 patch. No other
  sprint row changes. Changes remain uncommitted in the story worktree.

## Dev Notes

### Current state of the code this story changes (traced at `0e9b261d`)

- **`nominee.handlers.ts` `declare(route)`** — G1. **Changes:** its guard / meter / HMAC / link / write steps become shared functions
  (in the same file) that take `{ rank, link }` pairs keyed by rank and the details as INPUT (ciphertext rows); the full save encrypts from
  the body as today, the marks save copies them from the projection. **Preserve:** the exact order (G1 / 6.36e AC3's dated note), the
  uncharged early refusals, the audit-before-COMMIT pattern, the signup route's `allowLink: false` behaviour, every response and error
  body, `.declared`'s audit context.
- **`life-events/routes.ts`** — gains the `/nominees/marks` route. **Preserve:** the existing route's preHandlers and schemas.
- **`nominee-links` module** — the links read gains `ranks`. **Preserve:** `links[]` exactly (a live link on the max-`version_no` head, the
  name only when `confirmed`, decrypted after commit).
- **`declaration-history.ts` `getProjectedNomineeVersions`** — gains `versionNo`. **Preserve:** its callers' behaviour (2 production
  calls in `claim-contact-persist.ts`; 4 test callers).
- **`app/(life-events)/nominees.tsx` + `NomineeForm.tsx`** — the entry card and marks mode; `markControl` moves to a shared component.
  **Preserve:** the form's validation, the V3 question, the draft (`redactForDraft`, exactly 2 `saveDraft` calls), the pick handoff and
  the session clear on unmount, the 48 dp controls and their accessibility announcements (*"Mark removed."*, *"Is this still the member
  you marked?"*) verified on 6.36e's device run, the testIDs.

### Shipped substrate this story READS — rebuild none of it

`planNomineeLinks` / `applyNomineeLinkPlan` / `lockLiveNomineeLinks` / `resolveNomineeLinkTargets` / `chargeNomineeLinkResolve`
(`nominee/member-links.ts`); `planDeclarationVersions` / `getNomineeVersionHeads` / `projectedVersionOfRank` / `getProjectedNomineeVersions`
(`nominee/declaration-history.ts`); `getMemberNominees` (`nominee/declaration-read.ts`); `deriveNomineeSplit`;
`replaceMemberNominees` / `appendMemberDeclarationVersions`; `lockNomineeDeclarationForEdit` (`claim/nominee-lock.ts`); the find screen and the
contact matching (6.36b / 6.36e); `useStepUpGate`.

### Traps

- **TR1 — the projection is the copy source, ⛔ max(`version_no`).** G5 / MK11. Copy from `member_nominees` (= the projected version) and
  check the basis against the projected version's `versionNo` — `projectedVersionOfRank` returns a `versionId`, so read `versionNo` from
  the extended `getProjectedNomineeVersions` (Task 2.2).
- **TR2 — the copy depends on G3.** If anyone adds a `rowKey` to the nominee encryption context, every copied ciphertext stops decrypting.
  AC3's decrypt leg is the tripwire; ⛔ delete it as "redundant".
- **TR3 — KMS stays out of the scope tx.** A marks-only save makes ⛔ encrypt call; the only KMS work is the `new` marks' ONE HMAC batch,
  before `openScopeTx` ([[project_kms_audit_per_hmac_global_lock]]).
- **TR4 — ⛔ add to `NomineeStatusResponse`.** The claim flow reads it (G6, 6.36e TR15); `ranks` lives on the links read.
- **TR5 — a refused request costs ⛔ KMS call and ⛔ meter unit.** The MK3 basis check runs inside the metering tx BEFORE the charge (6.36e
  TR14's discipline).
- **TR6 — typed routes in a worktree.** ⛔ `.expo/types` ⇒ `tsc` does ⛔ check `Href` ([[project_mobile_typed_routes_worktree]]). Marks
  mode adds ⛔ route; grep any `router.push` target the change touches by hand.
- **TR7 — extraction is the risk.** MK4 refactors a handler that four review rounds hardened. Move code; ⛔ "improve" it in the same commit.
  The existing nominee / link / life-events specs passing UNCHANGED is the proof. Any test edit there is a red flag to explain.
- **TR8 — markdown in JSDoc** ([[project_markdown_emphasis_closes_jsdoc]]) and **the import guard**: `nominee/` ⛔ imports `claim/` or the
  member barrel ([[project_type_only_import_cycle_trap]], 6.36e TR13).
- **TR9 — the death-word guard.** The `-401` absence test runs over the whole `nominee_link` namespace; ⛔ "asked about", ⛔ any death word
  in the new keys, en or hi.
- **TR10 — strict parses.** The api-client strict-parses the links read; `ranks` lands in the contract, the client and every fixture in the
  SAME change (TR4 of 6.36e). An installed pre-change build fails the links read (MK10) — use a fresh build on the device.
- **TR11 — rank by field, ⛔ by index.** `declare` derives each entry's rank from its array index; the marks body carries an explicit
  `rank`. Feeding the shared pipeline by index puts a `[{rank:2},{rank:1}]` body's marks on the wrong nominees. Sort by `rank`; the
  AC2 reversed-body leg is the tripwire.
- **TR12 — the number fence counts calls.** `SINK_ALLOWLIST` holds EXACT counts; a second handler's `emitAuthAudit` changes it, and the
  identifier rules flag `body` / `marks` / `memberLink` inside a sink call (G10). Update the counts; ⛔ widen the rules.
- **TR13 — the friction gate reads COMMITTED history.** Commit the `friction-budget.md` disposition before `pnpm friction:check`.

### Libraries and versions

⛔ New dependency. Everything is built from what 6.36e shipped: Fastify routes and Zod contracts (`@twt/contracts`), drizzle + raw `sql`
in `@twt/domain`, Expo Router / Tamagui / i18next on the phone, vitest + RTL in tests, all at the versions pinned in the lockfile. ⛔ Web
research was needed: no library API is touched beyond the patterns the cited files already use.

### Testing standards

Live-DB integration on a TEST database (`:5433` / `:5434`, ⛔ `:5432`); separate transactions where `now()` ordering matters
([[project_db_clock_ordering_tests_tie]]); each new guard leg a mutation that goes RED when its line is removed (recorded in the Debug Log);
contracts vitest; mobile vitest with RTL `cleanup`; `ci:local` before push ([[project_ci_local_double_run_pollution]]).

### Project Structure Notes

New: ONE shared mark-control component in `apps/mobile/components/life-events/`, new tests. Updated: `nominee.handlers.ts` (the
extracted helpers stay in it — ⛔ new fenced file), `life-events/routes.ts`, `nominee-links/handlers.ts`,
`packages/domain/src/nominee/{member-links,declaration-history,declaration-read}.ts`, `packages/contracts/src/nominee/member-link.ts`,
`packages/api-client/src/index.ts`, `apps/api/src/audit/audit-sink.ts`, `packages/i18n/locales/{en,hi}/nominee_link.json`,
`packages/i18n/tests/nominee-link-copy.test.ts` (`PARAMS`), `apps/mobile/lib/nominee-links.ts`, `nominees.tsx`, `NomineeForm.tsx`, the
number-fence test, `friction-budget.md`. ⛔ New route file; ⛔ OpenAPI change; ⛔ migration; ⛔ `packages/domain/migrations/`.

### References

- 6.36e story (NE1–NE14, G1–G14, the device run's second pass, TR1–TR15): `_bmad-output/implementation-artifacts/6-36e-nominee-member-link-at-declaration.md`
- 6.36d story (the exclusion, the as-of-cut walk): `_bmad-output/implementation-artifacts/6-36d-exclude-nominees-from-the-five.md`
- 3.9 story (the Life Events route rule): `_bmad-output/implementation-artifacts/3-9-life-events-panel.md`
- `epics.md` `### Story 6.36f`; `deferred-work.md` (the 6.36e second-pass item (b))
- Decisions: `-234` V / X / Consequence 2(a), `-384` Q2 A, `-396` Q1 A / Q2 A / Not covered, `-397` §0 / §2 / NE2 / NE5 / NE7 / NE8 /
  NE11 / NE14, `-399` call 3, `-401`, `-235` Y / `-239` (a) / (b), `-366` decision 6 — `.decision-log.md`
- `deferred-work.md` items named in Task 0.4; `friction-budget.md` (repo root); `apps/mobile/app/(life-events)/nominees.tsx`;
  `apps/api/tests/unit/known-people-number-fence.test.ts`; `packages/i18n/tests/nominee-link-copy.test.ts`
- Routing template (§0): `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`
- Architecture §2.7 (Tier-1 envelope ciphertext); PRD FR-4 / FR-5 (nominees)

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 6.36f`, 2026-10-26, in the story's own worktree.

### Debug Log References

- **Test database.** `:5432` ⛔ touched. A dedicated `twt_6_36f` was created on the `twt-test-pg` container (`:5433`) and migrated
  (185 migrations — `0000`…`0185`; ⛔ new migration). Every live-DB run below is against it.
- **Mutation checks (each guard removed ⇒ its leg RED, then restored byte-for-byte):** API (`nominee-marks-save.spec.ts`, 20 legs) —
  M1 the `versionNo` comparison (2 RED); M2 the basis check in the METERING tx (1 RED — the stale save was charged); M3 the MK5
  short-circuit (1 RED); M4 keying the marks by array index instead of `rank` (1 RED — the reversed body, TR11); M5 the split
  assertion (1 RED); M6 `marks_saved` → `declared` (1 RED); M7 the "projection rank with ⛔ version row" refusal (2 RED); M8 the
  rank-set equality (1 RED). The links read's order reversed ⇒ the source pin RED (2). Domain — `FOR UPDATE` removed from
  `getMemberNominees` ⇒ the `pg_locks` leg RED. Mobile (`nominee-marks-mode-render`, 9 legs) — P1 the marks-mode pick branch, P2 the
  *Marks saved.* announce, P3 *Save marks* enabled while nothing differs (2 RED), P4 the restart after `marks_stale`, P5 the card for a
  member who may ⛔ find and has ⛔ mark — each RED.
- ⚠ **One guard with ⛔ RED leg:** the lifecycle-state RE-READ inside `checkMarksBasis` (MK2 — an erasure that does ⛔ take D3 may commit
  while the save waits on the projection's row lock). `guardDeclare` refuses a terminal member first, so only a two-connection race
  reaches it; ⛔ written. Recorded, ⛔ claimed tested.
- **A fixture flake found and fixed (⛔ a code defect):** the MK11 leg's hand-seeded correction called `clock_timestamp()` twice, so
  `effective_at` could land microseconds after `recorded_at` and trip `member_nominee_versions_effective_not_after_recorded_check`
  (failed once in a combined run, passed 3 + 3 + 5 times alone). Fixed with one instant (`(SELECT clock_timestamp() AS at) c`).
- **The 6.36e spec (`nominee-member-link.spec.ts`) was edited — TR7's red flag, explained:** its 5 links-read assertions gained the
  new REQUIRED `ranks` (AC1's fixture sweep — the strict `NomineeLinksView`); ⛔ assertion about the declare changed; 21 / 21.
  `nominee-declare.spec.ts`, `nominee-lock.spec.ts`, `life-events.spec.ts` and the number fence ran UNCHANGED (23 / 23; 2 / 2).
- **The number fence (TR12):** `SINK_ALLOWLIST`'s `nominee.handlers.ts:emitAuthAudit` stays **2** — the shared write sequence has ONE
  save-line call (`.declared` or `.marks_saved`, by parameter) and the per-link loop; only a comment was added. ⛔ Identifier rule
  widened; ⛔ new fenced file (the extracted helpers stay in `nominee.handlers.ts`).

### Completion Notes List

- 2026-10-24 — Story created by `bmad-create-story 6.36f` at `0e9b261d` (two read-only research passes + hand spot-checks). Ultimate context
  engine analysis completed — comprehensive developer guide created. MK1–MK12 PROPOSED; ⛔ Panel question.
- 2026-10-26 — Validated by `bmad-create-story validate 6.36f` against `origin/main` `b3b1e8e9` (four read-only verifiers: code claims,
  mechanism, governance, premise / mobile / footguns; load-bearing claims re-checked by hand). BigDev: *"all"*. Recommendations taken on
  the four calls: §0 row 4 stays MATCH with its cost recorded (a post-death marks-only version is `-239`'s ground — ⛔ "payout
  unaffected"); MK8 is a marks-only MODE inside `nominees.tsx` (⛔ separate route); a swap is two `new` picks (⛔ move control); the
  erasure race is recorded for both save paths (⛔ fixed here). Also: NUMBERS re-taken (≥ `-407`, `0185`, `2026-10-26c`); the projected
  `versionNo` source; `ranks` carries `relationship` and is read atomically with `links[]`; rank keyed by field; MK5's `onHead`
  conjunct; the post-charge race; the split derived and asserted; single-brace copy tokens + `PARAMS`; the number fence's three lists;
  the friction-budget declaration; the `form.will_ask*` line; reader legs moved to API integration; AC4's endpoint and deep-equal; the
  ratified quotes made verbatim (`-234` V / X, `-239`, `-396` Not covered in full) and `-397` §0 / §2 cited for the staff warning; the
  deferred-work items named. Still ⛔ code; ⛔ decision id taken.
- 2026-10-26 — Task 0.2 DONE: BigDev: *"MK1–MK12 all as recommended."*; MK9's English and Hindi approved as drafted (*"reviewed hi/en,
  it's fine, record it"*), recorded in MK9's table. ⛔ Author-commit yet (Task 0.3 next).
- 2026-10-26 — Tasks 0.3 + 0.4 DONE: Decision `2026-10-26-407` committed ALONE as `a1053c0b` (MK1–MK12 + MK9; supersedes in part `-241`
  D2 for the marks-only save only); the records commit follows it (epics dated note; ten dated lines + a new two-item section in
  `deferred-work.md` — the `-407` text does ⛔ restate the any-rank carry, so that item's proposed author-commit stays open; the sprint
  row note; ledger `2026-10-26e`). AC0 met.
- 2026-10-26 — **DEV (`bmad-dev-story 6.36f`), Tasks 1–5.** Row `ready-for-dev` → `in-progress` (Task 1's commit). What was BUILT:
  - **Task 1 (`6cc8e8c9`) — contracts + client.** `NomineeMarksSaveRequest` (`{ marks: { rank, versionNo, memberLink | null }[] }`, 1–2,
    ranks unique by `superRefine`, every object `.strict()` — a name / relationship / mobile / address / split key is refused);
    `NomineeLinksView.ranks` REQUIRED (`{ rank, versionNo, relationship }`); `marksStale` / `marksNoDeclaration` in
    `NOMINEE_LINK_ERROR_CODES`; `memberAuth.lifeEventsUpdateNomineeMarks`. ⚠ Deviation, recorded: the relationship enum MOVED to a new
    `contracts/src/nominee/relationship.ts` (re-exported unchanged by `declaration.ts`) — `member-link.ts` needs it and
    `declaration.ts` already imports `member-link.ts`, so importing back would be a runtime init cycle. ⛔ OpenAPI change
    (`contracts:check-openapi-determinism` green, `openapi/v1.yaml` untouched).
  - **Task 2 (`ed40951f`) — domain.** `getMemberNominees(…, { forUpdate })`; `getProjectedNomineeVersions` returns `versionNo` +
    `relationship` (its callers read `.versionId` only — unchanged); the pure `isUnchangedMarksPlan` (MK5, incl. the `onHead`
    conjunct) with nine unit legs. `planNomineeLinks` ⛔ changed.
  - **Task 3 (`2808b69f`) — API.** `declare`'s steps MOVED (⛔ rewritten — TR7) into shared functions in `nominee.handlers.ts`, keyed by
    rank: `lookUpElevation`, `guardDeclare`, `normaliseNewMarks`, `meterNewMarks` (its `beforeCharge` hook carries the basis check),
    `indexNewMarks`, `planDeclarationLinks`, `writeDeclaration` (returns the status + an `emitAudit` the caller runs AFTER `ok = true`).
    The new `marks` handler: sort by rank → normalise → elevation → metering tx (`guardDeclare` + `checkMarksBasis` before the charge)
    → ONE HMAC batch → main tx (`guardDeclare`, `checkMarksBasis` — projection `FOR UPDATE`, projected `versionNo`, terminal re-read;
    the link plan; MK5 ⇒ 200 with ⛔ write; the split derived and ASSERTED; the stored ciphertext copied byte for byte) → audit
    `member_nominees.marks_saved`. Route `POST /api/v1/member/life-events/nominees/marks` (the Life Events save's preHandlers). The
    links read returns `ranks` read FIRST in its one transaction (a source-order pin). Tests: `nominee-marks-save.spec.ts` (20 legs —
    AC2's list, AC3's copy + readers through the route, AC5's event / audit, MK11 named as DOCUMENTING today's behaviour), the 6.36f AC4
    leg in `claims/nominee-declaration.spec.ts` (the marks-only version deep-equals a full re-save-with-identical-details version on the
    timeline AND the snapshots, warnings included; ⛔ ciphertext on either response), `nominee-links-read-order.test.ts`.
  - **Task 4 (`dad02d44`) — mobile.** `NomineeMarkControl.tsx` (the control EXTRACTED; the form's render tests and draft pins pass
    UNCHANGED); `lib/nominee-links.ts` + `initialMarks` / `marksDiffer` / `buildMarksBody` / `applyMarksPick` / `marksEntryVisible` and
    the two refusal keys; `nominees.tsx` — the entry card, marks mode (the form unmounted; the pick through the SAME focus effect, read
    via a ref so its pinned dependency list is unchanged; *Save marks* disabled until a mark differs, its hint shown; the step-up guard
    + the inline footer; the refusals; *Marks saved.* announced before `invalidateAndLeave()`; "Change names or numbers instead"
    remounts the form from `freshForms()`; ⛔ `saveDraft` — the pins still count 2). The ten MK9 keys copied into en + hi
    PROGRAMMATICALLY from the approved table (⛔ retyped), pinned verbatim by a test; `marks.slot` in `PARAMS`; the `-401` guard green.
  - **Task 5 — gates.** The friction disposition committed (`efe6246d`) BEFORE `pnpm friction:check` (green — "declaration affirmed with
    no new row"). **`ci:local`** on the committed tree (`efe6246d`) against `twt_6_36f` (`:5433`; ⛔ `:5432`): **35 / 36 jobs green**
    (every static job incl. lint, typecheck, build, unit, i18n-parity, friction-budget, contracts-determinism, pii-scrape). The 36th,
    `integration-tests`: domain 423 files / 6,444 passed, channels 457, events 36, niyamavali-engine 144, validity-service 284; jobs
    78 / 80 files (1,780 passed, 1 failed) — two reds, NEITHER a 6.36f file, each run down: (1) `restoration-discipline-production-path-live`
    refuses any database not named `twt_dev` (the 10.23 gate — the same red 6.36e met); with its documented
    `TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS=1` on this session's disposable database: 3 / 3. (2) `audit/integrity-check` "head-truncation"
    DELETEs the database's GENESIS audit row; in the fresh `twt_6_36f` that row is a `claim.contact_recorded` line written by the
    domain `claim-contact` spec this session ran FIRST (Task 2), and a `consent_records` row references it (FK violation). On the
    long-lived `twt_dev` the genesis has ⛔ such reference. Proof of innocence: a SECOND fresh database (`twt_6_36f_probe`, created,
    migrated, the spec run alone — 11 / 11 — then DROPPED). A pre-existing fresh-database ordering hazard in that test, ⛔ fixed here.
    turbo stops at the first failed package, so `@twt/api` and `@twt/queue` were run on their own afterwards: api 192 files / 2,310
    passed, queue 4 / 4.
  - **NOT done (stated, ⛔ hidden):** the AC7 DEVICE RUN (a fresh Android build; remove / swap / add a mark; TalkBack *"Mark removed."* and
    *"Marks saved."*) — ⛔ run in this session; iOS / VoiceOver ⛔ covered. `deferred-work.md` *"No test reads the audit sink for a
    carried `new` mark"* is ⛔ closed (the swap leg asserts the carries, the counter and the HMAC line, ⛔ the `carried` audit lines).
    The erasure race (MK2) stays recorded, ⛔ fixed (MK10).
- **AC7 DEVICE RUN — DONE 2026-10-27 (`bmad-dev-story 6.36f`; BigDev: *"Run device now"*).** Android emulator `Pixel_9` (Android 15),
  the committed tip `b2fdb223`. A FRESH dev-client build from this worktree (`expo run:android`, Gradle 6 m 38 s; the APK installed
  over the old one, then `pm clear`), Metro from this worktree, the real API (`apps/api`, `KMS_TEST_MODE=fake`, the integration
  harness's pepper) against a DISPOSABLE `twt_6_36f_device` (`:5433`, created + migrated `0000`…`0185`). Seed (a temporary spec using
  the marks-save spec's own helpers, run once, DELETED, ⛔ committed): the default Pariwar, a declarer walked to `active` with a login
  identity (Rakesh Kumar, `9811100001`), three active members (Meena `9876500001`, Kiran `9876500002`, Sunil `9876500003`), and a
  FULL save of two nominees with rank 1 marked (Meena, typed) — one `nominee_link_resolve` unit. Driven by `uiautomator` dumps +
  `input` events + screenshots, plus TalkBack for the speech; ⛔ by a person. **Worked, end to end:**
  - **Entry:** Life events → *Update nominees* shows the entry line (*"Only changing a member mark? …"*) and *Member marks* above the
    EMPTY form; marks mode shows the intro, each rank as *"Primary nominee · Spouse"* / *"Second nominee · Son"* (⛔ a nominee's name,
    number or share anywhere on the screen), the mark's status (*"Waiting for their answer"*), *Save marks* DISABLED with *"Change a
    mark first."*, and *Change names or numbers instead*; that button discards an unsaved change (re-entry re-reads the server's marks).
  - **Add (rank 2, Kiran, typed):** the finder note → *Don't read my contacts* → the typed number → *"Marked as a member"* and the
    pre-save line *"When you save, they will see your name in the app and be asked to confirm it is them. …"* (the no-name form — a
    typed pick); *Save marks* ⇒ 403 ⇒ the step-up prompt ⇒ the dev OTP ⇒ verify ⇒ 200 ⇒ back on Life events (*"On record"*).
    DB: rank 1's link CARRIED to version 2 (the old row `redeclared`), Kiran's link `live` on rank 2; every version-2 ciphertext
    byte-identical to version 1's (md5 of name + mobile, both ranks); counter 2; ONE `member_nominees.marks_saved` audit row.
  - **Swap (two picks — Kiran on rank 1, Meena on rank 2):** saved with ⛔ prompt (the step-up from the add still inside its window).
    DB: BOTH links carried across ranks to version 3 (each kept its `asked_at` — ⛔ a new request), the version-2 links `redeclared`;
    ciphertexts unchanged; counter 4 (two units); two `marks_saved` rows.
  - **Remove (rank 2) + save, under TalkBack:** *Remove mark* ⇒ TalkBack *"Mark removed."* (ONCE); *Save marks* ⇒ *"Mark removed."*,
    *"Marks saved."*, then *"index"* (the Life events header) as the screen changed. DB: Meena's link `removed_by_declarer`, Kiran's
    carried to version 4; version 4 AND the projection keep every ciphertext, the relationship and the 75 / 25 split; counter still
    4 (a removal is ⛔ charged); three `marks_saved` rows; four `member.nominees_declared` events (the seed's + three).
  - **TalkBack capture method:** the Google TTS engine DISABLED for the capture (`pm disable-user com.google.android.tts`, re-enabled
    after), so every utterance TalkBack attempts is logged as *"TTS is not ready … Item: {text: …}"* — a fuller capture than 6.36e's
    start-up window. `adb input` taps ACTIVATE controls even with TalkBack on (they bypass touch exploration), so focus utterances and
    the swipe order were ⛔ exercised.
  - **Hindi:** marks mode renders without clipping (*सदस्य-चिह्न*, the intro, *मुख्य नॉमिनी · जीवनसाथी*, *चिह्न सहेजें*, *पहले कोई चिह्न
    बदलें।*, *इसके बजाय नाम या नंबर बदलें*).
  - **Found (⛔ patched — BigDev decides):** (1) *"Mark removed."* is spoken a SECOND time at the *Save marks* press, just before
    *"Marks saved."* — likely the notice's Android live region re-announcing on the re-render; harmless repetition, ⛔ traced. (2) The
    pick notice (*"Marked as a member"*) renders ABOVE rank 1 whichever rank was picked (nominees.tsx places it under the intro, as
    6.36e's form places it above the form) — after a rank-2 pick it reads as if it belongs to the Primary nominee. (3) The *Find…*
    button's visible text is cut to one line (*"Is this nominee a TWT member? Find them i…"*, Hindi *"…संप…"*); its accessibility label
    is whole. PRE-EXISTING: the extracted `NomineeMarkControl` button is the same markup as `main`'s `NomineeForm.tsx`. (4) The Life
    events header reads *"index"* (visible and spoken) — pre-existing, ⛔ this story's.
  - **NOT covered, ⛔ hidden:** iOS / VoiceOver (no simulator here); TalkBack focus order / swipe-through and TalkBack in Hindi; the
    refusal paths on the device (`marks_stale`, `marks_no_declaration`, the 5th-lookup limit) — covered by the live API suite only;
    a picked contact (only typed numbers — the contacts path is 6.36e's, unchanged); the marked members' own request screens; a real
    phone in a real hand.
  - **⚠ A slip during setup, recorded:** the login shell exports `DATABASE_URL` for `:5432/twt_dev`, and dotenv does ⛔ override it,
    so the API's FIRST start ran against `:5432` (not the disposable database). Seen when the seeded declarer's login fell into signup:
    the app's automatic `signup/create` wrote ONE `pending-kyc` member (mobile `9811100001`, Pariwar `aaaaaaaa-…`, 2026-10-27 03:10
    UTC) and one signup continuation into `:5432`'s `twt_dev`. ⛔ deleted (event-sourced tables; BigDev's call). The API was restarted
    with `DATABASE_URL` set on the command; every leg above ran on `twt_6_36f_device`. The long-lived `:5433` `twt_dev` was migrated
    forward `0181`…`0185` (main's landed migrations) before the disposable database was chosen; ⛔ data written there.
- **`ci:local` on the committed tip `b2fdb223` (2026-10-27), fresh `twt_6_36f_ci` (`:5433`, migrated), `DATABASE_URL` exported:**
  35 / 36 jobs green (every static job, unit — mobile 2,045 — and every gate). `integration-tests`: domain 423 files / 6,444, channels
  457, events 36, niyamavali-engine 144, validity-service 284, queue 4; jobs 79 / 80 files (1,781 passed) — the ONE red is the 10.23
  gate refusing a database not named `twt_dev` (turbo strips `TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS`; the same red as `efe6246d`'s run and
  6.36e's); alone with the override: 3 / 3. turbo then stopped before `@twt/api`'s live run; run alone: 192 files / 2,313 passed, 1 skipped. ⛔ NOT a single
  36 / 36 invocation.
- **DEVICE-RUN FINDINGS D1–D4 FIXED 2026-10-27 (BigDev: *"fix all, drop the throwaway databases"*) — `b543e703`.** Each test
  written RED first; each fix removed ⇒ its test RED again (restored byte-for-byte); each re-checked on the emulator (the installed
  dev client, a fresh Metro bundle, the real API on `twt_6_36f_device` started with `DATABASE_URL` on the command):
  - **D1 — the repeated *"Mark removed."*:** the first fix (clear the notice when a save starts) was NOT enough — on the device it was
    still re-read at the press. Proven at the press, ⛔ at the response: with the API STOPPED, *Save marks* ⇒ *"Mark removed."* at
    09:32:39.46, then the network-error alert at 39.59 (⛔ response, ⛔ navigation). Cause: an Android live region re-read by TalkBack on
    the press's re-render, whether the line stayed or was cleared (the second run also re-read the stale OTP prompt's live region).
    Fix: marks mode's *"Mark removed."* / *"Mark kept."* are plain visible text, SPOKEN ONCE by `announceForAccessibility` when set
    (`sayMarksNotice`), and the line still leaves when a save starts. Device: remove ⇒ *"Mark removed."* (once); press ⇒ only the
    step-up prompt; verify ⇒ *"Marks saved."*, *"Life events"*. Test: `device run D1` (⛔ `data-live`, ONE announce through the press).
  - **D2 — the pick notice above rank 1:** in marks mode a pick is SPOKEN only (`announceForAccessibility`, through `ltRef` — the
    memoized focus effect would otherwise keep the language it was made in); the picked rank's own label is its one visible line.
    Device (Hindi, rank 2): TalkBack *"सदस्य के रूप में चिह्नित"* then the screen title; the screen's ONLY such line is under rank 2.
    The full form's notice is UNCHANGED (it sits above the form's title — a page-level line). Test: `device run D2`.
  - **D3 — *Find…* cut to one line:** `ellipsis={false}` was tried FIRST and was INERT on the device (Tamagui's `Text` maps only
    `ellipsis: true`; `Button`'s wrapper Text sets it through a variant) — its prop-pinning test had passed: green proved nothing. Fix:
    `noTextWrap` + the control's own `<Text shrink={1} text="center">`, `height="auto"`, `minH={48}`, `py="$2"`. Device: the Hindi label
    wraps to two lines, whole. Shared control ⇒ the full form's *Find…* too. Test: `device run D3` (own Text, ≥ 48 dp); both render
    harnesses' Button mocks read `minH ?? height` as the guaranteed height.
  - **D4 — the "index" header:** `app/(life-events)/index.tsx` sets `Stack.Screen` `title: t('lifeEvents.title')` (every sibling in
    the group already titles itself; ⛔ new copy). Device: *"Life events"* / *"जीवन की घटनाएँ"*, and TalkBack speaks it. Test: NEW
    `life-events-index-title.test.ts`.
  - **Also seen on the device (⛔ this story's code):** the 5th mark of the day refused ON THE DEVICE — 429, the limit line shown and
    spoken, the counter unchanged at 4 (a refused save is ⛔ charged); to re-test D1 the disposable database's counter row was then
    DELETED (a throwaway database; recorded). The claim-intake screen's header reads *"(claim)"* — the same untitled-route class as D4
    in the `(claim)` group — NOT fixed here (outside 6.36f; BigDev's call). Residual: TalkBack's log shows ORDER, ⛔ whether its live
    TTS would cut the pick's announcement short with the screen title.
  - **Checks:** mobile 100 files / 2,049 passed; `tsc` and ESLint (`apps/mobile`) clean; `git diff --check`; `friction:check` passed
    on the committed fix (the 6.36f disposition). The full `ci:local` was ⛔ re-run (the delta is `apps/mobile` only; `b2fdb223`'s run
    stands for the rest). **Databases:** `twt_6_36f_ci` and `twt_6_36f_device` DROPPED; `twt_6_36f` (the dev session's) kept.
- **Leftovers settled 2026-10-27 (BigDev: *"Drop twt_6_36f, leave signup"*):** `twt_6_36f` DROPPED (⛔ `twt_6_36f*` database remains on
  `:5433`). The `:5432` junk signup (member `e7d20cb5…`) is LEFT INTACT by choice: its `events_log` row and nine `audit_log_entries`
  rows are append-only (`no_delete` triggers; the audit table is hash-chained), so deleting only its six mutable rows would orphan the
  signup event.

### File List

Code + tests (Tasks 1–4):

- `packages/contracts/src/nominee/member-link.ts` — `NomineeMarksSaveEntry` / `NomineeMarksSaveRequest`, `NomineeMarksRankView`, `NomineeLinksView.ranks`, two error codes
- `packages/contracts/src/nominee/relationship.ts` — NEW: the relationship enum, moved (no cycle)
- `packages/contracts/src/nominee/declaration.ts` — re-exports the moved enum
- `packages/contracts/tests/nominee-member-link.test.ts`
- `packages/api-client/src/index.ts` — `lifeEventsUpdateNomineeMarks`
- `packages/api-client/tests/nominee-links-client.test.ts`
- `packages/domain/src/nominee/declaration-read.ts` — `forUpdate` option
- `packages/domain/src/nominee/declaration-history.ts` — `ProjectedNomineeVersion.versionNo` / `relationship`
- `packages/domain/src/nominee/member-links.ts` — `isUnchangedMarksPlan`
- `packages/domain/tests/nominee/member-links.test.ts`
- `packages/domain/tests/integration/nominee/member-nominees.spec.ts`
- `apps/api/src/modules/nominee/nominee.handlers.ts` — the shared steps + the `marks` handler
- `apps/api/src/modules/life-events/routes.ts` — the `/nominees/marks` route
- `apps/api/src/modules/nominee-links/handlers.ts` — `ranks` on the links read
- `apps/api/src/audit/audit-sink.ts` — `member_nominees.marks_saved`
- `apps/api/tests/integration/nominee/nominee-marks-save.spec.ts` — NEW
- `apps/api/tests/integration/nominee/nominee-member-link.spec.ts` — `ranks` on 5 links-read assertions
- `apps/api/tests/integration/claims/nominee-declaration.spec.ts` — the 6.36f AC4 leg
- `apps/api/tests/unit/nominee-links-read-order.test.ts` — NEW
- `apps/api/tests/unit/known-people-number-fence.test.ts` — a comment only
- `apps/mobile/components/life-events/NomineeMarkControl.tsx` — NEW (extracted)
- `apps/mobile/components/life-events/NomineeForm.tsx` — renders the shared control
- `apps/mobile/app/(life-events)/nominees.tsx` — the entry card + marks mode
- `apps/mobile/lib/nominee-links.ts` — the mode's pure logic + two refusal keys
- `apps/mobile/tests/unit/nominee-links-logic.test.ts`
- `apps/mobile/tests/unit/nominee-links-hooks.test.ts` — `ranks` in the mocked read
- `apps/mobile/tests/unit/nominee-marks-mode-render.test.ts` — NEW
- `packages/i18n/locales/en/nominee_link.json`, `packages/i18n/locales/hi/nominee_link.json` — the ten MK9 keys
- `packages/i18n/tests/nominee-link-copy.test.ts` — `PARAMS` + the verbatim pin

Records (Task 5): `friction-budget.md` (the disposition), `_bmad-output/implementation-artifacts/sprint-status.yaml` (the row + a
ledger line), this story file. ⛔ Migration; ⛔ `openapi/v1.yaml`.

Device-run fixes D1–D4 (2026-10-27, `b543e703`):

- `apps/mobile/app/(life-events)/nominees.tsx` — `sayMarksNotice` (one-shot, ⛔ live region); the marks-mode pick spoken only (`ltRef`)
- `apps/mobile/components/life-events/NomineeMarkControl.tsx` — *Find…* renders its own wrapping Text, `minH={48}`
- `apps/mobile/app/(life-events)/index.tsx` — the header title
- `apps/mobile/tests/unit/nominee-marks-mode-render.test.ts` — D1–D3 legs; the mock's `data-live`, `minH`, own-Text attributes
- `apps/mobile/tests/unit/nominee-form-link-render.test.ts` — the mock reads `minH ?? height`
- `apps/mobile/tests/unit/life-events-index-title.test.ts` — NEW (D4)

AC7 device run (2026-10-27): this story file (Completion Notes, Change Log, Status) and `sprint-status.yaml` (the row + ledger
`2026-10-27a`). ⛔ Code change — the seed spec was temporary and deleted; the worktree's gitignored `apps/api/.env` /
`apps/mobile/.env` and `apps/mobile/android/` (prebuild output) are local only.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-24 | 1.0 | Created (`bmad-create-story 6.36f`, BigDev: *"6.36f on it's branch"*) on `story/6-36f-nominee-mark-only-save` in its own worktree; MK1–MK12 PROPOSED; ⛔ code. Ledger `2026-10-24w`. |
| 2026-10-26 | 1.1 | Validated (`bmad-create-story validate 6.36f`, BigDev *"all"*) against `origin/main` `b3b1e8e9`: MK2 / MK3 / MK4 / MK5 / MK8 / MK9 / MK11 / MK12 revised, AC1–AC7 and Tasks 0–5 aligned, TR11–TR13 added; MK8 now a mode inside `nominees.tsx`. Row stays `ready-for-dev`; ⛔ code. Ledger `2026-10-26d`. |
| 2026-10-26 | 1.2 | DEV (`bmad-dev-story 6.36f`): Tasks 1–5 — contracts + client (`6cc8e8c9`), domain (`ed40951f`), API — `declare`'s steps shared, the marks route, the links read's `ranks` (`2808b69f`), mobile — the marks-only mode, the extracted mark control, the MK9 copy (`dad02d44`), the friction disposition (`efe6246d`); ci:local 35 / 36 with both integration reds run down (⛔ 6.36f's); mutations RED. ⚠ The AC7 device run is OWED (BigDev: "Review now, device later"). Row `ready-for-dev` → `in-progress` → `review`. Ledger `2026-10-26g`. |
| 2026-10-27 | 1.3 | Full code review: 0 decisions, 3 patches applied (R1 busy mode switch; R2 live post-row-lock terminal race; R3 actor/tenant/ownership denials), 3 inherited deferrals retained, 3 candidates dismissed. Final 77 mobile + 23 live API tests, touched-package typecheck/lint and whitespace checks passed; R1/R2 mutation checks failed as required and guards restored. Three parallel fix-diff review layers found no actionable issue. AC7 device work remains owed; story/sprint `review` → `in-progress` under the unresolved-work rule. Uncommitted, not pushed. Ledger `2026-10-27`. |
| 2026-10-27 | 1.4 | AC7 DEVICE RUN DONE (`bmad-dev-story 6.36f`; BigDev: *"Run device now"*): a fresh Android build of `b2fdb223` on `Pixel_9`, the real API on a disposable `twt_6_36f_device`; add (pre-save line, step-up), swap (two carries) and remove each saved and checked in the DB (ciphertexts byte-identical, counter 4, three `marks_saved`); TalkBack *"Mark removed."* / *"Marks saved."*; Hindi renders. Four findings recorded, ⛔ patched (a repeated *"Mark removed."* at save; the pick notice above rank 1; the pre-existing truncated *Find…* label; the pre-existing *"index"* header). A setup slip wrote one junk signup into `:5432` `twt_dev` (recorded, ⛔ deleted). `ci:local` on `b2fdb223` 35 / 36 + the 10.23 gate alone 3 / 3 + `@twt/api` live alone 2,313. Status `in-progress` → `review`; ledger `2026-10-27a`. |
| 2026-10-27 | 1.5 | DEVICE-RUN FINDINGS D1–D4 FIXED (BigDev: *"fix all, drop the throwaway databases"*), `b543e703`: one-shot marks notices (⛔ live region — the first fix, clearing at save, was disproved on the device), the marks-mode pick spoken only, *Find…* wraps (own Text; `ellipsis={false}` disproved on the device), the Life events header title. Each test RED first, each mutant RED, each re-checked on the emulator. Mobile 2,049; tsc / ESLint / friction:check green. Throwaway databases dropped. `(claim)` header seen, ⛔ fixed. Status stays `review`; ledger `2026-10-27b`. |
