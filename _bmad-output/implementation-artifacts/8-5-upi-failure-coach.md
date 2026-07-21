---
baseline_commit: 1086ab9caa01982846ba66dfaeb37e67331927d1
---

# Story 8.5: UPI Failure Coach (FR-34 `[v1-S]`) `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Sushil whose UPI payment failed (insufficient balance, wrong PIN, app crash, network issue),
I want a coach surface that helps me name what went wrong and guides me to retry or seek helpline help,
so that I'm not stranded when UPI hiccups happen — and the trust learns which failures are most common without ever logging who I am or what I typed.

## Acceptance Criteria

_Elaborated from `epics.md:2947-2959` (Story 8.5) — the epics.md text is 3 short bullets; expanded here with the failure-path enumeration (AC1), the mode-appropriate guidance mapping (AC2), the D2 audit-mechanism decision (AC3), and the inherited Story 8.4/0.10 invariants (AC4/AC5) that bind it. Not verbatim._

**AC1 — Structured failure modes with empathy copy**
**Given** FR-34 `[v1-S]`
**When** the UPI failure coach is implemented
**Then** when the member returns from a UPI app **without pasting a UTR** (cancel/failure), **pastes an invalid UTR**, or hits the **no-UPI-app / launch-error** paths, the coach surface offers structured failure modes: **insufficient balance, wrong PIN, app issue, network issue, other** — each with empathy copy in the dignified-respectful register (Story 2.2 tone guide; never blaming the member).

**AC2 — Next-step guidance per mode**
**And** each mode offers next-step guidance drawn from: **retry the UPI Intent** (Story 8.4 — re-launch the same server-authoritative `upi://pay` URL), **switch to another UPI app** (per-app guidance), **call helpline** (Story 8.11 seam — reuse the existing `<CallHelplineCTA>`), **contact your bank**. The guidance shown is mode-appropriate (e.g. *insufficient balance* → contact bank / retry later; *network issue* → retry when connection returns; *app issue* → switch app; *wrong PIN* → retry).

**AC3 — Anonymous failure logging (no PII)**
**And** failure events are logged **anonymously for analytics tuning** — where "anonymous" refers to the **diagnostic content, not removal of the audit subject** (resolved decision, D2): the member's selected mode is recorded best-effort as a **member-attributed** audit action (`actorId = memberId`, per platform audit conventions) whose payload carries the **mode enum only** (no free-text, no UTR, no `tr`, no amount, no VPA, no typed "other" detail). The log is fire-and-forget; a failed POST never blocks the coach or the member's ability to retry/attest.

**AC4 — The coach is diagnostic only; it never fabricates a payment claim (inherited 8.4 invariant)**
**Given** the UTR-attestation-is-member-claim-not-confirmation invariant (Story 8.4, `epics.md:2935-2941`)
**When** the coach renders on any failure path
**Then** it emits **no `contribution.utr-attested` event** and creates no yellow pill — a failure/cancel leaves the member in `myContribution: 'none'`, free to retry (the idempotent `tr=` means a retry after a real payment still reconciles as one). The coach must preserve the out-of-band escape hatch: a member who actually paid can still reach the UTR-paste step and attest.

**AC5 — Accessibility (inherited Story 0.10 P0-2c gate)**
**Given** the inherited accessibility gate (Story 0.10 P0-2c) + UX-DR26 touch-target discipline
**When** the coach renders for assistive-tech users
**Then** every mode chooser control is an accessible button with an action-named `accessibilityLabel` (WCAG 2.5.3) and a ≥ adequate touch target; the mode-specific guidance is announced `polite`; the helpline CTA reuses the shipped affordance; Hindi-first parity + Latin operational numerals (amendment-A2) hold.

---

## Scope — what belongs to 8.5 vs what is a reserved seam

