// Trustee WhatsApp Business config page (Story 5.3, Task 5; AC4) — the [SURFACE] demoable.
//
// The demoable "trustee configures their WA Business number" flow: form → api → config table → read-back.
// Composes the WA config singleton form + the per-category UTILITY template mapping (form + list). Minimal;
// NO gold-plating (Epic 10 owns polish). `pariwarId` is a prop (from the route) so the page is testable
// without a router (the NiyamavaliPage precedent).

import type { ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import {
  usePutTelegramConfig,
  usePutWaConfig,
  usePutWaTemplate,
  useTelegramConfig,
  useWaConfig,
  useWaTemplates,
} from '../../api/hooks.js';
import { TelegramConfigForm } from './TelegramConfigForm.js';
import { WaConfigForm } from './WaConfigForm.js';
import { WaTemplateForm } from './WaTemplateForm.js';

export interface ChannelConfigPageProps {
  pariwarId: string;
}

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function ChannelConfigPage({ pariwarId }: ChannelConfigPageProps): ReactElement {
  const config = useWaConfig(pariwarId);
  const putConfig = usePutWaConfig(pariwarId);
  const templates = useWaTemplates(pariwarId);
  const putTemplate = usePutWaTemplate(pariwarId);
  const telegramConfig = useTelegramConfig(pariwarId);
  const putTelegramConfig = usePutTelegramConfig(pariwarId);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">WhatsApp Business — channel config</h1>
        <p className="text-sm opacity-70">
          Configure this Pariwar’s WhatsApp Business number, credential, and the per-category UTILITY
          template mapping. The access-token field is a Secret-Manager NAME (a pointer), never the token.
        </p>
      </header>

      <section aria-label="WhatsApp config" className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">Config</h2>
        {config.isLoading ? (
          <p role="status">Loading config…</p>
        ) : config.isError ? (
          <p role="alert" className="text-status-fail-fg">{errorMessage(config.error)}</p>
        ) : (
          <WaConfigForm
            initial={config.data!.config}
            pending={putConfig.isPending}
            submitError={errorMessage(putConfig.error)}
            onSubmit={(payload) => putConfig.mutate(payload)}
          />
        )}
      </section>

      <section aria-label="WhatsApp templates" className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
          Per-category UTILITY templates
        </h2>

        <WaTemplateForm
          pending={putTemplate.isPending}
          submitError={errorMessage(putTemplate.error)}
          onSubmit={(payload) => putTemplate.mutate(payload)}
        />

        <div className="mt-4">
          {templates.isLoading ? (
            <p role="status">Loading templates…</p>
          ) : templates.isError ? (
            <p role="alert" className="text-status-fail-fg">{errorMessage(templates.error)}</p>
          ) : (templates.data?.templates.length ?? 0) === 0 ? (
            <p className="text-sm opacity-70">No template mappings yet.</p>
          ) : (
            <table className="w-full text-sm" data-testid="wa-template-list">
              <thead>
                <tr className="text-left opacity-70">
                  <th className="py-1">Category</th>
                  <th className="py-1">Template</th>
                  <th className="py-1">Lang</th>
                  <th className="py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {templates.data!.templates.map((t) => (
                  <tr key={t.alertCategory} className="border-t">
                    <td className="py-1 font-mono">{t.alertCategory}</td>
                    <td className="py-1">{t.templateName}</td>
                    <td className="py-1">{t.languageCode}</td>
                    <td className="py-1">{t.approvalStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section aria-label="Telegram config" className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
          Telegram mirror (v1 feature flag)
        </h2>
        <p className="mb-3 text-sm opacity-70">
          Configure this Pariwar’s Telegram bot. Telegram is a fire-and-forget announcements-only mirror,
          disabled by default. The token fields are Secret-Manager NAMEs (pointers), never the values.
        </p>
        {telegramConfig.isLoading ? (
          <p role="status">Loading Telegram config…</p>
        ) : telegramConfig.isError ? (
          <p role="alert" className="text-status-fail-fg">{errorMessage(telegramConfig.error)}</p>
        ) : (
          <TelegramConfigForm
            initial={telegramConfig.data!.config}
            pending={putTelegramConfig.isPending}
            submitError={errorMessage(putTelegramConfig.error)}
            onSubmit={(payload) => putTelegramConfig.mutate(payload)}
          />
        )}
      </section>
    </div>
  );
}
