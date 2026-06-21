# Gate Inventory

> **Purpose (AI-9):** Institutional memory converted to artifact. One-page map of every enforcement gate: what it is, what triggers it, its current status, and what it depends on. Written at Epic 1 close / Epic 2 pre-kickoff (2026-06-20).
>
> **Update cadence:** Revise when a gate flips status (no-op → enforcing, or deferred → active) or a new gate lands. Cross-link from the story that flips it.

---

## Enforcement Floor Status

| Mechanism | Status |
|---|---|
| GitHub Actions | ⚠️ **Suspended** (account under review since ~1.11). 1.11–1.17 merged via `pnpm ci:local` + pre-push hook (commit 480128e). |
| `pnpm ci:local` | ✅ Active as merge gate. Mirrors all 15 ci.yml gate jobs sequentially (incl. `cadence-check`). Integration jobs need `DATABASE_URL` on `:5433`. |
| Pre-push hook | ✅ Active. `.githooks/pre-push` runs `ci:local` before every push. |
| AI-4 | ✅ Done (ADR-0017 authored, adopting `ci:local` + pre-push as the sanctioned merge gate). ⚠️ Formal trustee ratification of ADR-0017 still pending. |
| AI-5 | ✅ Done — `timeout-minutes` + `cache-dependency-path: pnpm-lock.yaml` applied across **all** ci.yml jobs (not just 1.16x); `tsx` pinned to an exact version in `package.json`. |

---

## Category A — CI Gates: Active and Enforcing on Every PR

| Gate (CI job name) | Story | Script / Turbo task | What it enforces | Status |
|---|---|---|---|---|
| `lint` | 1.1 | `pnpm turbo run lint` | ESLint per-package (cwd-relative globs) | ✅ Active |
| `typecheck` | 1.1 | `pnpm turbo run typecheck` | TypeScript strict across all packages | ✅ Active |
| `test` | 1.1 | `pnpm turbo run test` | Unit test suite | ✅ Active |
| `build` | 1.1 | `pnpm turbo run build` | Full monorepo build | ✅ Active |
| `db-check` | 1.2 | `pnpm db:check` | Drizzle schema + migration health (no drift) | ✅ Active |
| `contracts-check` (OpenAPI generator determinism) | 1.4 | `pnpm contracts:check-openapi-determinism` | `openapi/v1.yaml` byte-identical on every run; generator is deterministic | ✅ Active |
| `crypto-check` (encryption substrate) | 1.5 | `pnpm crypto:check` | KMS + Tink envelope encryption substrate health | ✅ Active |
| `tokens-theme-check` (FM-4 @theme sync) | 1.17 | `pnpm tokens:check-theme-determinism` | `src/theme.css` byte-identical to `renderThemeCss()` output (FM-4 sync gate) | ✅ Active |
| `friction-budget` (UX-DR3) | 1.16a | `pnpm friction:check` / `scripts/friction-budget/check.ts` | Bundle-size YAML ceilings + named-payer ledger. `critical_render_path_ms` is a placeholder until throttled-Lighthouse harness lands (Story 2.5). | ✅ Active (metric facet deferred — see §C) |
| `schema-diff` (FR-100 non-add guard) | 1.16c | `pnpm schema:check` | ZERO payout-destination surface across 4 scan roots (table / column / endpoint / Zod schema). Invariant scan — no `fetch-depth:0`. | ✅ Active and enforcing |
| `microcopy` (UX-DR71 / UX-DR73 / FM-14) | 1.17 | `pnpm microcopy:check` / `scripts/microcopy/check.ts` | Vocabulary register (passbook→Yogdaan Bahi etc.) + tone prohibitions + FM-14 #2 magic-number colors. **Bounded to `apps/admin`** (18 files). Forward-compat hooks wired for member register + numerals. | ✅ Active (bounded — see §C for full-scan re-trigger) |
| `integration-tests` (RLS + multi-tenant + events_log) | 1.6 | `pnpm test:integration` / `apps/api/tests/integration/` | Single-row RLS leak → CI fail; multi-tenant isolation; append-only `events_log` enforcement. Needs `DATABASE_URL` on `:5433`. | ✅ Active via `ci:local` (⚠️ GH Actions suspended) |

---

## Category B — CI Gates: Green-by-Construction, Awaiting Consumer

These gates are installed and passing, but are no-op or partially no-op until a downstream story provides the real consumer.

