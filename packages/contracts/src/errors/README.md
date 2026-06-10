# `packages/contracts/src/errors/`

Per-domain error-code enumeration directory per architecture §3.2 line 1830 ("Enumerated in `packages/contracts/errors/`").

## Convention

Each per-domain file exports a `const`-asserted map of namespaced error codes using the `defineErrorCode(domain, action, sub?)` helper from `_common/errors.ts`:

```typescript
// packages/contracts/src/errors/pool.ts (example — landed by Story 7.x)
import { defineErrorCode } from '../_common/errors.js';

export const POOL_ERRORS = {
  SPAWN_DUPLICATE: defineErrorCode('pool', 'spawn', 'duplicate'),
  FREEZE_INVALID_STATE: defineErrorCode('pool', 'freeze', 'invalid_state'),
  SNAPSHOT_INTEGRITY_FAIL: defineErrorCode('pool', 'snapshot', 'integrity_fail'),
} as const;
```

The `const`-assert preserves the literal-template types so call sites get precise narrowing (`'pool.spawn.duplicate'`, not widened `string`).

## Landing Stories per file

- `errors/claim.ts` — Story 6.x (claim lifecycle).
- `errors/pool.ts` — Story 7.x (Pool Engine).
- `errors/member.ts` — Story 3.1+ (member lifecycle).
- `errors/alert.ts` — Story 8.x (alert lifecycle).
- `errors/contribution.ts` — Story 9.x (contribution + reconciliation).
- `errors/audit.ts` — Stories 1.10 / 1.11a / 1.11b.
- `errors/rbac.ts` — Story 1.8.
- `errors/kyc.ts` — Stories 3.3+.
- `errors/feature-flag.ts` — Stories 10.x.
- `errors/module.ts` — Stories 12.x.

## Story 1.4 baseline

`index.ts` is an empty barrel placeholder; the per-domain enumeration files land per the table above. The framework (`ErrorResponse` envelope + `defineErrorCode` factory) lives in `_common/errors.ts`.
