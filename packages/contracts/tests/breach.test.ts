// Story 14.3 (decision `2026-11-20-467` DL5, DL6, DL7; AC6, AC8, AC9) — the breach register's contracts: one strict payload per
// entry kind, the ONE derivation (`deriveBreachIncidentView`), the three Rule-7 drafts, and the lockstep with `@twt/domain` (the
// tuples, the 72-hour window, and the domain's two in-lock write rules — pinned equal to the derivation on shared fixtures).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { breach, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { MemberLifecycleStateWire } from '../src/kyc/signup.js';
import {
  BREACH_BOARD_REPORT_WINDOW_HOURS,
  BREACH_DATA_CATEGORIES,
  BREACH_DETECTION_SOURCES,
  BREACH_ENTRY_KINDS,
  BREACH_REHEARSAL_BANNER,
  BREACH_TRUST_NAME_PLACEHOLDER,
  BreachEntryAppendRequest,
  BreachIncidentDetailResponse,
  BreachIncidentListResponse,
  BreachIncidentOpenRequest,
  BreachMembersOnRecordResponse,
  BreachSignalListResponse,
  buildBreachDrafts,
  deriveBreachIncidentView,
  type BreachEntry,
  type BreachEntryKind,
} from '../src/breach/index.js';

const NOW = new Date('2026-11-20T12:00:00.000Z');
const AWARE = '2026-11-19T06:30:00.000Z'; // 12:00 IST on 19 Nov
const HOUR = 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();
const past = iso(Date.now() - HOUR);
const future = iso(Date.now() + HOUR);

const ASSESSMENT = {
  nature: 'A spreadsheet of claim contacts was emailed to a wrong address.',
  extent: 'One Pariwar; names, mobile numbers and addresses.',
  location: 'Staff email, Patna district office.',
  dataCategories: ['identity', 'contact'],
  estimatedAffected: { count: 40 },
  affectedPariwarIds: ['11111111-1111-1111-1111-111111111111'],
  likelyConsequences: 'Unwanted calls or messages; attempts to impersonate the Trust.',
  safetyMeasuresForPrincipals: 'Do not share any code or payment detail with a caller.',
  contactForPrincipals: 'The Trust helpline, 10:00-18:00 IST.',
} as const;

/** One VALID payload per kind — the per-kind accept leg, and the fixtures the derivation tests build on. */
const VALID: Record<BreachEntryKind, Record<string, unknown>> = {
  assessment: { ...ASSESSMENT },
  timeline_event: { occurredAt: past, description: 'The email was sent.' },
  mitigation: { measures: 'Asked the recipient to delete it; rotated the mailbox password.', status: 'implemented' },
  cause_findings: { broadFacts: 'An address was mistyped.', findingsOnPersonResponsible: 'A staff member; no intent found.' },
  remedial: { measures: 'Exports now need a second check before sending.' },
  principals_notice_recorded: { sentAt: past, channel: 'Phone call from the helpline', reachedCount: 38, note: '' },
  board_initial_recorded: { sentAt: past, reference: 'BOARD-REF-1' },
  board_report_recorded: { sentAt: past, reference: 'BOARD-REF-2' },
  board_extension_recorded: { grantedUntil: future, reference: 'BOARD-EXT-1' },
  cert_in_report_recorded: { sentAt: past, reference: 'CERTIN-1' },
  owner_review: { note: 'Reviewed; the response was timely.' },
  signoff_recorded: { signers: ['Trustee One', 'Trustee Two'], signedOn: '2026-11-19', note: '' },
  closed: { summary: 'Contained; forty people told; the Board has the report.' },
  note: { text: 'A plain note.' },
};

