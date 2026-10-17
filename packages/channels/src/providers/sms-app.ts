// Global SMS gateway client — Story 5.6 (AC1, AC2; Task 1), rebuilt for MSG91 by Story 6.37 (MG3, MG6, MG8–MG10;
// `2026-10-10-314`, `2026-10-17-345`; ADR-0041).
//
// The `sms` channel sends through ONE platform-global gateway: MSG91 "for now" (`-314` decision 1). Its Flow v5 API
// takes an `authkey` header, MSG91's OWN template id and the template's NAMED variable values — ⛔ the finished text.
// A THIN `fetch` client (no SDK — the official npm package calls the legacy endpoint; ADR-0041), so a later vendor is
// another adapter behind the SAME `SmsMessagingHandle` seam, ⛔ a rewrite. The generic Bearer contract this file held
// before 6.37 matched ⛔ gateway and is REMOVED (MG10).
//
// ── The `SmsMessagingHandle` seam (mirrors WhatsappMessagingHandle) ────────────────────────────────────
// The sms-dlt provider, the claim-text send core and the OTP adapter depend on this narrow interface (just `send`),
// ⛔ on `fetch` / MSG91 directly, so their tests inject a fake handle with NO network. Every MSG91 fact (the URL, the
// Flow body, the number format, the response shape) lives HERE + in sms-errors.ts (AR-53).
//
// ── ⚠ `"type":"success"` is ⛔ delivery, and ⛔ even proof the account works (F9) ──────────────────────
// MSG91 reports most errors ASYNCHRONOUSLY: a Flow call with a FAKE authkey answered HTTP 200 `"type":"success"`. So
// an acceptance here means only "MSG91 took the request" — the pre-flight (`sms-preflight.ts`) reads each template
// before it is used, and delivery reports arrive later by webhook (row 6-37b — every send carries a `CRQID` MSG91
// echoes back). HTTP 200 alone is ⛔ an acceptance (I3).
//
// ── Credential = a GLOBAL Secret-Manager NAME resolved by the composition layer, never logged ──────────
// The authkey VALUE is captured in the closure and used on every call; it is NEVER logged or audited (AI-4-3(c)).
// KNOWN v1 gap (unchanged): ⛔ rebuild on rotation — RESTART-REQUIRED-ON-ROTATION (the whatsapp-app.ts call).

import { encryption, smsDelivery } from '@twt/domain';

/** The narrow send seam every SMS sender depends on — the ONLY gateway surface it touches. */
export interface SmsMessagingHandle {
  /**
   * Send one SMS. Resolves to MSG91's request id on acceptance, and REJECTS (throws an `SmsSendError`) on a gateway
   * error / non-2xx / network failure / a local refusal so the caller's catch can classify it (sms-errors.ts). Never
   * returns a fabricated id.
   */
  send(message: SmsGatewayMessage): Promise<string>;
}

/** One named value of the template (the slot's `name` — MSG91's `##name##` — and its text), in slot order. */
export interface SmsGatewayValue {
  readonly name: string;
  readonly value: string;
}

/** The gateway message a sender builds (MG3). */
export interface SmsGatewayMessage {
  /** Recipient in E.164 `+91…` — the client sends MSG91's `91…` form (MG8). */
  readonly to: string;
  /** MSG91's template id (24 hex) — held under the template's existing config key (MG4). */
  readonly templateId: string;
  /** The template's named values, in slot order — what MSG91 actually substitutes. ⛔ Empty (MG12). */
  readonly values: readonly SmsGatewayValue[];
  /**
   * The text the caller rendered through the real `t()` — the ORACLE the values were checked against. ⛔ Sent,
   * ⛔ logged (it may carry a name or a code).
   */
  readonly body: string;
  /**
   * The send's correlation id (6.37b DR3 — `<kind><row uuid hex>`, or `ot<random hex>` for a login code), sent as
   * MSG91's `CRQID` INSIDE the one recipient and echoed back in the delivery report. Absent ⇒ ⛔ `CRQID`. The core and
   * the OTP adapter always set it; one outside the grammar is refused locally (`bad_correlation_id` — defence only).
   */
  readonly correlationId?: string;
}

