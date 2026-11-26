// Registers the jest-dom matchers (toHaveAttribute, toHaveFocus, …). The
// shared eslint config's jest-dom plugin auto-fixes assertions into these
// matchers, so they have to be available.
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmounts what each test rendered (no vitest globals, so RTL can't).
afterEach(cleanup);

/**
 * jsdom has no PointerEvent. Base UI's buttons (such as Checkbox) dispatch
 * one as the click that Space and Enter make, so give jsdom a stand-in built
 * on MouseEvent. Not in the node-environment tests, which have no window.
 */
if (typeof window !== 'undefined' && !('PointerEvent' in window)) {
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
