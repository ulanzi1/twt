// The Move requests page — Story 13.1d (AC9; AD10 as amended by decision `-460`). Three sections over ONE read of the open requests:
//   (1) "Waiting for your answer" — with a district chosen: the PENDING requests whose other end (the counterpart) is that district and
//       that this officer did not open, each with Accept / Refuse; with "All districts" (a Pariwar Admin — a District Admin gets the
//       server's 403 and the line "choose a district you manage"): "Gone to the Pariwar Admin", every ESCALATED request, with Close
//       (settling it by a move is the worker's own Move, on Find a worker);
//   (2) "Your requests" — the open requests this officer opened, with Withdraw;
//   (3) "Notices" — the officer's own, newest first (`NoticeList`).
// Each item names the worker (the list's read decrypts the names behind ONE audit line a page — AD10), both districts, who asked
// (their current name, or "an officer (name not recorded)") and when, and the state; "View" opens the request's detail with the
// worker's work history (`MoveRequestDetail` — its own audited read, mounted only while open). The officer is known from the session.
// ⛔ Background refetching (the module's rule): the lists refresh after an act, after a 409 that says they are stale, or on "Try again".

import type { FieldWorkerMoveRequestItem } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { useFieldWorkerMoveRequests, useSession } from '../../api/hooks.js';
import { DistrictPicker } from './DistrictPicker.js';
import { FieldWorkerNav } from './FieldWorkerNav.js';
import { MoveRequestActions, type ListAct } from './MoveRequestActions.js';
import { MoveRequestDetail } from './MoveRequestDetail.js';
import { NoticeList } from './NoticeList.js';
import { fieldWorkerGuidance, formatIstDate, requestStateLabel } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export function MoveRequestsPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const session = useSession();
  const me = session.data?.userId ?? null;
  const [district, setDistrict] = useState<string | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [announce, setAnnounce] = useState<string | null>(null);
  const list = useFieldWorkerMoveRequests(pariwarId, 'open', district);
  const listError = list.isError ? fieldWorkerGuidance(list.error) : null;
  useSignInRedirect(listError?.signIn === true);

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const waiting =
    district === null
      ? items.filter((i) => i.state === 'escalated')
      : items.filter((i) => i.state === 'pending' && i.counterpart_district === district && i.opened_by !== me);
  const mine = items.filter((i) => i.opened_by === me);

  const row = (item: FieldWorkerMoveRequestItem, acts: readonly ListAct[]): ReactElement => (
    <li key={item.move_request_id} className="flex flex-col gap-1 rounded border p-2" data-testid="fw-request">
      <p className="font-medium">{t('fw.requests.item', { name: item.name, from: item.from_district, to: item.to_district })}</p>
      <p className="text-sm">
        {requestStateLabel(item.state)} ·{' '}
        {item.opened_by_display === null
          ? t('fw.requests.openedByUnknown', { date: formatIstDate(item.opened_at) })
          : t('fw.requests.openedBy', { name: item.opened_by_display, date: formatIstDate(item.opened_at) })}
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm"
          aria-expanded={view === item.move_request_id}
          onClick={() => setView((v) => (v === item.move_request_id ? null : item.move_request_id))}
          data-testid="fw-request-view"
        >
          {view === item.move_request_id ? t('fw.requests.hide') : t('fw.requests.view')}
          <span className="sr-only"> {t('fw.forName', { name: item.name })}</span>
        </button>
        <MoveRequestActions pariwarId={pariwarId} item={item} acts={acts} onDone={setAnnounce} />
      </div>
      {view === item.move_request_id && <MoveRequestDetail pariwarId={pariwarId} moveRequestId={item.move_request_id} />}
    </li>
  );

  return (
    <section className="flex max-w-4xl flex-col gap-4 p-4" data-testid="fw-requests-page">
      <h1 className="text-xl font-semibold">{t('fw.requests.title')}</h1>
      <FieldWorkerNav pariwarId={pariwarId} current="requests" />
      <p className="text-sm">{t('fw.requests.intro')}</p>
      <div role="status" data-testid="fw-requests-status">
        {announce !== null && (
          <p className="rounded bg-status-ok-bg p-2 text-sm text-status-ok-fg" data-testid="fw-requests-announce">
            {announce}
          </p>
        )}
      </div>
      <DistrictPicker
        pariwarId={pariwarId}
        value={district}
        onChange={(d) => {
          setDistrict(d);
          setView(null);
        }}
        allowAll
        testId="fw-requests-district"
      />
      {list.isPending && <p role="status">{t('fw.loading')}</p>}
      {listError !== null && (
        <div role="alert" className="flex flex-col gap-1 text-sm text-status-fail-fg" data-testid="fw-requests-error">
          <p>{listError.noAccess === true ? t('fw.requests.noAccess') : listError.text}</p>
          {listError.noAccess !== true && (
            <button type="button" className="self-start rounded border px-3 py-1" onClick={() => void list.refetch()}>
              {t('fw.retry')}
            </button>
          )}
        </div>
      )}
      {list.isSuccess && (
        <>
          <section aria-labelledby="fw-requests-waiting" className="flex flex-col gap-2" data-testid="fw-requests-waiting">
            <h2 id="fw-requests-waiting" className="text-lg font-semibold">
              {district === null ? t('fw.requests.escalated') : t('fw.requests.waiting')}
            </h2>
            {waiting.length === 0 ? (
              <p>{district === null ? t('fw.requests.escalatedEmpty') : t('fw.requests.waitingEmpty')}</p>
            ) : (
              <ul className="flex flex-col gap-2">{waiting.map((i) => row(i, district === null ? ['close'] : ['accept', 'refuse']))}</ul>
            )}
          </section>
          <section aria-labelledby="fw-requests-mine" className="flex flex-col gap-2" data-testid="fw-requests-mine">
            <h2 id="fw-requests-mine" className="text-lg font-semibold">
              {t('fw.requests.mine')}
            </h2>
            {mine.length === 0 ? <p>{t('fw.requests.mineEmpty')}</p> : <ul className="flex flex-col gap-2">{mine.map((i) => row(i, ['withdraw']))}</ul>}
          </section>
          {list.hasNextPage && (
            <button
              type="button"
              className="self-start rounded border px-3 py-1 text-sm"
              aria-disabled={list.isFetchingNextPage}
              onClick={() => {
                if (!list.isFetchingNextPage) void list.fetchNextPage();
              }}
              data-testid="fw-requests-more"
            >
              {t('fw.requests.loadMore')}
            </button>
          )}
        </>
      )}
      <NoticeList pariwarId={pariwarId} />
    </section>
  );
}
