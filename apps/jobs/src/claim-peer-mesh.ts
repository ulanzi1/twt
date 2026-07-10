// Peer-mesh deterministic selection + ping + AR-61 window fallback — Story 6.6 (Task 5/6).
//
// TWO Class-B/C pg-boss workers, both registered here (mirror registerClaimOcrParityWorker):
//
//   · CLAIM_PEER_MESH_SELECT (runClaimPeerMeshSelect) — enqueued by the OCR-parity worker
//     after it advances the claim to `documents_pending`. In ONE scope-tx it: probes
//     idempotency (a selection row already exists → self-heals the window enqueue, no-op
//     otherwise), reads the deceased's district + created_at, snapshots the active candidate
//     roster (excluding the claimant), deterministically selects the 5 nearest, PERSISTS the
//     immutable selection (snapshot + deceased reference point + ordered ids + metric), emits
//     `claim.peer_mesh_pinged` (→ verification_in_progress) via the projector, and records ONE
//     delivery-neutral ping intent per selected member (Decision D1 — no live fan-out). After
//     commit it enqueues the window job DELAYED (startAfter = the response window).
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
//
// DETERMINISM (AC1/AC5): selection runs against the SNAPSHOT captured + persisted in the same
// tx (candidates AND the deceased's own district/createdAt reference point — review fix: the
// deceased side was previously re-derived live at replay time, contradicting the persisted-
// snapshot discipline); replay re-runs `selectPeerMesh` on the persisted snapshot (never a live
// re-query). The engine is pure — this job owns only the I/O + orchestration.

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
 * Idempotent: a second run finds the existing selection and no-ops on the selection/event/ping
 * work — but still self-heals the window-job enqueue when the existing selection's outcome is
 * still `pending` (review fix — a previously lost enqueue no longer strands the claim forever).
 * Throws on an unrecoverable infrastructure error (missing pariwarId / missing claim) so
 * pg-boss retries/DLQs.
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
    // (1) Idempotency probe — a selection already exists for this claim → no-op the
    //     selection/event/ping work (the immutable record is never rewritten). Still
    //     self-heal the window-job enqueue below when the outcome is still pending
    //     (Decision 2 — a previously lost `boss.send` no longer strands the claim).
    const existing = await claim.getPeerMeshSelectionByClaim(db, brandedPariwarId, claimCaseId);
    if (existing) {
      return {
        created: false,
        selectedCount: existing.selectedMemberIds.length,
        outcome: existing.outcome,
        responseWindowExpiresAt: existing.responseWindowExpiresAt,
      };
    }

    // (2) The claim row — fetched BEFORE the candidate snapshot (review fix) so
    //     `claimantActorId` is available to exclude the claimant from their own mesh
    //     (non-manipulability — Task 2's `excludeActorId`, previously never passed).
    const claimRow = await claim.getClaimCase(db, brandedPariwarId, claimCaseId);
    if (!claimRow) {
      throw new Error(`[jobs] claim-peer-mesh-select: claim ${claimCaseId} not found in scope`);
    }

    // (3) The deceased's district + created_at (the comparator reference point) — persisted
    //     alongside the selection (review fix) so replay never re-derives it live.
    const deceased = await claim.getPeerMeshDeceasedAttributes(db, brandedPariwarId, deceasedMemberId);
    if (!deceased) {
      throw new Error(`[jobs] claim-peer-mesh-select: deceased member ${deceasedMemberId} not found in scope`);
    }

    // (4) Snapshot the active candidate roster (the frozen input for replay), excluding both
    //     the deceased AND the claimant (if distinct — a claimant cannot vote in their own
    //     mesh).
    const candidates = await claim.getPeerMeshCandidateSnapshot(db, {
      pariwarId: brandedPariwarId,
      deceasedMemberId,
      excludeActorId: claimRow.claimantActorId ? ids.memberId(claimRow.claimantActorId) : undefined,
    });

    // (5) Resolve the metric + run the PURE deterministic selection.
    const metric = claim.resolvePeerMeshMetric();
    const selection = claim.selectPeerMesh({
      deceasedMemberId,
      claimCaseId: p.claimCaseId,
      deceased,
      candidates,
      metric,
    });

    const responseWindowExpiresAt = new Date(now.getTime() + windowSeconds * 1000);

    // (6) Persist the immutable selection (snapshot + deceased reference + ordered ids +
    //     metric + window). Idempotent. `selectionRow` — NOT the locally-computed `selection`
    //     — is the authoritative source for every downstream use (review fix: a concurrent
    //     racing select-job resolves the conflict branch to the WINNING transaction's row,
    //     which can differ from this transaction's own locally-computed result).
    const selectionRow = await claim.persistPeerMeshSelection(db, {
      claimCaseId,
      pariwarId: brandedPariwarId,
      deceasedMemberId,
      deceased,
      metricId: selection.metricId,
      metricVersion: selection.metricVersion,
      selectedMemberIds: selection.selectedMemberIds,
      candidates,
      responseWindowExpiresAt,
    });

    // (7) Zero-eligible-candidates disposition (review decision — Decision 1): resolve
    //     immediately to `skipped` with a bounded machine-readable reason, bypass the window
    //     job entirely (there is nothing to wait for), and emit NO `claim.peer_mesh_pinged` —
    //     the claim stays `documents_pending`; the operator resolves via ground-inspection.
    if (selectionRow.selectedMemberIds.length === 0) {
      await claim.skipPeerMesh(
        db,
        brandedPariwarId,
        claimCaseId,
        claim.PEER_MESH_SKIP_REASON_NO_ELIGIBLE_CANDIDATES,
      );
      return {
        created: true,
        selectedCount: 0,
        outcome: 'skipped' as schema.PeerMeshOutcome,
        responseWindowExpiresAt,
      };
    }

    // (8) Emit `claim.peer_mesh_pinged` (documents_pending → verification_in_progress) via the
    //     projector — the ONLY legal writer to claims.current_state. Skip when the claim is not
    //     `documents_pending` (a retry / a sibling already advanced) → no second event. A benign
    //     append race is rolled back to a SAVEPOINT so the ping-intent inserts still commit.
    //     Ping-intent persistence (review fix) lives INSIDE this guard — previously it ran
    //     unconditionally, so a claim that never actually reached verification_in_progress
    //     could still accumulate durable "pinged" records with no corresponding audit event.
    if (claimRow.currentState === 'documents_pending') {
      await client.query('SAVEPOINT peer_mesh_pinged');
      try {
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
        await client.query('RELEASE SAVEPOINT peer_mesh_pinged');
      } catch (err) {
        if (err instanceof claim.ClaimStreamConcurrencyError) {
          await client.query('ROLLBACK TO SAVEPOINT peer_mesh_pinged');
          alarm(`[jobs] claim-peer-mesh-select: benign append race on claim ${claimCaseId} — pinged already emitted`);
        } else {
          throw err;
        }
      }

      // (9) Record ONE delivery-neutral ping intent per selected member (Decision D1 —
      //     recorded, not dispatched). Idempotent on (selection_id, member_id).
      await claim.persistPeerMeshPingIntents(
        db,
        selectionRow.selectionId,
        brandedPariwarId,
        selectionRow.selectedMemberIds,
      );
    }

    return {
      created: true,
      selectedCount: selectionRow.selectedMemberIds.length,
      outcome: selectionRow.outcome,
      responseWindowExpiresAt: selectionRow.responseWindowExpiresAt,
    };
  });

  // (10) Enqueue the window-expiry job DELAYED (after commit) — ONLY while the outcome is
  //      still `pending` (the zero-candidate skip disposition already resolved; nothing to
  //      wait for). Self-healing: this ALSO fires on the idempotent no-op branch when the
  //      existing selection is still pending (Decision 2), timed off the PERSISTED deadline.
  if (outcome.outcome === 'pending') {
    await enqueuePeerMeshWindow(
      boss,
      envelope,
      p.claimCaseId,
      outcome.responseWindowExpiresAt,
      now,
      alarm,
    );
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
