// Per-channel provider composition + the contribution-loop registry assembly — AI-8-3.
//
// ── Why this lives in @twt/channels (the §2 cycle reconciliation, [[feedback_closure_language_precision]]) ──
// The Epic-8 retro named the constraint "the apps/api ↔ @twt/channels package-cycle", but the real blocker is
// subtler. The provider composition MUST call createWhatsappProvider / createTelegramProvider / createSmsProvider
// / createPushProviders and return a `ChannelProvider` — all @twt/channels symbols — so @twt/domain CANNOT host
// it (domain importing channels would cycle channels→domain→channels; that is exactly why Story 8.8 could only
// relocate the delivery *target* resolvers to domain, because those are `SendTarget`-structural and never touch
// channels). And apps/jobs cannot import apps/api (apps/api → @twt/jobs already exists). The composition's only
// real deps are @twt/domain (the channelConfig reads) + @twt/channels's OWN provider factories — and
// @twt/channels ALREADY depends on @twt/domain (audit.ts / cost-optimization.ts). So the lowest shared layer that
// satisfies its deps is @twt/channels itself: both apps/api and apps/jobs already depend on it, so both consume
// this with ZERO new package and ZERO new dependency edge. This is the 8.8 target-resolver relocation one layer up.
//
// The three per-channel functions below were RELOCATED VERBATIM from
// apps/api/src/modules/channel-config/composition.ts (Stories 5.3 / 5.5 / 5.6); apps/api now re-exports them so
// no apps/api call site or test changed. The delivery-*target* adapters (resolveWaTarget / resolveTelegramTarget
// / resolveSmsTarget) + the cost-opt read seams STAY in apps/api — they carry the apps/api {db,encryption} deps
// shape and are unrelated to provider selection.
//
// ── The honesty discipline (preserved VERBATIM from composition.ts:23-29) ──────────────────────────────────
// getWaConfig / getTelegramConfig / resolveApprovedTemplate / resolveSecret / resolveConfig are NOT wrapped in
// try/catch. Only the explicit "not provisioned" states (no config row, toggle off, blank credential/template
// NAME, no approved template, gateway not configured) resolve to `null` ⇒ the log-only fixture (the opt-in-real
// convention: the stack boots with ZERO Meta/Telegram/DLT/FCM config in dev/CI). A DB or Secret-Manager OUTAGE
// MUST propagate as a rejection, never silently degrade to the fixture — swallowing it would mask a real outage
// behind a log-only no-op send (dishonest; the opposite of this program's "no fabricated success" integrity).
// The registry assembler below holds this SAME 5-state distinction across all four channels (AI-8-3 §9a-i).

import { channelConfig, ids, type Db } from '@twt/domain';

import {
  createPushProviders,
  createSmsProvider,
  createTelegramProvider,
  createWhatsappProvider,
  type SmsProviderDeps,
} from '../providers/index.js';
import type { FirebaseAppCache } from '../providers/firebase-app.js';
import type { SmsAppClient } from '../providers/sms-app.js';
import type { TelegramAppCache } from '../providers/telegram-app.js';
import type { WhatsappAppCache } from '../providers/whatsapp-app.js';
import { resolveDltTemplate } from '../sms-dlt-registry.js';
import type { Channel, ChannelProvider } from '../provider.js';

type PariwarId = ids.PariwarId;

// ── WhatsApp composition (relocated from apps/api Story 5.3, Task 6) ───────────────────────────────────────

/** What the WA provider composition seam needs: a scoped Db, the process WA client cache, and a secret resolver. */
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

// ── Telegram composition (relocated from apps/api Story 5.5, Task 8) ───────────────────────────────────────

/** What the Telegram composition seam needs: a scoped Db, the process Telegram client cache, + a secret resolver. */
export interface TelegramCompositionDeps {
  /** RLS-scoped Db (the caller's tenant tx) for the config read. */
  readonly db: Db;
  /** The per-process Telegram client cache (telegram-app.ts) — one client per pariwar_id, built lazily. */
  readonly appCache: TelegramAppCache;
  /** Resolve a Secret-Manager NAME → the bot-token VALUE. Injected so the seam is testable without Secret Manager. */
  readonly resolveSecret: (secretName: string) => Promise<string>;
}

