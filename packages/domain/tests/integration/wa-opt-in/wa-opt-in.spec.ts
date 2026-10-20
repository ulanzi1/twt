// member_wa_opt_in + wa_inbound_webhook_events accessors — live-DB integration (Story 5.4, Task 3/4).
//
// Drives the domain WA opt-in state-machine + webhook-queue accessors against real Postgres inside the
// per-test BEGIN/ROLLBACK envelope. Families:
//   · createPendingOptIn — mints PENDING; a second PENDING for the same member throws WaOptInPendingExistsError.
//   · partial-unique phrase — createPendingOptIn regenerates the phrase on a (pariwar, phrase) PENDING collision.
//   · matchPendingOptIn — matches on (mobile blind index, phrase, PENDING); mismatch → null.
//   · activateOptIn / revokeOptIn — legal transitions succeed; illegal edges throw WaOptInStateError.
//   · isOptInActive — Story 5.12 (`-364` option A; AC1): ACTIVE is true whatever its window (past, future, NULL); PENDING,
//     REVOKED, BLOCKED_BY_META, EXPIRED_24H_WINDOW and ⛔ row are false — ⛔ clock.
//   · Story 5.12 (AC2) — ⛔ yes expires: revokeOptIn refuses ACTIVE → EXPIRED; the 0177 trigger refuses a raw UPDATE into
//     EXPIRED from ACTIVE / REVOKED / BLOCKED (23000) and allows it from PENDING; one ACTIVE per member (23505).
//   · webhook events — persist + claim + markProcessed drain lifecycle.
//   · cross-tenant RLS — a PARIWAR_B opt-in is invisible under PARIWAR_A scope.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import {
  consentId as toConsentId,
  memberId as toMemberId,
} from '../../../src/ids/index.js';
import {
  activateOptIn,
  claimUnprocessedWebhookEvents,
  createPendingOptIn,
  generateVerificationPhrase,
  getOptInForMember,
  isOptInActive,
  markWebhookEventProcessed,
  matchPendingOptIn,
  persistInboundWebhookEvent,
  revokeOptIn,
  WaOptInPendingExistsError,
  WaOptInStateError,
} from '../../../src/wa-opt-in/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const BLIND_A = 'blindindex-aaaa';

