// packages/contracts/src/_common/primitives.ts
//
// Shared transport-layer primitives. Substantive branded ID types live at
// packages/domain/src/ids/ per architecture §Cross-cutting concerns line 4538
// and land at Story 1.7. Story 1.4 commits the transport-shape UUID Zod
// primitive without branding so consumers don't block on Story 1.7.

import { z } from 'zod';

/** ISO 8601 datetime with timezone offset (architecture §Format patterns line 3807-3809). */
export const Iso8601Datetime = z.string().datetime({ offset: true });
export type Iso8601Datetime = z.output<typeof Iso8601Datetime>;

/** UUID wire-shape; downstream Stories may brand via packages/domain/src/ids/. */
export const UuidString = z.string().uuid();
export type UuidString = z.output<typeof UuidString>;

/**
 * Branded Pariwar identifier transport primitive (Story 1.7, D12-1.4). The Zod
 * `.brand<'PariwarId'>()` brand STRING matches the domain TS brand at
 * `packages/domain/src/ids/` (`PariwarId = string & { __brand: 'PariwarId' }`).
 * Alignment is by brand-name (not structural symbol identity) per the Story 1.7
 * "Branded-ID reconciliation" Dev Note — the transport boundary (Zod parse)
 * applies the brand; domain code applies its own via the `pariwarId()` smart
 * constructor. A plain `z.string().uuid()` underneath, so OpenAPI emits it as a
 * uuid-format string. */
export const PariwarIdSchema = z.string().uuid().brand<'PariwarId'>();
export type PariwarIdSchema = z.output<typeof PariwarIdSchema>;

/**
 * Branded global-identity (user) id transport primitive (Story 1.9). Brand STRING
 * matches the domain `UserId` brand at `packages/domain/src/ids/`. A plain
 * `z.string().uuid()` underneath, so OpenAPI emits it as a uuid-format string. */
export const UserIdSchema = z.string().uuid().brand<'UserId'>();
export type UserIdSchema = z.output<typeof UserIdSchema>;

/** Request correlation id echoed in headers + logs + audit (architecture §3.2 line 1832). */
export const RequestId = z.string().uuid();
export type RequestId = z.output<typeof RequestId>;

/** RFC 5321 email; relaxed validation — strict policy at downstream Stories. */
export const Email = z.string().email();
export type Email = z.output<typeof Email>;

/**
 * Indian mobile number transport primitive (Story 3.2, AC-1). Deliberately
 * LENIENT on the wire shape — the member login screen submits whatever the user
 * types (`+91 98765 43210`, `09876543210`, `9876543210`). The server's
 * `normalizeMobile` canonicalises to a single E.164 form (`+91XXXXXXXXXX`) before
 * the blind-index lookup, so `+91 98765 43210`, `09876543210`, and `9876543210`
 * all resolve to one member. Validation here only bounds the input + restricts the
 * character set (digits + the conventional separators `+ - ( ) space`); a value
 * that passes this shape but normalises to nothing is treated by the handler as a
 * non-existent member (enumeration defense — the request endpoint still returns
 * `{ sent: true }`). Tier-1 PII (§2.7): NEVER logged/echoed in plaintext.
 */
export const MobileNumber = z
  .string()
  .trim()
  .min(10)
  .max(20)
  .regex(/^[+0-9][0-9\s\-()]*$/, 'Must be a mobile number (digits + optional + - ( ) separators)');
export type MobileNumber = z.output<typeof MobileNumber>;

