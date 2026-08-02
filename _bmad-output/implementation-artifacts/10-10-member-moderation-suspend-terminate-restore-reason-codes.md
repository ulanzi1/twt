---
baseline_commit: c35571c3c7480c7545b9f0f7509681f945ed5bd3
---

# Story 10.10: Member Moderation — Suspend / Terminate / Restore + Reason Codes `[SURFACE]`

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trustee/admin holding `member.moderate`,
I want to suspend, terminate, or restore a member with a structured reason code + a mandatory free-text rationale, under step-up OTP and full audit,
so that abuse / fraud / regulatory issues are addressed with complete traceability — and so a suspended member is told, in dignified prose, exactly what happened and how to appeal.

## Scope Boundary (read first — prevents over-build AND under-build)

**10.10 is the LAST `[SURFACE]` of Epic 10's operations family, and it is the ONLY one that touches the member's own event stream.** Unlike 10.5 / 10.9 (mutable authored content) this story writes `member.*` events to `events_log` — but it does **NOT** add a `member_lifecycle_state` enum label and does **NOT** touch `members.state`, the projector, the state-writer trigger, or the `member-state-invariant` CI gate. **Read Decision 1 before writing a line — it is the whole story.**

**Four forward commitments already written into the codebase are waiting for THIS story.** They are not suggestions; they are the acceptance shape:

1. `apps/jobs/src/assignable-roster.ts:43-52` — "*NOT suspension / renewal or any other subfield … every one of those is **already folded into `is_valid`***". Pool assignability must learn about suspension via `is_valid` and **nothing else**. `apps/jobs` gets **zero** changes ([[project_assignability_predicate_is_isvalid_only]], the frozen AI-7-2 invariant).
2. `apps/api/src/modules/auth/member/member-auth.service.ts:198-201` — "*belt-and-suspenders over the suspension cascade (`revokeAllMemberSessions`), **which a later epic wires***". This story wires it (`architecture.md:1433-1434`).
3. `packages/ui/src/member-status/view-model.ts:19` + `presenter.ts:62,64` — the `suspended-with-reason` headline state already exists but is derived **only** from `concealmentFlagged`. This story becomes its second producer.
4. `prd.md:411` — `special_flags[], // e.g., "suspended_per_R7E"`. The PRD itself models suspension as a **validity flag**, not a lifecycle state.

| In scope (10.10) | Out of scope → owning story / seam |
|---|---|
| **The moderation overlay** (Decision 1): NEW `packages/domain/src/member/moderation/` — three `member.moderation.*` events on the MEMBER's stream, a pure `nextModerationStatus` legality reducer, a pure `evaluateModerationOverlay` fold, and `getMemberModerationOverlay(db, memberId, at)`. Modelled on the shipped `member/overlay.ts` account-frozen overlay. | Two new `member_lifecycle_state` enum labels + reducer arms → **considered and rejected** (Decision 1). No `ALTER TYPE`, no §1.14 architecture amendment. |
| **`member_moderation_actions`** (NEW migration `0091`): the append-only decision record — `moderation_action_id` PK, `pariwar_id` (RLS), `member_id`, `action` (`suspend\|terminate\|restore`), `reason_code`, `rationale_ciphertext` (**Tier-1**), `actor_id`, `actor_display` (snapshot), `rejoin_permitted_at` (terminate only), `acted_at`. Written in the SAME tx as the event append. | A mutable `moderation_status` column → rejected; status is DERIVED from the stream (Decision 1). The table holds only what a plaintext JSONB payload may not carry. |
| **The reason-code registry** (Decision 3): a frozen code-level `as const` tuple + metadata map in `moderation/reason-codes.ts` (the `verifier_reason_code` / `state_trustee_reason_code` precedent). 7 moderation codes + 3 restore codes, each PRD/Niyamavali-anchored. | A per-Pariwar versioned DB registry (the 10.1 routing-policy shape) → rejected (Decision 3): a tenant must not be able to invent its own grounds for termination. |
| **`is_valid` folds moderation in** (Decision 8): `deriveIsValid(state, moderationStatus)` in `packages/validity-service/src/payload.ts`; `specialFlags` gains `suspended_per_<code>` / `terminated_per_<code>` (the `prd.md:411` form). **This one edit is the entire enforcement surface** — pool assignment, claim eligibility and the rules engine all inherit it with no change of their own. | Editing `assignable-roster.ts`, `peer-mesh-read.ts`, the niyamavali `member_state_in` operator, or any of the five `TERMINAL_STATES` Sets → **forbidden**; touching them would break the frozen invariant in commitment #1. |
| **The suspension cascade** (Decision 6): `revokeAllMemberSessions(db, memberId, now)` — deletes every `member_refresh_tokens` chain + `member_trusted_devices` binding on suspend AND terminate (`architecture.md:1433-1434`). | Blocking login for suspended/terminated members → **explicitly rejected** (Decision 6): they must be able to sign back in and read *why*, with the appeal CTA. Their standing is enforced by `is_valid`, not by a locked door. |
| **The rejoin lock extension**: the pre-scope BYPASSRLS signup guard (`member-auth.repo.ts:51-69` / `signup.handlers.ts:108-127`) additionally treats moderation-`terminated` as terminal, sourcing `rejoin_permitted_at` from `member_moderation_actions` (FR-56 → FR-6, 12 months). | Writing a fake `member_withdrawals` row on termination → rejected; termination is not voluntary and must not masquerade as withdrawal. |
| **Step-up OTP on every action** (Decision 5) — three distinct action contexts. **The first Epic-10 story that IS step-up-gated.** | — |
| **Member notification** (Decision 7): enqueue a job from `apps/api`; an `apps/jobs` worker owns the fan-out (the `news-publish.ts` precedent). Category = `alert_published`. | Calling `fanOutAlertToMembers` inline in `apps/api` → **forbidden** (the 10.4 crypto boundary: apps/api carries ADMIN-identity keys). A 10th `AlertCategory` → rejected (Decision 7). Repeating 10.4's log-only console-notifier stopgap → rejected; it is still an open HIGH gap. |
| **Admin UI** — extend the EXISTING `apps/admin/src/modules/member-status/` (the Story 4.7 member-record surface UX names at `ux-design-specification.md:1894`). Moderation action strip + reason-code dropdown + confirmation modal + step-up + history. | A NEW admin module → rejected; 4.7's lookup + panel IS the member-record view. Do not cross-wire with a sibling module ([[project_story_validate_footguns]]). |
| **Member UI** — `<MemberStatusPanel>` gains moderation as a headline producer (+ the new `terminated-with-reason` state) with dignified, non-punitive copy per UX Stance #5. | A new member-facing moderation screen → out; the panel is the committed surface. |
| **`listModeratedMembersForPariwar`** — the read Story 10.11 consumes (Decision 9). | Inventing a pending/approval QUEUE workflow → out; 10.10's AC defines none. See Decision 9's forward commitment. |
| **RBAC: gate on the EXISTING `member.moderate` key. NO new key, NO catalog bump — `PERMISSION_CATALOG_VERSION` stays 28.** | Minting a key; granting `member.moderate` to `state_trustee` (INERT — Decision 4); using `member.suspend` (Decision 4). |
| Contracts DTOs + reason-code sync-guard + `emit-openapi.ts` + `openapi/v1.yaml` regen; en/hi parity for all new member-facing copy. | — |

## Acceptance Criteria

