// The PUBLIC per-claim Sahyog Vivran route — live-DB integration (Story 11b.3, Task 3; AC1, AC3, AC5, AC6).
//
// Drives `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:poolCanonicalIdentifier` through
// `app.inject` against real Postgres.
//
// ⭐⭐ THE LOAD-BEARING FAMILY IS THE **NEGATIVE** ONE: this route returns ⛔ NO person, ⛔ NO
// ciphertext, ⛔ NO internal identifier and ⛔ NO rupee figure — which is the property the D6(b) split
// bought, and the reason the surface needs ⛔ no Panel ruling of its own.
//
// Families:
//   · the response shape — ⛔ NOTHING on the wire but the ten classified fields.
//   · ⭐ 404 COLLAPSES every "nothing to show" case: unknown identifier · a `spawned` pool ·
//     a switched-off Pariwar. ⛔ Byte-identical, because `P-YYYY-MM-###` is SEQUENTIAL.
//   · ⭐ D4(b): `live` + `closed` + `settled` render, and the vocabulary is the PUBLIC one.
//   · ⭐ AC3: the confirmed count is canonical-events-only, and yellow can NEVER reach it.
//   · ⭐ AC5: the appeal lineage is derived AT REQUEST TIME (D12(a) — ⛔ no queue, ⛔ no consumer),
//     and carries ⛔ no rationale and ⛔ no reviewer.

import { randomUUID } from 'node:crypto';

import { PublicSahyogVivranResponse } from '@twt/contracts';
import { encryption, ids, member as memberDomain, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ROUTE = (pariwarId: string, id: string): string =>
  `/api/v1/p/${pariwarId}/public-pages/sahyog-vivran/${encodeURIComponent(id)}`;

interface SeedSpec {
  canonicalIdentifier: string;
  poolState?: 'spawned' | 'live' | 'closed' | 'settled';
  district?: string;
  /** How many `contribution.confirmed` events to seed for the pool. */
  confirmed?: number;
  /** How many of those confirmations to walk back with a compensating reversal. */
  reversed?: number;
  /** Seed a YELLOW `contribution.utr-attested` event — ⛔ it must NEVER reach the count. */
  attested?: number;
  /** Seed a `claim.reversed` event on the claim's own stream. */
  appeal?: { stage: 1 | 2 | 3; category: string };
  /** Seed N `member_pool_assignments` rows — the EXPECTED side of the outcome. */
  assigned?: number;
  /**
   * ⭐ Seed a real Tier-1 encrypted KYC name for the claim subject. Present on purpose in the
   * DEFAULT fixture: this route must return ⛔ NOTHING derived from it, and a fixture with no
   * ciphertext at all could not prove that.
   */
  legalName?: string;
}

async function seedDrive(t: TestApp, spec: SeedSpec): Promise<{ pariwarId: string }> {
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const pid = ids.pariwarId(pariwarId);
    const memberId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = randomUUID();

    await scopeTx.client.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version)
       VALUES ($1, $2, 'active', 1)`,
      [memberId, pariwarId],
    );
    if (spec.legalName !== undefined) {
      await scopeTx.tx.insert(schema.memberKycProfiles).values({
        memberId: ids.memberId(memberId),
        pariwarId: pid,
        nameCiphertext: await encryption.encryptKycField(
          spec.legalName,
          pariwarId,
          t.deps.encryption,
        ),
        dobCiphertext: await encryption.encryptKycField('1970-01-15', pariwarId, t.deps.encryption),
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
    }
    if (spec.district !== undefined) {
      await scopeTx.client.query(
        `INSERT INTO member_postings (posting_id, member_id, pariwar_id, district, is_retirement, created_at)
         VALUES ($1, $2, $3, $4, false, now() - interval '10 days')`,
        [randomUUID(), memberId, pariwarId, spec.district],
      );
    }

    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'on'");
    await scopeTx.client.query(
      `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels,
                           current_state, state_event_version)
       VALUES ($1, $2, $3, ARRAY['member_app']::claim_intake_channel[], 'approved', 1)`,
      [claimCaseId, pariwarId, memberId],
    );
    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'off'");

    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'on'");
    await scopeTx.client.query(
      `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index,
                          pool_canonical_identifier, support_category, benefit_mechanism,
                          fixed_amount, current_state, state_event_version)
       VALUES ($1, $2, $3, $4, 0, $5, 'death_support', 'pool', 100, $6, 1)`,
      [poolId, pariwarId, randomUUID(), claimCaseId, spec.canonicalIdentifier, spec.poolState ?? 'closed'],
    );
    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'off'");

    // The close/settle instant the surface reads (AC3's settlement-state source).
    if ((spec.poolState ?? 'closed') !== 'live' && (spec.poolState ?? 'closed') !== 'spawned') {
      await scopeTx.client.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, 'pool.closed', '{}'::jsonb, 1, $2, now() - interval '2 days')`,
        [poolId, pariwarId],
      );
    }

    for (let i = 0; i < (spec.assigned ?? 0); i += 1) {
      const other = randomUUID();
      await scopeTx.client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version)
         VALUES ($1, $2, 'active', 1)`,
        [other, pariwarId],
      );
      // ⚠ The PK is `(pool_id, member_id)` — there is no `assignment_id` column.
      await scopeTx.client.query(
        `INSERT INTO member_pool_assignments (pariwar_id, pool_id, member_id, cycle_id, assigned_at)
         VALUES ($1, $2, $3, $4, now())`,
        [pariwarId, poolId, other, randomUUID()],
      );
    }

    const alertStream = randomUUID();
    let version = 1;
    const confirmedEventIds: string[] = [];
    for (let i = 0; i < (spec.confirmed ?? 0); i += 1) {
      const eventId = randomUUID();
      confirmedEventIds.push(eventId);
      await scopeTx.client.query(
        `INSERT INTO events_log (event_id, stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, $2, 'contribution.confirmed', $3::jsonb, $4, $5, now() - interval '3 days')`,
        [eventId, alertStream, JSON.stringify({ poolId, memberId: randomUUID() }), version, pariwarId],
      );
      version += 1;
    }
    for (let i = 0; i < (spec.reversed ?? 0); i += 1) {
      await scopeTx.client.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, 'reconciliation.confirmation-reversed', $2::jsonb, $3, $4, now() - interval '2 days')`,
        [
          alertStream,
          JSON.stringify({ poolId, reversedConfirmedEventId: confirmedEventIds[i] }),
          version,
          pariwarId,
        ],
      );
      version += 1;
    }
    // ⛔ YELLOW. Seeded on purpose: it must be structurally unable to reach the confirmed count.
    for (let i = 0; i < (spec.attested ?? 0); i += 1) {
      await scopeTx.client.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, 'contribution.utr-attested', $2::jsonb, $3, $4, now() - interval '3 days')`,
        // ⚠ A UNIQUE `tr` per event: `contribution_utr_attested_tr_uq` enforces the Story 8.7
        // idempotency reference, so a repeated literal 23505s the seed rather than the assertion.
        [
          alertStream,
          JSON.stringify({ poolId, memberId: randomUUID(), tr: `TR-${randomUUID().slice(0, 12)}` }),
          version,
          pariwarId,
        ],
      );
      version += 1;
    }

    if (spec.appeal !== undefined) {
      await scopeTx.client.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, 'claim.reversed', $2::jsonb, 7, $3, now() - interval '5 days')`,
        [
          claimCaseId,
          JSON.stringify({
            reversed_at_stage: spec.appeal.stage,
            disposition_category: spec.appeal.category,
          }),
          pariwarId,
        ],
      );
    }

    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { pariwarId };
}

