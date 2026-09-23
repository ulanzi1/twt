// The Pariwar Admin's queue of NOMINEE corrections awaiting STEP 2 — Story 6.20 (AC7; D7).
//
// `2026-09-20-236` Z: *"first District Admin then Pariwar Admin."* The Pariwar Admin cannot open the
// verifier console (it is gated on `claim.verify`), so without this page they could never FIND a request
// waiting for them. Each item opens IN PLACE: the target beside the proposal, and the approve / decline
// controls — a note required either way, and ⛔ never the same person as the District Admin (the server
// refuses it). ⚠ NOMINEE-declaration corrections — ⛔ not the bank-detail correction queue.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { ApiError } from '../api/client.js';
import {
  useNomineeCorrections,
  usePendingNomineeCorrections,
  usePostNomineeCorrectionDecision,
  usePostNomineeCorrectionRaise,
  useSession,
} from '../api/hooks.js';
import { NomineeCorrections, verifierConsoleEn } from '../modules/claim-verification/index.js';
import { nomineeCorrectionErrorMessage } from './VerifierConsoleRoute.js';

const c = verifierConsoleEn.nomineeDeclaration.corrections;

export function NomineeCorrectionsRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);
  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  return <NomineeCorrectionsView />;
}

function NomineeCorrectionsView(): ReactElement {
  const { pariwarId } = useParams({ from: '/p/$pariwarId/nominee-corrections' });
  const pending = usePendingNomineeCorrections(pariwarId);
  const [open, setOpen] = useState<string | null>(null);
  const status = pending.error instanceof ApiError ? pending.error.status : null;
  const claimIds = [...new Set((pending.data?.items ?? []).map((i) => i.claim_case_id))];

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-lg font-semibold">{c.heading}</h1>
      <p className="mt-1 text-sm text-slate-600">{c.intro}</p>
      {pending.isLoading ? (
        <p role="status" className="mt-4 text-sm">
          {verifierConsoleEn.nomineeDeclaration.loading}
        </p>
      ) : status === 403 ? (
        <p role="alert" data-testid="nominee-corrections-forbidden" className="mt-4 text-sm">
          {verifierConsoleEn.nomineeDeclaration.refusals.forbidden}
        </p>
      ) : pending.isError ? (
        <p role="alert" className="mt-4 text-sm">
          {verifierConsoleEn.nomineeDeclaration.loadError}
        </p>
      ) : claimIds.length === 0 ? (
        <p role="status" data-testid="nominee-corrections-pending-empty" className="mt-4 text-sm">
          {c.none}
        </p>
      ) : (
        <ul className="mt-4 space-y-3" data-testid="nominee-corrections-pending">
          {claimIds.map((claimCaseId) => (
            <li key={claimCaseId} className="rounded border p-3 text-sm">
              <button
                type="button"
                className="underline"
                aria-expanded={open === claimCaseId}
                onClick={() => setOpen(open === claimCaseId ? null : claimCaseId)}
              >
                <code className="font-mono text-xs">{claimCaseId}</code> — {c.step.pa_pending}
              </button>
              {open === claimCaseId ? <ClaimCorrections pariwarId={pariwarId} claimCaseId={claimCaseId} /> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function ClaimCorrections({ pariwarId, claimCaseId }: { pariwarId: string; claimCaseId: string }): ReactElement {
  const corrections = useNomineeCorrections(pariwarId, claimCaseId, true);
  const decide = usePostNomineeCorrectionDecision(pariwarId, claimCaseId);
  const raise = usePostNomineeCorrectionRaise(pariwarId, claimCaseId);
  return (
    <NomineeCorrections
      corrections={corrections.data}
      onDecide={async (correctionId, step, outcome, note) => {
        await decide.mutateAsync({ correctionId, step, body: { outcome, note } }).catch(() => undefined);
      }}
      deciding={decide.isPending}
      decideError={decide.error ? nomineeCorrectionErrorMessage(decide.error) : null}
      onRaise={async (body) => {
        await raise.mutateAsync(body).catch(() => undefined);
      }}
      raising={raise.isPending}
      raiseError={raise.error ? nomineeCorrectionErrorMessage(raise.error) : null}
      resetKey={claimCaseId}
    />
  );
}
