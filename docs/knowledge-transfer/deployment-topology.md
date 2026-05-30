# Deployment Topology

A reader's map of the production deployment topology, keyed to the canonical architectural commitments. This document does NOT re-author architectural decisions — it indexes them so an engineer reading the KT pack can find the load-bearing infrastructure picture without paging through the full architecture.md.

Authority: architecture.md §5.1-§5.10 commits the topology; PRD §9.1.1 paragraph 5 commits "deployment topology" as a KT pack component; Story 0.5 Task 4 authors this reader's map. Substantive deployment automation lives in Story 1.1 (Turborepo monorepo bootstrap) + Story 1.15 (Dokploy auto-deploy pipeline) + Story 1.13 (Cloudflare bot management + Turnstile edge protection).

## 1. GCP project topology

Three environments + a dedicated audit-mirror project, per architecture §5.5 (lines 3100-3120):

| Environment | GCP project ID | Purpose | Cross-project IAM separation |
|---|---|---|---|
| Development | `twt-dev` | Day-to-day developer work; synthetic data only | Separate billing where appropriate; CI gate verifies no plaintext prod-shape PII in seed data |
| Staging | `twt-staging` | Pre-prod testing; synthetic data only | Same isolation as dev; promotion gate from `twt-dev` to `twt-staging` per CI |
| Production | `twt-prod` | Live member traffic; production data | Strictest WIF binding (production-release branch + production-deploy workflow file only); promotion gate from `twt-staging` to `twt-prod` requires manual approval ≥ 2 principals |
| Audit mirror | `twt-audit-mirror-prod` | Dedicated project for the audit log mirror chain | Cross-project IAM separating mirror-write from mirror-read per §5.2 + §2.10a Isolation Commitment. **The mirror is NOT in any of the three application-tier projects** — that is the §2.10a load-bearing separation property |
| Dokploy substrate | `twt-dokploy-prod` (isolated) | Dokploy substrate runs here with cross-project deploy permissions | NOT in the prod data project per §5.3 — Dokploy compromise affects the deployment surface, not the data surface |

**Per-Pariwar tenancy at v1:** Single prod environment for TWT-Bihar; per-Pariwar isolation implemented at the application layer (RLS + `pariwar_id` discipline per §5.14). 2nd Pariwar provisioning may add a sibling prod project; decision at trigger time per §5.14 (option set: same prod environment / sibling GCP project / sibling cloud region).

**No production PII in dev / staging** per §5.5 — structural commitment, not discipline. The CI gate (Story 1.16b PII-scrape CI gate) enforces this from day one.

**Schematic diagram** (ASCII):

