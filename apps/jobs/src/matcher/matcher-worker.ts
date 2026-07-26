// UTR reconciliation matcher — the apps/jobs cron worker (Story 9.4, Task 3; AC1/AC3/AC5/AC6/AC8).
//
// The runtime driver for the pure `matchPool` engine (@twt/domain reconciliation). It closes the forward
// contracts Epic 8 + Story 9.3 left standing: the FIRST live producer of `contribution.confirmed` (green) —
// the sole authority the Story 8.3 contributor list / 8.6 Yogdaan Bahi green arm / contribution/history.ts
// have been reading as `[]` — plus `contribution.reconciliation-mismatch` (red) for a deposit found but
// invalid.
//
// ── The run (per cycle) ────────────────────────────────────────────────────────────────────────────
//   Phase 1 — resolve the cycle's alert; do work ONLY when it is `live` (AC1 cron scope — a producer-less
//             tick is a cheap no-op). Load the cycle's pools, each pool's statement-uploaded provenance, the
//             alert's attestations, and the already-emitted verdict keys (the monotonic + dedup guards).
//   Phase 2 — for each pool's `parsed` statement upload: FETCH the blob (AR-45-wrapped — Task 5), re-parse it
//             (byte-identical replay via the Story 9.2 parseStatement), and idempotently PERSIST the entries
//             (Decision D4). Per-blob failure isolation (§5.3): a storage outage / parse crash on one blob is
//             audit-logged + skipped, never a whole-run crash (deferred to the next tick — the cron heals).
//   Phase 3 — load the cycle's persisted entries (cross-pool, for wrong-pool detection) and run `matchPool`
//             per pool.
//   Phase 4 — EMIT each verdict, guarded by the three-layer monotonic invariant (AC5): the keyed-store claim
//             (concurrent ticks), the monotonic pre-read (`contribution.confirmed` exists ⇒ no re-emit, no
//             red-after-green), and the append-only events_log (a direct un-confirm fails at the DB).
//
// ── What the worker deliberately does NOT emit ─────────────────────────────────────────────────────
//   · a `no_statement_entry` mismatch — the pure matcher classifies it (a UTR with no in-window deposit),
//     but the LIVE matcher never emits it: during the open window a member who attested before their nominee
//     uploaded the statement is legitimately PENDING (yellow), not failed. Emitting red there would flip
//     every fresh attester to a mismatch. Only a deposit FOUND-and-REJECTED (wrong_pool / amount_mismatch)
//     is a live mismatch. The post-close "still no deposit" determination is a reconciliation-tail concern
//     (Story 8.9 tail / a future story), not 9.4's live matcher.
//   · ANY reversal / un-confirm event — the matcher NEVER un-confirms (AC5b). The ONLY un-confirm path is
//     the Story 9.8 trustee-attested `reconciliation.confirmation-reversed`. There is no reversal emitter in
//     this worker's or the domain writer's code path (the structural half of the monotonic invariant).

import { idempotency, ids, reconciliation, withPariwarScope } from '@twt/domain';
import { parseStatement } from '@twt/bank-parsers';
import type { BankStatementStorage } from '@twt/contracts';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import { ResilientCall, StorageUnavailableError } from './resilience.js';

/** Default recovery-sweep cadence (IST) — the contracted "cron 6×/day" (every 4h). Overridable via env. */
export const DEFAULT_MATCHER_CRON = '0 */4 * * *';
export const MATCHER_SWEEP_TZ = 'Asia/Kolkata';

/** Default parser slug (mirrors apps/api's RECONCILIATION_PARIWAR_SLUG default). */
export const DEFAULT_MATCHER_PARSER_SLUG = 'bihar';

/** Max cycles one recovery-sweep run re-enqueues. Bounds the scan; a full batch is logged (no silent cap). */
export const DEFAULT_MATCHER_SWEEP_LIMIT = 500;

/** Keyed-store claim TTL for one verdict emit (seconds). Sized with HEADROOM over a single append + its
 *  version retries so a claim never expires mid-emit ([[project_live_db_test_gotchas]] TTL gotcha). */
export const DEFAULT_MATCH_CLAIM_TTL_SECONDS = 300;

