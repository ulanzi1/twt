// The WhatsApp CODE's delivery — Story 5.13 (WC1, WC3, WC4; AC2, AC6–AC8; Decision 2026-10-21-374 option A, build decisions
// in Decision 2026-10-21-376). The FIRST WhatsApp send in apps/api: a Meta AUTHENTICATION (copy-code) template, sent in the
// member's own request to the member identity's REGISTERED number only (I2), OUTSIDE the dispatcher (a member not yet ACTIVE).
//
// THREE steps of the send flow live here (the handler holds the database ones — code-handlers.ts):
//   · `availability` (the mint, WC4) — config complete AND a template name resolves AND the token resolves; ⛔ decrypt, ⛔ client
//     build; bounded by `CODE_AVAILABILITY_TIMEOUT_MS`.
//   · `resolve` (WC1 step 1) — the same + the decrypt (KMS — a network call; its audit line is written through the service pool)
//     + `messagingFor` BUILT here (its `assertClientConfig` throws a PLAIN Error, which the classifier would read as
//     "may have sent" — so ⛔ inside the classified send, T16). ONE race, `CODE_RESOLVE_TIMEOUT_MS`. Any failure ⇒ a class, ⛔ a
//     row, ⛔ a fetch. Takes the config and the ciphertext as INPUT — ⛔ database handle (T3, T19).
//   · `send` (WC1 step 3) — ONLY `messaging.send(…)` inside the `try` whose `catch` runs `classifyDirectWaSendFailure` (F12 —
//     pinned, imported), mapped onto WC3's outcome table.
// ⭐ ⛔ Stand-in: the module's OWN `createWhatsappAppCache` over the injected TRANSPORT (`deps.waCodeTransport` — the global fetch
// in every environment, a recording fetch in tests), so the resolution and the request body under test are the production ones
// (AC8, T9). ⛔ The code, the mobile, a secret NAME or a token is ever logged (I7, T10): the injectable `log` takes a class token.
// ⚠ The access-wrapper invariant (f): a function that calls `resolveChannelSecret` is a verification context, so the secret reads
// sit in `readCodeSecrets` alone, with ⛔ variable-to-variable compare in its body (T5).

import {
  classifyDirectWaSendFailure,
  createWhatsappAppCache,
  TEMPLATE_NAME_FORM,
  waTemplateConfigKey,
  type FetchLike,
  type WhatsappAppCache,
  type WhatsappMessagingHandle,
} from '@twt/channels';
import { encryption } from '@twt/domain';

import type { EncryptionDeps } from '../../context.js';

/** The mint's bound on the Secret Manager reads (WC4) — a stall answers `codeAvailable: false`, ⛔ a slow mint. */
export const CODE_AVAILABILITY_TIMEOUT_MS = 2_000;
/** The send's bound on step 1 — the secret reads, the decrypt and the client build (WC1). */
export const CODE_RESOLVE_TIMEOUT_MS = 3_000;
/** Meta's call (WC1 step 3). */
export const CODE_SEND_TIMEOUT_MS = 10_000;

/** The template languages, `hi` preferred (the app is always Hindi — [[project_mobile_app_no_language_switch]]). */
const CODE_TEMPLATE_LOCALES = ['hi', 'en'] as const;

/** Why the code route is closed for a Pariwar or a send (a class — ⛔ a name, ⛔ a value). */
export type CodeResolveFailure = 'config_incomplete' | 'template_unresolved' | 'token_unresolved' | 'decrypt_failed' | 'resolve_timeout';

/** One line of the module's diagnostic log — a class token and the Pariwar, ⛔ the code / mobile / secret name / token. */
export interface WaCodeLogLine {
  readonly event: 'code_unavailable' | 'code_send';
  readonly pariwarId: string;
  readonly detail: string;
}

/**
 * The module's I/O seams (`AppDeps.waCodeTransport`): the fetch the Meta client uses, the per-send abort signal factory (tests
 * drive the real `'timeout'` path through it — F11), and the diagnostic log.
 */
export interface WaCodeTransport {
  readonly fetchImpl: FetchLike;
  readonly timeoutSignal?: (ms: number) => AbortSignal;
  readonly log?: (line: WaCodeLogLine) => void;
}

/** The `pariwar_wa_config` fields the code route reads (the caller's scope-tx read — ⛔ a database handle here). */
export interface WaCodeConfig {
  readonly phoneNumberId: string | null;
  readonly accessTokenSecretName: string | null;
  readonly graphApiVersion: string | null;
}

/** A send that can be made: the client, the recipient (E.164 ⛔ `+`) and the template. */
export interface WaCodeSendPlan {
  readonly messaging: WhatsappMessagingHandle;
  readonly to: string;
  readonly templateName: string;
  readonly languageCode: 'hi' | 'en';
}

