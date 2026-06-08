# ADR-0003: Datastore engine — Cloud SQL Postgres 16 + Drizzle ORM + drizzle-kit forward-only migrations

> **Status:** drafted
> **Date:** 2026-06-08
> **Author:** Solo Builder (BigDev), discharging the architecture §Deferred Decisions L157-159 + adr-index.md line 54 slot at Story 1.2 closure.
> **Ratifying trustees:** _pending Trustee Panel session_
> **Supersedes:** (none)
> **Superseded by:** (none)

## Context

Architecture §1.1 (lines 691-714) commits the **property**: managed Postgres in
India region as the system's single transactional datastore. Architecture
§Deferred Decisions (lines 157-159) parks the **control** — the specific engine
binding + the ORM toolchain — for an ADR at Story 1.2 closure. Per
`[[feedback_architecture_vs_adr_boundary]]`, architecture commits the
property; this ADR records the control mechanism.

Decision-driving conditions:

- **DPDPA residency** per architecture §5.1 line 2920-2939 + AR-27 (epics line 300):
  member PII must remain inside India boundaries. The datastore region is
  GCP `asia-south1` (Mumbai); the engine selection must be DPDPA-compatible
  at the regional binding committed by architecture §5.1.
- **Multi-tenant isolation property** per architecture §1.2 line 715-770:
  `pariwar_id`-keyed RLS via Postgres `pg_policy` is the property; the ORM
  must support declarative `pgPolicy` authoring inside the schema (so the
  policy lives next to the table) for Story 1.6 to land its substantive
  multi-tenant adversarial test.
- **Envelope-encryption column transformer property** per architecture §1.5
  line 1073: PII tiered columns expose `encrypt(tier, plaintext)` +
  `decrypt(tier, ciphertext)` as Drizzle column transformers — Story 1.5
  substrate. The ORM must support type-safe column-level transformers.
- **Forward-only migration property** per architecture §1.8 line 988-997:
  no `--down` reliance; rollback is a new forward migration. The migration
  toolchain must enforce this discipline (or at minimum not normalize a
  backward-migration habit).
- **Migration-precedes-deploy property** per architecture §1.8 line 999-1002:
  schema migrations apply in their own pipeline step before code deploy.
  The toolchain must NOT couple migration execution to build-artifact
  promotion.
- **drizzle-zod compatibility property** per architecture §1.3 line 776-785:
  contract types in `packages/contracts/` must stay assignable from inferred
  Drizzle types (Story 1.4 substrate). The ORM must emit inferrable
  TypeScript types.
- **Per-Pariwar JSONB property** per architecture §1.7 line 936-985 (FR-54):
  per-tenant custom fields use JSONB columns with per-Pariwar JSON Schema
  validators (Stories 1.7 + 10.12 substrate). The ORM must support JSONB
  natively.
- **Pool-Engine native partitioning property** per architecture §1.5 line 842:
  the audit-log hot tier uses Postgres native partitioning on `created_at`
  (daily partition; Story 1.10 substrate). The ORM must support native
  partitioning syntax (or at minimum not obstruct raw-SQL partitioning).
- **Operational simplicity at v1** — managed Postgres minimizes operational
  surface area for the Solo Builder; the architecture explicitly chose
  managed cloud datastore over self-hosted (architecture §1.4 line 794-838
  "Postgres for cache + idempotency + job queue at v1" reflects the
  consolidation discipline).

