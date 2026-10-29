// The Trust's announcement channel poster — Story 5.14 (Task 4; `2026-10-29-417` FS2, FS5–FS7, FS15, as amended by `-418`; AC4–AC7).
//
// ONE queue (`announcement.channel.post`), three payloads (ids only — ⛔ a name, ⛔ a token: T15):
//   · the CYCLE job `{ alertId, cycleId, occasion: 'pool_open' }` — enqueued POST-COMMIT by the cycle-open alert worker (and re-sent by
//     the hourly contribution-notify recovery sweep for a live alert whose pools lack a post row — I9). It lists the cycle's pools (a
//     pools-only read) and sends ONE pool child each, the i-th with `startAfter = i × 3 s` — pacing by the queue, ⛔ a sleep (FS5, T8).
//   · the POOL child `{ alertId, cycleId, poolId, occasion: 'pool_open' }` and the LAST-DAY job `{ alertId, cycleId, occasion:
//     'last_day', deadlineAtIso }` (the day-14 sweep's seam) — each POSTS at most once.
//
// ⭐ The post's life (I1–I6; the `alert_sms_sends` 0184 lifecycle, F15): LOOKUP → the switch / chat id / bot / stale checks AT RUN TIME
// (I1, T13 — a later switch-off stops later posts) → the bot secret resolved BEFORE the claim → the name (full_name only) → BEGIN (a short
// committed tx) → the Bot API call with NOTHING held (T8) → FINALISE on the attempt's own token. Telegram is reached ONLY through a handle
// this module builds from the resolved token (`createTelegramAppCache`) — ⛔ `dispatch`, ⛔ the composition and its fixture (I3, T1, T2).
// ⭐ I6 / T14 — the jobs pool is BYPASSRLS: every read and write carries an explicit `pariwar_id` (the domain accessors).
// ⭐ The FINAL attempt is known only from pg-boss metadata (`includeMetadata`); metadata ABSENT ⇒ ⛔ final (`-418` item 4 — the 6.36d
// select job's rule): a transient fault (a Secret Manager outage, a throwing identity read) writes NO row and rethrows until then.

import { randomUUID } from 'node:crypto';

import { TelegramSendError, type TelegramAppCache, type TelegramMessagingHandle } from '@twt/channels';
import {
  ANNOUNCEMENT_POST_NAME_MODE,
  buildAnnouncementPost,
  operationalDate,
  type AnnouncementPostInput,
  type AnnouncementPostNameMode,
  type AnnouncementTranslate,
} from '@twt/contracts';
import {
  announcementChannels as channels,
  ids,
  notifications,
  pool as poolDomain,
  withPariwarScope,
  type Db,
  type encryption as encryptionTypes,
} from '@twt/domain';
import { t as realT } from '@twt/i18n';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import type pg from 'pg';

/** Every send of this queue carries these (`-418` item 4) — the final-attempt rule reads `retryLimit` back from pg-boss. */
export const ANNOUNCEMENT_POST_RETRY = { retryLimit: 4, retryDelay: 30, retryBackoff: true } as const;

/** FS5 (a) — the pool children's spacing (Telegram throttles ~20 / minute in a group; no channel figure is published). */
export const ANNOUNCEMENT_POOL_PACING_SECONDS = 3;

/** A 429 without `retry_after` waits this long before the re-send (the 429 is honoured either way). */
export const ANNOUNCEMENT_DEFAULT_RETRY_AFTER_SECONDS = 30;

/** FS7 (a) / `-418` item 5 — alarms are de-duplicated per (Pariwar, class) for this long (5.11b's 5-minute window). */
export const ANNOUNCEMENT_ALARM_WINDOW_MS = 5 * 60_000;

