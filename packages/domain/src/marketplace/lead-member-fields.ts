// The partner LEAD's member fields — Story 12.5 (Task 2; Decision `2026-11-21-483` QE5 (A), QE11 (A); `-484` Q3 A; AC2's seal half).
//
// ⭐ WHAT MAY LEAVE (QE5 (A), RULED `-484` Q3 A: "The four, for every partner. The member sees all four on the form before agreeing."):
// the member's whole name, the canonical mobile, the district (or null) and the preferred language — and NOTHING else: ⛔ DOB or age,
// ⛔ Aadhaar / PAN, ⛔ membership state, ⛔ contribution or claim data, ⛔ nominee, ⛔ workplace beyond the district, ⛔ health data,
// ⛔ free text. A partner needing MORE needs a new envelope version AND a Panel ruling; FEWER is K-4 (a per-module list).
// The name is sent WHOLE, ⛔ shortened, ⛔ trimmed ([[feedback_never_mangle_member_names]]).
//
// ⭐ HOW IT IS KEPT (QE11 (A)): ONE Tier-1 envelope of the canonical JSON of the SEALED object `{ version: 1, nonce, …the four }`,
// field class `module_lead_fields`, `rowKey = lead_id` — so a sealed string cannot be opened as another lead's. The nonce
// (`randomBytes(16)`, 32 lower-case hex) is what keeps the body's audit hash from being a guessable fingerprint of a name + a
// ten-digit mobile (QE14); it is ⛔ the dedupe key (that is `Idempotency-Key`).
//
// Sealed by 12.3's caller BEFORE its transaction (`sealLeadMemberFields`, lead-handoff.ts — no KMS round trip may run while
// `submitModuleLead` holds the module row); opened by the sweep inside ONE audit line (`openLeadMemberFields` — the sweep's
// `withCompensatingAudit` `mutate`, and nothing else; TR7). This file is PURE but for the two KMS calls.
// ⛔ A field value in any log, error message or event (I8): every error here names the FIELD, never its value.

import { randomBytes } from 'node:crypto';

import { z } from 'zod';

import { canonicalJsonStringify } from '../canonical-json.js';
import { decryptTier1, encryptTier1, parseEnvelope, serializeEnvelope } from '../encryption/envelope.js';
import { MODULE_LEAD_FIELDS_FIELD_CLASS } from '../encryption/field-classes.js';
import type { KmsKeyRef, KmsProvider } from '../encryption/kms-provider.js';
import { normalizeMobile } from '../encryption/member-fields.js';
import {
  LeadHandoffDecryptUnavailableError,
  LeadHandoffFieldsInvalidError,
  LeadHandoffFieldsUnreadableError,
} from './errors.js';
import { storableText } from './filters.js';

/** The sealed object's version — the envelope version it feeds (QE12). */
export const LEAD_MEMBER_FIELDS_VERSION = 1 as const;

/** The languages a member may prefer (the house `hi | en` pair). */
export const LEAD_PREFERRED_LANGUAGES = ['hi', 'en'] as const;
export type LeadPreferredLanguage = (typeof LEAD_PREFERRED_LANGUAGES)[number];

/**
 * ⛔ Blank: a name or district of spaces — or of nothing a reader can see — is not a value. "Nothing a reader can see" is: white space
 * and separators (`\s`, `\p{Z}`), format characters (`\p{Cf}`, such as a lone zero-width joiner, which `trim()` does not strip),
 * control characters (`\p{Cc}`, which `\s` mostly omits), marks with no base (`\p{M}` — a lone combining accent, a variation selector,
 * the combining grapheme joiner), the Hangul fillers (U+115F, U+1160, U+3164, U+FFA0) and the Braille blank (U+2800) — code review
 * 2026-11-22, round 2 — and private-use and unassigned code points (`\p{Co}`, `\p{Cn}`, a noncharacter such as U+FFFE; round 3). A WHOLE-STRING test only: a real name keeps its matras and joiners, and the value itself is kept byte for byte
 * ([[feedback_never_mangle_member_names]]).
 */
const INVISIBLE = /[\s\p{Z}\p{Cf}\p{Cc}\p{Co}\p{Cn}\p{M}\u115F\u1160\u3164\uFFA0\u2800]/gu;
const notBlank = (v: string): boolean => v.replace(INVISIBLE, '').length > 0;

