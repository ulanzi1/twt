// Real push-provider unit tests — Story 5.2 (Task 7; AC1, AC2, AC5).
//
// NO network, NO firebase-admin: the providers depend on a narrow `PushMessagingHandle` seam, so a fake
// handle exercises acceptance → `accepted`, a Firebase error → `rejected` (never a thrown promise), the
// unrecoverable-token classification (Task 5's invalidation trigger), and the fixture selection when no
// per-Pariwar messaging handle is available.

import type { Message } from 'firebase-admin/messaging';
import { describe, expect, it } from 'vitest';

import {
  createApnsProvider,
  createFcmProvider,
  createFixturePushProvider,
  createPushProviders,
  isUnrecoverableTokenRejection,
  type PushMessagingHandle,
  type RenderedMessage,
  type SendTarget,
} from '../src/index.js';

const PUSH_RENDERED: RenderedMessage = {
  channel: 'push',
  title: 'Claim update',
  body: 'Your claim is now approved',
  deepLink: 'twt://p/22222222-2222-4222-8222-222222222222/claims/55555555-5555-4555-8555-555555555555',
};
const ANDROID_TARGET: SendTarget = { channel: 'push', address: 'android-token', platform: 'android' };
const IOS_TARGET: SendTarget = { channel: 'push', address: 'ios-token', platform: 'ios' };

/** A capturing fake messaging handle — records the last message + returns/throws as configured. */
function fakeMessaging(behavior: { id?: string; throws?: unknown }): {
  handle: PushMessagingHandle;
  sent: Message[];
} {
  const sent: Message[] = [];
  const handle: PushMessagingHandle = {
    send(message) {
      sent.push(message);
      if (behavior.throws !== undefined) return Promise.reject(behavior.throws);
      return Promise.resolve(behavior.id ?? 'fake-message-id');
    },
  };
  return { handle, sent };
}

describe('fcm provider — result mapping (AC1)', () => {
  it('maps Firebase acceptance → accepted + providerMessageId, and builds the android + data block', async () => {
    const { handle, sent } = fakeMessaging({ id: 'projects/x/messages/9' });
    const result = await createFcmProvider({ messaging: handle }).send(PUSH_RENDERED, ANDROID_TARGET);
    expect(result).toMatchObject({ channel: 'push', provider: 'fcm', status: 'accepted', providerMessageId: 'projects/x/messages/9' });
    expect(sent[0]).toMatchObject({
      token: 'android-token',
      notification: { title: 'Claim update', body: 'Your claim is now approved' },
      data: { deepLink: PUSH_RENDERED.deepLink },
      android: { priority: 'high' },
    });
  });

  it('maps a Firebase error → rejected (never a thrown promise), transient class stays token-safe', async () => {
    const { handle } = fakeMessaging({ throws: { code: 'messaging/internal-error' } });
    const result = await createFcmProvider({ messaging: handle }).send(PUSH_RENDERED, ANDROID_TARGET);
    expect(result.status).toBe('rejected');
    expect(result.providerMessageId).toBeNull();
    expect(result.detail).toBe('transient:messaging/internal-error');
    expect(isUnrecoverableTokenRejection(result)).toBe(false);
  });

  it('classifies unrecoverable token errors so the invalidation seam fires (AC5)', async () => {
    for (const code of [
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
      'messaging/invalid-argument',
    ]) {
      const { handle } = fakeMessaging({ throws: { code } });
      const result = await createFcmProvider({ messaging: handle }).send(PUSH_RENDERED, ANDROID_TARGET);
      expect(result.status).toBe('rejected');
      expect(result.detail).toBe(`unrecoverable_token:${code}`);
      expect(isUnrecoverableTokenRejection(result), code).toBe(true);
    }
  });

  it('getStatus is an honest unknown (no post-accept delivery receipt)', async () => {
    const { handle } = fakeMessaging({});
    const status = await createFcmProvider({ messaging: handle }).getStatus('m1');
    expect(status).toEqual({ providerMessageId: 'm1', state: 'unknown' });
  });
});

describe('apns provider — result mapping (AC1)', () => {
  it('builds the apns/aps block + top-level data, maps acceptance → accepted', async () => {
    const { handle, sent } = fakeMessaging({ id: 'apns-9' });
    const result = await createApnsProvider({ messaging: handle }).send(PUSH_RENDERED, IOS_TARGET);
    expect(result).toMatchObject({ provider: 'apns', status: 'accepted', providerMessageId: 'apns-9' });
    expect(sent[0]).toMatchObject({
      token: 'ios-token',
      apns: { payload: { aps: { alert: { title: 'Claim update', body: 'Your claim is now approved' } } } },
      data: { deepLink: PUSH_RENDERED.deepLink },
    });
  });

  it('a non-token transient error does not read as unrecoverable', async () => {
    const { handle } = fakeMessaging({ throws: { code: 'messaging/server-unavailable' } });
    const result = await createApnsProvider({ messaging: handle }).send(PUSH_RENDERED, IOS_TARGET);
    expect(result.status).toBe('rejected');
    expect(isUnrecoverableTokenRejection(result)).toBe(false);
  });
});

describe('deep-link-less render (no data block when deepLink is null)', () => {
  it('omits the FCM data block when the rendered message has no deep-link', async () => {
    const { handle, sent } = fakeMessaging({});
    await createFcmProvider({ messaging: handle }).send({ ...PUSH_RENDERED, deepLink: null }, ANDROID_TARGET);
    expect(sent[0]!.data).toBeUndefined();
  });
});

describe('fixture push provider (AC2 — zero Firebase config)', () => {
  it('reports accepted with a stable fixture id + never logs the raw token', async () => {
    const logs: string[] = [];
    const provider = createFixturePushProvider('fcm', { log: (l) => logs.push(l) });
    const result = await provider.send(PUSH_RENDERED, ANDROID_TARGET);
    expect(result).toMatchObject({ provider: 'fcm', status: 'accepted', providerMessageId: 'fixture-push:fcm' });
    expect(logs).toHaveLength(1);
    expect(logs[0]).not.toContain('android-token'); // raw token (Tier-1 PII) is NEVER logged
  });

  it('createPushProviders(null) selects the two fixtures (fcm + apns)', () => {
    const providers = createPushProviders(null);
    expect(providers.map((p) => p.id)).toEqual(['fcm', 'apns']);
    // Fixtures have NO per-Pariwar credential — 'global', not 'per-pariwar' (see fixture-push.ts).
    expect(providers.every((p) => p.scope === 'global')).toBe(true);
  });

  it('createPushProviders(undefined) also selects the two fixtures (fcm + apns)', () => {
    const providers = createPushProviders(undefined);
    expect(providers.map((p) => p.id)).toEqual(['fcm', 'apns']);
  });

  it('createPushProviders({messaging}) selects the two REAL providers', async () => {
    const { handle } = fakeMessaging({ id: 'real-1' });
    const providers = createPushProviders({ messaging: handle });
    expect(providers.map((p) => p.id)).toEqual(['fcm', 'apns']);
    expect(providers.every((p) => p.scope === 'per-pariwar')).toBe(true);
    const result = await providers[0]!.send(PUSH_RENDERED, ANDROID_TARGET);
    expect(result.providerMessageId).toBe('real-1'); // went through the real handle, not the fixture
  });
});
