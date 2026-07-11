// `<SignalsPanel>` — the six labeled verifier-signal sections (Story 6.10, Task 4; AC2/AC7). Pure
// presentational: it renders a `VerifierConsolePacket` (assembled + decrypted server-side) and NEVER
// takes a decision (AC4 — approve/deny/escalate is Story 6.11's decision strip, mounted by the shell).
//
// The four-state section vocabulary (AC7) is rendered DISTINCTLY and NEVER collapsed: `empty` (no
// records yet), `unavailable` (a transient dependency failure — try again), `not_available_yet` (a
// later release provides it). The concealment tri-state renders `not_evaluated` as an explicit
// "not yet evaluated" affordance — NEVER a green/clear (D10).

import type {
  ConcealmentSignal,
  PeerMeshTranscript,
  VerifierConsolePacket,
  VerifierReviewItem,
} from '@twt/contracts';
import type { ReactElement, ReactNode } from 'react';

import { VerifierReviewPanel, type VerifierReviewData } from './VerifierReviewPanel.js';
import { verifierConsoleEn as t } from './i18n-en.js';

/** A labeled section wrapper with an accessible heading + region landmark. */
function Section({ title, testId, children }: { title: string; testId: string; children: ReactNode }): ReactElement {
  return (
    <section aria-label={title} data-testid={testId} className="flex flex-col gap-2 rounded border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Render one of the three non-present states with its DISTINCT copy (never collapsed). */
function NonPresent({ status }: { status: 'empty' | 'unavailable' | 'not_available_yet' }): ReactElement {
  const copy =
    status === 'empty' ? t.states.empty : status === 'unavailable' ? t.states.unavailable : t.states.notAvailableYet;
  return (
    <p className="text-sm opacity-70" data-testid={`section-state-${status}`} data-section-state={status}>
      {copy}
    </p>
  );
}

function ConcealmentIndicator({ signal }: { signal: ConcealmentSignal }): ReactElement {
  // NEVER render `not_evaluated` (or a redacted absence) as a green/clear (D10). Only an explicit
  // `not_flagged` from a real producer is a "clear"; v1 is always `not_evaluated`.
  const tone =
    signal.status === 'flagged'
      ? 'bg-status-danger-bg text-status-danger-fg'
      : signal.status === 'not_flagged'
        ? 'bg-status-ok-bg text-status-ok-fg'
        : 'bg-status-warn-bg text-status-warn-fg';
  const label =
    signal.status === 'flagged'
      ? t.concealment.flagged
      : signal.status === 'not_flagged'
        ? t.concealment.notFlagged
        : t.concealment.notEvaluated;
  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-block w-fit rounded px-2 py-0.5 text-xs font-medium ${tone}`}
        data-testid="concealment-indicator"
        data-concealment-status={signal.status}
      >
        {label}
      </span>
      {signal.detailVisibility === 'indicator_only' ? (
        <p className="text-xs opacity-60">{t.concealment.indicatorOnly}</p>
      ) : null}
    </div>
  );
}

function ValidityView({ validity }: { validity: VerifierConsolePacket['validity'] }): ReactElement {
  if (validity.status === 'unavailable') return <NonPresent status="unavailable" />;
  const p = validity.payload;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm" data-testid="validity-payload">
      <dt className="opacity-60">{t.validity.validityLabel}</dt>
      <dd>{p.isValid ? t.validity.valid : t.validity.invalid}</dd>
      <dt className="opacity-60">{t.validity.standingLabel}</dt>
      <dd>{p.isActive ? t.validity.active : t.validity.inactive}</dd>
      {p.specialFlags.length > 0 ? (
        <>
          <dt className="opacity-60">{t.validity.specialFlags}</dt>
          <dd>{p.specialFlags.join(', ')}</dd>
        </>
      ) : null}
    </dl>
  );
}

function PeerMeshView({ transcript }: { transcript: PeerMeshTranscript }): ReactElement {
  return (
    <div className="flex flex-col gap-2 text-sm" data-testid="peer-mesh-transcript">
      <p>
        {t.peerMesh.responders}: <strong>{transcript.distinctResponderCount}</strong> · {t.peerMesh.pinged}:{' '}
        <strong>{transcript.pingedMemberIds.length}</strong>
      </p>
      {transcript.responses.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {transcript.responses.map((r, i) => (
            <li key={`${r.responderMemberId}-${i}`} className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs opacity-70">{r.responderMemberId}</span>
              <span className="text-xs">
                {r.response === 'confirmed'
                  ? t.peerMesh.confirmed
                  : r.response === 'denied'
                    ? t.peerMesh.denied
                    : t.peerMesh.unknown}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
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

function toReviewData(item: VerifierReviewItem): VerifierReviewData {
  // VerifierReviewItem is structurally the 6.5 <VerifierReviewPanel> data — pass through.
  return item;
}

export interface SignalsPanelProps {
  packet: VerifierConsolePacket;
}

export function SignalsPanel({ packet }: SignalsPanelProps): ReactElement {
  return (
    <div className="flex flex-col gap-4" data-testid="signals-panel">
      {/* (a) identity + validity + concealment */}
      <Section title={t.sections.identity} testId="section-identity">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="opacity-60">{t.shell.memberLabel}</dt>
          <dd>{packet.identity.deceasedName ?? <span className="opacity-40">—</span>}</dd>
          <dt className="opacity-60">{t.identity.dateOfBirthLabel}</dt>
          <dd>{packet.identity.deceasedDateOfBirth ?? <span className="opacity-40">—</span>}</dd>
        </dl>
        <ValidityView validity={packet.validity} />
      </Section>

      <Section title={t.sections.concealment} testId="section-concealment">
        <ConcealmentIndicator signal={packet.concealment} />
      </Section>

      {/* (b) OCR document parity — embeds the 6.5 <VerifierReviewPanel> per document */}
      <Section title={t.sections.documents} testId="section-documents">
        {packet.documentReview.status === 'present' ? (
          <div className="flex flex-col gap-4">
            {packet.documentReview.reviews.map((rev, i) => (
              <VerifierReviewPanel key={`${rev.documentType}-${i}`} data={toReviewData(rev)} />
            ))}
          </div>
        ) : (
          <NonPresent status={packet.documentReview.status} />
        )}
      </Section>

      {/* (c) peer-mesh transcripts */}
      <Section title={t.sections.peerMesh} testId="section-peer-mesh">
        {packet.peerMesh.status === 'present' ? (
          <PeerMeshView transcript={packet.peerMesh.transcript} />
        ) : (
          <NonPresent status={packet.peerMesh.status} />
        )}
      </Section>

      {/* (d) ground inspection notes + photos */}
      <Section title={t.sections.groundInspection} testId="section-ground-inspection">
        {packet.groundInspection.status === 'present' ? (
          <div className="flex flex-col gap-3">
            {packet.groundInspection.assignments.map((a) => (
              <div key={a.groundInspectionId} className="rounded border p-2 text-sm">
                <p className="flex items-center justify-between gap-2">
                  <span className="font-medium">{a.inspectionStage}</span>
                  <span className="text-xs opacity-70">{a.status}</span>
                </p>
                {a.notes ? <p className="mt-1 text-xs opacity-80">{a.notes}</p> : null}
                {a.photos.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {a.photos.map((ph) => (
                      <img
                        key={ph.photoId}
                        src={ph.signedUrl}
                        alt={ph.caption ?? 'Inspection photo'}
                        className="h-16 w-16 rounded object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <NonPresent status={packet.groundInspection.status} />
        )}
      </Section>

      {/* (e) prior verifier comments */}
      <Section title={t.sections.priorComments} testId="section-prior-comments">
        {packet.priorVerifierComments.status === 'present' ? (
          <ul className="flex flex-col gap-2 text-sm">
            {packet.priorVerifierComments.comments.map((c, i) => (
              <li key={`${c.claimCaseId}-${i}`} className="rounded border p-2">
                <p className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.outcome}</span>
                  <span className="text-xs opacity-60">{c.decidedAt}</span>
                </p>
                <p className="text-xs opacity-80">{c.rationale}</p>
                <p className="text-xs opacity-60">— {c.actorDisplay}</p>
              </li>
            ))}
          </ul>
        ) : (
          <NonPresent status={packet.priorVerifierComments.status} />
        )}
      </Section>

      {/* (f) recent in-scope precedents — recency, NOT similarity */}
      <Section title={t.sections.precedents} testId="section-precedents">
        {packet.recentPrecedents.status === 'present' ? (
          <ul className="flex flex-col gap-2 text-sm">
            {packet.recentPrecedents.precedents.map((p, i) => (
              <li key={`${p.claimCaseId}-${i}`} className="rounded border p-2">
                <p className="flex items-center justify-between gap-2">
                  <span className="font-medium">{p.outcome}</span>
                  <span className="text-xs opacity-60">{p.decidedAt}</span>
                </p>
                {p.rationale ? <p className="text-xs opacity-80">{p.rationale}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <NonPresent status={packet.recentPrecedents.status} />
        )}
      </Section>
    </div>
  );
}
