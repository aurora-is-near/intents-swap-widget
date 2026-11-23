import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider, useTheme } from '../src';
import { Gallery } from '../src/gallery';

function Playground() {
  return <Gallery theme={useTheme()} />;
}

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <ThemeProvider>
        <Playground />
      </ThemeProvider>
    </StrictMode>,
  );
}
