// Story 14.3 (decision `2026-11-20-467` DL6) — the ONE derivation of a breach incident's view. Pure. The API and the admin page
// both call this; nothing it returns is stored. (The domain's in-lock backstop cannot import this package — it carries two small
// write rules of its own, pinned equal to this function by tests/breach.test.ts.)

import type { BreachEntry, BreachIncidentView } from './schemas.js';

/** DPDP Rules 2025, Rule 7(2)(b): "within seventy-two hours of becoming aware of the breach". LOCKSTEP: the domain's window. */
export const BREACH_BOARD_REPORT_WINDOW_HOURS = 72;

const HOUR_MS = 60 * 60 * 1000;

/** The Board report's due time from `entries` alone (a prefix, in `entrySeq` order): the latest extension not withdrawn. */
function dueFrom(becameAwareAtMs: number, entries: readonly BreachEntry[]): number {
  const withdrawn = new Set<string>();
  for (const e of entries) if (e.kind === 'board_extension_withdrawn') withdrawn.add(e.payload.withdrawsEntryId.toLowerCase());
  let due = becameAwareAtMs + BREACH_BOARD_REPORT_WINDOW_HOURS * HOUR_MS;
  for (const e of entries) if (e.kind === 'board_extension_recorded' && !withdrawn.has(e.entryId.toLowerCase())) due = Date.parse(e.payload.grantedUntil);
  return due;
}

function bySeq(a: BreachEntry, b: BreachEntry): number {
  const x = BigInt(a.entrySeq);
  const y = BigInt(b.entrySeq);
  return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * Derive everything shown about an incident from its entries, as of `now`.
 *   status            — `closed` once a `closed` entry exists, else `open`.
 *   boardReportDueAt  — the LATEST recorded extension NOT withdrawn (`board_extension_withdrawn`, decision `2026-11-20-471`),
 *                       its `grantedUntil`; else awareness + 72 hours.
 *   boardReportOverdue — open AND no 72-hour report recorded AND `now` is after the due time.
 *   boardReportLate   — the deadline WAS missed (decision `2026-11-20-471`): NO Board report was sent in time — each report
 *                       judged against the due time AS RECORDED BEFORE IT (so an extension entered afterwards can never excuse
 *                       it — patch review 2026-11-21) and the earliest-sent one deciding; or, with no report, the incident was
 *                       closed (the `closed` entry's `recordedAt`) after the due time as recorded before the close. Unlike
 *                       `overdue`, it stays true after the report is recorded or the incident is closed.
 *   latestAssessment  — the last `assessment` (earlier ones stay on the timeline).
 * Entries are consumed in `entrySeq` order whatever order the array arrives in.
 */
export function deriveBreachIncidentView(
  incident: { readonly isRehearsal: boolean; readonly becameAwareAt: string },
  entries: readonly BreachEntry[],
  now: Date,
): BreachIncidentView {
  const ordered = [...entries].sort(bySeq);
  const awareMs = Date.parse(incident.becameAwareAt);
  const dueMs = dueFrom(awareMs, ordered);
  let closed = false;
  /** With no report: was the close after the due time as recorded before it? */
  let closedLate = false;
  /** Each report against the due time recorded before it; ANY report in time means the deadline was met. */
  let anyReportInTime = false;
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

  ordered.forEach((e, i) => {
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
        if (Date.parse(e.payload.sentAt) <= dueFrom(awareMs, ordered.slice(0, i))) anyReportInTime = true;
        boardReportRecorded = true;
        break;
      case 'board_extension_recorded':
        break;
      case 'signoff_recorded':
        signoffRecorded = true;
        break;
      case 'closed':
        closed = true;
        closedLate = Date.parse(e.recordedAt) > dueFrom(awareMs, ordered.slice(0, i));
        break;
      case 'board_extension_withdrawn':
      case 'cert_in_report_recorded':
      case 'owner_review':
      case 'note':
        break;
    }
  });
  timelineEvents.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));

  return {
    status: closed ? 'closed' : 'open',
    boardReportDueAt: new Date(dueMs).toISOString(),
    boardReportOverdue: !closed && !boardReportRecorded && now.getTime() > dueMs,
    boardReportLate: boardReportRecorded ? !anyReportInTime : closed && closedLate,
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