Decision deadline: Story 1.2 closure (this ADR's drafting trigger).

## Decision

**Engine: Postgres 16, managed via Cloud SQL in GCP `asia-south1`, regional
HA at staging + prod (ZONAL at dev), automated daily backups + PITR up to 35
days (Cloud SQL default), private IP only via Private Services Access (no
public IPv4), `cloudsql.enable_pgaudit` on for defense-in-depth.**

**ORM: Drizzle ORM 0.45+ with drizzle-kit 0.31+ as the migration toolchain.
Forward-only migrations under `packages/domain/migrations/`. `pnpm db:migrate`
is the canonical apply path (root script delegating to `pnpm --filter
@twt/domain db:migrate`); `pnpm db:check` is the per-PR drift-detection CI
gate; `db:push` is FORBIDDEN.**

**Credential management: Workload Identity Federation for CI/CD auth +
GCP Secret Manager for the connection string. No service-account JSON keys
in the repo; no DATABASE_URL in any non-local execution context.**

Load-bearing details:

1. **Postgres 16** — Cloud SQL Postgres supports the architecture's named-extension
   requirements (`pg_trgm`, `pgcrypto`, `pg_partman` for partitioning, pg-boss's
   own schema) per architecture §5.2 line 2976-2980. Postgres 16 is broadly
   stable as of 2026 + matches Cloud SQL's tested-newest minor.
2. **Cloud SQL managed tier** — `db-custom-2-7680` at dev (2 vCPU / 7.5 GB RAM);
   prod tier scales per ops policy + a Category 5 commitment. `availability_type
   = ZONAL` at dev; `REGIONAL` at staging + prod per architecture §5.7 line
   3192-3193. `deletion_protection = true` per architecture §5.8 line 3270.
3. **Drizzle ORM** — chosen over Prisma + Kysely + MikroORM (see Alternatives
   considered). Drizzle exposes a thin SQL-builder pattern that keeps Postgres
   semantics first-class (RLS, partitioning, custom types) while emitting
   idiomatic TypeScript types.
4. **drizzle-kit forward-only migrations** — emits per-migration `.sql` files
   in `packages/domain/migrations/` numbered `NNNN_<name>.sql`; tracks applied
   migrations in the `drizzle.__drizzle_migrations` table; the schema is
   `drizzle` (architecture-canonical separation per the metadata-table /
   operational-table boundary).
5. **Three-step rollout for hot tables** per architecture §1.8 line 1009-1017:
   (a) add nullable column → (b) backfill via pg-boss job (Story 1.12 substrate)
   → (c) add NOT NULL constraint. `CREATE INDEX CONCURRENTLY` for hot tables;
   per-migration lock-time budget metadata documented per-migration where it
   matters.
6. **No `db:migrate` in Turbo task graph** — `db:migrate` is a separate pipeline
   step before `turbo run build` per architecture §1.8 line 999-1002. Only
   `db:check` is wired into `turbo.json` + the `.github/workflows/ci.yml`
   `db-check` job (it's a pure static-analysis pass — no DB connection).
7. **Connection string in GCP Secret Manager** — secret name `twt-${environment}-cloud-sql-conn-string`
   per environment; fetched via Application Default Credentials (`@google-cloud/secret-manager`
   client) in production paths. Local-developer execution falls back to
   `DATABASE_URL` env-var.

## Alternatives considered

- **Prisma** — Rejected. Prisma's declarative schema language (`schema.prisma`)
  is a separate DSL that does not let RLS `pgPolicy` declarations live next
  to the table; Story 1.6's substantive multi-tenant isolation would require
  raw-SQL escape hatches per policy. Prisma's client is heavier (cold-start
  + bundle size) than Drizzle's SQL-builder. Prisma's column-transformer
  support requires schema-level extensions that don't compose cleanly with
  Story 1.5's tiered-encryption pattern. Architecture line 668 explicitly
  named Drizzle's pgPolicy capability as the differentiator; this ADR
  ratifies that direction.
- **Kysely** — Deferred (not rejected). Kysely is a high-quality TypeScript
  SQL builder, but it does NOT manage migrations (no `kysely-kit` equivalent
  to drizzle-kit). At Story 1.2 the migration toolchain is load-bearing;
  pairing Kysely with a separate migration tool (e.g., `node-pg-migrate`)
  doubles the moving parts. If a substantive need emerges to swap Drizzle
  for a thinner builder, the migration history is portable (raw SQL files
  in `packages/domain/migrations/`) so this decision is reversible — see
  Migration/pivot path below.
- **MikroORM** — Rejected. MikroORM's Identity Map + Unit of Work patterns
  add abstraction layers that obscure the Postgres-first semantics the
  architecture commits to (raw SQL access for partitioning, snapshot
  serialization, RLS bypass for cross-tenant ops). Less idiomatic for the
  property set this stack needs.
- **Knex / raw `pg` + node-pg-migrate** — Deferred. Workable but discards the
  TypeScript type-inference property (contract types must stay assignable
  from inferred ORM types per architecture §1.3 line 787-790 — this is a
  Story 1.4 constraint). A bare-pg path forfeits the inference + would force
  Story 1.4 to hand-author every contract type.
- **Self-hosted Postgres on K8s / VM** — Rejected at v1. Operational surface
  area beyond what the Solo Builder can sustain; loses Cloud SQL's automated
  backups + PITR + maintenance. Architecture §5.3 commits "Dokploy v1 → K8s
  at named trigger"; self-hosted Postgres revisits at the same trigger.
- **Cloud SQL for MySQL or AlloyDB** — Rejected. MySQL lacks first-class
  array + JSONB types + native partitioning + RLS. AlloyDB is a Postgres-
  compatible managed service but its operational maturity in `asia-south1`
  is less proven than Cloud SQL standard at v1. Architecture §1.4 line
  794-838 commits Postgres specifically (not Postgres-compatible).

## Consequences

- **Operational** — `pnpm db:migrate` becomes the canonical schema-change
  surface. Local-developer setup requires either a local Docker Postgres or
  the Cloud SQL Auth Proxy (the architecture-documented loopback shim) —
  documented in `packages/domain/README.md` §7. The CI `db-check` job runs
  on every PR per `.github/workflows/ci.yml`. Substantive `db:migrate`
  CI automation depends on `twt-staging` provisioning + WIF binding per
  Story 1.15; until then migrations apply by hand against dev DB.
- **Security** — Cloud SQL has no public IPv4 per architecture §5.8 line 3270;
  ingress is via Private Services Access from the VPC. Cloudflare + edge
  protection (architecture §5.8a, Story 1.13) sit upstream of the API layer,
  not the DB. The application role `twt_${env}_app` has NO `BYPASSRLS`
  attribute; RLS is non-bypassable except through the named cross-tenant
  helper at `packages/domain/src/cross-tenant/` (Story 1.6 substantive).
  Secret Manager + Workload Identity Federation eliminate the long-lived
  service-account JSON key surface per architecture §5.4.
- **Performance** — Drizzle's thin builder emits SQL ~indistinguishable from
  hand-written queries; no per-query reflection / runtime metadata cost.
  Pool sizing is per-workspace (architecture §1.1 line 706-710); production
  ceilings are a Category 5 commitment, not committed by this ADR.
- **Cost** — Cloud SQL dev tier (`db-custom-2-7680` ZONAL) ≈ $45-60 USD/month
  per GCP pricing matrix (verify at provisioning time). Regional HA at
  staging + prod roughly doubles. Per architecture §5.13 cost controls,
  per-Pariwar v1 cloud-infrastructure budget is NOT envelope-bounded in
  Phase-0 reconciliation per Story 0.12 Decision 2026-06-05-028 (no-trigger
  outcome). BigDev provisions `twt-dev-postgres` against a personal-funded
  `twt-dev` GCP project at minimal cost; `twt-staging` + `twt-prod` budget
  is Story 1.15 territory.
- **Failure modes accepted** — (a) `drizzle-kit generate` non-idempotency
  workaround documented in `packages/domain/migrations/0000_init-baseline.sql`
  header comment — drizzle-kit emits `CREATE SCHEMA "drizzle"` without
  `IF NOT EXISTS`, manually patched. (b) Drizzle's API surface is younger
  than Prisma's; major-version bumps may require schema-side adjustments
  (the lockfile + the migration history isolate runtime impact). (c) Cloud
  SQL regional failover requires an explicit failover event; PITR up to 35
  days is the recovery floor.
- **Migration / pivot path** — Reversibility:
  - **Within ORM** — Drizzle major-version bumps: pin to a known-good minor;
    test the new minor in a feature branch; if migration history requires
    re-generation, hand-replay the SQL files in order against a fresh DB to
    verify.
  - **Out of Drizzle** — Migration history is raw SQL files in
    `packages/domain/migrations/*.sql`. A successor ORM consumes the SQL
    files directly; the schema source (`packages/domain/src/schema/*.ts`)
    is rewritten in the new ORM's dialect. The reversal trigger is a
    capability-bar miss (e.g., a load-bearing new feature that the chosen
    ORM cannot accommodate without a workaround that breaks per-Story
    discipline).
  - **Out of Cloud SQL** — The managed datastore swap (e.g., to self-hosted
    on K8s) is gated on the architecture §5.3 K8s migration trigger; this
    ADR is a property of the v1 substrate, not a permanent commitment.

## References

- [Source: architecture.md §1.1] lines 691-714 — Datastore = Managed Postgres in India region (Cloud SQL).
- [Source: architecture.md §1.2] lines 715-770 — RLS via `pariwar_id` + Drizzle `pgPolicy`.
- [Source: architecture.md §1.3] lines 776-790 — Zod + drizzle-zod type-assignability discipline.
- [Source: architecture.md §1.4] lines 794-838 — Postgres for cache + idempotency + job queue.
- [Source: architecture.md §1.5] lines 839-903 — Audit log two-tier + native partitioning.
- [Source: architecture.md §1.6] lines 904-935 — Pool Engine snapshot format.
- [Source: architecture.md §1.7] lines 936-985 — Per-tenant custom fields JSONB.
- [Source: architecture.md §1.8] lines 986-1017 — drizzle-kit forward-only migration policy.
- [Source: architecture.md §Deferred-Decisions] lines 157-159 — ADR-0003 deferral slot.
- [Source: architecture.md §5.1] lines 2920-2939 — GCP asia-south1.
- [Source: architecture.md §5.2] lines 2940-2993 — GCP service map + extension compatibility.
- [Source: architecture.md §5.4] lines 3044-3098 — Workload Identity Federation.
- [Source: architecture.md §5.7] lines 3186-3233 — Cloud SQL regional HA + automated backups + PITR.
- [Source: architecture.md §5.8] lines 3235-3277 — Network topology + PSC + no public IP.
- [Source: architecture.md §5.9] lines 3318-3373 — Secret Manager rotation policy.
- [Source: PRD.md §7] — SM-1 + Phase-0 prereq gates that funnel into Story 1.2.
- [Source: epics.md, Story 1.2] lines 1005-1022 — owning Story.
- [Source: epics.md, Story 1.16c] lines 1331-1344 — schema-diff CI gate boundary.
- [Source: `.decision-log.md`, Decision 2026-06-08-038] — Story 1.2 substantive author-commit (this ADR drafted).
- [Source: `docs/knowledge-transfer/adr-index.md`] line 54 — the live index row for this ADR.
- [Source: `packages/domain/README.md`] — workspace-level documentation for the chosen stack.
- [Source: Drizzle ORM documentation] — https://orm.drizzle.team
- [Source: drizzle-kit documentation] — https://orm.drizzle.team/docs/kit-overview
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor (architecture commits properties; ADRs commit controls).
- Memory: [[feedback_architecture_vs_prd_boundary]] — boundary anchor (workspace naming divergence resolution: `packages/domain/` not `packages/db/`).
- Memory: [[feedback_closure_language_precision]] — closure-language posture for this ADR's lifecycle.

---

## Changelog

| Date       | Status flip                                | Author             | Notes                                                                                  |
| ---------- | ------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| 2026-06-08 | (initial draft)                            | Solo Builder       | Authored at Story 1.2 closure; closes `ADR-NNNN-datastore-engine` slot at adr-index L54 |
| _pending_  | drafted → under-trustee-review             | _pending_          | Presented to Trustee Panel — _pending_                                                 |
| _pending_  | under-trustee-review → ratified            | _pending_          | Ratified at Trustee Panel — _pending_                                                  |
