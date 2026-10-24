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
Re-locate by FUNCTION, ⛔ by line number.

STATUS: ready-for-dev (v1.0). MK1–MK12 are PROPOSED — BigDev answers them at Task 0.2; ONE author-commit records them BEFORE any code
(Task 0.3, [[feedback_governance_commits_precede_implementation]]). ⛔ Panel question (§0 below — the details never leave the server, ⛔
new data, ⛔ new reader of the mark).

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes (before an already-negative word it is emphasis: "⛔ never") · ⭐ = action /
emphasis · ⚠ = hazard.

ADDRESSING RULE: ⛔ file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite decision id +
clause, item heading, row key).

NUMBERS (`-366` decision 6: *"the number belongs to the first COMMIT that takes it on any branch"*), each re-grepped at the commit that
takes it (`git log --all` + every worktree): decisions — highest COMMITTED on any branch `-403` (main; 11b-4 holds `-398` / `-400`) ⇒
the author-commit takes ≥ `-404`. Migrations — ⛔ NEEDED under the recommended MK2 / MK6 (state it again at Task 0.3 if an answer
changes that); for the record, main's highest is `0181_member-nominee-links` and 11b-4 holds an unlanded `0181` / `0182` that rebase to
≥ `0182` when it lands. Ledger letters — main's highest `2026-10-24v` (⛔ later letter on any branch) ⇒ this creation commit takes
`2026-10-24w`.

LETTERS: G = found facts (traced at the pin) · MK = build decisions (PROPOSED) · TR = traps.
-->

# Story 6.36f: A Member Changes or Removes a Nominee Mark Without Retyping the Nominees — the Server Keeps the Details `[SURFACE]`

Status: ready-for-dev

> ⭐ **Next: Task 0.1 (preflight), then Task 0.2 — BigDev answers MK1–MK12 and finalises the English copy (MK9).** ⛔ Code until the
> author-commit (Task 0.3) is committed ALONE and the records (Task 0.4) follow it.

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
shares stay exactly as you saved them, and who you may mark is unchanged."* **Checked against the Niyamavali** (the main checkout's
gitignored copy `docs/legal/niyamavali.md`, mtime 2026-08-16; a rulebook, ⛔ ratified — [[feedback_niyamavali_rulebook_not_spec]]): §2.4
*"Each member declares **one or two nominees** at signup or via Life Events"* and the 75 / 25 split. This story changes ⛔ count, ⛔ split
and ⛔ the route by which nominees are declared, so there is ⛔ conflict. Part 10 (*"processes member/nominee/claimant data lawfully, for
specified purposes"*) is ⛔ engaged afresh: the copied ciphertext is the same data, for the same purpose, held as before (MK2). **Result:
⛔ conflict.**

## The rulings and decisions this story builds on

| Source | Key (verbatim, short) | Status |
|---|---|---|
| BigDev, in session 2026-10-24 (6.36e device run, second pass) | *"C: server keeps the details"* (chosen over B, prefill from the record, and A, keep as is) | ⭐ THIS ROW'S ORIGIN — a build direction, ⛔ yet in `.decision-log.md` (`epics.md` `### Story 6.36f`: *"⛔ a decision-log entry (a build direction, written into this story's decisions at its create-story)"*) ⇒ recorded by the Task 0.3 author-commit |
| `-234` X / (a) | *"The nominee" = names, relationship, mobile, address and the split, all changeable while the member is alive*; *"(a) an append-only declaration history — each change kept with its time, Tier-1 ciphertext retained, ⛔ never deleted"* | ⭐ TRUSTEE-RATIFIED — a marks-only save appends versions (MK2); ⛔ field changes |
| `-384` Q2 A | *"Yes — warn staff about nominee changes too."*; cost as put: *"… including when someone re-saved the nominees without changing them …"* | ⭐ TRUSTEE-RATIFIED — a marks-only save trips the warning: an accepted cost, ⛔ a new trigger (MK2) |
| `-396` Q1 A / Q2 A; Not covered *"any other use of the mark"* | *"Yes — the mark counts from the moment the member saves it."*; the marked member is told in the app | ⭐ TRUSTEE-RATIFIED — unchanged; binds MK6 (⛔ staff label that would reveal a mark) |
| `-397` NE2 / NE5 / NE7 / NE8 / NE11 / NE14 | a link is set *"only by a declaration save, in the same tx as its versions"*; the 4-a-day meter; the exclusion as of the cut; ⛔ staff-line change; audit by `nominee_link:<id>`; ⛔ other reader | AUTHOR-COMMIT — REUSED; MK2 keeps NE2's *"same tx as its versions"* literally true |
| `-399` call 3 | *"The declarer's OWN `marked[]` rows stay one per version (they join `nomineeHistory[]` by `(rank, versionNo)` …)"* | AUTHOR-COMMIT — MK2 keeps it (a new version per marks-only save) |
| `-401` | ⛔ screen says that the Trust asks members about a death; a test pins it over the `nominee_link` namespace | AUTHOR-COMMIT — binds MK9's copy |
| `-235` Y / `-239` | a change on or after the day of death is discarded for the PAYOUT and raises suspicion | ⭐ TRUSTEE-RATIFIED — a marks-only version is a change and is classified like one (MK2 / MK6) |
| `-233` / 6.20 D3 | the declaration locks at the first claim | ⭐ TRUSTEE-RATIFIED — the same `guardDeclare` (MK4) |
| 3.9 (story file, Dev Notes) | *"Do NOT duplicate the declare/submit logic — add a new gated ROUTE that calls the existing SERVICE"* | precedent for MK4 |

