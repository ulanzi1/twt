import { useState } from 'react'
import { TextInput } from 'react-native'
import { Text, YStack } from 'tamagui'

// "दो शब्द स्मृति में" input field per UX spec line 477:
//   single-line input, character-capped, live counter,
//   placeholder *"एक स्मृति, एक पंक्ति"*

const MAX_CHARS = 60

export function MemoryInput() {
  const [text, setText] = useState('')

  return (
    <YStack gap="$2" width="100%">
      <Text fontFamily="$body" fontSize="$2" color="$colorPress">
        दो शब्द स्मृति में
      </Text>
      <YStack
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        paddingBottom={6}
      >
        <TextInput
          value={text}
          onChangeText={(v) => {
            if (v.length <= MAX_CHARS) setText(v)
          }}
          placeholder="एक स्मृति, एक पंक्ति"
          placeholderTextColor="#9A9794"
          maxLength={MAX_CHARS}
          // Devanagari rendering via system fallback — TextInput in RN does
          // not pick up Tamagui font tokens directly. Production work would
          // wire a Tamagui-wrapped Input atom per UX spec line 679.
          style={{
            fontFamily: 'NotoSansDevanagari_400Regular',
            fontSize: 16,
            color: '#202020',
            paddingVertical: 4,
          }}
        />
      </YStack>
      <Text fontFamily="$tabular" fontSize="$1" color="$colorPress" textAlign="right">
        {text.length} / {MAX_CHARS}
      </Text>
    </YStack>
  )
}
