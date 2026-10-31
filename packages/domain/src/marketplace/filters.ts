// Module manifest grammars + `parseModuleManifest` — Story 12.1 (QE5, QE9; AC7).
//
// The ONE place a module's content rules live. The DB enforces only the six named CHECKs of migration
// 0193 (QE5); everything else — text bounds, the URL rules, the secret-name pattern, the two filter
// grammars, the branding bundle — is validated HERE, at WRITE, by `parseModuleManifest`. The same field
// schemas AND the window rule (`refineModuleWindow`) are reused by `ModuleAuthoredPayloadSchema` (events.ts),
// so the genesis payload and the row can never be held to different rules.
//
// ── CLOSED, VERSIONED, `.strict()`, ⛔ EVALUATED in 12.1 ──────────────────────────────────────────
// 12.1 exports ⛔ evaluator: which members SEE a module is Story 12.3's predicate, and 12.3 owes its own
// policy note. What 12.1 FIXES is the meaning 12.3 must evaluate (Story 12.1 "Policy meaning"):
//   - `members-all` = every member of the Pariwar; ZERO eligibility clauses = no restriction beyond scope;
//   - values match BYTE-FOR-BYTE (⛔ normalised — the banners / news-blog precedent, G9), and an empty or
//     unknown audience means NOBODY (fail-closed);
//   - ⚠ the shelf filter is ⛔ an authorization — the lead route re-checks scope, eligibility, member
//     state and grief suppression server-side (carried item C9).
// The grammar grows ADDITIVELY within `version: 1` (a new clause kind, a new scope); a breaking change is
// `version: 2` (ADR-0044).
//
// ── Deliberately ABSENT, each with its re-trigger ─────────────────────────────────────────────────
//   - scope `public`   — the shelf is members-only. Re-trigger: a public partner surface (none planned).
//   - scope `block`    — never resolvable (G9). Re-trigger: a block-level geo resolver.
//   - scope `role` / `cohort` — ABSENT and REJECTED at write (`-427`, confirmed). Decision `2026-08-13-103`
//     D8's re-trigger is unchanged: the first surface that must target members by role / cohort — which
//     Story 12.2 MAY be. ⛔ declared-and-empty (the banners shape): a value nobody can resolve is a trap.
//   - clause `age_band` — Not addressed: it would decrypt Tier-1 DOB (G10). Re-trigger: Story 12.3.
//   - member states `withdrawn` / `anonymized` — ⛔ offerable to anyone who has left (A4). Re-trigger: Story
//     12.3 — the lead route REFUSES a withdrawn / anonymized member whatever the clauses say, ZERO clauses
//     included (carried item C9).
//   - scope values are ⛔ validated against the geo tree here (carried item C11 — 12.2's wizard picks them
//     from the tree).

import { z } from 'zod';

import { partnerId as toPartnerId, type PartnerId } from '../ids/index.js';
import type { MemberLifecycleState } from '../schema/members.js';
import { ModuleManifestInvalidError } from './errors.js';

// ── Scope ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * True iff `s` holds a NUL or an unpaired surrogate — characters Postgres refuses in `text` / `jsonb`
 * (22021 / 22P05 / 22P02). zod bounds length only, so without this a manifest carrying one would reach the
 * database and fail there as an untyped error, where `ModuleManifestInvalidError` is the contract (RV5).
 */
function hasUnstorableChar(s: string): boolean {
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (c === 0) return true;
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        i += 1;
        continue;
      }
      return true;
    }
    if (c >= 0xdc00 && c <= 0xdfff) return true;
  }
  return false;
}

/** Refuse a NUL / an unpaired surrogate in a free-text string schema. */
function storableText<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine((v: unknown) => typeof v !== 'string' || !hasUnstorableChar(v), {
    message: 'must not contain a NUL or an unpaired surrogate',
  });
}

/** At most this many scope values (QE9). */
export const MAX_SCOPE_VALUES = 200;
/** At most this many characters per scope value (the `moduleNameSchema` bound — a place name, not prose). */
export const MAX_SCOPE_VALUE_LENGTH = 120;

