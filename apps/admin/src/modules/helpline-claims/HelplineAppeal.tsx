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

import { useEffect, useRef, useState, type ReactElement } from 'react';

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
  // ⭐ ONE shared mutation object covers every row (`file.variables`/`.isPending`/`.isSuccess`/`.isError` reflect only
  // the LAST call) — filing claim B would otherwise erase claim A's state. Per-claim state is tracked here instead,
  // set from each call's OWN promise (`mutateAsync`). ⚠ ⛔ Never the per-`mutate` `onSuccess`/`onError` options:
  // TanStack fires those for the LATEST call only, so filing B before A settled would drop A's outcome and
  // re-enable A's button while A's POST is still in flight (code review round 2, 2026-10-08).
  const [filingOutcomes, setFilingOutcomes] = useState<
    Record<string, { readonly outcome: 'pending' } | { readonly outcome: 'success' } | { readonly outcome: 'error'; readonly error: unknown }>
  >({});
  // The outcomes belong to the SELECTED member: a switch clears them, and a call still in flight for the previous member
  // ⛔ never writes into the new member's map (code review round 3 — A → B → A brought A's old alerts back).
  const memberRef = useRef(memberId);
  useEffect(() => {
    memberRef.current = memberId;
    setFilingOutcomes({});
  }, [memberId]);

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
        <button type="button" className="underline" disabled={listQ.isFetching} onClick={() => void listQ.refetch()}>
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
          const outcome = filingOutcomes[c.claim_case_id];
          const filingThis = outcome?.outcome === 'pending';
          // Held disabled once filed, through the window before the list's refetch moves this claim off `can_appeal`
          // — and stays that way even after a LATER claim is filed (the per-claim outcome map, not `file.isSuccess`).
          const filedThis = outcome?.outcome === 'success';
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
                  disabled={filingThis || filedThis}
                  onClick={() => {
                    const id = c.claim_case_id;
                    const forMember = memberRef.current;
                    const settle = (next: { readonly outcome: 'success' } | { readonly outcome: 'error'; readonly error: unknown }) => {
                      if (memberRef.current === forMember) setFilingOutcomes((prev) => ({ ...prev, [id]: next }));
                    };
                    setFilingOutcomes((prev) => ({ ...prev, [id]: { outcome: 'pending' } }));
                    void file.mutateAsync(id).then(
                      () => settle({ outcome: 'success' }),
                      (error: unknown) => settle({ outcome: 'error', error }),
                    );
                  }}
                  data-testid={`helpline-appeal-file-${c.claim_case_id}`}
                >
                  {resolveEn(filingThis ? 'helpline.appeal.filing' : 'helpline.appeal.file')}
                </button>
              ) : null}
              {filedThis ? (
                <p role="status" data-testid="helpline-appeal-filed">
                  {resolveEn('helpline.appeal.filed')}
                </p>
              ) : null}
              {/* A refusal shows only while the row is still `can_appeal`: once the refetch says the claim is under appeal
                  (another operator filed it, or the POST landed and only the response was lost), "could not be filed"
                  would contradict the row beside it (code review round 3). */}
              {outcome?.outcome === 'error' && c.eligibility === 'can_appeal' ? (
                <p role="alert" className="text-red-700" data-testid="helpline-appeal-refused">
                  {filingRefusal(outcome.error)}
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
