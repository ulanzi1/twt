---
baseline_commit: ff3e06a2ed9508c74aadb4ae70cb2d2cb1a94cca
---

# Story 3.12: RTBF Soft-Delete + Anonymization (extends Story 3.10) `[CONSUMER]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member who has voluntarily withdrawn,
I want my personally-identifying data soft-deleted and replaced with "an anonymous member" markers in all references, while my contribution history is retained anonymized for pool-engine audit-reproducibility,
so that my DPDPA Right To Be Forgotten (FR-96) is honored while the trust's audit history remains intact.

## Acceptance Criteria

**AC1 — Field-level anonymization of member PII (the load-bearing move).**
Given FR-96 + a member at `state = withdrawn` (Story 3.10 `withdrawal.completed`) + AR (§2.12 RTBF mechanics) + the §1.14 event-log immutability commitment,
When RTBF anonymization runs,
Then anonymization applies **field-level** to: (a) member identity fields — `member_kyc_profiles` name / dob / photo, `member_identities` mobile, `member_addresses` address, `member_nominees` names/mobiles/addresses, `member_medical_disclosures` conditions, plus the `member_withdrawals` free-text reason — each Tier-1 ciphertext column **overwritten with an anonymized sentinel** (or nulled where the column is nullable); (b) the member row is **retained** at `state = anonymized` (NOT row-deleted — audit-reproducibility requires the row + event stream survive); (c) `member_postings.district` is **retained** (non-PII geographic attribute, not identity — Story 3.9 §"Posting PII tier"); (d) the PII-scrape CI (Story 1.16b) continues to pass.

**AC2 — Event-stream + audit immutability (append, never mutate).**
Given the §1.14 event-log immutability commitment + Story 1.10 audit immutability,
When anonymization completes,
Then the event stream is **NOT modified** — instead a single `member.rtbf_anonymized` event is **appended** (transition `withdrawn → anonymized`, terminal) marking the anonymization point with `anonymized_at` + `anonymization_actor` in the audit context; **And** the audit log is **NOT modified** — audit rows reference the member by stable `member_id` only (no denormalized name), so member-identity in audit lines is masked automatically at **display/query time** by the name-resolver, which renders "an anonymous member" for `anonymized` members (architecture §2.12 lines 1756-1759 — no audit mutation required); **And** contribution history + payment receipts (which pools, amounts, UTRs) are **retained** — the contributor identity resolves to "anonymous", but the contribution stays part of pool-engine reconciliation history.

**AC3 — Public-facing "an anonymous member" render + no PII leak.**
Given a public-facing surface (Sahyog Drive contributor lists, future Sahyog Vivran / Member Directory) renders contributor or member identity,
When it encounters an `anonymized` member,
Then "an anonymous member" is rendered in place of the name (bilingual en/hi parity), no PII leaks, and PII-scrape CI (Story 1.16b) continues to pass. **Scope-honest note:** at Epic 3 the public contributor surfaces are **sample-data only** (no real member-backed read exists yet — `ContributorRow`/`ShradhanjaliSahyogVivran` import from `./sample-data`). The name-resolution **seam** (member → display name) must resolve `anonymized → "an anonymous member"`; wiring that seam into a *real* contributor read is a forward-compat DEFER (Epic 8/6 territory, mirroring the data-export empty-placeholder discipline). Record the defer openly — do NOT claim a public surface is anonymized when no real read exists.

**AC4 — Rejoin lock is NOT bypassed (the critical guardrail).**
Given a future rejoin attempt under the same identity within 12 months of withdrawal,
When Story 3.6 signup (`resolveMembersByMobile`) evaluates the identity,
Then the 12-month rejoin block still fires (per Story 3.10 AC3) — anonymization does **NOT** bypass it. **This constrains the implementation:** the rejoin lookup keys on `member_identities.mobile_blind_index` (`resolveMembersByMobile` — `WHERE mi.mobile_blind_index = $1`). Anonymization **MUST retain `mobile_blind_index`** (a one-way HMAC equality key, not a displayable value) and `member_withdrawals.rejoin_permitted_at` / `withdrawn_at`. Clearing the blind index would silently break the rejoin lock — an AC4 violation. Only the displayable `mobile_ciphertext` is cleared.

