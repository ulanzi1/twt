---
baseline_commit: 67aff3eba8e6ec0dd0c65d59f01fc675a53cf5f4
---

# Story 6.3: Helpline-Mediated Claim Filing Flow + Member Lookup + Read-Back

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Priya (a helpline operator taking a call from a bereaved family member who can't or won't use the app),
I want to file a claim on the deceased member's behalf from the operator console — looking the member up, reading identity + nominee details back to the caller for verbal confirmation, and submitting the intake under my own operator attribution — always with a supervisor-escalation path when the case is non-standard,
so that families without smartphones (or unable to complete the app flow) can still reach support, and the claim lands in the **same canonical case object** the app path produces.

This is a `[SURFACE]` story and the **SECOND live caller of the Story 6.1 claim primitive** (`@twt/domain` `claim` namespace) — the twin of Story 6.2 (member-app Ravi-mode). Both paths emit the *same* `claim.intake_initiated` event (differing only in `intake_channel` + `actor` + the audit actor), both freeze the deceased's account via the merged Story 3.1 `member/overlay.ts` seam, and both dedup against the *same* `getClaimByDeceasedMember` accessor so a death that already has a live claim never mints a second. The **rich** dual-path convergence UI (both intakes visibly linked, `<IntakeDecisionStrip>`, override semantics) is **Story 6.4 (ICP)** — 6.3 owns only the helpline *intake emission* + operator surface.

## Acceptance Criteria

> Source: `epics.md` §Epic 6, Story 6.3 (lines 2324–2341). BDD wording preserved; scope-boundary refinements + the member-lookup-reality reconciliation are in Dev Notes → "Scope boundary" and "Member lookup — shipped reality vs the epic/journey wording". The recommended decisions the ACs reference are in Dev Notes → "Decisions (recommended defaults — confirm before/at dev)".

**AC1 — Operator looks up the deceased member (scope-respecting, exact-match)**
**Given** FR-37 + UX-DR45 `<MemberLookupForm>` + Story 0.11 operator-shadowing findings (⚠ un-attested — see Dev Notes "The Story 0.11 dependency is un-attested") + the shipped Story 4.7 admin member-search
**When** the operator opens the helpline console and looks up the deceased member
**Then** the operator searches via the existing `<MemberLookupForm>` (Story 4.7) — **exact-match by `memberId`, by `mobile` (server blind-indexes the raw value), or browse the active Pariwar**; the search is scope-respecting (Story 1.8 — the operator's `helpline_operator` grant is a per-Pariwar grant; the server's `requirePermissionHook` fail-closes cross-tenant).
**And** a single match auto-advances to the read-back step; multiple matches render the disambiguation list (`<MemberSearchResults>`); **no match** routes to the AR-61 supervisor-escalation / advise-app-path — **there is NO "search by name + district + dates" fallback and NO "create stub claim with known info" in v1** (both require member-lookup dimensions + a member-less claim shape that do not exist yet — see Dev Notes "Member lookup — shipped reality" + "Stub-claim is OUT of 6.3").

**AC2 — Read-back confirmation before the freeze-firing intake**
**Given** UX-DR46 `<ReadBackCard>` (identity-confirmation + nominee-confirmation variants)
**When** the operator has selected the deceased member
**Then** the `<ReadBackCard>` surfaces the suggested read-back text (member identity: name, and non-PII locators the operator can voice) with a **"Caller confirmed"** checkbox and a **"Caller corrected — update"** affordance; the operator reads it aloud and the caller confirms verbally.
**And** **identity confirmation is the HARD gate on intake**: the intake is **NOT emitted until the identity read-back is confirmed** (`identityReadBackConfirmed === true` — enforced on both the submit control AND the wire contract). This is the operator-path analogue of Ravi-mode's handover-trust OTP: the operator is a trusted, authenticated, step-up-elevated staff actor, so the caller's verbal identity confirmation + the operator's authority replaces the nominee OTP (see Dev Notes "No nominee handover-OTP on the standard operator path").
**And** **nominee confirmation does NOT gate intake** — the nominee-summary `<ReadBackCard>` variant reads back the deceased's declared nominee summary (**non-PII presence/relationship/split only** via the shipped `nomineeSummary`) as an **advisory / operational** read-back the operator can voice, but it is **not** a precondition for submitting the intake and is **not** a wire precondition. (The encrypted nominee name/mobile/UPI are NOT surfaced in 6.3; nominee-detail read-back + the "nominee changed → handover-trust" branch are **Story 6.8** territory. Bank/nominee correctness is verified downstream, not at intake.)

**AC3 — Emit the intake with operator attribution (and freeze the account), idempotently + convergently**
**Given** the claim primitive (Story 6.1 `claim.intake_initiated`, which already declares `intake_channel: 'helpline'` + `actor: 'operator'`) + the Story 3.1 account-frozen overlay seam
**When** the operator submits the intake (after identity read-back is confirmed)
**Then** the flow mints a fresh `claim_case_id` (UUID, server-side) and appends `claim.intake_initiated` via `projectClaimState` with `intake_channel: 'helpline'`, `actor: 'operator'`, the `deceased_member_id` (snake_case — the pinned freeze seam), and `claimant_actor_id: null` (v1 null-claimant policy, same as 6.2 — the caller is not a member entity), projecting the claim to `intake_pending`.
**And** **operator attribution** is recorded as the audit actor: `events_log.actor_id` = the **operator's admin actor id** + an audit line tagged with the operator id — this is the minimal claim-scoped attribution; the fuller helpdesk operator-attribution data model + the member-visible "We filed this for you — Operator [Name]" header is **Story 10.3** (deferred-work line 905). The `trigger` payload note distinguishes the helpline origin (e.g. `helpline_operator_intake`).
**And** the audit line ALSO carries `lookup_method` (`memberId | mobile | pariwar` — the search dimension the operator used to find the member) as **audit metadata only** — it goes in the `helpline_claim.*` audit context, **NOT** in the `claim.intake_initiated` domain payload (the payload stays `.strict()` and unchanged; `lookup_method` is a NON-PII operational-insight field for the audit trail, never a domain fact). The client supplies it on the intake request so the server can record it.
**And** because the payload carries `deceased_member_id`, the merged `member/overlay.ts` account-frozen overlay begins matching — the deceased's account enters memorial/frozen state.
**And** the intake is **idempotent AND crudely convergent**: it dedups against the *same* `getClaimByDeceasedMember` the member-app path uses — a death that already has a **non-terminal** claim (whether filed via app or a prior helpline call) returns the **existing** `{ claimCaseId, state }` (no second `claim.intake_initiated`, no second freeze); the operator UI shows "a claim already exists for this member." (Full cross-channel *visibility/override* is **Story 6.4 ICP** — 6.3 owns only the safe single-guard dedup.)

