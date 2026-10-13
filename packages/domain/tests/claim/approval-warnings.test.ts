// Story 6.23a (Task 2, Task 11; AC1, AC2, AC12) — the PURE half of the nominee-change warnings and the reason list:
// the classifier at the IST edges, the 90 / 91-day boundary from an INJECTED anchor (Trap 5 — ⛔ never live), the
// keys, the anchor picker, the coverage helpers, the ONE rule in NW6's order, the kinds pin (`-279` A6), the
// TRANSITIVE import-discipline scan (NW1; `-279` A12) and the vocabulary deny-list's lockstep with `microcopy.yaml`.
// Story 6.23b (Task 2): `uncoveredKeys` with a LIST exclusion (RD3), the pure `keysNotCoveredBy` (RD17 — R9's
// comparison, ⛔ never `uncoveredKeys`), the wait's `own_reason_excluded` arithmetic (EA2) and its typed error.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { deathDateWindow } from '../../src/questionnaires/answers.js';

import {
  APPROVAL_WARNING_GENERIC_REASON,
  APPROVAL_WARNING_REASON_DENIED_TERMS,
  assertApprovalWarningReasonText,
  deniedVocabularyTerm,
} from '../../src/claim/approval-warning-reasons.js';
import {
  APPROVAL_WARNING_KINDS,
  NOMINEE_VERSION_WARNING_KINDS,
  PEER_WARNING_KINDS,
  RECENT_NOMINEE_CHANGE_WINDOW_DAYS,
  approvalWarningKey,
  assertApprovalReasonCoversWarnings,
  classifyNomineeVersion,
  derivePeerReplyWarningKeys,
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
  withoutPeerWarnings,
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
  it('⭐ APPROVAL_WARNING_KINDS is exactly the two 6.23a kinds, the three 6.26b death-fact kinds, 6.28\'s `other_claim_for_death` and 6.27b\'s two neighbour kinds', () => {
    expect(
      [...APPROVAL_WARNING_KINDS],
      'a new kind enters 6.23b\'s wait (`-277` Q3 B) — its producer row decides or routes that before extending this list. ' +
        'GI6 / GI7 (`-282`) and GI17 / GI18 (`-281` Q1 B) discharged it for the three death-fact kinds; Story 6.28 OP5 — ' +
        '`2026-10-11-318` Q1 A (the wait included, as ratified) and `-319` (`-279` A6 discharged) — for `other_claim_for_death`; ' +
        'Story 6.27b — `2026-10-10-303` Q2 A (its Consequence 1) for `peer_says_not_died` / `peer_death_date_differs`',
    ).toEqual([
      'post_death_version',
      'recent_nominee_change',
      'inspection_death_date_differs',
      'original_certificate_mismatch',
      'register_check_mismatch',
      'other_claim_for_death',
      'peer_says_not_died',
      'peer_death_date_differs',
    ]);
    expect([...PEER_WARNING_KINDS]).toEqual(['peer_says_not_died', 'peer_death_date_differs']);
  });

  it('Story 6.26b RD8 — the timeline\'s VERSION kinds are exactly the two 6.23a kinds, the head of the full list', () => {
    expect([...NOMINEE_VERSION_WARNING_KINDS]).toEqual(['post_death_version', 'recent_nominee_change']);
    expect(APPROVAL_WARNING_KINDS.slice(0, NOMINEE_VERSION_WARNING_KINDS.length)).toEqual([...NOMINEE_VERSION_WARNING_KINDS]);
  });

  it('the window is the Panel\'s 90 days (`-262` FQ8 A, amended from 30)', () => {
    expect(RECENT_NOMINEE_CHANGE_WINDOW_DAYS).toBe(90);
  });

  it('a key is `${kind}:${subjectId}`, lower-cased', () => {
    expect(approvalWarningKey('post_death_version', 'ABC-1')).toBe('post_death_version:abc-1');
  });
});

