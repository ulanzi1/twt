---
baseline_commit: 8ce008d78db4756e6a24ecede08d1b3a90a19319
---

# Story 6.6: Peer Mesh Deterministic 5-Nearest Selection + Ping

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the verification engine processing a claim,
I want a peer mesh that **deterministically** selects the 5 nearest members and pings them for verification, records their responses as events, and falls back to ground-inspection-primary verification when too few respond,
so that peer-mesh selection is **reproducible, audit-replayable, and non-manipulable** — the same inputs always select the same 5 members, byte-for-byte.

## Story Classification

`[CONSUMER]` — this story consumes the Story 6.1 claim state machine (emits `claim.peer_mesh_pinged`, adds `claim.peer_mesh_responded`) and the Story 3.x member substrate (`members`, `member_postings`). Its **core, live-verified deliverable is the deterministic selection engine + persistence + event emission + fallback** — a pure, replayable primitive, plus durable, delivery-neutral ping-intent records (`claim_peer_mesh_pings`). It does NOT consume the Story 5.1 alert primitive — per **Decision D2** the ping intents carry no `AlertCategory` binding, and per **Decision D1** live multi-target channel fan-out is out of scope for 6.6 (the dispatch-composition story owns both).

---

## Two delivery-seam decisions — CONFIRMED

The story author surfaced two decisions that touch **frozen Epic 5 contracts**. Both are now confirmed (not pending):

- **Decision D1 (delivery seam) — CONFIRMED:** 6.6 does the deterministic selection + persistence + `claim.peer_mesh_pinged` emission + response recording + AR-61 fallback, and **persists delivery-neutral ping intents** (one `claim_peer_mesh_pings` row per selected member — see Task 3) — **no live multi-target channel fan-out in 6.6** (there is still NO live `dispatch()` caller anywhere, and memory `[[project_channels_no_live_dispatch_yet]]` says fan-out "lands later"). Live fan-out is the dispatch-composition story's job.
- **Decision D2 (alert category) — CONFIRMED:** `peer_mesh_verification_request` is **NOT** in the frozen 9-value `AlertCategory` union (`packages/contracts/src/alerts/alert.ts:44`) and 6.6 does **not** edit that union. 6.6 persists the ping intent's `message_key` without binding any `AlertCategory`; a dedicated category (new 10th value, or reuse of an existing one) is resolved by the dispatch-composition story when it wires live delivery.

---

## Acceptance Criteria

> Lifted from epics.md §Story 6.6 (lines 2392–2413). Event naming reconciled to the codebase `resource.action` single-dot snake_case convention + the Story 6.1 frozen vocabulary (see Dev Notes "Event naming"). FR/AR provenance: PRD §4.6 FR-39; architecture (deterministic-evaluation discipline, §§ cited in References); AR-61 staff-fallback (cross-cutting, epics.md:2280).

**AC1 — Deterministic selection.**
**Given** FR-39
**When** the peer-mesh selection runs for a claim
**Then** the selection is **deterministic**: given `(deceased_member_id, claim_case_id, pariwar_members_at_claim_time_snapshot, metric_config)`, the output 5 member IDs are **reproducible by replay** — the pure `selectPeerMesh(...)` function has no clock, no randomness, no I/O, no mutable module state, and imposes a **total order** on candidates (so there are never ambiguous ties).
**And** "nearest" is defined by a **documented, registry-driven metric** — NOT hardcoded — resolved from a versioned metric registry (see Dev Notes "The `nearest` metric" + **Decision D3**). The v1 metric `district_cohort_v1` ranks by: (1) same **posting district** as the deceased (`member_postings.district`), then (2) **cohort proximity** (`|candidate.createdAt − deceased.createdAt|`), then (3) `member_id` ascending as the total-order tiebreak.

**AC2 — Snapshot capture + persistence.**
**Given** the determinism requirement
**When** the selection runs
**Then** the **selection-input snapshot** (the candidate member set as captured at selection time: `member_id`, `district`, `created_at`) AND the **output** (the ordered 5 `member_id`s + `metric_id` + `metric_version`) are persisted in a new tenant-isolated `claim_peer_mesh_selections` row, so a later replay re-runs `selectPeerMesh` on the **persisted snapshot** and gets a **byte-identical** result — replay never depends on live (mutable) membership.

**AC3 — Ping emission + intent construction.**
**Given** a completed selection
**When** the mesh is pinged
**Then** a single `claim.peer_mesh_pinged` event is emitted via `claim.projectClaimState` (the ONLY legal writer to `claims.current_state`), advancing `documents_pending → verification_in_progress`; its payload carries the audit shape + the selected member IDs + `metric_id`/`metric_version` (6.6 **owns** this event — it is the first emitter, so enriching the 6.1 placeholder payload is safe; see Dev Notes).
**And** a per-selected-member **ping intent** is constructed and persisted as one row per selected member in the new `claim_peer_mesh_pings` table (`selection_id`, `member_id`, `message_key`, `constructed_at` — see Task 3); **live channel fan-out is deferred per Decision D1** — the intents are durably recorded, not dispatched over push/whatsapp/sms in this story. This is the concrete artifact the later dispatch-composition story reads to know who to actually send to — "recorded" means a persisted row, not an in-memory object the job discards on completion.

**AC4 — Response recording (annotation event).**
**Given** a pinged peer
**When** a response arrives
**Then** it is recorded as a `claim.peer_mesh_responded` event (a **NEW** event type this story adds — NOT in the Story 6.1 vocabulary) carrying `responder_member_id` + `response: 'confirmed' | 'denied' | 'unknown'`. It is an **annotation event** — `from_state === to_state === 'verification_in_progress'` (the reducer treats it as identity; it does not advance the primary state).
**And** non-responses within the configurable window default to **"no response"** (absence), NEVER to `'denied'`.

**AC5 — Replay determinism (byte-identical).**
**Given** a replay test
**When** the same selection inputs (the persisted snapshot + metric config) are provided to `selectPeerMesh`
**Then** the same 5 member IDs are selected, in the same order; results are **byte-identical** across replays and across machines.

**AC6 — AR-61 staff-fallback (insufficient responses).**
**Given** AR-61 staff-fallback (cross-cutting, epics.md:2280)
**When** fewer than 3 peer responses arrive within the configurable window
**Then** the case falls back to **ground-inspection-primary** verification; the selection row's `outcome` records `insufficient_responses_fallback`; the operator is surfaced a signal to **extend the window** or **skip peer-mesh with a documented reason**. (Live operator *notification* delivery follows Decision D1's deferred-fan-out seam; the **signal/disposition is recorded** in this story so the verifier console / operator queue can read it.)
**And** the fallback NEVER auto-denies the claim and NEVER advances state past `verification_in_progress` — peer-mesh + ground-inspection are **both, not either** (PRD §4.6); insufficient peer response is a *signal*, adjudication remains the verifier's (Story 6.10/6.11).

---

## Tasks / Subtasks

