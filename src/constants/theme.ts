/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#F5F6F8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    tint: '#0A6C4E',
    tintText: '#FFFFFF',
    border: '#E2E4E8',
    card: '#FFFFFF',
    success: '#0F9D58',
    danger: '#D93025',
    warning: '#F4B400',
    star: '#F5A623',
    google: '#4285F4',
    muted: '#EDEFF2',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0B0D0E',
    backgroundElement: '#17191A',
    backgroundSelected: '#2E3135',
    textSecondary: '#9BA1A6',
    tint: '#2ECC9B',
    tintText: '#04231A',
    border: '#26292B',
    card: '#17191A',
    success: '#34C77B',
    danger: '#F16B5F',
    warning: '#F4C650',
    star: '#F5B841',
    google: '#5A9CFF',
    muted: '#1D2022',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
