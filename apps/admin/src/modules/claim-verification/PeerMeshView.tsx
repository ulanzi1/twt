// `<PeerMeshView>` — the neighbours' answers as staff see them (Story 6.27a PM13), and the three non-present states.
// ⭐ Story 6.27b (BF8) — EXTRACTED from `SignalsPanel.tsx` (⛔ a behaviour change there) so the verifier console AND the
// later approvers' `<NeighboursAnswersPanel>` render the SAME view and can ⛔ never drift — and so row 6-36's source line
// (`-326` BD1 A) lands on both by construction. Pure presentational; English only (F22).
//   · per answer, the WARNING FLAG (PM13's flags; AC8): ⚠ a line for `true`, "could not be checked just now" for `null`,
//     nothing for `false` — ⛔ a date in any of those words;
//   · the call-back number labelled by WHY it is shown (`-328` read with `-329`): "May be phoned on" for a neighbour's
//     "Yes" (`consented`), "Mobile" for the Super Admin's reading (`super_admin`) and for EVERY other case (an unavailable
//     number, a `null` basis — review S9) — ⛔ never "may be phoned" beside a "No";
//   · ⭐ Story 6.27d (R5) — the inspector's discrepancy block (which questions differed, the re-ask notes with author);
//   · ⭐ Story 6.36 (SW24, SW20) — where each person came from (*"Chosen from the workplace"* / *"Named by the member"*)
//     BESIDE the "How do you know [member]?" (`relationship`) answer when the reply has one, otherwise in the ping's header
//     (an unanswered ping shows it too), nothing for `null` (a 6.6 selection); and the staff line once at the top.

import type { GroundInspectionFamilyAccountVisit, PeerMeshSection, PeerMeshTranscript } from '@twt/contracts';
import type { ReactElement } from 'react';

import { formatIst } from './NomineeDeclarationPanel.js';
import { verifierConsoleEn as t } from './i18n-en.js';

/**
 * ⭐ Story 6.32 (IQ7; AC8, AC10) — the WHOLE neighbours' section as staff see it, ONE component for the console and the
 * approvers' panel (they can ⛔ drift): `present` ⇒ the neighbours' view, `empty` / `unavailable` ⇒ the non-present state;
 * and, on `present` AND `empty`, the family's account at the inspection (a no-one-asked claim has ⛔ selection — its
 * head's letter is the answer that matters there).
 */
export function PeerMeshSectionView({ section }: { section: PeerMeshSection }): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      {section.status === 'present' ? <PeerMeshView transcript={section.transcript} /> : <NonPresent status={section.status} />}
      {section.status !== 'unavailable' && section.familyAccount.length > 0 && <FamilyAccountView visits={section.familyAccount} />}
    </div>
  );
}

