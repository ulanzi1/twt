// The per-Pariwar Meta template NAME's config key — ONE builder for a KEY FAMILY (Story 6.31, WR7; `2026-10-19-365`).
//
// `wa.template.<purpose>.<locale>.<pariwarId>` (the Pariwar id lower-cased, as `claimCorrectionHelplineConfigKey` does), read
// through the SAME resolver the DLT template ids use (`resolveSmsDltConfig` → GCP Secret Manager + the local env fallback). The
// operator sets it ONLY after Meta approves that Pariwar's template as UTILITY under EXACTLY the registered language code (roster
// Row 35 `peer-mesh-wa-reminder-template-approved`, leg (b)). Unset ⇒ the Pariwar HOLDS; a read that throws ⇒ HOLD for the tick.
// ⚠ A dotted name is `INVALID_ARGUMENT` in GCP Secret Manager (deferred-work's "Dotted Secret Manager names (UNVERIFIED)" item —
// inherited, ⛔ fixed here; Row 35 (b) proves the key resolves in production). ⛔ The frozen `AlertCategory` table
// (`pariwar_wa_templates`, F8) — a direct sender's template lives here. Row 6-37d adds its purposes through THIS builder.
//
// Story 5.13 (WC4; Decision 2026-10-21-376) — MOVED here unchanged from `apps/jobs/src/scheduler/wa-template-config-key.ts` (with
// `TEMPLATE_NAME_FORM`, from `claim-peer-mesh-wa-reminders.ts`): its second consumer is apps/api (the WhatsApp code — an
// AUTHENTICATION template, read through `resolveChannelSecret`; roster Row 39 `wa-opt-in-code-template-approved` (a) sets it). The
// two old homes re-export, so their importers are byte-unchanged.

/**
 * The direct-WhatsApp template purposes. Story 6.37d (WS9) adds the claimant's WhatsApp step — one per chase
 * (`claim_contact.correction_reminder` / `claim_contact.certificate_reminder`; roster Row 36 (h) sets them). Story 5.13 (WC4) adds
 * the WhatsApp code (`wa_opt_in.code` — a Meta AUTHENTICATION template, ⛔ UTILITY).
 */
export type WaTemplatePurpose =
  | 'peer_mesh.reminder'
  | 'claim_contact.correction_reminder'
  | 'claim_contact.certificate_reminder'
  | 'wa_opt_in.code';

/** ⭐ WR7 — the ONE key builder of the family. */
export function waTemplateConfigKey(purpose: WaTemplatePurpose, locale: 'en' | 'hi', pariwarId: string): string {
  return `wa.template.${purpose}.${locale}.${pariwarId.toLowerCase()}`;
}

/**
 * The 0171 form of a Meta template NAME — a value outside it would be refused by the begin's INSERT. Exported (Story 6.37d
 * WS9 — ⛔ a second regex: the claim-contact step checks its template names against THIS one; 0172's CHECK is the same form).
 * Story 5.13 (WC4) — the WhatsApp code's template name is checked against it too.
 */
export const TEMPLATE_NAME_FORM = /^[a-z0-9_]{1,512}$/;
