// packages/contracts/src/kyc/index.ts
//
// KYC provider-abstraction contracts barrel (Story 3.3a) — the frozen seam
// (architectural-freeze row 13 / AR-43). Consume via the `@twt/contracts` TOP barrel:
//   import type { KycProvider, KycProfile, KycError } from '@twt/contracts';
//
// ⚠ The kyc/README.md says `import … from '@twt/contracts/kyc'` — that subpath does
// NOT resolve (the contracts package.json has no `exports` map, only `"main"`). Always
// use the top barrel (the members/index.ts convention). Do NOT add a subpath exports
// entry in this story.
//
// Story 3.3b adds siblings here (the signup KYC step's transport DTOs). The
// `KycProvider` port + `KycProfile` + `KycError` are the abstraction every later
// provider implementation + every consumer codes against.

export * from './profile.js';
export * from './provider.js';
export * from './errors.js';
