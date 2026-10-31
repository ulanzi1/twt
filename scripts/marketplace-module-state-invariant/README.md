# `scripts/marketplace-module-state-invariant/` — the module-state PR CI gate (Story 12.1 I1)

The static authoring-time CI gate for **Story 12.1 I1**: the six PROJECTED columns of
`marketplace_modules` — `current_state`, `state_event_version`, `slots_remaining`,
`archive_reason`, `audit_id`, `updated_at` — are a **replay-derived cache** that may be written
ONLY by the event-replay projector (`packages/domain/src/marketplace/project.ts`:
`projectModuleGenesis` / `projectModuleTransition`). Any other code path that writes one lets the
cache diverge from the module's `events_log` stream — the places a partner offer has left, its
state, and the audit line of its last transition. Twin of `scripts/helpdesk-state-invariant/`
(copied, renamed, and widened from the state pair to all six columns).

Authority: Story 12.1 I1 (and AC9). The independent RUNTIME guard is the
`marketplace_modules_state_write_guard` BEFORE INSERT OR UPDATE trigger (migration
`0193_marketplace-modules.sql`) — it also catches raw SQL, and it is the ONLY guard on the
immutable CONTENT columns (I2). Both guards are required; they are different layers.

## Files

- `check.ts` — entrypoint (impure: recursive `packages/domain/src` walk + `process.exit`). Run via `pnpm marketplace-module-state:check`.
- `lib.ts` — pure, importable AST scanner (`scanMarketplaceModuleStateWrites`) + the function-scoped `isAllowlistedWrite`. Unit-tested.
- `lib.test.ts` — fixture-driven unit tests, incl. the KNOWN-BAD fixtures that turn the scanner RED (its teeth), the PASSES negatives (a content column; another table; a read; a comment), and the allowlist legs. Run via `pnpm marketplace-module-state:test`.

## What it flags (AST-detected, never a substring)

| Write form                                                                  | Meaning                     |
| --------------------------------------------------------------------------- | --------------------------- |
| `db.update(marketplaceModules).set({ <projected column> })`                 | canonical UPDATE            |
| `db.insert(marketplaceModules).values({ <projected column> })` (or `[{…}]`) | INSERT (create-time)        |
| `db.insert(marketplaceModules)…onConflictDoUpdate({ set: { … } })`          | upsert UPDATE               |
| `marketplaceModules.<projected column> = …`                                 | direct assignment           |

The table is matched bare (`marketplaceModules`) and namespaced (`schema.marketplaceModules`); the
column as a plain / shorthand / computed (`['slotsRemaining']`) key.

## The allowlist is LEXICAL and function-scoped

A finding is dropped only when its INNERMOST enclosing named function (or const-arrow) is
`projectModuleGenesis` / `projectModuleTransition` in `project.ts`. So every guarded write must sit
directly in one of those two bodies — a helper or an inner named arrow is flagged, and so is the same
function name in another file.

## Mechanism — invariant scan, NOT a git-diff

An invariant scan of the current `packages/domain/src` state: self-green by construction once the
projector is the only writer. The gate's TEETH are `lib.test.ts`'s known-bad fixtures; a green scan
over new files alone proves nothing (`[[feedback_gate_scope_semantic_coverage]]`).

⚠ A NEW projected column (a sibling story's) joins `GUARDED_COLUMNS` here AND migration 0193's
trigger exclusion chain in the same change — otherwise the trigger refuses every guarded UPDATE of
it, or this gate stops watching it (Story 12.1 carried item C12).