async function setPublicationEnabled(t: TestApp, pariwarId: string, enabled: boolean): Promise<void> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await memberDomain.setDirectoryPublicationEnabled(scopeTx.tx, {
      pariwarId: ids.pariwarId(pariwarId),
      enabled,
      changedByActor: null,
      changedByDisplay: null,
      rationale: 'test fixture — the per-Pariwar public-surface kill switch',
      auditId: randomUUID(),
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

describe.skipIf(!hasDatabase)('public Sahyog Vivran route (:5433)', { timeout: 30000 }, () => {
  it('⭐⭐ returns ONLY the ten classified fields — ⛔ no person, no ciphertext, no internal id', async () => {
    const t = await createTestApp();
    try {
      const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
      const { pariwarId } = await seedDrive(t, {
        canonicalIdentifier: id,
        district: 'Lucknow',
        confirmed: 3,
        assigned: 4,
        // ⭐ A REAL Tier-1 ciphertext exists for this claim's subject, and the route must return
        // NOTHING derived from it. A fixture with no KYC row could not prove that.
        legalName: 'Rajesh Kumar Sharma',
      });

      const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { drive: Record<string, unknown> };

      // ⭐ THE EXACT KEY SET, ⛔ not a sample.
      expect(Object.keys(body.drive).sort()).toEqual([
        'appealReversal',
        'closedAt',
        'confirmedContributionCount',
        'district',
        'driveStatus',
        'fundingOutcome',
        'poolCanonicalIdentifier',
        'poolLetterCode',
      ]);

      // ⭐ THE PROPERTY, not a restatement: parse the WHOLE wire response through the real
      // `.strict()` contract, which fails on ANY extra or renamed field anywhere in the shape.
      expect(() => PublicSahyogVivranResponse.parse(res.json())).not.toThrow();

      // ⛔⛔ AND THE RAW BODY CARRIES NO PERSON AND NO INTERNAL IDENTIFIER, under ANY key.
      const raw = res.body;
      for (const forbidden of [
        'Rajesh',
        'Sharma',
        'enc:v1:',
        'memberId',
        'member_id',
        'deceasedMemberId',
        'claimCaseId',
        'claim_case_id',
        'poolId',
        'pool_id',
      ]) {
        expect(raw).not.toContain(forbidden);
      }
      // ⛔ AND NO RUPEE FIGURE — D1(b) moved the amount to 11b.3b; D1(c) is REFUSED.
      for (const forbidden of ['amountRaised', 'fixedAmount', 'rosterSize', '₹']) {
        expect(raw).not.toContain(forbidden);
      }
      // ⛔ AND NO CONTRIBUTION STATUS KEY — the AC4 shape, on the wire.
      expect(raw).not.toContain('"status"');
    } finally {
      await teardown(t);
    }
  });

  describe('⭐⭐ 404 COLLAPSES every "nothing to show" case — ⛔ byte-identical', () => {
    it('an UNKNOWN identifier → 404 with an EMPTY body', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: 'P-2026-09-111' });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, 'P-2026-09-999') });
        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('');
      } finally {
        await teardown(t);
      }
    });

    it('a `spawned` pool → the SAME 404 — it exists, but not at this surface’s predicate', async () => {
      // ⛔ `spawned` is ABSENT from `SAHYOG_VIVRAN_VISIBLE_POOL_STATES` deliberately: a pool that has
      // not opened for contributions has no drive to tell.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          poolState: 'spawned',
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('');
      } finally {
        await teardown(t);
      }
    });

    it('a SWITCHED-OFF Pariwar → the SAME 404, INDISTINGUISHABLE from an absent drive', async () => {
      // ⭐ THE ANTI-ENUMERATION PROPERTY: a pulled Pariwar must not be a NEW ORACLE. The kill switch
      // is an EMERGENCY control that defaults to ENABLED — ⛔ never a launch gate.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        expect((await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) })).statusCode).toBe(200);

        await setPublicationEnabled(t, pariwarId, false);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('');
      } finally {
        await teardown(t);
      }
    });

    it('a drive in ANOTHER Pariwar → the SAME 404 (tenant isolation, not an error)', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        await seedDrive(t, { canonicalIdentifier: id });
        const other = await seedDrive(t, { canonicalIdentifier: `P-2026-09-${randomUUID().slice(0, 6)}` });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(other.pariwarId, id) });
        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐ D4(b) — `live` + `closed` + `settled` render, in the PUBLIC vocabulary', () => {
    for (const [state, expected] of [
      ['live', 'collecting'],
      ['closed', 'active'],
      ['settled', 'archive'],
    ] as const) {
      it(`a \`${state}\` pool renders as \`${expected}\` — ⛔ never the internal word`, async () => {
        const t = await createTestApp();
        try {
          const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
          const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id, poolState: state });
          const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
          expect(res.statusCode).toBe(200);
          const body = res.json() as { drive: Record<string, unknown> };
          expect(body.drive['driveStatus']).toBe(expected);
          // ⛔ `2026-08-21-144` cl.8 — the internal lifecycle word must never cross the boundary.
          expect(res.body).not.toContain(`"${state}"`);
        } finally {
          await teardown(t);
        }
      });
    }

    it('⭐ a `live` drive renders NO close date and NO outcome — ⛔ never an estimate (AC3)', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          poolState: 'live',
          confirmed: 2,
          assigned: 5,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['closedAt']).toBeNull();
        // ⛔ NOT `under_funded` — a drive still collecting has no close to frame, and classifying it
        // would be the projected-final-outcome AC3 forbids.
        expect(body.drive['fundingOutcome']).toBeNull();
        // ⭐ The count IS rendered — it is the one figure that is true mid-drive.
        expect(body.drive['confirmedContributionCount']).toBe(2);
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐⭐ AC3 — the confirmed count is CANONICAL EVENTS ONLY', () => {
    it('⛔ a YELLOW `contribution.utr-attested` event NEVER reaches the count', async () => {
      // Yellow is a member's CLAIM that they paid — intent, ⛔ not confirmed money. The guard is
      // STRUCTURAL: the count's event type is hard-filtered with no parameter that could admit one.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 2,
          attested: 5,
          assigned: 10,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['confirmedContributionCount']).toBe(2);
      } finally {
        await teardown(t);
      }
    });

    it('⭐ a REVERSED confirmation is COMPENSATED out of the count', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 3,
          reversed: 1,
          assigned: 10,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['confirmedContributionCount']).toBe(2);
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ ZERO assignees ⇒ NO outcome at all — ⛔ never a vacuous `fully_funded`', async () => {
      // ⚠ `classifyCycleOutcome` compares `deliveredTotal >= expectedTotal`, and at `0 >= 0` that is
      // VACUOUSLY TRUE ⇒ it returned `fully_funded` for a drive that collected nothing, published
      // beside "0 confirmed" (the 11b.1 review finding). The case is resolved BEFORE the call.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 0,
          assigned: 0,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['confirmedContributionCount']).toBe(0);
        expect(body.drive['fundingOutcome']).toBeNull();
      } finally {
        await teardown(t);
      }
    });

    it('a fully-delivered closed drive classifies `fully_funded`', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 4,
          assigned: 4,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['fundingOutcome']).toBe('fully_funded');
        // ⛔ AND NO TARGET, EXPECTED TOTAL OR PERCENTAGE LEAVES WITH IT — the enum is opaque.
        expect(res.body).not.toContain('expectedTotal');
        expect(res.body).not.toContain('deliveredTotal');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐⭐ AC5 — the appeal lineage, DERIVED AT REQUEST TIME (D12(a))', () => {
    it('renders the stage, the BOUNDED disposition tag and the reversal instant', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          appeal: { stage: 2, category: 'procedural_correction' },
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        const body = res.json() as {
          drive: { appealReversal: Record<string, unknown> | null };
        };
        expect(body.drive.appealReversal).not.toBeNull();
        expect(body.drive.appealReversal!['reversedAtStage']).toBe(2);
        expect(body.drive.appealReversal!['dispositionCategory']).toBe('procedural_correction');
        expect(typeof body.drive.appealReversal!['reversedAt']).toBe('string');
        // ⛔⛔ AND NOTHING ELSE. The rationale TEXT and the REVIEWER IDENTITY live on the
        // `claim.appeal_stageN_reviewed` DECISION event's Tier-1 metadata row and are NEVER public.
        expect(Object.keys(body.drive.appealReversal!).sort()).toEqual([
          'dispositionCategory',
          'reversedAt',
          'reversedAtStage',
        ]);
      } finally {
        await teardown(t);
      }
    });

    it('⛔ renders NOTHING when the claim was never reversed — ⛔ no "not reversed" marker', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['appealReversal']).toBeNull();
      } finally {
        await teardown(t);
      }
    });

    it('⛔⛔ an UNRECOGNISED disposition tag drops the WHOLE lineage — ⛔ never renders raw', async () => {
      // ⭐ THE ONE THAT MATTERS MOST: the tag is the only thing about an appeal's substance that may
      // ever be public, and an unbounded value here is how FREE TEXT would reach a public page. The
      // bound is enforced in the domain read, so a malformed payload yields NO lineage — ⛔ not half
      // of one, and ⛔ not an echoed string.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          appeal: { stage: 2, category: 'the verifier admitted he had misread the ration card' },
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['appealReversal']).toBeNull();
        expect(res.body).not.toContain('ration card');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐ AC6 — the route is UNAUTHENTICATED and its query surface is EMPTY', () => {
    it('answers 200 with NO session, no cookie and no Authorization header', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        expect(res.statusCode).toBe(200);
      } finally {
        await teardown(t);
      }
    });

    it('⛔ ANY query parameter is a 400 — `?format=csv` is a refusal, ⛔ not a no-op', async () => {
      // ⭐ The EMPTY `.strict()` query schema is precisely why controls 2 and 3 are structurally N/A
      // (D11(a)): there is no `page` for the horizon to bound and no `limit` for the cap to bound.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        for (const q of ['format=csv', 'page=2', 'limit=50', 'all=1', 'name=Sharma']) {
          const res = await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId, id)}?${q}` });
          expect(res.statusCode).toBe(400);
        }
      } finally {
        await teardown(t);
      }
    });

    it('⛔ a malformed Pariwar id is a 400 at the schema boundary', async () => {
      const t = await createTestApp();
      try {
        const res = await t.app.inject({
          method: 'GET',
          url: '/api/v1/p/not-a-uuid/public-pages/sahyog-vivran/P-2026-09-001',
        });
        expect(res.statusCode).toBe(400);
      } finally {
        await teardown(t);
      }
    });

    it('⭐ the global X-Robots-Tag hook covers this route (control 3 of the three)', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        expect(String(res.headers['x-robots-tag'])).toMatch(/noindex/);
      } finally {
        await teardown(t);
      }
    });
  });
});