/** 1–200 non-empty (≤ 120 characters), unique values, kept BYTE-FOR-BYTE (⛔ trimmed, ⛔ case-folded). */
const scopeValuesSchema = z
  .array(storableText(z.string().min(1).max(MAX_SCOPE_VALUE_LENGTH)))
  .min(1)
  .max(MAX_SCOPE_VALUES)
  .superRefine((values, ctx) => {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'scope values must be unique' });
    }
  });

/**
 * WHO a module is offered to, geographically. One of `members-all` (every member of the Pariwar), a set
 * of `state` names, or a set of `district` names. The epic's eligibility "district" lives HERE.
 */
export const ScopeFilterV1Schema = z.discriminatedUnion('scope', [
  z.object({ version: z.literal(1), scope: z.literal('members-all') }).strict(),
  z.object({ version: z.literal(1), scope: z.literal('state'), values: scopeValuesSchema }).strict(),
  z.object({ version: z.literal(1), scope: z.literal('district'), values: scopeValuesSchema }).strict(),
]);
export type ScopeFilterV1 = z.infer<typeof ScopeFilterV1Schema>;

// ── Eligibility ────────────────────────────────────────────────────────────────────────────────────

/**
 * The member lifecycle states a `member_state_in` clause may name: every `MEMBER_LIFECYCLE_STATES` label
 * EXCEPT `withdrawn` and `anonymized` (A4). The `satisfies` keeps every entry a real state; the unit test
 * asserts the set is exactly "all minus those two", so a new lifecycle state cannot slip in or out unseen.
 */
export const ELIGIBILITY_MEMBER_STATES = [
  'pending-kyc',
  'pending-fee',
  'pending-valid',
  'lock-in',
  'active',
  'active-in-grace',
  'lapsed-unpaid',
] as const satisfies readonly Exclude<MemberLifecycleState, 'withdrawn' | 'anonymized'>[];
export type EligibilityMemberState = (typeof ELIGIBILITY_MEMBER_STATES)[number];

/** At most this many eligibility clauses, each `kind` at most once (QE9). */
export const MAX_ELIGIBILITY_CLAUSES = 8;

/** v1's one clause: the member's lifecycle state is one of `states` (non-empty, unique). */
export const MemberStateInClauseSchema = z
  .object({
    kind: z.literal('member_state_in'),
    states: z
      .array(z.enum(ELIGIBILITY_MEMBER_STATES))
      .min(1)
      .superRefine((states, ctx) => {
        if (new Set(states).size !== states.length) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'member_state_in states must be unique' });
        }
      }),
  })
  .strict();

/** A clause, discriminated on `kind`. New kinds join this union additively within `version: 1`. */
export const EligibilityClauseSchema = z.discriminatedUnion('kind', [MemberStateInClauseSchema]);
export type EligibilityClause = z.infer<typeof EligibilityClauseSchema>;

/**
 * WHICH members within scope a module is offered to. ZERO clauses means no restriction beyond scope —
 * ⛔ "nobody". Clauses AND together (12.3 evaluates them; ⛔ evaluated here).
 */
export const EligibilityFilterV1Schema = z
  .object({
    version: z.literal(1),
    clauses: z
      .array(EligibilityClauseSchema)
      .max(MAX_ELIGIBILITY_CLAUSES)
      .superRefine((clauses, ctx) => {
        const kinds = clauses.map((c) => c.kind);
        if (new Set(kinds).size !== kinds.length) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'each clause kind may appear at most once' });
        }
      }),
  })
  .strict();
export type EligibilityFilterV1 = z.infer<typeof EligibilityFilterV1Schema>;

// ── Branding ───────────────────────────────────────────────────────────────────────────────────────

/**
 * The partner's presentation assets: an object-store key for the logo and ONE lower-case accent colour,
 * either nullable. Named `ModuleBrandingBundle` because `BrandingBundle` already means PARIWAR branding
 * (G8). ⚠ Partner colours are NOT applied to card backgrounds, CTAs or surrounding chrome (the UX spec —
 * carried item C5); 12.1 only stores them.
 */
