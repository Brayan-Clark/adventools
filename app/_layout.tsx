import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

import { SettingsProvider } from '@/lib/settings-context';
import { Lexend_400Regular, Lexend_700Bold, Lexend_600SemiBold } from '@expo-google-fonts/lexend';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Lexend_400Regular,
    Lexend_700Bold,
    Lexend_600SemiBold,
    'Alice': require('../assets/fonts/Alice.ttf'),
    'Allura': require('../assets/fonts/Allura.ttf'),
    'Choco': require('../assets/fonts/Chococooky.ttf'),
    'Comfortaa': require('../assets/fonts/Comfortaa.ttf'),
    'Cool': require('../assets/fonts/Cooljazz.ttf'),
    'Rosemary': require('../assets/fonts/Rosemary.ttf'),
    'OpenSans': require('../assets/fonts/OpenSans.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="bible/reader" options={{ headerShown: false }} />
        <Stack.Screen name="bible/settings" options={{ headerShown: false }} />
        <Stack.Screen name="promises/index" options={{ headerShown: false }} />
        <Stack.Screen name="pdf/viewer" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <SafeAreaProvider>
        <RootLayoutNav />
      </SafeAreaProvider>
    </SettingsProvider>
  );
}
