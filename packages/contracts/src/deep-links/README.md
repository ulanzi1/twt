# `packages/contracts/src/deep-links/`

Transport-layer contracts for the **deep-link** URL grammar per architecture line 4555-4556 + Sprint Change Proposal Item 12 (epics line 525) — canonical URL formation for cross-frontend deep links (mobile ↔ public ↔ admin), share-tokens, content-id parameter grammar.

## Landing Story

Substantive contracts authored at **Story 1.7+** — deep-link URL grammar landing alongside Pariwar-Passport (shared identity surface) per epics Epic 1; downstream consumers at `apps/mobile/` (lib/deep-link parsing) + `apps/public/` (Astro deep-link landing routes) + `apps/admin/` (admin-deep-link generation for support workflows).

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Deep-links resolve to tenant-scoped endpoints under `/api/v1/p/<pariwar_id>/...` or to global Pariwar-Passport surfaces under `/api/v1/global/...` per URL grammar; the grammar itself is global metadata.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/deep-links/deep-links.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/deep-links'`.
