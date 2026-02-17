import React from 'react';
import { View, Text } from 'react-native';

export default function PdfViewer() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
      <Text style={{ color: '#fff' }}>Le lecteur PDF n'est pas disponible sur le web.</Text>
    </View>
  );
}
