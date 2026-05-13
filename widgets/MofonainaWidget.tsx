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
        borderRadius: 24,
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* Background image */}
      <ImageWidget
        image={require('../assets/images/mofonaina_bg.jpg')}
        imageWidth={350}
        imageHeight={200}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 24,
        }}
      />

      {/* Dark gradient overlay */}
      <FlexWidget
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 24,
          backgroundColor: '#00000099',
        }}
      />

      {/* Content */}
      <FlexWidget
        style={{
          padding: 18,
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        {/* Badge */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
            backgroundColor: '#3b82f620',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 4,
            alignSelf: 'flex-start',
          }}
        >
          <TextWidget
            text="🌅  Veille Matinale"
            style={{
              fontSize: 10,
              color: '#93c5fd',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        {/* Title */}
        <TextWidget
          text={title || "Mofon'aina"}
          style={{
            fontSize: 16,
            color: '#ffffff',
            fontWeight: 'bold',
            marginBottom: 6,
            maxLines: 2,
            truncate: 'END',
          }}
        />

        {/* Verse */}
        <TextWidget
          text={verse}
          style={{
            fontSize: 12,
            color: '#e2e8f0',
            marginBottom: 8,
            maxLines: 3,
            truncate: 'END',
          }}
        />

        {/* Reference */}
        <TextWidget
          text={`— ${reference}`}
          style={{
            fontSize: 11,
            color: '#93c5fd',
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