- [x] **Task 1 — Metric registry + pure selection engine (AC1, AC5) — pure, unit-tested**
  - [x] Author `packages/domain/src/claim/peer-mesh-metric-registry.ts` — a **data-driven** metric registry (mirror the niyamavali clause-registry **discipline** `[[project_niyamavali_precedence_is_provenance]]` — the engine *reads* config, never hardcodes the metric — **not its structure**: niyamavali's registry is a DB-backed table with diff-based amendment storage (`packages/domain/src/niyamavali/{read,write,diff}.ts`); there is no niyamavali `registry.ts` file to copy. `peer-mesh-metric-registry.ts` is a static TypeScript registry whose entries carry explicit `metric_version`; no DB-backed registry, amendment workflow, or diff-storage subsystem). Export `PEER_MESH_METRIC_REGISTRY` keyed by `metric_id`, each entry `{ metric_id, metric_version, describe }`, plus `resolvePeerMeshMetric(metricId?): PeerMeshMetricConfig` that defaults to `district_cohort_v1`. Keep the registry the ONE authority — re-tune by editing DATA, never by adding branching in the engine.
  - [x] Author `packages/domain/src/claim/peer-mesh.ts` — the **pure** `selectPeerMesh(input: PeerMeshSelectionInput): PeerMeshSelectionResult`. Input: `{ deceasedMemberId, claimCaseId, deceased: { district: string | null; createdAt: Date }, candidates: PeerMeshCandidate[], metric: PeerMeshMetricConfig, count?: number /* default 5 */ }`. `PeerMeshCandidate = { memberId: MemberId; district: string | null; createdAt: Date }`. **No clock, no randomness, no I/O, no mutable module state.**
  - [x] Implement `district_cohort_v1` as a **total-order** comparator: primary — district-match-with-deceased first (`candidate.district === deceased.district`, both non-null); secondary — ascending `|candidate.createdAt.getTime() − deceased.createdAt.getTime()|` (cohort proximity); tertiary — `memberId` ascending (lexicographic string compare). The `memberId` tiebreak makes the order **total** (never ambiguous). Take the first `count` (5). If fewer than 5 candidates exist, return as many as available + surface `selectedCount` (document the degenerate case; do NOT throw).
  - [x] **Do NOT invent geo / lat-lng / school-proximity / contribution-time columns** (mirrors `[[project_membership_number_deferred_feature]]` discipline). Those substrate fields do not exist; `member_postings.district` (plaintext, non-PII) + `members.created_at` are the ONLY available signals in v1. Richer metrics land via new registry entries when their substrate lands (Epic 8/9 contribution-time — note `[[project_engine_never_infers_contribution_facts]]`: the engine must never *compute* contribution facts).
  - [x] Unit tests (`packages/domain/tests/claim/peer-mesh*.test.ts` — **`.test.ts`, not `.spec.ts`**: `packages/domain/vitest.config.ts`'s `include` is `['tests/**/*.test.ts', 'tests/integration/**/*.spec.ts']`; a pure unit test named `.spec.ts` outside `tests/integration/` matches neither glob and would be silently skipped, `passWithNoTests: true` masking the gap): determinism (same input → same 5, twice, deep-equal); byte-identical **replay** (serialize input → deserialize → re-run → identical); district-primary ordering; cohort-secondary ordering within a district; `member_id` tiebreak resolves equal district+cohort; `< 5` candidates returns all + correct `selectedCount`; deceased `district: null` (no posting) degrades to cohort+tiebreak only.

- [x] **Task 2 — Candidate-roster snapshot read (AC2) — transport-free accessor**
  - [x] Add `getPeerMeshCandidateSnapshot(db, { pariwarId, deceasedMemberId, excludeActorId }): Promise<PeerMeshCandidate[]>` in `packages/domain/src/claim/read.ts` (or a small `peer-mesh-read.ts`). Query `members` `WHERE pariwar_id = $ AND state = 'active'` (reuse `validity.ACTIVE_STATES` — `packages/validity-service/src/payload.ts:48`) `AND member_id NOT IN (deceasedMemberId, excludeActorId?)`, LEFT-JOIN each member's **latest** posting district (newest `member_postings` row by `created_at`, per `getMemberPostingLatest` semantics — `packages/domain/src/member/posting.ts:117`). Return `{ memberId, district, createdAt }[]`. **Clamp every dynamic `.limit()`** if one is used (domain-invariants gate `[[project_domain_limit_clamp_and_savepoint_retry]]`); prefer no user-controlled limit here.
  - [x] The accessor is a pure read (no decryption, no I/O beyond the query) — mirror `getMemberKycProfile`'s "no work in the accessor" discipline. District is **plaintext non-PII** (`member_postings` header) — safe to select + persist + log. Do NOT touch the encrypted `member_addresses` line.

- [x] **Task 3 — `claim_peer_mesh_selections` table + persistence + migration (AC2, AC6)**
  - [x] Add `packages/domain/src/schema/claim_peer_mesh_selections.ts` — Drizzle table. Columns: `selection_id uuid PK` (`defaultRandom`, branded — add a `PeerMeshSelectionId` brand in `ids/index.ts` following the `PostingId` precedent), `claim_case_id uuid NOT NULL` (`$type<ClaimId>()`, FK → `claims.claim_case_id`), `pariwar_id uuid NOT NULL` (`$type<PariwarId>()`, RLS predicate), `deceased_member_id uuid NOT NULL` (`$type<MemberId>()`), `metric_id text NOT NULL`, `metric_version integer NOT NULL`, `selected_member_ids uuid[] NOT NULL` (ordered 5), `candidate_snapshot jsonb NOT NULL` (the input rows `{memberId, district, createdAt}` — the audit-replay source; all non-PII), `response_window_expires_at timestamptz NOT NULL`, `outcome` pgEnum `peer_mesh_outcome` (`pending | sufficient | insufficient_responses_fallback | skipped`, default `pending`), `created_at timestamptz defaultNow`. Add `uniqueIndex` on `claim_case_id` (one selection per claim — idempotency anchor) + `index` on `pariwar_id`.
  - [x] The snapshot + selected IDs + metric are **immutable** once written (audit record); only `outcome` and `response_window_expires_at` are mutable (fallback job / operator extend). Document this "immutable selection, mutable disposition" split in the header.
  - [x] Add `packages/domain/src/policies/claim-peer-mesh-selections-rls.ts` — copy the `claims-rls.ts` `nullif(current_setting('app.pariwar_id', true), '')::uuid` construct exactly; register in `policies/index.ts`. Re-export the table from `schema/index.ts`.
  - [x] **Hand-author** the migration (`0054_claim-peer-mesh.sql` — next after 6.5's `0053_claim-documents.sql`), covering BOTH `claim_peer_mesh_selections` and `claim_peer_mesh_pings` in one file, per the frozen-baseline discipline — **never regenerate an applied migration**, fix the journal `when` to follow the daily sequence, apply clean to `twt-test-pg` (:5433). See `[[project_live_db_test_gotchas]]` + Story 6.5's 0053 approach.
  - [x] Add `persistPeerMeshSelection(client, input)` + `getPeerMeshSelectionByClaim(db, pariwarId, claimCaseId)` accessors (claim module). Persist under `app.pariwar_id`; the insert is idempotent on `claim_case_id` (`onConflictDoNothing` — a re-run finds the existing row).
  - [x] **Ping-intent durability (AC3):** add `packages/domain/src/schema/claim_peer_mesh_pings.ts` — a small Drizzle table, ONE row per selected member, in the SAME migration as `claim_peer_mesh_selections`. Columns: `ping_id uuid PK` (`defaultRandom`), `selection_id uuid NOT NULL` (FK → `claim_peer_mesh_selections.selection_id`, `onDelete: 'cascade'`), `pariwar_id uuid NOT NULL` (`$type<PariwarId>()`, RLS predicate — copy the same `claims-rls.ts` construct as the selections table), `member_id uuid NOT NULL` (`$type<MemberId>()` — the ping target), `message_key text NOT NULL default 'peer_mesh_verification_request_v1'` (a versioned copy-template key, NOT an `AlertCategory` — Decision D2 keeps the frozen union untouched; the dispatch-composition story maps `message_key` → whatever category it lands on), `constructed_at timestamptz defaultNow`. `uniqueIndex` on `(selection_id, member_id)` (one intent per member per selection — idempotency anchor, mirrors the selections table's own pattern). This table is intentionally minimal and has NO dispatch-status columns (`dispatched_at`, `channel`, etc.) — those are the dispatch-composition story's job to add via its own migration when D1 is resolved; 6.6 only owns "an intent was constructed for member X," not delivery state.
  - [x] Add `persistPeerMeshPingIntents(client, selectionId, memberIds)` (bulk-insert, same scope-tx as `persistPeerMeshSelection`) + `getPeerMeshPingIntentsBySelection(db, pariwarId, selectionId)` accessors (claim module).

- [x] **Task 4 — `claim.peer_mesh_responded` event + enriched `claim.peer_mesh_pinged` payload (AC3, AC4)**
  - [x] In `packages/domain/src/claim/events.ts`: **enrich** the existing `ClaimPeerMeshPingedPayloadSchema` (line 107 — owned by 6.6, first emitter, NO historical events so no break) to `z.object({ ...auditShape, selected_member_ids: z.array(UuidString).min(1).max(5), metric_id: z.string().min(1), metric_version: z.number().int().positive() }).strict()`.
  - [x] Add `ClaimPeerMeshRespondedPayloadSchema = requireIdentityTransition({ ...auditShape, responder_member_id: UuidString, response: z.enum(['confirmed','denied','unknown']) })` (reuse the `requireIdentityTransition` helper the ground-inspection annotation event already uses — `events.ts`). Register `'claim.peer_mesh_responded'` in `CLAIM_EVENT_PAYLOAD_SCHEMAS` + the `ClaimEventType` union.
  - [x] Register `'claim.peer_mesh_responded'` in `EVENT_TYPE_REGISTRY` (`packages/events/src/registry.ts`) importing the schema from `@twt/domain` (`claim.*` namespace).
  - [x] In `packages/domain/src/claim/state.ts`: the reducer must treat `claim.peer_mesh_responded` as **identity** (annotation — returns current state unchanged). Verify the existing total-reducer fallthrough already yields identity for a non-advancing event type; add it explicitly to the transition doc table (alongside `ground_inspection_scheduled`) rather than relying on implicit fallthrough. Update the Story 6.1 transition-table comment block accordingly.
  - [x] `add responToPeerMeshPing`... Add `recordPeerMeshResponse(client, input)` in the claim module — validates the responder was one of the selected 5 (read the selection row), then emits `claim.peer_mesh_responded` via `claim.projectClaimState` (identity transition, `from_state === to_state === 'verification_in_progress'`, `actor: 'member'`). Reject a responder not in `selected_member_ids` (a non-selected member cannot vote — non-manipulability).

- [x] **Task 5 — Selection + ping orchestration job (AC1, AC2, AC3) — idempotent**
  - [x] Add `QUEUE_NAMES.CLAIM_PEER_MESH_SELECT` (`packages/queue/src/index.ts`) + a pg-boss worker `apps/jobs/src/claim-peer-mesh.ts` (precedent: `claim-ocr-parity.ts`; the ONLY wiring point is `boot.ts` — verified `registerClaimOcrParityWorker` is imported + called there alone; `apps/jobs/src/index.ts` is the package's unrelated public barrel (audit-integrity exports) and `deps.ts` is unrelated KMS dependency construction — do NOT touch either). The job, in ONE scope-tx (`app.pariwar_id` set): (1) idempotency probe — if a `claim_peer_mesh_selections` row exists for the claim, no-op; (2) read the deceased's latest district + `created_at`; (3) `getPeerMeshCandidateSnapshot`; (4) `resolvePeerMeshMetric` → `selectPeerMesh`; (5) `persistPeerMeshSelection` (snapshot + 5 IDs + metric + `response_window_expires_at = now + window`); (6) emit `claim.peer_mesh_pinged` via `claim.projectClaimState` (`documents_pending → verification_in_progress`, `actor: 'system'`, `trigger: 'peer_mesh_selected'`); (7) `persistPeerMeshPingIntents` — one `claim_peer_mesh_pings` row per selected member (Decision D1 — durably recorded, not dispatched); (8) enqueue the Task 6 window-expiry job with `sendAfter`/`startAfter` = the window, `singletonKey = claim_case_id`. **No precedent in this codebase for delayed scheduling:** pg-boss is `12.19.1` and the `sendAfter`/`startAfter` option names are correct for that version, but every existing job (e.g. `member-renewal-lifecycle.ts`) only demonstrates `singletonKey` on an immediate send — the delay half is a first use here. Write an explicit integration test that proves the window job actually fires after the configured delay (not just that it enqueues without error).
  - [x] **Trigger seam (UPDATE `apps/jobs/src/claim-ocr-parity.ts`):** after the OCR job emits `claim.documents_received` (state → `documents_pending`), enqueue `CLAIM_PEER_MESH_SELECT` (`singletonKey = claim_case_id`, so a re-run of the OCR job doesn't double-select). **Read that file fully first** (it is an UPDATE, not NEW): preserve its idempotency, its scope-tx boundaries, its `put`-then-enqueue compensation, and the single-writer `claim_documents` discipline — the peer-mesh enqueue rides *after* a successful `documents_received`, never before. Document the enqueue as the automatic "auto-ping 5 nearest" trigger (epics.md:2260).
  - [x] The response window is **configurable** (env / config const, default per FR-39 = 72h). Do NOT hardcode `72h` inline in two places — one named config constant.

- [x] **Task 6 — Window-expiry AR-61 fallback job (AC6) — idempotent**
  - [x] `QUEUE_NAMES.CLAIM_PEER_MESH_WINDOW` + worker (same `apps/jobs/src/claim-peer-mesh.ts`). On fire: count `claim.peer_mesh_responded` events for the claim (`getPeerMeshResponses` — events_log query, event-log-as-truth); if `>= 3` → set `outcome = 'sufficient'`; if `< 3` → set `outcome = 'insufficient_responses_fallback'` and record the operator signal (a disposition the verifier console / operator queue reads). **Never** auto-deny, **never** advance state past `verification_in_progress`. Idempotent (re-fire recomputes the same outcome from the same event count; `outcome` write is a plain non-`state` UPDATE, no projector guard needed).
  - [x] Operator "extend window / skip with documented reason" affordance: model as an operator-callable `extendPeerMeshWindow` / `skipPeerMesh(reason)` domain function that updates `response_window_expires_at` / sets `outcome = 'skipped'` + records the reason. The member-facing/operator UI surface + live notification delivery are **deferred** (Decision D1 seam) — record the disposition; do not build the console mount here (same boundary as 6.5's `<DocumentTypeChooser>` deferral).

- [x] **Task 7 — Tests (all ACs) — `pnpm ci:local` green (DATABASE_URL on :5433)**
  - [x] Unit (Task 1) — the determinism/replay suite above.
  - [x] Integration (live DB): OCR `documents_received` → `CLAIM_PEER_MESH_SELECT` → `claim_peer_mesh_selections` row persisted (snapshot + 5 ordered IDs + metric) + **5 `claim_peer_mesh_pings` rows persisted** (one per selected member, `message_key` set) + `claim.peer_mesh_pinged` appended + state `verification_in_progress` + window job enqueued; **idempotency** (run select twice → one selection row, still exactly 5 ping-intent rows not 10, one pinged event, state stable).
  - [x] Integration: **replay** — reload the persisted `candidate_snapshot`, re-run `selectPeerMesh`, assert byte-identical to `selected_member_ids` (AC5 end-to-end).
  - [x] Integration: response recording — `recordPeerMeshResponse` for a selected member appends `claim.peer_mesh_responded`, state stays `verification_in_progress` (identity); a **non-selected** member is rejected.
  - [x] Integration: fallback — `< 3` responses at window expiry → `outcome = insufficient_responses_fallback`, no state advance, no auto-deny; `>= 3` → `outcome = sufficient`.
  - [x] Integration: **RLS** cross-tenant isolation on `claim_peer_mesh_selections` AND `claim_peer_mesh_pings` (a different-Pariwar reader sees nothing on either table).
  - [x] Confirm every invariant gate stays green: `claim-state-invariant` (all state writes via the projector), `claim-canonical-id`, `domain-invariants` (limit clamps), `pii-scrape` (no PII in peer-mesh — member IDs + plaintext district only), `schema-diff` (migration matches), `i18n-parity` (avoid adding member-facing copy — delivery is deferred, so no new locale keys should be needed).
  - [x] Live-DB gotchas: assert **membership**, not counts, where own-committing writers accumulate rows; run any suspect spec in isolation to confirm innocence `[[project_known_livedb_test_failures]]`; `--concurrency=4` already set in ci-local.sh `[[project_ci_local_concurrency_oversubscription]]`.

### Review Findings

- [x] [Review][Patch] Zero-candidate selection has no defined disposition — FIXED: when `selectedCount === 0`, the select job sets `outcome='skipped'` with a bounded machine-readable reason (`PEER_MESH_SKIP_REASON_NO_ELIGIBLE_CANDIDATES = 'no_eligible_candidates'`) immediately, bypasses the window job entirely — no `claim.peer_mesh_pinged` emitted, claim stays `documents_pending`, operator resolves via ground-inspection. [apps/jobs/src/claim-peer-mesh.ts runClaimPeerMeshSelect, packages/domain/src/claim/peer-mesh-persist.ts]
- [x] [Review][Patch] No reconciliation path when the window-job enqueue silently fails — FIXED: the idempotency probe re-issues the `CLAIM_PEER_MESH_WINDOW` enqueue (timed off the PERSISTED `response_window_expires_at`, no "job exists?" probe) whenever an existing selection is found with `outcome='pending'`, self-healing a previously lost enqueue. Made safe by also switching the `claim.peer_mesh_window` queue to pg-boss `policy: 'short'` (review finding: pg-boss's default `'standard'` policy — used by every other queue in this codebase — applies NO `singletonKey` uniqueness at all in this pg-boss version; only `'short'` actually prevents duplicate not-yet-fired jobs). [apps/jobs/src/claim-peer-mesh.ts]
- [x] [Review][Patch] No conflict-resolution rule for duplicate/contradictory peer responses — FIXED: `recordPeerMeshResponse` now rejects a second response from an already-responded selected member via `PeerMeshResponderAlreadyRespondedError`, enforced TRANSACTIONALLY (`SELECT ... FOR UPDATE` on the member's own ping-intent row serializes concurrent duplicate submissions to exactly one committed event). [packages/domain/src/claim/peer-mesh-persist.ts]
- [x] [Review][Patch] recordPeerMeshResponse accepts responses with no guard on claim state or resolved outcome — FIXED: rejects with `PeerMeshClaimNotInVerificationError` when the claim has left `verification_in_progress`, and `PeerMeshWindowResolvedError` when the AR-61 outcome already resolved. [packages/domain/src/claim/peer-mesh-persist.ts]
- [x] [Review][Patch] AR-61 outcome can silently flip after resolution with no audit trail — FIXED: `resolvePeerMeshOutcome` is now MONOTONIC (`UPDATE ... WHERE outcome = 'pending'`) — a stray/duplicate window-job fire after resolution is a pure no-op. The window job also SELF-DEFERS (re-enqueues for the remaining time instead of resolving) when it fires before the persisted deadline — the companion mechanism the window-extend fix needs. [apps/jobs/src/claim-peer-mesh.ts, packages/domain/src/claim/peer-mesh-persist.ts]
- [x] [Review][Patch] extendPeerMeshWindow resets outcome to pending but never reschedules the window job — FIXED: added `extendPeerMeshWindowAndReschedule` (apps/jobs — the only sanctioned live-operator-path caller) which calls the domain DB-only `extendPeerMeshWindow` THEN re-enqueues `CLAIM_PEER_MESH_WINDOW` at the new deadline. [apps/jobs/src/claim-peer-mesh.ts, packages/domain/src/claim/peer-mesh-persist.ts]
- [x] [Review][Patch] No DB-level constraint bounds selected_member_ids array size — FIXED: added `CHECK (cardinality(selected_member_ids) <= 5)` to both the Drizzle schema and the hand-edited migration 0054 (0 is legal — the zero-candidate `skipped` disposition persists an empty selection). [packages/domain/migrations/0054_claim-peer-mesh.sql, packages/domain/src/schema/claim_peer_mesh_selections.ts]
- [x] [Review][Patch] Test coverage gaps on operator affordances (extendPeerMeshWindow/skipPeerMesh) and key edge paths — FIXED: added live-DB integration coverage for excludeActorId, zero-candidate disposition, duplicate-response rejection, claim-state/window-resolved guards, outcome monotonicity, self-defer-on-extend, skipPeerMesh reason validation, and a DB-layer CHECK-constraint test. [apps/jobs/tests/claim-peer-mesh.test.ts]
- [x] [Review][Patch] Concurrent select-job race can emit event/ping-intents for a different member set than the persisted row — FIXED: the event payload and `persistPeerMeshPingIntents` call now use `selectionRow.selectedMemberIds` (the authoritative persisted row, correct on both the fresh-insert and lost-the-race conflict paths), never the locally-computed `selection.selectedMemberIds`. [apps/jobs/src/claim-peer-mesh.ts]
- [x] [Review][Patch] Ping intents are persisted even when the pinged event was skipped — FIXED: `persistPeerMeshPingIntents` moved INSIDE the `documents_pending` guard, alongside the event emission. [apps/jobs/src/claim-peer-mesh.ts]
- [x] [Review][Patch] Replay determinism gap — the deceased's district/createdAt reference point is re-derived live at replay, not persisted in the snapshot — FIXED: added `deceased_district`/`deceased_created_at` columns (migration 0054 hand-edited + schema updated), persisted at selection time, read back for replay — never re-queried live. Verified with a dedicated regression test (change the deceased's live posting after selection; replay still matches the original). [packages/domain/src/schema/claim_peer_mesh_selections.ts, packages/domain/migrations/0054_claim-peer-mesh.sql, apps/jobs/src/claim-peer-mesh.ts, packages/domain/src/claim/peer-mesh-persist.ts]
- [x] [Review][Patch] excludeActorId is never passed — the claimant is not excluded from their own peer mesh — FIXED: the claim row (and its `claimantActorId`) is now fetched BEFORE the candidate snapshot query, and `excludeActorId` is passed through. [apps/jobs/src/claim-peer-mesh.ts]
- [x] [Review][Patch] Drizzle schema is missing the claim_case_id FK that the hand-authored migration actually creates — FIXED: added the matching `.references(() => claims.claimCaseId, { onDelete: 'cascade' })`. [packages/domain/src/schema/claim_peer_mesh_selections.ts]
- [x] [Review][Patch] skipPeerMesh(reason) accepts an empty/whitespace-only reason — FIXED: trims + rejects blank input via `PeerMeshInvalidSkipReasonError`. [packages/domain/src/claim/peer-mesh-persist.ts]
- [x] [Review][Defer] No FK from deceased_member_id / member_id to members [packages/domain/src/schema/claim_peer_mesh_selections.ts:82] — deferred, pre-existing (claims.deceasedMemberId itself has no FK to members either — established convention, not a 6.6-specific regression)
- [x] [Review][Defer] getPeerMeshCandidateSnapshot has no cap on active-roster size [packages/domain/src/claim/peer-mesh-read.ts] — deferred, pre-existing (explicit story design per Task 2: "prefer no user-controlled limit here"; a scale-driven follow-up, not a defect against stated scope)
- [x] [Review][Defer] Live-DB RLS test runs under a role that structurally bypasses RLS [apps/jobs/tests/claim-peer-mesh.test.ts] — deferred, pre-existing (disclosed RECORDED VARIANCE, consistent with Story 6.5 precedent; FORCE RLS DDL + policies are the acknowledged structural backstop)

### Additional fix found during patch application (not one of the original 14 findings)

- [x] **[Review][Patch] `getPeerMeshCandidateSnapshot` + `getPeerMeshDeceasedAttributes` had a live, reproducible (~30-40% of runs) wrong-district bug** — the correlated subquery's WHERE clause interpolated the OUTER `members.memberId`/`members.pariwarId` Column objects, which Drizzle renders as BARE unqualified `"member_id"`/`"pariwar_id"` (no table prefix) when the column is referenced from a projection already scoped to that table. Because the subquery's OWN `FROM member_postings p` has columns of the SAME names, Postgres resolved the bare reference to the INNER `p.member_id`/`p.pariwar_id` (nearest-scope wins), collapsing the correlation into an always-true `p.member_id = p.member_id` tautology — the subquery silently returned the latest posting district across EVERY member in the tenant, not the outer row's own member. This affected the CORE `district_cohort_v1` ranking for every candidate AND the deceased, not just the new deceased-snapshot addition — pure unit tests never caught it because they never touch the DB read layer. Surfaced by the new AC5-regression replay test (P8 above) flaking under repeated runs; root-caused via direct SQL reproduction, then fixed by qualifying the outer reference with a literal `"members"."member_id"` instead of interpolating the Column object. Verified with 30+ repro-loop runs (0 failures post-fix) and 8 consecutive isolated re-runs of the previously-flaky test. [packages/domain/src/claim/peer-mesh-read.ts]

---

## Dev Notes

### The single most load-bearing constraint: determinism by *persisted snapshot*, not by live query

`selectPeerMesh` is pure, but "pure" alone is not enough for AC1/AC5 — **live membership drifts** (members join, go inactive, change postings). If replay re-queried live members it would diverge. The determinism contract is therefore: **capture the candidate snapshot at selection time, persist it (`candidate_snapshot` jsonb), and replay against the persisted snapshot.** This mirrors the validity-service determinism discipline (`[[project_validity_cache_failopen_pattern]]`, "hit ≡ recompute") and the pool-assignment deterministic-hash precedent (architecture §3445, "computes the deterministic assignment per FR-14 hash + member set"). The member SET is an *input*, snapshotted — never re-derived live at replay.

### The `nearest` metric — registry-driven, substrate-constrained (Decision D3)

FR-39 lists "district > block > school proximity" and epics.md:2403 lists "same district + cohort + geographic distance or contribution-time-correlation". **The substrate does not support most of these today:**
- `members` has NO district/block/geo/cohort columns (only `member_id`, `pariwar_id`, `state`, `state_event_version`, `lock_in_days_at_join`, `created_at`) — see `packages/domain/src/schema/members.ts`.
- `member_addresses.address_line` is **Tier-1 encrypted ciphertext** (`piiColumn(1, 'member_address')`) — unusable as a sort key, and PII.
- `member_postings.district` **IS plaintext non-PII** (its header says so explicitly) and is the member's current geographic posting — this is the ONE usable "district" signal. The current district = newest `member_postings` row (`getMemberPostingLatest`).
- **Contribution-time-correlation** is an Epic 8/9 concern — the engine must **never infer contribution facts** (`[[project_engine_never_infers_contribution_facts]]`).

So v1 = **`district_cohort_v1`** (same-district → cohort-`createdAt`-proximity → `member_id` tiebreak), expressed through a **registry** so richer metrics drop in as new registry entries (+ their substrate) without touching the engine. **Do NOT invent a district/geo column on `members`** — that is the exact anti-pattern called out in `[[project_membership_number_deferred_feature]]` (never invent a substrate column for a deferred capability).

`member_id` as the final tiebreak is not cosmetic: it makes the comparator a **total order**, which is what guarantees a unique, replayable top-5 (ties on district+cohort would otherwise be resolution-order-dependent → non-deterministic).

### Event naming — the Story 6.1 frozen vocabulary (read before Task 4)

- `claim.peer_mesh_pinged` **already exists** in the frozen vocabulary (`packages/domain/src/claim/events.ts:107,250,282`; `EVENT_TYPE_REGISTRY`) as a `documents_pending → verification_in_progress` transition. Its 6.1 payload is a placeholder `z.object({ ...auditShape }).strict()`. **6.6 owns this event and is its first emitter** — there are NO historical events of this type, so enriching the payload with `selected_member_ids`/`metric_id`/`metric_version` is safe and correct (self-describing for audit-replay). Single-dot `resource.action` snake_case — never the epics.md illustrative `claim.peer-mesh.pinged` double-dot spelling (Story 6.1 Dev Notes "Event naming — the pinned seam contract").
- `claim.peer_mesh_responded` is **NEW** — NOT in the 6.1 vocabulary. Add it as an **annotation** event (identity transition — `from_state === to_state === 'verification_in_progress'`), exactly like `claim.ground_inspection_scheduled` (which uses the `requireIdentityTransition` helper and does not advance state — `events.ts:111`). Adding a new `claim.*` event that enters no new state is within a later story's remit (6.1 declared the *state-advancing* vocabulary; owner stories add their annotation events).
- **Emit only through `claim.projectClaimState`** — the single legitimate writer to `claims.current_state` (append event + replay + cache write in one tx under the `app.claim_state_writer` trigger guard). Never `.update(claims).set({ current_state })` — the `claim-state-invariant` CI gate fails the build otherwise. `[[project_member_lifecycle_domain_substrate]]` (claim twin of the member projector).

### State transition (from Story 6.1 authoritative graph)

| From | Event | To | Note |
|---|---|---|---|
| `documents_pending` | `claim.peer_mesh_pinged` | `verification_in_progress` | 6.6 emits (advances state) |
| `verification_in_progress` | `claim.peer_mesh_responded` | `verification_in_progress` | 6.6 — **NEW annotation, identity** |
| `verification_in_progress` | `claim.ground_inspection_scheduled` | `verification_in_progress` | 6.7 — annotation (both, not either) |

Peer-mesh + ground-inspection are **both, not either** (PRD §4.6). Insufficient peer response is a *signal* the verifier weighs (Story 6.10/6.11) — it never auto-denies and never advances state.

### Package locations (where new code lives)

- Pure engine + registry + reads: `packages/domain/src/claim/` (`peer-mesh.ts`, `peer-mesh-metric-registry.ts`, read accessor in `read.ts`). Domain **cannot import `@twt/events`** (turbo cycle) — the projector/reads hit `events_log` directly (`[[project_member_lifecycle_domain_substrate]]`).
- Schema + RLS: `packages/domain/src/schema/claim_peer_mesh_selections.ts` + `claim_peer_mesh_pings.ts` (the durable ping-intent record — see Task 3) + `policies/claim-peer-mesh-selections-rls.ts` (RLS covers both tables).
- Event registration: `packages/events/src/registry.ts` (imports schema from `@twt/domain`).
- Jobs: `apps/jobs/src/claim-peer-mesh.ts` (wiring is `boot.ts` ONLY — verified against the `claim-ocr-parity.ts` precedent; do not touch `index.ts`/`deps.ts`); trigger enqueue is an **UPDATE** to `apps/jobs/src/claim-ocr-parity.ts`.
- Queue names: `packages/queue/src/index.ts` (`QUEUE_NAMES`).
- ID brand: `packages/domain/src/ids/index.ts` (`PeerMeshSelectionId`, per the `PostingId` precedent at :287).

### Decision D1 — delivery seam — CONFIRMED: persist delivery-neutral ping intents; no live fan-out in 6.6

There is **NO live `dispatch()` caller anywhere** (verified: no `DeliveryResolver` factory/composition exported from `@twt/channels`, no live `dispatch(` in `apps/`), and `[[project_channels_no_live_dispatch_yet]]` says live fan-out + multi-target lands later; the frozen `dispatch`/`ChannelProvider`/`DeliveryResolver`/`CANONICAL_CHANNEL_LADDER` must NOT change. **Confirmed:** 6.6 constructs + durably persists ping intents (one `claim_peer_mesh_pings` row per selected member — see Task 3), delivery-neutral (no channel, no dispatch attempt). Live multi-target channel fan-out is out of scope for 6.6; the dispatch-composition story reads this table to know who to actually send to and adds its own dispatch-status columns when it lands. **Acceptance condition recorded in the Dev Agent Record:** live multi-target delivery of peer-mesh pings (and the AR-61 operator alert) activates when the dispatch composition story lands.

### Decision D2 — alert category — CONFIRMED: no AlertCategory binding in 6.6

The `Alert` discriminated union is frozen at **9** `alert_category` values (`packages/contracts/src/alerts/alert.ts:44` — `alert_published, deadline_reminder, contribution_confirmed, contribution_mismatch, claim_status_change, helpdesk_reply, module_new, step_up_otp, niyamavali_amended`). `peer_mesh_verification_request` is **not** among them; the header calls the taxonomy deliberately fixed. **Confirmed:** 6.6 does not edit the frozen union and does not bind any `AlertCategory` — the ping intent's `message_key` (see Task 3) is a plain versioned copy-template key, independent of `AlertCategory`. A dedicated category (new 10th value, or reuse of an existing one) is resolved by the dispatch-composition story when it wires live delivery.

### PII posture

Peer-mesh handles **no PII**: `member_id`s (opaque ids), plaintext `district` (non-PII per `member_postings` header), and `created_at` (non-PII). The `candidate_snapshot` jsonb + `selected_member_ids` + the `claim_peer_mesh_pings` rows (`member_id` + `message_key` + `constructed_at` — no message body, no member contact info) + logs are all safe under the `pii-scrape` gate. Do NOT pull the deceased's name/DoB or any `member_addresses` ciphertext into the selection path — the metric never needs them.

### CI gates + live-DB discipline (must stay green)

- `claim-state-invariant` — every `current_state` write via `claim.projectClaimState` only.
- `domain-invariants` — clamp any dynamic `.limit()`; `[[project_domain_limit_clamp_and_savepoint_retry]]` (also: if you ever retry-on-23505 inside a scope-tx, use a raw `SAVEPOINT` — `db.transaction()` commits the caller's tx early).
- `schema-diff` — hand-authored migration matches the frozen baseline; **never regenerate an applied migration**; fix the journal `when` (`[[project_live_db_test_gotchas]]`).
- `pii-scrape`, `i18n-parity` (avoid new member-facing copy — delivery deferred), `claim-canonical-id`.
- Test DB = `twt-test-pg` Docker on **:5433**; `pnpm ci:local` mirrors all CI jobs (`[[project_ci_actions_suspension_local_mirror]]`); `--concurrency=4` already set (`[[project_ci_local_concurrency_oversubscription]]`). Own-committing writers accumulate rows — assert **membership**, not counts.

### Previous-story intelligence (Story 6.5 — the immediately-prior CONSUMER)

- **Projector is the single writer:** `claim.projectClaimState(client, input)` appends event + replays + writes cache in one caller-owned tx under the `app.claim_state_writer` guard. Requires a raw `pg.PoolClient` with `app.pariwar_id` set. [6.5 Dev Notes]
- **Job pattern:** pg-boss worker in `apps/jobs/src/`, registered through `boot.ts`; queue name in `packages/queue`. Story 6.5's `claim-ocr-parity.ts` is the closest worker precedent. Do not infer edits to `apps/jobs/src/index.ts` or `deps.ts`; modify them only if an independently verified implementation dependency requires it.
- **Migration:** 6.5 hand-authored `0053_claim-documents.sql`, deleted the bloated generated catch-up + snapshot, fixed the journal `when`, applied clean to :5433. Do the same for the peer-mesh table.
- **Boundary deferral pattern:** 6.5 shipped `<DocumentTypeChooser>` + the parser-selection contract but deferred the *live console mount* to 6.10/6.11 with a recorded acceptance condition. 6.6's D1/D2 deferrals follow that exact discipline — build + verify the primitive/contract, record the live-wiring acceptance condition, don't force a surface that doesn't exist yet.
- **Idempotency + compensation:** 6.5 review patches — encrypt-once (not per branch), wrap enqueue in try/catch with best-effort compensation, throw (not fake-succeed) on missing `pariwarId` so pg-boss retries/DLQs. Apply the same rigor to the select/window jobs.

### Git intelligence (recent Epic 6 commits)

`8ce008d` merged 6.5 (death-cert OCR parity + document path chooser); `b49ff66` merged 6.4 (ICP dedup). The claim state machine (6.1), ICP (6.4), and OCR job (6.5) are all on `main`. 6.6 is the next `documents_pending → verification_in_progress` step. Run `git fetch origin` before any remote reasoning (`[[feedback_git_fetch_before_remote_reasoning]]`).

### Project Structure Notes

- New domain modules live under `packages/domain/src/claim/` (namespace re-exported as `claim.*` from `@twt/domain`). No new top-level package — the claim aggregate is domain-resident (Story 6.1 "canonical home is `packages/domain/src/claim/`, NOT a new `packages/claim-lifecycle`").
- `member_postings` (Story 3.9) is the district source; `members.state = 'active'` is the roster filter (`validity.ACTIVE_STATES`).
- No conflict with the frozen `@twt/channels` surface (D1 keeps it untouched) or the frozen `@twt/contracts` `Alert` union (D2 keeps it untouched).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.6 (lines 2392–2413)] — the story + ACs.
- [Source: _bmad-output/planning-artifacts/epics.md:89] — FR-39 (5 nearest, deterministic, district>block>school, ties by member_id, 72h non-response escalate).
- [Source: _bmad-output/planning-artifacts/epics.md:2280] — AR-61 staff-fallback cross-cutting AC (6.6 listed).
- [Source: packages/domain/src/claim/events.ts:107] — `ClaimPeerMeshPingedPayloadSchema` (owned by 6.6) + `requireIdentityTransition` helper (:111 ground-inspection annotation precedent).
- [Source: _bmad-output/implementation-artifacts/6-1-...md#Transition table] — authoritative claim state graph; `documents_pending → claim.peer_mesh_pinged → verification_in_progress`; reducer note (a) on annotation events.
- [Source: packages/domain/src/schema/member_postings.ts] — plaintext non-PII `district` (the "nearest" substrate); `member/posting.ts:117 getMemberPostingLatest`.
- [Source: packages/domain/src/schema/members.ts:83-114] — members columns (NO geo/district/cohort; `created_at` is the cohort proxy).
- [Source: packages/domain/src/schema/member_addresses.ts:62] — address line is Tier-1 ciphertext (why it's NOT the metric).
- [Source: packages/contracts/src/alerts/alert.ts:44] — frozen 9-value `AlertCategory` (D2 constraint).
- [Source: packages/channels/src/dispatch.ts] — frozen `dispatch`/`CANONICAL_CHANNEL_LADDER` (D1 constraint; no live caller).
- [Source: packages/domain/src/claim/project.ts] — `projectClaimState` single-writer.
- [Source: apps/jobs/src/claim-ocr-parity.ts] — job precedent + the `documents_received` trigger seam (UPDATE).
- [Source: packages/validity-service/src/payload.ts:48] — `ACTIVE_STATES` roster filter.
- [Source: _bmad-output/implementation-artifacts/6-5-...md] — previous-story job/storage/migration/deferral patterns.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (BMAD dev-story workflow — Amelia).

### Debug Log References

- `pnpm ci:local` (DATABASE_URL on :5433): all jobs green EXCEPT `channels-determinism`, which is the known flake under concurrent turbo load (`[[project_ci_local_concurrency_oversubscription]]` — the 100×-OS-thread render test is timing-sensitive under CPU starvation). Passes cleanly in isolation (`pnpm --filter @twt/channels test:determinism` → 3/3, ONE distinct hash per channel). Unrelated to this story — `@twt/channels` was never touched.
- Migration `0054_claim-peer-mesh.sql` hand-authored + journal `when=1785382800000` (daily +86400000 after 0053); applied clean to `twt-test-pg` via `db:migrate`; `db:check` → "Everything's fine 🐶🔥".
- Enriching `ClaimPeerMeshPingedPayloadSchema` broke one existing emitter — `tests/integration/claim/claim-lifecycle.spec.ts:215` emitted the placeholder payload. Updated it with the now-required `selected_member_ids`/`metric_id`/`metric_version`. `state.test.ts` uses `ev('claim.peer_mesh_pinged')` (reducer reads only `type`, not payload) → unaffected.

### Completion Notes List

- **Decision D1 (delivery seam) — CONFIRMED:** persist delivery-neutral ping intents (`claim_peer_mesh_pings`, one row per selected member); no live channel fan-out in 6.6. The frozen `dispatch`/`ChannelProvider`/`DeliveryResolver`/`CANONICAL_CHANNEL_LADDER` were NOT touched.
- **Decision D2 (alert category) — CONFIRMED:** no `AlertCategory` binding in 6.6; the frozen 9-value union is untouched. `message_key` is a plain versioned copy-template key (`peer_mesh_verification_request_v1`). A dedicated category is resolved by the dispatch-composition story.
- **Acceptance condition:** live multi-target delivery of peer-mesh pings + the AR-61 operator alert activates when the dispatch-composition story lands and reads `claim_peer_mesh_pings`.
- **Decision D3 (metric — LOCKED):** v1 = `district_cohort_v1` via a static TypeScript registry (`peer-mesh-metric-registry.ts`) — same-district → cohort `|Δcreated_at|` proximity → `member_id` ascending (the total-order tiebreak). NO geo/lat-lng/school/contribution-time columns invented; richer metrics = new registry entries.
- **Determinism by persisted snapshot (AC1/AC5):** `selectPeerMesh` is pure (no clock/rng/IO/mutable state) and defensive-copies the candidate array before sorting; replay re-runs it on the persisted `candidate_snapshot` (createdAt ISO → Date), verified byte-identical in both a domain unit test and a live-DB integration test.
- **RECORDED VARIANCE — active-roster filter:** Task 2 said "reuse `validity.ACTIVE_STATES`"; domain CANNOT import `@twt/validity-service` (that package depends on `@twt/domain` — importing it back would cycle). The active predicate is expressed directly against the `members.state` enum (`eq(members.state, 'active')`) — the SAME value (`ACTIVE_STATES = ['active']`), a legal import. Documented in `peer-mesh-read.ts`.
- **RECORDED VARIANCE — RLS test assertion:** the live-DB RLS test asserts cross-tenant isolation via the accessors' explicit `pariwar_id` predicate (a cross-Pariwar read of the same selection/pings → empty), mirroring the 6.5 OCR test. A pure-RLS-only raw count is not asserted because the dev login role bypasses RLS (superuser); the FORCE RLS DDL + the four policies are the structural backstop.
- **Trigger seam:** `apps/jobs/src/claim-ocr-parity.ts` gained an OPTIONAL `enqueuePeerMeshSelect` dep (wired in `boot.ts` with `singletonKey = claim_case_id`), fired after the claim reaches `documents_pending`. Best-effort — an enqueue failure never fails the (already-committed) OCR job. OCR-only tests don't wire it → no behavior change (all 11 jobs suites stay green).
- **Delayed-fire proof:** the window job's delay (pg-boss `startAfter`, a first use in this codebase) is verified end-to-end by a real-pg-boss integration test (windowSeconds:1 → job fires ~1–4s later and writes `insufficient_responses_fallback`), not just an enqueue assertion.
- **21st claim event:** `claim.peer_mesh_responded` added as an annotation/identity event (reducer returns state unchanged, like `ground_inspection_scheduled`); registered in `CLAIM_EVENT_TYPES` + `CLAIM_EVENT_PAYLOAD_SCHEMAS` + `EVENT_TYPE_REGISTRY`. A non-selected responder is rejected (`PeerMeshResponderNotSelectedError` — non-manipulability).
- **Operator affordances (AC6):** `extendPeerMeshWindow` / `skipPeerMesh(reason)` domain writers record the disposition (mutable `outcome`/`response_window_expires_at`/`skip_reason`); the live console mount + notification delivery are deferred (Decision D1 seam — same boundary discipline as 6.5's `<DocumentTypeChooser>`).
- **Gates:** all invariant gates green — `claim-state-invariant` (every current_state write via the projector; the peer-mesh tables have NO state trigger, `outcome` is a plain column), `domain-invariants` (no user-controlled `.limit()`), `claim-canonical-id`, `pii-scrape` (member ids + plaintext district + created_at only — no PII), `i18n-parity` (no new member-facing copy — delivery deferred), `schema-diff`, `db:check`.

### File List

**New — domain:**
- `packages/domain/src/claim/peer-mesh-metric-registry.ts` — the registry + `district_cohort_v1` comparator + `resolvePeerMeshMetric`.
- `packages/domain/src/claim/peer-mesh.ts` — the pure `selectPeerMesh` engine.
- `packages/domain/src/claim/peer-mesh-read.ts` — candidate/deceased snapshot reads + selection/ping/response reads + `distinctPeerMeshResponderCount`.
- `packages/domain/src/claim/peer-mesh-persist.ts` — selection/ping persistence + `recordPeerMeshResponse` + disposition writers (`resolvePeerMeshOutcome`/`extendPeerMeshWindow`/`skipPeerMesh`) + error types.
- `packages/domain/src/schema/claim_peer_mesh_selections.ts` — the selection table + `peer_mesh_outcome` pgEnum + snapshot-row type.
- `packages/domain/src/schema/claim_peer_mesh_pings.ts` — the ping-intent table + `PEER_MESH_MESSAGE_KEY`.
- `packages/domain/src/policies/claim-peer-mesh-selections-rls.ts` — tenant-isolation RLS for both tables.
- `packages/domain/migrations/0054_claim-peer-mesh.sql` — hand-authored DDL (both tables + enum + FKs + RLS + GRANTs).
- `packages/domain/tests/claim/peer-mesh.test.ts` — pure-engine determinism/replay/ordering unit tests (15).

**New — jobs:**
- `apps/jobs/src/claim-peer-mesh.ts` — the SELECT + WINDOW workers + `registerClaimPeerMeshWorkers`.
- `apps/jobs/tests/claim-peer-mesh.test.ts` — live-DB integration (select/ping/idempotency/replay/response/fallback/RLS + real-pg-boss delayed fire) (7).

**Modified — domain:**
- `packages/domain/src/ids/index.ts` — `PeerMeshSelectionId` + `PeerMeshPingId` brands.
- `packages/domain/src/claim/events.ts` — enriched `ClaimPeerMeshPingedPayloadSchema`; new `ClaimPeerMeshRespondedPayloadSchema`; +1 event type (21).
- `packages/domain/src/claim/state.ts` — explicit `claim.peer_mesh_responded` identity case.
- `packages/domain/src/claim/index.ts` — barrel exports for the 4 new claim modules.
- `packages/domain/src/schema/index.ts` — barrel exports for the 2 new tables.
- `packages/domain/src/policies/index.ts` — barrel export for the new RLS module.
- `packages/domain/migrations/meta/_journal.json` — journal entry idx 54.
- `packages/domain/tests/integration/claim/claim-lifecycle.spec.ts` — enriched-payload fix for the walked `peer_mesh_pinged`.

**Modified — events / queue / jobs:**
- `packages/events/src/registry.ts` — registered `claim.peer_mesh_responded` + enriched pinged description.
- `packages/queue/src/index.ts` — `CLAIM_PEER_MESH_SELECT` + `CLAIM_PEER_MESH_WINDOW` queue names.
- `apps/jobs/src/claim-ocr-parity.ts` — optional `enqueuePeerMeshSelect` trigger seam (fires after documents_pending).
- `apps/jobs/src/boot.ts` — register the peer-mesh workers + wire the OCR enqueuer + `CLAIM_PEER_MESH_WINDOW_SECONDS` config.

## Change Log

| Date | Change |
|---|---|
| 2026-07-10 | Story 6.6 implemented (all 6 ACs, all 7 tasks). Deterministic peer-mesh selection engine + metric registry, `claim_peer_mesh_selections`/`claim_peer_mesh_pings` tables + migration 0054, enriched `claim.peer_mesh_pinged` + new `claim.peer_mesh_responded` annotation event, select+ping and AR-61 window-fallback pg-boss workers, OCR trigger seam. `pnpm ci:local` green (DATABASE_URL :5433) except the known `channels-determinism` concurrency flake (passes in isolation, unrelated). Status → review. |
