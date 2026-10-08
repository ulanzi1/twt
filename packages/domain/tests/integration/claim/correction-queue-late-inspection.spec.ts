// Story 6.26b (Task 4.0; AC8; GI7 + `-284` E1, `-288` K3, `-290` M2; RD1, RD2, RD25, RD26; Trap 10) — the District
// Admin's correction queue lists a claim whose inspection completed AFTER their approval, in SEPARATE COMMITTED
// TRANSACTIONS.
//
// ⚠⚠ WHY OWN-COMMITTING (BigDev, v2.1): inside one BEGIN/ROLLBACK every `now()` is the transaction START, so an approval
// (`decided_at` = its transaction-start `now()`) and a completion (`completed_at` = `clock_timestamp()` at its UPDATE)
// are ordered by CONSTRUCTION — a single-transaction ordering test passes or fails whatever the code does. Every step
// below runs on its own pooled connection, `BEGIN` → role + scope → work → `COMMIT` (the
// `ground-inspection-concurrency.spec.ts` pattern), under a FRESH random Pariwar per test (the queue is Pariwar-scoped and
// pages at 50 — a shared tenant would mix suites).
//
// ⚠ RD25 — a claim that is a candidate but has ⛔ no uncovered key is DROPPED on the queue's normal path, so "⛔ not a
// candidate" is asserted on the FAULT path (the late-arm read forced to fail ⇒ every candidate lists as "may wait"),
// with a CONTROL candidate in the same Pariwar so the fault demonstrably fired (`told === 1`).
//
// The legs: (a) inspected THEN approved ⇒ ⛔ candidate; (b) approved THEN a differing date / a `does_not_match` ⇒ listed
// and the final vote waits; (c) leg (b) on an R9-routed claim in `state_trustee_approved` ⇒ listed, and ⛔ listed once
// its routing row is superseded (RD26); (d) THE RACE `-288` K3 exists for — a completion whose transaction BEGAN before
// the approval committed; (e) `-290` M2 — a refile relying on an inherited visit, whose SOURCE gains a differing visit
// after the refile's approval. ⚠ AMENDED by Story 6.24a (F8 — re-derived for its PURPOSE, ⛔ never weakened): the source
// was REVERSED on appeal; under `2026-10-07-292` RF6 a reversal now CLOSES the refile and under RF8 a reversed refusal is
// ⛔ no source — so the source's refusal now STANDS with its appeal UPHELD at stage 3 (the REAL writers). (f) NEW — the
// reversal itself ⇒ the refile is `closed` and leaves the queue.
//
// Cleanup: every row of this suite's Pariwars, table by table, in replica mode (append-only triggers and RI cascades
// off) — fixture cleanup ONLY.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { addCalendarDays, istDateOf } from '../../../src/cycle-calendar/holiday-resolver.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import {
  LateWarningReasonRequiredError,
  addGroundInspectionPhoto,
  adjudicateClaim,
  castAppealVote,
  decideAppealStage3,
  finalizeAppealOutcome,
  openAppealPanel,
  completeGroundInspection,
  initiateAppeal,
  listClaimsUnderCorrection,
  prepareAppealCiphertext,
  reviewAppealStage1,
  routeToR9,
  scheduleGroundInspection,
  versionStandsAt,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, PariwarId } from '../../../src/ids/index.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import {
  currentUploadIdOf,
  driveClaimTo,
  fixtureDeathDateIndex,
  fixtureInspectionDeathDateCiphertext,
  seedAcceptedDeathCertificate,
  seedClauseVersion,
  seedGroundInspection,
  seedNomineeDeclaration,
  seedNomineeDetermination,
  seedNomineeNameCheck,
  seedRoleGrant,
} from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const DA = 'd3d3d3d3-0000-4000-8000-000000000001';
const PA = 'a3a3a3a3-0000-4000-8000-000000000002';
const REVIEWER = 'e3e3e3e3-0000-4000-8000-000000000005';
const INSPECTOR = '93939393-0000-4000-8000-000000000099';
const R9_CLAUSE = 'niy.special-death.r9';
const GENERIC = 'warnings_reviewed';
const DAY = 86_400_000;
const istDaysAgo = (n: number) => addCalendarDays(istDateOf(new Date()), -n);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe.skipIf(!hasDatabase)('Story 6.26b — the queue lists a claim inspected AFTER its approval (own-committing)', () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    if (pariwars.length > 0) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        // Replica mode disables triggers — the append-only ones AND the RI cascades — for fixture cleanup ONLY.
        await c.query("SET LOCAL session_replication_role = 'replica'");
        const { rows } = await c.query<{ table_name: string }>(
          `SELECT c.table_name FROM information_schema.columns c
             JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE c.table_schema = 'public' AND c.column_name = 'pariwar_id' AND t.table_type = 'BASE TABLE'`,
        );
        for (const { table_name } of rows) {
          await c.query(`DELETE FROM "${table_name}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        }
        await c.query(`DELETE FROM idempotency_keys WHERE ${pariwars.map((_, i) => `key LIKE '%' || $${i + 1} || '%'`).join(' OR ')}`, pariwars);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[correction-queue-late-inspection.spec] cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    await pool.end();
  });

  function freshPariwar(): PariwarId {
    const pid = toPariwarId(randomUUID());
    pariwars.push(pid);
    return pid;
  }

  /** `fn` on its own pooled connection, in its OWN committed transaction as `twt_app` under `pid`. */
  async function onOwnTx<T>(pid: PariwarId, fn: (client: pg.PoolClient) => Promise<T>, superuser = false): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (!superuser) {
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, pid);
      }
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** tx1 — a fully approvable claim in `verifier_review` (the default fixtures, incl. a COMPLETED visit whose family date
   *  equals the accepted date), COMMITTED. */
  async function approvableClaim(pid: PariwarId, opts: { inspection?: 'skip' } = {}): Promise<ClaimId> {
    const cid = toClaimId(randomUUID());
    await onOwnTx(pid, async (c) => {
      await driveClaimTo(c, pid, cid, randomUUID(), 'verifier_review');
      await seedNomineeNameCheck(c, pid, cid, opts.inspection ? { inspection: opts.inspection } : {});
    });
    return cid;
  }

  const approve = (pid: PariwarId, cid: ClaimId, warningReasonCode: string | null = null) =>
    onOwnTx(pid, (c) =>
      adjudicateClaim(c, {
        claimCaseId: cid, pariwarId: pid, outcome: 'approved', reasonCode: 'r5_d_natural_death', rationaleCiphertext: 'enc:v1:why',
        warningReasonCode, actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
      }),
    );

  /** A completed assignment, COMMITTED: a differing family date (default 3 days ago), or — with `verdict` alone — a
   *  `does_not_match` whose family date EQUALS the accepted date (the fixture's default ⇒ ONE key). */
  const completeLate = (pid: PariwarId, cid: ClaimId, opts: { deathDate?: string; verdict?: 'does_not_match' }) =>
    onOwnTx(pid, (c) =>
      seedGroundInspection(c, pid, cid, {
        force: true,
        ...(opts.verdict ? { verdict: opts.verdict } : { deathDate: opts.deathDate ?? istDaysAgo(3) }),
      }),
    );

  const list = (pid: PariwarId) => onOwnTx(pid, (c) => listClaimsUnderCorrection(bindScopedDb(c), pid));

  /** RD25 — the queue on its FAULT path: the late-arm statement (the one carrying `discarded_member_version_ids`) gets
   *  every UUID parameter corrupted, so it fails at execution; every CANDIDATE then lists as "may wait". */
  async function listOnFault(pid: PariwarId) {
    let told = 0;
    const rows = await onOwnTx(pid, async (c) => {
      const realQuery = c.query.bind(c) as (...a: unknown[]) => unknown;
      const textOf = (q: unknown) => (typeof q === 'string' ? q : ((q as { text?: string })?.text ?? ''));
      c.query = ((...a: unknown[]) => {
        if (!textOf(a[0]).includes('discarded_member_version_ids')) return realQuery(...a);
        const params = Array.isArray(a[1]) ? a[1].map((v) => (typeof v === 'string' && UUID_RE.test(v) ? 'not-a-uuid' : v)) : a[1];
        return realQuery(a[0], params);
      }) as never;
      try {
        return await listClaimsUnderCorrection(bindScopedDb(c), pid, { onLateWarningsUnavailable: () => (told += 1) });
      } finally {
        c.query = realQuery as never;
      }
    });
    return { rows, told };
  }

  /** The final vote WAITS (`LateWarningReasonRequiredError`) — run in its own transaction, rolled back. */
  async function finalVoteWaits(pid: PariwarId, cid: ClaimId): Promise<void> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(c, pid);
      await expect(
        voteOnFrozenClaim(c, {
          claimCaseId: cid, pariwarId: pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: 'enc:v1:final-why',
          warningReasonCode: GENERIC, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
        }),
      ).rejects.toBeInstanceOf(LateWarningReasonRequiredError);
    } finally {
      await c.query('ROLLBACK').catch(() => undefined);
      c.release();
    }
  }

  it('(a) inspected, COMMITTED, THEN approved, COMMITTED ⇒ ⛔ a late-warning candidate (asserted on the FAULT path, with a control that IS one)', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const before = await approvableClaim(pid);
    await approve(pid, before);
    // The CONTROL — approved, THEN a differing completion ⇒ a candidate, so the late-arm statement runs and faults.
    const control = await approvableClaim(pid);
    await approve(pid, control);
    await completeLate(pid, control, {});

    const { rows, told } = await listOnFault(pid);
    expect(told).toBe(1);
    expect(rows.map((r) => r.claimCaseId)).toEqual([control]);
    expect(rows[0]).toMatchObject({ lateWarningAwaitingReason: true, lateWarningUncoveredCount: null });
    // The normal path agrees.
    expect((await list(pid)).map((r) => r.claimCaseId)).toEqual([control]);
  });

  it('(b) approved, COMMITTED, THEN a differing family date / a `does_not_match` verdict, COMMITTED ⇒ listed, and the final vote waits', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const dated = await approvableClaim(pid);
    await approve(pid, dated);
    await completeLate(pid, dated, { deathDate: istDaysAgo(3) });
    const verdict = await approvableClaim(pid);
    await approve(pid, verdict);
    await completeLate(pid, verdict, { verdict: 'does_not_match' });

    const rows = await list(pid);
    expect(rows.map((r) => r.claimCaseId).sort()).toEqual([dated, verdict].sort());
    for (const r of rows) {
      expect(r).toMatchObject({ currentState: 'verifier_approved', lateWarningAwaitingReason: true, lateWarningUncoveredCount: 1, returnedAt: null, sentBackByCheck: false });
    }
    await finalVoteWaits(pid, dated);
    await finalVoteWaits(pid, verdict);
  });

  it('(c) `-284` E1 — leg (b) on an R9-routed claim in `state_trustee_approved` ⇒ listed; ⛔ listed once its routing row is superseded (RD26)', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    await onOwnTx(pid, async (c) => {
      const tx = bindScopedDb(c);
      await seedClauseVersion(tx, pid, {
        clauseId: R9_CLAUSE,
        payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
      });
      await seedRoleGrant(tx, pid, { userId: PA, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pid });
    }, true);
    const cid = await approvableClaim(pid);
    await approve(pid, cid);
    await onOwnTx(pid, (c) =>
      voteOnFrozenClaim(c, {
        claimCaseId: cid, pariwarId: pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: null,
        actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      }),
    );
    await onOwnTx(pid, (c) =>
      routeToR9(c, {
        claimCaseId: cid, pariwarId: pid, reasonCode: 'r9_special_case', rationaleCiphertext: null,
        actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      }),
    );
    await completeLate(pid, cid, { deathDate: istDaysAgo(3) }); // `-283` A1 — writable there while R9-routed

    const rows = await list(pid);
    expect(rows.map((r) => r.claimCaseId)).toEqual([cid]);
    expect(rows[0]).toMatchObject({ currentState: 'state_trustee_approved', lateWarningAwaitingReason: true, lateWarningUncoveredCount: 1 });

    // RD26 — only finalize supersedes a routing row with real writers, and neither of its outcomes leaves the claim here
    // with the row gone ⇒ a DIRECT supersession, the claim still in `state_trustee_approved`.
    await onOwnTx(pid, (c) =>
      c.query(
        `UPDATE claim_state_trustee_decisions SET superseded_at = now()
          WHERE claim_case_id = $1 AND phase = 'routing' AND superseded_at IS NULL`,
        [cid],
      ), true);
    const after = await list(pid);
    expect(after).toEqual([]);
    const [{ current_state }] = (await pool.query<{ current_state: string }>('SELECT current_state FROM claims WHERE claim_case_id = $1', [cid])).rows as [{ current_state: string }];
    expect(current_state).toBe('state_trustee_approved');
  });

  it('(d) ⭐ THE RACE `-288` K3 exists for — a completion whose transaction BEGAN before the approval committed is still "after" it', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const cid = await approvableClaim(pid);
    // A SECOND assignment, scheduled and its original photographed against the current upload — committed beforehand.
    const gid = await onOwnTx(pid, async (c) => {
      const uploadId = (await currentUploadIdOf(c, pid, cid))!;
      const { groundInspection } = await scheduleGroundInspection(c, {
        claimCaseId: cid, pariwarId: pid, district: 'Patna', inspectionStage: 'initial', inspectionSiteType: 'family_residence',
        inspectorActorId: INSPECTOR, scheduledAt: new Date(), scheduledByActor: INSPECTOR, idempotencyKey: randomUUID(),
      });
      await addGroundInspectionPhoto(c, {
        pariwarId: pid, groundInspectionId: groundInspection.groundInspectionId, actingActorId: INSPECTOR,
        storageObjectKey: `fixture/race/${groundInspection.groundInspectionId}.jpg`, contentType: 'image/jpeg', byteSize: 100,
        photoKind: 'original_certificate', comparedCertificateUploadId: uploadId,
      });
      return { gid: groundInspection.groundInspectionId, uploadId };
    });

    // Connection A begins and runs a statement — its `now()` is fixed BEFORE the approval exists.
    const a = await pool.connect();
    try {
      await a.query('BEGIN');
      await a.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(a, pid);
      await a.query('SELECT 1');
      // Connection B commits the approval.
      await approve(pid, cid);
      // A completes the second assignment (a differing date) and commits.
      const date = istDaysAgo(3);
      await completeGroundInspection(a, {
        pariwarId: pid, groundInspectionId: gid.gid, actingActorId: INSPECTOR, originalCertificateVerdict: 'matches',
        comparedCertificateUploadId: gid.uploadId,
        deathDate: { plaintext: date, ciphertext: `enc:v1:inspection-death-date:${date}`, index: fixtureDeathDateIndex(date), source: 'family_statement' },
      });
      await a.query('COMMIT');
    } catch (err) {
      await a.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      a.release();
    }

    const { rows: degraded, told } = await listOnFault(pid);
    expect(told).toBe(1);
    expect(degraded.map((r) => r.claimCaseId)).toEqual([cid]);
    const rows = await list(pid);
    expect(rows.map((r) => r.claimCaseId)).toEqual([cid]);
    expect(rows[0]).toMatchObject({ lateWarningAwaitingReason: true, lateWarningUncoveredCount: 1 });
  });

  /** tx1 of legs (e)/(f) — S: a post-death nominee change, determined (a discarded version), an accepted certificate, a
   *  full visit, then the REAL `-239` refusal and the REAL appeal; and R (the same deceased): ⛔ no visit of its own (its
   *  certificate check completes it — FQ13), approved by the District Admin WITH a reason (P1 — ⛔ never held, RF5). */
  async function refusedSourceAndApprovedRefile(pid: PariwarId): Promise<{ source: ClaimId; refile: ClaimId }> {
    const mid = randomUUID();
    const source = toClaimId(randomUUID());
    const sourceDate = istDaysAgo(45);
    await onOwnTx(pid, async (c) => {
      const tx = bindScopedDb(c);
      await driveClaimTo(c, pid, source, mid, 'verifier_review');
      await seedNomineeDeclaration(tx, pid, mid, { declaredAt: new Date(Date.now() - 300 * DAY), nominees: [{}, {}] });
      await seedNomineeDeclaration(tx, pid, mid, { declaredAt: new Date(Date.now() - 30 * DAY), nominees: [{}, {}] });
      await seedAcceptedDeathCertificate(c, { pariwarId: pid, claimCaseId: source, date: sourceDate });
      const versions = await listNomineeDeclarationVersions(tx, pid, toMemberId(mid));
      await seedNomineeDetermination(c, pid, source, {
        certificateDate: sourceDate,
        marks: versions.map((v) => ({ versionId: v.versionId, mark: versionStandsAt(v.effectiveAt, sourceDate) ? ('stands' as const) : ('discarded' as const) })),
      });
      await seedGroundInspection(c, pid, source);
      await adjudicateClaim(c, {
        claimCaseId: source, pariwarId: pid, outcome: 'denied', reasonCode: 'post_death_nominee_change', rationaleCiphertext: 'enc:v1:deny',
        actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
      });
      await initiateAppeal(c, { claimCaseId: source, pariwarId: pid, initiatedByActor: randomUUID(), initiatedOnBehalf: false, actor: 'member' });
    });
    const refile = toClaimId(randomUUID());
    await onOwnTx(pid, async (c) => {
      await driveClaimTo(c, pid, refile, mid, 'verifier_review');
      await seedNomineeNameCheck(c, pid, refile, { inspection: 'skip' });
      await seedGroundInspection(c, pid, refile, { stage: 'certificate_check' });
    });
    await approve(pid, refile, GENERIC);
    return { source, refile };
  }

  it('(e) ⭐ `-290` M2 — a refile relying on an INHERITED visit is listed when its SOURCE — whose refusal STANDS, its appeal UPHELD at stage 3 — gains a differing visit after the refile\'s approval (re-derived by Story 6.24a, F8)', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { source, refile } = await refusedSourceAndApprovedRefile(pid);
    expect(await list(pid)).toEqual([]); // nothing uncovered yet ⇒ ⛔ listed on the normal path
    // tx3 — S's appeal runs the whole ladder and is UPHELD at stage 3 (the REAL writers): its `-239` refusal STANDS
    // (`upheld_final` — decided, so R's final approval is ⛔ not held by it, `-292` RF5) and S stays the source (RF8).
    const panel = [randomUUID(), randomUUID()];
    await onOwnTx(pid, async (c) => {
      for (const uid of panel) {
        await seedRoleGrant(bindScopedDb(c), pid, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pid });
      }
    }, true);
    await onOwnTx(pid, async (c) => {
      const cipher = prepareAppealCiphertext('enc:v1:appeal');
      await reviewAppealStage1(c, {
        claimCaseId: source, pariwarId: pid, decision: 'advance', dispositionCategory: null,
        reviewerActorId: REVIEWER, reviewerDisplay: 'Another District Admin', rationaleCiphertext: cipher, actor: 'operator',
      });
      await openAppealPanel(c, { claimCaseId: source, pariwarId: pid, panelActorIds: panel, actorId: panel[0]!, actorDisplay: 'P1', actor: 'trustee' });
      for (const uid of panel) {
        await castAppealVote(c, { claimCaseId: source, pariwarId: pid, vote: 'deny', rationaleCiphertext: cipher, actorId: uid, actorDisplay: 'P', actor: 'trustee' });
      }
      await finalizeAppealOutcome(c, { claimCaseId: source, pariwarId: pid, rationaleCiphertext: cipher, dispositionCategory: null, actorId: panel[0]!, actorDisplay: 'P1', actor: 'trustee' });
      await decideAppealStage3(c, {
        claimCaseId: source, pariwarId: pid, decision: 'upheld', dispositionCategory: null,
        reviewerActorId: randomUUID(), reviewerDisplay: 'Trustee', rationaleCiphertext: cipher, actor: 'trustee',
      });
    });
    // tx4 — S gains a NEW full visit whose family date differs from R's accepted certificate.
    // ⚠ Story 6.24a FOUND (recorded in its Debug Log + `deferred-work.md`): through the WRITERS this is now unreachable — a
    // STANDING source is `denied` / under appeal, OUTSIDE the inspection window (`isClaimInGroundInspectionWindow`), and a
    // REVERSED one is ⛔ no longer a source (RF8). So `-290` M2's arm is pinned here as a READ: the late visit is a raw,
    // COMMITTED completed row (the inheritance spec's own raw-insert precedent — the queue's late arm is what is under
    // test), written AFTER R's approval committed. The assertions below are UNCHANGED.
    await onOwnTx(pid, async (c) => {
      const date = istDaysAgo(10);
      const upload = await currentUploadIdOf(c, pid, source);
      await c.query(
        `INSERT INTO claim_ground_inspections (claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type, inspector_actor_id,
                                              scheduled_at, status, completed_at, original_certificate_verdict, compared_certificate_upload_id,
                                              death_date_ciphertext, death_date_source, death_date_index)
         VALUES ($1, $2, 'Patna', 'initial', 'family_residence', $3, now(), 'completed', clock_timestamp(), 'matches', $4, $5, 'family_statement', $6)`,
        [source, pid, INSPECTOR, upload, fixtureInspectionDeathDateCiphertext(date), fixtureDeathDateIndex(date)],
      );
    }, true);

    const rows = await list(pid);
    expect(rows.map((r) => r.claimCaseId)).toEqual([refile]);
    expect(rows[0]).toMatchObject({ lateWarningAwaitingReason: true, lateWarningUncoveredCount: 1 });
    await finalVoteWaits(pid, refile);
  });

  it('(f) ⭐ Story 6.24a (F8, `2026-10-07-292` RF6) — S\'s appeal ALLOWED ⇒ the approved refile is `closed` in the reversal\'s transaction and leaves the queue', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { source, refile } = await refusedSourceAndApprovedRefile(pid);
    const reversal = await onOwnTx(pid, (c) =>
      reviewAppealStage1(c, {
        claimCaseId: source, pariwarId: pid, decision: 'reversed', dispositionCategory: 'reconsideration_on_merits',
        reviewerActorId: REVIEWER, reviewerDisplay: 'Another District Admin', rationaleCiphertext: prepareAppealCiphertext('enc:v1:reverse'), actor: 'operator',
      }),
    );
    expect(reversal.heldClaims).toEqual({ applied: true, closed: [refile], notClosed: [] });
    const state = await onOwnTx(pid, async (c) => (await c.query<{ s: string }>('SELECT current_state AS s FROM claims WHERE claim_case_id = $1', [refile])).rows[0]?.s);
    expect(state).toBe('closed');
    await completeLate(pid, source, { deathDate: istDaysAgo(10) }).catch(() => undefined); // a reversed source passes ⛔ nothing on (RF8)
    expect((await list(pid)).map((r) => r.claimCaseId)).not.toContain(refile);
  });
});