**AC5 — State-machine discipline + guard.**
Given the reducer (`member/state.ts:117`) already routes `member.rtbf_anonymized`: `withdrawn → anonymized`, else IDENTITY,
When RTBF is invoked,
Then it is legal **only** from `state = withdrawn` (guard the route with an RTBF-specific error — a member not-yet-withdrawn, or already `anonymized`, is rejected; do NOT rely on the reducer's silent identity no-op, which would persist a phantom anonymization). **Do NOT touch `state.ts` or `events.ts`** — Story 3.1 froze both the event vocabulary (`member.rtbf_anonymized`) and the `anonymized` enum label + payload schema (`RtbfAnonymizedPayloadSchema`); this story is the **FIRST EMITTER**, not an author.

## Tasks / Subtasks

- [x] **Task 1 — Anonymization core in @twt/domain.** (AC1, AC2)
  - [x] New `packages/domain/src/member/anonymize.ts` — the domain core that overwrites every member PII column. It is the **inverse of `data-export/assemble.ts`** (same table set, same field-class contexts) — read `assemble.ts` first and enumerate the exact same tables/columns so no PII surface is missed. **Column-by-column map (NOT-NULL → sentinel; nullable → NULL):** `member_identities` (mobile_ciphertext → sentinel; **RETAIN mobile_blind_index** — AC4); `member_kyc_profiles` (name_ciphertext/dob_ciphertext → sentinel; photo_ciphertext → NULL — nullable; aadhaar_masked_id → NULL — nullable); `member_addresses` (all rows: address_line_ciphertext → sentinel); `member_nominees` (all rows: name_ciphertext/mobile_ciphertext → sentinel; address_ciphertext → **NULL** — nullable); `member_medical_disclosures` (all rows: disclosed_conditions_ciphertext → sentinel — NOT NULL; additional_context_ciphertext → **NULL** — nullable); `member_withdrawals` (reason_text_ciphertext → NULL — nullable; reason_code preserved as non-PII). **RETAIN** `member_postings.district` (non-PII), `member_attribution.attribution_source` (non-PII), all payment/consent/event/contribution rows.
  - [x] **Encryption pattern — domain-layer crypto (same shape as `assemble.ts`).** `anonymizeMember` takes `enc: { kms: KmsProvider; kekRef: KmsKeyRef }` as a dependency parameter (the same `ExportEncryption` shape `assemble.ts` uses for decryption). Internally it calls `encryptTier1(enc, FIELD_CLASS_*, namespace, "[anonymized]")` + `serializeEnvelope(...)` for each NOT-NULL sentinel column, using the same local `FIELD_CLASS_*` constants and namespace that `assemble.ts` declares at its top. Declare `const MEMBER_IDENTITY_NAMESPACE = '00000000-0000-0000-0000-000000000001'` as a module-local constant (same value as `assemble.ts:87` and `context.ts:47` — `anonymize.ts` is domain code and **cannot** import from `apps/api/src/context.ts`). No `rtbf-crypto.ts` in the API module is needed — encryption lives in `anonymize.ts` directly. Document the sentinel string and encryption choice in the module header.
  - [x] All writes run under the caller's RLS scope-tx (tenant-isolated). Naming: DB snake_case, TS camelCase. NO HTTP / audit / event emission here — the route orchestrates.
- [x] **Task 2 — Migration `0034` for append-only-table anonymization grant.** (AC1)
  - [x] `member_addresses` + `member_medical_disclosures` GRANT **excludes UPDATE/DELETE** (append-only immutable history — see their RLS headers). RTBF must overwrite their ciphertext. Add a **narrow UPDATE grant** on exactly the PII ciphertext columns of these two tables for the app role (mirror the `member_withdrawals` deviation-from-append-only precedent — Story 3.10 Task 1 granted UPDATE for the aadhaar_hmac seam + RTBF). Note the deviation in each schema header. Audit every other member-PII table's grant (`member_kyc_profiles`, `member_nominees`, `member_identities`) — confirm they already permit UPDATE (nominees is latest-wins delete-then-insert; kyc/identities are latest-wins UPDATE) or add the grant. Migration is **0034** (0033 is the latest).
  - [x] **Do NOT** rely on FK `onDelete: cascade` to delete PII rows — RTBF is soft-delete (the member row + its history survive at `state = anonymized`). The cascade FKs noted on `member_withdrawals` / `member_attribution` ("for RTBF") fire only if the members row is deleted, which this story does NOT do.
- [x] **Task 3 — API route: member-initiated RTBF.** (AC2, AC5)
  - [x] New `apps/api/src/modules/rtbf/` with files `{index.ts, handlers.ts, routes.ts}` (mirror `modules/withdrawal/` which has exactly these three files). **Register `registerRtbfModule` in `apps/api/src/server.ts` next to `registerWithdrawalModule` (~line 137) and `registerDataExportModule` (~line 141) — without this the route is never mounted.** `POST /api/v1/member/rtbf` — `routes.ts` wires `ZodTypeProvider` + `schema:` block + `preHandler: [requireMemberSession, requireMemberStepUp(deps, 'rtbf')]` (use the distinct context string `'rtbf'` — not `'withdrawal'` — so no prior elevation satisfies RTBF). Handler flow in `handlers.ts` (mirror `withdrawal/handlers.ts`): (1) `memberCtx` → 401 if unauth; (2) **guard** `assertAnonymizable` — member exists AND `getMemberStateAt(...) === 'withdrawn'`, else RTBF-specific error (`rtbf.invalid_state`, 409) — do NOT reuse `assertWithdrawable` (wrong permitted-set); (3) in ONE scope-tx: `anonymizeMember(scopeTx.client, enc, { memberId, pariwarId })` (Task 1 — pass `enc` from handler deps) + `projectMemberState(scopeTx.client, { eventType: 'member.rtbf_anonymized', payload: { from_state: 'withdrawn', to_state: 'anonymized', trigger: 'rtbf_request', actor: 'member' }, actorId: memberIdStr })`; (4) emit audit line `'member_rtbf.completed'` **AFTER** the response is built + `ok = true` (nominee.handlers.ts:158 ordering — a rollback must not leave a phantom audit); NON-PII audit context only: `anonymized_at` + `anonymization_actor` (member_id) — NEVER any cleared PII. Map `23505` / concurrent-anonymize to a clean 409 like withdrawal.
  - [x] New contracts (`packages/contracts/src/rtbf/`) + api-client method (mirror `withdrawal.ts` + `withdrawMember`). Response is a NON-PII shape: `{ state: 'anonymized', anonymizedAt }` — echo NO cleared PII.
- [x] **Task 4 — Display-time name-resolver respects `anonymized`.** (AC2, AC3)
  - [x] Locate the display-time member-name resolver (the seam architecture §2.12 lines 1756-1759 describes: audit lines + any surface reference the member by `member_id`, name resolved at display time). Ensure it renders the "an anonymous member" i18n string when the resolved member `state === 'anonymized'`. If NO such centralized resolver exists yet at Epic 3 (likely — public contributor surfaces are sample-data), create the **seam** (a small helper) and record the real-read wire-in as DEFERRED (AC3 scope-honest note) — do NOT fabricate a public read.
- [x] **Task 5 — i18n keys (en + hi parity).** (AC3)
  - [x] Add the "an anonymous member" string to `packages/i18n/locales/{en,hi}/common.json` (calm/dignified register — Story 2.2 tone check). Add any RTBF flow copy (confirmation, step-up prompt — reuse withdrawal keys where aligned). Keep en/hi parity (the i18n parity gate must stay green).
- [x] **Task 6 — `anonymizeMember` unit tests (reducer tests already exist — do NOT duplicate).** (AC5)
  - [x] The reducer transitions (`withdrawn → anonymized`, identity no-ops from `anonymized` + non-withdrawn states) are **already covered** in `packages/domain/tests/member/state.test.ts:83-93` and `packages/domain/tests/member/withdrawal.test.ts:76-79`. Verify these still pass; do NOT write duplicate assertions in a new file.
  - [x] Write NEW DB-free unit tests for `anonymizeMember` itself in `packages/domain/tests/member/rtbf-anonymize.test.ts`: mock `db` + `enc`; assert each NOT-NULL column receives the sentinel (decrypt + assert value equals `"[anonymized]"`); assert each nullable column receives NULL; assert `mobile_blind_index` is UNCHANGED (AC4 unit-level guard). Do NOT edit `state.ts` / `events.ts`.
- [x] **Task 7 — Domain integration test (:5433).** (AC1, AC2, AC4)
  - [x] After `anonymizeMember` runs on a seeded withdrawn member: every Tier-1 PII column reads back as the sentinel/NULL (never the original plaintext — decrypt-and-assert-not-original); `mobile_blind_index` is **UNCHANGED** (AC4 regression guard); `member_postings.district` + payment receipts + consent rows are **UNCHANGED**; the `member.rtbf_anonymized` event is appended (event_version = head+1) and `members.state = 'anonymized'`; cross-tenant RLS invisibility holds.
  - [x] **Rejoin-lock regression:** after anonymization, `resolveMembersByMobile(<same blind index>)` still returns the member with `state = anonymized` + `rejoin_permitted_at` intact → signup still 403 `auth.rejoin_locked` in-window (extend/mirror the Story 3.10 signup rejoin test).
- [x] **Task 8 — API integration test.** (AC5) `POST /member/rtbf`: withdrawn member → 200 + `anonymized`; not-yet-withdrawn (`active`) → 409 `rtbf.invalid_state`; already-`anonymized` → 409; missing step-up → 401/403; audit line `member_rtbf.completed` fires with NON-PII context only.
- [x] **Task 9 — CI gates green.** Run `pnpm ci:local` (mirrors all ci.yml jobs — CI Actions suspended, see project memory). Confirm the PII-scrape gate (`packages/contracts/scripts/check-pii-scrape.ts`), i18n parity, and `member-state-invariant` gate stay green. `pnpm --filter <pkg> lint` per touched package (eslint runs per-package cwd).

## Dev Notes

### The critical guardrail — RETAIN `mobile_blind_index` (READ FIRST — this shaped the story)
The 12-month rejoin lock (Story 3.10 AC3) is enforced PRE-scope by `resolveMembersByMobile` (`apps/api/src/modules/auth/member/member-auth.repo.ts`), which looks up `WHERE mi.mobile_blind_index = $1` on `member_identities` and LEFT JOINs `member_withdrawals` for `rejoin_permitted_at` / `withdrawn_at`. **If anonymization clears `mobile_blind_index`, the rejoin lock silently breaks (AC4 violation).** The blind index is a one-way deterministic HMAC (not a reversible/displayable value) — it is the equality key, not PII-in-the-display-sense. So: clear `mobile_ciphertext` (the Tier-1 displayable), **RETAIN `mobile_blind_index`** and the `member_withdrawals` rejoin columns. This mirrors the `member_withdrawals.aadhaar_hmac` "non-PII per blind-index posture" annotation (Story 3.10). Task 7 has a dedicated regression test for this.

### Soft-delete, NOT row-delete — the member row + event stream survive
RTBF = "soft-delete + anonymize" (architecture §2.12). The member row is **retained** at `state = anonymized`; the event stream is **retained** (append `rtbf_anonymized`, never mutate); contribution + payment + consent history is **retained**. Only PII *fields* are overwritten/nulled. This is what makes Epic 7 pool-engine audit-reproducibility survive an RTBF (the events still replay `... → withdrawn → anonymized`). Do NOT delete the members row (it would orphan the event-stream projection + break replay). The FK `onDelete: cascade` comments on `member_withdrawals` / `member_attribution` are forward-compat seams for a *hard* delete that this story does NOT perform.

### The lifecycle event + enum already exist — first emitter, not author (Story 3.1 froze them)
`member/events.ts:101` (`RtbfAnonymizedPayloadSchema`, frozen auditShape-only `.strict()`), `events.ts:222` (`member.rtbf_anonymized` in the 16-event vocabulary), `schema/members.ts:57`/`:68` (`anonymized` enum label), and `state.ts:117` (reducer `withdrawn → anonymized`) are ALL pre-committed by Story 3.1. **Do NOT edit `state.ts`, `events.ts`, or the enum.** This story emits the event for the first time (via `projectMemberState`) and writes the anonymization side-effects. The auditShape-only payload structurally **cannot** carry the cleared PII (R1) — `anonymized_at` / `anonymization_actor` ride in the audit-line context, NOT the event payload.

### Anonymize by the same map `data-export/assemble.ts` reads (inverse operation)
`packages/domain/src/data-export/assemble.ts` (Story 3.11) already enumerates EVERY member PII table + the exact field-class encryption context each column uses (`FIELD_CLASS_KYC/NOMINEE/MEDICAL/ADDRESS/MOBILE`, `MEMBER_IDENTITY_NAMESPACE` for mobile). Use it as the authoritative checklist — anonymization must clear precisely the columns assemble decrypts, minus the retained-non-PII set. If a column is Tier-1 ciphertext in assemble, it is a target; if it is plaintext non-PII (`member_postings.district`, `member_attribution.attribution_source`, payment/consent rows), it is retained.

### Audit "masking at query time" is (mostly) already satisfied by design
Architecture §2.12 (lines 1756-1759): audit log entries reference users by **stable `member_id`** (a foreign-key reference, NOT a denormalized name); the displayed name is resolved at **display time** from the live member table, which respects RTBF. So no audit rows are mutated — the "masking" is the name-resolver rendering "an anonymous member" for an `anonymized` member (Task 4). Verify the resolver honors `anonymized`; if audit lines are rendered raw without a name-join anywhere, there is nothing to mask (member_id is not PII).

### Encryption inside `anonymize.ts` — domain-layer pattern (not app-layer crypto helper)
Every existing domain *write* function (`insertMemberWithdrawal`, `insertMemberAddress`, etc.) takes pre-serialized ciphertext strings as plain inputs — encryption lives in the app-layer `*-crypto.ts` files. `anonymizeMember` is the exception: it must encrypt a sentinel under 5 different field-class contexts across many tables, making app-layer pre-encryption unwieldy (5+ distinct encrypted values passed as parameters). Use the **domain-layer pattern** instead — pass `enc: { kms: KmsProvider; kekRef: KmsKeyRef }` into `anonymize.ts` and call `encryptTier1` + `serializeEnvelope` internally, the same way `assemble.ts` calls `decryptTier1` internally. This is not a new pattern — it is the exact inverse of `assemble.ts`. Declare all `FIELD_CLASS_*` constants and `MEMBER_IDENTITY_NAMESPACE` as module-local constants in `anonymize.ts` (cannot import from `apps/api/src/context.ts` — domain package boundary). The handler passes `enc` from its deps object (the same `enc` it would pass to any other encryption call).

### `data_exports` artifact PII after soft-delete — no action needed, vacuum handles it
Story 3.11 assumed RTBF would cascade-delete `data_exports` rows ("Story 3.12 RTBF cascade-deletes member-scoped rows"). That assumption is wrong — 3.12 is soft-delete (the member row is retained; the FK `ON DELETE CASCADE` on `data_exports.member_id` fires only on a hard member-row delete, which this story does NOT do). After RTBF any un-consumed `data_exports` row still holds `artifact_ciphertext` containing the member's full PII. The existing `data_export.vacuum` cron will zero `artifact_ciphertext` within 24 hours of expiry. No explicit cleanup in the RTBF transaction is required. Do NOT add a `data_exports` delete step — it would break the soft-delete invariant.

### Scope reality — email is N/A; eHRMS must be located (honest scope)
- **email:** there is **no member email column** in the schema (only `admin_credentials.email_ciphertext` — a different subject). The epic AC lists "email" for completeness; for a TWT member it is **N/A / no-op** — record this openly, don't invent a column.
- **eHRMS ID:** architecture §2.7 classes it Tier-2 blind index, but **no member eHRMS storage column was found** in `packages/domain/src/schema/` (signup "types eHRMS manually" per the epic, but it may not be persisted at Epic 3). `grep -rniE 'ehrms|employee' packages/domain/src/schema` before implementing. If a column exists, anonymize it (retain any blind-index equality key per the mobile precedent); if none exists, it is a no-op with a note. Do NOT fabricate.
- **Aadhaar:** members store only `aadhaar_masked_id` (Tier-3, last-4, nullable) on `member_kyc_profiles` — NULL it. There is no full-Aadhaar column to clear.

### Persistence + orchestration pattern (mirror 3.10 withdrawal end-to-end)
The withdrawal handler (`apps/api/src/modules/withdrawal/handlers.ts`) is the exact template: `memberCtx` → state guard → open scope-tx → domain write + `projectMemberState` in ONE tx → audit AFTER `ok = true` → `closeScopeTx(scopeTx, ok)`. RTBF differs only in: the guard permits `{withdrawn}` (not `{active, active-in-grace, lapsed-unpaid}`), the domain write is `anonymizeMember` (many-table overwrite) not `insertMemberWithdrawal`, and the event is `member.rtbf_anonymized`. The projector (`member/project.ts`) handles the event-append + state-cache write generically — no projector changes needed.

### PII discipline (R1) — non-negotiable
The `member.rtbf_anonymized` event payload is frozen auditShape-only `.strict()` — it structurally cannot carry PII. The audit context carries `anonymized_at` + `anonymization_actor` (the member_id) ONLY. The route response echoes NO cleared PII. The anonymization sentinel is a fixed non-PII marker. PII-scrape CI (Story 1.16b, `check-pii-scrape.ts`) must stay green — the `piiColumn(tier, fieldClass)` annotations on the touched schemas are the CI's registry; do NOT strip them.

### Testing standards
Live-DB integration on `twt-test-pg` Docker (:5433) — see project memory "Live-DB test gotchas": never regenerate an applied migration (0034 is new — fine), never DROP SCHEMA to reset, assert membership not row-counts for own-committing writers. Domain unit tests are DB-free (construct `MemberEventInput` directly). Run a suspect spec in isolation to confirm innocence of the known jobs concurrent-load flake. Merge gate = `pnpm ci:local` (CI Actions suspended — project memory).

### Project Structure Notes
- Domain accessor: `packages/domain/src/member/anonymize.ts` (+ barrel export in `member/index.ts`). No `rtbf-crypto.ts` in the API layer — encryption runs inside `anonymize.ts` (domain-layer enc pattern).
- Migration: `packages/domain/migrations/0034_*.sql` (+ any schema-header grant-deviation notes).
- API: `apps/api/src/modules/rtbf/{index.ts,handlers.ts,routes.ts}` (mirror `modules/withdrawal/` — which has these same three files). Register `registerRtbfModule` in `apps/api/src/server.ts` (~line 137, next to withdrawal + data-export registrations).
- Contracts: `packages/contracts/src/rtbf/`; api-client method in `packages/api-client/src/index.ts`.
- i18n: `packages/i18n/locales/{en,hi}/common.json`.
- Tests: `packages/domain/tests/member/rtbf-anonymize.test.ts` (unit — NEW: tests `anonymizeMember` function; do NOT duplicate existing reducer tests in `state.test.ts`/`withdrawal.test.ts`), `packages/domain/tests/integration/member/rtbf-anonymize.spec.ts` (integration), `apps/api/.../rtbf` integration.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.12] — the three AC blocks (field-level anonymize, event/audit immutability, public "an anonymous member" render, rejoin-lock preserved).
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.10] — the withdrawal flow this extends; closes at `withdrawn` with history intact, "3.12 anonymizes".
- [Source: _bmad-output/planning-artifacts/architecture.md#§2.12] (lines 1730-1759) — RTBF mechanics: contributions remain as "an anonymous member"; audit carve-out (not anonymized); display-time name resolution respects RTBF.
- [Source: packages/domain/src/data-export/assemble.ts] — the authoritative member-PII table/column/field-class map (inverse of anonymization).
- [Source: packages/domain/src/member/state.ts:117 + events.ts:101,222 + schema/members.ts:57] — the pre-committed `rtbf_anonymized` event + `anonymized` state (Story 3.1 froze; first emitter here).
- [Source: apps/api/src/modules/withdrawal/handlers.ts] — the orchestration template (scope-tx, guard, project, audit-after-ok).
- [Source: apps/api/src/modules/auth/member/member-auth.repo.ts] — `resolveMembersByMobile` rejoin lookup keyed on `mobile_blind_index` (the AC4 constraint).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (BMad dev-story workflow)

### Debug Log References

- Migration 0034 applied to test DB (:5433); column-level UPDATE grants verified via `information_schema.column_privileges` (member_addresses.address_line_ciphertext + member_medical_disclosures.{disclosed_conditions,additional_context}_ciphertext).
- Domain full `build` (tsc, includes tests) caught a `clauseVersionId: randomUUID()` branding gap in the integration spec — fixed with the `clauseVersionId()` smart constructor (the per-package `typecheck` tsconfig excludes tests, so it surfaced only at the CI build step).
- One lint fix: unused `_cond` param in the unit-test mock `where()`.
- Final merge gate: `pnpm ci:local` → **18/18 jobs green** (DATABASE_URL on :5433).

### Completion Notes List

- **AC1 (field-level anonymization):** `packages/domain/src/member/anonymize.ts` — the inverse of `data-export/assemble.ts`. Overwrites every Tier-1 ciphertext with an `[anonymized]` sentinel (NOT-NULL cols) or NULL (nullable cols) across `member_identities` / `member_kyc_profiles` / `member_addresses` / `member_nominees` / `member_medical_disclosures` / `member_withdrawals`. Domain-layer crypto (takes `enc: { kms, kekRef }`, encrypts internally). RETAINS `member_postings.district` + `member_attribution` + payment/consent/event history. The member row is retained at `state = anonymized` (projector-only). PII-scrape CI green.
- **AC2 (event/audit immutability):** the handler APPENDS a single `member.rtbf_anonymized` event (`withdrawn → anonymized`, terminal) via `projectMemberState` — the stream is never mutated. Audit is masked at display time by the name-resolver seam (no audit-row mutation); the `member_rtbf.completed` audit line carries `anonymized_at` + `anonymization_actor` ONLY. Contribution/payment/consent history retained (verified in the integration test).
- **AC3 (public render + no PII leak):** `member/display-name.ts` (`resolveMemberDisplayName`) resolves `anonymized → "an anonymous member"` (i18n key `member.anonymousMember`, en/hi parity). **Scope-honest DEFER:** no real member-backed public read exists at Epic 3 (contributor surfaces are sample-data) → the real-read wire-in is recorded in deferred-work.md (RTBF-D1). The seam + its unit test guarantee the mapping.
- **AC4 (rejoin lock NOT bypassed):** `anonymizeMember` overwrites only `mobile_ciphertext` and RETAINS `mobile_blind_index` + `member_withdrawals.{rejoin_permitted_at,withdrawn_at}` + `reason_code`. Unit-, domain-integration-, and API-signup-level regressions all assert the lock still fires for an `anonymized` member (403 `auth.rejoin_locked` in-window). The signup handler already branched on `{withdrawn, anonymized}` (pre-wired by 3.10).
- **AC5 (state-machine + guard):** NO edits to `state.ts` / `events.ts` / the enum (Story 3.1 froze them; this is the FIRST EMITTER). New `assertAnonymizable` guard permits ONLY `state = withdrawn` → else 409 `rtbf.invalid_state` (a distinct guard, NOT `assertWithdrawable`; no reliance on the reducer's silent identity no-op). Concurrent-anonymize 23505 mapped to a clean 409.
- **Route:** new `apps/api/src/modules/rtbf/{index,handlers,routes}.ts` (mirrors `modules/withdrawal/`); `POST /api/v1/member/rtbf`, step-up context `'rtbf'` (distinct — RTBF is irreversible). Registered in `server.ts`. New contracts `packages/contracts/src/rtbf/` + api-client `anonymizeMember` method. Migration 0034 adds the narrow append-only-table UPDATE grants (the `FOR ALL` write policy already permitted UPDATE at the RLS level).
- **Scope honesty (deferred-work.md):** email = N/A (no member email column; RTBF-D2), eHRMS = N/A (no member eHRMS storage column found; RTBF-D3), Aadhaar = only `aadhaar_masked_id` last-4 NULLed. `data_exports` artifact PII handled by the existing vacuum cron — no RTBF-time delete (would break soft-delete); ≤24h residual window recorded (RTBF-D4).
- **Tests:** 11 domain unit (anonymize map + mobile_blind_index guard + display-name seam), 2 domain integration (:5433 — at-rest sentinel/NULL round-trip, blind-index/history retention, event append + state, RLS), 5 API integration (route gating, 200/409 states, NON-PII audit), + 1 signup rejoin regression (anonymized member still locked). Existing reducer transitions (state.test.ts / withdrawal.test.ts) left untouched (already cover `withdrawn → anonymized`).
- **[[project_mmkv_asyncstorage_equivalent]] N/A here** — no mobile local-persistence added (mobile RTBF flow screens are a forward item; this story delivers the domain core + API + contracts + i18n copy + name-resolver seam).

### File List

**Domain (@twt/domain)**
- `packages/domain/src/member/anonymize.ts` (NEW) — RTBF field-level anonymization core.
- `packages/domain/src/member/display-name.ts` (NEW) — display-time name-resolver seam (AC3).
- `packages/domain/src/member/index.ts` (MOD) — barrel exports for anonymize + display-name.
- `packages/domain/src/schema/member_addresses.ts` (MOD) — grant-deviation header note.
- `packages/domain/src/schema/member_medical_disclosures.ts` (MOD) — grant-deviation header note.
- `packages/domain/migrations/0034_rtbf-anonymization-grants.sql` (NEW) — narrow UPDATE grants.
- `packages/domain/migrations/meta/_journal.json` (MOD) — 0034 journal entry.
- `packages/domain/tests/member/rtbf-anonymize.test.ts` (NEW) — DB-free unit tests.
- `packages/domain/tests/member/display-name.test.ts` (NEW) — seam unit tests.
- `packages/domain/tests/integration/member/rtbf-anonymize.spec.ts` (NEW) — live-DB integration.

**Contracts (@twt/contracts)**
- `packages/contracts/src/rtbf/rtbf.ts` (NEW) — RtbfConfirmRequest + RtbfStatusResponse.
- `packages/contracts/src/rtbf/index.ts` (NEW) — barrel.
- `packages/contracts/src/index.ts` (MOD) — export rtbf barrel.

**API (@twt/api)**
- `apps/api/src/modules/rtbf/handlers.ts` (NEW) — confirm handler + assertAnonymizable guard.
- `apps/api/src/modules/rtbf/routes.ts` (NEW) — POST /api/v1/member/rtbf (step-up 'rtbf').
- `apps/api/src/modules/rtbf/index.ts` (NEW) — module barrel.
- `apps/api/src/server.ts` (MOD) — registerRtbfModule import + call.
- `apps/api/src/audit/audit-sink.ts` (MOD) — `member_rtbf.completed` audit event type.
- `apps/api/tests/integration/rtbf/rtbf.spec.ts` (NEW) — route E2E.
- `apps/api/tests/integration/signup/signup-create.spec.ts` (MOD) — anonymized-member rejoin regression.

**API client (@twt/api-client)**
- `packages/api-client/src/index.ts` (MOD) — `anonymizeMember` method + RTBF imports/base.

**i18n (@twt/i18n)**
- `packages/i18n/locales/en/common.json` (MOD) — `member.anonymousMember` + `rtbf.*` copy.
- `packages/i18n/locales/hi/common.json` (MOD) — Hindi parity.

**Planning artifacts**
- `_bmad-output/implementation-artifacts/deferred-work.md` (MOD) — RTBF-D1..D4.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MOD) — 3-12 → review.

### Review Findings

- [x] [Review][Decision → Defer] `consent_records.consentPayload` IP/user-agent survives RTBF — recorded as RTBF-D5 in deferred-work.md. Residual window acknowledged; re-trigger on legal/DPO review of DPDPA posture for IP in consent-context records. [`packages/domain/src/schema/consent_records.ts`]
- [x] [Review][Patch] Cross-tenant UPDATE isolation untested — domain integration test seeds PARIWAR_B rows and verifies SELECT isolation, but never calls `anonymizeMember` under PARIWAR_A scope and asserts PARIWAR_B rows unchanged post-UPDATE. If any table's RLS WITH CHECK is absent or misconfigured, a cross-tenant overwrite would go undetected. [`packages/domain/tests/integration/member/rtbf-anonymize.spec.ts`]
- [x] [Review][Patch] `rtbf.invalid_state` overloaded across three distinct failure paths — `assertAnonymizable` returns the same 409 `rtbf.invalid_state` for both "not yet withdrawn" and "already anonymized"; the 23505 concurrent path also maps here. A client that completed RTBF but received a 500 (network reset pre-response) cannot distinguish "already erased" from "you need to withdraw first" on retry. Add `rtbf.already_anonymized` for the `state === 'anonymized'` branch in `assertAnonymizable`. [`apps/api/src/modules/rtbf/handlers.ts`]
- [x] [Review][Patch] `resolveMemberDisplayName` coerces null name to `''` for non-anonymized members — `params.name ?? ''` returns `{ kind: 'name', value: '' }` when name is null (e.g., pending-KYC member, or a JOIN miss in future real-read). Callers cannot distinguish "no name fetched" from "empty name." Return a distinct `{ kind: 'unknown' }` discriminant instead. [`packages/domain/src/member/display-name.ts`]
- [x] [Review][Patch] Stale "row-delete/cascade" comments in 3 untouched schema files — `member_identities.ts:33` says "deletes THIS row in place"; `member_kyc_profiles.ts:60` and `member_nominees.ts:44` say "deletes via cascade." Story 3.12 overwrites fields (soft-delete); deviation notes were added to `member_addresses.ts` and `member_medical_disclosures.ts` but not to these three files. [`packages/domain/src/schema/member_identities.ts`, `member_kyc_profiles.ts`, `member_nominees.ts`]
- [x] [Review][Patch] API integration test `seedMember` seeds no PII rows — `rtbf.spec.ts` confirms `state = 'anonymized'` and the audit event, but seeds no `member_identities`, `member_kyc_profiles`, `member_addresses`, etc. rows. A completely broken `anonymizeMember` (all UPDATEs no-oped) would still pass the route test. Seed at least one PII table and assert the sentinel/NULL post-RTBF at the HTTP-stack level. [`apps/api/tests/integration/rtbf/rtbf.spec.ts`]
- [x] [Review][Defer] Audit-timing: phantom audit on COMMIT failure / 500 on sink throw [`apps/api/src/modules/rtbf/handlers.ts`] — deferred, pre-existing: mirrors withdrawal handler pattern; very low probability; Acceptance Auditor confirmed no new deviation from existing conventions.
- [x] [Review][Defer] Non-locking `getMemberStateAt` in `assertAnonymizable` (no `SELECT FOR UPDATE`) [`apps/api/src/modules/rtbf/handlers.ts`] — deferred, pre-existing: concurrent RTBF correctly handled via 23505 → 409; `FOR UPDATE` is defense-in-depth hardening, not a bug fix.
- [x] [Review][Defer] `anonymizeMember` WHERE clauses omit explicit `pariwarId` filter — relies solely on RLS [`packages/domain/src/member/anonymize.ts`] — deferred, pre-existing: matches project-wide RLS-only trust model for all domain accessors; not a new risk introduced by this story.
- [x] [Review][Defer] `confirm` hardcodes `state: 'anonymized'` before verifying `projectMemberState` return value [`apps/api/src/modules/rtbf/handlers.ts`] — deferred, pre-existing: pre-committed reducer makes silent no-op impossible in practice; withdrawal handler has same pattern.

### Change Log

| Date | Change |
| --- | --- |
| 2026-07-02 | Implemented Story 3.12 RTBF Soft-Delete + Anonymization across all 9 tasks. New domain `anonymizeMember` (inverse of data-export assemble; sentinel/NULL every Tier-1 PII column, RETAIN mobile_blind_index) + `resolveMemberDisplayName` seam. Migration 0034 narrow append-only UPDATE grants. New `POST /api/v1/member/rtbf` module (step-up 'rtbf', assertAnonymizable → 409 rtbf.invalid_state, member.rtbf_anonymized transition, NON-PII audit). New contracts + api-client method + en/hi i18n. FIRST EMITTER — no edits to state.ts/events.ts/enum. 18 new tests (11 unit / 2 domain-integration / 5 api-integration) + signup rejoin regression. `pnpm ci:local` 18/18 green. Scope-honesty defers (email/eHRMS N/A, AC3 public-read wire-in, data_exports vacuum window) recorded in deferred-work.md. Status → review. |
