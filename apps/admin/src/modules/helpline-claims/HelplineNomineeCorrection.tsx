// `<HelplineNomineeCorrection>` — the helpline operator raises a NOMINEE correction on the family's behalf
// (Story 6.20, AC7; CC2 — `2026-09-21-237` cl.3). ⚠ NOMINEE-declaration correction, ⛔ not the bank-detail
// correction the BankDetailsCard handles.
//
// ⭐ WHY IT LIVES HERE (code review 2026-09-24): `claim.raise_nominee_correction` is held by the helpline
// operator ONLY, yet the raise form was mounted in the verifier console and on the Pariwar Admin's queue —
// pages whose viewers do ⛔ not hold the key (every raise 403'd) and which the operator cannot open. So
// neither channel CC2 names worked from the admin UI. This is the operator's surface.
// ⭐ THE CLAIM COMES FROM THE SELECTED MEMBER (BigDev 2026-09-24b, option (a)). It used to be a typed
// 36-character claim reference "exactly as it is shown" — but nothing ever shows it to the family, so the
// channel worked only inside the filing call. Now the operator selects the deceased member and reads the
// caller's identity back (the page's own script), and the server lists that member's live claims: one ⇒
// used, several ⇒ the operator picks, none ⇒ nothing to correct against. ⛔ No typed reference.
// ⚠ DELIBERATE (family 9): the raise route requires ⛔ no step-up, unlike the helpline INTAKE
// (`requireStepUp('claim_file')`) and the member app's raise (`nominee_change`). The operator's raise asks
// for nothing: it is a REQUEST that two different staff approvers must each approve with a note (CC2/CC3),
// and the read-back gates the form here. Re-examine if a raise ever takes effect without both approvals.
// The operator sees ⛔ no nominee details here — the District Admin and Pariwar Admin review the target
// beside the proposal.

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { useNomineeCorrectionRaisableClaims, usePostNomineeCorrectionRaise } from '../../api/hooks.js';
import { NomineeCorrectionRaiseForm, formatIst } from '../claim-verification/NomineeDeclarationPanel.js';
import { verifierConsoleEn } from '../claim-verification/i18n-en.js';
import { nomineeCorrectionErrorMessage } from '../claim-verification/nominee-errors.js';

const nd = verifierConsoleEn.nomineeDeclaration;
const r = nd.corrections.raise;

export function HelplineNomineeCorrection({
  pariwarId,
  memberId,
  identityConfirmed,
}: {
  pariwarId: string;
  /** The deceased member the operator SELECTED on this page, or `null`. */
  memberId: string | null;
  /** The caller's identity was read back and confirmed for THAT member (the page's script). */
  identityConfirmed: boolean;
}): ReactElement {
  const ready = memberId !== null && identityConfirmed;
  const claimsQ = useNomineeCorrectionRaisableClaims(pariwarId, memberId, ready);
  const claims = claimsQ.data?.member_id === memberId ? claimsQ.data.claims : [];
  const [picked, setPicked] = useState<string | null>(null);
  // One live claim ⇒ it is the claim; several ⇒ the operator's pick (reset when the member changes).
  // ⭐ A lone claim is REMEMBERED as the pick (review 2026-09-24c): otherwise a refetch that finds a second claim
  // (one filed on this page meanwhile) un-chose it, unmounting the form and everything typed into it.
  const lone = claims.length === 1 ? claims[0]!.claim_case_id : null;
  useEffect(() => {
    if (lone !== null) setPicked(lone);
  }, [lone]);
  const chosen = claims.some((c) => c.claim_case_id === picked) ? picked : lone;
  const raise = usePostNomineeCorrectionRaise(pariwarId, chosen);
  const [sentCount, setSentCount] = useState(0);
  // A different claim is a different request — ⛔ never carry an outcome or an error across.
  const resetRaise = raise.reset;
  useEffect(() => {
    resetRaise();
    setSentCount(0);
  }, [chosen, memberId, resetRaise]);
  useEffect(() => {
    setPicked(null);
  }, [memberId]);
  // ⭐ The claim a send was FOR (code review 2026-09-24b): a result that lands after the claim changed is
  // ⛔ never reported against the new one.
  const chosenRef = useRef(chosen);
  chosenRef.current = chosen;

  let source: ReactElement | null = null;
  if (!ready) {
    source = (
      <p className="text-sm" data-testid="helpline-nominee-correction-need-member">
        {r.needMember}
      </p>
    );
  } else if (claimsQ.isLoading) {
    source = (
      <p role="status" className="text-sm" data-testid="helpline-nominee-correction-claims-loading">
        {r.claimsLoading}
      </p>
    );
  } else if (claimsQ.isError) {
    source = (
      <div role="alert" className="text-sm" data-testid="helpline-nominee-correction-claims-error">
        <p>{r.claimsError}</p>
        <button type="button" className="underline" onClick={() => void claimsQ.refetch()}>
          {nd.corrections.retry}
        </button>
      </div>
    );
  } else if (claims.length === 0) {
    source = (
      <p className="text-sm" data-testid="helpline-nominee-correction-no-claim">
        {r.noClaim}
      </p>
    );
  } else if (claims.length > 1) {
    source = (
      <fieldset className="text-sm" data-testid="helpline-nominee-correction-pick">
        <legend>{r.pickClaim}</legend>
        {claims.map((c) => (
          <label key={c.claim_case_id} className="flex items-center gap-2">
            <input
              type="radio"
              name="helpline-nominee-correction-claim"
              value={c.claim_case_id}
              checked={picked === c.claim_case_id}
              // Locked while a send is in flight — the result must belong to the claim it was sent for.
              disabled={raise.isPending}
              onChange={() => setPicked(c.claim_case_id)}
              data-testid={`helpline-nominee-correction-claim-${c.claim_case_id}`}
            />
            {/* An unknown state reads as a dash (the refusal list's posture) — ⛔ never guessed as "Being filed". */}
            {r.claimOption(nd.refusals.claimStateLabels[c.claim_state] ?? '—', formatIst(c.created_at))}
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <section className="mt-6 border-t pt-4" aria-label={r.heading} data-testid="helpline-nominee-correction">
      {source}
      {/* ⭐ The form appears only once THE claim is known (adversarial review 2026-09-24b): shown while the
          operator still had to pick, its fields were wiped by the pick itself (the reset is keyed to the claim). */}
      {ready && chosen !== null ? (
        <NomineeCorrectionRaiseForm
          onRaise={async (body) => {
            const sentFor = chosen;
            if (!sentFor) return;
            const ok = await raise
              .mutateAsync(body)
              .then(() => true)
              .catch(() => false);
            if (ok && chosenRef.current === sentFor) setSentCount((n) => n + 1);
          }}
          raising={raise.isPending}
          raiseError={raise.error ? nomineeCorrectionErrorMessage(raise.error, 'raise') : null}
          sentCount={sentCount}
          // ⭐ Keyed to the CHOSEN claim only — ⛔ never to keystrokes (the old typed reference wiped every
          // field on each character). A DIFFERENT claim is a different request, so switching it clears.
          resetKey={chosen}
        />
      ) : null}
    </section>
  );
}