export const ModuleBrandingBundleSchema = z
  .object({
    version: z.literal(1),
    logo_object_key: storableText(z.string().min(1).max(1024)).nullable(),
    accent_color_hex: z
      .string()
      .regex(/^#[0-9a-f]{6}$/, 'accent_color_hex must be #rrggbb, lower-case')
      .nullable(),
  })
  .strict();
export type ModuleBrandingBundle = z.infer<typeof ModuleBrandingBundleSchema>;

// ── The content fields (shared with ModuleAuthoredPayloadSchema) ─────────────────────────────────────

export const moduleNameSchema = storableText(z.string().trim().min(1).max(120));
export const moduleDescriptionSchema = storableText(z.string().trim().min(1).max(2000));
/** `integer` column (int4) — capped at its maximum so a huge value is a manifest error, ⛔ a 22003. */
export const moduleSlotCapacitySchema = z.number().int().positive().max(2_147_483_647).nullable();

/** True iff `host` (a WHATWG-parsed hostname, so `0x7f.1` / `2130706433` are already dotted) is an IP. */
function isIpLiteralHost(host: string): boolean {
  if (host.startsWith('[')) return true; // IPv6 — the parser keeps the brackets on `hostname`
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/**
 * True iff `raw` holds a character the WHATWG URL parser strips or rewrites: whitespace, a C0 / C1 control
 * character (tab / LF / CR among them), or a backslash (read as `/` in an `https:` URL). Every rule in
 * `moduleLeadHandoffUrlSchema` runs on the PARSED URL, but the column and the `module.authored` payload store
 * `raw` — a `raw` the parser normalises is a string 12.5 could read differently from the one that was checked,
 * and the manifest is immutable (RV3).
 */
function hasUrlUnsafeChar(raw: string): boolean {
  for (const ch of raw) {
    const c = ch.codePointAt(0) ?? 0;
    if (c <= 0x20 || (c >= 0x7f && c <= 0x9f) || ch === '\\') return true;
  }
  return false;
}

/**
 * Where 12.5 delivers this module's leads (A3): `https:` only; ⛔ userinfo — and ⛔ an `@` ANYWHERE in the
 * string, stricter than QE5 / A3's "no userinfo" (a raw `@` is the classic parser-differential), so
 * `https://partner.example/@team/hook` is refused (RV4; recorded in the Completion Notes); ⛔ query string and ⛔
 * fragment (a raw `?` or `#` is refused too, since the parser reports a bare `?` / `#` as empty); ⛔ whitespace,
 * control characters and backslashes (`hasUrlUnsafeChar`); the host is ⛔ an IP literal (v4 / v6) and ⛔
 * `localhost` (or a `*.localhost` name); ≤ 2048 characters; and the string must equal what the parser would
 * produce (`url.href`, or `url.href` less a bare origin's `/`) — the canonical-form rule (RP1).
 * ⚠ This is a WRITE-time shape rule only — a send-time check of the RESOLVED address (SSRF / DNS
 * rebinding) is Story 12.5's (carried item C7).
 */
export const moduleLeadHandoffUrlSchema = z
  .string()
  .max(2048)
  .superRefine((raw, ctx) => {
    const fail = (message: string): void => {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    };
    if (hasUrlUnsafeChar(raw)) {
      fail('lead_handoff_url must carry no whitespace, control character or backslash');
      return;
    }
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      fail('lead_handoff_url must be an absolute URL');
      return;
    }
    if (url.protocol !== 'https:') fail('lead_handoff_url must use https:');
    if (url.username !== '' || url.password !== '' || raw.includes('@')) {
      fail('lead_handoff_url must carry no userinfo');
    }
    if (url.search !== '' || url.hash !== '' || raw.includes('?') || raw.includes('#')) {
      fail('lead_handoff_url must carry no query string and no fragment');
    }
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (isIpLiteralHost(host)) fail('lead_handoff_url host must not be an IP literal');
    if (host === 'localhost' || host.endsWith('.localhost')) fail('lead_handoff_url host must not be localhost');
    // Canonical form (RP1). The column and the `module.authored` payload store `raw`, so `raw` must BE what the
    // parser produces — ⛔ a lone surrogate (becomes U+FFFD in `href`, but `JSON.stringify` writes it into the
    // payload and Postgres refuses it, 22P02), `https:host` / `https:///host` (a strict RFC 3986 parser reads
    // no authority), an upper-case scheme or host, a default `:443`, dot segments, an un-encoded non-ASCII
    // character. One rule subsumes them all; a bare origin (`https://h`) is canonical with its `/` added.
    if (raw !== url.href && `${raw}/` !== url.href) {
      fail(
        'lead_handoff_url must be in canonical form: https://<lower-case host>/<path>, no default port, no dot segments, special characters percent-encoded',
      );
    }
  });

/** A Secret Manager secret NAME (G6) — ⛔ a resource path, ⛔ a key value. */
export const moduleSigningKeySecretNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,255}$/, 'lead_handoff_signing_key_secret_name must match ^[A-Za-z0-9_-]{1,255}$');

