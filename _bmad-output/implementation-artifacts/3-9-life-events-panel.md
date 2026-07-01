---
baseline_commit: da83122bc5bb834eb43d9702f20e3ec6beef6d3c
---

# Story 3.9: Life Events Panel (Nominee, Address, Transfer-In/Out, Medical Disclosure Update)

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member with life changes affecting my TWT record,
I want a Life Events panel to update my nominees, address, transfer-in/out (posting) status, or medical disclosure,
so that my record stays current and my nominees / contribution discipline / eligibility evaluations reflect reality.

## Acceptance Criteria

**AC1 — Four update sub-types, each emitting the correct event.** Given FR-5, when the Life Events panel is implemented, then the four sub-types behave as:
- **Nominee update** `[v1-S]`: re-runs the Story 3.4 declare flow (latest-wins on `member_nominees`); emits a NEW `member.nominees_declared` event (existing type — no new event). Step-up gated.
- **Address update** `[v1-S]`: simple form; persists Tier-1-encrypted; emits a NEW `member.address_updated` event with the **prior value preserved** (history, not overwrite). No step-up.
- **Transfer-in/out** `[v1-S]`: updates posting district (and recorded Pariwar reference); emits a NEW `member.posting_updated` event with prior value preserved. No step-up.
- **Medical disclosure update** `[v1-M]`: re-runs the Story 3.5 submit flow (APPEND-ONLY history); emits a NEW `member.medical_disclosed` event; ack-required + audit-logged. Epic 4 concealment evaluation walks the FULL disclosure history (not just the most recent). Step-up gated.

**AC2 — Save-and-resume on grief-paced flows.** Given UX-DR50 `<SaveAndResumeAffordance>` + UX-DR56 Pattern 5 (form save-and-resume), when a grief-paced update is in progress (medical-disclosure-update specifically; nominee changes following a death in family), then the member can start an update, leave, and return without losing work.

**AC3 — Dignified-validation copy, bilingual.** Given UX-DR55 Pattern 4 dignified-validation copy validated against Story 0.9 findings + UX-DR57 Pattern 6 bilingual input, when any sub-type form is rendered, then no aggressive prompting and no scarcity framing; all member-facing strings resolve from `@twt/i18n` with en/hi parity (Story 2.1 contract); tone passes the Story 2.2 vocabulary check.

**AC4 — Audit + event-stream + step-up on every update.** Given any Life Event update, when persisted, then (a) the audit log records the change via Story 1.10, (b) the Story 3.1 event stream receives the appropriate event (all four are NON-TRANSITION markers: `from_state === to_state`), and (c) step-up OTP (`requireMemberStepUp`) gates the **nominee** and **medical** update routes only (address + posting do NOT require step-up).

**AC5 — PII discipline (R1) holds for the two new events.** Given the new `member.address_updated` and `member.posting_updated` events, when persisted, then the `events_log` payload carries ONLY a NON-PII marker (count/presence/version + `auditShape`) — NEVER the raw address bytes or any other Tier-1 PII; address PII lives Tier-1-encrypted in its own table (mirrors `member_nominees` / `member_medical_disclosures`).

## Tasks / Subtasks

> **Execution order constraint:** Tasks 1–4 (domain schemas, migrations, contracts) must be fully complete before starting Tasks 5–8 (API routes, sdk, mobile). Fastify routes import from `@twt/contracts`; mobile screens call api-client methods that wrap routes. Do not start Task 8 mobile screens before Task 5 routes exist.

- [x] **Task 1 — Two new member event types (domain).** (AC1, AC4, AC5)
  - [x] Add `member.address_updated` and `member.posting_updated` to `MEMBER_EVENT_TYPES` + `MEMBER_EVENT_PAYLOAD_SCHEMAS` in `packages/domain/src/member/events.ts` (the `satisfies Record<MemberEventType, …>` exhaustiveness check forces both wiring points — adding the enum value without a payload schema is a compile error). Also added the two entries to `EVENT_TYPE_REGISTRY` (packages/events/src/registry.ts).
  - [x] Author `AddressUpdatedPayloadSchema` + `PostingUpdatedPayloadSchema` — NON-PII markers, `.strict()`, spread `auditShape`. Address payload carries `address_present: z.literal(true)` presence marker only (NO address bytes — R1). Posting payload carries `district` + optional `pariwar_ref` + `is_retirement: z.boolean().optional()`.
  - [x] Confirmed BOTH are identity markers: the reducer `default` branch returns state unchanged (NON-TRANSITION); no reducer case added (state.ts comment updated). DB-free unit test asserts identity + PII-rejecting payload schemas (`tests/member/life-events-markers.test.ts`, 11 tests green).
