import React from 'react';
import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';

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

  const RADIUS = 24;

  // Use a more compact layout if the height is small
  const isCompact = widgetHeight < 150;
  const padding = isCompact ? 8 : 16;
  const titleSize = isCompact ? 14 : 16;
  const verseSize = isCompact ? 11 : 12;
  const verseMaxLines = isCompact ? 2 : 4;

  let bgUrl = backgroundImage || 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8';
  if (bgUrl.includes('unsplash.com')) {
    bgUrl = bgUrl.split('?')[0] + `?q=80&w=${Math.round(widgetWidth * 2)}&h=${Math.round(widgetHeight * 2)}&fit=crop`;
  }

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
        <ImageWidget
          image={bgUrl as any}
          imageWidth={widgetWidth - 24}
          imageHeight={widgetHeight - 24}
          radius={RADIUS}
          style={{
            width: 'match_parent',
            height: 'match_parent',
          }}
        />

        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'adventools://mofonaina' }}
          style={{
            width: 'match_parent',
            height: 'match_parent',
            padding: padding,
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#0c111dcc',
            borderWidth: 1,
            borderColor: '#ffffff1a',
            borderRadius: RADIUS,
          }}
        >
          <TextWidget
            text={dateStr.toUpperCase()}
            style={{
              fontSize: isCompact ? 8 : 10,
              color: '#fb923c',
              fontWeight: 'bold',
              marginBottom: isCompact ? 2 : 6,
              letterSpacing: 1,
              textAlign: 'center',
            }}
          />

          <TextWidget
            text={title || "Mofon'aina"}
            maxLines={isCompact ? 1 : 2}
            truncate="END"
            style={{
              fontSize: titleSize,
              color: '#ffffff',
              fontWeight: 'bold',
              marginBottom: isCompact ? 2 : 6,
              textAlign: 'center',
            }}
          />

          <TextWidget
            text={verse || "Sokafy ny fampiharana mba hamakiana ny tenin'Andriamanitra anio."}
            maxLines={verseMaxLines}
            truncate="END"
            style={{
              fontSize: verseSize,
              color: '#e2e8f0',
              textAlign: 'center',
              marginBottom: isCompact ? 4 : 8,
            }}
          />

          <TextWidget
            text={reference || 'Adventools'}
            truncate="END"
            style={{
              fontSize: isCompact ? 9 : 11,
              color: '#fb923c',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          />
        </FlexWidget>
      </OverlapWidget>
    </FlexWidget>
  );
}
