// Story 6.25 (Task 4; AC3, AC4 (ix), AC6, AC7; `2026-10-09-299` RE5-bis, RE6, RE7, RE9) — the staff email PORT, its two adapters,
// its config and its template, WITHOUT a network: an injected `fetch` captures every request and scripts every response.
//
//   · SES v2 — the request (host, path, SigV4 `ses` signature, `Charset: 'UTF-8'` on subject AND body, ⛔ HTML part, the
//     `notice_id` tag), `accepted` ⇒ `MessageId`; the error NAME (header ⇒ `__type` ⇒ `code`, sanitised) and EVERY row of the
//     recorded table — transient / HELD (incl. 400 `MessageRejected` / `SendingPausedException` and a 403) / ⛔ `rejected` — an
//     UNRECOGNISED name HELD; RE5-bis `mayHaveSent` by STATUS; a body that ECHOES the address ⛔ reaches the detail; the
//     pre-flight (sending disabled, sandbox, a failing call);
//   · ZeptoMail — the request (`Zoho-enczapikey`, tracking off, `client_reference`), `accepted` ⇒ `request_id`; the table — the ONE
//     `rejected` (`TM_4001.SM_113` targeting `to`), held, transient, `data.error_code`; the recorded no-op pre-flight;
//   · the config (RE7 A — an unresolvable secret HOLDS + one boot alarm, ⛔ throws) and `ADMIN_APP_ORIGIN`;
//   · the template (AC3) — Hindi then English through the REAL `t()`, the ONLY variable `{link}`, a type-level guard.

import { describe, expect, it } from 'vitest';

import {
  SES_HELD_ERROR_NAMES,
  SES_REJECTED_ERROR_NAMES,
  SES_TRANSIENT_ERROR_NAMES,
  ZEPTOMAIL_HELD_ERROR_NAMES,
  classifySesFailure,
  createSesStaffEmailClient,
  createUnconfiguredStaffEmailClient,
  createZeptoMailStaffEmailClient,
  isSendableEmailAddress,
  sesErrorName,
  type StaffEmailMessage,
} from '../src/scheduler/staff-email-client.js';
import { buildStaffEmailClient, resolveAdminAppOrigin } from '../src/scheduler/staff-email-config.js';
import {
  renderSuspicionStaffEmail,
  suspicionStaffEmailLink,
  type SuspicionStaffEmailParams,
} from '../src/scheduler/suspicion-staff-email-templates.js';

const ADDRESS = 'priya.admin@example.org';
const MSG: StaffEmailMessage = { to: ADDRESS, subject: 'संदेह / subject', text: 'नमस्ते body', reference: '7f3c2a10-0000-4000-8000-000000000001' };

interface Captured {
  url: string;
  method: string;
  headers: Headers;
  body: string;
}

