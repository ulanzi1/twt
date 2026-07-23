// packages/contracts/src/contributions/contribution-note.ts
//
// The Yogdaan Pratigya (Contribution Note) contract (Story 8.7, Task 1). Two concerns live here,
// mirroring `claims/documents.ts` (the Story 6.5 port/adapter precedent this file copies):
//
//   1. `ContributionNoteFacts` — the resolved, render-ready facts the HTML template consumes. The
//      resolver (apps/api `member-pool/`) assembles it from event-derived state; the template is a
//      pure function of it. Nothing here crosses the wire as JSON — the endpoint returns PDF BYTES —
//      but it is a contract nonetheless: it is the single declaration of what may appear on a
//      SHAREABLE artifact, so the PII discipline is enforceable in one `.strict()` place.
//   2. `ContributionNotePdfRenderer` — the render port. A PURE TS interface (browser-safe
//      `Uint8Array` bytes, so it stays in contracts, not platform-adapters). The concrete headless-
//      Chromium adapter is injected; tests inject a deterministic fake.
//
// ── The artifact is a Yogdaan Pratigya — NEVER a receipt / invoice (AC1) ────────────────────────────
// FR-33 + the `microcopy.yaml` vocabulary register (`receipt` → Contribution Note (Yogdaan Pratigya),
// `invoice` → …, both `member_only: false`). The prohibition binds the document body, the filename,
// the `Content-Disposition`, the i18n keys, the route path, and the OpenAPI summary — not just the
// visible copy. This is a TRUST artifact reflecting a relationship, not a transactional document.
//
// ── The load-bearing invariant: a shareable artifact must never over-claim (AC3 / D3) ───────────────
// Story 8.6 D1 established that showing a member their own `yellow` status is legitimate because the
// Yogdaan Bahi is a PRIVATE self-view, while the yellow-never-confirmed invariant governs public /
// aggregate surfaces. A PDF BREAKS that clean split: it is fetched from a self-view and then forwarded
// to a landlord, a relative, a WhatsApp group. So the honesty cannot live in the surface — it must be
// PRINTED ON THE ARTIFACT. Three elements therefore key off `status` and nothing else:
//   · the status block copy (green = confirmed; yellow = "you told us you paid, verification pending";
//     red = a mismatch is under review; grey = on record, cycle closed with no verdict — NEVER
//     "missed"/"failed"/"voided", per the Story 8.6 D3 ratification);
//   · the UTR, embedded ONLY when `green` (epics.md:2990 "UTR (when confirmed)");
//   · the *सत्यापित* warm-red verification stamp, reserved for `green` ONLY.
// The `utr`-only-when-green rule is enforced STRUCTURALLY here (the `.superRefine` below), not by
// template discipline — a non-green facts object carrying a UTR cannot be constructed at all.
//
// ── PII discipline (Story 1.16b), load-bearing because this artifact LEAVES the app ─────────────────
// ONLY first-name + last-initial for both the deceased member and the contributing member. There is
// DELIBERATELY no phone, address, Aadhaar, bank-account, nominee, full-name or ciphertext field on
// this shape — not "unused", but structurally absent, so a future dev cannot put one on the artifact
// without this contract's tests going red. `memberRef` is a DERIVED, non-reversible traceability
// watermark — see its doc comment; it is NOT a membership number ([[project_membership_number_deferred_feature]]).
//
// ── Contracts discipline ────────────────────────────────────────────────────────────────────────────
// MUST NOT import `@twt/domain` at source level (the browser-bundle rule — `pg` would leak into the RN
// Metro bundle, [[project_contracts_domain_bundle_boundary]]). `ContributionStatus` is imported from
// the sibling `contribution-history.ts` (same package). NO `.openapi()` registration — the binary PDF
// route is documented by hand in the emitter, and nothing here crosses the wire as JSON.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';
import { ContributionStatus } from './contribution-history.js';

/**
 * The Niyamavali rule version in force at the contribution instant (AC4). Resolved as-of the
 * contribution's `attestedAt` — never as-of now — so a Note regenerated years later still cites the
 * rule that actually governed the contribution.
 *
 * `null` on the facts object is a FIRST-CLASS, HONEST ABSENCE: the launch tenant has no published
 * contribution-discipline clause today, and the generator NEVER fabricates, back-dates, or defaults a
 * version string ([[feedback_record_unattested_no_backfill]]). The template renders "not yet published".
 */