/**
 * The mismatch reasons the LIVE matcher EMITS as `contribution.reconciliation-mismatch` — a deposit was
 * FOUND and REJECTED. `no_statement_entry` is deliberately absent (see the header): during the open window
 * a not-yet-reconciled attestation is pending (yellow), never a premature red. `sender_vpa_mismatch` is a
 * forward seam the matcher never produces in v1 (the D3 arm is off) — included so the set is the honest
 * "found-and-rejected" superset the day that arm lights.
 */
const EMITTABLE_MISMATCH_REASONS: ReadonlySet<reconciliation.MatchMismatchReason> = new Set([
  'wrong_pool',
  'amount_mismatch',
  'sender_vpa_mismatch',
  'entry_already_claimed',
]);

export interface ReconciliationMatchDeps {
  /** BYPASSRLS service pool — the withPariwarScope pool + the keyed-store pool + the cross-tenant sweep scan. */
  readonly pool: pg.Pool;
  /** The bank-statement blob store the matcher re-reads to re-parse (the ONE external call, AR-45-wrapped). */
  readonly bankStatementStorage: BankStatementStorage;
  /** The parser slug (registry key half). Defaults to {@link DEFAULT_MATCHER_PARSER_SLUG}. */
  readonly parserSlug?: string;
  /** Recovery-sweep batch bound. Defaults to {@link DEFAULT_MATCHER_SWEEP_LIMIT}. */
  readonly sweepLimit?: number;
  /** Per-verdict keyed-store claim TTL. Defaults to {@link DEFAULT_MATCH_CLAIM_TTL_SECONDS}. */
  readonly claimTtlSeconds?: number;
  /** Injectable clock for confirmedAt/detectedAt (tests pass a fixed clock). Defaults to the wall clock. */
  readonly now?: () => Date;
  /** Injectable AR-45 wrapper for the blob fetch (tests inject a tuned/observable one). Default constructed. */
  readonly storageCall?: ResilientCall;
  /**
   * Story 9.4 Decision D6 — the confirmed-push seam (best-effort). Fired POST-COMMIT of a
   * `contribution.confirmed` append; a failed enqueue NEVER fails the confirmation (the sweep/next-tick
   * heals a dropped job — the cycle-open enqueue-is-best-effort precedent). Omitted ⇒ no push (tests omit).
   */
  readonly enqueueConfirmedNotify?: (input: {
    readonly pariwarId: string;
    readonly alertId: string;
    readonly poolId: string;
    readonly memberId: string;
    readonly amountPaise: number;
    readonly periodLabel: string;
    readonly requestId: string;
    readonly traceId: string;
  }) => Promise<void>;
  /** Failure alarm sink — a console stub by default. */
  readonly onAlarm?: (message: string) => void;
}

/** RECONCILIATION_MATCH payload (wrapped in a JobEnvelope; pariwarId rides the envelope). NON-PII. */
export interface ReconciliationMatchPayload {
  /** The cycle boundary == cycle_freeze_commits.commit_id == the alert's cycle_id. */
  readonly cycleId: string;
}

/** Result of one RECONCILIATION_MATCH run (stored in the pg-boss job `output`). NON-PII — counts only. */
export interface ReconciliationMatchResult {
  readonly cycleId: string;
  /** `false` when the cycle's alert is not `live` (the no-op path — AC1 cron scope). */
  readonly live: boolean;
  readonly entriesPersisted: number;
  readonly confirmed: number;
  readonly mismatched: number;
  /** Skipped verdicts (already confirmed / already mismatched / claimed by a concurrent tick). */
  readonly noop: number;
}

/** The envelope context a RECONCILIATION_MATCH enqueue carries (from the upload post-commit or the sweep). */
export interface ReconciliationMatchEnqueueInput {
  readonly cycleId: string;
  readonly pariwarId: string;
  readonly requestId: string;
  readonly actorId: string | null;
  readonly traceId: string;
}

/**
 * Enqueue a RECONCILIATION_MATCH job (send-only, at-least-once). singletonKey = cycle_id so a duplicate
 * enqueue collapses; every verdict is idempotent regardless. The ONE place the queue/envelope is built —
 * both the post-commit upload seam (D7 latency optimizer) and the recovery sweep call it.
 */
