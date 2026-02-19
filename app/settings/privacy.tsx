import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Eye, Lock, Server, Shield } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#111621]">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/5">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
          <ChevronLeft size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>Confidentialité</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-8 pt-12 pb-20">

          <View className="items-center mb-10">
            <View className="w-20 h-20 bg-emerald-500/10 rounded-[25px] items-center justify-center border border-emerald-500/20 mb-6">
              <Shield size={40} color="#10b981" />
            </View>
            <Text className="text-2xl font-bold text-white text-center" style={{ fontFamily: 'Lexend_700Bold' }}>
              Votre vie privée est notre priorité.
            </Text>
          </View>

          <View className="bg-white/5 border border-white/10 rounded-[32px] p-6 mb-8">
            <View className="flex-row items-start mb-6">
              <View className="w-10 h-10 rounded-xl bg-blue-500/20 items-center justify-center mr-4">
                <Lock size={20} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold mb-2">Données Locales</Text>
                <Text className="text-slate-400 text-sm leading-6">
                  Toutes vos données (notes, préférences, historique, surbrillages) sont stockées exclusivement sur votre appareil.
                  Nous n'utilisons aucun serveur centralisé pour stocker vos informations personnelles.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start mb-6">
              <View className="w-10 h-10 rounded-xl bg-purple-500/20 items-center justify-center mr-4">
                <Eye size={20} color="#a855f7" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold mb-2">Zéro Collecte</Text>
                <Text className="text-slate-400 text-sm leading-6">
                  Adventools ne collecte aucune donnée analytique ou publicitaire. Nous ne savons pas ce que vous lisez ni quand vous l'utilisez.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="w-10 h-10 rounded-xl bg-amber-500/20 items-center justify-center mr-4">
                <Server size={20} color="#f59e0b" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold mb-2">Services Tiers</Text>
                <Text className="text-slate-400 text-sm leading-6">
                  L'application charge le manifeste des documents depuis GitHub pour rester à jour, mais aucune information identifiable ne leur est envoyée.
                </Text>
              </View>
            </View>
          </View>

          <View className="bg-white/5 border border-white/10 rounded-[32px] p-8">
            <Text className="text-white font-bold mb-4">Engagement</Text>
            <Text className="text-slate-400 text-sm leading-7">
              Nous croyons que la lecture de la Parole de Dieu est un moment sacré et privé.
              Cet outil est conçu pour respecter cette intimité tout en offrant une expérience moderne.
            </Text>
          </View>

          <View className="mt-12 items-center">
            <Text className="text-slate-600 text-[10px] font-bold uppercase tracking-widest text-center">
              Dernière mise à jour : Février 2026
            </Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
