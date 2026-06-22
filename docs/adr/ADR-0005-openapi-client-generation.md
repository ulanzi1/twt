# ADR-0005: OpenAPI client-generation tool — `@hey-api/openapi-ts` primary, Orval secondary

> **Status:** ratified
> **Date:** 2026-06-21 (date entered current status)
> **Author:** Solo Builder (BigDev), discharging architecture §3.1 line 1812 + §5.15 deferred decision row L3585 + `docs/knowledge-transfer/adr-index.md` Section B row 12 at Story 1.4 closure.
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-06-21 (light-touch path, as flagged at authoring; discharges the Decision 2026-06-09-040 deferred-ratification commitment); logged in `.decision-log.md` Decision 2026-06-21-059; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-06-21.md`
> **Supersedes:** (none)
> **Superseded by:** (none)

## Context

Architecture §3.1 line 1791-1814 commits the **property**: REST + OpenAPI 3.1 spec generated from Zod schemas in `packages/contracts/`. The spec drives three downstream consumer surfaces:

1. **Runtime validation in `apps/api/`** via `fastify-type-provider-zod` — Fastify routes declare `schema: { body: ZodSchema, response: { 200: ZodSchema } }` and Fastify enforces validation at the request boundary. (Story 1.9+ when `apps/api/` substantively populates.)
2. **OpenAPI documentation in `apps/api/`** via `fastify-zod-openapi` + `@fastify/swagger` — runtime extraction of the spec from the registered Fastify routes. (Story 1.9+.)
3. **TypeScript client generation in `packages/api-client/`** — transforms `openapi/v1.yaml` into TS modules consumed by `apps/mobile/`, `apps/admin/`, `apps/public/`. The **client-generation tool** is the deferred decision this ADR closes.

The architecture commits the **property** (Zod-first + per-tag subsetting + TanStack Query hooks + Zod runtime validators downstream). This ADR records the **control** — the specific tool that produces the generated client + the secondary fallback if the primary hits a deal-breaker per `[[feedback_architecture_vs_adr_boundary]]`.

### Architectural constraints that bound the choice

- **§4.11.1 line 2791-2794 per-tag bundle subsetting.** "The OpenAPI client-generation tool (Category 3 §3.1) must produce per-tag (or per-namespace) client modules so each app imports only the surface it consumes. CI test asserts no admin-only operations land in the mobile bundle; no member-only operations in the admin bundle."
- **§4.2 line 2487 TanStack Query hook generation.** "Query hooks generated from OpenAPI / Zod contracts via the OpenAPI client tool — Category 3 §3.1; specific tool in ADR."
- **§Naming patterns line 3719-3723 + Top-10 anti-pattern #2 type-shadowing prohibition.** Hand-written `dto.ts` / `*.types.ts` files that redeclare what `packages/contracts/` already defines are forbidden. The generated client must consume Zod schemas from `packages/contracts/` (or wire types derived from them) — not re-derive them.
- **§Generated artifacts excluded from PR review surface (line 4001-4005).** Bot-owned CODEOWNERS path + `.gitattributes linguist-generated=true` mark generated paths. The tool's output lives at `packages/api-client/dist/` (or equivalent generated tree).

## Decision

**Adopt `@hey-api/openapi-ts` ^v0.50+ as the primary client-generation tool. Keep Orval warm as the secondary fallback if real-usage at Story 1.9+ surfaces a deal-breaker.**

### Tool comparison grid (registry state as of 2026-Q1)

| Tool | TS-first | Per-tag subsetting | TanStack Query | Zod runtime | Maintenance | Disposition |
|---|---|---|---|---|---|---|
| `@hey-api/openapi-ts` | ✅ Native | ✅ `@hey-api/sdk` plugin | ✅ `@hey-api/openapi-ts-tanstack-query` plugin | ✅ `@hey-api/openapi-ts-zod` plugin | Very active (v0.50+ stabilized; 100k+ npm weekly DLs) | **Primary** |
| `Orval` | ✅ Native | ✅ Configurable | ✅ Native TanStack Query / SWR / Vue Query / Angular Query | ✅ via `runtimeValidation: 'zod'` | Active; mature | **Secondary (kept warm)** |
| `openapi-typescript` | ✅ Types-only | ✅ via `--per-tag` flag | ❌ No client | ❌ Types only | Very active | NOT chosen — types-only forces hand-rolling fetch + query hooks across 3 apps; net friction higher |
| `openapi-typescript-codegen` | ⚠ Older | ⚠ Limited | ❌ No native | ❌ No | Deprecated as of 2024 | NOT chosen — Phase-0 dep-pin discipline prohibits adopting deprecated tools |
| `Kubb` | ✅ Native | ✅ Plugin-based | ✅ Plugin | ✅ Plugin | Active; smaller ecosystem | NOT chosen at v1 — smaller battle-test surface in India-region; revisit at v2 cycle if hey-api / Orval don't fit |

### Primary choice rationale — `@hey-api/openapi-ts`

- **TypeScript-first**: matches `packages/contracts/` Zod-first source-of-truth posture; no runtime config / no codegen at app start.
- **Per-plugin architecture** (`@hey-api/sdk` for clients + `@hey-api/openapi-ts-tanstack-query` for query hooks + `@hey-api/openapi-ts-zod` for runtime validators) maps cleanly to the architecture's three consumer surfaces.
- **Per-tag subsetting** via `@hey-api/sdk` plugin satisfies architecture §4.11.1 (`apps/mobile/` imports only member-tagged operations; `apps/admin/` imports only admin-tagged operations).
- **TanStack Query plugin** generates `useQuery` / `useMutation` hooks bound to per-Pariwar query keys (matches §4.2 universal-server-state-layer commitment).
- **Zod runtime validator plugin** emits validators downstream of the server — defense-in-depth at the frontend if a server response drifts from the spec.
- **Maintenance**: v0.50+ stabilized API surface; >100k npm weekly downloads as of 2026-Q1; MIT license; actively maintained upstream (cross-checked Q1 release cadence + open-issue triage velocity).

### Secondary (kept warm) — Orval

Orval is the long-mature alternative. TypeScript-first; native TanStack Query (+ SWR + Vue Query + Angular Query); per-tag subsetting via Orval's per-path-template config; native Zod via `runtimeValidation: 'zod'`. Held as the immediate fallback if `@hey-api/openapi-ts` at Story 1.9+ real-usage surfaces a deal-breaker. The supersession path is per the architecture's ADR-supersession discipline: this ADR retires; `ADR-NNNN-openapi-client-generation-revised` records the bind to Orval + the trigger event.

### Not-chosen rationale

- **`openapi-typescript`** — types-only. Would force hand-rolling fetch logic + query hooks across 3 apps; net friction higher than the savings from a smaller dependency surface.
- **`openapi-typescript-codegen`** — deprecated upstream as of 2024; committed Phase-0 discipline of not adopting deprecated tools (Story 1.2 D12-1.2 dep-pin precedent).
- **`Kubb`** — newer; smaller battle-test surface in India-region production deployments; revisit at v2 cycle if hey-api / Orval don't fit Story 1.9+ real-usage validation.

## Consequences

1. **`packages/api-client/` is the generated workspace.** Architecture §Project Structure line 4379-4380 commits the workspace; Story 1.4 does NOT substantively populate it — Story 1.9+ wires the first generator invocation when `apps/api/` substantively populates routes.
2. **Generated paths are bot-owned + linguist-collapsed.** CODEOWNERS gens-owner per architecture §Enforcement line 4001-4005 (`packages/api-client/dist/*` → `@<bot-identity>`); `.gitattributes` `linguist-generated=true` collapses the generated tree in PR review diffs.
3. **`pnpm api-client:generate` root-level script** delegating via `pnpm --filter @twt/api-client generate` — substantively wired at Story 1.9.
4. **Per-tag bundle-subsetting CI test** lives at Story 1.16a friction-budget CI gate territory per architecture §4.11.1 line 2793-2794 (`apps/admin/` MUST NOT import `packages/api-client/dist/admin-only-tag/*` into mobile bundle + vice versa). The substantive test lands at Story 1.16a; Story 1.4 commits the structural posture that makes the test possible.
5. **Revisit cadence.** Story 1.9 first `apps/api` substantive-route closure triggers real-usage validation. If `@hey-api/openapi-ts` hits a deal-breaker (e.g., per-tag subsetting can't reproduce the architecture's separation discipline, or TanStack Query hook generation has a regression that blocks `apps/mobile/` consumption), supersede this ADR via `ADR-NNNN-openapi-client-generation-revised` choosing Orval.
6. **Story 1.4 substrate-proof OpenAPI emission uses `@asteasolutions/zod-to-openapi`**, not the runtime extraction via `fastify-zod-openapi`. This is the build-time proof posture: Story 1.4's substrate has no live Fastify server, so runtime extraction has no substrate to extract from. Story 1.9 makes the runtime-extraction-vs-build-time-script call when the first apps/api substantive routes land; ADR-0005's decision (which CLIENT generator) is orthogonal to that call.

## Status lifecycle

- **drafted** at Story 1.4 author-commit — substantive author-commit; rationale on file; tool comparison grid published.
- **under-trustee-review** post-Story-1.4-review — set when the Story 1.4 PR merges to main; tracked at `docs/knowledge-transfer/adr-index.md`.
- **ratified** per Trustee Panel session — light-touch ratification because the choice is engineering tooling (not trust-posture-load-bearing) AND is reversible at Story 1.9+ if real-usage exposes a deal-breaker (the public consumer surfaces don't change across an Orval supersession — only the generator implementation).
- **superseded** if Story 1.9+ real-usage exposes a deal-breaker. The supersession marker records the trigger (specific deal-breaker + reproduction path) + the migration plan (Orval config + generated-output diff in a single PR; consumer-facing import paths preserved).

## Per [[feedback_closure_language_precision]] posture

- **Tool choice + ADR body = Closed by [edit]** at Story 1.4 commit: ADR exists; comparison grid is published; consequences enumerated; the substantive `packages/api-client/` wiring is downstream-Story territory per architecture's PR-2 boundaries.
- **Trustee Panel ratification = Resolved via explicit deferral**, tracked at `docs/knowledge-transfer/adr-index.md` Status row-count table; expected at next Trustee Panel session (light-touch ratification path).
- **First substantive generator invocation = deferred** to Story 1.9 dev-time when first `apps/api` routes substantively populate; tracked at `_bmad-output/implementation-artifacts/deferred-work.md` D2-1.4.
- **Per-tag bundle-subsetting CI test = deferred** to Story 1.16a friction-budget CI gate; tracked at D4-1.4.

## References

- Architecture §3.1 line 1791-1814 — REST + OpenAPI 3.1 + Zod single source of truth.
- Architecture §3.2 line 1815-1877 — structured error response + cursor pagination + URL-based major versioning + OpenAPI breaking-change semantic-diff CI + generator determinism.
- Architecture §4.2 line 2481-2517 — TanStack Query universal; query hooks generated from OpenAPI/Zod.
- Architecture §4.11.1 line 2787-2794 — per-route OpenAPI client subsetting; per-tag CI test.
- Architecture §5.15 line 3585 — deferred decision row for OpenAPI client-generation tool.
- Architecture §Generated artifacts line 4001-4005 — CODEOWNERS + `.gitattributes linguist-generated`.
- `docs/knowledge-transfer/adr-index.md` Section B row 12 — slot reserved pre-write.
- `docs/adr/ADR-0003-datastore-engine.md` — Story 1.2 ADR draft pattern reference.
- `docs/adr/ADR-0004-canonical-json.md` — Story 1.3 ADR draft pattern reference.
- `_bmad-output/implementation-artifacts/1-4-packages-contracts-zod-openapi-contract-scaffolding.md` — Story 1.4 file.
- `_bmad-output/implementation-artifacts/deferred-work.md` `## Story 1.4 deferred` section — cross-Story discharge triggers.
- `@hey-api/openapi-ts` — https://heyapi.dev/ (project home) + npm.
- Orval — https://orval.dev/ (project home) + npm.
