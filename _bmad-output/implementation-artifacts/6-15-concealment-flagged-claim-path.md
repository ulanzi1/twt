---
baseline_commit: 7d1677f61d05fa35a70c86f7324a3b5791c7bf66
---

# Story 6.15: Concealment-Flagged Claim Path (SM-1 C7) — Consumer of Story 4.4

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the claim flow processing a case with a concealment flag from Story 4.4,
I want the case to route to State Trustee review with the flag surfaced prominently rather than auto-deny,
so that the R14 concealment-penalty discipline (**flag, never auto-deny**) is preserved end-to-end through the claim flow.

**Story type:** `[CONSUMER]` (+ a thin new production source). This story wires an already-emitted signal (Story 4.4's `concealment_review_required`) into already-shipped surfaces (6.10 verifier console, 6.13 cycle-freeze approval), AND — per ratified D-D — adds the **structured verifier assessment** that produces the underlying fact. It adds **no engine logic, no new lifecycle state, and no automated medical-causality/death-linkage derivation.** The State Trustee (6.13) remains the sole concealment adjudication authority.

### Ratified design decisions (BigDev, 2026-07-14/15) — binding on this story
- **D-A — flag-surface-only.** No automated death-linkage engine (no decrypt-conditions × compare-to-cause-of-death). The trustee judges linkage.
- **D-B — Story 6.13 is the SOLE concealment-decision authority in v1.** Story 6.14 (R9 voting) may *display* the concealment flag when a claim is *independently* R9-routed, but must **NOT** resolve concealment or write any R14 resolution metadata (no reason-code, no clause-version snapshot on the R9 path).
- **D-C — `full` detail visibility = flagged status + R14 clause-version metadata only.** No medical evidence, no disclosed-condition detail, no inferred linkage — for any scope.
- **D-D — human-supplied claim-time linkage fact.** This story adds a **structured verifier assessment** as the production source of `claim.concealed_ima_condition_linked`. The assessment is **tri-state** — `linked | not_linked | unable_to_determine` — and is a **review annotation ONLY**: it emits no approval/denial event and changes no lifecycle state. `linked → flagged`; `not_linked → not_flagged`; **absent OR `unable_to_determine` → `not_evaluated`.** No automated medical-causality/death-linkage engine is introduced (consistent with D-A).
- **D-E — the assessment is timeline-significant.** Each successful assessment/reassessment emits `claim.concealment_assessed` as a **non-PII identity annotation, in the SAME transaction as the assessment-row write**. The reducer handles it as **identity** (no lifecycle-state change). Three distinct evidence layers, none collapsed: the **assessment table** is the authoritative current/read model; **`events_log`** is the immutable evidentiary timeline (the event belongs there, not only in audit); the **audit sink** records the authorized administrative action but is NOT the sole evidence source.

## Acceptance Criteria

1. **(AC1 — flag, route, surface; never auto-deny)** When a claim's deceased member carries the R14 concealment fact (`concealment_review_required` per Story 4.4 / FR-11 — produced in v1 by a `linked` verifier assessment, AC7), the case does **NOT** auto-deny. The claim-scoped concealment signal resolves to `flagged` on the Story 6.10 verifier console (replacing the current hardcoded `not_evaluated`) and is rendered **prominently above the standard signals panel**. No code path converts the flag into a `claim.*_denied` event or a `denied` state — a denial is only ever produced by an explicit human State Trustee decision.

2. **(AC2 — explicit trustee decision at Story 6.13, both directions)** The State Trustee decides explicitly **on the Story 6.13 cycle-freeze surface (the sole concealment-decision authority — D-B)**:
   - **Uphold** → deny, reason-code `concealment_upheld` (already exists; the epic's `concealment-flag-upheld`).
   - **Override** → approve, reason-code `concealment_override` (NEW trustee reason-code; the epic's `concealment-flag-override`), with a mandatory free-text rationale.
   Story 6.14 is NOT a concealment-deciding surface; when a concealment-flagged claim is independently R9-routed, 6.14 may display the flag for context but writes no R14 resolution metadata.

3. **(AC3 — decision provenance, resolved server-side in the decision transaction)** A Story 6.13 trustee decision resolving a concealment-flagged claim (`concealment_upheld` / `concealment_override`) records: the reason-code, the **rule-version snapshot** (`clause_version_id`) of `niy.concealment.r14` **resolved server-side INSIDE the decision transaction** (never accepted from the client/route), the full trustee attestation (actor id + decision-time display snapshot — the 6.11 `admin_display_name` pattern), and an audit-log line. The snapshot persists on the trustee decision row.

4. **(AC4 — consumer pattern preserved)** **Story 4.4 emits** the flag (registry-driven engine evaluation — unchanged), **Story 6.15 consumes by routing** (this story: the verifier assessment supplies the fact → the producer surfaces the flag → the queue/console route it → 6.13 decides), **Story 6.13 is the deciding surface** (this story extends its reason-code + snapshot handling only). No engine logic, no new lifecycle state, no automated linkage derivation (D-A/D-D).

5. **(AC5 — tri-state producer; D10 discipline; effective-scope visibility)** The claim-scoped concealment signal is produced by a **tri-state** producer (`flagged` | `not_flagged` | `not_evaluated`), never a boolean. It is **NEVER derived from the redacted Validity-Service payload** (`specialFlags` / `medicalDisclosureFlags` / `pendingConcealmentFlag`). `detailVisibility` (`full` vs `indicator_only`) is derived from the caller's **effective scoped authorization** (RBAC `hasPermission` + `scopeContains`), **not a role-name check**. The existing structural invariant test (`verifier-console-concealment-invariant.test.ts`) is updated to assert the NEW discipline (signal from the claim-scoped producer/assessment, still never from validity flags), not deleted.

6. **(AC6 — trustee queue carries the real flag via a bulk bounded accessor)** The Story 6.13 cycle-freeze pending list's `concealment_flags` reflects the actual claim concealment flag from the producer, resolved via a **genuinely bulk, bounded (clamped) accessor** — ONE query for the whole pending set (the live assessments read once, keyed by the pending claims; clause resolved once per pariwar), no per-claim producer call in a loop (no N+1).

7. **(AC7 — structured verifier concealment-linkage assessment — the production source, D-D)** A verifier (scope-gated on the existing `claim.verify` permission) can record a **tri-state** concealment-linkage assessment on a claim — `linked | not_linked | unable_to_determine` — as a **review annotation ONLY**:
   - It emits **no approval/denial event** and **changes no lifecycle state** — but it IS timeline-significant (D-E): each successful assessment/reassessment appends `claim.concealment_assessed` (a non-PII identity annotation) to `events_log` **in the SAME transaction as the assessment-row write**, and the reducer case is identity so `claims.current_state` is unchanged. Three evidence layers, none collapsed: the assessment table (authoritative current/read model) · `events_log` (immutable evidentiary timeline) · the audit sink (authorized-admin-action record, not the sole evidence source).
   - It is revisable: at most ONE live assessment per claim (partial-unique `(claim_case_id) WHERE superseded_at IS NULL` + atomic conditional-UPDATE supersession, the 6.11 `reviseDecision` pattern); the full assessment history is retained.
   - It is the production source of the fact `claim.concealed_ima_condition_linked` the AC5 producer reads: `linked → flagged`, `not_linked → not_flagged`, `absent | unable_to_determine → not_evaluated`.
   - Its provenance (actor id + decision-time display snapshot + timestamp) is recorded and audited; any optional note is Tier-1 (encrypted, never in `events_log`).

## Tasks / Subtasks

- [x] **Task 1 — Schema + migrations for the verifier assessment + trustee snapshot** (AC: #2, #3, #7)
  - [x] New enum `claim_concealment_assessment_kind` = `('linked','not_linked','unable_to_determine')` + new table `claim_concealment_assessments`: `assessment_id` (uuid pk), `claim_case_id`, `pariwar_id`, `kind` (the enum), `note_ciphertext` (nullable Tier-1), `actor_id`, `actor_display` (decision-time snapshot, non-empty), `created_at`, `superseded_at` (nullable), `supersedes_assessment_id` (nullable self-fk). Full RLS (the claim-table policy pattern — symmetric, no 6.13 asymmetry), FKs, and **partial-unique `(claim_case_id) WHERE superseded_at IS NULL`**. Drizzle schema file under `packages/domain/src/schema/`.
  - [x] Add nullable `concealment_clause_version_id text` to `claim_state_trustee_decisions` (Task 7). **Scope to this table ONLY — NOT any R9 table (D-B).**
  - [x] Migration split (Postgres `ALTER TYPE … ADD VALUE` discipline — the 6.14 lesson): **`0068`** = new enum type + `claim_concealment_assessments` table (+RLS/FK/partial-unique) + the `concealment_clause_version_id` column; **`0069`** = `ALTER TYPE state_trustee_reason_code ADD VALUE 'concealment_override';` on its own (never mixed with usage, never regenerate an applied migration). Apply + verify live on `:5433`.
- [x] **Task 2 — Verifier assessment write path + identity annotation event (domain)** (AC: #7)
  - [x] Add event `claim.concealment_assessed` to `packages/domain/src/claim/events.ts` with `requireIdentityTransition({ ...auditShape })` (the `verifier_escalated` / `verifier_decision_revised` precedent — `auditShape` only; the tri-state kind + note live in the table, NOT `events_log`). Register its projector payload schema.
  - [x] Add the **identity** reducer case in `packages/domain/src/claim/state.ts` (`case 'claim.concealment_assessed': return state;`) + a documentation-only `transitions` note. This satisfies "changes no lifecycle state" (D-D).
  - [x] Write path in a new `packages/domain/src/claim/concealment-assessment-persist.ts` mirroring `verifier-decision-persist.ts` `reviseDecision`: in ONE scope-tx (D-E — table write + event append are atomic together) — resolve any live assessment, atomically supersede it (conditional `UPDATE … WHERE superseded_at IS NULL RETURNING`; 0 rows ⇒ concurrent-revise 409), insert the new row, and append the `claim.concealment_assessed` identity event via `projectClaimState` (the sole state writer; state stays unchanged). Advisory-lock on a distinct namespace if mirroring the 6.13/6.14 lock discipline. NO approval/denial event, ever. The `events_log` append is REQUIRED (not optional) — the audit-sink line (Task 5) is an ADDITIONAL admin-action record, never a substitute for the evidentiary event (D-E).
  - [x] A read accessor `getLiveConcealmentAssessment(db, pariwarId, claimCaseId)` (partial-unique ⇒ ≤1) + `getLiveConcealmentAssessmentsBulk(db, pariwarId, claimCaseIds[])` (ONE clamped query keyed by the id set — the bulk primitive Task 4 uses).
- [x] **Task 3 — Tri-state producer over the assessment (domain)** (AC: #1, #5, #6)
  - [x] `packages/domain/src/claim/concealment-review.ts`. Single-claim `assessClaimConcealment(db, {pariwarId, claimCaseId, at})` → tri-state:
    ```
    type ClaimConcealmentSignal =
      | { status: 'flagged'; clauseVersionId: string }
      | { status: 'not_flagged'; clauseVersionId: string }
      | { status: 'not_evaluated' };
    ```
    Read the live assessment (Task 2). Map: `absent | unable_to_determine → not_evaluated`; `linked | not_linked` → invoke the reviewed engine path `evaluateConcealmentAt` (`@twt/niyamavali-engine`) with the fact `claim.concealed_ima_condition_linked = (kind === 'linked')` in the `EvaluationContext`, returning `flagged`/`not_flagged` + `clauseVersionId` from the result. `evaluateConcealmentAt` returning `null` (clause unprovisioned) OR a throw → `not_evaluated` (never a false `not_flagged`; D10 fail-soft).
  - [x] **No decrypt, no death-linkage compute** (D-A). Pure-domain (engine + niyamavali accessors — no `@twt/events`/`@twt/validity-service` cycle). Export from `claim/index.ts`.
- [x] **Task 4 — Bulk bounded accessor for the trustee queue** (AC: #6)
  - [x] `assessClaimConcealmentBulk(db, pariwarId, items: {claimCaseId}[], at)` → `Map<claimCaseId, ClaimConcealmentSignal>`. Read ALL live assessments in ONE clamped query (`getLiveConcealmentAssessmentsBulk`); resolve the `niy.concealment.r14` clause version ONCE per pariwar; map each from its assessment kind **deterministically** (linked→flagged, not_linked→not_flagged, else→not_evaluated) — **no per-claim `evaluateConcealmentAt`/DB call in a loop** (the explicit no-N+1 requirement). `clampLimit` on the `.limit()`.
- [x] **Task 5 — API: record-assessment route + wire producer into the 6.10 console** (AC: #1, #5, #7)
  - [x] New route `POST …/admin/claims/:claimCaseId/concealment-assessment` in the claims module: gate on `claim.verify` (district dimension — the existing verifier gate), enforce authenticated HUMAN actor (extend the claim-adjudication human-actor CI gate — `scripts/claim-adjudication-human-actor-invariant/check.ts` — by adding this route file to its `{file, pathSubstrings}` entry array, the same pattern used for verifier-console/cycle-freeze/r9-voting routes), body = `{ kind, note? }` validated by a new contract schema; encrypt the note (Tier-1) before the writer; emit `admin_concealment_assessment.write` audit (non-PII: kind + claim_case_id + actor). Map `ConcealmentAssessmentRevisionConflictError` → 409.
  - [x] In `apps/api/src/modules/claims/claims.verifier-console.handlers.ts`, replace the hardcoded `const concealment = { status: 'not_evaluated', detailVisibility: 'indicator_only' } as const;` (~L163) with the `assessClaimConcealment` result → `ConcealmentSignal`. `detailVisibility`: `full` iff `rbac.hasPermission(ctx.grants, 'cycle.freeze', { dimension:'pariwar', value: ctx.pariwarId, pariwarId: ctx.pariwarId })` (the SAME key + `scopeContains` 6.13 gates its decision on — effective-scope, fails closed); else `indicator_only`. **Do NOT reuse `redaction.ts`'s `CONCEALMENT_VISIBLE_ROLES` role-name set.** Per D-C, `full` adds ONLY the clause-version metadata — never medical evidence.
  - [x] Bump `VERIFIER_CONSOLE_MAX_READS` (9) for the producer's assessment read; update the doc-comment arithmetic AND the live-DB read-count assertion; keep no-N+1 (bounded, row-count-independent).
  - [x] If surfacing the clause version needs a field, add a nullable `clauseVersionId` to `ConcealmentSignal` (populated only for `full`); else keep the shape unchanged.
- [x] **Task 6 — Update the D10 structural invariant test** (AC: #5)
  - [x] Rewrite `apps/api/tests/unit/verifier-console-concealment-invariant.test.ts`: assert concealment comes from the claim-scoped producer (`assessClaimConcealment`) AND the assembler still never assigns concealment from `specialFlags` / `pendingConcealmentFlag` / `medicalDisclosureFlags` / `validity.` / `payload.`. Preserve the whole-file guard.
- [x] **Task 7 — Trustee `concealment_override` + server-side R14 snapshot (6.13 ONLY)** (AC: #2, #3)
  - [x] Add `concealment_override` to `STATE_TRUSTEE_REASON_CODES` + `TRUSTEE_REASON_CODE_OUTCOME_COMPAT` as `concealment_override: ['approved']` (tuple + map together). `trusteeReasonCodeRequiredForOutcome('approved')` stays `false`; `assertReasonCode` accepts it on an approve once mapped. Mirror the value in `packages/contracts/src/claims/cycle-freeze.ts` + its lockstep test.
  - [x] In `state-trustee-decision-persist.ts` `voteOnFrozenClaim`, when `reasonCode ∈ {concealment_upheld, concealment_override}`, resolve the snapshot **server-side, using the tx's own `db` handle, INSIDE the decision `scopeTx`** (`resolveConcealmentClause(tx, pariwarId)`), persist `concealment_clause_version_id`, and add it to the audit-line context (non-PII). A `null` clause resolution on a concealment decision aborts the tx (the 3.5 precedent) — never persist a null snapshot for a concealment-coded decision. Never accept a clause version from the route/client.
- [x] **Task 8 — Admin UI: capture control + prominent flagged banner** (AC: #1, #7)
  - [x] In `apps/admin/src/modules/claim-verification/`, add a verifier concealment-assessment control (tri-state select + optional note) posting to the new route, and render a `flagged` signal **prominently above** the standard signals sections (`SignalsPanel.tsx` `ConcealmentIndicator` — never green a `not_evaluated`/redacted absence; show clause-version for `full`, presence-only for `indicator_only`). Extend `i18n-en.ts`; update `apps/admin/tests/verifier-console.test.tsx`.
- [x] **Task 9 — Queue `concealment_flags` from the bulk accessor** (AC: #6)
  - [x] In `packages/domain/src/claim/cycle-freeze-read.ts`, source `concealmentFlags` from `assessClaimConcealmentBulk` over the pending set (replacing the placeholder verifier-decision-history heuristic `CONCEALMENT_REASON_CODES`). One bulk read per page; scope-safe; clamped.
- [x] **Task 10 — Tests: end-to-end + guardrails** (AC: #1–#7)
  - [x] Live-DB integration (`:5433`): verifier records `linked` → console renders `flagged` with `full`/`indicator_only` by **effective authorization** (`cycle.freeze`-holder → `full`; district `claim.verify`-only → `indicator_only`); claim is NOT auto-denied at any state; surfaces in the trustee queue with `concealment_flags: ['concealment_review_required']`; a 6.13 uphold writes `denied` + `concealment_upheld` + r14 snapshot + audit; a 6.13 override writes `state_trustee_approved` + `concealment_override` + rationale + snapshot + audit.
  - [x] Assessment write-path tests: insert `linked`/`not_linked`/`unable_to_determine`; supersession (revise linked→not_linked keeps one live row + retains history); concurrent-revise → 409; the `claim.concealment_assessed` event is identity (claim state unchanged); NO `claim.*_denied`/approval event emitted. **Same-transaction atomicity (D-E):** each successful write appends exactly one `claim.concealment_assessed` `events_log` row committed WITH the assessment row; a forced-rollback of the tx (the 6.13 `forceQueryFailure` precedent) leaves NEITHER the row NOR the event (no orphan event, no orphan row); the event payload is non-PII (`auditShape` only — no `kind`/note).
  - [x] Producer tri-state matrix: `linked → flagged`; `not_linked → not_flagged`; `unable_to_determine`/absent/clause-unprovisioned/eval-throw → `not_evaluated` (never `not_flagged`).
  - [x] Reason-code test: ordinary approve (`reasonCode: null`) still succeeds; approve with `concealment_override` succeeds; approve with any OTHER trustee code throws.
  - [x] No-auto-deny regression: assessing/loading a concealment-flagged claim emits no `claim.*_denied` and leaves lifecycle state unchanged by the flag alone.
  - [x] Bulk no-N+1: the queue read issues ONE concealment query for a multi-claim page (query count independent of page size).
  - [x] `pnpm ci:local` (`--concurrency=4`) merge gate; run new/edited specs in isolation (known timeout-flaky classes).

## Dev Notes

### The production source, end to end (READ FIRST)
The chain, now fully closed by D-D:
1. **A verifier records a structured tri-state assessment** (AC7) — `linked | not_linked | unable_to_determine` — as a review annotation on the claim. This is the human-supplied `claim.concealed_ima_condition_linked` fact. **No automated medical-causality/death-linkage engine** produces it (D-A/D-D); a human verifier judges it.
2. **The engine (Story 4.4) turns the fact into the flag.** `packages/niyamavali-engine/src/special-death.ts`: `evaluateConcealmentAt(deps, context, at)` evaluates the single `niy.concealment.r14` clause; it raises `specialFlags: ['concealment_review_required']` (`CONCEALMENT_REVIEW_FLAG`) **iff the fact `claim.concealed_ima_condition_linked === true`**. `never_auto_deny: true`; the family only routes/flags — no deny path. The engine EVALUATES the fact, never derives it ([[project_engine_never_infers_contribution_facts]]).
3. **The producer (Task 3) maps assessment → tri-state signal** via that engine call (`linked`→`flagged`, `not_linked`→`not_flagged`, absent/`unable_to_determine`→`not_evaluated`) and captures `clauseVersionId`.
4. **The console + queue surface + route it** to the State Trustee (6.13), who **explicitly** upholds/overrides (D-B) with the r14 clause-version snapshot (AC3). "Never auto-deny" is structural: the ONLY producers of `denied` are explicit human trustee-vote events; the flag has no edge to `denied`.

The producer of `claim.concealed_ima_condition_linked` was named as deferred in the engine header + `producer.ts:17` ("NO source system exists yet"). **This story IS that source** — a verifier annotation, not an inference engine.

### Assessment = annotation, NOT adjudication (the authority boundary — D-B/D-D)
The verifier assessment records *whether an undeclared IMA condition appears linked to death*; it does **not** decide the claim. It emits no approval/denial event and changes no lifecycle state (identity annotation event `claim.concealment_assessed`, reducer identity case — the `verifier_escalated`/`shepherd_assigned` precedent). The State Trustee (6.13) is the SOLE concealment adjudication authority. Keep these two roles strictly separate: a `linked` assessment `flags` and routes; it never denies. Mirror the write path on `verifier-decision-persist.ts` `reviseDecision` (partial-unique one-live-per-claim + atomic conditional-UPDATE supersession + `projectClaimState` as the sole state writer).

### `detailVisibility` — effective scoped authorization, not a role name (revision 4)
`redaction.ts` gates its concealment fields with `CONCEALMENT_VISIBLE_ROLES = {state_trustee, super_admin}` — a **role-name set**. Do NOT copy that. Derive `full` from *effective authority to decide*: `rbac.hasPermission(grants, 'cycle.freeze', {dimension:'pariwar', value: pariwarId, pariwarId})` — the SAME key + `scopeContains` containment 6.13 gates its trustee decision on (`hasPermission` fails closed on every uncertain path). Console visibility then tracks actual decision authority in this Pariwar, and is rename-proof. Confirm `cycle.freeze` is the 6.13 decision key; if it uses another, use that.

### The two deferred seams pointing at this story (verify before editing)
1. **Verifier console concealment tri-state** — `claims.verifier-console.handlers.ts` (~L163): `// When the producer lands (deferred, likely Story 6.15) it plugs into this SAME shape…`. `ConcealmentSignal` (`contracts/src/claims/verifier-console.ts:46-52`) is ALREADY `flagged|not_flagged|not_evaluated` + `indicator_only|full` — you flip `status`; API shape unchanged (except optional nullable `clauseVersionId` for `full`).
2. **Cycle-freeze pending `concealment_flags`** — `cycle-freeze-read.ts:15-43` (the `CONCEALMENT_REASON_CODES` constant + comment block) + `contracts/src/claims/cycle-freeze.ts:88-90`: `// A richer validity-service-sourced member flag is DEFERRED to the same integration…`. Replace the verifier-decision-history placeholder with the bulk producer (Task 9).

### What already exists — REUSE, do not rebuild
- **Trustee reason codes (6.13)** — `state-trustee-decision.ts`: `concealment_upheld` (→denied) exists; ADD only `concealment_override` (→approved). Distinct trustee-owned set (D-F — not the verifier enum).
- **Verifier reason codes (6.11)** — `verifier-decision.ts`: `concealment_flag_override/uphold` exist; do not touch.
- **R14 clause resolver** — `medical/concealment.ts`: `resolveConcealmentClause(db, pariwarId)`, `CONCEALMENT_CLAUSE_ID = 'niy.concealment.r14'`; `null` = atomic-failure (3.5). Use inside the decision tx (AC3).
- **Engine R14 eval** — `@twt/niyamavali-engine`: `evaluateConcealmentAt`, `CONCEALMENT_REVIEW_FLAG`, `CONCEALED_IMA_CONDITION_LINKED`, `ConcealmentFactKey`.
- **Write-path pattern** — `verifier-decision-persist.ts` `reviseDecision` (supersession) + `adjudicateClaim` (two-authority-in-one-tx) + `projectClaimState`; events `events.ts` `requireIdentityTransition({...auditShape})`.
- **RBAC** — `rbac/check.ts` `hasPermission` + `scope.ts` `scopeContains` ([[project_rbac_geo_scope_containment]] — asymmetric, fail-closed).
- **Trustee write path** — `state-trustee-decision-persist.ts` `voteOnFrozenClaim` + `assertReasonCode`; row `claim_state_trustee_decisions` (add snapshot column). Attestation `actorDisplay` = 6.11 `admin_display_name` ([[project_admin_display_name_attribution]]).
- **Console concealment UI** — `SignalsPanel.tsx` `ConcealmentIndicator` renders the tri-state with the D10 "never green a redacted absence" rule.

### Project-structure notes
- Domain cannot import `@twt/events`/`@twt/validity-service` (turbo cycle) — the producer/write-path are pure-domain (engine + niyamavali accessors are domain-internal). The apps/api console + route consume them.
- Migrations: latest applied `0067`; yours `0068` (table+enum+column) then `0069` (`ADD VALUE` alone). Test DB `twt-test-pg` on `:5433`. [[project_live_db_test_gotchas]] — never regenerate an applied migration; DROP-SCHEMA reset strips grants; assert membership not counts.
- Reason/note text is Tier-1, never in `events_log`/audit context; kind + reason-code + clause-version + ids are non-PII and belong on audit lines.
- Every dynamic `.limit()` is clamped ([[project_domain_limit_clamp_and_savepoint_retry]]); retry-on-23505 in a scope-tx needs raw SAVEPOINT.
- Friction-budget baseline is a best-ever ratchet — new banner + control stay under the ceiling; don't "update if shifted" ([[project_friction_budget_baseline_ratchet]]).
- New claim routes must be covered by the claim-adjudication human-actor CI gate — extend it to the assessment route ([[project_channels_no_live_dispatch_yet]] shows the gate-extension discipline; 6.14 extended it to all R9 routes).

### Testing standards
- Vitest; live-DB specs need `DATABASE_URL` on `:5433`; `pnpm ci:local` (`--concurrency=4`) is the merge gate ([[project_ci_actions_suspension_local_mirror]]). Confirm a suspect spec's innocence in isolation ([[project_ci_local_concurrency_oversubscription]]). Symmetric RLS policy-regression on the new table (no 6.13 asymmetry).

### References
- [Source: epics.md#Story 6.15] (L2556-2569); [#Story 4.4] (L1943-1957); [#Epic 6 demoable closure] (L2274 — SM-1 C7 "routes to State Trustee panel for explicit decision (never auto-denied)").
- [Source: packages/niyamavali-engine/src/special-death.ts:94-215] — R14 clause, `CONCEALED_IMA_CONDITION_LINKED`, `evaluateConcealmentAt`, `CONCEALMENT_REVIEW_FLAG` (the authoritative source).
- [Source: packages/domain/src/claim/events.ts:57-280] — `auditShape` + `requireIdentityTransition` (the annotation-event pattern for `claim.concealment_assessed`).
- [Source: packages/domain/src/claim/verifier-decision-persist.ts:216-474] — `reviseDecision` supersession + `adjudicateClaim` + `projectClaimState` (the assessment write-path model).
- [Source: packages/domain/src/claim/state.ts:197-215] — the identity annotation reducer cases (add `claim.concealment_assessed`).
- [Source: apps/api/src/modules/claims/claims.verifier-console.handlers.ts:163-168] — the deferred concealment seam.
- [Source: packages/contracts/src/claims/verifier-console.ts:40-52] — `ConcealmentSignal`.
- [Source: packages/domain/src/claim/cycle-freeze-read.ts:18-46] + [contracts/src/claims/cycle-freeze.ts:88-90] — the deferred `concealment_flags` seam.
- [Source: packages/domain/src/claim/state-trustee-decision.ts:75-139] + [-persist.ts:269-320] — trustee vocabulary + `voteOnFrozenClaim`/`assertReasonCode`.
- [Source: packages/domain/src/medical/concealment.ts] — `resolveConcealmentClause` (AC3 snapshot, inside the tx).
- [Source: packages/domain/src/rbac/check.ts:150-198] — `hasPermission` (effective-scope visibility).
- [Source: packages/validity-service/src/redaction.ts:33] — `CONCEALMENT_VISIBLE_ROLES` (the role-name anti-pattern to AVOID).
- [Source: apps/api/tests/unit/verifier-console-concealment-invariant.test.ts] — the D10 test to UPDATE (not delete).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, Opus 4.8).

### Debug Log References

- Migrations `0068`/`0069` applied + verified live on `:5433` (enum, table+RLS+partial-unique, snapshot column, `ALTER TYPE … ADD VALUE 'concealment_override'`).
- `events_log.actor_id` is a UUID column — domain integration seed actor ids must be real UUIDs (fixed in `concealment.spec.ts`).
- API E2E: super_admin's `role_grants` row must carry the CLAIM's `pariwar_id` for scope resolution to admit the actor (global dimension is scope-exempt but membership resolution still keys on the row); the 403 case needs a role WITH a pariwar grant but WITHOUT `claim.verify` (used `helpline_operator`).
- `pnpm ci:local` (with DATABASE_URL): every gate green EXCEPT `integration-tests`, which showed 2 count-assertion failures in `cross-pariwar-leak.spec.ts`. Confirmed innocent: that spec passes in isolation, passes alongside the new `concealment.spec.ts`, and the full domain suite passes 949/949 under vitest's own sequencing — the failure is the known cross-spec own-committing-rows contamination under turbo concurrency ([[project_ci_local_concurrency_oversubscription]] / [[project_live_db_test_gotchas]] "assert membership not counts"), not a regression from this story.

### Completion Notes List

- **Producer realization — a deliberate, ratified-consistent deviation from the literal Dev Notes.** Task 3 describes the single-claim producer calling `evaluateConcealmentAt` (`@twt/niyamavali-engine`). That import is **architecturally impossible** from `@twt/domain`: the engine DEPENDS ON domain (`@twt/niyamavali-engine → @twt/domain`), so a domain→engine import is a turbo/package cycle. The story's OWN bulk path (Task 4/AC6) already mandates the cycle-free realization — "map each from its assessment kind DETERMINISTICALLY … NO per-claim `evaluateConcealmentAt`/DB call in a loop." Both `assessClaimConcealment` and `assessClaimConcealmentBulk` therefore apply the SAME deterministic mapping (`linked→flagged`, `not_linked→not_flagged`, `unable/absent/clause-unprovisioned→not_evaluated`), resolving the R14 `clause_version_id` provenance via the domain-internal `resolveConcealmentClause` (`medical/concealment.ts`). This preserves the exact R14 semantics (the single-clause `flag_if_true` family raises the flag IFF the human-supplied fact `claim.concealed_ima_condition_linked === true`, which IS `kind === 'linked'`) with D10 fail-soft, and never derives the fact. Documented at the top of `concealment-review.ts`.
- The single-claim producer signature is `assessClaimConcealment(db, { pariwarId, claimCaseId, at? })` and the bulk is `assessClaimConcealmentBulk(db, pariwarId, items)` (the story's `at` param dropped from bulk — unused, and the shared clause resolver is current-version only; historical-`at` replay is deferred with no consumer). v1 surfaces the CURRENT R14 basis.
- `ConcealmentSignal` gained an OPTIONAL nullable `clauseVersionId`, populated only for a `full`-visibility caller AND only on `flagged`/`not_flagged` (D-C — `full` adds ONLY the clause-version metadata, never medical evidence). `VERIFIER_CONSOLE_MAX_READS` bumped 9→10 (the one bounded producer read; doc-comment arithmetic + live read-count assertion updated).
- Trustee snapshot (AC3): `voteOnFrozenClaim` resolves `niy.concealment.r14` server-side INSIDE the decision tx for `concealment_upheld`/`concealment_override`, persists `concealment_clause_version_id` on the decision row, surfaces it on the result (route adds it to the non-PII audit line), and ABORTS with `ConcealmentClauseUnresolvedError` on a null clause resolution (the 3.5 precedent — never a null snapshot on a concealment-coded row). The contract superRefine makes a rationale MANDATORY on a `concealment_override` approve.
- The `claim.concealment_assessed` identity event is the 30th claim event (registered in `events.ts`, the events-package registry, and the reducer's identity case); the 5 pinned `CLAIM_EVENT_TYPES` length assertions were bumped 29→30.
- Coverage: contract lockstep + override superRefine; domain live-DB integration (write path / supersession / partial-unique / producer matrix / bulk / trustee snapshot — 11 tests); API E2E (route + console flagging + full/indicator by effective authorization + never-auto-denied + human-actor gate — 5 tests); admin component tests (banner above sections / control / clause-version — 26 tests); the D10 structural invariant rewrite; the human-actor CI gate extension.

### File List

**New (domain):**
- `packages/domain/src/claim/concealment-assessment.ts` — the tri-state `claim_concealment_assessment_kind` enum + tuple.
- `packages/domain/src/schema/claim_concealment_assessments.ts` — the assessment table (RLS/FK/partial-unique).
- `packages/domain/src/policies/claim-concealment-assessments-rls.ts` — symmetric tenant-isolation policies.
- `packages/domain/src/claim/concealment-assessment-persist.ts` — the write path (`recordConcealmentAssessment`) + live/bulk/history read accessors + typed guards.
- `packages/domain/src/claim/concealment-review.ts` — the tri-state producer (`assessClaimConcealment` / `assessClaimConcealmentBulk`).
- `packages/domain/migrations/0068_concealment-assessments-and-trustee-r14-snapshot.sql`, `packages/domain/migrations/0069_trustee-concealment-override-reason-code.sql`.

**Modified (domain):**
- `packages/domain/src/ids/index.ts` (+`ConcealmentAssessmentId`), `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts`, `packages/domain/src/claim/index.ts` (barrel exports).
- `packages/domain/src/schema/claim_state_trustee_decisions.ts` (+`concealment_clause_version_id`).
- `packages/domain/src/claim/events.ts` (30th event + schema map), `packages/domain/src/claim/state.ts` (identity reducer case), `packages/domain/migrations/meta/_journal.json`.
- `packages/domain/src/claim/state-trustee-decision.ts` (+`concealment_override` code + compat), `packages/domain/src/claim/state-trustee-decision-persist.ts` (snapshot resolution + `ConcealmentClauseUnresolvedError`).
- `packages/domain/src/claim/cycle-freeze-read.ts` (queue `concealmentFlags` from the bulk producer).

**Modified (events/contracts):**
- `packages/events/src/registry.ts` (the `claim.concealment_assessed` registry entry).
- `packages/contracts/src/claims/concealment-assessment.ts` (NEW — request/response DTOs), `packages/contracts/src/claims/index.ts`.
- `packages/contracts/src/claims/cycle-freeze.ts` (`concealment_override` + mandatory-rationale rule), `packages/contracts/src/claims/verifier-console.ts` (nullable `clauseVersionId`).

**Modified/New (apps/api):**
- `apps/api/src/modules/claims/claims.concealment-assessment.routes.ts`, `apps/api/src/modules/claims/claims.concealment-assessment.handlers.ts`, `apps/api/src/modules/claims/concealment-assessment-crypto.ts` (NEW).
- `apps/api/src/modules/claims/index.ts`, `apps/api/src/context.ts` (field-class), `apps/api/src/audit/audit-sink.ts` (audit event types).
- `apps/api/src/modules/claims/claims.verifier-console.handlers.ts` (producer wiring + `full`-visibility + read-count bump).
- `apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts` (snapshot on the audit line).
- `scripts/claim-adjudication-human-actor-invariant/check.ts` (route coverage-set entry).

**Modified/New (apps/admin):**
- `apps/admin/src/modules/claim-verification/ConcealmentAssessmentControl.tsx` (NEW), `SignalsPanel.tsx` (banner + control mount + clause-version), `i18n-en.ts`, `index.ts`.
- `apps/admin/src/api/client.ts`, `apps/admin/src/api/hooks.ts`, `apps/admin/src/routes/VerifierConsoleRoute.tsx` (mutation wiring).

**Tests:**
- `packages/domain/tests/integration/claim/concealment.spec.ts` (NEW), `apps/api/tests/integration/claims/concealment-assessment.spec.ts` (NEW), `packages/contracts/tests/claims-concealment-assessment.test.ts` (NEW).
- `apps/api/tests/unit/verifier-console-concealment-invariant.test.ts` (D10 rewrite), `apps/admin/tests/verifier-console.test.tsx`, `packages/contracts/tests/claims-cycle-freeze.test.ts`, and the 5 `CLAIM_EVENT_TYPES` length assertions (29→30) in `packages/domain/tests/claim/*-events.test.ts`.

### Change Log

| Date | Change |
| --- | --- |
| 2026-07-15 | Story 6.15 implemented: verifier concealment-linkage assessment (the human-supplied `claim.concealed_ima_condition_linked` fact) → tri-state producer → 6.10 console flagging + 6.13 queue `concealment_flags` + trustee `concealment_override` approve with a server-resolved R14 clause-version snapshot. Flag-surface-only, never auto-denied (the State Trustee is the sole concealment-decision authority). All gates green; the lone `ci:local` `integration-tests` failure is the known cross-spec count-contamination flake (innocent in isolation). |

### Review Findings

Code review (2026-07-15) — three parallel layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor vs. this spec) against the uncommitted diff on `main` (`HEAD` = `7d1677f`).

- [x] [Review][Patch] Concealment reason-code requires an actual `flagged` live signal (D1 ratified BigDev 2026-07-15) — FIXED: `resolveConcealmentSnapshot` now derives the snapshot from `assessClaimConcealment`'s own signal (no redundant clause re-resolution); a non-`flagged` signal throws the new `ConcealmentNotFlaggedError` (409) before any write. Tests added (not-flagged / not-evaluated / formerly-flagged-then-revised / unprovisioned-clause, + the escalation-path equivalents). [packages/domain/src/claim/state-trustee-decision-persist.ts]
- [x] [Review][Patch] Add a domain lifecycle guard to concealment-assessment recording/revision (D2 ratified BigDev 2026-07-15) — FIXED: `CONCEALMENT_ASSESSMENT_BLOCKED_STATES` + `assertConcealmentAssessableState`, re-checked against the LOCKED current state before any write; `ConcealmentAssessmentBlockedStateError` (409). Tests added (blocked pre-review/terminal states, a mid-flight state change, the permitted window). [packages/domain/src/claim/concealment-assessment-persist.ts]
- [x] [Review][Defer] `decryptConcealmentNote` / `getConcealmentAssessmentHistory` retained as documented canonical groundwork for a future authorized evidence/history consumer (D3 ratified BigDev 2026-07-15) — no read endpoint added in Story 6.15; the absence of a current consumer is now documented in-code on both exports; re-triggered by an evidence timeline, appeal transcript, or trustee detail surface. [apps/api/src/modules/claims/concealment-assessment-crypto.ts:46, packages/domain/src/claim/concealment-assessment-persist.ts:158]
- [x] [Review][Patch] Escalation-resolution can persist a concealment decision with a NULL R14 snapshot — FIXED: `resolveEscalation` now calls `resolveConcealmentSnapshot` (mirroring `voteOnFrozenClaim`) before its writes; the same D1 gate applies. Test added (escalation-path snapshot persistence + the never-flagged rejection). [packages/domain/src/claim/state-trustee-decision-persist.ts:522-611]
- [x] [Review][Patch] `ConcealmentClauseUnresolvedError` is unmapped in the cycle-freeze route's error translator, falls through to an unhandled 500 — FIXED via consolidation: the D1 fix folds the "clause unresolvable" outcome into the SAME `ConcealmentNotFlaggedError` path (a `flagged` signal now always carries a non-null `clauseVersionId` by construction, making the old error's trigger condition unreachable) — `ConcealmentNotFlaggedError` IS mapped to a 409 in `translateCycleFreezeError`. [apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts]
- [x] [Review][Patch] `getLiveConcealmentAssessmentsBulk`'s clamp is a self-referential no-op (`cap: ids.length`) — FIXED: a real fixed `CONCEALMENT_ASSESSMENT_BULK_CAP = 2000` ceiling, independent of the caller-supplied id-set size. [packages/domain/src/claim/concealment-assessment-persist.ts]
- [x] [Review][Patch] AC6/Task 9-10 — trustee-queue `concealment_flags` wiring has zero test coverage and the contract doc-comment still describes the pre-6.15 placeholder semantics — FIXED: integration test added asserting the real bulk-producer wiring; the `CycleFreezePendingItem` doc-comment rewritten. [packages/domain/tests/integration/claim/state-trustee-cycle-freeze.spec.ts, packages/contracts/src/claims/cycle-freeze.ts]
- [x] [Review][Patch] D-E's mandated forced-rollback ("no orphan row/event") test is missing — FIXED: added to a new own-committing concurrency spec (mirrors the 6.14 `forceQueryFailure` precedent). [packages/domain/tests/integration/claim/concealment-concurrency.spec.ts]
- [x] [Review][Patch] Task 10's "concurrent-revise → 409" is only proven at the SQL-constraint level, not through the real conflict-error translation under a race — FIXED: a genuine two-connection race (a competing raw supersede lands inside `recordConcealmentAssessment`'s own read/conditional-UPDATE window) now proves the APPLICATION code throws `ConcealmentAssessmentRevisionConflictError`, not just that the DB constraint exists. [packages/domain/tests/integration/claim/concealment-concurrency.spec.ts]
- [x] [Review][Patch] Clause-resolution failure is over-broadly fail-soft — a transient DB error reads the same as "registry unprovisioned" — FIXED: removed the blanket `try/catch` in `resolveR14ClauseVersionId` (`resolveConcealmentClause` already returns `null` for both legitimate "unprovisioned" outcomes; an unexpected error now propagates). Test added (a forced transient failure propagates rather than collapsing to `not_evaluated`). [packages/domain/src/claim/concealment-review.ts]
- [x] [Review][Patch] `<ConcealmentAssessmentControl>` doesn't reset form state after a successful submit, risking a duplicate double-click re-record — FIXED: resets `kind`/`note` on a successful submit. [apps/admin/src/modules/claim-verification/ConcealmentAssessmentControl.tsx]
- [x] [Review][Patch] Structural guard-test regex is fragile to future refactors (lazy match terminated at the first `});`) — FIXED: the terminator now requires the closing `}` at the SAME indentation as the `const` declaration, not just the first `};` anywhere in the lazy expansion. [apps/api/tests/unit/verifier-console-concealment-invariant.test.ts]
- [x] [Review][Patch] Test name overstates its own assertion coverage ("no banner" claimed but not asserted) — FIXED: renamed to describe only what the test actually asserts. [apps/api/tests/integration/claims/concealment-assessment.spec.ts]
- [x] [Review][Patch] `ConcealmentAssessmentRequest.note` has no contract-layer whitespace-only rejection (only filtered defensively in the route's crypto helper) — FIXED: `.trim().min(1)` at the contract boundary (the nominee-bank `correctionReason` precedent). [packages/contracts/src/claims/concealment-assessment.ts]
- [x] [Review][Patch] Read-count bookkeeping under-counts the concealment section's real query cost (one bump for up to two DB round trips) — FIXED: bumped twice (the worst-case query cost); `VERIFIER_CONSOLE_MAX_READS` ceiling 10→11 with the doc-comment arithmetic updated. [apps/api/src/modules/claims/claims.verifier-console.handlers.ts]
- [x] [Review][Patch] Migration integrity — `claim_concealment_assessments`' RLS/FK/partial-unique claims (the migration 0068 comment says "Full RLS... mirrors claims-rls") were asserted only by the schema-diff/domain-invariants gates (schema-vs-migration consistency), never independently proven at the DB layer — no RLS policy-regression test existed for this table, unlike every sibling table this epic added (6.11/6.12/6.13/6.14 each got one). FIXED: added a dedicated policy-regression spec mirroring the 6.12 shepherd-assignments precedent (positive/negative cross-tenant SELECT, mismatched-pariwar INSERT → 42501, connection-level fail-closed, FORCE RLS catalog check, both FKs → 23503, the one-live-per-claim partial-unique → 23505, and the tenant-scoped indexes) — all 10 assertions pass live. [packages/domain/tests/integration/rls/claim-concealment-assessments-policy-regression.spec.ts]
- [x] [Review][Patch] Assessment authority — the concealment-assessment route's `claim.verify` + server-derived-district gate had only a baseline 401/403 test (no claim.verify at all); it had never been adversarially exercised the way sibling routes (verifier-decision's district-mismatch/super_admin authz matrix) have. FIXED: added a district-mismatch-denied/super_admin-allowed matrix test AND a cross-Pariwar isolation test — which surfaced (not a bug, a genuine finding worth recording) that this route's `resolveAssessmentDistrict` preHandler fails closed to **403**, not 404, for a cross-tenant claim id (a B-only claim resolves to a `null` district under A's RLS scope, hitting the SAME "no district → 403" path as a genuinely-missing district) — DIFFERENT from the r9-voting/cycle-freeze family's direct-existence 404, because it's a different permission model (district-derived vs. direct claim lookup), not an inconsistency. Documented in the route file's own comment already; now proven live. [apps/api/tests/integration/claims/concealment-assessment.spec.ts]
- [x] [Review][Defer] AC4 — the tri-state mapping hardcodes R14's condition instead of calling the Story 4.4 engine [packages/domain/src/claim/concealment-review.ts] — deferred, pre-existing (package-dependency cycle: `@twt/niyamavali-engine` depends on `@twt/domain`, disclosed and justified in the Dev Agent Record)
- [x] [Review][Defer] Five scattered hardcoded `CLAIM_EVENT_TYPES` length(30) assertions [packages/domain/tests/claim/dpdpa-consent-events.test.ts, ground-inspection-events.test.ts, nominee-bank-events.test.ts, r9-outcome-events.test.ts, shepherd-events.test.ts] — deferred, pre-existing pattern this diff perpetuates (29→30) but did not introduce
