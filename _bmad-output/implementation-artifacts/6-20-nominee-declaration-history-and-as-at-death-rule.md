---
baseline_commit: b06978ca
---

<!--
BASELINE — `governance(6.18): Panel rulings -235 and -236 …`. The rulings this story builds are in `.decision-log.md` as
`2026-09-20-233` … `-236` (COMMITTED). `-236` restates the whole rule set in one place.

⚠⚠ EVERY CLAIM BELOW ABOUT STORY 6.18 IS AGAINST ITS UNCOMMITTED WORKING TREE on `story/6-18-nominee-name-check` (its name check, its
migrations 0116–0118, its keys, its 32 claim events). 6.18 is `in-progress` with 73 open review patches. Re-run
`git diff --name-only b06978ca..HEAD -- packages apps scripts` and re-read 6.18's `### Review Findings` before Task 1.

STATUS IS `backlog`, NOT `ready-for-dev` — a DELIBERATE deviation from the create-story default. What flips it: (1) Panel question P1 answered
(what "that nominee's claim will be denied" means); (2) Task 0's author-commit decision (the permission keys) landed; (3) Story 6.18 landed, so
migration numbers, the catalog version and the claim-event count can be read LIVE. "A story a developer cannot safely start is not ready."

GLYPH REGISTER: `⛔` sits ONLY on a negation word (NOT / no / never / don't); `⭐` = key fact or action; `⚠` = hazard.
ADDRESSING RULE: no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first — every prepend rots every
number). Cite decision ids, clauses, item headings and row keys. `file:NNN` is used ONLY for code; 6.18's line numbers rot when its patches land —
function names are the stable handle.
LETTERS: `D1`…`D17` are 6.20's own author decisions (D14 is PROVISIONAL); the Panel's open questions are `P1`…`P5`; `CC2`/`CC3` are `-236`'s small confirms (CC1 belongs
to Story 6.21); other stories' letters are qualified (`6.18 D1`, `6.16 D-F`, `6.19 D5`).
-->

# Story 6.20: The Nominee Declaration's History, the Lock at the First Claim, and the As-At-Death Rule `[SURFACE]`

Status: backlog

> **Not in `epics.md`'s story list.** Commissioned by the Trustee Panel (Dhiraj Rahul + Kalpana Bharti) on 2026-09-20 — decisions `-233` → `-236`
> — and by BigDev's call the same day that the build is **its own story** (*"create the story for row (a)"*). Like 6.17 and 6.18 it needs a
> `> ⚠ Minted by…` header in `epics.md`, and the Epic 6 retrospective stays `done` (Task 0).
>
> ⭐ **6.18 must not go live until this lands — or 6.18's compare source is changed** (`-236` consequence 4): 6.18's name check reads the **CURRENT**
> nominee rows, which under the ratified rule is the **WRONG** nominee whenever a change was made after the death (AC5). Row (b), Story `6-21`
> (a death certificate without a clear date is replaced), is **separate** and is ⛔ not depended on here.

## The rulings this story builds — verbatim keys, and OUR reading of them

⚠ The Panel's answers are short. The **reading** column is ours and is ⛔ **not ratified**; each place it could be read another way is a numbered
question in *⚖️ Open Panel questions*. Verbatim text lives in `.decision-log.md`.

| Decision | The Panel said (verbatim, typos as relayed) | Our reading |
|---|---|---|
| `-233` | *"After member has died nominee they declared cannot be changed."* | The declaration is locked once the death is known — refined by `-234`. |
| `-234` V, W, X | *"We cannot know for sure that person has died unless claim was filed. … Until claim has not been filed, system should keep the timeline of nominee change, allowing nominee change until claim has been filed. However if nominee has been changed after death that nominee claim will be denied and only nominee that was chosen by member will receive the claim."* · *"Allow geniune mistake, you should also ask for nominee relation with member. Only if we know the relation we can allow geniune mistake. Also not name of female change like Rani Kumari before marriage and Rani Devi after."* · *"Yes nominee should cover names, relationship, mobile, address, split. Yes all of them can be changed as long as member is alive."* | The lock starts at the **first claim**; until then changes are free and **every version is kept**; a post-death change is **neutralised at verification**; a genuine mistake may be **corrected** once the relationship is known (*"not name"* read as *"note"*). |
| `-235` Y, AA | *"District admin decides changed after death against death certificate date, if no date is mentioned on death certificate then certificate is rejected, only certificate with clear date is acceptable. A change done before a day of death will be assumed to be done by member, everything else will be discarded."* · *"Yes"* | The **District Admin** decides, against the **certificate's date**; a change on an **earlier calendar day** stands, **the day of death and after** is **discarded**; **per nominee**. |
| `-236` Z, BB | *"correction requires approval by both, first District Admin then Pariwar Admin."* · *"Yes, family will be asked to produce certificate with clear date without the claim being denied."* | A correction after the claim needs **two approvals in order**; the certificate rule is Story **6-21**. |

## Story

As the **District Admin** (with the **Pariwar Admin** above me), I want **every version of a member's nominee declaration kept, the declaration locked from the
first claim, and only the declaration in force at the death to count**, so that **a nominee changed after a death can never receive** — and a
family with a genuine mistake still has a route to fix it.

## ⭐ THE INVARIANTS — read these first; every AC below serves one of them

1. **⛔ The system NEVER discards a version, and never denies anything, on its own.** It **shows** each version beside the certificate's date; the **District Admin decides** (`-235` Y).
2. **⛔ Nothing is ever deleted.** A version is appended; a discard is a **record** on top of it; a vacated rank is a **tombstone** version.
3. **⛔ The lock keys to the DURABLE fact that a claim was ever filed** — ⛔ never the derived `account-frozen` overlay (removed on `claim.settled` / `claim.denied_no_appeal`) and ⛔ never `getClaimByDeceasedMember` (it hides terminal claims).
4. **⛔ Per nominee.** A discard reverts ONE rank to its own earlier version and never touches the other (`-235` AA).
5. **⛔ A correction is not a post-death change.** It inherits the corrected version's **position in time**; otherwise every genuine correction would look like one to discard (AC7).
6. **⛔ No name is compared, hashed or diffed** to build the timeline — the 6.18 no-comparison fence and its Trap 4 hold.
7. **⛔ A history that keeps PII must be erasable** — the RTBF anonymizer covers the new table in the SAME commit (AC9).

## 📜 Policy meaning (AI-10-1)

⭐ This story introduces **predicates that gate who a member's death benefit is paid to**: *(1) a member's nominee can be changed freely until a claim is
filed; (2) after that, only a genuine, twice-approved correction; (3) a change made on the day of the death or later is discarded.*

**The sentence, in the member's terms (ours, for the Panel to correct):** *"You may change your nominee whenever you like while you are alive. After you
have died, whoever you named before the day you died is who is paid — a change made on that day or afterwards does not count."*

