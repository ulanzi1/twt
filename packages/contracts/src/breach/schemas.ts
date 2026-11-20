// Story 14.3 (decision `2026-11-20-467` DL5, DL6, DL8, DL9) — the personal data breach register's wire contracts.
// `/api/v1/data-protection/…`, all behind the GLOBAL key `breach.manage` (Super Admin only). HTTP endpoints → these DO register
// in openapi/v1.yaml (the six routes are the EXPECTED diff for this story).
//
// The two closed lists MIRROR `@twt/domain`'s tuples (`schema/breach_incidents.ts`) — this package never imports the pg-touching
// domain at runtime; tests/breach.test.ts pins them equal, and the domain's regression spec pins the tuples to the DB CHECKs.
// N2: there is NO severity, materiality or "notifiable" field anywhere here — every breach is notifiable.
// N4: no member-identifying field. Affected people are a COUNT, data categories and Pariwar ids. Free text is typed by staff.

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';

/** The closed list of entry kinds. LOCKSTEP: `@twt/domain` `BREACH_ENTRY_KINDS`, migration 0208's CHECK. */
export const BREACH_ENTRY_KINDS = [
  'assessment',
  'timeline_event',
  'mitigation',
  'cause_findings',
  'remedial',
  'principals_notice_recorded',
  'board_initial_recorded',
  'board_report_recorded',
  'board_extension_recorded',
  'cert_in_report_recorded',
  'owner_review',
  'signoff_recorded',
  'closed',
  'note',
] as const;
export const BreachEntryKind = z.enum(BREACH_ENTRY_KINDS);
export type BreachEntryKind = z.output<typeof BreachEntryKind>;

/** The closed list of detection sources. LOCKSTEP: `@twt/domain` `BREACH_DETECTION_SOURCES`, migration 0208's CHECK. */
export const BREACH_DETECTION_SOURCES = [
  'audit_chain_break',
  'pii_scrape_failure',
  'validity_cache_alert',
  'cross_tenant_read_anomaly',
  'pii_export_volume',
  'rls_bypass_attempt',
  'out_of_hours_privileged_session',
  'class_a_dead_letter',
  'external_report',
  'other',
] as const;
export const BreachDetectionSource = z.enum(BREACH_DETECTION_SOURCES);
export type BreachDetectionSource = z.output<typeof BreachDetectionSource>;

/** What kinds of personal data were involved — a closed list (an assessment may name none yet). */
export const BREACH_DATA_CATEGORIES = ['identity', 'contact', 'kyc', 'financial', 'nominee', 'health_or_death', 'credentials', 'other'] as const;
export const BreachDataCategory = z.enum(BREACH_DATA_CATEGORIES);
export type BreachDataCategory = z.output<typeof BreachDataCategory>;

