// The finance officer's "Joining fee bank dates" page — Story 6.39a (DL10; AC12). ONE route:
//   · /p/$pariwarId/fee-bank-dates — `claim.record_fee_bank_date`; linked from the admin nav inside a Pariwar context only
//     (UNGATED there — the server's 403 is the boundary).
// ⭐ The certificate-reminders page's states (6.19d): the session gate (an expired session goes to sign-in), the list's OWN
// 401 / 403 (a 403 is ⛔ an outage, and re-gates even over cached data), a failed refetch keeps the list, an empty list
// says so.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { ApiError } from '../api/client.js';
import { useFeeBankDates, useSession } from '../api/hooks.js';
import { FeeBankDatesList, feeBankDatesEn as t } from '../modules/fee-bank-dates/index.js';

function FeeBankDatesView(): ReactElement {
  const { pariwarId } = useParams({ from: '/p/$pariwarId/fee-bank-dates' });
  const q = useFeeBankDates(pariwarId);
  const navigate = useNavigate();
  const status = q.error instanceof ApiError ? q.error.status : null;
  useEffect(() => {
    if (status === 401) void navigate({ to: '/login' });
  }, [status, navigate]);
  let body: ReactElement;
  if (q.isLoading) {
    body = <p role="status" data-testid="fee-bank-dates-loading">{t.loading}</p>;
  } else if (status === 403) {
    body = <p role="alert" data-testid="fee-bank-dates-forbidden">{t.forbidden}</p>;
  } else if (q.data === undefined) {
    body = <p role="alert" data-testid="fee-bank-dates-error">{t.loadError}</p>;
  } else {
    body = (
      <>
        {q.isError ? <p role="alert">{t.loadError}</p> : null}
        <FeeBankDatesList
          pariwarId={pariwarId}
          held={q.data.held}
          recorded={q.data.recorded}
          heldTruncated={q.data.held_truncated}
          recordedTruncated={q.data.recorded_truncated}
        />
      </>
    );
  }
  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 id="fee-bank-dates-heading" className="text-lg font-semibold">
        {t.heading}
      </h1>
      <p className="mt-1 text-sm text-slate-600">{t.intro}</p>
      {body}
    </main>
  );
}

export function FeeBankDatesRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);
  if (session.isLoading) return <p role="status">{t.checkingSession}</p>;
  if (session.isError) return <p role="status">{t.redirecting}</p>;
  return <FeeBankDatesView />;
}