/** WC3's outcomes, as the handler records them. */
export type WaCodeSendOutcome =
  | { readonly kind: 'accepted'; readonly wamid: string }
  /** It may have reached the member — COUNTED, 200 `uncertain`. */
  | { readonly kind: 'may_have_sent'; readonly detail: string }
  /** Provably ⛔ delivered and ⛔ the recipient's fault — UNCOUNTED, 502 `code_send_failed`. */
  | { readonly kind: 'released'; readonly detail: string }
  /** Meta refused it for the Trust's ACCOUNT (WC3 (a)) — UNCOUNTED, 503 `code_unavailable` + the closed route. */
  | { readonly kind: 'scope'; readonly detail: string }
  /** Meta refused it for the recipient or for an unclassified reason — COUNTED, 502 `code_send_failed`. */
  | { readonly kind: 'refused'; readonly detail: string };

interface CodeSecrets {
  readonly templateName: string;
  readonly languageCode: 'hi' | 'en';
  readonly accessToken: string;
}

export interface WaCodeDeliveryDeps {
  readonly resolveChannelSecret: (secretName: string) => Promise<string>;
  readonly encryption: EncryptionDeps;
  readonly waCodeTransport: WaCodeTransport;
}

export interface WaCodeDelivery {
  /** WC4 — can a code be sent for this Pariwar now? (⛔ decrypt, ⛔ client build.) */
  availability(pariwarId: string, config: WaCodeConfig | null): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: CodeResolveFailure }>;
  /** WC1 step 1 — everything a send needs, bounded; ⛔ database handle. */
  resolve(
    pariwarId: string,
    config: WaCodeConfig | null,
    mobileCiphertext: string | null,
  ): Promise<{ readonly ok: true; readonly plan: WaCodeSendPlan } | { readonly ok: false; readonly reason: CodeResolveFailure }>;
  /** WC1 step 3 — ONLY the Meta call, classified (WC3). Never throws. */
  send(pariwarId: string, plan: WaCodeSendPlan, code: string): Promise<WaCodeSendOutcome>;
  /** The diagnostic log (class tokens only). */
  log(line: WaCodeLogLine): void;
}

/** The default diagnostic log — one line, a class token (⛔ PII). */
function defaultLog(line: WaCodeLogLine): void {
  console.warn(`[wa-code] ${line.event} pariwar=${line.pariwarId} ${line.detail}`);
}

/** Non-blank config values, or null (⛔ a value logged). */
function completeConfig(config: WaCodeConfig | null): { phoneNumberId: string; accessTokenSecretName: string; graphApiVersion: string } | null {
  const phoneNumberId = config?.phoneNumberId?.trim() ?? '';
  const accessTokenSecretName = config?.accessTokenSecretName?.trim() ?? '';
  const graphApiVersion = config?.graphApiVersion?.trim() ?? '';
  if (phoneNumberId === '' || accessTokenSecretName === '' || graphApiVersion === '') return null;
  return { phoneNumberId, accessTokenSecretName, graphApiVersion };
}

/**
 * ⚠ The ONE function that calls `resolveChannelSecret` (an access-wrapper verification context — T5): the `hi` and `en` template
 * names and the access token, IN PARALLEL; `hi` preferred, each checked against `TEMPLATE_NAME_FORM` (the ONE regex); the token
 * non-blank (`resolveSecretValue` blank-checks only the env fallback). A throw (not provisioned OR an outage — both throw, F13)
 * reads as unresolved. ⛔ Variable-to-variable compare in this body.
 */
async function readCodeSecrets(
  resolveChannelSecret: (secretName: string) => Promise<string>,
  pariwarId: string,
  accessTokenSecretName: string,
): Promise<CodeSecrets | CodeResolveFailure> {
  const [hi, en, token] = await Promise.allSettled([
    resolveChannelSecret(waTemplateConfigKey('wa_opt_in.code', CODE_TEMPLATE_LOCALES[0], pariwarId)),
    resolveChannelSecret(waTemplateConfigKey('wa_opt_in.code', CODE_TEMPLATE_LOCALES[1], pariwarId)),
    resolveChannelSecret(accessTokenSecretName),
  ]);
  const usable = (r: PromiseSettledResult<string>): string | null =>
    r.status === 'fulfilled' && typeof r.value === 'string' && TEMPLATE_NAME_FORM.test(r.value.trim()) ? r.value.trim() : null;
  const hiName = usable(hi);
  const enName = usable(en);
  let picked: { templateName: string; languageCode: 'hi' | 'en' } | null = null;
  if (hiName !== null) picked = { templateName: hiName, languageCode: 'hi' };
  else if (enName !== null) picked = { templateName: enName, languageCode: 'en' };
  if (picked === null) return 'template_unresolved';
  const accessToken = token.status === 'fulfilled' && typeof token.value === 'string' ? token.value.trim() : '';
  if (accessToken === '') return 'token_unresolved';
  return { ...picked, accessToken };
}