export const ContributionNoteNiyamavaliRef = z
  .object({
    /** The governing clause's stable address, `niy.<section>.<clause>` (Story 2.3 `ClauseId` format). */
    clauseId: z.string().min(1),
    /** The immutable version row's id — the `clause_version_id` epics.md:2990 asks the Note to carry. */
    clauseVersionId: z.string().uuid(),
    /** The human-facing version number of that clause version (monotonic per clause). */
    version: z.number().int().positive(),
  })
  .strict();
export type ContributionNoteNiyamavaliRef = z.output<typeof ContributionNoteNiyamavaliRef>;

/**
 * The per-Pariwar branding bundle the Note renders (AC5), read from the Story 1.7 Pariwar-Passport and
 * degraded to TWT defaults PER FIELD by the resolver (an unset logo does not cost the Pariwar its
 * colours). Value-aligned with the domain `BrandingBundle` (re-declared per the browser-bundle rule);
 * only the fields the artifact actually renders appear here.
 */
export const ContributionNoteBranding = z
  .object({
    /** Hindi display name — the Hindi-primary heading. */
    displayNameHi: z.string().min(1),
    /** English display name — the gloss beneath it. */
    displayNameEn: z.string().min(1),
    /** Logo URL, or `null` when the Pariwar has not set one (→ the TWT wordmark alone). */
    logoUrl: z.string().min(1).nullable(),
    /** Primary brand colour, hex `#RRGGBB`. */
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    /** Secondary brand colour, hex `#RRGGBB`. */
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  })
  .strict();
export type ContributionNoteBranding = z.output<typeof ContributionNoteBranding>;

/**
 * The render-ready facts of ONE Contribution Note (AC1-AC5). Assembled server-side from event-derived
 * state by the apps/api resolver; the HTML template is a pure function of this object.
 *
 * Every status-varying element of the artifact keys off `status` — the output of the ONE
 * `deriveContributionStatus` function (`packages/domain/src/contribution/history.ts:94`) for THIS
 * contribution. There is no second derivation anywhere in the Note path (D3(b)).
 */
export const ContributionNoteFacts = z
  .object({
    /** The `contribution.utr-attested` event id — the Note's subject and its stable identity. */
    contributionId: z.string().min(1),
    /** The honestly-derived four-state tone (D3(b)) — governs the status block, the UTR, the stamp. */
    status: ContributionStatus,
    /** The contribution instant (the attestation's `occurred_at`; Gregorian + Latin on the artifact). */
    attestedAt: Iso8601Datetime,
    /** When THIS render happened. The only field that legitimately differs between regenerations (AC7). */
    generatedAt: Iso8601Datetime,
    /** The member-facing cycle reference (the cycle's freeze month, `YYYY-MM`) — 8.6's `cycleRef`. */
    cycleRef: z.string().min(1),

    // ── The deceased member whose family the pool supports (PII-shielded — NOT the nominee) ──────────
    deceasedFirstName: z.string().min(1),
    /** Last-name INITIAL only. `.max(16)` bounds one Devanagari grapheme cluster (the 8.6 bound). */
    deceasedLastInitial: z.string().max(16),

    // ── The contributing member — this is THEIR artifact, so they are named on it (PII-shielded) ─────
    memberFirstName: z.string().min(1),
    memberLastInitial: z.string().max(16),
    /**
     * The member-identifier WATERMARK (AC5 / FR-33's `[v1-S]` donor-ID watermark) — a short, stable,
     * NON-REVERSIBLE display form DERIVED from the existing `member_id`, used for traceability if a
     * Note is forwarded onward.
     *
     * It is emphatically NOT a membership number: no `member_number` column, generation scheme, or
     * search key is introduced by this story ([[project_membership_number_deferred_feature]] —
     * membership number is a confirmed product requirement owned by a dedicated identity feature).
     * Do NOT display it as an identity a member could be asked to quote, and do NOT make it searchable.
     */
    memberRef: z.string().min(1).max(32),

    // ── Pool identity — resolved by the SHARED `resolvePoolIdentity` so the Note, the card and the
    //    passbook are byte-identical about the same pool (D6). A divergence reads as a forgery. ───────
    poolLetterCode: z.string().min(1),
    poolName: z.string().min(1).nullable(),
    poolCanonicalIdentifier: z.string().min(1),
    /** The SNAPSHOTTED pool `fixed_amount` (whole INR) — echoed through, never recomputed. */
    amountInr: z.number().int().positive(),

    /**
     * The deterministic payment reference (`tr=`) from `deriveContributionReference` (Story 7.7) — the
     * SAME value the UPI intent used. Present on EVERY Note regardless of status: it references the
     * member's own payment attempt, and asserts nothing about settlement (AC3).
     */
    paymentReference: z.string().min(1),
    /**
     * The member-pasted UTR — present ONLY when `status === 'green'` (AC3; epics.md:2990 "UTR (when
     * confirmed)"). Structurally forbidden on any other status by the refinement below: a non-green
     * Note shows `paymentReference` and no UTR, so it never implies a settled payment.
     */
    utr: z.string().min(1).optional(),

    /** The governing Niyamavali version as-of `attestedAt`, or `null` = honest absence (AC4). */
    niyamavali: ContributionNoteNiyamavaliRef.nullable(),
    /** Per-Pariwar branding, per-field-degraded to TWT defaults by the resolver (AC5). */
    branding: ContributionNoteBranding,
  })
  .strict()
  .superRefine((facts, ctx) => {
    // The load-bearing structural guard (AC3 / D3(b)): a UTR asserts a settled, reconciliation-matched
    // payment. Only `green` means that. Enforcing it HERE — not in the template — means a future dev
    // cannot ship an over-claiming artifact by editing HTML; the facts object itself refuses to exist.
    if (facts.status !== 'green' && facts.utr !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['utr'],
        message:
          `utr may only be present when status === 'green' (received '${facts.status}'). ` +
          'A non-green Contribution Note must never assert a settled payment (Story 8.7 AC3).',
      });
    }
  });
