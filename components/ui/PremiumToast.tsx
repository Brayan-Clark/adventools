import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/ui/AppText';


export type ToastType = 'success' | 'error' | 'info';

interface PremiumToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onHide: () => void;
}

export const PremiumToast = ({ visible, message, type = 'success', onHide }: PremiumToastProps) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        hide();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      hide();
    }
  }, [visible]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
    ]).start(() => onHide());
  };

  if (!visible && opacity._value === 0) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} color="#10b981" />;
      case 'error': return <AlertCircle size={18} color="#ef4444" />;
      default: return <Info size={18} color="#3b82f6" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success': return 'border-emerald-500/30';
      case 'error': return 'border-red-500/30';
      default: return 'border-blue-500/30';
    }
  };

  return (
    <SafeAreaView style={styles.container} pointerEvents="none">
      <Animated.View 
        style={[
          styles.toast, 
          { opacity, transform: [{ translateY }] }
        ]}
        className={`bg-slate-900/95 backdrop-blur-xl border ${getBorderColor()} rounded-full px-6 py-3 flex-row items-center shadow-2xl`}
      >
        <View className="mr-3">
          {getIcon()}
        </View>
        <Text className="text-white text-sm font-medium" style={{ fontFamily: 'Lexend_400Regular' }}>
          {message}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    maxWidth: '90%',
  }
});
