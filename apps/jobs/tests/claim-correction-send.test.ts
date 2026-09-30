// The claim-correction SMS SEND — its fail-closed rules and the provider-result mapping (Story 6.19b, AC3, AC11b "the
// record" / "send safety"; `2026-09-29-269` §4/§5; T13). Mocked deps (⛔ no DB).
//   · a missing DLT template id, an unset helpline number, an unconfigured gateway ⇒ `error` + alarm — ⛔ never a
//     fixture `accepted`, ⛔ never a placeholder number;
//   · a Secret Manager OUTAGE ⇒ transient (retry); a send TIMEOUT ⇒ transient (`api_unavailable:timeout`);
//   · `invalid_number` → `rejected_invalid_number`; `carrier_reject` → `rejected_unreachable` (letter-eligible, ⛔ no
//     alarm); `dlt_template_not_approved` / `auth` / `unknown` → `error` + alarm, FINAL; `rate_limited` /
//     `api_unavailable` → transient.

import { SmsSendError, type SmsAppClient, type SmsMessagingHandle } from '@twt/channels';
import { describe, expect, it } from 'vitest';

import { sendClaimCorrectionSms } from '../src/scheduler/claim-correction-reminders.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const CLAIM = '3f2a9c1e-0b4d-4e6f-8a1b-2c3d4e5f6a7b';

function client(send: SmsMessagingHandle['send'], configured = true): SmsAppClient & { sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    isConfigured: () => configured,
    messaging: () => ({
      send: (m) => {
        sent.push(m.body);
        return send(m);
      },
    }),
  };
}

const config = (overrides: Record<string, string | null> = {}) => async (key: string): Promise<string | null> => {
  if (key in overrides) return overrides[key]!;
  if (key.startsWith('sms.dlt.template_id.')) return 'TPL-123';
  if (key === `sms.claim_correction.helpline_number.${PARIWAR}`) return '+911800123456';
  return null;
};

const input = { message: 'reminder' as const, locale: 'en' as const, pariwarId: PARIWAR, claimCaseId: CLAIM, e164: '+919812345678' };

describe('sendClaimCorrectionSms — fail CLOSED (T13)', () => {
  it('⛔ a missing DLT template id ⇒ error + alarm, ⛔ no send', async () => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimCorrectionSms(
      { smsAppClient: c, resolveConfig: config({ 'sms.dlt.template_id.claim_correction.reminder.en': null }) },
      input,
    );
    expect(r).toMatchObject({ kind: 'final', outcome: 'error', detail: 'config:dlt_template_id_missing', alarm: true });
    expect(c.sent).toEqual([]);
  });

  it('⛔ an unset helpline number for THIS Pariwar ⇒ error + alarm (⛔ never another Pariwar\'s, ⛔ never a default)', async () => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimCorrectionSms(
      { smsAppClient: c, resolveConfig: config({ [`sms.claim_correction.helpline_number.${PARIWAR}`]: null }) },
      input,
    );
    expect(r).toMatchObject({ outcome: 'error', detail: 'config:helpline_number_missing' });
    expect(c.sent).toEqual([]);
    // Another Pariwar with its own number sends.
    const other = '22222222-2222-2222-2222-222222222222';
    const ok = await sendClaimCorrectionSms(
      { smsAppClient: c, resolveConfig: config({ [`sms.claim_correction.helpline_number.${other}`]: '+911800999999' }) },
      { ...input, pariwarId: other },
    );
    expect(ok).toMatchObject({ outcome: 'accepted' });
  });

  it('⛔ an unconfigured gateway (isConfigured() false) ⇒ error + alarm — ⛔ never the fixture\'s `accepted`', async () => {
    const c = client(() => Promise.resolve('gw'), false);
    expect(await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config() }, input)).toMatchObject({
      outcome: 'error',
      detail: 'config:sms_gateway_unconfigured',
      alarm: true,
    });
  });

  it('a Secret Manager OUTAGE ⇒ transient (retry)', async () => {
    const c = client(() => Promise.resolve('gw'));
    const r = await sendClaimCorrectionSms(
      { smsAppClient: c, resolveConfig: () => Promise.reject(new Error('UNAVAILABLE')) },
      input,
    );
    expect(r).toEqual({ kind: 'transient', detail: 'config_unavailable:secret_manager' });
  });

  it('a send TIMEOUT ⇒ transient `api_unavailable:timeout`', async () => {
    const c = client(() => new Promise(() => undefined));
    const r = await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config(), sendTimeoutMs: 20 }, input);
    expect(r).toEqual({ kind: 'transient', detail: 'api_unavailable:timeout' });
  });
});

describe('sendClaimCorrectionSms — the provider result mapping (AC3)', () => {
  const rejecting = (code: string, status = 400) => client(() => Promise.reject(new SmsSendError('x', code, status)));

  it('⭐ accepted ⇒ accepted with the provider message id; the body is the name-free reminder', async () => {
    const c = client(() => Promise.resolve('gw-42'));
    expect(await sendClaimCorrectionSms({ smsAppClient: c, resolveConfig: config() }, input)).toEqual({
      kind: 'final',
      outcome: 'accepted',
      providerMessageId: 'gw-42',
      detail: null,
    });
    expect(c.sent[0]).toContain('Claim 3F2A9C1E:');
    expect(c.sent[0]).toContain('+911800123456');
  });

  it.each([
    ['INVALID_NUMBER', 'rejected_invalid_number', false],
    ['CARRIER_REJECT', 'rejected_unreachable', false],
    ['DND_REJECT', 'rejected_unreachable', false],
    ['DLT_TEMPLATE_NOT_APPROVED', 'error', true],
    ['AUTH_FAILED', 'error', true],
    ['SOMETHING_ODD', 'error', true],
  ])('%s ⇒ %s (final, alarm=%s)', async (code, outcome, alarm) => {
    expect(await sendClaimCorrectionSms({ smsAppClient: rejecting(code), resolveConfig: config() }, input)).toMatchObject({
      kind: 'final',
      outcome,
      alarm,
    });
  });

  it.each([
    ['RATE_LIMIT', 400],
    ['X', 503],
  ])('%s (HTTP %s) ⇒ transient', async (code, status) => {
    expect(await sendClaimCorrectionSms({ smsAppClient: rejecting(code, status), resolveConfig: config() }, input)).toMatchObject({
      kind: 'transient',
    });
  });
});