| **In scope (8.5 builds it)** | **Out of scope (seam only / owned elsewhere)** |
|---|---|
| The `<UpiFailureCoach>` diagnostic surface: the 5-mode chooser + per-mode empathy copy + per-mode next-step guidance, rendered inline in `pay.tsx` on the failure paths that 8.4 left as raw affordances (`noApp`, `launchError`, returned-without-UTR, invalid-UTR). | The **UTR self-attestation write path** (Story 8.4, DONE) — the coach re-uses the existing UTR-paste step; it does NOT add a new attest surface. |
| The **anonymous failure-report endpoint** + contract + api-client method: member-level audit line, mode-enum-only payload, best-effort (the Story 7.10 pool-onboarding-analytics precedent, exactly). | The **helpline dial-out** — `<CallHelplineCTA>` already exists (Story 6.2); 8.5 REUSES it. Story 8.11's cross-cutting placement work is separate — 8.5 just calls the component. |
| Enriched **"switch to another UPI app"** text guidance (naming the common apps). | **Per-app screenshot assets** (PhonePe/GPay/Paytm example screens, FR-34 headline) — asset-generation work; deferred unless assets already exist. Ship text guidance; note the screenshot gap as a forward commitment. |
| `upi_failure.*` bilingual copy in `packages/i18n/locales/{hi,en}/contribution.json` (hi+en parity, grade-6, dignified register). | The **orphan-UTR clipboard-recovery** flow (UX spec `:1068`) — a distinct richer failure mode; NOT in this story's AC. Note as a candidate follow-up, do not build. |
| The `contribution.tr_mismatch` / `unassigned` **stale-pool** recovery already lives in `pay.tsx` (8.4 review patch) — the coach must not regress it. | Epic 9 reconciliation, the yellow→green flip, retry-reminder pushes (Story 9.11 / 8.8) — untouched. |

## Tasks / Subtasks

- [x] **Task 1 — Contract: the anonymous failure-report DTO (AC3).**
  - [x] Add `packages/contracts/src/contributions/upi-failure.ts`: `UpiFailureModeSchema = z.enum(['insufficient_balance','wrong_pin','app_issue','network_issue','other'])` and `ContributionFailureReportRequest = z.object({ mode: UpiFailureModeSchema }).strict()`. **PII discipline:** NO free-text field for `other` (a free-text box would invite PII into the log — the AC forbids it). Plain `z` only — a contracts SOURCE file must NOT import `@twt/domain` (browser-bundle rule, `[[project_contracts_domain_bundle_boundary]]`).
  - [x] Barrel through `packages/contracts/src/contributions/index.ts` + `packages/contracts/src/index.ts` (the main index already re-exports `./contributions/index.js`, so the contributions-barrel edit is the only one needed).
  - [x] Add teeth in `packages/contracts/tests/contributions.test.ts`: `.strict()` rejects unknown keys; the enum rejects out-of-set values; assert the shape has **no free-text field** (structural guard against a future PII leak). — 445 contracts tests green (+5).

- [x] **Task 2 — API: the best-effort member-level failure-log endpoint (AC3).**
  - [x] Add `POST /api/v1/member/contribution/failure` to the **existing** `apps/api/src/modules/payment/` module (routes.ts + handlers.ts) — member-session-gated via `requireMemberSession` (auto-covered by the Story 1.14 login-wall CI gate; NOT on the public allowlist). Returns **204** (no body) — the fire-and-forget shape (the pool-onboarding precedent).
  - [x] Handler: emit ONE member-level audit line via `emitAuthAudit`. Added a `FAILURE_ACTION_BY_MODE` map (`satisfies Record<UpiFailureModeSchema, AuthAuditEventType>` — a future enum value with no mapping fails to compile) → `emitAuthAudit(deps, request, FAILURE_ACTION_BY_MODE[mode], { actorId, pariwarId })` with **no** context payload (mode is in the action name). Did NOT use `audit.writeAuditEntry` (different, disconnected sink).
  - [x] Register the 5 new action strings in `AuthAuditEventType` (`apps/api/src/audit/audit-sink.ts`), mirroring 8.4's `member_contribution.*` comment block.
  - [x] Hand-author the openapi entry: added the component + path in `packages/contracts/scripts/emit-openapi.ts`; regenerated `openapi/v1.yaml` (deterministic re-emit verified; the gate is a byte-identical re-emit, not a route-completeness check — the 8.4 intent/attest routes are likewise absent, so adding the failure route is strictly additive).
  - [x] Unit test `apps/api/tests/unit/payment-failure-report.test.ts` (DB-free, 6 tests): each mode → the correct `member_contribution.failure_<mode>` action via `emitAuthAudit`, no context payload, returns 204, requires a member session. Green; `login-wall.spec.ts` covers the session gate; API typecheck clean.

