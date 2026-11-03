# `scripts/field-worker-state-invariant/` — the field-worker-state PR CI gate (Story 13.1 I1)

The static authoring-time CI gate for **Story 13.1 I1**: the eight PROJECTED columns of
`field_workers` — `current_state`, `state_event_version`, `kyc_status`, `state_reason_code`, `district`, `ended_on`,
`audit_id`, `updated_at` — are a **replay-derived cache** that may be written
ONLY by the event-replay projector (`packages/domain/src/field-worker/project.ts`:
`projectFieldWorkerGenesis` / `projectFieldWorkerTransition`). Any other code path that writes one lets the
cache diverge from the worker's `events_log` stream — their state, KYC status, reason, REPORTING district, last day,
and the audit line of their last transition. Twin of `scripts/marketplace-module-state-invariant/` (copied, renamed, and
its column set replaced by the eight I1 columns).

Authority: Story 13.1 I1 (and AC9). The independent RUNTIME guard is the
`field_workers_state_write_guard` BEFORE INSERT OR UPDATE trigger (migration
`0200_field-workers.sql`) — it also catches raw SQL, and it is the ONLY guard on the
immutable IDENTITY columns (I2). Both guards are required; they are different layers.

## Files

- `check.ts` — entrypoint (impure: recursive `packages/domain/src` walk + `process.exit`). Run via `pnpm field-worker-state:check`.
- `lib.ts` — pure, importable AST scanner (`scanFieldWorkerStateWrites`) + the function-scoped `isAllowlistedWrite`. Unit-tested.
- `lib.test.ts` — fixture-driven unit tests, incl. the KNOWN-BAD fixtures that turn the scanner RED (its teeth), the PASSES negatives (an identity column; another table; a read; a comment), and the allowlist legs. Run via `pnpm field-worker-state:test`.

## What it flags (AST-detected, never a substring)

| Write form                                                                  | Meaning                     |
| --------------------------------------------------------------------------- | --------------------------- |
| `db.update(fieldWorkers).set({ <projected column> })`                 | canonical UPDATE            |
| `db.insert(fieldWorkers).values({ <projected column> })` (or `[{…}]`) | INSERT (create-time)        |
| `db.insert(fieldWorkers)…onConflictDoUpdate({ set: { … } })`          | upsert UPDATE               |
| `fieldWorkers.<projected column> = …`                                 | direct assignment           |

The table is matched bare (`fieldWorkers`) and namespaced (`schema.fieldWorkers`); the
column as a plain / shorthand / computed (`['district']`) key.

## The allowlist is LEXICAL and function-scoped

A finding is dropped only when its INNERMOST enclosing named function (or const-arrow) is
`projectFieldWorkerGenesis` / `projectFieldWorkerTransition` in `project.ts`. So every guarded write must sit
directly in one of those two bodies — a helper or an inner named arrow is flagged, and so is the same
function name in another file.

## Mechanism — invariant scan, NOT a git-diff

An invariant scan of the current `packages/domain/src` state: self-green by construction once the
projector is the only writer. The gate's TEETH are `lib.test.ts`'s known-bad fixtures; a green scan
over new files alone proves nothing (`[[feedback_gate_scope_semantic_coverage]]`).

⚠ A NEW projected column (a sibling story's) joins `GUARDED_COLUMNS` here AND migration 0200's
trigger exclusion chain in the same change — otherwise the trigger refuses every guarded UPDATE of
it, or this gate stops watching it (Story 13.1 C8 (c)).
