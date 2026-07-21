// contribution.utr-attested WRITE primitive — live-DB integration (Story 8.4, Task 1/Task 6; AC3).
//
// The idempotency spine, exercised against real Postgres under PARIWAR_A inside the per-test BEGIN/ROLLBACK
// envelope: `attestContributionUtr` is idempotent on the deterministic `tr` — two attestations for the same
// (member, alert) record ONE `contribution.utr-attested` event (the FR-17 one-valid-contribution-per-
// (member,alert) guarantee). Own-committing writers accumulate rows, so we assert MEMBERSHIP / single-
// attestation, not raw counts ([[project_live_db_test_gotchas]]). The attestation half is live even though
// the UPI intent's VPA seam is absent (D1) — a member who pays out-of-band can still attest.

import { randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { attestContributionUtr } from '../../../src/contribution/write.js';
import { deriveContributionReference } from '../../../src/pool/index.js';
import {
  alertId as toAlertId,
  memberId as toMemberId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import { eventsLog } from '../../../src/schema/events_log.js';
import type { Db } from '../../../src/db.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const VALID_UTR = '123456789012';

/** Count the persisted `contribution.utr-attested` rows for a `tr` on the alert stream (scoped read). */
async function countAttestations(tx: Db, alertId: string, tr: string): Promise<number> {
  const rows = await tx
    .select({ eventId: eventsLog.eventId })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.streamId, alertId),
        eq(eventsLog.eventType, 'contribution.utr-attested'),
        sql`${eventsLog.payload} ->> 'tr' = ${tr}`,
      ),
    );
  return rows.length;
}

