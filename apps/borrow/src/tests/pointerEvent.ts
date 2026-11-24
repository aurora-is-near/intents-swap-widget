/**
 * jsdom has no PointerEvent. Base UI's Checkbox dispatches one as the click a
 * press or Space makes, so tests that toggle one import this for a stand-in
 * built on MouseEvent, as the kit's own test setup does.
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

export {};
