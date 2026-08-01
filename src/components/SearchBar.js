// SearchBar — the top "Dokąd jedziesz?" search field with an autocomplete
// dropdown. Presentational: query text, results and loading come from useSearch
// in MapScreen; selecting a row bubbles up via onSelect.

import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';

export default function SearchBar({
  query,
  onChangeQuery,
  results,
  loading,
  onSelect,
  onClear,
}) {
  const { palette: c } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const hasText = query.trim().length > 0;
  const showResults = hasText && results.length > 0;

  return (
    <SafeAreaView style={styles.wrap} pointerEvents="box-none" edges={['top']}>
      <View style={styles.bar}>
        <Ionicons name="search" size={18} color={c.textMuted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Dokąd jedziesz?"
          placeholderTextColor={c.textFaint}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="never"
          keyboardAppearance={c.isDark ? 'dark' : 'light'}
        />
        {loading ? (
          <ActivityIndicator size="small" color={c.primary} />
        ) : hasText ? (
          <Pressable onPress={onClear} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={c.textFaint} />
          </Pressable>
        ) : null}
      </View>

      {showResults && (
        <View style={styles.results}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => onSelect(item)}
              >
                <Ionicons name="location-outline" size={18} color={c.primary} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!!item.subtitle && (
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  )}
                </View>
              </Pressable>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: 0,
      left: 12,
      right: 12,
      marginTop: 52, // clear the menu/speed top bar
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 48,
      shadowColor: '#000',
      shadowOpacity: c.isDark ? 0.4 : 0.14,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },
    input: { flex: 1, fontSize: 16, color: c.text, padding: 0 },
    results: {
      marginTop: 8,
      backgroundColor: c.surface,
      borderRadius: 14,
      overflow: 'hidden',
      maxHeight: 260,
      shadowColor: '#000',
      shadowOpacity: c.isDark ? 0.4 : 0.14,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderFaint,
    },
    rowPressed: { backgroundColor: c.primarySoft },
    rowText: { flex: 1 },
    rowTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    rowSub: { fontSize: 12.5, color: c.textMuted, marginTop: 1 },
  });