**Checked against the Niyamavali? ⚠ Partly, and honestly.** The Niyamavali is present locally (`docs/legal/niyamavali.md`, git-ignored; the
canonical copy is in a private repo — [[project_legal_corpus_private_repo_split]]) and is an **agent-drafted, unratified design reference — never a
blocker** ([[feedback_niyamavali_rulebook_not_spec]]). It says only that payout is **75/25** between a primary and a secondary nominee and that
**multi-nominee disputes go to State Trustee discretion** (§2.4, R5(E)); it says **nothing** on changing a nominee, a cooling-off period, or a lock.
The sentence was checked against decisions `-233` → `-236`. ⚠ **It stays consistent with R5(E) only if "a dispute between nominees" stays the State
Trustee's and "which version stands" stays the District Admin's** — this story says so explicitly (D4).

## 🎯 What already EXISTS — re-derived 2026-09-20 (⛔ do not rebuild any of it)

**The declaration today.** `replaceMemberNominees` (`packages/domain/src/nominee/declaration-write.ts`) **DELETEs** the member's `member_nominees` rows and
INSERTs the new 1–2 ("latest-wins"); `member_nominees` has PK `(member_id, rank)` and only `created_at`; `member.nominees_declared`
(`packages/domain/src/member/events.ts`) is a **strict** payload carrying **count and split only**. ⇒ **the earlier declaration is destroyed on every
change — no history exists, and none can be recovered.** *"code is not in production"* (`-232`): no legacy rows, ⛔ no backfill.

**The only guard, and a hole.** `TERMINAL_STATES = {withdrawn, anonymized}` in `apps/api/src/modules/nominee/nominee.handlers.ts` (and the same set in
`life-events/handlers.ts`). **Death is an overlay, not a state** ([[project_death_is_an_overlay_not_a_state]]), so it never trips it. ⚠ **Two routes reach the
same `declare` handler:** `POST /member/nominees` — `preHandler: [memberSession]` **only, no step-up** — and the Life Events update, which adds
`requireMemberStepUp(deps, 'nominee_change')`. ⇒ **any active member can skip the step-up by using the signup route** (T1, D9).

**The one rule that reads the nominee for a claim (6.18, UNCOMMITTED).** The District Admin's name check compares the bank-account holder names to the declared
nominee: `deriveNomineeDeclarationToken` (`packages/domain/src/claim/nominee-name-check.ts`) takes `(rank, createdAt)` pairs from
`getMemberNomineeDeclarationRefs` (`nominee/declaration-ref.ts`, which selects the **live** `member_nominees`); the token is re-derived at
`assertNomineeNameCheckForApproval`, `recordNomineeNameCheck`, the GET handler and the console status (`claims.verifier-console.handlers.ts`). The AC2 names read
(`claims.nominee-name-check.handlers.ts`) **decrypts the current rows**. **The claim's consumers of `member_nominees` are exactly TWO:** that name check and the
handover OTP (`claims.service.ts`, `sendHandoverOtp`). Bank accounts carry **no** nominee link (6.8 D1 — no FK, rank or match rule; ⛔ do not add one).

**The date of death — ⭐ no VERIFIED one exists.** `claim_documents.dateOfDeathCiphertext` is the **raw OCR string, un-normalised** (`apps/jobs/src/claim-ocr-parity.ts`
encrypts `ocrFields.dateOfDeath` as read — it may be `"12/03/2026"` or unparseable); the verifier console decrypts it as `extracted.dateOfDeath`. ⛔ There is **no
decided or accepted date field**, and the certificate-acceptance rule is Story 6-21. ⇒ **the determination carries a DATE THE DISTRICT ADMIN ENTERS** (D4).

**Serialisation.** `intakeAdvisoryLockKey(pariwarId, deceasedMemberId)` (`packages/domain/src/claim/icp.ts`, exported) — `tryConverge` takes `pg_advisory_xact_lock` on it,
and **every** intake path (member app, helpline) goes through `tryConverge`. The `claims` row is minted in the same tx as `claim.intake_initiated`;
`claims_deceased_member_id_idx` exists.

**Calendar.** `packages/domain/src/cycle-calendar/holiday-resolver.ts` — `IST_UTC_OFFSET_MS` (canonical), `istDateOf`, `addCalendarDays`. ⛔ Two other copies of the offset
exist (`contribution/facts.ts`, `pool/spawn.ts`) — do not mint a fourth.

