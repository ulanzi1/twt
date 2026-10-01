// The correction CLOSURE's compound read models — their SHAPE against adversarial decoys, live DB (:5433). Story 6.19c
// (AC11c "a `*-shape.spec.ts` per compound read model"; the AI-6-3 class, exemplar `correction-chase-shape.spec.ts`).
//
// Each read is asked about ONE claim while DECOYS sit beside it that a wrong join or a missing predicate would pick up:
//   · a SECOND claim of the same Pariwar with its OWN closure (a different state, its own notes, its own direction);
//   · a HELD closures row whose return has STOPPED BEING LIVE (S-T9 — a stale hold must hold nothing, list nowhere);
//   · a direction to ANOTHER actor (the inbox is the caller's own);
//   · a CLOSED claim whose letter is already delivered (owed ⇒ listed; delivered ⇒ ⛔ not).
// ⭐ Every assertion names the claim's OWN ids — ⛔ never a count over a shared table, ⛔ never `every` over a list that may
// be empty. And every row carries ⛔ no name, ⛔ no number, ⛔ no address: the key sets are pinned EXACTLY (a new field is a
// deliberate change to this file).

import { describe, expect, it } from 'vitest';

import {
  isCorrectionClaimHeld,
  listClosureLettersOwed,
  listEscalatedClosures,
  listOpenDirectionsFor,
  listPariwarClosureQueue,
  readClosureReadiness,
  readEscalatedClosureDetail,
  recordClosureDirection,
  recordClosureLetter,
  recordClosureLetterDelivery,
  recordCorrectionLetter,
  recordCorrectionLetterDelivery,
} from '../../../src/claim/index.js';
import { istDateOf } from '../../../src/claim/correction-schedule.js';
import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';
import { DA, ENC, SA, approve, asSuperuser, decline, familyRow, reachedClaim, request, returnedClaim } from './_correction-closure-fixture.js';

