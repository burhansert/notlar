import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerBackTitle: 'Geri',
        contentStyle: { backgroundColor: colors.paper },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="note/[id]"
        options={{
          title: 'Not',
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
    </Stack>
  );
}
