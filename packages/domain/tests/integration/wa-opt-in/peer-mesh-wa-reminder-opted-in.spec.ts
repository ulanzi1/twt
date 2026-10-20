// `isPeerMeshWaReminderOptedIn` — the ONE "has chosen WhatsApp messages from the Trust" read of the peer-mesh WhatsApp
// reminder (Story 6.31, Task 2; AC4; WR3). Live DB; per-test ROLLBACK. Seeded through 5.4's writers (`createPendingOptIn`,
// `activateOptIn`, `revokeOptIn`) and the consent writer (`recordConsent`, `revokeConsent`) — the order 5.4's activation uses —
// EXCEPT the one split-state leg (ACTIVE but consent revoked), which 5.4's writers never produce (they revoke both together),
// so it is seeded by revoking ONLY the consent row.
// 2026-10-21 Story 5.12 (`-364` option A; AC1) — the 24-hour reach (F14) is GONE: the SHARED read has ⛔ clock, so an ACTIVE yes
// past its window counts (Closed by 5.12). The EXPIRED case is seeded by INSERT — the 0177 trigger refuses ACTIVE → EXPIRED.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { recordConsent, revokeConsent } from '../../../src/consent/write.js';
import type { Db } from '../../../src/db.js';
import { consentId as toConsentId, memberId as toMemberId, type MemberId } from '../../../src/ids/index.js';
import { activateOptIn, createPendingOptIn, isPeerMeshWaReminderOptedIn, revokeOptIn } from '../../../src/wa-opt-in/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const HOUR = 3600 * 1000;

/** 5.4's activation, as the webhook worker does it: consent minted, then PENDING → ACTIVE carrying its id. */
async function optIn(tx: Db, memberId: MemberId, windowExpiresAt: Date | null) {
  const pending = await createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId, mobileBlindIndex: `blind-${randomUUID()}` });
  const consentId = toConsentId(randomUUID());
  await recordConsent(tx, {
    pariwarId: PARIWAR_A,
    subjectId: memberId,
    consentType: 'whatsapp_opt_in',
    grantedViaActor: 'member_self',
    consentPayload: { source: 'meta_webhook_inbound' },
    consentId,
  });
  // `activateOptIn` requires a window; a NULL window is set afterwards by the one leg that needs it.
  const row = await activateOptIn(tx, { pariwarId: PARIWAR_A, optInId: pending.optInId, windowExpiresAt: windowExpiresAt ?? new Date(Date.now() + HOUR), consentId });
  return { optInId: row.optInId, consentId };
}

const member = (): MemberId => toMemberId(randomUUID());
const opted = (tx: Db, memberId: MemberId) => isPeerMeshWaReminderOptedIn(tx, { pariwarId: PARIWAR_A, memberId });

describe.skipIf(!hasDatabase)('isPeerMeshWaReminderOptedIn — the reminder\'s ONE opt-in read (Story 6.31 WR3)', () => {
  setupLiveDb();

  it('ACTIVE with a live window AND consent ⇒ true', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m = member();
    await optIn(tx, m, new Date(Date.now() + 23 * HOUR));
    expect(await opted(tx, m)).toBe(true);
  });

  it('ACTIVE with a NULL window_expires_at AND consent ⇒ true', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m = member();
    const { optInId } = await optIn(tx, m, null);
    await client.query(`UPDATE member_wa_opt_in SET window_expires_at = NULL WHERE opt_in_id = $1`, [optInId]);
    expect(await opted(tx, m)).toBe(true);
  });

  // 2026-10-21 Story 5.12 (AC1) — FLIPPED: was "⇒ false" (the 24-hour reach — F14); a yes now lasts until withdrawn.
  it('ACTIVE past window_expires_at AND consent ⇒ true (Story 5.12 — a yes has ⛔ clock)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m = member();
    const { optInId } = await optIn(tx, m, new Date(Date.now() + HOUR));
    await client.query(`UPDATE member_wa_opt_in SET window_expires_at = now() - interval '7 days' WHERE opt_in_id = $1`, [optInId]);
    expect(await opted(tx, m)).toBe(true);
  });

  it('EXPIRED_24H_WINDOW, REVOKED and BLOCKED_BY_META ⇒ false', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    for (const toState of ['REVOKED', 'BLOCKED_BY_META'] as const) {
      const m = member();
      const { optInId } = await optIn(tx, m, new Date(Date.now() + 23 * HOUR));
      await revokeOptIn(tx, { pariwarId: PARIWAR_A, optInId, toState });
      expect(await opted(tx, m), toState).toBe(false);
    }
    // 2026-10-21 Story 5.12 — re-seeded: ACTIVE → EXPIRED is refused (revokeOptIn and the 0177 trigger), so the EXPIRED case is
    // a raw INSERT carrying an open consent (the legacy shape) — still ⇒ false.
    const m = member();
    const consentId = toConsentId(randomUUID());
    await recordConsent(tx, {
      pariwarId: PARIWAR_A,
      subjectId: m,
      consentType: 'whatsapp_opt_in',
      grantedViaActor: 'member_self',
      consentPayload: { source: 'meta_webhook_inbound' },
      consentId,
    });
    await client.query(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, consent_id)
       VALUES ($1, $2, 'EXPIRED_24H_WINDOW', $3, $4, $5)`,
      [PARIWAR_A, m, `TWT-${randomUUID().slice(0, 8)}`, `blind-${randomUUID()}`, consentId],
    );
    expect(await opted(tx, m), 'EXPIRED_24H_WINDOW').toBe(false);
  });

  it('PENDING (never matched) and no opt-in row at all ⇒ false', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pendingOnly = member();
    await createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId: pendingOnly, mobileBlindIndex: 'blind-pending' });
    expect(await opted(tx, pendingOnly)).toBe(false);
    expect(await opted(tx, member())).toBe(false);
  });

  it('ACTIVE but the consent REVOKED ⇒ false (⚠ a split state 5.4\'s writers never produce — seeded by revoking ONLY the consent row)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m = member();
    const { consentId } = await optIn(tx, m, new Date(Date.now() + 23 * HOUR));
    expect(await opted(tx, m)).toBe(true);
    await revokeConsent(tx, { pariwarId: PARIWAR_A, consentId, reason: 'test: split state' });
    expect(await opted(tx, m)).toBe(false);
  });

  it('another Pariwar\'s opt-in is ⛔ read: the same member id under Pariwar B ⇒ false', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m = member();
    await optIn(tx, m, new Date(Date.now() + 23 * HOUR));
    await enterAppScope(client, PARIWAR_B);
    expect(await isPeerMeshWaReminderOptedIn(tx, { pariwarId: PARIWAR_B, memberId: m })).toBe(false);
  });
});
