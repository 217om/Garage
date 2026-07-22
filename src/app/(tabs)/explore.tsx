import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { GarageCard } from '@/components/garage-card';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ALL_SERVICES } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/app-context';

export default function ExploreScreen() {
  const theme = useTheme();
  const { garages } = useApp();
  const [service, setService] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);

  const areas = useMemo(() => {
    const set = new Set(garages.map((g) => g.area.split(',').pop()!.trim()));
    return Array.from(set).sort();
  }, [garages]);

  const filtered = useMemo(() => {
    return garages
      .filter((g) => (service ? g.services.includes(service) : true))
      .filter((g) => (area ? g.area.includes(area) : true))
      .sort((a, b) => b.googleRating - a.googleRating);
  }, [garages, service, area]);

  return (
    <FlatList
      data={filtered}
      keyExtractor={(g) => g.id}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.header}>
          <ThemedText type="smallBold" style={styles.section}>
            Service
          </ThemedText>
          <View style={styles.chipWrap}>
            <Chip label="Any" selected={!service} onPress={() => setService(null)} />
            {ALL_SERVICES.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={service === s}
                onPress={() => setService(service === s ? null : s)}
              />
            ))}
          </View>

          <ThemedText type="smallBold" style={styles.section}>
            Region
          </ThemedText>
          <View style={styles.chipWrap}>
            <Chip label="All Oman" selected={!area} onPress={() => setArea(null)} />
            {areas.map((a) => (
              <Chip
                key={a}
                label={a}
                selected={area === a}
                onPress={() => setArea(area === a ? null : a)}
              />
            ))}
          </View>

          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.two }}>
            {filtered.length} garage{filtered.length === 1 ? '' : 's'}
          </ThemedText>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.cardWrap}>
          <GarageCard garage={item} />
        </View>
      )}
      ListEmptyComponent={
        <ThemedText type="small" style={{ color: theme.textSecondary, padding: Spacing.four }}>
          No garages match these filters.
        </ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.two,
  },
  section: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.two,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cardWrap: {
    paddingVertical: Spacing.one,
  },
});
