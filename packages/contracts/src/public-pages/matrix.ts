// packages/contracts/src/public-pages/matrix.ts
//
// The FR-74 Public-vs-Private visibility matrix — Zod schema + a loud-throw
// parser for the consumed contract the PII scrape CI gate reads (Story 1.16b,
// deferred-work D8-1.5). Story 1.16b shipped the SCHEMA; STORY 11a.1 POPULATED
// it against the public surfaces that actually ship, and extended the schema
// with four fail-closed constructs:
//
//   · `route` + `renders` per surface — the handle the route-coverage leg
//     compares against `apps/public/src/pages/**` in BOTH directions. `renders:
//     false` is the ONLY way a declared surface may have no shipped route
//     (D5: `member-directory` is declared BEFORE Story 11a.3 builds it, so 11a.3
//     FILLS a declared surface instead of INVENTING one).
//   · `tier1_public_exception` — the ONE ruled Tier-1-on-public exception
//     (`2026-08-19-135` cl.7(c) + `-136`; architecture §2.7): member name may be
//     decrypted from Tier-1 and rendered publicly on the Member Directory.
//     ⛔ EXACTLY ONE FIELD ON EXACTLY ONE SURFACE. It is carried as an ATTRIBUTED
//     construct so it can never read as an ordinary `public` field, and a second
//     one anywhere in the matrix is REJECTED. ⛔ It is an exception, not a door,
//     and ⛔ it does NOT reclassify the field: member name stays Tier-1
//     ciphertext + Tier-2 blind index.
//   · `escalations` + `escalation_count` — the trustee-attestation ledger,
//     cross-checked in BOTH directions so neither half can move alone (the
//     `scripts/governance-boundary/` precedent: attestation + entry + count bump
//     in the SAME commit). CODEOWNERS cannot express trustee review in this repo
//     (a single solo-builder handle), so attestation is a `.decision-log.md` ref.
//   · `per_pariwar_attribute_rule` — a RULE, ⛔ NEVER a field list. `2026-08-19-132`
//     R7 governs: the attribute set is extensible and Pariwar-selected, and
//     ⛔ there is no canonical directory schema. Enumerating member attributes
//     here would re-commit SD-1 (three attribute rows with no substrate at all,
//     unnoticed for seven epics).
//
// Authority: architecture §2.7 lines 1522-1524 (the Public-vs-Private matrix
// (FR-74) is canonical; new PII fields declare their tier at schema definition);
// Story 11a.1 AC (epics L3586-3620) defines the 4-tier model + the per-surface
// search_indexing_policy; PRD FR-74 (L1030-1040).
//
// Mirrors the throw-on-malformed posture of scripts/friction-budget/lib.ts
// `parseFrictionBudgetYaml` (Story 1.16a): a malformed matrix must fail the gate
// LOUDLY, never be silently skipped. On-pattern with the rest of
// packages/contracts/ (zod schemas + `.strict()` default, §Format patterns).

import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// The 4-tier visibility model (Story 11a.1 AC, epics L3596-3600)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The four visibility tiers, one of which every renderable field declares:
 *   - public               — Internet-visible without auth.
 *   - authenticated_member — logged-in members only (Story 1.9 admin / 3.2 member auth).
 *   - operator_restricted  — staff/trustees/admins with RBAC scope (Story 1.8).
 *   - never_exposed        — never rendered on any surface (Aadhaar, bank details;
 *                            Tier-1 PII per Story 1.5).
 */
export const VISIBILITY_TIERS = [
  'public',
  'authenticated_member',
  'operator_restricted',
  'never_exposed',
] as const;
export const VisibilityTierSchema = z.enum(VISIBILITY_TIERS);
export type VisibilityTier = z.output<typeof VisibilityTierSchema>;