/**
 * Resolve the REAL Telegram provider deps for a Pariwar, or `null` when the channel is not fully provisioned
 * for a live send (⇒ the caller falls back to the fixture). Returns null when: no config row, the admin toggle
 * is off, or the bot-token NAME is blank. The token is resolved LAST (only once every gate passes) and never
 * logged. Note: unlike WhatsApp there is NO per-category template gate (Telegram sends free text) — the
 * announcements-only eligibility already lives in dispatch.ts, not here.
 */
export async function resolveTelegramProviderDeps(
  deps: TelegramCompositionDeps,
  pariwarId: PariwarId,
): Promise<{ messaging: ReturnType<TelegramAppCache['messagingFor']> } | null> {
  const config = await channelConfig.getTelegramConfig(deps.db, pariwarId);
  if (
    !config ||
    !config.enabled ||
    !config.botTokenSecretName ||
    config.botTokenSecretName.trim() === ''
  ) {
    return null;
  }

  const botToken = await deps.resolveSecret(config.botTokenSecretName);
  const messaging = deps.appCache.messagingFor(pariwarId, { botToken });
  return { messaging };
}

/**
 * Resolve the `telegram` `ChannelProvider` for a Pariwar: the REAL Telegram provider when fully provisioned,
 * else the log-only fixture. Always returns a provider (fixture on the null path) — the real-vs-fixture
 * selection is `createTelegramProvider`'s (kept OUT of `dispatch`).
 */
export async function resolveTelegramProvider(
  deps: TelegramCompositionDeps,
  pariwarId: PariwarId,
): Promise<ChannelProvider> {
  const providerDeps = await resolveTelegramProviderDeps(deps, pariwarId);
  return createTelegramProvider(providerDeps);
}

// ── SMS composition (relocated from apps/api Story 5.6, Task 6) ────────────────────────────────────────────

/** What the SMS provider composition seam needs: the global gateway client + a global config/NAME resolver. */
export interface SmsCompositionDeps {
  /**
   * The single GLOBAL SMS gateway client (sms-app.ts), built ONCE at boot with the resolved platform gateway
   * credential + PE/OE sender header (restart-required-on-rotation). There is no per-Pariwar dimension.
   */
  readonly appClient: SmsAppClient;
  /**
   * Resolve a global config / Secret-Manager NAME → its value (e.g. the TRAI-assigned DLT template id for a
   * category's `dltTemplateIdConfigKey`). Returns `null` for an explicit "not provisioned" state (⇒ the
   * caller falls back to the fixture). A DB / Secret-Manager OUTAGE must THROW (propagate) — never silently
   * degrade to the fixture (mirror the honesty discipline in this file's head-comment).
   */
  readonly resolveConfig: (configKey: string) => Promise<string | null>;
}

/**
 * Resolve the REAL SMS provider deps for an alert category, or `null` when SMS is not provisioned for it
 * (⇒ the caller falls back to the fixture). Returns null when: the global gateway credential is NOT
 * configured (`appClient.isConfigured()` — mirrors WA's own-config blank check), the category has NO
 * registered DLT template (not SMS-eligible — mirrors WA's "no approved template ⇒ not WA-eligible"), or the
 * resolved DLT template id NAME is absent/blank (not provisioned). The template id is resolved from a global
 * NAME pointer and never logged (AI-4-3(c)). Infra failures in `resolveConfig` PROPAGATE (not caught) — only
 * the explicit not-provisioned states resolve to `null`.
 */
