import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: number;
  /** When provided the stars become tappable (whole-star input). */
  onChange?: (value: number) => void;
  size?: number;
  color?: string;
};

export function StarRating({ value, onChange, size = 16, color }: Props) {
  const theme = useTheme();
  const starColor = color ?? theme.star;
  const interactive = !!onChange;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        let name: keyof typeof Ionicons.glyphMap = 'star-outline';
        if (value >= i) name = 'star';
        else if (value >= i - 0.5) name = 'star-half';

        const icon = <Ionicons name={name} size={size} color={starColor} />;
        if (!interactive) return <View key={i}>{icon}</View>;
        return (
          <Pressable
            key={i}
            onPress={() => onChange?.(i)}
            hitSlop={6}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${i} star${i > 1 ? 's' : ''}`}>
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