/** A scripted `fetch`: records the request (a signed `Request` or a URL + init) and answers with `respond`. */
function fakeFetch(respond: (c: Captured) => Response | Promise<Response>) {
  const calls: Captured[] = [];
  const fn = async (input: Request | string, init?: RequestInit): Promise<Response> => {
    const c: Captured =
      typeof input === 'string'
        ? { url: input, method: init?.method ?? 'GET', headers: new Headers(init?.headers), body: String(init?.body ?? '') }
        : { url: input.url, method: input.method, headers: input.headers, body: await input.clone().text() };
    calls.push(c);
    return respond(c);
  };
  return { fn, calls };
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const ses = (respond: (c: Captured) => Response | Promise<Response>) => {
  const f = fakeFetch(respond);
  const client = createSesStaffEmailClient({ region: 'ap-south-1', accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'secret', from: 'noreply@twt.example', fetch: f.fn });
  return { client, calls: f.calls };
};

const sesError = (status: number, name: string, message = `Email address is not verified: ${ADDRESS}`) =>
  json(status, { message }, { 'x-amzn-errortype': `${name}:http://internal.amazon.com/coral/com.amazonaws.sesv2/` });

describe('AWS SES v2 adapter', () => {
  it('⭐ the request: ap-south-1 outbound-emails, SigV4 `ses`, UTF-8 on subject AND body, ⛔ HTML, the notice tag; accepted ⇒ MessageId', async () => {
    const { client, calls } = ses(() => json(200, { MessageId: 'ses-msg-1' }));
    expect(await client.send(MSG)).toEqual({ kind: 'final', outcome: 'accepted', providerMessageId: 'ses-msg-1' });
    expect(calls).toHaveLength(1);
    const c = calls[0]!;
    expect(c.method).toBe('POST');
    expect(c.url).toBe('https://email.ap-south-1.amazonaws.com/v2/email/outbound-emails');
    expect(c.headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/ap-south-1\/ses\/aws4_request/);
    const body = JSON.parse(c.body);
    expect(body.Content.Simple.Subject).toEqual({ Data: MSG.subject, Charset: 'UTF-8' });
    expect(body.Content.Simple.Body).toEqual({ Text: { Data: MSG.text, Charset: 'UTF-8' } });
    expect(body.Content.Simple.Body.Html).toBeUndefined();
    expect(body.Destination).toEqual({ ToAddresses: [ADDRESS] });
    expect(body.EmailTags).toEqual([{ Name: 'notice_id', Value: MSG.reference }]);
    expect(body.ConfigurationSetName).toBeUndefined();
  });

  it('the error NAME — the header, else `__type`, else `code`; sanitised (`:` and `#`); ⛔ name ⇒ `http_<status>`', () => {
    expect(sesErrorName(400, new Headers({ 'x-amzn-errortype': 'MessageRejected:http://internal.amazon.com/x' }), null)).toBe('MessageRejected');
    expect(sesErrorName(400, new Headers(), { __type: 'com.amazonaws.sesv2#SendingPausedException' })).toBe('SendingPausedException');
    expect(sesErrorName(400, new Headers(), { code: 'BadRequestException' })).toBe('BadRequestException');
    expect(sesErrorName(503, new Headers(), { message: 'down' })).toBe('http_503');
  });

  it('⭐ AC4 (ix) — EVERY recorded HELD name (incl. 400 MessageRejected / SendingPaused, a 403) is HELD, ⛔ final; an UNRECOGNISED name is held too', async () => {
    const statusOf: Record<string, number> = { AccessDeniedException: 403, ExpiredTokenException: 403, UnrecognizedClientException: 403, IncompleteSignature: 403, OptInRequired: 403, MissingAuthenticationTokenException: 403, NotAuthorized: 401, NotFoundException: 404, UnknownOperationException: 404, RequestEntityTooLargeException: 413 };
    for (const name of [...SES_HELD_ERROR_NAMES, 'SomeBrandNewException']) {
      const { client } = ses(() => sesError(statusOf[name] ?? 400, name));
      const r = await client.send(MSG);
      expect(r, name).toEqual({ kind: 'transient', detail: `held:${name}`, held: true, mayHaveSent: false });
    }
    expect(SES_REJECTED_ERROR_NAMES.size).toBe(0); // ⛔ SES name is recipient-specific at send time
  });

  it('every TRANSIENT name is transient, ⛔ held; RE5-bis — a 5xx / 408 MAY have sent, a 429 / a 400 throttle ⛔', async () => {
    const statusOf: Record<string, number> = { TooManyRequestsException: 429, ThrottlingException: 400, InternalFailure: 500, ServiceUnavailable: 503, RequestTimeoutException: 408 };
    for (const name of SES_TRANSIENT_ERROR_NAMES) {
      const status = statusOf[name]!;
      const { client } = ses(() => sesError(status, name));
      expect(await client.send(MSG), name).toEqual({ kind: 'transient', detail: `transient:${name}`, held: false, mayHaveSent: status >= 500 || status === 408 });
    }
    // ⛔ name: a 502 from a proxy ⇒ transient + may have sent; a nameless 400 ⇒ HELD.
    expect(classifySesFailure(502, 'http_502')).toEqual({ kind: 'transient', detail: 'transient:http_502', held: false, mayHaveSent: true });
    expect(classifySesFailure(400, 'http_400')).toEqual({ kind: 'transient', detail: 'held:http_400', held: true, mayHaveSent: false });
    // ⭐ RE5-bis is keyed on STATUS: a HELD name on a 5xx still says "may have sent".
    expect(classifySesFailure(500, 'SomethingOdd')).toEqual({ kind: 'transient', detail: 'held:SomethingOdd', held: true, mayHaveSent: true });
  });

  it('⭐ AC7 — an error body (and header) that ECHOES the address ⛔ reaches the result', async () => {
    const { client } = ses(() => json(400, { message: `Email address is not verified. The following identities failed: ${ADDRESS}` }, { 'x-amzn-errortype': `${ADDRESS}:x` }));
    const r = await client.send(MSG);
    expect(JSON.stringify(r)).not.toContain(ADDRESS);
    expect(r).toEqual({ kind: 'transient', detail: 'held:unknown', held: true, mayHaveSent: false });
  });

  it('a timeout and a dropped connection are transient AND may have sent (RE5-bis)', async () => {
    const timeout = ses(() => Promise.reject(Object.assign(new Error('t'), { name: 'TimeoutError' })));
    expect(await timeout.client.send(MSG)).toEqual({ kind: 'transient', detail: 'transient:timeout', held: false, mayHaveSent: true });
    const network = ses(() => Promise.reject(new TypeError('fetch failed')));
    expect(await network.client.send(MSG)).toEqual({ kind: 'transient', detail: 'transient:network', held: false, mayHaveSent: true });
    // A REAL short timeout through `AbortSignal.timeout` (the injected fetch honours the signal).
    const slow = createSesStaffEmailClient({
      region: 'ap-south-1', accessKeyId: 'a', secretAccessKey: 'b', from: 'noreply@twt.example',
      fetch: (_i, init) => new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason))),
    });
    expect(await slow.send(MSG, { timeoutMs: 20 })).toMatchObject({ detail: 'transient:timeout', mayHaveSent: true });
  });

  it('the configuration set is passed when configured (tracking is configured OFF there — Row 24 (b))', async () => {
    const f = fakeFetch(() => json(200, { MessageId: 'm' }));
    const client = createSesStaffEmailClient({ region: 'ap-south-1', accessKeyId: 'a', secretAccessKey: 'b', from: 'noreply@twt.example', configurationSet: 'staff-email', fetch: f.fn });
    await client.send(MSG);
    expect(JSON.parse(f.calls[0]!.body).ConfigurationSetName).toBe('staff-email');
  });

  it('⭐ the PRE-FLIGHT (`GET /v2/email/account`) — ok only when sending is enabled AND out of the sandbox; a failing call holds', async () => {
    const cases: [Response | Error, unknown][] = [
      [json(200, { SendingEnabled: true, ProductionAccessEnabled: true }), { ok: true }],
      [json(200, { SendingEnabled: false, ProductionAccessEnabled: true }), { ok: false, detail: 'preflight:sending_disabled' }],
      [json(200, { SendingEnabled: true, ProductionAccessEnabled: false }), { ok: false, detail: 'preflight:sandbox' }],
      [sesError(403, 'AccessDeniedException'), { ok: false, detail: 'preflight:AccessDeniedException' }],
      [new TypeError('fetch failed'), { ok: false, detail: 'preflight:unreachable' }],
    ];
    for (const [answer, expected] of cases) {
      const { client, calls } = ses(() => (answer instanceof Error ? Promise.reject(answer) : answer));
      expect(await client.preflight()).toEqual(expected);
      expect(calls[0]!.method).toBe('GET');
      expect(calls[0]!.url).toBe('https://email.ap-south-1.amazonaws.com/v2/email/account');
    }
  });

  it('a config gap ⇒ ⛔ request is made; the send is HELD', async () => {
    const f = fakeFetch(() => json(200, {}));
    const client = createSesStaffEmailClient({ region: 'ap-south-1', accessKeyId: '', secretAccessKey: 'b', from: 'noreply@twt.example', fetch: f.fn });
    expect(client.configGap()).toBe('config:credentials_missing');
    expect(await client.preflight()).toEqual({ ok: false, detail: 'config:credentials_missing' });
    expect(await client.send(MSG)).toMatchObject({ kind: 'transient', held: true });
    expect(f.calls).toHaveLength(0);
  });
});