export async function enqueueReconciliationMatch(
  boss: Pick<QueueClient, 'send'>,
  input: ReconciliationMatchEnqueueInput,
): Promise<void> {
  await boss.send(
    QUEUE_NAMES.RECONCILIATION_MATCH,
    {
      requestId: input.requestId,
      pariwarId: input.pariwarId,
      actorId: input.actorId,
      traceId: input.traceId,
      payload: { cycleId: input.cycleId },
    } satisfies JobEnvelope<ReconciliationMatchPayload>,
    { singletonKey: input.cycleId },
  );
}

/** Build the (member, alert, entry) idempotency key — the AC1 keyed-store spine. */
function matchClaimKey(pariwarId: string, alertId: string, memberId: string, entryId: string): string {
  return `reconciliation.match:${pariwarId}:${alertId}:${memberId}:${entryId}`;
}

/**
 * The RECONCILIATION_MATCH worker body. Drive it in isolation with a fake pool + storage. Loads the cycle's
 * live-alert context, re-parses + persists statements, matches per pool, and emits the verdicts idempotently
 * + monotonically. Throws only on a missing pariwarId (a real defect — pg-boss retries/DLQs); a per-blob /
 * per-verdict failure is isolated (audit-logged + skipped), never a whole-run crash (AC8).
 */
