import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionRouting } from 'expo-quick-actions/router';
import { Stack, router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, View } from 'react-native';
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

import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_400Regular_Italic, Inter_700Bold_Italic } from '@expo-google-fonts/inter';
import { Lexend_400Regular, Lexend_600SemiBold, Lexend_700Bold } from '@expo-google-fonts/lexend';
import { Lora_400Regular, Lora_600SemiBold, Lora_700Bold, Lora_400Regular_Italic, Lora_700Bold_Italic } from '@expo-google-fonts/lora';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold, Poppins_400Regular_Italic, Poppins_700Bold_Italic } from '@expo-google-fonts/poppins';
import { OpenSans_400Regular, OpenSans_700Bold, OpenSans_400Regular_Italic, OpenSans_700Bold_Italic } from '@expo-google-fonts/open-sans';
import { Comfortaa_400Regular, Comfortaa_700Bold } from '@expo-google-fonts/comfortaa';
import { Alice_400Regular } from '@expo-google-fonts/alice';
import { SpaceMono_400Regular, SpaceMono_700Bold, SpaceMono_400Regular_Italic, SpaceMono_700Bold_Italic } from '@expo-google-fonts/space-mono';

import { initBibleMetadata } from '@/lib/bible';
import { initializeNotificationChannel, restoreStudyReminders } from '@/lib/notifications';
import { SettingsProvider, useSettings } from '@/lib/settings-context';
import { ToastProvider } from '@/lib/toast-context';
import { useAutoUpdater } from '@/lib/updater';
import { getSetting } from '@/lib/user-storage';

const ONBOARDING_KEY = 'adventools_onboarding_done';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    SpaceMono_400Regular_Italic,
    SpaceMono_700Bold_Italic,
    Lexend_400Regular,
    Lexend_700Bold,
    Lexend_600SemiBold,
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_400Regular_Italic,
    Poppins_700Bold_Italic,
    Lora_400Regular,
    Lora_600SemiBold,
    Lora_700Bold,
    Lora_400Regular_Italic,
    Lora_700Bold_Italic,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_400Regular_Italic,
    Inter_700Bold_Italic,
    OpenSans_400Regular,
    OpenSans_700Bold,
    OpenSans_400Regular_Italic,
    OpenSans_700Bold_Italic,
    Comfortaa_400Regular,
    Comfortaa_700Bold,
    'Alice': Alice_400Regular,
    'Allura': require('../assets/fonts/Allura.ttf'),
    'Choco': require('../assets/fonts/Chococooky.ttf'),
    'Comfortaa': Comfortaa_400Regular,
    'Cool': require('../assets/fonts/Cooljazz.ttf'),
    'Rosemary': require('../assets/fonts/Rosemary.ttf'),
    'OpenSans': OpenSans_400Regular,
    'Arial': require('../assets/fonts/arial.ttf'),
    'Comic': require('../assets/fonts/comic.ttf'),
    'Monospace': SpaceMono_400Regular,
    'Serif': require('../assets/fonts/Serif.TTF'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    // Force portrait orientation lock
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    
    // Bible metadata init on startup
    initBibleMetadata();
    // NOTE: Notification permission is handled once in RootNavigator.checkPermissions()
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
        <ToastProvider>
          <ThemeProvider value={DarkTheme}>
            <StatusBar style="light" />
            <RootNavigator />
          </ThemeProvider>
        </ToastProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  useAutoUpdater();
  useQuickActionRouting();
  const { isLoading } = useSettings();
  
  // true = still checking AsyncStorage, overlay shown to prevent flash
  const [checking, setChecking] = useState(true);

    const checkPermissions = async () => {
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            try {
                await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
            } catch (err) {
                console.warn(err);
            }
        }
    };

    useEffect(() => {
      checkPermissions();

      // Initialize notification channel on Android (must be done at startup)
      initializeNotificationChannel();

      // Restore study reminders from saved settings (needed after app rebuild)
      restoreStudyReminders();

      // Configure App Shortcuts (Long Press on App Icon)
      QuickActions.setItems([
        {
          title: 'Nouvelle Note',
          subtitle: 'Créer une note rapide',
          icon: 'compose',
          id: 'action_new_note',
          params: { href: '/(tabs)/notes?action=new' }
        },
        {
          title: 'Mofon\'aina',
          subtitle: 'Veille matinale du jour',
          icon: 'bookmark',
          id: 'action_mofonaina',
          params: { href: '/mofonaina' }
        },
        {
          title: 'Lecteur Audio',
          subtitle: 'Reprendre l\'écoute',
          icon: 'play',
          id: 'action_audio',
          params: { href: '/audio/player' }
        }
      ]);

      // Handle notification clicks
      const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.screen === 'sabbath-school' && data?.url) {
          router.replace(data.url as any);
        }
      });

      // Deep Linking Support for professional redirection (Fixes 'screen doesn't exist')
      const handleDeepLink = (url: string | null) => {
        if (!url) return;
        const { path } = Linking.parse(url);
        
        // Professional Redirection for Music
        // Handles both our custom adventools link AND the default trackplayer notification click
        if (
          path === 'audio/player' || 
          path === '/audio/player' || 
          path?.endsWith('audio/player') ||
          url.includes('trackplayer://notification.click')
        ) {
          router.replace('/audio/player' as any);
        }
      };

      Linking.getInitialURL().then(handleDeepLink);
      const linkingSubscription = Linking.addEventListener('url', (event) => handleDeepLink(event.url));

      const checkOnboarding = async () => {
      try {
        // Use getSetting from SQLite to check if onboarding is done
        let done = await getSetting<string | null>(ONBOARDING_KEY, null);
        
        // Fallback to AsyncStorage for robustness during transition
        if (!done) {
            done = await AsyncStorage.getItem(ONBOARDING_KEY);
        }

        if (!done) {
          // Navigate to onboarding — Stack is already mounted so router works
          setTimeout(() => {
            router.replace('/onboarding' as any);
          }, 1000); // Keep the increased delay for safety
        }
      } catch (_) {
        // On error, just proceed to (tabs) normally
      } finally {
        setChecking(false);
      }
    };

    if (!isLoading) {
        checkOnboarding();
    }
    return () => {
      subscription.remove();
      linkingSubscription.remove();
    };
  }, [isLoading]);

  if (checking) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#060d1f',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="utiles/lesona" options={{ headerShown: false }} />
      <Stack.Screen name="audio/player" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="weather/index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
