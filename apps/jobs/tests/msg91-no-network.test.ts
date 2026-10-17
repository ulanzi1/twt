// ⭐ Story 6.37 AC11 / I7 — ⛔ a test ever reaches MSG91. The REAL MSG91 client and the REAL pre-flight memo, driven through the
// jobs send core, over an INJECTED fetch — while the GLOBAL fetch is a RECORDER asserted to have seen ZERO calls. ⚠ A throwing
// global stub would prove nothing: a pre-flight transport failure FAILS OPEN on 6.19b/c/d (the send proceeds) and STARTS the
// api, so a swallowed throw looks like a pass — only a recorder's empty log is the proof. DB-free.

import {
  checkMsg91Template,
  createMsg91PreflightMemo,
  createSmsAppClient,
  toGatewayTemplate,
  type SmsFetchLike,
  type SmsFetchResponse,
} from '@twt/channels';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sendClaimCorrectionSms } from '../src/scheduler/claim-correction-reminders.js';
import { CLAIM_CORRECTION_SMS_TEMPLATES, renderClaimCorrectionSms } from '../src/scheduler/claim-correction-sms-templates.js';
import { sendClaimDltSms } from '../src/scheduler/claim-dlt-sms-send.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const CLAIM = '3f2a9c1e-0b4d-4e6f-8a1b-2c3d4e5f6a7b';
const TEMPLATE_ID = '64b0c0ffee0123456789a001';
const REMINDER_EN = CLAIM_CORRECTION_SMS_TEMPLATES.reminder.en;

const respond = (status: number, body: unknown): SmsFetchResponse => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
const config = async (key: string): Promise<string | null> =>
  key.startsWith('sms.dlt.template_id.') ? TEMPLATE_ID : key === `sms.claim_correction.helpline_number.${PARIWAR}` ? '1800123456' : null;

/** The injected fetch — the ONLY place MSG91 is "reached"; the template read answers `read`, a Flow send answers success. */
function injected(read: () => Promise<SmsFetchResponse>) {
  const urls: string[] = [];
  const fetchImpl = vi.fn<SmsFetchLike>((url) => {
    urls.push(url);
    if (url.endsWith('/api/v5/sms/getTemplateVersions')) return read();
    return Promise.resolve(respond(200, { type: 'success', message: '5e1e93cad6fc054d8e759a5b' }));
  });
  return { fetchImpl, urls };
}

function realStack(read: () => Promise<SmsFetchResponse>) {
  const { fetchImpl, urls } = injected(read);
  const client = createSmsAppClient({ apiOrigin: 'https://control.msg91.com', authkey: 'k' }, fetchImpl);
  const memo = createMsg91PreflightMemo({
    check: (entry, id) => checkMsg91Template(client, entry, id),
    clock: () => Date.now(),
    passTtlMs: 60_000,
    faultTtlMs: 5_000,
    transientTtlMs: 60_000,
  });
  return { deps: { smsAppClient: client, resolveConfig: config, smsPreflight: { memo, readsWithSendKey: true } }, urls };
}

describe('⭐ Story 6.37 AC11 — ⛔ network from the jobs send core (a global-fetch RECORDER)', () => {
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

  it('a PASS: the core reads the template ONCE and sends through the INJECTED fetch — the global fetch saw ZERO calls', async () => {
    const { deps, urls } = realStack(() =>
      Promise.resolve(
        respond(200, {
          status: 'success',
          data: [{ template_data: toGatewayTemplate(REMINDER_EN.registeredText, REMINDER_EN.slots), DLT_ID: '1107161234567890123', active_status: '1', sms_type: 'NORMAL' }],
        }),
      ),
    );
    const input = {
      dltTemplateIdConfigKey: REMINDER_EN.dltTemplateIdConfigKey,
      template: { text: REMINDER_EN.registeredText, slots: REMINDER_EN.slots },
      pariwarId: PARIWAR,
      e164: '+919812345678',
      render: (h: string) => renderClaimCorrectionSms('reminder', 'en', { reference: '3F2A9C1E', helpline: h }),
      values: (h: string) => ({ reference: '3F2A9C1E', helpline: h }),
      preflightFailOpen: false,
      // 6.37b DR3 — a uuid-shaped row id (the REAL client refuses one outside the grammar).
      correlation: { kind: 'cr' as const, rowId: '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d' },
    };
    expect(await sendClaimDltSms(deps, input)).toMatchObject({ kind: 'final', outcome: 'accepted', providerMessageId: '5e1e93cad6fc054d8e759a5b' });
    expect(await sendClaimDltSms(deps, input)).toMatchObject({ outcome: 'accepted' });
    expect(urls).toEqual([
      'https://control.msg91.com/api/v5/sms/getTemplateVersions',
      'https://control.msg91.com/api/v5/flow',
      'https://control.msg91.com/api/v5/flow',
    ]);
    expect(globalCalls).toEqual([]);
  });

  it('⭐ a 6.19b/c/d FAIL-OPEN leg — the pre-flight TRANSPORT fails, the text is still sent (a swallowed throw would look like this) — and the global fetch saw ZERO calls', async () => {
    const { deps, urls } = realStack(() => Promise.reject(new Error('ECONNRESET')));
    const r = await sendClaimCorrectionSms(deps, { message: 'reminder', locale: 'en', pariwarId: PARIWAR, claimCaseId: CLAIM, e164: '+919812345678', rowId: '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d' });
    expect(r).toMatchObject({ kind: 'final', outcome: 'accepted', preflightWarning: 'api_unavailable:preflight' });
    expect(urls).toEqual(['https://control.msg91.com/api/v5/sms/getTemplateVersions', 'https://control.msg91.com/api/v5/flow']);
    expect(globalCalls).toEqual([]);
  });
});
