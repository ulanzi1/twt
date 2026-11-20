// The Appeals page — Story 13.1f (AC12; AD7, AD9, AD13, AD14; decision `2026-11-16-464`; the Panel's `2026-11-17-465`).
//
// Two lists. "Appeals": the appeals against endings this officer may read (a Trustee Panel reader sees only those the Panel hears — the
// server's rule), filtered by state, each with its hearer, dates and — for an open one — the hearer's Allow / Refuse / Withdrawn acts
// (`AppealActions`). "Record an appeal": the ended workers this officer can record an appeal for (the server's eligible list — the only
// way a Trustee Panel holder, who cannot open Find a worker, reaches a worker), each with its own lodge form (the day the worker appealed,
// by phone or in person). Both lists DECRYPT the workers' names behind an audit line a page (`gcTime: 0` — see the hooks). ⛔ Client-side
// role gating: the server decides who may act, and its 403 / 409 lines are shown. No grounds or notes are typed — what the worker said
// stays with the officer (13.1 QE12). Each form is keyed by its worker or appeal id (13.1d CR48), so one never inherits another's state.

import type { FieldWorkerEndingAppealState } from '@twt/contracts';
import { FIELD_WORKER_ENDING_APPEAL_STATES } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import { useAppealEligibleFieldWorkers, useFieldWorkerEndingAppeals } from '../../api/hooks.js';
import { focusIfUnclaimed } from '../marketplace/focus.js';
import { AppealActions } from './AppealActions.js';
import { DistrictPicker } from './DistrictPicker.js';
import { LodgeAppealForm } from './LodgeAppealForm.js';
import { FieldWorkerNav } from './FieldWorkerNav.js';
import { fieldWorkerGuidance, formatIstDate, reasonLabel } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export function AppealsPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const [state, setState] = useState<FieldWorkerEndingAppealState | null>('open');
  const [district, setDistrict] = useState<string | null>(null);
  const appeals = useFieldWorkerEndingAppeals(pariwarId, state, district);
  const [recording, setRecording] = useState(false);
  /**
   * The last act's outcome (a decision, a withdrawal, a lodge) — said HERE, in a status region mounted with the page: the act's own row
   * leaves its list on the refresh (a decided appeal is no longer "waiting"; a lodged worker is no longer eligible), so a line inside it
   * would never be seen (browser pass 2026-11-17).
   */
  const [outcome, setOutcome] = useState<string | null>(null);
  /**
   * A STALE refusal of an act (an appeal another officer already decided, a worker whose ending changed, an appeal that appeared) — said HERE
   * for the same reason as `outcome`, and more so: the refusal's own refresh removes or re-keys the row or form that raised it, and a line
   * kept inside it was destroyed within a round trip, so the row simply vanished, as after a success (code review round 2, chunk D: R2D-2).
   */
  const [stale, setStale] = useState<string | null>(null);
  const eligible = useAppealEligibleFieldWorkers(pariwarId, recording, district);
  const [moreNotice, setMoreNotice] = useState<string | null>(null);
  const [moreAppealsNotice, setMoreAppealsNotice] = useState<string | null>(null);
  const loadSeq = useRef(0);
  const appealsSeq = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const eligibleListRef = useRef<HTMLUListElement>(null);
  const recordTitleRef = useRef<HTMLHeadingElement>(null);
  const recordSectionRef = useRef<HTMLElement>(null);
  /** An act finished: say it here, and take focus to the page unless the officer has gone elsewhere (the pressed control unmounts with its row). */
  const finish = (line: string): void => {
    setStale(null);
    setOutcome(line);
    focusIfUnclaimed(headingRef.current, listRef.current, eligibleListRef.current);
  };
  /**
   * A stale refusal reached the page: say it here AND take focus the way `finish` does. The refresh that follows removes the row (or the
   * eligible candidate) whose button held focus, and nothing moved it, so a keyboard user fell to `<body>` (browser pass 2026-11-20, F1).
   * `target` and `owners` are the same pair the matching success path hands to `focusIfUnclaimed`.
   */
  const refused = (line: string, target: HTMLElement | null, ...owners: (Element | null)[]): void => {
    setStale(line);
    focusIfUnclaimed(target, ...owners);
  };
  const listProblem = appeals.isError ? fieldWorkerGuidance(appeals.error, 'appeals') : null;
  const eligibleProblem = eligible.isError ? fieldWorkerGuidance(eligible.error, 'appeals') : null;
  useSignInRedirect(listProblem?.signIn === true || eligibleProblem?.signIn === true);
  const items = appeals.data?.pages.flatMap((p) => p.items) ?? [];
  const candidates = eligible.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="flex max-w-3xl flex-col gap-4 p-4" data-testid="fw-appeals-page">
      <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">{t('fw.appeals.title')}</h1>
      <FieldWorkerNav pariwarId={pariwarId} current="appeals" />
      <p className="text-sm">{t('fw.appeals.intro')}</p>
      <div role="status" data-testid="fw-appeals-outcome">
        {outcome !== null && <p className="text-sm text-status-ok-fg">{outcome}</p>}
      </div>
      {/* Mounted EMPTY, so a refusal arrives into a live region (it is heard), and it outlives the row the refusal's refresh removes. */}
      <div role="alert" data-testid="fw-appeals-stale">
        {stale !== null && <p className="text-sm text-status-fail-fg">{stale}</p>}
      </div>

      <DistrictPicker pariwarId={pariwarId} value={district} allowAll testId="fw-appeals-district" onChange={(d) => { loadSeq.current += 1; appealsSeq.current += 1; setDistrict(d); setRecording(false); setOutcome(null); setStale(null); setMoreNotice(null); setMoreAppealsNotice(null); }} />
      <label className="flex items-center gap-2 text-sm">
        {t('fw.appeals.filter')}
        <select value={state ?? ''} onChange={(e) => setState(e.target.value === '' ? null : (e.target.value as FieldWorkerEndingAppealState))} data-testid="fw-appeals-filter">
          <option value="">{t('fw.appeals.filter.all')}</option>
          {FIELD_WORKER_ENDING_APPEAL_STATES.map((s) => (
            <option key={s} value={s}>
              {t(`fw.appeals.state.${s}`)}
            </option>
          ))}
        </select>
      </label>

      <div role="status">
        {appeals.isPending && <p className="text-sm">{t('fw.loading')}</p>}
        {appeals.isSuccess && <p className="sr-only">{t(items.length === 0 ? 'fw.appeals.recordsNone' : items.length === 1 ? 'fw.appeals.recordsOne' : 'fw.appeals.recordsLoaded', { count: items.length })}</p>}
      </div>
      {listProblem !== null && (
        <div role="alert" className="flex flex-col gap-1 text-sm text-status-fail-fg">
          <p data-testid="fw-appeals-error">{listProblem.text}</p>
          {/* The sibling lists offer "Try again" when trying again can help (R2D-12). Focus first: the refetch unmounts this alert with the button. */}
          {listProblem.retryable === true && (
            <button type="button" className="self-start underline" onClick={() => { headingRef.current?.focus(); void appeals.refetch(); }} data-testid="fw-appeals-retry">
              {t('fw.retry')}
            </button>
          )}
        </div>
      )}
      {appeals.isSuccess && items.length === 0 && <p className="text-sm" data-testid="fw-appeals-empty">{t('fw.appeals.empty')}</p>}
      {items.length > 0 && (
        <ul ref={listRef} className="flex flex-col gap-2" data-testid="fw-appeals-list">
          {items.map((a) => (
            <li key={a.appeal_id} className="flex flex-col gap-1 rounded border p-2 text-sm" data-testid="fw-appeal-item">
              <p className="font-medium">
                {a.name} · {a.district}
              </p>
              <p>
                {t(`fw.appeals.state.${a.state}`)} · {t(`fw.appeals.heardBy.${a.heard_by}`)}
              </p>
              <p>{t('fw.appeals.received', { date: formatIstDate(a.received_on), via: t(`fw.appeals.via.${a.received_via}`) })}</p>
              {a.decided_on !== null && <p>{t('fw.appeals.decided', { date: formatIstDate(a.decided_on) })}</p>}
              {a.state === 'open' && <AppealActions key={a.appeal_id} pariwarId={pariwarId} appeal={a} name={a.name} onDone={finish} onStale={(line) => refused(line, headingRef.current, listRef.current, eligibleListRef.current)} onAttempt={() => setStale(null)} />}
            </li>
          ))}
        </ul>
      )}
      {/* "Load more" keeps focus while it loads, says what arrived, and hands focus on when it was the last page — as the eligible list below (R2D-11). */}
      <div role="status" data-testid="fw-appeals-more-status">{moreAppealsNotice}</div>
      {appeals.hasNextPage && (
        <button
          type="button"
          className="self-start text-sm underline"
          aria-disabled={appeals.fetchStatus !== 'idle' || undefined}
          data-testid="fw-appeals-more"
          onClick={(e) => {
            if (appeals.fetchStatus !== 'idle') return;
            const pressed = e.currentTarget;
            const seq = ++appealsSeq.current;
            const before = appeals.data?.pages.length ?? 0;
            setMoreAppealsNotice(null);
            void appeals.fetchNextPage().then((r) => {
              if (r.isError || seq !== appealsSeq.current || (r.data?.pages.length ?? 0) <= before) return;
              const count = r.data?.pages.at(-1)?.items.length ?? 0;
              setMoreAppealsNotice(t(count === 1 ? 'fw.appeals.moreOne' : 'fw.appeals.more', { count }));
              if (!r.hasNextPage) focusIfUnclaimed(headingRef.current, pressed);
            });
          }}
        >
          {t('fw.history.more')}
        </button>
      )}

      <section ref={recordSectionRef} className="flex flex-col gap-2 border-t pt-2" aria-labelledby="fw-appeals-record-title">
        <h2 id="fw-appeals-record-title" ref={recordTitleRef} tabIndex={-1} className="font-medium">
          {t('fw.appeals.record')}
        </h2>
        {!recording ? (
          <button type="button" className="self-start rounded border px-3 py-1 text-sm" onClick={() => { recordTitleRef.current?.focus(); setRecording(true); }} data-testid="fw-appeals-record-open">
            {t('fw.appeals.record')}
          </button>
        ) : (
          <>
            {eligible.isPending && <p className="text-sm">{t('fw.loading')}</p>}
            {eligibleProblem !== null && (
              <div role="alert" className="flex flex-col gap-1 text-sm text-status-fail-fg">
                <p data-testid="fw-appeals-eligible-error">{eligibleProblem.text}</p>
                {/* "Record an appeal" is hidden while recording, so without this the only way back was the district picker (R2D-12). */}
                {eligibleProblem.retryable === true && (
                  <button type="button" className="self-start underline" onClick={() => { recordTitleRef.current?.focus(); void eligible.refetch(); }} data-testid="fw-appeals-eligible-retry">
                    {t('fw.retry')}
                  </button>
                )}
              </div>
            )}
            {eligible.isSuccess && candidates.length === 0 && <p className="text-sm" data-testid="fw-appeals-eligible-empty">{t('fw.appeals.eligible.empty')}</p>}
            <ul ref={eligibleListRef} className="flex flex-col gap-2" data-testid="fw-appeals-eligible">
              {candidates.map((c) => (
                <li key={`${c.field_worker_id}:${String(c.ending_event_version)}`} className="flex flex-col gap-1 rounded border p-2 text-sm" data-testid="fw-appeals-eligible-item">
                  <p className="font-medium">{c.display_name} · {c.district}</p>
                  <p>{t('fw.appeals.endedOn', { date: formatIstDate(c.ended_on), reason: reasonLabel(c.reason_code) })} · {t(`fw.appeals.heardBy.${c.heard_by}`)}</p>
                  <LodgeAppealForm
                    pariwarId={pariwarId}
                    fieldWorkerId={c.field_worker_id}
                    endingVersion={c.ending_event_version}
                    heardBy={c.heard_by}
                    name={c.display_name}
                    onAttempt={() => setStale(null)}
                    onStale={(line) => refused(line, recordTitleRef.current, recordSectionRef.current)}
                    onLodged={() => { setStale(null); setOutcome(t('fw.appeals.lodgedFor', { name: c.display_name })); focusIfUnclaimed(recordTitleRef.current, recordSectionRef.current); }}
                  />
                </li>
              ))}
            </ul>
            <div role="status" data-testid="fw-appeals-eligible-status">{moreNotice}</div>
            {eligible.hasNextPage && (
              <button type="button" className="self-start text-sm underline" aria-disabled={eligible.fetchStatus !== 'idle'} data-testid="fw-appeals-eligible-more" onClick={(e) => {
                if (eligible.fetchStatus !== 'idle') return;
                const pressed = e.currentTarget;
                const seq = ++loadSeq.current;
                const before = eligible.data?.pages.length ?? 0;
                setMoreNotice(null);
                void eligible.fetchNextPage().then((r) => {
                  if (r.isError || seq !== loadSeq.current || (r.data?.pages.length ?? 0) <= before) return;
                  const count = r.data?.pages.at(-1)?.items.length ?? 0;
                  setMoreNotice(t(count === 1 ? 'fw.appeals.moreCandidateOne' : 'fw.appeals.moreCandidates', { count }));
                  if (!r.hasNextPage) focusIfUnclaimed(recordTitleRef.current, pressed);
                });
              }}>{t('fw.history.more')}</button>
            )}
          </>
        )}
      </section>
    </section>
  );
}
