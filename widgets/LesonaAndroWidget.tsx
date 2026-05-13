import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

interface LesonaAndroWidgetProps {
  title: string;
  date: string;
  category: string;
}

export function LesonaAndroWidget({ title, date, category }: LesonaAndroWidgetProps) {
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
        padding: 20,
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'column' }}>
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <TextWidget
            text={category?.toUpperCase() || 'ÉCOLE DU SABBAT'}
            style={{ fontSize: 9, color: '#3b82f6', fontWeight: 'bold' }}
          />
          <FlexWidget style={{ width: 30, height: 30, opacity: 0.3 }}>
             <ImageWidget 
              image={require('../assets/images/icon.png')} 
              imageWidth={30} 
              imageHeight={30} 
             />
          </FlexWidget>
        </FlexWidget>

        <TextWidget
          text={date}
          style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}
        />
        
        <TextWidget
          text={title || 'Chargement...'}
          style={{
            fontSize: 24,
            color: '#ffffff',
            fontWeight: 'bold',
            maxLines: 3,
            truncate: 'END',
          }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          backgroundColor: '#3b82f6',
          borderRadius: 100,
          paddingVertical: 12,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 16,
        }}
      >
        <TextWidget
          text="LIRE"
          style={{
            fontSize: 14,
            color: '#ffffff',
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
