# @twt/domain

The architecture-canonical home for the system's identity:

- **Drizzle schema** — Postgres table + index + relation definitions.
- **RLS policies** — `pgPolicy` declarative row-level-security per Story 1.6.
- **Tenant rules** — `pariwar_id` first-class discipline per architecture §1.2.
- **Validators** — shared domain validators feeding into `packages/contracts/`.
- **Shared domain types** — branded IDs + value objects that cross workspace boundaries.

Per architecture §Workspace Layout line 421-423: "`packages/domain/` holds the
system's identity: Drizzle schema, RLS policies, tenant rules, validators,
shared domain types. The database is one expression of the domain, not the
system's identity."

Story 1.2 substrate populates the migration toolchain + the Drizzle client
factory + the placeholder sub-directories that downstream Stories build on.
Substantive table declarations land in those downstream Stories.

---

## 1. Layout

```
packages/domain/
├── drizzle.config.ts       drizzle-kit configuration (dialect/schema/out/migrations)
├── package.json            workspace + Drizzle deps + db:* scripts
├── README.md               you are here
├── .env.example            local-developer env-vars (gitignored when populated)
├── migrations/             drizzle-kit emit target (architecture §1.8 canonical)
│   ├── 0000_init-baseline.sql
│   └── meta/{_journal,0000_snapshot}.json
├── scripts/
│   └── migrate.ts          db:migrate wrapper (resolves Secret Manager → drizzle migrator)
├── seed/
│   ├── dev/                synthetic seed data (no PII per architecture §5.5)
│   └── staging/
├── src/
│   ├── index.ts            barrel: createDb + resolveConnectionString + schema + canonicalJsonStringify + audit
│   ├── db.ts               Drizzle factory bound to a node-postgres pool
│   ├── secrets.ts          Secret Manager fetch + DATABASE_URL fallback
│   ├── canonical-json.ts   [Story 1.10 — landed; moved from @twt/events per DD-1] the SINGLE RFC-8785 canonicalizer (events re-exports it)
│   ├── schema/
│   │   ├── index.ts        schema barrel
│   │   ├── audit_log_entries.ts [Story 1.10 — landed] tamper-evident audit log (seq IDENTITY + hash chain + append-only; SEPARATE from events_log)
│   │   ├── pariwar_passport.ts [Story 1.7 — landed] Pariwar-Passport table + BrandingBundle + locale enum (+ 1.9 created_by→users FK)
│   │   ├── role_grants.ts  [Story 1.8 — landed] role_grants table + scope_dimension enum (scoped; + 1.9 user_id→users FK)
│   │   ├── users.ts        [Story 1.9 — landed] GLOBAL identity table (identity_type enum, carve-out family)
│   │   ├── admin_credentials.ts / webauthn_credentials.ts / recovery_codes.ts / admin_sessions.ts / step_up_otps.ts [Story 1.9 — landed] admin-auth tables (global carve-out)
│   │   └── _baseline.ts    migration-zero marker (declares the `drizzle` metadata schema)
│   ├── policies/           [Story 1.6 — landed] RLS pgPolicy declarations + _roles (+ 1.7 carve-out, 1.8 role_grants scoped, 1.9 identity-auth-rls carve-out family)
│   ├── rbac/               [Story 1.8 — landed] permission catalog + scope model + 12 role bundles + fail-closed guard
│   ├── ids/                [Story 1.7 — landed] branded ID types + smart constructors
│   ├── pariwar-passport/   [Story 1.7 — landed] read accessor + write path + 60s freshness cache
│   ├── encryption/         [Story 1.5] envelope-encryption column transformers
│   ├── test-utils/         [Story 1.6 — landed] shared live-DB integration substrate
│   ├── snapshot-fixtures/  [Story 7.x] Pool Engine snapshot fixtures
│   ├── snapshot-adapters/  [Story 7.x] Pool Engine snapshot version adapters
│   ├── audit/              [Story 1.10 — landed] hash-chain primitives (computeAuditHash / verifyChainSegment) + writeAuditEntry advisory-lock writer
│   ├── cross-tenant/       [Story 1.6 — landed] named cross-tenant operations helper (1.10: re-keyed audit → audit_log_entries + servicePool)
│   ├── bank-statement/     [Story 9.2] normalized bank-statement row schema
│   └── per-pariwar/bihar/  [Story 1.7 deferred + 10.12] per-Pariwar JSON Schema fragments (custom fields NOT landed at 1.7)
└── tests/
    ├── smoke.test.ts       Story 1.1 placeholder (preserved)
    └── db.test.ts          createDb factory unit test (pool-config shape)
```