export async function runReconciliationMatch(
  deps: ReconciliationMatchDeps,
  envelope: JobEnvelope<ReconciliationMatchPayload>,
): Promise<ReconciliationMatchResult> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const { pariwarId: pariwarIdStr } = envelope;
  const { cycleId } = envelope.payload;
  if (!pariwarIdStr) {
    alarm(`[jobs] reconciliation-match: missing pariwarId for cycle ${cycleId}`);
    throw new Error(`[jobs] reconciliation-match: missing pariwarId for cycle ${cycleId}`);
  }
  const pariwarId = ids.pariwarId(pariwarIdStr);
  const cycleFreezeId = ids.cycleFreezeCommitId(cycleId);
  const parserSlug = deps.parserSlug ?? DEFAULT_MATCHER_PARSER_SLUG;
  const claimTtl = deps.claimTtlSeconds ?? DEFAULT_MATCH_CLAIM_TTL_SECONDS;
  const storageCall = deps.storageCall ?? new ResilientCall('bank-statement-storage');
  const store = idempotency.createKeyedStore(deps.pool, deps.now ? { clock: deps.now } : {});
  const nowIso = (): string => (deps.now?.() ?? new Date()).toISOString();
  const matcherRun = envelope.traceId || `matcher:${cycleId}`;

  // ── Phase 1 — resolve the live-alert context (a cheap no-op when the alert is not live) ──────────────
  const ctx = await withPariwarScope(deps.pool, pariwarIdStr, async (db) => {
    const alert = await reconciliation.getCycleAlert(db, { pariwarId, cycleId: cycleFreezeId });
    if (alert === null || alert.currentState !== 'live') return null;
    const pools = await reconciliation.listCyclePools(db, { pariwarId, cycleId: cycleFreezeId });
    const uploadsByPool = new Map<string, reconciliation.StatementUpload[]>();
    for (const p of pools) {
      uploadsByPool.set(p.poolId, await reconciliation.listPoolStatementUploads(db, { pariwarId, poolId: p.poolId }));
    }
    const attestations = await reconciliation.listAlertAttestations(db, { pariwarId, alertId: alert.alertId });
    const existing = await reconciliation.listExistingVerdictKeys(db, { pariwarId, alertId: alert.alertId });
    const claimedEntryIds = await reconciliation.listConfirmedEntryIds(db, { pariwarId, alertId: alert.alertId });
    const window = await reconciliation.resolveAlertLiveWindow(db, { pariwarId, alertId: alert.alertId });
    return { alertId: alert.alertId, pools, uploadsByPool, attestations, existing, claimedEntryIds, window };
  });

  if (ctx === null) {
    return { cycleId, live: false, entriesPersisted: 0, confirmed: 0, mismatched: 0, noop: 0 };
  }

  // ── Phase 2 — re-parse + persist each pool's parsed statement uploads (AR-45 blob fetch, §5.3 isolation) ─
  let entriesPersisted = 0;
  for (const p of ctx.pools) {
    for (const up of ctx.uploadsByPool.get(p.poolId) ?? []) {
      if (!up.parsed) continue; // a fallback/unparseable upload has no matchable entries.
      let bytes: Uint8Array;
      try {
        bytes = await storageCall.run(() => deps.bankStatementStorage.getBytes(up.objectKey));
      } catch (err) {
        // A storage outage / breaker-open defers THIS blob to the next tick (the cron heals) — never a crash.
        alarm(
          `[jobs] reconciliation-match: blob fetch failed for pool ${p.poolId} (${up.statementEventId}) — ` +
            `${err instanceof StorageUnavailableError ? `${err.dependency}:${err.kind}` : String(err)} ` +
            `(deferred to the next tick)`,
        );
        continue;
      }
      let parsed;
      try {
        parsed = parseStatement(parserSlug, up.bankCode, Buffer.from(bytes));
      } catch (err) {
        // A parse crash on one blob → skip that blob (§5.3 failure isolation), never a whole-run crash.
        alarm(`[jobs] reconciliation-match: re-parse failed for pool ${p.poolId} (${up.statementEventId}) — ${String(err)}`);
        continue;
      }
      const rows = reconciliation.mapParsedEntriesToRows(
        { pariwarId, poolId: p.poolId, statementEventId: up.statementEventId, claimCaseId: p.claimCaseId },
        parsed.entries,
      );
      try {
        entriesPersisted += await withPariwarScope(deps.pool, pariwarIdStr, (db) =>
          reconciliation.persistStatementEntries(db, rows),
        );
      } catch (err) {
        alarm(`[jobs] reconciliation-match: entry persist failed for pool ${p.poolId} — ${String(err)}`);
      }
    }
  }

  // ── Phase 3 — load the cycle's persisted entries (cross-pool for wrong-pool) + match per pool ────────
  const entries = await withPariwarScope(deps.pool, pariwarIdStr, (db) =>
    reconciliation.listEntriesForPools(db, { pariwarId, poolIds: ctx.pools.map((p) => p.poolId) }),
  );
  const attByPool = new Map<string, reconciliation.MatcherAttestation[]>();
  for (const a of ctx.attestations) {
    const list = attByPool.get(a.poolId) ?? [];
    list.push(a);
    attByPool.set(a.poolId, list);
  }

  // ── Phase 4 — emit the verdicts (monotonic + idempotent) ────────────────────────────────────────────
  let confirmed = 0;
  let mismatched = 0;
  let noop = 0;

  // Entry-exclusivity spine (patch: same entry can never back two members' confirmations): seeded from prior
  // ticks (ctx.claimedEntryIds) and grown as EACH pool's matchPool call claims entries — pools share the one
  // cross-pool `entries` array, so a later pool in this same run must see an earlier pool's claim.
  const claimedEntryIds = new Set(ctx.claimedEntryIds);

  for (const p of ctx.pools) {
    const result = reconciliation.matchPool({
      poolId: p.poolId,
      attestations: attByPool.get(p.poolId) ?? [],
      entries,
      fixedAmount: p.fixedAmount,
      window: ctx.window,
      claimedEntryIds,
    });
    for (const c of result.confirmations) claimedEntryIds.add(c.entryId);

    // Confirmations (green).
    for (const c of result.confirmations) {
      const vkey = reconciliation.verdictKey(c.poolId, c.memberId);
      if (ctx.existing.confirmed.has(vkey)) {
        noop += 1; // monotonic no-op — already confirmed (AC5a).
        continue;
      }
      const key = matchClaimKey(pariwarIdStr, ctx.alertId, c.memberId, c.entryId);
      let claim: Awaited<ReturnType<typeof store.claim>>;
      try {
        claim = await store.claim(key, claimTtl);
      } catch (err) {
        // A transient keyed-store failure is isolated to THIS verdict (§5.3 posture) — never a whole-run
        // crash; the next tick retries (the claim was never acquired, so nothing to release).
        alarm(`[jobs] reconciliation-match: claim failed for member ${c.memberId} pool ${c.poolId} — ${String(err)}`);
        continue;
      }
      if (claim !== 'acquired') {
        noop += 1; // a concurrent tick owns this verdict.
        continue;
      }
      try {
        // Re-check the monotonic pre-read inside the claim (a concurrent tick may have just confirmed).
        const already = await withPariwarScope(deps.pool, pariwarIdStr, (db) =>
          reconciliation.hasConfirmedContribution(db, { pariwarId, poolId: c.poolId, memberId: c.memberId }),
        );
        if (already) {
          await store.recordResult(key, { skipped: 'already_confirmed' }).catch(() => undefined);
          noop += 1;
          continue;
        }
        await withPariwarScope(deps.pool, pariwarIdStr, (_db, client) =>
          reconciliation.appendConfirmedContribution(client, {
            pariwarId,
            alertId: ids.alertId(ctx.alertId),
            payload: {
              poolId: c.poolId,
              memberId: c.memberId,
              alertId: c.alertId,
              utr: c.utr,
              confirmedAt: nowIso(),
              matchProvenance: {
                bankStatementEntryId: c.entryId,
                idempotencyKey: key,
                matcherRun,
                senderVpaCheck: c.senderVpaCheck,
              },
            },
          }),
        );
        await store.recordResult(key, { confirmed: true }).catch(() => undefined);
        (ctx.existing.confirmed as Set<string>).add(vkey);
        confirmed += 1;

        // Decision D6 — best-effort confirmed-push seam (POST-COMMIT). A failed enqueue never fails the
        // committed confirmation (the sweep/next-tick heals a dropped job).
        if (deps.enqueueConfirmedNotify) {
          try {
            await deps.enqueueConfirmedNotify({
              pariwarId: pariwarIdStr,
              alertId: ctx.alertId,
              poolId: c.poolId,
              memberId: c.memberId,
              amountPaise: p.fixedAmount * 100,
              periodLabel: p.poolCanonicalIdentifier,
              requestId: envelope.requestId,
              traceId: matcherRun,
            });
          } catch (err) {
            alarm(`[jobs] reconciliation-match: confirmed-notify enqueue failed for member ${c.memberId} — ${String(err)} (best-effort; will heal)`);
          }
        }
      } catch (err) {
        // The append/commit failed — release the claim so a retry can re-emit; never a whole-run crash.
        await store.release(key).catch(() => undefined);
        alarm(`[jobs] reconciliation-match: confirm append failed for member ${c.memberId} pool ${c.poolId} — ${String(err)}`);
      }
    }

    // Mismatches (red) — only the found-and-rejected reasons; never a premature no_statement_entry.
    for (const m of result.mismatches) {
      if (!EMITTABLE_MISMATCH_REASONS.has(m.reason)) continue;
      const confirmedVkey = reconciliation.verdictKey(m.poolId, m.memberId);
      if (ctx.existing.confirmed.has(confirmedVkey)) {
        noop += 1; // never a red-after-green (monotonic).
        continue;
      }
      // Dedup keys on (pool, member, REASON) — a member already flagged for THIS reason is not re-flagged
      // every tick, but a NEW reason on a later tick (e.g. wrong_pool → amount_mismatch against a fresh
      // entry) re-emits instead of being silently absorbed by the stale prior reason.
      const mismatchVkey = reconciliation.verdictKey(m.poolId, m.memberId, m.reason);
      if (ctx.existing.mismatched.has(mismatchVkey)) {
        noop += 1; // already flagged for this exact reason — dedup (do not re-emit every tick).
        continue;
      }
      const entryId = m.entryId;
      if (entryId === null) continue; // an emittable mismatch always carries the offending entry.
      const key = matchClaimKey(pariwarIdStr, ctx.alertId, m.memberId, `mismatch:${m.reason}:${entryId}`);
      let mismatchClaim: Awaited<ReturnType<typeof store.claim>>;
      try {
        mismatchClaim = await store.claim(key, claimTtl);
      } catch (err) {
        alarm(`[jobs] reconciliation-match: claim failed for member ${m.memberId} pool ${m.poolId} — ${String(err)}`);
        continue;
      }
      if (mismatchClaim !== 'acquired') {
        noop += 1;
        continue;
      }
      try {
        await withPariwarScope(deps.pool, pariwarIdStr, (_db, client) =>
          reconciliation.appendReconciliationMismatch(client, {
            pariwarId,
            alertId: ids.alertId(ctx.alertId),
            payload: {
              poolId: m.poolId,
              memberId: m.memberId,
              alertId: m.alertId,
              utr: m.utr,
              reason: m.reason,
              bankStatementEntryId: entryId,
              detectedAt: nowIso(),
              matcherRun,
            },
          }),
        );
        await store.recordResult(key, { mismatch: m.reason }).catch(() => undefined);
        (ctx.existing.mismatched as Set<string>).add(mismatchVkey);
        mismatched += 1;
      } catch (err) {
        await store.release(key).catch(() => undefined);
        alarm(`[jobs] reconciliation-match: mismatch append failed for member ${m.memberId} pool ${m.poolId} — ${String(err)}`);
      }
    }
  }

  console.info(
    '[jobs] reconciliation-match',
    JSON.stringify({ cycleId, live: true, entriesPersisted, confirmed, mismatched, noop }),
  );
  return { cycleId, live: true, entriesPersisted, confirmed, mismatched, noop };
}

