import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import type { Context, ReactNode } from 'react';

import { DEFAULT_THEME_STORAGE_KEY } from './themeInitScript';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export type ThemeContextValue = {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

export type ThemeProviderProps = {
  children?: ReactNode;
  /** Used when nothing valid is stored. */
  defaultPreference?: ThemePreference;
  /** The `localStorage` key an explicit light or dark choice is saved under. */
  storageKey?: string;
};

const DARK_QUERY = '(prefers-color-scheme: dark)';
const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

/**
 * One context per page, kept on `globalThis` under a registered symbol. A
 * second instance of this module (the kit's `dist` beside its source, or a
 * `dist` rebuilt under a running dev server) then shares the provider's
 * context instead of creating an empty one, which would make `useTheme` throw although a `ThemeProvider` is mounted.
 */
const THEME_CONTEXT_KEY = Symbol.for('@aurora-is-near/ui-kit/ThemeContext');

type ThemeContextHolder = typeof globalThis & {
  [THEME_CONTEXT_KEY]?: Context<ThemeContextValue | null>;
};

const holder = globalThis as ThemeContextHolder;

holder[THEME_CONTEXT_KEY] ??= createContext<ThemeContextValue | null>(null);

const ThemeContext = holder[THEME_CONTEXT_KEY];

// useLayoutEffect writes data-theme before paint; it warns during SSR, so
// fall back to useEffect where there is no window.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const isPreference = (value: unknown): value is ThemePreference =>
  PREFERENCES.includes(value as ThemePreference);

const getMediaQuery = (): MediaQueryList | null =>
  typeof window === 'undefined' || typeof window.matchMedia !== 'function'
    ? null
    : window.matchMedia(DARK_QUERY);

const subscribeToSystemTheme = (onChange: () => void) => {
  const mediaQuery = getMediaQuery();

  mediaQuery?.addEventListener('change', onChange);

  return () => mediaQuery?.removeEventListener('change', onChange);
};

const getSystemIsDark = () => getMediaQuery()?.matches ?? false;
const getServerSystemIsDark = () => false;

const readStoredPreference = (key: string): ThemePreference | null => {
  try {
    const value = window.localStorage.getItem(key);

    return isPreference(value) ? value : null;
  } catch {
    return null;
  }
};

const writeStoredPreference = (key: string, preference: ThemePreference) => {
  try {
    if (preference === 'system') {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, preference);
    }
  } catch {
    // Storage can be unavailable (private mode, blocked cookies, quota):
    // the choice then lasts only for this page view.
  }
};

/**
 * Resolves the light or dark theme from the user's choice or the system
 * setting, and writes it as `data-theme` on `<html>`, which the kit's tokens
 * read. An explicit choice is remembered in `localStorage`.
 */
export function ThemeProvider({
  children,
  defaultPreference = 'system',
  storageKey = DEFAULT_THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => readStoredPreference(storageKey) ?? defaultPreference,
  );

  const systemIsDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemIsDark,
    getServerSystemIsDark,
  );

  const systemTheme: ResolvedTheme = systemIsDark ? 'dark' : 'light';
  const theme: ResolvedTheme =
    preference === 'system' ? systemTheme : preference;

  useIsomorphicLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      writeStoredPreference(storageKey, next);
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ preference, theme, setPreference }),
    [preference, theme, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** The current theme and a setter. Must be called inside `ThemeProvider`. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside a <ThemeProvider>.');
  }

  return context;
}
