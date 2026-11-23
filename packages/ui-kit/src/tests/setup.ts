// Registers the jest-dom matchers (toHaveAttribute, toHaveFocus, …). The
// shared eslint config's jest-dom plugin auto-fixes assertions into these
// matchers, so they have to be available. Harmless in node-environment
// tests: the matchers only touch the DOM when called.
import '@testing-library/jest-dom/vitest';

/**
 * jsdom has no PointerEvent. Base UI's buttons (Switch, Checkbox) dispatch
 * one as the click that Space and Enter make, so give jsdom a stand-in built
 * on MouseEvent. Only in jsdom tests: node-environment tests have no window.
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
