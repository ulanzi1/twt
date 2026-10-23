// Story 11b.4 — the memorial's DERIVED state and the pure decisions taken under the lock (MA9 / MA10 / MA13 / MA16, Trap 8,
// AC4, AC8, AC9). DB-free.

import { describe, expect, it } from 'vitest';

import {
  MEMORIAL_STATES,
  MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION,
  MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS,
  MEMORIAL_DRIVE_POOL_STATES,
  currentMemorialAuthorisation,
  decideFamilyWithdraw,
  decideMemorialSend,
  deriveEarlierApprovalWithdrawn,
  deriveMemorialStatus,
  latestApprovedIndex,
  memorialAuthorisationVersion,
  memorialCanSend,
  memorialCanWithdraw,
  memorialReviewTargetIndex,
  type MemorialChainLink,
  type MemorialReviewAction,
  type MemorialReviewReason,
  type MemorialWithdrawalActor,
} from '../../src/memorial/index.js';

let seq = 0;
function link(
  opts: {
    action?: MemorialReviewAction;
    withdrawnBy?: MemorialWithdrawalActor;
    reason?: MemorialReviewReason;
    photo?: boolean;
  } = {},
): MemorialChainLink {
  seq += 1;
  const submissionId = `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`;
  return {
    submission: {
      submissionId,
      photoObjectKey: opts.photo ? `memorial/${submissionId}.jpg` : null,
      photoMime: opts.photo ? 'image/jpeg' : null,
    } as MemorialChainLink['submission'],
    decision: opts.action ? ({ action: opts.action } as MemorialChainLink['decision']) : null,
    withdrawal: opts.withdrawnBy
      ? ({ withdrawnBy: opts.withdrawnBy, reasonCode: opts.withdrawnBy === 'trust' ? (opts.reason ?? 'identifies_a_child') : null } as MemorialChainLink['withdrawal'])
      : null,
  };
}

describe('deriveMemorialStatus — seven states (MA10)', () => {
  it.each([
    [null, 'none'],
    [link(), 'with_the_trust'],
    [link({ action: 'approved' }), 'approved'],
    [link({ action: 'approved_with_omissions' }), 'approved_with_omissions'],
    [link({ action: 'not_approved' }), 'not_approved'],
    [link({ withdrawnBy: 'family' }), 'withdrawn'],
    [link({ action: 'approved', withdrawnBy: 'trust' }), 'approval_withdrawn'],
  ] as const)('%# → %s', (latest, expected) => {
    expect(deriveMemorialStatus(latest)).toBe(expected);
  });

  it('covers every declared state exactly', () => {
    expect([...MEMORIAL_STATES]).toEqual([
      'none',
      'with_the_trust',
      'approved',
      'approved_with_omissions',
      'not_approved',
      'withdrawn',
      'approval_withdrawn',
    ]);
  });

  it('canSend is every state but a clean `approved` (MA13); canWithdraw only `with_the_trust` (MA9)', () => {
    for (const s of MEMORIAL_STATES) {
      expect(memorialCanSend(s)).toBe(s !== 'approved');
      expect(memorialCanWithdraw(s)).toBe(s === 'with_the_trust');
    }
  });

  it('the writing window is its OWN tuple: closed and settled (MA14)', () => {
    expect([...MEMORIAL_DRIVE_POOL_STATES]).toEqual(['closed', 'settled']);
  });
});

