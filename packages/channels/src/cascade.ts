// Retry / backoff / cascade primitive — Story 5.6 (AC3; Task 4).
//
// dispatch.ts explicitly RESERVES this seam for 5.6 (dispatch.ts L4-7, L38-39): "Retry / backoff /
// cascade-on-failure (5.6) also WRAP the per-channel send seam without re-sequencing the canonical order or
// changing dispatch's public shape" and "5.6's cascade will iterate only CANONICAL_CHANNEL_LADDER and leave
// Telegram independent." This module honours that to the letter: it is a reusable, deterministically-testable
// primitive that WRAPS a per-channel send seam. It does NOT change `dispatch` / `ChannelProvider` /
// `CANONICAL_CHANNEL_LADDER` / `DeliveryResolver` / `render.ts`, and it introduces NO live `dispatch` call
// site ([[project_channels_no_live_dispatch_yet]]) — the (future) live fan-out drives it.
//
// ── What it provides (AC3) ─────────────────────────────────────────────────────────────────────────────
//   (a) BOUNDED RETRY per channel with EXPONENTIAL BACKOFF. The backoff SCHEDULE drives the retry count: the
//       default `DEFAULT_SMS_BACKOFF_MS = [30s, 5m, 30m]` means 1 initial attempt + up to 3 backoff-spaced
//       retries per channel (the title's "3-Retry × Exp-Backoff"; AR-19's "3× backoff"). Before retry `i`
//       (1-indexed) the primitive sleeps `backoffMs[i-1]`. The schedule is a plain array so a later DURABLE
//       (pg-boss) adapter is thin (see the story's "Retry-ladder durability" note) — and fully injectable so
//       tests use NO real timers.
//   (b) CASCADE DOWN THE LADDER: when a channel is terminally undelivered (retries exhausted on a retryable
//       failure, OR an immediately-non-retryable outcome), advance to the next rung of the ladder. SMS is the
//       TERMINAL rung — there is no rung below it.
//
// ── Outcome semantics (consumes attemptChannel-style outcomes) ─────────────────────────────────────────
// The per-channel send seam returns a `ChannelSendOutcome` whose `outcome` reuses dispatch's honest
// `ChannelAttempt['outcome']` vocabulary. Only `sent` STOPS the ladder (success). `rejected`/`error`/
// `not_implemented` are RETRYABLE failures → retry-then-cascade. `skipped_*`/`suppressed` are NOT retryable
// (the rung is unavailable / intentionally silenced) → cascade to the next rung immediately WITHOUT burning
// retries. The primitive never re-sequences the ladder tuple and never changes dispatch's public shape.
//
// ── Telegram is INDEPENDENT ────────────────────────────────────────────────────────────────────────────
// The cascade iterates ONLY `CANONICAL_CHANNEL_LADDER` (`push → whatsapp → sms`). The Telegram mirror
// side-channel is never part of it — a Telegram failure triggers no cascade (the dispatcher already isolates
// it).

import { CANONICAL_CHANNEL_LADDER, type ChannelAttempt } from './dispatch.js';
import type { Channel } from './provider.js';

/**
 * The default exponential-backoff schedule (AC3): 30s, 5m, 30m. Its LENGTH (3) is the default retry bound —
 * 1 initial attempt + 3 backoff-spaced retries per channel. A plain array so the durable (pg-boss) adapter
 * a later live-dispatch story adds is thin, and so tests inject a trivial schedule.
 */
export const DEFAULT_SMS_BACKOFF_MS: readonly number[] = [30_000, 300_000, 1_800_000];

/**
 * The outcomes that are RETRYABLE failures (retry-then-cascade). `sent` stops the ladder (success); every
 * OTHER outcome (`skipped_ineligible`, `skipped_no_target`, `suppressed`) is a non-retryable "rung
 * unavailable" → cascade immediately without retrying.
 */
export const RETRYABLE_CASCADE_OUTCOMES: ReadonlySet<ChannelAttempt['outcome']> = new Set([
  'rejected',
  'error',
  'not_implemented',
]);

/** The result of ONE per-channel send attempt the cascade wraps (honest outcome vocabulary from dispatch). */
export interface ChannelSendOutcome {
  readonly outcome: ChannelAttempt['outcome'];
  /** Optional PII-free detail (the classified `SendResult.detail`) carried onto the trail for observability. */
  readonly detail?: string;
}

