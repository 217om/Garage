import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { VerifiedBadge } from '@/components/verified-badge';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { initials, thumbColor } from '@/lib/util';
import { useApp } from '@/store/app-context';
import type { Garage } from '@/types';

export function GarageCard({ garage }: { garage: Garage }) {
  const theme = useTheme();
  const router = useRouter();
  const { internalStats } = useApp();
  const stats = internalStats(garage.id);

  return (
    <Pressable
      onPress={() => router.push(`/garage/${garage.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.thumb, { backgroundColor: thumbColor(garage.id) }]}>
        <ThemedText style={styles.thumbText}>{initials(garage.name)}</ThemedText>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
            {garage.name}
          </ThemedText>
          <VerifiedBadge verified={garage.verified} />
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={theme.textSecondary} />
          <ThemedText type="small" numberOfLines={1} style={{ color: theme.textSecondary, flex: 1 }}>
            {garage.area}
          </ThemedText>
        </View>

        <ThemedText type="small" numberOfLines={1} style={{ color: theme.textSecondary }}>
          {garage.services.slice(0, 3).join(' · ')}
        </ThemedText>

        <View style={styles.ratingsRow}>
          <View style={styles.ratingItem}>
            <StarRating value={garage.googleRating} size={13} />
            <ThemedText type="small" style={styles.ratingNum}>
              {garage.googleRating.toFixed(1)}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>
              Google
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.ratingItem}>
            <StarRating value={stats.avg} size={13} color={theme.tint} />
            <ThemedText type="small" style={styles.ratingNum}>
              {stats.count ? stats.avg.toFixed(1) : '—'}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>
              App
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 14,
  },
});
