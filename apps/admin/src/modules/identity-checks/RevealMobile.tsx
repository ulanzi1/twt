// Story 3.13 (DL6a; `2026-11-25-502` Q3 B) — "Show mobile number": the member's FULL number, ONE audited showing per press,
// only to ARRANGE an identity check. The number lives in this component's state — ⛔ the query cache, ⛔ a log. A refused
// press (the member no longer awaits a check, or a claim is filed for the death) shows the refused line and ⛔ a number.

import type { ReactElement } from 'react';
import { useState } from 'react';

import { useRevealIdentityCheckMobile } from './hooks.js';
import { identityCheckEn } from './i18n-en.js';

const t = identityCheckEn.reveal;

export function RevealMobile({ pariwarId, memberId }: { pariwarId: string; memberId: string }): ReactElement {
  const reveal = useRevealIdentityCheckMobile(pariwarId, memberId);
  const [shown, setShown] = useState<string | null>(null);
  const [refused, setRefused] = useState(false);

  const press = (): void => {
    setRefused(false);
    reveal.mutate(undefined, {
      onSuccess: (r) => setShown(r.mobile),
      onError: () => {
        setShown(null);
        setRefused(true);
      },
    });
  };

  return (
    <div className="mt-1 text-sm" data-testid={`reveal-mobile-${memberId}`}>
      <button
        type="button"
        className="rounded border px-2 py-0.5 text-xs"
        data-testid={`reveal-mobile-button-${memberId}`}
        disabled={reveal.isPending}
        onClick={press}
      >
        {t.button}
      </button>
      {shown !== null ? (
        <div className="mt-1" data-testid={`reveal-mobile-shown-${memberId}`}>
          <p className="font-mono">{shown}</p>
          <p className="text-xs text-slate-600">{t.purpose}</p>
          <p className="text-xs text-slate-600">{t.recorded}</p>
        </div>
      ) : null}
      {refused ? (
        <p role="alert" className="mt-1 text-xs" data-testid={`reveal-mobile-refused-${memberId}`}>
          {t.refused}
        </p>
      ) : null}
    </div>
  );
}
