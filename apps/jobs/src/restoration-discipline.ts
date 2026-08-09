// The restoration-discipline imposition job — Story 10.23 (Task 4; AC2, AC4, AC14; D3, D6).
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// ⛔ THE ONLY PRODUCTION WRITER OF RESTORATION LOCK-INS. IT REMOVES COVERAGE AUTOMATICALLY.
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every R7 verdict the §3.1 ladder has produced since Story 10.24 has been an EXPLANATION with
// nothing behind it. This job is what puts something behind it: a ladder verdict here moves a
// member's coverage. That is why AC7's disclosure and AC6's roster pin are not peripheral — they are
// what makes an automatic sanction survivable.
//
// ── ⛔ IT IS GATED, AND THE GATE DEFAULTS OFF (AC14) ─────────────────────────────────────────────
// `restoration_discipline_imposition` (Story 10.8's per-cohort substrate). Disabled — which is the
// behaviour of the ABSENT configuration, not a seeded value — this job performs its read-only scan
// exactly as before and skips the imposition step entirely.
//
// **Enabling it is Trustee-Panel-exclusive (Decision `2026-08-07-089`), through a formal
// `.decision-log.md` entry, and may not precede the decision that discharges Escalation 6's
// invariant. Flipping it without that decision is a GOVERNANCE VIOLATION, not a configuration
// change.** Operations owns *how* a flip executes, never *whether* it may occur. See the flag's
// definition site in `packages/domain/src/feature-flags/registry.ts` for the full statement.
//
// ── ⚠ WHY THE FLAG IS RESOLVED ONCE PER RUN, NOT PER MEMBER (AC14) ──────────────────────────────
// `resolveFlagAudited` is a PER-MEMBER API (it takes a `MemberFlagContext`), and `apps/jobs` has no
// existing caller to copy. Checking it inside the candidate loop would reintroduce exactly the N+1
// evaluation shape AC2/D3 reject for the imposition predicate itself, and would multiply audit-log
// volume for a decision that does not vary by member. This flag is a GLOBAL KILL SWITCH on the
// writer, not a per-member cohort decision — so it is resolved ONCE, before the scan, with a
// cohort-independent context. Per-member re-evaluation is not required and must not be added.
//
// ── ⚠ WHY THIS JOB DOES NOT RE-EVALUATE R7 ──────────────────────────────────────────────────────
// It consumes `scanR7ViolatorCandidates` — the SAME bulk evaluation the Trustee-Lite surface reads.
// "The trustee sees what is imposed and what is imposed is what the trustee sees." A second R7
// evaluation path would let the displayed flags and the imposed lock-ins diverge silently, and
// 10.24's round-2 review already found two seams drifting by omission. The scan's query budget is
// bounded and member-count-independent; this job adds no per-member READ to it (only a per-imposition
// write, on the members who actually draw one).
//
// ⛔ It must NOT live in `@twt/validity-service`: `assemblePayload` is a READ path, and writing from
// it would put a second writer on the correctness path, break as-of replay, and make every payload
// read a mutation.

import { contribution, featureFlags, ids, member, withPariwarScope, type Db } from '@twt/domain';
import { R7_REGISTRY_UNPROVISIONED_PRODUCER, scanR7ViolatorCandidates } from '@twt/validity-service';
import type pg from 'pg';

/** The AC14 rollout flag key. Registered in `FLAG_DEFAULTS` + `governance_boundary.yaml`. */
export const RESTORATION_DISCIPLINE_FLAG_KEY = 'restoration_discipline_imposition';

/**
 * ⛔ The caller default for the flag: **do not impose**.
 *
 * AC14: "Default-off must be the behaviour of the ABSENT configuration, not a value that happens to
 * be seeded off." This constant is what every degraded path lands on — no version in force, a
 * malformed cohort rule, or a lookup error — so a flag subsystem that tells us nothing results in
 * the writer doing nothing.
 */
const IMPOSITION_DISABLED = false;

/** What one run did. Reported for telemetry; the counts are what an operator checks after a flip. */
export interface RestorationDisciplineRunResult {
  readonly pariwarId: string;
  /** `false` when the AC14 flag is off — the scan still ran, nothing was written. */
  readonly writerEnabled: boolean;
  /**
   * Set when the run could not proceed; the named sentinel, never a silent skip.
   *
   * ⛔ `null` means "the run genuinely proceeded" — it must NEVER be the value on a run that could
   * not evaluate anybody. More than one gap can be true at once; see the precedence note on
   * {@link runRestorationDiscipline}.
   */
  readonly unavailable:
    | typeof R7_REGISTRY_UNPROVISIONED_PRODUCER
    | typeof CONTRIBUTION_COVERAGE_UNPROJECTED_PRODUCER
    | typeof RESTORATION_POLICY_UNPROVISIONED_PRODUCER
    | null;
  readonly membersScanned: number;
  readonly impositionsWritten: number;
  /** Refusals by reason — the AC2 predicate's own vocabulary. */
  readonly skipped: Record<string, number>;
}

