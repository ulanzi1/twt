// Story 11b.4 (AC5 / AC11) — renders the family's words through the SHARED `@twt/ui` presenter, so the preview and the
// outcome (and, later, the public page) show exactly the same thing. React Native `<Text>` keeps the family's spaces and
// line breaks VERBATIM (⛔ trim); an omission is a SEGMENT with a copy key, shown distinctly — ⛔ a string the family could
// have typed.
//
// R13 — each family-authored TEXT segment is drawn inside its own bidi isolate (`isolateMemorialBidi`): an unterminated
// right-to-left override or isolate in the family's words cannot reorder the omission marker (or the words) after it. The
// stored text is untouched; only invisible controls are added around what is drawn.
// R10 — with `showReasons` (the family's own OUTCOME screen) each marker is followed by ITS reason (`-391` Q4 A: "for each
// part, which of these reasons applies"). The marker itself stays what the public page will show.
// T11 — the marker is a `<Text>` NESTED in the paragraph's `<Paragraph>`: React Native flattens nested text into its parent,
// so a label on it is never announced (the screen reader reads the visible marker, `render.omitted`). It carries ⛔ label.

import { Fragment } from 'react'
import { Paragraph, Text, YStack } from 'tamagui'

import { isolateMemorialBidi, type MemorialParagraph } from '@twt/ui'

import { useMemorialT } from '../../lib/memorial-i18n'
import { memorialReasonKey } from './memorial-copy'

export function MemorialText({
  paragraphs,
  testID,
  showReasons = false,
}: {
  paragraphs: readonly MemorialParagraph[]
  testID?: string
  showReasons?: boolean
}): React.ReactElement {
  const t = useMemorialT()
  return (
    <YStack gap="$3" testID={testID}>
      {paragraphs.map((p, i) => (
        <Paragraph key={i}>
          {p.segments.map((s, j) =>
            s.kind === 'text' ? (
              <Text key={j}>{isolateMemorialBidi(s.text)}</Text>
            ) : (
              <Fragment key={j}>
                <Text fontStyle="italic">{t(s.key)}</Text>
                {showReasons ? (
                  <Text fontStyle="italic" testID="memorial-omitted-reason">
                    {' '}
                    {t('outcome.reason', { reason: t(memorialReasonKey(s.reason)) })}
                  </Text>
                ) : null}
              </Fragment>
            ),
          )}
        </Paragraph>
      ))}
    </YStack>
  )
}
