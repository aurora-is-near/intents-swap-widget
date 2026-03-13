import { jest } from '@jest/globals';

jest.mock('qr-code-styling', () => {
  class MockQRCodeStyling {
    private _data = '';

    private _img: HTMLImageElement | null = null;

    constructor(options?: unknown) {
      void options;
    }

    append(container: HTMLElement | null) {
      if (!container) {
        return;
      }

      container.replaceChildren();
      const img = document.createElement('img');

      img.alt = 'qr-code';
      img.setAttribute('data-value', this._data);
      container.appendChild(img);
      this._img = img;
    }

    update(options?: { data?: string }) {
      this._data = options?.data ?? '';

      if (this._img) {
        this._img.setAttribute('data-value', this._data);
      }
    }
  }

  return {
    __esModule: true,
    default: MockQRCodeStyling,
  };
});
