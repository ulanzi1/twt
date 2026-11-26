// Story 3.13 (DL11, DL6a, DL13) — the IDENTITY CHECKS queue: every member whose typed-in identity nobody has confirmed, in the
// viewer's scope (the server keeps each row at its own district), `pending-valid` first then oldest signup. ⛔ A name, ⛔ a
// mobile on the list. A District / Pariwar Admin (`can_check`) opens a row for the detail; a verifier or a helpline operator
// (the reveal key only) sees the list and the "Show mobile number" press, ⛔ the identity or the forms. The list is PAGED
// (`-504` item 3): 50 a page, "Next" only while the server says `has_more`, so a member staff could not reach never hides the
// members behind them. The page controls stay mounted while a page loads or fails (⛔ focus dropping to the page; ⛔ staff
// stranded on page 2 by an error), and a LATER page that comes back empty steps back by itself — "No member is waiting" is
// said only for an empty FIRST page, because it would be false while earlier pages still hold members.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { ApiError, IDENTITY_CHECK_QUEUE_PAGE_SIZE } from '../../api/client.js';
import { useSession } from '../../api/hooks.js';
import { identityChecksPath } from '../../routes/login-next.js';
import { formatIstDate } from './format.js';
import { useIdentityCheckQueue } from './hooks.js';
import { identityCheckEn } from './i18n-en.js';
import { RevealMobile } from './RevealMobile.js';

const t = identityCheckEn;

export function IdentityChecksRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/identity-checks' });
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login', search: { next: identityChecksPath(pariwarId) } });
  }, [session.isError, navigate, pariwarId]);
  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  // `key` — another Pariwar starts at its own first page.
  return <IdentityChecksView key={pariwarId} pariwarId={pariwarId} />;
}

export function IdentityChecksView({ pariwarId }: { pariwarId: string }): ReactElement {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const queue = useIdentityCheckQueue(pariwarId, offset);
  const status = queue.error instanceof ApiError ? queue.error.status : null;
  useEffect(() => {
    if (status === 401) void navigate({ to: '/login', search: { next: identityChecksPath(pariwarId) } });
  }, [status, navigate, pariwarId]);
  const entries = queue.data?.entries ?? [];
  const canCheck = queue.data?.can_check ?? false;
  const hasMore = queue.data?.has_more ?? false;
  // A LATER page that has SETTLED empty (its members were checked meanwhile): step back to the page before it.
  const settledEmpty = queue.isSuccess && !queue.isPlaceholderData && entries.length === 0;
  useEffect(() => {
    if (settledEmpty && offset > 0) setOffset(Math.max(0, offset - IDENTITY_CHECK_QUEUE_PAGE_SIZE));
  }, [settledEmpty, offset]);
  // The page controls: on any later page (an error there leaves Previous — staff are ⛔ stranded) and on a page with rows.
  const showPager = offset > 0 || entries.length > 0;
  // While the next page loads the old rows are still on screen (`keepPreviousData`): a press then would skip a page nobody saw.
  const turnTo = (to: number): void => {
    if (queue.isPlaceholderData) return;
    setOffset(to);
  };
  const pager = (
    <div className="mt-4 flex items-center justify-between gap-2 text-sm">
      <button
        type="button"
        data-testid="identity-checks-page-prev"
        disabled={offset === 0}
        onClick={() => turnTo(Math.max(0, offset - IDENTITY_CHECK_QUEUE_PAGE_SIZE))}
        className="rounded border px-2 py-1 disabled:opacity-50"
      >
        {t.queue.previous}
      </button>
      <button
        type="button"
        data-testid="identity-checks-page-next"
        disabled={!hasMore}
        onClick={() => turnTo(offset + IDENTITY_CHECK_QUEUE_PAGE_SIZE)}
        className="rounded border px-2 py-1 disabled:opacity-50"
      >
        {t.queue.next}
      </button>
    </div>
  );

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-lg font-semibold">{t.title}</h1>
      {queue.isLoading ? (
        <p role="status" data-testid="identity-checks-loading" className="mt-4 text-sm">
          {t.queue.loading}
        </p>
      ) : status === 403 ? (
        <p role="alert" data-testid="identity-checks-forbidden" className="mt-4 text-sm">
          {t.queue.forbidden}
        </p>
      ) : queue.isError ? (
        <p role="alert" data-testid="identity-checks-error" className="mt-4 text-sm">
          {t.queue.loadError}
        </p>
      ) : entries.length === 0 && (offset > 0 || queue.isPlaceholderData) ? (
        // A later page that came back empty (or the page before it, still loading behind that empty page's placeholder): ⛔ "No member
        // is waiting" — earlier pages still hold members; the effect above steps back.
        <p role="status" data-testid="identity-checks-loading" className="mt-4 text-sm">
          {t.queue.loading}
        </p>
      ) : entries.length === 0 ? (
        <p role="status" data-testid="identity-checks-empty" className="mt-4 text-sm">
          {t.queue.empty}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3" data-testid="identity-checks-list">
          {entries.map((e) => (
            <li key={e.member_id} className="rounded border p-3 text-sm" data-testid={`identity-checks-item-${e.member_id}`}>
              <p className="font-medium">
                {t.queue.member} {e.short_member_id} · {t.queue.stateLabels[e.state] ?? e.state}
              </p>
              <p className="text-xs">
                {t.queue.signedUp} {formatIstDate(e.signed_up_at)} · {t.queue.district}: {e.district ?? t.queue.noDistrict}
              </p>
              <p className="text-xs">
                {t.queue.lastCheck}:{' '}
                {e.latest_outcome === null || e.latest_decided_at === null
                  ? t.queue.notYetChecked
                  : `${t.queue.outcomeLabels[e.latest_outcome] ?? e.latest_outcome} · ${formatIstDate(e.latest_decided_at)}`}{' '}
                · {t.queue.attempts}: {e.attempt_count}
              </p>
              {canCheck ? (
                <button
                  type="button"
                  className="mt-2 rounded border px-3 py-1 text-sm"
                  data-testid={`identity-checks-open-${e.member_id}`}
                  aria-label={`${t.queue.open}: ${t.queue.member} ${e.short_member_id}`}
                  onClick={() =>
                    void navigate({ to: '/p/$pariwarId/identity-checks/$memberId', params: { pariwarId, memberId: e.member_id } })
                  }
                >
                  {t.queue.open}
                </button>
              ) : (
                // DL6a — a verifier / helpline operator ARRANGES the check: the number press, ⛔ the identity.
                <RevealMobile pariwarId={pariwarId} memberId={e.member_id} />
              )}
            </li>
          ))}
        </ul>
      )}
      {showPager ? pager : null}
    </main>
  );
}
