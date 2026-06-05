import React from 'react';
import { ColorProp, FlexWidget, TextWidget } from 'react-native-android-widget';

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
        paddingVertical: 8, // Reduced from 12
        backgroundColor: '#ffffff1a',
        borderWidth: 1,
        borderColor: '#ffffff33',
        borderRadius: 12, // Slightly smaller radius
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text={icon}
        style={{
          fontSize: 18, // Reduced from 20
          color: color,
          fontWeight: 'bold',
          marginBottom: 2, // Reduced from 4
        }}
      />
      <TextWidget
        text={label}
        style={{
          fontSize: 9, // Reduced from 10
          color: '#f8fafc',
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
        width: 'match_parent',
        height: 'match_parent',
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#0f172aee',
          borderWidth: 1,
          borderColor: '#ffffff22',
          borderRadius: RADIUS,
          padding: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
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
            color="#34d399"
            uri="adventools://notes"
          />
          <ShortcutButton
            icon="♬"
            label="Audio"
            color="#a78bfa"
            uri="adventools://audio"
          />
          <ShortcutButton
            icon="📖"
            label="Baiboly"
            color="#60a5fa"
            uri="adventools://bible"
          />
          <ShortcutButton
            icon="📚"
            label="Lesona"
            color="#fb923c"
            uri="adventools://utiles/lesona"
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
