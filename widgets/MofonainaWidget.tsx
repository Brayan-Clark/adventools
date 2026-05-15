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

  // ─── KEY FIX FOR BORDERS ────────────────────────────────────────────────────
  // Android Launcher clips any widget content that reaches the exact edge of
  // the bounding box, making rounded corners invisible.
  // Solution: wrap everything in a FlexWidget with a small margin so the actual
  // card never touches the outer boundary → rounded corners become visible.
  const OUTER_MARGIN = 6;  // dp — enough to show the card shadow + rounding
  const RADIUS = 20;

  // Image size: exact inner area after margins (prevents any overflow)
  const imgW = widgetWidth  - OUTER_MARGIN * 2;
  const imgH = widgetHeight - OUTER_MARGIN * 2;

  // Crop the image server-side to exact widget inner dimensions so it fills
  // without ever overflowing (simulates resizeMode="cover" natively)
  let bgUrl = backgroundImage || 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d';
  if (bgUrl.includes('unsplash.com')) {
    bgUrl = bgUrl.split('?')[0] + `?q=80&w=${Math.round(imgW * 2)}&h=${Math.round(imgH * 2)}&fit=crop`;
  }

  return (
    // Outer transparent wrapper — provides the visible gap between widget
    // content and the launcher's clip boundary
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        margin: OUTER_MARGIN,
        borderRadius: RADIUS,
        backgroundColor: '#00000000', // fully transparent
      }}
    >
      <OverlapWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          borderRadius: RADIUS,
        }}
      >
        {/* 1. Background image — pre-cropped to exact inner size */}
        <ImageWidget
          image={bgUrl as any}
          imageWidth={imgW}
          imageHeight={imgH}
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
            padding: 20,
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
              fontSize: 22,
              color: '#ffffff',
              fontWeight: 'bold',
              marginBottom: 10,
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
    </FlexWidget>
  );
}
