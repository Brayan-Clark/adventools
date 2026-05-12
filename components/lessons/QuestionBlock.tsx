import React, { useState, useEffect } from 'react';
import { View, TextInput, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '@/lib/i18n';
import { getLessonNote, saveLessonNote } from '@/lib/user-storage';

interface QuestionBlockProps {
  block: any;
  content: React.ReactNode;
  lessonId: string;
}

const QuestionBlock = ({ block, content, lessonId }: QuestionBlockProps) => {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const saveTimeout = React.useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const loadNote = async () => {
      // 1. Try to load from new unified secure storage
      let val = await getLessonNote(lessonId, block.id);
      
      // 2. Migration: If not found, try old AsyncStorage
      if (!val) {
        const legacyKey = `adventools_note_${lessonId}_${block.id}`;
        const legacyVal = await AsyncStorage.getItem(legacyKey);
        if (legacyVal) {
          val = legacyVal;
          // Migrate immediately to secure storage
          await saveLessonNote(lessonId, block.id, legacyVal);
          // Clean up old storage
          await AsyncStorage.removeItem(legacyKey);
        }
      }
      
      if (val) setNote(val);
    };
    
    loadNote();
  }, [lessonId, block.id]);

  const saveNote = (text: string) => {
    setNote(text);
    setIsSaved(false);

    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(async () => {
      try {
        await saveLessonNote(lessonId, block.id, text);
        setIsSaved(true);
        
        setTimeout(() => {
          setIsSaved(false);
        }, 3000);
      } catch (e) {
        console.error("Save note error", e);
      }
    }, 800);
  };

  return (
    <View className="my-6 bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden p-1 shadow-lg shadow-black/20">
      <View className="p-4 mb-2 bg-slate-800/50 rounded-xl">
        {content}
      </View>
      <View className="px-1 pb-1 relative">
        <TextInput
          className="bg-slate-900 text-white p-4 pt-4 rounded-xl border border-white/5"
          placeholder={"Écrivez vos notes ici..."}
          placeholderTextColor="#475569"
          multiline
          textAlignVertical="top"
          value={note}
          onChangeText={saveNote}
          style={{ fontFamily: 'Lexend_400Regular', minHeight: 120 }}
        />
        {isSaved && (
          <View className="absolute bottom-4 right-4 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
            <Text className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest">{'Enregistré'}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default QuestionBlock;
