import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/app-context';
import type { OwnerApplication } from '@/types';

export default function AdminScreen() {
  const theme = useTheme();
  const { user, applications, approveApplication, rejectApplication } = useApp();

  if (user?.role !== 'admin') {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, padding: Spacing.four }]}>
        <Ionicons name="lock-closed-outline" size={40} color={theme.textSecondary} />
        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.two }}>
          This area is only available to administrators. Sign in as Admin from the login screen.
        </ThemedText>
      </View>
    );
  }

  const pending = applications.filter((a) => a.status === 'pending');
  const resolved = applications
    .filter((a) => a.status !== 'pending')
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <ThemedText type="subtitle" style={styles.title}>
        Pending requests
      </ThemedText>

      {pending.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="checkmark-done-circle-outline" size={28} color={theme.success} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            No pending applications. All caught up!
          </ThemedText>
        </View>
      ) : (
        pending.map((a) => (
          <AppCard
            key={a.id}
            app={a}
            theme={theme}
            onApprove={() => approveApplication(a.id)}
            onReject={() => rejectApplication(a.id)}
          />
        ))
      )}

      {resolved.length > 0 && (
        <>
          <ThemedText type="subtitle" style={[styles.title, { marginTop: Spacing.four }]}>
            History
          </ThemedText>
          {resolved.map((a) => (
            <View
              key={a.id}
              style={[styles.historyRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">{a.garageName}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {a.applicantName}
                </ThemedText>
              </View>
              <ThemedText
                type="small"
                style={{
                  color: a.status === 'approved' ? theme.success : theme.danger,
                  fontWeight: '700',
                  textTransform: 'capitalize',
                }}>
                {a.status}
              </ThemedText>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function AppCard({
  app,
  theme,
  onApprove,
  onReject,
}: {
  app: OwnerApplication;
  theme: ReturnType<typeof useTheme>;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHead}>
        <Ionicons name="business" size={18} color={theme.tint} />
        <ThemedText type="smallBold" style={{ flex: 1, fontSize: 15 }}>
          {app.garageName}
        </ThemedText>
      </View>
      <Detail icon="person-outline" text={app.applicantName} theme={theme} />
      {!!app.phone && <Detail icon="call-outline" text={app.phone} theme={theme} />}
      {!!app.note && <Detail icon="document-text-outline" text={app.note} theme={theme} />}
      <Detail
        icon="time-outline"
        text={new Date(app.createdAt).toLocaleString()}
        theme={theme}
      />
      <View style={styles.actions}>
        <Button title="Reject" variant="outline" icon="close" onPress={onReject} style={styles.flex1} />
        <Button title="Approve & verify" icon="checkmark" onPress={onApprove} style={styles.flex1} />
      </View>
    </View>
  );
}

function Detail({
  icon,
  text,
  theme,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  text: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={15} color={theme.textSecondary} />
      <ThemedText type="small" style={{ color: theme.text, flex: 1 }}>
        {text}
      </ThemedText>
    </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20 },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  detail: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  flex1: { flex: 1 },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
});
