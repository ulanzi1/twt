// Peer-mesh deterministic selection + ping + AR-61 window fallback — Story 6.6 (Task 5/6); Story 6.36 (Task 4).
//
// TWO Class-B/C pg-boss workers, both registered here (mirror registerClaimOcrParityWorker):
//
//   · CLAIM_PEER_MESH_SELECT (runClaimPeerMeshSelect) — enqueued by the OCR-parity worker
//     after it advances the claim to `documents_pending`. In ONE scope-tx it: LOCKS the claim, probes
//     idempotency (a selection row already exists → a no-op + the window / shepherd self-heal), returns
//     unless the claim is `documents_pending`, then reads — ⭐ Story 6.36 (`workplace_named_v1`, SW18–SW23) —
//     who worked with the deceased, or else whom they named, AS RECORDED BEFORE THE (FIRST — `-339`) FILING DAY, chooses
//     deterministically, PERSISTS the immutable selection (snapshot + ranking + source + the workplace
//     record), and either emits `claim.peer_mesh_pinged` (→ verification_in_progress) with ONE
//     delivery-neutral ping intent per selected member (Decision D1 — no live fan-out here; ⭐ Story 6.27c
//     texts each ping ONCE through the claim send core, recorded on the ping row — 6.27a's 0156 columns), or —
//     nobody to ask — `claim.peer_mesh_none_to_ask` (→ verification_in_progress; SW25). After commit it
//     enqueues the window job DELAYED (startAfter = the response window) and the shepherd-assign job.
//
//   · CLAIM_PEER_MESH_WINDOW (runClaimPeerMeshWindow) — enqueued delayed by the select worker
//     (queue policy 'short' — review fix: the ONLY policy in this pg-boss version whose
//     singleton_key uniqueness actually covers not-yet-fired 'created' jobs; 'standard', pg-boss's
//     default and what every other queue in this codebase uses, provides NO singletonKey dedup
//     at all — see the policy comment on registerClaimPeerMeshWorkers). On fire it first checks
//     whether the response window was EXTENDED past this fire (self-defers, re-enqueuing for the
//     remaining time, if so); otherwise it counts DISTINCT `claim.peer_mesh_responded` events:
//     ≥3 → `sufficient`; <3 → `insufficient_responses_fallback` (ground-inspection-primary; the
//     operator signal the verifier console reads). NEVER auto-denies, NEVER advances state past
//     `verification_in_progress` (peer-mesh + ground-inspection are BOTH, not either — PRD §4.6).
//     ⭐ Story 6.27a (PM8, PM6; re-pin 2026-10-12): the label RESOLVING no longer closes answering — a neighbour's answer is
//     taken while an approval is still to come (`claim/answer-window.ts`), so one can arrive AFTER this worker resolved;
//     the label is ⛔ NOT recounted (monotonic), and it gates ⛔ nothing (FQ9 needs the inspection anyway).
//
// DETERMINISM (AC1/AC5; 6.36 I7): selection runs against the SNAPSHOT captured + persisted in the same
// tx; replay re-runs the ONE dispatch (`runPeerMeshMetric`, via `replayPeerMeshSelection`) on the persisted
// row alone (never a live re-query). The engine is pure — this job owns only the I/O + orchestration.

import {
  claim,
  ids,
  schema,
  withPariwarScope,
} from '@twt/domain';
import {
  QUEUE_NAMES,
  type Job,
  type JobEnvelope,
  type QueueClient,
} from '@twt/queue';

/** The default response window (FR-39 — 72h to respond before AR-61 fallback). */
export const DEFAULT_PEER_MESH_WINDOW_SECONDS = 72 * 60 * 60;

/** The AR-61 sufficiency threshold: fewer than this many DISTINCT responders → fallback. */
export const PEER_MESH_SUFFICIENT_RESPONSES = 3;