- [x] **Task 3 — api-client method (AC3).**
  - [x] Added `reportUpiFailure(mode)` to `createMemberAuthClient`, modelled on `recordPoolOnboardingOutcome` — `call(`${CONTRIBUTION_BASE}/failure`, ContributionFailureReportRequest.optional(), { mode }, true)` (used the sibling `${CONTRIBUTION_BASE}/…` form the 8.4 intent/attest methods use, rather than a redundant new base const); 204 short-circuits the schema (the `logout` idiom). Fire-and-forget at the call site. api-client typecheck clean.

- [x] **Task 4 — Mobile: the `<UpiFailureCoach>` surface (AC1, AC2, AC4, AC5).**
  - [x] New `apps/mobile/components/active-contribution/UpiFailureCoach.tsx`: a mode chooser (5 accessible 48pt buttons — ≥44pt, the default/comfortable category; 56pt stays reserved for the critical-primary `<UPIIntentButton>`) → on select, fire-and-forget `void memberAuth.reportUpiFailure(mode).catch(() => undefined)`, then reveal the mode-specific empathy copy + next-step guidance. Guidance reuses `<UPIIntentButton>` (retry, parent-passed `intent.upiUrl`), `<CallHelplineCTA>` (helpline), + text for "switch app" / "contact bank". A `GUIDANCE` map drives which steps show per mode; a `suggestedMode` prop pre-highlights (never auto-selects) a likely mode; a "choose a different reason" reset preserves correction.
  - [x] Wired into `apps/mobile/app/(contribution)/pay.tsx`: **replaced** the ad-hoc `noApp`/`launchError` `<Paragraph>` affordances with `<UpiFailureCoach suggestedMode="app_issue">`; also surfaced a second coach instance inside the UTR block for the returned-without-UTR / invalid-UTR path (gated `launched && !noApp && !launchError` so only ONE coach ever renders). **Preserved** the UTR-paste escape hatch (unchanged) and the 8.4 stale-pool auto-refetch-retry-once (`onConfirm` untouched). The coach fires NO attest / emits NO event (AC4) — diagnostic only.
  - [x] Accessibility: action-named `Select: …` labels on every mode button; guidance wrapped in `accessibilityLiveRegion="polite"`; no numerals in the coach copy (Latin-numeral discipline trivially held). Mobile build/test are repo no-ops → verified via `@twt/mobile` typecheck (exit 0) + lint (clean) + the domain/contracts/api suites.

- [x] **Task 5 — i18n copy (AC1, AC2, AC5).**
  - [x] Added 22 `upi_failure.*` keys to `packages/i18n/locales/{hi,en}/contribution.json`: the chooser prompt, the 5 mode labels + 5 action-named a11y labels, 5 per-mode empathy bodies, the guidance texts (retry / switch-app naming PhonePe·Google Pay·Paytm·BHIM / contact-bank / helpline label), and the change-answer affordance. Grade-6; dignified register (never "you failed" / "your fault" — "No problem — this happens", "It's easy to mistype a PIN"); no operational numerals present; hi+en parity — `pnpm i18n:check` ✓ and `pnpm microcopy:check` ✓.

- [x] **Task 6 — Gate the invariants + regression sweep.**
  - [x] `pnpm i18n:check` ✓, `pnpm --filter @twt/contracts test` ✓ (445), the payment API unit suite ✓ (payment-failure-report 6/6 + payment-contribution 10/10), `pnpm lint` ✓ (all touched packages), `pnpm typecheck` ✓ (contracts/api/api-client/mobile), the openapi-determinism + schema-diff gates ✓ (regenerated openapi committed). Ran `pnpm ci:local` with `DATABASE_URL` on :5433 — **27/28 jobs GREEN** (incl. lint, typecheck, build, contracts-determinism, schema-diff, friction-budget, microcopy, i18n-parity, pii-scrape, integration-tests, and every domain/pool/alert/claim state-invariant gate). The lone `test (unit)` failure was 4 rotating oversubscription/p95 FLAKES in packages 8.5 never touched (`@twt/channels` live-dispatch-cascade @5093ms; `@twt/validity-service` validity-cache D5-A @5086ms + measured-validation-fr12a p95 @15239ms + p95-bench @30063ms) — each CONFIRMED INNOCENT by isolation: `@twt/channels` 172/172 and `@twt/validity-service` 80/80 standalone (`[[project_ci_local_concurrency_oversubscription]]`, `[[project_known_livedb_test_failures]]`). No regression from this diff (contracts/api/api-client/mobile/i18n changes are additive-only).
  - [x] Recorded the friction-budget disposition (`friction-budget.md`, "Story 8.5 disposition"): the coach is a diagnostic aid on the FAILURE path that *reduces* friction; it lives behind the member session (NOT a public `apps/public` surface), so it does not enter the public page-weight budget — noted, did not ratchet (`[[project_friction_budget_baseline_ratchet]]`).

