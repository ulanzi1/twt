// packages/contracts/src/public-pages/abuse-rules.ts
//
// The STRICT parser for `public-pages/directory-abuse-rules.yaml` — Story 11a.3 (Task 9; AC6.4).
//
// PURE. Takes the file's bytes, returns the parsed rule set, or THROWS. ⛔ It never returns a
// permissive default, never returns an empty rule set on a parse failure, and never warns-and-
// continues. That is the `parseCapabilityBar` / `parseFrictionBudgetYaml` doctrine, and here it has
// a specific consequence worth stating: a malformed rules file that degraded to "no rules" would
// silently disarm every anti-enumeration signal on the flagship public surface while every CI leg
// stayed green — the vacuous-green shape this epic exists to remove.
//
// The impure half (reading the file, wiring the counters, emitting the audit line) lives at
// `apps/api/src/modules/public-pages/abuse-rules.ts`, mirroring the pure-`gate.ts` /
// impure-`check-pii-scrape.ts` split.
//
// ⚠ Contracts discipline: no `@twt/domain` import (the browser-bundle rule).

import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

/**
 * What a rule counts. ⛔ A CLOSED set: an unknown `detects` value is a parse error, because a rule
 * naming a detector nothing implements is a rule that cannot fire — recorded as coverage, providing
 * none.
 */
export const AbuseDetectorSchema = z.enum([
  /** Requests from one visitor key within the window. */
  'request_volume',
  /** DISTINCT page numbers touched by one visitor key within the window. */
  'distinct_pages',
  /** The deepest page number one visitor key reached within the window. */
  'page_depth',
  /** District-scoped queries from one visitor key within the window. ⚠ No subject on this surface. */
  'district_query_volume',
]);
export type AbuseDetector = z.output<typeof AbuseDetectorSchema>;

/**
 * ⭐ `no_subject_yet` IS A FIRST-CLASS STATUS, and that is the point.
 *
 * The epic AC names four triggers; one of them (repeated district-wide queries) has nothing to
 * count, because this surface ships no filter. The three dishonest options were: omit it silently
 * (a clause answered nowhere), declare it `active` with an unreachable predicate (a rule that
 * reports green forever while detecting nothing), or weaken the AC. This status is the fourth: the
 * rule is DECLARED, its reason is REQUIRED, and its activation trigger is REQUIRED — so the gap is
 * visible in the artifact a future author actually opens.
 */
export const AbuseRuleStatusSchema = z.enum(['active', 'no_subject_yet']);
export type AbuseRuleStatus = z.output<typeof AbuseRuleStatusSchema>;

export const DirectoryAbuseRuleSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-z][a-z0-9_]*$/, 'rule id must be lower_snake_case'),
    status: AbuseRuleStatusSchema,
    description: z.string().min(1),
    detects: AbuseDetectorSchema,
    window_seconds: z.number().int().positive().optional(),
    threshold: z.number().int().positive().optional(),
    no_subject_reason: z.string().min(1).optional(),
    activation_trigger: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((rule, ctx) => {
    if (rule.status === 'active') {
      // An active rule with no window or no threshold cannot fire. ⛔ Reject it rather than let it
      // sit in the file looking like coverage.
      if (rule.window_seconds === undefined || rule.threshold === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['threshold'],
          message:
            `rule "${rule.id}" is active but is missing window_seconds and/or threshold. ` +
            `An active rule that cannot fire is coverage that does not exist.`,
        });
      }
      if (rule.no_subject_reason !== undefined || rule.activation_trigger !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['status'],
          message:
            `rule "${rule.id}" is active but carries no_subject_reason / activation_trigger. ` +
            `Those fields describe a rule that CANNOT fire; ⛔ remove them or set status to ` +
            `no_subject_yet — a rule must not read as both.`,
        });
      }
      return;
    }

    // ⛔ A no-subject rule MUST say why, and MUST name what would activate it. A bare
    // "not implemented" is indistinguishable from a clause quietly skipped
    // ([[feedback_closure_language_precision]]).
    if (rule.no_subject_reason === undefined || rule.activation_trigger === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['no_subject_reason'],
        message:
          `rule "${rule.id}" is no_subject_yet but does not carry BOTH no_subject_reason and ` +
          `activation_trigger. A deferral with no written reason and no named trigger is a ` +
          `deferral nobody can close.`,
      });
    }
  });
export type DirectoryAbuseRule = z.output<typeof DirectoryAbuseRuleSchema>;

export const DirectoryAbuseRulesSchema = z
  .object({
    version: z.number().int().positive(),
    /**
     * The audit action every fired rule emits under. ⛔ Must be the NEWLY MINTED
     * `directory.abuse_suspected`, never `abuse.honeypot`: reusing the honeypot type corrupts that
     * signal and breaks `security-headers.spec.ts`'s exact-count assertion. Pinned by literal here
     * so the file cannot quietly retarget the emission.
     */
    audit_action: z.literal('directory.abuse_suspected'),
    rules: z.array(DirectoryAbuseRuleSchema).min(1),
  })
  .strict()
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    for (const rule of doc.rules) {
      if (seen.has(rule.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rules'],
          message: `duplicate rule id "${rule.id}" — rule ids are the triage signal and must be unique`,
        });
      }
      seen.add(rule.id);
    }
    if (!doc.rules.some((r) => r.status === 'active')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rules'],
        message:
          'no rule is active — a rules file in which nothing can fire is the vacuous-green defect ' +
          'this file exists to avoid.',
      });
    }
  });
export type DirectoryAbuseRules = z.output<typeof DirectoryAbuseRulesSchema>;

/**
 * Parse the committed rules file. ⛔ THROWS on anything that is not a well-formed rule set —
 * including a blank or comments-only document, which is NOT an "empty rule set" but a file that
 * failed to say anything.
 */
export function parseDirectoryAbuseRules(raw: string): DirectoryAbuseRules {
  let doc: unknown;
  try {
    doc = parseYaml(raw);
  } catch (err) {
    throw new Error(
      `directory-abuse-rules.yaml: YAML parse error — ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (doc === null || doc === undefined) {
    throw new Error(
      'directory-abuse-rules.yaml: the document is empty. ⛔ An empty rules file is a FAILURE, ' +
        'not "no rules" — the anti-enumeration signals on the public Member Directory would be ' +
        'silently disarmed while every CI leg stayed green.',
    );
  }

  const result = DirectoryAbuseRulesSchema.safeParse(doc);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`directory-abuse-rules.yaml: malformed rules — ${detail}`);
  }
  return result.data;
}
