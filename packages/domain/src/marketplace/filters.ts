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
//     ⭐ Story 12.2 (`2026-11-01-433` QE5, amending `-429` C11 in part) checks scope-value MEMBERSHIP at its route
//     (`scope-options.ts` `assertScopeValuesRecorded`) — ⛔ here: this parser stays the same for every other caller.

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

// ── WRITE-ONLY display-text schemas (Story 12.2 — `2026-11-01-433` QE12; 12.1 R3D1's name / description leg) ──────────
// ⚠ `moduleNameSchema` / `moduleDescriptionSchema` above are SHARED with `ModuleAuthoredPayloadSchema` (events.ts), which
// `foldModuleProjection` (state.ts) re-parses with `safeParse` to read capacity (TR16). Tightening THEM would drift the
// fold on any stored genesis. So the stricter rules live HERE, in schemas used ONLY by `parseModuleManifest` (the WRITE)
// and the partner-name parser — the write rules are a SUBSET of the payload rules, so every stored genesis still parses.
// RPD1: this tightening was made BEFORE any module was stored; any FURTHER tightening of a schema the genesis payload
// re-parses must read capacity through a narrow `{ slot_capacity }` schema in the fold, or bump to `version: 2`.
//
// The rules run on the RAW string, BEFORE `.trim()` (an edge character would otherwise be trimmed away unseen):
//   - ⛔ C0 controls (U+0000–U+001F, U+007F) — EXCEPT U+000A (line feed) inside a description; ⛔ U+000D (the admin
//     client normalises CRLF → LF before sending);
//   - ⛔ C1 controls (U+0080–U+009F);
//   - ⛔ bidi controls (U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069) — they reorder what a reader sees;
//   - ⛔ invisible formatters U+200B, U+2060, U+FEFF, U+00AD — and, since code review round 1 (RP1), EVERY other format
//     character (Unicode category Cf: U+180E, U+2061–2064, U+206A–206F, U+FFF9–FFFB, the tag block U+E0000–E007F, …);
//   - ⛔ (DN2, BigDev: option 2) EVERY other default-ignorable code point — Unicode's own invisible set, wider than Cf: the
//     combining grapheme joiner U+034F, the variation selectors U+FE00–FE0D and U+E0100–E01EF, the Mongolian free variation
//     selectors U+180B–180D, U+17B4 / U+17B5, … — and the Braille blank U+2800. EXCEPT U+FE0E / U+FE0F (the text / emoji
//     PRESENTATION selectors) only where they change the look: right after a symbol with a text AND an emoji form, or
//     completing a keycap — so a heart, a tick mark or a keycap still works (DN6 `-436`, narrowed by DN7 `-437`: anywhere
//     else a selector draws nothing, and "LIC" + U+FE0F was a second "LIC" partner). (The ground-inspection note rule made
//     the same move: `\p{Cf}` was insufficient.)
//   - ⛔ the line / paragraph separators U+2028 / U+2029 (the C0 / C1 rule above never covered them);
//   - ⛔ the four Hangul fillers U+115F, U+1160, U+3164, U+FFA0 — LETTERS (Lo) that draw nothing, so they satisfied the
//     letter-or-digit rule below while the value looked blank (RP1);
//   - ⭐ U+200C / U+200D (ZWNJ / ZWJ) are ALLOWED in a `*_hi` value only — Devanagari conjunct control. In a `*_en` value
//     they are ⛔ allowed: "LIC" and "L"+ZWJ+"IC" read identically yet differ in the partner-name unique index (DN1 —
//     BigDev narrowed QE12 for English text, 12.2 code review round 1; `-434`). ⭐ EXCEPT (DN4, `-435`): in an English
//     MODULE name or description a ZWJ is allowed BETWEEN TWO EMOJI (the family, health-worker and rainbow-flag emoji are
//     ZWJ sequences) — the code point before it (past any U+FE0F and skin-tone modifier) and the one after it are both
//     `\p{Extended_Pictographic}`. Module texts carry no unique index, so DN1's reason does not reach them; the English
//     PARTNER name stays strict;
//   - ⛔ (DN3, `-435`) a value that is not in Unicode NFC — "Café" with a combining accent and "Café" with the composed é
//     read identically yet differ in the partner-name unique index. REFUSED, ⛔ rewritten: the server stores exactly what
//     was submitted and signed off; the admin client normalises before sending (`derive.ts` `normaliseDisplayText`);
//   - ⛔ (DN3) every space separator but U+0020 — a no-break space (U+00A0, what a PDF or word-processor paste carries),
//     U+202F, U+2000–U+200A, U+205F, U+1680, U+3000;
//   - ⛔ (DN3) in a NAME (module or partner, either language): two or more spaces in a row — on the RAW value like every
//     rule here, edges included (`-435` item 1(c); the admin client collapses runs, so only another caller meets it);
//   - at least one letter or digit (a blank-looking value is refused);
//   - a `*_hi` value must hold at least one Devanagari LETTER (Story 2.1: member-facing copy needs Hindi) — "LIC टर्म
//     प्लान" passes; "LIC" and "LIC ।" (a danda is punctuation) are refused.
// Code points are compared NUMERICALLY (⛔ escapes in a regex class), so the source carries ⛔ invisible character (TR15).