export interface AnnouncementCyclePayload {
  readonly alertId: string;
  readonly cycleId: string;
  readonly occasion: 'pool_open';
}
export interface AnnouncementPoolPayload {
  readonly alertId: string;
  readonly cycleId: string;
  readonly poolId: string;
  readonly occasion: 'pool_open';
}
export interface AnnouncementLastDayPayload {
  readonly alertId: string;
  readonly cycleId: string;
  readonly occasion: 'last_day';
  /** The cycle's deadline (`cycleDeadlineAt`) — the post's date and its stale bound (`-418` item 2). */
  readonly deadlineAtIso: string;
}
export type AnnouncementPostPayload = AnnouncementCyclePayload | AnnouncementPoolPayload | AnnouncementLastDayPayload;

/** The envelope context a send threads (the originating job's ids, or a sweep's synthesized ones). */
export interface AnnouncementEnqueueContext {
  readonly pariwarId: string;
  readonly requestId: string;
  readonly actorId: string | null;
  readonly traceId: string;
}

/**
 * The seam the contribution-notify triggers call (AC5 (ii) / (iv)) — OPTIONAL on their deps, so their existing tests (and their
 * `send.mock.calls`) are untouched (T16).
 */
export type AnnouncementPostTrigger =
  | { readonly kind: 'last_day'; readonly pariwarId: string; readonly alertId: string; readonly cycleId: string; readonly deadlineAt: Date }
  | { readonly kind: 'pool_open_heal'; readonly pariwarId: string; readonly alertId: string; readonly cycleId: string };

/** The job's pg-boss metadata. Absent ⇒ `undefined` ⇒ ⛔ final (`-418` item 4). */
export interface AnnouncementPostAttempt {
  readonly retryCount: number;
  readonly retryLimit: number;
}

/** PURE — the attempt from `includeMetadata` (the 6.36d cast). */
export function announcementPostAttemptOf(job: Job): AnnouncementPostAttempt | undefined {
  const meta = job as Job & { readonly retryCount?: unknown; readonly retryLimit?: unknown };
  return typeof meta.retryCount === 'number' && typeof meta.retryLimit === 'number'
    ? { retryCount: meta.retryCount, retryLimit: meta.retryLimit }
    : undefined;
}

/** FINAL ⇔ `retryCount >= retryLimit`; metadata ABSENT ⇒ ⛔ final. */
export function isFinalAnnouncementAttempt(attempt: AnnouncementPostAttempt | undefined): boolean {
  return attempt !== undefined && attempt.retryCount >= attempt.retryLimit;
}

/** What a run ended as (the pg-boss job `output`). ⛔ A name, ⛔ the text. */
export type AnnouncementPostRunResult =
  | { readonly kind: 'fanned_out'; readonly pools: number }
  | { readonly kind: 'done'; readonly state: string; readonly detail: string | null }
  | { readonly kind: 'not_found'; readonly what: 'pool' | 'alert' };

export interface AnnouncementPosterDeps {
  /** BYPASSRLS service pool — every statement carries `pariwar_id` (I6). Short transactions only (T8). */
  readonly pool: pg.Pool;
  /** The jobs KMS deps (the deceased member's name — `full_name` mode only). */
  readonly encryption: encryptionTypes.FieldCryptoDeps;
  /** Secret-Manager NAME → value; THROWS on not-found and on an outage alike (`resolveChannelSecret`). */
  readonly resolveSecret: (secretName: string) => Promise<string>;
  /** The Telegram client cache (its own — ⛔ the composition's; its 9 s timeout bounds every call — FS7). */
  readonly telegram: TelegramAppCache;
  /** The real `t()` by default (F17). */
  readonly t?: AnnouncementTranslate;
  /** {@link ANNOUNCEMENT_POST_NAME_MODE} by default (`-416`); a test drives `'none'`. */
  readonly nameMode?: AnnouncementPostNameMode;
  /**
   * The deceased member's FULL name for a pool (`full_name` mode): `resolvePoolIdentity` with the mode `'full_name'` PASSED (⛔ the
   * Pariwar's presentation-mode read — `-416`, T4). `null` ⇒ unresolvable (decrypt failure, no profile); a THROW is transient. Injected
   * only by a test that needs a throw.
   */
  readonly resolveDeceasedName?: (input: {
    readonly pariwarId: string;
    readonly pool: channels.AnnouncementCyclePool;
    readonly poolCount: number;
  }) => Promise<string | null>;
  readonly onAlarm?: (message: string) => void;
  readonly nowMs?: () => number;
}

