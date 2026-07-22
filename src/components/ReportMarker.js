// A single report marker (emoji pin) for react-native-maps.
//
// tracksViewChanges is expensive (re-renders the marker as a bitmap on every
// change). We keep it on briefly so the custom emoji view rasterises correctly
// on Android, then switch it off for smooth panning.

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { getReportType } from '../constants/reportTypes';

export default function ReportMarker({ report, onPress }) {
  const [tracks, setTracks] = useState(true);
  const type = getReportType(report.type);

  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: report.lat, longitude: report.lng }}
      onPress={() => onPress(report)}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.pin}>
        <View style={[styles.bubble, { backgroundColor: type?.color ?? '#111' }]}>
          <Text style={styles.emoji}>{type?.emoji ?? '📍'}</Text>
        </View>
        <View style={[styles.tail, { borderTopColor: type?.color ?? '#111' }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: { alignItems: 'center' },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  emoji: { fontSize: 20 },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
