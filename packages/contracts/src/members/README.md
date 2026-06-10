# `packages/contracts/src/members/`

Transport-layer contracts for the **member lifecycle** surface — signup, KYC linkage, suspension, frozen-state visibility, membership-state transitions per architecture §1.14 + UX-DR74 Account State Machine framework.

## Landing Story

Substantive contracts authored at **Story 3.1+** (member signup + lifecycle state machine + state transitions consuming the `@twt/events` `StateMachine<S, E>` primitive landed at Story 1.3). Story 3.3 lands DigiLocker KYC payload contracts; cross-link `packages/contracts/src/kyc/`.

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` in this directory MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Member endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/members/...` per architecture §3.1 line 1798. Cross-tenant lookups (rare; trustee admin only) use `/api/v1/global/members/<member_id>`. The schema authors decide; the path-grammar is enforced at `apps/api/` route registration (Story 1.9+).
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/members/members.types.ts` or `apps/admin/modules/members/members.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/members'`.