Each placeholder sub-directory carries its own `README.md` naming the landing
Story. Nothing under `src/` is loaded into the runtime client until a downstream
Story populates it.

---

## 2. Naming discipline — snake_case at the database boundary

Per architecture §Naming patterns line 3663-3677, the database speaks
**snake_case**; TypeScript speaks **camelCase**. Drizzle maps explicitly at
the schema definition — no magic, no inference:

```ts
// Worked example (Story 1.3 will land the real version):
export const eventLog = pgTable('event_log', {
  eventId: uuid('event_id').primaryKey(),
  pariwarId: uuid('pariwar_id').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
});
```

The TS column name is `eventId`; the SQL column name is `event_id`. Raw SQL
inside migration files + ad-hoc psql sessions uses snake_case verbatim. A
future ESLint rule (per `packages/eslint-config-twt/` Story 1.X TODO at line
60) will ban camelCase identifiers inside raw SQL strings.

---

## 3. Migration policy — forward-only, never `--down`

Per architecture §1.8 line 988-997:

> **Forward-only.** No `--down` reliance. Rollback is a new forward migration
> that inverts the change.

drizzle-kit's `migrate` command applies migrations in order, tracked in
`drizzle.__drizzle_migrations`. Once a migration has been applied to any
environment past dev, it is **immutable** — fixing a mistake means a new
forward migration. The `db:push` command is **forbidden** because it bypasses
migration history; this workspace's `package.json` deliberately omits it.

### Authoring a new migration

```sh
# 1. Edit src/schema/*.ts with the new table / column / index.
# 2. Generate the migration:
pnpm --filter @twt/domain db:generate --name <short-descriptive-name>
# 3. Inspect the emitted SQL in migrations/<idx>_<name>.sql. If anything looks
#    wrong, edit BOTH the schema source AND the emitted SQL by hand (or delete
#    + regenerate). Do not commit a migration whose emitted SQL diverges
#    silently from the schema source.
# 4. Apply locally:
pnpm db:migrate
# 5. Verify drift:
pnpm db:check
# 6. Commit the schema source, the .sql file, and meta/*.json TOGETHER. They
#    are a single logical unit.
```

### Hand-supplemented migration pattern (triggers, RLS, etc.)

drizzle-kit emits DDL for tables / columns / indexes / constraints, but does
NOT emit DDL for **triggers, RLS policies, partitions, or custom functions**.
These features land via **hand-supplemented migrations**: drizzle-kit emits
the table; the engineer appends the trigger / policy / function in the same
`.sql` file, preserving the `--> statement-breakpoint` separator. The
migration file gets a header comment marking it `⚠ DO NOT REGENERATE`.

This is the **standard Drizzle ecosystem pattern** — `drizzle-kit check`
validates schema-vs-snapshot at the table-shape level only, not trigger
contents, so trigger correctness is verified by integration tests at the
owning package (e.g., `packages/events/tests/append-only.test.ts` for the
Story 1.3 trigger).

Per architecture §1.8 line 1003-1005 (per-migration atomicity), the table
creation and the hand-supplemented DDL land in the **same transaction**: a
failed trigger creation rolls back the table creation; idempotency invariant
preserved.

### Migration 0001 — `events_log` table + append-only triggers (Story 1.3)

Migration 0001 lands the `events_log` table per Story 1.3 + AR-8. The
hand-supplemented suffix installs `events_log_no_update`,
`events_log_no_delete`, and `events_log_no_truncate` triggers — each fires
`RAISE EXCEPTION 'events_log is append-only — corrections emit a new event
(AR-8)'`. The triggers are the structural defense; the application API in
`@twt/events` provides no UPDATE / DELETE paths.

