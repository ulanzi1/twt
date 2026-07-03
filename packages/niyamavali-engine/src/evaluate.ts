// DB shell — Story 4.1 (Task 4; AC1.2, and the wiring for AC2/AC3).
//
// The shell resolves the world (clause version + member state + snapshot + DB-`now()`),
// calls the PURE `interpretClause`, then memoizes + audits. It constructs NOTHING — the
// scoped `Db`, the idempotency `KeyedStore`, and the audit `servicePool` all arrive via
// the `deps` DI object (`new pg.Pool()` outside `db.ts` is a lint error; the engine only
// RECEIVES connections). Clause-not-resolvable returns `null` (mirror `resolveImaList`
// → caller maps), never a throw.
//
// ── DB-authoritative time (§1.11) ────────────────────────────────────────────────
// `evaluate` snapshots `now()` ONCE (a single `SELECT now()`) and threads that instant
// through EVERY resolution — never an app-server `new Date()`. Pinning one instant also
// closes the deferred-work W6 mixed-provenance window for a future multi-clause
// evaluation (Story 4.6). Live-`evaluate` cache hits are rare BY DESIGN (the timestamp
// advances) — the per-cohort live cache is Story 4.8; 4.1's memo is for replay /
// idempotent re-evaluation of a FIXED timestamp.

import { ids, member, niyamavali, type Db, type idempotency } from '@twt/domain';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import { z } from 'zod';

import { auditCompute, type AuditActor } from './audit.js';
import { buildCacheKey, memberStateHash, niyamavaliVersionHash } from './cache-key.js';
import { interpretClause } from './interpret.js';
import type {
  EvaluationContext,
  EvaluationResult,
  Facts,
  ResolvedClause,
  ResolvedEvaluationContext,
} from './types.js';

/** TTL for the replay memo — sized well above any evaluation runtime (keyed-store caller contract). */
const DEFAULT_TTL_SECONDS = 3600;

/** Collaborators, injected (DI) — the engine constructs none of them. */
export interface EvaluateDeps {
  /** Scoped Drizzle handle (RLS set via `withPariwarScope`) — every read runs through it. */
  db: Db;
  /** Story 1.12 idempotency memo (own-committing tx). */
  keyedStore: idempotency.KeyedStore;
  /** BYPASSRLS service pool for the global audit chain (Story 1.10). */
  servicePool: pg.Pool;
  /** Acting principal for the audit line (defaults to system/SIE = null). */
  actor?: AuditActor;
  traceId?: string | null;
  /** Override the memo TTL (default 3600s). */
  cacheTtlSeconds?: number;
}

/** The `niy.lock-in.policy` snapshot payload subset the seam consumes (mirror lock-in.ts). */
const LockInPolicySnapshotSchema = z
  .object({ lock_in_days: z.number().int().positive() })
  .passthrough();

interface LockInSnapshot {
  lockInDays: number;
  lockInPolicyVersion: ids.ClauseVersionId;
}

/**
 * Snapshot-resolution seam (FR-8; lock-in exemplar). Reads the member's lock-in
 * snapshot (`getLockInClock` → the `lock_in_policy_version` clause_version_id) and
 * resolves that EXACT version via `resolveByClauseVersionId` — NOT `resolveByClauseId`
 * (which returns the CURRENT version and would re-lock). A later amendment of
 * `niy.lock-in.policy` therefore does NOT change an existing member's resolved policy
 * (AC2.2). Returns `null` when the member never entered lock-in or the snapshot is
 * unresolvable/malformed (the caller simply omits the snapshot facts).
 */
async function resolveLockInSnapshot(
  db: Db,
  context: EvaluationContext,
  at: Date,
): Promise<LockInSnapshot | null> {
  const clock = await member.getLockInClock(db, context.memberId, at);
  if (!clock) return null;
  const policyVersion = ids.clauseVersionId(clock.lockInPolicyVersion);
  const policyRow = await niyamavali.resolveByClauseVersionId(db, context.pariwarId, policyVersion);
  if (!policyRow) return null;
  const parsed = LockInPolicySnapshotSchema.safeParse(policyRow.payload);
  if (!parsed.success) return null;
  return { lockInDays: parsed.data.lock_in_days, lockInPolicyVersion: policyRow.clauseVersionId };
}

/**
 * One DB-authoritative `now()` read, threaded through every resolution (§1.11). Tolerant
 * of the driver result shape: drizzle's `execute` may surface the pg result (`.rows`) or
 * the row array directly, and timestamptz may arrive as a `Date` or an ISO string — both
 * are DB-authoritative (the value ORIGINATES from the DB clock, never an app clock).
 */
