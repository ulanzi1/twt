// The real SMS-DLT step-up / login OTP delivery adapter — Story 5.9 (AC1; Task 6 unit).
//
// DB-FREE: the gateway is a FAKE `SmsMessagingHandle` (no network); the `step_up` member-mobile read is
// mocked; decryption uses real fake-KMS material (buildEncryptionDeps + encryptMobile round-trip). Asserts
// the NEGATIVE security properties explicitly: a reject NEVER resolves `{sent:true}`; the code + mobile
// NEVER appear in a thrown error. ⭐ Story 6.37 (MSG91): each OTP key resolves a DISTINCT 24-hex MSG91 id (the NAME →
// value proof, T14); the code travels as the ONE named value `otp` (MG3); the gateway codes are MSG91's (SYNTHETIC — a
// synchronous Flow `code` is ⛔ documented); AC8 (b) drives the REAL client's 9 s abort with a controllable signal.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMemberMobileCiphertext = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return { ...actual, waOptIn: { ...actual.waOptIn, getMemberMobileCiphertext } };
});

import type { SmsFetchLike, SmsGatewayMessage, SmsMessagingHandle } from '@twt/channels';

// Dynamic value import — a STATIC `@twt/channels` value import pulls in `@twt/domain` before the mock var is
// initialized (vi.mock is hoisted above it), so load it after the mock is registered.
const { createSmsAppClient, SmsSendError } = await import('@twt/channels');
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
/** One distinct MSG91 id per OTP config key (T14). */
const TEMPLATE_IDS: Readonly<Record<string, string>> = {
  'sms.dlt.template_id.otp_login': '64b0c0ffee0123456789a015',
  'sms.dlt.template_id.otp_step_up': '64b0c0ffee0123456789a016',
};

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

function makeAdapter(messaging: SmsMessagingHandle, correlationHex?: () => string) {
  return createSmsDltStepUpDelivery({
    messaging,
    db: {} as never, // never touched for login; the step_up read is mocked
    encryption: enc,
    resolveConfig: async (key: string) => TEMPLATE_IDS[key] ?? null,
    ...(correlationHex !== undefined ? { correlationHex } : {}),
  });
}

