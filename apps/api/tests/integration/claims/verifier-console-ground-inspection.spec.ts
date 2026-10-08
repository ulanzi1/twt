// Story 6.26a — the verifier console's "why it waits" section and the inspector's facts (GI9, GI10; AC2, AC6, AC9).
//
//   · `groundInspectionGate` comes from the SAME read and the SAME pure predicate as the approval gate — a live-DB proof
//     that the two agree on every constructible AC2 row (the two `compared = null` rows are unit-only: 0147's CHECK
//     refuses to insert them);
//   · the section books EXACTLY one read and sends EXACTLY one read statement (+ its SAVEPOINT pair);
//   · a FAILED read fails CLOSED (`available: false`) and ⛔ never aborts the scope transaction — `approvalWarnings`,
//     read after it, still answers (the fault seam below — the 6.23b Trap-15 precedent);
//   · GI10: the inherited visit shown BESIDE the refile's own certificate check, each labelled; the verdict, the
//     comparison, the decrypted date; a decrypt failure says "could not be read" (⛔ never a blank).

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import {
  VERIFIER_CONSOLE_MAX_READS,
  assembleGroundInspectionGate,
  assembleVerifierConsole,
  type VerifierConsoleContext,
} from '../../../src/modules/claims/claims.verifier-console.handlers.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildTestDeps, hasDatabase, type TestDeps } from '../_setup.js';
import { ensureGroundInspection, insertDeathCertificate, seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';

// ⭐ The fault seam — the gate section's ONE read made to fail ON DEMAND with a REAL SQL error first (so the SAVEPOINT
// path is exercised: without it the error would abort the scope tx and every later section would 25P02). Off by default.
const fault = vi.hoisted(() => ({ on: false, warnings: false }));
vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  const { sql } = await import('drizzle-orm');
  return {
    ...actual,
    claim: {
      ...actual.claim,
      readGroundInspectionApprovalFacts: async (...a: Parameters<typeof actual.claim.readGroundInspectionApprovalFacts>) => {
        if (fault.on) await (a[0] as unknown as { execute: (q: unknown) => Promise<unknown> }).execute(sql`SELECT 1/0`);
        return actual.claim.readGroundInspectionApprovalFacts(...a);
      },
      // Story 6.26b (RD18) — the warnings read made to fail ON DEMAND (it is the LAST read, with ⛔ SAVEPOINT — a thrown
      // JS error takes the same catch path without aborting the scope tx).
      readClaimApprovalWarnings: async (...a: Parameters<typeof actual.claim.readClaimApprovalWarnings>) => {
        if (fault.warnings) throw new Error('forced: the warnings read failed');
        return actual.claim.readClaimApprovalWarnings(...a);
      },
    },
  };
});

const DISTRICT = 'Patna';

