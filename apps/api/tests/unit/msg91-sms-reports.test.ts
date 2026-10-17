// MSG91's SMS delivery reports — the webhook's pure half (Story 6.37b, Task 4; AC3; DR2, DR10; I3). DB-free.
// The fixtures are MSG91's DOCUMENTED sample (https://msg91.com/help/webhook-new/how-to-receive-sms-delivery-reports-via-webhook-new,
// read 2026-10-17) — every value a JSON string; the phone number masked there as `919XXXXXXXXX`, a real-shaped one here.

import { describe, expect, it } from 'vitest';

import {
  cleanFailureReason,
  parseSmsReportBody,
  projectSmsReport,
  projectSmsReports,
} from '../../src/modules/channel-webhooks/msg91-sms-reports.js';

const NUMBER = '919812345678';

/** A copy of `o` without `key`. */
function without(o: Record<string, unknown>, key: string): Record<string, unknown> {
  const copy = { ...o };
  delete copy[key];
  return copy;
}
const CRQID = 'cr0f1e2d3c4b5a49788695a4b3c2d1e0f9';

/** Every F3 field (the full panel template). */
const FULL = {
  pluginsource: '1',
  requestedAt: '2025-07-09 11:29:40',
  status: '1',
  deliveryTime: '2025-07-09 11:29:46',
  telNum: NUMBER,
  credit: '0.25',
  senderId: 'TWTRST',
  campaignName: 'flow',
  route: '4',
  campaign_pid: '123',
  clientId: '456',
  userId: '789012',
  ts: '1752040786',
  CRQID,
  requestId: '69aa1b2c3d4e5f6a7b8c9d03',
  UUID: 'abc',
  INMSID: 'def',
  DLT_TE_ID: '1107161234567890123',
  eventName: 'delivered',
  event: 'delivered',
  failureReason: '',
  smsLength: '1',
  upperCaseEventName: 'DELIVERED',
};

describe('projectSmsReport — EXACTLY DR2\'s six values (I3)', () => {
  it('a body holding every F3 field ⇒ the projection holds ONLY the allowlisted values; ⛔ the number anywhere', () => {
    const row = projectSmsReport(FULL);
    expect(row).toEqual({
      requestId: '69aa1b2c3d4e5f6a7b8c9d03',
      crqid: CRQID,
      statusCode: '1',
      eventName: 'delivered',
      failureReason: null,
      reportedDeliveryTime: '2025-07-09 11:29:46',
    });
    const blob = JSON.stringify(row);
    for (const leaked of [NUMBER, '9812345678', 'TWTRST', '0.25', '789012', '1107161234567890123']) expect(blob).not.toContain(leaked);
  });

  it.each([
    ['"0" (MSG91\'s none — T7)', '0'],
    ['empty', ''],
    ['a panel test value', 'Beta1'],
    ['upper-case hex', CRQID.toUpperCase()],
    ['a number', 0],
  ])('a CRQID that is %s ⇒ NULL', (_l, CRQID) => {
    expect(projectSmsReport({ ...FULL, CRQID })!.crqid).toBeNull();
  });

  it('an absent CRQID ⇒ NULL; an `ot…` login-code CRQID is kept', () => {
    expect(projectSmsReport(without(FULL, 'CRQID'))!.crqid).toBeNull();
    expect(projectSmsReport({ ...FULL, CRQID: `ot${CRQID.slice(2)}` })!.crqid).toBe(`ot${CRQID.slice(2)}`);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['too long', 'a'.repeat(65)],
    ['punctuated', '69aa-1b2c'],
    ['an object', { x: 1 }],
  ])('a request id that is %s ⇒ ⛔ stored (null)', (_l, requestId) => {
    expect(projectSmsReport({ ...FULL, requestId })).toBeNull();
  });

  it('a status outside 1–3 digits ⇒ NULL (the code is recorded, ⛔ decides here); a numeric status is its decimal form', () => {
    expect(projectSmsReport({ ...FULL, status: 'x' })!.statusCode).toBeNull();
    expect(projectSmsReport({ ...FULL, status: '1000' })!.statusCode).toBeNull();
    expect(projectSmsReport({ ...FULL, status: 25 })!.statusCode).toBe('25');
  });

  it('an event name outside [A-Za-z_]{1,32} ⇒ NULL', () => {
    expect(projectSmsReport({ ...FULL, eventName: 'deli vered' })!.eventName).toBeNull();
    expect(projectSmsReport({ ...FULL, eventName: 'a'.repeat(33) })!.eventName).toBeNull();
  });

  it('a delivery time over 40 characters, or with a control character ⇒ NULL (T8 — ⛔ parsed)', () => {
    expect(projectSmsReport({ ...FULL, deliveryTime: 'x'.repeat(41) })!.reportedDeliveryTime).toBeNull();
    expect(projectSmsReport({ ...FULL, deliveryTime: '2025\n07' })!.reportedDeliveryTime).toBeNull();
    expect(projectSmsReport({ ...FULL, deliveryTime: '2025-07-09T11:29:46+05:30' })!.reportedDeliveryTime).toBe('2025-07-09T11:29:46+05:30');
  });

  it('⛔ a prototype key is read', () => {
    const proto = Object.create({ requestId: 'fromproto' }) as Record<string, unknown>;
    expect(projectSmsReport(proto)).toBeNull();
  });
});

