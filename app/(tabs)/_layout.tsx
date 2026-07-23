import { useSettings } from '@/lib/settings-context';
import { useColorScheme } from '@/components/useColorScheme';
import { useTranslation } from '@/lib/i18n';
import { Tabs } from 'expo-router';
import { BookOpen, FileText, Home, Music, StickyNote } from 'lucide-react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();

  let tabFont = 'Lexend_600SemiBold';
  if (settings.fontFamily !== 'System') {
    if (settings.fontFamily === 'Inter_400Regular') tabFont = 'Inter_600SemiBold';
    else if (settings.fontFamily === 'Poppins_400Regular') tabFont = 'Poppins_600SemiBold';
    else if (settings.fontFamily === 'Lora_400Regular') tabFont = 'Lora_600SemiBold';
    else tabFont = settings.fontFamily;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#195de6',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#111621',
          borderTopColor: '#1e293b',
          // Add the system navigation bar inset so the tab bar is never
          // hidden behind gesture/3-button navigation (tablets included)
          height: 60 + insets.bottom,
          paddingBottom: Math.max(10, insets.bottom),
          paddingTop: 5,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: tabFont,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: t('bible'),
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="hymnes"
        options={{
          title: t('hymns'),
          tabBarIcon: ({ color }) => <Music size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pdf"
        options={{
          title: t('books'),
          tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: t('notes'),
          tabBarIcon: ({ color }) => <StickyNote size={24} color={color} />,
        }}
      />
      {/* Hide the old tab two */}
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