interface LiveAlertRow {
  readonly cycle_id: string;
  readonly pariwar_id: string;
}

/**
 * The RECOVERY sweep body (Decision D7 — the contracted "cron 6×/day"). Scans (cross-tenant, on the BYPASSRLS
 * service pool) for `live` alerts and re-enqueues RECONCILIATION_MATCH per cycle. Bounded per run; a full
 * batch is logged so the cap is never silent. Returns the number of cycles re-enqueued.
 */
export async function runReconciliationMatchSweep(
  deps: ReconciliationMatchDeps,
  boss: Pick<QueueClient, 'send'>,
): Promise<number> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const limit = Math.max(1, deps.sweepLimit ?? DEFAULT_MATCHER_SWEEP_LIMIT);

  const { rows } = await deps.pool.query<LiveAlertRow>(
    `SELECT cycle_id, pariwar_id
       FROM alerts
      WHERE current_state = 'live'
      ORDER BY created_at ASC
      LIMIT $1`,
    [limit],
  );

  let reEnqueued = 0;
  for (const row of rows) {
    try {
      await enqueueReconciliationMatch(boss, {
        cycleId: row.cycle_id,
        pariwarId: row.pariwar_id,
        requestId: `reconciliation.match.sweep:${row.cycle_id}`,
        actorId: null,
        traceId: `reconciliation.match.sweep:${row.cycle_id}`,
      });
      reEnqueued += 1;
    } catch (err) {
      alarm(`[jobs] reconciliation-match-sweep: failed to re-enqueue cycle ${row.cycle_id} — ${String(err)}`);
    }
  }

  if (rows.length >= limit) {
    alarm(
      `[jobs] reconciliation-match-sweep: hit the ${String(limit)}-cycle batch cap — more live cycles remain; ` +
        `the next tick will pick them up (raise sweepLimit if this recurs)`,
    );
  }
  console.info('[jobs] reconciliation-match-sweep', JSON.stringify({ reEnqueued, scanned: rows.length, limit }));
  return reEnqueued;
}

