// `<HelplineNomineeCorrection>` — the helpline operator raises a NOMINEE correction on the family's behalf
// (Story 6.20, AC7; CC2 — `2026-09-21-237` cl.3). ⚠ NOMINEE-declaration correction, ⛔ not the bank-detail
// correction the BankDetailsCard handles.
//
// ⭐ WHY IT LIVES HERE (code review 2026-09-24): `claim.raise_nominee_correction` is held by the helpline
// operator ONLY, yet the raise form was mounted in the verifier console and on the Pariwar Admin's queue —
// pages whose viewers do ⛔ not hold the key (every raise 403'd) and which the operator cannot open. So
// neither channel CC2 names worked from the admin UI. This is the operator's surface.
// ⭐ A correction is ALWAYS tied to one claim: the operator enters the claim reference the family quotes
// (pre-filled with a claim filed in this session). The server checks the claim, its state window and the
// standing target; the form only collects the request. The operator sees ⛔ no nominee details here — the
// raise route needs none, and the District Admin and Pariwar Admin review the target beside the proposal.

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { usePostNomineeCorrectionRaise } from '../../api/hooks.js';
import { NomineeCorrectionRaiseForm } from '../claim-verification/NomineeDeclarationPanel.js';
import { verifierConsoleEn } from '../claim-verification/i18n-en.js';
import { nomineeCorrectionErrorMessage } from '../claim-verification/nominee-errors.js';

const r = verifierConsoleEn.nomineeDeclaration.corrections.raise;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function HelplineNomineeCorrection({
  pariwarId,
  filedClaimCaseId,
}: {
  pariwarId: string;
  /** A claim filed in this session, if any — pre-fills the reference. */
  filedClaimCaseId: string | null;
}): ReactElement {
  const [claimRef, setClaimRef] = useState(filedClaimCaseId ?? '');
  const [sentCount, setSentCount] = useState(0);
  useEffect(() => {
    if (filedClaimCaseId) setClaimRef(filedClaimCaseId);
  }, [filedClaimCaseId]);
  const trimmed = claimRef.trim().toLowerCase();
  const valid = UUID.test(trimmed);
  const raise = usePostNomineeCorrectionRaise(pariwarId, valid ? trimmed : null);
  // A different claim is a different request — ⛔ never carry an outcome or an error across.
  const resetRaise = raise.reset;
  useEffect(() => {
    resetRaise();
    setSentCount(0);
  }, [trimmed, resetRaise]);

  return (
    <section className="mt-6 border-t pt-4" aria-label={r.heading} data-testid="helpline-nominee-correction">
      <label className="flex flex-col text-sm">
        {r.claimReference}
        <input
          value={claimRef}
          onChange={(e) => setClaimRef(e.target.value)}
          aria-describedby="helpline-nominee-correction-claim-help"
          data-testid="helpline-nominee-correction-claim"
        />
      </label>
      <p id="helpline-nominee-correction-claim-help" className="text-xs">
        {r.claimReferenceHelp}
      </p>
      {claimRef.trim() !== '' && !valid ? (
        <p role="alert" className="text-xs" data-testid="helpline-nominee-correction-claim-invalid">
          {r.claimReferenceInvalid}
        </p>
      ) : null}
      <NomineeCorrectionRaiseForm
        onRaise={async (body) => {
          if (!valid) return;
          const ok = await raise
            .mutateAsync(body)
            .then(() => true)
            .catch(() => false);
          if (ok) setSentCount((n) => n + 1);
        }}
        raising={raise.isPending}
        raiseError={raise.error ? nomineeCorrectionErrorMessage(raise.error) : null}
        sentCount={sentCount}
        resetKey={trimmed}
        disabled={!valid}
      />
    </section>
  );
}
