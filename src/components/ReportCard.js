// Bottom card for a tapped report. We use a card (not a Marker Callout) because
// Callout button presses are unreliable on Android; a card gives dependable
// "actual" / "gone" voting like Waze's confirm/close.

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getReportType } from '../constants/reportTypes';
import { formatAge } from '../utils/geo';
import { useThemedStyles } from '../theme/ThemeProvider';

export default function ReportCard({ report, onVote, onClose }) {
  const [busy, setBusy] = useState(null); // 'up' | 'down' | null
  const styles = useThemedStyles(makeStyles);
  if (!report) return null;

  const type = getReportType(report.type);
  const myVote = report.my_vote; // 'up' | 'down' | null

  const vote = async (v) => {
    if (busy) return;
    setBusy(v);
    try {
      await onVote(report.id, v);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.card}>
      <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: type?.color ?? '#111' }]}>
          <Text style={styles.icon}>{type?.emoji ?? '📍'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{type?.label ?? 'Zgłoszenie'}</Text>
          <Text style={styles.meta}>
            {formatAge(report.created_at)}
            {report.distance_m != null
              ? ` · ${Math.round(report.distance_m)} m`
              : ''}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => vote('up')}
          disabled={!!busy}
          style={({ pressed }) => [
            styles.btn,
            styles.btnUp,
            myVote === 'up' && styles.btnUpActive,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={[styles.btnText, myVote === 'up' && styles.btnTextActive]}>
            👍 Aktualne · {report.upvotes ?? 0}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => vote('down')}
          disabled={!!busy}
          style={({ pressed }) => [
            styles.btn,
            styles.btnDown,
            myVote === 'down' && styles.btnDownActive,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={[styles.btnText, myVote === 'down' && styles.btnTextActive]}>
            👎 Już nie ma · {report.downvotes ?? 0}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    card: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 24,
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: c.isDark ? 0.5 : 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    close: { position: 'absolute', top: 10, right: 12, padding: 6, zIndex: 2 },
    closeText: { fontSize: 16, color: c.textFaint, fontWeight: '700' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: { fontSize: 24 },
    title: { fontSize: 17, fontWeight: '800', color: c.text },
    meta: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    actions: { flexDirection: 'row', gap: 10 },
    btn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1.5,
    },
    btnUp: { borderColor: c.success, backgroundColor: c.successSoft },
    btnUpActive: { backgroundColor: c.success },
    btnDown: { borderColor: c.danger, backgroundColor: c.dangerSoft },
    btnDownActive: { backgroundColor: c.danger },
    btnPressed: { opacity: 0.75 },
    btnText: { fontSize: 13, fontWeight: '700', color: c.text },
    btnTextActive: { color: '#fff' },
  });
