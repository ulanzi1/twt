// The live `dispatch()` fan-out — DB-free unit tests (Story 8.8, Task 8; AC1, AC5, AC6).
//
// Runs with NO `DATABASE_URL`, NO network and NO real timers (the AI-7-1 convention). `fanOutAlert` is
// deliberately DB-free — every impure input is injected — so the whole composition is exercisable with
// fakes, which is what makes the Decision-3 properties below assertable at all.
//
// ── WHY REJECT DOUBLES EXIST — DO NOT replace them with the shipped createFixture*Provider() ────────
// The shipped log-only fixtures ALWAYS return `status: 'accepted'` (they exist so the stack boots with
// zero Firebase/Meta/DLT config — src/providers/fixture-*.ts). A cascade driven by them delivers on
// PUSH and never falls through, so it CANNOT exercise AR-19 at all. These doubles force a non-accept
// outcome on the rungs a test needs to fail, precisely so the ladder advances. They conform to the
// FROZEN `ChannelProvider` contract — no production source is touched. (Carried forward verbatim from
// the AI-5-2 prototype's §3 rationale, which is the reason that harness could prove anything.)
//
// ── The load-bearing property this file exists for ─────────────────────────────────────────────────
// "push accepts ⇒ WA and SMS are never sent" is the cost property ratified Decision 3 buys. It is
// asserted by counting the paid providers' `send` calls at ZERO — not by inspecting the trail, which
// would pass even if a paid send had gone out and been ignored.

import type { Channel, ChannelProvider, ProviderId, SendTarget } from '@twt/channels';
import type { Alert } from '@twt/contracts';
import type { audit as auditDomain } from '@twt/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invalidatePushToken = vi.fn();
// Story 5.11 — `fanOutAlertToMembers`' own legs need the scope + the per-member target reads faked (DB-free).
const withPariwarScope = vi.fn();
const resolvePushTargets = vi.fn();
const resolveWaTarget = vi.fn();
const resolveSmsTarget = vi.fn();
const resolveTelegramTarget = vi.fn();
const getMemberLastEngagementAt = vi.fn();
vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    withPariwarScope,
    deviceToken: { ...actual.deviceToken, getMemberLastEngagementAt },
    notifications: {
      ...actual.notifications,
      invalidatePushToken,
      resolvePushTargets,
      resolveWaTarget,
      resolveSmsTarget,
      resolveTelegramTarget,
    },
  };
});

const {
  fanOutAlert,
  fanOutAlertToMembers,
  isAlertSmsFallbackEligible,
  isCycleOpenBridgeTextEligible,
  onceForJob,
  serializeFanOutResult,
  shouldRetryFanOut,
  SMS_RUNG_DETAIL,
} = await import('../src/scheduler/contribution-notify.js');
type ContributionNotifyDeps = import('../src/scheduler/contribution-notify.js').ContributionNotifyDeps;
type MemberFanOutContext = import('../src/scheduler/contribution-notify.js').MemberFanOutContext;

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const MEMBER = '22222222-2222-2222-2222-222222222222';
const ALERT = '33333333-3333-3333-3333-333333333333';
const POOL = '44444444-4444-4444-4444-444444444444';

const TARGETS = {
  push: { channel: 'push', address: 'device-token', platform: 'android' } as SendTarget,
  push2: { channel: 'push', address: 'device-token-2', platform: 'android' } as SendTarget,
  whatsapp: { channel: 'whatsapp', address: '+919999999999' } as SendTarget,
  sms: { channel: 'sms', address: '+919999999999' } as SendTarget,
  telegram: { channel: 'telegram', address: 'chat-123' } as SendTarget,
};

// ── Provider doubles ────────────────────────────────────────────────────────────────────────────────

interface CountingProvider {
  readonly provider: ChannelProvider;
  sendCount(): number;
}

function makeProvider(
  id: ProviderId,
  channel: Channel,
  status: 'accepted' | 'rejected' | 'not_implemented',
  detail?: string,
): CountingProvider {
  let count = 0;
  return {
    sendCount: () => count,
    provider: {
      id,
      channel,
      scope: 'global',
      send: () => {
        count += 1;
        return Promise.resolve({
          channel,
          provider: id,
          status,
          providerMessageId: status === 'accepted' ? `${id}-msg` : null,
          ...(detail ? { detail } : {}),
        });
      },
      getStatus: (messageId: string) => Promise.resolve({ providerMessageId: messageId, state: 'unknown' as const }),
    },
  };
}

/** A push provider whose verdict varies per device address — the multi-device case. */
function makeAddressAwarePushProvider(byAddress: Record<string, 'accepted' | 'rejected'>): CountingProvider {
  let count = 0;
  return {
    sendCount: () => count,
    provider: {
      id: 'fcm',
      channel: 'push',
      scope: 'global',
      send: (_rendered, target: SendTarget) => {
        count += 1;
        const status = byAddress[target.address] ?? 'rejected';
        return Promise.resolve({
          channel: 'push' as const,
          provider: 'fcm' as const,
          status,
          providerMessageId: status === 'accepted' ? 'fcm-msg' : null,
          ...(status === 'rejected' ? { detail: 'unrecoverable_token:messaging/registration-token-not-registered' } : {}),
        });
      },
      getStatus: (messageId: string) => Promise.resolve({ providerMessageId: messageId, state: 'unknown' as const }),
    },
  };
}

/** A sleep recorder (the `tests/cascade.test.ts` convention) — records every wait WITHOUT waiting. */
function sleepRecorder(): { sleep: (ms: number) => Promise<void>; waits: number[] } {
  const waits: number[] = [];
  return { waits, sleep: (ms) => (waits.push(ms), Promise.resolve()) };
}

// ── Harness ─────────────────────────────────────────────────────────────────────────────────────────

interface Harness {
  readonly deps: ContributionNotifyDeps;
  readonly auditLines: auditDomain.AuditEntryInput[];
  readonly waits: number[];
  readonly push: CountingProvider;
  readonly whatsapp: CountingProvider;
  readonly sms: CountingProvider;
  readonly telegram: CountingProvider;
}

function harness(
  overrides: {
    push?: CountingProvider;
    whatsapp?: CountingProvider;
    sms?: CountingProvider;
    telegram?: CountingProvider;
    now?: Date;
  } = {},
): Harness {
  const push = overrides.push ?? makeProvider('fcm', 'push', 'accepted');
  const whatsapp = overrides.whatsapp ?? makeProvider('whatsapp-business', 'whatsapp', 'accepted');
  const sms = overrides.sms ?? makeProvider('sms-dlt', 'sms', 'accepted');
  const telegram = overrides.telegram ?? makeProvider('telegram', 'telegram', 'accepted');
  const auditLines: auditDomain.AuditEntryInput[] = [];
  const recorder = sleepRecorder();

  const deps: ContributionNotifyDeps = {
    pool: {} as never,
    serviceDb: {} as never,
    encryption: {} as never,
    audit: (input) => {
      auditLines.push(input);
      return Promise.resolve();
    },
    // Deterministic 64-hex stand-in for the keyed HMAC — the REAL `createRenderedMessageHash` is
    // exercised by the live-DB suite, where its output can be compared against a production-computed
    // value rather than a hand-inlined one.
    hashRendered: () => Promise.resolve('a'.repeat(64)),
    resolveProviders: () =>
      Promise.resolve({
        // Both push transports registered so `selectProvider` can route fcm-vs-apns.
        push: [push.provider, { ...push.provider, id: 'apns' as const }],
        whatsapp: [whatsapp.provider],
        sms: [sms.provider],
        telegram: [telegram.provider],
      }),
    now: () => overrides.now ?? new Date('2026-07-23T00:00:00.000Z'),
    sleep: recorder.sleep,
    onAlarm: () => undefined,
  };

  return { deps, auditLines, waits: recorder.waits, push, whatsapp, sms, telegram };
}

function cycleOpenAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    alert_id: ALERT,
    pariwar_id: PARIWAR,
    member_id: MEMBER,
    time_critical: false,
    provenance_refs: { pool_id: POOL },
    created_at: '2026-07-23T00:00:00.000Z',
    created_by_actor: 'system',
    alert_category: 'alert_published',
    payload_data: { title: 'Your pool is open — Pool A', body: 'In support of the family.' },
    ...overrides,
  } as Alert;
}

function reminderAlert(): Alert {
  return {
    alert_id: ALERT,
    pariwar_id: PARIWAR,
    member_id: MEMBER,
    time_critical: false,
    provenance_refs: { pool_id: POOL },
    created_at: '2026-07-23T00:00:00.000Z',
    created_by_actor: 'system',
    alert_category: 'deadline_reminder',
    payload_data: {
      subject: 'Pool A — your pool is open',
      deadline_at: '2026-08-05T00:00:00.000Z',
      deadline_display: '05-08-2026',
    },
  } as Alert;
}

/** Story 5.11 — a LIT notice: day 10's reminder carrying its `sms` block (FS7). */
function litReminderAlert(): Alert {
  const base = reminderAlert();
  return {
    ...base,
    payload_data: { ...base.payload_data, sms: { message: 'deadline_not_recorded', locale: 'en', values: { pool: 'A', date: '05-08-2026' } } },
  } as Alert;
}

