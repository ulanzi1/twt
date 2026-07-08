---
baseline_commit: ba629c0df1f219bd565f96f0a8deec03782b5f9c
---

# Story 6.2: Member App Claim Filing Flow (Ravi-mode: app on deceased's phone)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Ravi (a bereaved family member opening TWT on the deceased member's phone),
I want to file a claim through the Ravi-mode proxy flow — with handover-trust OTP to the nominee's phone, relationship confirmation, death-certificate upload, and a nominee-detail review — always one tap from live help,
so that I can initiate the support process from the deceased's existing device, at grief-pace, without needing a new account.

This is a `[SURFACE]` story and the **FIRST live caller of the Story 6.1 claim primitive** (`@twt/domain` `claim` namespace). Story 6.1 declared the claim states, the 20 `claim.*` events, the pure reducer, and the `projectClaimState` projector as *legal + replay-safe only* — it built **no UI, no HTTP route, no intake flow**. Story 6.2 wires the member-app intake path end-to-end: mobile UI → `apps/api` claim-intake route → `projectClaimState('claim.intake_initiated')`, which (via the already-merged Story 3.1 overlay) **freezes the deceased member's account**. Story 6.3 (helpline) is the twin caller; both converge at ICP (Story 6.4).

## Acceptance Criteria

> Source: `epics.md` §Epic 6, Story 6.2 (lines 2304–2322). BDD wording preserved except documented deviations (see AC3's "v1 null-claimant policy" vs the epic's literal `claimant_actor_id: ravi`, resolved in Dev Notes → "Decisions"); scope-boundary refinements are in Dev Notes → "Scope boundary".

**AC1 — Ravi-mode proxy shell activates on the deceased's authenticated session**
**Given** FR-37 + UX-DR31 `<ClaimProxyFlowShell>` + UX-DR33 `<ClaimDocumentUpload>` + UX-DR55 Pattern 4 dignified-validation (validated against Story 0.9)
**When** Ravi opens the app on the deceased's phone (a valid member session already in secure-store)
**Then** the app offers a proxy-flow entry with empathy copy: "Are you family of [member name]? We can guide you through filing a claim. We need to verify it's you." — with a "No — continue as [member]" escape that returns to the normal member experience.
**And** on "Yes, I am family", `<ClaimProxyFlowShell>` mounts with the "Filing on behalf of [Name]" banner, a **`<SaveAndResumeAffordance>` always present**, and a **`<CallHelplineCTA>` always one tap away**.

**AC2 — Handover-trust OTP establishes trust via the nominee's phone**
**Given** UX-DR32 `<HandoverTrustOTP>`
**When** Ravi proceeds through the proxy flow
**Then** a handover-trust OTP fires to the **nominee's** declared mobile (from Story 3.4 `member_nominees`, Tier-1 decrypt — NOT the deceased's phone); the UI explains "OTP sent to nominee phone [masked]" and distinguishes it from a device-possession OTP.
**And** Ravi enters the OTP from his own phone to establish handover-trust; wrong/expired codes get a dignified, generic message (Pattern 4); a resend affordance with cooldown is present.

**AC3 — Relationship confirmation emits the intake event (and freezes the account)**
**Given** the claim primitive (Story 6.1 `claim.intake_initiated`) + the Story 3.1 account-frozen overlay seam
**When** Ravi confirms his relationship to the deceased (after handover-trust is established)
**Then** the flow mints a fresh `claim_case_id` (UUID, server-side) and appends `claim.intake_initiated` via `projectClaimState` with `intake_channel: member_app`, the `deceased_member_id`, and `claimant_actor_id` using the v1 null-claimant policy defined in Dev Notes — projecting the claim to `intake_pending`.
**And** because the payload carries `deceased_member_id` (snake_case), the merged `member/overlay.ts` account-frozen overlay begins matching — the deceased's account enters memorial/frozen state (no marketing surfaces, no countdowns — UX §7 grief register).
**And** once `claim.intake_initiated` is emitted the freeze is **irreversible by the mobile client** — backing out of the wizard, closing the app, or clearing the local draft does NOT unfreeze the account; only the claim lifecycle itself (denial/settlement via later stories, which emit `claim.settled` / `claim.denied_no_appeal` carrying `deceased_member_id`) clears the overlay.
**And** the intake route is **idempotent**: a double-tap or network retry MUST return the existing intake for this death, never create a second `claim_case_id` (see Dev Notes "Idempotency").

**AC4 — Death-certificate upload + nominee-detail review (seam-consumed)**
**Given** `<ClaimDocumentUpload>` (Story 6.5 consumer) + `<NomineeDetailEditor>` (Story 6.8 consumer)
**When** Ravi continues after intake
**Then** Ravi uploads the death certificate via the `<ClaimDocumentUpload>` seam (6.2 provides the upload affordance + save-and-resume/defer-7-days state; the OCR parity background job is **Story 6.5**, not 6.2).
**And** Ravi reviews **pre-populated read-only nominee details** via the `<NomineeDetailEditor>` seam (6.2 renders the read-only pre-populated view; the Trustee-Panel-gated *edit* + claim-time dual-bank collection is **Story 6.8**). Pattern-4 dignified-validation copy is applied throughout.

**AC5 — Staff-fallback at every node (AR-61, cross-cutting)**
**Given** AR-61 staff-fallback (cross-cutting AC across all claim-flow stories) + Story 0.7 fallback-handler ledger
**When** Ravi gets stuck at any step
**Then** a "Call us — we'll help" CTA is always one tap away; the helpline-mediated path (Story 6.3) can complete on Ravi's behalf; the two intakes converge at ICP (Story 6.4). The ledger is **referenced, not re-implemented** per the epic's cross-cutting note (line 2280).

**AC6 — Grief-paced, save-and-resume, bilingual, tenant-safe**
**Given** UX friction-budget (grief-paced) + i18n bilingual contract (Story 2.1) + multi-tenant RLS
**When** any Ravi-mode screen renders or any claim-intake endpoint is called
**Then** save-and-resume is available at every data-entry node (no time-out modals, no countdowns); all member-facing copy is bilingual (en/hi parity gate) with internal component names tenant-agnostic (`<ClaimProxyFlowShell>`, NOT "Ravi-mode", per UX §component-naming line 1751-1754); every write runs inside a scope tx with `app.pariwar_id` set; `claims.current_state` is written **only** by the projector.

## Tasks / Subtasks

