# `packages/contracts/src/pariwar-passport/`

Transport-layer contracts for the **Pariwar-Passport** data model + branding bundle per FR-63 — Pariwar identity, branding palette, locale + tone profile, public-facing passport surface.

## Landing Story

Substantive contracts authored at **Story 1.7** — Pariwar-Passport data model + branding bundle per epics Epic 1. The Pariwar-Passport ADR is `ADR-NNNN-pariwar-passport-data-model` (Section A row 25 of `docs/knowledge-transfer/adr-index.md`); branded ID types live at `packages/domain/src/ids/` (Story 1.7 substantive landing per architecture §Cross-cutting concerns line 4538).

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Pariwar-Passport endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/passport/...`; the public passport surface is read-only at `/api/v1/global/passport/<pariwar_id>` for cross-Pariwar visibility per FR-63.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/pariwar-passport/pariwar-passport.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/pariwar-passport'`.
