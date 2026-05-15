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

export function LesonaWidget({
  title,
  lessonNumber,
  category,
  weekRange,
  days,
  coverImage,
}: LesonaWidgetProps) {
  // ─── KEY FIX FOR BORDERS ────────────────────────────────────────────────────
  // Same outer-margin technique as MofonainaWidget to prevent Android Launcher
  // from clipping the rounded corners of the card.
  const RADIUS = 20;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'adventools://utiles/lesona' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1a2634',
        borderRadius: RADIUS,
        flexDirection: 'column',
        padding: 14,
        overflow: 'hidden',
      }}
    >
        {/* ── Header: Cover + Lesson Info ── */}
        <FlexWidget style={{ flexDirection: 'row', marginBottom: 14, alignItems: 'center' }}>
          {/* Cover image or placeholder */}
          {coverImage ? (
            <ImageWidget
              image={coverImage}
              imageWidth={60}
              imageHeight={90}
              radius={10}
              style={{ marginRight: 12 }}
            />
          ) : (
            <FlexWidget
              style={{
                width: 60,
                height: 90,
                backgroundColor: '#2d3a4b',
                borderRadius: 10,
                marginRight: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TextWidget text="📖" style={{ fontSize: 22 }} />
            </FlexWidget>
          )}

          {/* Lesson meta */}
          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            <TextWidget
              text={(category || 'ÉCOLE DU SABBAT').toUpperCase()}
              style={{
                fontSize: 9,
                color: '#3b82f6',
                fontWeight: 'bold',
                marginBottom: 4,
                truncate: 'END',
                maxLines: 1,
              }}
            />
            <TextWidget
              text={title || 'Leçon de la semaine'}
              style={{
                fontSize: 16,
                color: '#ffffff',
                fontWeight: 'bold',
                maxLines: 3,
                truncate: 'END',
              }}
            />
            {!!weekRange && (
              <TextWidget
                text={weekRange}
                style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}
              />
            )}
          </FlexWidget>
        </FlexWidget>

        {/* ── Days list ── */}
        <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
          {days && days.length > 0 ? (
            days.map((day, index) => (
              <FlexWidget
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  marginBottom: 4,
                  borderRadius: 10,
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
                  text={`${day.label} ${day.date}`}
                  style={{
                    fontSize: 10,
                    color: day.isToday ? '#ffffffcc' : '#94a3b8',
                    marginLeft: 8,
                  }}
                />
              </FlexWidget>
            ))
          ) : (
            <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <TextWidget
                text="Sokafy ny fampiharana mba hijery ny lesona"
                style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}
              />
            </FlexWidget>
          )}
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
