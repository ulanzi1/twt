// Human shepherd assignment worker — Story 6.12 (Task 4; AC1/AC4/AC9; R2 RATIFIED).
//
// A Class-B pg-boss worker enqueued by the peer-mesh SELECT worker AFTER it commits
// `claim.peer_mesh_pinged` (→ verification_in_progress) — the assignment half of the actionable
// State-level queue. In ONE scope-tx it: reads the deceased's server-derived posting district, reads the
// claim (for the claimant coordinate), AUTO-assigns the least-loaded CONTACTABLE in-scope district_admin
// (claim.assignShepherd — advisory lock + pre-write idempotency + deterministic pick), and on an
// empty/ineligible pool routes to the AR-61 fallback via the INJECTED ShepherdFallbackResolver port
// (claim.reassignShepherd, reason `fallback`). If neither a primary nor a fallback can be resolved it
// alarms + throws so pg-boss retries/DLQs (the peer-mesh missing-scope precedent) — never a claim silently
// left shepherd-less. Post-commit it fires the ShepherdAssignedNotificationHook (AC7 seam).
//
// D-C: the district comes from `member.getMemberPostingLatest(db, pariwarId, deceasedMemberId)` — the same
// domain read the (unexported, request-scoped) verifier-console/decision preHandlers wrap; a worker cannot
// use those preHandlers and calls the domain read directly.
//
// Idempotency (AC9): at-least-once redelivery is a no-op — the pre-write live-assignment check +
// partial-unique index make a second assign for an already-shepherded claim return without a new row/event.

import crypto from 'node:crypto';

import { audit, claim, ids, member, withPariwarScope } from '@twt/domain';
import { type JobEnvelope, type QueueClient, QUEUE_NAMES, type Job } from '@twt/queue';

import type { ShepherdFallbackResolver } from './shepherd-fallback-resolver.js';
import type {
  ShepherdAssignedEvent,
  ShepherdAssignedNotificationHook,
} from './shepherd-notification-hook.js';

export interface ClaimShepherdAssignDeps {
  /** The domain-table pool. withPariwarScope sets the tenant scope per job. */
  readonly pool: import('pg').Pool;
  /** The AR-61 fallback port (config-backed in prod; a fixed fake in tests). */
  readonly fallbackResolver: ShepherdFallbackResolver;
  /** The member-notification seam — fired post-commit (best-effort; never blocks the assignment). */
  readonly notify: ShepherdAssignedNotificationHook;
  /** Failure alarm sink — a console stub by default. */
  readonly onAlarm?: (message: string) => void;
}

/** CLAIM_SHEPHERD_ASSIGN payload (wrapped in a JobEnvelope). All fields NON-PII. */
export interface ClaimShepherdAssignPayload {
  readonly claimCaseId: string;
  readonly deceasedMemberId: string;
}

/** Result of one assign run (also stored in the pg-boss job `output`). NON-PII. */
export interface ClaimShepherdAssignResult {
  readonly claimCaseId: string;
  /** `true` when this run assigned/reassigned a shepherd; `false` on the idempotent no-op path. */
  readonly assigned: boolean;
  readonly assignmentReason: 'initial' | 'fallback' | 'noop';
}

/** SHA-256 hex of a NON-PII context object — the audit `requestPayloadHash` (never the payload). */
function contextHash(context: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex');
}

/**
 * The assign worker body. Drive it in isolation with a fake pool + injected fallback resolver + capturing
 * notify hook. Throws on an unrecoverable condition (missing pariwarId / missing claim / no resolvable
 * district / an un-resolvable fallback) so pg-boss retries/DLQs.
 */
