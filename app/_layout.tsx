import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/constants/theme';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(app)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <SplashController />
      <RootNavigator />
    </AuthProvider>
  );
}

function SplashController() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return null;
}

function RootNavigator() {
  const { session, isLoading, isConfigured } = useAuth();

  if (isLoading) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
        animation: 'fade',
      }}>
      <Stack.Protected guard={isConfigured && Boolean(session)}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session || !isConfigured}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