**AC1 — Moderation is an event-derived OVERLAY; `members.state` is never touched.**
Given `architecture.md:1236-1241` (member state is derived from event history) and the shipped `member/overlay.ts` precedent,
When moderation is implemented,
Then three event types are added to the member's own stream (`stream_id = member_id`) — `member.moderation.suspended`, `member.moderation.terminated`, `member.moderation.restored` — registered in `EVENT_TYPE_REGISTRY` with `.strict()` payload schemas (three-segment names are legal: the `cycle.spawn.started` precedent at `packages/events/src/registry.ts:332`);
And **`MEMBER_LIFECYCLE_STATES` is UNCHANGED** — no `ALTER TYPE`, no new enum label, no lifecycle-reducer arm, no projector edit, no `app.member_state_writer` trigger change, and **no addition to the `member-state-invariant` CI-gate allowlist**; the lifecycle reducer's `default: return state` (`member/state.ts:122-123`) makes all three events IDENTITY on `members.state` by construction, and a test pins exactly that;
And a pure `evaluateModerationOverlay(events)` folds an ordered event list to `{ status: 'none' | 'suspended' | 'terminated', reasonCode, since, lastActionAt }` — no I/O, no clock, deterministic and replay-safe, with `now`/ordering injected (the `evaluateAccountOverlay` shape);
And `getMemberModerationOverlay(db, memberId, atTimestamp)` is the single query surface, reading the member's stream bounded by the instant and ordered by `event_version` (single-stream — unlike the multi-stream account-frozen overlay, no `occurred_at` tiebreak is needed).

**AC2 — The moderation state machine is a total, pure legality reducer.**
Given PRD FR-56's `active ↔ suspended → terminated` (`prd.md:849`),
When a moderation action is requested,
Then a pure `nextModerationStatus(status, action)` returns the next status or `null` for an illegal transition, with exactly these legal arms: `none --suspend--> suspended`, `suspended --terminate--> terminated`, `suspended --restore--> none`, `terminated --restore--> none`;
And **`none --terminate--> terminated` is ILLEGAL** — FR-56's arrow diagram routes termination *through* suspension, so the harshest action requires a deliberate two-step and can never be a single click (Decision 2);
And an illegal transition is rejected with a typed **409 BEFORE any write** (the `nextTicketState` / `nextBannerStatus` discipline) — a no-op never returns 200;
And re-suspending an already-suspended member is likewise a 409, not a silent second event.

**AC3 — Reason codes are registry-driven; the rationale is mandatory and Tier-1 encrypted.**
Given `epics.md:3549` (registry-driven codes + free-text rationale required + audit-logged) and `prd.md:852`,
Then `moderation/reason-codes.ts` declares ONE frozen `as const` tuple per family plus a metadata map (`{ code, appliesTo, niyamavaliRef, label }`) — moderation codes `r7-contribution-discipline`, `r14-forgery`, `r10a-parallel-org-office`, `concealment-confirmed`, `helpdesk-escalated-abuse`, `regulator-action`, `voluntary-pending-review`; restore codes `rule-clearance` (R7(A) — 3 consecutive contributions), `trustee-discretion` (R5(D)/R10(D)), `moderation-error` (`prd.md:853`);
And a code whose `appliesTo` does not include the requested action is rejected with a typed **422** (a restore code can never justify a termination);
And a **free-text rationale is REQUIRED on every action** (not only on an "other" code — this is stricter than the UX `<ReasonCodeDropdown>` `other-text-required` state at `ux-design-specification.md:2067-2074`), stored **Tier-1 encrypted** in `member_moderation_actions.rationale_ciphertext`;
And the `events_log` payload carries the **reason CODE only** — never the rationale, never the member's name (the plaintext-JSONB discipline of `member.nominees_declared` / `member.medical_disclosed` / `member.address_updated`); an empty or whitespace-only rationale is a typed 422.

**AC4 — Every action is attributed, audited, and step-up gated.**
Given `epics.md:3550` + AR-24 + Story 1.10,
Then every route composes `[requireAdminSession, scopeResolutionHook, requirePermissionHook(deps, 'member.moderate', { dimension: 'pariwar' }), requireStepUp(deps, CTX)]` — step-up **LAST**, after the permission hook, "so an unauthorized actor never reaches step-up" (the stated invariant in `claims.cycle-freeze.routes.ts:17`), with **three distinct action contexts** (`member_moderation_suspend` / `_terminate` / `_restore`) so an elevation minted for a restore can never be spent on a termination (the reconciliation-review four-context precedent);
And the acting admin's `users.display_name` is snapshotted into `member_moderation_actions.actor_display` at action time; a **missing display name BLOCKS the action with a typed error — no email-derived fallback** ([[project_admin_display_name_attribution]]);
And a Story 1.10 audit line is written per action (`member_moderation.suspended` / `.terminated` / `.restored`) on `deps.servicePool`, fire-and-forget, with `resourceLocator = member:moderation:<memberId>` and `requestPayloadHash = sha256(`${action}:${memberId}`)` — **the rationale is NEVER audited** (the `banners/handlers.ts:104-120` pattern verbatim);
And this is the **first Epic-10 story that IS step-up-gated** — record that break from the 10.3/10.4/10.5/10.8/10.9 "NOT step-up-gated" chain in the Dev Agent Record.

**AC5 — Suspension and termination fold into `is_valid`, and nothing downstream changes.**
Given the frozen assignability invariant (`apps/jobs/src/assignable-roster.ts:43-52`, [[project_assignability_predicate_is_isvalid_only]]),
Then `deriveIsValid` becomes a function of the lifecycle state **and** the moderation status — `is_valid = VALID_STATES.includes(state) && moderationStatus === 'none'` — resolved in `packages/validity-service/src/service.ts` alongside the existing `getMemberStateAt` call and threaded through `assemblePayload`;
And `specialFlags` gains `suspended_per_<reason_code>` / `terminated_per_<reason_code>` (the `prd.md:411` form); the flag is **member-visible** (not added to `STATE_TRUSTEE_ONLY_FLAGS`) because the member must be told why (`ux-design-specification.md:1890-1896`), while the Tier-1 rationale stays out of the payload entirely;
And **`apps/jobs`, `peer-mesh-read.ts`, the niyamavali `member_state_in` operator and all five `TERMINAL_STATES` Sets are UNTOUCHED** — a test asserts a suspended member is excluded from the assignable roster purely through `is_valid`, with no new predicate anywhere;
And ⚠ **the validity cache must invalidate on a moderation event** ([[project_validity_cache_failopen_pattern]]): verify the `events_log` AFTER-INSERT trigger / cohort-epoch bump actually covers a `member.moderation.*` append. If it does not, wire it in this story and prove it with a live-DB test that suspends a member and re-reads validity — **a stale cached `is_valid: true` would assign a suspended member to a pool**, which is the single worst failure mode in this story;
And the hand-enumerated validity truth table at `packages/validity-service/tests/payload.test.ts:99-117` gains rows for every (state × moderationStatus) combination that matters.

**AC6 — The suspension cascade revokes sessions; login is NOT blocked.**
Given `architecture.md:1433-1434` ("Suspension of a member or admin (FR-56) cascades to delete all sessions + refresh tokens") and the named seam at `member-auth.service.ts:198-201`,
Then `revokeAllMemberSessions(db, memberId, now)` is implemented and called in the same transaction as suspend AND terminate — revoking every `member_refresh_tokens` chain and clearing `member_trusted_devices` bindings, so every device is forced to re-authenticate and immediately observes the new standing;
And **neither `suspended` nor `terminated` is added to the login block-list** at `member-auth.handlers.ts:71` or the refresh re-check at `member-auth.service.ts:205` (which stay `withdrawn || anonymized`) — a moderated member **must** be able to sign back in to read the dignified explanation and reach the appeal CTA; enforcement is `is_valid`, not a locked door (Decision 6). A test pins that a suspended member can still log in and that their existing refresh chain was revoked;
And **restore does NOT re-mint sessions** — the member simply logs in normally.

**AC7 — Termination extends the 12-month rejoin lock.**
Given FR-56 ("rejoin under same identity blocked for 12 months (FR-6)") and the shipped withdrawal guard,
Then `member_moderation_actions.rejoin_permitted_at` is set to `acted_at + 12 months` (clock-injected) on `terminate`, and `NULL` for suspend/restore;
And the **pre-scope BYPASSRLS** signup guard (`member-auth.repo.ts:51-69`, `signup.handlers.ts:108-127`) additionally treats a moderation-`terminated` identity as terminal, sourcing `rejoin_permitted_at` from `member_moderation_actions` and returning the same dignified `403 auth.rejoin_locked` carrying the dates — **no fake `member_withdrawals` row is ever written**;
And a **restore clears the block**: a restored member's rejoin is permitted immediately (the guard reads the CURRENT overlay status, not merely the presence of a historical terminate row) — a live-DB test pins terminate → blocked, restore → permitted.

