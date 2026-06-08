# Story 1.2: Cloud SQL Postgres + Drizzle Migration Tooling

Status: ready-for-dev

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

- [ ] **Task 1: Provision Cloud SQL Postgres (dev environment) — IaC scaffold + provisioning execution** (AC: #1)
  - [ ] 1.1 Decide provisioning strategy. Two viable options per architecture §Implementation Handoff (lines 5096-5099 — "Phase-0 / PR-2 documentation deliverables. Committed documentation artifacts (onboarding tour, ADRs, runbooks, escrow docs) are Phase-0 / PR-2 deliverables, not architecture-phase outputs. Architecture commits the artifacts' existence + content shape; writing them is downstream"):
    - **Option (a) Terraform IaC** (Recommended for reproducibility + Story 1.15 Dokploy alignment): `infra/gcp/cloud-sql-dev.tf` declares the Cloud SQL Postgres instance (Postgres 16, asia-south1, single-zone HA at dev, regional HA at staging+prod, daily backups + PITR enabled, private IP via Private Service Connect per architecture §5.8 line 3243-3244 + line 3270). Recommended because the v1-deferred-but-architecture-committed `twt-staging` + `twt-prod` per architecture §5.5 line 3102-3111 will reuse the Terraform module pattern. Terraform v1.7+ + `hashicorp/google` provider ~5.x.
    - **Option (b) `gcloud` runbook** (faster at v1 if Terraform-learning-cost is non-trivial): `infra/gcp/cloud-sql-dev-provisioning.md` documents the `gcloud sql instances create` command sequence + the post-provisioning IAM grants + Secret Manager secret-creation + Private Service Connect attachment. The runbook is executable by hand or via a thin `infra/gcp/provision-dev.sh` wrapper. Switch to Terraform when Story 1.15 (Dokploy auto-deploy + multi-Pariwar provisioning) lands or when 2nd Pariwar provisioning fires (per architecture §5.14 trigger).
    - Document the choice in Completion Notes citing this sub-task. The choice influences Tasks 1.2-1.6 file paths but not the substantive outcome.
  - [ ] 1.2 Author the IaC OR runbook artifact (per 1.1 choice) covering: GCP project = `twt-dev` (per architecture §5.5 line 3103); Cloud SQL instance name = `twt-dev-postgres`; Postgres engine version = 16 (broadly stable as of 2026; Postgres 16 supports all pg-boss / native partitioning / RLS / `pg_trgm` / `pgcrypto` requirements per architecture §5.2 line 2976-2980 narrow-scope extension-compatibility commitment — verify named extensions at adoption time); region = `asia-south1`; tier = `db-custom-2-7680` (2 vCPU / 7.5 GB RAM minimum viable dev tier — operations policy decides prod tier per architecture §1.1 line 706-710 "Pool sizing committed in Category 5 (Infrastructure) with named ceiling per workspace"); availability_type = `ZONAL` at dev (single-zone), `REGIONAL` at staging+prod per architecture §5.7 line 3192-3193; backup_configuration: enabled + start_time off-peak (e.g., `02:00` IST) + point_in_time_recovery_enabled = true + transaction_log_retention_days = 7 (Cloud SQL default + matches PITR-up-to-35-day commitment per architecture §5.7 line 3194); deletion_protection = true; ip_configuration: ipv4_enabled = false (no public IP per architecture §5.8 line 3270 "Cloud SQL has no public IP") + private_network = VPC self_link + require_ssl = true; database_flags: `cloudsql.enable_pgaudit = on` (defense-in-depth for the §1.5 audit-mirror integrity-check job).
  - [ ] 1.3 Provision the actual `twt-dev-postgres` instance. **Substantive provisioning may require BigDev to execute the IaC/runbook against the live GCP project**; if `twt-dev` GCP project does not yet exist, the prerequisite is `gcloud projects create twt-dev` + billing-account linkage + enable the `sqladmin.googleapis.com` + `secretmanager.googleapis.com` + `servicenetworking.googleapis.com` APIs. Document executed commands + provisioning-completion evidence (Cloud SQL instance ID + connection name) in Completion Notes.
  - [ ] 1.4 Create the application database + role. Inside the provisioned instance: `CREATE DATABASE twt_dev;` + `CREATE ROLE twt_dev_app LOGIN PASSWORD '<random-32-byte-base64>';` + `GRANT CONNECT ON DATABASE twt_dev TO twt_dev_app; GRANT USAGE ON SCHEMA public TO twt_dev_app; GRANT CREATE ON SCHEMA public TO twt_dev_app;` (drizzle-kit needs CREATE on public to install the `__drizzle_migrations` metadata table at first migrate). For Story 1.6 RLS preparation, the application role is NOT a superuser — RLS bypass via `BYPASSRLS` is forbidden per architecture §1.2 line 717-725 multi-tenant isolation commitment.
  - [ ] 1.5 Create Secret Manager secret holding the connection string. Secret name = `twt-dev-cloud-sql-conn-string`; secret value = `postgresql://twt_dev_app:<password>@<private-ip>:5432/twt_dev?sslmode=require`. The full resource path is `projects/<twt-dev-project-number>/secrets/twt-dev-cloud-sql-conn-string/versions/latest`. **No secret value transcribed into the repo, including this story file, Completion Notes, the IaC artifacts, or any commit message.** Per architecture §Secret management line 3320-3327: "GCP Secret Manager for all credentials, API keys, signing secrets, KEK references, and webhook signing secrets" + Workload Identity Federation discipline.
  - [ ] 1.6 Wire local-developer access path. Two non-exclusive options: (a) **Cloud SQL Auth Proxy** (recommended for local-dev convenience) — `cloud-sql-proxy --port=5432 twt-dev:asia-south1:twt-dev-postgres` opens a local TCP socket that the Drizzle client connects to. (b) **Direct VPC access via VPN/Tailscale** — heavier setup; defer to Story 1.15 Dokploy auto-deploy work. Document the chosen path in `packages/domain/README.md` + `apps/api/.env.example` referencing the auth-proxy invocation.
  - [ ] 1.7 Verify connectivity end-to-end: `psql "$(gcloud secrets versions access latest --secret=twt-dev-cloud-sql-conn-string --project=twt-dev)" -c "SELECT version();"` returns the Postgres 16 server version banner. Document in Completion Notes.

- [ ] **Task 2: Scaffold `packages/domain/` for Drizzle schema + migration authoring** (AC: #1)
  - [ ] 2.1 Add Drizzle dependencies to `packages/domain/package.json`:
    - `drizzle-orm` ~`^0.36` (latest stable as of 2026-01; supports pgPolicy declarative API per architecture §1.2 line 717-718 "Drizzle's `pgPolicy` declarative API defines policies inside the schema" — confirm before pin; if stable minor moves to 0.37+/0.38+, pin to the matching stable line).
    - `drizzle-kit` ~`^0.27` (CLI for `generate` + `migrate` + `check` + `studio`).
    - `pg` ~`^8.13` + `@types/pg` ~`^8.11` (node-postgres driver; broadly used + ORM-aware transaction adapter per architecture §1.4 line 800).
    - `@google-cloud/secret-manager` ~`^5.6` (for `fetchConnectionString` per Task 4) — declare under `dependencies` (runtime) not `devDependencies`.
    - `dotenv` ~`^16.4` (local-dev only; under `devDependencies`).
    - **No `prisma`, no `kysely`, no `mikro-orm` dependencies — exclusively Drizzle per AR-6 epics line 261**.
  - [ ] 2.2 Create `packages/domain/drizzle.config.ts` (drizzle-kit's canonical config file per drizzle-kit `^0.27` CLI conventions) per the architecture-canonical shape:
    - `dialect: 'postgresql'`
    - `schema: './src/schema/*.ts'` (multi-file schema location per architecture §Complete project directory structure line 4347-4348)
    - `out: './migrations'` (architecture-canonical migrations location per architecture line 4343)
    - `dbCredentials.url`: resolved via `fetchConnectionString('twt-dev-cloud-sql-conn-string')` (Task 4) with local-developer fallback to `DATABASE_URL` env var when `NODE_ENV !== 'production'` AND `GOOGLE_APPLICATION_CREDENTIALS` is unset.
    - `verbose: true` + `strict: true` (drizzle-kit strict mode rejects ambiguous schema diffs; aligned with the architecture's strict-TS posture).
    - `migrations.table: '__drizzle_migrations'` + `migrations.schema: 'drizzle'` (default; explicit for clarity).
  - [ ] 2.3 Create `packages/domain/src/schema/` directory with an `index.ts` barrel exporting downstream-story schema fragments. At Story 1.2 closure the barrel is `export {};` or a marker comment — substantive table definitions land in Story 1.3 (`packages/events`-derived event log + Account State Machine substrate), Story 1.5 (encryption-annotated columns), Story 1.6 (RLS policies + `pariwar_id` first-class), Story 1.7 (Pariwar-Passport), Story 1.10 (audit log hot tier), Story 1.12 (pg-boss `__pgboss` schema isolation), Story 3.1+ (members + lifecycle), Story 4.x (rules), Story 7.x (pools), Story 9.x (reconciliation).
  - [ ] 2.4 Create `packages/domain/src/db.ts` exposing `createDb(connectionString: string): NodePgDatabase<typeof schema>` — the Drizzle client factory. Internals: `new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000, ssl: { rejectUnauthorized: false /* GCP Cloud SQL uses self-signed in dev; staging+prod use Cloud SQL public CA per IaC */ } })` + `drizzle(pool, { schema, logger: process.env['DRIZZLE_LOG_QUERIES'] === '1' })`. **Per-workspace pool isolation principle** per architecture §1.1 line 706-710 — `apps/api/` + `apps/jobs/` import distinct factory invocations so a job-worker spike doesn't starve member-facing requests; document this in `packages/domain/README.md`. **Specific pool sizes are operations policy + Category 5 commitment**, not Story 1.2 scope — default `max: 10` is a placeholder.
  - [ ] 2.5 Create the architecture-committed placeholder sub-directories under `packages/domain/src/` per architecture §Complete project directory structure line 4348-4360, all with `.gitkeep` + brief README pointers naming the landing Story:
    - `src/schema/` — **substantive at Story 1.2** (barrel exports; per-domain `.ts` files land downstream).
    - `src/policies/` — RLS via pgPolicy; Story 1.6 substantive.
    - `src/ids/` — Branded type definitions; Story 1.7+ substantive (first branded ID emerges with Pariwar-Passport).
    - `src/encryption/` — Envelope encryption + blind-index helpers; Story 1.5 substantive.
    - `src/snapshot-fixtures/` + `src/snapshot-adapters/` — Pool Engine snapshot migration; Story 7.x substantive (per architecture §1.6 line 925-934).
    - `src/cross-tenant/` — Named cross-tenant operations helper; Story 1.6 substantive (per architecture §1.2 line 737-740 + line 764-770).
    - `src/bank-statement/` — Normalized statement-row schema; Story 9.2 substantive.
    - `src/per-pariwar/bihar/` — Per-Pariwar JSON Schema; Story 1.7 + Story 10.12 substantive.
    - Each placeholder sub-directory README cites the landing Story.
  - [ ] 2.6 Create `packages/domain/migrations/` directory (architecture-canonical drizzle-kit `out` location per architecture line 4343) — empty at Story 1.2 closure; drizzle-kit populates on first `generate`.
  - [ ] 2.7 Create `packages/domain/seed/dev/` + `packages/domain/seed/staging/` placeholder directories per architecture §Complete project directory structure line 4345-4346 with `.gitkeep` + README pointing to the per-environment seed-data discipline + the architecture §5.5 line 3113-3119 "No production PII in dev / staging" structural commitment.
  - [ ] 2.8 Author the "**migration zero**" baseline. Run `pnpm --filter @twt/domain exec drizzle-kit generate --name init-baseline` after authoring a single empty schema file `packages/domain/src/schema/_baseline.ts` (declares the `drizzle` schema if not implicit). This produces `packages/domain/migrations/0000_init-baseline.sql` + `packages/domain/migrations/meta/_journal.json` + `packages/domain/migrations/meta/0000_snapshot.json`. The migration zero proves the toolchain pipe; substantive table definitions land downstream. Commit the generated files exactly as drizzle-kit emits.
  - [ ] 2.9 Add `packages/domain/package.json` scripts:
    - `"db:generate": "drizzle-kit generate"`
    - `"db:migrate": "drizzle-kit migrate"` (or a thin `tsx scripts/migrate.ts` wrapper if Secret Manager resolution requires Node code — see Task 4)
    - `"db:check": "drizzle-kit check"` (per-PR drift detection per AC-2)
    - `"db:studio": "drizzle-kit studio"` (local-dev table-explorer; gated behind dev env)
    - Adjust the existing `"build"`, `"lint"`, `"typecheck"`, `"test"`, `"dev"` scripts only if Drizzle imports break the existing `tsc -p tsconfig.json` build (they should not).
  - [ ] 2.10 Verify `pnpm --filter @twt/domain db:migrate` applies migration 0000_init-baseline against the dev DB; verify a second invocation is a no-op (idempotency per AC-1 verbatim wording "applies migrations idempotently"); confirm the `drizzle.__drizzle_migrations` row count = 1 via `psql`.
  - [ ] 2.11 Author `packages/domain/README.md` covering: (a) the snake_case-DB / camelCase-TS naming discipline per architecture §Naming patterns line 3663-3677 + the raw-SQL snake_case convention per architecture line 3674-3677 with a worked example; (b) the drizzle-kit forward-only migration policy per architecture §1.8 line 988-997 ("Forward-only. No `--down` reliance. Rollback is a new forward migration that inverts the change"); (c) the per-migration atomicity rule per architecture §1.8 line 1003-1005; (d) the online-migration discipline for hot tables per architecture §1.8 line 1009-1017 ("add nullable column → backfill via pg-boss job → add constraint" pattern + `CREATE INDEX CONCURRENTLY` for hot tables + per-migration lock-time budget metadata); (e) the per-workspace pool isolation principle per architecture §1.1 line 706-710; (f) cross-references to the architecture-canonical placeholder sub-directories per Task 2.5 with landing Story pointers.

- [ ] **Task 3: Root-level `pnpm db:migrate` shortcut + Turborepo wiring boundary** (AC: #1)
  - [ ] 3.1 Add root `package.json` scripts:
    - `"db:migrate": "pnpm --filter @twt/domain db:migrate"` (epic AC-1 verbatim wording — "`pnpm db:migrate` applies migrations idempotently")
    - `"db:generate": "pnpm --filter @twt/domain db:generate"`
    - `"db:check": "pnpm --filter @twt/domain db:check"`
    - `"db:studio": "pnpm --filter @twt/domain db:studio"`
  - [ ] 3.2 **Do NOT add `db:migrate` as a `turbo` task** in `turbo.json`. Rationale per architecture §1.8 line 999-1002: "**Migration phase precedes code deploy.** Schema migrations apply in their own pipeline step; failure stops the pipeline — code is not promoted against an inconsistent schema." `turbo run build` is the code-deploy pipeline; coupling `db:migrate` into the build graph would couple schema migrations to artifact promotion, which the architecture explicitly forbids. The root pnpm script is invoked separately by CI / Dokploy auto-deploy / human operator BEFORE `turbo run build`. Document this rationale in `packages/domain/README.md` (Task 2.11 (b)).
  - [ ] 3.3 **DO add `db:check` as a `turbo` task** in `turbo.json` because drizzle-kit `check` is a per-PR drift-detection CI gate (verifies migrations match schema; no DB connection required) — fits the Turbo pipeline shape. Task definition: `"db:check": { "dependsOn": [], "outputs": [] }`. Wire as a CI job in `.github/workflows/ci.yml` (Task 5).

- [ ] **Task 4: Secret Manager connection-string fetch + local-dev fallback** (AC: #1)
  - [ ] 4.1 Author `packages/domain/src/secrets.ts` exposing `fetchConnectionString(secretName: string): Promise<string>`:
    - Uses `@google-cloud/secret-manager`'s `SecretManagerServiceClient` via Application Default Credentials (ADC) — no service-account JSON key in the repo; ADC resolves via `gcloud auth application-default login` for local-dev + via Workload Identity Federation for CI/CD per architecture §5.4 line 3046-3055.
    - Full resource path: `projects/<project>/secrets/<name>/versions/latest`; `secretName` parameter is just the secret name (`twt-dev-cloud-sql-conn-string`); the project is resolved from `GOOGLE_CLOUD_PROJECT` env var (set by ADC).
    - Returns the secret payload as a UTF-8 string; never logs the value.
  - [ ] 4.2 Local-developer fallback in the drizzle.config + the `db.ts` factory: when `NODE_ENV !== 'production'` AND `GOOGLE_APPLICATION_CREDENTIALS` env is unset AND `DATABASE_URL` env IS set, fall back to reading `DATABASE_URL` directly. Logged warning at first invocation: "Drizzle: local-dev fallback in use; production paths require Secret Manager." Document the fallback contract in `packages/domain/README.md`; cite the architecture §5.4 line 3046-3053 Workload Identity Federation discipline for production paths.
  - [ ] 4.3 Author a thin wrapper `packages/domain/scripts/migrate.ts` that: (a) calls `fetchConnectionString('twt-dev-cloud-sql-conn-string')`; (b) invokes drizzle-kit's programmatic migrate API with the resolved URL. This is the body behind `"db:migrate": "tsx scripts/migrate.ts"` if Secret Manager resolution must happen in Node (drizzle-kit's CLI reads `dbCredentials.url` from `drizzle.config.ts` which CAN be an async function in `drizzle-kit ^0.27`; verify and prefer the config-async-callback path if it works to keep one source of truth — fall back to the wrapper script if not).
  - [ ] 4.4 Update `.env.example` files:
    - Root `.env.example`: appendix line `# For per-workspace DB config see packages/domain/.env.example`.
    - `packages/domain/.env.example` (NEW per Task 4.4): documents `DATABASE_URL=postgresql://twt_dev_app:<password>@127.0.0.1:5432/twt_dev?sslmode=require` (local-dev fallback only; **placeholder; do not commit real password**), `GOOGLE_CLOUD_PROJECT=twt-dev`, `GOOGLE_APPLICATION_CREDENTIALS=<path-to-ADC-json>` (typically left unset locally so ADC discovers via `gcloud auth application-default login`), `DRIZZLE_LOG_QUERIES=0`.
    - `apps/api/.env.example` (UPDATE): cite the Cloud SQL Auth Proxy local-dev path + the `pnpm db:migrate` workflow.
  - [ ] 4.5 Verify the Secret Manager round-trip end-to-end: `pnpm --filter @twt/domain db:migrate` (with `GOOGLE_APPLICATION_CREDENTIALS` unset + ADC active) connects via Secret Manager → fetches conn string → applies migration 0000_init-baseline. Document the verification in Completion Notes.

- [ ] **Task 5: CI wiring for `db:check` per-PR drift detection** (AC: #2)
  - [ ] 5.1 Add a `db-check` job to `.github/workflows/ci.yml` mirroring the existing `lint` + `typecheck` + `test` + `build` job shapes (per Story 1.1 CI workflow). The job: `needs: install`; runs `pnpm turbo run db:check`; concurrency-grouped per the existing key. **No DB connection required** — drizzle-kit `check` is a pure-static-analysis pass over `migrations/meta/*.json` + `src/schema/*.ts`.
  - [ ] 5.2 Document the Story 1.16c boundary explicitly in `packages/domain/README.md` (Task 2.11 cross-reference): Story 1.2 commits the lightweight per-PR `db:check`; **Story 1.16c commits the substantive v1-baseline forbidden-pattern asserts** (no `payout_destinations` table, no `payout_destination*` columns, no `/payout-destinations*` endpoints, no `*PayoutDestination*` Zod schemas) per epic line 1338. The two are complementary CI gates with disjoint responsibilities.
  - [ ] 5.3 Do NOT add a `db:migrate` CI job at Story 1.2. Substantive automated migration-execution-in-CI requires `twt-staging` GCP project + WIF binding + staging Cloud SQL instance + Dokploy auto-deploy orchestration per architecture §5.4 + §5.5 + Story 1.15; the substantive automation is Story 1.15 territory. At Story 1.2 the migration is applied by hand via `pnpm db:migrate` against the dev DB by BigDev (Solo Builder); CI verifies only the static check.

- [ ] **Task 6: Documentation + ADR slot authoring + Decision-log + cross-reference edits** (AC: #1, #2)
  - [ ] 6.1 Update root `README.md` (authored at Story 1.1 Task 7.1) to add a §"Database + migrations" section pointing to `packages/domain/README.md` + the `pnpm db:migrate` workflow + the Cloud SQL Auth Proxy local-dev path.
  - [ ] 6.2 Update `infra/gcp/README.md` (authored at Story 1.1 with the landing-story-map): replace the "PR-1 placeholder" prose for the gcp row with a substantive pointer to the Cloud SQL provisioning artifact (Task 1.2 IaC OR runbook) + the `twt-dev-postgres` instance ID + the Secret Manager secret name.
  - [ ] 6.3 Author **ADR-0003: Datastore engine — Cloud SQL Postgres + Drizzle ORM + drizzle-kit migrations** at `docs/adr/ADR-0003-datastore-engine.md`. Closes the slot `ADR-NNNN-datastore-engine` at `docs/knowledge-transfer/adr-index.md` line 54 (architecture §Deferred Decisions L157-159; expected close trigger = "Story 1.2 Cloud SQL Postgres + drizzle migration tooling closure"). ADR body covers: (a) the engine commitment Postgres 16 + Cloud SQL managed + asia-south1 regional HA + automated backups + PITR (architecture §1.1 + §5.1 + §5.7 transcription); (b) the ORM choice Drizzle over Prisma — rationale per architecture line 668 + line 717-718 + architecture §1.3 line 776-785 drizzle-zod compatibility note + the Drizzle pgPolicy declarative API support that Story 1.6 RLS depends on + the Drizzle column-transformer pattern that Story 1.5 envelope encryption depends on + Prisma's lack of native pgPolicy + Prisma's heavier client + Prisma's slower cold-start (vs Drizzle's lean SQL-builder design); (c) the drizzle-kit migration policy transcription (forward-only + per-Pariwar JSONB migrations per architecture §1.8 + §1.7 line 962); (d) Workload Identity Federation for CI auth + Secret Manager for connection string per architecture §5.4 + §5.9. Status: `drafted` at Story 1.2 commit; flips to `under-trustee-review` post-Story-1.2-review; ratified per Trustee Panel session.
  - [ ] 6.4 Update `docs/knowledge-transfer/adr-index.md`:
    - Row at line 54 `ADR-NNNN-datastore-engine` → `ADR-0003-datastore-engine`; Status `slot-reserved-pre-write` → `drafted` post-Task-6.3 author-commit.
    - Update the Status row-count table at line 19-26 (increment `drafted` and decrement `slot-reserved-pre-write` by 1).
  - [ ] 6.5 Append **Decision 2026-06-XX-XXX** (next sequential number after `037`) to `.decision-log.md` top of "## Decisions" section per reverse-chronological schema, recording:
    - Story 1.2 substantive author-commit: Cloud SQL Postgres + Drizzle + drizzle-kit + Secret Manager wiring.
    - Cloud SQL provisioning strategy choice (Task 1.1 Option (a) Terraform OR Option (b) gcloud runbook).
    - `packages/db` → `packages/domain/` workspace-naming divergence resolution per architecture-vs-epic boundary per `[[feedback_architecture_vs_prd_boundary]]`.
    - ADR-0003-datastore-engine drafted (per Task 6.3) pending Trustee Panel ratification.
    - Cross-Story discharge triggers: Story 1.3 `packages/events` event-log primitive substrate now ready; Story 1.5 encryption-column-transformers ready; Story 1.6 pgPolicy + `pariwar_id` RLS ready; Story 1.10 audit-log hot-tier table ready; Story 1.12 pg-boss schema-isolation ready; Story 1.16c schema-diff CI gate boundary (Story 1.2 commits the integrity primitive; Story 1.16c commits the v1-baseline forbidden-pattern asserts).
    - Per `[[feedback_closure_language_precision]]`: framework + engineering Closed by [edit] on Tasks 1-7 closure + CI green; trustee-ratification leg for ADR-0003 = Resolved via explicit deferral pending Trustee Panel session.
  - [ ] 6.6 Update `docs/escrow/credential-inventory.md` Rows 35-36 (`cloud-sql-service-account-prod` + `cloud-sql-iam-recovery-grant`):
    - Status `pending-system-availability` → `pending-task-7-sealing-event` (the substantive seal event fires when BigDev seals the prod-credential envelope per Story 0.2 Task 7 mechanism; Story 1.2 lands the substrate, the envelope-sealing operation is the trustee-execution-time discharge).
    - Add a `closure_evidence_link` column reference to Decision 2026-06-XX-XXX (per Task 6.5).
    - Update Story 1.2 closure trigger language to acknowledge the substrate-vs-envelope split.
  - [ ] 6.7 Update `_bmad-output/implementation-artifacts/deferred-work.md` "## Story 1.2 deferred" section with any items the dev agent decides to defer (TBD at dev time; expected items include: Terraform vs gcloud-runbook unification post-Story-1.15; `twt-staging` + `twt-prod` Cloud SQL instances per Story 1.15; substantive RLS pgPolicy + `pariwar_id` discipline per Story 1.6; substantive encryption-column-transformer wiring per Story 1.5; substantive pg-boss schema-isolation per Story 1.12; substantive Story 1.16c forbidden-pattern asserts; ADR-0003 trustee ratification).

- [ ] **Task 7: Verification + AC closure + Status flip** (AC: #1, #2)
  - [ ] 7.1 Run `pnpm turbo run lint typecheck test build` — verify zero regressions vs Story 1.1 baseline (55/55 turbo gate green). The added `packages/domain/` Drizzle code adds 1 new typecheck workspace (was already counted; package existed at Story 1.1) + 1 new build task (no-op for migrations) + 1 new test task (smoke + any unit tests on `db.ts` factory). The `db:check` task is NEW (Task 3.3); the count after Story 1.2 is approximately 56-58 turbo tasks (verify exact count).
  - [ ] 7.2 Run `pnpm db:migrate` against the dev DB — verify migration 0000_init-baseline applies cleanly + a second invocation is a no-op (idempotency). Capture `psql` output showing `drizzle.__drizzle_migrations` row count = 1 in Completion Notes.
  - [ ] 7.3 Run `pnpm db:check` — verify zero drift between `packages/domain/src/schema/_baseline.ts` + `migrations/0000_init-baseline.sql` + `migrations/meta/0000_snapshot.json`. Capture in Completion Notes.
  - [ ] 7.4 Push branch (`story-1.2-cloud-sql-drizzle` per Story 1.1 branch-naming convention) + open PR + watch CI run for `db-check` job green + the existing lint/typecheck/test/build jobs green.
  - [ ] 7.5 Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: `development_status[1-2-cloud-sql-postgres-drizzle-migration-tooling]` from `ready-for-dev` → `in-progress` → `review` per Story 1.1 transition pattern (in-progress on dev-story start; review on Task 7.4 PR-open + CI-green).
  - [ ] 7.6 Update Story 1.2 file Status field to `review`; populate Dev Agent Record (Agent Model + Completion Notes List + File List + Review Findings) per Story 1.1 template.

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

_(populated during dev-story execution)_

### Debug Log References

_(populated during dev-story execution)_

### Completion Notes List

_(populated during dev-story execution)_

### File List

_(populated during dev-story execution)_
