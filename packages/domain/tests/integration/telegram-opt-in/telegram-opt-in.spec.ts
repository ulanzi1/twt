// member_telegram_opt_in + telegram_inbound_webhook_events accessors — live-DB integration (Story 5.5, Task
// 3/11).
//
// Drives the domain Telegram opt-in state-machine + webhook-queue accessors against real Postgres inside the
// per-test BEGIN/ROLLBACK envelope. Families:
//   · createPendingOptIn — mints PENDING; a second PENDING for the same member throws
//     TelegramOptInPendingExistsError.
//   · partial-unique code — createPendingOptIn regenerates the code on a (pariwar, code) PENDING collision.
//   · matchPendingOptIn — matches on (code, PENDING); a mismatch → null (the code ALONE is the match key).
//   · activateOptIn / revokeOptIn — legal transitions succeed (ACTIVE captures chat_id); illegal edges throw.
//   · isOptInActive — just state === 'ACTIVE' (NO window); getChatIdForMember returns the captured chat id.
//   · getActiveOptInByChatId — resolves the ACTIVE opt-in for `/stop` / block.
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
  generateVerificationCode,
  getActiveOptInByChatId,
  getChatIdForMember,
  getOptInForMember,
  isOptInActive,
  markWebhookEventProcessed,
  matchPendingOptIn,
  persistInboundWebhookEvent,
  revokeOptIn,
  TelegramOptInPendingExistsError,
  TelegramOptInStateError,
} from '../../../src/telegram-opt-in/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const CHAT_A = 'chat-1000001';

