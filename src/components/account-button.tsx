import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { initials } from '@/lib/util';
import { useApp } from '@/store/app-context';

/** Header button that opens the Account screen. Shows the user's initials when signed in. */
export function AccountButton() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useApp();

  return (
    <Pressable
      onPress={() => router.push('/account')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Account"
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      {user ? (
        <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
          <ThemedText style={styles.avatarText}>{initials(user.name)}</ThemedText>
        </View>
      ) : (
        <Ionicons name="person-circle-outline" size={30} color={theme.text} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginRight: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