See `packages/events/README.md` and
[`docs/adr/ADR-0004-canonical-json.md`](../../docs/adr/ADR-0004-canonical-json.md)
for the API + canonical-JSON consumer surface.

---

## 4. Per-migration atomicity

Per architecture §1.8 line 1003-1005, each migration file is a single atomic
transaction unless the SQL itself opens explicit savepoints. drizzle-kit wraps
each migration in `BEGIN; … COMMIT;`. Migrations that include statements that
**cannot** run inside a transaction (e.g., `CREATE INDEX CONCURRENTLY`) must
be split into separate migration files with non-transactional headers.

---

## 5. Online migrations for hot tables

Per architecture §1.8 line 1009-1017, schema changes against hot tables must
avoid long locks. The committed pattern is the **three-step rollout**:

1. Add a new nullable column (cheap; takes a metadata lock).
2. Backfill via a pg-boss job (Story 1.12 substrate) at controlled rate.
3. Add the `NOT NULL` constraint (or any other constraint that requires a full
   scan) in a separate migration once the backfill is complete.

`CREATE INDEX` on hot tables uses `CONCURRENTLY` to avoid blocking writes.
Per-migration lock-time budget metadata lands per migration where it matters
(downstream Story discipline; not enforced at Story 1.2).

---

## 6. Per-workspace pool isolation

Per architecture §1.1 line 706-710:

> Pool sizing committed in Category 5 (Infrastructure) with named ceiling per
> workspace.

Each workspace (`apps/api`, `apps/jobs`, and any future workspace that needs
DB access) calls `createDb(connectionString, options)` with its **own** pool.
Pools are NOT shared across workspaces — a job-worker spike must not starve
member-facing requests. Production sizing is operations policy + a Category 5
commitment; the factory's default `max: 10` is a placeholder, not a ceiling.

Worked example (Story 1.3+ will land the real wiring):

```ts
import { createDb, resolveConnectionString } from '@twt/domain';

const connectionString = await resolveConnectionString();
const { db, pool } = createDb(connectionString, { max: 20 });

// Use `db` for typed queries; expose `pool` only if the workspace needs raw
// pg client access (e.g., for LISTEN/NOTIFY).
```

---

## 7. Connection-string resolution + Secret Manager

`resolveConnectionString(secretName)` resolves the database URL via:

1. **Secret Manager** (production + CI + opt-in dev) — when `NODE_ENV === 'production'`
   OR `GOOGLE_APPLICATION_CREDENTIALS` is set OR `DRIZZLE_FORCE_SECRET_MANAGER === '1'`.
   Uses Application Default Credentials per architecture §5.4 line 3046-3055.
2. **`DATABASE_URL` env-var** (local-dev fallback) — otherwise. Logs a warning
   on each call so the fallback is noisy.

Production paths require Workload Identity Federation (architecture §5.4) +
the secret to exist in the project's Secret Manager. The factory NEVER logs
the resolved value. Local-developer setup:

```sh
# Option (a) Local Postgres in Docker (recommended for substrate development):
docker run --name twt-pg -e POSTGRES_USER=twt_dev_app -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=twt_dev -p 5432:5432 -d postgres:16
# Set DATABASE_URL in packages/domain/.env:
echo "DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5432/twt_dev?sslmode=disable" \
  > packages/domain/.env

# Option (b) Cloud SQL Auth Proxy (matches production wire path):
# Get the instance connection name: cd infra/gcp && terraform output instance_connection_name
cloud-sql-proxy --port=5432 twt-dev:asia-south1:twt-dev-postgres &
# Same DATABASE_URL as above (point at 127.0.0.1:5432).
# Note: createDb default ssl: { rejectUnauthorized: false } is intentional for Auth Proxy
# (loopback socket; mutual-TLS handled by proxy). Direct private-IP callers MUST override:
# createDb(url, { ssl: true })
```

---

## 8. Root scripts + Turbo task wiring