### Review Findings

- [x] [Review][Patch] Duplicate helpline/retry affordances render simultaneously once the coach shows guidance — RESOLVED (BigDev, 2026-07-21): lifted the coach's "mode selected" state to the parent via a new `onModeSelected` callback; the parent hides its `<CallHelplineCTA label={upi_intent.get_help}>` and the top-of-screen `<UPIIntentButton>` while the coach has a mode selected (the coach's own embedded helpline/retry take over during guidance; both reappear once the member taps "choose a different reason" or after a successful in-coach retry). [apps/mobile/app/(contribution)/pay.tsx; apps/mobile/components/active-contribution/UpiFailureCoach.tsx]
- [x] [Review][Patch] Stale `noApp`/`launchError` flags never reset after a successful in-coach retry, leaving the failure-coach UI rendered alongside the now-active UTR-paste/confirm form — FIXED: a shared `onCoachRetryLaunched` handler now clears `noApp`/`launchError` (and `coachGuidanceShowing`) on a successful embedded retry. [apps/mobile/app/(contribution)/pay.tsx]
- [x] [Review][Patch] Coach's embedded retry silently swallows a second no-app/launch-error failure (`onNoUpiApp`/`onLaunchError` both no-op) — FIXED: both now set a local `retryFailedAgain` flag that renders a `upi_failure.retry_failed_again` alert (new bilingual key) instead of doing nothing. [apps/mobile/components/active-contribution/UpiFailureCoach.tsx]
- [x] [Review][Patch] Rapid double-tap on a mode-chooser button before re-render can fire two `reportUpiFailure` calls for two different modes from one failure event — FIXED: a `selectingRef` guard in `onSelect` ignores any further tap once a mode has been picked (reset on "change answer"). [apps/mobile/components/active-contribution/UpiFailureCoach.tsx]
- [x] [Review][Patch] Retry guidance section silently disappears with no explanation when `upiUrl` is undefined for a retry-eligible mode — FIXED: a fallback `upi_failure.retry_unavailable` message (new bilingual key) now renders when `g.retry` is true but `upiUrl` is absent. [apps/mobile/components/active-contribution/UpiFailureCoach.tsx]

