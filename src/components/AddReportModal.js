// Modal for creating a report. Type picker only — the location is taken from the
// user's current position by the caller (passed in as `coords` for display).

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { REPORT_TYPES } from '../constants/reportTypes';
import { useThemedStyles } from '../theme/ThemeProvider';

export default function AddReportModal({ visible, coords, onClose, onSubmit }) {
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const styles = useThemedStyles(makeStyles);

  const close = () => {
    setSelected(null);
    setSubmitting(false);
    onClose();
  };

  const submit = async (typeId) => {
    if (submitting) return;
    setSelected(typeId);
    setSubmitting(true);
    try {
      await onSubmit(typeId);
      close();
    } catch (e) {
      setSubmitting(false);
      setSelected(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close}>
        {/* Stop propagation so taps inside the sheet don't dismiss it. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Zgłoś posterunek</Text>
          <Text style={styles.subtitle}>
            {coords
              ? 'Lokalizacja: Twoja obecna pozycja'
              : 'Czekam na lokalizację…'}
          </Text>

          <View style={styles.grid}>
            {REPORT_TYPES.map((t) => {
              const isBusy = submitting && selected === t.id;
              return (
                <Pressable
                  key={t.id}
                  disabled={!coords || submitting}
                  onPress={() => submit(t.id)}
                  style={({ pressed }) => [
                    styles.card,
                    { borderColor: t.color },
                    pressed && styles.cardPressed,
                    (!coords || submitting) && styles.cardDisabled,
                  ]}
                >
                  {isBusy ? (
                    <ActivityIndicator color={t.color} />
                  ) : (
                    <Text style={styles.cardEmoji}>{t.emoji}</Text>
                  )}
                  <Text style={styles.cardLabel}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.cancel} onPress={close}>
            <Text style={styles.cancelText}>Anuluj</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.backdrop,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 32,
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.border,
      marginBottom: 14,
    },
    title: { fontSize: 20, fontWeight: '800', color: c.text },
    subtitle: { fontSize: 13, color: c.textMuted, marginTop: 4, marginBottom: 18 },
    grid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    card: {
      flex: 1,
      aspectRatio: 0.9,
      borderWidth: 2,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
      backgroundColor: c.surfaceAlt,
    },
    cardPressed: { backgroundColor: c.chipBg, transform: [{ scale: 0.97 }] },
    cardDisabled: { opacity: 0.5 },
    cardEmoji: { fontSize: 34, marginBottom: 8 },
    cardLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
    },
    cancel: { marginTop: 18, alignItems: 'center', paddingVertical: 12 },
    cancelText: { fontSize: 15, fontWeight: '600', color: c.textMuted },
  });
