// Supabase client for React Native (bare workflow).
//
// Notes for RN:
// - `react-native-url-polyfill` MUST be imported before the client is created
//   (supabase-js relies on the WHATWG URL API which RN lacks).
// - AsyncStorage persists the auth session across app restarts.
// - `detectSessionInUrl` is disabled — there is no browser URL on native.
//
// Config comes from Expo public env vars (app.config.js -> extra), so keys are
// not hard-coded. See .env.example.

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra =
  Constants.expoConfig?.extra ??
  Constants.manifest2?.extra?.expoClient?.extra ??
  {};

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loud in dev — a silent undefined URL produces confusing network errors.
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your project keys.'
  );
}

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep the auth token fresh only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// Ensure there is a session. We use anonymous auth so every device gets a
// stable user id (needed for one-vote-per-user) without a signup flow.
// Requires "Allow anonymous sign-ins" enabled in Supabase Auth settings.
export async function ensureSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[supabase] anonymous sign-in failed:', error.message);
    return null;
  }
  return data.session;
}