- [x] [Review][Defer] No correlation/attempt ID on the failure-report audit line — re-selecting a mode via "Choose a different reason" fires a second unlinked audit row for the same failed attempt, can skew "most common failure" analytics [apps/mobile/components/active-contribution/UpiFailureCoach.tsx; apps/api/src/modules/payment/handlers.ts] — deferred, not required by AC3, consistent with the story's stated best-effort/no-dedup design
- [x] [Review][Defer] Coach's embedded retry re-launches with the parent's already-fetched `upiUrl` rather than the 8.4 `onConfirm` auto-refetch-retry-once mechanism — narrow edge case if pool assignment changes mid-recovery [apps/mobile/components/active-contribution/UpiFailureCoach.tsx] — deferred, pre-existing (`UPIIntentButton` itself doesn't auto-refresh either), out of this story's stated scope
- [x] [Review][Defer] No rate limiting/dedup/abuse control on the fire-and-forget failure-report endpoint [apps/api/src/modules/payment/routes.ts] — deferred, platform-wide gap shared by other best-effort analytics endpoints (e.g. pool-onboarding outcome), not specific to this story
- [x] [Review][Defer] Client-side telemetry failures (incl. 401/session-expiry) are swallowed identically with zero observability [apps/mobile/components/active-contribution/UpiFailureCoach.tsx] — deferred, matches the explicitly-directed PoolOnboardingTutorial fire-and-forget idiom (D3), spec-compliant not a deviation
- [x] [Review][Defer] Reusing the "yellow" theme for `suggestedMode` pre-highlight risks colliding with this flow's established "yellow pill = attested/pending" semantic [apps/mobile/components/active-contribution/UpiFailureCoach.tsx] — deferred, minor visual-design judgment call, not a functional defect

## Dev Notes

### D0 — Read Story 8.4 FIRST; 8.5 finishes the seam 8.4 deliberately left

8.4 (`8-4-upi-intent-flow-...md`, DONE) shipped the UPI Intent + UTR self-attestation + yellow pill, and its **D9** states explicitly: *"Story 8.5 (UPI Failure Coach) is backlog. 8.4 leaves the navigable link/affordance from the failure paths (no-app, returned-without-UTR, invalid-UTR) to where 8.5 will land — the same 'seam, not consumer' discipline 8.3 used for Epic 9. Do NOT build the coach's diagnostic modes here."* This story is that build. **Read `apps/mobile/app/(contribution)/pay.tsx` in full before touching it** — the failure branches you are replacing are `noApp` (`:247`), `launchError` (`:250`), and the UTR-paste block (`:256`). What must be preserved: the `attested` yellow-pill confirmation, the loading/load-failed states, the no-VPA/`unassigned` fail-soft (`:199`), and the stale-pool auto-refetch-and-retry-once (`:117-133`, an 8.4 review patch — regressing it re-opens a fixed dead-end).

### D1 — The coach is MEMBER-DECLARED, not app-detected

UPI Intent (`upi://pay`) does **not** return a structured, trustworthy failure reason to the merchant app on return — Android's intent-result surface is unreliable across UPI apps and OEMs. So the coach cannot *diagnose*; it *asks*. The 5 modes are a member self-classification chooser, not an inferred verdict. This is why the analytics value is "which failures members report", not "which failures occurred" — write the copy and the log semantics accordingly (the audit action is `member_contribution.failure_<reported-mode>`, via `emitAuthAudit` — see D2).

### D2 — "Anonymous" = no PII in the failure detail, via the `payment/` module's OWN audit convention (not pool-onboarding's)

The AC's "logged anonymously … no PII in failure logs" is satisfied by the pattern **`payment/handlers.ts` already established in this exact module**: `emitAuthAudit` with the diagnostic signal encoded in the **action name** (8.4's `member_contribution.intent`/`.attested`/`.failure`; here: `member_contribution.failure_<mode>`). This is a validation correction — an earlier draft of this story pointed at `pool-onboarding/handlers.ts`'s `audit.writeAuditEntry` as "the exact pattern to copy," but that is a *different* mechanism (`resourceLocator`/`requestPayloadHash`/`responseStatus`, consumed by nothing in `payment/`) than the one `payment/handlers.ts` actually uses today. `emitAuthAudit` binds `actorId = memberId` — that is the audit *subject*, not "PII in the failure log"; the **content** (the mode, carried entirely in the action name) has no PII. **Do NOT** add a free-text `other` detail field anywhere in the contract, client, or UI — that is the one change that would break this invariant. If product later wants free-text, that is a separate consented surface, not this log.

> **Resolved (BigDev, 2026-07-21):** keep the **member-level audit line** (`actorId = memberId`), mode-enum-only signal. Record the project decision verbatim in the Dev Agent Record / commit:
>
> > *The audit record remains member-attributed according to platform audit conventions; the failure payload contains no user-entered or transaction-specific information. "Anonymous" refers to the diagnostic content, not removal of the audit subject.*
>
> Consequences the dev agent must honor: (a) do **not** build an actor-less / bespoke sink — use `emitAuthAudit` with `actorId = memberId` (the `payment/handlers.ts` precedent Story 8.4 already established — **not** `audit.writeAuditEntry`, which is a different, unrelated mechanism); (b) the "anonymity" is enforced entirely by the **action name** — mode only, no free-text, no UTR/`tr`/amount/VPA anywhere in the call — so the contract's no-free-text guard (Task 1) is the load-bearing teeth for this decision; (c) per-member attribution is intentional (enables de-dup of repeat reporters and normal audit traceability), not a leak.

### D3 — Reuse, do NOT re-invent

