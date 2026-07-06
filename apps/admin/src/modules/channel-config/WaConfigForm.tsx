// WhatsApp Business config form (Story 5.3, Task 5; AC4).
//
// RHF + zodResolver over the SAME `WaConfigDto` contract the server validates (single source of types),
// mirroring pariwar-provisioning/AddPariwarForm. Nullable fields coerce a blank input → null via
// `setValueAs` so the `.nullable()` schema branch passes instead of failing `.min(1)`. Deliberately MINIMAL
// (AC4): the toggle + the Meta-addressing fields + the credential NAME + the graph version — NO Epic-10
// polish (template-approval polling, Meta onboarding wizard).
//
// ── Credential discipline ─────────────────────────────────────────────────────────────────────────────
// The `accessTokenSecretName` field is a Secret-Manager NAME (a pointer), NOT the token value — it is safe
// to display + round-trip. The trustee registers the token value in Secret Manager out-of-band.

import { zodResolver } from '@hookform/resolvers/zod';
import { WaConfigDto } from '@twt/contracts';
import type { WaConfigDto as WaConfig } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

// `setValueAs` runs on the initial default too (which may already be `null`), so guard non-strings.
const blankToNull = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v : null;

export interface WaConfigFormProps {
  initial: WaConfig;
  onSubmit: (payload: WaConfig) => void;
  pending: boolean;
  submitError?: string;
}

export function WaConfigForm({ initial, onSubmit, pending, submitError }: WaConfigFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WaConfig>({
    resolver: zodResolver(WaConfigDto),
    defaultValues: initial,
  });

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)} aria-label="WhatsApp Business config">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" {...register('enabled')} data-testid="wa-enabled" />
        Enable WhatsApp Business delivery (admin toggle)
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="displayPhoneNumber" className="text-sm font-medium">Display number (member-facing)</label>
        <input id="displayPhoneNumber" className="rounded border px-2 py-1" {...register('displayPhoneNumber', { setValueAs: blankToNull })} />
        {errors.displayPhoneNumber && <p role="alert" className="text-sm text-status-fail-fg">{errors.displayPhoneNumber.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phoneNumberId" className="text-sm font-medium">Meta phone-number ID</label>
        <input id="phoneNumberId" className="rounded border px-2 py-1" {...register('phoneNumberId', { setValueAs: blankToNull })} />
        {errors.phoneNumberId && <p role="alert" className="text-sm text-status-fail-fg">{errors.phoneNumberId.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="wabaId" className="text-sm font-medium">WhatsApp Business Account ID</label>
        <input id="wabaId" className="rounded border px-2 py-1" {...register('wabaId', { setValueAs: blankToNull })} />
        {errors.wabaId && <p role="alert" className="text-sm text-status-fail-fg">{errors.wabaId.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="accessTokenSecretName" className="text-sm font-medium">
          Access-token Secret-Manager NAME (a pointer — never the token value)
        </label>
        <input id="accessTokenSecretName" className="rounded border px-2 py-1" {...register('accessTokenSecretName', { setValueAs: blankToNull })} />
        <p className="text-xs opacity-60">Leave blank to use the log-only fixture (no live Meta sends).</p>
        {errors.accessTokenSecretName && <p role="alert" className="text-sm text-status-fail-fg">{errors.accessTokenSecretName.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="graphApiVersion" className="text-sm font-medium">Meta Graph API version</label>
        <input id="graphApiVersion" className="rounded border px-2 py-1" {...register('graphApiVersion')} />
        {errors.graphApiVersion && <p role="alert" className="text-sm text-status-fail-fg">{errors.graphApiVersion.message}</p>}
      </div>

      {/* Story 5.4 — inbound-webhook credential NAMEs (pointers, never the secret values). */}
      <div className="flex flex-col gap-1">
        <label htmlFor="appSecretSecretName" className="text-sm font-medium">
          App-secret Secret-Manager NAME (inbound webhook signature — a pointer, never the value)
        </label>
        <input id="appSecretSecretName" className="rounded border px-2 py-1" {...register('appSecretSecretName', { setValueAs: blankToNull })} />
        <p className="text-xs opacity-60">Verifies Meta's X-Hub-Signature-256 on inbound webhooks. Leave blank to reject inbound webhooks (fail-closed).</p>
        {errors.appSecretSecretName && <p role="alert" className="text-sm text-status-fail-fg">{errors.appSecretSecretName.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="webhookVerifyTokenSecretName" className="text-sm font-medium">
          Webhook verify-token Secret-Manager NAME (GET challenge — a pointer, never the value)
        </label>
        <input id="webhookVerifyTokenSecretName" className="rounded border px-2 py-1" {...register('webhookVerifyTokenSecretName', { setValueAs: blankToNull })} />
        <p className="text-xs opacity-60">Echoed to Meta's subscription-verification GET. Leave blank to fail the challenge (fail-closed).</p>
        {errors.webhookVerifyTokenSecretName && <p role="alert" className="text-sm text-status-fail-fg">{errors.webhookVerifyTokenSecretName.message}</p>}
      </div>

      <button type="submit" disabled={pending} aria-busy={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-60" data-testid="wa-config-submit">
        {pending ? 'Saving…' : 'Save config'}
      </button>

      {submitError && <p role="alert" className="text-sm text-status-fail-fg">{submitError}</p>}
    </form>
  );
}