describe.skipIf(!hasDatabase)('the closure read models — shape against decoys (6.19c)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('⭐ the Pariwar Admin\'s queue: ITS OWN pending request with its note ciphertext and run day 0 — ⛔ never a decoy\'s escalated row', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mine = await reachedClaim(client, tx);
    await request(client, mine);
    const decoy = await reachedClaim(client, tx);
    await request(client, decoy);
    await decline(client, decoy);

    const queue = await listPariwarClosureQueue(tx, PARIWAR_A, { limit: 200 });
    const own = queue.find((i) => i.claimCaseId === mine.cid);
    expect(own).toMatchObject({ kind: 'closure_request', familyRunDay0: mine.day0, checkedAfterRecord: null, held: false });
    expect(own!.noteCiphertext).toBe('enc:v1:request-note');
    expect(Object.keys(own!).sort()).toEqual(
      ['at', 'byDisplay', 'checkedAfterRecord', 'claimCaseId', 'deceasedMemberId', 'familyRunDay0', 'held', 'kind', 'noteCiphertext', 'shortReference'].sort(),
    );
    // The decoy is ESCALATED — ⛔ no longer a pending request.
    expect(queue.some((i) => i.claimCaseId === decoy.cid)).toBe(false);
  });

  it('⭐ the Super Admin\'s queue and detail: ITS OWN held row, its own directions only; a held row whose return STOPPED being live holds and lists ⛔ nothing (S-T9)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mine = await reachedClaim(client, tx);
    await request(client, mine);
    await decline(client, mine);
    await recordClosureDirection(client, {
      pariwarId: PARIWAR_A, claimCaseId: mine.cid, actorId: SA, actorDisplay: 'SA', now: mine.day(98),
      directedToActor: DA, directedToRole: 'district_admin', kind: 'other', textCiphertext: 'enc:v1:mine',
    });
    const other = await reachedClaim(client, tx);
    await request(client, other);
    await decline(client, other);
    await recordClosureDirection(client, {
      pariwarId: PARIWAR_A, claimCaseId: other.cid, actorId: SA, actorDisplay: 'SA', now: other.day(98),
      directedToActor: SA, directedToRole: 'pariwar_admin', kind: 'other', textCiphertext: 'enc:v1:other',
    });
    const stale = await reachedClaim(client, tx);
    await request(client, stale);
    await decline(client, stale);
    // The stale decoy's return stops being live (a later act superseded it) — its row is still `escalated`.
    await asSuperuser(client, () =>
      client.query('UPDATE claim_state_trustee_decisions SET superseded_at = now() WHERE decision_id = $1', [stale.returnId]),
    );

    const list = await listEscalatedClosures(tx, PARIWAR_A, { limit: 200 });
    const own = list.find((i) => i.claimCaseId === mine.cid);
    expect(own).toMatchObject({ origin: 'declined_closure', state: 'escalated', openDirections: 1, underReviewSince: null });
    expect(Object.keys(own!).sort()).toEqual(
      ['claimCaseId', 'closureId', 'deceasedMemberId', 'escalatedAt', 'openDirections', 'origin', 'shortReference', 'state', 'underReviewSince'].sort(),
    );
    expect(list.some((i) => i.claimCaseId === stale.cid)).toBe(false);
    expect(await readEscalatedClosureDetail(tx, PARIWAR_A, stale.cid)).toBeNull();
    expect(await isCorrectionClaimHeld(tx, PARIWAR_A, stale.cid)).toBe(false);

    const detail = await readEscalatedClosureDetail(tx, PARIWAR_A, mine.cid);
    expect(detail!.closure.claimCaseId).toBe(mine.cid);
    expect(detail!.directions.map((d) => d.textCiphertext)).toEqual(['enc:v1:mine']);
    expect(detail!.marks.length).toBeGreaterThan(0);
    for (const m of detail!.marks) {
      expect(Object.keys(m).sort()).toEqual(['isReturnMark', 'mustAct', 'noteCiphertext', 'setAt', 'setByDisplay', 'setByRole'].sort());
    }
    // ⭐ The detail's key set, pinned: states, codes, ids and staff notes — ⛔ no name, ⛔ no number, ⛔ no address.
    expect(Object.keys(detail!).sort()).toEqual(
      ['closure', 'currentState', 'deceasedMemberId', 'directions', 'familyPartDone', 'marks', 'nameCheckState', 'resubmitted', 'shortReference'].sort(),
    );
  });

  it('⭐ the inbox is the CALLER\'S own: a direction to another actor is ⛔ not listed; an answered one leaves it', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await reachedClaim(client, tx);
    await request(client, c);
    await decline(client, c);
    const toMe = await recordClosureDirection(client, {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: SA, actorDisplay: 'SA', now: c.day(98),
      directedToActor: DA, directedToRole: 'district_admin', kind: 'other', textCiphertext: 'enc:v1:to-me',
    });
    const toOther = await recordClosureDirection(client, {
      pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: SA, actorDisplay: 'SA', now: c.day(98),
      directedToActor: SA, directedToRole: 'pariwar_admin', kind: 'other', textCiphertext: 'enc:v1:to-other',
    });
    const inbox = await listOpenDirectionsFor(tx, PARIWAR_A, DA);
    expect(inbox.some((i) => i.direction.directionId === toMe.direction.directionId && i.stillHeld)).toBe(true);
    expect(inbox.some((i) => i.direction.directionId === toOther.direction.directionId)).toBe(false);
    expect(Object.keys(inbox.find((i) => i.direction.directionId === toMe.direction.directionId)!).sort()).toEqual(
      ['direction', 'shortReference', 'stillHeld'].sort(),
    );
  });

  it('⭐ the letters owed: ITS OWN closed claim and person; a decoy whose letter is DELIVERED is ⛔ not listed', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const owed = await returnedClaim(client, { mustAct: 'family' });
    await familyRow(tx, owed, 'rejected_invalid_number');
    const delivered = await returnedClaim(client, { mustAct: 'family' });
    await familyRow(tx, delivered, 'rejected_invalid_number');
    // Each is reached ONLY by a delivered correction letter (number dead) ⇒ the closure owes each a closure letter.
    for (const c of [owed, delivered]) {
      const l = await recordCorrectionLetter(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, personKey: c.person.personKey, postedOn: addCalendarDays(c.day0, 5),
        trackingNumberCiphertext: 'enc:v1:t', actorId: DA, actorDisplay: 'DA', crypto: ENC,
      });
      await recordCorrectionLetterDelivery(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, letterId: l.letterId, deliveredOn: addCalendarDays(c.day0, 9),
        screenshotStorageKey: 'k', screenshotContentType: 'image/png', screenshotSizeBytes: 1, actorId: DA, actorDisplay: 'DA',
      });
      await request(client, c);
      await approve(client, c);
    }
    const closedOn = istDateOf(new Date());
    const l2 = await recordClosureLetter(client, {
      pariwarId: PARIWAR_A, claimCaseId: delivered.cid, personKey: delivered.person.personKey, postedOn: closedOn,
      trackingNumberCiphertext: 'enc:v1:c', actorId: DA, actorDisplay: 'DA',
    });
    await recordClosureLetterDelivery(client, {
      pariwarId: PARIWAR_A, claimCaseId: delivered.cid, letterId: l2.letterId, deliveredOn: closedOn,
      screenshotStorageKey: 'k2', screenshotContentType: 'image/png', screenshotSizeBytes: 1, actorId: DA, actorDisplay: 'DA',
    });

    const list = await listClosureLettersOwed(tx, PARIWAR_A, closedOn, { limit: 200 });
    const own = list.find((i) => i.claimCaseId === owed.cid);
    expect(own!.people).toEqual([{ personKey: owed.person.personKey, letter: null }]);
    expect(Object.keys(own!).sort()).toEqual(['claimCaseId', 'closedOn', 'daysSinceClosure', 'deceasedMemberId', 'people', 'shortReference'].sort());
    expect(list.some((i) => i.claimCaseId === delivered.cid)).toBe(false);
  });

  it('readiness carries states, dates and codes ONLY — ⛔ no note, ⛔ no name', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await reachedClaim(client, tx);
    await request(client, c);
    const r = await readClosureReadiness(tx, PARIWAR_A, c.cid, c.day(96), { crypto: ENC });
    expect(Object.keys(r).sort()).toEqual(['blocker', 'familyRunDay', 'notReached', 'origin', 'requestedAt', 'requestedByDisplay', 'state'].sort());
    expect(r).toMatchObject({ state: 'requested', blocker: 'request_pending', familyRunDay: 96 });
  });
});
