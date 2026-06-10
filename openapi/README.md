# openapi/

Generated OpenAPI 3.1 spec emitted from `packages/contracts/` Zod schemas. Per architecture §Project Structure line 4176-4177 the artifact lives at `openapi/v1.yaml`; per architecture §Generated artifacts deterministic + synchronized (lines 3995-3999) it is a generated artifact (NOT hand-authored) and `.gitattributes` marks it `linguist-generated=true` so it collapses in PR review diffs.

## Substrate state at Story 1.4 closure

`openapi/v1.yaml` is the build-time emission from `packages/contracts/scripts/emit-openapi.ts` using `@asteasolutions/zod-to-openapi`. At Story 1.4 the spec contains a single toy endpoint (`GET /api/v1/_meta/health` → `HealthResponse | ErrorResponse`) authored under `packages/contracts/src/_common/health.ts` purely to prove the emission pipeline. Substantive routes land at `apps/api/` Stories 1.9+ when the first substantive route surfaces populate.

## Re-emission

```sh
pnpm contracts:emit-openapi                  # re-emit openapi/v1.yaml
pnpm contracts:check-openapi-determinism     # CI gate: re-emit + byte-identical assert
```

## CI gates

- **Generator-determinism CI gate** per architecture §3.2 line 1862-1865 — wired at Story 1.4 via the `contracts-check` job in `.github/workflows/ci.yml`. Asserts re-running the generator produces byte-identical output to the committed `v1.yaml`.
- **OpenAPI breaking-change semantic-diff CI gate** per architecture §3.2 line 1856-1860 — deferred to Story 1.9+ when `apps/api/` substantively populates routes + a substantive diff substrate exists (deferred-work D1-1.4). Tooling candidates: `openapi-diff` (npm) or `oasdiff` (Go binary).

## Migration path at Story 1.9+

Story 1.4's build-time emission via `@asteasolutions/zod-to-openapi` is the substrate-proof posture. Story 1.9+ either keeps the build-time script (registering Fastify routes' Zod schemas at module-load) or replaces it with runtime extraction via `fastify-zod-openapi` + `@fastify/swagger` (architecture canonical per §3.1 line 1795). Decision at Story 1.9 dev-time per real-usage validation (deferred-work D14-1.4).

## See also

- `packages/contracts/README.md` — workspace layout + `.strict()` discipline + type-shadowing prohibition + branded-ID strategy.
- [ADR-0005-openapi-client-generation](../docs/adr/ADR-0005-openapi-client-generation.md) — `@hey-api/openapi-ts` primary + Orval secondary; consumer of this spec via `packages/api-client/` at Story 1.9+.