- [x] **Task 1 — `@twt/contracts/claims` transport contracts (AC3/AC4/AC6)**
  - [x] Author `packages/contracts/src/claims/filing.ts`: `ClaimIntakeInitiateRequest` (relationship enum, optional client-draft echo), `ClaimIntakeInitiateResponse` (`claimCaseId`, `state`), `HandoverOtpRequest`/`HandoverOtpVerifyRequest`/`…Response`. Every `z.object` ends with `.strict()` (README discipline; `_common/strict.ts`).
  - [x] Do **not** shadow domain types — the `claim.*` event payloads live in `@twt/domain` (events.ts); contracts describe only the REST wire shape (README anti-pattern #2).
  - [x] Register in `packages/contracts/src/claims/index.ts` + the top `src/index.ts` barrel (mirror `nominee/index.ts`).
- [x] **Task 2 — `apps/api` claim-intake module (AC3/AC5/AC6)**
  - [x] Create `apps/api/src/modules/claims/` : `claims.routes.ts`, `claims.handlers.ts`, `claims.service.ts`, `index.ts` (mirror `modules/nominee/`).
  - [x] Route: member-session-gated `POST /api/v1/member/claims/intake` (see Dev Notes "Route path decision"). `preHandler: [requireMemberSession(deps)]`.
  - [x] Handler: `openScopeTx` → mint `claimCaseId = ids.claimId(randomUUID())` → call `claim.projectClaimState(scopeTx.client, { claimCaseId, pariwarId, deceasedMemberId, intakeChannels: ['member_app'], claimantActorId, eventType: 'claim.intake_initiated', payload: {…deceased_member_id, intake_channel:'member_app', claimant_actor_id, from_state:null, to_state:'intake_pending', trigger:'member_app_ravi_intake', actor:'member'}, actorId, auditId })` → `emitAuthAudit` after success → `closeScopeTx(scopeTx, ok)`.
  - [x] Register the module in the API app bootstrap (find where `registerNomineeRoutes` is wired and add `registerClaimsRoutes`).
  - [x] **Guard: the deceased must be a real member in this Pariwar** — resolve `deceasedMemberId` from the authenticated session's member (Ravi is on the deceased's session → the session member *is* the deceased), or from a validated lookup; reject cross-tenant ids (defense-in-depth on top of RLS).
  - [x] **Idempotent intake (MUST):** before minting a new `claim_case_id`, look up any existing non-terminal claim for this `deceasedMemberId` in this Pariwar (`claims_deceased_member_id_idx`); if one exists, **return it** (200 with the existing `claimCaseId` + `state`) instead of appending a second `claim.intake_initiated`. A double-tap or network retry MUST NOT create a second claim or double-freeze. See Dev Notes "Idempotency" for the two-layer approach.
- [x] **Task 3 — Handover-trust OTP send/verify against the nominee mobile (AC2)**
  - [x] Service path: load the deceased's nominees via `nominee.getMemberNominees(tx, pariwarId, deceasedMemberId)`; Tier-1-decrypt the primary nominee `mobileCiphertext` (mirror `nominee-crypto.ts` decrypt); send OTP via the SMS-DLT step-up delivery adapter (`shared/step-up-delivery.ts` / `sms-step-up-delivery.ts`) — a NEW `handover` intent or a bespoke handover-OTP service reusing `generateOtp`/`hashOtp`/`OTP_MAX_ATTEMPTS` from `shared/otp.ts`. Persist only the hash; deliver only via the seam.
  - [x] Verify path: attempt-capped, rate-limited (reuse the `otp-rate-limit.ts` pattern); on success set a short-lived "handover-trust established" marker that AC3's intake route requires.
  - [x] Never log/audit/persist the plaintext OTP (§2.2); mask the nominee mobile in all copy/audit. **Do** emit an audit line per send + per verify-attempt + per consume, tagged with the operation identifier (architecture §2.2 lines 1359-1361, 1376-1380 — the same discipline `emitAuthAudit` gives the intake handler in Task 2).
- [x] **Task 4 — `@twt/api-client` claim client (AC2/AC3)**
  - [x] Add `createMemberClaimClient({ baseUrl, getAccessToken })` (or extend the member client) with `requestHandoverOtp`, `verifyHandoverOtp`, `initiateIntake`. Response-validate against the `@twt/contracts/claims` Zod schemas (single source of transport types — no shadow types). Mirror the `memberAuth` ApiError/apiFetch bearer convention.
  - [x] Wire an instance in `apps/mobile/lib/` (mirror `lib/member-api.ts`).
- [x] **Task 5 — Mobile Ravi-mode entry + `<ClaimProxyFlowShell>` (AC1/AC5/AC6)**
  - [x] New Expo Router group `apps/mobile/app/(claim)/` with `_layout.tsx` (grief-paced: no time-out modals; progress derived from a `claim-steps.ts` order list in `lib/`, mirroring `lib/wizard-steps.ts`).
  - [x] Home-screen proxy-flow entry: on a valid session, surface "Are you family of [member name]?" with a "No — continue as [member]" escape (component under `components/claim/` or an `(claim)/index.tsx` gate).
  - [x] `components/claim/ClaimProxyFlowShell.tsx`: "Filing on behalf of [Name]" banner + always-present `<SaveAndResumeAffordance>` + `<CallHelplineCTA>`. Internal name is tenant-agnostic; UX label "Ravi Mode Shell" lives only in copy.
- [x] **Task 6 — Screens: handover-OTP, relationship-confirm, doc-upload seam, nominee-review seam (AC2/AC3/AC4)**
  - [x] `(claim)/handover-otp.tsx` — `<HandoverTrustOTP>` (masked-nominee-phone explanation, resend cooldown, dignified errors; mirror `(auth)/otp.tsx`).
  - [x] `(claim)/relationship.tsx` — relationship confirm → calls `initiateIntake` → on success advances; this is the node that emits `claim.intake_initiated`.
  - [x] `(claim)/document.tsx` — `<ClaimDocumentUpload>` affordance (camera + PDF pick + progress + deferred/save-7-days state). **The real OCR parity + storage backend is Story 6.5** — 6.2 provides the upload UI seam + local draft persistence; flag the storage seam clearly.
  - [x] `(claim)/nominee-review.tsx` — `<NomineeDetailEditor>` in **read-only pre-populated** mode (name/phone/UPI-last-4/Aadhaar-last-4 presence). **The gated edit + dual-bank collection is Story 6.8** — 6.2 renders read-only + a "details look wrong? Call us" path.
  - [x] `(claim)/acknowledgement.tsx` — dignified acknowledgement ("Verification 2–3 weeks; a field worker will visit") per UX Journey 2 `Ack`.
