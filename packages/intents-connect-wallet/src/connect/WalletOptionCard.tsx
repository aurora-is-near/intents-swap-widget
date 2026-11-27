import { useState } from 'react';

import { resolveTheme, type WalletSelectorTheme } from '@/connect/theme';
import { WalletIcon } from '@/connect/WalletIcon';
import type { WalletIconSpec } from '@/connect/types';

type WalletOptionCardProps = {
  onClick: () => void;
  title: string;
  description: string;
  icons: WalletIconSpec[];
  /** Overrides of the default (dark) look. */
  theme?: Partial<WalletSelectorTheme>;
};

export const WalletOptionCard = ({
  onClick,
  title,
  description,
  icons,
  theme: overrides,
}: WalletOptionCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const theme = resolveTheme(overrides);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        border: theme.optionBorder,
        borderRadius: theme.optionRadius,
        color: theme.text,
        backgroundColor: isHovered
          ? theme.optionHoverBackground
          : theme.optionBackground,
        fontFamily: theme.fontFamily,
        cursor: 'pointer',
        textAlign: 'left',
      }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: theme.mutedText,
            marginTop: 8,
            maxWidth: 170,
          }}>
          {description}
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          flexShrink: 0,
          marginLeft: 16,
        }}>
        {icons.map((iconProps, i) => (
          <WalletIcon
            key={i}
            {...iconProps}
            fallbackBackground={theme.iconBackground}
          />
        ))}
      </div>
    </button>
  );
};
