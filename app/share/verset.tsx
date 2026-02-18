import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions, Platform, Share, Alert, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, Download, Copy, Instagram, Twitter, Facebook, MessageCircle, X, Image as ImageIcon, Palette } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
// Use legacy import to avoid deprecation error
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';

// ... (Rest of imports or constants)

const GRADIENT_COLORS = [
  ['#0f172a', '#1e293b'] as const,
  ['#4f46e5', '#ec4899'] as const,
  ['#111827', '#374151'] as const,
  ['#2563eb', '#60a5fa'] as const,
  ['#d97706', '#fbbf24'] as const,
  ['#059669', '#34d399'] as const,
];

const PRESET_IMAGES = [
  require('../../assets/images/backgrounds/tree.png'),
  require('../../assets/images/backgrounds/sunset.jpg'),
];



export default function ShareVerse() {
  const { verseText, verseRef } = useLocalSearchParams();
  const router = useRouter();
  const [bgType, setBgType] = useState<'gradient' | 'image' | 'custom'>('gradient');
  const [selectedBg, setSelectedBg] = useState(0);
  const [selectedImg, setSelectedImg] = useState(0);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const cardRef = React.useRef(null);
  const [capturing, setCapturing] = useState(false);

  // Default text if none provided
  const text = verseText ? decodeURIComponent(verseText as string) : "Car Dieu a tant aimé le monde qu'il a donné son Fils unique...";
  const reference = verseRef ? decodeURIComponent(verseRef as string) : "Jean 3:16";

  const pickImage = async () => {
    Alert.alert(
      "Source de l'image",
      "Choisissez d'où provient votre image de fond",
      [
        {
          text: "Galerie",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission refusée', 'Désolé, nous avons besoin de la permission pour accéder à vos photos.');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });

            if (!result.canceled) {
              setCustomImage(result.assets[0].uri);
              setBgType('custom');
            }
          }
        },
        {
          text: "Appareil photo",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission refusée', 'Désolé, nous avons besoin de la permission pour accéder à votre appareil photo.');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });

            if (!result.canceled) {
              setCustomImage(result.assets[0].uri);
              setBgType('custom');
            }
          }
        },
        {
          text: "Annuler",
          style: "cancel"
        }
      ]
    );
  };

  const captureImage = async () => {
    if (cardRef.current) {
      try {
        const uri = await captureRef(cardRef, {
          format: 'png',
          quality: 1,
        });
        return uri;
      } catch (e) {
        console.error("Capture failed", e);
        return null;
      }
    }
    return null;
  };

  const handleShare = async (platform: string) => {
    if (capturing) return;
    setCapturing(true);

    try {
      // Capture image for all actions except maybe text copy if implemented separately, 
      // but user wants image for copy too.
      const uri = await captureImage();
      if (!uri) {
        Alert.alert('Erreur', 'Impossible de générer l\'image.');
        setCapturing(false);
        return;
      }

      switch (platform) {
        case 'copy':
          try {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            await Clipboard.setImageAsync(base64);
            Alert.alert('Copié !', 'L\'image a été copiée dans le presse-papiers.');
          } catch (e) {
            console.error("Copy failed", e);
            // Fallback to text if image copy fails
            await Clipboard.setStringAsync(`"${text}"\n\n— ${reference}`);
            Alert.alert('Copié (Texte)', 'La copie d\'image a échoué, le texte a été copié à la place.');
          }
          break;

        case 'save':
          try {
            await MediaLibrary.createAssetAsync(uri);
            Alert.alert('Enregistré !', 'L\'image a été enregistrée dans votre galerie.');
          } catch (e) {
            console.error("Save failed", e);
            // Fallback to sharing if save fails (often due to permission)
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(uri);
            } else {
              Alert.alert('Erreur', 'Impossible d\'enregistrer l\'image (Permission demandée).');
            }
          }
          break;

        default:
          // Share via native share sheet (Instagram, WhatsApp, etc. handles image sharing via this)
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/png',
              dialogTitle: 'Partager le verset',
              UTI: 'public.png'
            });
          } else {
            Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil.');
          }
          break;
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du partage.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center backdrop-blur-md">
          <X size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">Partager le verset</Text>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center shadow-lg shadow-blue-600/30">
          <Share2 size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Preview Card */}
        <View className="items-center justify-center py-8 px-6">
          <View
            ref={cardRef}
            collapsable={false}
            className="w-full aspect-square rounded-[32px] overflow-hidden shadow-2xl shadow-black/50 border border-white/10 relative"
          >
            {bgType === 'gradient' ? (
              <LinearGradient
                colors={GRADIENT_COLORS[selectedBg]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="flex-1 p-8 justify-center items-center"
              >
                {/* Decorative elements */}
                <View className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
                <View className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl -ml-6 -mb-6" />

                <View className="items-center">
                  <Text className="text-white text-center font-serif text-2xl leading-9 italic mb-6 shadow-sm" style={{ fontFamily: 'serif' }}>
                    "{text}"
                  </Text>
                  <View className="h-px w-12 bg-white/30 mb-6" />
                  <Text className="text-white/80 font-bold tracking-widest uppercase text-sm">
                    {reference}
                  </Text>
                </View>

                <View className="absolute bottom-6 flex-row items-center opacity-60">
                  <View className="w-4 h-4 rounded-full bg-white mr-2" />
                  <Text className="text-white text-[10px] font-bold">ADVENTOOLS</Text>
                </View>
              </LinearGradient>
            ) : (
              <ImageBackground
                source={bgType === 'custom' ? { uri: customImage! } : PRESET_IMAGES[selectedImg]}
                className="flex-1 p-8 justify-center items-center"
              >
                {/* Dark overlay for readability */}
                <View className="absolute inset-0 bg-black/40" />

                <View className="items-center relative z-10">
                  <Text className="text-white text-center font-serif text-2xl leading-9 italic mb-6 shadow-sm" style={{ fontFamily: 'serif' }}>
                    "{text}"
                  </Text>
                  <View className="h-px w-12 bg-white/30 mb-6" />
                  <Text className="text-white/80 font-bold tracking-widest uppercase text-sm">
                    {reference}
                  </Text>
                </View>

                <View className="absolute bottom-6 flex-row items-center opacity-60 z-10">
                  <View className="w-4 h-4 rounded-full bg-white mr-2" />
                  <Text className="text-white text-[10px] font-bold">ADVENTOOLS</Text>
                </View>
              </ImageBackground>
            )}
          </View>
        </View>

        {/* Customization Options */}
        <View className="px-6 mb-8">
          <View className="flex-row items-center mb-4 ml-1">
            <Palette size={14} color="#64748b" />
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-2">Couleurs</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2">
            {GRADIENT_COLORS.map((colors, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => { setBgType('gradient'); setSelectedBg(index); }}
                className={`w-14 h-14 rounded-xl mr-3 border-2 ${bgType === 'gradient' && selectedBg === index ? 'border-white scale-110' : 'border-transparent'} overflow-hidden shadow-lg`}
              >
                <LinearGradient colors={colors} className="flex-1" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="flex-row items-center mt-6 mb-4 ml-1">
            <ImageIcon size={14} color="#64748b" />
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-2">Images de fond</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2">
            <TouchableOpacity
              onPress={pickImage}
              className={`w-14 h-14 rounded-xl mr-3 border-2 border-dashed border-slate-600 bg-slate-800/50 items-center justify-center`}
            >
              <ImageIcon size={20} color="#94a3b8" />
            </TouchableOpacity>

            {PRESET_IMAGES.map((img, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => { setBgType('image'); setSelectedImg(index); }}
                className={`w-14 h-14 rounded-xl mr-3 border-2 ${bgType === 'image' && selectedImg === index ? 'border-white scale-110' : 'border-transparent'} overflow-hidden shadow-lg`}
              >
                <Image source={img} className="flex-1 w-full h-full" resizeMode="cover" />
              </TouchableOpacity>
            ))}

            {customImage && (
              <TouchableOpacity
                onPress={() => { setBgType('custom'); }}
                className={`w-14 h-14 rounded-xl mr-3 border-2 ${bgType === 'custom' ? 'border-white scale-110' : 'border-transparent'} overflow-hidden shadow-lg`}
              >
                <Image source={{ uri: customImage }} className="flex-1 w-full h-full" resizeMode="cover" />
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Share Actions */}
        <View className="px-6">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 ml-1">Partager sur</Text>
          <View className="flex-row justify-between mb-4">
            <TouchableOpacity onPress={() => handleShare('instagram')} className="flex-1 bg-slate-800/50 py-4 rounded-2xl items-center mr-2 border border-slate-700/50">
              <Instagram size={24} color="#e1306c" className="mb-2" />
              <Text className="text-slate-300 text-xs font-medium">Stories</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleShare('whatsapp')} className="flex-1 bg-slate-800/50 py-4 rounded-2xl items-center mx-2 border border-slate-700/50">
              <MessageCircle size={24} color="#25D366" className="mb-2" />
              <Text className="text-slate-300 text-xs font-medium">WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleShare('facebook')} className="flex-1 bg-slate-800/50 py-4 rounded-2xl items-center ml-2 border border-slate-700/50">
              <Facebook size={24} color="#1877F2" className="mb-2" />
              <Text className="text-slate-300 text-xs font-medium">Facebook</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row justify-between">
            <TouchableOpacity onPress={() => handleShare('copy')} className="flex-1 bg-slate-800/80 py-4 rounded-2xl items-center mr-2 flex-row justify-center gap-2">
              <Copy size={18} color="white" />
              <Text className="text-white text-sm font-bold">Copier</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleShare('save')} className="flex-1 bg-slate-800/80 py-4 rounded-2xl items-center ml-2 flex-row justify-center gap-2">
              <Download size={18} color="white" />
              <Text className="text-white text-sm font-bold">Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