describe.skipIf(!hasDatabase)('member_telegram_opt_in accessors — state machine + RLS (:5433)', () => {
  setupLiveDb();

  it('createPendingOptIn mints PENDING; a second PENDING for the same member is rejected', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const member = toMemberId(randomUUID());

    const first = await createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId: member });
    expect(first.state).toBe('PENDING');
    expect(first.verificationCode).toMatch(/^TWT-/);
    expect(first.chatId).toBeNull();

    await expect(
      createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId: member }),
    ).rejects.toBeInstanceOf(TelegramOptInPendingExistsError);
  });

  it('createPendingOptIn regenerates the code on a PENDING (pariwar, code) collision', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const code = generateVerificationCode();

    const a = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(randomUUID()),
      verificationCode: code,
    });
    expect(a.verificationCode).toBe(code);

    // A DIFFERENT member forcing the SAME code → the partial-unique index conflicts → regenerate.
    const b = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(randomUUID()),
      verificationCode: code,
    });
    expect(b.verificationCode).not.toBe(code);
    expect(b.state).toBe('PENDING');
  });

  it('matchPendingOptIn matches on (code, PENDING); a mismatch is null', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pending = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(randomUUID()),
    });

    const matched = await matchPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      verificationCode: pending.verificationCode,
    });
    expect(matched?.optInId).toBe(pending.optInId);

    // Wrong code → no match.
    expect(
      await matchPendingOptIn(tx, { pariwarId: PARIWAR_A, verificationCode: 'TWT-WRONGONE' }),
    ).toBeNull();
  });

  it('activateOptIn PENDING→ACTIVE captures chat_id; activating a non-PENDING row throws', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const member = toMemberId(randomUUID());
    const pending = await createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId: member });
    const activated = await activateOptIn(tx, {
      pariwarId: PARIWAR_A,
      optInId: pending.optInId,
      chatId: CHAT_A,
      consentId: toConsentId(randomUUID()),
    });
    expect(activated.state).toBe('ACTIVE');
    expect(activated.chatId).toBe(CHAT_A);
    expect(activated.matchedAt).not.toBeNull();

    // The captured chat id is the delivery address.
    expect(await getChatIdForMember(tx, { pariwarId: PARIWAR_A, memberId: member })).toBe(CHAT_A);

    // Re-activating (a webhook replay) is an illegal transition.
    await expect(
      activateOptIn(tx, {
        pariwarId: PARIWAR_A,
        optInId: pending.optInId,
        chatId: CHAT_A,
        consentId: toConsentId(randomUUID()),
      }),
    ).rejects.toBeInstanceOf(TelegramOptInStateError);
  });

  it('revokeOptIn drives the legal terminal edges; an illegal edge throws', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pending = await createPendingOptIn(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(randomUUID()),
    });
    await activateOptIn(tx, {
      pariwarId: PARIWAR_A,
      optInId: pending.optInId,
      chatId: CHAT_A,
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
      revokeOptIn(tx, { pariwarId: PARIWAR_A, optInId: pending.optInId, toState: 'BLOCKED' }),
    ).rejects.toBeInstanceOf(TelegramOptInStateError);
  });

  it('BLOCKED is legal from ACTIVE; EXPIRED is legal from PENDING (stale sweep)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // BLOCKED ← ACTIVE.
    const active = await createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(randomUUID()) });
    await activateOptIn(tx, {
      pariwarId: PARIWAR_A,
      optInId: active.optInId,
      chatId: CHAT_A,
      consentId: toConsentId(randomUUID()),
    });
    const blocked = await revokeOptIn(tx, { pariwarId: PARIWAR_A, optInId: active.optInId, toState: 'BLOCKED' });
    expect(blocked.state).toBe('BLOCKED');

    // EXPIRED ← PENDING.
    const pending = await createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(randomUUID()) });
    const expired = await revokeOptIn(tx, { pariwarId: PARIWAR_A, optInId: pending.optInId, toState: 'EXPIRED' });
    expect(expired.state).toBe('EXPIRED');

    // EXPIRED is NOT legal from ACTIVE (there is no past-window sweep).
    const active2 = await createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(randomUUID()) });
    await activateOptIn(tx, {
      pariwarId: PARIWAR_A,
      optInId: active2.optInId,
      chatId: 'chat-2',
      consentId: toConsentId(randomUUID()),
    });
    await expect(
      revokeOptIn(tx, { pariwarId: PARIWAR_A, optInId: active2.optInId, toState: 'EXPIRED' }),
    ).rejects.toBeInstanceOf(TelegramOptInStateError);
  });

  it('isOptInActive: ACTIVE → true (no window check); PENDING → false', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const member = toMemberId(randomUUID());
    const pending = await createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId: member });
    expect(await isOptInActive(tx, { pariwarId: PARIWAR_A, memberId: member })).toBe(false);

    await activateOptIn(tx, {
      pariwarId: PARIWAR_A,
      optInId: pending.optInId,
      chatId: CHAT_A,
      consentId: toConsentId(randomUUID()),
    });
    expect(await isOptInActive(tx, { pariwarId: PARIWAR_A, memberId: member })).toBe(true);
  });

  it('getActiveOptInByChatId resolves the ACTIVE opt-in for `/stop` / block', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const pending = await createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId: toMemberId(randomUUID()) });
    await activateOptIn(tx, {
      pariwarId: PARIWAR_A,
      optInId: pending.optInId,
      chatId: CHAT_A,
      consentId: toConsentId(randomUUID()),
    });
    const found = await getActiveOptInByChatId(tx, { pariwarId: PARIWAR_A, chatId: CHAT_A });
    expect(found?.optInId).toBe(pending.optInId);
    expect(await getActiveOptInByChatId(tx, { pariwarId: PARIWAR_A, chatId: 'chat-nope' })).toBeNull();
  });

  it('cross-tenant RLS: a PARIWAR_B opt-in is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_B);
    const member = toMemberId(randomUUID());
    await createPendingOptIn(tx, { pariwarId: PARIWAR_B, memberId: member });
    await setPariwarScope(client, PARIWAR_A);
    expect(await getOptInForMember(tx, { pariwarId: PARIWAR_B, memberId: member })).toBeNull();
  });
});

describe.skipIf(!hasDatabase)('telegram_inbound_webhook_events accessors — persist + drain (:5433)', () => {
  setupLiveDb();

  it('persist → claim (unprocessed) → markProcessed drains the queue', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const persisted = await persistInboundWebhookEvent(tx, {
      pariwarId: PARIWAR_A,
      rawPayload: { update_id: 1, message: { text: '/start TWT-ABCDEFGH' } },
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
