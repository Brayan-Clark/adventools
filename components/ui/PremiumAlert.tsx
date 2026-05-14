/**
 * PremiumAlert — A beautiful, dark-themed replacement for standard Alert.alert.
 * Supports success, error, and info types with micro-animations.
 */
import React from 'react';
import { Modal, TouchableOpacity, View, StyleSheet } from 'react-native';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';


export type AlertType = 'success' | 'error' | 'info';

interface PremiumAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  onClose: () => void;
  onConfirm?: () => void; // New: optional confirmation action
  confirmText?: string;
  cancelText?: string;   // New: optional cancel text
}

export const PremiumAlert = ({ 
  visible, 
  title, 
  message, 
  type = 'info', 
  onClose,
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Annuler'
}: PremiumAlertProps) => {
  
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 size={32} color="#10b981" />;
      case 'error': return <AlertCircle size={32} color="#ef4444" />;
      default: return <Info size={32} color="#3b82f6" />;
    }
  };

  const getAccentColor = () => {
    switch (type) {
      case 'success': return 'bg-emerald-500/20';
      case 'error': return 'bg-red-500/20';
      default: return 'bg-blue-500/20';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={onClose} 
          style={styles.dismissArea} 
        />
        
        <View className="w-[85%] bg-slate-900 rounded-[40px] border border-white/10 p-8 shadow-2xl items-center">
          <View className={`w-16 h-16 rounded-3xl ${getAccentColor()} items-center justify-center mb-6`}>
            {getIcon()}
          </View>
          
          <Text className="text-white text-xl font-bold mb-3 text-center" style={{ fontFamily: 'Lexend_700Bold' }}>
            {title}
          </Text>
          
          <Text className="text-slate-400 text-sm leading-6 text-center mb-8" style={{ fontFamily: 'Lexend_400Regular' }}>
            {message}
          </Text>
          
          <View className="w-full flex-row gap-3">
            {onConfirm && (
              <TouchableOpacity 
                onPress={onClose}
                className="flex-1 bg-white/5 border border-white/10 py-4 rounded-2xl items-center"
              >
                <Text className="text-slate-400 font-bold" style={{ fontFamily: 'Lexend_600SemiBold' }}>
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              onPress={onConfirm ? handleConfirm : onClose}
              className={`flex-1 ${type === 'error' ? 'bg-red-500' : 'bg-white/10'} py-4 rounded-2xl items-center`}
            >
              <Text className="text-white font-bold" style={{ fontFamily: 'Lexend_600SemiBold' }}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  }
});
