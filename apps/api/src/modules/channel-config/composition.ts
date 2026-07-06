// WhatsApp provider composition seam — Story 5.3 (Task 6; AC1, AC2).
//
// The reusable building block the (future) live dispatch resolves the `whatsapp` provider through — mirrors
// Story 5.2's `resolvePushTargets` (a composition seam exported for a live fan-out that does NOT exist
// yet: through 5.4 `dispatch()` is a primitive with NO live call site — [[project_channels_no_live_dispatch_yet]]).
// This is app-composition wiring, NOT a change to `dispatch` / the frozen `ChannelProvider` port.
//
// ── What this seam does (AC1, AC2) ─────────────────────────────────────────────────────────────────────
// Given a Pariwar + an alert category, it resolves the per-Pariwar WA config + the approved UTILITY
// template + the resolved access token, builds a per-Pariwar WA client (cached by pariwar_id), and returns
// a `ChannelProvider` — the REAL Meta provider when fully provisioned, else the log-only FIXTURE (the
// opt-in-real convention: an absent config row / `enabled=false` / a blank credential NAME / no approved
// template ⇒ fixture, so the stack boots with ZERO Meta config in dev/CI). `createWhatsappProvider(null)`
// makes the real-vs-fixture selection — it never leaks into `dispatch` (the dispatcher stays policy-agnostic).
//
// ── What this seam does NOT do (the boundaries) ────────────────────────────────────────────────────────
//   · It does NOT enforce the DUAL GATE (admin toggle AND member opt-in). Whether to ATTEMPT WA delivery to
//     a member is the DeliveryResolver's job (member opt-in ACTIVE is Story 5.4; the config `enabled` toggle
//     is this story's admin gate). The provider selection here only decides real-vs-fixture TRANSPORT.
//   · It does NOT run a live fan-out — there is no live `dispatch` call site yet. This is a building block.
//   · It never logs/audits the resolved token value (only the NAME pointer is safe — AI-4-3(c)).
//
// ── Infra failure vs. "not provisioned" (deliberate — do NOT swallow) ─────────────────────────────────────
// `getWaConfig` / `resolveApprovedTemplate` / `resolveSecret` are NOT wrapped in try/catch. Only the
// explicit "not provisioned" states above (no config row, toggle off, blank credential/phone-number-id, no
// approved template) resolve to `null` ⇒ fixture. A DB or Secret Manager OUTAGE must propagate as a
// rejection, not silently degrade to the fixture — swallowing it would mask a real outage behind a log-only
// no-op send (dishonest, the opposite of this story's "no fabricated success" discipline). Whoever wires the
// live dispatch call site (5.4+) is responsible for deciding how a rejection here is surfaced/retried.

import { channelConfig, ids, type Db } from '@twt/domain';
import { createWhatsappProvider, type ChannelProvider, type WhatsappAppCache } from '@twt/channels';

type PariwarId = ids.PariwarId;

/** What the composition seam needs: a scoped Db, the process WA client cache, and a secret resolver. */
export interface WhatsappCompositionDeps {
  /** RLS-scoped Db (the caller's tenant tx) for the config/template reads. */
  readonly db: Db;
  /** The per-process WA client cache (whatsapp-app.ts) — one client per pariwar_id, built lazily. */
  readonly appCache: WhatsappAppCache;
  /**
   * Resolve a Secret-Manager NAME → the token VALUE (production: `resolveSecretValue(name, { envFallback })`
   * from @twt/domain; local dev: an env fallback). Injected so the seam is testable without Secret Manager.
   */
  readonly resolveSecret: (secretName: string) => Promise<string>;
}

/**
 * Resolve the REAL WA provider deps for a (Pariwar, category), or `null` when the channel is not fully
 * provisioned for a live Meta send (⇒ the caller falls back to the fixture). Returns null when: no config
 * row, the admin toggle is off, the credential NAME / phone_number_id is blank, or the category has no
 * `approved` UTILITY template (not WA-eligible). The token is resolved LAST (only once every gate passes)
 * and never logged.
 */
export async function resolveWhatsappProviderDeps(
  deps: WhatsappCompositionDeps,
  pariwarId: PariwarId,
  alertCategory: string,
): Promise<{ messaging: ReturnType<WhatsappAppCache['messagingFor']>; template: { name: string; languageCode: string } } | null> {
  const config = await channelConfig.getWaConfig(deps.db, pariwarId);
  if (
    !config ||
    !config.enabled ||
    !config.accessTokenSecretName ||
    config.accessTokenSecretName.trim() === '' ||
    !config.phoneNumberId ||
    config.phoneNumberId.trim() === ''
  ) {
    return null;
  }

  // A category with no `approved` template is NOT WA-eligible — the real send cannot be built (Meta requires
  // a registered template). Fall back to the fixture (the caller passes null → createWhatsappProvider).
  const template = await channelConfig.resolveApprovedTemplate(deps.db, pariwarId, alertCategory);
  if (!template) return null;

  const accessToken = await deps.resolveSecret(config.accessTokenSecretName);
  const messaging = deps.appCache.messagingFor(pariwarId, {
    phoneNumberId: config.phoneNumberId,
    accessToken,
    graphApiVersion: config.graphApiVersion,
  });
  return { messaging, template: { name: template.templateName, languageCode: template.languageCode } };
}

/**
 * Resolve the `whatsapp` `ChannelProvider` for a (Pariwar, category): the REAL Meta provider when fully
 * provisioned, else the log-only fixture. Always returns a provider (fixture on the null path) — the
 * real-vs-fixture selection is `createWhatsappProvider`'s (kept OUT of `dispatch`).
 */
export async function resolveWhatsappProvider(
  deps: WhatsappCompositionDeps,
  pariwarId: PariwarId,
  alertCategory: string,
): Promise<ChannelProvider> {
  const providerDeps = await resolveWhatsappProviderDeps(deps, pariwarId, alertCategory);
  return createWhatsappProvider(providerDeps);
}
