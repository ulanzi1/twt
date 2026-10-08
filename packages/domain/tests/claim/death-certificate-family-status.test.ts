// `resolveDeathCertificateFamilyStatus` — Story 6.21b (D1; AC1). DB-free, table-driven unit tests
// (the claim/state.ts reducer-test precedent) — every row of D1's state table, plus the C1
// (`replacement_allowed` equals the upload handler's decision for every in-window row) and
// `upload_allowed` (`-247` §2) soundness checks AC1 requires.

import { describe, expect, it } from 'vitest';

import {
  CLAIM_DOCUMENT_UPLOADABLE_STATES,
  isDeathCertificateUploadAllowed,
  isInDeathCertificateReviewWindow,
  resolveDeathCertificateFamilyStatus,
  type DeathCertificateSnapshot,
  type LiveDeathCertificateReview,
} from '../../src/claim/death-certificate-approval.js';
import { deathCertificateReviewId, deathCertificateUploadId } from '../../src/ids/index.js';
import { CLAIM_TERMINAL_STATES } from '../../src/claim/read.js';
import { CLAIM_REVIEW_WINDOW_STATES } from '../../src/claim/review-window.js';
import { DEATH_CERTIFICATE_REJECTION_REASONS } from '../../src/schema/claim_death_certificate_reviews.js';
import { CLAIM_LIFECYCLE_STATES } from '../../src/schema/claims.js';

const UPLOAD_A = deathCertificateUploadId('11111111-1111-1111-1111-111111111111');
const REVIEW_ID = deathCertificateReviewId('33333333-3333-3333-3333-333333333333');

const NO_ROW: DeathCertificateSnapshot = {
  certificateRowExists: false,
  claimDocumentId: null,
  currentUploadId: null,
  liveReview: null,
  currentReview: null,
};

const LEGACY_ROW: DeathCertificateSnapshot = {
  certificateRowExists: true,
  claimDocumentId: null,
  currentUploadId: null,
  liveReview: null,
  currentReview: null,
};

function reviewOf(over: Partial<LiveDeathCertificateReview> = {}): LiveDeathCertificateReview {
  return {
    reviewId: REVIEW_ID,
    uploadId: UPLOAD_A,
    verdict: 'rejected',
    rejectionReason: 'date_of_death_unclear',
    registerCheck: null,
    decidedByDisplay: 'District Admin',
    decidedAt: new Date('2026-09-01T00:00:00Z'),
    ...over,
  };
}

const AWAITING_ROW: DeathCertificateSnapshot = {
  certificateRowExists: true,
  claimDocumentId: null,
  currentUploadId: UPLOAD_A,
  liveReview: null,
  currentReview: null,
};

function rejectedRow(reason: 'no_date_of_death' | 'date_of_death_unclear' | 'date_of_death_in_future'): DeathCertificateSnapshot {
  const review = reviewOf({ verdict: 'rejected', rejectionReason: reason });
  return {
    certificateRowExists: true,
    claimDocumentId: null,
    currentUploadId: UPLOAD_A,
    liveReview: review,
    currentReview: review,
  };
}

const ACCEPTED_ROW: DeathCertificateSnapshot = (() => {
  const review = reviewOf({ verdict: 'accepted', rejectionReason: null, uploadId: UPLOAD_A });
  return {
    certificateRowExists: true,
    claimDocumentId: null,
    currentUploadId: UPLOAD_A,
    liveReview: review,
    currentReview: review,
  };
})();

const IN_WINDOW_STATE = 'verification_in_progress';
// Derived from the CANONICAL constants (⛔ never hand-copied — a new lifecycle state or a window change
// must move these tests, not slip past them).
// ⭐ Story 6.24a (RF12) — `closed` has its OWN row (row 0), so row 1 still covers exactly the eight it always did.
const OUT_OF_WINDOW_EIGHT: string[] = CLAIM_LIFECYCLE_STATES.filter(
  (s) =>
    s !== 'closed' &&
    !(CLAIM_REVIEW_WINDOW_STATES as readonly string[]).includes(s) &&
    !(CLAIM_DOCUMENT_UPLOADABLE_STATES as readonly string[]).includes(s),
);