/**
 * Tier rank (low → high sensitivity) — THE SINGLE COPY OF THE TIER ORDERING.
 *
 * It lives beside `VISIBILITY_TIERS` (which it must stay total over) rather than
 * in the engine, because BOTH consume it: the engine's leak rules + `getVisibility`
 * compare a field's rank against a viewer ceiling, and this module's escalation
 * ledger uses it to prove an entry actually ESCALATES. ⛔ A second copy is a
 * correctness hazard — two orderings drift and one of them silently stops being
 * the truth (Story 11a.1 AC11 forbids it explicitly).
 *
 * `never_exposed` (rank 3) exceeds every viewer ceiling (max 2) → it can never
 * be rendered on any surface, to any viewer.
 */
export const TIER_RANK: Record<VisibilityTier, number> = {
  public: 0,
  authenticated_member: 1,
  operator_restricted: 2,
  never_exposed: 3,
};

/** Per-surface search-indexing policy (epics L3614). */
export const SEARCH_INDEXING_POLICIES = ['index', 'noindex', 'conditional'] as const;
export const SearchIndexingPolicySchema = z.enum(SEARCH_INDEXING_POLICIES);
export type SearchIndexingPolicy = z.output<typeof SearchIndexingPolicySchema>;

/**
 * Per-surface EDGE-CACHEABILITY declaration — Story 11a.2 (ruling D4).
 *
 * ⭐ EXPLICIT, ⛔ never inferred from field tiers. The inference *"all-public fields
 * ⇒ cacheable"* is a rule the reader has to reconstruct, and it is immediately wrong
 * on two of the eight shipped surfaces: `/500` carries only public strings but must
 * be `no-store` (the data layer may be the very thing that failed, so a cached error
 * page would outlive the failure), and `/` is a redirect with no body to cache. An
 * explicit declaration is checkable; an inferred one is an argument.
 *
 *   · `edge_cacheable`   — the page sets a shared-cache `Cache-Control` (`public, …`).
 *   · `private_no_store` — the page must NOT be stored (`no-store` / `private`).
 *   · `redirect`         — no rendered body; the surface redirects. ⛔ Declaring this
 *                          for a page that actually renders is a lie the leg catches.
 *
 * ⛔ WHAT THIS DOES NOT CLAIM: nothing about Cloudflare or any CDN. The edge is not
 * in this repo and its selection is contingent on DPDPA legal review (architecture
 * §5.8a). The gate proves what the ORIGIN EMITS, and that is the whole claim.
 */
export const CACHE_POLICIES = ['edge_cacheable', 'private_no_store', 'redirect'] as const;
export const CachePolicySchema = z.enum(CACHE_POLICIES);
export type CachePolicy = z.output<typeof CachePolicySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Per-surface / per-field structure
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The PII tiers of architecture §2.7 / Story 1.5 (1 = KMS-envelope-encrypted, the
 * most sensitive). Declared as literals rather than imported from `@twt/domain`:
 * `@twt/contracts` must never pull a pg-touching namespace into its graph (it is
 * bundled by the RN Metro build — see the contracts↔domain bundle boundary).
 *
 * ⛔ A field's `pii_tier` is a FACT ABOUT THE DATA, never a visibility control.
 * `2026-08-19-136` cl.6 forbids this story — or any surface declaration — from
 * changing one. It is declared here only so the parser can REFUSE to let a
 * Tier-1 field reach `public` unattended.
 */
export const PiiTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type MatrixPiiTier = z.output<typeof PiiTierSchema>;

/**
 * The ruled, ATTRIBUTED exception permitting ONE Tier-1 field to render at
 * `public` on ONE surface class (`2026-08-19-135` cl.7(c) + `-136`, mirrored at
 * architecture §2.7 — member name decrypted from
 * `member_kyc_profiles.name_ciphertext` for the Member Directory).
 *
 * Every part is mandatory ON PURPOSE. The exception must be machine-readable AND
 * self-explaining: a reader who finds a Tier-1 field at `public` must be able to
 * see, in the same place, WHICH decision authorised it, WHY, and HOW FAR it
 * reaches. ⛔ A matrix in which the exception is indistinguishable from an
 * ordinary `public` field has failed the requirement it exists to satisfy.
 */
