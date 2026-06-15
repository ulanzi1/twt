// TurnstileVerifier — thin re-export of the @twt/edge vendor-neutral seam (Story 1.13).
//
// Story 1.9 pre-built the no-op `TurnstileVerifier` seam here; Story 1.13 PROMOTED the
// interface + the no-op default into the `@twt/edge` package (AR-52 — the edge
// integration lives behind a single-module-change abstraction) and the real Cloudflare
// `createCloudflareTurnstileVerifier` landed there. This file stays as a re-export so
// the existing import sites (context.ts, deps.ts, tests/integration/_setup.ts) keep
// importing the type/default from a stable apps/api path — no consumer imports
// `@twt/edge` (or anything `cloudflare`-named) directly except `deps.ts`, the one
// place that selects the real-vs-noop verifier from config.

export type { TurnstileVerifier, TurnstileVerification } from '@twt/edge';
export { noopTurnstileVerifier } from '@twt/edge';
