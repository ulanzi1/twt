// "Show code" — Story 13.1a (AD13; AC11 (c); review R4). The code is SHOWN, never kept:
//   · each click is a fresh audited read (`api.readFieldWorkerCode` called directly — ⛔ a query, so no cache ever holds it);
//   · the value lives in COMPONENT STATE ONLY and is cleared on Hide, after 60 seconds, when the tab is hidden (`visibilitychange`),
//     on unmount — and on choosing another worker (the parent marks one reveal `isCurrent`; every other one clears itself);
//   · a GENERATION token (`epochRef`, the `ContactCallForm` `numberEpochRef` precedent) is bumped by every clear and on unmount, and
//     a response is accepted only if its token is still current AND the tab is visible — so a late answer to a cleared or switched
//     reveal can never put the digits back (review R4);
//   · the digits are large, with an accessible label that spells them one by one for reading aloud; ⛔ a clipboard control (the
//     clipboard outlives the screen).

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import * as api from '../../api/client.js';
import { codeUnavailableText, fieldWorkerGuidance, spellDigits } from './derive.js';
import { resolveEn as t } from './i18n-en.js';

/** How long a shown code stays on screen. */
export const CODE_VISIBLE_MS = 60_000;

export interface CodeRevealProps {
  pariwarId: string;
  fieldWorkerId: string;
  workerName: string;
  /** False once another worker's code is asked for — this reveal then clears itself (and drops an answer in flight). */
  isCurrent: boolean;
  /** Called on "Show code", so the parent can make this reveal the current one. */
  onShow: () => void;
}

type View = { kind: 'idle' } | { kind: 'loading' } | { kind: 'shown'; code: string } | { kind: 'refused'; text: string };

export function CodeReveal({ pariwarId, fieldWorkerId, workerName, isCurrent, onShow }: CodeRevealProps): ReactElement {
  const [view, setView] = useState<View>({ kind: 'idle' });
  const epochRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = (): void => {
    epochRef.current += 1; // any answer still in flight is now stale
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    setView({ kind: 'idle' });
  };

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') clear();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      epochRef.current += 1; // unmount (incl. another worker chosen): a late answer is dropped
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  // Another worker chosen: clear (a no-op when idle). ⛔ On becoming current — `show` has just started the read.
  useEffect(() => {
    if (!isCurrent) clear();
  }, [isCurrent]);

  const show = (): void => {
    onShow();
    epochRef.current += 1;
    const epoch = epochRef.current;
    setView({ kind: 'loading' });
    api.readFieldWorkerCode(pariwarId, fieldWorkerId).then(
      (r) => {
        if (epochRef.current !== epoch || document.visibilityState === 'hidden') return;
        setView({ kind: 'shown', code: r.code });
        timerRef.current = setTimeout(clear, CODE_VISIBLE_MS);
      },
      (err: unknown) => {
        if (epochRef.current !== epoch) return;
        setView({ kind: 'refused', text: codeUnavailableText(err) ?? fieldWorkerGuidance(err).text });
      },
    );
  };

  return (
    <div className="flex flex-col gap-1" data-testid={`fw-code-${fieldWorkerId}`}>
      {view.kind === 'shown' ? (
        <>
          <p className="font-mono text-3xl tracking-widest" aria-label={t('fw.code.label', { spelled: spellDigits(view.code) })} data-testid="fw-code-digits">
            {view.code}
          </p>
          <p className="text-xs">{t('fw.code.readAloud')}</p>
          <button type="button" className="self-start rounded border px-3 py-1 text-sm" onClick={clear} data-testid="fw-code-hide">
            {t('fw.code.hide')}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="self-start rounded border px-3 py-1 text-sm"
          onClick={show}
          disabled={view.kind === 'loading'}
          aria-label={t('fw.code.showNamed', { name: workerName })}
          data-testid="fw-code-show"
        >
          {view.kind === 'loading' ? t('fw.code.loading') : t('fw.code.show')}
        </button>
      )}
      {view.kind === 'loading' && <p role="status" className="sr-only">{t('fw.code.loading')}</p>}
      {view.kind === 'refused' && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="fw-code-refused">
          {view.text}
        </p>
      )}
    </div>
  );
}