export async function resolveSmsProviderDeps(
  deps: SmsCompositionDeps,
  alertCategory: string,
): Promise<SmsProviderDeps | null> {
  // The global SMS gateway credential is NOT configured — same "not provisioned" treatment as WA's blank
  // accessTokenSecretName/phoneNumberId check. Fall back to the fixture (never a thrown error for this).
  if (!deps.appClient.isConfigured()) return null;

  // A category absent from the DLT registry is NOT SMS-eligible — no real send can be built (the gateway
  // requires a registered template). Fall back to the fixture (the caller passes null → createSmsProvider).
  const template = resolveDltTemplate(alertCategory);
  if (!template) return null;

  // Resolve the TRAI-assigned DLT template id from its global NAME pointer at send time (never hardcoded).
  const dltTemplateId = await deps.resolveConfig(template.dltTemplateIdConfigKey);
  if (!dltTemplateId || dltTemplateId.trim() === '') return null;

  const messaging = deps.appClient.messaging();
  return { messaging, dltTemplateId };
}

/**
 * Resolve the `sms` `ChannelProvider` for an alert category: the REAL DLT provider when provisioned, else
 * the log-only fixture. Always returns a provider (fixture on the null path) — the real-vs-fixture selection
 * is `createSmsProvider`'s (kept OUT of `dispatch`).
 */
export async function resolveSmsProvider(
  deps: SmsCompositionDeps,
  alertCategory: string,
): Promise<ChannelProvider> {
  const providerDeps = await resolveSmsProviderDeps(deps, alertCategory);
  return createSmsProvider(providerDeps);
}

// ── Push composition — AI-8-3 Task 2 (D1: GLOBAL Firebase service-account v1) ──────────────────────────────
//
// The missing seam: composition.ts (5.3/5.5/5.6) covered WA / Telegram / SMS, but push had only
// `resolvePushTargets` (device-token targets) and no `resolvePushProvider` that builds the FCM/APNS providers
// from a Firebase messaging handle. @twt/channels exports the primitive `createPushProviders(push | null)` but
// nobody called it. This is the crux of the story (§4, the push trap): the cascade is push → WA → SMS and the
// FIXTURE push ALWAYS accepts, so if push resolves to the fixture the ladder never advances and no real bytes
// are ever sent — wiring real WA/SMS while leaving push on the fixture delivers NOTHING real.
//
// ── D1 — global credential, no per-Pariwar push config table ───────────────────────────────────────────────
// There is no `pariwar_push_config` table (grep-confirmed: only WA/Telegram config tables exist). Rather than
// add a producer-less config column (the 5.6/5.7 anti-pattern), push v1 uses ONE global Firebase
// service-account secret NAME, resolved to the JSON VALUE and passed as `serviceAccountJson` for EVERY
// Pariwar's `messagingFor(pariwarId, sa)` call. The cache still isolates one Firebase `App` per pariwar_id by
// name, but they share one project's credential. This mirrors SMS's own "global gateway, no per-Pariwar
// dimension" posture exactly — SMS is already global, so a global-credentialed push v1 is consistent, needs NO
// migration, and unblocks Epic 9's real-bytes goal. A genuinely per-Pariwar Firebase project is a separate
// future story (recorded in deferred-work.md with a re-trigger). ABSENT secret ⇒ fixture push (opt-in-real).

/** What the push provider composition seam needs: the process Firebase App cache + the global-SA secret resolver. */
export interface PushCompositionDeps {
  /** The per-process Firebase App cache (firebase-app.ts) — one App per pariwar_id, built lazily. */
  readonly appCache: FirebaseAppCache;
  /**
   * Resolve the GLOBAL Firebase service-account secret NAME → its JSON VALUE, or `null`/'' for an explicit
   * "not provisioned" state (⇒ fixture push). A Secret-Manager OUTAGE must THROW (propagate) — never degrade
   * to the fixture (the 5-state honesty discipline). Injected so the seam is testable without Secret Manager.
   */
  readonly resolveGlobalServiceAccount: () => Promise<string | null>;
}

/**
 * Resolve the two `push` transports (fcm + apns) for a Pariwar: the REAL firebase-admin providers when the
 * global Firebase service-account secret resolves to a value, else the log-only fixtures. The service-account
 * NAME is resolved LAST (once, per resolver-memoization) and never logged. ABSENT/blank secret ⇒ fixture push
 * (opt-in-real). A `resolveGlobalServiceAccount` OUTAGE propagates (not caught) — infra down ≠ unconfigured.
 */
