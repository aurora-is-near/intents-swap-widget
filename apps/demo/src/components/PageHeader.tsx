import { useState } from 'react';
import { Input } from '@aurora-is-near/intents-swap-widget';
import type { PropsWithChildren } from 'react';
import type { HexColor } from '@aurora-is-near/intents-swap-widget';

import { WalletConnectButton } from './WalletConnectButton';

const defaultAccentColor: HexColor = '#D5B7FF';
const defaultBackgroundColor: HexColor = '#636D9B';

const getThemeColor = (
  color: string | undefined,
  defaultColor: HexColor,
): HexColor => {
  if (!color) {
    return defaultColor;
  }

  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color)
    ? (color as unknown as HexColor)
    : defaultColor;
};

export const PageHeader = ({
  children,
  onSetColors,
}: PropsWithChildren<{
  onSetColors?: (colors: {
    accentColor: HexColor;
    backgroundColor: HexColor;
  }) => void;
}>) => {
  const [accentColor, setAccentColor] = useState<string | undefined>(
    defaultAccentColor,
  );

  const [backgroundColor, setBackgroundColor] = useState<string | undefined>(
    defaultBackgroundColor,
  );

  const setThemeColors = () => {
    onSetColors?.({
      accentColor: getThemeColor(accentColor, defaultAccentColor),
      backgroundColor: getThemeColor(backgroundColor, defaultBackgroundColor),
    });
  };

  return (
    <header className="z-1 fixed top-0 left-0 w-full flex justify-between items-center gap-sw-lg py-sw-xl px-sw-2xl bg-sw-gray-950">
      {children ?? <span />}
      <div className="flex items-center gap-sw-lg">
        <Input
          className="w-[108px]"
          placeholder="Accent color"
          defaultValue={accentColor}
          onChange={(e) => setAccentColor(e.target.value)}
          onBlur={setThemeColors}
        />
        <Input
          className="w-[108px]"
          placeholder="Gray tone"
          defaultValue={backgroundColor}
          onChange={(e) => setBackgroundColor(e.target.value)}
          onBlur={setThemeColors}
        />
        <WalletConnectButton />
      </div>
    </header>
  );
};
