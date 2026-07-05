# `packages/contracts/src/deep-links/`

Transport-layer contracts for the **deep-link** URL grammar per architecture line 4555-4556 + Sprint Change Proposal Item 12 (epics line 525) — canonical URL formation for cross-frontend deep links (mobile ↔ public ↔ admin), share-tokens, content-id parameter grammar.

## Landing Story

The substantive grammar (`DeepLinkTarget`, `formatDeepLink`, `deepLinkTargetForAlert`, `parseDeepLink`) landed at **Story 5.2** — populated into push payloads by `@twt/channels`' renderer. **No consumer exists yet**: `apps/mobile/` has no `Linking.addEventListener` / expo-router `linking` config / incoming-URL parser, `apps/public/` has no deep-link landing routes, and `apps/admin/` generates no deep-links for support workflows. A v1 push deep-link is unopenable dead data until whichever later story wires the mobile-side landing (architecture §4.7's 3-layer arrival checks: auth-state / scope-match / authorization). Recorded as an open item in the Story 5.2 Dev Agent Record — do not treat this list of consumers as already built.

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Deep-links resolve to tenant-scoped endpoints under `/api/v1/p/<pariwar_id>/...` or to global Pariwar-Passport surfaces under `/api/v1/global/...` per URL grammar; the grammar itself is global metadata.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare these types elsewhere to shadow contracts here — consume, don't copy.
- **Import path.** There is **no** `@twt/contracts/deep-links` subpath export wired (no `exports` map entry on this package) — mirrors the same not-wired posture as kyc/audit/rbac. Consume via the top-level barrel: `import type { DeepLinkTarget } from '@twt/contracts'`.
