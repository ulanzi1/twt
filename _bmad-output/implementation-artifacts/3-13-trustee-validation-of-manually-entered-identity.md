---
baseline_commit: 90535934
---

<!--
PINNED: `90535934` = `origin/main` (`git fetch origin` 2026-11-21, at authoring — Story 6.39 landed, PR #331). Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/3-13-trustee-validation-of-manually-entered-identity`, branch
`story/3-13-trustee-validation-of-manually-entered-identity` (upstream UNSET — it was made from `origin/main`; push with an explicit refspec,
[[project_story_branch_upstream_is_main]]). The main checkout was ⛔ switched ([[feedback_shared_tree_branch_switch]]).
Every `apps/` / `packages/` claim below was traced by hand at `90535934` on 2026-11-21. Re-locate by FUNCTION, ⛔ by line number.
⚠ The two facts are separate ([[feedback_story_validate_footguns]] #24): "the pin is an ancestor of HEAD" is durable; "the code claims were
re-derived at `90535934`" is perishable — Task 0.1 re-derives them.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`):
  · THAT a typed-in identity is validated by the Trust before the member is fully a member — PRD FR-2 (*"the member becomes `pending-valid`
    until trustee validation"*), AR-14, architecture §1.14 (*"Trustee approves manual KYC → `active`"*), Niyamavali §2.1 (b) (membership
    needs *"identity verification (KYC)"*). ⚠ PRD / architecture / Niyamavali are ⛔ Panel rulings (the Niyamavali is a rulebook, ⛔
    ratified — [[feedback_niyamavali_rulebook_not_spec]]); ⛔ ruling of the Panel says anything about checking an identity IN LIFE.
  · WHAT A CHECK IN LIFE MEANS AT DEATH — a MATCH, ⛔ a question: `2026-10-31-424` Q1 (a) C (Trustee-ratified) covers *"someone who typed
    in their own identity details, never verified since"* — a member this story verifies is, by those words, outside the ruled case. 6.39
    built exactly that reading (`-472` DL4). Quoted verbatim below ([[feedback_panel_gate_read_ratified_verbatim]]).
  · WHAT STAFF MUST SEE to confirm an identity, and WHAT HAPPENS / WHO IS TOLD when they cannot — the Panel's (what the Trust OWES a member:
    whether they are covered once lock-in ends; whether they are told). PQ1 / PQ2, ONE non-blocking note at Task 0.3, each built on the
    narrow / unchanged side until answered; ruled before go-live (new roster row, Task 0.5).
  · HOW it is recorded, WHERE it sits, WHICH staff role, WHAT the screens say — the AUTHOR's (DL1–DL16, BigDev at Task 0.2). ⚠ DL6 (which
    staff role) is surfaced to the Panel inside PQ1's text so it is ⛔ hidden in a "told" line ([[feedback_told_line_must_not_carry_panel_choice]]).
-->

# Story 3.13: Staff Check a Typed-In Identity While the Member Is Alive

Status: ready-for-dev

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
⚠ **What this note does ⛔ cover:** gate 2's consequence for a member staff could ⛔ confirm (they leave coverage at lock-in end) is created
by row `3-14`, and belongs in ITS Policy-meaning note — this story only makes it avoidable. PQ2 puts the member-facing half to the Panel.

## ⭐ THE INVARIANTS

- **N1 — ONE definition of "verified".** A new pure helper `isKycIdentityVerified(standing)` in `packages/domain/src/kyc/` (DigiLocker
  `aadhaar_kyc` **or** `trustee_verified = true`) is the ONLY place that says what "verified" means. 6.39's `isIdentityCheckRequired` must
  agree with it on every input (a lockstep unit test over the full cross-product of the three enum values × the boolean × null — ⛔ a
  refactor of 6.39's leaf: `membership-check-approval.ts` must stay a LEAF, its own header's TR4), and row `3-14` will read it. Two readers
  of one fact must not be able to disagree ([[feedback_told_line_must_not_carry_panel_choice]] "How to apply").