```
                                      ┌──────────────────────────┐
                                      │   PUBLIC INTERNET        │
                                      │                          │
                                      │   (members, public site, │
                                      │   admin web, partners)   │
                                      └────────┬─────────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────────┐
                              │  CLOUDFLARE EDGE (per §5.8a)       │
                              │  ─ WAF Rules                       │
                              │  ─ Bot Management                  │
                              │  ─ Turnstile (CAPTCHA)             │
                              │  ─ Rate limiting (per §2.11 L1)    │
                              │  ─ Ingress signature verification  │
                              │  (substitutable per pivot in §5.8a)│
                              └────────┬───────────────────────────┘
                                       │ (edge-only ingress default;
                                       │  break-glass bypass per §5.8)
                                       ▼
        ┌──────────────────────────────────────────────────────────────┐
        │                  GCP `asia-south1` (Mumbai)                  │
        │                                                              │
        │  ┌────────────────────────────────────────────────────────┐  │
        │  │  twt-prod project (data + application tier)            │  │
        │  │                                                        │  │
        │  │  ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │  │
        │  │  │ apps/api     │   │ apps/admin   │   │ apps/jobs  │  │  │
        │  │  │ (Fastify)    │   │ (Vite+React) │   │ (pg-boss)  │  │  │
        │  │  └──────┬───────┘   └──────┬───────┘   └─────┬──────┘  │  │
        │  │         │                  │                 │         │  │
        │  │  ┌──────┴──────────────────┴─────────────────┴─────┐   │  │
        │  │  │  VPC (Private Service Connect; no public IPs)   │   │  │
        │  │  └──────────────┬────────────┬─────────────────────┘   │  │
        │  │                 │            │                          │  │
        │  │  ┌──────────────┴┐ ┌─────────┴────────┐ ┌────────────┐ │  │
        │  │  │ Cloud SQL     │ │ Cloud Storage    │ │ Cloud KMS  │ │  │
        │  │  │ Postgres      │ │ (KYC, certs,     │ │ + HSM      │ │  │
        │  │  │ (regional HA  │ │  statements,     │ │ (KEK +     │ │  │
        │  │  │  primary +    │ │  attachments,    │ │  HMAC keys)│ │  │
        │  │  │  standby in   │ │  Pool Engine     │ │            │ │  │
        │  │  │  2 zones)     │ │  snapshots)      │ │            │ │  │
        │  │  └───────────────┘ └──────────────────┘ └────────────┘ │  │
        │  │                                                        │  │
        │  │  Secret Manager · Artifact Registry · IAM             │  │
        │  └────────────────────────────────────────────────────────┘  │
        │                                                              │
        │  ┌────────────────────────────────────────────────────────┐  │
        │  │  twt-audit-mirror-prod project (§2.10a separation)     │  │
        │  │                                                        │  │
        │  │  Cloud Storage (Bucket Lock + Object Retention Lock)   │  │
        │  │   ─ roles/storage.objectCreator only (write surface)   │  │
        │  │   ─ Grafana+Loki in trustee-controlled compute         │  │
        │  │     environment for Auditor + Reports queries          │  │
        │  │                                                        │  │
        │  │  Cross-project IAM: prod cannot read; audit-mirror     │  │
        │  │  service accounts cannot reach prod                    │  │
        │  └────────────────────────────────────────────────────────┘  │
        │                                                              │
        │  ┌────────────────────────────────────────────────────────┐  │
        │  │  twt-dokploy-prod project (isolated substrate)         │  │
        │  │                                                        │  │
        │  │  Dokploy substrate (per §5.3)                         │  │
        │  │   ─ cross-project deploy permissions to twt-prod      │  │
        │  │   ─ Dokploy compromise ≠ data-tier compromise         │  │
        │  └────────────────────────────────────────────────────────┘  │
        │                                                              │
        └──────────────────────────────────────────────────────────────┘

                        ┌─────────────────────────────────┐
                        │ External integrations (egress)  │
                        │  ─ DigiLocker (govt API)        │
                        │  ─ FCM (push)                   │
                        │  ─ APNs (push)                  │
                        │  ─ WhatsApp Business (Meta)     │
                        │  ─ Telegram Bot API             │
                        │  ─ Telephony provider           │
                        │  ─ Partner endpoints (Epic 12)  │
                        │  ─ Bank statement upload        │
                        │ (allowlisted via VPC Service    │
                        │  Controls or equivalent §5.8)   │
                        └─────────────────────────────────┘
```

The diagram is **schematic, not exhaustive** — it captures the load-bearing IAM-isolation boundary (audit-mirror project separation per §2.10a) + the edge-only ingress + the three-environment structure. Specific instance sizes / pool counts / per-Pariwar branding bundles belong in operations policy + capacity-planning ADRs per `docs/knowledge-transfer/adr-index.md`.

## 2. Cloud provider service map

Per architecture §5.2 (lines 2940-2994). The KT pack mirrors the canonical service-to-property mapping; the architecture is the authoritative source.

