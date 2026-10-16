// The Pariwar Admin's *"my workplace isn't listed"* QUEUE page — Story 6.36c (Task 5; AC3, AC7, AC8; `-330` SW9 A).
//
// Two tabs (`pending` — waiting for a suggestion; `suggested` — waiting for the member). Per request: what the member
// TYPED (⛔ who they are — the queue carries ⛔ member data), the district, the start date, how many others typed the same
// name; a SUGGEST picker that searches the LISTED workplaces of the REQUEST's district through the list GET (⚠ the
// district as LOADED — a `--rename-district` between loading and picking shows an empty picker until the queue refetches;
// recorded); and CLOSE (an entry that names ⛔ real workplace). ⭐ A suggestion decides ⛔ nothing — the member confirms.
// ⛔ An ADD control: ONLY the Super Admin adds (SW9 A). Below, the people-who-know-me campaign control (AC7).
// The server's key checks are the boundary; a step-up-required 403 holds the write (the `StepUpPanel`).

import { WORKPLACE_REVIEW_STEP_UP_CONTEXT, type WorkplaceRequestQueueItemWire } from '@twt/contracts';
import { useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useAdminWorkplaces, useCloseWorkplaceRequest, useSuggestWorkplace, useWorkplaceRequests } from '../../api/hooks.js';
import { formatIst } from '../claim-verification/NomineeDeclarationPanel.js';
import { CampaignControl } from './CampaignControl.js';
import { errorText } from './error-text.js';
import { workplaceRequestsEn as t, workplacesEn } from './i18n-en.js';
import { needsStepUp, StepUpPanel, type PendingWrite } from './StepUpPanel.js';

/** The control that currently owns the held step-up retry (fix: a DIFFERENT control's edit must not clear it). */
type RequestControl = 'suggest' | 'close';