- **N2 — ⛔ identity DATA is changed.** This story never writes `name_ciphertext`, `dob_ciphertext`, `photo_ciphertext`,
  `aadhaar_masked_id`, `verification_strength` or `source`. It writes `trustee_verified` (false → true only) and `updated_at`. A staff
  correction of a typed-in name is ⛔ this story (`-424` Q2 (b)'s addition would bind it — the KYC store is latest-wins).
- **N3 — ⛔ validation after a death is reported.** The membership check (6.39) is the identity step after a death; it re-reads
  `trustee_verified` on EVERY call (its N2). A validation recorded while a death report stands would silently remove 6.39's identity half
  from an open claim — a second door around a Trustee-ratified step. Refused, under the intake key, FIRST (DL5).
- **N4 — Append-only record, one live row.** Every staff act is a row; a later act supersedes; ⛔ UPDATE/DELETE of history (except the
  erasure scrub of the Tier-1 note — DL14).
- **N5 — ⛔ Aadhaar number, ⛔ document image is stored.** Staff record WHAT KIND of document they saw, ⛔ its number and ⛔ a copy.
  Aadhaar Act s.8A(4)(b) bars storing the full number *"for any purpose"* ([[project_aadhaar_full_number_storage_barred]]).
- **N6 — A `not_confirmed` changes nothing for the member today.** ⛔ state change, ⛔ moderation, ⛔ fraud flag, ⛔ message.
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
  against a SERVER-DERIVED posting district (a claim-keyed stash). For a member-keyed district, `packages/domain/src/member-geo/`
  (`resolve.ts`) is the resolver family — the dev confirms which export resolves a member's CURRENT posting district (Task 3.2; ⛔ assume).
  Path shape: `/api/v1/p/:pariwarId/admin/…`; the human-actor chain `[requireAdminSession, scopeResolutionHook, …, requirePermissionHook]`.
- **F8 — What staff already see of a member.** `apps/admin/src/modules/member-status/` (`MemberStatusPanel.tsx`) shows the KYC name and a
  **masked** mobile (`maskedMobile`) under `member.view_validity`; `packages/domain/src/member/search-read.ts` returns the encrypted
  columns and the handler decrypts. ⛔ admin surface shows a member's FULL mobile ⇒ DL8 shows masked only (a match), ⛔ a new disclosure.
- **F9 — Keys.** `packages/domain/src/rbac/permissions.ts` `PERMISSION_CATALOG_VERSION = 65`, 96 keys, newest `claim.check_membership`
  (6.39). Roles: `packages/domain/src/rbac/roles.ts` `defaultRoleBundles` (13). A `pariwar`-ceiling grant satisfies a `district`-dimension
  check; a `district`-ceiling one fails a `pariwar` check ([[project_rbac_geo_scope_containment]]).
- **F10 — Numbers at the pin.** Highest migration `0212_claim-membership-checks.sql`; highest decision `2026-11-21-476`; highest roster row
  53 (`docs/launch-gate-inventory/inventory-roster.md`; Row 46 written after 53). Every one is RE-READ at Task 0.1 across every ref and
  worktree (`story/6-22b-…` is live in its own worktree).
- **F11 — Erasure / export touch points.** `packages/domain/src/member/anonymize.ts` (RTBF scrub); the data export already carries
  `trusteeVerified` (`packages/contracts/src/data-export/data-export.ts`, `packages/domain/src/data-export/assemble.ts`) — sections are
  strict-parsed ([[project_data_export_sections_strict_parsed]]).
- **F12 — Who is in the queue today.** Every member whose KYC row is `self_declared` and who has paid (`lock-in`). The manual route is ON
  by default (`kyc_manual_fallback` inverted, `apps/api/src/modules/kyc/manual-fallback-seam.ts`) ⇒ possibly most members.

## Build decisions — PROPOSED (BigDev answers at Task 0.2)

- **DL1 — One record.** A new table `member_identity_validations` (TENANT-ISOLATED, RLS by `pariwar_id`, FORCE, `twt_app` grants SELECT +
  INSERT only — and the one scrub UPDATE DL14 needs): `validation_id` (uuid PK), `pariwar_id`, `member_id` (FK `members`), `outcome`
  (`confirmed` | `not_confirmed`), `evidence_kind` (DL7), `document_kind` (DL7, NULL when `not_confirmed` for `no_document_shown`),
  `not_confirmed_reason` (DL9, NULL iff `confirmed` — a CHECK), `note_ciphertext` (Tier-1, `piiColumn(1, …)`; REQUIRED iff
  `not_confirmed` — a CHECK), `kyc_profile_updated_at` (the snapshot F2 describes), `actor_user_id`, `created_at`. One LIVE row per member;
  a later act supersedes — ⭐ **mirror `claim_membership_checks`' live-row mechanism exactly** (read `0212_claim-membership-checks.sql` and
  its schema first; ⛔ invent a second shape; and ⛔ order "latest" by `created_at` alone — one txn ⇒ equal `now()`,
  [[project_db_clock_ordering_tests_tie]]). Append-only guard trigger, as 0212.
