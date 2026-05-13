import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface DayItem {
  label: string;
  date: string;
  isToday: boolean;
  title?: string;
}

interface LesonaWidgetProps {
  title: string;
  lessonNumber: string;
  category: string;
  weekRange: string;
  days: DayItem[];
}

export function LesonaWidget({ title, lessonNumber, category, weekRange, days }: LesonaWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'adventools://utiles/lesona' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0f172a',
        borderRadius: 28,
        flexDirection: 'column',
        padding: 16,
      }}
    >
      {/* Header Section */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <FlexWidget
          style={{
            backgroundColor: '#3b82f620',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text="📖  ÉCOLE DU SABBAT"
            style={{ fontSize: 9, color: '#60a5fa', fontWeight: 'bold' }}
          />
        </FlexWidget>
        <TextWidget
          text={category || 'Adulte'}
          style={{ fontSize: 9, color: '#64748b', fontWeight: 'bold' }}
        />
      </FlexWidget>

      {/* Lesson Info */}
      <TextWidget
        text={title || 'Leçon de la semaine'}
        style={{
          fontSize: 16,
          color: '#ffffff',
          fontWeight: 'bold',
          maxLines: 1,
          truncate: 'END',
        }}
      />
      <TextWidget
        text={weekRange || 'Cette semaine'}
        style={{ fontSize: 10, color: '#475569', marginTop: 2, marginBottom: 12 }}
      />

      {/* Week Days List - The "Premium" part from inspiration */}
      <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
        {days && days.map((day, index) => (
          <FlexWidget
            key={index}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 6,
              paddingHorizontal: 8,
              marginBottom: 4,
              borderRadius: 12,
              backgroundColor: day.isToday ? '#3b82f6' : '#1e293b50',
            }}
          >
            <TextWidget
              text={day.title || 'Lesona'}
              style={{
                fontSize: 11,
                color: day.isToday ? '#ffffff' : '#94a3b8',
                fontWeight: day.isToday ? 'bold' : 'normal',
                flex: 1,
              }}
            />
            <TextWidget
              text={`${day.label} ${day.date}`}
              style={{
                fontSize: 10,
                color: day.isToday ? '#ffffff90' : '#475569',
                marginLeft: 8,
              }}
            />
          </FlexWidget>
        ))}
        
        {/* Fallback if no days */}
        {(!days || days.length === 0) && (
           <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
             <TextWidget text="Ouvrez l'app pour voir la semaine" style={{ fontSize: 10, color: '#475569' }} />
           </FlexWidget>
        )}
      </FlexWidget>

      {/* Footer */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
        <TextWidget
          text="Étudier maintenant →"
          style={{ fontSize: 10, color: '#3b82f6', fontWeight: 'bold' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
