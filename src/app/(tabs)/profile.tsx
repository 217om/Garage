import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { initials } from '@/lib/util';
import { useApp } from '@/store/app-context';
import type { ApplicationStatus } from '@/types';

const ROLE_LABEL = { user: 'Driver', owner: 'Garage owner', admin: 'Administrator' };
const STATUS_COLOR: Record<ApplicationStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout, reviews, applications, getGarage, resetDemo } = useApp();

  if (!user) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <View style={styles.guest}>
          <View style={[styles.logo, { backgroundColor: theme.tint }]}>
            <Ionicons name="person-outline" size={30} color={theme.tintText} />
          </View>
          <ThemedText type="subtitle" style={styles.guestTitle}>
            You&apos;re browsing as a guest
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
            Sign in to write reviews, or claim and verify your garage.
          </ThemedText>
          <Button title="Sign in / Create account" icon="log-in" onPress={() => router.push('/login')} />
          <Button
            title="Reset demo data"
            variant="outline"
            icon="refresh"
            onPress={resetDemo}
          />
        </View>
      </ScrollView>
    );
  }

  const myReviews = reviews.filter((r) => r.userId === user.id);
  const myApplications = applications.filter((a) => a.applicantId === user.id);
  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const ownedGarage = user.ownedGarageId ? getGarage(user.ownedGarageId) : undefined;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {/* Identity card */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
          <ThemedText style={styles.avatarText}>{initials(user.name)}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold" style={{ fontSize: 17 }}>
            {user.name}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {user.email}
          </ThemedText>
          <View style={[styles.rolePill, { backgroundColor: theme.tint + '1F' }]}>
            <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700', fontSize: 12 }}>
              {ROLE_LABEL[user.role]}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Admin */}
      {user.role === 'admin' && (
        <RowLink
          icon="shield-checkmark"
          title="Verification requests"
          subtitle={`${pendingCount} pending application${pendingCount === 1 ? '' : 's'}`}
          onPress={() => router.push('/admin')}
          theme={theme}
          badge={pendingCount || undefined}
        />
      )}

      {/* Owner */}
      {user.role === 'owner' && (
        <>
          {ownedGarage ? (
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="checkmark-circle" size={22} color={theme.success} />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">You manage {ownedGarage.name}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  This garage is verified.
                </ThemedText>
              </View>
              <Button
                title="View"
                variant="secondary"
                fullWidth={false}
                onPress={() => router.push(`/garage/${ownedGarage.id}`)}
              />
            </View>
          ) : (
            <RowLink
              icon="briefcase"
              title="Verify your garage"
              subtitle="Submit an application to claim a garage"
              onPress={() => router.push('/apply')}
              theme={theme}
            />
          )}

          {myApplications.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                My applications
              </ThemedText>
              {myApplications.map((a) => (
                <View
                  key={a.id}
                  style={[styles.appRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <ThemedText type="small" style={{ flex: 1 }}>
                    {a.garageName}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: theme[STATUS_COLOR[a.status]], fontWeight: '700', textTransform: 'capitalize' }}>
                    {a.status}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Driver reviews */}
      {user.role !== 'admin' && (
        <RowLink
          icon="star"
          title="My reviews"
          subtitle={`${myReviews.length} review${myReviews.length === 1 ? '' : 's'} written`}
          theme={theme}
        />
      )}

      <View style={{ marginTop: Spacing.four, gap: Spacing.two }}>
        <Button title="Sign out" variant="outline" icon="log-out" onPress={logout} />
        <Button title="Reset demo data" variant="outline" icon="refresh" onPress={resetDemo} />
      </View>
    </ScrollView>
  );
}

function RowLink({
  icon,
  title,
  subtitle,
  onPress,
  theme,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  theme: ReturnType<typeof useTheme>;
  badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.rowLink, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: theme.muted }]}>
        <Ionicons name={icon} size={18} color={theme.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12 }}>
          {subtitle}
        </ThemedText>
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: theme.danger }]}>
          <ThemedText style={styles.badgeText}>{badge}</ThemedText>
        </View>
      ) : null}
      {onPress && <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  guest: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.six, paddingHorizontal: Spacing.three },
  logo: {
    width: 60,
    height: 60,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: { textAlign: 'center', fontSize: 22 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    marginTop: Spacing.two,
  },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 20 },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  rowLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  rowIcon: { width: 36, height: 36, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  section: { marginTop: Spacing.two, gap: Spacing.two },
  sectionTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.two },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