| Concern | GCP service | Property satisfied |
|---|---|---|
| Datastore | **Cloud SQL Postgres** (`asia-south1`) with regional HA | India PII residency · RLS · managed-in-region |
| Audit log cold tier | **Cloud Storage** with Bucket Lock + Object Retention Lock | Structurally immutable retention · 7-year per FR-47 |
| Audit lifecycle tiering | **Cloud Storage** Nearline → Coldline → Archive transitions | Cost-tier matching access frequency |
| Pool Engine snapshot cold | **Cloud Storage** with Object Retention Lock | Tamper-evident snapshot durability |
| Object storage (KYC, statements, certificates, attachments) | **Cloud Storage** | DPDPA-compliant managed storage |
| Key management (KEK + HMAC keys) | **Cloud KMS** with HSM-backed keys | KEK rotation · HMAC key isolation per §2.7 |
| Secrets storage | **Secret Manager** | Rotation · IAM-scoped access |
| Container registry | **Artifact Registry** in `asia-south1` | Container lifecycle · signed-image discipline per §5.4 |
| IAM | GCP projects for separation | Audit independence + cross-project isolation per §2.10a |
| Push notifications | FCM (+ native APNs per §3.4 final ADR) | Per FR-58C-flagged provider decision; per `adr-index.md` ADR-NNNN-push-provider-final-choice |
| Edge / WAF | Cloudflare front-line (substitutable per §5.8a pivot) | Property bar per §5.8a; per `adr-index.md` ADR-NNNN-channel-provider-selection edge ADR |
| Observability (managed metrics + logs + alerts) | Cloud Monitoring + Cloud Logging | Per §5.6 |
| Observability (tracing) | SaaS — Sentry / Honeycomb / Grafana Cloud Traces | Per §5.6 + `adr-index.md` ADR-NNNN-saas-tracing-crash-provider |
| Job queue | pg-boss on Postgres (no separate queue substrate at v1) | Per §1.4 |

**WORM equivalence note:** Cloud Storage Retention-locked objects are structurally immutable until retention expiry; administrative principals cannot delete or shorten retention during the active retention window. Same regulatory posture as S3 Object Lock Compliance mode (both Cohasset-assessed). Per architecture §5.2 L2959-2966.

**Object Retention Lock misconfiguration prevention** (per §5.2 L2968-2974): Two-person review on any IaC change touching retention policy; CI sanity check that retention values fall within a committed band (≥ 7 years per FR-47, ≤ named upper bound); staging-environment dry-run before prod application.

## 3. Network topology

Per architecture §5.8 + §5.8a (lines 3235-3317):

- **Edge-only ingress (default).** Backend services default to edge-only ingress — traffic arrives via the selected edge / WAF (Cloudflare v1; pivot per §5.8a if legal review finds DPDPA incompatibility). Backend services are NOT directly reachable from the public internet under normal operation.
- **Break-glass bypass.** Time-bounded + audit-logged + rate-limited; activation requires explicit operator action with a stated expiry; every direct-ingress request emits an audit line per Cross-Cutting #2; auto-revert at expiry unless explicitly renewed with re-justification.
- **GCP VPC** for backend services. **Private Service Connect** for Cloud SQL access from compute (no public IP on Cloud SQL).
- **Egress controls.** Named outbound destinations (DigiLocker, FCM, APNs, WhatsApp Business, Telegram, telephony provider, partner endpoints, bank statement upload endpoints) allowlisted via VPC Service Controls or equivalent firewall rules.
- **Internal service-to-service traffic** stays within the VPC; inter-environment traffic crosses VPC peering boundaries with explicit rules.
- **Private Service Connect verification gate** (per §5.8 L3268-3275): post-deploy network-scanning probe verifies Cloud SQL has no public IP, no `0.0.0.0/0` authorized network entries, VPC firewall rules match expected configuration. Gate fails the deploy on any violation. Pattern repeats for any private-by-architecture service.

**Edge / WAF capability bar** (per §5.8a L3279-3317): The selected edge provider must demonstrate rate limiting (per-IP and per-session, configurable per endpoint), bot management + CAPTCHA-style challenge (with configurable response), ingress signature verification (per §3.11 webhook persist+ack), edge-only ingress capability, DPDPA-compatible posture, observable edge metrics (queryable from §5.6 observability stack). The pivot path is named at §5.8a — Cloudflare-dependent sections (§2.1, §2.11, §3.11, §5.8) identify substitution boundaries and avoid irreversible coupling.