/** The global gateway client config the composition layer resolves (authkey = the resolved Secret VALUE). */
export interface SmsClientConfig {
  /** MSG91's API ORIGIN (`https://control.msg91.com`) — a bare origin, ⛔ a send URL (MG10). */
  readonly apiOrigin: string;
  /** The resolved authkey VALUE. Never logged. */
  readonly authkey: string;
}

/** The single global SMS client — builds + caches ONE messaging handle (no per-Pariwar dimension). */
export interface SmsAppClient {
  /** Return the one global messaging handle, building + caching it on first use (restart-required-on-rotation). */
  messaging(): SmsMessagingHandle;
  /**
   * Whether the global gateway credential (a non-blank authkey and origin) is present. The composition seam calls
   * this BEFORE `messaging()` so a missing credential degrades to the fixture rather than a thrown error. Never
   * touches the network.
   */
  isConfigured(): boolean;
}

/** One version of a MSG91 template, as `getTemplateVersions` returns it — every field type-tolerant (F16). */
export interface Msg91TemplateVersion {
  readonly templateData: string | null;
  readonly dltId: string | null;
  readonly senderId: string | null;
  readonly status: string | null;
  readonly activeStatus: string | null;
  readonly smsType: string | null;
  readonly dltVerified: string | null;
  readonly dltReason: string | null;
  readonly rejectReason: string | null;
}

/** What a template read found (MG5). */
export type Msg91TemplateRead =
  /** An authorised answer — the template's versions (possibly none). */
  | { readonly kind: 'versions'; readonly versions: readonly Msg91TemplateVersion[] }
  /** HTTP 401 — the key was refused (MSG91's documented sample, F16). */
  | { readonly kind: 'unauthorised' }
  /** MSG91's documented HTTP 200 `status:"error"` refusal — a bad key OR an unknown id; ⛔ distinguishable. */
  | { readonly kind: 'refused' }
  /**
   * No answer to rely on — network, timeout, 429, 5xx, an unparseable body, any OTHER non-2xx (a proxy's 404, a
   * 405, an undocumented 403), a 2xx error body MSG91 does ⛔ document (`status:"fail"`, a bare `hasError`), or a
   * reader with ⛔ usable config: ⛔ documented refusal, so it proves nothing about a send (review F2; round 2 P1 / P5).
   */
  | { readonly kind: 'unavailable'; readonly cause: Msg91ReadCause };

/** Why a template read gave ⛔ answer to rely on — carried into the pre-flight's log (round 2 P5). */
export type Msg91ReadCause =
  | 'network'
  | 'timeout'
  | 'throttled'
  | 'server'
  | 'unparseable'
  | 'unexpected_status'
  | 'unexpected_body'
  | 'config';

/** The template reader the pre-flight depends on — the real client implements it (⛔ a fake needs it). */
export interface Msg91TemplateReader {
  /** Read every version of one MSG91 template (`/api/v5/sms/getTemplateVersions`). Never throws. */
  readTemplateVersions(templateId: string): Promise<Msg91TemplateRead>;
}

/** The real MSG91 client: the send seam AND the template reader. */
export type Msg91Client = SmsAppClient & Msg91TemplateReader;

/** The minimal `fetch` shape the client depends on (injectable in tests; defaults to global `fetch`). */
export type SmsFetchLike = (url: string, init: SmsFetchInit) => Promise<SmsFetchResponse>;
export interface SmsFetchInit {
  method: string;
  headers: Record<string, string>;
  body: string;
  /** The client's own bound (MG9) — an abort is `api_unavailable:timeout`. */
  signal: AbortSignal;
  /**
   * ⛔ Follow a redirect (round 2 P6): the `authkey` header — unlike `Authorization` — is ⛔ stripped by fetch on a
   * cross-origin redirect, so following one could hand the key to another host. A redirect rejects ⇒ transport failure.
   */
  redirect: 'error';
}
export interface SmsFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

/**
 * A failure already classified — by the client itself, before or instead of MSG91's answer (a bad number, a timeout, a
 * success with ⛔ request id), or by a test's SYNTHETIC fixture (e.g. a `carrier_reject`, which MSG91 never answers
 * synchronously — MG7). Classified as-is (sms-errors.ts).
 */
export interface SmsLocalRefusal {
  readonly errorClass:
    | 'invalid_number'
    | 'dlt_template_not_approved'
    | 'carrier_reject'
    | 'rate_limited'
    | 'api_unavailable'
    | 'auth'
    | 'unknown';
  readonly code: string;
}

