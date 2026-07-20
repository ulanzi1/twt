# `scripts/alert-state-invariant/` — the alert-state PR CI gate (Story 8.1 AC5)

The static authoring-time CI gate for **Story 8.1 AC5**: `alerts.current_state` is a
**replay-derived cache** that may be written ONLY by the event-replay projector
(`packages/domain/src/alert/project.ts`). Any other code path that writes the
`current_state` column of the `alerts` table lets the cache diverge from the
event-sourced source of truth — the ₹50L/decision flow. Twin of
`scripts/pool-state-invariant/` + `scripts/claim-state-invariant/` +
`scripts/member-state-invariant/` (the FOURTH state-mutation gate).

Authority: Story 8.1 AC5 · architecture §1.14 (persisted state is a projection). The
independent RUNTIME guard is the `alerts_state_write_guard` BEFORE INSERT OR UPDATE
trigger (migration `0078_alerts-lifecycle.sql`) — it also catches raw SQL. Both guards
are required; they are different layers.

D7 note: the alert lifecycle gets its OWN state-mutation gate, NOT a bolt-on to the pool
support-category gate — the alert module is not a pool support-category surface, so a
green scan over it there would be vacuous (`[[feedback_gate_scope_semantic_coverage]]`).
The meaningful invariant for the alert surface is exactly this one: projector-only state.

## Files

- `check.ts` — entrypoint (impure: recursive `packages/domain/src` walk + `process.exit`). Run via `pnpm alert-state:check`.
- `lib.ts` — pure, importable AST scanner (`scanAlertStateWrites`). Unit-tested.
- `lib.test.ts` — fixture-driven unit tests, incl. the KNOWN-BAD fixtures that turn the scanner RED (its teeth) + the PASSES negatives (no false positives on the sibling `pools` table). Run via `pnpm alert-state:test`.

## What it flags (AST-detected, never a substring)

| Write form                                                          | Meaning                          |
| ------------------------------------------------------------------- | -------------------------------- |
| `db.update(alerts).set({ currentState })`                           | canonical UPDATE                 |
| `db.insert(alerts).values({ currentState })`                        | bare INSERT (create-time)        |
| `db.insert(alerts)…onConflictDoUpdate({ set: { currentState } })`   | upsert UPDATE (the projector)    |
| `alerts.currentState = …`                                           | direct assignment                |

The table (`alerts`) is matched as a bare identifier AND as a namespaced access
(`schema.alerts`); the state key is matched as a plain/shorthand/computed
(`['currentState']`) property, and identically for the `stateEventVersion` pair. A
`.set({ currentState })` inside a comment or string literal never matches (AST, not substring).

## Mechanism — invariant scan, NOT a git-diff

An invariant scan of the current `packages/domain/src` state (mirror
pool/claim/member-state-invariant): the ONLY allowlisted writer is
`packages/domain/src/alert/project.ts` (`projectAlertState`), so the gate is self-green by
construction. `mintAndOpenAlert` is NOT allowlisted — it delegates to `projectAlertState`
and never writes the cache directly. The gate's TEETH are proven by `lib.test.ts`'s
known-bad fixtures (a write outside the allowlist → a finding); a revert-sanity is that
removing the offending write returns the scanner to zero findings. A green scan over new
files alone proves nothing (`[[feedback_gate_scope_semantic_coverage]]`) — the known-bad
fixture is the teeth.