| Gate | Story | No-op reason | Re-trigger |
|---|---|---|---|
| `pii-scrape` (FR-74 Public-vs-Private matrix gate) | 1.16b | No public renders in CI (`apps/public` is a `tsc` stub). Matrix scaffold is empty. Engine runs but finds zero surfaces → pass. | **Story 2.5 / 11a.2** — `apps/public` Astro shell lands; `tests/integration/public-pages/scrape-test.spec.ts` imports the engine and feeds it real renders. |
| `benefit-mechanism` check (a): rule-record tag scan | 1.16d | ✅ **ENFORCING as of Story 2.3.** The seed `packages/domain/seed/niyamavali-v1-clauses.sql` (3 `pool`-tagged clauses) is wired via `rule_sources.seed_globs`; `extractFromSqlInserts` + `validateRuleRecords` now scan 3 real records (every record `pool`; zero `reserve`). `pnpm benefit:check` green WITH teeth. | ✅ **Resolved at Story 2.3.** |
| `benefit-mechanism` check (c): rule-table schema-column find | 1.16d | ✅ **ENFORCING as of Story 2.3.** `clause_versions` is in the drizzle snapshot (`0014_snapshot.json`) carrying the `benefit_mechanism` NOT-NULL enum column; `scanRuleTableColumns` finds + validates it. | ✅ **Resolved at Story 2.3.** |
| `friction-budget` — `critical_render_path_ms` metric | 1.16a | Placeholder in `friction-budget.yaml` under `deferred_metrics`. No throttled-Lighthouse harness in CI. | **Story 2.5** — Astro shell or design-system surface; add throttled-Lighthouse-CI harness. |
| Per-tag bundle-subsetting CI test (D4-1.4) | 1.4 | No member/admin JS bundle in `pnpm turbo run build` yet. | **Epic 2 / later** — member/admin bundles land with public Astro + member web/native. |
| `tone-review` publish gate — **Type: runtime Fastify pre-handler, NOT a CI lint** (tracked here for consumer-wiring visibility, not as a `pnpm` CI job) | 2.2 | No member-visible-copy publish endpoint exists yet. `apps/api/src/modules/tone-review/` (`requireToneReviewSignoff` + the dedicated `tone_review.*` audit seam) is installed + unit-tested but mounted by **no route**; teeth proven with a stub resolver + fake audit sink (no live DB). | **Story 2.4** — Niyamavali publish mounts `requireToneReviewSignoff` in its `preHandler` chain (supplies the sign-off resolver + the durable persistence Story 2.2 deferred). Future surfaces (News/Blog · T&C · push templates · helpdesk macros) re-trigger in their owning stories. |

**Note on `benefit-mechanism` checks (Story 2.3 update):** Check (b) (enum-definition cross-check, `BenefitMechanism` z.enum === `benefit-mechanism.yaml` `mechanisms`) has had teeth since 1.16d. Checks (a) (rule-record tag scan) and (c) (rule-table schema-column) **flipped from no-op to ENFORCING at Story 2.3** — the `clause_versions` table + the 3-record `pool`-tagged seed landed. **All three checks now have teeth** (the two rows above are retained for the audit trail of the flip).

**Note on the `tone-review` row (Story 2.2):** unlike every other row in this table, this is **not** a `pnpm` CI lint — it is a *runtime* Fastify publish guard (tone review is a human-judgment check that cannot be a static lint; the *automatable* vocabulary/tone/numeral subset is already the Story 1.17 `microcopy` CI gate in Category A). It is listed here because it shares the Category-B lifecycle: installed green-by-construction now, full teeth on consumer wiring (Story 2.4). The human process it enforces is `docs/tone-guide.md` + `docs/tone-review-checklist.md` (Story 2.2). Cross-ref: `_bmad-output/implementation-artifacts/2-2-tone-guide-vocabulary-enforcement-process.md`.

---

## Category C — Forward-Compat Hooks: Wired, Full Teeth on Re-trigger

These items are wired and green; they flip from narrow-scope to full enforcement when the consumer story lands.

| Hook | Story wired | Re-trigger story | What changes at re-trigger |
|---|---|---|---|
| `microcopy` full member-register scan | 1.17 | Story 2.5 | `copy_globs` for member surfaces populated; member-address terms (user/customer/donor) + Devanagari numerals gain teeth. |
| `pii-scrape` live-render integration spec | 1.16b | Story 2.5 / 11a.2 | `tests/integration/public-pages/scrape-test.spec.ts` activated with real render snapshots; tier-leak rules enforced against live HTML. |
| `schema-diff` + `benefit-mechanism` → full teeth at rule-registry | 1.16c/d | ✅ **Story 2.3 (done — ENFORCING)** | ✅ `clause_versions` table + 3 real `pool` records exist; both the benefit-mechanism tag scan (checks a/c) and the schema-diff non-add guard enforce against real data. `pnpm benefit:check` + `pnpm schema:check` green at Story 2.3. |
| TS-literal seed extractor | 1.16d | ✅ **Story 2.3 (closed)** | ✅ **Closed — not needed.** The Story 2.3 seed lands as `.sql` (`packages/domain/seed/niyamavali-v1-clauses.sql`); the existing `extractFromSqlInserts` extractor covers it. No TS-literal extractor required at 2.3 (see deferred-work.md L78). |

