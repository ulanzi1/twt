// The Member Validity Service — Story 4.6 (Tasks 3 + 4; AC1, AC2, AC3).
//
// `getValidity(memberId)` + `getValidityAt(memberId, timestamp)` return the canonical FR-12A payload
// deterministically, idempotently, with rule-by-rule provenance. This is the framework-agnostic
// composition (D1-A: `@twt/validity-service`) every surface shares — apps/admin, apps/mobile,
// apps/jobs, Epic 6/10 — so the redaction + audit contract lives HERE, not per-app (D5).
//
// ── ONE pinned instant across all clauses (closes deferred-work W6) ───────────────────────────────
// `getValidityAt` resolves NOTHING from a clock — the caller-supplied instant threads through every
// producer derivation + every `evaluateAt`-family engine call, so all clauses share one
// `rule_registry_version` + consistent provenance. `getValidity` resolves DB `now()` ONCE (the engine's
// `selectDbNow`) and delegates — the ONLY clock read in the whole service.
//
// ── Idempotent (AC1) ──────────────────────────────────────────────────────────────────────────────
// Identical `(member_id, rule_registry_version, member_state_hash, pinned_instant)` → a byte-identical
// payload. The per-clause engine memo (Story 4.1 keyedStore) dedupes each clause eval; the payload is a
// PURE function of the ordered clause results + the deterministic producer derivations at the pinned
// instant. NO second persistent cache here — the materialized-view / per-cohort cache is Story 4.8.

import { audit, member, type ids } from '@twt/domain';
import { R12_CLAUSE_ID, selectDbNow, type EvaluateDeps } from '@twt/niyamavali-engine';

import { assemblePayload, projectLockInStatus, projectRetirementCoverage } from './payload.js';
import {
  deriveRetirementFacts,
  produceMedicalDisclosureFlags,
  retirementFactsToBag,
  type ConcealmentAssessment,
  type LapseNettingPolicy,
} from './producer.js';
import { assertCanReadValidity, redactForCaller, type ValidityCaller } from './redaction.js';
import { buildRuleDescriptors, evaluateOrderedClauses } from './rules.js';
import type { MemberValidityPayload, VyawasthaShulkStatusPayload } from './types.js';

/** Service dependencies = the engine DI (db, keyedStore, servicePool, actor, traceId). */
export type ValidityServiceDeps = EvaluateDeps;

/** Tunable service options — the lapse-netting policy + the (decryption-capable) concealment seam. */
export interface ValidityServiceOptions {
  /** Lapse-netting policy for `valid_membership_years` (default `gross`; [[CR-4.5-D2]]). */
  lapseNetting?: LapseNettingPolicy;
  /** A COMPLETED member-standing concealment assessment (D2m-A); absent → no member-standing flag. */
  concealmentAssessment?: ConcealmentAssessment;
  /**
   * The caller context (grants + resource locator + self flag). When PRESENT: read access is enforced
   * (AC1), the payload is redacted for the caller (D5), and admin calls are audited (self-calls are
   * NOT — PRD FR-12A).
   */
  caller?: ValidityCaller;
  /**
   * Explicit marker for a genuinely trusted internal/system call (e.g. the Story 4.8 cache warmer) that
   * intentionally receives the FULL, unredacted, unaudited payload. Set this to `true` — simply omitting
   * `caller` is NOT sufficient (a future admin surface that forgets to pass `caller` fails loudly instead
   * of silently getting unaudited full access).
   */
  internal?: true;
}

/**
 * Replay-correct historical validity at a FIXED instant (AC1 `getValidityAt`). Every read + every
 * clause evaluation is pinned to `at`, so the result is reproducible for a historical evaluation.
 */