describe('Zoho ZeptoMail adapter', () => {
  const zepto = (respond: (c: Captured) => Response | Promise<Response>, token = 'enc-key-1') => {
    const f = fakeFetch(respond);
    return { client: createZeptoMailStaffEmailClient({ host: 'https://cpaas.zoho.in', token, from: 'noreply@twt.example', fetch: f.fn }), calls: f.calls };
  };
  const zError = (status: number, code: string, sub?: string, target?: string) =>
    json(status, { error: { code, message: 'Access Denied', details: sub ? [{ code: sub, message: `bad ${ADDRESS}`, ...(target ? { target } : {}) }] : [] } });

  it('⭐ the request: India host, `Zoho-enczapikey`, plain `textbody`, tracking OFF, client_reference; accepted ⇒ request_id', async () => {
    const { client, calls } = zepto(() => json(200, { data: [{ code: 'EM_104', message: 'OK' }], message: 'OK', request_id: 'req-1' }));
    expect(await client.send(MSG)).toEqual({ kind: 'final', outcome: 'accepted', providerMessageId: 'req-1' });
    const c = calls[0]!;
    expect(c.url).toBe('https://cpaas.zoho.in/v1.1/email');
    expect(c.headers.get('authorization')).toBe('Zoho-enczapikey enc-key-1');
    expect(c.headers.get('content-type')).toMatch(/application\/json; charset=utf-8/i);
    expect(JSON.parse(c.body)).toEqual({
      from: { address: 'noreply@twt.example' },
      to: [{ email_address: { address: ADDRESS } }],
      subject: MSG.subject,
      textbody: MSG.text,
      track_opens: false,
      track_clicks: false,
      client_reference: MSG.reference,
    });
    // A key pasted WITH its scheme is used as-is.
    const pasted = zepto(() => json(200, { request_id: 'r' }), 'Zoho-enczapikey enc-key-2');
    await pasted.client.send(MSG);
    expect(pasted.calls[0]!.headers.get('authorization')).toBe('Zoho-enczapikey enc-key-2');
  });

  it('⭐ the ONLY `rejected`: TM_4001.SM_113 targeting `to`; the same code on another field is HELD', async () => {
    expect(await zepto(() => zError(400, 'TM_4001', 'SM_113', 'to')).client.send(MSG)).toEqual({ kind: 'final', outcome: 'rejected', detail: 'rejected:400:TM_4001.SM_113' });
    expect(await zepto(() => zError(400, 'TM_4001', 'SM_113', 'from')).client.send(MSG)).toEqual({ kind: 'transient', detail: 'held:TM_4001.SM_113', held: true, mayHaveSent: false });
  });

  it('every recorded HELD name, and an unrecognised one, is HELD; the per-day limit, a 429 and a 5xx are transient (a 5xx may have sent)', async () => {
    for (const name of [...ZEPTOMAIL_HELD_ERROR_NAMES, 'TM_9999.NEW_1']) {
      const [code, sub] = name.split('.');
      expect(await zepto(() => zError(name === 'TM_4001.SERR_157' ? 401 : 400, code!, sub)).client.send(MSG), name).toMatchObject({ kind: 'transient', detail: `held:${name}`, held: true });
    }
    expect(await zepto(() => zError(400, 'TM_3601', 'SMI_115')).client.send(MSG)).toEqual({ kind: 'transient', detail: 'transient:TM_3601.SMI_115', held: false, mayHaveSent: false });
    expect(await zepto(() => new Response('busy', { status: 429 })).client.send(MSG)).toEqual({ kind: 'transient', detail: 'transient:http_429', held: false, mayHaveSent: false });
    expect(await zepto(() => new Response('<html>bad gateway</html>', { status: 502 })).client.send(MSG)).toEqual({ kind: 'transient', detail: 'transient:http_502', held: false, mayHaveSent: true });
    // The new docs' alternative error shape.
    expect(await zepto(() => json(400, { data: { error_code: 'TM_3004' }, message: 'error' })).client.send(MSG)).toMatchObject({ detail: 'held:TM_3004', held: true });
  });

  it('⛔ an error message that echoes the address reaches the result; the pre-flight is a recorded no-op', async () => {
    const r = await zepto(() => zError(400, 'TM_4001', 'SM_113', 'to')).client.send(MSG);
    expect(JSON.stringify(r)).not.toContain(ADDRESS);
    const { client, calls } = zepto(() => json(200, {}));
    expect(await client.preflight()).toEqual({ ok: true });
    expect(calls).toHaveLength(0);
  });
});