export const Tier1PublicExceptionSchema = z
  .object({
    /** The `.decision-log.md` entry that authorised it (e.g. `2026-08-19-136`). */
    decision: z.string().min(1),
    /** Why the Panel authorised it — in words, for the human reading the diff. */
    rationale: z.string().min(1),
    /** How far it reaches. ⛔ Never a general relaxation of the tier rule. */
    scope: z.string().min(1),
  })
  .strict();
export type Tier1PublicException = z.output<typeof Tier1PublicExceptionSchema>;

/** One renderable field on a surface, declaring exactly one of the 4 tiers. */
export const MatrixFieldSchema = z
  .object({
    id: z.string().min(1),
    tier: VisibilityTierSchema,
    description: z.string().optional(),
    /** The field's PII tier (§2.7), when it carries one. ⛔ Never changed by a surface declaration. */
    pii_tier: PiiTierSchema.optional(),
    /** Present ⟺ this is the one ruled Tier-1-at-`public` field (enforced below). */
    tier1_public_exception: Tier1PublicExceptionSchema.optional(),
    /**
     * A pointer to the policy that governs the field's rendered FORM (Story
     * 11a.1 AC5 — the per-Pariwar public-name presentation mode). ⛔ The matrix
     * REFERENCES the policy; it does not duplicate it (`epics.md` C2, §2.13.3).
     */
    presentation_policy_ref: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((field, ctx) => {
    const isTier1Public = field.pii_tier === 1 && field.tier === 'public';
    if (isTier1Public && field.tier1_public_exception === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tier1_public_exception'],
        message:
          `field "${field.id}" is Tier-1 PII declared at tier "public" without a ` +
          `tier1_public_exception block — fail-closed. A Tier-1 field reaches a public ` +
          `surface ONLY under an attributed Panel ruling (2026-08-19-135 cl.7(c) / -136); ` +
          `⛔ declaring it public without one is not a shortcut, it is the leak this ` +
          `matrix exists to prevent.`,
      });
    }
    if (!isTier1Public && field.tier1_public_exception !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tier1_public_exception'],
        message:
          `field "${field.id}" carries a tier1_public_exception but is not Tier-1 PII at ` +
          `tier "public" (pii_tier=${String(field.pii_tier)}, tier=${field.tier}) — the ` +
          `construct is not decorative. ⛔ An exception that does not except anything ` +
          `dilutes the one that does.`,
      });
    }
  });
export type MatrixField = z.output<typeof MatrixFieldSchema>;

/** One public-page surface: a render target with a tier-classified field set. */
export const MatrixSurfaceSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().optional(),
    /**
     * The route this surface renders at, as an `apps/public` path (`/terms`,
     * `/blog/[postId]`). REQUIRED — it is the handle the route-coverage leg
     * joins on, and a surface that cannot say where it renders cannot be
     * reconciled against anything.
     */
    route: z.string().min(1).startsWith('/'),
    /**
     * False ⟺ the surface is DECLARED but its route does not ship yet (D5). This
     * is the only escape from the route-coverage leg's "every matrix surface
     * names a real route" direction, and it is deliberately EXPLICIT: a missing
     * route must fail, an intentionally-absent one must be stated.
     */
    renders: z.boolean().default(true),
    search_indexing_policy: SearchIndexingPolicySchema,
    /**
     * REQUIRED (D4). No default — a default would let a new surface inherit a cache
     * posture nobody chose, which is exactly how `/blog` shipped with NO
     * `Cache-Control` at all for a whole epic while every check stayed green.
     */
    cache_policy: CachePolicySchema,
    /**
     * True ⟺ this surface renders a PAGINATED LIST and must therefore bind the
     * FR-91 page-param guard (`apps/public/src/lib/pagination.ts`).
     *
     * ⚠ Defaults to false because most surfaces are not lists — but the default is
     * safe only in one direction: a paginated surface that forgets to declare this
     * is not caught here, it is caught by the fact that an unbounded read has to
     * come from somewhere. What this DOES make structural is the other direction —
     * a surface that declares itself paginated and does not call the guard fails CI.
     */
    paginated: z.boolean().default(false),
    fields: z.array(MatrixFieldSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (const field of data.fields) {
      if (seen.has(field.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fields'],
          message: `duplicate field id "${field.id}" in surface "${data.id}"`,
        });
      }
      seen.add(field.id);
    }
  });
