export type HexColor = `#${string}`;

export type ColorScheme = 'light' | 'dark';

export type Theme = {
  colorScheme?: ColorScheme;
  backgroundColor?: HexColor;
  primaryColor?: HexColor;
  surfaceColor?: HexColor;
};

export type ColorPalette = Record<
  50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950,
  string
>;
