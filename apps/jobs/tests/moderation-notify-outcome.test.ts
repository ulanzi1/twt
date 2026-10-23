// Story 5.11 review R3 — record terminal outcomes, retain only PII-free reasons, preserve R1 retries.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claim: vi.fn(), recordResult: vi.fn(), release: vi.fn(), getResult: vi.fn(), inspect: vi.fn(), memberExists: vi.fn(), fanOut: vi.fn(),
}));

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    withPariwarScope: (_pool: unknown, _pariwarId: string, fn: (db: unknown) => unknown) => Promise.resolve(fn({})),
    member: { ...actual.member, memberExists: mocks.memberExists },
    idempotency: { ...actual.idempotency, createKeyedStore: () => mocks },
  };
});
vi.mock('../src/scheduler/contribution-notify.js', async (importActual) => ({
  ...(await importActual<typeof import('../src/scheduler/contribution-notify.js')>()),
  fanOutAlertToMembers: mocks.fanOut,
}));

const { runModerationNotify } = await import('../src/scheduler/moderation-notify.js');

const PARIWAR = '11111111-1111-4111-8111-111111111111';
const MEMBER = '22222222-2222-4222-8222-222222222222';
const payload = {
  moderationActionId: '33333333-3333-4333-8333-333333333333',
  memberId: MEMBER, action: 'suspend' as const, reasonCode: 'r14-forgery',
};
const deps = { notify: {} as never, now: () => new Date('2026-10-23T00:00:00Z'), onAlarm: vi.fn() };
const terminal = {
  memberId: MEMBER, delivered: false, deliveredChannel: null, bridged: false,
  costSuppressedChannels: [], telegramMirrored: false,
  trail: [
    { channel: 'push', attempt: 0, outcome: 'rejected', detail: 'transient: +919999999999' },
    { channel: 'whatsapp', attempt: 0, outcome: 'rejected', detail: 'wa_template_not_approved' },
    { channel: 'sms', attempt: 0, outcome: 'skipped_no_target', detail: 'sms_message_not_lit' },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.memberExists.mockResolvedValue(true);
  mocks.claim.mockResolvedValue('acquired');
  mocks.recordResult.mockResolvedValue(undefined);
  mocks.release.mockResolvedValue(undefined);
  mocks.getResult.mockResolvedValue(null);
  mocks.inspect.mockResolvedValue(null);
  mocks.fanOut.mockResolvedValue({ results: [terminal], retry: [] });
});

