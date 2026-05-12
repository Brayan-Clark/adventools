import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface LesonaWidgetProps {
  title: string;
  verse: string;
  reference: string;
}

export function LesonaWidget({ title, verse, reference }: LesonaWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0f172a', // Slate 900
        borderRadius: 24,
        padding: 20,
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text="📖 École du Sabbat"
        style={{
          fontSize: 12,
          color: '#f97316', // Orange
          fontWeight: 'bold',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      />
      <TextWidget
        text={title || "Leçon du Jour"}
        style={{
          fontSize: 18,
          color: '#ffffff',
          fontWeight: 'bold',
          marginBottom: 12,
        }}
      />
      <TextWidget
        text={`"${verse}"`}
        style={{
          fontSize: 14,
          color: '#cbd5e1', // Slate 300
          fontStyle: 'italic',
          marginBottom: 8,
          maxLines: 4,
          truncate: 'END',
        }}
      />
      <TextWidget
        text={reference}
        style={{
          fontSize: 12,
          color: '#94a3b8', // Slate 400
          fontWeight: 'bold',
        }}
      />
    </FlexWidget>
  );
}
