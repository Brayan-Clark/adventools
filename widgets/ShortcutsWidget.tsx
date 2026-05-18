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
        marginHorizontal: 5,
        paddingVertical: 14,
        backgroundColor: '#ffffff0d', // Frosted glass button module background
        borderWidth: 1,
        borderColor: '#ffffff0f',     // Delicate inner glass border
        borderRadius: 16,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text={icon}
        style={{
          fontSize: 22,
          color: color, // Modern monochromatic colored glyph
          fontWeight: 'bold',
          marginBottom: 6,
        }}
      />
      <TextWidget
        text={label}
        style={{
          fontSize: 10,
          color: '#f1f5f9', // Crisp Slate-100 text
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
        backgroundColor: '#0a0e1790', // Sleek 56% transparent dark blue-slate glass
        borderWidth: 1,
        borderColor: '#ffffff1a',     // 10% white glow edge for realistic glass shine
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
          fontSize: 9,
          color: '#fb923c', // Warm amber-gold title accent
          fontWeight: 'bold',
          letterSpacing: 3,
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
          color="#10b981" // Radiant Emerald
          uri="adventools://notes"
        />
        <ShortcutButton
          icon="♬"
          label="Audio"
          color="#a78bfa" // Radiant Violet
          uri="adventools://audio"
        />
        <ShortcutButton
          icon="✙"
          label="Baiboly"
          color="#f59e0b" // Radiant Amber
          uri="adventools://(tabs)/bible"
        />
        <ShortcutButton
          icon="📚"
          label="Lesona"
          color="#f97316" // Radiant Orange
          uri="adventools://utiles/lesona"
        />
      </FlexWidget>
    </FlexWidget>
  );
}