- **DL2 — The flag.** On `confirmed`, in the SAME transaction: `UPDATE member_kyc_profiles SET trustee_verified = true, updated_at = now()
  WHERE pariwar_id = $1 AND member_id = $2 AND verification_strength = 'self_declared' AND trustee_verified = false` — zero rows ⇒ 409
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
- **DL4 — Who can be validated.** A KYC row exists, `verification_strength = 'self_declared'`, `trustee_verified = false`, and the member's
  state is `lock-in` or `pending-valid`. Refused (409 `identity_validation.not_eligible`, one code, the reason in the log only): no KYC row;
  `aadhaar_kyc` / `unverified`; already verified; `pending-kyc` / `pending-fee` (⛔ yet a member — Niyamavali §2.1 (c)); `withdrawn` /
  `anonymized`; `active` / `active-in-grace` / `lapsed-unpaid` (unreachable for a `self_declared` member except by a hand-seeded fixture —
  fail closed); moderation overlay `terminated`. A `suspended` member CAN be validated (identity is a fact; a suspension ends).
- **DL5 — The death lock FIRST.** The write's first statement is `lockAndReadDeathReport` (F6); a standing report ⇒ 409
  `identity_validation.death_reported`. The detail READ also says so (a banner, the form ⛔ shown) — ⛔ lock on a read. (N3.)
