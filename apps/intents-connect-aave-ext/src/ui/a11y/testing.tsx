import { cleanup, render } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactElement } from 'react';

/**
 * Renders `ui` the way the modal runs: in an open shadow root, on a host
 * marked as ours, appended to `<body>`.
 */
export const renderInShadow = (ui: ReactElement) => {
  const host = document.createElement('div');

  host.setAttribute('data-aurora-intents', '');
  document.body.append(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');

  shadow.append(container);

  return { ...render(ui, { container }), host, shadow };
};

/** Unmounts everything and resets what the primitives touch. */
export const resetDom = () => {
  cleanup();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('style');
};

/**
 * axe-core's violations under `root`, shadow trees included. Contrast needs
 * layout (jsdom has none), and landmarks are the page's business.
 */
export const axeViolations = async (root: Element) => {
  const results = await axe.run(root, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });

  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
};