function Picker({ pariwarId, district, onPick, onCancel, busy }: { pariwarId: string; district: string; onPick: (workplaceId: string) => void; onCancel: () => void; busy: boolean }): ReactElement {
  const [q, setQ] = useState('');
  const results = useAdminWorkplaces(pariwarId, { district, status: 'listed', ...(q.trim() !== '' ? { q: q.trim() } : {}), limit: 20 });
  return (
    <div className="flex flex-col gap-2 rounded border p-2" data-testid="suggest-picker">
      <label className="flex flex-col text-xs">
        {t.pickerSearch}
        <input className="rounded border px-2 py-1 text-sm" value={q} onChange={(e) => setQ(e.target.value)} data-testid="suggest-picker-q" />
      </label>
      <p className="text-xs opacity-70">{t.pickerNote}</p>
      {results.isLoading ? <p className="text-xs" role="status">{t.pickerLoading}</p> : null}
      {results.isError ? (
        <p className="text-xs" role="alert">
          {errorText(results.error, workplacesEn.errors, { forbidden: t.forbidden, generic: t.pickerLoadError })}
        </p>
      ) : null}
      {results.data ? (
        results.data.items.length === 0 ? (
          <p className="text-xs">{t.pickerEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {results.data.items.map((w) => (
              <li key={w.workplaceId} className="flex items-center gap-2 text-sm">
                <span>
                  {w.name} · {workplacesEn.kind[w.kind]}
                  {w.villageName ? ` · ${w.villageName}` : ''}
                </span>
                <button type="button" className="text-xs underline" disabled={busy} onClick={() => onPick(w.workplaceId)} data-testid={`suggest-pick-${w.workplaceId}`}>
                  {t.suggestThis}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {results.data?.hasMore ? <p className="text-xs opacity-70">{t.pickerMore}</p> : null}
      <button type="button" className="w-fit text-xs underline" onClick={onCancel}>
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
  busy,
}: {
  pariwarId: string;
  item: WorkplaceRequestQueueItemWire;
  picking: boolean;
  onStartPicking: () => void;
  onStopPicking: () => void;
  onSuggest: (workplaceId: string) => void;
  onClose: () => void;
  busy: boolean;
}): ReactElement {
  return (
    <li className="flex flex-col gap-1 rounded border p-2 text-sm" data-testid={`request-${item.requestId}`}>
      <span className="font-medium">{item.typedName !== null ? t.typed(item.typedName) : t.typedErased}</span>
      <span className="text-xs">{item.typedPlace !== null ? t.place(item.typedPlace) : t.typedPlaceErased}</span>
      <span className="text-xs">{t.district(item.district)}</span>
      <span className="text-xs">{t.started(item.startedOn)}</span>
      <span className="text-xs opacity-70">{t.received(formatIst(item.createdAt))}</span>
      {item.sameNameCount > 0 ? <span className="text-xs" data-testid={`request-same-${item.requestId}`}>{t.sameName(item.sameNameCount)}</span> : null}
      {item.suggested !== null ? <span className="text-xs">{t.suggestedAs(item.suggested.name)}</span> : null}
      <div className="flex gap-3">
        {item.state === 'pending' && !picking ? (
          <button type="button" className="text-xs underline" onClick={onStartPicking} data-testid={`request-suggest-${item.requestId}`}>
            {t.suggest}
          </button>
        ) : null}
        <button type="button" className="text-xs underline" disabled={busy} onClick={onClose} data-testid={`request-close-${item.requestId}`}>
          {t.close}
        </button>
      </div>
      {picking ? <Picker pariwarId={pariwarId} district={item.district} onPick={onSuggest} onCancel={onStopPicking} busy={busy} /> : null}
    </li>
  );
}

export function WorkplaceRequestsPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const [state, setState] = useState<'pending' | 'suggested'>('pending');
  const [district, setDistrict] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const queue = useWorkplaceRequests(pariwarId, {
    state,
    ...(district.trim() !== '' ? { district: district.trim() } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
  });
  const suggest = useSuggestWorkplace(pariwarId);
  const close = useCloseWorkplaceRequest(pariwarId);
  const [picking, setPicking] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingWrite<RequestControl>>(null);

  const resetWrites = (): void => {
    suggest.reset();
    close.reset();
  };
  const hold = (owner: RequestControl, retry: () => void) => (err: unknown) => {
    if (needsStepUp(err)) setPending({ owner, retry });
  };
  const runSuggest = (requestId: string, workplaceId: string): void => {
    resetWrites();
    suggest.mutate({ requestId, workplaceId }, { onSuccess: () => setPicking(null), onError: hold('suggest', () => runSuggest(requestId, workplaceId)) });
  };
  const runClose = (requestId: string): void => {
    resetWrites();
    close.mutate(requestId, { onSuccess: () => setPicking(null), onError: hold('close', () => runClose(requestId)) });
  };
  const switchTab = (next: 'pending' | 'suggested'): void => {
    setState(next);
    setCursor(undefined);
    setPicking(null);
    setPending(null);
    // A previous write's "Saved."/error banner must not survive under a freshly switched tab (code review).
    resetWrites();
  };
  const setDistrictFilter = (v: string): void => {
    setDistrict(v);
    setCursor(undefined);
    // A previous write's "Saved."/error banner must not survive under a freshly filtered queue (code review).
    resetWrites();
  };
  const writeError = [suggest.error, close.error].find((e) => e && !needsStepUp(e));
  const saved = !writeError && (suggest.isSuccess || close.isSuccess);
  const busy = suggest.isPending || close.isPending;

  return (
    <div className="flex flex-col gap-4" data-testid="workplace-requests-page">
      <h2 className="text-lg font-semibold">{t.heading}</h2>
      <p className="text-sm">{t.intro}</p>
      <p className="text-xs opacity-70">{t.noMemberShown}</p>
      <p className="text-xs opacity-70">{t.onlySuperAdminAdds}</p>

      <div className="flex gap-3" role="tablist">
        {(['pending', 'suggested'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={state === s}
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
                onStopPicking={() => setPicking(null)}
                onSuggest={(workplaceId) => runSuggest(item.requestId, workplaceId)}
                onClose={() => runClose(item.requestId)}
                busy={busy}
              />
            ))}
          </ul>
        )
      ) : null}
      <div className="flex gap-3">
        {cursor !== undefined ? (
          <button type="button" className="text-sm underline" onClick={() => setCursor(undefined)}>
            {t.first}
          </button>
        ) : null}
        {queue.data?.hasMore && queue.data.nextCursor ? (
          <button type="button" className="text-sm underline" onClick={() => setCursor(queue.data!.nextCursor!)}>
            {t.next}
          </button>
        ) : null}
      </div>

      {pending ? <StepUpPanel context={WORKPLACE_REVIEW_STEP_UP_CONTEXT} pending={pending} onDone={() => setPending(null)} testId="requests-step-up" /> : null}
      {writeError ? (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="requests-write-error">
          {errorText(writeError, workplacesEn.errors, t)}
        </p>
      ) : null}
      <p role="status" className="text-sm" data-testid="requests-saved">
        {saved ? t.saved : ''}
      </p>

      <CampaignControl pariwarId={pariwarId} />
    </div>
  );
}
