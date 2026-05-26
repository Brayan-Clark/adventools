import React from 'react';
import { FlexWidget, TextWidget, ColorProp } from 'react-native-android-widget';

const RADIUS = 24; // Matches premium Android 12+ system widget corner radius

interface ShortcutButtonProps {
  icon: string;
  label: string;
  color: ColorProp;
  uri: string;
}

function ShortcutButton({ icon, label, color, uri }: ShortcutButtonProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 12,
        backgroundColor: '#ffffff1a', // Frosted glass button module background
        borderWidth: 1,
        borderColor: '#ffffff33',     // Delicate inner glass border
        borderRadius: 16,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text={icon}
        style={{
          fontSize: 20,
          color: color, // Modern monochromatic colored glyph
          fontWeight: 'bold',
          marginBottom: 4,
        }}
      />
      <TextWidget
        text={label}
        style={{
          fontSize: 10,
          color: '#f8fafc', // Crisp Slate-50 text
          fontWeight: 'bold',
        }}
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
        backgroundColor: '#0f172aee', // Sleek transparent dark slate glass
        borderWidth: 1,
        borderColor: '#ffffff22',     // 10% white glow edge for realistic glass shine
        borderRadius: RADIUS,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Sleek Minimalist Header */}
      <TextWidget
        text="ACCÈS RAPIDE"
        style={{
          fontSize: 10,
          color: '#38bdf8', // Light sky blue title accent
          fontWeight: 'bold',
          letterSpacing: 2,
          marginBottom: 12,
          textAlign: 'center',
        }}
      />

      {/* Glassmorphic Shortcut buttons */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <ShortcutButton
          icon="✎"
          label="Notes"
          color="#34d399" // Emerald
          uri="adventools://notes"
        />
        <ShortcutButton
          icon="♬"
          label="Audio"
          color="#a78bfa" // Radiant Violet
          uri="adventools://audio"
        />
        <ShortcutButton
          icon="📖"
          label="Baiboly"
          color="#60a5fa" // Blue
          uri="adventools://bible"
        />
        <ShortcutButton
          icon="📚"
          label="Lesona"
          color="#fb923c" // Orange
          uri="adventools://utiles/lesona"
        />
      </FlexWidget>
    </FlexWidget>
  );
}
