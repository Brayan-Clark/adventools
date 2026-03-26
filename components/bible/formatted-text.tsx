import React from 'react';
import { Text, TextStyle } from 'react-native';

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

  const words = text.split(' ');
  let inTag = false;
  let inJesus = false;

  return (
    <Text style={style}>
      {words.map((word, idx) => {
        const segments = word.split(/(<n>|<\/n>|<pb>|<\/pb>|<br\/?>|<J>|<\/J>)/g);
        return (
          <React.Fragment key={idx}>
            {segments.map((seg, sIdx) => {
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
              if (!seg) return null;

              return (
                <Text
                  key={sIdx}
                  style={{
                    color: inJesus ? '#f87171' : inTag ? '#93c5fd' : baseColor,
                    fontWeight: (inTag || inJesus) ? 'bold' : 'normal',
                    fontStyle: inTag ? 'italic' : 'normal',
                    fontSize: inTag ? baseFontSize * 0.85 : baseFontSize
                  }}
                >
                  {seg}
                </Text>
              );
            })}
            <Text>{" "}</Text>
          </React.Fragment>
        );
      })}
    </Text>
  );
};