export async function runClaimShepherdAssign(
  deps: ClaimShepherdAssignDeps,
  envelope: JobEnvelope<ClaimShepherdAssignPayload>,
): Promise<ClaimShepherdAssignResult> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const { pariwarId } = envelope;
  const p = envelope.payload;

  if (!pariwarId) {
    // Cannot scope a DB write without pariwarId — the enqueueing worker always sets it. THROW so pg-boss
    // retries/DLQs (the peer-mesh missing-pariwarId precedent).
    alarm(`[jobs] claim-shepherd-assign: missing pariwarId for claim ${p.claimCaseId}`);
    throw new Error(`[jobs] claim-shepherd-assign: missing pariwarId for claim ${p.claimCaseId}`);
  }

  const brandedPariwarId = ids.pariwarId(pariwarId);
  const claimCaseId = ids.claimId(p.claimCaseId);
  const deceasedMemberId = ids.memberId(p.deceasedMemberId);

  const outcome = await withPariwarScope(deps.pool, pariwarId, async (db, client) => {
    // The claim row — the claimant coordinate for the notify + a not-found guard.
    const claimRow = await claim.getClaimCase(db, brandedPariwarId, claimCaseId);
    if (!claimRow) {
      throw new Error(`[jobs] claim-shepherd-assign: claim ${claimCaseId} not found in scope`);
    }

    // D-C — the deceased's server-derived latest posting district (the candidate-pool scope). A member
    // without a resolvable posting cannot be districted → un-resolved (alarm + retry/DLQ), never a
    // fabricated district (the shepherd_assigned event requires a non-empty district).
    const posting = await member.getMemberPostingLatest(db, brandedPariwarId, deceasedMemberId);
    const district = posting?.district?.trim();
    if (!district) {
      alarm(`[jobs] claim-shepherd-assign: no posting district for claim ${claimCaseId} (deceased ${deceasedMemberId})`);
      throw new Error(`[jobs] claim-shepherd-assign: unresolved district for claim ${claimCaseId}`);
    }

    // (1) AUTO path — least-loaded contactable in-scope district_admin.
    try {
      const result = await claim.assignShepherd(client, {
        claimCaseId,
        pariwarId: brandedPariwarId,
        district,
      });
      if (result.idempotentNoop) {
        return { assigned: false, assignmentReason: 'noop' as const, notify: null, auditFallback: null };
      }
      return {
        assigned: true,
        assignmentReason: 'initial' as const,
        notify: {
          pariwarId,
          claimCaseId: p.claimCaseId,
          shepherdActorId: result.assignment.shepherdActorId,
          claimantActorId: claimRow.claimantActorId,
          assignmentReason: 'initial' as const,
        } satisfies ShepherdAssignedEvent,
        // The AC5 audit requirement ("audit-logged reassignment/fallback") does not cover the plain
        // automatic first assignment — only reassignment (manual, apps/api) and fallback (below).
        auditFallback: null,
      };
    } catch (err) {
      if (!(err instanceof claim.NoEligibleShepherdError)) throw err;
      // (2) AR-61 fallback path (AC4) — the empty/ineligible pool routes here.
      const fallback = await deps.fallbackResolver(pariwarId, district, p.claimCaseId);
      if (!fallback) {
        // Neither a primary nor a fallback resolved → record un-resolved (alarm + retry/DLQ), never a
        // claim silently left shepherd-less (AC4).
        alarm(`[jobs] claim-shepherd-assign: no eligible shepherd AND no fallback for claim ${claimCaseId} in district '${district}'`);
        throw new Error(`[jobs] claim-shepherd-assign: unresolved shepherd (no fallback) for claim ${claimCaseId}`);
      }
      const result = await claim.reassignShepherd(client, {
        claimCaseId,
        pariwarId: brandedPariwarId,
        district,
        targetShepherdActorId: fallback.shepherdActorId,
        targetDisplay: fallback.display,
        targetContactPhone: fallback.contactPhone,
        targetContactWhatsapp: fallback.contactWhatsapp,
        assignmentReason: 'fallback',
        actor: 'system',
        actorId: null,
      });
      return {
        assigned: true,
        assignmentReason: 'fallback' as const,
        notify: {
          pariwarId,
          claimCaseId: p.claimCaseId,
          shepherdActorId: result.assignment.shepherdActorId,
          claimantActorId: claimRow.claimantActorId,
          assignmentReason: 'fallback' as const,
        } satisfies ShepherdAssignedEvent,
        // AC5/story scope ("audit-logged reassignment/fallback") — the fallback path IS a reassignment
        // of the shepherd (or a fresh assignment via the fallback route), so it gets a post-commit line.
        auditFallback: {
          shepherdActorId: result.assignment.shepherdActorId,
          previousShepherdActorId: result.previousShepherdActorId,
          district,
        },
      };
    }
  });

  // Post-commit member notification (AC7 seam — best-effort; a throw never fails the committed assignment).
  if (outcome.notify) {
    try {
      deps.notify(outcome.notify);
    } catch (err) {
      alarm(`[jobs] claim-shepherd-assign: notify hook threw for claim ${p.claimCaseId} — ${(err as Error)?.message ?? String(err)}`);
    }
  }

  // Post-commit audit (AC5/story scope — "audit-logged reassignment/fallback"; best-effort, non-blocking).
  if (outcome.auditFallback) {
    const { shepherdActorId, previousShepherdActorId, district } = outcome.auditFallback;
    try {
      await audit.writeAuditEntry(deps.pool, {
        pariwarId,
        actorId: null,
        actorRole: 'system',
        action: 'admin_claim.shepherd_reassigned',
        resourceLocator: `claim:${p.claimCaseId}`,
        requestPayloadHash: contextHash({
          claim_case_id: p.claimCaseId,
          district,
          shepherd_actor_id: shepherdActorId,
          previous_shepherd_actor_id: previousShepherdActorId,
          assignment_reason: 'fallback',
        }),
        responseStatus: 200,
        traceId: null,
      });
    } catch (auditErr) {
      const e = auditErr as Error;
      alarm(`[jobs] claim-shepherd-assign: audit write failed for claim ${p.claimCaseId} — ${e?.message ?? String(auditErr)}`);
    }
  }

  console.info(
    '[jobs] claim-shepherd-assign',
    JSON.stringify({ claimCaseId: p.claimCaseId, assigned: outcome.assigned, reason: outcome.assignmentReason }),
  );
  return { claimCaseId: p.claimCaseId, assigned: outcome.assigned, assignmentReason: outcome.assignmentReason };
}

/**
 * Register the CLAIM_SHEPHERD_ASSIGN queue + worker. Mirrors registerClaimPeerMeshWorkers' build shape.
 * The queue is created here; the SELECT worker enqueues onto it via the injected callback wired in boot.ts.
 */
export async function registerClaimShepherdAssignWorker(
  boss: QueueClient,
  deps: ClaimShepherdAssignDeps,
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CLAIM_SHEPHERD_ASSIGN);
  await boss.work(QUEUE_NAMES.CLAIM_SHEPHERD_ASSIGN, async (jobs: Job[]) => {
    const results: ClaimShepherdAssignResult[] = [];
    for (const job of jobs) {
      results.push(await runClaimShepherdAssign(deps, job.data as JobEnvelope<ClaimShepherdAssignPayload>));
    }
    return { processed: results.length, results };
  });
}