/**
 * Bidi controls (the Trojan-Source set), invisible formatters and the Hangul fillers — refused anywhere in display text.
 * The fillers and the Braille blank are the only members that are not format characters: the fillers are letters (Lo) that
 * draw nothing, and U+2800 is a symbol (So) that draws nothing.
 */
const DISPLAY_REFUSED_FORMAT_CHARS: ReadonlySet<number> = new Set([
  0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069,
  0x200b, 0x2060, 0xfeff, 0x00ad,
  0x115f, 0x1160, 0x3164, 0xffa0,
  0x2800,
]);
/**
 * Every other invisible code point — the format characters (Cf) AND Unicode's wider default-ignorable set (the combining
 * grapheme joiner, the variation selectors, the Mongolian selectors, …). A property class, so a code point Unicode adds
 * later is refused without an edit. `\p{Cf}` alone missed the variation selectors and the grapheme joiner (DN2).
 */
const FORMAT_CHARACTER = /[\p{Cf}\p{Default_Ignorable_Code_Point}]/u;
const LINE_OR_PARAGRAPH_SEPARATOR = /[\p{Zl}\p{Zp}]/u;
const SPACE_SEPARATOR = /\p{Zs}/u;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const DEVANAGARI_LETTER = /(?=\p{Script=Devanagari})\p{L}/u;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const EMOJI_MODIFIER = /\p{Emoji_Modifier}/u;
const EMOJI = /\p{Emoji}/u;
const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/u;

/**
 * Where ZWNJ / ZWJ may appear: `any` (the `*_hi` schemas — conjunct control), `between-emoji` (the English MODULE texts — a
 * ZWJ joining two emoji only, DN4), `none` (the English partner name — DN1).
 */
type JoinerRule = 'any' | 'between-emoji' | 'none';

interface DisplayTextRules {
  allowLineFeed: boolean;
  requireDevanagari: boolean;
  joiners: JoinerRule;
  /** A NAME refuses two spaces in a row (DN3); a description may keep them. */
  refuseDoubledSpace: boolean;
}

/** A keycap sequence's base: 0–9, `#`, `*` (base + U+FE0F + U+20E3). */
function isKeycapBase(ch: string | undefined): boolean {
  const c = ch?.codePointAt(0) ?? -1;
  return (c >= 0x30 && c <= 0x39) || c === 0x23 || c === 0x2a;
}

/**
 * True iff the presentation selector at `chars[i]` CHANGES how a symbol looks (DN7, `-437`): it follows a symbol that has both
 * a text and an emoji form — `\p{Emoji}` but NOT `\p{Emoji_Presentation}` (❤, ✔, ™, ©, ⚕, ♀, ➡ …; exactly the code points
 * whose "X + U+FE0F" is a recommended emoji) — or completes a keycap: a base 0–9 # * FOLLOWED by U+20E3. After a letter, a
 * digit outside a keycap, a space, an emoji that already draws as emoji, a skin tone or an unassigned code point it draws
 * nothing, so "LIC 😀" + U+FE0F would be a second "LIC 😀".
 */