- [x] **Task 7 — Save-and-resume draft persistence (AC6)**
  - [x] Persist in-progress claim-draft state to **MMKV** (`lib/mmkv` `mmkvStorage` — the app's AsyncStorage-equivalent; do NOT add AsyncStorage) keyed per deceased member; restore on re-entry; clear on submit. No time pressure, no countdowns.
- [x] **Task 8 — i18n bilingual copy + Pattern 4 dignified validation (AC1/AC2/AC4/AC6)**
  - [x] Add a `claim` i18n domain: `packages/i18n/locales/{en,hi}/claim.json` + register the two imports + two registry lines + `KNOWN_NAMESPACES` in `catalog.ts` (per its "ADDING A DOMAIN" note). All keys must pass `scripts/check-parity.ts` (Hindi parity). Use `useT()` in every screen (no inline strings).
  - [x] All validation/error copy follows Pattern 4 dignified-validation (never "your input is invalid"; route failures to help).
- [x] **Task 9 — Tests + CI gates (all ACs)**
  - [x] Domain/API integration: intake route appends exactly one `claim.intake_initiated`, projects `intake_pending`, and the deceased account-frozen overlay now matches (assert via the overlay read). Live-DB on `:5433` (see live-DB gotchas).
  - [x] Handover-OTP service unit tests (send masks mobile; verify is attempt-capped; plaintext never persisted).
  - [x] Mobile component/flow tests (proxy-shell mounts, CallHelplineCTA present at every node, save-and-resume restores draft).
  - [x] Green-with-teeth on: `claim-state-invariant` (no `current_state` write outside the projector), `friction-budget` (member surface page-weight), `pii-scrape` (no nominee PII in payload/audit/logs), `schema-diff` (any migration). Run `pnpm ci:local` as the merge gate.

### Review Findings

- [x] [Review][Patch] Handover-OTP `/verify` has no independent rate limit; resend resets the attempt counter, allowing ~25 guesses/15min. Fixed 2026-07-08: added `memberClaimHandoverVerifyThrottle` — a dedicated `/verify` throttle independent of the `/handover-otp` send bucket (`otp-rate-limit.ts`), so verification retries don't consume SMS quota; caps total verify calls per member per window instead. New test: "handover-otp/verify has its OWN throttle, independent of the send budget" [`apps/api/src/modules/claims/claims.routes.ts`, `apps/api/src/modules/auth/member/otp-rate-limit.ts`]
- [x] [Review][Defer] `<NomineeDetailEditor>` read-only view (`apps/mobile/app/(claim)/nominee-review.tsx:38`) shows only relationship/splitPct/mobilePresent — Task 6 explicitly lists name/phone/UPI-last-4/Aadhaar-last-4 presence, and `claim.json` (en/hi) has unused `nominee.name`/`nominee.upi`/`nominee.aadhaar` keys scaffolded for this — deferred, formally moved to Story 6.8's scope (dual-bank/nominee-bank collection). The wire contract (`nomineesStatus`) doesn't carry name/UPI/Aadhaar fields today; 6.8 owns extending it. Not a 6.2 gap going forward.
- [x] [Review][Patch] Idempotent-intake dedup ignores terminal claim state, contradicting the explicit Task 2/AC3 "non-terminal" MUST requirement — a re-file after `settled`/`denied_no_appeal` silently returns the stale terminal claim instead of minting a new one. Fixed 2026-07-08: `getClaimByDeceasedMember` now filters `notInArray(claims.currentState, CLAIM_TERMINAL_STATES)` (`settled`/`denied`). New domain test covers denied-only, settled-only, non-terminal-found, and mixed-terminal-plus-live cases [`packages/domain/src/claim/read.ts`, `packages/domain/tests/integration/claim/claim-lifecycle.spec.ts`]
- [x] [Review][Patch] Save-and-resume is write-only — `loadClaimDraft` is exported and unit-tested but never called by any `(claim)` screen; re-entry always restarts the wizard from scratch instead of resuming, contradicting AC6 and the shell's own draft-resume comment. Fixed 2026-07-08: added `nextClaimStep` (claim-steps.ts) + entry-gate resume routing (`(claim)/index.tsx`), and `document.tsx`/`relationship.tsx` now hydrate local state from the draft on mount; `nominee-review.tsx` now stamps `lastStep` too [`apps/mobile/lib/claim-steps.ts`, `apps/mobile/app/(claim)/{index,document,relationship,nominee-review}.tsx`]
- [x] [Review][Patch] Handover-OTP send has a timing side-channel (no-nominee vs undeliverable vs delivered take measurably different latencies) that leaks nominee existence, undermining the stated "never reveals whether a nominee exists" invariant. Fixed 2026-07-08: added a P6-style timing-equalization delay (mirrors `member-auth.handlers.ts`'s withdrawn-member guard) on both early-return branches [`apps/api/src/modules/claims/claims.service.ts` (`sendHandoverOtp`, `timingEqualizeDelay`)]
- [x] [Review][Patch] Concurrency safety (advisory lock + dedup) is asserted but never exercised by an actual concurrent test — only sequential double-tap is tested. Fixed 2026-07-08: added a `Promise.all`-based concurrent-intake test asserting exactly one claim/freeze [`apps/api/tests/integration/claims/claims-intake.spec.ts`]
- [x] [Review][Patch] Failed intake attempts (any error other than `ClaimStreamConcurrencyError`) produce no audit line — silent failure on an account-freezing operation. Fixed 2026-07-08: added `member_claim.intake_failed` audit type + a catch block emitting it before rethrowing [`apps/api/src/audit/audit-sink.ts`, `apps/api/src/modules/claims/claims.handlers.ts`]
- [x] [Review][Patch] `handover_otp_failure` audit lines carry no OTP correlation tag, weakening the anti-brute-force audit trail Task 3 requires. Fixed 2026-07-08: `verifyOtp`'s `{ok:false}` result now carries the attempted-against OTP's hash on a wrong-code failure; `verifyHandoverOtp` propagates it through to the audit tag [`apps/api/src/modules/auth/member/member-otp.service.ts`, `apps/api/src/modules/claims/claims.service.ts`]
- [x] [Review][Patch] Advisory-lock key comment says "63 bits" but the code takes 15 hex chars (60 bits) — comment/implementation mismatch in security-adjacent code. Fixed 2026-07-08: comment corrected to match the actual 60-bit truncation [`apps/api/src/modules/claims/claims.service.ts` (`intakeAdvisoryLockKey`)]
- [x] [Review][Patch] `(claim)/index.tsx` "Yes, I am family" button has no `disabled={!session}` guard (unlike the "No" button); a stale/expired session falls through to a 401 mismapped as "wrong OTP code". Fixed 2026-07-08: added `disabled={!session}` [`apps/mobile/app/(claim)/index.tsx`]
- [x] [Review][Patch] Handover-OTP send-throttle bucket key (`stepup:<memberId>`) collides with the unrelated generic `/member/auth/step-up/request` route, causing cross-feature 429 budget bleed. Fixed 2026-07-08: added `memberClaimHandoverSendThrottle` with its own `claim-handover:` namespace, replacing the shared `memberStepUpSendThrottle` on the claims routes [`apps/api/src/modules/auth/member/otp-rate-limit.ts`, `apps/api/src/modules/claims/claims.routes.ts`]
- [x] [Review][Patch] `nominee-review.tsx` treats any fetch failure (network/401/500) identically to a genuine empty-nominee result, routing a grieving user to "call the helpline" instead of a retry/error path. Fixed 2026-07-08: added a distinct `'error'` load state + `nominee.load_error` copy (en/hi) [`apps/mobile/app/(claim)/nominee-review.tsx`, `packages/i18n/locales/{en,hi}/claim.json`]
- [x] [Review][Patch] Home-screen "Call us" copy in `<ClaimProxyFlowEntry>` is inert static text, not wrapped in a tappable Button/Linking call like the real `<CallHelplineCTA>`. Fixed 2026-07-08: replaced the inert `<Paragraph>` with `<CallHelplineCTA />` [`apps/mobile/components/claim/ClaimProxyFlowEntry.tsx`]
- [x] [Review][Patch] Duplicated "call helpline" implementations in `nominee-review.tsx` — both `<CallHelplineCTA>` and a hand-rolled `Linking.openURL` with a re-declared `HELPLINE_TEL` constant. Fixed 2026-07-08: `CallHelplineCTA` gained an optional `label` prop; both call-sites now share the one component [`apps/mobile/components/claim/CallHelplineCTA.tsx`, `apps/mobile/app/(claim)/nominee-review.tsx`]
- [x] [Review][Patch] Import-statement ordering violation in `nominee-review.tsx` — a `const` declaration sits between two import blocks, likely to fail lint. Fixed 2026-07-08: the `HELPLINE_TEL`/`Linking` hand-roll was removed entirely (see the CallHelplineCTA dedup fix above), resolving the ordering violation as a side effect [`apps/mobile/app/(claim)/nominee-review.tsx`]
- [x] [Review][Patch] `createMemberClaimClient` wastefully instantiates the entire `createMemberAuthClient` surface just to cherry-pick 3 methods. Fixed 2026-07-08: extracted the shared fetch/error-envelope machinery into `createApiCallers`; `createMemberClaimClient` is now a standalone factory, not a wrapper over the full auth client [`packages/api-client/src/index.ts`]
- [x] [Review][Patch] `ClaimIntakeInitiateRequest.clientDraftId` is a dead field — defined for "observability" but never populated by any caller. Fixed 2026-07-08: removed (nothing produced it; re-add when a real draft-id concept exists) [`packages/contracts/src/claims/filing.ts`, `packages/contracts/tests/claims-filing.test.ts`]
- [x] [Review][Patch] Second intake call with a *different* `relationship` value than the first is silently discarded with no audit trail of the mismatch. Fixed 2026-07-08: the idempotent-hit audit line now logs `relationship_submitted` + a `note` instead of `relationship`, so it never reads as "relationship updated" [`apps/api/src/modules/claims/claims.handlers.ts`]

## Dev Notes

### Scope boundary — what 6.2 builds vs what it seams to later stories

6.2 is a SURFACE story that references components **owned by not-yet-built stories** (6.3 helpline deep-link handover, 6.4 ICP, 6.5 OCR/doc, 6.8 nominee-bank, 6.9 claim-time consent). Follow the established precedent (Story 3.6a shipped a `payment` **placeholder** that 3.6b replaced) — build the load-bearing seam now, placeholder the rest, and flag each seam loudly.

| Concern | 6.2 builds | Deferred to |
|---|---|---|
| Ravi-mode proxy shell + entry + banner + save/resume + helpline CTA | ✅ full | — |
| Handover-trust OTP (nominee mobile) send/verify | ✅ full | — |
| Mint `claim_case_id` + emit `claim.intake_initiated` (→ freeze) | ✅ full (first live caller) | — |
| Death-cert **upload UI** + defer-7-days state | ✅ UI seam only | **6.5** owns OCR parity + storage backend |
| Nominee detail **read-only pre-populated view** | ✅ read-only | **6.8** owns gated edit + dual-bank collection |
| ICP dedup / cross-channel convergence | ❌ | **6.4** (`claim.intake_converged`) |
| Advancing past `intake_pending` | ❌ (6.2 stops at `intake_pending`) | 6.4/6.5/6.6/6.10… |
| Deep-link entry from helpline handover (epic AC epics.md:2337 — operator "converts to a member-app handover" for family to complete via 6.2) | ❌ not built — Task 5's organic home-screen entry is the only entry surface | **6.3** must define the deep-link contract (e.g. a signed/expiring token resolving to a pending case); flagged now so 6.3 doesn't assume an entry seam that isn't here |
| Claim-time DPDPA consent (3 checkboxes) | ❌ not built | **6.9** — reserve a step slot in `claim-steps.ts`'s ordered list now so inserting it later doesn't reshuffle typed-route literals |

**Load-bearing deliverable:** the intake event. Everything else can be a placeholder; `claim.intake_initiated` (with `deceased_member_id`) is what freezes the account and creates the canonical case. Get that exactly right. The deep-link (6.3) and consent (6.9) rows above are genuine gaps, not oversights — they're flagged here, not silently deferred, so those stories' planning accounts for them.

### The Story 6.1 claim primitive — consume it EXACTLY (do not re-derive)

The primitive lives in **`@twt/domain`** (there is **no** `packages/claim-lifecycle` — the epic's package name was superseded; 6.1 landed it in `packages/domain/src/claim/`, the twin of `member/`). Import via the `claim` namespace: `import { claim, ids, nominee } from '@twt/domain'`.

- **Projector:** `claim.projectClaimState(client: pg.PoolClient, input): Promise<{eventId, eventVersion, state, auditId}>` — `packages/domain/src/claim/project.ts`. It is the **single legitimate writer** of `claims.current_state`. It takes a **raw `pg.PoolClient`** (NOT a Drizzle `Db`) because it issues `SET LOCAL app.claim_state_writer='on'`. It does **not** open/commit its own tx — the caller opens `BEGIN` + `setPariwarScope` first (use `openScopeTx`). [Source: `packages/domain/src/claim/project.ts:29-36,89-99,143`]
- **Intake payload (the pinned seam):** `ClaimIntakeInitiatedPayloadSchema` requires `{ from_state, to_state, trigger, actor }` (audit shape) **plus** `deceased_member_id: uuid`, `intake_channel: 'member_app'|'helpline'|'trustee_initiated'`, `claimant_actor_id: uuid|null`. `.strict()` — an unknown key throws. [Source: `packages/domain/src/claim/events.ts:90-97`]
- **Event name is single-dot snake_case:** `claim.intake_initiated` (NOT the epic's double-dot `claim.intake.initiated`). The merged `member/overlay.ts` HARD-CODES this exact string + the `deceased_member_id` payload key. Use the constant from `claim.CLAIM_EVENT_TYPES`; never hand-type the string. [Source: `events.ts:16-25,246-267`]
- **First event → `intake_pending`.** The reducer's `claim.intake_initiated` case is identity-from-initial: the machine starts at `intake_pending`, and the projector's first-event INSERT writes the `claims` row. `from_state` is `null` on this event (nullable in the audit shape). [Source: `state.ts:96-97,196-204`; `claims.ts:57`]
- **`claim_case_id` is caller-supplied (no DB default).** Mint the UUID server-side in the intake route; it IS the `events_log.stream_id`. A client-supplied id is a collision/fraud risk — mint it in the API, not the mobile client. Brand with `ids.claimId(...)`. [Source: `claims.ts:26-35,111-118`; `ids/index.ts:88,105`]
### Idempotency (a hard AC3 requirement, not a nice-to-have)

Filing a claim **freezes an account**, so a duplicate is not a cosmetic bug — a double-tap or network retry that mints a *second* `claim_case_id` for the same death creates two frozen-account events and two canonical cases that 6.4's ICP would then have to reconcile. 6.2 MUST prevent the trivial duplicate at the source. Two layers, both required:

1. **Route-level dedup (primary):** before minting, query for an existing non-terminal claim for `(pariwarId, deceasedMemberId)` via `claims_deceased_member_id_idx`. If found, **return the existing** `{ claimCaseId, state }` (HTTP 200) — do NOT append another `claim.intake_initiated`. This is what makes retries safe and observable.
2. **Append-level backstop:** the projector accepts an optional `eventId` for idempotent re-append (AR-58) and throws `ClaimStreamConcurrencyError` on a `(stream_id, event_version)` race. Pass a deterministic dedup key so a concurrent double-submit that slips past layer 1 collides at the unique index instead of double-appending; map the concurrency error to "return the existing intake", not a 500.

Scope note: *full* cross-channel dedup (member-app + helpline for one death) is **6.4's ICP** job. 6.2 owns only the single-channel trivial-duplicate guard — but it owns it firmly (the MUST above), because the freeze is irreversible by the client.

### The account-freeze seam — the single most load-bearing behavior (do NOT break it)

The already-merged Story 3.1 `member/overlay.ts` account-frozen overlay matches **all** claim events for the deceased subject by `payload ->> 'deceased_member_id'` (overlay.ts:97). Memory [[project_claim_overlay_unfreeze_seam]] + the 6.1 events header both pin this. Therefore:
- `claim.intake_initiated` **MUST** carry `deceased_member_id` (snake_case) or the freeze never fires. This is AC3's core.
- Do not rename/reshape the key. Do not emit a double-dot event name.
- Verify in an integration test that after intake, the deceased member reads as account-frozen (drive the overlay, per `/verify` discipline — not just a unit assert).

### Ravi-mode session model (already designed into the app)

`apps/mobile/lib/session.ts:1-15` documents it: "Phone+OTP+device is transferable by design (Ravi-mode, UX line 263) — we add NO identity binding beyond these three." So **the deceased's authenticated session already exists in secure-store** — Ravi opens the app and there IS a valid member session. The **device-possession OTP (UX Journey 2 "OTP1")** is therefore already satisfied by that existing session; 6.2's new OTP work is **only** the **handover-trust OTP ("OTP2") to the nominee's phone**. This matches the epic AC (which names only the handover-trust OTP). If the session has expired, the member re-logs-in via the existing `(auth)` flow first — out of scope for 6.2.

### Handover-trust OTP → nominee mobile (Story 3.4 data)

- Nominee mobiles live Tier-1-encrypted in `member_nominees.mobileCiphertext` (`piiColumn(1,'member_nominee')`). Read via `nominee.getMemberNominees(tx, pariwarId, memberId)`; decrypt with the `nominee-crypto.ts` pattern (`deps.encryption`). [Source: `packages/domain/src/schema/member_nominees.ts:67-68`; `apps/api/src/modules/nominee/nominee-crypto.ts`]
- Delivery: reuse the SMS-DLT step-up delivery seam (`apps/api/src/modules/auth/shared/step-up-delivery.ts` + `sms-step-up-delivery.ts`) and the shared OTP primitives (`shared/otp.ts`: `generateOtp`, `hashOtp`, `OTP_MAX_ATTEMPTS`, `timingSafeHashCompare`). The existing intents are `login | step_up`; **add a `handover` intent** (or a small bespoke service) — it decrypts the *nominee's* mobile (not the member's). Persist only the hash; mask the mobile everywhere.
- Rate-limit + attempt-cap: mirror `member/otp-rate-limit.ts`. A verified handover OTP is the precondition AC3's intake route checks before appending `claim.intake_initiated` (establish handover-trust *before* freezing the account — see the ordering note).

### Step-up OTP requirement (architecture §2.2) — satisfied by the handover-trust OTP, not re-derived

Architecture §2.2 (~lines 1346-1358) lists **claim filing** among the operations that require a fresh, transactional, DLT SMS-OTP "regardless of session state." The Ravi-mode existing-session model above does **not** waive this — it only means the *device-possession* leg (OTP1) is already satisfied by the live secure-store session; it is not the operation-specific step-up leg §2.2 requires. **The handover-trust OTP is that step-up leg**: it is the fresh, DLT-transactional SMS-OTP fired specifically for this claim-filing action, satisfying §2.2. It targets the **nominee's** phone rather than the session's phone because in Ravi-mode the acting human (Ravi) has no phone number on file against the deceased's member record — the nominee's declared mobile is the correct step-up target for this action. Do **not** add a second step-up OTP to the deceased's own number; one fresh transactional OTP (the handover-trust OTP) satisfies §2.2.

### AC / UX ordering variance (surface, follow the epic AC)

The **epic AC order** is: proxy shell → **handover OTP** → relationship-confirm (**emit intake**) → doc upload → nominee review. The **UX Journey 2 diagram** (ux-spec:1435-1461) orders it differently and more starkly than a simple screen reshuffle: `RelConfirm → DeathCert → NomineeView → OTP2 → Submit` — relationship-confirmation sits *before* the handover-trust OTP in the raw diagram, with OTP2 pushed to just before submit. Read literally, the diagram flow would confirm the relationship (and, per this story's design, mint the claim + freeze the account) with **no handover-trust verification at all** up to that point. **Follow the epic AC, not the diagram**: establishing handover-trust *before* emitting the intake is not a stylistic preference — it is the safety-load-bearing ordering, since an unverified handover must not freeze a member's account. Record the variance in the Dev Agent Record. (The BDD ACs are the authoritative contract; the journey diagram is illustrative.)

### Mobile surface conventions (match the existing app)

- **Expo Router** file-based groups (`app/(auth)`, `(signup)`, `(life-events)`, …) + **Tamagui** primitives (`YStack`, `Button`, `Input`, `H2`, `Paragraph`, `Spinner`). Typed routes: expo-router `typedRoutes` rejects computed `Href` strings — put the next-step route **literals in the screens**, and keep the ordered step list + progress math in `lib/claim-steps.ts` (mirror `lib/wizard-steps.ts:1-17`). [Source: `apps/mobile/app/(auth)/otp.tsx`, `lib/wizard-steps.ts`]
- **Draft persistence = MMKV**, not AsyncStorage (memory [[project_mmkv_asyncstorage_equivalent]]; UX §12 says "AsyncStorage" but the app standardized on MMKV — note the substitution in the Dev Agent Record). Tokens stay in secure-store (`lib/session.ts`); drafts (non-sensitive) go to `lib/mmkv`.
- **Bereaved register (UX §7):** black-bordered `FuneralFrame` motif on Ravi-mode home, "fursat" cadence, no marketing surfaces, **no countdowns**, no penalties under grief. `<SaveAndResumeAffordance>` + `<CallHelplineCTA>` visible at every node.
- `ApiError` from `@twt/api-client`: 429 → rate-limit copy; 401 → generic invalid-code (can't distinguish expired from wrong); error-code branching (`e.code`) for typed cases (mirror `(auth)/otp.tsx:74-82` + the `auth.rejoin_locked` code branch).

### API + contracts + tenancy conventions

- **Scope-tx discipline:** `requireMemberSession` sets `request.requestContext.{actorId, pariwarId}` but does NOT open a tx. Each handler opens its own `openScopeTx(deps, pariwarIdStr)`, passes `scopeTx.client` (raw) to the projector, and `closeScopeTx(scopeTx, ok)` in `finally` (COMMIT only on success). Emit audit **after** the read succeeds and `ok` is set. [Source: `apps/api/src/modules/nominee/nominee.handlers.ts:97-168` — the exact template; `modules/multi-tenant/scope-tx.ts`]
- **`.strict()` on every contract object** (`_common/strict.ts` + friction-budget ESLint). Claim endpoints tenant-scoped. **No type-shadowing** — consume `@twt/contracts/claims`, never redeclare in `apps/api/modules/claims/*.types.ts`. [Source: `packages/contracts/src/claims/README.md`]
- **Route path decision:** the claims README suggests `/api/v1/p/<pariwar_id>/claims/...`, but the member-session-gated precedent (`/api/v1/member/nominees`, `/api/v1/member/kyc`) derives the pariwar from the session (`requestContext.pariwarId`) and is the right fit for a member-app flow. **Recommendation: `/api/v1/member/claims/...`** to match the session-guard precedent; note the README variance. (Admin/verifier claim surfaces in 6.10/6.11 may use the `/p/<pariwar_id>/` admin form — different guard.)
- **`eslint-config-twt` runs per-package** — any rule carve-out globs must be cwd-relative role globs (memory [[project_eslint_config_per_package_cwd]]); verify with `pnpm --filter <pkg> lint`.

### CI gates this story must keep green (with teeth)

- **`scripts/claim-state-invariant`** — static-scans `packages/domain/src` and fails on any `.update/.insert(claims).set/values({ current_state })` outside the projector allowlist. 6.2 does NOT write `current_state` directly — always go through `projectClaimState`. [Source: `claims.ts:16-24`]
- **`scripts/access-wrapper-invariants`** — SCAN_ROOTS currently cover validity-service + channels + `apps/api/src/modules/{channel-webhooks,wa-opt-in,telegram-opt-in}` (memory [[project_access_wrapper_gate_pending_scope]]). The new `apps/api/src/modules/claims` is NOT yet scanned; if 6.2 introduces access-wrapper-style runtime-value compares, consider whether the SCAN_ROOTS should extend (AI-5-1 territory) — flag, don't silently skip.
- **`friction-budget`** — the member mobile surface has a page-weight ceiling (best-ever ratchet; memory [[project_friction_budget_baseline_ratchet]]). A new claim group adds weight — stay under the ceiling; only lower the baseline in-PR, never raise it.
- **`pii-scrape`** — nominee name/mobile/UPI/Aadhaar are Tier-1 PII; the `claim.intake_initiated` payload + audit + logs carry **NO** nominee PII (only ids + relationship + masked hints). Mirror the nominee handler's discipline (payload carries count+split, never raw bytes). [Source: `nominee.handlers.ts:14-18`]
- **`schema-diff`** — any migration (e.g., a handover-OTP challenge table, if added) needs the schema-diff gate acknowledgement. Prefer reusing existing OTP-challenge storage over a new table.

### Live-DB test discipline (memory)

`pnpm ci:local` mirrors all 14 CI jobs at `--concurrency=4` (memory [[project_ci_local_concurrency_oversubscription]]); integration needs `DATABASE_URL` on the `twt-test-pg` Docker at **:5433** (memory [[project_live_db_test_gotchas]]). Never regenerate an applied migration; never `DROP SCHEMA` to reset; own-committing writers accumulate rows → assert membership, not exact counts. Confirm any suspected failure in isolation before blaming your change (memory [[project_known_livedb_test_failures]]). Fastify onSend double-send caveat if you add response headers (memory [[project_fastify_onsend_doublesend]]).

### Decisions (CONFIRMED by BigDev 2026-07-08 — do not re-litigate at review)

All four resolved to the recommended default. Implement as stated:

1. **`claimant_actor_id` in Ravi-mode → v1 null-claimant policy.** There is no distinct "Ravi" actor entity in v1 (nominees/relatives aren't members). Set `events_log.actor_id` = the deceased's member id (the acting session) and set `claim_case.claimant_actor_id` = **`null`** for v1, recording the confirmed relationship + handover-trust provenance in the `claim.intake_initiated` payload/audit. The true nominee-as-claimant binding lands with Story 6.8's claim-time nominee collection. (This is the "v1 null-claimant policy" the ACs reference.)
2. **Route path → `/api/v1/member/claims/...`** (session-derived pariwar), matching the member-session-guard + nominee/kyc precedent. The claims README's `/api/v1/p/<pariwar_id>/claims/...` form is for the admin/verifier surfaces (6.10/6.11), not this member-app flow — note the variance in the Dev Agent Record.
3. **Intake emission timing → at relationship-confirm** (after handover-trust OTP), per the epic AC. This is the freeze point; handover-trust is established first. The intake is irreversible-by-client thereafter (AC3) and idempotent (see "Idempotency").
4. **Doc-upload storage → deferred-marker only.** 6.2 ships the `<ClaimDocumentUpload>` UI seam + a deferred-upload marker (save-and-upload-within-7-days state) WITHOUT the real OCR/object-storage backend, which is Story 6.5. Do not build storage in 6.2.
5. **No server-side "is the member actually deceased" gate at intake (CONFIRMED by code review 2026-07-08 — do not re-litigate).** Ravi-mode intentionally freezes on self-declaration + nominee handover-trust OTP alone; there is no independent death-verification check before minting `claim_case_id` / freezing the account. This is by design — freeze-first-verify-later minimizes friction for genuinely bereaved families, and false positives are caught by the field-worker visit within 2–3 weeks (per the acknowledgement screen's own copy). Do not add a death-verification gate to 6.2.

### Project Structure Notes

- New: `packages/contracts/src/claims/filing.ts` (+ index wiring); `apps/api/src/modules/claims/{routes,handlers,service,index}.ts`; `apps/mobile/app/(claim)/*` + `apps/mobile/components/claim/*` + `apps/mobile/lib/claim-api.ts` + `lib/claim-steps.ts`; `packages/i18n/locales/{en,hi}/claim.json` (+ catalog registration).
- Extend: `packages/api-client/src/index.ts` (claim client); the API bootstrap route-registration; possibly `apps/api/src/modules/auth/shared/step-up-delivery.ts` (add `handover` intent).
- No new domain schema expected — 6.2 consumes the 6.1 `claims` table + `member_nominees` as-is. If a handover-OTP challenge needs storage, prefer the existing OTP-challenge table over a new migration; if a migration is unavoidable, honor the schema-diff gate + never-regenerate-applied-migration rule.
- Naming: DB snake_case, TS camelCase; tenant-agnostic internal component names (UX labels only in copy).

### References

- Epic 6 intro + Story 6.2 ACs — `_bmad-output/planning-artifacts/epics.md:2258-2322` (cross-cutting AR-61 note: 2280).
- Claim primitive — `packages/domain/src/claim/{events,state,project,read,index}.ts`; `packages/domain/src/schema/claims.ts`; `packages/domain/src/ids/index.ts:88,105`.
- Account-freeze overlay seam — `packages/domain/src/member/overlay.ts` (matches `payload ->> 'deceased_member_id'`); Story 6.1 events header `events.ts:16-25`.
- Ravi-mode UX — `_bmad-output/planning-artifacts/ux-design-specification.md`: Journey 2 (1424-1463); `<ClaimProxyFlowShell>` (1955-1962), `<HandoverTrustOTP>` (1964-1971), `<ClaimDocumentUpload>` (1973-1980), `<NomineeDetailEditor>` (1982-1989); grief register (§7, 295); component-naming discipline (1751-1754); session transferability (263).
- API templates — `apps/api/src/modules/nominee/{nominee.handlers,nominee.routes,nominee-crypto}.ts`; `apps/api/src/modules/multi-tenant/scope-tx.ts`; OTP — `apps/api/src/modules/auth/shared/{otp,step-up-delivery,sms-step-up-delivery}.ts`, `modules/auth/member/{member-otp.service,otp-rate-limit}.ts`.
- Mobile templates — `apps/mobile/app/(auth)/otp.tsx`; `apps/mobile/lib/{session,member-api,wizard-steps,mmkv}.ts`.
- Contracts + i18n — `packages/contracts/src/claims/README.md`; `packages/i18n/src/catalog.ts` (ADDING A DOMAIN); `scripts/check-parity.ts`.

### Previous Story Intelligence (Story 6.1)

- 6.1 landed the claim primitive in `@twt/domain` (NOT `packages/claim-lifecycle`) and passed review 2026-07-08 (full suite 650/650; `claim-state:test` 15/15). It explicitly built **no route/UI/intake** — that is 6.2's job.
- 6.1 review pinned: single-dot snake_case event names; `.strict()` payloads; `deceased_member_id` on intake+settled+denied_no_appeal for the overlay; the `trigger` field is freeform (pass a descriptive string like `member_app_ravi_intake`); the reducer is total (never throws). The AC3 DB trigger fires **BEFORE INSERT OR UPDATE** on `claims` (tightened in 6.1 review) — the projector's first-event INSERT sets `app.claim_state_writer='on'` around it; you get this for free by using `projectClaimState`.
- 6.1 deferred (not 6.2's problem unless touched): projector upsert not refreshing `intakeChannels`/`claimantActorId` on later events (that's 6.4's ICP territory) — for 6.2's single first event it writes them correctly on INSERT.

### Git Intelligence

Recent history is squarely on Epic 6 / claim substrate: `dd2eb6d Story 6.1: claim case data model + claim state machine [PRIMITIVE]`, then the vacuum-test fix and the 6.1 merge (`ba629c0`). Epic 5 (channels/dispatch) just closed — the OTP/SMS delivery seams 6.2 reuses are fresh and merged. Commit manually (branch + selective stage), per the story-automator ops note (memory [[project_story_automator_ops]]).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Opus 4.8)

### Debug Log References

- API integration suite (live DB :5433): `apps/api` 406/406 pass (54 files), incl. the 8-test `tests/integration/claims/claims-intake.spec.ts` — no regressions.
- Contracts: `@twt/contracts` 244/244 pass incl. the new `claims-filing.test.ts` (lockstep + strict + shapes).
- i18n parity gate: `pnpm --filter @twt/i18n i18n:check-parity` green with the new `claim` namespace; i18n 51/51 unit pass.
- Mobile pure-logic: `apps/mobile` vitest 9/9 pass (`claim-steps` order + `claim-draft` save/restore/clear/per-member isolation).
- CI gates (individually): `claim-state:check` ✓, `pii:check` ✓, `friction:check` ✓, `schema:check` ✓ (no migration → FR-100 non-add holds), `access-wrapper:check` ✓.
- Full merge gate: `DATABASE_URL=…:5433 pnpm ci:local` (see Completion Notes for outcome).

### Completion Notes List

- **Load-bearing seam verified end-to-end.** `POST /member/claims/intake` appends exactly one `claim.intake_initiated` (payload carries snake_case `deceased_member_id`, `intake_channel: 'member_app'`, `claimant_actor_id: null`), projects `intake_pending`, and the merged Story 3.1 `member/overlay.ts` account-frozen overlay then reads **frozen** — asserted by driving `getMemberAccountOverlay`, not just a unit assert (per `/verify` discipline).
- **Idempotency (AC3):** two-layer guard — a tx-scoped `pg_advisory_xact_lock` on (pariwarId, deceasedMemberId) serializes concurrent intakes so the route-level dedup read (`claim.getClaimByDeceasedMember`, new domain accessor) is race-safe; a `ClaimStreamConcurrencyError`→return-existing backstop remains. NOTE: the story's "deterministic `eventId` dedup key" suggestion does not actually collide under fresh per-call `claim_case_id`s (different streams) — the advisory lock is the correct concurrency guard, and a deterministic `claim_case_id` was deliberately NOT used because it would pre-empt Story 6.4's ICP convergence design (member-app + helpline would silently share one stream). Recorded as a decision.
- **Handover-trust OTP — decision variance (Dev Notes blessed "a handover intent OR a bespoke service"):** implemented as a bespoke service **reusing** the Story 3.2 `member_auth_otps` `step_up` pool + `member_step_up_elevations` — **NO new enum value, NO migration** (keeping `schema-diff` a no-op). The pool is keyed on a synthetic, collision-proof `handover:<deceasedMemberId>` key (real mobile blind indices are hex HMAC, so zero cross-talk with a member's real login/step-up OTPs) + `expectedMemberId`-bound verify. The elevation action-context `claim_handover` is the handover-trust marker the intake route gates on via `requireMemberStepUp(deps, 'claim_handover')` (the Story 3.9 precedent). Delivery uses the port's `login` variant (carries an already-resolved E.164) because Ravi-mode must target the **nominee's** decrypted mobile, not the session member's.
- **§2.2 step-up satisfied by the handover OTP** (Dev Notes) — no second step-up OTP to the deceased's own number. Verify is attempt-capped by `OTP_MAX_ATTEMPTS` (the send-throttle is on `/handover-otp` only; it was deliberately **removed** from `/verify` so verify retries don't wrongly consume the send budget — attempt-cap is the verify rate-limit). Tests assert plaintext-never-persisted (hash only) + the attempt-cap burns the code.
- **AC/UX ordering variance recorded:** followed the **epic AC** (handover-trust established BEFORE the intake-emitting relationship step), NOT the UX Journey-2 diagram (which would freeze on an unverified handover). `claim-steps.ts` order + the `requireMemberStepUp` gate + a defensive re-check in the intake handler all enforce this. A `claim-steps` test locks the order.
- **v1 null-claimant policy (Decision #1):** `claims.claimant_actor_id = null`, `events_log.actor_id` = the deceased's member id (the acting session), the confirmed relationship recorded in the audit context. Nominee-as-claimant binding lands with Story 6.8.
- **Route path (Decision #2):** `/api/v1/member/claims/...` (session-derived pariwar), matching the member-session-guard precedent; the claims README's `/p/<pariwar_id>/claims/...` form is for the admin/verifier surfaces (6.10/6.11). Variance noted in `claims.routes.ts`.
- **Seams flagged loudly:** doc-upload (`(claim)/document.tsx`) is a UI seam only — the "Take a photo"/"Choose a PDF" buttons mark local draft intent WITHOUT a native picker (expo-image-picker/-document-picker are NOT deps; adding them + the OCR/object-storage backend is **Story 6.5**). Nominee review is read-only presence flags via the existing NON-PII `nomineesStatus` (gated edit + dual-bank collection is **Story 6.8**). Helpline deep-link entry is **Story 6.3** (6.2's organic home entry is the only entry surface); claim-time DPDPA consent is **Story 6.9** (a `'consent'` slot is reserved in `claim-steps.ts`).
- **MMKV (memory `project_mmkv_asyncstorage_equivalent`):** the claim draft persists via `lib/mmkv` `mmkvStorage` (UX §12 says "AsyncStorage"; the app standardized on MMKV — substitution noted). Tokens stay in secure-store; the draft (relationship + doc-stage marker) is non-sensitive.
- **Deceased display name:** the session holds no non-PII display name and we do NOT fetch the Tier-1 name (PII/gated), so the entry/banner copy uses a dignified generic (`member_fallback` = "your family member"); a later story can thread the real name via a param.
- **access-wrapper gate (memory `project_access_wrapper_gate_pending_scope`):** the new `apps/api/src/modules/claims` is NOT in the gate's SCAN_ROOTS. 6.2 introduces **no** access-wrapper-style runtime-value secret compares in that module (the OTP timing-safe compare lives in the already-scoped shared `otp.ts`). Flagged here, not silently skipped — no SCAN_ROOTS extension needed for this story.
- **Mobile test scope (honest):** the mobile app has no RN component-render harness in this repo. I added a scoped `apps/mobile/vitest.config.ts` (`tests/unit/**` only, so it never picks up the Playwright web-export e2e) + flipped `test` from `true` → `vitest run`, covering the node-testable flow LOGIC (step order, draft save/restore/clear, per-member isolation). Component **mount** assertions (proxy-shell renders / `CallHelplineCTA` present at every node) are guaranteed by **construction** — every step screen wraps in `<ClaimProxyFlowShell>`, which always renders `<SaveAndResumeAffordance>` + `<CallHelplineCTA>` — and by typecheck, not by an executed render test. The load-bearing runtime behavior (OTP send/verify, intake, freeze, idempotency, PII, attempt-cap) is covered end-to-end by the API integration spec.
- **6.1 handoff honored:** wired `ClaimStateDirectWriteError` into the API error-mapping middleware (500 + stable code) — the boundary 6.1 built the typed error for. 6.2 never writes `current_state` directly (always via `projectClaimState`), so it is a forward-safe guard (`claim-state-invariant` stays green).

### File List

**New — contracts:**
- `packages/contracts/src/claims/filing.ts`
- `packages/contracts/src/claims/index.ts`
- `packages/contracts/tests/claims-filing.test.ts`

**New — domain:**
- (accessor added to existing) `packages/domain/src/claim/read.ts` — `getClaimByDeceasedMember`

**New — apps/api (claims module):**
- `apps/api/src/modules/claims/claims.service.ts`
- `apps/api/src/modules/claims/claims.handlers.ts`
- `apps/api/src/modules/claims/claims.routes.ts`
- `apps/api/src/modules/claims/index.ts`
- `apps/api/tests/integration/claims/claims-intake.spec.ts`

**New — api-client / mobile wiring:**
- `apps/mobile/lib/claim-api.ts`
- `apps/mobile/lib/claim-steps.ts`
- `apps/mobile/lib/claim-draft.ts`
- `apps/mobile/lib/claim-i18n.ts`

**New — mobile UI:**
- `apps/mobile/components/claim/ClaimProxyFlowShell.tsx`
- `apps/mobile/components/claim/SaveAndResumeAffordance.tsx`
- `apps/mobile/components/claim/CallHelplineCTA.tsx`
- `apps/mobile/components/claim/ClaimProxyFlowEntry.tsx`
- `apps/mobile/app/(claim)/_layout.tsx`
- `apps/mobile/app/(claim)/index.tsx`
- `apps/mobile/app/(claim)/handover-otp.tsx`
- `apps/mobile/app/(claim)/relationship.tsx`
- `apps/mobile/app/(claim)/document.tsx`
- `apps/mobile/app/(claim)/nominee-review.tsx`
- `apps/mobile/app/(claim)/acknowledgement.tsx`

**New — mobile tests + config:**
- `apps/mobile/vitest.config.ts`
- `apps/mobile/tests/unit/claim-steps.test.ts`
- `apps/mobile/tests/unit/claim-draft.test.ts`

**New — i18n:**
- `packages/i18n/locales/en/claim.json`
- `packages/i18n/locales/hi/claim.json`

**Modified:**
- `packages/contracts/src/index.ts` — export `./claims/index.js`
- `packages/domain/src/claim/read.ts` — `getClaimByDeceasedMember` + `desc`/`MemberId` imports
- `apps/api/src/audit/audit-sink.ts` — 5 `member_claim.*` audit event types
- `apps/api/src/server.ts` — `registerClaimsModule`
- `apps/api/src/middleware/error-mapping/index.ts` — `ClaimStateDirectWriteError` → 500
- `packages/api-client/src/index.ts` — `requestHandoverOtp`/`verifyHandoverOtp`/`initiateIntake` + `createMemberClaimClient`
- `packages/i18n/src/catalog.ts` — register the `claim` namespace + `KNOWN_NAMESPACES`
- `apps/mobile/app/(tabs)/index.tsx` — `<ClaimProxyFlowEntry />` home entry
- `apps/mobile/package.json` — `test`: `true` → `vitest run`

### Change Log

- 2026-07-08 — Story 6.2 implemented (member-app Ravi-mode claim filing, first live caller of the 6.1 claim primitive): `@twt/contracts/claims` transport DTOs; `apps/api/src/modules/claims` intake + handover-trust OTP (reusing the 3.2 OTP pool + 3.9 elevation gate, no migration); idempotent intake (advisory-lock + dedup read) → `claim.intake_initiated` → account freeze; `@twt/api-client` claim client; `apps/mobile` `(claim)` Expo-Router group + `<ClaimProxyFlowShell>`/`<HandoverTrustOTP>`/doc-upload seam/read-only nominee review + MMKV save-and-resume; bilingual `claim` i18n domain. Tests: API integration (intake→freeze→idempotent, attempt-cap, plaintext-never-persisted), contracts lockstep, i18n parity, mobile flow-logic. Status → review.
