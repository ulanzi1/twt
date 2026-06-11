# src/cross-tenant/

**Active at Story 1.6** — Named cross-tenant operations helper per architecture
§1.2 line 736-740 + line 764-770.

The few legitimate cross-Pariwar operations (super-admin audit dashboards,
matcher cron batches, helpline triage routing) go through a single named helper
that explicitly opts out of RLS via `SET LOCAL row_security = off` — everywhere
else RLS is in force. Story 1.6 authored the substantive helper + its single
call-site discipline.

## API

```ts
import { crossTenant } from '@twt/domain';

const rows = await crossTenant.runAsCrossTenant(
  pool,
  { reason: 'super-admin audit dashboard query', actorId, pariwarIds: ['…'] },
  (db, client) => db.select().from(schema.eventsLog), // RLS bypassed for this tx
);
```

`runAsCrossTenant(pool, ctx, fn)` opens a transaction, sets
`row_security = off` for its lifetime, runs `fn` against an RLS-bypassed Drizzle
handle, **emits an audit event**, then commits. `CrossTenantContext` carries
`reason` (free-form, the audit-trail surface), `actorId` (NULL = system/SIE per
architecture §1.14), and optional `pariwarIds` (the explicit tenant set).

The module's exports are limited to the helper + the `CROSS_TENANT_SENTINEL_UUID`
constant (architecture §1.2 line 767) — raw `pg.Pool` construction primitives
are intentionally NOT re-exported.

## Audit-emission contract (Story 1.6 placeholder)

Every invocation writes one `audit.cross_tenant_access` event into `events_log`
(reason + tenant set + emitter + timestamp in the payload), at the well-known
sentinel stream/tenant UUID `00000000-0000-0000-0000-000000000000`. The version
is computed from `MAX(event_version)` first so repeated calls don't collide on
the `(stream_id, event_version)` unique index.

This is a **substrate placeholder**: Story 1.10 substantively re-wires the
emission to the dedicated `audit_log_entries` table (hash-chain + 6h off-site
mirror) and may re-key the sentinel to a real audit-stream UUID (deferred
D2-1.6 + D5-1.6).

> ⚠ **Layering note**: the audit event is written via a direct drizzle INSERT
> into `events_log` (which `@twt/domain` owns), **not** via
> `@twt/events.appendEvent`. `@twt/events` already depends on `@twt/domain`, so
> calling up into it would be both a layering inversion and a turbo task-graph
> cycle. The row shape is identical to what `appendEvent` would write.

## Privilege requirement — CI/local vs Cloud SQL production

`SET LOCAL row_security = off` requires superuser or `BYPASSRLS`. In local
Docker + CI, `twt_dev_app = POSTGRES_USER = implicit superuser`, so it works.
Against Cloud SQL production, a separate service-pool with `BYPASSRLS`
credentials (a `twt_service`-login role distinct from the application pool) is
required — deferred **D9-1.6 / Story 1.10**. Do NOT invoke `runAsCrossTenant`
against a real Cloud SQL instance until that service-pool separation lands.

## Forward pointers

- **Story 1.16a** wires the CI import-rule lint that forbids constructing
  `pg.Pool.connect()` service-role connections outside this module (deferred
  D1-1.6); the single-call-site structure here makes that lint trivial.
- **Expected downstream callers**: Story 1.10 audit-integrity job, Story 1.11a
  integrity-verification primitive, Story 7.x Pool Engine snapshot writer,
  Story 9.x reconciliation matcher.
