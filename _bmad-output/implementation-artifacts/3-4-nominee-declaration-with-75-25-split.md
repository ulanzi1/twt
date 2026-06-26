# Story 3.4: Nominee Declaration with 75/25 Split (No KYC, No Bank at Signup) `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member declaring nominees during signup or via Life Events,
I want to declare one or two nominees with a fixed 75/25 split when two are declared, providing nominee identity but NOT bank/IFSC and NOT requiring nominee KYC,
so that signup remains lightweight and bank-detail collection happens at claim time (Epic 6) when nominee identity is verified anyway.

### Story context (read this first)

This is the **third signup-wizard SURFACE** of Epic 3, sitting between KYC (3.3b) and medical disclosure (3.5) in the wizard order `kyc → nominees → medical → payment`. It builds: the **nominee-declaration HTTP surface** (`POST /api/v1/member/nominees` + a status read), a **new Tier-1-encrypted tenant table** `member_nominees` (mirrors 3.3b's `member_kyc_profiles` PII pattern exactly), the **75/25 split validation**, the **`member.nominees_declared` event emission** (extending Story 3.1's stub payload schema), and the **member-facing signup screen** `apps/mobile/app/(signup)/nominees.tsx`.

**What this story does NOT do (scope guards — mirror the 3.2 / 3.3b boundary discipline):**