The root `package.json` exposes shortcut scripts that delegate via pnpm filter:

| Root script         | Delegates to                                       | Purpose                                |
| ------------------- | -------------------------------------------------- | -------------------------------------- |
| `pnpm db:generate`  | `pnpm --filter @twt/domain db:generate`            | Emit a new migration from schema diff. |
| `pnpm db:migrate`   | `pnpm --filter @twt/domain db:migrate`             | Apply pending migrations idempotently. |
| `pnpm db:check`     | `pnpm --filter @twt/domain db:check`               | Static drift check (no DB).            |
| `pnpm db:studio`    | `pnpm --filter @twt/domain db:studio`              | Local table explorer (dev only).       |

### Why `db:check` is a Turbo task but `db:migrate` is NOT

Per architecture §1.8 line 999-1002:

> **Migration phase precedes code deploy.** Schema migrations apply in their
> own pipeline step; failure stops the pipeline — code is not promoted against
> an inconsistent schema.

`turbo run build` is the code-deploy pipeline. Coupling `db:migrate` into the
build graph would couple schema migrations to artifact promotion — exactly
what the architecture forbids. The root `pnpm db:migrate` is invoked **separately**
by CI / Dokploy auto-deploy / a human operator **before** `turbo run build`.

`db:check`, by contrast, is pure static analysis over `migrations/meta/*.json`
+ `src/schema/*.ts` — no DB connection required — and is exactly the kind of
fast-feedback PR gate Turbo is for. It is wired into `turbo.json` + the
`.github/workflows/ci.yml` `db-check` job.

---

## 9. Story 1.16c boundary — schema-diff CI gate

The `db:check` CI gate enforces drizzle-kit's **internal** consistency
(emitted SQL matches the schema source). It does NOT enforce the **substantive**
v1-baseline schema constraints listed in the architecture's Top-10 anti-patterns
+ epics line 1338:

- No table named `payout_destinations` is created.
- No column matching `payout_destination*` is added to any existing table.
- No API endpoint path matches `/payout-destinations*`.
- No Zod schema in `packages/contracts/` matches `*PayoutDestination*`.

Those forbidden-pattern asserts land in **Story 1.16c** as a dedicated CI
gate. The two checks are complementary: `db:check` (Story 1.2) catches local
drift; Story 1.16c's gate enforces architecture-committed scope.

---

## 10. Placeholder sub-directory landing-Story map

| Path                        | Lands in   | Concern                                                                 |
| --------------------------- | ---------- | ----------------------------------------------------------------------- |
| `src/policies/`             | **Story 1.6 (landed)** | RLS `pgPolicy` declarations (multi-tenant isolation); Story 1.7 added the Pariwar-Passport carve-out; Story 1.8 added the `role_grants` scoped policy |
| `src/rbac/`                 | **Story 1.8 (landed)** | Permission-key catalog + scope model (`scopeContains`) + 12 declarative role bundles (`seedRoles`) + fail-closed `requirePermission`/`hasPermission` guard + audit seam |
| `src/ids/`                  | **Story 1.7 (landed)** | Branded ID types (`PariwarId`, `MemberId`, …) + UUID-validating smart constructors |
| `src/pariwar-passport/`     | **Story 1.7 (landed)** | Read accessor + write path + 60s freshness cache (`getPariwarPassport`, `upsertPariwarPassport`, `BRANDING_BUNDLE_MAX_STALENESS_MS`) |
| `src/encryption/`           | **Story 1.5 (landed)** | Envelope-encryption + blind-index substrate; `piiColumn` factory       |
| `src/test-utils/`           | **Story 1.6 (landed)** | Shared live-DB integration-test substrate (`setupLiveDb`)  |
| `src/snapshot-fixtures/`    | Story 7.x  | Pool Engine snapshot fixtures                                           |
| `src/snapshot-adapters/`    | Story 7.x  | Per-version Pool Engine snapshot adapters                               |
| `src/cross-tenant/`         | **Story 1.6 (landed)** | Named cross-tenant operations helper (single RLS-bypass call-site) |
| `src/bank-statement/`       | Story 9.2  | Normalized bank-statement row schema                                    |
| `src/per-pariwar/bihar/`    | Story 1.7 (deferred) + 10.12 | Bihar custom-field JSON Schema — **custom fields NOT landed at 1.7** (no host members/claims/pools tables until Epic 3/6/7; explicit deferral, see the dir README) |

