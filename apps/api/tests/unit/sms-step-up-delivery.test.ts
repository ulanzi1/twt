// The real SMS-DLT step-up / login OTP delivery adapter — Story 5.9 (AC1; Task 6 unit).
//
// DB-FREE: the gateway is a FAKE `SmsMessagingHandle` (no network); the `step_up` member-mobile read is
// mocked; decryption uses real fake-KMS material (buildEncryptionDeps + encryptMobile round-trip). Asserts
// the NEGATIVE security properties explicitly: a reject NEVER resolves `{sent:true}`; the code + mobile
// NEVER appear in a thrown error.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMemberMobileCiphertext = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return { ...actual, waOptIn: { ...actual.waOptIn, getMemberMobileCiphertext } };
});

import type { SmsGatewayMessage, SmsMessagingHandle } from '@twt/channels';

// Dynamic value import — a STATIC `@twt/channels` value import pulls in `@twt/domain` before the mock var is
// initialized (vi.mock is hoisted above it), so load it after the mock is registered.
const { SmsSendError } = await import('@twt/channels');
const { createSmsDltStepUpDelivery } = await import('../../src/modules/auth/shared/sms-step-up-delivery.js');
const { StepUpDeliveryError } = await import('../../src/modules/auth/shared/step-up-delivery.js');
const { buildEncryptionDeps } = await import('../../src/deps.js');
const { encryptMobile } = await import('../../src/modules/auth/shared/mobile-index.js');
import type { StepUpOtpDelivery } from '../../src/modules/auth/shared/step-up-delivery.js';

const PEPPER = 'test-pepper-sms-step-up-delivery-0123456789';
const enc = buildEncryptionDeps(PEPPER);
const LOGIN_MOBILE = '+919812345678';
const STEP_UP_MOBILE = '+919887654321';
const CODE = '048213';

/** A fake gateway handle: records every send; can be primed to throw a specific error. */
function fakeMessaging(): {
  messaging: SmsMessagingHandle;
  sent: SmsGatewayMessage[];
  fail: (err: unknown) => void;
} {
  const sent: SmsGatewayMessage[] = [];
  let err: unknown = null;
  return {
    sent,
    fail(e) {
      err = e;
    },
    messaging: {
      async send(message): Promise<string> {
        if (err) throw err;
        sent.push(message);
        return 'gw-msg-abc-123';
      },
    },
  };
}

function makeAdapter(messaging: SmsMessagingHandle) {
  return createSmsDltStepUpDelivery({
    messaging,
    db: {} as never, // never touched for login; the step_up read is mocked
    encryption: enc,
    resolveConfig: async (key: string) => `TRAI::${key}`,
  });
}

const loginPayload = (over: Partial<StepUpOtpDelivery> = {}): StepUpOtpDelivery =>
  ({
    code: CODE,
    actorId: 'blind-index-abc',
    actionContext: 'member.login',
    intent: 'login',
    resolvedMobile: LOGIN_MOBILE,
    ...over,
  }) as StepUpOtpDelivery;

const stepUpPayload = (over: Partial<StepUpOtpDelivery> = {}): StepUpOtpDelivery =>
  ({
    code: CODE,
    actorId: '22222222-2222-2222-2222-222222222222',
    actionContext: 'member.claim.file',
    intent: 'step_up',
    pariwarId: '11111111-1111-1111-1111-111111111111',
    ...over,
  }) as StepUpOtpDelivery;