**AC4 — Route for verification OR convert to a member-app handover; §2.2 staff step-up; audit**
**Given** the epic AC ("route the case for verification or convert to a member-app handover") + architecture §2.2 (claim filing requires a fresh transactional step-up regardless of session state) + Story 1.10 audit
**When** the operator completes or hands off the intake
**Then** the freeze-firing intake route is gated on the operator's **admin step-up elevation** (`requireStepUp(deps, 'claim_file')` — the Story 1.9 admin step-up module) so §2.2's fresh-transactional-OTP-for-claim-filing requirement is satisfied by the *operator's own* step-up (NOT the nominee handover OTP).
**And** post-intake the operator can **route the case for verification** (the claim is already at `intake_pending`; 6.3 does not itself advance state past intake — verification wiring is 6.5/6.6/6.10). The "**convert to a member-app handover**" affordance is a **flagged seam only** in 6.3 — 6.3 does NOT build deep-link/token infrastructure; the handover deep-link (issue-side + mobile-side landing) is owned by whichever story wires the mobile deep-link landing (see Dev Notes "Deep-link handover is a seam, not 6.3 infrastructure"). Because both paths converge at ICP (6.4) anyway, "route for verification" is the primary post-intake action.
**And** every operator action (search, read-back-confirm, intake, idempotent-hit, escalation) writes a NON-PII audit line (`helpline_claim.*`) carrying `claim_case_id` + `deceased_member_id` + the operator id + `lookup_method` — never caller/nominee PII.

**AC5 — Staff-fallback / supervisor escalation (AR-61, cross-cutting)**
**Given** AR-61 staff-fallback (cross-cutting AC across all claim-flow stories) + Story 0.7 fallback-handler ledger
**When** the operator encounters a non-standard scenario (no member match, caller disputes read-back, caller reports the nominee has changed, or any case the operator cannot resolve)
**Then** the operator escalates to a supervisor; the case is **held at `intake_pending`** (or not yet minted, for a no-match); the supervisor's resolution emits the next event. The ledger is **referenced, not re-implemented** per the epic's cross-cutting note (epics.md:2280).

