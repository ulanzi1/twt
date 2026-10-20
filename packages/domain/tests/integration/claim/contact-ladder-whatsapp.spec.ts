// The claimant's WHATSAPP STEP — its record through the REAL begin / marker / finalise / sweep reads (Story 6.37d, Task 5; AC3–AC8;
// WS5–WS12; I2–I4, I7–I10). Live DB, per-test ROLLBACK (setupLiveDb), on the 6.19c closure fixture (the claimant IS the nominee —
// PQ1 A: a claimant-nominee is reached as the claimant). Ladder rows are written straight into `claim_contact_ladders` (the sweeps'
// own legs live in apps/jobs); the origin row's `created_at` is moved back so the step is due (T5).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  CLAIM_CONTACT_AGREEMENT_COPY_VERSION,
  CONTACT_LADDER_WA_LEASE_MS,
  beginContactLadderWhatsapp,
  beginCorrectionLadderSend,
  claimCorrectionReminder,
  currentCorrectionNumberHash,
  finaliseContactLadderWhatsapp,
  finaliseCorrectionReminder,
  finishContactLadderWhatsappExhausted,
  finishContactLadderWhatsappNoTarget,
  finishContactLadderWhatsappSendCapped,
  finishLapsedInFlightContactLadderWhatsapp,
  hasRecentClaimContactWaSendTo,
  insertClaimContactWaStop,
  listDueContactLadderWhatsapp,
  markContactLadderWhatsappInFlight,
  noteContactLadderWhatsappTransient,
  readClaimLadders,
  readClosureReach,
  readContactLadder,
  recordClaimContactWaStatus,
  releaseContactLadderWhatsappInFlight,
  resolveCorrectionChase,
  settleContactLadderWhatsappDeliveries,
  type BeginContactLadderWhatsappResult,
} from '../../../src/claim/index.js';
import { bindScopedDb } from '../../../src/db.js';
import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';
import { ENC, asSuperuser, resubmit, returnedClaim, type Client, type Returned, type Tx } from './_correction-closure-fixture.js';

const NEXT_MORNING = new Date('2099-01-01T03:30:00.000Z');

/** A FINISHED accepted `family_sms` row of the person — its id. */
async function sendRow(tx: Tx, c: Returned, slotDay: number): Promise<string> {
  const hash = await currentCorrectionNumberHash(c.person.mobileCiphertext, c.person.mobileSource, PARIWAR_A, ENC);
  const jobId = `j-${randomUUID()}`;
  const claimed = await claimCorrectionReminder(tx, {
    pariwarId: PARIWAR_A,
    claimCaseId: c.cid,
    runId: c.runId,
    slotDay,
    recipientKey: c.person.personKey,
    purpose: 'family_sms',
    subjectKey: '',
    sentOn: addCalendarDays(c.day0, slotDay),
    late: false,
    jobId,
    now: new Date(),
  });
  if (claimed.status !== 'claimed') throw new Error('claim');
  await finaliseCorrectionReminder(tx, {
    pariwarId: PARIWAR_A,
    reminderId: claimed.reminderId,
    jobId,
    outcome: 'accepted',
    providerMessageId: `pm${randomUUID().replace(/-/g, '')}`,
    recipientVersionId: c.person.versionId,
    recipientNumberHash: hash,
  });
  return claimed.reminderId;
}

interface Setup {
  readonly c: Returned;
  readonly ladderId: string;
  readonly originRowId: string;
  readonly hash: string;
}

/**
 * A returned claim, its origin text (reported undelivered, sent `hoursAgo` ago), a RUNNING correction ladder whose WhatsApp step is
 * PENDING, the agreement on v2 in English (eligible unless `basis` says otherwise), and the Pariwar's WhatsApp switch ON.
 */
async function setup(
  client: Client,
  tx: Tx,
  o: { readonly hoursAgo?: number; readonly basis?: 'v2_en' | 'old' | 'v2_hi'; readonly waOn?: boolean } = {},
): Promise<Setup> {
  await enterAppScope(client, PARIWAR_A);
  const c = await returnedClaim(client);
  const originRowId = await sendRow(tx, c, 0);
  const hash = (await currentCorrectionNumberHash(c.person.mobileCiphertext, c.person.mobileSource, PARIWAR_A, ENC))!;
  const ladderId = await asSuperuser(client, async () => {
    await client.query(`UPDATE claim_correction_reminders SET created_at = clock_timestamp() - make_interval(hours => $2) WHERE reminder_id = $1`, [
      originRowId,
      o.hoursAgo ?? 5,
    ]);
    await client.query(
      `INSERT INTO sms_send_deliveries (send_kind, send_row_id, pariwar_id, request_id, delivery_state, status_code, first_reported_at, reported_at)
       VALUES ('cr', $1, $2, 'req1', 'undelivered', '2', now(), now())`,
      [originRowId, PARIWAR_A],
    );
    const basis = o.basis ?? 'v2_en';
    if (basis !== 'old') {
      await client.query(
        `UPDATE consent_records SET consent_payload = $2::jsonb
          WHERE consent_id = (SELECT agreement_consent_id FROM claim_contacts WHERE claim_case_id = $1)`,
        [c.cid, JSON.stringify({ checkboxTextShown: 'v2', locale: basis === 'v2_hi' ? 'hi' : 'en', copyVersion: CLAIM_CONTACT_AGREEMENT_COPY_VERSION })],
      );
    }
    if (o.waOn !== false) {
      await client.query(
        `INSERT INTO pariwar_wa_config (pariwar_id, enabled, phone_number_id, access_token_secret_name)
         VALUES ($1, true, 'pnid-a', 'wa-token-a')
         ON CONFLICT (pariwar_id) DO UPDATE SET enabled = true, phone_number_id = 'pnid-a', access_token_secret_name = 'wa-token-a'`,
        [PARIWAR_A],
      );
    } else {
      await client.query(`DELETE FROM pariwar_wa_config WHERE pariwar_id = $1`, [PARIWAR_A]);
    }
    const { rows } = await client.query<{ ladder_id: string }>(
      `INSERT INTO claim_contact_ladders (pariwar_id, claim_case_id, chase, run_id, return_decision_id, person_key, recipient_number_hash,
         origin_row_id, origin_sent_on, whatsapp_step, sms2_due_on)
       VALUES ($1, $2, 'correction', $3, $4, $5, $6, $7, $8, 'pending', $9) RETURNING ladder_id`,
      [PARIWAR_A, c.cid, c.runId, c.returnId, c.person.personKey, hash, originRowId, c.day0, addCalendarDays(c.day0, 2)],
    );
    return rows[0]!.ladder_id;
  });
  return { c, ladderId, originRowId, hash };
}

