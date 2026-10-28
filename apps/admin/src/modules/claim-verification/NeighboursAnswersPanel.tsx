// `<NeighboursAnswersPanel>` — the neighbours' answers for a LATER approver (Story 6.27b, PM24; `2026-10-10-310` CF2:
// *"whoever approves the claim at a later step … for that claim at that step only"*). Mounted on the four later-approver
// hosts (the cycle-freeze card, the R9 panel, the escalation panel, the no-correction strip), OUTSIDE every approve-only
// or warnings-only branch — the approver reads BEFORE choosing.
//
// ⛔⛔ THE FETCH IS ON DEMAND AND THAT IS A PII CONTROL (the `NomineeNameCheckDisclosure` model, BF7): each open is ONE
// fresh, AUDITED read that may decrypt a neighbour's name and call-back number; the cycle-freeze list renders up to 1,500
// cards. ⇒ ⛔ request before the first open, ⛔ refetch on window focus, and the answers are FORGOTTEN on close/unmount.
// Each opening has its own query key (review R2); the host's pending-visit flag hides the disclosure BEFORE a fetch,
// and clearing that flag mounts a fresh disclosure (R3/R4). Scope changes reset it too. ⚠ RECORDED (review S3): a
// SERVER-hidden result (the host's snapshot still says "visible" — e.g. it missed the assignment) stays hidden until the
// panel remounts or the host itself observes a hidden → visible transition — fail CLOSED, ⛔ never a background re-read.
// It renders the SAME `<PeerMeshView>` as the console (so the two can ⛔ never drift); `<NonPresent>` for `empty` /
// `unavailable` and a failed request; "Nothing to show at this step" for a 404 (⛔ the transient-fault words — the
// claim is simply ⛔ at an approving step); and ⛔ NOTHING — the disclosure itself removed — when the section is hidden
// from this reader (PM25 (c): ⛔ a title, ⛔ a hint). English only (F22).

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ApprovalWarningsSummary } from '@twt/contracts';

import { ApiError } from '../../api/client.js';
import { useClaimPeerAnswers, useForgetClaimPeerAnswers } from '../../api/hooks.js';
import { NonPresent, PeerMeshSectionView } from './PeerMeshView.js';
import { verifierConsoleEn as t } from './i18n-en.js';

export interface NeighboursAnswersPanelProps {
  pariwarId: string;
  claimCaseId: string;
  /** The host's actor-aware summary — REQUIRED so a known pending inspector gets ⛔ title or fetch. */
  approvalWarnings: ApprovalWarningsSummary | null;
  /** A test id for the toggle, so each host surface stays individually assertable. */
  testId?: string;
}

/** PM24's route says "⛔ at an approving step" with THIS code (`claims.peer-answers.handlers.ts`) — any other 404 is a fault. */
const PEER_ANSWERS_NOT_FOUND = 'claim.peer_answers_not_found';

export function NeighboursAnswersPanel(props: NeighboursAnswersPanelProps): React.ReactElement {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const focusAnchor = useCallback(() => anchorRef.current?.focus(), []);
  // Review S4 — ONLY a known pending visit (or ⛔ no summary at all: a `closure_request`) removes the disclosure. A FAILED
  // host warnings read (`available: false`) keeps it — PM24's route does its own fail-closed hide, so the client gate
  // would add ⛔ no privacy, only a lost read for every approver.
  const hiddenForReader = props.approvalWarnings === null || props.approvalWarnings.own_visit_pending;
  return (
    <>
      {/* Review S11 (a) — a WORDLESS focus target for when the focused toggle is removed (a hidden result, a host flip):
          ⛔ no text, ⛔ no role, rendered for EVERY reader alike (so it carries ⛔ no signal — PM25 (c)); focus ⛔ never falls to <body>. */}
      <span ref={anchorRef} tabIndex={-1} className="sr-only" data-testid="neighbours-answers-focus-anchor" />
      {hiddenForReader ? null : (
        // A hidden → eligible transition mounts new state; changing either scope id does the same. ⛔ background read.
        <EligibleNeighboursAnswersPanel key={`${props.pariwarId}:${props.claimCaseId}`} {...props} onFocusLost={focusAnchor} />
      )}
    </>
  );
}

