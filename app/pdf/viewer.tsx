import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ZoomIn, ZoomOut } from 'lucide-react-native';
// Let's rely on standard lucide icons
import { AlertCircle } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import Constants from 'expo-constants'; // To detect Expo Go

// Conditional import to avoid crash on Expo Go immediate import
let Pdf: any;
try {
  Pdf = require('react-native-pdf').default;
} catch (e) {
  console.log("react-native-pdf not available");
}

const DOCUMENTS: Record<string, any> = {
  'HFM.pdf': require('../../assets/docs/HFM.pdf'),
  'IFM.pdf': require('../../assets/docs/Ilay Fitiavana Mandresy (IFM).pdf'),
};

export default function PdfViewer() {
  const { fileName, title } = useLocalSearchParams();
  const router = useRouter();
  const [source, setSource] = useState<{ uri: string, cache: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const isExpoGo = Constants.appOwnership === 'expo';

  useEffect(() => {
    async function preparePdf() {
      if (isExpoGo) {
        setLoading(false);
        return; // Don't try loading asset if native module missing
      }

      try {
        if (!fileName || typeof fileName !== 'string') {
          setError("Fichier non spécifié");
          return;
        }

        const assetModule = DOCUMENTS[fileName];
        if (!assetModule) {
          setError("Document introuvable: " + fileName);
          return;
        }

        const asset = Asset.fromModule(assetModule);
        await asset.downloadAsync();

        if (asset.localUri) {
          setSource({ uri: asset.localUri, cache: true });
        } else {
          const dest = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({ from: asset.uri, to: dest });
          setSource({ uri: dest, cache: true });
        }
      } catch (e) {
        console.error("Error loading PDF:", e);
        setError("Erreur chargement PDF");
      } finally {
        setLoading(false);
      }
    }
    preparePdf();
  }, [fileName]);

  if (isExpoGo) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center px-6">
        <StatusBar style="light" />
        <View className="bg-slate-900 p-8 rounded-3xl border border-slate-700 items-center">
          <AlertCircle size={48} color="#ef4444" className="mb-4" />
          <Text className="text-white font-bold text-xl mb-2 text-center">Module Natif Manquant</Text>
          <Text className="text-slate-400 text-center mb-6 leading-6">
            Le lecteur PDF utilise `react-native-pdf` qui est une librairie native. Elle ne fonctionne pas dans Expo Go standard.
          </Text>
          <Text className="text-slate-300 text-center font-bold mb-6 bg-slate-800 p-3 rounded-lg overflow-hidden">
            npx expo run:android
          </Text>
          <TouchableOpacity onPress={() => router.back()} className="bg-slate-700 w-full py-4 rounded-xl items-center">
            <Text className="text-white font-bold">Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-4 py-4 flex-row items-center justify-between bg-slate-900 border-b border-slate-800 z-10">
        <View className="flex-row items-center flex-1 mr-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
            <ArrowLeft size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg" numberOfLines={1}>{title || fileName}</Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={() => setScale(s => Math.min(s + 0.25, 3))} className="p-2 bg-slate-800 rounded-lg">
            <ZoomIn size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScale(s => Math.max(s - 0.25, 1))} className="p-2 bg-slate-800 rounded-lg">
            <ZoomOut size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 justify-center items-center bg-gray-900">
        {loading ? (
          <ActivityIndicator size="large" color="#195de6" />
        ) : error ? (
          <Text className="text-red-500">{error}</Text>
        ) : source && Pdf ? (
          <Pdf
            source={source}
            style={{ flex: 1, width: Dimensions.get('window').width }}
            scale={scale}
            minScale={1.0}
            maxScale={3.0}
            spacing={10}
            fitPolicy={0}
            enablePaging={false}
            onError={(error: any) => {
              console.error(error);
              setError("Erreur affichage PDF: " + error);
            }}
            trustAllCerts={false}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
