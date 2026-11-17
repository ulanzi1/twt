# `field-worker-ending-appeal-invariant` gate (Story 13.1f AD7; the 13.1d AD2 model)

`field_worker_ending_appeals` is the projection of each ending appeal's own `events_log` stream. It is written ONLY by
`packages/domain/src/field-worker/ending-appeal-project.ts` (`projectEndingAppealLodged`, `projectEndingAppealTransition`), which set
`app.field_worker_ending_appeal_writer` for migration 0207's guard trigger.

The projector writes in RAW SQL, so this scan — unlike the drizzle-only `*-state-invariant` gates — flags string and template literals
that write the table (`INSERT INTO`, `UPDATE [ONLY]`, `MERGE INTO`, `COPY`; quoted, qualified by any schema - one put in by a
substitution too - or behind a block or a `--` comment), literals naming the writer setting, and drizzle `.insert` / `.update` on
`fieldWorkerEndingAppeals` — bare, namespaced, read by `schema['…']`, bound to a name (`const t = …`, an import alias, a destructured one,
an element of `const [t] = [...]`), or a second `pgTable('field_worker_ending_appeals', …)`. A template whose substitution IS the table, or a
constant holding its SQL name (`const T = 'field_worker_ending_appeals'`), reads as the table; a `+` chain of literals is read joined.

**Scanned:** the `src`, `scripts` and `seed` of every app and package, plus the root `scripts/` (not this folder); `.ts`, `.tsx`, `.js`,
`.mjs`, `.cjs`, `.jsx`; every dot-directory except `.git`, `.turbo`, `.next`, `.cache`. Test folders are not scanned — they write raw under
`session_replication_role` on purpose. It fails if it does not SEE both allowlisted functions write (`unseenAllowlistedWriters`).

**Not seen:** SQL assembled from fragments across variables (a `let` built up, a helper returning a fragment), a table name computed at run
time (`sql.raw` / `sql.identifier` given one), a write method reached by `.call` / `.apply` / `.bind`, a table passed through a parameter,
symlinked directories, `.sql` files. A `COPY … TO` (a read) is flagged — fail closed. DELETE and TRUNCATE
are not flagged on purpose: 0207's triggers refuse both for every role. The allow-list matches the innermost NAMED function — a write
moved into a callback reads `<anonymous>` and fails.

```
pnpm field-worker-ending-appeal:test    # the scanner's teeth (lib.test.ts)
pnpm field-worker-ending-appeal:check   # the gate
```

The DB trigger is the independent runtime guard; this is the authoring-time one.
