/**
 * PremiumDatePicker — A beautiful, custom dark-themed date selector.
 * Replaces the system date picker to ensure 100% theme consistency.
 */
import React, { useState } from 'react';
import { Modal, TouchableOpacity, View, StyleSheet, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';


interface PremiumDatePickerProps {
  visible: boolean;
  currentDate: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
}

export const PremiumDatePicker = ({ 
  visible, 
  currentDate, 
  onClose,
  onSelect
}: PremiumDatePickerProps) => {
  const [viewDate, setViewDate] = useState(new Date(currentDate));
  
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const handlePrevMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() - 1);
    setViewDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + 1);
    setViewDate(newDate);
  };

  const renderDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    
    const days = [];
    
    // Fill empty slots for previous month days
    for (let i = 0; i < startDay; i++) {
      days.push(<View key={`empty-${i}`} className="w-[14%] h-12 items-center justify-center" />);
    }
    
    for (let d = 1; d <= totalDays; d++) {
      const isSelected = d === currentDate.getDate() && 
                         month === currentDate.getMonth() && 
                         year === currentDate.getFullYear();
      
      const isToday = d === new Date().getDate() && 
                      month === new Date().getMonth() && 
                      year === new Date().getFullYear();

      days.push(
        <TouchableOpacity 
          key={d}
          onPress={() => {
            const selected = new Date(year, month, d);
            onSelect(selected);
          }}
          className={`w-[14%] h-12 items-center justify-center rounded-2xl ${isSelected ? 'bg-primary shadow-lg shadow-primary/30' : ''}`}
        >
          <Text className={`font-bold ${isSelected ? 'text-white' : isToday ? 'text-primary' : 'text-slate-300'}`}>
            {d}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return days;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={onClose} 
          style={styles.dismissArea} 
        />
        
        <View className="w-[90%] bg-slate-900 rounded-[40px] border border-white/10 p-6 shadow-2xl">
          <View className="flex-row justify-between items-center mb-6 px-2">
            <View>
              <Text className="text-white text-xl font-bold" style={{ fontFamily: 'Lexend_700Bold' }}>
                {months[viewDate.getMonth()]}
              </Text>
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-0.5">
                {viewDate.getFullYear()}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={handlePrevMonth} className="w-10 h-10 rounded-xl bg-white/5 items-center justify-center border border-white/5">
                <ChevronLeft size={20} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} className="w-10 h-10 rounded-xl bg-white/5 items-center justify-center border border-white/5">
                <ChevronRight size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View className="flex-row justify-between mb-4 px-2">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
              <Text key={`${d}-${i}`} className="text-slate-600 font-bold text-[10px] w-[14%] text-center">{d}</Text>
            ))}
          </View>
          
          <View className="flex-row flex-wrap">
            {renderDays()}
          </View>
          
          <TouchableOpacity 
            onPress={onClose}
            className="mt-8 bg-slate-800 py-4 rounded-2xl items-center"
          >
            <Text className="text-slate-400 font-bold">Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  }
});