- [x] **Task 2 — Address storage + write (domain).** (AC1, AC5)
  - [x] New schema `packages/domain/src/schema/member_addresses.ts` (append-only history, `piiColumn(1, 'member_address')` for the address line; per-row `address_id` PK). Added `AddressId` brand + smart constructor to `ids/index.ts`.
  - [x] RLS policy `member-addresses-rls.ts` (mirror `member-medical-disclosures-rls.ts`); registered in the policy barrel. `MEMBER_ADDRESS_FIELD_CLASS = 'member_address'` added to `apps/api/src/context.ts`.
  - [x] Migration `0030_member-addresses.sql` (hand-authored; mirror 0026 GRANT SELECT/INSERT-only + FORCE RLS + POLICY; `_journal.json` `when` entry 1783309200000). Applied cleanly to fresh test DB (:5433) — table + forced RLS + 2 policies verified.
  - [x] Write fn `insertMemberAddress` + read `getMemberAddressLatest` in `packages/domain/src/member/address.ts`; exported from `member/index.ts`.
- [x] **Task 3 — Posting (transfer-in/out) storage + write (domain).** (AC1)
  - [x] New schema `packages/domain/src/schema/member_postings.ts` — append-only history; `district` plaintext non-PII, optional `pariwar_ref`, **`is_retirement boolean NOT NULL DEFAULT false`** (Epic 4 Story 4.5 anchor), `PostingId` brand. Records posting/district change as a member attribute + event ONLY — NO cross-Pariwar tenant migration (v1-S scope).
  - [x] RLS policy `member-postings-rls.ts` + migration `0031_member-postings.sql` (same discipline). Write `insertMemberPosting` + read `getMemberPostingLatest` in `member/posting.ts`; exported. Applied cleanly to fresh test DB.
- [x] **Task 4 — Contracts (`packages/contracts`).** (AC1, AC3, AC5)
  - [x] `packages/contracts/src/life-events/`: `AddressUpdateRequest` (addressLine + locale), `PostingUpdateRequest` (district + optional pariwarRef + `isRetirement`), shared `LifeEventsSummaryResponse`. All `.strict()`, plain primitives (no `@twt/domain`), NO `.openapi()` (openapi/v1.yaml byte-unchanged; determinism gate green). REQUEST-only PII (addressLine) — summary echoes presence flags only. pii-scrape gate green.
  - [x] Defined `LifeEventsSummaryResponse` in `packages/contracts/src/life-events/summary.ts` (the GET `/life-events` contract consumed by both the API route and the api-client):
    ```ts
    export const LifeEventsSummaryResponse = z.object({
      nominees:  z.object({ declared: z.boolean(), count: z.number().int().nonnegative() }),
      address:   z.object({ recorded: z.boolean() }),
      posting:   z.object({ recorded: z.boolean(), is_retirement: z.boolean() }),
      medical:   z.object({ disclosed: z.boolean(), disclosure_count: z.number().int().nonnegative() }),
    }).strict();
    export type LifeEventsSummaryResult = z.infer<typeof LifeEventsSummaryResponse>;
    ```
  - [x] Nominee + medical Life-Events routes REUSE the existing `NomineeDeclareRequest` / medical submit contracts unchanged.
- [x] **Task 5 — API Life Events routes (`apps/api/src/modules/life-events/` — new module).** (AC1, AC4)
  - [x] `POST /api/v1/member/life-events/nominees` — preHandler `[requireMemberSession, requireMemberStepUp(deps, 'nominee_change')]`; delegates to `createNomineeHandlers(deps).declare` (re-runnable; emits `member.nominees_declared`). NOT reimplemented.
  - [x] `POST /api/v1/member/life-events/medical` — preHandler `[requireMemberSession, requireMemberStepUp(deps, 'medical_change')]`; delegates to `createMedicalHandlers(deps).submit` (append-only; emits `member.medical_disclosed`).
  - [x] `POST /api/v1/member/life-events/address` — `[requireMemberSession]` (NO step-up); NEW handler persists via `insertMemberAddress` + `projectMemberState({ eventType: 'member.address_updated', … })` in ONE scope-tx; audit AFTER buildSummary + ok (nominee.handlers.ts:158 ordering). Terminal-state guard.
  - [x] `POST /api/v1/member/life-events/posting` — `[requireMemberSession]` (NO step-up); NEW handler persists via `insertMemberPosting` + `member.posting_updated`; same scope-tx + audit ordering.
  - [x] `GET /api/v1/member/life-events` — current-summary read; response `LifeEventsSummaryResponse` (all four sub-types via one Promise.all across the accessors).
  - [x] Registered `registerLifeEventsModule` in `apps/api/src/server.ts`. login-wall.spec.ts green (3/3) — new session-gated routes recognized, no allowlisting needed.
  - [x] Added audit-sink action types `member_life_events.address_updated` / `member_life_events.posting_updated` (NON-PII context) to `apps/api/src/audit/audit-sink.ts`.
