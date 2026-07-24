// FR-22 REVERT-SANITY FENCE — Story 8.9 (Task 4; AC3).
//
// Story 8.9 is a substrate story with one load-bearing NEGATIVE deliverable: the hard Day-15
// contribution close must come out of it byte-unchanged. The epics AC prose at `epics.md:3022` says the
// opposite ("extend … the time-window when contributions are accepted"); that sentence is a RATIFIED
// drafting error (BigDev, 2026-07-24 — see the story banner + sprint-change-proposal-2026-07-24.md),
// because FR-22 (`live → closed` HARD at Day 15), the UX-DR77 anchor itself ("Day 15 mechanical
// close"), and the shipped Story 8.1 alert lifecycle all say the close is mechanical.
//
// A drafting error that survived into a ratified epic can just as easily walk into the code later, so
// the correction is MECHANIZED here rather than left as prose. These assertions fail loudly if anyone
// — a future story, or a well-meaning reading of L3022 — starts routing holiday awareness into the
// member's deadline instead of into the post-close reconciliation tail.
//
// Two kinds of teeth:
//   (a) BEHAVIOURAL — the window constant and its boundary arithmetic, pinned to exact values.
//   (b) STRUCTURAL — the D5 seam and its two live consumers (the My Pool card + the deadline-reminder
//       sweep) carry NO holiday/tail vocabulary in executable code. This is what makes it a revert
//       sanity check rather than a restatement of the existing D5 tests: it fences the surface against
//       a change that would still pass every behavioural test written before 8.9 (a tail-aware branch
//       taken only when a Pariwar has curated windows would slip straight through those).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CYCLE_WINDOW_DAYS, computeDaysRemaining } from '../src/alerts/contribution-loop-templates.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Read a repo file with comments stripped — the fence targets EXECUTABLE code, and every file below
 *  legitimately DISCUSSES the tail in prose (that is the AC3 comment correction).
 *
 *  Character-walking, not regex-replace (review fix): a plain `/\/\*[\s\S]*?\*\//` /
 *  `/\/\/.*$/` pair doesn't know about string/template literals, so a `//` or `/*` sequence
 *  INSIDE a quoted string would be misread as a comment start and strip real code (or, read the
 *  other way, code masquerading as a string could hide tail vocabulary from the scan). This walks
 *  the source tracking single/double-quote and template-literal state and only treats `//`/`/*`
 *  as comment-openers outside of one. */
function readCode(rel: string): string {
  const src = readFileSync(path.join(repoRoot, rel), 'utf8');
  let out = '';
  let quote: '"' | "'" | '`' | null = null;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') {
        out += next ?? '';
        i += 1;
      } else if (c === quote) {
        quote = null;
      }
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      out += c;
      continue;
    }
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      out += '\n';
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 1; // land on the closing '/'
      out += ' ';
      continue;
    }
    out += c;
  }
  return out;
}

const D5_SEAM = 'packages/contracts/src/alerts/contribution-loop-templates.ts';
const MY_POOL_CARD = 'apps/api/src/modules/member-pool/handlers.ts';
const DEADLINE_SWEEP = 'apps/jobs/src/scheduler/contribution-notify-triggers.ts';

/** Vocabulary that, appearing in the EXECUTABLE code of the contribution-window path, would mean the
 *  tail substrate had leaked into the member's deadline. */
const TAIL_VOCABULARY = [
  'cycleCalendar',
  'reconciliationTailDeadline',
  'tailDeadline',
  'tail_deadline_at',
  'ReconciliationTailWindow',
  'isHolidayDate',
  'nextNonHolidayDate',
  'holidayWindow',
  'pariwarHolidayCalendar',
];

// ─── (a) behavioural: the window is exactly 15 days and clamps at both ends ───────────────────────

describe('AC3 — the hard Day-15 contribution close is byte-unchanged (FR-22)', () => {
  it('CYCLE_WINDOW_DAYS is exactly 15 — no holiday calendar may widen it', () => {
    expect(CYCLE_WINDOW_DAYS).toBe(15);
  });

  it('computeDaysRemaining still takes (committedAt, now) ONLY — no windows/calendar parameter', () => {
    // Arity is the cheapest structural proof that the tail's inputs never reached this helper: a
    // holiday-aware variant would have to accept the Pariwar's windows to do anything at all.
    expect(computeDaysRemaining.length).toBe(2);
  });

  it('the deadline is committedAt + 15 days flat, at both boundaries', () => {
    const committedAt = new Date('2026-11-01T00:00:00.000Z');
    expect(computeDaysRemaining(committedAt, committedAt)).toBe(15);
    expect(computeDaysRemaining(committedAt, new Date('2026-11-16T00:00:00.000Z'))).toBe(0);
  });

  it('a close landing INSIDE the Chhath Puja window still closes on day 15 — the case 8.9 is about', () => {
    // Cycle frozen 2026-11-01 → the window ends 2026-11-16, squarely inside Chhath Puja (13-16 Nov).
    // The reconciliation TAIL extends past it; the member's deadline does NOT.
    const committedAt = new Date('2026-11-01T00:00:00.000Z');
    expect(computeDaysRemaining(committedAt, new Date('2026-11-14T00:00:00.000Z'))).toBe(2);
    expect(computeDaysRemaining(committedAt, new Date('2026-11-15T00:00:00.000Z'))).toBe(1);
    expect(computeDaysRemaining(committedAt, new Date('2026-11-16T00:00:00.000Z'))).toBe(0);
    expect(computeDaysRemaining(committedAt, new Date('2026-11-17T00:00:00.000Z'))).toBe(0);
  });

  it('clamps below zero and above the window (clock skew / over-run)', () => {
    const committedAt = new Date('2026-11-01T00:00:00.000Z');
    expect(computeDaysRemaining(committedAt, new Date('2026-10-01T00:00:00.000Z'))).toBe(15);
    expect(computeDaysRemaining(committedAt, new Date('2027-01-01T00:00:00.000Z'))).toBe(0);
  });
});

// ─── (b) structural: no tail vocabulary in the contribution-window path ──────────────────────────

describe('AC3 — the tail substrate has NOT leaked into the contribution-window path', () => {
  for (const file of [D5_SEAM, MY_POOL_CARD, DEADLINE_SWEEP]) {
    it(`${file} carries no holiday/tail vocabulary in executable code`, () => {
      const code = readCode(file);
      for (const token of TAIL_VOCABULARY) {
        expect(code, `"${token}" appeared in ${file}`).not.toContain(token);
      }
    });
  }

  it('the D5 seam does not import the tail contract (they are siblings, never composed)', () => {
    expect(readCode(D5_SEAM)).not.toContain('reconciliation-tail');
  });

  it('both live consumers still resolve their window through the ONE D5 helper', () => {
    // The "one helper, cannot drift" invariant Story 8.8 established. If a consumer stopped calling it,
    // the fence above could pass vacuously while the window quietly forked.
    expect(readCode(MY_POOL_CARD)).toContain('computeDaysRemaining');
    expect(readCode(DEADLINE_SWEEP)).toContain('CYCLE_WINDOW_DAYS');
    expect(readCode(DEADLINE_SWEEP)).toContain('cycleDayFromCommittedAt');
  });

  it('the deadline-reminder sweep still derives deadlineAt from CYCLE_WINDOW_DAYS, un-extended', () => {
    expect(readCode(DEADLINE_SWEEP)).toContain(
      'committedAt.getTime() + CYCLE_WINDOW_DAYS * 24 * 60 * 60 * 1000',
    );
  });
});
