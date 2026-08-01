import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ensureSession } from './src/services/supabase';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import MapScreen from './src/screens/MapScreen';

function Root() {
  const { resolved } = useTheme();
  return (
    <>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <MapScreen />
    </>
  );
}

export default function App() {
  // Establish an (anonymous) session as early as possible so RPC/Realtime
  // calls made by the map are authenticated.
  useEffect(() => {
    ensureSession();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
