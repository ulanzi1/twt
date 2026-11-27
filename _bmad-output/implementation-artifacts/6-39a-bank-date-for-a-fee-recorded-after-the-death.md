---
baseline_commit: 6536b8bb
---

<!--
RE-PINNED (v1.3, 2026-11-27): the branch was REBASED onto `origin/main` `6536b8bb` (253 commits; backup
`backup/6-39a-pre-rebase-2026-11-27`; every file's changed-line set vs `origin/main` equals the backup's vs `90535934`); the ledger
line `2026-11-21w` was RELABELLED `2026-11-21ar` (`main` holds `w` — Story 3.13, landed first). Two facts, stated apart: the pin
`6536b8bb` is the merge-base (durable); the code claims were RE-DERIVED at `6536b8bb` on 2026-11-27 by two fresh-context verifiers
(perishable — Task 0.1 re-derives them again). Between `90535934` and `6536b8bb` the paths this story builds on did ⛔ move but for one
comment in the gate leaf and one admin label (`trustee_verified` → *"checked by staff"*, Story 3.13). The ORIGINAL authoring pin follows.

PINNED (authoring): `90535934` = `origin/main` (`git fetch origin` 2026-11-21, at authoring — Story 6.39 landed, PR #331). Authored in its OWN
worktree `/Users/dev/Developer/projects/TWT/.claude/worktrees/6-39a-bank-date-for-a-fee-recorded-after-the-death`, branch
`story/6-39a-bank-date-for-a-fee-recorded-after-the-death` (upstream UNSET — push with an explicit refspec,
[[project_story_branch_upstream_is_main]]). The main checkout was ⛔ switched ([[feedback_shared_tree_branch_switch]]): at authoring
three peer sessions were live (twt-fe, twt-6c busy; twt-a2 idle) and two fresh worktrees sat at `90535934` (`3-13-…`, `12-5-…`).
Every `apps/` / `packages/` claim below was traced at `90535934` on 2026-11-21 and the load-bearing ones re-read by hand (the
membership-check handler, writer, gate leaf and schema; `0212`'s guard; the `finance_officer` role; the verifier console's key).
Re-locate by FUNCTION, ⛔ by line number — line numbers rot.
RE-TRACED at validation (v1.1, 2026-11-21): `origin/main` was still `90535934` after `git fetch origin` — ⛔ file under `apps/`,
`packages/` or `scripts/` moved; the NUMBERS block was re-read across every branch and worktree then.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): THAT staff
may use the bank's date is the Panel's and is RULED — `2026-11-21-473` Q2 B. WHERE it is built is ruled by the author — `-474` item 1
(this row). WHO among staff records it, WHAT is stored, HOW the screens read and HOW a payment is matched mechanically are the AUTHOR's
(DL — BigDev at Task 0.2; `-474` item 1 lists "who" outside the Panel's three). Three edges change WHOSE FAMILY IS HELPED and are the
Panel's by `-474` item 1's own test ("the last three are the Panel's if they change whose family is helped"): PQ1 (after a refusal — on
appeal), PQ2 (a reference that does not match), PQ3 (a bank date ON the day of death). ONE non-blocking note at Task 0.3; each is built on
the literal side of the ruled words until answered. A FOURTH question rides in the same note — PQ4 (must a second person confirm the
bank's date): by `-474` item 1 "who" is the author's, but `-473` records the point as *"⛔ asked"*, and it sets how far one person's
word can open a drive — asked without blocking, ⛔ only told ([[feedback_told_line_must_not_carry_panel_choice]]).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md`, `sprint-status.yaml` or `inventory-roster.md` (growing files): cite the decision id, the item's phrase or the row key.

NUMBERS: ⛔ claimed by this file. "Anywhere" means EVERY branch and worktree (`git for-each-ref refs/heads refs/remotes` + each
`.claude/worktrees/*` dirty tree), ⛔ `main` alone. ⭐⭐ RE-READ 2026-11-27 at `6536b8bb`, across every ref and worktree — SUPERSEDES the
2026-11-21 lines below (kept as written): `main` holds decision `-509` (⛔ ref holds more), migration `0218_member-identity-validations`
(journal top; `0213`–`0218` landed — 6.22b, 12.5, 12.5b, 3.13), `PERMISSION_CATALOG_VERSION = 66` / **98** keys (Story 3.13 took v66
with TWO keys, `member.validate_identity` + `member.reveal_mobile_for_identity_check`), roster highest **Row 57**, ledger
`2026-11-26t` (⛔ `2026-11-27` letter on any ref); unchanged: `CLAIM_EVENT_TYPES` 40, `COVERAGE_FLOOR = 20` (COVERAGE_SET 20),
`FENCED_FILES` 65, `VERIFIER_CONSOLE_MAX_READS = 36`; `ci:local` / GitHub CI **41** jobs (3.13a's landing, `af939827`). The sibling
stories named below (6.22b, 12.5, 3.13) have all LANDED. ⇒ the next free: decision **`-510`**, migration **`0219`** (drizzle `when` after
`0218`'s), catalog **v67 / 99 keys**, `CLAIM_EVENT_TYPES` 41, `COVERAGE_FLOOR` 21, roster **Row 58**, ledger `2026-11-27a` (this
validation's line). ⚠ Row `3-17-joining-and-renewal-fee-optional-switch` (`backlog`) will touch the SAME table and guard (G14, TR13).
⭐ At 2026-11-21 (`90535934`): `main` holds decision `-476`, ledger `2026-11-21o`,
migration `0212_claim-membership-checks` (journal top), `PERMISSION_CATALOG_VERSION = 65` / 96 keys, `CLAIM_EVENT_TYPES` 40
(`STORY_6_39_CLAIM_EVENTS` the latest frozen literal), the human-actor gate's `COVERAGE_FLOOR = 20`, `FENCED_FILES` 65,
`VERIFIER_CONSOLE_MAX_READS = 36`, roster highest Row 53. ⚠ THREE sibling stories, each `ready-for-dev` in its own worktree, want the
SAME next numbers (re-read at validation, 2026-11-21): `6-22b-…` (branch `story/6-22b-fraud-register-identifier-set-and-filer-bans`)
holds decisions up to `-480`, ledger letters `p`–`t`, and migration `0213_claim-documents-death-certificate-delete-guard` ON DISK
(⛔ committed) — and its tree edits `member/anonymize.ts`, as this story does (expect a merge conflict there); `12-5-…` holds ledger `t`
and plans decision ≥ `-481`, roster Row ≥ 54 and TWO migrations; `3-13-…` holds ledger `s` and `v` and plans the SAME catalog bump
(v66 / 97 keys — its key `member.validate_identity`), a new table, a comment in the gate leaf and one label in the claim-verification
`i18n-en.ts`. ⇒ at validation the next free were: decision `-481`, migration `0214`, catalog v66 / 97 keys, `CLAIM_EVENT_TYPES` 41,
`COVERAGE_FLOOR` 21, roster Row 54 — and whichever story lands second takes the one after. Ledger: `2026-11-21u` is this file's
creation line, `2026-11-21ar` its validation line (written `w`; relabelled 2026-11-27 — 3.13 landed holding `w`), `2026-11-21z` the
note's, `2026-11-27a` the second validation's. A migration's drizzle `when` must be later than every sibling's
([[project_sibling_migration_when_order_shared_db]]). Every number in this file is "the next free one" at the commit that takes it —
READ LIVE then, across branches.

LETTERS: **G** = found facts (G1–G14); **DL** = build decisions (DL1–DL14 — ANSWERED by BigDev at Task 0.2, 2026-11-27: every one as proposed); **PQ** = Panel
questions (PQ1–PQ4 — non-blocking) + **TL** = lines the note TELLS the Panel (TL1–TL4); **TR** = traps (TR1–TR14); **AC1–AC13**.
-->

# Story 6.39a: Staff May Use the Bank's Date for a Joining Fee Recorded After the Death — When the Trust's Own Bank Statement Shows It Arrived Before

Status: in-progress

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 6.39 compares the date of death on the accepted certificate with the date the joining
> fee was **recorded** — the moment the member (or, after the death, the family) typed the payment's reference into the app — and,
> since `2026-11-21-473` Q1 B, holds the drive for good when that date is ON or AFTER the day of death. A member who **paid in life** but
> whose payment was recorded only after they died is caught by it, with ⛔ remedy (`-472` N3, as built). The Panel ruled the remedy —
> `-473` Q2 B: *"Staff may use the bank's date when the Trust's own bank statement shows the money arrived before the death; they record
> that they did, with a reason, and it is audited."* This story builds it as ONE new recorded staff act — **the bank date** — by the
> Trust's **finance officer** (the role that already reviews payment references against bank statements), on a claim the membership
> check is holding because of its fee date. The finance officer types the payment reference exactly as it appears on the Trust's
> statement and the date the money arrived; the SYSTEM accepts it only if that reference is the one the member recorded. The claim then
> WAITS for the District Admin to check it again; the membership check now compares the **bank's** date with the date of death, by the
> same rule (before the day of death passes; the day itself and later do not). ⛔ New family-facing words, ⛔ change to the receipt, the
> member's lifecycle, the door, or either deny vocabulary.

**What already ships and this story REUSES — rebuild none of it:**
- Story 6.39's membership check, whole: `claim_membership_checks` (one LIVE row per claim, a re-check supersedes), the handler that
  computes the fee outcome (`apps/api/src/modules/claims/claims.membership-check.handlers.ts` — `getPreview` / `postCheck`), the writer
  `recordMembershipCheck` (`packages/domain/src/claim/membership-check-persist.ts` — the claim-row lock, the re-asserts, the
  `expectedLiveCheckId` lost-update guard), the ONE gate definition `resolveMembershipCheckApprovalState` (the leaf
  `packages/domain/src/claim/membership-check-approval.ts`, used by `assertClaimApprovable`'s six sites, the cycle-freeze commit skip, the
  deny-reason guard and the console packet), and the console control `MembershipCheckControl.tsx` (G1).
- `compareFeeDateWithDeathDate` / `feeDateOf` (`packages/domain/src/claim/fee-death-date.ts`, import-free but for `holiday-resolver.ts`) —
  the ONE comparison rule; this story adds a calendar-date entry to it, ⛔ a second rule (DL2).
- `readJoiningFeeReceipt` (`packages/domain/src/claim/membership-check-read.ts`) — the joining receipt, by the lock-in event's UTR and the
  member (G2). It returns `{ receiptId, paidAt }` today; this story WIDENS it to also return `utr` and `amountInr` (DL4) — ⛔ a second
  receipt reader.
- The `finance_officer` role (`packages/domain/src/rbac/roles.ts`, `pariwar` ceiling) — the FR-50 "designated reconciliation reviewer",
  holder of `reconciliation.review` and the default target of `utr-mismatch` helpdesk tickets (G4).
- `requireStepUp(deps, <CONTEXT>)` (`apps/api/src/modules/step-up/gate.js`) as `claims.fraud-investigation.routes.ts` wires it after the
  permission hook (G9).
- The table shape of `0212_claim-membership-checks.sql` (grants at birth, the mutation guard, the one-way supersession trigger, the
  one-live partial unique index, TS-declared RLS with an UPDATE policy) — copy it for the new table (DL1).
- The 6.39 audit path (`emitAuthAudit`, best-effort, AFTER the transaction closes) and its N7 rule: ids and codes only.

## Story

As **a family whose member paid the joining fee in life but whose payment was recorded only after the death, the Trust's finance officer
who holds the Trust's bank statements, and the District Admin who checks the claim**,
I want **the finance officer to be able to record, with a reason, the date the Trust's own bank statement shows the payment arrived —
matched to the member's payment by its reference — so that the membership check compares that date with the date of death**,
so that **a member who really paid before they died is not treated as never having paid in time, while a fee paid after a death still
never opens a drive**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-11-21-473` Q2 B | *"Staff may use the bank's date when the Trust's own bank statement shows the money arrived before the death; they record that they did, with a reason, and it is audited."* — *"The family is helped if the bank's record bears it out."* Cost as put, accepted: *"A new staff power over a bright line; someone must match the payment against the Trust's bank statement; and it is a new piece of work, ⛔ built."* | Trustee-ratified (DR + KB) |
| `-473` "does NOT cover" | Q2 B: **who** (*"'Staff' is the option's word. The author's reading is the District Admin who records the membership check — ⛔ ruled; whether a second person must agree was ⛔ asked"*); **when** (*"Before a denial only …, or also after a `fee_paid_after_death` refusal, or on its appeal — ⛔ ruled"*); **how matched** (*"What counts as 'the Trust's own bank statement' inside the system, and what staff record of it, is a build decision"*); **Q2 B with Q1 B** (*"Whether a bank date ON the day of death also counts as after — the author reads yes … ⛔ ruled"*). | the edges — DL / PQ below |
| `-473` "What this ratifies that was the author's" | *"`-472`'s N3 … stands for every case but one: Q2 B gives staff the bank's date … Staff still type neither date for any other case."* | Trustee-ratified |
| `-473` told lines | *"⚠ Q2 B makes told line 1 partly untrue once built … Whether the bank's date can be used on an appeal of a `fee_paid_after_death` refusal is NOT covered"*; *"Told line 4 is changed by Q2 B"*. | ⛔ asked — TL3, PQ1 |
| `-473` Q1 B | *"The same day counts as after — ⛔ drive."* | Trustee-ratified — PQ3's precedent |
| `2026-11-21-474` item 1 | Q2 B on THIS row; *"its build decisions are ⛔ made here (who, when — before or after a refusal, on appeal — how a payment is matched to the Trust's bank statement, a bank date on the day of death …; the last three are the Panel's if they change whose family is helped). Until 6-39a lands, Story 6.39's comparison stays binding with ⛔ staff remedy"*; item 5: Q4 B's family line ⛔ shown for `not_checked`, `stale` or `fee_after_death`. | author-commit (BigDev) |
| `-474` Policy meaning | *"until row 6-39a is built, a fee paid in life but recorded after the death still stops the drive with no remedy."* | what this story ends |
| `-475` + `deferred-work.md` (6.39 round 2) | *"A corrected UTR typed on a joining-fee re-confirm is now stored nowhere in full … ⚠ The receipt's ORIGINAL UTR may itself be the mistyped one … **Trigger:** row 6-39a … is built — it is the first consumer that may need the true UTR."* | open — PQ2, Task 6.3 |
| roster Row 46 (b) | *"PQ1 ruled by the Panel and reflected in code, BOTH edges: … (b) a fee paid in life whose UTR was recorded after the death"* — its PQ1 (b) half waits on this row (dated line of 2026-11-21, `-474`). | open — closed by this row landing |
| `2026-11-21-482` item 5 + row `3-17` | The joining and renewal fee *"PROPOSED to the Panel, ⛔ decided"*; *"`-424` Q1 (b), `-430` Q1 and `-473` Q1 STAND, unedited, until the Panel rules"*; built meanwhile as a per-Pariwar switch defaulting to "fee required". The registration note (`trustee-panel-routing-note-2026-11-21-registration-fee-optional.md`, WRITTEN, ⛔ sent) is read with this story's note: if the fee becomes optional, a late-recorded fee no longer stops a drive for a member who submitted before the death, so most of this story matters only while the fee is required. | author-commit; Panel question open — G14 |
| Niyamavali §2.1 (c), §2.2 | §2.1 lists payment of the fee among the conditions of membership; §2.2 counts a 15-day joining lock-in from fee payment — both speak of **payment**, ⛔ of recording. Cited by section, ⛔ quoted: the rulebook lives in the private legal corpus ([[project_legal_corpus_private_repo_split]]). A rulebook, ⛔ ratified ([[feedback_niyamavali_rulebook_not_spec]]). | ⛔ ratified — Policy-meaning check only |

## 📜 Policy meaning (AI-10-1)

**This story CHANGES the predicate that gates a family's access to a benefit — the drive — in two ways:** it WIDENS the fee half in one
case (the bank's date, when the finance officer records it and it is the earlier — DL6 — replaces the recorded date), and it ADDS one conjunct (a check computed before a
bank date was recorded no longer counts — the claim waits for a re-check).

*In the member's terms (ONE sentence):* **"If you paid your joining fee before the day you died but the payment was recorded only on or
after that day, the Trust's finance officer can look at the Trust's own bank statement — and if it shows your payment, under the same
payment reference that was recorded for you, arrived on a day before the day of your death, your family's claim can go ahead; if the
reference recorded for you is not on the statement, or the money arrived only on the day of your death or later, it cannot."**
⭐ Since the Panel's ruling (`2026-11-27-511`, Q1 B) the sentence as recorded there adds, after *"can go ahead"*: *"even after a refusal
once your family's appeal is allowed"* — the same predicate, its appeal edge now ruled.

*What that sentence deliberately does ⛔ promise:* that anyone LOOKS. Q2 B says staff **may**; nothing in this story makes the bank check
happen before a refusal — the console tells the District Admin to record the check and then ask (DL11), and the finance officer's page
lists every claim whose RECORDED check holds it on the fee (DL10) — ⛔ a claim nobody has checked yet (DL5's only path). Whether a family already refused can still be helped is PQ1 (built: yes, once an appeal sends the claim back).

**Checked against the Niyamavali** (the git-ignored copy in the main checkout, `/Users/dev/Developer/projects/TWT/docs/legal/niyamavali.md`,
2026-11-21 — read by ABSOLUTE path, [[feedback_worktree_session_never_cd_to_main_checkout]]) — result: CONSISTENT, one relevant unbuilt
clause:
- §2.1 (c) and §2.2 name the **payment** of the fee, ⛔ its recording — CONSISTENT: the bank's date is the better evidence of when (c)
  happened. (Sections cited by number, ⛔ quoted — the rulebook is in the private legal corpus.)
- §2.2's 15-day joining lock-in — RELEVANT, ⛔ built (as in 6.39): under it a bank date 1–14 days before the death would still be
  ineligible; this story helps such a family (the Panel's rulings are the instrument, ⛔ the rulebook). Named in the note's evidence, ⛔ asked.
- ⛔ Clause speaks to bank statements, references or staff correcting a payment date — SILENT.

## ⭐ THE INVARIANTS

**N1 — One rule, one place.** The fee comparison stays ONE rule (`fee-death-date.ts`): a calendar date before the day of death passes;
the day itself and later do not (`MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES = ['after_death', 'same_day']`, unchanged). The bank date is fed
to the SAME rule; ⛔ a second definition of "before the death" anywhere (PQ3 built as Q1 B).

**N2 — The bank date is a fact the finance officer records; the decision stays the membership check's.** The finance officer records
WHEN the money arrived, never WHETHER the claim may go ahead; the District Admin's next check computes the outcome from it. ⛔ The finance
officer is shown the date of death (it is Tier-1 and they ⛔ need it); ⛔ the District Admin types the bank date.

**N3 — Matched by the reference, or not at all.** A bank date is accepted only when the reference the finance officer types from the
statement EQUALS the joining receipt's stored UTR (server-side compare; the typed reference is ⛔ stored, ⛔ logged). No other match (amount,
day, payer's name) is accepted — PQ2.

**N4 — Stale means re-check.** A check computed before the claim's CURRENT live bank-date record (or against a record that is no longer
live) is not current: the gate answers a NEW wait reason `bank_date_recorded`, the claim waits, and the deny-reason guard refuses
`fee_paid_after_death` until the District Admin checks again (6.39 N4's shape, a second currency token).

**N5 — Waiting, ⛔ denying** (6.39 N5). ⛔ Path in this story denies, closes or approves a claim; every new refusal is a typed 409.

**N6 — ⛔ Tier-1 or payment data out of events, logs and audits.** ⛔ Date (bank, recorded or death), ⛔ note, ⛔ typed reference, ⛔ full UTR,
⛔ name in any event payload, log line or audit context — ids, reason codes and outcome codes only (6.39 N7).

**N7 — Two people, always.** Two layers. *Roles:* the key that records the bank date (`claim.record_fee_bank_date` — the finance
officer) is granted to ⛔ role that holds `claim.check_membership` (the District Admin), `claim.approve` (the P1 approver),
`cycle.freeze` (the final voter — the Pariwar Admin) or `claim.r9_vote` (the R9 panel); `super_admin` derives every key. *People:* roles alone do ⛔ separate people — one user may hold several role grants
(`role_grants` has ⛔ uniqueness on user + role) and a Super Admin holds every key — so the membership-check writer REFUSES a check that
considers a live bank date its own actor recorded, whichever date wins (`membership_check.same_person` — DL6). ⇒ the person who typed
the bank date never records the check that considers it, whatever roles they hold. ⚠ The P1 approver and the final voter are kept apart by ROLE only (⛔ actor check at
either approval) — TL1 says so. ⚠ The other side of the actor check: where only ONE person can act (a Super Admin with ⛔ finance officer,
or one user holding both role grants), a bank date that person records leaves the claim WAITING for ever — the gate answers
`bank_date_recorded`, nobody else can re-check, and the deny guard refuses `fee_paid_after_death` while it holds (TR14, DL13 (c)).

## Found facts (traced at `90535934`; re-derived at `6536b8bb` on 2026-11-27 — G14 new)

- **G1 — What 6.39 built, the fee half.** `postCheck` reads the CURRENT accepted review's date (`readDeathDate` →
  `getCurrentAcceptedDeathCertificate` + `decryptDeathCertificateReviewField`), the joining receipt (`readJoiningFeeReceipt`), and computes
  `compareFeeDateWithDeathDate(receipt.paidAt, deathDate.date)` — `istDateOf(paidAt)` vs the `YYYY-MM-DD`; the request carries ⛔ date and
  ⛔ outcome. The writer re-asserts under the claim-row `FOR UPDATE` lock: the window (`CLAIM_REVIEW_WINDOW_STATES`), the current accepted
  review (`stale`), the joining receipt, the identity (re-read), the live check the staff member saw (`expectedLiveCheckId` →
  `check_changed`), then supersedes (`re_checked`), inserts and emits `claim.membership_checked`. The preview (`getPreview`) returns
  `date_of_death`, `fee_paid_on` (`feeDateOf(paidAt)`), `fee_outcome`, `fee_blocks_approval` (from
  `MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES`), `identity_required`, `kyc_route`, `latest_posting_district`, `live_check`, `gate`. Route-level
  refusals: `not_found`, `window_closed`, `certificate_not_accepted`, `stale`, `certificate_date_unreadable`, `check_changed`,
  `no_fee_receipt`, `invalid_outcome`, `missing_display` (`REFUSAL_MESSAGES`, exhaustive by type).
- **G2 — The receipt.** `vyawastha_shulk_receipts` (Tier-3 plaintext): `paid_at timestamptz DEFAULT now()` = the server instant of the
  member's UTR attest (⛔ the bank's); `utr` (contract: `/^\d{12}$|^[A-Za-z0-9]{22}$/`, `packages/contracts/src/payments/vyawastha-shulk.ts`)
  is SELF-ATTESTED and ⛔ validated against any bank; `amount_inr` server-authoritative (config, v1 110); `valid_through` = `paid_at + 1y`;
  UNIQUE `tr`, UNIQUE `(pariwar_id, utr)`; append-only by GRANT. `maskUtr` exists TWICE as a private helper
  (`apps/api/src/modules/vyawastha-shulk/handlers.ts`, `apps/api/src/modules/payment/handlers.ts`) — ⛔ exported. The joining receipt is
  `readJoiningFeeReceipt` (the `pending-fee → lock-in` event's UTR + `member_id`); since `-475` the event names the STORED receipt's UTR.
  ⚠ The stored UTR may itself be mistyped, and a corrected one typed on a re-confirm is stored nowhere in full (`deferred-work.md`, 6.39
  round 2) — under N3 such a member cannot be matched (PQ2).
- **G3 — The Trust's bank and its statement are OUTSIDE the system.** The fee is paid by UPI to `config.vyawasthaShulkVpa` (the Trust's
  VPA, `apps/api/src/config.ts`); ⛔ intake of the TRUST's bank statement exists. Story 9.3's statement intake (`reconciliation.*` events on
  the POOL stream, `BankStatementStorage`, `apps/api/src/modules/reconciliation/`) is for the NOMINEE's account and a pool, ⛔ the Trust's.
  `packages/bank-parsers` extracts a UTR from `UPI/CR/<utr>/…` narrations (`normalize.ts`, `factory.ts` `extractUtr`) — the project's
  assumption that a UPI reference appears on a payee's statement — but its golden files are SYNTHETIC (9.3 D7, ⛔ attested on a real
  export) ⇒ the 6.39 note's *"Still uncertain (2)"* (whether the Trust's statement can be matched by reference in practice) stays
  ⛔ traced; this story does ⛔ settle it (TR10). The PRD: *"Trust holds; trust-account banking"* (§4.14.1); the trust account's opening is
  gated by OQ-16 (counsel + Panel).
- **G4 — Who can be "staff" here.** `finance_officer` (ceiling `pariwar`): `reconciliation.review` (Story 9.8, *"the FR-50 designated
  reconciliation reviewer"*) + `helpdesk.respond` (Story 10.4 routes `utr-mismatch` tickets to it). `district_admin` (ceiling `district`)
  holds `claim.check_membership` (6.39 DL7) and every other claim key the console uses; `pariwar_admin` (Trustee-Lite) holds `cycle.freeze`
  (the final vote) — [[project_trustee_lite_votes_not_state_trustee]]. A `pariwar`-scoped grant SATISFIES a `district`-dimension check
  (`scopeContains` rule 5 — [[project_rbac_geo_scope_containment]], the 13.1 worked example), so one per-claim key gated at the deceased's
  district serves a finance officer; a positive test leg per holder is owed. The PRD lists Finance Officer among the 12 seeded roles,
  *"Trustee Panel to confirm or revise before launch"* (OQ-3); OQ-15 (staff hiring) is open — whether the Trust will have one is ⛔ known.
- **G5 — The window, the denial and the appeal.** `CLAIM_REVIEW_WINDOW_STATES` = `verification_in_progress`, `verifier_review`,
  `verifier_approved`, `reversed`, `state_trustee_freeze` (`claim/review-window.ts`, import-free). A `fee_paid_after_death` denial puts the
  claim in `denied` (outside the window); it is appealable ONCE with ⛔ deadline (6.16, `appeal-eligibility.ts`); an appeal panel's reverse
  (`appeal-panel-persist.ts`) moves the claim to `reversed` — INSIDE the window — and it re-enters approval through the final vote. The live
  membership check survives the denial and the reversal (nothing supersedes it). ⇒ A record allowed "in the window" is available after
  an appeal reverses a fee refusal, BY CONSTRUCTION — and the 6.39 note's told line 1 (*"even an appeal that agrees with the family cannot
  open a drive"*) stops being true (PQ1, TL3). The family's `refusal_reason` (`not_a_member_when_died`) already goes `null` once
  `reversed` (6.39 AC16).
- **G6 — The gate.** `resolveMembershipCheckApprovalState(facts)` — precedence `not_checked` → `stale` (review id ≠ current accepted; or
  `not_required` while today's KYC needs one) → `fee_after_death` (`MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES`) → `identity_not_confirmed`.
  `readMembershipCheckFacts` reads the live check row (ids + codes), the certificate snapshot and the KYC row — ⛔ ciphertext. The reason
  vocabulary `MEMBERSHIP_CHECK_WAIT_REASONS` (`claim/errors.ts`) is mirrored in contracts with a lockstep test, and mapped to words at the
  four translators' human message (`apps/api/src/modules/claims/membership-check-required-message.ts` — `stale: 'The certificate changed
  since the membership check — check again.'`) and the admin's `membershipCheckRequiredMessage` (`claim-verification/nominee-errors.ts`),
  which picks from THREE per-surface maps in `claim-verification/i18n-en.ts` — `membershipCheck.approveBlocked` (the console),
  `.finalVoteGate` (the cycle-freeze page), `.r9Gate` (the R9 panel) — each typed `Record<string, string>` with a fallback to
  `not_checked`'s words: a reason missing from a map is ⛔ a compile error, it silently reads *"Membership check needed before
  approval."* The API's map is an exhaustive `Record` (a miss IS a compile error); the closure surfaces show the API's message as
  written. `packages/contracts/tests/claims-verifier-console.test.ts` hand-types the reason union and loops a literal list of the four.
  ⚠ Re-using `stale` for a new bank date would tell staff the CERTIFICATE changed — false (DL7). The deny-reason guard
  (`assertFeePaidAfterDeathShown`) accepts `fee_paid_after_death` only while the gate answers `fee_after_death`. The family's Q4 line
  (`identity_check_waiting`) is `true` only for `identity_not_confirmed` (`-474` item 5) — a new wait reason never shows it.
- **G7 — The check row and its guard.** `claim_membership_checks` (`schema/claim_membership_checks.ts`, migration `0212`) stores the
  OUTCOME and the two ids it was computed from (`death_certificate_review_id`, `fee_receipt_id`), ⛔ a date. Grants: SELECT, INSERT +
  column-level `UPDATE ("superseded_at", "superseded_reason", "note_ciphertext")`; the mutation guard
  `claim_membership_checks_reject_mutation()` lists every OTHER column in an `IS DISTINCT FROM` chain — a NEW column is unguarded by the
  trigger until the function is REPLACED ([[project_append_only_guard_names_erasure_columns]] — the same trap from the other side), though
  the column grant already refuses `twt_app`.
- **G8 — The staff surfaces.** The verifier console (`/p/$pariwarId/claims/$claimCaseId/verify`, `VerifierConsoleRoute.tsx`) is gated on
  `claim.verify` (`claims.verifier-console.routes.ts`) — ⛔ held by `finance_officer` ⇒ the finance officer needs its OWN page. List-page
  precedents: `certificate-reminders` (route `/p/$pariwarId/certificate-reminders`; API `claims.certificate-reminder.routes.ts` with its
  queue-scope stash), `nominee-refusals`. `MembershipCheckControl.tsx` is presentational, its mutation and currency tokens owned by the
  route; admin copy is English only in `claim-verification/i18n-en.ts` (`verifierConsoleEn`) — ⛔ Hindi, ⛔ `t()`, ⛔ parity gate.
  ⚠ The admin microcopy gate fails on the WHOLE WORDS "receipt" / "report" / "invoice" / "passbook" (case-insensitive `\b<term>\b` —
  `scripts/microcopy/lib.ts`, the list in `microcopy.yaml`) in admin copy, test ids AND comments
  ([[project_microcopy_gate_scans_admin_code]]): a code name such as `fee_receipt_found` / `noFeeReceipt` passes (shipped), a hyphenated
  test id `fee-receipt` or a comment's "the receipt" FAILS — "payment" and "bank statement" are the words.
- **G9 — Step-up.** `claims.fraud-investigation.routes.ts`: the permission hook, THEN `requireStepUp(deps, FRAUD_FINDING_STEP_UP_CONTEXT)`
  (the one constant the admin caller imports), so an unauthorized actor never reaches step-up. Step-up contexts have ⛔ registry: the
  constant lives in the contract file, and the route AND the admin caller import it. The admin caller's piece is the shared `StepUpPanel`
  (`apps/admin/src/modules/workplaces/StepUpPanel.tsx` — `holdOnce`, `needsStepUp`, `PendingWrite`), as `FraudInvestigationPanel.tsx`
  uses it: a 403 `auth.step_up_required` HOLDS the write and the panel re-sends it. ⚠ Admin step-up is a one-time code whose delivery is
  the always-stub `adminStepUpDelivery` (`apps/api/src/deps.ts`: `createLogStepUpDelivery({ revealForDev: !isProd })`): in production the
  code is neither sent nor logged, so ⛔ admin can complete a step-up there until `deferred-work.md`'s deferral R4 (*"ADMIN step-up
  OTP-over-SMS"*) is discharged — roster Row 47's notes record it for 6.22's finding; by `roles.ts`' own comment the finance officer's
  `reconciliation.review` actions (9.8) are step-up-gated too.
- **G10 — Who can be paid wrongly.** The new power's abuse case: a finance officer types a date that is too early. N3 makes the
  REFERENCE unforgeable from the statement side (a fee paid after the death has a bank credit after the death under the same reference);
  the DATE is the finance officer's word. The only system bounds available: ⛔ in the future (IST today) and ⛔ before the member's
  `members.created_at` (IST) — a member cannot have paid before they registered. Everything else is the audit and the second person (N7).
- **G11 — Gates that see the new things.** `scripts/claim-adjudication-human-actor-invariant/check.ts` fails on ANY unclassified
  `claims.*.routes.ts` (COVERAGE_SET 20, `COVERAGE_FLOOR = 20`); `CLAIM_EVENT_TYPES toHaveLength(40)` in
  `packages/domain/tests/claim/dpdpa-consent-events.test.ts` and the frozen-literal diff in `nominee-name-check-events.test.ts`
  (`STORY_6_39_CLAIM_EVENTS` the latest); `packages/events/src/registry.ts`; the no-comparison fence
  `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts` (`FENCED_FILES` 65 — NAME patterns — and per-story `decrypt`-ban
  `it` blocks); the NW1 transitive import scan (`packages/domain/tests/claim/approval-warnings.test.ts`) over the gate leaf; the
  access-wrapper gate scans `apps/api/src/modules/claims` for direct `writeAuditEntry` calls (follow 6.39's `emitAuthAudit` path);
  `VERIFIER_CONSOLE_MAX_READS = 36` (`claims.verifier-console.handlers.ts`) counts the packet's top-level QUERIES, bumped by hand in the
  assembler: `assembleMembershipCheckGate` counts THREE for this gate (the live check, the certificate snapshot, the KYC row — the
  constant's doc-block ledger: 6.39 added three, to 36). A fourth query inside `readMembershipCheckFacts` that the assembler does ⛔ count is the
  silent exclusion that doc-block forbids (DL7). Also `packages/domain/tests/member/rtbf-anonymize.test.ts` pins the number of statements
  `anonymizeMember` issues (`toHaveLength(36)`) and the number of tables it touches (`new Set(tables).size).toBe(33)`, a per-story ledger in
  its comment), and, in its member-with-⛔-claims leg, `toHaveLength(32)` — the new note scrub moves all three (AC11). The 6.39 specs that pin the reason list or the preview by exact match: the four-reason
  precedence `toEqual` in `packages/contracts/tests/claims-membership-check.test.ts`, the literal four in
  `apps/admin/tests/membership-check.test.tsx`, the whole-body preview `toEqual` in `apps/api/tests/integration/claims/membership-check.spec.ts`
  (the GET leg), and the typed `LiveMembershipCheck` / `MembershipCheckFacts` literals in
  `packages/domain/tests/integration/claim/membership-check-approval.spec.ts` (domain tests are typechecked — `tsconfig` includes
  `tests/**/*`) — AC5 names the edits each needs.
- **G14 — A sibling row will change the same columns: `3-17-joining-and-renewal-fee-optional-switch`** (`backlog`; `-482` item 5;
  `epics.md` Story 3.17). When its switch is ON, Story 6.39's fee half for a member with ⛔ receipt becomes "submitted before the date of
  death", and `claim_membership_checks.fee_receipt_id` becomes NULLABLE *"with a CHECK tying it to that outcome"*. ⇒ (a) such a check has ⛔
  recorded fee date: DL1's `fee_date_source` vocabulary `('recorded','bank')` will need a third value, and the column DEFAULT `'recorded'`
  would be FALSE for it; (b) BOTH stories `CREATE OR REPLACE` `claim_membership_checks_reject_mutation()` — whichever lands second must
  carry the other's columns in the chain, or the guard silently drops them (TR2's hole, made by a merge); (c) DL5 (b) / DL7 / DL10 read
  `fee_outcome` in today's vocabulary. Neither story names the other at authoring. The Panel has ⛔ ruled the fee-optional question; the
  switch ships OFF.
- **G12 — Erasure.** `member/anonymize.ts` scrubs 6.39's `note_ciphertext` (the shared field class in `encryption/field-classes.ts`,
  re-exported by `apps/api/src/context.ts`); erasure is refused while a death report stands (6.38) and released by an innocence finding
  (6.22, live) — so the scrub of a new Tier-1 note runs for real.
- **G13 — Numbers.** See the NUMBERS block (top).

## Build decisions — ANSWERED (BigDev, Task 0.2, 2026-11-27 — every one as proposed; the alternatives are kept below as *"Not chosen at 0.2"*; the answers are recorded under Debug Log References)

- **DL1 — ONE new record: `claim_fee_bank_dates`** (ONE migration, the next free number — `0219` at 2026-11-27; READ LIVE), copying `0212`'s shape:
  `record_id uuid PK`, `pariwar_id`, `claim_case_id` (FK `claims`), `deceased_member_id`, `fee_receipt_id` (FK `vyawastha_shulk_receipts` —
  the joining receipt it was matched to), `bank_credit_date date NOT NULL` (plaintext — payment metadata, as `paid_at`; ⛔ scrubbed, as the
  receipt is retained — PRD FR-1), `reason_code text` (DL5's list, CHECK), `note_ciphertext` (Tier-1, `piiColumn`, NOT NULL — REQUIRED),
  `decided_by_actor_id`, `decided_by_display` (CHECK non-blank), `decided_at`, `superseded_at`, `superseded_reason` (`re_recorded`). A
  branded id `ClaimFeeBankDateId` (`ids/index.ts`); a shared field class `CLAIM_FEE_BANK_DATE_FIELD_CLASS` (`encryption/field-classes.ts`,
  the 6.22 / 6.39 pattern). ONE live row per claim (partial unique `WHERE superseded_at IS NULL`); RLS by `pariwar_id` declared in TS
  (`policies/claim-fee-bank-date-rls.ts` + `policies/index.ts`) INCLUDING the UPDATE policy; grants SELECT / INSERT + `UPDATE
  ("superseded_at", "superseded_reason", "note_ciphertext")` at birth; a mutation guard leaving `note_ciphertext` OUT of its chain; a
  one-way supersession trigger; ⛔ DELETE / TRUNCATE. **In the same migration**, `claim_membership_checks` gains `fee_date_source text NOT
  NULL DEFAULT 'recorded'` (CHECK `IN ('recorded','bank')`) and `fee_bank_date_id uuid NULL` (FK `claim_fee_bank_dates`), a coherence
  CHECK (`'bank'` ⇒ `fee_bank_date_id IS NOT NULL`, one-way — DL6), and `claim_membership_checks_reject_mutation()` is REPLACED to add both columns to its
  chain (G7). ⚠ Row `3-17` (G14) will add a third fee-date source (a member with ⛔ receipt, judged by submission) and make
  `fee_receipt_id` nullable: name the vocabulary in ONE domain constant (`MEMBERSHIP_CHECK_FEE_DATE_SOURCES`, Task 1.1) with a doc-block
  saying row `3-17` extends it, write the coherence CHECK as `fee_date_source <> 'bank' OR fee_bank_date_id IS NOT NULL` so a later source
  needs ⛔ rewrite of it, and leave a comment on the REPLACED guard naming `3-17` (whichever lands second carries the other's columns — TR13).
  *Per claim, ⛔ per receipt:* the claim is the unit the window, the lock and the audit already use; a second claim for the same
  death records it again (rare). *Rejected:* columns on the receipt (append-only by GRANT; FR-1's retained record); an upload of the
  statement (DL3).
- **DL2 — One rule (N1).** In `fee-death-date.ts` add `compareFeeCalendarDateWithDeathDate(feeDate: CalendarDateString, deathDate:
  CalendarDateString)` (throws unless both are real calendar dates) and make `compareFeeDateWithDeathDate(paidAt, deathDate)` call it with
  `istDateOf(paidAt)` — ⛔ behaviour change for 6.39's callers (its AC2 legs stay green untouched). A bank date ON the day of death is
  `same_day` and HOLDS the claim (PQ3 — built as `-473` Q1 B's line).
- **DL3 — How a payment is matched (N3).** The finance officer types (i) the payment reference EXACTLY as the Trust's statement shows it and
  (ii) the date the money arrived. The writer compares (i) with the joining receipt's stored `utr` — BOTH trimmed; digits exactly, LETTERS without
  regard to case (the stored UTR is kept as the member typed it: the receipt contract neither trims nor re-cases, and its 22-character
  form admits either case, while a statement prints capitals) — the SAME reference, ⛔ a looser match (PQ2 A stands); the UTR is
  plaintext Tier-3, ⛔ a decrypt — and refuses `fee_bank_date.reference_mismatch` otherwise — ⛔ row, the typed
  value ⛔ stored or logged. ⭐ The compare runs in TypeScript on the `utr` the writer RE-READ under the lock (DL4): the typed reference
  is ⛔ a query parameter anywhere (⛔ `WHERE utr = $typed`) — a failed query's error message carries its parameters (TR5). The page
  shows only the receipt's recorded date, amount and the reference's LAST FOUR (a new shared `maskUtr` — or a local one, ⛔ the two private
  copies exported), so the typed reference is a real check, ⛔ a copy from the screen. ⛔ Upload: the Trust's statement carries every other
  payer's name and VPA — a new store of third parties' data nobody asked for; *rejected* also: parsing an uploaded statement with
  `bank-parsers` (synthetic golden files, G3; the same third-party store). "The Trust's own bank statement" inside the system = the
  finance officer's typed date + reference + note, under their name and audited.
- **DL4 — The joining receipt, widened.** `readJoiningFeeReceipt` returns `{ receiptId, paidAt, utr, amountInr }` (one reader — the 6.39
  DL3 join, unchanged). The bank-date writer re-reads it under the claim lock and requires it to be the receipt the live check names
  (`fee_receipt_id`) — else `fee_bank_date.stale`.
- **DL5 — The record's bounds and reason.** Accepted only (a) in the membership check's window (`isInMembershipCheckWindow`); (b) while the
  claim is HELD on its fee — the live check's `fee_outcome` blocks, OR a live bank-date record exists (so a mistyped bank date can be
  corrected by a new record either way) — else `fee_bank_date.not_held`; (c) `bank_credit_date` a real calendar date, ⛔ after IST today
  (`in_future`) and ⛔ before the member's `members.created_at` IST date (`before_joining`) (G10); (d) a reason from a closed list —
  `recorded_late_by_member` | `recorded_by_family_after_death` | `other` — and a NOTE always (Q2 B: *"with a reason"*; the note says which
  statement — account, period, line — and what was seen); (e) `expected_live_check_id` and `expected_live_record_id` (each nullable,
  REQUIRED) still the live ones under the lock — else `fee_bank_date.stale`. A new record supersedes the live one (`re_recorded`). ⛔
  "withdraw" act (a wrong date is corrected by a new record; a wrong LINE cannot pass N3) — deferred if asked for.
  ⭐ **The only path, stated:** (b) needs a STORED live check, and the console's preview computes a blocking outcome WITHOUT one
  (`fee_blocks_approval` is computed with `live` possibly null). So a claim nobody has checked is ⛔ on the finance officer's list and its
  POST answers `not_held`: the District Admin RECORDS the check first (for an unchecked identity that includes their `not_confirmed`
  judgment, reason and note), THEN the finance officer records the bank date, THEN the District Admin records the check AGAIN. The console
  note says it in that order (DL11). *Not chosen at 0.2:* (b) also admits a claim with ⛔ live check whose COMPUTED
  outcome blocks (the writer computes it under the lock as the preview does — it then needs the date of death, a decrypt on the finance
  path, against N2 / TR3); cost: ⛔ second check for the District Admin, but the finance writer reads Tier-1.
  ⚠ **When a correction stops:** the record is accepted only in the window, so once the claim reaches `state_trustee_approved` (outside it)
  a wrong bank date can ⛔ longer be corrected here — say so in Completion Notes and the roster row's notes.
  *An option on PQ1, for BigDev at 0.2:* the appeal stages (`appeal_stage_1/2/3`) are OUTSIDE the window, so under PQ1 B the appeal panel
  reverses a `fee_paid_after_death` refusal with ⛔ bank evidence in the system, and if the bank then does not bear it out the final vote
  may refuse again — with the family's one appeal spent (`appeal-eligibility.ts` — one appeal journey per claim). Option: ALSO accept a
  record while the claim is in `appeal_stage_*` (record only — the re-check still waits for `reversed`, and (b) is read off the live check,
  which survives the denial). Cost: a staff write during an appeal the appeal stories do ⛔ expect; the appeal surfaces show ⛔ such record
  (a new read on them is out of scope). ANSWERED at 0.2: ⛔ (as built — the window), with the cost in PQ1.
- **DL6 — The membership check uses it.** `postCheck` / `getPreview` read the claim's live bank-date record (`getLiveFeeBankDate`); when one
  exists AND names the joining receipt, the fee date is the EARLIER of its `bank_credit_date` and `istDateOf(paidAt)` (ANSWERED at 0.2 — see
  below), `fee_date_source` names which one it was (`'bank'` only when the bank date is strictly earlier), and `fee_bank_date_id` names the
  record CONSIDERED either way; with ⛔ live record it is `istDateOf(paidAt)`, `'recorded'` and `NULL`. The outcome comes from DL2's ONE rule.
  ⚠ The gate (DL7) compares the check's `fee_bank_date_id` with the live record, so the id is stored whenever a record was considered —
  even when the recorded date won — else such a claim answers `bank_date_recorded` for ever; hence DL1's one-way coherence CHECK
  (`'bank'` ⇒ an id), ⛔ `⇔`. *Why the earlier:* Q2 B lets staff use the bank's date when it *"shows the money arrived before the death"*;
  a bank date LATER than the recorded one (a statement's value date after a holiday) shows nothing of the kind, yet replacing the date with
  it could turn a passing claim into a held one — e.g. recorded D, death corrected on re-review to D+1, bank D+1 ⇒ `same_day`. The earlier
  date can only help. *Not chosen at 0.2:* the bank date ALWAYS replaces the recorded one (as first written; the
  coherence CHECK may then be `⇔`); cost: the case above, with ⛔ withdraw act to undo it (DL5). The POST body gains a REQUIRED nullable `expected_fee_bank_date_id` (the preview's
  record id). As with the review today, TWO compares: the handler compares the body's token with the record it read, and passes the
  writer `computedAgainstFeeBankDateId` (nullable — the live record it CONSIDERED, whichever date won; `null` only when ⛔ live record naming the joining receipt was considered); the
  writer re-asserts THAT under the lock against the claim's live record naming the joining receipt — either miss is
  `membership_check.bank_date_changed` (its own code and words, as `check_changed` is its own) — and stores `fee_date_source` +
  `fee_bank_date_id` from what it re-read, so the outcome and the record it names can ⛔ diverge. **The same person (N7):** when the
  check considers a live bank-date record (whichever date wins), the writer refuses `membership_check.same_person` if its actor recorded that live record (`isSameActorId`
  from the leaf `claim/approver-own-visit.ts`, against the record's `decided_by_actor_id`, under the lock) — whatever roles the actor
  holds, a Super Admin included; another person records the check. *Not chosen at 0.2:* ⛔ actor check — N7 and TL1
  then promise a separation of ROLES only, and are reworded to say so. The preview gains `fee_date_source` and `fee_bank_date:
  { record_id, bank_credit_date, reason_code, recorded_by_display, recorded_at } | null`; `fee_paid_on` keeps meaning the RECORDED date
  (⛔ renamed — contract churn; its comment says so).
- **DL7 — The gate (N4).** `MembershipCheckFacts` gains `liveFeeBankDateId` — the claim's live record id, read INSIDE the live-check
  statement of `readMembershipCheckFacts` (a scalar subquery on `claim_fee_bank_dates`; with ⛔ live check the gate answers `not_checked`
  first, so `null` is right there) ⇒ still THREE counted reads, and `VERIFIER_CONSOLE_MAX_READS` stays 36 (G11). A separate query
  instead means the assembler's count 3 → 4, the ceiling 36 → 37 and a ledger line in the constant's doc-block. The leaf stays a leaf
  (G6/TR4); `LiveMembershipCheck` gains `feeBankDateId`. A NEW wait reason
  `bank_date_recorded` — the check's `fee_bank_date_id` ≠ the claim's live record id (null = none, compared lower-cased) — with precedence
  `not_checked` → `stale` → **`bank_date_recorded`** → `fee_after_death` → `identity_not_confirmed`. Added to `MEMBERSHIP_CHECK_WAIT_REASONS`
  + its contracts mirror + lockstep test; the API human message (*"The finance officer recorded the bank's date for the joining fee — check
  again."* — an exhaustive `Record`, compile-enforced); ALL THREE admin maps — `approveBlocked`, `finalVoteGate`, `r9Gate` (the same
  sentence; ⛔ compile-enforced — a miss reads as `not_checked`, G6); the two hand-typed reason lists in
  `packages/contracts/tests/claims-verifier-console.test.ts`; the four-reason precedence `toEqual` in
  `packages/contracts/tests/claims-membership-check.test.ts` (it becomes five, in the new order); and the literal four looped in
  `apps/admin/tests/membership-check.test.tsx` (G11). ⇒ the deny guard refuses `fee_paid_after_death`
  while it holds (N4), and the cycle-freeze commit skips such a claim (6.39 DL6, unchanged code — the ONE definition). *Rejected:* reusing
  `stale` (its words say the certificate changed — G6).
- **DL8 — Who: a NEW key `claim.record_fee_bank_date`**, granted to `finance_officer` ONLY (ceiling `pariwar`); `super_admin` by
  derivation. Gated at `dimension: 'district'` on the deceased's posting district for the per-claim routes (a `pariwar` grant satisfies it
  — G4; copy `claims.membership-check.routes.ts`' `districtFromStash`), at `dimension: 'pariwar'` for the list. Catalog 66 → 67, 98 → 99
  keys at 2026-11-27 (Story 3.13 took v66; READ LIVE). ⛔ Granted to any role holding `claim.check_membership`, `claim.approve`,
  `cycle.freeze` or `claim.r9_vote` (N7) — `district_admin`, `pariwar_admin` and the approvers among them. *Rejected:* the District Admin
  (the 6.39 reading in `-473`): they do not hold the Trust's statement, and the same hand would type the date AND decide the check.
  ⚠ G4: if the Trust has no finance officer at go-live, only a Super Admin can record a bank date — a go-live leg (DL13).
- **DL9 — Step-up (ANSWERED at 0.2: keep it, with a go-live leg).** The POST requires a FRESH step-up after the permission hook
  (`requireStepUp`, a new context constant in the contract file that the route AND the admin caller import — G9): a staff power over a
  bright line (Q2 B's cost), and this act alone moves the fee date. ⚠ Its cost, stated: in production ⛔ admin step-up code is delivered
  (G9), so the bank date cannot be recorded there until deferral R4 is discharged — DL13 (e) holds go-live on it. *Not chosen at
  0.2:* ⛔ step-up, as the membership check has none (the act is then usable at go-live without R4; the power rests on the
  key, the reason, the note and the audit alone). The admin page holds the write on `auth.step_up_required` and re-sends it through the
  shared `StepUpPanel` (G9) — ⛔ a second step-up UI. ⚠ In the browser pass sign-in is the cookie helper and the step-up's code comes
  from the admin stub's dev reveal ([[project_admin_browser_pass_launcher]]) — record both as limits.
- **DL10 — Routes and the finance officer's page.** `GET /api/v1/p/:pariwarId/admin/fee-bank-dates` (pariwar dimension) — in the window, in
  two sections (below): the claims the live check holds on its fee (`fee_outcome` blocking — plaintext, ⛔ decrypt), and those with a live
  record whose check now passes; each with the
  claim id, the posting district, the recorded fee date (IST), the amount, the reference's last four, `fee_date_source`, the live record
  (date, reason, who, when) and `expected_live_check_id` / `expected_live_record_id`. The payment on a row is the one the LIVE CHECK
  names (`fee_receipt_id` — one join; ⛔ a second definition of "the joining receipt", ⛔ a per-row call of the reader). Capped: `?limit`
  in the `certificate-reminders` shape (`clampLimit` INLINE in `.limit(...)` — the only form the `domain-accessor-invariants` gate
  accepts for a dynamic cap; read cap + 1), longest-held first (the live check's `decided_at`), each section's `*_truncated: true` when its cap cut it.
  ⭐ TWO sections, each read and capped on its own, so a claim already helped never pushes a held one past the cap: **held** — the live
  check's `fee_outcome` blocks (this includes a claim whose bank date is recorded and whose re-check is still owed — its live check still
  blocks); **recorded, ⛔ held** — a live record exists and the live check passes (listed only so a wrong date can be corrected — DL5
  (b)). The wire carries `held: [...]`, `recorded: [...]`, `held_truncated`, `recorded_truncated`. ⛔ The check's
  `fee_outcome` on either route's wire or on the page: `same_day` beside a bank date IS the date of death (N2).
  `POST …/admin/claims/:claimCaseId/fee-bank-date`
  (district dimension + step-up) `{ statement_reference, bank_credit_date, reason_code, note, expected_live_check_id,
  expected_live_record_id }`. Route-level codes `fee_bank_date.*`: `not_found`, `window_closed`, `not_held`, `no_fee_receipt`,
  `reference_mismatch`, `in_future`, `before_joining`, `invalid_reason`, `stale`, `missing_display` (`invalid_reason` is the DOMAIN
  writer's defence: through the route the contract's enum answers 400 `request.validation` first). Both in ONE routes file
  `apps/api/src/modules/claims/claims.fee-bank-date.routes.ts` (+ `.handlers.ts`), registered in `registerClaimsModule` after
  `registerMembershipCheckRoutes`, classified in the human-actor gate's COVERAGE_SET (`pathSubstrings: ['fee-bank-date']` — it matches
  both paths; `expectedMethods: ['get', 'post']`; `COVERAGE_FLOOR` 20 → 21). Zod contracts `packages/contracts/src/claims/fee-bank-date.ts`
  (`.strict()`; the reason tuple DOMAIN-owned, mirrored with a lockstep test `claims-fee-bank-date.test.ts`;
  `statement_reference`: `z.string().trim()` THEN
  the receipt contract's UTR regex — the anchored regex alone would 400 a trailing space before the handler could trim it;
  `bank_credit_date`: a `YYYY-MM-DD` that is a real calendar date, refined in the contract (400) and re-asserted by the writer).
  Admin: a NEW page `/p/$pariwarId/fee-bank-dates` (`apps/admin/src/modules/fee-bank-dates/`), registered as
  `certificate-reminders` is in ALL of its places: the route in `router.tsx`; a route component (`routes/FeeBankDatesRoute.tsx` — the
  session gate, the list's own 401 / 403, a failed refetch keeps the list, an empty list says so: `CertificateReminderRoutes.tsx`); and
  the nav link in `routes/RootLayout.tsx` (inside a Pariwar context, UNGATED — the server's 403 is the boundary; without the link the
  page is reachable by a typed URL only). The page owns the mutation and the tokens, and holds a write on `auth.step_up_required`
  through the shared `StepUpPanel` (G9); copy English only (DL11). ⛔ Name and ⛔ date of death on the page
  or its wire (N2).
- **DL11 — Staff words (English only — APPROVED word for word by BigDev at 0.2, 2026-11-27).** The finance officer's page: title *"Joining fees to check
  against the bank statement"* · intro *"These claims are held because the joining fee was recorded on or after the date of death. If the
  Trust's bank statement shows the payment arrived earlier, record the date it arrived."* · row *"Recorded on {date} · ₹{amount} ·
  reference ending {last4}"* · fields *"Payment reference, as shown on the statement"* / *"Date the money arrived, as shown on the
  statement"* / *"Why the recorded date is wrong"* (*"The member recorded the payment late"* · *"The family recorded the payment after the
  death"* · *"Other"*) / *"Note — which statement, and what you saw"* · recorded *"Recorded. The District Admin must now check the claim
  again."* · refusals: mismatch *"This reference does not match the payment recorded for the member. Check that you have the right line
  on the statement."*; before joining *"That date is before the member joined. Check the date on the statement."*; future *"That date is
  in the future."*; not held *"This claim is not held on its joining fee."*; window *"A bank date can no longer be recorded on this
  claim."*; stale *"This claim changed since you opened it. It has been reloaded — check again."*; not found *"This claim could not be
  found. Reload the page."*; no joining payment *"The record of the member's joining fee cannot be identified, so a bank date cannot be
  recorded. Please tell the Super Admin."*; no display name *"Your account has no display name, so a bank date cannot be attributed to
  you. Ask a Super Admin to set it."*; a 400 *"Something in the form is not right. Check each field and try again."*; a 401 *"Your session
  has ended. Sign in again, then record the bank date."* (a 403 shows the no-access line; the step-up the shared panel's words); form
  prompts — reference empty *"Enter the payment reference as it appears on the statement."*, reference shape *"A payment reference is 12
  digits, or 22 letters and digits."*, date empty or unreal *"Enter the date the money arrived, as a real date."*, reason missing
  *"Choose why the recorded date is wrong."*, note missing *"Write a note — which statement, and what you saw."* (these, approved
  2026-11-27 with Task 0.4); nav *"Joining fee bank dates"* · empty
  *"No claim is held on its joining fee."* · cut list *"Only the longest-held claims are shown."* · second section heading *"Bank dates
  already recorded on claims whose check now passes"* (a claim here may still wait for the District Admin's re-check) (its empty state: ⛔ section shown) · no access *"You do not have
  permission to record bank dates."*. The District Admin's console (`MembershipCheckControl`): the note under a blocking fee line
  (`feeAfterDeathNote` — today *"No drive can open for this claim. Record the check, then deny the claim with the reason "Fee paid after
  the death"."*, `-474` item 3) is AMENDED for the one case the Panel changed, a blocking outcome from the RECORDED date — in the order the
  build allows (DL5: the finance officer can act only on a RECORDED check): *"No drive can open for this claim on the recorded date. Record
  the check. If the member may have paid before the death, then ask the finance officer to check the Trust's bank statement before you deny;
  otherwise deny the claim with the reason "Fee paid after the death"."*; a blocking outcome from the BANK's date keeps today's note,
  unchanged. (*Not chosen at 0.2:* ⛔ amendment — today's
  note stays and the bank sentence is a separate line beside it; cost: one screen then tells the District Admin to deny and, beside it,
  that the bank could still help.) When the bank's date is used — *"The Trust's bank statement shows the payment arrived on {date}
  (recorded by {name})."*; the wait reason (DL7) and `bank_date_changed` — *"The finance officer recorded the bank's date since you
  opened this check. It has been reloaded — check again."*; `same_person` (DL6) — *"You recorded the bank's date on this claim, so
  another person must record this check."*. Left as approved: the three gate lines for `fee_after_death` (`approveBlocked`,
  `finalVoteGate`, `r9Gate`), the API's message, the deny reason's label and `-476`'s guard line — a 409 carries the reason, ⛔ the
  source. ⚠ Microcopy gate: ⛔ "receipt" (G8).
- **DL12 — Events and audits (N6).** NEW event `claim.fee_bank_date_recorded` (annotation, ⛔ state change — the reducer's no-op arm;
  payload `record_id`, `fee_receipt_id`, `reason_code`, `superseded_record_id`); lockstep per 6.39 G11 (`CLAIM_EVENT_TYPES` 40 → 41; a frozen
  literal `STORY_6_39A_CLAIM_EVENTS = ['claim.fee_bank_date_recorded']` + its exclusion clause). Audits `admin_claim.fee_bank_date_recorded`
  and `admin_claim.fee_bank_date_rejected` (every refusal the HANDLER raises, its code — `reference_mismatch` included, ⛔ the typed value;
  a 400 `request.validation`, a 401 / 403 and the step-up refusal are answered by Fastify's validation and the preHandler hooks BEFORE the
  handler runs and are ⛔ audited here — AC9 asserts ⛔ such line), through 6.39's
  `emitAuthAudit` path, after the transaction closes; the membership check's existing audits gain `fee_date_source`
  (a code — the ONE exact-match assertion on the success line's context
  gains the key, AC5). ⛔ Read audit
  for the list (⛔ Tier-1 on it).
- **DL13 — Records.** A NEW roster row (the next free — Row 58 at 2026-11-27; decision-authored, Row 46's format) *"Story 6.39a: the bank's date can be
  used at go-live"* with legs: (a) row `6-39a` `done` on `main`; (b) PQ1–PQ4 RULED and reflected in code (an open PQ can stay open for ever
  behind a built default — Row 46 note 1); (c) at go-live a named person holds `claim.record_fee_bank_date` (a finance officer, or the Super
  Admin by decision) AND has the Trust's bank statements (G4; Q2 B's *"someone must match the payment"*), and ANOTHER person holds
  `claim.check_membership` there (N7 — the recorder cannot record the check that uses the date; with ONE person only, a bank date they
  record leaves the claim waiting for ever — TR14); (d) the real-browser pass of the
  page and the console's new lines — or un-attested; (e) while DL9's step-up stands: an admin can complete a step-up in production —
  deferral R4 discharged (the dependency Row 47's notes name, G9) — or the step-up is withdrawn by a dated decision. Row 46 gets a
  dated line when this row lands (its (b) PQ1 (b) half reflected).
  `deferred-work.md`'s corrected-UTR item: *"Not addressed by 6.39a — the match is against the STORED UTR (N3); a member whose stored UTR
  is wrong cannot be matched: PQ2"* (dated note, its text kept) ([[feedback_closure_language_precision]]).
- **DL14 — ⛔ Scope creep.** ⛔ Family-facing words (the family sees nothing while the finance officer looks — `-474` item 5 keeps Q4's line
  to `identity_not_confirmed`); ⛔ helpline words; ⛔ a change to the receipt, its `valid_through`, the lock-in event, any member lifecycle
  state, the door, either deny vocabulary or the appeal; ⛔ a way to reopen a REFUSED claim without an appeal (PQ1 option C); ⛔ a statement
  upload or parser (DL3); ⛔ a notification to the finance officer (the page is the queue); ⛔ the date of death or a name shown to the finance
  officer (N2); ⛔ the bank date on the cycle-freeze page or the R9 panel (the gate's words carry it); ⛔ a requirement that the bank be
  looked at before a fee refusal (Q2 B says "may"; the console's line asks — DL11); ⛔ the Niyamavali §2.2 15-day lock-in.

## Panel questions — RULED 2026-11-27 (`2026-11-27-511`, Trustee-ratified, DR + KB: *"Q1 B, Q2 A, Q3 A, Q4 A"* — every one as built; the questions below are kept as put)

- **PQ1 — After a refusal: can the bank's date still help a family whose claim was already refused?** (`-473` "does NOT cover": *"Before a
  denial only …, or also after a `fee_paid_after_death` refusal, or on its appeal"*.) A family may be refused before anyone looks at the
  bank statement. Options: **A** — the bank's date only BEFORE the claim is refused (cost: a family refused first is never helped, even if
  the bank later shows the money came in time; nothing makes staff look first — the console only asks). **B** — also once the family's
  appeal sends the claim back (cost: the 6.39 note's told line 1 — *"even an appeal that agrees with the family cannot open a drive"* —
  becomes untrue in this one case; appeal reviewers must know to ask the finance officer; the appeal stages are outside the window, so the
  appeal is decided BEFORE any bank date can be recorded — on what the reviewers are told, ⛔ a recorded check — and if the bank then does
  not bear it out the claim is refused again at the final vote with the family's one appeal spent; the note's Q1 B states this cost; DL5
  carries an option to record during the appeal). **C** — staff may reopen a refused claim
  directly, without an appeal (cost: a new way to undo a refusal, a new build). Suggest **B** (the remedy the Panel gave has ⛔ time limit in
  its words, and the appeal is the family's existing second look). **Built: B** — the record is allowed in the review window, which already
  holds an appeal-reversed claim (G5); A would need a new rule. ONE test names PQ1 (AC6). ✅ **RULED B** (`-511`).
- **PQ2 — A payment reference that does not match.** The reference a member (or the family) types is never checked against a bank; if it
  was mistyped, no line on the statement carries it (G2 — and a corrected one typed later is kept nowhere). Options: **A** — only a
  statement line carrying the SAME reference counts (cost: a member who really paid but whose reference was recorded wrongly cannot be
  helped; nothing can correct the recorded reference today). **B** — staff may match by amount, day and the payer's name instead, and a
  second staff member must agree (cost: a judgment between many ₹110 payments; the finance officer must see the member's name — a new
  disclosure; another person's payment could be taken for the member's). Suggest **A** (the reference is the only thing on a statement that
  ties a payment to this member). **Built: A** (N3). ONE test names PQ2 (AC4). ✅ **RULED A** (`-511`).
- **PQ3 — The bank's date ON the day of death.** Options: **A** — counts as after, as the recorded date does since your 21 November ruling
  (cost: a member whose money arrived that morning gets ⛔ drive). **B** — counts as before (cost: two different lines for "before the
  death" — one for the recorded date, one for the bank's). Suggest **A** (one line). **Built: A** (N1). ONE test names PQ3 (AC5).
  ✅ **RULED A** (`-511`).
- **PQ4 — Is one person's reading of the statement enough?** (`-473` "does NOT cover": *"whether a second person must agree was ⛔
  asked"*.) The finance officer types the date, and nobody else checks it against the statement (TL2). Options: **A** — one finance
  officer's record is enough; the District Admin's re-check and the final vote follow, but neither sees the statement (cost: one person's
  typed date can open a drive; a wrong date is caught only if someone later compares the audit with the statement — G10's bounds are all
  the system has). **B** — a second person who also has the statement must confirm the date before it counts (cost: two people with the
  Trust's bank statements, when even one finance officer is ⛔ settled — G4; slower for the family; a new build). **C** — keep a copy of
  the statement line with the record (cost: a store of other payers' names and VPAs — DL3's rejected upload; counsel has ⛔ looked at
  it). Suggest **A** (the record names the statement, the line and the reason under the finance officer's name, so it can be checked
  afterwards). **Built: A** (DL3, DL8). ONE test names PQ4 (AC3). ✅ **RULED A** (`-511`).
- **TOLD LINES (⛔ asked — the note states them so the Panel can object):**
  - **TL1 — Who.** The Trust's finance officer records the bank's date; the District Admin then checks the claim again, and the final
    vote follows as always. The system refuses that re-check from the person who typed the date, whatever roles they hold (N7). The
    first approver and the final voter are kept apart by role only: a person given both the finance officer's role and an approver's or
    the Pariwar Admin's — or the Super Admin, who holds every power — could type the date and later approve the claim or cast the final
    vote. Whether a second person must AGREE the date
    itself is PQ4. ⚠ If the Trust has no finance officer, the remedy rests on the Super Admin
    (DL13 (c)).
  - **TL2 — What is kept.** ⛔ Copy of the statement: the finance officer types the reference and the date, gives a reason and a note, and
    it is audited under their name. The system checks the reference; nobody re-checks the date (PQ4).
  - **TL3 — Told line 1 of 21 November is no longer true** (already flagged in `-473`): the fee date now changes in a second way — the
    bank's date — and, under PQ1 B as built, an appeal CAN lead to a drive in this one case.
  - **TL4 — A later bank date never counts against a family** (DL6, answered 2026-11-27): when the bank's date is later than the
    recorded one, the recorded date is kept — Q2 B's words let staff use the bank's date when it shows the money arrived *before* the
    death (a MATCH, ⛔ a narrowing: a later date shows nothing of the kind). The note's told line 7.

## Acceptance Criteria

1. **AC1 — The record (DL1).** ONE migration (the next free number; drizzle `when` after every sibling's): `claim_fee_bank_dates` with the
   TS-declared RLS (incl. UPDATE policy), the at-birth grants, the guard, the one-way trigger and the one-live index; the two new
   `claim_membership_checks` columns, their CHECKs and the REPLACED guard; the schema files + journal agree (⛔ regenerate an applied
   migration — [[project_live_db_test_gotchas]]). Live-DB: a second live record ⇒ 23505; UPDATE of any column but `superseded_*` /
   `note_ciphertext` ⇒ refused; `superseded_at` back to NULL ⇒ refused; DELETE ⇒ refused; another Pariwar sees ⛔ row; on a check row, an
   UPDATE of `fee_date_source` or `fee_bank_date_id` (as table owner, past the grant) ⇒ refused by the REPLACED guard; `'bank'` with a null id
   ⇒ CHECK violation; `'recorded'` WITH an id is accepted (DL6's earlier-date case — under the "always replaces" option this leg becomes
   a violation instead).
2. **AC2 — One rule (DL2).** Unit: `compareFeeCalendarDateWithDeathDate` — the day before / of / after ⇒ `before_death` / `same_day` /
   `after_death`; a malformed date on either side throws; 6.39's `compareFeeDateWithDeathDate` IST-boundary legs pass UNCHANGED.
3. **AC3 — Recording a bank date (DL3, DL5, DL9, DL10).** API live-DB as a finance officer, on a claim whose live check reads `after_death`
   from the recorded date: a matching reference + a date before the death + reason + note ⇒ 201, ONE live record, `claim.fee_bank_date_recorded`
   appended, the claim's state unchanged; each refusal with ⛔ row: `window_closed` (a `denied` claim), `not_held` (⛔ live check; a live
   check that passes with ⛔ live record), `reference_mismatch`, `in_future`, `before_joining`, a missing note / unknown reason (400),
   `stale` (either expected id); ⛔ step-up ⇒ the step-up refusal; a second record supersedes the first (`re_recorded`), ONE live after; a
   correction is accepted while the claim passes on an earlier bank date (DL5 (b)); a claim whose District Admin has ⛔ recorded a check
   (the preview blocks, ⛔ live check) ⇒ `not_held` and absent from the list (DL5's only path); a correction on a claim that passed on a bank
   date and reached `state_trustee_approved` ⇒ `window_closed` (corrections stop — DL5). The list: in the window, longest-held first, ⛔ `fee_outcome` on the wire; the TWO sections
   (DL10) — a held claim and a passing-with-record claim land in their own section; with the held cap set to N and N held claims plus
   recorded ones seeded OLDER, every held claim is listed and `held_truncated` is `false` (a resolved claim never crowds out a held one);
   each section's `*_truncated` past its own cap. ⚠ Every 401 / 403 / step-up leg sends a VALID body (TR9). ONE test names PQ4: one finance
   officer's record is accepted with ⛔ second confirmation.
4. **AC4 — The match (N3, PQ2).** ONE test names PQ2: a receipt whose stored UTR differs from the statement's reference by one digit ⇒
   `reference_mismatch`, ⛔ row — and the typed value appears in ⛔ audit context, log line or response body (planted value). ⚠ The
   log half runs on a server built with a captured stream (`buildServer(deps, { logStream })` — test servers otherwise run with
   `logger: false`, and a "no log line" assertion cannot fail), with a POSITIVE control in the same file: a planted value the test causes
   to be logged IS found in the captured stream. A source leg pins that the writer's `sql` templates take ⛔ typed reference (DL3, TR5). A
   22-character reference stored in lower case and typed in capitals, and a reference typed with a trailing space, are ACCEPTED (DL3 —
   the same reference).
5. **AC5 — The check uses it (DL6).** Live-DB: after a record, the preview shows `fee_date_source 'bank'`, the record and the recomputed
   outcome; the District Admin's re-check stores `fee_date_source 'bank'` + `fee_bank_date_id`; a bank date the day BEFORE the death ⇒
   `before_death` and the gate passes (identity permitting); ONE test names PQ3: a bank date ON the day of death ⇒ `same_day` and the gate
   answers `fee_after_death`; a bank date after ⇒ `after_death`; a POST with a stale `expected_fee_bank_date_id` ⇒ 409
   `membership_check.bank_date_changed`, ⛔ row; a record naming a receipt that is ⛔ the joining one (raw fixture — defence) is ignored
   (`'recorded'`, a NULL `fee_bank_date_id`) — and the gate then answers `bank_date_recorded` until a new record supersedes it (fail
   closed: the claim waits — ⛔ assert a pass). **The earlier date (DL6, as answered at 0.2):** a bank date LATER than the recorded date
   ⇒ the check stores `fee_date_source 'recorded'` AND the record's id, the outcome is the recorded date's, and the gate does ⛔ answer
   `bank_date_recorded` afterwards (the stored id matches the live record) — the leg the "always replaces" option would flip. **The
   writer's own re-assert (DL6, TR7):** a DOMAIN leg calling `recordMembershipCheck` directly with `computedAgainstFeeBankDateId` = R1
   while R2 is live, and with `null` while a live record exists ⇒ each `bank_date_changed`, ⛔ row (the handler's compare runs first, so
   an API leg never reaches this one). **The same person (DL6, N7):** a re-check by the actor who recorded the live bank date ⇒
   409 `membership_check.same_person`, ⛔ row — for a Super Admin, and for a user holding BOTH role grants; another actor's is accepted.
   **One person only (TR14):** with the recorder the only actor holding `claim.check_membership`, the claim answers `bank_date_recorded`
   and the deny route refuses `fee_paid_after_death` — the wait is asserted, ⛔ hidden.
   6.39's existing membership-check specs pass with ⛔ assertion WEAKENED. These kinds of edit — and ⛔ others — are allowed there:
   (i) REQUEST edits: every existing check POST body gains `expected_fee_bank_date_id: null`, and every direct writer call the new input
   field (re-derive the files with `git grep -lE "expected_live_check_id|expectedLiveCheckId" -- apps packages`; at `6536b8bb` it lists
   nine — the five specs / tests `apps/admin/tests/membership-check.test.tsx`, `apps/api/tests/integration/claims/membership-check.spec.ts`,
   `packages/contracts/tests/claims-membership-check.test.ts`, `packages/domain/tests/integration/claim/membership-check-approval.spec.ts`,
   `…/membership-check-concurrency.spec.ts`, and the source files the story changes anyway: `apps/admin/src/routes/VerifierConsoleRoute.tsx`,
   `claims.membership-check.handlers.ts`, `packages/contracts/src/claims/membership-check.ts`, `membership-check-persist.ts`);
   (ii) the ONE exact-match assertion on the success audit's context (`membership-check.spec.ts`, under *"The success line carries the
   ids and the codes"*) gains `fee_date_source: 'recorded'`; (iii) every preview body or fixture — the whole-body preview `toEqual` in the same spec (the GET leg)
   and the preview fixtures in `packages/contracts/tests/claims-membership-check.test.ts` and `apps/admin/tests/membership-check.test.tsx`
   (`.strict()` refuses a fixture without the new fields) — gains `fee_date_source: 'recorded'` and `fee_bank_date: null`; (iv) the typed `LiveMembershipCheck` / `MembershipCheckFacts` literals in
   `membership-check-approval.spec.ts` gain `feeBankDateId: null` / `liveFeeBankDateId: null`; (v) the reason lists: the four-reason
   precedence `toEqual` in `claims-membership-check.test.ts` becomes the five in DL7's order, and the literal four looped in
   `apps/admin/tests/membership-check.test.tsx` and in `claims-verifier-console.test.ts` gain `bank_date_recorded`. (ii)–(v) each ADD the new
   value beside every old one — a strengthening; ⛔ edit removes or loosens an existing expectation.
6. **AC6 — The appeal path (PQ1).** ONE test names PQ1, through the real path (the fixture of 6.39's "AC16 — through an appeal"): a claim
   denied `fee_paid_after_death` ⇒ a bank-date POST refused `window_closed`; the appeal reverses it ⇒ the record is accepted in `reversed`;
   the re-check passes; the final vote approves; the family's `refusal_reason` reads `null`.
7. **AC7 — The gate (DL7, N4).** Unit: precedence (`stale` before `bank_date_recorded` before `fee_after_death`); a check with
   `fee_bank_date_id` of a SUPERSEDED record ⇒ `bank_date_recorded`. Live-DB: `<prefix>.membership_check_required { reason:
   'bank_date_recorded' }` at one site per translator (`verifier_decision.`, `cycle_freeze.`, `r9_voting.`, `closure.`); the
   cycle-freeze commit skips such a claim; the deny guard refuses `fee_paid_after_death` (`<prefix>.fee_paid_after_death_not_shown`) while
   it holds and accepts it after a re-check that still blocks; `identity_check_waiting` stays `false` while it holds.
8. **AC8 — Who (DL8).** Catalog v67 / 99 keys at 2026-11-27 (READ LIVE); `finance_officer` holds `claim.record_fee_bank_date` at `pariwar`; POSITIVE
   legs for a finance officer and a Super Admin on both routes (the list and the POST); 403 for `district_admin`, `pariwar_admin`, `verifier`,
   `helpline_operator`; a finance officer of ANOTHER Pariwar ⇒ refused; `roles.test.ts` pins that ⛔ role holding `claim.check_membership`,
   `claim.approve`, `cycle.freeze` or `claim.r9_vote` holds the new key (N7) except `super_admin` — computed from the bundles, ⛔ a
   hand-typed role list; the human-actor gate classifies the routes file (COVERAGE_SET 21,
   `COVERAGE_FLOOR` 21).
9. **AC9 — Events and audits (DL12, N6).** `CLAIM_EVENT_TYPES` 41; `STORY_6_39A_CLAIM_EVENTS` listed; the event payload and every audit
   line carry ⛔ date, ⛔ note, ⛔ reference, ⛔ name (asserted on the serialized payloads with planted values, and on a captured log
   stream with its positive control — AC4); a refusal the HANDLER raises writes `admin_claim.fee_bank_date_rejected`, and a 400 / 401 /
   403 / step-up refusal writes ⛔ such line (DL12).
10. **AC10 — The fences (G11).** A new 6.39a `it` block forbids `decrypt` in the new domain writer and read modules AND in the
    finance handler (it may only ENCRYPT the note), with a planted-specimen positive control; the gate leaf still passes the NW1 transitive
    import scan; ⛔ `FENCED_FILES` change unless a new file shows a NAME (none should — N2).
11. **AC11 — The erasure scrub (G12).** Live-DB as `twt_app`: `anonymizeMember` writes the sentinel into a record's `note_ciphertext` (1 row
    matched, ⛔ 0), every other column unchanged; `rtbf-anonymize.test.ts`' THREE counts move by what the scrub adds (statements 36 →
    37 and tables 33 → 34 in the member-with-claims leg; statements 32 → 33 in the member-with-⛔-claims leg, since the scrub — like
    6.39's — is keyed on `deceased_member_id` and runs whatever the member's claims; at 2026-11-27 — READ LIVE), with a ledger clause in its comment as every story before.
12. **AC12 — The staff surfaces (DL10, DL11).** Admin component tests: the finance page lists the held claims (⛔ name, ⛔ date of death),
    the form refuses incomplete input in words, maps each `fee_bank_date.*` refusal to its line (⛔ raw code), refetches on `stale`, HOLDS
    the write on `auth.step_up_required` and re-sends it through the shared `StepUpPanel`; the list shows its empty, cut-list and
    no-access lines and ⛔ fee outcome, and its two sections (DL10 — the second only when non-empty, under its own heading); the nav link
    renders inside a Pariwar context; the console control shows the amended note ONLY under a blocking RECORDED fee date — its words say
    "Record the check" BEFORE "ask the finance officer" (the order DL5 allows) — and today's note under a blocking BANK date, the bank line
    when the bank is used, and the
    `bank_date_changed` / `same_person` words; each of the three admin maps (`approveBlocked`, `finalVoteGate`, `r9Gate`) shows
    `bank_date_recorded`'s OWN sentence — asserted ≠ the `not_checked` fallback. A
    real-browser pass of the page and the console (the 6.39 route — [[project_admin_browser_pass_launcher]];
    [[project_agent_chrome_cannot_reach_localhost]] — probe once) — or recorded un-attested ([[feedback_record_unattested_no_backfill]]).
13. **AC13 — The gate stays green.** Every existing approval-path and membership-check test passes with ⛔ assertion weakened (the fixture
    `seedPassedMembershipCheck` writes `fee_date_source 'recorded'` by the column default; the only edits to 6.39's specs are
    AC5's kinds (i)–(v) — the contracts and admin fixture updates for the new REQUIRED fields ([[project_contracts_tests_outside_tsc]])
    ARE kinds (i) and (iii), ⛔ a further kind); `ci:local` ALL jobs green (41 at `6536b8bb` — READ LIVE) on a FRESH container,
    DB named `twt_dev`, on the story's own port ([[project_prepush_hook_inherits_5432]]; [[project_known_livedb_test_failures]] #18).

## Tasks / Subtasks

- [x] **Task 0 — Governance FIRST, ⛔ code** ([[feedback_governance_commits_precede_implementation]])
  - [x] 0.1 `git fetch origin`; confirm `6536b8bb` is an ancestor of HEAD — if `origin/main` moved, REBASE (backup branch; a ledger conflict
        at most — branch lines on top; a ledger letter a landed sibling took is RELABELLED, as `21w` → `21ar` was); `git diff --name-only
        6536b8bb origin/main -- apps packages scripts` — re-derive G1–G14 if anything moved; `git log 6536b8bb..origin/main --
        .decision-log.md _bmad-output docs/launch-gate-inventory` — read any new entry; re-read the NUMBERS block across EVERY branch and
        worktree. ⭐ Re-read row `3-17-…`'s status and story file (G14): if it is past `backlog`, reconcile DL1's fee-date sources, the
        coherence CHECK and the guard REPLACE with it BEFORE Task 1 (TR13). Check `ListAgents` + the branch before every commit
        ([[feedback_concurrent_review_agents_mutate_tree]]).
        ⭐ DONE 2026-11-27 (dev-story): `git fetch origin` — `origin/main` = `6536b8bb`, an ancestor of HEAD; ⛔ rebase owed,
        ⛔ file under `apps` / `packages` / `scripts` moved. Numbers re-read on every ref: decision `-511` the top, migration
        `0218` the top (⇒ `0219`), catalog v66 (⇒ v67). Row `3-17` still `backlog` (G14 — DL1 stands). `ListAgents`: ⛔ peer.
  - [x] 0.2 Put DL1–DL14 to BigDev (DL11's English verbatim, with its amended console note and the no-amendment option; DL8's rejected
        District Admin named; DL9's step-up WITH its go-live cost and the no-step-up option; DL6's same-person check and the roles-only
        option; DL3's letter-case rule; DL6's earlier-of-the-two-dates rule and the always-replaces option; DL5's record-the-check-first
        path and its no-stored-check option; DL5's record-during-the-appeal option for PQ1; DL10's two list sections). Record the answers
        here, then AMEND N7, TL1, DL13's legs, the ACs and the Tasks to the answers as given — a PROPOSED default left standing in an AC
        gets built (AC1's `'recorded'`-with-an-id leg and AC5's earlier-date leg flip under the always-replaces option).
        ⭐ DONE 2026-11-27 — every answer was the proposed one (Debug Log References, *"Task 0.2 answers"*) ⇒ N7, TL1, DL13's legs, the
        ACs and the Tasks stand as written; ⛔ amendment was owed. ⚠ Still OWED words (⛔ in DL11's approved list, so ⛔ approved): the
        form's prompts for a missing or malformed field, and the page lines for `fee_bank_date.not_found`, `no_fee_receipt` and
        `missing_display` — put them to BigDev with Task 0.4's entry, ⛔ invent them at build time. ⭐ APPROVED 2026-11-27 (BigDev:
        "Approve as written"), now in DL11 and `-510` item 11.
  - [x] 0.3 Draft ONE routing note from the template (by path, ⛔ copied):
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-21-6-39a-bank-date-edges.md` (date = the day written) — PQ1–PQ4
        and TL1–TL3; plain-English question first, THE ONE FACT (*"the bank's date helps only a family whose recorded payment reference is
        on the Trust's statement, and the system cannot see the statement — a person types what it shows"*), options with an honest cost
        on each, evidence LAST; E4 commands run. Status: WRITTEN, ⛔ sent (BigDev sends). Non-blocking for build and merge; held for go-live
        (DL13).
        ⭐ DRAFTED 2026-11-21 at BigDev's ask, BEFORE 0.2: PQ1–PQ4 as its Q1–Q4, and six told lines (TL1–TL3, plus N2, the
        Policy-meaning note's *"may"* and DL14's family silence); E4 run, every result as stated. It describes the PROPOSED build ⇒ what
        is LEFT of this subtask: re-read told lines 1–2 and the *"will be built"* lines of Q2 and Q4 against the 0.2 answers, re-run E4,
        and remove its *"Before sending"* paragraph.
        ⚠ The next Panel sitting's agenda (`trustee-panel-sitting-2026-11-26-agenda.md`, on `governance/panel-sitting-2026-11-26`,
        PREPARED, ⛔ sent) lists this note as its item 1 and says to take it from this branch and remove that paragraph. ⇒ Task 0.2 must be
        answered and this re-read done BEFORE the sitting — else the note goes out describing build decisions nobody has made. Tell
        BigDev; ⛔ edit the agenda from this branch. If DL5's record-during-the-appeal option is taken, Q1 B's cost line changes too.
        ⭐ Also bring the note into line with v1.3 (a story edit, ⛔ a 0.2 answer): told line 1 — the first approver is kept apart by
        role only as well as the final voter (TL1); told line 4 and Q1 A's cost — the District Admin's screen now says to record the check
        FIRST and then ask the finance officer (DL11).
        ⭐ DONE 2026-11-27 (ledger `2026-11-27c`): the note brought into line with the 0.2 answers — its status line says so and the
        *"Before sending"* paragraph is REMOVED; §0 says "decided by BigDev on 27 November"; Q1 A's cost and told line 4 say record the
        check, then ask; told line 1 names the first approver and the one-person wait; told line 7 (= TL4, DL6's earlier date) ADDED;
        *"How much to trust"* lists the three corrections (4)–(6); E2 and E3 re-stated at `6536b8bb` (the answers, `-482`, the appeal
        stages, R4, `fee_receipt_id`); E4 RE-RUN at `6536b8bb` — every original result as stated but the first (`origin/main`), six
        commands added. Q1–Q4 and every option UNCHANGED. Status stays WRITTEN, ⛔ sent. ⚠ The sitting agenda points at `06a80355` —
        a pre-rebase SHA holding the OLD text (now only on `backup/6-39a-pre-rebase-2026-11-27`): BigDev takes the note from this
        branch's tip, ⛔ that SHA.
  - [x] 0.4 Decision entry (AUTHOR-COMMIT, the next free number across branches — `-510` at 2026-11-27; READ LIVE): DL1–DL14 as answered; builds `-473` Q2 B under
        `-474` item 1; declares N3 (a narrowing: the reference only — PQ2), DL8 (the finance officer — a MATCH on "staff", ⛔ the
        District Admin `-473` named as the author's reading), PQ1 built B (the widest literal reach); names PQ1–PQ4 open (PQ4 is asked beyond `-474` item 1's three — say so); mints the key and
        the roster row; AMENDS `-474` item 3's console note for the recorded-date case (an author-commit, amended — only if DL11's
        amendment is accepted); ⛔ supersedes a ratified entry. Committed ALONE, first ([[project_decision_log_writes_user_inserted]] — stage, try,
        verify; ask once on a refusal).
        ⭐ DONE 2026-11-27: **`2026-11-27-510`** committed ALONE as `22770eb0` (`-510` free on every ref and worktree after `git fetch
        origin`; the decision-log write was ⛔ refused). DL1–DL14 as answered, the owed staff words approved and included (item 11), `-474`
        item 3 amended for the recorded-date case, the declarations (finance officer a MATCH; the reference a NARROWING — Q2; the earlier
        date a MATCH; after an appeal the widest literal reach — Q1), Q1–Q4 named open with Q4 asked beyond `-474` item 1's three, the key
        and Row 58 minted; ⛔ ratified text superseded. Story citations of `-510` are by id.
  - [x] 0.5 Records: the roster row (DL13); `deferred-work.md` — PQ1–PQ4 open (trigger: the ruling) and the corrected-UTR item's dated
        note (DL13); the row-`6-39a` dated comment in `sprint-status.yaml`; ledger line + row `ready-for-dev → in-progress`
        ([[project_sprint_status_safe_prepend]] — verify `yaml.safe_load` and the row count).
        ⭐ DONE 2026-11-27 (ledger `2026-11-27e`): roster **Row 58** `fee-bank-date-live` (five legs (a)–(e), every one OPEN; the next
        free row on every ref) and a dated line on Row 46 (the PQ1 (b) half's build decided; ⛔ leg moves); `deferred-work.md` — a new
        section *"Story 6.39a Task 0.5 — four edges open with the Panel"* (PQ1–PQ4, each with its trigger), a dated *"Not addressed by
        6.39a"* note under the corrected-UTR item (its text kept), and a dated line under 6.39's PQ1 (b); the row comment; the row
        `ready-for-dev → in-progress`. Governance is DONE — Task 1 is next.
- [x] **Task 1 — The record (AC1, AC11)**
  - [x] 1.1 The migration (HAND-WRITTEN like `0212`; the guard REPLACE in the same file), `schema/claim_fee_bank_dates.ts` + barrel, the two
        columns in `schema/claim_membership_checks.ts` (+ `MEMBERSHIP_CHECK_FEE_DATE_SOURCES` — LOCKSTEP with the CHECK and the contract), the
        RLS policy file + `policies/index.ts`, the branded id, the field class.
  - [x] 1.2 Live-DB tests (AC1) — copy 6.39's `claim_membership_checks` spec; the anonymize leg (AC11) + `member/anonymize.ts` + the three
        counts in `rtbf-anonymize.test.ts`.
- [x] **Task 2 — The rule and the reads (AC2)**
  - [x] 2.1 `compareFeeCalendarDateWithDeathDate` + the delegation (DL2) + unit tests.
  - [x] 2.2 `readJoiningFeeReceipt` widened (DL4) — update its callers' types only; `getLiveFeeBankDate`, `listClaimsHeldOnFee` in a NEW
        `claim/fee-bank-date-read.ts` (⛔ decrypt; the list joins the payment by the live check's `fee_receipt_id`; TWO section reads,
        each `clampLimit` inline with its own `*_truncated` — DL10).
- [x] **Task 3 — The finance officer's act (AC3, AC4, AC8, AC9)**
  - [x] 3.1 Domain vocabulary (reasons, sources) + `claim/errors.ts` (`FeeBankDateRefusedError`) + contracts `fee-bank-date.ts` + export +
        lockstep test.
  - [x] 3.2 Writer `recordFeeBankDate` in `claim/fee-bank-date-persist.ts` (the claim-row lock FIRST; DL5's order: shape → lock → window →
        held → receipt → reference → bounds → tokens → supersede + insert + event) — ⛔ decrypt; the reference compared in TypeScript on
        the re-read `utr`, ⛔ passed to any query (DL3, TR5).
  - [x] 3.3 Event `claim.fee_bank_date_recorded` (registry, `claim/events.ts` tuple + payload map, reducer no-op arm, count 41, the frozen
        literal — G11).
  - [x] 3.4 The key (permissions doc block + bump block citing Task 0.4's decision + REUSE CHECK paragraph, `SEED_PERMISSION_KEYS`, version;
        `roles.ts` grant; `permissions.test.ts` / `roles.test.ts` incl. N7's pin).
  - [x] 3.5 Handlers + routes (DL10 — permission hook, then step-up on the POST; ⛔ decrypt; the note encrypted), registration, the
        human-actor gate entry + floor, audit types in `audit-sink.ts`.
  - [x] 3.6 Tests: AC3, AC4, the AC8 positive and 403 legs, AC9's planted values.
- [x] **Task 4 — The check and the gate (AC5, AC6, AC7, AC10)**
  - [x] 4.1 The gate leaf (DL7): facts + the new reason + precedence; `MEMBERSHIP_CHECK_WAIT_REASONS` + contracts mirror + the API message +
        ALL THREE admin maps + the two lists in `claims-verifier-console.test.ts` (DL7); the facts read stays ONE statement (36 reads).
        Run the NW1 scan AND a runtime import ([[project_type_only_import_cycle_trap]]).
  - [x] 4.2 The membership check (DL6): handler reads + preview fields + `expected_fee_bank_date_id`; writer re-assert
        (`computedAgainstFeeBankDateId`) + the same-person refusal + the two columns; `bank_date_changed` and `same_person` in
        `MembershipCheckRefusedError`'s reasons, `REFUSAL_MESSAGES` (exhaustive) and the admin `refused` map; `bank_date_changed` in the
        admin hook's refetch list; AC5's kinds (i)–(v) of edit to 6.39's specs.
  - [x] 4.3 The 6.39a fence `it` block + positive control (AC10).
  - [x] 4.4 Tests: AC5 (incl. the PQ3 test, the earlier-date leg, the direct-writer re-assert leg and the one-person wait), AC6 (the PQ1
        test), AC7; then the WHOLE 6.39 membership-check and approval-path suites (TR1).
- [x] **Task 5 — The staff surfaces (AC12)** — client + hooks for the page (copy `certificate-reminders`' list + 6.39's
      `usePostMembershipCheck` invalidations: a recorded bank date invalidates the console's preview and packet queries); the page, its
      route component and its nav link (`RootLayout.tsx`); the two list sections; the form with the shared `StepUpPanel`; the control's
      new lines (the amended note in DL11's record-first order);
      DL11's words in the module's `i18n-en.ts` and `verifierConsoleEn`; component tests; the browser pass (or
      un-attested).
- [x] **Task 6 — Close** — 6.1 `ci:local` on a FRESH container on the story's own DB (AC13); 6.2 the roster row's (a) status line, Row 46's
      dated line; 6.3 `deferred-work.md` dispositions (the corrected-UTR item; anything new); 6.4 Completion Notes, File List, Change Log;
      Status → review.

### Review Findings

Code review 2026-11-27 (`bmad-code-review`, chunked by task: Task 1 `5ac6d176`, Tasks 2–3 `5543b013`, Task 4 `41b90fff`, Task 5
`a67b0d23`; Blind Hunter + Edge Case Hunter + Acceptance Auditor per chunk, the load-bearing-invariant lens). 2 decision-needed, 33 patch,
4 defer, ~30 dismissed.

- [x] [Review][Decision] D1 — The console when a bank date was recorded but is LATER than the recorded date — the server answers `fee_date_source: 'recorded'` with `fee_bank_date` set (DL6, TL4); the control then HIDES the bank line (shown only for `'bank'`) and shows the AMENDED note ("…ask the finance officer to check the Trust's bank statement…"), though the finance officer has already looked: the District Admin is sent back for nothing. DL11 as approved covers "a blocking outcome from the RECORDED date" and "when the bank's date is used" — this state was never put to BigDev. Options: (a) keep as built (DL11 literal); (b) whenever a record was CONSIDERED, show a bank line and today's note (needs a new line, e.g. "The Trust's bank statement shows the payment arrived on {date} (recorded by {name}) — not earlier than the recorded date, so the recorded date is used." — new words for approval); (c) show the existing bank line for any considered record and today's note (no new words, but the line reads as if the bank date were used). [`apps/admin/src/modules/claim-verification/MembershipCheckControl.tsx`]
- [x] [Review][Decision] D2 — The page's line for a lost response / 5xx — `refusedGeneric` ("The bank date could not be recorded.") is unapproved AND can be false (the write may have committed — the 6.22 R2-3 lesson). Options: (a) keep, listed as unapproved; (b) a new line, e.g. "The bank date may not have been recorded. The list has been reloaded — check the claim before you record it again." + reload the list on an untyped failure (new words for approval). [`apps/admin/src/modules/fee-bank-dates/errors.ts:18`]
- [x] [Review][Patch] C1 — The owner-guard leg for `fee_date_source` cannot fail (it changes `fee_bank_date_id` in the same UPDATE); the twt_app column-grant leg likewise — isolate each column; add a catalog pin (every column minus the three granted ones appears in `pg_get_functiondef` of the guard) [`packages/domain/tests/integration/rls/claim-fee-bank-date-policy-regression.spec.ts:416,430`]
- [x] [Review][Patch] C1 — `fee_bank_date_id` is not tied to the check's own claim — `UNIQUE (record_id, claim_case_id)` + a composite FK `(fee_bank_date_id, claim_case_id)` (0219 is unmerged — edit in place, recreate the story container) [`packages/domain/migrations/0219_claim-fee-bank-dates.sql:155`]
- [x] [Review][Patch] C1 — The payment → bank date → check cascade (three deep) is never exercised — seed a `'bank'` check before the payment DELETE [`claim-fee-bank-date-policy-regression.spec.ts`, the cascade leg]
- [x] [Review][Patch] C1 — The TRUNCATE leg cannot tell which table's trigger refused — assert the message names `claim_fee_bank_dates` [same spec, TRUNCATE leg]
- [x] [Review][Patch] C1 — The one-way supersession is tested for twt_app only — add an OWNER revival leg [same spec]
- [x] [Review][Patch] C1 — The SQL vocabularies are pinned one way only — pin each new CHECK's `pg_get_constraintdef` against its TS constant; name `claim_fee_bank_dates` in the jobs "no-decision" table lists [same spec; `apps/jobs/tests/claim-suspicion-*-no-decision.test.ts`]
- [x] [Review][Patch] C2 — The writer's "blank note" check tests CIPHERTEXT, which is never blank — say what it guards (an empty envelope) [`packages/domain/src/claim/fee-bank-date-persist.ts`, step (0)]
- [x] [Review][Patch] C2 — The 403 / cross-Pariwar legs assert `>= 400`, never that ⛔ `_rejected` line was written; ⛔ 401 leg exists; the AC8 comment says "stepped up" but nothing is — exact codes, the ⛔-audit assertion, a 401 leg with a valid body, the comment fixed [`apps/api/tests/integration/claims/fee-bank-date.spec.ts`]
- [x] [Review][Patch] C2 — The captured-log check covers only the reference and the note on the 409 path — add the bank date, a planted display name and the 400 path [same spec, AC4 leg]
- [x] [Review][Patch] C2 — The list's window filter has ⛔ negative leg — an out-of-window claim with a blocking check is absent from `held` [same spec]
- [x] [Review][Patch] C2 — `auditReason` says `concurrent` where the wire code is `fee_bank_date.stale` (DL12 "its code") [`apps/api/src/modules/claims/claims.fee-bank-date.handlers.ts:90`]
- [x] [Review][Patch] C2 — The two list sections are separate statements: one claim can land in BOTH (a re-check between them) — drop from `recorded` any claim already in `held` [`packages/domain/src/claim/fee-bank-date-read.ts:235`]
- [x] [Review][Patch] C2/C3 — ⛔ live two-connection race test: two finance officers at once (one wins, the other `stale`), and a finance officer vs a District Admin check [new domain concurrency spec]
- [x] [Review][Patch] C2 — Untested branches: `no_fee_receipt` and the receipt-mismatch `stale` in the writer [domain spec]
- [x] [Review][Patch] C2 — The IST bounds have ⛔ midnight-edge leg (a bank date equal to IST today while UTC is still yesterday) — the writer takes `now`, so a domain leg [domain spec]
- [x] [Review][Patch] C3 — Two 6.39 contract assertions went VACUOUS: the kind (i) token was not added to the bodies at `:85-86`, so they fail on the missing bank token, ⛔ on the live-check token they test [`packages/contracts/tests/claims-membership-check.test.ts:85-86`]
- [x] [Review][Patch] C3 — The PQ1 test never shows the bank date producing the pass (bank date = recorded date; the passing outcome is handed to the writer) — a strictly earlier bank date, a death date between, the outcome computed by the ONE rule [`packages/domain/tests/integration/claim/fee-bank-date-check.spec.ts`, PQ1]
- [x] [Review][Patch] C3 — The translator spec's "a re-check naming the record lets it through" is a GATE-level leg on a raw record — say so in the test [`apps/api/tests/integration/claims/membership-check-bank-date-routes.spec.ts`]
- [x] [Review][Patch] C3 — `String.replace` with a display name interprets `$&` / `$'` — use replacer functions [`MembershipCheckControl.tsx`; `FeeBankDatesPage.tsx` row line]
- [x] [Review][Patch] C3 — DL12 partly done: the read audit lacks `fee_date_source`; the rejected audit does not echo `expected_fee_bank_date_id`; the success audit lacks `fee_bank_date_id` [`claims.membership-check.handlers.ts`]
- [x] [Review][Patch] C3 — Completion Notes undercount the edits beyond AC5's kinds (also: the lockstep line and the new `it` in `claims-membership-check.test.ts`, the three map pins in `membership-check.test.tsx` — all additive) [story Completion Notes]
- [x] [Review][Patch] C3 — A recorded membership check does not refresh the finance officer's list (`feeBankDatesKey`) [`apps/admin/src/api/hooks.ts` `usePostMembershipCheck`]
- [x] [Review][Patch] C3 — The DL7 comments say "compile-enforced" — the maps are `Record<string,string>`; the test pins enforce them [`apps/admin/src/modules/claim-verification/i18n-en.ts`]
- [x] [Review][Patch] C4 — The form stays editable while the write is in flight (⛔ hold generations): a 403 landing after an edit holds and re-sends the OLD body — disable the fields while pending or held [`FeeBankDatesPage.tsx`]
- [x] [Review][Patch] C4 — The outcome lives inside the row's form: a row that moves sections or vanishes (success, `stale`, `not_held`, `window_closed`, `not_found`) unmounts the "Recorded" / refusal line and may open an empty form; "Recorded" has ⛔ way out — lift the last result to the list (one announced line, keyed by claim), close the form on success [`FeeBankDatesPage.tsx`]
- [x] [Review][Patch] C4 — Another row's "open" stays enabled mid-write: unmounting the form drops the write's callbacks (a step-up hold, a refusal) — disable while a write is in flight or held [`FeeBankDatesPage.tsx`]
- [x] [Review][Patch] C4 — The note and the typed reference stay in the mutation's `variables` (gcTime 5 min) and the retry closure, contrary to the comment — `gcTime: 0` + `reset()` after the outcome; the comment fixed [`hooks.ts` `usePostFeeBankDate`; `FeeBankDatesPage.tsx`]
- [x] [Review][Patch] C4 — Prompts/refusals: an edit leaves the old alert up; a repeated prompt is not re-announced; ⛔ `aria-invalid` / `aria-describedby`; focus is lost on success — clear on edit, re-key the alert, tie it to its field, focus the result line [`FeeBankDatesPage.tsx`]
- [x] [Review][Patch] C4 — A 401 on the POST shows a line but never goes to sign-in (the list's 401 does) [`FeeBankDatesPage.tsx`]
- [x] [Review][Patch] C4 — The test claims DL11 word for word but compares 14 refusal / field / reason strings with the copy file itself — pin each as a literal [`apps/admin/tests/fee-bank-dates.test.tsx`]
- [x] [Review][Patch] C4 — `StepUpPanel` is not keyed by `holdKey(pending)` (the panel's header) [`FeeBankDatesPage.tsx`]
- [x] [Review][Patch] C4 — Test gaps: an edit while in flight then a 403; the row after the refetch; a section move / a vanished row after a refusal; the nav link's params [`fee-bank-dates.test.tsx`]
- [x] [Review][Patch] C4 — `deferred-work.md`'s list of unapproved page strings misses the route's inline session lines and the unmarked `refused.invalid_reason` [deferred-work, 6.39a dev section]
- [x] [Review][Defer] C1 — `claim_fee_bank_dates`' cached `pariwar_id` / `deceased_member_id` / `fee_receipt_id` are not tied to the claim or its member at the DB (the erasure keys on the cache) [`0219`] — deferred, the 0212 / 0218 pattern; the writer takes each from server state (verified)
- [x] [Review][Defer] C1 — twt_app may stamp the live record superseded with ⛔ successor (a "withdraw" in effect) [`0219` grants] — deferred, the 0212 / 0218 shape; only the writer supersedes
- [x] [Review][Defer] C2 — The list's posting district is read per row, in series (≤ 2 × 200) [`claims.fee-bank-date.handlers.ts`] — deferred, capped; a bulk reader when the list grows
- [x] [Review][Defer] C3 — `claim.membership_checked`'s payload does not carry `fee_date_source` / `fee_bank_date_id` (the row does) [`membership-check-persist.ts`] — deferred, DL12 named the audits only; an event-schema field is a contract change with replay cost

**Dispositions (2026-11-27, the fix pass; ledger `2026-11-27h`).** D1 and D2 RESOLVED by [Decision 2026-11-27-512](../../.decision-log.md#decision-2026-11-27-512)
(author-commit, BigDev — (b) on each, the words approved word for word; `82f2ef08`, committed alone). All 33 patch items APPLIED in the
fix commit (each `it` named in its item; the migration `0219` edited in place — unmerged — and the story container recreated from
scratch). Two items were fixed further when their own fix was reviewed (below): D2's reload now uses the SAME test as its line, and the
three-deep cascade leg names a SECOND payment for the check (it passed with the bank-date path broken). The 4 defers stand
(`deferred-work.md`, code review section).

#### Fix-diff review (2026-11-27 — the PATCH diff, before commit)

The fix diff (25 files, untracked included) reviewed by three fresh-context layers in parallel (Blind Hunter on the diff alone; Edge
Case Hunter and Acceptance Auditor with the tree, read-only), plus the real-browser pass. Every DONE / PARTIAL verdict re-checked in code.

- [x] [FixReview][Patch] F1 — The page's lost-write line said "The list has been reloaded" for answers the hook did ⛔ reload on (an
  untyped 4xx — a 429, a 404 with ⛔ bank-date code) — one predicate `isAnsweredFeeBankDateRefusal` (hooks.ts) now decides both, the
  console reloads too (the write may have landed); a leg pins the two both ways [`hooks.ts`, `errors.ts`, `fee-bank-dates.test.tsx`]
- [x] [FixReview][Patch] F2 — The three-deep cascade leg could ⛔ fail: the check named the SAME payment, whose own FK cascades — it now
  names a second payment; mutation-checked live (the FK set to NO ACTION ⇒ the leg red) [`claim-fee-bank-date-policy-regression.spec.ts`]
- [x] [FixReview][Patch] F3 (Blind 1, Edge 1) — A reload while a write was in flight or HELD (a focus refetch while the officer reads the
  step-up code; another actor's commit) could MOVE the row to the other section — a NEW component — unmounting its form: the write's
  answer, the held step-up and the typed fields lost with ⛔ word. The list on screen is now FROZEN while a write is busy, and a form
  whose row moved or left closes once the outcome is shown; legs for both (the freeze leg mutation-checked: red without it)
  [`FeeBankDatesPage.tsx`, `fee-bank-dates.test.tsx`]
- [x] [FixReview][Patch] F4 (Blind 9, Edge 5) — A refusal moved the focus to the outcome line above both sections, away from the form being
  corrected; and in REAL Chrome the focus fell to `<body>` (the locked fieldset disables the focused button — jsdom keeps it; found by
  the browser pass). The line takes the focus only when its form is gone; otherwise the focus returns to the form's submit button, also
  after Cancel on a held step-up (a leg, mutation-checked; the refusal half proved in the browser) [`FeeBankDatesPage.tsx`]
- [x] [FixReview][Patch] F5 (Auditor C4 PARTIAL) — "clear on edit": an edit now clears the prompt (any field) and retires that row's
  outcome line [`FeeBankDatesPage.tsx`, `fee-bank-dates.test.tsx`]
- [x] [FixReview][Patch] F6 (Blind 2) — `usePostMembershipCheck` invalidated a literal key — now `feeBankDatesKey(pariwarId)` [`hooks.ts`]
- [x] [FixReview][Patch] F7 (Blind 3, Auditor) — The nav link's "outside a Pariwar" leg swallowed a timeout — it now asserts the Primary nav
  rendered (and the sibling Pariwar link is absent) [`fee-bank-dates.test.tsx`]
- [x] [FixReview][Patch] F8 (Blind 6, Edge 3) — The sections' de-duplication read the held overflow row too (a claim past the cap that was
  also recorded vanished from both) — the DISPLAYED held rows only [`fee-bank-date-read.ts`]
- [x] [FixReview][Patch] F9 (Edge 6) — The step-up path kept the plaintext note and reference in the mutation's `variables` while held —
  `reset()` on the hold too (the retry closure alone holds the body) [`FeeBankDatesPage.tsx`]
- [x] [FixReview][Patch] F10 (Auditor) — The D1 test's bank date (2026-05-03) was EARLIER than the recorded date while the line says "not
  earlier" — 2026-05-12 [`fee-bank-dates.test.tsx`]
- [x] [FixReview][Defer] Edge 2 — a POST that never answers keeps the page locked (`apiFetch` has ⛔ timeout) until a reload; Edge 3's
  reverse race (a claim in NEITHER section between the two statements — the next reload shows it); Edge 4 — a 429 / a route-level 4xx
  reads as "may not have been recorded" (true-but-loose; `-512` names only a write with ⛔ typed answer); Edge 5 — a server-refused field
  gets ⛔ `aria-invalid`; Blind 10 — the concurrency spec leaves its superuser-seeded members / receipts (a fresh tenant per file) —
  `deferred-work.md`, fix-diff section.
- Dismissed after checking the code: Blind 4 / 8 (the preview names only a record it CONSIDERED — `considerableFeeBankDate`, so "not
  earlier" and the read audit's id are exact); Blind 5 (the panel's Cancel is outside the locked fieldset); Blind 7 (PQ1's payment is
  recorded `new Date()` — the computed outcome is the stored one); Blind 11 / Edge 7 (the container was recreated — the composite-FK
  spec ran there).

#### Fix-diff review, round 2 (2026-11-27 — the committed fix `76afca9d`, BigDev: "run adversarial review on patches applied")

The same three fresh-context layers on the committed fix (the Blind Hunter on the diff alone; the Edge Case Hunter and the Acceptance
Auditor read-only on the tree, the auditor on the records commit `7bbb0e9b` too). Every finding re-checked in code; each fix's leg
mutation-checked (the fix reverted ⇒ the leg red).

- [x] [FixReview2][Patch] G1 (Edge 1 HIGH, Blind 1) — ⚠ PRE-EXISTING (the dev's form), WIDENED by F1's reload: the form read the
  currency tokens from the row at PRESS time. The list refetches on window focus — the officer reading the bank statement in another
  tab is the normal case — so a token followed a record or a check the officer never saw: `stale` became a silent CORRECTION, and a
  lost write's re-send a duplicate record and event. The tokens are now the row AS OPENED, and every answer that reloads the list (a
  reload code, a lost write) closes the form, so a re-open takes the fresh ones [`FeeBankDatesPage.tsx`; two legs]
- [x] [FixReview2][Patch] G2 (Edge 2, Blind 2) — A reload that moved or dropped the open row while the officer typed closed the form with
  ⛔ word (the comment said "the outcome line stays" — there was none) — it now shows DL11's approved `stale` line, *"This claim changed
  since you opened it. It has been reloaded — check again."*, the case it names, focused [`FeeBankDatesPage.tsx`; a leg]
- [x] [FixReview2][Patch] G3 (Edge 3) — While a write was HELD the focus sat on `<body>` (the locked fieldset) — it moves to the step-up
  panel's first control [`FeeBankDatesPage.tsx`; a leg]
- [x] [FixReview2][Patch] G4 (Edge 4, Blind 4) — The freeze began two commits after the press (the busy flag went up by an effect) — the
  form now raises it in the press itself; the cut-list flags are frozen with the rows (Edge 5) [`FeeBankDatesPage.tsx`]
- [x] [FixReview2][Patch] G5 (Blind 6, Auditor) — The refusal-focus leg could ⛔ fail (it pre-focused the button; jsdom keeps the focus on a
  disabled control) — it no longer does; the prompt leg edits ANOTHER field (F5's "any field"); new legs for F6 (a recorded check reloads
  the list), F1's console reload, F9 (⛔ note or reference in the mutation cache while held) [`fee-bank-dates.test.tsx`]
- [x] [FixReview2][Patch] G6 (Blind 9) — The window-filter leg now asserts the denied claim's OWN live check survives and still blocks, so
  "not listed" can come only from the filter [`apps/api/tests/integration/claims/fee-bank-date.spec.ts`]
- [x] [FixReview2][Patch] G7 (Blind 8) — PQ1's comment said "⛔ handed in" while the test hands the computed outcome to the writer —
  reworded [`packages/domain/tests/integration/claim/fee-bank-date-check.spec.ts`]
- [x] [FixReview2][Defer] Edge 6 — a CSRF 403 reads DL11's "no permission" line; the Auditor's Edge 4 note — `-512` D2's line for a 429 or
  an `http.404` WIDENS what `-512` names (a write with ⛔ typed answer) — a scope question for BigDev, ⛔ only a LOW item —
  `deferred-work.md`, fix-diff sections.
- Dismissed after checking the code: Blind 3 (a failed reload KEEPS the list and its line — only a 403 re-gates, by design, 6.19d);
  Blind 5 / Edge 7 (0219 is unmerged; the story container recreated); Blind 7 (the `stale` leg covers close-on-move); Blind 10 / Edge 5's
  first half (`recordedTruncated` can over-report in the two-statement race — the safe direction); Blind 11 (with ⛔ receipt the read audit
  and the preview agree); Blind 12 (deferred, Edge 4). F8's de-duplication and `auditReason`'s `stale` stay without a leg (a race between
  two statements; a stream concurrency error at the API) — stated, ⛔ claimed tested.
- ⚠ **Corrected 2026-11-27 (fix-diff review round 3 — the Acceptance Auditor):** "each fix's leg mutation-checked" (above, Change Log
  1.11 and ledger `2026-11-27i`) OVERSTATED: G4 has ⛔ leg (the freeze's commit timing is not observable in jsdom) and G7 is a comment
  only. The legs of G1, G2, G3, G5 and G6 were mutation-checked; G1's leg's sync point did not wait on a rendered change (round 3 — H3).
- ⚠ **2026-11-27 (round 4) — G1 stands; round 3's H2 is SUPERSEDED:** the tokens remain the row AS OPENED; round 3 made a token change
  under the open form ADOPT the new tokens after a line — round 4's J1 replaces that with CLOSING the form (below). ⚠ The G1 leg's
  "mutation-checked" turned red by timing only (its sync point — the Auditor, round 4).

#### Fix-diff review, round 3 (2026-11-27 — the round-2 fix `abfd2592` only, BigDev: "run round 3")

The same three fresh-context layers on `abfd2592` (4 files) and its records `0342a561`. Nothing HIGH; four MEDIUM, all in one family —
the open form vs a reload that changes its row. Each re-checked in code.

- [x] [FixReview3][Patch] H1 (Blind 2, Edge 1) — A CORRECTABLE refusal (the form stays open — `reference_mismatch`, `in_future`, a 400),
  then a reload that moves or drops the row: the form closed but the OLD line stayed ("check the reference" for a form that is gone) —
  a move or a drop now ALWAYS shows DL11's `stale` line [`FeeBankDatesPage.tsx`; a leg — red with the old guard]
- [x] [FixReview3][Patch] H2 (Edge 2, Blind 4, Edge 4) — A reload that changed the open row's tokens IN PLACE (another officer's record, a
  District Admin's re-check; a re-open before the reload landed) left the form on the opened tokens: the row showed the new record, the
  form ⛔ said so, and every press was refused `stale`. The form now SAYS it (DL11's `stale` line, naming the claim) and then takes the
  new tokens, keeping the typed fields — the next press is on what was shown. ⚠ This SUBSUMES G1's capture: the press always sends the
  tokens on screen and a change is always said; reverting G1 alone is now harmless, reverting H2 turns its leg red [`FeeBankDatesPage.tsx`;
  the G1 leg rewritten]
- [x] [FixReview3][Patch] H3 (Blind 1, Auditor 3, Blind 6) — The G1 leg's sync point (`'Patna'`) was the fixture's default — the refetched
  row now shows a NEW district and the leg waits on it; a leg for a DROPPED row (mutation-checked with a real mutant — the first mutant
  was equivalent); `focusManager` reset in `afterEach` (a failed leg must ⛔ leave it forced); the refusal-focus leg's "weak" comment
  removed (the pre-focus is gone) [`fee-bank-dates.test.tsx`]
- [x] [FixReview3][Patch] H4 (Auditor 1, 4) — records: the round-2 subsection moved BELOW round 1's dismissals (⛔ word changed); the
  "each leg mutation-checked" claim corrected by a dated line (above)
- [x] [FixReview3][Defer] the `stale` line now also answers a reload with ⛔ write (a silent move, a drop, a token change) — a WIDENING of
  DL11 like `-512` D2's (for a DROPPED row, *"It has been reloaded — check again"* points at a row no longer listed) — BigDev's scope
  question; Edge 3 — an open row pushed past the list's cap reads as a change; Edge 5 — `no_fee_receipt` does ⛔ reload (pre-existing) —
  `deferred-work.md`, round-3 section.
- Dismissed after checking the code: Blind 3 (busy cannot stick: the press is a discrete event React renders synchronously, before any
  promise settles, and `onBusyChange(true)` itself forces that render — the Edge Case Hunter traced the same); Blind 5 (`StepUpPanel` has
  ⛔ focus code — G3's leg is red without the effect); Blind 7 (a 429 closing the form — `-512` D2's widening, deferred in round 2); Blind 8
  (⛔ announcement keys on `seq` alone — the notice node is re-keyed and focused).
- ⚠ ⛔ Observed in a browser: H2 (a reload under an open form needs a focus refetch, which the tool cannot produce — a component leg only).
- ⚠ **2026-11-27 (round 4) — H2 SUPERSEDED by J1, and its item OVERSTATED round 2:** "every press was refused `stale`" / the code's
  "refused `stale` for ever" — `stale` is a reload code, so ONE press was refused and the form closed (the cost was the typed fields).
  H2's adoption relied on a line the next keystroke retires; J1 closes the form instead (round 4, below).

#### Fix-diff review, round 4 (2026-11-27 — the round-3 fix `e2eff5b8` only, BigDev: "run round 4")

The same three fresh-context layers on `e2eff5b8` (2 files) and its records `4fea55f5`. ALL THREE found the same defect in round 3's
own design (the Blind Hunter rated it HIGH, the others MEDIUM). Each finding re-checked in code.

- [x] [FixReview4][Patch] J1 (Blind 1, Edge 1, Auditor 1) — Round 3's H2 SAID a token change under the open form and then ADOPTED the new
  tokens — but the line saying it is retired by the officer's next keystroke (`editedFor`): an officer back from the statement tab, typing
  straight on, could clear it unread, and the next press would supersede another officer's record with ⛔ refusal — G1's harm back. A
  token change now CLOSES the form with DL11's `stale` line (focused — the form is gone), as a move or a drop does; ⛔ token is ever adopted
  client-side; a press racing the close still carries the tokens AS OPENED, so the server answers `stale` (DL5 (e) — the Auditor: ⛔ DL
  requires the refusal, but the server's token check is the property kept). [`FeeBankDatesPage.tsx`; the leg rewritten — red with the form
  left open]
- [x] [FixReview4][Patch] J2 (Edge 2) — `busy` could in principle read false between the step-up panel clearing its hold and the retry's
  `isPending` reaching React (TanStack's notify scheduler), ending the freeze mid-retry. A `sending` flag set by the press and cleared by
  the write's callbacks closes it. ⚠ The new retry-in-flight leg passes WITHOUT J2 — in jsdom the window did not occur (`isPending` was
  already visible); J2 is kept as a guard that does not rest on TanStack's timing, ⛔ claimed tested [`FeeBankDatesPage.tsx`; a leg]
- [x] [FixReview4][Patch] J3 (Auditor 2–4) — records: H2's overstatement and supersession, and a forward pointer from round 2's G1, each
  a dated line (above); ⛔ earlier text edited
- [x] [FixReview4][Defer] Edge 3 / Auditor 5 — a reload that lands after a CORRECTABLE refusal replaces its line ("check the reference")
  with `stale` and closes the form: the officer loses the reason (the next press would say it again) — `deferred-work.md`, round-4 section.
- Dismissed after checking the code: Blind 2 (a lost write closes the form in the outcome's own batch, before the list unfreezes — ⛔
  re-send from that form); Blind 3 (a success closes the form in its own batch; the reload lands later, `openFor` already null — the Edge
  Case Hunter traced the same); Blind 6 (`beforeEach` resets `getFeeBankDates`); Edge 4 (⛔ path puts a null and a new notice in one batch);
  Edge 5 (a re-open before the officer's own success reload lands: the `stale` line names their own record — intended, and the form closes).

#### Code review, second pass (2026-11-27 — the WHOLE branch diff vs `main` `6536b8bb`, tip `2f496e3d`; BigDev: "6.39a on worktree", "all chunk in parallel")

`bmad-code-review` on the branch's full diff (75 code and test files, +6,420 / −71; the records files left out of the hunters' diff), chunked three
ways — (1) domain / DB (`packages/domain`, `packages/events`), (2) API / contracts / jobs / fence script, (3) admin UI — and each chunk read by
Blind Hunter (diff alone), Edge Case Hunter and Acceptance Auditor (tree, read-only, the load-bearing-invariant lens): nine layers in parallel,
none failed, none empty. The worktree was checked clean on branch `story/6-39a-…` after the last layer returned. About 90 raw findings → about
70 distinct after merging duplicates → **1 decision-needed (resolved the same day — option 3 — and turned into patch K1-P), 13 patch, 16 defer (9 already recorded in earlier rounds — cited, not re-listed in
`deferred-work.md`; 7 new), 39 dismissed.** Nothing HIGH survived checking: the one HIGH candidate (a claim stranded after the final vote)
cannot occur — see Dismissed 1. Every approved staff string the Auditors compared (DL11 / `-512`) matched verbatim. Each finding below was
re-checked in the code unless it says "as reported". Earlier rounds' items (C / F / G / H / J) were NOT given to the Blind Hunters or the Edge
Case Hunters, which reviewed fresh; the Auditors read this story — which holds those items — and were told to report anything they found
independently, citing the record. The dedupe against the earlier rounds was done here.

- [x] [Review][Decision] K1 — The console can show a District Admin two dates that contradict each other when the bank's date wins (Auditor c3 #5 — read from the code, not run in a browser). `MembershipCheckControl.tsx` prints *"Joining fee paid on {fee_paid_on}"* — DL6 keeps that as the RECORDED date — and, under the date of death, the outcome line from `preview.fee_outcome`, which is computed from the date USED. When the recorded date is after the death and the bank's date is before it, the screen reads a late "paid on" date beside *"paid before the death"*; only the third line (the bank line, DL11's) explains it. No decision names this case — DL6, `-510` DL11 and `-512` give no label change — so it is a gap in the spec, not a deviation from it. **§0 gate (applied, citations stripped):** "a staff screen shows two dates that seem to disagree" — nothing about what the Trust discloses about a person or owes anyone: BigDev's call (staff words), not the Panel's. **Options:** (1) leave it — the bank line explains; cost: the first two lines disagree, and an officer who stops reading there may distrust a correct outcome and ask again. (2) show the date USED in the "paid on" line when it is the bank's, and move the recorded date into the bank line — cost: it amends DL6 (*"`fee_paid_on` stays the recorded date"*), needs a decision entry, new words and the preview wire's meaning changes. (3) keep both dates and add a short clause to the outcome line when `fee_date_source` is `bank` — smallest change, keeps DL6; cost: new words (BigDev's), one more line to pin in the console's maps and tests. (4) defer with a reason. **Our reading: (3)** — because it removes the contradiction without touching DL6 or the wire.
  **RESOLVED 2026-11-27 (BigDev, at the review's decision prompt: "3"):** option 3 — keep both dates, add a short clause to the outcome line when `fee_date_source` is `bank`. DL6 stands (`fee_paid_on` stays the recorded date). It becomes the patch K1-P below; the words are not yet given.
- [ ] [Review][Patch] K1-P — (from K1, option 3) When the console's `fee_date_source` is `bank`, the outcome line says the outcome is by the bank's date, so the recorded "paid on" date above it no longer reads as a contradiction. ⚠ **BLOCKED on BigDev's words** — staff copy is approved word for word (`-510` DL11, `-512`); the reviewer does not write it. Order when unblocked: (1) BigDev gives the clause (and says whether it replaces or follows the outcome sentence); (2) a decision entry approving it, committed FIRST and alone, amending `-510` DL11's approved list as `-512` did for its two lines — the next free id, read live on every ref and worktree; (3) then the string in `MembershipCheckControl.tsx` / `apps/admin/src/modules/claim-verification/i18n-en.ts` (one string for the bank source; the existing outcome strings are untouched), pinned as a literal in the admin test like the other approved lines, with a leg that the clause is absent when the source is `recorded`. No change to the preview wire. (MEDIUM; Auditor c3 #5) [`apps/admin/src/modules/claim-verification/MembershipCheckControl.tsx:176-181`]
- [x] [Review][Patch] K2 — The "no row written" legs of the check writer's refusals cannot fail: each asserts `checkRows === before` AFTER `ROLLBACK TO SAVEPOINT`, which erases any row the writer inserted before throwing (s1 `bank_date_changed`, s2 `null` token, s3 `same_person`; the `ist` / `bj` / `pq1` savepoints at lines 244 / 258 / 281 roll back too — I did not read what they assert, read them when fixing). The known trap (memory: assertion after a savepoint rollback is vacuous). Count BEFORE the rollback (the refusal is a JS throw, so the transaction is not aborted) and keep the accepted check's `+1` as the control. (MEDIUM; Blind c1 #7) [`packages/domain/tests/integration/claim/fee-bank-date-check.spec.ts:172-207`]
- [x] [Review][Patch] K3 — The console's NON-NULL `expected_fee_bank_date_id` is pinned by no admin test: both assertions on the POST body send `null` and the preview fixture's `fee_bank_date` is `null`, so a mutant that always sends `null` stays green — against a claim with a live bank record every re-check would then be refused `bank_date_changed` and the District Admin could never clear `bank_date_recorded`. The new fingerprint term `fee_bank_date.record_id` is untested too. Add a leg with a non-null `fee_bank_date` through the route's submit, and one for the fingerprint reset. (MEDIUM; Auditor c3 #1) [`apps/admin/tests/membership-check.test.tsx:643,673`; `apps/admin/src/routes/VerifierConsoleRoute.tsx:503`; `MembershipCheckControl.tsx` fingerprint]
- [x] [Review][Patch] K4 — A refusal that keeps its form open is shown above BOTH sections and never scrolled into view (round 1's F4 returns the focus to the submit button, not to the line): on a long list an officer who presses submit on row 15 and is refused `reference_mismatch` sees nothing near the form. Render the line inside the open row, or `scrollIntoView({ block: 'nearest' })` when `kind === 'refused'` and the form stays open. No new words. (MEDIUM; Blind c3 #1, Edge c3 #3) [`FeeBankDatesPage.tsx` notice render and focus effect]
- [x] [Review][Patch] K5 — Focus and names on the finance page: opening a row unmounts the focused button and mounts the form with no focus moved to its first field; "Close" drops the focus to `<body>`; every row's open / submit / close button has the same accessible name (a screen-reader user hears N identical controls); `aria-invalid` / `aria-describedby` sit on the reasons `<fieldset>` (implicit role `group`, where `aria-invalid` is not supported); and nothing marks the form busy while the write is in flight. Move focus to the first field on open and back to the row's opener on close; tie each button to its row line (`aria-describedby`); put the invalid state on the radios or give the group `role="radiogroup"`; `aria-busy` on the fieldset while sending. No new words (the visible in-flight line needs BigDev's — K26). (MEDIUM; Blind c3 #2, Edge c3 #1, Auditor c3 #6) [`FeeBankDatesPage.tsx` `Row` / `RowForm`, :225, :255-320]
- [x] [Review][Patch] K6 — A note made only of invisible characters (U+200B, U+200D, U+2060, U+3164, U+2800) passes `z.string().trim().min(1)` — `String.prototype.trim` does not strip them — so the REQUIRED reason can be empty-looking, in the Tier-1 note and the audit trail. Refuse a note with no visible character in the contract, in the writer's shape step (`invalid_reason`) and in the admin form's own check, in lockstep, with a leg at each. (LOW; Edge c2 #1) [`packages/contracts/src/claims/fee-bank-date.ts:89`; `packages/domain/src/claim/fee-bank-date-persist.ts` step (0); `FeeBankDatesPage.tsx:60`]
- [x] [Review][Patch] K7 — The writer's own shape refusals have no test at any level: `invalid_reason` for an unknown reason, an unreal calendar date and an empty envelope, and the writer's `not_found` (grep of `apps/api/tests` and `packages/domain/tests` for `invalid_reason`: zero files). The contract refuses first, so these are the defence — and an untested defence is the kind of branch round 1's C2 added legs for. (LOW; Auditor c1 #3, Blind c1 #14) [`packages/domain/src/claim/fee-bank-date-persist.ts` step (0)]
- [x] [Review][Patch] K8 — The one-live `23505 → stale` mapping compares against `CLAIM_FEE_BANK_DATE_ONE_LIVE_INDEX`, a hand-typed constant no test pins to the migration's index name (the only other copy is a literal in the policy-regression spec), and its comment says "proved by its predicate only" where 6.39 exports and tests `isOneLiveCheckViolation`. A typo would turn a typed `stale` into a 500. Export the predicate and pin the constant to the schema's index name. (LOW; Auditor c1 #1) [`fee-bank-date-persist.ts:52,242`; `claim-fee-bank-date-policy-regression.spec.ts:254`]
- [x] [Review][Patch] K9 — Family 3 geo asymmetry: the record route is gated at the DISTRICT dimension through a server-derived district, but every finance officer in the specs is granted at `pariwar` scope — no leg shows a finance officer granted for district A refused on a claim in district B, nor what a `null` district (unknown claim) answers. Add the negative leg with its positive control. (LOW–MEDIUM; Blind c2 #1 — verified: no district-scope grant in `fee-bank-date.spec.ts` or `_fee-bank-date-world.ts`) [`apps/api/tests/integration/claims/fee-bank-date.spec.ts`]
- [x] [Review][Patch] K10 — The `claim_fee_bank_dates` UPDATE policy's tenant leg is never tested negatively: every UPDATE leg runs in the owning Pariwar's scope (the scrub, the column grants, the RTBF spec); nothing shows another Pariwar's session UPDATE matches 0 rows. Family 5 asks for positive / negative / fail-closed / FORCE; 0212's spec has the same gap, which is a precedent, not a reason. (LOW; Auditor c1 #2) [`packages/domain/tests/integration/rls/claim-fee-bank-date-policy-regression.spec.ts`]
- [x] [Review][Patch] K11 — Records: (a) Dev Notes **TR8** ("record the no-posting behaviour — it matches 6.39's") was not carried out — nothing in the Completion Notes, roster Row 58 or `deferred-work.md` says that a null posting district fails closed for everyone, super admin included, or that `fee_bank_date.not_found` is unreachable over HTTP (the resolver stashes `null` and the permission hook answers 403 first); (b) the File List omits `apps/jobs/tests/claim-suspicion-notice-no-decision.test.ts` and `apps/jobs/tests/claim-suspicion-staff-email-no-decision.test.ts` (both in the diff; round 1's C1 names the change, the list was never updated — count of either name in this file: 0). Dated lines, no rewriting. (LOW; Auditor c2 L2, L3) [story Completion Notes, File List]
- [x] [Review][Patch] K12 — The statement-reference regex is re-typed in the new contract with no pin to the receipt contract's: if the receipt contract is ever widened, the bank-date POST would 400 a legitimate stored reference before the writer can compare it. Import the one regex, or pin the two by a test. (LOW; Auditor c2 L4, Blind c2) [`packages/contracts/src/claims/fee-bank-date.ts:65` vs `packages/contracts/src/payments/vyawastha-shulk.ts:60`]
- [x] [Review][Patch] K13 — The finance page's state survives a Pariwar change: the view is not keyed by `pariwarId` (`FeeBankDatesRoute.tsx` reads the param and passes it down), so `openFor`, `notice` and a `frozen` snapshot outlive it and the new Pariwar's page can show a `stale` line naming a blank "reference ending". Reached by history navigation between two Pariwars' pages if the router keeps the component across a param change (its default as I understand it — confirm with `remountDeps` when fixing). `key={pariwarId}` on the view. (LOW; Blind c3) [`apps/admin/src/routes/FeeBankDatesRoute.tsx:17-36`]
- [x] [Review][Patch] K14 — Admin legs that cannot fail or prove less than they say: (a) "no date of death on the page" asserts the text lacks `DEATH`, but the list fixture's type cannot carry one and the contract is `.strict()` — it cannot fail; (b) the leg titled "`bank_date_changed` … refetches the preview and the packet" asserts only `MEMBERSHIP_CHECK_STALE_CODES.has(...)` (`:815`) — (a) and (b) are the Auditor's, read in the tests; as reported by the Blind Hunter from the diff, to confirm while fixing: (c) several negative checks wait `setTimeout(r, 20)` and can pass before the refetch renders; (d) the "mutation cache holds no note" leg has no positive control; (e) the nav test asserts an `href` taken from a mocked `Link`, so it cannot catch a mismatch with `router.tsx`. (LOW; Auditor c3 #7, Blind c3) [`apps/admin/tests/fee-bank-dates.test.tsx:207-208,815`]
- [x] [Review][Defer] K15 — ALREADY RECORDED (round 1's C1 defer): the cached `pariwar_id` / `deceased_member_id` / `fee_receipt_id` are not tied to the claim at the DB. Sharpened by this pass (Blind c1 #6, Edge c1 #2, Auditor c1 #5): the one-live partial unique index is on `claim_case_id` alone, so a row stamped with ANOTHER tenant's claim id (the INSERT policy checks `pariwar_id` only; RI checks bypass RLS) would hold that claim's slot and make the owning tenant's writer answer `stale` for ever; and the erasure scrub keys on the cached `deceased_member_id`. Unreachable today — the writer takes every value from the locked claim in scope — so it stays deferred; the trigger already named (a second writer, or a composite-FK pass) stands.
- [x] [Review][Defer] K16 — ALREADY RECORDED (round 1's C1 defer): `twt_app` may stamp the live record superseded with no successor — a withdraw in effect (Blind c1 #8, Auditor c1 #6, Edge). Fail-closed: the gate answers `bank_date_recorded` and a new record recovers it.
- [x] [Review][Defer] K17 — ALREADY RECORDED (round 1's C3 defer): `claim.membership_checked` carries neither `fee_date_source` nor `fee_bank_date_id` (Auditor c1 #4, c2 L7).
- [x] [Review][Defer] K18 — ALREADY RECORDED (round 1's C2 defer): the list reads each row's posting district in series, up to 2 × 200 (Blind c2, Auditor c2 L7).
- [x] [Review][Defer] K19 — ALREADY RECORDED (fix-diff review's defers): the list's two sections are two statements, so a claim moving between them is in neither until the next reload (Edge c1 #1; its "spurious `recordedTruncated`" half was dismissed in round 2 as the safe direction).
- [x] [Review][Defer] K20 — ALREADY RECORDED (fix-diff review's defers): a POST that never answers keeps the page locked — `apiFetch` has no timeout (Edge c3 #2, Blind c3).
- [x] [Review][Defer] K21 — ALREADY RECORDED (round 2 / round 3 defers and the dev section's open item): `-512` D2's lost-write line and DL11's `stale` line are shown for answers the decisions do not name (a 429, an untyped 4xx, a silent move or drop), the outcome line's *"reference ending {last4} — "* prefix is composition that BigDev has not approved word for word, and the page's own labels are unapproved (Auditor c3 #2, #3; Blind c3). All three are owned by BigDev ("BigDev reads them — before go-live"); this pass changes nothing about them. The Auditor rated the prefix MEDIUM; it is still the open item it was.
- [x] [Review][Defer] K22 — ALREADY RECORDED (dev section): the writer's parameter-free DB error has no live leg that reaches it, so the 500 path's log-leak control rests on the writer's `.catch` and the fence's "exactly twice" pin (Auditor c2 L5).
- [x] [Review][Defer] K23 — ALREADY RECORDED (an older section of `deferred-work.md`, "Append-only triggers use `pg_trigger_depth() > 1` as a stand-in for 'this is an FK cascade'"): the new guards copy that shape — any DELETE issued from inside any trigger passes (Blind c1 #9). Same migrations as 0160 / 0197 / 0212 / 0213 / 0218; a hardening pass over the guards, not this story.
- [x] [Review][Defer] K24 — NEW: a live record that names a payment other than the member's current joining payment leaves the claim on `bank_date_recorded` that no District Admin re-check can clear (the check stores `fee_bank_date_id = null`, the gate compares the live record's id); only a new finance-officer record does, and the District Admin's line says "check again" with nothing pointing at the finance officer. The behaviour is pinned as fail-closed by a test (Blind c2 #6, Blind c1 #12). Reachable only once a joining payment can change — the corrected-UTR item ("Not addressed by 6.39a"). **Trigger:** the corrected-UTR build, or an officer report of a claim that will not clear.
- [x] [Review][Defer] K25 — NEW: the writer's error vocabulary has drifted: `no_fee_receipt` is reused for "the member's row cannot be read" (its approved line is about the joining fee), and `invalid_reason` covers both an unreal date and a blank note (Auditor c1 #3, Blind c1 #17). A new refusal reason is a contracts + domain + admin-copy lockstep. **Trigger:** row `3-17` (it changes `fee_receipt_id`) or the next refusal reason.
- [x] [Review][Defer] K26 — NEW: admin residuals that need BigDev's words or a UX call: no visible in-flight line while the POST is pending (only the fieldset disables; `aria-busy` is K5); the typed reference and note are discarded without a word when the officer opens another row or presses Close; a correction row (it already has a live record) has the same *"Record the bank date"* opener and nothing says that submitting supersedes the record (Blind c3). **Trigger:** BigDev reads the page's labels (the open unapproved-labels item), or an officer report.
- [x] [Review][Defer] K27 — NEW: accessibility details with no AC: the outcome notice is both `role="status"` / `"alert"` and programmatically focused (it may be read twice); the empty-list line's `role="status"` is rendered at mount and likely never announced; the held `<section>`'s `aria-labelledby` points at an `<h1>` defined in another component; there is no `<form>`, so Enter in the reference field does nothing (Blind c3). **Trigger:** the accessibility pass of the staff screens already named in the fix-diff section.
- [x] [Review][Defer] K28 — NEW: API / domain test gaps below the ACs: the captured-log controls cover the 409 `reference_mismatch` and 400 paths but not the 201 success path, and the positive control proves only that the request URL is logged (Blind c2, Auditor c2 L5); the audit-emit-failure path is untested; `window_closed` is covered for a denied claim only (the `state_trustee_approved` leg is at the domain — Dismissed 28); the plaintext check `not.toContain` would pass for a base64 of the plaintext; the translator spec's header says more than its legs prove and carries about 100 lines of harness copied from another spec (Blind c2); the concurrency spec leaves its superuser-seeded members and receipts (already recorded). **Trigger:** a shared-DB cleanup pass, or any change to the log path.
- [x] [Review][Defer] K29 — NEW (as reported by the Blind Hunter, not traced by me): the record handler encrypts the note (a KMS round trip) before the writer's own scope transaction, while the request's outer scope transaction is still held — two connections per POST across an external call (`claims.fee-bank-date.handlers.ts`, `outer` / `openScopeTx`). **Trigger:** API pool saturation, or KMS latency in the alarms.
- [x] [Review][Defer] K30 — NEW: `fill()` is now copied into a second consumer (`FeeBankDatesPage.tsx`, `MembershipCheckControl.tsx`; `fmt()` was already duplicated). The second consumer exists, so extraction is allowed by the no-premature-package rule — not required. **Trigger:** the next change to either file.
- Dismissed after checking the code (39; the layers' number in brackets):
  1. A claim stranded on `bank_date_recorded` after the final vote (Blind c1 #1 — HIGH if the vote did not take the claim lock). It does: the gate's own doc block says it MUST run after the claim-row lock, and the bank-date writer takes the same `FOR UPDATE` first, with the window closing at `state_trustee_approved`; no record can commit between the vote's gate read and its commit.
  2. Serialization with approvals "claimed but not tested" (Blind c1 #3) — the same lock; the concurrency spec proves it for bank-vs-bank and bank-vs-check, and an approval takes that lock by construction.
  3. The check writer stores the handler's `feeOutcome` and re-derives only the source (Blind c1 #2) — 6.39's shape; what makes the handler's outcome current is the bank-record id the writer re-asserts under the lock.
  4. The finance officer can infer one bit about the date of death from which section a claim is in, and the header's N2 wording reads stronger than that (Blind c1 #4, Blind c2 #5, Auditor c1 #7, Blind c3). N2 promises the date of death is not SHOWN; DL10 designs the two sections, BigDev answered "every DL as proposed" at Task 0.2, and each probe needs a District Admin's re-check and a fresh step-up. Stripped of citations it is "the finance officer can tell whether the bank date helped the family" — the purpose of the list, not a disclosure a trustee would balk at. Noted for BigDev; no change.
  5. "With a reason" not enforced at the domain or the DB; `btrim` vs `trim` (Blind c1 #5) — the DB sees ciphertext; the TS writer refuses `"\t"` first. The invisible-character gap is K6.
  6. The note stays rewritable by `twt_app` (Blind c1 #8, first half) — the erasure scrub must UPDATE it; deliberate. The second half is K16.
  7. Cascade FKs delete the governance record with the payment (Blind c1 #10) — by design; the three-deep cascade leg exists.
  8. `readJoiningFeeReceipt` now returns `utr` to every caller (Blind c1 #11) — three internal callers (the two writers and the preview handler), and the wire is a strict, field-picked contract.
  9. Unlimited re-recording can stall a claim (Blind c1 #13) — DL5 (b), by design.
  10. `isSameActorId` imported from another module; an omitted `computedAgainstFeeBankDateId` throws a TypeError (Blind c1 #18) — typed callers only.
  11. No DB bound on `infinity` dates (Blind c1 #19) — the writer's TS bounds refuse them first.
  12. Redundant indexes (Blind c1 #20) — the composite FK needs the `UNIQUE (record_id, claim_case_id)`.
  13. `reason_code` in the event (Blind c1 #21) — an internal annotation; the reasons are the finance officer's own.
  14. The journal `when` is ahead of the wall clock (Blind c1 #16) — 0219 is exactly 60 s after 0218, which is 60 s after 0217; the series was already ahead before this story, and the Auditor found it above every sibling's.
  15. The N7 test's "hand-typed" keys and the fence's brittle count (Blind c1 #15) — the four deciding keys are typed, the roles are computed from the bundles, and the test carries its own vacuity control; the fence's count is amended per story by design.
  16. The "⛔" glyph reads as the opposite of its meaning (Blind c1 #23, Blind c2, Blind c3 #12) — it is the project's "not" throughout; the three `i18n-en.ts` lines "⛔ compile-enforced (a `Record<string,string>`)" say NOT compile-enforced, which is correct.
  17. The district gate resting on 6.18's resolver; list and record gated at different dimensions (Blind c2 #1b, #2) — TR8's documented shape (a pariwar grant satisfies a district gate); the missing negative leg is K9.
  18. The reference as a guessing oracle (Blind c2 #3) — the full reference is printed on the Trust's own statement the officer holds, the space is about 10^8 with four digits known, and the step-up gates the write; no per-route rate limit is configured on these routes (grep), so the app's defaults apply.
  19. Failed 400 / 401 / 403 attempts unaudited; the success audit best-effort (Blind c2 #4) — DL12's scope and 6.39's convention; the event is the durable record.
  20. Input refusals share 409 with concurrency conflicts (Blind c2 #8) — the page keys on the code, not the status.
  21. No idempotency key on the POST (Blind c2 #9) — a replay carries stale tokens and gets a typed `stale` by design (family 2, covered).
  22. The note is write-only; its ciphertext binds the Pariwar and field class, not the record (Blind c2 #10) — no decrypt path by design (N6).
  23. The new required `expected_fee_bank_date_id` on the strict request, and the `bank_date_recorded` line on routes where the actor cannot re-check (Blind c2 #12) — DL6 / AC5's kind (i); the same shape as `stale`'s line.
  24. UUID case handling (Blind c2 #13) — branded ids are lower-case (`uuidBrand`); the "inconsistent case" finding is false.
  25. No read audit on the list (Blind c2 #16) — DL12 names the audits; the list shows no Tier-1.
  26. Dead or sloppy paths — `translate(undefined)`, `closeScopeTx` masking an error, the growing `COVERAGE_FLOOR` comment (Blind c2 #19) — unreachable by construction or the sibling handler's shape.
  27. The non-human / system-actor runtime leg for the POST (Auditor c2 L1) — covered by construction: the route is enrolled in the human-actor gate (`COVERAGE_SET`, floor 21), the same as 6.39's.
  28. AC3's `state_trustee_approved` ⇒ `window_closed` leg is at the domain, not the API (Auditor c2 L6) — a placement deviation; the behaviour is proved at the writer.
  29. The write's answer is lost if the form unmounts mid-write — a 403 on a focus refetch tears the list down, or the officer navigates away (Blind c3 #4) — only a 403 re-gates, by design (round 2, Blind 3); a page that has gone has no line to show.
  30. The hook's and the message's conditions are "two hand-kept lists" (Blind c3 #6) — the admin test loops over `FEE_BANK_DATE_REFUSAL_REASONS`, so a new contract reason without a line fails it.
  31. The console fingerprint's new `record_id` term resets the District Admin's judgment on a background refetch (Blind c3 #7) — that is N4's "stale means re-check": a judgment computed against a superseded record would be refused `bank_date_changed` anyway. (Its missing test is K3.)
  32. A stale list after a success, with the row still enabled (Blind c3 #9) — dismissed in round 4 (Edge 5): a re-open before the officer's own reload lands gets `stale`, names their own record, and closes the form.
  33. A slow 403 through the default retry backoff (Blind c3 #14) — the app's `QueryClient` sets `retry: false` for queries and mutations.
  34. The outcome sentence is built by `t.row.split(' · ').pop()`; two rows with the same last four (Blind c3 #16) — a copy change trips the copy pin; the notice is focused and the row has moved.
  35. The approved 401 line is never shown on the page (Blind c3 #17, Auditor c3 #4) — round 1's C4 chose to go to sign-in, as the list's own 401 does.
  36. Cache invalidation incomplete across surfaces (Blind c3 #18) — the app's defaults are `refetchOnMount: 'always'`, `staleTime: 0`, `gcTime: 0`.
  37. The nav link is shown to every staff member of a Pariwar (Blind c3 #21) — a documented, sibling-matching choice; the server's 403 is the boundary.
  38. `isSameStatementReference` / `reference_mismatch` untested (Blind c1 #14, first half) — a domain test and an API spec name them (grep); I did not re-read them for the case / whitespace / empty legs.
  39. The fee-date-source tuple exists three times (Blind c2 #14, second half) — held together by the lockstep test.
- Left out of these counts, by instruction: checklist families 9 and 13 (a ungated nav link's missing re-examination trigger; web analogues of 13(a), 13(b)) — the Auditor reported them as not-a-finding and as not applicable.

**Checklist families (the Auditors' verdicts, read against what I checked):** 1 covered by test and construction; 2 covered by test (three true two-connection races, `pg_blocking_pids`) — the 23505 mapping is K8; 3 covered by test for cross-Pariwar and role denial, REAL GAP K9 (geo), the non-human leg covered by construction; 4 covered (event complete; the sibling event's gap is K17); 5 covered strongly, gaps K10 / K15 / K16; 6 covered by construction; 7 covered; 8 covered (audit after commit, best-effort, per DL12); 9 no undocumented bypass; 10 REAL GAPS K2, K3, K14 (tests that cannot fail), honest otherwise; 11 covered — the policy sentence and `-511` agree with the code (K1 is a display gap beside it, not a predicate change); 12 covered; 13 the web analogue — REAL GAP K5, otherwise covered.

**Dispositions of the second pass (2026-11-27, the fix pass; BigDev: "1" — apply every patch).** K2–K14 APPLIED, K1's decision RESOLVED as K1-P, which is
**OPEN — blocked on BigDev's words and a decision entry** (above). Nothing is committed. Each leg below was mutation-checked (the fix or the
guarded code reverted or broken ⇒ the leg red; every mutant restored byte for byte). What the fix pass found beyond the review's own text, stated:
- **K2** — the three `bank_date_changed` / `same_person` legs now assert INSIDE the savepoint, before the rollback, through one helper, with the
  accepted check's `+1` as the control (mutant: the writer supersedes the live check, then throws ⇒ two legs red). ⚠ K2's text above listed the `ist` /
  `bj` / `pq1` savepoints as "the same shape": they are NOT — they keep the transaction usable and assert nothing about absence; nothing changed there.
- **K3** — two legs: the route sends the preview's bank-date record (mutant: always `null` ⇒ red) and the fingerprint's record term resets the
  judgement while a fresh preview object for the SAME record does not (mutant: the term dropped ⇒ red).
- **K4 / K5** — the refusal line sits under its open form (mutant: always above ⇒ red); the focus goes to the first field on open and back to the
  row's opener on close — and a Close retires the form's refusal line, which would otherwise have taken the focus; each button is described by its row's
  line and the form is a group labelled by it; the reasons group is a `radiogroup`; `aria-busy` while sending (each mutant red). No new words.
- **K6 — corrected:** the finding named three places; the WRITER cannot apply the rule — it receives the note already encrypted (its own comment
  says so) — so it is applied at the contract (`hasVisibleNoteCharacter`, one exported rule) and the admin form's prompt, with contract, form and
  HTTP (400) legs; the writer is unchanged. ⚠ The first draft of the test claimed `.trim().min(1)` let EVERY invisible character through — it does not
  let a byte-order mark through (ECMAScript whitespace); the leg now states which survive `trim`.
- **K7 / K8** — the writer's four shape refusals and its `not_found` have a leg, with a control (the same call, valid, is accepted); the one-live
  predicate is exported and the index-name constant is pinned to the Drizzle table and the migration (mutant: a typo in the constant ⇒ red).
- **K9** — a district-scoped finance officer of ANOTHER district is refused (and the list refuses any district grant); the claim's own district
  records (the control); an unknown claim answers like an unauthorized role (403, same code). Mutants: no permission hook ⇒ red; the record gate at
  the Pariwar dimension ⇒ the own-district control red.
- **K10 — corrected:** the first version (a `WHERE record_id = …` UPDATE under another Pariwar) stayed GREEN with the UPDATE policy widened to
  `USING (true)` — the SELECT policy hides the row from a statement with a column in its `WHERE` on its own. It now also runs a statement with NO
  `WHERE` and reads the row back as the owner (mutant: `ALTER POLICY … USING (true)` inside the rolled-back test transaction ⇒ red).
- **K11** — TR8 recorded (Completion Notes, a dated bullet); the File List names the two jobs tests and this pass's new file.
- **K12** — ONE constant (`VYAWASTHA_SHULK_UTR_RE`) used by both contracts; a leg that the two accept and refuse the same references (mutant: a
  diverging copy ⇒ red).
- **K13 — found NOT reachable today:** the route's loading branch already unmounts the list on a Pariwar change (a new query key has no data). The
  `key={pariwarId}` is a STRUCTURAL guard; its leg is red with a `keepPreviousData` hook and no key, green with the key (both run).
- **K14** — (a) the "no date of death on the page" leg smuggles a date, an outcome and a name into the row the page receives (mutant: the row dumped
  into the markup ⇒ red); (b) the `bank_date_changed` leg drives the hook and asserts what it invalidates, with `same_person` as the control;
  (c) the two fixed 20 ms waits are gone — the leg waits for the fresh list in the cache, then flushes React, and the retry-in-flight leg now shows
  the held-back list rendering once the freeze lifts (mutant: the freeze disabled ⇒ both legs red); (d) the mutation-cache probe has its positive
  control (in flight the cache DOES hold the note); (e) the nav `href` is pinned to the path `router.tsx` registers. (c)–(e) were "as reported" in K14's
  text and are now verified.
- **Verified after the fixes:** `tsc --noEmit` clean in contracts, domain, api and admin; eslint clean on every changed file; domain `tests/claim` +
  `tests/rbac` 1,238 passed; contracts 1,853; admin 2,547; domain live (`tests/integration/claim` and the two RLS specs) 1,458 and API live (the bank-date
  and membership-check specs) 72 — both on the story's own container `twt-6-39a-pg`, not the native :5432; the microcopy gate and the human-actor gate
  pass. ⚠ NOT run: `ci:local` (the whole 41-job mirror), and the three-layer review of THIS fix diff the project asks for before a commit (a separate run).

#### Fix-diff review of the second pass (2026-11-27 — the UNCOMMITTED fix for K2–K14 on top of `2f496e3d`; BigDev: "2" — re-run code review)

The same three layers on the fix diff alone (1,033 lines, 12 files: 11 modified plus the new `fee-bank-date-one-live-violation.test.ts`, code and tests only — the
records files were not in the hunters' diff): the Blind Hunter on the diff alone, the Edge Case Hunter and the Acceptance Auditor read-only on the post-fix tree. The
tree was fingerprinted before the layers launched and is byte-identical after (`git diff HEAD` plus the new file's hash). About 31 raw findings → about 19 distinct →
**0 decision-needed, 10 patch, 1 defer, 8 dismissed.** Nothing HIGH. The one regression the fix pass introduced is L1 (an `aria-busy` placed on the group that also
holds the step-up panel). Each finding below was re-checked in the code unless it says "as reported".

- [x] [Review][Patch] L1 — `aria-busy` is on the form's outer `role="group"` and `busy` is `sending || record.isPending || pending !== null`, so it stays `true` for the WHOLE step-up hold and the shared `StepUpPanel` (its code and send-failure lines are `role="alert"` and mount in answer to the 403) sits inside a busy subtree: assistive technology may withhold those announcements. K5 asked for `aria-busy` on the FIELDSET while sending; the fix put it on the group and for the held state too (my own K5 disposition said "while sending" and understated it). Put it on the `<fieldset>` and only while `sending || record.isPending`; the test asserts the held panel is NOT inside a busy element. (MEDIUM; Auditor 1, Edge 2, Blind) [`apps/admin/src/modules/fee-bank-dates/FeeBankDatesPage.tsx:110,222-230`]
- [x] [Review][Patch] L2 — Opening row B while row A's form is open, when B is EARLIER in the document than A, leaves the focus on A's "open" button: passive effects run in sibling order, so B's new form focuses its first field and THEN A's `Row` effect (`wasOpen && !open`) focuses A's opener — and B's form opens silently. (When B is later, the order is right, which is why the single-row K5 leg passed.) Reachable: the openers are enabled whenever nothing is busy. Return the focus only when it was LOST (`document.activeElement` is `<body>` / `null` — the unmounted control had it), which also leaves the outcome-line handoff untouched; legs for opening an upper row from a lower one and the reverse. (MEDIUM; Edge 1, Auditor 2) [`FeeBankDatesPage.tsx:329-334`]
- [x] [Review][Patch] L3 — The K13 leg passes with or without `key={pariwarId}`: the loading branch unmounts the list on a Pariwar change, so a clean list follows either way. Make it SENSITIVE to the key: seed the query cache for the other Pariwar before the re-render, so its list is available with no loading phase (what a `keepPreviousData` would give) — then without the key the open form and typed fields survive, with it they do not. (The earlier mutation check used a hook mutant outside the committed test; this puts it in the leg.) (LOW–MEDIUM; Blind 1, Edge 4, Auditor 3) [`apps/admin/tests/fee-bank-dates.test.tsx` K13 leg]
- [x] [Review][Patch] L4 — `hasVisibleNoteCharacter` is still a hand-picked list: whitespace, `\p{Cc}`, `\p{Cf}` and five fillers. Default-ignorable code points that are neither stay through — the combining grapheme joiner U+034F, the Khmer inherent vowels U+17B4 / U+17B5, the Mongolian free variation selectors U+180B–180D, the variation selectors U+FE00–FE0F and U+E0100–E01EF — so a note of only those reads as empty and satisfies "with a reason". JavaScript supports `\p{Default_Ignorable_Code_Point}`: add it (U+2800, the blank braille pattern, is not default-ignorable and stays listed). Also (a) make the rule STATELESS — a negated class with `.test` instead of a module-level `/g` regex used with `.replace` — and (b) fix the doc comment, which lists U+FEFF among the characters that "survive `.trim().min(1)`" while the test added with it asserts the opposite (U+FEFF is the one `trim` strips). Tests for the new code points, one a surrogate pair (build every character from its code point). (MEDIUM; Blind 2, 3, Edge 3, Auditor 5) [`packages/contracts/src/claims/fee-bank-date.ts:66-83`; `packages/contracts/tests/claims-fee-bank-date.test.ts`]
- [x] [Review][Patch] L5 — K7's disposition said "four shape refusals" — the leg has three `invalid_reason` cases and `not_found` — and the writer's own step-(0) `missing_display` (a blank `actorDisplay`) has no domain leg (grep of `packages/domain/tests` for it beside the bank date: none; the API's line comes from the handler's pre-check). Add the leg to the same test, with its control; a dated correction of the disposition wording. (LOW; Auditor 4) [`packages/domain/tests/integration/claim/fee-bank-date-check.spec.ts` K7 leg]
- [x] [Review][Patch] L6 — The K8 pin proves the index NAME and that it is UNIQUE, not that it is the "one live" index: any unique index of that name satisfies both tests. Pin the partial predicate in the migration text (the same `CREATE UNIQUE INDEX` statement carries `WHERE … superseded_at IS NULL`). The end-to-end behaviour is already proved at the DB by the policy-regression spec's one-live leg — say so in the test's header. (LOW; Blind) [`packages/domain/tests/claim/fee-bank-date-one-live-violation.test.ts`]
- [x] [Review][Patch] L7 — `refusedWritesNothing` says "wrote NOTHING" but snapshots only the check-row count and the live check's id. Add the claim stream's event count to the snapshot (a refusal must emit no event), or reword; (Blind's claim that no live check exists before the attempt is wrong — `claimAt` seeds one, which is why the supersede mutant went red). (LOW; Blind) [`fee-bank-date-check.spec.ts` helper]
- [x] [Review][Patch] L8 — K9's legs are weaker than their words: (a) asserts only "403, not step-up" and `foAtDistrict` never checks that its `/auth/scope` call succeeded, so a failed scope would also give a 403 (only the control rescues it); (b) says "a district grant never satisfies the list" but asserts it for the OTHER district only; (d) compares an error code the helper can return as the string `undefined` for both, and compares a FULL-scope officer's answer on an unknown claim with a different actor's refusal — which proves nothing about existence. Fix: check the scope call is 200; assert the own-district officer's list is 403 too; make (d) the district-scoped officer of another district posting to an EXISTING claim and to an UNKNOWN one — same status and same real code (non-empty, not `undefined`). The TR8 note's sentence about this leg is then re-worded by a dated line. (LOW; Blind, Auditor 7) [`apps/api/tests/integration/claims/fee-bank-date.spec.ts` K9 leg and `foAtDistrict`]
- [x] [Review][Patch] L9 — Test nits in this pass's own legs: the two `['fee-bank-dates', PARIWAR]` keys should be `feeBankDatesKey(PARIWAR)` (imported like its siblings); K5's "control" `expect(activeElement).not.toBe(opener)` before any interaction is true in every run — remove it (the mutants are the proof); the "note is gone from the mutation cache" check after the outcome relies on a `gcTime: 0` timer having fired — wait for it (`waitFor`); and the K5 names test is titled "NAMED" but proves a DESCRIPTION (`aria-describedby`) — retitle it and say what it does not do (L11). (LOW; Blind) [`apps/admin/tests/fee-bank-dates.test.tsx`]
- [x] [Review][Patch] L10 — Two comments the fix made stale: the page header still says "ONE announced, focused line above the sections" (K4 puts an open-form refusal under its form); the writer's step-(0) comment says a blank plaintext note is "the contract's refusal (`.trim().min(1)`)" — now also the visible-character rule. (LOW; Auditor 6) [`FeeBankDatesPage.tsx:15-17`; `packages/domain/src/claim/fee-bank-date-persist.ts:145-146`]
- [x] [Review][Defer] L11 — NEW: each row's open / submit / close button keeps the SAME accessible NAME; K5's `aria-describedby` adds the row line as a DESCRIPTION, which a screen reader reads on focus but a button LIST (names only) does not show. A name built with `aria-labelledby="<the button> <the row line>"` would tell them apart — it changes what is announced (existing DL11 words, combined) and the role / name queries the tests use, so it is an accessibility-pass call, not a patch here. **Trigger:** the accessibility pass of the staff screens (K27's). (Blind)
- Dismissed after checking the code (8):
  1. "The retire-on-close updater swallows a refusal an outcome has just set" (Blind) — `open(null)` is called only by the Close button (`onClose`); an outcome, a token change and a dropped row clear `openFor` directly, so the updater never runs for them.
  2. "The inline refusal has a single render sink and no fallback" (Blind) — true for ONE commit when the open row has just been dropped; the same effect then replaces the line with `stale` above the sections and clears `openFor`.
  3. "The opener may still be disabled when the form closes" (Blind) — an outcome that closes the form hands the focus to the outcome line (the list's effect runs after the row's); the Close button is reachable only when nothing is busy.
  4. "The nav test reads router source text" (Blind) — a source pin by this repo's own convention (the terminology tests); formatting-sensitive by nature, and it fails loudly.
  5. "K12's identity check is a tautology and its samples are narrow; the bank-date rule now depends on the member's UTR rule" (Blind) — the coupling IS K12's point (one constant); padded input differs by design (the bank form trims, the receipt does not).
  6. "A mapped 23505 is thrown from an aborted transaction" (Blind) — unreachable (the writer's comment says so) and the `_rejected` audit is emitted after the scope transaction closes, not inside it.
  7. "An empty envelope is reported as `invalid_reason`" (Blind) — the admin's `invalid_reason` line is DL11's "Something in the form is not right…" (not "pick a reason"), and the contract refuses first, so it is unreachable over HTTP.
  8. "The first-field focus runs on every `RowForm` mount" (Blind) — a `RowForm` mounts only when its row is opened; a row that moves section closes its form.
- **Checklist families (the Auditor's verdicts, read against what I checked):** 3 covered by test (K9; the non-human leg by construction); 5 covered by test (K10, K8; the 23505 mapping end to end is not constructible and the comment says so); 6 covered by test (K14 (a)); 10 covered with two overstated wordings, both corrected above (K5's `aria-busy` scope — L1; K7's count — L5); 12 covered by test; 13 (web analogue) one real gap — L1; (a) and (c) pass. Confirmed by the Auditor: the diff adds no new staff words (only `role`, `aria-*`, ids and comments); K6's writer is unchanged and the rule has no other plaintext point to attach to; K1-P is correctly not built; no AC12 expectation was loosened.

**Dispositions of the fix-diff review (2026-11-27, the second fix pass; BigDev: "1" — apply every patch).** L1–L10 APPLIED. K1-P is still OPEN (BigDev's words and a
decision entry first). Nothing is committed. Each leg was mutation-checked (the fix or the guarded code reverted or broken ⇒ the leg red; every mutant restored byte
for byte — `git status` shows no stray change). What this pass found beyond the review's own text, stated:
- **L1** — `aria-busy` moved from the form's group to its FIELDSET and now marks only a request in flight (`sending || isPending`), never the held step-up; two legs
  (in flight: the fields busy, the group not; held: nothing around the panel busy). Mutant: back on the group, held too ⇒ both red. ⚠ **Correction to K5's
  disposition above:** it said "`aria-busy` while sending" and placed it on the outer group — the code did more (sending OR held) than it said; this pass fixes the code.
- **L2** — written FAILING FIRST (the focus ended on the lower row's "open" button, as the two layers derived), then fixed: the opener takes the focus back only when it
  was LOST (`<body>`). A leg for opening an upper row from a lower one, the reverse, and Close. Mutant: unconditional ⇒ red.
- **L3** — the K13 leg now seeds the other Pariwar's list into the query cache, so no loading phase unmounts the list: it fails if the `key` is removed (run), where the
  first version passed with or without it. ⚠ **Correction to K13's disposition:** "its leg is red with a `keepPreviousData` hook and no key" was true of a MUTANT
  outside the committed test; the committed leg could not fail until now.
- **L4** — the rule is `[^\s\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\u2800]` with `.test` (stateless; the module-level `/g` regex is gone); six more cases in the tests (U+034F,
  the Khmer vowels, the Mongolian selectors, U+FE0F, a supplementary-plane selector and a tag character — two surrogate pairs), `x` + a variation selector is visible, and the
  doc comment no longer lists U+FEFF among the survivors of `trim` (it is the one `trim` strips). Mutants: the old hand-picked list ⇒ 5 red; a `/g` regex ⇒ 2 red.
- **L5** — the writer's step-(0) `missing_display` has its domain leg (mutant: the refusal removed ⇒ red). ⚠ **Correction to K7's disposition:** it said "the writer's
  four shape refusals" — the leg had three `invalid_reason` cases and `not_found`; with `missing_display` it now has the five it claims.
- **L6** — the K8 test now also pins the PARTIAL predicate in the migration's statement (mutant: the predicate dropped from the SQL text ⇒ red; the container untouched, the
  file restored); its header says what the DB-level one-live spec proves.
- **L7** — `refusedWritesNothing` snapshots the claim stream's events as well, and its comment says exactly what "nothing" covers (mutant: an attempt that records a bank
  date, which emits an event, and then throws ⇒ red).
- **L8** — the K9 leg's refusals assert a REAL code; the own-district officer's list is refused too; the existence claim is now made by ONE actor (the officer of another
  district) on an existing claim and on an unknown one, with the full-Pariwar officer's fail-closed answer as a separate leg (e). (Mutant: the list's permission hook removed
  ⇒ red.) ⚠ **The review's premise for (a) was refuted:** `/api/v1/auth/scope` is NOT a route (it answers 404) — the scope is the `:pariwarId` path param — so there is no "scope
  that did not take" to confuse with the district's 403; the world helpers' own `staff()` makes that call vestigially (pre-existing, many specs). My helper no longer makes it.
  ⚠ **The TR8 note above** says leg (d) asserted the unknown-claim answer "for a finance officer": it is now asserted for the officer of another district (d) AND the
  full-Pariwar officer (e) — both the same 403 and code.
- **L9** — `feeBankDatesKey` imported; K5's vacuous "control" removed; the mutation-cache check WAITS for the `gcTime: 0` drop; the K5 names test is titled for what it proves
  (a DESCRIPTION — the NAMES stay the same, L11). ⚠ **Correction to K5's disposition:** "every row's buttons are NAMED by that row" should read DESCRIBED. ⚠ **Annotated 2026-11-27 (review of the M-pass delta, N10 b):** K5's disposition already said "each button is described by its row's line"; "NAMED" was the K5 TEST'S TITLE, which this pass retitled — read the sentence above as a correction of that title, not of the disposition.
- **L10** — the page header and the writer's step-(0) comment say what the code now does.
- **Verified after the fixes:** `tsc --noEmit` clean in contracts, domain, api and admin; eslint clean on every changed file; domain `tests/claim` + `tests/rbac` 1,238; contracts 1,860;
  admin 2,547 → 2,549; domain live 1,458 and API live 72 on the story's own container `twt-6-39a-pg`, not the native :5432; the microcopy and human-actor gates pass.
  ⚠ NOT run: `ci:local`, and a third review of THIS second fix diff (L1 and L2 were real defects in the first fix diff — the project's rule is to repeat until a round finds only LOW).

#### Review of the L-pass delta (2026-11-27 — the fixes to the fix, UNCOMMITTED on top of `2f496e3d`; BigDev: "2" — re-run code review)

The same three layers on the DELTA the L1–L10 pass made over the fix diff the previous round reviewed (382 lines, 8 files): rebuilt by applying that reviewed patch to a clean copy of `HEAD` and
diffing it against today's files, so the layers saw exactly what changed and nothing else. The tree was fingerprinted before the layers launched and is byte-identical after. About 23 raw
findings → about 15 distinct → **0 decision-needed, 5 patch, 1 defer, 9 dismissed. Nothing HIGH or MEDIUM survived** (the Auditor: "nothing HIGH or MEDIUM"; the Blind Hunter's three MEDIUMs are
M1, M2 and a pair of dismissed items). Every L1–L11 disposition was checked by the Auditor against the tree: confirmed, apart from the three wordings in M5 and the vacuous leg in M2. Each finding was re-checked
in the code unless it says "as reported".

- [x] [Review][Patch] M1 — The visible-character rule is a DENY-list of invisible classes, so anything blank-rendering that is in none of them still counts as visible: a note of only combining marks (`\p{M}`), private-use characters (`\p{Co}`), unassigned code points (`\p{Cn}`), a lone surrogate (`\p{Cs}`) or U+FFFC (the object-replacement character). And the doc comment's "a character added in a later Unicode is covered without anyone remembering it" is overstated — until the engine's tables are updated such a character is `Cn`, which the deny-list accepts. Make it an ALLOW-list: a visible character is a letter, number, punctuation or symbol (`\p{L}\p{N}\p{P}\p{S}`) that is not default-ignorable and not U+2800 / U+FFFC — unknown and unassigned code points then fail CLOSED on both sides. Tests for each class named (built from code points; a lone surrogate by `String.fromCharCode`), a Devanagari conjunct and `x` + a variation selector still visible; correct the comment (and say the form and the API use the same rule, and what a table drift between a browser and the server would do). (LOW–MEDIUM; Blind 6, Edge 1) [`packages/contracts/src/claims/fee-bank-date.ts:66-85`; `packages/contracts/tests/claims-fee-bank-date.test.ts`]
- [x] [Review][Patch] M2 — The new "STATELESS" leg cannot fail for the bug it names: it alternates a visible note and an invisible one, and a module-level `/g` regex used with `.test` answers that pair correctly (the visible call leaves `lastIndex` at 1, the invisible call then fails and resets it to 0). Re-checked with a scratch process: `x`, ZWSP, `x`, ZWSP → `true,false,true,false` with the BUGGY regex; the same visible note twice in a row → `true,false,true`. The dispositions' "a `/g` regex ⇒ 2 red" was caught by OTHER legs (the ones that call the rule and then `safeParse` the same note). Call the same visible note three times in a row, and the same invisible one after a visible one; re-run the `/g` mutant and say which legs it turns red. (LOW; Blind 1, Edge 2, Auditor 1) [`packages/contracts/tests/claims-fee-bank-date.test.ts` "STATELESS"]
- [x] [Review][Patch] M3 — The migration pin takes the first `;`-segment that mentions the index name, and the comment line above the `CREATE` itself contains a `;` ("…is the interface; this index is the truth."), so the matched "statement" starts mid-comment. It is not vacuous today (the predicate is inside that segment and the dropped-predicate mutant goes red), but a comment that names the index or quotes `WHERE superseded_at IS NULL` would satisfy it with the real statement lacking it. Strip SQL comments first and take the statement that BEGINS with `CREATE UNIQUE INDEX "<name>"`; require the predicate at its end. The Drizzle schema's own `where` is a separate pin only if it can be read without a dialect — leave it, and say so. (LOW; Blind 2, Edge 3, Auditor 4) [`packages/domain/tests/claim/fee-bank-date-one-live-violation.test.ts`]
- [x] [Review][Patch] M4 — `refusedWritesNothing`'s new events count has no control showing that an ACCEPTED check moves it (so a stream id that is not the claim id would leave the leg blind). It is live — L7's own mutant (an attempt that records a bank date, which emits an event) turned the leg red — but the control belongs in the legs: return the whole snapshot from the helper and assert the accepted check adds a row AND an event. Also: the new `eventRows` const sits between the doc comment and the function it documents — move it above the comment. (LOW; Edge 4, Blind) [`packages/domain/tests/integration/claim/fee-bank-date-check.spec.ts:162-171`]
- [x] [Review][Patch] M5 — Wording and record slips from the L pass: (a) the writer's step-(0) comment now says "a blank PLAINTEXT / (or invisible-only) PLAINTEXT note" — a doubled word [`packages/domain/src/claim/fee-bank-date-persist.ts:145-146`]; (b) the page comment says "the form is DESCRIBED by its row's line: the group is labelled by it" — the GROUP is labelled (it has a name); its BUTTONS are described [`FeeBankDatesPage.tsx:223`]; (c) the API leg's `toMatch(/\S/)` is redundant (the string `'undefined'` passes it) — the `.not.toBe('undefined')` beside it does the work [`apps/api/tests/integration/claims/fee-bank-date.spec.ts`]; (d) the L2 leg says "whichever of the two comes first in the list" but asserts no document order — assert that `CLAIM` precedes `CLAIM_2` [`apps/admin/tests/fee-bank-dates.test.tsx`]; (e) the API leg (e) says the answer fails closed "for EVERYONE" but exercises one actor — say what it ran, and that `pariwar_admin` / `super_admin` are read from 6.18's doc block, not run here; (f) the TR8 Completion Note still reads "asserted … by K9's leg (d)" with the correction only in the dispositions — add a dated forward pointer in the note; (g) the dispositions' "Correction to K5's disposition: NAMED → DESCRIBED" corrects a word K5's disposition never contained (its test TITLE said NAMED; the disposition already said "described") — a dated line saying so. (LOW; Auditor 2, 3, 5; Blind) [as listed]
- [x] [Review][Defer] M6 — NEW, pre-existing: a display name made only of invisible characters passes the writer's `trim() === ''` check (the L5 leg tries `'   '` only) and would give an attribution that reads as blank. The finance officer's display name is a Super Admin's `setAdminDisplayName`, shared by every admin act; the rule that K6 gave the note is the same shape and could be applied at that one place. **Trigger:** the display-name set path is next touched, or an unattributed-looking audit row is reported. (Blind)
- Dismissed after checking the code (9):
  1. "The focus guard is tested only where `activeElement` is always `body`" (Blind) — in the L2 leg the guard's other branch IS exercised: the new form's effect focuses its field before the closing row's effect runs, so the closing row meets a non-body element and skips; the real-browser variants (Chrome focusing the clicked opener, Safari not) reduce to the same two orders. The deleted pre-interaction "control" was vacuous.
  2. "`aria-busy` has weak assistive-technology support; the held-step-up sample may race; the inner fieldset is anonymous" (Blind) — a platform fact, not a regression of this pass; `setSending(false)` and the hold's `setPending` are one handler, so one render — the sample cannot see a half state; the fieldset sits inside a labelled group.
  3. "The mutation-cache check was weakened to 'eventually'" (Blind) — it waits for a `gcTime: 0` drop, a timer; the leg still fails if the note is never dropped.
  4. "The tests read the cache through the production `feeBankDatesKey`; L3 reuses one fixture" (Blind) — the helper IS the key (a literal copy rots); the shared claim id is what makes the open form persist without the `key` — the point of the leg.
  5. "Review-round labels and long rationales in production source" (Blind) — this codebase's convention throughout (story, decision and review ids in comments).
  6. "The writer's comment cannot enforce that no invisible-only note reaches it" (Blind) — the writer sees only ciphertext and the comment says so; its one production caller sits behind the route's contract (verified in the second pass).
  7. "The API leg works around `errCode` and pins two product behaviours" (Blind) — pinning behaviour is what K9 is for; `errCode`'s `'undefined'` is handled by the `.not.toBe`.
  8. "The L5 leg has no write-nothing assertion; the events snapshot is bound to the check helper" (Blind) — the K7 test asserts no live bank-date record BEFORE its control, the bank writer's refusals all throw at steps (0)–(1) before any write, and the events leg was proved live by L7's mutant.
  9. "The form's and the server's Unicode tables can differ" (Blind) — a rare engine-version drift shows the officer the API's 400 line; the same rule on both sides is the best available, and M1's allow-list makes an unknown character fail closed on both.
- **Checklist families (the Auditor's verdicts):** 3 covered by test (K9 / L8); 4 (events, narrowly) covered by test — control owed, M4; 5 covered by test, the pin's fragility M3; 10 honest in substance, three wording lapses (M5) and one vacuous leg (M2); 13 (web analogue) covered by test — the held step-up's alerts are no longer inside a busy subtree, focus in both row orders and on Close. Confirmed: no new staff words; no ratified behaviour widened or narrowed; K1-P not built.

**Dispositions of the review of the L-pass delta (2026-11-27, the third fix pass; BigDev: "1" — apply every patch).** M1–M5 APPLIED. K1-P is still OPEN (BigDev's words and a decision entry first).
Nothing is committed. Each leg was mutation-checked and every mutant restored byte for byte (`git status` shows the migration and the route files unmodified). What this pass found, stated:
- **M1** — the visible-character rule is an ALLOW-list: `(?![\p{Default_Ignorable_Code_Point}\u2800\uFFFC])[\p{L}\p{N}\p{P}\p{S}]` (a letter, number, punctuation mark or symbol that is not default-ignorable and not U+2800 /
  U+FFFC), so an unknown or unassigned code point fails CLOSED. Checked first against 36 inputs in a scratch process (24 invisible, 12 visible; no mismatch). Five new classes in the tests (a lone combining mark, a private-use
  character, an unassigned code point, a lone surrogate, U+FFFC). Mutant: the deny-list again ⇒ EXACTLY those five red. The comment's "a character added in a later Unicode is covered" is gone; it now says what a
  table drift between a browser and the server would do.
- **M2** — the stateless leg calls the SAME note repeatedly (visible, invisible, visible). Mutant: the allow-list as a `/g` regex ⇒ THREE red, the dedicated leg among them. ⚠ **Correction to L4's disposition:**
  it said "a `/g` regex ⇒ 2 red"; those two were OTHER legs (the ones that call the rule and then parse the same note) — the dedicated "stateless" leg could not fail until now.
- **M3** — the migration pin strips SQL comments and takes the statement that BEGINS with the `CREATE UNIQUE INDEX "<name>"`, requiring the predicate at its end. Mutants: the predicate dropped ⇒ red; the predicate dropped AND a
  comment quoting it (with a `;` in it) planted above the `CREATE` ⇒ red — what the previous version would have accepted.
- **M4** — the helper returns the whole snapshot (rows, live check, events) and a control `expectCheckRecorded` asserts an ACCEPTED check adds a row AND moves the claim stream's events; the doc comment is back above the
  function it documents. Mutants: a blind events count (a stream that is not the claim's) ⇒ the control red in all three legs; an attempt that records a bank date (which emits an event) and then throws ⇒ the refusal leg red.
- **M5** — (a) the doubled word in the writer's comment; (b) the page comment now says the GROUP is labelled and its BUTTONS are described; (c) the redundant `toMatch(/\S/)` removed, the real-code assertion kept; (d) the L2 leg
  asserts the document order its title speaks of; (e) the API leg (e) says what it ran; (f) the TR8 note carries an in-place dated pointer (above); (g) ⚠ **L9's "Correction to K5's disposition" pointed at text that
  disposition never contained** — K5's disposition already said "described"; "NAMED" was the K5 TEST'S TITLE, which L9 retitled. Read that line as a correction of the test title.
- ⚠ **A process slip, stated:** the first run of the M1 and M2 mutation checks printed "35 passed" for both mutants. They were NOT mutation checks — the harness turns a `\u` escape typed in a shell command into the raw character
  BEFORE Python sees it, so the mutant's anchor never matched and the helper's own assertion aborted it. Redone with the backslashes built by `chr(92)`; the results above are from that run. (The source files were never affected — each
  edit was scanned for raw characters afterwards.)
- **Verified after the fixes:** `tsc --noEmit` clean in contracts, domain, api and admin; eslint clean on every changed file; domain `tests/claim` + `tests/rbac` 1,238; contracts 1,860 → 1,865; admin 2,549; domain live 1,458 and
  API live 72 on the story's own container `twt-6-39a-pg`, not the native :5432; the microcopy and human-actor gates pass. ⚠ NOT run: `ci:local`. This round found only LOW items (the Auditor: "nothing HIGH or MEDIUM
  survived"), which is the project's stopping rule — a further round on the M-pass delta is optional, not owed.

#### Review of the M-pass delta (2026-11-27 — the fixes to the fixes to the fix, UNCOMMITTED on top of `2f496e3d`; BigDev: "2" — re-run code review)

The same three layers on the DELTA the M1–M5 pass made (244 lines, 8 files): rebuilt by applying the previous round's saved delta to the pre-L copy and diffing it against today's files — exactly the eight files the M pass touched, nothing
else, which is also the check that the reconstruction is right. The tree was fingerprinted before the layers launched and is byte-identical after. About 21 raw findings → about 16 distinct → **0 decision-needed, 10 patch, 1 defer,
5 dismissed.** The Auditor: no AC, DL (DL11 included), decision (`-510` / `-511` / `-512`) or invariant is violated; no new staff words; M1 narrows what K6 ratified as "a note needs a visible character" and no legitimate note is
rejected (Hindi, Gujarati and Urdu words, a conjunct, emoji and ZWJ sequences, `14`, `१२`, ₹, `%`, `+`, the danda all pass — checked in a scratch process). The grading differs by layer: the Auditor graded nothing above LOW; the
Blind Hunter graded three items MEDIUM, all test-strength (N1, N6, N7). Every claim below was re-checked in the code unless it says "as reported".

- [x] [Review][Patch] N1 — M1 narrowed the rule to an allow-list, and nothing PROVES the legitimate side still passes: the committed positive cases (`.`, `x`, `1`, an ASCII sentence, a Devanagari conjunct, `x` + a variation selector, U+034F + `.`) are all letters, numbers or punctuation — a mutant that drops the SYMBOL arm (`\p{S}`) is not caught (re-checked: they all pass without it). Add positives built from code points: a rupee sign, a check-mark emoji, a ZWJ family emoji, `+`, a danda, Devanagari digits, a Hindi word, an Urdu word. A false rejection leaves the officer unable to enter the REQUIRED reason — the only direction in which the rewrite can hurt. (LOW–MEDIUM; Blind 1, Edge 2, Auditor 2) [`packages/contracts/tests/claims-fee-bank-date.test.ts`]
- [x] [Review][Patch] N2 — Blank-glyph characters that are in no ignorable class are still accepted as "visible" (re-checked with a throwaway expression): U+303F (ideographic half fill space, `So`), U+1D159 (musical symbol null notehead, `So`), U+13441 and U+13442 (Egyptian hieroglyph full / half blank, `Lo`) — a note of only one of them reads as empty and satisfies the required reason. (The noncharacters, U+0378, U+16FE4 and U+13430 are already refused.) Add the four to the lookahead exclusions beside U+2800 and U+FFFC, with a test row each, and SAY in the comment that this short residual list is hand-kept (the property classes cannot name a character whose only fault is a blank glyph) — so the allow-list's "unknown fails closed" is not read as covering these. (LOW–MEDIUM; Edge 1) [`packages/contracts/src/claims/fee-bank-date.ts:66-89`]
- [x] [Review][Patch] N3 — The rule's comment says more than the code does: "a character the engine does not know fails CLOSED" holds for a note made ONLY of such characters (the rule needs one visible character, so `x` plus unassigned ones passes); "a single class" is now a lookahead plus a class; and the engine-drift caveat covers one direction only (a browser newer than the server passes and the API answers 400) — the other (an OLDER browser refuses a note, written only in a script newer than its tables, with the "Write a note" prompt, and the officer cannot send it) is unsaid, with its way out (add any ordinary character). (LOW; Blind 4, 7) [`packages/contracts/src/claims/fee-bank-date.ts` doc comment]
- [x] [Review][Patch] N4 — The "stateless" leg is looser than it looks: of its three loops only the `x`-four-times one can fail for a `/g` regex (the sentence loop returns `true` on every call, because each call matches the next visible character; the invisible loop never moves `lastIndex`), the title says "whatever was asked before" though no call follows a DIFFERENT earlier one, and its comment recounts the draft's history. Replace with one sequence that can fail on a `/g` regex AND follows different notes (`x`, `y`, `z`, then `x` again — after `x` the stale index makes the next one-character note answer `false`); a comment that says what the leg proves, not how it was written. (LOW; Blind 5, Auditor 2) [`packages/contracts/tests/claims-fee-bank-date.test.ts` "STATELESS"]
- [x] [Review][Patch] N5 — The migration pin is better but still loose: it strips `--` comments only (a `/* … ; … */` block or a `;` in a literal still splits the statement), matches `CREATE UNIQUE INDEX` case- and whitespace-exactly while its predicate regex is case-insensitive (a lowercase or double-spaced migration would fail with "no statement"), and it pins the predicate but not the KEY COLUMN — a partial unique index on the wrong column (`("pariwar_id") WHERE superseded_at IS NULL`) stays green. Strip block comments too, match the head case- and whitespace-insensitively, require `USING btree ("claim_case_id")`; say in the header what is NOT pinned (the Drizzle schema's own `where`; a LATER migration that drops or recreates the index — the live spec covers the behaviour). (LOW; Blind 6, Auditor 6) [`packages/domain/tests/claim/fee-bank-date-one-live-violation.test.ts`]
- [x] [Review][Patch] N6 — `expectCheckRecorded` proves the rows and the events can move, not the third part of the snapshot: if `liveId` answered the same on both sides, the "refusal wrote nothing" check would be blind to a writer that SUPERSEDED the live check, and the comment says "neither count is blind". An accepted check supersedes the seeded live check, so the control should also assert `after.live` differs from `before.live`; mutant: a constant `liveId`. (LOW–MEDIUM; Blind 3) [`packages/domain/tests/integration/claim/fee-bank-date-check.spec.ts` `expectCheckRecorded`]
- [x] [Review][Patch] N7 — Two API-leg weaknesses: (a) dropping `toMatch(/\S/)` left `.not.toBe('undefined')`, which passes for `''` or `'null'`, and the later equality legs would then compare two empty codes — assert the code's SHAPE (a dotted `family.reason` code: `'undefined'`, `''` and `'null'` all fail it); (b) leg (e) says `pariwar_admin` and `super_admin` fail closed on an unknown claim, "read there, not run here" — a security-relevant claim two further actors carry untested. A Super Admin on an unknown claim is cheap to run (`W.staff(w, ['super_admin'])`, step up, post a ghost claim): add the leg, and if it does NOT answer 403, correct the TR8 note instead of the test. (`pariwar_admin` holds no key for this route at all — AC8 refuses it on an existing claim.) (LOW–MEDIUM; Blind 2, 9, Auditor 5) [`apps/api/tests/integration/claims/fee-bank-date.spec.ts` K9 leg]
- [x] [Review][Patch] N8 — The unassigned-code-point row (U+0378) is true only until Unicode assigns it; a permanent noncharacter (U+FDD0, and U+FFFF) is a stable fixture. And the "a mix of all of them" row was not extended with the five classes M1 added. (LOW; Blind 8) [`packages/contracts/tests/claims-fee-bank-date.test.ts` INVISIBLE_ONLY]
- [x] [Review][Patch] N9 — One garbled sentence survives in the writer's step-(0) comment: "catches a caller that passed ⛔ envelope at all" — the marker means "no" and reads as ambiguous; say "no envelope". (LOW, nit; Blind 12) [`packages/domain/src/claim/fee-bank-date-persist.ts:145`]
- [x] [Review][Patch] N10 — Record corrections that did not reach where the wrong text lives (Auditor 1, 3, 4): (a) "nothing above LOW" / "the project's stopping rule is met" (the dispositions, Change Log v1.16, ledger `2026-11-27n`) is the AUDITOR's grading — the Blind Hunter graded M1 and M2 MEDIUM and M1 changed a runtime predicate, which is why this round ran; say so in a dated line and in the new Change Log row and ledger entry; (b) the L9 line ("Correction to K5's disposition: NAMED → DESCRIBED") is still unannotated in place and Change Log v1.15 / ledger `2026-11-27m` repeat "K5's … NAMED" — annotate the L9 line in place (K5's disposition already said "described"; "NAMED" was the test's TITLE) and carry the correction in the new row and entry; (c) the TR8 annotation sends the reader to "L8" for "`pariwar_admin` / `super_admin` not run" — that sentence is in M5(e) and the API leg's comment, not L8; (d) "`git status` shows the migration and the route files unmodified" is imprecise — `FeeBankDatesRoute.tsx` shows as modified (K13's `key`, from the second pass); the M pass left it unchanged. (LOW; Auditor 1, 3, 4) [story: Dispositions of the review of the L-pass delta, the L9 line, the TR8 note, Change Log]
- [x] [Review][Defer] N11 — NEW, outside this story: `HAS_VISIBLE_CHAR` in `apps/api/src/modules/claims/claims.ground-inspection.routes.ts` and in `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx` is still a DENY-list, with the gap M1 closed here (a lone combining mark, private-use and unassigned code points count as visible). Another story's code; the shared rule would belong in `@twt/contracts` once a second consumer wants it. **Trigger:** the ground-inspection note rule is next touched, or a blank-looking inspection note is reported. (Auditor 7)
- [x] [Review][Patch] N12 — FOUND BY THE VERIFICATION RUN, not by a layer: the developer's original "a valid form sends the reference TRIMMED" leg asserted `toBeEnabled()` on the row's "open" button synchronously after the form's removal, while the list's `busy` flag clears one render later (the opener is `locked` until the form's cleanup effect has run) — it failed ONCE in the full 116-file admin run and in none of 14 further runs (6 alone, 8 under parallel load). A latent race in a pre-existing leg, not introduced by this pass. The leg now waits for the opener to be enabled; two full runs green after. (LOW) [`apps/admin/tests/fee-bank-dates.test.tsx`]
- Dismissed after checking the code (5):
  1. "The page comment says the buttons are DESCRIBED but the hunk wires only the group's `aria-labelledby`" (Blind) — each button's `aria-describedby` is in the K5 hunks of the same file; the Auditor confirmed M5(b).
  2. "The DOM-order assertion proves source order, not visual order" (Blind) — the list uses no CSS reordering; source order is what a keyboard and a screen reader follow.
  3. "A lone surrogate is mangled to U+FFFD by a lossy transport, and U+FFFD counts as visible" (Blind) — a transport effect on a character the officer cannot type; the rule is applied to what the API receives, and the form refuses the lone surrogate itself.
  4. "Nothing pins the engine's Unicode / ICU version" (Blind) — it cannot be pinned in a test; the drift is a stated limit of the rule (N3 makes the statement two-directional).
  5. "The migration pin does not read later migrations or the Drizzle schema's `where`" (Blind, Auditor 6) — a stated scope: the DB behaviour is proved live by the policy-regression spec's one-live leg; N5 states what is NOT pinned.
- **Checklist families (the Auditor's verdicts):** 4 covered by test (an accepted check always appends `claim.membership_checked` on the claim stream; every writer refusal throws before the first write, so the events equality is not too strict) — control owed for the `live` part, N6; 5 covered by test (the one-live DB leg), key columns N5; 10 REAL GAPS, all LOW — N1, N10 and the unpinned symbol arm; 3 covered by test for the finance officer, the two further actors N7; 13 covered (behaviour unchanged). Confirmed: no new staff words, no AC / DL / decision violated, K1-P not built.

**Dispositions of the review of the M-pass delta (2026-11-27, the fourth fix pass; BigDev: "1" — apply every patch).** N1–N10 and N12 APPLIED; N11 deferred. K1-P is still OPEN (BigDev's words and a decision entry first). Nothing is committed.
Each leg was mutation-checked and every mutant restored byte for byte, with the mutants built by `chr(92)` and their anchors asserted (the process slip of the previous pass is not repeated). What this pass found, stated:
- **N1** — ten REAL notes pass, built from code points: a Hindi, a Gujarati and an Urdu word, Devanagari digits, a danda, a rupee sign, `+`, a check-mark emoji, a ZWJ family emoji and `%`. Mutant: the symbol arm (`\p{S}`) removed ⇒ that leg red (it was not caught before — re-checked: the old positives were all letters, digits and punctuation).
- **N2** — U+303F, U+1D159, U+13441 and U+13442 join U+2800 and U+FFFC in the lookahead; a test row each. The comment says the list is SHORT and HAND-KEPT: a character whose only fault is a blank glyph has to be named. Mutant: the four removed ⇒ four red (three rows and the mix).
- **N3** — the comment says what the code does: a note made ONLY of unknown characters is refused, a note with one visible character passes; "one regex (a lookahead and a class)"; the browser / server table drift in BOTH directions, with the way out.
- **N4** — the stateless leg follows DIFFERENT notes (`x`, `y`, `z`, `x`, `x`, then invisible / visible interleaved): after `x` a `/g` regex would answer the next one-character note `false`. Mutant: `/gu` ⇒ four red, the dedicated leg among them. ⚠ **Correction to M2's disposition:** it said the `/g` mutant turned THREE red including the dedicated leg — true — but that leg's second and third loops were still non-discriminating; only its first loop could fail. Now every call can.
- **N5** — the migration pin strips line AND block comments, matches `CREATE UNIQUE INDEX` in any case and spacing, and pins the key (`USING btree ("claim_case_id")`) as well as the predicate. Mutants: a wrong key column ⇒ red; a block comment quoting the predicate, with a `;` in it, planted above a predicate-less index ⇒ red; a legitimate REFORMAT (lower case, double spaces) ⇒ still green. The migration is unmodified in git. Not pinned, stated in the test: the Drizzle schema's own `where` and a LATER migration.
- **N6** — `expectCheckRecorded` also asserts the live check CHANGED (an accepted check supersedes the seeded one). Mutant: a snapshot whose live part is constant ⇒ all three legs red.
- **N7** — the API leg asserts a dotted code (`family.reason`; `undefined`, an empty string and `null` all fail it — checked in a scratch process). ⭐ **Leg (e2) RUNS the Super Admin claim:** a Super Admin on an unknown claim gets the same 403 and code, so 6.18's doc-block statement is now attested by this story's own test, no longer only read (the TR8 note is re-annotated above).
- **N8** — the unassigned row is now permanent noncharacters (U+FDD0, U+FFFF); the "mix of all of them" row carries the classes added since.
- **N9** — "passed no envelope at all".
- **N10** — records: L9 and TR8 annotated IN PLACE (above); the two statements below corrected here.
  ⚠ **Correction to the previous pass's closure wording:** "nothing above LOW" and "the project's stopping rule is met" (the dispositions of the L-pass delta, Change Log v1.16, ledger `2026-11-27n`) were the AUDITOR's grading. The Blind Hunter graded
  M1 and M2 MEDIUM, and M1 changed a runtime predicate — which is why a round was run on that delta. This round's grading: the Auditor LOW to LOW–MEDIUM, the Blind Hunter MEDIUM on N1, N6 and N7 (all test strength, all applied).
  ⚠ **Correction to the previous pass's "`git status` shows the migration and the route files unmodified":** `FeeBankDatesRoute.tsx` shows as modified (K13's `key`, from the second pass); the M pass left it unchanged. The migration and the API route files are unmodified.
  ⚠ **Correction to Change Log v1.15 and ledger `2026-11-27m`**, which repeat "K5's … NAMED": see the L9 annotation.
- **N12** — a latent race in a pre-existing admin leg, found by the full-suite verification run (above).
- **Verified after the fixes:** `tsc --noEmit` clean in contracts, domain, api and admin; eslint clean on every changed file; domain `tests/claim` + `tests/rbac` 1,238; contracts 1,865 → 1,870 (one new `it`, four new rows, one row replaced by two); admin 2,549 (two full runs, after N12);
  domain live 1,458 and API live 72 on the story's own container `twt-6-39a-pg`, not the native :5432; the microcopy and human-actor gates pass. ⚠ NOT run: `ci:local`. The deferral N11 (the ground-inspection note rule, another story's code) is in `deferred-work.md`.

## Dev Notes

### Traps

- **TR1 — The 6.39 blast radius, again.** The gate gains an arm and the check row two columns: every 6.39 spec that seeds a check raw
  (`seedPassedMembershipCheck`, both twins) keeps working only through the column DEFAULT `'recorded'` + `fee_bank_date_id NULL` — ⛔ edit
  the helpers to pass them unless a test needs `'bank'`. Run `packages/domain/tests/integration/claim/membership-check-*.spec.ts`,
  `apps/api/tests/integration/claims/membership-check*.spec.ts` and the 46-file approval list (6.39 TR1) after Task 4.1.
- **TR2 — The guard REPLACE.** Adding columns without REPLACING `claim_membership_checks_reject_mutation()` leaves them unguarded by the
  trigger (G7). `CREATE OR REPLACE FUNCTION` with the FULL chain + the two new columns; the AC1 leg must update AS THE OWNER (the column
  grant hides the hole from `twt_app`).
- **TR3 — ⛔ decrypt anywhere on the finance officer's path.** It shows no Tier-1 and needs none (N2); the death date stays in the
  membership-check handler. The fence's new `it` block covers the finance handler too.
- **TR4 — The leaf.** `membership-check-approval.ts` reads one more table — `sql` + schema only; ⛔ import the new writer or read module
  into it (the init cycle — 6.39 TR4).
- **TR5 — The typed reference is a SECRET-ish value.** ⛔ Store it, ⛔ log it, ⛔ echo it in a 409's `details`. Where it could leak, traced
  at `6536b8bb`: the error handler (`apps/api/src/middleware/error-mapping/index.ts`) ⛔ logs `request.body` — it logs `{ err }` only on its
  500 paths; the 400 `request.validation` envelope carries the Zod issues, and a regex failure's issue holds ⛔ input value (the UTR
  regex's message is static). ⚠ The REAL path: drizzle's `DrizzleQueryError` message is `Failed query: …\nparams: …` — the query's
  PARAMETERS — and an unmapped DB error (a CHECK, the 23505 backstop, the guard trigger) reaches the handler's 500 `logger.error` with
  them. ⇒ the typed reference is ⛔ a query parameter (DL3 — compared in TypeScript); the INSERT carries `bank_credit_date` and the note's
  CIPHERTEXT: catch the writer's insert errors and re-throw a parameter-free error (ids and the SQLSTATE only), so the bank date never
  reaches a log either. Both sides trimmed (the contract trims the typed one — DL10), letters compared without regard to case (DL3); the
  stored UTR is ⛔ rewritten.
- **TR6 — Calendar dates, ⛔ instants.** `bank_credit_date` is a `date` column: read it as `YYYY-MM-DD` (`mode: 'string'`), ⛔ through a JS
  `Date` (a UTC midnight would shift it a day in IST). The bounds use `istDateOf(now)` and `istDateOf(members.created_at)`.
- **TR7 — Three currency tokens on one POST.** The membership-check POST now carries three tokens (`expected_live_review_id`,
  `expected_live_check_id`, `expected_fee_bank_date_id`) — each refused with its own code, under the claim lock, in the writer's order.
  Each is compared TWICE (the handler against what it read, the writer against what it re-reads under the lock); only a direct writer
  call reaches the second compare, so each needs a domain leg (AC5).
- **TR8 — A pariwar grant at a district gate.** The per-claim routes resolve the deceased's district (`resolveNomineeNameCheckDistrict`);
  a deceased with ⛔ posting fails the resolver closed — a finance officer then cannot record either. Prove the positive leg on a seeded
  posting; record the no-posting behaviour (it matches 6.39's).
- **TR9 — Step-up in tests.** Copy the fraud-finding route specs' step-up fixture; a test without it must assert the step-up refusal, ⛔
  bypass the hook. Zod validation runs BEFORE the preHandler hooks ⇒ every 401 / 403 / step-up leg sends a VALID body, else 400
  `request.validation` answers first and the leg proves nothing.
- **TR10 — "Matches in practice" is ⛔ proven by this story.** The synthetic bank-parsers golden files (G3) prove nothing about the Trust's
  bank; the first real use is the attestation — say so in Completion Notes, ⛔ claim it.
- **TR11 — Admin microcopy gate.** "receipt" fails in admin copy, test ids and comments ([[project_microcopy_gate_scans_admin_code]]).
- **TR12 — Every `git push` needs the story's `DATABASE_URL`** prefixed ([[project_prepush_hook_inherits_5432]]); a reused DB fails
  `ci:local`'s second run (#18) — a FRESH container.
- **TR13 — Row `3-17` edits the same table and guard (G14).** Both stories `CREATE OR REPLACE` `claim_membership_checks_reject_mutation()`
  with a full column chain; the one that lands second must start from the other's function body, or the first one's columns fall out of
  the guard with every test green (TR2's hole, through a merge). Its third fee-date source and nullable `fee_receipt_id` also meet DL1's
  vocabulary, DL5 (b)'s "held" and DL10's list. Re-read `3-17` at Task 0.1; if it lands first, rebase and rebuild the guard from ITS body.
- **TR14 — One person can strand a claim.** With the actor check (DL6), a bank date recorded by the ONLY person who could re-check (a
  Super Admin with ⛔ finance officer, a dual-role user) leaves the claim answering `bank_date_recorded`, and the deny guard refuses
  `fee_paid_after_death` while it holds — ⛔ denial, ⛔ approval. A correction by the same person does ⛔ help. AC5 asserts the wait; DL13 (c)
  holds go-live on two people.

### What this story does ⛔ do

⛔ Change the receipt, the lock-in event, the door, any lifecycle state, either deny vocabulary or the appeal; ⛔ new family-facing or
helpline words; ⛔ store or upload a bank statement; ⛔ show the finance officer a name or the date of death; ⛔ let the District Admin or
the final voter type a bank date; ⛔ deny, approve or close automatically; ⛔ require a bank look before a fee refusal; ⛔ reopen a refused
claim outside the appeal.

### Previous story intelligence (6.39 — landed `e244a907`)

- The reviews found: a lost update (fixed by `expected_live_check_id` — DL6 copies it for the bank date); a second hand-written definition
  of the blocking outcomes in admin (fixed by the server's `fee_blocks_approval` — keep the page and the control on server flags); copy that
  went out of step with an amended ruling (`-476`) — DL11's words are approved at 0.2 and recorded in 0.4, ⛔ edited later without an entry.
- The 23505 backstop on a one-live index is ⛔ constructible (every inserter takes a KEY SHARE on the claim row through the FK) — map it
  anyway, ⛔ write a test that claims to reach it.
- `ci:local` on a fresh container was twice blocked by the auto-mode classifier (`db:migrate`): ask BigDev for a permission rule FIRST
  ([[project_admin_browser_pass_launcher]]).
- The browser pass needs a throwaway DB migrated from scratch and the cookie helper (⛔ passkey sign-in); a step-up's code comes from the
  admin stub's dev reveal (G9). Record both as limits in the roster line.

### Git intelligence

At authoring the last five commits on `main` were 6.39's landing records (`90535934`, `e244a907`, `685a09b8`, `3c45bc98`) and its
round-2 fixes (`5df89866`): governance (decision entries) ALONE first, then code, then records — the order this story follows. At
`6536b8bb` (2026-11-27) the last five are Story 3.13a's landing records (`6536b8bb`, `af939827`, `e9ad7617`, `396b8c05`, `ff63f435`) —
landed by fast-forward after a rebase with a SHA map, the device pass on an emulator recorded as a limit, ⛔ as met. Between the two,
6.22b, 12.5, 12.5b, 3.13, 3.13a and 3.15 landed; of the files this story builds on only the gate leaf's doc-comment and one admin label
moved.

### Latest technical information

⛔ New library or version. The stack is the repo's (Fastify, drizzle, Zod, TanStack Query, vitest); read versions from the lockfile. One
domain fact used: a UPI credit's narration on a payee's statement carries the payer's 12-digit reference (`UPI/CR/<utr>/…` — the
`bank-parsers` normaliser's assumption), un-attested on a real Trust export (TR10).

### Project Structure Notes

- Domain: `claim/fee-bank-date-persist.ts` (writer), `claim/fee-bank-date-read.ts` (reads), `claim/fee-death-date.ts` (DL2),
  `claim/membership-check-approval.ts` (DL7), `claim/membership-check-persist.ts` + `claim/membership-check-read.ts` (DL4, DL6),
  `claim/errors.ts`, `claim/events.ts`, `claim/state.ts`, `claim/index.ts`, `schema/claim_fee_bank_dates.ts` +
  `schema/claim_membership_checks.ts` + barrel, `policies/claim-fee-bank-date-rls.ts` + `policies/index.ts`, `ids/index.ts`,
  `encryption/field-classes.ts`, `member/anonymize.ts`, `rbac/permissions.ts` + `rbac/roles.ts`; one migration (`0219` at 2026-11-27 — READ LIVE).
- Events: `packages/events/src/registry.ts`.
- API: `apps/api/src/modules/claims/claims.fee-bank-date.{handlers,routes}.ts`, `claims/index.ts`, `claims.membership-check.handlers.ts`,
  `membership-check-required-message.ts`, `audit/audit-sink.ts`, `context.ts`; `scripts/claim-adjudication-human-actor-invariant/check.ts`.
- Contracts: `packages/contracts/src/claims/fee-bank-date.ts` + `claims/index.ts`, `claims/membership-check.ts` (preview + POST + the wait
  reason mirror); tests `claims-fee-bank-date.test.ts`, `claims-membership-check.test.ts`, `claims-verifier-console.test.ts`.
- Admin: `apps/admin/src/modules/fee-bank-dates/` (page, form, `i18n-en.ts`), `router.tsx`, `api/client.ts`, `api/hooks.ts`,
  `modules/claim-verification/MembershipCheckControl.tsx`, `claim-verification/nominee-errors.ts`, `claim-verification/i18n-en.ts`,
  `routes/VerifierConsoleRoute.tsx`, `routes/FeeBankDatesRoute.tsx` (NEW), `routes/RootLayout.tsx` (the nav link).
- Records: the roster row (DL13), Row 46's dated line, `deferred-work.md`, `sprint-status.yaml`, `.decision-log.md`, `epics.md` (6.39a).

### References

- `.decision-log.md` — `2026-11-21-473` (Q1 B, Q2 B, "does NOT cover", told lines), `-474` (item 1, item 5, Policy meaning), `-475`
  (the stored UTR), `-476`, `-472` (N3, DL3, DL7, DL9, DL12).
- `_bmad-output/implementation-artifacts/6-39-identity-check-before-a-drive-for-an-unchecked-identity.md` (v1.13 — G1–G17, DL1–DL16, both
  review rounds).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-31-6-39-fee-date-and-family-told.md` (Q2 as put; *"Still uncertain"*).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-21-6-39a-bank-date-edges.md` (this story's note — Q1–Q4 = PQ1–PQ4;
  WRITTEN, ⛔ sent).
- `_bmad-output/planning-artifacts/epics.md` — Story 6.39a, Story 3.17 (G14); `docs/launch-gate-inventory/inventory-roster.md` — Row 46;
  Row 47's notes (the admin step-up dependency).
- `.decision-log.md` `2026-11-21-482` item 5; `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-21-registration-fee-optional.md`
  (read with this story's note); `trustee-panel-sitting-2026-11-26-agenda.md` item 1 (branch `governance/panel-sitting-2026-11-26`).
- `_bmad-output/implementation-artifacts/deferred-work.md` — "Deferred from: code review of story 6-39 … round 2"; "Story 6.39 Task 0.5";
  the deferral R4 item (*"ADMIN step-up OTP-over-SMS"*).
- PRD (`_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md`) — FR-1 (receipts retained), §4.14.1 (trust-account banking),
  OQ-3, OQ-15, OQ-16.
- Niyamavali §2.1, §2.2 (git-ignored copy, main checkout).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) — `bmad-dev-story 6.39a on worktree`, 2026-11-27.

### Debug Log References

- **Task 0.2 answers (2026-11-27, BigDev, in session, through three question dialogs — each answer the option marked recommended):**
  DL8 *"Finance officer"*; DL9 *"Yes, require it"* (the step-up, with its go-live cost); DL6 *"Yes, check the person"* (the same-person
  refusal); DL6 *"The earlier of the two"*; DL5 *"Check first, then bank"*; DL5 / PQ1 *"No, only in review"* (⛔ record during an
  appeal); DL11 *"Amend the note"* (the record-first wording, amending `-474` item 3); DL3 *"Trim, ignore letter case"*; DL11's words
  *"Approve as written"* (the finance page, the console's four new lines and the gate line, as listed in DL11 / DL7); DL1, DL2, DL4,
  DL7, DL10, DL12, DL13, DL14 *"Accept all as written"*. ⛔ Panel question was asked or answered (PQ1–PQ4 stay with the note).
- **Dev, 2026-11-27 (the build):** the story's own container `twt-6-39a-pg` (postgres 16.14, `127.0.0.1:5461`, DB `twt_dev`), fresh,
  migrated through `0219`. ⚠ An incident, fixed: a first draft of the translator spec's helper ran `ALTER TABLE claim_membership_checks
  DISABLE TRIGGER …` on the pool while its own scope transaction held a lock on the table — a self-wait; the four tests hung and the
  `ENABLE` never ran, so the guard was OFF on that container until re-enabled by hand (all four triggers then `O`). The helper was
  rewritten as a plain owner INSERT (⛔ DDL on a shared table — [[project_test_only_ddl_use_pg_temp_clone]]) and the container recreated
  fresh before `ci:local`. ⛔ Shared DB was touched.
- **`ci:local` (2026-11-27, fresh container, `DATABASE_URL` = the story's port):** 40 of 41 jobs green, `integration-tests` included;
  `test (unit)` red on ONE test — `apps/admin/tests/ground-inspection-discrepancy.test.tsx` (Story 6.27d) timed out at 5076 ms under
  the run's load. The story touches ⛔ file of it; it passed 3 / 3 alone and in the whole admin suite (116 files / 2517 tests) right
  after — the contention class ([[project_ci_local_concurrency_oversubscription]]). Recorded as red, ⛔ re-labelled green.
- **The real-browser pass (2026-11-27, the code-review fix pass — roster Row 58 (d)):** the agent's Chrome (macOS, the probe on
  `127.0.0.1` loaded) against the admin Vite dev server (`localhost:3001`) and the API on the story container `twt-6-39a-pg`, recreated
  and migrated from scratch through `0219` as edited. Sign-in by the cookie helper ([[project_admin_browser_pass_launcher]] — fake
  WebAuthn, ⛔ passkey); the step-up's code read from the test delivery. An uncommitted launcher seeded ONE Pariwar with five claims held on
  a fee recorded 10 May (death 1 May); two bank dates were recorded through the real route before the pass (12 May — not earlier; 25 April).
  Observed, each in the page's DOM: **(1)** an empty press ⇒ the reference prompt, an alert, `aria-invalid` + `aria-describedby` on its
  field, the focus kept on the button; an edit clears it. **(2)** a valid record ⇒ the step-up HOLD: the fields locked (`:disabled`), every
  other row's "open" disabled; the code sent, typed, verified ⇒ the SAME body re-sent ⇒ *"reference ending 2377 — Recorded. The District
  Admin must now check the claim again."* as a status, FOCUSED, the form closed, every row unlocked, the row's recorded line naming
  *"Meera $& Rao (Finance)"* as written. **(3)** a reference one digit off ⇒ DL11's `reference_mismatch` line (an alert, ⛔ focused), the
  form open with the typed value — ⚠ the focus on `<body>` (the disabled fieldset): FIXED (F4) and re-run — the focus back on the submit
  button; an edit retired the line. **(4)** the lost write: the bank-date POST forwarded (the write LANDED) and its answer replaced by a
  502 ⇒ `-512` D2's line word for word (an alert), the list reloaded (GET 200) and the row now showing the bank date the write recorded.
  **(5)** the console as a District Admin: the 12 May claim ⇒ `-512` D1's line word for word (`data-source="recorded"`) and TODAY's note
  (⛔ "ask the finance officer"); the 25 April claim ⇒ DL11's bank line (`data-source="bank"`), ⛔ blocking note, the gate's DL7 line *"The
  finance officer recorded the bank's date … — check again."*; the re-check recorded ⇒ *"The membership check has passed."*, and the
  finance officer's page then lists that claim in the second section, the other four held. **(6)** the sweep: the API's log stream (125
  lines) and every bank-date / check audit line carry ⛔ planted note, ⛔ typed reference, ⛔ display name, ⛔ bank date — codes and ids only.
  ⚠ NOT observed in the browser: a reload DURING a held write (the tool cannot hide a tab — F3's freeze is proved by its component leg);
  the 401 path (component leg). The launcher and the dev servers removed afterwards.
  - **Which tree (added in round 2 — the Acceptance Auditor's question):** the pass ran on the working tree with F1–F3 and F5–F10
    ALREADY applied (Vite served the tree; each leg reloaded the page through the cookie helper); F4 was found by leg (3), fixed, and leg
    (3) re-run. Round 2's G1–G4 changed what legs (2) and (4) show, so those two were RE-RUN on the round-2 tree (below).
  - **Round 2 re-run (2026-11-27, the G-fixes in the tree — a fresh launcher, two claims):** **(2′)** a press on an un-stepped-up
    officer ⇒ the hold, and the focus INSIDE the panel on *"Send the code"* (it was `<body>`); Enter on it sent the code; verified ⇒ the
    SAME body re-sent ⇒ *"reference ending 1224 — Recorded. …"*, focused, the form closed. **(4′)** the lost write (forwarded, answered
    502) ⇒ `-512` D2's line (an alert) FOCUSED, the form CLOSED (the typed note gone from the page), the list reloaded with the record
    the write made — and the database holds exactly ONE record for that claim (one live). The sweep again clean (43 log lines; ⛔ note,
    reference, bank date, name). The launcher and the dev servers removed afterwards.
- **`ci:local` (2026-11-27, the code-review fix pass — the story container recreated from scratch, migrated through `0219` as edited;
  `DATABASE_URL` = its port):** 41 of 41 jobs green, `integration-tests` included (11m30s for that job).
- **`ci:local` (2026-11-27, fix-diff review round 2 — the container recreated from scratch again):** 41 of 41 jobs green,
  `integration-tests` included; `fee-bank-dates.test.tsx` 33.
- **`ci:local` (2026-11-27, fix-diff review round 3 — the container recreated from scratch again):** 41 of 41 jobs green,
  `integration-tests` included; `fee-bank-dates.test.tsx` 35 (three consecutive runs green).
- **`ci:local` (2026-11-27, fix-diff review round 4 — the container recreated from scratch again):** 41 of 41 jobs green,
  `integration-tests` included; `fee-bank-dates.test.tsx` 36 (three consecutive runs green).
- **Whole suites, live, on the story DB:** domain 564 files / 9040 tests; API 254 / 255 files (3491 tests) — the one red was
  `medical-disclose.spec.ts`'s random-base64 `ckd` collision (known failure #13), 21 / 21 on re-run; admin 116 / 2517; contracts 1836.

### Completion Notes List

- 2026-11-21 — story created by `bmad-create-story 6.39a` (ledger `2026-11-21u`): ultimate context engine analysis completed —
  comprehensive developer guide created. DL1–DL14 PROPOSED, PQ1–PQ3 PROPOSED (one non-blocking note at Task 0.3); ⛔ code; ⛔ decision
  entry yet.
- 2026-11-21 — validated (`bmad-create-story validate 6.39a`, BigDev: "all"; ledger `2026-11-21ar`, written `w` and relabelled
  2026-11-27), re-traced at `90535934`: fifteen
  findings applied (Change Log v1.1). Three build decisions gained a second option for BigDev at Task 0.2 — DL9 (the step-up and its
  production cost), DL6 / N7 (the same-person check) and DL11 (the amended console note). One inline pass; ⛔ fresh-context verifier
  round was run. ⛔ Code; ⛔ decision entry yet.
- 2026-11-21 — the Panel note DRAFTED at BigDev's ask, before Task 0.2 (ledger `2026-11-21z`):
  `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-21-6-39a-bank-date-edges.md` — WRITTEN, ⛔ sent. PQ4 added (must a
  second person confirm the bank's date — it was a told line; built A). The note describes the PROPOSED build: Task 0.3 says what is
  left before it goes out.
- 2026-11-27 — validated AGAIN (`bmad-create-story validate 6.39a`, BigDev: "all"; ledger `2026-11-27a`) after REBASING onto `origin/main`
  `6536b8bb` (253 commits; backup `backup/6-39a-pre-rebase-2026-11-27`; one ledger conflict, branch lines on top; `21w` relabelled
  `21ar`). Two fresh-context verifiers (the code claims; the design), every top finding spot-checked in the code before applying: eighteen
  findings applied (Change Log v1.3). Three build decisions gained a second option for BigDev at Task 0.2 (DL5 ×2, DL6); DL10's two sections are put to him as an item. Neither
  Panel note is sent. ⛔ Code; ⛔ decision entry yet.
- 2026-11-27 — Task 0.2 DONE (ledger `2026-11-27b`): DL1–DL14 put to BigDev in three question dialogs; every answer the proposed one
  (Debug Log References). ⛔ AC or Task changed meaning. Owed: the words for a missing / malformed field and three refusal codes (Task 0.2's
  note), then Task 0.3 (the note's re-read, before the next sitting) and Task 0.4 (the decision entry, `-510`, READ LIVE). ⛔ Code.
- 2026-11-27 — Task 0.3 DONE (ledger `2026-11-27c`): the Panel note brought into line with the Task 0.2 answers, its
  *"Before sending"* paragraph removed, told line 7 (TL4) added, E4 re-run at `6536b8bb`; questions unchanged; WRITTEN, ⛔ sent.
- 2026-11-27 — Task 0.4 DONE (ledger `2026-11-27d`): decision `2026-11-27-510` (author-commit) committed ALONE as `22770eb0`; the
  remaining staff words (form prompts, three refusal lines, the 400 / 401 lines) approved and added to DL11. Next: Task 0.5 (records). ⛔ Code.
- 2026-11-27 — Task 0.5 DONE (ledger `2026-11-27e`): roster Row 58 + Row 46's dated line; `deferred-work.md` PQ1–PQ4 open and the
  corrected-UTR item's dated note; row and story `ready-for-dev → in-progress`. Task 0 complete; ⛔ code yet.
- 2026-11-27 — the Panel RULED the note (ledger `2026-11-27f`): `2026-11-27-511` (Trustee-ratified, DR + KB — *"Q1 B, Q2 A, Q3 A, Q4 A"*),
  committed ALONE as `50e28068`; every answer as built ⇒ ⛔ AC or Task changes. The note's ruling block filled; `deferred-work.md` PQ1–PQ4
  DISCHARGED as questions; roster Row 58 (b) dated (MET with (a)). ⛔ Code.
- 2026-11-27 — DEV DONE (`bmad-dev-story 6.39a on worktree`; ledger `2026-11-27g`). Tasks 0.1 and 1–6, commits `5ac6d176` (Task 1),
  `5543b013` (Tasks 2–3), `41b90fff` (Task 4), `a67b0d23` (Task 5), then the records. What was built, AC by AC:
  - **AC1 / AC11** — migration `0219`: `claim_fee_bank_dates` (one live per claim, the guard leaving the note out, the one-way trigger,
    RLS with an UPDATE leg, grants at birth) and `claim_membership_checks.fee_date_source` (DEFAULT `'recorded'`) + `fee_bank_date_id`
    (the one-way `'bank'` ⇒ an id CHECK); the check table's guard REPLACED with both columns (TR2 — proved as the OWNER), a comment naming
    row `3-17` (TR13). The erasure scrub of the note (every row — the note is required): `rtbf-anonymize.test.ts` 36 → 37 statements,
    33 → 34 tables, 32 → 33 without claims; a live leg as `twt_app`.
  - **AC2** — `compareFeeCalendarDateWithDeathDate`; the instant entry delegates (6.39's legs untouched).
  - **AC3 / AC4 / AC8 / AC9** — the finance officer's act (writer, routes, step-up, list): every handler refusal with ⛔ row and its
    `_rejected` line; ⛔ line for a 400 / step-up refusal; PQ4 and PQ2 each named by one test; the typed reference in ⛔ audit, body or log
    line (a CAPTURED log stream with a positive control — the request URL); the source pin that the writer's code mentions the typed
    reference exactly twice (the input and the ONE compare); the key `claim.record_fee_bank_date` (catalog v67 / 99), N7 pinned from the
    bundles; positive legs for a finance officer and a Super Admin; 403 for four roles; the human-actor gate at 21.
  - **AC5 / AC6 / AC7 / AC10** — the gate's `bank_date_recorded` (still THREE counted reads — the live record rides the check's
    statement, `VERIFIER_CONSOLE_MAX_READS` stays 36); the check uses the earlier of the two dates; `bank_date_changed` (handler and,
    by a direct writer call, the writer) and `same_person` (a Super Admin; one user with both grants; ids compared normalised); PQ3 and
    PQ1 each named by one test; the one-person wait asserted; the four translators; the freeze-commit skip; the family's line stays
    `false`; the 6.39a fence block with planted controls; runtime imports from three entry points clean.
  - **AC12** — the page, its route, nav link, the console's new lines and words (`fee-bank-dates.test.tsx`, 15). ⚠ The real-browser
    pass is RECORDED UN-ATTESTED: the agent's Chrome was ⛔ connected (`list_connected_browsers` empty) — roster Row 58 (d) stays open.
    ⭐ **2026-11-27, the code-review fix pass:** the real-browser pass RAN (Debug Log, "The real-browser pass") — roster Row 58 (d) MET;
    `fee-bank-dates.test.tsx` now 28.
  - **AC13** — 6.39's specs edited by AC5's kinds (i)–(v), and ONE further edit ⛔ in that list (stated, ⛔ hidden): three assertions in
    `apps/admin/tests/membership-check.test.tsx` pinned TODAY's console note under a blocking RECORDED date — the case `-510` DL11 amended —
    and now pin the amended note, the same exact-text check. `ci:local` 40 / 41 (above — the red is a contention timeout in a 6.27d file,
    green alone). ⚠ **Corrected 2026-11-27 (code review C3):** "ONE further edit" UNDERCOUNTED — beyond AC5's kinds there are also, all
    ADDITIVE (⛔ an assertion loosened or removed): the lockstep line and ONE new `it` in `packages/contracts/tests/claims-membership-check.test.ts`,
    and the three wait-reason map pins (`bank_date_recorded`) in `apps/admin/tests/membership-check.test.tsx`. The review's own fixes
    add further additive legs to 6.39's specs (the review findings and their fix commit name them).
  - **Not built / not claimed:** TR10 — "matches in practice" is ⛔ proven (the first real use attests it). DL5 — once a claim is
    `state_trustee_approved` a wrong bank date can ⛔ longer be corrected here (asserted; roster Row 58 note 2). The corrected-UTR item
    stays "Not addressed by 6.39a" (its dated note of Task 0.5 stands). A handful of the page's control labels are ⛔ in DL11's approved
    list — listed in `deferred-work.md` for BigDev. Nothing is pushed.
  - **TR8 — the no-posting behaviour, recorded 2026-11-27 (code review, second pass, K11; it was not recorded at the dev's Task 6):** the record route gates at the
    DISTRICT dimension against the deceased member's server-derived posting district (`resolveNomineeNameCheckDistrict`, 6.18's). A claim whose
    member has NO posting — and a claim that does not exist in the Pariwar — stashes `null`; `scopeContains` fails an unresolved target
    closed before it reads the grant (the doc block in `claims.nominee-name-check.routes.ts`, verified there against the predicate), so the
    answer is **403 for everyone — `pariwar_admin` and `super_admin` included — the same status and code as an unauthorized role**: asserted for
    an unknown claim and a finance officer by K9's leg (d) (`fee-bank-date.spec.ts`), so the route does not confirm which claims exist. It
    matches 6.39's. Two consequences: (i) `fee_bank_date.not_found` (DL11's *"This claim could not be found. Reload the page."*) is unreachable
    over HTTP — the permission hook answers 403 first; the writer's own `not_found` is the domain's defence (K7's leg); (ii) a no-posting claim
    cannot be recorded by anyone through this route — the 6.18 hole itself is already deferred (`deferred-work.md`), and the finance list
    reads rows from live checks (as read by the Auditor, not re-traced here) so such a claim is not expected on it.
  ⚠ **Annotated 2026-11-27 (review of the L-pass delta, M5 f):** the sentence above — "asserted for an unknown claim and a finance officer by K9's leg (d)" — was re-worded by the fix pass:
    K9's leg (d) is now the officer granted for ANOTHER district (the same 403 and code for an existing and an unknown claim) and leg (e) the officer granted for the whole Pariwar
    (the same 403); the "`pariwar_admin` and `super_admin` included" half is read from 6.18's doc block and is not run by any leg of this story (see the dispositions of the fix-diff review, L8).
  ⚠ **Re-annotated 2026-11-27 (review of the M-pass delta, N10 c / N7):** the pointer above should read M5(e), not L8; and the `super_admin` half is no longer only read — K9's leg (e2) RUNS it: a Super Admin on an unknown claim gets the same 403
    and code. `pariwar_admin` holds no key for this route at all (AC8 refuses it on an existing claim), so the district question never reaches it.

### File List

- `_bmad-output/implementation-artifacts/6-39a-bank-date-for-a-fee-recorded-after-the-death.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/admin/src/api/client.ts`
- `apps/admin/src/api/hooks.ts`
- `apps/admin/src/modules/claim-verification/MembershipCheckControl.tsx`
- `apps/admin/src/modules/claim-verification/i18n-en.ts`
- `apps/admin/src/modules/fee-bank-dates/FeeBankDatesPage.tsx` (new)
- `apps/admin/src/modules/fee-bank-dates/errors.ts` (new)
- `apps/admin/src/modules/fee-bank-dates/i18n-en.ts` (new)
- `apps/admin/src/modules/fee-bank-dates/index.ts` (new)
- `apps/admin/src/router.tsx`
- `apps/admin/src/routes/FeeBankDatesRoute.tsx` (new)
- `apps/admin/src/routes/RootLayout.tsx`
- `apps/admin/src/routes/VerifierConsoleRoute.tsx`
- `apps/admin/tests/fee-bank-dates.test.tsx` (new)
- `apps/admin/tests/membership-check.test.tsx`
- `apps/api/src/audit/audit-sink.ts`
- `apps/api/src/context.ts`
- `apps/api/src/modules/claims/claims.fee-bank-date.handlers.ts` (new)
- `apps/api/src/modules/claims/claims.fee-bank-date.routes.ts` (new)
- `apps/api/src/modules/claims/claims.membership-check.handlers.ts`
- `apps/api/src/modules/claims/fee-bank-date-crypto.ts` (new)
- `apps/api/src/modules/claims/index.ts`
- `apps/api/src/modules/claims/membership-check-required-message.ts`
- `apps/api/tests/integration/claims/_fee-bank-date-world.ts` (new)
- `apps/api/tests/integration/claims/fee-bank-date-check.spec.ts` (new)
- `apps/api/tests/integration/claims/fee-bank-date.spec.ts` (new)
- `apps/api/tests/integration/claims/membership-check-bank-date-routes.spec.ts` (new)
- `apps/api/tests/integration/claims/membership-check.spec.ts`
- `apps/jobs/tests/claim-suspicion-notice-no-decision.test.ts` (edited — code review C1: the "no-decision" table lists `claim_fee_bank_dates`; omitted from this list until the second review pass, K11)
- `apps/jobs/tests/claim-suspicion-staff-email-no-decision.test.ts` (edited — as above)
- `docs/launch-gate-inventory/inventory-roster.md`
- `packages/contracts/src/claims/fee-bank-date.ts` (new)
- `packages/contracts/src/claims/index.ts`
- `packages/contracts/src/claims/membership-check.ts`
- `packages/contracts/tests/claims-fee-bank-date.test.ts` (new)
- `packages/contracts/tests/claims-membership-check.test.ts`
- `packages/contracts/tests/claims-verifier-console.test.ts`
- `packages/domain/migrations/0219_claim-fee-bank-dates.sql` (new)
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/claim/errors.ts`
- `packages/domain/src/claim/events.ts`
- `packages/domain/src/claim/fee-bank-date-persist.ts` (new)
- `packages/domain/src/claim/fee-bank-date-read.ts` (new)
- `packages/domain/src/claim/fee-death-date.ts`
- `packages/domain/src/claim/index.ts`
- `packages/domain/src/claim/membership-check-approval.ts`
- `packages/domain/src/claim/membership-check-persist.ts`
- `packages/domain/src/claim/membership-check-read.ts`
- `packages/domain/src/claim/state.ts`
- `packages/domain/src/encryption/field-classes.ts`
- `packages/domain/src/encryption/index.ts`
- `packages/domain/src/ids/index.ts`
- `packages/domain/src/member/anonymize.ts`
- `packages/domain/src/policies/claim-fee-bank-date-rls.ts` (new)
- `packages/domain/src/policies/index.ts`
- `packages/domain/src/rbac/permissions.ts`
- `packages/domain/src/rbac/roles.ts`
- `packages/domain/src/schema/claim_fee_bank_dates.ts` (new)
- `packages/domain/src/schema/claim_membership_checks.ts`
- `packages/domain/src/schema/index.ts`
- `packages/domain/tests/claim/dpdpa-consent-events.test.ts`
- `packages/domain/tests/claim/fee-bank-date-choice.test.ts` (new)
- `packages/domain/tests/claim/fee-bank-date-one-live-violation.test.ts` (new — code review, second pass, K8)
- `packages/domain/tests/claim/fee-death-date.test.ts`
- `packages/domain/tests/claim/membership-check-bank-date-gate.test.ts` (new)
- `packages/domain/tests/claim/nominee-name-check-events.test.ts`
- `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`
- `packages/domain/tests/integration/claim/fee-bank-date-check.spec.ts` (new)
- `packages/domain/tests/integration/claim/fee-bank-date-rtbf.spec.ts` (new)
- `packages/domain/tests/integration/claim/membership-check-approval.spec.ts`
- `packages/domain/tests/integration/claim/membership-check-concurrency.spec.ts`
- `packages/domain/tests/integration/rls/claim-fee-bank-date-policy-regression.spec.ts` (new)
- `packages/domain/tests/integration/claim/fee-bank-date-concurrency.spec.ts` (new — code review)
- `packages/domain/tests/member/rtbf-anonymize.test.ts`
- `packages/domain/tests/rbac/permissions.test.ts`
- `packages/domain/tests/rbac/roles.test.ts`
- `packages/events/src/registry.ts`
- `scripts/claim-adjudication-human-actor-invariant/check.ts`

## Change Log

| Date | Version | Description |
|---|---|---|
| 2026-11-21 | v1.0 | Created (`bmad-create-story 6.39a`) at `90535934`, in its own worktree. |
| 2026-11-21 | v1.1 | Validated (`bmad-create-story validate 6.39a`, BigDev: "all"; re-traced at `90535934`, `origin/main` unmoved). **Critical:** DL9's step-up cannot be completed in production (the admin step-up delivery is a stub — G9) ⇒ its cost stated, a no-step-up option, DL13 leg (e); N7 / TL1 promised two PEOPLE while the build separated ROLES (one user may hold several grants) ⇒ a same-person refusal in the check writer (DL6, AC5), TL1 reworded; AC5 / AC13's "no assertion changed" was unsatisfiable against DL6's required token and DL12's audit field ⇒ the two allowed kinds of edit named. **Added:** the three admin wait-reason maps and the contracts test's lists (G6, DL7, AC12); the console's read count resolved (G11, DL7 — stays 36); the reference compared trimmed and without regard to letter case (DL3, DL10, AC4); the list capped, joined by the live check's payment, ⛔ fee outcome on its wire (DL10, AC3); the nav link, the route component and the shared `StepUpPanel` (DL10, AC12); the console note amended for the recorded-date case, with a no-amendment option (DL11, Task 0.4); the writer's computed-against token (DL6). **Small:** AC5's defence leg says what the gate answers; valid bodies on the 401 / 403 / step-up legs (TR9); the Niyamavali cited by section, ⛔ quoted; the NUMBERS block re-read (three sibling stories want the same numbers). |
| 2026-11-21 | v1.2 | The Panel note drafted at BigDev's ask, before Task 0.2 (WRITTEN, ⛔ sent; E4 run). PQ4 added — must a second person confirm the bank's date (`-473`: *"⛔ asked"*); it was told in TL1 / TL2, and is now asked without blocking, built A; one test names it (AC3); DL13 (b), Tasks 0.3–0.5 and the header's §0 line follow. |
| 2026-11-27 | v1.3 | Validated again (`bmad-create-story validate 6.39a`, BigDev: "all") after REBASING onto `origin/main` `6536b8bb` (253 commits); `baseline_commit` re-pinned to it; ledger `2026-11-21w` relabelled `21ar` (3.13 landed holding `w`). **Critical:** the numbers re-read (catalog v67 / 99 keys — 3.13 took v66 with two keys; migration `0219`; decision `-510`; roster Row 58; 41 CI jobs — NUMBERS, DL1, DL8, DL13, AC8, AC13, Task 0.4); row `3-17` (`-482` item 5) will make `fee_receipt_id` nullable and add a third fee-date source on the same table and guard — G14, TR13, DL1's extensible vocabulary and one-way coherence CHECK, Task 0.1; the amended console note sent the District Admin to the finance officer before a check was stored, when the finance officer can act only on a stored one — DL5's only path stated, DL11 reworded record-first (approval at 0.2), AC3 / AC12 legs, the Policy-meaning note's list line; AC5 / AC13's "exactly two kinds of edit" could not be met — kinds (i)–(v) named file by file; TR5's leak path was wrong (the error handler logs no body; drizzle's query error carries the parameters into the 500 log) — DL3 compares in TypeScript, the insert's errors re-thrown parameter-free; AC4 / AC9's "no log line" could not fail (test servers log nothing) — a captured `logStream` with a positive control. **Added:** a direct-writer leg for the lock-protected token compare (AC5, TR7); PQ1 B's cost — the appeal is decided before any bank date can be recorded, and a failed look leaves the family with no appeal — and an option to record during the appeal (DL5); the earlier of the two dates, so a later bank date cannot hold a passing claim, with the always-replaces option (DL6, AC1, AC5), and corrections stop at `state_trustee_approved` (DL5); the finance list in two sections so a resolved claim never crowds out a held one (DL10, DL11, AC3, AC12); `rtbf-anonymize.test.ts`' three counts (G11, AC11, Task 1.2); the next sitting's agenda would send the note before Task 0.2 is answered (Task 0.3); N7's role pin widened to `claim.approve` and `claim.r9_vote`, TL1 names the first approver; one person alone strands a claim (N7, TR14, AC5, DL13 (c)). **Small:** DL12 audits only the refusals the handler raises; the microcopy gate matches whole words (G8); TR7's heading; `clampLimit`'s wording; AC5's file list separates specs from source; `-482` in the rulings table; Git intelligence and References brought to `6536b8bb`. A fresh-context review of this pass's OWN diff found eight defects, all fixed before commit (DL6's writer token kept the old meaning; DL1's CHECK still read two-way; DL10's flag; Task 4.2's "two kinds"; kind (iii) widened to the contracts / admin preview fixtures; a third erasure count; Task 0.3 brings the note's told lines 1 and 4 into line; N7's wording, the second-section heading, two counts). |
| 2026-11-27 | v1.4 | Task 0.2 answered by BigDev — every DL as proposed (DL8 the finance officer; DL9 the step-up kept; DL6 the same-person refusal and the earlier of the two dates; DL5 check first, ⛔ record during an appeal; DL11 the amended note and every listed line approved word for word; DL3 trim and ignore letter case; the rest accepted as written). The section and each decision marked ANSWERED, each alternative kept as *"Not chosen at 0.2"*; the answers recorded under Debug Log References; Task 0.2 ticked with the words still owed. |
| 2026-11-27 | v1.5 | Task 0.3 done: the Panel note re-read against the Task 0.2 answers — status line, §0, Q1 A's cost, told lines 1 and 4 corrected (the first approver; record the check, then ask), told line 7 added (= new TL4, DL6's earlier date), the "Before sending" paragraph removed, E2 / E3 re-stated and E4 re-run at `6536b8bb` (six commands added); the questions and options unchanged; WRITTEN, ⛔ sent. Task 0.3 ticked; the agenda's `06a80355` pointer flagged as stale. |
| 2026-11-27 | v1.6 | Task 0.4 done: decision `2026-11-27-510` (author-commit, BigDev) committed ALONE as `22770eb0`; DL11 gains the words approved with it (the form's five prompts; the not-found, no-joining-payment and no-display-name refusals; the 400 and 401 lines); Task 0.2's owed-words note marked approved; Task 0.4 ticked. |
| 2026-11-27 | v1.7 | Task 0.5 done: roster Row 58 `fee-bank-date-live` (legs (a)–(e), all open) and a dated line on Row 46; `deferred-work.md` — PQ1–PQ4 open with their triggers, the corrected-UTR item's dated *"Not addressed by 6.39a"* note, a dated line under 6.39's PQ1 (b); Status `ready-for-dev → in-progress`; Task 0 complete. |
| 2026-11-27 | v1.8 | The Panel ruled the note — `2026-11-27-511` (Trustee-ratified, DR + KB: *"Q1 B, Q2 A, Q3 A, Q4 A"*; the 27 November version, `f01b7c24`), every answer the built side: the Panel-questions heading and PQ1–PQ4 marked RULED (the questions kept as put); the Policy-meaning note gains the sentence's appeal clause as recorded in `-511`; ⛔ AC, Task or DL change. |
| 2026-11-27 | v1.9 | Dev done (`bmad-dev-story 6.39a on worktree`; ledger `2026-11-27g`): Tasks 0.1 and 1–6 ticked; Agent Model, Debug Log (the container, the trigger incident, `ci:local` 40 / 41 with the one contention red), Completion Notes, File List; Status `in-progress → review`. The real-browser pass recorded un-attested; one edit to 6.39's specs beyond AC5's kinds stated, ⛔ hidden. |
| 2026-11-27 | v1.10 | Code review fix pass (ledger `2026-11-27h`): D1 / D2 resolved by `2026-11-27-512`; the 33 patch items applied and ticked; the PATCH diff reviewed by three fresh-context layers and the real-browser pass — ten more fixes F1–F10 and five LOW defers (the Review Findings' fix-diff subsection, `deferred-work.md`); Completion Notes AC13 corrected (the undercount) and AC12 dated (the pass RAN — roster Row 58 (d) MET); Debug Log: the browser pass, `ci:local` 41 / 41 on a fresh container. Status stays `review` — `done` waits for the landing. |
| 2026-11-27 | v1.11 | Fix-diff review round 2 (BigDev: "run adversarial review on patches applied"; ledger `2026-11-27i`): the three layers on the committed fix `76afca9d` and the records `7bbb0e9b` — G1 (HIGH, pre-existing, widened by F1: the tokens read at press time — now the row as opened, and a reloading answer closes the form) and G2–G7 fixed, each leg mutation-checked; two defers (`-512` D2's widening as BigDev's scope question; the CSRF 403 line); records: which tree the browser pass ran on, the two changed legs RE-RUN in the browser, the overtaken label trigger annotated; `ci:local` 41 / 41. Status stays `review`. |
| 2026-11-27 | v1.12 | Fix-diff review round 3 (BigDev: "run round 3"; ledger `2026-11-27j`): the three layers on `abfd2592` + `0342a561` — ⛔ HIGH; H1 (a move / drop always says DL11's `stale` line), H2 (a token change under an open form is SAID and the new tokens taken — subsumes G1), H3 (the G1 leg's real sync point, a dropped-row leg, `focusManager` reset), H4 (records: round 2's subsection placed below round 1's dismissals; the mutation-check claim corrected by a dated line); three defers (the `stale` line's widening — BigDev's scope question; the cap; `no_fee_receipt`); `ci:local` 41 / 41. Status stays `review`. |
| 2026-11-27 | v1.13 | Fix-diff review round 4 (BigDev: "run round 4"; ledger `2026-11-27k`): the three layers on `e2eff5b8` + `4fea55f5` — all three found round 3's H2 (adopt the new tokens after a line the next keystroke retires) re-opened G1's harm: J1 closes the form instead, ⛔ token adopted client-side; J2 a `sending` guard for the step-up retry (its leg passes without it — stated); J3 records (H2's overstatement and supersession, a forward pointer from G1 — dated lines); two defers; `ci:local` 41 / 41. Status stays `review`. |
| 2026-11-27 | v1.14 | Code review, second pass (`bmad-code-review 6.39a on worktree`; ledger `2026-11-27l`): nine layers on the whole branch diff, chunked three ways — 1 decision, 13 patch, 16 defer (9 already recorded), 39 dismissed, nothing HIGH; K1 resolved by BigDev (option 3) as patch K1-P, OPEN — blocked on BigDev's words and a decision entry; K2–K14 applied, each leg mutation-checked (dispositions in the Review Findings; K6's writer half not applicable, K10's first version rewritten, K13 found not reachable today); TR8 and the File List corrected; seven new deferrals. Status `review → in-progress`. Nothing committed. |
| 2026-11-27 | v1.15 | Review of the second pass's fix diff (BigDev: "2", then "1" apply every patch; ledger `2026-11-27m`): three layers on the 1,033-line fix diff — 0 decision-needed, 10 patch, 1 defer, 8 dismissed, nothing HIGH; L1 (`aria-busy` on the group that holds the held step-up panel) and L2 (focus stolen when an upper row is opened from a lower one) were REAL regressions in the first fix diff; L1–L10 applied, each mutation-checked; corrections stated in the dispositions (K5's `aria-busy` scope and "NAMED", K7's "four", K13's "red with a hook mutant", L8's premise — there is no `/auth/scope` route). K1-P still open. Status stays `in-progress`. Nothing committed. |
| 2026-11-27 | v1.16 | Review of the L-pass delta (BigDev: "2", then "1" apply every patch; ledger `2026-11-27n`): three layers on the 382-line delta (rebuilt by applying the reviewed patch to a clean `HEAD` and diffing against today) — 0 decision-needed, 5 patch, 1 defer (a display name of only invisible characters), 9 dismissed, nothing above LOW. M1 (the visible-character rule is now an allow-list: an unknown or unassigned code point fails closed), M2 (the stateless leg could not fail — now it can), M3 (the migration pin strips comments), M4 (an events control), M5 (wording and record slips) applied, each mutation-checked; one process slip stated (the first M1 / M2 mutation run did not apply its mutants). K1-P still open. Status stays `in-progress`. Nothing committed. |
| 2026-11-27 | v1.17 | Review of the M-pass delta (BigDev: "2", then "1" apply every patch; ledger `2026-11-27o`): three layers on the 244-line delta — 0 decision-needed, 10 patch, 1 defer (the ground-inspection note rule is still a deny-list — another story's code), 5 dismissed; the Auditor: no AC, DL, decision or invariant violated, no new words. N1 (real notes in any script still pass — the symbol arm is now pinned), N2 (four more blank glyphs named), N3–N10 applied, each mutation-checked; N7's leg (e2) RUNS the Super Admin unknown-claim claim (403, same code) — 6.18's doc block is now attested; N12 (a latent race in a pre-existing admin leg, found by the full-suite run) fixed. Closure wording corrected: "nothing above LOW" was the Auditor's grading, not every layer's. K1-P still open. Status stays `in-progress`. Nothing committed. |
