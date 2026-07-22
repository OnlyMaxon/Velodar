// Unobtrusive over-limit alert: a soft pulsing border/banner at the top of the
// screen. No sound on MVP (per spec). Mounted only while over the limit; a gentle
// looping opacity animation draws the eye without being aggressive.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export default function SpeedAlert({ visible, limitKmh = 25 }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View style={[styles.border, { opacity: pulse }]} />
      <Animated.View style={[styles.banner, { opacity: pulse }]}>
        <Text style={styles.bannerText}>
          ⚠ Przekraczasz {limitKmh} km/h
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 6,
    borderColor: '#ef4444',
    borderRadius: 0,
  },
  banner: {
    marginTop: 54,
    backgroundColor: 'rgba(185,28,28,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  bannerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
