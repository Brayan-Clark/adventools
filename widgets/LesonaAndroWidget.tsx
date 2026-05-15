import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const OUTER_MARGIN = 6;
const RADIUS = 20;

interface LesonaAndroWidgetProps {
  title: string;
  date: string;
  category: string;
}

export function LesonaAndroWidget({ title, date, category }: LesonaAndroWidgetProps) {
  return (
    // ── Outer transparent gap — prevents Android Launcher from clipping rounded corners ──
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        margin: OUTER_MARGIN,
        borderRadius: RADIUS,
        backgroundColor: '#00000000',
      }}
    >
      {/* The actual card */}
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'adventools://utiles/lesona' }}
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#1a2634',
          borderRadius: RADIUS,
          flexDirection: 'column',
          padding: 20,
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
          {/* Category badge */}
          <TextWidget
            text={(category || 'ÉCOLE DU SABBAT').toUpperCase()}
            style={{
              fontSize: 9,
              color: '#3b82f6',
              fontWeight: 'bold',
              marginBottom: 12,
              truncate: 'END',
              maxLines: 1,
            }}
          />

          {/* Date */}
          <TextWidget
            text={date}
            style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}
          />

          {/* Today's lesson title */}
          <TextWidget
            text={title || 'Sokafy ny fampiharana...'}
            style={{
              fontSize: 24,
              color: '#ffffff',
              fontWeight: 'bold',
              maxLines: 3,
              truncate: 'END',
            }}
          />
        </FlexWidget>

        {/* Read button */}
        <FlexWidget
          style={{
            backgroundColor: '#3b82f6',
            borderRadius: 100,
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 16,
          }}
        >
          <TextWidget
            text="HAMAKY"
            style={{ fontSize: 14, color: '#ffffff', fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