describe('R3 — moderation durable outcomes', () => {
  it('records in_app_only with the named trail, excluding provider error text', async () => {
    const result = await runModerationNotify(deps, payload, PARIWAR);
    expect(result).toMatchObject({ notified: true, delivered: false, alreadySent: false }); // P5 — honest about the outcome
    expect(mocks.recordResult).toHaveBeenCalledWith(
      `moderation.notify:${PARIWAR}:${result.alertId}:${MEMBER}`,
      expect.objectContaining({ outcome: 'in_app_only', delivered: false, trail: [
        'push:0:rejected', 'whatsapp:0:rejected:wa_template_not_approved', 'sms:0:skipped_no_target:sms_message_not_lit',
      ] }),
    );
    expect(JSON.stringify(mocks.recordResult.mock.calls)).not.toContain('+919999999999');
    expect(mocks.release).not.toHaveBeenCalled();
  });

  it('records a successful send honestly', async () => {
    mocks.fanOut.mockResolvedValue({ results: [{ ...terminal, delivered: true, deliveredChannel: 'push' }], retry: [] });
    expect(await runModerationNotify(deps, payload, PARIWAR)).toMatchObject({ delivered: true, alreadySent: false });
    expect(mocks.recordResult.mock.calls[0]![1]).toMatchObject({ outcome: 'delivered', deliveredChannel: 'push' });
  });

  it('skips delivery and recording when the notice is already RECORDED — even past its TTL — and reports the outcome', async () => {
    mocks.claim.mockResolvedValue('already_claimed');
    for (const expiresAt of [new Date('2026-10-24T00:00:00Z'), new Date('2026-10-22T23:00:00Z')]) {
      mocks.inspect.mockResolvedValue({
        status: 'completed', createdAt: new Date('2026-10-22T22:00:00Z'), expiresAt, result: { delivered: false, outcome: 'in_app_only' },
      });
      expect(await runModerationNotify(deps, payload, PARIWAR)).toMatchObject({ notified: true, delivered: false, alreadySent: true });
    }
    expect(mocks.fanOut).not.toHaveBeenCalled();
    expect(mocks.recordResult).not.toHaveBeenCalled();
  });

  it('E1 (a) — a pending claim YOUNGER than the 15-min expiry is in flight: alarm + throw, ⛔ take-over, ⛔ send', async () => {
    mocks.claim.mockResolvedValue('already_claimed');
    mocks.inspect.mockResolvedValue({ status: 'pending', createdAt: new Date('2026-10-22T23:50:00Z'), expiresAt: new Date('2026-10-23T23:50:00Z'), result: null });
    await expect(runModerationNotify(deps, payload, PARIWAR)).rejects.toThrow(/still in flight/);
    expect(deps.onAlarm).toHaveBeenCalledWith(expect.stringContaining('still in flight'));
    expect(mocks.fanOut).not.toHaveBeenCalled();
    expect(mocks.release).not.toHaveBeenCalled();
  });

  it('E1 (a) — a pending claim OLDER than the expiry was abandoned: taken over, sent, recorded', async () => {
    mocks.claim.mockResolvedValueOnce('already_claimed').mockResolvedValueOnce('acquired');
    mocks.inspect.mockResolvedValue({ status: 'pending', createdAt: new Date('2026-10-22T23:44:59Z'), expiresAt: new Date('2026-10-23T23:44:59Z'), result: null });
    expect(await runModerationNotify(deps, payload, PARIWAR)).toMatchObject({ notified: true, alreadySent: false });
    expect(mocks.release).toHaveBeenCalledTimes(1);
    expect(mocks.fanOut).toHaveBeenCalledTimes(1);
    expect(mocks.recordResult).toHaveBeenCalledTimes(1);
    expect(deps.onAlarm).toHaveBeenCalledWith(expect.stringContaining('ABANDONED'));
  });

  it('E1 (a) — losing the take-over race throws (the winner sends)', async () => {
    mocks.claim.mockResolvedValue('already_claimed');
    await expect(runModerationNotify(deps, payload, PARIWAR)).rejects.toThrow(/lost the take-over/);
    expect(mocks.fanOut).not.toHaveBeenCalled();
  });

  it('R1 — a resolved failure on retry releases the claim and throws', async () => {
    mocks.fanOut.mockResolvedValue({ results: [terminal], retry: [MEMBER] });
    await expect(runModerationNotify(deps, payload, PARIWAR)).rejects.toThrow(/fan-out failed/);
    expect(mocks.release).toHaveBeenCalledTimes(1);
    expect(mocks.recordResult).not.toHaveBeenCalled();
  });

  it('releases the claim when fan-out throws unexpectedly', async () => {
    mocks.fanOut.mockRejectedValue(new Error('scope unavailable'));
    await expect(runModerationNotify(deps, payload, PARIWAR)).rejects.toThrow('scope unavailable');
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it('P4 — a recording failure alarms, KEEPS the claim and completes (⛔ re-send), like the sibling workers', async () => {
    mocks.recordResult.mockRejectedValue(new Error('record unavailable'));
    expect(await runModerationNotify(deps, payload, PARIWAR)).toMatchObject({ notified: true, delivered: false });
    expect(mocks.recordResult).toHaveBeenCalledWith(expect.stringContaining('moderation.notify:'), expect.objectContaining({ outcome: 'in_app_only' }));
    expect(mocks.release).not.toHaveBeenCalled();
    expect(deps.onAlarm).toHaveBeenCalledWith(expect.stringContaining('failed to record the member result'));
  });

  it('does not manufacture a terminal outcome for a missing result', async () => {
    mocks.fanOut.mockResolvedValue({ results: [], retry: [] });
    await expect(runModerationNotify(deps, payload, PARIWAR)).rejects.toThrow(/no member result/);
    expect(mocks.recordResult).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it('does not claim a notice for a missing member', async () => {
    mocks.memberExists.mockResolvedValue(false);
    expect(await runModerationNotify(deps, payload, PARIWAR)).toMatchObject({ notified: false, reason: 'member-not-found' });
    expect(mocks.claim).not.toHaveBeenCalled();
  });
});