export const BREACH_TITLE_MAX = 200;
export const BREACH_TEXT_MAX = 2000;
export const BREACH_REFERENCE_MAX = 200;
export const BREACH_CONTACT_MAX = 300;
export const BREACH_SIGNER_NAME_MAX = 120;
export const BREACH_INCIDENT_LIST_LIMIT_DEFAULT = 20;
export const BREACH_INCIDENT_LIST_LIMIT_MAX = 100;
export const BREACH_SIGNAL_LIST_LIMIT_DEFAULT = 20;
export const BREACH_SIGNAL_LIST_LIMIT_MAX = 50;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
/** Today's calendar date in IST, `YYYY-MM-DD`. */
function istToday(nowMs: number): string {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Required text: trimmed, 1–max. */
const text = (max: number = BREACH_TEXT_MAX) => z.string().trim().min(1).max(max);
/** Text that may be blank (not yet known): trimmed, 0–max. */
const optionalText = (max: number = BREACH_TEXT_MAX) => z.string().trim().max(max);

/** An instant that is not in the future. `checkTime` is false for STORED payloads (a past instant stays past; nothing to re-judge). */
const instantNotAfterNow = (checkTime: boolean) =>
  checkTime ? Iso8601Datetime.refine((v) => Date.parse(v) <= Date.now(), { message: 'must not be in the future' }) : Iso8601Datetime;

const CalendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) => {
      const d = new Date(`${v}T00:00:00.000Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    },
    { message: 'not a calendar date' },
  );

/** Two names are the same person's if they match after trimming, collapsing inner spaces and ignoring case. */
const nameKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * One strict payload per entry kind. `checkTime: true` (requests) also refuses a future `occurredAt` / `sentAt` and a `signedOn`
 * later than today in IST; `false` (stored entries in a response) does not re-judge time.
 */
function payloadSchemas(checkTime: boolean) {
  const sentAt = instantNotAfterNow(checkTime);
  return {
    /** What is known so far. Narrative fields may be BLANK and the lists EMPTY — the drafts name what is missing. The latest wins. */
    assessment: z
      .object({
        nature: optionalText(),
        extent: optionalText(),
        /** Rule 7(2)(a) asks the Board for the location of occurrence; 7(1)(a) does not ask it for affected people. */
        location: optionalText(),
        dataCategories: z.array(BreachDataCategory).max(BREACH_DATA_CATEGORIES.length),
        estimatedAffected: z.union([z.object({ count: z.number().int().min(0) }).strict(), z.object({ unknown: z.literal(true) }).strict()]),
        /** Empty = not yet known, or trust-wide. */
        affectedPariwarIds: z.array(UuidString).max(500),
        likelyConsequences: optionalText(),
        /** Rule 7(1)(d). */
        safetyMeasuresForPrincipals: optionalText(),
        /** Rule 7(1)(e) — typed per incident; never a hard-coded person. */
        contactForPrincipals: optionalText(BREACH_CONTACT_MAX),
      })
      .strict(),
    timeline_event: z.object({ occurredAt: sentAt, description: text() }).strict(),
    mitigation: z.object({ measures: text(), status: z.enum(['implemented', 'proposed']) }).strict(),
    /** Rule 7(2)(b)(ii) and (iv). The finding about the person may still be blank. */
    cause_findings: z.object({ broadFacts: text(), findingsOnPersonResponsible: optionalText() }).strict(),
    /** Rule 7(2)(b)(v). */
    remedial: z.object({ measures: text() }).strict(),
    /** Staff RECORD that they sent the notice by their own means — the system sends nothing. */
    principals_notice_recorded: z
      .object({ sentAt, channel: text(BREACH_REFERENCE_MAX), reachedCount: z.number().int().min(0).nullable(), note: optionalText() })
      .strict(),
    board_initial_recorded: z.object({ sentAt, reference: text(BREACH_REFERENCE_MAX) }).strict(),
    board_report_recorded: z.object({ sentAt, reference: text(BREACH_REFERENCE_MAX) }).strict(),
    /** A longer period the Board ALLOWED. It must be later than the current due time — judged by the server against the record. */
    board_extension_recorded: z.object({ grantedUntil: Iso8601Datetime, reference: text(BREACH_REFERENCE_MAX) }).strict(),
    cert_in_report_recorded: z.object({ sentAt, reference: text(BREACH_REFERENCE_MAX) }).strict(),
    /** The breach owner's review. "Owner", not "DPO": who owns a breach is not yet decided. */
    owner_review: z.object({ note: text() }).strict(),
    /** The operator's RECORD that trustees signed by their own means — not the trustees' own sessions. */
    signoff_recorded: z
      .object({
        signers: z
          .array(text(BREACH_SIGNER_NAME_MAX))
          .min(2)
          .max(20)
          .refine((names) => new Set(names.map(nameKey)).size === names.length, { message: 'each signer must be a different person' }),
        signedOn: checkTime ? CalendarDate.refine((v) => v <= istToday(Date.now()), { message: 'must not be later than today' }) : CalendarDate,
        note: optionalText(),
      })
      .strict(),
    /** After this, nothing more is appended. */
    closed: z.object({ summary: text() }).strict(),
    note: z.object({ text: text() }).strict(),
  } as const;
}

const REQUEST_PAYLOADS = payloadSchemas(true);
const STORED_PAYLOADS = payloadSchemas(false);

export const BreachAssessmentPayload = STORED_PAYLOADS.assessment;
export type BreachAssessmentPayload = z.output<typeof BreachAssessmentPayload>;

/** `POST /api/v1/data-protection/breaches` — open an incident. `Idempotency-Key` header REQUIRED. */
export const BreachIncidentOpenRequest = z
  .object({
    /** Fixed at open and never changed; heads every draft `REHEARSAL — DO NOT SEND`. */
    isRehearsal: z.boolean(),
    title: text(BREACH_TITLE_MAX),
    /** When the Trust became aware — the start of the 72-hour clock. Not in the future. */
    becameAwareAt: instantNotAfterNow(true),
    detectionSource: BreachDetectionSource,
    /** e.g. the failed integrity check's id. */
    detectionSignalRef: text(BREACH_REFERENCE_MAX).optional(),
  })
  .strict();
export type BreachIncidentOpenRequest = z.output<typeof BreachIncidentOpenRequest>;

const requestOption = <K extends BreachEntryKind>(kind: K) => z.object({ kind: z.literal(kind), payload: REQUEST_PAYLOADS[kind] }).strict();

/** `POST /api/v1/data-protection/breaches/{incidentId}/entries` — append one entry. `Idempotency-Key` header REQUIRED. */
export const BreachEntryAppendRequest = z.discriminatedUnion('kind', [
  requestOption('assessment'),
  requestOption('timeline_event'),
  requestOption('mitigation'),
  requestOption('cause_findings'),
  requestOption('remedial'),
  requestOption('principals_notice_recorded'),
  requestOption('board_initial_recorded'),
  requestOption('board_report_recorded'),
  requestOption('board_extension_recorded'),
  requestOption('cert_in_report_recorded'),
  requestOption('owner_review'),
  requestOption('signoff_recorded'),
  requestOption('closed'),
  requestOption('note'),
]);
export type BreachEntryAppendRequest = z.output<typeof BreachEntryAppendRequest>;

const storedOption = <K extends BreachEntryKind>(kind: K) =>
  z
    .object({
      entryId: UuidString,
      /** The entry's order within everything ever recorded, as a decimal string — compare numerically. */
      entrySeq: z.string().regex(/^\d+$/),
      kind: z.literal(kind),
      payload: STORED_PAYLOADS[kind],
      recordedAt: Iso8601Datetime,
      /** The admin's display name as it was when they recorded it. */
      recordedByDisplay: z.string(),
    })
    .strict();

/** One recorded entry. */
export const BreachEntry = z.discriminatedUnion('kind', [
  storedOption('assessment'),
  storedOption('timeline_event'),
  storedOption('mitigation'),
  storedOption('cause_findings'),
  storedOption('remedial'),
  storedOption('principals_notice_recorded'),
  storedOption('board_initial_recorded'),
  storedOption('board_report_recorded'),
  storedOption('board_extension_recorded'),
  storedOption('cert_in_report_recorded'),
  storedOption('owner_review'),
  storedOption('signoff_recorded'),
  storedOption('closed'),
  storedOption('note'),
]);
export type BreachEntry = z.output<typeof BreachEntry>;

export const BreachIncident = z
  .object({
    incidentId: UuidString,
    isRehearsal: z.boolean(),
    title: z.string(),
    becameAwareAt: Iso8601Datetime,
    openedAt: Iso8601Datetime,
    detectionSource: BreachDetectionSource,
    detectionSignalRef: z.string().nullable(),
    /** The admin's display name as it was at open. The actor's id is not sent. */
    openedByDisplay: z.string(),
  })
  .strict();
export type BreachIncident = z.output<typeof BreachIncident>;

export const BreachIncidentStatus = z.enum(['open', 'closed']);
export type BreachIncidentStatus = z.output<typeof BreachIncidentStatus>;

/** The flags every surface shows — derived, never stored. No narrative. */
const viewFlags = {
  status: BreachIncidentStatus,
  /** The latest recorded extension, else awareness + 72 hours. */
  boardReportDueAt: Iso8601Datetime,
  /** Open, no 72-hour report recorded, and past the due time. */
  boardReportOverdue: z.boolean(),
  principalsNoticeRecorded: z.boolean(),
  boardInitialRecorded: z.boolean(),
  boardReportRecorded: z.boolean(),
  signoffRecorded: z.boolean(),
} as const;

/** `deriveBreachIncidentView`'s output — the flags, plus what the three drafts are built from. */
export const BreachIncidentView = z
  .object({
    ...viewFlags,
    isRehearsal: z.boolean(),
    becameAwareAt: Iso8601Datetime,
    latestAssessment: BreachAssessmentPayload.nullable(),
    mitigations: z.array(STORED_PAYLOADS.mitigation),
    /** The latest recorded findings, or null. */
    causeFindings: STORED_PAYLOADS.cause_findings.nullable(),
    remedials: z.array(z.string()),
    principalsNotices: z.array(STORED_PAYLOADS.principals_notice_recorded),
    /** In `occurredAt` order. */
    timelineEvents: z.array(STORED_PAYLOADS.timeline_event),
  })
  .strict();
export type BreachIncidentView = z.output<typeof BreachIncidentView>;

/** `GET /api/v1/data-protection/breaches/{incidentId}` and the 200 of both writes. */
export const BreachIncidentDetailResponse = z
  .object({
    incident: BreachIncident,
    /** Every entry, in `entrySeq` order. */
    entries: z.array(BreachEntry),
    view: BreachIncidentView,
  })
  .strict();
export type BreachIncidentDetailResponse = z.output<typeof BreachIncidentDetailResponse>;

/** One row of the list — a title, times and flags. ⛔ Narrative: no assessment, no entries. */
export const BreachIncidentListItem = z
  .object({
    incidentId: UuidString,
    title: z.string(),
    isRehearsal: z.boolean(),
    openedAt: Iso8601Datetime,
    becameAwareAt: Iso8601Datetime,
    detectionSource: BreachDetectionSource,
    ...viewFlags,
  })
  .strict();
export type BreachIncidentListItem = z.output<typeof BreachIncidentListItem>;

/** `GET /api/v1/data-protection/breaches?limit=` — newest `openedAt` first. */
export const BreachIncidentListResponse = z.object({ items: z.array(BreachIncidentListItem) }).strict();
export type BreachIncidentListResponse = z.output<typeof BreachIncidentListResponse>;

export const BreachIncidentListQuery = z
  .object({ limit: z.coerce.number().int().min(1).max(BREACH_INCIDENT_LIST_LIMIT_MAX).default(BREACH_INCIDENT_LIST_LIMIT_DEFAULT) })
  .strict();
export type BreachIncidentListQuery = z.output<typeof BreachIncidentListQuery>;

/** A failed audit-chain check nobody has acknowledged — a signal to ASSESS, not yet a breach. */
export const BreachSignal = z
  .object({
    checkId: UuidString,
    verifiedAt: Iso8601Datetime,
    firstBrokenSeq: z.string().regex(/^\d+$/).nullable(),
    rowsVerified: z.number().int().min(0),
    triggerSource: z.string(),
    /** The incidents opened from this signal, oldest first. Empty ⇒ not yet assessed in the register. */
    incidentIds: z.array(UuidString),
  })
  .strict();
export type BreachSignal = z.output<typeof BreachSignal>;

/** `GET /api/v1/data-protection/signals?limit=` — newest `verifiedAt` first. */
export const BreachSignalListResponse = z.object({ items: z.array(BreachSignal) }).strict();
export type BreachSignalListResponse = z.output<typeof BreachSignalListResponse>;

export const BreachSignalListQuery = z
  .object({ limit: z.coerce.number().int().min(1).max(BREACH_SIGNAL_LIST_LIMIT_MAX).default(BREACH_SIGNAL_LIST_LIMIT_DEFAULT) })
  .strict();
export type BreachSignalListQuery = z.output<typeof BreachSignalListQuery>;

const count = z.number().int().min(0);

/**
 * `GET /api/v1/data-protection/members-on-record` — the monthly review's input. A count, ⛔ a threshold, ⛔ an alert.
 * `byState` is a strict object with ALL nine lifecycle states REQUIRED (0 when empty) — a `z.record` over the enum would make
 * every key optional. LOCKSTEP: `MemberLifecycleStateWire` / `@twt/domain` `MEMBER_LIFECYCLE_STATES` (tests/breach.test.ts).
 */
export const BreachMembersOnRecordResponse = z
  .object({
    asOf: Iso8601Datetime,
    /** Distinct Pariwars over the members `total` counts. */
    pariwarCount: count,
    /** Every member except `anonymized`. */
    total: count,
    byState: z
      .object({
        'pending-kyc': count,
        'pending-fee': count,
        'pending-valid': count,
        'lock-in': count,
        active: count,
        'active-in-grace': count,
        'lapsed-unpaid': count,
        withdrawn: count,
        anonymized: count,
      })
      .strict(),
  })
  .strict();
export type BreachMembersOnRecordResponse = z.output<typeof BreachMembersOnRecordResponse>;
