import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useSettings } from '@/lib/settings-context';

export interface AppTextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label';
}

export const AppText = React.forwardRef<RNText, AppTextProps>(({ style, variant, ...props }, ref) => {
  const { settings } = useSettings();
  
  const baseSize = settings?.fontSize || 18;
  const globalFontFamily = settings?.fontFamily === 'System' ? undefined : settings?.fontFamily;
  const globalLineHeight = settings?.lineHeight || 1.5;
  const globalLetterSpacing = settings?.letterSpacing || 0;

  const flattenedStyle = StyleSheet.flatten(style) || {};
  
  // Try to detect original size from style or className
  let originalSize: number | undefined = flattenedStyle.fontSize;
  const cls = props.className || '';
  if (!originalSize) {
    if (cls.includes('text-[9px]')) originalSize = 9;
    else if (cls.includes('text-[10px]')) originalSize = 10;
    else if (cls.includes('text-xs')) originalSize = 12;
    else if (cls.includes('text-sm')) originalSize = 14;
    else if (cls.includes('text-base')) originalSize = 16;
    else if (cls.includes('text-lg')) originalSize = 18;
    else if (cls.includes('text-xl')) originalSize = 20;
    else if (cls.includes('text-2xl')) originalSize = 24;
    else if (cls.includes('text-3xl')) originalSize = 30;
    else if (cls.includes('text-4xl')) originalSize = 36;
  }
  
  // 1. Calculate Font Size
  let computedFontSize: number | undefined = undefined;
  
  if (variant) {
    switch (variant) {
      case 'h1': computedFontSize = baseSize * 1.5; break;
      case 'h2': computedFontSize = baseSize * 1.3; break;
      case 'h3': computedFontSize = baseSize * 1.15; break;
      case 'h4': computedFontSize = baseSize * 1.05; break;
      case 'body': computedFontSize = baseSize; break;
      case 'caption': computedFontSize = baseSize * 0.85; break;
      case 'label': computedFontSize = baseSize * 0.75; break;
    }
  } else if (originalSize) {
    // Do not scale text if it is 14px or smaller to prevent breaking badges/UI pills
    if (originalSize <= 14) {
        computedFontSize = originalSize;
    } else {
        const scaleFactor = baseSize / 16;
        // Dampen the scale for UI elements so they don't get too big
        const dampenedScale = 1 + (scaleFactor - 1) * 0.4;
        const finalScale = Math.min(dampenedScale, 1.25); 
        computedFontSize = originalSize * finalScale;
    }
  }

  // 2. Calculate Line Height
  let computedLineHeight: number | undefined = undefined;
  if (computedFontSize) {
      computedLineHeight = computedFontSize * globalLineHeight;
  }
  
  if (flattenedStyle.lineHeight && !variant) {
      if (originalSize && originalSize <= 14) {
          computedLineHeight = flattenedStyle.lineHeight;
      } else {
          const scaleFactor = baseSize / 16;
          const dampenedScale = 1 + (scaleFactor - 1) * 0.4;
          const finalScale = Math.min(dampenedScale, 1.25);
          computedLineHeight = flattenedStyle.lineHeight * finalScale;
      }
  }

  // 3. Determine Font Family
  let computedFontFamily = flattenedStyle.fontFamily;
  if (globalFontFamily) {
    computedFontFamily = globalFontFamily;
  } else if (!computedFontFamily) {
    const isBold = flattenedStyle.fontWeight === 'bold' || flattenedStyle.fontWeight === '700' || cls.includes('font-bold');
    const isMedium = flattenedStyle.fontWeight === '500' || flattenedStyle.fontWeight === '600' || cls.includes('font-medium');
    computedFontFamily = isBold ? 'Lexend_700Bold' : isMedium ? 'Lexend_500Medium' : 'Lexend_400Regular';
  }

  const dynamicStyle: any = {
    letterSpacing: globalLetterSpacing,
    fontFamily: computedFontFamily,
  };

  // Only inject fontSize and lineHeight if we computed them, to avoid overriding Tailwind defaults unnecessarily
  if (computedFontSize !== undefined) dynamicStyle.fontSize = computedFontSize;
  if (computedLineHeight !== undefined) dynamicStyle.lineHeight = computedLineHeight;

  // Critical fix for Android: If a custom font is selected, remove fontWeight AND fontStyle
  if (globalFontFamily) {
      dynamicStyle.fontWeight = 'normal';
      dynamicStyle.fontStyle = 'normal';
  }

  return <RNText ref={ref} style={[style, dynamicStyle]} {...props} />;
});

AppText.displayName = 'AppText';
