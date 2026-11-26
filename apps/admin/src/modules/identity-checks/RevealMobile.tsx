// Story 3.13 (DL6a; `2026-11-25-502` Q3 B) — "Show mobile number": the member's FULL number, ONE audited showing per press,
// only to ARRANGE an identity check. The number lives in this component's state — ⛔ the query cache (`gcTime: 0`), ⛔ a log —
// and ⛔ for long: it is cleared after a minute, the moment the tab is hidden and when a new press starts (code review P9), and
// EVERY clearing also resets the mutation, so `mutation.data.mobile` never outlives the number on screen. Its block is rendered
// into a live region that is ALWAYS mounted (empty until a number exists), so a screen reader hears the number appear — many
// ignore a live region inserted already populated. A press the SERVER refuses (409 `identity_validation.*`: the member no
// longer awaits a check, or a claim is filed for the death) shows the refused line and ⛔ a number, and re-reads the page (R3-P2);
// a 401 (the session ended) sends staff to sign in, back to this page (R3-P3 — "Try again" could never work); ANY other failure
// (a rate limit, a 5xx, the network) shows its own line and the press stays available (P10). A number that ARRIVES while the tab
// is already hidden is ⛔ put on screen at all (R3-P1): the hidden-tab rule hears only a CHANGE of visibility.

import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { isRevealRefusal, useRevealIdentityCheckMobile } from './hooks.js';
import { identityCheckEn } from './i18n-en.js';

const t = identityCheckEn.reveal;

/** How long a showing stays on screen. */
const REVEAL_SHOWN_FOR_MS = 60_000;

type Problem = 'refused' | 'could_not_show' | null;

export function RevealMobile({
  pariwarId,
  memberId,
  onSignedOut,
}: {
  pariwarId: string;
  memberId: string;
  /** A 401 on the press: send staff to sign in, back to the page they were on. */
  onSignedOut: () => void;
}): ReactElement {
  const { mutate, reset, isPending } = useRevealIdentityCheckMobile(pariwarId, memberId);
  // An object, so a SECOND press (a new audited showing) restarts the minute even when the number is the same.
  const [shown, setShown] = useState<{ mobile: string } | null>(null);
  const [problem, setProblem] = useState<Problem>(null);

  /** The ONE way the number leaves the screen: its state AND the mutation's copy of it. */
  const clear = useCallback((): void => {
    setShown(null);
    reset();
  }, [reset]);

  // The number clears after a minute and when the document is hidden; both are torn down with the component (⛔ a timer
  // or a listener that outlives it).
  useEffect(() => {
    if (shown === null) return undefined;
    // The backstop of the check in `onSuccess`: a tab hidden between that check and this effect.
    if (document.visibilityState === 'hidden') {
      clear();
      return undefined;
    }
    const timer = setTimeout(clear, REVEAL_SHOWN_FOR_MS);
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') clear();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [shown, clear]);

  const press = (): void => {
    setProblem(null);
    clear(); // the last number is gone the moment a new showing is asked for
    mutate(undefined, {
      onSuccess: (r) => {
        // The tab was hidden while the showing was awaited: ⛔ onto the screen (and out of the mutation) — the hidden-tab rule.
        if (document.visibilityState === 'hidden') {
          clear();
          return;
        }
        setShown({ mobile: r.mobile });
      },
      onError: (err) => {
        setShown(null);
        if (err instanceof ApiError && err.status === 401) {
          onSignedOut();
          return;
        }
        // ONLY the server's own refusal reads "can no longer be shown here"; a 429 / 5xx / network failure does not.
        setProblem(isRevealRefusal(err) ? 'refused' : 'could_not_show');
      },
    });
  };

  return (
    <div className="mt-1 text-sm" data-testid={`reveal-mobile-${memberId}`}>
      <button
        type="button"
        className="rounded border px-2 py-0.5 text-xs"
        data-testid={`reveal-mobile-button-${memberId}`}
        disabled={isPending}
        onClick={press}
      >
        {t.button}
      </button>
      <div role="status" data-testid={`reveal-mobile-live-${memberId}`}>
        {shown !== null ? (
          <div className="mt-1" data-testid={`reveal-mobile-shown-${memberId}`}>
            <p className="font-mono">{shown.mobile}</p>
            <p className="text-xs text-slate-600">{t.purpose}</p>
            <p className="text-xs text-slate-600">{t.recorded}</p>
          </div>
        ) : null}
      </div>
      {problem === 'refused' ? (
        <p role="alert" className="mt-1 text-xs" data-testid={`reveal-mobile-refused-${memberId}`}>
          {t.refused}
        </p>
      ) : null}
      {problem === 'could_not_show' ? (
        <p role="alert" className="mt-1 text-xs" data-testid={`reveal-mobile-could-not-show-${memberId}`}>
          {t.couldNotShow}
        </p>
      ) : null}
    </div>
  );
}
