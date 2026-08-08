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

import {
  assemblePayload,
  CONTRIBUTION_R7_REGISTRY_UNAVAILABLE,
  projectLockInStatus,
  projectRetirementCoverage,
} from './payload.js';
import { memberFactsToBag } from './member-facts.js';
import {
  contributionFactsToBag,
  contributionFactsToSummary,
  deriveRetirementFacts,
  produceContributionFacts,
  produceMedicalDisclosureFlags,
  retirementFactsToBag,
  type ConcealmentAssessment,
  type LapseNettingPolicy,
} from './producer.js';
import { assertCanReadValidity, redactForCaller, type ValidityCaller } from './redaction.js';
import { buildRuleDescriptors, evaluateAppliedR7ClauseSlots, evaluateOrderedClauses } from './rules.js';
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

  // (1) Nine independent reads — none depends on another's result — run concurrently (p95 budget).
  const [
    memberState,
    moderationOverlay,
    restorationDiscipline,
    signupAt,
    retiredAt,
    lockInClock,
    renewal,
    medicalDisclosureFlags,
    contributionFacts,
  ] = await Promise.all([
      // Member lifecycle state at the pinned instant (the is_valid/is_active + grace authority).
      member.getMemberStateAt(db, memberCtx.memberId, at),
      // Story 10.10 — the moderation OVERLAY at the SAME pinned instant. Resolved right alongside
      // the lifecycle state because `is_valid` is now a composition of BOTH: reading them at two
      // different moments could produce a payload claiming a member is valid at an instant when
      // they were suspended. This is Decision 8's entire enforcement surface.
      member.moderation.getMemberModerationOverlay(db, memberCtx.memberId, at),
      // Story 10.23 — the RESTORATION-DISCIPLINE overlay at the SAME pinned instant, for exactly the
      // reason the moderation overlay is read here: `is_valid` is now a composition of THREE things,
      // and resolving them at different moments could produce a payload claiming a member is covered
      // at an instant when their §3.1 lock-in was in force. ⚠ The BOUNDED (`at`-aware) reader is the
      // right one here — this is the replay-correct read path; the UNBOUNDED variant exists only for
      // the write path's legality check, which must see the present.
      member.restorationDiscipline.getMemberRestorationDiscipline(db, memberCtx.memberId, at),
      // Tenure/retirement anchors (Task 2) — read ONCE so the R12 fact derivation AND the coverage
      // date projection share the same `retiredAt`.
      member.getMemberSignupInstantAt(db, memberCtx.memberId, at),
      member.getMemberRetirementAnchorAt(db, memberCtx.pariwarId, memberCtx.memberId, at),
      // The genuinely-producible sub-objects (all as-of `at`).
      member.getLockInClock(db, memberCtx.memberId, at),
      member.getVyawasthaShulkStatus(db, memberCtx.pariwarId, memberCtx.memberId, at),
      produceMedicalDisclosureFlags(db, memberCtx, at, opts.concealmentAssessment),
      // Story 10.24 — the contribution facts, produced at the SAME pinned instant as every other read
      // (joined to this `Promise.all` rather than added as a sequential await, so the family costs two
      // concurrent aggregate queries rather than two more round-trips on the critical path).
      produceContributionFacts(db, memberCtx, at),
    ]);

  const retirementFacts = deriveRetirementFacts({
    signupAt,
    retiredAt,
    evaluatedAt: at,
    lapseNetting: opts.lapseNetting,
  });

  // (2) Ordered multi-clause evaluation at the pinned instant (AC2 deterministic order).
  //
  // Story 10.24 D2: the R7 family does NOT ride `buildRuleDescriptors`. It is evaluated through the
  // family ladder and contributes ONLY APPLIED clauses, because `assembleClauses` pushes every non-null
  // slot and `deriveViolatorFlags` flags every R7 id it finds — wiring the four as ordinary descriptors
  // would flag EVERY member in the Pariwar four times on the surface that feeds suspension decisions.
  //
  // Order is `VALIDITY_RULE_ORDER`: R12 first, then the R7 family in clause-id ascending order (the
  // ladder sorts). The concatenation below IS that order — never `Promise.all` completion order.
  //
  // ── Story 10.23 (AC8) — the `member.*` fact family joins the R7 bag ─────────────────────────────
  // `member.joining_discipline_state` is a PROJECTION of `lockInStatus.state`, injected here where
  // the payload is assembled (`epics.md:3888`: "sourced from the validity payload, never computed
  // inside the rule engine"). ⚠ NO engine change, NO ladder change, NO `interpretClause` change —
  // all three are frozen behind the 100×-thread determinism P0 gate.
  //
  // ⛔ SUPPLYING IT ACTIVATES NOTHING. R7(A)/(B) are the only clauses that name this key and BOTH
  // remain HELD — on the Trustee Panel's unpublished Part 11 amendment, which no producer and no
  // story can supply (`R7_HELD_CLAUSES`; `prd.md:346`). The bag is merged so the fact is honestly
  // available to the ladder; the ladder simply has no activated clause that reads it.
  const lockInStatusPayload = projectLockInStatus(lockInClock, at);
  const contributionBag = contributionFacts
    ? { ...contributionFactsToBag(contributionFacts), ...memberFactsToBag(lockInStatusPayload) }
    : null;
  const descriptors = buildRuleDescriptors({
    retirement: retirementFacts ? retirementFactsToBag(retirementFacts) : null,
    contribution: contributionBag,
  });
  const [orderedSlots, r7Evaluation] = await Promise.all([
    evaluateOrderedClauses(deps, memberCtx, descriptors, at),
    evaluateAppliedR7ClauseSlots(deps, memberCtx, contributionBag, at),
  ]);
  const slots = [...orderedSlots, ...r7Evaluation.slots];

  // (3) Retirement date projection ([[CR-4.5-D3]]) from the R12 slot.
  const r12Slot = slots.find((s) => String(s.clauseId) === R12_CLAUSE_ID);
  const retirementCoverage = projectRetirementCoverage(r12Slot?.result ?? null, retiredAt, at);

  // (4) Assemble the FULL, redaction-free canonical payload + stamp the replay-stable hash (pure).
  const full = assemblePayload({
    memberId: memberCtx.memberId,
    evaluatedAt: at,
    memberState,
    moderationOverlay,
    // Story 10.23 — the SECOND governance overlay, resolved at the same instant as the first.
    restorationDiscipline,
    lockInStatus: lockInStatusPayload,
    vyawasthaShulkStatus: toRenewalPayload(renewal),
    medicalDisclosureFlags,
    retirementCoverage,
    // The produced `ok` arm, or ABSENT so `assemblePayload` falls back to the honest sentinel (D6).
    // NEVER a fabricated `{ total_count: 0 }` — zero and unknown are different claims.
    //
    // `registryUnavailable` (2026-08-06 finding) OVERRIDES the `ok` arm even though the FACTS were
    // derivable: when no activated R7 clause version is provisioned for this Pariwar, the family was
    // never evaluated at all, so an `ok` summary + zero R7 entries in `applicableNiyamavaliClauses[]`
    // is indistinguishable from a genuinely clean member — the exact false all-clear the bulk
    // Trustee-Lite scan already guards against (`r7-candidate-scan.ts`'s `resolvedClauses.length === 0`
    // check). This is the individual-lookup analogue of that same guard.
    //
    // Story 10.25 — the summary now also carries `restorationPackage`, measured against the LADDER'S
    // PICK (`r7Evaluation.restoration`), not against R7(A). A member whose applied clause is R7(C) is
    // serving a 5-consecutive package; showing them progress toward R7(A)'s 3 would overstate how far
    // along they are, on the surface that asks them for money without coverage.
    ...(r7Evaluation.registryUnavailable
      ? { contributionHistory: CONTRIBUTION_R7_REGISTRY_UNAVAILABLE }
      : contributionFacts
        ? {
            contributionHistory: contributionFactsToSummary(
              contributionFacts,
              r7Evaluation.restoration,
            ),
          }
        : {}),
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
