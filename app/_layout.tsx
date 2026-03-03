import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';


export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

import { Lexend_400Regular, Lexend_600SemiBold, Lexend_700Bold } from '@expo-google-fonts/lexend';

import { initBibleMetadata } from '@/lib/bible';
import { SettingsProvider } from '@/lib/settings-context';

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
  const router = useRouter();
  const [initialRoute, setInitialRoute] = useState<'(tabs)' | 'onboarding' | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const done = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!done) {
          setInitialRoute('onboarding');
        } else {
          setInitialRoute('(tabs)');
        }
      } catch (_) {
        setInitialRoute('(tabs)');
      }
    };
    checkOnboarding();
  }, []);

  // Wait until we know which route to show — avoids flash
  if (!initialRoute) {
    return null;
  }

  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

