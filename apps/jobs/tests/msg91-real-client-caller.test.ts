// Story 6.37 code review F1–F3 — the REAL MSG91 client and pre-flight memo, driven through the REAL jobs callers
// (`sendClaimCorrectionSms`, the 6.19b/c/d wrapper; `sendClaimDltSms` as a holding child calls it) over an INJECTED fetch —
// ⛔ a network call (I7, T1). DB-free. Each leg was red on the unfixed client:
//   F1 — headers arrive, then the 9 s bound aborts while the body is read ⇒ a TRANSIENT `api_unavailable:timeout`, ⛔ a
//        final `error` `unknown:no_type` that spent the slot;
//   F2 — an unexplained template-read HTTP 404 is ⛔ a proven refusal ⇒ 6.19b/c/d FAIL OPEN (sent, alarmed), a holding child
//        is TRANSIENT — ⛔ a final `auth:preflight` with Flow never called;
//   F3 — a code-less 429 / 503 whose message names an invalid template stays a TRANSIENT, ⛔ a final.

import {
  checkMsg91Template,
  createMsg91PreflightMemo,
  createSmsAppClient,
  toGatewayTemplate,
  type SmsFetchLike,
  type SmsFetchResponse,
} from '@twt/channels';
import { describe, expect, it, vi } from 'vitest';

import { sendClaimCorrectionSms } from '../src/scheduler/claim-correction-reminders.js';
import { CLAIM_CORRECTION_SMS_TEMPLATES, renderClaimCorrectionSms } from '../src/scheduler/claim-correction-sms-templates.js';
import { sendClaimDltSms } from '../src/scheduler/claim-dlt-sms-send.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const CLAIM = '3f2a9c1e-0b4d-4e6f-8a1b-2c3d4e5f6a7b';
const TEMPLATE_ID = '64b0c0ffee0123456789a001';
const REMINDER_EN = CLAIM_CORRECTION_SMS_TEMPLATES.reminder.en;
const READ = '/api/v5/sms/getTemplateVersions';
const FLOW = '/api/v5/flow';

const respond = (status: number, body: unknown): SmsFetchResponse => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
const PASS = respond(200, {
  status: 'success',
  data: [{ template_data: toGatewayTemplate(REMINDER_EN.registeredText, REMINDER_EN.slots), DLT_ID: '1107161234567890123', active_status: '1', sms_type: 'NORMAL' }],
});
const SUCCESS = respond(200, { type: 'success', message: '5e1e93cad6fc054d8e759a5b' });
const config = async (key: string): Promise<string | null> =>
  key.startsWith('sms.dlt.template_id.') ? TEMPLATE_ID : key === `sms.claim_correction.helpline_number.${PARIWAR}` ? '1800123456' : null;

/** The real client + memo; `answer(path)` is MSG91's answer per endpoint; `signal` is the client's bound (controllable). */
function realStack(answer: (path: string) => Promise<SmsFetchResponse>, signal: AbortSignal = new AbortController().signal) {
  const paths: string[] = [];
  const fetchImpl = vi.fn<SmsFetchLike>((url) => {
    const path = new URL(url).pathname;
    paths.push(path);
    return answer(path);
  });
  const client = createSmsAppClient({ apiOrigin: 'https://control.msg91.com', authkey: 'k' }, fetchImpl, { timeoutSignal: () => signal });
  const memo = createMsg91PreflightMemo({
    check: (entry, id) => checkMsg91Template(client, entry, id),
    clock: () => Date.now(),
    passTtlMs: 60_000,
    faultTtlMs: 5_000,
    transientTtlMs: 60_000,
  });
  return { deps: { smsAppClient: client, resolveConfig: config, smsPreflight: { memo, readsWithSendKey: true } }, paths };
}

const reminder = { message: 'reminder', locale: 'en', pariwarId: PARIWAR, claimCaseId: CLAIM, e164: '+919812345678' } as const;

/** The same reminder as a HOLDING child would send it (⛔ fail open). */
const heldInput = {
  dltTemplateIdConfigKey: REMINDER_EN.dltTemplateIdConfigKey,
  template: { text: REMINDER_EN.registeredText, slots: REMINDER_EN.slots },
  pariwarId: PARIWAR,
  e164: '+919812345678',
  render: (h: string) => renderClaimCorrectionSms('reminder', 'en', { reference: '3F2A9C1E', helpline: h }),
  values: (h: string) => ({ reference: '3F2A9C1E', helpline: h }),
  preflightFailOpen: false,
};

