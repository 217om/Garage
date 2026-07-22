import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { AppProvider } from '@/store/app-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.card },
              headerTitleStyle: { color: theme.text },
              headerTintColor: theme.tint,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: theme.background },
            }}>
            <Stack.Screen name="index" options={{ title: 'Garages in Oman' }} />
            <Stack.Screen name="account" options={{ title: 'Account' }} />
            <Stack.Screen name="garage/[id]" options={{ title: 'Garage' }} />
            <Stack.Screen name="login" options={{ title: 'Sign in', presentation: 'modal' }} />
            <Stack.Screen
              name="apply"
              options={{ title: 'Verify your garage', presentation: 'modal' }}
            />
            <Stack.Screen
              name="review/[id]"
              options={{ title: 'Write a review', presentation: 'modal' }}
            />
            <Stack.Screen name="admin" options={{ title: 'Verification requests' }} />
          </Stack>
        </ThemeProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