export type MatrixSurface = z.output<typeof MatrixSurfaceSchema>;

/**
 * One visibility ESCALATION — a field's tier moved toward `public`.
 *
 * The repo cannot mechanize "multiple trustee sign-offs" as a branch-protection
 * rule: `.github/CODEOWNERS` is a single solo-builder handle and trustees ratify
 * in `.decision-log.md`, not on GitHub. So attestation takes the shape this repo
 * already uses for exactly this problem (`scripts/governance-boundary/`): an
 * entry carrying `{rationale, decision}` + a `count` bump IN THE SAME COMMIT,
 * cross-checked in both directions so neither half can move alone.
 */
export const MatrixEscalationSchema = z
  .object({
    surface: z.string().min(1),
    field: z.string().min(1),
    from: VisibilityTierSchema,
    to: VisibilityTierSchema,
    /** ⛔ A non-empty `.decision-log.md` ref. An unattested escalation is the thing being prevented. */
    decision: z.string().min(1),
    rationale: z.string().min(1),
  })
  .strict()
  .superRefine((entry, ctx) => {
    // An ESCALATION moves toward `public` — i.e. DOWN in rank. A restriction is a
    // safe change that needs no attestation, and recording one here would inflate
    // the ledger with entries that prove nothing.
    if (TIER_RANK[entry.from] <= TIER_RANK[entry.to]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message:
          `escalation "${entry.surface}.${entry.field}" declares ${entry.from} → ${entry.to}, ` +
          `which is not an escalation (an escalation moves TOWARD public). A restriction ` +
          `does not belong in the escalation ledger.`,
      });
    }
  });
export type MatrixEscalation = z.output<typeof MatrixEscalationSchema>;

/**
 * The RULE governing per-Pariwar directory attributes — ⛔ NOT a list of them.
 *
 * `2026-08-19-132` R7: *"the attribute set is extensible and Pariwar-selected,
 * NOT a fixed global list. ⛔ There is no canonical directory schema."* A concrete
 * attribute's tier is REGISTRY DATA (`pariwar_custom_field_definitions` rows).
 * ⛔ CI cannot read those rows and must not be widened to — *"a CI gate that
 * needed a live tenant database would not be a CI gate"* (the 10.12 fence).
 *
 * So the matrix declares what CI CAN check from committed source: the tier a
 * Pariwar-selected attribute defaults to, and the ceiling it may never exceed.
 */
export const PerPariwarAttributeRuleSchema = z
  .object({
    /** The tier a newly-enabled Pariwar attribute takes absent an explicit declaration. */
    default_tier: VisibilityTierSchema,
    /** The most-exposed tier such an attribute may EVER reach. */
    ceiling_tier: VisibilityTierSchema,
    /** Where the concrete per-attribute declaration actually lives (⛔ not here). */
    declaration_site: z.string().min(1),
    note: z.string().optional(),
  })
  .strict()
  .superRefine((rule, ctx) => {
    // The default must be no more exposed than the ceiling, or the ceiling is a
    // decoration that the default already breaches on day one.
    if (TIER_RANK[rule.default_tier] < TIER_RANK[rule.ceiling_tier]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['default_tier'],
        message:
          `per_pariwar_attribute_rule: default_tier "${rule.default_tier}" is MORE exposed ` +
          `than ceiling_tier "${rule.ceiling_tier}" — the ceiling would be breached by the ` +
          `default itself.`,
      });
    }
  });
