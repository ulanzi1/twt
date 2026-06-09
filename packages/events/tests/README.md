# @twt/events tests

Mix of pure unit tests and live-DB integration tests.

## Unit tests (no DB)

- `smoke.test.ts` — Story 1.1 placeholder; asserts the workspace module loads.
- `state-machine.test.ts` — generic `StateMachine<S, E>` framework primitive.
- `canonical-json.test.ts` — RFC 8785 JCS subset key-order independence.

These always run as part of `pnpm --filter @twt/events test`.

## Integration tests (live local Docker Postgres 16)

- `append-event.test.ts` — happy path + sequential + optimistic-concurrency.
- `replay-state.test.ts` — deterministic replay + ordering + slicing.
- `append-only.test.ts` — trigger rejection of `UPDATE` / `DELETE` / `TRUNCATE`.

These tests SKIP via vitest's `describe.skipIf(!DATABASE_URL)` when `DATABASE_URL`
is unset (CI default at Story 1.3). They run locally against a Docker Postgres 16
container.

### Local run

```sh
docker run --rm -d -p 5433:5432 \
  -e POSTGRES_USER=twt_dev_app \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=twt_dev \
  --name twt-test-pg postgres:16-alpine

# Apply migrations 0000 + 0001 against the test container.
DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable \
  pnpm --filter @twt/domain db:migrate

DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable \
  pnpm --filter @twt/events test

docker stop twt-test-pg
```

### Isolation strategy

Per-test transaction-rollback (Story 1.3 Task 5.6 choice (a)):
each test acquires its own `pg` client from a shared pool, opens a `BEGIN`,
runs against a drizzle handle bound to that transaction, and `ROLLBACK`s in
`afterEach`. The triggers installed by migration 0001 deliberately block
`DELETE` / `TRUNCATE` so test cleanup MUST go through rollback; that is the
point of the substrate.

See `integration-setup.ts`.

### CI substrate

Live-DB CI is **Story 1.6** territory (deferred-work D2-1.3 — the same
service-container Postgres substrate also gates the cross-Pariwar RLS
adversarial test, so it lands once and serves both Stories). Story 1.3 ships
the local-only invocation; CI runs the unit tests only and the integration
tests SKIP cleanly when `DATABASE_URL` is unset.
