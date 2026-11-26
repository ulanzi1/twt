---
baseline_commit: 74839891
---

<!--
PINNED: `90535934` = `origin/main` (`git fetch origin` 2026-11-21, at authoring — Story 6.39 landed, PR #331). Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/3-13-trustee-validation-of-manually-entered-identity`, branch
`story/3-13-trustee-validation-of-manually-entered-identity` (upstream UNSET — it was made from `origin/main`; push with an explicit refspec,
[[project_story_branch_upstream_is_main]]). The main checkout was ⛔ switched ([[feedback_shared_tree_branch_switch]]).
Every `apps/` / `packages/` claim below was traced by hand at `90535934` on 2026-11-21. Re-locate by FUNCTION, ⛔ by line number.
⚠ The two facts are separate ([[feedback_story_validate_footguns]] #24): "the pin is an ancestor of HEAD" is durable; "the code claims were
re-derived at `90535934`" is perishable — Task 0.1 re-derives them.
⭐ RE-PINNED 2026-11-25 to `74839891` (`origin/main` after `git fetch origin`): the branch was REBASED onto it (179 commits; backup
`backup/3-13-pre-rebase-2026-11-25`; every file's changed-line set vs `origin/main` equals the backup's vs `90535934`), then re-validated
(v1.5). `git diff 90535934 74839891` is EMPTY for every file F1–F9 / F10a names (KYC writers + schema, `member/state.ts`, `events.ts`,
`audit-shape.ts`, `membership-check-approval.ts`, `death-report-lock.ts`, `member-moderation/`, the 6.18 / 6.39 routes, `member-geo/`,
`rbac/`, the human-actor gate, `member-status/`, `search-read.ts`, `member-validity/handlers.ts`, `forced-pagination.spec.ts`,
`personal-event-handlers.ts`) ⇒ those claims hold at `74839891`. Moved (re-read, F10 / F11 / AC15): migrations, decisions, roster rows,
`anonymize.ts` + the data export (12.5's lead steps, beside — ⛔ instead of — the `claimMembershipChecks` scrub), `field-classes.ts`
(`MODULE_LEAD_FIELDS_FIELD_CLASS`), and the merge gate (ADR-0047).

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`):
  · THAT a typed-in identity is validated by the Trust before the member is fully a member — PRD FR-2 (*"the member becomes `pending-valid`
    until trustee validation"*), AR-14, architecture §1.14 (*"Trustee approves manual KYC → `active`"*), Niyamavali §2.1 (b) (membership
    needs *"identity verification (KYC)"*). ⚠ PRD / architecture / Niyamavali are ⛔ Panel rulings (the Niyamavali is a rulebook, ⛔
    ratified — [[feedback_niyamavali_rulebook_not_spec]]); ⛔ ruling of the Panel says anything about checking an identity IN LIFE.
  · WHAT A CHECK IN LIFE MEANS AT DEATH — a MATCH, ⛔ a question: `2026-10-31-424` Q1 (a) C (Trustee-ratified) covers *"someone who typed
    in their own identity details, never verified since"* — a member this story verifies is, by those words, outside the ruled case. 6.39
    built exactly that reading (`-472` DL4). Quoted verbatim below ([[feedback_panel_gate_read_ratified_verbatim]]).
  · WHAT STAFF MUST SEE to confirm an identity, and WHAT HAPPENS / WHO IS TOLD when they cannot — the Panel's (what the Trust OWES a member:
    whether they are covered once lock-in ends; whether they are told), and WHICH STAFF may see the member's number (PQ3 — a disclosure).
    PQ1 / PQ2 / PQ3, ONE non-blocking note at Task 0.3, each built on the
    narrow / unchanged side until answered; ruled before go-live (new roster row, Task 0.5).
  · HOW it is recorded, WHERE it sits, WHICH staff role, WHAT the screens say — the AUTHOR's (DL1–DL16, BigDev at Task 0.2). ⚠ DL6 (which
    staff role) is surfaced to the Panel inside PQ1's text so it is ⛔ hidden in a "told" line ([[feedback_told_line_must_not_carry_panel_choice]]).
-->

# Story 3.13: Staff Check a Typed-In Identity While the Member Is Alive

Status: review

## Story

As a **member who joined by typing in my own identity details** (the manual route, because DigiLocker was unavailable or failed),
I want **the Trust's staff to check my identity while I am alive — and record that they did**,
so that **I become a full member when my lock-in ends instead of waiting in `pending-valid`, and my family's claim does not wait for an
identity check after I die.**

And as a **District Admin / Pariwar Admin**, I want **a queue of every member whose typed-in identity nobody has checked, oldest signup
first, and one recorded act — confirmed or not confirmed — per check**, so that **FR-2's "trustee-action queue" exists and the Trust can
say, for each such member, who checked, when, and from what.**

## The rulings and records this story builds on

| Source | What it says (verbatim where it binds) | Status |
|---|---|---|
| PRD FR-2 | *"KYC fields are entered manually and the member becomes `pending-valid` until trustee validation."* · *"A trustee-action queue contains all `pending-valid` members ordered by signup date."* | PRD (⛔ ratified) |
| Architecture §1.14 transition table | `pending-valid` — *"Lock-in elapsed AND DigiLocker unverified"* → *"Trustee approves manual KYC → `active`"* | architecture |
| Niyamavali §2.1 | *"A person becomes a member only on **all** of: (a) registration; (b) identity verification (KYC); (c) payment of the Vyawastha Shulk; and (d) admission under these rules."* | rulebook (⛔ ratified) |
| `2026-10-31-424` Q1 (a) C | *"A claim for someone who typed in their own identity details, **never verified since**, is filed — but the identity is checked first, by staff, from the death documents and the details on record, before any drive opens."* Reading (⛔ ratified): *"a KYC record written by the manual route (`self_declared`) and never verified (`trusteeVerified` false), in any lifecycle state."* Consequence 2: *"Related: row `3-13` (validating a typed-in identity during life — the same missing capability, another moment)."* What it does ⛔ cover: *"periodic re-verification of identity (raised by BigDev in session 2026-10-31, ⛔ put to the Panel)."* | **Trustee-ratified** (DR + KB) |
| `2026-10-31-424` Q2 (b) addition | *"even though staff can change, old entry cannot be gone in this particular case, but clearly visible along with new entry made by staff"* — `deferred-work.md` item *"A staff change to the record of a member whose death is reported…"* — Trigger includes *"any change to the KYC profile write path"* ⇒ **this story fires it** (Task 7.4). | **Trustee-ratified** |
| `2026-11-21-472` DL4 | The 6.39 identity half applies iff the deceased's KYC record is ⛔ DigiLocker-verified **and** ⛔ trustee-verified (or absent). DL16: *"Not in scope: … writing `trusteeVerified`"* — left to this row. | author-commit |
| `sprint-status.yaml` row block `3-13-…` | *"⚠⚠ ORDER: 3-13 BEFORE (or WITH) 3-14."* · *"WHO validates and from WHAT evidence is likely the Panel's — its create-story applies the §0 gate."* · 2026-11-21 (6.39 Task 0.5): *"a typed-in member this row verifies in life SKIPS the identity half at death (the fee half still applies). Until this row is built, every typed-in member is checked at death."* | ledger |
| `2026-11-21-482` decisions 1 and 6 | *"The typed-in route is replaced. Staff check the documents (row `3-13`, reshaped after the Panel rules the follow-up note). What is kept and for how long is the Panel's."* · *"Four rows, in this order after the notes: `3-15` (now — no Panel question); `3-16` with `3-13` and then `3-14`; …"* · Story 3.16's `epics.md` block: *"A document-checked identity gets its own `verification_strength` value (enum mint delegated, `-210` cl.2)."* ⇒ N1a. | author-commit |
| BigDev, 2026-11-25 (validate v1.5, question dialog) | *"Build now, typed-in only (Recommended)"* — 3.13 is built now for members whose identity is ALREADY `self_declared` (they exist whatever 3.16 does), to DL7 option A; the upload half joins in the reshape after both notes are ruled. Follow-up note `a18654f2`: *"Not sent yet"*. | author |
| `deferred-work.md` — *"Deferred from: BigDev's question while preparing Story 6.38's routing note — how is identity being verified today? (2026-10-31)"* | *"⛔ step verifies a self-declared identity … `trusteeVerified` is set `true` nowhere, and the only `member.kyc_completed` emitter is the member's own DigiLocker confirm; ⛔ staff or trustee surface exists."* — ✅ DISCHARGED into rows 3-13 / 3-14. | observed |
| `deferred-work.md` — *"investigation — identity collision at signup is unenforced (2026-08-10)"*, row 4 | *"Manual KYC … Nothing ever writes `true` … there is no reviewer surface."* | observed — this story builds the reviewer surface; it does ⛔ close the collision gap (rows 1–3 of that table) |

## 📜 Policy meaning (AI-10-1)

⭐ **This story CHANGES predicates that gate a member's access to a benefit.** It introduces ONE new writer of an existing predicate input
(`member_kyc_profiles.trustee_verified`), and that input is read by three gates:

1. **At death (6.39, LIVE in code today):** `isIdentityCheckRequired` — a member this story confirms no longer has their identity checked
   when their family files a claim (the fee-date half still applies).
2. **At the end of lock-in (row `3-14`, ⛔ built yet):** the `member.lock_in_expired` producer's `kyc_verified` — a confirmed member goes to
   `active` (covered; renewal, grace and withdrawal open to them) instead of `pending-valid` (⛔ in `VALID_STATES` — not covered).
3. **In `pending-valid` (reachable only once `3-14` exists):** confirming appends `member.kyc_completed`, the reducer's existing
   `pending-valid → active` arm — the member becomes covered again.

**In the member's terms:** *"If you joined by typing in your own identity details, the Trust's staff can check them while you are alive.
Once they confirm you are who you said you are, you become a full member when your lock-in ends, and when you die your family's claim does
not wait for anyone to check your identity again. If they cannot confirm it, nothing changes for you today — they can try again at any
time."*

**Checked against the Niyamavali (a rulebook, ⛔ ratified):** consistent with §2.1 (b) — membership requires identity verification, and for a
typed-in identity this staff check IS that verification; §2.1 does ⛔ say who verifies or from what (⇒ PQ1). Consistent with §2.2 / the
joining lock-in (this story moves ⛔ clock). ⛔ conflict found.
**Checked against `-424` Q1 (a) C:** a MATCH (*"never verified since"*) — quoted above.
⭐ **(v1.9, after `-502`)** The member-facing sentence above holds for THIS story. Two rows add to it: row `3-13a` tells a member staff
could not confirm, AND the reason (`-502` Q2 C) — so "nothing changes for you today" stays true of their MEMBERSHIP, ⛔ of what they are
told; row `3-16` adds the upload route (E) — *"or by sending photos of your PAN card, your masked Aadhaar and a selfie"* (`-502`'s own
Policy-meaning sentence). ⛔ new gate: the reveal (DL6a) gates a disclosure, ⛔ a benefit.
⚠ **What this note does ⛔ cover:** gate 2's consequence for a member staff could ⛔ confirm (they leave coverage at lock-in end) is created
by row `3-14`, and belongs in ITS Policy-meaning note — this story only makes it avoidable. PQ2 puts the member-facing half to the Panel.

## ⭐ THE INVARIANTS

- **N1 — ONE definition of "verified".** A new pure helper `isKycIdentityVerified(standing)` in `packages/domain/src/kyc/` (DigiLocker
  `aadhaar_kyc` **or** `trustee_verified = true`) is the ONLY place that says what "verified" means. 6.39's `isIdentityCheckRequired` must
  agree with it on every input (a lockstep unit test over the full cross-product of the three enum values × the boolean × null — ⛔ a
  refactor of 6.39's leaf: `membership-check-approval.ts` must stay a LEAF, its own header's TR4), and row `3-14` will read it. Two readers
  of one fact must not be able to disagree ([[feedback_told_line_must_not_carry_panel_choice]] "How to apply").
- **N1a — WHICH identities staff may check is ONE total map, ⛔ a literal at each site (v1.5).** Story 3.16 mints a new
  `verification_strength` for a document-checked identity (`-482` row above). Every place this story says "`self_declared`" (DL2's UPDATE,
  DL4's eligibility, DL11's queue, AC5's cases) reads ONE map in `packages/domain/src/kyc/`:
  `KYC_STRENGTH_STAFF_CHECKABLE = { aadhaar_kyc: false, self_declared: true, unverified: false } satisfies
  Record<MemberKycVerificationStrength, boolean>` (the key type from `schema/member_kyc_profiles.ts`; the F4 total-map precedent), with
  the checkable list derived from it. So 3.16's new value FAILS TO COMPILE here until the reshape classifies it — it cannot silently fall
  out of the queue. SQL sites bind the derived list (`= ANY($n)`), ⛔ a string literal.
- **N2 — ⛔ identity DATA is changed.** This story never writes `name_ciphertext`, `dob_ciphertext`, `photo_ciphertext`,
  `aadhaar_masked_id`, `verification_strength` or `source`. It writes `trustee_verified` (false → true only) and `updated_at`. A staff
  correction of a typed-in name is ⛔ this story (`-424` Q2 (b)'s addition would bind it — the KYC store is latest-wins).
- **N3 — ⛔ validation after a death is reported.** The membership check (6.39) is the identity step after a death; it re-reads
  `trustee_verified` on EVERY call (its N2). A validation recorded while a death report stands would silently remove 6.39's identity half
  from an open claim — a second door around a Trustee-ratified step. Refused, under the intake key, FIRST (DL5).
- **N4 — Append-only record, one live row.** Every staff act is a row; a later act supersedes; ⛔ UPDATE/DELETE of history (except the
  erasure scrub of the Tier-1 note — DL14).
- **N5 — ⛔ Aadhaar number, ⛔ document image is stored BY THIS STORY.** Staff record WHAT KIND of document they saw, ⛔ its number and ⛔ a copy.
  (v1.9) Holds for route A (`-502` item 1: *"Nothing is copied or kept"*). The E route's copies are row `3-16`'s store, kept under
  `-502` Q4 B — ⛔ this table; a 3-16 review writes only `evidence_kind = 'uploaded_documents'` here, ⛔ a copy or reference (R1).
  Aadhaar Act s.8A(4)(b) bars storing the full number *"for any purpose"* ([[project_aadhaar_full_number_storage_barred]]).
- **N6 — A `not_confirmed` changes nothing for the member today.** ⛔ state change, ⛔ moderation, ⛔ fraud flag, ⛔ message FROM THIS
  STORY. (v1.9) `-502` Q2 C rules that the member IS told, with the reason — built by row `3-13a`, which READS this table's live row (the
  closed `not_confirmed_reason`, ⛔ the Tier-1 note: C's *"the reason staff recorded"* is the closed list the note put, ⛔ the note).
  ⇒ the reason stays a plaintext closed enum (3-13a reads it member-side without a decrypt); ⛔ fold the reason into the note.
- **N7 — The reducer is untouched.** ⛔ edit to `member/state.ts`'s `reduce`; the new event is a non-transition marker (the `default` arm);
  the `pending-valid → active` move uses the EXISTING `member.kyc_completed` arm.

## Found facts (traced at `90535934`)

- **F1 — `trustee_verified` has ⛔ writer of `true`.** `member_kyc_profiles.trustee_verified boolean DEFAULT false NOT NULL` (migration
  `0024_member-kyc-profiles.sql`; schema `packages/domain/src/schema/member_kyc_profiles.ts`, whose comment still says *"Epic 4/trustee
  surface flips this true"* — stale, Task 7.2). Writers: `apps/api/src/modules/kyc/kyc.handlers.ts` `manual` (`false`) and the DigiLocker
  confirm (`false`); `packages/domain/src/kyc/profile-write.ts` `upsertMemberKycProfile` (`input.trusteeVerified ?? false`, and the
  UPSERT's `set` writes it too ⇒ ⚠ any future re-write of the profile RESETS the flag to false — correct, and N2 keeps this story off
  that path). The GRANT on the table already includes UPDATE (*"trustee-verify UPDATE later"*).
- **F2 — The profile is fixed after signup.** Both KYC writers refuse unless `state === 'pending-kyc'` (`kyc.not_pending`) ⇒ by the time a
  member is in `lock-in`, their KYC row cannot change through any member route. (A validation therefore never goes stale against a later
  member edit today; DL1 still records the profile's `updated_at` so a future writer cannot make it lie.)
- **F3 — The reducer.** `packages/domain/src/member/state.ts` `reduce`: `member.kyc_completed` → `pending-kyc → pending-fee`,
  `pending-valid → active`, every other state IDENTITY (so from `lock-in` it moves nothing). `member.lock_in_expired` → `kyc_verified ?
  'active' : 'pending-valid'`. ⛔ production emitter of `member.lock_in_expired` exists (row `3-14`) ⇒ `pending-valid` is UNREACHABLE today;
  every typed-in paid member sits in `lock-in`.
- **F4 — The event vocabulary.** `packages/domain/src/member/events.ts` `MEMBER_EVENT_TYPES` + `MEMBER_EVENT_PAYLOAD_SCHEMAS`
  (`satisfies Record<MemberEventType, …>` — a total map, a new type fails to compile until it has a schema); `KycCompletedPayloadSchema`
  = `auditShape` + optional `kyc_reference`. `auditShape` (`member/audit-shape.ts`): `from_state` / `to_state` / `trigger` / `actor` where
  `actor ∈ member | system | trustee` — ⚠ `trustee` is the architecture §1.14 word for a staff actor; ⛔ widen the enum. The events
  package has its own registry (`packages/events/src/registry.ts`, `member.kyc_completed` at its entry) — a new type registers there too.
  Tests that enumerate member event types: `packages/domain/tests/member/door-input-fence.test.ts`, `life-events-markers.test.ts`,
  `personal-event-assertion.test.ts` (read each before adding).
- **F5 — 6.39's reader.** `packages/domain/src/claim/membership-check-approval.ts` `membershipCheckKycRoute` / `isIdentityCheckRequired`
  read `verification_strength` + `trustee_verified` (plaintext) and route `trustee_verified` ⇒ identity half NOT required. Its doc line
  for `trustee_verified` reads *"(row `3-13` — ⛔ built: unreachable today)"* — stale once this lands (Task 7.2). The admin label
  `apps/admin/src/modules/claim-verification/i18n-en.ts`: `trustee_verified: 'Typed in at joining, checked by a trustee'` — ⚠ if DL6's
  holder is a District Admin, "a trustee" is wrong (DL12 rewords it).
- **F6 — The death lock.** `packages/domain/src/claim/death-report-lock.ts` `lockAndReadDeathReport(client, pariwarId, memberId)` — takes
  the claim INTAKE advisory key, then reads `isDeathReportStanding`. Its header: *"⛔ Take ⛔ other advisory lock before this call (intake →
  anything else)."* Callers today: withdrawal, Life Events, medical. ⇒ this story is the fourth.
- **F7 — Staff on a member: the precedents.** `apps/api/src/modules/member-moderation/routes.ts` gates `member.moderate` at
  `dimension: 'pariwar'` (*"`members` carries no geography"*). 6.39's `claims.membership-check.routes.ts` gates at `dimension: 'district'`
  against a SERVER-DERIVED posting district (a claim-keyed stash, `resolveNomineeNameCheckDistrict`, which reads
  `getMemberPostingLatest` — ⛔ `posting_id` tie-break). For a member-keyed district use
  `getMemberCurrentDistrict(db, pariwarId, memberId, at)` (`packages/domain/src/member-geo/resolve.ts` — newest posting by `created_at DESC,
  posting_id DESC`, as of `at`; `null` when the member has no posting row). Since Story 6.36a the signup wizard's REQUIRED workplace step
  writes the member's first posting, so `null` is an edge (older rows, hand-seeded fixtures) — but a reachable one.
  Path shape: `/api/v1/p/:pariwarId/admin/…`; the human-actor chain `[requireAdminSession, scopeResolutionHook, …, requirePermissionHook]`.
- **F7a — ⚠ A null target is refused for EVERYONE.** `packages/domain/src/rbac/scope.ts` `scopeContains` opens with `if (target.dimension
  !== 'global' && target.value == null) return false;` — BEFORE it looks at the grant, so a `district`-dimension check against a member with
  no posting is a 403 for `district_admin`, `pariwar_admin` AND `super_admin`. The fix the house already uses is the 6.18 correction-queue
  shape (`apps/api/src/modules/claims/claims.nominee-name-check.routes.ts`, `resolveQueueScope` + `requirePermissionHook`'s
  `resolveDimension` / `resolveValue`): the DIMENSION moves with the caller — a district-ceiling caller is checked at `district`, a
  pariwar-ceiling caller at `pariwar` against the Pariwar id — and a LIST is gated on the caller's own scope, then filtered per row with
  `rbac.scopeContains` (DL6, DL11).
- **F7b — ⛔ CI gate covers admin MEMBER routes.** `scripts/claim-adjudication-human-actor-invariant/check.ts` reconciles ONLY
  `apps/api/src/modules/claims/*.routes.ts` against its `COVERAGE_SET`; `apps/api/src/modules/member-moderation/routes.ts`'s header records
  that it is ⛔ scanned. A new `apps/api/src/modules/identity-checks/` is outside every gate — the human-actor chain on its routes is held
  by review and by this story's own API tests (AC12). Extending the gate's scope is ⛔ this story ([[project_access_wrapper_gate_pending_scope]]).
- **F8 — What staff already see of a member.** `apps/admin/src/modules/member-status/` (`MemberStatusPanel.tsx`) shows the KYC name and a
  **masked** mobile (`maskedMobile`) under `member.view_validity`; `packages/domain/src/member/search-read.ts` returns the encrypted
  columns and the handler decrypts. ⛔ admin surface shows a member's FULL mobile ⇒ DL8 shows masked only (a match), ⛔ a new disclosure. (v1.9: `-502` Q3 ruled the disclosure — DL6a's audited press.)
  The decrypt precedent is `apps/api/src/modules/member-validity/handlers.ts` `adminMemberSearch`: `decryptKycField`
  (`kyc/kyc-crypto.ts`) for the KYC name, `decryptMobile` + `maskMobile` (`auth/shared/mobile-index.ts`), the anonymized-sentinel
  suppression, and ONE `audit.writeAuditEntry(deps.servicePool, …)` line. (`kyc/bounded-decrypt.ts` is ⛔ it — that is the 11b.2a
  fan-out concurrency bound for decrypting a LIST of names.)
- **F9 — Keys.** `packages/domain/src/rbac/permissions.ts` `PERMISSION_CATALOG_VERSION = 65`, 96 keys, newest `claim.check_membership`
  (6.39). Roles: `packages/domain/src/rbac/roles.ts` `defaultRoleBundles` (13). A `pariwar`-ceiling grant satisfies a `district`-dimension
  check; a `district`-ceiling one fails a `pariwar` check ([[project_rbac_geo_scope_containment]]).
- **F10 — Numbers at the pin.** Highest migration `0212_claim-membership-checks.sql`; highest decision `2026-11-21-476`; highest roster row
  53 (`docs/launch-gate-inventory/inventory-roster.md`; Row 46 written after 53). Every one is RE-READ at Task 0.1 across every ref and
  worktree. ⚠ Already moved on 2026-11-21: `story/6-22b-…` (unmerged, own worktree) holds decisions `-477` to `-480`, its Task 1.1 names
  migration `0213` for itself, and its ledger uses the letter `2026-11-21s` — the SAME letter this branch's creation ledger used
  (`f73a18d2`). Whichever branch lands second relabels its letter ([[project_sprint_status_ledger]]); take the migration number after
  6-22b's.
  ⭐ **Re-read 2026-11-25 at `74839891`, across every ref and worktree (v1.5):** 6-22b LANDED (`-477`–`-481`, migration `0213`); 12.5 /
  12.5b took `0214`–`0217` and roster Rows 54 / 55; ADR-0047 took Row 56 and `-496`–`-500`. ⇒ **next migration `0218`, next decision
  `-501`, next roster row `57`**; `PERMISSION_CATALOG_VERSION` still `65`, 96 keys (`permissions.ts` unchanged). This branch's creation
  ledger letter was RELABELLED `2026-11-21s` → `2026-11-21aq` (main holds `s`; the unmerged `story/6-39a-…` holds `u` and `z`). ⚠ OPEN:
  `story/6-39a-…` ALSO holds `2026-11-21w`, this branch's Task 0.3 letter — whichever lands second relabels. Task 0.1 re-reads all of it.
- **F10a — The 0212 live-row mechanism, as built.** `claim_membership_checks` (migration `0212`): `superseded_at` + `superseded_reason`
  (a CHECK: both null, or both set with a reason from a closed list); a partial UNIQUE index `WHERE superseded_at IS NULL`; GRANT SELECT,
  INSERT + a COLUMN-LEVEL `GRANT UPDATE ("superseded_at", "superseded_reason", "note_ciphertext")` AT BIRTH, with a per-command UPDATE
  policy (without it the scrub matches 0 rows under FORCE — 6.23a); the append-only guard function AT BIRTH naming every frozen column
  EXCEPT those three (so the RTBF scrub needs ⛔ later REPLACE); a second trigger making supersession ONE-WAY; attribution as
  `decided_by_actor_id` + `decided_by_display` (the display name snapshotted at write) + `decided_at`. Its note's field class is
  `CLAIM_MEMBERSHIP_CHECK_FIELD_CLASS` (`packages/domain/src/encryption/field-classes.ts`, exported from `encryption/index.ts`), and
  `anonymize.ts` scrubs the note with `encSentinel(pariwarId, <field class>, enc)` — the sentinel is ciphertext, so the column stays
  non-null.
- **F11 — Erasure / export touch points.** `packages/domain/src/member/anonymize.ts` (RTBF scrub); the data export already carries
  `trusteeVerified` (`packages/contracts/src/data-export/data-export.ts`, `packages/domain/src/data-export/assemble.ts`) — sections are
  strict-parsed ([[project_data_export_sections_strict_parsed]]).
- **F12 — Who is in the queue today.** Every member whose KYC row is `self_declared` and who has paid (`lock-in`). The manual route is ON
  by default (`kyc_manual_fallback` inverted, `apps/api/src/modules/kyc/manual-fallback-seam.ts`) ⇒ possibly most members.
  ⭐ (v1.5) Still true at `74839891` — row `3-16` (which REPLACES `POST /api/v1/member/kyc/manual`, `-482` decision 1) is `backlog`. Once
  it lands, ⛔ NEW `self_declared` row is written: the `self_declared` half of the queue becomes a FIXED, shrinking set, and 3.16's new
  strength joins it only when the reshape classifies it (N1a). That is why the build starts now (BigDev, 2026-11-25).

- **F13 — The roles `-502` Q3 names (v1.9, traced at `74839891`).** `packages/domain/src/rbac/roles.ts`: `verifier` — ceiling
  `district` (fits a district-dimension gate against the member's posting district, as `district_admin`); `helpline_operator` — ceiling
  `pariwar`; `block_admin` — ceiling `block`, and a block grant can NEVER satisfy a district or pariwar check (`scope.ts` §RANK-ORDER),
  while a member has ⛔ block at all (`member-geo/resolve.ts`: *"`block`, unconditionally → `no-member-attribute` (D5 — permanent)"*) ⇒
  ⛔ way to say which members are in a Block Admin's block; `field_worker` — ceiling `self`, `permissions: []`, ⛔ console login (Story
  13.3 `backlog`). The `-328` precedent (`apps/api/src/modules/claims/peer-answers-assembler.ts`) shows a number ON PAGE LOAD, audited
  per showing (`…peer_callback_mobile_shown`, ⛔ the number); `-502` Q3 B says *"one press at a time"* ⇒ a separate reveal action (DL6a).

## Build decisions — PROPOSED (BigDev answers at Task 0.2)

> ⭐ **v1.9 (reshape after `-502`; BigDev's R1–R4 answers, 2026-11-25):** DL6a (the reveal) is NEW; DL7, DL8, DL8b, DL11, DL12, DL13
> and DL16 carry dated (v1.9) amendments in place. Recorded as author-commit `2026-11-25-503` (amends `-501` items 7–9, 12–14, 17 by name; item 10 is read with `-502` Q2 C — N6).

- **DL1 — One record.** A new table `member_identity_validations` (TENANT-ISOLATED, RLS by `pariwar_id`, FORCE): `validation_id` (uuid
  PK), `pariwar_id`, `member_id` (FK `members`), `outcome` (`confirmed` | `not_confirmed`), `evidence_kind` (DL7), `document_kind` (DL7,
  NULL when `not_confirmed` for `no_document_shown`), `not_confirmed_reason` (DL9, NULL iff `confirmed` — a CHECK), `note_ciphertext`
  (Tier-1, `piiColumn(1, MEMBER_IDENTITY_VALIDATION_FIELD_CLASS)`; REQUIRED iff `not_confirmed` — a CHECK; the RTBF sentinel is ciphertext,
  so the CHECK still holds after a scrub), `kyc_profile_updated_at` (the snapshot F2 describes), `decided_by_actor_id`,
  `decided_by_display` (the staff display name snapshotted at write — [[project_admin_display_name_attribution]]; DL8 shows it),
  `decided_at`, `superseded_at`, `superseded_reason`. One LIVE row per member; a later act supersedes — ⭐ **mirror
  `claim_membership_checks`' live-row mechanism exactly, as F10a describes it** (read `0212_claim-membership-checks.sql` and its schema
  first; ⛔ invent a second shape; and ⛔ order "latest" by `decided_at` alone — one txn ⇒ equal `now()`,
  [[project_db_clock_ordering_tests_tie]]). So, AT BIRTH in the one migration: GRANT SELECT, INSERT + the column-level GRANT UPDATE on
  `superseded_at`, `superseded_reason`, `note_ciphertext`; the per-command UPDATE policy; the append-only guard naming every OTHER column;
  the one-way-supersession trigger. ⛔ DELETE grant. ⛔ later guard REPLACE is needed (DL14).
  New field class `MEMBER_IDENTITY_VALIDATION_FIELD_CLASS = 'member_identity_validation'` in `packages/domain/src/encryption/field-classes.ts`,
  exported from `encryption/index.ts` (the `CLAIM_MEMBERSHIP_CHECK_FIELD_CLASS` precedent); the write, the read and the scrub all bind it.
- **DL2 — The flag.** On `confirmed`, in the SAME transaction: `UPDATE member_kyc_profiles SET trustee_verified = true, updated_at = now()
  WHERE pariwar_id = $1 AND member_id = $2 AND verification_strength = ANY($3 /* N1a's checkable list */) AND trustee_verified = false` — zero rows ⇒ 409
  `identity_validation.not_eligible` (and the whole tx rolls back). A new domain writer `markKycTrusteeVerified` in
  `packages/domain/src/kyc/profile-write.ts` (⛔ through `upsertMemberKycProfile` — that would rewrite the identity columns, N2). On
  `not_confirmed`: the flag is ⛔ touched (it is already false; a `confirmed` is ⛔ undone by a later `not_confirmed` — DL10).
- **DL3 — Events.** A new non-transition marker `member.identity_validation_recorded`: `auditShape` (`from_state` = `to_state` = the
  current state; `trigger: 'staff_identity_validation'`; `actor: 'trustee'`) + `validation_id` (uuid) + `outcome` — ⛔ name, ⛔ note, ⛔
  document kind, ⛔ reason (the record holds those). `.strict()`. Registered in `MEMBER_EVENT_TYPES`, `MEMBER_EVENT_PAYLOAD_SCHEMAS` and
  `@twt/events`' registry. ⭐ And when `confirmed` AND the member is `pending-valid`: ALSO `member.kyc_completed` (`from_state:
  'pending-valid'`, `to_state: 'active'`, `trigger: 'staff_identity_validation'`, `actor: 'trustee'`, `kyc_reference: <validation_id>`),
  through `projectMemberState` (the ONE projector — the `member-state-invariant` gate). From `lock-in`, ⛔ `kyc_completed` is appended (the
  reducer would ignore it, but an identity transition with `to_state: 'active'` in its payload would be a lie in the audit metadata).
- **DL4 — Who can be validated.** A KYC row exists, its `verification_strength` is staff-checkable under N1a (`self_declared` only, at
  `74839891`), `trustee_verified = false`, and the member's
  state is `lock-in` or `pending-valid`. Refused (409 `identity_validation.not_eligible`, one code, the reason in the log only): no KYC row;
  `aadhaar_kyc` / `unverified`; already verified; `pending-kyc` / `pending-fee` (⛔ yet a member — Niyamavali §2.1 (c)); `withdrawn` /
  `anonymized`; `active` / `active-in-grace` / `lapsed-unpaid` (unreachable for a `self_declared` member except by a hand-seeded fixture —
  fail closed); moderation overlay `terminated`. A `suspended` member CAN be validated (identity is a fact; a suspension ends).
- **DL5 — The death lock FIRST.** The write's first statement is `lockAndReadDeathReport` (F6); a standing report ⇒ 409
  `identity_validation.death_reported`. The detail READ also says so (a banner, the form ⛔ shown) — ⛔ lock on a read. (N3.)
  The intake key is per `(pariwarId, memberId)`, so taking it first ALSO serialises two staff acts on the same member — ⛔ add a second
  advisory lock for that; `projectMemberState`'s stream-version conflict is the backstop.
- **DL6 — Who checks.** A NEW key `member.validate_identity`, granted to `district_admin` (against the member's server-derived CURRENT
  posting district — F7) and `pariwar_admin` (any district — the Trustee-Lite who acts for "the trustee" in v1,
  [[project_trustee_lite_votes_not_state_trustee]]); `super_admin` by derivation. Catalog 65 → 66, keys 96 → 98 with DL6a's key (ONE bump per story — the `permissions.ts`
  header's 62 → 63 FOUR-keys precedent); `defaultRoleBundles` stays 13. ⛔ every other role: `field_worker` (who may have onboarded the member), `helpline_operator`, `verifier`, `state_trustee`
  (deprecated footing), `trustee_panel` (the Panel body; routine work is ⛔ its), `block_admin`, `auditor`, `finance_officer`, `it_cell`,
  `media_comms`.
  ⭐ **The gate's dimension moves with the caller (F7a — a fixed `district` gate would refuse EVERYONE for a member with no posting).** Copy
  the 6.18 `resolveQueueScope` shape into a per-file preHandler: resolve the caller's own grant scope for `member.validate_identity`; a
  district-ceiling caller is gated at `dimension: 'district'` against `getMemberCurrentDistrict(…, deps.clock())` for the member (the
  per-member routes) or against their own district (the list); a pariwar-ceiling caller at `dimension: 'pariwar'` against the Pariwar id.
  ⇒ a member with no resolvable posting district can be checked ONLY by a pariwar-ceiling caller (a District Admin's check fails closed),
  and appears only in a pariwar-ceiling caller's queue. ⛔ client-supplied district or dimension is read.
  ✅ **Answered 2026-11-21 (Task 0.2, question dialog, BigDev):** *"District + Pariwar Admin (Recommended)"* — as written.
  REUSE CHECK — ⛔ `claim.check_membership` (death-time, claim-keyed), ⛔
  `member.moderate`, ⛔ `member.view_validity` (a read). *Considered and not taken:* District Admin only (a Pariwar with few District
  Admins would stall); Pariwar Admin only (FR-2's "trustee" literally — the queue could be most members, F12). ⚠ "Trustee" is the PRD's
  word, ⛔ the Panel's; PQ1 shows the Panel who checks.
- **DL6a — The number reveal (NEW, v1.9; `-502` Q3 B widened; BigDev R2 *"Accept as proposed (Recommended)"*, R3 *"Defer; don't
  block go-live (Recommended)"*).** A NEW key `member.reveal_mobile_for_identity_check`, granted to `district_admin`, `pariwar_admin`,
  `verifier` and `helpline_operator`; `super_admin` by derivation. Gate: the DL6 caller-moves-the-dimension shape — `district`-ceiling
  callers (`district_admin`, `verifier`) against `getMemberCurrentDistrict`, `pariwar`-ceiling callers (`pariwar_admin`,
  `helpline_operator`) at `pariwar`. ONE `POST` per press returns the full number (`decryptMobile` → canonical); EVERY press writes one
  audit line `admin_identity_check.member_mobile_shown` (actor, member, time — ⛔ the number, the `-328` precedent's rule). **"For this
  purpose" is STRUCTURAL:** the reveal is refused 409 `identity_validation.not_eligible` unless the member is DL4-eligible right now
  (unverified, checkable, `lock-in` / `pending-valid`), and 409 `identity_validation.death_reported` under a standing death report (the
  DL5 lock, FIRST); an anonymized mobile ⇒ ⛔ number. The same key READS the queue (DL11 — ⛔ PII) so a verifier or helpline operator can
  find the member; the detail (name / DOB / photo) and the record stay `member.validate_identity` (DA / PA). ⛔ step-up
  ([[feedback_story_validate_footguns]] #69 (a) — admin step-up is a stub in production). **NOT built (R3):** `field_worker` (⛔ login —
  a `deferred-work.md` item triggered by Story 13.3) and `block_admin` (⛔ member block — F13; unbuildable in the current model); the Panel
  is TOLD in a short note (showing fewer staff is the narrow side); Row 57 (b2) is met once the four are built.
- **DL7 — What staff record they saw (built to PQ1 option A until ruled).** `evidence_kind`: `photo_id_in_person` |
  `photo_id_video_call`. `document_kind`: `aadhaar_card` | `pan_card` | `voter_id` | `driving_licence` | `passport` |
  `government_service_id`. ⛔ number field, ⛔ upload. Staff confirm the name and date of birth on the document match the record, and (when
  a photo is on record) the face. If the Panel rules B, C or D, the vocabulary changes (enum mint is delegated — `-210` cl.2,
  [[project_enum_mint_authority_delegated]]) or the write route is withdrawn.
  ⭐ (v1.9) RULED A (`-502` item 1) — the vocabulary above stands as built. E (`-502` item 2) is row `3-16`'s (R1 *"In 3-16, writing
  3.13's record (Recommended)"*): 3-16 builds capture, the store, Q4 B retention AND the staff review of uploads; that review writes THIS
  table with a new `evidence_kind` value `uploaded_documents` (minted BY 3-16 — delegated, `-210` cl.2) and classifies 3-16's strength in
  N1a. ⛔ mint `uploaded_documents` here (nothing would write it).
- **DL8 — What staff see (the detail read).** The KYC name, date of birth and photo (decrypted with `decryptKycField` — the
  `adminMemberSearch` precedent, F8; an anonymized row shows ⛔ identity; ONE `audit.writeAuditEntry` line per view, ⛔ per field), the
  masked mobile (F8 — ⛔ full number), the member's state, signup date, current posting (district, school), the KYC route, and the history
  of validations (date, outcome, evidence / document kind, reason, `decided_by_display`). Only the LIVE row's note is decrypted (one
  audited decrypt); superseded rows show the outcome and reason, ⛔ the note. ⚠ COST: each `decryptTier1` fires an audit line per FIELD
  with ⛔ DEK cache ([[project_kms_audit_per_hmac_global_lock]]) — the detail is one member, ~4 decrypts; the LIST decrypts nothing (DL11).
  ⚠ **How staff reach the member is a SEPARATE Task 0.2 question (DL8b).** PQ1 A's check needs a meeting or a video call, `member_not_reached`
  is a reason, and this screen shows only a masked mobile. Options: (a) masked only — staff arrange the check through channels they already
  have (the field worker, the school); (b) the full mobile behind one audited read — a NEW disclosure of a member's number to staff, which is
  what the Trust tells about a member, so it goes to the Panel (added to the Task 0.3 note) and is built on (a) until ruled. Built: (a).
  ✅ **Answered 2026-11-21 (Task 0.2, question dialog, BigDev):** *"Ask Panel: show full mobile"* ⇒ (b): PQ3 is in the note; built (a)
  until ruled.
  ⭐ (v1.9) RULED B, widened (`-502` item 5) ⇒ the detail shows the MASKED mobile plus DL6a's *"Show mobile number"* press; ⛔ full number
  in the detail payload itself.
- **DL9 — `not_confirmed`.** Reason (closed list): `details_do_not_match` | `photo_does_not_match` | `no_document_shown` |
  `member_not_reached`; a note required (Tier-1, ≤ 1,000 code points). Effect: N6 — nothing changes; the member stays in the queue with
  the latest outcome shown; staff may record again at any time. ⛔ time limit, ⛔ attempt limit.
- **DL10 — ⛔ undo in this story.** Once `confirmed`, ⛔ route makes the member unverified again (the reducer has ⛔ `active →
  pending-valid` arm, and 6.39 would silently re-impose its check). A wrongful confirmation found later is the fraud register's (Story
  6.22; *"identity fraud"* is ground 2 of Niyamavali §8.5) — recorded in `deferred-work.md` (Task 7.4), ⛔ built.
- **DL11 — The queue (FR-2).** (v1.9: also readable with DL6a's key — the same ⛔-PII rows, the same per-row scope filter against
  THAT key's grant.) `GET` list: members eligible under DL4 within the caller's scope, `pending-valid` first, then by signup date
  ascending (`members.created_at`, tie-broken by `member_id`); each row: short member id, signup date, state, district, latest outcome +
  date, attempt count. ⛔ name, ⛔ mobile on the list (⛔ Tier-1 decrypt on a list — one rule for the whole surface,
  [[feedback_withholding_must_be_uniform]]); open a row for the detail. Scope: the route is gated on the caller's OWN scope (DL6), then each
  row is kept only if `rbac.scopeContains(<caller's grant>, <the member's district target>)` — the same predicate as the per-member gate;
  a member with no district is kept only for a pariwar-ceiling caller. Paginated: the querystring declares
  `limit: z.coerce.number().int().min(1).max(<MAX>).optional()` (`apps/api/tests/integration/forced-pagination.spec.ts` fails an unbounded
  collection GET) and the domain read clamps with `clampLimit` (the `domain-accessor-invariants` gate; ⛔ `Math.min`,
  [[project_domain_limit_clamp_and_savepoint_retry]]). ⚠ FR-2's queue names `pending-valid` members only; this one also lists `lock-in`
  members — deliberately (every typed-in member sits in `lock-in` until row `3-14`), the author's widening, ⛔ a slip.
- **DL12 — Staff words (English only — approved word for word at Task 0.2).** Page title *"Identity checks"*; list empty *"No member is
  waiting for an identity check."*; detail lead *"This member typed in their identity details when they joined. Check them against an
  original photo ID, shown to you in person or on a video call. Do not copy or keep the document or its number."*; buttons *"Confirm
  identity"* / *"Could not confirm"*; confirmed line *"Identity confirmed by {name} on {date}."*; not-confirmed line *"Not confirmed on {date}:
  {reason}."*; reasons *"Details do not match the ID"* / *"Photo does not match"* / *"No ID was shown"* / *"Could not reach the member"*;
  death-lock banner *"The Trust has been told this member has died. Their identity is checked on the claim instead."*; not-eligible
  *"This member does not need an identity check."*; and the 6.39 label `trustee_verified` reworded to *"Typed in at joining, checked by
  staff"*. ⭐ (v1.9, DL6a — BigDev R4 *"Approve as shown (Recommended)"*, word for word): reveal button *"Show mobile number"*; after a
  press *"{number}"* then *"Shown to you only to arrange this identity check."* and *"This showing is recorded."*; refused *"This member's
  number can no longer be shown here."*; the queue keeps the title *"Identity checks"* for verifiers and helpline operators. ⛔ staff
  hint that the member is told the reason — row `3-13a` adds it when its message ships (it would be false before). ⚠ The microcopy gate scans `apps/admin/src/**/*.ts(x)` (`microcopy.yaml` `scope.code_globs`) for the WHOLE WORDS `receipt` /
  `report` / `invoice` (`scripts/microcopy/lib.ts` matches `\b<term>\b`) in copy, test ids OR comments
  ([[project_microcopy_gate_scans_admin_code]]). So the error code `identity_validation.death_reported` and an identifier `deathReported`
  PASS (the admin helpdesk already uses `rtbf.death_reported` and `…erasureRefused.deathReported`) — keep the house `*.death_reported`
  family (withdrawal, medical, life events, erasure). The trap is the bare word: ⛔ "death report" / "report" in an admin comment, test name
  or string — write "a claim filed for the death".
- **DL13 — Routes.** (v1.9: FOUR — plus `POST …/admin/members/:memberId/identity-check/mobile` (DL6a's reveal; ⛔ `Idempotency-Key` —
  every press is a separate audited showing; a per-actor rate limit IF an admin-route precedent exists — find it at Task 3.4, ⛔ assumed).) `GET /api/v1/p/:pariwarId/admin/members/identity-checks` (queue), `GET …/admin/members/:memberId/identity-check`
  (detail), `POST …/admin/members/:memberId/identity-check` (record; `Idempotency-Key` required — `idempotency.createKeyedStore` from
  `@twt/domain` in the shape of `apps/api/src/modules/contributions/personal-event-handlers.ts`: claim → the scope tx opened INSIDE the
  try → COMMIT → THEN `recordResult` → then the audit line, [[project_idempotent_write_handler_shape]]; there is ⛔ shared
  `withIdempotency` helper — several modules define a local one — and 6.39's route takes ⛔ key, so it is ⛔ the model here).
  Plain string-literal paths, each route inlining the full chain `[requireAdminSession, scopeResolutionHook, <scope stash>,
  requirePermissionHook]` (the member-moderation literal-array style). ⚠ ⛔ CI gate scans this module (F7b): the chain is proved by AC12's
  tests, ⛔ by an enrolment. Admin UI: a new module `apps/admin/src/modules/identity-checks/`, routed in `apps/admin/src/router.tsx` AND linked in
  `apps/admin/src/routes/RootLayout.tsx` (a Pariwar-scoped `<Link to="/p/$pariwarId/…">` beside `nav-fraud-investigations`, its own
  `data-testid`) — a page in the router alone has ⛔ way in from the console ([[feedback_story_validate_footguns]] #69 (g)).
- **DL14 — Erasure and export.** RTBF (`anonymize.ts`) scrubs `note_ciphertext` with `encSentinel(pariwarId,
  MEMBER_IDENTITY_VALIDATION_FIELD_CLASS, enc)` where it is non-null — the 6.39 `claimMembershipChecks` scrub beside it is the model.
  Because the table is NEW, its guard is written at birth with `note_ciphertext` left out of the frozen list (DL1, F10a) — ⛔ guard REPLACE
  migration ([[project_append_only_guard_names_erasure_columns]] binds a table that already exists). The data export gains the member's
  validation history (date, outcome, evidence kind, document kind, reason, note) — ⛔ staff attribution at all (the table stores ⛔ role,
  and a staff name or user id is the staff member's data, ⛔ the member's) — a new strict section in `@twt/contracts` + `assemble.ts`. *Considered:* leave
  the export unchanged (it already carries `trusteeVerified`) — rejected: the record is the member's personal data.
- **DL15 — Stale comments re-worded** (Task 7.2): the schema comment (F1), 6.39's route doc line (F5), the sprint-status row comment's
  *"Until this row is built"* (by a dated line, ⛔ an edit), and the `deferred-work.md` items' annotations (Task 7.4).
- **DL16 — Not in scope:** (v1.9) the member's message and its reason line (row `3-13a`, `-502` Q2 C); the upload capture, store,
  retention and staff review of uploads (row `3-16`, `-502` items 2–3, R1); the reveal for `field_worker` and `block_admin` (DL6a, R3);
  the lock-in producer (row `3-14`); any member-facing screen or message (PQ2); a staff change to name / date of
  birth / photo; a DigiLocker re-run for an already-joined member; an undo (DL10); periodic re-verification (`-424`, ⛔ put); the Aadhaar
  HMAC / duplicate-identity gap; a backfill; any change to 6.39's gate, door or copy except the one label (DL12); notifications to staff.

## Panel questions — PROPOSED (one non-blocking note at Task 0.3)

> ✅ **RULED 2026-11-25 — [Decision `2026-11-25-502`](../../.decision-log.md#decision-2026-11-25-502)** (Trustee-ratified, DR + KB;
> relayed by BigDev: *"by DR and KB / follow up - Q1 E, Q4 B / identity - Q1 A, Q2 C, Q3 Staff will see the number for this purpose in
> addition to option B."*). **PQ1 — A**, and the follow-up's **E** (A and E both stand: A for a typed-in member, E with A as fallback for
> uploads); **PQ2 — C** (⛔ our B: the member is told, AND the reason — new row `3-13a`); **PQ3 — B, widened** to field workers,
> verifiers, helpline operators and Block Admins, for arranging the check only (the roles are the Panel's); **follow-up Q4 — B** (row
> `3-16`). ⚠ **The questions below are kept AS PUT.** ✅ The DLs, ACs and Tasks were RESHAPED by the v1.9 re-validate (2026-11-25,
> author-commit `2026-11-25-503`) — dev-story may start Task 1. `-501` items 8 (DL7) and 9 (DL8b) were amended by `-502`.

⭐ All three pass §0: PQ1 and PQ2 are what the Trust OWES a member (whether their identity counts as verified — and so whether they are
covered once lock-in ends — and whether they are told); PQ3 is what the Trust DISCLOSES about a member, and to which staff. None blocks
the build or the merge; all three block GO-LIVE (Task 0.5). Built on the narrow /
unchanged side meanwhile.

- **PQ1 — What must staff see before they confirm a typed-in identity in life?**
  - ⭐ **The one fact that decides it (state it first in the note):** once staff confirm an identity in life, it is ⛔ checked again when
    the member dies — the after-death identity check the Panel ruled in `-424` Q1 (a) C (built by 6.39) is skipped for that member, and
    only the fee-date check remains. So whatever staff are asked to see here is ALL the identity checking that member's claim will get.
  - **A (our suggestion):** the member shows an original government photo ID — in person or on a video call — to a District Admin or
    Pariwar Admin, who checks the name, date of birth and photo against what the member typed in; nothing is copied or kept. *Cost:* a
    video call can be staged by a determined impostor, and a wrong confirmation means that member's family is later helped with ⛔
    identity check after the death; it takes staff time for possibly most members.
  - **B:** as A, but in person only — ⛔ video calls. *Cost:* harder to stage, but a member far from the district office, unwell or posted
    away may never be checked (and, once `3-14` exists, stops being covered); more staff travel. (Added while writing the note.)
  - **C:** as A, and the member's school or office also confirms in writing that the person works there under that name. *Cost:* slower,
    more staff work, and the Trust collects a letter from an employer; a retired member has no current employer.
  - **D:** no staff check — the member must later complete DigiLocker themselves; staff only remind. *Cost:* a member who cannot use
    DigiLocker is never verified, and (once lock-in ends) is not covered; and it needs a new build first — today a member who has joined
    cannot run DigiLocker again (both identity routes accept only a member still at the identity step, F2).
  - *Built:* A (DL7). ⭐ The note states who checks (DL6) in each option's own text, so the Panel can change it. If the Panel rules B,
    `evidence_kind` drops `photo_id_video_call`; C adds an employer-confirmation field; D withdraws the write route.
- **PQ3 — may the District Admin and the Pariwar Admin see a member's full mobile number to arrange the check?** (In the note:
  BigDev chose DL8b (b), 2026-11-21.) Options: **A** ⛔ number (staff reach the member through the field worker / the school); **B (our
  suggestion)** the whole number on this screen, one press at a time, every showing audited (actor, member, time — ⛔ the number),
  Super Admin by derivation — "the Admin" of `-328`, but it WIDENS `-328`, which shows a neighbour's number only on their "yes"; **C** the
  app asks the member *"May the Admin phone you to check your identity?"* first. The nearest ruling is `2026-10-13-328` (*"Trust can
  contact any member anytime for any reason, but not all staff should have right to contact any member anytime"*; it does ⛔ cover
  *"who may PHONE a member for any other purpose"*). `-459` Q2's *"Keep the phone number out."* concerns a field WORKER's number, ⛔ a
  member's. *Built:* A until ruled; B is one audited read on the detail route, C needs member words and its own row.
- **PQ2 — When staff cannot confirm a member's identity, is the member told?**
  - **A:** no new message; staff contact the member themselves, as they choose. *Cost:* the member may not know anything is wrong until
    lock-in ends.
  - **B (our suggestion):** the app tells the member, in their language, that their identity could not be checked yet and how to arrange
    it. *Cost:* new member-facing words in Hindi and English, approved by the Panel; a new row to build them.
  - **C:** B, and the member is also told the reason staff recorded. *Cost:* a reason like "photo does not match" told to a possible
    impostor.
  - *Built:* A (nothing new — DL16). B or C ⇒ a new row.
- ⛔ **NOT a question** (a match, quoted): what a check in life means at death — `-424` Q1 (a) C's *"never verified since"*.
- ⛔ **NOT a question** (the author's): the record, the routes, the queue's order, the words staff see.

## Acceptance Criteria

1. **AC1 (Task 0 — governance FIRST).** Before any `apps/` / `packages/` change: Task 0.1's re-derivation is recorded; BigDev's Task 0.2
   answers are recorded; the decision-log entry is committed ALONE; the Panel note is written (⛔ sent by the session); the roster row and
   the `deferred-work.md` lines are written; the sprint row is `in-progress`. ([[feedback_governance_commits_precede_implementation]])
2. **AC2 (DL1, N4).** Migration(s) create `member_identity_validations` (+ its enums) with RLS + FORCE, the CHECKs of DL1, the live-row
   mechanism mirrored from 0212 (F10a), and the append-only guard at birth; a live-DB test proves: cross-Pariwar invisible (RLS); an UPDATE
   of any frozen column and any DELETE refused by the guard (asserting the refusing rule, ⛔ "something failed"); the three granted updates
   succeed — the supersession stamp on a live row and the note scrub (each with a frozen-column control beside it); a superseded row's
   stamp cannot change again (the one-way trigger); each CHECK refuses its bad row; a second act supersedes the first.
3. **AC3 (DL2, N2).** `confirmed` sets `trustee_verified = true` in the same transaction as the row and the event(s); a test asserts every
   OTHER column of the KYC row is byte-identical before and after; a forced failure after the UPDATE leaves the flag false and ⛔ row (one
   transaction).
4. **AC4 (DL3, N7).** `member.identity_validation_recorded` is appended on every act with the DL3 payload (`.strict()` — a test that an
   extra key is refused); from `pending-valid`, `confirmed` also appends `member.kyc_completed` and the member's projected state becomes
   `active` (live DB); from `lock-in` it does ⛔ (state stays `lock-in`, ⛔ `kyc_completed` row). `reduce` is unchanged (`git diff` of
   `state.ts`'s `reduce` is empty).
5. **AC5 (DL4).** Each refused case of DL4 returns 409 `identity_validation.not_eligible` and writes nothing (⛔ row, ⛔ event, flag
   unchanged) — one test per case, each with a passing control beside it.
6. **AC6 (DL5, N3).** With a claim filed for the member (a standing death report), the POST returns 409 `identity_validation.death_reported`
   and writes nothing; the death-report lock is taken BEFORE any other lock or read (a test that the intake key is held — the 6.38
   precedent); with the claim released as innocent (`isDeathReportStanding` false), the POST succeeds. The detail read shows the banner and
   ⛔ form.
7. **AC7 (N1).** `isKycIdentityVerified` exists in `packages/domain/src/kyc/`; a unit test proves `!isKycIdentityVerified(x) ===
   isIdentityCheckRequired(x)` for every `x` in {null} ∪ (`MEMBER_KYC_VERIFICATION_STRENGTHS` × {true, false}) — the strengths READ from
   the enum const, ⛔ a hand list of three (so 3.16's new value enters the lockstep the day it is minted); `membership-check-approval.ts`
   imports ⛔ new module (its leaf scan stays green). N1a's map is `satisfies Record<MemberKycVerificationStrength, boolean>` (a
   compile-time leg) and a unit test pins today's classification (`self_declared` only).
8. **AC8 (DL6).** Key `member.validate_identity` in the catalog (v66, 98 keys with DL6a's), granted to `district_admin` and `pariwar_admin`, derived to
   `super_admin`; a test per role: district admin of the member's district → 200/201; of another district → 403; of a member with no
   posting → 403; pariwar admin → allowed, INCLUDING for a member with no posting (the F7a trap — this leg is red under a fixed
   `district` gate); every other role in `defaultRoleBundles` → 403 (a loop over the 13 bundles, ⛔ a hand list). The queue: a district
   admin sees only their district's members; a pariwar admin sees every district and the unposted member. ⛔ client-supplied district or
   dimension is read.
8a. **AC8a (DL6a, v1.9).** Key `member.reveal_mobile_for_identity_check` granted to exactly `district_admin`, `pariwar_admin`,
   `verifier`, `helpline_operator` (+ `super_admin` derived): a test per role in scope → 200 with the full number; a district-ceiling
   caller of another district → 403; every other bundle (incl. `field_worker`, `block_admin`) → 403 (a loop over the 13 bundles).
   EVERY press writes ONE `admin_identity_check.member_mobile_shown` line whose payload has ⛔ the number (asserted by searching the
   serialized line for the digits); two presses ⇒ two lines. Refused 409 `not_eligible` once the member is confirmed (purpose ended) — a
   passing control on an eligible member beside it; 409 `death_reported` under a standing report, the intake lock taken FIRST. The
   detail payload carries ⛔ full number. The queue is readable with this key alone; the detail and the record are ⛔ (403).
9. **AC9 (DL7, DL9, N5).** The POST body accepts only the DL7 / DL9 vocabularies (a closed `z.enum`, `.strict()`); a body carrying any
   number-like field or an upload is refused 400; `not_confirmed` without a note → 400; `confirmed` with a reason → 400. A grep-test proves
   ⛔ column or field in the new table / contract named like `*number*` / `*aadhaar*` / `*image*`. (v1.9) `not_confirmed_reason` is a
   plaintext enum column (N6 — row `3-13a` reads it); `evidence_kind` has ⛔ `uploaded_documents` value in this story (DL7).
10. **AC10 (DL8, DL11).** The queue returns exactly the DL4-eligible members in scope, in DL11's order (a test with ≥ 3 members including a
    tie on `created_at`), with ⛔ Tier-1 field and ⛔ decrypt call (a spy); the querystring `limit` is bounded (`forced-pagination.spec.ts`
    green on the emitted OpenAPI) and goes through `clampLimit`. The detail returns the DL8 fields, decrypts the name / DOB / photo and only
    the live row's note, writes ONE view audit line, and the mobile is masked (the full number only through DL6a's press).
11. **AC11 (DL12).** Every staff string is the Task-0.2-approved text, from the admin i18n file (⛔ inline literals); the 6.39
    `trustee_verified` label reads the approved rewording; the microcopy gate is green ON these files (read its config list — ⛔ its
    header — [[feedback_gate_scope_semantic_coverage]]).
12. **AC12 (DL13).** Four routes (v1.9 — DL6a's reveal included), plain-literal paths, the human-actor chain inlined on each; because ⛔ CI gate scans this module (F7b),
    an API test proves for EACH route: ⛔ admin session → 401, a member session → refused, a valid admin session without the key → 403.
    POST without `Idempotency-Key` → 400; a replay returns the recorded result and writes nothing new. OpenAPI regenerated (compare with
    anchors resolved — [[project_openapi_yaml_anchor_renumbering]]).
13. **AC13 (DL14).** RTBF of a validated member scrubs `note_ciphertext` to the sentinel (and only it — the guard at birth allows it, ⛔
    REPLACE migration), a live test; the member's data export contains the new section with ⛔ staff attribution, and a fixture-contract
    test covers it ([[project_contracts_tests_outside_tsc]]).
14. **AC14 (admin UI).** The admin module renders the queue, the detail and both forms; vitest covers: empty queue copy, the death-lock
    banner hides the form, `not_confirmed` requires a note before submit, a 409 shows the not-eligible line, a successful confirm refreshes
    the detail, the console nav shows the link to the queue (DL13), and (v1.9) *"Show mobile number"* calls the reveal ONCE per press
    and renders DL12's shown / refused lines; a verifier / helpline session sees the queue and the press but ⛔ the identity detail or forms. A real-browser pass is a GO-LIVE leg, ⛔ a merge condition ([[project_not_in_production_merge_is_not_golive]]).
15. **AC15 (records).** DL15's comments re-worded; `deferred-work.md` annotated (Task 7.4); the PR's GitHub `ci.yml` run at the EXACT tip
    SHA being landed concluded `success`, all jobs (41 at `74839891`) — ADR-0047 cl.1, ratified by `2026-11-24-499`; the ledger line cites
    the run id, the tip SHA and jobs passed / total for the PR run AND the push to `main` (cl.2). `pnpm ci:local` may be cited, ⛔ required;
    if run, on a FRESH container with `DATABASE_URL` pointing at it ([[project_known_livedb_test_failures]]).

## Tasks / Subtasks

- [x] **Task 0 — Governance FIRST (AC1).** ⛔ No `apps/` / `packages/` file before 0.4 is committed.
  - [x] 0.1 ⭐ DONE 2026-11-25 at `74839891` by the v1.5 validate (the header's RE-PINNED note + F10): fetched; `origin/main` is an
        ancestor of HEAD (rebased); every F-fact file unchanged since `90535934`; numbers re-read across every ref and worktree (migration
        `0218`, decision `-501`, roster 57); row `3-14` still `backlog` with ⛔ story file on any ref ⇒ ⛔ reconcile owed.
        (As written:) `git fetch origin`; confirm `merge-base --is-ancestor 90535934 HEAD`; `git diff --name-only 90535934..origin/main -- packages
        apps` — re-read every F-fact whose file moved. Re-read the next free migration number, decision id and roster row across EVERY ref
        and worktree (`git branch -a`, `git worktree list`, `git ls-tree`) — ⛔ HEAD only. Check row `3-14`'s status: if it has started, read
        its story file for its reading of `kyc_verified` and reconcile with N1 BEFORE 0.2.
  - [x] 0.2 Put DL1–DL16 to BigDev (the question dialog; recommended option first), with DL6 (who), DL8b (how staff reach the member),
        DL12 (the words) and DL14 (the export) as separate questions. Record the answers verbatim in this file.
        ⭐ 2026-11-21 — DL6 *"District + Pariwar Admin (Recommended)"*; DL8b *"Ask Panel: show full mobile"* (⇒ PQ3; built masked).
        ⭐ 2026-11-25 — the rest, at `74839891` after the v1.5 validate, in two dialogs (BigDev: "put Task 0.2 questions to me"),
        EVERY answer the recommended option, ⛔ a change to any DL's text:
        · DL1–DL5 + N1a (one question): *"Accept all as written (Recommended)"*.
        · DL7 + DL9 + DL10: *"Accept as written (Recommended)"* — ⛔ attempt limit; all six document kinds; ⛔ undo.
        · DL12 (its own question; the strings shown word for word in the preview, as DL12 lists them): *"Approve as shown
          (Recommended)"* ⇒ DL12's text is APPROVED, including the 6.39 label *"Typed in at joining, checked by staff"*.
        · DL14 (its own question): *"Include, no staff names (Recommended)"*.
        · DL8 (detail read, masked mobile, live-row note only): *"Accept as written (Recommended)"*.
        · DL11 (queue; ⛔ name / mobile; the `lock-in` widening of FR-2 named in the question): *"Accept, incl. lock-in (Recommended)"*.
        · DL13 + DL15 + DL16: *"Accept all as written (Recommended)"* — staff notifications stay out of scope.
        ⇒ DL1–DL16 all ANSWERED; Task 0.4's entry records them as answered.
  - [x] 0.3 Write the Panel note from the TEMPLATE (§0 first; plain question; the one deciding fact; options with an honest cost; evidence
        last): `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-3-13-checking-a-typed-in-identity.md`, PQ1 + PQ2 (+ PQ3
        iff DL8b (b)). PQ1's deciding fact is the at-death consequence, stated first. Commit it ALONE. ⛔ "Sent" until BigDev says it went
        out ([[feedback_shown_to_panel_means_sent]]).
        ⭐ 2026-11-21 — WRITTEN, ⛔ SENT: `trustee-panel-routing-note-2026-11-21-3-13-checking-a-typed-in-identity.md`, committed ALONE
        `9f7da520` (BigDev: "prepare routing note"), after the DL6 and DL8b answers (DL8b (b) ⇒ PQ3 in). PQ1 gained option B (in person
        only) while writing; the story's PQ1 matches. E4 run before commit. ⏳ The rest of Task 0.2 (DL1–DL5, DL7, DL9–DL16) is still owed.
        ⭐ 2026-11-21 — SENT (BigDev: "sent to panel"); ⏳ awaiting the ruling. ⚠ Not recorded: channel, send time, whether the text sent
        is identical to `9f7da520`.
        ⭐ 2026-11-21 — FOLLOW-UP WRITTEN, ⛔ SENT: `trustee-panel-routing-note-2026-11-21-3-13-follow-up-uploaded-documents.md`
        (`a18654f2`) — Q1 option E (uploaded PAN + masked Aadhaar + selfie, A as fallback) and Q4 (how long copies are kept), from
        author-commit `2026-11-21-482` decision 1 (BigDev: the upload route replaces typing; row `3-16`). Read with the first note.
        ⚠ This story is RESHAPED once both are ruled (DL7 `uploaded_documents`; N5 replaced by row `3-16`'s storage rules; DL8
        shows the uploads; PQ3 may become moot) — by a re-validate, ⛔ before the ruling.
        ⭐ 2026-11-25 (validate v1.5) — follow-up `a18654f2` still ⛔ SENT (BigDev: *"Not sent yet"*); neither note ruled at `74839891`
        (⛔ decision cites either). BigDev: *"Build now, typed-in only (Recommended)"* — dev-story may start once Task 0.2 / 0.4 are done;
        it builds DL7 option A for `self_declared` members only, and N1a keeps 3.16's new strength out until the reshape.
        ⭐ 2026-11-25 — BOTH NOTES RULED, `-502` (above the Panel questions). The follow-up's sending is INFERRED from the ruling. ⇒ the
        reshape re-validate is OWED now, before Task 1 (it supersedes the "build now, typed-in only" plan above where they differ).
        ✅ 2026-11-25 — DONE: v1.9 (R1–R4, BigDev, all as recommended; author-commit `2026-11-25-503`). Dev-story starts at Task 1.
        ⭐ 2026-11-25 — the told note `trustee-panel-told-2026-11-25-3-13-identity-check-as-built.md` (`72fd4561`) SENT (BigDev: *"told
        note sent to panel"*); ⛔ a ruling asked. Channel, time and identity of the text sent ⛔ recorded.
  - [x] 0.4 Author-commit decision entry (`<date>-<next>`): DL1–DL16 as answered, the §0 split, the `-424` match quoted verbatim, the
        Policy meaning, PQ1/PQ2/PQ3 open + built side; committed ALONE. ⚠ If the write is refused, ask once ([[project_decision_log_writes_user_inserted]]).
        ⭐ 2026-11-25 — [`2026-11-25-501`](../../.decision-log.md#decision-2026-11-25-501), committed ALONE `f6987b0d` (BigDev: "yes,
        write 0.4, 0.5 and 0.6"); `-500` was the highest id on every ref. It also carries N1a and the follow-up's Q1 E / Q4 as open.
  - [x] 0.5 ⭐ 2026-11-25 — roster **Row 57** `identity-validation-live` (legs (a), (b), (b2), (c), (d) as below, plus **(e)** the
        follow-up note sent, ruled and this story re-validated against it — added because the follow-up postdates this task's text);
        `deferred-work.md` section *"governance of story 3-13-… — Task 0.5"* (PQ1, PQ2, PQ3, the follow-up — each open with its trigger);
        a dated line on the `3-13` sprint row. (As written:) Roster row (next free number — 57 at `74839891`; 54 at the old pin, since taken by 12.5) `identity-validation-live` with legs: (a) PQ1 ruled and DL7's vocabulary matches
        the ruling; (b) PQ2 ruled (and, if B/C, its row built); (b2) PQ3 ruled (and, if B, the audited number read built; if C, its row
        built); (c) a real-browser pass of the admin module; (d) row `3-14` built (until
        then the check changes only the at-death half). `deferred-work.md`: PQ1 / PQ2 / PQ3 as open; a dated comment on the `3-13` sprint row.
  - [x] 0.6 Sprint row `3-13-…` `ready-for-dev → in-progress` (map only; the ledger entry is written once at the end —
        [[project_sprint_status_ledger]], safe prepend — [[project_sprint_status_safe_prepend]]).
        ⭐ 2026-11-25 — flipped. One governance ledger line (`2026-11-25q`) records Tasks 0.4–0.6, as Tasks 0.2 / 0.3 had theirs; the
        dev-story's single entry is still written at the end. ⇒ **Task 0 is COMPLETE; AC1 is met** — dev-story starts at Task 1.
- [x] **Task 1 — Schema (AC2, AC13).** Hand-authored migrations (⛔ `db:generate` — [[project_live_db_test_gotchas]]): each new enum
      value set in its own file if 0212's precedent did so, then the table + RLS + FORCE + the F10a grants (SELECT, INSERT, column UPDATE
      on the two supersession columns + the note) + the per-command UPDATE policy + CHECKs + the guard (note left out of the frozen list) +
      the one-way-supersession trigger, all at birth. The field class `MEMBER_IDENTITY_VALIDATION_FIELD_CLASS` in
      `encryption/field-classes.ts` + its export. Drizzle schema `packages/domain/src/schema/member_identity_validations.ts` with
      `piiColumn(1, MEMBER_IDENTITY_VALIDATION_FIELD_CLASS)` on the note (the PII gate reads it). Migration number `0218` at `74839891` (F10 — re-read at Task 0.1);
      journal `when` strictly after every sibling's ([[project_sibling_migration_when_order_shared_db]]).
- [x] **Task 2 — Domain (AC3, AC4, AC5, AC6, AC7).**
  - [x] 2.1 `packages/domain/src/kyc/`: `isKycIdentityVerified` (N1) + `markKycTrusteeVerified` (DL2). Lockstep test with 6.39 (AC7).
  - [x] 2.2 `packages/domain/src/member/identity-validation.ts` (transport-free): `recordIdentityValidation(client, input)` — in order:
        `lockAndReadDeathReport` (DL5) → read state + overlay + KYC standing → DL4 eligibility → insert row (supersede) → DL2 flag (confirmed)
        → `projectMemberState` marker (DL3) → `kyc_completed` if `pending-valid` + confirmed. Reads: `listIdentityCheckQueue` (DL11,
        `clampLimit`), `readIdentityCheckDetail` (ciphertext as stored — the API decrypts).
  - [x] 2.3 `member.identity_validation_recorded` in `MEMBER_EVENT_TYPES` / `MEMBER_EVENT_PAYLOAD_SCHEMAS` / `@twt/events` registry; update
        the tests that enumerate member events (F4) — ⛔ weaken any.
  - [x] 2.4 Unit + live-DB tests for AC3–AC6 (live tests on your own container, DB named `twt_dev`).
- [x] **Task 3 — RBAC + API (AC8, AC9, AC10, AC12).**
  - [x] 3.1 Key + grants + catalog note in `permissions.ts` (the house REUSE-CHECK paragraph) and `roles.ts`; contracts mirror if one exists.
        (v1.9) BOTH keys (DL6, DL6a), one bump 65 → 66, 96 → 98; the grant comments name `-502` Q3 and why `field_worker` / `block_admin`
        are ⛔ granted (F13 — an inert grant is refused, the roles.ts house rule).
  - [x] 3.2 The scope preHandler (DL6, F7a): a per-file copy of 6.18's `resolveQueueScope` shape — the caller's own grant scope decides the
        dimension; a district-ceiling caller is checked against `getMemberCurrentDistrict(…, deps.clock())` (per-member routes) or their own
        district (the list); a pariwar-ceiling caller at `pariwar`. Server-derived only; ⛔ client district or dimension.
  - [x] 3.3 `@twt/contracts`: request/response DTOs (`.strict()`, snake/camel per house), the error codes, the list's bounded `limit`.
  - [x] 3.4 `apps/api/src/modules/identity-checks/` (routes with the chain inlined, handlers, decrypt per F8's `adminMemberSearch`
        precedent, the `createKeyedStore` idempotency shape of DL13); register in `server.ts`; OpenAPI emit. ⛔ gate enrolment exists to
        do (F7b) — AC12's tests carry it.
  - [x] 3.5 API integration tests for AC8–AC12 (including the pariwar-admin-on-an-unposted-member leg and the per-route chain tests).
- [x] **Task 4 — Admin UI (AC11, AC14).** `apps/admin/src/modules/identity-checks/` (queue page, detail, two forms), i18n-en entries
      (DL12), router entry + the `RootLayout.tsx` nav link (DL13); (v1.9) the reveal press (DL6a); the 6.39 label change; vitest. ⚠ jsdom traps ([[project_jsdom_disabled_button_keeps_focus]],
      [[project_tanstack_instant_mock_hides_notready_flip]]).
- [x] **Task 5 — Erasure + export (AC13).** `anonymize.ts` scrub (`encSentinel` under the new field class, beside the
      `claimMembershipChecks` scrub); export section (⛔ staff attribution) + contract + fixture. ⛔ guard migration — the guard was written
      at birth (Task 1).
- [x] **Task 6 — Gates.** ⭐ 2026-11-25 — local gates ALL green (below); the PR's GitHub CI run is OWED AT LANDING by BigDev's answer (*"At landing, after review"*) — AC15's CI clause stays open until then. Run the source fence in `apps/api`'s unit suite ([[project_source_fence_lives_in_api_unit_suite]]); the PII
      gate; microcopy; `domain-accessor-invariants`; the live-DB suites on your own container; then the PR's GitHub CI run (AC15 — the
      proof; `scripts/land.sh --dry-run <pr>` before landing, [[feedback_land_prs_by_fast_forward]]). `ci:local` optional.
- [x] **Task 7 — Records (AC15).**
  - [x] 7.1 Story file: Dev Agent Record, File List, Change Log.
  - [x] 7.2 DL15's stale comments (F1 schema comment; F5's `membership-check-approval.ts` doc line).
  - [x] 7.3 Sprint row → `review`; ONE ledger entry (safe prepend; verify the YAML parses and the row count holds).
  - [x] 7.4 `deferred-work.md`: annotate the `-424` Q2 (b) item (*"Trigger fired by 3.13; ⛔ breached — the story writes ⛔ identity
        field (N2)"*), the 2026-10-31 identity item (*"staff step built by 3.13; the lock-in exit is still 3-14's"*), the 2026-08-10
        collision item row 4 (*"a reviewer surface exists (3.13); rows 1–3 unchanged"*); add DL10's undo gap as a new item.

### Review Findings

Code review 2026-11-26 (`bmad-code-review`, full mode; Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallel, no layer failed; branch diff `74839891..7296e28a`, code and tests only, records excluded). About 70 raw findings across the three layers merged to 41: **3 decision-needed, 18 patch, 5 defer, 15 dismissed.** *(Round 2 follows the dismissed list below. After BigDev's answers, 2026-11-26: the three decisions are resolved; D1 and D2 became patches P19 and P20, P15 is superseded by P19, and the open Panel / counsel question from D1 became deferral W6 — so the open items are 19 patches and 6 deferrals.)* The key claims were traced in the code by the reviewer, not taken from the layers. Severity ladder is the acceptance-criteria one; a REAL GAP on a load-bearing-invariant family is not downgraded.

**Decision-needed** (resolve before the patches; none of these is written as a Panel routing note until BigDev chooses to route it):

- [x] [Review][Decision] D1 — The member's data download carries staff's private identity-check note, yet the Panel was told that note "stays with staff". `assemble.ts` decrypts every act's note into `profile.identityChecks[].note`, and `apps/jobs/tests/data-export.test.ts` pins the text in the export (DL14, BigDev: "Include, no staff names"). The told note sent to the Panel on 2026-11-25 (§3) says, verbatim: "We read your words as not including the private note, which stays with staff." Both cannot be true, and the told note is the later statement and the one the Panel holds. Panel gate §0: what the Trust discloses to a member, and the legal basis for a data-access right, so the Panel's if the note stays in. Options: (a) take `note` out of the export now and ask the Panel / counsel whether a staff note about a person is part of what the person may download — cost: the download may under-serve a data-access right until ruled; one line to reverse; (b) keep it and correct the told note to the Panel — cost: the Panel was told the opposite, and a member staff could not confirm (possibly an impostor) reads what staff suspected; (c) keep it and tell staff on the form that the member can read the note — cost: new staff words (D3's rule) and less candid notes. Reviewer's reading: (a) — the export is not live, adding the note back is one line, and a note once delivered cannot be taken back. Also carries the N5 residual (a free-text note that is exported to the member and could hold a document number) — see P17. [packages/domain/src/data-export/assemble.ts, packages/contracts/src/data-export/data-export.ts] **RESOLVED 2026-11-26 (BigDev, question dialog: "Hold note back (Recommended)"):** the note leaves the export now; the Panel / counsel question is asked later (deferral W6, not a routing note yet). Built as patch P19.
- [x] [Review][Decision] D2 — A member with a death claim standing: should the queue still list them, and should the number press tell verifiers and helpline operators why it refuses? DL11 lists every DL4-eligible member and has no death-report predicate (`listIdentityCheckQueue`), so staff are offered "Open" and "Show mobile number" for members for whom both are refused. The press then answers 409 `identity_validation.death_reported` ("The Trust has been told this member has died…") to ANY reveal-key holder — DA, PA, verifier, helpline — and a death claim can be false (the lock releases on `member_found_innocent`). The engineering half is decided: stop listing death-claimed members, reusing the claim module's standing-report predicate (patched with this decision). The governance-shaped half is whether the refusal may name the claim to verifier and helpline. Options: (a) narrow — the reveal refuses with the same generic `not_eligible` line as every other ineligible member; DA and PA still see the death banner on the detail (their own key, DL5); (b) keep DL6a as written. Panel gate §0: (a) is the narrow side and needs no Panel; (b) tells two more roles about a claim, which `2026-11-25-502` Q3 (the number, for this purpose) did not cover. Reviewer's reading: (a). Either answer amends DL11 and DL6a (author-commit) by name, so the decision entry lands first. [packages/domain/src/member/identity-validation.ts (queue WHERE), apps/api/src/modules/identity-checks/handlers.ts:translate / REFUSAL_MESSAGES] **RESOLVED 2026-11-26 (BigDev, question dialog: "Narrow (Recommended)"):** death-claimed members leave the queue, and the number press refuses a death-claimed member with the same generic `not_eligible` line as every other ineligible member (the audit line keeps the real reason). No Panel question. Built as patch P20.
- [x] [Review][Decision] D3 — Words for staff lines that do not exist yet (DL12: staff words are approved word for word). Needed by P10: (1) the number press failed for a reason other than "no longer awaiting a check" (session ended, rate limit, network) — suggested "The number could not be shown. Try again."; (2) an acknowledgement after Confirm or Could not confirm succeeds — today the refetch makes the page say "This member does not need an identity check." straight after staff confirmed — suggested "Identity confirmed." and "Saved." (the history line sits below); (3) a missing choice on the forms needs no new words (`required` + `aria-invalid` + focus). Reviewer's reading: approve (1) and (2) as suggested. [apps/admin/src/modules/identity-checks/i18n-en.ts] **RESOLVED 2026-11-26 (BigDev, question dialog: "Approve as written (Recommended)"):** the words are approved word for word — "The number could not be shown. Try again." (a number press that failed for any reason other than a 409 `identity_validation.*`), "Identity confirmed." (after a confirmation is saved) and "Saved." (after a not-confirmed is saved). A missing choice uses `required` + `aria-invalid` + focus, no new words. Unblocks P10.

**Patch** (all 19 open patches APPLIED 2026-11-26 — committed `5df01653`, after `-504` `3809b863`; evidence in Dev Agent Record → *Code review*):

- [x] [Review][Patch] P1 (blind+edge+auditor; checklist family 8, DL8, DL6a, -502 Q3 B) — The identity view and the number reveal return the data even when their audit line never reaches the database. `emitAuthAudit` is `void writeAuditEntry(...).catch(console.error)` (the sink), and the handler's `audit()` try/catch only catches a synchronous mapping error. DL8 names the awaited precedent (`adminMemberSearch` awaits `audit.writeAuditEntry(deps.servicePool, …)`), and the Trustee-ratified Q3 B says "every showing is recorded". Await a persisted `writeAuditEntry` BEFORE returning the decrypted identity / the number, and answer 503 without the data if the write fails; keep the best-effort emit for post-commit mutation lines. Assert a persisted `audit_log_entries` row in the API spec (today every audit assertion reads the in-memory sink). Also make `identity_opened` mean "a field was actually read". [apps/api/src/modules/identity-checks/handlers.ts:108-115,221-232,406-412; apps/api/src/audit/audit-log-sink.ts:131-139]
- [x] [Review][Patch] P2 (blind+edge) — Staff can press "Confirm identity" (irreversible, DL10) when the typed-in details failed to decrypt. `openKycField` turns a decrypt failure into `null`, the page prints "—", and `eligible` ignores readability. A decrypt FAILURE (a ciphertext present but unreadable) must fail the detail read or hide the forms with a "could not be loaded" line, so nobody confirms against a blank. [apps/api/src/modules/identity-checks/handlers.ts:118-131,191-198; apps/admin/src/modules/identity-checks/IdentityCheckDetailPage.tsx:101-125]
- [x] [Review][Patch] P3 (blind+edge+auditor, governance-shaped; narrow side) — The detail decrypts and shows name, date of birth and photo for ANY in-scope member, including members who need no check (DigiLocker, already verified, `active`, `withdrawn`, `terminated`) and members with a standing death claim; only an anonymized member is withheld. The number is purpose-limited (DL6a) and the search precedent decrypts the name only; the date of birth and photo are a new wider read. Show no decrypted identity and skip the decrypts when `ineligibility !== null || deathReported` (the history stays). This is the narrow side, so no Panel question; it amends DL8 (author-commit), so a decision entry lands first. It also closes the residual of a non-data photo value for a DigiLocker member. [apps/api/src/modules/identity-checks/handlers.ts:183-198]
- [x] [Review][Patch] P4 (blind+edge+auditor; AC14, FR-2, DL11) — The queue screen cannot reach past the first 200 members, and a member staff could not reach stays at the head forever (a `not_confirmed` outcome changes nothing about queue order, N6). The client hard-codes `?limit=200` and never sends `offset`; there is no next-page control and the response has no more-pages signal. Add paging to the client and page, plus an additive `has_more` (or `total`) on the response. Keep DL11's ordering as ratified. [apps/admin/src/api/client.ts:3936; apps/admin/src/modules/identity-checks/IdentityChecksPage.tsx; packages/contracts/src/members/identity-check.ts]
- [x] [Review][Patch] P5 (edge+auditor) — A signed-out admin who follows a deep link to the queue or a member lands on `/audit/integrity` after sign-in: the two path helpers were added to `login-next.ts` but `allowedNextReturn` and `LoginReturn` were not extended (the same defect the file's own header records, fixed for fraud investigations as RC10). Add both routes to the allowlist and the union, with a login-return-path test. [apps/admin/src/routes/login-next.ts:42-58; apps/admin/src/modules/identity-checks/IdentityChecksPage.tsx:25,37; IdentityCheckDetailPage.tsx:26,42]
- [x] [Review][Patch] P6 (auditor+edge; checklist family 2 REAL GAP) — No live two-connection race. The concurrency design rests on the per-(pariwar, member) intake key, and only a held-key check exists. Add `Promise.all` of two record POSTs (distinct keys, then the same key) asserting one live row and one event, and a record racing a death-claim filing. [packages/domain/tests/integration/member/identity-validation.spec.ts; apps/api/tests/integration/identity-checks/identity-checks.spec.ts]
- [x] [Review][Patch] P7 (auditor+edge; checklist families 3 and 12(a) REAL GAP) — No route-level cross-Pariwar or foreign-member-id test (a member of Pariwar B under Pariwar A's path), and no terminated / anonymized mid-flow refusal at the route. The code filters by Pariwar in three places and RLS backs it, but nothing fails if a filter is dropped. Add the legs, and pin `attempt_count >= 2` after a supersession. [apps/api/tests/integration/identity-checks/identity-checks.spec.ts]
- [x] [Review][Patch] P8 (auditor; AC10, AC6, AC8a, family 8) — Three proofs that cannot fail today: AC10's "no decrypt call (a spy)" on the queue (only the body is checked for the planted name), the reveal's "death lock taken FIRST" (the lock-order proof runs only on `recordIdentityValidation`), and "a missing display name blocks the action" (`getDisplayName` null is never driven). Add each. [apps/api/tests/integration/identity-checks/identity-checks.spec.ts; packages/domain/tests/integration/member/identity-validation.spec.ts]
- [x] [Review][Patch] P9 (blind+edge+auditor; family 13(d) analog) — The revealed number lives too long and is not announced. `useMutation` keeps the number in the mutation cache for the default gcTime after the component unmounts (the hook comment says it is not cached), and nothing clears it from the screen. Set `gcTime: 0`, clear `shown` after a short time and on `visibilitychange`; wrap the shown block in `role="status"` so a screen reader hears it appear. In the same file set `refetchOnReconnect: false` and `refetchOnMount: false` on the detail query (every refetch is another audited decrypt). [apps/admin/src/modules/identity-checks/RevealMobile.tsx:14-45; apps/admin/src/modules/identity-checks/hooks.ts:15-21,39]
- [x] [Review][Patch] P10 (blind+edge+auditor; D3's words are approved — see D3) — Error and refusal handling in the admin forms. `RevealMobile` treats every failure (401, 429, 5xx, network) as "can no longer be shown here"; only a 409 `identity_validation.*` should show that line. The record form returns silently when a select is empty (use `required` + `aria-invalid` + focus, no new words), does not invalidate the detail and queue after a 409 refusal (the history and banner go stale), and has no 401 handling on the two mutations. Add the success acknowledgement D3 approves. [apps/admin/src/modules/identity-checks/RevealMobile.tsx:22-25; IdentityCheckDetailPage.tsx:196-262; hooks.ts:27-35]
- [x] [Review][Patch] P11 (edge) — `offset` has no upper bound: `?offset=99999999999999999999` passes `z.number().int()`, reaches `OFFSET $n` and surfaces as a 500. Add a `.max(...)` mirroring the limit cap. [packages/contracts/src/members/identity-check.ts:77]
- [x] [Review][Patch] P12 (blind+edge) — The detail and the reveal answer without `Cache-Control: no-store` although they carry the decrypted identity and the full number; other handlers set `void reply.header('cache-control', 'no-store')` (announcement-channels, member-pool, data-protection). [apps/api/src/modules/identity-checks/handlers.ts:183,368]
- [x] [Review][Patch] P13 (blind+edge) — If `recordResult` throws after COMMIT, the recorded act has no `identity_check_recorded` audit line and the claim is released, so a retry with the same key re-runs the act (a `confirmed` retry answers 409 for something that succeeded; a `not_confirmed` retry supersedes its own row). Emit the audit line immediately after COMMIT, before `recordResult`, and do not release the claim once the transaction has committed. [apps/api/src/modules/identity-checks/handlers.ts:338-361]
- [x] [Review][Patch] P14 (auditor; DL8) — DL8 says staff see the member's state; the payload carries `state` and the page never renders it. Render it with the existing `queue.stateLabels` words. (The KYC route is stated by the page's lead line; every eligible member is `self_declared` under DL4.) [apps/admin/src/modules/identity-checks/IdentityCheckDetailPage.tsx IdentityFacts]
- [x] [Review][Patch] P15 (blind) — **SUPERSEDED by P19 (D1): not built — the note leaves the export, so there is nothing to guard.** One undecryptable note fails the whole data export: `decryptField(v.noteCiphertext, …)` is awaited with no guard, while the API degrades the same failure to `null`. Degrade it to `null` here too. [packages/domain/src/data-export/assemble.ts]
- [x] [Review][Patch] P16 (blind) — The new registry entry was inserted between the Story 10.26 comment block ("`member.*` ON PURPOSE … 8.10's no-ingest-path fence") and the `member.personal_event_asserted` entry it documents, so that comment now reads as if it documented the 3.13 entry. Move the 3.13 block above the 10.26 comment. [packages/events/src/registry.ts:120-129]
- [x] [Review][Patch] P17 (auditor, closure honesty; checklist family 10) — Record the N5 residual: nothing structurally stops staff typing a document or Aadhaar number into the free-text note, which is encrypted, kept, and (until P19 lands) exported to the member; the only mitigation is the lead copy, and AC9's grep covers columns, not note content. Add it to the story's Dev Agent Record as an open residual and to `deferred-work.md` with its trigger. No heuristic digit-check is built (a 12-digit run is also a mobile number with the country code). [story Dev Agent Record; deferred-work.md]
- [x] [Review][Patch] P18 (blind; nits) — Shadowed global (`const [document, setDocument]` shadows the DOM `document`); a second `import … from '@twt/contracts'` block in `client.ts` beside the earlier ones; a no-op `SELECT 1` statement at the end of the detail test, kept only to use an import; seeded members, events, KYC rows and validations never cleaned up in the API spec; the nav test's `Link` stub ignores `params`, so a wrong param passes. [apps/admin/src/modules/identity-checks/IdentityCheckDetailPage.tsx; apps/admin/src/api/client.ts; packages/domain/tests/integration/member/identity-validation.spec.ts; apps/api/tests/integration/identity-checks/identity-checks.spec.ts; apps/admin/tests/identity-checks.test.tsx]

- [x] [Review][Patch] P19 (D1 resolved: hold the note back; amends DL14 and AC13) — Take `note` out of the member's data export: drop it from `ProfileSection.identityChecks` in the contract and from the assembler, and drop the note leg from the jobs strict-parse test, the contracts fixture test and the AC13 export assertions. The export keeps date, outcome, evidence kind, document kind and the closed reason. The RTBF scrub of `note_ciphertext` (DL14's first half) is unchanged. A decision-log entry (author-commit, BigDev) amending DL14 by name lands FIRST. [packages/domain/src/data-export/assemble.ts; packages/contracts/src/data-export/data-export.ts; apps/jobs/tests/data-export.test.ts; packages/contracts/tests/members-identity-check.test.ts]
- [x] [Review][Patch] P20 (D2 resolved: narrow; amends DL11 and DL6a) — (a) `listIdentityCheckQueue` leaves out a member with a standing death claim, using the claim module's ONE standing-report predicate (not a second implementation); (b) `postRevealMobile` answers a death-claimed member with the same generic 409 `identity_validation.not_eligible` and the same "does not need an identity check" words as every other ineligible member, while the `member_mobile_reveal_rejected` audit line keeps the real reason code `death_reported` (the log tells, the screen does not); the DA / PA detail keeps its death banner (DL5). The told note's "once their death is reported, the button stops working" stays true. Tests: the queue omits a death-claimed member and lists them again after an innocence finding; the reveal answers `not_eligible` and audits `death_reported`; the detail still shows the banner. A decision-log entry (author-commit, BigDev) amending DL11 and DL6a by name lands FIRST. [packages/domain/src/member/identity-validation.ts (queue WHERE); apps/api/src/modules/identity-checks/handlers.ts postRevealMobile / translate]

**Deferred:**

- [x] [Review][Defer] W1 — The queue's SQL evaluates every DL4-eligible member before `LIMIT` (a correlated `count(*)`, a correlated latest-moderation lookup and a lateral posting per row) because `ORDER BY` needs the full set, and the page refetches on focus. No measurement shows a problem. Not pre-existing — introduced here, unmeasured: row 3-14 makes the candidate set the whole typed-in member base. [packages/domain/src/member/identity-validation.ts:391-419] — deferred; see deferred-work.md.
- [x] [Review][Defer] W2 — A user holding key-bearing grants in two districts gets a queue (and a gate) for the first one only, because `resolveIdentityCheckScope` takes `here.find(district)`. Pre-existing pattern: the 6.18 `resolveQueueScopeStash` it was copied from does the same, on purpose. [apps/api/src/modules/identity-checks/routes.ts:64-70] — deferred, pre-existing.
- [x] [Review][Defer] W3 — `recordIdentityValidation` decides `kyc_completed` from the state it read before the marker, not from the replayed marker state. Speculative today: no `lock_in_expired` producer exists, and `projectMemberState`'s stream-version conflict is the backstop. Introduced here; becomes real when row 3-14 ships a second writer of the member stream. [packages/domain/src/member/identity-validation.ts:215,253-272] — deferred; trigger row 3-14.
- [x] [Review][Defer] W4 — `kyc_profile_updated_at` on a CONFIRMED act can never equal the profile's later `updated_at` (DL2 bumps it in the same transaction, after the snapshot), and nothing clears `trustee_verified` if the identity ciphertexts are rewritten later. Introduced here by DL1 / DL2 as written; nothing reads the snapshot yet. [packages/domain/src/member/identity-validation.ts recordIdentityValidation / markKycTrusteeVerified] — deferred; trigger the first consumer of the snapshot, or any story that lets a verified member edit their identity.
- [x] [Review][Defer] W5 — The record route's idempotency key carries no body fingerprint (the same key with a different body replays the first result), and after the 300-second TTL the same key re-executes. Pre-existing: the personal-event handler this was copied from has the same shape. [apps/api/src/modules/identity-checks/handlers.ts:51-52,264-281] — deferred, pre-existing.

- [x] [Review][Defer] W6 (from D1) — Whether a person may download a staff note written about them when staff checked their identity is a Panel / counsel question (what the Trust discloses to a member; a legal basis for a data-access right). It is NOT asked yet: the note is held out of the export (P19), which is reversible with one line. Not a code defect and not pre-existing; recorded so it is not forgotten. [packages/domain/src/data-export/assemble.ts] — deferred; trigger the Panel sitting that approves row 3-13a's member message, or before the data export goes live, whichever is first.

**Dismissed (15), for the record:** the two roles not yet built for the number (decided by BigDev R3 and `-503`, the Panel told, the narrow side) · the photo `<img src>` unchecked (the manual-KYC contract bounds it to a `data:image/(jpeg|jpg|png);base64,` URI; P3 closes the residual) · "the latest moderation event may use the wrong event set" (`MODERATION_EVENT_TYPES` is exactly the three action events) · "trustee" vocabulary on a DA/PA act (the 6.39 convention) · no composite FK and the app-role note grant in 0212's copy (0212 precedent, frozen-column tests) · death-banner copy (words approved verbatim) · an irreversible confirm without a confirmation step (DL10, the undo item is tracked) · the reveal as an oracle and a harvesting risk apart from the death-claim line (Trustee-ratified, every showing audited; the death line is D2) · the chain guarded only by DB-gated tests (the F7b / AC12 house pattern) · AC11's inline session lines (house precedent) · the CHECK reading stricter than DL1's text (flagged by the dev, compatible) · the export's random tie-break (no tie outside one transaction) · `events.ts` importing the schema tuple (`audit-shape.ts` already does, and the schema imports nothing back) · overloaded markers in test titles (house style) · "other tests still asserting the old 'checked by a trustee' label" (grep: none).

**Round 2 — adversarial review of the applied patches (2026-11-26; Blind Hunter + Edge Case Hunter + Acceptance Auditor on the patch diff `7296e28a` → working tree, no layer failed; about 55 raw findings merged to 19 patches, 2 deferrals, 17 dismissed; ALL 19 patches applied).** The decision this round amends is still `-504` (text tightened in place — it is uncommitted).

- [x] [Review][Patch] R2-1 — The "no number / name / note in the audit line" proofs could never fail: the persisted row has only `request_payload_hash`. The tests now pin the hash of the EXACT expected context (`contextHash`), for the number press and the detail read. [identity-checks.spec.ts]
- [x] [Review][Patch] R2-2 — P13 had no test, and the `postRecord` docblock still described the old order. A `recordResult` failure after COMMIT is now injected (the `contact-call.spec` technique): 201, the key stays `pending`, the act and ONE audit line landed. Docblock rewritten. [identity-checks.spec.ts; handlers.ts]
- [x] [Review][Patch] R2-3 — Checklist family 2 stayed a gap for a record racing a death-claim filing. Two deterministic tests hold the claim-intake key as "the claim being filed", start the record / the number press (asserted BLOCKED on that key), land the claim, release: `death_reported` / the generic refusal, ⛔ row, ⛔ `member_mobile_shown`. [identity-checks.spec.ts]
- [x] [Review][Patch] R2-4 — P7's missing legs: an ANONYMIZED member refused at every route (and out of the queue), and `attempt_count` pinned at 2 after two acts. [identity-checks.spec.ts]
- [x] [Review][Patch] R2-5 — The number press wrote its audit line AFTER the transaction (and its claim-intake key) had been released, so the now-awaited write widened a window in which a death claim could be filed. The line is written INSIDE the locked transaction; an audit failure is the 503 and ⛔ the number. [handlers.ts]
- [x] [Review][Patch] R2-6 — The queue pager unmounted while a page loaded (focus fell to `<body>`), vanished on a failed later page (no way back), and an emptied later page said "No member is waiting…". `keepPreviousData`; the pager stays mounted; an error shows the line plus Previous; an emptied later page steps back; a press on the placeholder is ignored. [IdentityChecksPage.tsx; hooks.ts]
- [x] [Review][Patch] R2-7 — The revealed number is cleared from the mutation result too (`reset()`), on the timer, a hidden tab and a new press; the `role="status"` region is ALWAYS mounted and the number inserted into it. [RevealMobile.tsx]
- [x] [Review][Patch] R2-8 — A save followed by a failing refresh no longer replaces the page with "could not be loaded": the data stays and the existing load-error line shows above it. [IdentityCheckDetailPage.tsx]
- [x] [Review][Patch] R2-9 — A confirmed save hides the forms, identity and press at once (before the refetch returns). [IdentityCheckDetailPage.tsx]
- [x] [Review][Patch] R2-10 — `aria-invalid` marks are dropped for selects that unmount on a reason change. [IdentityCheckDetailPage.tsx]
- [x] [Review][Patch] R2-11 — The saved acknowledgement sits in an always-mounted `role="status"` region and focus moves to it after a save (the focused submit button unmounts on a confirmation). [IdentityCheckDetailPage.tsx]
- [x] [Review][Patch] R2-12 — `key={memberId}` on the detail view; a sticky refusal clears when a re-read says the member is eligible with no death claim. [IdentityCheckDetailPage.tsx; hooks.ts]
- [x] [Review][Patch] R2-13 — Five comments made true: `postRecord`'s docblock, `hooks.ts` ("a retry repeats the decrypts, each writing KMS audit lines" — ⛔ "multiplies audit lines"), `routes.ts`, `audit-sink.ts`, `death-report.ts`. [handlers.ts; hooks.ts; routes.ts; audit-sink.ts; death-report.ts]
- [x] [Review][Patch] R2-14 — `noStandingDeathReportSql`'s doc was garbled and over-restrictive about the aliases `c` / `f`; rewritten, and "the list and the gate share ONE definition" replaces "cannot disagree" (the list is an unlocked snapshot). [death-report.ts]
- [x] [Review][Patch] R2-15 — The detail showed the raw internal state (`active`, `withdrawn`, …) for a state with no staff label; it now shows the state only when `queue.stateLabels` has one. [IdentityCheckDetailPage.tsx]
- [x] [Review][Patch] R2-16 — GOVERNANCE-SHAPED observation (Auditor), settled on the narrow side: the masked number is withheld exactly as the identity is (a member who needs no check has nothing for staff to arrange); the live act's note and the history stay (staff's own record). `-504` item 1 says so. No Panel question. [handlers.ts; IdentityCheckDetailPage.tsx]
- [x] [Review][Patch] R2-17 — `-504` text: the gate reasoning no longer says "none widens … so none is put to the Panel" without owning that item 5 could UNDER-serve the member's access right; its trigger now matches `deferred-work.md` `3.13-R1-W6`; plain "not" replaces the ambiguous `⛔` in the Status and gate lines; the policy-meaning paragraph records that no Niyamavali clause is engaged. [.decision-log.md]
- [x] [Review][Patch] R2-18 — Closure honesty, in the Dev Agent Record: the N5 residual (P17), why the seeded-row cleanup nit is not constructible (P18), why `refetchOnMount` stays default, the house "Previous" / "Next" words, the reveal's 401. [story]
- [x] [Review][Patch] R2-19 — The export test's "no note" proof is scoped to `identityChecks`, not the whole `profile.json`. [data-export.test.ts]
- [x] [Review][Defer] W7 — the awaited disclosure audit write has no timeout (the global audit-chain lock) — pre-existing posture of every awaited `writeAuditEntry` caller. [handlers.ts] — deferred, pre-existing; see deferred-work.md.
- [x] [Review][Defer] W8 — the queue's page is local state, not in the URL, so opening a member from page 2 returns to page 1 — introduced by P4, a convenience only. [IdentityChecksPage.tsx] — deferred; see deferred-work.md.

**Dismissed in round 2 (17), for the record:** a permanently unreadable field is a 503 with no way to record (decided by `-504` item 1: staff are ⛔ shown a blank beside a live Confirm) · "eligible with no KYC row" (unreachable: DL4 makes no-KYC ineligible) · two DB connections held across the awaited audit write (the `adminInvalidateValidityCache` precedent) · strict contracts without version tolerance (house style; admin and API ship together) · `has_more` computed before the per-row scope filter (the filter equals the SQL district filter by construction) · the "not even one render" MutationObserver proof (mutation-checked by the admin agent) · the P8 domain test targets no production change (it pins existing behaviour, as P8 asked) · detail disclosure racing the lock (DL5: ⛔ lock on a read) · `NaN` offset (the contract rejects it) and the offset's cost (W1) · a 401 on the record discarding a draft (redirect on session loss is the house behaviour) · the deleted `SELECT 1`, the registry move and "leftover imports" (P18 / P16 asked; typecheck and lint clean) · OpenAPI / route wiring not in the diff (the handlers keep their routes; AC12's OpenAPI is unchanged) · a number arriving into an already-hidden tab stays until the tab is revisited (the clear listens for `visibilitychange`; no one sees a hidden tab) · `refetchOnMount: false` not set (a mount IS a view; `gcTime: 0`) · the reveal has no 401 redirect (D3's "could not be shown" line covers a session that ended) · family 11's Niyamavali sentence (no clause engaged; recorded in `-504`) · seeded-row cleanup (the tables are append-only — not constructible).

## Dev Notes

### Traps

1. **⛔ Route the flag through `upsertMemberKycProfile`.** It rewrites the identity ciphertexts and is the latest-wins store `-424` Q2 (b)'s
   addition warns about. Use the narrow `markKycTrusteeVerified` UPDATE (DL2, N2).
2. **⛔ Append `member.kyc_completed` from `lock-in`.** The reducer would ignore it (F3), so no test fails — but the payload's `to_state:
   'active'` would be false audit metadata, and row `3-14` would see a `kyc_completed` it does not expect. Only from `pending-valid`.
3. **The death lock is FIRST and is the intake key.** Any other advisory lock or read before `lockAndReadDeathReport` breaks 6.38's lock
   order (its header). And N3's reason: 6.39 re-reads `trustee_verified` on every call — validating mid-claim silently drops its
   identity half. AI-3-2 TOCTOU walk: claim filed concurrently ⇒ the intake key serialises them.
4. **`actor: 'trustee'` is the enum's word.** ⛔ Add `staff` / `district_admin` to `memberActorSchema` — it is a shared audit shape; the
   human is identified by `actorId` on the projector call.
5. **The 6.39 leaf.** `membership-check-approval.ts` must import nothing new (its header, the NW1 transitive scan). The lockstep test
   lives in the TEST, importing both.
6. **⛔ Name in a list; the full mobile ONLY through DL6a's audited press.** (v1.9) `-502` Q3 ruled the disclosure, for arranging the check
   only: ⛔ the number in the detail payload, the list, a log line or an audit payload; ⛔ a reveal once the member is no longer awaiting a
   check. (`-459` Q2's *"Keep the phone number out."* is a field WORKER's number — ⛔ this.)
7. **No Aadhaar number, no copy, no upload IN THIS STORY** (uploads are row `3-16`'s, R1) — not even "last 4" typed by staff (N5). The masked Aadhaar column is DigiLocker's, ⛔ this.
8. **Clock ties.** Two acts in one test transaction share `now()` — "latest" must not rest on `created_at` alone (DL1).
9. **Hand-format; Prettier is not enforced** ([[project_prettier_not_enforced]]); `**cl.3**`-style text in a JSDoc closes it
   ([[project_markdown_emphasis_closes_jsdoc]]).
10. **The shell's `DATABASE_URL` is the native `:5432`.** A plain `git push` no longer runs `ci:local` (the hook is advisory since
    `3675a228`, ADR-0047 cl.4) — only `RUN_CI_LOCAL=1 git push` does, and then it needs `DATABASE_URL=<your container>`. `pnpm dev` and an
    UNSCOPED `vitest run` still hit `:5432` ([[project_prepush_hook_inherits_5432]]). The hook runs from the MAIN checkout
    ([[project_hookspath_absolute_main_checkout]]).
11. **A fixed `district` gate refuses everyone for an unposted member** (F7a) — `super_admin` included. The dimension must move with the
    caller (DL6); AC8's pariwar-admin-on-an-unposted-member leg is the test that catches it.
12. **No gate watches these routes** (F7b). A missing `requireAdminSession` would ship green — AC12's per-route chain tests are the only
    guard.

### What this story does ⛔ do
It does not end anyone's lock-in, make anyone `active` today (⛔ member is `pending-valid` until `3-14`), change 6.39's gate or what a family
sees, tell any member anything (row `3-13a` does — `-502` Q2 C), store or review an upload (row `3-16`), change any typed-in detail, undo a confirmation, or close the duplicate-identity gap.

### Project Structure Notes
- New: `packages/domain/migrations/02NN_*.sql` (numbers at Task 0.1), `packages/domain/src/schema/member_identity_validations.ts`,
  `packages/domain/src/member/identity-validation.ts`, `apps/api/src/modules/identity-checks/`, `apps/admin/src/modules/identity-checks/`,
  contracts DTOs, tests beside each.
- Updated: `packages/domain/src/kyc/profile-write.ts` (+ the verified helper), `encryption/field-classes.ts` + `encryption/index.ts`
  (the new field class), `member/events.ts`, `packages/events/src/registry.ts`,
  `rbac/permissions.ts`, `rbac/roles.ts`, `member/anonymize.ts`, `data-export/assemble.ts` + its contract, `schema/member_kyc_profiles.ts`
  (comment), `claim/membership-check-approval.ts` (comment only), `apps/admin/src/modules/claim-verification/i18n-en.ts` (one label),
  `apps/api/src/server.ts`, the admin router, `apps/admin/src/routes/RootLayout.tsx` (nav link).

### Testing
Unit (domain, contracts, api with `DATABASE_URL` UNSET), live-DB (domain + api, own container, `twt_dev`), admin vitest. Every "nothing
written" assertion has a passing control beside it ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]). A domain red hides the
other packages — re-run the whole job ([[project_known_livedb_test_failures]]).

### References
- PRD `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` FR-2 · `architecture.md` §1.14 (the transition table rows for
  `pending-valid` / `active`) · Niyamavali §2.1 (private corpus — `/Users/dev/Developer/projects/TWT/docs/legal/niyamavali.md`, by absolute
  path, [[feedback_worktree_session_never_cd_to_main_checkout]]).
- `.decision-log.md` — `2026-10-31-424` (Q1 (a) C, Q2 (b) addition, Consequence 2), `2026-11-21-472` (DL4, DL7, DL16).
- Story 6.39 (`6-39-identity-check-before-a-drive-for-an-unchecked-identity.md`) — the closest precedent: one staff act, one live row,
  District Admin key, append-only record, admin console words.
- Story 6.38 — the death lock (`death-report-lock.ts`). Story 3.3b — the manual route. Story 3.1 — the reducer.
- `sprint-status.yaml` — navigate by the `3-13-…` and `3-14-…` row blocks (⛔ line numbers — the file is prepend-structured).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 3.13 on worktree`, 2026-11-25, in this story's own worktree on
`story/3-13-trustee-validation-of-manually-entered-identity` (based on `origin/main` `74839891`, 0 behind at start).

### Debug Log References

- Live DB: the story's OWN fresh container `twt-3-13-pg` (postgres 16.14, `127.0.0.1:5461`, DB `twt_dev`), migrated through `0218`.
  ⛔ `:5432`, ⛔ `:5433`.
- Fixture fixes while writing tests (⛔ code defects): `events_log.actor_id` is a uuid (a string actor id failed 22P02);
  `member_moderation_actions` needs escalation columns for a `terminate` row (0099's CHECK) — the queue test seeds moderation EVENTS
  instead, which is also what the queue now reads (Completion note 2).
- `pnpm turbo run typecheck` caught one test-only typing error that `tsc --noEmit` in `apps/api` did not (the package's typecheck
  includes `tests/`); fixed in the spec.
- **Task 6 gates (2026-11-25, at the records commit's parent):** `pnpm turbo run typecheck` 20 / 20; lint on domain / contracts / api /
  admin / events / jobs 18 / 18; `schema:check`, `microcopy:check`, `domain-invariants:check`, `member-state:check`,
  `claim-adjudication-human-actor:check`, `access-wrapper:check`, `governance-boundary:check`, `kyc-provider:check`, `pii:check` — PASS;
  the source fence (`apps/api` unit suite, 1207 passed); admin vitest 2393 / 2393; contracts 1817 / 1817. ⭐ The live suite with CI's
  OWN command (`pnpm turbo run test --concurrency=1 --force --filter=@twt/domain … --filter=@twt/public`) on the story's container:
  **24 / 24 tasks** — domain 8969 passed (1 skipped), api 3435 (1 skipped), jobs 2402, public 826, channels 468, validity-service 284,
  niyamavali-engine 144, events 50, queue 4. ⛔ `ci:local` run (optional under ADR-0047).
- Mutation checks (each reverted, `cmp` against a scratch backup): (a) the scope preHandler forced to a fixed `district` gate ⇒ 3 API
  tests red, incl. AC8's Pariwar-Admin-on-an-unposted-member leg (the F7a trap) — so that leg bites; (b) `requireAdminSession` dropped
  from the reveal route ⇒ AC12's per-route chain test red (Trap 12 — the only guard).

### Completion Notes List
- Ultimate context engine analysis completed - comprehensive developer guide created (create-story, 2026-11-21, at `90535934`).
- **Task 1 (AC2)** — migration `0218_member-identity-validations.sql` (journal `when` 1797998880000, after 0217's) hand-authored in
  0212's statement order: text + CHECK vocabularies (0212 used ⛔ pgEnum), RLS + FORCE, SELECT/INSERT + the column-level UPDATE on
  `superseded_at` / `superseded_reason` / `note_ciphertext`, the per-command UPDATE policy, the partial-unique one-live index, the
  append-only guard AT BIRTH (note left out of the frozen list) and the one-way supersession trigger. Schema, policy file, branded id
  `MemberIdentityValidationId`, field class `MEMBER_IDENTITY_VALIDATION_FIELD_CLASS`. 18 live-DB backstop tests (every CHECK refused by
  its own NAME, the NULL traps, grants, owner-level guard, one-way, scrub as `twt_app`, TRUNCATE, cascade; AC9's ⛔-number-column leg).
- **Task 2 (AC3–AC7)** — `kyc/identity-verified.ts`: `isKycIdentityVerified` (N1) + `KYC_STRENGTH_STAFF_CHECKABLE` (N1a, `satisfies
  Record<MemberKycVerificationStrength, boolean>`) + the derived list; the lockstep test iterates `MEMBER_KYC_VERIFICATION_STRENGTHS`
  (7 inputs); `membership-check-approval.ts` imports nothing new (comment only). `markKycTrusteeVerified` — the narrow conditional
  UPDATE (⛔ the UPSERT). `member.identity_validation_recorded` (`.strict()`, `trigger`/`actor` literals) in the vocabulary (24 → 25,
  both count fixtures moved together) and `@twt/events`' registry. `member/identity-validation.ts`: `recordIdentityValidation` (shape →
  ⭐ death lock FIRST → state / overlay / KYC → DL4 → supersede + insert → flag → marker → `kyc_completed` only from `pending-valid`),
  `assertIdentityCheckAwaited` (DL6a's purpose check, the same lock + DL4), `listIdentityCheckQueue` (raw SQL, `clampLimit`, district
  pushed into SQL), `readIdentityCheckDetail` (ciphertext as stored). 28 live tests: AC3 byte-identical KYC row + a forced failure
  after the UPDATE (reason asserted, both writes seen inside the tx as the control, then gone after the rollback); AC4 both states;
  AC5 twelve refused cases each with a passing control + a "⛔ INSERT/UPDATE issued" recorder proof; AC6 the first statement is the
  intake lock and the key is held (`pg_locks`), refused under a standing report, released by an innocence finding.
  `git diff` of `member/state.ts` is EMPTY (N7).
- **Task 3 (AC8–AC10, AC12)** — catalog 65 → 66, 96 → 98 (`member.validate_identity`: DA + PA; `member.reveal_mobile_for_identity_check`:
  DA, PA, verifier, helpline; super admin derived; ⛔ field_worker / block_admin, the house inert-grant rule). Contracts
  `members/identity-check.ts` (+ lockstep test). `apps/api/src/modules/identity-checks/`: four routes, plain literal paths, the chain
  inlined, `namedRateLimits` per-session ceilings (the admin precedent DL13 asked to find — read / write). 22 API tests: AC12 per
  route; AC8 / AC8a loops over `rbac.defaultRoleBundles` (13), each role granted at its own ceiling; DA other district / unposted 403,
  PA unposted 200 + 201; queue scope; AC8a two presses ⇒ two lines, ⛔ the digits in any line; refused once confirmed / under a
  standing report; AC9 six 400s; AC10 detail (masked mobile, live note only, ONE read line with ⛔ name / DOB / note / number);
  idempotent replay. `forced-pagination.spec.ts` green on `app.swagger()`.
- **Task 4 (AC11, AC14)** — `apps/admin/src/modules/identity-checks/` (queue, detail, two forms, `RevealMobile`), router entries,
  `RootLayout.tsx` nav link `nav-identity-checks`, client calls in `api/client.ts` (`apiFetch` is module-private), hooks beside the
  module. The 6.39 label now reads *"Typed in at joining, checked by staff"*. 15 vitest tests. Microcopy gate green (its config scans
  `apps/admin/src/**`). Admin suite 2393 / 2393.
- **Task 5 (AC13)** — `anonymizeMember` scrubs the note where present (its unit test 35 → 36 statements, 32 → 33 tables, a new leg);
  live RTBF spec (2 notes → sentinel, note-less row untouched, every other column unchanged); the export's `ProfileSection.identityChecks`
  (contract + assembler in one change; jobs strict-parse leg; contracts fixture leg refusing any staff attribution).
- **Task 7.2 / 7.4** — the two stale comments (F1 schema, F5 6.39 leaf); `deferred-work.md`: the `-424` Q2 (b) item (fired, ⛔ breached),
  the 2026-10-31 identity item, the 2026-08-10 collision table row 4, and a NEW item for DL10's undo gap.
- **Interpretations the reviewer should look at (each within the DLs, ⛔ a new decision):**
  1. DL1 / DL9 — what each `not_confirmed` reason carries: a mismatch names evidence AND document; `no_document_shown` names the
     evidence (how they met), ⛔ document; `member_not_reached` names neither (they never met). DL1's text said only "document_kind NULL for
     `no_document_shown`"; `member_not_reached` with an evidence kind would record a meeting that never happened.
  2. DL11's "`terminated`" in the QUEUE reads the member's latest `member.moderation.*` action EVENT (the stream the writer's overlay
     folds), ⛔ `member_moderation_actions` — one source for the list and the writer.
  3. DL11 + DL6a — the queue is gated on the REVEAL key only (every holder of the check key holds it too); the response carries
     `can_check` so a verifier / helpline sees the press and ⛔ an Open button.
  4. DL6 — the scope preHandler prefers a pariwar-or-broader grant over a district one (6.18 preferred district first): a caller who
     holds both is never narrowed to one district.
  5. AC12 "OpenAPI regenerated" — `pnpm contracts:emit-openapi` re-emits `openapi/v1.yaml` BYTE-IDENTICAL: the contracts emitter
     registers ⛔ path for these routes (6.39's routes are not registered either). The route surface is the app's `swagger()`, which
     `forced-pagination.spec.ts` walks.
  6. DL14's "a new strict section" is a new strict FIELD of `profile.json` (`ProfileSection.identityChecks` — the 12.5b
     `partnerOfferVisits` precedent), ⛔ a new export file.
  7. The reveal's transaction is ROLLED BACK (nothing is written; the advisory lock is transaction-scoped).
- **Two answers from BigDev at the dev-story's end (one question dialog, 2026-11-25):**
  (a) AC11 — the admin strings DL12 did ⛔ list (form labels, document names, loading / error lines, the nav link), shown word for word
  in the dialog's preview: *"Approve as shown (Recommended)"* ⇒ APPROVED; the `// (label)` markers were removed from
  `modules/identity-checks/i18n-en.ts` and its header records the approval. ⇒ AC11 met.
  (b) AC15 / Task 6's GitHub leg — *"At landing, after review (Recommended)"* ⇒ the PR's `ci.yml` run at the tip (ADR-0047, the merge
  proof) is OWED AT LANDING, the 6.39 / 3.15d order; ⛔ pushed, ⛔ PR opened in this session. AC15's CI clause stays OPEN until then.

- **Code review (`bmad-code-review 3.13 on worktree`, 2026-11-26) — what was decided, built and proven.** Three layers (Blind Hunter, Edge Case Hunter,
  Acceptance Auditor) on the branch diff, then — at BigDev's word, *"run adversarial review on patches applied once done, then apply patches for findings"* —
  the same three on the patch diff. Findings, decisions, deferrals and dismissals are in `### Review Findings` above.
  (a) **Decisions (question dialogs, 2026-11-26):** D1 *"Hold note back (Recommended)"*, D2 *"Narrow (Recommended)"*, D3 *"Approve as written (Recommended)"*,
  patches *"Apply every patch"*. Written FIRST as author-commit `2026-11-26-504` (amends `-501` DL8 / DL11 / DL12 / DL14 and `-503` DL6a by name; supersedes
  ⛔ ratified text) — committed ALONE and FIRST (`3809b863`), then the code (`5df01653`), then these records.
  (b) **Built:** a disclosure's audit line is AWAITED and persisted before the data is returned (503 `audit_unavailable`, and for the number press INSIDE the
  transaction that still holds the claim-intake key); the typed-in identity and the masked number are read only while a check is awaited and an unreadable
  field is a 503 `identity_unreadable`; the queue omits a member with a standing death claim (the claim module's ONE predicate, generalised as
  `noStandingDeathReportSql` — ⛔ a second copy) and pages with `has_more` / a bounded `offset`; the number press answers a death-claimed member with the
  generic `not_eligible` (the audit row keeps `death_reported`); the staff note is out of the data export; `no-store` on the detail and the press; the post-COMMIT
  order (settled → audit → `recordResult`, a failure there logged); the admin queue pages (50 a page), returns after sign-in, clears the number and its
  mutation result, announces through always-mounted regions, and keeps what it had when a refresh fails.
  (c) **Evidence (the final tree, DATABASE_URL pointing ONLY at this story's container, `127.0.0.1:5461`):** typecheck clean in contracts, domain, events, api,
  admin, jobs; eslint clean on every changed file outside admin (admin: the admin agent's run, exit 0); live — domain identity-validation + rtbf +
  release-rule-agreement 37, the migration-level RLS policy regression 18, API identity-checks 36, jobs data-export 6; unit (DATABASE_URL unset) — api 1156, domain
  4335, contracts 1818, admin 2451 (whole suite alone), the two jobs files that read `login-next.ts` as text 40; 13 static gates (`domain-invariants`,
  `member-state`, `claim-state`, `claim-canonical-id`, `claim-adjudication-human-actor`, `access-wrapper`, `kyc-provider`, `governance-boundary`, `friction`,
  `schema`, `pii`, `microcopy`, `i18n`). One admin test (`field-worker-find-page`, a hidden-tab leg) failed ONCE while five suites ran at once and passed 3 of 3
  alone and in the whole-suite run — a load flake in a file this story does not touch. The admin agent mutation-checked its tests (every production line it
  added was broken once; one survivor, an unobservable call order).
  (d) **NOT proven here:** ⛔ the GitHub CI run (AC15's CI clause stays OPEN until landing, BigDev's answer of 2026-11-25); ⛔ `ci:local`; ⛔ a real-browser pass —
  the `role="status"` regions, the focus move after a save and the pager's focus are asserted in jsdom, which cannot prove a screen reader announces
  them (checklist family 13(d); roster Row 57 (c)'s browser pass owns it); ⛔ the P13 `recordResult` failure was injected through a `pool.connect` spy (the
  `contact-call.spec` technique), ⛔ a real store outage.
  (e) **Deviations, stated plainly:** `refetchOnMount` is left at its default (a mount IS a view; the query has `gcTime: 0`) where P9 listed it; the queue's page
  went from a hard-coded 200 to 50 and the offset ceiling is 1,000,000; `retry: false` on the detail query (each fetch decrypts, each decrypt writes KMS audit
  lines); the reveal has no 401 redirect (D3's "could not be shown" line covers a session that ended), the record has one; **"Previous" and "Next"
  are the console's existing house words (`banner.page.prev` / `banner.page.next`, pinned equal by a test), added to `identityCheckEn.queue` — D3 approved
  three lines, so BigDev's word on these two is OWED**; the P18 seeded-row cleanup is ⛔ constructible (`events_log`, `member_identity_validations` and
  `audit_log_entries` are append-only).
  (f) **Open residuals (⛔ closed):** the N5 free-text note can hold a document number (`deferred-work.md` `3.13-R1-N5`; no digit-check was built — a 12-digit
  run is also a `91…` mobile number); the data-export note question for the Panel / counsel (`3.13-R1-W6`); `3.13-R1-W1`…`W5`, `W7`, `W8`.

### File List

- `_bmad-output/implementation-artifacts/3-13-trustee-validation-of-manually-entered-identity.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/admin/src/api/client.ts`
- `apps/admin/src/modules/claim-verification/i18n-en.ts`
- `apps/admin/src/modules/identity-checks/IdentityCheckDetailPage.tsx`
- `apps/admin/src/modules/identity-checks/IdentityChecksPage.tsx`
- `apps/admin/src/modules/identity-checks/RevealMobile.tsx`
- `apps/admin/src/modules/identity-checks/format.ts`
- `apps/admin/src/modules/identity-checks/hooks.ts`
- `apps/admin/src/modules/identity-checks/i18n-en.ts`
- `apps/admin/src/router.tsx`
- `apps/admin/src/routes/RootLayout.tsx`
- `apps/admin/src/routes/login-next.ts`
- `apps/admin/tests/identity-checks.test.tsx`
- `apps/api/src/audit/audit-sink.ts`
- `apps/api/src/context.ts`
- `apps/api/src/modules/identity-checks/crypto.ts`
- `apps/api/src/modules/identity-checks/handlers.ts`
- `apps/api/src/modules/identity-checks/routes.ts`
- `apps/api/src/server.ts`
- `apps/api/src/types.ts`
- `apps/api/tests/integration/identity-checks/identity-checks.spec.ts`
- `apps/jobs/tests/data-export.test.ts`
- `packages/contracts/src/data-export/data-export.ts`
- `packages/contracts/src/members/identity-check.ts`
- `packages/contracts/src/members/index.ts`
- `packages/contracts/tests/members-identity-check.test.ts`
- `packages/domain/migrations/0218_member-identity-validations.sql`
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/claim/membership-check-approval.ts`
- `packages/domain/src/data-export/assemble.ts`
- `packages/domain/src/encryption/field-classes.ts`
- `packages/domain/src/encryption/index.ts`
- `packages/domain/src/ids/index.ts`
- `packages/domain/src/kyc/identity-verified.ts`
- `packages/domain/src/kyc/index.ts`
- `packages/domain/src/kyc/profile-write.ts`
- `packages/domain/src/member/anonymize.ts`
- `packages/domain/src/member/events.ts`
- `packages/domain/src/member/identity-validation.ts`
- `packages/domain/src/member/index.ts`
- `packages/domain/src/policies/index.ts`
- `packages/domain/src/policies/member-identity-validation-rls.ts`
- `packages/domain/src/rbac/permissions.ts`
- `packages/domain/src/rbac/roles.ts`
- `packages/domain/src/schema/index.ts`
- `packages/domain/src/schema/member_identity_validations.ts`
- `packages/domain/src/schema/member_kyc_profiles.ts`
- `packages/domain/tests/integration/member/identity-validation-rtbf.spec.ts`
- `packages/domain/tests/integration/member/identity-validation.spec.ts`
- `packages/domain/tests/integration/rls/member-identity-validation-policy-regression.spec.ts`
- `packages/domain/tests/kyc/identity-verified.test.ts`
- `packages/domain/tests/member/life-events-markers.test.ts`
- `packages/domain/tests/member/personal-event-assertion.test.ts`
- `packages/domain/tests/member/rtbf-anonymize.test.ts`
- `packages/domain/tests/rbac/permissions.test.ts`
- `packages/domain/tests/rbac/roles.test.ts`
- `packages/events/src/registry.ts`

(Added by the code review, 2026-11-26 — not in the list above:)
- `.decision-log.md`
- `apps/admin/src/routes/LoginPage.tsx`
- `apps/admin/tests/login-return-path.test.tsx`
- `packages/domain/src/claim/death-report.ts`


## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-21 | Created by `bmad-create-story 3.13` in its own worktree at `origin/main` `90535934`. §0 applied: the `-424` match quoted; DL1–DL16 PROPOSED for Task 0.2; PQ1 (what staff must see) and PQ2 (is the member told) PROPOSED for one non-blocking note; AI-10-1 Policy meaning written. ⛔ Code. |
| 1.1 | 2026-11-21 | Validated (`bmad-create-story validate 3.13`, BigDev: "all"; traced at `90535934`). F7a (a null scope target is refused for everyone ⇒ DL6 / DL11 gate dimension moves with the caller, the 6.18 queue shape; AC8 pariwar-admin-on-unposted leg + all-13-bundles loop); F7b (⛔ CI gate scans admin member routes ⇒ AC12 per-route chain tests, ⛔ enrolment); F10a (0212's live-row mechanism as built ⇒ DL1 grants / guard / one-way trigger / `decided_by_*` at birth; ⛔ guard REPLACE in DL14 / AC13 / Task 5); new field class; F8 decrypt precedent (`adminMemberSearch`, ⛔ `bounded-decrypt.ts`); DL13 idempotency = `createKeyedStore` personal-event shape; DL12 microcopy is whole-word ⇒ keep `identity_validation.death_reported`; DL14 export carries ⛔ staff attribution; DL8b + PQ3 (how staff reach the member); PQ1's deciding fact (the at-death consequence) and C's build cost; `-459` quoted verbatim; F10 sibling numbers (6-22b: `-477`–`-480`, `0213`, ledger letter `21s`); DL5 lock also serialises staff acts; DL11 FR-2 widening noted; the list's bounded `limit`. ⛔ Code. |
| 1.2 | 2026-11-21 | Task 0.3: the Panel note WRITTEN (⛔ sent), committed alone `9f7da520` (BigDev: "prepare routing note"). Task 0.2 in part: DL6 *"District + Pariwar Admin (Recommended)"*, DL8b *"Ask Panel: show full mobile"* ⇒ PQ3 in the note. PQ1 gains option B (in person only; old B / C become C / D); §0 / Task 0.4 / Task 0.5 roster legs / `deferred-work.md` lines carry PQ3. ⛔ Code. |
| 1.3 | 2026-11-21 | Task 0.3: the Panel note SENT (BigDev: "sent to panel"); awaiting the ruling. Channel, send time and whether the text sent equals `9f7da520` ⛔ recorded. ⛔ Code. |
| 1.4 | 2026-11-21 | Follow-up Panel note WRITTEN (⛔ sent), `a18654f2`: Q1 option E + Q4, after the registration proposal (author-commit `2026-11-21-482`, on `governance/registration-change-2026-11-21`). The story is reshaped by a re-validate once both notes are ruled. ⛔ Code. |
| 1.5 | 2026-11-25 | Rebased onto `origin/main` `74839891` (179 commits; backup `backup/3-13-pre-rebase-2026-11-25`; changed-line sets verified equal) and re-validated (`bmad-create-story validate 3.13`, BigDev: "All 7"). Re-pinned `90535934` → `74839891`; every F1–F9 / F10a file unchanged. (1) AC15 / Task 6 / Trap 10: the merge proof is the PR's GitHub `ci.yml` run (ADR-0047, `-499`), ⛔ `ci:local`; a plain push touches ⛔ database. (2) F10 / Task 0.5 / Task 1: next migration `0218`, decision `-501`, roster row 57. (3) N1a (new): staff-checkable strengths are ONE total map `satisfies Record<MemberKycVerificationStrength, boolean>` — DL2 / DL4 read it; AC7 iterates `MEMBER_KYC_VERIFICATION_STRENGTHS`, ⛔ "3 strengths" (3.16 mints a new value). (4) `-482` decisions 1 / 6 and BigDev's 2026-11-25 answers in the rulings table; F12 and Task 0.3 annotated (follow-up ⛔ sent; build now, typed-in only). (5) DL13 / Task 4 / AC14 / Project Structure: the `RootLayout.tsx` nav link (#69 (g)). (6) Pin note. (7) Ledger letter `2026-11-21s` → `2026-11-21aq`; `21w` collision with `story/6-39a-…` recorded, open. ⛔ Code. |
| 1.6 | 2026-11-25 | Task 0.2 DONE: DL1–DL5 + N1a, DL7 / DL9 / DL10, DL8, DL11 (incl. the `lock-in` widening), DL12 (words approved verbatim), DL13 / DL15 / DL16 and DL14 (export without staff names) put to BigDev in two question dialogs — every answer the recommended option, recorded verbatim at Task 0.2. Next: Task 0.4 (decision `-501`, committed alone), 0.5 (roster Row 57), 0.6. ⛔ Code. |
| 1.7 | 2026-11-25 | Task 0 COMPLETE (BigDev: "yes, write 0.4, 0.5 and 0.6"): 0.1 ticked against the v1.5 re-derivation; 0.4 — Decision `2026-11-25-501` committed ALONE `f6987b0d`; 0.5 — roster Row 57 `identity-validation-live` (legs (a)–(e); (e) = the follow-up note) + a `deferred-work.md` section for PQ1–PQ3 and the follow-up; 0.6 — row `ready-for-dev → in-progress`, Status in-progress. AC1 met. ⛔ Code. |
| 1.8 | 2026-11-25 | Both Panel notes RULED — Decision `2026-11-25-502` (Trustee-ratified, DR + KB, committed alone `6cb66cef`): PQ1 A + follow-up Q1 E, Q4 B, PQ2 C (⛔ our suggestion), PQ3 B widened to four more roles (the Panel's). Ruled banner above the Panel questions; Task 0.3 annotated; ruling blocks filled in both notes; Row 57 / `deferred-work.md` dated lines; new row `3-13a`. The text below the banner is AS PROPOSED — the reshape re-validate is owed before Task 1. ⛔ Code. |
| 1.9 | 2026-11-25 | RE-VALIDATED after the rulings (`bmad-create-story validate 3.13`, the reshape; BigDev R1–R4, all as recommended; author-commit `2026-11-25-503`). F13 (traced at `74839891`): `verifier` district / `helpline_operator` pariwar ceilings fit; `field_worker` has ⛔ login and ⛔ keys (13.3); a member has ⛔ block (`no-member-attribute`, permanent) ⇒ ⛔ `block_admin` scope; the `-328` precedent shows on page load, `-502` Q3 B needs a press. NEW DL6a — `member.reveal_mobile_for_identity_check` (DA, PA, verifier, helpline; SA derived), one audited POST per press, refused once the purpose ends (DL4) or a death is reported; also reads the queue; field worker + Block Admin DEFERRED, the Panel TOLD (R3). DL7: A stands; E's review + `uploaded_documents` mint are row `3-16`'s (R1). N5 / N6 / Policy meaning / DL8b / DL11 / DL12 (R4 words) / DL13 (4th route) / DL16 / AC8 (98 keys) / AC8a (new) / AC9 / AC10 / AC12 / AC14 / Task 3.1 / Task 4 / Traps 6–7 / "does not do" amended in place, each marked (v1.9). Catalog 65 → 66 once, 96 → 98. Dev-story may start Task 1. ⛔ Code. |
| 1.10 | 2026-11-25 | The told note (`72fd4561`) SENT (BigDev: "told note sent to panel"); Task 0.3 annotated; Row 57 dated line. ⛔ Code. |
| 1.11 | 2026-11-25 | DEV-STORY (`bmad-dev-story 3.13 on worktree`): Tasks 1–7 done — migration `0218` + schema / RLS / field class / id; the domain (N1 helper + N1a map, the narrow flag writer, the marker event, the writer with the death lock first, the reveal's purpose check, the queue, the detail); catalog 65 → 66 (98 keys); four admin routes; contracts; the admin module + nav link + the 6.39 label; the RTBF scrub + the export field; DL15 comments; `deferred-work.md` annotated (+ the DL10 undo item). BigDev: the extra admin strings *"Approve as shown"*; the PR *"At landing, after review"* (AC15's CI clause open until landing). Live suite 24 / 24 on the story's own container. Status review; ledger `2026-11-25u`. ⛔ Pushed. |
| 1.12 | 2026-11-26 | CODE REVIEW (`bmad-code-review 3.13 on worktree`; Blind Hunter + Edge Case Hunter + Acceptance Auditor, then the same three on the patches): 3 decisions (D1 hold the note back, D2 narrow, D3 words — all as recommended), 19 patches + 19 round-2 patches APPLIED, 8 deferrals (W1–W8; `deferred-work.md`), 32 dismissed. Author-commit `2026-11-26-504` committed FIRST and alone (`3809b863`); the patches `5df01653`. Evidence in Completion Notes. Status stays `review` (CI at landing owed; `done` at landing is BigDev's call). |