### §0 — whose decision is this ([[feedback_panel_gate_read_ratified_verbatim]])

The template's test: what does the Trust DISCLOSE, OWE, or need a BASIS for, and which ratified clause would have to give? Strip the
citations and what is left is: *"the server writes the same encrypted bytes again instead of asking the member to retype them, and the
phone learns a version number"*. That is "the code should do X" with ⛔ change to what a person sees or is owed ⇒ **the AUTHOR's**.
Checked edge by edge:

| Edge | Ratified text | Verdict |
|---|---|---|
| Copying a rank's stored ciphertext into a new version | `-234` (a) *"Tier-1 ciphertext retained"*; same data, same purpose, same table | **MATCH** (author's) |
| The phone learns each rank's version NUMBER (MK3) | ⛔ ratified text; an integer, ⛔ personal data, read only by the declarer about their own declaration | **MATCH** (author's) |
| The staff warning fires on a marks-only save | `-384` Q2 A's accepted cost (*"re-saved the nominees without changing them"*) | **MATCH** |
| A post-death marks-only save is a "change" | `-235` Y / `-239` | **MATCH**: the details are identical, so the payout is unaffected; the suspicion signal is wanted (a mark steers who is asked — `-401`'s reason) |
| Labelling a version "marks only" for staff | `-396` Not covered *"any other use of the mark"*; `-397` NE14 *"⛔ other reader"* | **REJECTED** (MK6): it would tell staff that a mark changed, a new reader of the mark and so a Panel question. ⛔ Offered |
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
  `LINK_REFUSAL`: 422 `not_found` / 409 `nominee.link_stale` / 422 `nominee.link_duplicate`) → **`encryptNomineeField` ×3 per entry
  INSIDE the tx (KMS)** → `readDatabaseClock` → `planDeclarationVersions(getNomineeVersionHeads(…), ranks)` → `replaceMemberNominees` →
  `projectMemberState('member.nominees_declared', …)` → `appendMemberDeclarationVersions` → `applyNomineeLinkPlan(…, versions,
  recordedAt)` → `buildStatus` → `ok = true` → audit `member_nominees.declared` + one `member_nominee_links.ended|carried|asked` line per
  link (`resourceLocator: nominee_link:<id>`, `context: { rank }`), INSIDE the `try`, before the COMMIT in `finally`.
- **G2 — `guardDeclare`.** `claimDomain.lockNomineeDeclarationForEdit` (`packages/domain/src/claim/nominee-lock.ts` — the D3 advisory
  lock, the tx's FIRST lock, then `isNomineeDeclarationLocked`: a claim naming the member as deceased unless a `member_found_innocent`
  finding ⇒ 409 `nominee.locked_claim_filed`) → `TERMINAL_STATES = {withdrawn, anonymized}` ⇒ 409 `nominee.member_terminal` → the D9
  re-declaration step-up (`isRedeclaration` ∧ state ∉ `PRE_LOCK_IN_STATES` ∧ ⛔ fresh elevation ⇒ `StepUpRequiredError('nominee_change')`).
  ⚠ `namedByClaimSql` (the caller gate) has ⛔ innocence release; the D3 lock has one. A `keep` or "none" is ⛔ metered and ⛔ caller-gated.
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
  a `correction` of an OLDER version takes head + 1 but is ⛔ projected. The PROJECTION (`member_nominees`) equals the projected version.
  BUT `getNomineeVersionHeads` (used by `planDeclarationVersions`), `lockLiveNomineeLinks`'s `onHead` and `listNomineeLinksForDeclarer`
  (the links read) all use **max(`version_no`)**. They differ only after a correction of an older version, which is recordable only in the
  post-filing review window and so is reachable for a SAVE only after an innocence-finding unlock. A pre-existing 6.36e edge (MK11).
- **G6 — the status read carries ⛔ personal data.** `NomineeStatusResponse` = `{ nominees: [{ rank, relationship, splitPct,
  mobilePresent, addressPresent }], locked }` (`packages/contracts/src/nominee/declaration.ts`; `buildStatus`). The CLAIM flow reads it
  too (`(claim)/contact.tsx`, `(claim)/nominee-review.tsx`, `lib/claim-contact.ts`) ⇒ ⛔ field may be added (6.36e TR15). The marks come
  from the Life-Events-only read `GET /api/v1/member/life-events/nominee-links` (`apps/api/src/modules/nominee-links/routes.ts`) →
  `NomineeLinksView { links: { rank, linkId, label, name }[] }` (`contracts/src/nominee/member-link.ts`), strict-parsed by the api-client.
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
  (`apps/api/src/audit/audit-sink.ts`); `context` is stored ONLY as a SHA-256 hash. The 6.36b number fence
  (`apps/api/tests/unit/known-people-number-fence.test.ts`, hand-maintained `FILES`) pins the nominee handler file.
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
  Links hooks `components/nominee-links/useNomineeLinkQueries.ts`. Copy `packages/i18n/locales/{en,hi}/nominee_link.json` (`useNomineeLinkT`);
  relationship labels `nominees.relationship_*` in `common.json`. api-client `lifeEventsUpdateNominees` posts to `${LIFE_EVENTS_BASE}/nominees`
  (`packages/api-client/src/index.ts`).
