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
        height: 80,
        backgroundColor: bgColor,
        borderRadius: 20,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget text={emoji} style={{ fontSize: 26 }} />
      <TextWidget
        text={label}
        style={{ fontSize: 9, color, fontWeight: 'bold', marginTop: 4 }}
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
        borderRadius: 24,
        padding: 12,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Title */}
      <TextWidget
        text="RACCOURCIS"
        style={{
          fontSize: 9,
          color: '#475569',
          fontWeight: 'bold',
          letterSpacing: 1,
          marginBottom: 8,
        }}
      />

      {/* Buttons row */}
      <FlexWidget style={{ flexDirection: 'row', flex: 1 }}>
        <ShortcutButton
          emoji="📝"
          label="Notes"
          color="#6ee7b7"
          bgColor="#064e3b"
          uri="adventools://notes"
        />
        <ShortcutButton
          emoji="🎧"
          label="Audio"
          color="#c4b5fd"
          bgColor="#2e1065"
          uri="adventools://audio"
        />
        <ShortcutButton
          emoji="📖"
          label="Bible"
          color="#fcd34d"
          bgColor="#451a03"
          uri="adventools://(tabs)/bible"
        />
        <ShortcutButton
          emoji="📚"
          label="Leçons"
          color="#fb923c"
          bgColor="#431407"
          uri="adventools://utiles/lesona"
        />
      </FlexWidget>
    </FlexWidget>
  );
}