/**
 * A gateway send failure — carries MSG91's `code` (a string; MSG91 writes `"201"`, a number is stringified) + the HTTP
 * status so sms-errors.ts can classify without re-parsing, or a `local` refusal the client already classified.
 */
export class SmsSendError extends Error {
  public readonly name = 'SmsSendError';
  public constructor(
    message: string,
    /** MSG91's error `code` when the response carried one; null otherwise. */
    public readonly gatewayCode: string | null,
    /** The HTTP status (0 for a network failure with no response). */
    public readonly httpStatus: number,
    /** A refusal the client classified itself (a bad number, a timeout, a success with ⛔ request id …). */
    public readonly local: SmsLocalRefusal | null = null,
  ) {
    super(message);
  }
}

/** The client's own per-call bound (MG9) — 9 s, so it fires BEFORE the OTP path's 10 s outer bound. */
export const SMS_GATEWAY_TIMEOUT_MS = 9_000;

/** MSG91's API origin — the default in both apps (MG10). */
export const MSG91_DEFAULT_API_ORIGIN = 'https://control.msg91.com';

/** MSG91's template id: 24 hex characters (MG4) — a pasted 19-digit DLT TE id is caught by this. */
const MSG91_TEMPLATE_ID = /^[0-9a-fA-F]{24}$/;

/** A request id we accept from a `success`: non-empty, ≤ 64 alphanumerics (I3 — MSG91's are 24 lower-case hex). */
const MSG91_REQUEST_ID = /^[A-Za-z0-9]{1,64}$/;

/** Whether a value is a well-formed MSG91 template id (MG4). */
export function isMsg91TemplateId(value: string): boolean {
  return MSG91_TEMPLATE_ID.test(value);
}

/**
 * The configured gateway ORIGIN, or a thrown error (MG10): the value must be exactly an origin — an old-style send URL
 * (`…/send`) would otherwise yield `…/send/api/v5/flow`. Judged STRUCTURALLY (round 2 P9): trailing `/`s, a default
 * port (`:443`) and an upper-case host are the same origin and return its normalised form; a BLANK value is unset (the
 * MSG91 default — a compose `${VAR}` passthrough yields `''`). Throws a message naming the env var, ⛔ its value.
 */