describe.skipIf(!hasDatabase)('member_wa_opt_in accessors — state machine + RLS (:5433)', () => {
  setupLiveDb();

  it('createPendingOptIn mints PENDING; a second PENDING for the same member is rejected', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const member = toMemberId(randomUUID());

    const first = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: member,
      mobileBlindIndex: BLIND_A,
    });
    expect(first.state).toBe('PENDING');
    expect(first.verificationPhrase).toMatch(/^TWT-/);

    await expect(
      createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId: member, mobileBlindIndex: BLIND_A }),
    ).rejects.toBeInstanceOf(WaOptInPendingExistsError);
  });

  it('createPendingOptIn regenerates the phrase on a PENDING (pariwar, phrase) collision', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const phrase = generateVerificationPhrase();

    const a = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(randomUUID()),
      mobileBlindIndex: 'blind-1',
      verificationPhrase: phrase,
    });
    expect(a.verificationPhrase).toBe(phrase);

    // A DIFFERENT member forcing the SAME phrase → the partial-unique index conflicts → regenerate.
    const b = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(randomUUID()),
      mobileBlindIndex: 'blind-2',
      verificationPhrase: phrase,
    });
    expect(b.verificationPhrase).not.toBe(phrase);
    expect(b.state).toBe('PENDING');
  });

  it('matchPendingOptIn matches on (blind index, phrase, PENDING); a mismatch is null', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pending = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(randomUUID()),
      mobileBlindIndex: BLIND_A,
    });

    const matched = await matchPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      mobileBlindIndex: BLIND_A,
      verificationPhrase: pending.verificationPhrase,
    });
    expect(matched?.optInId).toBe(pending.optInId);

    // Wrong phrase → no match (the phrase is the disambiguator).
    expect(
      await matchPendingOptIn(tx, {
        pariwarId: PARIWAR_A,
        mobileBlindIndex: BLIND_A,
        verificationPhrase: 'TWT-WRONGONE',
      }),
    ).toBeNull();
  });

  it('activateOptIn PENDING→ACTIVE; activating a non-PENDING row throws', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pending = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(randomUUID()),
      mobileBlindIndex: BLIND_A,
    });
    const windowExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    const activated = await activateOptIn(tx, {
      pariwarId: PARIWAR_A,
      optInId: pending.optInId,
      windowExpiresAt,
      consentId: toConsentId(randomUUID()),
    });
    expect(activated.state).toBe('ACTIVE');
    expect(activated.matchedAt).not.toBeNull();

    // Re-activating (a webhook replay) is an illegal transition.
    await expect(
      activateOptIn(tx, {
        pariwarId: PARIWAR_A,
        optInId: pending.optInId,
        windowExpiresAt,
        consentId: toConsentId(randomUUID()),
      }),
    ).rejects.toBeInstanceOf(WaOptInStateError);
  });

  it('revokeOptIn drives the legal terminal edges; an illegal edge throws', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const member = toMemberId(randomUUID());
    const pending = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: member,
      mobileBlindIndex: BLIND_A,
    });
    await activateOptIn(tx, {
      pariwarId: PARIWAR_A,
      optInId: pending.optInId,
      windowExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      consentId: toConsentId(randomUUID()),
    });
    const revoked = await revokeOptIn(tx, {
      pariwarId: PARIWAR_A,
      optInId: pending.optInId,
      toState: 'REVOKED',
    });
    expect(revoked.state).toBe('REVOKED');

    // REVOKED is terminal — a second revoke is illegal.
    await expect(
      revokeOptIn(tx, { pariwarId: PARIWAR_A, optInId: pending.optInId, toState: 'BLOCKED_BY_META' }),
    ).rejects.toBeInstanceOf(WaOptInStateError);
  });

  it('EXPIRED_24H_WINDOW is legal from PENDING (stale sweep)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pending = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(randomUUID()),
      mobileBlindIndex: BLIND_A,
    });
    const expired = await revokeOptIn(tx, {
      pariwarId: PARIWAR_A,
      optInId: pending.optInId,
      toState: 'EXPIRED_24H_WINDOW',
    });
    expect(expired.state).toBe('EXPIRED_24H_WINDOW');
  });

  // 2026-10-21 Story 5.12 (AC1) — replaces 5.4's "past window → false": a yes has ⛔ clock (`-364` option A).
  it('⭐ isOptInActive: ACTIVE → true whatever its window (past, future, NULL); PENDING / REVOKED / BLOCKED / EXPIRED / ⛔ row → false', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const member = toMemberId(randomUUID());
    const pending = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: member,
      mobileBlindIndex: BLIND_A,
    });
    // PENDING → not active.
    expect(await isOptInActive(tx, { pariwarId: PARIWAR_A, memberId: member })).toBe(false);

    await activateOptIn(tx, {
      pariwarId: PARIWAR_A,
      optInId: pending.optInId,
      windowExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      consentId: toConsentId(randomUUID()),
    });
    expect(await isOptInActive(tx, { pariwarId: PARIWAR_A, memberId: member })).toBe(true);
    for (const window of ["now() - interval '7 days'", 'NULL', "now() + interval '1 hour'"]) {
      await client.query(`UPDATE member_wa_opt_in SET window_expires_at = ${window} WHERE opt_in_id = $1`, [pending.optInId]);
      expect(await isOptInActive(tx, { pariwarId: PARIWAR_A, memberId: member }), window).toBe(true);
    }

    for (const state of ['PENDING', 'REVOKED', 'BLOCKED_BY_META', 'EXPIRED_24H_WINDOW'] as const) {
      const m = toMemberId(randomUUID());
      await client.query(
        `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, window_expires_at)
         VALUES ($1, $2, $3, $4, $5, now() + interval '1 day')`,
        [PARIWAR_A, m, state, generateVerificationPhrase(), BLIND_A],
      );
      expect(await isOptInActive(tx, { pariwarId: PARIWAR_A, memberId: m }), state).toBe(false);
    }
    expect(await isOptInActive(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(randomUUID()) })).toBe(false);
  });

  it('⭐ Story 5.12 AC2 — revokeOptIn(…, EXPIRED_24H_WINDOW) on an ACTIVE row throws WaOptInStateError (a yes never expires)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pending = await createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(randomUUID()), mobileBlindIndex: BLIND_A });
    await activateOptIn(tx, {
      pariwarId: PARIWAR_A,
      optInId: pending.optInId,
      windowExpiresAt: new Date(Date.now() - 3600 * 1000),
      consentId: toConsentId(randomUUID()),
    });
    await expect(revokeOptIn(tx, { pariwarId: PARIWAR_A, optInId: pending.optInId, toState: 'EXPIRED_24H_WINDOW' })).rejects.toBeInstanceOf(
      WaOptInStateError,
    );
  });

  it('⭐ Story 5.12 AC2 — the 0177 trigger: a raw UPDATE into EXPIRED is REFUSED from ACTIVE / REVOKED / BLOCKED (23000), allowed from PENDING; INSERT and a non-state UPDATE of an EXPIRED row pass', async () => {
    const { client } = getTx();
    const insert = async (state: string) =>
      (
        await client.query<{ opt_in_id: string }>(
          `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index) VALUES ($1, $2, $3, $4, $5) RETURNING opt_in_id`,
          [PARIWAR_A, randomUUID(), state, generateVerificationPhrase(), BLIND_A],
        )
      ).rows[0]!.opt_in_id;
    /** Run one probe under a SAVEPOINT (a refused statement would otherwise abort the per-test tx); its SQLSTATE or null. */
    async function probe(sql: string, params: unknown[]): Promise<{ code: string | null; message: string }> {
      await client.query('SAVEPOINT p');
      try {
        await client.query(sql, params);
        await client.query('RELEASE SAVEPOINT p');
        return { code: null, message: '' };
      } catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT p');
        const e = err as { code?: string; message?: string; constraint?: string };
        return { code: e.code ?? 'unknown', message: `${e.message ?? ''} ${e.constraint ?? ''}` };
      }
    }
    const toExpired = `UPDATE member_wa_opt_in SET state = 'EXPIRED_24H_WINDOW' WHERE opt_in_id = $1`;
    for (const state of ['ACTIVE', 'REVOKED', 'BLOCKED_BY_META']) {
      const r = await probe(toExpired, [await insert(state)]);
      expect(r.code, state).toBe('23000');
      expect(r.message, state).toContain('lasts until withdrawn');
    }
    expect((await probe(toExpired, [await insert('PENDING')])).code).toBeNull();
    // The trigger is UPDATE-only: an INSERT of an EXPIRED row passes; so does an update that leaves an EXPIRED row EXPIRED.
    const expired = await insert('EXPIRED_24H_WINDOW');
    expect((await probe(`UPDATE member_wa_opt_in SET updated_at = now(), mobile_blind_index = 'scrubbed' WHERE opt_in_id = $1`, [expired])).code).toBeNull();
    expect((await probe(`UPDATE member_wa_opt_in SET state = 'EXPIRED_24H_WINDOW' WHERE opt_in_id = $1`, [expired])).code).toBeNull();
  });

  it('⭐ Story 5.12 AC2 — a second ACTIVE row for one member is refused (23505, member_wa_opt_in_active_member_uq)', async () => {
    const { client } = getTx();
    const m = randomUUID();
    const sql = `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index) VALUES ($1, $2, 'ACTIVE', $3, $4)`;
    await client.query(sql, [PARIWAR_A, m, generateVerificationPhrase(), BLIND_A]);
    const err = await client.query(sql, [PARIWAR_A, m, generateVerificationPhrase(), BLIND_A]).then(
      () => null,
      (e: { code?: string; constraint?: string }) => e,
    );
    expect(err?.code).toBe('23505');
    expect(err?.constraint).toBe('member_wa_opt_in_active_member_uq');
  });

  it('getOptInForMember returns the latest row', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const member = toMemberId(randomUUID());
    const pending = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: member,
      mobileBlindIndex: BLIND_A,
    });
    const row = await getOptInForMember(tx, { pariwarId: PARIWAR_A, memberId: member });
    expect(row?.optInId).toBe(pending.optInId);
  });

  it('cross-tenant RLS: a PARIWAR_B opt-in is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();
    // Seed a PENDING under B scope.
    await enterAppScope(client, PARIWAR_B);
    const member = toMemberId(randomUUID());
    await createPendingOptIn(tx, { pariwarId: PARIWAR_B, memberId: member, mobileBlindIndex: BLIND_A });
    // Re-scope to A — the B row must be invisible.
    await setPariwarScope(client, PARIWAR_A);
    expect(await getOptInForMember(tx, { pariwarId: PARIWAR_B, memberId: member })).toBeNull();
  });
});

describe.skipIf(!hasDatabase)('wa_inbound_webhook_events accessors — persist + drain (:5433)', () => {
  setupLiveDb();

  it('persist → claim (unprocessed) → markProcessed drains the queue', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const persisted = await persistInboundWebhookEvent(tx, {
      pariwarId: PARIWAR_A,
      rawPayload: { object: 'whatsapp_business_account', entry: [] },
      signatureVerified: true,
    });
    expect(persisted.processedAt).toBeNull();

    const claimed = await claimUnprocessedWebhookEvents(tx, 10);
    expect(claimed.map((e) => e.eventId)).toContain(persisted.eventId);

    await markWebhookEventProcessed(tx, persisted.eventId);
    const afterMark = await claimUnprocessedWebhookEvents(tx, 10);
    expect(afterMark.map((e) => e.eventId)).not.toContain(persisted.eventId);
  });
});
