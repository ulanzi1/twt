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

LETTERS: **G** = found facts (G1–G14); **DL** = build decisions (DL1–DL14 — PROPOSED, BigDev answers at Task 0.2); **PQ** = Panel
questions (PQ1–PQ4 — non-blocking) + **TL** = lines the note TELLS the Panel (TL1–TL3); **TR** = traps (TR1–TR14); **AC1–AC13**.
-->

# Story 6.39a: Staff May Use the Bank's Date for a Joining Fee Recorded After the Death — When the Trust's Own Bank Statement Shows It Arrived Before

Status: ready-for-dev

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
case (the bank's date, when the finance officer records it and it is the earlier — DL6, PROPOSED — replaces the recorded date), and it ADDS one conjunct (a check computed before a
bank date was recorded no longer counts — the claim waits for a re-check).

*In the member's terms (ONE sentence):* **"If you paid your joining fee before the day you died but the payment was recorded only on or
after that day, the Trust's finance officer can look at the Trust's own bank statement — and if it shows your payment, under the same
payment reference that was recorded for you, arrived on a day before the day of your death, your family's claim can go ahead; if the
reference recorded for you is not on the statement, or the money arrived only on the day of your death or later, it cannot."**

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

## Build decisions — PROPOSED (BigDev answers at Task 0.2)

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
  note says it in that order (DL11). *The other option, for BigDev at 0.2:* (b) also admits a claim with ⛔ live check whose COMPUTED
  outcome blocks (the writer computes it under the lock as the preview does — it then needs the date of death, a decrypt on the finance
  path, against N2 / TR3); cost: ⛔ second check for the District Admin, but the finance writer reads Tier-1.
  ⚠ **When a correction stops:** the record is accepted only in the window, so once the claim reaches `state_trustee_approved` (outside it)
  a wrong bank date can ⛔ longer be corrected here — say so in Completion Notes and the roster row's notes.
  *An option on PQ1, for BigDev at 0.2:* the appeal stages (`appeal_stage_1/2/3`) are OUTSIDE the window, so under PQ1 B the appeal panel
  reverses a `fee_paid_after_death` refusal with ⛔ bank evidence in the system, and if the bank then does not bear it out the final vote
  may refuse again — with the family's one appeal spent (`appeal-eligibility.ts` — one appeal journey per claim). Option: ALSO accept a
  record while the claim is in `appeal_stage_*` (record only — the re-check still waits for `reversed`, and (b) is read off the live check,
  which survives the denial). Cost: a staff write during an appeal the appeal stories do ⛔ expect; the appeal surfaces show ⛔ such record
  (a new read on them is out of scope). PROPOSED: ⛔ (as built — the window), with the cost in PQ1.
