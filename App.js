import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ensureSession } from './src/services/supabase';
import MapScreen from './src/screens/MapScreen';

export default function App() {
  // Establish an (anonymous) session as early as possible so RPC/Realtime
  // calls made by the map are authenticated.
  useEffect(() => {
    ensureSession();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <MapScreen />
    </SafeAreaProvider>
  );
}
