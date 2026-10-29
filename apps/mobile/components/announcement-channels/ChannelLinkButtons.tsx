// The Trust's announcement channels — the join buttons the home card and the settings screen share (Story 5.14, Task 7; AC8, AC9;
// I7). One button per link that EXISTS, EQUAL weight (⛔ primary — joining either is a choice); each a `link` (it leaves the app) with
// `accessible={true}` + its label (a tamagui `Button` is a plain RN View — without `accessible` the role and label are ⛔ announced:
// `SahyogVivranEntry.tsx`). `https://` links only (⛔ `tg://` / `whatsapp://` — F11). `Linking.openURL` REJECTS when nothing can open
// the link: the caller is told (`onFailed` ⇒ `link_error` inline) — ⛔ an unhandled rejection; `onOpened` only after it RESOLVES, and
// OUTSIDE the `openURL` try (code review G3-P7 — a throw in `onOpened` is ⛔ reported as a link that could not open). Fix-diff review
// FM-3: such a throw is caught at the call site and LOGGED (the action name only — ⛔ the link, ⛔ member data), ⛔ `link_error`.
// Long Hindi labels wrap: the `NomineeMarkControl` multi-line shape ([[project_tamagui_button_text_one_line]] — the render test only
// proves the props; wrapping is checked on a device).

import { Linking } from 'react-native'

import { useT } from '@twt/i18n/react'
import type { AnnouncementChannelsMemberResponse } from '@twt/contracts'
import { Button, Text, YStack } from 'tamagui'

/** Open `url`; `onFailed` only when `openURL` REJECTS, `onOpened` only after it resolves (⛔ inside its try). */
export async function openChannelLink(
  url: string,
  onOpened: () => void,
  onFailed: () => void,
  openURL: (url: string) => Promise<unknown> = (u) => Linking.openURL(u),
): Promise<void> {
  try {
    await openURL(url)
  } catch {
    onFailed()
    return
  }
  onOpened()
}

export function ChannelLinkButtons({
  links,
  onOpened,
  onFailed,
}: {
  links: AnnouncementChannelsMemberResponse
  onOpened: () => void
  onFailed: () => void
}) {
  const t = useT()
  const open = (url: string) => {
    openChannelLink(url, onOpened, onFailed).catch((e: unknown) => {
      console.warn('[announcement-channels] after-open step failed: ' + (e instanceof Error ? e.message : String(e)))
    })
  }
  const buttons: Array<{ url: string; label: string; testID: string }> = []
  if (links.whatsappChannelUrl !== null) buttons.push({ url: links.whatsappChannelUrl, label: t('announcementChannels.join_whatsapp'), testID: 'announcement-join-whatsapp' })
  if (links.telegramChannelUrl !== null) buttons.push({ url: links.telegramChannelUrl, label: t('announcementChannels.join_telegram'), testID: 'announcement-join-telegram' })
  return (
    <YStack gap="$2">
      {buttons.map((b) => (
        <Button
          key={b.testID}
          testID={b.testID}
          height="auto"
          minH={48}
          py="$2"
          noTextWrap
          accessible={true}
          accessibilityRole="link"
          accessibilityLabel={b.label}
          onPress={() => open(b.url)}
        >
          <Text shrink={1} text="center">
            {b.label}
          </Text>
        </Button>
      ))}
    </YStack>
  )
}