export async function resolvePushProviders(
  deps: PushCompositionDeps,
  pariwarId: PariwarId,
): Promise<readonly ChannelProvider[]> {
  const serviceAccountJson = await deps.resolveGlobalServiceAccount();
  if (!serviceAccountJson || serviceAccountJson.trim() === '') {
    // Not provisioned (no global FCM credential) ⇒ the log-only fixture push transports.
    return createPushProviders(null);
  }
  const messaging = deps.appCache.messagingFor(pariwarId, serviceAccountJson);
  return createPushProviders({ messaging });
}

// ── The registry assembly — AI-8-3 Task 3 (the ProviderRegistryResolver the live fan-out injects) ────────────

/**
 * Everything the boot-time factory holds for the process lifetime: the app caches (built ONCE), the global SMS
 * gateway client, the two secret/config resolvers, and the global Firebase SA secret NAME. The scoped-read
 * seam (`withScope`) lets the resolver open its OWN per-Pariwar tenant tx — `resolveProviders` is called with
 * only `{pariwarId, category}`, NOT a pre-scoped `db`, so it must scope the RLS config reads itself (§6).
 */
export interface ContributionProviderResolverDeps {
  /** Open a per-Pariwar RLS-scoped tx for the config reads. In production this is a bound `withPariwarScope`
   *  over the BYPASSRLS service pool; injected so the resolver is unit-testable with a fake scoped Db. */
  readonly withScope: <T>(pariwarId: string, fn: (db: Db) => Promise<T>) => Promise<T>;
  readonly firebaseAppCache: FirebaseAppCache;
  readonly whatsappAppCache: WhatsappAppCache;
  readonly telegramAppCache: TelegramAppCache;
  readonly smsAppClient: SmsAppClient;
  /** Resolve a per-Pariwar Secret-Manager NAME → the token VALUE (WA access token / Telegram bot token). */
  readonly resolveSecret: (secretName: string) => Promise<string>;
  /** Resolve a global config / Secret-Manager NAME → value|null (the SMS DLT template id NAME). */
  readonly resolveConfig: (configKey: string) => Promise<string | null>;
  /** The GLOBAL Firebase service-account secret NAME (D1). Blank/undefined ⇒ fixture push everywhere. */
  readonly firebaseServiceAccountSecretName?: string | undefined;
}

/** The resolver's memoized result — the four-channel provider registry for one (pariwarId, category). */
export type ProviderRegistry = Readonly<Record<Channel, readonly ChannelProvider[]>>;