function EligibleNeighboursAnswersPanel({
  pariwarId,
  claimCaseId,
  approvalWarnings,
  testId = 'neighbours-answers-toggle',
  onFocusLost,
}: NeighboursAnswersPanelProps & { onFocusLost: () => void }): React.ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const focusInside = useCallback(() => panelRef.current?.contains(document.activeElement) === true, []);
  const hide = useCallback(() => {
    if (focusInside()) onFocusLost();
    setHidden(true);
  }, [focusInside, onFocusLost]);
  // Review S11 (a) — the host flipped to hidden (or the scope changed) while the toggle had focus: this layout cleanup
  // runs BEFORE React removes the panel's nodes, so the focus can still be seen — and moved.
  useLayoutEffect(
    () => () => {
      if (focusInside()) onFocusLost();
    },
    [focusInside, onFocusLost],
  );
  // Review S3 — reset on the VALUE that governs visibility here, ⛔ the summary's identity: a kind appearing or a vote
  // moving `waiting_for_district_admin` leaves an OPEN panel open (re-opening would cost another audited read).
  // `own_visit_pending` is the other such value — its `true` unmounts this component (above), so it is `false` here.
  // Reset to CLOSED: the reader explicitly opens again, with ⛔ background audited fetch.
  const available = approvalWarnings?.available;
  useEffect(() => {
    setHidden(false);
    setOpen(false);
    setAnnouncement('');
  }, [available]);

  // PM25 (c) — hidden from this reader: ⛔ the disclosure at all (⛔ "hidden" words, which would themselves tell an
  // inspector that a neighbour answered).
  if (hidden) return null;
  return (
    <div ref={panelRef} className="mt-3 border-t pt-3" data-testid="neighbours-answers-panel">
      <button
        type="button"
        data-testid={testId}
        className="text-sm underline"
        aria-expanded={open}
        onClick={() => {
          // Closing unmounts the read, cancels it and forgets THIS opening's data.
          setAnnouncement(open ? '' : t.neighboursPanel.loading);
          setOpen((v) => !v);
        }}
      >
        {t.neighboursPanel.toggle}
      </button>
      {/* Persistent before the request starts: announce the RESULT without reading the whole PII transcript aloud. */}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
      {open ? (
        <div className="mt-2" data-testid="neighbours-answers-body">
          <NeighboursAnswersRead
            pariwarId={pariwarId}
            claimCaseId={claimCaseId}
            onHidden={hide}
            onAnnouncement={setAnnouncement}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Mounted only for an explicit opening, and never shared with a previous opening or another host. */
function NeighboursAnswersRead({
  pariwarId,
  claimCaseId,
  onHidden,
  onAnnouncement,
}: {
  pariwarId: string;
  claimCaseId: string;
  onHidden: () => void;
  onAnnouncement: (words: string) => void;
}): React.ReactElement | null {
  const readId = useId();
  const answers = useClaimPeerAnswers(pariwarId, claimCaseId, readId);
  const forget = useForgetClaimPeerAnswers(pariwarId, claimCaseId, readId);
  useEffect(() => forget, [forget]);

  const hidden = answers.data !== undefined && answers.data.peerMesh === undefined;
  // Review S10 — the route's OWN not-found code, ⛔ never a bare 404 (a proxy or a version-skewed path is a fault, ⛔ not a settled answer).
  const notAtStep =
    answers.error instanceof ApiError && answers.error.status === 404 && answers.error.code === PEER_ANSWERS_NOT_FOUND;
  const peerMesh = answers.data?.peerMesh;
  // Review S11 (b) — `isPending`, ⛔ not `isLoading`: an offline read is PAUSED (⛔ not fetching), and it must keep saying
  // "Loading…" — ⛔ never a blank body — until the network returns and THIS opening's one read goes out.
  const loading = answers.isPending;
  const words = loading
    ? t.neighboursPanel.loading
    : notAtStep
      ? t.neighboursPanel.notAtStep
      : answers.isError || peerMesh?.status === 'unavailable'
        ? t.states.unavailable
        : peerMesh?.status === 'empty'
          ? t.states.empty
          : peerMesh?.status === 'present'
            ? t.neighboursPanel.ready
            : '';
  useEffect(() => {
    if (hidden) onHidden();
    else onAnnouncement(words);
  }, [hidden, words, onHidden, onAnnouncement]);

  if (hidden) return null;
  if (loading) return <p className="text-sm opacity-70">{t.neighboursPanel.loading}</p>;
  if (notAtStep) {
    return <p className="text-sm opacity-70" data-testid="neighbours-answers-not-at-step">{t.neighboursPanel.notAtStep}</p>;
  }
  if (answers.isError) return <NonPresent status="unavailable" />;
  // ⭐ Story 6.32 — the ONE section view (+ the family's account on `present` / `empty`), shared with the console.
  return peerMesh === undefined ? null : <PeerMeshSectionView section={peerMesh} />;
}
