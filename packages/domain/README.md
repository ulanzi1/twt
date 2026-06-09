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
│   ├── index.ts            barrel: createDb + resolveConnectionString + schema
│   ├── db.ts               Drizzle factory bound to a node-postgres pool
│   ├── secrets.ts          Secret Manager fetch + DATABASE_URL fallback
│   ├── schema/
│   │   ├── index.ts        schema barrel
│   │   └── _baseline.ts    migration-zero marker (declares the `drizzle` metadata schema)
│   ├── policies/           [Story 1.6] RLS pgPolicy declarations
│   ├── ids/                [Story 1.7+] branded ID types
│   ├── encryption/         [Story 1.5] envelope-encryption column transformers
│   ├── snapshot-fixtures/  [Story 7.x] Pool Engine snapshot fixtures
│   ├── snapshot-adapters/  [Story 7.x] Pool Engine snapshot version adapters
│   ├── cross-tenant/       [Story 1.6] named cross-tenant operations helper
│   ├── bank-statement/     [Story 9.2] normalized bank-statement row schema
│   └── per-pariwar/bihar/  [Story 1.7+10.12] per-Pariwar JSON Schema fragments
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
| `src/policies/`             | Story 1.6  | RLS `pgPolicy` declarations (multi-tenant isolation)                    |
| `src/ids/`                  | Story 1.7+ | Branded ID types (`PariwarId`, `MemberId`, …)                           |
| `src/encryption/`           | Story 1.5  | Envelope-encryption Drizzle column transformers                         |
| `src/snapshot-fixtures/`    | Story 7.x  | Pool Engine snapshot fixtures                                           |
| `src/snapshot-adapters/`    | Story 7.x  | Per-version Pool Engine snapshot adapters                               |
| `src/cross-tenant/`         | Story 1.6  | Named cross-tenant operations helper (single RLS-bypass call-site)       |
| `src/bank-statement/`       | Story 9.2  | Normalized bank-statement row schema                                    |
| `src/per-pariwar/bihar/`    | Story 1.7+ | Bihar-specific custom-field JSON Schema (Pariwar-Passport + Story 10.12) |

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

## 12. References

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
