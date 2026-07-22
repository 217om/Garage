import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/app-context';

export default function WriteReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getGarage, addReview, user } = useApp();

  const garage = getGarage(id);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const res = addReview(id, rating, text);
    if (!res.ok) {
      setError(res.error ?? 'Could not submit review.');
      return;
    }
    router.back();
  };

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText>Please sign in to write a review.</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        Reviewing
      </ThemedText>
      <ThemedText type="subtitle" style={styles.name}>
        {garage?.name ?? 'Garage'}
      </ThemedText>

      <ThemedText type="smallBold" style={styles.label}>
        Your rating
      </ThemedText>
      <StarRating value={rating} onChange={setRating} size={36} color={theme.tint} />

      <ThemedText type="smallBold" style={styles.label}>
        Your review
      </ThemedText>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Share your experience — quality of work, honesty, price, waiting time…"
        placeholderTextColor={theme.textSecondary}
        multiline
        style={[
          styles.textArea,
          { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
        ]}
      />

      {error && (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      )}

      <View style={styles.buttons}>
        <Button title="Cancel" variant="outline" onPress={() => router.back()} style={styles.flex1} />
        <Button
          title="Post review"
          icon="send"
          onPress={submit}
          disabled={rating === 0}
          style={styles.flex1}
        />
      </View>
      <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
        Posting as {user.name}
      </ThemedText>
    </ScrollView>
  );
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
  name: { fontSize: 24, marginBottom: Spacing.two },
  label: { marginTop: Spacing.three, fontSize: 14 },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 15,
    textAlignVertical: 'top',
    outlineStyle: 'none',
  } as any,
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  flex1: { flex: 1 },
});
