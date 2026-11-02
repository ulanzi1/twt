// Story 6.22 (DL10 (iv)) — the District Admin's WORK-LIST: claims the helpline FLAGGED (someone says the member is alive) with
// ⛔ finding yet, in the viewer's districts (the server checks each row at its own district). ids, states and dates only — ⛔ a
// name, ⛔ a note. Each row opens the verifier console, where the finding is recorded (the console is entered by claim id, so
// without this list a flag would reach no one).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { ApiError } from '../api/client.js';
import { useOpenFraudInvestigations, useSession } from '../api/hooks.js';
import { formatIst } from '../modules/claim-verification/NomineeDeclarationPanel.js';
import { fraudInvestigationEn, verifierConsoleEn } from '../modules/claim-verification/i18n-en.js';
import { fraudInvestigationsPath } from './login-next.js';

const t = fraudInvestigationEn.workList;

export function FraudInvestigationsRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/fraud-investigations' });
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login', search: { next: fraudInvestigationsPath(pariwarId) } });
  }, [session.isError, navigate, pariwarId]);
  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  return <FraudInvestigationsView pariwarId={pariwarId} />;
}

export function FraudInvestigationsView({ pariwarId }: { pariwarId: string }): ReactElement {
  const navigate = useNavigate();
  const list = useOpenFraudInvestigations(pariwarId);
  const status = list.error instanceof ApiError ? list.error.status : null;
  useEffect(() => {
    if (status === 401) void navigate({ to: '/login', search: { next: fraudInvestigationsPath(pariwarId) } });
  }, [status, navigate, pariwarId]);
  const labels: Record<string, string> = verifierConsoleEn.nomineeDeclaration.refusals.claimStateLabels;
  const items = list.data?.items ?? [];

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-lg font-semibold">{t.heading}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.intro}</p>
      {list.isLoading ? (
        <p role="status" data-testid="fraud-investigations-loading" className="mt-4 text-sm">
          {t.loading}
        </p>
      ) : status === 403 ? (
        <p role="alert" data-testid="fraud-investigations-forbidden" className="mt-4 text-sm">
          {t.forbidden}
        </p>
      ) : list.isError ? (
        <p role="alert" data-testid="fraud-investigations-error" className="mt-4 text-sm">
          {t.loadError}
        </p>
      ) : items.length === 0 ? (
        // Announced, like its siblings' empty states (`NomineeRefusalsRoute`; R2-10).
        <p role="status" data-testid="fraud-investigations-empty" className="mt-4 text-sm">
          {t.empty}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3" data-testid="fraud-investigations-list">
          {items.map((item) => (
            <li key={item.claim_case_id} className="rounded border p-3 text-sm" data-testid={`fraud-investigations-item-${item.claim_case_id}`}>
              {/* ⛔ The trigger-blind staff label ("another claim … goes ahead", G9) is FALSE for a claim a guilty finding closed. */}
              <p className="font-medium">{item.claim_state === 'closed' ? fraudInvestigationEn.result.closedPlain : (labels[item.claim_state] ?? '—')}</p>
              <p className="text-xs">
                {t.flaggedOn} {formatIst(item.flagged_at)} · {t.filedOn} {formatIst(item.claim_filed_at)}
              </p>
              {/* R2-6 — one person may hold both keys: a claim the VIEWER flagged is theirs to see, ⛔ to find. Shown, ⛔ hidden (a
                  lone Super Admin must still see that it exists). */}
              {item.is_flagger ? (
                <p className="mt-1 text-xs" data-testid={`fraud-investigations-you-flagged-${item.claim_case_id}`}>
                  {fraudInvestigationEn.youFlagged}
                </p>
              ) : null}
              <button
                type="button"
                className="mt-2 rounded border px-3 py-1 text-sm"
                data-testid={`fraud-investigations-open-${item.claim_case_id}`}
                aria-label={`${t.open}: ${item.claim_state === 'closed' ? fraudInvestigationEn.result.closedPlain : (labels[item.claim_state] ?? '—')}, ${t.filedOn} ${formatIst(item.claim_filed_at)}`}
                onClick={() => void navigate({ to: '/p/$pariwarId/claims/$claimCaseId/verify', params: { pariwarId, claimCaseId: item.claim_case_id } })}
              >
                {t.open}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