describe('Story 6.27b PM9 — the two NEIGHBOUR kinds (`derivePeerReplyWarningKeys`)', () => {
  // ⚠ Index trap (Trap 3): the window is built with the SAME test index function as the certificate's index — ⛔ never
  // a real date compared. `ix` stands in for the keyed blind index.
  const ix = (d: string) => `ix:${d}`;
  const windowOf = (d: string) => deathDateWindow(d).map(ix);
  const A1 = '0a0a0a0a-0000-4000-8000-000000000001';
  const A2 = '0a0a0a0a-0000-4000-8000-000000000002';
  const hasDied = (id: string, code: string) => ({ id, key: 'has_died', codes: [code], window: null });
  const dated = (id: string, d: string) => ({ id, key: 'death_date', codes: null, window: windowOf(d) });

  it('has_died: ONLY `not_died` is a key — `died`, `not_sure`, `did_not_know` are not', () => {
    for (const [code, warns] of [['not_died', true], ['died', false], ['not_sure', false], ['did_not_know', false]] as const) {
      const r = derivePeerReplyWarningKeys({ answers: [hasDied(A1, code)], currentAcceptedDateIndex: null });
      expect(r.keys, code).toEqual(warns ? [`peer_says_not_died:${A1}`] : []);
      expect(r.kinds, code).toEqual(warns ? ['peer_says_not_died'] : []);
      expect(r.flags.get(A1), code).toBe(warns);
    }
  });

  it('`not_died` needs ⛔ no certificate', () => {
    expect(derivePeerReplyWarningKeys({ answers: [hasDied(A1, 'not_died')], currentAcceptedDateIndex: null }).keys).toEqual([
      `peer_says_not_died:${A1}`,
    ]);
  });

  it('death_date: equal, −1, +1 ⇒ ⛔ no key; −2, +2 ⇒ a key (across month / year / leap-day edges)', () => {
    const cases: [string, string, boolean][] = [
      ['2026-05-10', '2026-05-10', false],
      ['2026-05-10', '2026-05-09', false],
      ['2026-05-10', '2026-05-11', false],
      ['2026-05-10', '2026-05-08', true],
      ['2026-05-10', '2026-05-12', true],
      ['2024-02-29', '2024-03-01', false],
      ['2024-03-01', '2024-02-28', true],
      ['2025-12-31', '2026-01-01', false],
      ['2026-01-01', '2025-12-30', true],
      ['2026-04-30', '2026-05-01', false],
    ];
    for (const [cert, neighbour, warns] of cases) {
      const r = derivePeerReplyWarningKeys({ answers: [dated(A1, neighbour)], currentAcceptedDateIndex: ix(cert) });
      expect(r.keys, `${cert} vs ${neighbour}`).toEqual(warns ? [`peer_death_date_differs:${A1}`] : []);
      expect(r.flags.get(A1), `${cert} vs ${neighbour}`).toBe(warns);
    }
  });

  it('"I don\'t know the date" (`[\'unknown\']`, ⛔ no indexes), ⛔ no current review, a pre-6.26b review ⇒ ⛔ no key', () => {
    const unknown = { id: A1, key: 'death_date', codes: ['unknown'], window: null };
    expect(derivePeerReplyWarningKeys({ answers: [unknown], currentAcceptedDateIndex: ix('2026-05-10') }).keys).toEqual([]);
    // ⛔ no current review and a pre-6.26b review both reach the helper as a `null` index.
    expect(derivePeerReplyWarningKeys({ answers: [dated(A1, '2026-05-01')], currentAcceptedDateIndex: null }).keys).toEqual([]);
    expect(derivePeerReplyWarningKeys({ answers: [unknown], currentAcceptedDateIndex: null }).flags.get(A1)).toBe(false);
  });

  it('a malformed window (⛔ exactly three indexes) ⇒ ⛔ no key', () => {
    const short = { id: A1, key: 'death_date', codes: null, window: [ix('2026-05-01')] };
    expect(derivePeerReplyWarningKeys({ answers: [short], currentAcceptedDateIndex: ix('2026-05-10') }).keys).toEqual([]);
  });

  it('two answers ⇒ two keys, sorted, kinds in list order; one flag per answer, keyed by the LOWER-CASE id', () => {
    const upper = A2.toUpperCase();
    const r = derivePeerReplyWarningKeys({
      answers: [dated(upper, '2026-05-01'), hasDied(A1, 'not_died')],
      currentAcceptedDateIndex: ix('2026-05-10'),
    });
    expect(r.keys).toEqual([`peer_death_date_differs:${A2}`, `peer_says_not_died:${A1}`]);
    expect(r.kinds).toEqual(['peer_says_not_died', 'peer_death_date_differs']);
    expect([...r.flags.entries()]).toEqual([
      [A2, true],
      [A1, true],
    ]);
  });

  it('a question that is ⛔ not a warning question never keys (defence — the fragment selects only the two)', () => {
    const r = derivePeerReplyWarningKeys({
      answers: [{ id: A1, key: 'how_known', codes: ['not_died'], window: null }],
      currentAcceptedDateIndex: null,
    });
    expect(r.keys).toEqual([]);
    expect(r.flags.get(A1)).toBe(false);
  });
});

