// The Pariwar Admin's *"my workplace isn't listed"* QUEUE page — Story 6.36c (Task 5; AC3, AC7, AC8; `-330` SW9 A).
//
// Two tabs (`pending` — waiting for a suggestion; `suggested` — waiting for the member). Per request: what the member
// TYPED (⛔ who they are — the queue carries ⛔ member data), the district, the start date, how many others typed the same
// name; a SUGGEST picker that searches the LISTED workplaces of the REQUEST's district through the list GET (⚠ the
// district as LOADED — a `--rename-district` between loading and picking shows an empty picker until the queue refetches;
// recorded); and CLOSE (an entry that names ⛔ real workplace). ⭐ A suggestion decides ⛔ nothing — the member confirms.
// ⛔ An ADD control: ONLY the Super Admin adds (SW9 A). Below, the people-who-know-me campaign control (AC7).
// The server's key checks are the boundary; a step-up-required 403 holds the write (the `StepUpPanel`).
// Code review round 2: a pending write is ⛔ ever reset; EVERY write control on the page (the campaign's too) is disabled
// while any write is in flight or a step-up retry is held; a STALE suggestion (its workplace taken off the list since —
// `staleSuggestion`, read-time, the decision's option A) reads as pending, with a line saying so, and can be suggested again.

import { WORKPLACE_REVIEW_STEP_UP_CONTEXT, WORKPLACE_SEARCH_TEXT_MAX_WIRE, type WorkplaceRequestQueueItemWire } from '@twt/contracts';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useAdminWorkplaces, useCloseWorkplaceRequest, useSuggestWorkplace, useWorkplaceRequests, useWorkplaceWriting } from '../../api/hooks.js';
import { formatIst } from '../claim-verification/NomineeDeclarationPanel.js';
import { CampaignControl } from './CampaignControl.js';
import { errorText } from './error-text.js';
import { stepUpEn, workplaceRequestsEn as t, workplacesEn } from './i18n-en.js';
import { WORKPLACE_DISTRICT_INPUT_MAX } from './input-bounds.js';
import { holdKey, holdOnce, needsStepUp, StepUpPanel, useHoldGenerations, type HoldSnapshot, type PendingWrite } from './StepUpPanel.js';
import { useDebouncedValue } from './use-debounced-value.js';

/** The control that currently owns the held step-up retry (fix: a DIFFERENT control's edit must not clear it). */
type RequestControl = 'suggest' | 'close';