- **DL6 — Who checks.** A NEW key `member.validate_identity`, granted to `district_admin` (district dimension, against the member's
  server-derived CURRENT posting district — F7) and `pariwar_admin` (any district — the Trustee-Lite who acts for "the trustee" in v1,
  [[project_trustee_lite_votes_not_state_trustee]]); `super_admin` by derivation. Catalog 65 → 66, keys 96 → 97; `defaultRoleBundles`
  stays 13. ⛔ `field_worker` (who may have onboarded the member), ⛔ `helpline_operator`, ⛔ `verifier`, ⛔ `state_trustee` (deprecated
  footing), ⛔ `trustee_panel` (the Panel body; routine work is ⛔ its). A member with no resolvable posting district ⇒ a District Admin's
  check FAILS CLOSED (only a Pariwar Admin can act). REUSE CHECK — ⛔ `claim.check_membership` (death-time, claim-keyed), ⛔
  `member.moderate`, ⛔ `member.view_validity` (a read). *Considered and not taken:* District Admin only (a Pariwar with few District
  Admins would stall); Pariwar Admin only (FR-2's "trustee" literally — the queue could be most members, F12). ⚠ "Trustee" is the PRD's
  word, ⛔ the Panel's; PQ1 shows the Panel who checks.
- **DL7 — What staff record they saw (built to PQ1 option A until ruled).** `evidence_kind`: `photo_id_in_person` |
  `photo_id_video_call`. `document_kind`: `aadhaar_card` | `pan_card` | `voter_id` | `driving_licence` | `passport` |
  `government_service_id`. ⛔ number field, ⛔ upload. Staff confirm the name and date of birth on the document match the record, and (when
  a photo is on record) the face. If the Panel rules B or C, the vocabulary changes (enum mint is delegated — `-210` cl.2,
  [[project_enum_mint_authority_delegated]]) or the write route is withdrawn.
- **DL8 — What staff see (the detail read).** The KYC name, date of birth and photo (decrypted, bounded — the KYC module's
  `bounded-decrypt.ts`; ONE audit line per view, ⛔ per field), the masked mobile (F8 — ⛔ full number), the member's state, signup date,
  current posting (district, school), the KYC route, and the history of validations (date, outcome, evidence / document kind, reason,
  the recording staff's display name — [[project_admin_display_name_attribution]]; the note decrypted only for the current live row's
  viewer, audited). ⚠ COST: each `decryptTier1` fires an audit line per FIELD with ⛔ DEK cache ([[project_kms_audit_per_hmac_global_lock]]) —
  the detail is one member, ~3–4 decrypts; the LIST decrypts nothing (DL11).
- **DL9 — `not_confirmed`.** Reason (closed list): `details_do_not_match` | `photo_does_not_match` | `no_document_shown` |
  `member_not_reached`; a note required (Tier-1, ≤ 1,000 code points). Effect: N6 — nothing changes; the member stays in the queue with
  the latest outcome shown; staff may record again at any time. ⛔ time limit, ⛔ attempt limit.
- **DL10 — ⛔ undo in this story.** Once `confirmed`, ⛔ route makes the member unverified again (the reducer has ⛔ `active →
  pending-valid` arm, and 6.39 would silently re-impose its check). A wrongful confirmation found later is the fraud register's (Story
  6.22; *"identity fraud"* is ground 2 of Niyamavali §8.5) — recorded in `deferred-work.md` (Task 7.4), ⛔ built.
- **DL11 — The queue (FR-2).** `GET` list: members eligible under DL4 within the caller's scope, `pending-valid` first, then by signup date
  ascending (`members.created_at`, tie-broken by `member_id`); each row: short member id, signup date, state, district, latest outcome +
  date, attempt count. ⛔ name, ⛔ mobile on the list (⛔ Tier-1 decrypt on a list — one rule for the whole surface,
  [[feedback_withholding_must_be_uniform]]); open a row for the detail. Paginated with `clampLimit` (the `domain-accessor-invariants` gate;
  ⛔ `Math.min`, [[project_domain_limit_clamp_and_savepoint_retry]]).