describe('the config (RE7)', () => {
  const resolveFromEnv = (env: Record<string, string>) => async (name: string, opts: { envFallback?: string }) => {
    if (name === 'missing-secret') throw new Error('NOT_FOUND');
    const v = opts.envFallback ? env[opts.envFallback] : undefined;
    if (v === undefined) throw new Error('unavailable');
    return v;
  };

  it('unset / unknown provider ⇒ unconfigured (⛔ boot alarm); every send HELD', async () => {
    expect((await buildStaffEmailClient({}, resolveFromEnv({}))).client.configGap()).toBe('config:provider_unset');
    const typo = await buildStaffEmailClient({ STAFF_EMAIL_PROVIDER: 'sess' }, resolveFromEnv({}));
    expect(typo).toMatchObject({ bootAlarm: null });
    expect(typo.client.configGap()).toBe('config:provider_unknown');
    expect(await createUnconfiguredStaffEmailClient('config:provider_unset').send(MSG)).toMatchObject({ kind: 'transient', held: true });
  });

  it('⭐ RE7 A — a SET but UNRESOLVABLE secret name HOLDS + ONE boot alarm; ⛔ throws', async () => {
    const env = { STAFF_EMAIL_PROVIDER: 'ses', STAFF_EMAIL_FROM: 'noreply@twt.example', STAFF_EMAIL_SES_ACCESS_KEY_ID_SECRET_NAME: 'missing-secret', STAFF_EMAIL_SES_SECRET_ACCESS_KEY_SECRET_NAME: 'k2' };
    const w = await buildStaffEmailClient(env, resolveFromEnv({ STAFF_EMAIL_SES_SECRET_ACCESS_KEY: 's' }));
    expect(w.bootAlarm).toBe('config:secret_unresolvable');
    expect(w.client.configGap()).toBe('config:secret_unresolvable');
    const z = await buildStaffEmailClient({ STAFF_EMAIL_PROVIDER: 'zeptomail', STAFF_EMAIL_FROM: 'noreply@twt.example', STAFF_EMAIL_ZEPTOMAIL_TOKEN_SECRET_NAME: 'missing-secret' }, resolveFromEnv({}));
    expect(z).toMatchObject({ bootAlarm: 'config:secret_unresolvable' });
  });

  it('a resolvable SES / ZeptoMail config is ready (the `<BASE>_ENV_FALLBACK` form); a bad sender is a gap', async () => {
    const sesEnv = {
      STAFF_EMAIL_PROVIDER: 'ses',
      STAFF_EMAIL_FROM: 'noreply@twt.example',
      STAFF_EMAIL_SES_ACCESS_KEY_ID_SECRET_NAME: 'id',
      STAFF_EMAIL_SES_SECRET_ACCESS_KEY_SECRET_NAME: 'key',
      STAFF_EMAIL_SES_ACCESS_KEY_ID_ENV_FALLBACK: 'MY_ID',
    };
    const w = await buildStaffEmailClient(sesEnv, resolveFromEnv({ MY_ID: 'AKID', STAFF_EMAIL_SES_SECRET_ACCESS_KEY: 's' }));
    expect(w).toMatchObject({ bootAlarm: null });
    expect(w.client.provider).toBe('ses');
    expect(w.client.configGap()).toBeNull();
    const z = await buildStaffEmailClient({ STAFF_EMAIL_PROVIDER: 'zeptomail', STAFF_EMAIL_FROM: 'noreply@twt.example', STAFF_EMAIL_ZEPTOMAIL_TOKEN_SECRET_NAME: 't' }, resolveFromEnv({ STAFF_EMAIL_ZEPTOMAIL_TOKEN: 'k' }));
    expect(z.client.provider).toBe('zeptomail');
    expect(z.client.configGap()).toBeNull();
    const bad = await buildStaffEmailClient({ ...sesEnv, STAFF_EMAIL_FROM: 'not-an-address' }, resolveFromEnv({ MY_ID: 'AKID', STAFF_EMAIL_SES_SECRET_ACCESS_KEY: 's' }));
    expect(bad.client.configGap()).toBe('config:sender_invalid');
    // ⭐ A bad sender ALSO raises the boot alarm (⛔ silent until the first real refusal) — otherwise-resolving secrets alone
    // are ⛔ "ready".
    expect(bad.bootAlarm).toBe('config:sender_invalid');
    const http = await buildStaffEmailClient({ STAFF_EMAIL_PROVIDER: 'zeptomail', STAFF_EMAIL_FROM: 'noreply@twt.example', STAFF_EMAIL_ZEPTOMAIL_TOKEN_SECRET_NAME: 't', STAFF_EMAIL_ZEPTOMAIL_HOST: 'http://cpaas.zoho.in' }, resolveFromEnv({ STAFF_EMAIL_ZEPTOMAIL_TOKEN: 'k' }));
    expect(http.client.configGap()).toBe('config:zeptomail_host_invalid');
  });

  it('⭐ ADMIN_APP_ORIGIN — an https ORIGIN only; ⛔ http, a path, a query, a fragment, credentials, garbage', () => {
    expect(resolveAdminAppOrigin('https://admin.twt.example')).toBe('https://admin.twt.example');
    expect(resolveAdminAppOrigin('https://admin.twt.example/')).toBe('https://admin.twt.example');
    expect(resolveAdminAppOrigin('https://admin.twt.example:8443')).toBe('https://admin.twt.example:8443');
    for (const bad of [undefined, '', '   ', 'http://admin.twt.example', 'https://admin.twt.example/admin', 'https://admin.twt.example?x=1', 'https://admin.twt.example/#a', 'https://u:p@admin.twt.example', 'admin.twt.example', 'https://evil.example//admin.twt.example', 'javascript:alert(1)']) {
      expect(resolveAdminAppOrigin(bad), String(bad)).toBeNull();
    }
  });

  it('⭐ ADMIN_APP_ORIGIN accepts a mixed-case scheme/host and an explicit default port — both normalised away by `url.origin`, ⛔ a real rejection', () => {
    expect(resolveAdminAppOrigin('HTTPS://Admin.TWT.Example')).toBe('https://admin.twt.example');
    expect(resolveAdminAppOrigin('https://admin.twt.example:443')).toBe('https://admin.twt.example');
    expect(resolveAdminAppOrigin('https://admin.twt.example:443/')).toBe('https://admin.twt.example');
    // ⛔ a path still smuggled through under the port relaxation.
    expect(resolveAdminAppOrigin('https://admin.twt.example:443/admin')).toBeNull();
  });

  it('isSendableEmailAddress — ASCII, one @, a dotted domain', () => {
    for (const ok of ['a@b.co', 'priya.admin+x@example.org']) expect(isSendableEmailAddress(ok), ok).toBe(true);
    for (const bad of ['', ' ', 'a@b', 'a b@c.co', 'a@@b.co', 'प्रिया@example.org', `${'x'.repeat(250)}@b.co`]) expect(isSendableEmailAddress(bad), bad).toBe(false);
  });
});

