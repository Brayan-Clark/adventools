import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

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
  coverImage?: string;
}

export function LesonaWidget({ title, lessonNumber, category, weekRange, days, coverImage }: LesonaWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'adventools://utiles/lesona' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1a2634',
        borderRadius: 24,
        flexDirection: 'column',
        padding: 14,
      }}
    >
      {/* Top Header Section with Cover and Info */}
      <FlexWidget style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'center' }}>
        {/* Cover Image */}
        {coverImage ? (
          <ImageWidget
            image={coverImage}
            imageWidth={70}
            imageHeight={100}
            style={{
              borderRadius: 12,
              marginRight: 12,
            }}
          />
        ) : (
          <FlexWidget
            style={{
              width: 70,
              height: 100,
              backgroundColor: '#2d3a4b',
              borderRadius: 12,
              marginRight: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
             <TextWidget text="📖" style={{ fontSize: 24 }} />
          </FlexWidget>
        )}

        {/* Lesson Info beside cover */}
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
             <TextWidget
              text={category?.toUpperCase() || 'ÉCOLE DU SABBAT'}
              style={{ fontSize: 8, color: '#3b82f6', fontWeight: 'bold' }}
            />
          </FlexWidget>
          
          <TextWidget
            text={title || 'Leçon de la semaine'}
            style={{
              fontSize: 18,
              color: '#ffffff',
              fontWeight: 'bold',
              maxLines: 2,
              truncate: 'END',
            }}
          />
          <TextWidget
            text={weekRange || 'Cette semaine'}
            style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Daily Lessons List */}
      <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
        {days && days.map((day, index) => (
          <FlexWidget
            key={index}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              paddingHorizontal: 12,
              marginBottom: 6,
              borderRadius: 12,
              backgroundColor: day.isToday ? '#3b82f6' : '#2d3a4b',
            }}
          >
            <TextWidget
              text={day.title || 'Lesona'}
              style={{
                fontSize: 12,
                color: '#ffffff',
                fontWeight: day.isToday ? 'bold' : 'normal',
                flex: 1,
                maxLines: 1,
                truncate: 'END',
              }}
            />
            <TextWidget
              text={`${day.label}, ${day.date}`}
              style={{
                fontSize: 10,
                color: day.isToday ? '#ffffffcc' : '#94a3b8',
                marginLeft: 10,
              }}
            />
          </FlexWidget>
        ))}
        
        {/* Fallback if no days */}
        {(!days || days.length === 0) && (
           <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
             <TextWidget text="Ouvrez l'app pour voir la semaine" style={{ fontSize: 12, color: '#94a3b8' }} />
           </FlexWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