describe('Story 6.37 review F1 — the bound aborts while the Flow body is read', () => {
  it('⭐ the 6.19b reminder is a TRANSIENT api_unavailable:timeout (pg-boss retries) — ⛔ a final error unknown:no_type', async () => {
    const controller = new AbortController();
    const { deps, paths } = realStack(
      (path) =>
        path === READ
          ? Promise.resolve(PASS)
          : Promise.resolve({
              ok: true,
              status: 200,
              json: () => {
                controller.abort();
                return Promise.reject(controller.signal.reason);
              },
            }),
      controller.signal,
    );
    expect(await sendClaimCorrectionSms(deps, reminder)).toEqual({ kind: 'transient', detail: 'api_unavailable:timeout' });
    expect(paths).toEqual([READ, FLOW]);
  });

  it('a body that breaks without the abort is a TRANSIENT api_unavailable:body_read', async () => {
    const { deps } = realStack((path) =>
      path === READ ? Promise.resolve(PASS) : Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new TypeError('terminated')) }),
    );
    expect(await sendClaimCorrectionSms(deps, reminder)).toEqual({ kind: 'transient', detail: 'api_unavailable:body_read' });
  });
});

describe('Story 6.37 review F2 — an unexplained template-read HTTP 404 is ⛔ a proven refusal', () => {
  it('⭐ the 6.19b reminder FAILS OPEN — sent, with the alarmed api_unavailable:preflight warning (⛔ a final auth:preflight)', async () => {
    const { deps, paths } = realStack((path) => Promise.resolve(path === READ ? respond(404, {}) : SUCCESS));
    expect(await sendClaimCorrectionSms(deps, reminder)).toMatchObject({
      kind: 'final',
      outcome: 'accepted',
      providerMessageId: '5e1e93cad6fc054d8e759a5b',
      preflightWarning: 'api_unavailable:preflight',
    });
    expect(paths).toEqual([READ, FLOW]);
  });

  it('a HOLDING child is a TRANSIENT api_unavailable:preflight — ⛔ sent, ⛔ a final', async () => {
    const { deps, paths } = realStack((path) => Promise.resolve(path === READ ? respond(404, {}) : SUCCESS));
    expect(await sendClaimDltSms(deps, heldInput)).toEqual({ kind: 'transient', detail: 'api_unavailable:preflight' });
    expect(paths).toEqual([READ]);
  });

  it('the DOCUMENTED refusal still ends the row — HTTP 401 ⇒ final auth:preflight, Flow ⛔ called (the positive control)', async () => {
    const { deps, paths } = realStack((path) => Promise.resolve(path === READ ? respond(401, { status: 'fail', hasError: true, code: '401' }) : SUCCESS));
    expect(await sendClaimCorrectionSms(deps, reminder)).toMatchObject({ kind: 'final', outcome: 'error', detail: 'auth:preflight' });
    expect(paths).toEqual([READ]);
  });
});

describe('Story 6.37 review round 2 P1 — only the DOCUMENTED 200 status:"error" body is a proven refusal', () => {
  it.each<[string, unknown]>([
    ['200 {status:"fail"}', { status: 'fail', hasError: true, errors: 'Unauthorized' }],
    ['200 {hasError:true} only', { hasError: true }],
  ])('⭐ a template read answering %s ⇒ the 6.19b reminder FAILS OPEN (sent, warned) — ⛔ a final auth:preflight', async (_l, body) => {
    const { deps, paths } = realStack((path) => Promise.resolve(path === READ ? respond(200, body) : SUCCESS));
    expect(await sendClaimCorrectionSms(deps, reminder)).toMatchObject({
      kind: 'final',
      outcome: 'accepted',
      preflightWarning: 'api_unavailable:preflight',
    });
    expect(paths).toEqual([READ, FLOW]);
  });

  it('the documented 200 {status:"error"} still ends the row auth:preflight (the positive control)', async () => {
    const { deps, paths } = realStack((path) =>
      Promise.resolve(path === READ ? respond(200, { status: 'error', hasError: true, errors: 'Template content type could not be fetched' }) : SUCCESS),
    );
    expect(await sendClaimCorrectionSms(deps, reminder)).toMatchObject({ kind: 'final', outcome: 'error', detail: 'auth:preflight' });
    expect(paths).toEqual([READ]);
  });
});

describe('Story 6.37 review round 2 D2 (`-346` decision 3) — a pre-flight transient is cached 60 s', () => {
  it('⭐ two sends through an outage read MSG91 ONCE (⛔ a read per send) — both fail open', async () => {
    const { deps, paths } = realStack((path) => Promise.resolve(path === READ ? respond(503, {}) : SUCCESS));
    for (let i = 0; i < 2; i += 1) {
      expect(await sendClaimCorrectionSms(deps, reminder)).toMatchObject({ outcome: 'accepted', preflightWarning: 'api_unavailable:preflight' });
    }
    expect(paths).toEqual([READ, FLOW, FLOW]);
  });
});

describe('Story 6.37 review F3 — a code-less 429 / 503 keeps its status over a recognised message', () => {
  it.each<[number, string]>([
    [429, 'rate_limited:http_429'],
    [503, 'api_unavailable:http_503'],
  ])('HTTP %i "flow ID or template ID is invalid" ⇒ a TRANSIENT %s — ⛔ a final', async (status, detail) => {
    const { deps } = realStack((path) =>
      Promise.resolve(path === READ ? PASS : respond(status, { type: 'error', message: 'The provided flow ID or template ID is invalid.' })),
    );
    expect(await sendClaimCorrectionSms(deps, reminder)).toEqual({ kind: 'transient', detail });
  });
});