### Story 1.5 — `src/encryption/` substantive landing

Story 1.5 substantively populated `src/encryption/` per AR-12 + architecture
§2.7 + §5.2 + §5.9 + §Cross-cutting concerns line 4539. The substrate exposes
the three-tier PII encryption API:

- **Tier 1 (`encryptTier1` / `decryptTier1`)** — envelope encryption with per-row
  DEK + Cloud KMS HSM-backed KEK + AES-256-GCM AEAD + canonical-JSON AAD binding.
- **Tier 2 (`blindIndex`)** — HMAC-SHA-256 blind index for equality lookup with
  field-class namespacing + per-Pariwar context binding (Option B substrate
  default; substantive Option-A-vs-B choice deferred to Story 1.6 per D9-1.5).
- **Tier 3 (`passThroughTier3`)** — plaintext identity with `TIER_3_MARKER`
  consumed by Story 1.16b PII shielding CI gate.
- **`KmsProvider`** seam per AR-13 with `createCloudKmsProvider`
  (`@google-cloud/kms ^4.5.0`) + `createFakeKmsProvider` (Node `crypto`; tests).
- **`piiColumn(tier, fieldClass?)`** Drizzle column-transformer factory with
  tier metadata attached + `AsyncLocalStorage`-backed `encryptionContextStorage`
  + `withEncryptionContext` wrapper.
- **Cloud KMS Terraform IaC** at `infra/gcp/cloud-kms-dev.tf` (keyring +
  Tier-1 KEK HSM + Tier-2 HMAC HSM + IAM bindings + `lifecycle.prevent_destroy`).
- **`pnpm crypto:check` CI gate** runs the encryption substrate unit tests
  with `KMS_TEST_MODE=fake` (no external KMS dep).

See `src/encryption/README.md` for the substantive API surface + downstream
Story usage examples. ADR-0006-pii-tier-1-kek-library records the
`@google-cloud/kms` + Node `crypto` library choice + the Tink-TypeScript
sunset resolution (Tink envelope shape preserved + Tink-recommended
algorithms used). `docs/runbooks/secret-rotation.md` §2.1.1 + §2.1.2 + §2.1.3
covers Tier-1 KEK + Tier-2 HMAC rotation specifics.

---

## 11. Architecture-vs-Epic-AC `packages/db` divergence

Epic AC line 1016 verbatim wording says "Drizzle schema authoring scaffolding
lives in **`packages/db`**". Architecture §Workspace Layout line 406 +
§Complete project directory structure line 4341-4356 + §Naming patterns
line 3670-3672 are all canonical: `packages/domain/` is the architecture-
committed home. Per the `[[feedback_architecture_vs_prd_boundary]]` discipline,
**architecture is authoritative for workspace naming** + the epic AC is
documentation-summary loose phrasing. Story 1.2 follows architecture; no
`packages/db/` workspace is created. See Decision 2026-06-08-038 (Story 1.2
substantive author-commit) for the formal supersession record.

---

## 12. Row-Level Security (RLS) — `pariwar_id` typed constraint (Story 1.6)

