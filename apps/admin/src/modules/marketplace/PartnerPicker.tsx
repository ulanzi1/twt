// The partner picker — Story 12.2 step (a) (QE3 (A)): choose one of the Pariwar's registered partners, or register a new
// one inline. A partner is IMMUTABLE (a misspelt one is registered again), so the hint says so. The registration's
// Idempotency-Key belongs to the current ATTEMPT: the same two names keep their key (a retry whose first response was lost
// replays the same partner), an EDITED name mints a new one — the server replays the first recorded result for a key, and a
// partner can never be corrected afterwards (review RP18). The key is cleared on success or Cancel. The new partner is
// selected once it exists, unless this picker has been left — or another partner chosen from the list — in the meantime
// (RP27, RC4 — a pick made while a registration is in flight also closes the form, PT12). Focus follows the form: to the
// select after a registration, unless the admin has moved focus out of the picker meanwhile (RC3, PT2), and back to "Register
// a new partner" after Cancel.

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { attemptKey, useCreateModulePartner, useModulePartners, type AttemptKey } from '../../api/hooks.js';
import { moduleErrorGuidance, normaliseDisplayText, partnerIssueMessage } from './derive.js';
import { focusIfUnclaimed } from './focus.js';
import { resolveEn as t } from './i18n-en.js';

export interface PartnerPickerProps {
  pariwarId: string;
  value: string | null;
  onChange: (partnerId: string) => void;
}

