---
baseline_commit: c136b03c
---

<!--
SPLIT FROM Story 6.19 v0.9 on 2026-09-27 (BigDev: "split it three ways") — D13. The set: 6.19a (this file) → 6.19b → 6.19c, and
6.19d (CC1, `backlog`; its ruling `-259` has landed, its ACs are owed a create-story pass). The AC numbers are KEPT from 6.19 v0.9 so every
decision and note that cites "6.19 AC n" still resolves; AC8/AC9/AC11 are restated per slice.
⭐ THE SHARED SPEC IS PART OF THIS STORY: `6-19-correction-return-reminders-and-closure.md` — its rulings table, invariants, *What already
EXISTS*, traps T1–T14 and author decisions D1–D29. ⛔ Do not start without reading it end to end.
BASELINE: the pin `c136b03c` is an ancestor of HEAD (durable). The code claims were re-derived at `6752e0d6` on 2026-09-28, when
`git diff --name-only c136b03c..HEAD -- packages apps scripts` was EMPTY (perishable — re-run it at Task 0).
GLYPH REGISTER: `⛔` only on a negation word; `⭐` key fact; `⚠` hazard. ⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or
`sprint-status.yaml`; `file:NNN` into code is as of `6752e0d6` — the function names are the stable handle.
-->

# Story 6.19a: The Family's Contact Details, Their Agreement and the Claimant's Relationship Are Captured at Filing — and the Nominee List Grows to Twenty `[SURFACE]`

Status: ready-for-dev