describe('earlierApprovalWithdrawn (MA16)', () => {
  it('null for an empty or one-version chain', () => {
    expect(deriveEarlierApprovalWithdrawn([])).toBeNull();
    expect(deriveEarlierApprovalWithdrawn([link({ action: 'approved', withdrawnBy: 'trust' })])).toBeNull();
  });

  it('the Trust withdrew an older approval and a newer version is with the Trust → its reason', () => {
    const chain = [link({ action: 'approved', withdrawnBy: 'trust', reason: 'against_the_law' }), link()];
    expect(deriveEarlierApprovalWithdrawn(chain)).toEqual({ reasonCode: 'against_the_law' });
  });

  it('null once a NEWER version was approved', () => {
    const chain = [link({ action: 'approved', withdrawnBy: 'trust' }), link({ action: 'approved' }), link()];
    expect(deriveEarlierApprovalWithdrawn(chain)).toBeNull();
  });

  it('null when the latest itself is `approval_withdrawn` (its own state says so)', () => {
    const chain = [link({ action: 'approved', withdrawnBy: 'trust' }), link({ action: 'approved', withdrawnBy: 'trust' })];
    expect(deriveEarlierApprovalWithdrawn(chain)).toBeNull();
  });

  it('carries the NEWEST such withdrawal', () => {
    const chain = [
      link({ action: 'approved', withdrawnBy: 'trust', reason: 'against_the_law' }),
      link({ action: 'not_approved' }),
      link({ action: 'approved_with_omissions', withdrawnBy: 'trust', reason: 'attacks_someone_named' }),
      link({ action: 'not_approved' }),
    ];
    expect(deriveEarlierApprovalWithdrawn(chain)).toEqual({ reasonCode: 'attacks_someone_named' });
  });

  it('a FAMILY withdrawal is never reported', () => {
    expect(deriveEarlierApprovalWithdrawn([link({ withdrawnBy: 'family' }), link()])).toBeNull();
  });
});

describe('decideMemorialSend (AC7 order under the lock)', () => {
  const current = { authorisationCopyVersion: MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION, keepPreviousPhoto: false };

  it('the first version supersedes nothing', () => {
    expect(decideMemorialSend([], current)).toEqual({ ok: true, supersedesSubmissionId: null, keptPhoto: null });
  });

  it('a Send while one is with the Trust supersedes it (MA9)', () => {
    const head = link();
    expect(decideMemorialSend([head], current)).toMatchObject({ ok: true, supersedesSubmissionId: head.submission.submissionId });
  });

  it('refuses after a clean approval (MA13) BEFORE checking the version', () => {
    expect(decideMemorialSend([link({ action: 'approved' })], { ...current, authorisationCopyVersion: 'old' })).toEqual({
      ok: false,
      refusal: 'already_reviewed',
    });
  });

  it('allows after withdrawn / not approved / with omissions / approval withdrawn', () => {
    for (const l of [
      link({ withdrawnBy: 'family' }),
      link({ action: 'not_approved' }),
      link({ action: 'approved_with_omissions' }),
      link({ action: 'approved', withdrawnBy: 'trust' }),
    ]) {
      expect(decideMemorialSend([l], current).ok).toBe(true);
    }
  });

  it('refuses a stale permission version (AC4 — new behaviour)', () => {
    expect(decideMemorialSend([], { ...current, authorisationCopyVersion: '2026-01-01.v0' })).toEqual({
      ok: false,
      refusal: 'authorisation_outdated',
    });
  });

  it('keepPreviousPhoto reads the HEAD\'s photo; ⛔ a head with no photo → no_previous_photo (MA8)', () => {
    const withPhoto = link({ photo: true, action: 'not_approved' });
    const decision = decideMemorialSend([withPhoto], { ...current, keepPreviousPhoto: true });
    expect(decision).toEqual({
      ok: true,
      supersedesSubmissionId: withPhoto.submission.submissionId,
      keptPhoto: { objectKey: withPhoto.submission.photoObjectKey, mime: 'image/jpeg' },
    });
    expect(decideMemorialSend([link({ action: 'not_approved' })], { ...current, keepPreviousPhoto: true })).toEqual({
      ok: false,
      refusal: 'no_previous_photo',
    });
    expect(decideMemorialSend([], { ...current, keepPreviousPhoto: true })).toEqual({ ok: false, refusal: 'no_previous_photo' });
  });
});

describe('decideFamilyWithdraw (AC8)', () => {
  it('ok only for the latest, while with the Trust', () => {
    const a = link({ action: 'not_approved' });
    const b = link();
    expect(decideFamilyWithdraw([a, b], b.submission.submissionId)).toBe('ok');
    expect(decideFamilyWithdraw([a, b], a.submission.submissionId)).toBe('not_withdrawable');
    const c = link({ action: 'approved' });
    expect(decideFamilyWithdraw([c], c.submission.submissionId)).toBe('not_withdrawable');
    expect(decideFamilyWithdraw([a, b], '00000000-0000-4000-8000-ffffffffffff')).toBe('not_found');
  });
});

