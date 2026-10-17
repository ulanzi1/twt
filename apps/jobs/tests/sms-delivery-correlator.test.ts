// The SMS delivery-report correlator's DECISIONS — DB-free (Story 6.37b, Task 5; AC5, AC6; DR4, DR6). The status table
// one leg per code, DR6 row by row through a stub lookup (counted — rows 1–2 ⛔ look up), the backoff and the 72 h settle.
// Codes 16, 17, 20, 25 and 9 have ⛔ documented sample report — SYNTHETIC here (MSG91's status page lists them).

import type { smsDelivery } from '@twt/domain';
import { describe, expect, it, vi } from 'vitest';

import {
  SMS_REPORT_RETRY_WINDOW_MS,
  SMS_REPORT_STATUS_TABLE,
  decideSmsReport,
  mapSmsReportStatus,
  smsReportRetryDelayMs,
} from '../src/sms-delivery-correlator.js';

const ROW = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const HEX = ROW.replace(/-/g, '');
const REQ = '5e1e93cad6fc054d8e759a5b';
const T0 = new Date('2026-10-17T05:00:00.000Z');
const at = (ms: number) => new Date(T0.getTime() + ms);

const claimed = (over: Partial<smsDelivery.ClaimedSmsDeliveryReport> = {}): smsDelivery.ClaimedSmsDeliveryReport => ({
  reportId: 'r1',
  requestId: REQ,
  crqid: `cr${HEX}`,
  statusCode: '1',
  failureReason: null,
  receivedAt: T0,
  attempts: 1,
  ...over,
});

const send = (over: Partial<smsDelivery.SmsSendRowFacts> = {}): smsDelivery.SmsSendRowFacts => ({
  pariwarId: '11111111-1111-1111-1111-111111111111',
  outcome: 'accepted',
  providerMessageId: REQ,
  purpose: 'family_sms',
  ...over,
});

const lookupOf = (facts: smsDelivery.SmsSendRowFacts | null) => vi.fn(async () => facts);

describe('DR4 — the status table (AC5)', () => {
  it.each([
    ['1', 'delivered'],
    ['2', 'undelivered'],
    ['9', 'undelivered'],
    ['16', 'undelivered'],
    ['17', 'undelivered'],
    ['20', 'undelivered'],
    ['25', 'undelivered'],
    ['0', 'intermediate'],
    ['7', 'unknown_status'],
    ['3', 'unknown_status'],
    [null, 'unknown_status'],
    ['constructor', 'unknown_status'],
    ['toString', 'unknown_status'],
  ] as const)('%s ⇒ %s', (code, result) => {
    expect(mapSmsReportStatus(code)).toBe(result);
  });

  it('the table is EXACTLY those eight codes (data — ⛔ a branch elsewhere decides a code)', () => {
    expect(Object.keys(SMS_REPORT_STATUS_TABLE).sort()).toEqual(['0', '1', '16', '17', '2', '20', '25', '9']);
    expect(Object.isFrozen(SMS_REPORT_STATUS_TABLE)).toBe(true);
  });
});

