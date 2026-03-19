import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';


export {
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

import { Lexend_400Regular, Lexend_600SemiBold, Lexend_700Bold } from '@expo-google-fonts/lexend';

import { initBibleMetadata } from '@/lib/bible';
import { SettingsProvider } from '@/lib/settings-context';
import { useAutoUpdater } from '@/lib/updater';

const ONBOARDING_KEY = 'adventools_onboarding_done';

export default function RootLayout() {
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
    'Arial': require('../assets/fonts/arial.ttf'),
    'Comic': require('../assets/fonts/comic.ttf'),
    'Monospace': require('../assets/fonts/Monospace.ttf'),
    'Serif': require('../assets/fonts/Serif.TTF'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    initBibleMetadata();
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider value={DarkTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  useAutoUpdater();
  
  // true = still checking AsyncStorage, overlay shown to prevent flash
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const done = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!done) {
          // Navigate to onboarding — Stack is already mounted so router works
          router.replace('/onboarding' as any);
        }
      } catch (_) {
        // On error, just proceed to (tabs) normally
      } finally {
        setChecking(false);
      }
    };
    checkOnboarding();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>

      {/* Black overlay shown while checking — prevents any flash of (tabs) */}
      {checking && (
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#060d1f',
            zIndex: 9999,
          }}
        />
      )}
    </>
  );
}
