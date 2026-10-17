// The jobs process's OTP-template pre-flight proof — Story 6.37 code review F4 (`2026-10-17-345` MG1 / MG5 / MG14;
// roster Row 32 (e); ADR-0041).
//
// ⭐ Why it exists: Row 32 (e) asks for the pre-flight GREEN on the deployed api AND jobs before OTP go-live. The api proves
// it at boot (templates 15 / 16). The jobs process builds its memo LAZILY and reads only claim-text templates (1–14) —
// which Row 32 (i) keeps UNPROVISIONED until row 6-37b is done (and, since `-353`, until Row 33 has closed AND row 6-37c
// is done — Row 32 note (9)) — so without this the jobs proof would wait on those, although
// MG1 / Row 32 note (1) keep the OTPs independent of it. This reads the two OTP templates through the jobs process's OWN
// configured reader (the same `buildSmsGatewayClients` boot uses — the same key, origin and, run inside the jobs
// container, the same egress) and the same `checkMsg91Template` the memo wraps. It is the INITIAL jobs proof; the
// claim-text proof is re-taken once those ids may be provisioned (Row 32 (i)).
//
// ⛔ A send: it calls ONLY MSG91's read-only `getTemplateVersions` — ⛔ Flow, ⛔ a text, ⛔ a number. ⛔ The authkey, ⛔ a
// template id, ⛔ a template's text in its output (I6) — the config key, the verdict and the informational fields only.
// ⛔ Run it from a test (I7, T1): tests inject the reader.

import {
  checkMsg91Template,
  resolveOtpTemplate,
  type Msg91PreflightObservation,
  type Msg91TemplateReader,
  type OtpIntent,
} from '@twt/channels';

/** One OTP template's line in the proof. */
export interface SmsOtpPreflightLine {
  readonly configKey: string;
  /** `pass`, a pre-flight reason, or why it was ⛔ read (the id unset, or its config read failed). */
  readonly result: Msg91PreflightObservation['result'] | 'template_id_missing' | 'config_unavailable';
  /** The informational fields of EVERY version MSG91 returned (review round 2 P4; Row 32 (d) / (e) record them) — ⛔ a text. */
  readonly observation: Msg91PreflightObservation | null;
}

/** The proof: green iff the gateway is configured and BOTH OTP templates pass. */
export interface SmsOtpPreflightReport {
  readonly ok: boolean;
  readonly gatewayConfigured: boolean;
  /** MG17 — which key read the templates (Row 32 (b) records the arm production uses). */
  readonly readsWithSendKey: boolean;
  readonly templates: readonly SmsOtpPreflightLine[];
}

export interface SmsOtpPreflightDeps {
  readonly gatewayConfigured: boolean;
  readonly reader: Msg91TemplateReader;
  readonly readsWithSendKey: boolean;
  /** A config NAME → the template id, or `null` when unset (`resolveSmsDltConfig` — boot's resolver). */
  readonly resolveConfig: (configKey: string) => Promise<string | null>;
}

const OTP_INTENTS: readonly OtpIntent[] = ['login', 'step_up'];

/** Read templates 15 / 16 with the jobs process's reader and judge each (MG5). Never throws; ⛔ a send. */
export async function runSmsOtpPreflight(deps: SmsOtpPreflightDeps): Promise<SmsOtpPreflightReport> {
  if (!deps.gatewayConfigured) {
    return { ok: false, gatewayConfigured: false, readsWithSendKey: deps.readsWithSendKey, templates: [] };
  }
  const templates: SmsOtpPreflightLine[] = [];
  for (const intent of OTP_INTENTS) {
    const template = resolveOtpTemplate(intent);
    const configKey = template.dltTemplateIdConfigKey;
    let templateId: string | null;
    try {
      templateId = (await deps.resolveConfig(configKey))?.trim() || null;
    } catch {
      templates.push({ configKey, result: 'config_unavailable', observation: null });
      continue;
    }
    if (templateId === null) {
      templates.push({ configKey, result: 'template_id_missing', observation: null });
      continue;
    }
    let observation: Msg91PreflightObservation | null = null;
    const verdict = await checkMsg91Template(deps.reader, { text: template.contentTemplate, slots: template.slots }, templateId, {
      log: (o) => {
        observation = o;
      },
    });
    templates.push({ configKey, result: verdict.ok ? 'pass' : verdict.reason, observation });
  }
  return {
    ok: templates.length === OTP_INTENTS.length && templates.every((t) => t.result === 'pass'),
    gatewayConfigured: true,
    readsWithSendKey: deps.readsWithSendKey,
    templates,
  };
}
