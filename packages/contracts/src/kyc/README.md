# `packages/contracts/src/kyc/`

Transport-layer contracts for **KYC** — DigiLocker provider abstraction + signature verification + member KYC record + fallback provider posture per AR-43 + architecture §2.8.

## Landing Story

Substantive contracts authored at **Stories 3.3 / 3.3a / 3.3b** — DigiLocker KYC + provider abstraction + signature verification policy per epics Epic 3. The DigiLocker signature verification policy ADR is `ADR-0026-digilocker-signature-policy` (`docs/adr/ADR-0026-digilocker-signature-policy.md`; Section A of `docs/knowledge-transfer/adr-index.md`), authored `drafted` at Story 3.3a closure; the fallback provider posture lands per Story 3.3b.

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** KYC endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/kyc/...` per architecture §3.1 line 1798.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/kyc/kyc.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/kyc'`.
