// The STAFF EMAIL PORT — the stack's first email (Story 6.25, Task 4.1; AC3, AC4 (ix), AC6, AC7; `2026-10-09-299` RE5-bis, RE6,
// RE7; ADR-0040). A provider-agnostic port with TWO real `fetch` adapters and a fake:
//   · `createSesStaffEmailClient`       — AWS SES v2 (`ap-south-1` by default), SigV4-signed by `aws4fetch` 1.0.20;
//   · `createZeptoMailStaffEmailClient` — Zoho ZeptoMail (renamed *Zoho CPaaS* 2026-09-23), `Zoho-enczapikey` auth;
//   · `createFakeStaffEmailClient`      — tests (captures `to`; scripted results).
// One is selected per environment by `STAFF_EMAIL_PROVIDER` (`staff-email-config.ts`). ⛔ A `@twt/channels` provider, ⛔
// `dispatch()`, ⛔ a new package — [[feedback_no_premature_package]]: the port stays here until a SECOND consumer is built.
//
// ⭐ PLAIN TEXT ONLY, UTF-8 (⛔ HTML ⇒ ⛔ tracking pixel, ⛔ link rewriting). SES: `Charset: 'UTF-8'` on the subject AND the body
// (SES defaults to 7-bit ASCII — the Hindi would be mangled). ZeptoMail: the JSON body's own UTF-8; `track_opens` /
// `track_clicks` false on every send.
// ⭐ CLASSIFICATION IS BY THE PROVIDER'S ERROR NAME, ⛔ never by HTTP status alone (SES returns a paused account, the sandbox and
// an unverified MAIL FROM domain as 400s — a status-based `4xx ⇒ rejected` would spend once-ever rows during a fault fixed the
// next day). Three classes, the tables re-verified against the providers' CURRENT docs on 2026-10-09 (`-299` §3; the story's
// Dev Agent Record):
//   · TRANSIENT — retry, ⛔ alarm;
//   · HELD — an account / config fault, AND ANY name ⛔ in the table: transient (`held:<name>`), ⛔ EVER a final row; the caller
//     alarms once per distinct fault per row;
//   · `rejected` — ONLY a name the table records as recipient-specific (SES: ⛔ none; ZeptoMail: `TM_4001.SM_113` targeting `to`).
// ⭐ RE5-bis — `mayHaveSent` is keyed on the STATUS, independently of the name class: an SES 5xx / 408, a ZeptoMail 5xx, a
// timeout or a dropped connection MAY have followed an accept (AWS documents it; SES has ⛔ idempotency token) — the caller
// records it on the row and alarms on the eventual finish.
// ⭐ ⛔ Provider MESSAGE text is ever read into a result: SES error messages LIST identities (addresses). A result carries a
// fixed-vocabulary `detail` (`claim.suspicionStaffEmailDetail`) and nothing else — ⛔ the request, ⛔ the response body.
// ⚠ `aws4fetch` signs ONLY (`AwsClient.sign` → a `Request`); the injectable `fetch` sends — so ⛔ library retry can ever re-send
// unseen (its own `fetch` retries a 5xx / 429 up to 10 times by default; the client is ALSO built with `retries: 0`).
// ⚠ Deps are declared LOCALLY (⛔ a type-only → value import cycle with the sweep — [[project_type_only_import_cycle_trap]]).

import { claim as claimDomain } from '@twt/domain';
import { AwsClient } from 'aws4fetch';

/** A send is abandoned after this — `transient:timeout`, which MAY have sent (RE5-bis). */
export const STAFF_EMAIL_SEND_TIMEOUT_MS = 10_000;

export type StaffEmailProvider = 'ses' | 'zeptomail' | 'fake' | 'none';

/** ONE plain-text email. `reference` = the row's `notice_id` (a correlation tag — ⛔ an idempotency key on either provider). */
export interface StaffEmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly reference: string;
}

/** What one send came to (the `sendClaimDltSms` result shape). ⛔ A provider-driven final `error` (`-299` §3). */
export type StaffEmailSendResult =
  | { readonly kind: 'final'; readonly outcome: 'accepted'; readonly providerMessageId: string | null }
  | { readonly kind: 'final'; readonly outcome: 'rejected'; readonly detail: string }
  | {
      readonly kind: 'transient';
      readonly detail: string;
      /** An account / config fault (or an unrecognised name) — ⛔ final; alarmed once per distinct fault per row. */
      readonly held: boolean;
      /** RE5-bis — the provider MAY have accepted it. */
      readonly mayHaveSent: boolean;
    };