export interface ClaimPeerMeshDeps {
  /** The domain-table pool. withPariwarScope sets the tenant scope per job. */
  readonly pool: import('pg').Pool;
  /**
   * The response window in seconds (configurable — env-overridable at boot). ONE named
   * constant; do NOT hardcode `72h` inline in two places. Defaults to
   * {@link DEFAULT_PEER_MESH_WINDOW_SECONDS}.
   */
  readonly windowSeconds?: number;
  /** Injectable clock (deterministic tests). */
  readonly now?: () => Date;
  /** Failure alarm sink — a console stub by default. */
  readonly onAlarm?: (message: string) => void;
  /**
   * Story 6.12 (R2) — enqueue the shepherd-assign job AFTER this worker commits `claim.peer_mesh_pinged` or (Story 6.36)
   * `claim.peer_mesh_none_to_ask` (→ verification_in_progress). Injected (the OCR→SELECT cross-file precedent) so this frozen 6.6 file
   * never imports the shepherd queue name nor calls `boss.send` for it directly; the assignment gets its
   * OWN retry/DLQ envelope and never couples into the selection tx. Optional — omitted, no shepherd is
   * enqueued (Story 6.6's own tests do not wire it). Best-effort: a failure alarms, never fails the select.
   */
  readonly enqueueShepherdAssign?: (
    envelope: Pick<JobEnvelope<unknown>, 'requestId' | 'pariwarId' | 'actorId' | 'traceId'>,
    claimCaseId: string,
    deceasedMemberId: string,
  ) => Promise<void>;
}

/** CLAIM_PEER_MESH_SELECT payload (wrapped in a JobEnvelope). All fields NON-PII. */
export interface ClaimPeerMeshSelectPayload {
  readonly claimCaseId: string;
  readonly deceasedMemberId: string;
}

/** CLAIM_PEER_MESH_WINDOW payload (wrapped in a JobEnvelope). All fields NON-PII. */
export interface ClaimPeerMeshWindowPayload {
  readonly claimCaseId: string;
}

/** Result of one select run (also stored in the pg-boss job `output`). */
export interface ClaimPeerMeshSelectResult {
  readonly claimCaseId: string;
  /** `true` when this run created the selection; `false` on the idempotent no-op path. */
  readonly created: boolean;
  readonly selectedCount: number;
}

function resolveWindowSeconds(deps: ClaimPeerMeshDeps): number {
  return deps.windowSeconds ?? DEFAULT_PEER_MESH_WINDOW_SECONDS;
}

/**
 * Enqueue (or self-heal a lost enqueue of) the window-expiry job for `claimCaseId`, timed to
 * fire at `responseWindowExpiresAt` (NOT a fresh `windowSeconds` — always derived from the
 * PERSISTED deadline so a self-heal / self-defer call fires at the SAME instant the original
 * would have, never resetting the clock). Review fix (Decision 2): callers do NOT probe
 * "does a job already exist" first — the `claim.peer_mesh_window` queue's 'short' policy makes
 * a duplicate `send()` with the same `singletonKey` a safe no-op at the DB level, and
 * `resolvePeerMeshOutcome`'s monotonic `WHERE outcome = 'pending'` guard makes an extra/late
 * fire harmless even in the unlikely case a duplicate slips through.
 */
async function enqueuePeerMeshWindow(
  boss: QueueClient,
  envelope: Pick<JobEnvelope<unknown>, 'requestId' | 'pariwarId' | 'actorId' | 'traceId'>,
  claimCaseId: string,
  responseWindowExpiresAt: Date,
  now: Date,
  onAlarm: (message: string) => void,
): Promise<void> {
  const startAfterSeconds = Math.max(1, Math.ceil((responseWindowExpiresAt.getTime() - now.getTime()) / 1000));
  try {
    await boss.send(
      QUEUE_NAMES.CLAIM_PEER_MESH_WINDOW,
      {
        requestId: envelope.requestId,
        pariwarId: envelope.pariwarId,
        actorId: envelope.actorId,
        traceId: envelope.traceId,
        payload: { claimCaseId },
      } satisfies JobEnvelope<ClaimPeerMeshWindowPayload>,
      { startAfter: startAfterSeconds, singletonKey: claimCaseId },
    );
  } catch (err) {
    const e = err as Error & { code?: string };
    onAlarm(
      `[jobs] claim-peer-mesh: failed to enqueue/reschedule window job for claim ${claimCaseId} — ` +
        `${e?.code ?? 'NO_CODE'} ${e?.message ?? String(err)}`,
    );
  }
}

