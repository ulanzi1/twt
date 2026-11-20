// Story 14.3 (decision `2026-11-20-467` DL7; N1, N6, N7) — the three notices DPDP Rules 2025 Rule 7 describes, DRAFTED from what
// was recorded. Pure. The system drafts; people send — nothing here, or anywhere, transmits a notice.
//   · principalsNotice — Rule 7(1)(a) to (e), to each affected person.
//   · boardInitial     — Rule 7(2)(a), to the Data Protection Board, without delay.
//   · boardReport      — Rule 7(2)(b)(i) to (vi), to the Board within 72 hours of becoming aware.
// Every paragraph is labelled with its sub-rule; an input that was not recorded renders `[MISSING — <field>]` and the draft is not
// `complete`. English only: a person translates the member notice at the time. The Trust's name is a placeholder (its legal name
// is not settled); the contact for affected people is whatever was typed into the assessment. No draft ranks a breach by severity.

import type { BreachIncidentView } from './schemas.js';

export const BREACH_REHEARSAL_BANNER = 'REHEARSAL — DO NOT SEND';
export const BREACH_TRUST_NAME_PLACEHOLDER = '[TRUST LEGAL NAME]';

export interface BreachDraft {
  readonly text: string;
  /** True when no input is missing. */
  readonly complete: boolean;
  /** The names of the inputs that were not recorded, in the order they appear in the draft. */
  readonly missing: readonly string[];
}