export interface RestorationDisciplineDeps {
  readonly pool: pg.Pool;
  /** Injected clock — no `Date.now()` on a path that decides coverage. */
  readonly clock: () => Date;
  /** Failure alarm sink — a console stub by default (the `claim-peer-mesh.ts` precedent). */
  readonly onAlarm?: (message: string) => void;
}

/**
 * Run the restoration-discipline imposition pass for one Pariwar.
 *
 * Ordering, and why each step is where it is:
 *   1. resolve the AC14 flag ONCE (above the scan, cohort-independent);
 *   2. resolve the instrument-policy clause and the projection-coverage watermark — ⛔ either absent
 *      ⇒ DO NOT IMPOSE, report the corresponding sentinel (AC3; Decision `2026-08-09-093` clause 1);
 *   3. scan (bounded, member-count-independent) — this happens whether or not the writer is enabled,
 *      because the scan is the read-only behaviour that already exists today;
 *   4. per candidate, per applied-and-imposing clause, apply the AC2 predicate and write.
 *
 * ── ⚠ SENTINEL PRECEDENCE, AND WHY IT IS THIS ORDER ─────────────────────────────────────────────
 * Three gaps can each stop this job, and MORE THAN ONE CAN BE TRUE AT ONCE. `unavailable` reports a
 * single producer, so the order below is a deterministic, documented naming order — NOT a severity
 * ranking, and NOT a claim that the others are absent:
 *
 *   registry (no R7 clause published)  →  coverage (no projection, or `at` precedes it)  →  policy
 *   (no instrument clause)
 *
 * Coverage is named BEFORE policy deliberately. With no coverage, `deriveContributionFacts` returns
 * `null` for EVERY member, so the scan's candidate list carries no information whatsoever — naming
 * the policy gap first would send an operator to publish an instrument that still could not fire.
 * The reverse is not true: with coverage present and policy absent, the scan result is meaningful and
 * the policy is genuinely the next thing to provision. ⛔ Fixing the named gap does NOT imply the
 * others are clear — re-run and read the sentinel again.
 */