/**
 * The select+ping worker body. Drive it in isolation with a fake pool + a controlled clock.
 *
 * ⭐ Story 6.36 (AC8; SW18–SW25) — ONE scope transaction, in THIS order:
 *   (1) `lockClaimCase` (FOR UPDATE) — FIRST, the order every other appender uses. Two select jobs at once (a second
 *       `jobs` process, a deploy overlap, `localConcurrency` > 1 — one is enqueued per upload and the queue's standard
 *       policy makes `singletonKey` inert) serialize HERE: the loser waits, then its probe finds the winner's selection.
 *   (2) the idempotency probe — a selection exists ⇒ a no-op (+ the window / shepherd self-heal after COMMIT);
 *   (3) the state guard — a claim ⛔ in `documents_pending` returns BEFORE the snapshot: ⛔ selection, ⛔ window job,
 *       ⛔ shepherd. ⭐ A selection is persisted ONLY together with its edge;
 *   (4) the cut (the death's FIRST filing day — `resolvePeerMeshFilingCut`, `-339` option C), the grouped snapshot,
 *       `runPeerMeshMetric`, the persist;
 *   (5) somebody to ask ⇒ `claim.peer_mesh_pinged` + one ping intent each, carrying the selection's `source`;
 *       nobody ⇒ `claim.peer_mesh_none_to_ask` + `skipped` — the claim goes on to the ground inspection (SF4).
 * ⚠ A `ClaimStreamConcurrencyError` is ⛔ never swallowed (6.6's "benign append race" SAVEPOINT is GONE): with the lock
 * held ⛔ known appender can race, so one is a real defect — rethrown, and pg-boss retries the whole transaction.
 * Throws on an unrecoverable infrastructure error (missing pariwarId / claim / deceased) so pg-boss retries/DLQs.
 */