- **G12 — tests that exist.** API `apps/api/tests/integration/nominee/nominee-member-link.spec.ts` (createTestApp + a log stream + a KMS
  `auditHook` capturing HMAC lines), `nominee-declare.spec.ts`, `nominee-lock.spec.ts`, `life-events/life-events.spec.ts`,
  `tests/unit/nominee-link-twins.test.ts`. Domain `tests/nominee/member-links.test.ts`, `tests/nominee/declaration-history.test.ts`,
  `tests/integration/nominee/member-links{,-concurrency}.spec.ts`, `tests/claim/peer-mesh-nominees.test.ts`,
  `tests/integration/claim/peer-mesh-workplace-snapshot.spec.ts`, `tests/member/rtbf-anonymize.test.ts`. Jobs `apps/jobs/tests/data-export.test.ts`
  (`nomineeLinks`, the `(rank, versionNo)` join). Mobile `apps/mobile/tests/unit/nominee-{form-link-render,links-logic,links-hooks,link-find-render,
  link-match-purpose,link-requests-render,screen-draft-pins,history-copy}.test.ts`, plus the `-401` death-word absence test `nominee-link-copy.test.ts`.

## ⚖️ Build decisions MK1–MK12 (PROPOSED — BigDev answers at Task 0.2)

Each carries the recommendation first.