describe('memorialReviewTargetIndex — per-route refusal sets (Trap 8, AC9)', () => {
  it('decision: only an undecided, un-withdrawn HEAD', () => {
    const superseded = link();
    const head = link();
    const chain = [superseded, head];
    expect(memorialReviewTargetIndex(chain, head.submission.submissionId, 'decision')).toBe(1);
    expect(memorialReviewTargetIndex(chain, superseded.submission.submissionId, 'decision')).toBeNull();
    expect(memorialReviewTargetIndex([link({ action: 'approved' })], 'x', 'decision')).toBeNull();
    const decided = link({ action: 'approved' });
    expect(memorialReviewTargetIndex([decided], decided.submission.submissionId, 'decision')).toBeNull();
    const withdrawn = link({ withdrawnBy: 'family' });
    expect(memorialReviewTargetIndex([withdrawn], withdrawn.submission.submissionId, 'decision')).toBeNull();
  });

  it('withdraw-approval: the chain\'s latest approved, un-withdrawn version — even SUPERSEDED (MA16)', () => {
    const approved = link({ action: 'approved_with_omissions' });
    const newer = link();
    const chain = [approved, newer];
    expect(latestApprovedIndex(chain)).toBe(0);
    expect(memorialReviewTargetIndex(chain, approved.submission.submissionId, 'withdraw_approval')).toBe(0);
    expect(memorialReviewTargetIndex(chain, newer.submission.submissionId, 'withdraw_approval')).toBeNull();
    const gone = link({ action: 'approved', withdrawnBy: 'trust' });
    expect(memorialReviewTargetIndex([gone], gone.submission.submissionId, 'withdraw_approval')).toBeNull();
    const refused = link({ action: 'not_approved' });
    expect(memorialReviewTargetIndex([refused], refused.submission.submissionId, 'withdraw_approval')).toBeNull();
  });

  it('detail: every version of the chain is readable (the history view)', () => {
    const chain = [link({ action: 'approved', withdrawnBy: 'trust' }), link({ withdrawnBy: 'family' }), link()];
    for (const [i, l] of chain.entries()) {
      expect(memorialReviewTargetIndex(chain, l.submission.submissionId, 'detail')).toBe(i);
    }
    expect(memorialReviewTargetIndex(chain, 'unknown', 'detail')).toBeNull();
  });
});

describe('MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS (AC4)', () => {
  it('every version has non-empty hi and en text and an explicit hiReviewed', () => {
    const entries = Object.entries(MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS);
    expect(entries.length).toBeGreaterThan(0);
    for (const [id, v] of entries) {
      expect(v.hi.trim().length, id).toBeGreaterThan(0);
      expect(v.en.trim().length, id).toBeGreaterThan(0);
      expect(typeof v.hiReviewed).toBe('boolean');
    }
  });

  it('the current id carries the go-live marker and is unreviewed', () => {
    expect(MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION).toBe('2026-10-23.v1-pending-hi-review');
    expect(memorialAuthorisationVersion(MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION)?.hiReviewed).toBe(false);
    expect(memorialAuthorisationVersion('nope')).toBeUndefined();
    expect(memorialAuthorisationVersion(42)).toBeUndefined();
    expect(currentMemorialAuthorisation().copyVersion).toBe(MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION);
  });

  it('v1 carries M2 addressed to the nominee in both locales (`-393` M2, `-395` item 3) and ⛔ "cannot be taken down"', () => {
    const v = currentMemorialAuthorisation().text;
    expect(v.en).toMatch(/you, the nominee, ever want it changed or taken down, you can call the helpline/);
    expect(v.hi).toMatch(/आप, नॉमिनी, कभी इसमें बदलाव चाहें या इसे हटवाना चाहें, तो हेल्पलाइन/);
    expect(v.en).not.toMatch(/cannot be taken down/i);
    // `-391` Q2 A — where it appears, and children left out.
    expect(v.en).toMatch(/Sahyog Vivran page/);
    expect(v.en).toMatch(/child's name, it will leave it out/);
  });
});