function begin(
  client: Client,
  s: Setup,
  o: { readonly jobId?: string; readonly now?: Date; readonly inWindow?: boolean; readonly verdict?: 'ok' | 'helpline_unreadable'; readonly finalAttempt?: boolean } = {},
): Promise<BeginContactLadderWhatsappResult> {
  return beginContactLadderWhatsapp(client, {
    pariwarId: PARIWAR_A,
    claimCaseId: s.c.cid,
    ladderId: s.ladderId,
    chase: 'correction',
    jobId: o.jobId ?? 'job-1',
    now: o.now ?? new Date(),
    inWindow: o.inWindow ?? true,
    nextWindowStart: NEXT_MORNING,
    config: { verdict: o.verdict ?? 'ok', templateName: (o.verdict ?? 'ok') === 'ok' ? 'claim_correction_reminder_en' : null, locale: 'en' },
    finalAttempt: o.finalAttempt ?? false,
    crypto: ENC,
  });
}

async function stepOf(tx: Tx, s: Setup): Promise<string> {
  return (await readContactLadder(tx, PARIWAR_A, s.ladderId))!.whatsappStep;
}

async function sendRowOf(client: Client, s: Setup) {
  const { rows } = await client.query<{
    send_id: string;
    send_outcome: string;
    attempt_count: number;
    claimed_by_job: string;
    send_started_at: Date | null;
    detail: string | null;
    first_detail: string | null;
    recipient_number_hash: string;
    template_name: string;
    locale: string;
    delivered_at: Date | null;
  }>(`SELECT * FROM claim_contact_wa_sends WHERE ladder_id = $1`, [s.ladderId]);
  return rows[0] ?? null;
}

/** The ladder's SMS 2 re-check (the 10:00 run's begin) on its due date — the path that ENDS a ladder on a delivered WhatsApp. */
function smsTwo(client: Client, s: Setup) {
  return beginCorrectionLadderSend(client, {
    pariwarId: PARIWAR_A,
    claimCaseId: s.c.cid,
    ladderId: s.ladderId,
    step: 2,
    sentOn: addCalendarDays(s.c.day0, 2),
    jobId: 'sms2-job',
    now: new Date(),
    crypto: ENC,
  });
}

/** Review R2 — a later write moves the claim's claimant onto the BLOCK: the ladder's nominee is ⛔ the claimant any more. */
async function claimantMovesToBlock(client: Client, s: Setup): Promise<void> {
  await asSuperuser(client, () =>
    client.query(
      `UPDATE claim_contacts SET claimant_nominee_version_id = NULL, claimant_name_ciphertext = 'enc:v1:block-name',
         claimant_mobile_ciphertext = 'enc:v1:block-mobile', claimant_address_ciphertext = 'enc:v1:block-address'
        WHERE claim_case_id = $1`,
      [s.c.cid],
    ),
  );
}

const begun = (r: BeginContactLadderWhatsappResult) => {
  if (r.kind !== 'begun') throw new Error(`expected begun, got ${JSON.stringify(r)}`);
  return r;
};