Story 1.6 makes multi-tenant isolation a **database-layer typed constraint**
per architecture §1.2 line 717-725 (Cross-Cutting #1) + AR-3 + FR-59, rather
than an application-layer discipline a forgotten `WHERE` clause can undo.

### Two-role model

| Role          | Kind            | Purpose                                                       |
| ------------- | --------------- | ------------------------------------------------------------- |
| `twt_app`     | NOLOGIN group   | Normal request handlers. Every RLS policy binds `TO twt_app`. |
| `twt_service` | NOLOGIN group   | Batch jobs / cross-tenant tooling (Story 1.10 + 7.x).         |
| `twt_dev_app` | Cloud SQL login | The application login role; GRANTed membership in both groups.|

Both group roles are `NOBYPASSRLS` (migration 0002 sets it explicitly + a
migration-time self-test fails the migrator if either ever regains BYPASSRLS —
closes Story 1.2 deferred W1). The login role's effective privileges include the
group's, so policies `TO twt_app` apply to `twt_dev_app` via membership. In
production `twt_dev_app` is a non-superuser, so RLS applies directly; in local
Docker / CI it is a superuser (created by `POSTGRES_USER`) that **bypasses** RLS,
so the integration tests `SET LOCAL ROLE twt_app` to shed superuser.

### Session-variable contract

The policies key on `app.pariwar_id`, set per request/transaction:

```ts
import { setPariwarScope, assertPariwarScopeSet, withPariwarScope } from '@twt/domain';

// Inside an open transaction (Story 1.9 scope-resolution middleware):
await setPariwarScope(client, pariwarId);     // SET LOCAL app.pariwar_id (UUID re-parsed)
const scope = await assertPariwarScopeSet(client); // loud fail-closed guard

// For scripts/jobs — opens its own tx, sets scope, commits:
await withPariwarScope(pool, pariwarId, (db, client) => db.select().from(/* … */));
```

`setPariwarScope` MUST run inside a transaction (`SET LOCAL` is tx-scoped;
outside a tx it leaks to the next pooled request). The policy expression
`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid` is the
**quiet** fail-closed (unset scope → NULL → 0 rows); `assertPariwarScopeSet` is
the **loud** complement (throws `PariwarScopeMissingError`).

### Cross-tenant escape hatch

The single named call-site `crossTenant.runAsCrossTenant(pool, ctx, fn)` issues
`SET LOCAL row_security = off` + emits an `audit.cross_tenant_access` event. See
`src/cross-tenant/README.md`. A CI import-rule lint forbidding cross-tenant
construction outside that module lands at Story 1.16a (deferred D1-1.6).

### Live-DB CI substrate

Story 1.6 adds the `integration-tests` job to `.github/workflows/ci.yml` — a
Postgres 16 service container that applies migrations and runs the live-DB
suites under `@twt/domain` + `@twt/events`. The suites self-skip via
`describe.skipIf(!hasDatabase)` when `DATABASE_URL` is unset, so local
`pnpm test` without Docker still passes. The per-test transaction-rollback
substrate (`src/test-utils/integration-setup.ts`, relocated from
`packages/events/tests/` at Story 1.6) is shared by both packages.

---

## 13. References

- [Source: architecture.md#1.1] line 691-714 — Datastore = Managed Postgres in India region (Cloud SQL).
- [Source: architecture.md#1.2] line 715-770 — RLS via `pariwar_id` + Drizzle `pgPolicy`.
- [Source: architecture.md#1.3] line 776-785 — Drizzle-zod compatibility note (Story 1.4 boundary).
- [Source: architecture.md#1.4] line 794-838 — Postgres for cache + idempotency + job queue at v1.
- [Source: architecture.md#1.5] line 839-903 — Audit log two-tier (Story 1.10 substrate).
- [Source: architecture.md#1.7] line 936-985 — Per-tenant custom fields JSONB.
- [Source: architecture.md#1.8] line 986-1017 — drizzle-kit forward-only migration policy.
- [Source: architecture.md#Workspace-Layout] line 382-417.
- [Source: architecture.md#Naming-patterns] line 3663-3677.
- [Source: architecture.md#Complete-project-directory-structure] line 4341-4360.
- [Source: architecture.md#5.4] line 3044-3098 — Workload Identity Federation.
- [Source: architecture.md#5.9] line 3318-3373 — Secret Manager.
- [Source: docs/adr/ADR-0003-datastore-engine.md] — Drizzle-over-Prisma + drizzle-kit forward-only policy.
- [Source: epics.md#Story-1.2] line 1005-1022 — story body + ACs.
- [Source: epics.md#Story-1.16c] line 1331-1344 — schema-diff CI gate boundary.
