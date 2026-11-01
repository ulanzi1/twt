// packages/contracts/src/memorial/takedown.ts
//
// The helpline's take-down of a family memorial at the nominee's request — the admin wire (Story 11b.4a, Task 4.2;
// `#decision-2026-10-27-412` MP6–MP9, MP12, MP14; `-395` item 3 / `-411` item 1 — only the nominee who sent it).
// ⚠ BY VALUE (⛔ no `@twt/domain` import — the admin SPA imports this). `tests/memorial.test.ts` pins the outcome tuple EQUAL to
// the domain's (which generates the pgEnum).
// Operator-facing and English-only (the admin precedent). ⛔ No family text is ever INPUT here: the operator records that the
// nominee asked, ⛔ not why — there is ⛔ no note field (`-393` (ii): ⛔ no merit test), and `.strict()` makes one a 400.

import { z } from 'zod';

import { MemorialStateSchema } from './dto.js';
import { MemorialKinshipRowOutput } from './kinship.js';

/** How a request ended (MP8). ⚠ LOCKSTEP with the domain's `MEMORIAL_TAKEDOWN_OUTCOMES` (pinned by test). */
export const MEMORIAL_TAKEDOWN_OUTCOMES = ['taken_down', 'kept', 'superseded'] as const;
export type MemorialTakedownOutcome = (typeof MEMORIAL_TAKEDOWN_OUTCOMES)[number];
export const MemorialTakedownOutcomeSchema = z.enum(MEMORIAL_TAKEDOWN_OUTCOMES);

/**
 * The admin step-up context of the take-down act ONLY (`{ outcome: 'taken_down' }`). ⚠ Step-up contexts have ⛔ no registry
 * (`requireStepUp(deps, actionContext)` takes a free string) — so the route AND the admin OTP caller import THIS constant, ⛔
 * a retyped literal (the 10.21 footgun).
 */
export const MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT = 'memorial_takedown';

/** Every error code the take-down routes answer — closed. */
export const MEMORIAL_TAKEDOWN_ERROR_CODES = [
  'memorial_takedown.not_found',
  'memorial_takedown.request_open',
  'memorial_takedown.already_decided',
  // 409 — on the outcome (`taken_down`) AND on the request record: the version on the page is not the one the request is about.
  'memorial_takedown.shown_changed',
  'memorial_takedown.shown_unchanged',
  // 400 — the nominee's first contact is in the future or more than 7 days before the recording (MP14 (b)).
  'memorial_takedown.first_contact_out_of_range',
] as const;
export type MemorialTakedownErrorCode = (typeof MEMORIAL_TAKEDOWN_ERROR_CODES)[number];

// ── MP12 — the deceased member's drives with a shown memorial ───────────────────────────────────────────────────────────────

export const MemorialTakedownMemberDrive = z
  .object({
    poolId: z.string(),
    /** The drive's canonical identifier (`P-YYYY-MM-###`) — what the operator reads aloud; ⛔ never the public token. */
    poolCanonicalIdentifier: z.string(),
    hasOpenRequest: z.boolean(),
  })
  .strict();

/** `GET …/memorial-takedowns/members/:memberId/drives` — `[]` for a member with ⛔ no shown memorial or an erased one. */
export const MemorialTakedownMemberDrivesResponse = z.object({ drives: z.array(MemorialTakedownMemberDrive) }).strict();
export type MemorialTakedownMemberDrivesResponse = z.output<typeof MemorialTakedownMemberDrivesResponse>;

// ── AC6 — the drive view ────────────────────────────────────────────────────────────────────────────────────────────────────