describe.skipIf(!hasDatabase)('Story 6.37d — the claimant\'s WhatsApp step: the record (:5433)', { timeout: 30000 }, () => {
  setupLiveDb();

  describe('AC5 (2) — the first visit (the step `pending`)', () => {
    it('⭐ due, in the window, an eligible basis, the switch on ⇒ ONE send row claimed `attempting` (the LADDER\'s hash, the template, the locale) and the step `sent`; the person is the claimant-nominee (PQ1 A)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      expect(r.recipientNumberHash).toBe(s.hash);
      expect(r.person.personKey).toBe(s.c.person.personKey);
      expect(r.attemptCount).toBe(1);
      expect(await stepOf(tx, s)).toBe('sent');
      expect(await sendRowOf(client, s)).toMatchObject({
        send_outcome: 'attempting',
        attempt_count: 1,
        claimed_by_job: 'job-1',
        send_started_at: null,
        recipient_number_hash: s.hash,
        template_name: 'claim_correction_reminder_en',
        locale: 'en',
      });
    });

    it.each<[string, Parameters<typeof setup>[2], Parameters<typeof begin>[2], string]>([
      ['⭐ the OLD wording (I2 / G3)', { basis: 'old' }, {}, 'old_wording'],
      ['⭐ a v2 agreement given in Hindi (⛔ yet reviewed)', { basis: 'v2_hi' }, {}, 'hindi_not_reviewed'],
      ['the switch OFF (re-read under the lock)', { waOn: false }, {}, 'whatsapp_not_configured'],
      ['a config FAULT from (1) (judged after the ends / stops)', {}, { verdict: 'helpline_unreadable' }, 'helpline_unreadable'],
    ])('%s ⇒ the STEP records skipped (⛔ send row)', async (_l, o, b, reason) => {
      const { client, tx } = getTx();
      const s = await setup(client, tx, o);
      expect(await begin(client, s, b)).toEqual({ kind: 'skipped', reason, where: 'step' });
      expect(await stepOf(tx, s)).toBe(`skipped:${reason}`);
      expect(await sendRowOf(client, s)).toBeNull();
    });

    it('⭐ a STOP from the ladder\'s number in this Pariwar ⇒ `skipped:stopped` (WS10)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      await insertClaimContactWaStop(bindScopedDb(client), { pariwarId: PARIWAR_A, recipientNumberHash: s.hash, inboundEventId: randomUUID(), stopId: randomUUID() });
      expect(await begin(client, s)).toEqual({ kind: 'skipped', reason: 'stopped', where: 'step' });
    });

    it('⭐ SMS 2 already resolved ⇒ `skipped:overtaken` (⛔ a WhatsApp after the second text — WS6)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      await asSuperuser(client, () =>
        client.query(
          `UPDATE claim_contact_ladders SET sms2_state = 'satisfied', sms2_on = sms2_due_on, sms3_due_on = sms2_due_on + 2 WHERE ladder_id = $1`,
          [s.ladderId],
        ),
      );
      expect(await begin(client, s)).toEqual({ kind: 'skipped', reason: 'overtaken', where: 'step' });
    });

    it('⭐ before origin + 4 h on the DB clock ⇒ `wait` (⛔ write); outside the window ⇒ `defer` to the next 09:00 (⛔ write)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx, { hoursAgo: 1 });
      expect((await begin(client, s)).kind).toBe('wait');
      expect(await stepOf(tx, s)).toBe('pending');
      const late = await setup(client, tx);
      expect(await begin(client, late, { inWindow: false })).toEqual({ kind: 'defer', until: NEXT_MORNING });
      expect(await stepOf(tx, late)).toBe('pending');
      expect(await sendRowOf(client, late)).toBeNull();
    });

    it('⭐ a reached call ENDS the ladder and records NOTHING for the step (AC5 (2) — ⛔ WhatsApp after a call that reached the family)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      await client.query(
        `INSERT INTO claim_contact_calls (pariwar_id, claim_case_id, person_key, chase, called_on, answered_by, outcome, recorded_by_actor, recorded_by_display)
         VALUES ($1, $2, $3, 'correction', $4, 'the_person', 'reached', 'da', 'District Admin')`,
        [PARIWAR_A, s.c.cid, s.c.person.personKey, s.c.day0],
      );
      expect(await begin(client, s)).toMatchObject({ kind: 'ended', state: 'ended_call', finishedRow: false });
      const l = (await readContactLadder(tx, PARIWAR_A, s.ladderId))!;
      expect([l.state, l.whatsappStep]).toEqual(['ended_call', 'pending']);
    });

    it('⭐ AC5 (2) — a correction RESUBMITTED before the step is due (11:00) ⇒ the chase stops: ⛔ WhatsApp at 14:00, ⛔ send row, the step left `pending`', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      await resubmit(client, tx, s.c);
      expect(await begin(client, s)).toEqual({ kind: 'ended', state: 'ended_stopped', detail: 'stopped:resubmitted', finishedRow: false });
      expect(await sendRowOf(client, s)).toBeNull();
      const l = (await readContactLadder(tx, PARIWAR_A, s.ladderId))!;
      expect([l.state, l.endDetail, l.whatsappStep]).toEqual(['ended_stopped', 'stopped:resubmitted', 'pending']);
    });

    it('⭐ R2 — the person is ⛔ the claimant any more (a later write moved the claimant) ⇒ `skipped:no_longer_claimant` on the FIRST visit (⛔ send row)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      await claimantMovesToBlock(client, s);
      expect(await begin(client, s)).toEqual({ kind: 'skipped', reason: 'no_longer_claimant', where: 'step' });
      expect(await stepOf(tx, s)).toBe('skipped:no_longer_claimant');
      expect(await sendRowOf(client, s)).toBeNull();
    });

    it('a ladder ⛔ running on a first visit ⇒ noop (⛔ write)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      await asSuperuser(client, () =>
        client.query(`UPDATE claim_contact_ladders SET state = 'ended_stopped', ended_at = now(), end_detail = 'stopped:x' WHERE ladder_id = $1`, [s.ladderId]),
      );
      expect(await begin(client, s)).toEqual({ kind: 'noop', reason: 'ladder_not_running' });
    });
  });

  describe('WS8 (iii) (2) — a retry / re-take (the step `sent`): the row\'s state FIRST, then the verdicts', () => {
    it('⭐ another live holder ⇒ held_by_other; the SAME job ⇒ re-claimed (attempt 2); a lapsed lease ⇒ re-claimed by the new job', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      begun(await begin(client, s, { jobId: 'job-1' }));
      expect(await begin(client, s, { jobId: 'job-2' })).toEqual({ kind: 'noop', reason: 'held_by_other' });
      expect(begun(await begin(client, s, { jobId: 'job-1' })).attemptCount).toBe(2);
      const later = new Date(Date.now() + CONTACT_LADDER_WA_LEASE_MS + 60_000);
      const r = begun(await begin(client, s, { jobId: 'job-3', now: later }));
      expect(r.attemptCount).toBe(3);
      expect((await sendRowOf(client, s))!.claimed_by_job).toBe('job-3');
    });

    it('⭐ the marker SET ⇒ in_flight (⛔ write — the lapsed finisher owns it); a FINISHED row ⇒ already_final', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const db = bindScopedDb(client);
      expect(await markContactLadderWhatsappInFlight(db, { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1', leaseMarginMs: 60_000, now: new Date() })).toBe('marked');
      const later = new Date(Date.now() + CONTACT_LADDER_WA_LEASE_MS + 60_000);
      expect(await begin(client, s, { jobId: 'job-2', now: later })).toEqual({ kind: 'noop', reason: 'in_flight' });
      expect(await finaliseContactLadderWhatsapp(client, { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1', outcome: 'refused', detail: 'refused:meta_131031' })).toBe(true);
      expect(await begin(client, s, { jobId: 'job-1' })).toEqual({ kind: 'noop', reason: 'already_final' });
    });

    it('⭐ a false verdict on a re-take FINISHES THE ROW `skipped:<reason>` (⛔ a write to the step); a pre-send transient note kept in first_detail', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      expect(await noteContactLadderWhatsappTransient(bindScopedDb(client), { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1', detail: 'hash_failed:tier1', phase: 'pre_send' })).toBe(true);
      await asSuperuser(client, () =>
        client.query(
          `UPDATE consent_records SET consent_payload = '{"checkboxTextShown":"x","locale":"en"}'::jsonb
            WHERE consent_id = (SELECT agreement_consent_id FROM claim_contacts WHERE claim_case_id = $1)`,
          [s.c.cid],
        ),
      );
      expect(await begin(client, s, { jobId: 'job-1' })).toEqual({ kind: 'skipped', reason: 'old_wording', where: 'row' });
      expect(await stepOf(tx, s)).toBe('sent');
      expect(await sendRowOf(client, s)).toMatchObject({ send_outcome: 'skipped', detail: 'skipped:old_wording', first_detail: 'hash_failed:tier1', send_started_at: null });
    });

    it('⭐ R2 — the claimant moved while a claimed row waited ⇒ the RE-TAKE finishes the row `skipped:no_longer_claimant` (⛔ send)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      begun(await begin(client, s));
      await claimantMovesToBlock(client, s);
      expect(await begin(client, s, { jobId: 'job-1' })).toEqual({ kind: 'skipped', reason: 'no_longer_claimant', where: 'row' });
      expect(await stepOf(tx, s)).toBe('sent');
      expect(await sendRowOf(client, s)).toMatchObject({ send_outcome: 'skipped', detail: 'skipped:no_longer_claimant', send_started_at: null });
    });

    it('⭐ the ladder ended while a re-taken row waited ⇒ the row finished `skipped:ended`', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      begun(await begin(client, s));
      await asSuperuser(client, () =>
        client.query(`UPDATE claim_contact_ladders SET state = 'ended_stopped', ended_at = now(), end_detail = 'stopped:x' WHERE ladder_id = $1`, [s.ladderId]),
      );
      expect(await begin(client, s, { jobId: 'job-1' })).toEqual({ kind: 'skipped', reason: 'ended', where: 'row' });
    });

    it('⭐ a delivered WhatsApp (the status store\'s, copied) ENDS the ladder `delivered:whatsapp` (WS12) — through the re-check', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const db = bindScopedDb(client);
      await markContactLadderWhatsappInFlight(db, { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1', leaseMarginMs: 60_000, now: new Date() });
      await finaliseContactLadderWhatsapp(client, { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1', outcome: 'accepted', providerMessageId: 'wamid.END1' });
      expect((await sendRowOf(client, s))!.delivered_at).toBeNull();
      await client.query(`INSERT INTO whatsapp_send_status (wamid, pariwar_id, state, meta_status) VALUES ('wamid.END1', $1, 'delivered', 'read')`, [PARIWAR_A]);
      // Round 2 (P5) — the END itself, through the REAL re-check the ladder's SMS 2 runs (its settle copies the status
      // store's delivery, then `ladderEndReason` ends the ladder) — ⛔ a fixture write of the state.
      expect(await smsTwo(client, s)).toEqual({ kind: 'ended', state: 'ended_delivered', detail: 'delivered:whatsapp' });
      expect((await sendRowOf(client, s))!.delivered_at).not.toBeNull();
      const l = (await readContactLadder(tx, PARIWAR_A, s.ladderId))!;
      expect([l.state, l.endDetail, l.sms2State]).toEqual(['ended_delivered', 'delivered:whatsapp', 'pending']);
    });
  });

  describe('WS8 (ii) / (iv) — the marker, the release, the notes, the finalise', () => {
    it('⭐ -370 / -371 — the cap counts only sends Meta MAY have acted on: a 429 and a never-opened connection are ⛔ counted; the SECOND 503 finishes the row `may_have_sent:send_cap` (the marker kept, first_detail the first ambiguous send\'s note)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const db = bindScopedDb(client);
      const ref = { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1' };
      const mark = () => markContactLadderWhatsappInFlight(db, { ...ref, leaseMarginMs: 60_000, now: new Date() });
      const note = (detail: string) => noteContactLadderWhatsappTransient(db, { ...ref, detail, phase: 'post_send' });
      const capped = (transient: string) => finishContactLadderWhatsappSendCapped(db, { ...ref, transient });
      const count = async () =>
        (await client.query<{ send_count: number }>(`SELECT send_count FROM claim_contact_wa_sends WHERE send_id = $1`, [r.sendId])).rows[0]!.send_count;
      for (const unsent of ['rate_limited:130429', 'api_unavailable:000']) {
        expect(await mark()).toBe('marked');
        expect(await capped(unsent)).toBe(false);
        expect(await note(unsent)).toBe(true);
      }
      expect(await count()).toBe(0);
      expect(await mark()).toBe('marked');
      expect(await capped('api_unavailable:503')).toBe(false); // the FIRST ambiguous send — below the cap
      expect(await note('api_unavailable:503')).toBe(true);
      expect(await count()).toBe(1);
      expect(await mark()).toBe('marked');
      expect(await capped('api_unavailable:500')).toBe(true);
      expect(await count()).toBe(2);
      const row = (await sendRowOf(client, s))!;
      expect(row).toMatchObject({ send_outcome: 'may_have_sent', detail: 'may_have_sent:send_cap', first_detail: 'api_unavailable:503' }); // the note before the finish — the FIRST ambiguous send
      expect(row.send_started_at).not.toBeNull();
    });

    it('⭐ -370 backstop — a row whose ambiguous sends are SPENT while unmarked: the marker answers `capped` (⛔ `lost`), the at-marker finish records `may_have_sent:send_cap` with ⛔ call', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const db = bindScopedDb(client);
      const ref = { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1' };
      await asSuperuser(client, () => client.query(`UPDATE claim_contact_wa_sends SET send_count = 2 WHERE send_id = $1`, [r.sendId]));
      expect(await markContactLadderWhatsappInFlight(db, { ...ref, leaseMarginMs: 60_000, now: new Date() })).toBe('capped');
      expect(await finishContactLadderWhatsappSendCapped(db, { ...ref, transient: 'marker_lost:send_cap', phase: 'at_marker' })).toBe(true);
      const row = (await sendRowOf(client, s))!;
      expect(row).toMatchObject({ send_outcome: 'may_have_sent', detail: 'may_have_sent:send_cap' });
      expect(row.send_started_at).not.toBeNull();
    });

    it('⭐ the marker is ONE CAS: a second mark (a same-job-id twin) is `lost`; another job is `lost`; a lease with ⛔ margin left is `lost`', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const db = bindScopedDb(client);
      const ref = { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1' };
      const tooLate = new Date(r.claimedAt.getTime() + CONTACT_LADDER_WA_LEASE_MS);
      expect(await markContactLadderWhatsappInFlight(db, { ...ref, leaseMarginMs: 60_000, now: tooLate })).toBe('lost');
      expect(await markContactLadderWhatsappInFlight(db, { ...ref, jobId: 'job-2', leaseMarginMs: 60_000, now: new Date() })).toBe('lost');
      expect(await markContactLadderWhatsappInFlight(db, { ...ref, leaseMarginMs: 60_000, now: new Date() })).toBe('marked');
      expect(await markContactLadderWhatsappInFlight(db, { ...ref, leaseMarginMs: 60_000, now: new Date() })).toBe('lost');
      // A pre-send note requires the marker UNSET — a twin's pre-send fault can ⛔ clear a live send's marker.
      expect(await noteContactLadderWhatsappTransient(db, { ...ref, detail: 'decrypt_failed:tier1', phase: 'pre_send' })).toBe(false);
      expect(await releaseContactLadderWhatsappInFlight(db, ref)).toBe(true);
      expect((await sendRowOf(client, s))!.send_started_at).toBeNull();
      expect(await releaseContactLadderWhatsappInFlight(db, ref)).toBe(false);
    });

    it('⭐ a post-send transient (marker SET) is noted and the marker cleared; on the FINAL attempt the note and the finish are ONE statement (`skipped:transient_exhausted`, first_detail the FIRST transient)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const db = bindScopedDb(client);
      const ref = { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1' };
      await markContactLadderWhatsappInFlight(db, { ...ref, leaseMarginMs: 60_000, now: new Date() });
      expect(await noteContactLadderWhatsappTransient(db, { ...ref, detail: 'api_unavailable:503', phase: 'post_send' })).toBe(true);
      expect(await sendRowOf(client, s)).toMatchObject({ send_outcome: 'attempting', detail: 'api_unavailable:503', send_started_at: null });
      begun(await begin(client, s, { jobId: 'job-1' }));
      await markContactLadderWhatsappInFlight(db, { ...ref, leaseMarginMs: 60_000, now: new Date() });
      expect(await finishContactLadderWhatsappExhausted(db, { ...ref, transient: 'rate_limited:130429', phase: 'post_send' })).toBe(true);
      expect(await sendRowOf(client, s)).toMatchObject({
        send_outcome: 'skipped',
        detail: 'skipped:transient_exhausted',
        first_detail: 'api_unavailable:503',
        send_started_at: null,
      });
    });

    it.each<['accepted' | 'rejected_recipient' | 'may_have_sent' | 'refused', string | null, string | null]>([
      ['accepted', null, 'wamid.ACC1'],
      ['rejected_recipient', 'rejected_recipient:meta_131026', null],
      ['may_have_sent', 'may_have_sent:timeout', null],
      ['refused', 'refused:template_not_approved', null],
    ])('⭐ finalise %s keeps the marker SET (a call was made — 0172\'s mapping)', async (outcome, detail, wamid) => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const ref = { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1' };
      await markContactLadderWhatsappInFlight(bindScopedDb(client), { ...ref, leaseMarginMs: 60_000, now: new Date() });
      expect(
        await finaliseContactLadderWhatsapp(client, { ...ref, outcome, ...(detail !== null ? { detail } : {}), ...(wamid !== null ? { providerMessageId: wamid } : {}) }),
      ).toBe(true);
      const row = (await sendRowOf(client, s))!;
      expect([row.send_outcome, row.send_started_at !== null, row.detail]).toEqual([outcome, true, detail]);
    });

    it('⭐ a finalise of an accepted send COPIES a `delivered` the status store already holds (a status drained before the finalise — WS11 (1))', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const ref = { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1' };
      await markContactLadderWhatsappInFlight(bindScopedDb(client), { ...ref, leaseMarginMs: 60_000, now: new Date() });
      await client.query(`INSERT INTO whatsapp_send_status (wamid, pariwar_id, state, meta_status) VALUES ('wamid.EARLY', $1, 'delivered', 'delivered')`, [PARIWAR_A]);
      await finaliseContactLadderWhatsapp(client, { ...ref, outcome: 'accepted', providerMessageId: 'wamid.EARLY' });
      expect((await sendRowOf(client, s))!.delivered_at).not.toBeNull();
    });

    it('a no-number / hash-mismatch AFTER the claim ⇒ `no_target`, marker unset', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      expect(await finishContactLadderWhatsappNoTarget(bindScopedDb(client), { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1', reason: 'hash_mismatch' })).toBe(true);
      expect(await sendRowOf(client, s)).toMatchObject({ send_outcome: 'no_target', detail: 'no_target:hash_mismatch', send_started_at: null });
    });
  });

  describe('AC4 — the sweep\'s reads and the lapsed finisher (cross-tenant, SQL only)', () => {
    it('⭐ the due selection lists a pending step 4 h after its origin (⛔ before); a lapsed UNMARKED attempting row whatever the ladder\'s state; ⛔ a live or marked one', async () => {
      const { client, tx } = getTx();
      const due = await setup(client, tx);
      const early = await setup(client, tx, { hoursAgo: 1 });
      const taken = await setup(client, tx);
      begun(await begin(client, taken));
      const allow = [PARIWAR_A];
      const list = async (now: Date) => (await asSuperuser(client, () => listDueContactLadderWhatsapp(client, { now, after: null, allow }))).map((d) => d.ladderId);
      const now = new Date();
      expect(await list(now)).toContain(due.ladderId);
      expect(await list(now)).not.toContain(early.ladderId);
      expect(await list(now)).not.toContain(taken.ladderId);
      // The claimed row's lease lapses ⇒ re-taken (even once the ladder has ended — the row still owes a finish).
      await asSuperuser(client, () =>
        client.query(`UPDATE claim_contact_ladders SET state = 'ended_stopped', ended_at = now(), end_detail = 'stopped:x' WHERE ladder_id = $1`, [taken.ladderId]),
      );
      const later = new Date(now.getTime() + CONTACT_LADDER_WA_LEASE_MS + 60_000);
      expect(await list(later)).toContain(taken.ladderId);
    });

    it('⭐ a NULL anchor (the origin row gone) is listed even when its origin was ⛔ yet due — the child records `skipped:anchor_unknown` (I10)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx, { hoursAgo: 1 }); // origin + 4 h is still ahead ⇒ ⛔ listed while the anchor is known
      const list = async () =>
        (await asSuperuser(client, () => listDueContactLadderWhatsapp(client, { now: new Date(), after: null, allow: [PARIWAR_A] }))).map((d) => d.ladderId);
      expect(await list()).not.toContain(s.ladderId);
      await asSuperuser(client, async () => {
        await client.query("SET LOCAL session_replication_role = 'replica'"); // the ladder's identity trigger freezes origin_row_id
        const { rowCount } = await client.query(`UPDATE claim_contact_ladders SET origin_row_id = gen_random_uuid() WHERE ladder_id = $1`, [s.ladderId]);
        expect(rowCount).toBe(1);
        await client.query("SET LOCAL session_replication_role = 'origin'");
      });
      expect(await list()).toContain(s.ladderId);
      expect(await begin(client, s)).toEqual({ kind: 'skipped', reason: 'anchor_unknown', where: 'step' });
      expect(await stepOf(tx, s)).toBe('skipped:anchor_unknown');
    });

    it('⭐ the lapsed finisher: a MARKED row past the lease ⇒ `may_have_sent:lease_lapsed` (⛔ re-claimed); an unmarked one is left for the re-take', async () => {
      const { client, tx } = getTx();
      const marked = await setup(client, tx);
      const r = begun(await begin(client, marked));
      await markContactLadderWhatsappInFlight(bindScopedDb(client), { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1', leaseMarginMs: 60_000, now: new Date() });
      const unmarked = await setup(client, tx);
      begun(await begin(client, unmarked));
      const later = new Date(Date.now() + CONTACT_LADDER_WA_LEASE_MS + 60_000);
      const done = await asSuperuser(client, () => finishLapsedInFlightContactLadderWhatsapp(client, { now: later, allow: [PARIWAR_A] }));
      expect(done.map((d) => d.sendId)).toEqual([r.sendId]);
      expect(await sendRowOf(client, marked)).toMatchObject({ send_outcome: 'may_have_sent', detail: 'may_have_sent:lease_lapsed', claimed_by_job: 'sweep:lapsed' });
      expect((await sendRowOf(client, unmarked))!.send_outcome).toBe('attempting');
    });
  });

  describe('WS11 — the webhook worker\'s writes; WS12 — D22 counts a delivered WhatsApp on its OWN row', () => {
    it('⭐ a status for a claim wamid lands on its row, SET ONCE: `read` (⛔ `delivered`) counts as delivered; a duplicate changes nothing; `failed` records the code once', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const db = bindScopedDb(client);
      const ref = { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1' };
      await markContactLadderWhatsappInFlight(db, { ...ref, leaseMarginMs: 60_000, now: new Date() });
      await finaliseContactLadderWhatsapp(client, { ...ref, outcome: 'accepted', providerMessageId: 'wamid.ST1' });
      const status = (st: string, code: number | null = null) => recordClaimContactWaStatus(db, { pariwarId: PARIWAR_A, wamid: 'wamid.ST1', status: st, errorCode: code });
      expect(await status('read')).toEqual({ matched: true, wrote: true });
      expect(await status('delivered')).toEqual({ matched: true, wrote: false });
      expect(await status('failed', 131049)).toEqual({ matched: true, wrote: true });
      expect(await status('failed', 131026)).toEqual({ matched: true, wrote: false });
      const { rows } = await client.query<{ failure_code: string }>(`SELECT failure_code FROM claim_contact_wa_sends WHERE send_id = $1`, [r.sendId]);
      expect(rows[0]!.failure_code).toBe('131049');
      expect(await recordClaimContactWaStatus(db, { pariwarId: PARIWAR_A, wamid: 'wamid.NOT-A-CLAIM', status: 'read', errorCode: null })).toEqual({ matched: false });
    });

    it('⭐ WS11 (2) — the isolation lookup matches an in-flight / may-have-sent / accepted claim send to the recipient\'s claim-space hash (⛔ another hash, ⛔ another Pariwar)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      begun(await begin(client, s));
      const db = bindScopedDb(client);
      expect(await hasRecentClaimContactWaSendTo(db, { pariwarId: PARIWAR_A, recipientNumberHash: s.hash })).toBe(true);
      expect(await hasRecentClaimContactWaSendTo(db, { pariwarId: PARIWAR_A, recipientNumberHash: 'another-hash' })).toBe(false);
    });

    it('⭐ R5 — the 7-day window ages by `updated_at`: a row CREATED 10 days ago but touched now (a reclaim / finalise / status) still matches; touched 8 days ago it does ⛔', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const db = bindScopedDb(client);
      const age = (createdDays: number, updatedDays: number) =>
        asSuperuser(client, async () => {
          await client.query("SET LOCAL session_replication_role = 'replica'"); // the identity trigger freezes created_at
          await client.query(
            `UPDATE claim_contact_wa_sends SET created_at = now() - make_interval(days => $2), updated_at = now() - make_interval(days => $3) WHERE send_id = $1`,
            [r.sendId, createdDays, updatedDays],
          );
          await client.query("SET LOCAL session_replication_role = 'origin'");
        });
      await age(10, 0);
      expect(await hasRecentClaimContactWaSendTo(db, { pariwarId: PARIWAR_A, recipientNumberHash: s.hash })).toBe(true);
      await age(10, 8);
      expect(await hasRecentClaimContactWaSendTo(db, { pariwarId: PARIWAR_A, recipientNumberHash: s.hash })).toBe(false);
    });

    it('⭐ D22 — ladder 1 ended by a DELIVERED WhatsApp, ladder 2 in the same epoch CONCLUDES undelivered ⇒ the person is STILL reached (`reachedByLadderWhatsapp`)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const db = bindScopedDb(client);
      const ref = { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1' };
      await markContactLadderWhatsappInFlight(db, { ...ref, leaseMarginMs: 60_000, now: new Date() });
      await finaliseContactLadderWhatsapp(client, { ...ref, outcome: 'accepted', providerMessageId: 'wamid.D22' });
      const reach = async () => {
        const chase = await resolveCorrectionChase(tx, PARIWAR_A, s.c.cid, { crypto: ENC });
        return (await readClosureReach(tx, PARIWAR_A, s.c.cid, chase)).people.find((p) => p.personKey === s.c.person.personKey)!;
      };
      // Only SENT ⇒ ⛔ counted by the WhatsApp leg.
      expect((await reach()).reachedByLadderWhatsapp).toBe(false);
      await recordClaimContactWaStatus(db, { pariwarId: PARIWAR_A, wamid: 'wamid.D22', status: 'delivered', errorCode: null });
      await asSuperuser(client, () =>
        client.query(`UPDATE claim_contact_ladders SET state = 'ended_delivered', ended_at = now(), end_detail = 'delivered:whatsapp' WHERE ladder_id = $1`, [s.ladderId]),
      );
      expect((await reach()).reachedByLadderWhatsapp).toBe(true);
      // A later ladder in the SAME epoch concludes undelivered — the B1 mapping turns the first origin `rejected_unreachable`.
      const second = await sendRow(tx, s.c, 1);
      await asSuperuser(client, async () => {
        await client.query(
          `INSERT INTO sms_send_deliveries (send_kind, send_row_id, pariwar_id, request_id, delivery_state, status_code, first_reported_at, reported_at)
           VALUES ('cr', $1, $2, 'req2', 'undelivered', '2', now(), now())`,
          [second, PARIWAR_A],
        );
        await client.query(
          `INSERT INTO claim_contact_ladders (pariwar_id, claim_case_id, chase, run_id, return_decision_id, person_key, recipient_number_hash,
             origin_row_id, origin_sent_on, whatsapp_step, sms2_due_on, state, ended_at, concluded_on,
             sms2_state, sms2_on, sms3_due_on, sms3_state, sms3_on, conclude_on)
           VALUES ($1, $2, 'correction', $3, $4, $5, $6, $7, $8, 'skipped:old_wording', $9, 'concluded_undelivered', now(), $10,
             'satisfied', $9, $11, 'satisfied', $11, $10)`,
          [PARIWAR_A, s.c.cid, s.c.runId, s.c.returnId, s.c.person.personKey, s.hash, second, addCalendarDays(s.c.day0, 1), addCalendarDays(s.c.day0, 3), addCalendarDays(s.c.day0, 9), addCalendarDays(s.c.day0, 5)],
        );
      });
      const p = await reach();
      expect(p.reachedBySms).toBe(false);
      expect([p.reachedByLadderWhatsapp, p.reached]).toEqual([true, true]);
    });

    // Review R8 (2026-10-20) — other-chase independence. `readClaimLadders` filters `chase` at the SQL level (a hard
    // `eq()`, not a runtime branch), so a correction ladder's delivery / end sequence structurally cannot reach a
    // certificate ladder of the SAME claim and person — proved directly rather than through the sweep (which would
    // additionally exercise the certificate chase's OWN, unrelated stop/pause rules — see the story's Review Findings,
    // R8, for why a sweep-level version of this leg was abandoned).
    it('⭐ R8 — other-chase independence: a DELIVERED correction WhatsApp ends ITS ladder; a certificate ladder of the SAME claim/person is read-filtered out of the correction view and never touched', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const db = bindScopedDb(client);
      const ref = { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1' };
      await markContactLadderWhatsappInFlight(db, { ...ref, leaseMarginMs: 60_000, now: new Date() });
      await finaliseContactLadderWhatsapp(client, { ...ref, outcome: 'accepted', providerMessageId: 'wamid.OTHERCHASE' });
      // A running CERTIFICATE ladder for the SAME claim and person — chase is the only difference.
      await asSuperuser(client, () =>
        client.query(
          `INSERT INTO claim_contact_ladders (pariwar_id, claim_case_id, chase, run_id, person_key, recipient_number_hash,
             origin_row_id, origin_sent_on, whatsapp_step, sms2_due_on)
           VALUES ($1, $2, 'certificate', gen_random_uuid(), $3, $4, gen_random_uuid(), $5, 'pending', $6)`,
          [PARIWAR_A, s.c.cid, s.c.person.personKey, s.hash, s.c.day0, addCalendarDays(s.c.day0, 2)],
        ),
      );
      await recordClaimContactWaStatus(db, { pariwarId: PARIWAR_A, wamid: 'wamid.OTHERCHASE', status: 'delivered', errorCode: null });
      // Round 2 (P5) — the correction ladder ENDS through its real re-check (⛔ a fixture write) …
      expect(await smsTwo(client, s)).toEqual({ kind: 'ended', state: 'ended_delivered', detail: 'delivered:whatsapp' });
      // … and the delivery is attributed per LADDER: the certificate ladder — with its OWN accepted, undelivered WhatsApp to the
      // SAME number — sees ⛔ the correction ladder's delivery in its own settle (what ITS re-check reads).
      const certificateLadderId = (await readClaimLadders(db, PARIWAR_A, s.c.cid, 'certificate'))[0]!.ladderId;
      await asSuperuser(client, () =>
        client.query(
          `INSERT INTO claim_contact_wa_sends (ladder_id, pariwar_id, claim_case_id, chase, recipient_number_hash, template_name, locale,
             send_outcome, claimed_at, claimed_by_job, aging_since, send_started_at, provider_message_id)
           VALUES ($1, $2, $3, 'certificate', $4, 'claim_certificate_reminder_en', 'en', 'accepted', now(), 'job-cert', now(), now(), 'wamid.CERT-OWN')`,
          [certificateLadderId, PARIWAR_A, s.c.cid, s.hash],
        ),
      );
      expect(await settleContactLadderWhatsappDeliveries(db, PARIWAR_A, [s.ladderId, certificateLadderId])).toEqual(new Set([s.ladderId]));
      const correctionLadders = await readClaimLadders(db, PARIWAR_A, s.c.cid, 'correction');
      expect(correctionLadders.map((l) => l.ladderId)).toEqual([s.ladderId]);
      expect(correctionLadders[0]!.state).toBe('ended_delivered');
      const certificateLadders = await readClaimLadders(db, PARIWAR_A, s.c.cid, 'certificate');
      expect(certificateLadders).toHaveLength(1);
      expect(certificateLadders[0]!.ladderId).not.toBe(s.ladderId);
      expect(certificateLadders[0]!.state).toBe('running'); // untouched by the correction ladder's delivery / end
    });

    // Review R8 (2026-10-20) — AC6's named leg: "a WhatsApp delivered after conclusion counts" (D22 reads the send
    // row's OWN `delivered_at` "whatever the ladder's state" — WS12), paired with LD17: a late delivery leaves the
    // CONCLUSION and letter-eligibility exactly as already decided — it is ⛔ reverted. Distinct from the EXISTING D22
    // leg above (a SECOND ladder in the same epoch concluding undelivered): here it is the SAME ladder, concluded
    // BEFORE its own delivery is known.
    it('⭐ R8 — a WhatsApp delivered AFTER the ladder\'s OWN conclusion still counts for D22; the conclusion itself is ⛔ reverted (LD17)', async () => {
      const { client, tx } = getTx();
      const s = await setup(client, tx);
      const r = begun(await begin(client, s));
      const db = bindScopedDb(client);
      const ref = { pariwarId: PARIWAR_A, sendId: r.sendId, jobId: 'job-1' };
      await markContactLadderWhatsappInFlight(db, { ...ref, leaseMarginMs: 60_000, now: new Date() });
      await finaliseContactLadderWhatsapp(client, { ...ref, outcome: 'accepted', providerMessageId: 'wamid.LATE' });
      // The ladder CONCLUDES undelivered — nobody has heard back from Meta yet (the send row's delivered_at is NULL).
      await asSuperuser(client, () =>
        client.query(
          `UPDATE claim_contact_ladders
              SET state = 'concluded_undelivered', ended_at = now(), concluded_on = $2,
                  sms2_state = 'satisfied', sms2_on = $2, sms3_due_on = $2, sms3_state = 'satisfied', sms3_on = $2, conclude_on = $2
            WHERE ladder_id = $1`,
          [s.ladderId, s.c.day0],
        ),
      );
      const reach = async () => {
        const chase = await resolveCorrectionChase(tx, PARIWAR_A, s.c.cid, { crypto: ENC });
        return (await readClosureReach(tx, PARIWAR_A, s.c.cid, chase)).people.find((p) => p.personKey === s.c.person.personKey)!;
      };
      expect((await reach()).reachedByLadderWhatsapp).toBe(false); // concluded, ⛔ delivered yet
      // The delivery arrives LATE — after the ladder already concluded.
      await recordClaimContactWaStatus(db, { pariwarId: PARIWAR_A, wamid: 'wamid.LATE', status: 'delivered', errorCode: null });
      expect((await reach()).reachedByLadderWhatsapp).toBe(true); // still counts, WHATEVER the ladder's state
      const ladderRow = await client.query<{ state: string; concluded_on: string }>(`SELECT state, to_char(concluded_on, 'YYYY-MM-DD') AS concluded_on FROM claim_contact_ladders WHERE ladder_id = $1`, [
        s.ladderId,
      ]);
      expect(ladderRow.rows[0]).toEqual({ state: 'concluded_undelivered', concluded_on: s.c.day0 }); // the conclusion stands — ⛔ reverted
    });
  });
});
