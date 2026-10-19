// The per-Pariwar Meta template NAME's config key — ONE builder for a KEY FAMILY (Story 6.31, WR7; `2026-10-19-365`).
//
// `wa.template.<purpose>.<locale>.<pariwarId>` (the Pariwar id lower-cased, as `claimCorrectionHelplineConfigKey` does), read
// through the SAME resolver the DLT template ids use (`resolveSmsDltConfig` → GCP Secret Manager + the local env fallback). The
// operator sets it ONLY after Meta approves that Pariwar's template as UTILITY under EXACTLY the registered language code (roster
// Row 35 `peer-mesh-wa-reminder-template-approved`, leg (b)). Unset ⇒ the Pariwar HOLDS; a read that throws ⇒ HOLD for the tick.
// ⚠ A dotted name is `INVALID_ARGUMENT` in GCP Secret Manager (deferred-work's "Dotted Secret Manager names (UNVERIFIED)" item —
// inherited, ⛔ fixed here; Row 35 (b) proves the key resolves in production). ⛔ The frozen `AlertCategory` table
// (`pariwar_wa_templates`, F8) — a direct sender's template lives here. Row 6-37d adds its purposes through THIS builder.

/** The direct-WhatsApp template purposes. Row 6-37d adds `claim_contact.correction_reminder` / `…certificate_reminder`. */
export type WaTemplatePurpose = 'peer_mesh.reminder';

/** ⭐ WR7 — the ONE key builder of the family. */
export function waTemplateConfigKey(purpose: WaTemplatePurpose, locale: 'en' | 'hi', pariwarId: string): string {
  return `wa.template.${purpose}.${locale}.${pariwarId.toLowerCase()}`;
}
