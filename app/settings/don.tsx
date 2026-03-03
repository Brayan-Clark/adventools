import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Copy, ExternalLink, Facebook, Heart, Landmark, Mail, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DonateScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleFacebook = () => {
    Linking.openURL('https://facebook.com/adventools');
  };

  const handleMail = () => {
    Linking.openURL('mailto:contact@adventools.com');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/5">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
          <ChevronLeft size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>{t('support_project')}</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-8 pt-12 pb-20">

          {/* Visual Hero */}
          <View className="items-center mb-12">
            <View className="relative">
              <View className="w-24 h-24 bg-red-500/10 rounded-[35px] items-center justify-center border border-red-500/20">
                <Heart size={48} color="#ef4444" fill="#ef4444" />
              </View>
              <View className="absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full items-center justify-center shadow-lg border-2 border-[#0f172a]">
                <Sparkles size={14} color="white" />
              </View>
            </View>
            <Text className="text-2xl font-bold text-white mt-6 text-center" style={{ fontFamily: 'Lexend_700Bold' }}>
              {t('contribution_diff')}
            </Text>
          </View>

          {/* Core Message Card */}
          <View className="bg-white/5 border border-white/10 rounded-[40px] p-8 mb-8 shadow-2xl">
            <Text className="text-slate-300 text-center leading-7 text-base mb-6" style={{ fontFamily: 'Lexend_400Regular' }}>
              {t('passion_dedication')}
            </Text>

            <View className="h-[1px] w-12 bg-white/10 mx-auto mb-6" />

            <Text className="text-slate-400 text-center leading-7 text-sm italic" style={{ fontFamily: 'Lexend_400Regular' }}>
              "{t('small_gesture')}"
            </Text>
          </View>

          {/* Action Links */}
          <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-4 ml-4">{t('support_methods')}</Text>

          <View className="bg-white/5 border border-white/10 rounded-[32px] p-6 mb-4">
            <View className="flex-row items-center mb-6">
              <View className="w-12 h-12 rounded-2xl bg-amber-500/10 items-center justify-center mr-4">
                <Landmark size={24} color="#f59e0b" />
              </View>
              <View>
                <Text className="text-white font-bold text-lg">{t('mobile_money')}</Text>
                <Text className="text-slate-500 text-xs">{t('madagascar_transfer')}</Text>
              </View>
            </View>

            <View className="gap-3">
              <TouchableOpacity
                onPress={() => Alert.alert("Mvola", "+261 34 37 395 28")}
                className="flex-row items-center bg-slate-800/50 p-4 rounded-2xl border border-white/5"
              >
                <View className="w-8 h-8 rounded-full bg-yellow-400 items-center justify-center mr-3">
                  <Text className="text-[10px] font-bold text-black">M</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm">Mvola</Text>
                  <Text className="text-slate-400 text-xs">+261 34 37 395 28</Text>
                </View>
                <Copy size={16} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Alert.alert("Orange Money", "+261 32 88 942 01")}
                className="flex-row items-center bg-slate-800/50 p-4 rounded-2xl border border-white/5"
              >
                <View className="w-8 h-8 rounded-full bg-orange-500 items-center justify-center mr-3">
                  <Text className="text-[10px] font-bold text-white">O</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm">Orange Money</Text>
                  <Text className="text-slate-400 text-xs">+261 32 88 942 01</Text>
                </View>
                <Copy size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            className="flex-row items-center bg-primary p-5 rounded-3xl mb-4 shadow-xl shadow-primary/20"
            onPress={() => Alert.alert(t('online_payment'), "Lien de paiement en ligne bientôt disponible.")}
          >
            <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center mr-4">
              <Heart size={24} color="white" fill="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">{t('online_payment')}</Text>
              <Text className="text-blue-100/60 text-xs">{t('payment_methods')}</Text>
            </View>
            <ExternalLink size={20} color="white" opacity={0.5} />
          </TouchableOpacity>

          <View className="flex-row gap-4">
            <TouchableOpacity
              className="flex-1 flex-row items-center bg-white/5 p-4 rounded-3xl border border-white/5"
              onPress={handleFacebook}
            >
              <View className="w-10 h-10 rounded-2xl bg-blue-600/20 items-center justify-center mr-3">
                <Facebook size={20} color="#3b82f6" />
              </View>
              <Text className="text-white font-bold text-sm">{t('follow_us')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 flex-row items-center bg-white/5 p-4 rounded-3xl border border-white/5"
              onPress={handleMail}
            >
              <View className="w-10 h-10 rounded-2xl bg-slate-800 items-center justify-center mr-3">
                <Mail size={20} color="#94a3b8" />
              </View>
              <Text className="text-white font-bold text-sm">Email</Text>
            </TouchableOpacity>
          </View>

          <View className="mt-12 items-center">
            <Text className="text-slate-600 text-[10px] font-bold uppercase tracking-widest text-center">
              {t('thank_you')}{"\n"}{t('generosity_future')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
