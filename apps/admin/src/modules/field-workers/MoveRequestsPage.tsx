// The Move requests page — Story 13.1d (AC9; AD10 as amended by decision `-460`). Sections over ONE read of the open requests:
//   (1) "Waiting for your answer" — with a district chosen: the PENDING requests whose other end (the counterpart) is that district and
//       that this officer did not open, each with Accept / Refuse; with "All districts" (a Pariwar Admin — a District Admin gets the
//       server's 403, shown as the quiet line "choose a district you manage"): "Gone to the Pariwar Admin", every ESCALATED request, with
//       Close and a link to Find a worker (settling it by a move is the worker's own Move; Find has no deep link to one worker);
//   (2) "Your requests" — the open requests this officer opened, with Withdraw (one the officer opened that is also escalated sits ONLY
//       under (1), with both Close and Withdraw — one row per request);
//   (3) "Other open requests" — every open request the server returned that is neither, View only: a colleague's, ⛔ hidden (code review CR43);
//   (4) "Notices" — the officer's own, newest first (`NoticeList`).
// The sections are filtered in the client from the pages loaded so far (the server pages newest-first, 25 a page; a request escalated by the
// sweep is at least 7 days old), so an empty section says "none of the requests loaded so far" while more pages exist, ⛔ "nothing".
// Each item names the worker (the list's read decrypts the names behind ONE audit line per page — AD10), both districts, who asked
// (their current name, or "an officer (name not recorded)") and when, and the state; "View" opens the request's detail with the
// worker's work history (`MoveRequestDetail` — its own audited read, mounted only while open). The officer is known from the session.
// ⛔ Background refetching (the module's rule): the lists refresh after an act, after a 409 that says they are stale, or on "Try again".
// A 409 that says a request moved on is said HERE, in an alert that outlives the row (CR42); an act's outcome is said in the status
// region, which takes focus because the row that held it has left the list (CR47). The sections wait for the SESSION as well as the list:
// "waiting for your answer" is every pending request the officer did NOT open, and until the officer is known their own would read as
// waiting too, with an Accept the server answers 409 `same_officer` (code review RP-14). "Load more" says how many came, "1 more request
// shown" in the singular, and says nothing for a list that is no longer on screen (RP-11, RP-12). It waits while the list is refetching,
// and says a count only when a page was ADDED: a "Load more" cancels a refetch in flight (TanStack's `cancelRefetch`) and extends the OLD
// pages, and an act's refresh cancels a "Load more" in flight and resolves it with the refetched list (code review R4-1). Each status line
// keeps its own React key, so a sixth line does not remount - and re-announce - the five before it (R4-2).

