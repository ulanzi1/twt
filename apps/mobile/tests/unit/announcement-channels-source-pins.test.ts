// Story 5.14 (Task 7; AC8, AC9; T6) — where the ask lives and what clears it: the card DIRECTLY after `<HomePromptCards />`, the entry
// DIRECTLY after `<TelegramNotificationSettingsEntry />` (the existing pins — Language above Notification — unbroken); every account
// change clears the member read and sign-out clears the card's dismissal; ⛔ a `[t]` dependency in the files this story adds.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const MOBILE = join(__dirname, '..', '..')
const raw = (rel: string): string => readFileSync(join(MOBILE, rel), 'utf8')
const code = (rel: string): string => raw(rel).replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the home wiring (AC8, AC9)', () => {
  it('the card renders directly after <HomePromptCards />; the entry directly after <TelegramNotificationSettingsEntry />', () => {
    const src = code('app/(tabs)/index.tsx')
    expect(src).toMatch(/<HomePromptCards \/>\s*<AnnouncementChannelsCard \/>/)
    expect(src).toMatch(/<TelegramNotificationSettingsEntry \/>\s*<AnnouncementChannelsEntry \/>/)
    expect(src).toMatch(/<LanguageSettingsEntry \/>\s*<NotificationSettingsEntry \/>/)
  })
})

describe('the clears (FS10 (a), FS11 (a))', () => {
  it('every clearKnownPeopleCache call site also clears the announcement read; sign-out also clears the card dismissal', () => {
    const src = code('lib/session-context.tsx')
    const known = [...src.matchAll(/clearKnownPeopleCache\(queryClient\)\s*\n\s*clearAnnouncementChannelsCache\(queryClient\)/g)].length
    expect(known).toBe([...src.matchAll(/clearKnownPeopleCache\(queryClient\)/g)].length)
    expect(known).toBeGreaterThanOrEqual(4)
    const signOut = src.slice(src.indexOf('async function signOut'))
    expect(signOut).toMatch(/clearHomeCardDismissals\(session\?\.memberId\)\s*\n\s*clearAnnouncementCardDismissal\(session\?\.memberId\)/)
  })
})

describe('⛔ a `[t]` dependency in the files this story adds (T6)', () => {
  it.each([
    'components/home/AnnouncementChannelsCard.tsx',
    'components/notifications/AnnouncementChannelsEntry.tsx',
    'app/(settings)/announcement-channels.tsx',
    'components/announcement-channels/ChannelLinkButtons.tsx',
  ])('%s', (file) => {
    for (const deps of raw(file).matchAll(/\],?\s*\[([^\]]*)\]\s*\)/g)) {
      expect(deps[1]!.split(',').map((d) => d.trim()), `${file}: [${deps[1]}]`).not.toContain('t')
    }
    expect(raw(file)).not.toMatch(/useCallback|useMemo|useEffect/) // nothing memoised over `t`
  })
})
