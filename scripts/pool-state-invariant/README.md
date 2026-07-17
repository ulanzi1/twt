# `scripts/pool-state-invariant/` — the pool-state PR CI gate (Story 7.1 AC5)

The static authoring-time CI gate for **Story 7.1 AC5**: `pools.current_state` is a
**replay-derived cache** that may be written ONLY by the event-replay projector
(`packages/domain/src/pool/project.ts`). Any other code path that writes the
`current_state` column of the `pools` table lets the cache diverge from the
event-sourced source of truth — the ₹50L/decision flow. Twin of
`scripts/claim-state-invariant/` + `scripts/member-state-invariant/`.

Authority: Story 7.1 AC5 · architecture §1.6 Pool Engine + §1.14 (persisted state is a
projection). The independent RUNTIME guard is the `pools_state_write_guard` BEFORE
INSERT OR UPDATE trigger (migration `0071_pools-lifecycle.sql`) — it also catches raw
SQL. Both guards are required; they are different layers.

## Files

- `check.ts` — entrypoint (impure: recursive `packages/domain/src` walk + `process.exit`). Run via `pnpm pool-state:check`.
- `lib.ts` — pure, importable AST scanner (`scanPoolStateWrites`). Unit-tested.
- `lib.test.ts` — fixture-driven unit tests, incl. the KNOWN-BAD fixtures that turn the scanner RED (its teeth) + the PASSES negatives (no false positives on the sibling `claims` table). Run via `pnpm pool-state:test`.

## What it flags (AST-detected, never a substring)

| Write form                                                          | Meaning                          |
| ------------------------------------------------------------------- | -------------------------------- |
| `db.update(pools).set({ currentState })`                            | canonical UPDATE                 |
| `db.insert(pools).values({ currentState })`                         | bare INSERT (create-time)        |
| `db.insert(pools)…onConflictDoUpdate({ set: { currentState } })`    | upsert UPDATE (the projector)    |
| `pools.currentState = …`                                            | direct assignment                |

The table (`pools`) is matched as a bare identifier AND as a namespaced access
(`schema.pools`); the state key is matched as a plain/shorthand/computed
(`['currentState']`) property. A `.set({ currentState })` inside a comment or string
literal never matches (AST, not substring).

## Mechanism — invariant scan, NOT a git-diff

An invariant scan of the current `packages/domain/src` state (mirror
claim/member-state-invariant): the ONLY allowlisted writer is
`packages/domain/src/pool/project.ts`, so the gate is self-green by construction. The
gate's TEETH are proven by `lib.test.ts`'s known-bad fixtures (a write outside the
allowlist → a finding); a revert-sanity is that removing the offending write returns the
scanner to zero findings. A green scan over new files alone proves nothing
(`[[feedback_gate_scope_semantic_coverage]]`) — the known-bad fixture is the teeth.