describe('createSmsDltStepUpDelivery (Story 5.9)', () => {
  beforeEach(() => {
    getMemberMobileCiphertext.mockReset();
  });

  describe('login intent (caller-supplied E.164, no decrypt)', () => {
    it('posts the login OTP template with the code in the variable slot + resolves accepted', async () => {
      const gw = fakeMessaging();
      const result = await makeAdapter(gw.messaging).deliver(loginPayload());
      expect(result).toEqual({ channel: 'sms', status: 'accepted', gatewayMessageId: 'gw-msg-abc-123' });
      expect(gw.sent).toHaveLength(1);
      expect(gw.sent[0]?.to).toBe(LOGIN_MOBILE);
      // Exact byte-match against the registered template (Story 5.9 review) — the gateway byte-matches
      // `body` against its OWN registered copy, so a substring check alone would miss a wording drift.
      expect(gw.sent[0]?.body).toBe(`${CODE} is your TWT login code. Valid 5 min. Do not share.`);
      // The template id is the RESOLVED value of the login NAME pointer (never hardcoded).
      expect(gw.sent[0]?.dltTemplateId).toBe('TRAI::sms.dlt.template_id.otp_login');
    });

    it('never calls the member-mobile decrypt read for login', async () => {
      const gw = fakeMessaging();
      await makeAdapter(gw.messaging).deliver(loginPayload());
      expect(getMemberMobileCiphertext).not.toHaveBeenCalled();
    });

    it('a blank resolvedMobile ⇒ throws no_delivery_target (never resolves)', async () => {
      const gw = fakeMessaging();
      await expect(makeAdapter(gw.messaging).deliver(loginPayload({ resolvedMobile: '' }))).rejects.toMatchObject({
        errorClass: 'no_delivery_target',
      });
      expect(gw.sent).toHaveLength(0);
    });
  });

  describe('step_up intent (decrypt the member Tier-1 mobile)', () => {
    it('decrypts the member mobile + posts the step-up OTP template', async () => {
      const ciphertext = await encryptMobile(STEP_UP_MOBILE, enc);
      getMemberMobileCiphertext.mockResolvedValue(ciphertext);
      const gw = fakeMessaging();
      const result = await makeAdapter(gw.messaging).deliver(stepUpPayload());
      expect(result.channel).toBe('sms');
      expect(result.status).toBe('accepted');
      expect(gw.sent[0]?.to).toBe(STEP_UP_MOBILE);
      // Exact byte-match against the registered template (Story 5.9 review).
      expect(gw.sent[0]?.body).toBe(`${CODE} is your TWT verification code. Valid 3 min. Do not share.`);
      expect(gw.sent[0]?.dltTemplateId).toBe('TRAI::sms.dlt.template_id.otp_step_up');
    });

    it('no member identity row ⇒ throws no_delivery_target (never resolves)', async () => {
      getMemberMobileCiphertext.mockResolvedValue(null);
      const gw = fakeMessaging();
      await expect(makeAdapter(gw.messaging).deliver(stepUpPayload())).rejects.toMatchObject({
        errorClass: 'no_delivery_target',
      });
      expect(gw.sent).toHaveLength(0);
    });

    it('a null pariwarId (e.g. admin-shaped payload) ⇒ throws no_delivery_target', async () => {
      const gw = fakeMessaging();
      await expect(makeAdapter(gw.messaging).deliver(stepUpPayload({ pariwarId: null }))).rejects.toMatchObject({
        errorClass: 'no_delivery_target',
      });
      expect(getMemberMobileCiphertext).not.toHaveBeenCalled();
    });
  });

  describe('gateway rejections classify + NEVER resolve (AC1 #2)', () => {
    const cases: Array<{ name: string; err: unknown; cls: string }> = [
      { name: 'invalid number', err: new SmsSendError('bad number', 'INVALID_NUMBER', 400), cls: 'invalid_number' },
      {
        name: 'DLT template not approved',
        err: new SmsSendError('content mismatch', 'DLT_TEMPLATE_NOT_APPROVED', 400),
        cls: 'dlt_template_not_approved',
      },
      { name: 'carrier reject', err: new SmsSendError('dnd', 'CARRIER_REJECT', 400), cls: 'carrier_reject' },
      { name: 'network', err: new SmsSendError('transport failure', null, 0), cls: 'api_unavailable' },
    ];
    for (const c of cases) {
      it(`${c.name} ⇒ throws StepUpDeliveryError('${c.cls}')`, async () => {
        const gw = fakeMessaging();
        gw.fail(c.err);
        const p = makeAdapter(gw.messaging).deliver(loginPayload());
        await expect(p).rejects.toBeInstanceOf(StepUpDeliveryError);
        await expect(p).rejects.toMatchObject({ errorClass: c.cls });
      });
    }

    it('the thrown error carries NEITHER the code NOR the mobile (no PII leak)', async () => {
      const gw = fakeMessaging();
      gw.fail(new SmsSendError('carrier said no', 'CARRIER_REJECT', 400));
      let thrown: unknown;
      try {
        await makeAdapter(gw.messaging).deliver(loginPayload());
      } catch (e) {
        thrown = e;
      }
      const err = thrown as { message?: string; errorClass?: string };
      const serialized = `${err.message ?? ''} ${err.errorClass ?? ''}`;
      expect(serialized).not.toContain(CODE);
      expect(serialized).not.toContain(LOGIN_MOBILE);
    });
  });

  describe('discriminated-payload runtime guard', () => {
    it('login carrying pariwarId ⇒ invalid_payload', async () => {
      const gw = fakeMessaging();
      const bad = loginPayload({ pariwarId: 'x' } as Partial<StepUpOtpDelivery>);
      await expect(makeAdapter(gw.messaging).deliver(bad)).rejects.toMatchObject({ errorClass: 'invalid_payload' });
    });

    it('step_up carrying resolvedMobile ⇒ invalid_payload', async () => {
      const gw = fakeMessaging();
      const bad = stepUpPayload({ resolvedMobile: LOGIN_MOBILE } as Partial<StepUpOtpDelivery>);
      await expect(makeAdapter(gw.messaging).deliver(bad)).rejects.toMatchObject({ errorClass: 'invalid_payload' });
    });
  });

  describe('send timeout (auth-policy budget — Story 5.9 review)', () => {
    it('a gateway send that never settles ⇒ throws unknown after ~10s, never resolves', async () => {
      vi.useFakeTimers();
      try {
        const hangingMessaging: SmsMessagingHandle = { send: () => new Promise<string>(() => {}) };
        const p = makeAdapter(hangingMessaging).deliver(loginPayload());
        const assertion = expect(p).rejects.toMatchObject({
          errorClass: 'unknown',
          message: expect.stringContaining('timeout'),
        });
        await vi.advanceTimersByTimeAsync(10_000);
        await assertion;
      } finally {
        vi.useRealTimers();
      }
    });

    it('a gateway send that settles just under the budget still resolves accepted', async () => {
      vi.useFakeTimers();
      try {
        const slowMessaging: SmsMessagingHandle = {
          send: () => new Promise((resolve) => setTimeout(() => resolve('gw-slow-1'), 9_000)),
        };
        const p = makeAdapter(slowMessaging).deliver(loginPayload());
        const assertion = expect(p).resolves.toMatchObject({ status: 'accepted', gatewayMessageId: 'gw-slow-1' });
        await vi.advanceTimersByTimeAsync(9_000);
        await assertion;
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it('a blank resolved OTP template id ⇒ throws no_delivery_target (never sends)', async () => {
    const gw = fakeMessaging();
    const adapter = createSmsDltStepUpDelivery({
      messaging: gw.messaging,
      db: {} as never,
      encryption: enc,
      resolveConfig: async () => '',
    });
    await expect(adapter.deliver(loginPayload())).rejects.toMatchObject({ errorClass: 'no_delivery_target' });
    expect(gw.sent).toHaveLength(0);
  });
});
