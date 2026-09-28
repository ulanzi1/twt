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

- **Rulings:** `-232` G, `-233`, `-253` cl.1/cl.2/cl.4, `-255` F8, `-257`; for Task 0 also `-258`, `-259`, `-260`; `-261` C1/C3 (context for AC13 and for the per-claim agreement).
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
**Then** ONE author-commit decision (after `-264`) lands **D1–D29** with their current status — D13 **decided** (BigDev, 2026-09-27, *"split it
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
of the declaration as it stands at filing** — ⭐ each child row **bound to a declaration VERSION**, because the as-at-death determination
(T12) may ⛔ not exist yet (and can land mid-filing — the peer-mesh job moves `documents_pending` → `verification_in_progress` on its own).
**Two binding rules:** a **member** write binds each rank it carries to that rank's **head version** whose kind is ⛔ not `vacated` —
exactly what `nomineesStatus()` shows the family, ⛔ never the effective set (a family typing "rank 1" must ⛔ never have the address
attached to a different person's version); a **helpline** write names each **`nomineeVersionId` explicitly**, taken from the admin read —
allowed = the **effective** versions once the determination is `effective`, else the head versions — plus which nominee the claimant is
(the member sends `claimantNomineeRank`, bound server-side to that rank's head version — it never sees a version id; the helpline sends
`claimantNomineeVersionId`; stored as a version id, or null), and — **only when the claimant is none of the nominees** — the claimant's **name, mobile,
address** (all mandatory then) and the claimant-to-nominee **relationship per nominee** from the **nineteen** values (D16)
**And** the filer's **agreement to be contacted** is recorded as a `claim_contact_agreement` consent (D15) **in the same transaction**, and
the contact row carries its `agreement_consent_id` (NOT NULL, FK) — ⭐ the agreement is **per claim**, ⛔ never read by subject (a refiled
claim for the same death gives it again — `-261` C3)
**And** each surface has its own route: member `POST /api/v1/member/claims/:claimCaseId/contact` (member session, `requireDeceasedMemberId`,
mismatch ⇒ 404); helpline `POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/contact` (`recordHelpline`, preHandler `[adminSession, scope,
canFileClaim (claim.file), stepUp]` — the DPDPA helpline precedent in `claims.helpline.routes.ts`, `grantedViaActor: 'staff_assisted'`).
⚠ `claim.file` gates the **intake** route by precedent (`roles.ts`: *"CLAIM_FILE itself stays — it still gates the intake route"*; 6.9 on
reusing it for a later action). ⇒ **D5 records why it also gates the helpline's EXTRA states** — `TRUSTEE_ROUTABLE_STATES` minus `NOMINEE_BANK_COLLECTABLE_STATES`, i.e.
`verifier_approved`, `reversed`, `state_trustee_freeze`, `state_trustee_approved`: there the helpline only **completes** the filing, so its
writes are **add-only** — insert a row, or fill a column that is still null; ⛔ never overwrite a value already set (a correction of a
recorded address is ⛔ not this slice's). A write that would overwrite a set value, or that carries `claimantNomineeVersionId` (the parent
CHECK means that column or the claimant block is always set, so it can ⛔ never be written add-only), is **refused whole — 409
`claim_contact.add_only`, ⛔ nothing written** — ⛔ never silently dropped; the admin read tells the operator which fields can still be filled. ⭐ **The one permitted overwrite:** writing the claimant block also sets
`claimant_nominee_version_id` to null in the same statement — ⭐ **only when the stored claimant version is ⛔ not one of the effective
nominees' versions** (the `claimant_details_missing` case: the claimant is, as at the death, none of the nominees) — recorded in its audit
line; when the stored version IS effective, replacing it is a correction and the write is **409 `claim_contact.add_only`**, nothing written.
⭐ **The parent CHECK in every write:** setting the claimant's version clears the claimant block, and setting the claimant block clears the
version, in the same statement — so a member (or the helpline inside the member's window) switching between "the claimant is nominee N" and
"the claimant is someone else" never trips the CHECK. Inside `NOMINEE_BANK_COLLECTABLE_STATES` (where the family's own step and a phone filing usually run — the peer-mesh job moves
the claim to `verification_in_progress` on its own) the helpline has full upsert, as the member does
— ⛔ not fields bolted onto the intake body, ⛔ not `claims`, ⛔ not `intake_attempts`
**And** the write window: **member** = `NOMINEE_BANK_COLLECTABLE_STATES`; **helpline** = that ∪ `TRUSTEE_ROUTABLE_STATES` (derived by
spreading the two tuples, ⛔ never hand-typed) — so every state from which P1, P3 or P4 can 409 on D14 has a path to supply the record
(R9 reaches P4 from six states and bypasses P1); outside it a clean **409 `claim_contact.not_writable`** before any encryption. ⭐ Child
rows are **UNIQUE `(contact_id, nominee_version_id)`** and every write **upserts the rows it carries and ⛔ never deletes a row it does ⛔
not carry** — so a member re-POST can ⛔ never erase a row the helpline added for an effective version; a member re-POST (anywhere in its
window) may overwrite its own head-bound rows and the claimant block; a helpline write in the extra states is add-only (above). One
audit line per write
**And** the body reuses the declaration's validators — `MobileNumber` for the claimant's mobile, `z.string().trim().min(1).max(500)` for every
address (as `NomineeDeclareEntry`) — and the claimant's name is a trimmed bounded string, ⛔ not `EnglishScriptName` (D9). ⭐ **Two request shapes.** **Member** (the full record): an address for 1–2 distinct ranks; exactly one of `claimantNomineeRank` or the
claimant block (name, mobile, address, and a relationship per rank); `agreed: z.literal(true)`. **Helpline** (possibly partial): at least one
of — nominee rows (each `nomineeVersionId` + an optional `address` + an optional `relationship`, at least one of the two — so a missing
relationship is filled ⛔ without re-sending the address; the writer requires the address only on the write that **creates** the row — else **400 `claim_contact.address_required`**), the
claimant block, `claimantNomineeVersionId`; `agreed` optional; ⛔ never both `claimantNomineeVersionId` and the claimant block. **The contract** checks those
shapes → **400**. **The writer** checks against the declaration and the stored row (the contract can ⛔ not see either): a member write must
carry exactly the non-vacated head ranks, a helpline write only allowed versions → **400 `claim_contact.nominee_set_mismatch`**; a write that
**creates** the contact row needs the agreement and a complete nominee set → **400 `claim_contact.agreement_required`** /
`nominee_set_mismatch`. **The agreement after creation:** every member re-POST records a fresh `claim_contact_agreement` and repoints
`agreement_consent_id`; a helpline write that carries `agreed` does so only inside `NOMINEE_BANK_COLLECTABLE_STATES` — in the extra states it
is ignored for an existing row (a confirmation, ⛔ not data: ⛔ never repointed), and the response says it was ignored
**And** the boundary is D14's: a NEW exported domain check (e.g. `assertClaimContactRecorded(db, pariwarId, claimCaseId)` — it reads
`getEffectiveNomineeDeclaration` itself, since `assertClaimApprovable` returns nothing to the call sites; one extra query per approval)
runs **after** `assertClaimApprovable` at P1 (`adjudicateClaim`), P3 (`voteOnFrozenClaim`) and P4 (`finalizeR9Outcome`), approve-only, and
passes only when: a contact row exists; its agreement consent exists and is ⛔ not revoked; **every EFFECTIVE nominee's `versionId`** has an
address row; and **either** (the claimant's version is one of the effective nominees' versions) **or** (the claimant fields are present
**and** every effective nominee's row carries the claimant-to-nominee relationship). Otherwise it throws
`ClaimContactRequiredError` (a `reason` of `no_record | agreement_withdrawn | nominee_address_missing | claimant_details_missing` —
⛔ never a name), mapped to
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
**And** the claimant-to-nominee enum is **derived** in contracts as `NomineeRelationship.exclude(['other'])` — an equality test proves it
equals the twenty minus `other`, ⛔ never a hand-typed second list — and `NomineeForm.tsx`'s `KNOWN_RELATIONSHIPS` is re-pointed at it (⛔ never a
third copy)
**And** `other` still forecloses a correction (the 6.20 test stays green), `ClaimantRelationship` is unchanged, ⛔ no migration, ⛔ no backfill
**And** `declaration.ts`'s *"Still OPEN"* note is marked DISCHARGED by `-257`, ⛔ not deleted; its doc-block's value list, `relationship.ts`'s
header (*"FIFTEEN … `-237` cl.1–2"*), `NomineeForm.tsx`'s *"FIFTEEN"* comment and `member_nominees.ts:62`'s stale five-value comment are
corrected; `openapi/v1.yaml` is re-emitted (`pnpm contracts:emit-openapi`) so `contracts:check-openapi-determinism` stays green.

### AC8a — The surfaces (this slice)
**Then** the member app gains the `contact` step (AC1) and the resume fix; the helpline gains the contact card with the agreement read aloud
from the same copy; a **gated, audited admin read** of the contact record exists (key `claim.view_nominee_name_check`, district dimension
via `resolveNomineeNameCheckDistrict`; used by the helpline read-back now and by 6.19b's letter form later) — ⭐ it lists the **allowed
versions** (each effective nominee's `rank` + `nomineeVersionId` once determined, else the heads) with `address_present`, and whether the
claimant block is needed, so staff see exactly what the approval check will ask for — ⛔ never a member or public read;
staff copy **English-only** in the module's `i18n-en.ts`; member copy **en + hi**
**And** semantic accessibility (family 13): a labelled container is `accessible={true}` (mobile); every interactive role has a real handler;
every reachable state (`saved`, `incomplete`, `agreement required`, `step-up required`, `not writable`) is **announced**; WCAG AA (UX-DR67).

### AC9a — PII and audit posture (this slice)
**Then** new `AuthAuditEventType` entries for the contact record (member + helpline), the agreement **and the admin read**, each with
`resourceLocator: 'claim:<lower-case uuid>'` (anything else is silently replaced); every write + audit pairing goes through
`withCompensatingAudit` (`access-wrapper-invariants` rule (3) scans `apps/api/src/modules/claims` — a direct `audit.writeAuditEntry` fails
it); a live-DB test **plants** a claimant name, mobile, address and a nominee address as real-plaintext sentinels and finds them in ⛔ no log,
event, audit line or error body; the **RTBF gap** for the contact tables is recorded in Dev Notes and `deferred-work.md`, ⛔ not fixed.

### AC11a — The proof (this slice)
**Then** live-DB specs on `twt-test-pg :5433`, **executed**: the contact tables' migration-level policy spec (RLS positive / negative /
fail-closed / FORCE, FKs incl. `agreement_consent_id` and the version FK, UNIQUE, CHECKs — incl. "claimant fields present ⇔ the claimant
version is null"); both routes (member + helpline), **400** on every incomplete shape, **400 `claim_contact.nominee_set_mismatch`** on a
wrong nominee set (member: ≠ the head ranks; helpline: a version outside the allowed set), **409 `claim_contact.not_writable`** outside each
window; a member re-POST ⛔ never deletes a helpline-added row; a helpline write in the extra states that would overwrite a set value, or that carries `claimantNomineeVersionId`, is **409
`claim_contact.add_only`** with the row proven unchanged (one test each) — and the same write in `verifier_review` may overwrite (full
upsert); a helpline nominee row carrying only a `relationship` fills it on an existing row, and on a missing row is **400
`claim_contact.address_required`**; in the extra states a claimant-block write over a stored claimant version that IS effective is **409
`claim_contact.add_only`** (nothing written); a member re-POST switching from `claimantNomineeRank` to the claimant block and back leaves the
parent CHECK satisfied each time; **409 `<route>.claim_contact_required`** at P1, P3 and P4 with the claim left **waiting** (⛔ no state move, ⛔ no
denial), one test per `reason`; ⭐ the version binding: a declaration changed after the death and before filing (so the effective nominee is
an **earlier** version) ⇒ P1 409s `nominee_address_missing`, the admin read shows that version without an address, the helpline adds it
**by `nomineeVersionId`** in `verifier_review`, and the approval then passes; the same path for a claimant bound to a version that is ⛔ not
effective (`claimant_details_missing`) — the helpline's claimant-block write nulls `claimant_nominee_version_id` in the same statement (the
parent CHECK holds) and fills the relationship on the existing effective rows, in `verifier_approved` too (add-only); a claimant block with
a missing relationship still 409s; the two request shapes — a helpline write carrying only the claimant block, or only one nominee row, is
accepted; a first write (no row yet) without the agreement is **400 `claim_contact.agreement_required`**, in the extra states too (the R9
case); a member re-POST repoints `agreement_consent_id` to a fresh consent; a helpline `agreed` in the extra states leaves it unchanged and the response says it was ignored; `agreement_withdrawn` by setting `revoked_at` directly; a refiled claim for the same death is ⛔ not satisfied by the first claim's agreement; the agreement's copy lockstep
(byte-identical en/hi ↔ the server constant); the preserved-consent-types test and the contracts consent-enum lockstep still green; the
claimant-to-nominee list = the twenty minus `other` (equality test); **cross-Pariwar** and **non-human/system-actor** denial per new route;
every new route file classified in the human-actor gate (`unclassifiedRouteFiles()` fails otherwise; a route added to an existing file needs
its `expectedMethods`); the i18n **real-`t()` leg** in both locales; `claim-steps.test.ts` pins seven steps and the chain; `{ timeout: 20000 }`
on each new domain live spec
**And** ⭐ every existing approval spec stays green because `seedNomineeNameCheck` (`packages/domain/tests/integration/_helpers.ts`) seeds a
complete contact record by default (after the determination, bound to the effective versions — or to the head versions when the caller
passes `determination: 'skip'`), with a `contact: 'skip'` opt-out — the
precedent 6.21a set for the certificate (`certificate: 'skip'`).

## Tasks / Subtasks

- [ ] **Task 0 — Governance first, for the WHOLE 6.19 set** (AC0) — ⛔ no code in 6.19a, b or c before it
  - [ ] Re-run `git diff --name-only c136b03c..HEAD -- packages apps scripts` (empty at `6752e0d6`); re-read anything it lists that the shared spec cites.
  - [ ] Write ONE author-commit decision (after `-264`): D1–D29 with the statuses in AC0 (D5/D14/D15/D16 as revised 2026-09-28; D29 in its `-260` G1 form); the **eight** keys and which slice mints each (6.19b: keys 1, 7; 6.19c: keys 2–6, 8).
  - [ ] `epics.md`: entries for 6.19a–d with the `> ⚠ Minted by…` header; `-257`'s three annotations (Story 3.4's *"five to fifteen"*, FR-4, Story 6.20 item 7); PRD §4.10 and architecture §3.4 annotations naming `-255` F7 **and** `-259` (⛔ never a rewrite).
  - [ ] AR-61 ledger rows for every loop node AC0 lists; M (incl. "a condition of approval") and S in `docs/launch-gate-inventory/inventory-roster.md` (D24).
  - [x] ✅ The two routing notes were sent and **ruled 2026-09-27**: V → `-258`, CC1 → `-259`; G1–G6 → `-260`.
  - [ ] Start the DLT template registration (T13) — record the date; it gates 6.19b's and 6.19d's real sends, ⛔ not any build.
- [ ] **Task 1 — Migrations from 0124** (AC1) — the contact table (one row per claim; `claimant_nominee_version_id` nullable; the claimant's Tier-1 fields; `agreement_consent_id` NOT NULL FK → `consent_records`; `contact_locale`; `recorded_by_actor`, `recorded_via`) + its per-nominee child (`nominee_version_id` FK → `member_nominee_versions`, **UNIQUE `(contact_id, nominee_version_id)`**, the Tier-1 address, the claimant-to-nominee `relationship` text, nullable); RLS hand-supplement (`ENABLE` → `GRANT`/`POLICY` → `FORCE`), own policy file (model `claim-nominee-bank-rls.ts`); `ADD VALUE IF NOT EXISTS 'claim_contact_agreement'` to `consent_type` in its **own** file; journal entry each; ⛔ never regenerate an applied migration; the migration-level policy spec.
- [ ] **Task 2 — Capture at filing** (AC1, AC8a, AC9a, AC10)
  - [ ] Consent type (D15): `consentTypeEnum` + contracts `ConsentTypeSchema` (the lockstep in `packages/contracts/tests/consent.test.ts` pins them equal); ⛔ not `DpdpaConsentType` (its `Record`-total `DPDPA_CONSENT_COPY` and the DPDPA GET view's `ALL_TYPES` would change a shipped surface); ⛔ not `CLAIM_TIME_CONSENT_TYPES` (pinned by exact `toEqual`; it derives the `claim.dpdpa_consent_recorded` payload). Its own versioned copy constant + `claim.json` en + hi keys + a byte-identical lockstep test (the `dpdpa-consent-copy` precedent), marked *"pending Story 0.13"*.
  - [ ] Contracts (⛔ no `@twt/domain` import): the **two** request shapes — member (full, `claimantNomineeRank`, `agreed: true`) and helpline (partial, by `nomineeVersionId`, `agreed` optional) — reusing `MobileNumber` and the address validator, the claimant-to-nominee enum (Task 3b), the admin read DTO. Re-emit `openapi/v1.yaml`.
  - [ ] Domain: the writer (under the claim lock; **member**: binds each rank to its non-vacated head version — `listNomineeDeclarationVersions`, or extend `getNomineeVersionHeads` to return `versionId`; **helpline**: takes explicit `nomineeVersionId`s, checked against the allowed set — effective once determined, else heads; upsert-only, ⛔ never deleting an uncarried row; helpline writes in the extra states add-only (insert or fill a null column; the claimant block also nulls `claimant_nominee_version_id`; any overwrite or a `claimantNomineeVersionId` → 409 `claim_contact.add_only`, nothing written); helpline nominee rows take an optional address and an optional relationship (the address required only to create — else 400 `claim_contact.address_required`); the parent CHECK's two sides cleared symmetrically in every write; the claimant-block exception only over a non-effective claimant version; the writer-level `nominee_set_mismatch` and `agreement_required` (on the write that creates the row); the agreement repointing rules; records the consent and the contact row in one tx); the window tuples; `assertClaimContactRecorded` (reads the effective declaration itself; requires the relationship on every effective row when the claimant block is present) + `ClaimContactRequiredError`, called **after** `assertClaimApprovable` at P1/P3/P4 (⛔ not inside it, ⛔ not inside `isReturnedClaimResubmitted`'s inner helper).
  - [ ] API: `claim-contact-crypto.ts` + `CLAIM_CONTACT_FIELD_CLASS`; member + helpline routes + the admin read (new route file(s) classified in `scripts/claim-adjudication-human-actor-invariant/check.ts`); the three error mappers; audit types; `withCompensatingAudit`.
  - [ ] Admin: the helpline card; the three console screens' `…claim_contact_required` message (`nominee-errors.ts`).
  - [ ] Mobile: `(claim)/contact.tsx` (direction-fixed relationship question; `saveClaimDraft({ lastStep: 'contact' })`), `CLAIM_STEPS`, `nominee-review.tsx`'s next route, `claim-steps.test.ts`, the `(claim)/index.tsx` resume fix.
  - [ ] Test helper: `seedNomineeNameCheck` seeds the contact record by default, `contact: 'skip'` opt-out (AC11a).
- [ ] **Task 3 — `-257` (N1)** (AC13) — (a) `NOMINEE_RELATIONSHIP_CODES` + the domain mirror to twenty; the *"Still OPEN"* note DISCHARGED; the stale "fifteen"/five-value comments fixed (`declaration.ts` doc list, `relationship.ts` header, `NomineeForm.tsx`, `member_nominees.ts:62`). (b) The derived claimant-to-nominee enum (`NomineeRelationship.exclude(['other'])`) + the equality test; `KNOWN_RELATIONSHIPS` re-pointed at it. (c) The picker + **en + hi** copy for the five new values — reviewed kin terms that cover the English: e.g. `brother_in_law` — जीजा / देवर / जेठ / साला / नंदोई / साढ़ू; `son_in_law` — दामाद; `mother_in_law` — सास; `father_in_law` — ससुर; `grandparent` — दादा / दादी / नाना / नानी. (d) Every site: `NomineeForm.tsx`, `nominee-history-copy.test.ts` (the "FIFTEEN" test → twenty; extend the Hindi-coverage test to `brother_in_law` and `grandparent`), `NomineeDeclarationPanel.tsx` + its `i18n-en.ts` + test, `nominee-relationship-lockstep.test.ts`, `nominee-correction.spec.ts`, `nominee-lock.spec.ts` (its "fifteen-value" title), `common.json` ×2, `openapi/v1.yaml`. ⭐ Independent — may land first (Task 2's relationship picker consumes it).
- [ ] **Task 4 — Tests** (AC9a, AC11a) — **execute** on `twt-test-pg :5433`; record the RTBF gap in `deferred-work.md`.
- [ ] **Task 5 — Friction budget** — one named-payer row for the `contact` step (addresses, maybe a claimant's details, the agreement) — `friction-budget.md` / `friction-budget.yaml`, best-ever ratchet ([[project_friction_budget_baseline_ratchet]]).

**AC ↔ Task map:** AC0 → T0 · AC1 → T1, T2 · AC8a → T2 · AC9a → T2, T4 · AC10 → T2 · AC11a → T4 · AC13 → T3 · T5 → the friction gate (no AC; the budget gate is its own check).

## Dev Notes

### Dependency and sequencing
Nothing upstream (6.18, 6.20, 6.21a/b are merged). Task 0 → Task 3 (any time) → Task 1 → Task 2 → Tasks 4–5. ⭐ 6.19b starts only when this
slice is `done` — its recipients and letter addresses come from this table.
⚠ **Row `6-26`** (`-263` FQ9: ⛔ no approval before the ground inspection is complete) will add a check **inside** `assertClaimApprovable` at the
same three call sites and will extend the same `seedNomineeNameCheck` — whichever lands second rebases onto the other; ⛔ neither drops the
other's check.

### Traps specific to this slice
- ⚠ **The effective declaration does ⛔ not exist at filing.** `getEffectiveNomineeDeclaration` returns `undetermined` (no entries) until the
  District Admin's determination, recordable only in `CLAIM_REVIEW_WINDOW_STATES` (from `verification_in_progress`). Capture binds to the
  declaration's versions as they stand at filing; D14 compares against the **effective** set at approval, when it exists (the name-check
  gate already requires it). ⛔ Do not call the effective read in the capture path.
- ⚠ **Two binding rules, one table.** The member binds to what it SEES (head versions); the helpline binds to what the APPROVAL CHECKS
  (effective versions, by explicit id). Rows for a head version that turns out ⛔ not to be effective stay, unused — D14 and 6.19b read only
  the effective versions' rows. ⛔ Never map a member's rank onto the effective set: after a post-death change that attaches one person's
  address to another person's version.
- ⚠ **The agreement is per claim.** `consent_records` has ⛔ no claim column; `consent_artifact_ref` is a provenance back-link, ⛔ never a query
  key; the subject is the deceased. ⇒ read the agreement only through the contact row's `agreement_consent_id`.
- ⚠ `nominee-correction-persist.ts`'s *"Re-examine it when the Panel takes up `-237`'s open in-law/grandparent item"* has fired (`-257`) and
  been answered (`-261` C1 ratified the proposed-side `other` refusal). ⛔ Not this slice's to edit — `-261` consequence 2 gives it to row `6-23`.

### Files
**UPDATE:** `packages/contracts/src/nominee/declaration.ts`, `packages/contracts/src/consent/consent-record.ts` (`ConsentTypeSchema`),
`packages/domain/src/nominee/relationship.ts`, `packages/domain/src/schema/{member_nominees.ts (comment only),consent_records.ts,index.ts}`,
`packages/domain/src/policies/index.ts`, `packages/domain/src/claim/{verifier-decision-persist,state-trustee-decision-persist,r9-voting-persist}.ts`
(P1, P3, P4 — one call each), `packages/domain/src/claim/errors.ts`, `packages/domain/tests/integration/_helpers.ts`,
`apps/api/src/context.ts`, `apps/api/src/modules/claims/{claims.verification-decision,claims.cycle-freeze,claims.r9-voting}.handlers.ts` (error
mappers), `apps/api/src/audit/audit-sink.ts`, `apps/mobile/lib/claim-steps.ts`, `apps/mobile/app/(claim)/{index,nominee-review}.tsx`,
`apps/mobile/tests/unit/claim-steps.test.ts`, `apps/mobile/components/life-events/NomineeForm.tsx`,
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
