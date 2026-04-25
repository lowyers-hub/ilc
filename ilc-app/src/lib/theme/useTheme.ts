import { useColorScheme } from 'react-native';

import { tokens } from './tokens';

export function useTheme() {
  const scheme = useColorScheme() ?? 'light';
  const palette = scheme === 'dark' ? tokens.colors.dark : tokens.colors.light;
  return { scheme, palette, tokens };
}

