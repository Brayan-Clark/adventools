import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, OverlapWidget } from 'react-native-android-widget';

const RADIUS = 15;

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
          image={coverImage as any}
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
          truncate="END"
          style={{
            fontSize: 14,
            color: '#e2e8f0',
            marginBottom: 6,
          }}
        />

        <TextWidget
          text={title || 'Sokafy ny fampiharana...'}
          maxLines={2}
          truncate="END"
          style={{
            fontSize: 26,
            color: '#ffffff',
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}
