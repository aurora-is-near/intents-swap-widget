/**
 * The connect modal's look. Every value is a CSS value, so a host can pass
 * its own custom properties (`var(--surface)`) and the modal follows the
 * host's light/dark switch without re-rendering.
 */
export type WalletSelectorTheme = {
  /** The page overlay behind the panel. */
  backdrop: string;
  panelBackground: string;
  panelRadius: string;
  panelShadow: string;
  panelBorder: string;
  /** The title and the option titles. */
  text: string;
  /** The option descriptions. */
  mutedText: string;
  closeIcon: string;
  optionBackground: string;
  optionHoverBackground: string;
  optionBorder: string;
  optionRadius: string;
  /** Behind a wallet icon whose preset names no background of its own. */
  iconBackground: string;
  fontFamily: string;
  titleAlign: 'left' | 'center';
};

/** The widget's dark look, which the modal keeps when no theme is passed. */
export const DEFAULT_WALLET_SELECTOR_THEME: WalletSelectorTheme = {
  backdrop: 'rgba(0, 0, 0, 0.5)',
  panelBackground: '#202020',
  panelRadius: '16px',
  panelShadow: 'none',
  panelBorder: 'none',
  text: '#F3F3F5',
  mutedText: '#B2B5C1',
  closeIcon: '#979BAA',
  optionBackground: '#252525',
  optionHoverBackground: '#2F2F2F',
  optionBorder: 'none',
  optionRadius: '12px',
  iconBackground: '#363636',
  fontFamily: 'inherit',
  titleAlign: 'center',
};

/** The default theme with the host's overrides on top. */
export const resolveTheme = (
  theme: Partial<WalletSelectorTheme> = {},
): WalletSelectorTheme => ({ ...DEFAULT_WALLET_SELECTOR_THEME, ...theme });