export async function runClaimPeerMeshSelect(
  boss: QueueClient,
  deps: ClaimPeerMeshDeps,
  envelope: JobEnvelope<ClaimPeerMeshSelectPayload>,
): Promise<ClaimPeerMeshSelectResult> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const now = deps.now ? deps.now() : new Date();
  const { pariwarId } = envelope;
  const p = envelope.payload;

  if (!pariwarId) {
    // Cannot scope a DB write without pariwarId — the enqueueing worker always sets it. THROW
    // (not a silent drop) so pg-boss retries/DLQs (the OCR job's missing-pariwarId precedent).
    alarm(`[jobs] claim-peer-mesh-select: missing pariwarId for claim ${p.claimCaseId}`);
    throw new Error(`[jobs] claim-peer-mesh-select: missing pariwarId for claim ${p.claimCaseId}`);
  }

  const brandedPariwarId = ids.pariwarId(pariwarId);
  const claimCaseId = ids.claimId(p.claimCaseId);
  const deceasedMemberId = ids.memberId(p.deceasedMemberId);

  const windowSeconds = resolveWindowSeconds(deps);

  const outcome = await withPariwarScope(deps.pool, pariwarId, async (db, client) => {
    // (1) The claim row, LOCKED — the first statement (AC8).
    const claimRow = await claim.lockClaimCase(db, brandedPariwarId, claimCaseId);
    if (!claimRow) {
      throw new Error(`[jobs] claim-peer-mesh-select: claim ${claimCaseId} not found in scope`);
    }

    // (2) Idempotency probe — a selection already exists for this claim → no-op the selection/event/ping work (the
    //     immutable record is never rewritten). The window (Decision 2) and the shepherd (Story 6.12) are self-healed
    //     after COMMIT: a previously lost `boss.send` no longer strands the claim.
    const existing = await claim.getPeerMeshSelectionByClaim(db, brandedPariwarId, claimCaseId);
    if (existing) {
      return {
        created: false,
        selectedCount: existing.selectedMemberIds.length,
        outcome: existing.outcome as schema.PeerMeshOutcome | null,
        responseWindowExpiresAt: existing.responseWindowExpiresAt,
        advanced: claimRow.currentState === 'verification_in_progress',
      };
    }

    // (3) The state guard — BEFORE the snapshot. ⛔ `documents_pending` (still `intake_converged`, or already past
    //     it) ⇒ ⛔ selection, ⛔ window, ⛔ shepherd; the next upload's OCR run enqueues a fresh select job.
    if (claimRow.currentState !== 'documents_pending') {
      return { created: false, selectedCount: 0, outcome: null, responseWindowExpiresAt: null, advanced: false };
    }

    // (4) The 6.6 reference point — still written (`deceased_created_at` is NOT NULL); read by nothing in the grouped
    //     metric or its replay.
    const deceased = await claim.getPeerMeshDeceasedAttributes(db, brandedPariwarId, deceasedMemberId);
    if (!deceased) {
      throw new Error(`[jobs] claim-peer-mesh-select: deceased member ${deceasedMemberId} not found in scope`);
    }

    // (5) The default metric (`workplace_named_v1`), its anchor (the FILING day — ⛔ decrypt, ⛔ KMS) and its
    //     snapshot as recorded before the cut; then the ONE dispatch (the same function replay uses).
    const metric = claim.resolvePeerMeshMetric();
    if (metric.kind !== 'grouped') {
      throw new Error(`[jobs] claim-peer-mesh-select: the default metric ${metric.metricId} is not a grouped metric`);
    }
    // RF1 (`2026-10-16-339`, option C): the death's FIRST filing, unless an innocence finding lifts a claim.
    const cut = await claim.resolvePeerMeshFilingCut(db, {
      pariwarId: brandedPariwarId,
      deceasedMemberId,
      claimCreatedAt: claimRow.createdAt,
    });
    const snapshot = await claim.getPeerMeshGroupedSnapshot(db, {
      pariwarId: brandedPariwarId,
      deceasedMemberId,
      claimantActorId: claimRow.claimantActorId,
      cut,
    });
    const selection = claim.runPeerMeshMetric({
      metric,
      claimCaseId,
      deceasedMemberId,
      deceased,
      candidates: snapshot.candidates,
    });

    const responseWindowExpiresAt = new Date(now.getTime() + windowSeconds * 1000);

    // (6) Persist the immutable selection. `selectionRow` — NOT the locally-computed `selection` — is the
    //     authoritative source for every downstream use (the winning-row rule).
    const selectionRow = await claim.persistPeerMeshSelection(db, {
      claimCaseId,
      pariwarId: brandedPariwarId,
      deceasedMemberId,
      deceased,
      metricId: selection.metricId,
      metricVersion: selection.metricVersion,
      selectedMemberIds: selection.selectedMemberIds,
      candidates: snapshot.candidates,
      workplace: {
        source: selection.source,
        previousWorkplaceCounted: snapshot.workplace.previousWorkplaceCounted,
        recentChangeBeforeFiling: snapshot.recentChangeBeforeFiling,
        deceasedWorkplaceId: snapshot.workplace.currentWorkplaceId,
        deceasedPreviousWorkplaceId: snapshot.workplace.previousWorkplaceId,
        rankedMemberIds: selection.rankedMemberIds ?? [],
      },
      responseWindowExpiresAt,
    });

    // (7) Nobody to ask (SW25; AC7, AC8) — `skipped` with a bounded reason, ⛔ window job, ⛔ ping; the claim GOES ON
    //     to `verification_in_progress` (the ground inspection carries it) and a shepherd is assigned after COMMIT.
    if (selectionRow.selectedMemberIds.length === 0) {
      await claim.projectClaimState(client, {
        claimCaseId,
        pariwarId: brandedPariwarId,
        deceasedMemberId,
        intakeChannels: claimRow.intakeChannels,
        claimantActorId: claimRow.claimantActorId,
        eventType: 'claim.peer_mesh_none_to_ask',
        payload: {
          from_state: 'documents_pending',
          to_state: 'verification_in_progress',
          trigger: 'peer_mesh_none_to_ask',
          actor: 'system',
          metric_id: selectionRow.metricId,
          metric_version: selectionRow.metricVersion,
        },
        actorId: null,
      });
      await claim.skipPeerMesh(
        db,
        brandedPariwarId,
        claimCaseId,
        claim.PEER_MESH_SKIP_REASON_NO_WORKPLACE_COLLEAGUE_OR_NAMED_PERSON,
      );
      return {
        created: true,
        selectedCount: 0,
        outcome: 'skipped' as schema.PeerMeshOutcome | null,
        responseWindowExpiresAt,
        advanced: true,
      };
    }

    // (8) Somebody to ask — `claim.peer_mesh_pinged` (documents_pending → verification_in_progress) via the projector
    //     (the ONLY legal writer to claims.current_state), then ONE delivery-neutral ping intent per selected member,
    //     each carrying the selection's source (SW24; 0163's trigger checks it). Idempotent on (selection_id, member_id).
    await claim.projectClaimState(client, {
      claimCaseId,
      pariwarId: brandedPariwarId,
      deceasedMemberId,
      intakeChannels: claimRow.intakeChannels,
      claimantActorId: claimRow.claimantActorId,
      eventType: 'claim.peer_mesh_pinged',
      payload: {
        from_state: 'documents_pending',
        to_state: 'verification_in_progress',
        trigger: 'peer_mesh_selected',
        actor: 'system',
        selected_member_ids: [...selectionRow.selectedMemberIds],
        metric_id: selectionRow.metricId,
        metric_version: selectionRow.metricVersion,
      },
      actorId: null,
    });
    await claim.persistPeerMeshPingIntents(
      db,
      selectionRow.selectionId,
      brandedPariwarId,
      selectionRow.selectedMemberIds,
      selectionRow.source,
    );

    return {
      created: true,
      selectedCount: selectionRow.selectedMemberIds.length,
      outcome: selectionRow.outcome as schema.PeerMeshOutcome | null,
      responseWindowExpiresAt: selectionRow.responseWindowExpiresAt,
      advanced: true,
    };
  });

  // (9) Enqueue the window-expiry job DELAYED (after commit) — ONLY while the outcome is
  //     still `pending` (the zero-candidate skip disposition already resolved; nothing to
  //     wait for). Self-healing: this ALSO fires on the idempotent no-op branch when the
  //     existing selection is still pending (Decision 2), timed off the PERSISTED deadline.
  if (outcome.outcome === 'pending' && outcome.responseWindowExpiresAt) {
    await enqueuePeerMeshWindow(
      boss,
      envelope,
      p.claimCaseId,
      outcome.responseWindowExpiresAt,
      now,
      alarm,
    );
  }

  // (10) Story 6.12 (R2) — enqueue the shepherd-assign job AFTER commit, ONLY when the claim reached
  //      verification_in_progress (either edge — Story 6.36 SW25 adds `none_to_ask`). Best-effort + self-healing (fires
  //      on the idempotent no-op branch too when a prior enqueue was lost); a failure alarms, never fails the select job.
  //      The shepherd worker is idempotent, so a duplicate enqueue is a safe no-op.
  if (outcome.advanced && deps.enqueueShepherdAssign) {
    try {
      await deps.enqueueShepherdAssign(envelope, p.claimCaseId, p.deceasedMemberId);
    } catch (err) {
      const e = err as Error & { code?: string };
      alarm(
        `[jobs] claim-peer-mesh: failed to enqueue shepherd-assign for claim ${p.claimCaseId} — ` +
          `${e?.code ?? 'NO_CODE'} ${e?.message ?? String(err)}`,
      );
    }
  }

  console.info(
    '[jobs] claim-peer-mesh-select',
    JSON.stringify({ claimCaseId: p.claimCaseId, created: outcome.created, selectedCount: outcome.selectedCount }),
  );
  return { claimCaseId: p.claimCaseId, created: outcome.created, selectedCount: outcome.selectedCount };
}

