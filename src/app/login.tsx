import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/app-context';
import type { Role } from '@/types';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signUp, login, loginAsAdmin } = useApp();

  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const res = mode === 'signup' ? signUp({ name, email, role }) : login(email);
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.');
      return;
    }
    router.back();
  };

  const asAdmin = () => {
    loginAsAdmin();
    router.back();
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={[styles.logo, { backgroundColor: theme.tint }]}>
        <Ionicons name="construct" size={30} color={theme.tintText} />
      </View>
      <ThemedText type="subtitle" style={styles.title}>
        {mode === 'signup' ? 'Create your account' : 'Welcome back'}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
        You can browse garages without an account. Sign in to write reviews or manage a garage.
      </ThemedText>

      {mode === 'signup' && (
        <>
          <ThemedText type="smallBold" style={styles.label}>
            I am a…
          </ThemedText>
          <View style={styles.roleRow}>
            <RoleCard
              icon="person"
              title="Driver"
              desc="Find & review garages"
              selected={role === 'user'}
              onPress={() => setRole('user')}
              theme={theme}
            />
            <RoleCard
              icon="briefcase"
              title="Garage owner"
              desc="Claim & verify my garage"
              selected={role === 'owner'}
              onPress={() => setRole('owner')}
              theme={theme}
            />
          </View>

          <ThemedText type="smallBold" style={styles.label}>
            Full name
          </ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Salim Al Balushi"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle(theme)}
          />
        </>
      )}

      <ThemedText type="smallBold" style={styles.label}>
        Email
      </ThemedText>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        style={inputStyle(theme)}
      />

      {error && (
        <ThemedText type="small" style={{ color: theme.danger, marginTop: Spacing.two }}>
          {error}
        </ThemedText>
      )}

      <View style={{ marginTop: Spacing.four, gap: Spacing.two }}>
        <Button
          title={mode === 'signup' ? 'Create account' : 'Sign in'}
          icon="arrow-forward"
          onPress={submit}
        />
        <Pressable
          onPress={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup');
            setError(null);
          }}
          style={styles.switchMode}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
            <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </ThemedText>
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.divider, { borderColor: theme.border }]} />
      <Button title="Continue as Admin (demo)" variant="outline" icon="shield-checkmark" onPress={asAdmin} />
      <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 12 }}>
        Admin verifies garages from owner applications.
      </ThemedText>
    </ScrollView>
  );
}

function RoleCard({
  icon,
  title,
  desc,
  selected,
  onPress,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.roleCard,
        {
          backgroundColor: selected ? theme.tint + '18' : theme.card,
          borderColor: selected ? theme.tint : theme.border,
        },
      ]}>
      <Ionicons name={icon} size={22} color={selected ? theme.tint : theme.textSecondary} />
      <ThemedText type="smallBold" style={{ color: selected ? theme.tint : theme.text }}>
        {title}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center' }}>
        {desc}
      </ThemedText>
    </Pressable>
  );
}

function inputStyle(theme: ReturnType<typeof useTheme>) {
  return [
    styles.input,
    { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
  ] as any;
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
  title: { textAlign: 'center', fontSize: 24, marginTop: Spacing.two },
  label: { marginTop: Spacing.three, fontSize: 14 },
  roleRow: { flexDirection: 'row', gap: Spacing.two },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 15,
    outlineStyle: 'none',
  } as any,
  switchMode: { alignItems: 'center', paddingVertical: Spacing.two },
  divider: { borderTopWidth: 1, marginVertical: Spacing.four },
});