- `<CallHelplineCTA>` (`apps/mobile/components/claim/CallHelplineCTA.tsx`) — the helpline dial-out already exists (Story 6.2) and 8.4 already imports it into `pay.tsx`. Pass `label` for coach-specific copy; it already supports the prominent variant (`chromeless={false}` + `theme` + `height`). Do not re-implement `tel:` linking.
- `<UPIIntentButton>` (`apps/mobile/components/active-contribution/UPIIntentButton.tsx`) — the retry affordance IS re-launching this button with the current `intent.upiUrl`. It already distinguishes `onNoUpiApp` / `onLaunchError` proactively (an 8.4 review patch) — feed those back into the coach's mode pre-selection if helpful (e.g. a launch error can pre-highlight "app issue"), but the member still confirms the mode.
- The fire-and-forget analytics call site pattern — copy `PoolOnboardingTutorial.tsx:120` (`void memberAuth.reportUpiFailure(mode).catch(() => undefined)`).

### D4 — Server-authoritative + module placement

The failure endpoint belongs in the **existing** `apps/api/src/modules/payment/` module (8.4's `registerPaymentModule`), not a new module — it is the same member-contribution surface. Both existing payment routes are body-returning POSTs; the new one is a 204 fire-and-forget, so follow the pool-onboarding 204 shape (`void reply.status(204).send()`). Watch the Fastify onSend double-send hazard only if you add an `onSend` hook — you should not (`[[project_fastify_onsend_doublesend]]`).

### D5 — Do NOT touch (frozen / other-epic-owned)

The `contribution.utr-attested` event + `attestContributionUtr` write + the yellow-never-confirmed teeth (8.4); the Epic 9 reconciliation / green flip; `CANONICAL_CHANNEL_LADDER` / dispatcher (Epic 5); the pool assignment engine (7.4). 8.5 adds a diagnostic surface + an analytics audit line — it changes **no** state machine and no financial-truth path.

### Testing standards

- **Contracts (DB-free, Vitest):** `.strict()` rejection, enum bounds, and the structural **no-free-text-field** guard (`packages/contracts/tests/contributions.test.ts`).
- **API (DB-free unit):** handler maps each of the 5 modes → the correct `member_contribution.failure_<mode>` action via `emitAuthAudit`, returns 204, requires a member session (mirror `apps/api/tests/unit/payment-contribution.test.ts`).
- **No new live-DB integration is strictly required** (the write is a single audit line via the shared audit accessor, already integration-covered elsewhere). If you add one, follow `[[project_live_db_test_gotchas]]` (no migration regen; no `DROP SCHEMA`; membership not counts; `twt-test-pg` on :5433) and `[[project_known_livedb_test_failures]]` (suite-level `{timeout:20000}` if it trips the concurrent-load class).
- **Mobile:** build/test are repo no-ops → the gate is `pnpm typecheck` + `pnpm lint` + `pnpm i18n:check` + the domain/contracts/api suites.

### Project Structure Notes

- New files: `packages/contracts/src/contributions/upi-failure.ts`; `apps/mobile/components/active-contribution/UpiFailureCoach.tsx`; a unit test under `apps/api/tests/unit/`.
- Edited: `packages/contracts/src/contributions/index.ts` + `src/index.ts` + `tests/contributions.test.ts`; `packages/api-client/src/index.ts` (one method + base const); `apps/api/src/modules/payment/{routes,handlers}.ts`; `apps/api/src/audit/audit-sink.ts` (5 action strings); `packages/contracts/scripts/emit-openapi.ts` + regenerated `openapi/v1.yaml`; `apps/mobile/app/(contribution)/pay.tsx`; `packages/i18n/locales/{hi,en}/contribution.json`; `friction-budget.md`; `sprint-status.yaml` ledger.
- No new package (a component + a contract shape + a handler is not a cross-package reuse surface — `[[feedback_no_premature_package]]`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-8.5] (`:2947-2959`) — the 3 ACs (failure modes + per-mode guidance + anonymous logging); (`:2932`) 8.4's failure-path link to 8.5; (`:3049`) Story 8.11 `<CallHelplineCTA>` placement includes "UPI failure coach (Story 8.5)".
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-34] (`:629`) — "UPI failure coach with per-app guidance `[v1-S]`"; the headline names PhonePe/GPay/Paytm screenshot examples (screenshots deferred — see Scope).
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Failure-Modes] (`:1062-1071`) — network-failure retry surface, orphan-UTR clipboard recovery (a distinct follow-up, not this AC), late-payment posture; the dignified "Humari team…" register.
- [Source: _bmad-output/implementation-artifacts/8-4-upi-intent-flow-...md] — D9 (the seam this story fills), the `pay.tsx` failure branches, the `<CallHelplineCTA>`/`<UPIIntentButton>` reuse contracts, the yellow-never-confirmed invariant (AC4).
- [Source: apps/api/src/modules/pool-onboarding/handlers.ts + routes.ts; packages/contracts/src/pool-onboarding/tutorial.ts; packages/api-client/src/index.ts:694] — the exact best-effort, member-level, non-PII, 204 analytics-log precedent to copy.
- [Source: apps/mobile/app/(contribution)/pay.tsx; components/active-contribution/UPIIntentButton.tsx; components/claim/CallHelplineCTA.tsx; components/pool-onboarding/PoolOnboardingTutorial.tsx:120] — the surfaces/components 8.5 wires and the fire-and-forget call-site idiom.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-dev-story workflow.