const trailOf = (result: { trail: readonly { channel: string; outcome: string; detail?: string }[] }): string[] =>
  result.trail.map((e) => `${e.channel}:${e.outcome}${e.detail ? `:${e.detail}` : ''}`);

function ctx(overrides: Partial<MemberFanOutContext['targets']> = {}, rest: Partial<MemberFanOutContext> = {}): MemberFanOutContext {
  return {
    targets: {
      push: [TARGETS.push],
      whatsapp: TARGETS.whatsapp,
      sms: TARGETS.sms,
      telegram: null,
      ...overrides,
    },
    costToggleEnabled: false,
    lastEngagementAt: null,
    ...rest,
  };
}

beforeEach(() => {
  invalidatePushToken.mockReset();
  invalidatePushToken.mockResolvedValue('invalidated');
});

// ─── (1) The Decision-3 cost property ──────────────────────────────────────────────────────────────

describe('AC6 / Decision 3 — stop at the first `sent`', () => {
  it('push accepts ⇒ WA and SMS are NEVER sent (the load-bearing cost property)', async () => {
    const h = harness();
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx());

    expect(result.delivered).toBe(true);
    expect(result.deliveredChannel).toBe('push');
    expect(h.push.sendCount()).toBe(1);
    // Not "the trail shows no WA/SMS" — the PROVIDERS were never driven. A paid send that happened and
    // was then ignored would still cost money; only a zero call count proves it did not happen.
    expect(h.whatsapp.sendCount()).toBe(0);
    expect(h.sms.sendCount()).toBe(0);
  });

  // ⭐ Story 5.11 (AC4, F18) — REPLACES "push rejects, WA rejects ⇒ delivers on SMS … nothing after sms:sent": that `sms:sent`
  // was the log fixture's fake (F3). The ladder still walks every rung once, and the SMS rung now ENDS NOT-SENT with a reason.
  it('push rejects, WA rejects ⇒ one attempt per rung; an UNLIT alert\'s SMS rung ends `sms_message_not_lit`, ⛔ sent', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected', 'transient:messaging/internal-error'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
    });
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx());

    expect(result.delivered).toBe(false);
    expect(result.deliveredChannel).toBeNull();
    expect(trailOf(result)).toEqual([
      'push:rejected:transient:messaging/internal-error',
      'whatsapp:rejected',
      'sms:skipped_no_target:sms_message_not_lit',
    ]);
    // ONE attempt per rung — `backoffMs: []` means no retries are burned (D9).
    expect(result.trail.every((e) => e.attempt === 0)).toBe(true);
    expect(h.sms.sendCount()).toBe(0); // I3 — the SMS provider is ⛔ driven
  });

  // ⭐ Story 5.11 (AC3) — REWRITES the 8.8 leg "a member with NO WhatsApp target advances to SMS" (trail `push:rejected,
  // whatsapp:skipped_no_target, sms:sent`): as RULED by `2026-10-23-390` Q1 B such a member is ELIGIBLE for a lit notice — the
  // rung ends `sms_send_not_wired` (the send is row 5-11b), ⛔ sent.
  it('a member with NO WhatsApp target whose push failed is ELIGIBLE for a lit notice — `sms_send_not_wired`, ⛔ sent', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(h.deps, litReminderAlert(), ctx({ whatsapp: null }));

    expect(trailOf(result)).toEqual([
      'push:rejected',
      'whatsapp:skipped_no_target',
      'sms:skipped_no_target:sms_send_not_wired',
    ]);
    expect(h.whatsapp.sendCount()).toBe(0);
    expect(h.sms.sendCount()).toBe(0);
    expect(result.delivered).toBe(false);
  });

  it('the whole ladder exhausted ⇒ delivered:false (Story 5.11: whether the caller retries is `shouldRetryFanOut`\'s — `-394` item 1)', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
      sms: makeProvider('sms-dlt', 'sms', 'rejected'),
    });
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx());
    expect(result.delivered).toBe(false);
    expect(result.deliveredChannel).toBeNull();
  });

  it('NO WORKER EVER SLEEPS A BACKOFF — the injected sleep is never called (D9)', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
      sms: makeProvider('sms-dlt', 'sms', 'rejected'),
    });
    await fanOutAlert(h.deps, cycleOpenAlert(), ctx());
    expect(h.waits).toEqual([]); // the 30s/5m/30m default must never run, in CI or in production
  });

  it('honest outcome mapping — a `not_implemented` rung is never reported as `sent`', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'not_implemented') });
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx());
    expect(result.trail[0]).toMatchObject({ channel: 'push', outcome: 'not_implemented' });
    expect(result.deliveredChannel).toBe('whatsapp');
  });
});

// ─── (2) Multi-device push + token invalidation ────────────────────────────────────────────────────

describe('AC6 — multi-device push is resolved in the COMPOSITION, not in dispatch', () => {
  it('two devices, one dead one live ⇒ the rung is `sent` and the paid channels are never reached', async () => {
    const push = makeAddressAwarePushProvider({
      'device-token': 'rejected', // the stale token
      'device-token-2': 'accepted', // the live device
    });
    const h = harness({ push });
    const result = await fanOutAlert(
      h.deps,
      cycleOpenAlert(),
      ctx({ push: [TARGETS.push, TARGETS.push2] }),
    );

    expect(result.deliveredChannel).toBe('push');
    expect(push.sendCount()).toBe(2); // every device is addressed, not just the first
    expect(h.whatsapp.sendCount()).toBe(0);
    expect(h.sms.sendCount()).toBe(0);
  });

  it('an UNRECOVERABLE token rejection feeds the shipped invalidation seam (reused, not re-classified)', async () => {
    const push = makeAddressAwarePushProvider({
      'device-token': 'rejected',
      'device-token-2': 'accepted',
    });
    const h = harness({ push });
    await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ push: [TARGETS.push, TARGETS.push2] }));

    expect(invalidatePushToken).toHaveBeenCalledTimes(1);
    expect(invalidatePushToken.mock.calls[0]![1]).toBe(PARIWAR);
    expect((invalidatePushToken.mock.calls[0]![2] as SendTarget).address).toBe('device-token');
  });

  it('a TRANSIENT push rejection does NOT invalidate the token (a live device survives a quota blip)', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected', 'transient:messaging/internal-error') });
    await fanOutAlert(h.deps, cycleOpenAlert(), ctx());
    expect(invalidatePushToken).not.toHaveBeenCalled();
  });

  it('no active device at all ⇒ the push rung is skipped_no_target and the ladder advances', async () => {
    const h = harness();
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ push: [] }));
    expect(result.trail[0]).toMatchObject({ channel: 'push', outcome: 'skipped_no_target' });
    expect(result.deliveredChannel).toBe('whatsapp');
  });
});

// ─── (3) The composition ORDER: bridge first, then cost-optimization ───────────────────────────────

describe('AC6 — degraded-mode bridge FIRST, then cost-optimization', () => {
  // ⭐ Story 5.11 (FS10 (a), AC5) — REPLACES "a BRIDGED cycle-open sends SMS ONLY — the ladder is skipped": the bridge has ⛔
  // registered words, so its SMS-only send could only reach the log fixture (a fake `sent`, F21). While it stays dark a bridged
  // member runs the NORMAL ladder — they at least get the push.
  it('a BRIDGED cycle-open runs the NORMAL ladder — push delivers; the time-critical alert is never cost-suppressed', async () => {
    const h = harness();
    // `time_critical: true` on an `alert_published` alert IS the resolved cycle-open-SMS-bridge signal
    // (Story 8.1 set it from the degraded-mode read at the cycle-freeze instant).
    const result = await fanOutAlert(
      h.deps,
      cycleOpenAlert({ time_critical: true }),
      ctx({}, { costToggleEnabled: true, lastEngagementAt: new Date('2026-07-23T00:00:00.000Z') }),
    );

    expect(result.bridged).toBe(true); // the request is still reported
    expect(result.deliveredChannel).toBe('push');
    expect(h.push.sendCount()).toBe(1);
    expect(h.sms.sendCount()).toBe(0);
    expect(result.costSuppressedChannels).toEqual([]); // AR-18 — a time-critical alert is never suppressed
  });

  // Story 5.8b (FS3 (a)) replaced: "the SMS rung ends `sms_bridge_not_lit`, ⛔ sent" — that word is retired (the bridge has its words).
  // A bridged alert that carries ⛔ bridge block (this fixture) runs the ladder and its SMS rung names WHY: `sms_message_not_lit`.
  it('a BRIDGED member whom push and WhatsApp miss, on an alert with ⛔ bridge block — the SMS rung ends `sms_message_not_lit`, ⛔ sent', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
    });
    const result = await fanOutAlert(h.deps, cycleOpenAlert({ time_critical: true }), ctx());
    expect(trailOf(result)).toEqual(['push:rejected', 'whatsapp:rejected', 'sms:skipped_no_target:sms_message_not_lit']);
    expect(h.sms.sendCount()).toBe(0);
    expect(result.delivered).toBe(false);
  });

  it('the bridge NEVER widens past cycle-open — a time-critical reminder still runs the ladder', async () => {
    const h = harness();
    const alert = { ...reminderAlert(), time_critical: true } as Alert;
    const result = await fanOutAlert(h.deps, alert, ctx());
    expect(result.bridged).toBe(false);
    expect(result.deliveredChannel).toBe('push');
  });

  it('NOT bridged + recent engagement ⇒ WA and SMS omitted, push still fires (push is never suppressed)', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(
      h.deps,
      reminderAlert(),
      ctx({}, { costToggleEnabled: true, lastEngagementAt: new Date('2026-07-23T00:00:00.000Z') }),
    );

    expect(result.costSuppressedChannels).toEqual(['whatsapp', 'sms']);
    expect(h.push.sendCount()).toBe(1); // push fired even though it failed — never suppressed
    expect(h.whatsapp.sendCount()).toBe(0);
    expect(h.sms.sendCount()).toBe(0);
    expect(result.delivered).toBe(false);
    // The suppression is recorded as an audit line, PII-free.
    const suppressionLine = h.auditLines.find((l) => l.action === 'alert.cost_suppression');
    expect(suppressionLine).toBeDefined();
    expect(suppressionLine!.resourceLocator).toContain(`member:${MEMBER}`);
  });

  it('a TIME-CRITICAL alert can never be cost-suppressed (the AR-18 override, checked first)', async () => {
    const h = harness();
    const result = await fanOutAlert(
      h.deps,
      { ...reminderAlert(), time_critical: true } as Alert,
      ctx({}, { costToggleEnabled: true, lastEngagementAt: new Date('2026-07-23T00:00:00.000Z') }),
    );
    expect(result.costSuppressedChannels).toEqual([]);
  });
});