export interface AnnouncementPoster {
  run(
    boss: Pick<QueueClient, 'send'>,
    envelope: JobEnvelope<AnnouncementPostPayload>,
    attempt: AnnouncementPostAttempt | undefined,
  ): Promise<AnnouncementPostRunResult>;
}

type Send = Pick<QueueClient, 'send'>;

/** Send one job of this queue (ids only), with the explicit retry policy (`-418` item 4). `null` from pg-boss ⇒ ⛔ "sent". */
async function sendPostJob(boss: Send, ctx: AnnouncementEnqueueContext, payload: AnnouncementPostPayload, startAfter?: number): Promise<void> {
  const id = await boss.send(
    QUEUE_NAMES.ANNOUNCEMENT_CHANNEL_POST,
    {
      requestId: ctx.requestId,
      pariwarId: ctx.pariwarId,
      actorId: ctx.actorId,
      traceId: ctx.traceId,
      payload,
    } satisfies JobEnvelope<AnnouncementPostPayload>,
    { ...ANNOUNCEMENT_POST_RETRY, ...(startAfter !== undefined && startAfter > 0 ? { startAfter } : {}) },
  );
  if (id == null) throw new Error(`[jobs] announcement-channel-post: the ${payload.occasion} job for alert ${payload.alertId} created no job`);
}

/** The CYCLE job (AC5 (i)) — the cycle-open worker's post-commit seam and the recovery heal. */
export function enqueueAnnouncementCycle(boss: Send, ctx: AnnouncementEnqueueContext, input: { readonly alertId: string; readonly cycleId: string }): Promise<void> {
  return sendPostJob(boss, ctx, { alertId: input.alertId, cycleId: input.cycleId, occasion: 'pool_open' });
}

/** The LAST-DAY job (AC5 (ii)) — the day-14 sweep's seam, ONCE per alert. */
export function enqueueAnnouncementLastDay(
  boss: Send,
  ctx: AnnouncementEnqueueContext,
  input: { readonly alertId: string; readonly cycleId: string; readonly deadlineAt: Date },
): Promise<void> {
  return sendPostJob(boss, ctx, { alertId: input.alertId, cycleId: input.cycleId, occasion: 'last_day', deadlineAtIso: input.deadlineAt.toISOString() });
}

/**
 * Build the contribution-notify triggers' seam (AC5 (ii), (iv)): a last day sends the last-day job; a heal re-sends the cycle job only
 * when the cycle's pools LACK a `pool_open` row (the cycle's pool ids minus their rows — explicit `pariwar_id`). A re-send is harmless
 * (the UNIQUE).
 */
export function createAnnouncementPostTrigger(boss: Send, pool: pg.Pool): (input: AnnouncementPostTrigger) => Promise<void> {
  return async (input) => {
    const ctx: AnnouncementEnqueueContext = {
      pariwarId: input.pariwarId,
      requestId: `announcement.channel.post:${input.kind}:${input.alertId}`,
      actorId: null,
      traceId: `announcement.channel.post:${input.kind}:${input.alertId}`,
    };
    if (input.kind === 'last_day') {
      await enqueueAnnouncementLastDay(boss, ctx, input);
      return;
    }
    const gaps = await channels.countPoolOpenPostGaps(pool, { pariwarId: input.pariwarId, cycleId: input.cycleId });
    if (gaps > 0) await enqueueAnnouncementCycle(boss, ctx, input);
  };
}

