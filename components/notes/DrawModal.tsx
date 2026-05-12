/**
 * US-10: DrawModal — Extracted from notes.tsx for maintainability.
 * Full-screen drawing canvas modal with color picker, eraser and undo.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, ScrollView, Text, TouchableOpacity, View, Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { Check, Edit, Eraser, Trash2, Undo2, X } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { saveFilePermanently } from '@/lib/utils';

interface DrawModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (uri: string) => void;
  initialUri?: string;
}

export const DrawModal = ({ visible, onClose, onSave, initialUri }: DrawModalProps) => {
  const [paths, setPaths] = useState<Array<{ d: string; color: string; width: number }>>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [color, setColor] = useState('#000000');
  const [width, setWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const viewShotRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setPaths([]);
      setCurrentPath('');
      setIsEraser(false);
    }
  }, [visible]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(`M${locationX},${locationY}`);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(prev => `${prev} L${locationX},${locationY}`);
    },
    onPanResponderRelease: () => {
      if (currentPath) {
        setPaths(prev => [...prev, { d: currentPath, color: isEraser ? '#FFFFFF' : color, width: isEraser ? width * 2 : width }]);
        setCurrentPath('');
      }
    },
  });

  const handleSave = async () => {
    if (viewShotRef.current) {
      try {
        const uri = await viewShotRef.current.capture();
        const permanentUri = await saveFilePermanently(uri, 'image');
        onSave(permanentUri);
      } catch (e) {
        console.error("Capture failed", e);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-slate-950">
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-white/5 bg-slate-900">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
            <X size={20} color="#94a3b8" />
          </TouchableOpacity>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity onPress={() => setPaths([])} className="w-8 h-8 items-center justify-center">
              <Trash2 size={20} color="#475569" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} className="w-8 h-8 items-center justify-center">
              <Check size={20} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>

        <ViewShot ref={viewShotRef} style={{ flex: 1, backgroundColor: '#020617' }} options={{ format: "jpg", quality: 0.9 }}>
          <View className="flex-1" {...panResponder.panHandlers}>
            {initialUri && (
              <RNImage source={{ uri: initialUri }} className="absolute inset-0 w-full h-full opacity-40" resizeMode="contain" />
            )}
            <Svg className="flex-1">
              {paths.map((p, i) => <Path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
              {currentPath ? <Path d={currentPath} stroke={isEraser ? '#020617' : (color === '#000000' ? '#FFFFFF' : color)} strokeWidth={isEraser ? width * 2 : width} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
            </Svg>
          </View>
        </ViewShot>

        <View className="bg-slate-900 border-t border-white/5 p-6 pb-12">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#FFFFFF', '#64748b'].map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => {
                  setColor(c);
                  setIsEraser(false);
                }}
                style={{ backgroundColor: c, opacity: color === c && !isEraser ? 1 : 0.4 }}
                className={cn("w-10 h-10 rounded-full mr-4 shadow-sm", color === c && !isEraser ? "border-2 border-white" : "border border-white/10")}
              />
            ))}
          </ScrollView>
          <View className="flex-row justify-between items-center">
            <View className="flex-row gap-6 items-center">
              <TouchableOpacity onPress={() => setIsEraser(false)} className={cn("p-2 rounded-xl", !isEraser ? "bg-white/10" : "")}>
                <Edit size={24} color={!isEraser ? "#3b82f6" : "#475569"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsEraser(true)} className={cn("p-2 rounded-xl", isEraser ? "bg-white/10" : "")}>
                <Eraser size={24} color={isEraser ? "#ef4444" : "#475569"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPaths(paths.slice(0, -1))} className="p-2">
                <Undo2 size={24} color="#475569" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center bg-white/5 px-4 py-2 rounded-3xl border border-white/5">
              <TouchableOpacity onPress={() => setWidth(Math.max(1, width - 1))} className="p-2">
                <Text className="text-white/60 font-bold">-</Text>
              </TouchableOpacity>
              <Text className="text-white font-bold w-6 text-center">{width}</Text>
              <TouchableOpacity onPress={() => setWidth(Math.min(20, width + 1))} className="p-2">
                <Text className="text-white/60 font-bold">+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
