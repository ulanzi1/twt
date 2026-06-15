// @twt/edge — the vendor-neutral edge-provider seam (Story 1.13, AR-52).
//
// The ONE home for the Cloudflare edge integration that ships in code: the Turnstile
// server-side verifier + its neutral interface + the no-op default. The remaining
// §5.8a capabilities (bot management, ingress signature, edge-only ingress) land as
// `infra/cloudflare/` Terraform + ADR-0010 in this same story. Consumers import ONLY
// the neutral types here — a pivot to a non-Cloudflare edge is a single-module change
// inside this package.
//
// NO dependency on @twt/domain (mirror @twt/queue): apps import @twt/edge and
// @twt/domain independently.

export {
  type TurnstileVerification,
  type TurnstileVerifier,
  type EdgeProvider,
  type TurnstileSiteverifyResponse,
  type CloudflareTurnstileOptions,
  noopTurnstileVerifier,
  createCloudflareTurnstileVerifier,
  TURNSTILE_SITEVERIFY_URL,
  TURNSTILE_WIDGET_SCRIPT_URL,
  TURNSTILE_TEST_KEYS,
} from './turnstile.js';
