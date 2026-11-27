import { DEFAULT_WALLET_SELECTOR_THEME } from '@/connect/theme';
import type { WalletIconSpec } from '@/connect/types';

const CONTAINER_SIZE = 28;

export type WalletIconProps = WalletIconSpec & {
  /** Used when the spec names no `backgroundColor`; the theme's `iconBackground`. */
  fallbackBackground?: string;
};

export const WalletIcon = ({
  Icon,
  backgroundColor,
  fallbackBackground = DEFAULT_WALLET_SELECTOR_THEME.iconBackground,
}: WalletIconProps) => {
  return (
    <div
      style={{
        width: CONTAINER_SIZE,
        height: CONTAINER_SIZE,
        borderRadius: 6,
        backgroundColor: backgroundColor ?? fallbackBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon />
    </div>
  );
};
