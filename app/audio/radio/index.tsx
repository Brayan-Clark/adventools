import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Radio as RadioIcon, WifiOff, PlayCircle, ListMusic } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import NetInfo from '@react-native-community/netinfo';
import { useSettings } from '../../../lib/settings-context';

interface RadioStation {
  id: string;
  name: string;
  description: string;
  logo: string;
  streamUrl: string;
  isActive: boolean;
  message?: string;
  type?: 'live' | 'podcast';
}

const RADIOS_URL = 'https://raw.githubusercontent.com/Brayan-Clark/adventools/data/audio/radios.json';

export default function RadioScreen() {
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  const fontFamily = globalSettings.fontFamily === 'System' ? 'Lexend_400Regular' : globalSettings.fontFamily;
  const fontFamilyBold = 'Lexend_700Bold';

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    setLoading(true);
    try {
      const networkState = await NetInfo.fetch();
      setIsConnected(networkState.isConnected);

      if (networkState.isConnected) {
        const response = await fetch(`${RADIOS_URL}?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          setStations(data.stations || []);
        }
      }
    } catch (error) {
      console.error('Failed to load stations', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStationPress = (station: RadioStation) => {
    if (!station.isActive) return;
    
    if (station.type === 'podcast') {
      router.push({
        pathname: '/audio/radio/[id]',
        params: {
          id: station.id,
          streamUrl: station.streamUrl,
          title: station.name
        }
      });
    } else {
      // Stream live radio
      router.push({
        pathname: '/audio/player',
        params: {
          title: station.name,
          url: station.streamUrl,
          isLocal: 'false',
          subtext: "En direct",
          artwork: station.logo
        }
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-4 border-b border-slate-800/50">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center p-0"
        >
          <ChevronLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        
        <View className="flex-1 items-center justify-center px-2">
          <Text className="text-white font-bold text-lg" style={{ fontFamily: fontFamilyBold }}>
            Radio & Podcasts
          </Text>
          {isConnected === false && (
            <View className="flex-row items-center mt-1">
              <WifiOff size={10} color="#ef4444" className="mr-1" />
              <Text className="text-red-500 text-[10px] uppercase font-bold tracking-wider">Hors ligne</Text>
            </View>
          )}
        </View>
        
        <View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center">
          <RadioIcon size={18} color="#3b82f6" />
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-slate-400 text-sm mb-6 leading-6" style={{ fontFamily }}>
          Écoutez vos stations préférées ou vos podcasts. Cette liste est mise à jour automatiquement depuis notre serveur.
        </Text>

        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-slate-400 mt-4" style={{ fontFamily }}>Chargement des données...</Text>
          </View>
        ) : !isConnected && stations.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Text className="text-slate-400" style={{ fontFamily }}>Connectez-vous à Internet pour télécharger la liste.</Text>
          </View>
        ) : stations.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Text className="text-slate-400" style={{ fontFamily }}>Aucune radio n'est disponible pour le moment.</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between pb-20">
            {stations.map((station) => (
              <TouchableOpacity 
                key={station.id} 
                onPress={() => handleStationPress(station)}
                activeOpacity={station.isActive ? 0.7 : 1}
                className="w-[30%] mb-6"
              >
                <View className="relative aspect-square w-full rounded-[20px] bg-slate-900 border border-slate-800 shadow-md overflow-hidden mb-2">
                  <Image 
                    source={{ uri: station.logo }} 
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  
                  {station.isActive && (
                    <View className="absolute bottom-1 right-1 bg-slate-950/80 p-1 rounded-full border border-slate-800/50">
                       {station.type === 'podcast' ? (
                         <ListMusic size={10} color="#a78bfa" />
                       ) : (
                         <PlayCircle size={10} color="#34d399" />
                       )}
                    </View>
                  )}

                  {!station.isActive && (
                    <View className="absolute inset-0 bg-slate-950/60 items-center justify-center p-1">
                       <Text className="text-white text-[8px] font-bold uppercase text-center" style={{ fontFamily: fontFamilyBold }}>
                         Soon
                       </Text>
                    </View>
                  )}
                </View>
                
                <View className="px-0.5">
                  <Text className="text-white font-bold text-[11px] mb-0.5" style={{ fontFamily: fontFamilyBold }} numberOfLines={1}>
                    {station.name}
                  </Text>
                  <View className="flex-row items-center">
                    <View className={`w-1.5 h-1.5 rounded-full ${station.isActive ? (station.type === 'live' ? 'bg-emerald-500' : 'bg-violet-500') : 'bg-slate-700'} mr-1`} />
                    <Text className="text-slate-500 text-[9px] uppercase font-bold tracking-tighter" style={{ fontFamily: fontFamilyBold }} numberOfLines={1}>
                      {station.type === 'podcast' ? 'EP' : 'LIVE'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {/* Fillers for alignment */}
            <View className="w-[30%]" />
            <View className="w-[30%]" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
