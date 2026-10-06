// Story 6.23a (Task 2, Task 11; AC1, AC2, AC12) — the PURE half of the nominee-change warnings and the reason list:
// the classifier at the IST edges, the 90 / 91-day boundary from an INJECTED anchor (Trap 5 — ⛔ never live), the
// keys, the anchor picker, the coverage helpers, the ONE rule in NW6's order, the kinds pin (`-279` A6), the
// TRANSITIVE import-discipline scan (NW1; `-279` A12) and the vocabulary deny-list's lockstep with `microcopy.yaml`.
// Story 6.23b (Task 2): `uncoveredKeys` with a LIST exclusion (RD3), the pure `keysNotCoveredBy` (RD17 — R9's
// comparison, ⛔ never `uncoveredKeys`), the wait's `own_reason_excluded` arithmetic (EA2) and its typed error.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import {
  APPROVAL_WARNING_GENERIC_REASON,
  APPROVAL_WARNING_REASON_DENIED_TERMS,
  assertApprovalWarningReasonText,
  deniedVocabularyTerm,
} from '../../src/claim/approval-warning-reasons.js';
import {
  APPROVAL_WARNING_KINDS,
  RECENT_NOMINEE_CHANGE_WINDOW_DAYS,
  approvalWarningKey,
  assertApprovalReasonCoversWarnings,
  classifyNomineeVersion,
  isPostDeathVersion,
  isRecentNomineeChange,
  keysNotCoveredBy,
  lateKeysUncoveredFor,
  lateWarningWait,
  r9ApproveVotesMissingKeys,
  lateWarningKeys,
  lateWarningNothingUncoveredFor,
  pickWarningAnchor,
  summarizeApprovalWarningsFor,
  uncoveredKeys,
} from '../../src/claim/approval-warnings.js';
import {
  ApprovalWarningReasonRequiredError,
  ApprovalWarningReasonWriteRefusedError,
  LateWarningReasonRequiredError,
  R9ApproveVotesNeedWarningReasonError,
  WarningReasonUnavailableError,
  WarningReasonUngroundedError,
} from '../../src/claim/errors.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, '../../src');
const repoRoot = path.resolve(here, '../../../..');