// ─── (4) Telegram is independent of the ladder ─────────────────────────────────────────────────────

describe('AC6 — the Telegram side-channel fires INDEPENDENTLY of the ladder', () => {
  it('eligible for `alert_published` and fired outside the ladder (push still delivered)', async () => {
    const h = harness();
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ telegram: TARGETS.telegram }));

    expect(result.telegramMirrored).toBe(true);
    expect(h.telegram.sendCount()).toBe(1);
    // It is NOT a rung: the ladder still delivered on push, and telegram never appears on the trail.
    expect(result.deliveredChannel).toBe('push');
    expect(result.trail.some((e) => (e.channel as string) === 'telegram')).toBe(false);
  });

  it('NOT eligible for `deadline_reminder` — a per-member nudge is never mirrored to a group channel', async () => {
    const h = harness();
    const result = await fanOutAlert(h.deps, reminderAlert(), ctx({ telegram: TARGETS.telegram }));
    expect(result.telegramMirrored).toBe(false);
    expect(h.telegram.sendCount()).toBe(0);
  });

  it('NOT eligible for `contribution_confirmed` either', async () => {
    const h = harness();
    const confirmed = {
      ...cycleOpenAlert(),
      alert_category: 'contribution_confirmed',
      payload_data: { pool_id: POOL, amount_paise: 110000, period_label: '2026-07 cycle' },
    } as Alert;
    const result = await fanOutAlert(h.deps, confirmed, ctx({ telegram: TARGETS.telegram }));
    expect(result.telegramMirrored).toBe(false);
    expect(h.telegram.sendCount()).toBe(0);
  });

  it('a Telegram FAILURE changes neither `delivered` nor `deliveredChannel`', async () => {
    const h = harness({ telegram: makeProvider('telegram', 'telegram', 'rejected') });
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ telegram: TARGETS.telegram }));
    expect(result.delivered).toBe(true);
    expect(result.deliveredChannel).toBe('push');
  });
});

// ─── (5) The audit families (AC6) ──────────────────────────────────────────────────────────────────

describe('AC6 — both audit families are written through the frozen port', () => {
  // Story 5.11 (FS15 (a)) — the SMS rung ⛔ calls `dispatch`, so the FAKE SMS `alert.channel_send` audit line (the fixture's
  // `sms-dlt`, F3) is gone; push and WhatsApp keep both families. (Was: three dispatch lines, the third `channel=sms`.)
  it('every DISPATCHED rung writes its `alert.dispatch` line + a per-channel `alert.channel_send` line; ⛔ fake SMS line', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
    });
    await fanOutAlert(h.deps, litReminderAlert(), ctx());

    const dispatchLines = h.auditLines.filter((l) => l.action === 'alert.dispatch');
    const sendLines = h.auditLines.filter((l) => l.action === 'alert.channel_send');
    // One dispatch call per dispatched rung — the necessary consequence of the ratified per-rung composition (D9).
    expect(dispatchLines).toHaveLength(2);
    expect(sendLines.map((l) => l.resourceLocator)).toEqual([
      `alert:${ALERT};channel=push;provider=fcm`,
      `alert:${ALERT};channel=whatsapp;provider=whatsapp-business`,
    ]);
    // AI-4-3(c): the per-channel hash is the keyed HMAC of the RENDERED message, never raw copy.
    expect(sendLines.every((l) => /^[0-9a-f]{64}$/.test(l.requestPayloadHash))).toBe(true);
  });

  it('no audit line carries a delivery ADDRESS (device token / mobile / chat id)', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ telegram: TARGETS.telegram }));
    const serialized = JSON.stringify(h.auditLines);
    expect(serialized).not.toContain('device-token');
    expect(serialized).not.toContain('+919999999999');
    expect(serialized).not.toContain('chat-123');
  });
});

// ─── (6) The result record is NON-PII ──────────────────────────────────────────────────────────────

describe('the recorded fan-out result is NON-PII (channels + outcomes only)', () => {
  it('carries no address anywhere in the record', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ telegram: TARGETS.telegram }));
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('device-token');
    expect(serialized).not.toContain('+919999999999');
    expect(serialized).not.toContain('chat-123');
    expect(result.memberId).toBe(MEMBER);
  });
});

// ─── (7) Story 5.11 — WHO may receive an alert SMS (I2, as RULED by `-390` Q1 B) and the honest rung (I3) ─────────

describe('Story 5.11 AC3 — the ONE predicate (I2), branch by branch', () => {
  const base = { lit: true, pushOutcome: 'rejected', whatsappTarget: true, whatsappOutcome: 'rejected' } as const;

  it.each([
    ['push sent', { ...base, pushOutcome: 'sent' }, false],
    ['push failed + NO WhatsApp target (Pariwar off / no ACTIVE yes) — the ruled widening', { ...base, whatsappTarget: false, whatsappOutcome: 'skipped_no_target' }, true],
    ['push failed + WhatsApp failed', base, true],
    ['push failed + WhatsApp sent', { ...base, whatsappOutcome: 'sent' }, false],
    ['push skipped (no device) + WhatsApp skipped', { ...base, pushOutcome: 'skipped_no_target', whatsappOutcome: 'skipped_no_target' }, true],
    ['an UNLIT message, push and WhatsApp failed', { ...base, lit: false }, false],
  ] as const)('%s ⇒ %s', (_label, input, expected) => {
    expect(isAlertSmsFallbackEligible(input)).toBe(expected);
  });
});

describe('Story 5.11 AC3 / AC4 — the fan-out\'s SMS rung, end to end (⛔ any SMS send)', () => {
  it('push sent ⇒ the SMS rung is never reached, the provider never driven', async () => {
    const h = harness();
    const result = await fanOutAlert(h.deps, litReminderAlert(), ctx());
    expect(trailOf(result)).toEqual(['push:sent']);
    expect(h.sms.sendCount()).toBe(0);
  });

  it('push failed + WhatsApp sent ⇒ no SMS', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(h.deps, litReminderAlert(), ctx());
    expect(trailOf(result)).toEqual(['push:rejected', 'whatsapp:sent']);
    expect(h.sms.sendCount()).toBe(0);
  });

  it('push failed + WhatsApp failed ⇒ ELIGIBLE — `sms_send_not_wired`', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
    });
    const result = await fanOutAlert(h.deps, litReminderAlert(), ctx());
    expect(trailOf(result).at(-1)).toBe(`sms:skipped_no_target:${SMS_RUNG_DETAIL.notWired}`);
    expect(h.sms.sendCount()).toBe(0);
  });

  it('⭐ FS3 — a switched-on Pariwar whose WhatsApp REFUSES (no approved template) ⇒ the ladder ADVANCES, ELIGIBLE', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected', 'wa_template_not_approved'),
    });
    const result = await fanOutAlert(h.deps, litReminderAlert(), ctx());
    expect(trailOf(result)).toEqual([
      'push:rejected',
      'whatsapp:rejected:wa_template_not_approved',
      'sms:skipped_no_target:sms_send_not_wired',
    ]);
  });

  it('an UNLIT per-member message (contribution confirmed) ⇒ `sms_message_not_lit`', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });
    const confirmed = {
      ...cycleOpenAlert(),
      alert_category: 'contribution_confirmed',
      payload_data: { pool_id: POOL, amount_paise: 110000, period_label: '2026-07 cycle' },
    } as Alert;
    const result = await fanOutAlert(h.deps, confirmed, ctx());
    expect(trailOf(result).at(-1)).toBe('sms:skipped_no_target:sms_message_not_lit');
  });

  it('a day-5 reminder (same category as day 10, ⛔ `sms` block) ⇒ `sms_message_not_lit` — eligibility is by MESSAGE (T3)', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });
    const result = await fanOutAlert(h.deps, reminderAlert(), ctx());
    expect(trailOf(result).at(-1)).toBe('sms:skipped_no_target:sms_message_not_lit');
  });

  it('a lit, eligible member with no mobile on file ⇒ plain `skipped_no_target`', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(h.deps, litReminderAlert(), ctx({ whatsapp: null, sms: null }));
    expect(trailOf(result).at(-1)).toBe('sms:skipped_no_target');
  });

  it('cost-optimization still suppresses the SMS rung (`cost_optimized`) before any SMS decision', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(
      h.deps,
      litReminderAlert(),
      ctx({}, { costToggleEnabled: true, lastEngagementAt: new Date('2026-07-23T00:00:00.000Z') }),
    );
    expect(trailOf(result).at(-1)).toBe('sms:skipped_no_target:cost_optimized');
  });

  it('⭐ I3 — even an SMS provider that WOULD accept (the shipped fixture\'s posture) is never driven on the alert path', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
      sms: makeProvider('sms-dlt', 'sms', 'accepted'),
    });
    for (const alert of [litReminderAlert(), reminderAlert(), cycleOpenAlert(), cycleOpenAlert({ time_critical: true })]) {
      const result = await fanOutAlert(h.deps, alert, ctx());
      expect(result.trail.some((e) => e.channel === 'sms' && e.outcome === 'sent')).toBe(false);
      expect(result.delivered).toBe(false);
    }
    expect(h.sms.sendCount()).toBe(0);
  });
});