const fullName = storableText(z.string().min(1).max(120)).refine(notBlank, { message: 'must not be blank' });
const district = storableText(z.string().min(1).max(120)).refine(notBlank, { message: 'must not be blank' });

/**
 * ⭐ `LeadMemberFieldsV1` — the QE5 allow-list as STORED and SENT: the mobile is ALREADY the canonical form `normalizeMobile` returns
 * (`+91` and ten digits). `.strict()`: any fifth key is refused.
 */
export const leadMemberFieldsV1Schema = z
  .object({
    full_name: fullName,
    mobile: z.string().refine((v) => normalizeMobile(v) === v, { message: 'must be the canonical +91 mobile' }),
    district: district.nullable(),
    preferred_language: z.enum(LEAD_PREFERRED_LANGUAGES),
  })
  .strict();
export type LeadMemberFieldsV1 = z.output<typeof leadMemberFieldsV1Schema>;

/**
 * What the CALLER passes (12.3's form): the same four, but the mobile as typed — it is normalised here, and refused when
 * `normalizeMobile` returns null.
 */
export const leadMemberFieldsInputSchema = z
  .object({
    full_name: fullName,
    mobile: z
      .string()
      .max(32)
      .transform((v, ctx) => {
        const canonical = normalizeMobile(v);
        if (canonical === null) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'is not an Indian mobile' });
          return z.NEVER;
        }
        return canonical;
      }),
    district: district.nullable(),
    preferred_language: z.enum(LEAD_PREFERRED_LANGUAGES),
  })
  .strict();
export type LeadMemberFieldsInput = z.input<typeof leadMemberFieldsInputSchema>;

/** The nonce grammar: 16 random bytes as 32 lower-case hex. */
const NONCE = /^[0-9a-f]{32}$/;

/** ⭐ The SEALED object (QE11 (A)): the version, the nonce and the four. `.strict()`. */
export const sealedLeadMemberFieldsV1Schema = leadMemberFieldsV1Schema
  .extend({
    version: z.literal(LEAD_MEMBER_FIELDS_VERSION),
    nonce: z.string().regex(NONCE),
  })
  .strict();
export type SealedLeadMemberFieldsV1 = z.output<typeof sealedLeadMemberFieldsV1Schema>;

/** The KMS deps — structural, so the API's `EncryptionDeps` and the jobs' deps both satisfy it. */
export interface LeadFieldsCryptoDeps {
  readonly kms: KmsProvider;
  readonly kekRef: KmsKeyRef;
}

/** The word that stands for EVERY unknown key (I8): its text is never echoed — a one-word key can be a name or a district. */
export const UNNAMED_KEY = '(unrecognised key)';

/** Validate the caller's fields, or throw {@link LeadHandoffFieldsInvalidError} naming the failing fields. */
export function parseLeadMemberFieldsInput(fields: unknown): LeadMemberFieldsV1 {
  const parsed = leadMemberFieldsInputSchema.safeParse(fields);
  if (!parsed.success) {
    throw new LeadHandoffFieldsInvalidError(
      parsed.error.issues.flatMap((i) =>
        // An unknown key is ALWAYS the closed word (I8: a mis-keyed object can carry a value as a key, and `Gaya` or `Sunita` looks
        // like a field name — code review 2026-11-22, round 2). Every other issue is named by its path, which is one of the four.
        i.code === 'unrecognized_keys' ? i.keys.map(() => UNNAMED_KEY) : [i.path.length === 0 ? '(root)' : String(i.path[0])],
      ),
    );
  }
  return parsed.data;
}

/** The encryption context of ONE lead's fields: the lead's Pariwar, the class, and `rowKey = lead_id` (lower-case). */
function contextOf(pariwarId: string, leadId: string): { pariwarId: string; fieldClass: string; rowKey: string } {
  return { pariwarId: pariwarId.toLowerCase(), fieldClass: MODULE_LEAD_FIELDS_FIELD_CLASS, rowKey: leadId.toLowerCase() };
}

