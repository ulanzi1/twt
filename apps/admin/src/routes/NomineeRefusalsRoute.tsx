// The Pariwar Admin's `-239` REFUSAL read surface — Story 6.20 (D14, AC4).
//
// `2026-09-21-239`: the District Admin refuses a claim on SUSPICION of a post-death nominee change and
// NOTIFIES the Pariwar Admin with a note and reason. ⭐ This page IS that notification (⛔ no staff push
// channel exists and ⛔ none is invented): a list, ⛔ never an approval step — nothing here waits for the
// Pariwar Admin, and there is ⛔ no approve / reverse control (`-239` consequence 3). The refusal is
// appealable once through the ordinary appeal path.
// The CorrectionQueueRoute shape: a session gate, then the list's own 401/403 handling.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { ApiError } from '../api/client.js';
import { useNomineeRefusals, useSession } from '../api/hooks.js';
import { verifierConsoleEn } from '../modules/claim-verification/i18n-en.js';

const t = verifierConsoleEn.nomineeDeclaration.refusals;

export function NomineeRefusalsRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);
  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  return <NomineeRefusalsView />;
}

function NomineeRefusalsView(): ReactElement {
  const { pariwarId } = useParams({ from: '/p/$pariwarId/nominee-refusals' });
  const navigate = useNavigate();
  const list = useNomineeRefusals(pariwarId);
  const status = list.error instanceof ApiError ? list.error.status : null;
  useEffect(() => {
    if (status === 401) void navigate({ to: '/login' });
  }, [status, navigate]);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-lg font-semibold">{t.heading}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.intro}</p>
      {list.isLoading ? (
        <p role="status" data-testid="nominee-refusals-loading" className="mt-4 text-sm">
          {t.loading}
        </p>
      ) : status === 403 ? (
        <p role="alert" data-testid="nominee-refusals-forbidden" className="mt-4 text-sm">
          {t.forbidden}
        </p>
      ) : list.isError ? (
        <p role="alert" data-testid="nominee-refusals-error" className="mt-4 text-sm">
          {t.loadError}
        </p>
      ) : (list.data?.items.length ?? 0) === 0 ? (
        <p role="status" data-testid="nominee-refusals-empty" className="mt-4 text-sm">
          {t.empty}
        </p>
      ) : (
        <ul className="mt-4 space-y-3" data-testid="nominee-refusals">
          {list.data?.items.map((item) => (
            <li key={item.claim_case_id} className="rounded border p-3 text-sm" data-testid={`nominee-refusal-${item.claim_case_id}`}>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <code className="font-mono text-xs opacity-80">{item.claim_case_id}</code>
                <span className="rounded bg-black/5 px-1.5 py-0.5 text-xs">{item.claim_state}</span>
              </div>
              <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 text-xs">
                <dt className="opacity-70">{t.refusedBy}</dt>
                <dd>
                  {item.refused_by_display ?? '—'} · {item.refused_at}
                </dd>
                <dt className="opacity-70">{t.note}</dt>
                <dd data-testid="nominee-refusal-note">
                  {item.rationale === null
                    ? '—'
                    : item.rationale.state === 'readable'
                      ? item.rationale.value
                      : verifierConsoleEn.nomineeDeclaration.unreadable}
                </dd>
              </dl>
              <a className="mt-2 inline-block underline" href={`/p/${pariwarId}/claims/${item.claim_case_id}/verify`}>
                {t.open}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
