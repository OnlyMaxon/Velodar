// ProximityBanner — the Waze-style "heads up, something ahead" card.
// Slides down from the top when approaching a report, shows the type + live
// distance, and gently pulses. Purely presentational; logic lives in
// useProximityAlerts.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getReportType } from '../constants/reportTypes';

export default function ProximityBanner({ approaching }) {
  const y = useRef(new Animated.Value(-160)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (approaching) {
      Animated.spring(y, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
        tension: 80,
      }).start();
    } else {
      y.setValue(-160); // reset so the next appearance slides in fresh
    }
  }, [approaching, y]);

  useEffect(() => {
    if (!approaching) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [approaching, pulse]);

  if (!approaching) return null;

  const type = getReportType(approaching.report.type);
  const meters = Math.round(approaching.distance);

  return (
    <SafeAreaView style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.card, { transform: [{ translateY: y }] }]}>
        <Animated.View
          style={[styles.icon, { backgroundColor: type?.color ?? '#111', opacity: pulse }]}
        >
          <Text style={styles.emoji}>{type?.emoji ?? '📍'}</Text>
        </Animated.View>

        <View style={styles.body}>
          <Text style={styles.title}>{type?.label ?? 'Zgłoszenie'} przed Tobą</Text>
          <Text style={styles.dist}>za {meters} m</Text>
        </View>

        <Ionicons name="chevron-up" size={22} color={type?.color ?? '#111'} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 60, // sit below the top bar
    minWidth: 240,
    maxWidth: '92%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 16,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: '#111827' },
  dist: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginTop: 1 },
});