- [x] **Task 6 — api-client SDK.** (AC1) Added `lifeEventsUpdateNominees` / `lifeEventsUpdateMedical` / `lifeEventsUpdateAddress` / `lifeEventsUpdatePosting` / `lifeEventsSummary` to `packages/api-client/src/index.ts` (`LIFE_EVENTS_BASE` const + response-validated against the contracts schemas). `lifeEventsSummary` returns `LifeEventsSummaryResult`. api-client typecheck green.
- [x] **Task 7 — i18n keys (en + hi parity).** (AC3) Added 32 `lifeEvents.*` keys to `packages/i18n/locales/{en,hi}/common.json` (panel title/intro, four sub-type labels+descs, address/posting form labels + dignified-validation messages, retirement toggle, save-and-resume affordance, step-up prompt, generic error). Calm register — no urgency/scarcity framing. Reuses existing `nominees.*` / `medical.*` for the re-rendered forms. i18n parity gate green (179/179).
- [x] **Task 8 — Mobile Life Events panel UI (`apps/mobile`).** (AC1, AC2, AC3)
  - [x] New screen group `app/(life-events)/`: panel index (`index.tsx`) + per-sub-type screens (`nominees.tsx`, `address.tsx`, `posting.tsx`, `medical.tsx`). Extracted SHARED `components/life-events/NomineeForm.tsx` + `MedicalForm.tsx` from the signup steps and REFACTORED `(signup)/nominees.tsx` + `(signup)/medical.tsx` to consume them (genuinely shared, not duplicated). Step-up OTP handling via `useStepUpGate` — keys on `error.code === 'auth.step_up_required'` (NOT all 403s; `ApiError.status===403 && code===...`) → `stepUpRequest` → OTP input → `stepUpVerify` → retry the SAME mutation.
  - [x] `posting.tsx` includes the **"Is this a retirement posting?"** toggle (default false) → `PostingUpdateRequest.isRetirement`. Calm register.
  - [x] Registered the `(life-events)` group in `app/_layout.tsx`; added a home-tab entry point (`components/life-events/LifeEventsEntry.tsx`, mounted below the renewal widget).
  - [x] `<SaveAndResumeAffordance>` (UX-DR50) on medical + nominee flows — persists in-progress form state via the app's **MMKV** local store (architecture §4.5 — the app's AsyncStorage-equivalent synchronous store; `draft-store.ts`); restore-on-return via a remount `key`. SMS/email deep-link resume **explicitly deferred** (out of scope v1-S/v1-M — recorded here, see Completion Notes). Calm register, no urgency theater.
  - [x] React Query hook `useLifeEventsSummaryQuery` (`['member','life-events']`) for the panel read.
  - [x] **Cache invalidation after mutations:** nominee → `['member','nominees']` + `['member','life-events']`; medical → `['member','medical']` + `['member','life-events']`; address/posting → `['member','life-events']` only. Mobile typecheck + lint clean (build/test are repo no-ops).
