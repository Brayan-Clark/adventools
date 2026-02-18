import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Facebook, Mail, ChevronLeft, Info, ExternalLink, Sparkles, Landmark } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function DonateScreen() {
  const router = useRouter();

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
        <Text className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Lexend_700Bold' }}>Soutenir le Projet</Text>
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
              Votre contribution fait la différence !
            </Text>
          </View>

          {/* Core Message Card */}
          <View className="bg-white/5 border border-white/10 rounded-[40px] p-8 mb-8 shadow-2xl">
            <Text className="text-slate-300 text-center leading-7 text-base mb-6" style={{ fontFamily: 'Lexend_400Regular' }}>
              Notre application mobile est le fruit de notre passion et de notre dévouement.
              Nous travaillons dur pour améliorer votre expérience et vous offrir des fonctionnalités exceptionnelles.
            </Text>

            <View className="h-[1px] w-12 bg-white/10 mx-auto mb-6" />

            <Text className="text-slate-400 text-center leading-7 text-sm italic" style={{ fontFamily: 'Lexend_400Regular' }}>
              "Chaque petit geste compte ! Votre don, aussi modeste soit-il, nous aidera à continuer à développer l'application,
              à ajouter de nouvelles fonctionnalités et à fournir un service de qualité."
            </Text>
          </View>

          {/* Action Links */}
          <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-4 ml-4">Moyens de soutien</Text>

          <TouchableOpacity
            className="flex-row items-center bg-primary p-5 rounded-3xl mb-4 shadow-xl shadow-primary/20"
            onPress={() => alert("Lien de paiement à configurer.")}
          >
            <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center mr-4">
              <Heart size={24} color="white" fill="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">Faire un Don</Text>
              <Text className="text-blue-100/60 text-xs">Soutenir le développement</Text>
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
              <Text className="text-white font-bold text-sm">Suivre</Text>
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
              Merci pour votre générosité.{"\n"}Ensemble, nous façonnons l'avenir.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
