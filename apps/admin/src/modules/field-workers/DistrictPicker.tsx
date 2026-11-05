// The district choice the three field-worker pages share — Story 13.1a (AC11; AD11; decision `-447` item 5).
//
// A `<select>` of the Pariwar's RECORDED districts, exact values (I11 — ⛔ trimmed, case-folded or normalised on the way; an option's value is the district's index). The
// session carries no district grant (AD11), so every recorded district is offered and the server's 403 is the boundary. When the
// read says `districts_truncated` (more than 200 listed workplace districts, no geo tree), an exact-text field is offered as well
// (review R9): a district past the first 200 can still be chosen, sent byte for byte, and judged by the server.
// `allowAll` adds an "All districts" option (the approvals page's default, AC11 (b)); the value is then `null`.
//
// The typed text is the picker's OWN state and the input shows exactly what was typed, always (review CR3): it is handed to the
// page only when the admin leaves the field or presses Enter — ⛔ on every keystroke (each partial string would be a new audited
// list read, and a text that equals a listed district must not blank the field it is still being typed into). Choosing from the
// select clears the typed text. Enter commits and does NOT submit a form around the picker: a submit in the same breath would
// race the commit and could register under the previous district.

import type { KeyboardEvent, ReactElement } from 'react';
import { useId, useRef, useState } from 'react';

import { useFieldWorkerDistricts } from '../../api/hooks.js';
import { resolveEn as t } from './i18n-en.js';

// The options' values are the districts' INDICES (⛔ the names: no sentinel string can be guaranteed unlike every district).
const NONE = '';

// The server refuses a district longer than 200 characters (`FieldWorkerListQuery` and `RegisterFieldWorkerRequest` in
// `@twt/contracts`, which exports no constant for it): the field stops there rather than send a request that can only 400.
const DISTRICT_MAX_LENGTH = 200;

export interface DistrictPickerProps {
  pariwarId: string;
  /** The chosen district, or null (none chosen / all districts). */
  value: string | null;
  onChange: (district: string | null) => void;
  allowAll?: boolean;
  /** For an error on this field (the register form). */
  invalid?: boolean;
  describedBy?: string;
  testId: string;
}

export function DistrictPicker({ pariwarId, value, onChange, allowAll = false, invalid = false, describedBy, testId }: DistrictPickerProps): ReactElement {
  const districts = useFieldWorkerDistricts(pariwarId);
  const selectId = useId();
  const typedId = useId();
  const hintId = useId();
  const [typed, setTyped] = useState('');
  // What the page was last told from the typed field: a blur with nothing new typed (a Tab through the field) must not clear
  // a district the admin chose from the select.
  const committed = useRef('');
  const list = districts.data?.districts ?? [];
  const truncated = districts.data?.districts_truncated === true;
  const listed = value !== null && list.includes(value);
  const selectValue = value !== null && listed ? String(list.indexOf(value)) : NONE;

  const commitTyped = (): void => {
    if (typed === committed.current) return;
    committed.current = typed;
    onChange(typed === '' ? null : typed);
  };
  const onTypedKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    commitTyped();
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm font-medium">
        {t('fw.district')}
      </label>
      <select
        id={selectId}
        className="rounded border px-2 py-1 text-sm"
        value={selectValue}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          setTyped('');
          committed.current = '';
          onChange(e.target.value === NONE ? null : (list[Number(e.target.value)] ?? null));
        }}
        data-testid={testId}
      >
        <option value={NONE}>{allowAll ? t('fw.district.all') : t('fw.district.choose')}</option>
        {list.map((d, i) => (
          <option key={d} value={String(i)}>
            {d}
          </option>
        ))}
      </select>
      {districts.isLoading && <p role="status" className="text-xs">{t('fw.loading')}</p>}
      {districts.isError && (
        <div role="alert" className="flex flex-col gap-1 text-xs text-status-fail-fg">
          <p>{t('fw.district.loadError')}</p>
          <button type="button" className="self-start underline" onClick={() => void districts.refetch()} data-testid={`${testId}-retry`}>
            {t('fw.retry')}
          </button>
        </div>
      )}
      {truncated && (
        <>
          <p className="text-xs" data-testid={`${testId}-truncated`}>{t('fw.district.truncated')}</p>
          <label htmlFor={typedId} className="text-sm font-medium">
            {t('fw.district.typed')}
          </label>
          <input
            id={typedId}
            className="rounded border px-2 py-1 text-sm"
            value={typed}
            maxLength={DISTRICT_MAX_LENGTH}
            aria-describedby={describedBy === undefined ? hintId : `${hintId} ${describedBy}`}
            aria-invalid={invalid || undefined}
            onChange={(e) => setTyped(e.target.value)}
            onBlur={commitTyped}
            onKeyDown={onTypedKeyDown}
            data-testid={`${testId}-typed`}
          />
          <p id={hintId} className="text-xs">{t('fw.district.typedHint')}</p>
        </>
      )}
    </div>
  );
}
