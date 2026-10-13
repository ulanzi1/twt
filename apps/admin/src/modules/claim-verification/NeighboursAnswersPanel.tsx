// `<NeighboursAnswersPanel>` — the neighbours' answers for a LATER approver (Story 6.27b, PM24; `2026-10-10-310` CF2:
// *"whoever approves the claim at a later step … for that claim at that step only"*). Mounted on the four later-approver
// hosts (the cycle-freeze card, the R9 panel, the escalation panel, the no-correction strip), OUTSIDE every approve-only
// or warnings-only branch — the approver reads BEFORE choosing.
//
// ⛔⛔ THE FETCH IS ON DEMAND AND THAT IS A PII CONTROL (the `NomineeNameCheckDisclosure` model, BF7): each open is ONE
// fresh, AUDITED read that may decrypt a neighbour's name and call-back number; the cycle-freeze list renders up to 1,500
// cards. ⇒ ⛔ request before the first open, ⛔ refetch on window focus, and the answers are FORGOTTEN on close.
// It renders the SAME `<PeerMeshView>` as the console (so the two can ⛔ never drift); `<NonPresent>` for `empty` /
// `unavailable` and a failed request; "Nothing to show at this step" for a 404 (⛔ the transient-fault words — the
// claim is simply ⛔ at an approving step); and ⛔ NOTHING — the disclosure itself removed — when the section is hidden
// from this reader (PM25 (c): ⛔ a title, ⛔ a hint). English only (F22).

import { useState } from 'react';

import { ApiError } from '../../api/client.js';
import { useClaimPeerAnswers, useForgetClaimPeerAnswers } from '../../api/hooks.js';
import { NonPresent, PeerMeshView } from './PeerMeshView.js';
import { verifierConsoleEn as t } from './i18n-en.js';

export interface NeighboursAnswersPanelProps {
  pariwarId: string;
  claimCaseId: string;
  /** A test id for the toggle, so each host surface stays individually assertable. */
  testId?: string;
}

export function NeighboursAnswersPanel({
  pariwarId,
  claimCaseId,
  testId = 'neighbours-answers-toggle',
}: NeighboursAnswersPanelProps): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const answers = useClaimPeerAnswers(pariwarId, claimCaseId, open);
  const forget = useForgetClaimPeerAnswers(pariwarId, claimCaseId);

  // PM25 (c) — hidden from this reader: ⛔ the disclosure at all (⛔ "hidden" words, which would themselves tell an
  // inspector that a neighbour answered).
  if (open && answers.data !== undefined && answers.data.peerMesh === undefined) return null;

  const notAtStep = answers.error instanceof ApiError && answers.error.status === 404;
  const peerMesh = answers.data?.peerMesh;
  return (
    <div className="mt-3 border-t pt-3" data-testid="neighbours-answers-panel">
      <button
        type="button"
        data-testid={testId}
        className="text-sm underline"
        aria-expanded={open}
        onClick={() => {
          // ⭐ Closing FORGETS the answers (see `useForgetClaimPeerAnswers`).
          if (open) forget();
          setOpen((v) => !v);
        }}
      >
        {t.neighboursPanel.toggle}
      </button>
      {open ? (
        <div className="mt-2" data-testid="neighbours-answers-body">
          {answers.isLoading ? (
            <p className="text-sm opacity-70">{t.neighboursPanel.loading}</p>
          ) : notAtStep ? (
            <p className="text-sm opacity-70" data-testid="neighbours-answers-not-at-step">
              {t.neighboursPanel.notAtStep}
            </p>
          ) : answers.isError ? (
            <NonPresent status="unavailable" />
          ) : peerMesh?.status === 'present' ? (
            <PeerMeshView transcript={peerMesh.transcript} />
          ) : peerMesh !== undefined ? (
            <NonPresent status={peerMesh.status} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
