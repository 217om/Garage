import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { VerifiedBadge } from '@/components/verified-badge';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { initials, thumbColor } from '@/lib/util';
import { useApp } from '@/store/app-context';

export default function ApplyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ garageId?: string }>();
  const { garages, submitApplication, user } = useApp();

  const [garageId, setGarageId] = useState<string | null>(params.garageId ?? null);
  const [query, setQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return garages
      .filter((g) => (q ? g.name.toLowerCase().includes(q) || g.area.toLowerCase().includes(q) : true))
      .sort((a, b) => Number(a.verified) - Number(b.verified));
  }, [garages, query]);

  const selected = garageId ? garages.find((g) => g.id === garageId) : undefined;

  const submit = () => {
    setError(null);
    if (!garageId) {
      setError('Please select the garage you own.');
      return;
    }
    const res = submitApplication(garageId, phone, note);
    if (!res.ok) {
      setError(res.error ?? 'Could not submit application.');
      return;
    }
    setDone(true);
  };

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText>Please sign in first.</ThemedText>
      </View>
    );
  }

  if (done) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, padding: Spacing.four }]}>
        <Ionicons name="checkmark-circle" size={56} color={theme.success} />
        <ThemedText type="subtitle" style={{ textAlign: 'center', marginTop: Spacing.two }}>
          Application submitted
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.two }}>
          Our team will review your request to verify {selected?.name}. You&apos;ll see the status
          in your Account tab.
        </ThemedText>
        <Button title="Done" icon="checkmark" onPress={() => router.back()} style={{ marginTop: Spacing.four }} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        Owner verification
      </ThemedText>
      <ThemedText type="subtitle" style={styles.title}>
        Claim your garage
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        Tell us which garage you own. Once approved by our team it will show a verified badge.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.label}>
        Which garage do you own?
      </ThemedText>

      {selected ? (
        <View style={[styles.selectedRow, { backgroundColor: theme.card, borderColor: theme.tint }]}>
          <View style={[styles.thumb, { backgroundColor: thumbColor(selected.id) }]}>
            <ThemedText style={styles.thumbText}>{initials(selected.name)}</ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold">{selected.name}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {selected.area}
            </ThemedText>
          </View>
          <VerifiedBadge verified={selected.verified} />
          <Pressable onPress={() => setGarageId(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search your garage by name or area"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
          <View style={{ gap: Spacing.one }}>
            {results.slice(0, 6).map((g) => (
              <Pressable
                key={g.id}
                onPress={() => setGarageId(g.id)}
                style={[styles.optionRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.thumbSm, { backgroundColor: thumbColor(g.id) }]}>
                  <ThemedText style={styles.thumbTextSm}>{initials(g.name)}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ fontWeight: '600' }}>
                    {g.name}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {g.area}
                  </ThemedText>
                </View>
                {g.verified && <Ionicons name="checkmark-circle" size={16} color={theme.success} />}
              </Pressable>
            ))}
          </View>
        </>
      )}

      <ThemedText type="smallBold" style={styles.label}>
        Contact phone
      </ThemedText>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="+968 …"
        placeholderTextColor={theme.textSecondary}
        keyboardType="phone-pad"
        style={inputStyle(theme)}
      />

      <ThemedText type="smallBold" style={styles.label}>
        Anything to help us verify you? (optional)
      </ThemedText>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="e.g. commercial registration number, your role at the garage"
        placeholderTextColor={theme.textSecondary}
        multiline
        style={[inputStyle(theme), styles.textArea]}
      />

      {error && (
        <ThemedText type="small" style={{ color: theme.danger, marginTop: Spacing.two }}>
          {error}
        </ThemedText>
      )}

      <Button
        title="Submit application"
        icon="send"
        onPress={submit}
        style={{ marginTop: Spacing.four }}
      />
    </ScrollView>
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
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24 },
  label: { marginTop: Spacing.three, fontSize: 14 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  searchInput: { flex: 1, paddingVertical: Spacing.three - 2, fontSize: 15, outlineStyle: 'none' } as any,
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
  thumb: { width: 44, height: 44, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  thumbText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  thumbSm: { width: 34, height: 34, borderRadius: Spacing.one + 2, alignItems: 'center', justifyContent: 'center' },
  thumbTextSm: { color: '#fff', fontWeight: '700', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 15,
    outlineStyle: 'none',
  } as any,
  textArea: { minHeight: 90, textAlignVertical: 'top' },
});