export type StaffEmailPreflight = { readonly ok: true } | { readonly ok: false; readonly detail: string };

export interface StaffEmailClient {
  readonly provider: StaffEmailProvider;
  /** `null` when ready to send; else WHY not (a fixed `config:*` word — ⛔ a secret, ⛔ a value). */
  configGap(): string | null;
  /** A cheap account check before ANY row is written (RE7). A failure of the check itself also HOLDS. */
  preflight(opts?: { readonly timeoutMs?: number }): Promise<StaffEmailPreflight>;
  send(msg: StaffEmailMessage, opts?: { readonly timeoutMs?: number }): Promise<StaffEmailSendResult>;
}

type FetchLike = (input: Request | string, init?: RequestInit) => Promise<Response>;

const detail = claimDomain.suspicionStaffEmailDetail;

/** A failure BEFORE a response — a timeout or a dropped connection. Both MAY have sent (the request may have been written). */
function failureBeforeResponse(err: unknown): StaffEmailSendResult {
  const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
  return { kind: 'transient', detail: detail({ kind: 'transient', name: timedOut ? 'timeout' : 'network' }), held: false, mayHaveSent: true };
}

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const v: unknown = await res.json();
    return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

// ── AWS SES v2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** SES — TRANSIENT names (the rest of the transient class is status-keyed: `http_5xx`, `http_429`). */
export const SES_TRANSIENT_ERROR_NAMES: ReadonlySet<string> = new Set([
  'TooManyRequestsException',
  'ThrottlingException',
  'InternalFailure',
  'ServiceUnavailable',
  'RequestTimeoutException',
]);
/**
 * SES — the HELD names the table records (an account / config fault). ⚠ Documentation only: ANY name ⛔ in the transient set is
 * held anyway (⛔ a default-to-final) — this list is what the table SAYS, pinned by a test.
 */
export const SES_HELD_ERROR_NAMES: ReadonlySet<string> = new Set([
  'AccountSuspendedException',
  'SendingPausedException',
  'MailFromDomainNotVerifiedException',
  'MessageRejected',
  'NotFoundException',
  'LimitExceededException',
  'BadRequestException',
  'AccessDeniedException',
  'ExpiredTokenException',
  'IncompleteSignature',
  'MissingAuthenticationTokenException',
  'NotAuthorized',
  'OptInRequired',
  'UnrecognizedClientException',
  'ValidationError',
  'MalformedHttpRequestException',
  'RequestAbortedException',
  'RequestEntityTooLargeException',
  'UnknownOperationException',
]);
/** SES — recipient-specific names ⇒ `rejected`. ⛔ NONE: `accepted` ⛔ means delivered; a bounce arrives later (⛔ ingested). */
export const SES_REJECTED_ERROR_NAMES: ReadonlySet<string> = new Set();

/**
 * The SES v2 error NAME (restJson1): the `x-amzn-ErrorType` header, else the body's `__type`, else its `code` — each sanitised to
 * the part before the first `:` and after the first `#`. ⛔ Name at all ⇒ `http_<status>`.
 */
export function sesErrorName(status: number, headers: Headers, body: Record<string, unknown> | null): string {
  const raw = str(headers.get('x-amzn-errortype')) ?? str(body?.['__type']) ?? str(body?.['code']);
  if (raw === null) return `http_${String(status)}`;
  const beforeColon = raw.split(':')[0]!;
  const hash = beforeColon.indexOf('#');
  return hash >= 0 ? beforeColon.slice(hash + 1) : beforeColon;
}

/** ⭐ The SES classification — by NAME; `mayHaveSent` by STATUS (RE5-bis: a 5xx or a 408). */
export function classifySesFailure(status: number, name: string): StaffEmailSendResult {
  const mayHaveSent = status >= 500 || status === 408;
  if (SES_REJECTED_ERROR_NAMES.has(name)) return { kind: 'final', outcome: 'rejected', detail: detail({ kind: 'rejected', http: status, name }) };
  const transient = SES_TRANSIENT_ERROR_NAMES.has(name) || (name === `http_${String(status)}` && (status >= 500 || status === 429));
  if (transient) return { kind: 'transient', detail: detail({ kind: 'transient', name }), held: false, mayHaveSent };
  return { kind: 'transient', detail: detail({ kind: 'held', name }), held: true, mayHaveSent };
}