export type ContributionNoteFacts = z.output<typeof ContributionNoteFacts>;

/**
 * Per-render options for {@link ContributionNotePdfRenderer}. Deliberately engine-neutral — no
 * Chromium/Puppeteer type may appear here (the port must survive the adapter moving to a jobs-side
 * render service without touching the module, the route, or the template).
 */
export interface ContributionNotePdfRenderOptions {
  /** The PDF document title (metadata + the screen-reader document name). Never a prohibited term (AC1). */
  readonly title: string;
  /** Hard wall-clock ceiling for one render. A hung browser must fail the request, not the process. */
  readonly timeoutMs?: number;
  /** Hard output ceiling. A pathological render must be rejected, never streamed to the member. */
  readonly maxBytes?: number;
}

/**
 * The Contribution-Note render port (D1). A PURE TS interface — the concrete headless-Chromium adapter
 * lives in `@twt/platform-adapters` and is injected on `AppDeps`; tests inject a deterministic fake
 * (the `createInMemoryClaimDocumentStorage` precedent).
 *
 * Why the port exists rather than calling the engine directly: headless Chromium is the ONLY engine
 * satisfying BOTH AC2 legs — correct Devanagari shaping (it runs HarfBuzz; `pdfkit`/`pdfmake`/
 * `@react-pdf/renderer`/`pdf-lib` perform NO complex-script shaping and render broken matras/conjuncts
 * while passing every Latin smoke test) and a tagged PDF structure tree (Chrome exports tagged by
 * default). It is also by far the heaviest dependency in the deployable image. Behind this port the
 * engine lives in exactly one adapter file, every other test runs without a browser, and if the
 * container weight later becomes a deployment problem the adapter can move to a render service with no
 * change to the resolver, the route, or the template.
 *
 * Implementations MUST produce a TAGGED PDF (a structure tree, so a screen reader reads the document
 * in logical order — AC2) and MUST embed the faces the HTML references rather than substituting.
 */
export interface ContributionNotePdfRenderer {
  /**
   * Render a fully self-contained HTML document (all CSS + fonts inlined — the render environment is
   * OFFLINE and font-less by default, D5) to PDF bytes. Throws on timeout, on exceeding `maxBytes`, or
   * on any engine failure: the route surfaces an error rather than a blank or partial PDF (AC/Task 4 —
   * a partially-rendered artifact is worse than no artifact).
   */
  render(html: string, opts: ContributionNotePdfRenderOptions): Promise<Uint8Array>;
}