/** An instant at IST wall-clock `date` `hh:mm`. */
const ist = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+05:30`);

describe('the warning kinds (NW1)', () => {
  it('⭐ APPROVAL_WARNING_KINDS is exactly the two 6.23a kinds', () => {
    expect(
      [...APPROVAL_WARNING_KINDS],
      'a new kind enters 6.23b\'s wait (`-277` Q3 B) — its producer row decides or routes that before extending this list',
    ).toEqual(['post_death_version', 'recent_nominee_change']);
  });

  it('the window is the Panel\'s 90 days (`-262` FQ8 A, amended from 30)', () => {
    expect(RECENT_NOMINEE_CHANGE_WINDOW_DAYS).toBe(90);
  });

  it('a key is `${kind}:${subjectId}`, lower-cased', () => {
    expect(approvalWarningKey('post_death_version', 'ABC-1')).toBe('post_death_version:abc-1');
  });
});

describe('NW2 — post_death_version BY DATE (the timeline\'s derivation)', () => {
  it('23:59 IST the day before ⇒ ⛔ no flag; 00:00 IST on the day ⇒ flagged', () => {
    expect(isPostDeathVersion({ source: 'member', effectiveAt: ist('2026-05-09', '23:59') }, '2026-05-10')).toBe(false);
    expect(isPostDeathVersion({ source: 'member', effectiveAt: ist('2026-05-10', '00:00') }, '2026-05-10')).toBe(true);
  });

  it('a `correction` is ⛔ never flagged; an unknown date ⇒ ⛔ never flagged', () => {
    expect(isPostDeathVersion({ source: 'correction', effectiveAt: ist('2026-06-01', '10:00') }, '2026-05-10')).toBe(false);
    expect(isPostDeathVersion({ source: 'member', effectiveAt: ist('2026-06-01', '10:00') }, null)).toBe(false);
  });
});

describe('NW3 — recent_nominee_change against an INJECTED anchor (Trap 5)', () => {
  const anchor = ist('2026-08-30', '11:00');
  it('90 IST days before ⇒ flagged; 91 ⇒ ⛔ not', () => {
    expect(isRecentNomineeChange(ist('2026-06-01', '00:00'), anchor)).toBe(true); // 2026-08-30 − 90 = 2026-06-01
    expect(isRecentNomineeChange(ist('2026-05-31', '23:59'), anchor)).toBe(false);
  });

  it('after the anchor ⇒ flagged (one-sided — Trap 4)', () => {
    expect(isRecentNomineeChange(new Date(anchor.getTime() + 5), anchor)).toBe(true);
  });

  it('the member\'s FIRST declaration is flagged like any other (`-277` Q1 A); a correction ⛔ never', () => {
    const basis = { acceptedDate: null, anchorFiledAt: anchor };
    expect(classifyNomineeVersion({ source: 'member', effectiveAt: ist('2026-08-01', '10:00') }, basis)).toEqual(['recent_nominee_change']);
    expect(classifyNomineeVersion({ source: 'correction', effectiveAt: ist('2026-08-01', '10:00') }, basis)).toEqual([]);
  });

  it('a `null` anchor (the read failed) judges ⛔ no `recent_nominee_change`; the post-death judgement still stands', () => {
    const v = { source: 'member' as const, effectiveAt: ist('2026-08-20', '10:00') };
    expect(classifyNomineeVersion(v, { acceptedDate: null, anchorFiledAt: null })).toEqual([]);
    expect(classifyNomineeVersion(v, { acceptedDate: '2026-08-15', anchorFiledAt: null })).toEqual(['post_death_version']);
  });

  it('a version can carry BOTH kinds', () => {
    expect(
      classifyNomineeVersion({ source: 'member', effectiveAt: ist('2026-08-20', '10:00') }, { acceptedDate: '2026-08-15', anchorFiledAt: anchor }),
    ).toEqual(['post_death_version', 'recent_nominee_change']);
  });
});

describe('Trap 3 — the anchor picker', () => {
  const own = new Date('2026-09-10T00:00:00Z');
  it('the earliest UNRELEASED claim', () => {
    const first = new Date('2026-08-01T00:00:00Z');
    expect(pickWarningAnchor([{ createdAt: first, released: false }, { createdAt: own, released: false }], own)).toEqual(first);
  });
  it('a released earlier claim moves ⛔ nothing; all released ⇒ this claim\'s own', () => {
    const stray = new Date('2026-07-01T00:00:00Z');
    const second = new Date('2026-08-01T00:00:00Z');
    expect(pickWarningAnchor([{ createdAt: stray, released: true }, { createdAt: second, released: false }], own)).toEqual(second);
    expect(pickWarningAnchor([{ createdAt: stray, released: true }], own)).toEqual(own);
  });
});

describe('coverage (NW8, NW14, NW15)', () => {
  const approval = { step: 'district_admin_approval', recordedByActor: 'da', keys: ['k1'] };
  const w = (keys: string[], records: { step: string; recordedByActor: string; keys: string[] }[], approved = true) => ({
    keys,
    coverage: {
      districtAdminApproved: approved,
      coveredKeys: [...new Set(records.flatMap((r) => r.keys))],
      approvalKeys: records.filter((r) => r.step === 'district_admin_approval').flatMap((r) => r.keys),
      records,
    },
  });

  it('uncoveredKeys: only while the live decision is an approval; a late reason covers', () => {
    expect(uncoveredKeys(w(['k1', 'k2'], [approval]))).toEqual(['k2']);
    expect(uncoveredKeys(w(['k1', 'k2'], [approval], false))).toEqual([]);
    expect(uncoveredKeys(w(['k1', 'k2'], [approval, { step: 'district_admin_late_reason', recordedByActor: 'pa', keys: ['k1', 'k2'] }]))).toEqual([]);
  });

  it('`-279` A1 — a late reason does ⛔ not count for an approval its own recorder makes', () => {
    const late = { step: 'district_admin_late_reason', recordedByActor: 'pa', keys: ['k1', 'k2'] };
    expect(uncoveredKeys(w(['k1', 'k2'], [approval, late]), { excludeLateReasonsRecordedBy: 'pa' })).toEqual(['k2']);
    expect(uncoveredKeys(w(['k1', 'k2'], [approval, late]), { excludeLateReasonsRecordedBy: 'sa' })).toEqual([]);
  });

  it('NW14 `nothing_uncovered` is judged FOR THE RECORDER', () => {
    const late = { step: 'district_admin_late_reason', recordedByActor: 'pa', keys: ['k1', 'k2'] };
    const warnings = w(['k1', 'k2'], [approval, late]);
    expect(lateWarningKeys(warnings)).toEqual(['k2']);
    // The Pariwar Admin's own row covers everything — nothing for THEM to add.
    expect(lateWarningNothingUncoveredFor(warnings, 'pa')).toBe(true);
    // ⭐ The District Admin is NOT blocked by another person's late reason.
    expect(lateWarningNothingUncoveredFor(warnings, 'da')).toBe(false);
    expect(lateKeysUncoveredFor(warnings, 'da')).toEqual(['k2']);
    // A third person is ⛔ not blocked either.
    expect(lateWarningNothingUncoveredFor(warnings, 'sa')).toBe(false);
    // ⛔ No late key ⇒ nothing for anyone.
    expect(lateWarningNothingUncoveredFor(w(['k1'], [approval]), 'sa')).toBe(true);
  });
});

describe('6.23b — the wait\'s coverage (EA2, RD3, RD17)', () => {
  const approval = { step: 'district_admin_approval', recordedByActor: 'da', keys: ['post_death_version:a'] };
  const w = (keys: string[], records: { step: string; recordedByActor: string; keys: string[] }[], approved = true) => ({
    keys,
    coverage: {
      districtAdminApproved: approved,
      coveredKeys: [...new Set(records.flatMap((r) => r.keys))],
      approvalKeys: records.filter((r) => r.step === 'district_admin_approval').flatMap((r) => r.keys),
      records,
    },
  });
  const both = ['post_death_version:a', 'post_death_version:b'];

  it('RD3 — `excludeLateReasonsRecordedBy` takes a LIST (P4: the finalizer AND every live approve voter)', () => {
    const lateV1 = { step: 'district_admin_late_reason', recordedByActor: 'v1', keys: ['post_death_version:b'] };
    const lateDa = { step: 'district_admin_late_reason', recordedByActor: 'da2', keys: ['post_death_version:b'] };
    expect(uncoveredKeys(w(both, [approval, lateV1]), { excludeLateReasonsRecordedBy: ['fin', 'v1'] })).toEqual(['post_death_version:b']);
    expect(uncoveredKeys(w(both, [approval, lateV1]), { excludeLateReasonsRecordedBy: ['fin', 'v2'] })).toEqual([]);
    expect(uncoveredKeys(w(both, [approval, lateV1, lateDa]), { excludeLateReasonsRecordedBy: ['fin', 'v1'] })).toEqual([]);
    expect(uncoveredKeys(w(both, [approval, lateV1]), { excludeLateReasonsRecordedBy: [] })).toEqual([]);
    // ⚠ A District Admin APPROVAL row is ⛔ never excluded (EA2 — one person at P1 and P3 is today's breadth).
    expect(uncoveredKeys(w(['post_death_version:a'], [approval]), { excludeLateReasonsRecordedBy: ['da'] })).toEqual([]);
  });

  it('RD17 — `keysNotCoveredBy` is a plain set difference — it covers ⛔ nothing without a District Admin approval', () => {
    expect(keysNotCoveredBy(both, ['post_death_version:a'])).toEqual(['post_death_version:b']);
    expect(keysNotCoveredBy(both, both)).toEqual([]);
    expect(keysNotCoveredBy(both, [])).toEqual(both);
    expect(keysNotCoveredBy([], ['x'])).toEqual([]);
    // The case `uncoveredKeys` gets wrong for R9: ⛔ no District Admin approval ⇒ `uncoveredKeys` says nothing is uncovered.
    expect(uncoveredKeys(w(both, [], false))).toEqual([]);
    expect(keysNotCoveredBy(both, ['post_death_version:a'])).toHaveLength(1);
  });

  it('EA2 — `lateWarningWait`: the uncovered keys, their kinds, and `ownReasonExcluded` = excluded > unexcluded', () => {
    const late = { step: 'district_admin_late_reason', recordedByActor: 'pa', keys: ['post_death_version:b'] };
    // Covered by someone ELSE's late reason ⇒ ⛔ no wait.
    expect(lateWarningWait(w(both, [approval, late]), ['other'])).toEqual({ uncoveredKeys: [], kinds: [], ownReasonExcluded: false });
    // Covered ONLY by the approver's own late reason ⇒ the wait, and it says so.
    expect(lateWarningWait(w(both, [approval, late]), ['pa'])).toEqual({
      uncoveredKeys: ['post_death_version:b'],
      kinds: ['post_death_version'],
      ownReasonExcluded: true,
    });
    // Uncovered by anyone ⇒ the wait, ⛔ not "own reason".
    expect(lateWarningWait(w([...both, 'recent_nominee_change:c'], [approval]), ['pa'])).toEqual({
      uncoveredKeys: ['post_death_version:b', 'recent_nominee_change:c'],
      kinds: ['post_death_version', 'recent_nominee_change'],
      ownReasonExcluded: false,
    });
    // ⛔ No District Admin approval ⇒ the conjunct is vacuous.
    expect(lateWarningWait(w(both, [], false), ['pa']).uncoveredKeys).toEqual([]);
  });

  it('code review 2026-10-06 — `summarizeApprovalWarningsFor`: the DTO shape wraps `lateWarningWait` + echoes `kinds`/`postDeath`', () => {
    const late = { step: 'district_admin_late_reason', recordedByActor: 'pa', keys: ['post_death_version:b'] };
    // No current warnings at all ⇒ nothing to wait on.
    expect(summarizeApprovalWarningsFor({ keys: [], kinds: [], postDeath: 'evaluated', coverage: w([], []).coverage }, ['other'])).toEqual({
      kinds: [],
      postDeath: 'evaluated',
      waitingForDistrictAdmin: false,
      ownReasonExcluded: false,
    });
    // Covered ONLY by the approver's OWN late reason ⇒ waiting, and it's an own-reason exclusion.
    expect(
      summarizeApprovalWarningsFor(
        { keys: both, kinds: ['post_death_version'], postDeath: 'evaluated', coverage: w(both, [approval, late]).coverage },
        ['pa'],
      ),
    ).toEqual({
      kinds: ['post_death_version'],
      postDeath: 'evaluated',
      waitingForDistrictAdmin: true,
      ownReasonExcluded: true,
    });
    // Uncovered by anyone ⇒ waiting, ⛔ not an own-reason exclusion.
    expect(
      summarizeApprovalWarningsFor(
        { keys: both, kinds: ['post_death_version'], postDeath: 'awaiting_determination', coverage: w(both, [approval]).coverage },
        ['pa'],
      ),
    ).toEqual({
      kinds: ['post_death_version'],
      postDeath: 'awaiting_determination',
      waitingForDistrictAdmin: true,
      ownReasonExcluded: false,
    });
  });

  it('EA5 — `r9ApproveVotesMissingKeys`: each approve vote against EVERY key; ⛔ no keys ⇒ ⛔ none; a vote with ⛔ no row misses all', () => {
    const coverage = new Map<string, readonly string[]>([
      ['v1', ['post_death_version:a', 'post_death_version:b']],
      ['v2', ['post_death_version:a']],
    ]);
    expect(r9ApproveVotesMissingKeys(both, ['V1', 'v2', 'v3'], coverage)).toEqual([
      { voteId: 'v2', missing: ['post_death_version:b'] },
      { voteId: 'v3', missing: both },
    ]);
    expect(r9ApproveVotesMissingKeys([], ['v3'], coverage)).toEqual([]);
  });

  it('a LATER step\'s row ⛔ never counts as District Admin coverage (only `district_admin_*` rows are read — NW13)', () => {
    // The reader selects `DISTRICT_ADMIN_WARNING_STEPS` only; a record list with a later row (as if one leaked) still
    // excludes nothing from the District Admin's own approval keys.
    expect(lateWarningKeys(w(both, [approval]))).toEqual(['post_death_version:b']);
  });

  it('the typed errors carry what the routes map (codes + counts only)', () => {
    const e = new LateWarningReasonRequiredError('c', ['post_death_version'], 1, true);
    expect([e.name, e.claimCaseId, e.kinds, e.uncoveredCount, e.ownReasonExcluded]).toEqual([
      'LateWarningReasonRequiredError', 'c', ['post_death_version'], 1, true,
    ]);
    const r = new R9ApproveVotesNeedWarningReasonError('c', ['v1', 'v2'], 2);
    expect([r.name, r.voteIds, r.uncoveredCount]).toEqual(['R9ApproveVotesNeedWarningReasonError', ['v1', 'v2'], 2]);
  });
});

describe('THE ONE RULE — NW6\'s order', () => {
  const kinds = ['post_death_version'] as const;
  const generic = { code: APPROVAL_WARNING_GENERIC_REASON.code, reasonId: null };
  const run = (over: Partial<Parameters<typeof assertApprovalReasonCoversWarnings>[0]>) =>
    assertApprovalReasonCoversWarnings({ claimCaseId: 'c', kinds: [...kinds], warningReasonCode: generic.code, resolvedReason: generic, note: 'why', ...over });

  it('(1) ⛔ no warning + a reason ⇒ ungrounded; ⛔ no warning + ⛔ no reason ⇒ nothing to record', () => {
    expect(() => run({ kinds: [] })).toThrow(WarningReasonUngroundedError);
    expect(run({ kinds: [], warningReasonCode: null, resolvedReason: null, note: null })).toBeNull();
  });

  it('(2) a warning + ⛔ no reason ⇒ required (reason) — even with ⛔ no note', () => {
    const err = (() => {
      try {
        run({ warningReasonCode: null, resolvedReason: null, note: null });
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(ApprovalWarningReasonRequiredError);
    expect((err as ApprovalWarningReasonRequiredError).missing).toBe('reason');
    expect((err as ApprovalWarningReasonRequiredError).kinds).toEqual(['post_death_version']);
  });

  it('(3) a replaced / unknown reason ⇒ unavailable — before the note', () => {
    expect(() => run({ warningReasonCode: 'awr_00000000', resolvedReason: null, note: null })).toThrow(WarningReasonUnavailableError);
  });

  it('(4) a warning + an active reason + ⛔ no note ⇒ required (note)', () => {
    expect(() => run({ note: null })).toThrow(expect.objectContaining({ missing: 'note' }));
    expect(() => run({ note: '  ' })).toThrow(expect.objectContaining({ missing: 'note' }));
  });

  it('two warnings need ONE reason and ONE note; the generic and a stored reason both pass', () => {
    expect(run({ kinds: ['post_death_version', 'recent_nominee_change'] })).toEqual(generic);
    const stored = { code: 'awr_0a1b2c3d', reasonId: 'r-1' };
    expect(run({ warningReasonCode: stored.code, resolvedReason: stored })).toEqual(stored);
  });
});

describe('NW1 — import discipline, TRANSITIVELY (`-279` A12)', () => {
  /** Every module reachable from `entry` through RELATIVE imports (value AND type), to a fixpoint. */
  function reachable(entry: string): Set<string> {
    const seen = new Set<string>();
    const queue = [entry];
    while (queue.length > 0) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const code = readFileSync(file, 'utf8');
      for (const m of code.matchAll(/(?:import|export)[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const target = path.resolve(path.dirname(file), m[1]!.replace(/\.js$/, '.ts'));
        queue.push(target);
      }
    }
    return seen;
  }
  const forbidden = ['claim/events.ts', 'claim/nominee-name-check.ts', 'claim/nominee-lock.ts'];

  // Story 6.26a (GI1, Task 3.1) — `nominee-name-check.ts` imports the ground-inspection conjunct too.
  for (const entry of [
    'claim/approval-warnings.ts',
    'claim/approval-warning-reasons.ts',
    'claim/ground-inspection-approval.ts',
  ]) {
    it(`${entry} reaches ⛔ none of ${forbidden.join(', ')}`, () => {
      const files = [...reachable(path.join(srcRoot, entry))].map((f) => path.relative(srcRoot, f));
      for (const f of forbidden) expect(files, `${entry} reaches ${f}`).not.toContain(f);
    });
  }

  it('the scan has teeth: a seeded `import … from \'./nominee-lock.js\'` is caught', () => {
    const files = [...reachable(path.join(srcRoot, 'claim/nominee-lock.ts'))].map((f) => path.relative(srcRoot, f));
    // nominee-lock.ts reaches events.ts through project.ts — exactly the chain the rule forbids.
    expect(files).toContain('claim/events.ts');
  });
});