describe('resolveDeathCertificateFamilyStatus — the D1 state table (AC1)', () => {
  it('⭐ Story 6.24a row 0 — `closed` ⇒ status `closed`, ⛔ not live, ⛔ no upload, regardless of snapshot (RF12)', () => {
    for (const snapshot of [NO_ROW, LEGACY_ROW, AWAITING_ROW]) {
      const r = resolveDeathCertificateFamilyStatus('closed', snapshot);
      expect(r).toMatchObject({ status: 'closed', claimLive: false, replacementAllowed: false, uploadAllowed: false, replacementReason: null, reassurance: null });
    }
    expect(isInDeathCertificateReviewWindow('closed')).toBe(false);
    expect((CLAIM_DOCUMENT_UPLOADABLE_STATES as readonly string[]).includes('closed')).toBe(false);
  });

  it('row 1 — all eight out-of-window states return not_needed, regardless of snapshot', () => {
    const snapshots: Array<[string, DeathCertificateSnapshot]> = [
      ['no row', NO_ROW],
      ['legacy row', LEGACY_ROW],
      ['awaiting review', AWAITING_ROW],
      ['rejected (unclear)', rejectedRow('date_of_death_unclear')],
      ['rejected (future)', rejectedRow('date_of_death_in_future')],
      ['accepted', ACCEPTED_ROW],
    ];
    for (const state of OUT_OF_WINDOW_EIGHT) {
      for (const [label, snapshot] of snapshots) {
        const r = resolveDeathCertificateFamilyStatus(state, snapshot);
        expect(r.status, `${state} / ${label}`).toBe('not_needed');
        expect(r.replacementReason, `${state} / ${label}`).toBeNull();
        expect(r.replacementAllowed, `${state} / ${label}`).toBe(false);
        expect(r.uploadAllowed, `${state} / ${label}`).toBe(false);
        expect(r.reassurance, `${state} / ${label}`).toBeNull();
      }
    }
  });

  it('row 1 — a DENIED claim with a rejected review still returns not_needed (invariant 1, the `-242` defect class)', () => {
    const r = resolveDeathCertificateFamilyStatus('denied', rejectedRow('date_of_death_unclear'));
    expect(r.status).toBe('not_needed');
    expect(r.reassurance).toBeNull();
  });

  for (const state of CLAIM_DOCUMENT_UPLOADABLE_STATES) {
    it(`row 1a — ${state}, no certificate ⇒ missing, upload_allowed true, replacement_allowed false`, () => {
      const r = resolveDeathCertificateFamilyStatus(state, NO_ROW);
      expect(r.status).toBe('missing');
      expect(r.replacementAllowed).toBe(false);
      expect(r.uploadAllowed).toBe(true);
    });

    it(`row 1b — ${state}, a current upload exists ⇒ awaiting_review, both false`, () => {
      const r = resolveDeathCertificateFamilyStatus(state, AWAITING_ROW);
      expect(r.status).toBe('awaiting_review');
      expect(r.replacementAllowed).toBe(false);
      expect(r.uploadAllowed).toBe(false);
    });

    it(`${state} + a legacy row (no current upload) also reads missing (row 1a covers it, BW-G5)`, () => {
      const r = resolveDeathCertificateFamilyStatus(state, LEGACY_ROW);
      expect(r.status).toBe('missing');
      expect(r.uploadAllowed).toBe(true);
    });
  }

  it('row 2 — in window, no row at all ⇒ missing, both true', () => {
    const r = resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, NO_ROW);
    expect(r.status).toBe('missing');
    expect(r.replacementAllowed).toBe(true);
    expect(r.uploadAllowed).toBe(true);
  });

  it('row 2 — in window, a legacy row (T12) ⇒ missing, both true', () => {
    const r = resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, LEGACY_ROW);
    expect(r.status).toBe('missing');
    expect(r.replacementAllowed).toBe(true);
    expect(r.uploadAllowed).toBe(true);
  });

  it('row 3 — in window, rejected for a future date ⇒ replacement_requested, future_date', () => {
    const r = resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, rejectedRow('date_of_death_in_future'));
    expect(r.status).toBe('replacement_requested');
    expect(r.replacementReason).toBe('future_date');
    expect(r.replacementAllowed).toBe(true);
    expect(r.uploadAllowed).toBe(true);
    expect(r.reassurance).toBe('not_refused');
  });

  it('every rejection reason in the enum maps to a replacement reason (exhaustive — a new reason is a compile error, ⛔ never silently "unclear")', () => {
    const expected: Record<(typeof DEATH_CERTIFICATE_REJECTION_REASONS)[number], string> = {
      no_date_of_death: 'unclear_date',
      date_of_death_unclear: 'unclear_date',
      date_of_death_in_future: 'future_date',
    };
    for (const reason of DEATH_CERTIFICATE_REJECTION_REASONS) {
      expect(resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, rejectedRow(reason)).replacementReason, reason).toBe(expected[reason]);
    }
  });

  it('row 4 — in window, rejected for no_date_of_death or date_of_death_unclear ⇒ unclear_date', () => {
    for (const reason of ['no_date_of_death', 'date_of_death_unclear'] as const) {
      const r = resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, rejectedRow(reason));
      expect(r.status, reason).toBe('replacement_requested');
      expect(r.replacementReason, reason).toBe('unclear_date');
    }
  });

  it('row 5 — in window, awaiting_review (current upload, no live current review) ⇒ awaiting_review, both false', () => {
    const r = resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, AWAITING_ROW);
    expect(r.status).toBe('awaiting_review');
    expect(r.replacementAllowed).toBe(false);
    expect(r.uploadAllowed).toBe(false);
  });

  it('row 6 — in window, accepted ⇒ accepted, both false', () => {
    const r = resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, ACCEPTED_ROW);
    expect(r.status).toBe('accepted');
    expect(r.replacementAllowed).toBe(false);
    expect(r.uploadAllowed).toBe(false);
  });

  it('`reversed` IS in the window and follows rows 2–6, ⛔ not row 1 — and gets `still_open`, not `not_refused` (`-249` §4)', () => {
    expect(isInDeathCertificateReviewWindow('reversed')).toBe(true);
    const r = resolveDeathCertificateFamilyStatus('reversed', rejectedRow('date_of_death_unclear'));
    expect(r.status).toBe('replacement_requested');
    expect(r.reassurance).toBe('still_open');
  });

  it('every OTHER replacement_requested claim (⛔ not reversed) gets not_refused', () => {
    for (const state of CLAIM_REVIEW_WINDOW_STATES.filter((s) => s !== 'reversed')) {
      const r = resolveDeathCertificateFamilyStatus(state, rejectedRow('date_of_death_unclear'));
      expect(r.reassurance, state).toBe('not_refused');
    }
  });

  it('every status but replacement_requested has a null reassurance', () => {
    expect(resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, NO_ROW).reassurance).toBeNull();
    expect(resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, AWAITING_ROW).reassurance).toBeNull();
    expect(resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, ACCEPTED_ROW).reassurance).toBeNull();
    expect(resolveDeathCertificateFamilyStatus('intake_pending', NO_ROW).reassurance).toBeNull();
  });

  it('row 1 still covers EXACTLY eight states (the canonical constants have not drifted from D1\'s table)', () => {
    expect(OUT_OF_WINDOW_EIGHT).toHaveLength(8);
  });

  it('`claim_live` is false EXACTLY for `CLAIM_TERMINAL_STATES`, for EVERY lifecycle state (the by-value copy has not drifted)', () => {
    for (const state of CLAIM_LIFECYCLE_STATES) {
      expect(resolveDeathCertificateFamilyStatus(state, NO_ROW).claimLive, state).toBe(
        !(CLAIM_TERMINAL_STATES as readonly string[]).includes(state),
      );
    }
  });

  it('`claim_live` is false EXACTLY for denied and settled (`-249` §2)', () => {
    expect(resolveDeathCertificateFamilyStatus('denied', NO_ROW).claimLive).toBe(false);
    expect(resolveDeathCertificateFamilyStatus('settled', NO_ROW).claimLive).toBe(false);
    for (const state of [...OUT_OF_WINDOW_EIGHT.filter((s) => s !== 'denied' && s !== 'settled'), IN_WINDOW_STATE, 'intake_converged']) {
      expect(resolveDeathCertificateFamilyStatus(state, NO_ROW).claimLive, state).toBe(true);
    }
  });

  it('`certificate_token` equals the snapshot current upload id, null with no current upload', () => {
    expect(resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, NO_ROW).certificateToken).toBeNull();
    expect(resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, AWAITING_ROW).certificateToken).toBe(UPLOAD_A);
  });

  it('a claim not owned by the member is the CALLER\'s 404 — this resolver has no ownership concept (positive control: it never throws)', () => {
    expect(() => resolveDeathCertificateFamilyStatus(IN_WINDOW_STATE, NO_ROW)).not.toThrow();
  });
});

