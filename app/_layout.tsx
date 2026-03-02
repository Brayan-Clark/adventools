import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
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

import { SettingsProvider } from '@/lib/settings-context';

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
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
