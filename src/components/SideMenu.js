// SideMenu — Waze-style slide-in drawer.
//
// Fully functional:
//  - Filters: toggle each report type; hidden types disappear from the map.
//  - Speed: pick the limit (20/25/30) and turn the over-limit alert on/off —
//    both feed straight into useSpeedTracking.
//  - Stats: live count of visible reports nearby, by type.
//  - About: version / blurb.

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { REPORT_TYPES } from '../constants/reportTypes';

const PANEL_W = Math.min(320, Dimensions.get('window').width * 0.84);
const LIMIT_OPTIONS = [20, 25, 30];

function Section({ icon, title, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={16} color="#6b7280" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function SideMenu({
  visible,
  onClose,
  filters,
  onToggleFilter,
  settings,
  onChangeSettings,
  reports,
}) {
  const tx = useRef(new Animated.Value(-PANEL_W)).current;

  useEffect(() => {
    Animated.timing(tx, {
      toValue: visible ? 0 : -PANEL_W,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, tx]);

  // Live per-type counts of currently visible reports.
  const counts = REPORT_TYPES.reduce((acc, t) => {
    acc[t.id] = reports.filter((r) => r.type === t.id).length;
    return acc;
  }, {});
  const total = reports.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.panel, { transform: [{ translateX: tx }] }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Ionicons name="bicycle" size={26} color="#fff" />
            </View>
            <View>
              <Text style={styles.brand}>Velodar</Text>
              <Text style={styles.tagline}>Rowerowy radar społeczności</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Filters */}
            <Section icon="funnel-outline" title="Filtry na mapie">
              {REPORT_TYPES.map((t) => (
                <View key={t.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.dot, { backgroundColor: t.color }]}>
                      <Text style={styles.dotEmoji}>{t.emoji}</Text>
                    </View>
                    <Text style={styles.rowLabel}>{t.label}</Text>
                  </View>
                  <Switch
                    value={!!filters[t.id]}
                    onValueChange={() => onToggleFilter(t.id)}
                    trackColor={{ true: t.color, false: '#e5e7eb' }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </Section>

            {/* Speed */}
            <Section icon="speedometer-outline" title="Prędkość">
              <Text style={styles.subLabel}>Limit prędkości</Text>
              <View style={styles.chips}>
                {LIMIT_OPTIONS.map((v) => {
                  const active = settings.limitKmh === v;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => onChangeSettings({ limitKmh: v })}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {v} km/h
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={[styles.row, { marginTop: 6 }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="warning-outline" size={20} color="#dc2626" />
                  <Text style={styles.rowLabel}>Alert przekroczenia</Text>
                </View>
                <Switch
                  value={!!settings.alertEnabled}
                  onValueChange={(v) => onChangeSettings({ alertEnabled: v })}
                  trackColor={{ true: '#dc2626', false: '#e5e7eb' }}
                  thumbColor="#fff"
                />
              </View>
            </Section>

            {/* Stats */}
            <Section icon="stats-chart-outline" title="W pobliżu">
              <View style={styles.statBig}>
                <Text style={styles.statNumber}>{total}</Text>
                <Text style={styles.statCaption}>aktywnych zgłoszeń (≈15 km)</Text>
              </View>
              {REPORT_TYPES.map((t) => (
                <View key={t.id} style={styles.statRow}>
                  <Text style={styles.statEmoji}>{t.emoji}</Text>
                  <Text style={styles.statLabel}>{t.label}</Text>
                  <Text style={[styles.statCount, { color: t.color }]}>
                    {counts[t.id]}
                  </Text>
                </View>
              ))}
            </Section>

            {/* About */}
            <Section icon="information-circle-outline" title="O aplikacji">
              <Text style={styles.about}>
                Velodar — „Waze dla rowerzystów". Zgłaszaj patrole, fotoradary i
                kontrole e-bike, śledź swoją prędkość na żywo.
              </Text>
              <Text style={styles.version}>Wersja 0.1.0 · MVP</Text>
            </Section>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: PANEL_W,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontSize: 20, fontWeight: '900', color: '#111827' },
  tagline: { fontSize: 12, color: '#6b7280', marginTop: 1 },

  section: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEmoji: { fontSize: 15 },

  subLabel: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  chipTextActive: { color: '#2563eb' },

  statBig: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: { fontSize: 30, fontWeight: '900', color: '#2563eb' },
  statCaption: { fontSize: 12, color: '#6b7280' },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  statEmoji: { fontSize: 18 },
  statLabel: { flex: 1, fontSize: 14, color: '#374151' },
  statCount: { fontSize: 16, fontWeight: '800' },

  about: { fontSize: 13, color: '#4b5563', lineHeight: 19 },
  version: { fontSize: 12, color: '#9ca3af', marginTop: 10, marginBottom: 6 },
});
