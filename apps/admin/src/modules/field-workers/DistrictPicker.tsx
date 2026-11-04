// The district choice the three field-worker pages share — Story 13.1a (AC11; AD11; decision `-447` item 5).
//
// A `<select>` of the Pariwar's RECORDED districts, exact values (I11 — ⛔ trimmed, case-folded or normalised on the way; an option's value is the district's index). The
// session carries no district grant (AD11), so every recorded district is offered and the server's 403 is the boundary. When the
// read says `districts_truncated` (more than 200 listed workplace districts, no geo tree), an exact-text field is offered as well
// (review R9): a district past the first 200 can still be chosen, sent byte for byte, and judged by the server.
// `allowAll` adds an "All districts" option (the approvals page's default, AC11 (b)); the value is then `null`.

import type { ReactElement } from 'react';
import { useId } from 'react';

import { useFieldWorkerDistricts } from '../../api/hooks.js';
import { resolveEn as t } from './i18n-en.js';

// The options' values are the districts' INDICES (⛔ the names: no sentinel string can be guaranteed unlike every district).
const NONE = '';

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
  const list = districts.data?.districts ?? [];
  const truncated = districts.data?.districts_truncated === true;
  const listed = value !== null && list.includes(value);
  const selectValue = value !== null && listed ? String(list.indexOf(value)) : NONE;

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
        onChange={(e) => onChange(e.target.value === NONE ? null : (list[Number(e.target.value)] ?? null))}
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
      {districts.isError && <p role="alert" className="text-xs text-status-fail-fg">{t('fw.district.loadError')}</p>}
      {truncated && (
        <>
          <p className="text-xs" data-testid={`${testId}-truncated`}>{t('fw.district.truncated')}</p>
          <label htmlFor={typedId} className="text-sm font-medium">
            {t('fw.district.typed')}
          </label>
          <input
            id={typedId}
            className="rounded border px-2 py-1 text-sm"
            value={value !== null && !listed ? value : ''}
            aria-describedby={hintId}
            aria-invalid={invalid || undefined}
            onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
            data-testid={`${testId}-typed`}
          />
          <p id={hintId} className="text-xs">{t('fw.district.typedHint')}</p>
        </>
      )}
    </div>
  );
}
