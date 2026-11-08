# `field-worker-move-request-invariant` gate (Story 13.1d AD2)

`field_worker_move_requests` is the projection of each move request's own `events_log` stream. It is written ONLY by
`packages/domain/src/field-worker/move-request-project.ts` (`projectMoveRequestOpened`, `projectMoveRequestTransition`), which set
`app.field_worker_move_request_writer` for migration 0205's guard trigger.

The projector writes in RAW SQL, so this scan — unlike the drizzle-only `*-state-invariant` gates — flags string and template literals
that INSERT into or UPDATE the table, literals naming the writer setting, and drizzle `.insert` / `.update` on `fieldWorkerMoveRequests`,
across `packages/domain/src`, `apps/api/src` and `apps/jobs/src`. It fails if it does not SEE both allowlisted functions write.

```
pnpm field-worker-move-request:test    # the scanner's teeth (lib.test.ts)
pnpm field-worker-move-request:check   # the gate
```

The DB trigger is the independent runtime guard; this is the authoring-time one.