/** 6.37b DR11 — an injected correlation source (32 lower-case hex). */
const OTP_HEX = '00112233445566778899aabbccddeeff';

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
      expect(gw.sent[0]?.templateId).toBe('64b0c0ffee0123456789a015');
      // ⭐ 6.37 MG3 — the code is the ONE named value MSG91 substitutes (TV13's `otp`).
      expect(gw.sent[0]?.values).toEqual([{ name: 'otp', value: CODE }]);
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

  // ⭐ Story 6.34 TV9 (`2026-10-12-322` C4; AC8): the claim handover's code lives 3 minutes (the `step_up` pool) but
  // goes to a caller-supplied number (the `login` path) — `template: 'step_up'` selects the TEXT only.
  describe("login intent with template 'step_up' — the claim handover (Story 6.34 TV9)", () => {
    it('sends the STEP-UP text ("Valid 3 min") to the SAME caller-supplied E.164 — ⛔ decrypt', async () => {
      const gw = fakeMessaging();
      const result = await makeAdapter(gw.messaging).deliver(loginPayload({ template: 'step_up' } as Partial<StepUpOtpDelivery>));
      expect(result).toEqual({ channel: 'sms', status: 'accepted', gatewayMessageId: 'gw-msg-abc-123' });
      expect(gw.sent).toHaveLength(1);
      expect(gw.sent[0]?.to).toBe(LOGIN_MOBILE);
      expect(gw.sent[0]?.body).toBe(`${CODE} is your TWT verification code. Valid 3 min. Do not share.`);
      expect(gw.sent[0]?.templateId).toBe('64b0c0ffee0123456789a016');
      expect(gw.sent[0]?.values).toEqual([{ name: 'otp', value: CODE }]);
      expect(getMemberMobileCiphertext).not.toHaveBeenCalled();
    });

    it.each([['login'], ['otp_step_up'], [null]])("⛔ template %s on a login payload ⇒ invalid_payload (only 'step_up'), ⛔ send", async (template) => {
      const gw = fakeMessaging();
      await expect(
        makeAdapter(gw.messaging).deliver(loginPayload({ template } as unknown as Partial<StepUpOtpDelivery>)),
      ).rejects.toMatchObject({ errorClass: 'invalid_payload' });
      expect(gw.sent).toHaveLength(0);
    });

    it.each(['step_up', 'login'])("⛔ any template on a step_up payload (%s) ⇒ invalid_payload — one-way, ⛔ send", async (template) => {
      getMemberMobileCiphertext.mockResolvedValue(await encryptMobile(STEP_UP_MOBILE, enc));
      const gw = fakeMessaging();
      await expect(
        makeAdapter(gw.messaging).deliver(stepUpPayload({ template } as unknown as Partial<StepUpOtpDelivery>)),
      ).rejects.toMatchObject({ errorClass: 'invalid_payload' });
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
      expect(gw.sent[0]?.templateId).toBe('64b0c0ffee0123456789a016');
      expect(gw.sent[0]?.values).toEqual([{ name: 'otp', value: CODE }]);
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
      // SYNTHETIC MSG91 codes (MG7): 202 invalid mobile, 400 template; a carrier reject has ⛔ MSG91 code (pre-classified).
      { name: 'invalid number', err: new SmsSendError('bad number', '202', 200), cls: 'invalid_number' },
      {
        name: 'DLT template not approved',
        err: new SmsSendError('content mismatch', '400', 200),
        cls: 'dlt_template_not_approved',
      },
      { name: 'auth', err: new SmsSendError('bad key', '201', 200), cls: 'auth' },
      {
        name: 'carrier reject',
        err: new SmsSendError('dnd', null, 400, { errorClass: 'carrier_reject', code: 'synthetic' }),
        cls: 'carrier_reject',
      },
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
      gw.fail(new SmsSendError('carrier said no', null, 400, { errorClass: 'carrier_reject', code: 'synthetic' }));
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

  describe('⭐ Story 6.37 AC8 (b) — the REAL MSG91 client\'s own 9 s abort fires FIRST: a deterministic `api_unavailable`', () => {
    it('the signal is created synchronously at `send` (9 s); aborting it ⇒ StepUpDeliveryError(api_unavailable), ⛔ the outer bound\'s `unknown`', async () => {
      const controller = new AbortController();
      const timeoutSignal = vi.fn<(ms: number) => AbortSignal>(() => controller.signal);
      // MSG91 never answers — the fetch settles only when ITS signal aborts.
      const fetchImpl = vi.fn<SmsFetchLike>(
        (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))),
      );
      const client = createSmsAppClient({ apiOrigin: 'https://control.msg91.com', authkey: 'k' }, fetchImpl, { timeoutSignal });
      const p = makeAdapter(client.messaging()).deliver(loginPayload());
      await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
      expect(timeoutSignal).toHaveBeenCalledWith(9_000);
      controller.abort();
      await expect(p).rejects.toBeInstanceOf(StepUpDeliveryError);
      await expect(p).rejects.toMatchObject({ errorClass: 'api_unavailable' });
    });

    it('review F1 — HTTP 200 headers arrive, then the 9 s abort fires while the BODY is read ⇒ StepUpDeliveryError(api_unavailable), ⛔ `unknown`', async () => {
      const controller = new AbortController();
      // The headers come back at once; the body settles only when the client's signal aborts.
      let bodyRead: AbortSignal | null = null;
      const fetchImpl = vi.fn<SmsFetchLike>((_url, init) =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => {
            bodyRead = init.signal;
            return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
          },
        }),
      );
      const client = createSmsAppClient({ apiOrigin: 'https://control.msg91.com', authkey: 'k' }, fetchImpl, { timeoutSignal: () => controller.signal });
      const p = makeAdapter(client.messaging()).deliver(loginPayload());
      await vi.waitFor(() => expect(bodyRead).not.toBeNull());
      controller.abort();
      await expect(p).rejects.toBeInstanceOf(StepUpDeliveryError);
      await expect(p).rejects.toMatchObject({ errorClass: 'api_unavailable' });
    });

    it('a `+91…` E.164 goes out as MSG91\'s `91…`, the code as `otp`, the body ⛔ sent', async () => {
      const fetchImpl = vi.fn<SmsFetchLike>().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ type: 'success', message: '5e1e93cad6fc054d8e759a5b' }),
      });
      const client = createSmsAppClient({ apiOrigin: 'https://control.msg91.com', authkey: 'k' }, fetchImpl);
      expect(await makeAdapter(client.messaging(), () => OTP_HEX).deliver(loginPayload())).toEqual({
        channel: 'sms',
        status: 'accepted',
        gatewayMessageId: '5e1e93cad6fc054d8e759a5b',
      });
      expect(JSON.parse(fetchImpl.mock.calls[0]![1].body)).toEqual({
        template_id: '64b0c0ffee0123456789a015',
        short_url: '0',
        recipients: [{ mobiles: '919812345678', otp: CODE, CRQID: `ot${OTP_HEX}` }],
      });
    });

    it('6.37b DR11 — every code carries `ot` + 32 hex: an injected source ⇒ its value; the default ⇒ a fresh value per send', async () => {
      const sent: SmsGatewayMessage[] = [];
      const messaging: SmsMessagingHandle = { send: (m) => (sent.push(m), Promise.resolve('gw')) };
      await makeAdapter(messaging, () => OTP_HEX).deliver(loginPayload());
      expect(sent[0]!.correlationId).toBe(`ot${OTP_HEX}`);

      await makeAdapter(messaging).deliver(loginPayload());
      await makeAdapter(messaging).deliver(loginPayload());
      expect(sent[1]!.correlationId).toMatch(/^ot[0-9a-f]{32}$/);
      expect(sent[2]!.correlationId).toMatch(/^ot[0-9a-f]{32}$/);
      expect(sent[1]!.correlationId).not.toBe(sent[2]!.correlationId);
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
