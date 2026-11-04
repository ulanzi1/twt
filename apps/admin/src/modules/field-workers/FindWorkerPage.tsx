// Find a worker and show their code — Story 13.1a (AC11 (c); AD8, AD13). An explicit district choice with NO default — nothing
// loads until one is chosen (a District Admin must name a district they hold; the server's 403 says so otherwise) — then the
// `active` workers of that district, each with "Show code" (`CodeReveal`): asking for another worker's code makes that reveal the
// current one, and every other reveal clears its code and drops any answer still in flight.

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import { useFieldWorkers } from '../../api/hooks.js';
import { CodeReveal } from './CodeReveal.js';
import { DistrictPicker } from './DistrictPicker.js';
import { FieldWorkerNav } from './FieldWorkerNav.js';
import { WorkerList } from './WorkerList.js';
import { resolveEn as t } from './i18n-en.js';

export function FindWorkerPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const [district, setDistrict] = useState<string | null>(null);
  const [revealFor, setRevealFor] = useState<string | null>(null);
  const list = useFieldWorkers(pariwarId, 'active', district, district !== null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);

  return (
    <section className="flex max-w-4xl flex-col gap-4 p-4" data-testid="fw-find-page">
      <h1 tabIndex={-1} className="text-xl font-semibold outline-none">
        {t('fw.find.title')}
      </h1>
      <FieldWorkerNav pariwarId={pariwarId} current="find" />
      <p className="text-sm">{t('fw.find.intro')}</p>
      <DistrictPicker
        pariwarId={pariwarId}
        value={district}
        onChange={(d) => {
          setDistrict(d);
          setRevealFor(null);
        }}
        testId="fw-find-district"
      />
      <h2 ref={listHeadingRef} tabIndex={-1} className="sr-only">
        {t('fw.find.title')}
      </h2>
      {district === null ? (
        <p data-testid="fw-find-choose">{t('fw.find.chooseFirst')}</p>
      ) : (
        <WorkerList
          query={list}
          empty={t('fw.find.empty')}
          headingRef={listHeadingRef}
          noAccessText={t('fw.noAccessDistrict')}
          testId="fw-find-list"
          action={(item, register) => (
            <div ref={register} tabIndex={-1} className="outline-none">
              <CodeReveal
                pariwarId={pariwarId}
                fieldWorkerId={item.field_worker_id}
                workerName={item.name}
                isCurrent={revealFor === item.field_worker_id}
                onShow={() => setRevealFor(item.field_worker_id)}
              />
            </div>
          )}
        />
      )}
    </section>
  );
}