export function PartnerPicker({ pariwarId, value, onChange }: PartnerPickerProps): ReactElement {
  const partners = useModulePartners(pariwarId);
  const create = useCreateModulePartner(pariwarId);
  const [adding, setAdding] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameHi, setNameHi] = useState('');
  const attempt = useRef<AttemptKey | null>(null);
  const generation = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  // Cancel unmounts the form under focus; the "Register a new partner" button it returns to mounts on the next render.
  const focusNewButton = useRef(false);

  // Leaving the picker (Next, or a step change) ends any registration still in flight: its late result must not replace
  // the partner the admin chose in the meantime (RP27).
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (adding || !focusNewButton.current) return;
    focusNewButton.current = false;
    newButtonRef.current?.focus();
  }, [adding]);

  const onRegister = async (): Promise<void> => {
    // Pasted names are cleaned as the wizard cleans its texts (DN3, `-435` item 2): the server refuses a no-break space,
    // a doubled space or non-NFC text in a partner name, which is permanent once registered.
    const body = {
      display_name_en: normaliseDisplayText(nameEn, 'name'),
      display_name_hi: normaliseDisplayText(nameHi, 'name'),
    };
    const startedAt = generation.current;
    try {
      const created = await create.mutateAsync({ body, idempotencyKey: attemptKey(attempt, body) });
      if (generation.current !== startedAt) return; // cancelled, or the picker was left, while in flight (TR5)
      attempt.current = null;
      setAdding(false);
      setNameEn('');
      setNameHi('');
      onChange(created.partner_id);
      // The form (and the Register button) unmounts; the select now shows the new partner — unless focus has left the picker.
      focusIfUnclaimed(selectRef.current, rootRef.current);
    } catch (err) {
      // Shown below from `create.error`; unchanged names keep the key, so a retry is the SAME attempt. "Already registered —
      // choose it from the list" re-reads the list, so the partner it means is there to choose (RC9).
      if (err instanceof ApiError && err.code === 'module_partner.name_taken') void partners.refetch();
    }
  };
  const onCancel = (): void => {
    generation.current += 1;
    attempt.current = null;
    focusNewButton.current = true;
    setAdding(false);
    create.reset();
  };

  const items = partners.data?.items ?? [];
  // A chosen id the list does not show (a refresh that failed after registering; a corrected copy's partner past the first 200)
  // gets an option of its own: without it the select would read "Choose a partner" while a partner is in fact chosen (RC5).
  const notListed = value !== null && !items.some((p) => p.partner_id === value);
  return (
    <div ref={rootRef} className="flex flex-col gap-2" data-testid="partner-picker">
      <label className="flex flex-col text-sm">
        {t('module.field.partner')}
        <select
          ref={selectRef}
          className="rounded border px-2 py-1"
          value={value ?? ''}
          onChange={(e) => {
            if (e.target.value === '') return;
            generation.current += 1; // a registration still in flight must not replace this choice (RC4)
            if (create.isPending) {
              // …and the form it came from closes, as Cancel would: the admin has answered the question another way (PT12).
              attempt.current = null;
              setAdding(false);
              setNameEn('');
              setNameHi('');
              create.reset();
            }
            onChange(e.target.value);
          }}
          data-testid="partner-select"
        >
          <option value="">{t('module.partner.choose')}</option>
          {notListed ? <option value={value}>{t('module.partner.notListed')}</option> : null}
          {items.map((p) => (
            <option key={p.partner_id} value={p.partner_id}>
              {p.display_name_en} / {p.display_name_hi}
            </option>
          ))}
        </select>
      </label>
      {/* Only while there is NO list: `errorUpdateCount` never resets, so a later refresh would bring back "Loading…" and a
          disabled Try again (RC14), and a FAILED refresh keeps v5's status 'error' over a working select (PT1). */}
      {partners.data === undefined && (partners.isError || (partners.errorUpdateCount > 0 && partners.isFetching)) ? (
        <div className="flex flex-col gap-1">
          {partners.isError ? (
            <p role="alert" className="text-xs text-status-fail-fg">{t('module.partner.loadError')}</p>
          ) : (
            <p role="status" className="text-xs">{t('module.loading')}</p>
          )}
          {/* A failed load leaves nothing to choose and `retry: false`; a reload would lose every answer (RP23). The button stays
              mounted (disabled) while the retry runs, because v5 clears `isError` as soon as a data-less refetch starts (PU3). */}
          <button
            type="button"
            className="w-fit text-sm underline disabled:opacity-50"
            disabled={partners.isFetching}
            onClick={() => void partners.refetch()}
            data-testid="partner-retry"
          >
            {t('module.retry')}
          </button>
        </div>
      ) : null}
      {partners.isSuccess && items.length === 0 ? <p className="text-xs">{t('module.partner.none')}</p> : null}
      {!adding ? (
        <button type="button" ref={newButtonRef} className="w-fit text-sm underline" onClick={() => setAdding(true)} data-testid="partner-new">
          {t('module.partner.new')}
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded border p-2" data-testid="partner-form">
          <p className="text-xs">{t('module.partner.hint')}</p>
          <label className="flex flex-col text-xs">
            {t('module.partner.nameEn')}
            <input className="rounded border px-2 py-1 text-sm" value={nameEn} onChange={(e) => setNameEn(e.target.value)} data-testid="partner-name-en" />
          </label>
          <label className="flex flex-col text-xs">
            {t('module.partner.nameHi')}
            <input lang="hi" className="rounded border px-2 py-1 text-sm" value={nameHi} onChange={(e) => setNameHi(e.target.value)} data-testid="partner-name-hi" />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
              disabled={
                create.isPending ||
                normaliseDisplayText(nameEn, 'name').trim() === '' ||
                normaliseDisplayText(nameHi, 'name').trim() === ''
              }
              onClick={() => void onRegister()}
              data-testid="partner-save"
            >
              {create.isPending ? t('module.partner.saving') : t('module.partner.save')}
            </button>
            <button type="button" className="text-sm underline" onClick={onCancel} data-testid="partner-cancel">
              {t('module.partner.cancel')}
            </button>
          </div>
          {create.isError ? (
            <p role="alert" className="text-xs text-status-fail-fg" data-testid="partner-error">
              {create.error instanceof ApiError
                ? ((create.error.code === 'module_partner.name_invalid' ? partnerIssueMessage(create.error.details) : null) ??
                  moduleErrorGuidance(create.error.code))
                : t('module.partner.error')}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