/**
 * ⭐ Seal the fields (QE11 (A)): validate (AC2), mint a FRESH nonce, encrypt the canonical JSON of the sealed object under the lead's
 * context. Returns the serialised envelope — the string `recordLeadHandoff` stores and can NOT read. One KMS encrypt per call.
 */
export async function sealLeadMemberFieldsV1(
  enc: LeadFieldsCryptoDeps,
  input: { readonly pariwarId: string; readonly leadId: string; readonly fields: unknown },
): Promise<string> {
  const fields = parseLeadMemberFieldsInput(input.fields);
  const sealed: SealedLeadMemberFieldsV1 = {
    version: LEAD_MEMBER_FIELDS_VERSION,
    nonce: randomBytes(16).toString('hex'),
    full_name: fields.full_name,
    mobile: fields.mobile,
    district: fields.district,
    preferred_language: fields.preferred_language,
  };
  const plaintext = Buffer.from(canonicalJsonStringify(sealed), 'utf-8');
  return serializeEnvelope(await encryptTier1(plaintext, contextOf(input.pariwarId, input.leadId), enc.kms, enc.kekRef));
}

/** gRPC `INVALID_ARGUMENT` — "the key service rejected THIS envelope" (the `field-worker/crypto.ts` reading, un-attested). */
const GRPC_INVALID_ARGUMENT = 3;

/**
 * ⭐ Open ONE lead's sealed fields — the sweep's decrypt, its audit line's `mutate` and nothing else (QE14 (b)). The failure is
 * classified by WHERE it happened (⛔ by message text), the `decryptFieldWorkerField` split:
 *   · `parseEnvelope` fails ⇒ {@link LeadHandoffFieldsUnreadableError}`('envelope')`;
 *   · the KMS rejects THIS envelope (gRPC 3) ⇒ `('key_rejected')`;
 *   · the KMS fails any other way ⇒ {@link LeadHandoffDecryptUnavailableError} (retry helps);
 *   · the key unwrapped but the tag failed (tampered, or sealed for ANOTHER lead — the `rowKey`) ⇒ `('authentication')`;
 *   · it opened but is not a `SealedLeadMemberFieldsV1` ⇒ `('schema')`.
 * ⛔ The plaintext in any log or error.
 */
export async function openLeadMemberFieldsV1(
  enc: LeadFieldsCryptoDeps,
  input: { readonly pariwarId: string; readonly leadId: string; readonly ciphertext: string },
): Promise<SealedLeadMemberFieldsV1> {
  let envelope: ReturnType<typeof parseEnvelope>;
  try {
    envelope = parseEnvelope(input.ciphertext);
  } catch {
    throw new LeadHandoffFieldsUnreadableError('envelope');
  }
  let unwrapped = false;
  const target = enc.kms;
  // Observe whether `decryptDek` resolved through a Proxy (the provider may be a class whose methods use `this`) — the
  // `field-worker/crypto.ts` technique; the shared primitive is not changed.
  const kms = new Proxy(target, {
    get(t, prop) {
      const value: unknown = Reflect.get(t, prop, t);
      if (prop === 'decryptDek' && typeof value === 'function') {
        return async (...args: unknown[]) => {
          const dek: unknown = await (value as (...a: unknown[]) => Promise<unknown>).apply(t, args);
          unwrapped = true;
          return dek;
        };
      }
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
    },
  });
  let bytes: Uint8Array;
  try {
    bytes = await decryptTier1(envelope, contextOf(input.pariwarId, input.leadId), kms, enc.kekRef);
  } catch (err) {
    if (unwrapped) throw new LeadHandoffFieldsUnreadableError('authentication');
    if (typeof err === 'object' && err !== null && (err as { code?: unknown }).code === GRPC_INVALID_ARGUMENT) {
      throw new LeadHandoffFieldsUnreadableError('key_rejected');
    }
    throw new LeadHandoffDecryptUnavailableError();
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(Buffer.from(bytes).toString('utf-8'));
  } catch {
    throw new LeadHandoffFieldsUnreadableError('schema');
  }
  const parsed = sealedLeadMemberFieldsV1Schema.safeParse(parsedJson);
  if (!parsed.success) throw new LeadHandoffFieldsUnreadableError('schema');
  return parsed.data;
}
