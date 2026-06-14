// Pure view-model derivation for the integrity page (Story 1.11b, DD-4/DD-5).
//
// All four red-banner fields (AC-4) + the banner state (AC-2/AC-5) derive purely
// from the check history (newest-first) the list endpoint returns. Keeping this
// pure makes the banner logic exhaustively unit-testable without React.

import type { AuditIntegrityCheckList, AuditIntegrityCheckListItem } from '@twt/contracts';

export type BannerKind = 'ok' | 'fail' | 'fail-acknowledged' | 'empty';

/** The four AC-4 red-banner fields, each mapped to a real verdict/history source. */
export interface FailureFields {
  /** Failing row ID = the failing verdict's firstBroken row (DD-4). */
  failingAuditId: string | null;
  failingSeq: number | null;
  /** Prior valid row ID = the failing verdict's last-good boundary (endAuditId). */
  priorValidAuditId: string | null;
  priorValidSeq: number | null;
  /** Tamper-suspect window = [last chainValid=true check, this failing check]. */
  tamperWindowFrom: string | null;
  tamperWindowTo: string;
  /**
   * Cold-mirror last-good-state pointer — the live cold mirror is deferred
   * (D1-1.11a), so this is the HOT-chain proxy: the last provably-good state
   * (the most recent chainValid=true check's end boundary). Rendered clearly
   * labelled, with a secondary "cold-mirror cross-verification: deferred" line.
   */
  lastProvablyGoodAuditId: string | null;
  lastProvablyGoodSeq: number | null;
}

export interface IntegrityView {
  /** The most recent check (drives the banner). */
  latest: AuditIntegrityCheckListItem | null;
  /** The most recent AUTOMATED check (cron/post_mirror) — the AC-2 "last automated". */
  lastAutomated: AuditIntegrityCheckListItem | null;
  banner: BannerKind;
  /** Present iff the latest check failed. */
  failure: FailureFields | null;
}

/** Automated = anything not operator-triggered (cron, post_mirror). */
function isAutomated(item: AuditIntegrityCheckListItem): boolean {
  return item.triggerSource !== 'on_demand';
}

export function deriveIntegrityView(checks: AuditIntegrityCheckList): IntegrityView {
  if (checks.length === 0) {
    return { latest: null, lastAutomated: null, banner: 'empty', failure: null };
  }

  const latest = checks[0]!;
  const lastAutomated = checks.find(isAutomated) ?? null;

  if (latest.chainValid) {
    return { latest, lastAutomated, banner: 'ok', failure: null };
  }

  // The most recent provably-good check that PRECEDES the failing one — the floor
  // of the tamper-suspect window + the hot-chain "last provably-good state" proxy.
  const lastGood = checks.slice(1).find((c) => c.chainValid) ?? null;

  const failure: FailureFields = {
    failingAuditId: latest.firstBrokenAuditId,
    failingSeq: latest.firstBrokenSeq,
    priorValidAuditId: latest.endAuditId,
    priorValidSeq: latest.endSeq,
    tamperWindowFrom: lastGood?.verifiedAt ?? null,
    tamperWindowTo: latest.verifiedAt,
    lastProvablyGoodAuditId: lastGood?.endAuditId ?? null,
    lastProvablyGoodSeq: lastGood?.endSeq ?? null,
  };

  // DD-5: the red banner persists until acknowledged. An acknowledged failure
  // drops to a muted state (the failure stays in history; the blocking red clears).
  const banner: BannerKind = latest.acknowledgement ? 'fail-acknowledged' : 'fail';
  return { latest, lastAutomated, banner, failure };
}
