import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, OverlapWidget } from 'react-native-android-widget';

interface MofonainaWidgetProps {
  title: string;
  verse: string;
  reference: string;
  backgroundImage?: string;
  widgetWidth?: number;
  widgetHeight?: number;
}

export function MofonainaWidget({ title, verse, reference, backgroundImage, widgetWidth = 300, widgetHeight = 300 }: MofonainaWidgetProps) {
  const dateStr = new Date().toLocaleDateString('mg-MG', { weekday: 'long', day: 'numeric', month: 'long' });
  
  // Use Unsplash API to crop the image server-side to match the exact widget bounds!
  // This perfectly simulates resizeMode="cover" without overflowing Android layouts.
  let optimizedBg = backgroundImage || 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d';
  if (optimizedBg.includes('unsplash.com')) {
    // Remove existing query params and add exact width/height with crop
    optimizedBg = optimizedBg.split('?')[0] + `?q=80&w=${Math.round(widgetWidth * 2)}&h=${Math.round(widgetHeight * 2)}&fit=crop`;
  }

  return (
    <OverlapWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
      }}
    >
      {/* 1. Background image - Exact Bounds + Rounded Corners */}
      <ImageWidget
        image={optimizedBg as any}
        imageWidth={widgetWidth}
        imageHeight={widgetHeight}
        radius={24}
        style={{
          width: 'match_parent',
          height: 'match_parent',
        }}
      />

      {/* 2. Content Layer with dark overlay - Exact Bounds */}
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
          backgroundColor: '#00000099', // Dark overlay
          borderRadius: 24,
        }}
      >
        <TextWidget
          text={dateStr.toUpperCase()}
          style={{
            fontSize: 12, // Increased from 9
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
            fontSize: 22, // Increased from 18
            color: '#ffffff',
            fontWeight: 'bold',
            marginBottom: 12,
            textAlign: 'center',
            maxLines: 2,
            truncate: 'END',
          }}
        />

        <TextWidget
          text={verse || "Sokafy ny fampiharana mba hamakiana ny tenin'Andriamanitra anio."}
          style={{
            fontSize: 15, // Increased from 12
            color: '#e2e8f0',
            textAlign: 'center',
            marginBottom: 12,
            maxLines: 4,
            truncate: 'END',
          }}
        />

        <TextWidget
          text={reference || "Adventools"}
          style={{
            fontSize: 12, // Increased from 10
            color: '#fb923c',
            fontWeight: 'bold',
            textAlign: 'center',
            truncate: 'END',
          }}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}
