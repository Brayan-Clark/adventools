import React from 'react';
import { TextStyle } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';


interface FormattedBibleTextProps {
  text: string;
  style?: TextStyle;
  baseFontSize: number;
  baseColor?: string;
}

export const FormattedBibleText: React.FC<FormattedBibleTextProps> = ({ 
  text, 
  style, 
  baseFontSize,
  baseColor = '#cbd5e1'
}) => {
  if (!text) return null;

  // Split by tags, keeping the tags in the array
  const segments = text.split(/(<n>|<\/n>|<pb>|<\/pb>|<br\/?>|<J>|<\/J>)/g);
  let inTag = false;
  let inJesus = false;

  return (
    <Text style={style}>
      {segments.map((seg, sIdx) => {
        if (!seg) return null;
        
        if (seg === '<n>') {
          inTag = true;
          return <Text key={sIdx}>{"\n"}</Text>;
        }
        if (seg === '</n>') {
          inTag = false;
          return <Text key={sIdx}>{"\n"}</Text>;
        }
        if (seg === '<pb>' || seg === '</pb>' || seg === '<br>' || seg === '<br/>') {
          return <Text key={sIdx}>{"\n"}</Text>;
        }
        if (seg === '<J>') {
          inJesus = true;
          return null;
        }
        if (seg === '</J>') {
          inJesus = false;
          return null;
        }

        return (
          <Text
            key={sIdx}
            style={{
              color: inJesus ? '#f87171' : inTag ? '#93c5fd' : baseColor,
              fontWeight: (inTag || inJesus) ? 'bold' : 'normal',
              fontStyle: inTag ? 'italic' : 'normal',
              fontSize: inTag ? baseFontSize * 0.85 : baseFontSize,
            }}
          >
            {seg}
          </Text>
        );
      })}
    </Text>
  );
};
