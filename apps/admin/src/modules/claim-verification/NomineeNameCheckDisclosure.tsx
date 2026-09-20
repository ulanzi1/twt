// The ON-DEMAND nominee-names disclosure — Story 6.18 (AC2, AC8, D3).
//
// ⭐⭐ ONE COMPONENT, THREE SURFACES. The District Admin's console, the Pariwar Admin's cycle-freeze
// card and the R9 voting panel all need the same thing: a button that, WHEN PRESSED, fetches and
// shows the two names. Before this existed the R9 panel hand-rolled it (with three hard-coded
// English literals that bypassed the copy table) and the Pariwar Admin's card did not have it AT
// ALL — so the surface that owns the FINAL approval, and the Return decision, decided blind. That
// is D3 unmet: *"The Pariwar Admin sees both names, the DA's reason and the filer's note, then
// approves or returns."*
//
// ⛔⛔ THE FETCH IS ON DEMAND AND THAT IS A PII CONTROL, ⛔ not lazy loading. The read decrypts a
// LIVING nominee's Tier-1 name and writes an `admin_nominee_name_check.read` audit line whose
// entire point is that a named human CHOSE to look. Fetching it with the page would put a living
// person's name into every card render and make the audit trail meaningless.
//
// ⛔ `canCheck` is FALSE here, always. `2026-09-19-226` cl.3 reserves RECORDING the verdict to the
// District Admin, and `claim.check_nominee_name` is granted to them alone — offering the control on
// a voting surface would invite a 403 and blur who the reviewer is. The District Admin's own
// console renders `<NomineeNameCheckPanel>` directly, with the control.

import { useState } from 'react';

import { useNomineeNameCheck } from '../../api/hooks.js';
import { NomineeNameCheckPanel } from './NomineeNameCheckPanel.js';
import { verifierConsoleEn as t } from './i18n-en.js';

export interface NomineeNameCheckDisclosureProps {
  pariwarId: string;
  claimCaseId: string;
  /** A test id for the toggle, so each host surface stays individually assertable. */
  testId?: string;
}

export function NomineeNameCheckDisclosure({
  pariwarId,
  claimCaseId,
  testId = 'name-check-disclosure',
}: NomineeNameCheckDisclosureProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const nameCheck = useNomineeNameCheck(pariwarId, claimCaseId, open);

  return (
    <section className="mt-3 border-t pt-3" aria-label={t.nameCheck.disclosureLabel}>
      <button
        type="button"
        data-testid={testId}
        className="text-sm underline"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t.nameCheck.disclosureToggle}
      </button>
      {open ? (
        <NomineeNameCheckPanel
          data={nameCheck.data}
          loading={nameCheck.isLoading}
          // ⚠ The read's own failure is surfaced, ⛔ never swallowed into an empty panel: a 403
          // (including the null-district hole) or a 5xx must not look like "this claim has no names".
          error={nameCheck.isError ? t.nameCheck.loadError : null}
          canCheck={false}
          onSubmit={async () => {
            /* unreachable — `canCheck` is false, so no control renders */
          }}
        />
      ) : null}
    </section>
  );
}