function Picker({ pariwarId, district, onPick, onCancel, locked }: { pariwarId: string; district: string; onPick: (workplaceId: string, name: string) => void; onCancel: () => void; locked: boolean }): ReactElement {
  const [q, setQ] = useState('');
  // Settled before it reaches the server (code review round 2 — one GET and one `list_read` audit line per pause).
  const settledQ = useDebouncedValue(q);
  const results = useAdminWorkplaces(pariwarId, { district, status: 'listed', ...(settledQ.trim() !== '' ? { q: settledQ.trim() } : {}), limit: 20 });
  // ONE persistent status region, its TEXT changing (code review round 2, family 13 (d)): the empty / results / "more"
  // states used to mount as plain text, which a screen reader does ⛔ not announce.
  const status = results.isLoading
    ? t.pickerLoading
    : results.data
      ? results.data.items.length === 0
        ? t.pickerEmpty
        : `${t.pickerResults(results.data.items.length)}${results.data.hasMore ? ` ${t.pickerMore}` : ''}`
      : '';
  return (
    <div className="flex flex-col gap-2 rounded border p-2" data-testid="suggest-picker">
      <label className="flex flex-col text-xs">
        {t.pickerSearch}
        <input
          className="rounded border px-2 py-1 text-sm"
          value={q}
          maxLength={WORKPLACE_SEARCH_TEXT_MAX_WIRE}
          onChange={(e) => setQ(e.target.value)}
          data-testid="suggest-picker-q"
        />
      </label>
      <p className="text-xs opacity-70">{t.pickerNote}</p>
      <p className="text-xs" role="status" data-testid="suggest-picker-status">
        {status}
      </p>
      {results.isError ? (
        <p className="text-xs" role="alert">
          {errorText(results.error, workplacesEn.errors, { forbidden: t.forbidden, generic: t.pickerLoadError, validation: t.validation })}
        </p>
      ) : null}
      {results.data && results.data.items.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {results.data.items.map((w) => (
            <li key={w.workplaceId} className="flex items-center gap-2 text-sm">
              <span>
                {w.name} · {workplacesEn.kind[w.kind]}
                {w.villageName ? ` · ${w.villageName}` : ''}
              </span>
              <button type="button" className="text-xs underline disabled:opacity-50" disabled={locked} onClick={() => onPick(w.workplaceId, w.name)} data-testid={`suggest-pick-${w.workplaceId}`}>
                {t.suggestThis}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {/* Cancel also drops a held suggestion for this request (code review round 2) — ⛔ a later verify sending it. */}
      <button type="button" className="w-fit text-xs underline" onClick={onCancel} data-testid="suggest-picker-cancel">
        {t.cancel}
      </button>
    </div>
  );
}

function RequestCard({
  pariwarId,
  item,
  picking,
  onStartPicking,
  onStopPicking,
  onSuggest,
  onClose,
  locked,
}: {
  pariwarId: string;
  item: WorkplaceRequestQueueItemWire;
  picking: boolean;
  onStartPicking: () => void;
  onStopPicking: () => void;
  onSuggest: (workplaceId: string, name: string) => void;
  onClose: () => void;
  /** Any write in flight or a step-up retry held (code review round 2). */
  locked: boolean;
}): ReactElement {
  // A STALE suggestion reads as pending (`suggested: null`) and is suggestable again (code review round 2).
  const suggestable = item.state === 'pending' || item.staleSuggestion;
  return (
    <li className="flex flex-col gap-1 rounded border p-2 text-sm" data-testid={`request-${item.requestId}`}>
      <span className="font-medium">{item.typedName !== null ? t.typed(item.typedName) : t.typedErased}</span>
      <span className="text-xs">{item.typedPlace !== null ? t.place(item.typedPlace) : t.typedPlaceErased}</span>
      <span className="text-xs">{t.district(item.district)}</span>
      <span className="text-xs">{t.started(item.startedOn)}</span>
      <span className="text-xs opacity-70">{t.received(formatIst(item.createdAt))}</span>
      {item.sameNameCount > 0 ? <span className="text-xs" data-testid={`request-same-${item.requestId}`}>{t.sameName(item.sameNameCount)}</span> : null}
      {item.suggested !== null ? <span className="text-xs">{t.suggestedAs(item.suggested.name)}</span> : null}
      {item.staleSuggestion ? (
        <span className="text-xs font-medium" data-testid={`request-stale-${item.requestId}`}>
          {t.staleSuggestion}
        </span>
      ) : null}
      <div className="flex gap-3">
        {suggestable && !picking ? (
          <button type="button" className="text-xs underline disabled:opacity-50" disabled={locked} onClick={onStartPicking} data-testid={`request-suggest-${item.requestId}`}>
            {t.suggest}
          </button>
        ) : null}
        <button type="button" className="text-xs underline disabled:opacity-50" disabled={locked} onClick={onClose} data-testid={`request-close-${item.requestId}`}>
          {t.close}
        </button>
      </div>
      {picking ? <Picker pariwarId={pariwarId} district={item.district} onPick={onSuggest} onCancel={onStopPicking} locked={locked} /> : null}
    </li>
  );
}

export function WorkplaceRequestsPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const [state, setState] = useState<'pending' | 'suggested'>('pending');
  const [district, setDistrict] = useState('');
  // Settled before it reaches the server (code review round 2).
  const settledDistrict = useDebouncedValue(district);
  // The cursor belongs to the tab and the SETTLED district it was paged under (code review round 2) — a change reads
  // as page 1 in the same render, ⛔ a reset on the raw keystroke.
  const filterKey = JSON.stringify([state, settledDistrict.trim()]);
  const [page, setPage] = useState<{ filterKey: string; cursor: string | undefined }>({ filterKey, cursor: undefined });
  const cursor = page.filterKey === filterKey ? page.cursor : undefined;
  // FORGET the page once the settled filter moves (code review round 2): `page` was written only by paging, so going
  // back to an earlier filter or tab brought its old page back. The read above still says page 1 in the SAME render
  // (⛔ an extra GET); this drops the stale cursor for good.
  useEffect(() => setPage((p) => (p.filterKey === filterKey ? p : { filterKey, cursor: undefined })), [filterKey]);
  const queue = useWorkplaceRequests(pariwarId, {
    state,
    ...(settledDistrict.trim() !== '' ? { district: settledDistrict.trim() } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
  });
  const suggest = useSuggestWorkplace(pariwarId);
  const close = useCloseWorkplaceRequest(pariwarId);
  const [picking, setPicking] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingWrite<RequestControl>>(null);
  const holdSeq = useRef(0);
  const gens = useHoldGenerations();
  // ANY write of this page — the campaign control's Start / End included (one mutation key) — locks every write
  // control, as a held step-up retry does (code review round 2).
  const writing = useWorkplaceWriting(pariwarId) || suggest.isPending || close.isPending;
  const locked = writing || pending !== null;

  /** ⛔ Never reset a PENDING mutation (code review round 2 — see `WorkplacesPage`'s `resetSettled`). */
  const resetSettled = (): void => {
    for (const m of [suggest, close]) if (!m.isPending) m.reset();
  };
  /**
   * A page-wide back-out (a tab switch, the district filter): the held retry is dropped, and EVERY generation moves, so a
   * write still IN FLIGHT raises ⛔ panel when its 403 lands (code review round 2).
   */
  const clearStepUp = (): void => {
    gens.bumpAll();
    setPending(null);
  };
  /**
   * Hold a step-up-refused write — ONLY if nothing backed out of it since the click (`snap`, code review round 2): the
   * picker's Cancel, a tab switch or the district filter made while it was in flight leave ⛔ panel for it.
   */
  const hold = (owner: RequestControl, label: string, retry: () => void, snap: HoldSnapshot, requestId: string) => (err: unknown) => {
    if (!needsStepUp(err) || !gens.isCurrent(snap)) return;
    setPending(holdOnce({ owner, target: requestId, id: ++holdSeq.current, label, retry }));
  };
  const runSuggest = (requestId: string, workplaceId: string, name: string): void => {
    resetSettled();
    const snap = gens.snapshot('suggest', requestId);
    suggest.mutate(
      { requestId, workplaceId },
      { onSuccess: () => setPicking(null), onError: hold('suggest', stepUpEn.held.suggest(name), () => runSuggest(requestId, workplaceId, name), snap, requestId) },
    );
  };
  const runClose = (requestId: string, typedName: string | null): void => {
    resetSettled();
    const snap = gens.snapshot('close', requestId);
    close.mutate(requestId, { onSuccess: () => setPicking(null), onError: hold('close', stepUpEn.held.close(typedName), () => runClose(requestId, typedName), snap, requestId) });
  };
  const stopPicking = (requestId: string): void => {
    setPicking(null);
    // The picker's Cancel takes back a suggestion still waiting on its code — or still in flight (code review round 2).
    gens.bump('suggest', requestId);
    setPending((p) => (p !== null && p.owner === 'suggest' && p.target === requestId ? null : p));
  };
  const switchTab = (next: 'pending' | 'suggested'): void => {
    setState(next);
    setPicking(null);
    clearStepUp();
    // A previous write's "Saved."/error banner must not survive under a freshly switched tab (code review).
    resetSettled();
  };
  const setDistrictFilter = (v: string): void => {
    setDistrict(v);
    // The district filter backs out of a held or in-flight write (code review round 2 — the requests on screen, and so
    // the picker's district, change under it), and a previous write's "Saved." / error banner must not survive under a
    // freshly filtered queue (code review).
    clearStepUp();
    resetSettled();
  };
  /** Paging keeps a held retry (code review round 2 — it changes ⛔ what the retry would send). */
  const goToPage = (next: string | undefined): void => setPage({ filterKey, cursor: next });
  const writeError = [suggest.error, close.error].find((e) => e && !needsStepUp(e));
  const saved = !writeError && (suggest.isSuccess || close.isSuccess);

  return (
    <div className="flex flex-col gap-4" data-testid="workplace-requests-page">
      <h2 className="text-lg font-semibold">{t.heading}</h2>
      <p className="text-sm">{t.intro}</p>
      <p className="text-xs opacity-70">{t.noMemberShown}</p>
      <p className="text-xs opacity-70">{t.onlySuperAdminAdds}</p>

      {/* Plain pressed buttons (code review round 2, family 13 (d)) — the admin app's `aria-pressed` convention
          (ModerationStrip, VerificationDecisionStrip): a `role="tab"` without its `tabpanel`, `aria-controls` and arrow
          keys was half a tab widget. */}
      <div className="flex gap-3" role="group" aria-label={t.tabsLabel}>
        {(['pending', 'suggested'] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={state === s}
            className={`text-sm ${state === s ? 'font-semibold underline' : ''}`}
            onClick={() => switchTab(s)}
            data-testid={`requests-tab-${s}`}
          >
            {t.tabs[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3" data-testid="requests-filters">
        <label className="flex flex-col text-xs">
          {t.filters.district}
          <input
            className="rounded border px-2 py-1 text-sm"
            value={district}
            maxLength={WORKPLACE_DISTRICT_INPUT_MAX}
            onChange={(e) => setDistrictFilter(e.target.value)}
            data-testid="requests-filter-district"
          />
        </label>
      </div>

      {queue.isLoading ? <p role="status">{t.loading}</p> : null}
      {queue.isError && !queue.data ? (
        <p role="alert" data-testid="requests-load-error">
          {queue.error instanceof ApiError && queue.error.isForbidden ? t.forbidden : t.loadError}
        </p>
      ) : null}
      {queue.data ? (
        queue.data.items.length === 0 ? (
          <p className="text-sm opacity-70" data-testid="requests-empty">
            {t.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="requests-list">
            {queue.data.items.map((item) => (
              <RequestCard
                key={item.requestId}
                pariwarId={pariwarId}
                item={item}
                picking={picking === item.requestId}
                onStartPicking={() => setPicking(item.requestId)}
                onStopPicking={() => stopPicking(item.requestId)}
                onSuggest={(workplaceId, name) => runSuggest(item.requestId, workplaceId, name)}
                onClose={() => runClose(item.requestId, item.typedName)}
                locked={locked}
              />
            ))}
          </ul>
        )
      ) : null}
      <div className="flex gap-3">
        {cursor !== undefined ? (
          <button type="button" className="text-sm underline" onClick={() => goToPage(undefined)}>
            {t.first}
          </button>
        ) : null}
        {/* ⛔ While the PREVIOUS filter's page is on screen (`placeholderData`): its cursor belongs to that filter. */}
        {queue.data?.hasMore && queue.data.nextCursor && !queue.isPlaceholderData ? (
          <button type="button" className="text-sm underline" onClick={() => goToPage(queue.data!.nextCursor!)} data-testid="requests-next">
            {t.next}
          </button>
        ) : null}
      </div>

      {pending ? (
        <StepUpPanel key={holdKey(pending)} context={WORKPLACE_REVIEW_STEP_UP_CONTEXT} pending={pending} onDone={clearStepUp} onCancel={clearStepUp} testId="requests-step-up" />
      ) : null}
      {writeError ? (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="requests-write-error">
          {errorText(writeError, workplacesEn.errors, t)}
        </p>
      ) : null}
      <p role="status" className="text-sm" data-testid="requests-saved">
        {saved ? t.saved : ''}
      </p>

      {/* `held` — a step-up retry held here locks the campaign's writes too (code review round 2). */}
      <CampaignControl pariwarId={pariwarId} held={pending !== null} />
    </div>
  );
}
