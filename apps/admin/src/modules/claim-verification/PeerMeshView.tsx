// `<PeerMeshView>` — the neighbours' answers as staff see them (Story 6.27a PM13), and the three non-present states.
// ⭐ Story 6.27b (BF8) — EXTRACTED from `SignalsPanel.tsx` (⛔ a behaviour change there) so the verifier console AND the
// later approvers' `<NeighboursAnswersPanel>` render the SAME view and can ⛔ never drift — and so row 6-36's source line
// (`-326` BD1 A) lands on both by construction. Pure presentational; English only (F22).
//   · per answer, the WARNING FLAG (PM13's flags; AC8): ⚠ a line for `true`, "could not be checked just now" for `null`,
//     nothing for `false` — ⛔ a date in any of those words;
//   · the call-back number labelled by WHY it is shown (`-328` read with `-329`): "May be phoned on" for a neighbour's
//     "Yes" (`consented`), "Mobile" for the Super Admin's reading (`super_admin`) — ⛔ "may be phoned" beside a "No".

import type { PeerMeshTranscript } from '@twt/contracts';
import type { ReactElement } from 'react';

import { formatIst } from './NomineeDeclarationPanel.js';
import { verifierConsoleEn as t } from './i18n-en.js';

/** Render one of the three non-present states with its DISTINCT copy (never collapsed). */
export function NonPresent({ status }: { status: 'empty' | 'unavailable' | 'not_available_yet' }): ReactElement {
  const copy =
    status === 'empty' ? t.states.empty : status === 'unavailable' ? t.states.unavailable : t.states.notAvailableYet;
  return (
    <p className="text-sm opacity-70" data-testid={`section-state-${status}`} data-section-state={status}>
      {copy}
    </p>
  );
}

export function PeerMeshView({ transcript, now = Date.now() }: { transcript: PeerMeshTranscript; now?: number }): ReactElement {
  // ⭐ Review S39 — a `pending` label whose 72 hours have PASSED is being counted (the worker relabels it); ⛔ "open until"
  // a time already gone.
  const expired = Date.parse(transcript.windowExpiresAt) <= now;
  const windowLine =
    transcript.outcome === 'pending'
      ? expired
        ? t.peerMesh.window.counting
        : t.peerMesh.window.pending(formatIst(transcript.windowExpiresAt))
      : t.peerMesh.window[transcript.outcome];
  return (
    <div className="flex flex-col gap-2 text-sm" data-testid="peer-mesh-transcript">
      {/* ⭐ Story 6.27a (PM13) — the 72-hour line */}
      <p className="font-medium" data-testid="peer-mesh-window">
        {windowLine}
      </p>
      <p>
        {t.peerMesh.responders}: <strong>{transcript.distinctResponderCount}</strong> · {t.peerMesh.pinged}:{' '}
        <strong>{transcript.pingedMemberIds.length}</strong>
      </p>
      {/* ⭐ Story 6.27a (PM13) — per neighbour: the name, the send status, every live answer, the call-back mobile. */}
      <ul className="flex flex-col gap-3" data-testid="peer-mesh-pings">
        {transcript.pings.map((ping) => (
          <li key={ping.pingId} className="rounded border p-2" data-testid="peer-mesh-ping">
            <div className="flex items-center justify-between gap-2">
              <strong>
                {ping.responderName.status === 'shown'
                  ? ping.responderName.text
                  : ping.responderName.status === 'unavailable'
                    ? t.peerMesh.couldNotShow
                    : t.peerMesh.noName}
              </strong>
              <span className="text-xs" data-testid="peer-mesh-send-status">
                {t.peerMesh.sendStatus[ping.sendStatus]}
                {ping.sendStatus === 'no_target' && ping.noTargetReason !== null ? ` — ${ping.noTargetReason}` : ''}
              </span>
            </div>
            {ping.reply === null ? (
              <p className="text-xs opacity-70">{t.peerMesh.noAnswerYet}</p>
            ) : (
              <>
                <p className="text-xs">{ping.reply.submitted ? t.peerMesh.submitted : t.peerMesh.notSubmitted}</p>
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {ping.reply.answers.map((a) => (
                    <PeerAnswerRow key={a.questionKey} answer={a} />
                  ))}
                </dl>
              </>
            )}
            {ping.callbackMobile.status !== 'none' && (
              <p className="mt-1 text-xs" data-testid="peer-mesh-callback">
                {/* Story 6.27b (`-329`) — the label says WHY the number is shown. */}
                {ping.callbackMobile.status === 'shown' && ping.callbackBasis === 'super_admin'
                  ? t.peerMesh.callbackMobileSuperAdmin
                  : t.peerMesh.callbackMobile}
                :{' '}
                {ping.callbackMobile.status === 'shown' ? <span className="font-mono">{ping.callbackMobile.text}</span> : t.peerMesh.couldNotShow}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs opacity-60">{t.peerMesh.signalNote}</p>
      <p className="text-xs opacity-60">{t.peerMesh.noResponseNote}</p>
      {/* AC2c — verifier annotations: no owning producer story yet, ALWAYS not_available_yet (never fabricated). */}
      <p
        className="text-xs opacity-70"
        data-testid="peer-mesh-annotations-state"
        data-section-state={transcript.verifierAnnotations.status}
      >
        {t.peerMesh.annotationsNotAvailableYet}
      </p>
    </div>
  );
}

type PeerAnswer = NonNullable<PeerMeshTranscript['pings'][number]['reply']>['answers'][number];

/** Story 6.27b (AC8) — the per-answer warning line: ⚠ for `true`, "could not be checked" for `null`, nothing for `false`. */
function WarningFlagLine({ answer }: { answer: PeerAnswer }): ReactElement | null {
  if (answer.warningFlag === false) return null;
  if (answer.warningFlag === null) {
    return (
      <span className="block text-amber-800" data-testid="peer-answer-warning-unknown">
        {t.peerMesh.warningFlag.unknown}
      </span>
    );
  }
  const words = answer.questionKey === 'has_died' ? t.peerMesh.warningFlag.has_died : t.peerMesh.warningFlag.death_date;
  return (
    <span className="block font-medium text-amber-800" data-testid="peer-answer-warning">
      {words}
    </span>
  );
}

function PeerAnswerRow({ answer }: { answer: PeerAnswer }): ReactElement {
  const value =
    answer.value.kind === 'codes'
      ? answer.value.labels.join(', ')
      : answer.value.kind === 'date'
        ? answer.value.date.split('-').reverse().join('-')
        : t.peerMesh.couldNotShow;
  return (
    <>
      <dt className="opacity-80">{answer.question}</dt>
      <dd>
        <span className="font-medium">{value}</span>{' '}
        <span className="opacity-60">
          ({answer.savedVia === 'helpline' ? t.peerMesh.savedHelpline : t.peerMesh.savedApp}, {formatIst(answer.savedAt)}
          {answer.changeCount > 0 ? `, ${t.peerMesh.changed(answer.changeCount)}` : ''})
        </span>
        <WarningFlagLine answer={answer} />
      </dd>
    </>
  );
}