---

## Category D — DB-Enforced Invariants (Runtime, Not CI Gates)

These enforce at runtime regardless of CI status.

| Invariant | Story | Mechanism | Status |
|---|---|---|---|
| `events_log` append-only | 1.3 | Postgres trigger: `DELETE` + `UPDATE` raise exception | ✅ Active in all environments with a DB |
| RBAC fail-closed | 1.8 | Permission-key resolution returns `false` on unknown key; no wildcard grant | ✅ Active |
| RLS on all tenant tables | 1.6 | `FORCE ROW LEVEL SECURITY` + `USING (pariwar_id = current_setting('app.pariwar_id')::uuid)` | ✅ Active; adversarial test in CI |
| Turnstile fail-closed | 1.13 | `noopTurnstileVerifier` (always pass) until `TURNSTILE_SECRET_NAME` is set; real verifier fails closed on network error | ✅ Active (noop until secret provisioned — see §E) |

---

## Category E — Operator-Activation Gated (Authored, Not Applied)

Infrastructure is expressed in code / IaC but the `terraform apply` or activation has not been run. These are NOT gaps — they are the deliberate substrate pattern.

| Gate / Capability | Story | What's authored | Gate condition | Notes |
|---|---|---|---|---|
| **Cloudflare zone / WAF / Turnstile live apply** (D1-1.13) | 1.13 | `infra/cloudflare/` full IaC (WAF rules, bot management, ingress, Turnstile secrets) | ⛔ **DPDPA legal review clearance** (ADR-0010 OPEN) + zone/account provisioned | Do NOT assert DPDPA compliance. Decision 2026-06-20-051 keeps this off Epic 2 critical path. |
| Edge-only ingress guard (D2-1.13) | 1.13 | `infra/cloudflare/origin-ingress.tf` + Fastify guard (header secret / tunnel) | ⛔ Gated on D1-1.13 | Dokploy routes traffic directly; edge-auth guard NOT wired at origin. |
| FR-88 member-facing Turnstile widgets (D3-1.13) | 1.13 | `@twt/edge` verifier primitive + admin widget recipe | Story 2.5 / Epic 11a | Mount widget on signup / claim-filing / helpdesk forms when surfaces exist. |
| GCS off-site mirror cron graduation (D2-1.10 / D3-1.11a) | 1.10/1.11a | Mirror job + integrity cron authored in `apps/jobs` | Operator activation | Cron running in `pg-boss` but mirror destination not provisioned. |
| Multi-env KMS (staging/prod key rings) | 1.5 | `infra/gcp/kms.tf` per-env key rings | Operator activation + `terraform apply` per env | Dev KMS is functional; staging/prod rings gated on apply. |
| Image signing | 1.15 | IaC authored | Operator activation | |
| Prod grants (IAM / GCS write) | 1.15 | IaC authored | Operator activation | |

---

## Summary Table: What Enforces TODAY

| Layer | Enforcing now | No-op / awaiting | Operator-gated |
|---|---|---|---|
| **CI (per PR)** | lint · typecheck · test · build · db-check · contracts-check · crypto-check · tokens-theme-check · friction-budget · schema-diff · microcopy (admin) · integration-tests | pii-scrape · benefit-mechanism (a)(c) · bundle-subsetting · friction-budget critical-render | — |
| **DB runtime** | append-only events_log · RBAC fail-closed · RLS | — | — |
| **Infra / edge** | Dokploy deploy pipeline | — | Cloudflare zone (DPDPA-gated) · KMS staging/prod · image signing · prod grants · GCS mirror |
| **CI floor** | ci:local + pre-push | — | GitHub Actions (suspended) |

---

## References

- Stories 1.16a/b/c/d, 1.17 — gate implementation
- ADR-0010 — Cloudflare / DPDPA posture (OPEN)
- Decision 2026-06-20-051 — Epic 2 posture (Cloudflare off critical path)
- `_bmad-output/implementation-artifacts/deferred-work.md` — D1-1.13, D2-1.13, D3-1.13, D2-1.10, D3-1.11a
- Epic 1 retrospective AI-9 — `epic-1-retro-2026-06-20.md`
