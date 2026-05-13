import React from 'react';
import { View, Text, ImageBackground, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Sunrise, ChevronRight } from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n';
import { Mofonaina } from '@/lib/mofonaina';

interface Props {
  data: Mofonaina | null;
}

export default function MofonainaWidget({ data }: Props) {
  const router = useRouter();
  const { t } = useTranslation();

  if (!data) return null;

  // Curated list of high-quality nature backgrounds for devotional feel
  const backgrounds = [
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=1000&auto=format&fit=crop',
  ];
  
  // Use a fixed background based on the date to avoid jumps
  const bgIndex = new Date(data.daty).getDate() % backgrounds.length;
  const backgroundImage = backgrounds[bgIndex];

  return (
    <TouchableOpacity
      onPress={() => router.push('/mofonaina' as any)}
      activeOpacity={0.9}
      className="mb-10 rounded-[35px] overflow-hidden border border-white/10 shadow-2xl h-56"
    >
      <ImageBackground
        source={{ uri: backgroundImage }}
        className="flex-1"
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.2)', 'rgba(15, 23, 42, 0.95)']}
          className="flex-1 p-6 justify-end"
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center px-3 py-1 bg-white/10 rounded-full border border-white/20">
              <Sunrise size={12} color="#fb923c" className="mr-2" />
              <Text className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">{t('fiambenana_maraina')}</Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
              <ChevronRight size={16} color="white" />
            </View>
          </View>

          <View>
            <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">
              {new Date(data.daty).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text className="text-white font-bold text-2xl leading-8 mb-3" style={{ fontFamily: 'Lexend_700Bold' }}>
              {data.lohateny_andro}
            </Text>
            
            <View className="flex-row items-center">
               <View className="h-[1px] flex-1 bg-white/20 mr-3" />
               <Text className="text-orange-400 text-xs font-bold" style={{ fontFamily: 'Lexend_600SemiBold' }}>
                 {data.toerana_soratra_masina}
               </Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}
