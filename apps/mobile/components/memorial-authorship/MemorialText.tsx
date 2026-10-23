// Story 11b.4 (AC5 / AC11) — renders the family's words through the SHARED `@twt/ui` presenter, so the preview and the
// outcome (and, later, the public page) show exactly the same thing. React Native `<Text>` keeps the family's spaces and
// line breaks VERBATIM (⛔ trim); an omission is a SEGMENT with a copy key, shown distinctly — ⛔ a string the family could
// have typed.

import { Paragraph, Text, YStack } from 'tamagui'

import type { MemorialParagraph } from '@twt/ui'

import { useMemorialT } from '../../lib/memorial-i18n'

export function MemorialText({ paragraphs, testID }: { paragraphs: readonly MemorialParagraph[]; testID?: string }): React.ReactElement {
  const t = useMemorialT()
  return (
    <YStack gap="$3" testID={testID}>
      {paragraphs.map((p, i) => (
        <Paragraph key={i}>
          {p.segments.map((s, j) =>
            s.kind === 'text' ? (
              <Text key={j}>{s.text}</Text>
            ) : (
              <Text key={j} fontStyle="italic" accessibilityLabel={t('render.omitted_a11y')}>
                {t(s.key)}
              </Text>
            ),
          )}
        </Paragraph>
      ))}
    </YStack>
  )
}
