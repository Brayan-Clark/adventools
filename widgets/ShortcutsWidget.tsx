import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface ShortcutButtonProps {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
  uri: string;
}

function ShortcutButton({ emoji, label, color, bgColor, uri }: ShortcutButtonProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 12,
        backgroundColor: bgColor,
        borderRadius: 24, // Pill shape
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget text={emoji} style={{ fontSize: 24, marginBottom: 4 }} />
      <TextWidget
        text={label}
        style={{ fontSize: 10, color, fontWeight: 'bold' }}
      />
    </FlexWidget>
  );
}

export function ShortcutsWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0f172a',
        borderRadius: 32,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {/* Title */}
      <TextWidget
        text="RACCOURCIS"
        style={{
          fontSize: 9,
          color: '#64748b',
          fontWeight: 'bold',
          letterSpacing: 2,
          marginBottom: 12,
          textAlign: 'center',
        }}
      />

      {/* Buttons row - Spread evenly */}
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between', alignItems: 'center' }}>
        <ShortcutButton
          emoji="📝"
          label="Notes"
          color="#ffffff"
          bgColor="#065f46"
          uri="adventools://notes"
        />
        <ShortcutButton
          emoji="🎧"
          label="Audio"
          color="#ffffff"
          bgColor="#5b21b6"
          uri="adventools://audio"
        />
        <ShortcutButton
          emoji="📖"
          label="Bible"
          color="#ffffff"
          bgColor="#92400e"
          uri="adventools://(tabs)/bible"
        />
        <ShortcutButton
          emoji="📚"
          label="Leçons"
          color="#ffffff"
          bgColor="#9a3412"
          uri="adventools://utiles/lesona"
        />
      </FlexWidget>
    </FlexWidget>
  );
}