export const MemorialTakedownRequestView = z
  .object({
    requestId: z.string(),
    firstContactAt: z.string(),
    receivedAt: z.string(),
    dueAt: z.string(),
    /** Open AND past `dueAt` (derived — MP14). */
    overdue: z.boolean(),
    actorDisplay: z.string(),
    outcome: z
      .object({
        outcome: MemorialTakedownOutcomeSchema,
        decidedAt: z.string(),
        actorDisplay: z.string(),
        /** AC7 — decided after `dueAt`; the screen says *"decided after the due date"*. */
        decidedAfterDue: z.boolean(),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type MemorialTakedownRequestView = z.output<typeof MemorialTakedownRequestView>;

export const MemorialTakedownDriveResponse = z
  .object({
    poolId: z.string(),
    poolCanonicalIdentifier: z.string(),
    /** The family's state of the chain (the chain rule — Trap 18). */
    memorialState: MemorialStateSchema,
    /** The version on the page — as the public reads it (joined, ⛔ no marker — `-411` item 3); `null` when ⛔ none is shown. */
    shown: z
      .object({
        submissionId: z.string(),
        sentAt: z.string(),
        /** `null` on a decrypt failure. */
        words: z.array(z.string()).nullable(),
        hasPhoto: z.boolean(),
        /** A 5-minute signed URL (the audited `memorial.photo.url` path); `null` when ⛔ no photo is shown. */
        photoUrl: z.string().nullable(),
        altText: z.string().nullable(),
        /**
         * Story 11b.5a (KL11) — the family list as the public page shows it: grouped by relation, left-out entries absent with ⛔ no
         * trace, each name through `isolateMemorialBidi` (the SAME helper as the page — it wraps a name holding a direction control; RD19). `[]` when the version has ⛔ no list or every entry was left
         * out; `null` on a decrypt failure (as `words`). ⛔ Never an `inPhoto` tick.
         */
        kinship: z.array(MemorialKinshipRowOutput).nullable(),
      })
      .strict()
      .nullable(),
    /** MP7 — the nominee recorded on the SHOWN version: call THIS number back. `null` fields ⇒ unreadable. */
    nomineeToCallBack: z.object({ name: z.string().nullable(), mobile: z.string().nullable() }).strict().nullable(),
    /**
     * MP8 (b) — how a smaller fix is done for this chain: `send_now` (the nominee may send a new version now; this one stays up
     * until the Trust approves the new one) or `take_down_first` (a clean `approved` head — a new version can be sent only after
     * this one is taken down). `null` when ⛔ nothing is shown.
     */
    smallerFix: z.enum(['send_now', 'take_down_first']).nullable(),
    /**
     * The CURRENT nominee (who sends any new version — their `claim_handover` step-up), and whether they are the nominee
     * recorded on the shown version. `null` when ⛔ no current nominee resolves.
     */
    currentNominee: z.object({ name: z.string().nullable(), isNomineeToCallBack: z.boolean() }).strict().nullable(),
    /** Oldest first. */
    requests: z.array(MemorialTakedownRequestView),
  })
  .strict();
export type MemorialTakedownDriveResponse = z.output<typeof MemorialTakedownDriveResponse>;

// ── AC10 — the open-request list ────────────────────────────────────────────────────────────────────────────────────────────

/** `?open=true` — the only list there is (⛔ never a list of every published memorial — MP12). */
export const MemorialTakedownRequestListQuery = z.object({ open: z.literal('true') }).strict();

export const MemorialTakedownOpenRequest = z
  .object({
    requestId: z.string(),
    poolId: z.string(),
    poolCanonicalIdentifier: z.string(),
    firstContactAt: z.string(),
    receivedAt: z.string(),
    dueAt: z.string(),
    overdue: z.boolean(),
  })
  .strict();

/** OLDEST FIRST (by `dueAt`). */
export const MemorialTakedownOpenRequestsResponse = z.object({ requests: z.array(MemorialTakedownOpenRequest) }).strict();
export type MemorialTakedownOpenRequestsResponse = z.output<typeof MemorialTakedownOpenRequestsResponse>;

// ── AC6 / AC7 — the writes ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * `POST …/drives/:poolId/requests` — the operator ticks that they called the nominee back (MP7: anything but `true` is a 400),
 * enters when the nominee FIRST asked (MP14 (b): ⛔ not in the future, ⛔ not more than 7 days ago — the handler's 400, 0187's CHECK
 * the backstop) and echoes the version they were LOOKING AT. ⛔ No note, ⛔ no reason (`.strict()`).
 */
export const MemorialTakedownRequestInput = z
  .object({
    calledBack: z.literal(true),
    firstContactAt: z.string().datetime({ offset: true }),
    /**
     * MP8 (c), review R1 (BigDev, option A) — the drive view's `shown.submissionId`, echoed back. The call-back was to THAT
     * version's nominee (MP7), so the request is recorded only while it is still the version on the page — else
     * `409 memorial_takedown.shown_changed` (checked UNDER the pool lock, as `decide` does) and nothing is written.
     */
    shownSubmissionId: z.string().uuid(),
  })
  .strict();
export type MemorialTakedownRequestInput = z.output<typeof MemorialTakedownRequestInput>;

export const MemorialTakedownRequestResponse = z
  .object({ requestId: z.string(), poolId: z.string(), dueAt: z.string() })
  .strict();
export type MemorialTakedownRequestResponse = z.output<typeof MemorialTakedownRequestResponse>;

/** `POST …/requests/:requestId/outcome` — `taken_down` needs the `memorial_takedown` step-up; `kept` / `superseded` do ⛔ not. */
export const MemorialTakedownOutcomeInput = z.object({ outcome: MemorialTakedownOutcomeSchema }).strict();
export type MemorialTakedownOutcomeInput = z.output<typeof MemorialTakedownOutcomeInput>;

export const MemorialTakedownOutcomeResponse = z
  .object({ requestId: z.string(), outcome: MemorialTakedownOutcomeSchema, decidedAt: z.string() })
  .strict();
export type MemorialTakedownOutcomeResponse = z.output<typeof MemorialTakedownOutcomeResponse>;
