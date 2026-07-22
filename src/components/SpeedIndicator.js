// Speed readout badge shown on the map. Turns red-ish when over the limit.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SpeedIndicator({ speedKmh, isOverLimit, limitKmh }) {
  return (
    <View style={[styles.wrap, isOverLimit && styles.wrapAlert]}>
      <Text style={[styles.value, isOverLimit && styles.valueAlert]}>
        {Math.round(speedKmh)}
      </Text>
      <Text style={[styles.unit, isOverLimit && styles.valueAlert]}>km/h</Text>
      <View style={styles.limitBadge}>
        <Text style={styles.limitText}>{limitKmh}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 84,
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.88)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  wrapAlert: {
    backgroundColor: 'rgba(185,28,28,0.92)',
  },
  value: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 36,
  },
  valueAlert: { color: '#fff' },
  unit: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -2,
  },
  limitBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitText: { fontSize: 11, fontWeight: '800', color: '#111827' },
});
