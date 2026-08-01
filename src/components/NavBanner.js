// NavBanner — the top "next maneuver" card shown while navigating. Displays a
// directional icon, distance to the turn and the ORS instruction text. Purely
// presentational; the progress object is computed in MapScreen via
// routeProgress().

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistance } from '../utils/geo';

// ORS maneuver type (0–13) → Ionicons arrow. Kept coarse: left/right/straight
// cover the common cases; roundabouts and U-turns get their own glyphs.
const TURN_ICON = {
  0: 'arrow-back', // left
  1: 'arrow-forward', // right
  2: 'arrow-back', // sharp left
  3: 'arrow-forward', // sharp right
  4: 'arrow-back', // slight left
  5: 'arrow-forward', // slight right
  6: 'arrow-up', // straight
  7: 'sync', // enter roundabout
  8: 'sync', // exit roundabout
  9: 'arrow-undo', // u-turn
  10: 'flag', // goal
  11: 'navigate', // depart
  12: 'arrow-back', // keep left
  13: 'arrow-forward', // keep right
};

export default function NavBanner({ progress }) {
  if (!progress?.upcomingStep) return null;

  const { upcomingStep, distToManeuver } = progress;
  const icon = TURN_ICON[upcomingStep.type] ?? 'arrow-up';

  return (
    <SafeAreaView style={styles.wrap} pointerEvents="none" edges={['top']}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={28} color="#fff" />
        </View>
        <View style={styles.body}>
          <Text style={styles.dist}>{formatDistance(distToManeuver)}</Text>
          <Text style={styles.instruction} numberOfLines={2}>
            {upcomingStep.instruction}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    marginTop: 52,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  dist: { fontSize: 22, fontWeight: '900', color: '#fff' },
  instruction: { fontSize: 14, fontWeight: '600', color: '#e0e7ff', marginTop: 1 },
});
