// SideMenu — Waze-style slide-in drawer.
//
// Fully functional:
//  - Filters: toggle each report type; hidden types disappear from the map.
//  - Speed: pick the limit (20/25/30) and turn the over-limit alert on/off.
//  - Wygląd: theme selector (system / light / dark) — feeds the ThemeProvider.
//  - Radar: proximity alert toggle.
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
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';

const PANEL_W = Math.min(320, Dimensions.get('window').width * 0.84);
const LIMIT_OPTIONS = [20, 25, 30];
const THEME_OPTIONS = [
  { id: 'system', label: 'Systemowy', icon: 'phone-portrait-outline' },
  { id: 'light', label: 'Jasny', icon: 'sunny-outline' },
  { id: 'dark', label: 'Ciemny', icon: 'moon-outline' },
];

// Titled group; themed on its own so it stays a stable module-level component.
function Section({ icon, title, children }) {
  const { palette: c } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={16} color={c.textMuted} />
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
  const { mode, setMode, palette: c } = useTheme();
  const styles = useThemedStyles(makeStyles);

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
                    trackColor={{ true: t.color, false: c.switchOff }}
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
                  <Ionicons name="warning-outline" size={20} color={c.danger} />
                  <Text style={styles.rowLabel}>Alert przekroczenia</Text>
                </View>
                <Switch
                  value={!!settings.alertEnabled}
                  onValueChange={(v) => onChangeSettings({ alertEnabled: v })}
                  trackColor={{ true: c.danger, false: c.switchOff }}
                  thumbColor="#fff"
                />
              </View>
            </Section>

            {/* Appearance / theme */}
            <Section icon="contrast-outline" title="Wygląd">
              <View style={styles.chips}>
                {THEME_OPTIONS.map((o) => {
                  const active = mode === o.id;
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => setMode(o.id)}
                      style={[styles.themeChip, active && styles.chipActive]}
                    >
                      <Ionicons
                        name={o.icon}
                        size={17}
                        color={active ? c.primary : c.textMuted}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          styles.themeChipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {o.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            {/* Radar */}
            <Section icon="radio-outline" title="Radar">
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons name="notifications-outline" size={20} color={c.primary} />
                  <Text style={styles.rowLabel}>Alert o zbliżaniu</Text>
                </View>
                <Switch
                  value={!!settings.proximityEnabled}
                  onValueChange={(v) => onChangeSettings({ proximityEnabled: v })}
                  trackColor={{ true: c.primary, false: c.switchOff }}
                  thumbColor="#fff"
                />
              </View>
              <Text style={styles.hint}>
                Wibracja i baner, gdy zbliżasz się do zgłoszenia (~400 m).
              </Text>
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

const makeStyles = (c) =>
  StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.backdrop },
    panel: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: PANEL_W,
      backgroundColor: c.surface,
      shadowColor: '#000',
      shadowOpacity: c.isDark ? 0.5 : 0.2,
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
      borderBottomColor: c.borderFaint,
    },
    logo: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brand: { fontSize: 20, fontWeight: '900', color: c.text },
    tagline: { fontSize: 12, color: c.textMuted, marginTop: 1 },

    section: {
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: c.borderFaint,
    },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textMuted,
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
    rowLabel: { fontSize: 15, color: c.text, fontWeight: '500' },
    dot: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotEmoji: { fontSize: 15 },

    subLabel: { fontSize: 13, color: c.textMuted, marginBottom: 8 },
    chips: { flexDirection: 'row', gap: 8 },
    chip: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
    },
    themeChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      gap: 3,
    },
    themeChipText: { fontSize: 12 },
    chipActive: { borderColor: c.primary, backgroundColor: c.primarySoft },
    chipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
    chipTextActive: { color: c.primary },

    statBig: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 10,
    },
    statNumber: { fontSize: 30, fontWeight: '900', color: c.primary },
    statCaption: { fontSize: 12, color: c.textMuted },
    statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
    statEmoji: { fontSize: 18 },
    statLabel: { flex: 1, fontSize: 14, color: c.text },
    statCount: { fontSize: 16, fontWeight: '800' },

    hint: { fontSize: 12, color: c.textFaint, marginTop: 8, lineHeight: 16 },
    about: { fontSize: 13, color: c.textMuted, lineHeight: 19 },
    version: { fontSize: 12, color: c.textFaint, marginTop: 10, marginBottom: 6 },
  });