**AC6 — Scope-safe, audited, projector-only, English-console with bilingual read-back**
**Given** multi-tenant RLS + the admin-console conventions (Story 4.7 / 1.9) + the i18n bilingual contract (Story 2.1)
**When** any helpline-console screen renders or the intake endpoint is called
**Then** every write runs inside a scope tx with `app.pariwar_id` set; `claims.current_state` is written **only** by the projector (`claim-state-invariant` stays green); the console chrome is **English-facing** (matching the shipped admin app — Story 4.7's `i18n-en.ts` precedent), while the `<ReadBackCard>` suggested read-back text is available **bilingually (en/hi)** so the operator can voice it to a Hindi-speaking caller (reuse the shipped `@twt/i18n` `claim` namespace where copy already exists; add helpline keys with en/hi parity).

## Tasks / Subtasks

- [x] **Task 1 — RBAC: a `claim.file` permission key + grant to `helpline_operator` (AC1/AC3/AC4)**
  - [x] Append `'claim.file'` to `SEED_PERMISSION_KEYS` in `packages/domain/src/rbac/permissions.ts` and **bump `PERMISSION_CATALOG_VERSION` 6 → 7** (append-only; the header says keys grow per-epic in the owning story). Add the explanatory comment (mirror the Story 4.6/5.3 key comments) noting this is the helpline/trustee claim-*intake* key — distinct from `claim.approve` (verifier/trustee approval, Story 6.10/6.11).
  - [x] Grant `CLAIM_FILE` to `helpline_operator` in `packages/domain/src/rbac/roles.ts` (add the `permissionKey('claim.file')` local handle + include it in the `helpline_operator` bundle; it already carries `MEMBER_VIEW_VALIDITY` for the lookup). `super_admin` inherits it automatically (its bundle derives from `PERMISSION_CATALOG.keys`). Consider whether `district_admin`/`pariwar_admin` (who already hold `CLAIM_APPROVE`) should also file — **recommend NOT** in v1 (keep filing to helpline_operator + super_admin; the trustee-initiated path is a later story). Flag if you deviate.
  - [x] Keep `packages/domain/tests/rbac/roles.test.ts` (referential integrity: every bundle key ∈ catalog) + the permissions catalog-version test green. Update any snapshot/count assertions the catalog-version bump touches (`schema-diff` is pure-domain metadata, no migration).
- [x] **Task 2 — `@twt/contracts/claims` helpline transport contracts (AC2/AC3/AC4)**
  - [x] Add `packages/contracts/src/claims/helpline.ts`: `HelplineClaimIntakeRequest` (`deceasedMemberId: UuidString`, `relationship` enum — reuse the 6.2 relationship enum, `identityReadBackConfirmed: z.literal(true)` so the wire itself asserts AC2's HARD gate, and `lookupMethod: z.enum(['memberId','mobile','pariwar'])` — the search dimension the operator used, carried so the server can record it in audit metadata) + reuse `ClaimIntakeInitiateResponse` (or a `HelplineClaimIntakeResponse` alias carrying `claimCaseId`, `state`, `created`). Every object `.strict()` (`_common/strict.ts`). **Note:** nominee confirmation is deliberately NOT a wire field — nominee read-back does not gate intake (AC2).
  - [x] Do **not** shadow domain types — the `claim.*` payloads live in `@twt/domain`; `lookupMethod` is a wire+audit field, NOT a domain payload field. Register in `packages/contracts/src/claims/index.ts` + the top barrel. **No handoff-link contract** — the deep-link handover is a seam, not 6.3 scope (see Decision #4).
- [x] **Task 3 — `apps/api` helpline claim-intake handler + route (AC1/AC3/AC4/AC5/AC6)**
  - [x] Refactor the **shared** intake core: parameterize `apps/api/src/modules/claims/claims.service.ts` `initiateIntake` to accept `{ intakeChannel, actor, actorId, claimantActorId, trigger }` (default the current member-app values so the shipped 6.2 handler is unchanged in behavior). The advisory-lock + `getClaimByDeceasedMember` dedup + `projectClaimState` call stay **shared** — this is the load-bearing convergence point (both channels dedup against one accessor). 6.3 passes `intakeChannel:'helpline'`, `actor:'operator'`, `actorId:<operatorAdminActorId>`, `claimantActorId:null`, `trigger:'helpline_operator_intake'`.
  - [x] New handler surface in the claims module (a sibling to the member handlers — `claims.helpline.handlers.ts` or extend `claims.handlers.ts`): resolve `deceasedMemberId` from the **validated request** (NOT the session — the operator is NOT the deceased); **guard the deceased is a real member in this Pariwar** (resolve via `member` accessor / the search having returned it) and reject cross-tenant ids (defense-in-depth on RLS). `openScopeTx(deps, pariwarIdStr)` → `initiateIntake(...)` → emit `helpline_claim.intake_initiated` / `…intake_idempotent` audit AFTER `ok` → `closeScopeTx`. The audit context carries `claim_case_id` + `deceased_member_id` + operator id + **`lookup_method`** (from the request; audit-only, non-PII) — NEVER caller/nominee PII (register the new `helpline_claim.*` audit types in `apps/api/src/audit/audit-sink.ts`, mirroring the `member_claim.*` types 6.2 added).
  - [x] Admin route `POST /api/v1/p/:pariwarId/admin/claims/intake` with `preHandler: [adminSession, scope, requirePermissionHook(CLAIM_FILE_KEY), requireStepUp(deps, 'claim_file')]` (the exact `member-validity/routes.ts` admin chain + the Story 1.9 `step-up/gate.ts` step-up). Register the new admin routes in the claims module barrel (`registerClaimsModule`) alongside the existing member routes — the module now serves BOTH `/member/claims/*` and `/p/:pariwarId/admin/claims/*`.
  - [x] **No handoff-link route** — the "convert to member-app handover" deep-link is a seam, not 6.3 infrastructure (Decision #4). The post-intake "route for verification" affordance needs no new route (the claim is already at `intake_pending`).
- [x] **Task 4 — `apps/admin` API client + hooks (AC1/AC2/AC3)**
  - [x] `apps/admin/src/api/client.ts`: `initiateHelplineClaim(pariwarId, body)` → `POST` to a new `adminClaimsBase(pariwarId)` helper (mirrors `adminMemberBase(pariwarId)` but resolves to `/p/:pariwarId/admin/claims`, matching the route registered in Task 3 — do NOT derive it from `adminMemberBase` via relative-path traversal). Response-validate against `@twt/contracts`. No handoff-link fn (Decision #4).
  - [x] `apps/admin/src/api/hooks.ts`: `useHelplineClaimIntake(pariwarId)` (a mutation — mirror `useMemberSearch`); this surface is the support/dispute freshness class (the `createQueryClient` staleTime:0 defaults are right). On a `409/created:false` idempotent-hit, surface "claim already exists" rather than an error.
- [x] **Task 5 — `apps/admin` `<HelplineConsoleShell>` + `<ReadBackCard>` (AC1/AC2/AC5/AC6)**
  - [x] `apps/admin/src/modules/helpline-claims/HelplineConsoleShell.tsx` — the two-pane shell (UX §11: left = lookup/intake form, right = read-back/audit; sticky top = caller/call-status/save-draft). Reuse the shipped `<MemberLookupForm>` (Story 4.7) for the left pane — do NOT re-implement search.
  - [x] `ReadBackCard.tsx` — suggested-read-back text + "Caller confirmed" checkbox + "Caller corrected — update" affordance + a running correction log; identity variant + nominee-summary variant. **Gate the "Submit intake" action ONLY on `identityReadBackConfirmed === true`** — the nominee-summary read-back is advisory and MUST NOT block submit (AC2).
  - [x] `HelplineClaimPage.tsx` — orchestrate: search → select → identity read-back (the gate) → nominee-summary read-back (advisory) → submit intake → post-intake actions (route-for-verification note + a **flagged, non-functional "convert to member-app handover" seam** — a disabled/"coming soon" affordance or a note, NOT a built deep-link; Decision #4). AR-61 supervisor-escalation affordance present at every node (a "Escalate to supervisor" control that holds the case).
  - [x] New route `/p/$pariwarId/helpline` in `apps/admin/src/router.tsx` + a `HelplineClaimRoute.tsx` session-gate (mirror `MemberSearchRoute.tsx` — client gate = "is there a live session"; the REAL boundary is the server permission hook). Add the nav `<Link>` in `RootLayout.tsx` (client-side advisory gate on the `claim.file` grant, mirror `hasPariwarProvision`).
- [x] **Task 6 — i18n: English console chrome + bilingual read-back text (AC6)**
  - [x] Console chrome strings: follow the shipped admin precedent (a local `i18n-en.ts` map in the module, English-facing — like `member-status/i18n-en.ts`). Do NOT wire the admin console into `@twt/i18n` runtime just for chrome.
  - [x] Read-back suggested text (what Priya voices to the caller): add helpline keys to `packages/i18n/locales/{en,hi}/claim.json` with **en/hi parity** (`scripts/check-parity.ts` must pass) so the operator has the Hindi phrasing. Keep it non-PII-templated (the member/nominee values are injected at render, the template is translatable).
- [x] **Task 7 — Tests + CI gates (all ACs)**
  - [x] **API integration (live-DB :5433):** helpline intake appends exactly one `claim.intake_initiated` with `intake_channel:'helpline'` + `actor:'operator'` + operator `actor_id`, projects `intake_pending`, and the deceased account-frozen overlay now matches (assert by driving `getMemberAccountOverlay`, per `/verify` discipline — not just a unit assert). Cover: permission-denied without `claim.file` (403, audited); step-up-required without elevation (structured 401/403); **cross-channel convergence** — a member-app intake then a helpline intake for the same death returns the SAME `claimCaseId` with `created:false` and does NOT double-freeze; cross-tenant `deceasedMemberId` rejected.
  - [x] **Domain/RBAC unit:** `roles.test.ts` referential integrity green with `claim.file`; catalog version = 7; `helpline_operator` + `super_admin` carry `claim.file`, others don't.
  - [x] **Contracts:** `helpline.ts` strict + shape (`identityReadBackConfirmed` literal-true rejects `false`/absent; `lookupMethod` enum accepted; no nominee-confirmation field). Assert the intake handler records `lookup_method` in the audit context but NOT in the `claim.intake_initiated` payload (payload stays `.strict()` — an extra key would throw).
  - [x] **Admin component:** `<ReadBackCard>` gates submit **only** on identity confirmation; a nominee-summary read-back left un-confirmed does NOT block submit; `<HelplineConsoleShell>` renders the escalation affordance + the non-functional "convert to handover" seam; the route gate redirects an unauthenticated session (mirror the shipped `apps/admin/tests/*` vitest/RTL harness — `member-status-panel.test.tsx` is the template).
  - [x] **i18n parity:** `pnpm --filter @twt/i18n i18n:check-parity` green with the new helpline keys.
  - [x] **Green-with-teeth on:** `claim-state-invariant` (no `current_state` write outside the projector), `pii-scrape` (no caller/nominee PII in payload/audit/logs — only ids + relationship + non-PII summary), `friction-budget` (admin surface, if it has a budget), `access-wrapper` (the new admin claims path — see Dev Notes "access-wrapper SCAN_ROOTS"), `schema-diff` (no migration expected). Run `pnpm ci:local` (`--concurrency=4`, `DATABASE_URL` on :5433) as the merge gate.

### Review Findings

- [x] [Review][Patch] AC4 violation: read-back-confirm + escalation write no audit line, escalation has no backend record — wired a minimal `helpline_claim.readback_confirmed` / `helpline_claim.escalated` audit-only endpoint (`POST /p/:pariwarId/admin/claims/operator-event`, permission-gated only, no step-up; narrow scope, not the full Story 0.7 ledger integration; per BigDev decision 2026-07-09) [apps/api/src/modules/claims/claims.helpline.{handlers,routes}.ts, apps/api/src/audit/audit-sink.ts, packages/contracts/src/claims/helpline.ts, apps/admin/src/api/{client,hooks}.ts, apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx]
- [x] [Review][Patch] Switching the selected member does not reset identity/nominee confirmation, result, or step-up state — bypasses the AC2 hard gate when disambiguating multiple matches. Fixed via a `selectMember`/`resetDownstreamState` wrapper used by both the disambiguation-list `onSelect` and the auto-advance effect [apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx]
- [x] [Review][Patch] `identityReadBackConfirmed: true` sent as a hardcoded literal in `submitIntake` rather than derived from `identityConfirmed`, with no independent guard in the handler. Now derived from state + an explicit early-return guard [apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx]
- [x] [Review][Patch] Cross-tenant/invalid `deceasedMemberId` 404 (`memberExists` guard) is audit-silent, contradicting the handler's own never-audit-silent invariant. Moved inside the try/catch so it now emits `helpline_claim.intake_failed` [apps/api/src/modules/claims/claims.helpline.handlers.ts]
- [x] [Review][Patch] `canSubmit` doesn't check `stepUpRequired` — operator can fire redundant intake POSTs while the step-up panel is showing. Added `!stepUpRequired` to the gate [apps/admin/src/modules/helpline-claims/HelplineConsoleShell.tsx]
- [x] [Review][Patch] Escalating does not disable "File the claim" — contradicts the "case held for supervisor" messaging. Added `!escalated` to the gate [apps/admin/src/modules/helpline-claims/HelplineConsoleShell.tsx]
- [x] [Review][Patch] Stale step-up mutation state (`requestStepUp.isSuccess` never resets) — now reset on member reselect and after a successful verify [apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx]
- [x] [Review][Patch] `escalated`, `otp`, and both correction logs are not reset on a fresh search — folded into the shared `resetDownstreamState` used by both `onSearch` and `selectMember` [apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx]
- [x] [Review][Patch] `<button type="submit">` with no enclosing `<form>` in the console shell — changed to `type="button"` [apps/admin/src/modules/helpline-claims/HelplineConsoleShell.tsx]
- [x] [Review][Patch] Hardcoded `aria-label` strings bypass the module's `resolveEn` i18n-chrome convention — routed through new `resolveEn` keys [apps/admin/src/modules/helpline-claims/HelplineConsoleShell.tsx, ReadBackCard.tsx, i18n-en.ts]
- [x] [Review][Patch] Relationship `<select>` silently defaults to `'spouse'` instead of forcing an explicit operator choice — state is now `ClaimantRelationship | null` with a disabled placeholder option; submit is gated on an explicit choice [apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx, HelplineConsoleShell.tsx]
- [x] [Review][Patch] `helpline_claim.intake_failed` audit context records only `err.name`, not `err.message` — now records both [apps/api/src/modules/claims/claims.helpline.handlers.ts]
- [x] [Review][Defer] `outcome.state as HelplineClaimIntakeResponse['state']` unsafe type assertion — investigated: this is byte-for-byte the SAME pattern already shipped in the 6.2 member-app handler (`claims.handlers.ts:173`), not introduced by 6.3. Reclassified from Patch to Defer; not fixed here to avoid fixing one twin and not the other. See `deferred-work.md` [apps/api/src/modules/claims/claims.helpline.handlers.ts, claims.handlers.ts]
- [x] [Review][Defer] `hasClaimFile` advisory helper is exported but never consumed — investigated: there is currently NO per-Pariwar grants surface fetched to the admin client anywhere (`useSession` only returns `nationalGrants`); the shipped Story 4.7 `member.view_validity` precedent (an identical per-Pariwar grant) has the SAME zero-client-gating shape for the same reason (`MemberSearchRoute.tsx` gates on session-liveness only). Wiring this correctly would require new session/grants plumbing — out of scope for a patch. Left as the intentional advisory-only export the story's own Dev Notes describe; not a defect. See `deferred-work.md`
- [x] [Review][Defer] `initiateIntake`'s `attribution` partial-field defaulting has no guard against an inconsistent partial override (e.g. `actor` without `actorId`) — deferred, pre-existing pattern, no current caller triggers it [apps/api/src/modules/claims/claims.service.ts:238-254]

## Dev Notes

### The Story 0.11 dependency is un-attested — record it openly, do NOT claim validation

The epic pins Story 6.3's *design freeze* to Story 0.11 (operator-shadowing) closure (epics.md:2276, 2332; deferred-work.md lines 895–896, 905–906). **Story 0.11's Tasks 7–11 — the actual ≥4-hour operator shadowing, the member-lookup/read-back worksheet verdicts, and the 17 critical-hypothesis validations that would confirm-or-revise UX-DR45/46 — are `AWAITING EXTERNAL ACTION` / un-attested** (deferred-work.md:887). The hypotheses that gate *this* story include `A-member-lookup-name-criterion`, `A-member-lookup-mobile-criterion`, `A-readback-3-field`, `A-operator-attribution-id`, `A-supervisor-escalation-on-non-standard`.

Per memory [[feedback_record_unattested_no_backfill]]: **do not reconstruct the shadowing to fake validation.** 6.3 ships on the **pre-shadowing recommended defaults** (UX-DR45/46 as written) with the understanding that shadowing-driven revisions land later (via Epic 10 helpdesk stories + a re-commitment with a gate). State this plainly in the Dev Agent Record — the design is the recommended default, not a shadowing-validated one. This is an integrity requirement, not a caveat to bury.

### Scope boundary — what 6.3 builds vs what it seams to later stories

6.3 is a SURFACE story referencing patterns whose *fuller* home is later stories (6.4 ICP, 6.8 nominee-detail/handover, Epic 10 helpdesk). Follow the 6.2 precedent: build the load-bearing seam now, defer the rest, flag each seam loudly.

| Concern | 6.3 builds | Deferred to |
|---|---|---|
| Member lookup (exact-match: memberId / mobile / pariwar-browse) via shipped `<MemberLookupForm>` | ✅ reuse Story 4.7 | — |
| `<ReadBackCard>` identity + nominee-summary read-back + confirm/correct | ✅ full | — |
| Helpline `claim.intake_initiated` (→ freeze) with operator attribution | ✅ full (2nd live caller) | — |
| Idempotent + crude single-guard cross-channel dedup | ✅ (same `getClaimByDeceasedMember`) | — |
| `claim.file` RBAC key + helpline_operator grant + admin step-up gate | ✅ full | — |
| `lookup_method` operational-insight audit metadata (memberId/mobile/pariwar) | ✅ audit-only (not the domain payload) | — |
| **Deep-link handover to member-app** ("convert to handover") | ❌ flagged seam only (no token infra) | the mobile-deep-link-landing story (issue + landing together) |
| **Name / district / date member search** | ❌ NOT shipped | the dedicated **identity feature** (memory [[project_membership_number_deferred_feature]]); name search is deferred |
| **Stub claim on no-match** (member-less claim → field dispatch) | ❌ OUT | needs a member-less claim shape + field-worker dispatch (6.7 / Epic 12) |
| **Rich dual-path convergence** (both intakes visibly linked, `<IntakeDecisionStrip>`, override "do-not-converge") | ❌ | **6.4 (ICP)** — `claim.intake_converged` |
| **Nominee-detail read-back** (name/mobile/UPI) + "nominee changed → handover-trust → Trustee Panel" branch | ❌ (6.3 reads non-PII summary only) | **6.8** (dual-bank + gated nominee edit) |
| **Full helpdesk operator-attribution data model** + member-visible "We filed this for you — Operator [Name]" + `created_via: helpline_call` + routing/SLA/call-to-ticket | ❌ (6.3 = claim-scoped attribution via `events_log.actor_id` + audit) | **Story 10.3** (deferred-work:905) + Epic 10 |
| **Doc-path chooser / death-cert upload** (`<DocPathChooser>` email/SMS/field-dispatch) | ❌ | **6.5** |
| Advancing state past `intake_pending` (route-for-verification) | ❌ (6.3 stops at `intake_pending`) | 6.5/6.6/6.10 |

**Load-bearing deliverable:** the helpline `claim.intake_initiated` event — with `intake_channel:'helpline'`, `actor:'operator'`, the operator's `actor_id`, and the pinned `deceased_member_id` freeze seam. Everything else can be a placeholder; get the intake event exactly right.

### Member lookup — shipped reality vs the epic/journey wording (READ THIS)

The epic AC (epics.md:2334) says "search by name, mobile, Aadhaar masked, Pariwar ID" and Journey 3 (ux-spec:1478–1487) shows a "search by name + district + dates" fallback and a "create stub claim with known info" no-match path. **The shipped Story 4.7 search does NOT support any of that.** `MemberSearchRequest` (`packages/contracts/src/members/validity.ts:176`) is **exact-match only** on `{ memberId | mobile | pariwar }`; the contract comment is explicit: *"Prefix/fuzzy and name/Aadhaar search are OUT OF SCOPE (deferred; D3)."* `aadhaarMasked` is a **display** field on a result, NOT a search key (D3 refinement v). The existing `<MemberLookupForm>` (`apps/admin/src/modules/member-status/MemberLookupForm.tsx`) already tells the operator "Exact match only — partial / name / Aadhaar search is not available."

**Consequence for 6.3:** reuse the shipped exact-match search as-is. Do **not** invent name/Aadhaar/date search (it collides with memory [[project_membership_number_deferred_feature]] — member search v1 = mobile blind index + member_id + pariwar_id; name/number search lands with the dedicated identity feature). The Journey-3 "no match → stub claim" branch is therefore also out (see next note). Record this reconciliation in the Dev Agent Record — it is a spec-vs-shipped variance, resolved toward the shipped reality.

### Stub-claim is OUT of 6.3 (the primitive can't represent it)

Journey 3's "no match found → create stub claim with known info → field worker dispatch" cannot be built on the 6.1 primitive: `claim.intake_initiated` **requires** `deceased_member_id: z.string().uuid()` (events.ts:93) — the freeze seam and the whole claim identity hang off a real member. A no-match caller has no member to hang a claim on. So 6.3's no-match path is **AR-61 escalation** (supervisor / advise the app path / take a call-back), NOT a stub claim. A member-less "stub" claim needs (a) a member-less claim shape and (b) field-worker dispatch (6.7 / Epic 12) — neither exists. Flag; don't fake it.

### Consume the Story 6.1 claim primitive + the 6.2 intake core EXACTLY

- The primitive lives in **`@twt/domain`** `claim` namespace (there is **no** `packages/claim-lifecycle`). Import `{ claim, ids, member, nominee } from '@twt/domain'`.
- The intake payload seam already anticipates helpline: `ClaimIntakeInitiatedPayloadSchema` accepts `intake_channel: 'helpline'` and `actor: 'operator'` (events.ts:35, 90–97; `claimActorSchema = z.enum(['member','operator','trustee','system'])`, comment: *"`operator` = helpline staff"*). **No domain change is needed** to emit the helpline event — do NOT reshape the payload. There is deliberately **no `operator_attribution` field** on the payload (it's `.strict()`); operator attribution rides on `events_log.actor_id` + the audit line (Decision #3).
- **Reuse, don't re-derive, the intake core.** `apps/api/src/modules/claims/claims.service.ts` `initiateIntake` already does the load-bearing work: `pg_advisory_xact_lock` on `(pariwarId, deceasedMemberId)` → `getClaimByDeceasedMember` dedup (returns existing non-terminal claim) → `projectClaimState('claim.intake_initiated')` → `ClaimStreamConcurrencyError` backstop. **Parameterize it** (channel/actor/actorId/claimantActorId/trigger) and call the SAME function from the helpline handler. This guarantees the two channels converge on one accessor — a member-app filing and a helpline filing for the same death cannot both mint. (`getClaimByDeceasedMember` filters `notInArray(currentState, CLAIM_TERMINAL_STATES)` per the 6.2 review fix — a re-file after settled/denied correctly mints anew.)
- `projectClaimState` takes a **raw `pg.PoolClient`** (it issues `SET LOCAL app.claim_state_writer='on'`) and does NOT open its own tx — the caller opens `openScopeTx` first. `claim_case_id` is caller-minted server-side (`ids.claimId(randomUUID())`) — never client-supplied.

### The account-freeze seam — do NOT break it (same as 6.2)

The merged Story 3.1 `member/overlay.ts` matches **all** claim events for the deceased by `payload ->> 'deceased_member_id'` (overlay.ts:97; memory [[project_claim_overlay_unfreeze_seam]]). The helpline `claim.intake_initiated` **MUST** carry `deceased_member_id` (snake_case) or the freeze never fires. Verify in an integration test that after the helpline intake the deceased reads account-frozen (drive `getMemberAccountOverlay`, not just a unit assert).

### No nominee handover-OTP on the standard operator path (the key difference from 6.2)

Ravi-mode (6.2) needs a nominee handover-trust OTP because **Ravi is an untrusted human on the deceased's phone** — the OTP proves a nominee vouches for him before the account freezes. **Priya is different: she is an authenticated, RBAC-gated, step-up-elevated staff actor.** Her *authority* + the caller's *verbal read-back confirmation* is the operator-path trust anchor. So the standard 6.3 path does **NOT** fire the nominee handover OTP. (Journey 3's `HandoverProtocol` — SMS to nominee + Trustee Panel — is only the **nominee-changed** branch, which 6.3 defers to 6.8.) What DOES satisfy architecture §2.2 (claim filing requires a fresh transactional step-up regardless of session state) is the **operator's own admin step-up**: gate the intake route on `requireStepUp(deps, 'claim_file')` (Story 1.9 `apps/api/src/modules/step-up/gate.ts`). One fresh transactional OTP (the operator's) — not two. **The console must drive the step-up elevation first** (the existing admin step-up request endpoint — `apps/api/src/modules/step-up/step-up.handlers.ts`) so the gate finds a fresh `claim_file` elevation on the intake POST; a 401/`StepUpRequiredError` from the gate is the signal to run that elevation, not a hard error. Record this ordering/trust-model variance vs 6.2 in the Dev Agent Record.

### Operator attribution (Decision #3) — claim-scoped now, full helpdesk model in 10.3

The epic AC literal is `claimant_actor_id: operator_acting_for_<caller_id>` + `operator_attribution: <operator_id>`. There is no caller member entity in v1 and the payload is `.strict()` with no attribution field. Resolution (mirrors 6.2's confirmed v1-null-claimant policy): `claim_case.claimant_actor_id = null`; `events_log.actor_id` = the **operator's admin actor id** (the acting authenticated staff); the audit line carries the operator id + `intake_channel:'helpline'`. That IS the claim-scoped operator attribution. The *fuller* helpdesk operator-attribution data model (member-visible "We filed this for you — Operator [Name]", `created_via: helpline_call`, the ADR at deferred-work:905) is **Story 10.3** — do not build it here.

### Deep-link handover is a seam, not 6.3 infrastructure (Decision #4)

Story 6.2 flagged that the "convert to member-app handover" path had no entry (6.2 built only an organic home-screen entry). **6.3 does NOT take on deep-link/token infrastructure.** Reasoning: the deep-link infra is inert today (`packages/contracts/src/deep-links/deep-link.ts`, Story 1.7+, has `parseDeepLink` with **no live mobile consumer** — deferred-work:1871), and building the issue-side here would make 6.3 *partially* own an infrastructure whose consuming half doesn't exist — a half-built seam is worse than a clean one. Both paths converge at ICP (6.4) regardless, so **"route for verification" is the primary and sufficient post-intake action.** 6.3 ships the "convert to handover" affordance as a **flagged, non-functional seam** (a disabled/"coming soon" control or an explicit note) and defers the whole handover — issue-side token AND mobile-side landing — to whichever story wires the mobile deep-link landing. Record this as an explicit deferral in the Dev Agent Record (per [[feedback_closure_language_precision]]: this is a Resolved-via-explicit-deferral seam, not an omission).

### Admin-console conventions (match the shipped app — Story 4.7 / 1.9 / 1.11b)

- **Vite + React + TanStack Router/Query + Tailwind** (NOT Astro, NOT Expo). Routes in `apps/admin/src/router.tsx`; server state in TanStack Query via `apps/admin/src/api/hooks.ts` over the typed `apps/admin/src/api/client.ts` `apiFetch` (Zod-validates every response). The member-search surface (`modules/member-status/*`) is the closest template for 6.3.
- **Admin auth chain** for a tenant-scoped write: `preHandler: [adminSession, scope, requirePermissionHook(KEY)]` (+ `requireStepUp` for the freeze). Exact template: `apps/api/src/modules/member-validity/routes.ts:82–92` (the `POST /p/:pariwarId/admin/members/search` route). `requirePermissionHook` fail-closes on deny (audited 403); `member.view_validity` is a per-Pariwar grant, `claim.file` will be too.
- **Console is English-facing** — the shipped admin resolves i18n KEYS locally to English (`member-status/i18n-en.ts`); the Hindi surfaces are the member app. Only the read-back *suggested text* needs Hindi (the operator voices it) — put those in `@twt/i18n` `claim.json` with parity, not the console chrome.
- **`eslint-config-twt` runs per-package** — cwd-relative role globs for any carve-out (memory [[project_eslint_config_per_package_cwd]]); verify `pnpm --filter @twt/admin lint` + `pnpm --filter @twt/api lint`.

### CI gates this story must keep green (with teeth)

- **`scripts/claim-state-invariant`** — 6.3 never writes `claims.current_state` directly; always `projectClaimState`. (memory [[project_member_lifecycle_domain_substrate]] — the projector is the sole writer; DB trigger + CI gate enforce it.)
- **`scripts/access-wrapper-invariants`** — SCAN_ROOTS currently cover validity-service + channels + a few `apps/api` webhook modules; the claims module is **not yet scanned** (memory [[project_access_wrapper_gate_pending_scope]], AI-5-1). 6.3 adds an admin claims path that does a **permission compare + a step-up compare** — these go through the shared `requirePermissionHook` / `requireStepUp` gates (already-scoped shared code), NOT hand-rolled runtime-value compares. If you introduce any access-wrapper-style runtime compare in `apps/api/src/modules/claims`, consider extending SCAN_ROOTS (AI-5-1 territory) — flag, don't silently skip.
- **`pii-scrape`** — caller identity, nominee name/mobile/UPI/Aadhaar are Tier-1 PII. The `claim.intake_initiated` payload + all `helpline_claim.*` audit + logs carry **NO** such PII — only ids + relationship + the non-PII nominee summary (count/split/relationship). The read-back card injects PII at render only; never persist/log it.
- **`friction-budget`** — admin surface (check whether the admin app has a page-weight budget; if so, stay under it — best-ever ratchet, memory [[project_friction_budget_baseline_ratchet]]).
- **`schema-diff`** — no migration expected (RBAC key is pure-domain metadata; the claim + member tables are consumed as-is). If a handoff-token store is added, honor the gate + never-regenerate-applied-migration rule (memory [[project_live_db_test_gotchas]]).

### Live-DB test discipline (memory)

`pnpm ci:local` mirrors all 14 CI jobs at `--concurrency=4` (memory [[project_ci_local_concurrency_oversubscription]]); integration needs `DATABASE_URL` on the `twt-test-pg` Docker at **:5433** (memory [[project_live_db_test_gotchas]]). Never regenerate an applied migration; never `DROP SCHEMA`; own-committing writers accumulate rows → assert membership, not exact counts. Confirm any suspected failure in isolation before blaming your change (memory [[project_known_livedb_test_failures]]). If you add an `onSend` response header, mind the Fastify double-send caveat (memory [[project_fastify_onsend_doublesend]]) — prefer `onRequest`.

### Decisions (recommended defaults — confirm with BigDev before/at dev)

Mirroring 6.2's pattern; these are the recommended defaults. Decisions #1–#4 reflect BigDev direction (2026-07-08): deep-link handover reduced to a seam (#4); identity confirmation gates intake, nominee confirmation does not (AC2); `lookup_method` recorded as audit metadata, not a domain event field (AC3). #5–#7 remain recommended defaults to confirm at dev.

1. **Member lookup = shipped exact-match only** (`memberId | mobile | pariwar-browse`). Name/district/date fallback + Aadhaar search NOT built (D3-deferred; identity-feature territory). No-match → AR-61 escalation, not stub-claim.
2. **Stub-claim on no-match → OUT** (the primitive needs a real `deceased_member_id`; member-less claim + field dispatch are 6.7/Epic 12).
3. **Operator attribution → claim-scoped** (`events_log.actor_id` = operator admin actor id + audit; `claimant_actor_id: null`). Full helpdesk model = Story 10.3.
4. **Deep-link handover → flagged seam, NOT 6.3 infrastructure.** 6.3 builds no deep-link/token infra; the "convert to handover" affordance is a non-functional flagged seam; the whole handover (issue-side + mobile landing) defers to the mobile-deep-link-landing story. "Route for verification" is the primary post-intake action.
5. **Standard operator path emits NO nominee handover OTP** — operator authority + verbal read-back + the operator's own admin step-up (`requireStepUp('claim_file')`) is the trust anchor + the §2.2 fresh-OTP leg. The nominee-changed → handover-trust branch is 6.8.
6. **`claim.file` filing permission → helpline_operator + super_admin only** in v1 (not district/pariwar_admin, though they hold `claim.approve`).
7. **Console chrome English; read-back text bilingual (en/hi)** in `@twt/i18n` `claim.json`.

### Project Structure Notes

- **New — domain/RBAC:** `permissions.ts` (`claim.file` + version bump 6→7), `roles.ts` (grant to helpline_operator).
- **New — contracts:** `packages/contracts/src/claims/helpline.ts` (+ index wiring).
- **New — apps/api:** extend `apps/api/src/modules/claims/` with helpline handler + admin routes (parameterize the shared `initiateIntake`); register admin routes in the module barrel + audit-sink `helpline_claim.*` types.
- **New — apps/admin:** `src/modules/helpline-claims/{HelplineConsoleShell,ReadBackCard,HelplineClaimPage,i18n-en}.tsx`; `src/routes/HelplineClaimRoute.tsx`; router + RootLayout nav + api client/hooks additions. **Reuse** `modules/member-status/MemberLookupForm.tsx` + `MemberSearchResults.tsx` — do not fork search.
- **New — i18n:** helpline read-back keys in `packages/i18n/locales/{en,hi}/claim.json`.
- **No new domain schema expected.** Naming: DB snake_case, TS camelCase; tenant-agnostic internal component names (UX labels — "Priya", "Helpline Operator Console" — only in copy).

### References

- Epic 6 intro + Story 6.3 ACs — `_bmad-output/planning-artifacts/epics.md:2258–2341` (cross-cutting AR-61 note: 2280; 0.11-gated design freeze: 2276, 2332).
- UX — Journey 3 (Priya path) `ux-design-specification.md:1467–1513`; `<HelplineConsoleShell>` :1865–1872; `<MemberLookupForm>` :2087–2094; `<ReadBackCard>` :2096–2103; `<DocPathChooser>` :2105–2112 (6.5).
- Claim primitive — `packages/domain/src/claim/{events,state,project,read}.ts` (`claimActorSchema` :35; intake payload :90–97; `getClaimByDeceasedMember` in `read.ts`); `packages/domain/src/schema/claims.ts`; `member/overlay.ts:97` (freeze seam).
- The 6.2 intake core to parameterize — `apps/api/src/modules/claims/{claims.service.ts (initiateIntake), claims.handlers.ts, claims.routes.ts, index.ts}`; Story file `_bmad-output/implementation-artifacts/6-2-member-app-claim-filing-flow-ravi-mode.md`.
- RBAC — `packages/domain/src/rbac/{permissions.ts (SEED_PERMISSION_KEYS, PERMISSION_CATALOG_VERSION), roles.ts (helpline_operator bundle)}`; `packages/domain/tests/rbac/roles.test.ts`.
- Admin templates — `apps/admin/src/modules/member-status/{MemberLookupForm,MemberSearchPage,MemberSearchResults,i18n-en}.tsx`; `apps/admin/src/routes/MemberSearchRoute.tsx`; `apps/admin/src/api/{client,hooks}.ts`; `apps/admin/src/{router,routes/RootLayout}.tsx`; `apps/admin/tests/member-status-panel.test.tsx`.
- API admin-route template — `apps/api/src/modules/member-validity/routes.ts:20–92` (adminSession + scope + requirePermissionHook chain); step-up gate `apps/api/src/modules/step-up/gate.ts` (`requireStepUp`).
- Member search contract — `packages/contracts/src/members/validity.ts:156–194` (exact-match `MemberSearchRequest`; `aadhaarMasked` is display-only).
- Deep-link infra — `packages/contracts/src/deep-links/deep-link.ts` (Story 1.7+; `parseDeepLink` inert per deferred-work.md:1871).
- 0.11 un-attested gate — `_bmad-output/implementation-artifacts/deferred-work.md:887, 895–896, 905–906`; `0-11-p0-2d-operator-shadowing-completed.md`.

### Previous Story Intelligence (Story 6.2 — the twin caller)

- 6.2 landed the claims module (`apps/api/src/modules/claims`) + the `initiateIntake` core + `getClaimByDeceasedMember` + the `member_claim.*` audit types + the mobile `(claim)` group. It passed review 2026-07-08 with 18 review findings (17 Patch + 1 Defer; see 6.2 Review Findings) — notably: idempotent dedup filters terminal states; a `Promise.all` concurrent-intake test; audit on failed intake; timing-equalization on OTP existence-defense. 6.3 **reuses** the `initiateIntake` core (parameterize it) and the audit discipline; it does NOT reuse the handover-OTP machinery (operator path has no nominee OTP — see above).
- 6.2 flagged three gaps naming 6.3: (a) the helpline deep-link handover (6.2 built no deep-link entry); (b) 6.3 is the AR-61 "helpline can complete on Ravi's behalf" path both stories name; (c) both converge at 6.4 ICP. **6.3 delivers (b)** (the whole helpline intake path) and **(c)** (shared dedup accessor); **(a) is explicitly re-deferred as a seam** (Decision #4) — the deep-link handover lands with the mobile-deep-link-landing story, not 6.3, so 6.3 does not half-own inert deep-link infra.
- 6.2 confirmed the **v1 null-claimant policy** + `/api/v1/member/claims/...` route path for the member surface; 6.3's admin surface uses the `/api/v1/p/:pariwarId/admin/claims/...` form (the admin/verifier route family the 6.2 README + Dev Notes reserved for exactly this).

### Git Intelligence

Recent history is squarely on the Epic 6 claim substrate: `dd2eb6d` Story 6.1 (primitive) → `420ab85` Story 6.2 (member-app intake) → merges `bbcbf65`/`ba629c0`/`67aff3e`. The `initiateIntake` core + `member/overlay.ts` freeze seam + admin member-search + RBAC catalog are all fresh and merged — 6.3 is a wiring story over stable substrate. Commit manually (branch + selective stage, not the `commit-story` helper) per memory [[project_story_automator_ops]]; end the merge with `pnpm ci:local` green (memory [[project_ci_actions_suspension_local_mirror]] — Actions still suspended; local mirror is the gate).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Opus 4.8) — BMad dev-story workflow, 2026-07-09.

### Debug Log References

- `pnpm --filter @twt/domain test -- rbac` — RBAC catalog v7 + `claim.file` grant green (378 unit tests).
- `pnpm --filter @twt/contracts test -- claims-helpline` — helpline wire DTO shapes/gates green (7 tests).
- `pnpm --filter @twt/admin test -- helpline-console` — console component + gate tests green (12 tests).
- `DATABASE_URL=…:5433 pnpm vitest run tests/integration/claims/helpline-claim-intake.spec.ts` — E2E green (7 tests); `claims-intake.spec.ts` (6.2) regression green (10 tests).
- `DATABASE_URL=…:5433 pnpm ci:local` — **22 jobs green** (incl. claim-state-invariant, pii-scrape, access-wrapper-invariants, schema-diff, friction-budget, i18n-parity, integration-tests).

### Completion Notes List

**Load-bearing deliverable — the helpline `claim.intake_initiated` event — shipped exactly right.** Verified end-to-end: `intake_channel:'helpline'`, `actor:'operator'`, `events_log.actor_id` = the operator's admin actor id, snake_case `deceased_member_id` (the pinned freeze seam), `claimant_actor_id:null` (v1 null-claimant). The E2E drives `getMemberAccountOverlay` post-intake and asserts the deceased reads `accountFrozen:true` (per /verify discipline — not just a unit assert).

**Reused, did not re-derive, the intake core (the convergence point).** Parameterized `apps/api/src/modules/claims/claims.service.ts` `initiateIntake` with an optional `attribution` sub-object (`intakeChannel`/`actor`/`actorId`/`claimantActorId`/`trigger`) that defaults to the member-app values — the shipped 6.2 handler passes no attribution and is behaviourally unchanged (regression spec confirms). Both channels dedup against the SAME `getClaimByDeceasedMember`; the E2E proves a prior member_app claim → helpline intake returns the SAME `claimCaseId` with `created:false`, no second event, no second freeze (crude cross-channel convergence; RICH ICP visibility/override remains 6.4).

**Trust-model variance vs 6.2 (recorded).** No nominee handover-OTP on the operator path. §2.2's fresh-transactional-step-up-for-claim-filing is satisfied by the operator's OWN admin step-up: the route gates on `requireStepUp(deps,'claim_file')`. The console does NOT pre-elevate; a `StepUpRequiredError` (403 `auth.step_up_required`) from the intake POST is the signal to surface the step-up panel (request → verify → resubmit), per AC4. E2E asserts: claim.file holder without a fresh elevation → 403 auth.step_up_required, no freeze.

**AC2 HARD identity gate enforced on BOTH the wire and the UI.** `HelplineClaimIntakeRequest.identityReadBackConfirmed` is `z.literal(true)` (a `false`/absent value is a 400 — E2E-confirmed), and `<HelplineConsoleShell>` disables submit until the identity `<ReadBackCard>` is confirmed. The nominee-summary read-back is advisory — its confirmation state is never consulted for the gate (component test confirms nominee-un-confirmed does NOT block submit); it is deliberately NOT a wire field.

**`lookup_method` is audit metadata, never a domain fact (AC3).** Carried on the intake request (`z.enum(['memberId','mobile','pariwar'])`), recorded in the `helpline_claim.*` audit context, and asserted ABSENT from the `claim.intake_initiated` payload (which stays `.strict()`). PII discipline held: pii-scrape green; the E2E asserts no lookup_method in the payload and the audit context carries only ids + relationship + lookup_method + the operator id.

**Operator attribution is claim-scoped (Decision #3).** `events_log.actor_id` + `claims.created_by_actor` = the operator's admin actor id; the audit line tags the operator + `intake_channel:'helpline'`. The fuller helpdesk operator-attribution model (member-visible "We filed this for you — Operator [Name]", `created_via:helpline_call`) remains Story 10.3.

**Explicit deferrals (Resolved-via-explicit-deferral seams, per [[feedback_closure_language_precision]] — NOT omissions):**
- **Deep-link handover (Decision #4):** shipped as a flagged, NON-FUNCTIONAL seam — a disabled "Convert to member-app handover" control + a "coming soon" note. 6.3 builds no deep-link/token infra; the whole handover (issue-side + mobile landing) defers to the mobile-deep-link-landing story. "Route for verification" is the primary post-intake action.
- **Member lookup = shipped exact-match only** (`memberId|mobile|pariwar`), reusing the Story 4.7 `<MemberLookupForm>`/`<MemberSearchResults>` (no search fork). Name/district/date + Aadhaar search NOT built (the epic AC + Journey-3 wording reconciled toward the shipped reality; collides with [[project_membership_number_deferred_feature]]). No-match → AR-61 escalation, not a stub claim (the 6.1 primitive requires a real `deceased_member_id`).

**Integrity note — the Story 0.11 dependency is UN-ATTESTED (per [[feedback_record_unattested_no_backfill]]).** 6.3's design (UX-DR45/46) is the pre-shadowing RECOMMENDED DEFAULT, not a shadowing-validated one. Story 0.11's ≥4-hour operator shadowing + the 17 critical-hypothesis validations (`A-member-lookup-*`, `A-readback-3-field`, `A-operator-attribution-id`, `A-supervisor-escalation-on-non-standard`) remain AWAITING EXTERNAL ACTION. I did NOT reconstruct the shadowing to fake validation; shadowing-driven revisions land later (Epic 10 + a re-commitment with a gate). This is stated plainly as an integrity requirement, not buried.

**Two implementation variances flagged (deviations from the story's literal instruction, resolved toward shipped reality):**
1. **No RootLayout global nav `<Link>` for the helpline console.** `claim.file` is a PER-PARIWAR grant absent from the session's `nationalGrants` (like `member.view_validity`), and `RootLayout` has no `pariwarId` in scope, so a `to="/p/$pariwarId/helpline"` link cannot be constructed there. Mirrored the shipped member-search precedent: the tenant-scoped console is reached by URL, session-gated client-side, with the server permission hook as the real boundary. Added a `hasClaimFile` advisory helper for scope-resolved surfaces. (The story's "add the nav Link, mirror hasPariwarProvision" instruction assumed a national grant + a pariwar-less route, which does not match this per-Pariwar surface.)
2. **Idempotent/convergence hit returns HTTP 200 with `created:false`, not a 409.** The response DTO carries a `created` discriminator so the console branches cleanly ("a claim already exists for this member") without overloading status codes. Task 4's "409/created:false" wording is honoured semantically via the `created` field at 200.

**Substitutions/notes:** the bilingual read-back suggested text uses the server-safe `@twt/i18n` `t(key,params,{locale,namespace:'claim'})` resolver for BOTH en + hi (added `readback.identity.*` / `readback.nominee.*` keys with en/hi parity) — this does NOT wire the admin CHROME into the i18n runtime (chrome stays English via a local `i18n-en.ts`, the shipped `member-status/i18n-en.ts` precedent); only the read-back script the operator voices is bilingual (AC6). Added `@twt/i18n` as an `apps/admin` dependency.

### File List

**Domain / RBAC (catalog v6→7):**
- `packages/domain/src/rbac/permissions.ts` — appended `claim.file` to `SEED_PERMISSION_KEYS`; bumped `PERMISSION_CATALOG_VERSION` 6→7; comments.
- `packages/domain/src/rbac/roles.ts` — `CLAIM_FILE` handle; granted to `helpline_operator`.
- `packages/domain/tests/rbac/permissions.test.ts` — v7 / 16-key assertions + `claim.file` catalog test.
- `packages/domain/tests/rbac/roles.test.ts` — `claim.file` holders test (helpline_operator + super_admin only).

**Contracts:**
- `packages/contracts/src/claims/helpline.ts` — NEW: `HelplineClaimIntakeRequest` (+ `HelplineLookupMethod`) / `HelplineClaimIntakeResponse`.
- `packages/contracts/src/claims/index.ts` — export `./helpline.js`.
- `packages/contracts/tests/claims-helpline.test.ts` — NEW: strict + shape tests (identity literal-true gate, lookupMethod enum, no nominee field, `created` discriminator).

**apps/api:**
- `apps/api/src/modules/claims/claims.service.ts` — parameterized `initiateIntake` with the optional `attribution` sub-object (defaults to member-app); `HELPLINE_INTAKE_TRIGGER`; `IntakeAttribution`.
- `apps/api/src/modules/claims/claims.helpline.handlers.ts` — NEW: the scope-gated operator-intake handler (memberExists guard, shared-core call, audit).
- `apps/api/src/modules/claims/claims.helpline.routes.ts` — NEW: `POST /p/:pariwarId/admin/claims/intake` with the [adminSession, scope, requirePermissionHook(claim.file), requireStepUp('claim_file')] chain.
- `apps/api/src/modules/claims/index.ts` — register the helpline routes in `registerClaimsModule`.
- `apps/api/src/audit/audit-sink.ts` — registered `helpline_claim.{intake_initiated,intake_idempotent,intake_failed}` audit types.
- `apps/api/tests/integration/claims/helpline-claim-intake.spec.ts` — NEW: E2E (7 tests).

**apps/admin:**
- `apps/admin/src/api/client.ts` — `adminClaimsBase` + `initiateHelplineClaim` + `requestStepUp`/`verifyStepUp`.
- `apps/admin/src/api/hooks.ts` — `useHelplineClaimIntake` + `useRequestStepUp`/`useVerifyStepUp` + `hasClaimFile`.
- `apps/admin/src/modules/helpline-claims/i18n-en.ts` — NEW: English console-chrome map + bilingual `readBackScript` helper.
- `apps/admin/src/modules/helpline-claims/ReadBackCard.tsx` — NEW: identity + nominee-summary read-back card (confirm + correction log).
- `apps/admin/src/modules/helpline-claims/HelplineConsoleShell.tsx` — NEW: the two-pane shell (the intake gate, escalation, handover seam, step-up slot).
- `apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx` — NEW: the container (search → select → read-back → submit → step-up).
- `apps/admin/src/routes/HelplineClaimRoute.tsx` — NEW: the `/p/:pariwarId/helpline` session gate.
- `apps/admin/src/router.tsx` — registered the helpline route.
- `apps/admin/package.json` — added `@twt/i18n` dependency.
- `apps/admin/tests/helpline-console.test.tsx` — NEW: component + gate tests (12 tests).

**i18n:**
- `packages/i18n/locales/en/claim.json` + `packages/i18n/locales/hi/claim.json` — added `readback.{identity,nominee}.{title,script}` keys with en/hi parity.

### Change Log

- 2026-07-09 — Story 6.3 implemented (helpline-mediated claim filing + member lookup + read-back). RBAC catalog v6→7 (`claim.file` → helpline_operator); parameterized the shared `initiateIntake` core (member-app default, helpline override) as the cross-channel convergence point; new admin intake route + handler + `helpline_claim.*` audit; admin operator-console (shell + read-back cards + step-up + AR-61 escalation + flagged handover seam) reusing the shipped Story 4.7 search; bilingual read-back keys (en/hi). Deep-link handover deferred as a flagged seam (Decision #4); no-match → AR-61 escalation (stub-claim out). ci:local 22/22 green. Status → review.
