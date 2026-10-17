// Story 6.37 code review F4 — the jobs process's OTP-template pre-flight proof (roster Row 32 (e)): templates 15 / 16 read
// through the REAL MSG91 client over an INJECTED fetch, while the GLOBAL fetch is a RECORDER asserted to see ZERO calls
// (I7, T1). Read-only: ⛔ a Flow call in any leg. DB-free.

import { createSmsAppClient, resolveOtpTemplate, toGatewayTemplate, type SmsFetchLike, type SmsFetchResponse } from '@twt/channels';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runSmsOtpPreflight } from '../src/sms-otp-preflight.js';

const LOGIN = resolveOtpTemplate('login');
const STEP_UP = resolveOtpTemplate('step_up');
const IDS: Readonly<Record<string, string>> = {
  [LOGIN.dltTemplateIdConfigKey]: '64b0c0ffee0123456789a015',
  [STEP_UP.dltTemplateIdConfigKey]: '64b0c0ffee0123456789a016',
};
const AUTHKEY = 'live-authkey-0123';

const respond = (status: number, body: unknown): SmsFetchResponse => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
const passFor = (templateId: string): SmsFetchResponse => {
  const t = templateId === IDS[LOGIN.dltTemplateIdConfigKey] ? LOGIN : STEP_UP;
  return respond(200, {
    status: 'success',
    data: [{ template_data: toGatewayTemplate(t.contentTemplate, t.slots), DLT_ID: '1107161234567890123', sender_id: 'TWTPLT', active_status: '1', sms_type: 'NORMAL', dlt_verified: '10' }],
  });
};

function msg91(answer: (templateId: string) => SmsFetchResponse = passFor) {
  const urls: string[] = [];
  const fetchImpl = vi.fn<SmsFetchLike>((url, init) => {
    urls.push(url);
    return Promise.resolve(answer((JSON.parse(init.body) as { template_id: string }).template_id));
  });
  return { reader: createSmsAppClient({ apiOrigin: 'https://control.msg91.com', authkey: AUTHKEY }, fetchImpl), urls };
}

const resolveConfig = async (key: string): Promise<string | null> => IDS[key] ?? null;

describe('Story 6.37 review F4 — runSmsOtpPreflight (the jobs proof for Row 32 (e), templates 15 / 16)', () => {
  const globalCalls: unknown[] = [];
  beforeEach(() => {
    globalCalls.length = 0;
    vi.stubGlobal('fetch', (...a: unknown[]) => {
      globalCalls.push(a);
      return Promise.resolve(respond(200, {}));
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('⭐ both OTP templates pass ⇒ green; ONLY the read-only template endpoint is called (⛔ Flow); the global fetch saw ZERO calls', async () => {
    const { reader, urls } = msg91();
    const report = await runSmsOtpPreflight({ gatewayConfigured: true, reader, readsWithSendKey: true, resolveConfig });
    expect(report).toMatchObject({
      ok: true,
      gatewayConfigured: true,
      readsWithSendKey: true,
      templates: [
        { configKey: LOGIN.dltTemplateIdConfigKey, result: 'pass' },
        { configKey: STEP_UP.dltTemplateIdConfigKey, result: 'pass' },
      ],
    });
    // Row 32 (d) / (e) — the informational fields are recorded.
    expect(report.templates[0]?.observation?.checked[0]).toMatchObject({ senderId: 'TWTPLT', dltVerified: '10', activeStatus: '1' });
    expect(urls).toEqual([
      'https://control.msg91.com/api/v5/sms/getTemplateVersions',
      'https://control.msg91.com/api/v5/sms/getTemplateVersions',
    ]);
    expect(globalCalls).toEqual([]);
  });

  it('⭐ I6 — the report carries ⛔ the authkey, ⛔ a template id, ⛔ a template text', async () => {
    const { reader } = msg91();
    const out = JSON.stringify(await runSmsOtpPreflight({ gatewayConfigured: true, reader, readsWithSendKey: true, resolveConfig }));
    expect(out).not.toContain(AUTHKEY);
    expect(out).not.toMatch(/64b0c0ffee0123456789a01[56]/);
    expect(out).not.toContain('login code');
    expect(out).not.toContain('##otp##');
  });

  it.each<[string, (id: string) => SmsFetchResponse, string]>([
    ['HTTP 401 ⇒ auth', () => respond(401, { status: 'fail', hasError: true, code: '401' }), 'auth'],
    ['HTTP 200 status:"error" ⇒ auth_or_not_found', () => respond(200, { status: 'error', hasError: true }), 'auth_or_not_found'],
    ['another text ⇒ content_mismatch', () => respond(200, { status: 'success', data: [{ template_data: 'x ##otp##', DLT_ID: '1', active_status: '1', sms_type: 'NORMAL' }] }), 'content_mismatch'],
    ['HTTP 404 ⇒ transient (review F2)', () => respond(404, {}), 'transient'],
  ])('%s — ⛔ green', async (_l, answer, result) => {
    const { reader } = msg91(answer);
    const report = await runSmsOtpPreflight({ gatewayConfigured: true, reader, readsWithSendKey: true, resolveConfig });
    expect(report.ok).toBe(false);
    expect(report.templates.map((t) => t.result)).toEqual([result, result]);
  });

  it('one template failing is enough to fail the proof', async () => {
    const { reader } = msg91((id) => (id === IDS[STEP_UP.dltTemplateIdConfigKey] ? respond(200, { status: 'error', hasError: true }) : passFor(id)));
    const report = await runSmsOtpPreflight({ gatewayConfigured: true, reader, readsWithSendKey: true, resolveConfig });
    expect(report.ok).toBe(false);
    expect(report.templates.map((t) => t.result)).toEqual(['pass', 'auth_or_not_found']);
  });

  it('the gateway unconfigured ⇒ ⛔ green and ⛔ call made', async () => {
    const { reader, urls } = msg91();
    expect(await runSmsOtpPreflight({ gatewayConfigured: false, reader, readsWithSendKey: true, resolveConfig })).toEqual({
      ok: false,
      gatewayConfigured: false,
      readsWithSendKey: true,
      templates: [],
    });
    expect(urls).toEqual([]);
  });

  it('an unset id ⇒ template_id_missing; a config read that throws ⇒ config_unavailable — ⛔ green, ⛔ call for either', async () => {
    const { reader, urls } = msg91();
    const report = await runSmsOtpPreflight({
      gatewayConfigured: true,
      reader,
      readsWithSendKey: false,
      resolveConfig: async (key) => {
        if (key === LOGIN.dltTemplateIdConfigKey) return '  ';
        throw new Error('UNAVAILABLE');
      },
    });
    expect(report).toMatchObject({
      ok: false,
      readsWithSendKey: false,
      templates: [
        { configKey: LOGIN.dltTemplateIdConfigKey, result: 'template_id_missing', observation: null },
        { configKey: STEP_UP.dltTemplateIdConfigKey, result: 'config_unavailable', observation: null },
      ],
    });
    expect(urls).toEqual([]);
  });
});
