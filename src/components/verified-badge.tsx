import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  verified: boolean;
  size?: 'sm' | 'md';
};

export function VerifiedBadge({ verified, size = 'sm' }: Props) {
  const theme = useTheme();
  const iconSize = size === 'md' ? 16 : 13;

  if (verified) {
    return (
      <View style={[styles.pill, { backgroundColor: theme.success + '22' }]}>
        <Ionicons name="checkmark-circle" size={iconSize} color={theme.success} />
        <ThemedText type="small" style={[styles.label, { color: theme.success }]}>
          Verified
        </ThemedText>
      </View>
    );
  }
  return (
    <View style={[styles.pill, { backgroundColor: theme.muted }]}>
      <Ionicons name="help-circle-outline" size={iconSize} color={theme.textSecondary} />
      <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
        Unverified
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