describe('AC3 — the template (RE9, Invariant 1)', () => {
  const PARIWAR = '2b7c0a4e-5d1f-4e8a-9c3b-1f2e3d4c5b6a';
  const LINK = suspicionStaffEmailLink('https://admin.twt.example', PARIWAR);

  it('⭐ subject `<hi> / <en>`; body Hindi THEN English, the list link in BOTH; ⛔ unresolved token', () => {
    const { subject, text } = renderSuspicionStaffEmail({ link: LINK });
    expect(LINK).toBe(`https://admin.twt.example/p/${PARIWAR}/nominee-refusals`);
    expect(subject).toBe('संदेह पर एक दावा अस्वीकार हुआ — सूची खोलें / A claim was refused on suspicion — open the list');
    const hi = text.indexOf('आपके परिवार');
    const en = text.indexOf('A claim in your Pariwar');
    expect(hi).toBeGreaterThanOrEqual(0);
    expect(en).toBeGreaterThan(hi);
    expect(text.split(LINK)).toHaveLength(3);
    expect(text).not.toMatch(/\{\w+\}/);
    expect(text).toContain('This email contains no names or notes. They are in the console.');
  });

  it('⭐ Invariant 1 — ⛔ claim id, member / nominee / District Admin name, rationale, reason code, date or count can appear', () => {
    const claimId = '9d8c7b6a-1111-4222-8333-444455556666';
    const smuggled = { link: LINK, claimId, member: 'Ramesh Kumar', nominee: 'Sunita', daName: 'Anita', rationale: 'changed after death', reason: 'post_death_nominee_change', date: '2026-10-09', count: '3' };
    // At RUNTIME a widened object is ignored — only `link` is forwarded.
    const { subject, text } = renderSuspicionStaffEmail(smuggled as unknown as SuspicionStaffEmailParams);
    // The link's own UUID holds digits — judge the text WITHOUT it.
    const rest = `${subject}\n${text.split(LINK).join('')}`;
    for (const v of Object.values(smuggled).filter((x) => x !== LINK)) {
      expect(rest.includes(v), v).toBe(false);
    }
    expect(rest).not.toMatch(/\d/); // ⛔ count, ⛔ date, ⛔ id — the only digits are in the link
    expect(text).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
  });

  it('⭐ TYPE-LEVEL — the param type admits `link` ONLY', () => {
    // @ts-expect-error — a second field is a disclosure question for the Panel (RE9), ⛔ a code change.
    const widened: SuspicionStaffEmailParams = { link: LINK, claimId: 'x' };
    // @ts-expect-error — and `link` is required.
    const empty: SuspicionStaffEmailParams = {};
    expect([widened, empty]).toHaveLength(2);
  });
});
