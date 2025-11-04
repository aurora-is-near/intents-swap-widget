export type WidgetTheme = {
  colorScheme: 'light' | 'dark';
  primaryColor: `#${string}`;
  surfaceColor?: `#${string}`;
};

export type ColorPalette = Record<
  50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 | 975,
  string
>;