export interface SesStaffEmailClientOpts {
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly from: string;
  readonly configurationSet?: string | null;
  readonly fetch?: FetchLike;
  /** Why the client is ⛔ configured despite being built (e.g. an unresolvable secret — RE7 A). */
  readonly gap?: string | null;
}

/** ⭐ (A) AWS SES v2. */
export function createSesStaffEmailClient(o: SesStaffEmailClientOpts): StaffEmailClient {
  const fetchImpl: FetchLike = o.fetch ?? ((input, init) => fetch(input, init));
  const base = `https://email.${o.region}.amazonaws.com/v2/email`;
  const gap = (): string | null => {
    if (o.gap) return o.gap;
    if (!/^[a-z]{2}-[a-z]+-\d$/.test(o.region)) return 'config:ses_region_invalid';
    if (o.accessKeyId.trim() === '' || o.secretAccessKey.trim() === '') return 'config:credentials_missing';
    if (o.from.trim() === '') return 'config:sender_missing';
    return null;
  };
  // ⭐ Trimmed (round 3) — a Secret Manager payload's trailing newline would otherwise land in the signature / header.
  const aws = new AwsClient({
    accessKeyId: o.accessKeyId.trim(),
    secretAccessKey: o.secretAccessKey.trim(),
    service: 'ses',
    region: o.region,
    retries: 0,
  });

  /** Sign ONLY — a throw here means ⛔ request exists (⛔ "may have sent"); the caller classifies it apart from the fetch. */
  async function sign(path: string, init: RequestInit): Promise<Request | null> {
    try {
      return await aws.sign(`${base}${path}`, init);
    } catch {
      return null;
    }
  }

  return {
    provider: 'ses',
    configGap: gap,
    async preflight(opts = {}) {
      if (gap() !== null) return { ok: false, detail: gap()! };
      const request = await sign('/account', { method: 'GET' });
      if (request === null) return { ok: false, detail: 'preflight:sign_failed' };
      let res: Response;
      try {
        res = await fetchImpl(request, { signal: AbortSignal.timeout(opts.timeoutMs ?? STAFF_EMAIL_SEND_TIMEOUT_MS) });
      } catch {
        return { ok: false, detail: 'preflight:unreachable' };
      }
      const body = await readJson(res);
      if (!res.ok) return { ok: false, detail: `preflight:${claimDomain.sanitizeProviderErrorName(sesErrorName(res.status, res.headers, body))}` };
      if (body?.['SendingEnabled'] !== true) return { ok: false, detail: 'preflight:sending_disabled' };
      if (body?.['ProductionAccessEnabled'] !== true) return { ok: false, detail: 'preflight:sandbox' };
      return { ok: true };
    },
    async send(msg, opts = {}) {
      if (gap() !== null) return { kind: 'transient', detail: detail({ kind: 'held', name: 'not_configured' }), held: true, mayHaveSent: false };
      const payload: Record<string, unknown> = {
        FromEmailAddress: o.from,
        Destination: { ToAddresses: [msg.to] },
        Content: {
          Simple: {
            Subject: { Data: msg.subject, Charset: 'UTF-8' },
            Body: { Text: { Data: msg.text, Charset: 'UTF-8' } },
          },
        },
        EmailTags: [{ Name: 'notice_id', Value: msg.reference }],
      };
      if (o.configurationSet) payload['ConfigurationSetName'] = o.configurationSet;
      const request = await sign('/outbound-emails', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      // ⭐ Round 3 — a signing failure is a CONFIG fault (e.g. a malformed secret) with ⛔ request written ⇒ HELD, ⛔ may-have-sent.
      if (request === null) return { kind: 'transient', detail: detail({ kind: 'held', name: 'sign_failed' }), held: true, mayHaveSent: false };
      let res: Response;
      try {
        res = await fetchImpl(request, { signal: AbortSignal.timeout(opts.timeoutMs ?? STAFF_EMAIL_SEND_TIMEOUT_MS) });
      } catch (err) {
        return failureBeforeResponse(err);
      }
      const body = await readJson(res);
      if (res.ok) return { kind: 'final', outcome: 'accepted', providerMessageId: str(body?.['MessageId']) };
      return classifySesFailure(res.status, sesErrorName(res.status, res.headers, body));
    },
  };
}

// ── Zoho ZeptoMail (Zoho CPaaS) ──────────────────────────────────────────────────────────────────────────────────────────

/** ZeptoMail — TRANSIENT names (besides any 5xx and a 429, status-keyed). */
export const ZEPTOMAIL_TRANSIENT_ERROR_NAMES: ReadonlySet<string> = new Set(['TM_3601.SMI_115']);
/** ZeptoMail — the HELD names the table records (documentation; ANY other name is held anyway). */
export const ZEPTOMAIL_HELD_ERROR_NAMES: ReadonlySet<string> = new Set([
  'TM_3501.LE_101',
  'TM_5001.LE_102',
  'TM_3601.SERR_156',
  'TM_3601.SM_133',
  'TM_3601.AE_101',
  'TM_4001.SM_111',
  'TM_4001.SM_128',
  'TM_4001.SERR_157',
  'TM_3201.GE_102',
  'TM_3301.SM_101',
  'TM_3301.SM_120',
  'TM_3501.UE_106',
  'TM_3501.MTR_101',
  'TM_8001.SM_127',
  'TM_8001.SM_129',
]);
/** ZeptoMail — the ONE recipient-specific name: an invalid address IN THE `to` FIELD (`details[].target`). */
export const ZEPTOMAIL_REJECTED_NAME = 'TM_4001.SM_113';

/** The ZeptoMail error NAME `<code>.<sub-code>` (`error.code` / `error.details[0].code`; also `data.error_code`) + the target. */
export function zeptoMailErrorName(status: number, body: Record<string, unknown> | null): { readonly name: string; readonly target: string | null } {
  const error = (body?.['error'] ?? null) as Record<string, unknown> | null;
  const data = (body?.['data'] ?? null) as Record<string, unknown> | null;
  const details = Array.isArray(error?.['details']) ? (error['details'] as Record<string, unknown>[]) : [];
  const code = str(error?.['code']) ?? str(data?.['error_code']);
  const sub = str(details[0]?.['code']);
  const target = str(details[0]?.['target']);
  if (code === null) return { name: `http_${String(status)}`, target: null };
  return { name: sub === null ? code : `${code}.${sub}`, target };
}

/**
 * ⭐ The ZeptoMail classification — by NAME (and `to` target for the one rejected name); `mayHaveSent` on any 5xx. "Any 5xx" is
 * transient by STATUS (the table); a 429 only when it is NAMELESS (`http_429`) — a NAMED 429 (e.g. `TM_3601.SM_133`, a trial
 * limit) keeps its own class, so a HELD code is alarmed (round 3; RE6: by NAME, ⛔ status alone).
 */
export function classifyZeptoMailFailure(status: number, name: string, target: string | null): StaffEmailSendResult {
  const mayHaveSent = status >= 500;
  if (name === ZEPTOMAIL_REJECTED_NAME && target === 'to') {
    return { kind: 'final', outcome: 'rejected', detail: detail({ kind: 'rejected', http: status, name }) };
  }
  if (ZEPTOMAIL_TRANSIENT_ERROR_NAMES.has(name) || status >= 500 || name === 'http_429') {
    return { kind: 'transient', detail: detail({ kind: 'transient', name }), held: false, mayHaveSent };
  }
  return { kind: 'transient', detail: detail({ kind: 'held', name }), held: true, mayHaveSent };
}

export interface ZeptoMailStaffEmailClientOpts {
  /** An `https://` origin — default `https://cpaas.zoho.in` (the India data centre). */
  readonly host: string;
  readonly token: string;
  readonly from: string;
  readonly fetch?: FetchLike;
  readonly gap?: string | null;
}

/** ⭐ (B) Zoho ZeptoMail. */
export function createZeptoMailStaffEmailClient(o: ZeptoMailStaffEmailClientOpts): StaffEmailClient {
  const fetchImpl: FetchLike = o.fetch ?? ((input, init) => fetch(input, init));
  const gap = (): string | null => {
    if (o.gap) return o.gap;
    if (!/^https:\/\/[A-Za-z0-9.-]+$/.test(o.host)) return 'config:zeptomail_host_invalid';
    if (o.token.trim() === '') return 'config:credentials_missing';
    if (o.from.trim() === '') return 'config:sender_missing';
    return null;
  };
  // The console shows the key WITH its scheme; accept either form.
  const authorization = (): string => (/^Zoho-enczapikey\s/i.test(o.token.trim()) ? o.token.trim() : `Zoho-enczapikey ${o.token.trim()}`);
  return {
    provider: 'zeptomail',
    configGap: gap,
    // ⛔ An account / ping endpoint usable with the send key exists (the log APIs need OAuth) — a RECORDED no-op (`-299` §3).
    async preflight() {
      return gap() === null ? { ok: true } : { ok: false, detail: gap()! };
    },
    async send(msg, opts = {}) {
      if (gap() !== null) return { kind: 'transient', detail: detail({ kind: 'held', name: 'not_configured' }), held: true, mayHaveSent: false };
      let res: Response;
      try {
        res = await fetchImpl(`${o.host}/v1.1/email`, {
          method: 'POST',
          headers: { 'content-type': 'application/json; charset=utf-8', accept: 'application/json', authorization: authorization() },
          body: JSON.stringify({
            from: { address: o.from },
            to: [{ email_address: { address: msg.to } }],
            subject: msg.subject,
            textbody: msg.text,
            track_opens: false,
            track_clicks: false,
            client_reference: msg.reference,
          }),
          signal: AbortSignal.timeout(opts.timeoutMs ?? STAFF_EMAIL_SEND_TIMEOUT_MS),
        });
      } catch (err) {
        return failureBeforeResponse(err);
      }
      const body = await readJson(res);
      if (res.ok) return { kind: 'final', outcome: 'accepted', providerMessageId: str(body?.['request_id']) };
      const { name, target } = zeptoMailErrorName(res.status, body);
      return classifyZeptoMailFailure(res.status, name, target);
    },
  };
}

// ── The unconfigured client and the fake ────────────────────────────────────────────────────────────────────────────────

/** `STAFF_EMAIL_PROVIDER` unset / unknown, or a provider whose config failed to resolve — every send HELD (RE7). */
export function createUnconfiguredStaffEmailClient(gapWord: string): StaffEmailClient {
  return {
    provider: 'none',
    configGap: () => gapWord,
    preflight: () => Promise.resolve({ ok: false, detail: gapWord }),
    send: () => Promise.resolve({ kind: 'transient', detail: detail({ kind: 'held', name: 'not_configured' }), held: true, mayHaveSent: false }),
  };
}

export interface FakeStaffEmailClient extends StaffEmailClient {
  /** Every message the "provider" received — the ONLY place a test may find the address (AC7). */
  readonly sent: StaffEmailMessage[];
  /** Mutable knobs. */
  readonly state: {
    gap: string | null;
    preflight: StaffEmailPreflight;
    respond: (msg: StaffEmailMessage) => StaffEmailSendResult | Promise<StaffEmailSendResult>;
  };
}

/** TESTS — a scripted provider. Default: configured, pre-flight ok, every send `accepted`. */
export function createFakeStaffEmailClient(): FakeStaffEmailClient {
  const sent: StaffEmailMessage[] = [];
  let n = 0;
  const state: FakeStaffEmailClient['state'] = {
    gap: null,
    preflight: { ok: true },
    respond: () => ({ kind: 'final', outcome: 'accepted', providerMessageId: `fake-${String((n += 1))}` }),
  };
  return {
    provider: 'fake',
    sent,
    state,
    configGap: () => state.gap,
    preflight: () => Promise.resolve(state.gap === null ? state.preflight : { ok: false, detail: state.gap }),
    async send(msg) {
      sent.push(msg);
      return state.respond(msg);
    },
  };
}

// ── The address (⛔ ever logged) ─────────────────────────────────────────────────────────────────────────────────────────

const ATOM = "[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+";
const LABEL = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?';
/** RFC 5321 dot-atom `local@domain` — ⛔ quoted / display-name / list syntax (`"`, `<`, `>`, `,`, `;`, …), ⛔ empty or doubled dots. */
const DOT_ATOM_ADDRESS = new RegExp(`^${ATOM}(?:\\.${ATOM})*@${LABEL}(?:\\.${LABEL})+$`);

/**
 * A syntactically sendable ASCII address (the provider decides the rest). ⛔ Used on a value that is ever logged.
 * ⭐ Round 3 — a DOT-ATOM only: `[\x21-\x7e]` used to admit `"x"<other@host.com>` (a provider may route display-name syntax to
 * the OTHER mailbox) and `a,b@x.com` (⇒ a HELD `BadRequestException` for three days).
 */
export function isSendableEmailAddress(address: string): boolean {
  const at = address.lastIndexOf('@');
  // ⭐ Round 4 — EVERY domain label (the last included) is ⛔ hyphen-edged; the last is ≥ 2 characters.
  return address.length <= 254 && at > 0 && at <= 64 && DOT_ATOM_ADDRESS.test(address) && address.length - address.lastIndexOf('.') - 1 >= 2;
}
