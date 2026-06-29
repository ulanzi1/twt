// Lock-in policy resolution + the snapshot column write — Story 3.6b (Task 3; AC3 / R3).
//
// **Registry-backed (mirror medical/ima-list.ts).** The lock-in policy is NOT a code-level constant —
// it is a Niyamavali clause `niy.lock-in.policy` whose payload carries `{ lock_in_days }`, resolved
// per-Pariwar via the niyamavali registry (FR-8; v1 = 30-day, trustee-adjustable via the Story 2.4
// amend workflow with NO code deploy). The resolved `clause_version_id` is the recorded
// `lock_in_policy_version` (audit-reproducibility — mirrors 3.5's `ima_list_version`).
//
// This module is the SINGLE seam to the policy source: `member/` may import `niyamavali` accessors
// (both are `@twt/domain`-internal — no turbo cycle; `medical/ima-list.ts` already does it).
//
// ── New graduations do NOT re-lock existing members (FR-8) ─────────────────────────────────────────
// The snapshot is taken at the moment of lock-in entry; a later amendment of the clause does not
// retroactively change a member's join-time value (the snapshotted event payload is permanent; the
// `members.lock_in_days_at_join` column merely mirrors it — see R3).

import { eq } from 'drizzle-orm';
import { z } from 'zod';

import type { Db } from '../db.js';
import { type ClauseId, type ClauseVersionId, type MemberId, type PariwarId, clauseId } from '../ids/index.js';
import { resolveByClauseId } from '../niyamavali/read.js';
import { members } from '../schema/members.js';

/** The stable clause id for the lock-in policy (→ `lock_in_policy_version`). */
export const LOCK_IN_POLICY_CLAUSE_ID: ClauseId = clauseId('niy.lock-in.policy');

/**
 * The `niy.lock-in.policy` clause payload shape. `.passthrough()` tolerates the structural
 * `rule_code` / `benefit_mechanism` / `provisional` keys the seed carries (the registry payload is
 * opaque to the niyamavali layer; this resolver validates only the one field it consumes).
 * `lock_in_days` is a positive integer (the FR-8 ramp value: v1 = 30).
 */
export const LockInPolicyPayloadSchema = z
  .object({
    lock_in_days: z.number().int().positive(),
  })
  .passthrough();
export type LockInPolicyPayload = z.output<typeof LockInPolicyPayloadSchema>;

/** The resolved policy: the FR-8 lock-in-days snapshot + the clause version it came from. */
export interface ResolvedLockInPolicy {
  lockInDays: number;
  lockInPolicyVersion: ClauseVersionId;
}

/**
 * Resolve the effective lock-in policy for a Pariwar: resolve the current non-deprecated effective
 * `niy.lock-in.policy` clause version, parse + validate its payload, and return the days + the version
 * (the `clause_version_id` recorded as `lock_in_policy_version`, SERVER-authoritative). Returns `null`
 * when the clause is unprovisioned (or its payload is malformed) — the caller turns that into the AC3
 * 503 `lock_in.policy_unavailable`. `.safeParse` keeps a malformed payload non-throwing (3.5 Chunk-A
 * discipline).
 *
 * Tenant-scoped: the caller has set `app.pariwar_id` (RLS) AND passes `pariwarId` explicitly (the
 * niyamavali module convention).
 */
export async function resolveLockInPolicy(
  db: Db,
  pariwarId: PariwarId,
): Promise<ResolvedLockInPolicy | null> {
  const row = await resolveByClauseId(db, pariwarId, LOCK_IN_POLICY_CLAUSE_ID);
  if (!row) return null;
  const parsed = LockInPolicyPayloadSchema.safeParse(row.payload);
  if (!parsed.success) return null;
  return { lockInDays: parsed.data.lock_in_days, lockInPolicyVersion: row.clauseVersionId };
}

/**
 * Write the FR-8 lock-in-days snapshot into the `members.lock_in_days_at_join` read-cache column (R3).
 * A plain in-scope-tx UPDATE that leaves `state` unchanged, so the 0018 state-writer trigger does NOT
 * fire (it RAISEs only when `state` changes) — no `app.member_state_writer` guard needed. MUST be
 * called inside the SAME scope-tx that emitted `member.lock_in_entered`, with the SAME `days` value, so
 * the column can never diverge from the authoritative event payload at write time. Takes the scoped
 * Drizzle `Db` (the caller threads `scopeTx.tx`, as for the other in-scope accessors). Tenant-scoped.
 */
export async function setLockInDaysAtJoin(
  db: Db,
  memberId: MemberId,
  days: number,
): Promise<void> {
  await db.update(members).set({ lockInDaysAtJoin: days }).where(eq(members.memberId, memberId));
}