// ─── (8) Story 5.11 FS14 (a), review R1 — preserve the pre-5.11 retry set ─────────────────────────

describe('Story 5.11 AC4 / FS14 — former fixture successes are final; previous failures still retry (I4)', () => {
  beforeEach(() => {
    withPariwarScope.mockReset();
    withPariwarScope.mockImplementation((_pool: unknown, _pariwarId: string, fn: (db: unknown) => unknown) => Promise.resolve(fn({})));
    resolvePushTargets.mockResolvedValue([TARGETS.push]);
    resolveWaTarget.mockResolvedValue(null); // no WhatsApp yes — the motivating member
    resolveSmsTarget.mockResolvedValue(TARGETS.sms);
    resolveTelegramTarget.mockResolvedValue(null);
    getMemberLastEngagementAt.mockResolvedValue(null);
  });

  it('⭐ a member NO rung reached (push failed, no WhatsApp, the SMS rung not wired) is a RESULT — `in_app_only`, ⛔ on `retry`', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const { results, retry } = await fanOutAlertToMembers(h.deps, () => litReminderAlert(), [MEMBER], PARIWAR, new Date('2026-07-23T00:00:00.000Z'));
    expect(retry).toEqual([]);
    expect(results).toHaveLength(1);
    expect(results[0]!.delivered).toBe(false);
    expect(trailOf(results[0]!).at(-1)).toBe('sms:skipped_no_target:sms_send_not_wired');
  });

  it('a member whose fan-out THROWS (a target read fails) is on `retry` — the caller still throws so pg-boss retries', async () => {
    resolvePushTargets.mockRejectedValue(new Error('db blip'));
    const h = harness();
    const { results, retry } = await fanOutAlertToMembers(h.deps, () => litReminderAlert(), [MEMBER], PARIWAR, new Date('2026-07-23T00:00:00.000Z'));
    expect(retry).toEqual([MEMBER]);
    expect(results).toEqual([]);
  });

  it.each([
    ['lit reminder', litReminderAlert],
    ['unlit reminder', reminderAlert],
    ['cycle open', cycleOpenAlert],
  ] as const)('R1 — %s with a transient push failure and no SMS target still retries', async (_label, alertFor) => {
    resolveSmsTarget.mockResolvedValue(null);
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected', 'transient: unavailable') });
    const { results, retry } = await fanOutAlertToMembers(h.deps, () => alertFor(), [MEMBER], PARIWAR, new Date('2026-07-23T00:00:00.000Z'));
    expect(results[0]!.delivered).toBe(false);
    expect(retry).toEqual([MEMBER]);
    expect(h.sms.sendCount()).toBe(0);
  });

  it('R1 — no reachable target preserves the previous retry instead of completing the claim', async () => {
    resolvePushTargets.mockResolvedValue([]);
    resolveSmsTarget.mockResolvedValue(null);
    const h = harness();
    const { results, retry } = await fanOutAlertToMembers(h.deps, () => litReminderAlert(), [MEMBER], PARIWAR, new Date('2026-07-23T00:00:00.000Z'));
    expect(results[0]!.delivered).toBe(false);
    expect(retry).toEqual([MEMBER]);
  });

  it('R1 — a later successful push removes the no-SMS member from retry', async () => {
    resolveSmsTarget.mockResolvedValue(null);
    const h = harness();
    const { results, retry } = await fanOutAlertToMembers(h.deps, () => litReminderAlert(), [MEMBER], PARIWAR, new Date('2026-07-23T00:00:00.000Z'));
    expect(results[0]!.deliveredChannel).toBe('push');
    expect(retry).toEqual([]);
  });

  it('R1 — a cost-suppressed SMS target still retries; no fixture could previously complete it', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const context = ctx({}, { costToggleEnabled: true, lastEngagementAt: new Date('2026-07-23T00:00:00.000Z') });
    const result = await fanOutAlert(h.deps, litReminderAlert(), context);
    expect(result.costSuppressedChannels).toContain('sms');
    expect(shouldRetryFanOut(result, context)).toBe(true);
    expect(h.sms.sendCount()).toBe(0);
  });

  it.each(['wa_template_not_approved', 'wa_credentials_missing'])('R1 — %s without an SMS target stays terminal: the old WA fixture completed it', async (detail) => {
    resolveWaTarget.mockResolvedValue(TARGETS.whatsapp);
    resolveSmsTarget.mockResolvedValue(null);
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected', detail),
    });
    const { results, retry } = await fanOutAlertToMembers(h.deps, () => litReminderAlert(), [MEMBER], PARIWAR, new Date('2026-07-23T00:00:00.000Z'));
    expect(results[0]!.delivered).toBe(false);
    expect(retry).toEqual([]);
    expect(h.sms.sendCount()).toBe(0);
  });

  it('R1 — real WhatsApp failure without an SMS target still retries', async () => {
    resolveWaTarget.mockResolvedValue(TARGETS.whatsapp);
    resolveSmsTarget.mockResolvedValue(null);
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected', 'transient: unavailable'),
    });
    const { retry } = await fanOutAlertToMembers(h.deps, () => litReminderAlert(), [MEMBER], PARIWAR, new Date('2026-07-23T00:00:00.000Z'));
    expect(retry).toEqual([MEMBER]);
  });

  // ⭐ Story 5.8b (FS9 (a), `2026-10-28-415` — `-394` item 1's bridged clause superseded in part) replaced: "R1 — a bridge without an
  // SMS target still RETRIES even if the normal ladder hits a WA refusal" (the bridged arm `ctx.targets.sms === null`). THE ONE
  // CHANGED CASE: such a member now follows the ordinary rule — a named WhatsApp refusal is TERMINAL, like an un-bridged member's.
  it('⭐ FS9 (a) — a bridged member with ⛔ SMS target whose WhatsApp rung ended `wa_template_not_approved` is TERMINAL (was: retried)', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected', 'wa_template_not_approved'),
    });
    const context = ctx({ sms: null });
    const result = await fanOutAlert(h.deps, cycleOpenAlert({ time_critical: true }), context);
    expect(result.bridged).toBe(true);
    expect(shouldRetryFanOut(result, context, { retryCount: 0, retryLimit: 4 })).toBe(false);
    // …and a TRANSIENT WhatsApp failure still retries (the ordinary rule — the arm's removal changes only the named refusal).
    const t = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected', 'transient: unavailable'),
    });
    const transient = await fanOutAlert(t.deps, cycleOpenAlert({ time_critical: true }), context);
    expect(shouldRetryFanOut(transient, context, { retryCount: 0, retryLimit: 4 })).toBe(true);
  });

  it('R1 — a bridge with an SMS target stays terminal without sending the SMS fixture', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });
    const context = ctx();
    const result = await fanOutAlert(h.deps, cycleOpenAlert({ time_critical: true }), context);
    expect(shouldRetryFanOut(result, context)).toBe(false);
    expect(h.sms.sendCount()).toBe(0);
  });
});

describe('F6 — `serializeFanOutResult`, the one durable projection (R4)', () => {
  const record = {
    memberId: 'm', delivered: false, deliveredChannel: null, bridged: false, costSuppressedChannels: ['whatsapp'] as never,
    telegramMirrored: false,
    trail: [
      { channel: 'push', attempt: 0, outcome: 'rejected', detail: 'transient: +919999999999 token abc' },
      { channel: 'whatsapp', attempt: 0, outcome: 'skipped_no_target', detail: 'cost_optimized' },
      { channel: 'sms', attempt: 0, outcome: 'skipped_no_target', detail: 'sms_send_not_wired' },
    ],
  } as never;

  it('maps delivered → outcome, keeps ONLY named rung details, and carries no contact or provider text', () => {
    const out = serializeFanOutResult(record);
    expect(out).toEqual({
      delivered: false, outcome: 'in_app_only', deliveredChannel: null, bridged: false, costSuppressedChannels: ['whatsapp'],
      telegramMirrored: false,
      trail: ['push:0:rejected', 'whatsapp:0:skipped_no_target:cost_optimized', 'sms:0:skipped_no_target:sms_send_not_wired'],
    });
    expect(JSON.stringify(out)).not.toMatch(/9999|token/);
    expect(serializeFanOutResult({ ...(record as object), delivered: true, deliveredChannel: 'push' } as never)).toMatchObject({ outcome: 'delivered' });
  });
});

