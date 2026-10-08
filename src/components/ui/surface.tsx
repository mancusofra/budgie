import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';

/** Liquid Glass available (iOS 26+). Computed once: it doesn't change at runtime. */
export const hasGlass = isLiquidGlassAvailable();

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Accent color: glass tint on iOS, light background elsewhere. */
  tint?: string;
  /** Reacts to touch (glass only). */
  interactive?: boolean;
  /** 'clear' = more transparent glass, for elements over colorful content. */
  variant?: 'regular' | 'clear';
  pointerEvents?: ViewStyle['pointerEvents'];
};

/**
 * Base UI surface: Liquid Glass on iOS 26, otherwise a
 * light fill (neutral or slightly tinted).
 */
export function Surface({ children, style, tint, interactive, variant = 'regular' }: Props) {
  const theme = useTheme();

  if (hasGlass) {
    return (
      <GlassView
        glassEffectStyle={variant}
        tintColor={tint ? withAlpha(tint, 0.35) : undefined}
        isInteractive={interactive}
        style={[{ overflow: 'hidden' }, style]}>
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[{ backgroundColor: tint ? withAlpha(tint, 0.14) : theme.surface }, style]}>
      {children}
    </View>
  );
}