export async function runRestorationDiscipline(
  deps: RestorationDisciplineDeps,
  pariwarIdRaw: string,
): Promise<RestorationDisciplineRunResult> {
  const pariwarId = ids.pariwarId(pariwarIdRaw);
  const at = deps.clock();
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const skipped: Record<string, number> = {};
  const bump = (reason: string): void => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
  };

  return withPariwarScope(deps.pool, pariwarId, async (tx: Db, client: pg.PoolClient) => {
    // ── (1) The AC14 kill switch, resolved ONCE for the whole run ────────────────────────────────
    // Cohort-independent context: this flag gates a background process, not a member's experience,
    // so there is no per-member cohort decision to make. `IMPOSITION_DISABLED` is the caller default
    // on every degraded path.
    let writerEnabled = IMPOSITION_DISABLED;
    // ⚠ Review finding: a SQL-level failure inside `resolveFlagAudited` (e.g. its own audit-write
    // hitting a constraint) leaves Postgres with an ABORTED transaction (`25P02`) even though this
    // `catch` swallows the JS error — the VERY NEXT statement (`scanR7ViolatorCandidates`) would then
    // throw "current transaction is aborted", crashing the whole run instead of degrading to the
    // documented read-only scan. A SAVEPOINT makes the fail-closed comment below true on every path,
    // not just a plain JS throw.
    await client.query('SAVEPOINT restoration_discipline_flag');
    try {
      const decision = await featureFlags.resolveFlagAudited(
        tx,
        RESTORATION_DISCIPLINE_FLAG_KEY,
        pariwarId,
        { pariwarId: String(pariwarId) },
        at,
        IMPOSITION_DISABLED,
      );
      await client.query('RELEASE SAVEPOINT restoration_discipline_flag');
      writerEnabled = decision.enabled;
    } catch (err) {
      // ⛔ A flag-subsystem failure must never ENABLE an automatic coverage removal. Fail closed,
      // loudly enough to notice in the result, and let the read-only scan proceed unchanged.
      await client.query('ROLLBACK TO SAVEPOINT restoration_discipline_flag');
      await client.query('RELEASE SAVEPOINT restoration_discipline_flag');
      writerEnabled = IMPOSITION_DISABLED;
      alarm(
        `[jobs] restoration-discipline: flag resolution failed for Pariwar ${String(pariwarId)} — failing closed, scan proceeds read-only: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // ── (2) The instrument-policy clause — RATIFIED unprovisioned posture (AC3) ───────────────────
    // ⛔ Decision `2026-08-07-088` clause 2: on a Pariwar with no effective
    // `niy.restoration-discipline.policy` clause, DO NOT IMPOSE, and surface the gap as a NAMED
    // SENTINEL. Imposing under a code default is explicitly REJECTED — it would be coverage removal
    // under a duration and month-counting convention no Pariwar ratified, i.e. an unratified
    // sanction imposed by a machine. ⚠ Resolved BEFORE the scan for ORDERING, not to skip the scan's
    // cost — the scan below still runs unconditionally (it is the existing read-only behaviour); only
    // the imposition WRITE step is skipped when `policy === null`, at the check further down.
    const policy = await member.restorationDiscipline.resolveRestorationDisciplinePolicy(
      tx,
      pariwarId,
      at,
    );

    // ── (2b) The projection-coverage watermark — Decision `2026-08-09-093` clause 1 ────────────────
    // ⛔ Without a `contribution_projection_coverage` row, `deriveContributionFacts` returns `null`
    // for EVERY member (`producer.ts` — `if (input.coveredFrom === null) return null`), so every
    // candidate degrades to the `producer_unavailable` sentinel and NO clause can apply. The scan
    // reports that honestly per member and the Trustee-Lite surface renders `detection_unavailable`
    // — but this job's own result did not carry the distinction, so a coverage-less Pariwar returned
    // `{ unavailable: null, impositionsWritten: 0 }`: BYTE-IDENTICAL to a genuinely clean one. That
    // is the same false all-clear the scan's own comment forbids, arriving one layer up in the
    // telemetry, and after a flip this field is what an operator reads to confirm the writer did
    // nothing FOR THE RIGHT REASON.
    //
    // ⚠ This re-reads a scalar the scan also computes internally, and that duplication is
    // DELIBERATE. The alternative is widening `R7ViolatorScan` — a contract shared with the
    // read-only Trustee-Lite consumer — to carry a diagnostic only this writer needs. One extra
    // single-row scalar read per Pariwar per run is the cheaper side of that trade
    // (`readContributionProjectionContext` is ONE statement, two scalars).
    const projection = await contribution.readContributionProjectionContext(tx, pariwarId, at);

    const scan = await scanR7ViolatorCandidates(tx, pariwarId, at);
    if (scan.status === 'unavailable') {
      // The R7 REGISTRY is unprovisioned — a different gap from the instrument policy's, and it
      // already has its own named producer. Reported, never treated as "nobody is in breach".
      // ⚠ `scan.producer` is read back rather than assigned here because `R7ViolatorScan`'s
      // `producer` field is a plain `string` (a shared contract with the Trustee-Lite consumer);
      // the imported constant is what actually pins the value to the literal union below.
      return {
        pariwarId: String(pariwarId),
        writerEnabled,
        unavailable: R7_REGISTRY_UNPROVISIONED_PRODUCER,
        membersScanned: 0,
        impositionsWritten: 0,
        skipped,
      };
    }

    // ⛔ Review finding: mirrors `deriveContributionFacts`'s own guard (`producer.ts:508-509`),
    // which treats BOTH `coveredFrom === null` and `at < coveredFrom` as "unavailable". Checking
    // only the former left the latter's false all-clear open — the exact gap Decision
    // `2026-08-09-093` clause 1 required this sentinel to close.
    if (projection.coveredFrom === null || at.getTime() < projection.coveredFrom.getTime()) {
      // The FACT side is unprojected (or `at` precedes the watermark) — a different gap from either
      // registry gap, with a different owner and a different fix (run/backfill the projection, or
      // wait for `at` to reach `coveredFrom`; do NOT publish a clause).
      // `membersScanned` is reported honestly: that many members were enumerated, and NONE of them
      // was derivable. The non-null `unavailable` is what makes the pair unambiguous.
      return {
        pariwarId: String(pariwarId),
        writerEnabled,
        unavailable: CONTRIBUTION_COVERAGE_UNPROJECTED_PRODUCER,
        membersScanned: scan.candidates.length,
        impositionsWritten: 0,
        skipped,
      };
    }

    if (policy === null) {
      return {
        pariwarId: String(pariwarId),
        writerEnabled,
        unavailable: RESTORATION_POLICY_UNPROVISIONED_PRODUCER,
        membersScanned: scan.candidates.length,
        impositionsWritten: 0,
        skipped,
      };
    }

    if (!writerEnabled) {
      // The read-only behaviour that exists today, unchanged. Nothing is written.
      return {
        pariwarId: String(pariwarId),
        writerEnabled,
        unavailable: null,
        membersScanned: scan.candidates.length,
        impositionsWritten: 0,
        skipped,
      };
    }

    let impositionsWritten = 0;
    for (const candidate of scan.candidates) {
      for (const clause of candidate.impositionInputs.imposingClauses) {
        // ⚠ D3 — the trigger is `imposesRestorationObligation` (already applied by the scan) AND
        // `lock_in_months > 0`, checked inside `shouldImpose`. The second half is NOT optional:
        // R7(A) imposes a restoration obligation (`consecutive_required: 3`) while prescribing NO
        // lock-in (`lock_in_months: 0`), so the predicate alone would give every R7(A) member a
        // spurious zero-length lock-in. There is no clause-id branch anywhere on this path.
        //
        // ⛔ Review finding: this Pariwar-wide loop runs inside ONE scope transaction (below AC2's
        // per-write atomicity, which is preserved — the event append and the record insert for ONE
        // imposition still commit together or not at all). Without per-candidate isolation, a single
        // failure — a registry data mistake, or a concurrent invocation racing the same member's
        // `events_log (stream_id, event_version)` unique index (`MemberStreamConcurrencyError`) —
        // would abort the WHOLE transaction and roll back every OTHER member's already-decided,
        // legitimate imposition in this run. A `SAVEPOINT` per candidate isolates that failure to
        // the ONE row it belongs to, matching this codebase's established 23505-savepoint-recovery
        // convention (`claim-peer-mesh.ts`'s `peer_mesh_pinged` savepoint;
        // [[project_domain_limit_clamp_and_savepoint_retry]]).
        await client.query('SAVEPOINT restoration_discipline_impose');
        try {
          const result = await member.restorationDiscipline.imposeRestorationLockIn(
            // The scope tx's OWN client — the writer runs in the CALLER's transaction and never opens
            // its own (the `moderateMember` contract), so the event append and the record insert
            // commit together or not at all.
            client,
            {
              memberId: ids.memberId(candidate.memberId),
              pariwarId,
              clauseId: clause.clauseId,
              clausePayload: clause.payload,
              clauseVersionId: ids.clauseVersionId(clause.clauseVersionId),
              policyClauseVersionId: policy.policyClauseVersionId,
              concurrencyRule: policy.concurrencyRule,
              episodeAnchor: candidate.impositionInputs.episodeAnchor,
              now: at,
            },
          );
          await client.query('RELEASE SAVEPOINT restoration_discipline_impose');
          if (result.decision.impose) impositionsWritten += 1;
          else bump(result.decision.reason);
        } catch (err) {
          await client.query('ROLLBACK TO SAVEPOINT restoration_discipline_impose');
          await client.query('RELEASE SAVEPOINT restoration_discipline_impose');
          bump('write-failed');
          alarm(
            `[jobs] restoration-discipline: imposition write failed for member ${candidate.memberId} / clause ${clause.clauseId} — isolated to this candidate, run continues: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    return {
      pariwarId: String(pariwarId),
      writerEnabled,
      unavailable: null,
      membersScanned: scan.candidates.length,
      impositionsWritten,
      skipped,
    };
  });
}

/**
 * The named sentinel for a Pariwar with no effective `niy.restoration-discipline.policy` clause
 * (AC3) — following `R7_REGISTRY_UNPROVISIONED_PRODUCER`'s convention.
 *
 * ⚠ Deliberately DISTINCT from the R7 registry's sentinel. They are different gaps with different
 * fixes: one means "the ladder was never published for this Pariwar", the other means "the
 * INSTRUMENT was never published". Collapsing them would send an operator to provision the wrong
 * clause — the same reasoning that made `R7_REGISTRY_UNPROVISIONED_PRODUCER` not be `'story-10-24'`.
 */
export const RESTORATION_POLICY_UNPROVISIONED_PRODUCER = 'niyamavali-registry:restoration-discipline-policy';

/**
 * The named sentinel for a Pariwar whose contribution projection has never been built — the THIRD
 * such producer, required by Decision `2026-08-09-093` clause 1 as a PRECONDITION of the AC14 flip.
 *
 * ⚠ Deliberately NOT a `niyamavali-registry:` producer, unlike the two above. Those two mean "an
 * instrument was never PUBLISHED" and are discharged by a governance act — publishing a clause. This
 * one means "the FACTS were never PROJECTED" and is discharged by an operational act
 * (`backfillContributionProjections`). Collapsing it into a registry sentinel — or, worse, leaving it
 * unnamed so the run reports `unavailable: null` — sends an operator to publish a clause that would
 * still fire on nothing, which is precisely the wrong-instrument failure the other two were kept
 * distinct to prevent.
 *
 * ⛔ Its absence is why a coverage-less Pariwar was indistinguishable from a clean one at the job
 * level. It is diagnostic ONLY: it names a gap, and it neither imposes nor suppresses anything.
 */
export const CONTRIBUTION_COVERAGE_UNPROJECTED_PRODUCER = 'contribution-projection:coverage';