describe('resolveDeathCertificateFamilyStatus — C1: replacement_allowed matches the upload handler for every IN-WINDOW row', () => {
  const REVIEW_WINDOW_STATES: readonly string[] = CLAIM_REVIEW_WINDOW_STATES;
  const SNAPSHOTS: Array<[string, DeathCertificateSnapshot]> = [
    ['no row', NO_ROW],
    ['legacy row', LEGACY_ROW],
    ['awaiting review', AWAITING_ROW],
    ['rejected (unclear)', rejectedRow('date_of_death_unclear')],
    ['rejected (future)', rejectedRow('date_of_death_in_future')],
    ['accepted', ACCEPTED_ROW],
  ];
  for (const state of REVIEW_WINDOW_STATES) {
    for (const [label, snapshot] of SNAPSHOTS) {
      it(`${state} / ${label}`, () => {
        const r = resolveDeathCertificateFamilyStatus(state, snapshot);
        const statusForHandler =
          snapshot === NO_ROW || snapshot === LEGACY_ROW
            ? 'missing'
            : snapshot === AWAITING_ROW
              ? 'awaiting_review'
              : snapshot === ACCEPTED_ROW
                ? 'accepted'
                : 'rejected';
        expect(r.replacementAllowed).toBe(isDeathCertificateUploadAllowed(state, statusForHandler));
      });
    }
  }
});

