// Claim-denial appeal admin page — Story 6.16 (Task 8). The container that wires the hooks to the pure
// <AppealStageControls> + <AppealAuditLookup>. `pariwarId` is a prop (from the route) so the page is testable
// without a router. NO client-side grant gate — the appeal keys are per-Pariwar/district grants, so the REAL
// boundary is the server's requirePermissionHook (+ step-up on finalize/stage3, + the D-G legal-review gate);
// a non-holder or a pending-review Pariwar sees the API 403/503 surfaced here.

import type { ReactElement } from 'react';
import { useState } from 'react';

import { ApiError, errorMessage } from '../../api/client.js';
import {
  useAppealCase,
  useAppealDecisionsByReviewer,
  useCancelAppealPanel,
  useCastAppealVote,
  useDecideAppealStage3,
  useFinalizeAppealPanel,
  useOpenAppealPanel,
  useReviewAppealStage1,
} from '../../api/hooks.js';
import { AppealAuditLookup } from './AppealAuditLookup.js';
import { AppealStageControls } from './AppealStageControls.js';
import { appealEn as t } from './i18n-en.js';

export interface AppealPageProps {
  pariwarId: string;
}

export function AppealPage({ pariwarId }: AppealPageProps): ReactElement {
  const [claimInput, setClaimInput] = useState('');
  const [claimId, setClaimId] = useState<string | null>(null);
  const cse = useAppealCase(pariwarId, claimId);

  const [reviewerQuery, setReviewerQuery] = useState<string | null>(null);
  const [stageQuery, setStageQuery] = useState<'1' | '2' | '3' | undefined>(undefined);
  const audit = useAppealDecisionsByReviewer(pariwarId, reviewerQuery, stageQuery ? { stage: stageQuery } : undefined);

  const cid = claimId ?? '';
  const stage1 = useReviewAppealStage1(pariwarId, cid);
  const openPanel = useOpenAppealPanel(pariwarId, cid);
  const vote = useCastAppealVote(pariwarId, cid);
  const finalize = useFinalizeAppealPanel(pariwarId, cid);
  const cancel = useCancelAppealPanel(pariwarId, cid);
  const stage3 = useDecideAppealStage3(pariwarId, cid);

  const busy = stage1.isPending || openPanel.isPending || vote.isPending || finalize.isPending || cancel.isPending || stage3.isPending;
  const actionError =
    errorMessage(stage1.error) ?? errorMessage(openPanel.error) ?? errorMessage(vote.error) ?? errorMessage(finalize.error) ?? errorMessage(cancel.error) ?? errorMessage(stage3.error);
  // D-D: the server rejects a conflicted Stage-1 reviewer with the stable `appeal.reviewer_conflict` code
  // (409); check the code, not the message text (a copy edit must not silently break this, 6.16 review).
  const conflict = stage1.error instanceof ApiError && stage1.error.code === 'appeal.reviewer_conflict';

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">{t.page.title}</h1>
        <p className="text-sm opacity-70">{t.page.intro}</p>
      </header>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setClaimId(claimInput.trim() === '' ? null : claimInput.trim());
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span>{t.page.claimLabel}</span>
          <input data-testid="claim-input" value={claimInput} onChange={(e) => setClaimInput(e.target.value)} className="rounded border p-1" />
        </label>
        <button type="submit" className="rounded bg-brand-primary px-3 py-1 text-sm text-white">{t.page.load}</button>
      </form>

      {claimId === null ? (
        <p className="text-sm opacity-60">{t.page.noClaim}</p>
      ) : cse.isLoading ? (
        <p role="status">…</p>
      ) : cse.isError ? (
        <p role="alert" className="text-status-fail-fg">{errorMessage(cse.error)}</p>
      ) : cse.data ? (
        <AppealStageControls
          claimState={cse.data.claim_state}
          journey={cse.data.journey}
          session={cse.data.session}
          tally={cse.data.tally}
          sla={cse.data.sla}
          conflict={conflict}
          busy={busy}
          {...(actionError !== undefined ? { error: actionError } : {})}
          onStage1={(decision, rationale, disposition) => stage1.mutate({ decision, rationale, ...(disposition ? { disposition_category: disposition } : {}) })}
          onOpenPanel={(panelActorIds) => openPanel.mutate({ panel_actor_ids: panelActorIds })}
          onVote={(v, rationale) => vote.mutate({ vote: v, rationale })}
          onFinalize={(rationale, disposition) => finalize.mutate({ rationale, ...(disposition ? { disposition_category: disposition } : {}) })}
          onCancel={(reasonCode, rationale) => cancel.mutate({ reason_code: reasonCode, rationale })}
          onStage3={(decision, rationale, disposition) => stage3.mutate({ decision, rationale, ...(disposition ? { disposition_category: disposition } : {}) })}
        />
      ) : null}

      <AppealAuditLookup
        decisions={audit.data?.decisions ?? null}
        isLoading={audit.isLoading && reviewerQuery !== null}
        {...(errorMessage(audit.error) !== undefined ? { error: errorMessage(audit.error) } : {})}
        onLookup={(reviewerActorId, stage) => {
          setReviewerQuery(reviewerActorId);
          setStageQuery(stage);
        }}
      />
    </div>
  );
}
