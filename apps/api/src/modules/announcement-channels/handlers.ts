// The Trust's announcement channels — the API handlers (Story 5.14, Task 5; `2026-10-29-417` FS3, FS4, FS12, FS15, as amended by
// `-418` item 9; AC2, AC3).
//
//   · the admin config GET / PUT — on the request's scope transaction (`twt_app`, RLS), the PUT under `withCompensatingAudit`
//     (`pariwar.announcement_channels_update` — ADR-0030's mechanized shape). ⛔ The bot's secret NAME or value is ever returned.
//   · the admin "Posts" list — an AUDITED read (ONE `admin_announcement_channels.posts_read` line per GET, counts only): the Pariwar's
//     pool openings and last days of the last 15 days, LEFT JOINED to the post rows (a dropped enqueue shows `not_attempted` — I9),
//     each with its Telegram state, the recorded reason (`-419` item 6 (c)) and — ONLY while the switch is ON and the cycle's alert is
//     `live` (`-419` item 6 (b)) — the bilingual words rebuilt through the ONE builder with the real `t()` (FS15 (a): the words live
//     nowhere persistent). ⚠ The name is decrypted here, through `member-pool/pool-identity.ts`, whose resolver note says
//     *"member-session layer (D11 — NOT the admin path)"* — CROSSED CONSCIOUSLY (`-417` FS15) for a `pariwar.configure_channels` holder,
//     with the mode `'full_name'` PASSED (`-416`; ⛔ the presentation-mode read); that note now points back here. ⚠ RE-EXAMINE the
//     crossing (review G2-P11) when a second admin caller of `resolvePoolIdentity` appears, when `ANNOUNCEMENT_POST_NAME_MODE` stops being
//     a constant (`'full_name'`), or when this list starts to persist or export the words. Each row's name read runs under its OWN
//     savepoint, so a throw or a `null` makes THAT row's words unavailable, ⛔ a 500 (`-418` item 9).
//   · the member read — the member's OWN Pariwar's links (FS12 (a)): both null while OFF (I1); Telegram only when postable (I7).

import { createHash } from 'node:crypto';

import {
  ANNOUNCEMENT_POST_NAME_MODE,
  CYCLE_WINDOW_DAYS,
  buildAnnouncementPost,
  cycleDayFromCommittedAt,
  cycleDeadlineAt,
  operationalDate,
  type AnnouncementChannelsConfigResponse,
  type AnnouncementChannelsConfigUpsertRequest,
  type AnnouncementChannelsMemberResponse,
  type AnnouncementPostEntry,
  AnnouncementPostReason,
  type AnnouncementPostTelegramState,
  type AnnouncementPostsResponse,
  type AnnouncementTranslate,
} from '@twt/contracts';
import { announcementChannels as channels, audit, canonicalJsonStringify, ids, pool as poolDomain } from '@twt/domain';
import { t } from '@twt/i18n';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { underSavepoint } from '../claims/later-approval-warnings.js';
import { resolveCuratedPoolName, resolvePoolIdentity } from '../member-pool/pool-identity.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** The `pariwar.configure_channels` key (catalog v5; held by `pariwar_admin`) — ⛔ a new key (AC2). */
const PARIWAR_CONFIGURE_CHANNELS_KEY = 'pariwar.configure_channels';

const DAY_MS = 86_400_000;

/** A recorded `detail` as the wire's reason — ⛔ a value outside the vocabulary (the CHECKs make that a defect) reaches the response. */
function toReason(detail: string | null): AnnouncementPostReason | null {
  const parsed = AnnouncementPostReason.safeParse(detail);
  return parsed.success ? parsed.data : null;
}

/**
 * AC2 — the state the list SHOWS, and why (`-419` item 6 (c)): an `attempting` row past the lease is `unknown` (`stale_lease`), a
 * `deferred` row past its max age `refused` (`tg_429_expired`), and — review G2-P6 — a `last_day` row still `deferred` at or after its
 * deadline `refused` (`stale`; FS7 bounds a last day by `deadlineAt`, `-418` item 2). Each moved state carries the reason the job records
 * for the same give-up; otherwise the row's own `detail`.
 */
function shownState(
  post: channels.AnnouncementPostView | undefined,
  lastDayDeadlineAt: Date | null,
  now: Date,
): { readonly telegramState: AnnouncementPostTelegramState; readonly reason: AnnouncementPostReason | null } {
  if (post === undefined) return { telegramState: 'not_attempted', reason: null };
  if (post.state === 'attempting' && !post.insideLease) return { telegramState: 'unknown', reason: 'stale_lease' };
  if (post.state === 'deferred' && lastDayDeadlineAt !== null && now.getTime() >= lastDayDeadlineAt.getTime()) {
    return { telegramState: 'refused', reason: 'stale' };
  }
  if (post.state === 'deferred' && !post.deferredFresh) return { telegramState: 'refused', reason: 'tg_429_expired' };
  return { telegramState: post.state, reason: toReason(post.detail) };
}

