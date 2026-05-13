import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

interface MofonainaWidgetProps {
  title: string;
  verse: string;
  reference: string;
  backgroundImage?: string;
}

export function MofonainaWidget({ title, verse, reference, backgroundImage }: MofonainaWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'adventools://mofonaina' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 24,
        flexDirection: 'column',
        justifyContent: 'flex-end',
        backgroundColor: '#111827', // fallback dark
      }}
    >
      {/* Background image - Fill parent */}
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

      {/* Dark Overlay - Using a single strong gradient-like layer */}
      <FlexWidget
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 24,
          backgroundColor: '#00000080', // Consistent semi-transparent black
        }}
      />

      {/* Content Container - Not absolute, will be pushed to front by default in some RemoteViews implementations */}
      <FlexWidget
        style={{
          padding: 20,
          paddingBottom: 24, // Extra space at bottom
          flexDirection: 'column',
          justifyContent: 'flex-end',
          width: 'match_parent',
        }}
      >
        <TextWidget
          text={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          style={{
            fontSize: 10,
            color: '#cbd5e1',
            marginBottom: 4,
          }}
        />

        <TextWidget
          text={title || "Mofon'aina"}
          style={{
            fontSize: 20,
            color: '#ffffff',
            fontWeight: 'bold',
            marginBottom: 8,
            maxLines: 2,
          }}
        />

        <TextWidget
          text={verse || "Ouvrez l'application pour charger le verset."}
          style={{
            fontSize: 12,
            color: '#f1f5f9',
            marginBottom: 10,
            maxLines: 3,
            lineHeight: 16,
          }}
        />

        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text={reference || "Adventools"}
            style={{
              fontSize: 11,
              color: '#fb923c',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