import { Link } from '@tanstack/react-router';
import type { FieldWorkerMoveRequestItem } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

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
  const [announce, setAnnounce] = useState<ReadonlyArray<{ id: number; text: string }>>([]);
  /** Each status line's own key (R4-2): a key by position shifts when the oldest line drops, and every line would remount. */
  const lineSeq = useRef(0);
  const [staleNote, setStaleNote] = useState<string | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const staleRef = useRef<HTMLDivElement>(null);
  /** Bumped by every "Load more" press and every district choice: a count said for a press that is no longer the latest is not said (RP-12). */
  const loadSeq = useRef(0);
  const list = useFieldWorkerMoveRequests(pariwarId, 'open', district);
  const listError = list.isError ? fieldWorkerGuidance(list.error) : null;
  const sessionError = session.isError ? fieldWorkerGuidance(session.error) : null;
  useSignInRedirect(listError?.signIn === true || sessionError?.signIn === true);

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const waiting =
    district === null
      ? items.filter((i) => i.state === 'escalated')
      : items.filter((i) => i.state === 'pending' && i.counterpart_district === district && i.opened_by !== me);
  const waitingIds = new Set(waiting.map((i) => i.move_request_id));
  const mine = items.filter((i) => i.opened_by === me && !waitingIds.has(i.move_request_id));
  const shownIds = new Set([...waiting, ...mine].map((i) => i.move_request_id));
  const other = items.filter((i) => !shownIds.has(i.move_request_id));
  const more = list.hasNextPage === true;

  const say = (text: string): void => {
    const id = ++lineSeq.current;
    setAnnounce((a) => [...a.slice(-4), { id, text }]);
  };
  const onDone = (text: string): void => {
    say(text);
    setStaleNote(null);
    statusRef.current?.focus(); // the row that held focus has left the list
  };
  const onStale = (text: string | null): void => {
    setStaleNote(text);
    if (text !== null) staleRef.current?.focus();
  };

  const row = (item: FieldWorkerMoveRequestItem, acts: readonly ListAct[], findLink = false): ReactElement => {
    const detailId = `fw-request-detail-${item.move_request_id}`;
    return (
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
            aria-controls={view === item.move_request_id ? detailId : undefined}
            onClick={() => setView((v) => (v === item.move_request_id ? null : item.move_request_id))}
            data-testid="fw-request-view"
          >
            {view === item.move_request_id ? t('fw.requests.hide') : t('fw.requests.view')}
            <span className="sr-only"> {t('fw.forName', { name: item.name })}</span>
          </button>
          <MoveRequestActions pariwarId={pariwarId} item={item} acts={acts} onDone={onDone} onStale={onStale} />
          {findLink && (
            <Link to="/p/$pariwarId/field-workers" params={{ pariwarId }} className="self-center text-sm underline" data-testid="fw-request-find">
              {t('fw.requests.findWorker')}
              <span className="sr-only"> {t('fw.forName', { name: item.name })}</span>
            </Link>
          )}
        </div>
        {view === item.move_request_id && <MoveRequestDetail pariwarId={pariwarId} moveRequestId={item.move_request_id} domId={detailId} />}
      </li>
    );
  };

  return (
    <section className="flex max-w-4xl flex-col gap-4 p-4" data-testid="fw-requests-page">
      <h1 className="text-xl font-semibold">{t('fw.requests.title')}</h1>
      <FieldWorkerNav pariwarId={pariwarId} current="requests" />
      <p className="text-sm">{t('fw.requests.intro')}</p>
      <div ref={statusRef} tabIndex={-1} role="status" data-testid="fw-requests-status">
        {announce.map(({ id, text }) => (
          <p key={id} className="rounded bg-status-ok-bg p-2 text-sm text-status-ok-fg" data-testid="fw-requests-announce">
            {text}
          </p>
        ))}
      </div>
      {/* Mounted EMPTY, so a request that moved on is ANNOUNCED and outlives the row that said it (AD10; CR42). */}
      <div ref={staleRef} tabIndex={-1} role="alert" data-testid="fw-requests-stale">
        {staleNote !== null && <p className="text-sm text-status-fail-fg">{staleNote}</p>}
      </div>
      <DistrictPicker
        pariwarId={pariwarId}
        value={district}
        onChange={(d) => {
          loadSeq.current += 1;
          setDistrict(d);
          setView(null);
          setStaleNote(null);
        }}
        allowAll
        testId="fw-requests-district"
      />
      {(list.isPending || session.isPending) && <p role="status">{t('fw.loading')}</p>}
      {sessionError !== null && (
        <div role="alert" className="flex flex-col gap-1 text-sm text-status-fail-fg" data-testid="fw-requests-session-error">
          <p>{sessionError.text}</p>
          <button type="button" className="self-start rounded border px-3 py-1" onClick={() => void session.refetch()}>
            {t('fw.retry')}
          </button>
        </div>
      )}
      {listError !== null &&
        (listError.noAccess === true && district === null ? (
          // A District Admin's FIRST view is the all-districts read, a Pariwar-grant-only 403 by design: a quiet hint, ⛔ an alarm on every visit.
          <p role="status" className="text-sm" data-testid="fw-requests-error">
            {t('fw.requests.noAccess')}
          </p>
        ) : (
          <div role="alert" className="flex flex-col gap-1 text-sm text-status-fail-fg" data-testid="fw-requests-error">
            <p>{listError.noAccess === true ? t('fw.requests.noAccessDistrict', { district: district ?? '' }) : listError.text}</p>
            {listError.noAccess !== true && (
              <button type="button" className="self-start rounded border px-3 py-1" onClick={() => void list.refetch()}>
                {t('fw.retry')}
              </button>
            )}
          </div>
        ))}
      {/* Rows already loaded stay when a later page or a refresh fails (TanStack keeps `data`); the error above says so. */}
      {list.data !== undefined && session.isSuccess && (
        <>
          <section aria-labelledby="fw-requests-waiting" className="flex flex-col gap-2" data-testid="fw-requests-waiting">
            <h2 id="fw-requests-waiting" className="text-lg font-semibold">
              {district === null ? t('fw.requests.escalated') : t('fw.requests.waiting')}
            </h2>
            {district === null && <p className="text-sm">{t('fw.requests.escalatedHelp')}</p>}
            {waiting.length === 0 ? (
              <p>
                {district === null
                  ? more
                    ? t('fw.requests.escalatedMore')
                    : t('fw.requests.escalatedEmpty')
                  : more
                    ? t('fw.requests.waitingMore')
                    : t('fw.requests.waitingEmpty')}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {waiting.map((i) => row(i, district === null ? (i.opened_by === me ? ['close', 'withdraw'] : ['close']) : ['accept', 'refuse'], district === null))}
              </ul>
            )}
          </section>
          <section aria-labelledby="fw-requests-mine" className="flex flex-col gap-2" data-testid="fw-requests-mine">
            <h2 id="fw-requests-mine" className="text-lg font-semibold">
              {t('fw.requests.mine')}
            </h2>
            {mine.length === 0 ? <p>{more ? t('fw.requests.mineMore') : t('fw.requests.mineEmpty')}</p> : <ul className="flex flex-col gap-2">{mine.map((i) => row(i, ['withdraw']))}</ul>}
          </section>
          {other.length > 0 && (
            <section aria-labelledby="fw-requests-other" className="flex flex-col gap-2" data-testid="fw-requests-other">
              <h2 id="fw-requests-other" className="text-lg font-semibold">
                {t('fw.requests.other')}
              </h2>
              <p className="text-sm">{t('fw.requests.otherHelp')}</p>
              <ul className="flex flex-col gap-2">{other.map((i) => row(i, []))}</ul>
            </section>
          )}
          {more && (
            <button
              type="button"
              className="self-start rounded border px-3 py-1 text-sm"
              aria-disabled={list.fetchStatus !== 'idle'}
              onClick={() => {
                // ⛔ while ANY fetch runs or waits (R4-1): a press during an act's refetch would cancel it and extend the stale pages. A refetch
                // PAUSED offline is not `isFetching` but is cancelled all the same - hence `fetchStatus` (code review R5-3).
                if (list.fetchStatus !== 'idle') return;
                const seq = ++loadSeq.current;
                const before = list.data?.pages.length ?? 0;
                void list.fetchNextPage().then((r) => {
                  // No page added - an act's refresh cancelled this one and resolved it with the refetched list: nothing came.
                  if (r.isError || seq !== loadSeq.current || (r.data?.pages.length ?? 0) <= before) return;
                  const count = r.data?.pages.at(-1)?.items.length ?? 0;
                  say(count === 1 ? t('fw.requests.moreShownOne') : t('fw.requests.moreShown', { count }));
                });
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
