// "Show code" — Story 13.1a (AD13; AC11 (c); review R4, CR6, CR1). The code is SHOWN, never kept:
//   · it lives ONLY inside the open identity panel (`WorkerDetail` renders it once the identity has loaded — `-448`), so there is at
//     most ONE reveal on the page; closing or switching the panel unmounts it;
//   · each click is a fresh audited read (`api.readFieldWorkerCode` called directly — ⛔ a query, so no cache ever holds it);
//   · the value lives in COMPONENT STATE ONLY and is cleared on Hide, after 60 seconds, when the tab is hidden (`visibilitychange`)
//     and on unmount (the panel closed, or another worker's panel opened);
//   · a GENERATION token (`epochRef`, the `ContactCallForm` `numberEpochRef` precedent) is bumped by every clear and on unmount, and
//     a response is accepted only if its token is still current AND the tab is visible — so a late answer to a cleared reveal, or to
//     a panel that has been closed or switched, can never put the digits back (review R4);
//   · the digits are large, `role="img"` with an accessible label that spells them one by one for reading aloud (an `aria-label` on
//     a bare paragraph is no supported name); ⛔ a clipboard control (the clipboard outlives the screen).
//
// Announcements and focus (review CR6): ONE persistent polite live region, mounted empty, says "code shown for <name>, it hides in
// 60 seconds" and "code hidden" — ⛔ it never holds the digits. Showing moves focus to Hide; hiding, expiry and a hidden tab move
// it back to Show when focus was inside this reveal or on the page body (the swapped buttons unmount under it), and leave it alone
// when the admin has gone elsewhere. The buttons' names CONTAIN their visible text; the worker's name is a hidden suffix.

import { useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import * as api from '../../api/client.js';
import { fieldWorkerListIsStale, fieldWorkerListsKey } from '../../api/hooks.js';
import { focusIfUnclaimed } from '../marketplace/focus.js';
import { codeUnavailableText, fieldWorkerGuidance, spellDigits, type Guidance } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

/** How long a shown code stays on screen. */
export const CODE_VISIBLE_MS = 60_000;

export interface CodeRevealProps {
  pariwarId: string;
  fieldWorkerId: string;
  workerName: string;
}

type View = { kind: 'idle' } | { kind: 'loading' } | { kind: 'shown'; code: string } | { kind: 'refused'; text: string; signIn: boolean };

export function CodeReveal({ pariwarId, fieldWorkerId, workerName }: CodeRevealProps): ReactElement {
  const qc = useQueryClient();
  const [view, setView] = useState<View>({ kind: 'idle' });
  const [live, setLive] = useState('');
  const epochRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const showRef = useRef<HTMLButtonElement | null>(null);
  const hideRef = useRef<HTMLButtonElement | null>(null);
  const shownRef = useRef(false); // the digits are on screen — "code hidden" is announced only for a code that was shown
  const prevKind = useRef<View['kind']>('idle');
  useSignInRedirect(view.kind === 'refused' && view.signIn);

  const clear = (): void => {
    epochRef.current += 1; // any answer still in flight is now stale
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    setLive(shownRef.current ? t('fw.code.liveHidden') : '');
    shownRef.current = false;
    setView({ kind: 'idle' });
  };

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') clear();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      epochRef.current += 1; // unmount (the panel closed or switched): a late answer is dropped
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  // Focus follows the swap of buttons: Hide takes it when the code appears, Show gets it back when the code goes — in both cases
  // only if focus is unclaimed (on the body, or still inside this reveal), so a late answer never steals it from elsewhere.
  // Only a code that was SHOWN gives focus back: a read that ends while the tab is hidden never showed one.
  useEffect(() => {
    const prev = prevKind.current;
    prevKind.current = view.kind;
    if (view.kind === 'shown') focusIfUnclaimed(hideRef.current, rootRef.current);
    else if (prev === 'shown' && view.kind === 'idle') focusIfUnclaimed(showRef.current, rootRef.current);
  }, [view.kind]);

  const show = (): void => {
    epochRef.current += 1;
    const epoch = epochRef.current;
    setView({ kind: 'loading' });
    setLive(t('fw.code.loading'));
    api.readFieldWorkerCode(pariwarId, fieldWorkerId).then(
      (r) => {
        if (epochRef.current !== epoch) return;
        // The tab went hidden with this very read in flight and nothing bumped the token: back to idle, never stuck "Fetching…".
        if (document.visibilityState === 'hidden') {
          clear();
          return;
        }
        shownRef.current = true;
        setView({ kind: 'shown', code: r.code });
        setLive(t('fw.code.liveShown', { name: workerName, seconds: CODE_VISIBLE_MS / 1000 }));
        timerRef.current = setTimeout(clear, CODE_VISIBLE_MS);
      },
      (err: unknown) => {
        if (epochRef.current !== epoch) return;
        const g: Guidance = fieldWorkerGuidance(err, 'code');
        if (fieldWorkerListIsStale(err)) void qc.invalidateQueries({ queryKey: fieldWorkerListsKey(pariwarId) }); // review CR47
        setLive('');
        setView({ kind: 'refused', text: codeUnavailableText(err) ?? g.text, signIn: g.signIn === true });
      },
    );
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-1" data-testid={`fw-code-${fieldWorkerId}`}>
      {view.kind === 'shown' ? (
        <>
          <p role="img" className="font-mono text-3xl tracking-widest" aria-label={t('fw.code.label', { spelled: spellDigits(view.code) })} data-testid="fw-code-digits">
            {view.code}
          </p>
          <p className="text-xs">{t('fw.code.readAloud')}</p>
          <button type="button" ref={hideRef} className="self-start rounded border px-3 py-1 text-sm" onClick={clear} data-testid="fw-code-hide">
            {t('fw.code.hide')}
            <span className="sr-only"> {t('fw.forName', { name: workerName })}</span>
          </button>
        </>
      ) : (
        <button
          type="button"
          ref={showRef}
          className="self-start rounded border px-3 py-1 text-sm"
          onClick={show}
          disabled={view.kind === 'loading'}
          data-testid="fw-code-show"
        >
          {view.kind === 'loading' ? t('fw.code.loading') : t('fw.code.show')}
          <span className="sr-only"> {t('fw.forName', { name: workerName })}</span>
        </button>
      )}
      <p role="status" aria-live="polite" className="sr-only" data-testid="fw-code-live">
        {live}
      </p>
      {view.kind === 'refused' && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="fw-code-refused">
          {view.text}
        </p>
      )}
    </div>
  );
}