**AC8 — The member is notified, dignified and non-punitive.**
Given `epics.md:3550` ("member receives notification per Story 5.1") and UX Stance #5 (`ux-design-specification.md:89,123,545` — no punitive auto-action, no countdown, no threat),
Then the moderation handler **enqueues a job** (the `apps/jobs/src/scheduler/news-publish.ts` precedent) and an `apps/jobs` worker owns the member fan-out — `apps/api` **never** calls `fanOutAlertToMembers` (the 10.4 crypto boundary: apps/api's request path carries ADMIN-identity keys, the fan-out needs MEMBER Tier-1 crypto);
And the alert uses the existing **`alert_published`** category (`{ title, body }`) — **no 10th `AlertCategory` is minted** (Decision 7); the resulting deep link lands on the announcement feed rather than `<MemberStatusPanel>`, which is recorded as a known limitation + forward commitment, not silently ignored;
And the copy comes from the `packages/i18n` catalog with **en/hi parity** (Hindi-first) — it is system copy, not per-action authored copy, so **no tone-review gate applies** (contrast 10.5/10.9); the wording states what happened, why (the reason-code label), and how to appeal — never a deadline, never a threat;
And the notification is best-effort: a dispatch failure never fails the moderation action or rolls back the event.

**AC9 — The surfaces: admin action strip + member explanation.**
Given `ux-design-specification.md:1890-1896` (`<MemberStatusPanel>`, admin-facing variant "with override controls") and Pattern 2 (`:2312-2322`),
Then the **admin** surface extends the EXISTING `apps/admin/src/modules/member-status/` — a moderation action strip on the member record (Suspend / Terminate / Restore, each enabled only when `nextModerationStatus` says it is legal), a reason-code dropdown filtered by `appliesTo`, a mandatory rationale textarea, a **confirmation modal** (destructive token, first focus on Cancel, ESC dismisses, explicit consequence statement) and the step-up OTP challenge, plus a read-only moderation history (action · code · actor_display · date) with the **rationale ciphertext never rendered**;
And the **member** surface makes moderation a producer of `deriveHeadlineState` in `packages/ui/src/member-status/presenter.ts` — `suspended` → the existing `suspended-with-reason`, `terminated` → a NEW `terminated-with-reason` added to the `HeadlineState` union, `i18n-keys.ts` and `FAILURE_STATES` (so the appeal CTA renders — FR-56 restore is trustee-reachable). **Note this as a deliberate extension of the UX spec's five listed panel states**, which never modelled termination;
And the explanation is **full prose, not an error code** (`:1891`), Hindi-first, with the appeal CTA reachable from both failure states;
And moderation status is a **derivation** consumed at read time — it is never stored as a column on `members` and never rendered from a client-cached copy.

**AC10 — Tests + gates green.**
Given `pnpm ci:local` (`--concurrency=4`, DB on :5433) is the primary sanctioned merge gate (ADR-0017) — [[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]],
Then **domain unit** tests cover: `nextModerationStatus` over every legal AND illegal arm (explicitly including `none --terminate-->` → illegal, and re-suspend → illegal); `evaluateModerationOverlay` fold ordering, replay determinism and the restore-returns-to-`none` case; the reason-code `appliesTo` 422; the empty-rationale 422; and a pin that all three `member.moderation.*` events are **identity** through the lifecycle reducer;
And **live-DB integration** covers: each action + its audit line + its `member_moderation_actions` row; the illegal transition rejected pre-write; the RBAC **403-without / 200-with revert pair** plus a `state_trustee`-DENIED pin and a `district_admin`-DENIED pin (Decision 4); step-up **required** (a request without a fresh elevation 403s) and the **wrong-context elevation rejected**; the session cascade (refresh chain revoked, login still succeeds); the rejoin lock (terminate → blocked, restore → permitted); the validity fold (`is_valid` flips false on suspend, true on restore) **including cache invalidation**; and the assignable-roster exclusion achieved with no roster-code change;
And **contracts** tests cover the DTOs + a domain↔contracts reason-code sync-guard (TEST-only cross-import per [[project_contracts_domain_bundle_boundary]]);
And **admin UI** tests cover the legality-driven button enablement, the reason-code filter, the mandatory rationale, and the confirmation modal; **UI package** tests cover both headline states + the appeal CTA;
And a **revert-sanity** test proves teeth on the two load-bearing guards: removing the `appliesTo` check flips a test, and removing the `moderationStatus === 'none'` conjunction in `deriveIsValid` flips a test;
And `scripts/emit-openapi.ts` + `openapi/v1.yaml` are regenerated; en/hi parity holds; migration `0091` trips no determinism/journal/schema-diff gate; **`PERMISSION_CATALOG_VERSION` is still 28**; `pnpm ci:local` is green.

## Load-Bearing Decisions

Decisions 4, 5, 6 and 7 follow shipped precedent or an explicit artifact instruction — implement to them. **Decisions 1, 2, 3, 8 and 9 are NEW calls this story makes.** Decision 1 in particular **deviates from a literal reading of the epic AC** and is flagged for PO confirmation at review; dev may proceed on the recommendation.

1. **NEW — moderation is an event-derived OVERLAY orthogonal to the lifecycle state machine, NOT two new `member_lifecycle_state` labels.** `epics.md:3548` says "member state machine transitions accordingly" and `prd.md:849` says `active ↔ suspended → terminated`; the natural reading is two new enum labels. **That reading is not implementable and would be actively harmful.** Four reasons:
   - **`restore` has no answer.** The lifecycle reducer is `(state, event) => state`. From `suspended` it cannot know whether the member was `active`, `active-in-grace`, `lapsed-unpaid` or `lock-in` beforehand. The only escape is reading a `restore_to` label from the payload — which violates the reducer's own explicit invariant (`member/events.ts:35-38`: derive from the CURRENT state + event TYPE, "*never from `to_state` in the payload, so a mislabelled payload can never corrupt replay*").
   - **The PRD already models it as a flag**, not a state: `prd.md:411` `special_flags[], // e.g., "suspended_per_R7E"`.
   - **The codebase already commits to the fold**: `assignable-roster.ts:43-52` states suspension is "*already folded into `is_valid`*" — the frozen AI-7-2 invariant expects suspension to arrive via `is_valid`, and a reviewer is instructed to treat any other subfield read on that path as a finding.
   - **The blast radius is silent.** There is **no `never` guard over `MemberLifecycleState` anywhere**, so two new labels produce **zero compile errors** while silently mis-classifying five `TERMINAL_STATES` Sets (a terminated member would keep full write access to nominees, medical disclosures, T&C and Life Events), `NEWS_DISPATCH_MEMBER_STATES`, `peer-mesh-read.ts`'s `eq(members.state,'active')`, every seeded niyamavali `member_state_in` clause, and the renewal scheduler — whose grace clock would **stall** for a suspended member (`renewal-scheduler.ts:166,185,199`), wrongly pausing a renewal obligation that suspension does not suspend. It would also amend `architecture.md`'s ratified §1.14 transition table (`:1245-1253`), which has no `suspended`/`terminated` row — an ADR/architecture-level change this story has no mandate to make ([[feedback_architecture_vs_prd_boundary]]).
   → **A second, orthogonal, event-derived state machine on the member's own stream**, exactly the shipped `member/overlay.ts` shape. The epic AC's intent is met — a state machine does transition, on events, replayably — while `members.state` and its projector/trigger/CI-gate remain untouched. *Rejected:* two new enum labels + reducer arms (above). *Rejected:* a mutable `members.moderation_status` column — it would be a second source of truth and would trip the §1.14 event-derivation invariant the AC explicitly names.

2. **NEW — `terminate` is legal only from `suspended`.** `prd.md:849`'s diagram is `active ↔ suspended → terminated`: the arrow into `terminated` originates at `suspended`, not at the unmoderated state. Encoding that literally means the harshest, rejoin-locking action can never be a single click — a trustee must first suspend (which is itself notified, audited and appealable) and only then terminate. This is a governance property worth having, and it is what the PRD actually drew. *Rejected:* allowing `none --terminate-->` for "obvious" cases like R14 forgery — the PRD lists R14 forgery as a **suspension** reason (`prd.md:852`), so even the harshest ground enters through suspension.

3. **NEW — the reason-code registry is CODE-level and frozen, not a per-Pariwar DB registry.** "Registry-driven" (`epics.md:3549`) is satisfied by ONE declared tuple + metadata map — the shipped `verifier_reason_code` / `state_trustee_reason_code` reason-code precedent. These codes are Niyamavali- and FR-anchored governance vocabulary (R7, R14, R10(A), FR-11, FR-6), identical across every Pariwar. A per-tenant versioned table (the 10.1 routing-policy shape) would let a tenant **invent its own grounds for terminating a member** — a governance-boundary violation of exactly the kind Story 10.8's capability bar exists to prevent. The `appliesTo` metadata is what makes it a registry rather than a bare enum: it is what rejects a restore code on a termination. *Rejected:* a `helpdesk_routing_policy_versions`-style per-Pariwar registry (above). *Rejected:* free-text reasons with no code — kills the whole traceability purpose.

4. **RBAC — reuse the EXISTING `member.moderate` key; NO catalog bump; `state_trustee` DEFERRED.** `member.moderate` is already in the v1 seed catalog (`permissions.ts:368`) and already granted to `pariwar_admin` (`roles.ts:209`). **`PERMISSION_CATALOG_VERSION` stays 28** — the first Epic-10 story with no bump; do not invent a key to keep the chain going.
   **⚠ THE FINDING: this story's own protagonist cannot pass its gate.** `epics.md:3540` casts a *State Trustee* as the actor, but `state_trustee` holds `member.suspend`, **not** `member.moderate` — and its `scopeCeiling: 'state'` can **never** satisfy a `pariwar`-dimension check: `scopeWithinCeiling('pariwar','state')` is `1 >= 2` → false (`rbac/scope.ts:56-79`), and containment denies a target broader than the grant (`scope.ts:188-197`). Granting `member.moderate` to `state_trustee` would seed an **INERT capability** — the [[project_rbac_geo_scope_containment]] asymmetry that 10.3/10.4/10.5/10.8/10.9 each deferred, except this time it lands on the named actor. → **v1 holder is `pariwar_admin` (+ `super_admin` auto-derived); `state_trustee` and `district_admin` are DEFERRED** with the standard acceptance condition. Record it prominently: the story ships with its epic's protagonist unable to act, and that is a **capability-model finding to escalate**, not a defect to paper over.
   *Rejected:* gating on `member.suspend` — it is held by `state_trustee` + `district_admin`, both of whose ceilings fail the same pariwar check, so it is a **second inert path**; and splitting one action across two keys ("suspend via one key, terminate via another") would make the capability model incoherent. Leave `member.suspend` untouched and note that it is now effectively superseded.
   *Rejected:* moving the gate to `dimension: 'state'` to fit `state_trustee` — there is no geo-tree resolver, and `members` carries no geography (`members.state` is the LIFECYCLE column; district lives in `member_postings`), so a state-dimension target is unresolvable today.

5. **Step-up IS required — the first Epic-10 story that breaks the chain.** AR-24's list (`epics.md:291`, `architecture.md:1351-1365`) does not name member moderation, and every prior Epic-10 story recorded "NOT step-up-gated". But `epics.md:3550` requires it explicitly, and suspension is adjacent to AR-24's "staff privilege escalation" in consequence. → three distinct action contexts, hook placed after the permission hook. There is no central action-context registry (a free-form string declared as a module const — `pool-fixed-amount/index.ts:46`); follow the four-context reconciliation-review precedent.

6. **The cascade revokes sessions; it does NOT block login.** `architecture.md:1433-1434` mandates the revocation and `member-auth.service.ts:198-201` names `revokeAllMemberSessions` as the seam "which a later epic wires" — this is that epic. But the obvious next move, adding `suspended`/`terminated` to the `withdrawn || anonymized` login block-list, is **wrong**: `ux-design-specification.md:1890-1896` commits the member to a dignified, prose explanation with an appeal CTA reachable "from every failure state", and a member who cannot log in can never read it. The revocation forces every device to re-authenticate and pick up the new standing at once; `is_valid: false` does the enforcing. *Rejected:* blocking login (above). *Rejected:* extending the refresh-chain re-check to revoke on moderation — that is a login block by another name; the cascade is a one-time revocation at the moment of action.

7. **Notification reuses `alert_published`, enqueued from apps/api and fanned out in apps/jobs.** No existing `AlertCategory` variant fits a moderation notice (`claim_status_change` needs a `claim_id`, `helpdesk_reply` a `ticket_id`, `niyamavali_amended` is a broadcast), and `Alert` is a `.strict()` discriminated union so a `member_id` + reason code cannot be smuggled in. Minting a 10th category would make it push-eligible and thereby redefine FR-71 from 7 push categories to 8 — which Story 5.2 froze in terms (`5-2-…md:199`: "*FR-71 = 7. Full stop.*"). That is a PRD amendment, not a story-level call. → ship on `alert_published`'s `{ title, body }`, the same carrier News/Blog uses, with the announcement-feed deep link recorded as a known limitation. **Forward commitment: a `member_moderation` category (plus a `deep-link.ts` case routing to the status panel) once PM amends FR-71.** *Rejected:* minting the category unilaterally. *Rejected:* 10.4's log-only console-notifier stopgap — it is still an unresolved HIGH gap (`10-4-…md:136`); use the news-publish enqueue pattern instead.

8. **NEW — `deriveIsValid` gains the moderation conjunction; that ONE edit is the entire enforcement surface.** `payload.ts:31-36` already declares itself the "SINGLE source of that mapping: refining which states count is a one-line edit here, ZERO engine/rule change." Moderation is exactly such a refinement. Because `assignable-roster.ts` reads `payload.isValid` and nothing else, pool assignability, the rules engine and claim eligibility all inherit suspension **with no code change of their own** — which is why AC5 forbids touching them. The cost is one real risk: a **stale validity cache** would hand a suspended member to a pool spawn, so cache invalidation on `member.moderation.*` is an AC, not a nicety ([[project_validity_cache_failopen_pattern]]). *Rejected:* a separate `isModerated` predicate consumed independently by each downstream — it would fork the frozen AI-7-2 invariant into N places, which is precisely what that invariant was frozen to prevent.

9. **NEW — 10.10 ships a moderated-members READ, and formally records that 10.11's "pending items" has no source.** `epics.md:3563` says the Trustee-Lite view aggregates "moderation pending items (Story 10.10)" and `:3564` sorts them "by deadline-proximity" with "category + age + severity". **10.10's AC block (`:3544-3551`) defines no pending, queue, approval or dual-control concept whatsoever** — every clause describes an immediate, single-actor, completed action. Five of 10.11's six sources (6.13, 6.14, 6.15, 6.16, 9.8) are queue-shaped by title and specify their own ordering key; 10.10 is not and does not. Inventing an approval workflow here would be building an unauthorized feature. → **ship `listModeratedMembersForPariwar`** (members whose current overlay status is `suspended` or `terminated`, with code, `since`, and actor, paginated + `clampLimit`) — the defensible reading of "members under moderation, pending resolution", which the admin console needs anyway. **Forward commitment to 10.11, un-gated and therefore explicitly recorded:** moderation items carry **no deadline and no severity**, so 10.11 cannot sort them by deadline-proximity as written. Route to PM before 10.11 is drafted ([[feedback_record_unattested_no_backfill]] — record the gap openly rather than fabricating a deadline field to make the sort work).

## Tasks / Subtasks

- [x] **Task 1 — Domain: the moderation overlay + pure cores** (`packages/domain/src/member/moderation/`) (AC1, AC2, AC3)
  - [x] `events.ts`: three `.strict()` payload schemas for `member.moderation.suspended` / `.terminated` / `.restored`, carrying the standard `auditShape` (`from_state`/`to_state`/`trigger`/`actor`) **plus** `reason_code` and `moderation_from`/`moderation_to` — and **nothing else**. ⚠ **NO rationale, NO member name, NO actor display name in the payload** (`events_log.payload` is plaintext JSONB — the `nominees_declared`/`medical_disclosed`/`address_updated` discipline). Since these are lifecycle **non**-transitions, `from_state === to_state` on every one. Extend `MEMBER_EVENT_TYPES` + `MEMBER_EVENT_PAYLOAD_SCHEMAS` (the `satisfies` keeps it exhaustive) and register all three in `packages/events/src/registry.ts`.
  - [x] `status.ts`: pure `nextModerationStatus(status, action)` per AC2 (legal: `none→suspend→suspended`, `suspended→terminate→terminated`, `suspended→restore→none`, `terminated→restore→none`; **everything else `null`, including `none→terminate`**) + `isLegalModerationTransition`. Exhaustive unit tests over every arm, legal and illegal.
  - [x] `overlay.ts`: pure `evaluateModerationOverlay(events)` → `{ status, reasonCode, since, lastActionAt }` and `getMemberModerationOverlay(db, memberId, atTimestamp)`. Model on `packages/domain/src/member/overlay.ts` but **single-stream**: the member's own stream, `where streamId = memberId AND eventType IN (…) AND occurredAt <= at`, `orderBy asc(eventVersion)`. No clock inside the pure fold.
  - [x] `reason-codes.ts` (Decision 3): the two frozen `as const` tuples + the metadata map with `appliesTo`, plus a pure `assertReasonCodeAppliesTo(code, action)`. Exhaustiveness `never` guard.
  - [x] `errors.ts`: `ModerationStateError` (409), `ModerationReasonCodeInvalidError` (422), `ModerationRationaleRequiredError` (422), `ModerationActorDisplayMissingError` (422). ⚠ Wire **every** one into `apps/api/src/middleware/error-mapping/` — an unmapped domain error becomes a 500 (the Story 10.8 Pass-3 finding; do not repeat it).
  - [x] **Pin the identity property**: a test asserting all three `member.moderation.*` events fold through `memberStateMachine` as IDENTITY, so `members.state` provably cannot move.

- [x] **Task 2 — Domain: schema + migration 0091 + the write path** (AC1, AC3, AC4, AC7)
  - [x] `packages/domain/src/schema/member_moderation_actions.ts` — append-only: `moderationActionId` PK, `pariwarId` (RLS), `memberId`, `action` pgEnum, `reasonCode` pgEnum(s), `rationaleCiphertext` (**Tier-1 envelope** — follow `member_withdrawals.reason_text` / the claim-decision rationale precedent), `actorId`, `actorDisplay`, `rejoinPermittedAt` (nullable), `actedAt`. Index on `(pariwar_id, member_id, acted_at)`. Branded ids.
  - [x] Migration `0091_member-moderation.sql`: `CREATE TYPE` × 3 + `CREATE TABLE` + index + **RLS policies** (grep `0090_banners.sql` for the exact `USING`/`WITH CHECK (pariwar_id = current_setting('app.pariwar_id'))` DDL) + a `CHECK` that `rejoin_permitted_at IS NOT NULL` iff `action = 'terminate'`. **NO state-writer trigger, NO `ALTER TYPE member_lifecycle_state`.** Journal it by hand and **never regenerate it once applied** ([[project_live_db_test_gotchas]] — drizzle skips by journal `when` → 42P07). Grant `SELECT/INSERT` to `twt_app`; state in the header why `twt_service` gets what it gets (the signup rejoin guard reads pre-scope on the service pool → it needs `SELECT`).
  - [x] `write.ts`: `moderateMember(tx, { memberId, action, reasonCode, rationaleCiphertext, actorId, actorDisplay, now })` — legality check → reason-code `appliesTo` check → append the event **and** insert the action row **in the caller's scope tx** (never opens its own). ⚠ **The domain NEVER encrypts** — it takes ALREADY-SERIALIZED Tier-1 ciphertext, exactly like `insertMemberWithdrawal` (`member/withdrawal.ts:8-13`) and `recordVerifierDecision`. `moderationResourceLocator(memberId)` → `member:moderation:<id>`.
  - [x] `read.ts`: `listModerationHistoryForMember` and `listModeratedMembersForPariwar` (Decision 9) — paginated, `clampLimit` ([[project_domain_limit_clamp_and_savepoint_retry]]), newest-first, and **never selecting `rationale_ciphertext`** into a list DTO.
  - [x] Barrel-export from `packages/domain/src/index.ts` + `schema/index.ts` with the house-style header comment naming the story + Decision 1.

- [x] **Task 3 — Validity: fold moderation into `is_valid`** (AC5)
  - [x] `packages/validity-service/src/payload.ts`: widen `deriveIsValid(state, moderationStatus)`; add the `suspended_per_<code>` / `terminated_per_<code>` `specialFlags` entries. Update the header comment block (`:31-36`) so the "SINGLE source of that mapping" claim stays true.
  - [x] `service.ts`: resolve the overlay alongside the existing `getMemberStateAt` call (`:84-87`) and thread it into `assembleInput`.
  - [x] Extend the hand-enumerated truth table at `tests/payload.test.ts:99-117` with the moderation dimension. ⚠ That table has **no completeness check**, so a missing row loses coverage silently — add rows deliberately.
  - [x] ⚠ **Cache invalidation (the worst failure mode).** Verify whether the `events_log` AFTER-INSERT trigger / cohort-epoch bump ([[project_validity_cache_failopen_pattern]]) fires for `member.moderation.*`. If not, wire it. Prove it with a live-DB test: warm the cache → suspend → re-read validity → `is_valid` is false.
  - [x] Prove the **no-downstream-change** property: a test showing a suspended member drops out of the assignable roster with `apps/jobs` untouched.

- [x] **Task 4 — Auth: the cascade + the rejoin lock** (AC6, AC7)
  - [x] Implement `revokeAllMemberSessions(db, memberId, now)` (the named seam at `member-auth.service.ts:198-201`) — revoke **every `member_refresh_tokens` chain** for the member (that is what `architecture.md:1433-1434` literally mandates); call it from suspend AND terminate in the same tx. Trusted-device bindings (`member_trusted_devices`, a raw-SQL carve-out on `deps.pool` at `member-auth.repo.ts:220-257`) are a **separate** concept — clear them too and say why in the Dev Agent Record, or leave them and say why; do not silently decide.
  - [x] Extend the pre-scope BYPASSRLS lookup (`member-auth.repo.ts:51-69`) to LEFT JOIN `member_moderation_actions`, and the signup guard (`signup.handlers.ts:108-127`) to treat a **currently**-terminated identity as terminal — reusing the existing dignified `403 auth.rejoin_locked` shape. A restore must clear the block (read the current overlay status, not the mere existence of a terminate row).
  - [x] **Do NOT** add `suspended`/`terminated` to the login block-list or the refresh re-check (Decision 6). Add a test that pins a suspended member CAN still log in — this is the behaviour a future reviewer is most likely to "fix" by mistake.

- [x] **Task 5 — API: the moderation routes** (`apps/api/src/modules/member-moderation/`) (AC2, AC4, AC8)
  - [x] `POST /api/v1/p/:pariwarId/members/:memberId/moderation/suspend` | `/terminate` | `/restore`, plus `GET …/moderation` (history) and `GET …/moderation/members` (the 10.11 read).
  - [x] Hooks per AC4: `[requireAdminSession, scopeResolutionHook, requirePermissionHook(deps, 'member.moderate', { dimension: 'pariwar' }), requireStepUp(deps, CTX)]` — **step-up last**, three distinct contexts declared as module consts.
  - [x] **The route owns encryption** (the `claims.verification-decision.handlers.ts:190-204` pattern verbatim): resolve `ctx.actorDisplay` (**blocks the action when missing** — [[project_admin_display_name_attribution]]), `await encryptModerationRationale(body.rationale, ctx.pariwarId, deps.encryption)` **before** `openScopeTx`, then pass the ciphertext into the domain. Use a **dedicated field class** for the moderation rationale. Reads decrypt through the mirror helper with the established error callback.
  - [x] Audit line per action via `deps.servicePool`, fire-and-forget, rationale never audited (the `banners/handlers.ts:104-120` pattern). **Return the body** — never `void reply.status(N).send()` ([[project_fastify_onsend_doublesend]]).
  - [x] Enqueue the notification job (AC8) best-effort — a failure never fails the action.
  - [x] Integration spec per AC10, including the step-up-missing 403 and the **wrong-context elevation** rejection.

- [x] **Task 6 — Jobs: the moderation notice worker** (AC8)
  - [x] `apps/jobs/src/scheduler/moderation-notify.ts` — pure `buildModerationAlert` + a fan-out that **reuses** `fanOutAlertToMembers` (never re-implements it), on `alert_published`. Add the `QUEUE_NAMES` entry + boot wiring, following `news-publish.ts` end to end.
  - [x] Copy from the i18n catalog, Hindi-first, en/hi parity, non-punitive per UX Stance #5. No countdown, no threat, no deadline.

- [x] **Task 7 — Contracts** (AC3, AC9)
  - [x] `packages/contracts/src/member-moderation/`: request DTOs (`action`, `reason_code`, `rationale`), `ModerationHistoryResponse`, `ModeratedMembersListResponse`. Pure-Zod, `.strict()`, **snake_case wire vs domain camelCase** — watch the drift ([[project_story_validate_footguns]]: `reason_code`/`reasonCode`, `rejoin_permitted_at`/`rejoinPermittedAt`, `actor_display`/`actorDisplay`). **No `@twt/domain` import** ([[project_contracts_domain_bundle_boundary]]).
  - [x] Reason-code + action sync-guard tests (TEST-only cross-import). Register routes in `scripts/emit-openapi.ts`; regenerate `openapi/v1.yaml`.
  - [x] The history DTO **never** exposes `rationale_ciphertext`.

- [x] **Task 8 — Admin UI: the moderation strip** (`apps/admin/src/modules/member-status/`) (AC9)
  - [x] Extend the EXISTING module (do not create a new one, do not cross-wire with a sibling). Action buttons enabled by `nextModerationStatus`; reason-code dropdown filtered by `appliesTo`; mandatory rationale; confirmation modal per UX Pattern 2 (`destructive` token, first focus on **Cancel**, ESC dismisses, explicit consequence statement, no Enter-key default); step-up challenge; read-only history.
  - [x] Tailwind + `status-*` tokens (**NOT Tamagui**); per-module `i18n-en.ts` `resolveEn`; `@tanstack/react-query` over the cookie-bearing `apiFetch`.
  - [x] Component/interaction tests per AC10.

- [x] **Task 9 — Member UI: the explanation** (`packages/ui/src/member-status/`) (AC9)
  - [x] Add `terminated-with-reason` to the `HeadlineState` union (`view-model.ts:19`), `i18n-keys.ts:12`'s map, and `FAILURE_STATES` (`presenter.ts:243`) so the appeal CTA renders. Make `deriveHeadlineState` a consumer of the moderation flag — it currently keys `suspended-with-reason` off `concealmentFlagged` **only** (`presenter.ts:62,64`).
  - [x] Prose explanation naming the reason-code label (never a raw code), Hindi-first, en/hi parity in `packages/i18n`.
  - [x] Note the deliberate extension of the UX spec's five `<MemberStatusPanel>` states in the Dev Agent Record.

- [x] **Task 10 — Tests + gates** (AC10)
  - [x] All suites per AC10 including both revert-sanity pairs. Run full `pnpm ci:local` (`--concurrency=4`, `DATABASE_URL` on :5433). **Assert membership, not counts** on every shared-DB read ([[project_live_db_test_gotchas]]). Confirm the static gates (domain-invariants / **member-state-invariant** / schema-diff / pii-scrape / determinism / journal) are green with migration `0091` present, and that `PERMISSION_CATALOG_VERSION` is still 28.

## Dev Notes

### Why this story is different from the rest of Epic 10
Every other Epic-10 `[SURFACE]` (10.3, 10.4, 10.5, 10.7, 10.9) followed the same recipe: mint a key, bump the catalog, add a mutable-status table, no step-up. **10.10 inverts three of those four.** It mints no key and bumps nothing (Decision 4); it writes no mutable status at all (Decision 1); and it IS step-up-gated (Decision 5). If you find yourself reaching for the 10.9 template wholesale, stop — the only part that transfers is the audit/handler/contracts plumbing.

### The three things most likely to go wrong
1. **Adding `suspended`/`terminated` to `MEMBER_LIFECYCLE_STATES` anyway.** It compiles. Nothing fails. Five `TERMINAL_STATES` Sets, the renewal grace clock, the news audience filter, peer-mesh selection and every seeded niyamavali clause quietly get it wrong. Read Decision 1.
2. **A stale validity cache.** `is_valid` is the entire enforcement surface (Decision 8); if the cache doesn't invalidate on a moderation event, a suspended member gets assigned to a pool. AC5 makes this a test, not a hope.
3. **"Fixing" the login gate.** A suspended member logging in looks like a bug. It is the requirement (Decision 6). The pinning test in Task 4 exists to defend it.

### The rationale-encryption boundary — this is NOT the 10.4 crypto boundary
Two opposite mistakes are available here. **Do not encrypt in the domain**: `packages/domain/src/member/withdrawal.ts:8-13` states the rule — accessors take already-serialized ciphertext, the route encrypts. **And do not skip encryption out of 10.4 caution**: the 10.4 boundary is about **member-identity** field crypto (which the admin request path lacks), whereas an admin-written rationale is encrypted under a **per-Pariwar field class** via `deps.encryption` — which admin routes already do today (`claims.verification-decision.handlers.ts:190-194`, `claims.appeal.handlers.ts:314`, `claims.cycle-freeze.handlers.ts:242`). Note `claims.appeal.handlers.ts:314` encrypts *inside* an already-open scope tx — a deliberate 6.16-review deviation for KMS-cost reasons — so it evidences "admin routes encrypt via `deps.encryption`" but is NOT the timing pattern to copy; for placement (encrypt **before** `openScopeTx`), follow `claims.verification-decision.handlers.ts:190-204` verbatim, per Task 5. The 10.4 constraint binds Task 6's member **fan-out**, not Task 5's rationale.

### No new dependencies
This story adds **no new npm package** to any workspace. Every capability it needs is already shipped and versioned in the monorepo: Drizzle + pgEnum, Zod, Fastify hooks, `deps.encryption` (Tink envelope, Story 1.5), pg-boss (`packages/queue`), `@tanstack/react-query`, Tamagui/Tailwind. If you find yourself running `pnpm add`, stop and re-read the task — the answer is already in the repo.

### Naming: three-segment event types are legal
`member.moderation.suspended` has three segments where every existing `member.*` event has two. This is fine — `cycle.spawn.started` / `cycle.spawn.aborted` (`packages/events/src/registry.ts:332,344`) set the precedent, and `architecture.md:3860` uses `member.suspended` as its own dotted-name example. Use the epic's spellings exactly; event-name drift is a known, expensive failure class ([[project_contribution_event_name_contract]]).

### PRD ↔ epic reason-code reconciliation
`prd.md:852` (authoritative, 5 grounds) and `epics.md:3549` (4 illustrative labels + "etc.") do not use the same vocabulary. The registry in Task 1 is the union, with PRD-anchored spellings: epic `fraud` → `r14-forgery`, epic `concealment` → `concealment-confirmed` (PRD's "concealment-flag confirmed by State Trustee (FR-11)"), plus the epic-only `regulator-action` and `voluntary-pending-review`. `review-rubric.md:44` flags an **unclosed PRD gap** — FR-56 never says *who* may restore for which sub-clause. This story gates all three actions on one key and records the gap; it does not invent a per-sub-clause authority model.

### Known artifact conflicts, recorded not hidden
- **`epics.md:3540` casts a State Trustee who cannot pass the gate** (Decision 4). Escalate; do not paper over.
- **`epics.md:3563` (Story 10.11) depends on a "moderation pending items" queue that 10.10's own AC never defines** (Decision 9). 10.10 ships the moderated-members read; the deadline/severity mismatch is a live forward commitment for PM.
- **`architecture.md:1245-1253` §1.14 has no `suspended`/`terminated` row** — which is consistent with Decision 1 and is *why* Decision 1 needs no architecture amendment. If the PO overrides Decision 1, the architecture table must be amended first, as a separate change.
- **`ux-design-specification.md:1890-1896` models no terminated panel state** — Task 9 extends it deliberately (AC9).

### References
- Epic AC: `_bmad-output/planning-artifacts/epics.md:3538-3551`; Epic 10 header `:3355-3373`; Story 10.11 dependency `:3563-3564`; AR-24 `:291`
- PRD: `prds/prd-TWT-2026-05-22/prd.md:847-854` (FR-56), `:411` (`special_flags`), `:392` (`is_active`); `review-rubric.md:44,49`
- Architecture: `architecture.md:1236-1241` (§1.14 source-of-truth), `:1245-1253` (transition table), `:1291-1293` (audit shape), `:1351-1365` (AR-24 step-up), `:1433-1434` (suspension cascade), `:3860` (dotted event names)
- UX: `ux-design-specification.md:89,123,545` (Stance #5), `:1890-1896` (`<MemberStatusPanel>`), `:2067-2074` (`<ReasonCodeDropdown>`), `:2312-2322` (confirmation modal)
- Code: `packages/domain/src/member/{state.ts,events.ts,overlay.ts,project.ts}`; `packages/domain/src/schema/members.ts:59-69`; `packages/validity-service/src/payload.ts:31-56`; `packages/domain/src/rbac/{permissions.ts:337,368,roles.ts:209,307-314,scope.ts:56-79,188-197}`; `apps/api/src/modules/step-up/gate.ts`; `apps/api/src/modules/auth/member/{member-auth.service.ts:198-206,member-auth.repo.ts:51-69,signup.handlers.ts:108-127}`; `apps/jobs/src/{assignable-roster.ts:43-52,scheduler/news-publish.ts}`; `packages/ui/src/member-status/{view-model.ts:19,presenter.ts:53-77,243}`; `packages/events/src/registry.ts:332`
- Previous story: `_bmad-output/implementation-artifacts/10-9-banner-popup-manager-valid-from-until-dismiss.md` (handler/audit/contracts plumbing only — the data-model half does not transfer)

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Amelia, `bmad-dev-story`)

### Debug Log References

Three real defects were found by the tests rather than by review — recorded because each is a
reusable lesson, not just a fix:

1. **`db.execute` raw rows return `timestamptz` as STRINGS, not `Date`s.**
   `listModeratedMembersForPariwar` uses a Postgres-specific `DISTINCT ON` via `db.execute`, which
   bypasses Drizzle's column mapper. The accessor declared `since: Date` but handed back a string, so
   the API handler's `.toISOString()` threw a TypeError → a 500 on the Decision-9 list route. Fixed in
   the ACCESSOR (`moderation/read.ts` `toDate`), not the handler: the raw-SQL escape hatch must not
   leak its representation past the domain boundary, or every caller has to know which of the two
   read styles it is holding. Caught by the Decision-9 integration test.

2. **`audit_log_entries` has no `id` column** — its keys are `audit_id` (PK) + `seq` (identity). A
   test ordering by `id` errored. Worth noting for future audit assertions.

3. **Node/Postgres clock skew excludes just-written events from a `getValidityAt` window.**
   `getValidity` bounds the replay at the DB's `now()`; the Node clock (Docker on macOS) can run a few
   ms AHEAD, so an event stamped `new Date()` can fall outside the window and be silently skipped —
   which presented as "the terminate event didn't fold". Moderation events in the validity spec are
   now stamped in the recent past. The fold orders by `event_version` regardless, so this changes
   nothing under test; it removes a real flake class.

Also: `events_log` is APPEND-ONLY (AR-8) — a cleanup `DELETE` trips its own trigger. Integration
specs leave seeded events in place and rely on fresh random ids per test.

### Completion Notes List

**All 10 tasks complete. `PERMISSION_CATALOG_VERSION` is still 28 — the first Epic-10 story that
mints no key.**

#### Decision 1 held: moderation is an OVERLAY, `members.state` was never touched
No `ALTER TYPE`, no new `member_lifecycle_state` label, no lifecycle-reducer arm, no projector edit,
no `app.member_state_writer` change, and **no addition to the `member-state-invariant` CI-gate
allowlist**. Three properties pin it: a domain unit test folds all three `member.moderation.*` events
through `memberStateMachine` across EVERY lifecycle state and asserts identity; the API integration
spec drives the real projector through suspend → terminate → restore and reads `members.state` back
as `active` throughout; and the validity spec asserts every lifecycle-derived payload sub-object is
byte-identical before and after a suspension.

⚠ **Flagged for PO confirmation at review** — Decision 1 deviates from a literal reading of
`epics.md:3548` ("member state machine transitions accordingly"). A state machine *does* transition,
on events, replayably; it is simply a SECOND machine, orthogonal to the lifecycle.

#### AC5 cache invalidation: NO new wiring was needed — and it is now proven, not assumed
The story flagged a stale validity cache as "the single worst failure mode". Investigation found
migration 0036's trigger already fires `WHEN (NEW.event_type LIKE 'member.%')`, which
`member.moderation.suspended` matches by prefix — so the three new event types were covered by
construction. Rather than record that as a happy accident, `moderation-validity.spec.ts` warms the
cache, suspends, asserts the rows are gone, and asserts the next cached read answers `is_valid:
false`. That test is what would fail if anyone ever narrowed the `WHEN` clause to an explicit list.

#### `revokeAllMemberSessions` already EXISTED — this story wired it
It shipped in Story 3.2 (`member-auth.repo.ts:359`) as a named-but-uncalled seam. Task 4 widened its
executor parameter to `pg.Pool | pg.PoolClient` so the cascade runs **inside the moderation scope
transaction**, alongside the event append and the decision row — so a rolled-back moderation can
never leave a member logged out.

**Trusted devices: cleared, deliberately** (the story required an explicit decision either way). A
refresh chain and a device binding are different objects; clearing only the chain would force
re-authentication while still consuming the moderated member's max-2 device budget. `architecture.md`
:1433-1434 says the cascade deletes "all sessions + refresh tokens", and the binding is what makes a
device a session-bearer. This is also what the shipped function has always done — 10.10 wires the
seam, it does not redefine it.

#### Step-up: the FIRST Epic-10 story that IS gated
10.3 / 10.4 / 10.5 / 10.8 / 10.9 each recorded "NOT step-up-gated". 10.10 breaks that chain
(Decision 5), with three distinct contexts (`member_moderation_{suspend|terminate|restore}`) placed
AFTER the permission hook. The integration spec proves both halves: no elevation → 403, and an
elevation minted for `restore` spent on `terminate` → 403.

#### ⚠ ESCALATION 1 — this story's own protagonist cannot pass its gate (Decision 4)
`epics.md:3540` casts a **State Trustee** as the actor. But `state_trustee` holds `member.suspend`,
not `member.moderate`, and its `scopeCeiling: 'state'` can NEVER satisfy a `pariwar`-dimension check
(`scopeWithinCeiling('pariwar','state')` → `1 >= 2` → false). Granting `member.moderate` to
`state_trustee` would seed an **inert capability**. v1 ships with `pariwar_admin` (+ `super_admin`);
`state_trustee` and `district_admin` are DEFERRED, each pinned by a 403 integration test so a
well-meaning future grant cannot land silently and read as a fix. **This is a capability-model
finding to escalate, not a defect to paper over.** `member.suspend` is left untouched and is now
effectively superseded.

#### ⚠ ESCALATION 2 — Story 10.11 depends on a queue 10.10 never defines (Decision 9)
`epics.md:3563-3564` expects 10.11 to aggregate "moderation pending items (Story 10.10)" sorted "by
deadline-proximity" with "category + age + severity". 10.10's own AC block defines no pending, queue,
approval or dual-control concept — every clause describes an immediate, single-actor, completed
action. Inventing one would be building an unauthorized feature. Shipped instead:
`listModeratedMembersForPariwar` (members whose CURRENT standing is suspended/terminated). **Moderation
items carry NO deadline and NO severity, so 10.11 cannot sort them as written.** Routed to PM before
10.11 is drafted, rather than fabricating a deadline field to make the sort work.

#### ⚠ KNOWN LIMITATION — the notification deep-link (Decision 7)
No 10th `AlertCategory` was minted: that would redefine FR-71 from 7 push categories to 8, which
Story 5.2 froze in terms. The notice ships on `alert_published`, so its deep link lands on the
**announcement feed** rather than `<MemberStatusPanel>`. **Forward commitment:** a `member_moderation`
category + a `deep-link.ts` case once PM amends FR-71. 10.4's log-only console-notifier stopgap was
explicitly NOT repeated — the notice uses the 10.5 `news-publish` enqueue+worker pattern, which is the
resolved form of the same crypto-boundary constraint.

#### Deliberate extensions, recorded rather than made silently
- **`deriveIsActive` also folds moderation.** AC5 names only `deriveIsValid`, but PRD FR-12A's own
  definition of `is_active` is "valid AND past lock-in AND **not suspended**". Leaving `is_active:
  true` for a suspended member would contradict the very line the function implements.
- **`terminated-with-reason` is a SIXTH `<MemberStatusPanel>` headline state.** The UX spec
  (`:1894`) lists five and never modelled termination (FR-56 postdates it). Collapsing it into
  `suspended-with-reason` was rejected: a suspension is under review, a termination has ended and
  carries a 12-month rejoin lock, and telling someone their membership is "under review" when it has
  ended is exactly the soft misinformation UX Stance #5 forbids. Both states render the appeal CTA —
  FR-56 makes `restore` trustee-reachable from `terminated`, so the member with the most at stake
  must still have a way to ask.
- **All seven moderation codes apply to BOTH suspend and terminate.** Per-code narrowing (e.g.
  barring `voluntary-pending-review` from a termination) would be inventing policy the PRD does not
  state. Recorded rather than guessed.

#### Test / gate status (honest)
- New tests: **42** domain unit, **17** contracts, **17** UI, **22** admin, **6** validity live-DB,
  **21** apps/api live-DB (14 moderation E2E + 7 auth-effects).
- All **27 static gates** green, including `member-state-invariant`, `domain-invariants`,
  `schema-diff`, `pii-scrape`, `i18n-parity`, `microcopy`, `determinism-replay`.
- Migration `0091` applied cleanly; hand-journalled; `PERMISSION_CATALOG_VERSION` verified still 28.
- `openapi/v1.yaml` regenerated: 100 → 105 paths (exactly the 5 new routes); the 76 deleted lines are
  YAML anchor renumbering, not lost content (path count verified before/after).
- **`pnpm ci:local` is GREEN: 30/30 jobs**, on a freshly recreated + migrated `twt-test-pg` (:5433).
- One test updated for a real behaviour change: `life-events-markers.test.ts` vocabulary count
  16 → 19 (the three `member.moderation.*` events join the same non-transition-marker family).
- ⚠ **Two LOCAL-HARNESS artifacts hit during verification — both diagnosed to environment, not code.**
  Recorded because each cost real time and will recur:
  (a) *Accumulated DB residue.* Four domain count-assertion specs (`rls/policy-regression`,
  `multi-tenant/cross-pariwar-leak`, `pool/active-contribution-read`) fail against a `twt_dev` that
  has collected committed rows from repeated runs. Confirmed environmental, not a 10.10 regression:
  stashing every Story 10.10 change reproduced the identical four failures on the baseline, and on a
  fresh DB the full domain suite passes 2233/2234 here vs 2191/2192 on the baseline
  ([[project_live_db_test_gotchas]] — assert membership, not counts).
  (b) *Recreating the DB immediately before `ci:local` breaks `test (unit)`.* That job runs BEFORE
  the `integration-tests` job's `pnpm db:migrate`, so apps/api integration specs meet an unmigrated
  schema and fail with `relation "users" does not exist`. **Always `db:migrate` after recreating the
  DB and before invoking `ci:local`** — the final green run above did exactly that.

### File List

**New — domain**
- `packages/domain/src/member/audit-shape.ts`
- `packages/domain/src/member/moderation/{status,reason-codes,events,overlay,write,read,errors,index}.ts`
- `packages/domain/src/schema/member_moderation_actions.ts`
- `packages/domain/src/policies/member-moderation-actions-rls.ts`
- `packages/domain/migrations/0091_member-moderation.sql`
- `packages/domain/tests/member/{moderation-status,moderation-reason-codes,moderation-overlay}.test.ts`

**New — contracts / api / jobs / admin**
- `packages/contracts/src/member-moderation/{enums,dto,index}.ts`
- `packages/contracts/tests/member-moderation.test.ts`
- `apps/api/src/modules/member-moderation/{routes,handlers,moderation-crypto,queue}.ts`
- `apps/api/tests/integration/member-moderation/{member-moderation,moderation-auth-effects}.spec.ts`
- `apps/jobs/src/scheduler/moderation-notify.ts`
- `apps/admin/src/modules/member-status/{ModerationStrip,ModerationSection}.tsx`
- `apps/admin/tests/moderation-strip.test.tsx`
- `packages/validity-service/tests/integration/moderation-validity.spec.ts`
- `packages/ui/tests/member-status/moderation.test.ts`

**Modified**
- `packages/domain/src/member/{events,index}.ts`, `src/{index,ids/index}.ts`,
  `src/{schema,policies}/index.ts`, `migrations/meta/_journal.json`
- `packages/domain/tests/member/life-events-markers.test.ts`
- `packages/events/src/registry.ts`
- `packages/validity-service/src/{payload,service,index}.ts`, `tests/payload.test.ts`
- `packages/contracts/src/index.ts`, `packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml`
- `packages/queue/src/index.ts`
- `packages/ui/src/member-status/{view-model,i18n-keys,presenter}.ts`
- `packages/i18n/locales/{en,hi}/common.json`
- `apps/api/src/{context,deps,server}.ts`, `src/middleware/error-mapping/index.ts`,
  `src/modules/auth/member/{member-auth.repo,signup.handlers}.ts`
- `apps/jobs/src/boot.ts`
- `apps/admin/src/api/{client,hooks}.ts`,
  `apps/admin/src/modules/member-status/{MemberSearchPage.tsx,i18n-en.ts}`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

| Date | Change |
|---|---|
| 2026-08-02 | Story 10.10 implemented across 10 tasks: the `member.moderation.*` event-derived overlay (Decision 1 — `members.state` untouched), migration `0091` + `member_moderation_actions`, the frozen reason-code registry, the `is_valid` fold (Decision 8 — the whole enforcement surface), the wired suspension cascade, the FR-6 rejoin lock + its restore-clears path, five step-up-gated admin routes on the existing `member.moderate` key (catalog stays v28), the apps/jobs notice worker on `alert_published`, the admin moderation strip, and the member `terminated-with-reason` panel state. Two escalations recorded (the `state_trustee` inert-grant finding; the 10.11 pending-items gap) + one known limitation (the announcement-feed deep link). |
