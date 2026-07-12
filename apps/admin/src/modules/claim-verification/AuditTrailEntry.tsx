// `<AuditTrailEntry>` — the UX-DR44 immediate audit-trail entry (Story 6.11, Task 6; AC4).
//
// Pure presentational. Renders ONE decision as a semantic-verb line ("Approved by Anita", not "status
// changed") + the reason code, the decision-time actor_display SNAPSHOT (AC7), and the timestamp. A
// compact timeline variant renders a list of entries (section (e)'s full transcript, including
// superseded + escalated rows with their linkage visible). NEVER renders the rationale in the compact
// list header (it is only shown on the authorized detail read); it accepts an optional rationale to
// display inline where the surface is authorized.

import type { ReactElement } from 'react';

import { verifierConsoleEn as t } from './i18n-en.js';

export interface AuditTrailEntryData {
  outcome: string;
  reasonCode: string;
  actorDisplay: string;
  decidedAt: string;
  /** The authorized-decrypted rationale, when the surface shows it inline (section (e)); else omitted. */
  rationale?: string | null;
  /** True when this row was superseded by a later revision (AC5/AC6 — shown with linkage). */
  superseded?: boolean;
  /** True when this row is itself a revision of an earlier decision (AC5). */
  isRevision?: boolean;
}

const VERB: Record<string, string> = {
  approved: t.audit.approvedBy,
  denied: t.audit.deniedBy,
  escalated: t.audit.escalatedBy,
};

const REASON_LABELS = t.reasonCodes as Record<string, string>;

/** A single audit-trail entry (the immediate post-decision confirmation + the transcript row). */
export function AuditTrailEntry({ entry }: { entry: AuditTrailEntryData }): ReactElement {
  // A revision keeps the SAME outcome as the decision it corrects (D-E) — check `isRevision` FIRST, else
  // the outcome-keyed lookup below would always win and a revision would read as a fresh "Denied by X"
  // rather than the correction it actually is.
  const verb = entry.isRevision ? t.audit.revisedBy : (VERB[entry.outcome] ?? t.audit.revisedBy);
  return (
    <li
      className="flex flex-col gap-0.5 border-l-2 pl-3 text-sm"
      data-testid="audit-trail-entry"
      data-outcome={entry.outcome}
      data-superseded={entry.superseded ? 'true' : undefined}
    >
      <span>
        <strong>{verb}</strong> <span data-testid="audit-actor">{entry.actorDisplay}</span>
      </span>
      <span className="text-xs opacity-70">
        {REASON_LABELS[entry.reasonCode] ?? entry.reasonCode} · <time>{entry.decidedAt}</time>
      </span>
      {entry.rationale ? (
        <span className="text-xs opacity-80" data-testid="audit-rationale">
          {entry.rationale}
        </span>
      ) : null}
      {entry.isRevision ? (
        <span className="text-xs italic opacity-50">{t.audit.revisionOfNote}</span>
      ) : null}
      {entry.superseded ? (
        <span className="text-xs italic opacity-50" data-testid="audit-superseded">
          {t.audit.supersededNote}
        </span>
      ) : null}
    </li>
  );
}

/** A compact timeline of decision entries (section (e)'s full transcript). Empty → a first-class note. */
export function AuditTrail({ entries }: { entries: AuditTrailEntryData[] }): ReactElement {
  if (entries.length === 0) {
    return (
      <p className="text-sm opacity-70" data-testid="audit-trail-empty">
        {t.audit.empty}
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-2" aria-label={t.audit.heading} data-testid="audit-trail">
      {entries.map((e, i) => (
        <AuditTrailEntry key={`${e.decidedAt}-${i}`} entry={e} />
      ))}
    </ol>
  );
}
