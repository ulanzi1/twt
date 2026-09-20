---
baseline_commit: 55912d83
---

<!--
BASELINE — `governance(11b.12): attribution CONFIRMED`. Carries decisions `2026-09-04-186` … `-196`,
Story 11b.11 `done`, and the arc that COMMISSIONED this story.

TWO FACTS, KEPT SEPARATE:
  · DURABLE — the pin `55912d83` is an ancestor of HEAD (re-pinned 2026-09-09 from the orphaned
    `b9beb2c6`, byte-identical tree `418dd99d`; confirmed sound by the `2026-09-15a` ledger block).
  · PERISHABLE — every CODE claim below was re-derived at `5f8d27a0` (2026-09-19, v0.3–v0.5 passes).
    Since the pin, the cited files that moved are all Story 11b.13's: `rbac/permissions.ts`,
    `rbac/roles.ts`, `tests/rbac/permissions.test.ts`, `apps/api/src/audit/audit-sink.ts`; cited lines
    re-checked after that move. Re-run `git diff --name-only 5f8d27a0..HEAD -- packages apps scripts`
    before Task 1 — do not inherit this verdict.

GLYPH REGISTER: `⛔` sits ONLY on a negation word (NOT / no / never / don't) and emphasises it — never
on a heading or a positive fact. `⭐` = key fact or action. `⚠` = hazard.
ADDRESSING RULE: no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or
`sprint-status.yaml` (newest-first — every prepend rots every number). Cite decision ids, clauses,
item headings and row keys. `file:NNN` is used ONLY for code.
LETTERS: `D1`…`D5` are 6.18's own; other stories' letters are qualified (`6.13 D-B`, `6.11 D-D`).
-->

# Story 6.18: The Nominee Name Check — the District Admin Sees Both Names and Records the Match `[SURFACE]`

Status: ready-for-dev

> **Not in `epics.md`'s story list.** Commissioned by the Trustee Panel (Dhiraj Rahul + Kalpana
> Bharti) on 2026-09-05, ruling 1 of `trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md`
> §10.2: *"Open a story to MECHANIZE the approver duty."* ⭐ **Shaped by `-226` (Trustee-ratified,
> 2026-09-19)** — the Panel's ruling on what happens when the names differ.
>
> ⭐ It closes `D5-subject` (ii) — `deferred-work.md` **§Story 11b.3a item (b)** (a bare "item (b)"
> in that file means Story 11b.1's). It does ⛔ not close `D5-subject` (i) (**Trap 1**).

## The ruling this story builds (`-226`, verbatim clauses as relayed)

1. *"Mismatch is not allowed in general. It's the duty of helpline_operator to make sure name doesn't
   mismatch."*
2. *"A clerical difference (an initial, a married name, a bank's shortened name) in form can be
   submitted with note to District Admin."*
3. *"Mismatch is reviewed by District Admin."*
4. *"Clerical mismatch can be permitted subject to District Admin approval at verification and final
   approval by Pariwar Admin. Once Pariwar Admin approves the claim, campaign goes live."*
5. *"System shouldn't act for name mismatch at any time, but display/highlight that approved named is
   mismatched for District Admin, Pariwar Admin, Super Admin."* — the highlight comes from the
   District Admin's recorded judgement, ⛔ never a computer comparison, and *"District Admin cannot
   proceed unless reason for name mismatch is selected."*
6. A mismatch that is ⛔ not clerical is **sent back for correction** — ⛔ not denied for it.
7. *"Bank Account Information is mandatory for claim filing"* — **both accounts**; claims already
   filed without them must have them added before the District Admin can decide.
8. For claims the family files in the app, the District Admin's check is the safeguard.

⚠ **`-226` does ⛔ not cover** (so this story takes the readings in **D2–D5** and records them): the
reason list beyond the three examples; whether the Pariwar Admin records anything beyond approving;
an account corrected after the District Admin's approval; a real mismatch found where accounts can
⛔ no longer be corrected; the filer rewriting the declared nominee after death.

## Story

As a **District Admin** verifying a death claim,
I want to see the name on each of the claim's two bank accounts beside the nominee(s) the member
declared, read the filer's note, and record whether they match — selecting the reason when a
difference is clerical, or sending the claim back when it is not —
so that money reaches the nominee the member chose, and the Trust can show who checked.

And, as a **helpline operator** filing a claim, I want to see both names before I submit the
accounts, because making sure they match is my duty (`-226` cl.1); and, as a **Pariwar Admin** or
**Super Admin**, I want an approved claim whose names differ to say so wherever I review it.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⭐ **Two predicates that gate a benefit, both ruled by `-226`:**
> **"Your family must give two bank accounts to file your claim, and the claim cannot be approved
> until they are given — it is never refused for this, it waits."** (cl.7)
>
> **"Before your claim is approved, the District Admin must look at the name on each account beside
> the nominee you named and record whether they match; a small clerical difference can be accepted
> with a stated reason, anything else is sent back to be corrected — the claim is never refused or
> stopped by the computer over a name."** (cl.3–6)

⚠ **Checked against the Niyamavali:** consistent with §6.3 (*"at claim time the nominee provides
bank/IFSC details"*) and §6.4; it rules no attestation. The Niyamavali is ⛔ not ratified and ⛔ not
binding ([[feedback_niyamavali_rulebook_not_spec]]) — the authority is `-226`. `docs/legal/` is absent
from the public repo by design; give no repo path.

⚠ **Sharp edges (the 10.10 lesson):**
- cl.7 is a **new filing condition**. It is Trustee-ratified; ⛔ never deny a claim for missing
  accounts — the claim waits (AC6).
- "Sent back" must ⛔ never become a dead end: the claim stays open, the filer is told, and the
  collection window lets them correct (AC5). ⚠ Where no correction window exists, it can — see D4.
- The filer can rewrite the declared nominee after death (below), so the two names can both come
  from the filer. The check shows the declaration date beside the filing date (AC2); it does ⛔ not
  fix this (AC10).

## 🎯 What already EXISTS — re-derived at `5f8d27a0`

| Fact | Where |
|---|---|
| Filing — family | Member app `(claim)` flow; bank entry is `apps/mobile/app/(claim)/nominee-review.tsx` (`<NomineeDetailEditor>`, both accounts, holder name + account number + IFSC, optional VPA). ⚠ Trace whether the flow can complete without submitting it (Task 5) |
| Filing — helpline | Admin `apps/admin/src/modules/helpline-claims/` (`HelplineClaimPage`, `ReadBackCard`, `ConvergenceDecisionStrip`) — ⛔ no bank-entry UI. The API exists: `…/admin/claims/:claimCaseId/nominee-bank` (`claims.helpline.routes.ts:166`, `:184`; handlers `recordHelpline` `:418`, `getStatusHelpline` `:375` in `claims.nominee-bank.handlers.ts`) |
| Bank writer | `packages/domain/src/claim/nominee-bank-persist.ts` — delete-then-insert (`:176-200`) under the `claims` FOR UPDATE lock (`:121-126`); *"Exactly two bank accounts are required"* per submission (`claims.nominee-bank.handlers.ts:66`) |
| The account row | `claim_nominee_bank_accounts` — PK `(claim_case_id, account_rank)`, ⛔ no id column (`schema/claim_nominee_bank_accounts.ts:84`); `account_holder_name_ciphertext` Tier-1; `updated_at` `defaultNow()` (`:80`) ⇒ changes on every edit. ⚠ JS `Date` is ms, PG µs — compare after the Drizzle read |
| Windows | Collection `NOMINEE_BANK_COLLECTABLE_STATES` = `intake_converged`, `documents_pending`, `verification_in_progress`, `verifier_review`; correction `['verifier_approved']` (`claim/errors.ts:198-210`). ⛔ No bank write is legal in `reversed`, `state_trustee_freeze`, `state_trustee_approved`, `approved` |
| Approval today ignores accounts | ⛔ nothing in `verifier-decision-persist.ts` or `state-trustee-decision-persist.ts` reads them |
| Lifecycle | `intake_pending → intake_converged → documents_pending → verification_in_progress → verifier_review → verifier_approved → state_trustee_freeze → state_trustee_approved → approved` (`claim/state.ts:325-336`); `commitCycleFreeze` (`state-trustee-decision-persist.ts:670`) is the only emitter of `claim.approved` (`:745`) — the Pariwar Admin's commit, after which the campaign goes live |
| Paths into `state_trustee_approved` | only `voteOnFrozenClaim` approve (`:400`; from `verifier_approved`, `reversed`, `state_trustee_freeze` — `TRUSTEE_VOTABLE_STATES` `:72`) and `finalizeR9Outcome` approved (`r9-voting-persist.ts`; from any `R9_OUTCOME_FROM_STATES`, `state.ts:78-85`). `verifier_approved` is reached by `adjudicateClaim` (`verifier-decision-persist.ts:282`) or `resolveEscalation` (`state-trustee-decision-persist.ts:533`) |
| The DA's console | `apps/admin/src/modules/claim-verification/` (`VerificationDecisionStrip`, …; English-only `i18n-en.ts`). Read `GET …/admin/claims/:claimCaseId/verifier-console` (`claims.verifier-console.handlers.ts`, `claim.verify` at `district`, `:60`; `VERIFIER_CONSOLE_MAX_READS = 11`, `:88`, test-pinned; access audit `admin_verifier_console.read`, `:524`) |
| The verifier decision | `POST …/verifier-decision` (`claims.verification-decision.routes.ts:92`, `claim.approve` at `district`); snake_case `.strict()` body (`packages/contracts/src/claims/verification-decision.ts:124-133`); errors: 400 for rule mismatches (`claims.verification-decision.handlers.ts:75-79`), 409 for conflicts |
| The Pariwar Admin's surfaces | `apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx` (flat card, ⛔ no expand) via `cycle.freeze`; `apps/admin/src/modules/r9-voting/` via `claim.r9_vote` — both `dimension: 'pariwar'`, `pariwar_admin` (+ super_admin). ⛔ No admin campaign/pool page exists |
| Key holders | `claim.verify`: `district_admin`, `verifier`. `claim.approve`: `district_admin`, `pariwar_admin`, `state_trustee`. `claim.correct_nominee_bank`: `helpline_operator`, `pariwar_admin` (`permissions.ts:818`). super_admin derives all. `pariwar_admin`/`helpline_operator` ceiling `pariwar` ⇒ pass a district check (`scope.ts:286-288`), ⚠ except a null-district claim (`scope.ts:235`) |
| Catalog | `PERMISSION_CATALOG_VERSION = 41`, 49 keys (`permissions.ts:650`; `packages/domain/tests/rbac/permissions.test.ts:54-56`) |
| The presence view | `packages/contracts/src/claims/nominee-bank.ts:107-111` (*"never echo account number / holder name / raw IFSC"*) + `NomineeBankAccountView` `:112-122`; fixtures `packages/contracts/tests/claims-nominee-bank.test.ts:136-157` |
| Decrypt helpers | strict `decryptNomineeBankField` (`apps/api/src/modules/claims/nominee-bank-crypto.ts:40`) — ⛔ never the soft `…Soft` (`:57`, returns a sentinel); strict `decryptNomineeField` (`apps/api/src/modules/nominee/nominee-crypto.ts:35-43`) |
| The declared nominee | `member_nominees` — PK `(member_id, rank)`, `name_ciphertext` Tier-1, `relationship`, `split_pct`, `created_at`; re-declaration is delete-then-insert (`packages/domain/src/nominee/declaration-write.ts:52-80`); RTBF writes an encrypted `'[anonymized]'` (`packages/domain/src/member/anonymize.ts:70`) |
| ⚠ Post-death nominee writes | `POST /api/v1/member/nominees` checks only `withdrawn`/`anonymized` (`nominee.handlers.ts:40`); the Ravi-mode session is the deceased's |
| Decrypt cost | `packages/domain/src/encryption/envelope.ts:93` — one audited `decryptDek` per field, each under the global audit advisory lock (`packages/domain/src/audit/write.ts:128`) |
| Already shown, unchecked | The holder name appears as *"Nominee Name"* on the public drive page (11b.11), index (11b.14), message-block table (11b.20) and the member drive/pay screens (11b.17, 8.17) |

---

## THE FOUR TRAPS

### Trap 1 — ⛔ no join, ⛔ no match rule, ⛔ no computer comparison

`D5-subject` (i): *"Do not "fix" this by adding a join or a match rule."* 6.8's D1 made the accounts a
claim-scoped payment channel ([[project_nominee_bank_disbursement_channel]]). And `-226` cl.5: the
system ⛔ never acts on a mismatch and the highlight comes from the District Admin's judgement. ⇒ ⛔ no
FK, ⛔ no `nominee_rank`, ⛔ no string equality, ⛔ no similarity score, ⛔ no "looks different"
hint anywhere. Two strings shown; a person decides; the decision is recorded.

### Trap 2 — display alone is ⛔ not the duty

Showing the names without recording the check leaves the duty unperformed
([[feedback_mechanization_split_commitment]]). The approval gate (AC4) is what makes it real.

### Trap 3 — the "never echo" doc-block

`nominee-bank.ts:107-111` forbids echoing the holder name. **Amend and name** the exception (this
story, the AC2 read, its key); ⛔ never delete it; account number and raw IFSC stay never-echoed.

### Trap 4 — a Tier-1 decrypt at new surfaces

⛔ No name, ⛔ no hash of a name and ⛔ no filer note in any log, event, audit line, error body or
cache key. Strict decrypt helpers only; `unreadable` on failure. The nominee is a second, living
Tier-1 subject. Names come from **one per-claim read** — ⛔ never decrypted across a list.

---

## ⚖️ Decisions

### ✅ D1 — decided (BigDev, author-commit): the check is its own write; approval requires it
The District Admin records the check through its own `POST`, and every approval path requires a
**current** check to exist (AC4). The check is re-validated in-transaction at approval, so a separate
write cannot race it. (Supersedes v0.3/v0.4's "inside the decision body", which existed to carry an
escalation `-226` removed.)

### ✅ D2 — decided (BigDev, author-commit): the clerical reasons are the three the Panel named
`initial` · `married_name` · `bank_shortened_name`. ⛔ No "other". ⚠ `-226` names these as examples;
adding a reason (e.g. transliteration) is the Panel's — a gap is surfaced by the DA sending the claim
back, ⛔ never by widening the list here.

### ✅ D3 — decided (BigDev, author-commit), reading `-226` cl.4: the Pariwar Admin's final approval is their existing vote
The Pariwar Admin sees both names, the DA's reason and the filer's note, and approves or denies as
today. ⛔ No second attestation.

### 🟡 D4 — recorded, ⛔ not decided: a real mismatch where accounts can ⛔ no longer be corrected
A claim at `reversed` or `state_trustee_freeze` (appeal, R9) has ⛔ no bank-write window. If the DA
records `does_not_match` there, the claim cannot pass AC4 and cannot be corrected. ⚠ Rare, but a dead
end. ⭐ This story surfaces it (the card says "sent back — no correction window at this stage") and
records it in `deferred-work.md`; the fix (a correction window, or a Panel rule) is the Panel's.

### 🟡 D5 — recorded, ⛔ not decided: an account corrected after the DA's approval
The admin correction window is `verifier_approved`. A correction changes `updated_at`, the DA's check
is no longer current, and AC4's gate at the Pariwar Admin's vote requires the DA to check again.
⭐ That is this story's reading of `-226` cl.3 ("reviewed by District Admin"); record it in Task 0 so
the Panel can see it.

---

## Acceptance Criteria

### AC0 — Governance first
**Then** Task 0 lands in one `governance:` commit before any code
([[feedback_governance_commits_precede_implementation]]). ⭐ `-226` is already in `.decision-log.md`.

### AC1 — Two keys, visible in the catalog
**Then** `claim.view_nominee_name_check` gates the names read (AC2), checked at `dimension:
'district'`, granted to `district_admin`, `verifier`, `pariwar_admin`, `helpline_operator` (+ super_admin)
— `helpline_operator` because `-226` cl.1 gives them the duty
**And** `claim.check_nominee_name` gates recording the check (AC3), `dimension: 'district'`, granted to
`district_admin` **only** (+ super_admin) — `-226` cl.3 names the District Admin
**And** `claim.verify` is ⛔ not widened; `state_trustee` gets ⛔ neither key
**And** `PERMISSION_CATALOG_VERSION` goes +2 from the live value (41 → 43, 49 → 51 at `5f8d27a0`;
⚠ the 2026-09-07 drive-target note records a pending key removal that collides — read it live), with
a bump note in the file's established shape; permission and role tests updated.

### AC2 — The names read
**Given** a caller holding `claim.view_nominee_name_check`
**Then** `GET …/admin/claims/:claimCaseId/nominee-name-check` returns a new `.strict()` snake_case DTO:
  - per live account: `account_rank`, `account_updated_at`, `holder_name` (`{state:'readable', value}`
    | `{state:'unreadable'}`), `name_difference_note` (the filer's note, same union, or `null`);
  - per declared nominee of `claims.deceased_member_id`: `rank`, `split_pct`, `relationship`,
    `nominee_name` (`readable` | `unreadable` | `anonymized` — `'[anonymized]'` maps to `anonymized`,
    ⛔ never rendered as a name);
  - `nominee_declaration_token` (the rows' `(rank, created_at)` set), `nominee_declared_at`,
    `claim_filed_at` — plain dates, ⛔ no highlight;
  - `accounts_complete` (exactly two live accounts);
  - `current_check` — the latest check if still current (AC3), else `null`;
**And** ⛔ no account number, raw IFSC, VPA, nominee mobile or address
**And** zero nominees ⇒ said explicitly; missing accounts ⇒ said explicitly (AC6)
**And** bank rows key on `claim_case_id`, nominee rows on `deceased_member_id` (the AI-6-3 decoy
`verifier-console-shape.spec.ts` shares nominee rows, ⛔ never accounts)
**And** an access-audit line `admin_nominee_name_check.read`, carrying ⛔ no name.

### AC3 — The District Admin records the check
**Given** a caller holding `claim.check_nominee_name` and `claim.view_nominee_name_check`
**Then** `POST …/admin/claims/:claimCaseId/nominee-name-check` takes `{ nominee_declaration_token,
accounts: [{ account_rank, account_updated_at, verdict: 'matches' | 'clerical_difference' |
'does_not_match', clerical_reason? }] }` — exactly the live accounts, both ranks
**And** at the boundary (**400**): `clerical_difference` requires `clerical_reason` ∈ D2's three;
`clerical_reason` is forbidden otherwise — *"District Admin cannot proceed unless reason … is
selected"* (`-226` cl.5)
**And** in a new domain function, under the claim lock (**409**): the tokens must match the live
accounts and declaration; a claim without two accounts is refused (AC6); allowed states are
`verification_in_progress`, `verifier_review`, `verifier_approved`, `reversed`, `state_trustee_freeze`
**And** it emits one event `claim.nominee_name_checked`, payload `requireIdentityTransition({...auditShape,
nominee_declaration_token, accounts: [{account_rank, account_updated_at, verdict, clerical_reason}]})` —
⛔ no name, ⛔ no hash, ⛔ no note; the claim state does ⛔ not move
**And** a check is **current** when its `account_updated_at` values and declaration token equal the
live ones; any bank edit or re-declaration makes it stale
**And** a check is ⛔ never inferred or back-filled — claims decided before this ships carry none
([[feedback_record_unattested_no_backfill]]).

### AC4 — Approval requires a current, passing check
**Then** each approving path, in-transaction after the claim lock, requires two live accounts **and** a
current check whose every verdict is `matches` or `clerical_difference` (else **409**, a new domain
error, mapped in each handler):
  - **P1** `adjudicateClaim` approved (the DA's verification approval);
  - **P3** `voteOnFrozenClaim` approve (the Pariwar Admin's final approval — catches appeal reversals
    and D5 corrections);
  - **P4** `finalizeR9Outcome` approved (R9 bypasses the DA's approval);
**And** `resolveEscalation` approved is ⛔ not gated separately — it only reaches `verifier_approved`,
which must pass P3
**And** `commitCycleFreeze` carries ⛔ no check — ⛔ no bank write is legal once the freeze begins; a
test pins that both windows exclude `state_trustee_freeze`/`state_trustee_approved`
**And** denials are ⛔ never gated
**And** ⛔ nothing is automatic: no gate compares names, no mismatch triggers a denial, escalation or
state change (`-226` cl.5).

### AC5 — "Sent back for correction"
**Given** the DA records `does_not_match` on any account
**Then** the claim stays in its state, cannot pass AC4, and is ⛔ never denied for it (`-226` cl.6)
**And** the filer is told: the helpline claim page (AC7) and the member app claim status show "bank
details need correcting" for that account, from the latest check — ⛔ no name in that message
**And** the corrected submission (existing bank writer, collection window) makes the check stale; the
DA checks again
**And** at `reversed`/`state_trustee_freeze` the card says ⛔ no correction window exists (D4).

### AC6 — Two accounts are mandatory (`-226` cl.7)
**Then** the member app claim flow cannot complete without both accounts (Task 5 traces where)
**And** the helpline filing page cannot complete without both accounts (AC7)
**And** server-side, P1/P3/P4 and AC3 refuse a claim without two live accounts (409, "bank details
required") — ⛔ never a denial; a claim already filed without them waits until they are added
**And** the DA's console shows "bank details missing" for such a claim.

### AC7 — The helpline operator's duty at filing (`-226` cl.1–2)
**Then** `helpline-claims` gains a bank-details section (the existing `recordHelpline` API) showing,
after submission, both names side by side from the AC2 read, with the explicit states
**And** an optional **note to the District Admin** per account (≤ 500 chars) for a clerical difference
**And** the member app's bank form gains the same optional note (cl.2 lets the family submit one)
**And** the note is stored Tier-1 encrypted: a new nullable `name_difference_note_ciphertext` on
`claim_nominee_bank_accounts` (hand-authored migration, journal entry; ⛔ never regenerate an applied
one), written by the existing writer, read only through AC2.

### AC8 — The highlight (`-226` cl.5)
**Then** a claim whose current passing check has any `clerical_difference` shows *"Approved with a
name difference: <reason>"* on the DA's console, the Pariwar Admin's cycle-freeze card and the R9
screen (Super Admin reaches all three)
**And** the flag is non-PII (boolean + reason codes) and rides those surfaces' own reads; the names and
note come only from AC2 on demand
**And** it stays visible after approval — ⚠ ⛔ no admin campaign page exists; the flag persists on the
claim's console record, and a future campaign view must carry it (recorded in Task 0)
**And** the flag is ⛔ never shown to members or on any public surface.

### AC9 — The contract and PII posture
**Then** `nominee-bank.ts:107-111` is amended and named (Trap 3); `NomineeBankAccountView` is unchanged
**And** a live-DB test plants both names and a note as sentinels and finds them in ⛔ no log, event,
audit line or error body (model: `apps/api/tests/integration/claims/nominee-bank.spec.ts:150-160`)
**And** ⚠ ⛔ no CI script scans admin DTOs for PII — this test is the only guard.

### AC10 — Nothing else moves
**Then** ⛔ no claim state, window or public surface changes; ⛔ no `member_nominees` write path changes
**And** `D5-subject` (i), D4 and the post-death nominee-write hazard stay open, recorded by name.

---

## Tasks / Subtasks

- [ ] **Task 0 — Governance** (AC0) — one `governance:` commit, ⛔ no code
  - [ ] `epics.md` — Epic 6 annotation after `### Story 6.17`: commissioned by 2026-09-05 ruling 1,
        shaped by `-226`; closes `D5-subject` (ii).
  - [ ] `.decision-log.md` — ONE author-commit entry: D1–D3; the two keys and grants; D4/D5 readings
        (so the Panel can see them); the new column; the filing-flow change.
  - [ ] `deferred-work.md` §Story 11b.3a item (b) — annotate (⛔ never rewrite) the line *"6.18's own
        D2 is a PANEL question and blocks its Task 4"* → answered by `-226`; keep "COMMISSIONED, NOT
        YET CLOSED". Add D4, the post-death nominee-write hazard and the campaign-view flag as items.
        Grep `D5-subject` across the file and reconcile.
  - [ ] `sprint-status.yaml` — a dated note under the comment above the `6-18` row and on the
        `2026-09-05o` block: D2(b) superseded by `-226` (⛔ not rewritten); flip to `in-progress`
        with a ledger entry ([[project_sprint_status_safe_prepend]]).
- [ ] **Task 1 — Keys** (AC1) — mint both; grants; catalog +2 from live; tests.
- [ ] **Task 2 — The names read** (AC2, AC9) — route + handler files in `apps/api/src/modules/claims/`,
      district stash like the console; DTO in `packages/contracts/src/claims/`; strict decrypts; access
      audit; add the file to `scripts/claim-adjudication-human-actor-invariant/check.ts`; amend
      `nominee-bank.ts:107-111`.
- [ ] **Task 3 — The check write + event** (AC3)
  - [ ] Domain `recordNomineeNameCheck` under `lockClaim`; route + handler; 400/409 mapping.
  - [ ] Event wiring: `CLAIM_EVENT_TYPES` (`claim/events.ts:549`, 31 now) + payload map (`:592`);
        `packages/events/src/registry.ts`; reducer identity case (`claim/state.ts`); an
        `admin_claim.*` audit action (`apps/api/src/audit/audit-sink.ts`, `AuthAuditEventType`);
        the six `toHaveLength(31)` tests under `packages/domain/tests/claim/`.
  - [ ] "Current check" read: latest `claim.nominee_name_checked` per claim from `events_log`, compared
        to the live rows after the Drizzle read (or a projection table written in the same tx —
        dev's choice; projector-only).
  - [ ] Add the route file to the human-actor invariant script.
- [ ] **Task 4 — The gates** (AC4, AC6) — P1 in `adjudicateClaim`, P3 in `voteOnFrozenClaim`, P4 in
      `finalizeR9Outcome`; one shared domain helper; 409 mapping in the three handlers.
- [ ] **Task 5 — Filing** (AC6, AC7)
  - [ ] Trace the member `(claim)` flow: where can it complete without `nominee-review.tsx`'s bank
        submission? Make both accounts required there; add the optional note.
  - [ ] `helpline-claims`: bank-details section on `recordHelpline`, both-names view, optional note,
        required before the page completes.
  - [ ] Migration for `name_difference_note_ciphertext`; writer + contract (`name_difference_note`,
        optional, ≤ 500).
  - [ ] "Bank details need correcting" on the helpline page and member claim status (AC5).
- [ ] **Task 6 — The DA and Pariwar Admin surfaces** (AC2, AC3, AC5, AC8)
  - [ ] `VerificationDecisionStrip`: both names per account, the note, the dates, the verdict control
        (reason select mandatory for `clerical_difference`), "bank details missing"; approve disabled
        until AC4 holds.
  - [ ] `PendingCaseCard.tsx` and the R9 screen: a *"Check nominee names"* disclosure (AC2 on
        demand), the AC8 flag, the D4 message.
  - [ ] The AC8 flag on the console read — ⚠ `VERIFIER_CONSOLE_MAX_READS` moves by one and needs its
        review explanation.
  - [ ] English copy in each module's `i18n-en.ts`. ⛔ No match hint, score or highlight other than AC8.
- [ ] **Task 7 — Tests** (AC1–AC10) — execute on `twt-test-pg` `:5433`; "written but not run" is ⛔ not
      attested
  - [ ] No-comparison fence over the read, the write and the gates (Trap 1, AC4).
  - [ ] PII sentinels incl. the note (AC9); account number + raw IFSC never echoed.
  - [ ] Keys: without view ⇒ 403; `verifier`/`pariwar_admin`/`helpline_operator` can read but ⛔ not
        check; `district_admin` can check (AC1).
  - [ ] 400: `clerical_difference` without a reason; a reason on `matches`. 409: stale tokens, one
        account, wrong state (AC3).
  - [ ] P1/P3/P4 refused without a current passing check and without two accounts; a
        `does_not_match` claim is never denied and passes after correction + re-check (AC4–AC6).
  - [ ] Both bank-write windows exclude the freeze states (AC4).
  - [ ] Two/zero nominees, `unreadable`, `anonymized`, decoy claim B (AC2); the AC8 flag present for
        `clerical_difference` and absent otherwise.
- [ ] **Task 8 — Friction-budget disposition** — after the code commits
      ([[project_friction_budget_baseline_ratchet]]).

---

## Dev Notes

### Why this story exists
The name on the claim's bank accounts is shown under *"Nominee Name"* on five surfaces and checked by
nobody. `-226` makes the District Admin the checker, the helpline operator responsible at filing, and
the Pariwar Admin's approval final — with the computer only showing, ⛔ never judging.

### What `-226` removed from v0.4
⛔ No escalation, ⛔ no `nominee_name_mismatch` reason code or pgEnum migration, ⛔ no resolver
attestation, ⛔ no `accepted_with_difference`, ⛔ no change to the `verifier-decision` body. What
remains is smaller: one read, one write, three gates, two filing forms.

### Testing standards
Unit tests in `apps/admin` for the surfaces; live-DB (`apps/api/tests/integration/claims/`) for the
read, the write, the gates and the event. Existing suites on this ground:
`claims-verifier-console.test.ts`, `verifier-console-shape.spec.ts`, `verifier-console.spec.ts`,
`nominee-bank.spec.ts`, `claims-nominee-bank.test.ts`. [[project_live_db_test_gotchas]].

### References
- `.decision-log.md` — `-226` (the ruling); `-205` cl.4, cl.10
- `trustee-panel-routing-note-2026-09-19-6-18-nominee-name-mismatch.md` (✅ block = the ruling as relayed)
- `trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md` §9.6.1, §10.2
- `deferred-work.md` — §Story 11b.3a item (b), §Story 11b.3a item (h)
- Code: see "What already EXISTS"

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-05 | 0.1 | Created on the **Trustee ruling of 2026-09-05** (DR + KB) — *"Open a story to MECHANIZE the approver duty"* — from Story 11b.12's **D2**. ⭐ Closes `D5-subject` **(ii)**; ⛔ leaves **(i)** open by design. ⚠ **THREE decisions OPEN: D1, D2, D3 — D2 BLOCKS Task 4 and is a PANEL question**, because it decides whether a clerical name mismatch can halt a death claim. ⭐ Five traps recorded at authoring, the first two load-bearing: ⛔ **no join or match rule**, and ⛔ **display alone is not mechanization**. | BigDev + Claude |
| 2026-09-05 | 0.2 | ✅⭐ **D2 RULED (b) SOFT — Trustee Panel (Dhiraj Rahul + Kalpana Bharti).** Recording is mandatory; a *"does not match"* verdict **ROUTES to the State Trustee** ⛔ instead of halting a death claim. ⇒ **Task 4 UNBLOCKED.** ⭐⭐ **And the mechanism was already shipped** ⇒ ⛔ **no new state, no new queue, no new resolver surface.** ⚠ **NEW AC8**: the escalation resolver **MUST inherit the same name view under the same key**. ⚠ D1 and D3 stay open. — *Superseded: the "RULED" status was never logged, and `-226` (2026-09-19) replaced the escalation design entirely. Kept unedited as the record.* | BigDev + Claude |
| 2026-09-19 | 0.3 | First validate pass (code re-derived at `5f8d27a0`): D2(b) unlogged; escalate is terminal-for-write; AC8 unsatisfiable under AC4's grants; `verifier` cannot approve; stale-attestation and bypass paths; a hidden "no account ⇒ no approval" gate (D4, BigDev); soft decrypt sentinel. — *Superseded by v0.4/v0.5. Kept as the record.* | BigDev + Claude |
| 2026-09-19 | 0.4 | Second validate pass against v0.3's own output: `accountId` did not exist; the event could not carry a DB-generated decision id; AC9 missed R9 and appeal paths ⇒ per-path gates (BigDev chose these over a commit-time backstop); 400/409 convention; snake_case; `-210` does not authorise the reason code; D1's actor and D4's narrowing are the Panel's ⇒ routing note drafted. — *Superseded by v0.5. Kept as the record.* | BigDev + Claude |
| 2026-09-19 | 0.5 | **Rewritten on `-226` — Trustee-ratified (DR + KB), 2026-09-19**, the Panel's answer to the 2026-09-19 routing note, with its own design: a mismatch is not allowed in general (the helpline operator's duty at filing); a clerical difference is accepted by the **District Admin** with a **selected reason** and finally approved by the **Pariwar Admin**; a non-clerical mismatch is **sent back**, never denied; the system **never acts**, it only **highlights** to DA / PA / SA; **two bank accounts are mandatory to file**. ⇒ escalation, the new reason code, the resolver attestation and the decision-body extension are removed; two keys (view: DA / verifier / PA / helpline; check: DA only); the check is its own write, required at P1/P3/P4 (per-path, as BigDev chose); filing flows require both accounts and take an optional note; D2 (the three reasons), D3 (PA's vote is the final approval) decided; D4 (no correction window after appeal/R9) and D5 (post-approval correction ⇒ DA re-checks) recorded. D2(b) and v0.4's D4 superseded by `-226`, ⛔ not reinterpreted. | BigDev + Claude |