// ─── (9) Story 5.11b code review 2026-10-25 — the hops the live suite cannot see (C3-P2, C3-P23) ──────────────────────

describe('Story 5.11b review C3-P2 — `call` reaches the SMS seam AND the retry rule THROUGH fanOutAlertToMembers', () => {
  beforeEach(() => {
    withPariwarScope.mockReset();
    withPariwarScope.mockImplementation((_pool: unknown, _pariwarId: string, fn: (db: unknown) => unknown) => Promise.resolve(fn({})));
    resolvePushTargets.mockResolvedValue([TARGETS.push]);
    resolveWaTarget.mockResolvedValue(null);
    resolveSmsTarget.mockResolvedValue(TARGETS.sms);
    resolveTelegramTarget.mockResolvedValue(null);
    getMemberLastEngagementAt.mockResolvedValue(null);
  });

  it('⭐ the per-job `call` (the occasion, the attempt, the job id) is handed to the seam; a `rate_limited` rung is on `retry` BEFORE the final attempt and ⛔ on it', async () => {
    // Every live leg drives `fanOutAlert` directly, so dropping `call` at `fanOutAlert(deps, alertFor(m), ctx, call)` or at
    // `shouldRetryFanOut(result, ctx, call)` kept the whole suite green — and refused every real text ("no known occasion").
    const seen: unknown[] = [];
    const alertSms = vi.fn((input: { call?: unknown }) => {
      seen.push(input.call);
      return Promise.resolve({ outcome: 'rejected' as const, detail: 'rate_limited' });
    });
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const deps = { ...h.deps, alertSms } as unknown as ContributionNotifyDeps;
    const at = new Date('2026-07-23T00:00:00.000Z');
    const early = { occasion: 'day_10', jobId: 'job-1', retryCount: 1, retryLimit: 4 };
    const first = await fanOutAlertToMembers(deps, () => litReminderAlert(), [MEMBER], PARIWAR, at, early);
    expect(seen[0]).toEqual(early);
    expect(first.retry).toEqual([MEMBER]);
    const last = { ...early, retryCount: 4 };
    const second = await fanOutAlertToMembers(deps, () => litReminderAlert(), [MEMBER], PARIWAR, at, last);
    expect(seen[1]).toEqual(last);
    expect(second.retry).toEqual([]); // the final attempt: recorded `in_app_only`, ⛔ retried
    expect(alertSms).toHaveBeenCalledTimes(2);
  });

  it('a TERMINAL rung from the seam is ⛔ on `retry` at any attempt', async () => {
    const alertSms = vi.fn(() => Promise.resolve({ outcome: 'rejected' as const, detail: 'exhausted:rate_limited' }));
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const deps = { ...h.deps, alertSms } as unknown as ContributionNotifyDeps;
    const out = await fanOutAlertToMembers(deps, () => litReminderAlert(), [MEMBER], PARIWAR, new Date('2026-07-23T00:00:00.000Z'), {
      occasion: 'day_10',
      jobId: 'sweep',
      retryCount: 0,
      retryLimit: 4,
    });
    expect(out.retry).toEqual([]);
  });
});

describe('Story 5.11b review C3-P23 — ONE suppressing hook holds EVERY rung (DB-free)', () => {
  beforeEach(() => {
    withPariwarScope.mockReset();
    withPariwarScope.mockImplementation((_pool: unknown, _pariwarId: string, fn: (db: unknown) => unknown) => Promise.resolve(fn({})));
  });

  it('⭐ a hook that suppresses ⇒ the push, WhatsApp and Telegram providers are called ZERO times, and the SAME hook (by identity) is handed to the SMS seam — the live suite proves the seam then ⛔ sends', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
      sms: makeProvider('sms-dlt', 'sms', 'rejected'),
      telegram: makeProvider('telegram', 'telegram', 'rejected'),
    });
    const hook = () => Promise.resolve({ suppressed: true as const, reason: 'frozen', channels: 'all' as const });
    const alertSms = vi
      .fn<(input: { dispatch: { suppression?: unknown } }) => Promise<{ outcome: 'suppressed' }>>()
      .mockResolvedValue({ outcome: 'suppressed' });
    const deps = { ...h.deps, alertSms, suppression: hook } as unknown as ContributionNotifyDeps;
    await fanOutAlert(
      deps,
      litReminderAlert(),
      { targets: { push: [TARGETS.push], whatsapp: TARGETS.whatsapp, sms: TARGETS.sms, telegram: TARGETS.telegram }, costToggleEnabled: false, lastEngagementAt: null } as MemberFanOutContext,
      { occasion: 'day_10', jobId: 'j', retryCount: 0, retryLimit: 4 },
    );
    // A hook passed only to the push rung's dispatch would let WhatsApp or Telegram send.
    expect(h.push.sendCount() + h.whatsapp.sendCount() + h.telegram.sendCount()).toBe(0);
    expect(alertSms).toHaveBeenCalledTimes(1);
    expect(alertSms.mock.calls[0]![0].dispatch.suppression).toBe(hook);
  });
});

// ─── Story 5.8b (AC5, AC6, AC9, AC12; FS3 (a), FS3.1 (a), FS9 (a), FS17 (a)) — the bridge text, FIRST ──────────────────────

