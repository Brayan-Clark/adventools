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

export function MofonainaWidget({
  title,
  verse,
  reference,
  backgroundImage,
  widgetWidth = 300,
  widgetHeight = 300,
}: MofonainaWidgetProps) {
  const dateStr = new Date().toLocaleDateString('mg-MG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const RADIUS = 20;

  // Crop the image server-side to exact widget dimensions (simulates resizeMode="cover")
  let bgUrl = backgroundImage || 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d';
  if (bgUrl.includes('unsplash.com')) {
    bgUrl = bgUrl.split('?')[0] + `?q=80&w=${Math.round(widgetWidth * 2)}&h=${Math.round(widgetHeight * 2)}&fit=crop`;
  }

  return (
    <OverlapWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: RADIUS,
      }}
    >
      {/* 1. Background image — server-side cropped to widget size */}
      <ImageWidget
        image={bgUrl as any}
        imageWidth={widgetWidth}
        imageHeight={widgetHeight}
        radius={RADIUS}
        style={{
          width: 'match_parent',
          height: 'match_parent',
        }}
      />

      {/* 2. Semi-transparent dark overlay + all text */}
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'adventools://mofonaina' }}
        style={{
          width: 'match_parent',
          height: 'match_parent',
          paddingHorizontal: 24,
          paddingVertical: 32,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#00000099',
          borderRadius: RADIUS,
        }}
      >
        <TextWidget
          text={dateStr.toUpperCase()}
          style={{
            fontSize: 11,
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
            fontSize: 20,
            color: '#ffffff',
            fontWeight: 'bold',
            marginBottom: 8,
            textAlign: 'center',
            maxLines: 2,
            truncate: 'END',
          }}
        />

        <TextWidget
          text={verse || "Sokafy ny fampiharana mba hamakiana ny tenin'Andriamanitra anio."}
          style={{
            fontSize: 14,
            color: '#e2e8f0',
            textAlign: 'center',
            marginBottom: 10,
            maxLines: 4,
            truncate: 'END',
          }}
        />

        <TextWidget
          text={reference || 'Adventools'}
          style={{
            fontSize: 12,
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
