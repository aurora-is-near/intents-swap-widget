import './storybook.css';

import { useEffect } from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { ThemeProvider, useTheme } from '../src';
import type { ThemePreference } from '../src';

/** Applies the toolbar's theme through the kit's own provider. */
function ThemeFromToolbar({
  preference,
  children,
}: {
  preference: ThemePreference;
  children: ReactNode;
}) {
  const { setPreference } = useTheme();

  useEffect(() => {
    setPreference(preference);
  }, [preference, setPreference]);

  return children;
}

const withTheme: Decorator = (Story, context) => (
  <ThemeProvider storageKey="ui-kit-storybook-theme">
    <ThemeFromToolbar
      preference={(context.globals.theme as ThemePreference) ?? 'light'}>
      <div className="bg-sf p-6 font-sans text-ink">
        <Story />
      </div>
    </ThemeFromToolbar>
  </ThemeProvider>
);

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Light or dark theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'system', title: 'System' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    options: {
      storySort: {
        order: [
          'Design system',
          ['Introduction', 'Foundations'],
          'Components',
          'Borrow',
        ],
      },
    },
  },
  tags: ['autodocs'],
};

export default preview;
