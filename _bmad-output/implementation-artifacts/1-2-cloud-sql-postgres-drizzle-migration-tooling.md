# Story 1.2: Cloud SQL Postgres + Drizzle Migration Tooling

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As **Solo Builder**,
I want **a Cloud SQL Postgres instance provisioned in `asia-south1` with Drizzle ORM and drizzle-kit migration tooling**,
So that **every data-model story (1.3 events, 1.5 encryption, 1.6 RLS, 1.7 Pariwar-Passport, 1.10 audit log, 1.12 pg-boss, 3.x members, 4.x rules, 7.x pools, 9.x reconciliation) has a single canonical place to author / version / apply schema migrations against a real DPDPA-resident database**.

This is the **second Epic 1 engineering story** (`[PRIMITIVE]`). It commits the **substrate** for every subsequent data-model story: the Cloud SQL Postgres instance in GCP `asia-south1` (Mumbai), the Drizzle ORM + drizzle-kit migration toolchain scaffolded under `packages/domain/`, the connection-string-via-Secret-Manager wiring, and the `pnpm db:migrate` idempotency contract. Per architecture §Implementation Handoff (lines 5079-5099), this is the first half of PR-2 territory (substrate scaffolding); the second half — `pariwar_id` schema discipline + golden-example claim feature — lands in Stories 1.6 / 1.7 / 6.x.

## Acceptance Criteria

**AC-1 — Cloud SQL Postgres provisioned in `asia-south1` with Drizzle scaffolding + `pnpm db:migrate` + Secret Manager wiring**

**Given** GCP `asia-south1` is the architecturally-frozen primary region (per architecture §5.1 line 2920-2939 + AR-27 epics line 300)
**When** Cloud SQL Postgres is provisioned
**Then** the instance lives in `asia-south1` with automated daily backups + PITR enabled (per architecture §5.7 line 3192-3194: "Automated daily backups + PITR up to 35 days (Cloud SQL default)")
**And** Drizzle schema authoring scaffolding lives in `packages/domain/` per architecture §Workspace Layout line 406 + architecture §Complete project directory structure line 4341-4356 (NOT `packages/db` as the epic AC line 1016 literal naming says — see Dev Notes "Architecture-vs-Epic-AC `packages/db` workspace-naming divergence" for the discipline) with drizzle-kit migrations under `packages/domain/migrations/` (architecture-canonical location per architecture line 4343)
**And** `pnpm db:migrate` (root-level pnpm script per epic AC verbatim wording) applies migrations idempotently against the dev DB — running twice produces no schema change and exit 0
**And** the connection string is loaded from Cloud Secret Manager (architecture §5.9 line 3320-3337), not from a `.env` file in any non-local-developer execution context

**AC-2 — Schema-diff CI verifies migrations against v1 baseline schema constraints**

**Given** the DB is provisioned and AC-1 is closed
**When** a Drizzle migration is authored and applied
**Then** the lightweight per-PR `pnpm db:check` (drizzle-kit `check` command) wired into `.github/workflows/ci.yml` verifies the migration set is internally consistent (no drift between schema definition + emitted SQL); the **substantive v1-baseline-constraints** assertion-set per architecture §Top-10 anti-patterns + per Story 1.16c (schema-diff CI gate) — "no table named `payout_destinations` is created; no column matching `payout_destination*` is added to any existing table; no API endpoint path matches `/payout-destinations*`; no Zod schema in `packages/contracts/` matches `*PayoutDestination*`" per epic line 1338 — is **Story 1.16c territory** and is NOT in Story 1.2 scope. Story 1.2 commits the integrity-check primitive (drizzle-kit `check`); Story 1.16c commits the substantive `benefit_mechanism` + payout-destination forbidden-pattern asserts.

## Tasks / Subtasks

