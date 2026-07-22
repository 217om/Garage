import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { VerifiedBadge } from '@/components/verified-badge';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { initials, thumbColor } from '@/lib/util';
import { useApp } from '@/store/app-context';
import type { GoogleReview, InternalReview } from '@/types';

export default function GarageDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getGarage, reviewsFor, internalStats, user } = useApp();

  const garage = getGarage(id);
  if (!garage) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText>Garage not found.</ThemedText>
      </View>
    );
  }

  const stats = internalStats(garage.id);
  const reviews = reviewsFor(garage.id);

  const openMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${garage.lat},${garage.lng}`;
    Linking.openURL(url);
  };
  const callGarage = () => Linking.openURL(`tel:${garage.phone.replace(/\s/g, '')}`);

  const writeReview = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    router.push(`/review/${garage.id}`);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: garage.name }} />

      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: thumbColor(garage.id) }]}>
        <ThemedText style={styles.bannerInitials}>{initials(garage.name)}</ThemedText>
      </View>

      <View style={styles.titleRow}>
        <ThemedText type="subtitle" style={styles.title}>
          {garage.name}
        </ThemedText>
        <VerifiedBadge verified={garage.verified} size="md" />
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={15} color={theme.textSecondary} />
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {garage.area}
        </ThemedText>
      </View>

      {/* Quick actions */}
      <View style={styles.actions}>
        <Button title="Call" icon="call" variant="secondary" onPress={callGarage} fullWidth={false} style={styles.actionBtn} />
        <Button title="Directions" icon="navigate" variant="secondary" onPress={openMaps} fullWidth={false} style={styles.actionBtn} />
        <Button title="Review" icon="create" onPress={writeReview} fullWidth={false} style={styles.actionBtn} />
      </View>

      {/* Ratings summary */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.ratingCol}>
          <ThemedText type="small" style={styles.ratingLabel}>
            App rating
          </ThemedText>
          <ThemedText style={styles.bigNum}>{stats.count ? stats.avg.toFixed(1) : '—'}</ThemedText>
          <StarRating value={stats.avg} size={15} color={theme.tint} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {stats.count} review{stats.count === 1 ? '' : 's'}
          </ThemedText>
        </View>
        <View style={[styles.vDivider, { backgroundColor: theme.border }]} />
        <View style={styles.ratingCol}>
          <View style={styles.googleLabelRow}>
            <Ionicons name="logo-google" size={13} color={theme.google} />
            <ThemedText type="small" style={[styles.ratingLabel, { color: theme.google }]}>
              Google
            </ThemedText>
          </View>
          <ThemedText style={styles.bigNum}>{garage.googleRating.toFixed(1)}</ThemedText>
          <StarRating value={garage.googleRating} size={15} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {garage.googleRatingCount} on Google
          </ThemedText>
        </View>
      </View>

      {/* Details */}
      <Section title="Details">
        <InfoRow icon="business-outline" text={garage.address} theme={theme} />
        <Pressable onPress={callGarage}>
          <InfoRow icon="call-outline" text={garage.phone} theme={theme} link />
        </Pressable>
        <InfoRow icon="time-outline" text={garage.hours} theme={theme} />
      </Section>

      {/* Services */}
      <Section title="Services">
        <View style={styles.chipWrap}>
          {garage.services.map((s) => (
            <View key={s} style={[styles.tag, { backgroundColor: theme.muted }]}>
              <ThemedText type="small" style={{ color: theme.text }}>
                {s}
              </ThemedText>
            </View>
          ))}
        </View>
      </Section>

      {/* Location */}
      <Section title="Location">
        <Pressable
          onPress={openMaps}
          style={[styles.mapBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
          <Ionicons name="map" size={28} color={theme.tint} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {garage.lat.toFixed(4)}, {garage.lng.toFixed(4)}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.tint }}>
            Open in Google Maps →
          </ThemedText>
        </Pressable>
      </Section>

      {/* App reviews */}
      <Section
        title="App reviews"
        action={
          <Pressable onPress={writeReview}>
            <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
              + Write a review
            </ThemedText>
          </Pressable>
        }>
        {reviews.length === 0 ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            No app reviews yet. Be the first to review this garage!
          </ThemedText>
        ) : (
          reviews.map((r) => <InternalReviewRow key={r.id} review={r} theme={theme} />)
        )}
      </Section>

      {/* Google reviews — clearly labelled */}
      <Section
        title="Reviews from Google Maps"
        subtitle="Sourced from Google — not written in this app.">
        {garage.googleReviews.map((r, i) => (
          <GoogleReviewRow key={i} review={r} theme={theme} />
        ))}
      </Section>

      {!garage.verified && (
        <Pressable
          onPress={() => (user ? router.push(`/apply?garageId=${garage.id}`) : router.push('/login'))}
          style={[styles.ownerCta, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Ionicons name="briefcase-outline" size={18} color={theme.tint} />
          <ThemedText type="small" style={{ color: theme.text, flex: 1 }}>
            Are you the owner of this garage? Apply to get it verified.
          </ThemedText>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </Pressable>
      )}
    </ScrollView>
  );
}

type Theme = ReturnType<typeof useTheme>;

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12 }}>
              {subtitle}
            </ThemedText>
          )}
        </View>
        {action}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({
  icon,
  text,
  theme,
  link,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  theme: Theme;
  link?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.textSecondary} />
      <ThemedText type="small" style={{ color: link ? theme.tint : theme.text, flex: 1 }}>
        {text}
      </ThemedText>
    </View>
  );
}

function InternalReviewRow({ review, theme }: { review: InternalReview; theme: Theme }) {
  return (
    <View style={[styles.reviewRow, { borderColor: theme.border }]}>
      <View style={styles.reviewHead}>
        <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
          <ThemedText style={styles.avatarText}>{initials(review.userName)}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold" style={{ fontSize: 14 }}>
            {review.userName}
          </ThemedText>
          <StarRating value={review.rating} size={12} color={theme.tint} />
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>
          {new Date(review.createdAt).toLocaleDateString()}
        </ThemedText>
      </View>
      {!!review.text && (
        <ThemedText type="small" style={{ color: theme.text }}>
          {review.text}
        </ThemedText>
      )}
    </View>
  );
}

function GoogleReviewRow({ review, theme }: { review: GoogleReview; theme: Theme }) {
  return (
    <View style={[styles.reviewRow, { borderColor: theme.border }]}>
      <View style={styles.reviewHead}>
        <View style={[styles.avatar, { backgroundColor: theme.google }]}>
          <ThemedText style={styles.avatarText}>{initials(review.author)}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold" style={{ fontSize: 14 }}>
            {review.author}
          </ThemedText>
          <StarRating value={review.rating} size={12} />
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>
          {review.relativeTime}
        </ThemedText>
      </View>
      <ThemedText type="small" style={{ color: theme.text }}>
        {review.text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: {
    height: 120,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerInitials: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '800',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  title: { flex: 1, fontSize: 24, lineHeight: 30 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actionBtn: { flex: 1 },
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  ratingCol: { flex: 1, alignItems: 'center', gap: 4 },
  ratingLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  googleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bigNum: { fontSize: 32, fontWeight: '800', lineHeight: 36 },
  vDivider: { width: 1, marginHorizontal: Spacing.two },
  section: { marginTop: Spacing.four },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.two },
  sectionTitle: { fontSize: 16 },
  sectionBody: { gap: Spacing.two },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tag: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 999,
  },
  mapBox: {
    height: 120,
    borderRadius: Spacing.three,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  reviewRow: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  ownerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginTop: Spacing.four,
  },
});