/**
 * The per-channel send seam the cascade drives. Invoked once per attempt with the channel + the 0-based
 * attempt index (0 = the initial attempt). It must resolve a `ChannelSendOutcome` and (like attemptChannel)
 * never reject — a rejection is treated as a retryable failure so one fault can't abort the cascade.
 */
export type CascadeSender = (channel: Channel, attempt: number) => Promise<ChannelSendOutcome>;

/** Injectable knobs — every default is overridable so tests are deterministic (no real timers). */
export interface CascadeConfig {
  /** The ladder to cascade down. Defaults to the frozen `CANONICAL_CHANNEL_LADDER` (never re-sequenced). */
  readonly ladder?: readonly Channel[];
  /** The exponential-backoff schedule; its length is the per-channel retry bound. Defaults to 30s/5m/30m. */
  readonly backoffMs?: readonly number[];
  /**
   * The injectable clock/sleep seam — `sleep(ms)` between attempts. Defaults to a real `setTimeout` wait; a
   * test passes a no-op (or a recorder) so NO real time passes. The primitive is otherwise pure.
   */
  readonly sleep?: (ms: number) => Promise<void>;
}

/** One recorded attempt on the cascade trail (ordering-preserving; forensic "what did we try"). */
export interface CascadeTrailEntry {
  readonly channel: Channel;
  /** 0-based attempt index within the channel (0 = initial attempt, 1.. = backoff-spaced retries). */
  readonly attempt: number;
  readonly outcome: ChannelAttempt['outcome'];
  readonly detail?: string;
}

/** The cascade result: whether/where delivery landed + the full ordered attempt trail. */
export interface CascadeOutcome {
  readonly delivered: boolean;
  /** The channel that delivered (`sent`), or `null` if the whole ladder was exhausted undelivered. */
  readonly deliveredChannel: Channel | null;
  readonly trail: readonly CascadeTrailEntry[];
}

/** The real sleep — the only impure default. Isolated so tests trivially replace it. */
const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run the retry/backoff/cascade ladder over `send`. For each channel in the ladder: attempt once, and on a
 * RETRYABLE failure retry up to `backoffMs.length` times, sleeping `backoffMs[i-1]` before retry `i`. `sent`
 * returns immediately (delivered). A non-retryable outcome (`skipped_*`/`suppressed`) cascades to the next
 * rung WITHOUT retrying. When the whole ladder is exhausted undelivered, returns `delivered: false`. SMS is
 * the terminal rung — there is nothing below it. Telegram is never part of the ladder.
 */
export async function runChannelCascade(send: CascadeSender, config: CascadeConfig = {}): Promise<CascadeOutcome> {
  const ladder = config.ladder ?? CANONICAL_CHANNEL_LADDER;
  const backoffMs = config.backoffMs ?? DEFAULT_SMS_BACKOFF_MS;
  const sleep = config.sleep ?? realSleep;
  const maxRetries = backoffMs.length;

  const trail: CascadeTrailEntry[] = [];

  for (const channel of ladder) {
    // attempt 0 = initial; attempts 1..maxRetries are the backoff-spaced retries.
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        // Sleep the backoff BEFORE the retry (never before the initial attempt, never after the last).
        await sleep(backoffMs[attempt - 1]!);
      }
      // `send` documents that it must never reject, but a rejection is treated as a retryable failure here
      // regardless — one fault (a bug, an unanticipated throw) can't abort the whole cascade.
      let result: ChannelSendOutcome;
      try {
        result = await send(channel, attempt);
      } catch {
        result = { outcome: 'error' };
      }
      trail.push({ channel, attempt, outcome: result.outcome, detail: result.detail });

      if (result.outcome === 'sent') {
        return { delivered: true, deliveredChannel: channel, trail };
      }
      if (!RETRYABLE_CASCADE_OUTCOMES.has(result.outcome)) {
        // Rung unavailable (skipped/suppressed) — do NOT retry; cascade to the next rung immediately.
        break;
      }
      // A retryable failure — loop to the next attempt (or fall through to cascade once retries exhausted).
    }
    // This rung is terminally undelivered — advance to the next rung of the ladder.
  }

  return { delivered: false, deliveredChannel: null, trail };
}
