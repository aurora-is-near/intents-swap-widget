export type HexColor = `#${string}`;

export type ColorScheme = 'light' | 'dark';

export type ThemeBorderRadius = 'none' | 'sm' | 'md' | 'lg';

export type ThemeStylePreset = 'clean' | 'bold';

export type Theme = {
  colorScheme?: ColorScheme;
  stylePreset?: ThemeStylePreset;
  primaryColor?: HexColor;
  backgroundColor?: HexColor;
  containerColor?: HexColor;
  successColor?: HexColor;
  warningColor?: HexColor;
  errorColor?: HexColor;
  borderRadius?: ThemeBorderRadius;
  showContainer?: boolean;
};

export type ColorPalette = Record<
  50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950,
  string
>;
