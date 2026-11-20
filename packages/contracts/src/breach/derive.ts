// Story 14.3 (decision `2026-11-20-467` DL6) — the ONE derivation of a breach incident's view. Pure. The API and the admin page
// both call this; nothing it returns is stored. (The domain's in-lock backstop cannot import this package — it carries two small
// write rules of its own, pinned equal to this function by tests/breach.test.ts.)

import type { BreachEntry, BreachIncidentView } from './schemas.js';

/** DPDP Rules 2025, Rule 7(2)(b): "within seventy-two hours of becoming aware of the breach". LOCKSTEP: the domain's window. */
export const BREACH_BOARD_REPORT_WINDOW_HOURS = 72;

const HOUR_MS = 60 * 60 * 1000;

function bySeq(a: BreachEntry, b: BreachEntry): number {
  const x = BigInt(a.entrySeq);
  const y = BigInt(b.entrySeq);
  return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * Derive everything shown about an incident from its entries, as of `now`.
 *   status            — `closed` once a `closed` entry exists, else `open`.
 *   boardReportDueAt  — the LATEST recorded extension's `grantedUntil`, else awareness + 72 hours.
 *   boardReportOverdue — open AND no 72-hour report recorded AND `now` is after the due time.
 *   latestAssessment  — the last `assessment` (earlier ones stay on the timeline).
 * Entries are consumed in `entrySeq` order whatever order the array arrives in.
 */
export function deriveBreachIncidentView(
  incident: { readonly isRehearsal: boolean; readonly becameAwareAt: string },
  entries: readonly BreachEntry[],
  now: Date,
): BreachIncidentView {
  const ordered = [...entries].sort(bySeq);
  let closed = false;
  let dueMs = Date.parse(incident.becameAwareAt) + BREACH_BOARD_REPORT_WINDOW_HOURS * HOUR_MS;
  let principalsNoticeRecorded = false;
  let boardInitialRecorded = false;
  let boardReportRecorded = false;
  let signoffRecorded = false;
  let latestAssessment: BreachIncidentView['latestAssessment'] = null;
  let causeFindings: BreachIncidentView['causeFindings'] = null;
  const mitigations: BreachIncidentView['mitigations'] = [];
  const remedials: string[] = [];
  const principalsNotices: BreachIncidentView['principalsNotices'] = [];
  const timelineEvents: BreachIncidentView['timelineEvents'] = [];

  for (const e of ordered) {
    switch (e.kind) {
      case 'assessment':
        latestAssessment = e.payload;
        break;
      case 'timeline_event':
        timelineEvents.push(e.payload);
        break;
      case 'mitigation':
        mitigations.push(e.payload);
        break;
      case 'cause_findings':
        causeFindings = e.payload;
        break;
      case 'remedial':
        remedials.push(e.payload.measures);
        break;
      case 'principals_notice_recorded':
        principalsNoticeRecorded = true;
        principalsNotices.push(e.payload);
        break;
      case 'board_initial_recorded':
        boardInitialRecorded = true;
        break;
      case 'board_report_recorded':
        boardReportRecorded = true;
        break;
      case 'board_extension_recorded':
        dueMs = Date.parse(e.payload.grantedUntil);
        break;
      case 'signoff_recorded':
        signoffRecorded = true;
        break;
      case 'closed':
        closed = true;
        break;
      case 'cert_in_report_recorded':
      case 'owner_review':
      case 'note':
        break;
    }
  }
  timelineEvents.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));

  return {
    status: closed ? 'closed' : 'open',
    boardReportDueAt: new Date(dueMs).toISOString(),
    boardReportOverdue: !closed && !boardReportRecorded && now.getTime() > dueMs,
    principalsNoticeRecorded,
    boardInitialRecorded,
    boardReportRecorded,
    signoffRecorded,
    isRehearsal: incident.isRehearsal,
    becameAwareAt: new Date(Date.parse(incident.becameAwareAt)).toISOString(),
    latestAssessment,
    mitigations,
    causeFindings,
    remedials,
    principalsNotices,
    timelineEvents,
  };
}
