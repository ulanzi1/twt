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

The table is matched bare (`fieldWorkers`), namespaced (`schema.fieldWorkers`), wrapped (`(fieldWorkers)`,
`fieldWorkers as any`, `fieldWorkers!`), under an import alias (`fieldWorkers as fw`) or a `const` alias, and through a
SPLIT chain (`const q = db.update(fieldWorkers); q.set(…)`), a REASSIGNED alias or chain (`q = db.update(fieldWorkers)`,
`t = fieldWorkers`), a destructured alias (`const { fieldWorkers: fw } = schema`) and a literal element access for the table or
the method (`schema['fieldWorkers']`, `db['update'](…)`, `…['set'](…)` — review R4-8); the column as a plain / shorthand / computed
(`['district']`) key, and an upsert's `set` keyed bare, as a string, or shorthand.

⭐ **An unreadable payload is a finding** (review R3-27): a `.set` / `.values` / upsert `set` on a `fieldWorkers` chain whose
payload is a variable, a call or a spread (`.set(patch)`, `.set({ ...patch })`, `.values(rows)`) — or an object holding a
NON-literal computed key, an accessor or a method (`{ [k]: v }`, `{ get district() {…} }` — review R4-7) — is flagged "unverifiable
shape": the gate cannot prove it leaves the eight columns alone, so it does not assume so. ⭐ That holds INSIDE the projector too
(review R4-9): an unverifiable write in an allow-listed function is REPORTED, not allow-listed, and does not count as "seen".

### What it still cannot see

- **Raw SQL** (`db.execute(sql\`UPDATE field_workers …\`)`) — the DB trigger (migration 0200) owns that.
- **A dynamic table or method key** (`schema[name]`, `db[method](…)`).
- **A chain built or returned by a HELPER** (`withWhere(db.update(fieldWorkers)).set(…)`, `const upd = () => db.update(fieldWorkers); upd().set(…)`).
- **Scope**: aliases are tracked per FILE, not per scope — a shadowed name only over-approximates (a loud false positive, never a miss).
- **Roots outside `packages/domain/src`** — the house convention for every `*-state-invariant` gate (Story 13.1 round 1, X2);
  no `apps/` or `scripts/` file imports `fieldWorkers` at 2026-11-04, and the trigger refuses any such write at runtime.

## The allowlist is LEXICAL and function-scoped

A finding is dropped only when its INNERMOST enclosing function is `projectFieldWorkerGenesis` /
`projectFieldWorkerTransition` in `project.ts`. EVERY function-like node is a boundary (review R3-27): a helper, an inner
named arrow, an object-property arrow and an anonymous callback are each their own function (`<anonymous>` when unnamed), so
every guarded write must sit DIRECTLY in one of those two bodies — and the same function name in another file is flagged too.

**Non-vacuity** (review R3-27): `check.ts` FAILS unless the scan saw EACH allowlisted function write at least once — if the
projector's write moved where the scanner cannot see it, a clean scan would prove nothing. Scanned: `.ts`, `.mts`, `.cts`,
`.tsx` (⛔ `.d.*`).

## Mechanism — invariant scan, NOT a git-diff

An invariant scan of the current `packages/domain/src` state: self-green by construction once the
projector is the only writer. The gate's TEETH are `lib.test.ts`'s known-bad fixtures; a green scan
over new files alone proves nothing (`[[feedback_gate_scope_semantic_coverage]]`).

⚠ A NEW projected column (a sibling story's) joins `GUARDED_COLUMNS` here AND migration 0200's
trigger exclusion chain in the same change — otherwise the trigger refuses every guarded UPDATE of
it, or this gate stops watching it (Story 13.1 C8 (c)).
