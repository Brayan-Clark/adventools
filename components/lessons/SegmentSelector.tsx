import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { parseDate } from '@/lib/utils';
import { AppText as Text } from '@/components/ui/AppText';
import { Check } from 'lucide-react-native';

interface SegmentSelectorProps {
  segments: any[];
  activeSegmentIdx: number;
  onSelectSegment: (index: number) => void;
  cleanTitle: (title: string) => string;
  lang?: string;
  completedDays?: Record<string, boolean>;
  quarterlyId?: string;
  lessonId?: string;
}

const DAYS: Record<string, string[]> = {
  mg: ['Alahady', 'Alatsinainy', 'Talata', 'Alarobia', 'Alakamisy', 'Zoma', 'Sabata'],
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Sabbat'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sabbath'],
};

const SegmentSelector = ({ 
  segments, 
  activeSegmentIdx, 
  onSelectSegment, 
  cleanTitle, 
  lang = 'mg',
  completedDays = {},
  quarterlyId = '',
  lessonId = ''
}: SegmentSelectorProps) => {
  const dayNames = DAYS[lang] || DAYS['en'];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row px-4">
      {segments.map((s, idx) => {
        const isSelected = idx === activeSegmentIdx;
        const dayKey = `${quarterlyId}_${lessonId}_${idx}`;
        const isCompleted = !!completedDays[dayKey];
        
        let dayLabel = "";
        if (s.date) {
          const dateObj = parseDate(s.date);
          const dayIdx = dateObj.getDay(); // 0 = Sunday, 1 = Monday...
          dayLabel = dayNames[dayIdx];
        } else {
          // Fallback if no date: Use heuristics or generic labels
          if (idx === 0) dayLabel = lang === 'mg' ? 'Fampidirana' : (lang === 'fr' ? 'Introduction' : 'Intro');
          else dayLabel = `P. ${idx + 1}`;
        }
        
        return (
          <TouchableOpacity
            key={s.id || idx}
            onPress={() => onSelectSegment(idx)}
            className={`px-6 py-2.5 rounded-2xl mr-3 border items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'bg-slate-900 border-slate-800'}`}
          >
            <Text className={`text-[8px] font-bold uppercase tracking-tighter mb-0.5 ${isSelected ? 'text-white/60' : 'text-slate-500'}`}>
              {dayLabel}
            </Text>
            <View className="flex-row items-center justify-center">
              <Text className={`font-bold text-[11px] ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                {cleanTitle(s.title).toUpperCase()}
              </Text>
              {isCompleted && (
                <View className={`ml-1.5 rounded-full p-0.5 ${isSelected ? 'bg-white/20' : 'bg-emerald-500/20'}`}>
                  <Check size={8} color={isSelected ? "#ffffff" : "#10b981"} strokeWidth={3} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

export default SegmentSelector;
