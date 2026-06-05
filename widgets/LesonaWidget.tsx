import React from 'react';
import { FlexWidget, ImageWidget, ListWidget, TextWidget } from 'react-native-android-widget';

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
  widgetWidth?: number;
  widgetHeight?: number;
}

export function LesonaWidget({
  quarterlyTitle,
  lessonTitle,
  lessonNumber,
  category,
  weekRange,
  days,
  coverImage,
  widgetWidth = 300,
  widgetHeight = 300,
}: LesonaWidgetProps) {
  const RADIUS = 24;

  const isCompact = widgetHeight < 160;
  const showDays = widgetHeight > 120;
  const padding = isCompact ? 6 : 10;
  
  // Limit days based on height to prevent overflow
  const maxDays = widgetHeight < 200 ? 3 : widgetHeight < 250 ? 5 : 7;
  const displayDays = days.slice(0, maxDays);

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
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'adventools://utiles/lesona' }}
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#101720',
          borderRadius: RADIUS,
          flexDirection: 'column',
          padding: padding,
          overflow: 'hidden',
        }}
      >
        {/* ── Header: Cover + Quarterly & Lesson Info ── */}
        <FlexWidget style={{ flexDirection: 'row', marginBottom: isCompact ? 2 : 4, alignItems: 'center' }}>
          {/* Cover image - Resized to be more compact */}
          {coverImage ? (
            <ImageWidget
              image={coverImage as any}
              imageWidth={isCompact ? 30 : 40}
              imageHeight={isCompact ? 45 : 60}
              radius={4}
              style={{ marginRight: isCompact ? 6 : 8 }}
            />
          ) : (
            <FlexWidget
              style={{
                width: isCompact ? 30 : 40,
                height: isCompact ? 45 : 60,
                backgroundColor: '#1e293b',
                borderRadius: 4,
                marginRight: isCompact ? 6 : 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TextWidget text="📖" style={{ fontSize: isCompact ? 12 : 16 }} />
            </FlexWidget>
          )}

          {/* Titles meta */}
          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            <TextWidget
              text={quarterlyTitle || 'École du Sabbat'}
              maxLines={1}
              truncate="END"
              style={{
                fontSize: isCompact ? 13 : 14,
                color: '#ffffff',
                fontWeight: 'bold',
              }}
            />
            <TextWidget
              text={lessonTitle || 'Leçon de la semaine'}
              maxLines={2}
              truncate="END"
              style={{
                fontSize: isCompact ? 12 : 13,
                color: '#94a3b8',
                marginTop: 2,
              }}
            />
            {!isCompact && (
              <TextWidget
                text={weekRange || ''}
                style={{
                  fontSize: 11,
                  color: '#64748b',
                  marginTop: 2,
                }}
              />
            )}
          </FlexWidget>
        </FlexWidget>

        {/* ── Days list ── */}
        {showDays && (
          <ListWidget style={{ width: 'match_parent', height: 'match_parent', marginTop: isCompact ? 0 : 2 }}>
            {displayDays && displayDays.length > 0 ? (
              displayDays.map((day, index) => (
                <FlexWidget
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: isCompact ? 4 : 6,
                    paddingHorizontal: isCompact ? 6 : 8,
                    marginBottom: isCompact ? 3 : 4,
                    borderRadius: 8,
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
                        fontSize: isCompact ? 12 : 13,
                        color: '#ffffff',
                        fontWeight: day.isToday ? 'bold' : 'normal',
                      }}
                    />
                  </FlexWidget>
                  <TextWidget
                    text={`${day.label} ${day.date}`}
                    style={{
                      fontSize: isCompact ? 11 : 12,
                      color: day.isToday ? '#ffffffcc' : '#94a3b8',
                      marginLeft: 4,
                    }}
                  />
                </FlexWidget>
              ))
            ) : (
              <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <TextWidget
                  text="Sokafy ny fampiharana"
                  style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}
                />
              </FlexWidget>
            )}
          </ListWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