export async function getValidityAt(
  deps: ValidityServiceDeps,
  memberCtx: { pariwarId: ids.PariwarId; memberId: ids.MemberId },
  at: Date,
  opts: ValidityServiceOptions = {},
): Promise<MemberValidityPayload> {
  // (0) Every call must be an explicit caller (RBAC-checked) or an explicit internal marker — never
  //     the silent absence of both (a future caller that forgets `opts.caller` fails loudly instead of
  //     silently getting the full unredacted, unaudited payload).
  if (!opts.caller && !opts.internal) {
    throw new Error(
      '[getValidityAt] opts.caller or opts.internal must be supplied — pass { internal: true } for a genuine trusted internal/system call (e.g. the Story 4.8 cache warmer).',
    );
  }
  // Scope-respecting READ access (AC1). A self-call is allowed; a non-self caller must hold
  // member.view_validity at a covering scope (fail-closed throw on deny).
  if (opts.caller) assertCanReadValidity(opts.caller);

  const { db } = deps;

  // (1) Six independent reads — none depends on another's result — run concurrently (p95 budget).
  const [memberState, signupAt, retiredAt, lockInClock, renewal, medicalDisclosureFlags] =
    await Promise.all([
      // Member lifecycle state at the pinned instant (the is_valid/is_active + grace authority).
      member.getMemberStateAt(db, memberCtx.memberId, at),
      // Tenure/retirement anchors (Task 2) — read ONCE so the R12 fact derivation AND the coverage
      // date projection share the same `retiredAt`.
      member.getMemberSignupInstantAt(db, memberCtx.memberId, at),
      member.getMemberRetirementAnchorAt(db, memberCtx.pariwarId, memberCtx.memberId, at),
      // The genuinely-producible sub-objects (all as-of `at`).
      member.getLockInClock(db, memberCtx.memberId, at),
      member.getVyawasthaShulkStatus(db, memberCtx.pariwarId, memberCtx.memberId, at),
      produceMedicalDisclosureFlags(db, memberCtx, at, opts.concealmentAssessment),
    ]);

  const retirementFacts = deriveRetirementFacts({
    signupAt,
    retiredAt,
    evaluatedAt: at,
    lapseNetting: opts.lapseNetting,
  });

  // (2) Ordered multi-clause evaluation at the pinned instant (AC2 deterministic order).
  const descriptors = buildRuleDescriptors({
    retirement: retirementFacts ? retirementFactsToBag(retirementFacts) : null,
  });
  const slots = await evaluateOrderedClauses(deps, memberCtx, descriptors, at);

  // (3) Retirement date projection ([[CR-4.5-D3]]) from the R12 slot.
  const r12Slot = slots.find((s) => String(s.clauseId) === R12_CLAUSE_ID);
  const retirementCoverage = projectRetirementCoverage(r12Slot?.result ?? null, retiredAt, at);

  // (4) Assemble the FULL, redaction-free canonical payload + stamp the replay-stable hash (pure).
  const full = assemblePayload({
    memberId: memberCtx.memberId,
    evaluatedAt: at,
    memberState,
    lockInStatus: projectLockInStatus(lockInClock, at),
    vyawasthaShulkStatus: toRenewalPayload(renewal),
    medicalDisclosureFlags,
    retirementCoverage,
    slots,
  });

  // (5) Audit ADMIN calls only (PRD FR-12A — self-calls not logged). Digest = validity_payload_hash.
  if (opts.caller && !opts.caller.isSelf) {
    await auditValidityRead(deps, memberCtx, full, opts.caller);
  }

  // (6) Redact for the caller (D5). Internal call (no caller) → full unredacted payload.
  return opts.caller ? redactForCaller(full, opts.caller) : full;
}

/**
 * Live validity (AC1 `getValidity`). Resolves DB-authoritative `now()` ONCE (the engine's `selectDbNow`)
 * and delegates to `getValidityAt` with that single pinned instant — the only clock read in the service.
 */
export async function getValidity(
  deps: ValidityServiceDeps,
  memberCtx: { pariwarId: ids.PariwarId; memberId: ids.MemberId },
  opts: ValidityServiceOptions = {},
): Promise<MemberValidityPayload> {
  const now = await selectDbNow(deps.db);
  return getValidityAt(deps, memberCtx, now, opts);
}

/** Map the domain renewal status (camelCase, Dates) to the payload sub-object (ISO strings). */
function toRenewalPayload(r: member.VyawasthaShulkRenewalStatus): VyawasthaShulkStatusPayload {
  return {
    paidThrough: r.paidThrough ? r.paidThrough.toISOString() : null,
    daysUntilLapse: r.daysUntilGraceEnds,
    inRenewalGrace: r.inRenewalGrace,
    graceRemainingDays: r.graceRemainingDays,
  };
}

/**
 * Write the ONE service-level `validity.evaluate` audit line for an admin call (Story 1.10 writer,
 * BYPASSRLS service pool). The recorded digest is `outcome_digest = validity_payload_hash` directly
 * (PRD FR-12A / Task 4) — the auditor can recover/correlate the exact payload from the audit row without
 * recomputing anything. NOTE: the engine's per-clause `rule.evaluate` compute-audit is a separate,
 * lower-level invariant (audit-on-compute; audit.ts) that fires on cache-miss regardless of caller —
 * this line is the service-level access record.
 */
export async function auditValidityRead(
  deps: ValidityServiceDeps,
  memberCtx: { pariwarId: ids.PariwarId; memberId: ids.MemberId },
  payload: MemberValidityPayload,
  caller: ValidityCaller,
): Promise<void> {
  await audit.writeAuditEntry(deps.servicePool, {
    pariwarId: memberCtx.pariwarId,
    actorId: caller.actorId,
    actorRole: deps.actor?.role ?? null,
    action: 'validity.evaluate',
    resourceLocator: `member/${memberCtx.memberId}`,
    requestPayloadHash: payload.validityPayloadHash,
    responseStatus: 200,
    traceId: deps.traceId ?? null,
  });
}