**Append-only + RLS models.** `member_addresses` (`schema/member_addresses.ts`, migration `0030`): append-only per-row PK, `GRANT SELECT, INSERT` only, ENABLE → GRANT/POLICY → FORCE, the
`member-addresses-rls.ts` policy pair; migration `0034` adds the **column-level `UPDATE` grant** the RTBF anonymizer needs; the trigger idiom is `0001_events-log.sql`.
**Determination / decision-table models:** `claim_verifier_decisions` (partial-unique `WHERE superseded_at IS NULL`; `reviseDecision`'s conditional `UPDATE … WHERE decision_id AND
superseded_at IS NULL`, 0 rows ⇒ 409), the identity-annotation event shape of `claim.concealment_assessed` (6.15) and `claim.nominee_name_checked` (6.18).
**District-dimension route model:** `claims.nominee-name-check.routes.ts` (a preHandler stashes the server-derived posting district; the client never submits it).
**Pariwar-dimension model:** `claims.cycle-freeze.routes.ts`. **Two-step / conditional-step model:** `resolveEscalation` (`state-trustee-decision-persist.ts`).

## ⚠ THE TRAPS

**T1 — the signup route skips the step-up.** See above. The lock (AC2) protects the period AFTER a claim; the period BEFORE it is protected only by the step-up, and on
`POST /member/nominees` it is absent. In Ravi-mode the filer's session **is** the deceased member's. ⇒ **D9.**

**T2 — a history of PII is an erasure problem.** `member/anonymize.ts` sentinels **every current `member_nominees` row** (`name`/`mobile` → `[anonymized]`, `address` → NULL, rows retained)
and `rtbf-anonymize.test.ts` asserts an **exact statement count** (16 statements, 13 tables) with a comment demanding it be raised — a new PII table that is not added
**survives erasure** (the 10.10 moderation-rationale mistake). ⚠ **RTBF has no claim guard** (`rtbf-legality.ts` — `claim` not found): a **withdrawn** member who later dies, if erased first, **loses
the as-at-death evidence**. **Record as an open governance item (P4); ⛔ do not resolve it here.**

**T3 — Tier-1 ciphertext is NON-DETERMINISTIC** (fresh DEK/IV per call). ⇒ you cannot tell whether a rank changed by comparing ciphertexts, and 6.18's **Trap 4** forbids a name hash
(`declaration-ref.ts`, `nominee-name-check.ts`). The Life Events status response has **no PII**, so the form re-enters everything. ⇒ **append a version for EVERY submitted rank** and accept timeline noise (D2).

**T4 — `member_nominees` has five current-row readers that assume latest-wins:** the search projection (`member/search-projection.ts`), the lock-in gate (`member/lock-in-gate.ts`, `length === 0`), the Life Events
summary (`life-events/handlers.ts`), the data export (`data-export/assemble.ts`) and the 6.18 compare. ⛔ **Widening the PK would silently break them** — keep `member_nominees` as the **CURRENT projection**
and write it in the SAME transaction as each version (D1).

**T5 — module cycle.** `claim/nominee-name-check.ts` imports `nominee/declaration-ref.js`; a `nominee/` → `claim/` import would form a runtime init cycle typecheck cannot see
([[project_type_only_import_cycle_trap]]). ⇒ the claim-filed predicate and lock helper live in **`claim/`** and are composed in the **API handler**.

**T6 — do not put determinations or approvals in `claim_verifier_decisions` / `claim_state_trustee_decisions` / the R9 votes.** `getOriginalDeciderActorIds` (`appeal-eligibility.ts`) unions actors from
all three into the Stage-1 reviewer-conflict set: a row there **silently disqualifies** that actor from reviewing an appeal of the claim. A NEW table avoids it (D4).

**T7 — the console read ceiling.** `VERIFIER_CONSOLE_MAX_READS` (13) counts reads the handler bumps, and `assembleNomineeNameCheckStatus` already makes one read it does not bump (6.18's own review finding). ⛔ **Do not add
the timeline to the console packet** — keep it an ON-DEMAND route like 6.18's names read (D12). ⚠ **AC5 ALSO puts the effective accessor into the console status assembly, and that adds reads.** State them: either a **single-query accessor**, or bump the counter **with a written explanation** — the doc-block says the ceiling *cannot be silently fixed by excluding a newly-added read*.

**T8 — the handover OTP goes to the CURRENT rank-1 mobile** (`sendHandoverOtp` → `nominees[0]`), **before any claim exists and before any death date is known.** Someone holding the deceased's session can rewrite rank-1's
mobile, receive the OTP and file. The rule neutralises the **effect** at verification; ⛔ **it cannot protect the OTP step — no date-based fix is possible at that moment.** **Record it as a known limitation (P2).**

**T9 — a 2→1 change makes rank 2 disappear.** "Reverts to the originally chosen nominee **per rank**" is well-defined only if a vacated rank has a **tombstone version**. A partial write breaks per-nominee reversion (invariant 4).

**T10 — `recorded_at` and the boundary.** `created_at`-style defaults use DB `now()` (transaction-START time); the repo convention elsewhere is an injected clock. The as-at cutoff compares against it — **decide deliberately** (D2). Comparing a `timestamptz` to a date-only certificate date needs an explicit IST conversion.

**T11 — migrations move under uncommitted 6.18.** `0116`–`0118` are 6.18's and untracked; the next number is `0119` **only after 6.18 lands**, and a file with a lower journal `when` than an applied one is silently skipped
([[project_live_db_test_gotchas]] #1). The claim-event count (32 → 33 if D4's event is minted), the six `toHaveLength(32)` pins, and the permission-catalog version (43 / 51 keys after 6.18) are also 6.18's numbers — read them **LIVE**.

**T12 — the planning documents CONTRADICT the ruling in two places.** UX Journey 2/3 and `<NomineeDetailEditor>` say *"Update-nominee path requires Trustee Panel review (fraud guard)"* / *"Trustee-Panel-gated edits"*; `-233`..`-236` allow free change before a claim and a
District-Admin-then-Pariwar-Admin correction after it. And Story 3.4 says *"the latest event is the effective declaration"* — superseded for the as-at-death read. ⛔ **Annotate, never rewrite** ([[feedback_supersede_never_reinterpret]]).

**T13 — mobile.** Drafts persist in MMKV via `components/life-events/draft-store.ts` ([[project_mmkv_asyncstorage_equivalent]]); `useT()` returns a fresh closure every render — depend on `locale`, not `t` ([[project_uset_fresh_closure_memo_trap]]);
any new interpolated copy key needs a **real-`t()`** test leg in **both** locales ([[feedback_stub_must_call_not_transcribe]]). `-227` cl.9's English-name gate covers only the two bank-holder names — ⛔ **do not extend it to declaration names.**

**T14 — the no-comparison fence** (`packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`) scans the name-check files for similarity and normalisation shapes and asserts the source contains `getMemberNomineeDeclarationRefs` and
`isNomineeNameCheckCurrent` — **renaming trips it**. ⚠ **Precisely:** it asserts the **persist** file contains `getMemberNomineeDeclarationRefs` (~line 96) and the **check** file contains `isNomineeNameCheckCurrent` (~103), and that neither contains `decrypt` / `nameCiphertext` / `getMemberNominees(`. AC5 swaps every site to `getEffectiveNomineeDeclaration`, which trips the first — **amend the test, never weaken it**: the check/persist path gets a **ref-only shape** (rank, version identity, ⛔ no ciphertext) and only the handlers' names read gets the ciphertext shape. The test file is in the UPDATE list. Any decrypt-and-show for the timeline lives OUTSIDE those files.

**T15 — a residual risk the story cannot remove.** A correction **inherits** the corrected version's `effective_at`. Two approvals could therefore back-date a **different** person into a pre-death slot. The only defence is the **two human approvals** (and the relationship shown beside the old and new details) — ⛔ the system compares no names. Name it so nobody believes the code prevents it.

## ⚖️ Decisions — the AUTHOR's (BigDev's; ⏳ PROPOSED here, confirmed in Task 0 as an author-commit like `-228`)

⛔ None is the Panel's — each is "the code should do X" (the Panel-routing §0 gate) — **except D14**, whose default reading of *"that nominee's claim will be denied"* is carried as **P1**.

- **D1 — a NEW append-only `member_nominee_versions` table; `member_nominees` stays the CURRENT projection** (T4). Per **rank** (CHECK 1..2), `version_no` monotone per `(member_id, rank)` with a UNIQUE index (the race backstop under D3 — *"the index is the backstop, the typed error is the interface"*), Tier-1 `name` / `mobile` / `address` ciphertext (`piiColumn(1,'member_nominee')`), `relationship`, `split_pct`, `recorded_at`, a `declaration_id` grouping the ranks of one submit, a `source` (`member` | `correction`), an `effective_at` (D7), a link to the `member.nominees_declared` event version, and a **tombstone form** for a vacated rank (T9 — `name`/`mobile` are NOT NULL today: a sentinel, or nullable with a coherence CHECK — the 0107 precedent). RLS pair copied from `member-addresses-rls.ts`; ENABLE → GRANT/POLICY → FORCE; grant `twt_app` `SELECT, INSERT` + the column-level `UPDATE` on the three ciphertext columns for RTBF (`0034`) with a **column-aware trigger** rejecting any other UPDATE and every DELETE/TRUNCATE (the `0001` idiom). ⚠ **The migration creates NO versions — ⛔ no backfill, ⛔ nothing fabricated.** The first version is written by the first declare after the migration; the effective accessor **FAILS CLOSED** (a typed error) on a projection row that has no version — a dev database holding old rows is **reset, not back-filled**.
- **D2 — a version for EVERY submitted rank on every declare, no dedup** (T3); `recorded_at` = **database time taken with `clock_timestamp()` AFTER the D3 advisory lock is acquired** — ⛔ not `now()` (transaction-START: a transaction that waits on the lock could be stamped before midnight and commit after it), ⛔ not an app clock (arch §1.11).
- **D3 — the lock.** In the nominee-edit transaction: (1) `pg_advisory_xact_lock(intakeAdvisoryLockKey(p, m))` **first**, taking no other lock before it; (2) then `EXISTS (SELECT 1 FROM claims WHERE pariwar_id = $1 AND deceased_member_id = $2)` with **no state filter**; (3) then write. Under READ COMMITTED, whichever transaction holds the lock first wins: an edit that commits first is legitimately "before the claim", and an intake that wins makes the edit refuse with a typed **409** (`nominee.locked_claim_filed`). Predicate and helper in **`claim/`**, composed in the API handler (T5). ⛔ Not the member device-binding lock (`hashtext(member_id)`).
- **D4 — the determination record: a NEW decision table (T6), not an event alone.** Live-row unique per claim (a partial-unique `WHERE superseded_at IS NULL`), supersession by the conditional `UPDATE … WHERE decision_id AND superseded_at IS NULL` (0 rows ⇒ 409); a header (the acting District Admin's **snapshotted** display name via `getDisplayName` — ⛔ never email-derived, ⛔ never from the request; a **required Tier-1 note**; the **Tier-1 certificate date the District Admin entered**, `YYYY-MM-DD`) and **per-version items** (`stands` | `discarded`). **One claim identity-annotation event in the SAME tx** (the 6.15 / 6.18 shape: row and event atomic, the reducer a no-op, payload ids and counts only — ⛔ no date, name or hash) — recommended; it moves the six `toHaveLength(32)` pins. *"Nominees dispute each other"* stays the **State Trustee's** (R5(E)); *"which version stands"* is this record — the District Admin's.
- **D5 — the effective declaration.** **TWO functions.** `getEffectiveNomineeDeclaration(db, pariwarId, claimCaseId)` reads the live determination and returns, per rank, **the standing version = the HIGHEST `version_no` among the versions the determination marks `stands`** (⚠ a version with **no item** is **not standing until determined** — fail-closed; an **empty** effective declaration also fails closed with a typed 409 and can never approve); and the **pure** `versionStandsAt(effectiveAt, certificateDate)` (D6). Every 6.18 site (AC5) calls it. The staleness token derives from **version identity per rank + the determination's revision** — ⛔ no name, ⛔ no name hash (Trap 4). ⭐ **A SEAM to cut the coupling:** 6.18's remaining patches land an accessor **now** that returns the current rows; 6.20 swaps its implementation.
- **D6 — the cutoff.** A version **stands iff its `effective_at` is before the IST start-of-day of the certificate date the District Admin entered**; the day of death and after are discarded (`-235` Y). ⭐ **`effective_at`, ⛔ not `recorded_at`:** for a member's own change `effective_at = recorded_at`; a **correction inherits the corrected version's `effective_at`** (D7) — so a genuine post-claim correction, whose `recorded_at` is necessarily after the death, is never mistaken for a post-death change. Reuse `cycleCalendar.IST_UTC_OFFSET_MS` / `istDateOf` — ⛔ no fourth copy. ⭐ **`versionStandsAt` is a PURE helper used ONLY to VALIDATE the District Admin's determination** — a version marked `stands` must have its `effective_at` before the cutoff, one marked `discarded` must not, and an inconsistent determination is refused with a typed 409 — ⛔ **never to pre-select, highlight, label or auto-mark** (invariant 1, AC3). It needs the start-of-IST-day instant, and `istMidnightAt` is **private** in `holiday-resolver.ts`: **export it there** (⛔ no fourth copy). Nothing on the member side holds a date of death — the date is the District Admin's input.
- **D7 — the correction route.** ONE correction row with a `step` column (`da_pending` → `pa_pending` → `applied` | `declined`) and a conditional `UPDATE … WHERE correction_id AND step = …` per step (0 rows ⇒ 409); the **two approvers must be DIFFERENT people** (a domain-level check, the news author≠reviewer precedent); each step records a snapshotted display name and a **required note** (`-236` CC3 default); the **Pariwar Admin's** step applies the change — a new version with `source = 'correction'` **and `effective_at` inherited from the version it corrects** (invariant 5) — and updates `member_nominees`, all in one tx; the row carries the **`claim_case_id`** (so the District Admin's district is derived from the claim, as the name-check routes do, and a correction ties to ONE claim), the member and **rank**, the **`target_version_id` — which must be the rank's CURRENTLY STANDING version** (a correction of a discarded or superseded version is refused with a typed 409), the **proposed Tier-1 name / mobile / address / relationship**, **who raised it and through which channel**; it is **refused when no claim exists** (before the first claim the change is free — there is nothing to correct); the **relationship** the family states must be **known** (an enum value; `other` is P3) and is **shown beside the target's declared relationship** — a difference is **shown, ⛔ never blocked**; and ⚠ **a correction applied while a live determination exists SUPERSEDES that determination**, so AC5's 409 fires again until the District Admin redetermines (a version with no item does not stand). ⚠ CC2 default: raised by the **helpline operator** on the family's behalf or by the **family through the app**; ⛔ never the District Admin alone.
- **D8 — permission keys**, each with its own doc-block reuse-check, minted in **ONE author-commit decision in Task 0** (`-195` cl.2, `-228`, `-236` consequence 2; ⛔ not inside a build story): (1) the District Admin's **determination** — district dimension, `district_admin` (a new key is defensible: it is a different judgement from `claim.check_nominee_name`); (2) the District Admin's **correction approval** — district dimension; (3) the Pariwar Admin's **correction approval** — Pariwar dimension, `pariwar_admin` (direct `state_trustee` gating is RANK-ORDER BLOCKED); (4) **raise a correction** for the helpline operator. The **timeline READ** may reuse `claim.view_nominee_name_check` (the four holders) — it decrypts the same class of living-subject PII. Names are the developer's. Compute the catalog version from a **LIVE read after 6.18 lands**.
- **D9 — the step-up bypass: FIX it.** A **re-declaration** (the member already has a version) requires `nominee_change` step-up on **both** routes; the **initial** declaration is unchanged. **Mechanism:** `requireMemberStepUp` is a **static** preHandler — a conditional check is NEW code inside the `declare` handler (403 `auth.step_up_required` when a re-declaration lacks a fresh step-up), reusing the same verification. **Signup wizard:** back-navigation re-declares in the pre-lock-in states (`pending-kyc` / `pending-fee` / `pending-valid`) stay **exempt** — the handler already permits them (INFERENCE: a step-up there is added friction; confirm). ⚠ Author's proposal; the alternative — stating it as accepted — leaves the pre-claim period defended by nothing on the signup route.
- **D10 — the timeline shows metadata** (rank, when, `source`, relationship) **beside the certificate-date field**; the District Admin can open the **decrypted snapshots on demand** in the authorized route (decrypt-after-authorize, strict helpers, an audit line with ids only — 6.18's names read is the model). ⛔ It computes **no "this changed" diff** (invariant 6, T14).
- **D11 — RTBF and DSAR.** `anonymize.ts` gains a statement for **EVERY new PII-bearing table** — the **versions** (name/mobile → sentinel, address → NULL), the **determinations** (the Tier-1 note and the Tier-1 certificate date) and the **corrections** (the proposed nominee's Tier-1 fields and the notes) — and the statement-count test moves by **more than one** and is raised **in the same commit**; the DSAR export includes the versions (INFERENCE: they are the member's data — confirm); a **retention-matrix row** is owed (architecture §2.12 names data classes; nominee history is not one). ⚠ **P4.**
- **D12 — the timeline is an on-demand route, ⛔ not in the console packet** (T7).
- **D13 — migrations** hand-authored from **0119 after 6.18 lands**, journal entry each (idx+1, a larger `when`), ⛔ never regenerate an applied one, ⛔ no snapshot; new tables: versions, determinations (+ items), corrections. A migration-level policy spec asserts RLS positive / negative / fail-closed / FORCE, the FKs, the UNIQUE keys and the CHECKs directly (checklist family 5).
- **D14 — "denied", default reading (⭐ P1) — ⚠ PROVISIONAL: ⛔ NOT part of Task 0's author-commit; it is our UNRATIFIED reading of `-234` V and waits for P1.** There is **no per-nominee claim entity** to deny: one claim per death, and bank accounts carry no nominee link. The default: **the determination marks versions `discarded`, so the standing declaration is the nominee the member chose** — and the consequence flows through **6.18**: bank accounts not held by the as-at-death nominee fail the name check (`does_not_match`), which `-226` cl.6 sends **back for correction, never denied**. ⛔ **No new lifecycle state, no automatic denial.** A whole-claim refusal, if the Panel wants one, **reuses the existing verifier denial with a reason code** (appealable **once**, 6.16 D-F); a family that never supplies the right account reaches Story **6.19's** closure (the non-appealable *second refusal*).
- **D15 — a determination is MANDATORY for every claim, including an explicit "no discards" one.** It is fail-closed under invariant 1: a first declaration made **after** the death would otherwise go unexamined. ⚠ It is **new required District Admin work on every claim**, in no ruling — recorded so it is a decision.
- **D16 — the projection.** `member_nominees` is **always the LATEST version by `version_no` per rank**, ⛔ never the effective set; **a discard does not change it**. Consumers that therefore still see the discarded nominee: the search projection (a non-PII summary), the Life Events summary, the lock-in gate (counts) and the handover OTP (P2). A **correction's version becomes the latest**, so the projection then shows the corrected nominee. The DSAR export includes the versions **with their determination status** (D11).
- **D17 — determinations are per claim and independent; and a stale one cannot be written.** With **two claims for one death** (a fresh claim after `denied` is allowed) each has its **own** determination; a later claim's form **pre-fills nothing** and shows the earlier ones **read-only**. A determination carries a **watermark** — each rank's highest version at the moment it was read — and a write against a stale watermark (a correction landed meanwhile) is a **409**. Its writer also validates the resulting effective set: the rank set is `{1}` or `{1,2}` and the splits sum to 100 (split is **server-derived**, R4 — versions written in one declare share an `effective_at`, so they are treated alike and coherence holds by construction).

## ⚖️ Open Panel questions — the PANEL's (Task 0 batches them into routing notes from the TEMPLATE, §0 gate first)

⭐ **Routing notes drafted 2026-09-20 (⏳ unsent), from the TEMPLATE, §0 gate first, E4 commands run:** P1 (+ P2 as a "one limit this ruling cannot remove") → `trustee-panel-routing-note-2026-09-20-6-20-what-denied-means.md`; P5 → `…-6-20-living-member-locked.md`; P3 + `-236` CC2/CC3 → `…-6-20-confirm-our-defaults.md` (a confirmation, not a decision — defaults stand if unanswered). ⛔ **P4 is not a Panel note** (counsel's go-live gate). Each carries **what it blocks**.

- **P1 — what does *"that nominee's claim will be denied"* mean, when there is no claim per nominee?** `-234` V says a post-death change makes *"that nominee claim … denied and only nominee that was chosen by member will receive the claim."* The system has **one claim per death** and its bank accounts carry **no** nominee link. **Our default (D14):** the changed version is **discarded**, the name check then **sends back for correction** any account not held by the member's chosen nominee (`-226` cl.6: never denied for a name), and a family that never answers reaches 6.19's closure. **The alternative:** the District Admin **denies the whole claim** on discovering the change (a first refusal, appealable once) and the member's chosen nominee **files anew** (a fresh claim after `denied` is allowed). *Blocks AC4's consequence wording and the copy the family sees.*
- **P2 — the handover OTP (T8).** It is sent to the **current** rank-1 mobile before any death date is known; the rule cannot protect that step. **Is this an accepted limitation?** (The alternative — an OTP to a mobile on record before the claim — has no date to key on.) *Blocks nothing; recorded so it is a decision, not an oversight.*
- **P3 — is `relationship = other` a "known" relationship?** `-234` W: *"Only if we know the relation we can allow genuine mistake."* The enum is `spouse | child | parent | sibling | other`, and `relationship` is NOT NULL. **Our default: `other` counts as known only if the approvers record what it is in their note.** *Blocks AC7.*
- **P4 — erasure against evidence (T2).** A **withdrawn** member's record may be erased; if that member later dies, **the as-at-death declaration is gone**. **Counsel's** (Story 0.13), tracked like 6.16 D-G — a go-live gate, ⛔ not a build blocker. Also: **a retention row** for the history.
- **P5 — a permanent lock on a LIVING member.** The lock is *any claim ever filed*. A **helpline operator can mint a claim for any member id** (`memberExists` is the only check in the helpline intake), and a nominee in Ravi-mode can too; if that claim is **denied because the member is alive**, the lock **stays for life** — and `-234` X says *everything may be changed as long as the member is alive*. The correction route allows only genuine mistakes, ⛔ never substituting a person. **Our default: an accepted limitation, recorded.** The alternative is a **release route** (a claim found to be for a living member unlocks the declaration), which needs a claim outcome that does not exist today. *Blocks nothing; recorded so it is a decision, not an oversight.*
- **CC2, CC3 (`-236`)** stand at their defaults (D7) and are ⛔ **not ratified**; **CC1** belongs to Story 6.21.

## Acceptance Criteria

### AC0 — Governance first (Task 0)
**Then** `-233` → `-236` are **committed** (✅ done at `b06978ca`) **and** ONE author-commit decision lands the four keys (D8), D1–D13 and D15–D17 (⛔ **not D14** — provisional, waits for P1), and the `epics.md` entry with the `> ⚠ Minted by…` header — annotating, ⛔ never rewriting, Story 3.4's *"the latest event is the effective declaration"* and the UX Journey 2/3 and `<NomineeDetailEditor>` *"Trustee Panel review"* lines (T12); **and** P1–P5 are batched into routing notes from the template (§0 gate first; over-routing is a cost); **and** a **retention-matrix row** and the AR-61 `{primary_actor, fallback_actor, escalation_trigger}` entries for the correction loop are recorded; **and** the sprint row stays `backlog` until P1, Task 0 and Story 6.18 are done.

### AC1 — Every version is kept (`-234` V)
**Given** any declare, on either route **Then** in the **same transaction** as the `member_nominees` write, a version is appended **per submitted rank** (D2) plus a **tombstone** for a vacated rank (T9); ⛔ nothing is UPDATEd or DELETEd
**And** the table is append-only (grant + column-aware trigger), RLS + FORCE, Tier-1 ciphertext, a `version_no` UNIQUE per `(member_id, rank)`
**And** `member.nominees_declared`'s payload stays **strict** and gains only **optional, non-PII** fields (version numbers per rank, `source`); ⛔ no name, mobile or address in any event or audit line
**And** ⛔ no backfill — the first version is the declaration at migration time.

### AC2 — The lock at the first claim (`-233`, `-234` V)
**Given** any claim was ever filed for the member as the deceased **Then** both routes refuse a declare with the typed **409** `nominee.locked_claim_filed`, decided under the intake advisory lock (D3) so an edit and an intake **serialise** — ⛔ never keyed to the `account-frozen` overlay, ⛔ never `getClaimByDeceasedMember`
**And** it holds **after settlement and after a denial** (the overlay is gone by then; the claim row is not), and it is **tenant-scoped** (a claim in another Pariwar is a miss); the existing `withdrawn` / `anonymized` guard stays as it is
**And** the member sees the locked state in the app (AC8) and the API exposes a `locked` flag on the status response
**And** (D9) a **re-declaration** — the member already has a version — requires the `nominee_change` step-up on **both** routes once the member has left the signup wizard; the **initial** declaration and the wizard's own pre-lock-in re-declares are unchanged; tests cover both routes, both states and a missing step-up (**403** `auth.step_up_required`).

### AC3 — The timeline (`-234` V, `-235` Y; D10, D12)
**Given** the District Admin holds the read key for a claim in their district **Then** an **on-demand** route returns each rank's versions — when, `source`, relationship — **beside a certificate-date field**, and can open the **decrypted snapshots** (decrypt-after-authorize, strict helpers, an audit line with ids only)
**And** each version shows **BOTH `recorded_at` and `effective_at`** and its `source` (a genuine correction is recorded after the claim but inherits an earlier position — showing only "when" would make it look post-death); ⛔ it computes **no diff** and highlights, pre-selects or labels **nothing** as "after the death" — the District Admin reads and decides (invariant 1)
**And** it is ⛔ **not** part of the console packet (T7).

### AC4 — The determination (`-235` Y; D4, D6, D14; **BLOCKED on P1 for the family-facing wording**)
**Given** the District Admin has read the timeline **Then** they record a **determination**: the **certificate date they entered** (`YYYY-MM-DD`), each version **`stands` or `discarded`**, and a **required note**. The form **pre-selects NOTHING**: the District Admin marks each version. The writer then **validates** the marks against D6's rule (a version marked `stands` must have `effective_at` before the cutoff, one marked `discarded` must not) and refuses an inconsistent determination with a typed 409 — a guard, ⛔ never a default and ⛔ never applied by the system (invariant 1). ⚠ [[feedback_spec_edits_must_propagate_to_tasks]]: no Task may order a highlighted "this changed" default.
**And** the row snapshots the District Admin's display name server-side (a missing name blocks the action), supersedes any live determination with the conditional `UPDATE` (0 rows ⇒ 409), and emits its identity annotation in the **same** tx (a forced failure mid-way leaves neither)
**And** a **new determination stales any earlier name check** (AC5)
**And** the writer also enforces (D5, D17): **every current version has an item** (a version with none does not stand), the **watermark** — each rank's highest version at read time — is still current (a correction that landed meanwhile ⇒ **409**), and the resulting effective set is coherent (rank set `{1}` or `{1,2}`, splits summing to 100).

### AC5 — 6.18's name check reads the declaration in force (`-236` consequence 4)
**Then** every site that reads the current rows today — `assertNomineeNameCheckForApproval`, `recordNomineeNameCheck`, the GET handler's token and its AC2 names read, the console status assembly — calls `getEffectiveNomineeDeclaration` (D5); the **token** derives from **version identity per rank + the determination revision**; `nominee_declared_at` comes from the **effective** set
**And** approval refuses (**409**, e.g. `nominee_determination_required`) **until a live determination exists** — an explicit **"no discards"** determination counts, because the system ⛔ never decides that nothing changed (invariant 1)
**And** an **empty** effective declaration also refuses; and a **correction applied while a determination is live supersedes it** (AC7), so the 409 fires again until the District Admin redetermines
**And** the console status assembly's added reads are stated and the ceiling handled (T7); the fence test is **amended, never weakened** (T14)
**And** the no-comparison fence and Trap 4 still hold (a test plants a violating snippet and sees it go red).

### AC6 — Per nominee (`-235` AA)
**Then** discarding one rank's post-death version **reverts that rank to its own earlier version** (or to *vacated* if it had none) and ⛔ leaves the other rank untouched; tests cover **1→2, 2→1, and a change to one of two nominees**.

### AC7 — The correction after the first claim (`-234` W, `-236` Z; D7; **BLOCKED on P3**)
**Given** the declaration is locked **Then** a **genuine mistake** can be corrected only through **one** correction row (D7's shape: a `claim_case_id`, the rank's **STANDING** version as its target — a correction of a discarded version is refused — and refused when no claim exists) that the **District Admin approves first and the Pariwar Admin second — two DIFFERENT people** *(D7, an author add — ⛔ not in the ruling)*, each with a required note; a **decline at either step stops it** *(reading, `-236`)* and the declaration stays as it was
**And** the **relationship** is recorded and must be **known** (P3); *"Rani Kumari → Rani Devi"* is the worked example (⚠ the ruling's wording is *"not name of female change"*, which we read as *"note"*) of a genuine name difference — the same person
**And** the Pariwar Admin's step appends a version with `source = 'correction'` and **`effective_at` inherited from the version it corrects**, so the timeline never shows a genuine correction as a change to discard (invariant 5); it also updates `member_nominees`, in one tx
**And** ⛔ a **different person** is never a "mistake" — the approvers see the relationship beside the old and new details (advisory; ⛔ the system compares no names).

### AC8 — The surfaces
**Then** **member app:** the locked state, a **correction request**, copy in **en + hi** through the real `t()` (a member-facing namespace: both locales, the registry lines, and a test resolving a real key), draft persistence via MMKV, the warning that **changes stop at a claim** written to the three-part grammar (what is wrong, what to do, the helpline) in the grief-respectful register, a `friction-budget.md` line; **admin:** the District Admin's timeline panel + determination form, and the two approval surfaces (the `<NomineeDetailEditor>` review states are reusable), staff copy **English-only** in `i18n-en.ts`, a **fresh `key` per claim and per token change** (6.18's review found stale carry-over), the sticky decision-strip pattern (UX-DR54) with the note mandatory **before** submit; **a11y (family 13):** status is never colour alone, every reachable state (`locked`, `determined`, `discarded`, `approved`, `declined`) is **announced**, a labelled container is `accessible={true}`.

### AC9 — RTBF, export, audit
**Then** `anonymizeMember` covers **all three new PII-bearing tables** — the versions, the determinations (Tier-1 note + certificate date) and the corrections (proposed nominee fields + notes) — and its statement-count test is raised in the **same** commit (by more than one); the DSAR export decision (D11) is made and tested; each new mutation and the timeline read carries an audit line (ids and codes only, `resourceLocator: 'claim:<uuid>'` so the row can name the claim); new `AuthAuditEventType` entries in `apps/api/src/audit/audit-sink.ts`.

### AC10 — Nothing else moves
**Then** `member_nominees` remains the CURRENT projection (T4) — always the LATEST version by `version_no`, ⛔ never the effective set (D16); the handover OTP still reads the current rank-1 mobile (P2, T8); ⛔ no join between bank accounts and nominees; ⛔ no new claim lifecycle state; ⛔ `voteOnFrozenClaim` and the 6.16 appeal rules are untouched; the signup flow for an **initial** declaration is unchanged (D9).

### AC11 — The proof
**Then** live-DB specs on `twt-test-pg :5433`, **executed** ("written but not run" is ⛔ not a pass): the version chain over 1→2→1, tombstones, `version_no` uniqueness under **two connections**; the **lock races** (an edit racing an intake — exactly one wins; **two connections**), the lock after settlement and after denial; the effective accessor at the boundary (a change at 23:59 IST the day before stands; at 00:00 on the day of death is discarded — tested on `effective_at`, and a **correction recorded after the death but inheriting an earlier `effective_at` STANDS**); per-nominee reversion; the determination's conditional supersession (two connections); the token staling on a new determination; the correction's two steps (same approver refused, a decline stops, the inherited position); the **RTBF spec** proving no ciphertext survives; **cross-Pariwar** and **non-human/system-actor** denial per new route; the human-actor gate entries for **every** new mutation route (`scripts/claim-adjudication-human-actor-invariant/check.ts` — ⚠ 6.18's review found it hand-maintained and blind to a non-literal route path, so plant a violation and see it go red); the migration-level policy spec; the i18n real-`t()` leg in both locales; a `*-shape.spec.ts` for the timeline read model; a **2→1→2 sequence across the death boundary** (rank 2 reverts to the **tombstone** from the 2→1, not to v1); a **correction-then-determination** ordering (the determination is superseded and the 409 fires again); a correction of a **discarded** version refused; a correction **before any claim** refused; **two claims for one death** with independent determinations; a stale **watermark** refused; and a claim minted for a member id and then denied leaving the lock (P5 — recorded, not fixed); a `{ timeout: 20000 }` on new **domain** live specs (`packages/domain/vitest.config.ts` sets none); fixtures that **reach** the branches (a post-death version, a discarded rank, a correction) — or the arms are unreachable.

## Tasks / Subtasks

- [ ] **Task 0 — Governance first** (AC0)
  - [ ] Commit-first: `-233` → `-236` ✅ (`b06978ca`). Write the author-commit decision (D1–D13 and D15–D17, the four keys — D8; ⛔ **not D14**, which is provisional and waits for P1), re-verify every claim under *What already EXISTS*.
  - [ ] Batch P1–P5 into routing notes from `trustee-panel-routing-note-TEMPLATE.md` (§0 gate first; E4 commands run — an **empty** result is a finding).
  - [ ] `epics.md` entry + header; annotate Story 3.4 and the UX lines (T12); the retention-matrix row; the AR-61 entries; record P4 with the go-live gate (counsel, Story 0.13).
- [ ] **Task 1 — Migrations** (AC1, AC4, AC7) — ⛔ start only after 6.18 lands; numbers from **0119** read LIVE (D13): versions, determinations + items, corrections; the migration-level policy spec.
- [ ] **Task 2 — The history and the lock** (AC1, AC2) — `declaration-history.ts` (append + read), `declaration-write.ts` (append in the same tx), the `claim/` predicate + lock helper, both routes' guards, the D9 step-up, the typed 409, the widened strict event payload.
- [ ] **Task 3 — The effective declaration** (AC4, AC5, AC6 — ⚠ the family-facing wording is **BLOCKED on P1**) — `getEffectiveNomineeDeclaration`, the cutoff (D6), the token, the determination writer, the seam for 6.18 (D5); **then change 6.18's five sites**.
- [ ] **Task 4 — The timeline and the determination routes** (AC3, AC4 — ⚠ the wording **BLOCKED on P1**; ⛔ the form pre-selects NOTHING) — the on-demand read route, the write route, the keys, the audit types, the human-actor gate entries.
- [ ] **Task 5 — The correction route** (AC7 — ⚠ **BLOCKED on P3**) — raise / DA approve / PA approve, the two-different-people check, the inherited `effective_at`, P3.
- [ ] **Task 6 — RTBF, export, retention** (AC9) — the anonymizer statement + the raised count test, the DSAR decision, the retention row.
- [ ] **Task 7 — Keys and gates** (D8; serves AC3, AC4, AC7) — mint the four keys (catalog version read LIVE + counts + `roles.ts` + `permissions.test.ts` + `roles.test.ts`).
- [ ] **Task 8 — Surfaces** (AC8) — mobile, admin (timeline, determination, approvals), i18n both locales, the friction-budget line, family-13 assertions.
- [ ] **Task 9 — Tests** (AC11) — **execute** on `twt-test-pg :5433`.

## Dev Notes

### Dependency and sequencing
**6.18 first**: its remaining patches (the seam D5, the return/R9 mutual exclusion, D4's returned-claims list), and migrations `0116`–`0118`. This story's numbers start at **0119**. ⚠ 6.18's review found its tests pin defects and its `seedNomineeNameCheck` seeds a passing check **unconditionally** — do not copy its helpers blindly; the fixtures here must reach a post-death version, a discarded rank and a correction.

### Files — UPDATE (read each completely first) and NEW
**UPDATE:** `packages/domain/src/nominee/{declaration-write,declaration-read,declaration-ref}.ts`; `packages/domain/src/member/{anonymize,events}.ts`; `packages/domain/src/data-export/assemble.ts`; `packages/domain/src/claim/nominee-name-check.ts` + `-persist.ts`; `apps/api/src/modules/nominee/{nominee.handlers,nominee.routes}.ts`; `apps/api/src/modules/life-events/{handlers,routes}.ts`; `apps/api/src/modules/claims/{claims.nominee-name-check.handlers,claims.verifier-console.handlers}.ts`; `apps/api/src/audit/audit-sink.ts`; `apps/api/src/types.ts` (a district stash); `packages/contracts/src/nominee/declaration.ts` + `claims/nominee-name-check.ts` + `claims/verifier-console.ts`; `packages/contracts/scripts/emit-openapi.ts` (its description says *"Replaces any prior declaration (latest-wins)"* — false after this) and `openapi/v1.yaml`; `apps/mobile/app/(life-events)/nominees.tsx`, `(signup)/nominees.tsx`, `components/life-events/{NomineeForm,useStepUpGate}.ts*`; `packages/i18n/locales/{en,hi}/common.json`; `apps/admin/src/routes/VerifierConsoleRoute.tsx` + `modules/claim-verification/*`; `packages/domain/src/rbac/{permissions,roles}.ts`; `scripts/claim-adjudication-human-actor-invariant/check.ts`; **`packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`** (amend, never weaken — T14); **`packages/domain/src/cycle-calendar/holiday-resolver.ts`** (export the start-of-IST-day helper — D6); the six `toHaveLength(32)` pins (6.18's numbers).
**NEW:** the versions / determinations / corrections tables + RLS policy files (`policies/index.ts`, `schema/index.ts`); `packages/domain/src/nominee/declaration-history.ts`; the claim-filed predicate in `claim/`; the timeline / determination / correction handlers and routes; contracts DTOs (⛔ never import `@twt/domain`); the admin timeline panel (model `NomineeNameCheckPanel.tsx`).
**⛔ NEVER:** widen `NomineeDeclarationRowRef` with a name or a hash; put decisions in `claim_verifier_decisions` / `claim_state_trustee_decisions` / R9 votes (T6); use `getClaimByDeceasedMember` or the overlay for the lock; edit `packages/channels/src`.

### Testing standards
Live-DB traps ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]], [[project_ci_local_double_run_pollution]]): never regenerate an applied migration (42P07); never `DROP SCHEMA` (42P01); **assert membership, not counts**; `env -u DATABASE_URL` skips integration specs **silently** — a green run is ⛔ not proof; expect 5 s timeouts under `--concurrency=4`. Exemplars: `packages/domain/tests/integration/member/life-events-tables.spec.ts` (the new-table spec model), `apps/api/tests/integration/nominee/nominee-declare.spec.ts`, `packages/domain/tests/member/rtbf-anonymize.test.ts` (the exact-count test), `apps/api/tests/integration/claims/cycle-freeze.spec.ts` (two-connection races).

### References
- `.decision-log.md` — `2026-09-20-233`, `-234`, `-235`, `-236` (the rule set); `-232`, `-226` cl.6, `-227` cl.9, `-195` cl.2, `-228`.
- `_bmad-output/implementation-artifacts/6-18-nominee-holder-name-on-the-verification-console.md` (`### Review Findings`, AC2, Task 4e); `6-19-correction-return-reminders-and-closure.md` (D5, the closure); `6-16-…` (D-F).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-20-6-18-nominee-change-after-death.md`; `…-TEMPLATE.md`.
- PRD `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` (FR-4, FR-5, FR-31, FR-37, FR-38, FR-47, FR-96, §4.14); `architecture.md` (§2.7, §2.12, §1.11, AR-12, AR-24, AR-61); `ux-design-specification.md` (Journeys 2–3, `<NomineeDetailEditor>`, UX-DR34/40/44/54/55/57/66/67); `epics.md` (Stories 3.4, 3.9, 3.12, 6.5, 6.8).
- Code: `packages/domain/src/nominee/*`, `packages/domain/src/schema/member_nominees.ts`, `packages/domain/src/member/{anonymize,events,overlay}.ts`, `packages/domain/src/claim/{icp,nominee-name-check,appeal-eligibility}.ts`, `packages/domain/src/cycle-calendar/holiday-resolver.ts`, `apps/api/src/modules/{nominee,life-events}/*`, `apps/api/src/modules/claims/claims.{service,nominee-name-check.handlers,verifier-console.handlers}.ts`, `apps/jobs/src/claim-ocr-parity.ts`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-20 | Created by the create-story workflow from `-233` → `-236`, three parallel read-only research passes (planning documents; member-side / data code; claim-side dependencies) and six live re-verifications. ⚠ `backlog`, ⛔ not `ready-for-dev` — P1, Task 0 and Story 6.18 outstanding. ⛔ Not yet run through `validate`. |
| v0.2 | 2026-09-20 | Applied a fresh-context validator's findings, **each re-verified in the tree first** (the fence-test assertions, the private `istMidnightAt`, and that the helpline intake checks only `memberExists`). **Critical:** AC3/AC4 contradicted each other on highlighting → the form **pre-selects nothing** and D6 is a **validator-only** pure helper (`versionStandsAt`); "which version stands" per rank was undefined → **the highest `version_no` among versions marked `stands`**, a version with no item does **not** stand, an empty effective declaration fails closed; a correction may target **only the standing version**; a correction applied while a determination is live **supersedes** it, and the determination carries a **watermark**; the correction row's shape (claim link, target, proposed details, raiser, refused before any claim); the projection question (D16: always the latest by `version_no`, never the effective set); the erasure sweep covers **all three** new PII tables, not just the versions; D14 removed from Task 0's author-commit (provisional, waits for P1); a permanent lock on a **living** member → **P5**. **Should-fix:** the fence test in the UPDATE list (amend, never weaken); export `istMidnightAt`; the console read budget; D9 gets a mechanism, an AC and the signup-wizard exemption; the first-version/no-backfill contradiction; `recorded_at` via `clock_timestamp()` after the lock; readings labelled as readings; `recorded_at` **and** `effective_at` on the timeline; two claims for one death (D17); D15 (a determination is mandatory); BLOCKED tags on Tasks 3–5; more test cases. ⚠ Not re-validated after these edits. |
| v0.3 | 2026-09-20 | Open Panel questions now point at three drafted, unsent routing notes (P1+P2, P5, P3+CC2/CC3). ⛔ No rule, AC or Task changed. |