export function parseSmsGatewayOrigin(raw: string): string {
  const value = raw.trim();
  if (value === '') return MSG91_DEFAULT_API_ORIGIN;
  let url: URL | null = null;
  try {
    url = new URL(value);
  } catch {
    url = null;
  }
  const bare =
    url !== null &&
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.username === '' &&
    url.password === '' &&
    /^\/+$/.test(url.pathname) &&
    url.search === '' &&
    url.hash === '' &&
    !/[?#]/.test(value);
  if (url === null || !bare) {
    throw new Error('sms-app: SMS_GATEWAY_API_URL must be a bare origin (e.g. https://control.msg91.com), ⛔ a path');
  }
  return url.origin;
}

/** Whether every required client-config field is present — the pure "not configured" predicate. */
function isClientConfigValid(config: SmsClientConfig): boolean {
  return Boolean(config.apiOrigin) && config.apiOrigin.trim() !== '' && Boolean(config.authkey) && config.authkey.trim() !== '';
}

/** Validate the client config BEFORE building — a missing credential fails clear, ⛔ as an opaque gateway error. */
function assertClientConfig(config: SmsClientConfig): string {
  if (!config.apiOrigin || config.apiOrigin.trim() === '') throw new Error('sms-app: gateway apiOrigin is missing/blank');
  if (!config.authkey || config.authkey.trim() === '') throw new Error('sms-app: gateway authkey is missing/blank');
  return parseSmsGatewayOrigin(config.apiOrigin);
}

/** A string, or a finite number stringified — MSG91 writes some fields as strings, others as numbers (F16). */
function stringOrNull(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

/** MSG91's error `code`, or null when there is none — a blank / whitespace code is NONE (round 2 P3; the pre-6.37 rule). */
function gatewayCodeOf(v: unknown): string | null {
  const code = stringOrNull(v);
  return code === null || code.trim() === '' ? null : code;
}

/** Read a property defensively (a hostile getter must never escape). */
function prop(payload: unknown, key: string): unknown {
  try {
    if (payload && typeof payload === 'object' && key in payload) return (payload as Record<string, unknown>)[key];
  } catch {
    // fall through
  }
  return undefined;
}

/** Whether an HTTP status itself says "try again" — a throttle or a server fault (MG6's status fallback). */
function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Read a response body (review F1). An abort of the client's bound while the body streams is a TIMEOUT — the same
 * class as an abort before the headers; a body that breaks for another reason is `body_read`; ⛔ JSON (a
 * `SyntaxError`) is `null`, as an empty body. The transport's text is ⛔ kept (it may echo the request).
 */
async function readBody(res: SmsFetchResponse, signal: AbortSignal): Promise<{ payload: unknown } | { failed: 'timeout' | 'body_read' }> {
  try {
    return { payload: await res.json() };
  } catch (err) {
    if (signal.aborted) return { failed: 'timeout' };
    if (err instanceof SyntaxError) return { payload: null };
    return { failed: 'body_read' };
  }
}

/** The two synchronous error messages MSG91 documents (SendOTP samples — `otp/module.json`; seen for Flow in T1). */
function tokenForMessage(message: unknown): SmsLocalRefusal | null {
  if (typeof message !== 'string') return null;
  if (/auth\s*key\s*missing/i.test(message)) return { errorClass: 'auth', code: 'authkey_missing' };
  if (/flow id or template id is invalid/i.test(message)) {
    return { errorClass: 'dlt_template_not_approved', code: 'template_invalid' };
  }
  return null;
}

/**
 * MSG91's `91XXXXXXXXXX` form of a recipient (MG8): the caller's E.164 `+91…`, validated by CALLING `normalizeMobile`
 * (⛔ a second regex) — a `to` it rejects, or that it would rewrite (⛔ already canonical), is ⛔ sent.
 */
function msg91Mobile(to: string): string | null {
  const canonical = encryption.normalizeMobile(to);
  if (canonical === null || canonical !== to) return null;
  return canonical.slice(1);
}

/**
 * The Flow body (F10, MG9): one recipient, `short_url` "0" ALWAYS, ⛔ `realTimeResponse`, ⛔ the text. The `CRQID`
 * (6.37b DR3) goes INSIDE the recipient — Flow's only documented sample (`recipients:[{mobiles, var, CRQID}]`); the
 * top-level form is the Text-SMS page's, ⛔ Flow's. UNVERIFIED until a real report echoes it (roster Row 33 (e0)).
 */
function buildFlowBody(
  templateId: string,
  mobiles: string,
  values: readonly SmsGatewayValue[],
  correlationId: string | undefined,
): string {
  const recipient: Record<string, string> = { mobiles };
  for (const { name, value } of values) recipient[name] = value;
  if (correlationId !== undefined) recipient.CRQID = correlationId;
  return JSON.stringify({ template_id: templateId, short_url: '0', recipients: [recipient] });
}

/** The recipient keys a template value may ⛔ take — the number, and the correlation id (6.37b DR3). */
const RESERVED_RECIPIENT_KEYS: ReadonlySet<string> = new Set(['mobiles', 'CRQID']);

/** Refuse a message before the network when it cannot be what MSG91 should send (MG4, MG8, MG12). */
function localRefusal(message: SmsGatewayMessage): SmsLocalRefusal | null {
  if (!isMsg91TemplateId(message.templateId)) {
    return { errorClass: 'dlt_template_not_approved', code: 'template_id_malformed' };
  }
  if (message.values.length === 0) return { errorClass: 'dlt_template_not_approved', code: 'no_named_values' };
  const names = new Set<string>();
  for (const { name } of message.values) {
    // `mobiles` and `CRQID` are the recipient's own fields — a value of either name would overwrite the number or the
    // correlation id.
    if (RESERVED_RECIPIENT_KEYS.has(name) || names.has(name)) {
      return { errorClass: 'dlt_template_not_approved', code: 'values_mismatch' };
    }
    names.add(name);
  }
  // Defence only (6.37b DR3): the claim-text core validates the id BEFORE the send and crashes on a bad one; this keeps a
  // malformed id ⛔ the wire whatever the caller.
  if (message.correlationId !== undefined && !smsDelivery.isSmsCorrelationId(message.correlationId)) {
    return { errorClass: 'dlt_template_not_approved', code: 'bad_correlation_id' };
  }
  return null;
}

/** Options the tests drive: the per-call bound's signal factory (MG9 — `AbortSignal.timeout` by default). */
export interface SmsClientOptions {
  readonly timeoutSignal?: (ms: number) => AbortSignal;
}

/**
 * Build a fresh global MSG91 client. One per process (the composition layer holds it). `fetchImpl` defaults to the
 * global `fetch`; tests inject a fake so NO network is touched (I7). The config (incl. the authkey) is captured ONCE.
 */
export function createSmsAppClient(
  config: SmsClientConfig,
  fetchImpl: SmsFetchLike = globalFetch,
  options: SmsClientOptions = {},
): Msg91Client {
  const timeoutSignal = options.timeoutSignal ?? ((ms: number) => AbortSignal.timeout(ms));
  let cached: SmsMessagingHandle | null = null;

  const headers = (): Record<string, string> => ({
    authkey: config.authkey,
    'content-type': 'application/json',
    accept: 'application/json',
  });

  return {
    isConfigured() {
      return isClientConfigValid(config);
    },

    messaging() {
      if (cached) return cached;
      const origin = assertClientConfig(config);
      const url = `${origin}/api/v5/flow`;
      cached = {
        async send(message): Promise<string> {
          // The bound starts NOW, synchronously, before any await (MG9) — so it is deterministic under the OTP's 10 s.
          const signal = timeoutSignal(SMS_GATEWAY_TIMEOUT_MS);
          const refused = localRefusal(message);
          if (refused) throw new SmsSendError('sms send refused locally', null, -1, refused);
          const mobiles = msg91Mobile(message.to);
          if (mobiles === null) {
            throw new SmsSendError('sms send refused locally', null, -1, { errorClass: 'invalid_number', code: 'format' });
          }

          let res: SmsFetchResponse;
          try {
            res = await fetchImpl(url, {
              method: 'POST',
              headers: headers(),
              body: buildFlowBody(message.templateId, mobiles, message.values, message.correlationId),
              signal,
              redirect: 'error',
            });
          } catch {
            // ⛔ the error's message in ours — a transport error may echo the request.
            if (signal.aborted) {
              throw new SmsSendError('sms send timed out', null, 0, { errorClass: 'api_unavailable', code: 'timeout' });
            }
            throw new SmsSendError('sms send transport failure', null, 0);
          }

          const body = await readBody(res, signal);
          if ('failed' in body) {
            if (body.failed === 'timeout') {
              throw new SmsSendError('sms send timed out', null, 0, { errorClass: 'api_unavailable', code: 'timeout' });
            }
            // A 2xx whose body broke may have been taken ⇒ ⛔ final; a non-2xx keeps its status (the unparseable rule).
            if (res.ok) {
              throw new SmsSendError('sms send body unreadable', null, res.status, { errorClass: 'api_unavailable', code: 'body_read' });
            }
          }
          const payload = 'payload' in body ? body.payload : null;

          const type = prop(payload, 'type');
          const gatewayCode = gatewayCodeOf(prop(payload, 'code'));
          if (res.ok && type === 'success') {
            const id = prop(payload, 'message');
            if (typeof id === 'string' && MSG91_REQUEST_ID.test(id)) return id;
            // A success with ⛔ usable request id is ⛔ an acceptance we can honour (I3) — ⛔ a fabricated id.
            throw new SmsSendError('sms send success without a request id', null, res.status, {
              errorClass: 'unknown',
              code: 'no_request_id',
            });
          }
          if (type === 'error' || !res.ok) {
            if (gatewayCode !== null) {
              throw new SmsSendError(`sms send rejected by gateway (HTTP ${res.status})`, gatewayCode, res.status);
            }
            // MG6's order for a code-less answer: the HTTP status, then the two documented messages. A 429 / 5xx stays
            // transient whatever its message says (review F3); a 401 / 403 is `auth` whatever its message says (round 2
            // P3) — the documented 401 "Auth Key missing" only names its code (Debug Log (b)).
            if (isTransientStatus(res.status)) {
              throw new SmsSendError(`sms send rejected by gateway (HTTP ${res.status})`, null, res.status);
            }
            const byMessage = tokenForMessage(prop(payload, 'message'));
            if (res.status === 401 || res.status === 403) {
              const local = byMessage?.errorClass === 'auth' ? byMessage : null;
              throw new SmsSendError(`sms send rejected by gateway (HTTP ${res.status})`, null, res.status, local);
            }
            if (byMessage) throw new SmsSendError('sms send rejected by gateway', null, res.status, byMessage);
            if (!res.ok) throw new SmsSendError(`sms send rejected by gateway (HTTP ${res.status})`, null, res.status);
            throw new SmsSendError('sms send rejected by gateway', null, res.status, {
              errorClass: 'unknown',
              code: 'msg91_error',
            });
          }
          // A 2xx with neither `success` nor `error` — ⛔ an acceptance.
          throw new SmsSendError('sms send answered without a type', null, res.status, { errorClass: 'unknown', code: 'no_type' });
        },
      };
      return cached;
    },

    async readTemplateVersions(templateId): Promise<Msg91TemplateRead> {
      const signal = timeoutSignal(SMS_GATEWAY_TIMEOUT_MS);
      let origin: string;
      try {
        origin = assertClientConfig(config);
      } catch {
        // ⛔ usable config is ⛔ MSG91's refusal — ⛔ call is made, so it proves nothing (round 2 P5).
        return { kind: 'unavailable', cause: 'config' };
      }
      let res: SmsFetchResponse;
      try {
        res = await fetchImpl(`${origin}/api/v5/sms/getTemplateVersions`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ template_id: templateId }),
          signal,
          redirect: 'error',
        });
      } catch {
        return { kind: 'unavailable', cause: signal.aborted ? 'timeout' : 'network' };
      }
      // Only MSG91's DOCUMENTED refusals are definite (F16): HTTP 401, and the 200 `status:"error"` below. Any other
      // non-2xx — a proxy's 404, a 405 / 408, an undocumented 403 — proves nothing about a SEND (review F2), so the
      // callers treat it as a transient: the holding sweeps hold, 6.19b/c/d fail open, the api starts.
      if (res.status === 401) return { kind: 'unauthorised' };
      if (res.status === 429) return { kind: 'unavailable', cause: 'throttled' };
      if (res.status >= 500) return { kind: 'unavailable', cause: 'server' };
      if (!res.ok) return { kind: 'unavailable', cause: 'unexpected_status' };
      const body = await readBody(res, signal);
      if ('failed' in body) return { kind: 'unavailable', cause: body.failed === 'timeout' ? 'timeout' : 'network' };
      const payload = body.payload;
      if (payload === null) return { kind: 'unavailable', cause: 'unparseable' };
      // Only the DOCUMENTED 200 `status:"error"` is a refusal (F16, MG5's `auth_or_not_found`). Any other error-looking
      // 2xx — `status:"fail"` (documented only on the 401), a bare `hasError` — proves nothing (round 2 P1).
      const hasError = prop(payload, 'hasError');
      const status = prop(payload, 'status');
      if (status === 'error') return { kind: 'refused' };
      if (hasError === true || hasError === 'true' || status === 'fail') return { kind: 'unavailable', cause: 'unexpected_body' };
      const data = prop(payload, 'data');
      if (!Array.isArray(data)) return { kind: 'unavailable', cause: 'unparseable' };
      return {
        kind: 'versions',
        versions: data.map((v: unknown) => ({
          templateData: stringOrNull(prop(v, 'template_data')),
          dltId: stringOrNull(prop(v, 'DLT_ID')),
          senderId: stringOrNull(prop(v, 'sender_id')),
          status: stringOrNull(prop(v, 'status')),
          activeStatus: stringOrNull(prop(v, 'active_status')),
          smsType: stringOrNull(prop(v, 'sms_type')),
          dltVerified: stringOrNull(prop(v, 'dlt_verified')),
          dltReason: stringOrNull(prop(v, 'dlt_reason')),
          rejectReason: stringOrNull(prop(v, 'reject_reason')),
        })),
      };
    },
  };
}

/** The global fetch, adapted to `SmsFetchLike`. Isolated so the default is trivially swappable in tests. */
const globalFetch: SmsFetchLike = (url, init) => fetch(url, init as RequestInit) as unknown as Promise<SmsFetchResponse>;
