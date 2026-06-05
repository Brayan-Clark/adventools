import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, OverlapWidget } from 'react-native-android-widget';

const RADIUS = 24;

interface LesonaAndroWidgetProps {
  title: string;
  date: string;
  category: string;
  coverImage?: string;
  widgetWidth?: number;
  widgetHeight?: number;
}

export function LesonaAndroWidget({
  title,
  date,
  category,
  coverImage,
  widgetWidth = 300,
  widgetHeight = 200,
}: LesonaAndroWidgetProps) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
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
            imageWidth={widgetWidth - 24}
            imageHeight={widgetHeight - 24}
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
            padding: 16,
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
              fontSize: 12,
              color: '#e2e8f0',
              marginBottom: 4,
            }}
          />

          <TextWidget
            text={title || 'Sokafy ny fampiharana...'}
            maxLines={3}
            truncate="END"
            style={{
              fontSize: 18,
              color: '#ffffff',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </OverlapWidget>
    </FlexWidget>
  );
}
