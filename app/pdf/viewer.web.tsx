import React from 'react';
import { View } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';


export default function PdfViewer() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
      <Text style={{ color: '#fff' }}>Le lecteur PDF n'est pas disponible sur le web.</Text>
    </View>
  );
}
