// Retry / backoff / cascade primitive — Story 5.6 (Task 7; AC3). DETERMINISTIC: the clock/sleep seam is
// injected (a recorder), so NO real timers run. Covers the retry bound, the backoff schedule, the cascade
// down CANONICAL_CHANNEL_LADDER only, SMS-as-terminal, and Telegram independence.

import { describe, expect, it } from 'vitest';

import {
  CANONICAL_CHANNEL_LADDER,
  DEFAULT_SMS_BACKOFF_MS,
  runChannelCascade,
  type CascadeSender,
  type ChannelSendOutcome,
  type Channel,
} from '../src/index.js';

/** A sleep recorder — records every backoff wait WITHOUT waiting (deterministic). */
function sleepRecorder(): { sleep: (ms: number) => Promise<void>; waits: number[] } {
  const waits: number[] = [];
  return { waits, sleep: (ms) => { waits.push(ms); return Promise.resolve(); } };
}

/** A sender that returns a fixed outcome for every channel/attempt, recording the calls. */
function scriptedSender(
  script: (channel: Channel, attempt: number) => ChannelSendOutcome,
): { send: CascadeSender; calls: Array<{ channel: Channel; attempt: number }> } {
  const calls: Array<{ channel: Channel; attempt: number }> = [];
  return {
    calls,
    send: (channel, attempt) => {
      calls.push({ channel, attempt });
      return Promise.resolve(script(channel, attempt));
    },
  };
}

describe('runChannelCascade — retry bound + backoff (AC3)', () => {
  it('the default backoff schedule is [30s, 5m, 30m]', () => {
    expect([...DEFAULT_SMS_BACKOFF_MS]).toEqual([30_000, 300_000, 1_800_000]);
  });

  it('a channel that keeps failing retries 1 initial + backoffMs.length times, sleeping the schedule', async () => {
    const { send, calls } = scriptedSender(() => ({ outcome: 'rejected' }));
    const { sleep, waits } = sleepRecorder();

    const result = await runChannelCascade(send, { ladder: ['push'], sleep });

    // 1 initial attempt + 3 backoff-spaced retries = 4 attempts on the single rung.
    expect(calls.map((c) => c.attempt)).toEqual([0, 1, 2, 3]);
    // One sleep BEFORE each retry, in schedule order (never before the initial attempt).
    expect(waits).toEqual([30_000, 300_000, 1_800_000]);
    expect(result.delivered).toBe(false);
    expect(result.trail).toHaveLength(4);
  });

  it('stops immediately on the first `sent` (success) — no retries, no sleeps', async () => {
    const { send, calls } = scriptedSender(() => ({ outcome: 'sent' }));
    const { sleep, waits } = sleepRecorder();

    const result = await runChannelCascade(send, { sleep });

    expect(calls).toEqual([{ channel: 'push', attempt: 0 }]);
    expect(waits).toEqual([]);
    expect(result).toMatchObject({ delivered: true, deliveredChannel: 'push' });
  });

  it('honors an injected backoff schedule (retry count = schedule length)', async () => {
    const { send, calls } = scriptedSender(() => ({ outcome: 'error' }));
    const { sleep, waits } = sleepRecorder();

    await runChannelCascade(send, { ladder: ['sms'], backoffMs: [10, 20], sleep });

    expect(calls.map((c) => c.attempt)).toEqual([0, 1, 2]); // 1 initial + 2 retries
    expect(waits).toEqual([10, 20]);
  });
});

describe('runChannelCascade — cascade down the ladder (AC3)', () => {
  it('cascades push → whatsapp → sms and delivers on the first channel that sends', async () => {
    // push fails all attempts; whatsapp sends on its initial attempt.
    const { send, calls } = scriptedSender((channel) => (channel === 'whatsapp' ? { outcome: 'sent' } : { outcome: 'rejected' }));
    const { sleep } = sleepRecorder();

    const result = await runChannelCascade(send, { sleep, backoffMs: [1, 1, 1] });

    expect(result).toMatchObject({ delivered: true, deliveredChannel: 'whatsapp' });
    // push exhausted (4 attempts), then whatsapp delivered on attempt 0; sms NEVER reached.
    const channels = [...new Set(calls.map((c) => c.channel))];
    expect(channels).toEqual(['push', 'whatsapp']);
    expect(calls.some((c) => c.channel === 'sms')).toBe(false);
  });

  it('defaults to CANONICAL_CHANNEL_LADDER — SMS is the TERMINAL rung (no rung below)', async () => {
    const { send, calls } = scriptedSender(() => ({ outcome: 'rejected' }));
    const { sleep } = sleepRecorder();

    const result = await runChannelCascade(send, { sleep, backoffMs: [1] });

    // The ladder iterated is exactly the frozen tuple; the last rung attempted is sms.
    const channels = [...new Set(calls.map((c) => c.channel))];
    expect(channels).toEqual([...CANONICAL_CHANNEL_LADDER]);
    expect(channels[channels.length - 1]).toBe('sms');
    expect(result.delivered).toBe(false);
    expect(result.deliveredChannel).toBeNull();
  });

  it('leaves Telegram INDEPENDENT — the cascade never attempts the telegram side-channel', async () => {
    const { send, calls } = scriptedSender(() => ({ outcome: 'rejected' }));
    const { sleep } = sleepRecorder();

    await runChannelCascade(send, { sleep, backoffMs: [1] });

    expect(calls.some((c) => c.channel === 'telegram')).toBe(false);
  });

  it('a non-retryable outcome (skipped_no_target) cascades immediately — no retries, no sleeps', async () => {
    // push has no target → skip immediately to whatsapp, which sends.
    const { send, calls } = scriptedSender((channel) =>
      channel === 'push' ? { outcome: 'skipped_no_target' } : { outcome: 'sent' },
    );
    const { sleep, waits } = sleepRecorder();

    const result = await runChannelCascade(send, { sleep });

    // push attempted ONCE (no retry on a non-retryable outcome), then whatsapp delivered.
    expect(calls.filter((c) => c.channel === 'push')).toHaveLength(1);
    expect(waits).toEqual([]); // no backoff burned on the skip
    expect(result).toMatchObject({ delivered: true, deliveredChannel: 'whatsapp' });
  });

  it('records the full ordered trail with outcome + detail per attempt', async () => {
    const { send } = scriptedSender((channel, attempt) =>
      channel === 'sms' && attempt === 0 ? { outcome: 'sent' } : { outcome: 'rejected', detail: 'api_unavailable:http_503' },
    );
    const { sleep } = sleepRecorder();

    const result = await runChannelCascade(send, { sleep, backoffMs: [1] });

    expect(result.deliveredChannel).toBe('sms');
    // push (1+1), whatsapp (1+1), sms (1 → sent) = 5 trail entries.
    expect(result.trail).toHaveLength(5);
    expect(result.trail.at(-1)).toMatchObject({ channel: 'sms', attempt: 0, outcome: 'sent' });
    expect(result.trail[0]).toMatchObject({ channel: 'push', outcome: 'rejected', detail: 'api_unavailable:http_503' });
  });
});
