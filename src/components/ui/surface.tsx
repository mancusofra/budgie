import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';

/** Liquid Glass disponibile (iOS 26+). Calcolato una volta: non cambia a runtime. */
export const hasGlass = isLiquidGlassAvailable();

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Colore d'accento: tinta del vetro su iOS, sfondo tenue altrove. */
  tint?: string;
  /** Reagisce al tocco (solo vetro). */
  interactive?: boolean;
  /** 'clear' = vetro più trasparente, per elementi sopra contenuti colorati. */
  variant?: 'regular' | 'clear';
  pointerEvents?: ViewStyle['pointerEvents'];
};

/**
 * Superficie di base della UI: Liquid Glass su iOS 26, altrimenti un
 * riempimento tenue (neutro o leggermente tinto).
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
