// CLI for the jobs process's OTP-template pre-flight proof — Story 6.37 code review F4 (roster Row 32 (e)).
//
// Run INSIDE the deployed jobs container (the jobs env, Secret Manager access and egress IP):
//   node apps/jobs/dist/src/sms-otp-preflight-cli.js
// or from a checkout with the jobs env: `pnpm --filter @twt/jobs sms:preflight` (tsx src/sms-otp-preflight-cli.ts).
// READ-ONLY: MSG91's `getTemplateVersions` for templates 15 / 16 — ⛔ a text is sent. Prints ONE JSON line (⛔ the authkey,
// ⛔ a template id, ⛔ a text) and exits 0 only when both pass. ⛔ DATABASE_URL needed. Steps: the DLT sheet's MSG91 setup.

import { runSmsOtpPreflight } from './sms-otp-preflight.js';
import { buildSmsGatewayClients, resolveSmsDltConfig } from './scheduler/contribution-providers.js';

async function main(): Promise<void> {
  const gateway = await buildSmsGatewayClients();
  const report = await runSmsOtpPreflight({
    gatewayConfigured: gateway.smsAppClient.isConfigured(),
    reader: gateway.smsTemplateReader,
    readsWithSendKey: gateway.smsPreflightReadsWithSendKey,
    resolveConfig: resolveSmsDltConfig,
  });
  console.info('[sms-otp-preflight]', JSON.stringify(report));
  if (!report.ok) process.exitCode = 1;
}

main().catch((err: unknown) => {
  // A Secret Manager fault names the secret's NAME, ⛔ its value — the operator needs it to act.
  console.error('[sms-otp-preflight] failed:', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
