// `<HelplineAppeal>` — the helpline operator files an APPEAL for the family (Story 6.24a, `2026-10-07-292` RF14 (b);
// AR-61). ⭐ "Is told" (`-291` Q1 A, as `-292` amended its reading): ⛔ no surface tells a refused family about an appeal
// today, so the operator tells them — when they call, or when staff call them — reading the line below (en + hi), and files
// the appeal through the EXISTING on-behalf route (`claim.file`, the key this card's read needs too).
//
// The list is the SELECTED member's refused claims; each says whether it can be appealed NOW — judged by the initiation
// guard itself on the server (`listHelplineAppealEligibility`), so this card can ⛔ never offer an appeal the route
// refuses. A refusal on suspicion of a post-death nominee change carries its 90-day date ("until" / "ended on"); any
// other refusal has ⛔ no time limit (6.16 D-E). ⛔ No name, ⛔ no note, ⛔ no reason is shown.
//
// ⚠ DELIBERATE — the read-back gate is CLIENT-SIDE ONLY (the D5 precedent `<HelplineCertificateReplacement>` records).

import type { ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useHelplineAppealClaims, useInitiateAppealOnBehalf } from '../../api/hooks.js';
import { formatIst } from '../claim-verification/NomineeDeclarationPanel.js';
import { verifierConsoleEn } from '../claim-verification/i18n-en.js';
import { appealReadBack, certificateClaimOption, resolveEn } from './i18n-en.js';

const claimStateLabels = verifierConsoleEn.nomineeDeclaration.refusals.claimStateLabels;

/** A filing refusal in words — ⛔ never a raw code. */
function filingRefusal(err: unknown): string {
  if (err instanceof ApiError && err.code === 'appeal.suspicion_refusal_time_limit_passed') {
    return resolveEn('helpline.appeal.refusal.time_limit_passed');
  }
  return resolveEn('helpline.appeal.refusal.generic');
}

export function HelplineAppeal({
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
  const listQ = useHelplineAppealClaims(pariwarId, memberId, ready);
  const claims = listQ.data?.member_id === memberId ? listQ.data.claims : [];
  const file = useInitiateAppealOnBehalf(pariwarId, memberId);

  let body: ReactElement;
  if (!ready) {
    body = (
      <p className="text-sm" data-testid="helpline-appeal-need-member">
        {resolveEn('helpline.appeal.needMember')}
      </p>
    );
  } else if (listQ.isLoading) {
    body = (
      <p role="status" className="text-sm" data-testid="helpline-appeal-loading">
        {resolveEn('helpline.appeal.loading')}
      </p>
    );
  } else if (listQ.isError) {
    body = (
      <div role="alert" className="text-sm" data-testid="helpline-appeal-error">
        <p>{resolveEn('helpline.appeal.error')}</p>
        <button type="button" className="underline" onClick={() => void listQ.refetch()}>
          {resolveEn('helpline.appeal.retry')}
        </button>
      </div>
    );
  } else if (claims.length === 0) {
    body = (
      <p className="text-sm" data-testid="helpline-appeal-none">
        {resolveEn('helpline.appeal.none')}
      </p>
    );
  } else {
    body = (
      <ul className="flex flex-col gap-3">
        {claims.map((c) => {
          const readBack =
            c.appeal_until === null
              ? null
              : c.eligibility === 'time_limit_passed'
                ? appealReadBack('ended', c.appeal_until)
                : c.eligibility === 'can_appeal'
                  ? appealReadBack('until', c.appeal_until)
                  : null;
          const filingThis = file.isPending && file.variables === c.claim_case_id;
          return (
            <li key={c.claim_case_id} className="flex flex-col gap-1 text-sm" data-testid={`helpline-appeal-claim-${c.claim_case_id}`}>
              <span className="font-medium">
                {certificateClaimOption(claimStateLabels[c.claim_state] ?? '—', formatIst(c.created_at))}
              </span>
              <span data-testid={`helpline-appeal-state-${c.claim_case_id}`}>{resolveEn(`helpline.appeal.state.${c.eligibility}`)}</span>
              {readBack ? (
                <div className="rounded bg-gray-50 p-2" data-testid={`helpline-appeal-readback-${c.claim_case_id}`}>
                  <p className="text-xs text-gray-600">{resolveEn('helpline.appeal.readBack')}</p>
                  <p lang="en">{readBack.en}</p>
                  <p lang="hi">{readBack.hi}</p>
                </div>
              ) : null}
              {c.eligibility === 'can_appeal' ? (
                <button
                  type="button"
                  className="self-start rounded border px-3 py-1"
                  disabled={file.isPending}
                  onClick={() => file.mutate(c.claim_case_id)}
                  data-testid={`helpline-appeal-file-${c.claim_case_id}`}
                >
                  {resolveEn(filingThis ? 'helpline.appeal.filing' : 'helpline.appeal.file')}
                </button>
              ) : null}
              {file.isSuccess && file.variables === c.claim_case_id ? (
                <p role="status" data-testid="helpline-appeal-filed">
                  {resolveEn('helpline.appeal.filed')}
                </p>
              ) : null}
              {file.isError && file.variables === c.claim_case_id ? (
                <p role="alert" className="text-red-700" data-testid="helpline-appeal-refused">
                  {filingRefusal(file.error)}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section aria-label={resolveEn('helpline.appeal.heading')} className="flex flex-col gap-2 rounded border p-4" data-testid="helpline-appeal">
      <h2 className="text-sm font-semibold">{resolveEn('helpline.appeal.heading')}</h2>
      {body}
    </section>
  );
}