describe('Story 5.8b AC5 — a bridged cycle-open is TEXTED FIRST; the ladder is the fallback', () => {
  const BLOCK = { message: 'cycle_open_bridge', locale: 'hi', values: { pool: 'A', member1: 'रामेश्वर', member2: ' प्र.' } } as const;
  /** The bridged cycle-open as the producer builds it: time-critical, carrying the bridge block. */
  const bridgedAlert = (): Alert =>
    cycleOpenAlert({ time_critical: true, payload_data: { title: 'Your pool is open — Pool A', body: 'In support of the family.', sms: BLOCK } } as Partial<Alert>);
  const CALL = { occasion: 'cycle_open', jobId: 'job-1', retryCount: 0, retryLimit: 4 } as const;
  const seam = (answer: { outcome: string; detail?: string }) =>
    Object.assign(vi.fn<(input: Record<string, unknown>) => Promise<{ outcome: string; detail?: string }>>(() => Promise.resolve(answer)), {
      giveUpDeferred: vi.fn<(input: unknown) => Promise<'closed' | 'none' | 'failed'>>(() => Promise.resolve('none')),
    });
  const on = () => vi.fn(() => Promise.resolve(true));
  const depsWith = (h: Harness, alertSms: unknown, readBridgeSwitch: unknown = on()) =>
    ({ ...h.deps, alertSms, readBridgeSwitch }) as unknown as ContributionNotifyDeps;

  it('⭐ switch ON, text `sent` ⇒ delivered by SMS; push and WhatsApp are ⛔ run; the seam got the block, the call and `whatsappTried: false`', async () => {
    const h = harness();
    const alertSms = seam({ outcome: 'sent' });
    const hook = vi.fn(() => Promise.resolve({ suppressed: false as const }));
    const result = await fanOutAlert({ ...depsWith(h, alertSms), suppression: hook } as never, bridgedAlert(), ctx(), CALL);
    expect(result).toMatchObject({ delivered: true, deliveredChannel: 'sms', bridged: true });
    expect(trailOf(result)).toEqual(['sms:sent']);
    expect(h.push.sendCount()).toBe(0);
    expect(h.whatsapp.sendCount()).toBe(0);
    expect(h.sms.sendCount()).toBe(0); // ⛔ the category resolver's fixture — the seam texts (I4)
    expect(alertSms).toHaveBeenCalledTimes(1);
    expect(alertSms.mock.calls[0]![0]).toMatchObject({ block: BLOCK, target: TARGETS.sms, call: CALL, whatsappTried: false });
    expect((alertSms.mock.calls[0]![0] as { dispatch: { suppression: unknown } }).dispatch.suppression).toBe(hook);
  });

  it('⭐ T20 — the Telegram mirror is dispatched on the bridge-`sent` path too', async () => {
    const h = harness();
    const result = await fanOutAlert(depsWith(h, seam({ outcome: 'sent' })), bridgedAlert(), ctx({ telegram: TARGETS.telegram }), CALL);
    expect(result.deliveredChannel).toBe('sms');
    expect(result.telegramMirrored).toBe(true);
    expect(h.telegram.sendCount()).toBe(1);
  });

  it('⭐ a text that does not go (day one: ⛔ template id) ⇒ the ladder runs, push delivers; the bridge entry is FIRST', async () => {
    const h = harness();
    const result = await fanOutAlert(depsWith(h, seam({ outcome: 'skipped_no_target', detail: 'config:dlt_template_id_missing:hi' })), bridgedAlert(), ctx(), CALL);
    expect(trailOf(result)).toEqual(['sms:skipped_no_target:config:dlt_template_id_missing:hi', 'push:sent']);
    expect(result).toMatchObject({ delivered: true, deliveredChannel: 'push' });
  });

  it('⭐ T19 — push and WhatsApp also miss ⇒ the ladder\'s SMS rung ends `sms_bridge_already_tried` (⛔ a second text); the bridge entry precedes it in the SERIALISED trail', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });
    const alertSms = seam({ outcome: 'rejected', detail: 'rejected_invalid_number' });
    const result = await fanOutAlert(depsWith(h, alertSms), bridgedAlert(), ctx(), CALL);
    expect(trailOf(result)).toEqual([
      'sms:rejected:rejected_invalid_number',
      'push:rejected',
      'whatsapp:rejected',
      'sms:skipped_no_target:sms_bridge_already_tried',
    ]);
    expect(alertSms).toHaveBeenCalledTimes(1);
    const serialised = serializeFanOutResult(result).trail as string[];
    expect(serialised[0]).toBe('sms:0:rejected:rejected_invalid_number');
    expect(serialised.at(-1)).toBe('sms:0:skipped_no_target:sms_bridge_already_tried');
    // AC6 — `rejected_invalid_number` (the erased-member race, T16) is TERMINAL.
    expect(shouldRetryFanOut(result, ctx(), CALL)).toBe(false);
  });

  it('⭐ AC12 — switch OFF ⇒ ⛔ text tried, the switch is named, and the ladder runs EXACTLY as before (push delivers)', async () => {
    const h = harness();
    const alertSms = seam({ outcome: 'sent' });
    const off = vi.fn(() => Promise.resolve(false));
    const result = await fanOutAlert(depsWith(h, alertSms, off), bridgedAlert(), ctx(), CALL);
    expect(alertSms).not.toHaveBeenCalled();
    expect(result).toMatchObject({ delivered: true, deliveredChannel: 'push' });
    // Code review 2026-10-28 (second pass; `-415` item 17): the push delivered BEFORE the ladder's SMS rung, so the switch is named by
    // a LEADING entry — the same one the rung would have recorded (the serialised trail keeps it; ⛔ retried).
    expect(trailOf(result)).toEqual(['sms:skipped_no_target:sms_bridge_switched_off', 'push:sent']);
    expect((serializeFanOutResult(result).trail as string[])[0]).toBe('sms:0:skipped_no_target:sms_bridge_switched_off');
    expect(shouldRetryFanOut(result, ctx(), CALL)).toBe(false);
    const miss = harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });
    const r2 = await fanOutAlert(depsWith(miss, alertSms, off), bridgedAlert(), ctx(), CALL);
    expect(trailOf(r2)).toEqual(['push:rejected', 'whatsapp:rejected', 'sms:skipped_no_target:sms_bridge_switched_off']);
    expect(alertSms).not.toHaveBeenCalled();
    // ⛔ switch wired at all ⇒ OFF (the switch starts OFF).
    const r3 = await fanOutAlert({ ...miss.deps, alertSms } as unknown as ContributionNotifyDeps, bridgedAlert(), ctx(), CALL);
    expect(trailOf(r3).at(-1)).toBe('sms:skipped_no_target:sms_bridge_switched_off');
    expect(alertSms).not.toHaveBeenCalled();
  });

  it('AC12 — a switch read that THROWS ⇒ ⛔ text, ONE alarm, `sms_bridge_switch_unavailable`, RETRIED until the final attempt', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });
    const alertSms = seam({ outcome: 'sent' });
    const onAlarm = vi.fn();
    const broken = vi.fn(() => Promise.reject(new Error('relation does not exist')));
    const result = await fanOutAlert({ ...depsWith(h, alertSms, broken), onAlarm } as never, bridgedAlert(), ctx(), CALL);
    expect(alertSms).not.toHaveBeenCalled();
    expect(trailOf(result).at(-1)).toBe('sms:skipped_no_target:sms_bridge_switch_unavailable');
    expect(onAlarm).toHaveBeenCalledTimes(1);
    expect(shouldRetryFanOut(result, ctx(), CALL)).toBe(true);
    expect(shouldRetryFanOut(result, ctx(), { ...CALL, retryCount: 4 })).toBe(false);
  });

  it('⛔ text tried — no SMS target (the ladder, plain), no seam (`sms_send_not_wired`), no block (`sms_message_not_lit`); the switch is ⛔ read for any of them', async () => {
    const miss = () => harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });
    const read = on();
    const alertSms = seam({ outcome: 'sent' });
    expect(trailOf(await fanOutAlert(depsWith(miss(), alertSms, read), bridgedAlert(), ctx({ sms: null }), CALL)).at(-1)).toBe('sms:skipped_no_target');
    expect(trailOf(await fanOutAlert(depsWith(miss(), undefined, read), bridgedAlert(), ctx(), CALL)).at(-1)).toBe('sms:skipped_no_target:sms_send_not_wired');
    expect(trailOf(await fanOutAlert(depsWith(miss(), alertSms, read), cycleOpenAlert({ time_critical: true }), ctx(), CALL)).at(-1)).toBe(
      'sms:skipped_no_target:sms_message_not_lit',
    );
    expect(read).not.toHaveBeenCalled();
    expect(alertSms).not.toHaveBeenCalled();
  });

  it('fix review (2026-10-28) — blocks omitted on a FAILED overlay read: an un-reached member is RETRIED (⛔ its deferred row closed) until the final attempt; a reached one OWES the closure', async () => {
    const BLOCKLESS = { ...CALL, bridgeBlockUnavailable: true };
    const miss = harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });
    const alertSms = seam({ outcome: 'sent' });
    const unreached = await fanOutAlert(depsWith(miss, alertSms, on()), cycleOpenAlert({ time_critical: true }), ctx(), BLOCKLESS);
    expect(trailOf(unreached).at(-1)).toBe('sms:skipped_no_target:sms_bridge_block_unavailable');
    expect(shouldRetryFanOut(unreached, ctx(), BLOCKLESS)).toBe(true);
    expect(alertSms.giveUpDeferred).not.toHaveBeenCalled();
    expect(shouldRetryFanOut(unreached, ctx(), { ...BLOCKLESS, retryCount: 4 })).toBe(false);
    // ⛔ the flag ⇒ today's `sms_message_not_lit`, terminal (an ineligible member).
    const notLit = await fanOutAlert(depsWith(miss, alertSms, on()), cycleOpenAlert({ time_critical: true }), ctx(), CALL);
    expect(trailOf(notLit).at(-1)).toBe('sms:skipped_no_target:sms_message_not_lit');
    // Reached by push with ⛔ block to write the terminal row from ⇒ OWED (the seam answers `none`).
    const reached = await fanOutAlert(depsWith(harness(), alertSms, on()), cycleOpenAlert({ time_critical: true }), ctx(), BLOCKLESS);
    expect(reached.delivered).toBe(true);
    expect(reached.bridgeRowOpen).toBe(true);
    const reachedLit = await fanOutAlert(depsWith(harness(), seam({ outcome: 'sent' }), vi.fn(() => Promise.resolve(false))), bridgedAlert(), ctx(), CALL);
    expect(reachedLit.bridgeRowOpen).toBeFalsy();
  });

  it('⭐ FS3.1 (a) — a RATE-LIMITED bridge text then a ladder delivery ⇒ the deferred row is given up (once); ⛔ when the ladder does not deliver (the member is retried)', async () => {
    const h = harness();
    const alertSms = seam({ outcome: 'skipped_no_target', detail: 'rate_limited' });
    const delivered = await fanOutAlert(depsWith(h, alertSms), bridgedAlert(), ctx(), CALL);
    expect(delivered.deliveredChannel).toBe('push');
    expect(alertSms.giveUpDeferred).toHaveBeenCalledTimes(1);
    expect(alertSms.giveUpDeferred.mock.calls[0]).toEqual([{ alert: expect.objectContaining({ alert_id: ALERT }), call: CALL }]);
    const miss = harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });
    const again = seam({ outcome: 'skipped_no_target', detail: 'rate_limited' });
    const undelivered = await fanOutAlert(depsWith(miss, again), bridgedAlert(), ctx(), CALL);
    expect(again.giveUpDeferred).not.toHaveBeenCalled();
    // AC6 — the retry classes still apply (read off the FIRST `sms` entry — the bridge's): retried, then `in_app_only` on the final.
    expect(shouldRetryFanOut(undelivered, ctx(), CALL)).toBe(true);
    expect(shouldRetryFanOut(undelivered, ctx(), { ...CALL, retryCount: 4 })).toBe(false);
  });

  // Review P2-1 (replaces nothing — the FS3.1 leg above stays): the `deferred` row may be an EARLIER attempt's. Each way THIS attempt's
  // text is not tried (or not answered `rate_limited`) still closes it when the ladder delivers — the guard on this attempt's detail
  // alone left it re-sendable.
  it.each([
    ['the switch now OFF', { readBridgeSwitch: () => Promise.resolve(false) }, undefined],
    ['the switch unreadable', { readBridgeSwitch: () => Promise.reject(new Error('blip')) }, undefined],
    ['a Secret Manager transient', {}, { outcome: 'skipped_no_target', detail: 'config_unavailable:secret_manager' }],
    ['the send state unavailable', {}, { outcome: 'skipped_no_target', detail: 'sms_send_state_unavailable' }],
    ['the text in flight elsewhere', {}, { outcome: 'skipped_no_target', detail: 'sms_send_in_flight' }],
  ] as const)('⭐ review P2-1 — %s on a RETRY, then the push delivers ⇒ the earlier attempt\'s deferred row is given up (once)', async (_name, overrides, answer) => {
    const h = harness();
    const alertSms = seam(answer ?? { outcome: 'sent' });
    const retry = { ...CALL, retryCount: 1 };
    const result = await fanOutAlert({ ...depsWith(h, alertSms), onAlarm: () => undefined, ...overrides } as never, bridgedAlert(), ctx(), retry);
    expect(result).toMatchObject({ delivered: true, deliveredChannel: 'push' });
    expect(alertSms.giveUpDeferred).toHaveBeenCalledTimes(1);
    expect(alertSms.giveUpDeferred.mock.calls[0]).toEqual([{ alert: expect.objectContaining({ alert_id: ALERT }), call: retry }]);
    expect(result.bridgeRowOpen).toBeUndefined();
  });

  it('review P2-1 — ⛔ SMS target now, or ⛔ block now (the member since erased / frozen), the push delivers ⇒ still closed; a bridge text `sent` ⇒ ⛔ closure (the row is `accepted`)', async () => {
    const noTarget = seam({ outcome: 'sent' });
    await fanOutAlert(depsWith(harness(), noTarget), bridgedAlert(), ctx({ sms: null }), CALL);
    expect(noTarget.giveUpDeferred).toHaveBeenCalledTimes(1);
    const noBlock = seam({ outcome: 'sent' });
    await fanOutAlert(depsWith(harness(), noBlock), cycleOpenAlert({ time_critical: true }), ctx(), CALL);
    expect(noBlock.giveUpDeferred).toHaveBeenCalledTimes(1);
    const sent = seam({ outcome: 'sent' });
    await fanOutAlert(depsWith(harness(), sent), bridgedAlert(), ctx(), CALL);
    expect(sent.giveUpDeferred).not.toHaveBeenCalled();
    // An UN-bridged alert never owes one (I2).
    const plain = seam({ outcome: 'sent' });
    await fanOutAlert(depsWith(harness(), plain), litReminderAlert(), ctx(), { occasion: 'day_10' });
    expect(plain.giveUpDeferred).not.toHaveBeenCalled();
  });

  it('⭐ review P2-1 — a closure that FAILS is reported: still delivered and ⛔ retried (no second push), `bridgeRowOpen` on the result AND in the recorded form', async () => {
    const h = harness();
    const alertSms = seam({ outcome: 'skipped_no_target', detail: 'rate_limited' });
    alertSms.giveUpDeferred.mockResolvedValue('failed');
    const result = await fanOutAlert(depsWith(h, alertSms), bridgedAlert(), ctx(), CALL);
    expect(result).toMatchObject({ delivered: true, deliveredChannel: 'push', bridgeRowOpen: true });
    expect(shouldRetryFanOut(result, ctx(), CALL)).toBe(false);
    expect(serializeFanOutResult(result)).toMatchObject({ delivered: true, bridgeRowOpen: true });
    alertSms.giveUpDeferred.mockResolvedValue('closed');
    const closed = await fanOutAlert(depsWith(harness(), alertSms), bridgedAlert(), ctx(), CALL);
    expect(closed.bridgeRowOpen).toBeUndefined();
    expect(serializeFanOutResult(closed)).not.toHaveProperty('bridgeRowOpen');
  });

  it('⭐ AC9 / I2 — an UN-bridged alert never takes the bridge path: a lit day-10 reminder whose push accepts is ⛔ texted; a news alert with a planted block is ⛔ texted', async () => {
    const h = harness();
    const alertSms = seam({ outcome: 'sent' });
    const read = on();
    const dayTen = { ...litReminderAlert(), time_critical: true } as Alert;
    const r1 = await fanOutAlert(depsWith(h, alertSms, read), dayTen, ctx(), { occasion: 'day_10' });
    expect(r1).toMatchObject({ bridged: false, deliveredChannel: 'push' });
    // A news `alert_published` (time_critical false) with a block planted PAST the contract — the fan-out ignores it.
    const miss = harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });
    const news = { ...bridgedAlert(), time_critical: false } as Alert;
    const r2 = await fanOutAlert(depsWith(miss, alertSms, read), news, ctx(), CALL);
    expect(r2.bridged).toBe(false);
    expect(trailOf(r2).at(-1)).toBe('sms:skipped_no_target:sms_message_not_lit');
    expect(alertSms).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it('AC12 — `onceForJob`: a job of many members reads the switch ONCE (through `fanOutAlertToMembers`)', async () => {
    withPariwarScope.mockReset();
    withPariwarScope.mockImplementation((_pool: unknown, _pariwarId: string, fn: (db: unknown) => unknown) => Promise.resolve(fn({})));
    resolvePushTargets.mockResolvedValue([TARGETS.push]);
    resolveWaTarget.mockResolvedValue(null);
    resolveSmsTarget.mockResolvedValue(TARGETS.sms);
    resolveTelegramTarget.mockResolvedValue(null);
    getMemberLastEngagementAt.mockResolvedValue(null);
    const h = harness();
    const read = on();
    const alertSms = seam({ outcome: 'sent' });
    const members = ['aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003'];
    const { results } = await fanOutAlertToMembers(
      { ...depsWith(h, alertSms, onceForJob(read)) } as never,
      (memberId) => ({ ...bridgedAlert(), member_id: memberId }) as Alert,
      members, PARIWAR, new Date('2026-07-23T00:00:00.000Z'), CALL,
    );
    expect(results.map((r) => r.deliveredChannel)).toEqual(['sms', 'sms', 'sms']);
    expect(read).toHaveBeenCalledTimes(1);
    expect(alertSms).toHaveBeenCalledTimes(3);
  });
});

