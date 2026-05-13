import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Music, FileText, StickyNote, Headphones, Tv, LayoutGrid, Bookmark } from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n';

export default function ShortcutsWidget() {
  const router = useRouter();
  const { t } = useTranslation();

  const shortcuts = [
    { icon: StickyNote, title: t('notes'), href: '/notes', color: '#10b981', bg: 'bg-emerald-500/10' },
    { icon: Headphones, title: 'Audio', href: '/audio', color: '#06b6d4', bg: 'bg-cyan-500/10' },
    { icon: BookOpen, title: t('bible'), href: '/bible', color: '#3b82f6', bg: 'bg-blue-500/10' },
    { icon: BookOpen, title: t('sabbath_school_lessons'), href: '/utiles/lesona', color: '#ef4444', bg: 'bg-red-500/10' },
  ];

  return (
    <View className="mb-10">
      <Text className="text-[10px] font-bold uppercase text-slate-500 mb-6 ml-1 tracking-widest">{t('tools')}</Text>
      <View className="flex-row justify-between">
        {shortcuts.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => router.push(item.href as any)}
            activeOpacity={0.7}
            className={`w-[22%] aspect-[0.7] rounded-[30px] bg-slate-900 border border-slate-800 items-center justify-center shadow-xl`}
          >
            <View className={`w-12 h-12 rounded-2xl ${item.bg} items-center justify-center mb-3`}>
              <item.icon size={24} color={item.color} />
            </View>
            <Text className="text-white text-[10px] font-bold text-center px-1" numberOfLines={1} style={{ fontFamily: 'Lexend_600SemiBold' }}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