/**
 * A person's name captured in ENGLISH (Latin) script — Story 6.18 (AC12), `2026-09-20-227` cl.9:
 * *"No transliteration should not be counted as clerical reason. Please use English Name everywhere
 * to avoid this."*
 *
 * The Panel's reasoning is worth keeping beside the code: a District Admin comparing a bank's
 * "ASHA DEVI" against a declared "आशा देवी" is not doing a name check, they are doing an ad-hoc
 * transliteration — and cl.9 removes that job rather than adding a clerical reason for it. So the
 * script problem is solved at CAPTURE, and `nominee-name-check.ts` carries ⛔ no transliteration
 * reason at all.
 *
 * Allows Latin letters, spaces, `.`, `'` and `-` — the apostrophe and hyphen because real names
 * carry them (D'Souza, Bai-Kumari) and an initial's full stop because cl.2 names initials as a
 * legitimate clerical form. Refuses Devanagari and every other non-Latin script.
 *
 * ⛔⛔ THIS IS AN **INPUT-ONLY** PREDICATE, AND THE REASON MUST STAY HERE.
 * `apps/api/src/plugins/zod-openapi/index.ts:24-25` installs a `serializerCompiler`, so RESPONSES
 * ARE PARSED against their schemas. Attaching this to an OUTPUT schema would turn every name
 * already stored in another script — plus the RTBF `'[anonymized]'` sentinel and the decrypt-failed
 * sentinel — into a **500** at read time. The output schemas that carry a holder name and must stay
 * UNGATED: `contributions/nominee-accounts.ts`, `contributions/member-drive-detail.ts`,
 * `public-pages/sahyog-vivran.ts`, and `claims/nominee-name-check.ts`'s own read DTO.
 *
 * ⛔ AND THERE IS NO BACKFILL. Rows already stored in another script stay exactly as they are and
 * still render — which holds PRECISELY because the gate is input-only
 * ([[feedback_record_unattested_no_backfill]]). A rewrite would be changing people's recorded names
 * to make a validator happy.
 *
 * ⛔ NOT applied to member KYC names (`domain/src/kyc/name.ts` is deliberately Devanagari-aware, and
 * a KYC name is copied from a government document, not typed) nor to Story 6.5's death-certificate
 * comparison (`claim/parity.ts`, a 20% fuzzy tolerance). cl.9's wider sweep is its own story.
 */
/**
 * ⚠⚠ THE CHARACTER CLASS INCLUDES THE SHAPES A PHONE KEYBOARD PRODUCES, and that is deliberate
 * (code review 2026-09-20) — it is a TYPOGRAPHIC allowance, ⛔ not a widening of the script rule.
 *
 * WHY: iOS smart punctuation rewrites `'` to a RIGHT SINGLE QUOTATION MARK (U+2019) as the user
 * types into a React Native `TextInput`. So `D'Souza` — a plainly English name, and one of the very
 * forms AC12 set out to accept — arrived as `D’Souza` and was refused with *"Please enter the name
 * in English"*, with nothing on screen to explain what was wrong with it. Likewise a non-breaking
 * space (U+00A0) in a name pasted from a document.
 *
 * ⭐ WHY ACCEPT THEM RATHER THAN REWRITE THEM TO ASCII. A `.transform()` normalising step was
 * written first and then abandoned: `z.string().transform(…).pipe(…)` is a ZodPipeline, and the
 * OpenAPI emitter silently drops `pattern`, `minLength` and `maxLength` off a pipeline — the
 * emitted `v1.yaml` lost the whole rule while every test stayed green. Accepting the variants keeps
 * this a pure `ZodString`, so the published contract still STATES the rule, and it has the better
 * property anyway: what the person typed is what gets stored, ⛔ never quietly edited.
 * ⚠ Two spellings of one name can therefore coexist. That is harmless HERE and nowhere else would
 * it be: Trap 1 forbids the system comparing two names at all — a human reads them (`-226` cl.5).
 *
 * ⛔ ACCENTED LATIN LETTERS ARE STILL REFUSED — an explicit decision (BigDev, 2026-09-20), ⛔ not an
 * oversight. `José` does not pass. AC12's words are "Latin letters", but `-227` cl.1's intent is the
 * name AS PRINTED ON THE PASSBOOK, and an Indian bank passbook prints ASCII. Widening this is a
 * product decision, and it is the one place this predicate should be revisited.
 * ⛔ And it is ⛔ NOT a transliteration tolerance: `-227` cl.9 forbids tolerating a SCRIPT difference,
 * and nothing here admits another script. Devanagari in, refusal out.
 */
export const ENGLISH_NAME_REGEX = /^[A-Za-z][A-Za-z.'\u2018\u2019\u02BC\-\u00A0\u2007\u202F ]*$/;

/**
 * ⭐ THE ONE PREDICATE EVERY LAYER MUST USE — server schema and client form alike.
 *
 * ⚠ The three client forms each called `ENGLISH_NAME_REGEX.test(x.trim())` by hand. That is the
 * same answer today, but it is a coincidence of this implementation, and the moment the schema
 * gains a rule the regex does not carry, a name the server accepts starts being refused in the app
 * (or worse, the reverse). Import THIS.
 */
export function isEnglishScriptName(value: string): boolean {
  return ENGLISH_NAME_REGEX.test(value.trim());
}

export const EnglishScriptName = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(ENGLISH_NAME_REGEX, 'Please enter the name in English');
export type EnglishScriptName = z.output<typeof EnglishScriptName>;
