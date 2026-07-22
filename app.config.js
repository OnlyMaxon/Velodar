// Dynamic Expo config. Reads secrets from the environment (see .env.example)
// so keys aren't committed. Loaded automatically by Expo CLI; takes precedence
// over app.json.

// Load a local .env when running the CLI (harmless if the package is absent).
try {
  require('dotenv').config();
} catch (_) {
  /* dotenv is optional; EXPO_PUBLIC_* also work without it */
}

const GOOGLE_MAPS_ANDROID_API_KEY =
  process.env.GOOGLE_MAPS_ANDROID_API_KEY || '';

module.exports = () => ({
  expo: {
    name: 'Velodar',
    slug: 'velodar',
    scheme: 'velodar',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    assetBundlePatterns: ['**/*'],

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.velodar.app',
      infoPlist: {
        // Foreground-only tracking for MVP.
        NSLocationWhenInUseUsageDescription:
          'Velodar uses your location to show your position, nearby reports and your live speed.',
        UIBackgroundModes: [],
      },
    },

    android: {
      package: 'com.velodar.app',
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
      ],
      config: {
        googleMaps: {
          // Required for react-native-maps on Android.
          apiKey: GOOGLE_MAPS_ANDROID_API_KEY,
        },
      },
    },

    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Velodar uses your location to show your position, nearby reports and your live speed.',
          isAndroidForegroundServiceEnabled: false,
        },
      ],
    ],

    // Values surfaced to the app via expo-constants (Constants.expoConfig.extra).
    // Prefer EXPO_PUBLIC_* env vars in code; these are a fallback.
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },
});
