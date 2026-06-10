# `packages/contracts/src/feature-flags/`

Transport-layer contracts for the **feature flag** subsystem — flag definitions, scope dimensions (global / per-Pariwar / per-cohort), FR-58C DigiLocker-mandatory cutover gate, flag-evaluation surface.

## Landing Story

Substantive contracts authored at **Stories 10.x** — feature-flag subsystem (FR-58C flag + per-cohort gate + admin UI) per epics Epic 10. The feature-flag tool selection ADR is `ADR-NNNN-feature-flag-tool-selection` (Section A row 24 of `docs/knowledge-transfer/adr-index.md`); structural cutover behavior per Cross-Cutting #15 capability bar.

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Flag-evaluation endpoints are global metadata at `/api/v1/global/feature-flags/...` for the catalog; per-Pariwar overrides at `/api/v1/p/<pariwar_id>/feature-flags/...`.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/feature-flags/feature-flags.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/feature-flags'`.
