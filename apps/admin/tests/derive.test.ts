// Pure view-model derivation tests (Story 1.11b, DD-4/DD-5).

import { describe, expect, it } from 'vitest';

import { deriveIntegrityView } from '../src/modules/audit-integrity/derive.js';
import { makeItem, makeAck } from './_helpers.js';

describe('deriveIntegrityView', () => {
  it('empty history → empty banner', () => {
    const v = deriveIntegrityView([]);
    expect(v.banner).toBe('empty');
    expect(v.latest).toBeNull();
    expect(v.lastAutomated).toBeNull();
  });

  it('latest valid → ok banner, no failure detail', () => {
    const v = deriveIntegrityView([makeItem({ chainValid: true })]);
    expect(v.banner).toBe('ok');
    expect(v.failure).toBeNull();
  });

  it('last automated skips on_demand checks', () => {
    const v = deriveIntegrityView([
      makeItem({ triggerSource: 'on_demand', verifiedAt: '2026-06-14T05:00:00.000Z' }),
      makeItem({ triggerSource: 'cron', verifiedAt: '2026-06-14T02:00:00.000Z' }),
    ]);
    expect(v.lastAutomated?.triggerSource).toBe('cron');
  });

  it('latest invalid (unacknowledged) → fail banner with all four DD-4 fields', () => {
    const priorGood = makeItem({
      chainValid: true,
      verifiedAt: '2026-06-13T02:00:00.000Z',
      endAuditId: 'PRIOR-GOOD-END',
      endSeq: 6,
    });
    const broken = makeItem({
      chainValid: false,
      verifiedAt: '2026-06-14T02:00:00.000Z',
      firstBrokenAuditId: 'BROKEN-ROW',
      firstBrokenSeq: 7,
      endAuditId: 'PRIOR-VALID-ROW',
      endSeq: 6,
    });
    const v = deriveIntegrityView([broken, priorGood]);
    expect(v.banner).toBe('fail');
    expect(v.failure).toEqual({
      failingAuditId: 'BROKEN-ROW',
      failingSeq: 7,
      priorValidAuditId: 'PRIOR-VALID-ROW',
      priorValidSeq: 6,
      tamperWindowFrom: '2026-06-13T02:00:00.000Z',
      tamperWindowTo: '2026-06-14T02:00:00.000Z',
      lastProvablyGoodAuditId: 'PRIOR-GOOD-END',
      lastProvablyGoodSeq: 6,
    });
  });

  it('latest invalid but acknowledged → muted fail-acknowledged banner', () => {
    const broken = makeItem({
      chainValid: false,
      firstBrokenAuditId: 'BROKEN-ROW',
      firstBrokenSeq: 7,
      acknowledgement: makeAck({ ticketRef: 'JIRA-9' }),
    });
    const v = deriveIntegrityView([broken]);
    expect(v.banner).toBe('fail-acknowledged');
    expect(v.failure?.failingAuditId).toBe('BROKEN-ROW');
  });

  it('first broken at head (no prior good) → tamper window floor is null', () => {
    const broken = makeItem({
      chainValid: false,
      firstBrokenAuditId: 'HEAD',
      firstBrokenSeq: 2,
      endAuditId: null,
      endSeq: null,
    });
    const v = deriveIntegrityView([broken]);
    expect(v.failure?.tamperWindowFrom).toBeNull();
    expect(v.failure?.lastProvablyGoodAuditId).toBeNull();
  });
});
