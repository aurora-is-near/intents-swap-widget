import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

type Screen =
  | { name: 'welcome' }
  | { name: 'createPasskey' }
  | { name: 'passkeyCreated'; accountId: string }
  | { name: 'home' };

type Navigation = {
  screen: Screen;
  push: (screen: Screen) => void;
  /** Replaces the whole stack, e.g. after onboarding. */
  reset: (screen: Screen) => void;
  back: () => void;
};

const NavigationContext = createContext<Navigation | null>(null);

export const NavigationProvider = ({
  initial,
  children,
}: PropsWithChildren<{ initial: Screen }>) => {
  const [stack, setStack] = useState<Screen[]>([initial]);

  const value = useMemo<Navigation>(
    () => ({
      screen: stack[stack.length - 1] ?? initial,
      push: (screen) => setStack((current) => [...current, screen]),
      reset: (screen) => setStack([screen]),
      back: () =>
        setStack((current) =>
          current.length > 1 ? current.slice(0, -1) : current,
        ),
    }),
    [stack, initial],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const navigation = useContext(NavigationContext);

  if (!navigation) {
    throw new Error('useNavigation must be used inside NavigationProvider');
  }

  return navigation;
};
