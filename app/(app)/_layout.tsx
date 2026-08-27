import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';
import { sharedHeaderOptions } from '@/constants/navigation';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.paper },
        ...sharedHeaderOptions,
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="notebook/[notebookId]"
        options={{
          title: 'Bölümler',
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
      <Stack.Screen
        name="notebook/[notebookId]/[sectionId]"
        options={{
          title: 'Notlar',
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
      <Stack.Screen
        name="note/[id]"
        options={{
          title: 'Not',
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
      <Stack.Screen
        name="note/view/[id]"
        options={{
          title: 'Sayfa görünümü',
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
      <Stack.Screen
        name="handwriting/[letter]"
        options={{
          title: 'El Yazım',
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
    </Stack>
  );
}