/** Race `work` against `ms` — the loser keeps running (⛔ cancellable), its result is dropped. */
async function bounded<T>(work: Promise<T>, ms: number): Promise<T | 'resolve_timeout'> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<'resolve_timeout'>((resolve) => {
    timer = setTimeout(() => resolve('resolve_timeout'), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * WC3 — a failed Meta call, mapped from `classifyDirectWaSendFailure`'s kind (F12, its order) onto the outcome table. The `detail`
 * is 0178's grammar (`<prefix>:<token>`).
 */
export function mapCodeSendFailure(err: unknown): Exclude<WaCodeSendOutcome, { kind: 'accepted' }> {
  const f = classifyDirectWaSendFailure(err);
  switch (f.kind) {
    case 'may_have_sent':
      return { kind: 'may_have_sent', detail: `may_have_sent:${f.token}` };
    case 'transient':
      // `api_unavailable:000` (the connection never opened) and `rate_limited:*` never left / Meta asked to wait ⇒ uncounted; any
      // other 5xx (⛔ 502 / 504 — those are `may_have_sent`) MAY have been acted on ⇒ counted.
      if (f.token === 'api_unavailable:000' || f.token.startsWith('rate_limited:')) return { kind: 'released', detail: f.token };
      return { kind: 'may_have_sent', detail: f.token };
    case 'scope':
      return { kind: 'scope', detail: `scope:${f.token}` };
    case 'recipient':
      return { kind: 'refused', detail: `recipient:${f.token}` };
    case 'unknown_scope':
      // A code / name that never left (`param_invalid`) ⇒ uncounted; every other unclassified refusal ⇒ counted.
      if (f.token === 'param_invalid') return { kind: 'released', detail: 'unknown_scope:param_invalid' };
      return { kind: 'refused', detail: `unknown_scope:${f.token}` };
  }
}

/** Build the module's delivery over its OWN client cache (one per app instance — apps/api is outside the jobs one-cache rule). */
export function createWaCodeDelivery(deps: WaCodeDeliveryDeps): WaCodeDelivery {
  const transport = deps.waCodeTransport;
  const cache: WhatsappAppCache = createWhatsappAppCache(
    transport.fetchImpl,
    transport.timeoutSignal ? { timeoutSignal: transport.timeoutSignal } : {},
  );
  const log = transport.log ?? defaultLog;

  async function resolveWork(
    pariwarId: string,
    config: NonNullable<ReturnType<typeof completeConfig>>,
    mobileCiphertext: string | null,
  ): Promise<WaCodeSendPlan | CodeResolveFailure> {
    const secrets = await readCodeSecrets(deps.resolveChannelSecret, pariwarId, config.accessTokenSecretName);
    if (typeof secrets === 'string') return secrets;
    // The decrypt only once the route is provisioned (⛔ a KMS line for a Pariwar that cannot send).
    if (mobileCiphertext === null) return 'decrypt_failed';
    let to: string;
    try {
      to = (await encryption.decryptMobile(mobileCiphertext, deps.encryption)).replace(/^\+/, '');
    } catch {
      return 'decrypt_failed';
    }
    if (!/^[0-9]{8,15}$/.test(to)) return 'decrypt_failed';
    let messaging: WhatsappMessagingHandle;
    try {
      messaging = cache.messagingFor(pariwarId, {
        phoneNumberId: config.phoneNumberId,
        accessToken: secrets.accessToken,
        graphApiVersion: config.graphApiVersion,
      });
    } catch {
      return 'config_incomplete';
    }
    return { messaging, to, templateName: secrets.templateName, languageCode: secrets.languageCode };
  }

  return {
    log,

    async availability(pariwarId, config) {
      const complete = completeConfig(config);
      if (complete === null) return { ok: false, reason: 'config_incomplete' };
      const r = await bounded(
        readCodeSecrets(deps.resolveChannelSecret, pariwarId, complete.accessTokenSecretName).catch((): CodeResolveFailure => 'template_unresolved'),
        CODE_AVAILABILITY_TIMEOUT_MS,
      );
      return typeof r === 'string' ? { ok: false, reason: r } : { ok: true };
    },

    async resolve(pariwarId, config, mobileCiphertext) {
      const complete = completeConfig(config);
      if (complete === null) return { ok: false, reason: 'config_incomplete' };
      const r = await bounded(
        resolveWork(pariwarId, complete, mobileCiphertext).catch((): CodeResolveFailure => 'decrypt_failed'),
        CODE_RESOLVE_TIMEOUT_MS,
      );
      return typeof r === 'string' ? { ok: false, reason: r } : { ok: true, plan: r };
    },

    async send(pariwarId, plan, code) {
      let outcome: WaCodeSendOutcome;
      try {
        const wamid = await plan.messaging.send(
          { to: plan.to, templateName: plan.templateName, languageCode: plan.languageCode, authenticationCode: code },
          { timeoutMs: CODE_SEND_TIMEOUT_MS },
        );
        outcome = { kind: 'accepted', wamid };
      } catch (err) {
        outcome = mapCodeSendFailure(err);
      }
      log({ event: 'code_send', pariwarId, detail: outcome.kind === 'accepted' ? 'accepted' : `${outcome.kind} ${outcome.detail}` });
      return outcome;
    },
  };
}