/** Result of one window run (also stored in the pg-boss job `output`). */
export interface ClaimPeerMeshWindowResult {
  readonly claimCaseId: string;
  readonly distinctResponders: number;
  readonly outcome: schema.PeerMeshOutcome;
}

/**
 * The window-expiry AR-61 fallback worker body (Task 6). Idempotent + MONOTONIC: re-firing
 * recomputes the SAME outcome from the SAME event count via `resolvePeerMeshOutcome`'s
 * `WHERE outcome = 'pending'` guard (review fix — a resolved outcome can never silently flip
 * on a stray re-fire). Never auto-denies, never advances state. A `skipped` / already-terminal
 * selection is left untouched (an operator skip wins). SELF-DEFERS (review fix, Decision-3
 * companion to the extend-window fix) when the persisted `response_window_expires_at` is now
 * LATER than this fire — i.e. an operator extended the window after this job was scheduled —
 * re-enqueuing for the remaining time instead of resolving early. Throws only on missing
 * pariwarId (retry/DLQ).
 */
export async function runClaimPeerMeshWindow(
  boss: QueueClient,
  deps: ClaimPeerMeshDeps,
  envelope: JobEnvelope<ClaimPeerMeshWindowPayload>,
): Promise<ClaimPeerMeshWindowResult> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const now = deps.now ? deps.now() : new Date();
  const { pariwarId } = envelope;
  const p = envelope.payload;

  if (!pariwarId) {
    alarm(`[jobs] claim-peer-mesh-window: missing pariwarId for claim ${p.claimCaseId}`);
    throw new Error(`[jobs] claim-peer-mesh-window: missing pariwarId for claim ${p.claimCaseId}`);
  }

  const brandedPariwarId = ids.pariwarId(pariwarId);
  const claimCaseId = ids.claimId(p.claimCaseId);

  const result = await withPariwarScope(deps.pool, pariwarId, async (db) => {
    const selection = await claim.getPeerMeshSelectionByClaim(db, brandedPariwarId, claimCaseId);
    if (!selection) {
      // No selection → nothing to resolve. Not an error (a claim may never have been selected).
      return { distinctResponders: 0, outcome: 'pending' as schema.PeerMeshOutcome, deferred: false };
    }
    // An operator already skipped (or the window was already resolved to skipped) → leave it.
    if (selection.outcome !== 'pending') {
      return { distinctResponders: 0, outcome: selection.outcome, deferred: false };
    }
    // The window was extended past this fire — self-defer instead of resolving early.
    if (now.getTime() < selection.responseWindowExpiresAt.getTime()) {
      return {
        distinctResponders: 0,
        outcome: selection.outcome,
        deferred: true,
        responseWindowExpiresAt: selection.responseWindowExpiresAt,
      };
    }

    const responses = await claim.getPeerMeshResponses(db, claimCaseId);
    const distinct = claim.distinctPeerMeshResponderCount(responses);
    const nextOutcome: schema.PeerMeshOutcome =
      distinct >= PEER_MESH_SUFFICIENT_RESPONSES ? 'sufficient' : 'insufficient_responses_fallback';

    // Plain non-`state` UPDATE (no projector guard). NEVER advances claims.current_state.
    // MONOTONIC (resolvePeerMeshOutcome guards `WHERE outcome = 'pending'`).
    const resolved = await claim.resolvePeerMeshOutcome(db, brandedPariwarId, claimCaseId, nextOutcome);
    return { distinctResponders: distinct, outcome: resolved.outcome, deferred: false };
  });

  if (result.deferred && result.responseWindowExpiresAt) {
    await enqueuePeerMeshWindow(boss, envelope, p.claimCaseId, result.responseWindowExpiresAt, now, alarm);
  }

  console.info(
    '[jobs] claim-peer-mesh-window',
    JSON.stringify({
      claimCaseId: p.claimCaseId,
      distinctResponders: result.distinctResponders,
      outcome: result.outcome,
      deferred: result.deferred,
    }),
  );
  return { claimCaseId: p.claimCaseId, distinctResponders: result.distinctResponders, outcome: result.outcome };
}