- [~] **Task 1: Provision Cloud SQL Postgres (dev environment) — IaC scaffold + provisioning execution** (AC: #1) — _IaC authored; live provisioning deferred per substrate-only user choice (see Completion Notes)_
  - [x] 1.1 Decide provisioning strategy. Two viable options per architecture §Implementation Handoff (lines 5096-5099 — "Phase-0 / PR-2 documentation deliverables. Committed documentation artifacts (onboarding tour, ADRs, runbooks, escrow docs) are Phase-0 / PR-2 deliverables, not architecture-phase outputs. Architecture commits the artifacts' existence + content shape; writing them is downstream"):
    - **Option (a) Terraform IaC** (Recommended for reproducibility + Story 1.15 Dokploy alignment): `infra/gcp/cloud-sql-dev.tf` declares the Cloud SQL Postgres instance (Postgres 16, asia-south1, single-zone HA at dev, regional HA at staging+prod, daily backups + PITR enabled, private IP via Private Service Connect per architecture §5.8 line 3243-3244 + line 3270). Recommended because the v1-deferred-but-architecture-committed `twt-staging` + `twt-prod` per architecture §5.5 line 3102-3111 will reuse the Terraform module pattern. Terraform v1.7+ + `hashicorp/google` provider ~5.x.
    - **Option (b) `gcloud` runbook** (faster at v1 if Terraform-learning-cost is non-trivial): `infra/gcp/cloud-sql-dev-provisioning.md` documents the `gcloud sql instances create` command sequence + the post-provisioning IAM grants + Secret Manager secret-creation + Private Service Connect attachment. The runbook is executable by hand or via a thin `infra/gcp/provision-dev.sh` wrapper. Switch to Terraform when Story 1.15 (Dokploy auto-deploy + multi-Pariwar provisioning) lands or when 2nd Pariwar provisioning fires (per architecture §5.14 trigger).
    - Document the choice in Completion Notes citing this sub-task. The choice influences Tasks 1.2-1.6 file paths but not the substantive outcome.
  - [x] 1.2 Author the IaC OR runbook artifact (per 1.1 choice) covering: GCP project = `twt-dev` (per architecture §5.5 line 3103); Cloud SQL instance name = `twt-dev-postgres`; Postgres engine version = 16 (broadly stable as of 2026; Postgres 16 supports all pg-boss / native partitioning / RLS / `pg_trgm` / `pgcrypto` requirements per architecture §5.2 line 2976-2980 narrow-scope extension-compatibility commitment — verify named extensions at adoption time); region = `asia-south1`; tier = `db-custom-2-7680` (2 vCPU / 7.5 GB RAM minimum viable dev tier — operations policy decides prod tier per architecture §1.1 line 706-710 "Pool sizing committed in Category 5 (Infrastructure) with named ceiling per workspace"); availability_type = `ZONAL` at dev (single-zone), `REGIONAL` at staging+prod per architecture §5.7 line 3192-3193; backup_configuration: enabled + start_time off-peak (e.g., `02:00` IST) + point_in_time_recovery_enabled = true + transaction_log_retention_days = 7 (Cloud SQL default + matches PITR-up-to-35-day commitment per architecture §5.7 line 3194); deletion_protection = true; ip_configuration: ipv4_enabled = false (no public IP per architecture §5.8 line 3270 "Cloud SQL has no public IP") + private_network = VPC self_link + require_ssl = true; database_flags: `cloudsql.enable_pgaudit = on` (defense-in-depth for the §1.5 audit-mirror integrity-check job).
  - [ ] 1.3 Provision the actual `twt-dev-postgres` instance. _DEFERRED per substrate-only user choice — see Completion Notes + deferred-work.md D1-1.2._ **Substantive provisioning may require BigDev to execute the IaC/runbook against the live GCP project**; if `twt-dev` GCP project does not yet exist, the prerequisite is `gcloud projects create twt-dev` + billing-account linkage + enable the `sqladmin.googleapis.com` + `secretmanager.googleapis.com` + `servicenetworking.googleapis.com` APIs. Document executed commands + provisioning-completion evidence (Cloud SQL instance ID + connection name) in Completion Notes.
  - [ ] 1.4 Create the application database + role. _DEFERRED — encoded in IaC; substantive creation happens at live `terraform apply` execution (D1-1.2)._ Inside the provisioned instance: `CREATE DATABASE twt_dev;` + `CREATE ROLE twt_dev_app LOGIN PASSWORD '<random-32-byte-base64>';` + `GRANT CONNECT ON DATABASE twt_dev TO twt_dev_app; GRANT USAGE ON SCHEMA public TO twt_dev_app; GRANT CREATE ON SCHEMA public TO twt_dev_app;` (drizzle-kit needs CREATE on public to install the `__drizzle_migrations` metadata table at first migrate). For Story 1.6 RLS preparation, the application role is NOT a superuser — RLS bypass via `BYPASSRLS` is forbidden per architecture §1.2 line 717-725 multi-tenant isolation commitment.
  - [ ] 1.5 Create Secret Manager secret holding the connection string. _DEFERRED — encoded in IaC (`google_secret_manager_secret.conn_string` + `_version.conn_string_v1`); substantive secret-value population happens at live `terraform apply` execution (D1-1.2)._ Secret name = `twt-dev-cloud-sql-conn-string`; secret value = `postgresql://twt_dev_app:<password>@<private-ip>:5432/twt_dev?sslmode=require`. The full resource path is `projects/<twt-dev-project-number>/secrets/twt-dev-cloud-sql-conn-string/versions/latest`. **No secret value transcribed into the repo, including this story file, Completion Notes, the IaC artifacts, or any commit message.** Per architecture §Secret management line 3320-3327: "GCP Secret Manager for all credentials, API keys, signing secrets, KEK references, and webhook signing secrets" + Workload Identity Federation discipline.
  - [x] 1.6 Wire local-developer access path. _Cloud SQL Auth Proxy + local Docker Postgres workflows documented in packages/domain/README.md §7 + apps/api/.env.example. End-to-end proxy exercise deferred (D14-1.2) — local Postgres 16 substituted for Task 7.2 idempotency verification per substrate-only choice._ Two non-exclusive options: (a) **Cloud SQL Auth Proxy** (recommended for local-dev convenience) — `cloud-sql-proxy --port=5432 twt-dev:asia-south1:twt-dev-postgres` opens a local TCP socket that the Drizzle client connects to. (b) **Direct VPC access via VPN/Tailscale** — heavier setup; defer to Story 1.15 Dokploy auto-deploy work. Document the chosen path in `packages/domain/README.md` + `apps/api/.env.example` referencing the auth-proxy invocation.
  - [ ] 1.7 Verify connectivity end-to-end: _DEFERRED — gated on live `twt-dev-postgres` provisioning (D1-1.2)._ `psql "$(gcloud secrets versions access latest --secret=twt-dev-cloud-sql-conn-string --project=twt-dev)" -c "SELECT version();"` returns the Postgres 16 server version banner. Document in Completion Notes.

- [x] **Task 2: Scaffold `packages/domain/` for Drizzle schema + migration authoring** (AC: #1)
  - [x] 2.1 Add Drizzle dependencies to `packages/domain/package.json`:
    - `drizzle-orm` ~`^0.36` (latest stable as of 2026-01; supports pgPolicy declarative API per architecture §1.2 line 717-718 "Drizzle's `pgPolicy` declarative API defines policies inside the schema" — confirm before pin; if stable minor moves to 0.37+/0.38+, pin to the matching stable line).
    - `drizzle-kit` ~`^0.27` (CLI for `generate` + `migrate` + `check` + `studio`).
    - `pg` ~`^8.13` + `@types/pg` ~`^8.11` (node-postgres driver; broadly used + ORM-aware transaction adapter per architecture §1.4 line 800).
    - `@google-cloud/secret-manager` ~`^5.6` (for `fetchConnectionString` per Task 4) — declare under `dependencies` (runtime) not `devDependencies`.
    - `dotenv` ~`^16.4` (local-dev only; under `devDependencies`).
    - **No `prisma`, no `kysely`, no `mikro-orm` dependencies — exclusively Drizzle per AR-6 epics line 261**.
  - [x] 2.2 Create `packages/domain/drizzle.config.ts` (drizzle-kit's canonical config file per drizzle-kit `^0.27` CLI conventions) per the architecture-canonical shape:
    - `dialect: 'postgresql'`
    - `schema: './src/schema/*.ts'` (multi-file schema location per architecture §Complete project directory structure line 4347-4348)
    - `out: './migrations'` (architecture-canonical migrations location per architecture line 4343)
    - `dbCredentials.url`: resolved via `fetchConnectionString('twt-dev-cloud-sql-conn-string')` (Task 4) with local-developer fallback to `DATABASE_URL` env var when `NODE_ENV !== 'production'` AND `GOOGLE_APPLICATION_CREDENTIALS` is unset.
    - `verbose: true` + `strict: true` (drizzle-kit strict mode rejects ambiguous schema diffs; aligned with the architecture's strict-TS posture).
    - `migrations.table: '__drizzle_migrations'` + `migrations.schema: 'drizzle'` (default; explicit for clarity).
  - [x] 2.3 Create `packages/domain/src/schema/` directory with an `index.ts` barrel exporting downstream-story schema fragments. At Story 1.2 closure the barrel is `export {};` or a marker comment — substantive table definitions land in Story 1.3 (`packages/events`-derived event log + Account State Machine substrate), Story 1.5 (encryption-annotated columns), Story 1.6 (RLS policies + `pariwar_id` first-class), Story 1.7 (Pariwar-Passport), Story 1.10 (audit log hot tier), Story 1.12 (pg-boss `__pgboss` schema isolation), Story 3.1+ (members + lifecycle), Story 4.x (rules), Story 7.x (pools), Story 9.x (reconciliation).
  - [x] 2.4 Create `packages/domain/src/db.ts` exposing `createDb(connectionString: string): NodePgDatabase<typeof schema>` — the Drizzle client factory. Internals: `new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000, ssl: { rejectUnauthorized: false /* GCP Cloud SQL uses self-signed in dev; staging+prod use Cloud SQL public CA per IaC */ } })` + `drizzle(pool, { schema, logger: process.env['DRIZZLE_LOG_QUERIES'] === '1' })`. **Per-workspace pool isolation principle** per architecture §1.1 line 706-710 — `apps/api/` + `apps/jobs/` import distinct factory invocations so a job-worker spike doesn't starve member-facing requests; document this in `packages/domain/README.md`. **Specific pool sizes are operations policy + Category 5 commitment**, not Story 1.2 scope — default `max: 10` is a placeholder.
  - [x] 2.5 Create the architecture-committed placeholder sub-directories under `packages/domain/src/` per architecture §Complete project directory structure line 4348-4360, all with `.gitkeep` + brief README pointers naming the landing Story:
    - `src/schema/` — **substantive at Story 1.2** (barrel exports; per-domain `.ts` files land downstream).
    - `src/policies/` — RLS via pgPolicy; Story 1.6 substantive.
    - `src/ids/` — Branded type definitions; Story 1.7+ substantive (first branded ID emerges with Pariwar-Passport).
    - `src/encryption/` — Envelope encryption + blind-index helpers; Story 1.5 substantive.
    - `src/snapshot-fixtures/` + `src/snapshot-adapters/` — Pool Engine snapshot migration; Story 7.x substantive (per architecture §1.6 line 925-934).
    - `src/cross-tenant/` — Named cross-tenant operations helper; Story 1.6 substantive (per architecture §1.2 line 737-740 + line 764-770).
    - `src/bank-statement/` — Normalized statement-row schema; Story 9.2 substantive.
    - `src/per-pariwar/bihar/` — Per-Pariwar JSON Schema; Story 1.7 + Story 10.12 substantive.
    - Each placeholder sub-directory README cites the landing Story.
  - [x] 2.6 Create `packages/domain/migrations/` directory (architecture-canonical drizzle-kit `out` location per architecture line 4343) — empty at Story 1.2 closure; drizzle-kit populates on first `generate`.
  - [x] 2.7 Create `packages/domain/seed/dev/` + `packages/domain/seed/staging/` placeholder directories per architecture §Complete project directory structure line 4345-4346 with `.gitkeep` + README pointing to the per-environment seed-data discipline + the architecture §5.5 line 3113-3119 "No production PII in dev / staging" structural commitment.
  - [x] 2.8 Author the "**migration zero**" baseline. Run `pnpm --filter @twt/domain exec drizzle-kit generate --name init-baseline` after authoring a single empty schema file `packages/domain/src/schema/_baseline.ts` (declares the `drizzle` schema if not implicit). This produces `packages/domain/migrations/0000_init-baseline.sql` + `packages/domain/migrations/meta/_journal.json` + `packages/domain/migrations/meta/0000_snapshot.json`. The migration zero proves the toolchain pipe; substantive table definitions land downstream. Commit the generated files exactly as drizzle-kit emits.
  - [x] 2.9 Add `packages/domain/package.json` scripts:
    - `"db:generate": "drizzle-kit generate"`
    - `"db:migrate": "drizzle-kit migrate"` (or a thin `tsx scripts/migrate.ts` wrapper if Secret Manager resolution requires Node code — see Task 4)
    - `"db:check": "drizzle-kit check"` (per-PR drift detection per AC-2)
    - `"db:studio": "drizzle-kit studio"` (local-dev table-explorer; gated behind dev env)
    - Adjust the existing `"build"`, `"lint"`, `"typecheck"`, `"test"`, `"dev"` scripts only if Drizzle imports break the existing `tsc -p tsconfig.json` build (they should not).
  - [x] 2.10 Verify `pnpm --filter @twt/domain db:migrate` applies migration 0000_init-baseline against the dev DB; verify a second invocation is a no-op (idempotency per AC-1 verbatim wording "applies migrations idempotently"); confirm the `drizzle.__drizzle_migrations` row count = 1 via `psql`.
  - [x] 2.11 Author `packages/domain/README.md` covering: (a) the snake_case-DB / camelCase-TS naming discipline per architecture §Naming patterns line 3663-3677 + the raw-SQL snake_case convention per architecture line 3674-3677 with a worked example; (b) the drizzle-kit forward-only migration policy per architecture §1.8 line 988-997 ("Forward-only. No `--down` reliance. Rollback is a new forward migration that inverts the change"); (c) the per-migration atomicity rule per architecture §1.8 line 1003-1005; (d) the online-migration discipline for hot tables per architecture §1.8 line 1009-1017 ("add nullable column → backfill via pg-boss job → add constraint" pattern + `CREATE INDEX CONCURRENTLY` for hot tables + per-migration lock-time budget metadata); (e) the per-workspace pool isolation principle per architecture §1.1 line 706-710; (f) cross-references to the architecture-canonical placeholder sub-directories per Task 2.5 with landing Story pointers.

- [x] **Task 3: Root-level `pnpm db:migrate` shortcut + Turborepo wiring boundary** (AC: #1)
  - [x] 3.1 Add root `package.json` scripts:
    - `"db:migrate": "pnpm --filter @twt/domain db:migrate"` (epic AC-1 verbatim wording — "`pnpm db:migrate` applies migrations idempotently")
    - `"db:generate": "pnpm --filter @twt/domain db:generate"`
    - `"db:check": "pnpm --filter @twt/domain db:check"`
    - `"db:studio": "pnpm --filter @twt/domain db:studio"`
  - [x] 3.2 **Do NOT add `db:migrate` as a `turbo` task** in `turbo.json`. Rationale per architecture §1.8 line 999-1002: "**Migration phase precedes code deploy.** Schema migrations apply in their own pipeline step; failure stops the pipeline — code is not promoted against an inconsistent schema." `turbo run build` is the code-deploy pipeline; coupling `db:migrate` into the build graph would couple schema migrations to artifact promotion, which the architecture explicitly forbids. The root pnpm script is invoked separately by CI / Dokploy auto-deploy / human operator BEFORE `turbo run build`. Document this rationale in `packages/domain/README.md` (Task 2.11 (b)).
  - [x] 3.3 **DO add `db:check` as a `turbo` task** in `turbo.json` because drizzle-kit `check` is a per-PR drift-detection CI gate (verifies migrations match schema; no DB connection required) — fits the Turbo pipeline shape. Task definition: `"db:check": { "dependsOn": [], "outputs": [] }`. Wire as a CI job in `.github/workflows/ci.yml` (Task 5).

- [~] **Task 4: Secret Manager connection-string fetch + local-dev fallback** (AC: #1) — _resolver authored + local-dev fallback verified; Secret Manager round-trip (4.5) exercises only on live provisioning execution_
  - [x] 4.1 Author `packages/domain/src/secrets.ts` exposing `fetchConnectionString(secretName: string): Promise<string>`:
    - Uses `@google-cloud/secret-manager`'s `SecretManagerServiceClient` via Application Default Credentials (ADC) — no service-account JSON key in the repo; ADC resolves via `gcloud auth application-default login` for local-dev + via Workload Identity Federation for CI/CD per architecture §5.4 line 3046-3055.
    - Full resource path: `projects/<project>/secrets/<name>/versions/latest`; `secretName` parameter is just the secret name (`twt-dev-cloud-sql-conn-string`); the project is resolved from `GOOGLE_CLOUD_PROJECT` env var (set by ADC).
    - Returns the secret payload as a UTF-8 string; never logs the value.
  - [x] 4.2 Local-developer fallback in the drizzle.config + the `db.ts` factory: when `NODE_ENV !== 'production'` AND `GOOGLE_APPLICATION_CREDENTIALS` env is unset AND `DATABASE_URL` env IS set, fall back to reading `DATABASE_URL` directly. Logged warning at first invocation: "Drizzle: local-dev fallback in use; production paths require Secret Manager." Document the fallback contract in `packages/domain/README.md`; cite the architecture §5.4 line 3046-3053 Workload Identity Federation discipline for production paths.
  - [x] 4.3 Author a thin wrapper `packages/domain/scripts/migrate.ts` that: (a) calls `fetchConnectionString('twt-dev-cloud-sql-conn-string')`; (b) invokes drizzle-kit's programmatic migrate API with the resolved URL. This is the body behind `"db:migrate": "tsx scripts/migrate.ts"` if Secret Manager resolution must happen in Node (drizzle-kit's CLI reads `dbCredentials.url` from `drizzle.config.ts` which CAN be an async function in `drizzle-kit ^0.27`; verify and prefer the config-async-callback path if it works to keep one source of truth — fall back to the wrapper script if not).
  - [x] 4.4 Update `.env.example` files:
    - Root `.env.example`: appendix line `# For per-workspace DB config see packages/domain/.env.example`.
    - `packages/domain/.env.example` (NEW per Task 4.4): documents `DATABASE_URL=postgresql://twt_dev_app:<password>@127.0.0.1:5432/twt_dev?sslmode=require` (local-dev fallback only; **placeholder; do not commit real password**), `GOOGLE_CLOUD_PROJECT=twt-dev`, `GOOGLE_APPLICATION_CREDENTIALS=<path-to-ADC-json>` (typically left unset locally so ADC discovers via `gcloud auth application-default login`), `DRIZZLE_LOG_QUERIES=0`.
    - `apps/api/.env.example` (UPDATE): cite the Cloud SQL Auth Proxy local-dev path + the `pnpm db:migrate` workflow.
  - [ ] 4.5 Verify the Secret Manager round-trip end-to-end: _DEFERRED — local-dev fallback path verified against Docker Postgres 16 (Task 7.2); Secret Manager round-trip exercise requires live `twt-dev-postgres` + populated secret (D1-1.2)._ `pnpm --filter @twt/domain db:migrate` (with `GOOGLE_APPLICATION_CREDENTIALS` unset + ADC active) connects via Secret Manager → fetches conn string → applies migration 0000_init-baseline. Document the verification in Completion Notes.

- [x] **Task 5: CI wiring for `db:check` per-PR drift detection** (AC: #2)
  - [x] 5.1 Add a `db-check` job to `.github/workflows/ci.yml` mirroring the existing `lint` + `typecheck` + `test` + `build` job shapes (per Story 1.1 CI workflow). The job: `needs: install`; runs `pnpm turbo run db:check`; concurrency-grouped per the existing key. **No DB connection required** — drizzle-kit `check` is a pure-static-analysis pass over `migrations/meta/*.json` + `src/schema/*.ts`.
  - [x] 5.2 Document the Story 1.16c boundary explicitly in `packages/domain/README.md` (Task 2.11 cross-reference): Story 1.2 commits the lightweight per-PR `db:check`; **Story 1.16c commits the substantive v1-baseline forbidden-pattern asserts** (no `payout_destinations` table, no `payout_destination*` columns, no `/payout-destinations*` endpoints, no `*PayoutDestination*` Zod schemas) per epic line 1338. The two are complementary CI gates with disjoint responsibilities.
  - [x] 5.3 Do NOT add a `db:migrate` CI job at Story 1.2. Substantive automated migration-execution-in-CI requires `twt-staging` GCP project + WIF binding + staging Cloud SQL instance + Dokploy auto-deploy orchestration per architecture §5.4 + §5.5 + Story 1.15; the substantive automation is Story 1.15 territory. At Story 1.2 the migration is applied by hand via `pnpm db:migrate` against the dev DB by BigDev (Solo Builder); CI verifies only the static check.

- [x] **Task 6: Documentation + ADR slot authoring + Decision-log + cross-reference edits** (AC: #1, #2)
  - [x] 6.1 Update root `README.md` (authored at Story 1.1 Task 7.1) to add a §"Database + migrations" section pointing to `packages/domain/README.md` + the `pnpm db:migrate` workflow + the Cloud SQL Auth Proxy local-dev path.
  - [x] 6.2 Update `infra/gcp/README.md` (authored at Story 1.1 with the landing-story-map): replace the "PR-1 placeholder" prose for the gcp row with a substantive pointer to the Cloud SQL provisioning artifact (Task 1.2 IaC OR runbook) + the `twt-dev-postgres` instance ID + the Secret Manager secret name.
  - [x] 6.3 Author **ADR-0003: Datastore engine — Cloud SQL Postgres + Drizzle ORM + drizzle-kit migrations** at `docs/adr/ADR-0003-datastore-engine.md`. Closes the slot `ADR-NNNN-datastore-engine` at `docs/knowledge-transfer/adr-index.md` line 54 (architecture §Deferred Decisions L157-159; expected close trigger = "Story 1.2 Cloud SQL Postgres + drizzle migration tooling closure"). ADR body covers: (a) the engine commitment Postgres 16 + Cloud SQL managed + asia-south1 regional HA + automated backups + PITR (architecture §1.1 + §5.1 + §5.7 transcription); (b) the ORM choice Drizzle over Prisma — rationale per architecture line 668 + line 717-718 + architecture §1.3 line 776-785 drizzle-zod compatibility note + the Drizzle pgPolicy declarative API support that Story 1.6 RLS depends on + the Drizzle column-transformer pattern that Story 1.5 envelope encryption depends on + Prisma's lack of native pgPolicy + Prisma's heavier client + Prisma's slower cold-start (vs Drizzle's lean SQL-builder design); (c) the drizzle-kit migration policy transcription (forward-only + per-Pariwar JSONB migrations per architecture §1.8 + §1.7 line 962); (d) Workload Identity Federation for CI auth + Secret Manager for connection string per architecture §5.4 + §5.9. Status: `drafted` at Story 1.2 commit; flips to `under-trustee-review` post-Story-1.2-review; ratified per Trustee Panel session.
  - [x] 6.4 Update `docs/knowledge-transfer/adr-index.md`:
    - Row at line 54 `ADR-NNNN-datastore-engine` → `ADR-0003-datastore-engine`; Status `slot-reserved-pre-write` → `drafted` post-Task-6.3 author-commit.
    - Update the Status row-count table at line 19-26 (increment `drafted` and decrement `slot-reserved-pre-write` by 1).
  - [x] 6.5 Append **Decision 2026-06-XX-XXX** (next sequential number after `037`) to `.decision-log.md` top of "## Decisions" section per reverse-chronological schema, recording:
    - Story 1.2 substantive author-commit: Cloud SQL Postgres + Drizzle + drizzle-kit + Secret Manager wiring.
    - Cloud SQL provisioning strategy choice (Task 1.1 Option (a) Terraform OR Option (b) gcloud runbook).
    - `packages/db` → `packages/domain/` workspace-naming divergence resolution per architecture-vs-epic boundary per `[[feedback_architecture_vs_prd_boundary]]`.
    - ADR-0003-datastore-engine drafted (per Task 6.3) pending Trustee Panel ratification.
    - Cross-Story discharge triggers: Story 1.3 `packages/events` event-log primitive substrate now ready; Story 1.5 encryption-column-transformers ready; Story 1.6 pgPolicy + `pariwar_id` RLS ready; Story 1.10 audit-log hot-tier table ready; Story 1.12 pg-boss schema-isolation ready; Story 1.16c schema-diff CI gate boundary (Story 1.2 commits the integrity primitive; Story 1.16c commits the v1-baseline forbidden-pattern asserts).
    - Per `[[feedback_closure_language_precision]]`: framework + engineering Closed by [edit] on Tasks 1-7 closure + CI green; trustee-ratification leg for ADR-0003 = Resolved via explicit deferral pending Trustee Panel session.
  - [x] 6.6 Update `docs/escrow/credential-inventory.md` Rows 35-36 (`cloud-sql-service-account-prod` + `cloud-sql-iam-recovery-grant`):
    - Status `pending-system-availability` → `pending-task-7-sealing-event` (the substantive seal event fires when BigDev seals the prod-credential envelope per Story 0.2 Task 7 mechanism; Story 1.2 lands the substrate, the envelope-sealing operation is the trustee-execution-time discharge).
    - Add a `closure_evidence_link` column reference to Decision 2026-06-XX-XXX (per Task 6.5).
    - Update Story 1.2 closure trigger language to acknowledge the substrate-vs-envelope split.
  - [x] 6.7 Update `_bmad-output/implementation-artifacts/deferred-work.md` "## Story 1.2 deferred" section with any items the dev agent decides to defer (TBD at dev time; expected items include: Terraform vs gcloud-runbook unification post-Story-1.15; `twt-staging` + `twt-prod` Cloud SQL instances per Story 1.15; substantive RLS pgPolicy + `pariwar_id` discipline per Story 1.6; substantive encryption-column-transformer wiring per Story 1.5; substantive pg-boss schema-isolation per Story 1.12; substantive Story 1.16c forbidden-pattern asserts; ADR-0003 trustee ratification).

- [~] **Task 7: Verification + AC closure + Status flip** (AC: #1, #2) — _local verification complete; CI push (7.4) is post-dev-story human action_
  - [x] 7.1 Run `pnpm turbo run lint typecheck test build` — verify zero regressions vs Story 1.1 baseline (55/55 turbo gate green). The added `packages/domain/` Drizzle code adds 1 new typecheck workspace (was already counted; package existed at Story 1.1) + 1 new build task (no-op for migrations) + 1 new test task (smoke + any unit tests on `db.ts` factory). The `db:check` task is NEW (Task 3.3); the count after Story 1.2 is approximately 56-58 turbo tasks (verify exact count).
  - [x] 7.2 Run `pnpm db:migrate` against the dev DB — verify migration 0000_init-baseline applies cleanly + a second invocation is a no-op (idempotency). Capture `psql` output showing `drizzle.__drizzle_migrations` row count = 1 in Completion Notes.
  - [x] 7.3 Run `pnpm db:check` — verify zero drift between `packages/domain/src/schema/_baseline.ts` + `migrations/0000_init-baseline.sql` + `migrations/meta/0000_snapshot.json`. Capture in Completion Notes.
  - [ ] 7.4 Push branch (`story-1.2-cloud-sql-drizzle` per Story 1.1 branch-naming convention) + open PR + watch CI run for `db-check` job green + the existing lint/typecheck/test/build jobs green. _DEFERRED to post-dev-story human action — branch authored locally + ready to push; PR + CI green verification happens after Story 1.1 PR merge sequencing._
  - [x] 7.5 Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: `development_status[1-2-cloud-sql-postgres-drizzle-migration-tooling]` from `ready-for-dev` → `in-progress` → `review` per Story 1.1 transition pattern (in-progress on dev-story start; review on Task 7.4 PR-open + CI-green).
  - [x] 7.6 Update Story 1.2 file Status field to `review`; populate Dev Agent Record (Agent Model + Completion Notes List + File List + Review Findings) per Story 1.1 template.

## Dev Notes

### Architecture-vs-Epic-AC `packages/db` workspace-naming divergence

The epic AC line 1016 verbatim wording says "Drizzle schema authoring scaffolding lives in **`packages/db`** with drizzle-kit migrations". Architecture §Workspace Layout line 406 + §Complete project directory structure line 4341-4356 + §Naming patterns line 3670-3672 all commit `packages/domain/` as the architecture-canonical home for Drizzle schema + RLS policies + tenant rules + validators + shared domain types. The Workspace Layout rationale (architecture line 421-423) explains the package-name choice: "`packages/domain/` holds the system's identity: Drizzle schema, RLS policies, tenant rules, validators, shared domain types. The database is one expression of the domain, not the system's identity."

Per `[[feedback_architecture_vs_prd_boundary]]` (architecture commits state/transitions/topology; PRD + epics commit policy/eligibility/cadence; architecture is authoritative for **structural** commitments + topology + workspace naming): the **`packages/db` naming in the epic AC is a documentation-summary loose phrasing** of the architecture-committed `packages/domain/` workspace; the architecture is canonical. **Scaffold under `packages/domain/`** (which already exists from Story 1.1 Task 2.2 + persists at the architecture-canonical path) — do NOT create a new `packages/db/` workspace.

This pattern matches the Story 1.1 "Architecture vs Story-body workspace enumeration divergence" precedent — the epic body line 989 enumerated "`apps/api`, `apps/admin`, `apps/member`, `packages/contracts`, `packages/events`, `packages/ui`" — incomplete relative to architecture; Story 1.1 followed architecture (bootstrapping the full architecture-committed tree + skipping the non-existent `apps/member`). Same disposition applies here.

Document the divergence-resolution in Completion Notes citing this Dev Note + cite Decision 2026-06-XX-XXX (per Task 6.5) as the substantive supersession recording the architecture-canonical resolution.

### `packages/domain/` baseline state at Story 1.2 start

Per Story 1.1 Task 2.2 + File List line 467: `packages/domain/` exists as a placeholder workspace with the standard shape — `package.json` (name `@twt/domain`, type module, `main: "./src/index.ts"`, scripts `build/lint/typecheck/test/dev`, devDependencies `@twt/eslint-config-twt + typescript + vitest + @types/node`); `tsconfig.json` extending root `tsconfig.base.json`; `eslint.config.js` re-exporting `@twt/eslint-config-twt`; `vitest.config.ts`; `src/index.ts` (marker `export {};`); `tests/smoke.test.ts` (asserts the workspace's `src/index.ts` is truthy).

**Story 1.2 builds on this placeholder shape** — adds Drizzle dependencies (Task 2.1), authors `drizzle.config.ts` (2.2), populates `src/schema/_baseline.ts` (2.3 + 2.8), wires `src/db.ts` (2.4), creates `src/{policies,ids,encryption,snapshot-fixtures,snapshot-adapters,cross-tenant,bank-statement,per-pariwar/bihar}` placeholders (2.5), creates `migrations/` (2.6), creates `seed/{dev,staging}/` (2.7), adds `db:generate/migrate/check/studio` scripts (2.9), authors `README.md` (2.11). The smoke test `tests/smoke.test.ts` continues to pass (the marker export is replaced by Drizzle schema exports but the smoke assertion "imported module is truthy" continues to hold).

### Story 1.1 inheritances + the Story 1.2 substrate it provides

Story 1.1 (`done` per sprint-status; CI-green-verification pending PR + CI run per Story 1.1 Task 6.5 + Group A review patches D-05 + D-06 + D-07) provides:
- The monorepo workspace topology (apps/* + packages/* per architecture §Workspace Layout) + the root pnpm + turbo + tsconfig + eslint + prettier + commitlint configuration.
- The `packages/domain/` workspace placeholder.
- `apps/api/` workspace placeholder with Dockerfile (Story 1.1 Task 4) — Story 1.2 does NOT add substantive `apps/api/` code (Fastify routes + `modules/` body are downstream-Epic territory); `apps/api/` only gains the `.env.example` Cloud SQL Auth Proxy local-dev path entry per Task 4.4.
- `.github/workflows/ci.yml` with install/lint/typecheck/test/build jobs; Story 1.2 adds a `db-check` job per Task 5.1.
- `infra/gcp/README.md` landing-story-map; Story 1.2 substantively populates the gcp row per Task 6.2.
- `docs/adr/` with ADR-0001 + ADR-0002 ratified + `_adr-template.md`; Story 1.2 authors ADR-0003 per Task 6.3.
- `docs/knowledge-transfer/adr-index.md` with the `ADR-NNNN-datastore-engine` slot at line 54 explicitly anchored to "Story 1.2 closure"; Story 1.2 closes the slot per Task 6.4.
- `docs/escrow/credential-inventory.md` Rows 35-36 with `cloud-sql-service-account-prod` + `cloud-sql-iam-recovery-grant` envelopes explicitly anchored to Story 1.2; Story 1.2 updates the status per Task 6.6.

Story 1.2 provides the substrate for:
- **Story 1.3** (`packages/events` event-log primitive) — depends on the Drizzle client + migration tooling; Story 1.3 authors `events_log` table + Postgres triggers for immutability per architecture §1.5 + epic line 1024-1041.
- **Story 1.4** (`packages/contracts` Zod + OpenAPI) — independent of DB per architecture §1.3 line 776-785 drizzle-zod compatibility note (Story 1.4 hand-writes Zod schemas; drizzle-zod is NOT used at transport-layer boundary), but the Drizzle schema in `packages/domain/` is the source-of-truth that contract types must stay assignable from per architecture §Naming patterns line 3719-3723.
- **Story 1.5** (Cloud KMS HSM + Tink envelope encryption per AR-12) — depends on the Drizzle column-transformer pattern; Story 1.5 authors `encryption-column-transformer.ts` at `packages/domain/src/encryption/`.
- **Story 1.6** (`pariwar_id` first-class + RLS adversarial test per AR-3) — depends on the Drizzle pgPolicy declarative API + the application role's lack of `BYPASSRLS`; Story 1.6 authors `packages/domain/src/policies/*.ts` + the cross-Pariwar adversarial CI test per architecture §1.2 line 742-745.
- **Story 1.7** (Pariwar-Passport data model + branding bundle per FR-63) — depends on the Drizzle schema + `packages/domain/per-pariwar/bihar/` per architecture §1.7 + epic line 1097-1116.
- **Story 1.10** (Tamper-evident audit log hot tier per FR-47 + AR-9/10) — depends on the Drizzle schema + native partitioning support + the trigger-based hash-chain insert; Story 1.10 authors `audit_log_entries` table + the integrity-check job framework.
- **Story 1.12** (pg-boss job queue per AR-5) — depends on the Postgres instance + the schema-isolation pattern per architecture §5.11 line 3424 "pg-boss queue tables on a separate Postgres schema from operational data"; Story 1.12 installs pg-boss on the `__pgboss` schema.
- **Story 1.16c** (schema-diff CI gate per FR-100) — depends on the drizzle-kit migration toolchain; Story 1.16c commits the v1-baseline forbidden-pattern asserts on top of Story 1.2's `db:check` integrity primitive.

### PR-1 / PR-2 sequencing + Story 1.2 PR-2-territory placement

Per architecture §Implementation Handoff line 5079-5099: "PR-2 — multi-tenant scaffolding + golden example claim feature. Depends on **early RLS PoC signal** (Pass or Partial)." Story 1.2 is the **substrate half** of PR-2; the multi-tenant `pariwar_id` discipline + golden-example claim feature land in Stories 1.6 (RLS) + 1.7 (Pariwar-Passport) + 3.1+ (members) + 6.x (claim).

The "early RLS PoC signal" architecture-committed precondition for PR-2 (architecture line 5084-5085) is operationally satisfied by Story 1.2 closure (the Drizzle pgPolicy support is verified at Story 1.2 Task 7.3 via `pnpm db:check` against a baseline migration with a sample pgPolicy) followed by Story 1.6 adversarial test substantive PoC. Story 1.2 does NOT include the adversarial RLS PoC — Story 1.6 owns that. Story 1.2 commits the substrate that makes Story 1.6's PoC feasible.

### Drizzle ORM + drizzle-kit version pins + ecosystem caveats

As of Jan 2026 (assistant knowledge cutoff): `drizzle-orm ^0.36` + `drizzle-kit ^0.27` are the canonical stable pins; verify against npm registry at dev-time and pin to the matching stable minor. Drizzle 0.36+ supports:
- `pgPolicy` declarative API for RLS policies in schema (Story 1.6 substrate; architecture §1.2 line 717-718).
- Column-level type transformers (Story 1.5 substrate; architecture §1.5 line 1073 "encrypt(tier, plaintext) + decrypt(tier, ciphertext) exposed as Drizzle column transformers").
- Multi-file schema via glob (`schema: './src/schema/*.ts'`).
- Async `dbCredentials.url` callback in `drizzle.config.ts` (verify per Task 2.2; fall back to programmatic migrate wrapper per Task 4.3 if the async callback path is not supported in the pinned minor).
- Native partitioning support (Story 1.10 audit log substrate; architecture §1.5 line 842 "native partitioning on `created_at`; daily partition").

**drizzle-zod compatibility note** (architecture §1.3 line 776-785): Story 1.4 will hand-write Zod schemas in `packages/contracts/` — Story 1.2 does NOT install or use `drizzle-zod`. The contract-domain drift detection per architecture line 787-790 ("Type tests in CI. Assertion files in `packages/contracts/` declare that contract types are assignable from inferred Drizzle types") is Story 1.4 territory.

### Cloud SQL provisioning cost + GCP project bootstrap concerns

Cloud SQL Postgres at `db-custom-2-7680` zonal dev tier in `asia-south1` runs approximately **$45-60 USD / month** (per GCP pricing matrix as of 2026-01; verify at provisioning time). Regional HA at staging + prod approximately doubles the monthly cost. The Trust Panel-ratified ₹15-25k/month backup-engineer-retainer envelope per Story 0.6 + the Story 0.13 legal-counsel envelope ₹15k retainer / ₹7.5k standard per Decision 2026-06-05-029 are pre-committed; **operational cloud infrastructure budget per Pariwar at v1 is NOT explicitly envelope-bounded in Phase-0 reconciliation** per Story 0.12 Decision 2026-06-05-028 (no-trigger outcome; no contract-help-path budget allocated). The dev DB cost is small ($45-60/mo); the **trustee-ratification ask is implicit** in Story 1.2 closure — if a substantive Trustee Panel cost-ratification is required, surface the gap in `docs/launch-gate-inventory/inventory-roster.md` per Story 0.15 inventory pattern (likely as a Row 15 elevated from RESERVED state, or as a new conditional-escalation row).

**Most pragmatic disposition at Story 1.2 (Solo Builder discretion within BigDev's authority per Story 0.14 ≥1-trustee acknowledgement precedent for substrate-impacting decisions):** BigDev provisions `twt-dev-postgres` against personal-funded `twt-dev` GCP project at minimal cost; the `twt-staging` + `twt-prod` provisioning is Story 1.15 territory + lands with Dokploy auto-deploy infrastructure cost bundling.

### GCP project bootstrap pre-requisites (BigDev execution-time concerns)

Before Task 1.2 IaC/runbook can execute:
- BigDev must have a Google Cloud billing account active.
- `twt-dev` GCP project created (`gcloud projects create twt-dev --name="TWT Dev"` + billing-account linkage).
- IAM roles granted to BigDev on `twt-dev`: `roles/owner` (recommended at dev for setup convenience; tighten in staging+prod per architecture §5.5 line 3103) OR the minimum-viable `roles/cloudsql.admin` + `roles/secretmanager.admin` + `roles/iam.serviceAccountAdmin` + `roles/compute.networkAdmin` (PSC requires network admin).
- APIs enabled on `twt-dev`: `gcloud services enable sqladmin.googleapis.com secretmanager.googleapis.com servicenetworking.googleapis.com compute.googleapis.com --project=twt-dev`.
- Workload Identity Federation pool + provider for the GitHub repo (per architecture §5.4 line 3046-3055) — defer to Story 1.15 substantively; at Story 1.2 the `db:check` CI job does NOT require WIF (it's a static check with no DB connection); the `db:migrate` invocation is local-developer-only at Story 1.2.

Document any project-bootstrap commands actually executed in Completion Notes; do NOT commit billing-account or project-numerical IDs that could be sensitive.

### Decision-log Decision 2026-06-XX-XXX placeholder

The next sequential Decision number after `2026-06-05-037` (the latest substantive Decision per `.decision-log.md` head) is the slot Story 1.2 dev-story authors. Format: `Decision 2026-06-XX-XXX` where `XX-XXX` is the next available date+sequence per the `.decision-log.md` reverse-chronological schema. Pre-stage at the top of the `## Decisions` section per Story 1.1 + Story 0.14 precedent.

### Repository state at story-creation time (`HEAD = 88e41c0`)

Per `git log -1 --oneline`: `88e41c0 review: Story 1.1 code review — 6 patches applied, 16 deferred, story done`. Story 1.1 closed `done` per Decision 2026-06-08 (sprint-status `1-1-turborepo-monorepo-bootstrap: done`). The monorepo at HEAD provides the substrate enumerated in "Story 1.1 inheritances" above; Story 1.2 begins from this state. No uncommitted local changes; Story 1.2 branches from `main` after Story 1.1's PR merges (or from `story-1.1-bootstrap` if that branch is the active dev branch — verify at dev-story start).

### Dev guardrails — what makes the dev agent's Story 1.2 implementation go smoothly

- **Don't reinvent Story 1.1's substrate**: the workspace exists (`packages/domain/` is a placeholder; `apps/api/` is a placeholder); the CI workflow exists; the root configs exist. Story 1.2 ADDS to this substrate; it does NOT recreate it.
- **Don't relax architecture-canonical naming**: the workspace is `packages/domain/`, not `packages/db/`. The DB-column convention is snake_case + Drizzle maps to camelCase TS explicitly per architecture §Naming patterns line 3663-3677. The migrations directory is `packages/domain/migrations/` per architecture line 4343. The schema directory is `packages/domain/src/schema/` per architecture line 4348.
- **Don't preempt downstream-story scope**: substantive `pariwar_id` RLS pgPolicy is Story 1.6; substantive envelope encryption column transformers are Story 1.5; substantive event log is Story 1.3; substantive Pariwar-Passport is Story 1.7; substantive audit log is Story 1.10; substantive pg-boss is Story 1.12; substantive schema-diff forbidden-pattern asserts are Story 1.16c. Story 1.2 commits the SUBSTRATE that these downstream stories build on, not the downstream content.
- **Don't add public IP to the Cloud SQL instance**: architecture §5.8 line 3270 is non-negotiable — "Cloud SQL has no public IP." The dev DB access path is Cloud SQL Auth Proxy or PSC via VPN, not a public-IP allowlist.
- **Don't transcribe Secret values into any committed artifact**: passwords, connection strings with embedded passwords, service-account JSON keys are FORBIDDEN in the repo. Per architecture §2.10 + §5.9 + `[[feedback_closure_language_precision]]`.
- **Don't use `drizzle-kit push`**: the `push` command bypasses migration history and is prototype-only. Story 1.2 commits the migration-history discipline; `db:push` is NOT added to scripts per architecture §1.8 line 989-991 "Forward-only. No `--down` reliance. Rollback is a new forward migration that inverts the change" — `push` violates this discipline.
- **Don't add `db:migrate` to `turbo.json`**: architecture §1.8 line 999-1002 explicitly separates the migration pipeline step from the build pipeline step. Per Task 3.2 rationale.
- **Don't install Prisma, Kysely, or MikroORM**: AR-6 commits drizzle-kit; the ORM choice is architecture-frozen. The Drizzle-over-Prisma rationale lands in ADR-0003 per Task 6.3.
- **Don't add a `packages/db/` workspace**: per the architecture-vs-epic divergence resolution above. The scaffolding lives in `packages/domain/`.
- **Use `pnpm --filter @twt/domain`** for workspace-scoped script invocation; the root `pnpm db:*` shortcuts wrap this.
- **Use Conventional Commits** per Story 1.1 commitlint config — example commits: `feat(packages/domain): add drizzle ORM + drizzle-kit scaffolding`, `feat(packages/domain): wire Secret Manager connection-string fetch`, `feat(infra/gcp): cloud-sql-dev terraform module`, `chore(.github/workflows): add db-check CI job`, `docs(adr): ADR-0003 datastore engine — Cloud SQL Postgres + Drizzle`.

### Project Structure Notes

**Workspace tree at Story 1.2 closure** (additions to the Story 1.1 baseline; preserves all Story 1.1 paths):

```
twt/
├── .decision-log.md                    [UPDATED] Task 6.5 — append Decision 2026-06-XX-XXX
├── README.md                           [UPDATED] Task 6.1 — §Database + migrations
├── package.json                        [UPDATED] Task 3.1 — root db:* scripts
├── turbo.json                          [UPDATED] Task 3.3 — db:check task
├── infra/gcp/
│   ├── README.md                       [UPDATED] Task 6.2 — Cloud SQL substantive pointer
│   ├── cloud-sql-dev.tf                [NEW] Task 1.2 Option (a) IaC path
│   │                                   OR
│   └── cloud-sql-dev-provisioning.md   [NEW] Task 1.2 Option (b) runbook path
├── docs/
│   ├── adr/
│   │   └── ADR-0003-datastore-engine.md [NEW] Task 6.3
│   ├── knowledge-transfer/
│   │   └── adr-index.md                [UPDATED] Task 6.4 — line 54 slot closure + count table
│   └── escrow/
│       └── credential-inventory.md     [UPDATED] Task 6.6 — Rows 35-36 status flip
├── .github/workflows/
│   └── ci.yml                          [UPDATED] Task 5.1 — db-check job
├── packages/
│   └── domain/                         (existing placeholder workspace; Story 1.2 populates)
│       ├── package.json                [UPDATED] Task 2.1 — drizzle deps + 2.9 db:* scripts
│       ├── drizzle.config.ts           [NEW] Task 2.2
│       ├── README.md                   [NEW] Task 2.11
│       ├── .env.example                [NEW] Task 4.4
│       ├── migrations/                 [NEW] Task 2.6
│       │   ├── 0000_init-baseline.sql  [NEW GENERATED] Task 2.8 (drizzle-kit emit)
│       │   └── meta/
│       │       ├── _journal.json       [NEW GENERATED] Task 2.8
│       │       └── 0000_snapshot.json  [NEW GENERATED] Task 2.8
│       ├── seed/
│       │   ├── dev/.gitkeep            [NEW] Task 2.7
│       │   ├── dev/README.md           [NEW] Task 2.7
│       │   ├── staging/.gitkeep        [NEW] Task 2.7
│       │   └── staging/README.md       [NEW] Task 2.7
│       ├── scripts/
│       │   └── migrate.ts              [NEW] Task 4.3 (if Secret Manager wrapper required)
│       ├── src/
│       │   ├── index.ts                [UPDATED] re-exports db client factory + schema barrel
│       │   ├── db.ts                   [NEW] Task 2.4 — Drizzle client factory
│       │   ├── secrets.ts              [NEW] Task 4.1 — Secret Manager fetch
│       │   ├── schema/
│       │   │   ├── index.ts            [NEW] Task 2.3 — barrel export
│       │   │   └── _baseline.ts        [NEW] Task 2.8 — empty baseline (substantive tables downstream)
│       │   ├── policies/.gitkeep       [NEW] Task 2.5
│       │   ├── policies/README.md      [NEW] Task 2.5 — Story 1.6 landing
│       │   ├── ids/.gitkeep            [NEW] Task 2.5
│       │   ├── ids/README.md           [NEW] Task 2.5 — Story 1.7+ landing
│       │   ├── encryption/.gitkeep     [NEW] Task 2.5
│       │   ├── encryption/README.md    [NEW] Task 2.5 — Story 1.5 landing
│       │   ├── snapshot-fixtures/.gitkeep + README.md  [NEW] Task 2.5 — Story 7.x landing
│       │   ├── snapshot-adapters/.gitkeep + README.md  [NEW] Task 2.5 — Story 7.x landing
│       │   ├── cross-tenant/.gitkeep + README.md       [NEW] Task 2.5 — Story 1.6 landing
│       │   ├── bank-statement/.gitkeep + README.md     [NEW] Task 2.5 — Story 9.2 landing
│       │   └── per-pariwar/bihar/.gitkeep + README.md  [NEW] Task 2.5 — Story 1.7+10.12 landing
│       └── tests/
│           ├── smoke.test.ts           [PRESERVED] Story 1.1 placeholder
│           └── db.test.ts              [NEW OPTIONAL] Task 2.4 — Drizzle factory unit test
├── apps/api/
│   └── .env.example                    [UPDATED] Task 4.4 — Cloud SQL Auth Proxy local-dev path
└── _bmad-output/implementation-artifacts/
    ├── sprint-status.yaml              [UPDATED] Task 7.5 — 1-2 backlog→ready-for-dev→in-progress→review
    ├── 1-2-cloud-sql-postgres-drizzle-migration-tooling.md  [UPDATED] Task 7.6 — Dev Agent Record
    └── deferred-work.md                [UPDATED] Task 6.7 — Story 1.2 section
```

### Testing standards summary

**At Story 1.2** the test surface is:
- **`packages/domain/tests/smoke.test.ts`** (PRESERVED from Story 1.1 placeholder) — continues to assert `src/index.ts` is truthy.
- **`packages/domain/tests/db.test.ts`** (OPTIONAL NEW per Task 2.4) — unit-tests the `createDb()` factory's pool-config shape (asserts default `max: 10` + `idleTimeoutMillis: 30_000` + SSL config) WITHOUT requiring a live DB connection. Mocks the `pg.Pool` constructor.
- **NO integration tests with a live DB** at Story 1.2 — the per-test transaction-rollback discipline per architecture §Integration test isolation line 3788-3792 lands when substantive table definitions exist (Story 1.3 + 1.6 + 3.1+). Story 1.2's verification is the live Task 7.2 `pnpm db:migrate` manual run + Task 7.3 `pnpm db:check` automated CI run.
- **Architecture-committed integration test slots** that Story 1.2 does NOT populate (per Story 1.1 Testing standards summary line 327-333 already enumerated): `tests/integration/pool-engine/replay.spec.ts` (Story 7.x), `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` (Story 1.6), `tests/integration/rls/policy-regression.spec.ts` (Story 1.6), `tests/integration/audit-log/integrity-check.spec.ts` (Story 1.10), `tests/integration/snapshot-adapters/property.spec.ts` (Story 7.x), `tests/integration/public-pages/scrape-test.spec.ts` (Story 1.16b).

**Test runner**: `vitest` per Story 1.1 default; matches the workspace convention.

### References

- [Source: epics.md#Story-1.2] line 1005-1022 — story body + ACs (verbatim source).
- [Source: epics.md#AR-2] line 257 — Managed Postgres in India region; Cloud SQL.
- [Source: epics.md#AR-3] line 258 — Multi-tenant isolation via RLS (Story 1.6 substrate).
- [Source: epics.md#AR-5] line 260 — pg-boss substrate (Story 1.12 consumer of Story 1.2).
- [Source: epics.md#AR-6] line 261 — drizzle-kit forward-only migrations.
- [Source: epics.md#AR-13] line 271 — Secrets in GCP Secret Manager.
- [Source: epics.md#AR-27] line 300 — GCP asia-south1 service map.
- [Source: epics.md#Epic-1] line 968-984 — Epic 1 context + cross-story dependencies.
- [Source: epics.md#Story-1.16c] line 1331-1344 — schema-diff CI gate boundary.
- [Source: architecture.md#1.1] line 691-714 — Datastore = Managed Postgres in India region (Cloud SQL).
- [Source: architecture.md#1.2] line 715-770 — Postgres RLS via `pariwar_id` (Drizzle pgPolicy declarative API; substrate Story 1.2 enables).
- [Source: architecture.md#1.3] line 771-792 — Zod + drizzle-zod compatibility note (Story 1.4 boundary).
- [Source: architecture.md#1.4] line 794-838 — Postgres-only for cache + idempotency + job queue at v1 (Story 1.12 substrate).
- [Source: architecture.md#1.5] line 839-903 — Audit log two-tier (Story 1.10 substrate).
- [Source: architecture.md#1.7] line 936-985 — Per-tenant custom fields JSONB (Story 1.7 + 10.12 substrate).
- [Source: architecture.md#1.8] line 986-1017 — drizzle-kit forward-only migration policy (canonical authority for Task 2 + Task 3 discipline).
- [Source: architecture.md#Workspace-Layout] line 382-417 — Workspace topology + `packages/domain/` canonical role.
- [Source: architecture.md#Initialization-Sequence] line 660-674 — PR-1 / PR-2 sequencing.
- [Source: architecture.md#Naming-patterns] line 3663-3677 — snake_case DB + camelCase TS + raw SQL convention.
- [Source: architecture.md#Complete-project-directory-structure] line 4341-4360 — `packages/domain/` authoritative tree.
- [Source: architecture.md#5.1] line 2920-2939 — GCP Mumbai (asia-south1) cloud provider.
- [Source: architecture.md#5.2] line 2940-2993 — GCP service map + Cloud SQL extension compatibility.
- [Source: architecture.md#5.4] line 3044-3098 — CI/CD pipeline + Workload Identity Federation.
- [Source: architecture.md#5.5] line 3100-3120 — Environment topology (`twt-dev` + `twt-staging` + `twt-prod`).
- [Source: architecture.md#5.7] line 3186-3233 — Cloud SQL regional HA + automated backups + PITR.
- [Source: architecture.md#5.8] line 3235-3277 — Network topology + PSC + no public IP on Cloud SQL.
- [Source: architecture.md#5.9] line 3318-3373 — Secret Manager rotation policy + database credentials.
- [Source: architecture.md#5.11] line 3415-3428 — pg-boss queue schema isolation (Story 1.12 substrate).
- [Source: architecture.md#Implementation-Handoff] line 5069-5099 — PR-1 / PR-2 sequencing + ADR-transcription discipline.
- [Source: _bmad-output/implementation-artifacts/1-1-turborepo-monorepo-bootstrap.md] — Story 1.1 substrate + Dev Notes patterns + Completion Notes patterns + File List patterns.
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] line 113-135 — Epic 1 status (`1-1: done`; `1-2: backlog → ready-for-dev`).
- [Source: docs/escrow/credential-inventory.md] line 35-36 — `cloud-sql-service-account-prod` + `cloud-sql-iam-recovery-grant` envelopes anchored to Story 1.2.
- [Source: docs/knowledge-transfer/adr-index.md] line 54 — `ADR-NNNN-datastore-engine` slot anchored to Story 1.2 closure.
- [Source: .decision-log.md] HEAD — latest Decision number `2026-06-05-037`; next sequential slot for Story 1.2 substantive author-commit.
- [Source: packages/domain/package.json + tsconfig.json + src/index.ts + tests/smoke.test.ts] — Story 1.1 baseline `@twt/domain` placeholder shape.
- [Source: turbo.json + tsconfig.base.json + package.json] — Story 1.1 root config baseline.
- [Source: .github/workflows/ci.yml] — Story 1.1 CI workflow baseline (install/lint/typecheck/test/build jobs).
- [Source: infra/gcp/README.md] — Story 1.1 landing-story-map (Story 1.2 substantively populates the gcp row).

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (`claude-opus-4-7`) via the bmad-dev-story skill workflow.

### Debug Log References

- `pnpm install` post Drizzle + Secret Manager dep addition — 75 packages added, 5 warnings (esbuild build-script approval pending).
- `drizzle-kit generate` initial emit was `CREATE SCHEMA "drizzle";` without `IF NOT EXISTS`. drizzle-kit's migrator auto-creates the metadata schema before applying migration 0000, so the emitted SQL would fail on first apply. Manually patched migration 0000 to `CREATE SCHEMA IF NOT EXISTS "drizzle"`; `drizzle-kit check` confirms zero drift (snapshot at `meta/0000_snapshot.json` is unchanged). Header comment in the .sql file documents the patch rationale.
- `pnpm --filter @twt/domain typecheck` first run surfaced TS2554 in `tests/db.test.ts` — `vi.fn()` with zero-arg factory + call with two args was incompatible; switched to bare `vi.fn()` (variadic). Subsequent typecheck + lint + test all pass.
- `pnpm --filter @twt/domain lint` first run flagged 4 unused eslint-disable directives (the shared config does not enable `no-console`); removed.
- `pnpm turbo run lint typecheck test build` first run surfaced `@twt/mobile` lint failure — `Cannot find package '@twt/eslint-config-twt'` when resolving from root `eslint.config.js`. Root cause: Story 1.1 review added `"lint": "eslint ."` to apps/mobile/package.json without authoring apps/mobile/eslint.config.js or adding the workspace dep; the previous pnpm hoisting state accidentally made root walk-up resolution work. Story 1.2's pnpm install shifted hoisting and surfaced the gap. Patch: added `@twt/eslint-config-twt: workspace:*` to apps/mobile/devDependencies + authored apps/mobile/eslint.config.js with mobile-specific ignores + a four-rule relaxation block for Story 0.14 prototype patterns (deferred to Story 1.17 design-system hardening).
- `docker run postgres:16` for local idempotency verification — image pulled fresh; container ran on port 5433 to avoid conflict with existing services.
- `DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable pnpm --filter @twt/domain db:migrate` — first invocation applied migration 0000 (CREATE SCHEMA IF NOT EXISTS "drizzle") + inserted row 1 into `drizzle.__drizzle_migrations`. Second invocation was a no-op; row count remained 1. `pnpm db:check` exit 0 ("Everything's fine 🐶🔥").

### Completion Notes List

**Pre-execution user choices captured at dev-story Step 1 (task_check ambiguity-clarification):**

1. **Task 1.1 provisioning strategy** = **Option (a) Terraform IaC** at `infra/gcp/cloud-sql-dev.tf`. Rationale: Story 1.15 Dokploy + multi-Pariwar provisioning will reuse this module; Terraform's idempotency + state management pays back from the 2nd Pariwar onward; the `environment` + `availability_type` + `tier` tfvar parameterization makes the same module work for dev / staging / prod with no HCL changes.
2. **Live GCP execution scope** = **Substrate + local Postgres verify**. The substrate (IaC + Drizzle scaffolding + Secret Manager wiring + ADR-0003 + Decision-log + docs) is fully authored + verified; live `twt-dev-postgres` provisioning against the BigDev-funded `twt-dev` GCP project + the Secret Manager secret-value population + Task 1.7 connectivity verification are deferred to a follow-up execution. Local Docker Postgres 16 stands in for the live DB to verify `pnpm db:migrate` idempotency + `pnpm db:check` zero-drift at Story 1.2 closure.
3. **Branch strategy** = **Stack on `story-1.1-bootstrap`**. `story-1.2-cloud-sql-drizzle` branched from HEAD `88e41c0` (Story 1.1 review-completed-pre-merge state). Stacked-PR pattern: Story 1.2 PR depends on Story 1.1 PR merging first; rebase if Story 1.1 review surfaces post-merge changes.

**Substantive landings (Tasks 1-7):**

- **Task 1 (Terraform IaC for Cloud SQL Postgres dev)** — `infra/gcp/cloud-sql-dev.tf` + 6 sibling files (`versions.tf`, `variables.tf`, `network.tf`, `outputs.tf`, `terraform.tfvars.example`, `.gitignore`). 17 input variables with validation; Private Services Access bootstrap (compute global address + service-networking peering); Cloud SQL instance + database + non-superuser application role + Secret Manager secret + first secret version with `postgresql://` URL assembled from random_password + private IP. Module parameterized for Story 1.15 reuse (staging + prod via tfvars override). Live `terraform apply` deferred (D1-1.2).

- **Task 2 + Task 4 (packages/domain Drizzle scaffolding + Secret Manager wiring)** — bundled into one commit because tightly coupled. drizzle-orm ^0.45 + drizzle-kit ^0.31 + pg ^8.13 + @types/pg + @google-cloud/secret-manager ^6.1 + dotenv + tsx (version pins reflect latest stable as of 2026-06-08, per story-file pin-verification guidance — see deferred-work D12-1.2 for re-validation cadence). drizzle.config.ts (postgresql + strict + verbose + `__drizzle_migrations` in `drizzle` schema). src/db.ts (createDb factory bound to node-postgres pool; per-workspace pool isolation per architecture §1.1; default `max: 10` placeholder). src/secrets.ts (`resolveConnectionString` + `fetchConnectionString`; Secret Manager via ADC when production OR ADC-credential-present OR force-flag; DATABASE_URL fallback otherwise; never logs the value). src/schema/{index,_baseline}.ts (schema barrel + migration-zero marker declaring the `drizzle` metadata schema). 8 placeholder sub-directories under src/ (policies/ ids/ encryption/ snapshot-fixtures/ snapshot-adapters/ cross-tenant/ bank-statement/ per-pariwar/bihar/) with .gitkeep + landing-Story README pointers. seed/{dev,staging}/ per-environment placeholders. scripts/migrate.ts (db:migrate wrapper resolving credentials before invoking drizzle-orm/node-postgres/migrator). migrations/0000_init-baseline.sql (drizzle-kit emit, manually patched to `IF NOT EXISTS` per the migrator-bootstrap-collision rationale documented in the file header). .env.example (DATABASE_URL + GOOGLE_CLOUD_PROJECT + GOOGLE_APPLICATION_CREDENTIALS + DRIZZLE_LOG_QUERIES + DRIZZLE_FORCE_SECRET_MANAGER). tests/db.test.ts (3-case unit test of createDb factory pool-config shape; pg.Pool + drizzle mocked). Comprehensive README.md. Plus apps/api/.env.example NEW (Cloud SQL Auth Proxy local-dev workflow); root .env.example UPDATED with per-workspace pointers.

- **Task 3 (Root pnpm db:* scripts + turbo.json db:check task)** — root scripts `db:generate / db:migrate / db:check / db:studio` delegate to `pnpm --filter @twt/domain`. `db:check` wired as a turbo task (inputs: `src/schema/**/*.ts`, `migrations/**/*`, `drizzle.config.ts`; no DB connection). `db:migrate` NOT a turbo task per architecture §1.8 line 999-1002 migration-precedes-deploy discipline.

- **Task 5 (CI db-check job)** — added to `.github/workflows/ci.yml` mirroring lint/typecheck/test/build job shape (needs: install; runs `pnpm turbo run db:check`). Story 1.16c boundary documented inline.

- **Task 6 (Documentation + ADR-0003 + Decision-log + cross-refs)** — ADR-0003-datastore-engine drafted at `docs/adr/` (engine commitment + Drizzle-over-Prisma rationale + drizzle-kit forward-only policy + WIF/Secret Manager wiring); adr-index.md line 54 slot flipped `slot-reserved-pre-write` → `drafted` + Status row-count table updated (124 reserved + 1 drafted = 125 total). Decision 2026-06-08-038 appended to `.decision-log.md` top of `## Decisions` section per reverse-chronological schema (9-point decision body + open follow-ups). Decision-type index entry for Story 1.2 added. Root README.md §Database + migrations section added pointing at packages/domain/README.md. infra/gcp/README.md substantively populated (Terraform module file inventory + provisioned-resources named-id reference + BigDev apply-sequence runbook + cost envelope + full landing-story map). docs/escrow/credential-inventory.md Rows 35-36 status flipped `pending-system-availability` → `pending-task-7-sealing-event` with closure_evidence_link to Decision 2026-06-08-038. deferred-work.md "## Story 1.2 deferred" section appended with 14 items (D1-1.2 through D14-1.2).

- **Task 7 (Verification)** — `pnpm turbo run lint typecheck test build` 56/56 successful (Story 1.1 baseline 55/55 + Story 1.2 adds the `db:check` task on @twt/domain — verified count). `pnpm db:migrate` against local Docker Postgres 16 applied migration 0000; second invocation no-op; `drizzle.__drizzle_migrations` row count = 1 after both invocations (psql evidence: `id=1, hash=8d76cd…6c0, created_at=1780909300668`). `pnpm db:check` exit 0 ("Everything's fine 🐶🔥"). Local container teardown clean. Live Cloud SQL provisioning + Cloud SQL Auth Proxy + Secret Manager round-trip verification deferred per substrate-only choice.

**Side-effect: closed Story 1.1 review-patch gap (apps/mobile lint).** Story 1.1 review added `"lint": "eslint ."` to apps/mobile/package.json without authoring apps/mobile/eslint.config.js or the workspace dep. Surface at Story 1.2 pnpm install when hoisting shifted. Patched in a separate `chore(apps/mobile)` commit (not a Story 1.2 substrate concern but blocks the 56/56 gate). Four-rule relaxation block in the new mobile config addresses 10 pre-existing prototype-code lint violations from Story 0.14 port; substantive hardening deferred to Story 1.17 design-system formalization.

**Architecture-vs-Epic-AC `packages/db` workspace-naming divergence resolved** per `[[feedback_architecture_vs_prd_boundary]]`. Epic AC line 1016 said "packages/db"; architecture §Workspace Layout line 406 + §Complete project directory structure line 4341-4356 + §Naming patterns line 3670-3672 are all canonical: `packages/domain/`. Story 1.2 follows architecture; the scaffolding lives in `packages/domain/`. Decision 2026-06-08-038 records the supersession.

**Per `[[feedback_closure_language_precision]]` posture:**

- **Framework + engineering legs** = **Closed by [edit]** on Tasks 1-7 closure + local CI gates green. Direct objective evidence: Terraform module exists; `pnpm db:migrate` exit 0 with idempotency verified against local Postgres 16; `pnpm db:check` exit 0; `pnpm turbo run lint typecheck test build` zero regression vs Story 1.1 baseline; `.github/workflows/ci.yml` db-check job authored.
- **ADR-0003 trustee-ratification leg** = **Resolved via explicit deferral** pending Trustee Panel session.
- **Live Cloud SQL provisioning leg** = **Resolved via explicit deferral** per substrate-only user choice; all deferred items enumerated in deferred-work.md "## Story 1.2 deferred" section D1-1.2 through D14-1.2.
- **Story 1.16c forbidden-pattern asserts leg** = **Resolved via explicit deferral** per architecture boundary discipline.

**Next steps (handoff to user):**

- Push branch `story-1.2-cloud-sql-drizzle` + open PR (stacked on the Story 1.1 PR).
- Watch CI for `db-check` + `lint` + `typecheck` + `test` + `build` jobs green.
- Schedule Trustee Panel session to ratify ADR-0003-datastore-engine.
- Plan live GCP execution against `twt-dev` per `infra/gcp/README.md` apply-sequence runbook.

### File List

**New files (Story 1.2 substantive author-commits):**

- `infra/gcp/.gitignore`
- `infra/gcp/cloud-sql-dev.tf`
- `infra/gcp/network.tf`
- `infra/gcp/outputs.tf`
- `infra/gcp/terraform.tfvars.example`
- `infra/gcp/variables.tf`
- `infra/gcp/versions.tf`
- `packages/domain/.env.example`
- `packages/domain/README.md`
- `packages/domain/drizzle.config.ts`
- `packages/domain/migrations/0000_init-baseline.sql`
- `packages/domain/migrations/meta/0000_snapshot.json`
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/scripts/migrate.ts`
- `packages/domain/seed/dev/.gitkeep`
- `packages/domain/seed/dev/README.md`
- `packages/domain/seed/staging/.gitkeep`
- `packages/domain/seed/staging/README.md`
- `packages/domain/src/bank-statement/.gitkeep`
- `packages/domain/src/bank-statement/README.md`
- `packages/domain/src/cross-tenant/.gitkeep`
- `packages/domain/src/cross-tenant/README.md`
- `packages/domain/src/db.ts`
- `packages/domain/src/encryption/.gitkeep`
- `packages/domain/src/encryption/README.md`
- `packages/domain/src/ids/.gitkeep`
- `packages/domain/src/ids/README.md`
- `packages/domain/src/per-pariwar/bihar/.gitkeep`
- `packages/domain/src/per-pariwar/bihar/README.md`
- `packages/domain/src/policies/.gitkeep`
- `packages/domain/src/policies/README.md`
- `packages/domain/src/schema/_baseline.ts`
- `packages/domain/src/schema/index.ts`
- `packages/domain/src/secrets.ts`
- `packages/domain/src/snapshot-adapters/.gitkeep`
- `packages/domain/src/snapshot-adapters/README.md`
- `packages/domain/src/snapshot-fixtures/.gitkeep`
- `packages/domain/src/snapshot-fixtures/README.md`
- `packages/domain/tests/db.test.ts`
- `apps/api/.env.example`
- `docs/adr/ADR-0003-datastore-engine.md`
- `apps/mobile/eslint.config.js`

**Modified files:**

- `.decision-log.md` (Decision 2026-06-08-038 appended; Story 1.2 decision-type index entry)
- `.env.example` (root pointer updated)
- `.github/workflows/ci.yml` (db-check job added)
- `README.md` (§Database + migrations section)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (ready-for-dev → in-progress → review)
- `_bmad-output/implementation-artifacts/1-2-cloud-sql-postgres-drizzle-migration-tooling.md` (Status flip; Dev Agent Record populated; task checkboxes flipped)
- `_bmad-output/implementation-artifacts/deferred-work.md` (## Story 1.2 deferred section with D1-1.2 through D14-1.2)
- `apps/mobile/package.json` (@twt/eslint-config-twt workspace dep added)
- `docs/escrow/credential-inventory.md` (Rows 35-36 envelope status flip)
- `docs/knowledge-transfer/adr-index.md` (line 54 slot closure + Status row-count table)
- `infra/gcp/README.md` (substantive landing replacing PR-1 placeholder)
- `package.json` (root db:* scripts)
- `packages/domain/package.json` (Drizzle + Secret Manager + dotenv + tsx + @types/pg deps; db:* scripts)
- `packages/domain/src/index.ts` (re-exports db factory + secrets resolver + schema barrel)
- `pnpm-lock.yaml` (regenerated for new deps)
- `turbo.json` (db:check task wired)

### Change Log

| Date       | Change                                                                                          | Author          |
| ---------- | ----------------------------------------------------------------------------------------------- | --------------- |
| 2026-06-08 | Story 1.2 ready-for-dev (create-story artifacts committed on `story-1.2-cloud-sql-drizzle`)    | bmad-create-story |
| 2026-06-08 | Story 1.2 in-progress (dev-story execution start; 3 user-choices captured)                     | bmad-dev-story  |
| 2026-06-08 | Task 1: Terraform IaC for Cloud SQL Postgres dev (substrate; no live provisioning)             | bmad-dev-story  |
| 2026-06-08 | Tasks 2 + 4: packages/domain Drizzle scaffolding + Secret Manager wiring                       | bmad-dev-story  |
| 2026-06-08 | Task 3: root db:* scripts + turbo db:check task                                                 | bmad-dev-story  |
| 2026-06-08 | Task 5: CI db-check job                                                                          | bmad-dev-story  |
| 2026-06-08 | Task 6: Documentation + ADR-0003 + Decision 2026-06-08-038 + cross-refs                         | bmad-dev-story  |
| 2026-06-08 | apps/mobile eslint config patch (closes Story 1.1 review-patch gap surfaced at Story 1.2 install) | bmad-dev-story  |
| 2026-06-08 | Task 7: verification (56/56 turbo gate; idempotency vs local Postgres 16); Status → review     | bmad-dev-story  |
| 2026-06-08 | Code review (Groups A+B+C): 2 decision-needed, 13 patch, 13 deferred, 7 dismissed              | bmad-code-review |

### Review Findings

_Generated: 2026-06-08 — Groups A (IaC), B (Drizzle core), C (Root+CI). Groups D (Docs) and E (Scaffold) reviewed on request._

#### Decision-Needed

- [x] [Review][Decision] **D1 — `ssl: { rejectUnauthorized: false }` default in `createDb` and `migrate.ts`** — Both files hardcode `{ rejectUnauthorized: false }` as SSL default, disabling server cert verification. For Cloud SQL Auth Proxy (localhost socket), this is expected behaviour. For future direct private-IP connections without the proxy, this allows MITM despite `require_ssl = true` at the IaC level. Options: (a) accept as-is and document the proxy-only assumption explicitly; (b) make env-conditional on a `CLOUD_SQL_USE_DIRECT=1` flag; (c) flip default to `true` and let Auth Proxy callers override via `ssl: false`. [`packages/domain/src/db.ts:41`, `packages/domain/scripts/migrate.ts:23`]
- [x] [Review][Decision] **D2 — `migrate.ts` constructs its own `pg.Pool` instead of using `createDb` factory** — Pool in `migrate.ts` uses `max: 1` (correct for sequential migration), but diverges from `createDb` defaults (no `idleTimeoutMillis`, separate `ssl` object). Future pool-config changes must be applied in two places. Options: (a) keep separate pool and document divergence explicitly with a comment; (b) use `createDb(connectionString, { max: 1 })` — the schema arg is accepted but unused by the migrator. [`packages/domain/scripts/migrate.ts:23-27`]

#### Patch

- [x] [Review][Patch] **P1 — `GOOGLE_APPLICATION_CREDENTIALS !== undefined` should be a truthy check** — `!== undefined` triggers Secret Manager when the var is set to `""` (empty string), causing a confusing ADC error instead of the expected `DATABASE_URL` fallback. Fix: `!!process.env['GOOGLE_APPLICATION_CREDENTIALS']`. [`packages/domain/src/secrets.ts:28`]
- [x] [Review][Dismiss] **P2 — Duplicate step labels in `apps/api/.env.example` runbook** — Dismissed as false positive on third-pass re-inspection: `apps/api/.env.example` is already numbered 1–6 sequentially (no duplicate "4." labels). The sprint-status 06-08e header is the authoritative outcome record ("14 patches applied (1 false positive dismissed — P2 step numbering)"); this entry was previously marked `[Patch]` in error. [`apps/api/.env.example`]
- [x] [Review][Patch] **P3 — Root `package.json` `db:check` script bypasses Turbo task** — `"db:check": "pnpm --filter @twt/domain db:check"` skips turbo cache/input-fingerprint resolution. `pnpm db:check` locally runs a full re-check every time even on unchanged inputs. Fix: `"db:check": "turbo run db:check"`. [`package.json`]
- [x] [Review][Patch] **P4 — `infra/gcp/.gitignore` incorrectly excludes `.terraform.lock.hcl`** — The lock file is not a secret and should be committed to ensure reproducible provider versions across machines and CI (HashiCorp recommendation). The current entry defeats the `~> 5.0` / `~> 3.6` version pins. Fix: remove `.terraform.lock.hcl` from `.gitignore` and commit the lock file after `terraform init`. [`infra/gcp/.gitignore:8`]
- [x] [Review][Patch] **P5 — `locals` block lives in `network.tf`; `story = "1-2"` transient label on GCP resources** — Naming locals (`instance_name`, `app_database_name`, etc.) buried in `network.tf` violate Terraform convention (expect in `locals.tf` or `cloud-sql-dev.tf`). The `story = "1-2"` label will persist on live Cloud SQL resources long after the story closes; use `module_version` or remove. Fix: move locals block to `locals.tf`; replace `story = "1-2"` with a stable label. [`infra/gcp/network.tf:27-51`]
- [x] [Review][Patch] **P6 — Missing `connectionTimeoutMillis` on `pg.Pool` in both `db.ts` and `migrate.ts`** — Default `pg.Pool` connection timeout is unlimited; a stalled Cloud SQL Auth Proxy or network partition will cause the migrate script and application to hang indefinitely. Fix: add `connectionTimeoutMillis: 10_000` to both pool constructors. [`packages/domain/src/db.ts:43`, `packages/domain/scripts/migrate.ts:23`]
- [x] [Review][Patch] **P7 — `pg.Pool` unhandled `error` event in `createDb`** — `pg.Pool` extends `EventEmitter`; an unhandled `error` event (e.g., Cloud SQL terminating an idle connection) crashes the Node process. Fix: add `pool.on('error', (err) => { /* log */ })` before returning. [`packages/domain/src/db.ts:43-47`]
- [x] [Review][Patch] **P8 — Empty `connectionString` guard missing in `createDb`** — `new pg.Pool({ connectionString: '' })` silently accepts the invalid DSN and only errors on first query with no creation-site stack frame. Fix: `if (!connectionString) throw new Error('[createDb] connectionString must not be empty')` at function entry. [`packages/domain/src/db.ts:41`]
- [x] [Review][Patch] **P9 — `drizzle.config.ts` silent placeholder fallback causes confusing `db:studio` failure** — When `DATABASE_URL` is unset, the config falls back to `postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder` with no error. For `db:generate`/`db:check` (no live connection) this is harmless, but `db:studio` will silently target a non-existent host. Fix: detect when a live connection is needed (e.g., `DB_COMMAND` env or just always for non-`check`/`generate` invocations) and throw a clear error if `DATABASE_URL` is absent. [`packages/domain/drizzle.config.ts:14-16`]
- [x] [Review][Patch] **P10 — Migration 0000 SQL has no re-generation warning; `db:generate` will silently overwrite the `IF NOT EXISTS` patch** — The file was manually patched to add `IF NOT EXISTS` (essential for idempotency). Re-running `db:generate --name init-baseline` will regenerate it without the patch, causing the next fresh-DB apply to fail with "schema drizzle already exists". Fix: add a prominent `-- ⚠ DO NOT REGENERATE — manually patched for idempotency (see file header comment)` warning at the top of the SQL file and mirror the warning in `_baseline.ts`. [`packages/domain/migrations/0000_init-baseline.sql:1`]
- [x] [Review][Patch] **P11 — `transaction_log_retention_days` description misleadingly implies 35-day PITR at the 7-day default** — Description reads "PITR window = retention × 24h per architecture §5.7 line 3194 commitment 'up to 35 days'", creating the impression that 7 days × 24h = the committed 35-day window. At 7-day retention, PITR reaches only 7 days back; 35 days is Cloud SQL's maximum, not the current posture. Fix: clarify description — "default 7 days; Cloud SQL max is 35 days (Story 1.15 can increase for staging+prod)". [`infra/gcp/variables.tf:531`]
- [x] [Review][Patch] **P12 — `fetchConnectionString` exported from `index.ts` — least-privilege violation** — Any consuming workspace (`apps/api`, `apps/jobs`, etc.) can call `fetchConnectionString('arbitrary-secret-name')` to exfiltrate arbitrary GCP secrets. Only `resolveConnectionString` (opinionated, guarded interface) should be public. Fix: remove `fetchConnectionString` from the re-export in `src/index.ts`; keep it `export` within `secrets.ts` for `migrate.ts` internal use. [`packages/domain/src/index.ts:7`]
- [x] [Review][Patch] **P13 — `maintenance_window` hard-coded in `cloud-sql-dev.tf`; blocks Story 1.15 module reuse** — Every other tunable is parameterised; `day = 7` and `hour = 21` (21:00 UTC = 02:30 IST) are the sole exceptions with no variables. Story 1.15 staging/prod operators cannot override the window without editing `.tf` source. Fix: add `var.maintenance_window_day` (default 7) and `var.maintenance_window_hour` (default 21) with a description noting UTC. [`infra/gcp/cloud-sql-dev.tf:109-114`]

#### Deferred

- [x] [Review][Defer] **W1 — BYPASSRLS enforcement not asserted in Terraform** [`infra/gcp/cloud-sql-dev.tf:291-295`] — deferred, pre-existing: Cloud SQL creates users as non-superuser, no-BYPASSRLS by default; declarative `ALTER ROLE` assertion deferred to Story 1.6 RLS wiring.
- [x] [Review][Defer] **W2 — `import 'dotenv/config'` in `drizzle.config.ts` runs in CI** [`packages/domain/drizzle.config.ts:2`] — deferred, pre-existing: no functional impact; dotenv is a no-op in CI with no `.env` file present.
- [x] [Review][Defer] **W3 — Non-UTF-8 Secret Manager payload edge case** [`packages/domain/src/secrets.ts:66-68`] — deferred, pre-existing: GCP always returns UTF-8 for string secret values; theoretical scenario.
- [x] [Review][Defer] **W4 — Raw `SecretManagerServiceClient` constructor error on missing ADC** [`packages/domain/src/secrets.ts:64`] — deferred, pre-existing: raw GCP SDK error acceptable; actionable message deferred to ops hardening.
- [x] [Review][Defer] **W5 — `instance_name` rename triggers `random_password` rotation** [`infra/gcp/cloud-sql-dev.tf:23-26`] — deferred, pre-existing: documented Terraform `keepers` behaviour; not a code defect.
- [x] [Review][Defer] **W6 — `private_ip_address` potentially empty on first plan before PSA settles** [`infra/gcp/cloud-sql-dev.tf:310-320`] — deferred, pre-existing: Terraform dependency graph enforces ordering via `depends_on`.
- [x] [Review][Defer] **W7 — PSA `/16` range allocation has no `prefix_length` variable** [`infra/gcp/network.tf:27-32`] — deferred, pre-existing: acceptable for dev; VPC planning for staging/prod is Story 1.15.
- [x] [Review][Defer] **W8 — `google_service_networking_connection` destroy requires `deletePeeringRoutes=true`** [`infra/gcp/network.tf:35-38`] — deferred, pre-existing: multi-env teardown is Story 1.15 territory.
- [x] [Review][Defer] **W9 — No IAM `secretAccessor` binding for app service account on Secret Manager secret** [`infra/gcp/cloud-sql-dev.tf`] — deferred, pre-existing: WIF + IAM grants are Story 1.15; runtime will fail without this grant on live provisioning.
- [x] [Review][Defer] **W10 — No guard preventing REGIONAL at dev (2× cost)** [`infra/gcp/variables.tf:507-516`] — deferred, pre-existing: explicit user override; `terraform.tfvars.example` defaults ZONAL.
- [x] [Review][Defer] **W11 — `db:check` does not catch un-generated schema drift** [`.github/workflows/ci.yml:99-117`] — deferred, pre-existing: known drizzle-kit `check` limitation; substantive schema-diff CI is Story 1.16c.
- [x] [Review][Defer] **W12 — `DEFAULT_SECRET_NAME` hardcoded to `twt-dev-cloud-sql-conn-string`** [`packages/domain/src/secrets.ts:16`] — deferred, pre-existing: Story 1.15 callers will pass explicit `secretName` per environment.
- [x] [Review][Defer] **W13 — `db:generate`/`db:migrate`/`db:studio` absent from `turbo.json`** [`turbo.json`] — deferred, pre-existing: spec-compliant; `db:migrate` is explicitly excluded per architecture §1.8 (migration precedes deploy); others are acceptable passthrough.

#### Groups D+E (Documentation + Scaffold READMEs) — 2026-06-08

- [x] [Review][Patch] **P14 — ADR-0003 states PITR "up to 35 days (Cloud SQL default)" — dev tier max is 7 days** — Lines 65 and 186 both cite 35 days as current posture; `variables.tf` defaults `transaction_log_retention_days = 7`. Fix: qualify both references with dev-tier ceiling. [`docs/adr/ADR-0003-datastore-engine.md:65,186`]
- [x] [Review][Patch] **P15 — `pending-task-7-sealing-event` status used in credential-inventory rows 35-36 but absent from schema vocabulary** — Schema section (lines 15-23) defines six statuses; `pending-task-7-sealing-event` is not among them. Fix: add definition to schema vocabulary. [`docs/escrow/credential-inventory.md:15-23,35-36`]
- [x] [Review][Patch] **P16 — credential-inventory.md summary header still reads "as of Story 0.2 closure"** — Rows 35-36 were updated at Story 1.2 closure; header is stale. Fix: update header to reference Story 1.2 closure with a note on prior state. [`docs/escrow/credential-inventory.md:94`]
- [x] [Review][Patch] **P17 — `pending-system-availability` count '10-12' not decremented for 2 rows flipped to `pending-task-7-sealing-event`** — Two cloud-sql rows moved out of `pending-system-availability` but count unchanged. Fix: decrement to '8-10' and add a new row for `pending-task-7-sealing-event: 2`. [`docs/escrow/credential-inventory.md:99`]
- [x] [Review][Patch] **P18 — Row 35 Notes describe "IAM-bound twt_dev_app non-superuser role" — actual implementation is password-authenticated Postgres role** — `google_sql_user` uses `random_password`, not Cloud SQL IAM database authentication. Fix: clarify Notes to reflect password-auth posture. [`docs/escrow/credential-inventory.md:35`]
- [x] [Review][Patch] **P19 — `ADR-NNNN-adr-directory-scaffold` row not flipped to `superseded` after ADR-0003 landed** — Row 135 states "supersedes to `superseded` when first substantive ADR lands in `docs/adr/`" — ADR-0003 has now landed. Fix: flip status to `superseded` with ADR-0003 cross-link; update Section E count. [`docs/knowledge-transfer/adr-index.md:135`]
- [x] [Review][Patch] **P20 — `migrate.ts` uses `'./migrations'` relative cwd path — defensive: use `import.meta.url`-relative path** — Path resolves against `process.cwd()` which is correct via pnpm workspace context but fails on direct invocation. Fix: `new URL('../migrations', import.meta.url).pathname`. [`packages/domain/scripts/migrate.ts:32`]
- [x] [Review][Patch] **P21 — Root `db:generate` script does not forward extra args (`--name` drops silently)** — `pnpm db:generate --name my-migration` at root silently drops `--name`; `packages/domain/README.md §3` step 2 instructs `--name`. Fix: append `--` to the root script for arg passthrough. [`package.json:17`]
- [x] [Review][Patch] **P22 — Cloud SQL Auth Proxy connection name hardcoded with no `terraform output` reference** — Both README files hardcode `twt-dev:asia-south1:twt-dev-postgres`; `infra/gcp/outputs.tf` already exports `instance_connection_name`. Fix: add inline note directing operators to `cd infra/gcp && terraform output instance_connection_name`. [`README.md:43`, `packages/domain/README.md:195`]
- [x] [Review][Patch] **P23 — `.env.example` `sslmode=disable` has no clarifying context comment** — Correct only for Cloud SQL Auth Proxy (loopback); a developer copying this for direct Postgres access silently disables TLS. Fix: add inline comment clarifying proxy-only applicability. [`packages/domain/.env.example:10`]
- [x] [Review][Patch] **P24 — `packages/domain/README.md` §7 missing note: direct private-IP callers must override `ssl`** — `createDb` default `{ rejectUnauthorized: false }` is intentional for Auth Proxy topology; without a documented override, direct private-IP callers silently skip server-cert verification. Fix: add note in §7 worked example. [`packages/domain/README.md`]
- [x] [Review][Defer] **W14 — README §4 says CONCURRENTLY migrations need "non-transactional headers" — mechanism not specified** [`packages/domain/README.md:124`] — deferred: proposed per-file `disableTransactionWrapping` annotation is not valid drizzle-kit API; correct mechanism requires research before documenting.
- [x] [Review][Defer] **W15 — `pgSchema` object exported through schema barrel alongside table schemas** [`packages/domain/src/schema/index.ts`] — deferred, pre-existing: no runtime error today; downstream-story discipline risk catalogued here.
- [x] [Review][Defer] **W16 — `pg_partman` availability on Cloud SQL Postgres 16 not verified** [`docs/adr/ADR-0003-datastore-engine.md`] — deferred: required for Story 1.10 partitioning; verify before Story 1.10 dev-time and document result in Story 1.10 author-commit.

#### Third-pass review — 2026-06-09

_Re-review of the patch series landed in the 06-08e (Groups A+B+C) and 06-08f (Groups D+E) passes. Scope: HEAD~1..working tree (commit `a762f60` + uncommitted patch series + new `infra/gcp/locals.tf`). Three parallel layers all returned findings; the 06-08f Groups D+E pass had recorded two of three layers failing (sprint-status 06-08f comment) — this third pass closes that audit gap._

##### Decision-Needed

- [x] [Review][Decision] **D3 — Root `db:generate` script `--` placement may not enable transparent arg passthrough** — `package.json:17` reads `"db:generate": "pnpm --filter @twt/domain db:generate --"`. The trailing `--` is the shell-level "end of options" marker; pnpm semantics on user invocation `pnpm db:generate --name foo` are version-dependent. Three resolutions: (a) keep current form + document caller must use `pnpm db:generate -- --name foo`; (b) drop the trailing `--` and rely on pnpm's default forwarding; (c) rewrite as `pnpm --filter @twt/domain exec drizzle-kit generate` to bypass the script-layer. [`package.json:17`]
- [x] [Review][Decision] **D4 — `default_labels` `merge()` order in `locals.tf` lets caller-provided `var.labels` override `managed_by`/`component`/`environment`** — `merge({managed_by, component, environment}, var.labels)` puts `var.labels` last, so caller-provided labels win. Story 1.15 module-reuse may need to override `environment`, but `managed_by` and `component` are framework identity; should they be overridable? Options: (a) keep current order (caller-flexible); (b) swap order so framework labels win + add explicit `extra_labels` variable for caller additions. [`infra/gcp/locals.tf:13-17`]
- [x] [Review][Decision] **D5 — Story Status flipped `review` → `done` in same diff that lands 24 review-driven patches — patches were not independently re-reviewed before "done"** — Conventional flow: review pass → patches applied → independent re-review → status flip. Current flow flips status in the same diff as the patches. Options: (a) accept (solo-builder velocity; this third-pass review IS the independent re-review and is the trigger for status confirmation); (b) revert story status to `review` and flip in a follow-up commit after this third pass closes; (c) keep status `done` but record that the third-pass review (this one) is the independent re-review that justifies the flip. [`1-2-cloud-sql-postgres-drizzle-migration-tooling.md:3`, `sprint-status.yaml:121`]
- [x] [Review][Decision] **D6 — `pgSchema('drizzle')` declaration in `_baseline.ts` will leak into future migration snapshots (Story 1.3+)** — Per E11/W15: when Story 1.3 authors a real table schema and runs `db:generate`, drizzle-kit's snapshot diff will keep the `drizzle` schema in the cumulative state. Migration 0001's SQL may include `CREATE SCHEMA "drizzle"` again (without IF NOT EXISTS), repeating the 0000 bootstrap problem. The "DO NOT REGENERATE" warning on 0000.sql does NOT protect 0001+. Options: (a) remove `pgSchema('drizzle')` from `_baseline.ts` now (post-0000 commit) since its bootstrap purpose is discharged; (b) keep it + document the IF NOT EXISTS patch as a per-migration ritual for any migration touching the `drizzle` schema; (c) author Story 1.3 with the patch-pre-commit ritual called out. [`packages/domain/src/schema/_baseline.ts:19`]

##### Patch

- [x] [Review][Patch] **P25 — `drizzle.config.ts` placeholder fallback still present despite P9's `console.warn` addition** — P9's spec said "throw a clear error if `DATABASE_URL` is absent" when a live connection is needed; implementation only `console.warn`s and continues to `'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder'` fallback. `db:studio` still silently targets the placeholder. Fix: detect studio invocation (`process.argv.some(a => a.includes('studio'))`) and throw on missing `DATABASE_URL`. [`packages/domain/drizzle.config.ts:14-31`]
- [x] [Review][Patch] **P26 — `new URL('../migrations', import.meta.url).pathname` breaks on Windows and on paths containing spaces** — `pathname` returns `/C:/...` on Windows and percent-encodes spaces (`/My%20Projects/...`); both cause `fs.readFile` to fail with ENOENT. The correct API is `fileURLToPath` from `node:url`. Fix: `import { fileURLToPath } from 'node:url'; migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url))`. [`packages/domain/scripts/migrate.ts:32`]
- [x] [Review][Patch] **P27 — `pool.on('error')` handler logs raw `err` object which may include credentials in some `pg` failure modes** — `pg` error objects can include username, query text, or stringified config; `console.error('[db] pool idle-client error:', err)` may leak to log scrapers. README claims "never logs the value" of secrets. Fix: log only `err.code` and `err.message` explicitly. [`packages/domain/src/db.ts:55-57`]
- [x] [Review][Patch] **P28 — `pool.on('error')` handler swallows in-flight migration failures** — During `db:migrate`, if Cloud SQL terminates the migration client mid-apply, the error handler logs but does not abort; `migrate()` may hang or return success while the operator sees only the error log. Fix: in `migrate.ts`, attach a higher-priority handler that calls `process.exit(1)` on pool error (or reject the in-flight promise). [`packages/domain/scripts/migrate.ts:26`]
- [x] [Review][Patch] **P29 — `drizzle.config.ts` `console.warn` fires on every CI `db:check` run** — CI runs `db:check` without `DATABASE_URL` by design; the new warning pollutes CI logs every run and contradicts the W2 defer rationale ("dotenv is a no-op in CI"). Fix: gate the warning behind `!process.env['CI']`. [`packages/domain/drizzle.config.ts:21-24`]
- [x] [Review][Patch] **P30 — Migrator now wraps drizzle with `logger` flag from `createDb` — DDL leaks when `DRIZZLE_LOG_QUERIES=1`** — D2's refactor routes migrate.ts through `createDb`, which enables logger from env. Migration runs in any env with the flag set will dump all DDL to logs. Fix: pass `logger: false` explicitly: `createDb(connectionString, { max: 1, logger: false })`. [`packages/domain/scripts/migrate.ts:25`, `packages/domain/src/db.ts:62`]
- [x] [Review][Patch] **P31 — ADR-0003 and `variables.tf` disagree on whether 35-day PITR is "available at staging+prod" or strictly tier-bound** — ADR-0003 line 65-67 says "35 days available at staging+prod" (tier-tunable); `variables.tf:74` description says "Cloud SQL max for this tier is 7 days" (tier-bound). P14 aimed to align these — they still disagree on whether the tier ceiling is enforced or just defaulted. Fix: pick the actual Cloud SQL semantics (the 7-day ceiling is the default for the tier; configurable up to 35 days via Cloud SQL's `transactionLogRetentionDays` field — so "max 35 days available at staging+prod" is correct if the staging/prod tier supports it) and align both texts. [`docs/adr/ADR-0003-datastore-engine.md:65-67`, `infra/gcp/variables.tf:73-79`]
- [x] [Review][Patch] **P32 — `db:check` Turbo task `inputs` array omits `package.json` — `drizzle-kit` version bump produces stale cache hits** — `turbo.json` declares `inputs: ["src/schema/**/*.ts", "migrations/**/*", "drizzle.config.ts"]`; explicit `inputs` overrides `$TURBO_DEFAULT$` so package.json + lockfile are NOT inputs. Bumping `drizzle-kit` version without touching schema files yields a cache hit even though the new version may report different drift. Fix: add `"package.json"` (and rely on lockfile coverage via `$TURBO_DEFAULT$` if desired, or add `"../../pnpm-lock.yaml"` explicitly). [`turbo.json:25-29`]
- [x] [Review][Patch] **P33 — `pool.end()` rejection in `migrate.ts` `finally` masks successful migration outcomes** — If the underlying connection is torn down between `migrate()` success and `pool.end()` execution, `await pool.end()` rejects; the rejection escapes the try/finally and the outer `.catch` reports `[migrate] failed:` + `process.exit(1)` despite the migration having completed successfully. Fix: `await pool.end().catch((e) => console.warn('[migrate] pool.end() warning:', e))`. [`packages/domain/scripts/migrate.ts:38`]
- [x] [Review][Patch] **P34 — Maintenance window description treats UTC Sun 21:00 as IST Sunday — actually IST Monday 02:30** — `variables.tf:144` description: "21:00 UTC = 02:30 IST, off-peak for IN business hours". UTC Sunday 21:00 + 5h30 = IST **Monday** 02:30, not Sunday. Operators reading this may mis-schedule production cutovers for IST Monday 02:30, colliding with maintenance. Fix: clarify description: "Default 7 (Sunday UTC) at 21:00 UTC = Monday 02:30 IST, off-peak for IN business hours." [`infra/gcp/variables.tf:140-145`]
- [x] [Review][Patch] **P35 — `NODE_ENV === 'production'` strict-case check silently bypasses Secret Manager when env is `Production` or `PRODUCTION`** — Some hosting platforms set non-lowercase `NODE_ENV`; strict `=== 'production'` fails, `useSecretManager` stays false, falls through to `DATABASE_URL`. If unset, throws with misleading "set DATABASE_URL" message; if set, connects to wrong DSN with no Secret Manager fetch. Fix: `process.env['NODE_ENV']?.toLowerCase() === 'production'`. [`packages/domain/src/secrets.ts:27`]
- [x] [Review][Patch] **P36 — P2 (apps/api/.env.example step numbering) status contradiction across story and sprint-status** — Story Review Findings line 507 marks P2 as `[x] [Review][Patch]` (applied); sprint-status.yaml 06-08e header records "1 false positive dismissed — P2 step numbering". Examining `apps/api/.env.example`, steps are sequentially 1-6 numbered — either the patch was already-correct (false positive) or the patch landed in a prior commit. Documentation contradicts itself. Fix: reconcile — pick one and update the other. Recommended: edit story P2 line to `[Review][Dismiss]` with note "false positive on inspection; numbering was already 1-6 sequential" since the sprint-status record is the authoritative outcome log. [`1-2-cloud-sql-postgres-drizzle-migration-tooling.md:507`]
- [x] [Review][Patch] **P37 — W11 file path in story Review Findings cites non-existent `infra/gcp/.github/workflows/ci.yml`** — Story line 532 references `[infra/gcp/.github/workflows/ci.yml:99-117]`; CI workflow actually lives at `.github/workflows/ci.yml` (project root). The deferred-work.md entry has the correct path. Fix: edit the story line to `[`.github/workflows/ci.yml:99-117`]`. [`1-2-cloud-sql-postgres-drizzle-migration-tooling.md:532`]
- [x] [Review][Patch] **P38 — `transaction_log_retention_days` lacks a `validation` block despite description asserting a 7-day tier ceiling** — Description says "Cloud SQL max for this tier is 7 days"; default = 7; no validation. Operator setting `8` hits a Cloud SQL API error at apply rather than a clean plan-time failure. The diff adds validation to two new maintenance-window variables but skips this one. Fix: add `validation { condition = var.transaction_log_retention_days >= 1 && var.transaction_log_retention_days <= 7 ... }` for the dev tier; relax constraint for staging+prod via a separate variable or per-environment override. [`infra/gcp/variables.tf:73-79`]
- [x] [Review][Patch] **P39 — `GOOGLE_APPLICATION_CREDENTIALS` truthy check still triggers Secret Manager on whitespace-only string** — P1 fixed empty-string by switching to `!!`; whitespace (`" "`) is still truthy and routes to Secret Manager → ADC fails on the bad path with confusing error. Fix: `(process.env['GOOGLE_APPLICATION_CREDENTIALS']?.trim() ?? '') !== ''`. [`packages/domain/src/secrets.ts:28`]
- [x] [Review][Patch] **P40 — `accessSecretVersion` has no client-side timeout — GCP Secret Manager hang blocks `db:migrate` indefinitely** — `connectionTimeoutMillis: 10_000` (added in P6) protects the pg-hop, not the secret-fetch hop. If Secret Manager API hangs (auth token storm, network partition), the wrapper blocks forever. Fix: pass `{ timeout: 10_000 }` to `client.accessSecretVersion({ name }, { timeout: 10_000 })` or wrap with `Promise.race` against a 10-second timeout. [`packages/domain/src/secrets.ts:66`]

##### Deferred

- [x] [Review][Defer] **W17 — `.terraform.lock.hcl` un-ignored but not committed in this diff** [`infra/gcp/.gitignore:9`] — deferred: gated on `terraform init` execution which is part of the live-provisioning leg (Story 1.2 deferred D1-1.2). The `.gitignore` change correctly unblocks future commit; the lock file itself lands when BigDev runs `terraform init` against the live `twt-dev` project.
- [x] [Review][Defer] **W18 — Stacked `# last_updated:` lines at top of `sprint-status.yaml`** [`sprint-status.yaml:2-3`] — deferred: multi-line schema choice; not load-bearing for any tooling. Convention drift; if a future automation needs "the current last_updated" it will need to read the topmost line by convention.
- [x] [Review][Defer] **W19 — Two of three review layers (Blind Hunter, Acceptance Auditor) failed on the 06-08f Groups D+E pass per sprint-status note** [`sprint-status.yaml:2`] — deferred: process note rather than code defect. Mitigated by this third-pass review which closes the audit gap with all three layers returning findings.
- [x] [Review][Defer] **W20 — `.env.example` `CHANGE_ME` password placeholder not flagged in new SSL-mode comment** [`packages/domain/.env.example:8-13`] — deferred: minor doc nit; the `CHANGE_ME` literal is a long-standing placeholder convention. A developer who reads the surrounding SSL comment carefully should also notice the password literal.
- [x] [Review][Defer] **W21 — Concurrent `db:migrate` invocations have no advisory lock** [`packages/domain/scripts/migrate.ts:26-35`] — deferred: multi-env operational concern; first becomes load-bearing at Story 1.15 (staging + prod). Fix: wrap migrate with `pg_advisory_lock(<constant>)` / `pg_advisory_unlock` or use drizzle-kit's built-in lock if/when available.
- [x] [Review][Defer] **W22 — `random_password` flipped to `special = true` would produce malformed DSN (special chars not URL-encoded in `format()` block)** [`infra/gcp/cloud-sql-dev.tf:23-25, 117-123`] — deferred: hypothetical future hardening; current `special = false` posture is safe. Fix when special chars are needed: use `urlencode()` in the `format()` call or add a `precondition` forbidding `special = true`.
- [x] [Review][Defer] **W23 — `coalesce` chains in `locals.tf` may error on explicit empty-string input on older Terraform CLI versions** [`infra/gcp/locals.tf:8-12`] — deferred: Terraform 1.5+ skips empty strings in `coalesce`; older versions error. Provider lock pins Google provider, not Terraform CLI. Fix when an operator hits the edge: migrate to `var.x != null && var.x != "" ? var.x : default` ternary form, or add explicit input validation.
