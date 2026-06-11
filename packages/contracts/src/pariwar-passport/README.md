# `packages/contracts/src/pariwar-passport/`

Transport-layer contracts for the **Pariwar-Passport** data model + branding bundle per FR-63 — Pariwar identity, branding palette, locale + tone profile, public-facing passport surface.

## Landing Story — LANDED (Story 1.7)

Substantive contracts authored at **Story 1.7** — Pariwar-Passport data model + branding bundle per epics Epic 1. Landed:

- `branding-bundle.ts` — `BrandingBundle` (snake_case JSONB keys; `.strict()`; runtime subset of FR-63, NOT the FR-60 build-time bundle).
- `passport.ts` — `PariwarPassportResponse` (camelCase transport shape mirroring the domain row) + `LocaleDefault` (`hi | en`).
- `_common/primitives.ts` — `PariwarIdSchema` (`z.string().uuid().brand<'PariwarId'>()`, D12-1.4) whose brand string aligns with the domain `ids.PariwarId` brand.
- OpenAPI: `BrandingBundle` + `PariwarPassportResponse` registered as **components/schemas** in `scripts/emit-openapi.ts` (no paths — apps/api routes land at Story 1.9+). `contracts:check-openapi-determinism` stays green.

The upsert/request contract is route-coupled and lands with the apps/api write route at **Story 1.9** (D4-1.6). The Pariwar-Passport ADR is `ADR-NNNN-pariwar-passport-data-model` (Section A of `docs/knowledge-transfer/adr-index.md`); branded ID types live at `packages/domain/src/ids/` (Story 1.7 substantive landing per architecture §Cross-cutting concerns line 4538).

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Pariwar-Passport endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/passport/...`; the public passport surface is read-only at `/api/v1/global/passport/<pariwar_id>` for cross-Pariwar visibility per FR-63.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/pariwar-passport/pariwar-passport.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/pariwar-passport'`.
