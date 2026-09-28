// packages/contracts/src/claims/contact.ts
//
// The claim CONTACT RECORD — Story 6.19a (AC1, AC8a; the 6.19 shared spec's D5 / D15 / D16, committed in
// `2026-09-28-265`). The family's postal address for each nominee, the claimant's side (one of the nominees, or
// the claimant's name / mobile / address and their relationship to each nominee), and the filer's agreement
// that these people may be contacted (`2026-09-27-253` cl.1).
//
// ── TWO request shapes (AC1) ───────────────────────────────────────────────────────────────────────────────
//   · MEMBER — the FULL record, by RANK (the family never sees a version id): an address for 0–2 distinct
//     ranks, exactly one claimant side, `agreed: true`.
//   · HELPLINE — possibly PARTIAL, by `nomineeVersionId` (from the admin presence read): at least one of rows,
//     the claimant block, `claimantNomineeVersionId`, or `agreed: true` alone (W8); ⛔ never both claimant sides.
// ⚠ The contract can ⛔ not see the declaration or the stored row: "exactly the projected ranks", "inside the
// allowed set", "the creating write's agreement" are the WRITER's (W1–W8) — 400 `claim_contact.<code>` there.
//
// ── Validators are INPUT-only ──────────────────────────────────────────────────────────────────────────────
// `MobileNumber` for the claimant's mobile; `trim().min(1).max(500)` for every address (as `NomineeDeclareEntry`);
// the claimant's name a trimmed bounded string — ⛔ NOT `EnglishScriptName` (D9: `-227` cl.9 scoped the English
// rule to the two names the name check compares, and UX-DR57 requires bilingual input).
// ⚠ RESPONSES ARE PARSED (`apps/api/src/plugins/zod-openapi`) — the read DTOs use PLAIN bounded strings, wide
// enough for the decrypt-failed sentinel, so an undecryptable value ⛔ never 500s the read.
//
// ⛔ PII: a request body carries Tier-1 values (REQUEST-only, ⛔ never logged); the presence read carries ⛔ no
// value at all; the plaintext read is the helpline operator's audited read-back ONLY (AC8a (ii)).
// ⛔ Contracts never import `@twt/domain` — the reason and window vocabularies below are re-declared and
// pinned against the domain by `tests/claim-contact.test.ts`.

import { z } from 'zod';

import { MobileNumber } from '../_common/primitives.js';
import { ClaimantNomineeRelationship } from '../nominee/declaration.js';

/** The copy the filer was shown and the SMS language (W9). */
export const ClaimContactLocale = z.enum(['hi', 'en']);
export type ClaimContactLocale = z.output<typeof ClaimContactLocale>;

/** Every postal address — the `NomineeDeclareEntry` bound. INPUT-only. */
export const ClaimContactAddress = z.string().trim().min(1).max(500);

/** The claimant block (W6) — all three, or none. D9: the name is ⛔ not English-gated. INPUT-only. */
export const ClaimantContactBlock = z
  .object({
    name: z.string().trim().min(1).max(200),
    mobile: MobileNumber,
    address: ClaimContactAddress,
  })
  .strict();
export type ClaimantContactBlock = z.output<typeof ClaimantContactBlock>;

const NomineeRank = z.union([z.literal(1), z.literal(2)]);

// ── The MEMBER request (the full record) ──────────────────────────────────────────────────────────────────

export const MemberClaimContactNominee = z
  .object({
    rank: NomineeRank,
    address: ClaimContactAddress,
    /** The claimant's relationship to THIS nominee — required with the claimant block, ⛔ never otherwise. */
    relationship: ClaimantNomineeRelationship.optional(),
  })
  .strict();

/**
 * `POST /api/v1/member/claims/:claimCaseId/contact`. ⚠ **No declared nominee:** `nominees` is then empty and
 * the claimant block is required (there is no nominee to be) — the family can still finish filing.
 */
export const RecordMemberClaimContactRequest = z
  .object({
    locale: ClaimContactLocale,
    nominees: z.array(MemberClaimContactNominee).max(2),
    claimantNomineeRank: NomineeRank.optional(),
    claimant: ClaimantContactBlock.optional(),
    /** The filer's agreement to be contacted — mandatory (`-253` cl.1: *"The filer confirms — in the form"*). */
    agreed: z.literal(true),
  })
  .strict()
  .superRefine((body, ctx) => {
    const ranks = body.nominees.map((n) => n.rank);
    if (new Set(ranks).size !== ranks.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nominees'], message: 'each rank at most once' });
    }
    const sides = Number(body.claimantNomineeRank !== undefined) + Number(body.claimant !== undefined);
    if (sides !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['claimant'],
        message: 'exactly one of claimantNomineeRank or the claimant block',
      });
    }
    if (body.claimantNomineeRank !== undefined && !ranks.includes(body.claimantNomineeRank)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['claimantNomineeRank'], message: 'the claimant rank must be one of the nominees' });
    }
    body.nominees.forEach((n, i) => {
      const needs = body.claimant !== undefined;
      if (needs && n.relationship === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nominees', i, 'relationship'], message: 'the claimant’s relationship to each nominee is required' });
      }
      if (!needs && n.relationship !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nominees', i, 'relationship'], message: 'a relationship is asked only when the claimant is none of the nominees' });
      }
    });
  });
export type RecordMemberClaimContactRequest = z.output<typeof RecordMemberClaimContactRequest>;

