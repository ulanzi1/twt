// The breach register's entry forms, as data (Story 14.3, AC12; decision `2026-11-20-467` DL5): for each entry kind, the fields
// its form shows and how the raw form values become the kind's payload. The payload is then validated by the SAME contract the
// server validates (`BreachEntryAppendRequest`) — there is no second set of rules here.

import { BREACH_DATA_CATEGORIES, BreachEntryAppendRequest, type BreachEntryKind } from '@twt/contracts';

import type { BreachEntryAppendBody } from '../../api/client.js';
import { istLocalInputToIso } from '../correction-chase/ist.js';

export type FieldType =
  | 'text'
  | 'textarea'
  /** `datetime-local`, typed and read as IST. */
  | 'datetime'
  | 'date'
  /** A whole number, or blank when no count was taken (null). */
  | 'integer-or-blank'
  | 'status'
  /** Checkboxes over the closed list of data categories. */
  | 'categories'
  /** A count, or "not yet known". Two form values: `<name>` and `<name>Unknown`. */
  | 'affected'
  /** One value per line. */
  | 'lines';

export interface FieldSpec {
  readonly name: string;
  readonly type: FieldType;
  readonly max?: number;
}

const f = (name: string, type: FieldType, max?: number): FieldSpec => (max === undefined ? { name, type } : { name, type, max });

export const ENTRY_FIELDS: Record<BreachEntryKind, readonly FieldSpec[]> = {
  assessment: [
    f('nature', 'textarea', 2000),
    f('extent', 'textarea', 2000),
    f('location', 'textarea', 2000),
    f('dataCategories', 'categories'),
    f('estimatedAffected', 'affected'),
    f('affectedPariwarIds', 'lines'),
    f('likelyConsequences', 'textarea', 2000),
    f('safetyMeasuresForPrincipals', 'textarea', 2000),
    f('contactForPrincipals', 'text', 300),
  ],
  timeline_event: [f('occurredAt', 'datetime'), f('description', 'textarea', 2000)],
  mitigation: [f('measures', 'textarea', 2000), f('status', 'status')],
  cause_findings: [f('broadFacts', 'textarea', 2000), f('findingsOnPersonResponsible', 'textarea', 2000)],
  remedial: [f('measures', 'textarea', 2000)],
  principals_notice_recorded: [f('sentAt', 'datetime'), f('channel', 'text', 200), f('reachedCount', 'integer-or-blank'), f('note', 'textarea', 2000)],
  board_initial_recorded: [f('sentAt', 'datetime'), f('reference', 'text', 200)],
  board_report_recorded: [f('sentAt', 'datetime'), f('reference', 'text', 200)],
  board_extension_recorded: [f('grantedUntil', 'datetime'), f('reference', 'text', 200)],
  cert_in_report_recorded: [f('sentAt', 'datetime'), f('reference', 'text', 200)],
  owner_review: [f('note', 'textarea', 2000)],
  signoff_recorded: [f('signers', 'lines'), f('signedOn', 'date'), f('note', 'textarea', 2000)],
  closed: [f('summary', 'textarea', 2000)],
  note: [f('text', 'textarea', 2000)],
};

/** The raw values a form holds: strings, a checkbox, or a checkbox group. */
export type EntryFormValues = Record<string, string | boolean | string[] | undefined>;

const str = (v: EntryFormValues[string]): string => (typeof v === 'string' ? v : '');
const lines = (v: EntryFormValues[string]): string[] =>
  str(v)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');

/** The field-level problems of a submission, by field name (a message key from `i18n-en.ts`). */
export type EntryFieldErrors = Record<string, string>;

/**
 * Turn the form's raw values into the request body for `kind`, validated by the contract. A `datetime` that is not a real date
 * and time is refused here (the contract would only see a missing value).
 */
export function buildEntryBody(
  kind: BreachEntryKind,
  values: EntryFormValues,
): { readonly ok: true; readonly body: BreachEntryAppendBody } | { readonly ok: false; readonly errors: EntryFieldErrors } {
  const payload: Record<string, unknown> = {};
  const errors: EntryFieldErrors = {};
  for (const field of ENTRY_FIELDS[kind]) {
    const raw = values[field.name];
    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'date':
      case 'status':
        payload[field.name] = str(raw);
        break;
      case 'datetime': {
        const isoValue = istLocalInputToIso(str(raw));
        if (isoValue === null) errors[field.name] = 'invalid.datetime';
        else payload[field.name] = isoValue;
        break;
      }
      case 'integer-or-blank': {
        const s = str(raw).trim();
        payload[field.name] = s === '' ? null : Number(s);
        break;
      }
      case 'categories':
        payload[field.name] = Array.isArray(raw) ? raw.filter((c) => (BREACH_DATA_CATEGORIES as readonly string[]).includes(c)) : [];
        break;
      case 'affected': {
        const unknown = values[`${field.name}Unknown`] === true;
        const s = str(raw).trim();
        payload[field.name] = unknown || s === '' ? { unknown: true } : { count: Number(s) };
        break;
      }
      case 'lines':
        payload[field.name] = lines(raw);
        break;
    }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const parsed = BreachEntryAppendRequest.safeParse({ kind, payload });
  if (parsed.success) return { ok: true, body: { kind, payload } as BreachEntryAppendBody };
  for (const issue of parsed.error.issues) {
    // Issue paths look like ['payload', '<field>', …]; anything else lands on the form as a whole.
    const name = issue.path[0] === 'payload' && typeof issue.path[1] === 'string' ? issue.path[1] : '_form';
    if (errors[name] !== undefined) continue;
    errors[name] = /future|later than today/.test(issue.message) ? 'invalid.future' : issue.code === 'too_small' ? 'invalid.required' : 'invalid.generic';
  }
  return { ok: false, errors };
}
