# `field-worker-ending-appeal-invariant` gate (Story 13.1f AD7; the 13.1d AD2 model)

`field_worker_ending_appeals` is the projection of each ending appeal's own `events_log` stream. It is written ONLY by
`packages/domain/src/field-worker/ending-appeal-project.ts` (`projectEndingAppealLodged`, `projectEndingAppealTransition`), which set
`app.field_worker_ending_appeal_writer` for migration 0207's guard trigger.

The projector writes in RAW SQL, so this scan — unlike the drizzle-only `*-state-invariant` gates — flags string and template literals
that write the table (`INSERT INTO`, `UPDATE [ONLY]`, `MERGE INTO`, `COPY`; quoted, qualified by any schema - one put in by a
substitution too - or behind a block or a `--` comment), literals naming the writer setting (any case, each part quoted or not, a space
or a comment around its dot - review R3-25), and drizzle `.insert` / `.update` on
`fieldWorkerEndingAppeals` — bare, namespaced, read by `schema['…']`, bound to a name (`const t = …`, an import alias, a destructured one,
an element of `const [t] = [...]`, a class field - private (`#t`) too - a parameter default, a parameter property, a destructured default,
a `??=` / `||=` / `&&=`, a computed string key, either arm of a conditional or either operand of `??` / `||` / `&&`, the right of a comma
or an inline assignment - review R3-26), or a second `pgTable('field_worker_ending_appeals', …)`. A template whose substitution IS the table, or a
constant holding its SQL name (`const T = 'field_worker_ending_appeals'`), reads as the table; a `+` chain of literals is read joined.

**Scanned:** the `src`, `scripts` and `seed` of every app and package, plus the root `scripts/` (not this folder); `.ts`, `.tsx`, `.js`,
`.mjs`, `.cjs`, `.jsx`; every dot-directory except `.git`, `.turbo`, `.next`, `.cache`. Test folders are not scanned — they write raw under
`session_replication_role` on purpose. It fails if it does not SEE both allowlisted functions write (`unseenAllowlistedWriters`).

**Why those roots** (code review round 2, R2B-6): they are where this repository keeps code that can open a database connection - the
domain, the API, the jobs and every script. `apps/mobile` is Metro-bundled and holds no `pg`; the root `tests/` and `infra/` hold no
application code. A package that grows a new source directory (a `bin/`, a `lib/`) is NOT scanned until `check.ts`'s `scanRoots` names it.
⚠ The 0207 trigger refuses such a write only if that file does NOT set the writer setting: one that sets it passes both guards (review R3-28
corrected "refuses the write regardless"). The scan wiring itself (`scanRoots`, `collect`) has no unit test - `check.ts` reads the real
tree - so the floor above (both allowlisted functions seen writing) and the required-roots check are what prove it is not blind.

**Not seen:** SQL assembled from fragments across variables (a `let` built up, a helper returning a fragment), a table name computed at run
time (`sql.raw` / `sql.identifier` given one), the writer setting's NAME assembled in SQL (`set_config('app.' || 'field_worker_ending_appeal_writer', …)`)
or by a substitution inside it (`` `app.field_worker_ending_${x}_writer` ``) (review R3-25), a computed key that is not a string literal, a write method reached by `.call` / `.apply` / `.bind`, a table passed through a parameter,
symlinked directories, `.sql` files. **Nothing that crosses a file** (the scan is per file): a `export const t = fieldWorkerEndingAppeals`
imported elsewhere, the table re-exported under a new name (`export { fieldWorkerEndingAppeals as appeals }`, then `db.update(appeals)` in
another file), a SQL-name constant imported from another module, and a function that returns the table (`const tbl = () => …`). A `COPY … TO` (a read) is flagged — fail closed. DELETE and TRUNCATE
are not flagged on purpose: 0207's triggers refuse both for every role. The allow-list matches the innermost NAMED function — a write
moved into a callback reads `<anonymous>` and fails.

```
pnpm field-worker-ending-appeal:test    # the scanner's teeth (lib.test.ts)
pnpm field-worker-ending-appeal:check   # the gate
```

The DB trigger is the independent runtime guard; this is the authoring-time one.
