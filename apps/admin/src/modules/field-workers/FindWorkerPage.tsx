// Find a worker and show their code — Story 13.1a (AC11 (c); AD8, AD13; `-448`, review CR1). An explicit district choice with NO
// default — nothing loads until one is chosen (a District Admin must name a district they hold; the server's 403 says so otherwise) —
// then the `active` workers of that district, each with "Check details". It opens the audited identity panel (`WorkerDetail`: name,
// FULL mobile, district, state, who registered and who approved the worker), so two workers of one name can be told apart BEFORE a
// code is read out. "Show code" (`CodeReveal`) is rendered ONLY inside that panel, once the identity has loaded: ⛔ never in a row,
// never before a panel is open and loaded.
// ONE panel is open at a time: "Check details" on another worker replaces it (the old one unmounts, which clears its code and drops
// any answer still in flight), and a change of district closes it. The identity is removed from the client by the handlers that
// close, replace or drop the panel (`forget` / the Close button) — ⛔ not by an effect cleanup (review CR2) — and Close puts focus
// back on the row's "Check details".
// The list is mounted from the start (a disabled query shows nothing but its always-mounted status region), so the first district
// choice is announced like every later one (review CR10).

import { useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import { fieldWorkerIdentityKey, useFieldWorkers } from '../../api/hooks.js';
import { CodeReveal } from './CodeReveal.js';
import { DistrictPicker } from './DistrictPicker.js';
import { FieldWorkerNav } from './FieldWorkerNav.js';
import { WorkerDetail } from './WorkerDetail.js';
import { WorkerList } from './WorkerList.js';
import { resolveEn as t } from './i18n-en.js';

export function FindWorkerPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const qc = useQueryClient();
  const [district, setDistrict] = useState<string | null>(null);
  const [open, setOpenState] = useState<string | null>(null);
  const list = useFieldWorkers(pariwarId, 'active', district, district !== null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  // The panel open NOW — the handlers compare against this, not against the render they were created in.
  const openRef = useRef<string | null>(null);
  const checkButtons = useRef(new Map<string, HTMLElement>());

  const setOpen = (id: string | null): void => {
    openRef.current = id;
    setOpenState(id);
  };
  /** No decrypted identity outlives its panel: the explicit removal (the hook's `gcTime: 0` is only the backstop). */
  const forget = (id: string | null): void => {
    if (id !== null) qc.removeQueries({ queryKey: fieldWorkerIdentityKey(pariwarId, id) });
  };
  // The Close button (WorkerDetail) has already removed the identity; the page puts focus back where the admin pressed Check details.
  const closePanel = (): void => {
    const was = openRef.current;
    setOpen(null);
    // The row may have left the list while the panel was open (review CR46).
    if (was !== null) (checkButtons.current.get(was) ?? listHeadingRef.current)?.focus();
  };

  return (
    <section className="flex max-w-4xl flex-col gap-4 p-4" data-testid="fw-find-page">
      <h1 className="text-xl font-semibold">
        {t('fw.find.title')}
      </h1>
      <FieldWorkerNav pariwarId={pariwarId} current="find" />
      <p className="text-sm">{t('fw.find.intro')}</p>
      <DistrictPicker
        pariwarId={pariwarId}
        value={district}
        onChange={(d) => {
          forget(openRef.current);
          setDistrict(d);
          setOpen(null);
        }}
        testId="fw-find-district"
      />
      <h2 ref={listHeadingRef} tabIndex={-1} className="sr-only">
        {t('fw.find.title')}
      </h2>
      {district === null && <p data-testid="fw-find-choose">{t('fw.find.chooseFirst')}</p>}
      <WorkerList
        query={list}
        empty={t('fw.find.empty')}
        headingRef={listHeadingRef}
        noAccessText={t('fw.noAccessFind')}
        filterKey={JSON.stringify(district)}
        testId="fw-find-list"
        action={(item, register) => (
          <button
            type="button"
            ref={(el) => {
              register(el);
              if (el === null) checkButtons.current.delete(item.field_worker_id);
              else checkButtons.current.set(item.field_worker_id, el);
            }}
            className="rounded border px-3 py-1 text-sm"
            onClick={() => {
              // Pressed again on the worker already open: nothing to do (replacing the panel with itself would read the identity anew).
              if (openRef.current === item.field_worker_id) return;
              forget(openRef.current);
              setOpen(item.field_worker_id);
            }}
            data-testid="fw-find-check"
          >
            {t('fw.find.check')}
            <span className="sr-only"> {t('fw.forName', { name: item.name })}</span>
          </button>
        )}
      />
      {open !== null && (
        <WorkerDetail key={open} pariwarId={pariwarId} fieldWorkerId={open} surface="find" onClose={closePanel}>
          {(name) => <CodeReveal pariwarId={pariwarId} fieldWorkerId={open} workerName={name} />}
        </WorkerDetail>
      )}
    </section>
  );
}