describe('DR6 — the matching rule, row by row (AC6)', () => {
  it('row 1 — ⛔ CRQID ⇒ unmatched:no_crqid + the LOUD alarm; ⛔ lookup', async () => {
    const lookup = lookupOf(send());
    expect(await decideSmsReport(claimed({ crqid: null }), T0, lookup)).toEqual({
      kind: 'settle',
      matchState: 'unmatched',
      matchDetail: 'no_crqid',
      alarm: 'sms_report.no_crqid',
    });
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each([
    ['1', 'delivered', undefined],
    ['2', 'undelivered', undefined],
    ['0', 'intermediate', undefined],
    ['7', 'unknown_status', 'sms_report.unknown_status:7'],
    [null, 'unknown_status', 'sms_report.unknown_status:none'],
  ] as const)('row 2 — an `ot` report, status %s ⇒ otp:%s (alarm %s); ⛔ lookup, ⛔ member, ⛔ row', async (code, detail, alarm) => {
    const lookup = lookupOf(send());
    expect(await decideSmsReport(claimed({ crqid: `ot${HEX}`, statusCode: code }), T0, lookup)).toEqual({
      kind: 'settle',
      matchState: 'otp',
      matchDetail: detail,
      ...(alarm !== undefined ? { alarm } : {}),
    });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('the lookup is the CRQID\'s kind and DASHED row id', async () => {
    const lookup = lookupOf(send());
    await decideSmsReport(claimed({ crqid: `pm${HEX}` }), T0, lookup);
    expect(lookup).toHaveBeenCalledWith('pm', ROW);
  });

  it('row 3 — ⛔ row ⇒ a RETRY on the backoff, and unmatched:no_row + alarm once 72 h after received_at', async () => {
    expect(await decideSmsReport(claimed(), at(1000), lookupOf(null))).toEqual({ kind: 'retry', nextAttemptAt: at(1000 + 60_000) });
    expect(await decideSmsReport(claimed({ crqid: `sn${HEX}` }), at(SMS_REPORT_RETRY_WINDOW_MS), lookupOf(null))).toEqual({
      kind: 'settle',
      matchState: 'unmatched',
      matchDetail: 'no_row',
      alarm: 'sms_report.unmatched:sn',
    });
  });

  it('a retry is ⛔ scheduled past the 72 h mark (the last one is due AT it)', async () => {
    const now = at(SMS_REPORT_RETRY_WINDOW_MS - 60_000);
    expect(await decideSmsReport(claimed({ attempts: 9 }), now, lookupOf(null))).toEqual({ kind: 'retry', nextAttemptAt: at(SMS_REPORT_RETRY_WINDOW_MS) });
  });

  it.each(['staff_push', 'staff_reminder', 'letter_chase', null])('row 4 — a `cr` row whose purpose is %s ⇒ unmatched:not_sms + alarm', async (purpose) => {
    expect(await decideSmsReport(claimed(), T0, lookupOf(send({ purpose })))).toEqual({
      kind: 'settle',
      matchState: 'unmatched',
      matchDetail: 'not_sms',
      alarm: 'sms_report.not_sms',
    });
  });

  it('row 4 is the CORRECTION table\'s only — a `ce` / `sn` / `pm` row has ⛔ purpose and is an SMS', async () => {
    for (const kind of ['ce', 'sn', 'pm']) {
      expect(await decideSmsReport(claimed({ crqid: `${kind}${HEX}` }), T0, lookupOf(send({ purpose: null })))).toMatchObject({ matchState: 'matched' });
    }
  });

  it('row 5 — a ping never begun (send_outcome NULL) ⇒ retry, then unmatched:not_begun', async () => {
    const pm = claimed({ crqid: `pm${HEX}` });
    expect(await decideSmsReport(pm, T0, lookupOf(send({ outcome: null, purpose: null })))).toMatchObject({ kind: 'retry' });
    expect(await decideSmsReport(pm, at(SMS_REPORT_RETRY_WINDOW_MS), lookupOf(send({ outcome: null, purpose: null })))).toEqual({
      kind: 'settle',
      matchState: 'unmatched',
      matchDetail: 'not_begun',
      alarm: 'sms_report.unmatched:pm',
    });
  });

  it('row 6 — `attempting` ⇒ retry, then unmatched:still_attempting (⛔ other_attempt)', async () => {
    expect(await decideSmsReport(claimed(), T0, lookupOf(send({ outcome: 'attempting', providerMessageId: null })))).toMatchObject({ kind: 'retry' });
    expect(await decideSmsReport(claimed(), at(SMS_REPORT_RETRY_WINDOW_MS + 1), lookupOf(send({ outcome: 'attempting' })))).toEqual({
      kind: 'settle',
      matchState: 'unmatched',
      matchDetail: 'still_attempting',
      alarm: 'sms_report.unmatched:cr',
    });
  });

  it.each<[string, Partial<smsDelivery.SmsSendRowFacts>]>([
    ['an accepted row of ANOTHER request', { providerMessageId: 'b'.repeat(24) }],
    ['an `error` row (⛔ id)', { outcome: 'error', providerMessageId: null }],
    ['a `rejected_unreachable` row', { outcome: 'rejected_unreachable', providerMessageId: null }],
    ['a non-accepted row that somehow holds this id', { outcome: 'no_target', providerMessageId: REQ }],
  ])('row 7 — %s ⇒ other_attempt:<kind> + ONE alarm, ⛔ delivery write', async (_l, over) => {
    const d = await decideSmsReport(claimed({ statusCode: '2' }), T0, lookupOf(send(over)));
    expect(d).toEqual({
      kind: 'settle',
      matchState: 'other_attempt',
      matchDetail: 'cr',
      alarm: 'sms_report.second_request_for_one_send:cr',
    });
  });

  it('row 8 — this request\'s acceptance ⇒ matched:<state> + the delivery write (kind, row, request, code, reason, received_at)', async () => {
    const d = await decideSmsReport(claimed({ crqid: `ce${HEX}`, statusCode: '16', failureReason: 'Rejected' }), T0, lookupOf(send({ purpose: null })));
    expect(d).toEqual({
      kind: 'settle',
      matchState: 'matched',
      matchDetail: 'undelivered',
      delivery: {
        pariwarId: '11111111-1111-1111-1111-111111111111',
        kind: 'ce',
        rowId: ROW,
        requestId: REQ,
        state: 'undelivered',
        statusCode: '16',
        failureReason: 'Rejected',
        receivedAt: T0,
      },
    });
  });

  it('⭐ AC5 — ⛔ the event name or the failure reason decides: `eventName:"delivered"` on a status-2 body is still undelivered', async () => {
    // (The event name is ⛔ even carried to the decision — the claimed row holds the status code only.)
    const d = await decideSmsReport(claimed({ statusCode: '2', failureReason: 'delivered' }), T0, lookupOf(send()));
    expect(d).toMatchObject({ matchState: 'matched', matchDetail: 'undelivered' });
  });

  it.each([
    ['0', 'intermediate', undefined],
    ['7', 'unknown_status', 'sms_report.unknown_status:7'],
    [null, 'unknown_status', 'sms_report.unknown_status:none'],
  ] as const)('row 9 — status %s on a matching row ⇒ ignored:%s, ⛔ delivery write', async (code, detail, alarm) => {
    expect(await decideSmsReport(claimed({ statusCode: code }), T0, lookupOf(send()))).toEqual({
      kind: 'settle',
      matchState: 'ignored',
      matchDetail: detail,
      ...(alarm !== undefined ? { alarm } : {}),
    });
  });
});

it('DR6 — the backoff: 1 min, 5 min, 30 min, 2 h, then every 6 h', () => {
  expect([1, 2, 3, 4, 5, 9].map(smsReportRetryDelayMs)).toEqual([60_000, 300_000, 1_800_000, 7_200_000, 21_600_000, 21_600_000]);
});
