// The Trust's announcement channels config form (Story 5.14, Task 6; AC2; `2026-10-29-417` FS3 (a), FS4 (a)).
//
// RHF + zodResolver over the SAME `AnnouncementChannelsConfigDto` the server validates (its refinements equal migration 0190's CHECKs —
// the Telegram link and the channel id are set together). ONE switch: while it is on, members see the links in the app and the system
// posts pool openings and last days to the Telegram channel; the WhatsApp Channel is posted BY HAND from the list below (Meta has no
// posting API). The switch's label says so — the app's WhatsApp words are true only while someone posts there (`-418` item 7).

import { zodResolver } from '@hookform/resolvers/zod';
import { AnnouncementChannelsConfigDto } from '@twt/contracts';
import type { AnnouncementChannelsConfigDto as AnnouncementChannelsConfig } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

/** AC2 — the switch's on-label, verbatim. */
export const ANNOUNCEMENT_SWITCH_LABEL =
  'When on: members see these links in the app, and the system posts pool openings and last days to the Telegram channel. Post the same words to the WhatsApp Channel by hand from the list below.';
/** AC2 — the bot hint, verbatim. */
export const ANNOUNCEMENT_BOT_HINT =
  "Posts go out through this Pariwar's Telegram bot (the bot-token name in the Telegram config above), even while Telegram mirror delivery is off; add the bot to the channel as an admin with 'Post messages'.";

const blankToNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);

export interface AnnouncementChannelsFormProps {
  initial: AnnouncementChannelsConfig;
  onSubmit: (payload: AnnouncementChannelsConfig) => void;
  pending: boolean;
  submitError?: string;
}

export function AnnouncementChannelsForm({ initial, onSubmit, pending, submitError }: AnnouncementChannelsFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnnouncementChannelsConfig>({ resolver: zodResolver(AnnouncementChannelsConfigDto), defaultValues: initial });

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)} aria-label="Announcement channels config">
      <label className="flex items-start gap-2 text-sm font-medium">
        <input type="checkbox" className="mt-1" {...register('enabled')} data-testid="announcement-enabled" />
        <span>{ANNOUNCEMENT_SWITCH_LABEL}</span>
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="whatsappChannelUrl" className="text-sm font-medium">WhatsApp Channel link</label>
        <input id="whatsappChannelUrl" className="rounded border px-2 py-1" placeholder="https://whatsapp.com/channel/…" {...register('whatsappChannelUrl', { setValueAs: blankToNull })} />
        {errors.whatsappChannelUrl && <p role="alert" className="text-sm text-status-fail-fg">{errors.whatsappChannelUrl.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="telegramInviteUrl" className="text-sm font-medium">Telegram channel link</label>
        <input id="telegramInviteUrl" className="rounded border px-2 py-1" placeholder="https://t.me/…" {...register('telegramInviteUrl', { setValueAs: blankToNull })} />
        {errors.telegramInviteUrl && <p role="alert" className="text-sm text-status-fail-fg">{errors.telegramInviteUrl.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="telegramChannelChatId" className="text-sm font-medium">Telegram channel id</label>
        <input id="telegramChannelChatId" className="rounded border px-2 py-1" placeholder="@channel_name or -100…" {...register('telegramChannelChatId', { setValueAs: blankToNull })} />
        <p className="text-xs opacity-60">{ANNOUNCEMENT_BOT_HINT}</p>
        <p className="text-xs opacity-60">Leave the Telegram link and the channel id both blank to show only the WhatsApp Channel.</p>
        {errors.telegramChannelChatId && <p role="alert" className="text-sm text-status-fail-fg">{errors.telegramChannelChatId.message}</p>}
      </div>

      <button type="submit" disabled={pending} aria-busy={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-60" data-testid="announcement-config-submit">
        {pending ? 'Saving…' : 'Save'}
      </button>
      {submitError && <p role="alert" className="text-sm text-status-fail-fg">{submitError}</p>}
    </form>
  );
}