> ⭐ **First of the 6.19 set, and it carries the WHOLE SET's governance (Task 0)** — one author-commit for D1–D29 (D29 in its `-260` G1
> form) and all **eight** keys, the `epics.md` entries for 6.19a–d, and the planning annotations. ⛔ No 6.19b/c code before that commit lands.
> ⭐ **Every Panel question on the set is answered** (`-250` … `-260`). What remains is **counsel's** — M (the filer agreeing for others, and
> whether the agreement may be a condition of approval) and S (the privacy policy's purpose): go-live gates, ⛔ not build blockers.

## Read first — the parts of the shared spec this slice depends on

- **Rulings:** `-232` G, `-233`, `-253` cl.1/cl.2/cl.4, `-255` F8, `-257`; for Task 0 also `-258`, `-259`, `-260`; `-261` C1/C3 (context for AC13 and for the per-claim agreement); `-263` FQ9 (row `6-26`'s
  approval check — sequencing, Dev Notes). `-262` and `-264` do ⛔ not touch this slice (6.20's follow-ups). *"Every Panel question on the
  set is answered"* counts the 6.19 set (`-250` … `-260`); `-261` … `-264` rule on 6.20.
- **Invariants:** 9 (new PII is Tier-1, no erasure path yet — record the gap).
- **What already EXISTS:** *Filing (member app)*, *Filing (helpline)*, *Side-route pattern*, *Consent*, *Nominees*, *Relationship lists*, *PII*, *The approval gate*.
- **Traps:** T8 (new PII surface), T12 (the as-at-death declaration — ⚠ read its note on WHEN it exists), T14 (migrations from 0124).
- **Decisions:** D5 (contact table, bound to declaration versions), D9 (claimant name ⛔ not English-gated), D13 (the split), D14 (where "contact required" lives), D15 (the agreement as a consent type), D16 (the relationship per nominee).

## Story

As a **family member filing a claim** (in the app, or through the helpline operator), I want to give **each nominee's postal address**,
say whether the claimant is one of the nominees — and if not, the **claimant's name, mobile, address and relationship to each nominee** —
and **agree that these people may be contacted**, so that if the claim is ever sent back for a bank-name correction the Trust can reach us
by text message or by post (6.19b), and a claim is never closed without us having been reached (6.19c).

## 📜 Policy meaning (AI-10-1)

⭐ This slice introduces **one predicate that gates a member's claim**: D14's check at every approving path — *a claim cannot be approved
until the family has given a postal address for each nominee in force at the death (and the claimant's details when the claimant is not one
of them) and agreed to be contacted.*

**In the family's terms (ours, for the Panel to correct):** *"Before we can approve your claim we need an address for each nominee and your
agreement that we may contact the people named. Your claim is never refused for this — it waits until you give them, and you can give them
through the helpline at any point before approval. ⚠ If you do not agree to us contacting them, we cannot approve the claim."*

⚠ The last sentence is the predicate's real reach, stated plainly: a filer who **declines** the agreement leaves the claim unapprovable for as
long as they decline. The form requiring it is `-253` cl.1 (*"the filer confirms — in the form"*); that a refusal **blocks approval** is
**our** reading (D14 + D15). Whether the agreement may lawfully be a **condition** of a death benefit is recorded as part of counsel's **M**
(D24) — ⛔ not routed to the Panel (the Panel ruled the mechanism; its lawfulness is counsel's).
⚠ "Waits" is honest only while someone **can** supply the missing record — hence AC1's write window runs through every state from which an
approval can still 409 on it. A check with no path to satisfy it is a permanent refusal wearing a "waits" label (the 10.10 shape).

**Checked against the Niyamavali? ⛔ NO** — `docs/legal/` is absent from the public repo by design, and the Niyamavali is ⛔ not ratified
([[feedback_niyamavali_rulebook_not_spec]]). Checked against `-231` C (*"Address is mandatory in claim filing form"*), `-232` G and `-253`
cl.1 instead — the "waits, never refused" shape is `-226` cl.7's for the bank accounts.

## Acceptance Criteria

### AC0 — Governance first (Task 0)
**Then** ONE author-commit decision (the next free id, read live at commit time — `-265` as of 2026-09-28) lands **D1–D29** with their current status — D13 **decided** (BigDev, 2026-09-27, *"split it
three ways"*); D5, D14, D15, D16 as **revised 2026-09-28** (below); D23 **confirmed** by `-260` G3; D27's keep **ratified** by `-260` G2; ⭐ D29
committed in its **`-260` G1 form** (the Super Admin decides a staff case — approve through the full gate incl. D14's check, or refuse;
⛔ never close), its first-written text kept as superseded — and the **eight** keys (D8 + keys 7, 8) with the slice that mints each
([[feedback_governance_commits_precede_implementation]])
**And** `epics.md` gains entries for **6.19a, 6.19b, 6.19c and 6.19d** under Epic 6, each with the `> ⚠ Minted by…` header (Epic 6's stale "16
stories" / FR list / cross-cutting lines are recorded, ⛔ not silently fixed)
**And** PRD §4.10 (*"Bulk-alert SMS — dropped"*) and architecture §3.4 (*"…they do not receive transactional-fallback SMS"*) each gain an
**annotation** naming **both** `-255` F7 **and** `-259` (`-259` consequence 3) — ⛔ never a rewrite
**And** `-257`'s three owed annotations land: `epics.md`'s *"five to fifteen"* note (Story 3.4), FR-4, and **Story 6.20's in-law/grandparent
pointer** (`epics.md` Story 6.20 item 7, *"the ratified fifteen"*)
**And** the fallback-handler ledger (AR-61, `docs/fallback-handler-ledger/`) gains `{primary_actor, fallback_actor, escalation_trigger}` rows
for the set's loop nodes: letter record; closure request; Pariwar Admin closure decision; Super Admin review / decision / direction; re-file
confirmation; ⭐ the **who-must-act mark** and its District Admin change (`-258`); the **staff run** (day-12 → Pariwar Admin, day-90 → Super
Admin); **"no correction needed"** and the Pariwar Admin's approve / keep; the Super Admin's **staff-case decision** (`-260` G1); and 6.19d's
**certificate reminder** and its **one letter** (`-259`)
**And** M and S are recorded as go-live gates in `docs/launch-gate-inventory/inventory-roster.md` (D24) — M's text includes *"whether the
agreement may be a condition of approval"*
**And** the DLT template registration request is started (T13 — external lead time), covering the correction reminder, the closure notice
and 6.19d's certificate reminder, each hi + en.

### AC1 — The contact record, the agreement and the relationship are captured at filing (`-232` G, `-253`, `-255` F8; go-live gated on M, S)
**Given** the family files in the app or the helpline operator files **Then** a contact record (D5) holds one **postal address per nominee
of the declaration as it stands at filing**, each child row **bound to a declaration VERSION** (the as-at-death determination, T12, may
⛔ not exist yet and can land mid-filing — the peer-mesh job moves `documents_pending` → `verification_in_progress` on its own), plus the
claimant side — **either** the claimant is one of the nominees (a version id) **or** the claimant block (name, mobile, address — all mandatory
then — and the claimant-to-nominee **relationship per nominee** from the **nineteen** values, D16)
**And** the filer's **agreement to be contacted** is recorded as a `claim_contact_agreement` consent (D15) **in the same transaction**, and
the contact row carries its `agreement_consent_id` (NOT NULL, FK) — ⭐ the agreement is **per claim**, ⛔ never read by subject (a refiled
claim for the same death gives it again — `-261` C3)
**And** each surface has its own route: member `POST /api/v1/member/claims/:claimCaseId/contact` (member session, `requireDeceasedMemberId`,
mismatch ⇒ 404); helpline `POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/contact` (`recordHelpline`, preHandler `[adminSession, scope,
canFileClaim (claim.file), stepUp]` — the DPDPA helpline precedent in `claims.helpline.routes.ts`, `grantedViaActor: 'staff_assisted'`)
— ⛔ not fields bolted onto the intake body, ⛔ not `claims`, ⛔ not `intake_attempts`
**And** the writer follows these **write rules** (D5) — one list, each rule reachable under the others:
- **W1 — the member binds to what the family SEES.** Each rank the member carries binds to that rank's **projected version** — the version
  the `member_nominees` row the family sees in `nomineesStatus()` was last written from. ⛔ Never "the highest `version_no`": a correction of
  an OLDER version takes `version_no` head + 1 but updates the projection only when its target WAS the head (`nominee-correction-persist.ts`,
  *"The projection row is updated ONLY when it IS the corrected declaration"*). ⇒ derive it by walking the rank's versions in `version_no`
  order: a `member` version becomes the projected one; a `correction` becomes it only when its `corrects_version_id` is the version
  immediately before it; a projected `vacated` version means the rank is empty. A new domain read (e.g. `getProjectedNomineeVersions` in
  `nominee/declaration-history.ts`) returns `{ rank, versionId }`. ⛔ Never the effective set either (a family typing "rank 1" must ⛔ never
  have the address attached to a different person's version). The member names its claimant side by `claimantNomineeRank` (it ⛔ never sees
  a version id), bound the same way.
- **W2 — the helpline binds by explicit id.** Each row names its `nomineeVersionId`, taken from the admin read. **Allowed** = the
  **effective** versions once the determination is `effective`, else the **projected** versions (W1). The claimant side is
  `claimantNomineeVersionId` (from the same allowed set) or the claimant block.
- **W3 — windows.** Member = `NOMINEE_BANK_COLLECTABLE_STATES`; helpline = that ∪ `TRUSTEE_ROUTABLE_STATES` (spread the two tuples, ⛔ never
  hand-typed) — every state from which P1, P3 or P4 can 409 on D14 (R9 reaches P4 from six states and bypasses P1; an appeal reversal
  re-enters at `reversed` without P1). Outside → **409 `claim_contact.not_writable`**, before any encryption. The helpline's **extra states**
  are `TRUSTEE_ROUTABLE_STATES` minus `NOMINEE_BANK_COLLECTABLE_STATES` = `verifier_approved`, `reversed`, `state_trustee_freeze`,
  `state_trustee_approved`.
- **W4 — rows.** Child rows are **UNIQUE `(contact_id, nominee_version_id)`**; every write **upserts the rows it carries and ⛔ never deletes a
  row it does ⛔ not carry** — a member re-POST can ⛔ never erase a helpline-added row. Rows for versions that prove ⛔ not effective stay,
  unused — unless the correction chain (W4a) carries them.
- **W4a — the correction chain.** Once a claim exists the declaration is LOCKED (`claim/nominee-lock.ts`), so after the contact record is
  written the only way a nominee is re-versioned is a 6.20 correction — the same person. ⇒ a row, or a claimant link, bound to version V
  **counts for** any version that corrects V, directly or transitively through `corrects_version_id`; when several versions of one chain
  carry a row, the one **nearest** the effective version wins (the effective version's own row first). ⭐ So a correction + a new
  determination ⛔ never orphans the address or the claimant link, and ⛔ nobody re-types the same person's address. D14 and 6.19b resolve
  rows through this chain; the admin read reports a chain-carried row as present.
- **W5 — add-only in the extra states.** There the helpline only **completes** the filing (the reason `claim.file` still gates it — D5; the
  6.8/6.9 precedent keeps `claim.file` for intake, `roles.ts`: *"CLAIM_FILE itself stays — it still gates the intake route"*): a write may
  insert a row or fill a column that is still null. A write that would change a set value to a **different** value is **refused whole —
  409 `claim_contact.add_only`, ⛔ nothing written**, ⛔ never silently dropped. ⭐ A value **identical** to the stored one is ⛔ not an
  overwrite (a network retry of a successful write succeeds). ⚠ Tier-1 envelope ciphertext differs on every encryption, so the comparison
  DECRYPTS the stored value — each an audited KMS decrypt — only for the fields the write carries, and only in the extra states. Inside `NOMINEE_BANK_COLLECTABLE_STATES` the helpline has full upsert, as the
  member does. The admin read tells the operator which fields can still be filled.
- **W6 — the claimant side and the parent CHECK.** Exactly one side is set ("claimant fields present ⇔ the claimant version is null"); every
  write that sets one side clears the other in the same statement — so switching (member, or helpline in the member's window) ⛔ never trips
  the CHECK. ⭐ In the **extra states** the side may change only as a **fill**, each recorded in the audit line:
  - **(a) creating** the row — either side (the claim may reach the extra states with ⛔ no contact record: a claim denied at P1, which is
    ⛔ never gated, then reversed on appeal, re-enters at `reversed`);
  - **(b)** the stored side is a claimant version that is ⛔ not effective, and the determination IS `effective` → the helpline may set
    `claimantNomineeVersionId` to an **effective** version (an operator path for a claimant the chain, W4a, does ⛔ not reach — a
    correction's re-versioning is carried automatically), **or** write the claimant block (the claimant is, as at the death, none of the
    nominees — e.g. the filer is the post-death nominee a determination set aside);
  - any other change of the side (an effective claimant version, or a stored claimant block) is a correction → **409 `claim_contact.add_only`**;
  - with a row present and the effective declaration ⛔ not `effective` (a 6.20 correction, open in `verifier_approved`, `reversed` and
    `state_trustee_freeze`, supersedes the determination) → **409 `claim_contact.awaiting_determination`**, nothing written — every stored
    version would otherwise read as "⛔ not effective"; the claim waits for the new determination the approval gate needs anyway.
- **W7 — the creating write.** It needs the agreement, the complete allowed nominee set, and **exactly one claimant side** → otherwise
  **400 `claim_contact.agreement_required`** / **`nominee_set_mismatch`** / **`claimant_required`** (checked before the INSERT, so the parent
  CHECK can ⛔ never surface as a 500). A row's address is required when the row is created → else **400 `claim_contact.address_required`**.
- **W8 — the agreement after creation.** Every member re-POST records a fresh `claim_contact_agreement` and repoints `agreement_consent_id`.
  A helpline `agreed` repoints it inside `NOMINEE_BANK_COLLECTABLE_STATES`, **or in any window when the stored agreement is REVOKED** (a
  revoked agreement counts as missing — the add-only rule's own "fill what is empty"), so `agreement_withdrawn` always has a way out;
  otherwise it is ignored (a confirmation, ⛔ not data) and the response says so. (Nothing revokes this type in v1 — the only claim-consent
  revoke route is limited to `DpdpaRevocableConsentType` — so only a direct DB change reaches it today.)
- **W9 — locale and provenance.** Both shapes carry `locale: 'hi' | 'en'` — the copy the filer was shown (`consentPayload.checkboxTextShown`
  + `locale`, the DPDPA precedent) and the SMS language. `contact_locale` follows every write inside `NOMINEE_BANK_COLLECTABLE_STATES` (member or
  helpline); in the extra states it is set only by the creating write. `recorded_by_actor` / `recorded_via` are set by the creating write; every later write's actor and surface go in its audit
  event, ⛔ never into those columns.
- **W10 — the audit unit.** `withCompensatingAudit` writes ONE intent line per write (to `audit_log_entries`); its `auditId` is the consent
  row's `audit_id` when the write records one. The contact-record and agreement events are **`emitAuthAudit`** events (`AuthAuditEventType`,
  AC9a) — ⛔ never a second `writeAuditEntry` inside `mutate`, which `access-wrapper-invariants` rule (3) fails. Precedent:
  `claims.dpdpa-consent.handlers.ts` (one intent line + `emitAuthAudit` secondary lines).
**And** ⭐ **two request shapes**, checked by the contract (→ **400**; the contract can ⛔ not see the declaration or the stored row — those are
the writer's, W1–W8): **member** (the full record) — `locale`; an address for **0–2** distinct ranks (the writer enforces exactly the projected
ranks — possibly none); exactly one of `claimantNomineeRank` or the claimant block (with a relationship per rank). ⚠ **No declared
nominee:** `nominee-review`'s empty state still lets the bank form continue, so a family with ⛔ no nominees reaches this step — the body then
carries ⛔ no ranks and the claimant block is required (there is no nominee to be); the step shows only the claimant form, so the family can
finish filing (the claim is unapprovable anyway — an `empty` declaration fails `assertClaimApprovable` first); `agreed: z.literal(true)`. **Helpline**
(possibly partial) — `locale`; at least one of: nominee rows (each `nomineeVersionId` + an optional `address` + an optional `relationship`,
at least one of the two), the claimant block, `claimantNomineeVersionId`, **or `agreed: true` alone** (W8); ⛔ never both claimant sides.
Validators are **INPUT-only**: `MobileNumber` for the claimant's mobile, `z.string().trim().min(1).max(500)` for every address (as
`NomineeDeclareEntry`), the claimant's name a trimmed bounded string, ⛔ not `EnglishScriptName` (D9). ⚠ Response schemas are PARSED
(`apps/api/src/plugins/zod-openapi/index.ts`) — the read DTOs use plain bounded strings, so the decrypt-failed sentinel ⛔ never 500s
**And** the boundary is D14's: a NEW exported domain check (e.g. `assertClaimContactRecorded(db, pariwarId, claimCaseId)` — it reads
`getEffectiveNomineeDeclaration` itself, since `assertClaimApprovable` returns nothing to the call sites; one extra query per approval)
runs **after** `assertClaimApprovable` at P1 (`adjudicateClaim`), P3 (`voteOnFrozenClaim`) and P4 (`finalizeR9Outcome`), approve-only, and
passes only when (rows are resolved per effective `versionId` through the correction chain, W4a — ⛔ never a row count, since rows bound to
projected versions that proved ⛔ not effective stay in the table): a contact row exists; its agreement consent exists and is ⛔ not revoked; **every EFFECTIVE nominee's `versionId`** has an
address row (its own or chain-carried); and **either** (the claimant's version is one of the effective nominees' versions, or in one's
correction chain) **or** (the claimant fields are present
**and** every effective nominee's row carries the claimant-to-nominee relationship). Otherwise it throws
`ClaimContactRequiredError` (a `reason` of `no_record | agreement_withdrawn | nominee_address_missing | claimant_details_missing` —
⛔ never a name; when several apply, the FIRST in that order is reported), mapped to
**409 `<route>.claim_contact_required`** — `verifier_decision.`, `cycle_freeze.`, `r9_voting.` — in the three handlers' error mappers, as
`…death_certificate_acceptance_required` is. A claim that lacks it **waits, ⛔ never denied**; a deny is ⛔ never gated
([[feedback_mechanization_split_commitment]])
**And** the admin screens that show the gate's reasons (`VerifierConsoleRoute.tsx`, `CycleFreezePage.tsx`, `R9CasePanel.tsx`, via
`claim-verification/nominee-errors.ts`) match `endsWith('.claim_contact_required')` and say why the claim waits and that the helpline can add
the details — English-only staff copy
**And** the member app gains a NEW **`contact`** step between `nominee-review` and `acknowledgement` (7 steps): `CLAIM_STEPS`, the hard-coded
next routes (`nominee-review.tsx` → `contact`, `contact` → `acknowledgement`), `contact.tsx` saves `lastStep: 'contact'`,
`claim-steps.test.ts` (list, `{1,7}`/`{7,7}`, the chain), and `(claim)/index.tsx`'s resume — ⭐ fix the pre-existing resume gap while there
(every `lastStep` resumes at `nextClaimStep`; today `relationship` and `nominee-review` fall through to `handover-otp`); the draft stays
**PII-free** (the contact form is never cached in MMKV). The step's nominee slots come from `memberAuth.nomineesStatus()` (rank +
relationship); ⚠ `addressPresent` may be true — the step asks for the address anyway (`-232` G), ⛔ never copies the declared one silently
**And** the claimant-to-nominee question fixes its **direction** in both locales — *"The claimant is the nominee's …"* — because half the
values are inverse pairs (son/father, son-in-law/father-in-law, grandchild/grandparent, niece_nephew/uncle·aunt)
**And** the helpline gets a new card (a sibling after the shell, beside `HelplineNomineeCorrection` / `HelplineCertificateReplacement`) with
the agreement read aloud from the same copy
**And** Tier-1 ciphertext (`piiColumn(1, 'claim_contact')`, a `CLAIM_CONTACT_FIELD_CLASS` constant beside `CLAIM_NOMINEE_BANK_FIELD_CLASS` in
`apps/api/src/context.ts`, a `claim-contact-crypto.ts` on the `nominee-bank-crypto.ts` precedent incl. its decrypt-failed sentinel), RLS +
FORCE, encrypt-before-insert; a read DTO only behind the gated, audited admin route (AC8a) — echoed to ⛔ no member or public surface; ⛔ no
log, event, audit line or error body carries a value; ⛔ no backfill
**And** ⚠ this slice builds the check; the **other** writers that must call it are owed by the siblings: 6.19b's letter writer, 6.19c's
closure writers and its three NEW approval writers (the `-251` Super Admin approve, D27's "no correction needed" approve, `-260` G1's
staff-case approve). "The full gate" there means `assertClaimApprovable` **and** this check.

### AC10 — Nothing else moves
**Then** ⛔ no new lifecycle state, ⛔ no new claim event type (recording the agreement emits ⛔ no `claim.dpdpa_consent_recorded`), ⛔ no new
`AlertCategory`, ⛔ no `SMS_DLT_TEMPLATE_REGISTRY` entry; `assertClaimApprovable` is **unchanged**; `voteOnFrozenClaim`, `adjudicateClaim` and
`finalizeR9Outcome` behave exactly as today **except D14's one check, run after `assertClaimApprovable` on approve only** — so every existing
refusal reason and its error code is unchanged when several are missing at once; 6.16's one-journey rule is unchanged; `-226` cl.1/cl.6 and
`-227` cl.2 are unchanged; the DPDPA consent routes, their GET presence view and `DpdpaConsentType` are unchanged; ⛔ nothing is automatic.

### AC13 — `-257` (N1): the nominee list is twenty, and the claimant list is derived from it
**Then** `NOMINEE_RELATIONSHIP_CODES` carries the **twenty** values of `-257` cl.1 (new wire codes `brother_in_law`, `son_in_law`,
`mother_in_law`, `father_in_law`, `grandparent`), the domain mirror matches (the lockstep test passes), and the nominee picker offers all
twenty with **en + hi** copy (reviewed Hindi kin terms that **cover** what the English covers — a narrower label pushes a Hindi member to
`other`, which forecloses correction; parity and microcopy green)
**And** the claimant-to-nominee enum is **derived** in contracts, beside `NomineeRelationship` in `packages/contracts/src/nominee/declaration.ts`:
`export const ClaimantNomineeRelationship = NomineeRelationship.exclude(['other'])` and `export const CLAIMANT_NOMINEE_RELATIONSHIP_CODES =
ClaimantNomineeRelationship.options` — an equality test proves it equals the twenty minus `other`, ⛔ never a hand-typed second list — and
`NomineeForm.tsx`'s `KNOWN_RELATIONSHIPS` is re-pointed at `CLAIMANT_NOMINEE_RELATIONSHIP_CODES` (⛔ never a third copy). ⚠
`apps/mobile/tests/unit/nominee-history-copy.test.ts` pins that line's **source text**
(`/export const KNOWN_RELATIONSHIPS = RELATIONSHIPS\.filter\(\(r\) => r !== 'other'\)/`) — rewrite the pin to the new export and keep its
point (the value EXCLUDES `other`, asserted on the value, ⛔ not only the name); `KNOWN_RELATIONSHIPS` also feeds the correction picker
(`app/(life-events)/nominee-correction.tsx`), which must still offer twenty minus `other`
**And** `other` still forecloses a correction (the 6.20 test stays green), `ClaimantRelationship` is unchanged, ⛔ no migration, ⛔ no backfill
**And** `declaration.ts`'s *"Still OPEN"* note is marked DISCHARGED by `-257`, ⛔ not deleted; its doc-block's value list, `relationship.ts`'s
header (*"FIFTEEN … `-237` cl.1–2"*), `NomineeForm.tsx`'s *"FIFTEEN"* comment, `(claim)/nominee-review.tsx`'s *"one of the fifteen NOMINEE codes"*,
`packages/domain/src/nominee/index.ts`'s *"fifteen-value relationship vocabulary"* and `member_nominees.ts:62`'s stale five-value comment are
corrected; `openapi/v1.yaml` is re-emitted (`pnpm contracts:emit-openapi`) so `contracts:check-openapi-determinism` stays green.

### AC8a — The surfaces (this slice)
**Then** the member app gains the `contact` step (AC1) and the resume fix; the helpline gains the contact card with the agreement read aloud
from the same copy; **two gated, audited admin reads** of the contact record — ⛔ never a member or public read:
**(i) presence-only** under `claim.view_nominee_name_check` (district dimension via `resolveNomineeNameCheckDistrict`; all four holders) — the
**allowed versions** (each nominee's `rank` + `nomineeVersionId`: the effective ones once determined, else the projected ones) with
`address_present` and `relationship_present`, which claimant side is set, whether the claimant block is needed, and the agreement's state
(live / revoked) — ⛔ no plaintext, so staff see exactly what the approval check will ask for; **(ii) plaintext** (decrypted, audited
per read) under `claim.file` — the helpline operator's read-back, the one surface that re-types these fields. ⚠ The key's own rationale
warns against acquiring a second living subject's plaintext *"as a side effect"* (`packages/domain/tests/rbac/permissions.test.ts`) —
hence ⛔ no plaintext for `verifier` / `pariwar_admin` / `district_admin` through the reused key; D8 records this reuse-check and the key's
doc-block is amended. 6.19b's letter form reads the address under its own key (1) (`district_admin`), ⛔ not this one;
staff copy **English-only** in the module's `i18n-en.ts`; member copy **en + hi**
**And** semantic accessibility (family 13): a labelled container is `accessible={true}` (mobile); every interactive role has a real handler;
every reachable state (`saved`, `incomplete`, `agreement required`, `step-up required`, `not writable`) is **announced**; WCAG AA (UX-DR67).

### AC9a — PII and audit posture (this slice)
**Then** new `AuthAuditEventType` entries for the contact record (member + helpline), the agreement **and the admin read**, each with
`resourceLocator: 'claim:<lower-case uuid>'` (anything else is silently replaced); every write + audit pairing goes through
`withCompensatingAudit` — ONE intent line per write, the rest `emitAuthAudit` events (W10; `access-wrapper-invariants` rule (3) scans
`apps/api/src/modules/claims` — a direct `audit.writeAuditEntry` fails it); the plaintext read (AC8a (ii)) audits every decrypt; a live-DB test **plants** a claimant name, mobile, address and a nominee address as real-plaintext sentinels and finds them in ⛔ no log,
event, audit line or error body; the **RTBF gap** for the contact tables is recorded in Dev Notes and `deferred-work.md`, ⛔ not fixed.

### AC11a — The proof (this slice)
**Then** live-DB specs on `twt-test-pg :5433`, **executed**, `{ timeout: 20000 }` on each new domain live spec:
- **Schema** — the contact tables' migration-level policy spec: RLS positive / negative / fail-closed / FORCE; FKs incl.
  `agreement_consent_id` and the version FK; UNIQUE `(contact_id, nominee_version_id)`; CHECKs incl. the parent's "claimant fields present ⇔
  the claimant version is null".
- **The error partition** (one test per code) — **400** = the request's shape (every incomplete body, the contract) **and** what the writer
  checks against the declaration or requires of a creating write: `nominee_set_mismatch` (member ≠ the projected ranks; helpline outside the
  allowed set), `agreement_required`, `claimant_required`, `address_required`. **409** = the claim's state or a conflict with the stored row:
  `not_writable`, `add_only`, `awaiting_determination`.
- **Binding (W1, W2)** — a 6.20 correction of an OLDER version (its `version_no` is now the rank's highest while the member's list still
  shows the member's later declaration) ⇒ a member write binds to the **projected** version, ⛔ not the correction. The post-death-change case:
  the effective nominee is an **earlier** version ⇒ P1 409s `nominee_address_missing`, the admin read shows that version without an address,
  the helpline adds it **by `nomineeVersionId`** in `verifier_review`, and the approval then passes.
- **Rows (W4, W5)** — a member re-POST ⛔ never deletes a helpline-added row; in the extra states a helpline write changing a set value to a
  **different** one is 409 `add_only` with the row proven unchanged, and an **identical** retry succeeds with the row unchanged; a
  relationship-only row fills an existing row and is 400 `address_required` on a missing one; the same writes in `verifier_review` may
  overwrite (full upsert).
- **The claimant side (W6, W7)** — a member switching `claimantNomineeRank` ⇄ the claimant block keeps the parent CHECK each time; a creating
  helpline write with ⛔ no claimant side is 400 `claimant_required` (⛔ never a 500); **(a)** a claim denied at P1 with ⛔ no contact record and
  reversed on appeal gets its first write at `reversed` (with `claimantNomineeVersionId` or the claimant block) and P3's approval then passes;
  **(b)** the claimant is nominee rank 1 at V1 with V1's address, a 6.20 correction in `verifier_approved` + a new determination make V1′
  effective ⇒ P3 **passes with ⛔ no helpline action** (the chain, W4a, carries V1's row and the claimant link to V1′); a two-step chain
  (V1 → V1′ → V1″) does too; a row written for V1′ afterwards wins over V1's (nearest); a claimant bound to a version outside every
  effective chain ⇒ P3 409s `claimant_details_missing` ⇒ the helpline sets `claimantNomineeVersionId` to an effective version (a fill) ⇒ it
  passes; the same state with the claimant as
  none of the nominees ⇒ the claimant block + the relationships (filled on the counted rows, own or chain-carried) ⇒ it passes; a member
  with ⛔ no declared nominee submits zero ranks + the claimant block and reaches `acknowledgement`; either side over an **effective**
  claimant version or over a stored claimant block ⇒ 409 `add_only`; any claimant-side write while the determination is superseded ⇒ 409
  `awaiting_determination`, then succeeds after the new determination.
- **The agreement (W7, W8)** — a first write without it is 400 `agreement_required`, in the extra states too (the R9 and reversal cases); a
  member re-POST repoints to a fresh consent; a helpline body of `agreed: true` **alone** is accepted — ignored over a live agreement in the
  extra states (the response says so), and over a REVOKED one (`revoked_at` set directly) it records a fresh consent, repoints, and the
  `agreement_withdrawn` 409 clears; a refiled claim for the same death is ⛔ not satisfied by the first claim's agreement.
- **The approval check (D14)** — **409 `<route>.claim_contact_required`** at P1, P3 and P4 with the claim left **waiting** (⛔ no state move,
  ⛔ no denial); one test per `reason`, each fixture satisfying every EARLIER condition of the pinned precedence (`no_record` ≻
  `agreement_withdrawn` ≻ `nominee_address_missing` ≻ `claimant_details_missing`); a row bound to a projected version that is ⛔ not effective
  does ⛔ not satisfy it (rows selected by effective `versionId`).
- **Audit (W10, AC9a)** — one intent line per write, the `emitAuthAudit` events, the consent row's `audit_id` = the intent `auditId`.
- **Existing gates stay green** — the agreement's copy lockstep (byte-identical en/hi ↔ the server constant); the preserved-consent-types
  test; the contracts consent lockstep (`packages/contracts/tests/consent.test.ts`, pgEnum ↔ `ConsentTypeSchema`) **and its exact-list pin,
  updated** (Task 2); the claimant-to-nominee equality test; **cross-Pariwar** and **non-human/system-actor** denial per new route; every new
  route file classified in the human-actor gate (`unclassifiedRouteFiles()` fails otherwise; a route added to an existing file needs its
  `expectedMethods`); the i18n **real-`t()` leg** in both locales; `claim-steps.test.ts` pins seven steps and the chain.
**And** ⭐ every existing approval spec stays green because **both** seed helpers seed a complete contact record by default, with a
`contact: 'skip'` opt-out — `seedNomineeNameCheck` in `packages/domain/tests/integration/_helpers.ts` **and** its API twin in
`apps/api/tests/integration/_nominee-name-check-fixture.ts` (ten API specs, incl. `verifier-decision`, `cycle-freeze` and `r9-voting`, which
approve over HTTP). The binding is keyed on the **effective status**, ⛔ not on an option: effective ⇒ the effective versions, else the
projected ones (`certificate: 'skip'` leaves the claim undetermined too). The API twin's `skip: true` stays a pure no-op; its
`accountsOnly` / `singleAccount` modes seed the contact like the default (D14 runs after the gates those modes exercise, so it is inert
there) — the precedent 6.21a set for the certificate (`certificate: 'skip'`).

## Tasks / Subtasks

- [ ] **Task 0 — Governance first, for the WHOLE 6.19 set** (AC0) — ⛔ no code in 6.19a, b or c before it
  - [ ] Re-run `git diff --name-only c136b03c..HEAD -- packages apps scripts` (empty at `6752e0d6`); re-read anything it lists that the shared spec cites.
  - [ ] Write ONE author-commit decision (the next free id, read live — `-265` as of 2026-09-28): D1–D29 with the statuses in AC0 (D5/D14/D15/D16 as revised 2026-09-28; D29 in its `-260` G1 form); the **eight** keys and which slice mints each (6.19b: keys 1, 7; 6.19c: keys 2–6, 8).
  - [ ] `epics.md`: entries for 6.19a–d with the `> ⚠ Minted by…` header; `-257`'s three annotations (Story 3.4's *"five to fifteen"*, FR-4, Story 6.20 item 7); PRD §4.10 and architecture §3.4 annotations naming `-255` F7 **and** `-259` (⛔ never a rewrite).
  - [ ] AR-61 ledger rows for every loop node AC0 lists; M (incl. "a condition of approval") and S in `docs/launch-gate-inventory/inventory-roster.md` (D24).
  - [x] ✅ The two routing notes were sent and **ruled 2026-09-27**: V → `-258`, CC1 → `-259`; G1–G6 → `-260`.
  - [ ] Sweep the siblings in the same commit (this Task owns the whole set's governance): 6.19b's preflight still checks for *"author-commit (D1–D24, the six keys)"* → D1–D29 and eight keys, and its letter writer must name D14's check; 6.19b's letter form reads the plaintext address under its own key (1), ⛔ never `claim.view_nominee_name_check` (AC8a); 6.19c's closure code `claim_contact.required` → the per-route `…claim_contact_required` form, its D29 → the `-260` G1 form, and its three new approval writers call D14's check.
  - [ ] Start the DLT template registration (T13) — record the date; it gates 6.19b's and 6.19d's real sends, ⛔ not any build.
- [ ] **Task 1 — Migrations from 0124** (AC1) — the contact table (one row per claim; `claimant_nominee_version_id` nullable; the claimant's Tier-1 fields; `agreement_consent_id` NOT NULL FK → `consent_records`; `contact_locale`; `recorded_by_actor`, `recorded_via`) + its per-nominee child (`nominee_version_id` FK → `member_nominee_versions`, **UNIQUE `(contact_id, nominee_version_id)`**, the Tier-1 address, the claimant-to-nominee `relationship` text, nullable); RLS hand-supplement (`ENABLE` → `GRANT`/`POLICY` → `FORCE`), own policy file (model `claim-nominee-bank-rls.ts`); `ADD VALUE IF NOT EXISTS 'claim_contact_agreement'` to `consent_type` in its **own** file; journal entry each; ⛔ never regenerate an applied migration; the migration-level policy spec.
- [ ] **Task 2 — Capture at filing** (AC1, AC8a, AC9a, AC10)
  - [ ] Consent type (D15): `consentTypeEnum` + contracts `ConsentTypeSchema` (the lockstep in `packages/contracts/tests/consent.test.ts` pins them equal) — ⚠ the SAME file also pins `ConsentTypeSchema.options` by an **exact** list (*"consent_type declares the seven AC1 values + …"*): append `claim_contact_agreement` there with a one-line comment, as 6.9 and 11b.1 did; ⛔ not `DpdpaConsentType` (its `Record`-total `DPDPA_CONSENT_COPY` and the DPDPA GET view's `ALL_TYPES` would change a shipped surface); ⛔ not `CLAIM_TIME_CONSENT_TYPES` (pinned by exact `toEqual`; it derives the `claim.dpdpa_consent_recorded` payload). Its own versioned copy constant + `claim.json` en + hi keys + a byte-identical lockstep test (the `dpdpa-consent-copy` precedent), marked *"pending Story 0.13"*.
  - [ ] Contracts (⛔ no `@twt/domain` import): the **two** request shapes (AC1) — member (full: `locale`, `claimantNomineeRank`, `agreed: true`) and helpline (partial: `locale`, rows by `nomineeVersionId`, `agreed: true` alone allowed) — `MobileNumber` and the address validator INPUT-only; the claimant-to-nominee enum (Task 3b); the two admin read DTOs (presence-only; plaintext) with plain bounded strings (responses are parsed — the decrypt-failed sentinel must parse). Re-emit `openapi/v1.yaml`.
  - [ ] Domain: `getProjectedNomineeVersions` (W1 — the version each `member_nominees` row was last written from; ⛔ never max `version_no`); the correction-chain resolver (W4a: walk `corrects_version_id`, nearest row wins), shared by D14 and the admin read; the writer under the claim lock, implementing **W1–W9** exactly (member → projected versions; helpline → explicit allowed `nomineeVersionId`; upsert-only rows; add-only in the extra states with identical values ⛔ not overwrites; the claimant-side fills (a)/(b) and the parent CHECK's two sides cleared in one statement; `awaiting_determination`; the creating write's `agreement_required` / `nominee_set_mismatch` / `claimant_required` / `address_required`; the agreement repointing incl. a revoked agreement; `locale` and provenance); the window tuples; `assertClaimContactRecorded` (reads the effective declaration itself; rows by effective `versionId`; the pinned reason precedence) + `ClaimContactRequiredError`, called **after** `assertClaimApprovable` at P1/P3/P4 (⛔ not inside it, ⛔ not inside `isReturnedClaimResubmitted`'s inner helper).
  - [ ] API: `claim-contact-crypto.ts` + `CLAIM_CONTACT_FIELD_CLASS`; member + helpline routes + the two admin reads (presence-only under `claim.view_nominee_name_check`; plaintext under `claim.file`) (new route file(s) classified in `scripts/claim-adjudication-human-actor-invariant/check.ts`); the three error mappers; the audit unit (W10: one `withCompensatingAudit` intent line + `emitAuthAudit` events; the consent's `audit_id` = the intent `auditId`).
  - [ ] Admin: the helpline card; the three console screens' `…claim_contact_required` message (`nominee-errors.ts`).
  - [ ] Mobile: `(claim)/contact.tsx` (direction-fixed relationship question; `saveClaimDraft({ lastStep: 'contact' })`), `CLAIM_STEPS`, `nominee-review.tsx`'s next route, `claim-steps.test.ts`, the `(claim)/index.tsx` resume fix.
  - [ ] Test helpers: **both** `seedNomineeNameCheck`s — `packages/domain/tests/integration/_helpers.ts` and `apps/api/tests/integration/_nominee-name-check-fixture.ts` — seed the contact record by default (effective versions when effective, else projected; `contact: 'skip'` opt-out; the API twin's `skip: true` stays a no-op) (AC11a).
- [ ] **Task 3 — `-257` (N1)** (AC13) — (a) `NOMINEE_RELATIONSHIP_CODES` + the domain mirror to twenty; the *"Still OPEN"* note DISCHARGED; the stale "fifteen"/five-value comments fixed (`declaration.ts` doc list, `relationship.ts` header, `NomineeForm.tsx`, `(claim)/nominee-review.tsx`, `packages/domain/src/nominee/index.ts`, `member_nominees.ts:62`). (b) The derived claimant-to-nominee enum (`ClaimantNomineeRelationship` / `CLAIMANT_NOMINEE_RELATIONSHIP_CODES`, AC13) + the equality test; `KNOWN_RELATIONSHIPS` re-pointed at it, and `nominee-history-copy.test.ts`'s source-text pin on that line rewritten to the new export (still asserting the value excludes `other`); the correction picker (`app/(life-events)/nominee-correction.tsx`) still offers twenty minus `other`. (c) The picker + **en + hi** copy for the five new values — reviewed kin terms that cover the English: e.g. `brother_in_law` — जीजा / देवर / जेठ / साला / नंदोई / साढ़ू; `son_in_law` — दामाद; `mother_in_law` — सास; `father_in_law` — ससुर; `grandparent` — दादा / दादी / नाना / नानी. (d) Every site: `NomineeForm.tsx`, `nominee-history-copy.test.ts` (the "FIFTEEN" test → twenty; extend the Hindi-coverage test to `brother_in_law` and `grandparent`), `NomineeDeclarationPanel.tsx` + its `i18n-en.ts` + test, `nominee-relationship-lockstep.test.ts`, `nominee-correction.spec.ts`, `nominee-lock.spec.ts` (its "fifteen-value" title), `common.json` ×2, `openapi/v1.yaml`. ⭐ After Task 0 like every code task, and before Tasks 1–2 (Task 2's relationship picker consumes it); it needs ⛔ no author decision.
- [ ] **Task 4 — Tests** (AC9a, AC11a) — **execute** on `twt-test-pg :5433`; record the RTBF gap in `deferred-work.md`.
- [ ] **Task 5 — Friction budget** — one named-payer row for the `contact` step (addresses, maybe a claimant's details, the agreement) — `friction-budget.md` / `friction-budget.yaml`, best-ever ratchet ([[project_friction_budget_baseline_ratchet]]) — the gate computes its own baseline from committed history, so ⛔ no
number is carried here; done = `pnpm friction:test && pnpm friction:check` green (the `friction-budget` step of `scripts/ci-local.sh`).

**AC ↔ Task map:** AC0 → T0 · AC1 → T1, T2 · AC8a → T2 · AC9a → T2, T4 · AC10 → T2 · AC11a → T4 · AC13 → T3 · T5 → the friction gate (no AC; the budget gate is its own check).

## Dev Notes

### Dependency and sequencing
Nothing upstream (6.18, 6.20, 6.21a/b are merged). Task 0 first (⛔ no code in 6.19a, b or c before it) → Task 3 → Task 1 → Task 2 → Tasks 4–5. ⭐ 6.19b starts only when this
slice is `done` — its recipients and letter addresses come from this table.
⚠ **Three backlog rows touch the same three approval sites** — whichever lands second rebases onto the other; ⛔ none drops another's check:
row `6-26` (`-263` FQ9: ⛔ no approval before the ground inspection is complete — a check **inside** `assertClaimApprovable`, and the same
`seedNomineeNameCheck`s); row `6-23` (`-262` FQ2 + `-264` FQ12: a reason and a required note to approve while any warning shows, at P1); row
`6-24` (`-262` FQ5: the true nominee's claim waits at final approval for the appeal).

### Traps specific to this slice
- ⚠ **The effective declaration does ⛔ not exist at filing.** `getEffectiveNomineeDeclaration` returns `undetermined` (no entries) until the
  District Admin's determination, recordable only in `CLAIM_REVIEW_WINDOW_STATES` (from `verification_in_progress`). Capture binds to the
  declaration's versions as they stand at filing; D14 compares against the **effective** set at approval, when it exists (the name-check
  gate already requires it). ⛔ Never bind a MEMBER write through the effective read — the helpline's allowed set (W2) and the claimant-side
  fills (W6) DO read it.
- ⚠ **Two binding rules, one table.** The member binds to what it SEES (the projected versions, W1 — ⛔ not the highest `version_no`); the
  helpline binds to what the APPROVAL CHECKS (effective versions, by explicit id). Rows for a projected version that turns out ⛔ not to be
  effective stay, unused — D14 and 6.19b read only
  the effective versions' rows. ⛔ Never map a member's rank onto the effective set: after a post-death change that attaches one person's
  address to another person's version.
- ⚠ **"Not effective" does ⛔ not mean "a different person".** After filing the declaration is locked, so the only re-versioning is a 6.20
  correction — the same person. The correction chain (W4a) carries rows and the claimant link automatically; W6 (b)'s fill is the
  operator's path for anything the chain does ⛔ not reach — ⛔ never force a claimant block on a claimant who IS a nominee (it would ask
  their relationship to themselves — `-253`: *"when they are the same person there is no relationship to ask"*).
- ⚠ **The agreement is per claim.** `consent_records` has ⛔ no claim column; `consent_artifact_ref` is a provenance back-link, ⛔ never a query
  key; the subject is the deceased. ⇒ read the agreement only through the contact row's `agreement_consent_id`.
- ⚠ `nominee-correction-persist.ts`'s *"Re-examine it when the Panel takes up `-237`'s open in-law/grandparent item"* has fired (`-257`) and
  been answered (`-261` C1 ratified the proposed-side `other` refusal). ⛔ Not this slice's to edit — `-261` consequence 2 gives it to row `6-23`.

### Files
**UPDATE:** `packages/contracts/src/nominee/declaration.ts`, `packages/contracts/src/consent/consent-record.ts` (`ConsentTypeSchema`),
`packages/domain/src/nominee/relationship.ts`, `packages/domain/src/schema/{member_nominees.ts (comment only),consent_records.ts,index.ts}`,
`packages/domain/src/policies/index.ts`, `packages/domain/src/claim/{verifier-decision-persist,state-trustee-decision-persist,r9-voting-persist}.ts`
(P1, P3, P4 — one call each), `packages/domain/src/claim/errors.ts`, `packages/domain/src/nominee/{declaration-history,index}.ts`
(`getProjectedNomineeVersions`; the stale comment), `packages/domain/src/rbac/permissions.ts` (the `claim.view_nominee_name_check` doc-block's
reuse-check only — ⛔ no catalog bump), `packages/domain/tests/integration/_helpers.ts`, `apps/api/tests/integration/_nominee-name-check-fixture.ts`,
`packages/contracts/tests/consent.test.ts` (the exact-list pin), `apps/mobile/tests/unit/nominee-history-copy.test.ts` (the source-text pin),
`apps/api/src/context.ts`, `apps/api/src/modules/claims/{claims.verification-decision,claims.cycle-freeze,claims.r9-voting}.handlers.ts` (error
mappers), `apps/api/src/audit/audit-sink.ts`, `apps/mobile/lib/claim-steps.ts`, `apps/mobile/app/(claim)/{index,nominee-review}.tsx`,
`apps/mobile/tests/unit/claim-steps.test.ts`, `apps/mobile/components/life-events/NomineeForm.tsx` (and check `app/(life-events)/nominee-correction.tsx`, its consumer),
`apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx`, `apps/admin/src/modules/claim-verification/{NomineeDeclarationPanel.tsx,i18n-en.ts,nominee-errors.ts}`,
`apps/admin/src/routes/VerifierConsoleRoute.tsx`, `apps/admin/src/modules/cycle-freeze/CycleFreezePage.tsx`, `apps/admin/src/modules/r9-voting/R9CasePanel.tsx`,
`packages/i18n/locales/{en,hi}/{claim,common}.json`, `scripts/claim-adjudication-human-actor-invariant/check.ts`, `openapi/v1.yaml`,
`friction-budget.md`, `friction-budget.yaml`.
**NEW:** the contact tables + RLS policy file; `packages/domain/src/claim/claim-contact*.ts` (writer, check, windows); `apps/api/src/modules/claims/claims.contact.{handlers,routes}.ts`
and `claim-contact-crypto.ts` (names are the developer's); the agreement copy constant + its lockstep test; `apps/mobile/app/(claim)/contact.tsx`;
the helpline contact card.
**⛔ NEVER edit:** `ClaimantRelationship` or its comment; `assertClaimApprovable`; `DpdpaConsentType`, `DPDPA_CONSENT_COPY`, `CLAIM_TIME_CONSENT_TYPES`;
`lib/claim-draft.ts`'s PII-free shape; `nominee-correction-persist.ts` (row `6-23`'s).

### Testing standards
As the shared spec's *Testing standards*. The copy-lockstep exemplar is `apps/api/tests/unit/dpdpa-consent-copy.test.ts`; the seed-helper
precedent is `seedNomineeNameCheck`'s `certificate` / `determination` defaults. ⚠ Assert membership, ⛔ not counts (shared `PARIWAR_A`).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-27 | Split from Story 6.19 v0.9 (D13, BigDev: *"split it three ways"*). ACs AC0, AC1, AC10, AC13 carried verbatim; AC8a/AC9a/AC11a restated for this slice; Tasks re-cut. Status `ready-for-dev`. |
| v1.1 | 2026-09-28 | **Validate pass (create-story), all 19 findings applied at BigDev's direction.** Code claims re-derived at `6752e0d6` (the code diff since the pin was empty). ⭐ **Critical:** (1) the effective declaration is `undetermined` at filing ⇒ capture binds to the declaration's **versions**, D14 compares against the effective set at approval (D5/D14 revised; the "post-death change is offered no slot" test replaced by the version-binding test); (2) D15 revised — the agreement widens the pgEnum + `ConsentTypeSchema` only, ⛔ not `DpdpaConsentType` / `CLAIM_TIME_CONSENT_TYPES`, and is linked per claim through `agreement_consent_id` (`-261` C3); (3) AC10 restated for this slice (D14's one check after `assertClaimApprovable`; the "third helper" option dropped); (4) per-route `…claim_contact_required` codes + the three mappers and three admin screens; (5) `seedNomineeNameCheck` seeds the contact by default; (6) header/AC0 brought up to `-258`–`-260` (D29 in its G1 form, eight keys, 6.19a–d entries, `-259` in the annotations, the AR-61 nodes, `-257`'s third annotation). **Enhancements:** the write windows + replace-on-re-POST; the policy sentence states that declining the agreement blocks approval (M widened); the relationship question's direction; reuse of `MobileNumber`, the address validator and `KNOWN_RELATIONSHIPS`; Task 3's missed sites (`openapi/v1.yaml`, stale comments, the Hindi-coverage test); field class + crypto + `withCompensatingAudit` + a read audit type; the helpline guard named; `addressPresent`; sequencing with row `6-26`. Siblings noted, ⛔ not edited: 6.19b's header still says "D1–D24, the six keys" and its letter writer does ⛔ not yet name D14's check; 6.19c still lists D29 as proposed and names `claim_contact.required` for its closure. |
| v1.2 | 2026-09-28 | **Re-validation of v1.1 (all 5 applied at BigDev's direction) — every finding was v1.1's own.** ⭐ (1) v1.1 bound every write to the head version, so the helpline could ⛔ never supply the effective nominee's address and AC11a's new test was unpassable; and a member write mid-verification could attach an address to the wrong person's version. ⇒ two binding rules (member → heads; helpline → explicit `nomineeVersionId` from the allowed set), UNIQUE `(contact_id, nominee_version_id)`, upsert-only writes, and an admin read that lists each allowed version with `address_present`. (2) The nominee-set check moved from the contract to the writer (`claim_contact.nominee_set_mismatch`). (3) `claim.file` kept for the post-intake helpline window, recorded in D5 as *completing* the filing — post-intake helpline writes are add-only (option (a); a ninth key was the alternative). (4) `agreement_withdrawn` added to the reasons. (5) The seed helper binds to heads under `determination: 'skip'`. |
| v1.3 | 2026-09-28 | **Third validate pass (all 3 applied at BigDev's direction) — every finding was v1.2's own.** ⭐ (1) v1.2's add-only rule could ⛔ not supply the claimant block (the parent CHECK rejects claimant fields beside a set claimant version) nor fill the relationship on existing rows, and D14 never required the relationship ⇒ "add-only" = insert or fill a null column; the claimant-block write also nulls `claimant_nominee_version_id` (the one permitted overwrite, audited); D14 requires the relationship on every effective row when the claimant block is present. (2) "Post-intake" was undefined and, read literally, would make a phone filing add-only ⇒ the helpline has full upsert inside `NOMINEE_BANK_COLLECTABLE_STATES` and is add-only only in the extra `TRUSTEE_ROUTABLE_STATES`. (3) D14's check reads the effective declaration itself (`assertClaimApprovable` returns nothing). |
| v1.4 | 2026-09-28 | **Fourth validate pass (all 3 applied at BigDev's direction) — every finding was v1.2/v1.3's own.** ⭐ (1) v1.2/v1.3 defined partial helpline writes (the claimant block alone, one nominee row) under a contract written for one full submission, so three AC11a helpline tests would 400; and the agreement was undefined after the first write ⇒ two request shapes (member full with `agreed: true`; helpline partial by `nomineeVersionId`, `agreed` optional), `agreement_required` on the write that creates the row (incl. the R9 case in the extra states), repointing rules (member re-POST repoints to a fresh consent; helpline only inside the member's window). (2) The member sends `claimantNomineeRank`, the helpline `claimantNomineeVersionId`. (3) D14's predicate parenthesised. |
| v1.5 | 2026-09-28 | **Fifth validate pass (both applied at BigDev's direction) — both findings were v1.2–v1.4's own.** ⭐ (1) A helpline nominee row required its address, so filling a missing relationship in the extra states meant re-sending the address, which add-only refuses ⇒ helpline rows take an optional `address` and an optional `relationship` (the address required only to create the row). (2) An add-only overwrite had ⛔ no specified outcome, and `claimantNomineeVersionId` in the extra states could only ever violate the parent CHECK ⇒ both are refused whole, **409 `claim_contact.add_only`**, nothing written; `agreed` on an existing row stays ignored and the response says so; tests for each. |
| v1.6 | 2026-09-28 | **Sixth validate pass (all 3 applied at BigDev's direction) — every finding was v1.3–v1.5's own.** (1) The claimant-block exception in the extra states is narrowed to a stored claimant version that is ⛔ not effective — over an effective one it is a correction, refused 409 `claim_contact.add_only` (it was the premise of keeping `claim.file` there). (2) The parent CHECK's two sides are cleared symmetrically in every write, so a switch never 500s. (3) The relationship-only row on a missing row is named: 400 `claim_contact.address_required`. Tests for each. |
| v1.7 | 2026-09-28 | **External review findings (10), checked against the file — 4 real, 4 partly right, 2 ⛔ not holding; all applied at BigDev's direction.** ⭐ Real: (#4) a 6.20 correction can supersede the determination inside the extra states, leaving the effective set empty, so v1.6's narrowed claimant exception would fire for EVERY stored version ⇒ **409 `claim_contact.awaiting_determination`** there; (#3) a revoked agreement had ⛔ no way out in the extra states ⇒ a revoked agreement counts as missing and `agreed` fills it in any window; (#7) the audit unit defined (one contact line, plus one agreement line when a consent is recorded); (#10) Task 3 follows Task 0 like every code task. Partly right: (#1/#8, ⛔ not critical) the author-commit's id is "the next free id, read live" and Read-first lists `-263` and says `-262`/`-264` do ⛔ not touch the slice; (#5) the approval check selects rows by effective `versionId`, ⛔ never a count; (#9) done = `pnpm friction:test && pnpm friction:check`. ⛔ Not holding, clarified in one line each: (#2) the writer, ⛔ not the contract, enforces the nominee count; (#6) the 400/409 partition stated. |
| v1.8 | 2026-09-28 | **Fresh-context validate (15 findings — 1 critical, 4 high, 5 medium, 5 low; the top five re-verified in code; all applied at BigDev's direction).** ⭐ (1) "⛔ not effective" was read as "a different person", but a member declare or a 6.20 correction re-versions the SAME person — with `claimantNomineeVersionId` barred in the extra states, a re-versioned claimant (or a claim denied at P1, then reversed on appeal, with ⛔ no contact record) could ⛔ never satisfy D14 ⇒ W6's claimant-side fills. (2) A creating helpline write with ⛔ no claimant side hit the parent CHECK (500) ⇒ `claimant_required`. (3) `agreed` alone was a contract 400, so a revoked agreement had ⛔ no way out ⇒ allowed. (4) "Head version" was max `version_no`, which a correction of an older version takes while the member's list does ⛔ not move ⇒ the **projected** version (`getProjectedNomineeVersions`). (5) The API twin of `seedNomineeNameCheck` (ten specs) named; binding keyed on the effective status. Medium: the exact-list consent pin (6); the `KNOWN_RELATIONSHIPS` source-text pin + the named export + two more stale "fifteen" comments (7); `locale` on both shapes, INPUT-only validators, read DTOs that parse the sentinel (8); the audit unit restated as one intent line + `emitAuthAudit` events (9); the reused read key's reuse-check — presence-only under it, plaintext under `claim.file` (10). Low: Task 0 sweeps the stale siblings (11); rows 6-23/6-24 added to the sequencing note (12); the 400/409 partition and a pinned reason precedence (13); an identical retry is ⛔ not an overwrite (14); six shared-spec glyph inversions fixed (15). AC1's write rules restructured as **W1–W10** (the one copy; the shared spec's D5 points here) and AC11a as a structured test list. Also fixed on the way: the trap *"⛔ Do not call the effective read in the capture path"* contradicted W2/W6, which read it. |
| v1.9 | 2026-09-28 | **Re-validation of v1.8 (all 4 applied at BigDev's direction).** ⭐ (1) After filing the declaration is locked, so a 6.20 correction is the only re-versioning — and it orphaned the address row and the claimant link, so P3 refused `nominee_address_missing` after every correction (and AC11a (b) expected the wrong reason under the pinned precedence) ⇒ **W4a, the correction chain**: a row or claimant link bound to V counts for any version correcting V, nearest wins; AC11a (b) now passes with ⛔ no helpline action; W6 (b) kept as an operator path with its reason corrected. (2) A family with ⛔ no declared nominee reaches the contact step (the bank form continues past `nominee-review`'s empty state) and the member body required ≥ 1 rank ⇒ 0–2 ranks, the claimant block then required. (3) W5's identical-value check decrypts the stored value — stated, limited to carried fields in the extra states. (4) `contact_locale` follows every write inside the member's window. |
