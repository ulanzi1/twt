// The District Admin's "Certificate reminders" page — Story 6.19d (AC5; `2026-10-03-276` CR11). ONE route:
//   · /p/$pariwarId/certificate-reminders — key (1); linked from the admin nav inside a Pariwar context only.
// ⭐ The correction queues' states: the session gate (an expired session goes to sign-in), the list's OWN 401 / 403 (a
// 403 is ⛔ an outage, and re-gates even over cached data), a failed refetch keeps the list, an empty list says so.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { ApiError } from '../api/client.js';
import { useCertificateReminders, useSession } from '../api/hooks.js';
import { CertificateRemindersList, certificateRemindersEn as t } from '../modules/certificate-reminders/index.js';

function CertificateRemindersView(): ReactElement {
  const { pariwarId } = useParams({ from: '/p/$pariwarId/certificate-reminders' });
  const q = useCertificateReminders(pariwarId);
  const navigate = useNavigate();
  const status = q.error instanceof ApiError ? q.error.status : null;
  useEffect(() => {
    if (status === 401) void navigate({ to: '/login' });
  }, [status, navigate]);
  let body: ReactElement;
  if (q.isLoading) {
    body = <p role="status" data-testid="certificate-reminders-loading">{t.loading}</p>;
  } else if (status === 403) {
    body = <p role="alert" data-testid="certificate-reminders-forbidden">{t.errors.forbidden}</p>;
  } else if (q.data === undefined) {
    body = <p role="alert" data-testid="certificate-reminders-error">{t.loadError}</p>;
  } else {
    body = (
      <>
        {q.isError ? <p role="alert">{t.loadError}</p> : null}
        {/* The caller's ONLY signal that earlier claims were left out — ⛔ never let the list read as complete, and ⛔
            never say "no family is being reminded" when the list was cut (code review round 2). */}
        {q.data.truncated ? (
          <p role="status" className="mt-2 text-xs" data-testid="certificate-reminders-truncated">
            {q.data.items.length === 0 ? t.emptyTruncated : t.truncated}
          </p>
        ) : null}
        {q.data.items.length === 0 ? (
          q.data.truncated ? null : (
            <p role="status" data-testid="certificate-reminders-empty">
              {t.empty}
            </p>
          )
        ) : (
          <CertificateRemindersList pariwarId={pariwarId} items={q.data.items} />
        )}
      </>
    );
  }
  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-lg font-semibold">{t.heading}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.intro}</p>
      {body}
    </main>
  );
}

export function CertificateRemindersRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);
  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  return <CertificateRemindersView />;
}
