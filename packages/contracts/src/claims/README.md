# `packages/contracts/src/claims/`

Transport-layer contracts for the **claim** subsystem — claim case object, claim filing, document upload, verification stages, approval, appeal stage-1 + stage-2, settlement record.

## Landing Story

Substantive contracts authored at **Stories 6.1 / 6.2 / 6.5+** — claim case object + claim filing + appeal stage 1/2 surface contracts per epics Epic 6. The claim state machine derives from event replay via the `@twt/events` `StateMachine<S, E>` primitive (Story 1.3 substrate); contracts here describe the wire shape of REST endpoints consumed by `apps/admin/` claim-review surfaces + `apps/mobile/` member-facing claim-status surfaces.

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Claim endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/claims/...` per architecture §3.1 line 1798.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/claims/claims.types.ts` or `apps/admin/modules/claims/claims.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/claims'`.