function selectorStylesSymbol(chars: readonly string[], i: number): boolean {
  const prev = chars[i - 1];
  if (prev === undefined) return false;
  if (isKeycapBase(prev)) return chars[i + 1]?.codePointAt(0) === 0x20e3;
  return EMOJI.test(prev) && !EMOJI_PRESENTATION.test(prev);
}

/** True iff the ZWJ at `chars[i]` joins two emoji: a pictograph before it (past U+FE0F / skin tones) and one after it. */
function zwjJoinsTwoEmoji(chars: readonly string[], i: number): boolean {
  let j = i - 1;
  while (j >= 0 && (chars[j]?.codePointAt(0) === 0xfe0f || EMOJI_MODIFIER.test(chars[j] ?? ''))) j -= 1;
  return PICTOGRAPHIC.test(chars[j] ?? '') && PICTOGRAPHIC.test(chars[i + 1] ?? '');
}

/** The first QE12 rule `raw` breaks, as a message — or null. */
function displayTextRefusal(raw: string, o: DisplayTextRules): string | null {
  const chars = [...raw];
  for (const [i, ch] of chars.entries()) {
    const c = ch.codePointAt(0) ?? 0;
    if ((c <= 0x1f || c === 0x7f) && !(o.allowLineFeed && c === 0x0a)) {
      return o.allowLineFeed
        ? 'must not contain a control character (only a line feed is allowed)'
        : 'must not contain a control character or a line break';
    }
    if (c >= 0x80 && c <= 0x9f) return 'must not contain a control character';
    if (DISPLAY_REFUSED_FORMAT_CHARS.has(c)) return 'must not contain an invisible or text-direction character';
    // ZWNJ / ZWJ are Cf, so they are decided BEFORE the generic Cf rule: kept for a `*_hi` value, refused in a `*_en` one
    // except a ZWJ joining two emoji in an English module text (DN4).
    if (c === 0x200c || c === 0x200d) {
      const allowed = o.joiners === 'any' || (o.joiners === 'between-emoji' && c === 0x200d && zwjJoinsTwoEmoji(chars, i));
      if (!allowed) return 'must not contain an invisible joining character (it is usually copied in with pasted text)';
      continue;
    }
    // The text / emoji PRESENTATION selectors are default-ignorable too, but a heart, a tick mark or a keycap needs one right
    // after its symbol (DN2; DN6 `-436`; DN7 `-437`). Anywhere else a selector draws nothing — "LIC" + U+FE0F would be a
    // second "LIC".
    if (c === 0xfe0e || c === 0xfe0f) {
      if (selectorStylesSymbol(chars, i)) continue;
      // The message `-437` item 3 records (round 2's wording).
      return 'must not contain an emoji style character except right after its emoji (it is usually copied in with pasted text)';
    }
    if (FORMAT_CHARACTER.test(ch)) return 'must not contain an invisible or text-direction character';
    if (LINE_OR_PARAGRAPH_SEPARATOR.test(ch)) return 'must not contain a line or paragraph separator';
    if (c !== 0x20 && SPACE_SEPARATOR.test(ch)) return 'must use ordinary spaces only (not a no-break or other special space)';
  }
  if (raw !== raw.normalize('NFC')) {
    return 'must be in Unicode normal form NFC (the admin console converts text itself; another caller must normalise first)';
  }
  if (o.refuseDoubledSpace && raw.includes('  ')) return 'must not contain two spaces in a row';
  if (!LETTER_OR_DIGIT.test(raw)) return 'must contain at least one letter or digit';
  if (o.requireDevanagari && !DEVANAGARI_LETTER.test(raw)) return 'must contain Hindi (Devanagari) text';
  return null;
}

/** A write-only display-text schema: the QE12 rules on the RAW string, then the 12.1 storage rules (trim + length). */
function displayText(max: number, o: DisplayTextRules) {
  return z
    .string()
    .superRefine((raw, ctx) => {
      const refusal = displayTextRefusal(raw, o);
      if (refusal !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: refusal });
    })
    .pipe(storableText(z.string().trim().min(1).max(max)));
}