export type PerPariwarAttributeRule = z.output<typeof PerPariwarAttributeRuleSchema>;

/** The canonical Public-vs-Private matrix (FR-74). */
export const PublicVsPrivateMatrixSchema = z
  .object({
    version: z.number().int().positive(),
    surfaces: z.array(MatrixSurfaceSchema),
    /** The attestation ledger (AC8). Absent ⇒ empty, which the count must agree with. */
    escalations: z.array(MatrixEscalationSchema).default([]),
    /** The revert-sanity cross-check on `escalations` (AC8). */
    escalation_count: z.number().int().nonnegative().default(0),
    /** The per-Pariwar attribute RULE (AC6) — ⛔ never an attribute list. */
    per_pariwar_attribute_rule: PerPariwarAttributeRuleSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    // Route uniqueness (code review 2026-08-20): without this, two surfaces sharing a `route`
    // would collapse silently in `gate.ts:checkRouteCoverage`'s `Map` (last-one-wins), so the
    // duplicate would never be caught by the "fail-closed, both directions" route-coverage leg.
    const seenRoutes = new Set<string>();
    for (const surface of data.surfaces) {
      if (seen.has(surface.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['surfaces'],
          message: `duplicate surface id "${surface.id}" in matrix`,
        });
      }
      seen.add(surface.id);

      if (seenRoutes.has(surface.route)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['surfaces'],
          message:
            `duplicate route "${surface.route}" declared by more than one surface — ` +
            `route-coverage can only reconcile one surface per route.`,
        });
      }
      seenRoutes.add(surface.route);
    }

    // ── The Tier-1 public exceptions are an ENUMERATED ALLOWLIST, matrix-wide (AC4) ──
    // Scoped at the ROOT rather than per-surface on purpose: a per-surface check
    // would permit one exception on EVERY surface, which is a general door wearing
    // the costume of an exception.
    //
    // ⭐ WIDENED FROM "EXACTLY ONE" TO "EXACTLY THESE TWO" by Decision 2026-08-24-159 cl.2
    // (Story 11b.1 / D1(b)), and to **SIX** by `2026-08-28-165` cl.1 (Story 11b.3a — the four
    // nominee-bank pairs below). ⛔ The check is NOT relaxed — it is made STRICTER in the
    // dimension that matters. Before, ANY single field anywhere could hold the exception and
    // pass; now the permitted (surface, field) pairs are named, so an exception appearing on
    // some third field FAILS even while the COUNT is still within budget. A widening that
    // pins identity is not the same act as a widening that raises a ceiling.
    //
    // ⛔ ADDING TO THIS LIST IS A RULING, NEVER A CODE CHANGE. Each entry cites the decision
    // that authorised it; an entry without one is a relaxation wearing an allowlist's costume.
    // ⚠ And do NOT "fix" a failing third entry by appending it here — that inverts the
    // control. The gate failing is the gate working.
    const RULED_TIER1_PUBLIC_EXCEPTIONS: ReadonlyMap<string, string> = new Map([
      // The public Member Directory renders living members' full legal names by default.
      ['member-directory.member_name', '2026-08-19-135 cl.7(c) / -136'],
      // Story 11b.1 — the DECEASED member's name on the public Sahyog Drive pool index.
      // ⚠ Gated on the MEMBER'S OWN accepted T&C version pinning the post-death publication
      // clause, which the directory's is NOT. ⛔ It is ⛔ NOT a per-subject consent: the family
      // tick-box (`sahyog_drive_publication`) was DE-AUTHORISED by `2026-08-28-160` cl.3-5 and
      // the box retired by `-162` (Story 11b.9). ⚠ COMMENT ONLY — the entry below and its cited
      // decision are unchanged; ⛔ changing either is a governance act, ⛔ not a comment fix.
      // ⛔ Its scope does NOT reach 11b.3 (Sahyog Vivran) or 11b.6 (In Memoriam): those keep
      // first-name + last-initial, and moving them requires each surface's OWN Panel ruling.
      ['sahyog-drive.deceased_member_name', '2026-08-24-159 cl.2 (D1(b))'],
      // ── ⭐⭐ STORY 11b.3a — THE FOUR RULED NOMINEE-BANK PAIRS ON `sahyog-vivran` ────────────────
      // `2026-08-28-165` **cl.1** ruled ALL FOUR in scope on this surface (⭐ `vpa` was the genuinely
      // open one and is ruled IN), under `2026-08-28-160` **cl.10(a)**: the Panel does ⛔ not treat
      // public bank details as an automatic reason to prohibit publication, and the transparency
      // benefit during an active Sahyog Drive is ACCEPTED. **cl.3** ruled they are added AT SURFACE
      // DECLARATION — ⇒ these four entries land in the SAME COMMIT as the YAML field declarations.
      // ⛔ A pre-added entry is *"a standing permission with ⛔ no subject"* (routing note §11).
      //
      // ⭐⛔ FOUR ENTRIES, ⛔ NOT ONE, AND THAT IS THE CONTROL WORKING: the allowlist pins
      // **(surface, field)** PAIRS, so each field is named rather than a ceiling being raised.
      //
      // ⚠⛔ MASKING DOES ⛔ NOT CREATE A SECOND TIER, so these four cover BOTH states — full during
      // the active campaign, reduced to last-4 + bank/branch/IFSC after the per-Pariwar window
      // elapses. `-165` **cl.2**, verbatim: *"Do not create a separate Tier-1 classification merely
      // because the public projection is masked. The underlying account fields remain Tier-1."*
      // ⇒ the masked projection needs ⛔ NO entry of its own, and the specific future argument —
      // *"the masked view is only last-4, so it isn't really Tier-1"* — is FORECLOSED.
      //
      // ⚠ `nominee_bank_name` and `nominee_branch` are ⛔ NOT here and must never be: they are
      // Tier-3 PLAINTEXT (public, IFSC-derived, non-identifying), so an entry for either would be an
      // *"exception that does not except anything"*, which the field-level check already rejects.
      ['sahyog-vivran.nominee_account_holder_name', '2026-08-28-165 cl.1'],
      ['sahyog-vivran.nominee_account_number', '2026-08-28-165 cl.1'],
      ['sahyog-vivran.nominee_ifsc', '2026-08-28-165 cl.1'],
      ['sahyog-vivran.nominee_vpa', '2026-08-28-165 cl.1'],
    ]);

    const exceptions = data.surfaces.flatMap((surface) =>
      surface.fields
        .filter((f) => f.tier1_public_exception !== undefined)
        .map((f) => `${surface.id}.${f.id}`),
    );
    const unruled = exceptions.filter((id) => !RULED_TIER1_PUBLIC_EXCEPTIONS.has(id));
    if (unruled.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['surfaces'],
        message:
          `Tier-1 public exceptions are an ENUMERATED allowlist, and ${unruled.join(', ')} ` +
          `${unruled.length === 1 ? 'is' : 'are'} not on it. Permitted matrix-wide: ` +
          `${[...RULED_TIER1_PUBLIC_EXCEPTIONS.keys()].join(', ')}. A further exception is ` +
          `not an exception, it is a relaxation of the rule, and it needs its own ruling — ` +
          `see 2026-08-19-135 cl.7(c) / -136 and 2026-08-24-159 cl.2. Do NOT resolve this by ` +
          `adding the field to the allowlist: that inverts the control this check exists to be.`,
      });
    }

    // ── Escalation ledger ⇄ count, both directions (AC8) ──────────────────────
    if (data.escalation_count !== data.escalations.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['escalation_count'],
        message:
          `escalation_count is ${data.escalation_count} but the ledger holds ` +
          `${data.escalations.length} entr${data.escalations.length === 1 ? 'y' : 'ies'} — ` +
          `entry and count bump in the SAME commit so neither half can move alone.`,
      });
    }

    // An escalation must name a surface + field that actually exists, or the
    // ledger drifts into a record of changes to things that are no longer there.
    for (const [i, entry] of data.escalations.entries()) {
      const surface = data.surfaces.find((s) => s.id === entry.surface);
      if (surface === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['escalations', i, 'surface'],
          message: `escalation names surface "${entry.surface}", which the matrix does not declare (orphaned entry).`,
        });
        continue;
      }
      const field = surface.fields.find((f) => f.id === entry.field);
      if (field === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['escalations', i, 'field'],
          message:
            `escalation names field "${entry.field}" on surface "${entry.surface}", which ` +
            `that surface does not declare (orphaned entry).`,
        });
        continue;
      }
      // ── The ledger must match REALITY, not just be internally well-formed (code review
      // 2026-08-20). Without this, an entry could claim a field was escalated to `public` while
      // the field's OWN declared tier says something else — the attestation and the matrix would
      // silently disagree, and nothing would catch it.
      if (field.tier !== entry.to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['escalations', i, 'to'],
          message:
            `escalation "${entry.surface}.${entry.field}" claims the field was escalated TO ` +
            `"${entry.to}", but the field is currently declared at tier "${field.tier}" — the ` +
            `ledger and the matrix must agree. Fix whichever one is stale.`,
        });
      }
    }
  });