## 4. Deployment substrate

Per architecture §5.3 (lines 2995-3043):

- **v1: Dokploy** running in the isolated `twt-dokploy-prod` GCP project with cross-project deploy permissions to `twt-prod`. Version pinning + two-person review on updates + provenance verification + IAM isolation (substrate compromise does NOT compromise data tier).
- **Migration path: Cloud Run OR GKE Autopilot** (chosen at migration trigger). Cloud Run is the lighter option (serverless containers; stateless workspaces); GKE Autopilot is the heavier option (managed K8s; worker pools + persistent connections).
- **Migration trigger:** first of (a) 2nd Pariwar provisioning, (b) sustained ≥70% peak-cycle infra utilization on Dokploy.
- **Dokploy failure fallback for live-cycle continuity** [P1]: if Dokploy fails during Days 12-15 of a live cycle, fallback is direct deployment to Cloud Run (backend services are 12-factor containerized per Step 3 R-4; secrets are abstracted per Step 2 §9.1.1). Documented runbook, not a continuously-warm secondary substrate.

**Per-Pariwar build profile** drives matrix builds per architecture §5.4 + Step 3 R-5. Per-environment artifact promotion: dev → staging → prod via signed manifest + manual approval gate at the staging → prod boundary.

**Workload Identity Federation (WIF)** per §5.4 L3050-3067: CI auth to GCP uses OIDC token exchange; no long-lived service account keys. WIF trust binding is scoped per-environment to repo + branch + workflow file. Prod is the strictest binding (production-release branch + production-deploy workflow file only).

**Container image signing + verification** per §5.4 (Sigstore / Cosign or equivalent at build time + verification at promotion).

**Bank statement parser sandbox** per §5.3 L3024-3031: parsers (csv-parse + future PDF/OCR) ingest potentially-untrusted inputs; execution environment commits isolated environment + parser failure does not propagate to matcher or broader pipeline + resource limits per parser invocation.

## 5. Backup + DR posture

Per architecture §5.7 (lines 3186-3233):

- **Cloud SQL Postgres regional HA:** primary + standby in two zones within `asia-south1`. Automatic failover on zonal failure.
- **Automated daily backups + PITR** up to 35 days (Cloud SQL default).
- **Audit cold tier + Pool Engine snapshots** in Cloud Storage with Object Retention Lock per §5.2 — these survive region-level events as long as Cloud Storage's cross-region resilience for the chosen storage class holds.
- **RTO target:** 4 hours from declared incident to operational restoration.
- **RPO target:** 1 hour of data loss tolerance at the operational tier.
- **DR runbook:** documented restoration procedure per `docs/runbooks/` (when authored — currently `slot-reserved-pre-write` per the Story 0.4 Decision 004 Open Follow-up); periodic restore drill (quarterly per Step 2 NFR).

**Cross-region replica trigger criteria** per §5.7 L3203-3215: cross-region replica activates when ANY of (a) restore drill misses RTO, (b) business recovery window unacceptable per trustee judgment, (c) trust governance requires it. **Exposure value alone does not trigger** — exposure ≠ infrastructure risk. Infrastructure-risk evidence (drill failure, operational signal, governance direction) does.

**DR runbook accessibility** per §5.7 L3217-3225: the DR runbook is a *separate durability surface* from the system it covers — PDF / printed copies held by trustees (credential-escrow envelope per Story 0.2 + §9.1.1 + `docs/escrow/credential-inventory.md` `dr-runbook-pdf-custody` row); mirrored to a non-GCP location (a GCP-region outage does not render the runbook inaccessible); read access independent of the prod environment's IAM. **Discoverable during incident; usable when the system it covers is down.**

## 6. Per-Pariwar tenancy

Per architecture §5.14 (lines 3517-3557):