/** One short transaction on its own client (begin / the never-attempted write / a locked give-up) — ⛔ held across the call (T8). */
async function inTx<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** The ONE default name read (T4): the stored name, whole, through the 8.16 resolver with `'full_name'` PASSED. */
function defaultDeceasedName(deps: AnnouncementPosterDeps): NonNullable<AnnouncementPosterDeps['resolveDeceasedName']> {
  return async ({ pariwarId, pool, poolCount }) => {
    const identity = await withPariwarScope(deps.pool, pariwarId, (db: Db) =>
      notifications.resolvePoolIdentity(db, deps.encryption, ids.pariwarId(pariwarId), 'full_name', {
        claimCaseId: ids.claimId(pool.claimCaseId),
        poolIndex: pool.poolIndex,
        poolCanonicalIdentifier: pool.poolCanonicalIdentifier,
        fixedAmount: pool.fixedAmount,
        poolCount,
      }),
    );
    return identity?.deceasedDisplayName ?? null;
  };
}

/** Telegram's 4xx `error_code` as the CHECKed `tg_<three digits>`; anything else is not a refusal we can name. */
function refusedDetailOf(code: number): string | null {
  return Number.isInteger(code) && code >= 100 && code <= 999 ? `tg_${String(code)}` : null;
}

/** FS7 (a) — everything that MAY have posted is `unknown`, named by what was seen (⛔ `description` — "subject to change"). */
function unknownDetailOf(err: unknown): string {
  if (!(err instanceof TelegramSendError)) return 'unclassified';
  if (err.httpStatus === 0) return 'timeout_or_network';
  if (err.httpStatus >= 500) return 'http_5xx';
  if (err.httpStatus >= 200 && err.httpStatus < 300) return 'no_message_id';
  return 'unclassified';
}

