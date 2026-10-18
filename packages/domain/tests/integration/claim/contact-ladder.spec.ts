// The DELIVERY LADDER through the REAL readers (Story 6.37c, Tasks 2–3; AC4, AC5, AC8 — `2026-10-17-350` ruling 1,
// `-351` 4 A / 5 A / 6 A; LD6–LD8; I2–I4). Live DB, per-test ROLLBACK (setupLiveDb), on the 6.19c closure fixture.
// Ladder rows are written straight into `claim_contact_ladders` (the sweep's own legs live in apps/jobs) and 6.37b's
// delivery state straight into `sms_send_deliveries` — every assertion reads back through the chase's ONE row reader
// (`readReturnFamilyRows` / `readClaimCertificateFamilyRows`), the person states, D22 and the closure gate's four
// callers ([[feedback_stub_must_call_not_transcribe]]).

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  assertCorrectionLetterRecordable,
  claimCorrectionReminder,
  correctionFamilyStopReason,
  closureNoticeRecipients,
  currentCorrectionNumberHash,
  evaluateCertificatePersonStates,
  finaliseCorrectionReminder,
  readClaimCertificateFamilyRows,
  readCertificateListItem,
  readClaimCertificateLetters,
  readClosureReach,
  readContactLadder,
  readCorrectionChaseSummary,
  readClosureReadiness,
  readReturnFamilyRows,
  readReturnPersonStates,
  recordCorrectionLetter,
  recordCorrectionLetterDelivery,
  resolveCorrectionChase,
  unsendContactLadderStep,
  abandonCertificateLadderSend,
  writeCertificateLadderEscalation,
  writeCorrectionLadderEscalation,
} from '../../../src/claim/index.js';
import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import type { ClaimId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';
import {
  DA,
  ENC,
  approve,
  asSuperuser,
  decline,
  expectRefused,
  request,
  resubmit,
  returnedClaim,
  superAdmin,
  type Client,
  type Returned,
  type Tx,
} from './_correction-closure-fixture.js';

/** A FINISHED `family_sms` (or `ladder_sms`) row of the person — returns its id. */
async function sendRow(
  tx: Tx,
  c: Returned,
  o: {
    readonly slotDay: number;
    readonly outcome?: 'accepted' | 'rejected_invalid_number' | 'rejected_unreachable' | 'no_target';
    readonly hash?: string | null;
    readonly purpose?: 'family_sms' | 'ladder_sms';
    readonly subjectKey?: string;
  },
): Promise<string> {
  const outcome = o.outcome ?? 'accepted';
  const hash =
    o.hash !== undefined
      ? o.hash
      : outcome === 'no_target'
        ? null
        : await currentCorrectionNumberHash(c.person.mobileCiphertext, c.person.mobileSource, PARIWAR_A, ENC);
  const jobId = `j-${randomUUID()}`;
  const claimed = await claimCorrectionReminder(tx, {
    pariwarId: PARIWAR_A,
    claimCaseId: c.cid,
    runId: c.runId,
    slotDay: o.slotDay,
    recipientKey: c.person.personKey,
    purpose: o.purpose ?? 'family_sms',
    subjectKey: o.subjectKey ?? '',
    sentOn: addCalendarDays(c.day0, o.slotDay),
    late: false,
    jobId,
    now: new Date(),
  });
  if (claimed.status !== 'claimed') throw new Error('claim');
  await finaliseCorrectionReminder(tx, {
    pariwarId: PARIWAR_A,
    reminderId: claimed.reminderId,
    jobId,
    outcome,
    providerMessageId: outcome === 'accepted' ? `pm${randomUUID().replace(/-/g, '')}` : null,
    recipientVersionId: c.person.versionId,
    recipientNumberHash: hash,
  });
  return claimed.reminderId;
}

/** 6.37b's record for a send (as the correlator's upsert leaves it). */
async function report(client: Client, kind: 'cr' | 'ce', rowId: string, state: 'delivered' | 'undelivered'): Promise<void> {
  await client.query(
    `INSERT INTO sms_send_deliveries (send_kind, send_row_id, pariwar_id, request_id, delivery_state, status_code, first_reported_at, reported_at)
     VALUES ($1, $2, $3, 'req1', $4, $5, now(), now())`,
    [kind, rowId, PARIWAR_A, state, state === 'delivered' ? '1' : '2'],
  );
}

/** A ladder row written straight (the sweep's writes are the jobs suite's). */
async function ladder(
  client: Client,
  c: Returned,
  o: {
    readonly originRowId: string;
    readonly originSlotDay: number;
    readonly state?: 'running' | 'concluded_undelivered' | 'ended_delivered' | 'ended_stopped';
    readonly concludedOn?: string;
    readonly hash?: string;
    readonly chase?: 'correction' | 'certificate';
    readonly runId?: string;
  },
): Promise<string> {
  const state = o.state ?? 'running';
  const hash = o.hash ?? (await currentCorrectionNumberHash(c.person.mobileCiphertext, c.person.mobileSource, PARIWAR_A, ENC))!;
  const originSentOn = addCalendarDays(c.day0, o.originSlotDay);
  const chase = o.chase ?? 'correction';
  const { rows } = await client.query<{ ladder_id: string }>(
    // Round 2 P31 — a CONCLUDED ladder resolved both steps (0170's `claim_contact_ladders_concluded_steps_check`): the
    // fixture records them `satisfied` (⛔ row) on their due dates.
    `INSERT INTO claim_contact_ladders (pariwar_id, claim_case_id, chase, run_id, return_decision_id, person_key, recipient_number_hash,
       origin_row_id, origin_sent_on, whatsapp_step, sms2_due_on, state, ended_at, concluded_on, end_detail,
       sms2_state, sms2_on, sms3_due_on, sms3_state, sms3_on, conclude_on)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'skipped:nominee_no_whatsapp', $10, $11, $12, $13, $14,
       $15, $16, $17, $15, $17, $18) RETURNING ladder_id`,
    [
      PARIWAR_A,
      c.cid,
      chase,
      o.runId ?? c.runId,
      chase === 'correction' ? c.returnId : null,
      c.person.personKey,
      hash,
      o.originRowId,
      originSentOn,
      addCalendarDays(originSentOn, 2),
      state,
      state === 'running' ? null : new Date(),
      state === 'concluded_undelivered' ? (o.concludedOn ?? addCalendarDays(originSentOn, 8)) : null,
      state === 'ended_stopped' ? 'stopped:run_ended' : null,
      state === 'concluded_undelivered' ? 'satisfied' : 'pending',
      state === 'concluded_undelivered' ? addCalendarDays(originSentOn, 2) : null,
      state === 'concluded_undelivered' ? addCalendarDays(originSentOn, 4) : null,
      state === 'concluded_undelivered' ? addCalendarDays(originSentOn, 8) : null,
    ],
  );
  return rows[0]!.ladder_id;
}

async function call(client: Client, c: Returned, outcome: 'reached' | 'not_reached', calledOn: string, chase: 'correction' | 'certificate' = 'correction') {
  await client.query(
    `INSERT INTO claim_contact_calls (pariwar_id, claim_case_id, person_key, chase, called_on, answered_by, outcome, recorded_by_actor, recorded_by_display)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'da', 'District Admin')`,
    [PARIWAR_A, c.cid, c.person.personKey, chase, calledOn, outcome === 'reached' ? 'the_person' : 'nobody', outcome],
  );
}

const rowsOf = (tx: Tx, c: Returned) => readReturnFamilyRows(tx, PARIWAR_A, c.cid, c.returnId);
const stateOf = async (tx: Tx, c: Returned) => (await readReturnPersonStates(tx, PARIWAR_A, { claimCaseId: c.cid, returnDecisionId: c.returnId }, [c.person], { crypto: ENC }))[0]!;
const reachOf = async (tx: Tx, c: Returned) => {
  const chase = await resolveCorrectionChase(tx, PARIWAR_A, c.cid, { crypto: ENC });
  return readClosureReach(tx, PARIWAR_A, c.cid, chase);
};
const readiness = (tx: Tx, c: Returned, n = 95) => readClosureReadiness(tx, PARIWAR_A, c.cid, c.day(n), { crypto: ENC });

describe.skipIf(!hasDatabase)('Story 6.37c — the delivery ladder through the real readers (:5433)', { timeout: 30000 }, () => {
  setupLiveDb();

  describe('AC4 — the conclusion and the ONE mapping per chase (LD6, LD7; I2–I4)', () => {
    it('⭐ a CONCLUDED ladder maps EVERY undelivered accepted row of its epoch — the origin, a later one, an EARLIER one — `deadOn` = the conclusion; a silent row stays accepted', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const earlier = await sendRow(tx, c, { slotDay: 1 });
      const silent = await sendRow(tx, c, { slotDay: 2 });
      const origin = await sendRow(tx, c, { slotDay: 3 });
      const later = await sendRow(tx, c, { slotDay: 4 });
      for (const id of [earlier, origin, later]) await report(client, 'cr', id, 'undelivered');
      const concludedOn = addCalendarDays(c.day0, 11);
      await ladder(client, c, { originRowId: origin, originSlotDay: 3, state: 'concluded_undelivered', concludedOn });
      const rows = await rowsOf(tx, c);
      expect(rows).toHaveLength(4);
      const byId = new Map(rows.map((r) => [r.reminderId, r]));
      for (const id of [earlier, origin, later]) {
        expect(byId.get(id)).toMatchObject({ outcome: 'rejected_unreachable', deadOn: concludedOn, concluded: true, deliveryState: 'undelivered' });
      }
      expect(byId.get(silent)).toMatchObject({ outcome: 'accepted', deliveryState: null });
      expect(byId.get(silent)!.concluded).toBeUndefined();
      const s = await stateOf(tx, c);
      expect(s.track).toMatchObject({ foundDeadOn: concludedOn, deadKind: 'not_delivered' });
      // Letter-eligible — the letter precondition accepts (B1: offered the letter route).
      await expect(assertCorrectionLetterRecordable(tx, PARIWAR_A, c.cid, c.person.personKey, concludedOn, { crypto: ENC })).resolves.toBeDefined();
      // ⛔ D22: the silent row still reaches them (`-351` 1 A).
      expect((await reachOf(tx, c)).people[0]).toMatchObject({ reachedBySms: true, reached: true });
    });

    // Review P8 — the sweep can run LATE (a missed tick): `concluded_on` then diverges from the schedule's own
    // on-time date. The mapping must key off the ladder's STORED `concluded_on`, never a re-derived on-time guess.
    it('⭐ a ladder concluded LATE (the sweep missed a tick) maps `deadOn` to the ACTUAL `concluded_on`, ⛔ the on-time date the schedule would have given', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const origin = await sendRow(tx, c, { slotDay: 3 });
      await report(client, 'cr', origin, 'undelivered');
      const onTimeConclusion = addCalendarDays(c.day0, 11); // origin day 3 + SMS2(2) + SMS3(2) + wait(4)
      const lateConclusion = addCalendarDays(c.day0, 15); // the sweep missed several ticks before catching up
      await ladder(client, c, { originRowId: origin, originSlotDay: 3, state: 'concluded_undelivered', concludedOn: lateConclusion });
      const rows = await rowsOf(tx, c);
      const row = rows.find((r) => r.reminderId === origin)!;
      expect(row).toMatchObject({ outcome: 'rejected_unreachable', deadOn: lateConclusion, concluded: true });
      expect(row.deadOn).not.toBe(onTimeConclusion);
      expect((await stateOf(tx, c)).track).toMatchObject({ foundDeadOn: lateConclusion });
    });

    it('⭐ I4 — a RUNNING, a STOPPED and an ENDED-delivered ladder change ⛔ row (an epoch with ⛔ concluded ladder reads as stored)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      for (const state of ['running', 'ended_stopped', 'ended_delivered'] as const) {
        const c = await returnedClaim(client);
        const origin = await sendRow(tx, c, { slotDay: 2 });
        await report(client, 'cr', origin, 'undelivered');
        await ladder(client, c, { originRowId: origin, originSlotDay: 2, state });
        const rows = await rowsOf(tx, c);
        expect(rows.map((r) => r.outcome)).toEqual(['accepted']);
        expect((await stateOf(tx, c)).track.foundDeadOn).toBeNull();
      }
    });

    it('⭐ I2 — every STORED outcome is byte-identical before / after the mapping (a row snapshot); `delivered_at` NULL', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const origin = await sendRow(tx, c, { slotDay: 3 });
      await report(client, 'cr', origin, 'undelivered');
      const snap = () => tx.select().from(schema.claimCorrectionReminders).where(eq(schema.claimCorrectionReminders.claimCaseId, c.cid as ClaimId));
      const before = await snap();
      await ladder(client, c, { originRowId: origin, originSlotDay: 3, state: 'concluded_undelivered' });
      expect((await rowsOf(tx, c))[0]!.outcome).toBe('rejected_unreachable');
      const after = await snap();
      expect(after).toEqual(before);
      expect(after.every((r) => r.deliveredAt === null)).toBe(true);
    });

    it('⭐ A→B→A — a concluded ladder in EACH A epoch: every row returned ONCE (⛔ a row-multiplying join), each mapped by its OWN epoch', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const a1 = await sendRow(tx, c, { slotDay: 1, hash: 'hash-a' });
      const b = await sendRow(tx, c, { slotDay: 2, hash: 'hash-b' });
      const a2 = await sendRow(tx, c, { slotDay: 3, hash: 'hash-a' });
      for (const id of [a1, b, a2]) await report(client, 'cr', id, 'undelivered');
      await ladder(client, c, { originRowId: a1, originSlotDay: 1, state: 'concluded_undelivered', concludedOn: addCalendarDays(c.day0, 9), hash: 'hash-a' });
      await ladder(client, c, { originRowId: a2, originSlotDay: 3, state: 'concluded_undelivered', concludedOn: addCalendarDays(c.day0, 12), hash: 'hash-a' });
      const rows = await rowsOf(tx, c);
      expect(rows.map((r) => r.reminderId)).toEqual([a1, b, a2]);
      expect(rows.map((r) => [r.outcome, r.deadOn ?? null])).toEqual([
        ['rejected_unreachable', addCalendarDays(c.day0, 9)],
        ['accepted', null],
        ['rejected_unreachable', addCalendarDays(c.day0, 12)],
      ]);
    });

    it('LD7 — a concluded origin sent BEFORE a send-time refusal ⇒ `foundDeadOn` = the refusal\'s date (the MIN) and its kind', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const origin = await sendRow(tx, c, { slotDay: 1 });
      await report(client, 'cr', origin, 'undelivered');
      await sendRow(tx, c, { slotDay: 5, outcome: 'rejected_invalid_number' });
      await ladder(client, c, { originRowId: origin, originSlotDay: 1, state: 'concluded_undelivered', concludedOn: addCalendarDays(c.day0, 9) });
      expect((await stateOf(tx, c)).track).toMatchObject({ foundDeadOn: addCalendarDays(c.day0, 5), deadKind: 'dead' });
    });

    it('LD6 — the LAST evidential row concluded ⇒ `numberKnownDead`: a reached person\'s closure notice is a LETTER', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const origin = await sendRow(tx, c, { slotDay: 3 });
      await report(client, 'cr', origin, 'undelivered');
      await ladder(client, c, { originRowId: origin, originSlotDay: 3, state: 'concluded_undelivered' });
      const l = await recordCorrectionLetter(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, personKey: c.person.personKey, postedOn: addCalendarDays(c.day0, 12),
        trackingNumberCiphertext: 'enc:v1:t', actorId: DA, actorDisplay: 'DA', crypto: ENC,
      });
      await recordCorrectionLetterDelivery(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, letterId: l.letterId, deliveredOn: addCalendarDays(c.day0, 14),
        screenshotStorageKey: 'k', screenshotContentType: 'image/png', screenshotSizeBytes: 1, actorId: DA, actorDisplay: 'DA',
      });
      const reach = await reachOf(tx, c);
      expect(reach.people[0]).toMatchObject({ reachedBySms: false, reachedByLetter: true, numberKnownDead: true });
      expect(closureNoticeRecipients(reach)).toEqual({ noticePersonKeys: [], letterPersonKeys: [c.person.personKey] });
    });

    it('⭐ LD17 (a) — still letter-eligible after a LATER reminder is reported `delivered`; the delivered row reaches them for D22', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const origin = await sendRow(tx, c, { slotDay: 3 });
      await report(client, 'cr', origin, 'undelivered');
      await ladder(client, c, { originRowId: origin, originSlotDay: 3, state: 'concluded_undelivered' });
      const later = await sendRow(tx, c, { slotDay: 14 });
      await report(client, 'cr', later, 'delivered');
      expect((await stateOf(tx, c)).track.foundDeadOn).not.toBeNull();
      expect((await reachOf(tx, c)).people[0]).toMatchObject({ reachedBySms: true });
    });

    it('a concluded row on an OLD number changes ⛔ the current number\'s facts', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const old = await sendRow(tx, c, { slotDay: 1, hash: 'hash-old' });
      await report(client, 'cr', old, 'undelivered');
      await ladder(client, c, { originRowId: old, originSlotDay: 1, state: 'concluded_undelivered', hash: 'hash-old' });
      await sendRow(tx, c, { slotDay: 4 }); // the CURRENT number, accepted
      const s = await stateOf(tx, c);
      expect(s.track.foundDeadOn).toBeNull();
    });

    it('⭐ the CERTIFICATE chase inherits it (`-351` 3 B) — its reader maps, and the person is letter-eligible', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const runId = randomUUID();
      await asSuperuser(client, () =>
        client.query(
          `INSERT INTO claim_certificate_reminder_runs (run_id, claim_case_id, pariwar_id, cause, day0) VALUES ($1, $2, $3, 'missing', $4)`,
          [runId, c.cid, PARIWAR_A, c.day0],
        ),
      );
      const hash = (await currentCorrectionNumberHash(c.person.mobileCiphertext, c.person.mobileSource, PARIWAR_A, ENC))!;
      const { rows } = await client.query<{ reminder_id: string }>(
        `INSERT INTO claim_certificate_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome, recipient_number_hash)
         VALUES ($1, $2, $3, 3, $4, $5, 'family_sms', 'accepted', $6) RETURNING reminder_id`,
        [runId, c.cid, PARIWAR_A, addCalendarDays(c.day0, 3), c.person.personKey, hash],
      );
      const origin = rows[0]!.reminder_id;
      await report(client, 'ce', origin, 'undelivered');
      const before = await readClaimCertificateFamilyRows(tx, PARIWAR_A, c.cid);
      expect(before.map((r) => r.outcome)).toEqual(['accepted']);
      await ladder(client, c, { originRowId: origin, originSlotDay: 3, state: 'concluded_undelivered', chase: 'certificate', runId, hash });
      const mapped = await readClaimCertificateFamilyRows(tx, PARIWAR_A, c.cid);
      expect(mapped.map((r) => r.outcome)).toEqual(['rejected_unreachable']);
      const states = evaluateCertificatePersonStates([c.person], mapped, await readClaimCertificateLetters(tx, PARIWAR_A, c.cid), new Map([[c.person.personKey, { hash }]]));
      expect(states[0]).toMatchObject({ letterEligible: true });
      expect(states[0]!.track.deadKind).toBe('not_delivered');
      // ⭐ PQ2 A — a concluded CERTIFICATE ladder maps ⛔ correction row.
      expect((await rowsOf(tx, c)).length).toBe(0);
    });
  });

  describe('LD5 — the ladder\'s stops (the EXTRACTED predicate, `forLadder`)', () => {
    it('⭐ `closure_closed` — a closure DECIDED on a run that had ended `day_90` (which stays `day_90`, F8) stops a ladder; the same run with ⛔ closure is ⛔ a stop for a ladder (only the chase\'s own send stops at day 90)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      await sendRow(tx, c, { slotDay: 1 });
      await asSuperuser(client, () =>
        client.query(`UPDATE claim_correction_runs SET ended_at = now(), end_reason = 'day_90' WHERE run_id = $1`, [c.runId]),
      );
      const stop = async () =>
        (
          await correctionFamilyStopReason(tx, {
            pariwarId: PARIWAR_A,
            claimCaseId: c.cid,
            runId: c.runId,
            personKey: c.person.personKey,
            crypto: ENC,
            forLadder: true,
          })
        ).stop;
      expect(await stop()).toBeNull();
      // The chase's own send still refuses an ended run (⛔ `forLadder`).
      expect(
        (await correctionFamilyStopReason(tx, { pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId, personKey: c.person.personKey, crypto: ENC })).stop,
      ).toBe('run_ended');
      await request(client, c);
      await approve(client, c);
      expect(await stop()).toBe('closure_closed');
    });
  });

  describe('AC9 — what staff see (LD12)', () => {
    it('⭐ the correction line: the follow-up, `unreachable_reason` not_delivered, the reported count, the cap-aware ask — flipped by the nominee-call switch, and CLOSED by a reached call', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const origin = await sendRow(tx, c, { slotDay: 3 });
      await report(client, 'cr', origin, 'undelivered');
      const running = await ladder(client, c, { originRowId: origin, originSlotDay: 3 });
      const read = (cleared: boolean) =>
        readCorrectionChaseSummary(tx, PARIWAR_A, c.cid, addCalendarDays(c.day0, 6), { crypto: ENC, nomineeCallsCleared: cleared });
      let p = (await read(false)).people[0]!;
      expect(p).toMatchObject({ followUp: { state: 'running', nextStepOn: addCalendarDays(c.day0, 5) }, unreachableReason: null, reportedUndelivered: 1, ask: null });
      await client.query(
        // Round 2 P31 — a concluded ladder resolved both steps (0170).
        `UPDATE claim_contact_ladders SET state = 'concluded_undelivered', concluded_on = $2, ended_at = now(), sms2_state = 'satisfied', sms2_on = sms2_due_on, sms3_due_on = sms2_due_on, sms3_state = 'satisfied', sms3_on = sms2_due_on, conclude_on = sms2_due_on WHERE ladder_id = $1`,
        [running, addCalendarDays(c.day0, 11)],
      );
      p = (await read(false)).people[0]!;
      expect(p).toMatchObject({
        status: 'unreachable',
        unreachableReason: 'not_delivered',
        followUp: { state: 'concluded', concludedOn: addCalendarDays(c.day0, 11), nextStepOn: null },
        reportedUndelivered: 1,
        ask: 'letter', // a nominee before G1 — "post a letter"
      });
      expect((await read(true)).people[0]!.ask).toBe('call_or_letter');
      await call(client, c, 'reached', addCalendarDays(c.day0, 12));
      p = (await read(true)).people[0]!;
      expect(p.ask).toBeNull(); // answered
      expect(p.calls).toHaveLength(1);
      expect(p.status).toBe('unreachable'); // the status enum is unchanged — the call shows in `calls` (disclosed)
    });

    it('⭐ the certificate list keeps a claim whose run ENDED while a ladder RUNS (else invisible); `unreachable_reason` reads not_delivered though `sms_state` reads reminded', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const runId = randomUUID();
      await asSuperuser(client, () =>
        client.query(
          `INSERT INTO claim_certificate_reminder_runs (run_id, claim_case_id, pariwar_id, cause, day0, ended_at, end_reason) VALUES ($1, $2, $3, 'missing', $4, now(), 'completed')`,
          [runId, c.cid, PARIWAR_A, addCalendarDays(c.day0, -181)],
        ),
      );
      const hash = (await currentCorrectionNumberHash(c.person.mobileCiphertext, c.person.mobileSource, PARIWAR_A, ENC))!;
      const insert = async (slotDay: number) =>
        (
          await client.query<{ reminder_id: string }>(
            `INSERT INTO claim_certificate_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome, recipient_number_hash)
             VALUES ($1, $2, $3, $4, $5, $6, 'family_sms', 'accepted', $7) RETURNING reminder_id`,
            [runId, c.cid, PARIWAR_A, slotDay, addCalendarDays(c.day0, slotDay - 181), c.person.personKey, hash],
          )
        ).rows[0]!.reminder_id;
      const origin = await insert(180);
      await report(client, 'ce', origin, 'undelivered');
      const today = addCalendarDays(c.day0, 1);
      // ⛔ ladder ⇒ an ended run with ⛔ letter owed is ⛔ listed.
      expect(await readCertificateListItem(tx, PARIWAR_A, c.cid, today)).toBeNull();
      const l = await ladder(client, c, { originRowId: origin, originSlotDay: -1, chase: 'certificate', runId, hash });
      const item = await readCertificateListItem(tx, PARIWAR_A, c.cid, today);
      expect(item).not.toBeNull();
      expect(item!.people[0]!.followUp?.state).toBe('running');
      // Concluded, then a LATER accepted text: `sms_state` reads reminded, the reason still not_delivered.
      await client.query(
        `UPDATE claim_contact_ladders SET state = 'concluded_undelivered', concluded_on = $2, ended_at = now(), sms2_state = 'satisfied', sms2_on = sms2_due_on, sms3_due_on = sms2_due_on, sms3_state = 'satisfied', sms3_on = sms2_due_on, conclude_on = sms2_due_on WHERE ladder_id = $1`,
        [l, today],
      );
      await insert(181);
      const after = (await readCertificateListItem(tx, PARIWAR_A, c.cid, today))!;
      expect(after.people[0]).toMatchObject({ smsState: 'reminded', unreachableReason: 'not_delivered', letterEligible: true, ask: 'letter' });
    });

    // Review P2 — LD9's escalation writers had zero direct test coverage (every other AC9 test reads the DERIVED
    // `ask` through a raw-SQL ladder state, never calls the real writer). This calls BOTH writers for real.
    it('⭐ LD9 — writeCorrectionLadderEscalation / writeCertificateLadderEscalation each write ONE `ladder_escalation` row and mark the ladder escalated', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const correctionOrigin = await sendRow(tx, c, { slotDay: 3 });
      const correctionLadderId = await ladder(client, c, {
        originRowId: correctionOrigin,
        originSlotDay: 3,
        state: 'concluded_undelivered',
        concludedOn: addCalendarDays(c.day0, 11),
      });
      const correctionLadder = (await readContactLadder(tx, PARIWAR_A, correctionLadderId))!;
      const correctionWritten = await writeCorrectionLadderEscalation(tx, {
        pariwarId: PARIWAR_A,
        claimCaseId: c.cid,
        ladder: correctionLadder,
        today: addCalendarDays(c.day0, 12),
        districtAdminKey: 'staff:da-one',
        ask: 'call_or_letter',
      });
      expect(correctionWritten).toMatchObject({ written: true, recipientKey: 'staff:da-one' });
      const correctionRow = await tx
        .select({ purpose: schema.claimCorrectionReminders.purpose, outcome: schema.claimCorrectionReminders.outcome, detail: schema.claimCorrectionReminders.detail, subjectKey: schema.claimCorrectionReminders.subjectKey })
        .from(schema.claimCorrectionReminders)
        .where(eq(schema.claimCorrectionReminders.subjectKey, `ladder:${correctionLadderId}`));
      expect(correctionRow).toMatchObject([{ purpose: 'ladder_escalation', outcome: 'recorded', detail: 'ask:call_or_letter', subjectKey: `ladder:${correctionLadderId}` }]);
      expect((await readContactLadder(tx, PARIWAR_A, correctionLadderId))!.escalatedOn).toBe(addCalendarDays(c.day0, 12));
      // A second call is a no-op on the ladder (the compare-and-set on `escalated_on IS NULL`) — ⛔ a second row.
      // Round 2 P34 — and it SAYS so: `written: false`, and `escalated_on` stays the FIRST day (⛔ moved to day 13).
      const again = await writeCorrectionLadderEscalation(tx, {
        pariwarId: PARIWAR_A,
        claimCaseId: c.cid,
        ladder: correctionLadder,
        today: addCalendarDays(c.day0, 13),
        districtAdminKey: 'staff:da-one',
        ask: 'call_or_letter',
      });
      expect(
        await tx
          .select({ id: schema.claimCorrectionReminders.reminderId })
          .from(schema.claimCorrectionReminders)
          .where(eq(schema.claimCorrectionReminders.subjectKey, `ladder:${correctionLadderId}`)),
      ).toHaveLength(1);
      expect(again.written).toBe(false);
      expect((await readContactLadder(tx, PARIWAR_A, correctionLadderId))!.escalatedOn).toBe(addCalendarDays(c.day0, 12));

      const certRunId = randomUUID();
      await asSuperuser(client, () =>
        client.query(
          `INSERT INTO claim_certificate_reminder_runs (run_id, claim_case_id, pariwar_id, cause, day0) VALUES ($1, $2, $3, 'missing', $4)`,
          [certRunId, c.cid, PARIWAR_A, c.day0],
        ),
      );
      const certOrigin = await client.query<{ reminder_id: string }>(
        `INSERT INTO claim_certificate_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome, recipient_number_hash)
         VALUES ($1, $2, $3, 3, $4, $5, 'family_sms', 'accepted', $6) RETURNING reminder_id`,
        [certRunId, c.cid, PARIWAR_A, addCalendarDays(c.day0, 3), c.person.personKey, (await currentCorrectionNumberHash(c.person.mobileCiphertext, c.person.mobileSource, PARIWAR_A, ENC))!],
      );
      const certLadderId = await ladder(client, c, {
        originRowId: certOrigin.rows[0]!.reminder_id,
        originSlotDay: 3,
        chase: 'certificate',
        runId: certRunId,
        state: 'concluded_undelivered',
        concludedOn: addCalendarDays(c.day0, 11),
      });
      const certLadder = (await readContactLadder(tx, PARIWAR_A, certLadderId))!;
      const certWritten = await writeCertificateLadderEscalation(tx, {
        pariwarId: PARIWAR_A,
        claimCaseId: c.cid,
        ladder: certLadder,
        today: addCalendarDays(c.day0, 12),
        districtAdminKey: 'staff:unassigned',
        ask: 'letter',
      });
      expect(certWritten).toMatchObject({ written: true, recipientKey: 'staff:unassigned' }); // the FIRST insert — `no_target` is still a written row
      const certRow = await tx
        .select({ purpose: schema.claimCertificateReminders.purpose, outcome: schema.claimCertificateReminders.outcome, detail: schema.claimCertificateReminders.detail })
        .from(schema.claimCertificateReminders)
        .where(eq(schema.claimCertificateReminders.subjectKey, `ladder:${certLadderId}`));
      expect(certRow).toMatchObject([{ purpose: 'ladder_escalation', outcome: 'no_target', detail: 'no_target:no_staff_recipient' }]);
      expect((await readContactLadder(tx, PARIWAR_A, certLadderId))!.escalatedOn).toBe(addCalendarDays(c.day0, 12));
    });
  });

  // Round 2 P17 — a retry the step gate turns down whose claimed row sent NOTHING: the step is ⛔ `sent` any more.
  describe('unsendContactLadderStep — `sent` on a row that sent nothing ⇒ the gate\'s verdict (LD3)', () => {
    it('⭐ moves `sent` on THAT row to the verdict, ⛔ row, the next date from the due date; ⛔ another row, ⛔ a non-`sent` step, ⛔ twice', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const origin = await sendRow(tx, c, { slotDay: 3 });
      const l = await ladder(client, c, { originRowId: origin, originSlotDay: 3 });
      const before = (await readContactLadder(tx, PARIWAR_A, l))!;
      const claimedRow = randomUUID();
      const sentOn = addCalendarDays(before.sms2DueOn, 1);
      await client.query(
        `UPDATE claim_contact_ladders SET sms2_state = 'sent', sms2_on = $2, sms2_row_id = $3, sms3_due_on = $4 WHERE ladder_id = $1`,
        [l, sentOn, claimedRow, addCalendarDays(sentOn, 2)],
      );
      const nextOn = addCalendarDays(before.sms2DueOn, 2);
      const move = (rowId: string) =>
        unsendContactLadderStep(tx, { pariwarId: PARIWAR_A, ladderId: l, step: 2, rowId, state: 'satisfied', on: sentOn, nextOn });
      await expect(move(randomUUID())).resolves.toBe(false);
      await expect(move(claimedRow)).resolves.toBe(true);
      expect(await readContactLadder(tx, PARIWAR_A, l)).toMatchObject({ sms2State: 'satisfied', sms2RowId: null, sms2On: sentOn, sms3DueOn: nextOn });
      await expect(move(claimedRow)).resolves.toBe(false);
    });

    it('⛔ step 2 is ⛔ un-sent under a step 3 already RESOLVED (its due date would be rewritten — review round 2, fix-diff)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const origin = await sendRow(tx, c, { slotDay: 3 });
      const l = await ladder(client, c, { originRowId: origin, originSlotDay: 3 });
      const before = (await readContactLadder(tx, PARIWAR_A, l))!;
      const claimedRow = randomUUID();
      const sentOn = addCalendarDays(before.sms2DueOn, 1);
      const sms3On = addCalendarDays(sentOn, 2);
      await client.query(
        `UPDATE claim_contact_ladders SET sms2_state = 'sent', sms2_on = $2, sms2_row_id = $3, sms3_due_on = $4,
           sms3_state = 'skipped:past_horizon', sms3_on = $4, conclude_on = $5 WHERE ladder_id = $1`,
        [l, sentOn, claimedRow, sms3On, addCalendarDays(sms3On, 4)],
      );
      await expect(
        unsendContactLadderStep(tx, { pariwarId: PARIWAR_A, ladderId: l, step: 2, rowId: claimedRow, state: 'satisfied', on: sentOn, nextOn: addCalendarDays(before.sms2DueOn, 2) }),
      ).resolves.toBe(false);
      expect(await readContactLadder(tx, PARIWAR_A, l)).toMatchObject({ sms2State: 'sent', sms2RowId: claimedRow, sms3DueOn: sms3On });
    });
  });

  // Review round 2 (fix-diff, P21) — a claimed certificate ladder row that sent NOTHING on its final attempt is abandoned
  // `skipped_superseded` (⛔ "an attempt ran") and the step leaves `sent` (LD3); ⛔ another job's row, ⛔ twice.
  describe('abandonCertificateLadderSend — a claimed row that sent nothing (P21)', () => {
    it('⭐ own `attempting` row ⇒ `skipped_superseded` + the step `skipped:no_sendable_number` (⛔ row, next date from the due date); ⛔ another job, ⛔ twice', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const runId = randomUUID();
      await asSuperuser(client, () =>
        client.query(
          `INSERT INTO claim_certificate_reminder_runs (run_id, claim_case_id, pariwar_id, cause, day0) VALUES ($1, $2, $3, 'missing', $4)`,
          [runId, c.cid, PARIWAR_A, c.day0],
        ),
      );
      const hash = (await currentCorrectionNumberHash(c.person.mobileCiphertext, c.person.mobileSource, PARIWAR_A, ENC))!;
      const origin = (
        await client.query<{ reminder_id: string }>(
          `INSERT INTO claim_certificate_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome, recipient_number_hash)
           VALUES ($1, $2, $3, 3, $4, $5, 'family_sms', 'accepted', $6) RETURNING reminder_id`,
          [runId, c.cid, PARIWAR_A, addCalendarDays(c.day0, 3), c.person.personKey, hash],
        )
      ).rows[0]!.reminder_id;
      const l = await ladder(client, c, { originRowId: origin, originSlotDay: 3, chase: 'certificate', runId, hash });
      const before = (await readContactLadder(tx, PARIWAR_A, l))!;
      const sentOn = before.sms2DueOn;
      const claimed = (
        await client.query<{ reminder_id: string }>(
          `INSERT INTO claim_certificate_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, subject_key,
             outcome, claimed_by_job, claimed_at)
           VALUES ($1, $2, $3, 5, $4, $5, 'ladder_sms', $6, 'attempting', 'job-1', now()) RETURNING reminder_id`,
          [runId, c.cid, PARIWAR_A, sentOn, c.person.personKey, `ladder:${l}:2`],
        )
      ).rows[0]!.reminder_id;
      await client.query(
        `UPDATE claim_contact_ladders SET sms2_state = 'sent', sms2_on = $2, sms2_row_id = $3, sms3_due_on = $4 WHERE ladder_id = $1`,
        [l, sentOn, claimed, addCalendarDays(sentOn, 2)],
      );
      const abandon = (jobId: string) =>
        abandonCertificateLadderSend(client, {
          pariwarId: PARIWAR_A, claimCaseId: c.cid, ladderId: l, step: 2, reminderId: claimed, jobId, sentOn, detail: 'no_sendable_number',
        });
      await expect(abandon('job-other')).resolves.toEqual({ abandoned: false, unsent: false });
      expect((await readContactLadder(tx, PARIWAR_A, l))!.sms2State).toBe('sent');
      await expect(abandon('job-1')).resolves.toEqual({ abandoned: true, unsent: true });
      const row = await client.query<{ outcome: string; detail: string }>(`SELECT outcome, detail FROM claim_certificate_reminders WHERE reminder_id = $1`, [claimed]);
      expect(row.rows[0]).toEqual({ outcome: 'skipped_superseded', detail: 'no_sendable_number' });
      expect(await readContactLadder(tx, PARIWAR_A, l)).toMatchObject({
        sms2State: 'skipped:no_sendable_number', sms2RowId: null, sms2On: sentOn, sms3DueOn: addCalendarDays(before.sms2DueOn, 2),
      });
      await expect(abandon('job-1')).resolves.toEqual({ abandoned: false, unsent: false });
    });
  });

  describe('AC5 — reach and the closure hold (LD8)', () => {
    it('D22 — a `ladder_sms` accepted with ⛔ report ⇒ reached; `delivered` ⇒ reached; `undelivered` ⇒ ⛔', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      for (const [state, reached] of [[null, true], ['delivered', true], ['undelivered', false]] as const) {
        const c = await returnedClaim(client);
        const id = await sendRow(tx, c, { slotDay: 86, purpose: 'ladder_sms', subjectKey: `ladder:${randomUUID()}:2` });
        if (state !== null) await report(client, 'cr', id, state);
        expect((await reachOf(tx, c)).people[0]).toMatchObject({ reachedBySms: false, reachedByLadderSms: reached, reached });
      }
    });

    it('D22 — a call recorded `reached` ⇒ reached (either surface); a `not_reached` call ⇒ ⛔', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const a = await returnedClaim(client);
      await call(client, a, 'reached', addCalendarDays(a.day0, 20), 'certificate');
      expect((await reachOf(tx, a)).people[0]).toMatchObject({ reachedByCall: true, reached: true });
      const b = await returnedClaim(client);
      await call(client, b, 'not_reached', addCalendarDays(b.day0, 20));
      expect((await reachOf(tx, b)).people[0]).toMatchObject({ reachedByCall: false, reached: false });
    });

    it('⭐ `ladder_running` — readiness and the request refuse while a CORRECTION ladder runs; a running CERTIFICATE ladder holds ⛔ (PQ2 A)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const reached = await sendRow(tx, c, { slotDay: 1 });
      const origin = await sendRow(tx, c, { slotDay: 84 });
      await report(client, 'cr', origin, 'undelivered');
      void reached;
      const certificate = await ladder(client, c, { originRowId: randomUUID(), originSlotDay: 84, chase: 'certificate', runId: randomUUID() });
      void certificate;
      expect((await readiness(tx, c)).blocker).toBeNull();
      await ladder(client, c, { originRowId: origin, originSlotDay: 84 });
      expect((await readiness(tx, c)).blocker).toBe('ladder_running');
      await expectRefused(request(client, c), 'ladder_running');
    });

    it('⭐ `ladder_running` refuses the Pariwar Admin\'s DECIDE (a ladder that starts between request and decide) and the Super Admin\'s CLOSE', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      await sendRow(tx, c, { slotDay: 1 });
      await request(client, c);
      const origin = await sendRow(tx, c, { slotDay: 84 });
      await report(client, 'cr', origin, 'undelivered');
      const l = await ladder(client, c, { originRowId: origin, originSlotDay: 84 });
      await expectRefused(approve(client, c), 'ladder_running');
      // The decline escalates (⛔ a closing act); the Super Admin's CLOSE re-runs the gate.
      await client.query(`UPDATE claim_contact_ladders SET state = 'ended_delivered', ended_at = now(), end_detail = 'delivered' WHERE ladder_id = $1`, [l]);
      await decline(client, c);
      const origin2 = await sendRow(tx, c, { slotDay: 85 });
      await report(client, 'cr', origin2, 'undelivered');
      await ladder(client, c, { originRowId: origin2, originSlotDay: 85 });
      await expectRefused(superAdmin(client, c, 'close', 'family_silent_after_reached'), 'ladder_running');
    });

    it('the guard order — `claim_corrected` BEFORE `ladder_running`, `ladder_running` BEFORE `not_reached`', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const unreached = await returnedClaim(client);
      const o1 = await sendRow(tx, unreached, { slotDay: 84 });
      await report(client, 'cr', o1, 'undelivered');
      await ladder(client, unreached, { originRowId: o1, originSlotDay: 84 });
      // The only row is undelivered — still "reached" until concluded (I4) — so make them UNREACHED another way: a dead number.
      await sendRow(tx, unreached, { slotDay: 85, outcome: 'rejected_invalid_number', hash: 'hash-other' });
      expect((await readiness(tx, unreached)).blocker).toBe('ladder_running');
      const corrected = await returnedClaim(client);
      const o2 = await sendRow(tx, corrected, { slotDay: 84 });
      await report(client, 'cr', o2, 'undelivered');
      await ladder(client, corrected, { originRowId: o2, originSlotDay: 84 });
      await resubmit(client, tx, corrected);
      expect((await readiness(tx, corrected)).blocker).toBe('claim_corrected');
    });
  });
});