/**
 * Operator affordance orchestration (AC6): EXTEND the response window AND actually reschedule
 * the window job at the new deadline (review fix — the domain `extendPeerMeshWindow` function
 * is DB-only by design and does NOT itself touch the queue; calling it directly left the
 * extension functionally inert, since the originally-scheduled job would still fire at the OLD
 * deadline and immediately overwrite the just-reset `pending` outcome). This is the ONLY
 * sanctioned way to extend a peer-mesh window from a live (future) operator-facing path — the
 * live console mount itself remains deferred (Decision D1 seam), same boundary as
 * `skipPeerMesh`.
 */
export async function extendPeerMeshWindowAndReschedule(
  boss: QueueClient,
  deps: ClaimPeerMeshDeps,
  envelope: Pick<JobEnvelope<unknown>, 'requestId' | 'pariwarId' | 'actorId' | 'traceId'>,
  pariwarId: string,
  claimCaseId: string,
  newExpiresAt: Date,
): Promise<schema.ClaimPeerMeshSelectionRow> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const now = deps.now ? deps.now() : new Date();
  const brandedPariwarId = ids.pariwarId(pariwarId);
  const brandedClaimCaseId = ids.claimId(claimCaseId);

  const updated = await withPariwarScope(deps.pool, pariwarId, (db) =>
    claim.extendPeerMeshWindow(db, brandedPariwarId, brandedClaimCaseId, newExpiresAt),
  );

  await enqueuePeerMeshWindow(boss, envelope, claimCaseId, updated.responseWindowExpiresAt, now, alarm);

  return updated;
}

