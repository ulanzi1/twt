// The three Rule-7 drafts (Story 14.3, AC9 / AC12). Built by the SAME `buildBreachDrafts` the contract ships, from the
// incident's derived view. Each is a read-only text box with a Copy button. ⛔ There is no send control here, and none
// anywhere: staff send a notice by their own means, then record that they did.

import { buildBreachDrafts, type BreachDraft, type BreachIncidentView } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { t } from './i18n-en.js';

const DRAFT_KEYS = ['principalsNotice', 'boardInitial', 'boardReport'] as const;
type DraftKey = (typeof DRAFT_KEYS)[number];

function DraftBox({ name, draft }: { name: DraftKey; draft: BreachDraft }): ReactElement {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(draft.text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };
  return (
    <section className="flex flex-col gap-1" aria-label={t(`drafts.${name}`)} data-testid={`breach-draft-${name}`} data-complete={String(draft.complete)}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium">{t(`drafts.${name}`)}</h4>
        <span className="text-sm" data-testid={`breach-draft-${name}-state`}>
          {draft.complete ? t('drafts.complete') : `${t('drafts.missing')}: ${draft.missing.join(', ')}`}
        </span>
      </div>
      <textarea
        className="rounded border px-2 py-1 font-mono text-sm"
        rows={10}
        readOnly
        value={draft.text}
        aria-label={`${t('drafts.textLabel')} ${t(`drafts.${name}`)}`}
        data-testid={`breach-draft-${name}-text`}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm"
          onClick={() => void copy()}
          aria-label={`${t('drafts.copyLabel')} ${t(`drafts.${name}`)}`}
          data-testid={`breach-draft-${name}-copy`}
        >
          {t('drafts.copy')}
        </button>
        {status === 'copied' && <span role="status" className="text-sm">{t('drafts.copied')}</span>}
        {status === 'failed' && <span role="alert" className="text-sm text-status-fail-fg">{t('drafts.copyFailed')}</span>}
      </div>
    </section>
  );
}

export function DraftsPanel({ view }: { view: BreachIncidentView }): ReactElement {
  const drafts = buildBreachDrafts(view);
  return (
    <section className="flex flex-col gap-4" aria-label={t('drafts.title')} data-testid="breach-drafts">
      <div>
        <h3 className="text-lg font-semibold">{t('drafts.title')}</h3>
        <p className="text-sm opacity-80">{t('drafts.subtitle')}</p>
      </div>
      {DRAFT_KEYS.map((name) => (
        <DraftBox key={name} name={name} draft={drafts[name]} />
      ))}
    </section>
  );
}
