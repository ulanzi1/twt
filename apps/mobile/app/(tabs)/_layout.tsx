import { Tabs } from 'expo-router'
import { useTheme } from 'tamagui'
import { Book, FileText, Megaphone } from '@tamagui/lucide-icons-2'

export default function TabLayout() {
  const theme = useTheme()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.red10.val,
        tabBarStyle: {
          backgroundColor: theme.background.val,
          borderTopColor: theme.borderColor.val,
        },
        headerStyle: {
          backgroundColor: theme.background.val,
          borderBottomColor: theme.borderColor.val,
        },
        headerTintColor: theme.color.val,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Yogdaan Bahi',
          tabBarIcon: ({ color }) => <Book color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="shradhanjali"
        options={{
          title: 'Shradhanjali',
          tabBarIcon: ({ color }) => <FileText color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="panchayat"
        options={{
          title: 'Panchayat',
          tabBarIcon: ({ color }) => <Megaphone color={color as any} />,
        }}
      />
    </Tabs>
  )
}
