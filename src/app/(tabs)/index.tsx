import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { GarageCard } from '@/components/garage-card';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/app-context';

export default function GaragesScreen() {
  const theme = useTheme();
  const { garages } = useApp();
  const [query, setQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return garages
      .filter((g) => (verifiedOnly ? g.verified : true))
      .filter((g) => {
        if (!q) return true;
        return (
          g.name.toLowerCase().includes(q) ||
          g.area.toLowerCase().includes(q) ||
          g.services.some((s) => s.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => Number(b.verified) - Number(a.verified) || b.googleRating - a.googleRating);
  }, [garages, query, verifiedOnly]);

  return (
    <FlatList
      data={filtered}
      keyExtractor={(g) => g.id}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.h1}>
            Find a trusted garage in Oman
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Real reviews from drivers — not just word of mouth.
          </ThemedText>

          <View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search name, area or service"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.textSecondary}
                onPress={() => setQuery('')}
              />
            )}
          </View>

          <View style={styles.filterRow}>
            <Chip label="All garages" selected={!verifiedOnly} onPress={() => setVerifiedOnly(false)} />
            <Chip
              label="Verified only"
              selected={verifiedOnly}
              onPress={() => setVerifiedOnly(true)}
            />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 'auto' }}>
              {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </ThemedText>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.cardWrap}>
          <GarageCard garage={item} />
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={40} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            No garages match your search.
          </ThemedText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  h1: {
    fontSize: 26,
    lineHeight: 32,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.three - 2,
    fontSize: 15,
    outlineStyle: 'none',
  } as any,
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  cardWrap: {
    paddingVertical: Spacing.one,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
});
