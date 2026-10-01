// The helpline's RE-FILE CONFIRMATION card — Story 6.19c (AC15, D19, AC8c; key (6)).
//
// Shown when a helpline intake is refused 409 `claim.refile_requires_confirmation`: the death's last claim was closed
// because the family did not respond, so a new claim needs a person's recorded confirmation (with a REQUIRED note)
// first. The card records it against the CLOSED claim the 409 names; the operator then files again. ⛔ No reason, note
// or date from the closed claim is shown.

import type { ReactElement } from 'react';
import { useId, useState } from 'react';

import { useRecordRefileConfirmation } from '../../api/hooks.js';
import { closureErrorText } from './errors.js';
import { correctionClosureEn as t } from './i18n-en.js';

export function RefileConfirmationCard(props: {
  pariwarId: string;
  closedClaimCaseId: string;
  onConfirmed?: () => void;
}): ReactElement {
  const confirm = useRecordRefileConfirmation(props.pariwarId);
  const [note, setNote] = useState('');
  const [missing, setMissing] = useState(false);
  const id = useId();
  const r = t.refile;
  return (
    <section role="region" aria-label={r.heading} className="mt-3 rounded border p-3 text-sm" data-testid="refile-confirmation-card">
      <h3 className="font-semibold">{r.heading}</h3>
      <p>{r.body}</p>
      <label className="mt-1 flex flex-col">
        {r.note}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} aria-describedby={missing ? id : undefined} data-testid="refile-confirmation-note" />
      </label>
      {missing ? (
        <p role="alert" id={id}>
          {t.column.noteRequired}
        </p>
      ) : null}
      <button
        type="button"
        className="mt-1 rounded border px-3 py-1"
        disabled={confirm.isPending || confirm.isSuccess}
        data-testid="refile-confirmation-submit"
        onClick={() => {
          if (note.trim() === '') return setMissing(true);
          setMissing(false);
          void confirm
            .mutateAsync({ closedClaimCaseId: props.closedClaimCaseId, note })
            .then(() => props.onConfirmed?.(), () => undefined);
        }}
      >
        {r.submit}
      </button>
      {confirm.isSuccess ? <p role="status">{r.recorded}</p> : null}
      {confirm.isError ? <p role="alert">{closureErrorText(confirm.error)}</p> : null}
    </section>
  );
}
