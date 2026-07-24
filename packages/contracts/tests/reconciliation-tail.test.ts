// The reconciliation-tail-window SEAM contract — Story 8.9 (Task 3; AC4).
//
// A DECLARED seam with NO live caller yet (the Epic-8 convention, e.g. Story 8.4's nominee-VPA
// `{available:false}`): Epic 9 Story 9.x (matcher-tail scheduler) and Epic 11b Story 11b.3 (Sahyog
// Vivran auto-publish gate) are the first two consumers. So the teeth here are the SHAPE itself —
// what a future consumer may rely on, and what the boundary rejects — plus the posture assertions
// that keep the seam honest until it is wired.

import { cycleCalendar } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  RECONCILIATION_TAIL_MAX_DAYS,
  RECONCILIATION_TAIL_NORMAL_DAYS,
  ReconciliationTailWindow,
} from '../src/alerts/reconciliation-tail.js';

const VALID = {
  close_at: '2026-11-13T18:30:00.000Z',
  tail_deadline_at: '2026-11-18T18:30:00.000Z',
  extended_by_holiday: true,
  holiday_label: 'Chhath Puja',
};

describe('ReconciliationTailWindow — the shape both future consumers receive (AC4)', () => {
  it('accepts a holiday-extended tail', () => {
    expect(ReconciliationTailWindow.parse(VALID)).toEqual(VALID);
  });

  it('accepts a normal (un-extended) tail with a null label', () => {
    const normal = { ...VALID, extended_by_holiday: false, holiday_label: null };
    expect(ReconciliationTailWindow.parse(normal)).toEqual(normal);
  });

  it('requires `holiday_label` to be present — null is explicit, absent is a producer bug', () => {
    const withoutLabel = { ...VALID } as Partial<typeof VALID>;
    delete withoutLabel.holiday_label;
    expect(() => ReconciliationTailWindow.parse(withoutLabel)).toThrow();
  });

  it('rejects an unknown field (.strict) so a producer cannot smuggle un-contracted data', () => {
    expect(() => ReconciliationTailWindow.parse({ ...VALID, pariwar_id: 'x' })).toThrow();
  });

  it('rejects a non-ISO instant on either bound', () => {
    expect(() => ReconciliationTailWindow.parse({ ...VALID, close_at: '2026-11-13' })).toThrow();
    expect(() => ReconciliationTailWindow.parse({ ...VALID, tail_deadline_at: 'soon' })).toThrow();
  });

  it('rejects an EMPTY holiday label — a named observance or nothing, never a blank string', () => {
    expect(() => ReconciliationTailWindow.parse({ ...VALID, holiday_label: '' })).toThrow();
  });

  it('rejects a tail deadline at or before the close — a tail is always forward-going', () => {
    expect(() =>
      ReconciliationTailWindow.parse({ ...VALID, tail_deadline_at: '2026-11-13T18:30:00.000Z' }),
    ).toThrow(/after/i);
    expect(() =>
      ReconciliationTailWindow.parse({ ...VALID, tail_deadline_at: '2026-11-01T18:30:00.000Z' }),
    ).toThrow(/after/i);
  });

  it('rejects `extended_by_holiday: true` with no named observance (the coherence rule)', () => {
    expect(() =>
      ReconciliationTailWindow.parse({ ...VALID, extended_by_holiday: true, holiday_label: null }),
    ).toThrow(/holiday_label/);
  });

  it('rejects a named observance on an un-extended tail (the same rule, the other direction)', () => {
    expect(() =>
      ReconciliationTailWindow.parse({ ...VALID, extended_by_holiday: false }),
    ).toThrow(/holiday_label/);
  });
});

describe('the UX-DR77 tail bands are exported as DATA, not re-derived per consumer (D3)', () => {
  it('normal 1-2 days → the upper bound; holiday-extended up to 5-7 days → the upper bound', () => {
    expect(RECONCILIATION_TAIL_NORMAL_DAYS).toBe(2);
    expect(RECONCILIATION_TAIL_MAX_DAYS).toBe(7);
  });

  it('the bands stay in lockstep with @twt/domain cycleCalendar (the cross-package sync guard)', () => {
    // Test-only cross-package import (the claims-appeal.test.ts / audit.test.ts precedent: contracts
    // TESTS may import domain, contracts SOURCE may not — a test never ships in the Metro bundle,
    // [[project_contracts_domain_bundle_boundary]]). This is the mechanical guard that the two
    // deliberately-duplicated constants cannot drift.
    expect(RECONCILIATION_TAIL_NORMAL_DAYS).toBe(cycleCalendar.DEFAULT_NORMAL_TAIL_DAYS);
    expect(RECONCILIATION_TAIL_MAX_DAYS).toBe(cycleCalendar.DEFAULT_MAX_TAIL_DAYS);
  });
});

// ─── The seam HANDOFF — the domain resolver's result is a valid tail window ───────────────────────
//
// The contract is only useful if the one producer that will ever fill it can. This closes the loop the
// live-DB spec starts (registry read → resolver, packages/domain/tests/integration/cycle-calendar/):
// resolver → contract. Without it, the two halves could drift into shapes that never compose, and
// nobody would find out until Epic 9 tried to wire them.

describe('seam handoff — @twt/domain cycleCalendar output parses as a ReconciliationTailWindow', () => {
  const CHHATH = { label: 'Chhath Puja', startDate: '2026-11-13', endDate: '2026-11-16' };

  /** The mapping Epic 9 / Epic 11b will write once, at their producer boundary. */
  const toWire = (tail: ReturnType<typeof cycleCalendar.reconciliationTailDeadline>) => ({
    close_at: tail.closeAt.toISOString(),
    tail_deadline_at: tail.tailDeadlineAt.toISOString(),
    extended_by_holiday: tail.extendedByHoliday,
    holiday_label: tail.holidayLabel,
  });

  it('a HOLIDAY-EXTENDED tail maps cleanly and names the observance', () => {
    const tail = cycleCalendar.reconciliationTailDeadline(new Date('2026-11-13T06:00:00Z'), [CHHATH]);
    const wire = ReconciliationTailWindow.parse(toWire(tail));
    expect(wire.extended_by_holiday).toBe(true);
    expect(wire.holiday_label).toBe('Chhath Puja');
    expect(Date.parse(wire.tail_deadline_at)).toBeGreaterThan(Date.parse(wire.close_at));
  });

  it('a NORMAL tail maps cleanly with a null label', () => {
    const tail = cycleCalendar.reconciliationTailDeadline(new Date('2026-06-10T06:00:00Z'), [CHHATH]);
    const wire = ReconciliationTailWindow.parse(toWire(tail));
    expect(wire.extended_by_holiday).toBe(false);
    expect(wire.holiday_label).toBeNull();
  });

  it('an EMPTY calendar (the RLS fail-closed read) still yields a VALID tail window', () => {
    const tail = cycleCalendar.reconciliationTailDeadline(new Date('2026-11-13T06:00:00Z'), []);
    expect(() => ReconciliationTailWindow.parse(toWire(tail))).not.toThrow();
  });

  it('the resolver can never emit a tail that violates the contract’s coherence rules', () => {
    // Sweep every close date across a month that contains a window, both bounds of the tail bands.
    for (let day = 1; day <= 30; day += 1) {
      const close = new Date(`2026-11-${String(day).padStart(2, '0')}T06:00:00Z`);
      for (const windows of [[], [CHHATH]]) {
        const tail = cycleCalendar.reconciliationTailDeadline(close, windows);
        expect(() => ReconciliationTailWindow.parse(toWire(tail))).not.toThrow();
      }
    }
  });
});