describe('resolveDeathCertificateFamilyStatus — upload_allowed soundness (`-247` §2)', () => {
  const ALL_STATES: readonly string[] = CLAIM_LIFECYCLE_STATES;
  const SNAPSHOTS: Array<[string, DeathCertificateSnapshot, 'missing' | 'awaiting_review' | 'accepted' | 'rejected']> = [
    ['no row', NO_ROW, 'missing'],
    ['awaiting review', AWAITING_ROW, 'awaiting_review'],
    ['rejected', rejectedRow('date_of_death_unclear'), 'rejected'],
    ['accepted', ACCEPTED_ROW, 'accepted'],
  ];

  for (const state of ALL_STATES) {
    for (const [label, snapshot, statusForHandler] of SNAPSHOTS) {
      it(`upload_allowed ⇒ isDeathCertificateUploadAllowed — ${state} / ${label}`, () => {
        const r = resolveDeathCertificateFamilyStatus(state, snapshot);
        if (r.uploadAllowed) {
          expect(isDeathCertificateUploadAllowed(state, statusForHandler)).toBe(true);
        }
      });
    }
  }

  it('the ONE deliberate divergence: pre-verification with a current upload — the handler accepts, upload_allowed is false', () => {
    for (const state of CLAIM_DOCUMENT_UPLOADABLE_STATES) {
      const r = resolveDeathCertificateFamilyStatus(state, AWAITING_ROW);
      expect(r.uploadAllowed).toBe(false);
      expect(isDeathCertificateUploadAllowed(state, 'awaiting_review')).toBe(true);
    }
  });
});