- **v1 commitment:** Single prod environment for TWT-Bihar; per-Pariwar isolation implemented at the **application layer** (RLS + `pariwar_id` discipline per §1.2) rather than at the infrastructure layer.
- **Architectural property** committed: per-Pariwar isolation can be tightened from shared-prod to sibling-project to sibling-region **without code rewrites** — the `pariwar_id` discipline + branding bundles + per-Pariwar build profile already support this.
- **2nd-Pariwar provisioning option set** (decided at trigger time):
  - **Option A:** Same prod environment, application-layer isolation only.
  - **Option B:** Sibling GCP project per Pariwar — separate IAM, separate billing, separate VPC.
  - **Option C:** Sibling cloud region per Pariwar — geographic isolation; supports per-Pariwar India regional preference + DR posture per Pariwar.
- **Per-Pariwar infrastructure isolation trigger criteria** (in addition to 2nd-Pariwar provisioning + sustained scale + named trustee decision): regulatory requirement for infrastructure-level separation (banking-sector regulations for a future Bank Parivar; sector-specific compliance for Public Servants Parivar; or other jurisdictional rules prohibiting cross-tenant data colocation at infrastructure layer).
- **Cross-Pariwar audit governance:** each Pariwar has its own Auditor scope (per-Pariwar RBAC); a cross-Pariwar audit role requires explicit grants per Pariwar's trustee approval. **No automatic cross-Pariwar audit visibility.**
- **Per-module infrastructure isolation:** modules introducing materially different regulatory obligations (payment-gateway flows, donor-side compliance regimes, sector-specific licensing) may require independent infrastructure boundaries.

## 7. Workspace layout (high-level)

Per architecture §Workspace Layout (lines 4131-4439). High-level only — the canonical map is in architecture.md.

```
twt/                                  # Turborepo monorepo root
├── apps/
│   ├── api/                          # Fastify HTTP API
│   ├── admin/                        # Vite + React + Tailwind + Radix
│   ├── public/                       # Astro 6 SSR public website
│   ├── mobile/                       # Expo + Tamagui native (per Story 0.14 ratify)
│   └── jobs/                         # pg-boss workers
├── packages/
│   ├── tokens/                       # Design tokens (per-Pariwar overlays)
│   ├── i18n/                         # Centralized locale + formatting
│   ├── domain/                       # Drizzle schema + RLS + branded IDs
│   ├── contracts/                    # Transport Zod schemas
│   ├── api-client/                   # Generated client
│   ├── platform-adapters/            # Substrate-agnostic primitives
│   ├── ui/                           # Composed shared UI
│   ├── bank-parsers/                 # Per-Pariwar bank statement parsers
│   ├── events/                       # Immutable event contracts
│   └── eslint-config-twt/            # Consolidated ESLint rules
├── infra/
│   ├── cloudflare/                   # WAF, Bot Management, Turnstile config
│   ├── gcp/                          # Cloud SQL, Cloud Storage, KMS, etc.
│   └── dokploy/                      # Dokploy deployment config (isolated project)
├── docs/
│   ├── adr/                          # Architecture Decision Records
│   ├── runbooks/                     # Operational sequences (Story 0.1)
│   ├── escrow/                       # Credential + code escrow (Stories 0.2 + 0.3)
│   ├── degradation-policy/           # Per-surface degradation (Story 0.4)
│   ├── knowledge-transfer/           # KT pack (Story 0.5 — THIS DIRECTORY)
│   └── architecture/evolution/       # Split triggers, ownership, migration
├── openapi/                          # Generated spec
├── tests/                            # Integration + e2e
└── .github/workflows/                # CI/CD pipelines
```

## 8. Cross-link index — where to find canonical detail

Every section of this document is a *reader's map* keyed to architecture canonical sources. Use this index to jump to the canonical detail when implementing or making operational decisions:

| Section | Canonical architecture source |
|---|---|
| §1 GCP project topology | architecture.md §5.5 (lines 3100-3120) + §5.14 (lines 3517-3557) + §2.10a (lines 1676-1699) |
| §2 Cloud provider service map | architecture.md §5.2 (lines 2940-2994) |
| §3 Network topology | architecture.md §5.8 (lines 3235-3277) + §5.8a (lines 3279-3317) |
| §4 Deployment substrate | architecture.md §5.3 (lines 2995-3043) + §5.4 (lines 3044-3099) |
| §5 Backup + DR posture | architecture.md §5.7 (lines 3186-3233) |
| §6 Per-Pariwar tenancy | architecture.md §5.14 (lines 3517-3557) |
| §7 Workspace layout | architecture.md §Workspace Layout (lines 4131-4439) |

**Operational runbooks** that operationalize this topology live in `docs/runbooks/` (Story 0.1 + future authoring):

- `deploy.md` — Dokploy deploy procedure (per §5.3 + §5.4)
- `rollback.md` — forward-only rollback per §1.8
- `secret-rotation.md` — KEK + HMAC + service-account rotation per §5.9
- `audit-log-integrity-verification.md` — hash-chain integrity per §1.5
- `reconciliation-manual-intervention.md` — matcher manual triage per §3.6
- `rbac-seed-reset.md` — RBAC permission-keys reset per §2.6
- `multi-pariwar-provisioning.md` — per-Pariwar isolation per §5.14
- DR runbook — `slot-reserved-pre-write` per `adr-index.md` ADR-NNNN-dr-runbook-authoring-scope

**On-call playbook** (the meta-playbook that routes incidents to runbooks + ADRs + escalation paths) lives at `docs/knowledge-transfer/on-call-playbook.md` per Story 0.5 Task 5.

## Structural property — what the topology document MUST NOT carry

1. **No operational secrets.** Secrets live in `docs/escrow/` per Story 0.2; this document cross-references envelope names, never inlines secret values.
2. **No substantive deployment automation.** Automation lives in `.github/workflows/` + `infra/dokploy/` per Story 1.15 + Story 1.1; this document is descriptive, not procedural.
3. **No per-Pariwar branding configuration.** Configuration lives in `packages/tokens/per-pariwar/` per architecture §Workspace Layout.
4. **No PII / member data.** The topology is non-load-bearing for confidentiality but the structural invariant prevents accidental drift.
5. **No substantive ADR content.** Substantive ADRs live in `docs/adr/` post-PR-2 per architecture §Implementation Handoff; this document cross-references the deferred slots in `docs/knowledge-transfer/adr-index.md`.
6. **No specific instance sizes / pool counts / NFR thresholds.** Those belong in operations policy + capacity-planning ADRs per `adr-index.md` Section A.

## References

- [Source: `_bmad-output/planning-artifacts/architecture.md`, §5.1-§5.10 (lines 2920-3414)] — full topology canonical commitments
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §5.14 (lines 3517-3557)] — per-Pariwar tenancy + 2nd-Pariwar option set
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §Workspace Layout (lines 4131-4439)] — workspace structure canonical commitment
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §2.10a (lines 1676-1699)] — Isolation Commitment for audit independence
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §1.2 (lines 715-770)] — RLS + `pariwar_id` discipline (per-Pariwar application-layer isolation)
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §Implementation Handoff (lines 5069-5096)] — substantive ADR drafting is PR-2 / implementation-time work
- [Source: `docs/runbooks/`] — operational sequences that operationalize this topology (Story 0.1 + future)
- [Source: `docs/escrow/credential-inventory.md`, `dr-runbook-pdf-custody` row] — DR runbook custodial path
- [Source: `docs/knowledge-transfer/README.md`] — KT pack structural invariants
- [Source: `docs/knowledge-transfer/adr-index.md`] — deferred-ADR slot cross-references
- [Source: `docs/knowledge-transfer/on-call-playbook.md`] — meta-playbook routing incidents
- Memory: [[feedback_architecture_vs_adr_boundary]] — architecture commits properties; ADRs commit cloud controls
- Memory: [[feedback_closure_language_precision]] — reader's map ≠ canonical source