export interface BreachDrafts {
  readonly principalsNotice: BreachDraft;
  readonly boardInitial: BreachDraft;
  readonly boardReport: BreachDraft;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** `19 Nov 2026, 12:00 IST` — an instant as IST wall-clock time, independent of the machine's zone. */
function ist(isoInstant: string): string {
  const d = new Date(Date.parse(isoInstant) + IST_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]!} ${String(d.getUTCFullYear())}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} IST`;
}

/** Collects lines and the names of missing inputs for ONE draft. */
class Draft {
  private readonly lines: string[] = [];
  private readonly missing: string[] = [];

  constructor(view: BreachIncidentView, heading: string) {
    if (view.isRehearsal) this.lines.push(BREACH_REHEARSAL_BANNER, '');
    this.lines.push(heading, `From: ${BREACH_TRUST_NAME_PLACEHOLDER}`, '');
  }

  label(text: string): this {
    this.lines.push(text);
    return this;
  }

  line(text: string): this {
    this.lines.push(text);
    return this;
  }

  /** A recorded value, or the missing marker (and the draft is incomplete). */
  value(field: string, recorded: string | null | undefined, prefix = ''): this {
    const v = recorded?.trim() ?? '';
    if (v === '') {
      if (!this.missing.includes(field)) this.missing.push(field);
      this.lines.push(`${prefix}[MISSING — ${field}]`);
    } else {
      this.lines.push(`${prefix}${v}`);
    }
    return this;
  }

  /** A recorded list as bullets, or the missing marker. */
  list(field: string, items: readonly string[]): this {
    if (items.length === 0) {
      if (!this.missing.includes(field)) this.missing.push(field);
      this.lines.push(`[MISSING — ${field}]`);
    } else {
      for (const item of items) this.lines.push(`- ${item}`);
    }
    return this;
  }

  gap(): this {
    this.lines.push('');
    return this;
  }

  done(): BreachDraft {
    return { text: this.lines.join('\n').trimEnd(), complete: this.missing.length === 0, missing: [...this.missing] };
  }
}

function affectedLine(view: BreachIncidentView): string {
  const a = view.latestAssessment;
  if (!a) return 'People affected: not yet known.';
  const n = 'count' in a.estimatedAffected ? `about ${String(a.estimatedAffected.count)}` : 'not yet known';
  const cats = a.dataCategories.length > 0 ? a.dataCategories.join(', ') : 'not yet recorded';
  return `People affected: ${n}. Kinds of personal data: ${cats}.`;
}

function pariwarLine(view: BreachIncidentView): string {
  const n = view.latestAssessment?.affectedPariwarIds.length ?? 0;
  return n > 0 ? `Pariwars affected: ${String(n)}.` : 'Pariwars affected: not yet known, or trust-wide.';
}

function timing(view: BreachIncidentView): string[] {
  const lines = [`Timing: the Trust became aware on ${ist(view.becameAwareAt)}.`];
  for (const t of view.timelineEvents) lines.push(`- ${ist(t.occurredAt)}: ${t.description}`);
  return lines;
}

function mitigationItems(view: BreachIncidentView): string[] {
  return view.mitigations.map((m) => `(${m.status}) ${m.measures}`);
}

/** Build the three drafts from the derived view. */
export function buildBreachDrafts(view: BreachIncidentView): BreachDrafts {
  const a = view.latestAssessment;

  const notice = new Draft(view, 'Notice of a personal data breach');
  notice.label('7(1)(a) What happened — nature, extent and timing:').value('nature', a?.nature, 'Nature: ').value('extent', a?.extent, 'Extent: ').line(affectedLine(view));
  for (const l of timing(view)) notice.line(l);
  notice.gap().label('7(1)(b) Likely consequences for you:').value('likelyConsequences', a?.likelyConsequences);
  notice.gap().label('7(1)(c) What we have done, and are doing, to reduce the risk:').list('mitigation', mitigationItems(view));
  notice.gap().label('7(1)(d) What you can do to protect yourself:').value('safetyMeasuresForPrincipals', a?.safetyMeasuresForPrincipals);
  notice.gap().label('7(1)(e) Whom to contact with your questions:').value('contactForPrincipals', a?.contactForPrincipals);

  const initial = new Draft(view, 'Intimation of a personal data breach to the Data Protection Board');
  initial
    .label('7(2)(a) Description of the breach — nature, extent, timing and location of occurrence, and the likely impact:')
    .value('nature', a?.nature, 'Nature: ')
    .value('extent', a?.extent, 'Extent: ')
    .line(affectedLine(view))
    .line(pariwarLine(view));
  for (const l of timing(view)) initial.line(l);
  initial.value('location', a?.location, 'Location of occurrence: ').value('likelyConsequences', a?.likelyConsequences, 'Likely impact: ');

  const report = new Draft(view, 'Detailed report of a personal data breach to the Data Protection Board');
  report
    .label('7(2)(b)(i) Updated and detailed information on the breach:')
    .value('nature', a?.nature, 'Nature: ')
    .value('extent', a?.extent, 'Extent: ')
    .line(affectedLine(view))
    .line(pariwarLine(view));
  for (const l of timing(view)) report.line(l);
  report.value('location', a?.location, 'Location of occurrence: ').value('likelyConsequences', a?.likelyConsequences, 'Likely impact: ');
  report.gap().label('7(2)(b)(ii) The broad facts — events, circumstances and reasons leading to the breach:').value('broadFacts', view.causeFindings?.broadFacts);
  report.gap().label('7(2)(b)(iii) Measures implemented or proposed to mitigate risk:').list('mitigation', mitigationItems(view));
  report
    .gap()
    .label('7(2)(b)(iv) Findings regarding the person who caused the breach:')
    .value('findingsOnPersonResponsible', view.causeFindings?.findingsOnPersonResponsible);
  report.gap().label('7(2)(b)(v) Remedial measures taken to prevent recurrence:').list('remedial', view.remedials);
  report
    .gap()
    .label('7(2)(b)(vi) Report on the intimations given to affected Data Principals:')
    .list(
      'principalsNotice',
      view.principalsNotices.map((n) => {
        const reached = n.reachedCount === null ? 'number reached not counted' : `reached ${String(n.reachedCount)}`;
        const note = n.note.trim() === '' ? '' : ` — ${n.note.trim()}`;
        return `${ist(n.sentAt)} — ${n.channel}; ${reached}${note}`;
      }),
    );

  return { principalsNotice: notice.done(), boardInitial: initial.done(), boardReport: report.done() };
}
