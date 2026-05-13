import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

interface MofonainaWidgetProps {
  title: string;
  verse: string;
  reference: string;
}

export function MofonainaWidget({ title, verse, reference }: MofonainaWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'adventools://mofonaina' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 28,
        flexDirection: 'column',
        justifyContent: 'flex-end',
        backgroundColor: '#000000',
      }}
    >
      {/* Background image - Using a beautiful nature fallback */}
      <ImageWidget
        image={require('../assets/images/mofonaina_bg.jpg')}
        imageWidth={400}
        imageHeight={250}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 28,
        }}
      />

      {/* Modern Gradient-like Overlay (using semi-transparent layers) */}
      <FlexWidget
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100%',
          borderRadius: 28,
          backgroundColor: '#00000060', // General dim
        }}
      />
      <FlexWidget
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60%',
          borderRadius: 28,
          backgroundColor: '#000000aa', // Darker bottom for text contrast
        }}
      />

      {/* Content Container */}
      <FlexWidget
        style={{
          padding: 20,
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        {/* Date / Label */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
            backgroundColor: '#fb923c',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
            alignSelf: 'flex-start',
          }}
        >
          <TextWidget
            text="🌅  VIGILE MATINALE"
            style={{
              fontSize: 9,
              color: '#ffffff',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        {/* Title - Large and Bold */}
        <TextWidget
          text={title || "Mofon'aina"}
          style={{
            fontSize: 18,
            color: '#ffffff',
            fontWeight: 'bold',
            marginBottom: 6,
            maxLines: 2,
            truncate: 'END',
          }}
        />

        {/* Verse Content - Premium feel */}
        <TextWidget
          text={verse}
          style={{
            fontSize: 13,
            color: '#e2e8f0',
            marginBottom: 10,
            maxLines: 3,
            truncate: 'END',
          }}
        />

        {/* Footer with Reference and Icon */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TextWidget
            text={reference}
            style={{
              fontSize: 11,
              color: '#fb923c',
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text="Lire la suite →"
            style={{
              fontSize: 10,
              color: '#ffffff90',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
