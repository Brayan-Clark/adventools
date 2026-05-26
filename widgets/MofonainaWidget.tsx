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

  const RADIUS = 24; // Premium modern rounded corner radius

  // Crop the image server-side to exact widget dimensions (simulates resizeMode="cover")
  let bgUrl = backgroundImage || 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8';
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

      {/* 2. Frosted glass semi-transparent dark overlay + clean crisp border + all text */}
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'adventools://mofonaina' }}
        style={{
          width: 'match_parent',
          height: 'match_parent',
          paddingHorizontal: 16,
          paddingVertical: 16,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0c111daa', // Frosted 66% slate-950
          borderWidth: 1,
          borderColor: '#ffffff1a',     // 10% white glow border for elegant glass edge
          borderRadius: RADIUS,
        }}
      >
        <TextWidget
          text={dateStr.toUpperCase()}
          style={{
            fontSize: 10,
            color: '#fb923c', // Warm amber-gold date
            fontWeight: 'bold',
            marginBottom: 6,
            letterSpacing: 1,
            textAlign: 'center',
          }}
        />

        <TextWidget
          text={title || "Mofon'aina"}
          maxLines={2}
          truncate="END"
          style={{
            fontSize: 16,
            color: '#ffffff', // Pristine white title
            fontWeight: 'bold',
            marginBottom: 6,
            textAlign: 'center',
          }}
        />

        <TextWidget
          text={verse || "Sokafy ny fampiharana mba hamakiana ny tenin'Andriamanitra anio."}
          maxLines={4}
          truncate="END"
          style={{
            fontSize: 12,
            color: '#e2e8f0', // Clean slate-200 text for maximum reading contrast
            textAlign: 'center',
            marginBottom: 8,
          }}
        />

        <TextWidget
          text={reference || 'Adventools'}
          truncate="END"
          style={{
            fontSize: 11,
            color: '#fb923c', // Amber gold reference
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}
