import { useColorScheme } from '@/components/useColorScheme';
import { useTranslation } from '@/lib/i18n';
import { Tabs } from 'expo-router';
import { BookOpen, FileText, Home, Music, StickyNote } from 'lucide-react-native';
import React from 'react';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#195de6',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#111621',
          borderTopColor: '#1e293b',
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Lexend_600SemiBold',
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