export async function selectDbNow(db: Db): Promise<Date> {
  const res = (await db.execute(sql`SELECT now() AS now`)) as unknown;
  const rows = (Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? [])) as Array<{
    now?: unknown;
  }>;
  const raw = rows[0]?.now;
  if (raw instanceof Date) return raw;
  if (typeof raw === 'string' || typeof raw === 'number') {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  throw new Error('[niyamavali-engine] SELECT now() did not return a timestamp');
}

/**
 * Replay-correct historical evaluation (AC1.2). Resolves the clause version effective at
 * `evaluationTimestamp`, the member state at that instant, and the snapshot policy where
 * the payload declares it; interprets; then memoizes + audits (audit on COMPUTE only).
 * Returns `null` when the clause cannot be resolved.
 */
export async function evaluateAt(
  deps: EvaluateDeps,
  clauseId: ids.ClauseId,
  context: EvaluationContext,
  evaluationTimestamp: Date,
): Promise<EvaluationResult | null> {
  const { db } = deps;

  const clauseRow = await niyamavali.resolveByClauseId(
    db,
    context.pariwarId,
    clauseId,
    evaluationTimestamp,
  );
  if (!clauseRow) return null; // not resolvable → caller maps (mirror resolveImaList → null)

  const memberState = await member.getMemberStateAt(db, context.memberId, evaluationTimestamp);

  const facts: Facts = { ...(context.facts ?? {}) };
  const resolvedClauseVersionIds: ids.ClauseVersionId[] = [clauseRow.clauseVersionId];

  // Snapshot-resolution seam (AC2): a payload that declares itself snapshot-resolved
  // routes through the snapshot path; the resolved values enter `facts` under reserved
  // `snapshot.*` keys (so a generic operator like `fact_gte` reads them, rule-agnostic).
  if (clauseRow.payload['snapshot_resolution'] === 'lock_in') {
    const snapshot = await resolveLockInSnapshot(db, context, evaluationTimestamp);
    if (snapshot) {
      facts['snapshot.lock_in_days'] = snapshot.lockInDays;
      facts['snapshot.lock_in_policy_version'] = snapshot.lockInPolicyVersion;
      resolvedClauseVersionIds.push(snapshot.lockInPolicyVersion);
    }
  }

  const resolved: ResolvedClause = {
    clauseId: clauseRow.clauseId,
    clauseVersionId: clauseRow.clauseVersionId,
    payload: clauseRow.payload,
    benefitMechanism: clauseRow.benefitMechanism,
  };
  const resolvedCtx: ResolvedEvaluationContext = {
    pariwarId: context.pariwarId,
    memberId: context.memberId,
    memberState,
    facts,
    evaluatedAt: evaluationTimestamp,
    resolvedClauseVersionIds,
  };

  const key = buildCacheKey({
    pariwarId: context.pariwarId,
    memberId: context.memberId,
    clauseId,
    evaluationTimestampIso: evaluationTimestamp.toISOString(),
    memberStateHash: memberStateHash(memberState, facts),
    niyamavaliVersionHash: niyamavaliVersionHash(resolvedClauseVersionIds),
  });

  // Read-through: a cache-hit REPLAYS an already-audited compute — do NOT re-audit.
  const cached = await deps.keyedStore.getResult(key);
  if (cached != null) return cached as EvaluationResult;

  const outcome = await deps.keyedStore.claim(key, deps.cacheTtlSeconds ?? DEFAULT_TTL_SECONDS);
  if (outcome === 'acquired') {
    const result = interpretClause(resolved, resolvedCtx);
    // Audit before caching: if auditCompute throws, the result is not recorded and the next
    // caller will re-compute + re-audit. Caching first would leave the result permanently
    // in the idempotency store unaudited for the full TTL.
    await auditCompute(deps.servicePool, {
      pariwarId: context.pariwarId,
      memberId: context.memberId,
      inputsSummary: result.provenance.inputsSummary,
      actor: deps.actor,
      traceId: deps.traceId,
    });
    await deps.keyedStore.recordResult(key, result);
    return result;
  }

  // Lost the claim race: prefer the concurrent computer's recorded result; else compute
  // the (deterministic, byte-identical) result locally WITHOUT re-recording/re-auditing
  // (the claim owner audits exactly once).
  const concurrent = await deps.keyedStore.getResult(key);
  if (concurrent != null) return concurrent as EvaluationResult;
  return interpretClause(resolved, resolvedCtx);
}

/**
 * Live evaluation (AC1.2). Resolves DB-authoritative `now()` ONCE and delegates to
 * `evaluateAt` with that single pinned instant.
 */
export async function evaluate(
  deps: EvaluateDeps,
  clauseId: ids.ClauseId,
  context: EvaluationContext,
): Promise<EvaluationResult | null> {
  const dbNow = await selectDbNow(deps.db);
  return evaluateAt(deps, clauseId, context, dbNow);
}