/**
 * Build the boot-time `ProviderRegistryResolver` the contribution-loop live fan-out injects (matching
 * `contribution-notify.ts`'s `ProviderRegistryResolver`). It composes ALL FOUR channels for a
 * (pariwarId, category):
 *   · push     → real createPushProviders(messaging) when the global SA secret resolves, else fixture (§4)
 *   · whatsapp → resolveWhatsappProvider (real when the Pariwar's WA config is fully provisioned, else fixture)
 *   · sms      → resolveSmsProvider (real when the global gateway + a registered DLT template are provisioned)
 *   · telegram → resolveTelegramProvider (real when the Pariwar's Telegram config is fully provisioned)
 *
 * ── The scoping subtlety (§6) ──────────────────────────────────────────────────────────────────────────────
 * The config reads (getWaConfig / getTelegramConfig / resolveApprovedTemplate) are RLS-scoped. `resolveProviders`
 * is invoked with only {pariwarId, category}, so the resolver opens its OWN `withScope(pariwarId, …)` for those
 * reads. Missing this ⇒ the read runs unscoped ⇒ RLS returns nothing ⇒ every channel silently resolves to the
 * fixture (a green-but-vacuous wiring — the exact failure this story exists to prevent). SMS + push read no
 * tenant table, so they are composed OUTSIDE the scope.
 *
 * ── Memoization (D3) + its cache-invalidation posture ────────────────────────────────────────────────────────
 * `fanOutAlert` calls `resolveProviders` ONCE PER MEMBER (~400k times for a 4-lakh cycle), for values identical
 * across every member of the same (pariwarId, category). The resolver memoizes its result per (pariwarId,
 * category) in a `Map`, so config + secret are read once per (pariwarId, category), not once per member. The
 * `Map` lives for the life of the WORKER PROCESS — `resolveProviders` carries no batch/cycle id, so the resolver
 * cannot scope the cache any tighter. A config/secret/template change is therefore NOT observed for an
 * already-memoized (pariwarId, category) until the process RESTARTS — identical to the app caches'
 * "restart-required-on-rotation" posture, NOT a "picked up next cycle" guarantee.
 *
 * ── In-flight dedup (review finding, AI-8-3) ─────────────────────────────────────────────────────────────────
 * The memo caches the PENDING PROMISE, not just the settled value. `fanOutAlertToMembers` can fan multiple
 * members of the SAME (pariwarId, category) out concurrently (e.g. several pool-batch workers at cycle-open),
 * so without this, every concurrent caller that misses the cache before the first resolution lands would
 * independently re-open the RLS-scoped read + re-hit Secret Manager — a thundering herd at exactly the
 * highest-load moment. Caching the in-flight promise means concurrent callers for the same key share ONE
 * resolution. A REJECTED promise is removed from the map (not left cached) so a transient outage still retries
 * cleanly on the next call — this preserves the existing "a rejected outage is not memoized" guarantee below.
 *
 * ── The 5-state honesty invariant (§9a-i) ────────────────────────────────────────────────────────────────────
 * "Not configured" (absent row / disabled / blank NAME / no template / gateway unconfigured) ⇒ fixture per
 * channel. A DB outage (the scoped read throws) or a Secret-Manager outage (resolveSecret/resolveConfig/the SA
 * resolver throws) PROPAGATES out of this resolver — it is not caught — so the pg-boss job fails and retries. A
 * masked outage would fake delivery (the opposite of this program's integrity). NB: because a throw propagates
 * BEFORE the memo is populated, a transient outage is retried cleanly (a rejected value is never cached).
 */
export function createContributionProviderResolver(
  deps: ContributionProviderResolverDeps,
): (input: { readonly pariwarId: string; readonly category: string }) => Promise<ProviderRegistry> {
  const memo = new Map<string, Promise<ProviderRegistry>>();

  return ({ pariwarId, category }) => {
    const key = `${pariwarId} ${category}`;
    const cached = memo.get(key);
    if (cached) return cached;

    const pid = ids.pariwarId(pariwarId);

    const pending = (async (): Promise<ProviderRegistry> => {
      // push + sms read no tenant table — compose them outside the RLS scope.
      const push = await resolvePushProviders(
        {
          appCache: deps.firebaseAppCache,
          resolveGlobalServiceAccount: () =>
            deps.firebaseServiceAccountSecretName && deps.firebaseServiceAccountSecretName.trim() !== ''
              ? deps.resolveSecret(deps.firebaseServiceAccountSecretName)
              : Promise.resolve(null),
        },
        pid,
      );
      const sms = await resolveSmsProvider(
        { appClient: deps.smsAppClient, resolveConfig: deps.resolveConfig },
        category,
      );

      // WA + Telegram config reads are RLS-scoped — open the resolver's OWN per-Pariwar tenant tx (§6).
      const { whatsapp, telegram } = await deps.withScope(pariwarId, async (db) => {
        const wa = await resolveWhatsappProvider(
          { db, appCache: deps.whatsappAppCache, resolveSecret: deps.resolveSecret },
          pid,
          category,
        );
        const tg = await resolveTelegramProvider(
          { db, appCache: deps.telegramAppCache, resolveSecret: deps.resolveSecret },
          pid,
        );
        return { whatsapp: wa, telegram: tg };
      });

      return { push, whatsapp: [whatsapp], sms: [sms], telegram: [telegram] };
    })();

    // Cache the IN-FLIGHT promise immediately — concurrent callers for the same key share this ONE
    // resolution. A rejection removes the entry so the next call re-attempts rather than replaying a
    // cached failure.
    memo.set(key, pending);
    pending.catch(() => {
      memo.delete(key);
    });
    return pending;
  };
}
