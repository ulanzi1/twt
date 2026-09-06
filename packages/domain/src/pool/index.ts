// Barrel for the pool-lifecycle module — Story 7.1.
// Re-exported from @twt/domain as the `pool` namespace (see ../index.ts) so consumers
// call `pool.projectPoolState(...)` / `pool.replayPoolState(...)` /
// `pool.POOL_EVENT_PAYLOAD_SCHEMAS`. Mirrors the `claim/` + `member/` module shape.
// The THIRD event-derived-state primitive.

export * from './state.js';
export * from './events.js';
export * from './project.js';
export * from './errors.js';
// Story 7.1 (Task 6) — the versioned canonical snapshot serializer + integrity hash
// (the DOMAIN half of the snapshot storage abstraction). The migration adapter lives in
// ../snapshot-adapters/ (exposed via the @twt/domain `snapshotAdapters` namespace).
export * from './snapshot.js';
// Story 7.2 — the pool naming service: the canonical `P-YYYY-MM-###` allocator (pure
// formatter + transactional range allocator), the bijective base-26 member-facing letter
// code, and the dual-representation resolver (canonical for audit/system/regulator,
// shortform for member surfaces).
export * from './naming.js';
// Story 7.2 (Task 5) — the per-Pariwar curated-name registry CAPABILITY: the
// deterministic ordering/reservation service over `pool_names`. TWT-Bihar's registry is
// empty at launch, so its pools display letter codes (the tested launch invariant).
export * from './names.js';
// Story 7.3 (Task 2) — the cycle-level event vocabulary (cycle.frozen, cycle.spawn.aborted)
// the spawn saga emits on the CYCLE stream (stream_id = cycle_id). Homed here (under pool/)
// so the pool-engine CI gates' recursive scan keeps them covered.
export * from './cycle-events.js';
// Story 7.3 (Tasks 1/3/4) — the pool spawn saga: deterministic pool_id derivation, the
// spawn-idempotency-conflict detector, the parent planner + child spawner + the
// last-child cycle-freeze finalizer (the atomic cycle-freeze invariant).
export * from './spawn.js';
// Story 7.4 (Tasks 1/2/3) — the deterministic member-to-pool assignment algorithm: the
// version-pinned SHA-256 base hash + the balanced (≤1) redistribution pass + the roster
// fingerprint + the real PoolAssignmentSeam factory (fills Story 7.3's emptyAssignmentSeam).
export * from './assign.js';
// Story 7.5 (Task 2) — the effective-dated fixed-amount schedule: the change_type-blind window
// resolver (getEffectiveFixedAmount — the spawn saga's amount source, retiring the env constant) +
// the standard (90-day-notice) + emergency-override write paths + the immutable Emergency
// Adjustment Record + the genesis seed. The typed errors ride pool/errors.ts (already exported).
export * from './fixed-amount.js';
// Story 10.13 (Tasks 4/5) — the emergency attesting panel's ELIGIBILITY predicate
// (assertFixedAmountPanelAuthorized, the AC3 teeth) + the eligible-attestor DIRECTORY read the
// picker consumes. Decision `2026-08-16-123` clauses 2-3. The typed error rides pool/errors.ts.
export * from './fixed-amount-panel.js';
// Story 11b.13 (Task 2/3) — the per-Pariwar DRIVE TARGET: the pure bounds + the `member ≥ public`
// predicate (`drive-target.ts`) and the two governed write paths + resolvers
// (`drive-target-policy.ts`).
// ⚠⛔ IT SITS BESIDE `fixed-amount.ts` BECAUSE IT MIRRORS ITS SHAPE — ⛔ NOT because the two
// interact. `pools.fixed_amount` is what a member OWES; the target is a **presentation
// denominator** for Story 11b.14's meter. ⛔ Nothing reads the target when computing what a member
// owes, is assigned, or has paid (AI-10-1, Story 11b.13 AC7).
export * from './drive-target.js';
export * from './drive-target-policy.js';
// Story 7.6 (Tasks 1/2) — pool-bound payment enforcement: the member-cycle → assigned-pool +
// collection-binding resolver (read from the PERSISTED snapshot, never a recompute — D1), the pure
// wrong-pool classifier + its verdict/reason-code tuples (the contracts .strict() union is lockstep-
// pinned to these), and the binding-uniqueness / member-assignment-integrity guards (typed errors on
// pool/errors.ts). Transport-free + decryption-free — Epic 8 builds the pa= VPA, Epic 9 records the verdict.
export * from './contribution-binding.js';
// Story 7.7 (Task 1) — the idempotent contribution payment-reference (`tr=`) derivation: a pure,
// bounded, VERSION-PINNED SHA-256-truncated reference deterministic in (member_id, alert_id), stable
// across repeats (idempotency by construction). No live call site — Epic 8's <UPIIntentButton> produces
// it, Epic 9's reconciler dedupes on it. Kept support-category-token-free for the recursive pool/ gate walk.
export * from './contribution-reference.js';
// Story 11b.1 (Task 1) — the PUBLIC Sahyog Drive pool index read + its matching count: one bounded,
// filterable page of pools at `closed` (Active) or `settled` (Archive), resolved in ONE set-based
// query with lateral aggregates for the reversal-compensated confirmed-contribution count and the
// per-subject name-consent verdict. Transport-free, audit-free and DECRYPT-FREE by rule — it returns
// `name_ciphertext` as stored and the boundary at apps/api/src/modules/public-pages/ decrypts, which
// is the only place in the repo that can. ⛔ It decides a RENDER, never a BENEFIT.
export * from './public-read.js';
// Story 11b.3 (Task 2 + Task 5) — the PER-CLAIM Sahyog Vivran read: ONE drive resolved as of ONE
// instant, on a WIDER visible-drive predicate than the index's (`live` + `closed` + `settled`,
// D4(b)), plus the RENDER-TIME derivation of the `claim.reversed` appeal lineage (D12(a) — ⛔ no
// queue, ⛔ no consumer, ⛔ no publication record). Transport-free, audit-free and — unlike the
// index — with ⛔ NOTHING to decrypt: it returns ⛔ no name, ⛔ no ciphertext and ⛔ no member,
// claim or pool identifier. ⛔ It decides a RENDER, never a BENEFIT.
export * from './sahyog-vivran-read.js';
// Story 11b.10 (Task 1 + Task 2) — the pool's PUBLIC ADDRESS TOKEN: minted at spawn (128 bits of
// CSPRNG entropy, base64url), ROTATABLE per drive, and READ server-side for the member app. It
// bounds DISCOVERY, ⛔ not AUTHORISATION (D1) — the page it addresses answers 200 to anyone holding
// a valid address, with ⛔ no session and ⛔ no branch on the reader's membership standing. The
// canonical `P-YYYY-MM-###` is RETAINED as the operational/audit key and is ⛔ not replaced.
export * from './public-token.js';