describe.skipIf(!hasDatabase)('attestContributionUtr — idempotent on the derived tr (PARIWAR_A scope)', { timeout: 20000 }, () => {
  setupLiveDb();

  function fixture(): { alertId: string; poolId: string; memberId: string; tr: string } {
    const alertId = randomUUID();
    const poolId = randomUUID();
    const memberId = randomUUID();
    const tr = deriveContributionReference({
      memberId: toMemberId(memberId),
      alertId: toAlertId(alertId),
    });
    return { alertId, poolId, memberId, tr };
  }

  it('appends a yellow claim with the raw utr + attestation_only:true persisted', async () => {
    const { client, tx } = getTx();
    const { alertId, poolId, memberId, tr } = fixture();
    await enterAppScope(client, PARIWAR_A);

    const res = await attestContributionUtr(client, {
      pariwarId: PARIWAR_A,
      alertId: toAlertId(alertId),
      poolId: toPoolId(poolId),
      memberId: toMemberId(memberId),
      tr,
      utr: VALID_UTR,
      actorId: memberId,
    });
    expect(res.idempotent).toBe(false);

    const rows = await tx
      .select({ payload: eventsLog.payload })
      .from(eventsLog)
      .where(eq(eventsLog.eventId, res.eventId));
    expect(rows[0]?.payload).toMatchObject({
      poolId,
      memberId,
      tr,
      utr: VALID_UTR,
      attestation_only: true,
    });
  });

  it('AC3: a re-paste for the same (member, alert) records ONE attestation (idempotent)', async () => {
    const { client, tx } = getTx();
    const { alertId, poolId, memberId, tr } = fixture();
    await enterAppScope(client, PARIWAR_A);

    const first = await attestContributionUtr(client, {
      pariwarId: PARIWAR_A,
      alertId: toAlertId(alertId),
      poolId: toPoolId(poolId),
      memberId: toMemberId(memberId),
      tr,
      utr: VALID_UTR,
      actorId: memberId,
    });
    const second = await attestContributionUtr(client, {
      pariwarId: PARIWAR_A,
      alertId: toAlertId(alertId),
      poolId: toPoolId(poolId),
      memberId: toMemberId(memberId),
      tr,
      utr: VALID_UTR,
      actorId: memberId,
    });

    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(second.eventId).toBe(first.eventId);
    // Exactly ONE persisted attestation for this tr — never a second yellow claim.
    expect(await countAttestations(tx, alertId, tr)).toBe(1);
  });

  it('coexists on the alert stream: a second member attests independently (own version slot)', async () => {
    const { client, tx } = getTx();
    const alertId = randomUUID();
    const poolId = randomUUID();
    const memberA = randomUUID();
    const memberB = randomUUID();
    const trA = deriveContributionReference({ memberId: toMemberId(memberA), alertId: toAlertId(alertId) });
    const trB = deriveContributionReference({ memberId: toMemberId(memberB), alertId: toAlertId(alertId) });
    await enterAppScope(client, PARIWAR_A);

    await attestContributionUtr(client, {
      pariwarId: PARIWAR_A, alertId: toAlertId(alertId), poolId: toPoolId(poolId),
      memberId: toMemberId(memberA), tr: trA, utr: VALID_UTR, actorId: memberA,
    });
    await attestContributionUtr(client, {
      pariwarId: PARIWAR_A, alertId: toAlertId(alertId), poolId: toPoolId(poolId),
      memberId: toMemberId(memberB), tr: trB, utr: VALID_UTR, actorId: memberB,
    });

    expect(await countAttestations(tx, alertId, trA)).toBe(1);
    expect(await countAttestations(tx, alertId, trB)).toBe(1);
  });

  it('rejects a malformed UTR (the domain schema is defense-in-depth)', async () => {
    const { client } = getTx();
    const { alertId, poolId, memberId, tr } = fixture();
    await enterAppScope(client, PARIWAR_A);

    await expect(
      attestContributionUtr(client, {
        pariwarId: PARIWAR_A, alertId: toAlertId(alertId), poolId: toPoolId(poolId),
        memberId: toMemberId(memberId), tr, utr: 'nope', actorId: memberId,
      }),
    ).rejects.toThrow();
  });

  it('R4 self-verification (review finding): rejects a tr that does not match deriveContributionReference', async () => {
    const { client } = getTx();
    const { alertId, poolId, memberId } = fixture();
    await enterAppScope(client, PARIWAR_A);

    await expect(
      attestContributionUtr(client, {
        pariwarId: PARIWAR_A,
        alertId: toAlertId(alertId),
        poolId: toPoolId(poolId),
        memberId: toMemberId(memberId),
        tr: 'not-the-real-derived-tr',
        utr: VALID_UTR,
        actorId: memberId,
      }),
    ).rejects.toThrow(/does not match deriveContributionReference/);
  });

  it('duplicateUtrAcrossMembers (review finding, non-blocking): flags — never rejects — a different member reusing the same raw UTR', async () => {
    const { client } = getTx();
    const alertA = randomUUID();
    const alertB = randomUUID();
    const poolA = randomUUID();
    const poolB = randomUUID();
    const memberA = randomUUID();
    const memberB = randomUUID();
    const trA = deriveContributionReference({ memberId: toMemberId(memberA), alertId: toAlertId(alertA) });
    const trB = deriveContributionReference({ memberId: toMemberId(memberB), alertId: toAlertId(alertB) });
    await enterAppScope(client, PARIWAR_A);

    const first = await attestContributionUtr(client, {
      pariwarId: PARIWAR_A, alertId: toAlertId(alertA), poolId: toPoolId(poolA),
      memberId: toMemberId(memberA), tr: trA, utr: VALID_UTR, actorId: memberA,
    });
    expect(first.duplicateUtrAcrossMembers).toBe(false);

    // Member B attests the SAME raw utr on a completely different alert — never rejected, never
    // reconciled, just flagged (Epic 9's matcher owns real verification).
    const second = await attestContributionUtr(client, {
      pariwarId: PARIWAR_A, alertId: toAlertId(alertB), poolId: toPoolId(poolB),
      memberId: toMemberId(memberB), tr: trB, utr: VALID_UTR, actorId: memberB,
    });
    expect(second.idempotent).toBe(false);
    expect(second.duplicateUtrAcrossMembers).toBe(true);
  });

  it('cross-tenant: a PARIWAR_B attestation is invisible to a PARIWAR_A scoped read', async () => {
    const { client, tx } = getTx();
    const { alertId, poolId, memberId, tr } = fixture();
    await enterAppScope(client, PARIWAR_B);
    await attestContributionUtr(client, {
      pariwarId: PARIWAR_B, alertId: toAlertId(alertId), poolId: toPoolId(poolId),
      memberId: toMemberId(memberId), tr, utr: VALID_UTR, actorId: memberId,
    });

    // Re-scope to PARIWAR_A — RLS must hide the PARIWAR_B event.
    await enterAppScope(client, PARIWAR_A);
    expect(await countAttestations(tx, alertId, tr)).toBe(0);
  });
});