/** Review G2-P14 — a pool whose `pool_index` cannot be lettered degrades THAT row (as the shared resolver does), ⛔ a 500 for the list. */
function letterCodeOrNull(request: FastifyRequest, poolId: string, poolIndex: number): string | null {
  try {
    return poolDomain.poolLetterCode(poolIndex);
  } catch (err) {
    request.log.error({ err, poolId }, 'announcement-channels: the pool letter code is unresolvable; this row has no label');
    return null;
  }
}

export function createAnnouncementChannelsHandlers(deps: AppDeps) {
  /** The scope-resolved tx + actor (the route chain guarantees both). */
  function scopeCtx(request: FastifyRequest) {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return { scopeTx, actorId, pariwarIdStr: scopeTx.pariwarId };
  }

  return {
    PARIWAR_CONFIGURE_CHANNELS_KEY,

    /** GET the config (the OFF defaults when no row exists — ⛔ a 404). */
    async getConfig(request: FastifyRequest): Promise<AnnouncementChannelsConfigResponse> {
      const { scopeTx, pariwarIdStr } = scopeCtx(request);
      const row = await channels.findAnnouncementChannelsConfig(scopeTx.client, pariwarIdStr);
      return { configured: row !== null, config: row ?? channels.ANNOUNCEMENT_CHANNELS_DEFAULT_CONFIG };
    },

    /** PUT the config (upsert, audited with a compensating record — ADR-0030). */
    async putConfig(request: FastifyRequest): Promise<AnnouncementChannelsConfigResponse> {
      const { scopeTx, pariwarIdStr, actorId } = scopeCtx(request);
      const body = request.body as AnnouncementChannelsConfigUpsertRequest;
      return audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId: pariwarIdStr,
          actorId,
          actorRole: null,
          action: 'pariwar.announcement_channels_update',
          resourceLocator: `pariwar/${pariwarIdStr}/announcement-channels`,
          requestPayloadHash: createHash('sha256')
            .update(
              canonicalJsonStringify({
                pariwar_id: pariwarIdStr,
                enabled: body.enabled,
                telegram_channel_chat_id: body.telegramChannelChatId,
                telegram_invite_url: body.telegramInviteUrl,
                whatsapp_channel_url: body.whatsappChannelUrl,
              }),
              'utf8',
            )
            .digest('hex'),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async () => {
          const config = await channels.upsertAnnouncementChannelsConfig(scopeTx.client, {
            pariwarId: pariwarIdStr,
            enabled: body.enabled,
            telegramChannelChatId: body.telegramChannelChatId,
            telegramInviteUrl: body.telegramInviteUrl,
            whatsappChannelUrl: body.whatsappChannelUrl,
            updatedByActor: actorId,
          });
          return { configured: true, config };
        },
      });
    },

    /** GET the "Posts" list (FS4 (a), FS15 (a)) — an AUDITED read. */
    async getPosts(request: FastifyRequest, reply: FastifyReply): Promise<AnnouncementPostsResponse> {
      // Review FD-P7 — the list carries the deceased's FULL name: ⛔ stored by a browser or a proxy (the other name-bearing reads set the
      // same header — `member-pool/handlers.ts`, `claims.contact-call.handlers.ts`).
      void reply.header('cache-control', 'no-store');
      const { scopeTx, pariwarIdStr, actorId } = scopeCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const now = deps.clock();
      const windowStart = now.getTime() - channels.ANNOUNCEMENT_POSTS_LIST_WINDOW_DAYS * DAY_MS;
      const config = await channels.getAnnouncementChannelsConfig(scopeTx.client, pariwarIdStr);
      const activity = await channels.listAnnouncementActivity(scopeTx.client, { pariwarId: pariwarIdStr, now, cycleWindowDays: CYCLE_WINDOW_DAYS });
      const translate = t as AnnouncementTranslate;
      const posts: AnnouncementPostEntry[] = [];
      let wordsBuilt = 0;
      let wordsUnavailable = 0;
      let rowIndex = 0;

      for (const cycle of activity) {
        // `-419` item 6 (b) / review G2-P4 — words only while the switch is ON AND the cycle's alert is `live`: the job skips a pool
        // opening whose alert is not (`stale`), so the admin is ⛔ handed words the system deliberately held.
        const wordsDue = config.enabled && cycle.alertLive;
        if (cycle.committedAt.getTime() >= windowStart) {
          for (const pool of cycle.pools) {
            const post = cycle.posts.find((p) => p.occasion === 'pool_open' && p.subjectId === pool.poolId);
            rowIndex += 1;
            // The no-decrypt label (the row's own when it exists — what was posted). Under a savepoint: the curated-name read swallows
            // its own errors, and a swallowed SQL error would otherwise abort the request's transaction for every later row.
            // Review FD2-R3 — and the SAME bound the poster applies (a curated name that is blank or over the row's 100-character CHECK
            // falls back to the letter code), so the words handed to the admin for the WhatsApp Channel name the pool as the Telegram post does.
            const curated =
              post?.poolLabel != null
                ? null
                : await underSavepoint(scopeTx.client, `announcement_label_${String(rowIndex)}`, () =>
                    resolveCuratedPoolName(scopeTx.tx, pariwarId, cycle.poolCount, pool.poolIndex, request),
                  ).catch(() => null);
            const usableCurated =
              curated !== null && curated.trim() !== '' && curated.length <= channels.ANNOUNCEMENT_POOL_LABEL_MAX_LENGTH ? curated : null;
            const poolLabel = post?.poolLabel ?? usableCurated ?? letterCodeOrNull(request, pool.poolId, pool.poolIndex);
            let words: string | null = null;
            let unavailable = false;
            if (wordsDue) {
              let deceasedName: string | null = null;
              unavailable = poolLabel === null;
              if (!unavailable && ANNOUNCEMENT_POST_NAME_MODE === 'full_name') {
                // `-418` item 9 — this row's read under its OWN savepoint: a throw rolls back to it and marks only this row.
                deceasedName = await underSavepoint(scopeTx.client, `announcement_post_${String(rowIndex)}`, async () => {
                  const identity = await resolvePoolIdentity(deps, scopeTx.tx, request, pariwarId, 'full_name', {
                    claimCaseId: ids.claimId(pool.claimCaseId),
                    poolIndex: pool.poolIndex,
                    poolCanonicalIdentifier: pool.poolCanonicalIdentifier,
                    fixedAmount: pool.fixedAmount,
                    poolCount: cycle.poolCount,
                  });
                  return identity?.deceasedDisplayName ?? null;
                }).catch((err: unknown) => {
                  request.log.warn({ err, poolId: pool.poolId }, 'announcement-channels: the name read failed; this row\'s words are unavailable');
                  return null;
                });
                unavailable = deceasedName === null || deceasedName.trim() === '';
              }
              if (!unavailable && poolLabel !== null) {
                words = buildAnnouncementPost(translate, { occasion: 'pool_open', poolLabel, deceasedName }, ANNOUNCEMENT_POST_NAME_MODE);
                wordsBuilt += 1;
              } else {
                unavailable = true;
                wordsUnavailable += 1;
              }
            }
            posts.push({
              occasion: 'pool_open',
              alertId: cycle.alertId,
              subjectId: pool.poolId,
              poolLabel,
              lastDate: null,
              ...shownState(post, null, now),
              words,
              wordsUnavailable: unavailable,
            });
          }
        }
        // A last day appears only once the cycle has reached day 14 (the day-14 sweep posts it), and while its deadline is in the window.
        const deadlineAt = cycleDeadlineAt(cycle.committedAt);
        if (cycleDayFromCommittedAt(cycle.committedAt, now) >= 14 && deadlineAt.getTime() >= windowStart) {
          const post = cycle.posts.find((p) => p.occasion === 'last_day');
          const lastDate = post?.lastDate ?? operationalDate(deadlineAt);
          // Review FS-1 — the alert leaves `live` only at the hourly close sweep, so a last day is ALSO bounded by its deadline (the job's
          // stale rule, `-418` item 2): ⛔ words, ⛔ Copy, from `deadlineAt` on.
          const lastDayWordsDue = wordsDue && now.getTime() < deadlineAt.getTime();
          const words = lastDayWordsDue ? buildAnnouncementPost(translate, { occasion: 'last_day', lastDate }) : null;
          if (words !== null) wordsBuilt += 1;
          posts.push({
            occasion: 'last_day',
            alertId: cycle.alertId,
            subjectId: cycle.alertId,
            poolLabel: null,
            lastDate,
            ...shownState(post, deadlineAt, now),
            words,
            wordsUnavailable: false,
          });
        }
      }

      // ONE line per GET, counts only — ⛔ a name, ⛔ a text (`-418` item 9; the reconciliation-review audited-read shape).
      emitAuthAudit(deps, request, 'admin_announcement_channels.posts_read', {
        actorId,
        pariwarId: pariwarIdStr,
        context: { enabled: config.enabled, entries: posts.length, words_built: wordsBuilt, words_unavailable: wordsUnavailable },
      });
      return { enabled: config.enabled, posts };
    },

    /** GET the member's own Pariwar's links (FS12 (a); the wa-opt-in status read's scope-tx shape — F16). */
    async getMemberLinks(request: FastifyRequest): Promise<AnnouncementChannelsMemberResponse> {
      const memberId = request.requestContext.actorId;
      const pariwarIdStr = request.requestContext.pariwarId;
      if (!memberId || !pariwarIdStr) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const state = await channels.readAnnouncementChannelsState(scopeTx.client, pariwarIdStr);
        ok = true;
        return channels.memberVisibleAnnouncementLinks(state);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
