// The people-who-know-me CAMPAIGN control — Story 6.36c (Task 5; AC7, AC8; `-330` SW16 (5), `-342` call 1).
//
// Start a campaign (two IST dates, at most 30 days — the server's 422 / 409 have words here), end an open one (a planned
// one is cancelled), and the list. ⭐ It sends ⛔ nothing to any phone — the page says so. ⛔ Step-up (the server asks none).
// Code review round 2: Start ↔ End ⛔ ever reset a PENDING write; every control is disabled while any of the page's writes
// is in flight (one mutation key) or the page holds a step-up retry (`held`); a list GET answered 403 hides the Start form
// (a Start could only 403 too); a successful Start goes back to the first page, where the new campaign is.

import { useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useEndKnownPeopleCampaign, useKnownPeopleCampaigns, useStartKnownPeopleCampaign, useWorkplaceWriting } from '../../api/hooks.js';
import { errorText } from './error-text.js';
import { campaignEn as t } from './i18n-en.js';

export function CampaignControl({ pariwarId, held = false }: { pariwarId: string; held?: boolean }): ReactElement {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const list = useKnownPeopleCampaigns(pariwarId, { ...(cursor !== undefined ? { cursor } : {}) });
  const start = useStartKnownPeopleCampaign(pariwarId);
  const end = useEndKnownPeopleCampaign(pariwarId);
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [missing, setMissing] = useState(false);
  const writeError = start.error ?? end.error;
  const saved = !writeError && (start.isSuccess || end.isSuccess);
  const locked = useWorkplaceWriting(pariwarId) || start.isPending || end.isPending || held;
  const forbidden = list.error instanceof ApiError && list.error.isForbidden;

  return (
    <section className="flex flex-col gap-3 rounded border p-3" data-testid="campaign-control">
      <h3 className="font-semibold">{t.heading}</h3>
      <p className="text-sm">{t.intro}</p>
      {/* ⛔ The Start form when the list answered 403 (code review round 2) — a Start could only 403 too. */}
      {forbidden ? null : (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (startsOn === '' || endsOn === '') return setMissing(true);
            setMissing(false);
            // ⛔ Reset an End still in flight (code review round 2) — it would lose its outcome.
            if (!end.isPending) end.reset();
            // Back to page 1 on SUCCESS (code review round 2): the new campaign is the newest, on the first page.
            start.mutate({ startsOn, endsOn }, { onSuccess: () => setCursor(undefined) });
          }}
        >
          <label className="flex flex-col text-xs">
            {t.startsOn}
            <input
              type="date"
              className="rounded border px-2 py-1 text-sm"
              value={startsOn}
              onChange={(e) => {
                setStartsOn(e.target.value);
                setMissing(false);
              }}
              data-testid="campaign-starts-on"
            />
          </label>
          <label className="flex flex-col text-xs">
            {t.endsOn}
            <input
              type="date"
              className="rounded border px-2 py-1 text-sm"
              value={endsOn}
              onChange={(e) => {
                setEndsOn(e.target.value);
                setMissing(false);
              }}
              data-testid="campaign-ends-on"
            />
          </label>
          <button type="submit" className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50" disabled={locked} data-testid="campaign-start">
            {t.start}
          </button>
        </form>
      )}
      {missing ? (
        <p role="alert" className="text-xs text-status-fail-fg">
          {t.required}
        </p>
      ) : null}
      {writeError ? (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="campaign-write-error">
          {errorText(writeError, t.errors, t)}
        </p>
      ) : null}
      <p role="status" className="text-sm" data-testid="campaign-saved">
        {saved ? t.saved : ''}
      </p>

      <h4 className="text-sm font-semibold">{t.listHeading}</h4>
      {list.isLoading ? <p role="status">{t.loading}</p> : null}
      {list.isError && !list.data ? (
        <p role="alert" data-testid="campaign-load-error">
          {forbidden ? t.forbidden : t.loadError}
        </p>
      ) : null}
      {list.data ? (
        list.data.items.length === 0 ? (
          <p className="text-sm opacity-70">{t.empty}</p>
        ) : (
          <ul className="flex flex-col gap-1" data-testid="campaign-list">
            {list.data.items.map((c) => (
              <li key={c.campaignId} className="flex items-center gap-3 text-sm" data-testid={`campaign-${c.campaignId}`}>
                <span>{t.window(c.startsOn, c.endsOn)}</span>
                <span className="text-xs">{t.status[c.status]}</span>
                {c.status === 'live' || c.status === 'scheduled' ? (
                  <button
                    type="button"
                    className="text-xs underline"
                    disabled={locked}
                    onClick={() => {
                      // ⛔ Reset a Start still in flight (code review round 2).
                      if (!start.isPending) start.reset();
                      end.mutate(c.campaignId);
                    }}
                    data-testid={`campaign-end-${c.campaignId}`}
                  >
                    {t.end}
                  </button>
                ) : null}
              </li>
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
        {list.data?.hasMore && list.data.nextCursor ? (
          <button type="button" className="text-sm underline" onClick={() => setCursor(list.data!.nextCursor!)} data-testid="campaign-next">
            {t.next}
          </button>
        ) : null}
      </div>
    </section>
  );
}
