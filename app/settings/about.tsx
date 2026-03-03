import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Github, Globe, Mail, Shield } from 'lucide-react-native';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-[#111621]">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/5">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
          <ChevronLeft size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>{t('about_title')}</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* App Info Hero */}
        <View className="items-center py-12 px-8">
          <View className="mb-6 items-center justify-center">
            <Image
              source={require('../../assets/images/Adventiste_logo_colored.png')}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />
          </View>
          <Text className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Lexend_700Bold' }}>Adventools</Text>
          <Text className="text-slate-500 font-medium tracking-widest uppercase text-[10px]">Version 1.0.0 (Stable)</Text>
        </View>

        {/* Mission Card */}
        <View className="px-6 mb-8">
          <View className="bg-white/5 border border-white/10 rounded-[32px] p-8">
            <View className="flex-row items-center mb-6">
              <View className="w-10 h-10 rounded-xl bg-blue-500/20 items-center justify-center mr-4">
                <Globe size={20} color="#3b82f6" />
              </View>
              <Text className="text-lg font-bold text-white">{t('our_mission')}</Text>
            </View>
            <Text className="text-slate-400 leading-7 text-sm">
              {t('mission_text')}
            </Text>
          </View>
        </View>

        {/* Features List */}
        <View className="px-6 mb-12">
          <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 ml-4">{t('team_contact')}</Text>

          <TouchableOpacity className="flex-row items-center bg-white/5 p-4 rounded-2xl mb-3 border border-white/5">
            <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center mr-4">
              <Github size={18} color="#94a3b8" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold">{t('open_source')}</Text>
              <Text className="text-xs text-slate-500">{t('github_contrib')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center bg-white/5 p-4 rounded-2xl mb-3 border border-white/5">
            <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center mr-4">
              <Mail size={18} color="#94a3b8" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold">{t('tech_support')}</Text>
              <Text className="text-xs text-slate-500">brayanraherinandrasana@gmail.com</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/settings/privacy')}
            className="flex-row items-center bg-white/5 p-4 rounded-2xl mb-3 border border-white/5"
          >
            <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center mr-4">
              <Shield size={18} color="#94a3b8" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold">{t('privacy_status')}</Text>
              <Text className="text-xs text-slate-500">{t('privacy_status_text')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="pb-20 px-8">
          <Text className="text-center text-slate-600 text-[10px] leading-5">
            {t('made_with_love')}{"\n"}
            {t('powered_by')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
