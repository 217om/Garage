import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AccountButton } from '@/components/account-button';
import { Chip } from '@/components/chip';
import { GarageCard } from '@/components/garage-card';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ALL_SERVICES } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/app-context';

export default function GaragesScreen() {
  const theme = useTheme();
  const { garages } = useApp();
  const [query, setQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [service, setService] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);

  const regions = useMemo(() => {
    const set = new Set(garages.map((g) => g.area.split(',').pop()!.trim()));
    return Array.from(set).sort();
  }, [garages]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return garages
      .filter((g) => (verifiedOnly ? g.verified : true))
      .filter((g) => (service ? g.services.includes(service) : true))
      .filter((g) => (region ? g.area.includes(region) : true))
      .filter((g) => {
        if (!q) return true;
        return (
          g.name.toLowerCase().includes(q) ||
          g.area.toLowerCase().includes(q) ||
          g.services.some((s) => s.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => Number(b.verified) - Number(a.verified) || b.googleRating - a.googleRating);
  }, [garages, query, verifiedOnly, service, region]);

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <AccountButton /> }} />
      <FlatList
        data={filtered}
        keyExtractor={(g) => g.id}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
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

            {/* Service filter */}
            <ThemedText type="smallBold" style={styles.filterLabel}>
              Service
            </ThemedText>
            <ChipRow>
              <Chip label="Any" selected={!service} onPress={() => setService(null)} />
              {ALL_SERVICES.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={service === s}
                  onPress={() => setService(service === s ? null : s)}
                />
              ))}
            </ChipRow>

            {/* Region filter */}
            <ThemedText type="smallBold" style={styles.filterLabel}>
              Region
            </ThemedText>
            <ChipRow>
              <Chip label="All Oman" selected={!region} onPress={() => setRegion(null)} />
              {regions.map((r) => (
                <Chip
                  key={r}
                  label={r}
                  selected={region === r}
                  onPress={() => setRegion(region === r ? null : r)}
                />
              ))}
            </ChipRow>

            <View style={styles.resultRow}>
              <Chip
                label="Verified only"
                selected={verifiedOnly}
                onPress={() => setVerifiedOnly((v) => !v)}
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
              No garages match your filters.
            </ThemedText>
          </View>
        }
      />
    </>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.three - 2,
    fontSize: 15,
    outlineStyle: 'none',
  } as any,
  filterLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
  },
  chipRow: {
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
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