/** A module's English name at WRITE (QE12). Same length as `moduleNameSchema` (trim, 1–120). */
export const moduleDisplayNameEnSchema = displayText(120, {
  allowLineFeed: false,
  requireDevanagari: false,
  joiners: 'between-emoji',
  refuseDoubledSpace: true,
});
/** A module's Hindi name at WRITE (QE12) — must hold a Devanagari letter. */
export const moduleDisplayNameHiSchema = displayText(120, {
  allowLineFeed: false,
  requireDevanagari: true,
  joiners: 'any',
  refuseDoubledSpace: true,
});
/** A module's English description at WRITE (QE12) — a line feed is allowed. Same length as `moduleDescriptionSchema`. */
export const moduleDisplayDescriptionEnSchema = displayText(2000, {
  allowLineFeed: true,
  requireDevanagari: false,
  joiners: 'between-emoji',
  refuseDoubledSpace: false,
});
/** A module's Hindi description at WRITE (QE12) — a line feed is allowed; must hold a Devanagari letter. */
export const moduleDisplayDescriptionHiSchema = displayText(2000, {
  allowLineFeed: true,
  requireDevanagari: true,
  joiners: 'any',
  refuseDoubledSpace: false,
});
/** A partner's English display name (QE3 / QE12) — trim, 1–120; unique per Pariwar, case-insensitively (the DB). */
export const partnerDisplayNameEnSchema = displayText(120, {
  allowLineFeed: false,
  requireDevanagari: false,
  joiners: 'none',
  refuseDoubledSpace: true,
});
/** A partner's Hindi display name (QE3 / QE12) — trim, 1–120; must hold a Devanagari letter. */
export const partnerDisplayNameHiSchema = displayText(120, {
  allowLineFeed: false,
  requireDevanagari: true,
  joiners: 'any',
  refuseDoubledSpace: true,
});
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
 * The characters RFC 3986 allows in an `https:` URL that carries ⛔ userinfo, query or fragment: unreserved,
 * sub-delims, `:`, `/` and `%` (`@`, `?`, `#` are refused by their own rules). The WHATWG parser leaves
 * `|`, `^`, `[`, `]` and a malformed `%` escape in `href` unchanged, so the canonical-form rule alone
 * stores strings a strict RFC 3986 parser refuses (review R3-6).
 */
const RFC3986_URL_CHARS = /^[A-Za-z0-9\-._~!$&'()*+,;=:/%]*$/;
/** A `%` that does not begin a `%HH` escape. */
const MALFORMED_PERCENT_ESCAPE = /%(?![0-9A-Fa-f]{2})/;

/**
 * Where 12.5 delivers this module's leads (A3): `https:` only; ⛔ userinfo — and ⛔ an `@` ANYWHERE in the
 * string, stricter than QE5 / A3's "no userinfo" (a raw `@` is the classic parser-differential), so
 * `https://partner.example/@team/hook` is refused (RV4; recorded in the Completion Notes); ⛔ query string and ⛔
 * fragment (a raw `?` or `#` is refused too, since the parser reports a bare `?` / `#` as empty); ⛔ whitespace,
 * control characters and backslashes (`hasUrlUnsafeChar`); the host is ⛔ an IP literal (v4 / v6) and ⛔
 * `localhost` (or a `*.localhost` name); ≤ 2048 characters; and the string must equal what the parser would
 * produce (`url.href`, or `url.href` less a bare origin's `/`) — the canonical-form rule (RP1); and it must be
 * RFC 3986-valid too — only `RFC3986_URL_CHARS`, and a `%` only as a `%HH` escape (R3-6). Any explicit port is
 * accepted here; whether a port is acceptable is a send-time question (carried item C7).
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
    // RFC 3986 validity (R3-6) — what WHATWG leaves alone, a strict parser (12.5's client may be one) refuses.
    if (!RFC3986_URL_CHARS.test(raw) || MALFORMED_PERCENT_ESCAPE.test(raw)) {
      fail(
        'lead_handoff_url must be RFC 3986-valid: only unreserved, sub-delim, ":" and "/" characters, and "%" only as a %HH escape',
      );
    }
  });

/** A Secret Manager secret NAME (G6) — ⛔ a resource path, ⛔ a key value. */
export const moduleSigningKeySecretNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,255}$/, 'lead_handoff_signing_key_secret_name must match ^[A-Za-z0-9_-]{1,255}$');

