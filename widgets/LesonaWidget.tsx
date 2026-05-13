import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface LesonaWidgetProps {
  title: string;
  lessonNumber: string;
  memoryVerse: string;
  category: string;
  weekRange: string;
}

export function LesonaWidget({ title, lessonNumber, memoryVerse, category, weekRange }: LesonaWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'adventools://utiles/lesona' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0f172a',
        borderRadius: 24,
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 18,
      }}
    >
      {/* Top accent bar */}
      <FlexWidget
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: '#f97316',
          borderRadius: 24,
        }}
      />

      {/* Header row */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <FlexWidget
          style={{
            backgroundColor: '#f9731620',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <TextWidget
            text="📖  École du Sabbat"
            style={{ fontSize: 10, color: '#fb923c', fontWeight: 'bold' }}
          />
        </FlexWidget>

        {lessonNumber ? (
          <FlexWidget
            style={{
              backgroundColor: '#1e293b',
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <TextWidget
              text={`N° ${lessonNumber}`}
              style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold' }}
            />
          </FlexWidget>
        ) : null}
      </FlexWidget>

      {/* Category label */}
      {category ? (
        <TextWidget
          text={category.toUpperCase()}
          style={{
            fontSize: 9,
            color: '#64748b',
            fontWeight: 'bold',
            letterSpacing: 1,
            marginTop: 12,
          }}
        />
      ) : null}

      {/* Lesson title */}
      <TextWidget
        text={title || 'Leçon du jour'}
        style={{
          fontSize: 17,
          color: '#f1f5f9',
          fontWeight: 'bold',
          maxLines: 2,
          truncate: 'END',
          marginTop: 4,
        }}
      />

      {/* Memory verse */}
      {memoryVerse ? (
        <TextWidget
          text={`"${memoryVerse}"`}
          style={{
            fontSize: 11,
            color: '#94a3b8',
            maxLines: 3,
            truncate: 'END',
            marginTop: 8,
          }}
        />
      ) : null}

      {/* Footer */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <TextWidget
          text={weekRange || 'Cette semaine'}
          style={{ fontSize: 10, color: '#475569' }}
        />
        <TextWidget
          text="Ouvrir →"
          style={{ fontSize: 10, color: '#f97316', fontWeight: 'bold' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