- [x] **Task 9 — Tests.** (all ACs)
  - [x] Domain unit (`packages/domain/tests/member/life-events-markers.test.ts`, 11 tests): address/posting payload schemas reject PII / accept markers; reducer leaves state unchanged on both new markers (NON-TRANSITION); vocabulary extended to 16.
  - [x] Domain integration (`packages/domain/tests/integration/member/life-events-tables.spec.ts`, 6 tests, :5433): append-only history preserved + getLatest newest; cross-tenant RLS invisibility (positive+negative); FK cascade (RTBF) for both tables.
  - [x] API integration (`apps/api/tests/integration/life-events/life-events.spec.ts`, 6 tests, :5433): address/posting persist + emit the right marker event + audit line; PII never in event payload / summary / audit / at-rest; nominee + medical routes 403 `auth.step_up_required` WITHOUT elevation and pass the gate WITH the matching-context elevation (cross-context elevation does NOT satisfy); GET summary; 401 without token.
  - [x] Regression: full api suite 280/280 green (signup nominee declare + medical submit paths unchanged — shared-form refactor preserved behavior).
  - [x] `pnpm ci:local` (DATABASE_URL on :5433) = **18/18 GREEN**. Fixed a PRE-EXISTING 3.8 defect surfaced by isolating renewal.spec on a fresh DB (the seed reused `goodUtr` colliding with the renewal confirm under migration 0029's `UNIQUE(pariwar_id, utr)` → 409; byte-identical at baseline, zero renewal files in the 3.9 changeset — see Completion Notes). One earlier cold-run `test (unit)` flake was confirmed innocent by a clean re-run (documented concurrent-load timeout, [[project_known_livedb_test_failures]]).

## Dev Notes

### What this story reuses vs builds new (anti-reinvention)

| Sub-type | Storage | Event | Handler | Step-up | Status |
|---|---|---|---|---|---|
| Nominee | `member_nominees` (latest-wins, exists) | `member.nominees_declared` (exists) | REUSE `nominee.declare` | `nominee_change` | **reuse-only** |
| Medical | `member_medical_disclosures` (append-only, exists) | `member.medical_disclosed` (exists) | REUSE medical submit | `medical_change` | **reuse-only** |
| Address | `member_addresses` (NEW, append-only, Tier-1) | `member.address_updated` (NEW) | NEW | none | **build** |
| Posting | `member_postings` (NEW, append-only) | `member.posting_updated` (NEW) | NEW | none | **build** |

The nominee `declare` handler (`apps/api/src/modules/nominee/nominee.handlers.ts:20`) and the nominee route (`nominee.routes.ts`) were BUILT in Story 3.4 to be re-runnable for exactly this story — the route comment literally says: *"Story 3.9 adds `requireMemberStepUp(deps, 'nominee_change')` on its Life Events UPDATE route, re-running the same declare handler."* Re-declaration already emits a new `member.nominees_declared` event (3.4 AC5). Do NOT duplicate the declare/submit logic — add a new gated ROUTE that calls the existing SERVICE.

### Step-up: member analogue (Story 3.2/1.9)

Member step-up is server-side (NOT the admin `@fastify/session` cookie path). Use `requireMemberStepUp(deps, actionContext)` from `apps/api/src/modules/auth/member/member-step-up.gate.ts` — elevation lives in `member_step_up_elevations` (server record), bound to a single `actionContext` for a ~5-min window (`config.ts:104`). A 403 step-up-required drives the client through `POST /api/v1/member/auth/step-up/request` → `/verify` → retry (the synthetic probe at `member-auth.routes.ts:135` proves the pattern end-to-end — model the new routes on it). Use DISTINCT action contexts `'nominee_change'` and `'medical_change'` so an elevation for one does not satisfy the other.

**Mobile: detect step-up 403 by error code, not HTTP status alone.** The gate serializes as `{ code: 'auth.step_up_required', … }` (see `apps/api/src/http-errors.ts:115`). Key on `error.code === 'auth.step_up_required'` — a plain HTTP 403 could also mean "forbidden" (wrong role, wrong pariwar) and must NOT route into the step-up flow.

### Event model: NON-TRANSITION markers (R1 + Story 3.1 invariants)

The member lifecycle events live in `packages/domain/src/member/events.ts` (NOT `@twt/events` — domain cannot import it; Story 3.1 turbo-cycle constraint, see [[project_member_lifecycle_domain_substrate]]). The current set is 14 types; this story extends to 16. Both new events are **NON-TRANSITION identity markers** (`from_state === to_state`) — exactly like `nominees_declared` / `medical_disclosed` (events.ts:33, :125, :143). They record the MOMENT on the stream with a NON-PII payload; they MUST NOT advance lifecycle state. `members.state` stays projector-only (DB trigger + CI gate — [[project_member_lifecycle_domain_substrate]]).

**R1 PII discipline (non-negotiable):** the `events_log` payload "MUST NEVER carry nominee names/mobiles/addresses" (events.ts:118). The `member.address_updated` payload is a marker only (`auditShape` + presence/version). Raw address bytes live Tier-1-encrypted in `member_addresses`. "Prior value preserved" (AC1) is satisfied by the **append-only history table**, NOT by stuffing the old value into the event payload. The Story 1.16b PII-shielding CI gate reads the `piiColumn(tier, fieldClass)` annotations — annotate the address column `piiColumn(1, 'member_address')`.

### Posting PII tier + transfer scope

- **Posting PII tier:** posting *district* is a geographic location, not sensitive identity data → plaintext, non-PII (safe in the column AND the `member.posting_updated` event payload). Contrast eHRMS ID, which architecture §2.7 tiers as Tier-2 (blind index) — but eHRMS ID is NOT changed by a transfer (it's the employee identity), so it is out of scope here. `is_retirement` is also non-PII — it is a boolean lifecycle marker, not a sensitive field.
- **`is_retirement` flag (Epic 4 dependency — non-negotiable):** Epic 4 Story 4.5 computes `retired_at` from "Life Events `posting.updated` **with retirement flag**". The `member_postings` table (`is_retirement boolean NOT NULL DEFAULT false`) + `PostingUpdatedPayloadSchema` (`is_retirement: z.boolean().optional()`) + `PostingUpdateRequest` contract + the mobile toggle MUST all be built in this story. Omitting and backfilling in Epic 4 requires adding a column to an append-only history table plus an event-vocabulary extension — avoid.
- **Transfer scope (IMPORTANT — read before building Task 3):** "Transfer-in/out updates posting district / Pariwar" is recorded as a **member attribute change + event ONLY** for v1-S. Do NOT mutate `members.pariwar_id` or move the member across tenants. The whole stack is per-Pariwar RLS-isolated (`pariwar_id` is the RLS predicate on every member table; [[project_member_lifecycle_domain_substrate]]); an actual cross-Pariwar migration is a distinct, much larger capability (data re-keying across RLS scopes + Pariwar-Passport §2.5 semantics) and is NOT in this story. Record the new district; carry an optional `pariwar_ref` field for forward-compat; flag any true tenant-move as deferred.

### Persistence pattern (mirror 3.4/3.5/3.8)

One scope-tx per write: persist the row + `projectMemberState(scopeTx.client, { … })` in the SAME transaction, then emit the audit line AFTER the status build succeeds (so a rollback doesn't leave a phantom audit — see `nominee.handlers.ts:158` comment). New PII tables: tenant-isolated (RLS), `piiColumn` annotations for the CI gate, GRANT SELECT+INSERT only for append-only history (mirror `member_medical_disclosures` rationale; immutable history). Migrations are hand-authored, snapshot-absent like 0021–0029, with matching `_journal.json` `when` entries — drizzle skips by journal `when`, not SQL hash ([[project_live_db_test_gotchas]]).

### Existing source map (files to read before editing)

- `apps/api/src/modules/nominee/{nominee.routes.ts,nominee.handlers.ts}` — the re-runnable declare service + the route this story extends. **Current behavior:** member-session-only at signup (no step-up — R3); latest-wins on `member_nominees`; emits `member.nominees_declared`. **Preserve:** the signup path stays step-up-FREE; only the new Life Events route adds the gate.
- `apps/api/src/modules/medical/{medical.routes.ts,medical.handlers.ts}` — append-only submit; emits `member.medical_disclosed`. Same preserve note.
- `apps/api/src/modules/auth/member/member-step-up.gate.ts` + `member-auth.routes.ts` (probe at :135) — the step-up gate + request/verify flow + the synthetic probe to model.
- `packages/domain/src/member/events.ts` — the 14-event registry + `auditShape` + the marker precedent. **Change:** add 2 event types + 2 payload schemas at both wiring points.
- `packages/domain/src/schema/{member_medical_disclosures.ts,member_nominees.ts}` — the append-only and latest-wins table templates.
- `packages/domain/src/member/{project.ts,state.ts,read.ts}` — projector + reducer; confirm the new markers pass through as NON-TRANSITION.
- `apps/mobile/app/(signup)/{nominees.tsx,medical.tsx}` + `app/(renewal)/` — form components to reuse + the screen-group pattern (`(renewal)` is the freshest precedent — see 3.8 review D1 resolution).
- `apps/api/src/modules/member-home/routes.ts` — the member-read route shape for the `GET /life-events` summary.

### Previous story intelligence (3.8 — renewal)

- **Scope-tx + idempotency:** 3.8's `renewConfirm` used a SAVEPOINT to catch `23505` and stay idempotent. For Life Events, each update is a fresh append (no dedup key needed on address/posting), but keep the single-scope-tx pattern (persist + project + audit ordering).
- **Contract discipline:** 3.8 added openapi paths for renewal; nominee/medical contracts deliberately AVOID `.openapi()` to keep `v1.yaml` path-stable and dodge the `encryption → node:async_hooks` barrel import. Match whichever the nominee/medical contracts already do (verify before authoring).
- **Mobile reachability (3.8 review D1 lesson):** do NOT build an API surface with no mobile path to reach it. The medical/nominee step-up flow MUST be wired end-to-end in the mobile screens (403 → request/verify → retry), or the AC is not met. This was the top finding of the 3.8 review — don't repeat it.
- **Mobile build/test are intentional no-ops:** verify mobile via `typecheck` + `lint` (per 3.8 Dev Agent Record).
- **ci:local merge gate:** GitHub Actions suspended; `pnpm ci:local` (DATABASE_URL on :5433) is the gate, mirrors all jobs ([[project_ci_actions_suspension_local_mirror]]). Integration suites need :5433.

### Testing standards

- Domain unit tests are DB-free where possible (payload-schema + reducer purity); the rest run against `twt-test-pg` Docker on :5433. Own-committing writers accumulate rows — assert membership, not counts ([[project_live_db_test_gotchas]]).
- API integration under `apps/api/tests/integration/life-events/`. Assert: event emitted (right type, NON-PII payload), audit line written, step-up enforced where required, PII never echoed.
- Clock injection: any time-based code accepts the injected `clock` (architecture §1.12 / 3.8 precedent) — no raw `Date.now()`.

### Project Structure Notes

- New API module: `apps/api/src/modules/life-events/` (mirror existing module layout: `index.ts`, `routes.ts`, `handlers.ts`).
- New contracts dir: `packages/contracts/src/life-events/`.
- New domain schema: `packages/domain/src/schema/member_addresses.ts`, `member_postings.ts` + RLS policies + `ids/index.ts` brands.
- New migrations: `0030_member-addresses.sql`, `0031_member-postings.sql` (latest applied is `0029` — confirm before numbering).
- New mobile group: `apps/mobile/app/(life-events)/`.
- No conflicts with the unified structure; follows the per-surface module + per-table schema + Expo-router-group conventions already established in Epic 3.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.9] — AC source; four sub-types; v1-S/v1-M markers; save-and-resume; dignified validation; step-up on nominee+medical.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3] — UX-DR anchors (UX-DR50 save-and-resume, UX-DR55 Pattern 4, UX-DR56 Pattern 5, UX-DR57 Pattern 6; accessibility gate inherited from Story 0.10 P0-2c).
- [Source: _bmad-output/planning-artifacts/architecture.md#2.7] — PII three-tier: address = Tier-1, eHRMS ID = Tier-2; PII-stripping field list includes `address`.
- [Source: packages/domain/src/member/events.ts:118-143] — R1 NON-PII event payload discipline + the `nominees_declared`/`medical_disclosed` marker precedent.
- [Source: apps/api/src/modules/nominee/nominee.routes.ts:6] — the Story-3.9 hook the 3.4 route was pre-built for.
- [Source: apps/api/src/modules/auth/member/member-step-up.gate.ts] — `requireMemberStepUp` member step-up gate.
- [Source: _bmad-output/implementation-artifacts/3-8-*.md#Dev Agent Record] — scope-tx/idempotency, contract-openapi posture, mobile-reachability lesson, ci:local gate.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow)

### Debug Log References

- `pnpm ci:local` (DATABASE_URL on :5433) — **18/18 GREEN** (final run). Fresh `twt-test-pg` Docker container per run (the container is ephemeral `--rm`; recreated to get the clean-baseline state ci:local assumes).
- Domain unit: `pnpm --filter @twt/domain test tests/member/life-events-markers.test.ts` — 11 green.
- Domain integration: `tests/integration/member/life-events-tables.spec.ts` — 6 green.
- API integration: `tests/integration/life-events/life-events.spec.ts` — 6 green; full api suite 280/280.
- Migrations 0030/0031 applied cleanly to a fresh DB; both tables have RLS enabled + FORCED + 2 tenant-isolation policies each (verified via `pg_policies` / `pg_class`).

### Completion Notes List

- **REUSE-vs-BUILD spine honored.** Nominee + medical Life Events updates REUSE the existing 3.4 `nominee.declare` / 3.5 `medical.submit` services unchanged, wired as NEW step-up-gated ROUTES (`nominee_change` / `medical_change`). Address + posting are the only BUILD work: two NEW append-only Tier-tables + two NEW NON-TRANSITION marker events (member vocabulary 14→16).
- **R1 PII discipline.** `member.address_updated` carries a presence marker only (`address_present: true`); address bytes live Tier-1-encrypted in `member_addresses`. "Prior value preserved" (AC1) is satisfied by the APPEND-ONLY history table, NOT the event payload. Tests assert PII never leaks into the event payload, the summary response, the audit context, or at-rest ciphertext.
- **Epic 4 forward-compat built now (non-negotiable).** `is_retirement` threads through the `member_postings` column (NOT NULL DEFAULT false), `PostingUpdatedPayloadSchema`, `PostingUpdateRequest`, and the mobile retirement toggle — so Epic 4 Story 4.5 reads `retired_at` without a later migration + event-schema extension.
- **Transfer scope (v1-S).** Posting/district change is recorded as a member attribute + event ONLY — NO cross-Pariwar tenant migration (`members.pariwar_id` untouched). `pariwar_ref` carried for forward-compat.
- **Mobile reachability (3.8 review D1 lesson).** The step-up flow is wired END-TO-END in mobile: `useStepUpGate` keys on `error.code === 'auth.step_up_required'` (NOT a bare 403) → `stepUpRequest` → OTP input → `stepUpVerify` → retry the SAME mutation. Shared `NomineeForm` / `MedicalForm` components were extracted from the signup steps and BOTH signup + Life Events now consume them (genuinely shared, not duplicated).
- **Save-and-resume storage deviation (intentional).** The story cited AsyncStorage (UX spec §12); the app standardized on **MMKV** (architecture §4.5 — the synchronous AsyncStorage-equivalent). Drafts persist via the existing `mmkvStorage` seam (`components/life-events/draft-store.ts`) rather than adding a dependency. **SMS/email deep-link resume is EXPLICITLY DEFERRED** — out of scope for v1-S/v1-M (recorded here, not silently omitted).
- **Pre-existing 3.8 defect fixed (out-of-story, flagged).** Isolating `renewal.spec.ts` on a fresh DB surfaced a deterministic failure: its member seed inserted a prior receipt with the shared `goodUtr`, then the renewal confirm reused `goodUtr` in the SAME Pariwar → migration 0029's `UNIQUE(pariwar_id, utr)` → 409. renewal.spec + all renewal runtime code + migration 0029 are BYTE-IDENTICAL to baseline `da83122`, and the 3.9 changeset touches ZERO renewal/receipt/vyawastha files — so this is independent of Story 3.9. Fixed the fixture to seed a per-seed-unique UTR (the seed UTR is never asserted); renewal.spec now 11/11. Precedent: commit `140b8b5` ("test: fix two pre-existing live-DB integration failures").
- **openapi/v1.yaml unchanged.** Life Events contracts follow the nominee/medical posture (no `.openapi()`); determinism + pii-scrape gates green.

### File List

**Domain (`packages/domain`)**
- M `src/member/events.ts` — +2 event types + payload schemas (16-event vocabulary)
- M `src/member/state.ts` — marker-list comment (reducer default already identity; no logic change)
- M `src/member/index.ts` — export address/posting accessors
- M `src/ids/index.ts` — `AddressId` + `PostingId` brands
- M `src/schema/index.ts` — barrel: member_addresses, member_postings
- M `src/policies/index.ts` — barrel: addresses/postings RLS
- A `src/schema/member_addresses.ts`, `src/schema/member_postings.ts`
- A `src/policies/member-addresses-rls.ts`, `src/policies/member-postings-rls.ts`
- A `src/member/address.ts`, `src/member/posting.ts`
- A `migrations/0030_member-addresses.sql`, `migrations/0031_member-postings.sql`; M `migrations/meta/_journal.json`
- A `tests/member/life-events-markers.test.ts`, `tests/integration/member/life-events-tables.spec.ts`

**Events (`packages/events`)**
- M `src/registry.ts` — +2 EVENT_TYPE_REGISTRY entries

**Contracts (`packages/contracts`)**
- M `src/index.ts` — barrel
- A `src/life-events/{address,posting,summary,index}.ts`

**API (`apps/api`)**
- M `src/context.ts` — `MEMBER_ADDRESS_FIELD_CLASS`
- M `src/audit/audit-sink.ts` — +2 action types
- M `src/server.ts` — register life-events module
- A `src/modules/life-events/{index,routes,handlers,address-crypto}.ts`
- A `tests/integration/life-events/life-events.spec.ts`
- M `tests/integration/vyawastha-shulk/renewal.spec.ts` — pre-existing-defect fixture fix (unique seed UTR)

**api-client (`packages/api-client`)**
- M `src/index.ts` — 5 lifeEvents* methods + LIFE_EVENTS_BASE

**i18n (`packages/i18n`)**
- M `locales/en/common.json`, `locales/hi/common.json` — 32 `lifeEvents.*` keys (parity)

**Mobile (`apps/mobile`)**
- M `app/_layout.tsx` — register `(life-events)` group
- M `app/(tabs)/index.tsx` — home-tab entry point
- M `app/(signup)/nominees.tsx`, `app/(signup)/medical.tsx` — consume shared forms
- A `app/(life-events)/{_layout,index,address,posting,nominees,medical}.tsx`
- A `components/life-events/{NomineeForm,MedicalForm,SaveAndResumeAffordance,LifeEventsEntry}.tsx`
- A `components/life-events/{useStepUpGate,useLifeEventsSummaryQuery,draft-store}.ts`

### Review Findings

#### Decision-Needed

- [x] [Review][Decision] D1 — Tier-1 address PII stored as plaintext JSON in MMKV draft store — **Resolved: exclude address from save-and-resume.** Remove `addressLine` from `draft-store.ts` and strip `<SaveAndResumeAffordance>` from `address.tsx`. Spec AC2 does not require save-and-resume for address. → converted to patch P0.
- [x] [Review][Decision] D2 — GET `/life-events` summary `is_retirement` reflects latest posting row, not retirement anchor — **Resolved: derive from first-ever retirement row.** Change summary query to `SELECT 1 FROM member_postings WHERE member_id=? AND is_retirement=true LIMIT 1`; returns permanent `true` once set. Consistent with Epic 4 Story 4.5 anchor semantics. → converted to patch P0b.
- [x] [Review][Decision] D3 — Posting screen has no save-and-resume, inconsistent with address screen — **Resolved: intentional omission.** Posting form is short (district + pariwar ref + retirement toggle); AC2 does not require save-and-resume for posting. Dismissed.

#### Patch

- [x] [Review][Patch] P0 — Remove `addressLine` from draft-store / strip `<SaveAndResumeAffordance>` from `address.tsx` (D1 resolution) [apps/mobile/app/(life-events)/address.tsx, draft-store.ts]
- [x] [Review][Patch] P0b — `getMemberPostingRetiredEver` (first-ever row, not latest) wired into `buildSummary` (D2 resolution) [handlers.ts, posting.ts]
- [x] [Review][Patch] P1 — MMKV draft keys namespaced by member ID; `clearAllMemberDrafts` called on `signOut` [draft-store.ts, session-context.tsx, nominees.tsx, medical.tsx]
- [x] [Review][Patch] P2 — `verifyAndRetry` clears OTP in `catch`; cancel button wired to `reset()` in both OTP footers [useStepUpGate.ts, nominees.tsx, medical.tsx]
- [x] [Review][Patch] P3 — `PostingUpdatedPayloadSchema.is_retirement` changed to `z.boolean()` [packages/domain/src/member/events.ts]
- [x] [Review][Patch] P4 — OTP `Input` fields given `maxLength={6}` [nominees.tsx, medical.tsx]
- [x] [Review][Patch] P5 — `assertMemberExistsAndNotTerminal` replaces `assertNotTerminal` with `memberExists` probe first [handlers.ts]
- [x] [Review][Patch] P6 — Handler comment corrected: `'medical_disclosure_update'` → `'medical_change'` [medical.handlers.ts:26]
- [x] [Review][Patch] P7 — Dead i18n keys `lifeEvents.address_done` / `lifeEvents.posting_done` removed from both locales; `lifeEvents.step_up_cancel` added [en/common.json, hi/common.json]
- [x] [Review][Patch] P8 — Reverse cross-context step-up assertion added to medical test (`nominee_change` elevation does NOT pass the medical gate) [life-events.spec.ts]

#### Deferred

- [x] [Review][Defer] Defer-1 — No rate limiting on append-only `/address` and `/posting` endpoints [apps/api/src/modules/life-events/routes.ts] — deferred, pre-existing architectural gap across all member routes
- [x] [Review][Defer] Defer-2 — No FK referential constraint on `pariwar_id` in `member_addresses` / `member_postings` [packages/domain/migrations/0030_member-addresses.sql, 0031_member-postings.sql] — deferred, pre-existing pattern; RLS enforces tenant isolation at query time
- [x] [Review][Defer] Defer-3 — RTBF integration test uses superuser path, not RLS-gated `twt_app` path — ON DELETE CASCADE may not fire under FORCE RLS [packages/domain/tests/integration/member/life-events-tables.spec.ts] — deferred, pre-existing gap shared with member_medical_disclosures and other PII tables

## Change Log

| Date       | Change                                                                 |
| ---------- | --------------------------------------------------------------------- |
| 2026-06-30 | Created Story 3.9 — context-engineered Life Events panel (nominee + medical reuse via gated routes; NEW address + posting append-only Tier-1 storage + 2 new NON-TRANSITION marker events; member step-up on nominee/medical; save-and-resume + dignified-validation UX; mobile (life-events) group). |
| 2026-06-30 | Validation pass — added: `is_retirement` flag to `PostingUpdatedPayloadSchema` + `member_postings` + contract + mobile toggle (Epic 4 FR-12 dependency); `LifeEventsSummaryResponse` contract shape; React Query cache-invalidation guidance; step-up error code `auth.step_up_required` for mobile; task execution-order constraint; AsyncStorage specified for save-and-resume (SMS/email deep-link deferred). |
| 2026-07-01 | Implemented Story 3.9 (all 9 tasks, all ACs). Domain: 2 NON-TRANSITION marker events (vocab 14→16) + 2 append-only Tier-tables (`member_addresses` Tier-1 / `member_postings` plaintext + `is_retirement`) + RLS + migrations 0030/0031 + accessors + `AddressId`/`PostingId` brands. Contracts: `life-events/` (address/posting requests + summary; no `.openapi()`). API: `life-events/` module — 5 routes (nominee/medical step-up-gated reuse of 3.4/3.5 services; NEW address/posting writes; GET summary) + audit-sink action types. api-client: 5 `lifeEvents*` methods. i18n: 32 `lifeEvents.*` keys (en/hi parity). Mobile: `(life-events)` group + shared `NomineeForm`/`MedicalForm` (signup refactored to consume) + `useStepUpGate` (403 `auth.step_up_required` → request/verify/retry) + MMKV save-and-resume + home entry. Tests: 11 domain unit + 6 domain integration + 6 API integration. `pnpm ci:local` 18/18 GREEN. Fixed a pre-existing 3.8 renewal.spec fixture defect (shared `goodUtr` vs migration 0029) surfaced by isolation — unrelated to 3.9. Status → review. |
