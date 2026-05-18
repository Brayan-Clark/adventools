import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, ListWidget } from 'react-native-android-widget';

interface DayItem {
  label: string;
  date: string;
  isToday: boolean;
  title?: string;
}

interface LesonaWidgetProps {
  quarterlyTitle: string;
  lessonTitle: string;
  lessonNumber: string;
  category: string;
  weekRange: string;
  days: DayItem[];
  coverImage?: string;
}

export function LesonaWidget({
  quarterlyTitle,
  lessonTitle,
  lessonNumber,
  category,
  weekRange,
  days,
  coverImage,
}: LesonaWidgetProps) {
  // Android Launcher will clip or apply its own radius.
  // Using 0 prevents inner-radius clipping bugs.

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'adventools://utiles/lesona' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#101720',
        borderRadius: 0,
        flexDirection: 'column',
        padding: 16,
        paddingBottom: 24,
        overflow: 'hidden',
      }}
    >
        {/* ── Header: Cover + Quarterly & Lesson Info ── */}
        <FlexWidget style={{ flexDirection: 'row', marginBottom: 18, alignItems: 'flex-start' }}>
          {/* Cover image or placeholder */}
          {coverImage ? (
            <ImageWidget
              image={coverImage as any}
              imageWidth={70}
              imageHeight={105}
              radius={6}
              style={{ marginRight: 16 }}
            />
          ) : (
            <FlexWidget
              style={{
                width: 70,
                height: 105,
                backgroundColor: '#1e293b',
                borderRadius: 6,
                marginRight: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TextWidget text="📖" style={{ fontSize: 24 }} />
            </FlexWidget>
          )}

          {/* Titles meta */}
          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            <TextWidget
              text={quarterlyTitle || 'École du Sabbat'}
              maxLines={2}
              truncate="END"
              style={{
                fontSize: 18,
                color: '#ffffff',
                fontWeight: 'bold',
              }}
            />
            <TextWidget
              text={lessonTitle || 'Leçon de la semaine'}
              maxLines={1}
              truncate="END"
              style={{
                fontSize: 12,
                color: '#94a3b8',
                marginTop: 4,
              }}
            />
            <TextWidget
              text={weekRange || ''}
              style={{
                fontSize: 10,
                color: '#64748b',
                marginTop: 2,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* ── Days list ── */}
        <ListWidget style={{ width: 'match_parent', height: 'match_parent', marginTop: 12 }}>
          {days && days.length > 0 ? (
            days.map((day, index) => (
              <FlexWidget
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  marginBottom: 6,
                  borderRadius: 12,
                  backgroundColor: day.isToday ? '#3b82f6' : '#1e293b',
                  width: 'match_parent',
                }}
              >
                <FlexWidget style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <TextWidget
                    text={day.title || 'Lesona'}
                    maxLines={1}
                    truncate="END"
                    style={{
                      fontSize: 13,
                      color: '#ffffff',
                      fontWeight: day.isToday ? 'bold' : 'normal',
                    }}
                  />
                </FlexWidget>
                <TextWidget
                  text={`${day.label} ${day.date}`}
                  style={{
                    fontSize: 11,
                    color: day.isToday ? '#ffffffcc' : '#94a3b8',
                    marginLeft: 12,
                  }}
                />
              </FlexWidget>
            ))
          ) : (
            <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <TextWidget
                text="Sokafy ny fampiharana mba hijery ny lesona"
                style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}
              />
            </FlexWidget>
          )}
        </ListWidget>
    </FlexWidget>
  );
}
