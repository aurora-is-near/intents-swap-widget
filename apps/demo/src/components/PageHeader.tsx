import { clsx } from 'clsx';
import { useState } from 'react';
import { Input } from '@aurora-is-near/intents-swap-widget';
import { useToggleTheme } from '@aurora-is-near/intents-swap-widget/hooks';
import {
  DarkMode,
  NightSightAuto,
  Sunny,
} from '@material-symbols-svg/react-rounded/w700';
import type { PropsWithChildren } from 'react';
import type { HexColor } from '@aurora-is-near/intents-swap-widget';
import type { MaterialSymbolsComponent } from '@material-symbols-svg/react';

import { WalletConnectButton } from './WalletConnectButton';

type TabProps<T> = {
  id: T;
  label: string;
  icon: MaterialSymbolsComponent;
  isActive: boolean;
  onClick: (id: T) => void;
};

const Tab = <T extends string>({
  id,
  label,
  isActive,
  icon: Icon,
  onClick,
}: TabProps<T>) => (
  <button
    key={id}
    onClick={() => onClick(id)}
    type="button"
    className={clsx(
      'flex gap-sw-md items-center cursor-pointer rounded-sw-md p-sw-lg sm:px-sw-xl group transition-colors',
      {
        'bg-sw-gray-200': isActive,
        'bg-sw-gray-900 text-sw-gray-400 hover:text-sw-gray-200': !isActive,
      },
    )}>
    <Icon
      className={clsx('w-[16px] h-[16px]', {
        'text-sw-gray-900': isActive,
        'text-sw-gray-400 group-hover:text-sw-gray-200': !isActive,
      })}
      strokeWidth={2.5}
    />
    <span
      className={clsx('text-sw-label-md hidden sm:inline-block!', {
        'text-sw-gray-900': isActive,
        'text-sw-gray-400 group-hover:text-sw-gray-200': !isActive,
      })}>
      {label}
    </span>
  </button>
);

type ThemeMode = 'light' | 'dark' | 'auto';

const themeLabels: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  auto: 'Auto',
};

const themeIcons: Record<ThemeMode, MaterialSymbolsComponent> = {
  light: Sunny,
  dark: DarkMode,
  auto: NightSightAuto,
};

type ThemeToggleProps = {
  onClick?: (colorPalette: 'light' | 'dark') => void;
};

const ThemeToggle = ({ onClick }: ThemeToggleProps) => {
  const { theme = 'dark', toggleTheme } = useToggleTheme({
    defaultTheme: 'dark',
    onChange: onClick,
  });

  if (!theme) {
    return (
      <Tab
        id="theme"
        isActive={false}
        label={themeLabels.dark}
        icon={themeIcons.dark}
        onClick={toggleTheme}
      />
    );
  }

  return (
    <Tab
      id="theme"
      isActive={false}
      label={themeLabels[theme]}
      icon={themeIcons[theme]}
      onClick={toggleTheme}
    />
  );
};

type Props<T> = {
  activeTab: T;
  tabs: ReadonlyArray<Omit<TabProps<T>, 'isActive' | 'onClick'>>;
  onClick: (id: T) => void;
};

const defaultPrimaryColor: HexColor = '#D5B7FF';
const defaultSurfaceColor: HexColor = '#636D9B';

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

const Header = ({
  children,
  onToggleTheme,
  onSetColors,
}: PropsWithChildren<{
  onToggleTheme?: ThemeToggleProps['onClick'];
  onSetColors?: (colors: {
    primaryColor: HexColor;
    surfaceColor: HexColor;
  }) => void;
}>) => {
  const [primaryColor, setPrimaryColor] = useState<string | undefined>(
    defaultPrimaryColor,
  );

  const [surfaceColor, setSurfaceColor] = useState<string | undefined>(
    defaultSurfaceColor,
  );

  const setThemeColors = () => {
    onSetColors?.({
      primaryColor: getThemeColor(primaryColor, defaultPrimaryColor),
      surfaceColor: getThemeColor(surfaceColor, defaultSurfaceColor),
    });
  };

  return (
    <header className="z-1 fixed top-0 left-0 w-full flex justify-between items-center gap-sw-lg py-sw-xl px-sw-2xl bg-sw-gray-950">
      {children ?? <span />}
      <div className="flex items-center gap-sw-lg">
        <Input
          className="w-[108px]"
          placeholder="Accent color"
          defaultValue={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          onBlur={setThemeColors}
        />
        <Input
          className="w-[108px]"
          placeholder="Gray tone"
          defaultValue={surfaceColor}
          onChange={(e) => setSurfaceColor(e.target.value)}
          onBlur={setThemeColors}
        />
        <ThemeToggle onClick={onToggleTheme} />
        <WalletConnectButton />
      </div>
    </header>
  );
};

const Nav = <T extends string>({ tabs, activeTab, onClick }: Props<T>) => (
  <nav className="flex gap-sw-md sm:gap-sw-lg items-center">
    {tabs.map((tab) => (
      <Tab
        {...tab}
        key={tab.id}
        isActive={activeTab === tab.id}
        onClick={onClick}
      />
    ))}
  </nav>
);

export const PageHeader = Object.assign(Header, {
  Nav,
});