- **DL6 — The membership check uses it.** `postCheck` / `getPreview` read the claim's live bank-date record (`getLiveFeeBankDate`); when one
  exists AND names the joining receipt, the fee date is the EARLIER of its `bank_credit_date` and `istDateOf(paidAt)` (PROPOSED — see
  below), `fee_date_source` names which one it was (`'bank'` only when the bank date is strictly earlier), and `fee_bank_date_id` names the
  record CONSIDERED either way; with ⛔ live record it is `istDateOf(paidAt)`, `'recorded'` and `NULL`. The outcome comes from DL2's ONE rule.
  ⚠ The gate (DL7) compares the check's `fee_bank_date_id` with the live record, so the id is stored whenever a record was considered —
  even when the recorded date won — else such a claim answers `bank_date_recorded` for ever; hence DL1's one-way coherence CHECK
  (`'bank'` ⇒ an id), ⛔ `⇔`. *Why the earlier:* Q2 B lets staff use the bank's date when it *"shows the money arrived before the death"*;
  a bank date LATER than the recorded one (a statement's value date after a holiday) shows nothing of the kind, yet replacing the date with
  it could turn a passing claim into a held one — e.g. recorded D, death corrected on re-review to D+1, bank D+1 ⇒ `same_day`. The earlier
  date can only help. *The other option, for BigDev at 0.2:* the bank date ALWAYS replaces the recorded one (as first written; the
  coherence CHECK may then be `⇔`); cost: the case above, with ⛔ withdraw act to undo it (DL5). The POST body gains a REQUIRED nullable `expected_fee_bank_date_id` (the preview's
  record id). As with the review today, TWO compares: the handler compares the body's token with the record it read, and passes the
  writer `computedAgainstFeeBankDateId` (nullable — the live record it CONSIDERED, whichever date won; `null` only when ⛔ live record naming the joining receipt was considered); the
  writer re-asserts THAT under the lock against the claim's live record naming the joining receipt — either miss is
  `membership_check.bank_date_changed` (its own code and words, as `check_changed` is its own) — and stores `fee_date_source` +
  `fee_bank_date_id` from what it re-read, so the outcome and the record it names can ⛔ diverge. **The same person (N7):** when the
  check considers a live bank-date record (whichever date wins), the writer refuses `membership_check.same_person` if its actor recorded that live record (`isSameActorId`
  from the leaf `claim/approver-own-visit.ts`, against the record's `decided_by_actor_id`, under the lock) — whatever roles the actor
  holds, a Super Admin included; another person records the check. *The other option, for BigDev at 0.2:* ⛔ actor check — N7 and TL1
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
- **DL9 — Step-up (PROPOSED: keep it, with a go-live leg).** The POST requires a FRESH step-up after the permission hook
  (`requireStepUp`, a new context constant in the contract file that the route AND the admin caller import — G9): a staff power over a
  bright line (Q2 B's cost), and this act alone moves the fee date. ⚠ Its cost, stated: in production ⛔ admin step-up code is delivered
  (G9), so the bank date cannot be recorded there until deferral R4 is discharged — DL13 (e) holds go-live on it. *The other option, for
  BigDev at 0.2:* ⛔ step-up, as the membership check has none (the act is then usable at go-live without R4; the power rests on the
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
- **DL11 — Staff words (English only — BigDev approves word for word at 0.2).** The finance officer's page: title *"Joining fees to check
  against the bank statement"* · intro *"These claims are held because the joining fee was recorded on or after the date of death. If the
  Trust's bank statement shows the payment arrived earlier, record the date it arrived."* · row *"Recorded on {date} · ₹{amount} ·
  reference ending {last4}"* · fields *"Payment reference, as shown on the statement"* / *"Date the money arrived, as shown on the
  statement"* / *"Why the recorded date is wrong"* (*"The member recorded the payment late"* · *"The family recorded the payment after the
  death"* · *"Other"*) / *"Note — which statement, and what you saw"* · recorded *"Recorded. The District Admin must now check the claim
  again."* · refusals: mismatch *"This reference does not match the payment recorded for the member. Check that you have the right line
  on the statement."*; before joining *"That date is before the member joined. Check the date on the statement."*; future *"That date is
  in the future."*; not held *"This claim is not held on its joining fee."*; window *"A bank date can no longer be recorded on this
  claim."*; stale *"This claim changed since you opened it. It has been reloaded — check again."*; nav *"Joining fee bank dates"* · empty
  *"No claim is held on its joining fee."* · cut list *"Only the longest-held claims are shown."* · second section heading *"Bank dates
  already recorded on claims whose check now passes"* (a claim here may still wait for the District Admin's re-check) (its empty state: ⛔ section shown) · no access *"You do not have
  permission to record bank dates."*. The District Admin's console (`MembershipCheckControl`): the note under a blocking fee line
  (`feeAfterDeathNote` — today *"No drive can open for this claim. Record the check, then deny the claim with the reason "Fee paid after
  the death"."*, `-474` item 3) is AMENDED for the one case the Panel changed, a blocking outcome from the RECORDED date — in the order the
  build allows (DL5: the finance officer can act only on a RECORDED check): *"No drive can open for this claim on the recorded date. Record
  the check. If the member may have paid before the death, then ask the finance officer to check the Trust's bank statement before you deny;
  otherwise deny the claim with the reason "Fee paid after the death"."*; a blocking outcome from the BANK's date keeps today's note,
  unchanged. (*The other option, for BigDev at 0.2:* ⛔ amendment — today's
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

## Panel questions — PROPOSED (one non-blocking note at Task 0.3)

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
  holds an appeal-reversed claim (G5); A would need a new rule. ONE test names PQ1 (AC6).
- **PQ2 — A payment reference that does not match.** The reference a member (or the family) types is never checked against a bank; if it
  was mistyped, no line on the statement carries it (G2 — and a corrected one typed later is kept nowhere). Options: **A** — only a
  statement line carrying the SAME reference counts (cost: a member who really paid but whose reference was recorded wrongly cannot be
  helped; nothing can correct the recorded reference today). **B** — staff may match by amount, day and the payer's name instead, and a
  second staff member must agree (cost: a judgment between many ₹110 payments; the finance officer must see the member's name — a new
  disclosure; another person's payment could be taken for the member's). Suggest **A** (the reference is the only thing on a statement that
  ties a payment to this member). **Built: A** (N3). ONE test names PQ2 (AC4).
- **PQ3 — The bank's date ON the day of death.** Options: **A** — counts as after, as the recorded date does since your 21 November ruling
  (cost: a member whose money arrived that morning gets ⛔ drive). **B** — counts as before (cost: two different lines for "before the
  death" — one for the recorded date, one for the bank's). Suggest **A** (one line). **Built: A** (N1). ONE test names PQ3 (AC5).
- **PQ4 — Is one person's reading of the statement enough?** (`-473` "does NOT cover": *"whether a second person must agree was ⛔
  asked"*.) The finance officer types the date, and nobody else checks it against the statement (TL2). Options: **A** — one finance
  officer's record is enough; the District Admin's re-check and the final vote follow, but neither sees the statement (cost: one person's
  typed date can open a drive; a wrong date is caught only if someone later compares the audit with the statement — G10's bounds are all
  the system has). **B** — a second person who also has the statement must confirm the date before it counts (cost: two people with the
  Trust's bank statements, when even one finance officer is ⛔ settled — G4; slower for the family; a new build). **C** — keep a copy of
  the statement line with the record (cost: a store of other payers' names and VPAs — DL3's rejected upload; counsel has ⛔ looked at
  it). Suggest **A** (the record names the statement, the line and the reason under the finance officer's name, so it can be checked
  afterwards). **Built: A** (DL3, DL8). ONE test names PQ4 (AC3).
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

- [ ] **Task 0 — Governance FIRST, ⛔ code** ([[feedback_governance_commits_precede_implementation]])
  - [ ] 0.1 `git fetch origin`; confirm `6536b8bb` is an ancestor of HEAD — if `origin/main` moved, REBASE (backup branch; a ledger conflict
        at most — branch lines on top; a ledger letter a landed sibling took is RELABELLED, as `21w` → `21ar` was); `git diff --name-only
        6536b8bb origin/main -- apps packages scripts` — re-derive G1–G14 if anything moved; `git log 6536b8bb..origin/main --
        .decision-log.md _bmad-output docs/launch-gate-inventory` — read any new entry; re-read the NUMBERS block across EVERY branch and
        worktree. ⭐ Re-read row `3-17-…`'s status and story file (G14): if it is past `backlog`, reconcile DL1's fee-date sources, the
        coherence CHECK and the guard REPLACE with it BEFORE Task 1 (TR13). Check `ListAgents` + the branch before every commit
        ([[feedback_concurrent_review_agents_mutate_tree]]).
  - [ ] 0.2 Put DL1–DL14 to BigDev (DL11's English verbatim, with its amended console note and the no-amendment option; DL8's rejected
        District Admin named; DL9's step-up WITH its go-live cost and the no-step-up option; DL6's same-person check and the roles-only
        option; DL3's letter-case rule; DL6's earlier-of-the-two-dates rule and the always-replaces option; DL5's record-the-check-first
        path and its no-stored-check option; DL5's record-during-the-appeal option for PQ1; DL10's two list sections). Record the answers
        here, then AMEND N7, TL1, DL13's legs, the ACs and the Tasks to the answers as given — a PROPOSED default left standing in an AC
        gets built (AC1's `'recorded'`-with-an-id leg and AC5's earlier-date leg flip under the always-replaces option).
  - [ ] 0.3 Draft ONE routing note from the template (by path, ⛔ copied):
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
  - [ ] 0.4 Decision entry (AUTHOR-COMMIT, the next free number across branches — `-510` at 2026-11-27; READ LIVE): DL1–DL14 as answered; builds `-473` Q2 B under
        `-474` item 1; declares N3 (a narrowing: the reference only — PQ2), DL8 (the finance officer — a MATCH on "staff", ⛔ the
        District Admin `-473` named as the author's reading), PQ1 built B (the widest literal reach); names PQ1–PQ4 open (PQ4 is asked beyond `-474` item 1's three — say so); mints the key and
        the roster row; AMENDS `-474` item 3's console note for the recorded-date case (an author-commit, amended — only if DL11's
        amendment is accepted); ⛔ supersedes a ratified entry. Committed ALONE, first ([[project_decision_log_writes_user_inserted]] — stage, try,
        verify; ask once on a refusal).
  - [ ] 0.5 Records: the roster row (DL13); `deferred-work.md` — PQ1–PQ4 open (trigger: the ruling) and the corrected-UTR item's dated
        note (DL13); the row-`6-39a` dated comment in `sprint-status.yaml`; ledger line + row `ready-for-dev → in-progress`
        ([[project_sprint_status_safe_prepend]] — verify `yaml.safe_load` and the row count).
- [ ] **Task 1 — The record (AC1, AC11)**
  - [ ] 1.1 The migration (HAND-WRITTEN like `0212`; the guard REPLACE in the same file), `schema/claim_fee_bank_dates.ts` + barrel, the two
        columns in `schema/claim_membership_checks.ts` (+ `MEMBERSHIP_CHECK_FEE_DATE_SOURCES` — LOCKSTEP with the CHECK and the contract), the
        RLS policy file + `policies/index.ts`, the branded id, the field class.
  - [ ] 1.2 Live-DB tests (AC1) — copy 6.39's `claim_membership_checks` spec; the anonymize leg (AC11) + `member/anonymize.ts` + the three
        counts in `rtbf-anonymize.test.ts`.
- [ ] **Task 2 — The rule and the reads (AC2)**
  - [ ] 2.1 `compareFeeCalendarDateWithDeathDate` + the delegation (DL2) + unit tests.
  - [ ] 2.2 `readJoiningFeeReceipt` widened (DL4) — update its callers' types only; `getLiveFeeBankDate`, `listClaimsHeldOnFee` in a NEW
        `claim/fee-bank-date-read.ts` (⛔ decrypt; the list joins the payment by the live check's `fee_receipt_id`; TWO section reads,
        each `clampLimit` inline with its own `*_truncated` — DL10).
- [ ] **Task 3 — The finance officer's act (AC3, AC4, AC8, AC9)**
  - [ ] 3.1 Domain vocabulary (reasons, sources) + `claim/errors.ts` (`FeeBankDateRefusedError`) + contracts `fee-bank-date.ts` + export +
        lockstep test.
  - [ ] 3.2 Writer `recordFeeBankDate` in `claim/fee-bank-date-persist.ts` (the claim-row lock FIRST; DL5's order: shape → lock → window →
        held → receipt → reference → bounds → tokens → supersede + insert + event) — ⛔ decrypt; the reference compared in TypeScript on
        the re-read `utr`, ⛔ passed to any query (DL3, TR5).
  - [ ] 3.3 Event `claim.fee_bank_date_recorded` (registry, `claim/events.ts` tuple + payload map, reducer no-op arm, count 41, the frozen
        literal — G11).
  - [ ] 3.4 The key (permissions doc block + bump block citing Task 0.4's decision + REUSE CHECK paragraph, `SEED_PERMISSION_KEYS`, version;
        `roles.ts` grant; `permissions.test.ts` / `roles.test.ts` incl. N7's pin).
  - [ ] 3.5 Handlers + routes (DL10 — permission hook, then step-up on the POST; ⛔ decrypt; the note encrypted), registration, the
        human-actor gate entry + floor, audit types in `audit-sink.ts`.
  - [ ] 3.6 Tests: AC3, AC4, the AC8 positive and 403 legs, AC9's planted values.
- [ ] **Task 4 — The check and the gate (AC5, AC6, AC7, AC10)**
  - [ ] 4.1 The gate leaf (DL7): facts + the new reason + precedence; `MEMBERSHIP_CHECK_WAIT_REASONS` + contracts mirror + the API message +
        ALL THREE admin maps + the two lists in `claims-verifier-console.test.ts` (DL7); the facts read stays ONE statement (36 reads).
        Run the NW1 scan AND a runtime import ([[project_type_only_import_cycle_trap]]).
  - [ ] 4.2 The membership check (DL6): handler reads + preview fields + `expected_fee_bank_date_id`; writer re-assert
        (`computedAgainstFeeBankDateId`) + the same-person refusal + the two columns; `bank_date_changed` and `same_person` in
        `MembershipCheckRefusedError`'s reasons, `REFUSAL_MESSAGES` (exhaustive) and the admin `refused` map; `bank_date_changed` in the
        admin hook's refetch list; AC5's kinds (i)–(v) of edit to 6.39's specs.
  - [ ] 4.3 The 6.39a fence `it` block + positive control (AC10).
  - [ ] 4.4 Tests: AC5 (incl. the PQ3 test, the earlier-date leg, the direct-writer re-assert leg and the one-person wait), AC6 (the PQ1
        test), AC7; then the WHOLE 6.39 membership-check and approval-path suites (TR1).
- [ ] **Task 5 — The staff surfaces (AC12)** — client + hooks for the page (copy `certificate-reminders`' list + 6.39's
      `usePostMembershipCheck` invalidations: a recorded bank date invalidates the console's preview and packet queries); the page, its
      route component and its nav link (`RootLayout.tsx`); the two list sections; the form with the shared `StepUpPanel`; the control's
      new lines (the amended note in DL11's record-first order);
      DL11's words in the module's `i18n-en.ts` and `verifierConsoleEn`; component tests; the browser pass (or
      un-attested).
- [ ] **Task 6 — Close** — 6.1 `ci:local` on a FRESH container on the story's own DB (AC13); 6.2 the roster row's (a) status line, Row 46's
      dated line; 6.3 `deferred-work.md` dispositions (the corrected-UTR item; anything new); 6.4 Completion Notes, File List, Change Log;
      Status → review.

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

### Debug Log References

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

### File List

## Change Log

| Date | Version | Description |
|---|---|---|
| 2026-11-21 | v1.0 | Created (`bmad-create-story 6.39a`) at `90535934`, in its own worktree. |
| 2026-11-21 | v1.1 | Validated (`bmad-create-story validate 6.39a`, BigDev: "all"; re-traced at `90535934`, `origin/main` unmoved). **Critical:** DL9's step-up cannot be completed in production (the admin step-up delivery is a stub — G9) ⇒ its cost stated, a no-step-up option, DL13 leg (e); N7 / TL1 promised two PEOPLE while the build separated ROLES (one user may hold several grants) ⇒ a same-person refusal in the check writer (DL6, AC5), TL1 reworded; AC5 / AC13's "no assertion changed" was unsatisfiable against DL6's required token and DL12's audit field ⇒ the two allowed kinds of edit named. **Added:** the three admin wait-reason maps and the contracts test's lists (G6, DL7, AC12); the console's read count resolved (G11, DL7 — stays 36); the reference compared trimmed and without regard to letter case (DL3, DL10, AC4); the list capped, joined by the live check's payment, ⛔ fee outcome on its wire (DL10, AC3); the nav link, the route component and the shared `StepUpPanel` (DL10, AC12); the console note amended for the recorded-date case, with a no-amendment option (DL11, Task 0.4); the writer's computed-against token (DL6). **Small:** AC5's defence leg says what the gate answers; valid bodies on the 401 / 403 / step-up legs (TR9); the Niyamavali cited by section, ⛔ quoted; the NUMBERS block re-read (three sibling stories want the same numbers). |
| 2026-11-21 | v1.2 | The Panel note drafted at BigDev's ask, before Task 0.2 (WRITTEN, ⛔ sent; E4 run). PQ4 added — must a second person confirm the bank's date (`-473`: *"⛔ asked"*); it was told in TL1 / TL2, and is now asked without blocking, built A; one test names it (AC3); DL13 (b), Tasks 0.3–0.5 and the header's §0 line follow. |
| 2026-11-27 | v1.3 | Validated again (`bmad-create-story validate 6.39a`, BigDev: "all") after REBASING onto `origin/main` `6536b8bb` (253 commits); `baseline_commit` re-pinned to it; ledger `2026-11-21w` relabelled `21ar` (3.13 landed holding `w`). **Critical:** the numbers re-read (catalog v67 / 99 keys — 3.13 took v66 with two keys; migration `0219`; decision `-510`; roster Row 58; 41 CI jobs — NUMBERS, DL1, DL8, DL13, AC8, AC13, Task 0.4); row `3-17` (`-482` item 5) will make `fee_receipt_id` nullable and add a third fee-date source on the same table and guard — G14, TR13, DL1's extensible vocabulary and one-way coherence CHECK, Task 0.1; the amended console note sent the District Admin to the finance officer before a check was stored, when the finance officer can act only on a stored one — DL5's only path stated, DL11 reworded record-first (approval at 0.2), AC3 / AC12 legs, the Policy-meaning note's list line; AC5 / AC13's "exactly two kinds of edit" could not be met — kinds (i)–(v) named file by file; TR5's leak path was wrong (the error handler logs no body; drizzle's query error carries the parameters into the 500 log) — DL3 compares in TypeScript, the insert's errors re-thrown parameter-free; AC4 / AC9's "no log line" could not fail (test servers log nothing) — a captured `logStream` with a positive control. **Added:** a direct-writer leg for the lock-protected token compare (AC5, TR7); PQ1 B's cost — the appeal is decided before any bank date can be recorded, and a failed look leaves the family with no appeal — and an option to record during the appeal (DL5); the earlier of the two dates, so a later bank date cannot hold a passing claim, with the always-replaces option (DL6, AC1, AC5), and corrections stop at `state_trustee_approved` (DL5); the finance list in two sections so a resolved claim never crowds out a held one (DL10, DL11, AC3, AC12); `rtbf-anonymize.test.ts`' three counts (G11, AC11, Task 1.2); the next sitting's agenda would send the note before Task 0.2 is answered (Task 0.3); N7's role pin widened to `claim.approve` and `claim.r9_vote`, TL1 names the first approver; one person alone strands a claim (N7, TR14, AC5, DL13 (c)). **Small:** DL12 audits only the refusals the handler raises; the microcopy gate matches whole words (G8); TR7's heading; `clampLimit`'s wording; AC5's file list separates specs from source; `-482` in the rulings table; Git intelligence and References brought to `6536b8bb`. A fresh-context review of this pass's OWN diff found eight defects, all fixed before commit (DL6's writer token kept the old meaning; DL1's CHECK still read two-way; DL10's flag; Task 4.2's "two kinds"; kind (iii) widened to the contracts / admin preview fixtures; a third erasure count; Task 0.3 brings the note's told lines 1 and 4 into line; N7's wording, the second-section heading, two counts). |