describe('the reason list\'s words (Trap 11)', () => {
  it('⚠ LOCKSTEP: the deny-list is exactly `microcopy.yaml`\'s ACTIVE vocabulary terms', () => {
    const yaml = parseYaml(readFileSync(path.join(repoRoot, 'microcopy.yaml'), 'utf8')) as {
      vocabulary: { term: string; member_only?: boolean }[];
    };
    const active = yaml.vocabulary.filter((v) => v.member_only !== true).map((v) => v.term.toLowerCase()).sort();
    expect([...APPROVAL_WARNING_REASON_DENIED_TERMS].sort()).toEqual(active);
  });

  it('a vocabulary term (word-boundary, any case), a blank or an over-long field ⇒ invalid_text', () => {
    expect(deniedVocabularyTerm('See the Report first')).toBe('report');
    expect(deniedVocabularyTerm('reporting line')).toBeNull();
    const refused = (label: string, note: string) => {
      try {
        assertApprovalWarningReasonText(label, note);
      } catch (e) {
        return e as ApprovalWarningReasonWriteRefusedError;
      }
      return null;
    };
    expect(refused('Receipt seen', 'ok')?.details).toMatchObject({ field: 'label', problem: 'vocabulary', term: 'receipt' });
    expect(refused('ok', ' ')?.details).toMatchObject({ field: 'when_to_use', problem: 'blank' });
    expect(refused('x'.repeat(121), 'ok')?.details).toMatchObject({ field: 'label', problem: 'too_long' });
    expect(refused('ok', 'x'.repeat(1001))?.status).toBe(400);
    expect(refused('Family confirmed in person', 'Use when the inspector met the family.')).toBeNull();
  });

  it('the generic is the ratified-by-BigDev constant', () => {
    expect(APPROVAL_WARNING_GENERIC_REASON).toEqual({
      code: 'warnings_reviewed',
      label: 'Warnings reviewed — approved despite them',
      whenToUse: 'Use when you have read every warning shown and still approve. Your note must say why.',
    });
  });
});
