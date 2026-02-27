import { HymnDatabaseManager } from '@/components/hymnes/HymnDatabaseManager';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HymneStore() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <StatusBar style="light" />

      <View className="px-6 py-6 flex-row items-center justify-between border-b border-slate-800/50">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center">
            <ChevronLeft size={20} color="#94a3b8" />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>Boutique Hymnes</Text>
            <Text className="text-slate-500 text-xs mt-1">Recueils disponibles en ligne</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="pb-20">
          <HymnDatabaseManager />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