/**
 * Register the RECONCILIATION_MATCH worker + the recovery-sweep queue/worker/cron (the
 * registerCycleOpenAlertWorkers precedent). The post-commit enqueue seam (D7 latency optimizer) is wired
 * separately in apps/api; the sweep is the contracted 6×/day mechanism.
 */
export async function registerReconciliationMatchWorkers(
  boss: QueueClient,
  deps: ReconciliationMatchDeps,
  opts: { sweepCron?: string; sweepTz?: string } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.RECONCILIATION_MATCH);
  await boss.work(QUEUE_NAMES.RECONCILIATION_MATCH, async (jobs: Job[]) => {
    const results: ReconciliationMatchResult[] = [];
    for (const job of jobs) {
      results.push(await runReconciliationMatch(deps, job.data as JobEnvelope<ReconciliationMatchPayload>));
    }
    return { processed: results.length, results };
  });

  const sweepCron = opts.sweepCron ?? DEFAULT_MATCHER_CRON;
  const sweepTz = opts.sweepTz ?? MATCHER_SWEEP_TZ;
  await boss.createQueue(QUEUE_NAMES.RECONCILIATION_MATCH_SWEEP);
  await boss.work(QUEUE_NAMES.RECONCILIATION_MATCH_SWEEP, async (jobs: Job[]) => {
    try {
      const reEnqueued = await runReconciliationMatchSweep(deps, boss);
      console.info('[jobs] reconciliation-match-sweep tick', JSON.stringify({ jobs: jobs.length, reEnqueued }));
      return { reEnqueued };
    } catch (err) {
      console.error('[jobs] reconciliation-match-sweep failed', err);
      throw err;
    }
  });
  await boss.schedule(QUEUE_NAMES.RECONCILIATION_MATCH_SWEEP, sweepCron, {}, { tz: sweepTz });
}
