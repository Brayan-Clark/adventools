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
        backgroundColor: '#000000',
      }}
    >
      {/* Background image */}
      <ImageWidget
        image={backgroundImage || require('../assets/images/mofonaina_bg.jpg')}
        imageWidth={400}
        imageHeight={300}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 24,
        }}
      />

      {/* Dark Overlay for text legibility - matching Image 3's moody look */}
      <FlexWidget
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100%',
          borderRadius: 24,
          backgroundColor: '#00000060', // General dimming
        }}
      />
      <FlexWidget
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '70%',
          borderRadius: 24,
          backgroundColor: '#00000080', // Bottom gradient effect
        }}
      />

      {/* Content Container */}
      <FlexWidget
        style={{
          padding: 18,
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        {/* Date Label / Category */}
        <TextWidget
          text={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          style={{
            fontSize: 10,
            color: '#ffffffcc',
            marginBottom: 4,
            fontWeight: 'normal',
          }}
        />

        {/* Title - Large and Bold */}
        <TextWidget
          text={title || "Mofon'aina"}
          style={{
            fontSize: 22,
            color: '#ffffff',
            fontWeight: 'bold',
            marginBottom: 8,
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
            marginBottom: 12,
            maxLines: 3,
            truncate: 'END',
            lineHeight: 18,
          }}
        />

        {/* Reference */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget
            style={{
              backgroundColor: '#fb923c',
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginRight: 8,
            }}
          >
            <TextWidget
              text="VERSET"
              style={{ fontSize: 7, color: '#000000', fontWeight: 'bold' }}
            />
          </FlexWidget>
          <TextWidget
            text={reference}
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