// ─── Story 5.8b — code review 2026-10-28 (second pass): the terminal row, the in-app-only closure, the trail, the predicate, the alarm ───

describe('Story 5.8b code review 2026-10-28 (second pass) — the bridge after the ladder', () => {
  const BLOCK = { message: 'cycle_open_bridge', locale: 'hi', values: { pool: 'A', member1: 'रामेश्वर', member2: ' प्र.' } } as const;
  const bridgedAlert = (): Alert =>
    cycleOpenAlert({ time_critical: true, payload_data: { title: 'Your pool is open — Pool A', body: 'In support of the family.', sms: BLOCK } } as Partial<Alert>);
  const CALL = { occasion: 'cycle_open', jobId: 'job-1', retryCount: 0, retryLimit: 4 } as const;
  const missing = () => harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });

  /**
   * A double of the seam AND its record (one row per member): a closure with ⛔ row writes the terminal `ladder_delivered` row when the
   * ladder delivered (only `in_app_only` ⇒ ⛔ row); a text is SENT only from ⛔ row or a `deferred` one — a FINAL row reads terminal.
   * The real seam's SQL is proven live (`alert-sms-send-live.test.ts`); this proves the fan-out ASKS for the right closure.
   */
  function recordingSeam(initial: 'none' | 'deferred' = 'none') {
    const state = { row: initial as 'none' | 'deferred' | 'ladder_delivered' | 'in_app_only' | 'accepted', texts: 0 };
    const send = vi.fn(() => {
      if (state.row === 'ladder_delivered') return Promise.resolve({ outcome: 'rejected' as const, detail: 'exhausted:ladder_delivered' });
      if (state.row === 'in_app_only') return Promise.resolve({ outcome: 'rejected' as const, detail: 'exhausted:rate_limited' });
      state.texts += 1;
      state.row = 'accepted';
      return Promise.resolve({ outcome: 'sent' as const });
    });
    const giveUpDeferred = vi.fn((input: { ladder?: 'delivered' | 'in_app_only' }) => {
      const ladder = input.ladder ?? 'delivered';
      if (state.row === 'deferred') {
        state.row = ladder === 'delivered' ? 'ladder_delivered' : 'in_app_only';
        return Promise.resolve('closed' as const);
      }
      if (state.row === 'none' && ladder === 'delivered') {
        state.row = 'ladder_delivered';
        return Promise.resolve('closed' as const);
      }
      return Promise.resolve('none' as const);
    });
    return { state, seam: Object.assign(send, { giveUpDeferred }) };
  }
  const depsOf = (h: Harness, alertSms: unknown, switchOn: boolean, extra: Record<string, unknown> = {}) =>
    ({ ...h.deps, alertSms, readBridgeSwitch: () => Promise.resolve(switchOn), ...extra }) as unknown as ContributionNotifyDeps;

  it('⭐ was Decision 2 (a) — switch OFF and the push delivers ⇒ the closure is asked with ⛔ row (it writes the terminal row); the hourly RE-FAN with the switch now ON ⇒ ⛔ text', async () => {
    const r = recordingSeam();
    const first = await fanOutAlert(depsOf(harness(), r.seam, false), bridgedAlert(), ctx(), CALL);
    expect(first).toMatchObject({ delivered: true, deliveredChannel: 'push' });
    expect(r.seam.giveUpDeferred).toHaveBeenCalledTimes(1);
    expect(r.seam.giveUpDeferred.mock.calls[0]![0]).not.toHaveProperty('ladder'); // `delivered` — the terminal-row mode
    expect(r.state.row).toBe('ladder_delivered');
    // F9's hourly re-fan (a NEW job id — the key was vacuumed), bridged again (FS10), the switch now ON and the push down.
    const refan = await fanOutAlert(depsOf(missing(), r.seam, true), bridgedAlert(), ctx(), { ...CALL, jobId: 'job-refan' });
    expect(r.state.texts).toBe(0);
    expect(refan.trail[0]).toMatchObject({ channel: 'sms', outcome: 'rejected', detail: 'exhausted:ladder_delivered' });
    expect(serializeFanOutResult(refan).trail as string[]).toContain('sms:0:rejected:exhausted:ladder_delivered');
    // …and the control: with ⛔ closure on the first pass the re-fan TEXTS (what the review proved — F9).
    const control = recordingSeam();
    await fanOutAlert(depsOf(harness(), Object.assign(vi.fn(control.seam), {}), false), bridgedAlert(), ctx(), CALL);
    await fanOutAlert(depsOf(missing(), control.seam, true), bridgedAlert(), ctx(), { ...CALL, jobId: 'job-refan' });
    expect(control.state.texts).toBe(1);
  });

  it('⭐ a member recorded TERMINALLY without delivery (the switch OFF, push and WhatsApp down) ⇒ an earlier `deferred` row is given up `in_app_only` — and with ⛔ row ⛔ row is written (a later re-fan may text them)', async () => {
    const withRow = recordingSeam('deferred');
    const r1 = await fanOutAlert(depsOf(missing(), withRow.seam, false), bridgedAlert(), ctx(), { ...CALL, retryCount: 1 });
    expect(r1.delivered).toBe(false);
    expect(shouldRetryFanOut(r1, ctx(), { ...CALL, retryCount: 1 })).toBe(false);
    expect(withRow.seam.giveUpDeferred).toHaveBeenCalledTimes(1);
    expect(withRow.seam.giveUpDeferred.mock.calls[0]![0]).toMatchObject({ ladder: 'in_app_only', call: { ...CALL, retryCount: 1 } });
    expect(withRow.state.row).toBe('in_app_only');
    expect(r1.bridgeRowOpen).toBeUndefined();
    const noRow = recordingSeam();
    await fanOutAlert(depsOf(missing(), noRow.seam, false), bridgedAlert(), ctx(), CALL);
    expect(noRow.seam.giveUpDeferred.mock.calls[0]![0]).toMatchObject({ ladder: 'in_app_only' });
    expect(noRow.state.row).toBe('none');
    await fanOutAlert(depsOf(missing(), noRow.seam, true), bridgedAlert(), ctx(), { ...CALL, jobId: 'job-refan' });
    expect(noRow.state.texts).toBe(1);
  });

  it('a RETRIED member (the switch unreadable, not the final attempt) is ⛔ closed; on the FINAL attempt it is (in-app only); a failed closure is reported `bridgeRowOpen`', async () => {
    const r = recordingSeam('deferred');
    const broken = { readBridgeSwitch: () => Promise.reject(new Error('blip')), onAlarm: () => undefined };
    const retried = await fanOutAlert(depsOf(missing(), r.seam, true, broken), bridgedAlert(), ctx(), { ...CALL, retryCount: 1 });
    expect(shouldRetryFanOut(retried, ctx(), { ...CALL, retryCount: 1 })).toBe(true);
    expect(r.seam.giveUpDeferred).not.toHaveBeenCalled();
    const final = { ...CALL, retryCount: 4 };
    await fanOutAlert(depsOf(missing(), r.seam, true, broken), bridgedAlert(), ctx(), final);
    expect(r.seam.giveUpDeferred.mock.calls[0]![0]).toMatchObject({ ladder: 'in_app_only', call: final });
    const failing = recordingSeam('deferred');
    failing.seam.giveUpDeferred.mockResolvedValue('failed' as never);
    const open = await fanOutAlert(depsOf(missing(), failing.seam, false), bridgedAlert(), ctx(), CALL);
    expect(open).toMatchObject({ delivered: false, bridgeRowOpen: true });
    expect(serializeFanOutResult(open)).toMatchObject({ outcome: 'in_app_only', bridgeRowOpen: true });
  });

  it('⭐ `-415` item 17 — every way the bridge text is NOT tried leads the trail when the ladder delivers first; retry unchanged (a delivered member is ⛔ retried); a TRIED text keeps its own entry and ⛔ second', async () => {
    const cases: [string, ContributionNotifyDeps, MemberFanOutContext, Alert, string][] = [
      ['off', depsOf(harness(), recordingSeam().seam, false), ctx(), bridgedAlert(), 'sms:skipped_no_target:sms_bridge_switched_off'],
      ['unreadable', depsOf(harness(), recordingSeam().seam, true, { readBridgeSwitch: () => Promise.reject(new Error('x')), onAlarm: () => undefined }), ctx(), bridgedAlert(), 'sms:skipped_no_target:sms_bridge_switch_unavailable'],
      ['no block', depsOf(harness(), recordingSeam().seam, true), ctx(), cycleOpenAlert({ time_critical: true }), 'sms:skipped_no_target:sms_message_not_lit'],
      ['no target', depsOf(harness(), recordingSeam().seam, true), ctx({ sms: null }), bridgedAlert(), 'sms:skipped_no_target'],
    ];
    for (const [, deps, c, alert, lead] of cases) {
      const result = await fanOutAlert(deps, alert, c, CALL);
      expect(trailOf(result)).toEqual([lead, 'push:sent']);
      expect(shouldRetryFanOut(result, c, CALL)).toBe(false);
    }
    // An UN-bridged alert gains ⛔ entry.
    expect(trailOf(await fanOutAlert(depsOf(harness(), recordingSeam().seam, true), cycleOpenAlert(), ctx(), CALL))).toEqual(['push:sent']);
    // A tried text that did not go: its own entry leads (unchanged), ⛔ a second.
    const tried = Object.assign(vi.fn(() => Promise.resolve({ outcome: 'skipped_no_target' as const, detail: 'config:dlt_template_id_missing:hi' })), {
      giveUpDeferred: vi.fn(() => Promise.resolve('none' as const)),
    });
    expect(trailOf(await fanOutAlert(depsOf(harness(), tried, true), bridgedAlert(), ctx(), CALL))).toEqual([
      'sms:skipped_no_target:config:dlt_template_id_missing:hi',
      'push:sent',
    ]);
  });

  it('⭐ AC12 — a switch read that throws, through `onceForJob`, is alarmed ONCE per job (⛔ per member); an unwrapped read still alarms each', async () => {
    withPariwarScope.mockReset();
    withPariwarScope.mockImplementation((_pool: unknown, _pariwarId: string, fn: (db: unknown) => unknown) => Promise.resolve(fn({})));
    resolvePushTargets.mockResolvedValue([TARGETS.push]);
    resolveWaTarget.mockResolvedValue(null);
    resolveSmsTarget.mockResolvedValue(TARGETS.sms);
    resolveTelegramTarget.mockResolvedValue(null);
    getMemberLastEngagementAt.mockResolvedValue(null);
    const members = ['aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003'];
    const run = async (read: () => Promise<boolean>) => {
      const onAlarm = vi.fn();
      const deps = { ...harness().deps, alertSms: recordingSeam().seam, readBridgeSwitch: read, onAlarm } as unknown as ContributionNotifyDeps;
      await fanOutAlertToMembers(deps, (m) => ({ ...bridgedAlert(), member_id: m }) as Alert, members, PARIWAR, new Date('2026-07-23T00:00:00.000Z'), CALL);
      return onAlarm.mock.calls.map(([m]) => String(m)).filter((m) => m.includes('bridge switch could not be read'));
    };
    const once = await run(onceForJob(() => Promise.reject(new Error('relation does not exist'))));
    expect(once).toHaveLength(1);
    expect(once[0]).toContain('relation does not exist');
    // A SECOND job (its own `onceForJob`) alarms again — the dedupe is per job, ⛔ per process.
    expect(await run(onceForJob(() => Promise.reject(new Error('relation does not exist'))))).toHaveLength(1);
    expect(await run(() => Promise.reject(new Error('unwrapped')))).toHaveLength(3);
  });
});