/** Build the poster — one per jobs process (its alarm de-dup map lives as long as it does). */
export function createAnnouncementPoster(deps: AnnouncementPosterDeps): AnnouncementPoster {
  const alarmSink = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const nowMs = deps.nowMs ?? Date.now;
  const translate = deps.t ?? (realT as AnnouncementTranslate);
  const nameMode = deps.nameMode ?? ANNOUNCEMENT_POST_NAME_MODE;
  const resolveDeceasedName = deps.resolveDeceasedName ?? defaultDeceasedName(deps);

  // `-418` item 5 — the `alarmRefusalOnce` shape: a map of last-alarm times per (Pariwar, class); the sink is called BEFORE the window
  // is armed (a sink that throws must not swallow the next alarm). ⛔ A name, ⛔ the text in any alarm.
  const alarmedAt = new Map<string, number>();
  const alarmOnce = (pariwarId: string, klass: string, message: string): void => {
    const key = `${pariwarId}\0${klass}`;
    const at = alarmedAt.get(key);
    if (at !== undefined && nowMs() - at < ANNOUNCEMENT_ALARM_WINDOW_MS) return;
    alarmSink(`[jobs] announcement-channel-post: ${message} (Pariwar ${pariwarId}; not repeated for ${String(ANNOUNCEMENT_ALARM_WINDOW_MS / 60_000)} min)`);
    alarmedAt.set(key, nowMs());
  };

  async function runCycle(boss: Send, envelope: JobEnvelope<AnnouncementPostPayload>, pariwarId: string, p: AnnouncementCyclePayload): Promise<AnnouncementPostRunResult> {
    const pools = await channels.listCyclePoolsForAnnouncement(deps.pool, { pariwarId, cycleId: p.cycleId });
    for (const [i, pool] of pools.entries()) {
      await sendPostJob(
        boss,
        { ...envelope, pariwarId },
        { alertId: p.alertId, cycleId: p.cycleId, poolId: pool.poolId, occasion: 'pool_open' },
        i * ANNOUNCEMENT_POOL_PACING_SECONDS,
      );
    }
    return { kind: 'fanned_out', pools: pools.length };
  }

  async function runPost(
    boss: Send,
    envelope: JobEnvelope<AnnouncementPostPayload>,
    pariwarId: string,
    p: AnnouncementPoolPayload | AnnouncementLastDayPayload,
    attempt: AnnouncementPostAttempt | undefined,
  ): Promise<AnnouncementPostRunResult> {
    const final = isFinalAnnouncementAttempt(attempt);
    const key: channels.AnnouncementPostKey = { pariwarId, occasion: p.occasion, subjectId: p.occasion === 'pool_open' ? p.poolId : p.alertId };
    const where = `${p.occasion} ${key.subjectId} (alert ${p.alertId})`;

    // ── 1. LOOKUP (read-only) ──
    const found = await channels.lookupAnnouncementPost(deps.pool, key);
    switch (found.kind) {
      case 'final':
        return { kind: 'done', state: found.state, detail: found.detail };
      case 'in_flight':
        // Another attempt is between begin and finalise — retry later; ⛔ touch it.
        throw new Error(`[jobs] announcement-channel-post: ${where} is in flight — retried`);
      case 'stale':
        // A crash between begin and finalise: Telegram MAY have posted ⇒ `unknown`, ⛔ re-posted (I2).
        await channels.finaliseStaleAnnouncementPost(deps.pool, { pariwarId, postId: found.postId });
        alarmOnce(pariwarId, 'unknown', `a post left in flight past the lease ended unknown:stale_lease (${where}) — check the channel by hand`);
        return { kind: 'done', state: 'unknown', detail: 'stale_lease' };
      case 'deferred_expired':
        await inTx(deps.pool, (c) => channels.giveUpDeferredAnnouncementPost(c, { pariwarId, postId: found.postId, detail: 'tg_429_expired', onlyIfExpired: true }));
        alarmOnce(pariwarId, 'refused', `a rate-limited post was given up (refused:tg_429_expired) — ${where}`);
        return { kind: 'done', state: 'refused', detail: 'tg_429_expired' };
      case 'none':
      case 'deferred':
        break;
    }
    const deferredId = found.kind === 'deferred' ? found.postId : null;

    // ── 2. What the row records (FS15 (a) — ⛔ a decrypt here) and what the post is about ──
    let record: channels.AnnouncementPostRecord;
    let stale: boolean;
    let poolForName: { readonly pool: channels.AnnouncementCyclePool; readonly poolCount: number } | null = null;
    if (p.occasion === 'pool_open') {
      const pool = await channels.getAnnouncementPool(deps.pool, { pariwarId, poolId: p.poolId });
      const alert = await channels.getAnnouncementAlert(deps.pool, { pariwarId, alertId: p.alertId });
      if (pool === null || alert === null) {
        // A defect (the payload names a pool or alert this Pariwar does not hold) — ⛔ a row can name it.
        alarmOnce(pariwarId, 'defect', `${where}: no such ${pool === null ? 'pool' : 'alert'} in this Pariwar — nothing posted`);
        return { kind: 'not_found', what: pool === null ? 'pool' : 'alert' };
      }
      const poolLabel = await withPariwarScope(deps.pool, pariwarId, async (db: Db) =>
        (await notifications.resolveCuratedPoolName(db, ids.pariwarId(pariwarId), pool.poolCount, pool.poolIndex)) ?? poolDomain.poolLetterCode(pool.poolIndex),
      );
      record = { ...key, alertId: p.alertId, poolLabel, lastDate: null };
      stale = !alert.live;
      poolForName = { pool, poolCount: pool.poolCount };
    } else {
      const deadlineAt = new Date(p.deadlineAtIso);
      record = { ...key, alertId: p.alertId, poolLabel: null, lastDate: operationalDate(deadlineAt) };
      // `-418` item 2 — stale only AT or AFTER the deadline itself.
      stale = !(Number.isFinite(deadlineAt.getTime()) && nowMs() < deadlineAt.getTime());
    }

    /** A post that will not be attempted: a found `deferred` row is GIVEN UP to `refused:<reason>` (`-418` item 11). */
    const notAttempted = async (state: 'skipped' | 'refused', detail: string): Promise<AnnouncementPostRunResult> => {
      if (deferredId !== null) {
        await inTx(deps.pool, (c) => channels.giveUpDeferredAnnouncementPost(c, { pariwarId, postId: deferredId, detail }));
        return { kind: 'done', state: 'refused', detail };
      }
      const written = await inTx(deps.pool, (c) => channels.recordUnattemptedAnnouncementPost(c, { ...record, claimToken: randomUUID(), state, detail }));
      if (!written) {
        // Another attempt wrote the row meanwhile — report what it is.
        const again = await channels.lookupAnnouncementPost(deps.pool, key);
        return { kind: 'done', state: again.kind === 'final' ? again.state : again.kind, detail: again.kind === 'final' ? again.detail : null };
      }
      return { kind: 'done', state, detail };
    };

    // ── 3. The switch, the chat id, the bot, staleness — read AT RUN TIME (I1, T13), by explicit predicate (I6) ──
    const state = await channels.readAnnouncementChannelsState(deps.pool, pariwarId);
    const chatId = state.config.telegramChannelChatId;
    const skip: 'switch_off' | 'no_chat_id' | 'bot_not_configured' | 'stale' | null = !state.config.enabled
      ? 'switch_off'
      : chatId === null
        ? 'no_chat_id'
        : !channels.hasBotTokenName(state)
          ? 'bot_not_configured'
          : stale
            ? 'stale'
            : null;
    if (skip !== null || chatId === null) return notAttempted('skipped', skip ?? 'no_chat_id');

    // ── 4. The bot's token, resolved BEFORE the claim (FS7 (a)): a throw is TRANSIENT until the final attempt ──
    let handle: TelegramMessagingHandle;
    try {
      const botToken = await deps.resolveSecret((state.botTokenSecretName ?? '').trim());
      handle = deps.telegram.messagingFor(pariwarId, { botToken });
    } catch (err) {
      if (!final) throw err;
      alarmOnce(pariwarId, 'secret_unresolved', `the Telegram bot token could not be resolved on the final attempt — ${where} refused:secret_unresolved`);
      return notAttempted('refused', 'secret_unresolved');
    }

    // ── 5. The name — `full_name` only (I5); `none` reads and decrypts NOTHING ──
    let input: AnnouncementPostInput;
    if (record.occasion === 'last_day') {
      input = { occasion: 'last_day', lastDate: record.lastDate! };
    } else if (nameMode === 'none') {
      input = { occasion: 'pool_open', poolLabel: record.poolLabel!, deceasedName: null };
    } else {
      let name: string | null;
      try {
        name = await resolveDeceasedName({ pariwarId, pool: poolForName!.pool, poolCount: poolForName!.poolCount });
      } catch (err) {
        // `-418` item 3 — a THROWING read is transient: ⛔ row, rethrow; only the final attempt refuses.
        if (!final) throw err;
        alarmOnce(pariwarId, 'identity_unavailable', `the deceased member's name could not be read on the final attempt — ${where} refused:identity_unavailable`);
        return notAttempted('refused', 'identity_unavailable');
      }
      if (name === null || name.trim() === '') {
        // `null` ⇒ unresolvable ⇒ refused at once — ⛔ an unnamed post in full_name mode (I5).
        alarmOnce(pariwarId, 'identity_unavailable', `the deceased member's name is unresolvable — ${where} refused:identity_unavailable`);
        return notAttempted('refused', 'identity_unavailable');
      }
      input = { occasion: 'pool_open', poolLabel: record.poolLabel!, deceasedName: name };
    }
    const text = buildAnnouncementPost(translate, input, nameMode);

    // ── 6. BEGIN — committed before the call (I2) ──
    const claimToken = randomUUID();
    const begun = await inTx(deps.pool, (c) => channels.beginAnnouncementPost(c, { ...record, claimToken }));
    if (begun.kind === 'taken') {
      const again = await channels.lookupAnnouncementPost(deps.pool, key);
      if (again.kind === 'final') return { kind: 'done', state: again.state, detail: again.detail };
      throw new Error(`[jobs] announcement-channel-post: ${where} was taken by another attempt — retried`);
    }

    // ── 7. The Bot API call — NOTHING held (T8); its 9 s timeout bounds it (FS7) ──
    const finalise = (st: channels.AnnouncementPostOutcome, detail: string | null, telegramMessageId?: string) =>
      channels.finaliseAnnouncementPost(deps.pool, { pariwarId, postId: begun.postId, claimToken, state: st, detail, ...(telegramMessageId ? { telegramMessageId } : {}) });
    let messageId: string;
    try {
      messageId = await handle.send({ chatId, text });
    } catch (err) {
      if (err instanceof TelegramSendError && err.telegramCode === 429) {
        // DEFINITELY not posted ⇒ `deferred`, and the job re-sends ITSELF after `retry_after` (the re-claim rotates the token — T15).
        const ok = await finalise('deferred', 'tg_429');
        if (!ok) alarmOnce(pariwarId, 'lost_claim', `${where}: the 429 could not be recorded (the row moved on)`);
        const after = err.retryAfter ?? ANNOUNCEMENT_DEFAULT_RETRY_AFTER_SECONDS;
        try {
          await sendPostJob(boss, { ...envelope, pariwarId }, p, after);
        } catch (sendErr) {
          alarmOnce(pariwarId, 'resend', `${where}: the 429 re-send failed — the post stays deferred and will be given up (${String(sendErr)})`);
        }
        return { kind: 'done', state: 'deferred', detail: 'tg_429' };
      }
      if (err instanceof TelegramSendError && err.telegramCode !== null && err.httpStatus >= 400 && err.httpStatus < 500) {
        const detail = refusedDetailOf(err.telegramCode);
        if (detail !== null) {
          await finalise('refused', detail);
          alarmOnce(pariwarId, 'refused', `Telegram refused the post (refused:${detail}) — ${where}; check the channel id and that the bot may post`);
          return { kind: 'done', state: 'refused', detail };
        }
      }
      const detail = unknownDetailOf(err);
      await finalise('unknown', detail);
      alarmOnce(pariwarId, 'unknown', `the post MAY have gone out (unknown:${detail}) — ${where}; it is ⛔ retried, check the channel by hand`);
      return { kind: 'done', state: 'unknown', detail };
    }
    const ok = await finalise('posted', null, messageId);
    if (!ok) alarmOnce(pariwarId, 'lost_claim', `${where}: posted (message ${messageId}) but the row had moved on`);
    return { kind: 'done', state: 'posted', detail: null };
  }

  return {
    async run(boss, envelope, attempt) {
      const { pariwarId } = envelope;
      if (!pariwarId) throw new Error(`[jobs] announcement-channel-post: missing pariwarId for alert ${envelope.payload.alertId}`);
      const p = envelope.payload;
      if (p.occasion === 'pool_open' && !('poolId' in p)) return runCycle(boss, envelope, pariwarId, p);
      return runPost(boss, envelope, pariwarId, p, attempt);
    },
  };
}

/** Register the queue's worker (`includeMetadata` — the final-attempt rule, `-418` item 4). The queue is created by the caller FIRST (F19). */
export async function registerAnnouncementChannelPostWorker(boss: QueueClient, poster: AnnouncementPoster): Promise<void> {
  await boss.work(QUEUE_NAMES.ANNOUNCEMENT_CHANNEL_POST, { includeMetadata: true }, async (jobs: Job[]) => {
    const results: AnnouncementPostRunResult[] = [];
    for (const job of jobs) {
      results.push(await poster.run(boss, job.data as JobEnvelope<AnnouncementPostPayload>, announcementPostAttemptOf(job)));
    }
    console.info('[jobs] announcement-channel-post', JSON.stringify(results));
    return { processed: results.length, results };
  });
}