- **DL12 — Staff words (English only — approved word for word at Task 0.2).** Page title *"Identity checks"*; list empty *"No member is
  waiting for an identity check."*; detail lead *"This member typed in their identity details when they joined. Check them against an
  original photo ID, shown to you in person or on a video call. Do not copy or keep the document or its number."*; buttons *"Confirm
  identity"* / *"Could not confirm"*; confirmed line *"Identity confirmed by {name} on {date}."*; not-confirmed line *"Not confirmed on {date}:
  {reason}."*; reasons *"Details do not match the ID"* / *"Photo does not match"* / *"No ID was shown"* / *"Could not reach the member"*;
  death-lock banner *"The Trust has been told this member has died. Their identity is checked on the claim instead."*; not-eligible
  *"This member does not need an identity check."*; and the 6.39 label `trustee_verified` reworded to *"Typed in at joining, checked by
  staff"*. ⚠ The microcopy gate scans `apps/admin/src/**` and bans `report` (`microcopy.yaml` term list) — ⛔ "receipt" / "report" /
  "invoice" in copy, test ids OR comments ([[project_microcopy_gate_scans_admin_code]]); name the lock `deathLock` / `death_notified`,
  ⛔ `deathReported`, anywhere under `apps/admin/src/`. (The API error code `identity_validation.death_reported` lives in `apps/api` and
  contracts — confirm at Task 0.1 that neither is in the gate's globs; if one is, use `identity_validation.death_notified`.)
- **DL13 — Routes.** `GET /api/v1/p/:pariwarId/admin/members/identity-checks` (queue), `GET …/admin/members/:memberId/identity-check`
  (detail), `POST …/admin/members/:memberId/identity-check` (record; `Idempotency-Key` required — the house `withIdempotency`, COMMIT then
  `recordResult`, [[project_idempotent_write_handler_shape]]). Plain string-literal paths; enrolled in whichever human-actor gate covers
  admin member writes (Task 3.4 finds it). Admin UI: a new module `apps/admin/src/modules/identity-checks/`, routed in the admin router.
- **DL14 — Erasure and export.** RTBF (`anonymize.ts`) scrubs `note_ciphertext` to the house sentinel; the append-only guard function is
  REPLACED to allow that one column ([[project_append_only_guard_names_erasure_columns]]). The data export gains the member's validation
  history (date, outcome, evidence kind, document kind, reason, note) — ⛔ the staff member's identity (role only) — a new strict section
  in `@twt/contracts` + `assemble.ts`. *Considered:* leave the export unchanged (it already carries `trusteeVerified`) — rejected: the
  record is the member's personal data.
- **DL15 — Stale comments re-worded** (Task 7.2): the schema comment (F1), 6.39's route doc line (F5), the sprint-status row comment's
  *"Until this row is built"* (by a dated line, ⛔ an edit), and the `deferred-work.md` items' annotations (Task 7.4).
- **DL16 — Not in scope:** the lock-in producer (row `3-14`); any member-facing screen or message (PQ2); a staff change to name / date of
  birth / photo; a DigiLocker re-run for an already-joined member; an undo (DL10); periodic re-verification (`-424`, ⛔ put); the Aadhaar
  HMAC / duplicate-identity gap; a backfill; any change to 6.39's gate, door or copy except the one label (DL12); notifications to staff.

## Panel questions — PROPOSED (one non-blocking note at Task 0.3)

⭐ Both pass §0: each is what the Trust OWES a member (whether their identity counts as verified — and so whether they are covered once
lock-in ends — and whether they are told). Neither blocks the build or the merge; both block GO-LIVE (Task 0.5). Built on the narrow /
unchanged side meanwhile.

- **PQ1 — What must staff see before they confirm a typed-in identity in life?**
  - **A (our suggestion):** the member shows an original government photo ID — in person or on a video call — to a District Admin or
    Pariwar Admin, who checks the name, date of birth and photo against what the member typed in; nothing is copied or kept. *Cost:* a
    video call can be staged by a determined impostor; it takes staff time for possibly most members.
  - **B:** as A, and the member's school or office also confirms in writing that the person works there under that name. *Cost:* slower,
    more staff work, and the Trust collects a letter from an employer.
  - **C:** no staff check — the member must later complete DigiLocker themselves; staff only remind. *Cost:* a member who cannot use
    DigiLocker is never verified, and (once lock-in ends) is not covered.
  - *Built:* A (DL7). ⭐ The note states who checks (DL6) in A's own text, so the Panel can change it.
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
   mechanism mirrored from 0212, and an append-only guard; a live-DB test proves: cross-Pariwar invisible (RLS), UPDATE / DELETE refused
   by the guard (asserting the refusing rule, ⛔ "something failed"), each CHECK refuses its bad row, a second act supersedes the first.
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
   isIdentityCheckRequired(x)` for every `x` in {null} ∪ {3 strengths} × {true, false}; `membership-check-approval.ts` imports ⛔ new module
   (its leaf scan stays green).
8. **AC8 (DL6).** Key `member.validate_identity` in the catalog (v66, 97 keys), granted to `district_admin` and `pariwar_admin`, derived to
   `super_admin`; a test per role: district admin of the member's district → 200/201; of another district → 403; of a member with no
   posting → 403; pariwar admin → allowed; `field_worker`, `helpline_operator`, `verifier`, `state_trustee`, `trustee_panel` → 403.
   ⛔ client-supplied district is read.
9. **AC9 (DL7, DL9, N5).** The POST body accepts only the DL7 / DL9 vocabularies (a closed `z.enum`, `.strict()`); a body carrying any
   number-like field or an upload is refused 400; `not_confirmed` without a note → 400; `confirmed` with a reason → 400. A grep-test proves
   ⛔ column or field in the new table / contract named like `*number*` / `*aadhaar*` / `*image*`.
10. **AC10 (DL8, DL11).** The queue returns exactly the DL4-eligible members in scope, in DL11's order (a test with ≥ 3 members including a
    tie on `created_at`), with ⛔ Tier-1 field and ⛔ decrypt call (a spy); `limit` goes through `clampLimit`. The detail returns the DL8
    fields, decrypts the name / DOB / photo, writes ONE view audit line, and the mobile is masked.
11. **AC11 (DL12).** Every staff string is the Task-0.2-approved text, from the admin i18n file (⛔ inline literals); the 6.39
    `trustee_verified` label reads the approved rewording; the microcopy gate is green ON these files (read its config list — ⛔ its
    header — [[feedback_gate_scope_semantic_coverage]]).
12. **AC12 (DL13).** Three routes, plain-literal paths, the human-actor chain, enrolled in the covering gate; POST without `Idempotency-Key`
    → 400; a replay returns the recorded result and writes nothing new. OpenAPI regenerated (compare with anchors resolved —
    [[project_openapi_yaml_anchor_renumbering]]).
13. **AC13 (DL14).** RTBF of a validated member scrubs `note_ciphertext` (and only it) — the append-only guard REPLACED, a live test; the
    member's data export contains the new section, and a fixture-contract test covers it ([[project_contracts_tests_outside_tsc]]).
14. **AC14 (admin UI).** The admin module renders the queue, the detail and both forms; vitest covers: empty queue copy, the death-lock
    banner hides the form, `not_confirmed` requires a note before submit, a 409 shows the not-eligible line, a successful confirm refreshes
    the detail. A real-browser pass is a GO-LIVE leg, ⛔ a merge condition ([[project_not_in_production_merge_is_not_golive]]).
15. **AC15 (records).** DL15's comments re-worded; `deferred-work.md` annotated (Task 7.4); `pnpm ci:local` green on a FRESH container with
    `DATABASE_URL` pointing at it ([[project_prepush_hook_inherits_5432]], [[project_known_livedb_test_failures]]).

## Tasks / Subtasks

- [ ] **Task 0 — Governance FIRST (AC1).** ⛔ No `apps/` / `packages/` file before 0.4 is committed.
  - [ ] 0.1 `git fetch origin`; confirm `merge-base --is-ancestor 90535934 HEAD`; `git diff --name-only 90535934..origin/main -- packages
        apps` — re-read every F-fact whose file moved. Re-read the next free migration number, decision id and roster row across EVERY ref
        and worktree (`git branch -a`, `git worktree list`, `git ls-tree`) — ⛔ HEAD only. Check row `3-14`'s status: if it has started, read
        its story file for its reading of `kyc_verified` and reconcile with N1 BEFORE 0.2.
  - [ ] 0.2 Put DL1–DL16 to BigDev (the question dialog; recommended option first), with DL6 (who), DL12 (the words) and DL14 (the export)
        as separate questions. Record the answers verbatim in this file.
  - [ ] 0.3 Write the Panel note from the TEMPLATE (§0 first; plain question; the one deciding fact; options with an honest cost; evidence
        last): `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-3-13-checking-a-typed-in-identity.md`, PQ1 + PQ2. Commit it
        ALONE. ⛔ "Sent" until BigDev says it went out ([[feedback_shown_to_panel_means_sent]]).
  - [ ] 0.4 Author-commit decision entry (`<date>-<next>`): DL1–DL16 as answered, the §0 split, the `-424` match quoted verbatim, the
        Policy meaning, PQ1/PQ2 open + built side; committed ALONE. ⚠ If the write is refused, ask once ([[project_decision_log_writes_user_inserted]]).
  - [ ] 0.5 Roster row (next free number — 54 at the pin) `identity-validation-live` with legs: (a) PQ1 ruled and DL7's vocabulary matches
        the ruling; (b) PQ2 ruled (and, if B/C, its row built); (c) a real-browser pass of the admin module; (d) row `3-14` built (until
        then the check changes only the at-death half). `deferred-work.md`: PQ1 / PQ2 as open; a dated comment on the `3-13` sprint row.
  - [ ] 0.6 Sprint row `3-13-…` `ready-for-dev → in-progress` (map only; the ledger entry is written once at the end —
        [[project_sprint_status_ledger]], safe prepend — [[project_sprint_status_safe_prepend]]).
- [ ] **Task 1 — Schema (AC2, AC13).** Hand-authored migrations (⛔ `db:generate` — [[project_live_db_test_gotchas]]): each new enum
      value set in its own file if 0212's precedent did so, then the table + RLS + FORCE + grants + CHECKs + guard. Drizzle schema
      `packages/domain/src/schema/member_identity_validations.ts` with `piiColumn(1, …)` on the note (the PII gate reads it). Journal `when`
      strictly after every sibling's ([[project_sibling_migration_when_order_shared_db]]).
- [ ] **Task 2 — Domain (AC3, AC4, AC5, AC6, AC7).**
  - [ ] 2.1 `packages/domain/src/kyc/`: `isKycIdentityVerified` (N1) + `markKycTrusteeVerified` (DL2). Lockstep test with 6.39 (AC7).
  - [ ] 2.2 `packages/domain/src/member/identity-validation.ts` (transport-free): `recordIdentityValidation(client, input)` — in order:
        `lockAndReadDeathReport` (DL5) → read state + overlay + KYC standing → DL4 eligibility → insert row (supersede) → DL2 flag (confirmed)
        → `projectMemberState` marker (DL3) → `kyc_completed` if `pending-valid` + confirmed. Reads: `listIdentityCheckQueue` (DL11,
        `clampLimit`), `readIdentityCheckDetail` (ciphertext as stored — the API decrypts).
  - [ ] 2.3 `member.identity_validation_recorded` in `MEMBER_EVENT_TYPES` / `MEMBER_EVENT_PAYLOAD_SCHEMAS` / `@twt/events` registry; update
        the tests that enumerate member events (F4) — ⛔ weaken any.
  - [ ] 2.4 Unit + live-DB tests for AC3–AC6 (live tests on your own container, DB named `twt_dev`).
- [ ] **Task 3 — RBAC + API (AC8, AC9, AC10, AC12).**
  - [ ] 3.1 Key + grants + catalog note in `permissions.ts` (the house REUSE-CHECK paragraph) and `roles.ts`; contracts mirror if one exists.
  - [ ] 3.2 Find the member-keyed CURRENT posting-district resolver in `member-geo` (F7) — if none fits, a per-route stash hook like 6.39's,
        server-derived. ⛔ client district.
  - [ ] 3.3 `@twt/contracts`: request/response DTOs (`.strict()`, snake/camel per house), the error codes.
  - [ ] 3.4 `apps/api/src/modules/identity-checks/` (routes, handlers, crypto via the KYC module's bounded decrypt); register in
        `server.ts`; enrol in the human-actor coverage gate that covers admin member writes (find it — the 6.39 route header names the
        claim-adjudication one); OpenAPI emit.
  - [ ] 3.5 API integration tests for AC8–AC12.
- [ ] **Task 4 — Admin UI (AC11, AC14).** `apps/admin/src/modules/identity-checks/` (queue page, detail, two forms), i18n-en entries
      (DL12), router entry; the 6.39 label change; vitest. ⚠ jsdom traps ([[project_jsdom_disabled_button_keeps_focus]],
      [[project_tanstack_instant_mock_hides_notready_flip]]).
- [ ] **Task 5 — Erasure + export (AC13).** `anonymize.ts` scrub; guard REPLACE migration; export section + contract + fixture.
- [ ] **Task 6 — Gates.** Run the source fence in `apps/api`'s unit suite ([[project_source_fence_lives_in_api_unit_suite]]); the PII
      gate; microcopy; `domain-accessor-invariants`; `pnpm ci:local` on a fresh container (AC15).
- [ ] **Task 7 — Records (AC15).**
  - [ ] 7.1 Story file: Dev Agent Record, File List, Change Log.
  - [ ] 7.2 DL15's stale comments (F1 schema comment; F5's `membership-check-approval.ts` doc line).
  - [ ] 7.3 Sprint row → `review`; ONE ledger entry (safe prepend; verify the YAML parses and the row count holds).
  - [ ] 7.4 `deferred-work.md`: annotate the `-424` Q2 (b) item (*"Trigger fired by 3.13; ⛔ breached — the story writes ⛔ identity
        field (N2)"*), the 2026-10-31 identity item (*"staff step built by 3.13; the lock-in exit is still 3-14's"*), the 2026-08-10
        collision item row 4 (*"a reviewer surface exists (3.13); rows 1–3 unchanged"*); add DL10's undo gap as a new item.

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
6. **⛔ Name in a list, ⛔ full mobile anywhere.** DL11 / DL8. A full mobile to staff is a new disclosure (the Panel ruled the field-worker
   analogue, `-459` Q2: *"never the phone number"*) — if staff need to reach the member, that is a question for BigDev, ⛔ a quiet unmask.
7. **No Aadhaar number, no copy, no upload** — not even "last 4" typed by staff (N5). The masked Aadhaar column is DigiLocker's, ⛔ this.
8. **Clock ties.** Two acts in one test transaction share `now()` — "latest" must not rest on `created_at` alone (DL1).
9. **Hand-format; Prettier is not enforced** ([[project_prettier_not_enforced]]); `**cl.3**`-style text in a JSDoc closes it
   ([[project_markdown_emphasis_closes_jsdoc]]).
10. **Every `git push` needs `DATABASE_URL=<your container>`** — the hook inherits `:5432`.

### What this story does ⛔ do
It does not end anyone's lock-in, make anyone `active` today (⛔ member is `pending-valid` until `3-14`), change 6.39's gate or what a family
sees, tell any member anything, change any typed-in detail, undo a confirmation, or close the duplicate-identity gap.

### Project Structure Notes
- New: `packages/domain/migrations/02NN_*.sql` (numbers at Task 0.1), `packages/domain/src/schema/member_identity_validations.ts`,
  `packages/domain/src/member/identity-validation.ts`, `apps/api/src/modules/identity-checks/`, `apps/admin/src/modules/identity-checks/`,
  contracts DTOs, tests beside each.
- Updated: `packages/domain/src/kyc/profile-write.ts` (+ the verified helper), `member/events.ts`, `packages/events/src/registry.ts`,
  `rbac/permissions.ts`, `rbac/roles.ts`, `member/anonymize.ts`, `data-export/assemble.ts` + its contract, `schema/member_kyc_profiles.ts`
  (comment), `claim/membership-check-approval.ts` (comment only), `apps/admin/src/modules/claim-verification/i18n-en.ts` (one label),
  `apps/api/src/server.ts`, the admin router.

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

### Debug Log References

### Completion Notes List
- Ultimate context engine analysis completed - comprehensive developer guide created (create-story, 2026-11-21, at `90535934`).

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-21 | Created by `bmad-create-story 3.13` in its own worktree at `origin/main` `90535934`. §0 applied: the `-424` match quoted; DL1–DL16 PROPOSED for Task 0.2; PQ1 (what staff must see) and PQ2 (is the member told) PROPOSED for one non-blocking note; AI-10-1 Policy meaning written. ⛔ Code. |