const isoInstantSchema = z.string().datetime({ offset: true });

// ── The manifest ───────────────────────────────────────────────────────────────────────────────────

/**
 * The parser's input: snake_case JSON with EXACTLY the QE5 content keys. `module_id`, `pariwar_id` and
 * `manifest_schema_version` are ⛔ input — they are command arguments / a constant — so `.strict()`
 * rejects them.
 */
const ModuleManifestInputSchema = z
  .object({
    partner_id: z.string().uuid(),
    name_en: moduleNameSchema,
    name_hi: moduleNameSchema,
    description_en: moduleDescriptionSchema,
    description_hi: moduleDescriptionSchema,
    eligibility_filter: EligibilityFilterV1Schema,
    scope_filter: ScopeFilterV1Schema,
    valid_from: isoInstantSchema,
    valid_until: isoInstantSchema,
    slot_capacity: moduleSlotCapacitySchema,
    lead_handoff_url: moduleLeadHandoffUrlSchema,
    lead_handoff_signing_key_secret_name: moduleSigningKeySecretNameSchema,
    branding_bundle: ModuleBrandingBundleSchema,
  })
  .strict()
  .superRefine(refineModuleWindow);

/**
 * `marketplace_modules_window` (`valid_until > valid_from`) as a zod refinement — refused here first, so a bad
 * window is a typed manifest error. Shared by `ModuleManifestInputSchema` and `ModuleAuthoredPayloadSchema`
 * (events.ts), so a hand-built genesis payload with an inverted window is refused at the registry, not only by
 * the row's CHECK (RV7).
 */
export function refineModuleWindow(v: { valid_from: string; valid_until: string }, ctx: z.RefinementCtx): void {
  if (!(Date.parse(v.valid_until) > Date.parse(v.valid_from))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'valid_until must be after valid_from',
      path: ['valid_until'],
    });
  }
}

/** A parsed, valid v1 manifest — the ONE object that feeds both the genesis payload and the row. */
export interface ModuleManifestV1 {
  readonly partnerId: PartnerId;
  readonly nameEn: string;
  readonly nameHi: string;
  readonly descriptionEn: string;
  readonly descriptionHi: string;
  readonly eligibilityFilter: EligibilityFilterV1;
  readonly scopeFilter: ScopeFilterV1;
  readonly validFrom: Date;
  readonly validUntil: Date;
  readonly slotCapacity: number | null;
  readonly leadHandoffUrl: string;
  readonly leadHandoffSigningKeySecretName: string;
  readonly brandingBundle: ModuleBrandingBundle;
}

/**
 * Validate a module manifest at WRITE (QE9). Throws `ModuleManifestInvalidError` wrapping the ZodError.
 * ⚠ It does NOT check the window against `now()` — `authorModule` does that against DB time (A5), so a
 * past `valid_from` is accepted here.
 */
export function parseModuleManifest(input: unknown): ModuleManifestV1 {
  const parsed = ModuleManifestInputSchema.safeParse(input);
  if (!parsed.success) throw new ModuleManifestInvalidError(parsed.error);
  const v = parsed.data;
  return {
    partnerId: toPartnerId(v.partner_id),
    nameEn: v.name_en,
    nameHi: v.name_hi,
    descriptionEn: v.description_en,
    descriptionHi: v.description_hi,
    eligibilityFilter: v.eligibility_filter,
    scopeFilter: v.scope_filter,
    validFrom: new Date(v.valid_from),
    validUntil: new Date(v.valid_until),
    slotCapacity: v.slot_capacity,
    leadHandoffUrl: v.lead_handoff_url,
    leadHandoffSigningKeySecretName: v.lead_handoff_signing_key_secret_name,
    brandingBundle: v.branding_bundle,
  };
}