/** ⭐ Story 6.32 — the family's answers per completed full visit; the head's letter ALWAYS said (AC10 — "not recorded" too). */
export function FamilyAccountView({ visits }: { visits: readonly GroundInspectionFamilyAccountVisit[] }): ReactElement {
  const words = t.peerMesh.familyAccount;
  return (
    <section className="flex flex-col gap-2 rounded border p-2" data-testid="family-account" aria-label={words.heading}>
      <p className="font-medium">{words.heading}</p>
      <p className="text-xs opacity-70">{words.contextOnly}</p>
      {visits.map((v) => {
        const letter = v.answers.find((a) => a.questionKey === 'head_letter');
        const letterCode = letter?.value.kind === 'codes' ? letter.value.codes[0] : undefined;
        const letterWords =
          letter === undefined
            ? words.letterValue.not_recorded
            : letterCode === 'collected' || letterCode === 'not_collected'
              ? words.letterValue[letterCode]
              : words.unavailable;
        return (
          <div key={v.groundInspectionId} className="flex flex-col gap-1" data-testid="family-account-visit">
            <p className="text-xs opacity-70">{v.completedAt === null ? words.visitUndated : words.visit(formatIst(v.completedAt))}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <div className="contents" data-testid="family-account-letter">
                <dt className="opacity-80">{words.letter}</dt>
                <dd>{letterWords}</dd>
              </div>
              {v.answers
                .filter((a) => a.questionKey !== 'head_letter')
                .map((a) => (
                  <div key={a.questionKey} className="contents" data-testid={`family-account-${a.questionKey}`}>
                    <dt className="opacity-80">{a.question}</dt>
                    <dd>{a.value.kind === 'codes' ? a.value.labels.join(', ') : words.unavailable}</dd>
                  </div>
                ))}
            </dl>
          </div>
        );
      })}
    </section>
  );
}

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
      {/* ⭐ Story 6.36 (SW20) — the staff line, once, only when true. */}
      {transcript.recentChangeBeforeFiling === true && (
        <p className="font-medium text-amber-800" data-testid="peer-mesh-recent-change">
          {t.peerMesh.recentChangeBeforeFiling}
        </p>
      )}
      <p>
        {t.peerMesh.responders}: <strong>{transcript.distinctResponderCount}</strong> · {t.peerMesh.pinged}:{' '}
        <strong>{transcript.pingedMemberIds.length}</strong>
      </p>
      {/* ⭐ Story 6.27a (PM13) — per neighbour: the name, the send status, every live answer, the call-back mobile. */}
      <ul className="flex flex-col gap-3" data-testid="peer-mesh-pings">
        {transcript.pings.map((ping) => {
          // Story 6.36 (SW24) — beside the `relationship` answer when there is one, otherwise in the header.
          const besideAnswer = ping.reply?.answers.some((a) => a.questionKey === 'relationship') === true;
          return (
            <li key={ping.pingId} className="rounded border p-2" data-testid="peer-mesh-ping">
              <div className="flex items-center justify-between gap-2">
                <strong>
                  {ping.responderName.status === 'shown'
                    ? ping.responderName.text
                    : ping.responderName.status === 'unavailable'
                      ? t.peerMesh.couldNotShow
                      : t.peerMesh.noName}
                </strong>
                {!besideAnswer && <SourceLine source={ping.source} />}
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
                      <PeerAnswerRow key={a.questionKey} answer={a} source={a.questionKey === 'relationship' ? ping.source : null} />
                    ))}
                  </dl>
                </>
              )}
              {ping.callbackMobile.status !== 'none' && (
                <p className="mt-1 text-xs" data-testid="peer-mesh-callback">
                  {/* Story 6.27b (`-329`) — the label says WHY the number is shown. The consent words ONLY for a number
                      shown on a "Yes"; every other case (the Super Admin's basis, an unavailable number, a `null` basis)
                      takes the neutral "Mobile" — fail CLOSED, ⛔ never "may be phoned" without a recorded consent (review S9). */}
                  {ping.callbackMobile.status === 'shown' && ping.callbackBasis === 'consented'
                    ? t.peerMesh.callbackMobile
                    : t.peerMesh.callbackMobileSuperAdmin}
                  :{' '}
                  {ping.callbackMobile.status === 'shown' ? <span className="font-mono">{ping.callbackMobile.text}</span> : t.peerMesh.couldNotShow}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {/* ⭐ Story 6.27d (R5) — the inspector's discrepancy, ONLY here (inside the section a hidden reader never receives). */}
      {transcript.inspectionDiscrepancies.length > 0 && <InspectionDiscrepancies items={transcript.inspectionDiscrepancies} />}
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

/**
 * ⭐ Story 6.27d (R5, R4a; AC6) — per completed full visit whose result was recorded: which questions the inspector was
 * shown as differing, and the family's re-told answer to each, labelled "Recorded after the difference was shown" with
 * its author and time. A note that could ⛔ be decrypted says so — ⛔ never a blank.
 */
function InspectionDiscrepancies({ items }: { items: PeerMeshTranscript['inspectionDiscrepancies'] }): ReactElement {
  const words = t.peerMesh.inspectionDiscrepancy;
  return (
    <section className="flex flex-col gap-2 rounded border p-2" data-testid="peer-mesh-inspection-discrepancies" aria-label={words.heading}>
      <p className="font-medium">{words.heading}</p>
      {items.map((item) => (
        <div key={item.groundInspectionId} className="flex flex-col gap-1" data-testid="peer-mesh-inspection-discrepancy">
          <p className="text-xs opacity-70">{words.shown(formatIst(item.completedAt), formatIst(item.shownAt))}</p>
          {item.questionKeys.length === 0 ? (
            <p className="text-xs">{words.noDifference}</p>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {item.questionKeys.map((k) => {
                const n = item.notes.find((x) => x.questionKey === k) ?? null;
                return (
                  <div key={k} className="contents" data-testid={`peer-mesh-inspection-discrepancy-${k}`}>
                    <dt className="opacity-80">{words.question[k]}</dt>
                    <dd>
                      {n === null ? (
                        <span className="opacity-70">{words.noNote}</span>
                      ) : (
                        <>
                          <span className="block text-[11px] font-medium opacity-80">{words.label}</span>
                          <span className="block">{typeof n.note === 'string' ? n.note : words.noteUnavailable}</span>
                          <span className="block opacity-60">{words.by(n.authorDisplay, formatIst(n.notedAt))}</span>
                        </>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>
      ))}
    </section>
  );
}

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

type PeerSource = PeerMeshTranscript['pings'][number]['source'];

/** Story 6.36 (SW24) — *"Chosen from the workplace"* / *"Named by the member"*; ⛔ anything for `null`. */
function SourceLine({ source }: { source: PeerSource }): ReactElement | null {
  if (source === null) return null;
  return (
    <span className="text-xs font-medium" data-testid="peer-mesh-source" data-source={source}>
      {t.peerMesh.source[source]}
    </span>
  );
}

function PeerAnswerRow({ answer, source }: { answer: PeerAnswer; source: PeerSource }): ReactElement {
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
        {source !== null && (
          <span className="block">
            <SourceLine source={source} />
          </span>
        )}
      </dd>
    </>
  );
}
