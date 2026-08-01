// Theme context: exposes the active palette + the user's mode preference
// ('system' | 'light' | 'dark'), persisted across launches. Components consume
// it via useTheme() (values) or useThemedStyles() (memoised StyleSheet).

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightPalette, darkPalette } from './palettes';

const STORAGE_KEY = 'velodar.themeMode';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState('system'); // saved preference

  // Restore the saved preference once on mount.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
    });
  }, []);

  const setMode = (m) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  const resolved = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const palette = resolved === 'dark' ? darkPalette : lightPalette;

  const value = useMemo(
    () => ({ mode, setMode, resolved, palette }),
    [mode, resolved, palette]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// Build a themed StyleSheet from a module-level factory `(palette) => ({...})`.
// Memoised so styles only rebuild when the palette actually changes.
export function useThemedStyles(factory) {
  const { palette } = useTheme();
  return useMemo(() => factory(palette), [palette, factory]);
}