describe.skipIf(!hasDatabase)('Story 6.26a — the console\'s ground-inspection gate and facts (:5433)', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;

  beforeAll(() => {
    td = buildTestDeps({});
    deps = td.deps;
  });
  afterAll(async () => {
    fault.on = false;
    await td.pool.end();
  });

  async function inScope<T>(pariwarId: string, fn: (s: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>): Promise<T> {
    const s = await openScopeTx(deps, pariwarId);
    try {
      const out = await fn(s);
      await closeScopeTx(s, true);
      return out;
    } catch (err) {
      await closeScopeTx(s, false);
      throw err;
    }
  }

  async function seedDeceased(pariwarId: string): Promise<ids.MemberId> {
    const memberId = randomUUID();
    await td.pool.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at, updated_at) VALUES ($1, $2, 'active', 0, now(), now())`,
      [memberId, pariwarId],
    );
    await td.pool.query(
      `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now())`,
      [memberId, pariwarId, DISTRICT],
    );
    return ids.memberId(memberId);
  }

  async function seedClaim(pariwarId: string, deceased: ids.MemberId, opts: Parameters<typeof seedNomineeNameCheck>[3] = {}): Promise<string> {
    const claimCaseId = randomUUID();
    await inScope(pariwarId, async (s) => {
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        claim.projectClaimState(s.client, {
          claimCaseId: ids.claimId(claimCaseId), pariwarId: ids.pariwarId(pariwarId), deceasedMemberId: deceased, intakeChannels: ['helpline'],
          claimantActorId: null, eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra } as never, actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: String(deceased), intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1,
      });
    });
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId, opts);
    return claimCaseId;
  }

  /** The `-239` SOURCE for `deceased`: an earlier claim refused on suspicion, with a completed FULL inspection (its family
   *  date `deathDate`, default the fixture's — tomorrow, the refile's accepted date). */
  async function refusedSource(pariwarId: string, deceased: ids.MemberId, opts: { deathDate?: string } = {}): Promise<string> {
    const source = await seedClaim(pariwarId, deceased, { skip: true });
    await inScope(pariwarId, async (s) => {
      await insertDeathCertificate(s, pariwarId, source);
      await ensureGroundInspection(deps, s, pariwarId, source, opts.deathDate ? { deathDate: opts.deathDate } : {});
    });
    await td.pool.query(
      `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, actor_id, actor_display)
       VALUES ($1, $2, 'denied', 'post_death_nominee_change', $3, 'Anita (District Admin)')`,
      [source, pariwarId, randomUUID()],
    );
    return source;
  }

  function ctxOf(s: Awaited<ReturnType<typeof openScopeTx>>, pariwarId: string, claimCaseId: string): VerifierConsoleContext {
    return {
      db: s.tx, client: s.client, pariwarId, claimCaseId, district: DISTRICT, actorId: randomUUID(),
      grants: [{ pariwarId, role: 'super_admin', scopeDimension: 'global', scopeValue: null }], traceId: null,
    };
  }

  /** The console's section AND the domain gate, for one claim, in one scope tx. */
  async function bothOf(pariwarId: string, claimCaseId: string) {
    return inScope(pariwarId, async (s) => {
      const { packet } = await assembleVerifierConsole(deps, ctxOf(s, pariwarId, claimCaseId));
      const gate = await claim
        .assertGroundInspectionCompleteForApproval(s.tx, ids.pariwarId(pariwarId), ids.claimId(claimCaseId))
        .then(() => ({ complete: true, waitReason: null }))
        .catch((e: unknown) => {
          if (e instanceof claim.GroundInspectionRequiredError) return { complete: false, waitReason: e.reason };
          throw e;
        });
      return { packet, gate };
    });
  }

  it('⭐⭐ AC2 / AC9 — the console\'s `groundInspectionGate` and the approval gate AGREE on every constructible row', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceased(pariwarId);
    const rows: [string, string, { complete: boolean; waitReason: string | null }][] = [];

    rows.push(['a full visit against the current certificate', await seedClaim(pariwarId, deceased), { complete: true, waitReason: null }]);
    rows.push([
      '⛔ inspection at all',
      await seedClaim(pariwarId, await seedDeceased(pariwarId), { inspection: 'skip' }),
      { complete: false, waitReason: 'no_completed_inspection' },
    ]);
    // A full visit, then the certificate REPLACED (`-281` Q2 A).
    const replaced = await seedClaim(pariwarId, await seedDeceased(pariwarId));
    await inScope(pariwarId, (s) => insertDeathCertificate(s, pariwarId, replaced));
    rows.push(['a full visit, the certificate replaced since', replaced, { complete: false, waitReason: 'certificate_check_required' }]);
    // A certificate check ONLY (⛔ never a visit).
    const checkOnly = await seedClaim(pariwarId, await seedDeceased(pariwarId), { inspection: 'skip' });
    await inScope(pariwarId, (s) => ensureGroundInspection(deps, s, pariwarId, checkOnly, { stage: 'certificate_check' }));
    rows.push(['a certificate check only', checkOnly, { complete: false, waitReason: 'no_completed_inspection' }]);
    // The refile: inherits a visit, ⛔ own check ⇒ certificate_check_required; after its own check ⇒ complete.
    await refusedSource(pariwarId, deceased);
    const refile = await seedClaim(pariwarId, deceased, { inspection: 'skip' });
    rows.push(['a refile, inheriting, ⛔ own check', refile, { complete: false, waitReason: 'certificate_check_required' }]);
    // ── The three rows the second code review (2026-10-07) found missing. ──
    // Row 2 — own FULL assignments, ⛔ none completed: scheduled / refused / unavailable / superseded count for nothing.
    const notCompleted = await seedClaim(pariwarId, await seedDeceased(pariwarId), { inspection: 'skip' });
    for (const status of ['scheduled', 'photo_refused', 'evidence_unavailable', 'superseded']) {
      await td.pool.query(
        `INSERT INTO claim_ground_inspections (claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type, inspector_actor_id, scheduled_at, status)
         VALUES ($1, $2, $3, 'initial', 'family_residence', $4, now(), $5)`,
        [notCompleted, pariwarId, DISTRICT, randomUUID(), status],
      );
    }
    rows.push(['own full assignments, ⛔ none completed', notCompleted, { complete: false, waitReason: 'no_completed_inspection' }]);
    // Row 5 — a full visit against U1, the certificate replaced, then a certificate check against U2 (current).
    const visitThenCheck = await seedClaim(pariwarId, await seedDeceased(pariwarId));
    await inScope(pariwarId, async (s) => {
      await insertDeathCertificate(s, pariwarId, visitThenCheck);
      await ensureGroundInspection(deps, s, pariwarId, visitThenCheck, { stage: 'certificate_check' });
    });
    rows.push(['a full visit against U1 + a certificate check against U2 (current)', visitThenCheck, { complete: true, waitReason: null }]);
    // Row 9 — the only refused source's completed assignment is a CERTIFICATE CHECK ⇒ ⛔ nothing inherited (`-283` A2).
    const checkOnlyDeceased = await seedDeceased(pariwarId);
    const checkOnlySource = await seedClaim(pariwarId, checkOnlyDeceased, { skip: true });
    await inScope(pariwarId, async (s) => {
      await insertDeathCertificate(s, pariwarId, checkOnlySource);
      await ensureGroundInspection(deps, s, pariwarId, checkOnlySource, { stage: 'certificate_check' });
    });
    await td.pool.query(
      `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, actor_id, actor_display)
       VALUES ($1, $2, 'denied', 'post_death_nominee_change', $3, 'Anita (District Admin)')`,
      [checkOnlySource, pariwarId, randomUUID()],
    );
    const refileOfCheck = await seedClaim(pariwarId, checkOnlyDeceased, { inspection: 'skip' });
    rows.push(['a refile whose only refused source has a certificate check only', refileOfCheck, { complete: false, waitReason: 'no_completed_inspection' }]);

    for (const [label, cid, expected] of rows) {
      const { packet, gate } = await bothOf(pariwarId, cid);
      expect(packet.groundInspectionGate, label).toEqual({ available: true, ...expected });
      expect(gate, label).toEqual(expected);
    }

    await inScope(pariwarId, (s) => ensureGroundInspection(deps, s, pariwarId, refile, { stage: 'certificate_check' }));
    const after = await bothOf(pariwarId, refile);
    expect(after.packet.groundInspectionGate).toEqual({ available: true, complete: true, waitReason: null });
    expect(after.gate).toEqual({ complete: true, waitReason: null });
  });

  it('⭐ AC9 — the section books EXACTLY one read and sends EXACTLY one read statement (+ its SAVEPOINT / RELEASE); the ceiling is 20', async () => {
    expect(VERIFIER_CONSOLE_MAX_READS).toBe(21); // Story 6.24a (RF10) FROM 20 — +1: the suspicion-refusal section (kept apart + the final-approval wait)
    const pariwarId = randomUUID();
    const claimCaseId = await seedClaim(pariwarId, await seedDeceased(pariwarId));
    await inScope(pariwarId, async (s) => {
      const statements: string[] = [];
      const client = s.client as unknown as { query: (...a: unknown[]) => unknown };
      const realQuery = client.query.bind(client);
      client.query = (...args: unknown[]) => {
        const first = args[0] as string | { text: string };
        statements.push(typeof first === 'string' ? first : first.text);
        return realQuery(...args);
      };
      try {
        let booked = 0;
        const section = await assembleGroundInspectionGate(ctxOf(s, pariwarId, claimCaseId), ids.claimId(claimCaseId), { bump: () => (booked += 1) });
        expect(section).toEqual({ available: true, complete: true, waitReason: null });
        expect(booked).toBe(1);
        expect(statements.filter((t) => !/^(SAVEPOINT|RELEASE SAVEPOINT)\b/.test(t))).toHaveLength(1);
        expect(statements.filter((t) => /^SAVEPOINT console_ground_inspection_gate$/.test(t))).toHaveLength(1);
      } finally {
        client.query = realQuery as never;
      }
    });
  });

  it('⭐⭐ AC9 — a FAILED read (a real SQL error) fails CLOSED: `available: false`, ⛔ never "complete"; the scope tx survives — `approvalWarnings` (LAST) still answers', async () => {
    const pariwarId = randomUUID();
    const claimCaseId = await seedClaim(pariwarId, await seedDeceased(pariwarId));
    fault.on = true;
    try {
      const { packet } = await inScope(pariwarId, (s) => assembleVerifierConsole(deps, ctxOf(s, pariwarId, claimCaseId)));
      expect(packet.groundInspectionGate).toEqual({ available: false, complete: false, waitReason: null });
      expect(packet.approvalWarnings.available).toBe(true);
    } finally {
      fault.on = false;
    }
  });

  it('⭐ GI10 / AC6 — the refile shows the INHERITED visit beside its OWN certificate check, each labelled; the verdict, the comparison and the decrypted date; the original-certificate photo labelled', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceased(pariwarId);
    const source = await refusedSource(pariwarId, deceased);
    const refile = await seedClaim(pariwarId, deceased, { inspection: 'skip' });
    const ownCheck = await inScope(pariwarId, (s) => ensureGroundInspection(deps, s, pariwarId, refile, { stage: 'certificate_check', verdict: 'does_not_match' }));
    const { packet } = await inScope(pariwarId, (s) => assembleVerifierConsole(deps, ctxOf(s, pariwarId, refile)));
    expect(packet.groundInspection.status).toBe('present');
    if (packet.groundInspection.status !== 'present') return;
    expect(packet.groundInspection.inheritedFrom).toEqual({ claimCaseId: source });
    const own = packet.groundInspection.assignments.find((a) => a.groundInspectionId === ownCheck)!;
    expect(own).toMatchObject({
      inherited: false,
      inspectionStage: 'certificate_check',
      // ⭐ Shown — and (6.26b GI17) a warning, compared against the CURRENT upload.
      originalCertificateVerdict: 'does_not_match',
      originalMismatchWarning: true,
      comparedAgainst: 'current',
      deathDateSource: 'original_certificate',
      deathDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      deathTime: null,
      deathDateUnreadable: false,
      deathTimeUnreadable: false,
    });
    expect(own.photos.map((p) => p.photoKind)).toEqual(['original_certificate']);
    const inherited = packet.groundInspection.assignments.filter((a) => a.inherited);
    expect(inherited).toHaveLength(1);
    expect(inherited[0]).toMatchObject({ inspectionStage: 'initial', status: 'completed', comparedAgainst: 'earlier', deathDateSource: 'family_statement' });
  });

  it('GI10 — a recorded date that can ⛔ not be decrypted says so (`deathDateUnreadable`), ⛔ never a blank', async () => {
    const pariwarId = randomUUID();
    const claimCaseId = await seedClaim(pariwarId, await seedDeceased(pariwarId));
    await td.pool.query(`UPDATE claim_ground_inspections SET death_date_ciphertext = 'enc:v1:not-a-real-envelope' WHERE claim_case_id = $1`, [claimCaseId]);
    const { packet } = await inScope(pariwarId, (s) => assembleVerifierConsole(deps, ctxOf(s, pariwarId, claimCaseId)));
    if (packet.groundInspection.status !== 'present') throw new Error('expected a present section');
    expect(packet.groundInspection.assignments[0]).toMatchObject({ deathDate: null, deathDateUnreadable: true, deathDateSource: 'family_statement' });
  });
  // ── Story 6.26b (GI10 [b]; `-288` K2, `-289` L3/L4; RD18; invariant 5) ──────────────────────────────────────────────
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

  it('⭐ Story 6.26b — the INHERITED visit\'s differing family date is a WARNING (`differs` + `dateDiffersWarning: true`); its verdict ⛔ never a GI17 key; the document section carries the register check', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceased(pariwarId);
    const source = await refusedSource(pariwarId, deceased, { deathDate: daysAgo(3) });
    const refile = await seedClaim(pariwarId, deceased, { inspection: 'skip', registerCheck: 'could_not_check' });
    const ownCheck = await inScope(pariwarId, (s) => ensureGroundInspection(deps, s, pariwarId, refile, { stage: 'certificate_check', verdict: 'does_not_match' }));
    const { packet } = await inScope(pariwarId, (s) => assembleVerifierConsole(deps, ctxOf(s, pariwarId, refile)));
    if (packet.groundInspection.status !== 'present') throw new Error('expected a present section');
    expect(packet.groundInspection.inheritedFrom).toEqual({ claimCaseId: source });
    const own = packet.groundInspection.assignments.find((a) => a.groundInspectionId === ownCheck)!;
    expect(own).toMatchObject({ dateComparison: 'same', dateDiffersWarning: false, originalMismatchWarning: true });
    const [inherited] = packet.groundInspection.assignments.filter((a) => a.inherited);
    expect(inherited).toMatchObject({ dateComparison: 'differs', dateDiffersWarning: true, originalMismatchWarning: false });
    expect(packet.approvalWarnings.kinds).toEqual(['inspection_death_date_differs', 'original_certificate_mismatch']);
    // The register check reaches the document section (the snapshot — ⛔ no new read).
    const certificate = packet.documentReview.status === 'present' ? packet.documentReview.reviews.find((r) => r.documentType === 'death_certificate') : undefined;
    expect(certificate?.review?.registerCheck).toBe('could_not_check');
    // ⛔ No key and ⛔ no index on the wire — the section's shape is unchanged (the shape spec pins its exact keys).
    expect(JSON.stringify(packet)).not.toMatch(/inspection_death_date_differs:|"keys"/);
    // ⛔ No index: asserted against the claims' REAL indexes — the fixture indexes through `deathDateBlindIndex`, so a
    // literal never occurs (code review rounds 2–3).
    const indexes = (
      await td.pool.query<{ idx: string }>(
        `SELECT death_date_index AS idx FROM claim_ground_inspections WHERE claim_case_id = ANY($1::uuid[]) AND death_date_index IS NOT NULL
         UNION ALL SELECT accepted_date_index FROM claim_death_certificate_reviews WHERE claim_case_id = ANY($1::uuid[]) AND accepted_date_index IS NOT NULL`,
        [[source, refile]],
      )
    ).rows.map((r) => r.idx);
    expect(indexes.length).toBeGreaterThanOrEqual(2);
    for (const idx of indexes) expect(JSON.stringify(packet)).not.toContain(idx);
  });

  it('Story 6.26b — a pre-6.26b accepted review (⛔ index) ⇒ `not_indexed`; ⛔ accepted certificate ⇒ `not_compared`; neither is a warning', async () => {
    const pariwarId = randomUUID();
    const old = await seedClaim(pariwarId, await seedDeceased(pariwarId));
    await td.pool.query('UPDATE claim_death_certificate_reviews SET accepted_date_index = NULL WHERE claim_case_id = $1', [old]);
    const oldPacket = (await inScope(pariwarId, (s) => assembleVerifierConsole(deps, ctxOf(s, pariwarId, old)))).packet;
    if (oldPacket.groundInspection.status !== 'present') throw new Error('expected a present section');
    expect(oldPacket.groundInspection.assignments[0]).toMatchObject({ dateComparison: 'not_indexed', dateDiffersWarning: false });

    const bare = await seedClaim(pariwarId, await seedDeceased(pariwarId), { skip: true });
    await inScope(pariwarId, async (s) => {
      await insertDeathCertificate(s, pariwarId, bare);
      await ensureGroundInspection(deps, s, pariwarId, bare, { deathDate: daysAgo(3) });
    });
    const barePacket = (await inScope(pariwarId, (s) => assembleVerifierConsole(deps, ctxOf(s, pariwarId, bare)))).packet;
    if (barePacket.groundInspection.status !== 'present') throw new Error('expected a present section');
    expect(barePacket.groundInspection.assignments[0]).toMatchObject({ dateComparison: 'not_compared', dateDiffersWarning: false });
  });

  it('⭐⭐ Story 6.26b (invariant 5; Trap 11) — a FAILED warnings read: `null` on every completed row\'s comparison and on every flag the section does ⛔ rule out; `false` where it does; MAX_READS stays 20', async () => {
    expect(VERIFIER_CONSOLE_MAX_READS).toBe(21); // Story 6.24a (RF10) FROM 20 — +1: the suspicion-refusal section (kept apart + the final-approval wait)
    const pariwarId = randomUUID();
    const deceased = await seedDeceased(pariwarId);
    await refusedSource(pariwarId, deceased, { deathDate: daysAgo(3) });
    const refile = await seedClaim(pariwarId, deceased, { inspection: 'skip' });
    const mismatch = (await inScope(pariwarId, (s) => ensureGroundInspection(deps, s, pariwarId, refile, { stage: 'certificate_check', verdict: 'does_not_match' })))!;
    const matches = (await inScope(pariwarId, (s) => ensureGroundInspection(deps, s, pariwarId, refile, { stage: 'certificate_check', force: true })))!;
    const scheduled = (
      await td.pool.query<{ id: string }>(
        `INSERT INTO claim_ground_inspections (claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type, inspector_actor_id, scheduled_at, status)
         VALUES ($1, $2, $3, 'initial', 'family_residence', $4, now(), 'scheduled') RETURNING ground_inspection_id AS id`,
        [refile, pariwarId, DISTRICT, randomUUID()],
      )
    ).rows[0]!.id;
    fault.warnings = true;
    try {
      const { packet } = await inScope(pariwarId, (s) => assembleVerifierConsole(deps, ctxOf(s, pariwarId, refile)));
      expect(packet.approvalWarnings.available).toBe(false);
      if (packet.groundInspection.status !== 'present') throw new Error('expected a present section');
      const by = (id: string) => packet.groundInspection.status === 'present' ? packet.groundInspection.assignments.find((a) => a.groundInspectionId === id)! : undefined;
      expect(by(mismatch)).toMatchObject({ dateComparison: null, dateDiffersWarning: null, originalMismatchWarning: null });
      expect(by(matches)).toMatchObject({ dateComparison: null, dateDiffersWarning: null, originalMismatchWarning: false });
      expect(by(scheduled)).toMatchObject({ dateComparison: 'not_compared', dateDiffersWarning: false, originalMismatchWarning: false });
      const [inherited] = packet.groundInspection.assignments.filter((a) => a.inherited);
      expect(inherited).toMatchObject({ dateComparison: null, dateDiffersWarning: null, originalMismatchWarning: false });
    } finally {
      fault.warnings = false;
    }
  });
});
