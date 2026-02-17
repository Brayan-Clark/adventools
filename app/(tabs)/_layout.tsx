import React from 'react';
import { Tabs } from 'expo-router';
import { Home, BookOpen, Music, FileText, StickyNote } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
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
          title: 'Accueil',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: 'Bible',
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="hymnes"
        options={{
          title: 'Hymnes',
          tabBarIcon: ({ color }) => <Music size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pdf"
        options={{
          title: 'PDF',
          tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
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
