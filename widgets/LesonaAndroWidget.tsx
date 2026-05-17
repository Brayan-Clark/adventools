import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, OverlapWidget } from 'react-native-android-widget';

const RADIUS = 0;

interface LesonaAndroWidgetProps {
  title: string;
  date: string;
  category: string;
  coverImage?: string;
}

export function LesonaAndroWidget({ title, date, category, coverImage }: LesonaAndroWidgetProps) {
  return (
    <OverlapWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: RADIUS,
      }}
    >
      {/* 1. Background image (Quarterly cover) */}
      {coverImage ? (
        <ImageWidget
          image={coverImage}
          imageWidth={400}
          imageHeight={400}
          radius={RADIUS}
          style={{
            width: 'match_parent',
            height: 'match_parent',
          }}
        />
      ) : (
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 'match_parent',
            backgroundColor: '#1a2634',
            borderRadius: RADIUS,
          }}
        />
      )}

      {/* 2. Dark overlay + Text content */}
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'adventools://utiles/lesona' }}
        style={{
          width: 'match_parent',
          height: 'match_parent',
          padding: 24,
          flexDirection: 'column',
          justifyContent: 'flex-end',
          backgroundColor: '#00000088',
          borderRadius: RADIUS,
        }}
      >
        <TextWidget
          text={date}
          style={{
            fontSize: 14,
            color: '#e2e8f0',
            marginBottom: 6,
            truncate: 'END',
          }}
        />

        <TextWidget
          text={title || 'Sokafy ny fampiharana...'}
          style={{
            fontSize: 26,
            color: '#ffffff',
            fontWeight: 'bold',
            maxLines: 2,
            truncate: 'END',
          }}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}
