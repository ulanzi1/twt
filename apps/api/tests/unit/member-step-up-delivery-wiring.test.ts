// Member step-up OTP delivery wiring — Story 5.9 (Task 5). DB-FREE unit test of the env-gated builder:
//   · dev/CI  ⇒ the reveal/log stub (no credential required; the flow completes without SMS).
//   · prod    ⇒ the real SMS-DLT adapter, but FAIL STARTUP when the gateway credential / OTP template id
//               NAME resolves blank (BigDev 2026-07-07 — never a silent reveal-stub fallback in prod).

import { describe, expect, it } from 'vitest';

import { buildMemberStepUpDelivery } from '../../src/deps.js';
import { SMS_GATEWAY_API_URL_PLACEHOLDER, type ApiConfig } from '../../src/config.js';
import type { EncryptionDeps } from '../../src/context.js';

const enc = {} as EncryptionDeps;
const db = {} as never;

function cfg(over: Partial<ApiConfig['sms']> & { nodeEnv?: string } = {}): ApiConfig {
  const { nodeEnv = 'production', ...sms } = over;
  return {
    nodeEnv,
    sms: {
      apiUrl: 'https://sms.example/send',
      apiKeyEnvFallback: 'SMS_GATEWAY_API_KEY',
      senderIdEnvFallback: 'SMS_GATEWAY_SENDER_ID',
      ...sms,
    },
  } as ApiConfig;
}

/** Set env vars for the duration of `fn`, restoring whatever was there before (never a bare delete). */
async function withEnv(vars: Record<string, string>, fn: () => Promise<void>): Promise<void> {
  const prior: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) prior[key] = process.env[key];
  Object.assign(process.env, vars);
  try {
    await fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    }
  }
}

describe('buildMemberStepUpDelivery (Story 5.9, Task 5)', () => {
  it('dev/CI ⇒ the reveal/log stub (no credential required)', async () => {
    const port = await buildMemberStepUpDelivery(
      cfg({ nodeEnv: 'development' }),
      enc,
      db,
      async () => '',
    );
    const result = await port.deliver({
      code: '000000',
      actorId: 'a',
      actionContext: 'member.login',
      intent: 'login',
      resolvedMobile: '+910000000000',
    });
    expect(result).toEqual({ channel: 'log', status: 'stub' });
  });

  it('prod with a blank gateway credential ⇒ FAIL STARTUP (throws, no silent fallback)', async () => {
    // No apiKeySecretName ⇒ apiKey resolves blank; template ids resolve fine — must still throw.
    await expect(
      buildMemberStepUpDelivery(cfg({ nodeEnv: 'production' }), enc, db, async (k) => `TRAI::${k}`),
    ).rejects.toThrow(/production SMS-DLT OTP delivery requires/);
  });

  it('prod with a blank OTP DLT template id ⇒ FAIL STARTUP', async () => {
    // Credential present (resolved via the local-dev env fallback) but the template-id NAME resolves blank.
    await withEnv({ SMS_GATEWAY_API_KEY: 'live-key', SMS_GATEWAY_SENDER_ID: 'TWTOTP' }, async () => {
      await expect(
        buildMemberStepUpDelivery(
          cfg({
            nodeEnv: 'production',
            apiKeySecretName: 'sms-key',
            senderIdSecretName: 'sms-sender',
          }),
          enc,
          db,
          async () => '', // both template ids resolve blank
        ),
      ).rejects.toThrow(/production SMS-DLT OTP delivery requires/);
    });
  });

  it('prod with an unset gateway URL (the reserved placeholder) ⇒ FAIL STARTUP (Story 5.9 review)', async () => {
    // Credential + template ids all resolve fine, but the operator never set SMS_GATEWAY_API_URL — must
    // still fail at boot rather than boot clean and fail every real send at request time.
    await withEnv({ SMS_GATEWAY_API_KEY: 'live-key', SMS_GATEWAY_SENDER_ID: 'TWTOTP' }, async () => {
      await expect(
        buildMemberStepUpDelivery(
          cfg({
            nodeEnv: 'production',
            apiKeySecretName: 'sms-key',
            senderIdSecretName: 'sms-sender',
            apiUrl: SMS_GATEWAY_API_URL_PLACEHOLDER,
          }),
          enc,
          db,
          async (k) => `TRAI::${k}`,
        ),
      ).rejects.toThrow(/production SMS-DLT OTP delivery requires/);
    });
  });
});