/**
 * The years an instant may fall in, in UTC (reviews R3-4, R4-1). The ceiling: past 9999 `toISOString()` writes
 * `+010000-…`, which zod's `datetime` refuses. The floor is 2000, ⛔ 0001: Postgres refuses year 0 (22008); drizzle
 * reads a timestamptz back through `new Date(text)`, whose legacy parser turns `'0001-01-01 00:00:00+00'` into 2001
 * and `'0050-…'` into 1950 (years 1–99), while the command guards read the same column through pg's own parser —
 * the two would disagree about the window; and in a non-UTC session an old date whose zone offset carries seconds
 * (LMT) reads as an Invalid Date. A module window that starts before 2000 has no meaning, so the floor costs nothing.
 */
const MIN_INSTANT_YEAR = 2000;
const MAX_INSTANT_YEAR = 9999;
const INSTANT_RANGE_MESSAGE = `must be a real instant in UTC years ${String(MIN_INSTANT_YEAR)}–${String(MAX_INSTANT_YEAR)}`;

/**
 * An ISO-8601 instant with an offset, whose UTC value lies in years 2000–9999 (reviews R3-4, R4-1). zod's `datetime`
 * bounds only the WRITTEN digits: `9999-12-31T20:00:00-05:00` is year 10000 in UTC, and an offset of `+24:00` or more
 * makes `Date.parse` NaN. Each is a manifest error HERE, ⛔ a projector or persist error at genesis. The range check
 * is a `.pipe`, so it runs ONLY on a string `datetime` accepted — a malformed string carries the one `datetime`
 * issue, ⛔ a second, misleading range message (R4-2). Shared by `ModuleAuthoredPayloadSchema` (events.ts).
 */
export const moduleInstantSchema = z
  .string()
  .datetime({ offset: true })
  .pipe(
    z.string().refine(
      (v) => {
        const ms = Date.parse(v);
        if (!Number.isFinite(ms)) return false;
        const year = new Date(ms).getUTCFullYear();
        return year >= MIN_INSTANT_YEAR && year <= MAX_INSTANT_YEAR;
      },
      { message: INSTANT_RANGE_MESSAGE },
    ),
  );

// ── The manifest ───────────────────────────────────────────────────────────────────────────────────

/**
 * The parser's input: snake_case JSON with EXACTLY the QE5 content keys. `module_id`, `pariwar_id` and
 * `manifest_schema_version` are ⛔ input — they are command arguments / a constant — so `.strict()`
 * rejects them.
 */
const ModuleManifestInputSchema = z
  .object({
    partner_id: z.string().uuid(),
    // The WRITE-ONLY display schemas (Story 12.2 QE12) — ⛔ the shared payload schemas (TR16).
    name_en: moduleDisplayNameEnSchema,
    name_hi: moduleDisplayNameHiSchema,
    description_en: moduleDisplayDescriptionEnSchema,
    description_hi: moduleDisplayDescriptionHiSchema,
    eligibility_filter: EligibilityFilterV1Schema,
    scope_filter: ScopeFilterV1Schema,
    valid_from: moduleInstantSchema,
    valid_until: moduleInstantSchema,
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
  // A field that is not a valid instant already carries its own issue (`moduleInstantSchema`) — a zod refinement
  // still runs on a "dirty" object, so ⛔ add a misleading "after" message on top of it (R3-4). The guard is the
  // field schema itself, ⛔ `Date.parse`: V8 also parses strings `datetime` refuses, e.g. `'2027-01-01'` (R4-2).
  if (!moduleInstantSchema.safeParse(v.valid_from).success || !moduleInstantSchema.safeParse(v.valid_until).success) {
    return;
  }
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
