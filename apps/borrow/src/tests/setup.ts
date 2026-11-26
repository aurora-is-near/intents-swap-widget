// Registers the jest-dom matchers (toHaveAttribute, toBeInTheDocument, …).
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no scrolling; the router's scroll restoration calls this on
// every navigation.
Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  writable: true,
  value: () => {},
});

/**
 * jsdom has no PointerEvent. Base UI's Checkbox dispatches one as the click a
 * press or Space makes, so give jsdom a stand-in built on MouseEvent, as the
 * kit's own test setup does.
 */
if (!('PointerEvent' in window)) {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;

    readonly pointerType: string;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? '';
    }
  }

  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: PointerEventStub,
  });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});
