import type { WalletSelectorTheme } from '@aurora-is-near/intents-connect-wallet/connect';

/**
 * The package's connect modal in the kit's look. The kit's tokens are CSS
 * custom properties that switch with the theme (`tokens.css`), so the modal
 * follows light and dark without re-rendering. Sizes follow the kit's
 * dialog (radius 28, the dialog shadow) and amount box (radius 14, 1.5px
 * `bd2` border on `sf3`).
 */
export const WALLET_MODAL_THEME: Partial<WalletSelectorTheme> = {
  backdrop: 'rgba(17, 22, 19, 0.5)',
  panelBackground: 'var(--sf)',
  panelRadius: '28px',
  panelShadow: '0 30px 80px rgba(17, 22, 19, 0.35)',
  text: 'var(--ink)',
  mutedText: 'var(--mut2)',
  closeIcon: 'var(--ink)',
  optionBackground: 'var(--sf3)',
  optionHoverBackground: 'var(--hov)',
  optionBorder: '1.5px solid var(--bd2)',
  optionRadius: '14px',
  iconBackground: 'var(--sf2)',
  fontFamily: 'inherit',
  titleAlign: 'left',
};