- **It does NOT create the member.** Per 3.3b §R2, **Story 3.6 owns member creation** + signup-wizard assembly. 3.4 ASSUMES a member exists in a pre-lock-in signup state and proves the flow against a seeded member in tests (same posture 3.3b took).
- **It does NOT wire the Life Events nominee-UPDATE route** (that is **Story 3.9**, which re-runs this story's declare service behind `requireMemberStepUp`). 3.4 ships the declare service **re-runnable** so 3.9 attaches the step-up gate + reuses it — exactly as Story 3.2 AC2 flagged ("the specific gated routes … nominee change 3.4/3.9 … attach the gate in their own stories"). **No step-up at signup** (the member is mid-wizard on a fresh signup-continuation session).
- **It does NOT collect nominee bank account / IFSC** (claim-time only, Epic 6) **and does NOT request nominee Aadhaar / KYC** (claim-time only). The form copy says so explicitly (AC2/AC3).
- **It does NOT add a lifecycle state transition.** `member.nominees_declared` is a **non-transition marker** — Story 3.1's reducer already returns the current state unchanged for it (`from_state === to_state`). Do NOT invent a state or touch the reducer's transition table.

## Acceptance Criteria

**AC1 — Declaration flow + fields + 75/25 split (FR-4, R5(E))**
**Given** FR-4 (multi-nominee declaration with 75/25 split + R5(E))
**When** the nominee declaration flow is implemented
**Then** the member declares 1 or 2 nominees with fields per nominee: `nominee_name`, `relationship`, `mobile`, `address` (optional); when 2 nominees, the split is **fixed 75/25 with no override** (primary 75%, secondary 25%); when 1 nominee, the split is 100%.

**AC2 — No nominee KYC at signup (explicit copy)**
**And** the form explicitly does NOT request nominee Aadhaar / KYC documents at signup; copy reads "We'll verify nominee details only when a claim is filed" (bilingual en/hi).

**AC3 — No nominee bank at signup (explicit copy)**
**And** the form explicitly does NOT request nominee bank account / IFSC at signup; copy reads "Bank details will be collected from your nominee at the time of a claim" (bilingual en/hi).

**AC4 — Event emission on the member stream**
**And** nominee declarations are emitted as `member.nominees_declared` events on the member's event stream (Story 3.1) — **non-PII payload only** (count + split + audit shape); the nominee PII lives in the Tier-1-encrypted `member_nominees` projection.

**AC5 — Re-declaration is latest-wins + emits a new event (Life Events seam)**
**Given** the member later updates nominees via Life Events (Story 3.9)
**When** the update is submitted
**Then** a new `member.nominees_declared` event is emitted (event-log is immutable; **the latest event / latest projection row-set is the effective declaration**); step-up OTP is required for the update — **the gate is attached by Story 3.9**; 3.4 ships the declare service re-runnable so a re-declaration replaces the projection (delete-then-insert within one scope tx) and emits the new event.

**AC6 — Accessibility (inherited Story 0.10 P0-2c gate)**
**And** the signup nominee screen is screen-reader-accessible: every field has a proper label + per-field guidance; the 75/25 split and the "no bank / no KYC at signup" reassurance copy are announced (UX-DR55 dignified-validation grammar, UX-DR57 Pattern 6 bilingual input).

## Tasks / Subtasks

- [x] **Task 1 — `member_nominees` Tier-1-encrypted tenant table + RLS** (AC1, AC4, AC5)
  - [x] Add `packages/domain/src/schema/member_nominees.ts`. One row per declared nominee; **composite PK `(member_id, rank)`** where `rank smallint` ∈ {1, 2}. Columns: `memberId uuid` FK → `members.memberId` **`onDelete: 'cascade'`** (RTBF Story 3.12), `pariwarId uuid NOT NULL` (RLS predicate, branded), `rank smallint NOT NULL`, `nameCiphertext piiColumn(1,'member_nominee')('name_ciphertext') NOT NULL`, `relationship text NOT NULL` (Tier-3 plaintext — low-sensitivity, not a direct identifier; constrain values in the contract, not the DB), `mobileCiphertext piiColumn(1,'member_nominee')('mobile_ciphertext') NOT NULL`, `addressCiphertext piiColumn(1,'member_nominee')('address_ciphertext')` NULLABLE, `splitPct smallint NOT NULL` (75 | 25 | 100), `createdAt timestamptz defaultNow`. Header style, `piiColumn` tier, and snake_case-column / camelCase-field naming: **mirror `member_kyc_profiles.ts`**. **CRITICAL PK exception:** `member_nominees` has a composite PK — do NOT put `.primaryKey()` on `memberId`. Instead import `primaryKey, smallint` from `drizzle-orm/pg-core` and use the `(t) => [primaryKey({ columns: [t.memberId, t.rank] })]` third-argument pattern (see `otp_rate_buckets.ts`). `member_kyc_profiles.ts` has a single-column PK and cannot be mirrored for this. Also omit `trusteeVerified` and `updatedAt` — they have no equivalent here.
  - [x] Add `packages/domain/src/policies/member-nominees-rls.ts` — tenant-isolated RLS, mirror `member-kyc-profiles-rls.ts` (NOT the global identity-auth carve-out).
  - [x] Re-export the table in `packages/domain/src/schema/index.ts`; register the policy in `packages/domain/src/policies/index.ts`.
  - [x] Register field-class `MEMBER_NOMINEE_FIELD_CLASS = 'member_nominee'` in `apps/api/src/context.ts` (mirror `MEMBER_KYC_FIELD_CLASS`).
  - [x] Generate migration `0025_member-nominees.sql` via `pnpm --filter @twt/domain db:generate` (next index after 0024). **Do NOT hand-edit applied migrations**; if GRANT/FORCE-RLS supplementation is needed, add it to the freshly-generated file BEFORE first apply (see [[project_live_db_test_gotchas]] — never regenerate an applied migration). Confirm `_journal.json` gets the idx-25 entry.
- [x] **Task 2 — Domain accessors (encrypted write + read)** (AC1, AC4, AC5)
  - [x] Add `packages/domain/src/nominee/declaration-write.ts` — `replaceMemberNominees(tx, { memberId, pariwarId, nominees: [...] })`: **delete all existing rows for the member, then insert the 1–2 new rows** in one tx (latest-wins). Accepts pre-encrypted ciphertext (encryption is app-layer, per 3.3b — caller pre-encrypts; do NOT encrypt inside the accessor).
  - [x] Add `packages/domain/src/nominee/declaration-read.ts` — `getMemberNominees(tx, pariwarId, memberId)` returns the current rows (ciphertext + non-PII). Add a `nominee/index.ts` barrel + export the `nominee` namespace from `packages/domain/src/index.ts`.
- [x] **Task 3 — Extend `NomineesDeclaredPayloadSchema` (non-PII)** (AC4)
  - [x] In `packages/domain/src/member/events.ts`, replace the stub `NomineesDeclaredPayloadSchema = z.object({ ...auditShape }).strict()` with `z.object({ ...auditShape, nominee_count: z.union([z.literal(1), z.literal(2)]), split: z.enum(['sole', '75-25']) }).strict()`. **NO nominee names / mobiles / addresses in the payload** — the events_log payload is plaintext JSONB and must never carry PII (the 3.3b precedent: `kyc.completed` carries only the masked-Aadhaar reference). The reducer in `member/state.ts` already treats `member.nominees_declared` as identity (non-transition marker, note (e) in 3.1) — **verify, do not change**.
  - [x] Confirm the `EVENT_TYPE_REGISTRY` entry in `packages/events/src/registry.ts` still validates against the widened schema (it imports the same schema object — no edit expected, but run the registry test).
- [x] **Task 4 — Contracts (transport DTOs + OpenAPI)** (AC1, AC2, AC3)
  - [x] Add `packages/contracts/src/nominee/declaration.ts` — `NomineeDeclareRequest` (`{ nominees: [{ name, relationship, mobile, address? }] }`, 1–2 items, `.strict()`), `NomineeSummaryEntry` (per-nominee non-PII: `rank`, `relationship`, `splitPct`, `mobilePresent: boolean` — **NEVER echo raw name/address/mobile bytes back**, mirror `KycProfileSummaryResponse`'s presence-flag discipline), and `NomineeStatusResponse` — the GET response envelope: `{ nominees: NomineeSummaryEntry[] }` (an array wrapper, NOT a bare array — follows the existing `KycStatusResponse` object-wrapper convention). Constrain `relationship` to a value-aligned enum here (e.g., `spouse | child | parent | sibling | other`). Re-declare any needed wire enums; **contracts MUST NOT import `@twt/domain`** (browser-bundle rule — use `_common` primitives + `.strict()`).
  - [x] Add `packages/contracts/src/nominee/index.ts`; export from `packages/contracts/src/index.ts`; add the component + path registration in `packages/contracts/scripts/emit-openapi.ts` (mirror the `kyc` blocks); regenerate `openapi/v1.yaml` via the emit script.
- [x] **Task 5 — API module (`apps/api/src/modules/nominee/`)** (AC1, AC2, AC3, AC4, AC5)
  - [x] `nominee.routes.ts` — register `POST /api/v1/member/nominees` (declare) + `GET /api/v1/member/nominees` (status) behind `requireMemberSession(deps)` (member-token guard). **No step-up preHandler at signup** (3.9 adds `requireMemberStepUp(deps, 'nominee_change')` on its Life Events route).
  - [x] `nominee-crypto.ts` — `encryptNomineeField` / (decrypt for the status read) keyed on the member's REAL `pariwarId` + `MEMBER_NOMINEE_FIELD_CLASS`. **Mirror `apps/api/src/modules/kyc/kyc-crypto.ts` verbatim.**
  - [x] `nominee.handlers.ts` — declare handler: `openScopeTx(deps, pariwarIdStr)` → guard member exists and is **not** in a terminal state (`withdrawn` / `anonymized`) via `getMemberStateAt` → validate split (Task 6) → encrypt each nominee field → `nominee.replaceMemberNominees(...)` → `memberDomain.projectMemberState(scopeTx.client, { eventType: 'member.nominees_declared', payload: { from_state: state, to_state: state, trigger: 'nominee_declaration', actor: 'member', nominee_count, split } , actorId })` → `emitAuthAudit(deps, request, 'member_nominees.declared', { context: { nominee_count, split } })` (**no PII in the audit context**). `closeScopeTx` in `finally`. Mirror `kyc.handlers.ts` confirm/manual structure.
  - [x] **Do NOT add `nominee.repo.ts`** — `kyc.repo.ts` exists solely for the PUBLIC DigiLocker callback (a BYPASSRLS pre-scope cross-tenant lookup with no member JWT). Nominee routes are fully member-session-gated; there is no pre-scope path. Adding a repo seam here adds unnecessary complexity with no purpose. Add `index.ts` exporting `registerNomineeModule`; wire it in `apps/api/src/server.ts` next to `registerKycModule` (around line 98).
- [x] **Task 6 — 75/25 split derivation (server-authoritative)** (AC1)
  - [x] Derive split server-side from the count — **never trust a client-supplied percentage**: 1 nominee → `splitPct=100`, `split='sole'`; 2 nominees → rank-1 `splitPct=75`, rank-2 `splitPct=25`, `split='75-25'`. Reject 0 or >2 nominees with a validation error. The "no override" rule is enforced by the server computing the split, not by validating a client value.
- [x] **Task 7 — Mobile signup screen** (AC1, AC2, AC3, AC6)
  - [x] Add `apps/mobile/app/(signup)/nominees.tsx` — 1–2 nominee forms (add/remove second nominee), the fixed 75/25 split shown read-only when 2 are present, and the two reassurance copy blocks (AC2 + AC3). Mirror `apps/mobile/app/(signup)/kyc.tsx` for structure, the api-client call, and screen chrome. Add the screen to the `(signup)` group (the `_layout.tsx` Stack already hosts the group).
  - [x] Accessibility: every field labelled + per-field guidance; split + reassurance copy announced to screen readers (AC6). Bilingual via `@twt/i18n` (Pattern 6).
  - [x] Add the api-client method in `packages/api-client/src/index.ts` (mirror the kyc client methods).
- [x] **Task 8 — i18n copy** (AC2, AC3, AC6)
  - [x] Add the nominee-flow strings (field labels, the two reassurance blocks, split copy, errors) to `packages/i18n/locales/en/common.json` + `packages/i18n/locales/hi/common.json`. Follow the tone guide (Story 2.2) — calm-precise member register.
- [x] **Task 9 — Tests** (all ACs)
  - [x] Domain unit: `packages/domain/tests/nominee/declaration.test.ts` — split derivation, replace-on-redeclare (delete-then-insert latest-wins), event-payload shape rejects PII keys (`.strict()`).
  - [x] Domain integration (DB-gated, `:5433`): `packages/domain/tests/integration/nominee/member-nominees.spec.ts` — RLS isolation (cross-Pariwar denial, mirror `members-policy-regression.spec.ts`), FK cascade on member delete (RTBF), encrypted round-trip. Assert **membership, not row counts** (own-committing writers accumulate rows — [[project_live_db_test_gotchas]]).
  - [x] API integration: `apps/api/tests/integration/nominee/nominee-declare.spec.ts` — seed a member in `pending-fee` (3.3b's `seedMember` helper), declare 1 then re-declare 2 → assert two `member.nominees_declared` events on the stream, projection replaced, lifecycle state unchanged, terminal-state rejection, no-PII audit/event payloads.
  - [x] Run `pnpm ci:local` ([[project_ci_actions_suspension_local_mirror]]) as the merge gate (CI Actions still suspended); integration needs `DATABASE_URL` on `:5433`.
- [x] **Task 10 — Friction-budget disposition + sprint ledger** (housekeeping)
  - [x] The friction-budget CI gate fires on the new member-facing path. Add a **Story 3.4 disposition note** to `friction-budget.md` (mirror the "Story 2.5 disposition" paragraph): nominee declaration is **necessary signup data entry, zero deliberate friction** — **no new ledger row warranted**. Verify the new mobile screen stays **under** the `friction-budget.yaml` page-weight ceiling; **do not touch the best-ever baseline** unless the measurement DECREASES it ([[project_friction_budget_baseline_ratchet]]).
  - [x] On completion, flip `development_status[3-4-nominee-declaration-with-75-25-split]` and append the combined `ready-for-dev→in-progress→review` ledger COMMENT entry per [[project_sprint_status_ledger]].

### Review Findings

<!-- Added by bmad-code-review 2026-06-27. Layers: Blind Hunter ✓ · Edge Case Hunter ✗ (timeout, inline substitution) · Acceptance Auditor ✗ (connection drop, inline substitution). AC audit: AC1–AC6 + R1–R5 all satisfied. -->

- [x] [Review][Patch] P1 — `mobilePresent` always `true`, computed as `row.mobileCiphertext.length > 0` but `mobile_ciphertext` is NOT NULL [`apps/api/src/modules/nominee/nominee.handlers.ts:~63`]
- [x] [Review][Patch] P2 — Audit event emitted before `ok = true`: if `buildStatus` throws, tx is rolled back but `member_nominees.declared` audit is already enqueued [`apps/api/src/modules/nominee/nominee.handlers.ts:~155`]
- [x] [Review][Patch] P3 — `seedWithdrawnMember` uses empty `'{}'::jsonb` payloads + no `members` row; terminal-state guard relies on DB trigger behaviour that isn't exercised through `projectMemberState` [`apps/api/tests/integration/nominee/nominee-declare.spec.ts:~1194`]
- [x] [Review][Patch] P4 — Success screen H2 reuses `nominees.title` ("Add your nominees") in the `done` branch; screen-reader users hear the same heading before and after submission (AC6) [`apps/mobile/app/(signup)/nominees.tsx:~1537`]
- [x] [Review][Defer] D1 — `split_pct` has no `CHECK (split_pct IN (25, 75, 100))` DB constraint; server derivation is the correct enforcement layer but a direct SQL insert bypassing the app could write any value [`packages/domain/migrations/0025_member-nominees.sql`] — deferred, pre-existing pattern (no DB constraint on server-derived columns); add in a future hardening migration
- [x] [Review][Defer] D2 — Concurrent re-declarations from the same member: both requests DELETE then INSERT the same `(member_id, rank)` composite PK → second INSERT gets a PK conflict → 500 instead of graceful handling [`apps/api/src/modules/nominee/nominee.handlers.ts`, `packages/domain/src/nominee/declaration-write.ts`] — deferred, pre-existing delete-then-insert pattern; concurrent same-member requests are unlikely in a 30-min signup session; serializable isolation or optimistic lock is out of scope for 3.4
- [x] [Review][Defer] D3 — `getMemberStateAt` returns `null` for a non-existent member: `TERMINAL_STATES.has(null)` = `false` → guard bypassed → FK violation on insert → 500 instead of a clean 404/409 [`apps/api/src/modules/nominee/nominee.handlers.ts:~68`] — deferred, pre-existing pattern (session guard provides first line; FK protects data integrity); explicit null check is a hardening improvement

## Dev Notes

### Reuse map — extend these, do NOT reinvent

| Need | Reuse (do not rebuild) | Source |
| --- | --- | --- |
| Tier-1 encrypted PII table (column pattern + naming) | `member_kyc_profiles.ts` + `piiColumn(1, fieldClass)` — **NOT** the PK: composite PK uses `otp_rate_buckets.ts`'s `(t) => [primaryKey({...})]` pattern | `packages/domain/src/schema/member_kyc_profiles.ts`, `packages/domain/src/schema/otp_rate_buckets.ts`, `packages/domain/src/encryption/column.ts` |
| App-layer encrypt/decrypt helpers | `encryptKycField` / `decryptKycField` pattern | `apps/api/src/modules/kyc/kyc-crypto.ts` |
| RLS policy for a member tenant table | `member-kyc-profiles-rls.ts` | `packages/domain/src/policies/` |
| Event emission from a handler | `memberDomain.projectMemberState({ eventType, payload, actorId })` | `apps/api/src/modules/kyc/kyc.handlers.ts:245` |
| Scope-tx lifecycle | `openScopeTx` / `closeScopeTx` / `memberCtx` | `apps/api/src/modules/kyc/kyc.handlers.ts` |
| Member-session guard | `requireMemberSession(deps)` | `apps/api/src/modules/auth/shared/member-session-guard.ts` |
| Step-up gate (for 3.9, NOT here) | `requireMemberStepUp(deps, 'nominee_change')` | `apps/api/src/modules/auth/member/member-step-up.gate.ts:21` |
| Contracts DTO + no-PII-echo discipline | `kyc/signup.ts` (`KycProfileSummaryResponse`) | `packages/contracts/src/kyc/signup.ts` |
| Mobile signup screen | `(signup)/kyc.tsx` + `(signup)/_layout.tsx` | `apps/mobile/app/(signup)/` |
| Event vocabulary + reducer | `member.nominees_declared` (already declared, no-op) | `packages/domain/src/member/events.ts`, `member/state.ts` |

### R1 — The load-bearing PII split: event = audit, projection = data (DO NOT put PII in the event-log)

The architecture commits §1.14 "member state derived from events; persisted rows are optimization." For **PII**, Story 3.3b resolved the tension and you MUST follow it: **raw PII never enters the `events_log` payload** (it is plaintext JSONB). `member.kyc_completed` carries only the *masked* Aadhaar reference; the name/dob/photo live Tier-1-encrypted in `member_kyc_profiles`. Mirror exactly: `member.nominees_declared` carries `{ ...auditShape, nominee_count, split }` only; nominee names/mobiles/addresses go Tier-1-encrypted into `member_nominees`. The "latest event is the effective declaration" (epics line 1700) is realised as: the event stream is the immutable **timeline of when declarations changed**, and the `member_nominees` projection (delete-then-insert, latest-wins) is the **current effective PII**. Data export (Story 3.11) reads current nominees from the projection + the declaration timeline from the event stream.

### R2 — Member already exists (Story 3.6 owns creation); 3.4 assumes pre-lock-in

Identical to 3.3b §R2: the signup-wizard glue + member creation is **Story 3.6** (not yet built). 3.4 assumes a member row exists in a pre-lock-in signup state (`pending-kyc` / `pending-fee` / `pending-valid`) and proves the flow with the seeded-member test helper. The declare guard rejects only the **terminal** states (`withdrawn` / `anonymized`); it does NOT require a specific pre-lock-in state (nominees may legitimately be declared before or after KYC within the wizard). The lock-in entry gate in Story 3.6 is what asserts "nominee declaration recorded" as a precondition for `member.lock_in_entered` (epics line 1734 condition (b)) — **that check is 3.6's, not 3.4's**.

### R3 — Step-up boundary: signup = none, Life Events update = 3.9

Story 3.2 AC2 explicitly defers nominee-change gating to "3.4/3.9". This story takes the **signup** half (no step-up — the member holds a fresh signup-continuation session, TTL 30 min per 3.2). The **Life Events update** half — same declare service, wrapped in `requireMemberStepUp(deps, 'nominee_change')` — is **Story 3.9**. Build `replaceMemberNominees` + the handler so 3.9 attaches the gate and reuses the service with zero changes. Pick the action-context string **`nominee_change`** now (it is the §2.2 step-up action name) so 3.9 and any step-up audit line agree on it.

### R4 — 75/25 is server-derived, not client-validated

R5(E) fixes 75/25 with **no override**. Enforce by **computing** the split server-side from the nominee count (Task 6). Never accept a client-supplied percentage and validate it — that invites a bypass. The wire DTO carries names/relationships/mobiles only; the server stamps `splitPct`.

### R5 — `member.nominees_declared` is a non-transition marker (reducer untouched)

Per Story 3.1 Dev Note (e): `member.nominees_declared` and `member.medical_disclosed` are emitted on the stream but are **NOT state transitions** — the reducer returns the current state unchanged. The event payload's `from_state` MUST equal `to_state` (= the member's current state at declare time). Do NOT add a transition, a phantom state, or special-case the reducer. Widening the Zod payload (Task 3) does not change reducer behavior.

### Nominee field sensitivity (tier assignment)

- `nominee_name` → **Tier-1** envelope ciphertext. (Unlike *member* name, which is Tier-2 blind-indexed for dedup/search, the nominee name is never searched or deduped, so plain Tier-1 ciphertext is correct.)
- `mobile` → **Tier-1** (architecture §2.7 lists Mobile as Tier-1).
- `address` → **Tier-1**, NULLABLE (architecture §2.7 lists address as Tier-1; AC1 marks it optional).
- `relationship` → **Tier-3 plaintext** (low-sensitivity; constrain the value set in the contract enum for data quality, not at the DB).
- `rank`, `splitPct`, `nominee_count`, `split` → **non-PII** (safe in both the table and the event payload).

### PII echo-back discipline (status read)

The `GET` status / member-facing confirmation view must **NEVER round-trip raw name/mobile/address bytes** back to the client — mirror `KycProfileSummaryResponse` (presence flags + masked last-4). The declare REQUEST body carries Tier-1 PII (acceptable — request bodies are never logged; the audit trail + event carry count/split only).

### Migration discipline

Next index is **0025** (last applied: `0024_member-kyc-profiles.sql`). Generate via drizzle; if GRANT/FORCE-RLS or trigger supplementation is needed, add it to the freshly-generated file **before first apply**. Never regenerate or hand-edit an already-applied migration — drizzle skips by journal `when`, not SQL hash → `42P07`; never reset via `DROP SCHEMA` → strips `twt_app` USAGE → `42P01`. ([[project_live_db_test_gotchas]])

### Project Structure Notes

- **New — `@twt/domain`:** `schema/member_nominees.ts`, `policies/member-nominees-rls.ts`, `nominee/declaration-write.ts`, `nominee/declaration-read.ts`, `nominee/index.ts`, `migrations/0025_member-nominees.sql` (+ `meta/0025_snapshot.json`).
- **New — `@twt/contracts`:** `src/nominee/declaration.ts`, `src/nominee/index.ts`.
- **New — `apps/api`:** `modules/nominee/{nominee.routes,nominee.handlers,nominee.repo,nominee-crypto,index}.ts`.
- **New — `apps/mobile`:** `app/(signup)/nominees.tsx`.
- **New — tests:** `packages/domain/tests/nominee/declaration.test.ts`, `packages/domain/tests/integration/nominee/member-nominees.spec.ts`, `apps/api/tests/integration/nominee/nominee-declare.spec.ts`.
- **Edited:** `packages/domain/src/{schema/index,policies/index,index}.ts`, `packages/domain/src/member/events.ts`, `packages/domain/migrations/meta/_journal.json`, `packages/contracts/src/index.ts` + `scripts/emit-openapi.ts` + `openapi/v1.yaml`, `apps/api/src/{server,context}.ts`, `packages/api-client/src/index.ts`, `packages/i18n/locales/{en,hi}/common.json`, `friction-budget.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- **Naming discipline:** DB columns snake_case, TS fields camelCase (architecture L3663-3677). Header-comment style mirrors `member_kyc_profiles.ts`.
- **Domain may not import `@twt/events`** (turbo cycle — [[project_member_lifecycle_domain_substrate]]); the projector/reads hit `events_log` directly. Contracts may not import `@twt/domain` (browser-bundle rule).

### Testing standards summary

- Unit (vitest) co-located under each package's `tests/`. DB-gated integration runs against the `twt-test-pg` Docker on **:5433** ([[project_live_db_test_gotchas]]); assert **membership not counts**.
- RLS regression for the new table is mandatory (cross-Pariwar denial) — mirror `members-policy-regression.spec.ts`.
- FK-cascade test proves RTBF (Story 3.12) will sweep nominee rows when the member is deleted.
- Merge gate: `pnpm ci:local` mirrors all ci.yml jobs ([[project_ci_actions_suspension_local_mirror]]).
- If `onSend` hooks are touched, run the DB-gated suites ([[project_fastify_onsend_doublesend]]) — not expected here.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4 (lines 1683-1700)] — story + ACs.
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.6 (line 1734)] — lock-in entry precondition (b): nominee declaration recorded (3.6's check, not 3.4's).
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-4 (lines 276-282)] — 75/25 split, no nominee KYC, disputes → State Trustee (R5(E)).
- [Source: _bmad-output/planning-artifacts/architecture.md#2.7 PII encryption at rest (lines ~1500-1515)] — Tier-1 list incl. mobile/address; envelope encryption via Tink + Cloud KMS.
- [Source: packages/domain/src/schema/member_kyc_profiles.ts] — the table/PII pattern to mirror.
- [Source: apps/api/src/modules/kyc/kyc.handlers.ts:245-263] — event-emission + no-PII-in-payload precedent.
- [Source: packages/domain/src/member/events.ts:102] — the `NomineesDeclaredPayloadSchema` stub to widen.
- [Source: _bmad-output/implementation-artifacts/3-3b-digilocker-kyc-flow-in-signup-manual-fallback.md] — §R2 (member creation = 3.6), PII discipline.
- [Source: _bmad-output/implementation-artifacts/3-2-member-mobile-otp-authentication.md] — AC2 step-up gate (nominee change → 3.4/3.9), 30-min signup session TTL.

## Previous Story Intelligence

- **3.3b (KYC signup)** established the **exact template** for a PII-carrying signup-wizard SURFACE: encrypted tenant table (`member_kyc_profiles`) + app-layer crypto helpers + in-scope handler that writes the projection then `projectMemberState`s the event + member-facing summary that never echoes PII. 3.4 is the same shape with nominee data. **Reuse, do not reinvent.**
- **3.3b §R2** is binding: **member creation is Story 3.6**. Do not create members here; assume + seed.
- **3.1** declared `member.nominees_declared` as a **no-op reducer marker** with a placeholder payload — 3.4 widens the payload and emits it for real. The reducer needs no change.
- **3.2** shipped `requireMemberStepUp` as a reusable gate that "specific gated routes attach in their own stories" and named nominee-change as 3.4/3.9 — confirming the signup/Life-Events split this story takes.
- DB gotchas carried forward: never regenerate an applied migration; test DB on :5433; assert membership not counts.

## Git Intelligence Summary

Recent epic-3 commits (3.1 → 3.3b) show the established cadence: each story = domain schema + RLS + accessors → contracts → apps/api module → mobile screen → tests, merged via `pnpm ci:local` (Actions suspended). Commit manually (branch + selective stage), not the `commit-story` helper ([[project_story_automator_ops]]). Migrations advanced 0018 (3.1) → 0023/0024 (3.3a/3.3b); 3.4 is **0025**.

## Latest Tech Information

No new external libraries. Stack is fixed: Drizzle 0.45 (sync `customType` → app-layer encrypt/decrypt, per `column.ts` Story 1.5 deviation note), Google Tink + Cloud KMS envelope encryption (Story 1.5), Fastify member-token guard (3.2), Zod + `.strict()` contracts, Expo Router `(signup)` group (3.3b). Do not add dependencies.

## Project Context Reference

No `project-context.md` exists in this repo (only the generator template). Binding conventions live in CLAUDE.md auto-memory: [[project_member_lifecycle_domain_substrate]], [[project_live_db_test_gotchas]], [[project_ci_actions_suspension_local_mirror]], [[project_sprint_status_ledger]], [[project_friction_budget_baseline_ratchet]], [[project_eslint_config_per_package_cwd]], [[project_fastify_onsend_doublesend]], [[project_story_automator_ops]].

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. Ready for `dev-story`.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow)

### Debug Log References

- **Migration discipline (Task 1):** `0024_member-kyc-profiles.sql`'s header confirms migrations 0021–0024 are HAND-AUTHORED because drizzle-kit's `meta/` snapshots stop at 0020 — running `db:generate` would diff CURRENT schema against `0020_snapshot.json` and re-emit applied migrations → `42P07` ([[project_live_db_test_gotchas]]). So `0025_member-nominees.sql` was hand-authored mirroring 0024 (table + FK-cascade + GRANT + FORCE-RLS + 2 policies), and the `_journal.json` idx-25 entry added manually (`when = 1782790800000 + 86400000 = 1782877200000`, matching the 0021–0024 one-day cadence). Migration applied + verified on `:5433`: composite PK `member_nominees_member_id_rank_pk`, FK `ON DELETE CASCADE`, both RLS policies present, FORCE RLS on.
- **Schema row types are namespaced (Task 5):** `@twt/domain` re-exports schema via `export * as schema`, so `MemberNomineeRow` is NOT on the top barrel — the handler derives the row type from `Awaited<ReturnType<typeof nomineeDomain.getMemberNominees>>[number]` (the kyc-handler precedent).
- **`pnpm ci:local` flake (Task 9):** the first ci:local run failed ONLY the concurrent `test (unit)` job on the PRE-EXISTING `kyc-signup.spec.ts` AC1 case (a known own-committing-writer / parallel-`:5433`-contention flake — passes in isolation 5/5 and twice-in-a-row; unrelated to Story 3.4). The canonical `integration-tests` job was green in that same run, and a re-run of ci:local was **18/18 green**. No Story-3.4 test flaked.

### Completion Notes List

Implemented the third signup-wizard SURFACE (`kyc → nominees → medical → payment`) end-to-end:

- **Task 1 — `member_nominees` table + RLS + migration 0025.** New Tier-1-encrypted tenant table, composite PK `(member_id, rank)` (the `otp_rate_buckets.ts` third-arg `primaryKey({...})` pattern, since a member has 1–2 nominees). name/mobile/address → `piiColumn(1, 'member_nominee')`; relationship → Tier-3 plaintext `text` (value-constrained in the contract, not the DB); `split_pct` server-stamped. FK → `members.member_id` `ON DELETE CASCADE` for RTBF (3.12). Tenant-isolation RLS mirrors `member-kyc-profiles-rls`. Registered in schema/policies barrels; `MEMBER_NOMINEE_FIELD_CLASS` added to `apps/api/context.ts`.
- **Task 2 — domain accessors.** `replaceMemberNominees` (delete-then-insert latest-wins in one tx, AC5) + `getMemberNominees` (rank-ordered). Accept pre-encrypted ciphertext (encryption is app-layer). `nominee` namespace exported from `@twt/domain`.
- **Task 3 — widened `NomineesDeclaredPayloadSchema`** to `{ …auditShape, nominee_count, split }`, `.strict()` — NO PII in the events_log payload (R1). Reducer left untouched (verified `member.nominees_declared` falls to the `default → return state` identity branch — non-transition marker, R5).
- **Task 4 — contracts + OpenAPI.** `NomineeDeclareRequest` (1–2 entries, name/relationship/mobile/optional-address, `.strict()`), `NomineeSummaryEntry` (rank/relationship/splitPct + presence flags — no raw-PII echo-back), `NomineeStatusResponse` (object wrapper). Relationship wire enum re-declared (no `@twt/domain` import). OpenAPI components + 2 paths registered; `openapi/v1.yaml` regenerated (contracts-determinism gate green).
- **Task 5 + 6 — API module + server-derived split.** `modules/nominee/` (routes, handlers, crypto, index — NO repo, since there is no pre-scope path). `POST/GET /api/v1/member/nominees` behind `requireMemberSession` only (NO step-up at signup — Life Events UPDATE + `requireMemberStepUp(deps, 'nominee_change')` is Story 3.9, which re-runs this declare service unchanged, R3). The declare handler: terminal-state guard via `getMemberStateAt` → `deriveNomineeSplit(count)` (1→sole/100, 2→75/25 — computed server-side from the count, never a client value, R4) → encrypt fields → `replaceMemberNominees` → `projectMemberState('member.nominees_declared', { …, nominee_count, split })` (from_state===to_state) → `emitAuthAudit('member_nominees.declared', { nominee_count, split })`. New audit type registered. Wired in `server.ts` next to `registerKycModule`.
- **Task 7 + 8 — mobile + i18n.** `app/(signup)/nominees.tsx` (1–2 nominee forms, read-only fixed 75/25 when two, the AC2 no-nominee-KYC + AC3 no-nominee-bank reassurance blocks, full a11y labels/hints/announcements). `api-client` gained `nomineesDeclare` / `nomineesStatus`. 29 bilingual en/hi keys added (i18n-parity gate green).
- **Task 9 — tests.** Domain unit (`deriveNomineeSplit` all cases + payload `.strict()` rejects name/mobile/address PII keys). Domain integration (`:5433`): cross-Pariwar RLS denial, FK cascade RTBF, latest-wins ciphertext round-trip — assert membership not counts. API integration (`:5433`): declare 1 → re-declare 2 (two `member.nominees_declared` events, projection replaced, lifecycle unchanged at pending-fee, server-derived 75/25, no PII in event/audit/at-rest), GET no-PII echo-back, terminal-state 409, 0/>2 → 400, no-token → 401.
- **Task 10 — friction-budget + ledger.** Added the Story 3.4 disposition note (necessary signup data entry, zero deliberate friction, no new row; baseline untouched — mobile is an EAS no-op). Flipped `development_status[3-4-…]` → `review` + appended the combined `ready-for-dev→in-progress→review` ledger COMMENT entry.

**Validation:** typecheck + lint clean across all touched packages; `pnpm ci:local` (with `DATABASE_URL` on `:5433`) **18/18 green**.

### File List

**New — `@twt/domain`:**
- `packages/domain/src/schema/member_nominees.ts`
- `packages/domain/src/policies/member-nominees-rls.ts`
- `packages/domain/src/nominee/declaration-write.ts`
- `packages/domain/src/nominee/declaration-read.ts`
- `packages/domain/src/nominee/split.ts`
- `packages/domain/src/nominee/index.ts`
- `packages/domain/migrations/0025_member-nominees.sql`
- `packages/domain/tests/nominee/declaration.test.ts`
- `packages/domain/tests/integration/nominee/member-nominees.spec.ts`

**New — `@twt/contracts`:**
- `packages/contracts/src/nominee/declaration.ts`
- `packages/contracts/src/nominee/index.ts`

**New — `apps/api`:**
- `apps/api/src/modules/nominee/nominee.routes.ts`
- `apps/api/src/modules/nominee/nominee.handlers.ts`
- `apps/api/src/modules/nominee/nominee-crypto.ts`
- `apps/api/src/modules/nominee/index.ts`
- `apps/api/tests/integration/nominee/nominee-declare.spec.ts`

**New — `apps/mobile`:**
- `apps/mobile/app/(signup)/nominees.tsx`

**Edited:**
- `packages/domain/src/schema/index.ts` (re-export member_nominees)
- `packages/domain/src/policies/index.ts` (register RLS policy)
- `packages/domain/src/index.ts` (export `nominee` namespace)
- `packages/domain/src/member/events.ts` (widen `NomineesDeclaredPayloadSchema`)
- `packages/domain/migrations/meta/_journal.json` (idx-25 entry)
- `packages/contracts/src/index.ts` (export nominee barrel)
- `packages/contracts/scripts/emit-openapi.ts` (components + 2 paths)
- `openapi/v1.yaml` (regenerated)
- `apps/api/src/context.ts` (`MEMBER_NOMINEE_FIELD_CLASS`)
- `apps/api/src/audit/audit-sink.ts` (`member_nominees.declared` audit type)
- `apps/api/src/server.ts` (wire `registerNomineeModule`)
- `packages/api-client/src/index.ts` (`nomineesDeclare` / `nomineesStatus`)
- `packages/i18n/locales/en/common.json` + `packages/i18n/locales/hi/common.json` (nominee copy)
- `friction-budget.md` (Story 3.4 disposition note)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status → review + ledger entry)

## Change Log

| Date | Version | Description |
| --- | --- | --- |
| 2026-06-27 | 1.0 | Story 3.4 implemented: nominee declaration SURFACE — `member_nominees` Tier-1 table + RLS + migration 0025, domain accessors (latest-wins replace) + server-derived 75/25 split, widened `member.nominees_declared` event (non-PII), contracts + OpenAPI, `apps/api` nominee module (`POST/GET /api/v1/member/nominees`, member-session-gated), mobile `(signup)/nominees.tsx` + bilingual copy, full test suite. ci:local 18/18 green on `:5433`. Status → review. |
