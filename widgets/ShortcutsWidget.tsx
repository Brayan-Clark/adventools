import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function ShortcutsWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0f172a', // Slate 900
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget
        clickAction="OPEN_NOTES"
        style={{
          width: 60,
          height: 60,
          backgroundColor: '#3b82f6', // Blue
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget text="📝" style={{ fontSize: 24 }} />
      </FlexWidget>

      <FlexWidget
        clickAction="OPEN_AUDIO"
        style={{
          width: 60,
          height: 60,
          backgroundColor: '#8b5cf6', // Violet
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget text="🎧" style={{ fontSize: 24 }} />
      </FlexWidget>

      <FlexWidget
        clickAction="OPEN_BIBLE"
        style={{
          width: 60,
          height: 60,
          backgroundColor: '#f97316', // Orange
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget text="📖" style={{ fontSize: 24 }} />
      </FlexWidget>
    </FlexWidget>
  );
}