describe('cleanFailureReason (DR2)', () => {
  it('a 10-digit run ⇒ `#`; a 6-digit run is kept', () => {
    expect(cleanFailureReason('Failed for 9812345678 at op 123456')).toBe('Failed for # at op 123456');
  });

  it('control characters are stripped FIRST, so a number split by one is still masked', () => {
    expect(cleanFailureReason('to 98123\n45678')).toBe('to #');
    expect(cleanFailureReason('a\u2028b\u200bc')).toBe('abc');
  });

  it('any script\'s digits count (Devanagari)', () => {
    expect(cleanFailureReason('नंबर ९८१२३४५६७८')).toBe('नंबर #');
  });

  it.each([
    '+91 98123 45678', '98123-45678', '+91 (98123) 45678', '98123.45678', '98123/45678',
    '98123\u00a045678', '98123\u201145678', '९८१२३ ४५६७८', '+९१ 98123 ४५६७८',
  ])('a formatted phone number (%s) is masked in the reason and projection', (number) => {
    expect(cleanFailureReason(`Failed for ${number}`)).toBe('Failed for #');
    expect(projectSmsReport({ ...FULL, failureReason: `Failed for ${number}` })!.failureReason).toBe('Failed for #');
  });

  it.each([
    '98123,45678', '98123_45678', '98123:45678', "98'123'45678", '98123\u00b745678', '98123• 45678', '98123 + 45678',
    '98123 #45678', '98123;45678', '98123|45678', '[98123] [45678]', '\uff0898123\uff0945678', '98123\uff0e45678',
    '⁹⁸¹²³⁴⁵⁶⁷⁸', '①②③④⑤⑥⑦', '9 8 1 2 3 4 5 6 7 8', '+91-98123-45678', '0091 98123 45678',
  ])('a number behind ANY short non-letter separator (%s) is masked — the separator set is not a list', (number) => {
    // A bracket BEFORE the first digit stays (`[#]`); ⛔ numeral survives.
    const cleaned = cleanFailureReason(`Failed for ${number}`)!;
    expect(cleaned).toMatch(/^Failed for \P{N}*#\P{N}*$/u);
    expect(cleaned).not.toMatch(/\p{N}/u);
  });

  it('⚠ DELIBERATE over-masking: a ≥ 7-digit timestamp is masked; letters between digit groups stop the mask', () => {
    expect(cleanFailureReason('error 500 at 2026-10-17 12:34:56')).toBe('error 500 at #');
    expect(cleanFailureReason('code 123 then 4567 x 89')).toBe('code 123 then 4567 x 89');
  });

  it('a 1 MB adversarial reason is scanned in linear time (⛔ backtracking)', () => {
    const t0 = performance.now();
    cleanFailureReason(`1${'()-'.repeat(350_000)}`);
    cleanFailureReason('123456 '.repeat(150_000));
    expect(performance.now() - t0).toBeLessThan(2000);
  });

  it('masks before truncating and preserves separate short diagnostics and ordinary reason text', () => {
    expect(cleanFailureReason(`${'x'.repeat(190)} +91 98123 45678`)).toBe(`${'x'.repeat(190)} #`);
    expect(cleanFailureReason('op 123456 error 25')).toBe('op 123456 error 25');
  });

  it('trimmed, ≤ 200; blank ⇒ null; a non-string ⇒ null', () => {
    expect(cleanFailureReason(`  ${'x'.repeat(250)}  `)).toHaveLength(200);
    expect(cleanFailureReason('   ')).toBeNull();
    expect(cleanFailureReason(null)).toBeNull();
    expect(cleanFailureReason({})).toBeNull();
  });

  it('MSG91\'s documented DLT reasons are kept as written', () => {
    for (const r of ['DLT Scrubbing Failed', 'Template not matched on DLT', 'Template Id not found on DLT', 'Template Inactive on DLT']) {
      expect(cleanFailureReason(r)).toBe(r);
    }
  });
});

describe('parseSmsReportBody (DR2, DR10; T20)', () => {
  it('one object ⇒ one report; an array of objects ⇒ each', () => {
    expect(parseSmsReportBody(Buffer.from(JSON.stringify(FULL)))).toEqual({ kind: 'reports', items: [FULL] });
    expect(parseSmsReportBody(JSON.stringify([FULL, FULL, FULL]))).toMatchObject({ kind: 'reports', items: [FULL, FULL, FULL] });
  });

  it.each([
    ['absent', undefined],
    ['null', null],
    ['an object (⛔ a Buffer)', { requestId: 'x' }],
    ['empty', Buffer.alloc(0)],
    ['whitespace', '  '],
    ['not JSON — quoting the number', `{"telNum":"${NUMBER}","x":}`],
    ['a scalar', '42'],
    ['a string', '"x"'],
    ['null', 'null'],
    ['an empty array', '[]'],
    ['an array holding a non-object', `[${JSON.stringify(FULL)}, 1]`],
    ['an array of 101', JSON.stringify(Array.from({ length: 101 }, () => FULL))],
    ['form-encoded', `requestId=69aa&telNum=${NUMBER}`],
  ])('%s ⇒ unusable, and ⛔ the body in the result', (_l, raw) => {
    const out = parseSmsReportBody(raw);
    expect(out).toEqual({ kind: 'unusable' });
    expect(JSON.stringify(out)).not.toContain(NUMBER);
  });

  it('an array of exactly 100 is usable', () => {
    expect(parseSmsReportBody(JSON.stringify(Array.from({ length: 100 }, () => FULL)))).toMatchObject({ kind: 'reports' });
  });
});

it('projectSmsReports — a report with ⛔ usable request id inside an array of 3 ⇒ 2 rows + ONE bad id', () => {
  const out = projectSmsReports([FULL, without(FULL, 'requestId'), { ...FULL, status: '2' }]);
  expect(out.rows).toHaveLength(2);
  expect(out.badRequestIds).toBe(1);
});