/** The member's answer — ⛔ no value echoed back, ⛔ no version id. */
export const RecordMemberClaimContactResponse = z
  .object({
    recorded: z.literal(true),
    claimantSide: z.enum(['nominee', 'claimant']),
    agreementRecorded: z.boolean(),
  })
  .strict();
export type RecordMemberClaimContactResponse = z.output<typeof RecordMemberClaimContactResponse>;

// ── The HELPLINE request (possibly partial) ───────────────────────────────────────────────────────────────

export const HelplineClaimContactNominee = z
  .object({
    nomineeVersionId: z.string().uuid(),
    address: ClaimContactAddress.optional(),
    relationship: ClaimantNomineeRelationship.optional(),
  })
  .strict()
  .refine((r) => r.address !== undefined || r.relationship !== undefined, {
    message: 'a row carries an address, a relationship, or both',
  });

/** `POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/contact`. */
export const RecordHelplineClaimContactRequest = z
  .object({
    locale: ClaimContactLocale,
    nominees: z.array(HelplineClaimContactNominee).max(2).optional(),
    claimantNomineeVersionId: z.string().uuid().optional(),
    claimant: ClaimantContactBlock.optional(),
    /** Read aloud from the same copy the app shows. Alone, it is a valid body (W8). */
    agreed: z.literal(true).optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    const rows = body.nominees ?? [];
    if (
      rows.length === 0 &&
      body.claimant === undefined &&
      body.claimantNomineeVersionId === undefined &&
      body.agreed === undefined
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'nothing to record' });
    }
    if (body.claimant !== undefined && body.claimantNomineeVersionId !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['claimant'], message: 'never both claimant sides' });
    }
    const ids = rows.map((r) => r.nomineeVersionId.toLowerCase());
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nominees'], message: 'each version at most once' });
    }
  });
export type RecordHelplineClaimContactRequest = z.output<typeof RecordHelplineClaimContactRequest>;

// ── The admin PRESENCE read (AC8a (i) — `claim.view_nominee_name_check`, ⛔ no value) ─────────────────────

/** D14's reasons, in precedence order. ⚠ LOCKSTEP with `@twt/domain` `CLAIM_CONTACT_REQUIRED_REASONS`. */
export const ClaimContactRequiredReason = z.enum([
  'no_record',
  'agreement_withdrawn',
  'nominee_address_missing',
  'claimant_details_missing',
]);
export type ClaimContactRequiredReason = z.output<typeof ClaimContactRequiredReason>;

export const ClaimContactPresenceNominee = z
  .object({
    rank: NomineeRank,
    nomineeVersionId: z.string().uuid(),
    addressPresent: z.boolean(),
    relationshipPresent: z.boolean(),
    /** Which row counts for this version: its own, one carried up its correction chain (W4a), or none. */
    row: z.enum(['own', 'chain', 'none']),
  })
  .strict();

export const ClaimContactPresenceResponse = z
  .object({
    claimCaseId: z.string().uuid(),
    recorded: z.boolean(),
    /** The allowed versions are the EFFECTIVE ones once determined, else the PROJECTED ones (W2). */
    determination: z.enum(['effective', 'not_effective']),
    /** What the helpline may do in the claim's state (W3/W5). */
    writeMode: z.enum(['full', 'add_only', 'not_writable']),
    nominees: z.array(ClaimContactPresenceNominee).max(2),
    claimantSide: z.enum(['nominee', 'claimant', 'none']),
    claimantNomineeVersionId: z.string().uuid().nullable(),
    /** The stored claimant version counts for an allowed version (own or through its chain). */
    claimantIsAnAllowedNominee: z.boolean(),
    /** The claimant is none of the nominees, so the claimant block and the relationships are asked. */
    claimantBlockNeeded: z.boolean(),
    agreement: z.enum(['live', 'revoked', 'none']),
    contactLocale: ClaimContactLocale.nullable(),
    /** D14 evaluated now against the allowed versions — `null` when the record is complete. */
    missing: ClaimContactRequiredReason.nullable(),
  })
  .strict();
export type ClaimContactPresenceResponse = z.output<typeof ClaimContactPresenceResponse>;

export const RecordHelplineClaimContactResponse = z
  .object({
    presence: ClaimContactPresenceResponse,
    agreementRecorded: z.boolean(),
    /** W8 — `agreed` over a live agreement after verification is a confirmation, ⛔ not data. */
    agreementIgnored: z.boolean(),
  })
  .strict();
export type RecordHelplineClaimContactResponse = z.output<typeof RecordHelplineClaimContactResponse>;

// ── The admin PLAINTEXT read (AC8a (ii) — `claim.file`, decrypted, audited per read) ──────────────────────
// ⚠ PLAIN bounded strings (⛔ not the input validators): an undecryptable value comes back as the
// decrypt-failed sentinel and must still parse.

const ReadBackText = z.string().max(600);

export const ClaimContactDetailsResponse = z
  .object({
    claimCaseId: z.string().uuid(),
    nominees: z
      .array(
        z
          .object({
            rank: NomineeRank,
            nomineeVersionId: z.string().uuid(),
            row: z.enum(['own', 'chain', 'none']),
            address: ReadBackText.nullable(),
            relationship: z.string().max(64).nullable(),
          })
          .strict(),
      )
      .max(2),
    claimantNomineeVersionId: z.string().uuid().nullable(),
    claimant: z.object({ name: ReadBackText, mobile: ReadBackText, address: ReadBackText }).strict().nullable(),
  })
  .strict();
export type ClaimContactDetailsResponse = z.output<typeof ClaimContactDetailsResponse>;