/** One INVALID payload per kind (each for a different reason). */
const INVALID: Record<BreachEntryKind, Record<string, unknown>> = {
  assessment: { ...ASSESSMENT, dataCategories: ['passwords'] },
  timeline_event: { occurredAt: future, description: 'Not yet happened.' },
  mitigation: { measures: 'x', status: 'done' },
  cause_findings: { broadFacts: '', findingsOnPersonResponsible: '' },
  remedial: { measures: '   ' },
  principals_notice_recorded: { sentAt: past, channel: 'SMS', reachedCount: -1, note: '' },
  board_initial_recorded: { sentAt: future, reference: 'R' },
  board_report_recorded: { sentAt: past },
  board_extension_recorded: { grantedUntil: 'next week', reference: 'R' },
  cert_in_report_recorded: { sentAt: past, reference: 'r'.repeat(201) },
  owner_review: { note: '' },
  signoff_recorded: { signers: ['Trustee One'], signedOn: '2026-11-19', note: '' },
  closed: { summary: 's'.repeat(2001) },
  note: { text: 'ok', extra: true },
};

let seq = 0;
function entry(kind: BreachEntryKind, payload: Record<string, unknown> = VALID[kind], recordedAt = '2026-11-19T07:00:00.000Z'): BreachEntry {
  seq += 1;
  return { entryId: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`, entrySeq: String(seq), kind, payload, recordedAt, recordedByDisplay: 'Spec Admin' } as BreachEntry;
}
const INCIDENT = { isRehearsal: false, becameAwareAt: AWARE } as const;

describe('breach contracts — the closed lists are the domain\'s (lockstep)', () => {
  it('entry kinds, detection sources and the 72-hour window equal the `@twt/domain` values', () => {
    expect([...BREACH_ENTRY_KINDS]).toEqual([...schema.BREACH_ENTRY_KINDS]);
    expect([...BREACH_DETECTION_SOURCES]).toEqual([...schema.BREACH_DETECTION_SOURCES]);
    expect(BREACH_BOARD_REPORT_WINDOW_HOURS * HOUR).toBe(breach.BREACH_BOARD_REPORT_WINDOW_MS);
    expect(BREACH_ENTRY_KINDS).toHaveLength(14);
    expect(BREACH_DATA_CATEGORIES).toEqual(['identity', 'contact', 'kyc', 'financial', 'nominee', 'health_or_death', 'credentials', 'other']);
  });

  it('members-on-record carries EVERY lifecycle state as a REQUIRED key — the nine the domain and the wire enum name', () => {
    const states = [...schema.MEMBER_LIFECYCLE_STATES];
    expect([...MemberLifecycleStateWire.options].sort()).toEqual([...states].sort());
    const full = Object.fromEntries(states.map((s) => [s, 0]));
    const ok = { asOf: iso(Date.now()), pariwarCount: 0, total: 0, byState: full };
    expect(BreachMembersOnRecordResponse.safeParse(ok).success).toBe(true);
    for (const s of states) {
      const rest = Object.fromEntries(Object.entries(full).filter(([k]) => k !== s));
      expect(BreachMembersOnRecordResponse.safeParse({ ...ok, byState: rest }).success, `missing ${s}`).toBe(false);
    }
    expect(BreachMembersOnRecordResponse.safeParse({ ...ok, byState: { ...full, deceased: 1 } }).success).toBe(false);
    expect(BreachMembersOnRecordResponse.safeParse({ ...ok, threshold: 100000 }).success).toBe(false);
  });
});

describe('breach contracts — the open request (AC5)', () => {
  const ok = { isRehearsal: true, title: 'A rehearsal', becameAwareAt: past, detectionSource: 'other' };
  it('accepts a valid body, with and without a signal reference; trims the title', () => {
    expect(BreachIncidentOpenRequest.parse({ ...ok, title: '  A rehearsal  ' }).title).toBe('A rehearsal');
    expect(BreachIncidentOpenRequest.safeParse({ ...ok, detectionSource: 'audit_chain_break', detectionSignalRef: '11111111-1111-1111-1111-111111111111' }).success).toBe(true);
  });
  it('refuses awareness in the future, a blank or over-long title, an unknown source, a blank or over-long reference, and an unknown key', () => {
    for (const bad of [
      { ...ok, becameAwareAt: future },
      { ...ok, becameAwareAt: '2026-11-19 10:00' },
      { ...ok, title: '   ' },
      { ...ok, title: 't'.repeat(201) },
      { ...ok, detectionSource: 'gut_feeling' },
      { ...ok, detectionSignalRef: '' },
      { ...ok, detectionSignalRef: 'r'.repeat(201) },
      { ...ok, severity: 'minor' },
      { isRehearsal: 'yes', title: 'x', becameAwareAt: past, detectionSource: 'other' },
    ]) {
      expect(BreachIncidentOpenRequest.safeParse(bad).success, JSON.stringify(bad).slice(0, 80)).toBe(false);
    }
  });
  it('⛔ no field can mark a breach as minor — the request has no severity, materiality or "notifiable" key (N2)', () => {
    expect(Object.keys(BreachIncidentOpenRequest.shape).sort()).toEqual(['becameAwareAt', 'detectionSignalRef', 'detectionSource', 'isRehearsal', 'title']);
  });
});

describe('breach contracts — one strict payload per entry kind (AC6)', () => {
  for (const kind of BREACH_ENTRY_KINDS) {
    it(`${kind}: a valid payload is accepted, an invalid one refused, an unknown key refused`, () => {
      expect(BreachEntryAppendRequest.safeParse({ kind, payload: VALID[kind] }).success, 'valid').toBe(true);
      expect(BreachEntryAppendRequest.safeParse({ kind, payload: INVALID[kind] }).success, 'invalid').toBe(false);
      expect(BreachEntryAppendRequest.safeParse({ kind, payload: { ...VALID[kind], notInTheContract: 1 } }).success, 'unknown key').toBe(false);
      expect(BreachEntryAppendRequest.safeParse({ kind, payload: VALID[kind], extra: 1 }).success, 'unknown top-level key').toBe(false);
    });
  }
  it('an unknown kind, or a payload of another kind, is refused', () => {
    expect(BreachEntryAppendRequest.safeParse({ kind: 'severity_downgrade', payload: {} }).success).toBe(false);
    expect(BreachEntryAppendRequest.safeParse({ kind: 'closed', payload: VALID.note }).success).toBe(false);
  });
  it('signoff_recorded needs at least TWO DISTINCT names after trimming (case and spacing do not make a second person)', () => {
    const so = (signers: unknown) => BreachEntryAppendRequest.safeParse({ kind: 'signoff_recorded', payload: { ...VALID.signoff_recorded, signers } }).success;
    expect(so(['A Trustee', 'B Trustee'])).toBe(true);
    expect(so(['A Trustee', 'B Trustee', 'C Trustee'])).toBe(true);
    expect(so(['A Trustee', 'A Trustee'])).toBe(false);
    expect(so(['A Trustee', '  a  trustee '])).toBe(false);
    expect(so(['A Trustee', ''])).toBe(false);
    expect(so(['A Trustee', 'n'.repeat(121)])).toBe(false);
    expect(so([])).toBe(false);
  });
  it('signoff_recorded.signedOn is a calendar date not later than today in IST', () => {
    const on = (signedOn: string) => BreachEntryAppendRequest.safeParse({ kind: 'signoff_recorded', payload: { ...VALID.signoff_recorded, signedOn } }).success;
    const istToday = new Date(Date.now() + 5.5 * HOUR).toISOString().slice(0, 10);
    const istTomorrow = new Date(Date.now() + 29.5 * HOUR).toISOString().slice(0, 10);
    expect(on(istToday)).toBe(true);
    expect(on(istTomorrow)).toBe(false);
    expect(on('2026-02-30')).toBe(false);
    expect(on('19-11-2026')).toBe(false);
  });
  it('an assessment may be PARTIAL (blank narrative, no categories, an unknown count) — the drafts name what is missing', () => {
    const blank = { nature: '', extent: '', location: '', dataCategories: [], estimatedAffected: { unknown: true }, affectedPariwarIds: [], likelyConsequences: '', safetyMeasuresForPrincipals: '', contactForPrincipals: '' };
    expect(BreachEntryAppendRequest.safeParse({ kind: 'assessment', payload: blank }).success).toBe(true);
    expect(BreachEntryAppendRequest.safeParse({ kind: 'assessment', payload: { ...blank, estimatedAffected: { count: -1 } } }).success).toBe(false);
    expect(BreachEntryAppendRequest.safeParse({ kind: 'assessment', payload: { ...blank, estimatedAffected: { count: 1.5 } } }).success).toBe(false);
    expect(BreachEntryAppendRequest.safeParse({ kind: 'assessment', payload: { ...blank, estimatedAffected: { count: 3, unknown: true } } }).success).toBe(false);
    expect(BreachEntryAppendRequest.safeParse({ kind: 'assessment', payload: { ...blank, affectedPariwarIds: ['not-a-uuid'] } }).success).toBe(false);
    expect(BreachEntryAppendRequest.safeParse({ kind: 'assessment', payload: { ...blank, contactForPrincipals: 'c'.repeat(301) } }).success).toBe(false);
    expect(BreachEntryAppendRequest.safeParse({ kind: 'assessment', payload: { ...blank, nature: 'n'.repeat(2001) } }).success).toBe(false);
  });
});

describe('deriveBreachIncidentView — the ONE derivation (AC8)', () => {
  const due = Date.parse(AWARE) + 72 * HOUR;

  it('a new incident: open, due = awareness + 72 hours, nothing recorded, not overdue before the due time', () => {
    const v = deriveBreachIncidentView(INCIDENT, [], NOW);
    expect(v).toMatchObject({
      status: 'open',
      isRehearsal: false,
      becameAwareAt: AWARE,
      boardReportDueAt: iso(due),
      boardReportOverdue: false,
      principalsNoticeRecorded: false,
      boardInitialRecorded: false,
      boardReportRecorded: false,
      signoffRecorded: false,
      latestAssessment: null,
    });
  });

  it('overdue ONLY when open, unreported and past due — the instant of the due time is not yet overdue', () => {
    expect(deriveBreachIncidentView(INCIDENT, [], new Date(due)).boardReportOverdue).toBe(false);
    expect(deriveBreachIncidentView(INCIDENT, [], new Date(due + 1)).boardReportOverdue).toBe(true);
    expect(deriveBreachIncidentView(INCIDENT, [entry('board_report_recorded')], new Date(due + HOUR)).boardReportOverdue).toBe(false);
    expect(deriveBreachIncidentView(INCIDENT, [entry('board_initial_recorded')], new Date(due + HOUR)).boardReportOverdue).toBe(true);
  });

  it('an extension MOVES the due time (the latest one wins), and with it the overdue flag', () => {
    const first = entry('board_extension_recorded', { grantedUntil: iso(due + 24 * HOUR), reference: 'E1' });
    const second = entry('board_extension_recorded', { grantedUntil: iso(due + 48 * HOUR), reference: 'E2' });
    expect(deriveBreachIncidentView(INCIDENT, [first], NOW).boardReportDueAt).toBe(iso(due + 24 * HOUR));
    expect(deriveBreachIncidentView(INCIDENT, [first, second], NOW).boardReportDueAt).toBe(iso(due + 48 * HOUR));
    expect(deriveBreachIncidentView(INCIDENT, [first], new Date(due + 12 * HOUR)).boardReportOverdue).toBe(false);
    expect(deriveBreachIncidentView(INCIDENT, [first], new Date(due + 25 * HOUR)).boardReportOverdue).toBe(true);
  });

  it('`closed` ⇒ status closed and NEVER overdue, even unreported and long past due', () => {
    const v = deriveBreachIncidentView(INCIDENT, [entry('closed')], new Date(due + 1000 * HOUR));
    expect(v.status).toBe('closed');
    expect(v.boardReportOverdue).toBe(false);
  });

  it('the LATEST assessment wins (by `entry_seq`, whatever order the array arrives in); every flag reads its own kind', () => {
    const a1 = entry('assessment', { ...ASSESSMENT, nature: 'first reading' });
    const note = entry('note');
    const a2 = entry('assessment', { ...ASSESSMENT, nature: 'second reading' });
    expect(deriveBreachIncidentView(INCIDENT, [a1, note, a2], NOW).latestAssessment?.nature).toBe('second reading');
    expect(deriveBreachIncidentView(INCIDENT, [a2, note, a1], NOW).latestAssessment?.nature).toBe('second reading');
    const all = BREACH_ENTRY_KINDS.filter((k) => k !== 'closed').map((k) => entry(k));
    const v = deriveBreachIncidentView(INCIDENT, all, NOW);
    expect(v).toMatchObject({ status: 'open', principalsNoticeRecorded: true, boardInitialRecorded: true, boardReportRecorded: true, signoffRecorded: true });
    expect(v.mitigations).toHaveLength(1);
    expect(v.principalsNotices).toHaveLength(1);
    expect(v.remedials).toEqual(['Exports now need a second check before sending.']);
    expect(v.causeFindings?.broadFacts).toBe('An address was mistyped.');
    expect(v.timelineEvents).toHaveLength(1);
  });

  it('`entry_seq` is compared as a NUMBER — "10" is after "9"', () => {
    const nine = { ...entry('assessment', { ...ASSESSMENT, nature: 'nine' }), entrySeq: '9' };
    const ten = { ...entry('assessment', { ...ASSESSMENT, nature: 'ten' }), entrySeq: '10' };
    expect(deriveBreachIncidentView(INCIDENT, [ten, nine] as BreachEntry[], NOW).latestAssessment?.nature).toBe('ten');
  });

  it('⭐ the domain\'s two in-lock write rules agree with this derivation on every fixture (they cannot drift)', () => {
    const e1 = entry('board_extension_recorded', { grantedUntil: iso(due + 24 * HOUR), reference: 'E1' });
    const e2 = entry('board_extension_recorded', { grantedUntil: iso(due + 30 * HOUR), reference: 'E2' });
    const fixtures: BreachEntry[][] = [
      [],
      [entry('note')],
      [entry('assessment'), entry('mitigation')],
      [e1],
      [e1, entry('note'), e2],
      [entry('board_report_recorded'), entry('closed')],
      [e1, entry('closed')],
      BREACH_ENTRY_KINDS.map((k) => entry(k)),
    ];
    for (const entries of fixtures) {
      const v = deriveBreachIncidentView(INCIDENT, entries, NOW);
      const rules = entries.map((e) => ({ kind: e.kind, payload: e.payload as Record<string, unknown> }));
      expect(breach.isBreachIncidentClosed(rules)).toBe(v.status === 'closed');
      expect(breach.breachBoardReportDueAt(new Date(AWARE), rules).toISOString()).toBe(v.boardReportDueAt);
    }
  });

  it('there is ONE definition of the derivation in the repo\'s source (a grep-able single definition)', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        // `tests` directories are skipped: this file's own pattern below would match itself, and a copy in a test is not a definition.
        if (name === 'node_modules' || name === 'dist' || name === 'tests' || name.startsWith('.')) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(name) && /function deriveBreachIncidentView\b/.test(readFileSync(p, 'utf8'))) hits.push(p.slice(root.length + 1));
      }
    };
    for (const top of ['apps', 'packages']) walk(join(root, top));
    expect(hits).toEqual(['packages/contracts/src/breach/derive.ts']);
  });
});

describe('buildBreachDrafts — the three Rule-7 drafts (AC9)', () => {
  const full = () =>
    deriveBreachIncidentView(
      INCIDENT,
      [entry('assessment'), entry('timeline_event', { occurredAt: '2026-11-18T15:00:00.000Z', description: 'The email was sent.' }), entry('mitigation'), entry('mitigation', { measures: 'Staff retraining.', status: 'proposed' }), entry('cause_findings'), entry('remedial'), entry('principals_notice_recorded', { sentAt: '2026-11-19T09:30:00.000Z', channel: 'Phone call from the helpline', reachedCount: 38, note: '' })],
      NOW,
    );

  it('every Rule-7 sub-item is labelled in its draft', () => {
    const d = buildBreachDrafts(full());
    for (const label of ['7(1)(a)', '7(1)(b)', '7(1)(c)', '7(1)(d)', '7(1)(e)']) expect(d.principalsNotice.text, label).toContain(label);
    expect(d.boardInitial.text).toContain('7(2)(a)');
    for (const label of ['7(2)(b)(i)', '7(2)(b)(ii)', '7(2)(b)(iii)', '7(2)(b)(iv)', '7(2)(b)(v)', '7(2)(b)(vi)']) expect(d.boardReport.text, label).toContain(label);
    // 7(1)(a) has no "location"; 7(2)(a) does.
    expect(d.boardInitial.text).toContain('Staff email, Patna district office.');
    expect(d.principalsNotice.text).not.toContain('Staff email, Patna district office.');
  });

  it('a fully recorded incident yields three COMPLETE drafts, in IST, carrying what was recorded', () => {
    const d = buildBreachDrafts(full());
    for (const draft of [d.principalsNotice, d.boardInitial, d.boardReport]) {
      expect(draft.complete).toBe(true);
      expect(draft.missing).toEqual([]);
      expect(draft.text).not.toContain('[MISSING');
    }
    expect(d.principalsNotice.text).toContain('19 Nov 2026, 12:00 IST');
    expect(d.principalsNotice.text).toContain('The Trust helpline, 10:00-18:00 IST.');
    expect(d.boardReport.text).toContain('Phone call from the helpline');
    expect(d.boardReport.text).toContain('38');
    expect(d.boardReport.text).toContain('Staff retraining.');
    expect(d.boardReport.text).toContain('A staff member; no intent found.');
  });

  it('an EMPTY assessment (or none at all) yields `complete: false` with each missing field NAMED', () => {
    const blank = { nature: '', extent: '', location: '', dataCategories: [], estimatedAffected: { unknown: true }, affectedPariwarIds: [], likelyConsequences: '', safetyMeasuresForPrincipals: '', contactForPrincipals: '' };
    for (const view of [deriveBreachIncidentView(INCIDENT, [], NOW), deriveBreachIncidentView(INCIDENT, [entry('assessment', blank)], NOW)]) {
      const d = buildBreachDrafts(view);
      expect(d.principalsNotice.complete).toBe(false);
      expect(d.principalsNotice.missing).toEqual(['nature', 'extent', 'likelyConsequences', 'mitigation', 'safetyMeasuresForPrincipals', 'contactForPrincipals']);
      expect(d.boardInitial.complete).toBe(false);
      expect(d.boardInitial.missing).toEqual(['nature', 'extent', 'location', 'likelyConsequences']);
      expect(d.boardReport.complete).toBe(false);
      expect(d.boardReport.missing).toEqual(['nature', 'extent', 'location', 'likelyConsequences', 'broadFacts', 'mitigation', 'findingsOnPersonResponsible', 'remedial', 'principalsNotice']);
      for (const f of d.principalsNotice.missing) expect(d.principalsNotice.text).toContain(`[MISSING — ${f}]`);
      for (const f of d.boardReport.missing) expect(d.boardReport.text).toContain(`[MISSING — ${f}]`);
    }
  });

  it('a REHEARSAL heads all three drafts `REHEARSAL — DO NOT SEND`; a real incident carries the banner nowhere', () => {
    expect(BREACH_REHEARSAL_BANNER).toBe('REHEARSAL — DO NOT SEND');
    const rehearsal = buildBreachDrafts(deriveBreachIncidentView({ ...INCIDENT, isRehearsal: true }, [entry('assessment')], NOW));
    for (const draft of [rehearsal.principalsNotice, rehearsal.boardInitial, rehearsal.boardReport]) expect(draft.text.split('\n')[0]).toBe(BREACH_REHEARSAL_BANNER);
    const real = buildBreachDrafts(full());
    for (const draft of [real.principalsNotice, real.boardInitial, real.boardReport]) expect(draft.text).not.toContain('REHEARSAL');
  });

  it('⛔ no draft hard-codes a trust name, a person or a severity: the Trust is a placeholder, and no draft calls a breach minor', () => {
    expect(BREACH_TRUST_NAME_PLACEHOLDER).toBe('[TRUST LEGAL NAME]');
    const d = buildBreachDrafts(full());
    for (const draft of [d.principalsNotice, d.boardInitial, d.boardReport]) {
      expect(draft.text).toContain(BREACH_TRUST_NAME_PLACEHOLDER);
      expect(draft.text).not.toMatch(/teachers'? welfare|\bTWT\b/i);
      expect(draft.text).not.toMatch(/\bminor\b|not notifiable|low severity/i);
    }
  });

  it('an unknown count and trust-wide reach are SAID, not left blank', () => {
    const v = deriveBreachIncidentView(INCIDENT, [entry('assessment', { ...ASSESSMENT, estimatedAffected: { unknown: true }, affectedPariwarIds: [] })], NOW);
    const d = buildBreachDrafts(v);
    expect(d.boardInitial.text).toContain('not yet known');
    expect(d.boardInitial.missing).not.toContain('extent');
  });
});

describe('breach contracts — the response shapes', () => {
  const incident = { incidentId: '11111111-1111-1111-1111-111111111111', isRehearsal: true, title: 'A rehearsal', becameAwareAt: AWARE, openedAt: '2026-11-19T06:45:00.000Z', detectionSource: 'other', detectionSignalRef: null, openedByDisplay: 'Spec Admin' };
  it('the detail response is the incident, its entries and the derived view; unknown keys are refused', () => {
    const entries = [entry('assessment'), entry('note')];
    const view = deriveBreachIncidentView(incident, entries, NOW);
    expect(BreachIncidentDetailResponse.safeParse({ incident, entries, view }).success).toBe(true);
    expect(BreachIncidentDetailResponse.safeParse({ incident: { ...incident, openedBy: 'x' }, entries, view }).success).toBe(false);
  });
  it('⛔ a list item carries NO narrative — flags, times and the title only', () => {
    const item = { incidentId: incident.incidentId, title: incident.title, isRehearsal: true, openedAt: incident.openedAt, becameAwareAt: AWARE, detectionSource: 'other', status: 'open', boardReportDueAt: iso(Date.parse(AWARE) + 72 * HOUR), boardReportOverdue: false, principalsNoticeRecorded: false, boardInitialRecorded: false, boardReportRecorded: false, signoffRecorded: false };
    expect(BreachIncidentListResponse.safeParse({ items: [item] }).success).toBe(true);
    for (const leak of ['latestAssessment', 'entries', 'mitigations', 'payload']) {
      expect(BreachIncidentListResponse.safeParse({ items: [{ ...item, [leak]: null }] }).success, leak).toBe(false);
    }
    expect(BreachIncidentListResponse.safeParse({ incidents: [item] }).success).toBe(false);
  });
  it('a signal item carries the incidents opened from it', () => {
    const item = { checkId: incident.incidentId, verifiedAt: AWARE, firstBrokenSeq: '5', rowsVerified: 4, triggerSource: 'manual', incidentIds: [incident.incidentId] };
    expect(BreachSignalListResponse.safeParse({ items: [item] }).success).toBe(true);
    expect(BreachSignalListResponse.safeParse({ items: [{ ...item, incidentIds: undefined }] }).success).toBe(false);
  });
});