describe('Story 6.27b PM25 (c) — `withoutPeerWarnings` (a DISPLAY filter)', () => {
  it('drops the two neighbour kinds and their keys; every other kind and the coverage are kept', () => {
    const w = {
      keys: [
        'other_claim_for_death:c1',
        'peer_death_date_differs:a2',
        'peer_says_not_died:a1',
        'post_death_version:v1',
      ],
      kinds: ['post_death_version', 'other_claim_for_death', 'peer_says_not_died', 'peer_death_date_differs'] as const,
      coverage: { districtAdminApproved: true, coveredKeys: ['peer_says_not_died:a1'], approvalKeys: [], records: [] },
    };
    const f = withoutPeerWarnings(w);
    expect(f.keys).toEqual(['other_claim_for_death:c1', 'post_death_version:v1']);
    expect(f.kinds).toEqual(['post_death_version', 'other_claim_for_death']);
    expect(f.coverage).toBe(w.coverage);
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

describe('Story 6.27b (Task 1.5; Trap 5) — `withoutPeerWarnings` is a DISPLAY filter: an ALLOWLIST of callers', () => {
  const claimDir = path.join(srcRoot, 'claim');
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  /** The body of `export (async )?function name(` — from its line to the next top-level `}` line. */
  const bodyOf = (src: string, name: string): string => {
    const start = src.search(new RegExp(`export (async )?function ${name}\\(`));
    expect(start, name).toBeGreaterThanOrEqual(0);
    const end = src.indexOf('\n}\n', start);
    return src.slice(start, end);
  };

  it('under `claim/` it appears ONLY in its definition and the correction queue\'s display read — ⛔ any `*-persist.ts`', () => {
    const users = readdirSync(claimDir)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => strip(readFileSync(path.join(claimDir, f), 'utf8')).includes('withoutPeerWarnings'))
      .sort();
    expect(users).toEqual(['approval-warnings.ts', 'correction-queue-read.ts']);
  });

  it('⛔ inside the wait, the later-approver reason check or the record writer', () => {
    const src = strip(readFileSync(path.join(claimDir, 'approval-warnings.ts'), 'utf8'));
    for (const name of ['assertLateWarningsCovered', 'checkLaterApprovalWarningReason', 'insertClaimWarningApprovalRecord']) {
      expect(bodyOf(src, name), name).not.toContain('withoutPeerWarnings');
    }
  });

  it('the scan has teeth: the queue\'s read DOES call it', () => {
    expect(strip(readFileSync(path.join(claimDir, 'correction-queue-read.ts'), 'utf8'))).toMatch(/withoutPeerWarnings\(/);
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
    // ⭐ Story 6.24a (`2026-10-07-292` RF1) — the suspicion-refusal READ module joins the approval gate (RF5's conjunct).
    // Its closure WRITER (`suspicion-refusal-persist.ts`, RF6) emits events and is deliberately ⛔ not listed.
    'claim/suspicion-refusal.ts',
    // ⭐ Story 6.28 (OP1) — "one payment per death", once: the gate's conjunct (OP2), the warning (OP5) and the queue read it.
    'claim/one-payment-per-death.ts',
    // ⭐ Story 6.27a (PM23 (a)) — the questionnaire engine: 6.27b's warning SQL reads its key list, so it is fenced like
    // the gate's own modules (the event-response mapping lives in `claim/peer-mesh-reply.ts`, ⛔ never here).
    'questionnaires/index.ts',
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
