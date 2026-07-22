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

export default function AddReportModal({ visible, coords, onClose, onSubmit }) {
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);

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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
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
    backgroundColor: '#e5e7eb',
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 18 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  card: {
    flex: 1,
    aspectRatio: 0.9,
    borderWidth: 2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#fff',
  },
  cardPressed: { backgroundColor: '#f9fafb', transform: [{ scale: 0.97 }] },
  cardDisabled: { opacity: 0.5 },
  cardEmoji: { fontSize: 34, marginBottom: 8 },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  cancel: { marginTop: 18, alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
});