### Debug Log References

- `pnpm --filter @twt/contracts test` → 445 pass (+5 Story 8.5 shape/PII-guard tests).
- `pnpm --filter @twt/api test` → `payment-failure-report.test.ts` 6/6, `payment-contribution.test.ts` 10/10 (unchanged), `login-wall.spec.ts` green (session gate).
- `pnpm --filter @twt/{api,api-client,mobile} typecheck` → clean; `pnpm --filter @twt/{contracts,api-client,api,mobile,i18n} lint` → clean.
- `pnpm contracts:emit-openapi` → deterministic re-emit (`contracts:check-openapi-determinism` ✓); `pnpm schema:check` ✓; `pnpm i18n:check` ✓; `pnpm microcopy:check` ✓; `pnpm friction:check` ✓.
- `DATABASE_URL=…:5433 pnpm ci:local` → 27/28 jobs green; the 4 `test (unit)` failures were oversubscription/p95 flakes in untouched `@twt/channels` + `@twt/validity-service`, each cleared by isolation (172/172 and 80/80 standalone).

### Completion Notes List

- **D2/AC3 audit mechanism honored:** the failure-report is a member-level `emitAuthAudit` line whose diagnostic signal lives ENTIRELY in the action name (`member_contribution.failure_<mode>`, 5 new `AuthAuditEventType` strings) — NO `context` payload, no free-text, no UTR/tr/amount/VPA. Did NOT use `audit.writeAuditEntry` (a different, disconnected sink). Recorded the BigDev decision verbatim: *"The audit record remains member-attributed according to platform audit conventions; the failure payload contains no user-entered or transaction-specific information. 'Anonymous' refers to the diagnostic content, not removal of the audit subject."* The load-bearing teeth are the contract's no-free-text `.strict()` shape (Task 1) + the structural "exactly one key = `mode`" test.
- **AC4 diagnostic-only preserved:** `<UpiFailureCoach>` emits no `contribution.utr-attested` event and creates no yellow pill; it only fires the fire-and-forget analytics call + reuses `<UPIIntentButton>`/`<CallHelplineCTA>`. The UTR-paste escape hatch in `pay.tsx` and the 8.4 stale-pool auto-refetch-retry-once (`onConfirm`) are untouched. Exactly ONE coach ever renders (the returned-without-UTR instance is gated `launched && !noApp && !launchError`).
- **openapi curation note:** the schema-diff/openapi gate is a byte-identical **re-emit determinism** check, NOT a route-completeness check — 8.4's sibling `intent`/`attest` routes are (still) absent from `openapi/v1.yaml`. Adding the `failure` route per the story is therefore strictly additive and safe (determinism re-verified).
- **Minor deviations from the story letter (both benign):** (a) the api-client uses the sibling `${CONTRIBUTION_BASE}/failure` form the 8.4 intent/attest methods use, not a new `CONTRIBUTION_FAILURE_BASE` const; (b) mode-chooser buttons are 48pt (≥44pt, the story's floor). The unused `upi_intent.no_app_guidance`/`upi_intent.launch_error` keys are left in both locales (harmless; the coach replaced their only call sites).
- **Deferred (forward commitments, unchanged from the story Scope):** per-app screenshot assets (FR-34 headline — ship text guidance naming PhonePe/Google Pay/Paytm/BHIM); the orphan-UTR clipboard-recovery flow (UX `:1068`). The nominee-VPA-collection seam (8.4 D1) remains owed — until it lands, the coach's retry path is exercised via the `{available:false}` fail-soft, and the live 90s UPI loop stays non-device-demoable.

### File List

**New**
- `packages/contracts/src/contributions/upi-failure.ts` — `UpiFailureModeSchema` + `ContributionFailureReportRequest` (`.strict()`, mode-only).
- `apps/api/tests/unit/payment-failure-report.test.ts` — DB-free handler-wiring test (6 tests).
- `apps/mobile/components/active-contribution/UpiFailureCoach.tsx` — the 5-mode diagnostic coach surface.

**Modified**
- `packages/contracts/src/contributions/index.ts` — barrel the new module.
- `packages/contracts/tests/contributions.test.ts` — Story 8.5 shape + no-free-text PII-guard teeth.
- `packages/contracts/scripts/emit-openapi.ts` — import + component + `POST /contribution/failure` path.
- `openapi/v1.yaml` — regenerated (adds the `ContributionFailureReportRequest` component + failure path).
- `apps/api/src/audit/audit-sink.ts` — 5 `member_contribution.failure_<mode>` action strings.
- `apps/api/src/modules/payment/handlers.ts` — `FAILURE_ACTION_BY_MODE` + the `reportFailure` handler.
- `apps/api/src/modules/payment/routes.ts` — the `POST /api/v1/member/contribution/failure` route (204).
- `packages/api-client/src/index.ts` — `reportUpiFailure(mode)` + imports.
- `apps/mobile/app/(contribution)/pay.tsx` — wire `<UpiFailureCoach>` (replaces the ad-hoc no-app/launch-error paragraphs; adds the returned-without-UTR instance).
- `packages/i18n/locales/{en,hi}/contribution.json` — 22 `upi_failure.*` keys (hi+en parity).
- `friction-budget.md` — Story 8.5 disposition (declaration affirmed, no new row, no ratchet).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — ledger flip.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-21 | 0.1 | Story drafted (ready-for-dev) — bmad-create-story context-engine pass over epics 8.5 + 8.4 seam + FR-34 + the Story 7.10 anonymous-analytics precedent. | bmad-create-story |
| 2026-07-21 | 0.2 | Validation pass (independent QA re-analysis against source): corrected Task 2/D1/D2's audit mechanism from the pool-onboarding `audit.writeAuditEntry` pattern to `emitAuthAudit` — the mechanism `payment/handlers.ts` already established in Story 8.4 for `member_contribution.intent`/`.attested`/`.failure`; using `writeAuditEntry` would have built a second, disconnected audit path in a module that already has a working one. Relabeled the AC block as "elaborated from" rather than "verbatim" (epics.md:2947-2959 is 3 short bullets; the ACs here add the failure-path enumeration, mode-guidance mapping, and inherited invariants). Corrected Task 4's mode-chooser touch target from an ungrounded ≥48pt to ≥44pt (the UX spec's committed default category; 56pt is reserved for the single critical-primary action). | bmad-create-story (validate) |
| 2026-07-21 | 1.0 | Implemented all 6 tasks (bmad-dev-story). Contract `ContributionFailureReportRequest` (mode enum only, no free-text) + barrel + PII-guard shape teeth; `POST /api/v1/member/contribution/failure` (204, member-session-gated) emitting `member_contribution.failure_<mode>` via `emitAuthAudit` (mode in the action name, no context payload) + 5 audit-sink action strings + openapi entry + DB-free unit test (6/6); `reportUpiFailure(mode)` api-client method; `<UpiFailureCoach>` (5-mode chooser + per-mode empathy + next-step guidance reusing `<UPIIntentButton>`/`<CallHelplineCTA>`) wired into `pay.tsx` (diagnostic-only, escape hatch + stale-pool retry preserved); 22 bilingual `upi_failure.*` keys; friction-budget disposition. All static gates + integration-tests green via `ci:local` (:5433); the sole `test (unit)` failures were untouched-package oversubscription/p95 flakes, cleared by isolation. | bmad-dev-story (claude-opus-4-8) |