/**
 * Register the peer-mesh SELECT + WINDOW queues + workers. Both share one `boss` (the select
 * worker enqueues the window job on it). Mirrors registerClaimOcrParityWorker's build shape.
 *
 * The WINDOW queue is created with `policy: 'short'` (review fix — see the module header):
 * pg-boss's DEFAULT `'standard'` policy (used by every other queue in this codebase) applies
 * NO uniqueness constraint to `singletonKey` at all in this pg-boss version — its dedup indexes
 * are gated on `policy IN ('short','singleton','stately','exclusive','key_strict_fifo')`, so a
 * `'standard'`-policy `send()` with a repeated `singletonKey` simply inserts another row. Only
 * `'short'`'s `job_i1` index (`UNIQUE (name, singleton_key) WHERE state = 'created'`) actually
 * prevents a second not-yet-fired job for the same claim from piling up — the exact guarantee
 * `enqueuePeerMeshWindow`'s self-heal/self-defer callers rely on without a manual "does a job
 * already exist" probe.
 */
export async function registerClaimPeerMeshWorkers(
  boss: QueueClient,
  deps: ClaimPeerMeshDeps,
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CLAIM_PEER_MESH_SELECT);
  await boss.createQueue(QUEUE_NAMES.CLAIM_PEER_MESH_WINDOW, { policy: 'short' });

  await boss.work(QUEUE_NAMES.CLAIM_PEER_MESH_SELECT, async (jobs: Job[]) => {
    const results: ClaimPeerMeshSelectResult[] = [];
    for (const job of jobs) {
      results.push(await runClaimPeerMeshSelect(boss, deps, job.data as JobEnvelope<ClaimPeerMeshSelectPayload>));
    }
    return { processed: results.length, results };
  });

  await boss.work(QUEUE_NAMES.CLAIM_PEER_MESH_WINDOW, async (jobs: Job[]) => {
    const results: ClaimPeerMeshWindowResult[] = [];
    for (const job of jobs) {
      results.push(await runClaimPeerMeshWindow(boss, deps, job.data as JobEnvelope<ClaimPeerMeshWindowPayload>));
    }
    return { processed: results.length, results };
  });
}