describe('Story 5.8b AC6 — `isCycleOpenBridgeTextEligible`, THE one predicate (code review 2026-10-28, second pass)', () => {
  const yes = {
    bridged: true,
    deathReported: false,
    textLanguage: 'hi' as const,
    nameBoxes: ['रामेश्वर', ' प्र.'] as const,
    smsTarget: true,
    switchOn: true,
  };
  it('every conjunct holds ⇒ texted', () => {
    expect(isCycleOpenBridgeTextEligible(yes)).toBe(true);
    expect(isCycleOpenBridgeTextEligible({ ...yes, textLanguage: 'en' })).toBe(true);
  });
  it.each([
    ['not declared at the freeze', { bridged: false }],
    ['their own death reported', { deathReported: true }],
    ['⛔ text language (⛔ passport row)', { textLanguage: null }],
    ['the name does not fit even shortened', { nameBoxes: null }],
    ['a box would be empty', { nameBoxes: ['R', ''] as const }],
    ['⛔ SMS target', { smsTarget: false }],
    ['the Super Admin switch OFF', { switchOn: false }],
  ])('⛔ %s', (_name, change) => {
    expect(isCycleOpenBridgeTextEligible({ ...yes, ...change })).toBe(false);
  });
  it('push, WhatsApp and a WhatsApp yes are ⛔ inputs (the text goes FIRST — AC6)', () => {
    // The signature itself is the pin: an input named for push / WhatsApp would make this an excess-property error.
    const keys = Object.keys(yes).sort();
    expect(keys).toEqual(['bridged', 'deathReported', 'nameBoxes', 'smsTarget', 'switchOn', 'textLanguage']);
  });
});