- **MK1 — the request. RECOMMEND (a): a NEW route `POST /api/v1/member/life-events/nominees/marks`** (preHandler `[memberSession,
  requireMemberStepUp(deps, 'nominee_change')]`, the Life Events save's own) with its OWN strict body `NomineeMarksSaveRequest = { marks:
  { rank: 1 | 2, versionNo: int ≥ 1, memberLink: NomineeMemberLink | null }[] }` (1..2 entries, ranks unique — a `superRefine`; every
  object `.strict()`; `NomineeMemberLink` is 6.36e's union, REUSED). The schema has ⛔ field for a name, relationship, mobile or address,
  so a marks-only save CANNOT carry personal details. Response: `NomineeStatusResponse` (unchanged). **Rejected:** (b) an "unchanged" variant
  of `NomineeDeclareEntry`: that body is shared with the signup route (G1), and it would let one save mix typed and untouched entries, a
  partly-typed save the epics entry excludes (MK10); (c) the signup route (6.36e NE4: Life Events only).
- **MK2 — what is written. RECOMMEND (a): a NEW version per occupied rank, carrying the SAME ciphertext.** Inside the main tx, after
  `guardDeclare` (so the D3 lock serialises it against every other writer), read the member's `member_nominees` rows (the projection = each
  rank's projected version, G5). For each rank, the new version is `kind 'declared'`, `source 'member'`, with `name_ciphertext`,
  `mobile_ciphertext`, `address_ciphertext`, `relationship` and `split_pct` COPIED BYTE FOR BYTE from that row (G3). Then the existing
  sequence runs unchanged: `planDeclarationVersions` → `replaceMemberNominees` (the same rows) → the event → `appendMemberDeclarationVersions`
  → `applyNomineeLinkPlan`. ⛔ KMS call for the details (⛔ `encryptNomineeField`; ⛔ decrypt). Every 6.36e invariant then holds as written: a link
  is written in the same tx as its version (`-397` NE2; V15, G9 (i)); `marked[]` stays one row per version (`-399` call 3); `onHead` is
  unchanged; the staff warning fires (`-384` Q2 A's accepted cost) and a post-death version is classified as one (`-235` Y / `-239`), which
  is wanted: a mark changes who is asked, and `-401` records that a group could steer who is asked. **Rejected:** (b) hanging the new link
  off the EXISTING head version, which breaks V15. A save on the filing day before the claim, or after an innocence unlock, would hang a
  post-cut link on a pre-cut version, and the exclusion would count it. A fix by `asked_at` fails because a carry copies the original
  `asked_at`, so it needs a new `linked_at` column, a migration and a reader change. It also gives `marked[]` two rows per `(rank,
  versionNo)`, and it hides the mark change from the staff warning and from the post-death classification.
- **MK3 — the basis, and staleness. RECOMMEND:** each mark names the `versionNo` of its rank's PROJECTED version as the phone saw it, and
  the set of submitted ranks must EQUAL the projection's ranks. Any mismatch ⇒ 409 `nominee.marks_stale` (the phone refetches the status and
  the links read, shows the marks again, and the member saves again). A member with ⛔ projection row ⇒ 409 `nominee.marks_no_declaration`
  (the control is hidden anyway). Without this, a member whose nominees were re-declared on another device could apply a mark to a nominee
  they never saw. **Where the phone learns it:** the Life-Events-only links read gains `ranks: { rank, versionNo }[]`, one per occupied rank
  at its PROJECTED version (an integer about the declarer's own declaration, ⛔ personal data). ⛔ The status read (G6 — the claim flow reads
  it). **Where it is checked:** in the metering tx right after `guardDeclare` (a stale save is ⛔ charged) when any mark is `new`, and
  authoritatively in the main tx after `guardDeclare`. **Rejected:** checking only the `keep` link ids. A rank with ⛔ mark that was
  re-declared with a different person would pass, and a `new` mark would land on that person.
- **MK4 — the guards and the order. RECOMMEND: the declare path's EXACT order (G1), shared, ⛔ copied.** Normalise every `new` number →
  `hasFreshElevation` → (any `new`) the metering tx: `guardDeclare`, the MK3 basis check, the caller gate + charge → ONE HMAC batch → the
  main tx: `guardDeclare`, the MK3 basis check, `lockLiveNomineeLinks`, `resolveNomineeLinkTargets`, `planNomineeLinks` (UNCHANGED — each
  submitted rank's `link` is the mark, or `null` for none), then MK2's writes, `buildStatus`, the audit (MK7), COMMIT. Built by extracting
  the link pipeline and the write sequence of `declare` into shared functions that BOTH handlers call, with the details either encrypted
  from the body (full save) or copied from the projection (marks-only). 3.9's rule: *"Do NOT duplicate the declare/submit logic"*. ⛔ A
  second implementation of any guard. The D9 step-up always applies (a marks-only save is always a re-declaration) except in
  `PRE_LOCK_IN_STATES`, as today.
- **MK5 — a save that changes nothing. RECOMMEND:** if the plan only carries each live link onto its OWN rank and asks nobody new (every
  `keep` stays on its own rank, every "none" sits on a rank with ⛔ live link, and any `new` resolves to the member already live on that rank),
  the server answers 200 with the status and writes ⛔ version, ⛔ projection, ⛔ event and ⛔ audit line. Versions written for nothing would
  trip the staff warning for nothing. A `new` that resolves this way has already spent its meter unit (6.36e's recorded cost (1)). The phone
  also keeps *Save* disabled until a mark differs from the saved one. ⚠ A retry after a LOST response to a save that DID change something
  ⇒ 409 `marks_stale` (the versions moved). The phone refetches and shows the saved marks; recorded, ⛔ an idempotency key (the declare has
  none either, G1).
- **MK6 — what the history shows. RECOMMEND (i): ⛔ label.** A marks-only version appears everywhere exactly as a re-save with identical
  details does today: the staff timeline (decrypted snapshots show the same details), the export's `nomineeHistory[]`, the determination
  marks, the warnings. **Rejected:** (ii) a "details unchanged" label DERIVED by ciphertext equality. Byte-identical ciphertext could only
  come from a server copy, so the label would tell staff that a MARK changed: a new reader of the mark (`-397` NE14; `-396` Not covered
  *"any other use of the mark"*), which is a Panel question; ⛔ offered. (iii) a stored column: an ALTER of the append-only `0119` table
  (6.36e TR2), a migration and the `kind_coherence` / trigger rework.
- **MK7 — events and audit. RECOMMEND:** `member.nominees_declared` emitted exactly as a full save emits it (`source: 'member'`, the
  versions; ⛔ new payload field — the lifecycle sees a declaration save, and a plaintext events_log payload names ⛔ mark, `-397` NE11).
  Audit: a NEW action `member_nominees.marks_saved` (a literal in `AuthAuditEventType`; `context: { nominee_count, versions }`, the
  `.declared` shape) IN PLACE OF `member_nominees.declared`, so the security record says truthfully that the server, not the member,
  supplied the details. It sits beside the unchanged link lines (`asked` / `carried` / `ended`), guarded by `ok`, before the COMMIT. Any
  NEW handler or domain file joins the number fence's `FILES` list.
- **MK8 — the phone. RECOMMEND (a): a SEPARATE marks-only screen.** On `app/(life-events)/nominees.tsx`, when the status shows a
  declaration, it is ⛔ locked and the links read has loaded — and the member either HAS a live mark or MAY add one (the rule 6.36e uses
  to hide *Find…* for a caller who is not `active`; an `active-in-grace` member with ⛔ mark would reach a screen with nothing to do) —
  show a card ABOVE the form: *"Only changing a member mark? Do it here without
  typing your nominees again."* It goes to a NEW `app/(life-events)/nominee-marks.tsx`, which shows one block per occupied rank, *"Nominee
  {{rank}} · {{relationship}}"* (the relationship from the status read, through the existing `nominees.relationship_*` label). Each block has
  the current mark (the links read's label; the name only when `confirmed`) and the SAME mark controls (*Find…* / *Pick a different member* /
  *Remove mark*), with `markControl` EXTRACTED from `NomineeForm.tsx` into a shared component used by both, ⛔ forked. The find screen and
  the pick handoff are REUSED (the handoff is keyed by rank; the marks screen consumes it the way the form does). *Save marks* stays disabled
  until a mark differs from the saved one. It goes through `useStepUpGate('nominee_change')` → `stepUp.guard(() =>
  memberAuth.lifeEventsUpdateNomineeMarks(…))` / `verifyAndRetry`, the form's pattern. After a 200 it refetches the links and status and
  shows *"Marks saved."*. Refusals reuse `saveRefusalCopyKey` + two new keys (`marks_stale` ⇒ refetch and remount with its own line;
  `marks_no_declaration` ⇒ back to the form); 409 `locked_claim_filed` ⇒ the locked state. ⛔ MMKV draft: nothing is typed, and the picked
  number is held in memory only, narrower than the form's recorded draft residual. The V3 edit question does ⛔ apply (⛔ editable details).
  The full form is UNCHANGED (a mark can still be changed there with a full retype). **Rejected:** (b) detecting untouched slots in the full
  form. An empty slot is ambiguous (unchanged, or not yet typed), and a mixed typed / untouched save is the partly-typed save MK10 excludes.
- **MK9 — the copy. RECOMMEND:** new keys in the `nominee_link` namespace (en + hi; parity; a real-`t()` test,
  [[feedback_stub_must_call_not_transcribe]]; the `-401` absence test then covers them, so ⛔ word of a death). PROPOSED English, which
  BigDev finalises at Task 0.2:
  `marks.entry` *"Only changing a member mark? Do it here without typing your nominees again."* · `marks.title` *"Member marks"* ·
  `marks.intro` *"Your nominees' names, numbers and shares stay exactly as you saved them. Here you can only mark, change or remove which
  nominee is a TWT member."* · `marks.slot` *"Nominee {{rank}} · {{relationship}}"* · `marks.save` *"Save marks"* · `marks.saved` *"Marks
  saved."* · `marks.nothing_changed` *"Change a mark first."* (the disabled Save's hint) · `save.marks_stale` *"Your nominees changed since
  you opened this screen. Check the marks again, then save."* · `save.marks_no_declaration` *"Save your nominees first, then you can mark a
  member."*. The Hindi is drafted by the dev and approved by BigDev (the 6.35 LS14 / 6.36e precedent).
- **MK10 — scope. RECOMMEND:** marks ONLY. ⛔ change to a name, relationship, mobile, address, split or the number of nominees; ⛔ vacating a
  rank; ⛔ signup; ⛔ prefill (option B); ⛔ backfill; ⛔ migration; ⛔ new disclosure; ⛔ new reader of the mark. A MIXED save (one rank's
  details retyped, the other's kept by the server) is ⛔ built and goes to `deferred-work.md` (Task 0.4).
- **MK11 — the "head" mismatch (G5). RECOMMEND: copy and check against the PROJECTED version** (what the family sees, and what the
  projection row holds), and ⛔ fix the max-`version_no` readers here. In the one state where they differ (a correction of an OLDER version,
  then an innocence unlock), the links read can hide a live link that sits on the projected version, and `planNomineeLinks` ends it
  `redeclared` (`onHead = false`). This is pre-existing in a full save too. It is recorded as a residual in `deferred-work.md` (Task 0.4)
  with a test that DOCUMENTS today's behaviour, named as such.
- **MK12 — governance. RECOMMEND:** the author-commit records BigDev's *"C: server keeps the details"* as its Occasion and MK1–MK12 as
  decided. ⛔ Panel note (§0 above). ⛔ Roster change: Row 31 (j)'s privacy line is unaffected (⛔ new data use). The `epics.md` entry gets a
  dated note that its three open design questions are decided (MK2, MK6, MK8), and its *"⛔ a decision-log entry"* is answered by the new id
  (a dated note, ⛔ rewritten).

## Acceptance Criteria

**AC0 — governance before code.** Task 0.2 recorded (MK1–MK12 answered verbatim; the MK9 English final); the author-commit committed
ALONE (Task 0.3); the records commit after it (Task 0.4). ⛔ `apps/` / `packages/` change before both.

**AC1 — contracts (MK1, MK3).** `NomineeMarksSaveRequest` (MK1's shape, every object `.strict()`, ranks unique) in
`packages/contracts/src/nominee/member-link.ts`; `NomineeLinksView` gains REQUIRED `ranks: { rank, versionNo }[]`; the error codes
`nominee.marks_stale` and `nominee.marks_no_declaration` join the nominee error-code list beside `NOMINEE_LINK_ERROR_CODES`.
`NomineeStatusResponse` / `NomineeSummaryEntry` / `NomineeDeclareRequest` are ⛔ changed. `pnpm contracts:emit-openapi` re-run, the
determinism check green; `packages/contracts/tests` cover the new shapes (a rank twice ⇒ refused; a name / mobile key ⇒ refused by
`.strict()`). A fixture sweep covers the new REQUIRED `ranks` across contracts, api-client and mobile tests
([[project_contracts_tests_outside_tsc]]). The api-client gains `lifeEventsUpdateNomineeMarks` (posts to `${LIFE_EVENTS_BASE}/nominees/marks`,
parses `NomineeStatusResponse`) and its links-read parse accepts `ranks`.

**AC2 — the route and the guards (MK1, MK3, MK4, MK5).** `POST /api/v1/member/life-events/nominees/marks` registered beside the Life
Events save with the same preHandlers, served by a handler that SHARES `declare`'s guard, link and write functions (MK4; a reviewer can
point to ONE `guardDeclare`, ONE metering function, ONE write sequence). Integration legs (live DB, `apps/api/tests/integration/nominee/`):
remove a mark ⇒ the link ended `removed_by_declarer`, new versions, ⛔ re-ask; swap two marks between ranks ⇒ both carried (answers and
`asked_at` kept), old rows `redeclared`; a `new` mark ⇒ asked, charged ONE `nominee_link_resolve` unit, ONE `mobileBlindIndexMany` call; a
`keep` beside a removal; MK5's no-change save ⇒ 200, ⛔ version / event / audit row; stale `versionNo` ⇒ 409 `marks_stale`, ⛔ charged and
⛔ HMAC'd even with a `new` mark; a missing or extra rank ⇒ 409 `marks_stale`; ⛔ declaration ⇒ 409 `marks_no_declaration`; a claim-locked
declaration ⇒ 409 `locked_claim_filed` and ⛔ write; a terminal member ⇒ 409; ⛔ elevation ⇒ 403 step-up; the 5th `new` in an IST day ⇒
429, ⛔ KMS; an `active-in-grace` member's removal and `keep` succeed, while their `new` ⇒ the 422 (the caller gate, unchanged); a stale
`keep` ⇒ 409 `link_stale`; a body carrying `name` ⇒ 400; a rollback injected after the link insert leaves ⛔ version and ⛔ link.

**AC3 — the copy (MK2).** On a marks-only save: each occupied rank gets ONE new `declared` / `member` version whose three ciphertext
columns are BYTE-IDENTICAL to the projection row's before the save, and whose `relationship` / `split_pct` are equal. The projection rows
are byte-identical before and after (apart from row identity). `decryptNomineeField` of the copied version's name and mobile returns the
original plaintext (G3 proved, not assumed). The KMS mock records ⛔ encrypt or decrypt call for the details (only the `new` mark's HMAC
batch). Domain / jobs legs: the staff warning `getPeerMeshNomineeChangeBeforeFiling` fires for a marks-only save inside the window; a
marks-only `new` link on a version recorded BEFORE the cut excludes that member from the five (the 6.36e exclusion, unchanged), and one
recorded AFTER the cut does ⛔ (V15 holds); the export (`apps/jobs/tests/data-export.test.ts`, the strict parse) shows the extra
`nomineeHistory[]` row and `marked[]` one row per version joinable by `(rank, versionNo)`; `anonymizeMember` scrubs the copied versions'
ciphertexts like any other (the rtbf test extended by a leg, ⛔ a new table so ⛔ table-count change).

**AC4 — the history is unchanged (MK6).** The staff timeline response for a marks-only version carries ⛔ field, value or label that a
re-save with identical details would not. A test asserts the response keys for a marks-only version equal those for a full re-save; ⛔
admin UI change.

**AC5 — events, audit, fences (MK7).** `member.nominees_declared` payload as a full save's (a test compares the keys); audit
`member_nominees.marks_saved` (a literal of `AuthAuditEventType`) with `context: { nominee_count, versions }`, plus the link lines; ⛔
`member_nominees.declared` line on a marks-only save; ⛔ number, name or other member's id in any log, audit or alarm (the number fence's
`FILES` list extended to any new file).

**AC6 — the phone (MK8, MK9).** The entry card on the nominees screen (shown only with a declaration, ⛔ locked, links loaded); the new
`nominee-marks.tsx` screen; `markControl` extracted into a shared component that the form and the marks screen both render (the existing
form render tests stay green unchanged); the pick handoff consumed by the marks screen; *Save marks* disabled until a mark differs; the
step-up guard and retry; the refusal copy (incl. `marks_stale` ⇒ refetch + remount; `marks_no_declaration`); *"Marks saved."*; ⛔ MMKV
write by the marks screen (a test). Copy keys en + hi, parity, the real-`t()` test, the `-401` absence test green over the new keys.
Mobile unit / render tests: the screen renders each rank's relationship and current mark; a removal sends `memberLink: null` with the
rank's `versionNo`; a swap sends two `keep`s across ranks; an untouched screen cannot save; a 409 `marks_stale` refetches. RTL `cleanup` and
`lib/mmkv` mocked ([[project_mobile_vitest_and_expo_install_traps]]); any list renders its empty / error state OUTSIDE the list
([[project_fabric_flatlist_empty_populated_crash]]); every `router.push` target grepped by hand (TR6).

**AC7 — the gates.** `tsc`, ESLint, i18n parity, `ci:local` on a test database (⛔ `:5432`; [[project_prepush_hook_inherits_5432]]); known
reds named, ⛔ hidden ([[project_known_livedb_test_failures]]). A device run on the Android emulator (remove a mark, swap two marks) with
the NOT-covered list stated (iOS / VoiceOver at least).

## Tasks / Subtasks

- [ ] **Task 0 — governance (AC0)**
  - [ ] 0.1 Preflight: `git fetch origin`; rebase if `origin/main` moved; re-run G1–G12's greps (`planNomineeLinks`, `guardDeclare`,
        `replaceMemberNominees`, `encContext`, `listNomineeLinksForDeclarer`, `NomineeLinksView`); re-take the NUMBERS (decision ≥ `-404`;
        the ledger letter after `2026-10-24w`); confirm ⛔ migration is needed under the answers.
  - [ ] 0.2 BigDev answers MK1–MK12, recorded VERBATIM here and in the Completion Notes, and finalises MK9's English.
  - [ ] 0.3 The author-commit: the next free decision id, *"AUTHOR-COMMIT (BigDev) — STORY 6.36f: A MARKS-ONLY NOMINEE SAVE — THE SERVER
        COPIES THE STORED DETAILS …"*, with the Occasion (*"C: server keeps the details"*, chosen over A / B, 6.36e device run), §0, MK1–MK12
        as decided, Not covered (MK10's list; the MK11 residual), Consequences (⛔ migration; ⛔ the Panel; ⛔ roster change). Committed ALONE
        as `governance: …`; its SHA written after ([[project_decision_log_writes_user_inserted]] — if the write is refused, ask once).
  - [ ] 0.4 The records commit (append-only, each dated): `epics.md` `### Story 6.36f` — a dated note (the decision id; the three open
        questions decided by MK2 / MK6 / MK8); `deferred-work.md` — a dated line on the 6.36e item (b) (*"homed in 6.36f, ⛔ closed until
        row `done` on main"*, [[feedback_closure_language_precision]]) and NEW items: the mixed save (MK10), the head mismatch residual
        (MK11); the sprint row's note.
- [ ] **Task 1 — contracts + client (AC1)** — `NomineeMarksSaveRequest`, `NomineeLinksView.ranks`, the two error codes, the OpenAPI
      re-emit, `lifeEventsUpdateNomineeMarks`, contracts tests + the fixture sweep.
- [ ] **Task 2 — domain (AC2, AC3)**
  - [ ] 2.1 A projection read for the copy (in `nominee/declaration-write.ts` or `declaration-history.ts`, beside `replaceMemberNominees`),
        returning each rank's ciphertexts + relationship + split + the projected `versionNo` (MK3). Inside the caller's tx, ⛔ KMS.
  - [ ] 2.2 The links read gains `ranks` (`listNomineeLinksForDeclarer`'s caller, or a sibling read in `member-links.ts`), with the
        PROJECTED `versionNo` (MK11).
  - [ ] 2.3 A pure `isUnchangedMarksPlan(live, plan)` (MK5) beside `planNomineeLinks`, with unit tests in `member-links.test.ts`
        (unchanged; a removal; a swap; a same-rank `new` re-pick ⇒ unchanged). `planNomineeLinks` itself ⛔ changed.
  - [ ] 2.4 The AC3 domain legs (staff warning, the exclusion before / after the cut, rtbf scrub of copies).
- [ ] **Task 3 — API (AC2, AC4, AC5)** — extract `declare`'s shared parts (guards + basis, the metering tx, the HMAC batch, the main-tx
      link pipeline, the write sequence) so both handlers call them (MK4); the marks handler + route; the audit literal; the links read
      handler's `ranks`; the number fence; the AC2 / AC3 / AC4 / AC5 integration legs. Re-run `nominee-member-link.spec.ts`,
      `nominee-declare.spec.ts`, `life-events.spec.ts` UNCHANGED as the extraction's regression proof.
- [ ] **Task 4 — mobile (AC6)** — the shared mark control; the entry card; `nominee-marks.tsx`; the client call; the copy (en + hi
      draft, BigDev approves the Hindi); the tests.
- [ ] **Task 5 — gates + records (AC7)** — `ci:local`, the device run, the Debug Log, the ledger line, File List.

## Dev Notes

### Current state of the code this story changes (traced at `0e9b261d`)

- **`nominee.handlers.ts` `declare(route)`** — G1. **Changes:** its guard / meter / HMAC / link / write steps become shared functions that
  take the details as INPUT (encrypted ciphertext rows); the full save encrypts from the body as today, the marks save reads them from the
  projection. **Preserve:** the exact order (G1 / 6.36e AC3's dated note), the uncharged early refusals, the audit-before-COMMIT pattern, the
  signup route's `allowLink: false` behaviour, every response and error body.
- **`life-events/routes.ts`** — gains the `/nominees/marks` route. **Preserve:** the existing route's preHandlers and schemas.
- **`nominee-links` module** — the links read gains `ranks`. **Preserve:** `links[]` exactly (a live link on the max-`version_no` head, the
  name only when `confirmed`, decrypted after commit).
- **`app/(life-events)/nominees.tsx` + `NomineeForm.tsx`** — the entry card; `markControl` moves to a shared component. **Preserve:** the
  form's validation, the V3 question, the draft (`redactForDraft`), the 48 dp controls and their accessibility announcements (*"Mark
  removed."*, *"Is this still the member you marked?"*) verified on 6.36e's device run.

### Shipped substrate this story READS — rebuild none of it

`planNomineeLinks` / `applyNomineeLinkPlan` / `lockLiveNomineeLinks` / `resolveNomineeLinkTargets` / `chargeNomineeLinkResolve`
(`nominee/member-links.ts`); `planDeclarationVersions` / `getNomineeVersionHeads` / `projectedVersionOfRank` (`nominee/declaration-history.ts`);
`replaceMemberNominees` / `appendMemberDeclarationVersions`; `lockNomineeDeclarationForEdit` (`claim/nominee-lock.ts`); the find screen and the
contact matching (6.36b / 6.36e); `useStepUpGate`.

### Traps

- **TR1 — the projection is the copy source, ⛔ max(`version_no`).** G5 / MK11. Copy from `member_nominees` (= the projected version) and
  check the basis against `projectedVersionOfRank`'s `versionNo`.
- **TR2 — the copy depends on G3.** If anyone adds a `rowKey` to the nominee encryption context, every copied ciphertext stops decrypting.
  AC3's decrypt leg is the tripwire; ⛔ delete it as "redundant".
- **TR3 — KMS stays out of the scope tx.** A marks-only save makes ⛔ encrypt call; the only KMS work is the `new` marks' ONE HMAC batch,
  before `openScopeTx` ([[project_kms_audit_per_hmac_global_lock]]).
- **TR4 — ⛔ add to `NomineeStatusResponse`.** The claim flow reads it (G6, 6.36e TR15); `ranks` lives on the links read.
- **TR5 — a refused request costs ⛔ KMS call and ⛔ meter unit.** The MK3 basis check runs inside the metering tx BEFORE the charge (6.36e
  TR14's discipline).
- **TR6 — typed routes in a worktree.** ⛔ `.expo/types` ⇒ `tsc` does ⛔ check `Href` for `nominee-marks` ([[project_mobile_typed_routes_worktree]])
  — grep every `router.push` target by hand.
- **TR7 — extraction is the risk.** MK4 refactors a handler that four review rounds hardened. Move code; ⛔ "improve" it in the same commit.
  The existing nominee / link / life-events specs passing UNCHANGED is the proof. Any test edit there is a red flag to explain.
- **TR8 — markdown in JSDoc** ([[project_markdown_emphasis_closes_jsdoc]]) and **the import guard**: `nominee/` ⛔ imports `claim/` or the
  member barrel ([[project_type_only_import_cycle_trap]], 6.36e TR13).
- **TR9 — the death-word guard.** The `-401` absence test runs over the whole `nominee_link` namespace; ⛔ "asked about", ⛔ any death word
  in the new keys, en or hi.
- **TR10 — strict parses.** The api-client strict-parses the links read; `ranks` lands in the contract, the client and every fixture in the
  SAME change (TR4 of 6.36e).

### Libraries and versions

⛔ New dependency. Everything is built from what 6.36e shipped: Fastify routes and Zod contracts (`@twt/contracts`), drizzle + raw `sql`
in `@twt/domain`, Expo Router / Tamagui / i18next on the phone, vitest + RTL in tests, all at the versions pinned in the lockfile. ⛔ Web
research was needed: no library API is touched beyond the patterns the cited files already use.

### Testing standards

Live-DB integration on a TEST database (`:5433` / `:5434`, ⛔ `:5432`); separate transactions where `now()` ordering matters
([[project_db_clock_ordering_tests_tie]]); each new guard leg a mutation that goes RED when its line is removed (recorded in the Debug Log);
contracts vitest; mobile vitest with RTL `cleanup`; `ci:local` before push ([[project_ci_local_double_run_pollution]]).

### Project Structure Notes

New: `apps/mobile/app/(life-events)/nominee-marks.tsx`, a shared mark-control component under `apps/mobile/components/life-events/`
(or `components/nominee-links/`), new tests. Updated: `nominee.handlers.ts` (+ any extracted helper file — fenced), `life-events/routes.ts`,
the `nominee-links` read handler, `packages/domain/src/nominee/{member-links,declaration-write or declaration-history}.ts`,
`packages/contracts/src/nominee/member-link.ts`, `packages/api-client/src/index.ts`, `apps/api/src/audit/audit-sink.ts`,
`packages/i18n/locales/{en,hi}/nominee_link.json`, `nominees.tsx`, `NomineeForm.tsx`, the OpenAPI output, the number-fence test. ⛔
Migration; ⛔ `packages/domain/migrations/`.

### References

- 6.36e story (NE1–NE14, G1–G14, the device run's second pass, TR1–TR15): `_bmad-output/implementation-artifacts/6-36e-nominee-member-link-at-declaration.md`
- 6.36d story (the exclusion, the as-of-cut walk): `_bmad-output/implementation-artifacts/6-36d-exclude-nominees-from-the-five.md`
- 3.9 story (the Life Events route rule): `_bmad-output/implementation-artifacts/3-9-life-events-panel.md`
- `epics.md` `### Story 6.36f`; `deferred-work.md` (the 6.36e second-pass item (b))
- Decisions: `-234` X / (a), `-384` Q2 A, `-396` Q1 A / Q2 A / Not covered, `-397` NE2 / NE5 / NE7 / NE8 / NE11 / NE14, `-399` call 3,
  `-401`, `-235` Y / `-239`, `-233` — `.decision-log.md`
- Routing template (§0): `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`
- Architecture §2.7 (Tier-1 envelope ciphertext); PRD FR-4 / FR-5 (nominees)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- 2026-10-24 — Story created by `bmad-create-story 6.36f` at `0e9b261d` (two read-only research passes + hand spot-checks). Ultimate context
  engine analysis completed — comprehensive developer guide created. MK1–MK12 PROPOSED; ⛔ Panel question.

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-24 | 1.0 | Created (`bmad-create-story 6.36f`, BigDev: *"6.36f on it's branch"*) on `story/6-36f-nominee-mark-only-save` in its own worktree; MK1–MK12 PROPOSED; ⛔ code. Ledger `2026-10-24w`. |