export type PublicVsPrivateMatrix = z.output<typeof PublicVsPrivateMatrixSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Parse + validate (loud throw on malformed; null on empty)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse + structurally validate the matrix YAML.
 *
 *   - blank / whitespace / comments-only document (YAML → null/undefined) →
 *     returns `null`, the empty-DOCUMENT sentinel.
 *   - structurally valid document → the typed matrix.
 *   - non-null but invalid document (unknown tier, missing key, extra key, wrong
 *     type, an unattributed Tier-1 `public` field, a second exception, a count
 *     mismatch, an orphaned or non-escalating ledger entry) → THROWS with a
 *     precise message. ⛔ A malformed matrix must fail LOUDLY, never degrade to
 *     "no entries" (mirrors `parseFrictionBudgetYaml`; the `parseCapabilityBar`
 *     doctrine).
 *
 * ⚠ THE `null` SENTINEL IS NO LONGER A PASS. Under Story 1.16b's scaffold posture
 * an empty document — and a `surfaces: []` structure — meant the gate evaluated
 * nothing and passed, which was correct while the matrix was deliberately empty.
 * Story 11a.1 POPULATED it, so both now mean the matrix was emptied or corrupted:
 * the gate and the live-render spec each FAIL on `null` rather than treating it as
 * a graceful no-op. This function still merely REPORTS the condition — deciding
 * what it means is the caller's job, and every caller now decides "fail".
 */
export function parsePublicVsPrivateMatrix(raw: string): PublicVsPrivateMatrix | null {
  let doc: unknown;
  try {
    doc = parseYaml(raw);
  } catch (err) {
    throw new Error(
      `public-vs-private-matrix.yaml: YAML parse error — ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // A blank / comments-only document is the empty-DOCUMENT sentinel, not a
  // malformed one — the distinction is the caller's to act on, and every caller
  // now treats it as a failure (see the doc comment above). A `surfaces: []`
  // structure is non-null and parses below, as a matrix that declares nothing.
  if (doc === null || doc === undefined) return null;

  const result = PublicVsPrivateMatrixSchema.safeParse(doc);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`public-vs-private-matrix.yaml: malformed matrix — ${detail}`);
  }
  return result.data;
}
