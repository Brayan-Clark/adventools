import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, OverlapWidget } from 'react-native-android-widget';

interface MofonainaWidgetProps {
  title: string;
  verse: string;
  reference: string;
  backgroundImage?: string;
  widgetWidth?: number;
  widgetHeight?: number;
  fontSizeMultiplier?: number;
}

export function MofonainaWidget({ title, verse, reference, backgroundImage, widgetWidth = 800, widgetHeight = 800, fontSizeMultiplier = 1 }: MofonainaWidgetProps) {
  const dateStr = new Date().toLocaleDateString('mg-MG', { weekday: 'long', day: 'numeric', month: 'long' });
  
  // Calculate a size large enough to cover the widget while maintaining aspect ratio
  // If the widget is wide, use width for both to ensure it covers height too (square crop basically)
  const maxDim = Math.max(widgetWidth, widgetHeight) * 1.5; // Multiply by 1.5 to ensure full bleed coverage

  return (
    <OverlapWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 24,
        backgroundColor: '#000000',
      }}
    >
      {/* 1. Background image - Full Coverage */}
      <ImageWidget
        image={backgroundImage || require('../assets/images/mofonaina_bg.jpg')}
        imageWidth={maxDim}
        imageHeight={maxDim}
        style={{
          width: 'match_parent',
          height: 'match_parent',
          borderRadius: 24,
        }}
      />

      {/* 2. Content Layer with dark overlay */}
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'adventools://mofonaina' }}
        style={{
          width: 'match_parent',
          height: 'match_parent',
          padding: 20,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#00000095',
          borderRadius: 24,
        }}
      >
        <TextWidget
          text={dateStr.toUpperCase()}
          style={{
            fontSize: 9 * fontSizeMultiplier,
            color: '#fb923c',
            fontWeight: 'bold',
            marginBottom: 8,
            letterSpacing: 1,
            textAlign: 'center',
          }}
        />

        <TextWidget
          text={title || "Mofon'aina"}
          style={{
            fontSize: 18 * fontSizeMultiplier,
            color: '#ffffff',
            fontWeight: 'bold',
            marginBottom: 12,
            textAlign: 'center',
            maxLines: 2,
          }}
        />

        <TextWidget
          text={verse || "Sokafy ny fampiharana mba hamakiana ny tenin'Andriamanitra anio."}
          style={{
            fontSize: 12 * fontSizeMultiplier,
            color: '#e2e8f0',
            textAlign: 'center',
            marginBottom: 12,
            maxLines: 4,
          }}
        />

        <TextWidget
          text={reference || "Adventools"}
          style={{
            fontSize: 10 * fontSizeMultiplier,
            color: '#fb923c',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}
