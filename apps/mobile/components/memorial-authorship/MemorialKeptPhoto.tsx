// Story 11b.4 (MA8, R8) — the photo the family chose to KEEP ("Use the photo I sent before"): no bytes are sent again, the
// server reuses the earlier version's object. The family must SEE which photo that is: the member view carries a 5-minute
// signed URL for the latest version's photo (`photoUrl`), shown here. When there is no URL (signing failed, the words could
// not be decrypted) or the image will not load (the URL lapsed), a plain line says the earlier photo will be used — never a
// wrong image, never an empty gap. Used by the photo screen and the preview, so both say the same thing.
// A failure belongs to the URL that failed: the view is refetched on a screen mount, and a FRESH signed URL must get its
// chance — so the failure is remembered as that URL (not as a flag), and a different URL is simply tried.
// P9 — a signed URL lapses after 5 minutes, and a screen can stay open longer: when a URL fails the view is refetched
// (`onUrlFailed`), so a fresh one can arrive while the plain line stands in.
// T2 — ⚠ every refetch brings a NEW signed URL (a V4 URL embeds its signing time), so a guard "once per URL" never stops when
// the photo can never load (the object is gone, the bytes will not decode, a slow link times out): each turn was a member GET
// with KMS decrypts and audit lines. The refetch is therefore bounded per MOUNTED component: at most ONE per mount. After it,
// a failure simply leaves the plain line standing (a fresh URL that arrives some other way is still tried).
// V10 — a URL that LOADS re-arms that one refetch: on a long-open screen the refreshed URL lapses in its turn, and its failure
// deserves one more refetch. Still no loop when every URL fails (no load ⇒ never re-armed).

import { useRef, useState } from 'react'
import { Image } from 'react-native'
import { Paragraph, YStack } from 'tamagui'

import { useMemorialT } from '../../lib/memorial-i18n'

export function MemorialKeptPhoto({ photoUrl, onUrlFailed }: { photoUrl: string | null; onUrlFailed?: () => void }): React.ReactElement {
  const t = useMemorialT()
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  // Has this mounted component already asked for a refetch? A ref, so two `error` events in one batch still refetch once.
  const refetched = useRef(false)
  return (
    <YStack gap="$2" testID="memorial-kept-photo">
      {photoUrl !== null && photoUrl !== failedUrl ? (
        <Image
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('photo.kept_a11y')}
          source={{ uri: photoUrl }}
          style={{ width: '100%', height: 240 }}
          resizeMode="contain"
          onLoad={() => {
            refetched.current = false // V10 — this URL worked: its own lapse later gets one refetch again
          }}
          onError={() => {
            setFailedUrl(photoUrl)
            if (!refetched.current) {
              refetched.current = true
              onUrlFailed?.()
            }
          }}
        />
      ) : null}
      <Paragraph>{t('photo.kept_note')}</Paragraph>
    </YStack>
  )
}
