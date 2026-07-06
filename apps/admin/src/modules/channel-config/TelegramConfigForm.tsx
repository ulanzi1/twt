// Telegram Bot config form (Story 5.5, Task 9; AC3).
//
// RHF + zodResolver over the SAME `TelegramConfigDto` contract the server validates (single source of types),
// mirroring WaConfigForm. Nullable fields coerce a blank input → null via `setValueAs` so the `.nullable()`
// schema branch passes instead of failing `.min(1)`. Deliberately MINIMAL (AC3): the FR-58C v1 `enabled`
// toggle (default off) + the member-facing bot username + the two Secret-Manager NAME fields (bot token,
// webhook secret token).
//
// ── Credential discipline ─────────────────────────────────────────────────────────────────────────────
// The `botTokenSecretName` / `webhookSecretTokenSecretName` fields are Secret-Manager NAMEs (pointers), NOT
// the secret values — safe to display + round-trip. The trustee registers the values in Secret Manager
// out-of-band.

import { zodResolver } from '@hookform/resolvers/zod';
import { TelegramConfigDto } from '@twt/contracts';
import type { TelegramConfigDto as TelegramConfig } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

// `setValueAs` runs on the initial default too (which may already be `null`), so guard non-strings.
const blankToNull = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v : null;

export interface TelegramConfigFormProps {
  initial: TelegramConfig;
  onSubmit: (payload: TelegramConfig) => void;
  pending: boolean;
  submitError?: string;
}

export function TelegramConfigForm({ initial, onSubmit, pending, submitError }: TelegramConfigFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TelegramConfig>({
    resolver: zodResolver(TelegramConfigDto),
    defaultValues: initial,
  });

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)} aria-label="Telegram Bot config">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" {...register('enabled')} data-testid="telegram-enabled" />
        Enable Telegram mirror delivery (v1 feature flag — disabled by default)
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="botUsername" className="text-sm font-medium">Bot username (member-facing)</label>
        <input id="botUsername" className="rounded border px-2 py-1" {...register('botUsername', { setValueAs: blankToNull })} />
        <p className="text-xs opacity-60">Used in the members’ t.me/&lt;bot&gt;?start=&lt;code&gt; opt-in deep-link.</p>
        {errors.botUsername && <p role="alert" className="text-sm text-status-fail-fg">{errors.botUsername.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="botTokenSecretName" className="text-sm font-medium">
          Bot-token Secret-Manager NAME (a pointer — never the token value)
        </label>
        <input id="botTokenSecretName" className="rounded border px-2 py-1" {...register('botTokenSecretName', { setValueAs: blankToNull })} />
        <p className="text-xs opacity-60">Leave blank to use the log-only fixture (no live Telegram sends).</p>
        {errors.botTokenSecretName && <p role="alert" className="text-sm text-status-fail-fg">{errors.botTokenSecretName.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="webhookSecretTokenSecretName" className="text-sm font-medium">
          Webhook secret-token Secret-Manager NAME (a pointer — never the value)
        </label>
        <input id="webhookSecretTokenSecretName" className="rounded border px-2 py-1" {...register('webhookSecretTokenSecretName', { setValueAs: blankToNull })} />
        <p className="text-xs opacity-60">Compared (constant-time) against the X-Telegram-Bot-Api-Secret-Token header on inbound updates. Leave blank to reject inbound updates (fail-closed).</p>
        {errors.webhookSecretTokenSecretName && <p role="alert" className="text-sm text-status-fail-fg">{errors.webhookSecretTokenSecretName.message}</p>}
      </div>

      <button type="submit" disabled={pending} aria-busy={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-60" data-testid="telegram-config-submit">
        {pending ? 'Saving…' : 'Save config'}
      </button>

      {submitError && <p role="alert" className="text-sm text-status-fail-fg">{submitError}</p>}
    </form>
  );
}
