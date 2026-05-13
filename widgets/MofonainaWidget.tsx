import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

interface MofonainaWidgetProps {
  title: string;
  verse: string;
  reference: string;
  backgroundImage?: string;
}

export function MofonainaWidget({ title, verse, reference, backgroundImage }: MofonainaWidgetProps) {
  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'adventools://mofonaina' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 24,
        backgroundColor: '#000000',
      }}
    >
      {/* 1. Background image - Absolute Layer 0 */}
      <ImageWidget
        image={backgroundImage || require('../assets/images/mofonaina_bg.jpg')}
        imageWidth={600}
        imageHeight={400}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 24,
        }}
      />

      {/* 2. Dark Overlay - Absolute Layer 1 */}
      <FlexWidget
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 24,
          backgroundColor: '#00000095', // Increased darkness for guaranteed visibility
        }}
      />

      {/* 3. Content Layer - Absolute Layer 2 (TOP) */}
      <FlexWidget
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: 20,
          flexDirection: 'column',
          justifyContent: 'center', // Center content for safety
          alignItems: 'center',
        }}
      >
        <TextWidget
          text={dateStr.toUpperCase()}
          style={{
            fontSize: 9,
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
            fontSize: 18,
            color: '#ffffff',
            fontWeight: 'bold',
            marginBottom: 12,
            textAlign: 'center',
            maxLines: 2,
          }}
        />

        <TextWidget
          text={verse || "Verset du jour"}
          style={{
            fontSize: 12,
            color: '#e2e8f0',
            textAlign: 'center',
            marginBottom: 12,
            maxLines: 4,
            lineHeight: 16,
          }}
        />

        <TextWidget
          text={reference || "Adventools"}
          style={{
            fontSize: 10,
            color: '#fb923c',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
