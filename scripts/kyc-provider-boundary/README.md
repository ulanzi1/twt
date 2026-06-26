# `kyc-provider-boundary` gate

A precision CI gate enforcing **Story 3.3a AC3** (architectural-freeze **row 13** / AR-43):
the DigiLocker **SDK / transport** may be imported ONLY from the sole provider directory
(`apps/api/src/modules/kyc/providers/digilocker/`). Any other source file importing the
transport couples a consumer to DigiLocker-specifics — breaking the load-bearing property
that a **future KYC-provider swap is a single-module change, not a rewrite**.

There is **no first-party DigiLocker Node SDK**, so the "transport" is the direct-XMLDSig
stack: `xml-crypto` + its `@xmldom/xmldom` / `xpath` / `@xmldom/is-dom-node` dependencies.

- **lib.ts** — pure TS-AST scanner (`scanForbiddenTransportImports`). DB-free, unit-tested in `lib.test.ts`.
- **check.ts** — entrypoint: scans `apps/api/src` + each `packages/*/src`, applies the provider-directory allowlist, exits 1 naming file + line + module.

```
pnpm kyc-provider:test    # vitest run scripts/kyc-provider-boundary (teeth)
pnpm kyc-provider:check   # tsx scripts/kyc-provider-boundary/check.ts
```

## Flagged import forms

- `import … from 'xml-crypto'` — static import (named / default / side-effect)
- `export … from 'xml-crypto'` — re-export
- `import('xml-crypto')` — dynamic import
- `require('xml-crypto')` — CJS require

Exact roots **and** subpaths (`xml-crypto/lib/...`) match. AST-based, so a banned module
name in a comment or string literal never matches.

## Consume the port, not the transport

Consumer code depends on the `@twt/contracts` `KycProvider` port (+ the neutral
`KycProfile` / `KycError` types) — never the concrete DigiLocker client. That is the
single-module-swap seam: a new provider (e.g. a Setu/Surepass aggregator per architecture
§3.8) registers in `apps/api/src/modules/kyc/provider-registry.ts` and an FR-58C flag flip
selects it, with **zero consumer changes**.

## Scope

INVARIANT SCAN of the source trees (`apps/api/src` + `packages/*/src`) — not a git-diff
(no `fetch-depth: 0`; mirrors `member-state-invariant` / `domain-accessor-invariants` /
`schema-diff`). Tests are **not** scanned: the fixture-signing helper
(`apps/api/tests/fixtures/kyc/sign-eaadhaar.ts`) legitimately imports `xml-crypto` to
produce signed eAadhaar fixtures, and it lives under `tests/`, outside the scanned src
trees. Precision-scoped → self-green by construction: the only files importing the
transport are under the allowlisted provider directory. A new legitimate holder must be a
deliberate, reviewed addition to the `ALLOWLIST_DIR` in `check.ts`.
