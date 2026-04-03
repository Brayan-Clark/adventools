import React from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { usePathname } from 'expo-router';

export default function NotFoundScreen() {
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // We delay the 404 screen display for 1.5 seconds.
    // This allows our manual Redirector in _layout.tsx to handle 
    // any transit URLs (like music notifications) without showing 
    // the "Oops" error flicker.
    const timer = setTimeout(() => {
        setReady(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // For known transit URLs, never show the error screen
  if (pathname?.includes('notification') || pathname?.includes('click')) {
    return <View style={styles.container} />;
  }

  // If we are not ready, show nothing (prevents the flicker)
  if (!ready) {
    return <View style={styles.container} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
